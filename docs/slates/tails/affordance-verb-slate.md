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
> **Left:** source-scoped invocation (`watch::set`, sigil unsettled — and
> ⭐ the prefix is an **MQL string**, 2026-09-25) and its parse wiring
> (Q3–Q5) · extra `put` prepositions (Q2) · the `Receiving` mixin (NPC
> consent for `give`) · ⭐⭐ **the collision-resolution ladder** (below)
> **Size:** a tail

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

These verbs aren't combat or quest mechanics; they're the
basic-physics of arranging objects in a world. A sandbox needs
them before it needs anything else. The mixin pattern is the
right framing: each verb earns its slot only when an authored
host-side affordance opts in, so the universe-default `Stuff`
remains affordance-free.

The verbs are short controllers (~30-60 lines each); the design
weight lives in the **target-side mixins**.

---

## Verb collision, source-scoping, and command provenance

> Surfaced by the humblest possible object — a pocket watch that affords
> `set` (plus `wind`, `open`). Once *many* Stuffs afford verbs, generic
> names (`set` / `open` / `push` / `use`) collide. This is the
> disambiguation + discovery layer the affordance-verb family needs at
> scale. Long wanted; the watch is the first concrete forcing case.

**Default — shape resolution.** Already shipped: see
[command-routing.md § Stage 3 — Matching](../../subsystems/command-routing.md)
and § *Recency stack*. Most invocations never need more, and this
stays the ergonomic default — you rarely type anything special.

**Explicit — source-scoped invocation.** For genuine ambiguity,
explicitness, and scripting, a form that scopes a verb to a source:

```
watch::set 4:00      # the set that comes from the watch
me::say hi           # disambiguate against any other 'say'
```

The left side is an **MQL expression**; the right is verb + args. This is
what lets generic verb names stay safe *forever* — you never rename a verb
to dodge a collision, you scope it. (EotL prior art.)

**Syntax not locked.** `::` is the EotL inheritance — a candidate, not a
decision. Alternatives: `source:verb`, `verb@source`, `source.verb`. Hard
constraint: the sigil must not collide with MQL's own tokens — MQL already
uses `:` for quantity selectors (`:{N}` / `:{*}`), so a bare single `:` is
risky; `::` reads clear of it. Settle at requirements.

**Multiple results = cardinality, and we already own the machine.** The
source MQL can resolve to 0, 1, or N. Source-scoping introduces **no new
ambiguity model** — it reuses `CommandApi.applyCardinalityPolicy` (the
`cardinality` / `onExcess` / `onShortage` vocabulary):

- **one** (default): `onExcess: prompt` → "which watch?" for an
  interactive giver; **degrades to an ambiguity error when no Interactive
  is attached** — an NPC or a script gets the error, never a hang, because
  there is no one to ask.
- **many** (opt-in): a batch invocation (`all watches::wind`) declares
  cardinality many → apply to each; fed by MQL's existing `all X` / `:{*}`.
- **zero**: not-found error.

## ⭐⭐⭐ The affordance link is GATED now (2026-10-07)

`lint:reachability` arm A: **every command view in the game is named by a
`commandContributions` static somewhere, or carries a top-level
`unreachable:` key saying why not.** A zero invariant, opened at fifteen
dead views and driven to nought by the reachability sweep. Discovery is
one thing; *existing at all* is the one underneath it, and this slate had
no gate for it.

⚠ Of the fifteen, **the timepiece verbs are the ones this slate recorded
the shape of** — `wind` and `adjust`, the `blow`/`tally`/`wind`/`adjust`
bundle `CLAUDE.md` names as THE exemplar for domain-local commands. Half
of it had never run. `Watch.ts` reasoned correctly that the capability
gate belongs on `MechanicalMovementMixin` and then concluded *"so Watch
contributes none"* — which picks the right GATE and forgets to pick a
CONFERRER. Its two siblings in the same directory (`Whistle.ts:36`,
`CrossingLog.ts:41`) got it right, which is exactly what made the
omission invisible. ⭐ The rule both docstrings carry now: **the mixin is
the gate, the concrete class in the pack that owns the verbs is the
conferrer** — a kernel mixin may never name a locality's view.

## ⛔⛔ `drive` vs `drift` — an undiagnosed collision this slate now owns (2026-10-07)

