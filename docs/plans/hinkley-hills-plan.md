# Hinkley Hills — implementation plan

Executes
[hinkley-hills-requirements.md](../requirements/hinkley-hills-requirements.md)
— phase 2 of [living-world-roadmap.md](../living-world-roadmap.md). Read the
requirements first; this plan does not restate the scope or re-argue the
decisions, it says where the code goes.

**Shape of the build:** one new field on an existing record, **one new Api
static** (an orchestration, on an existing facade), one extracted mixin, two
new concrete classes, three new verbs, one new `Locality` + government, and
content. The growth model itself is **not modified except additively**.

> **The through-line to hold onto.** Every generalization in this build must
> reduce to phase 1's behaviour at N = 1. A pot is a bed with one slot; a bed
> with one plant gives that plant all the soil. If a change makes the shipped
> houseplant behave differently, the generalization is wrong — and the phase-1
> tests are the tripwire.

---

## Grounding — facts established by reading the code

Do not re-derive these. Each was checked in the tree at plan time.

### Parcels — richer than expected

- **`ParcelRecord.persistentFields`** is
  `['extent','zonePath','owner','parentParcel','grants','allowance','keyway']`.
  `allowance` is already an **inert declared seam** for a future economy — so a
  new `landUse` field is the same move, with precedent.
- **`ParcelApi` already ships** `ownerOf` · `coveringParcelOf` · `subdivide` ·
  `transfer` · `grantUse` / `revokeUse` / `hasUseGrant` · `heldUnitOf` ·
  `childParcelsOf` · `setKeyway` · `rebuildCoverageIndex`. **Title machinery is
  done** — the missing piece is a player-facing *act*, not a mechanism.
- `ParcelRegistry.subdivide(childPath, parentExtent, owner)` writes the row,
  appends a `subdivide` chain-of-title event, and reindexes the coverage trie.
  `transfer` is its sibling. **Both already do what the purchase needs.**
- **⚠ The governing security invariant:** ownership is declared **only** in the
  gated `parcels` collection (seeded from `config/parcels.yaml` by the backend
  `ParcelSeeder`), **never** on an editable `domain` template. A content edit
  must not be able to forge a title. `config/parcels.yaml` currently holds ~10
  infrastructure extents; the header states the rule explicitly.

### The address / locality tier

- A `Locality` is a **leaf `Idea` seed under `seeds/lib/address/`** (not
  `domain/`) — `AddressRegistry.postRegister` **eagerly clones every Locality
  template** so its prefix is in the trie at boot. A `domain/`-homed seed would
  never register and departures boards would fall back to a generic label.
- The shipped chain is `terminus` (realm, `_governmentKey: terminus-realm`) →
  `terminus/city` (city, `terminus-city`) → `terminus/city/campus`. Fields are
  `name`, `_address`, `_governmentKey` — and **`_governmentKey` is optional**
  (`last-counted-mile` ships without one).
- Governments are separate seeds under **`seeds/lib/civics/Government/`**
  (`terminus-city.yaml` is the exemplar): `key`, `displayName`, `description`,
  `charter`, `treasury` (a Business account path), `departments` (Business
  templatePaths), `seats`.

### The keyed-holder ground pattern

- **`DormWarren.admit(unitKey)` is the only keyed room holder in the tree**, and
  it is dorm *content* (`domain/eternal/duncan-hall/`). Its reusable core is
  six lines:

  ```ts
  const room = await this.createMemberSerialized();   // Warren-specific
  (room as unknown as Persistable).setPersistenceKey(unitKey);
  if (await PersistableApi.hasRecord(DormRoom.SCOPE, unitKey)) {
    await PersistableApi.materialize(room, unitKey);
  } else {
    await (room as unknown as Persistable).seedBornWith();
    await PersistableApi.capture(room, unitKey);
  }
  ```

  Everything else in `admit` (Warren membership, hub-exit wiring, the floor
  tier) is dorm-specific. **There is no `restoreOrSeed` anywhere** — this
  decision is duplicated nowhere yet, which is exactly why it should get a home
  before phase 4 needs a second copy.
- The cast to `Persistable` is present because `MemberStuff` isn't narrowed;
  a general helper should narrow with `MixinApi.isPersistable` instead.

