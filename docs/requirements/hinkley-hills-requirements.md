# Hinkley Hills — requirements

**Phase 2 of [living-world-roadmap.md](../living-world-roadmap.md): ground you
own.** A player buys title to a lot in **Hinkley Hills** — a new suburb — and
grows something on it at a density greater than one.

Phase 1 proved the growth model on a houseplant — one plant, in a pot, indoors,
on borrowed ground. This build keeps that engine untouched and adds the two
things it could not have: **ground that is yours**, and a **harvest that mints
matter**. In between sits the enabler three verticals are waiting on — **land
use** — and the persistence pattern that owned *ground* needs, which is a
different pattern from the one a movable plant uses.

The load-bearing continuity: **a garden bed is the pot at N > 1.** The farming
slate specifies the boutique density as *"a garden bed is a `Slotted` fixture
with N slots; each plant is a `Slottable`"*, and phase 1 deliberately built the
pot as exactly that at N = 1 — so this build raises a capacity and shares a soil
volume rather than forking the biology. `Plant`, `GrowingMixin` and the
condition/cause surface are **reused unchanged**.

Seeded by [farming-slate § The land model / The harvest](../slates/builds/farming-slate.md),
[stewardship-slate § Land use](../slates/builds/stewardship-slate.md) and
[property-slate](../slates/builds/property-slate.md). Growth-model reference:
[husbandry.md](../subsystems/husbandry.md).

> **This is not a ladder rung.** The stewardship ladder has rows for a
> `Townhome / house` (*owned, residential with yard, supports a garden bed*) and
> a `Smallholding` (*owned, frontier, agricultural*) — and this build satisfies
> **neither**. It sites one bespoke lot in one bespoke suburb, with no
> eligibility rule, no ascent gate and no second lot, because the ladder is
> `[PROPOSED]` and has no ascent mechanism anywhere. Naming the build for the
> **place** rather than for a rung is deliberate: it keeps the requirements
> honest about what ships, and leaves the ladder free to claim Hinkley Hills as
> a rung later without this doc having pre-committed it.

---

## Goals

- **A player buys title to real ground, and it is durably theirs.** Title
  transfers through the shipped registry with a real money leg; the lot is
  theirs across a restart, and the chain-of-title records who sold it.
- **Hinkley Hills exists as a place, and governs itself.** A new `Locality`
  beside the city — not inside it — declaring its own land use. It is reachable,
  it appears on departures boards by name, and it reads as somewhere a person
  could live rather than a teleport pad.
- **Land use is a closed vocabulary that gates, not decorates.** The six-entry
  set lands on the parcel record, resolves through the existing longest-prefix
  walk, and **refuses** an act it does not admit — with a message that names
  the reason.
- **A garden bed grows several plants on one shared soil, and density is a real
  trade-off.** The bed is the pot's surface at a higher capacity; because the
  soil is shared, planting more means less for each — the trade-off falls out of
  the growth model's existing limiting-factor curve rather than from a new rule.
- **Soil is something you manage, not just a volume.** Two reserves —
  moisture and one nutrient — where the harvest **exports** nutrient and
  feeding restores it, so working the ground has a cost that compounds.
- **A harvest mints matter with a quality band**, stamped with who grew it, and
  it lands in the shipped crafting + metabolism loop — grow → cook → eat is a
  complete cycle needing no new consumer.
- **Owned ground persists through a reusable keyed holder.** The
  `(scope, key)` seed-vs-restore pattern for a *room* gets a home that is not
  dorm code, because phase 4's field-rooms and phase 5's paddocks are the same
  shape.
- **The existing `horticulture` Discipline accrues from the new acts**, graded
  by the world as phase 1 established — no new Discipline, no conferral.

---

## Non-goals

Each is named because someone could reasonably assume it is in scope.

- **No aggregate/continuous density.** The bed (N discrete `Slottable` plants)
  only. Farming's "plant the whole field as coverage, not objects" density is
  **phase 4's**, and it is what needs the weather integral.
- **No sun→ambient-light driver.** Outdoor light is *authored static data*,
  exactly as phase 1 authored the Duncan Hall front steps and flagged it as a
  placeholder. Deriving room light from `CelestialApi` is phase 4's and is
  named there as genuinely net-new.
