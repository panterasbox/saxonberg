# Affordance verbs (working slate)

Working slate for two sandbox-foundational verbs that exercise
target-side mixin affordances: **`put`** and **`give`**. Each
verb pulls a mixin out of [mixin-slate.md](./mixin-slate.md)'s
catalog into a real implementation.

The verbs are small. The slate exists because the **mixins**
have architecture questions worth resolving before the build —
particularly `Surfaced` (the on-vs-in distinction).

See also:

- [docs/slates/mixin-slate.md](./mixin-slate.md) — the parent
  catalog. `Surfaced` (line 82) is listed there; this slate is
  where it gets designed.
- [docs/subsystems/embodiment.md](../subsystems/embodiment.md)
  — body slots and the "hand slots are for activities, not
  storage" rule that frames why `give` is inventory-side.
- [docs/subsystems/spatial.md](../subsystems/spatial.md),
  [docs/subsystems/collections.md](../subsystems/collections.md)
  — `Container` is the existing "things inside this thing" shape;
  this slate's `Surfaced` either extends it or sits parallel.
- [docs/slates/language-slate.md](./language-slate.md) — the
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

## Verb 1 — `put`

### Shape

```
put <item> in <container>
put <item> on <surface>
```

The actor holds `<item>` (it's in their inventory or wielded
slot); the target is something they can perceive in scope. The
verb resolves the preposition to a placement mode:

