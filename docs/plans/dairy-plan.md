# Dairy — implementation plan

Executes [dairy-requirements.md](../requirements/dairy-requirements.md).
**Kind:** feature (a trade, and the venues it belongs to) · **Leads
from:** content · **first consumers of the four kernel seams:** milk
(spoils), the cheese vat (a live ferment holds off rot), the wheel (a
solid that ripens), the dairy book (a herd that comes back into milk).

What is built: a `trade-dairying` capability pack whose products are
ROWS over shipped substrate — a setting pan and a churn that are
**fractionating** vessels (the volume-drawn twin of maturation already
ships `separation: fractions`, which is a pan with a plug at the bottom),
a cheese vat that is a `Vat`, a hoop that is a by-hand build vessel with
its own terminal verb (`mould`), a wheel that is a `Provision` composing
a new kernel `RipeningMixin`, and three milks whose cream and curd yields
**derive** from their own fat and protein. Six small kernel seams carry
it (a spoilage hold, a batch rekey on a pour, a scald mark, a composition
share, a rest gate on a fraction schedule, a sex/rest pair on a tap), one
ranching wave gives the herd a sex and a dry period, and three venues
prove the second-venue claim with rows.

---

## ⚠ Requirements conflicts (read first)

Grounding found six places where the requirements, as written, cannot be
met by the code that exists. None reopens scope; each is resolved below
and the resolution is named so the user can veto it.