- **No weather integral, no time-parameterised weather resolve.** Phase 4's.
- **No six-reserve soil.** N/P/K as a set, pH availability, tilth and organic
  matter — with the rotation and amendment lessons they carry — are phase 4's.
  Two reserves prove that soil is *managed*; six prove agronomy.
- **No composition / secondary metabolites.** The harvest carries yield and a
  `Grade`; stress-driven chemistry is the pharma hook and has no consumer until
  the brewing/synthesis layer.
- **No `till`.** The hoe-afforded gate that unlocks planting adds a step that
  teaches nothing phase 1 has not already proven (the watering can is the
  tool-affordance exemplar). Deferred to phase 4 with the rest of the tend loop.
- **No Warren budding.** One keyed field-room. "Level up your farm" by budding
  more rooms is explicitly phase 4's in the roadmap.
- **No house interior, no furnishing, no chattel-title.** The house is scenery
  with a description. Furnishing an owned residence with owned goods **is the
  already-planned apartment build** (`docs/requirements/apartment-requirements.md`
  + its plan, unbuilt); duplicating or pre-empting it here would collide.
- **No residence ladder, no ascent mechanism, no condition gate.** Stewardship
  makes "the condition of what you already hold" the binding gate for moving
  up, and **there is no condition model anywhere** — that is stewardship's own
  build. This lot gates on money and availability only, and does not claim to
  be a rung.
- **No orchards or perennials.** Multi-year commitment and the tenure hook are
  farming's later work.
- **No pests, no irrigation commons, no automation ladder.** Farming's
  maintenance layer; the automation ceiling needs the employment engine and a
  production brain (phase 8).
- **No genetics.** A seed grows its parent's species, full stop — unchanged
  from phase 1.
- **No new Discipline and no conferral.** `horticulture` ships already; this
  build only feeds it. Conferral waits on phase 7's diagnosis surface.
- **No new Api.** Land use rides `ParcelApi`; the harvest rides existing
  facades.
- **No second buildable lot.** The neighbouring lots are surveyed and visibly
  empty — content, not systems.

---

## Surface decisions

### The lot is suburban, not frontier — and the suburb governs itself

Terminus is premised as a dense city with no room to garden, so the ground has
to be somewhere else. It goes in **Hinkley Hills**, and the suburb is its
**own `Locality` beside the city** rather than a district inside it:

```
terminus                  (realm)   gov: terminus-realm
  ├─ city                 (city)    gov: terminus-city
  │    └─ campus                    ← the dorm
  └─ hinkley-hills        (suburb)  gov: hinkley-hills
       └─ lane
            └─ the lot              ← house (scenery) + yard (the bed)
```

**Why beside and not inside.** The suburb exists *because* you can have a yard
there. If the city zoned it, the city — which by premise has no room for
gardens — would be the one permitting them. Real suburbs incorporate precisely
to control their own zoning, so the fiction and the mechanism agree: Hinkley
Hills's land use is **its own act**, not an authored fact about Terminus. It
also plants the **Tiebout** seam the city slates already want (a jurisdiction
is a bundle you can choose), at the cost of one `Locality` seed and a
government key.

Siting the first owned ground in a suburb rather than at the frontier is both
cheaper and a better fit for a player who currently lives in a campus dorm —
the walk from Duncan Hall to a lot on a new street is a shorter story than
homesteading the heath.

### Hinkley Hills is thin, and its emptiness is diegetic

A `Locality` seed, a TPA node (so `teleport hinkley` works and it appears on
departures boards by covering-Locality name), a short lane of two or three
rooms, one titled lot, and **neighbouring lots surveyed and visibly unbuilt**.

The last point is the one that matters: exclusive access is a testing
convenience, and framing the lot as *the first house on a new street* makes
that read as intentional rather than as a missing feature.

### Title is bought at the Terminus Registry

The Registry office, its clerk and the acting Magistrate's seat all ship. A
land sale over that counter reuses the venue, gets the plat-book framing for
free, and keeps the ceremony that should distinguish buying **land** from
buying a torch off a shelf. A real money leg runs through banking's
`postTransaction` chokepoint.

Rejected: a `PricedOffer` on the lot itself (cheapest, but sells land like
stock), and a suburb-local land office (more self-contained, but another room,
NPC and business to author for no new lesson).

