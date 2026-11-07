# Affordance verbs (working slate)

> **Status: PARTIAL** — `put` / `give` / `Surfaced` / `restingOn` /
> `placeOn` shipped → [spatial.md](../../subsystems/spatial.md);
> affordance attribution, `getAffordances()`, and the verb-provenance
> `affordances` help verb all shipped →
> [command-routing.md](../../subsystems/command-routing.md); the
> global-verb-vs-object-carried-command question resolved and is
> documented at [command-spec.md](../../subsystems/command-spec.md) §
> *Domain-local commands* (the Watch worked example shipped in that
> shape, not the `Timepiece` mixin this slate sketched).
> Source-scoped invocation shipped as `verb@source` (the prefix an MQL
> string; Q3–Q5 settled) and the `drive`/`drift` collision is gone, both at
> controllers-are-io → [command-parsing.md](../../subsystems/command-parsing.md),
> [command-routing.md](../../subsystems/command-routing.md).
> The `lint:reachability` gate, `KNOWN_COLLISIONS`' retirement (D17: a
> same-word pair is proved disjoint by `prepositionRequired`, never
> adjudicated — `shadowed-by:` not built) and the radial's subject-first
> sort (D33) are shipped too → command-spec.md § `unreachable:`, §
> `prepositionRequired:`. ⭐⭐ The collision-resolution ladder (below) is
> doctrine, kept for the coordinator to home.
> **Left:** extra `put` prepositions (Q2) · the `Receiving` mixin (NPC
> consent for `give`) · the radial's own build (below) · a
> singleton-claimed-once gate (an open question, below)
> **Size:** a tail (Q2 · `Receiving` · the gate question); the radial is
> a build of its own

Working slate for two sandbox-foundational verbs that exercise
target-side mixin affordances: **`put`** and **`give`**. Each
verb pulls a mixin out of [mixin-slate.md](../tails/mixin-slate.md)'s
catalog into a real implementation.

The verbs are small. The slate exists because the **mixins**
had architecture questions worth resolving before the build —
particularly `Surfaced` (the on-vs-in distinction) — and now
because the affordance-verb family needs a disambiguation +
discovery layer at scale (source-scoping, command provenance).

See also:

- [docs/slates/mixin-slate.md](../tails/mixin-slate.md) — the parent
  catalog. `Surfaced` (line 82) is listed there; this slate is
  where it gets designed.
- [docs/subsystems/embodiment.md](../../subsystems/embodiment.md)
  — body slots and the "hand slots are for activities, not
  storage" rule that frames why `give` is inventory-side.
- [docs/subsystems/spatial.md](../../subsystems/spatial.md),
  [docs/subsystems/collections.md](../../subsystems/collections.md)
  — `Container` is the existing "things inside this thing" shape;
  this slate's `Surfaced` either extends it or sits parallel.
- [docs/slates/language-slate.md](../tails/language-slate.md) — the
  `read` verb and `Readable` mixin live there because they're
  primarily language-system consumers.

---

## Principle

*Shipped and documented: `put`/`give` → spatial.md § Verbs: `put`,
`give`; "a verb earns its slot only when a host-side affordance opts in"
→ command-routing.md § There is ONE record of verb affordances. Cut
2026-11-07.*

---

## Verb collision, source-scoping, and command provenance

*Shape resolution (the default) → command-routing.md § Stage 3 —
Matching, § Recency stack. Source-scoped invocation: superseded by the
code — shipped as `verb@source` with an MQL scope (not `::`), the source
filling the slot it fits, several sources a batch, a script or NPC
refused `needs-input` (controllers-are-io D1–D3) → command-parsing.md §
`verb@source`, command-routing.md § `verb@source` — the scope filter,
first. Cut 2026-11-07.*

## ⭐⭐⭐ The affordance link is GATED now (2026-10-07)

*Shipped: `lint:reachability` arm A → command-spec.md § `unreachable:`,
where the conferrer rule (the mixin is the gate, the pack class is the
conferrer) graduated 2026-11-07. Cut.*

