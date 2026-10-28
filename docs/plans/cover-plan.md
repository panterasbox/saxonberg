# Arable and grazing (the cover build) — implementation plan

Executes [cover-requirements.md](../requirements/cover-requirements.md)
(AGREED, closed scope). **Kind:** feature. **Lead end:** content — the
first consumers are Waponi Woo's cane pieces, Hearts Delight's farm and
dairy, and the campus farm. Two stages: **A, arable** (a field holds one
crop, sown and harvested by area) and **B, grazing** (a herd stands on a
field and eats it; hay carries it through winter). The kernel change is
narrow and named in § Plan-level decisions: *soil-bearing ground a plant
stands in is its bed*, and `harvest`/`sow` learn to work by area.

Three places this plan **disagrees with or must change the requirements**
are collected in § Risks & opens (R1–R3). They are not re-decided here;
they are the user's call before `/build` starts.

---

## Grounding

Facts verified 2026-10-28 by opening the files. Paths are repo-relative.

### The field and its sward (trade-farming)

- `packages/content/trade-farming/src/location/Field.ts` — `Field =
  PersistableMixin(WarrenMemberMixin(ImprovableMixin(SwardMixin(SoilMixin(
  ReservedMixin(Location))))))` (l.182–194). Authorable fields: `fieldName`,
  `groundSpotX/Y`, `areaM2`, `legumeFraction`; runtime `_ambientK`,
  `_daylightFraction` (l.220–228). `commandContributions.inventory` affords
  `plough` (l.215–218). Its docstring says it holds **no plant slot**
  (l.57–59). `swardGrowthFactor()` = min(moisture/0.35, 0.25+N×1.5,
  warmth 278→291 K, daylength 0.33→0.54) (l.395–430).
  `swardGrazingDemandPerGameDay()` duck-types `grazingDemandPerGameDay()`
  on occupants (l.497–508) — **no class implements it**.
  `onSwardIntegrated(eatenKg, days)` cycles grazed N as organic matter,
  poaches, fixes legume N (l.522–530). `onCreate` installs reserves +
  sward for an authored field (l.823–835). No `markupAugmenters` — ⚠
  **nothing renders the sward band on `look` today**; the farmstead drive
  reads it only through `mow`'s refusal prose.
- `packages/content/trade-farming/src/location/SingletonField.ts` —
  `SingletonMixin(Field)`, three lines.
- `packages/content/trade-farming/src/lib/Sward.ts` — reserve key
  `sward`; `SWARD_CEILING_KG_PER_M2 = 0.3`, residual 0.5, peak growth
  0.008 kg/m²/game-day (l.85–103); bands `bare · grazed-out · short ·
  ready · ahead-of-them` with phrases (l.116–135); `reconcileSward()` is a
  stepped integral, ≤ 365 steps, growth-then-eaten per step, `eaten =
  min(standing, demandPerDay × dt)` (l.330–400); host hooks `swardAreaM2`,
  `swardGrowthFactor`, `swardGrazingDemandPerGameDay`,
  `onSwardIntegrated`; `drawSward(kg)` (l.307–317); affords `mow`
  (l.211–214).
- `packages/content/trade-farming/src/idea/cmd/farming/PloughController.ts`
  — banks `clearing` work at `LABOUR_PER_ACT × draught` (draught = body
  mass / 70 kg, beasts in the room count, l.153–169); refuses
  `already-clear` once clearing is complete (l.95–103); **no title gate**;
  wears the share (l.112–116). `FieldWorkController.fieldOf()` finds the
  field by shape (`getGroundSpot` + `progressOn`) and resolves its ground
  sample (`FieldWorkController.ts` l.60–80).
- `.../MowController.ts` — cuts to the residual, exports N at crude
  protein × 6.25 (l.49–66), mints **one** `/trade/farming/thing/hay` with
  `setMass(taken)` and `baledMoisture` from the soil (l.120–139), drops it
  in the field.
- `.../PlotController.ts` — the title gate is `AccessApi.heldExtents(giver)`
  against `ParcelApi.coveringParcelOf(where).getExtent()` (l.121–145);
  `FIELD_AREA_M2 = 400`; the field row is `/trade/farming/location/field`.
- Views: `packages/content/trade-farming/content/trade/farming/cmd/farming/{plough,mow,plot}.yaml`
  — the instrument is a declared arg with `default: "me:i:[capability.X]"`
  (`lint:instrument-args`).
- `packages/content/trade-farming/src/thing/HayBale.ts` —
  `SelfHeatingMixin(Provision)`; row `thing/hay.yaml` has `mass: 1`
  (mow overwrites it).
- `packages/content/trade-farming/src/behavior/farms.ts` — the producer
  brain: tends `Cultivable` grounds, `pick`, consigns; **no row names it**.
- Pack deps: `trade-ranching/package.json` depends on
  `@saxonberg/content-trade-farming` (l.12); `eternal-university`,
  `waponi-woo` and `hearts-delight` depend on `trade-farming`;
  `trade-sugar` does not (it ships only rows that `trade-farming`'s
  classes never see).

### The kernel growth model

- `packages/server/src/mud/lib/husbandry/Growing.ts` — stages
  `seedling → young → established → mature`; five satisfactions, Liebig
  minimum; `_worstLimiting` monotone (l.881); polycarp = `fruitSetCount >
  0 && fruitFillDays > 0` (l.579–582); `settleCycle()` (l.624–633);
  `isHarvestable()` (l.707–715); `ripeSibling()` (l.694–705); **`getBed()`
  asks `getOccupiedHost()` and narrows `isCultivable`** (l.724–732) — a
  plant not in a slot reads `null`; `rootRoom()`/`soilMoisture()`/
  `nutrientLevel()` are host seams defaulting to `null` (l.982–1018);
  `satWater(null) = 0` (l.1101–1106) — **the reason a loose plant dies**.
  Persistent fields incl. `harvestTemplatePath`, `nutrientDraw`,
  `harvestTool`, `discipline` (l.436–461). `markupAugmenters =
  [conditionAugmenter]` (l.464).
- `packages/server/src/mud/platform/thing/Plant.ts` —
  `PersistableMixin(SlottableMixin(GrowingMixin(ReservedMixin(OrganismMixin(
  ThermalMixin(Good))))))`; affords `harvest` to peers (l.66–70);
  `rootRoom()` = `getBed()?.rootRoomPerPlant()` (l.148–150);
  `soilMoisture()`/`meanSoilMoisture()`/`nutrientLevel()`/`waterTheSoil()`
  read the bed (l.162–183); `fitsSlot` requires `isCultivable(host)`
  (l.200–218).
- `packages/server/src/mud/lib/husbandry/Cultivable.ts` — host
  constraint `Stuff & Container & Bulkable & Slotted & Staged & Reserved &
  Soil` (l.141–145); `PLANT_SLOT = 'plant'`; `rootRoomPerPlant` = bulk
  interior litres ÷ occupants (l.357–360); affords `plant`/`repot`/
  `harvest`/`feed` to peers (l.174–183); `applyProps` adopts arrivals into
  the slot (l.431–434, 467–475).
- `packages/server/src/mud/lib/husbandry/Soil.ts` — `Soil` surface:
  `reconcileSoil`, `soilMoistureFraction`, `meanSoilMoistureFraction`,
  `nutrientFraction`, `waterSoil`, `feedSoil`, `drawNutrient`,
  `organicMatterFraction`, `structureFraction`, `addOrganicMatter`,
  `poach`, `fixNitrogen`, the sky edge, and the host hooks
  `soilWaterDemandPerGameDay`, `soilCatchmentAreaM2`, `soilLeachRate`
  (l.155–250). Host constraint `Stuff & Reserved` (l.258).
  `IMMEDIATE_MINERALIZATION = 0.15`, `MINERALIZATION_PER_GAME_DAY =
  0.0006` (l.76–84).
- `packages/server/src/mud/lib/husbandry/Plantable.ts` — `growsIntoPath`
  only. `packages/server/src/mud/platform/thing/Seed.ts` =
  `PlantableMixin(Good)` (l.24–26). `platform/thing/Crop.ts` =
  `SteepableMixin(Provision)` (l.52) — a crop is NOT plantable.
- `packages/server/src/mud/lib/husbandry/Feeder.ts` — `feederKind`
  (`bowl · trough · hopper`), `offerings()` = edible contents (l.100–108),
  `lastFilledBy` (no caller sets it). `platform/thing/Feeder.ts` =
  `FeederMixin(BulkableMixin(ContainerMixin(Good)))`. The trough row
  `packages/content/generic-objects/content/stuff/thing/vessel/trough.yaml`
  is this class (`feederKind: trough`, `mass: 14`), sold at the general
  store (`terminus/.../general-store/counter.yaml` l.276).
- `packages/server/src/mud/platform/idea/species/Species.ts` —
  `FEEDING_STYLES = ['hand','ground','graze','bowl','trough','hopper',
  'surface']` (l.297–304), `FEEDER_KINDS` the vessel subset (l.311);
  `feedingStyle` authorable (l.898, 1057), `feedsBy(style)` (l.1667);
  `adultMass` authorable + `getAdultMass()` (l.741, 1585). **No ranching
  species row authors `feedingStyle`** (only cat, dog, carp, canary).
- `packages/server/src/mud/lib/craft/Tooled.ts` — `ToolMixin`:
  `capabilities: (string | CapabilitySpec)[]`, `hasCapability(kind)`; no
  numeric work-rate field.
- `packages/server/src/mud/lib/ground/Improvable.ts` —
  `isPlantable(cost) = progressOn('clearing') >= 1` (l.~357), **no
  caller**; `bankWork`, `progressOn`, reversion reconcile.

### The platform verbs

- `packages/server/src/mud/platform/idea/cmd/inventory/HarvestController.ts`
  — `CommandController` (instant); resolves the target as a `Growing` or
  a `Cultivable` (l.103–139); tool check via `harvestTool` capability
  (l.156–175); grade from `bandFor(getWorstLimiting())` (l.210,
  327–337); mints `count = polycarp ? getFruitSetCount() : 1` clones with
  `madeFrom: plant` (l.217–244) into the giver; `bed.drawNutrient(draw)`
  **only when `getBed()` is non-null** (l.262–263); polycarp
  `settleCycle()` else `destruct(plant)` (l.271–277).
- `.../PlantController.ts` — `plant/sow <seed> in <pot>`; requires
  `isPlantable(seed)` and `isCultivable(target)` (l.72–97); the land-use
  gate for fixed ground (l.103–154); clones the plant, moves it into the
  pot's contents, `occupy(PLANT_SLOT)`, destructs the seed (l.199–225).
