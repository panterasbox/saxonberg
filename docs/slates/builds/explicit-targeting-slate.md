# Explicit targeting — the filter is a policy, not a scope walk

> **Status: UNBUILT** — the argument is settled; the semantics are not.
> **Left:** the 2-of-3 cell (`onFiltered`) and its default · whether the
> scope chain survives at all · one reserved per-invocation override ·
> migrating 183 slots off scope-order filtering
> **Size:** a build — it changes how every object slot in the game binds

**Raised by:** the user, reviewing the `lib/statics` sweep, 2026-09-14.

---

## The complaint

> **User:** *"this is an implicit solution to an explicit targeting
> problem. you're trying to make the command figure out intent but the
> user knows their intent they just need a way to communicate it. and we
> have solutions for this — 'second box' disambiguates between the
> painting and the chest just fine, or we also have prompting… it seems
> like it'd be better just to match 'box' on everything, then apply a
> filter on the result to take out anything that's not actually
> targetable by that verb."*

---

## ⭐⭐ The real defect is an ASYMMETRY, not the loop

Two questions arise at exactly the same moment, when a player's word
matches more than one thing:

| axis | question | today |
|---|---|---|
| **count** | *how many matched?* | `cardinality` / `onExcess` / `onShortage` — **declared, configurable, honest**: `top · prompt · error · take-all · truncate`, degrading to `controller-rejected {ambiguous}` when there is no Interactive to ask |
| **kind** | *how many are the right KIND?* | `requires:` — **silent, hardcoded, unconfigurable**: the scope chain is walked and the first scope holding an admissible match wins |

⭐ The author can say *"two matched — ask which"*. The author cannot say
*"two matched and I discarded one — say so"*. Same problem shape, two
unrelated mechanisms, one of which is a policy and one of which just
happens. **That inconsistency is the defect**; the loop is only its
symptom.

## What `requires:` does today, exactly

`requires:` becomes two artefacts at spec-load
(`CommandLogic.resolveOne`):

1. **`_requirementTerms`** — predicates that ride the *definition*, used
   to filter candidates **before binding**, per scope;
2. a **synthesised validator**, prepended to the slot's chain, whose
   refusal sentence comes from `MixinRefusals`.

② is an ordinary validator. ① is the special one, and its whole purpose
is the fall-through:

```ts
for (const scope of tries) {
  const r = await scopedMany(raw, giver, scope, …);
  if (r.stuff.length > 0 && !firstRaw) firstRaw = r;   // stash
  const kept = r.stuff.filter(admissible);
  if (kept.length > 0) { stuff = kept; break; }        // this scope wins
}
if (stuff.length === 0 && firstRaw) stuff = firstRaw.stuff;  // refuse ABOUT the near-miss
```

The shipped justification is `talk dave` where `$focus` is the room
*"Dave's Bar"*: without ①, the room binds, the validator refuses, and the
barkeep is never reached.

⚠ Note what ① costs: with a `requires:` the cheap `resolveOne` path is
**disabled** — *"the top match may be the inadmissible one"* — so every
constrained slot resolves its scope in full.

## The proposal

One pool, one filter, then a **declared policy on the discard**,
symmetric with the count policy that already exists.

| matched / targetable | today | proposed |
|---|---|---|
| 2 / 2 | `onExcess` decides (top · prompt · error) | unchanged — already right |
| **2 / 1** | the targetable one binds, **silently** | ⭐ **`onFiltered`**: `take · warn · prompt · error` |
| 2 / 0 | first raw binds; validator refuses naming it | `error` carrying the same `MixinRefusals` sentence — same words, explicit path |
| 0 / 0 | `empty-result` | unchanged |

**The 2/1 cell is the whole argument.** It is where the engine guesses
and does not say. `warn` — *"(the painting doesn't open; opening the
chest)"* — is the likely default: it teaches the player that `second box`
exists without blocking them, which is the explicit-communication the
complaint asks for.

⭐ This **subsumes** the fall-through rather than deleting it. `talk dave`
with the room and the barkeep both matching is simply 2/1 → take the
targetable one, optionally announced. No scope ordering, no `firstRaw`
stash, no early break, and the cheap `resolveOne` path comes back for the
2/2 case.

## What must NOT be lost

`requires:` is also what keeps the **affordance menu** honest — `open` is
not offered on a painting, because the refusal is computed before the
verb is advertised, and *"the client cannot filter that out, it is
forbidden from re-deriving semantics"*
([command-spec.md § requires:](../subsystems/command-spec.md)).

That property survives: `requires:` stays the **declaration of kind** on
the slot, readable by the affordance resolver exactly as now. What
changes is how the resolver *consumes* it — a filter with a policy
instead of a scope-selection rule.

## The per-invocation override

Precedent exists: `async:` is a verb-level default and a player overrides
it per invocation with a reserved option. A reserved `--strict` /
`--loose` (force `error` / force `take`) fits that pattern.

⚠ **One reserved option, one closed vocabulary.** The failure mode is a
knob per axis, and then the semantics live in the player's fingers
instead of the command def.

## The surface this touches

| | count |
|---|---|
| object-typed slots | **201** |
| …declaring `requires:` | **183** |
| …declaring `requires: any` (the opt-out) | 51 |
| slots with a multi-scope chain | **60** |
| slots already using `onExcess` | 27 |

The 60 multi-scope chains are the migration: `["$focus","reachable"]` ×37,
`[inventory, reachable]` ×9, `["reachable","online"]` ×5. Each is a place
where scope ORDER is currently doing work that the filter policy would do
instead — and each needs checking, because a chain may be expressing
*preference* (look at what I'm focused on first) rather than *kind*.

⚠ That is the one place this could go wrong: **`$focus` first is a
genuine preference, not a near-miss filter.** If one pool replaces the
chain, the focused object stops being preferred and starts being just
another candidate. The design must keep focus as a **ranking** input even
after the chain stops being a control-flow device.

## Open questions

1. **Default for 2/1** — `warn` or `take`? `warn` teaches; `take` is
   quiet. A noisy default on a common case is its own UX problem.
2. **Does the scope chain survive at all**, or does `$focus` become a
   scoring boost inside one pool? (See the warning above.)
3. **Is `onFiltered` per-slot only**, or does a verb-level default make
   sense — `open` wants `warn` everywhere, not per arg.
4. **What does `warn` emit** — a `Note` kind the client can render
   distinctly, or prose in the scene? A note is honest; prose is visible.
5. **Does `requires: any` (51 slots) mean "no filter"** — and therefore
   no policy — or "filter that admits everything"? They differ when a
   reserved `--strict` is passed.

## Cross-references

- [command-spec.md § `requires:`](../subsystems/command-spec.md) — the
  three axes (kind · relation · state) and why state is excluded
- [command-spec.md § `cardinality:`/`onExcess:`](../subsystems/command-spec.md)
  — the count policy this mirrors
- [command-routing.md § Affordance attribution](../subsystems/command-routing.md)
  — why the kind must stay declared
- [prompt.md § Cardinality vocabulary](../subsystems/prompt.md) — the
  prompt substrate `prompt` already rides
- [mql-grammar.md](../mql-grammar.md) — ordinals (`second box`), the
  explicit communication the complaint says already works
