# Dairy — implementation plan

Executes [dairy-requirements.md](../requirements/dairy-requirements.md)
(as revised at `d12166754` — moulds). **Revised 2026-10-10: moulds** — D9
and everything that hung on it (the press, the hoop, the wheel's row, the
`mould` verb) were reopened with the user; the revised decisions are
marked.
**Kind:** feature (a trade, and the venues it belongs to) · **Leads
from:** content · **first consumers of the four kernel seams:** milk
(spoils), the cheese vat (a live ferment holds off rot), the wheel (a
solid that ripens), the dairy book (a herd that comes back into milk).

What is built: a `trade-dairying` capability pack whose products are
ROWS over shipped substrate — a setting pan and a churn that are
**fractionating** vessels (the volume-drawn twin of maturation already
ships `separation: fractions`, which is a pan with a plug at the bottom),
a cheese vat that is a `Vat`, a kernel **mould system** — a vessel that
answers *when what is in me sets, what shape comes out?*, with the cheese
hoop (curd sets by draining, faster and further under a weight), the
smelt's ingot mould and the commons' ice pan (both freezing) as its three
consumers and **no verb** — a wheel that is a `Provision` composing a new
kernel `RipeningMixin`, and three milks whose cream and curd yields
**derive** from their own fat and protein. Seven small kernel seams carry
it (a spoilage hold, a batch rekey on a pour, a scald mark, a composition
share, a rest gate on a fraction schedule, a sex/rest pair on a tap, and
the set site asking its container first), one ranching wave gives the
herd a sex and a dry period, and three venues prove the second-venue
claim with rows.

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

7. **"Salt the curd" (step 15) / "salted curd set in a hoop."** No shipped
   act salts BULK matter: `cure` (trade-cooking, the salting trough) salts
   a discrete `Provision`, and a `Vat` is not a container a sack can be
   emptied into. **Resolution (D21):** salting is the shipped `cure` on the
   **unmoulded wheel** (dry-salting a pressed wheel is how most hard
   cheeses are actually salted; the creamery props a salting trough and a
   salt sack), so step 15 reads *pour the curd, weight it, take the wheel
   out, salt it*. The observable — a salted wheel that keeps longer by the
   water-activity model — is unchanged. Salt IN the hoop (a dissolving
   solute at the set) is recorded as a seam, not built.