`platform/cmd/movement/drive.yaml` (take a vehicle through an exit) and
`trade/mining/cmd/mining/drive.yaml` (drive a drift) both claim **`drive`**,
and `lint:verb-collisions` has listed the pair as undiagnosed since that
gate landed.

⚠⚠ The reachability sweep conferred the movement view on `DrivableMixin`
— correctly on its own reasoning: `MountableMixin` one file over confers
`mount`/`ride`, its comment records that pair being found dead in the
nutrition-fitness drive, and `drive` is their vehicular sibling missed on
the same pass. **The full suite refused it.**
`trade-mining/src/idea/cmd/mining/__tests__/acts.test.ts` asserts that
`lib/slot/Drivable.ts` carries no contributions static, and says why: the
two views have the **same arity**, so `requires:` cannot separate them at
shape and only affordance ORDER decides which one a miner gets.

⭐ So the movement view carries `unreachable: awaiting:affordance-verb-slate`
and the decision is here. The tripwire's own suggestion is the cheap
answer and probably the right one:

> *"Nothing in the repo affords the movement view today; if that changes,
> `drift` becomes primary — one line."*

**The adjudication, in full**, because the ladder wants both sides
evaluated and first-come is not one of its seven solutions:

1. ⭐ **`verbs: [drift, drive]` on the mining view, then confer the
   movement view.** A miner always has an unambiguous word; a driver gets
   `drive`. Two lines, and the mining view already declares both words
   *"so a miner always has an unambiguous one"* — its own test says so,
   which means half the work is done and was done deliberately.
2. **Rename the movement verb.** `pilot`? ⚠ Worse: `drive` is the
   ordinary English for taking a cart somewhere, and the mining sense is
   the jargon. Renaming the common word to protect the specialist one is
   backwards.
3. **One view with subcommands.** ⛔ They are not one act — a drift is cut
   and a cart is steered — so the ladder's first rung does not apply.

⭐ Shape 1 on the ladder's own reasoning. ⚠ What it needs is somebody who
owns BOTH sides: the sweep that found it had already told the glass build
that its `dip` collision was the glass build's to resolve, and taking
this one unilaterally would have been that mistake with the roles
reversed. The drive checkpoint to add with the fix: a miner in a drift
gets `drift`, and a driver on a cart gets `drive`.

⭐ A **singleton-claimed-once** gate is the honest general form of a
related bug this sweep met and did not fix (the distributor's counter
read as a singleton and found two). It needs constant resolution, and
most duplicate `props:` claims are legitimate — a works-board in twelve
yards is the intended shape — so it is an open question rather than a
gate. One paragraph, here, deliberately.

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

### Q3. Source-scope sigil

`::` (EotL) vs `:` / `@` / `.`. Must not collide with MQL tokens (`:` is
already a quantity selector). *Lean `::`.* Naming + parse decision; settle
at requirements.

### Q4. Is source-scoping ever *required*, or always optional?

*Lean: always optional* — shape resolution is the default; `::` is the
explicit override for ambiguity / scripting / clarity. An affordance never
*demands* the scoped form.

### Q5. Non-interactive giver + multi-result source

An NPC or script whose `source::verb` MQL returns many: error (default) or
apply-to-all? *Lean: error unless the invocation declares cardinality
many* — no silent fan-out from a script. Rides the no-Interactive degrade
path in `applyCardinalityPolicy`.

---

## Once shaped into formal requirements

What remains for requirements is the disambiguation layer:

- Source-scoping syntax (`source::verb`) — sigil settled (Q3),
  parse wiring against the MQL tokenizer.
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

### 4 · ⭐⭐ Source-scoped invocation — `keyword::verb -opt args`

**Slated here, unbuilt, and it goes in whenever something needs it.** The
prefix is ⭐ **an MQL string that resolves to one or more verb-affording
objects**, and *the player picks which affordance runs* — so disambiguation
becomes **explicit and diegetic** instead of a heuristic the engine has to get
right. ⚠ Sigil still unsettled (`::` is the sketch).

This is the rung that makes rungs 1–3 optional: where two affordances are
genuinely different acts that happen to share a word, the honest answer can be
to let the player say which one they mean.

### ⚠ What NOT to do

Collapse two different acts into one view by **alternating the arg types**. An
arg `requires: A|B` **deletes a check** rather than adding a branch — see
[command-spec.md](../../subsystems/command-spec.md) and the shipped
`harvest.yaml`, whose `GrowingMixin|CultivableMixin` is a *widening of one act's
subject*, not two acts sharing a verb.