- Views `packages/content/platform/content/platform/cmd/inventory/harvest.yaml`
  (`verbs: [harvest, pick]`; target `requires: [VisibleMixin,
  GrowingMixin|CultivableMixin]`; `tool` default
  `"reachable:[capability.cutting]"`) and `plant.yaml` (`verbs: [plant,
  sow]`; `seed` requires `PlantableMixin`; `pot` **required**, requires
  `CultivableMixin`).
- `packages/server/src/mud/lib/command/EngagedActController.ts` —
  `engageAct(context, { durationMs, beginSelf, beginPeers?, cost,
  onComplete, onAbort? })` (l.45–59, 114); `decline(context, prose,
  reason)`. `platform/idea/cmd/ground/GroundWorkController.ts` extends it
  (`toolOf`, `credit`, `LABOUR_PER_ACT = 1`).
- `GrubController.ts` (kernel ground) banks `clearing` via
  `ground.bankWork(...)` and narrates `improvementSpoils` (l.73–74).

### The herd (trade-ranching)

- `packages/content/trade-ranching/src/thing/Herdbook.ts` —
  `FixtureMixin(Thing)`; affords `draft` (environment + peers, l.71–75);
  authorable `herdId, herdName, speciesPath, tally, foundingMeanAgeDays,
  femaleFraction, holderRef, homeExtent` (l.77–86); `onCreate` files the
  herd **get-or-create** (l.171–190).
- `packages/content/trade-ranching/src/idea/HerdRegistry.ts` —
  `HerdRecord { herdId, name, speciesPath, tally, holderRef, homeExtent,
  founded, foundingMeanAgeDays, femaleFraction?, drafted[], overlay }`
  (l.105–154); `HeadOverlay { flesh?, handling?, ageDays?, bornAt?,
  served?, note?, driedOffAt? }` (l.157–193); `file/read/named/sole/
  update/draft/returnHead/overlayFor`; documents under
  `/trade/ranching/herds/<id>` via `DocumentApi.saveToRegister`.
- `.../lib/HeadSeed.ts` — `sample(shape, index, overlay)` →
  `{ flesh, handling, ageDays, sex, frame }`, FNV-1a seeded; `frame ∈
  [-1, 1]` is "what the tail is made of" (l.42–47) and **nothing reads it
  yet**.
- `.../agent/Livestock.ts` — `ProducingMixin(HandledMixin(HandlingMixin(
  ChattelMixin(BrandedMixin(Creature)))))` (l.94–96); `herdId`,
  `headIndex`; affords `return/slaughter/breed/milk/shear/gather`
  (l.145–164). **No `BehavedMixin`, no `BondedMixin`** — the kernel
  `feeds` brain cannot run on it.
- `.../idea/cmd/ranching/DraftController.ts` — mints the head from the
  seed + overlay, sets flesh by `adjustReserve('flesh', …)` (l.152–158),
  `reconcileProduction()` at the draft (l.163), `reapStrays` heals
  drafted entries whose body is gone (l.336–350); `bookHerdId(giver)`
  duck-types the book by `getTally` (l.359–376). `ReturnController.ts`
  folds `flesh/handling/ageDays/driedOffAt` into the overlay then
  destructs (l.59–104).
- Views `packages/content/trade-ranching/content/trade/ranching/cmd/ranching/draft.yaml`
  — `head` string + `herd` string with `prepositions: [from]`.
- `packages/server/src/mud/lib/metabolism/Metabolic.ts` —
  `integrateSlice(sliceSec)` is **protected** and runs
  `absorbDigestion → basalDrain → coupledRecovery → clearBurdens →
  partitionFlesh → …` (l.888–905); `partitionFlesh` gains above
  `FLESH_SURPLUS_AT = 70` satiation and loses below `FLESH_DEFICIT_AT =
  25` (l.1055–1087); `METABOLIC_DEFAULTS` is exported (l.200) with
  `FLESH_LOSS_PER_MIN = 100/(90 d)`, `FLESH_GAIN_PER_MIN = 100/(150 d)`
  (l.286–287); `integratesLongAbsence()` = stamped chattel (l.880–883);
  `ingest(material, amount, phase, payload)` (l.1586). `ProducingMixin`'s
  `productionFactor()` reads `flesh` (`Producing.ts` l.284–287) — **milk
  already stops when condition falls**.
- `packages/server/src/mud/lib/creature/Creature.ts` — the `flesh`
  reserve and its bands (l.497–575); `getMass()` derives from the
  species' `adultMass` (l.663–745).
- Brains: `packages/content/trade-ranching/src/behavior/herds.ts` (the
  dog quiets stock; feeds nothing); `packages/content/trade-sugar/src/behavior/cuts.ts`
  reads *ripe* = a room occupant that `isGrowing && hasKeyword('cane') &&
  isHarvestable()` (l.86–96) and issues `harvest cane`, then the errand
  (`executeCommand`, not forced, l.108–115). Config names WORDS only.

### Clock jumps and the unobserved interval (the Q9 ground)

- `docs/subsystems/behavior.md` l.636–640: **"A clock jump runs no
  brain."** Beats are real-time `setTimeout`s
  (`lib/behavior/Behaved.ts` `_scheduleBeat`, defaults 20 s watched /
  120 s unwatched); `WorldClockApi.advance` drains only `WorldClockApi`
  schedules. `_runAct`/`_deliberate` return while `!AppApi.isWorldOpen()`.
- The wire helper `advanceWorldClock(duration)`
  (`packages/wire/src/harness/world.ts` l.157) POSTs to
  `/auth/test-clock`; `TestHooks.advanceClock` jumps, pauses while
  persistence quiets, resumes. Used by `taps`, `dairy` and `sugar` drives.
- The employment roster tick is `WorldClockApi.every(1 game-hour, …,
  { coalesce: true })` (`EmploymentLogic.ts` l.1821–1837) → **one**
  `runTick()` at the end of a jump.
- What a jump DOES advance: every reconcile-on-read stock — sward
  (`swardStamp`), soil, growth (`growthClockStamp`), metabolism
  (`metabolicClockStamp`, far-past guard waived for stamped chattel),
  production (`productionStamp`), maturation.
- Hearts Delight is **not booted** (`hearts-delight/pack.yaml` l.73–80);
  its dairy staff carry only `idles`; the dairy business's one seat
  "fulfils nothing". The herds there have **no intake path at all**
  (`ranching.md` l.222–231, verified in code).

### Ownership and the record