8. **Step 19a needs molten copper**, and the smelt today never makes a
   pool: `runCharge` clones the product ROW into the furnace
   (`SmeltController.ts:719`, `pour()`), and the only liquid-metal path in
   the engine is a `Meltable` solid melting onto the room's **floor**
   (`Thermal.ts doMelt`). **Resolution (D19, revised):** the smelt's LIQUID
   branch runs the metal, as bulk at the furnace's held temperature, into
   the **crucible standing in the furnace** (a plain refractory vessel the
   player set there); the PLAYER then `pour crucible into mould` while it
   is molten and the mould's set gives the ingot; a crucible left to cool
   leaves a lump by the shipped freeze edge. With no crucible in the
   furnace the metal pools on the hearth and sets as a lump. ⚠ That changes
   the smelt's shipped output (`SmeltController.test.ts` expects an `Ingot`
   from `smelt-copper`, approved); the Rejection smelter props a crucible
   in its furnace and an ingot mould beside it so the chain the
   metal-chain drive walks still ends in an ingot, now by the player's
   pour. The drive step itself needs ore at the smelter — a wizard session
   clones an ore lot (the taps drive's set-up precedent).

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
  deed. **No view claims `churn`.** (`mould`/`hoop` are no longer verbs
  this build needs.)
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

### Casting, the set site, the smelt, the ice pan (revised 2026-10-10)

- `lib/thermal/Thermal.ts` — `reconcilePhaseImpl` (l.1213) runs
  `reconcileMelt` on a `Meltable & Thermal` host and `reconcileBulkPhase`
  (l.1281) on every `Bulkable & Thermal` host. The solidify edge (l.1304–
  1380): plateau at `mp` while `latentRemovedJ` banks, the ruin branch,
  then **`StuffApi.clone(mat.getCastTemplate())`** with mass from the
  pool, material/prose stamped only when the clone authored none, and
  `ContainmentApi.move(cast, v.getContainer())` — the cast lands **beside
  the vessel**, and the pool's payload is nulled (`setBulkPayload(aff,
  null)`). `doMelt` (l.1255) flows a melted solid onto the scope's
  `Floor` surface bulk — ⚠ **no crucible class or row exists anywhere**
  (`grep -rn Crucible` is empty).
- `Material.castTemplate` (`Material.ts:468`, authorable, default
  `/stuff/thing/Casting`); only `water.yaml` authors one
  (`/stuff/thing/ice-block`). `platform/thing/Casting = AlloyedMixin(MeltableMixin(ThermalMixin(Good)))`;
  `generic-objects/.../Casting.yaml` is the lump row;
  `ice-block.yaml` is a `Casting` row over `/trade/bottling/idea/material/ice`
  at 4 kg. `ice-pan.yaml` is a `Receptacle` (4 L, no Container, no
  Crafted) whose own header says the pan is a mould in all but name.
  `Thermal.freeze.test.ts` asserts the plateau, the solidify and the ruin
  — not where the cast lands.
- `trade-smelting`: recipes `smelt-copper`/`cast-bar` name
  `/trade/smelting/thing/copper-ingot` (`/platform/thing/Ingot =
  AlloyedMixin(ManualBuildMixin(MeltableMixin(ThermalMixin(Good))))`, a
  build vessel — which is why a smith can `hammer` an ingot and not a
  `Casting`). `SmeltController.runCharge` (l.399–535): destructs the
  charge, computes `liquid = !ferrous || heldK >= meltingPointOf(carbon)`,
  resolves `productRowFor(material)` by `_materialPath` under
  `/trade/smelting/thing`, and `pour(furnace, row, kg)` clones the row
  INTO the furnace; credits `smelting`. `SmeltingFurnace =
  ContainerMixin(Forge)`; the Rejection smelter props the furnace, tongs,
  slag, an anvil, a hammer, two charcoal — no mould, no crucible.
  Shipped assertions on the output: `SmeltController.test.ts` (an `Ingot`
  from `smelt-copper`), `smelt.test.ts:138` (reads the copper-ingot row),
  `metallurgy.dirty.wire.test.ts:245` (the store's ingot is gone — not
  the smelt's).
- `lib/spatial/Placing.ts` — `getPlaced(name?)` walks the host's
  environment for items whose placement pair names it (no storage on the
  mixin); `airExposure` authorable; `canPlace` veto. `put.yaml` accepts a
  `PlacingMixin` target with `on`. `get.yaml` reaches into an open
  container or off a surface by name (`scope: peers`).
- `lib/material/Durable.ts` — composes on any Stuff; `wear(amount =
  0.01)`, `isBroken()` at the `crafting.brokenThreshold` dial.
- Discipline credit for a vessel act: `platform/idea/cmd/bulk/PourController.ts:98–120`
  credits `fermenting` on a rack of a finished batch and the schedule's
  own discipline on a draw; `Maturing.ts` credits nothing itself.
- `Mixins` has no `Mould`; `Cast` is the identity rung's name.

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
`CheeseVat`, `Hoop`, `Wheel` — and, since the 2026-10-10 revision, **no
verb**: the pack ships no `cmd/`), the intermediate and
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
the set site carries `parts` from the pool onto the wheel's stored payload,
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

**D9 (revised 2026-10-10: moulds) — Moulds are a kernel system; the hoop is
its first consumer; the wheel is a `Provision` composing a kernel
`RipeningMixin`; there is no verb.** A mould is a vessel that answers one
question — *when what is in me sets, what shape comes out?* — and the
glass slate's finding stands: today the MATERIAL decides (`castTemplate`
at the freeze edge) and the RECIPE decides (`outputTemplate`), and a
mould is exactly the claim that the **container** decides and the recipe
owns no shape. Three pieces:

*(a) `lib/mould/Mould.ts` — `MouldMixin` + `Mould` interface*, a new
`lib/<subsystem>/` folder (the pump precedent; doc `docs/subsystems/mould.md`).
Composed on a `Bulkable + Thermal + Container` host. Authorable fields:
`castTemplate` (identity ref — the shape), `reusable` (default `true`),
`wearPerCast` (default `WEAR_PER_USE`), `discipline` (default `''` — what
a fill credits). Methods: `castTemplateFor(material)` (the row's
`castTemplate`; a **broken** reusable mould answers the material's own
default — a cracked mould casts a lump), `takeCast(cast)` (moves the set
thing INTO the mould, wears a reusable mould or breaks a consumed one),
`holdsCast()`, `loadKg()` (`Σ mass` of what is placed `on` it when the host
composes `PlacingMixin`, else 0), `reconcileSetting()` (the drain set,
below), `setLine()` (*filled · setting · set*, no digit). ⭐ **Every set
site asks the container first and falls back to the material**: the
freeze edge in `Thermal.ts` becomes `const mould = MixinApi.isMould(v) ? v :
null; template = mould?.castTemplateFor(mat) ?? mat.getCastTemplate();
destination = mould ?? scope`, and when the cast is `Fresh`/`Contaminable`/
`Crafted` the pool's `freshness`, `pathogens`, `maker` and `parts` are
carried onto it (today the payload is nulled — right for an ingot, wrong
for food). A plain vessel keeps today's behaviour exactly: the lump drops
beside it. `platform/thing/Mould = MouldMixin(DurableMixin(CraftedMixin(ThermalMixin(BulkableMixin(ContainerMixin(Good))))))`
is the instanceable twin every row but the hoop names.

*(b) Setting is the MATERIAL's.* Freeze is shipped (`meltingPoint` +
latent heat). **Drain** is new and is also a material fact:
`Material.drainSetting?: { days, becomes?, moisture: {unloaded, loaded},
loadRef }` (authorable) — curd drains over `days` unloaded, `(1 +
loadKg / (poolKg × loadRef))` times faster under a weight, and sets with
`moisture = lerp(unloaded, loaded, min(1, loadKg / (poolKg × loadRef)))`
written to the cast's water state; `becomes` is the material the set
thing is (curd → cheese, the way a finished batch swaps to its product;
absent ⇒ the pool's own material, which is what freezing does). The
cast's mass is the pool's less the water driven out (`poolKg × (1 − (1 −
moisture) × waterFraction)`). `MouldMixin.reconcileSetting()` is
reconcile-on-read on the mould's own reads (`look`, `get`, the bulk
reads) and integrates the LOAD as it stands at each read (the `Stand`
form, stated). `soft-curd` authors `{days: 0.5, becomes: soft-cheese,
moisture: {unloaded: 0.9, loaded: 0.75}, loadRef: 2}`; `firm-curd`
`{days: 0.5, becomes: hard-cheese, moisture: {unloaded: 0.8, loaded:
0.55}, loadRef: 2}`. With `a_w = base · moisture · (1 − solute)`, a
weighted firm wheel sits at or under the microbial floor and keeps for
months; an unweighted soft wheel at ≈ 0.89 keeps days. Nothing enumerates
"hard cheese keeps": the press drove the water out. Dry, cure and bake
are later set processes on the same hook (deferred seams).

*(c) The acts are the shipped ones.* `pour vat into hoop`, wait (the
whey draws down; `look hoop` says *"it has drawn down and firmed"*), `put
stone on hoop` to press (D21), `get wheel from hoop` (the hoop is an
open container; `get` reaches in). **No `mould` verb, no `MouldController`,
no recipe naming the wheel, no deed** — a gate whose key does not exist
is a lock (`preserve`'s ruling). The same three acts cast an ingot and
freeze a block (D19, D20). The fill decides the size (mass from the pool,
the shipped rule); an over-full hoop spills by the pour rule.

*The hoop and the wheel.* `Hoop = PlacingMixin(MouldMixin(DurableMixin(CraftVessel)))`
in `trade-dairying/src/thing/` — `CraftVessel` for food equipment
(washed, a surface load), `Durable` for the wear, `Placing` for the stone
(a drain mould takes a press; an ingot mould does not, so `Placing` is the
hoop's and not `Mould`'s), `MouldMixin` outermost; row `hoop`
(`castTemplate: /trade/dairying/thing/wheel`, `discipline: dairying`,
`closure: liquidTight` — the whey leaves by the set clock, not by the
drain-through arm, which would empty the hoop onto the floor the way the
pail once did). `Wheel = RipeningMixin(Provision)` implements `Splittable`
(D10); **one row**, `/trade/dairying/thing/wheel`, authoring **no
material**: the set stamps the pool's `becomes` (`soft-cheese` /
`hard-cheese`), so one hoop and one wheel row give every cheese the milk,
the curd and the press can make. `RipeningMixin` (`lib/maturation/Ripening.ts`)
is the DISCRETE twin of `Maturing`: no bulk, no strain, no lees; reuses
`MaturationProfile` rows matched by the host's material tags
(`soft-cheese`, `hard-cheese` — the `becomes` materials, so a vat's curd
never matches a ripening row), folds the host's `temperatureTrajectory`
through the profile's `rateAt`/`damageSat`, phases `idle | active |
finished | turned | killed` (a stored `killed`, maturation.md's own
deferred seam, taken because a wheel cannot be re-pitched), grade =
`min(damage, inputBand, maturity)` written to the Graded face each
reconcile with `productAtFraction` opening the *young but sellable*
window; `turnDays` on an open host is "goes over" (soft, `poor`); a hard
profile authors no turn and climbs to `masterful` over game months. `look`
and `taste` read the band in words. Composition-validated on `Fresh +
Thermal + Graded`; composed by `Wheel` only (kernel rather than pack
`lib/` because the requirements name it a kernel seam and its second
composer, a cured ham, is cooking's — the only common home is the kernel).
The hoop is **reusable** and wears per cast (`repair` restores it); the
`reusable` property ships on the mixin and **no consumed mould ships**
(the first casting trade that needs sand or wax ships one).

**D19 (new 2026-10-10; revised 2026-10-10 — the smelt does not pick the
mould) — The smelt fills the crucible; the player pours the mould.**
`runCharge`'s LIQUID branch (`!ferrous || heldK ≥ meltingPoint`) no
longer clones a product row. The metal goes where molten metal goes in a
furnace: into the **crucible** — the one plain `Bulkable + Thermal`
vessel standing INSIDE the furnace's container (`SmeltingFurnace =
ContainerMixin(Forge)`; the player put it there with `put crucible in
furnace`, and the furnace couple holds it at the fire's heat, so the
metal stays molten as long as the fire does). The run is a bulk transfer
— `massToLitres(kg, metal)` litres of the metal's own Material through a
transient `UnboundedReceptacle` (the `pourTake` shape) at `heldK`, the
calorimetric blend heating the crucible. With no crucible in the furnace
the metal pools on the hearth and sets as a lump in the furnace (the
metal's `castTemplate`). ⛔ **The engine chooses nothing**: there is one
crucible slot (the furnace's contents) and the player filled it; the
MOULD is the player's next act — `pour crucible into mould` (the bulk
`pour`, source `scope: reachable`, which reaches one level into the open
furnace, so the crucible is **poured where it stands**; nothing is
grabbed), then the shipped freeze edge casts the ingot INTO the mould
(D9a) as it cools: `look mould` — set; `get ingot from mould`. Dawdle, and
it freezes in the crucible as a lump (the plain-vessel rule, D9a:
beside it, which for a crucible in a furnace is *in the furnace*).
**Hot handling follows the shipped pattern and adds nothing:** a
bare-handed `get crucible` takes it AND scalds the hand through the
`heat` channel (`GetController.burnOnGrab`, a glove insulates); the
`gripping` tongs are read by nothing today and this build does not make
them a gate — a smelter who pours in place is never burned, which is the
honest procedure. ⚠ **No shipped check refuses molten metal into a
wooden pail**: `BulkableApi.transfer` reads closure (`liquidTight`) and
blends heat, not the vessel's melting point. Recorded as a finding in
Risks; the mould and crucible rows are fired clay, and the pail would
merely get very hot. The mould's `castTemplate` is
`/trade/smelting/thing/ingot` (an `Ingot`-class row authoring no
material, stamped from the pool — one row for copper, tin and cast iron;
`copper-ingot.yaml` stays for `cast-bar`). The SOLID branch (a bloom, a
carburized bar) is untouched. New rows in `trade-smelting`:
`thing/ingot-mould` (`/platform/thing/Mould`, fired clay, `discipline:
smelting`, `interiorCapacity 0.6` L ≈ 5 kg copper), `thing/ingot`,
`thing/crucible` (`/platform/thing/Receptacle`, refractory, `closure:
liquidTight`, 1 L). `SmeltController.test.ts` changes with it: molten
copper in the crucible after the run, an `Ingot` in the mould after the
pour and the cooling, a lump when the crucible is left, a lump in the
furnace with no crucible, the mass conserved on every path. A bar is
**still hammerable only as an `Ingot`**, so a lump wants remelting and
pouring — which is what the `cast-bar` recipe's prose has always
described. ⚠ `world-seed`'s `casting-yard` is the SPELL practice yard and
is not touched.

**D20 (new 2026-10-10; revised 2026-10-10 — water keeps a fallback that
reads as ice) — The ice pan is a true mould; a pot gives a lump of ice.**
`ice-pan.yaml` re-classes to `/platform/thing/Mould` with `castTemplate:
/stuff/thing/ice-block` (the pan's shaped block). `water.yaml` **keeps**
a `castTemplate`, re-pointed at a new generic row
`generic-objects/.../ice-lump.yaml` (`/platform/thing/Casting`, material
ice, *"a lump of ice, clouded and dripping"*, mass stamped by the pool) —
so water frozen in a bucket reads *a lump of ice*, never *a frozen lump of
water*. Chosen over a solid-phase name on `Material` because it is one
row and one line against a new kernel field every liquid would then
owe; the ice block stays the pan's answer and the lump the material's.
No prose change at the solidify edge.

**D21 (new 2026-10-10) — Pressing is a weight on the hoop; salt is the
shipped `cure`.** `put stone on hoop` (Placement `on`; the hoop composes
`PlacingMixin`, `placements: ['on']`, `canPlace` accepting anything with a
mass) — `loadKg()` is the drain rate's and the final moisture's input
(D9b); `get stone` lifts it. The press stone is a commons row
(`generic-objects/.../press-stone.yaml`, a `Good` of granite, 12 kg) — the
hoop is the only thing that reads it, by mass, which is why a sack of
flour works too. **Salt** does not go in the hoop (conflict 7): the
unmoulded wheel is a `Provision`, and trade-cooking's `cure` at the
creamery's salting trough applies the shipped `salt-cure` recipe's
`cure: {solute}` — the hard wheel's second hurdle, stacking with the
press's moisture exactly as the water-activity model says. The creamery
props a `salting-trough` and a `salt-sack`.

**D22 (new 2026-10-10) — Credit at the fill; no deed.** The bulk
`PourController` already credits a destination's schedule discipline on a
draw; it gains the symmetric line: a pour INTO a `Mould` whose row authors
a `discipline` credits it at `standard` (the hoop → `dairying`; the ingot
mould → `smelting`; the ice pan authors none). The decision a mould
teaches — how long, weighted or not, when to take it out — is read back
in the wheel's grade, water state and ripening, which is lens 1's
pedagogy; there is no recipe, so there is nothing a deed could gate, and
`make`/`cook` are not involved. `Ripening`'s read credits nothing (a look
is not a deed); the ripened wheel's grade is the maker's record.

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
row, a `thermometer`, a `salt-sack`, a `salting-trough` (cooking's, for
`cure wheel` — D21), two `press-stone`s, a `water-butt`, a `table`, a
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
schedules (`discipline: dairying`), the hoop (a fill into a mould credits
the mould's discipline — D22), the rennet, scald and ricotta recipes.
`RipeningMixin`'s read credits nothing.
`stockmanship` stays the animal's (the milking act credits it, unchanged).

**D17 — The drive is `packages/wire/tests/dairy.dirty.wire.test.ts`.**
Dirty: it consumes the creamery's seed starter and rennet, leaves wheels on
the shelf and milk in pails, drafts and returns heads, and infects a second
character. Twenty-eight steps (the requirements' 26 plus 19a and 19b),
every one asserting a state change or the exact refusal; the test clock
walks setting (hours), the hoop's drain (half a game day, twice — one
weighted, one not), ripening (a week; two months), the dry-off (0.6 game
days), the rest (3 game days), a poured mould cooling, a second crucible
left to freeze, and a pan freezing; a
second `Session` is the stranger; a wizard session reads the ledger,
clones the ore lot for 19a, and stands at the avenue block's freezer for
19b (the cold-storage drive's room — the only freezer a player can walk
to).

**D18 — Staging is seven waves, kernel first, each landable.** W0 kernel
seams (moulds included) · W1 the animals and the kitchen's inputs · W2 the
pack · W2b the other two moulds (the smelt, the ice pan) · W3 the kitchen
· W4 the venues · W5 the drive, the docs, the gates.

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
| `MouldMixin` (`lib/mould/Mould.ts`) — `castTemplate`, `reusable`, `wearPerCast`, `discipline` (authorable); `setProgress`, `setStamp` (runtime) | `platform/thing/Mould` and `Hoop` | *when what is in me sets, it takes MY shape and stays in me until taken out.* ⛔ Not `Bulkable` (a pail is not a mould), not `CraftVessel` (a pot is not), not `Receptacle`. The freeze edge asks `MixinApi.isMould`; a host that is not one gets today's behaviour exactly. |
| `Mould` (class, `MouldMixin(DurableMixin(CraftedMixin(ThermalMixin(BulkableMixin(ContainerMixin(Good))))))`) | `platform/thing/Mould`; rows `ice-pan` (commons), `ingot-mould` (smelting) | a made, wearing, washable vessel that casts. No `Placing` (a weight is the drain mould's fact), no `Contaminable` (an ingot mould is not food equipment). |
| `Material.drainSetting` (authorable) | `Material` rows (`soft-curd`, `firm-curd`) | *this matter sets by losing water over time, faster under load, and becomes that.* Read only by `MouldMixin.reconcileSetting`; vacuous on every other material. ⛔ Not on the mould (how a thing sets is the thing's business, which is the requirements' own sentence). |
| the set-site hook in `Thermal.reconcileBulkPhase` | kernel | *the container is asked first.* One `isMould` narrowing at the one place a pool becomes a solid; the payload carries onto a food cast. |
| `Hoop` (`PlacingMixin(MouldMixin(DurableMixin(CraftVessel)))`) | pack class, row `hoop` (`castTemplate: …/wheel`, `discipline: dairying`, `closure: liquidTight`) | food equipment that casts and takes a weight. ⛔ No `ManualBuildMixin` (nothing is reverse-matched), no `ToolMixin` (no recipe names a capability). |
| `Wheel` (`RipeningMixin(Provision)`, `Splittable`) | pack class, **one row** `wheel` authoring no material | a solid cheese that ripens and divides; its material is what set in the hoop. `wedgesPerWheel` authorable; `wedgesLeft` persistent. |
| `press-stone` | commons row over `Good` | a mass; nothing reads it but a hoop's `loadKg()`. |
| `ingot`, `ingot-mould`, `crucible` | `trade-smelting` rows (`Ingot`, `Mould`, `Receptacle`) | the shape the player pours into, the plain vessel the smelt fills, and what a lump is when nobody pours. ⛔ The crucible is NOT a mould (a pool left in it is a lump). |
| `ice-lump` | commons row over `Casting` | water's own fallback shape; the pan's `ice-block` is the mould's. |
| `wedge`, `vell`, `ricotta` (if discrete) | `/platform/thing/Provision` rows | food; no class. |
| `starter-crock`, `rennet-jar`, `cheese-vat` | `/platform/thing/Vat` rows (prefilled) | the culture-jar shape. ⚠ A rennet jar is a `Vat` only so `pour` from it carries no strain and so the row can prefill; its material matches no profile and it idles. The build may prefer `GradedReceptacle` for the jar — either is a row. |
| `skim-milk`, `cream`, `churned-cream`, `buttermilk`, `butter` (tags `fat`, `dairy`), `whey`, `renneted-milk`, `scalded-milk`, `soft-curd`, `firm-curd`, `yoghurt`, `ricotta`, `soft-cheese`, `hard-cheese`, `rennet` (tag `coagulant`) | `/trade/dairying/idea/material/*` rows | the trade's intermediates and products. Each perishable one authors `Ea` + `a_w`; `rennet` and `butter` author none (salted fat and a salt extract keep). |
| `ewe-milk`, `goat-milk`, the cow milk's `Ea`/`a_w`/tags | commons (`trade-ranching/content/stuff/idea/material/food/`) | facts about mammals. |
| `capra/hircus` | commons species tree | a species row. |
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
the host is wrong and the finding goes here, not in code. Likewise if
`MouldMixin` ever asks *what kind of mould am I* — the hoop knows about
weights because it composes `Placing`, and the mixin asks `MixinApi.isPlacing(this)`
once, which is an optional capability, not a host-set guard.

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
  (no `cmd/` — the pack ships no verb); kernel substrate at `lib/mould/`
  with its twin at `platform/thing/Mould`; commons rows at
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
- **A bound arg is `MqlOneResult`** — `HeatController`'s new arm reads
  `model.target?.stuff`; nothing else binds.
- **`requires: A|B` deletes a check** — `heat.yaml` moves to `requires:
  any` with the controller narrowing to its two arms (the `split.yaml`
  shape; declared, so `lint:arg-kinds` sees it); `split.yaml` stays `any`;
  no new view ships.
- **Identity, not lineage** — the milker stamp and `runMaker` are
  `getIdentityPath()`; the herd overlay keys on `(herdId, index)`.
- **Lint gates with new work in them:** `lint:mixin-names` (`Ripening`
  added to `Mixins`), `lint:instanceable` (one new instanceable twin per
  pack class with a row; `lib/` substrate-only; every `boot:` entry a real
  row; `lib/mould/` substrate-only), `lint:controller-rows` (no new
  controller), `lint:reachability` (every new row propped — no new
  verb, so no affordance to miss), `lint:capabilities` (`churn` declared
  by the churn row AND consumed by the row's `rate` read in the same
  wave; `hoop` is NOT a capability now), `lint:mass` (every
  Thing row `mass` + `_materialPath`), `lint:perishable` (wheel, wedge,
  vell on `Provision`; cheese/vell materials with `Ea`), `lint:pathogens`
  (unchanged roster), `lint:doneness` (every heated recipe authors
  `maxHeatK`; ceiling stays 0), `lint:anatomy` (the vell line claims no
  tissue), `lint:kept-animals` (the goat row), `lint:arg-kinds`
  (`heat.yaml`), `lint:verb-collisions` (no second view for `churn`;
  `KNOWN_COLLISIONS` untouched), `lint:closed-vocabularies` (ceiling 5,
  **no member added to `MATURATION_MECHANISMS`**, and `MaturationProfile.kind`
  gains no value — ripening rows are told apart by the tags they key on),
  `lint:on-create` (unchanged), `lint:lib-statics` (`--report` before and
  after W0; new mixins carry only `_mixinName`/`fieldMeta`/
  `markupAugmenters`), `lint:unconsumed-seams` (every new authorable
  field has a reader in its wave), `lint:untitled` (every new row under a
  claimed extent — the dairy yard and the creamery claims land in W4 with
  their rows), `lint:census` (every path-valued field resolves — the vell
  row ships in W1 with the species lines that name it), `lint:field-meta`,
  `lint:imports`, `lint:gates` (absolute `FromModule` strings in the pack),
  `lint:module-scope`, `lint:drive-scripts`, `lint:test-bootstrap`,
  `lint:test-content`, `lint:instrument-args` (nothing hunts; the smelt's
  mould is found in the furnace's room the way `crewOnShift` reads it —
  the completion has no binder), `lint:dossiers` (the three new cast rows
  claim competence their seats need), `lint:presentation`, `lint:schema`
  (no collection change).

---

## Waves

### W0 — the kernel seams (D2, D3, D4, D6, D7, D8, D9, D12, D20, D22) ✅

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
- `packages/server/src/mud/lib/mould/Mould.ts` — `MouldMixin` + `Mould`
  (D9a/b): `static _mixinName: string = 'MouldMixin'`, `fieldMeta`
  (`castTemplate {persistent, authorable, ref: 'identity'}`, `reusable`,
  `wearPerCast`, `discipline` authorable; `setProgress`, `setStamp`
  runtime), `__validateComposition__` requiring `Bulkable`, `Thermal`,
  `Container`; `castTemplateFor`, `takeCast`, `holdsCast`, `loadKg`,
  `reconcileSetting`, `setLine`; `markupAugmenters` on `look`.
  `Mixins.Mould = 'MouldMixin'` + refusal `"{} isn't a mould"`;
  `MixinApi.isMould`. `packages/server/src/mud/platform/thing/Mould.ts`
  — the twin (D9a composition), no own fields.
- `packages/server/src/mud/lib/material/Material.ts` — `drainSetting`
  (authorable, persistent; setter validates `days > 0`, moistures in
  `(0, 1]`, `loaded ≤ unloaded`, `loadRef > 0`, `becomes` a path or
  absent), `getDrainSetting()`.
- `packages/server/src/mud/lib/thermal/Thermal.ts` — `reconcileBulkPhase`'s
  solidify tail asks the mould (template, destination, `takeCast`), carries
  the pool's `maker`/`parts`/`freshness`/`pathogens` onto a cast that can
  hold them (narrowed by `MixinApi.isCrafted`/`isFresh`/`isContaminable`
  on the clone). A plain vessel's path is byte-identical (D20: water's
  own fallback is the `ice-lump` row, so no prose changes here).
- `packages/server/src/mud/platform/idea/cmd/bulk/PourController.ts` —
  a pour into a `Mould` with a `discipline` credits it (D22), beside the
  schedule credit.
- `packages/content/generic-objects/content/stuff/thing/vessel/ice-pan.yaml`
  → `class: /platform/thing/Mould`, `castTemplate: /stuff/thing/ice-block`
  (D20); new `generic-objects/.../ice-lump.yaml` (a `Casting` of ice);
  `packages/content/base-library/content/stuff/idea/material/bulk/water.yaml`
  `castTemplate: /stuff/thing/ice-lump`; `generic-objects/.../gear/press-stone.yaml`
  (D21).
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
records `churned`. `Mould.test.ts` — water in a `Mould` row authoring the
ice block freezes to an `ice-block` INSIDE the pan and the pan reads
*set*; the same water in a `Receptacle` freezes to a `Casting` lump
BESIDE it (today's behaviour, pinned); a broken mould casts the lump; a
reusable mould wears by `wearPerCast`; a `drainSetting` material in a
mould authoring `castTemplate` sets after `days` unloaded with
`moisture.unloaded`, and in half the time with `moisture.loaded` under a
load of `poolKg × loadRef` placed `on` a `Placing` host; the cast's
material is `becomes`, its mass is the pool's less the water driven out,
and `maker`/`parts`/`pathogens` ride onto it; a pour into a mould with
`discipline` credits the pourer once at `standard`; water in a plain
`Receptacle` freezes to an `ice-lump` beside it (the shipped cold-store
tests that read the row move from `ice-block` to `ice-lump` — named in the
commit); water in the pan to an `ice-block` inside it.

**Acceptance.** `pnpm test:near` green; `pnpm -C packages/server lint:family`
green with `closed-vocabularies` at 5, `on-create` unchanged,
`lib-statics` unchanged (`--report` diff shows only `_mixinName`/
`fieldMeta`/`markupAugmenters`); every shipped maturation, fractionation
and taps test unchanged.
**Commit:** `build(dairy W0): the kernel seams — a live ferment holds spoilage, a pour may rekey a batch, a mould decides the shape of what sets, a solid ripens, a tap has a sex and a rest`.

**✅ W0 done (build, 2026-10-10).** What changed against the plan, and why:
- **`madeFrom`, not `parts`.** There is no `BulkPayload.parts`; the nearest
  field, `composition`, is read for NUTRITION, so writing the milk there
  would feed a wheel as litres of milk. Maturation declares its own
  `BulkPayload.madeFrom` (written once at a batch's first fill, kept across
  the lees split and the rekey, carried onto a cast through a duck-probed
  `MadeFromHolding.setMadeFrom`). (Lens 2 and the bulk.md rule that each
  subsystem declares its own payload field.)
- **The churn is NOT a build vessel (D5 revised).** A `pour` into a
  `ManualBuildMixin` target routes to `crafting/pour.yaml`, which BANKS the
  matter as a recipe contribution and drains the source — cream poured into
  a build-vessel churn would vanish into the buffer. So `lib/craft/ManualBuild.ts`
  declares a `HandWorked { workByHand(method) }` shape; `stir.yaml` widens
  to `requires: any` (the `heat` precedent) and `StirController` narrows to
  two arms: a build vessel records the method; a hand-worked vessel works
  its charge and says what came of it. The churn row authors no
  `capabilities` (a churn is not a `Tool`); `churn` paces at a fixed 8 s.
- **A liquid freezes because it is COLD.** Nothing drove the bulk freeze
  edge on an ordinary read — only a cold store's envelope, a lit burner and
  spells did (the thermal.md comment claiming *"a CraftVessel drives it"*
  is false: no vessel calls `reconcilePhase`). So molten copper in a mould
  would never have set, nor a crucible left to cool. Thermal's post-drift
  driver now also runs the phase for a bulk holder at or below its pool's
  melting point (`freezesWhereItStands`) — **freeze side only**, so
  nothing boils on a warm read. A pail of water out in a frost now freezes
  to a lump of ice; that is D20's whole point.
- **The mould drives itself**: `MouldMixin.getContents()` reconciles the set
  first, so `get wheel from hoop` finds a wheel nobody has looked at; the
  freeze site calls `castInto` on a mould (`lib/mould/Mould.ts` owns the one
  cast path both set processes share).
- ⭐ **A shipped defect, found and fixed: the refinery column never ran.**
  `Fractionating.beginRun` returned early unless the schedule named a live
  `productMaterial`, and `separation: fractions` rows author `''` (the
  shipped `crude.yaml`) — a charged barrel warned and never began. And had
  it begun, the run's own reconcile read the span material through the
  read override and restarted the charge every read. Fix: a fractions run
  keeps the CHARGE as its stored material (no swap) and the override is
  skipped inside the run's own reconcile. Drilling's suite still green.
- **Ripening's input band** is recorded by a `setGrade` witness while idle
  (the Maturing precedent), not read at start — every wheel defaults to
  `fair`, so reading it capped every wheel at fair for ever (found by the
  W0 ripening test).
- `heat`'s placing arm finds the fire through `reachableHeatSource()` and
  needs it to compose `Placing` (a hearth, a stove); a forge declines with
  the same line. A test hearth must be lit explicitly — `Hearth.lit`
  defaults false.
- `press-stone.yaml` lands in **W4** with the creamery that props it
  (`lint:reachability` refuses an unreached row — the pump W1 precedent).

### W1 — the animals, the milks, the vell, the pail (D3, D8, D11, D12, D13) ✅

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

**✅ W1 done (build, 2026-10-10).** As planned, with these notes:
- `DraftController.mint` now applies the seeded sex (in a `try` — a
  species with no sex system refuses `setSex`, and the head stays
  unrecorded, which the tap reads as open) and restores a dry period from
  `HeadOverlay.driedOffAt` (`restoreDryPeriods`). `ReturnController`
  writes the stamp for every dried-off `expire` tap and **keeps an earlier
  stamp still inside its rest**, so turning a dry cow in twice does not
  restart her clock.
- `HerdRecord.femaleFraction` is optional; a record filed before it reads
  `DEFAULT_FEMALE_FRACTION` (0.85, the old literal). ⚠ A warm dev DB keeps
  its old ox record (get-or-create), whose oxen will draft 85 % female —
  drop the DB before the drive (dev DBs are droppable; no migration).
- The lactation behaviour (draft → dry → return → redraft) is proved by
  the drive (steps 4 and 26) rather than a controller-level test; the unit
  tests pin the record (`femaleFraction` round-trip, the seed's sex mix,
  the `driedOffAt` overlay fold) and the kernel half (`Producing.sex.test`).
- The pump/taps wire re-runs for the re-classed pail ride the W5 drive
  session (one boot).

### W2 — the `trade-dairying` pack (D1, D4, D5, D7, D9, D10, D16, D21) ✅

**Files.**
- `packages/content/trade-dairying/{package.json, pack.yaml, tsconfig.json,
  vitest.config.ts, README.md}` — deps `platform`, `base-library`,
  `generic-objects`, `trade-cooking` (the vell, the salt sack, the salting
  trough, the butcher's categories), `@saxonberg/server`, `@saxonberg/types`;
  `root: /trade/dairying`; title `{extent: /trade/dairying, holder:
  {organization: /compact/trade}}`; `boot:` none (catalogues warm by
  class). Root `package.json` gains the line; `pnpm install`. **No `cmd/`
  and no controller — the pack ships no verb.**
- `src/thing/SettingPan.ts`, `Churn.ts`, `Hoop.ts`, `Wheel.ts` (D4, D5,
  D9, D10, D21).
- `content/trade/dairying/thing/{setting-pan, churn, hoop, wheel, wedge,
  cheese-vat, starter-crock, rennet-jar, butter-crock,
  ricotta-basket}.yaml` (every one `mass` + `_materialPath`; the churn
  `capabilities: [{kind: churn, rate: 1}]`; the hoop `castTemplate:
  /trade/dairying/thing/wheel`, `discipline: dairying`, `reusable: true`,
  `closure: liquidTight`, `interiorCapacity 4`, `placements: [on]`; the
  wheel `wedgesPerWheel: 8` and **no `_materialPath`** — the set stamps
  it; ⚠ `lint:mass`/`lint:perishable` read authored rows, so the wheel
  row authors `mass` and the gate's material check is satisfied by the
  `becomes` materials being perishable and the class composing
  `FreshnessMixin` — if `lint:perishable` insists on a `_materialPath`,
  the row authors `soft-cheese` as a placeholder the set overwrites, and
  the plan records it).
- `content/trade/dairying/idea/material/*.yaml` (the fifteen in D1, with
  the D2/D9 constants; `soft-curd`/`firm-curd` author `drainSetting`
  (D9b); `soft-cheese` `Ea 70000`, `a_w 0.97`; `hard-cheese` `Ea 70000`,
  `a_w 0.91`; `butter` tags `[food, dairy, fat, …]`; `whey` `[food, dairy,
  liquid, whey, perishable]`; `cream` `[…, cream]`; `churned-cream`;
  `rennet` `[coagulant, liquid]`).
- `content/trade/dairying/idea/maturation/{soft-curd, firm-curd,
  whey-starter, yoghurt, soft-cheese, hard-cheese}.yaml` (D7, D9 — the
  two cheese profiles are the RIPENING rows: `inputCategory: soft-cheese`
  / `hard-cheese`, `mechanism: microbial`, `ratePerDay 0.14` /
  `0.0167`, `happyK 284`, `damageAboveK 291`, `killK 300`,
  `productAtFraction 0.3`, soft `turnDays 4`).
- `content/trade/dairying/idea/fractionation/{milk-setting, churning}.yaml`
  (D4, D5; `discipline: dairying`; characters with no digit).
- `content/recipes/{rennet, scald-milk, ricotta}.yaml` (D8, D15 —
  `discipline: dairying`, every heated one with `maxHeatK`). **No wheel
  recipe.**
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
K sets `poor`. `hoop.test.ts` — 2 L of firm curd poured into a hoop with
a 12 kg stone `on` it sets in under half a game day into a `wheel` of
`hard-cheese` INSIDE the hoop with `moisture ≈ 0.55`, the maker's mark
and `parts` naming the milk, sized by the fill (1 L → half the mass);
soft curd unweighted sets slower into `soft-cheese` at `moisture 0.9`;
the hoop's condition fell by `wearPerCast`; `get wheel` lifts it out;
`cure wheel` at a trough raises `solute`; the hard wheel's `a_w` is under
the microbial floor and the soft one's is not. `wheel.test.ts` — a wheel
at 284 K reads young → ripe; `split` with a knife yields a wedge of the
same material and grade and the wheel at seven; `split` with a spoon
refuses; the wedge spoils on its own clock. `rows.test.ts` — every
material a profile or schedule names resolves; every recipe's categories
are carried by some shipped material; no character has a digit; the
pack ships no Api, no logic singleton, no free export, no `cmd/`.

**Acceptance.** `pnpm -C packages/content/trade-dairying test` green;
`lint:family` green (`lint:capabilities` sees `churn` declared and
consumed; `lint:reachability` will complain that the rows are propped
nowhere until W4 — if it does, the instrument rows move to W4's commit,
the pump W1 precedent).
**Commit:** `build(dairy W2): trade-dairying — the pan, the churn, the vat's profiles, the hoop that casts a wheel, the wheel that ripens`.

**✅ W2 done (build, 2026-10-10).** Notes for review:
- **The churn is not a build vessel** (W0's D5 revision): `Churn` answers
  `HandWorked.workByHand('churned')`, reads its own temperature, and swaps
  cream → churned cream in the 283–291 K band (too cold: no swap; too warm:
  swap, grade capped `fair`). The churn row authors no `capabilities`.
- `SettingPan` and `Churn` compose `ContaminableMixin` too (food equipment
  — `wash pan` clears a surface load), beyond the plan's composition.
- **A drain set stamps its material** (`SetPool.stampMaterial`): the one
  wheel row authors a placeholder `_materialPath` (soft cheese) for
  `lint:mass`/`lint:perishable`, and the set must overwrite it with the
  curd's `becomes`. A freeze keeps a shape row's own material when the pool
  is `liquid`-tagged (an ice block is ice, never water) and stamps it
  otherwise (one ingot row for every metal).
- Ripening rows: `soft-cheese`'s `turnedMaterial` names the soft cheese
  itself (going over is a phase and a grade, not a substance); `wildStrain:
  ''` on both ripening rows.
- `lint:census` learned `transforms[].becomes` and `drainSetting.becomes`
  (`refsOf`), the gate's own instruction for a new path-valued field.
- ⭐ **Found by the W2 tests: a vat poured its whey labelled MILK.**
  `BulkableApi.transfer` reads the source's material before anything
  advances the batch, so a vat nobody had looked at since its curd set
  still answered *milk*. `Maturing.getBulkMaterialPath` now reconciles
  first (re-entry-guarded) — the guard `Fractionating` already had.
- ⚠ `lint:reachability` arm R is red from this commit until W4: the six
  vessel rows (pan, churn, vat, hoop, crock, butter crock) are propped by
  the creamery. They ship here because the pack's tests hydrate them.
- Added rows not in the plan's list: `jug` (the scald recipe's output and
  the buttermilk's carrier). `ricotta` is BULK in a `ricotta-basket`
  (a `CraftVessel`), not a discrete `Provision`.

### W2b — the other two moulds (D19, D20) ✅

**Files.** `packages/content/trade-smelting/src/idea/cmd/smelting/SmeltController.ts`
(`runCharge`'s liquid branch: `crucibleIn(furnace)` — the first plain
`Bulkable & Thermal` content of the furnace that is not a `Mould` and
holds nothing or the same metal — else the hearth lump; the bulk run
through a transient `UnboundedReceptacle` at `heldK`; the tap scene says
*"the metal runs bright into the crucible"* or *"…pools on the hearth"*);
rows `content/trade/smelting/thing/{ingot, ingot-mould, crucible}.yaml`;
`packages/content/rejection/content/world/terminus/rejection/location/smelter.yaml`
props an `ingot-mould` in the room and a `crucible` **in the furnace**
(Staged `{ template: …/crucible, in: <the furnace entry> }` if `Staged`
places into an earlier prop as it places onto one — the pump W0 finding;
else the room props it and the metal-chain drive gains a `put crucible in
furnace` line) (⚠ rows in a venue pack this build otherwise reaches only
in W4 — landed here because the shipped smelt chain must not go dark
between W2b and W4); the metallurgy history line is W5's.

**Tests.** `SmeltController.test.ts` — `smelt-copper` with a crucible in
the furnace leaves molten copper in the crucible at the charge's metal
mass and nothing minted; `pour crucible into mould` (`BulkableApi.transfer`
in the test) then a cool past the latent plateau leaves an `Ingot` of
copper IN the mould; the same crucible left to cool leaves a `Casting`
lump; with no crucible, a lump in the furnace; a bloom is still a bloom
in the furnace; `smelting` is credited for the run and (D22) for the pour
into the mould. `Mould.test.ts` (W0) already covers the pan.

**Acceptance.** `pnpm -C packages/content/trade-smelting test` green;
`pnpm wire -- metal-chain.dirty metallurgy.dirty` still pass; `lint:family`
green.
**Commit:** `build(dairy W2b): the smelt fills the crucible and the smelter pours the mould — an ingot if you pour, a lump if you wait — and the ice pan is a mould in name too`.

**✅ W2b done (build, 2026-10-10).** Notes:
- `runIntoCrucible` runs the metal as bulk through a transient
  `UnboundedReceptacle` into the crucible IN the furnace, clamped to the
  crucible's room, and sets the crucible's contents to the furnace's held
  heat; what does not fit (or all of it, with no crucible) pools on the
  hearth as a lump of the metal's own `castTemplate`, in the furnace. The
  liquid branch no longer needs a product row (only the solid branch does).
  The tap scene says where the metal went.
- ⚠ The ferrous LIQUID branch (a cast-iron run) loses the carbon fraction
  `setFractionOf` used to stamp on a pig: bulk carries no alloy state. The
  MATERIAL (cast iron — brittle, not forgeable) is the consequence that
  matters and is kept; recorded, not modelled.
- ⭐ **The freeze driver was narrowed** (a W0 decision, corrected here):
  tallow (320 K), pitch, paraffin and asphalt sit in crocks and barrels as
  `liquid`-tagged bulk below their own melting points, so a freeze on
  every read would have set a tallow crock into a lump and broken the
  chandlery. `freezesWhereItStands` now skips a `liquid`-tagged pool —
  those keep exactly their old drivers (a cold store, a fire, a spell) —
  and only a pool that is NOT a liquid at ambient (molten metal) sets by
  itself. Water still freezes in a freezer, not on a glance.
- The smelter props the crucible and the ingot mould IN THE ROOM: a
  placement key needs a `Placing` host and `SmeltingFurnace` is a plain
  container. The drive (and the metal-chain drive) must `put crucible in
  furnace` first.
- `SmeltController.test.ts` rewritten per conflict 8 (crucible run, hearth
  lump, pour into a mould → an `Ingot` of copper IN the mould, crucible
  left to cool → a lump, cast iron runs into the crucible); `smelt.test.ts`'s
  copper-row census admits the generic `ingot` row (minted only by a
  mould's set).

### W3 — the kitchen (D15) ✅

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

**✅ W3 done (build, 2026-10-10).** Four rows, no code: `creamed-mash`,
`toasted-cheese`, `baked-custard` (cooking), `milk-dough` (baking — milk
for water, `outputMaterial: dough`, so it proves and bakes into the shipped
loaf). `kitchen.test.ts` pins the category matches from the shipped rows;
the custard's curdle rides the kernel's doneness band (tested in
`CraftingLogic.doneness.test.ts`) and the drive. Ricotta shipped in W2.

### W4 — the venues (D14) ✅

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

**✅ W4 done (build, 2026-10-10).** What changed against the plan:
- **Sub-namespaces, not flat rows**: `…/hearts-delight/dairy/{location/yard,
  location/byre, thing/dairy-book, thing/calf-register}` and
  `…/hearts-delight/creamery/{location/floor, location/cheese-room,
  thing/hearth, thing/shelf, thing/cheese-rack}` — the `bench-field/`
  precedent, so ONE title claim covers each venue's extent (the dairy →
  `dairy-business`, `agricultural`; the creamery → `creamery-coop`,
  `commercial`, `powerBand: off-grid` — `lint:power-posture`).
- The creamery's hearth is its own row: the generic `Hearth` ships OUT
  (`lit: false`, 6 kg oak). The creamery's is lit, 30 kg of oak, 520 K —
  a dairy fire. The cheese room's shelf is the cooking pack's
  `DryingRack` class (a slatted surface things are put on).
- **Light at 20 m cells**: the copied indoor intensities (25–35) read
  under 0.1 lux over 400 m² — pitch black. The creamery is 12 000, the byre
  10 000, the cheese room 8 000 (`LIT_LUX` is 20). The three are added to
  `SKYLIT_INTERIORS` with their openings (`lint:light-sources` (b)); the
  cheese room's 284 K to `AUTHORED_TEMPERATURES` (`lint:envelope` — *the
  temperature IS the product*).
- Rejection's goat pen is WEST of the yard gate (north was taken by the
  road to the wilds) on the Kestrel road's `wild` claim — no gate refused
  a herdbook there. Rejection gains `boot:` (the goat book, the goat).
- ⭐ **The drive's bull is CALF 1** of the calf register: the dairy book's
  six heads all seed female at 0.95 (computed in `venues.test.ts`), and
  calf 1 is male at 42 game days — so the same calf is the wrong-sex
  refusal AND the vell. ⚠ The drive must do the calf steps BEFORE any long
  clock walk: a register's ages run on from its founding.
- `kitchen.test.ts` gained the `test-bootstrap` import (`lint:test-bootstrap`
  — it touches the runtime through `rows.ts`).

### W5 — the drive, the docs, the gates (D17)

**Files.** `packages/wire/tests/dairy.dirty.wire.test.ts` (28 steps + the
optional calf checkpoint; `declareFile.packs` lists every pack the walk
touches — `trade-smelting` and the avenue block's pack included);
**`docs/subsystems/mould.md`** (new: the system — the question a mould
answers, set-site-asks-the-container-first, the two shipped set processes
and the hook for the next, reusable vs consumed, the three consumers, the
no-verb rule, what composing `MouldMixin` claims); `docs/subsystems/dairying.md`
(new: the trade as a reader finds it — the pan, the churn, the vat, the
hoop and the press, the wheel, the three milks, the hygiene source;
one-line pointers for both added to `CLAUDE.md`'s map at the sweep, not
here); the touched subsystem docs get their history lines (`spoilage.md`
§ the collision is now decided; `maturation.md` § the discrete twin +
`transforms`; `fractionation.md` § `restDays`; `thermal.md` § the set
site asks its container; `taps.md` § `sex`/`restDays`; `ranching.md` §
the dry period; `butchery.md` § `maxAgeDays`; `crafting.md` § `churn`,
the placing arm of `heat`, and *a mould is not a recipe*; the glass slate
§8 marked built); the plan's § Drive record.

**Acceptance.** `pnpm wire -- dairy.dirty` passes every checkpoint on a
fresh DB on `WIRE_PORT=2013`; `pnpm -C packages/server lint:family` green;
**`pnpm test` once** (the pre-MR run) green; push; MR opened against
`master`.
**Commits:** `drive(dairy): what driving the valley's milk found` then
`docs(dairy): mould.md, dairying.md and the history lines`.

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
| the wheel | `pour` (bulk) · `put stone on hoop` · `look hoop` · `get wheel` · `cure wheel` — **no verb of its own** | none needed: `pour`/`put`/`get`/`look` are platform verbs over mixin gates; `cure` is afforded by the salting trough (shipped) | the hoop row's `castTemplate`; `soft-curd`/`firm-curd`'s `drainSetting`; the `wheel` row; the press stone | — | `pour target` `mustHaveBulkSlot` ✓ hoop; `put target` `ContainerMixin\|PlacingMixin` ✓ hoop (so `put stone IN hoop` is also accepted — `Hoop.canAddContainable` refuses a solid into a filled hoop in words); `get targets` `ContainableMixin` ✓ wheel; `cure`'s target a `Provision` ✓ |
| the ingot | `smelt` (shipped) · **`pour crucible into mould`** (bulk `pour`) · `look mould` · `get ingot` | the furnace affords `smelt` (shipped); `pour`/`get`/`look` are platform verbs | a `crucible` in the furnace (propped); an `ingot-mould` in the room; the `ingot` row; the metal's `meltingPoint`/`latentHeatOfFusion` | — | `pour source` `mustHaveBulkSlot` ✓ crucible, reached one level into the open furnace; `pour target` ✓ mould; `get targets` ✓ ingot inside the open mould |
| the ice block | `fill pan`/`pour` · `put pan in freezer` · `get block` | — | `ice-pan.yaml` as a `Mould` with `castTemplate`; a freezer below 273 K (the avenue block fridge) | — | `put target` a Container ✓ freezer compartment |
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
| 6 curd set in a hoop is a wheel of the hoop's shape and the fill's size; weighted firm curd makes a drier, longer-keeping wheel than unweighted soft | D9 (a/b/c), D21 (W0 `MouldMixin` + `drainSetting`, W2 hoop/wheel) | W0 `Mould.test`; W2 `hoop.test` (moisture 0.55 vs 0.9, `a_w` under/over the floor, mass ∝ fill); drive 15 |
| 6a molten metal in an ingot mould is an ingot, water in an ice pan a block, by the same acts and no verb; a pool in a plain vessel is a lump | D19, D20 (W0 set site + pan + `ice-lump`, W2b smelt) | W0 `Mould.test` (pan → block; pot → `ice-lump`); W2b `SmeltController.test`; drive 19a (smelt → `pour crucible into mould` → wait → `look mould` → `get ingot from mould`; the second crucible left to cool → a lump), 19b |
| 6b a wheel ripens cool, reads in words, is worth more ripe, soft goes over, warm spoils | D9 (W0 `RipeningMixin`, W2 profiles, W4 the cold room) | W0 `Ripening.test`; W2 `wheel.test`; drive 16–18 |
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
  `wash pail`, `put stone on hoop` and `get wheel from hoop`; the placing
  arm against a real `Hearth`; the smelt's mould in a real room; the pan
  in a real freezer; the
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
- **The hoop's `closure`.** `liquidTight` keeps the curd pour in and lets
  the set clock drain it abstractly; the drained whey is not minted
  anywhere (a few hundred millilitres per wheel — the floor's puddle
  would be honest and is a one-line seam if review wants it).
- **`get` and a set thing inside a `Sealable`-less open container.** The
  hoop and the mould are open `Container`s; `get wheel` reaches in
  today. If the binder's `mustBeInLocation` refuses a thing one level
  down, the fix is the validator's shipped `peers` reach, not a verb.
- **The smelt chooses no mould — dropped (revised).** The first draft had
  `runCharge` scan the furnace's room for an empty mould, which is the
  engine doing the player's job. The metal now goes to the one place the
  player put a vessel (the crucible in the furnace) or the hearth, and
  the mould is the player's pour. Two crucibles in one furnace take the
  first — a furnace has one crucible, and that is a content fact, not a
  choice.
- **Nothing refuses molten metal into a vessel that cannot take it.**
  `transfer` checks closure and blends heat, never the vessel's melting
  point; a wooden pail of copper gets very hot and survives. A finding on
  `bulk.md` for the first build that melts a vessel; not dairy's.
- **Hot handling is the shipped rule.** `get crucible` bare-handed scalds
  and succeeds; poured in place nothing is touched; tongs (`gripping`)
  gate nothing today and this build does not change that.
- **`water.yaml`'s `castTemplate` moves to `ice-lump`**, so the shipped
  tests that read the row from a plain vessel move with it; the block is
  the pan's now and the class is the same.
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
- **The other moulded goods** — candles and soap → `rendering-slate`;
  bricks (`burn-lime`'s brick clamp), baking tins, press-moulded ceramics,
  glass press- and blow-moulding → their trades' slates, each a `Mould`
  row + a material `drainSetting`/freeze/a later set process. **Dry, cure
  and bake as set processes** are the next hooks on `MouldMixin.reconcileSetting`
  (a tin that bakes is doneness reaching the set site).
- **A consumed mould** (sand, lost wax) → the first casting trade that
  needs one; `reusable: false` ships and `takeCast` breaks it, untested
  by any row.
- **Salt in the hoop** (a dissolving solute at the set) → `dairy-slate`
  *Left*; `cure` on the wheel is the shipped answer.
- **The pool's payload onto a non-food cast** (dirty water → a dirty
  block) → `spoilage.md` finding; this build carries it for food only.
- **A melted solid pooling into a vessel it stands in** (today `doMelt`
  goes to the floor) → the first consumer that melts stock in a crucible
  (the recast rung); the smelt's run bypasses it by pouring bulk directly.
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
7. `packages/server/src/mud/platform/idea/cmd/crafting/{HeatController,StirController}.ts`;
   `packages/server/src/mud/lib/thermal/Thermal.ts` (l.1205–1395 — the
   melt, the solidify edge, the set site to change), `Material.ts`
   (l.455–500, `castTemplate`), `platform/thing/Casting.ts`,
   `generic-objects/.../{vessel/ice-pan, ice-block, Casting}.yaml` (and the
   new `ice-lump`),
   `base-library/.../material/bulk/water.yaml`; `lib/spatial/Placing.ts`; `platform/idea/cmd/inventory/GetController.ts`
   (l.494–520, `burnOnGrab`) and `lib/perception/Touch.ts` (l.103);
   `packages/content/trade-smelting/src/idea/cmd/smelting/SmeltController.ts`
   (l.280–360, 399–535, 700–725) and its `__tests__/SmeltController.test.ts`;
   `docs/slates/tails/glass-slate.md` §8.
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

*(appended at build time)* — `packages/wire/tests/dairy.dirty.wire.test.ts`,
run attached to an owned world on `WIRE_PORT=2013` (`AUTH_MODE=test`,
`SAXONBERG_TEST_WORLD=1`) after a `reset:db`.

### What driving found (runs 1–3), and what was done

Every one of these passed the unit suite; the drive was the first thing to
USE them.

1. ⭐⭐ **The `UnboundedReceptacle` row had no interior** — the transient
   source every take pours through (`Producing.pourTake`, the smelt's run).
   `slotFor(source)` found no slot, so **every milking into a pail kept
   nothing**: *"it all goes on the floor"* with a washed pail in hand. The
   unit tests stubbed the source WITH an interior. Fixed in the row.
2. ⭐⭐ **A thermometer could not read a vessel.** The `temperature` reading
   row was `scope: [here]`, and `Reading.resolveSubject` sends a named
   subject on a here-only channel back to the PLACE — so `measure
   temperature vat` silently read the creamery's air (the plan's Grounding
   assumed otherwise). Now `scope: [subject, here]` with `subjectRequires:
   [ThermalMixin]`, and `BiomeReading.subjectValue` is a hook
   `TemperatureReading` overrides to read a Thermal thing's own
   temperature.
3. `draft <n> from <herd>` never bound — the view's help promised `from`
   and the arg declared no preposition; a room with TWO books (the byre)
   is where it showed. Added, and a herd answers to a unique word of its
   name (`from calves`).
4. A drafted head's production clock started at its first READ: a cow
   drafted and left six game hours had nothing in her. The draft now
   starts it.
5. The churn was not afforded `churn` (the stir view is conferred by
   `ManualBuildMixin`); `Churn` confers it itself.
6. The creamery's lit `Hearth` warmed the room to 301 K (space heating) —
   too warm for butter. Its fire is an `Oven`-class firebox now (heats
   what is on it, not the room). ⚠ The envelope still reads the creamery
   and byre warm on a summer day (≈ 298–302 K against ≈ 285 K outdoors);
   the drive carries the churn down to the cheese room to churn, which is
   what a dairy does and teaches the band.
7. The byre's `cowshed` keyword caught `look cow` (substring match); `get
   pail` takes EVERY pail, so the byre props one and the creamery none;
   two-object commands do not parse an ordinal (`milk first cow into first
   pail` → shape fall-through — an engine finding, recorded).
8. The goat pen had no vat — a crock feeds on milk rather than setting it —
   so no goat's cheese was possible; a small cheese vat added.
9. Sky-lit interiors are dark after about 17:00, so names read
   *something*; the setting rest is 0.15 game days (cream up by the
   afternoon) and the drive's waits end at noon.
10. The boot union refuses ONE template listed by TWO packs (the goat
    species in both venues) — it failed the boot, not a build-time gate
    (finding).
11. Findings recorded, not fixed (not this build's): a drafted head gets
    EVERY species common name as a keyword, so a bull calf reads *"a cow"*
    and answers to `cow`; the eval sandbox has no `AccountabilityApi` and
    no in-world read of a person's meal-harm ledger exists, so the harm
    checkpoint reads the producer stamp the ledger keys on and the illness
    (the row write is the shipped `Metabolic.mealblame.test.ts`);
    `PumpReading.test`'s bracket assertion failed by the CALENDAR (the
    seed hashes the game day; the printed figures are rounded) — given the
    rounding slack; a `setSex` throw from the Delight's dogs during a
    fast-travel route load at boot (their species not yet warm).

### What driving found (runs 4–8), and what was done

12. ⭐⭐ **Milk's spoilage clock started at the first SNIFF.** An unseeded
    gauge seeds at its first read, so a jug of milk a day in the warm read
    fresh to the first nose. `Producing` now seeds the take's gauge on the
    transient source, and the pour carries and blends it.
13. ⭐ **A vessel said nothing of what its contents had become.** Only
    discrete food spoke its spoilage band; `Freshness.senseLine` + a
    `CraftVessel` augmenter make a jug's contents speak to `look`/`smell`
    (pinned by `CraftVessel.freshness.test.ts`).
14. **The scald mark was a number only** — the vat now says the curd set
    badly when the batch peak passed its profile's `scaldAboveK`.
15. **`cure wheel` resolved the meat recipe** (`insufficient-input(meat)`):
    a `salt-wheel` recipe in the dairy pack, found by
    `PreserveController.recipeFor`'s item-slot match; `CraftingLogic` now
    carries `madeFrom` across a transform that keeps the thing
    (`MadeFromHolding` gained its getter).
16. Rows: a **milk can** at the creamery (a floor holding a puddle of one
    milk refuses a spill of another — a bulk finding; the drive spills in
    distinct rooms), a **water butt** at the goat pen (`wash pail` had no
    water there), a **cheese knife** in the cheese room (nothing to split a
    wheel with).
17. The founder `eval` clone of setup ore died at the sandbox boundary
    (`fromStored` denied) and the dispatch never answered — the drive
    mints with `clone … --here`.
18. Drive-shape lessons: an answered *which one?* prompt leaves the
    original dispatch's reply to land on the NEXT command (every later
    checkpoint read the wrong answer) — cows are named `peers:living:cow`,
    which a body never matches; a day advanced in a busy world takes
    minutes, so the file sets a 30-minute test timeout; a whey starter
    left a fortnight unfed is DEAD (correctly), so the boiled batch runs
    before the fortnight; warm milk taints in 0.75–1.5 days at 294 K, so
    the spoilage check reads at two days.
