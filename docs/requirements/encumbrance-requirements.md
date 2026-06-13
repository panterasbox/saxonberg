# Encumbrance — requirements

Encumbrance is the weight a creature bears and what bearing it costs.
It adds one **derived gauge** to `Creature` — borne burden vs carry
capacity — and the first **drivers** that read it: you can't lift the
impossible, you can't climb or swim overloaded, and moving while heavy
tires you. The headline is not "model carried weight" (the substrate
is already under us); it's the **graduated soft tax** — the principle
that weight limits what you can carry and do, enforced diegetically
rather than by an inventory-slot rule.

Seeded by [docs/slates/builds/encumbrance-slate.md](../slates/builds/encumbrance-slate.md).
Builds on the body-state substrate, now **merged to `master`** (`fafdd33`,
"Merge branch 'feature/vitals'"): `Creature` composes `Container`
+ `Tangible` (`getMass()`) + `Reserved` (endurance/satiation/hydration)
+ `Vitals` (`getConditionBand`) + `Slotted`/`BodyPlanSlots` + `Organism`.
Cut the build branch from an up-to-date `master` (no merge dependency
remains; `feature/vitals` is redundant).

Load-bearing subsystem docs: [reserve.md](../subsystems/reserve.md),
[vitals.md](../subsystems/vitals.md), [quantities.md](../subsystems/quantities.md),
[embodiment.md](../subsystems/embodiment.md), [slot.md](../subsystems/slot.md),
[spatial.md](../subsystems/spatial.md), [locomotion.md](../subsystems/locomotion.md).

## Goals

The build is responsible for delivering, on top of the shipped vitals
substrate:

- **A borne-burden read.** A creature can report the total *effective*
  weight it is bearing — `getBorneBurden(): Quantity<'kg'>` — computed
  as a **weighted walk over everything it carries and wears**, not a
  flat mass sum. The walk covers both `Container` contents (inventory)
  and `Slotted` occupants (worn/wielded), applying coupling factors as
  it descends. Derived on read, never stored.
- **A carry-capacity read.** A creature can report how much it can bear
  — `getCarryCapacity(): Quantity<'kg'>` — derived from its **own body
  mass** (`getMass()`) scaled by an engine constant, then multiplied by
  the live margin conditions (condition band, endurance level). Derived
  on read.
- **Body mass that defaults from the `BodyPlan`.** `BodyPlan` gains an
  authored `baseMass`; a `Creature` defaults its `getMass()` from its
  resolved plan's `baseMass` at construction/hydration, and an instance
  may deviate (override). So capacity rests on a body-grounded default,
  not a per-creature hand-authored number or `0`.
- **A load ratio.** The acted-on signal is `borneBurden / carryCapacity`
  (dimensionless), observable through the existing query/inspection
  surface.
- **Effective weight, honestly.** A borne item's contribution is its
  true `Quantity<'kg'>` mass run through two dimensionless coupling
  factors (container transmission × placement coupling). Mundane gear
  never drops a load below its true mass (floor = `1.0`, achieved by
  bearing it well); carrying loose is a surcharge (`> 1.0`); only magic
  goes below the floor.
- **Hard-end consequence: the lift gate.** Picking up an item that would
  push borne burden past an absolute **strain ceiling** (capacity × an
  overload constant) fails diegetically ("the anvil doesn't budge") —
  surfaced as a declined action via the response envelope, never a slot
  rule. Picking up an item that merely exceeds *capacity* (but stays
  under the ceiling) **succeeds** — you become overloaded, taxed, and
  movement-gated, but functional.
- **Hard-end consequence: the locomotion gate.** A creature over the
  heavy-load threshold cannot engage climb / swim / fly modes — an
  additional, load-aware veto in the existing per-actor locomotion gate
  (alongside, not replacing, the host-difficulty check).
- **Soft tax: load drains endurance.** Using a movement command while
  loaded draws down the `endurance` reserve in proportion to the load
  ratio (applied by the movement-command layer after a successful
  self-powered traverse; no game-tick required). Light loads cost
  nothing. Riding a conveyance does not drain the rider.