### Land use: the closed six, and it refuses

`residential · agricultural · commercial · industrial · civic · wild` — the
closed set from stewardship, on the parcel record, read through `ParcelApi`'s
existing longest-prefix walk. **No new Api.**

It **gates**: placing a bed on ground whose use does not admit cultivation is
refused, and the refusal names the reason. A vocabulary nothing consults is not
an enabler, and phase 2 is the cheapest possible place to prove it — a garden
barely needs the gate, which is exactly why it is a safe first consumer.

Hinkley Hills declares **residential**, which stewardship's table already says
admits *"dwelling, companions, small cultivation"* — so a bed is permitted and a
field is not, without inventing a new use. The answer space the table gives
farming (`none · a bed · a field`) is honoured: this build implements
`none` and `a bed`.

### A bed is the pot at N > 1, and the soil is shared

The bed reuses the pot's surface — a soil volume plus N plant slots, both
authored as template data — and **`Plant` is not modified**. Two consequences
the planner must respect:

- **The soil volume is shared across the bed's slots.** Phase 1's
  `satRoot = clamp(soilVolume / stage demand, floor, 1)` then does new work for
  free: more plants in one bed means less root room each, so **density becomes
  a genuine trade-off** and a crowded bed stalls exactly the way a pot-bound
  plant does. No new rule, no new curve.
- **A bed is a fixture; a pot is portable.** You cannot pick up a garden bed.
  That is a real difference from `PlantPot` (a `Thing`, and therefore
  Containable), so the two are **siblings sharing one surface** — the soil +
  slot + plant-seating logic must not be duplicated, and `Plant`'s
  `rootRoom()` / pot accessor must generalise past `PlantPot` rather than
  special-casing a second class.

### Soil: moisture and nitrogen, on the bed

Two reserves on the bed (`ReservedMixin`, theme `cultivation` — the neutral
axis phase 1 already proved on a plant):

- **moisture** — the bed's own, distinct from the plant's root-zone reserve.
  Watering the bed is watering the ground; the plant still owns its own
  moisture, and the growth model still reads that. (The bed's moisture is what
  a later phase's evapotranspiration and rain will drive.)
- **nitrogen** — the nutrient. **The harvest exports it**; feeding restores it.
  Nitrogen is chosen over the other five because it is the heavy-feeder axis,
  and because it is the one that makes crop rotation and legumes *emergent*
  when phase 4 adds them.

Depleted nitrogen limits growth through the same minimum-of-satisfactions
expression, so it needs no new mechanism — it becomes a fourth input to a
formula built for exactly this.

### The harvest mints matter with a quality band

`harvest` mints a real item, stamped with a maker's mark (grew here, by this
hand) and a **`Grade` band** computed **weakest-link over the growth window** —
so a sustained bad stretch caps the grade and **farming rewards your worst
moment, not your average**. The item is edible, so it feeds the shipped
metabolism loop directly, and gradeable, so it feeds crafting.

One crop species ships: an edible staple, distinct from phase 1's two
ornamentals (which set seed but no food). Harvesting **ends** that plant.

### Owned ground uses a keyed holder that is not dorm code

`DormWarren` is currently the **only** keyed room holder in the tree, and it
lives in `domain/eternal/duncan-hall/` — it is content, not substrate. Phase 1
paid for the *movable* half of persistence (a plant is its own keyed host
carrying its own location, via the `{ref, key}` nested-host unlock). **Ground
is the other pattern**: a room, keyed by its parcel, whose establishing context
drives seed-vs-restore over `(scope, key)`.

This build gives that pattern a **reusable home**, because phase 4's
field-rooms and phase 5's paddocks are the same shape and must not each
re-derive it from dorm code.

### Outdoor light is authored, and says so

A static ambient value on the yard and the lane, following phase 1's front-steps
precedent — including its comment that the value is a **placeholder awaiting
the sun driver**. Pulling phase 4's `CelestialApi` derivation forward is the
single easiest way to blow this build's scope, and the light axis is already
exercisable without it.

---

## Constraints

- **The title security invariant.** Ownership is declared **only** in the gated
  `parcels` channel, never on an editable `domain` template — a content edit
  must never be able to forge a title. New parcels ride
  `config/parcels.yaml` / `ParcelApi.subdivide` + `transfer`, never a zone
  seed's `data`.