- `in` → target must compose `Container`.
- `on` → target must compose `Surfaced` (this slate's new mixin).

`put X Y` (no preposition) — disambiguate by target capability:
target composes `Container` only → `in`; composes `Surfaced`
only → `on`; composes both → prompt the player (or pick `on`
by author-preference setting on the target).

### Actor-side

No new mixin. The actor needs to be holding `<item>` — that's
already gated by inventory / wielded-slot resolution.

### Target-side — `Container` (shipped)

Existing `ContainerMixin` covers `put X in Y` without changes.
The verb calls `ContainmentApi.move(item, target)` (the existing
Api method); permission checks (does the container allow this
item? capacity?) live on the Api as today.

### Target-side — `Surfaced` (new)

The mixin Saxonberg has been missing. What it owns:

```ts
interface Surfaced {
  // Collection surface, mirroring Container conventions
  // (see docs/subsystems/collections.md).
  getResting(): readonly (Stuff & Containable)[];
  addResting(item: Stuff & Containable): void;
  removeResting(item: Stuff & Containable): void;
  canRest(item: Stuff & Containable): boolean;
  // Optional descriptive shape:
  getSurfaceType(): 'flat' | 'sloped' | ...;
  // MQL keyword bridge: if the host's Detailed map has a
  // matching keyword, `put X on <keyword>` resolves to this
  // surface. Mirrors `SlotSpec.userFacingDetail` (see
  // docs/subsystems/slot.md § Detail-targeted resolution).
  getUserFacingDetail(): string | undefined;
}
```

No item-side mixin. `Containable` is the gate already — the
actor's-holding-it invariant means the item composes
`Containable`, and Locations / Zones / pure value objects (the
universe of "things you can't put on anything") don't compose
it either. Per-surface constraints (wax tabletop rejects hot
items, fragile shelf rejects heavy ones) live on the host's
`canRest()` and read item properties; the item itself doesn't
declare a marker.

### The architectural question: `Surfaced` vs. `Container`

Three plausible shapes:

**A. `Surfaced` as a sibling mixin** with its own collection
(`getResting`). What I sketched above. Cleanest ontology — a
table is not a container. Most code duplication; surface
mixins parallel container mixins.

**B. `Container` with a `containmentPreposition` field.** Single
mixin, single collection. `containmentPreposition: 'in' | 'on'
| 'under' | 'behind'` carried on the host. Cheapest to build;
loses the ontological distinction.

**C. `Surfaced` extends `Container` with a preposition override.**
Composes B's simplicity with a discoverable mixin name. Author
declares `Surfaced` (which is a `Container` under the hood);
prose / verb dispatch sees the on-flavor.

Lean **A** for the slate's first cut — sibling mixin, parallel
surface. Rationale: a tabletop and a chest's interior really are
different ontological things; gravity, perception (look-at vs.
look-in), and future physics (stacking, sliding) diverge. Option
B optimizes for code reuse at the cost of conflating two
distinct relationships. The build can swap to C if duplication
gets painful.

### Verb controller sketch

```ts
class PutController extends CommandController<PutModel> {
  execute(model, ctx): void {
    const actor = ctx.commandGiver;
    const item = model.item;
    const target = model.target;
    const preposition = model.preposition;  // 'in' | 'on' | undefined

    // Resolve preposition from target capability if absent.
    const mode = preposition ?? this.inferMode(target);
    if (!mode) {
      ctx.note({ kind: 'controller-rejected', reason: 'no-affordance' });
      // Scene.send "There's no obvious way to put <item> on/in <target>."
      return;
    }

    if (mode === 'in') {
      if (!MixinApi.isContainer(target)) { /* reject */ return; }
      ContainmentApi.move(item, target);
    } else { // 'on'
      if (!MixinApi.isSurfaced(target)) { /* reject */ return; }
      target.addResting(item);
    }
    // Scene.send completion prose
  }
}
```

The controller calls `target.addResting(item)` directly — the
mixin's own surface IS the contract. No new Api.

---

## Verb 2 — `give`

### Shape

```
give <item> to <actor>
give <actor> <item>      (alternate word order)
```

Inter-actor transfer of a held item.

### Actor-side

No new mixin. Actor holds `<item>`.

### Target-side

The target must be an `Agent` — the base class for active
runtime presences (Characters today, future NPCs / daemons).
Agency is the right gate: "can this thing receive an object
and act on it later?" Animacy is too tight (a sentient
construct is animate-debatable but plainly an Agent); species
checks are too biological (a corpse may still compose
Organism but isn't an Agent in the runtime-active sense).

The item lands in the receiver's **general inventory**
(`ContainmentApi.move(item, receiver)`) — same destination as
`get`. Hand slots are not on the path. Dual-wielding a pair of
swords doesn't lock you out of receiving a spellbook; the book
goes into your inventory, and you can `wield` it later if you
free a hand. The prose still reads "Alice hands the book to
Bob" — the in-prose hand-shape is a narrative convention, not
a mechanical constraint.

**No new `Receiving` mixin in v1.** The sandbox doesn't have
NPC consent / refusal mechanics yet. A future `Receiving`
mixin can wrap policy (refuse-if-X, prompt for confirmation)
when content earns it.

### Verb controller sketch

```ts
class GiveController extends CommandController<GiveModel> {
  execute(model, ctx): void {
    const giver = ctx.commandGiver;
    const item = model.item;
    const receiver = model.target;

    if (!(receiver instanceof Agent)) {
      ctx.note({ kind: 'controller-rejected', reason: 'non-actor' });
      // Scene.send "<receiver> can't take that."
      return;
    }

    // Inventory-to-inventory transfer. Every Agent composes
    // Container (per Character / Avatar's mixin chain); capacity
    // gating lives on the Container side.
    ContainmentApi.move(item, receiver);
    // Scene.send: giver toSelf/toPeers prose, receiver toSelf prose
  }
}
```

---

## Detail interactions — affordances live on Stuffs, not Details

DetailedMixin gives a Stuff lightweight addressable sub-parts
(`look at door's handle`) — descriptive, MQL-resolvable, but not
themselves objects. The line this slate defends:

> **Affordances are mixins on Stuffs. Details are pure
> description. If a sub-part deserves a verb that DOES
> something — accept things on it, hold things in it, be picked
> up — it earns its own Stuff.**

The corollary: verbs don't target Details. A sword's inscription
is text inside the Detail's description — `look at inscription`
shows it — but no separate verb attaches to the Detail itself.
The same applies to any future sensory verb against a Detail:
the descriptive text covers it.

The one exception, established by the slot subsystem, is the
**Detail-keyword bridge**: a slot's `userFacingDetail` lets MQL
resolve "mount back" against a Stuff that exposes "back" as
both a Slotted slot and a Detail keyword. The Detail isn't
gaining slot semantics — the slot is *claiming* the keyword
for MQL resolution. This slate's `Surfaced` follows the same
pattern with `getUserFacingDetail()` so `put apple on tabletop`
resolves "tabletop" against the host's single `Surfaced`
collection. Cheap, consistent, no new pattern.

Per-verb summary:

- **`give`** — whole-Stuff transfer to a whole-Stuff receiver.
  No Detail interaction. (`give X to <hand-keyword>` falls out
  of the existing slot-Detail bridge if the receiver's hand
  slot already has a `userFacingDetail`.)
- **`put X in/on Y`** — `Y` must compose `Container` or
  `Surfaced` on the host. Detail keywords resolve via the
  bridge field above.

If a sandbox needs multiple genuine surfaces on one piece of
furniture (bookshelf with shelves AND a top), each shelf is its
own Stuff — not a Detail-with-its-own-Surfaced. The "one mixin
per Stuff" stance keeps the substrate honest about which
sub-parts are interactive.

---

## What ships in this slate

The minimal sandbox-useful build:

- **New mixin** `Surfaced` (`lib/spatial/Surfaced.ts` or
  `lib/containment/Surfaced.ts` — placement TBD; lean spatial).
- **New verbs** `put`, `give` — YAML + controller pairs.
- **First content** — a few authored Stuffs that exercise the
  mixins. A table (Surfaced), an apple (gettable + put-on-able),
  a willing receiver NPC for `give`.

Tests gating acceptance:

- `put X in Y` against a Container → item ends up inside.
- `put X on Y` against a Surfaced → item ends up resting on.
- `put X on Y` against a non-Surfaced → rejection prose.
- `put X Y` (no prep) against a target composing both → prompt
  or author-preference resolution.
- `give X to Y` against an Agent → item transfers to receiver's
  inventory + dual prose.
- `give X to <non-Agent>` → rejection prose.

---

## Verb collision, source-scoping, and command provenance

> Surfaced by the humblest possible object — a pocket watch that affords
> `set` (plus `wind`, `open`). Once *many* Stuffs afford verbs, generic
> names (`set` / `open` / `push` / `use`) collide. This is the
> disambiguation + discovery layer the affordance-verb family needs at
> scale. Long wanted; the watch is the first concrete forcing case.

**Default — shape resolution (already shipped).** The rich parser +
dispatch chain (shape-vs-bind, `pass: true`, scope try-list, per-giver
recency) resolves the common case by target + argument shape:
`set <watch> 4:00` finds the watch's `set` affordance because the watch is
in scope and the args fit. Most invocations never need more, and this
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

**Command provenance (help).** Affordance verbs are invisible unless you
can ask **"what can I do, and where does each verb come from?"** A help
surface listing available verbs and their **source** (which object + which
mixin affords each) — extending the YAML-generated help that already
produces usage/help pages. It's also how anyone discovers that a
`source::` target exists at all. Without it, affordance verbs can't be
found.

### How a verb reaches an object (it isn't always a mixin)

Two grounded patterns — neither is "the mixin *is* the verb":

- **Global verb, capability-gated.** The verb is a global command
  (`open`/`close`, `put`/`give`); its controller acts on any in-scope
  target, gated by a capability mixin that supplies the state + methods
  (`Sealable` → `isOpen()`/`open()`; `Container` → holds). The mixin
  provides *capability*; the verb stays global.
- **Object-carried command.** An object-specific command lives on the
  object — the `Thermometer` carries `measure`; its controller reads from
  an Api. No mixin involved.

So `put`/`give` ride mixins *because `Container`/`Surfaced` are shared
traits*, not because verbs must come from mixins. A one-off verb is just a
command the object carries; promote it to a global-verb + capability-mixin
(like `open` + `Sealable`) only when a second host shares the trait. (This
qualifies the "affordances are mixins on Stuffs" line above — that section's
real point is *Stuff vs Detail*, not *mixin vs command*.)

### Worked example — the watch

- `open` / `close` are **global verbs** gated by the `Sealable` capability
  (the watch composes `Sealable`; the global controllers act on it).
  `wind` / `set` are **carried by the watch** (object-specific commands,
  like `Thermometer` carries `measure`) — **no `Timepiece` mixin.** It's a
  thin `Watch` class (the instruments are thin classes too) with clockwork
  fields (`setTo` / `setAt` / `drift` / `wound`) that **overrides its
  long-description getter** to build the string — static prose + its **own
  kept time** (`reading = setTo + (WorldClockApi.now() − setAt) × rate`;
  the world-clock is only an elapsed-time *ruler*, never displayed — the
  watch shows its own drifted value, which is why Gus's, never `set`, reads
  slow) + lid state (`Sealable`). `getMarkupLong`
  calls the getter fresh on every `look`, so **`look watch` shows the
  time** with no extra machinery. (No augmenter, no read-verb:
  `markupAugmenters` are a *different* tool — multi-mixin cross-cutting
  transforms like detail-wrapping / spoiler gating, not an object computing
  its own description.)
- **Gus** (a command-giver like anyone) issues `wind watch` — his MQL
  `watch` resolves to his single carried watch (cardinality one, no
  prompt) — and never issues `set` (which is why it drifts).
- **Player, one watch:** `set watch 4:00` resolves by shape; no scoping
  needed.
- **Player, two watches:** `set watch 4:00` hits cardinality-excess → a
  disambiguation prompt, or scope explicitly: `brass-watch::set 4:00`.
- **Batch:** `all watches::wind`.
- **Help** reports `set` / `wind` as coming from the watch's `Timepiece`
  affordance.

---

## What this slate does NOT cover

- **`read` and `Readable`** — language-system consumer; see
  [docs/slates/language-slate.md](./language-slate.md).
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

Sibling, variant, or extension? Lean sibling (Option A). Real
decision rides on whether downstream code wants to treat all
"contained things" uniformly or wants to branch on the
relationship type. If perception code wants `getAllContents() ⊕
getAllResting()`, the duplication is annoying — but if perception
asks "what's visible on the table?" vs. "what's in the chest?"
the distinction is load-bearing.

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

This slate boils down to:

- `Surfaced` mixin; `getResting` /
  `addResting` / `removeResting` / `canRest` /
  `getUserFacingDetail` surface.
- `put` / `give` verb controllers + YAML views.
- A handful of authored content Stuffs exercising the new
  mixin (a table with stuff on it, an apple, a give-receiver).
- Tests gating each verb/mixin pair.

The slate sets the design space for the affordance-verb family;
follow-on slates (`Pourable`, `Switchable`, `Lockable`, etc.)
plug in the same way when content earns them.