### The growth model — what phase 1 left ready

- `GrowingMixin` combines satisfactions with **`Math.min`** over
  `satWater`/`satLight`/`satRoot`. A fourth input is one argument to that call
  and one private curve — **no restructuring**.
- **`rootRoom(): number | null` is already the host seam**, defaulting to
  `null` (= "not a root constraint", `satRoot = 1`). A second seam for nutrient
  follows the identical shape, and a `null` return keeps every shipped pot
  byte-identical.
- `Plant.getPot()` returns `PlantPot | null` by narrowing `getOccupiedHost()`.
  `Plant.rootRoom()` is `getPot()?.getSoilVolume() ?? null`.
- **`PlantPot` is `PopulatesMixin(SlottedMixin(BulkableMixin(ContainerMixin(
  DetailedMixin(Thing)))))`** — soil is its bulk interior, the plant slot is
  authored `staticSlots` data, and `applyPopulates` claims the slot after
  populating (`adoptArrivals`). Capacity and soil volume are **already pure
  template data**, so N > 1 needs no new field.
- **`PlantPot` is a `Thing`, therefore `Containable` — it can be picked up.** A
  garden bed cannot. That is the one real structural difference between them.
- Phase 1's own ⚠ list, all still live: a slotted plant must be in the host's
  **contents AND its slot** (the capture slice indexes into the container
  slice); a sizing-shaped `fitsSlot` **must not veto a restore**; mutating acts
  call `PersistableApi.captureHostOf`; there is **no far-past guard**.
- `Plant.careDifficulty()` / `transplantDifficulty()` grade `horticulture` deeds
  off world state. New acts follow that pattern.

### Quality, matter and the crop

- **`CraftedMixin` already carries the maker's mark + a `Grade`** — maker
  templatePath (Pattern A), the band, the recipe, and a prose verdict, with
  "the maker value is never a parameter; it derives from the execution
  context." **The harvest reuses this wholesale** rather than inventing a stamp.
- `GRADE_BANDS` = `poor · fair · fine · exceptional · masterful`;
  `Grade.isBand` validates.
- **`/lib/material/food/root-vegetable` already ships** — `edibility: true`,
  `nutrients: [carb]`, `tags: [food, vegetable, raw]`. **The staple crop needs
  no new Material.**
- The Registry is real content: a counter room with ledger shelves and *"leases
  and titles"* in its prose, plus **Odile**, registrar *and* acting Magistrate,
  already sitting both Registry positions.

### Verb-surface constraints

- **⚠ `docs/antipatterns.md § Working verbs conferred by a venue or commerce
  object`**: a commerce/offer object affords only its **commerce** verbs; the
  *working* verbs ride the instrument. So the land sale must **not** be a
  bespoke verb hung off the Registry counter.
- `buy` is the shipped retail verb over `Stock` + `PricedOffer`, and
  `BuyController` **hands over an item and chattel-stamps it**. Land is real
  property, not chattel (`chattel.md` is movables; `parcel.md` is title) — so
  `buy` is the wrong path for a lot.
- The **dispatch-verb-with-subcommands** shape ships: `government` (`list`,
  `residency`), `office`, `bank`. That is the house pattern for a feature's
  surface.
- `SkyExposedMixin` (`lib/biome/`) is what makes a room outdoor.
- A TPA node is one seed: `class: /domain/common/tpa/TpaTerminal` with
  `seatIn`, `keywords`, `directionality`, `status`.

---

## Decisions the requirements left to implementation

**A. Land use is a value vocabulary in `lib/parcel/`, a field on the record,
and one read on the existing facade.**

- `lib/parcel/LandUse.ts` — `LAND_USES` (closed, `as const`), the `LandUse`
  type, and a `LandUses` holder class with `isLandUse` / `admitsCultivation`
  (the named-value-object category; **not** a free-floating predicate).
- `ParcelRecord.landUse: LandUse | null` added to `persistentFields`
  (the `allowance` precedent). `null` = inherit.
- `ParcelApi.landUseOf(path): Promise<LandUse>` — **longest-prefix through the
  existing coverage trie**, walking `parentParcel` upward until a non-null
  `landUse` is found; unclaimed ground answers `wild`. No new Api.