- **Drain is one-way in v1.** Endurance **recovery is out of scope** —
  it's deferred to the metabolism/survival build (recovery is metabolic:
  it depends on rest + satiation/hydration/oxygen, none of which are live
  yet, and it's a reserve concern, not an encumbrance one). So a creature
  that hauls over-capacity loads stays diminished until metabolism ships
  recovery; v1 drain defaults are **gentle** so this is mild, not
  punishing.
- **The spiral.** Low endurance shaves carry capacity (one of the
  margin multipliers), so an overloaded creature tires, and tiring
  lowers what it can bear. v1 ships **gentle** defaults — the spiral's
  floor is "heavily encumbered and exhausted," never collapse, and (with
  recovery deferred) it is one-directional until metabolism lands.
- **Coupling homes.** Container transmission is a `transmissionFactor`
  **field on `Vessel`** (the container-object category; default ⇒ 1.0).
  Placement coupling rides a **field on body-plan slot definitions** (hand
  slots couple at a penalty, worn slots at the floor).
- **`Vessel` as the carriable-container home.** `Vessel` is already
  `Tangible` (has mass), so a bag-of-holding-as-`Vessel` works today; this
  build only adds the `transmissionFactor` field and broadens the concept
  from "places that move" to "container-objects, with carriability emergent
  from mass." A bag of holding is a small `Vessel` with a low
  `transmissionFactor`; a ship is a `Vessel` you can't lift. The `Thing` ↔
  `Vessel` line becomes "a `Thing` that holds things."
- **Narrow `Adornable` to `ExitableVessel`.** `AdornableMixin` (fixture
  machinery) currently sits on the `Vessel` base, so every vessel carries
  it; only `ExitableVessel` needs it (the Door→`BoundaryAnchor` retrofit).
  Move it off the `Vessel` base onto `ExitableVessel`. Safe because every
  `getFixtures`/`addFixture` consumer already narrows on
  `MixinApi.isAdornable`; behavior is unchanged.
- **Demo content proving the substrate.** Three real objects, each
  exercising one axis: a worn **backpack** (a wearable `Vessel` —
  placement coupling, full transmission), a **bag of holding** (a `Vessel`
  with low transmission), and a **heavy object** over a normal creature's
  strain ceiling (the lift gate).
- **A subsystem doc** at `docs/subsystems/encumbrance.md`.

## Non-goals

Explicitly out of this build:

- **Movement-speed effects.** No speed/slow representation exists; load
  taxes endurance, not pace. Revisit if a speed model ever lands.
- **The cart / conveyance handoff.** Moving load *off* the body onto a
  dragged/wheeled conveyance — the slate's "hinge" — is deferred. It
  pulls in [conveyance.md](../subsystems/conveyance.md), boundaries, and
  a propulsion/traction cost that is not encumbrance. Phase 2.
- **Endurance recovery.** Deferred to the metabolism/survival build. v1
  drain is one-way (see Goals). Recovery is metabolic and isn't an
  encumbrance concern; this build builds no recovery code.
- **A general per-action or per-tick fatigue framework.** v1 drains
  endurance at exactly one event (loaded traversal). It does **not** build
  a generic "every verb costs stamina" system.
- **Hunger / thirst / survival ticks.** The `satiation` and `hydration`
  reserves stay at 100%; nothing drains them. These (and endurance
  recovery, which consumes them) are the metabolism/survival build.