1. **"The co-op is already the valley's governing body."** It is not, in
   content. The Delight's `Government` row is *the Heart's Delight
   Parish* (`world-seed/.../Government/hearts-delight.yaml`: one
   department, one seat — the Warden of the Ways); the only `coop-business`
   row in the realm is Rejection's Ferrow mining co-op. "The co-op" exists
   in `settlement-model.md` (lines 652/697) as design prose. **Resolution
   (D14):** the creamery is held by a new `Business` row,
   `/world/terminus/hearts-delight/idea/creamery-coop`, appointed by its
   own cast (the creamery keeper), and the creamery extent is titled to it
   in `pack.yaml` (the orchard-close precedent). The "sanction" stays
   prose, which the requirements already allow ("this build adds no new
   governance").
2. **Drive step 10, `heat vat` … `measure temperature vat`.** `heat`
   (`HeatController`) requires a `ManualBuildMixin` target and **latches a
   build heat**; it does not raise the matter's temperature, and the
   thermometer reads the thermal temperature. On a `Vat` the verb is
   refused ("Heat what?"). **Resolution (D6):** `heat` gains a second arm —
   a Thermal, Containable, non-build vessel is PLACED on the reachable lit
   furnace (`ContainmentApi.place`, the furnace couple), so the milk
   actually warms and the thermometer reads it. The drive stays verbatim.
   The alternative (rewrite step 10 as `put vat on hearth`) is recorded.
3. **Drive step 3, `wash pail`.** `wash`'s target arg is `requires:
   CraftedMixin` and the commons pail is `/platform/thing/Receptacle`
   (`ThermalMixin(BulkableMixin(Good))`) — not Crafted, not Contaminable.
   Today the step is refused by the binder before any controller runs.
   **Resolution (D11):** the pail row re-classes to
   `/platform/thing/CraftVessel` (food equipment: washed, serviceable,
   carries a surface load). Same closure, same capacity.
4. **AC 9 (rennet from a young head) has no drive step**, and
   `Species.butcheryYield` has no age — a line is a species fact. **Resolution
   (D8):** a kernel `ButcheryYield.maxAgeDays` + the vell line on the cow
   and goat; the dairy farm keeps a **calf register** (a second small
   herdbook) so a young head exists to butcher; AC 9 is proved by a unit
   test over `dressOut` and a world test, and the drive gains one optional
   checkpoint after step 4 (slaughter a calf at the farm block → a vell).
5. **Drive step 23, "the accountability read."** `chronicle <person>`
   refuses to read another PLAYER's chronicle (the view's own help), and
   both parties in step 22 are players. **Resolution (W5):** the milker reads
   `chronicle` (their own deeds) and the authoritative checkpoint reads
   `AccountabilityApi.blameFor(<victim identity>)` under a wizard `eval`,
   so the checkpoint can fail.
6. **Step 14, "the whey becomes the next batch's starter (the shipped
   lees-to-culture path)."** The shipped path makes the RESIDUAL the
   culture; in a cheese vat the residual is curd and the whey is the drawn
   liquid. **Resolution (D7):** the starter crock is a `Vat` whose
   `whey`-tagged contents match a `culture`-kind profile, so a crock of whey
   IS a living starter (viability, feeding, kill) — same outcome, honest
   mechanism. The requirement's observable behaviour is unchanged.

One finding, not a conflict: there is no goat anywhere in the realm (the
only `capra` grep hit is *satyrus*), and `HeadSeed`'s `sex` is computed at
every draft and **applied to nothing** — a drafted head has `sex: null`.
The sex check cannot ship without fixing that (D12).

---

## Grounding

Every fact verified by opening the file on `reqs/dairy` at `2c0a6c139`
(2026-10-10). ⚠ marks a correction to the Phase 1 survey.

### The tap, the herd, the species

- ⚠ **One `Producing.ts`, not two.** `packages/server/src/mud/lib/husbandry/Producing.ts`
  (1052 lines) is the only one in the tree; the rgo-unification slate's
  `trade-ranching/src/lib/Producing.ts` is stale. `taps()` (l.238) reads
  the species' `production[]` with **no sex check**; `productionFactor()`
  (l.254) scales by `flesh`; `freshen()` (l.476) has **no production
  caller**; the `expire` branch (l.531–576) dries a tap off when
  `sinceTaken > windowDays` and keeps it dry until `freshen`; `planTap`
  (l.661) orders refusals *window → standing → vessel* and checks the
  vessel's material against the yield material; `completeTap` (l.738)
  re-reads the tap; `pourTake` (l.796) moves litres through a transient
  `UnboundedReceptacle` with `BulkableApi.transfer(... mode:'lenient')` and
  returns the litres kept — it stamps **no maker and no pathogen** on the
  vessel's slot. `TapState` (l.91) is `{standing, lastTaken, driedOff,
  worst, brooding, fullSince}` per key, persistent on the host.
- `packages/content/trade-ranching/content/trade/ranching/cmd/ranching/milk.yaml`
  — `target` `requires: HandlingMixin`; `vessel` optional, `default:
  "me:i:[mixin.BulkableMixin]"`, validator `mustHaveBulkSlot`.
  `src/idea/cmd/ranching/MilkController.ts` is `tapKey() = 'milk'` and
  nothing else over the kernel's `platform/idea/cmd/inventory/TapActController.ts`
  (completion is the module function `land`, l.204; the credit is the
  host's).
- `packages/content/trade-ranching/src/agent/Livestock.ts` —
  `ProducingMixin(HandledMixin(HandlingMixin(ChattelMixin(BrandedMixin(Creature)))))`
  (l.94). `commandContributions.peers` carries the three tap views plus
  `return`/`slaughter`/`breed` (l.145). `tapRefusal`/`tapEmptyPhrase`/
  `tapBeginPhrase`/`tapTookPhrase` (l.209–283) are the cow's voice; the
  overflow line is l.263. `herdId`/`headIndex` persistent (l.166).
- `packages/content/trade-ranching/src/lib/HeadSeed.ts` — `sample(shape,
  index, overlay)` seeds `flesh`, `handling`, `ageDays`, **`sex`** (female
  iff `unit < femaleFraction`), `frame`. ⚠ `DraftController.ts` (l.112–145)
  passes `femaleFraction: 0.85` as a **literal** (l.127), sets species and
  flesh, and **never calls `setSex`** — `Organism.setSex` exists
  (`lib/species/Organism.ts:395`, validated against the species'
  `sexDeterminationSystem`). `ReturnController.ts` (l.59–62) writes
  `flesh` + `handling` into the overlay and destructs the head.
  `HerdRegistry.ts` — `HerdRecord {herdId, name, speciesPath, tally,
  foundingMeanAgeDays, holderRef, homeExtent, drafted[], overlay}`;
  `HeadOverlay {flesh?, handling?, ageDays?, bornAt?, served?}` (l.150);
  `returnHead(herdId, index, overlay)` merges (l.359). `Herdbook.ts` is
  `FixtureMixin(Thing)` with authorable `herdId`, `herdName`,
  `speciesPath`, `tally`, `foundingMeanAgeDays`, `holderRef`, `homeExtent`
  and files the record in `onCreate`.
- `taurus.yaml` (trade-ranching's commons tree) — the milk tap: `perGameDay:
  22`, `behaviour: expire`, `windowDays: 0.6`, `yieldShape: volume`,
  `window: {kind: event}`; `adultMass: 550`; `butcheryYield` has offal,
  suet, gut, hide, bone and nine cuts — **no stomach**. `aries.yaml` —
  wool only (`continuous`, `capUnits 4`), `breeding: {daylightFrom: 0,
  daylightTo: 0.44}` (a short-day breeder, so lambing is late winter).
  **No `capra` row exists.** Two `Sus domesticus` rows exist
  (`trade-ranching/.../suidae/sus/domesticus.yaml` and
  `species-and-names/.../hog.yaml`) — noted, not touched.
- `Species.ts` — `TapSpec` (l.432): `key, yieldRow, perGameDay, behaviour,
  windowDays, window?, yieldShape?, capUnits?, broodAfterDays?, takeMs?`;
  `TapWindowSpec` (l.496) `always | event | photoperiod | biome | weather`
  with `daylightFrom/To` and `rising`. `ButcheryYield` (l.60) `{cut, units,
  fraction?, conditioned?}`; `dressOut({liveKg, fleshPct?, claims?})`
  (l.1215) — no age anywhere. `ButcherController.ts:274` reads the corpse's
  `sinceDeath()`; `Corpse` is minted with *"its birthday (so its age is the
  age it died at)"* (`Corpse.ts` header) — the build locates the birthday
  accessor on `Postmortem`/`Organism` in W0 (not read this cycle; a
  `bornAt`-style field is asserted by the header).
- Heart's Delight: `pack.yaml` claims `/world/terminus/hearts-delight`
  (group `hearts-delight`) and titles the orchard close to
  `{organization: …/idea/farm-business}`; `boot:` warms the three books
  (`producer`) and the species rows (`sync-read`) with the reasoning
  written in. `thing/ox-book.yaml` (`herdId: delight-oxen`, tally 2,
  `foundingMeanAgeDays 2920`, home `location/farmstead-yard`),
  `flock-book.yaml` (12 ewes, home `bench-field/location/upper-bench`),
  `hen-book.yaml` (6, 85 % female by the literal — some are cocks).
  `idea/farm-business.yaml` (`Business`, `appointingAuthority: {kind:
  entity, path: …/agent/farmer}`, one position, `banksAt: goodkin`).
  Rooms: `valley-gate` (Street, coords 0,0,0; exits north crossroads, west
  bench-lane, east public-works yard), `bench-lane` (−12,0,6; east gate,
  west yard, south millsite), `farmstead-yard` (−20,0,7; north barn, up
  bench), `barn`, `millsite` (−13,−6,4), `bench-field/location/upper-bench`
  (a `Field`), `public-works/location/yard`. `thing/farm-shelf.yaml` is a
  `ConsignmentShelf` (so `consign` already works in the yard). The pack
  ships **no `src/`** (README: load-bearing), 20 m cells.
- Rejection: rows only; `location/hillside.yaml` (0,2,0; exits SW
  claims-office, NE old-workings, N treeline, E salt-spring) holds the
  deep well; `salt-spring.yaml` (3,5,0) holds the brine bore; the
  provisioning shed props the store counter. Rooms touched by shipped
  drives: pithead-yard, claims-office, provisioning, old-workings,
  fuel-yard, timbered-drift, quarry/pit, hillside (pump), salt-spring
  (drilling/pump). The goat pen must be **off the hillside walk**:
  `kestrel-road/yard-gate`/`tips` and `location/far-fringe`/`dry-rise` are
  free of drive traffic — the pen goes **north of the yard gate off the
  Kestrel road** (`kestrel-road/goat-pen`, a `wild`-parcel edge where a
  nanny would actually be kept).

### Milk, spoilage, contamination

- `trade-ranching/content/stuff/idea/material/food/milk.yaml` — `fat
  34000, protein 33000, sugar 48000, water 870000`, tags `[food, dairy,
  liquid, perishable, once-living]`, **no `spoilActivationEnergy`, no
  `waterActivity`**. `Material.ts:587` defaults `spoilActivationEnergy` to
  0 J/mol (`Freshness.growthRate`, l.265: `if (!(ea > 0)) return 0` —
  inert). Shipped Ea census: flesh 80000, gut 50000, `cooked` 85000
  (`a_w 0.98`), the spread 45000–85000.
- `Freshness.ts` — `growthRate` (l.259) is **negative at/above `killK`
  (333 K)** and `advance` (l.454) integrates death exponentially, folded
  over the host's `temperatureTrajectory` (`advanceFreshnessOverHost`,
  l.790). `killOver` (l.413) is the craft's hold. The bulk gauge is
  `new Freshness(slot).load()` (l.675): seeds lazily, reconciles against
  `slot.getHolder()`. ⭐ **So a vessel heated outside a recipe already
  kills its spoilage flora** — provided the vessel's own temperature
  actually rises (see the thermal note below). `freshnessAugmenter` (l.898)
  speaks the four generic band words on `look`/`smell`; `taste` gets the
  palate line.
- `Contaminable.ts` — `Contamination.growthRate` (l.258) is negative at
  or above the organism's own `killK` and `advance` floors at
  `killSurvivalFraction`; the bulk half reconciles the same way (l.540–566,
  `advanceContaminationOverHost`). **`_pathogenLoads` is `{}` with no
  seeding path** (the header's invariant); `contaminate(key, severity)`
  (l.673) and `transferContaminationTo` (l.689) are the producers' surface.
  The vessel-surface rules (fill from a dirty vessel contaminates contents
  at full strength; emptying does not clean; `wash` clears the surface) live
  in `BulkableLogic.ts:483–512` and `CraftVessel.wash()`. Hosts:
  `Provision`, `CraftVessel`, `Corpse`, `ButcherBlock`, `BoningKnife`,
  `KitchenTool`. ⚠ **Not `Receptacle`** (the pail).
- `lib/vitals/Hygiene.ts` — `HygieneMixin` on `Creature` (`Creature.ts:179`):
  `handsCleanliness()` decays 1 → 0 over six game-hours, `scrub()` (bare
  `wash`), `soil()`. The one consumer is `TreatController.ts:622`
  (`HARM_DEFAULTS.SEPSIS_DIRTY_THRESHOLD`, inoculum `× (1 − hands)`); the
  header names butchering/mining/the sewer as deferred producers.
- `Metabolic.ts` — `noteMealAccountability(payload)` (l.1618) reads
  `payload.maker` and writes through `noteConsumptionHarm` (l.1666) when
  `victimId !== maker`; `recordToxinMaker` for the formed arm. `Crafted.ts`
  declares `BulkPayload.maker` (l.70) — "the maker's durable
  templatePath" — ⚠ and every reader compares it to `getIdentityPath()`,
  so the milker stamp must be the identity path.
- The pathogen roster (`platform/idea/Condition/pathogen/`): `e-coli`
  (`incubationSec 43200` — twelve game-hours, infect), `salmonella`
  (21600), perfringens, staph-aureus, botulinum, wound-sepsis.
  `lint:pathogens` holds `channels: []`.
- `scripts/check-perishable.ts` reads **authored rows** carrying a
  `_materialPath` that resolves to a perishable Material and requires the
  row's class chain to reach `FreshnessMixin`. Milk is held in vessels, so
  giving it an Ea trips nothing — but every new discrete dairy row (wheel,
  wedge, vell) must be a `Provision`.

### Maturation, fractionation, the kill, the vessel classes

- `lib/maturation/Maturing.ts` (1336 lines) — composes on a Bulkable host
  (`__validateComposition__`, l.393); batch detection keys on the interior
  material path (l.538–560); `startBatch` (l.806) matches
  `MaturationProfile.forMaterial` by TAGS, sets `phase = active` iff a
  profile matched, seeds `batchStrain = wildStrain` **iff
  `spontaneousLagDays === 0`**; the reconcile (l.601–750) folds the
  temperature trajectory, computes `peakK` over samples and zeroes
  `batchStrain` past the profile's `killK` (l.647–651), accrues the wild lag
  on an OPEN sterile batch, and converts only when `strainOk` (`requiresFlora`,
  l.274). `ensureInteriorMaterial` swaps product at `finished` and sets
  `leesVolumeL = amount × leesFraction` (l.731); the **lees split** (l.571–
  590) swaps the residual to `leesMaterial` when the amount reaches the
  floor and `startBatch(leesPath)`; `getBulkAvailable` (l.1080) is the rack
  floor. `classifyForeignPour` (l.1101) returns `pitch` only on an active
  batch with `batchStrain === ''`, `feed` into a culture for sugary matter,
  **else `null`** → `BulkableLogic.tryInoculate` (l.675) falls through to
  the material-mismatch decline. `applyBatchGrade` (l.937) is
  `min(damage, inputBand, maturity)`. `stampBatchMark` carries the maker in
  with the must. ⚠ Nothing in the file reads `Freshness`.
- `MaturationProfile.ts` — fields l.187–321 (`key, inputCategory,
  stallBelowK, happyK, damageAboveK, ratePerDay, productMaterial,
  productFraction, turnedMaterial, turnDays, sealedOnly, productAtFraction,
  kind, mechanism, strain, requiresStrain, wildStrain, spontaneousLagDays,
  killK, stallAboveK, leesFraction, leesMaterial, starveDays`), all
  authorable. ⚠⚠ **`MATURATION_MECHANISMS` is COUNTED by
  `lint:closed-vocabularies` as a convenience list that "wants ROWS"**
  (`npx tsx scripts/check-closed-vocabularies.ts --report`); its 4 → 5 growth
  is the gate's own first receipt. **This build adds no mechanism word.**
- `lib/fractionation/Fractionating.ts` + `FractionSchedule.ts` — the
  volume-drawn twin. ⭐ `separation: fractions` (the `crude.yaml` row,
  `trade-fuel`) lets **every span name its own material**, `getBulkAvailable`
  (l.608) clamps at each boundary while `running` and returns the full
  amount in every other phase (so a `spent` host pours its residue), the
  run starts when `heatReached(requiresHeatK)` with `0` = *runs the moment
  it is charged*, `runMaker` is the charging hand's identity path (l.348–
  369), and `residueMaterial` is the lees-style swap at `spent`. State:
  `chargeL, drawnL, runPhase, runScheduleKey, runMaterialPath, runMaker,
  runChargeBand` — **no stamp of when it was charged.** Composers today:
  `trade-distilling`'s `Still` only. The read is filter-gated to
  `smell`/`taste`; `look` gets the state. ⚠ "A material tag may belong to
  only one matcher of a given kind" (fractionation.md § Adding a
  feedstock): one schedule per tag and one profile per tag — a profile and
  a schedule on the same tag act on disjoint host classes (`Vat` vs the
  pan) and that is exactly what milk wants.
- `CraftingLogic.ts:1123` `resolveSpoilage` runs `Contamination.killOver` +
  `Freshness.killOver` for a recipe's `(requiresHeatK, holdS)`; `Recipe.ts`
  fields l.180–210 (`inputSlots[{slot, category, minGrade, kind, measureL|
  count}]`, `toolCapabilities`, `outputTemplate`, `outputMaterial`,
  `outputApplication`, `outputResidue {template, count}` — **one discrete
  template, never bulk**, `requiresHeatK`, `holdS`, `maxHeatK`, `medium`,
  `cure`, `discipline`, `difficulty`). `crisp-fried-cutlet.yaml` takes
  `{slot: fat, category: fat, kind: bulk, measureL: 0.08}`; rendering
  confers the `fat` tag (`animal-fat.yaml` comment). `root-mash.yaml` is
  roots + heat; `enriched-dough.yaml` is flour + water + 2 eggs + salt
  (`kind: item`, the salt sack); `press-olive-oil.yaml` is the `juicer`
  capability shape; `render-tallow.yaml` mints bulk into a `tallow-crock`.
- Vessel classes: `Receptacle = ThermalMixin(BulkableMixin(Good))`;
  `GradedReceptacle` adds `BrandedMixin(CraftedMixin(...))`;
  `CraftVessel = ContaminableMixin(ServiceableMixin(VesselKindMixin(CraftedMixin(ThermalMixin(BulkableMixin(ContainerMixin(Good)))))))`;
  `ServingVessel = PalatableMixin(CraftVessel)`; `CookPot =
  ManualBuildMixin(ToolMixin(DurableMixin(ServingVessel)))` with
  `capabilities = ['pot']`; `KitchenTool = ContaminableMixin(Tool)`
  (`fruit-press.yaml`: `capabilities: [juicer]`); `Vat =
  VesselKindMixin(MaturingMixin(CraftedMixin(SealableMixin(ThermalMixin(BulkableMixin(Good))))))`;
  `DoughTrough = ManualBuildMixin(Vat)` (the baking pack — a build vessel
  that is also a maturing vessel, the exact shape the hoop does NOT need and
  the cheese vat does not either). `Provision` composes `Sampled, Crafted,
  Composed, Contaminable, WaterActivity, ThermalDose, Freshness, Thermal`
  over `Good`. The culture-jar rows (`generic-objects/.../vessel/culture-jar.yaml`,
  `trade-brewing/.../jar-of-lager-culture.yaml`) are `Vat` rows with
  `interiorMaterial` + `interiorAmount` prefilled — the shape the starter
  crock and the rennet jar copy.
- Verbs: `platform/cmd/crafting/stir.yaml` is `verbs: [stir, shake]`,
  `vessel` `requires: ManualBuildMixin`; `StirController.ts:30` maps the
  verb to `BuildMethod` (`shake → shaken`, else `stirred`; `BuildMethod =
  Technique`, an open kebab string) and calls `built.setBuildMethod(method)`
  at completion (l.58). **Two views claim `pour`** (`crafting/pour.yaml`
  `[pour, add]` gated on a build vessel; `bulk/pour.yaml` the plain
  transfer) — a recorded `KNOWN_COLLISIONS` entry; every pitch/rack/fill
  rides the bulk one. `ground/split.yaml` is `requires: any`, the
  controller narrows to the declared `Splittable` shape
  (`lib/ground/Workable.ts:179`: `splittable: true` + `planWork`/
  `completeWork`). `wash.yaml` target `requires: CraftedMixin`, bare `wash`
  scrubs the hands. `consign.yaml` `thing` `requires: [ChattelMixin]`
  (every `Thing` is chattel). `taste.yaml`/`smell.yaml` `requires: any`.
  `system/press.yaml` is the news ticker. `cook.yaml` (trade-cooking) is
  `requireDeed` + `craft({recipeRef})` with no discipline filter; `plate`
  is cooking's terminal mint; `strain` the bar's; `quench` the smith's
  (crafting.md § Verbs). `make` runs a transcribed recipe-script after the
  deed. **No view claims `churn`, `mould`, `hoop` or `wedge`.**
- `HeatController.ts` (88 lines) — `isBuildVessel` gate, `reachableHeatK()`
  on the giver, `build.noteHeat(finalK)` at completion. The physical path is
  thermal.md § The furnace couple: `restamp()` asks `heatSourceK()` first
  — *if the host's container is a lit, fuelled Furnace, or the host rests
  on one, that furnace's held temperature is the ambient*; `Oven` and
  `Hearth` compose `PlacingMixin` (`Hearth = SpaceHeatingMixin(PlacingMixin(Firebox))`;
  rows `generic-objects/.../stove.yaml`, `brazier.yaml`, `Hearth.yaml`,
  `/stuff/thing/Oven` at `burnTemperatureK 500`), and a body inside drifts
  toward the held temperature over its own `τ = R·C`, with boiling water
  pinned at 373 K. `put.yaml` target accepts `ContainerMixin|PlacingMixin`.
  `platform/idea/reading/temperature.yaml` is the reading row
  (`instrument: thermometry`, `eyeCeiling: competent`,
  `improves: "whether a room will keep a batch, ripen a cheese…"`); the
  thermometer row is `generic-objects/.../instrument/thermometer.yaml`.
  Authored cold rooms: the brewing cold store `_temperature: 279`, the
  vintner's floor 285, the crowsfoot floor 289.
- Deeds: `CraftController.requireDeed` gates `make/cook/forge/bake/mix/
  serve`; the deed is earned by the first faithful by-hand build whose
  terminal mint reverse-matched the recipe; `preserve` is ungated "because a
  gate whose key does not exist is a lock" (crafting.md § Which verbs are
  gated).
- Disciplines: `base-library/.../Discipline/fermenting.yaml` (`requires:
  [recipe-knowledge]`, ISCED 0721); `trade-ranching/.../stockmanship.yaml`
  (`specializes: [agriculture]`); `platform/.../cooking.yaml`,
  `butchery.yaml`; `Discipline.ts` fields `key, channel, label,
  description, iscedf, requires, specializes, synergizes, conferrals,
  stock`.

### The pack rung, the harness, the gates

- A capability pack = `package.json` (deps are the install order and the
  import profile) + `pack.yaml` (`id, version, description, root, requires,
  boot, maintainers` — a closed key set) + `src/` (the four branches,
  `idea/cmd/<category>/`, `lib/`, `__tests__/`) + `content/` mirroring the
  namespace + `tsconfig.json` (`extends ../../../tsconfig.base.json`,
  `noEmit`, `include src/**/*`) + `vitest.config.ts` (`callSecPlugin()`,
  globals, node). `trade-tanning` is the smallest complete exemplar. The
  **root `package.json`** is the deployment manifest (every
  `@saxonberg/content-*` line there ships); a pack imports the kernel only
  by `@saxonberg/server/mud/{lib,api,platform/{thing,idea,agent,location}}/*`.
  A pack's `static _mixinName` is registered at discovery; `requires:` may
  name it. ⚠ Pack rename/add ⇒ `pnpm install` (stale `node_modules` fails
  every pack suite at collection).
- `packages/wire/src/harness/index.ts` exports `Session` (`open(handle,
  {startLocation, wizard})`, `cmd`, `prose`, `drainProse`, `awaitPrompt`),
  `declareFile({file, packs, dirtyReason})` (packs are CHECKED at `open`),
  `uniqueHandle`, `advanceWorldClock(duration)` (POST `/auth/test-clock`,
  `AUTH_MODE=test`), `worldClockNow`, `isOwnedTestWorld`, `expectOk/
  expectRefused/expectNote`. `pump.dirty.wire.test.ts` is the shape
  (`advance()`, `daylight()`, `say()`/`read()`/`walk()`/`act()` helpers;
  `WIRE_PORT=2013` for this worktree). The taps drive opens a `founder`
  session for funding and a wizard session for `eval`.
- `pnpm -C packages/server lint:family --list` — 72 gates; the ones with
  new work here are named under *Convention conformance*. Ratchets:
  `CLOSED_VOCABULARY_CEILING = 5` (at ceiling; **no new kernel list and no
  new member of a counted one**), `UNCEILINGED_RECIPE_CEILING = 0` (every
  heated recipe authors `maxHeatK`), `lint:lib-statics` (run `--report`
  before/after W0), `lint:on-create` (no new `onCreate` planned),
  `lint:capabilities` (a capability must be declared by a row AND consumed
  in source in the same wave: `hoop`, `churn`, `setting`),
  `lint:verb-collisions` (`KNOWN_COLLISIONS` may only shrink).

---

## Plan-level decisions

**D1 — The pack, and the four homes.** `trade-dairying` at `/trade/dairying`
(root claim titled to `{organization: /compact/trade}`, the placeless-trade
rule). It holds the PROCESS: the five vessel classes (`SettingPan`, `Churn`,
`CheeseVat`, `Hoop`, `Wheel`), the `mould` verb, the intermediate and
product materials (`skim-milk`, `cream`, `churned-cream`, `buttermilk`,
`butter`, `whey`, `renneted-milk`, `scalded-milk`, `soft-curd`,
`firm-curd`, `yoghurt`, `ricotta`, `soft-cheese`, `hard-cheese`, `rennet`),
the profiles, the schedules, the recipes, the dairying Discipline, and the
instrument rows. **The commons (`trade-ranching`'s content tree)** holds
what is a fact about animals: the goat species, the ewe and goat milks, the
cow milk's spoilage constants, the milk taps on three species rows.
**`trade-cooking`** holds the vell (a butchery output like `gut`) and the
cooked recipes; **`trade-baking`** the milk loaf. **The venues' packs** hold
the venues. Reasoning: the requirements' Placement, verbatim; the test is
that Rejection's goats name only dairying's and ranching's classes.

**D2 — Milk spoils at `Ea = 60 000 J/mol`, `a_w 0.99`, and a LIVE
ferment holds the gauge.** Derived, not chosen: with the shipped dials
(`μ_max 0.35/h` at 303 K, inoculum 0.002, tainted at 0.25) the tainted
band lands at ≈ 31 game-hours at 294 K (an interior) and ≈ 80 game-hours at
283 K (the cheese room) — *about a game day warm, several days cool*. A
unit test pins both windows to `[0.75, 1.5]` and `≥ 3` game days so the
figure can move without the promise moving. The hold: `lib/material/
Freshness.ts` declares `interface SpoilageHolding { holdsSpoilage(): boolean }`
and `Freshness.load()` (the bulk gauge) and `FreshnessMixin.reconcileFreshness`
(the discrete one) ask the holder/host, **advancing the stamp without
advancing the load** while held. `MaturingMixin.holdsSpoilage()` is
`phase === 'active' ∧ batchStrain !== '' ∧ (kind !== 'culture' ∨ viability
> 0)` — a working culture IS the flora; a sterile fill, a stuck batch, a
finished product and a dead starter are not held. `RipeningMixin.holdsSpoilage()`
is `phase === 'active'` (the rind flora). Contamination is **never** held:
raw-milk cheese keeps its pathogens, which is the requirements' own
sentence. (Lens 1: the pupil learns that a culture out-competes spoilage
and that heat kills both — the thing fermentation is.)

**D3 — Three milks, one tag, and yields that DERIVE.** `ewe-milk` (fat
70000, protein 55000, sugar 48000) and `goat-milk` (fat 41000, protein
33000, sugar 44000) join `milk` in the commons, each tagged `[food, dairy,
liquid, perishable, once-living, milk, <species>-milk]` (the cow row gains
`milk` and `cow-milk`). One setting schedule and one soft-curd profile key
on `milk`, so a fourth dairy animal is a material row and a tap line. The
species character reaches the product two ways, both from the numbers: (a)
a new kernel value object `lib/material/CompositionShare.ts` —
`{ nutrients: Record<string, number>, floor?, cap? }` evaluating
`clamp(Σ nutrientAmount[n] / 1e6 × k, floor, cap)` against a Material —
read by `MaturationProfile.leesShare` and `FractionSchedule.residueShare`
(each optional; the literal `leesFraction`/residue stays the default), so
cream is `fat × 2.5` of the milk and curd is `(fat + protein) × 1.6` (firm)
or `× 2.4` (soft) — ewe's milk gives roughly twice the cow's curd per
litre with nothing authored per species; (b) `Maturing.startBatch` records
the batch's input material as `BulkPayload.parts = [{material, fraction:
1}]` (a batch remembers what it was made from — true of wine too), the
craft carries `parts` through the mould into the wheel's stored payload,
and the wheel's `taste` line names it (*"a ewe's-milk cheese"*). The
cheese TYPE (soft/hard) is the material; the species is the payload.
(Lens 2 decides: the alternative — a profile and a product material per
species — is the list the requirements forbid.)

**D4 — Cream rises in a `FractionatingMixin` pan, and the kernel gains a
REST gate.** A setting pan with a plug at the bottom drains skim first and
leaves the cream: that is `separation: fractions` exactly (*you draw until
the character changes*). `SettingPan = FractionatingMixin(CraftedMixin(ThermalMixin(BulkableMixin(Good))))`
in `trade-dairying/src/thing/`; schedule `milk-setting` (`inputCategory:
milk`, `separation: fractions`, `requiresHeatK: 0`, fractions
`[{key: skim, upTo: 1 − residueShare, material: skim-milk, character: …}]`,
`residueMaterial: cream`, `residueShare: {nutrients: {fat: 2.5}}`,
`discipline: dairying`). The one kernel seam: `FractionSchedule.restDays`
(default 0) and `Fractionating.chargedAtS` (persistent) — a charge runs
when heat is reached **and** the rest has elapsed; a pan poured before the
cream has risen gives milk back as milk (the shipped *cold charge* rule).
`look pan` says charged/separated in the pan's own words; `smell`/`taste`
read the fraction. No new verb: `pour pail into pan`, wait, `pour pan into
pail` draws the skim and stops at the cream. Reasoning: the mechanism
already ships and is honest for a bottom-draining pan; `MaturingMixin`
would have needed a sixth mechanism word, which the census refuses.

**D5 — Butter is `churn`, an alias of `shake`, and the break is a material
swap the churn performs.** `stir.yaml` becomes `verbs: [stir, shake,
churn]`; `StirController` maps `churn → 'churned'` (one line; `BuildMethod`
is open). `Churn = ManualBuildMixin(FractionatingMixin(CraftedMixin(ThermalMixin(BulkableMixin(Good)))))`
overrides `setBuildMethod(method)`: on `'churned'` with a `cream`-tagged
interior it reads its own temperature — in the band (283–291 K) the cream
breaks: the interior material swaps to `churned-cream`; too cold it does
not come (*"it slops and will not come"*, no swap); too warm it breaks
greasy (swap, and `setGrade` capped at `fair`). Schedule `churning`
(`inputCategory: churned-cream`, fractions `[{key: buttermilk, upTo: 1 −
residueShare, material: buttermilk}]`, `residueMaterial: butter`,
`residueShare: {nutrients: {fat: 1.15}}`). `pour churn into jug` draws the
buttermilk and stops; the butter is the residue, poured to a crock as BULK
— which is exactly the shape `category: fat, kind: bulk` recipes already
take (D15). `churn` paces by the churn row's capability `rate` (the
`stir`/`paceMs` machinery). Reasoning: lens 1 — the churn's judgment is the
thermometer again (real butter comes at 10–15 °C); the slate's
"butter is an ACT, cheese is a CLOCK" is kept without inventing a
work-credited clock.

**D6 — Heat outside a recipe already kills; the kernel adds the PLACING
arm of `heat` and a SCALD mark on the batch.** Arithmetic verified
(Grounding): a vat standing on a lit hearth integrates its trajectory and
`Freshness`, `Contamination` and `Maturing` each kill above their own
threshold. What is missing is the act: `heat <vessel>` on a non-build
Thermal `Containable` now **places it on the reachable lit furnace** that
composes `PlacingMixin` (`ContainmentApi.place(target, 'on', furnace)`),
declining *"there's no fire here to set it on"* otherwise; the build-vessel
arm is untouched and the view's `requires:` becomes `any` with the
controller narrowing (a `CocktailShaker` builds and is not Thermal, so no
single mixin names both arms). Taking it off is `get vat` / `put vat on
table`, shipped. The scald: `Maturing.batchPeakK` (persistent) — the max
over every reconcile's samples from the fill, pre-pitch included (the
`peakK` the reconcile already computes) — and `MaturationProfile.scaldAboveK`
(optional); `applyBatchGrade` gains a fourth weakest link, `poor` when the
peak exceeded it (*the curd sets badly*, said by the vat's `look` at
`finished`). `firm-curd` authors 355 K (whey-protein denaturation), so
pasteurizing at 336 K is safe and boiling is not. ⚠ Stated limit: milk
scalded in a POT and poured into the vat arrives unmarked — the mark is the
batch's, not the payload's; a `BulkPayload.peakK` declared by `lib/thermal/`
is the deferred seam.

**D7 — Soft and firm curd are two profiles on two INPUT materials, and the
kernel learns that a pour may change what a batch IS.** `soft-curd`
(`inputCategory: milk`, `requiresStrain: ''`, `wildStrain: lactic`,
`spontaneousLagDays: 1`, happy 303 K, `killK 318`, `ratePerDay` for a
set in ~6 game-hours, `productMaterial: whey`, `leesMaterial: soft-curd`,
`leesShare {fat+protein × 2.4}`, `turnedMaterial: null`,
`scaldAboveK 355`); `firm-curd` on `renneted-milk` (`leesMaterial:
firm-curd`, `leesShare × 1.6`); `whey-starter` (`kind: culture`, `strain:
lactic`, `inputCategory: whey`, `killK 318`, `starveDays 6`) so a crock of
whey is a living starter and a milk pour feeds it (lactose is `sugar` —
the shipped `feed` branch); `yoghurt` on `scalded-milk` (happy 316 K,
`productMaterial: yoghurt`, no lees). The renneting is the new seam:
`MaturationProfile.transforms: [{category, becomes}]` — a foreign pour
whose material carries `category` **rekeys the batch in place** to
`becomes` (`Maturing.rekeyBatch(path)`: interior material swapped, profile
re-matched, `batchStrain`/`batchDays`/`batchInputBand`/mark/peak
**preserved**), classified by `classifyForeignPour` as a third kind,
`'transform'`, before the mismatch decline. `rennet` (a liquid material,
tag `coagulant`) poured into a vat under `soft-curd` makes it a
`firm-curd` batch whatever the order of starter and rennet. Pitching stays
`pour crock into vat`; scalding for yoghurt is a `scald-milk` recipe (pot,
358 K, `outputMaterial: scalded-milk`) because heat is not a pour and a
yoghurt maker scalds first. Backslopping: the drained whey poured into the
crock is next time's starter. ⚠ The one-day wild lag means raw milk left
in a cheese vat sours into clabber by itself — true biology, and
"milk turns" made literal; in a pail it only spoils. Reasoning: the
double-match rule ("process-differentiated input materials, the lager-wort
move") applied in place, and maturation.md's own note that a fourth
transfer-seam domain is the moment to generalize rather than add a branch.

**D8 — Rennet comes off a young head's stomach: a kernel age gate on a
yield line, a cooking row, a dairying recipe, and a calf register.**
`ButcheryYield.maxAgeDays?` (kernel; a line that applies only to a body
younger than this), `Species.dressOut({…, ageDays?})` skips lines it fails,
`ButcherController` passes the corpse's age (the birthday the mint
stamps). The cow and goat rows gain `{cut: /trade/cooking/thing/vell,
units: 1, fraction: 0.004, maxAgeDays: <weanedAt>}`; `vell.yaml` is a
`Provision` over a new `vell` material (gut-like: `Ea 50000`, `a_w 0.99`,
tag `vell`). `dry vell on rack` is the shipped water-activity act and is
what keeps it; recipe `rennet` (trade-dairying: `{vell, item 1} + {salt,
item 1} + {water, bulk 0.5 L}` → `outputMaterial: rennet`,
`outputTemplate: /trade/dairying/thing/rennet-jar`, no heat,
`discipline: dairying`) makes the extract. The creamery opens with one
filled `rennet-jar` row (the barm precedent). The dairy farm keeps a
`calf-register` (tally 3, `foundingMeanAgeDays 45`, `femaleFraction 0.5`)
so AC 9 is reachable in the world the drive runs in.

**D9 — The wheel is a `Provision` composing a kernel `RipeningMixin`, pressed
in a by-hand build whose terminal verb is `mould`.** `lib/maturation/Ripening.ts`
— the DISCRETE twin of `Maturing`: no bulk, no strain, no lees; reuses
`MaturationProfile` rows matched by the host's **material** tags
(`soft-cheese`, `hard-cheese`), folds the host's `temperatureTrajectory`
through `rateAt`/`damageSat` exactly as `Maturing` does (the two helpers
move to module scope of the profile file so neither mixin copies them),
phases `idle | active | finished | turned | killed` (a stored `killed` —
the flag maturation.md records as its own deferred seam, taken here because
a wheel cannot be re-pitched), grade = `min(damage, inputBand, maturity)`
written to the Graded face each reconcile with `productAtFraction` opening
the *young but sellable* window; `turnDays` + an **open** host is "goes
over" (a soft wheel in a game week; `turned` writes `poor`); a hard profile
authors no turn and its `maturityBand` keeps climbing to `masterful` over
game months. `look` and `taste` read the band in words (*young · coming
on · ripe · over · gone*), never a digit. Composition-validated on
`Fresh + Thermal + Graded` hosts (so `Provision`), composed by **`Wheel`
only** (`trade-dairying/src/thing/Wheel.ts`, `RipeningMixin(Provision)`);
rows `soft-wheel` / `hard-wheel` are `Wheel` rows over the two cheese
materials (`soft-cheese`: `Ea 70000`, `a_w 0.97`; `hard-cheese`: `Ea
70000`, `a_w 0.91`). The press: `Hoop = ManualBuildMixin(ToolMixin(DurableMixin(CraftVessel)))`
(`capabilities: ['hoop']`, the `CookPot` shape — curd is poured in with
the build `pour`, salt put in), and the dairying pack's `mould [<hoop>]`
terminal (`MouldController`, the `plate` shape: `CraftingApi.mintFromBuild`
reverse-matches the hoop's contributions to a `discipline: dairying`
recipe and mints the wheel into the maker's hands; the first faithful
`mould` earns the deed; `make soft-wheel` runs it thereafter). Recipes
`soft-wheel` / `hard-wheel` (`{curd, bulk 2 L, category soft-curd |
firm-curd} + {salt, item 1}`, `toolCapabilities: [hoop]`, `outputTemplate`
the wheel row, `difficulty: standard`). `press` stays the ticker's (the
requirements closed it); `mould` is chosen because a cheese mould IS the
hoop and the glass slate already calls the hoop a mould — the rung where
glass's form later joins the same verb. The hoop is a **reusable** tool
(`Durable`, wears per mould; `repair` restores it) — the glass slate's
question, decided: consumed moulds are the sand-casting rung, not this one.

**D10 — `split wheel` → wedges, by the declared shape.** `Wheel` implements
`Splittable` (`splittable: true`, `planWork` wants an edge — `constructionForm:
bladed` on the bound tool, the `butcher` rule — and refuses when
`wedgesLeft === 0`; `completeWork` clones one `/trade/dairying/thing/wedge`
(a plain `Provision` row) with the wheel's material, grade, stored payload
(parts, pathogens, freshness) and `mass / wedgesPerWheel`, decrements, and
destructs the wheel at zero). A wedge spoils on its material's clock and
does not ripen further (stated; the ripening is the wheel's). `split.yaml`
is untouched (`requires: any`).

**D11 — Contamination at the milking rides HANDS, and the pail becomes food
equipment.** `Producing.pourTake` gains two writes after the transfer: the
milker's identity path as the slot payload's `maker` (`by.getIdentityPath()`,
the ledger's key), and — when `MixinApi.isHygiene(by) &&
by.handsCleanliness() < HARM_DEFAULTS.SEPSIS_DIRTY_THRESHOLD` — an `e-coli`
inoculum of `severity (1 − cleanliness) × MILKING_INOCULUM` onto the slot
(`new Contamination(slot).stampLoads(blend)`) and `vessel.contaminate('e-coli',
…)` onto the pail's SURFACE when the vessel is `Contaminable`, so the next
fill from that pail carries it (the shipped vessel rule) and `wash pail`
clears it (the shipped `wash`). Bare `wash` scrubs the hands. The commons
`pail.yaml` re-classes to `/platform/thing/CraftVessel` (D-conflict 3).
Hygiene's own header names this as its deferred producer, so no new state
is minted: six game-hours unwashed is dirty. No sense reports it;
procedure does.

**D12 — Sex and the dry period are SPECIES facts on the tap and HERD facts in
the overlay; nothing schedules anything.** Kernel: `TapSpec.sex?: 'female' |
'male'` (the tap exists only on this sex — read in `Producing.planTap` →
refusal `wrong-sex` in the host's voice: *"He has nothing to give you."*;
`productionRead` skips a tap the body cannot have) and `TapSpec.restDays?`
(an `expire` tap's dry period before it may freshen); `Producing.dryOff(key)`
(public; the reconcile's own write, exposed so a drafter can restore a
recorded state). Ranching: `HeadOverlay.driedOffAt?: Record<tapKey,
gameSec>` written by `ReturnController` for every dried-off `expire` tap
(the rest starts at the RETURN — the requirement's own sentence);
`DraftController.mint` applies `sample.sex` (`setSex`), and for each tap
with a recorded `driedOffAt` within `restDays` calls `dryOff(key)` — past
it, the head is drafted fresh (the default state), which IS "back in milk".
`Herdbook.femaleFraction` becomes authorable (default 0.85, persisted on
the `HerdRecord`), so the ox register authors `0`, the dairy book `0.95`,
the calf register `0.5`. `taurus.yaml`'s milk tap authors `sex: female`,
`restDays: 3`; the hen's egg tap `sex: female` (a cockerel lays nothing —
true today by accident of nothing checking). Returning and redrafting
cannot launder: the dry-off is in the record, keyed by `(herdId, index)`.
(Not cross-cutting: no brain, no scheduler, derive-on-read at two acts.)

**D13 — Ewe's milk is a season; the goat follows the cow.** `aries.yaml`
gains a second tap: `{key: milk, yieldRow: ewe-milk, perGameDay: 1.2,
behaviour: expire, windowDays: 0.6, yieldShape: volume, sex: female,
restDays: 3, window: {kind: photoperiod, daylightFrom: 0.46, daylightTo:
0.62}}` — opens as the days lengthen past lambing and closes at midsummer;
no `rising` (a ewe milks on into the long days either way). The goat:
`capra/hircus.yaml` beside `bos`/`ovis` in trade-ranching's commons tree
(`adultMass 60`, quadruped plan, `commonNames [goat, nanny, billy, kid]`,
the cow's milk tap shape at `perGameDay 3`, `yieldRow goat-milk`, `window:
event`, `sex: female`, `restDays 3`; a butchery yield copied from the ewe's
with the vell line). Both species warm at `sync-read` in their venues'
`boot:`.

**D14 — Three venues, rows only, in their own packs.**
*The dairy farm* (hearts-delight): `location/dairy-yard` (SingletonCartesian,
on the flats at `{x: 0, y: −6, z: 0}` — a new `south` exit on
`valley-gate` (0,0,0) into it, 6 min, and `north` back; the coordinates
agree with the compass, the barn's lesson — with `east` into
`location/byre` at `{x: 1, y: −6, z: 0}`), `location/byre` (indoor, lit by spill, props the
`dairy-book`, the `calf-register`, two pails, a water butt, a milking
stool as a `Detail`), `thing/dairy-book` (`Herdbook`, `herdId: delight-dairy`,
tally 6, `foundingMeanAgeDays 1100`, `femaleFraction 0.95`, holder the new
`idea/dairy-business`, home the byre), `thing/calf-register`,
`agent/dairywoman` + `agent/dairy-lad` (`Cast` over the student costume,
`archetype: farmer`, competence `stockmanship: proficient`, `dairying:
competent`; `idles`), `idea/dairy-business` (`Business`, appointed by the
dairywoman, one position `dairyhand` fulfilling nothing — staffing the
tap is a non-goal; the household exists so the herd is somebody's),
a `pack.yaml` title claim for the dairy yard extent to the business
(parentParcel the valley, `landUse: agricultural`), and `boot:` entries
for both books (`producer`) and the goat/ewe/cow species (`sync-read`).
*The co-op creamery*: `location/creamery` (off the valley road: a new
`southwest` exit from `valley-gate`, 4 min, coords `{x: −4, y: −4, z: 0}`;
indoor,
`ambientIntensity 35`; props: two `setting-pan`s, one `churn`, one
`cheese-vat`, two `hoop`s, the `starter-crock` (a `Vat` row prefilled
`whey` 1 L), the `rennet-jar` (prefilled `rennet` 0.5 L), a `Hearth`
row, a `thermometer`, a `salt-sack`, a `water-butt`, a `table`, a
`consignment shelf` (the co-op's), a jug and two crocks; `cast`: the
creamery keeper), `location/cheese-room` (below, `down`; `_temperature:
284`; props: two `/stuff/thing/fixture/shelf`-class Placing rows if one
exists, else the `DryingRack`-shaped `Fitting` the cooking pack ships —
the build picks the shipped slatted surface with `airExposure` and
records which), `agent/creamery-keeper` (`Cast`, `dairying: proficient`),
`idea/creamery-coop` (`Business`, appointed by the keeper — the
organization the title names), the title claim, and `boot:` for the crock
and the jar (`producer`: a culture nobody warms is a culture that is dead
by the first `look`, and a prop edit never reaches a booted world).
*Rejection's goats*: `kestrel-road/goat-pen` (outdoor, off the yard gate
north: a new exit pair, 3 min), `thing/goat-book` (`Herdbook`, `herdId:
rejection-nannies`, tally 3, `femaleFraction 1`, holder the provisioning
business, home the pen), a pail, a setting pan, a crock prefilled with
whey, a hoop, a salt sack — **every class ranching's or dairying's**; the
`rejection` README's `find … -name '*.ts' | wc -l # 0` stays true.
Reasoning: trade = mechanism, locality = expression; the creamery's
holder is the one new organization row (conflict 1).

**D15 — The kitchen takes dairy by CATEGORY.** Butter's material carries
`fat` (so every `category: fat` recipe takes it, nothing edited);
`trade-cooking` gains `creamed-mash` (roots item + milk bulk 0.2 L +
fat bulk 0.05 L, pot, 373 K, `maxHeatK 393`), `toasted-cheese` (bread
item + cheese item, 450 K, `maxHeatK 480`, `toolCapabilities: []` — at
the fire), `baked-custard` (2 eggs + milk 0.4 L, no sweetener — no sweetener category is invented here, sugar-requirements owns that vocabulary; 353 K, `holdS 1800`, **`maxHeatK 363`** — ten kelvin, and over it the dish mints
*scorched* = curdled, the doneness band's own word on `look`),
`scald-milk` (dairying's, pot, 358 K, `holdS 300`, `maxHeatK 373`,
`outputMaterial: scalded-milk`, `outputTemplate` a jug row) and `ricotta`
(dairying's: whey bulk 2 L, pot, 358 K, `holdS 600`, `maxHeatK 373`,
`outputTemplate: /trade/dairying/thing/ricotta-basket`, `outputMaterial:
ricotta`, bulk — a basket is a `Receptacle` row; a discrete ricotta is a
wedge-shaped `Provision` the build may prefer; record which);
`trade-baking` gains `milk-dough` (flour + milk 0.4 L + salt, the
`dough` shape with milk for water → `outputMaterial: dough`, so the
shipped `lean-loaf` bakes it). Butter in the fried recipes is proved by
a world test that fries roots in butter at the cookhouse.

**D16 — `dairying` under `fermenting`.** `trade-dairying/content/trade/dairying/idea/Discipline/dairying.yaml`:
`key: dairying`, `channel: skill`, ISCED 0721, `specializes: [fermenting]`,
`requires: [recipe-knowledge]`. Credited by: the setting and churning
schedules (`discipline: dairying`), the curd profiles (the batch's
credit), the mould and rennet recipes, and `RipeningMixin`'s read.
`stockmanship` stays the animal's (the milking act credits it, unchanged).

**D17 — The drive is `packages/wire/tests/dairy.dirty.wire.test.ts`.**
Dirty: it consumes the creamery's seed starter and rennet, leaves wheels on
the shelf and milk in pails, drafts and returns heads, and infects a second
character. Twenty-six steps, every one asserting a state change or the
exact refusal; the test clock walks setting (hours), ripening (a week; two
months), the dry-off (0.6 game days) and the rest (3 game days); a second
`Session` is the stranger; a wizard session reads the ledger.

**D18 — Staging is six waves, kernel first, each landable.** W0 kernel
seams · W1 the animals and the kitchen's inputs · W2 the pack · W3 the
kitchen · W4 the venues · W5 the drive, the docs, the gates.

---

## ⭐⭐ Host placement

For every new field, mixin, interface, class and row class: the host, the
claim, and what it refuses.

| what | host | the claim, and what it refuses |
|---|---|---|
| `SpoilageHolding` (interface, `lib/material/Freshness.ts`) | implemented by `MaturingMixin`, `RipeningMixin` | *while I am converting, my population is the flora.* ⛔ Not a field on `Bulkable` or `Provision`; read by `Freshness` through a declared shape. A holder that does not answer is not held. |
| `MaturingMixin.holdsSpoilage()`, `.batchPeakK` (persistent), `.rekeyBatch()`, `'transform'` in `classifyForeignPour` | `MaturingMixin` (so `Vat` and every row over it) | true of every batch: a culture out-competes spoilage, every batch has had a peak temperature, any batch may be rekeyed by a declared pour. Vacuous for a profile authoring no `transforms`/`scaldAboveK`. |
| `MaturationProfile.transforms[]`, `.scaldAboveK`, `.leesShare` | `MaturationProfile` (rows) | authored per process, read only by `Maturing`/`Ripening`. ⛔ No new mechanism word (the census). |
| `CompositionShare` (value object, `lib/material/`) | read by `MaturationProfile.leesShare` and `FractionSchedule.residueShare` | *a share of a bulk derived from its material's composition.* Pure; constructed, never a static. |
| `FractionSchedule.restDays`, `Fractionating.chargedAtS` | the schedule row; the mixin | *a charge may need to stand before it separates.* Default 0 — every shipped still is byte-identical. |
| `RipeningMixin` (`lib/maturation/Ripening.ts`) | **`Wheel` only** (`trade-dairying/src/thing/Wheel.ts = RipeningMixin(Provision)`) | *this solid converts on a shelf by its own temperature.* ⛔ Not `Provision` (a ration does not ripen — the `Freshness off every Thing` shape), not `Thing`. Kernel rather than pack `lib/` because the requirements name it a kernel seam and its second composer (a cured ham) is cooking's, a pack dairying depends on — the kernel is the only honest common home. ⚠ `lint:instanceable`: `lib/maturation/` stays substrate; `Wheel` is instanceable in the pack. |
| `TapSpec.sex`, `TapSpec.restDays` | `Species.production[]` (kernel, authored on species rows) | *which sex gives this; how long a dried-off tap rests.* ⛔ Not on `TapState` (a dry period is a species fact), not on `Livestock`. |
| `Producing.dryOff(key)` | `ProducingMixin` | the reconcile's own write, exposed; a hive or a tree never calls it and loses nothing by having it. |
| `HeadOverlay.driedOffAt`, `HerdRecord.femaleFraction`, `Herdbook.femaleFraction` (authorable) | ranching pack (`HerdRegistry.ts`, `Herdbook.ts`) | herd facts in the herd's record. ⛔ Not on `Livestock` (destructed at return). |
| `ButcheryYield.maxAgeDays` | `Species.butcheryYield[]` (kernel) | *this line comes off a young body only.* `dressOut` skips it; nothing else reads it. |
| `SettingPan` (`FractionatingMixin(CraftedMixin(ThermalMixin(BulkableMixin(Good))))`) | pack class, rows `setting-pan` | a vessel whose interior yields in fractions as drawn, after a rest. Crafted for `wash`; Thermal for the trajectory; no Container (nothing goes IN a pan). |
| `Churn` (`ManualBuildMixin(FractionatingMixin(CraftedMixin(ThermalMixin(BulkableMixin(Good)))))`) | pack class, row `churn` (`capabilities: [churn]`, `rate`) | a build vessel (so `stir.yaml`'s `churn` reaches it) whose worked interior separates. Its `setBuildMethod` override is the host's own hook, no guard: a churn with no cream in it records `churned` and nothing breaks. |
| `CheeseVat` | **none — a `Vat` row** (`/trade/dairying/thing/cheese-vat`, `category: cheese-vat`, 25 L, open) | ⭐ The vat IS the kernel's; the profiles do the work. A pack class here would claim nothing a row cannot. |
| `Hoop` (`ManualBuildMixin(ToolMixin(DurableMixin(CraftVessel)))`) | pack class, row `hoop` (`capabilities: [hoop]`) | the `CookPot` shape: a build vessel that is a tool. Affords `mould` (`peers` + `environment`) and the platform build steps come from `ManualBuildMixin`. ⛔ Not `CookPot` (a hoop does not cook or plate). |
| `Wheel` (`RipeningMixin(Provision)`, `Splittable`) | pack class, rows `soft-wheel`, `hard-wheel` | a solid cheese that ripens and divides. `wedgesPerWheel` authorable; `wedgesLeft` persistent. |
| `wedge`, `vell`, `ricotta` (if discrete) | `/platform/thing/Provision` rows | food; no class. |
| `starter-crock`, `rennet-jar`, `cheese-vat` | `/platform/thing/Vat` rows (prefilled) | the culture-jar shape. ⚠ A rennet jar is a `Vat` only so `pour` from it carries no strain and so the row can prefill; its material matches no profile and it idles. The build may prefer `GradedReceptacle` for the jar — either is a row. |
| `skim-milk`, `cream`, `churned-cream`, `buttermilk`, `butter` (tags `fat`, `dairy`), `whey`, `renneted-milk`, `scalded-milk`, `soft-curd`, `firm-curd`, `yoghurt`, `ricotta`, `soft-cheese`, `hard-cheese`, `rennet` (tag `coagulant`) | `/trade/dairying/idea/material/*` rows | the trade's intermediates and products. Each perishable one authors `Ea` + `a_w`; `rennet` and `butter` author none (salted fat and a salt extract keep). |
| `ewe-milk`, `goat-milk`, the cow milk's `Ea`/`a_w`/tags | commons (`trade-ranching/content/stuff/idea/material/food/`) | facts about mammals. |
| `capra/hircus` | commons species tree | a species row. |
| `mould.yaml` + `MouldController` | `trade-dairying/content/trade/dairying/cmd/crafting/`, `src/idea/cmd/crafting/` | the dairying terminal; afforded by `Hoop` only. |
| `churn` | `platform/cmd/crafting/stir.yaml` (a verb added to a shipped view) | the alias the requirements chose; `StirController` is the kernel's and the method string is open. |
| `heat`'s placing arm | `platform/idea/cmd/crafting/HeatController.ts` + `heat.yaml` | a kernel verb widened on its own axis (a pot and a vat are both brought to the fire). |
| `dairying` Discipline, the profiles, the schedules, the recipes | `trade-dairying/content/…` rows | content. |
| the dairy household, the creamery, the co-op business, the goat pen | `hearts-delight`, `rejection` packs | rows, no `src/`. |

**The narrowing test, applied.** No guard in this plan re-narrows a host
set. `Freshness` asks a *declared shape* and a host that does not answer
is simply not held; `Churn.setBuildMethod` branches on its own interior,
not on who called; `Producing.planTap`'s sex check reads the tap's own
`sex` and the host's own `getSex()` — a hive authors no `sex` and is never
asked. If W2 finds itself writing `if (MixinApi.isWheel(…))` inside
`RipeningMixin`, or a `category === 'cheese-vat'` test inside `Maturing`,
the host is wrong and the finding goes here, not in code.

---

## Convention conformance

Checked against the tree, not recalled.

- **`props:` / `cast:`** — every venue row uses them; `populates:` appears
  nowhere in this plan. Prefilled vessels are `interiorMaterial` +
  `interiorAmount` rows (the culture-jar shape).
- **Locations, not rooms** — the byre, the creamery, the cheese room and
  the goat pen are `SingletonCartesianLocation` rows with `coords` on the
  owning zone's grid (20 m cells at the Delight, 10 m at Rejection);
  cardinal exits with agreeing coordinates (the barn's lesson); no
  `FurnishableRoom`.
- **The five axes and `<root>/<branch>/`** — `/trade/dairying/{thing,idea}/…`,
  `/trade/dairying/idea/material/*`, `/trade/dairying/idea/maturation/*`,
  `/trade/dairying/idea/fractionation/*`, `/trade/dairying/idea/Discipline/*`,
  `/trade/dairying/cmd/crafting/mould` with its controller at
  `/trade/dairying/idea/cmd/crafting/MouldController`; commons rows at
  `/stuff/idea/{material/food,species}/…`; cooking's at `/trade/cooking/thing/vell`
  and `content/recipes/`; venue rows under `/world/terminus/{hearts-delight,rejection}/…`.
  Kernel: `lib/maturation/Ripening.ts`, `lib/material/CompositionShare.ts`
  (substrate only — `lint:instanceable` invariants 1, 2, 7, 12).
- **Module scope declares; lifecycles initialize** — no module-scope
  statements; no new `onCreate` (`lint:on-create` ceiling unchanged);
  `RipeningMixin` reconciles on read; the schedules and profiles warm
  through the shipped catalogues (`MaturationProfileCatalogue`,
  `FractionScheduleCatalogue`, by class — no kernel edit).
- **The import boundary** — kernel files import only `mud/`;
  `trade-dairying` imports the kernel by package specifier and
  `trade-cooking` by its dependency line (for nothing in `src/` — only
  rows name cooking's); `hearts-delight` and `rejection` add
  `@saxonberg/content-trade-dairying` to `package.json` (rows name its
  classes); the root `package.json` gains the pack; `pnpm install`.
- **Verbs live on objects** — `holdsSpoilage`, `rekeyBatch`, `dryOff`,
  `planWork`/`completeWork` on the wheel, `setBuildMethod` on the churn,
  `dressOut` on the species. No `XApi.verb(host, …)`; no new Api; no
  logic singleton; no free helper (`CompositionShare` is a value class).
- **Module categories** — one new kernel value object, one new kernel
  mixin, both in existing `lib/` subsystems; a pack with the four
  branches, `idea/cmd/crafting/`, `__tests__/`; no pack `lib/` (nothing
  is inherited inside the pack); no `eslint-disable`; no Mongo
  collection; no migration (a dev DB holding pre-`chargedAtS` stills
  comes back with `0`, which is "charged long ago").
- **A bound arg is `MqlOneResult`** — `MouldController` reads
  `model.hoop?.stuff`; `HeatController`'s new arm reads `model.target?.stuff`.
- **`requires: A|B` deletes a check** — `heat.yaml` moves to `requires:
  any` with the controller narrowing to its two arms (the `split.yaml`
  shape; declared, so `lint:arg-kinds` sees it); `mould.yaml`'s hoop is
  `requires: ManualBuildMixin` with `default: "reachable:[capability.hoop]"`;
  `split.yaml` stays `any`.
- **Identity, not lineage** — the milker stamp and `runMaker` are
  `getIdentityPath()`; the herd overlay keys on `(herdId, index)`.
- **Lint gates with new work in them:** `lint:mixin-names` (`Ripening`
  added to `Mixins`), `lint:instanceable` (one new instanceable twin per
  pack class with a row; `lib/` substrate-only; every `boot:` entry a real
  row), `lint:controller-rows` (`MouldController.yaml` ships with its
  class), `lint:reachability` (`mould.yaml` afforded by `Hoop`; every new
  row propped), `lint:capabilities` (`hoop` and `churn` declared by rows
  AND consumed — `hasCapability('hoop')` in the mould recipes' tool gate,
  `churn` by the row's `rate` read — in the same wave), `lint:mass` (every
  Thing row `mass` + `_materialPath`), `lint:perishable` (wheel, wedge,
  vell on `Provision`; cheese/vell materials with `Ea`), `lint:pathogens`
  (unchanged roster), `lint:doneness` (every heated recipe authors
  `maxHeatK`; ceiling stays 0), `lint:anatomy` (the vell line claims no
  tissue), `lint:kept-animals` (the goat row), `lint:arg-kinds`
  (`mould.yaml`, `heat.yaml`), `lint:verb-collisions` (no second view for
  `churn`/`mould`; `KNOWN_COLLISIONS` untouched), `lint:closed-vocabularies`
  (ceiling 5, **no member added to `MATURATION_MECHANISMS`**),
  `lint:on-create` (unchanged), `lint:lib-statics` (`--report` before and
  after W0; new mixins carry only `_mixinName`/`fieldMeta`/
  `markupAugmenters`), `lint:unconsumed-seams` (every new authorable
  field has a reader in its wave), `lint:untitled` (every new row under a
  claimed extent — the dairy yard and the creamery claims land in W4 with
  their rows), `lint:census` (every path-valued field resolves — the vell
  row ships in W1 with the species lines that name it), `lint:field-meta`,
  `lint:imports`, `lint:gates` (absolute `FromModule` strings in the pack),
  `lint:module-scope`, `lint:drive-scripts`, `lint:test-bootstrap`,
  `lint:test-content`, `lint:instrument-args` (`mould`'s hoop is declared
  with a default; nothing hunts), `lint:dossiers` (the three new cast rows
  claim competence their seats need), `lint:presentation`, `lint:schema`
  (no collection change).

---

## Waves

### W0 — the kernel seams (D2, D3, D4, D6, D7, D8, D9, D12)

**Goal.** Every seam a row or a pack class will lean on exists, is tested,
and changes nothing shipped: every default is today's behaviour.

**Files.**
- `packages/server/src/mud/lib/material/Freshness.ts` — `export interface
  SpoilageHolding { holdsSpoilage(): boolean }`; a module-private
  `heldBy(holderOrHost)` structural probe (the `TravelNodes.of` shape);
  `Freshness.load()` and `FreshnessMixin.reconcileFreshness` stamp-and-return
  while held (the stamp advances so a release never bills the held span).
- `packages/server/src/mud/lib/material/CompositionShare.ts` — the value
  object: `new CompositionShare(spec)`, `evaluate(material): number`,
  `isEmpty()` — **no statics** (the `lint:lib-statics` ceiling). Authored shape `{ nutrients: Record<string,
  number>, floor?: number, cap?: number }`; result clamped to `(0, 0.9]`.
- `packages/server/src/mud/lib/maturation/MaturationProfile.ts` —
  `transforms: {category: string; becomes: string}[]` (validated:
  non-empty strings, `becomes` not equal to the input), `scaldAboveK:
  number | null`, `leesShare: CompositionShareSpec | null`; `fieldMeta`
  entries; `getLeesFractionFor(material)` = `leesShare ? evaluate :
  leesFraction`. `rateAt`/`damageSat` (today module-private functions in
  `Maturing.ts`) become **instance methods on `MaturationProfile`**
  (`profile.rateAt(tempK)`, `profile.damageSat(tempK)`) so `Ripening`
  shares them — methods, not statics: a new `lib/` static is a
  `lint:lib-statics` rise, and these are a row's own answers about itself.
- `packages/server/src/mud/lib/maturation/Maturing.ts` — `holdsSpoilage()`;
  `batchPeakK` (persistent, `runtimeState`), folded from the reconcile's
  samples and reset by `startBatch`/`rekeyBatch`; `applyBatchGrade`'s
  fourth link; `classifyForeignPour` returns `'transform'` when the
  profile's `transforms` has a `category` the poured material carries
  (checked **before** pitch/feed); `applyForeignPour('transform', …)` →
  `rekeyBatch(becomes)`; `startBatch` writes `parts` onto the interior
  payload; `leesVolumeL` uses `getLeesFractionFor(inputMaterial)`.
- `packages/server/src/mud/platform/idea/api/BulkableLogic.ts` —
  `tryInoculate` accepts the third kind (its notes say *"it thickens as
  the rennet goes in"* from the host's `foreignPourLine(kind)`; the pour
  moves the litres — a transform IS matter added, unlike a pitch).
- `packages/server/src/mud/lib/fractionation/FractionSchedule.ts` —
  `restDays` (≥ 0), `residueShare: CompositionShareSpec | null`,
  `getResidueFractionFor(material)`; `Fractionating.ts` — `chargedAtS`
  stamped at charge, `reconcileRun` requires `heatReached ∧ (nowS −
  chargedAtS) ≥ restDays × DAY` to begin; `residueFloorL` reads the
  per-material share. A `look` line for a resting charge (*"It stands;
  nothing has separated yet."* — the pan's own `character` is on its
  fractions; this is the state line).
- `packages/server/src/mud/lib/maturation/Ripening.ts` — `RipeningMixin`
  + `Ripening` interface (`reconcileRipening`, `getRipeningPhase`,
  `getRipeness()` → fraction, `holdsSpoilage`, `ripenessLine(viewer)`);
  `static _mixinName: string = 'RipeningMixin'`; `fieldMeta`
  (`ripeningPhase`, `ripenessFraction`, `ripeningStamp`, `ripeningProfileKey`,
  `_ripeWorst`, `overDays`, all persistent runtime state);
  `markupAugmenters` filtered to `look` + `taste`;
  `__validateComposition__` requires `Fresh`, `Thermal`, `Graded`. Profile
  matched by the host's material tags on first reconcile and on
  `setMaterial`. `Mixins.Ripening = 'RipeningMixin'` + refusal
  `"{} doesn't ripen"` in `lib/mixin.ts`; `MixinApi.isRipening`.
- `packages/server/src/mud/platform/idea/species/Species.ts` — `TapSpec.sex?`,
  `TapSpec.restDays?`, `ButcheryYield.maxAgeDays?`; `dressOut({…,
  ageDays?})` skips a line whose `maxAgeDays` the body exceeds (absent
  age ⇒ the line is kept — unmodelled is open, the tri-state rule).
- `packages/server/src/mud/lib/husbandry/Producing.ts` — `planTap`'s
  `wrong-sex` refusal (after `no-such-tap`, before the window: *is this
  the animal that gives it* precedes *is it the season*); `productionRead`
  skips taps the sex cannot have; `dryOff(key)`; `pourTake` stamps
  `maker` and the hygiene inoculum (D11) — reads `HARM_DEFAULTS.SEPSIS_DIRTY_THRESHOLD`
  (`platform/idea/Condition.ts:287` — ⚠ a `lib/` file importing from
  `platform/idea/` is the existing direction `Hygiene`'s consumer already
  takes; if `lint:imports` refuses it, the threshold moves to a `hygiene.*`
  dial in `AppSettings` read by both), `MILKING_INOCULUM = 0.3` module
  const.
- `packages/content/trade-cooking/src/idea/cmd/crafting/ButcherController.ts`
  — passes the body's age to `dressOut` (the birthday accessor the mint
  stamps; locate it in `lib/mortality/Postmortem.ts` / `Organism` in this
  wave and name it in the commit).
- `packages/server/src/mud/platform/idea/cmd/crafting/HeatController.ts` +
  `packages/content/platform/content/platform/cmd/crafting/heat.yaml` —
  the placing arm (D6): the view's `requires:` becomes **`any`** (the
  `split.yaml` shape — a build vessel and a cold vat share no mixin and a
  `CocktailShaker` is a build vessel that is not Thermal, so an alternation
  would delete a check) and the controller narrows: a build vessel takes
  the latch arm; otherwise a target that is `Thermal` and `Containable` and whose giver's reachable furnace composes
  `PlacingMixin` and `isLit()` → `ContainmentApi.place(target, 'on',
  furnace)` with the scene *"You set X on the fire."*; declines
  `no-fire-to-set-on` otherwise; the build arm unchanged.
- `packages/server/src/mud/platform/idea/cmd/crafting/StirController.ts` +
  `stir.yaml` — `verbs: [stir, shake, churn]`, `churn → 'churned'`, the
  begin/complete scenes read the verb.

**Tests** (`__tests__/` beside each, `test-bootstrap` imported):
`Freshness.hold.test.ts` — a bulk slot whose holder answers
`holdsSpoilage() = true` keeps its load across a warm game-week and its
stamp moves; released, it spoils from where it was; a discrete host the
same; a holder that does not answer is unchanged (byte-identical loads
to the shipped fixture). `CompositionShare.test.ts` — the three milks'
cream and curd shares, monotone in fat; floor/cap honoured; an empty spec
is empty. `Maturing.transform.test.ts` — rennet into a pitched `milk`
batch rekeys to `renneted-milk` with the strain, days and mark intact;
rennet first then starter reaches the same state; a material with no
`coagulant` tag still declines as a mismatch; `batchPeakK` exceeding
`scaldAboveK` caps the band at `poor` and a 336 K hold does not; `parts`
names the input. `Fractionating.rest.test.ts` — a `restDays: 0.2`
schedule gives milk back as milk before the rest and skim-then-cream
after; a `restDays` absent schedule is byte-identical to the shipped
still tests (those must not change). `Ripening.test.ts` — a soft profile
reaches `ripe` in ~7 game days at 284 K and `turned` after `turnDays`
open; a hard one climbs for 60 days and never turns; 300 K kills; the
grade band writes monotone; `holdsSpoilage` true while active; the
augmenter speaks on `look`/`taste` and not `smell`; **no digit in any
line** (the fractionation test's own regex). `Producing.sex.test.ts` —
a tap authoring `sex: female` refuses a male host with the voice and the
reason `wrong-sex`; a tap with no `sex` is unchanged; `dryOff` then
`tapWindow` reads `dried-off`; `productionRead` on a bull says nothing
about milk. `Producing.pourTake.test.ts` — the slot's `maker` is the
milker's identity path; dirty hands deposit `e-coli` scaled by
`1 − cleanliness`, clean hands deposit nothing; a `Contaminable` vessel
takes the surface load, a plain one does not. `Species.dressOut.test.ts`
— a `maxAgeDays: 60` line yields at 30 days, not at 400, and yields with
no age given. `HeatController.test.ts` — a `Vat` beside a lit `Hearth`
is placed on it and its `restamp` reads the fire; beside a cold one it
declines; a build vessel still latches. `StirController.test.ts` — `churn`
records `churned`.

**Acceptance.** `pnpm test:near` green; `pnpm -C packages/server lint:family`
green with `closed-vocabularies` at 5, `on-create` unchanged,
`lib-statics` unchanged (`--report` diff shows only `_mixinName`/
`fieldMeta`/`markupAugmenters`); every shipped maturation, fractionation
and taps test unchanged.
**Commit:** `build(dairy W0): the kernel seams — a live ferment holds spoilage, a pour may rekey a batch, a solid ripens, a tap has a sex and a rest`.

### W1 — the animals, the milks, the vell, the pail (D3, D8, D11, D12, D13)

**Files.**
- `packages/content/trade-ranching/content/stuff/idea/material/food/milk.yaml`
  (`spoilActivationEnergy: 60000`, `waterActivity: 0.99`, tags `+ milk,
  cow-milk`), `ewe-milk.yaml`, `goat-milk.yaml` (D3 numbers; same tag
  shape).
- `…/species/animalia/chordata/mammalia/artiodactyla/bovidae/capra/hircus.yaml`
  (D13), `bos/taurus.yaml` (`sex: female`, `restDays: 3`, the vell line
  with `maxAgeDays: 60`), `ovis/aries.yaml` (the milk tap, D13; the vell
  line at `maxAgeDays: 30`), `…/aves/galliformes/phasianidae/gallus/domesticus.yaml`
  (the egg tap `sex: female` — located by path in this wave).
- `packages/content/trade-ranching/src/idea/HerdRegistry.ts`
  (`HeadOverlay.driedOffAt`, `HerdRecord.femaleFraction`),
  `src/thing/Herdbook.ts` (`femaleFraction` authorable, filed in
  `onCreate`), `src/idea/cmd/ranching/DraftController.ts` (`setSex`;
  `femaleFraction` from the record; the rest check → `dryOff`),
  `ReturnController.ts` (writes `driedOffAt` for every dried-off `expire`
  tap), `src/agent/Livestock.ts` (`tapRefusal('wrong-sex')`: *"He has
  nothing to give you — a bull does not milk."* / a cockerel line for
  eggs).
- `packages/content/hearts-delight/.../thing/ox-book.yaml` —
  `femaleFraction: 0`.
- `packages/content/trade-cooking/content/trade/cooking/thing/vell.yaml`
  (`Provision`, `_materialPath: /trade/cooking/idea/material/vell`,
  `mass 0.3`) + `…/idea/material/vell.yaml` (`Ea 50000`, `a_w 0.99`,
  tags `[food, offal, vell, perishable, once-living]`).
- `packages/content/generic-objects/content/stuff/thing/vessel/pail.yaml`
  — `class: /platform/thing/CraftVessel` (header comment rewritten: a
  pail is food equipment — washed, serviceable, a carrier).

**Tests.** `trade-ranching/src/__tests__/lactation.test.ts` — a dairy
head drafted, left 0.7 game days, reads dried off; returned; redrafted at
once still dry (`look` says so); advanced 3 game days and redrafted, in
milk; a bull from the same book refuses `milk` with the voice; the ox
register's two heads are male. `herdbook.test.ts` gains the
`femaleFraction` round-trip. `species-rows.test.ts` (new or extended) —
the goat row warms, has a milk tap and a vell line; the ewe's milk window
is closed at `daylight 0.3` and open at `0.5`; `dressOut` at 30 days
yields a vell and at 400 does not. `trade-cooking/src/__tests__/` — the
vell row clones as a `Provision` and spoils. A world test
(`lib/world/__tests__/` or the pack's) that `wash pail` is afforded and
clears a surface load.

**Acceptance.** The pump and taps wire files still pass their pail
checkpoints (`pnpm wire -- pump.dirty taps.dirty`); `lint:family` green
(`lint:census` sees the vell row; `lint:anatomy` passes a non-claiming
line; `lint:kept-animals` passes the goat).
**Commit:** `build(dairy W1): three milks, a goat, a vell off a young head, a herd with a sex and a dry period, and a pail you can wash`.

### W2 — the `trade-dairying` pack (D1, D4, D5, D7, D9, D10, D16)

**Files.**
- `packages/content/trade-dairying/{package.json, pack.yaml, tsconfig.json,
  vitest.config.ts, README.md}` — deps `platform`, `base-library`,
  `generic-objects`, `trade-cooking` (the vell, the salt sack, the
  butcher's categories), `@saxonberg/server`, `@saxonberg/types`;
  `root: /trade/dairying`; title `{extent: /trade/dairying, holder:
  {organization: /compact/trade}}`; `boot:` none (catalogues warm by
  class). Root `package.json` gains the line; `pnpm install`.
- `src/thing/SettingPan.ts`, `Churn.ts`, `Hoop.ts`, `Wheel.ts` (D4, D5,
  D9, D10); `src/idea/cmd/crafting/MouldController.ts` (the `plate`
  shape over `ManualBuildController`; `FromModule('/trade/dairying/idea/cmd/crafting/MouldController')`
  absolute).
- `content/trade/dairying/cmd/crafting/mould.yaml` (`verbs: [mould, mold]`;
  `hoop` `required: false`, `default: "reachable:[capability.hoop]"` — a
  cook pot beside the hoop must not be the default — `requires:
  ManualBuildMixin`) + `idea/cmd/crafting/MouldController.yaml`.
- `content/trade/dairying/thing/{setting-pan, churn, hoop, soft-wheel,
  hard-wheel, wedge, cheese-vat, starter-crock, rennet-jar, butter-crock,
  ricotta-basket}.yaml` (every one `mass` + `_materialPath`; the churn
  `capabilities: [{kind: churn, rate: 1}]`; the hoop `capabilities:
  [hoop]`; the wheels `wedgesPerWheel: 8`, `_materialPath` the cheese).
- `content/trade/dairying/idea/material/*.yaml` (the fifteen in D1, with
  the D2/D9 constants; `butter` tags `[food, dairy, fat, …]`; `whey` tags
  `[food, dairy, liquid, whey, perishable]`; `cream` `[…, cream]`;
  `churned-cream`; `rennet` `[coagulant, liquid]`).
- `content/trade/dairying/idea/maturation/{soft-curd, firm-curd,
  whey-starter, yoghurt, soft-cheese, hard-cheese}.yaml` (D7, D9 — the
  two cheese profiles are the RIPENING rows: `inputCategory: soft-cheese`
  / `hard-cheese`, `mechanism: microbial`, `ratePerDay 0.14` /
  `0.0167`, `happyK 284`, `damageAboveK 291`, `killK 300`,
  `productAtFraction 0.3`, soft `turnDays 4`).
- `content/trade/dairying/idea/fractionation/{milk-setting, churning}.yaml`
  (D4, D5; `discipline: dairying`; characters with no digit).
- `content/recipes/{soft-wheel, hard-wheel, rennet, scald-milk, ricotta}.yaml`
  (D8, D9, D15 — `discipline: dairying`, every heated one with `maxHeatK`).
- `content/trade/dairying/idea/Discipline/dairying.yaml` (D16).

**Tests** (`src/__tests__/`, the pack's own vitest): `setting.test.ts` —
milk charged, advanced four game-hours, pours skim and stops at the cream
share derived from the fat (ewe > cow > goat by the numbers); poured
before the rest it is milk. `churn.test.ts` — cream at 287 K churned
breaks; buttermilk draws off and the residue is butter carrying the `fat`
tag; at 278 K it will not come; at 298 K it breaks `fair`. `curd.test.ts`
— milk in a `cheese-vat`, starter poured from a `starter-crock`, sets
soft; with rennet, firm; whey drawn off, the residual is curd and
pourable; the drawn whey into a crock reads as a living starter; a vat
held at 336 K for thirty game-minutes kills strain, flora and an
inoculated pathogen, and a fresh pitch starts it again; one held at 375
K sets `poor`. `wheel.test.ts` — `mould` on a hoop holding 2 L firm curd
+ salt mints a `hard-wheel` with the maker's mark and `parts` naming the
milk; the first mould earns the deed and `make hard-wheel` then works;
a wheel at 284 K reads young → ripe; `split` with a knife yields a wedge
of the same material and grade and the wheel at seven; `split` with a
spoon refuses; the wedge spoils on its own clock. `rows.test.ts` —
every material a profile or schedule names resolves; every recipe's
categories are carried by some shipped material; no character has a
digit. A **content test** that the pack ships no Api, no logic singleton,
no free export (the `trade-tanning` README's shape).

**Acceptance.** `pnpm -C packages/content/trade-dairying test` green;
`lint:family` green (`lint:capabilities` sees `hoop` + `churn` declared
and consumed; `lint:controller-rows`; `lint:reachability` will complain
that the rows are propped nowhere until W4 — if it does, the instrument
rows move to W4's commit, the pump W1 precedent).
**Commit:** `build(dairy W2): trade-dairying — the pan, the churn, the vat's profiles, the hoop and its mould, the wheel that ripens`.

### W3 — the kitchen (D15)

**Files.** `packages/content/trade-cooking/content/recipes/{creamed-mash,
toasted-cheese, baked-custard}.yaml`; `packages/content/trade-baking/content/recipes/milk-dough.yaml`;
`trade-cooking` and `trade-baking` `package.json` gain
`@saxonberg/content-trade-dairying` **only if a recipe names a dairying
row** — they do not (they match by category tag), so no line; a world
test in `trade-dairying` proves the cross-pack match instead.

**Tests.** `trade-dairying/src/__tests__/kitchen.test.ts` — `pan-fried-roots`
resolves with butter as its fat; `creamed-mash`, `toasted-cheese` (a
wedge), `baked-custard` at 358 K mints `done` and at 380 K mints
`scorched` with the grade `poor`; `milk-dough` → `lean-loaf`; `ricotta`
from drawn whey.

**Acceptance.** `lint:doneness` ceiling 0 holds; `test:near` green.
**Commit:** `build(dairy W3): the kitchen takes dairy by category — butter as a fat, custard that curdles, a milk loaf, ricotta from the whey`.

### W4 — the venues (D14)

**Files.** Heart's Delight: `location/{dairy-yard, byre, creamery,
cheese-room}.yaml`, `thing/{dairy-book, calf-register}.yaml`,
`agent/{dairywoman, dairy-lad, creamery-keeper}.yaml`,
`idea/{dairy-business, creamery-coop}.yaml`, `valley-gate.yaml` (two new
exits, coordinates agreeing), `pack.yaml` (two title claims; `boot:` for
the two books, the crock, the jar, the goat species; reasons written),
`package.json` (`+ trade-dairying`). Rejection: `kestrel-road/goat-pen.yaml`,
`kestrel-road/yard-gate.yaml` (the exit), `thing/goat-book.yaml`,
`pack.yaml` (`boot:` the goat book and the goat species), `package.json`
(`+ trade-dairying`, `+ trade-ranching`). ⚠ Rejection's `requires.title`
claims the Kestrel road as `wild`; the pen is a worked enclosure and sits
under the town's `agricultural`-less root claim — if `lint:untitled`/the
land-use gates refuse a herdbook on `wild`, the pen moves to a new
`location/goat-pen` under the town extent (the fringe side, east of the
yard gate) and the plan is updated; record which.

**Tests.** World tests per venue (`packages/content/hearts-delight` has no
`src/` — its tests are the wire drive; the row checks live in
`trade-dairying/src/__tests__/venues.test.ts`, which is the shipped
pattern for a code-less venue): every propped template resolves; the
dairy book's head 0 is female and head *n* (asserted by `HeadSeed`) is
male — the index the drive uses for step 4 is **computed here and named
in the drive**, so the drive's assumption cannot rot; the creamery's
crock is alive at boot; the goat book drafts a nanny that gives
`goat-milk`.

**Acceptance.** `lint:reachability`, `lint:untitled`, `lint:census`,
`lint:dossiers` green; `SAXONBERG_PACKS=platform` still boots (nothing
here is platform's).
**Commit:** `build(dairy W4): a dairy farm on the flats, the co-op creamery and its cheese room, and three nannies at Rejection — rows`.

### W5 — the drive, the docs, the gates (D17)

**Files.** `packages/wire/tests/dairy.dirty.wire.test.ts` (26 steps + the
optional calf checkpoint; `declareFile.packs` lists every pack the walk
touches); `docs/subsystems/dairying.md` (new: the trade as a reader
finds it — the pan, the churn, the vat, the hoop, the wheel, the three
milks, the hygiene source; one-line pointer added to `CLAUDE.md`'s map
at the sweep, not here); the touched subsystem docs get their history
lines (`spoilage.md` § the collision is now decided; `maturation.md` §
the discrete twin + `transforms`; `fractionation.md` § `restDays`;
`taps.md` § `sex`/`restDays`; `ranching.md` § the dry period;
`butchery.md` § `maxAgeDays`; `crafting.md` § `mould`, `churn`, the
placing arm of `heat`); the plan's § Drive record.

**Acceptance.** `pnpm wire -- dairy.dirty` passes every checkpoint on a
fresh DB on `WIRE_PORT=2013`; `pnpm -C packages/server lint:family` green;
**`pnpm test` once** (the pre-MR run) green; push; MR opened against
`master`.
**Commits:** `drive(dairy): what driving the valley's milk found` then
`docs(dairy): dairying.md and the history lines`.

---

## Reachability wiring

Each capability's five links. Each fails closed and silent.

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| milk a cow/ewe/goat | `milk` (ranching, shipped) | `Livestock.peers` (shipped) | the species tap lines (`taurus`, `aries`, `hircus`); the milk materials | species rows at `sync-read` in each venue's `boot:` (the ewe and cow already are at the Delight; the goat is new in both packs) | `target requires: HandlingMixin`; `vessel requires: VisibleMixin` + `mustHaveBulkSlot` — a `CraftVessel` pail passes |
| the refusal to milk a bull | same | same | `TapSpec.sex` on the row | — | the sex is on the HEAD: `DraftController.setSex` (W1) — without it `getSex()` is `null` and the check is vacuous; a W1 test pins a male draft |
| the cow comes back into milk | `draft`/`return` (shipped) | `Herdbook.peers`/`environment` | `TapSpec.restDays`; `HeadOverlay.driedOffAt` | the book at `producer` | — |
| milk spoils | `smell`/`look`/`taste` | — | `Ea` on the three milk rows | — | — |
| cream rises | `pour` (bulk view) | — | `milk-setting` schedule; the `milk` tag on every milk row; `restDays` | `FractionScheduleCatalogue` warms by class (shipped `boot:` entry) | `pour source` `mustHaveBulkSlot` ✓ |
| butter | `churn` on `stir.yaml` | `ManualBuildMixin`'s statics (the churn composes it) | the `churning` schedule; `churned-cream`; the churn row's `rate` | — | `vessel requires: ManualBuildMixin` ✓ `Churn` |
| heat a vat | `heat` (placing arm) | `BurnerMixin` confers `heat` (shipped) | a lit Placing furnace in the room (the creamery's `Hearth` row, propped) | — | `requires: any` + the controller's two arms — ⚠ the binder refuses a `Vat` today (`requires: ManualBuildMixin`); W0 changes the view and the controller in one commit |
| the thermometer | `measure temperature <vessel>` (shipped) | the reading row | the `thermometer` row propped at the creamery | `ReadingCatalogue` (shipped) | `measure`'s subject `requires: any` |
| pitch, rennet, feed | `pour` (bulk) | — | profiles `soft-curd` (+ `transforms`), `firm-curd`, `whey-starter`; `coagulant` tag on `rennet` | the crock and the jar at `producer` (prefilled rows must be minted to be alive) | — |
| the curd and the whey | `pour`, `look` | — | `leesShare`, `productMaterial: whey`, `leesMaterial` | — | — |
| the wheel | `pour` (build view) + `put salt in hoop` + `mould` | `Hoop.commandContributions {peers, environment: [trade/dairying/cmd/crafting/mould.yaml]}` + `ManualBuildMixin`'s pour/stir | recipes `soft-wheel`/`hard-wheel`; `hoop` capability; the `salt` category on the salt sack | — | `mould.yaml hoop requires: ManualBuildMixin`; the recipes' tool gate `hasCapability('hoop')` |
| ripening | `look`/`taste` | — | `soft-cheese`/`hard-cheese` ripening profiles; tags on the cheese materials; a cold room (`_temperature: 284`) and a Placing shelf (`airExposure`) | `MaturationProfileCatalogue` (shipped) | — |
| wedges and a sale | `split`, `consign` | `split` is a platform verb over `requires: any`; `consign`'s shelf default | the `wedge` row; a `ConsignmentShelf` at the creamery | — | `consign thing requires: ChattelMixin` ✓ |
| raw-milk harm | `wash` (hands), `milk`, `eat`, `chronicle` | `WaterFixture` affords `wash` (the byre's water butt) | `payload.maker`, the `e-coli` row's `incubationSec` | — | `wash target requires: CraftedMixin` ✓ pail |
| rennet from a calf | `slaughter` (ranching) → `butcher` (cooking) → `dry` → `make rennet`/by hand | the farm's block + knife (the yard's props, shipped) | the vell line with `maxAgeDays`; the calf register | both books at `producer` | `butcher` gates on an edge (shipped) |
| the second venue | the same verbs | the same statics | the goat book, the pen's crock and pan | the goat book and species in Rejection's `boot:` | — |

---

## Acceptance-criteria coverage

| AC | satisfied by | proved by |
|---|---|---|
| 1 milk turns warm in ~a day, keeps cool for several | D2 (W0 hold + W1 `Ea`) | W0 unit windows; drive step 5 |
| 2 a bull or ox cannot be milked | D12 (W0 `sex`, W1 `setSex` + the ox register's `femaleFraction 0`) | W1 lactation test; drive step 4 |
| 3 cream, butter, buttermilk with `pour` + `churn` | D4, D5 (W0 `restDays`, W2 pan/churn/schedules) | W2 tests; drive 7–9 |
| 4 heating kills; too hot sets badly, in words | D6 (W0 placing arm + `scaldAboveK`) | W2 curd test; drive 10–11 |
| 5 starter → soft, + rennet → firm; whey off, whey starts the next | D7 (W0 `transforms`, W2 profiles) | W2 curd test; drive 12–14 |
| 6 a wheel ripens cool, reads in words, is worth more ripe, soft goes over, warm spoils | D9 (W0 `RipeningMixin`, W2 wheel + profiles, W4 the cold room) | W0/W2 tests; drive 16–18 |
| 7 split into wedges, a wedge consigned | D10, W4 shelf | W2 wheel test; drive 19 |
| 8 ewe's/goat's cheese differs, and follows from the milk | D3 (`CompositionShare`, `parts`) | W0 share test (yields monotone in fat); W2 curd test per milk; drive 24–25 (`taste` names the milk) |
| 9 rennet off a young head | D8 (W0 `maxAgeDays`, W1 vell + lines + calf register in W4) | W0/W1 tests; the optional drive checkpoint |
| 10 butter as the fat; custard curdles; mash, toasted cheese, milk loaf, ricotta | D15 (W2 ricotta/scald, W3) | W3 kitchen test; drive 20–21 |
| 11 raw-milk harm recorded against the producer | D11 (W0 `pourTake`, W1 pail) + the shipped ledger | W0 pourTake test; drive 22–23 |
| 12 a returned dried-off cow is back in milk after the rest, not before | D12 (W1) | W1 lactation test; drive 26 |
| 13 Rejection's goats need nothing new | D14 (W4 rows only) | `find packages/content/rejection -name '*.ts' \| wc -l` = 0; drive 24 |
| 14 a fermenting batch does not rot while its culture works | D2 (W0 hold) | W0 hold test (a pitched batch over a warm week); W2 curd test |
| 15 nothing at the university changes | D1 placement | `git diff --stat master -- packages/content/eternal-university` is empty at every wave; the drive's step 1 asserts the dairy yard's prose names no college |

Nothing is unmapped.

---

## Test & gate strategy

- **Unit, per wave** (`pnpm test:near` + the touched pack's vitest):
  every kernel seam in W0 has a test that the default is byte-identical
  (the shipped maturation/fractionation/taps suites unchanged is the
  acceptance), and a test that the seam fires. ⚠ Every assertion must be
  able to fail: the hold test asserts the load is EQUAL before and after
  the held week and GREATER after release — never "is defined".
- **World/content tests** in `trade-dairying/src/__tests__/` for the
  rows (profiles, schedules, recipes, venues) — a content test proves the
  content, so the engine tests in W0 stay synthetic.
- **The wire drive** is the only proof of: the binder on `heat vat`,
  `wash pail` and `mould`; the placing arm against a real `Hearth`; the
  hygiene decay over six game-hours; the ledger row; the cold room's
  temperature reaching the shelf; the species warm order. It asserts
  UNDERSTOOD + CHANGED (prose or state read back), never "not refused".
  ⚠ Re-run it after every review fix.
- **Lints**: `lint:family` after every wave; the ratchets named above
  must not rise (a rise is a caller audit written into this plan, not a
  number edit).
- **`pnpm test`** twice only: before the MR (W5) and at `/finalize`.
  Between: `test:near`, the pack suites, the family.

---

## Risks & opens

- **`pour`'s two views.** Pitching, renneting and racking ride
  `bulk/pour.yaml`; the hoop's curd pour rides `crafting/pour.yaml`. The
  collision is recorded and the dispatcher orders them today (the
  fermentation drives pass). If `pour vat into hoop` lands on the BULK view
  (a plain transfer, no build contribution), the hoop's reverse-match sees
  nothing — W2's wheel test is where it shows; the fix is the hoop's
  `canAddContainable`/the build-view arg gate, not a third view.
- **The vat's temperature on the hearth.** A 25 L vat's `τ = R·C` against
  a 500 K oven: the thermometer must read ~336 K inside a few game-minutes
  of clock advance, and boiling must be reachable in the drive's step 11.
  If the drift is too slow for the drive, the creamery's hearth row authors
  a lower `burnTemperatureK` (a dairy copper, not a bread oven) rather than
  the vat authoring a smaller mass — the fire is the dial a dairy actually
  has.
- **Spoilage held, pathogens not** — raw milk in a working vat keeps its
  `e-coli` and the curd carries it, which is the requirement; but the
  shipped `reconcileContamination` on a bulk slot also runs the organism's
  own growth at vat temperature, so a long warm set can GROW the load past
  the dose. True of real raw-milk cheese; stated so review does not read it
  as a bug.
- **The wild lag (D7)** means milk left in any `Vat` for a game day
  clabbers rather than spoils. If review finds that too generous, the
  profile authors `requiresStrain: lactic` and `spontaneousLagDays: 0`
  with `wildStrain: ''` — a row edit.
- **Ages at the knife.** The corpse's birthday accessor is asserted by the
  `Corpse.ts` header and not read this cycle; if the mint does not stamp
  one for a drafted head (whose age is `HeadSeed`'s), W0 adds
  `bornAt` to the mint from `Organism`'s age — a kernel line in the same
  wave, not a new seam.
- **The Kestrel road is `wild`.** The pen's parcel question is W4's to
  settle by the gates (see W4).
- **`heat`'s widened gate** reaches every Thermal thing in reach — a
  `heat chair` now declines with the fire line instead of the binder's.
  Accepted: the decline names the real reason.
- **Drive length.** Twenty-six steps with four clock walks; the pump drive
  ran under `WIRE_BOOT_TIMEOUT=900000`. Budget two sessions plus the
  wizard.
- **Stop-and-ask list** (the only real stops): a second mechanism word
  turns out to be unavoidable (it should not — if it is, the design is
  wrong, not the census); a kernel class would have to name a dairying row
  (none does: the kernel names `transforms` categories, never a path).

---

## Deferred seams

Clean attach points, each with the slate it leaves to.

- **Staffing the hourly tap / the hired hand** → `ranching-slate` (the
  cadence). The dairy business ships a seat that fulfils nothing.
- **NPCs buying cheese and butter** → `nutrition-and-fitness-slate` (the
  `eats` basket).
- **Whey to pigs; feeding anything** → `ranching-slate` (the feed loop).
- **Calving as the lactation's cause** → `ranching-slate` (breeding writes
  SERVED only). `TapSpec.restDays` + `freshen()` are the seam; gestation
  calls `freshen` where this build's draft does.
- **Fluid milk sold cold; the separator; HTST** → `cold-chain-slate`,
  `dairy-slate` *Left*. `restDays: 0` on a `separator` schedule is the
  epoch rung.
- **Rind care, bloomy/blue moulds, washing a rind** → `dairy-slate` *Left*;
  `RipeningMixin`'s profile is the attach point (a `turnedMaterial` for a
  rind that goes wrong; an act that resets `overDays`).
- **A `BulkPayload.peakK` declared by `lib/thermal/`** (so milk scalded in
  a pot arrives marked) → `dairy-slate` *Left*, with the finding that the
  doneness payload already stores a last sample.
- **Multi-maker provenance** (the milker and the presser are two people)
  → `provenance.md`'s open; the ledger names one `maker`.
- **A sixth mechanism word** → not a seam: `MATURATION_MECHANISMS` wants
  rows (the census says so); the day a third trade needs one is the day it
  becomes `<root>/idea/maturation-mechanism/<key>` rows.
- **Cured meats composing `RipeningMixin`** → `cooking-slate` (the named
  second consumer).
- **The flash-pasteurization finding** (the kill curve is about half as
  temperature-sensitive as real milk pathogens) → a recorded finding on
  `spoilage.md` at the sweep.
- **A regulated inspection regime / the co-op's sanction as code** →
  `dairy-slate` *Left*; the `creamery-coop` organization is the subject a
  rule would judge.

---

## Critical files

Read first, in this order:

1. `docs/requirements/dairy-requirements.md` — the product; the drive.
2. `packages/server/src/mud/lib/maturation/Maturing.ts` (l.538–760,
   806–900, 1080–1160) and `MaturationProfile.ts` (l.95–350).
3. `packages/server/src/mud/lib/fractionation/Fractionating.ts` (l.255–380,
   608–700) and `FractionSchedule.ts`; `packages/content/trade-fuel/content/trade/fuel/idea/fractionation/crude.yaml`.
4. `packages/server/src/mud/lib/material/Freshness.ts` (l.234–300,
   405–490, 660–760, 886–1049) and `Contaminable.ts` (l.255–345, 540–600,
   618–700).
5. `packages/server/src/mud/lib/husbandry/Producing.ts` (l.230–300,
   470–640, 655–830) and `packages/content/trade-ranching/src/idea/cmd/ranching/{DraftController,ReturnController}.ts`,
   `src/lib/HeadSeed.ts`, `src/idea/HerdRegistry.ts`.
6. `packages/server/src/mud/platform/idea/species/Species.ts` (l.40–110,
   432–560, 1195–1260).
7. `packages/server/src/mud/platform/idea/cmd/crafting/{HeatController,StirController}.ts`,
   `packages/content/trade-cooking/src/idea/cmd/crafting/PlateController.ts`,
   `packages/server/src/mud/lib/craft/ManualBuild.ts`.
8. `packages/content/trade-tanning/` (the pack scaffold) and
   `packages/content/trade-cooking/src/thing/{CookPot,KitchenTool}.ts`.
9. `packages/content/hearts-delight/` (every file) and
   `packages/content/rejection/content/world/terminus/rejection/{location/hillside,kestrel-road/yard-gate}.yaml`,
   `pack.yaml`.
10. `packages/wire/tests/pump.dirty.wire.test.ts` and
    `packages/wire/src/harness/index.ts`.
11. `docs/subsystems/{maturation,fractionation,spoilage,taps,ranching,crafting,thermal,content-packs}.md`
    — the sections cited in Grounding.

---

## Drive record

*(appended at build time, not at plan time)*