**B. `PersistableApi.restoreOrSeed(host, key)` — the one new static.**

The six-line D1 decision, on an existing facade, in `PersistableLogic`:
`setPersistenceKey(key)` → `hasRecord ? materialize : seedBornWith + capture`.
It narrows with `MixinApi.isPersistable` rather than casting.

**`DormWarren.admit` refactors onto it in the same wave.** That is not
tidying — it is the *proof* the generalization is real, and it converts a
would-be second copy into a first reuse. The dorm's Warren membership and exit
wiring stay dorm-side.

**C. The pot and the bed share one mixin; the bed is a fixture.**

Extract `lib/husbandry/Cultivable.ts` — `CultivableMixin`, holding everything
phase 1 put on `PlantPot`: the soil read (`getSoilVolume` / `hasSoil`), the
plant-slot vocabulary, the populate-then-adopt applier, and the
carrier-forwarding `onMoved`. Then:

- `PlantPot` = `CultivableMixin(…Thing)` — portable, unchanged externally.
- `GardenBed` = `CultivableMixin(…)` over a **fixture** base — not
  `Containable`, so it cannot be carried.

**Do not duplicate the soil/slot logic.** `Plant.getPot()` becomes
`Plant.getBed()` returning the `Cultivable` interface (a mechanical rename
across two controllers and the tests; husbandry.md updated) — honest, because
*a pot is a bed with one slot*.

**D. Shared soil: root room is soil ÷ *occupied* slots.**

```
rootRoom() = bed.getSoilVolume() / max(1, bed.occupiedSlotCount())
```

**At N = 1 this is exactly today's expression**, so every shipped pot and every
phase-1 test is unaffected — which is how we know the generalization is right.
Dividing by *occupied* rather than *capacity* is deliberate: an under-planted
bed genuinely gives each plant more, so thinning is a real choice and crowding
is a real cost. The existing floored `satRoot` curve then does all the work —
a crowded bed stalls exactly as a pot-bound plant does, with the same cause
line.

**E. Nitrogen is the fourth satisfaction, through a second host seam.**

`nutrientLevel(): number | null` on `GrowingMixin`, defaulting `null`
(→ `satNutrient = 1`). `GardenBed` overrides it from its own `nitrogen`
`Reserve`; `PlantPot` does not, so **pots are unchanged**. `min(...)` gains a
fourth argument, `getLimitingFactor()` a fourth answer (`'nutrient'`) and one
cause line (*"The soil is spent."*).

**F. The bed's own moisture is distinct from the plant's, and does not drive
growth yet.** The bed carries a `moisture` `Reserve` that `water <bed>` fills;
the plant still reads **its own** root-zone moisture for `satWater`. The bed's
moisture is the seam phase 4's rain and evapotranspiration will drive — wiring
bed→plant moisture transfer now would pre-empt that model. Watering a bed
**also** waters its plants (the ergonomic act), so nothing feels inert.

**G. `feed <bed> [with <source>]` is `water`'s twin.** `WaterController` is the
line-for-line template: resolve target → resolve a carried bulk source →
explicit measure sized to headroom → transfer to the `null` sink → credit the
reserve → `captureHostOf` → deed. Compost is a bulk `Material` (new; the
potting-soil shape) in a sack (the soil-sack shape).

**H. `harvest <plant>` mints the crop, ends the plant, and exports nitrogen.**

