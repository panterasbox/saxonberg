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
> **Left:** source-scoped invocation (`watch::set`, sigil unsettled) and
> its parse wiring (Q3–Q5) · extra `put` prepositions (Q2) · the
> `Receiving` mixin (NPC consent for `give`)
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