- **No new Api.** Land use is a field on the parcel record plus reads on the
  existing `ParcelApi`; the harvest and the sale ride shipped facades. A new
  `LandUseApi` / `FarmApi` / `GardenApi` is out.
- **A farm is ONE parcel.** Property rules it and stewardship honours it: beds
  are **slots, not sub-parcels**. Scale is capacity within a parcel, never
  accumulated parcels.
- **⚠ The bed's plants must live in its contents *and* its slots.** The
  `Slotted` capture slice records occupants by **index into the container
  slice**; a slot-only occupant resolves to −1 and is **silently dropped on
  restore**. Phase 1 hit this; see
  [husbandry.md](../subsystems/husbandry.md).
- **⚠ A sizing-shaped `fitsSlot` must not veto a restore.** Newly documented in
  [slot.md](../subsystems/slot.md) after phase 1 made a root-bound plant
  briefly unrestorable. Any bed-side capacity gate inherits the rule: a
  candidate already in the host's contents always fits.
- **Mutating acts capture their host.** Capture is event-driven, not periodic
  and not at shutdown. `PersistableApi.captureHostOf` after buying, planting,
  watering, feeding and harvesting.
- **Reconcile-on-read, and no far-past guard.** The family clock rule stands
  unchanged: owned things integrate the full absence, bounded by a step cap and
  never a time cap.
- **Every rate and threshold is an `AppSetting` dial** with a seeded literal
  fallback, per phase 1's `husbandry.*` block.
- **Banding is presentation, never security.** Nothing gates on a `Grade` or a
  condition band.
- **`NamedMixin` is proper names only.** The bed, the crop and the lot are
  `Visible.shortDescription`; the suburb's *name* is a `Locality` field.
- **Module categories are closed.** A new mixin needs a `lib/<subsystem>/`
  home; no `lib/mixins/`, no free-floating helper modules, no new
  `eslint-disable no-restricted-syntax`.
- **Controllers return `void`;** outcome rides `ctx.note` + the envelope.
- **Green before the MR:** `pnpm build`, `pnpm test`, `pnpm lint`,
  `lint:gates`, `lint:module-scope`, `lint:world-scan`,
  `lint:thin-forwarder`.

---

## Acceptance criteria

**The suburb**

1. A `Locality` named **Hinkley Hills** exists at `terminus/hinkley-hills` —
   beside `terminus/city` under the realm — with its own government key, and
   the address trie resolves lot and lane addresses to it.
2. `teleport hinkley` reaches it, and it appears on a departures board named by
   its covering Locality.
3. The lane reads as a place: the arrival, a street, the lot, and neighbouring
   lots described as surveyed and unbuilt.

**Title**

4. A player with sufficient funds buys the lot at the Registry; money moves
   through banking, and `ParcelApi.ownerOf` reports them afterwards.
5. A player without sufficient funds is refused, and nothing changes hands.
6. The purchase appears in the parcel chain-of-title, and ownership survives a
   restart.
7. Title is never readable or writable from an editable `domain` template.

**Land use**

8. The six-entry vocabulary is closed and validated; an unknown use is refused
   at authoring time.
9. Land use resolves through the longest-prefix walk — a lot with no explicit
   use inherits its covering Locality's.
10. **Placing a bed where the use forbids cultivation is refused, and the
    message names the reason.** Placing one on Hinkley Hills's residential
    ground succeeds.
11. Hinkley Hills's residential use admits a bed and **refuses a field**.

**The bed and the growing**

12. A bed holds several plants at once, each a `Plant` — the phase-1 class,
    unmodified.
13. **The shared soil makes density a trade-off:** the same species in a
    crowded bed is root-limited where it would not be in a sparse one, and the
    cause line says so.
14. A bed's plants survive a reap/restore with their own state, their slot
    occupancy and the bed's soil intact.
15. Watering the bed raises the bed's moisture; the plant's own root-zone
    moisture still governs its growth.
16. Nitrogen limits growth when depleted, through the same
    minimum-of-satisfactions expression — no separate code path.

**The harvest**

17. `harvest` on a mature plant mints an item stamped with the grower and a
    `Grade` band, and ends the plant.