- `packages/server/src/mud/platform/idea/api/ChattelLogic.ts` —
  `derivedTitle(item, to)` (l.307–325): **1** `getMadeFromOwner()` (the
  TITLED inputs' owner — an untitled input passes nothing), **2** a
  process mint → nobody, **3** an agent destination, **4** the acting
  author standing where it lands (or the causing author off-command),
  **5** a crafted maker; `followCustody` derives a title only for a
  **fresh** good (l.253). `ownerKeyOf(owner: Stuff)` (l.62–67) yields
  `organization` for an Organization and `player` otherwise — ⚠ **a
  GROUP cannot be stamped as a chattel owner through the object face**
  (`Chattel.stampChattel(owner: Stuff)`, `lib/chattel/Chattel.ts`
  l.319–321).
- **Theft is not recorded anywhere.** `AccountabilityKind = 'opened' |
  'violated' | 'death' | 'harm' | 'abandonment'`
  (`lib/accountability/AccountabilityEvent.ts` l.76); `ChattelEventKind =
  'mint' | 'transfer' | 'released'`. `docs/subsystems/chattel.md`
  l.291–296 declined to invent a theft kind on purpose ("would force a
  'what is theft' ruling the courts work should make"); `GetController`
  l.489–493: taking a good you do not hold title to is *permitted and
  recoverable*; the record is the chain of title (custody ≠ title).
- Staff on shift: `Employed.isOnShiftFor(organizationPath)`
  (`lib/employment/Employed.ts` l.299/469), `isFulfilling(discipline?)`;
  `EmploymentApi.businessAt(locationPath)` (`api/employment.ts` l.135),
  `operatorsAt(here)` (l.148); a Business knows its places by
  `getOperatingLocations()`; the IceSheet `cutterOwner` precedent
  (`packages/content/water/src/thing/IceSheet.ts` l.469–477) credits the
  house when the actor is on shift there.
- Title: `AccessApi.heldExtents(subject)` (`api/access.ts` l.150),
  `ParcelApi.coveringParcelOf(path)`.

### Content as it stands

- **Waponi Woo** (`packages/content/waponi-woo/content/world/terminus/waponi-woo/`):
  four `SingletonField`s — `location/cane-piece.yaml` (8,000 m², cast
  cutter-1/2), `lower-piece.yaml` (8,000), `smallholding-a.yaml` (1,200,
  smallholder-a), `smallholding-b.yaml` (1,000, smallholder-b) — each
  `props: - { template: .../thing/standing-cane, count: 6 }` (l.18).
  `thing/standing-cane.yaml` extends `/trade/sugar/thing/plant/cane` with
  `growthStage: mature, _vigor: 0.9, _flowering: true, _seedSet: true,
  _fruitFill: 1`. Cutters/smallholders run `/trade/sugar/behavior/cuts`
  (config `to/back[/deliver: sell]`). The estate Business
  (`idea/estate.yaml`) operates cane-piece and lower-piece, **not** the
  smallholdings. No `boot:`. Title: group `waponi-woo`.
- `packages/content/trade-sugar/content/trade/sugar/thing/plant/cane.yaml`
  — Plant, `nutrientDraw: 40`, `fruitSetCount: 1`, `fruitFillDays: 5`,
  `daysToStage {30,120,330}`, no `harvestTool`; `thing/crop/cane.yaml` is
  `/platform/thing/Crop`, `mass: 30`; `thing/seed/cane-sett.yaml` is a
  `Seed` (`mass: 5`), unused.
- **Hearts Delight** (`packages/content/hearts-delight/content/world/terminus/hearts-delight/`):
  `bench-field/location/upper-bench.yaml` — `Field`, 4,000 m²,
  `legumeFraction: 0`, props 3× `/trade/farming/thing/plant/wheat`
  loose; `orchard-close.yaml` — `Field`, 1,200 m², `legumeFraction: 0.4`,
  props 3 garden beds + 3 cherries **loose in the field** (the row's
  comment claims they seat into beds; `Cultivable.adoptArrivals` walks
  only the bed's own contents, so they do not). Herdbooks: `thing/flock-book.yaml`
  (delight-flock, 12 ovis/aries, homeExtent = **upper-bench**),
  `ox-book.yaml` (2, femaleFraction 0, home farmstead-yard),
  `hen-book.yaml` (6, farmstead-yard), `dairy/thing/dairy-book.yaml`
  (delight-dairy, 6, home `dairy/location/yard`), `calf-register.yaml`
  (3, 45 d). `dairy/location/yard.yaml` is a **Locale** (a midden; the
  meadow is a `details:` line); `byre.yaml` is a `PersistentLocale`
  (pails, water-butt, cast dairywoman + dairy-lad). `location/barn.yaml`
  props 8× `/trade/farming/thing/crop/wheat`. `idea/farm-business.yaml`
  (Odell's seat `farmer`, `fulfills: [cooking]`, operates farmstead-yard +
  upper-bench, `call: rota`); `idea/dairy-business.yaml` (seat
  `dairyhand`, the lad, days 0–6 h 5–19, operates yard + byre). Titles:
  the valley to group `hearts-delight`; the orchard close to
  `farm-business` with `areaM2: 1200`; `/dairy` to `dairy-business`.
- **Campus** (`packages/content/eternal-university/content/world/terminus/eternal/`):
  `campus-field/location/home-field.yaml` — `Field`, 400 m²,
  `legumeFraction: 0.4`, no props. `campus-farm/idea/farm-unit.yaml` —
  2 `labourer` seats (`headcount: 2`, no roster), operates yard +
  home-field. `campus-farm/location/yard.yaml` props: byre, herdbook,
  yard-wall, **trough** (`thing/trough.yaml` = plain `Thing`, "stone
  water trough"), **hay-barn** (plain `Thing`), midden, handcart, tool
  rack + spade/soil-kit/scythe/plough. `campus-farm/thing/herdbook.yaml`
  — college-herd, 6 bos/taurus, holderRef
  `organization:/stuff/idea/Government/eternal-university`, homeExtent
  `/world/terminus/eternal/campus-field`. Titles: campus-farm and
  campus-field to group `duncan-hall`, agricultural.
- **Rejection**: `kestrel-road/goat-pen.yaml` — a **Locale** (goat-book,
  pails, dairying kit, water-butt); `thing/goat-book.yaml` —
  rejection-nannies, 3 capra/hircus, holderRef the provisioning
  business, homeExtent the pen.
- **Loose plants after the cane and the wheat convert:** (1) the orchard
  close's three cherries — standing in a **Field**; (2) the infirmary
  physic garden's greywort/wardmoss/physic-willow
  (`terminus/.../infirmary/garden.yaml` l.32–34) — standing in a
  **Locale**. Every other plant is slotted (panels, PermanentBed, pots).
- **Tools and seed:** scythe (`trade-farming/.../thing/scythe.yaml`,
  `capabilities: [mowing]`), billhook (forestry, `[cutting]`), plough
  (`[ploughing]`), spade, soil-kit. **No sickle, no cane knife.** Seed
  rows `thing/seed/{wheat,barley}.yaml` are `Seed` with **no mass**. The
  general store stocks the billhook, trough, hopper, plough-share and
  many seeds; **not** wheat/barley seed, scythe, plough or hay.
- **Drives:** `packages/wire/tests/farmstead.dirty.wire.test.ts` l.146–168
  (`mow` refuses day one; `plough` prose); `sugar.dirty.wire.test.ts`
  steps 15 (l.737), 17 (l.772), 18 (l.790) harvest loose cane;
  `dairy.dirty.wire.test.ts` drafts + milks with `advanceWorldClock`.
  `lint:drive-scripts` (`packages/server/scripts/check-drive-scripts.ts`)
  only holds `packages/server/scripts/drive-*.ts` at zero.

---

## Plan-level decisions

Each names the lens or convention that decided it. Requirements
decisions (the cover slate's D1–D9, G1–G5) are not re-opened; these are
the engineering shape under them.

**D1 — Ground is the bed by CONTAINMENT; no mixin goes onto `Field`.**
`CultivableMixin` is not composed onto `Field`: its host constraint
needs `Bulkable` (a litre interior) and `Slotted`, and composing it would
claim that every field in the game is a vessel of soil with an N-slot and
a `rootRoomPerPlant` — false of ground, and a guard would follow (the
host-placement tell). Instead the kernel seam is one line of narrowing in
`Growing.getBed()`: *the slot host when there is one, else the CONTAINER
when it composes `Soil`.* A plant standing in soil-bearing ground reads
that ground's moisture and nitrogen. `rootRoom()` narrows on
`isCultivable` (a field has no root ceiling → `null` → unlimited, the
shipped meaning of "not a root constraint"). Consequences: the island's
cane and the bench's wheat stop dying; the orchard close's cherries, loose
in a `Field` today, become rooted with no content change. *Convention:*
mixin-on-the-wrong-host is the rework class; this adds no host.

**D2 — The area crop is ONE `Plant` with a sown area, and the yield is
derived from two row numbers.** `GrowingMixin` gains a persistent
`sownAreaM2` (0 = an individual plant — every shipped row unchanged) and a
persistent `_cycleCount`. The profile gains `seedRateKgPerM2` and
`yieldRatio` (the historical yield-to-seed ratio: wheat 6, barley 7,
cane 10 over a sett rate of 0.8 kg/m²). The standing crop at ripeness is
`sownAreaM2 × seedRateKgPerM2 × yieldRatio × (1 − yieldDeclinePerCycle)^
_cycleCount` kilograms; goods mint by the crop row's `mass` (a 25 kg sack,
a 30 kg bundle), remainder carried as `_harvestCarryKg`. No yield table:
*pedagogy* (yield ratio is the number every agrarian history quotes) and
*creative expression* (two numbers on a row a venue already ships). A
third-sown field yields a third because the area is the multiplier.

**D3 — The swath belongs to the TOOL: `swathM2` on `ToolMixin`.** One
authorable kernel field on `lib/craft/Tooled.ts`: the square metres one
act with this tool works. Bare hands read the dial
`husbandry.handSwathM2` (10). A sickle authors 40, a cane knife 30, a
scythe 60 (later a reaper authors 400 and answers the same verb —
*continuity*). `HarvestController` becomes an `EngagedActController`; the
area branch engages hands+body for `durationMs = swath × 90 ms` and mints
on completion; the pot branch stays instant. The `tool` arg's default
widens to `reachable:[capability.reaping]|[capability.cutting]` so a
sickle binds without `with`. *Pedagogy:* work per acre is the tool's
number, yield per acre the crop's.

**D4 — The seedbed is the FIELD's state; the kernel asks the ground.**
`Field` gains persistent `seedbedStamp` (game-seconds the sward was last
turned under; 0 = never). `plough`: (a) banks `clearing` while the ground
still owes it (unchanged — clearing stays the one-time improvement);
(b) refuses *"a crop stands in it"* while `getCrop()` is non-null;
(c) refuses *"already ploughed this season"* while `seedbedStamp` is
younger than `SEEDBED_DAYS = 90` and nothing has been sown on it;
(d) otherwise draws the whole sward (`drawSward(standing)`), credits it as
organic matter (`addOrganicMatter(kg × 0.0003)`, the same units bridge
`MowController` uses for N, scaled to OM) and stamps `seedbedStamp = now`.
The kernel `PlantController` asks the ground through a new `@hook` on
`Soil`: `sowingRefusal(): string | null` (default `null`; `Field` answers
*not ploughed for the season* / *a different crop stands in it*). `sow`
accumulates area: the first act clones the crop plant into the field's
contents with `sownAreaM2 = min(area, free)`, later acts of the same kind
add area; seed mass is consumed at `area × seedRateKgPerM2` off the seed
object (`setMass`, destruct at 0 — the `mow` precedent). The sow act
engages hands+body (`SOW_HAND_M2 = 100` per act). Out-of-season sowing is
allowed; warmth and daylength already punish it. `Improvable.isPlantable`
stays uncalled for `sow` (clearing gates `plough`, `plough` gates `sow`).

**D5 — Ratoon decline is one optional profile number.**
`yieldDeclinePerCycle?: number` (cane 0.12; absent = 0, coppice keeps 0).
The polycarp area crop's last swath calls `settleCycle()` and increments
`_cycleCount`; the monocarp's last swath destructs the plant → stubble.
`look` reads *tired stools* when `(1−d)^n < 0.6`. `grub` on a field whose
crop stands ends the crop: `Field` overrides `bankWork('clearing', …)` to
destruct `getCrop()` first — no kernel change.

**D6 — Whose crop: the crop plant is STAMPED to the field's OPERATOR,
and the harvest follows `madeFrom`.** A group cannot own chattel
(`ownerKeyOf`), so "the holder" is realized as the **Business that
operates the field** (`EmploymentApi.operatorsAt(field)[0]`) when there
is one, else the sower when the sower personally holds the extent, else
untitled (the hand that cuts it owns the take — rung 3, today's Waponi
smallholder outcome). The stamp is settled at the two ACTS that
need it, never as a side effect of reading: at `sow` (the act that
clones the crop) and at `Field.onCreate` for an authored crop
(fire-and-forget, the `Plant.onFloweringLatched` shape); and the
**harvest awaits `Field.ensureCropTitle()` before it mints**, which is
also where an operator Business that stands up lazily is first
resolved. ⛔ No `look` / augmenter path writes a title: a read that
mutates ownership is the wrong place (owner's correction at the plan
handoff, 2026-10-28). The harvest mints with `madeFrom: plant` (shipped), so a hired
hand's sheaf and a stranger's sheaf are both the operator's. The title
gate for `sow`: `AccessApi.heldExtents(giver)` covers the field's parcel
extent, OR `giver.isOnShiftFor(operator.getOrganizationPath())` for an
operator of the field — the IceSheet precedent. **Theft is NOT recorded
(see R1):** custody-without-title is the shipped record and the appeal
(*governance*: the criterion is title, the appeal the chattel record).

**D7 — `Plant.harvest` and `ripeSibling` STAY.** The requirements' rule
("if no loose plant remains, retire") resolves against the census: the
infirmary's three medicine herbs stand loose in a Locale and the orchard
close's cherries stand loose in a Field. Both remain, so the kernel
affordance and `ripeSibling` stay and are recorded as foraging's to
settle. The cherries become rooted by D1 (a field is soil-bearing ground)
— a bonus, not a reason.

**D8 — The field records who grazes it; the record remembers where it
went.** `Field` gains a persistent `grazers: Record<herdId, GrazerEntry>`
with `GrazerEntry = { demandKgPerDay, feederKinds: string[], fedDays,
demandDays, since }` (a plain object, never a `Map`). Ranching writes it
through `field.setGrazer(herdId, entry)` / `field.clearGrazer(herdId)` /
`field.grazerLedger(herdId)` and the field keeps the ledger
synchronously inside its own reconcile. The `HerdRecord` gains
`grazing?: string` (the field's identity path — template path for an
authored field, persistence key for a plotted one) and `fed?: { fraction,
stamp }` (the committed history). `move` writes both; `draft`, `return`
and `move` fold the open ledger into `fed`. The Herdbook row gains
authorable `grazing:` (a field path) which the book's `onCreate` applies
**once**, get-or-create like the filing — the authored seed of the
runtime pointer. *Load on use:* the field's read never searches for a
herd, and the act never searches for a field.

**D9 — Intake is one constant on the species' mass, on `Species`.**
`Species.dryMatterIntakeKgPerDay() = 0.1 × adultMass^0.75` — the
metabolic-weight rule every feeding standard reduces to (a 600 kg cow
eats ~12 kg DM, a 60 kg ewe ~2.2 kg, a 2 kg hen ~0.17 kg). Kernel, on
the species, because it is a fact about a body's size and ranching is
only its first reader. The herd's demand is `tally ×` that; `move` stamps
it into the field's `GrazerEntry` with the species' `feedingStyle` vessel
kinds. The shipped duck-typed occupant probe in
`Field.swardGrazingDemandPerGameDay` is left as it is and **no class
implements `grazingDemandPerGameDay`** — a drafted head is counted
through its herd's entry, not twice.

**D10 — Fed → flesh: one rule for the tally and the body.** The sward
integral (D11) yields, per herd, a fed fraction over the window. (a) An
UNDRAFTED head's condition is derived at `draft`: starting from the
seed/overlay flesh, apply `partitionFlesh`'s own two legs over the days
since the overlay's stamp using `METABOLIC_DEFAULTS.FLESH_GAIN_PER_MIN` /
`FLESH_LOSS_PER_MIN`, with the fed fraction mapped to an equivalent
satiation (`f ≥ 0.95 → 75`, `0.5 ≤ f < 0.95 → 50`, `f < 0.5 → 25 ×
f/0.5`) — grain, a mapping a balance pass may move. (b) A DRAFTED head
standing in a field with its herd's entry overrides `integrateSlice`
(protected on `Metabolic`) to `ingest` its slice's ration
(`fedFraction × DMI × slice/day`, phase `solid`, material
`/stuff/idea/material/food/hay`) before `super.integrateSlice`, so the
shipped cascade feeds it and milk follows (`productionFactor` reads
`flesh`, shipped). (c) **The tail**: a head's own fed fraction is the
herd's × `0.8 + 0.2 × (1 + frame)/2` — `HeadSeed.frame` finally has a
reader, and the shy feeders are the same heads every time (*seeded,
never drawn*).

**D11 — Hay is drawn by the FIELD's integral, from troughs standing in
it; a trough may draw through from a store.** `SwardMixin` gains a host
hook `swardShortfallFed(kgNeeded): number` called per step when
`demand × dt` exceeds what the sward gave; `Field` answers by drawing
from every `Feeder` in its contents whose `feederKind` is in any grazer's
`feederKinds`: `trough.drawFodder(kg)` takes mass off edible contents
(hay bales, `setMass`, destruct at 0 — fire-and-forget like the seed
mint) and, when its contents are empty, from the container named by a
new authorable `suppliedBy` on the kernel `FeederMixin` (identity path of
a store; the pump's `suppliedBy` shape). The per-herd fed share is
`(swardEaten + hayEaten) / (demand × dt)`, apportioned by demand. `mow`
mints `ceil(taken / 25)` bales of ≤ 25 kg each (a person can carry one)
instead of one bale of the whole cut. *Why draw-through (Q9):* a clock
jump runs no brain, so a venue's staff cannot fork hay through a jumped
month; the trough reading its rick is the staff's standing job abstracted
over the interval they cannot act in, and it **still costs somebody the
activity** — the hay has to have been mown and stacked in season
(*uncertainty.md*'s abstraction law). The campus trough authors no
`suppliedBy`: the player forks hay. **See R2 for the wording change.**

**D12 — A herd grazes a field or it grazes nothing; a pen is a small
field.** No second intake path for a Locale. Every authored herd stands
on a field (content, W6): the dairy gets a 12,000 m² pasture, the flock
+ hens the orchard close (resized), the oxen + calves a 6,000 m² lower
meadow, the campus herd its home field (resized to 10,000 m²), and the
goat pen becomes a `SingletonField` (400 m², bare sward, a trough fed
from a rick). A herd with no `grazing` is fed 0 and thins — honest, and
says so at `look herdbook`.

**D13 — `move <herd> to <field>`: ranching's view, afforded by the
Herdbook and by a drafted head.** `trade/ranching/cmd/ranching/move.yaml`
(`verbs: [move]`, args `herd` string, `field` string with
`prepositions: [to, onto]`) afforded by `Herdbook` (environment + peers,
beside `draft`) and by `Livestock` (peers) — the latter is how "on the
field where it stands" is met without `Field` (farming) naming a ranching
view (**R3**). The keeper gate: `heldExtents(giver)` covers the herd's
`homeExtent`, or the giver `isOnShiftFor` a Business that operates the
herd's home field (`EmploymentApi.businessAt(record.homeExtent)` else
`operatorsAt` of the home field). The target: a `Field` within
`homeExtent` (prefix on its parcel extent) matched by `fieldName` word or
`here`; else refused in words. The move is instant: close the old field's
ledger (fold to `fed`), `clearGrazer`, `setGrazer` on the new, write
`grazing`.

**D14 — The staff: one `fodders` brain in `trade-ranching`, words only.**
`src/behavior/fodders.ts` (`kind: work`, `claims: [hands, body]`,
`presenceGated: false`): each beat, on shift, in order — if a configured
hay field reads `ahead-of-them`/`ready` in a growing month and the hand
holds a scythe: `go …`, `mow`, `get hay`, `go …`, `put hay in <store>`;
else if the configured trough's offerings are empty and the store holds
hay: `get hay from <store>`, `put hay in <trough>`. Config `{ meadow:
word[], store: word, trough: word, home: word[] }` — directions and
keywords, never commands (the `cuts` rule). Odell runs it for the farm
(barn rick, lower-meadow trough), the dairy lad for the dairy (byre rick,
pasture trough), Rejection's provisioning hand for the goats. The
`cuts` brain is unchanged: its ripe test (`isHarvestable`) is true while
standing crop remains, and `harvest cane` now cuts a swath.

**D15 — Content conversions are rows; the only pack code is the two
tools and the plantable bundle.** `trade-farming` ships
`thing/sickle.yaml` (`[reaping]`, `swathM2: 40`); `trade-sugar` ships
`thing/cane-knife.yaml` (`[reaping, cutting]`, `swathM2: 30`) and
`src/thing/CaneBundle.ts = PlantableMixin(Crop)` for `crop/cane.yaml`
(`growsIntoPath: /trade/sugar/thing/plant/cane` — cane is planted from
cut cane, no new act); `seed/cane-sett.yaml` is retired (unused, no
migration: content). The general store stocks sickle, cane knife,
scythe, seed wheat, seed barley (25 kg sacks: `mass: 25`).

**D16 — The drive is `packages/wire/tests/cover.dirty.wire.test.ts`**,
one file for both stages, jumping only the nights/seasons and watching
working hours in real time where a brain must act (the sugar drive's
rule). `farmstead` and `sugar` drive steps change with the content (§
Waves W7).

---

## Host placement

| new thing | host | what composing it claims — and what it does NOT |
|---|---|---|
| `getBed()` by containment | `GrowingMixin` (kernel, existing) | every grower standing directly in `Soil`-bearing ground is rooted in it. Claims nothing of pots/beds (slot first). ⛔ Not a mixin on `Field`, not a new `Cultivable` host. |
| `sownAreaM2`, `_cycleCount`, `_harvestCarryKg` | `GrowingMixin` fields | an individual plant has `0` and is byte-identical. Claims nothing of the host class. |
| `seedRateKgPerM2`, `yieldRatio`, `yieldDeclinePerCycle?` | `GrowthProfileData` (the row's `profile`) | optional; a row without them cannot be sown by area (`sow` refuses *"this is planted one at a time"*) — bed plants unchanged. |
| `swathM2` | `ToolMixin` (`lib/craft/Tooled.ts`) | any tool may say how much ground one act works; 0 = not an area tool. ⛔ Not on the plant row (the tool decides), not a capability spec field. |
| `sowingRefusal()` `@hook` | `SoilMixin` (kernel) | ground may refuse a sowing in words; default never refuses, so pots and beds are unchanged. |
| `seedbedStamp`, `grazers`, `getCrop()`, the look augmenter, `ensureCropTitle` | `Field` (trade-farming) | every Field and SingletonField can hold one area crop and a grazing ledger. A field with neither reads exactly as today. The orchard close (beds + trees in a field) keeps its beds; its loose cherries root in the field (D1). |
| `swardShortfallFed()` `@hook` | `SwardMixin` (trade-farming lib) | a sward host may feed a shortfall from elsewhere; default 0. |
| `suppliedBy`, `drawFodder(kg)` | `FeederMixin` (kernel) | any feeder (bowl, hopper, trough) may be supplied from a store and drawn from by weight. A hopper fed from a grain bin is the same shape. ⛔ Not on `Field` (the field does not own the trough). |
| `dryMatterIntakeKgPerDay()` | `Species` (kernel) | a species' size implies its intake. No per-row number. |
| `GrazerEntry`, `grazing`, `fed` | `Field` field (above) · `HerdRecord` (ranching document) | the record keeps the committed history and the pointer the act needs; the field keeps the open window. |
| `grazing:` authorable | `Herdbook` (ranching) | an authored herd may say where it starts; applied once. |
| `move.yaml` affordance | `Herdbook` (environment + peers) · `Livestock` (peers) | ⛔ Not `Field` — farming must not name a ranching view. See R3. |
| `integrateSlice` override (graze) | `Livestock` (ranching) | only a head of stock grazes the field it stands in. ⛔ Not `Creature`, not `KeptAnimal` (a pet is fed from a bowl by `feeds`). |
| the flesh derive at draft | `DraftController` (ranching) + a static on `HeadSeed` (`conditionAfter(sample, fed, days)`) | pure, `@internal`, ranching-private like the rest of `HeadSeed`. |
| `fodders` brain | `trade-ranching/src/behavior/fodders.ts` | the trade whose herds eat ships the hand who feeds them; it drives farming's `mow` by verb, never by import. |
| `CaneBundle` | `trade-sugar/src/thing/CaneBundle.ts` = `PlantableMixin(Crop)` | a cut cane bundle is plantable; nothing else is. ⛔ Not `Crop` (a sack of wheat is not planted), not `Seed` (a bundle is millable). |
| sickle · cane knife | rows over `/platform/thing/Tool` | no class. |

The test, applied: no step above needs a guard that re-narrows a host
set. The one place a narrowing appears — `rootRoom()` asking
`isCultivable(bed)` — is the pot's ceiling applying to pots, which is what
that method already said.

---

## Convention conformance (checked at plan time)

- `props:` / `cast:` — every content row touched uses `props:`; the goat
  pen and the new pastures are authored with `props:` (trough, rick) and
  no `container:` (`lint:instanceable` refuses it).
- Locations, not rooms — the new pastures are `Field`/`SingletonField`
  (a `Location`); the goat pen converts Locale → `SingletonField`; no
  `PersistentLocation`.
- Namespace axes — rows at `/trade/farming/…`, `/trade/sugar/…`,
  `/trade/ranching/…`, `/world/<place>/…`; the `move` view at
  `/trade/ranching/cmd/ranching/move`, controller at
  `/trade/ranching/idea/cmd/ranching/MoveController`; the brain at
  `/trade/ranching/behavior/fodders`.
- Module scope declares; lifecycles initialize — no module-scope
  executable statements; the herd pointer is applied in `onCreate`
  (structural completion, `lint:on-create` limb 1).
- Import boundary — packs import the kernel by package specifier only;
  `trade-ranching` imports `Field`'s type from
  `@saxonberg/content-trade-farming/src/location/Field` (a declared
  workspace dependency); `trade-farming` imports nothing from ranching.
  No new free helper, no new module category, no Api in a pack.
- Verbs on objects — `field.setGrazer(…)`, `trough.drawFodder(…)`,
  `plant.getSownAreaM2()`, `species.dryMatterIntakeKgPerDay()`; no
  `XApi.verb(host, …)`.
- No new Mongo collection (the herd record is a document; the field
  ledger is a persistent field). No `isWizard`. No migration — fields
  default on read.
- American English in every new identifier, row and sentence (`fodders`,
  `color`); `plough` is a shipped British identifier and stays.
- Lint gates this build must pass (the family is derived; these are the
  ones the shape touches): `lint:instanceable`, `lint:mixin-names` (two
  kernel field additions, no new kernel mixin), `lint:reachability` (the
  `move` verb, the sickle's `reaping`), `lint:verb-collisions` (`move` is
  unclaimed — verified by the requirements survey; the gate proves it),
  `lint:instrument-args` (the harvest tool default), `lint:self-contributions`,
  `lint:on-create`, `lint:kept-animals` (species dials ↔ class),
  `lint:capabilities` (`reaping`), `lint:counters`/`lint:shopfronts`
  (the store's new lines), `lint:mass` (seed sacks, bales), `lint:perishable`
  (hay bales already a Provision), `lint:reconcile-chains` (the ledger
  integrates inside the sward's stepped loop, never a single sample),
  `lint:topics` (`act.deed` literals), `lint:module-scope`, `lint:imports`,
  `lint:object-verbs`, `lint:lib-statics` (no rise), `lint:untitled`,
  `lint:location-graph`/`lint:locations` (the new fields' exits),
  `lint:idle-cadence` (the brain declares its statics),
  `lint:drive-scripts`.

---

## Waves

Every wave lands green on `pnpm test:near` + the touched packs' vitest +
`pnpm -C packages/server lint:family`, and ends at one commit. **Stage on
a live world between waves** (`probe-world-fast-loop`): boot once, walk
the wave's steps, grep `.wire/server.log`; do not run the long drives
until W7.

### Stage A — arable

#### W0 — the kernel seam: ground is a bed, harvest and sow by area

*Implements D1, D2, D3, D4 (kernel half), D5 (fields).* Files:
- `packages/server/src/mud/lib/husbandry/Growing.ts` — `getBed()`:
  slot host if `isCultivable`, else `getContainer()` if `MixinApi.isSoil`
  (narrow to `Stuff & Soil & Container`); return type widens to
  `(Stuff & Soil & Container) | null`. New persistent fields
  `sownAreaM2`, `_cycleCount`, `_harvestCarryKg`; profile fields
  `seedRateKgPerM2?`, `yieldRatio?`, `yieldDeclinePerCycle?`. New
  methods: `getSownAreaM2/setSownAreaM2/addSownAreaM2`,
  `isAreaCrop()`, `standingYieldKg()` (0 unless harvestable),
  `takeSwath(areaM2): { kg, areaCut, last }` (reduces a persistent
  `_harvestedAreaM2`, returns whether the crop is exhausted),
  `getCycleCount()`, `cropAreaPhrase()` (*"over about a third of it"*)
  and `cropStagePhrase()` (*emerging · tillering · in ear · ripening ·
  ripe* mapped from stage × fruit fill — an exhaustive `Record`).
- `packages/server/src/mud/platform/thing/Plant.ts` — `rootRoom()`
  narrows `isCultivable(bed)`; the other seams unchanged (they read
  `Soil`).
- `packages/server/src/mud/lib/husbandry/Soil.ts` — `@hook
  sowingRefusal(): string | null`, default `null`.
- `packages/server/src/mud/lib/craft/Tooled.ts` — authorable `swathM2`
  (default 0) + `getSwathM2()`.
- `packages/server/src/mud/platform/idea/cmd/inventory/HarvestController.ts`
  — extends `EngagedActController`; branch on `plant.isAreaCrop()`:
  refuse unripe as today; swath = `tool?.getSwathM2() || dial(handSwath)`;
  `engageAct` (duration `swath × 90 ms`, cost 6); on completion
  `takeSwath`, mint `floor((kg + carry)/goodMass)` clones with `madeFrom:
  plant`, grade as today, `bed.drawNutrient(nutrientDraw × areaCut /
  sownAreaM2)`, then `last ? (polycarp ? settleCycle + cycle++ :
  destruct) : nothing`, capture, credit, narrate *"You cut a swath …
  about a third of it still standing"*. The non-area branch is the
  shipped body, untouched.
- `.../PlantController.ts` — `pot` optional; when absent, the target is
  the giver's container if `MixinApi.isSoil(room) && !isCultivable(room)`
  (ground you stand on); the area branch: `seed.getGrowsIntoPath()` →
  the plant row's profile must author `seedRateKgPerM2` (else refuse
  *planted one at a time*); `room.sowingRefusal()`; the title gate (D6);
  existing crop of the same kind → `addSownAreaM2`, different kind →
  refuse; seed mass consumed; first act clones, moves into the room
  (contents), stamps title to the operator, captures. Engaged (duration
  `SOW_HAND_M2 × 60 ms`, cost 5). The pot branch is the shipped body.
- Views: `plant.yaml` (`pot` `required: false`, help rewritten for a
  field), `harvest.yaml` (tool default
  `reachable:[capability.reaping]|[capability.cutting]`; help for the
  swath).
- Settings: `husbandry.handSwathM2 = 10` in `settings/husbandry.yaml`
  + `AppSettingKeys`.
- Tests (near): `Growing.test.ts` (getBed by containment; yield
  arithmetic; takeSwath exhaustion; decline), `HarvestController.test.ts`
  (area branch mints by mass; nutrient pro-rata; monocarp ends at the
  last swath), `PlantController.test.ts` (no-pot → room; refusal from
  the hook; seed mass; accumulation; different-kind refusal).

**Acceptance:** a `Plant` moved loose into a `SoilMixin(ReservedMixin(
Location))` test host reads its moisture; a bed plant's `getBed()` is
unchanged; a sickle-less harvest on an area crop mints the hand swath's
worth. **Commit:** `build(cover W0): ground is a bed by containment;
harvest and sow work by area`.

#### W1 — the field: seedbed, crop, the look, plough and grub

*Implements D4 (field half), D5 (grub), D6 (title at adopt), the
presentation.* Files:
- `packages/content/trade-farming/src/location/Field.ts` — persistent
  `seedbedStamp`; `getCrop()` (first contents occupant `isGrowing &&
  isAreaCrop()`); `cropAreaM2()`; `swardAreaM2()` becomes `areaM2 −
  cropAreaM2()`; `sowingRefusal()` override; `isSeedbedFresh()`;
  `turnUnder()` (draw sward → organic matter, stamp); `bankWork`
  override ending a standing crop on `clearing`; `ensureCropTitle()` (called by `sow`, `onCreate` and the harvest, awaited before the mint; ⛔ never from the augmenter);
  `static markupAugmenters = [fieldAugmenter]` rendering, in words only:
  the sward band (`swardPhrase()`), the crop (`cropStagePhrase` +
  `cropAreaPhrase`, *cut down to the stubble* when a crop ended and the
  sward is still `bare`), *ploughed for the season* while the seedbed is
  fresh and unsown. ⚠ Verify at build that `markupAugmenters` is
  collected for a `Location` host (the `Growing` augmenter rides a
  Thing); if not, render through `presentationPhrase`/`describeFor` the
  way `Locale` details do — find the shipped seam before writing one.
- `.../idea/cmd/farming/PloughController.ts` — after the clearing
  branch: the three refusals/acts of D4; `finish` narrates *"The grass
  goes under in long dark slices. Ploughed for the season."*
- Tests: `Field.test.ts` additions (turnUnder → OM up, sward 0;
  seedbed refusal; crop ends on grub; sward area shrinks under a crop),
  `PloughController.test.ts`.
- **Live stage:** campus: `get plough` → `plough` ×2 (second refused)
  → `sow wheat` (a test sack via `clone`) ×N → `look` → jump 120 days
  via the test clock → `look` names the stages → `harvest wheat` by hand
  and with a billhook-less refusal path.

**Commit:** `build(cover W1): the field holds a crop — seedbed, plough
turns the sward under, look reads it in words`.

#### W2 — cane: ratoons, the bundle that plants, Waponi's pieces

*Implements D5 (decline), D15 (sugar half), the Waponi collision.* Files:
- `packages/content/trade-sugar/content/trade/sugar/thing/plant/cane.yaml`
  — `profile.seedRateKgPerM2: 0.8`, `yieldRatio: 10`,
  `yieldDeclinePerCycle: 0.12`, `harvestTool: reaping`.
- `packages/content/trade-sugar/src/thing/CaneBundle.ts`
  (`PlantableMixin(Crop)`); `thing/crop/cane.yaml` → `class:
  /trade/sugar/thing/CaneBundle`, `growsIntoPath:
  /trade/sugar/thing/plant/cane`; delete `thing/seed/cane-sett.yaml`.
- `thing/cane-knife.yaml` (Tool, `capabilities: [reaping, cutting]`,
  `swathM2: 30`, 0.9 kg, iron).
- Waponi: the four field rows' `props:` become one crop each —
  `{ template: /world/terminus/waponi-woo/thing/standing-cane }` with
  `standing-cane.yaml` gaining `sownAreaM2` (cane-piece 7,000, lower
  6,500, smallholdings 1,000 / 800) and `_cycleCount: 2` (established
  ratoons); cutter rows get a cane knife in `costume`/props (the cutters
  must hold the tool: `cuts` issues `harvest cane` and the view's default
  binds a reachable reaping tool); `estate.yaml` keeps operating the two
  pieces (the crop stamps to the estate; the smallholders' crops stay
  untitled → the smallholder's own take, as today).
- `cuts.test.ts` + a `CaneBundle` row test; `trade-sugar` vitest.
- **Live stage:** Waponi: `look` reads an established ratooning crop;
  watch a cutter cut a swath and carry bundles (real time, working
  hours); jump 120 days; the piece has regrown and the cutters cut
  again.

**Commit:** `build(cover W2): cane ratoons on the island — the bundle
plants, the knife cuts a swath, the pieces hold one crop each`.

#### W3 — wheat at Hearts Delight, the store, the whose-crop gate

*Implements D6 (gate), D15 (farming half).* Files:
- `trade-farming/.../thing/plant/{wheat,barley}.yaml` —
  `seedRateKgPerM2: 0.015`, `yieldRatio: 6 / 7`, `harvestTool: reaping`;
  `thing/seed/{wheat,barley}.yaml` `mass: 25`; `thing/sickle.yaml`
  (`[reaping]`, `swathM2: 40`); `thing/scythe.yaml` gains `swathM2: 60`.
- `hearts-delight/.../upper-bench.yaml` — one wheat prop with
  `sownAreaM2: 3000` (a new `bench-field/thing/standing-wheat.yaml`
  extending the plant row, authored `established`, so the drive's step 1
  reads a stage and step 9 ripens on a jump).
- `terminus/.../general-store/counter.yaml` — stock lines: sickle, cane
  knife, scythe, seed wheat, seed barley.
- `PlantController` title gate (D6) lands here with its test; the
  `sow`-refusal drive line (*"not yours to sow"*).
- **Live stage:** general store `buy sickle`, `buy seed wheat`; the
  bench: `harvest wheat` as a stranger → the sheaf is the farm's
  (`chattelOwner()` = farm-business); `sow wheat` refused.

**Commit:** `build(cover W3): wheat on the bench, the store sells the
hand tools and the seed, another's crop is theirs when you cut it`.

### Stage B — grazing

#### W4 — the field feeds: the grazing ledger, the trough, the rick

*Implements D8 (field half), D11.* Files:
- `packages/server/src/mud/lib/husbandry/Feeder.ts` — authorable
  `suppliedBy` (identity path); `drawFodder(kg): number` (edible
  contents by mass, then the supply container's edible contents; mass
  off with `setMass`, `void StuffApi.destruct` at 0); `noteFilledBy` is
  finally called by `PutController` when the target `isFeeder` (one
  line; the shipped field gets its writer).
- `trade-farming/src/lib/Sward.ts` — `@hook swardShortfallFed(kg):
  number` default 0; inside the step loop: `shortfall = demand×dt −
  eaten; fed = shortfall > 0 ? host.swardShortfallFed(shortfall) : 0`;
  the integral reports `{ grazed, fed, demandDays }` to a widened
  `onSwardIntegrated(grazedKg, days, fedKg)`.
- `Field.ts` — `grazers` field + `setGrazer/clearGrazer/grazerLedger/
  grazerIds`; `swardGrazingDemandPerGameDay()` = Σ entries' demand (+ the
  shipped occupant probe, unchanged); `swardShortfallFed` draws from
  Feeders in contents whose kind any grazer eats from; `onSwardIntegrated`
  apportions `(grazed + fed)` by demand into each entry's `fedDays`;
  the look augmenter adds *"<n> head of <herd name> grazing it"* lines
  (the name is stored in the entry: `GrazerEntry.label`).
- `MowController.ts` — mint `ceil(taken/25)` bales of ≤ 25 kg.
- Rows: `trade-farming/.../thing/rick.yaml` (a hay store: a fixed
  `Container` Thing — reuse the shipped shelving/rack fixture class the
  tool rack rides, `ToolRack`'s base, or the generic
  `/stuff/thing/fixture/…` storage class; the build picks the shipped
  one and names it in the plan's drive record) .
- Tests: `Sward.test.ts` (shortfall hook called per step; fed share),
  `Field.test.ts` (ledger apportioning; trough draw; supply draw-through
  when empty), `Feeder.test.ts`, `MowController.test.ts` (bale count).

**Commit:** `build(cover W4): the field feeds its grazers — the
ledger, hay from a trough, a trough that draws on the rick`.

#### W5 — the herd eats: intake, condition, `move`, the fodderer

*Implements D8 (record half), D9, D10, D13, D14.* Files:
- `packages/server/src/mud/platform/idea/species/Species.ts` —
  `dryMatterIntakeKgPerDay()`.
- `trade-ranching/src/idea/HerdRegistry.ts` — `HerdRecord.grazing?`,
  `fed?`; `herdOf` parses them; `setGrazing(herdId, path | null)`,
  `foldFed(herdId, fraction, nowS)`.
- `src/lib/HeadSeed.ts` — `conditionAfter(flesh, fedFraction, days,
  frame): number` (the two legs of `partitionFlesh` over the equivalent
  satiation, D10a+c), `@internal`.
- `src/thing/Herdbook.ts` — authorable `grazing:`; `onCreate` applies it
  once (record has no `grazing` → resolve the field by template path →
  `setGrazer` + `setGrazing`); `look herdbook` reads *on the home field
  / on no field, eating nothing*.
- `src/idea/cmd/ranching/MoveController.ts` + the view
  `content/trade/ranching/cmd/ranching/move.yaml` (D13); `Herdbook` and
  `Livestock` `commandContributions` gain it.
- `DraftController.ts` — before `adjustReserve('flesh')`: fold the open
  ledger of the herd's field into `fed`, compute `conditionAfter` from
  the overlay/seed flesh since the overlay's stamp (a new
  `HeadOverlay.fleshAt?` stamp written by `return`), apply.
  `ReturnController.ts` writes `fleshAt`.
- `src/agent/Livestock.ts` — `integrateSlice` override (D10b):
  resolve the container; if it is a `Field` (import the class type from
  `@saxonberg/content-trade-farming`) with an entry for `herdId`, ingest
  the slice's ration scaled by the head's tail factor (`frame` is
  re-derived from `HeadSeed.sample` — cheap, hashed).
- `src/behavior/fodders.ts` (D14) + its test (pure `next()` over a read,
  the `cuts` shape).
- Species rows (`trade-ranching/content/stuff/idea/species/.../bos/taurus.yaml`,
  `ovis/aries`, `capra/hircus`, `gallus/domesticus`) — `feedingStyle:
  [graze, trough]` (hens `[ground, hopper, graze]`); confirm `adultMass`
  on each (`lint:kept-animals`).
- Tests: `herdbook.test.ts` (grazing applied once; fold), `move.test.ts`
  (gate: holder · staff on shift · stranger; outside home refused),
  `livestock-graze.test.ts` (a drafted head on a fed field holds flesh;
  on nothing it thins; production stops before death), `HeadSeed`
  condition derive (the same heads thin), `fodders.test.ts`.
- **Live stage:** campus: `move college herd to home field`; `look
  field` shows six head; jump 14 days summer → band `short`; `draft 2`,
  `handle` → holding; jump to winter with no hay → thinner, the frame-
  low heads thinner; `put hay in trough` ×n → jump 14 days → holds, the
  trough empties.

**Commit:** `build(cover W5): the herd eats what its size says — move,
the fed ledger reaches the flesh, the tail is seeded, the fodderer`.

#### W6 — every authored herd is fed: the venues

*Implements D12, D15 (venue half), the collisions.* Rows only:
- **Campus:** `home-field.yaml` `areaM2: 10000`; `campus-farm/thing/trough.yaml`
  → `class: /platform/thing/Feeder`, `feederKind: trough` (the stone
  trough holds hay as well as water); `thing/hay-barn.yaml` → the rick
  class (a store), description kept; the yard's trough **moves to the
  field's `props:`** (a trough on the field is what the field's integral
  reads) — the yard keeps the barn; `herdbook.yaml` `grazing:
  /world/terminus/eternal/campus-field/location/home-field`. No
  `suppliedBy` (the player forks hay; the two labourer seats are theirs).
- **Hearts Delight:** new `dairy/location/pasture.yaml` (`Field`,
  12,000 m², `legumeFraction: 0.3`, exits to yard; props trough with
  `suppliedBy` the byre's rick) + `dairy/thing/rick.yaml` in the byre;
  `dairy-book.yaml` `grazing: …/dairy/location/pasture`, `calf-register`
  likewise, both `homeExtent: /world/terminus/hearts-delight/dairy`;
  the dairy business operates the pasture; the dairy lad's row gains
  the `fodders` brain (meadow: the pasture's own far end is NOT mown —
  the lad mows `lower-meadow`; words in config). New
  `bench-field/location/lower-meadow.yaml` (6,000 m², the oxen's and
  calves' summer ground is the dairy's; the oxen + hens graze the lower
  meadow: `ox-book`/`hen-book` `grazing: lower-meadow`, `homeExtent:
  /world/terminus/hearts-delight`); `orchard-close.yaml` `areaM2: 3600`
  (+ `pack.yaml` title `areaM2: 3600`) with a trough supplied by the
  barn's rick, `flock-book.yaml` `grazing: orchard-close`, `homeExtent:
  /world/terminus/hearts-delight`; `barn.yaml` gains a rick (the eight
  wheat sacks stay — the farm's harvest); Odell's row gains `fodders`
  (meadow lower-meadow → barn rick → the close's trough) and his seat
  stations at the yard; `farm-business.yaml` operates lower-meadow and
  orchard-close too. `upper-bench.yaml` keeps the wheat (W3).
- **Rejection:** `kestrel-road/goat-pen.yaml` → `class:
  /trade/farming/location/SingletonField`, `areaM2: 400`, `groundSpot`
  authored, a trough with `suppliedBy` a rick prop in the pen;
  `goat-book.yaml` `grazing: …/goat-pen`; the provisioning business's
  hand (find the rostered Cast in `idea/provisioning-business.yaml`) gains
  `fodders` with the road verge as the meadow — if no mowable field
  exists on the road, the rick is seeded with authored hay bales and the
  brain only fills (the `rejection` pack must add
  `@saxonberg/content-trade-farming` + `trade-ranching` to
  `package.json`; ⚠ `pnpm install` after — the pack-rename rule).
- `lint:location-graph`, `lint:untitled`, `lint:openings` all run.
- **Live stage:** boot fresh; `look` each pasture; `draft` a cow at the
  dairy after a jumped winter month → `milk` → milk comes; the goats
  read *in fair condition*.

**Commit:** `build(cover W6): every authored herd stands on a field
sized to it, with a trough and a rick behind it`.

#### W7 — the drive, the moved drives, the docs

*Implements D16.* Files:
- `packages/wire/tests/cover.dirty.wire.test.ts` — the requirements'
  19 steps as checkpoints that can fail (assert the envelope's reason
  and prose, never "defined"). Jumps via `advanceWorldClock`; the Waponi
  cutters and the Hearts Delight fodderer are watched in **real time**
  during working hours (step 10, step 18's hay-in-the-rick precondition
  is established by the lad's beat before the winter jump).
- `farmstead.dirty.wire.test.ts` l.146–168 — `mow` still refuses on
  day one (unchanged prose); `plough` now matches *"ploughed for the
  season|traces over your shoulders|want a plough"* and a second plough
  matches *already ploughed*.
- `sugar.dirty.wire.test.ts` steps 15/17 — `harvest cane` now engages
  (await completion; the harness's `act` already waits on `act.deed`
  completion for engaged acts — verify) and may mint several bundles
  per swath; step 18 unchanged in intent (the estate shelves blocks).
- `dairy.dirty.wire.test.ts` — no step changes; re-run because the
  cows now have an intake.
- Docs: `docs/subsystems/soil.md` (the crop row has a producer; the
  graze row has a mouth), `husbandry.md` (getBed by containment; the
  area crop), `ranching.md` (the cascade has an input; the tail),
  `taps.md` (the relief: hay is the input milk waits on), `spatial.md`
  no change; `CLAUDE.md` map blurbs are ONE line and are left to the
  sweep.

**Commit:** `drive(cover): <what driving found>` then `docs(cover): …`.

---

## Reachability wiring

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| sow a field | `sow`/`plant` (platform, shipped) | `CultivableMixin.peers` (shipped) — ⚠ a FIELD affords nothing: add `plant.yaml` to `Field.commandContributions.inventory` (trade-farming names a platform view: allowed, the `plough` precedent) | the plant row's `seedRateKgPerM2`; the seed row's `mass`; the store's stock line | none | `seed` requires `PlantableMixin`; `pot` optional — a required arg with no default fails closed, so `required: false` is the whole fix |
| harvest a swath | `harvest`/`pick` (shipped) | `Plant.peers` (shipped; the crop stands in the field's contents) | `swathM2` on the sickle/knife rows; `harvestTool: reaping` on the crop rows | none | `tool` default widened to `reaping|cutting`; with no reaping tool reachable, bare hands (the default is optional) |
| ratoon decline | — | — | `yieldDeclinePerCycle` on `plant/cane.yaml` | none | — |
| plough the seedbed | `plough` (shipped) | `Field.inventory` (shipped) | — | none | tool `ploughing` (shipped) |
| grub out a crop | `grub` (kernel, shipped) | `ImprovableMixin` (shipped) | — | none | — |
| the crop's title | — | — | the operator business's `operatingLocations` must name the field (campus ✓, Hearts Delight ✓ bench; W6 adds the pastures) | the Business stands up lazily — the harvest awaits `ensureCropTitle()` before minting (never a look path) | — |
| `move <herd> to <field>` | `move` (new, ranching) | `Herdbook.environment+peers`, `Livestock.peers` | `homeExtent` on the book/record; `fieldName` on the target | none | both args strings (no mixin binder) — the controller resolves and refuses in words |
| the herd's intake | — (reconcile-on-read) | — | `grazing:` on the book; `feedingStyle` + `adultMass` on the species rows | ⚠ **none needed**: a field reconciles when read, and the drive's first `look`/`draft` after a jump reads it; nothing must be `boot:`-listed for the integral to run | — |
| hay in the trough | `put hay in trough` (shipped `put`) | `Feeder` is a Container (shipped) | trough row's `feederKind`; `suppliedBy` on venue troughs | none | `put` targets a Container (shipped) |
| the fodderer | `mow`, `get`, `put`, `go` (shipped, by word) | the brain on the Cast row's `behaviors:` | config words; a scythe in the hand's costume/props | ⚠ Hearts Delight is not booted: the brain beats only while the valley is loaded. Honest for the drive (it watches in real time before the jump) and for play (the rick is what the jump eats) — see R2 | — |
| the cane bundle plants | `sow` | as above | `growsIntoPath` on `crop/cane.yaml` via `CaneBundle` | none | `PlantableMixin` on the bundle class |

---

## Acceptance-criteria coverage

| requirements AC | wave |
|---|---|
| a field shows its crop in words; stages advance over the season | W1 (augmenter), W0 (stage phrases) |
| `plough` readies one season, refused a second time; `sow` refused unploughed and on another's field | W1 (seedbed), W3 (title gate) |
| a third of the seed → about a third sown → about a third of the yield | W0 (D2 arithmetic) |
| each `harvest` takes an area and gives goods in proportion; a sickle more than hands; many acts | W0 (D3), W3 (sickle row) |
| grade = worst stretch | W0 (shipped `bandFor`, unchanged) |
| nitrogen lower after a crop | W0 (`drawNutrient` pro-rata on a field — the bed was null before) |
| once-cropped → stubble, grass returns next season | W1 (monocarp end; sward regrows from bare) |
| cane regrows, keeps yielding past 120 days, declines across ratoons, replants from cut cane | W2 |
| hired hand's / stranger's goods belong to the holder; theft on the record | W3 — **R1: the second half is a derived record, not a written one** |
| `move` puts the herd on the field; refused to non-keepers and outside the home holding | W5 |
| a hired campus labourer on shift may sow and move; off shift may not | W3 + W5 (`isOnShiftFor` farm-unit) |
| the grass band falls under a herd, recovers when it leaves | W4 |
| no grass + no hay → thins, stops producing, nobody dies; hay in a trough → holds, trough empties | W4 + W5 (`partitionFlesh` is non-lethal, shipped) |
| some heads thinner, the same ones every time | W5 (D10c, `frame`) |
| a herd on a harvested field eats the stubble | W4 (stubble = sward regrowing from bare: the band reads it) + W5 |
| no player for a winter month: the dairy still milks; the goats are not thin | W6 (rick + `suppliedBy`) — **R2** |
| the store sells sickle, cane knife, scythe, seed wheat, seed barley | W3 |
| Waponi's estate still shelves blocks a season in | W2 + the sugar drive step 18 (W7) |

Nothing unmapped.

---

## Test & gate strategy

- **Unit (near):** every W0–W5 file above has a `__tests__` sibling;
  the kernel tests use `test-bootstrap` (`lint:test-bootstrap`). The
  Sward/Field ledger tests drive the integral with a fixed demand and
  assert fed fractions per step — the ratchet `lint:reconcile-chains`
  wants the draw inside the loop, which these tests pin.
- **Only the drive can prove:** the affordance chain (`sow` on a field
  with no pot named; `move` from the byre and beside a head; the sickle
  binding by default), the title derivation through `followCustody`
  (async, fire-and-forget), the stage phrases over a real season jump,
  the fodderer's beat, and the unobserved month.
- **Gates:** `pnpm -C packages/server lint:family` after every wave.
- **`pnpm test` runs exactly twice:** at code-complete (the MR opens
  READY first; the suite runs alongside review) and at `/finalize`.
  Between: `pnpm test:near` + `pnpm -C packages/content/<pack> test` for
  trade-farming, trade-ranching, trade-sugar, and the venue packs.
- ⚠ `WIRE_PORT` per worktree (build-1 = 2014) and the drive world's
  memory: hold the server only while driving; tear down by PID.

---

## Risks & opens

**R1 — "recorded as theft" cannot be built as written.** The
requirements (Goals, AC) say the stranger's taking "is recorded as
theft". The shipped doctrine (`chattel.md` l.291–296; `GetController`
l.489) is that a taking is *permitted and derivable*: the sheaf stays
titled to the operator and the stranger holds it — custody without
title IS the record, and the appeal is the chattel record (which is
exactly what the requirements' lens-7 line says). Inventing an
accountability `kind: theft` was explicitly declined by the mortality
build as a courts-work ruling, and a cross-cutting capability must not
be settled inside a trade build. **Recommend** the requirements sentence
becomes *"harvesting another's standing crop is permitted; the sheaf
stays the holder's, and the chain of title shows who holds it"*, and
AC: *"the stranger's sheaf reads as the farm's when examined"*. The
plan builds that. If the owner wants a written theft record, that is a
return to Phase 1 and a governance decision, not W3.

**R2 — "staff fill the trough in winter" is not what feeds a jumped
month.** A clock jump runs no brain (behavior.md l.636). The honest
mechanism is D11: the venue's trough draws on the rick the staff
stacked in season, and the staff visibly fork hay only while the valley
is loaded. **Recommend** the requirements line becomes *"the venue's
staff mow hay in summer and keep the rick stacked; the trough is kept
from the rick, so the dairy keeps giving milk with nobody watching"*.
The drive's step 18 then watches the lad mow before the jump (real
time) and jumps the month. ⚠ If the owner rejects the draw-through as
the engine doing the staff's job, the alternative is a boot-listed
Hearts Delight whose brains beat in real time — which still cannot
cover a jumped month, so AC 18 would have to drop the jump.

**R3 — "`move` … on the field where it stands".** A `Field` is
farming's class and cannot name a ranching view (dependency direction;
a missing view is a silent affordance). The plan affords `move` at the
herdbook and beside a **drafted head** of the herd. A keeper standing
in an empty field must go to the book or draft one. Accepting this
wording ("at its herdbook or beside one of its animals") is the user's
call; the alternative is a kernel protocol for a place to afford
another pack's verb, which is a cross-cutting build.

**R4 — a group cannot own chattel.** The campus field is held by the
group `duncan-hall`; the crop is stamped to the farm-unit Business (its
operator). "The crop belongs to whoever holds the field" is realized as
*whoever operates it*, which is the same person at every shipped venue.
State it in the docs sweep; no code answer exists short of a chattel
build.

**R5 — `markupAugmenters` on a `Location`.** Unverified whether the
look pipeline collects a Location's augmenters as it does a Thing's.
W1 checks first; if not, the field's lines ride the shipped `details:`/
`describeFor` seam. Do not add a kernel seam for it without the
check.

**R6 — the engaged `harvest` changes the sugar drive's timing.** `cuts`
issues `harvest cane` through `executeCommand` and then the errand on
the next lines; with an engaged act the bundle is minted at completion,
so the brain's `holding` read is false until the swath ends — the next
beat carries it (correct, one beat later). The drive's step 15 must
await the completion (the harness waits on `act.deed`; verify).

**R7 — orchard close area is titled.** `pack.yaml` carries `areaM2:
1200` for the close; resizing to 3,600 changes a title row. A fresh
world is the only world (no migrations); note it in the commit.

**R8 — hens.** Six hens graze with the flock under D12 for want of a
grain line; their intake is ~1 kg/day and the hopper-fed version waits
on a feed-grain consumer. Grain, recorded.

**R9 — NPC position after a clock jump is nondeterministic** (memory):
the drive asserts the hay is IN THE RICK before the jump, not where the
lad is after it.

✅ **R1–R4 ACCEPTED by the owner, 2026-10-28**, and the requirements reworded to match (R1 no written theft record · R2 the rick carries the unwatched month · R3 `move` at the herdbook or beside a drafted head · R4 the Hearts Delight pastures, campus field and goat pen). **Must the build stop for any of these?** No — R1–R3 are wording
decisions the plan already resolves one way; the build proceeds on the
plan's reading and the MR description names the three. The user can
reverse any of them in review (R1 is the only one with a non-trivial
code consequence).

---

## Deferred seams

- **The kernel `Cover`** (sward + stand as one growing stock on species
  rows) → cover slate § 4. The field's `swardAreaM2 = area − crop` is
  the attach point.
- **Weeds, crop disease, continuous-cropping penalties** → cover slate
  Left.
- **Paddocks, gates, the escape, the hired hand's grazing cadence and
  utilization penalty, the sward stick** → ranching slate Left. The
  `GrazerEntry` ledger is what a cadence would read.
- **Breeding / `bornAt`** → ranching slate § Breeding (untouched).
- **Seed drills, reapers** → the `swathM2` field is the attach point; a
  row, no code.
- **Foraging** → discovery slate: `Plant.harvest` and `ripeSibling` stay
  (D7); the infirmary herbs are foraging's first loose plants.
- **Hay quality by band** (stemmy grass is poorer hay; crude protein
  from the sward band) → ranching slate; `MowController` already
  derives N from protein — the band multiplier is one line there.
- **The herd's satiation feeding milk directly for the undrafted
  tally** → the `fed → flesh` derive is the seam; production reads
  flesh today.
- **A place affording another pack's verb** (R3) → command-taxonomy
  slate.
- **A written theft record** (R1) → governance/courts work.

Leave as slate entries at the sweep; nothing above is a plan section.

---

## Critical files

Read first, in this order:

1. `docs/requirements/cover-requirements.md`
2. `docs/slates/builds/cover-slate.md` §§ 8–10
3. `packages/server/src/mud/lib/husbandry/Growing.ts` (getBed, the
   fruit cycle, the field list)
4. `packages/server/src/mud/platform/idea/cmd/inventory/HarvestController.ts`
   and `PlantController.ts` + their views in
   `packages/content/platform/content/platform/cmd/inventory/`
5. `packages/content/trade-farming/src/location/Field.ts` and
   `src/lib/Sward.ts`
6. `packages/content/trade-farming/src/idea/cmd/farming/{Plough,Mow,FieldWork}Controller.ts`
7. `packages/server/src/mud/lib/husbandry/{Soil,Feeder,Plantable}.ts`,
   `lib/craft/Tooled.ts`
8. `packages/content/trade-ranching/src/{thing/Herdbook,idea/HerdRegistry,lib/HeadSeed,agent/Livestock}.ts`
   and `src/idea/cmd/ranching/{Draft,Return}Controller.ts`
9. `packages/server/src/mud/lib/metabolism/Metabolic.ts` l.860–1090
   (`integrateSlice`, `partitionFlesh`, `METABOLIC_DEFAULTS`)
10. `packages/server/src/mud/platform/idea/api/ChattelLogic.ts`
    l.200–330 (`followCustody`, `derivedTitle`) and
    `packages/content/water/src/thing/IceSheet.ts` l.460–480 (the
    on-shift owner precedent)
11. `packages/content/trade-sugar/src/behavior/cuts.ts` (the brain
    shape the fodderer copies)
12. The content: `waponi-woo/.../location/cane-piece.yaml`,
    `hearts-delight/.../bench-field/location/{upper-bench,orchard-close}.yaml`,
    `hearts-delight/.../dairy/location/{yard,byre}.yaml`,
    `hearts-delight/.../idea/{farm,dairy}-business.yaml`,
    `eternal-university/.../campus-field/location/home-field.yaml`,
    `eternal-university/.../campus-farm/{location/yard,thing/herdbook,idea/farm-unit}.yaml`,
    `rejection/.../kestrel-road/goat-pen.yaml`,
    `terminus/.../general-store/counter.yaml`
13. `packages/wire/tests/{farmstead,sugar,dairy,taps}.dirty.wire.test.ts`
    and `packages/wire/src/harness/world.ts` (`advanceWorldClock`)
14. `docs/subsystems/{soil,husbandry,ranching,taps,behavior,employment,chattel}.md`

---

## Build record — waves and the decisions the build made

*(written during `/build`, 2026-10-28; each line says what decided it)*

**Waves.** W0 `736498927` · W1 `79bb513f2` · W2 `d3bb5cfa5` · W3
`c5fefb76a` · W4 `4ac51e7ac` · W5 `02f10cab9` — W6 and W7 below. Field's
grazing ledger (W4) landed inside W1's `Field.ts` commit; W0's commit
carries the cane-sett deletion that is W2's.

**Decisions beyond the plan:**

- **B1 — the hand swath is 2 m², not 10; the cane knife's is 4 m², not
  30.** Cane yields ~90× wheat per m², so 30 m² of cane is eight 30 kg
  bundles a stroke (three froze every cutter in sugar drive 8), and a
  10 m² hand swath out-cut the knife. Work per acre is still the tool's
  number. *Lens: immersion (a stroke is a bundle).*
- **B2 — what a harvester cannot carry is left lying in the row**
  (`wouldExceedCeiling`), and the LAST swath makes up the remainder as one
  short good, so nothing is lost to rounding.
- **B3 — a sowing cast is 400 m² (a strip across the field), 3 s + 10 ms
  per m²**, not 100 m²: a sack of seed wheat sows 1,667 m² in about four
  casts rather than seventeen.
- **B4 — the title gate is asked BEFORE the seedbed**, so a stranger is
  told the ground is not theirs, never that it wants ploughing. ⚠ It reads
  the field's identity by its EXPLICIT key only: a keyless host stashes a
  scope-derived owner where the key goes, which resolves to no parcel —
  the first live probe found a stranger allowed onto the university's
  field that way.
- **B5 — `ensureCropTitle` is a `Soil` @hook** (default: nothing to
  settle) so the kernel's harvest and sow can await it; the field is the
  only override. An ARRIVING crop takes only a LIVE operator (no house is
  stood up by an arrival); the acts stand it up lazily.
- **B6 — the crop drinks the field per square metre standing**
  (1.2 L/m²/day, a full sward's figure): a row's `litresPerGameDay` is one
  plant's.
- **B7 — ploughing under adds `kg/area × 3` points of organic matter**
  (a full sward ≈ one point), not `kg × 0.0003`, which was negligible.
- **B8 — ⭐ a destructed controller's method is a silent no-op**, so
  `grub`, `ditch`, `lime`, `plough`, `mow`, `flatten` and `crack` never
  landed their effect in a live game (their begin prose played). The
  completions are statics now; `lint:completion-this` 7 → 0. Found because
  D5 needs `grub` to end a crop.
- **B9 — cane's `fruitFillDays` 5 → 120.** The five days stood in for the
  rotation round the piece; with area cutting the area IS the rotation,
  and the fill is the ratoon regrowing once the last of the piece is down.
- **B10 — a piece's crop is an `extends:` row per piece** (props carry no
  data overrides). Pieces and the bench drop the crop's words from their
  OWN keywords (`cane`, `wheat`, `corn`) — `harvest wheat` bound the field.
- **B11 — the herd's fed history is a capped list of windows**
  (`fraction, days, end`, 24 kept), not `{ fraction, stamp }`: a head's
  condition replays the windows after its own last-known flesh
  (`HeadOverlay.fleshAt`, written at return).
- **B12 — the drafted head's feeding overrides `partitionFlesh`**, not
  `integrateSlice` + `ingest`: the ingest path is litre-capped for a
  person's stomach and re-enters the reconcile. The body takes the herd's
  fed share × its tail on the same two legs the tally replays — one rule.
- **B13 — `move` names the herd** (or the only one filed); it never walks
  the room for a book (`lint:instrument-args`). The record carries
  `bookPath`, written by the book, and `graze` tells that book where the
  herd went — the book's `look` line.
- **B14 — the rick is a pack class `Rick = StagedMixin(Vessel)`** so a
  venue's rick row can declare its stacks; `hay-stack` is a 400 kg stack
  drawn by weight. ⚠ Not `Crate` (Circulating would census and respawn
  it), not `Stockpile` (its ledger would fight a mass draw), not `Chest`
  (a lid).
- **B15 — the fodderer waits in the meadow**, forks only into a trough it
  stands beside (the dairy's rick and trough stand together at the head of
  the pasture), and is the dairy lad's alone. The farm's and the goats'
  ricks are seeded stacks; the unwatched month is the troughs'
  `suppliedBy` (R2). Odell and Rejection's hand run no fodderer.
- **B16 — new places:** the dairy pasture and hay meadow, the lower
  meadow, and the campus BACK PADDOCK (a rotation needs two fields: the
  drive moves the herd off the home field and back onto its stubble —
  lens 1). The yard's stone trough stays the campus WATER (the farm
  archetype's slot); the home field gets its own hay trough.
- **B17 — every authored field is a `SingletonField`.** A plain `Field`
  is a KIND: an exit or a pointer resolving it by path mints a stray
  instance, and the bench's crop vanished that way on the first probe.
  `lint:location-graph` destination-is-a-kind 2 → 0.
- **B18 — the plough lives at the field's headland** (42 kg by its bill;
  a fresh body cannot lift it), and the view's default binds a plough
  within reach after one in hand. The drive's step 3 is "`plough` in the
  home field". The farmstead drive had been matching the refusal.

## Drive record

*(appended at build time, not at plan time)*
