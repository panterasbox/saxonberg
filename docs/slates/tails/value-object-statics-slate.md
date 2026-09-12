# `lib/` statics — `callable == visible` is broken in 136 classes

**Status:** ⭐ ready to build, and the user wants it **immediately after
!255 merges** · **Size:** large — 136 classes, 461 statics
**Raised by:** the user, reviewing MR !255, 2026-09-11
**Census:** `pnpm -C packages/server exec tsx scripts/check-lib-statics.ts`

> **A public `static` on a non-`Api` class is callable by anyone and
> visible to nobody.**

---

## The ruling

The two sanctioned calling surfaces are, and remain:

1. a **public instance method** on a `Stuff` object;
2. a **public static method** on an `Api` object.

`lib/` value classes and interfaces are right and necessary — *that stuff
has to go somewhere* — but they are **types with instance methods**, not
a third calling surface.

⭐ **And the codebase already holds this rule one layer up.** `CLAUDE.md`
forbids `new SomeStuff()` and routes it through `StuffApi.create`.
**Construction is an Api concern.** A value class with public static
factories is the same rule broken in `lib/`.

## The mechanism that makes it bite

`scripts/project-author-surface.ts`:

```ts
const isStaticApi   =  apiClass && member.flags?.isStatic === true;
const isStuffMethod = !apiClass && member.flags?.isStatic !== true;
if (!isStaticApi && !isStuffMethod) continue;   // ← dropped
```

A static on a `lib/` class satisfies **neither branch**. Its *instance*
methods survive; only the statics vanish — which is exactly what somebody
goes looking for. Straight breach of **`callable == visible ==
cared-about`**.

---

## ⚠⚠ The census — bigger, and more interesting, than "some factories"

**136 classes · 461 public statics.** Only **8 files** anywhere in `lib/`
carry an `@internal` marker, so almost none of this is even *declared*
internal.

| shape | count | what it is | where it goes |
|---|---|---|---|
| **logic** | **318** | `Freshness.growthRate`, `Contamination.advance`, `CombatNarration.narrate`, `Fade.ratePerGameSec` | ⭐ **a logic singleton** — `platform/idea/api/<X>Logic.ts`, with the Api forwarding |
| construct | 64 | `Light.of`, `Currency.of`, `Quantity.parse`, `Position.fromData` | the owning **Api** (`GrammarApi.phrase` is the worked example) |
| guard | 56 | `is*` / `has*` over closed vocabularies | the owning **Api** |
| registry/cache | 15 | `Construction.registerFabric`, `AccountBalance.putCached`, `Appearance.clearMemo` | ⚠ module-level mutable state — a **logic singleton**, or a real registry |
| lookup | 8 | `all`, `list`, `keys` | the owning **Api** |

⭐⭐ **The headline is that 318 of 461 are LOGIC, not construction.** These
classes are **logic singletons that never got the memo** — `CLAUDE.md`
already describes the home (`platform/idea/api/<X>Logic.ts`, `@internal`,
`FromModule`-gated, HMR-able) and the `XApi` ↔ `XLogic` split is called
**mandatory** there. So this is mostly not a new rule; it is an existing
rule that ~40 classes predate.

### The worst offenders, by static count

| statics | class | call sites |
|---|---|---|
| 18 | `Freshness` (`lib/material/Freshness.ts`) | 55 |
| 16 | `Contamination` (`lib/material/Contaminable.ts`) | 47 |
| 12 | `CombatNarration` (`lib/combat/CombatNarration.ts`) | 29 |
| 11 | `Construction`, `Cure` (`lib/material/`) | — |
| 9 | `CompetenceBand`, `Currency`, `Quantity`, `GroundCharacter` | 49 / 91 / — / — |

⚠ `Currency` alone has **91 call sites**. This is not a weekend.

---

## Waves

**W0 — the ratchet.** `scripts/check-lib-statics.ts` is already in the
tree as a report. Add `lint:lib-statics` with **461 as the ceiling**, so
the count can only fall. ⭐ Census-then-ratchet, the pattern that took
`lint:object-verbs` from 338 to 0.

**W1 — fix the projection, and mark what stays.** A static that is
genuinely library-internal should say `@internal` rather than being
silently dropped by a rule aimed at framework statics. ⚠ Do this
**first**: until the tiers agree with the code, "is this author surface?"
has no honest answer, and every later wave is guessing.

**W2 — construct + guard + lookup (128 statics).** The mechanical half,
and the one with a worked example already merged. Each class's statics
move to its subsystem Api; the class keeps its instance methods and gains
a **public constructor** (the `new Thing()` precedent — the Api calls it,
and "authors don't" is a convention, not a visibility trick).

**W3 — logic (318 statics), by subsystem, one Api at a time.** Biggest
first: material (`Freshness`, `Contamination`, `Cure`, `Construction`),
then combat, banking, magic, advancement. Each becomes an
`platform/idea/api/<X>Logic.ts` with the Api forwarding.

**W4 — registry/cache (15).** Mutable module state is its own smell; some
of these want to be a real registry singleton, not a class with a `Map`.

---

## ⚠ Homes that do not exist yet

Most subsystems have an Api (89 of them). These do **not**, and each is a
decision the build has to make rather than assume:

`advancement` (`CompetenceBand`) · `wiki` (`WikiPage`, `Sections`) ·
`concealment` (`ConcealmentLevels`) · `identification` (`Appearance`) ·
`metabolism` (`BlendLabel`) · `craft` (`BlendIdentity`, `Techniques`)

⭐ **Apis are per-subsystem**, so a value object with no obvious Api home
is the signal that a subsystem boundary is wrong — not that the rule
needs an exception.

---

## The worked example (merged in !255)

| before | after |
|---|---|
| `NounPhrase.of(stem, register)` | `GrammarApi.phrase(stem, register)` |
| `NounPhrase.proper(name)` | `GrammarApi.properPhrase(name)` |
| `NounPhrase.articleFor(text)` | `GrammarApi.articleFor(text)` |
| `NounPhrase.isRegister(x)` | `GrammarApi.isRegister(x)` |

- The class keeps its instance methods and its vocabularies.
- The constructor is **public**; the Api is the sanctioned path.
- A rule implemented once stays once: the vowel check is a
  **module-private function**, and `GrammarApi.articleFor` is its only
  public surface.
- ⚠ **No cycle** — `api/grammar.ts` → `lib/description/NounPhrase.ts`
  only. A value class reaching *back* for an Api is what would make one.

## ⚠ And run `pnpm lint`

Two ESLint errors (`no-restricted-syntax`, free exported functions in
`lib/`) sat in `NounPhrase.ts` for the whole of !255 because
**`lint:family` cannot see ESLint rules**. ⭐ *A rule that is not in the
family you run is a rule you are not running.* This sweep will trip that
rule constantly; run `pnpm lint` per wave.

## Cross-references

- `CLAUDE.md` § Module Categories · § Export discipline · § Go Through
  the API Layer — *"the `XApi` ↔ `XLogic` split is **mandatory**"*
- `docs/architecture.md` § The Api ↔ logic-singleton split
- `docs/lint-family.md` § census-then-ratchet
- `docs/subsystems/presentation.md` — `NounPhrase`, the worked example
