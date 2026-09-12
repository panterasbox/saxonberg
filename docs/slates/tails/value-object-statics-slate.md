# Value-object statics — `callable == visible` is broken in 25 places

**Status:** ready to build · **Size:** small–medium (25 classes, mechanical)
**Raised by:** the user, reviewing MR !255, 2026-09-11

> **A public `static` on a `lib/` value class is callable by anyone and
> visible to nobody.**

## The finding

`scripts/project-author-surface.ts` admits exactly two things into the
**consumer** tier:

```ts
const isStaticApi   =  apiClass && member.flags?.isStatic === true;
const isStuffMethod = !apiClass && member.flags?.isStatic !== true;
if (!isStaticApi && !isStuffMethod) continue;   // ← dropped
```

A static on a **non-Api** class satisfies neither branch. So
`Money.of`, `Money.zero`, `Position.of`, `Position.fromData` — and
every factory like them — are droppped from the generated docs. Their
*instance* methods survive (`!apiClass && !isStatic`); only the
constructors vanish, which is precisely what somebody goes looking for.

That is a direct breach of the governing invariant in `CLAUDE.md`:

> **`callable == visible == cared-about`.** An author can call exactly
> what they can see in the generated docs, and nothing else.

**25 classes** under `lib/` export an `of` / `proper` / `fromData`-shaped
static.

## The ruling

⭐ **Construction is an Api concern, and the codebase already says so.**
`CLAUDE.md` forbids `new SomeStuff()` and routes it through
`StuffApi.create`. A value class with public static factories is the same
rule broken one layer down.

The two sanctioned surfaces are, and remain:

1. a **public instance method** on a `Stuff` object;
2. a **public static method** on an `Api` object.

`lib/` value classes and interfaces are right and necessary — *that stuff
has to go somewhere* — but they are **types with instance methods**, not
a third calling surface.

## The shape of the fix

Done once already, as the worked example — `NounPhrase`, in MR !255:

| before | after |
|---|---|
| `NounPhrase.of(stem, register)` | `GrammarApi.phrase(stem, register)` |
| `NounPhrase.proper(name)` | `GrammarApi.properPhrase(name)` |
| `NounPhrase.articleFor(text)` | `GrammarApi.articleFor(text)` |
| `NounPhrase.isRegister(x)` | `GrammarApi.isRegister(x)` |

- The class keeps its **instance** methods and its vocabularies.
- The constructor becomes **public**, for the same reason `new Thing()`
  is public: the Api has to call it, and "authors don't" is a convention,
  not a visibility trick.
- A rule implemented once stays once — the vowel check is a
  **module-private function** in `NounPhrase.ts`, and
  `GrammarApi.articleFor` is its only public surface.

⚠ **No cycle**: `api/grammar.ts` → `lib/description/NounPhrase.ts` only.
Having the value class reach *back* for an Api is what would create one.

## Doing the rest

Each class needs a home Api — `Money` → banking, `Position` →
employment, `Quantity` → quantities. ⭐ Apis are **per-subsystem**, so
every value object has one by construction; a value object with no
obvious Api home is the signal that the subsystem boundary is wrong,
not that the rule needs an exception.

**Gate it census-then-ratchet**: count today's public statics on `lib/`
classes, hold that as a ceiling, drive it to zero. That is the same
shape `lint:object-verbs` used for the 338 Api statics whose first
parameter was a world object.

⚠ **And fix the projection too, or the gate is the only thing watching.**
Whatever remains — a genuinely-internal static — should be `@internal` so
the tiers agree with the code, rather than silently dropped by a rule
that was aimed at framework statics.

## Cross-references

- `CLAUDE.md` § Module Categories · § Export discipline · § Go Through
  the API Layer
- `docs/architecture.md` § The Api ↔ logic-singleton split
- `docs/subsystems/presentation.md` (`NounPhrase`, the worked example)