18. **The grade is weakest-link over the window:** a plant with one sustained
    bad stretch grades below one kept well throughout, even where they finish in
    the same condition.
19. Harvesting **exports nitrogen** from the bed; feeding restores it, and an
    unfed bed yields worse over successive harvests.
20. The harvested item is edible through the shipped metabolism path and
    gradeable through the shipped crafting path — no new consumer.

**Persistence**

21. The lot's field-room is a **keyed holder over `(scope, key)`**, seeding on
    first provision and restoring thereafter.
22. That holder lives in **reusable code, not dorm content**, and the doc names
    it as what phase 4's field-rooms and phase 5's paddocks will use.
23. Buying, planting, watering, feeding and harvesting each capture their host,
    so none is lost to a restart.

**Advancement**

24. The new acts feed the existing `horticulture` Discipline with
    world-graded difficulty; **no new Discipline row and no conferral.**

**Code shape**

25. All gates green: `build`, `test`, `lint`, `lint:gates`,
    `lint:module-scope`, `lint:world-scan`, `lint:thin-forwarder`.
26. No new `*Api` class, no new exported helper functions, no new
    `eslint-disable no-restricted-syntax`.
27. Every new rate/threshold is an `AppSetting` key with a seeded literal.
28. `Plant`, `GrowingMixin` and the condition/cause surface are **reused, not
    forked** — any change to them is additive and justified in the plan.

**Documentation**

29. A subsystem doc owns the new ground: land use, the keyed-holder ground
    pattern, the bed-vs-pot relationship, the harvest, and the suburb's
    place in the address tree.
30. [husbandry.md](../subsystems/husbandry.md) is updated where phase 2 changed
    its truth (the bed as N > 1, shared soil, the harvest ending a plant).
31. [parcel.md](../subsystems/parcel.md) documents land use;
    [address.md](../subsystems/address.md) documents the suburb tier.
32. The roadmap's phase 2 is struck, and any claim this build proved wrong is
    corrected in place — the phase-1 precedent.
33. `CLAUDE.md`'s documentation map gains a one-line pointer if a new
    subsystem doc lands.

---

## Cross-references

**Seeding slates**

- [farming-slate](../slates/builds/farming-slate.md) — § The land model
  (the N-slot bed, the two densities), § The harvest (three outputs),
  § Soil (six reserves), § Buildable-now
- [stewardship-slate](../slates/builds/stewardship-slate.md) — § Land use
  (the closed six, capability + ceiling), § The residence ladder (the rung this
  build deliberately does not satisfy)
- [property-slate](../slates/builds/property-slate.md) — title, transfer,
  "a farm is ONE parcel", beds-are-slots

**Subsystem docs the build touches**

- [husbandry.md](../subsystems/husbandry.md) — the growth model, reused whole
- [parcel.md](../subsystems/parcel.md) · [access.md](../subsystems/access.md) —
  title, the longest-prefix walk, the security invariant
- [address.md](../subsystems/address.md) · [civics.md](../subsystems/civics.md) —
  the Locality tier and self-declared jurisdiction
- [persistence.md](../subsystems/persistence.md) — the keyed-holder pattern;
  `captureHostOf`
- [residence.md](../subsystems/residence.md) — `DormWarren.admit`, the pattern
  being generalised
- [slot.md](../subsystems/slot.md) — `SlotSpec`, `fitsSlot`, and the
  restore rule
- [banking.md](../subsystems/banking.md) · [retail.md](../subsystems/retail.md) —
  the money leg
- [crafting.md](../subsystems/crafting.md) · [metabolism.md](../subsystems/metabolism.md) —
  what the harvest feeds
- [light.md](../subsystems/light.md) — authored ambient, pending the sun driver
- [fasttravel.md](../subsystems/fasttravel.md) — the TPA node
- [advancement.md](../subsystems/advancement.md) — `horticulture`

**Related requirements in flight**

- [apartment-requirements.md](./apartment-requirements.md) — **unbuilt.** The
  ladder rung below, and the owner of furnishing + chattel-title. This build
  deliberately leaves the house's interior alone so the two do not collide.

**Sequence**

- [living-world-roadmap.md](../living-world-roadmap.md) — phase 2 of nine;
  phase 4 (the field) inherits the aggregate density, the sun driver, the
  weather integral and the remaining four soil reserves.
