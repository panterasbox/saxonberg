# Encumbrance slate (working doc)

> **Status: PARTIAL** — the `LoadBearing` gauge, the consequence ladder
> and the haulage draft term shipped →
> [encumbrance.md](../../subsystems/encumbrance.md)
> **Left:** per-item placement refinement (a frame pack beating the worn
> floor) · augment-conferred capacity · gravity/environmental margins ·
> tissue-derived mass · numeric tuning
> **Size:** a tail

Working slate for **encumbrance** — the weight a creature bears and
what bearing it costs. The headline isn't "model carried weight"
(that's nearly free; the substrate is already under us). It's the
**library of interactions** that change *how much a load costs you* and
*how much you can bear* — backpacks, carts, pack animals, exo-frames,
bags of holding. That library is the build.

This slate is the next consumer in the **Vitals & survival** build
(member alongside [vitals-slate](./vitals-slate.md)). It reads the
body-state substrate built on `feature/vitals` and adds one derived
gauge plus the seams that modify it.

See also (read before building — these are the substrate this leans on):

- [docs/subsystems/reserve.md](../../subsystems/reserve.md) — the
  `Reserve` capacity-axis primitive (`current` / `capacity` as
  `Quantity<U>`, `floorEffect`). Encumbrance borrows its **shape**;
  see the load-bearing difference below.
- [docs/subsystems/vitals.md](../../subsystems/vitals.md) —
  `getConditionBand` / `getConsciousness` and the vital signs the
  margin conditions read.
- [docs/subsystems/quantities.md](../../subsystems/quantities.md) —
  `Quantity<'kg'>`, the unit everything here is measured in.
- `Tangible.mass: Quantity<'kg'>` ([material](../../subsystems/race.md))
  — every tangible thing already has honest weight. **No new weight
  field is needed.**
- [docs/subsystems/conveyance.md](../../subsystems/conveyance.md) —
  the cart's second hat. Where load leaves the body, placement hands
  off to conveyance.
- [docs/subsystems/augmentation.md](../../subsystems/augmentation.md) —
  `AugmentMixin.confers()`; the exo-frame / belt-of-giant-strength
  capacity term.
- [docs/slates/tails/bulkable-slate.md](../tails/bulkable-slate.md) —
  a partially-full waterskin's borne weight tracks its bulk; future
  tie-in.
- [docs/slates/deferred-rpg/capability-magic-slate.md](../builds/capability-magic-slate.md)
  — **the boundary.** Encumbrance capacity is *not* a draw on the
  deferred general stat system. See "Capacity is not a stat."
- [docs/slates/deferred-rpg/collision-slate.md](./collision-slate.md)
  — container capacity (does the bag *fit* it?) is the other gauge;
  decomposed there, not here.

---

## The capacity side: derived physiology, drifting on the margins

### Capacity is not a stat

> Shipped as designed → [encumbrance.md § Carry
> capacity](../../subsystems/encumbrance.md#carry-capacity--physiology-derived) —
> no general stat, the boundary against `capability-magic`, and the
> "capacity barely moves" consequence are all stated there now.

### The terms

- **Augmentations** — `AugmentMixin.confers()` confers a capacity term.
  An exo-frame / power-loader (scifi) or a belt of giant strength
  (fantasy): **same seam, two fictions** (liberal diegesis). This is
  the main permanent-feeling capacity lever — gear, not grind.
- **Margin conditions** — temporary, *read existing state*: exhaustion
  (endurance reserve low), hypoxia (`spo2` low), injury
  (`getConditionBand`), high gravity. Each shaves the capacity term.
  This is where capacity "drifts on the margins" — and the input to
  the spiral above.

---

## What is *not* special: bearers

"Another bearer" (pack mule, hired porter) is **not a new term.** The
bearer is *any Creature*; load routes onto its gauge; whether it's
driven by a player, a brain, or nothing is invisible to encumbrance. A
mule is just a Creature with a small capacity. **There is no
`PorterMixin`.**

The porter who sets the crate down and refuses the last hill is a
**brain** deciding to drop load — pure behavior, **out of scope** here
(rides [npc-behavior](../builds/npc-behavior-slate.md)). The only genuinely-new
sliver is the **handoff** — moving load from your gauge onto another
creature's — and even that splits: the *transfer* is just containment
onto the other bearer (an existing primitive), the *come along* is
following/leading (conveyance or automation). Nothing
encumbrance-specific.

---

## Scope

This is the platform-design line, drawn the same way the rest of the
codebase draws it. The settled structure (the derived gauge, the two
coupling knobs, the consequence ladder, the cart handoff) shipped → see
[encumbrance.md](../../subsystems/encumbrance.md).

**Deferred dials (content + playtesters):** every *magnitude* — the
arms surcharge, the pack floor, bag-of-holding transmission, the
spiral's steepness, whether great mundane gear dips below the floor.
These live on content, not in the engine; the engine only needs to know
the dials exist and where they attach.

**Out of scope (this session):** bearer *behavior* (a mule balking, a
porter refusing) — that's automation. Movement-*speed* effects if no
speed representation exists yet (endurance tax is the clean v1; speed
rides later). Container capacity (the bag's own gauge) — that's the
collision-slate decomposition.

---

## Open questions

- **Physiology baseline — authored or tissue-derived?** A human "~70 kg
  baseline" authored on the species (simple), or summed from BodyPlan
  tissue composition (higher fidelity — losing a limb literally lowers
  it). Demand-driven answer: author until something reads the tissue
  version. But anatomy is already tissue-real, so this may be where it
  pays off. (Resolved for now: shipped authored, per this lean — see
  [encumbrance.md § Body mass](../../subsystems/encumbrance.md#body-mass--speciesgetbasemass--creaturegetmass). The tissue-derived
  path stays open.)
- **The spiral's steepness** (tabled). Should overload → exhaustion →
  collapse be a trap a careless player can fall into, or should the
  exhaustion-shaves-capacity term be gentle enough to be flavor?
- **Mundane floor: sacred, or a little gear relief?** (tabled — deferred
  to content/testers per the user.) Honest physics says the floor is
  true mass; game-feel might let a top-tier pack buy a little real
  relief before magic takes over.
- **Worn-distribution fidelity tier.** Placement coupling as a single
  worn-vs-held distinction (cheap) vs. per-slot ergonomics
  (back/hip/shoulder load paths). The fine version is a teaching
  surface but easily a later wave.

---

## Cross-references

- [docs/subsystems/reserve.md](../../subsystems/reserve.md) — the gauge
  shape; the stored-vs-derived `current` distinction is the key
  departure.
- [docs/subsystems/vitals.md](../../subsystems/vitals.md) — condition
  band + vital signs the margin conditions read.
- [docs/subsystems/conveyance.md](../../subsystems/conveyance.md) — the
  cart's second hat.
- [docs/subsystems/augmentation.md](../../subsystems/augmentation.md) —
  the capacity-conferring gear seam.
- [docs/slates/builds/vitals-slate.md](./vitals-slate.md) — sibling in
  the Vitals & survival build.
- [docs/slates/deferred-rpg/collision-slate.md](./collision-slate.md)
  — container capacity (the other gauge).
- [docs/slates/deferred-rpg/capability-magic-slate.md](../builds/capability-magic-slate.md)
  — the stat-system boundary encumbrance deliberately does not cross.