## ✅ `drive` vs `drift` — SETTLED: mining's view is `drift` (controllers-are-io D20, 2026-11)

*The collision and its adjudication are documented → command-spec.md §
When both are bodily acts — which trade keeps the word (rung 1 names
`drive`/`drift`), and `platform/cmd/movement/drive.yaml`'s header carries
the reasoning; `DrivableMixin` confers the movement view. Cut
2026-11-07. The open question below stays.*

⭐ A **singleton-claimed-once** gate is the honest general form of a
related bug this sweep met and did not fix (the distributor's counter
read as a singleton and found two). It needs constant resolution, and
most duplicate `props:` claims are legitimate — a works-board in twelve
yards is the intended shape — so it is an open question rather than a
gate. One paragraph, here, deliberately.

*`shadowed-by:` — superseded by controllers-are-io D17: a same-word pair
is PROVED disjoint (`prepositionRequired` + non-intersecting
`prepositions:`) or fails the gate; nothing is adjudicated, so there is
no disposition to carry. `KNOWN_COLLISIONS` emptied when `pour` unified
and the constant is deleted (`check-verb-collisions.ts`) →
command-spec.md § `prepositionRequired:`. Cut 2026-11-07.*

**Command provenance (help) — shipped.** The `affordances` verb
(`AffordancesController`) lists a giver's available commands annotated
by affording source, and the underlying attribution record is
documented at
[command-routing.md § Affordance attribution](../../subsystems/command-routing.md#affordance-attribution--source-not-category).
This is the discovery layer this slate wanted; it predates and does not
depend on source-scoping (`::`) below.

**How a verb reaches an object — resolved, documented elsewhere.** The
global-verb-vs-object-carried-command question (a capability mixin
gating a global verb, vs. a one-off command an object carries itself)
is settled by the "reusability" test at
[command-spec.md § Domain-local commands](../../subsystems/command-spec.md)
— including this slate's own watch case, which shipped as the worked
example there (and at [time.md](../../subsystems/time.md)) in a
different shape than sketched below: `wind`/`adjust` as domain-local
carried commands gated on a `MechanicalMovementMixin`, not a
`Timepiece` mixin, and no `set` verb.

---

## What this slate does NOT cover

- **`read` and `Readable`** — language-system consumer; see
  [docs/slates/language-slate.md](../tails/language-slate.md).
- **Sensory verbs** (`smell`, `taste`, `touch`, `listen`) —
  separate slate proposed at sensory-verb-slate.md (not yet
  drafted). Different design axis: target-side perception
  channels rather than action affordances.
- **Eat / drink** — `Edible` / `Drinkable` are mixin-slate
  entries; depends on `DietApi` (race subsystem follow-on).
  Their own slate or a race-follow-on slate.
- **NPC consent for `give`** — `Receiving` mixin deferred.
- **`take from`** as a `get` extension — `get X from Y` is
  already handled by `get`'s MQL resolution against the
  container's contents. Not in this slate.
- **`put` semantics for liquids** — pouring is `Pourable` (its
  own mixin in the catalog, line 71). Different mechanic.

---

## Open questions

### Q1. `Surfaced` vs. `Container` ontology

Resolved: sibling. Shipped as `lib/spatial/Surfaced.ts`; see
[spatial.md § Surfaced and surface placement](../../subsystems/spatial.md#surfaced-and-surface-placement).

### Q2. `put` preposition vocabulary expansion

What about `put X under Y`, `put X behind Y`, `put X inside
the hollow of Y`? Each is a different relationship.
mixin-slate hints at `Hangable`, `Hideable`, etc. For v1: ship
`in` (Container) and `on` (Surfaced); other prepositions earn
their own mixins when content needs them.

### Q3–Q5 — resolved

*Q3 `verb@source` (`@`, the scope an MQL string) · Q4 always optional ·
Q5 a script or NPC is refused `needs-input`, a scope that declares
plurality is a batch → command-parsing.md § `verb@source`,
command-routing.md § `verb@source` — the scope filter, first
(controllers-are-io D1–D2). Cut 2026-11-07.*

---

## Once shaped into formal requirements

What remains for requirements is the disambiguation layer:

- `put` preposition vocabulary expansion (Q2) and the `Receiving`
  mixin (NPC consent for `give`), if either earns a forcing case.

The slate sets the design space for the affordance-verb family;
follow-on slates (`Pourable`, `Switchable`, `Lockable`, etc.)
plug in the same way when content earns them.


---

## ⭐⭐⭐ The collision-resolution ladder — what to do when two things want one verb

**User doctrine, 2026-09-25, recorded because it had been given as a lecture
more than once and never written down.** It is a *ladder of viable options*,
not a single rule — *"there's a lot of different solutions here to a problem
and they're all viable in different situations."*

> ⭐ **The deciding question is whether the SYNTAX of one affordance conflicts
> with the syntax of the other.** That is what picks a rung.

### 1 · ⭐ Unify behind an interface — the usual answer

> *"if two things want the same verb, the ideal thing is to make a controller
> agnostic to the procedure being asked for, probably through some kind of
> interface: `Verb`/`Verbable`. that's not always the best solution but most of
> the time it looks something like that."*

**The pattern already ships, in the extraction build's verb family.**
`lib/ground/Workable.ts` declares `Workable` (`planWork` / `completeWork`) and
`Splittable extends Workable`; `dig` · `split` · `hew` are
`WorkedActController` subclasses, and `split.yaml` takes **`requires: any`** on
its target while the controller narrows *by shape*. The procedure is the
subject's; the controller only sequences it. Nothing is registered — the verb
finds the subject by shape.

⚠ So a new consumer of an existing verb is often **not** a new view: it is a
class implementing the verb's interface.

### 2 · Change what affords it, so the collision never happens

Affordance is per-class and per-bucket (`self` / `peers` / `environment`), so
two uses of one word can simply never appear in the same scope. ⚠ The failure
this avoids is the shipped one: **a second view claiming a verb SHADOWS the
first silently** (the consequence build paid for that). Same-verb collisions
resolve at the assemble stage → [command-routing.md](../../subsystems/command-routing.md).

### 3 · Subcommands, for multi-action UX

`args` **or** `subcommands`, never both →
[command-spec.md](../../subsystems/command-spec.md), whose own doctrine is
*"a bare verb is something your body does; a subcommand is something…"*. 37 of
~250 shipped views are subcommanded. Right when one noun genuinely hosts
several related acts; wrong when the acts belong to different owners.

### 4 · ⭐⭐ Source-scoped invocation — `verb@source -opt args` (shipped)

The
prefix is ⭐ **an MQL string that resolves to one or more verb-affording
objects**, and *the player picks which affordance runs* — so disambiguation
becomes **explicit and diegetic** instead of a heuristic the engine has to get
right. ✅ **Shipped as `verb@source`** (controllers-are-io D1–D3) — e.g.
`wind@me:i:watch`; the scope is MQL's own grammar.

This is the rung that makes rungs 1–3 optional: where two affordances are
genuinely different acts that happen to share a word, the honest answer can be
to let the player say which one they mean.

### ⚠ What NOT to do

Collapse two different acts into one view by **alternating the arg types**. An
arg `requires: A|B` **deletes a check** rather than adding a branch — see
[command-spec.md](../../subsystems/command-spec.md) and the shipped
`harvest.yaml`, whose `GrowingMixin|CultivableMixin` is a *widening of one act's
subject*, not two acts sharing a verb.

### ⚠ The radial needs its own build (owner, 2026-11-07)

Its three rows per side, the verb order, and `requires: any` verbs offered with
no check of `scope` (`belay`, `climb`, `drive` on a pot) are one design problem,
and controllers-are-io touched only the sort (the subject's verbs first).