- **The collapse driver.** `floorEffect: 'collapse'` keeps its "no
  consumer v1" status; endurance hitting zero does not knock a creature
  out. (Lands with vitals' death/consciousness drivers.)
- **Tissue-derived body mass.** v1 seeds mass from a single authored
  `BodyPlan.baseMass`, not a sum of `BodyPlan` tissue composition. The
  tissue-sum derivation (the per-part `tissues[].mass` data already
  exists, and summing it would auto-track amputation) is the deferred
  higher-fidelity baseline.
- **Environmental capacity margins.** Hypoxia (`spo2`) and gravity shave
  capacity *in principle*, but neither signal has a driver setting it
  off-baseline yet. Deferred until those drivers exist.
- **Numeric tuning.** Every magnitude — the arms surcharge, the strain
  ceiling, the heavy-load threshold, the drain rate, the spiral curve — is
  a content/playtest dial, not an engine constant to get "right" in this
  build. v1 ships defensible defaults.
- **A dedicated cockpit pane / styled load bar.** The ratio is
  *observable*; designing a client widget rides the broader
  vitals-cockpit surfacing.
- **Bag-of-holding / exo-frame as content** beyond the single demo
  container. Augment-conferred capacity (`AugmentMixin.confers`) is a
  proven seam but its content is deferred.

## Surface decisions

### Where the gauge lives

`getBorneBurden()`, `getCarryCapacity()`, and the load ratio are
**derived methods on the bearer** (`Creature`), reading existing
substrate. **No new "Encumbered" mixin.** The two coupling factors are
the only new state, and they live on the substrates that already own
the relevant concern (containers; slots) — see below. (Default-to-no-new-
mixin; the gauge is a derived facet, not a storage concern.)

### Burden is a weighted tree-walk, not a sum

`getBorneBurden` walks the bearer's carried items (`Container.getContents`)
**and** worn/wielded items (`Slotted` occupants — a separate,
non-persisted store), recursing through nested containers. Each item's
contribution is:

```
itemMass
  × Π(container transmission for each container on the path to the bearer)
  × placementCoupling(the slot the top-level borne thing attaches through)
```

A low-transmission container multiplies its whole subtree down; a worn
slot applies the good-coupling floor; a held slot applies the penalty.
One recursion does all of it.

### Capacity is derived from body mass, not a stat

There is no strength stat and none is coming (the vitals build omitted
scalar attributes deliberately). Capacity is encumbrance-specific:

```
carryCapacity = getMass() × CAPACITY_FRACTION × Π(marginMultipliers)
```

`CAPACITY_FRACTION` is an engine constant (a creature carries some
fraction of its own body mass comfortably). Margins live this build:
**condition band** (`getConditionBand`) and **endurance level**
(`getReserve('endurance')`). Both are dimensionless multipliers ≤ 1.0
that pull capacity down off its baseline. The baseline barely moves over
a character's life — the *fun* comes from the interaction terms, not
from growing the number.

### Body mass defaults from the BodyPlan

`getMass()` stays on the creature (via `Tangible`), but its **default**
comes from the body plan, not per-creature authoring. `BodyPlan` gains
an authored `baseMass: Quantity<'kg'>` ("a typical member of this plan").
At construction/hydration a `Creature` seeds its mass from its resolved
plan's `baseMass`; an explicitly authored creature mass is the
**deviation** that overrides it. `BodyPlan` is a shared singleton, so
`baseMass` is the species-level default and the creature's own mass
field is the individual's divergence from it.

This is **not** the tissue sum. `BodyPlan` already authors per-part
tissue masses (`BodyPart.tissues[].mass`); summing them would also yield
a body mass (and would auto-track limb loss), but it couples body mass
to whether every part's tissue detail was filled in realistically. v1
takes the single authored `baseMass`; the tissue-sum derivation is the
deferred higher-fidelity path.

### Two coupling factors, two homes

They vary independently (a bag of holding varies transmission; a
hip-belt varies placement), so they are two distinct factors:

- **Container transmission** — does a container-object's contents' weight
  reach the bearer at all? A `transmissionFactor` **field on `Vessel`**
  (default `1.0` = full pass-through; a bag of holding sets it low). Not on
  the universal `ContainerMixin` — rooms are Containers and weigh nothing,
  and "carriable container" isn't a separate type but the `Vessel`
  category at small scale. (`Vessel` is already `Tangible` — no mass change
  needed.)
- **Placement coupling** — how a borne thing couples to the body. A
  **field on the body-plan slot definition**: hand/held slots default to
  a surcharge (`> 1.0`), worn slots to the floor (`1.0`). Hands-free is
  *not* modeled here — it falls out of slot occupancy already (loose
  carry claims hand slots; a worn pack claims a back slot).

### Units: effective-kg, ratio is the signal

Per the slate's Units section: burden and capacity are both
`Quantity<'kg'>` ("effective kilograms" — true mass through the coupling
transfer function, anchored to the `1.0` floor). The acted-on signal is
the dimensionless ratio between them. No fantasy unit. Effective-kg and
true-mass share the `Quantity<'kg'>` type; *mass is what a scale reads,
burden is what the gauge accumulates* — a call-site discipline, not a
branded type.

### Consequence boundary: gauge + hard ends + soft tax

v1 owns the full graduated ladder *except* a continuous fatigue
framework and the conveyance handoff:

| Load band | v1 behavior |
|---|---|
| Light (≤ capacity) | nothing |
| Over capacity, under strain ceiling | overloaded: locomotion modes (climb/swim/fly) suppressed; loaded traversal drains endurance ∝ ratio |
| Past the strain ceiling | the lift itself fails (diegetic decline) |

Low endurance shaves capacity (the spiral), gentle by default, floored
at "exhausted," never collapse. **Drain is one-way** — recovery is
deferred to the metabolism build (see Non-goals), so the band table has
no "endurance recovers" row in v1.

## Constraints

- **Go through the substrate's method surface.** Read carried mass via
  `Tangible.getMass()`, reserves via `getReserve` / `adjustReserve`
  (`Quantity`-typed delta), condition via `getConditionBand`. Never
  reach fields directly (inter-stuff contract).
- **Derived reads stay derived.** `getBorneBurden` / `getCarryCapacity`
  recompute on call (like `getConditionBand`); they are not persisted
  scalars. No stored "current encumbrance."
- **The burden walk must cover slot occupants.** Worn/wielded items are
  in `Slotted.slots` (non-persisted runtime store), *separate* from
  `Container.contents`. A contents-only walk silently undercounts every
  worn item.
- **Recursion termination.** Nested containers recurse; the walk must
  terminate cleanly on cycles/depth (containment is already a DAG via
  the move chokepoint, but the walk should not assume it).
- **Enforcement lives at the command layer; the move substrate stays
  encumbrance-agnostic (hard invariant).** Encumbrance is a
  player-command-experience concern, not a physics-of-containment one.
  `Mobile.traverse`, `ContainmentApi.move`/`placeDirect`/`placeOn`, the
  containment chokepoint, and `forceMove` must carry **zero** encumbrance
  code — a dev or script doing a plain (non-forced) `move`/`traverse` of
  an over-ceiling item Just Works, no block and no drain. All three
  consequences are applied by the command layer: the lift gate in the
  get/take controller, and the locomotion veto + traversal drain in the
  movement-controller path. The drain applies only to a `Reserved` actor's
  own-power traverse (not riders, not non-creatures). The locomotion veto
  may later relocate from the locomotion gate to the exit (`ExitableMixin`)
  — an open seam, decided after it's seen in place.
- **Consequences are diegetic declines.** The lift gate and locomotion
  gate emit response-envelope notes (`controller-rejected` / the
  locomotion gate's existing shape), not boolean returns or thrown
  errors on user input.
- **No widening of universal mixins.** Container transmission does **not**
  go on `ContainerMixin` (rooms are Containers and weigh nothing) — it's a
  field on `Vessel`; placement coupling goes on the slot definition, not a
  new per-Stuff field.
- **`Vessel`/`ExitableVessel` changes are contained.** Adding
  `transmissionFactor` to `Vessel` and moving `AdornableMixin` from the
  `Vessel` base to `ExitableVessel` must not regress existing vessel seeds
  or the Boundary substrate: `transmissionFactor` defaults `1.0`; a plain
  `Vessel` becomes `!isAdornable` (every fixture consumer already narrows on
  `isAdornable`, so behavior is unchanged); `ExitableVessel`'s
  Door→fixture retrofit still works. (`Vessel` is already `Tangible` — no
  mass change.) The Boundary / `ExitableVessel` / perception suites are the
  regression guard.
- **Keep "mana"/RPG vocabulary out.** Encumbrance is physical; reserves
  stay engine-neutral (`endurance`), themes carry any fiction.
- **Demo content must be real** (props real or cut): the backpack is a
  genuine wearable `Vessel`; the heavy object is a high-mass `Tangible`;
  the bag of holding is a real `Vessel` with a low `transmissionFactor`.
  No flavor-only fakes.

## Acceptance criteria

- `getBorneBurden()` on a `Creature` returns effective-kg summing
  carried + worn/wielded items through nested containers, with coupling
  applied; covered by tests including: nested container, a worn item, a
  held item at surcharge, and an attenuating container at ~0.
- `getCarryCapacity()` returns body-mass-derived capacity with condition
  and endurance margins applied; tests cover baseline, a degraded
  condition band, and low endurance each lowering it.
- A `Creature` with no authored mass takes its `BodyPlan.baseMass`; one
  with an authored mass keeps the deviation. Covered by tests.
- Load ratio is observable through the existing inspection/query surface.
- Picking up an object past the strain ceiling is declined with a
  diegetic note; picking one up between capacity and the ceiling
  succeeds and leaves the creature overloaded. Both covered by tests.
- An overloaded creature is refused climb/swim/fly with a load-aware
  gate reason; an unloaded creature is not. Covered by tests.
- Traversing while loaded (via a movement command) reduces `endurance`;
  traversing light does not; a raw `traverse` does not. (Recovery is out
  of scope — drain is one-way.) Covered by tests.
- Reducing endurance demonstrably lowers `getCarryCapacity()` (the
  spiral), with defaults gentle enough that the floor is "exhausted,"
  not zero-capacity or collapse.
- `Vessel` has a `transmissionFactor` (default `1.0`, range-validated); a
  plain `Vessel` is `!isAdornable`; `ExitableVessel` is `isAdornable` and its
  door surfaces as a fixture; existing vessel seeds + the Boundary suite are
  unaffected. Covered by tests.
- The three demo objects exist as real templates and exercise placement
  coupling, container transmission, and the lift gate respectively.
- `docs/subsystems/encumbrance.md` exists and documents the gauge, the
  weighted walk, the two coupling homes, the `Vessel` reconception, the
  consequence ladder, and the deferred tails (cart/conveyance, survival
  ticks, collapse, environmental margins, tuning). `spatial.md` and the
  `Vessel` doc-comment reflect the broadened concept.

## Cross-references

- Seeding slate: [encumbrance-slate](../slates/builds/encumbrance-slate.md)
- Substrate (on `feature/vitals`): [reserve.md](../subsystems/reserve.md),
  [vitals.md](../subsystems/vitals.md)
- [quantities.md](../subsystems/quantities.md) — `Quantity<'kg'>`, the unit
- [embodiment.md](../subsystems/embodiment.md) / [slot.md](../subsystems/slot.md)
  — placement coupling home; worn vs held
- [spatial.md](../subsystems/spatial.md) — `Container` contents walk;
  `Mobile.traverse` drain hook
- [locomotion.md](../subsystems/locomotion.md) — the per-actor gate the
  load-aware veto extends
- [augmentation.md](../subsystems/augmentation.md) — deferred
  capacity-conferring gear seam
- Deferred tails: cart/conveyance ([conveyance.md](../subsystems/conveyance.md)),
  container capacity ([collision-slate](../slates/deferred-rpg/collision-slate.md)),
  the stat-system boundary ([capability-magic-slate](../slates/deferred-rpg/capability-magic-slate.md))
</content>