- `Plant.harvestTemplatePath` — the item minted, mirroring phase 1's
  `seedTemplatePath` (the same instantiate-don't-resolve Pattern A variant).
- The minted item composes `CraftedMixin`; the maker derives from the execution
  context, **never a parameter**.
- The plant is destructed; the bed debits `nitrogen` by the crop's authored
  `nutrientDraw`.
- Refuses an immature plant, naming the stage.

**I. The Grade is weakest-link, which needs one new tracked field.**

`_worstLimiting: number` on `GrowingMixin` — a **monotone minimum** of the
limiting satisfaction, updated every reconcile sub-step, seeded at 1 on first
touch. `harvest` maps it to a `GradeBand` through dials. This is what makes
*"farming rewards your worst moment, not your average"* true, and it cannot be
derived after the fact from smoothed `_vigor` — a plant nursed back looks fine
and must still grade badly.

**J. The sale is `title`, a new dispatch verb with subcommands.**

Not `buy` (wrong path — hands over an item and chattel-stamps it; land is real
property) and not a verb conferred by the counter (the venue antipattern).
`title` is the diegetic word and the feature's one verb:

| subcommand | does |
|---|---|
| `title` (bare) | what ground do I hold, and what may I do on it (its land use) |
| `title list` | the lots on offer here — requires standing in the Registry |
| `title buy <lot>` | the purchase: funds check → money leg → `subdivide` + `transfer` → set `landUse` |

Category: **`civics`** — this is the government's records counter, alongside
`government`. Validators gate on being at the Registry for `list`/`buy`.

**K. The lot's yard is a keyed room behind a small content holder.**

`domain/terminus/hinkley-hills/LotHolder.ts` — clone the yard shell, then
`PersistableApi.restoreOrSeed(yard, parcelExtent)`. Keyed by the **parcel
extent**, so title and durable state share one identity. No Warren, no floors,
no budding.

**L. Content is templates over shared classes, and the emptiness is authored.**
One `Locality`, one `Government`, one TPA node, a lane of three rooms
(arrival · street · the lot), the house as a `Detailed` fixture with prose
only, the yard as an outdoor room holding the bed, and the neighbouring lots as
**described scenery** (surveyed, staked, unbuilt).

---

## Wave 1 — land use, the enabler

No content, no consumer yet. The vocabulary, the field, the read, the tests.

### Files

- **`lib/parcel/LandUse.ts`** (new) — `LAND_USES`
  (`residential · agricultural · commercial · industrial · civic · wild`),
  the `LandUse` type, and the `LandUses` holder: `isLandUse`,
  `admitsCultivation(use): 'none' | 'bed' | 'field'` (stewardship's answer
  space, verbatim).
- **`lib/parcel/ParcelRecord.ts`** — `landUse: LandUse | null = null`, added to
  `persistentFields`. Validate on the setter path; an unknown string throws
  with the offending value.
- **`obj/ParcelRegistry.ts`** — `landUseOf(path)`: resolve the covering parcel,
  then walk `parentParcel` upward for the first non-null `landUse`; `wild` when
  nothing claims it. Gated `FromModule('/api/parcel#ParcelApi')` like its
  siblings.
- **`api/parcel.ts`** — the forwarding static + the re-export of `LandUse`.
- **`config/parcels.yaml`** — a `landUse` on the existing infrastructure rows
  where it is obvious (`civic` for the registry/terminal, `commercial` for the
  store). Seeding is insert-iff-absent, so this is additive.

### Tests — `lib/parcel/__tests__/LandUse.test.ts` + registry tests

- the vocabulary is closed; an unknown use is refused with its value named
- **longest-prefix inheritance**: a child with `null` answers its parent's use;
  an explicit child overrides
- unclaimed ground answers `wild`
- `admitsCultivation` maps the six to `none`/`bed`/`field` per stewardship
- a record written before this change (no `landUse`) loads and answers by
  inheritance — **backward compatibility, there is live parcel data**

---

## Wave 2 — the keyed-holder ground pattern

Independent of Hinkley. Do it before the content that needs it.

### Files

- **`api/persistable.ts` + `obj/api/PersistableLogic.ts`** —
  `restoreOrSeed(host, key)`. Narrow with `MixinApi.isPersistable`; a
  non-persistable host is a clear throw (a programming error, not a user path).
- **`domain/eternal/duncan-hall/DormWarren.ts`** — `admit` refactors onto it.
  The Warren membership, key stashing and exit wiring stay; the
  restore-or-seed decision goes.

### Tests

- `restoreOrSeed` **seeds then captures** on the no-record branch, and
  **materializes** on the has-record branch — asserted through the record store
- born-with `populates:` run exactly **once** across two calls
- ⭐ **the dorm suite still passes unchanged** — that is the reuse proof, and it
  is why the refactor belongs in this wave rather than a later tidy

---

## Wave 3 — the bed: one surface, two hosts

### Files

- **`lib/husbandry/Cultivable.ts`** (new) — `CultivableMixin` +
  `interface Cultivable`, holding what phase 1 put on `PlantPot`: the soil
  read, `PLANT_SLOT`, `getPlant()`, `occupiedSlotCount()`, the
  populate-then-adopt applier, the carrier `onMoved` forward.
- **`obj/PlantPot.ts`** — reduced to `CultivableMixin(…)` over `Thing`. Its
  external surface must not change.
- **`obj/GardenBed.ts`** (new) — `CultivableMixin(…)` over a **fixture** base
  (not `Containable`). N slots and soil volume authored as data.
- **`lib/husbandry/Growing.ts`** — `rootRoom()` divides by occupied slots
  (Decision D). `Plant.getPot()` → `getBed()`.
- **`obj/Plant.ts`** — `getBed()` returns `Cultivable`; `fitsSlot` and
  `onFloweringLatched` speak the interface, not `PlantPot`.
- **`lib/mixin.ts` / `api/mixin.ts`** — `Cultivable` + `isCultivable`.

### Tests

- ⭐ **at N = 1 nothing changed** — the whole phase-1 `Plant.test.ts` and
  `DormHouseplant.test.ts` pass untouched. If they don't, D is wrong.
- ⭐ **shared soil makes density a trade-off**: the same species root-limits in
  a bed of four and does not in a bed of one, on identical soil, and the cause
  line says `'root'`
- removing a plant gives the survivors more room on the next read
- a bed **cannot be picked up**; a pot can
- a bed's plants are in its **contents and its slots**, index-aligned
  (the −1 trap, asserted directly)
- `fitsSlot` still refuses an oversized plant into a small bed, and still
  **permits a re-seat of a plant already in the contents** (the restore rule)

---

## Wave 4 — soil: moisture, nitrogen, and the fourth factor

### Files

- **`obj/GardenBed.ts`** — authored `reserves` (`moisture`, `nitrogen`, theme
  `cultivation`); `nutrientLevel()` returns the nitrogen fraction.
- **`lib/husbandry/Growing.ts`** — the `nutrientLevel()` seam (default `null`),
  `satNutrient`, the fourth argument to `min`, `'nutrient'` on
  `LimitingFactor`, one cause line, and `_worstLimiting` (Decision I).
- **`lib/config/AppSettings.ts` + `config/app-settings.yaml`** — the new
  `husbandry.*` dials (nutrient happy/spent thresholds, the grade ladder).
- **`cmd/bulk/feed.yaml` + `obj/command/bulk/FeedController.ts`** — `water`'s
  twin.
- **Compost material** + a compost sack seed (the potting-soil / soil-sack
  shapes).
- **`lib/craft/ToolCapability.ts`** — nothing. `feed` is not tool-afforded; you
  feed by hand from a sack, as you pour soil by hand.

### Tests

- a depleted bed limits growth and names `'nutrient'`; feeding clears it
- **a pot is unaffected** — `nutrientLevel()` null → `satNutrient` 1
- `feed` credits only the headroom; feeding a full bed says so and spends
  nothing
- `_worstLimiting` is **monotone**: a plant stressed then nursed back retains
  its worst reading

---

## Wave 5 — the harvest

### Files

- **`obj/Plant.ts`** — `harvestTemplatePath`, `nutrientDraw`, and
  `isHarvestable()` (mature and alive).
- **`cmd/inventory/harvest.yaml` + `obj/command/inventory/HarvestController.ts`**
  — mint via `StuffApi.clone`, stamp `CraftedMixin` (maker from the execution
  context), place in the actor's inventory, destruct the plant, debit the bed's
  nitrogen, `captureHostOf(bed)`, credit `horticulture` graded off
  `_worstLimiting`.
- **`obj/Crop.ts`** (new, or `GradedMixin(CraftedMixin(Thing))` if no behaviour
  is needed) — the harvested item.
- **Content:** one crop species row (`plantae`, an edible staple), its
  `/obj/plant/<crop>` template with a `profile` + `harvestTemplatePath`, its
  `/obj/crop/<crop>` item over `/lib/material/food/root-vegetable`, and its
  seed.

### Tests

- `harvest` mints the named crop, ends the plant, and the crop carries a maker
  and a band
- ⭐ **the grade is weakest-link**: two plants finishing in identical condition
  grade differently when one had a sustained bad stretch
- harvesting an immature plant is refused, naming the stage
- **nitrogen is exported**, and an unfed bed yields worse across three
  successive harvests
- the crop is **edible through the shipped metabolism path** and gradeable
  through crafting — no new consumer

---

## Wave 6 — Hinkley Hills

### Files

- **`seeds/lib/address/hinkley-hills.yaml`** — the `Locality`
  (`_address: terminus/hinkley-hills`, `_governmentKey: hinkley-hills`).
  **Under `seeds/lib/address/`**, or `AddressRegistry` never warms it.
- **`seeds/lib/civics/Government/hinkley-hills.yaml`** — the suburb's
  government. Thin by intent: no departments it doesn't have.
- **`seeds/domain/terminus/hinkley-hills/`** — the zone, a TPA node, the lane
  (arrival · street · lot), the house (prose fixture), the yard (outdoor,
  `SkyExposed`, authored ambient), and the bed.
- **`domain/terminus/hinkley-hills/LotHolder.ts`** — Decision K.
- **`config/parcels.yaml`** — the suburb extent, `landUse: residential`, owned
  by the suburb's group; the lot is **not** pre-seeded (the sale mints it).
- **The bed's placement gate** — placing a bed reads
  `ParcelApi.landUseOf` and refuses where cultivation isn't admitted, naming
  the reason.

### Tests — `domain/terminus/hinkley-hills/__tests__/`

- the Locality resolves; `teleport hinkley` arrives; the lane connects
- the yard is outdoor and lit enough to grow in
- ⭐ **the land-use gate bites**: a bed is refused on `civic` ground (the
  Registry) with a named reason, and accepted on the suburb's `residential`
- the yard's state survives a reap/restore through the keyed holder

---

## Wave 7 — title

### Files

- **`cmd/civics/title.yaml` + `obj/command/civics/TitleController.ts`** —
  Decision J's three subcommands.
- The purchase: funds check → banking leg → `ParcelApi.subdivide` +
  `transfer` → `landUse` stamp → the holder stands the yard up.

### Tests — `obj/command/civics/__tests__/TitleVerb.test.ts`

- a funded player buys the lot; `ownerOf` reports them; the chain-of-title
  records it
- an unfunded player is refused and **nothing changes hands** (no parcel row,
  no money moved)
- buying away from the Registry is refused
- the same lot cannot be sold twice
- `title` bare reports what you hold and its land use

---

## Wave 8 — the acceptance walk

No new production files. The end-to-end proof, through real verbs only.

- ⭐ **buy the lot → walk to the yard → pour soil → plant three → water and
  feed to maturity → harvest three → the bed is spent → feed it → the next
  crop grades better.** If this reads awkwardly, the verb surface is wrong.
- title, the bed, its soil and its plants all survive a restart together
- ⭐ **phase 1 is untouched**: the dorm houseplant walk passes unchanged

---

## Wave 9 — documentation

- **`docs/subsystems/smallholding.md`** (or fold into `husbandry.md` — decide
  when writing; a separate doc is likely, since land use and the keyed-holder
  pattern are not growth-model concerns). Must cover: the land-use vocabulary
  and its longest-prefix read · the keyed-holder ground pattern and that phase
  4/5 inherit it · the pot↔bed relationship and the N = 1 reduction · shared
  soil as the density trade-off · the weakest-link grade · Hinkley Hills's
  place in the address tree and **why it governs itself**.
- **`husbandry.md`** — the bed as N > 1, shared soil, the fourth factor,
  the harvest ending a plant.
- **`parcel.md`** — land use. **`address.md`** — the suburb tier.
- **`persistence.md`** — `restoreOrSeed`. **`residence.md`** — the dorm now
  uses it.
- **`architecture.md`** — `CultivableMixin`, `GardenBed`, `Crop`.
- **`living-world-roadmap.md`** — strike phase 2; correct anything it got wrong
  (the phase-1 precedent).
- **`CLAUDE.md`** — a one-line map entry if a new subsystem doc lands.

---

## Deferred seams — attach points, not stubs

- **The bed's `moisture` is phase 4's rain input** (Decision F). Do not wire
  weather to it here.
- **`_worstLimiting` is the quality substrate.** Phase 4's per-stage
  sensitivities (drought at flowering costs *count*; at filling costs *size*)
  refine it; do not generalize now.
- **`landUse` answers `field`** but nothing implements a field. Phase 4.
- **The allowance cascade** stays inert — `ParcelRecord.allowance` is
  untouched.
- **No ascent gate.** The condition model stewardship wants does not exist.
- **The house interior is the apartment build's.** Do not add rooms inside it.

---

## Standing rules that bite in this build

- **Title only in the gated `parcels` channel** — never on a `domain` template.
  The single most important invariant here.
- **No new Api.** `landUseOf` and `restoreOrSeed` are statics on **existing**
  facades; the `XApi`↔`XLogic` split is mandatory for both.
- **A commerce object affords only commerce verbs** — the sale is `title`, not
  a counter-conferred verb.
- **`PersistableMixin` composes outermost.** **A slotted plant lives in
  contents AND slots.** **A sizing `fitsSlot` must not veto a restore.**
  **Mutating acts `captureHostOf`.** **No far-past guard.**
- **Every rate and threshold is an `AppSetting` dial** with a seeded literal.
- **Banding is presentation** — nothing gates on a `Grade`.
- **`NamedMixin` is proper names only** — the bed and crop are
  `shortDescription`; "Hinkley Hills" is a `Locality.name`.
- **Never run `prettier --write`** — quote style is mixed by area; match the
  file.
- Green before the MR: `build`, `test`, `lint`, `lint:gates`,
  `lint:module-scope`, `lint:world-scan`, `lint:thin-forwarder`.

---

## Critical files

**Read before starting**

| File | Why |
|---|---|
| `docs/subsystems/husbandry.md` | the growth model being extended, and its ⚠ list |
| `lib/husbandry/Growing.ts` | `min(...)`, the `rootRoom` seam, the augmenter |
| `obj/PlantPot.ts` + `obj/Plant.ts` | the surface being generalized |
| `lib/parcel/ParcelRecord.ts` + `obj/ParcelRegistry.ts` | the field's home; the coverage trie |
| `config/parcels.yaml` | the gated title channel + its header's invariant |
| `domain/eternal/duncan-hall/DormWarren.ts` | `admit` — the pattern being extracted |
| `seeds/lib/address/terminus-city.yaml` | the `Locality` seed shape |
| `seeds/lib/civics/Government/terminus-city.yaml` | the government seed shape |
| `lib/craft/Crafted.ts` + `lib/craft/Grade.ts` | the maker's mark + bands, reused whole |
| `obj/command/bulk/WaterController.ts` | `feed`'s direct ancestor |
| `docs/antipatterns.md § Working verbs conferred by a venue` | why the sale is `title` |
| `seeds/domain/terminus/registry/office.yaml` | the sale's venue |

**Created**

`lib/parcel/LandUse.ts` · `lib/husbandry/Cultivable.ts` · `obj/GardenBed.ts` ·
`obj/Crop.ts` · `domain/terminus/hinkley-hills/LotHolder.ts` ·
`cmd/bulk/feed.yaml` + `FeedController` · `cmd/inventory/harvest.yaml` +
`HarvestController` · `cmd/civics/title.yaml` + `TitleController` ·
`seeds/lib/address/hinkley-hills.yaml` ·
`seeds/lib/civics/Government/hinkley-hills.yaml` · the Hinkley Hills content
tree · the compost material + sack · the crop species/plant/item/seed ·
`docs/subsystems/smallholding.md` · six test files

**Modified**

`lib/parcel/ParcelRecord.ts` · `obj/ParcelRegistry.ts` · `api/parcel.ts` ·
`api/persistable.ts` · `obj/api/PersistableLogic.ts` ·
`domain/eternal/duncan-hall/DormWarren.ts` · `lib/husbandry/Growing.ts` ·
`obj/Plant.ts` · `obj/PlantPot.ts` · `obj/command/bulk/WaterController.ts` +
`obj/command/inventory/RepotController.ts` (the `getBed` rename) ·
`lib/mixin.ts` · `api/mixin.ts` · `lib/config/AppSettings.ts` ·
`config/app-settings.yaml` · `config/parcels.yaml` · `husbandry.md` ·
`parcel.md` · `address.md` · `persistence.md` · `residence.md` ·
`architecture.md` · `living-world-roadmap.md` · `CLAUDE.md`
