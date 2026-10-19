# Cleanliness — implementation plan

Executes `docs/requirements/cleanliness-requirements.md` (at `4f6650636`,
with § 17 the Washer at the Ford **cut by the user, 2026-10-17**). One
soiling model (dirt deposited by acts, of a row-declared kind, on the
layer it reaches); washing that removes dirt by chemistry and can ruin
cloth; soap, lye, glycerin and the pre-industrial cleansers as rows and
shipped mechanisms; a place's floor, debris, windows, chimney, stalls and
dust as things use wears down; the clean tiers the kitchen, clinic and
surgery read; a laundress, a lavoir, a bathhouse and a doorman.

**Kind:** feature. **Leads from:** kernel; first consumers the butcher's
apron, dairy's milker, the infirmary, the Hearthworks cookhouse, a Hinkley
home, the two mills, `trade-chandlery`, and new Terminus venues.

**Merge order.** This build merges **after** rubber (build-1), repair
(build-3) and storage-and-ice (build-4). Every shared piece below names
its owner and a fallback: *if the owner has not landed when the wave
starts, build the piece here in the shape the siblings agreed, and the
later build consumes it.* The build agent re-runs the grounding check
in § Critical files item 0 before W0.

Paths: `S` = `packages/server/src/mud`, `C` = `packages/content`.

---

## Grounding

Verified by opening the files on `reqs/cleanliness` (== master
`27341d0eb` + the Washer cut). ⚠ marks a fact that contradicts the
requirements or a sibling's assumption.

### The three half-models of clean

- **The hands clock.** `S/lib/vitals/Hygiene.ts` — `HYGIENE_SOIL_SEC =
  6h` (:23), `washedAt` persistent (:41), `handsCleanliness()` decays
  linearly (:52), `soil()`/`scrub()`. Composed on `Creature`
  (`S/lib/creature/Creature.ts:179`, inside Vitals/Metabolic, outside
  Attired). Four production readers: `WashController.washHands`
  (`S/platform/idea/cmd/crafting/WashController.ts:135–160`),
  `Vitals.applyTreatment` (`S/lib/vitals/Vitals.ts:3182–3211` — reads
  `handsCleanliness()`, seeds sepsis, then `treater.soil()` — today's
  only act-deposit on a body), `TreatController.ts:622–628`, dairy's
  `stampTheHand` (`S/lib/husbandry/Producing.ts:1184–1197`), and the
  nurses brain (`C/trade-medicine/src/behavior/nurses.ts:182`
  `host.scrub()`). Constants `HARM_DEFAULTS.SEPSIS_INOCULUM 0.1`,
  `SEPSIS_DIRTY_THRESHOLD 0.5` (`S/platform/idea/Condition.ts:500–503`).
- **Vessels.** `ServiceableMixin` (`S/lib/craft/Serviceable.ts`) —
  `soiled` is the *used* bit; `setSoiled` is gated to `SoiledWriters` =
  CraftingLogic **or the TemplateApplier** (:46–52; the lockout story
  :35–44 — any gated setter must admit the applier). `CraftVessel`
  (`S/platform/thing/CraftVessel.ts:117`) =
  `Contaminable(Serviceable(VesselKind(Crafted(Thermal(Bulkable(Container(Good)))))))`.
  `ContaminableMixin` (`S/lib/material/Contaminable.ts`) — a plain
  `Record<string, number>` of loads persists (:624–639, the shape a dirt
  record copies); kill law integrates the host's **own thermal
  trajectory** (:173–190) — a hot implement really is disinfected; a
  spore floor survives. Composers: CraftVessel, Provision, Corpse, Fish,
  `C/trade-cooking/src/thing/{ButcherBlock,KitchenTool,BoningKnife}`,
  dairy's Churn/SettingPan. ⚠ Not on Creature, Garment, Bandage,
  SurgicalKit, Tool.
- **`wash`.** View `C/platform/content/platform/cmd/crafting/wash.yaml`:
  `target` `requires: CraftedMixin` (so a floor, window, bandage, kit or
  body is refused at the binder), `water` `objects` with
  `in|under|with`, default `reachable:[mixin.BulkableMixin],reachable:[mixin.ShoreMixin]`.
  Controller `run` (:50–134) dispatches Serviceable → `wash()`,
  Contaminable → `clearContamination()`, Dyed-only → `launderGarment`
  (dye strip only, :184–207). `findWater` (:235) never reads
  temperature; a `WaterFixture`
  (`S/platform/thing/WaterFixture.ts:75` =
  `UnboundedSource(Thermal(Bulkable(Thing)))`) and a shore's
  `SourceSlot` (`S/lib/bulk/SourceSlot.ts:71,133` — material +
  `temperatureK` off the `WaterRead.draw`) both can answer it.
  Completion closures reference locals only (controllers are destructed
  when `execute` returns).

### Garments, layers, wetness, drying

- `Garment` (`S/platform/thing/equipment/Garment.ts:65–73`) =
  `Wearable(Slottable(Crafted(Durable(Constructed(Dyed(Good))))))`. Not
  Contaminable, Serviceable or Labelled.
- **The soiling seam** `Attired.outermostAt(partKey)`
  (`S/lib/slot/Attired.ts:138` doc, impl :614 = `coveringAt(partKey)[0]`)
  — production callers are Attired itself only (:663, :688).
  `coveringAt` walks the body plan's `getSlotsCovering(partKey)`
  outermost-first. Part keys from `biped.yaml` slot `covers`
  (`body.arm.left.hand`, `body.torso`, `body.leg.left.foot`, …);
  `sensoryPorts` carry no part binding (vision is `frontal`).
  `textiles.md § The soiling seam` asserts the gauge, bands, deposit log
  and any `soil.*` event absent on purpose: *a local interaction is a
  call, not a broadcast*; dirt *freezes in absence*.
- `DyedMixin` (`S/lib/material/Dyed.ts:178`): `dyeStack: DyeApplication[]`
  + `fastness`; `launder()` (:296–317) strips strength by fastness. ⚠ **No
  sun fade anywhere** (requirements say dye fades with sun — false
  today). `felted.yaml` fabric row exists, unreachable (`felting =
  setConstructionForm('felted')`, async, `S/lib/material/Constructed.ts:60`).
  Fit = `cutToStature/cutToGirth` stamps (`S/lib/slot/Wearable.ts:246–251,
  330–380`); a stock garment has no stamp (plan-average).
- `WetMixin` (`S/lib/wetness/Wet.ts:113`) on every Thing and Agent;
  ⚠ **far-past guard drops any gap > 4 h** (:51, :190–193) — a garment
  on a line overnight never dries; linkdead freeze :180–184.
  `Wearable.getClo` already floods loft by wetness (the one wet law's
  shipped reader).
- `dry` is **trade-cooking's** (`C/trade-cooking/content/trade/cooking/cmd/crafting/dry.yaml`,
  `DryController.ts:80–89` refuses anything not `WaterActivityMixin`);
  `DryingRack extends Fitting` (`C/trade-cooking/src/thing/DryingRack.ts:18`).
  `hang` is the furnishing verb and stays.
- Removal: `remove.yaml` (`verbs: [remove, doff]`, no manner arg) →
  `UnequipController.takeOff` (:124–214): release happens first, then a
  `DressingStep` with an empty `onComplete`.
- `LabelledMixin` (`S/lib/description/Labelled.ts`) is composed on
  arcana items only; `label shirt` → *"nowhere to write"*.

### Blood, surgery, dressings

- `BloodUnit {speciesPath, system, type, labelled, donorIdentityPath}`
  (`S/lib/vitals/Blood.ts:28–45`) on `BulkPayload.blood`. Reading row
  `C/trade-medicine/content/trade/medicine/idea/reading/blood.yaml`, class
  `BloodReading.analyze()` refuses a non-Vitals target (:46–52); the
  shape is `analyze blood <subject>` (`S/lib/instrument/Reading.ts:391–400`).
- `Bandage` = `DressingMixin(Good)` (`S/platform/thing/Bandage.ts`);
  `dressingQuality` authored 1 on every row. `SurgicalKit` =
  `AudibleMixin(Tool)` (`C/trade-medicine/src/thing/SurgicalKit.ts`),
  capability `surgery`; neither Thermal nor Contaminable → cannot be
  boiled or flamed. `OperateController.ts:110–114` is the capability
  check (the sterility read point), `:163` passes `treater: giver`.
  `TreatmentOpts {by, efficacy, treater?}` (`Vitals.ts:316–327`).
- Crafting: `contaminateTools` (`CraftingLogic.ts:958–984`) carries
  inputs → tools; `outputMicrobialLoad` (:1087–1125) blends **inputs
  only** — ⚠ a dirty board or hand never contaminates an output.

### Places

- ⚠ **Most named venues keep no record.** Only `PersistentLocation`
  (`S/platform/location/PersistentLocation.ts` =
  `Persistable(WarrenMember(Reserved(… Location)))`, "venue-generic on
  purpose", **never a singleton, not cartesian — authors no `coords`**)
  and pack-owned Field/Wood/MineRoom/Turbary/OpenWorking compose
  Persistable among Locations. The cookhouse
  (`C/hearthworks/…/location/cookhouse.yaml`, `coords` authored), byre
  (`C/hearts-delight/…/dairy/location/byre.yaml`), both mills, the
  chandlery floor, the general store, the ward, the glazier's hut are
  `Locale` or `Street`. `Location.ts:19–29`:
  *"It keeps no record"* — because a **multi-instance** record was
  write-only; a singleton keyed by its own template path is exactly what
  `PersistableMixin` defaults to. ⭐ **`StuffApi.singleton` already
  drives a persistable singleton** (`S/api/stuff.ts:800–836`: has record
  → `materialize`, else `seedBornWith` + first `capture` — "a venue room
  reached by an exit or booted by a pack, a Stock counter placed by a
  room's props"). `lib/retail/Stock.ts`, `TpaTerminal`, `Wellhead`,
  `CheckRack`, `StorageNode` are shipped singleton hosts.
- ⚠ **Fixtures persist no state even in a persistable room.**
  `AdornableMixin.captureSlice` (`S/lib/boundary/Adornable.ts:146–173`)
  reports chattel fixtures to the estate and returns `{fields: {}}`;
  fixtures are rebuilt from the row on hydrate (:213–230). The floor is a
  fixture (`Location.ensureFloor`, `S/lib/stuff/Place.ts:368–430`,
  `addFixture(minted, 'floor')`); `FloorMixin` fieldMeta is `onGrade`,
  `worked` only (`S/lib/ground/Floor.ts:328–331`); `markupAugmenters =
  [floorAugmenter, snowAugmenter]` (:280–326) is where a soiling line
  slots in. `Window` (`S/platform/thing/Window.ts`) is a Boundary
  anchored on two hosts; `transmissivity(from,to)` (:290–296) is the one
  number the light walk reads (`VisionModality.lightLegs` leg (d),
  :339–372). Unstamped **props** (the Oven, a bed) DO capture into a
  persistable room's record with their fields
  (`ContainerMixin.captureSlice`); props re-lay only on the no-record
  branch (`Persistable.seedBornWith`), so a restored room does not
  duplicate them.
- Room air: `AtmosphericMixin` (`S/lib/biome/Atmospheric.ts`) —
  `addAtmosphereContent(path, litres)` (:827–846; **0 under the sky**),
  decay at `airChangesPerHour()` (:972–1005; a door open counts, a Window
  does not), contents `persistent, runtimeState` (:411–414). Gases are
  Material rows under `/stuff/idea/material/gas/` (open, any pack);
  respiration reads `toxicity` per breath
  (`S/lib/respiration/Respiration.ts:413–438`); a toxin resolves to a
  Condition at `/platform/idea/Condition/metabolism/<toxin>` (`S/lib/paths.ts:213`).
  ⚠ No SO₂ or ammonia row or condition exists.
- Fire: `flammableMediumCheck` (`S/platform/idea/api/FireLogic.ts:573–639`)
  flashes any content ≥ the **global** `fire.flammable.ignitesAt` (0.05)
  whose material has `heatOfCombustion > 0`, on a naked flame or a
  strike; `airShareOf` subtracts every content (`BiomeLogic.ts:442–446`).
  ⚠ Gas-shaped: no per-material limit; flour has no `heatOfCombustion`.
  `Burner.consumeFuel` (`S/lib/fire/Burner.ts:900–917`) is the one
  mass-out write; `reconcileBurnerFuel` (:919–952) covers unwatched burn
  up to 4 h; `exhaustTick` (:970–997) emits smoke/CO₂ only in occupied
  rooms. Firebox family: `Hearth = SpaceHeating(Placing(Firebox))`,
  `Oven = Container(Placing(Firebox))`, `Forge extends Firebox`,
  **`Campfire` also extends Firebox** (`S/platform/thing/Campfire.ts:41`)
  — so a flue on `Firebox` would claim a campfire has one. ⚠ No chimney
  or flue on anything; `Lantern.getEmittedFlux` (:40–48) multiplies by
  the cracked-pane factor — the lamp-glass seam.
- Rest: `PosturedMixin.restQuality` (`S/lib/slot/Postured.ts:90–117`);
  readers `Metabolic.currentRestQuality` (:1824–1848) and
  `Vitals` wound recovery (:1463–1486); `AssembledChair.getRestQuality`
  clamps to 1 (:38–48); the bedroom archetype needs `rest ≥ 1`
  (`S/lib/archetype/Archetype.ts:553–559`) — ⚠ lowering a bed's
  `getRestQuality()` would make `survey` stop calling the room a bedroom.
- Pests/spoilage: `Freshness.advance(…, extraRatePerHour)` is an
  additive rate seam; `advanceFreshnessOverHost` samples it once per
  reconcile via `lightStrikeRatePerHour(host, material)` (:823–897),
  **module functions** because `lint:lib-statics` is at its ceiling.
- Traffic: `Mobile.crossExit` post-move hooks (`S/lib/spatial/Mobile.ts:1006–1012`;
  `onEntered` has one implementer, `FloodedCell`). The floor is a
  fixture, not in `getContents()`.
- Mills: ⚠ the **wharfside mill is a TEXTILE mill**
  (`C/terminus/…/wharfside/mill/location/floor.yaml`: wheels, looms,
  scutching board, bleaching green); the **grist mill** stands outdoors
  at Hearts' Delight `millsite.yaml` (a `Street`, sky-exposed → no air
  contents). `MillController.finishGrind` (`C/trade-milling/src/idea/cmd/milling/MillController.ts:384–470`)
  has the room in scope.
- Byre: `Locale`, props 3 pails, water-butt, block,
  knife; the herd is a record (`dairy-book.yaml`, `Herdbook.tally 6`,
  `homeExtent` the **yard**). No manure row; `feed`
  (`S/platform/idea/cmd/bulk/FeedController.ts`) spreads `compost`-tagged
  bulk into soil nitrogen with no code. ⚠ Nothing reports nitrogen
  (`SoilSurveyReading.ts` has no nutrient line; `SurveyController.ts`
  reads archetypes + the holding only, :100–135).
- Homes: Hinkley kitchen (`PersistentLocation`; `/stuff/thing/fixture/range`
  = class `Oven`; window is `ambientOpening: window`, a detail); Seznick
  main (empty grate, windows are details); dorm (no burner). The only
  `Window` objects are the two Rejection hut windows.
- Bleaching: `C/trade-textiles/src/thing/BleachingGreen.ts` (a `Vat`)
  bleaches **bulk fibre by temperature**, not by daylight; piece bleaching
  recorded as deferred there. Daylight reads: `CelestialApi.isDayAt`,
  `daylightFractionAt`; `BiomeApi.isSkyExposed`.

### Water, chemistry, inputs

- Hardness is seeded per course (`water: {hardnessDgh}` on
  `C/world-seed/content/stuff/idea/Watercourse/*.yaml`: kestrel 12,
  delight 9 hard; cold-fell 5, holloway 3, meres 2 soft), worded by
  `hardnessWords` (`C/water/src/idea/WatercourseCatalogue.ts:1519`, `< 6
  soft`) in the shore's look line. ⚠ **`WaterDraw` is `{materialPath,
  temperatureK}` only** (`S/lib/location/WaterSource.ts:26–32`); drawn
  water carries no hardness. Terminus's only cited reach is the Quay
  (`wharfside/bank.yaml` `waters: {river: kestrel:confluence}`, hard);
  the city main is the **Cold Fell aqueduct** (`wharfside/thing/{city-intake,
  cold-fell-aqueduct}.yaml`, the market standpipe `suppliedBy:` it) —
  soft, if hardness rode the supply. ⚠ The ford declares no `waters:`.
- `trade-chandlery`: `DipPot extends CraftVessel`, `DipController` calls
  `CraftingApi.craft` (every trade ships its own craft verb; `make` runs
  scripts). ⚠ **No platform terminal "mint from a build" verb**; `boil`
  mints nothing; `strain` is hospitality's cocktail strain; `steep`
  needs a `SteepableMixin` solute (medicine's `Simple` only). Recipes:
  one `outputTemplate` + one `outputResidue` (`S/lib/craft/Recipe.ts:301`).
- Maturation: `MaturationProfile` (`S/lib/maturation/MaturationProfile.ts`)
  mechanisms closed (`microbial · photochemical · chemical · evaporative ·
  enzymatic`), `transforms: [{category (a pour's material tag), becomes}]`
  (:49–54), `leesFraction/leesMaterial/leesShare` (the second output),
  `scaldAboveK`; rows at any root's `idea/maturation/`, catalogue booted
  under the reader rule. ⚠ CO₂ off-gas is **hardcoded** in
  `Maturing.ts:132–157`. `SeasoningMixin` (`S/lib/maturation/Seasoning.ts`)
  is water loss to the air at `Material.seasoningDays`, with wood prose
  (:112–150) and `WOOD_EQUILIBRIUM_RH_PCT` (:49) in the mixin. `MouldMixin`
  (`S/lib/mould/Mould.ts` header): *"Dry, cure and bake are the next set
  processes and hang on the same hook."*
- Inputs present: wood ash (material `C/trade-fuel/content/stuff/idea/material/organic/ash.yaml`
  tags `potash`; thing a `Provision`; ⚠ sources = a failed clamp and two
  Rejection props — hearth fires leave none; ⚠ trap: `wood/ash.yaml` is the
  TREE), quicklime, tallow (`candle-stock`), olive oil, wine-vinegar (tag
  `vinegar`), neutral-spirit, sand, salt/brine, coal tar (retort +
  condenser at the oilworks), buttermilk (dairy), alum, vitriol (sold,
  `corrosiveTo`). Absent: lye, soap, glycerin, potash as a material,
  washing soda, fuller's earth, chalk, sulfur (rubber's), stale urine,
  ammonia/SO₂, naphtha as its own row (a keyword on gasoline; a crude
  cut), lard, sawdust (storage's), slaked lime.
- Caustic: `corrosion` channel → `caustic` trauma (`Condition.ts:1455–1509`,
  grows while `agentActive`, `rinse` resolves); delivery runs through the
  covering stack (`ConditionLogic.inflictThroughStack` :243–250) so gloves
  attenuate by material; `Material.corrodeOnContact` (:1313) is called
  only by `ThrowController` and `MagicLogic`. ⚠ No sight impairment:
  `PerceptionMixin.perceivedBandModifier` / `canSeeOverride`
  (`S/lib/perception/Perception.ts:84–120`) are identity defaults with
  zero implementers.

### Services, venues, people, contracts

- `Tariff` (`S/platform/thing/Tariff.ts`): `SERVICE_KINDS = [repair,
  treatment, burial, transfusion]` (:78), closed by doctrine (:24–28: a
  second clinic is rows). `OrderController` (`S/platform/idea/cmd/retail/OrderController.ts`):
  `doTransfusionService` (:262–340) is the **durative-service-on-the-body
  precedent** (engages the customer, collects at completion, barge-in
  charges nothing); `performService` arms per kind; nothing needs a hand
  on shift today. `PricedOfferMixin.collect` (payer = acting principal).
- Repair (sibling) D12 reshapes `order repair`: `callHouse(giver,
  candidates)` module-private in `CraftingLogic`, `presentFulfillers(giver,
  discipline?)` (the filter exists on master, `CraftingLogic.ts:312`;
  repair passes none), quote →
  `context.interactive?.promptConfirm` → act as the hand →
  `PricedOfferMixin.collectMinor(amount, reason)` → `settlePiecework` for
  a `per-settlement` seat. `Employed.isFulfilling(discipline?)`
  (`S/lib/employment/Employed.ts:426`). `lint:menu-staff` rule 4: a house
  with a `fulfills` seat needs `call:`.
- ⚠ **No house→customer payout exists.** `BankingApi.transfer` refuses
  an account you do not own; `payWage` (`:478`) pays a person's primary
  account from an employer account under a `wage` leg; `PnlCategory`
  (`S/lib/banking/LedgerEntry.ts:86`) is an open union. "On her record"
  = `recordDeed` on `PersonaMixin` (chronicle.md:85).
- ⚠ The Goodkin bank is in **counting-houses**, not wharfside; its only
  back room is the **Circle parlor** (`circle-parlor.yaml`,
  `alternateNames: [parlour, circle, office, back]`), reached by the
  hall's north `kind: /stuff/idea/exits/archway`. `canEnter`/`canExit`
  (`S/lib/boundary/Exitable.ts:197–200`) have **zero implementers**;
  refusals are returned as a `TraversalGuard`. `enforces.ts` (Dave) judges
  after entry by belief; `greets.ts` is the arrival-witness brain shape.
- Hospitality: Dave's Bar is the par-line + menu + on-shift-hand venue;
  the gym archetype has no authored room and the only `LoadDevice` is a
  recipe output. `fixture/tub.yaml` is a **`Chair`** (rest 1.4) holding no
  water; `fixture/basin.yaml` is a `WaterFixture`.
- Contracts: `CONDITION_TEMPLATES = [delivery, supply, watch]`
  (`S/lib/employment/Condition.ts:78`), closed; `watch` cost four kernel
  touches (template, `job post` phrase, accrual, verb);
  `ContractLogic.ts` verifies at :781–829 via `conditionHoldsAt`. Payout
  needs the completing player to hold an account.
- Lints: the full roster is `package.json`'s `lint:*` (78 scripts; run
  `lint:family`). New catalogues are allowlisted in
  `scripts/check-template-scans.ts:58–95` (`LAZY_DICT`); closed kernel
  vocabularies are counted by `check-closed-vocabularies.ts`
  (`CLOSED_VOCABULARY_CEILING = 5`, the UNDECLARED population; a declared
  closure in `CLOSED_BY_DESIGN` with a reason does not count).
  `lint:field-meta` snapshots `scripts/__fixtures__/field-meta-golden.json`.
- Wire: `packages/wire/src/runner/boot.ts:104 bootOwnedWorld()`;
  `assembly.dirty.wire.test.ts:640–690` is the restart precedent (SIGTERM,
  reboot, re-open a session, re-assert). `Session.awaitPrompt/answerPrompt`
  (`session.ts:812,831`) answer a `promptConfirm`. `advanceWorldClock`
  (`world.ts:157`).

### The siblings (read from their branches 2026-10-17)

- **Rubber** (`origin/reqs/rubber`): places author `enclosure:` + `roof:`;
  `Exposure` value object off `AtmosphericMixin.exposure()`; per-face
  transmittance by `Material.lightAbsorption` (D5) — ⚠ **no single named
  face-transmission method**; a `Window` boundary keeps its own
  `transmissivity()` — rubber has ONE derived figure per resolved face
  (`ResolvedEnclosure.transmittance = Π e^(−αt)`), read by
  `skyLightFraction()` and the solar-gain sum, but no METHOD a per-place
  factor could multiply into. One wet law on `Material` instance methods
  `permeability()` / `wetProperty()` (D12.1, shared with storage D9).
  `Attired.exposeToRain(delta)`; `immerse(parts?: (partKey) => boolean)`
  (storage's, with rubber's part filter). Sulfur `/stuff/idea/material/mineral/sulfur`
  (tags `[sulfur, mineral]`, mp 388, **no burn product, no
  `heatOfCombustion`, no `autoignitionTemperature`** — `stoke` refuses a
  fuel without `heatOfCombustion > 0`, `Burner.ts:868`) + the won row
  `/trade/quarrying/thing/sulfur` (the coal row's shape) + the Hill
  Quarry band `{toZ: −10.4}` (halite → −10.4…−12). Vitriol/quicklime
  `corrosiveTo` narrow to honest tags (`cellulose`, `protein`, …); rubber
  resists. `lint:biome-sky`: every new interior authors BOTH keys;
  `enclosure: none` is a legal declared value (the market awning:
  `enclosure: none` + `roof: {material: canvas, thicknessM: 0.002}`); a
  layer is `{material, thicknessM}` and nothing else (`check-envelope.ts:102`).
  Rubber's `onGrade` default moves onto `exposure().onGrade` (a
  structure member's ground storey), which `getGroundKind()` reads.
  Rubber adds an `Oven` row (`/trade/rubber/thing/oven`) and two `stove`
  props (`class: /platform/thing/Hearth`) — they gain flues here. The
  market awning is `market/location/under-the-awning`, **`east` off the
  square**. Rubber does not touch `wash`, the infirmary or the chandlery.
- **Repair** (`origin/reqs/repair`): D12 (above); D14 the tinker is a pack
  `CastMixin(StagedMixin(NPC))` — **`NPC` is not widened**, so an NPC born
  holding kit needs its own pack class; D20 the shell's layer clock stays
  on `HoldingWarren` (an Idea) — two clocks; `survey` reads the residence
  pack duck-typed, W7 adds `fabricReport()` (gated on rubber, may ship as
  a follow-up MR); "condition" means three things already — **this plan
  never uses the word for soiling**. ⚠ Corrections from repair's final
  plan: `presentFulfillers(giver, discipline?)` ALREADY takes the filter
  on master (`CraftingLogic.ts:312`) — repair's `diagnose` deliberately
  passes none; repair W3 exposes **`CraftingApi.fulfillingHand(giver,
  venue, discipline?)`** (public; the optional discipline comes from the
  Tariff row's `serviceDisciplines: {wash: textiles}`), makes
  **`Tariff.quoteFor(lines: {key, label, qty}[]) → Quote`** generic, and
  names ONE shared refusal constant for *"There's nobody here to do the
  work."*; repair W1 **deletes `Lantern.ts`, `AssembledChair.ts`,
  `AssembledGarment.ts`, `Cask.ts`** and recomposes `Lamp`, `Chair`,
  `Garment`, `Receptacle`, `Vat`, `Tool`, `Weapon` with `AssembledMixin`
  (`Lamp.getEmittedFlux` keeps the failed-facing factor); the bank gains a
  **named `yard` exit**; the cobbler shop and tinker yard stay
  `Locale`. Hotspots: OrderController, Tariff,
  PricedOffer, SurveyController, CraftingLogic, Garment, Chair, Lamp,
  Timber, general-store counter, the field-meta golden, the wiki-spoiler
  snapshot.
- **Storage-and-ice** (`origin/reqs/storage-and-ice`): D9 the wet law (as
  rubber); D10 `SwimmableMixin.immersionOf()` — **Pools only; rivers and
  shores are not Pools**; D11 `Attired.immerse()`; D15 the frozen-water
  refusal in `FishingController.reachFor` (shore `peekWaterRead(key)?.frozen`
  and `room.getFloor().openWaterAreaM2() > 0`, by shape); D18 sawdust =
  material `/stuff/idea/material/wood/sawdust` + `C/trade-carpentry/src/thing/Sawdust.ts`
  (`Poolable(Stackable(Good))`, qty = kg, keywords `sawdust, dust, heap`;
  material tags **`[wood, organic, granular, flammable, absorbent,
  sawdust]`** — storage added the last two for this build), ONE
  Stackable lying in the room — **no floor-debris model**; `FloorMixin`
  gains `bears(loadKg)` (base `true`) and `supportIsSlotted()` (base
  `false`; `WaterSurface`/`IceSheet` answer `true`); the eleventh ground
  kind `ice`; `Employed.isOnShiftFor(org)`; `SEASONS`; the cookhouse
  edits are **disjoint files** (storage: `idea/business.yaml`,
  `agent/cook.yaml`; this build: `location/cookhouse.yaml`) — no hand
  merge; `water.ice.stillWaterMps` 0.1 → 0.5 (more reaches freeze).

---

## Plan-level decisions

### The soiling model (D1–D5)

**D1 — One mixin, `SoilableMixin` (`S/lib/cleanliness/Soilable.ts`),
carries act-deposited dirt by kind, per site, with a wash record and a
heat record; bands are words; nothing on it has a clock.** State (all
`persistent, runtimeState`, scalar-decomposed):

```ts
deposits: Record<string, number>;   // key `${site}|${kind}` (site '' for a whole thing); amount is a dimensionless load
stains: StainRecord[];              // blood only: {site, kind:'blood', set, type, system, speciesPath, donorIdentityPath}
washes: Record<string, WashStamp>;  // per site: {atS, cleanserKey|null, action|null, waterK, hardnessDgh}
heat: HeatStamp | null;             // {peakK, heldS, atS} — the last sterilising heat since the last deposit
sunYellow: number;                  // 0..1, protein fibres in daylight (D21)
```

Methods (the contract; verbs on the object): `soil(kind, amount, by,
site='')` (the ONE writer; clears `heat` — named `soil`, not `deposit`:
storage's `StoreMixin.deposit(item, actor)` and `BankingLogic.deposit`
already exist, and `soil` is freed by Hygiene's deletion), `soilAt(site)`,
`soilBand(site): 'clean'|'marked'|'soiled'|'filthy'` (dials
`cleanliness.band.{markedAt 0.1, soiledAt 0.4, filthyAt 1}`),
`soilKinds(site)`, `removeSoil(kind, fraction, site)`, `wash(spec):
WashOutcome` (D10 — the chemistry, mixin-authoritative), `recordHeat(peakK,
heldS)`, `cleanTier(site)` (D14), `describeSoil(site)` (words from the
DirtKind row: *bloodied and greasy*), `stainsOf(kind)`. Deposits are
**not** time-integrated and there is no stamp (AC 1; textiles.md's rule).
`by` is kept only in a `StainRecord` (blood carries the bleeder's sample);
every other kind is anonymous. ⛔ Not a `Map`. ⛔ Not an event. ⛔ No
"condition" word anywhere (repair's three meanings).

**D2 — Dirt kinds and cleansers are two row families any pack adds with
no code; two lazy catalogues read them (AC 8, 23).**
`S/platform/idea/DirtKind.ts` (class `/platform/idea/DirtKind`) and
`S/platform/idea/Cleanser.ts` (`/platform/idea/Cleanser`), rows at
`<root>/idea/DirtKind/<key>.yaml` and `<root>/idea/Cleanser/<key>.yaml`
(the Joint casing: `Template.findByClass`, flat `data:`, a malformed row
skipped and named). Catalogues `DirtKindCatalogue` / `CleanserCatalogue`
(`S/platform/idea/*Catalogue.ts` + a `…Catalogue.yaml` row): `warmed(key)`
async warms on first miss, `peek(key)` sync never warms — the JointCatalogue
shape; +2 `LAZY_DICT` entries in `check-template-scans.ts`; **no
`Api.boot`, no boot list** (`WashController.execute` is already async and
settles its water first — the warm happens there; every other reader is
`peek`). Fields:

| DirtKind | |
|---|---|
| `key`, `adjective` (*bloodied*, *greasy*, *muddy*) | the word the band sentence uses |
| `form: film \| debris \| stain` | film is washed, debris is swept, a stain is a film that can SET |
| `answersTo: Action[]` | which cleanser actions remove it |
| `setsAboveK?`, `setAnswersTo?: Action[]` | blood: 318 K; a set stain answers to `oxidiser` only |
| `absorbedBy?: boolean` | a strewn absorbent turns this film into debris |
| `contaminates?: Record<pathogenKey, severity>` | manure → `e-coli`; what a deposit seeds on a Contaminable host |

| Cleanser | |
|---|---|
| `key`, `agent` (a **material tag** the cleanser item/bulk carries: `soap`, `lye`, `washing-soda`, `vinegar`, `neutral-spirit`, `naphtha`, `fullers-earth`, `chalk`, `silica`, `sawdust` (storage's tag), **`acid`** (vitriol's real tags are `[liquid, caustic, acid]` — no `vitriol` tag is added; rubber edits that row), `buttermilk`; `sunlight` and `sulfur-fume` are the two AMBIENT agents read from the room, D21) | how the wash finds it |
| `action: Action` | `surfactant · alkali-mild · alkali-strong · acid-mild · acid-strong · solvent · absorbent · abrasive · oxidiser-slow · oxidiser` |
| `damages: [{fibreTag, effect: felts \| scratches \| yellows, aboveK?}]` | authored only for NON-corrosive effects: sand on `glass` → `scratches`; sun on `protein` → `yellows`. ⭐ **`burns`/`rots` are DERIVED from the agent material's `corrosiveTo` ∩ the fibre's tags** (one fact — vitriol burns `cellulose` because its row says so; lye rots `protein` because lye's `corrosiveTo` names it), so rubber's narrowing of vitriol/quicklime can never disagree with a wash |
| `hardWaterPenalty: boolean`, `softens: boolean` | soap scums; soda softens |
| `consumesPerWash` (count or litres) | a bar is spent slowly, lye by the litre |
| `skinHarshness: 0..1` | the clinic hand washed raw (D23) |

`Action` is a **closed kernel vocabulary by design** (ten mechanism words
— a pack adds a cleanser ROW, never a mechanism nobody models), declared in
`check-closed-vocabularies.ts`' `CLOSED_BY_DESIGN` with that reason so the
ceiling does not move. The kernel ships its own rows in the platform pack:
ten DirtKinds (`blood · grease · mud · sweat · soot · manure · ash ·
flour · milk` as films — `milk` is what the milker's apron takes, a film
water and time remove — plus `crumbs` as the one debris form; ⛔ no
`sawdust` DirtKind — loose sawdust is storage's `Sawdust` GOOD, and a
strewn absorbent is the floor's `strewn` layer, so nothing would ever
write the row; ⛔ no `shavings` — carve's shavings are carpentry-slate's)
and the fourteen Cleansers of requirements § 6. A trade adds a stain or a
cleanser with one file. Lye's row: `corrosiveTo: [protein, tissue]` —
**never `organic` or `textile`** (rubber's gloves must stay outside it;
if rubber tags leather `protein`, lye rots leather, which is true and
which the tests expect).

**D3 — The hosts.** See § Host placement. The short list: `Garment`,
`Creature` (per body part), the `Floor` twin, `Window`, `Chair` (seats and
beds), `Lamp` (repair W1 deletes `Lantern.ts` and folds it into `Lamp`;
the soot dims only the glazed share, D18), `Bandage`, `CraftVessel`, trade-cooking's `KitchenTool`
and `ButcherBlock`, trade-medicine's `SurgicalKit`, and the new `Rug`.
⛔ Not `Thing`, not `Good`, not `Tool` (the felling axe and the sledge
would be soilable for nobody), not `Firebox` (soot in a flue is D18's own
field), not `Receptacle`.

**D4 — The hands clock is retired; a body's cleanliness is derived from
its deposits, through its gloves.** `HygieneMixin` is deleted (`Mixins.Hygiene`,
`MixinApi.isHygiene`, `Hygiene.test.ts`, the sepsis tests re-pinned).
`Creature` composes `SoilableMixin` (per part site) and gains two total
methods: `handCleanliness(): number` = `1 − min(1, worstHandLoad)` read off
`outermostAt(handPart)` when that layer is Soilable (gloves) else the bare
hand site, and `soilHands(kind, amount, by)` which lands on the
outermost layer (a glove) or the bare hand — the soiling seam's first
consumer (AC 2, 3). The four readers migrate: `Vitals.applyTreatment`
(`treater.handCleanliness()`; `treater.soil()` → `treater.soilHands('blood',
HAND_BLOOD_PER_DRESSING, patient)`), `TreatController`, `stampTheHand`
(dairy; a dirty milker's inoculum reads the new number), the nurses brain
(`host.scrub()` → a `wash` through the ward's basin with the ward's soap —
`forceCommand('wash')`, the brain's existing seam). `SEPSIS_DIRTY_THRESHOLD`
keeps its meaning against the derived number. **Lens 1 chose it** (the
requirements' own reasoning): hands get dirty by touching things.

**D5 — Gloves, and taking them off.** `wash` with no target washes the
hand SITES, which means the outermost layer at each hand: gloves come
clean, hands under them are untouched (AC 3). `remove`/`doff` gains an
optional `manner` word arg (`carefully`; default quick): quick removal of
a glove whose soil band ≥ `marked` transfers `cleanliness.doff.transfer`
(0.5) of its load to the bare hand sites; `carefully` runs the
`DressingStep` at 3× `donDurationMs` and transfers nothing. The transfer is
`Attired.doff(garment, {careful})` — a method on the wearer (it owns the
slots), called by `UnequipController.takeOff` after `release.vacated > 0`.
Rubber's gloves/apron (`/trade/rubber/thing/{rubber-gloves, rubber-apron}`)
are read as ordinary garments: Soilable, washable, and `corrosiveTo` does
not reach through them (rubber's covering-stack correction, consumed).

### The producers (D6–D9)

**D6 — Every producer names its deposit site; a recipe names its dirt as
a row field.** The one choke for cook/bake/render/brew/dip is
`CraftingLogic` at the maker-resolution site (`:3135–3162`): a new
authorable `Recipe.soils: [{kind, amount, where: hands | apron | floor}]`
(`S/lib/craft/Recipe.ts`, validated at read like `volatiles`) is applied
there via `maker.soilHands` / the maker's `outermostAt('body.torso')`
/ the room's floor. Rows: `render-tallow` (grease, hands + apron),
cooking's stews and roasts (grease, soot), baking (flour, hands + floor),
`melt-wax` (grease). Each per-verb producer is one call at a named site:

| act | site | deposit |
|---|---|---|
| butcher | `ButcherController.ts` after `spillGut` (:476) | `blood` + `grease` on the maker's hands and the torso's outermost layer (the apron); `blood` with the carcass's sample on the block and the floor; the `vessel` arg catching blood stays the spill seam |
| slaughter | `C/trade-ranching/…/SlaughterController.ts` (read it first) | `blood` as above |
| milk / any tap | `Producing.stampTheHand` — ⚠ it runs for EVERY tap (`pourTake :909`): milk, maple and birch sap, rubber's Hevea latex | reads `handCleanliness()`; the deposit is the TAP's own row field — **`TapSpec.soils: [{kind, amount, where}]`** (`S/platform/idea/species/Species.ts:440`, the `Recipe.soils` shape, validated at read); the cow species row authors `manure` (hands) + `milk` (apron); maple, birch and Hevea author none. Test: tapping a Hevea or the maple fixture deposits nothing |
| dig / split | `WorkedActController.land` after `completeWork` (:153) | `mud` on hands, feet, legs |
| hew | `HewController.winOre` (:222) | `dust` (a DirtKind row the mining pack adds — the AC 23 test, done once here) |
| tan | `TanController` put-in (:130) and lift-out (:183) | `grease` + `manure` (the bate) on hands and apron |
| exertion | `Exerting.exert` (:195): `powerW > sustainableW()` for `durationS` | `sweat` on the torso's innermost layer — ⭐ the one deposit that lands on the INNER layer (`coveringAt(part).at(-1)`), by excess watts × seconds. ⛔ Not in `ThermalRegulation`'s heat-stress sweat (ambient, clock-like) |
| combat hit | `CombatLogic.ts:2550` after `inflict`, when `outcome.afflicted && BLEED_FAMILY.has(trauma.type)` | `blood` with the **target's** sample on the target's `outermostAt(site)` and on the attacker's hands/weapon arm; the person key is `getIdentityPath()`, never `resolveInflicter`'s template path |
| walking | `Mobile.crossExit` after the move (:929) — `destination.getFloor()?.receiveTraffic(mover)` then `sourceFloor.soilFeetOf(mover)` | mire / standing water / wet earth → `mud` on the feet and legs' outermost layers; the destination floor takes a fraction of what is on the mover's feet (D15). Shop floors soil with their customers by this alone |
| stoke / tend | `StokeController.ts:120` after `burner.stoke(item)` | `ash` + `soot` on hands |
| fire exhaust | `FireLogic.emitExhaustInto` (:503–528) when incomplete | `soot` onto every Soilable fixture and prop in the room (windows, the floor, a lamp; rubber's rubber goods lying in a sooty works — honest) proportional to smoke kg — D19/D20 |
| fired recipes | `FireController.runFiring` after the output lands (rubber rewrites this method; its version is the base when it lands first) | the recipe's `soils` applied to the firer (else `soils:` on a glass, lime or vulcanize recipe is silently dead), and `recordHeat(heldK, holdS)` on every Soilable chamber content — the oven hold IS dry-heat sterilisation (D14's second heat writer) |
| mill / scutch | `finishGrind` (:384); textiles' scutching completion | dust into the room's air (D22) + `flour` on hands/apron |
| eating / serving | `EatController` after the portion is consumed (:107–121); trade-cooking's `PlateController` completion | `crumbs` (debris) on the room's floor — the one producer of the one debris kind; what the pests read (D17) |
| saw | storage's `finishSaw` | nothing new: the sawdust heap is storage's `Sawdust` GOOD lying on the floor; it is never a deposit (D15) |
| forging, a mend | `craftImpl` for the anvil recipes (content: `soils: soot` on smithing rows once the field exists); `repairImpl` deposits nothing | noted, not built |
| treating a bleed | `applyTreatment` | `blood` on the treater's hands (D4) |

**D7 — Rain and swimming wet; immersion also RINSES.** Rain on what
you wear is rubber's `Attired.exposeToRain(delta)`; going into water is
storage's `Attired.immerse(parts?: (partKey: string) => boolean)` (the
optional part filter is rubber's flooded cell's; no filter = every
part). Both are read, never copied. If storage has not landed when W2
starts, `immerse(parts?)` is built here in storage's D11 shape (`wet(1)`
on the body and on every `coveringAt(part.key)` layer of every body part
the filter admits; a non-Attired Wet thing gets `wet(1)`), and storage
then deletes its copy and keeps its callers. ⭐ **Immersion rinses**
(lens 1, lens 3a — climbing out of a river still caked in mud is the
fiction betraying itself): inside `immerse()`, every immersed Soilable
site and layer runs `wash({waterK, cleanser: null, effortS: minimal})`:
mud and sweat lift at the water-only rate, grease and a set stain stay.
This build owns that line in either landing order.

**D8 — Blood is a sample.** A `blood` deposit carries a `StainRecord`
built from the bleeder's `bloodSystemOf()`/`bloodType()` (TRUE values,
like `BloodUnit.type`), `set: false`. Washing above `setsAboveK` sets it;
washing below removes it with the deposit; burning destroys it with the
garment. `analyze blood <garment>` — `BloodReading.analyze` gains a branch:
a Soilable target with a blood stain reads the stain's type **as a tested
sample** (the drawn-unit rule), *untested* nowhere. One class edit in
trade-medicine, no new reading row (AC 6).

**D9 — Laundry marks are labels.** `LabelledMixin` composes on `Garment`
(kernel; field `label` sparse `''` on every garment row; the four
Stackable/labelled rules already shipped). A dead body's loadout moves
into the corpse's contents (`ConditionLogic.ts:~876`), so the mark on a
shirt on a body nobody can name is readable with `look`.

### Washing and drying (D10–D13)

**D10 — `wash` is rewritten over `Soilable.wash(spec)`; the mixin is the
authority and the controller is dumb.** The view's `target` becomes
`type: objects`, `required: false`, `requires: SoilableMixin` — ONE mixin,
no alternation; vessels, kit, bandages, floors, windows, garments and
bodies all compose it (D3), so the Serviceable/Contaminable half still
reaches every vessel. `water` keeps `in | under | at` (`with` moves to the
cleanser); a new `cleanser` arg (`type: object`, prepositions `with |
using`, scope reachable, `requires: any`, controller-narrowed to a
`Tangible` whose material carries some Cleanser row's `agent` tag).
`scrub.yaml` is a second view over `ScrubController extends WashController`
(the verb-collision ladder's first rung: one act, one controller; `scrub`
= 3× `WASH_MS`, 350 W, `effortS` ×3 — time is the third contribution).
The controller reads: the water slot's material + `temperatureK`
(`SourceSlot`/`BulkSlot` of a `Thermal` holder) + `hardnessDgh` (D12), the
cleanser row, the effort, and the co-washed set, and calls each target's
`wash(spec)`; it renders the `WashOutcome` and nothing else.
`Soilable.wash` per kind: removal = `base(action ∈ answersTo) × f_T × f_t ×
f_hard`, blood sets at `waterK ≥ setsAboveK`, a set stain answers only to
`oxidiser`; then the host-specific half by override: **`Garment.wash`**
(fibre damage from the Cleanser row's `damages` and the water: `boiling
felts wool` = `waterK ≥ 363 && hasTag('protein')` → `setConstructionForm('felted')`;
`hot water shrinks` = `waterK ≥ textiles.wash.shrinkAboveK` (333) →
`cutToStature/cutToGirth × 0.97` after materialising a stock stamp —
⚠ both shrink and felting apply only when the garment's material carries
the `fibre` tag **and** water reaches it (`material.permeability() > 0`,
the one wet law): rubber, rubberized cloth (wAC 0.5) and leather do not
shrink in hot water (repair's read, 2026-10-17); `harsh
bleaching rots linen` = `oxidiser` on `cellulose` at full dose → `wear()`
through `Durable`; `launder()` for the dye; **bleed** = the strength
`launder()` removed × `textiles.wash.bleedFraction` applied by `applyDye`
onto every co-washed `Dyed` garment with a lower-fastness source — the
stack already supports it; `wet(1)`), **`CraftVessel.wash`** (the shipped
tipping + `clearContamination`; sanitised/disinfected via D14),
**`Creature.wash`** (sites; `skinHarshness` → D23). Three rules from the
siblings' read: **felting shrinks for real** — a felted garment scales
its stamp by `textiles.wash.feltShrink` (0.85), not the 0.97 hot-water
shrink, so a *felted, shrunk* jumper no longer fits even once rubber's
D16 stretch term lands (and that term must read the `felted` form as
non-stretching — asked of rubber); **wear takes a channel** — bleach rot
and vitriol burns call `wear(textiles.wash.rotDose, 'corrosion')`
(repair's Assembled `wear(amount, channel)` routes it to the line that
gives first by material; on master the channel is ignored; the dose is a
dial; the single-line limit is written into `cleanliness.md`); **an
impermeable garment comes out damp, not soaked** — the wet outcome is
`wet(material.permeability())` (the one wet law: rubber gloves 0,
wool 0.825), consumed from whichever sibling lands it; hot water shrinks
only `textile`/`protein`/`cellulose`-tagged fibres, never rubber. `textiles` band gates
nothing and **reads before**: a competent hand is told *wool — it will felt
if boiled* in the begin line (lens 1: resolution, not access).

**D11 — `dry` moves to the platform with its rack, and takes a wet
garment.** The view, the controller AND the class that affords the verb
move from trade-cooking to the platform: `C/platform/content/platform/cmd/crafting/dry.yaml`,
`S/platform/idea/cmd/crafting/DryController.ts`, **`S/platform/thing/DryingRack.ts`**
(`extends Fitting`, byte-identical; the cooking pack's `drying-rack` row
re-points its `class:`; the rule is *the class that affords a platform
verb belongs with the verb* — a commons `clothes-line` row may not name
a trade pack's class). The cooking pack's view and controller are
deleted (`lint:verb-collisions`). The controller branches: `isWaterActive`
→ the shipped rate (unchanged); else `isWet && getWetness() > 0` → place
it on the rack/line (a `Placing` host; `reachable:[class.DryingRack]`
stays the default) with the shipped exposure fraction, so the Wet
reconcile dries it at the rack's air; **wind** — when the scope answers
`exposure()` (rubber landed), `windEnters()` multiplies the rack's
exposure fraction by `wetness.windFactor` (1.5): a line on the open
drying ground dries faster than one in a shut room; before rubber the
factor is 1. A `/stuff/thing/fixture/clothes-line` row (class
`/platform/thing/DryingRack`, exposure 1, `on`) for the lavoir's drying
ground and the Hinkley yard; a wet garment also dries worn or dropped,
slower. ⚠ **The Wet far-past guard is narrowed by the HOLDER CHAIN**:
the 4 h drop (and the linkdead freeze) apply when the host's holder
chain — `getContainer()` and the worn-slot host, walked to the outermost
holder — reaches an `isHasInteractive` body; so a logged-out swimmer's
body AND shirt stay frozen together (storage's *wet clothes keep
chilling* holds), while a shirt on a line, a heap of sawdust or a dropped
cloak integrates its whole gap at its stamp rate (a shirt left out
overnight is dry in the morning). Test: a soaked swimmer logs out; after
8 h body and shirt are unchanged; the same shirt on the line is dry.
⚠ Storage's drive reads a dug-out heap's wetness before any clock jump
(asked of storage). AC 5.

**D12 — Hardness rides the water.** `WaterDraw` gains `hardnessDgh?:
number` (kernel `WaterSource.ts`); the water pack's reach read fills it
from the compiled reach (flow-weighted at joins, the shipped value);
`BulkPayload.hardnessDgh?` is declared by declaration-merge from
`S/lib/cleanliness/WaterHardness.ts` (the `blood` precedent) and blends
volume-weighted through the shipped payload blend; a `WaterFixture`
`suppliedBy:` a conduit carries its source reach's hardness, so **every
Terminus tap off the Cold Fell main is soft (5 dGH) and the Quay is hard
(12)** — the honest geography, and the drive's contrast with no new
river. `WaterFixture`'s look line gains *"The water is soft/hard"* through
the same `hardnessWords` rule (moved to the kernel as a method on the
`WaterHardness` value object; the water pack calls it). `Soilable.wash`:
`f_hard = 1 − hardWaterPenalty × clamp((dgh − 6)/12)` for a cleanser with
`hardWaterPenalty`; a `softens` cleanser in the same wash (soda, `using`
twice is two cleansers — the `cleanser` arg is `objects`) sets `dgh = 2`.
`rinse.yaml` gains the shore default `wash` already has (`rinse` at a
river works). AC 9.

**D13 — Frozen water, and the water under it: ONE shore method.**
`ShoreMixin.drawAt(key, room): {draw: WaterDraw} | {refusal: 'frozen',
line}` (kernel `S/lib/location/Shore.ts`): not frozen → `read.draw`;
frozen and the room's floor offers `openWaterAreaM2() > 0` (storage's
hole, read off the kernel `WaterSurface` once storage lands, by shape
before) → the **under-ice draw** (`WaterRead.underIce?: WaterDraw`,
`{materialPath (fresh or fouled), temperatureK: 274, hardnessDgh}`, built
in the water pack's read builder beside the `hardnessDgh` fill — a
frozen read's `draw` is null today, so a copied gate would pass and
then find no water); else the refusal *"The water is frozen over; you
would need a hole."* Callers: `WashController.findWater`, `bathe`,
`rinse`, and **`FishingController.reachFor` is refactored onto it** (one
edit in trade-fishing; storage's gate is then one sentence in one place
whichever lands first). The controller uses the async `waterRefFor`
(which warms the read) before deciding — `peekWaterRead` is a 6 h memo
and a cold memo would fall open. Fallback with storage absent: `drawAt`
reads `frozen` alone and refuses. Test: wash at a frozen shore refused;
with a hole, washed in 274 K water at the reach's hardness.

### The tiers (D14)

**D14 — The tier is derived on read from what was done since the last
deposit; heat is stamped by the act that reached it.** `Soilable.cleanTier(site)`:

| tier | holds when |
|---|---|
| `presentable` | `soilBand ≤ marked` and no `film` kind present |
| `clean` | `soilBand === 'clean'` |
| `sanitised` | clean, and `washes[site]` has `action ∈ {surfactant, alkali-*}` with `waterK ≥ 333` |
| `disinfected` | clean, and (`heat.peakK ≥ 373 && heat.heldS ≥ 300`), and — when the host is Contaminable — `Contamination.isClean(getPathogenLoads())` after its own kill reconcile |
| `sterile` | disinfected, and `heat.peakK ≥ 433` (dry) or `≥ 700` (flame) held ≥ 60 s |

Writers of `heat`: `boil <thing>` (`BoilController`: a Soilable, Thermal,
non-Builds target whose reachable heat ≥ 373 → `recordHeat(373, holdS)`
after an engaged step, water consumed as the medium — the bandage in the
pot), `heat <thing>` (`HeatController`: a Soilable target with a lit
burner in reach → `recordHeat(reachableHeatK, step)` — the kit held in
the flame). `Bandage` becomes `Dressing(Soilable(Contaminable(Thermal(Good))))`
and `SurgicalKit` `Audible(Soilable(Contaminable(Tool)))` (pack class; the
kernel `Tool` stays uncontaminable). `DressingMixin.dressingQuality` is
retired as an authored field: `getDressingQuality()` is **derived** from
the tier (`sterile/disinfected 1 · sanitised 0.8 · clean 0.6 · else 0.3`)
and the rows drop `dressingQuality: 1` (`lint:unconsumed-seams` would hold
a dead field). Readers (AC 18):

- **Clinic** — `TreatmentOpts` gains `dressingTier?`, `instrumentTier?`;
  `Vitals.applyTreatment` seeds sepsis from the WORST of hands (needs
  `sanitised`), dressing (needs `disinfected`), instrument (needs
  `sterile` when `by === 'surgery'`); `TreatController` passes the
  bandage's tier, `OperateController` the kit's, `SutureController` the
  suture kit's; the nurses brain boils a bandage if a pot of water is in
  the ward (`forceCommand('boil bandage')`) — its competence decides
  whether it bothers (grain: `competent` and above).
- **Kitchen** — `CraftingLogic.outputMicrobialLoad` gains the mirror of
  `contaminateTools`: `contaminateFromKit(usedTools, maker)` — each
  Soilable tool/board below `sanitised` contributes
  `kitchen.surfaceInoculum × (1 − tierRank/4)` of `KITCHEN_FLORA`
  (`staph`), the maker's hands likewise; the manual-build path
  (`ManualBuild.ts:226–228`) reads the same function. `wash board with
  soap in <hot water>` reaches sanitised; the drive's "scalded board".
- Washing removes microbes (`clearContamination` — shipped), heat kills
  (the Contaminable kill law — shipped), only enough heat kills spores
  (the spore floor — shipped). Semmelweis is three shipped mechanisms and
  one derived word.

### Places (D15–D20)

**D15 — The floor carries its own soil and debris; traffic is a floor
method; the ground kind decides the cleaning method; a water surface
takes none of it.** The `Floor` twin (`S/platform/thing/Floor.ts`)
composes `SoilableMixin`; `FloorMixin` gains:

- **`takesSoil(): boolean` = `!supportIsSlotted()`** — ONE predicate,
  no class check: every ordinary floor (storage's base `false`) takes
  soil; storage's `WaterSurface` and `IceSheet` (`supportIsSlotted()
  true`) take none — mud is not tracked onto a mere, blood does not
  pool on a sheet, a swimmer climbing out is wet, not muddy (D7 rinses
  them). `soil()`, `receiveTraffic`, `soilFeetOf` and `strew` all read
  it; `strew` on such a floor refuses in words. If storage has not
  landed, `supportIsSlotted()` is added here with the base `false`, in
  storage's shape.
- `receiveTraffic(mover)` — takes `cleanliness.traffic.trackIn` (0.2)
  of the mover's foot-layer loads per crossing (so a shop floor soils
  with what its customers bring in; a dry paved town brings in little).
- `soilFeetOf(mover)` — standing water or wetness on an **earth-class**
  kind (`mire`, wet `earth`, wet `loose`) → `mud` on the feet and legs'
  outermost layers; standing water on `slab`/`contrived`/`set-paving`
  (the flooded substation) wets and never muds; `ice` → nothing.
- `strewn: {materialPath, kg} | null` (persistent, runtimeState) — fresh
  rushes or sawdust laid by `strew`; a strewn absorbent converts
  `absorbedBy` films (blood, grease) into debris at the strew. ⚠ After
  rubber, pin by test that `getGroundKind()` of every floor the drive
  scrubs or strews (Hinkley kitchen, cookhouse, shop floor, byre) is
  unchanged by rubber's `onGrade` rewiring; if a building's ground floor
  flips to earth, author `floor: {material}` on that row, never adapt
  the method.
- `cleaningMethod(): CleaningMethod` — an **exhaustive
  `Record<GroundKind, CleaningMethod>`** so tsc fails the moment
  storage's eleventh kind lands unmapped: `earth · loose · mire ·
  beaten-floor` → *strew and sweep*; `set-paving · slab · rock · plate ·
  contrived` → *scrub*; `boards` → *scrub or sand*; **`ice`** → *nothing
  to keep — snow is scraped, not swept* (names storage's `scrape`;
  reachable by `look`/`survey`, never by `soil()`).
- `soilAugmenter` — the THIRD markup augmenter, after `snowAugmenter`
  (`markupAugmenters = [floorAugmenter, snowAugmenter, soilAugmenter]`,
  so soil reads after both ground and snow), masked under knee-deep or
  deep snow exactly as `floorAugmenter` is (`Floor.ts:287–297`): *"The
  boards are greasy and crumbed; a litter of sawdust lies over a dark
  stain."*

`scrub` (the wash alias, D10) on a floor removes film kinds by the kind's
method; a *strew*-kind floor refuses *scrub* in its own words (*"you
would only make mud"*) and wants `strew` + `sweep`. **Debris** is
deposits of `form: debris` (`crumbs`, and what a strewn absorbent
became). **`sweep`** (new platform verb, category `inventory` — it moves
matter; `verbs: [sweep, muck]`) gathers every debris deposit and the used
`strewn` layer on the floor into ONE `/stuff/thing/sweepings` Stackable
(a plain `StackableMixin(Good)` row, no class: it merges only with
sweepings by the base same-template rule — merge-on-arrival needs
MUTUAL `canMergeWith`, `api/stackable.ts:208`, so a one-sided override
never worked; material `/stuff/idea/material/bulk/sweepings` tagged
`[organic, compost, refuse]`, mass = kg swept, keywords `sweepings, heap,
pile`, prose naming the dominant content — drive 4's *bloodied sawdust*
is the strewn sawdust swept up with the blood it absorbed). ⭐ **Sweep
never touches a `Sawdust` good** (storage's ask, accepted): a loose
`Sawdust` stack lying on the floor is already a heap and stays one — the
icehouse keeper's `get sawdust`, the store's pool key and the timber
yard's par line all need the template; sawdust becomes sweepings only
by being STREWN first (`strew` consumes the stack into `floor.strewn`).
On an `IceSheet` the sweep refusal for snow names `scrape` (one act, one
verb). A broom is the instrument (`/stuff/thing/tools/broom`, `Tool`
with `capabilities: [sweeping]`, declared as the view's `tool` arg —
`lint:instrument-args`); bare hands sweep at a third the rate.
**`dispose <heap> [in <midden>]`** moves refuse into a reachable container
that `accepts: refuse` (a `/stuff/thing/fixture/midden` row, `Container`,
`fixedInPlace`, at the byre yard, the lavoir and the Hinkley yard; the
campus midden row re-pointed to it) — the sweepings rot there as compost
and `feed` spreads them (storage's spent wet packing goes the same way
once both land); with no midden in reach it refuses in words. **`strew
<material> on floor`** (`strew.yaml`, `inventory`) lays a carried
`granular, absorbent`-tagged stack (rushes; storage's sawdust, whose
material carries both tags) as the floor's `strewn`, consuming the
stack. **`beat <rug>`** removes debris from a `Rug` (`/stuff/thing/furnishing/rug`,
`Soilable(Good)`, placed `on` a floor) by time alone. A `/stuff/thing/rushes`
stack is sold at the general store (the honest earth-floor cleanser).
If storage has not landed when W4 starts, the sawdust the drive strews
is created here at storage's exact paths and numbers (material
`/stuff/idea/material/wood/sawdust`, ρ 200, k 0.06, c 2000, wAC 100,
tags `[wood, organic, granular, flammable, absorbent, sawdust]`; a plain
`StackableMixin(Good)` row at `/trade/carpentry/thing/sawdust`, mass 1,
keywords `sawdust, dust, heap`, stocked at the general store) and
storage re-classes the row to `Sawdust`. AC 12.

**D16 — Rest reads the bed and the room as kept; the archetype reads the
furniture.** `Chair` composes `SoilableMixin`; `PosturedMixin` gains
`restQualityAsKept(): number` = `getRestQuality() × bandFactor(soilBand())`
(`clean 1 · marked 0.95 · soiled 0.8 · filthy 0.6`) — a total method
(`Floor` is Postured too; a filthy floor is a worse place to lie, honest).
`Metabolic.currentRestQuality` and `Vitals`' wound recovery read
`restQualityAsKept()` × the ROOM's factor (`host.getContainer()?.getFloor()`
band). `Archetype`'s `rest` need keeps `getRestQuality()` — a filthy bed is
still a bed **as far as soil goes** (repair's broken structural line may
still un-bedroom a room through `getRestQuality()`; that is repair's
call). After repair the soil factor sits OUTSIDE repair's structural
factor (Soilable composed outermost on `Chair`). Never a punishment: the
floor is 0.6 (AC 15).

**D17 — Pests are a derived threshold, never a field.** A floor
`hasPests()` when its debris load ≥ `cleanliness.pests.debrisAt` (0.4)
**and** an open `Provision` lies in the room (contents not inside a
sealed container). `Freshness`: a second module function
`pestRatePerHour(host)` beside `lightStrikeRatePerHour`, summed into
`extra` at `:836` (sampled once per reconcile, the stated fidelity limit).
The floor's `soilAugmenter` prints *"Something has been at the crumbs."*
Clean up and the term is zero (AC 15).

**D18 — A built-in fire that burns indoors has a flue; soot is the
act's deposit; a sooted flue catches by the shipped ignition.**
`FluedMixin` (`S/lib/fire/Flued.ts`) composes on **`Hearth` and `Oven`**
(⛔ not `Firebox`: `Campfire` extends it and has no flue; `Forge` and
`Kiln` have stacks of their own and are deferred → structures-slate).
⚠ `/stuff/thing/brazier` and the ward's brazier are `class: Hearth` today
and a brazier has no flue: a sibling class **`platform/thing/Brazier`**
= `SpaceHeating(Placing(Firebox))` (Hearth's chain without Flued — a
flueless hearth you can carry) is added and the brazier rows re-point
to it; its exhaust goes to the room, which is what *"burn sulfur in a
shut room"* (D22) needs. Rubber's `/trade/rubber/thing/oven` and its two
`stove` props (class `Hearth`) gain flues with no rubber edit (asked of
rubber: check `flueSoot` across its drive's cures). Field `flueSoot` kg
(persistent, runtimeState). `consumeFuel` is wrapped (Flued outermost):
`flueSoot += kg × (1 − completeness()) × fire.flue.sootFraction` (0.02 —
a winter's bad fires, a few hundred grams). **The chimney fire**: in the
same wrap, when `flueSoot ≥ fire.flue.ignitesAtKg` (0.5) and
`burnPowerW ≥ 0.7 × maxBurnPowerW` (a roaring fire draws the flue hot),
`catchFlue()`: the soot burns as a charge — `FireApi.emitExhaust` of the
soot mass (smoke into the room), the flash's own shape
(`FireLogic.ts:604–620`): `depositHeat(soot × heatOfCombustion(soot) ×
0.3)` onto every **Thermal content of the room** and `tryAutoignite`
over the room's contents (the shipped spread — ⛔ never an energy term
in `reconcileEnvelope`: rooms are not Thermal, and that method is
rubber's and storage's hottest merge), a scene (*"a roar in the chimney,
and sparks"*), `flueSoot = 0`. No `wear()` on the host — `Hearth`/`Oven`
are not Durable in any plan. **`sweep <hearth>`** with a brush
(`/stuff/thing/tools/flue-brush`, `Tool`, `capabilities: [flue-brushing]`,
declared as the sweep view's tool) → `flueSoot = 0` and `soot` debris on
the floor; without the brush the same verb rakes the GRATE instead —
`Burner.takeAsh()` (D24.1) mints the hearth's `ash` into your hands —
and the scene names the brush as what the flue would want. **A lamp's
glass**: `Lamp` composes Soilable (repair folds `Lantern` into it);
`exhaustTick` incomplete → `soil('soot')` on itself; **`Lamp.getEmittedFlux`
is the ONE funnel for pane state** — repair's failed-facing factor and
this build's soot both scale it, and the soot dims only the GLAZED share
(facing lines whose material is glass): a torch or a flare soots and
does not dim, total, no guard; `wash lamp` restores it. AC 14.

**D19 — Grime is a factor inside `Window.transmissivity()`; the one
funnel this build ships is the Window object.** `Window` composes
`SoilableMixin`; `transmissivity()` multiplies by `1 − 0.6 × bandRank/3`
(a filthy pane passes 40 %); the walk's leg (d) reads it with no change
(AC 13). Soot reaches windows through D6's fire-exhaust deposit onto the
room's Soilable fixtures (a `BoundaryAnchor` fixture → its `Window`).
⚠ **Rubber's construction glass faces (a hothouse roof) have no object**:
rubber has ONE derived figure per face (`ResolvedEnclosure.transmittance`)
but no METHOD a per-place factor could multiply into, and no per-place
grime state exists — this build does NOT add a grime number to
`AtmosphericMixin` (a field on every scope with air, for the one glass
roof in the realm); the attach point (`Face.transmittance()` /
`Exposure.faceTransmittance(face)`, asked of rubber) is named in Deferred
seams, and the stove house — a sooty stove inside a glasshouse whose
grimed roof would cool the latex tap — is its first consumer. Homes: a
window that is a prose detail cannot grime; the drive's home is
**Hinkley** and its kitchen gains a real `Window` row over the counter
window (`kitchen ↔ yard`, both PersistentLocation; `baseTransmissivity 0.85`,
keywords `window, glass`) **and drops `ambientSource: sky` /
`ambientOpening: window`** from `lots/kitchen.yaml` — the ambient rung
does not pass through the object, so keeping it would let grime dim only
the leg-(d) share and make AC 13 negligible (check `lint:light-sources`
accepts a Window-lit room; if it does not, the row keeps a small
authored `ambientIntensity` for the hearth-glow and the Window carries
the daylight); the Seznick main room's two tall windows and the dorm's
stay prose (`ambientOpening`) and are listed as content to author later.

**D20 — Stalls foul by the animal-day; the manure is a heap; nitrogen
is read by the instrument.** The byre's floor accrues `manure` by
`herd.tally × days` since the last muck-out — ⭐ **the one calendar accrual
in this build**, allowed by doctrine § 3a (*a continuous physical process
with a legible local cause* — the cows are there) and declared on the
row — ⚠ `FloorSpec` is CLOSED (`{template, material, onGrade, worked}`,
`Location.ts:52–60`), so `stalls:` cannot ride the room's `floor:`
block: a **floor ROW** `C/hearts-delight/…/dairy/thing/byre-floor.yaml`
(class `/platform/thing/Floor`, keywords incl. `floor, ground` for
`lint:ground` (d), `stalls: { herdbook: /world/terminus/hearts-delight/dairy/thing/dairy-book }`)
named by `byre.yaml`'s `floor: {template: …/byre-floor}` — storage's own
sheet-row pattern (`areaM2` on the ice-sheet row for the same reason).
Load-on-use: the floor's reconcile follows the authored reference, never
a search; `FloorMixin.reconcileStalls()` runs on read when `stalls` is
set, stamping `stallsStamp`. `muck` is an alias of `sweep`
(`verbs: [sweep, muck]` — one act) and a `manure` debris sweeps into a
`/trade/ranching/thing/manure` Stackable (material
`/trade/ranching/idea/material/manure`, tags `[organic, compost,
slow-amendment, manure]`, `contaminates: {e-coli}`) that `feed` spreads
with no code. `analyze soil` (`C/trade-farming/src/idea/reading/SoilSurveyReading.ts`)
gains a nitrogen line banded by competence (the instrumentation rule:
detail, never access) — **the drive's step 15 reads `analyze soil`, not
`survey`** (§ Requirements discrepancies). AC 17.

### Chemistry (D21–D25)

**D21 — Bleaching, sun-fade and sulfur ride ONE airing reconcile on the
garment, driven by what it hangs in.** `Soilable.reconcileAiring()` —
stamped (`airingStamp`), run from the garment's read points (`look`,
`get`, `wash`, the `dry` placement): samples ONCE per reconcile (the
light-strike fidelity rule) the daylight at its scope
(`CelestialApi.daylightFractionAt` × the scope's sky share — **feature-
detected, not merge-order prose**: `typeof scope.exposure === 'function'
? scope.exposure().skyLightFraction() : (BiomeApi.isSkyExposed(scope) ? 1 : 0)`,
the fallback call site marked `// rubber: migrate` so rubber's merge grep
finds the new caller of the legacy walk) and the
scope's `sulfur-dioxide` air content, integrates an **oxidiser dose** over
the gap, and applies it: set stains and film stains fade by the
`oxidiser-slow`/`oxidiser` Cleanser rows (`sunlight`, `sulfur-fume` — the
two ambient agents, D2), `Dyed.bleach(dose)` (new, beside `launder`:
strength × `(1 − dose)` — the sun fade the requirements assumed shipped),
and the fibre rule: `cellulose` whitens (stains fade), `protein` yellows
(`sunYellow += dose`; the presentation reads *yellowed*; SO₂ reverses it).
No night, no polar winter: the dose is zero when the daylight fraction
is. The bleaching green (fibre, a Vat) is untouched. AC 10. ⛔ Not a
calendar clock on a Good in the two-clocks sense: it runs only while the
thing hangs in the sun or the fumes somebody made (the act started it),
it never loses anything the owner did not put in the open, and a coat in
a wardrobe integrates nothing (dark, no gas).

**D22 — Fumes, flashes and dust are air contents with per-material
limits.** Two gas rows in `base-library` (`/stuff/idea/material/gas/{sulfur-dioxide,
ammonia}` with `toxicity`), two platform Conditions
(`Condition/metabolism/{sulfurDioxide, ammonia}`, `toxinBehavior` rows
copying `carbonMonoxide`'s shape; respiration delivers them, a door
clears them — AC 11). Sources: (a) **`Material.combustionProducts?:
[{material, litresPerKg}]`** (new authorable field) read by
`FireLogic.emitExhaustInto` beside CO₂/smoke — authored on **rubber's
sulfur row** TOGETHER WITH `heatOfCombustion: 9.2` (MJ/kg) and
`autoignitionTemperature: 505` (K): without `heatOfCombustion > 0`
`stoke` refuses the lump as *not fuel* (`Burner.ts:868`), so
`combustionProducts` alone does nothing; 505 K sits above rubber's
bellows oven (~482 K), and rubber tests that a firing never ignites its
own charge. If rubber has not landed when W3 starts, the fallback
creates the material at rubber's path with rubber's numbers (tags
`[sulfur, mineral]`, ρ 2070, mp 388, k 0.2) plus these three, **and** the
won row `/trade/quarrying/thing/sulfur` (the coal row's shape, `class:
/platform/thing/Firewood` so it stokes) **and** the Hill Quarry band
`{toZ: −10.4, host: mineral/sulfur, wins: quarrying/thing/sulfur}`
exactly per rubber D13.4 (halite → −10.4…−12); rubber then adopts the
rows. Drive step 11's sulfur is **bought**: a `brimstone` stock line at
the chandlery counter (chandlers sold it; par mints) serves both drives
without a ten-metre dig. `stoke brazier with sulfur` (a `Brazier`, D18 —
no flue, the exhaust goes to the room) then fumes a shut room. (b) **`MaturationProfile.offGas?:
{material, litresPerLitrePerDay}`** replacing the hardcoded CO₂ in
`Maturing.ts:132–157` (the ferment rows author `carbon-dioxide`; a
census test asserts every shipped profile's gas is byte-identical) —
a `chemical` profile `urine → stale-urine` (tags `[liquid, ammonia-source]`)
off-gases `ammonia`; its source is the laundress's piss-tub
(`/world/terminus/wharfside/lavoir/thing/urine-tub`, a `Vat` row seeded
with 20 L of `urine`; refilling it is sanitation-slate's) — propped in
the **laundry** (her shut back room, D27), never under the lavoir's open
roof: an open-sided place must ventilate as outside (asked of rubber,
whose `airChangesPerHour` rewiring decides it), and until that is
confirmed the ammonia is meant to build where a door can let it out.
A test asserts the lavoir's own ACH is ≥ the outdoor answer once rubber
lands. (c)
**`Material.flammableLimit?`** (a volume fraction) read by
`flammableMediumCheck` in place of the global dial when authored:
`flour-dust` and `flax-dust` gas rows (`heatOfCombustion 15`, limit 0.01,
no toxicity — 1 % is not an asphyxiant) and `naphtha-vapour` (limit
0.012). Particulate pretending to be a gas is the stated fidelity
limit (one number, the limit, carries the difference). `finishGrind`
adds `flour-dust` litres per kg milled into an **enclosed** room;
textiles' scutching completion adds `flax-dust`; `sweep` in a room with
dust in its air draws it down (`drawAtmosphereContent`) into `flour`
debris; *damping down* is `wash floor` (D15): it wets the floor's
`strewn` layer and halves the emission for the next grind (the floor
reads `isWet`). **Naphtha**:
`/trade/fuel/idea/material/naphtha` (its own row, `volatile`, bp 350,
`vapourLPerLPerHour`), a coal-tar `FractionSchedule` row
(`coal-tar.yaml`, input tag `coal-tar` — added to the coal-tar material so
it is unique) in trade-fuel; an OPEN vessel holding a `volatile` liquid
emits its vapour into the room on the vessel's thermal reconcile
(`Evaporation.ts` generalised from water-only to any material authoring
`vapourLPerLPerHour`); a naphtha rag by the hearth is then the flash
(AC 11). Mill house (D-user): the grist mill moves indoors — a new
`/world/terminus/hearts-delight/location/mill-house.yaml`
(`PersistentLocale`; construction in **rubber's exact valid
shape**, see D27 for the pre-/post-rubber rule; props the grist-mill +
toll-bin, exits to/from the millsite, the miller's station moves). AC 16.

**D23 — Lye in the eyes, lye on skin, over-washed skin.** A splash at the
hopper is an **epistemic draw** (seeded on the act, `uncertainty.md`): `BulkableLogic`'s bungled-pour path (`:805`
`emitEscapedGas` precedent) calls `material.corrodeOnContact(giver,
{site: 'body.head'})` with `cleanliness.splash.chance` (0.15) for a
`caustic` liquid poured bare-handed from above shoulder height — the
hopper is tall (its row says so: `splashes: true`). **Sight**:
`Creature.perceivedBandModifier` (the first implementer of the perception
seam): an active `caustic` trauma at `body.head` with `agentActive` drops
the band two rungs and `canSeeOverride` refuses details; `rinse` clears
`agentActive` → sight returns; untreated it worsens (the shipped growth).
No eye part, no vision capacity (physiology-slate). Lye on skin is the
shipped caustic through the covering stack: rubber's gloves pass nothing,
leather and cloth attenuate by material. **Over-washed skin**: a body
site washed with a cleanser of `skinHarshness ≥ 0.6` more than
`cleanliness.skin.rawAfter` (4) times without a `mild` wash between gets
a `raw` trauma (a `graze`-family wound at the hand site, severity 0.1 —
the shipped wound model, heals slower while harsh washes continue);
a **cured** bar's harshness is `0.2`, a short-cured `0.8` (D24). AC 11.

**D24 — Soap is made with no new verb: lye by maturation in a hopper,
soft soap and glycerin by maturation in a kettle, the hard bar by a salt
transform into a mould, the cure by seasoning on a rack.** (AC 7 — "with
shipped verbs": `put`, `pour`, `light`/`stoke`, `get`; the requirements'
`strain`/`boil` words are wrong, § discrepancies.)

1. **Lye.** `C/trade-chandlery/src/thing/Hopper.ts` = a `Vat` subclass
   (`Maturing` over `Bulkable`, Container) that holds ash ITEMS and
   water. Its one override is Maturing's profile seam: the `lye`
   `chemical` profile (`content/trade/chandlery/idea/maturation/lye.yaml`:
   `inputCategory: water`, `stallBelowK 275`, `ratePerDay 2`,
   `productMaterial: /trade/chandlery/idea/material/lye`) applies **only
   while a `potash`-tagged item is in the hopper**; finishing consumes
   the ash by `lye.ashKgPerL` (0.3). `put ash in hopper`, `pour water
   into hopper`, half a day, `pour lye into kettle`. Lye: tags `[liquid,
   caustic, alkali, lye]`, `corrosiveTo: [protein, tissue, …]`. **Ash
   supply**: hearth fires leave ash — `Burner.consumeFuel` for a solid
   fuel with `charMaterialPath` **also** accrues `ashKg += kg ×
   material.ashFraction` (new Material field, oak 0.01) on the burner;
   the ash is taken with **`sweep <hearth>`** (W4, D18): without the
   flue brush the sweep rakes the grate — `Burner.takeAsh()` mints an
   `/trade/fuel/thing/ash` Provision from `ashKg`; with the brush it
   sweeps the flue. ⛔ Not a `self`-bucket `get` on the burner: a Burner
   is not a command giver, a shadow or a hosted update, so a `self` verb
   on it is dead (`lint:self-contributions`'s three receivers). In W3,
   before the sweep view lands, ash is bought: the chandlery counter and
   the general store stock `ash` (lines supplied from the Hearthworks'
   accrual by the shipped `consigns` shape) — a player need not own a
   hearth to make lye.
2. **Soft soap + glycerin.** `C/trade-chandlery/src/thing/SoapKettle.ts`
   (a `CraftVessel` subclass composing `MaturingMixin` — the dairy
   `SettingPan` shape) at the chandlery floor on a hob (`seatIn:` the
   hearth; `Burner.heatContents` heats it — the chandlery floor gains a
   `/stuff/thing/Hearth` prop and fuel). Profile `saponification`
   (`chemical`, `inputCategory: fat`, `stallBelowK 350` — *boil it* —
   `happyK 373`, `damageAboveK 420` (scorched), `ratePerDay 24` ≈ an
   hour at heat, `productMaterial: soft-soap` (tags `[soap, surfactant,
   soft-soap, cleanser]`), `leesFraction 0.1`, `leesMaterial: glycerin`,
   `transforms: [{category: salt, becomes: hard-soap-curd}]`). ⚠ The
   kettle's slot holds a BLEND (tallow + lye poured in); Maturing matches
   `inputCategory` on the slot material's tags — the build agent must
   read `Maturing.ts:489` first: if a blend's tags do not carry the
   constituents', `SoapKettle` overrides the profile seam to match when
   the slot's constituents carry `fat` AND `lye` (the Hopper's shape, one
   override, no kernel change). The glycerin lees are drawn off with
   `pour` as dairy's whey is.
3. **The hard bar.** `add salt to kettle` (the shipped `add`/`pour` of a
   `salt`-tagged stack into a bulk) fires the transform → `hard-soap-curd`
   (a `drainSetting` material — dairy's curd shape); `pour kettle into
   frame` — the frame is **a row over the kernel `Mould` twin**
   (`/trade/chandlery/thing/soap-frame.yaml`, `class: /platform/thing/Mould`;
   `platform/thing/Mould.ts` =
   `Mould(Durable(Crafted(Thermal(Bulkable(Container(Good))))))`, no
   `Placing`): a drain set runs unloaded at `1/days` (mould.md § draining),
   and a soap frame takes no press, so dairy's `Hoop` (which adds
   `Placing` for the press stone) is the wrong class and no new class is
   needed; it sets by draining (the nigre is the whey); the frame row
   authors `discipline: chemistry` (the pour credits it) and the
   `hard-soap-curd` material authors **`castTemplate:
   /trade/chandlery/thing/soap-bar`** explicitly — storage's new
   `getCastTemplate()` default sends any unauthored material to
   `/stuff/thing/Casting`, so an unstated cast would be a Casting in
   either landing order (test: the frame's drain set yields a `SoapBar`);
   `get bar from frame` mints `/trade/chandlery/thing/soap-bar`
   (`SeasoningMixin(Good)` via `C/trade-chandlery/src/thing/SoapBar.ts`,
   material `hard-soap` with `seasoningDays: 28`, tags `[soap, surfactant,
   cleanser]`).
4. **The cure.** `SeasoningMixin` is generalised **by moving its wood
   prose out**: the phrase ladder (`Seasoning.ts:112–150`) becomes
   `seasonPhrase()` on the mixin with the neutral words (*green · drying ·
   seasoned*) and `Timber` overrides it with the end-grain/cupping lines
   (`WOOD_EQUILIBRIUM_RH_PCT` stays a module constant — it is the air's,
   not wood's); `SoapBar.seasonPhrase()` says *harsh* (`isGreen()`) /
   *mild* (`isSeasoned()`), and `Cleanser` `skinHarshness` for the `soap`
   agent reads the bar's `seasonedFraction` (D23). A short-cured bar
   washes as well and stings; `look` tells you before you use it. ⭐ Not
   `Ripening` (requires `Fresh` — soap does not rot), not the mould's
   "cure" set process (a bar cures OUT of its frame, on a rack, for
   weeks), and doctrine-legal under § 3a: the clock started at an act,
   runs on a legible physical process, and only improves the thing.
5. The chandlery counter gains stock lines `soap-bar` (par 6, price 3),
   `soft-soap` jar (a `Receptacle` row, par 4, price 2), `lye` flask (par
   4, price 2), `glycerin` jar (par 2, price 4 — cosmetics-slate's
   input); the Business gains a `chandler` roster NPC (a plain `Cast`,
   `fulfills: []`, `purchases: true` — the counter is self-service and
   the par mints; the drive buys soap before anybody has made it, as it
   buys candles). Anyone with a hopper, a kettle and fat makes soap
   (§ 13): the hopper and kettle rows are sold at the general store
   (lines + prices) and a `chemistry` deed is credited on each profile
   finish (`discipline: chemistry` on the rows).

**D25 — The other cleansers are rows and their inputs live with their
makers.** `washing-soda` (material + thing in **trade-fuel**, tags
`[alkali-mild, washing-soda, mineral]`, sold at the general store;
its making — lye evaporated to a solid — is one `evaporative` profile
row `soda-from-lye.yaml` in trade-fuel over the shipped `Vat`, copying
the brine-pan precedent (`trade-quarrying/…/maturation/brine.yaml`: an
evaporative profile whose product is the solid left behind)). `fullers-earth` and `chalk`: the MATERIALS in
`base-library` (`/stuff/idea/material/{earth/fullers-earth, rock/chalk}` —
the column's commons convention, as rubber's sulfur), the won rows in
**trade-quarrying**, and two Hill Quarry bands that **split nothing
shipped**: fuller's earth `−1.6 … −2` inside the clay band (clay becomes
`−1 … −1.6`), chalk `−6 … −6.5` at the top of the limestone (limestone
becomes `−6.5 … −9`); ⛔ nothing at or below −10 — rubber's sulfur sits
at −10 … −10.4 and its test digs −10.2 and −11; ⚠ rubber edits the same
list, the second lander hand-merges the `stratigraphy` in `toZ` order;
both are also stocked at the general store. `sand` reads
its shipped `silica` tag. `vinegar`/`neutral-spirit` need no material
edit (their Cleanser rows name `vinegar` / `neutral-spirit`). `vitriol`
reads its row. `sour-milk` = dairy's `buttermilk` tag (a Cleanser row
with `agent: buttermilk`). `sawdust` = storage's material tag. `sunlight`
and `sulfur-fume` are ambient (D21). `stale-urine` is D22's profile. A
`/stuff/thing/tools/scrub-brush` (`Tool`, `capabilities: [scrubbing]`)
is the general store's brush (the `scrub` view declares it; bare hands
scrub at half rate).

### People, venues, services (D26–D31)

**D26 — Two new service kinds, `wash` and `bath`; the laundress's arm
rides repair's PUBLIC service seam with no discipline hard-coded.**
`SERVICE_KINDS` gains both (a declared closed vocabulary; the ceiling is
untouched); `order.yaml` help gains two lines; `MenuController` lists
them for free. **The seam (repair W3, consumed here; built here in
repair's shape if repair has not landed):** `performService` arms return
`{ok, detail, charge?}` and ONE collector does `charge !== undefined ?
collectMinor(charge) : collect(key)`; ONE `doDurativeService` serves
transfusion and `bath` — ⚠ repair builds the `{ok, detail, charge?}`
seam but does NOT extract the durative helper (one consumer on its
branch); **this build extracts it from transfusion's arm** when it adds
`bath`, whichever lands first; the hand comes from **`CraftingApi.fulfillingHand(giver,
venue, discipline?)`** (public — the wrapper over `presentFulfillers` →
`houseOf` → `callHouse`, candidates **restricted to the tariff's own
house**, since the lavoir and the bathhouse are two-house rooms), where
the optional discipline is **read off the Tariff row**
(`serviceDisciplines: {wash: textiles}` on the lavoir's tariff; the
bathhouse's tariff names none, so its `personal-services` attendant
washes your clothes too — a hard-coded `textiles` would have lost her);
no hand ⇒ the ONE shared refusal constant *"There's nobody here to do the
work."*; `Tariff.quoteFor(lines: {key, label, qty}[]) → Quote` (generic;
the wash lines are `wash` × kinds + `hot-wash` + `bleach`; an unpriced
key is null, never derived; **`cover` is never a quote line** — it is a
payout); `context.interactive?.promptConfirm(...)` (no interactive ⇒
declined); **the customer's ability to pay is checked BEFORE the act**
(`PricedOffer.canSettle(charge)` — pay-after-perform gave a free wash and
possibly an indemnity); the house account is **the one `collect`
resolved** (`PricedOffer.houseAccount()`, repair's self-first walk —
never re-walked here). `order wash <garment>`: the hand reads the
garment — `Garment.describeForLaundress(band)` obeys repair's *quote
only what you can see*: she names fibre and kinds only at a band that
resolves them, and says *"I'll boil it"* without the consequence she
cannot foresee — → quote → confirm → **inputs from the HAND's reach**
(repair's rule: the wash spec is built from the water slot and the
cleanser in HER reach — the trough, the house's soap at par — consumed
as in a self-wash; absent soap ⇒ a water wash, said so) →
`Garment.wash(spec)` with the spec **her textiles band chooses**
(`WashPolicy.forBand(band, garment, kinds)` — a value object in
`S/lib/cleanliness/WashPolicy.ts`: untrained boils everything and reaches
for lye; competent reads the fibre; expert never ruins) → `collectMinor`
→ `settlePiecework` for a `per-settlement` seat. **Ruin** = the
outcome's `damage` non-empty (felted · shrunk · rotted · bled onto): the
house pays the customer the tariff's posted cover (`prices.cover`, grain
20; ⚠ no appraisal mechanism exists — § discrepancies) through
**`BankingApi.indemnify(houseAccountId, payeeKey, amount, memo)`** →
`BankingLogic.indemnifyImpl` (the `payWage` body under a new
`PnlCategory 'damages'`, named generically so repair's warranty and
insurance slates inherit it; employer balance required; the payee's
primary account; a cash-only customer is paid in coin from the house's
till through the shipped `takeCoins`/`moveCoins` when the house holds
coin, else told *the house owes you* and the deed records the debt).
⛔ **`indemnify` refuses self-dealing**: `payee === hand`, or the payee
holds a seat at the paying house — a player holding the laundress seat
alone could otherwise `order wash` their own cheap jumper, boil it, and
be paid the cover from the house account. `hand.recordDeed({kind:
'ruined', what, for: customer})` (AC 19). A ruined garment is also
`wear`-damaged (D10), so a tailor can mend it under repair's band table —
*the house mends it* is a named seam, not built.

**D27 — The lavoir is civic rows; the laundress is a Business with a
Tariff fixture in the same room (two houses in one room, shipped).**
`C/terminus/content/world/terminus/wharfside/lavoir/`: `location/lavoir.yaml`
(`PersistentLocale`, roofed and open-sided; `ambientSource:
sky`, `ambientOpening: arches`; props a `/stuff/thing/fixture/trough`
(`WaterFixture`, `suppliedBy: /world/terminus/wharfside/thing/cold-fell-aqueduct`
— soft, running), two `/stuff/thing/fixture/washboard` (Fitting,
`scrubbing` capability, `peers` affords `scrub`), a `clothes-line` ×2, a
`midden`, the laundress's `tariff`; `cast:` two washerwomen (plain `Cast`
with `greets`-style lines) so *others are there washing*),
`location/laundry.yaml` (her shut back room: the copper, the `urine-tub`
(D22), shelves — `enclosure` + `roof` in full), `location/drying-ground.yaml`
(outdoor: **authors `_biomePath: /stuff/idea/biome/outdoor/baseline`**,
the square's, so the legacy walk and `lint:biome-sky` both read it as
open; post-rubber `enclosure: none` + `roof: none` says the same),
`idea/laundry.yaml` (Business: position `laundress`, `fulfills:
[textiles]`, `requires: {discipline: textiles, band: novice}`,
`headcount: 2`, `compensation: {basis: per-settlement, rate: 1}`, `call:
rota`, `rosterSlots` the NPC laundress 7–17, `operatingLocations` the
lavoir + the laundry + the tariff; `banksAt: goodkin`; `parLines: soap`
from the chandlery outfit — and a `restocks` brain on her so the par is
not inert, authored against storage's `restocks` config shape),
`thing/tariff.yaml` (`services: {wash: wash}`, `serviceDisciplines:
{wash: textiles}`, `prices: {wash: 2, hot-wash: 1, bleach: 2, cover: 20}`),
`agent/laundress.yaml` (textiles `competent`; her low-band twin for the
drive is a player at `novice`). **The construction, in rubber's exact
valid shape.** ⚠ `lint:biome-sky` counts rows LACKING a key; `enclosure:
none` is a legal declared value, and a layer is `{material, thicknessM}`
— never a bare word or a list of words. Post-rubber the lavoir authors
`enclosure: none` + `roof: {material: /stuff/idea/material/rock/slate,
thicknessM: 0.02}` (the awning's shape). **Pre-rubber** `none` and a
layer LIST fail shipped clause (e) and an unknown `roof:` key is
silently dropped by the applier: so until rubber lands every new
interior authors a single-layer `enclosure: {material: <path>,
thicknessM}` plus `roof: {material, thicknessM}` (dropped now, valid
later), and the lavoir's open sides are converted to `none` at the
rubber merge. Same rule for the laundry, the bathhouse rooms and the
mill house. Exits: `wharfside/bank.yaml` gains a **named exit `lavoir`**
(⚠ `southwest` is the dyehouse's, `bank.yaml:87`; every diagonal and
`down` are taken — repair uses the same named-exit shape for its `yard`).
Free: the trough and boards afford `wash`/`scrub` to anyone. A second
lavoir is these rows again (AC 23).

**D28 — The bathhouse is a hospitality venue off the market; the gym
shares its door.** `C/terminus/content/world/terminus/market/bathhouse/`:
`location/{vestibule, baths, gym}.yaml` (Persistent…; construction per
D27's rule; the baths room props a `/stuff/thing/Hearth` + fuel, a
**copper** (`/stuff/thing/fixture/copper` — a `Receptacle` row 100 L
`fixedInPlace`, `seatIn:` the hearth's hob so `heatContents` warms it;
`suppliedBy:` the city main fills it; after repair a Receptacle is
Assembled/Durable/Crafted and reads *one piece* — honest), three
**tubs**, a `midden`, soap at par, the `tariff`; the gym props the
barbell (`/trade/smithing/thing/barbell` — its first prop), a `mat`
surface, a basin), `structure.yaml` (a `Structure` row over the three
rooms, no storeys, no materials — so rubber's D7 warms the vestibule and
gym from the baths' hearth for free; `Structure` ships today),
`idea/business.yaml` (position `attendant`, `fulfills:
[personal-services]`, `purchases`, `compensation` time-based, `call:
rota`, parLines `soap` (chandlery) and `fuel` (the collier) with a
`restocks` brain, the usual), `thing/tariff.yaml` (`services: {bath:
bath, wash: wash}`, no `serviceDisciplines`, `prices: {bath: 3, wash: 2,
cover: 20}`), `agent/attendant.yaml`. Exit: **`north` off the market
square** (free today: the square uses `northeast`, `south`, `west`;
rubber's awning takes `east`), with market-zone `coords` that do not
collide with rubber's awning cell. **The tub** becomes a thing that holds
water: `S/platform/thing/Tub.ts` = **`BulkableMixin(ThermalMixin(Chair))`**
— Soilable arrives through `Chair` (W0) and is NOT composed twice; a seat
you lie in with a bulk interior; `fixture/tub.yaml` re-classed; the
bathroom archetype's `water` need is unchanged (the basin carries it).
**`bathe`** (new platform verb, `crafting` beside `wash`; `bathe [in
<tub|water>]`): needs a `Tub` holding ≥ 60 L of water in reach, OR a
shore/pool's water through `ShoreMixin.drawAt` (D13 — the frozen gate and
the under-ice draw for free); engages the body for `BATHE_S` (120); at
completion `Creature.bathe(waterK, cleanser)`: every body site `wash`ed
(hair is the head site), then the wetting — **in a `Pool` where
`MixinApi.isSwimmable(scope) && scope.immersionOf(body) != null`** the
bather is already in storage's support state (they went in through
`giveWay`/the swim engagement, not through `immerse()` directly) and the
shipped immersion fold chills them; **otherwise** (a tub, a shore, a
bather supported on ice at a hole) `immerse()` wets body and garments
(bathing dressed is the player's problem; the scene says so) and the
cold is **storage's ONE law**, not a second formula: the body's immersion
exchange (`ThermalRegulation.exchangeWithWater(waterK, dtS)`, the
arithmetic `effectiveAmbient` folds — asked of storage; built here beside
that fold in the same shape if storage has not exposed it) is called
once for `BATHE_S` — a winter river chills by the law a pool swim does, a
copper-fed tub warms. **`order bath`** rides the shared durative arm: the
attendant on shift, the copper's water ≥ 310 K (else *"the water is not
hot yet"*), the house's soap at par (none → a water bath, said so),
engage the customer, `bathe` at completion, the flat `collect`; a
`per-settlement` attendant seat is paid by `settlePiecework` like the
laundress's. The attendant washes your clothes = `order wash` at the
same tariff (no discipline named, so the `personal-services` hand
answers; her textiles band — untrained — decides the outcome through
`WashPolicy`, which is the honest bathhouse laundry). ⚠ Winter reaches:
storage raises `water.ice.stillWaterMps` to 0.5, so more Terminus
reaches freeze; the drive's winter bathe is pinned to a reach that stays
`running` or expects the frozen refusal (AC 20's second half, § 15).

**D29 — The doorman is a judgment the exit asks for; the criterion is
data on his brain; he judges only ON SHIFT; the refusal is his words.**
A new exit kind row `/stuff/idea/exits/kept-door` over
`S/platform/idea/KeptDoor.ts` (an `Exit` subclass, the `FordExit`/`AshoreExit`
precedent of a mover-reading async `canTraverse`): it finds, on EITHER
side, a `Behaved` occupant running the `doorman` brain **who
`isOnShiftFor(<the business the exit row names>)` in a `doorman`
position** (storage's `Employed.isOnShiftFor(org)`, consumed; the
one-liner is added here in storage's shape if storage has not landed —
the answer is a SEAT, never presence: an off-shift doorman standing in
the hall is a man in a coat) and asks `brain.judge(host, mover)` →
`{admit: true} | {admit: false, reason}`; no doorman on shift → open.
The brain's `config.dressCode`: `{turnsAway: [{outer: [garment keywords
or template paths], where: torso}, {soiledAbove: 'marked'}, {bare:
[torso]}], greets: [...]}` — he reads `mover.outermostAt('body.torso')`'s
keywords/material/form and its `soilBand()`; regard ≥
`config.regardAdmits` (grain 60) waives it (*someone who does not care*).
Lens 7: criterion named on the row, appeal = the alternatives (a borrowed
coat, a bath, the hall's other business, the bank's own officer who can
`dispatch` you in), tier C. The Goodkin hall's north arch becomes
`kind: /stuff/idea/exits/kept-door` naming `/world/terminus/counting-houses/business`;
that Business gains a `doorman` position (8–18, time-based) and
`counting-houses/agent/doorman.yaml` (`Cast`, costume a frock coat, brain
`doorman` + `greets`) holds it and stands in the hall. ⛔ No `isWizard`,
no gauge, no `canEnter` on the room (the room would then need the
brain's config — the exit asking the person is the honest shape). **The
wharfside remark**: `S/lib/behavior/remarks.ts` — a `greets`-shaped
arrival brain whose lines are keyed by the arriver's outer torso garment
(`lines: [{outer: [coat, frock], say: "..."}]`); the fisher and the pilot
get one line each. AC 20.

**D30 — Cleaning as a gig: a `clean` condition template.**
`CONDITION_TEMPLATES` gains `'clean'` (`ConditionData.subject:
ConditionItemRef` — a `template` ref for a room (its floor) or a hearth
prop, a `chattel` ref for a garment; `band: 'clean'`); `Condition.cleanHolds(subject)`
reads `soilBand() === 'clean'` on the floor / garment, or `flueSoot <
ignitesAtKg × 0.2` on a Flued host; `job post clean <place|thing> for
<reward>` phrase in `JobController` + `job.yaml` help; `ContractLogic`
verifies through the same predicate at :781–829. Four touches, as `watch`
cost (AC 22).

**D31 — Persistence: a singleton place that keeps a record, and
fixtures that keep their state.** (a) `S/platform/location/PersistentLocale.ts`
= `PersistableMixin(Locale)` — ONE row, ONE place, ONE
record keyed by its template path; `StuffApi.singleton` already restores
or seeds-and-captures it (grounding), props capture as unstamped contents
(the Oven's `flueSoot`, a tub's water), chattel owner-side, cast transient
(`reseedCast`), air contents (dust) ride `runtimeState`. ⛔ Not
`PersistentLocation` (not cartesian — the venues author `coords`; and
`WarrenMember`/`Reserved` claim a holding's room). Re-classed rows: the
cookhouse, the byre, the chandlery floor, the textile mill floor, the
glazier's hut, the infirmary ward, the general-store shop floor, the
Circle parlor (the doorman's room — its fire is prose; no state; left as
is), and every new room. (b) **Fixture state**: `AdornableMixin.captureSlice`
captures, for each non-chattel fixture **that is not itself
Persistable** (`MixinApi.isPersistable(fixture)` ⇒ skipped: it keeps its
own `(scope, key)` record — storage's `IceSheet` and its log; a test
with a stub persistable fixture pins it), the fixture's own persistent
`runtimeState` slice under `fixtures: {<slotName>: fields}`, and
`materialize` applies it onto the fixture the row re-minted into that
slot (the floor's `deposits`/`strewn`/`stallsStamp`, a Window's
`deposits` — a Window anchored on two persistable hosts is written twice
with the same state, last wins). The Floor's own comment (`Floor.ts:343–350`)
is the spec. ⛔ Not a floor-keyed `(scope, key)` record per room (one
`holder_snapshots` row per Location at mint — the write-only failure the
`Location` header records; storage's `IceSheet` record is one
pool's big log, a different case). **Capture is explicit**: every act in
this plan that writes a Soilable, Flued or floor field calls
`PersistableApi.captureHostOf(thing)` after it (a worn garment → the
wearer, which captures at logout anyway; a floor → `captureHostOf` must
walk fixture → host: `Adornment.getHost()` is added to the walk's
ancestor step). Drive step 23 (AC 24).

---

## ⭐⭐ Parallel builds — shared files, contracts, merge conflicts

Four builds start together off one master and land **one at a time in
an order nobody can promise** (this one probably last): **rubber**
(build-1, `reqs/rubber`), **repair** (build-3, `reqs/repair`),
**storage-and-ice** (build-4, `reqs/storage-and-ice`), and this one.
Every shared piece below works whichever lands first. Read beside
`docs/plans/cleanliness-note-to-siblings.md` (what we asked of each) and
each sibling's own § Parallel builds (`git show origin/reqs/<x>:docs/plans/<x>-plan.md`).

### Expected landing order, and what the siblings answered

Read the same way by repair and storage, and **confirmed by the owner
2026-10-17** (relayed by repair; it supersedes rubber's note's earlier
fixed order): **storage-and-ice and repair W0–W6 (either order) →
rubber → cleanliness; repair W7 after rubber as its own MR.**
⚠ Cleanliness should **not** land before rubber: our new rooms author
rubber's `enclosure:`/`roof:` shapes. The pre-rubber fallbacks below
stay in the plan as insurance, not as the intended path.

- **Repair** (`origin/reqs/repair` § Parallel builds → *Repair ×
  cleanliness*) accepted: `CraftingApi.fulfillingHand(giver, tariff,
  discipline?)`, public, candidates only from the tariff's own house;
  `Tariff.quoteFor(lines)`; `PricedOffer.houseAccount()` +
  `canSettle(amount)`; if we land first, its fold-back carries our
  `Soilable` (+`Labelled`) onto Chair/Garment/Lamp and our soot factor
  inside `Lamp.getEmittedFlux` (glazed share); survey order holding line
  → `fabricReport` → our room line; one wiki-spoiler paragraph per build;
  Hinkley `lots/yard` out of its W7. Accepted in part: one `doService`
  shape, but **we** extract the durative helper (above). Repair's name
  for our floor predicate was `takesTraffic()`; ours is `takesSoil()`.
- **Storage-and-ice** (`origin/reqs/storage-and-ice` plan): we accepted
  all seven of its asks (see the Storage table), and it accepted all
  nine of ours: it builds `ShoreMixin.drawAt(key, room): {draw} |
  {refusal: 'frozen', line}` + `WaterRead.underIce?: WaterDraw` (274 K,
  the reach's material; our `hardnessDgh` once we land) in the read
  builder's frozen branch, fishing calling it (D15); exposes
  `ThermalRegulationMixin.exchangeWithWater(waterK, dtS)` (D10a), which
  `effectiveAmbient` calls for a swimmable scope and our bathe calls;
  keeps `immerse(parts?)` side-effect-only (our rinse goes inside); reads
  the dug-out sawdust before any clock jump; keys `reface` on the stored
  line key; declares `SEASONS` in `CLOSED_BY_DESIGN`; authors the
  icehouse rooms as `Locale`; re-runs the cookhouse
  steps on a fresh DB after both land; names our `Floor.hasPests()` /
  `pestRatePerHour` as vermin's substrate and our midden as spoiled
  packing's `dispose`; makes no `CLAUDE.md` edits. **If we land first**
  with our own `drawAt` or `exchangeWithWater`, storage folds into the
  one method.
- **Rubber** (`origin/reqs/rubber` 416aef8d5, plan § Parallel builds →
  *Accepted from cleanliness*; its notes to us in
  `rubber-notes-to-parallel-builds.md` § To cleanliness) accepted all
  thirteen: floor material resolution keeps today's derivation and a test
  pins every structure member's ground kind; an authored `ambientSource`
  is never multiplied by `skyLightFraction()` (open sides transmit at
  `light.solar.sideWeight`); `airChangesPerHour = ∞` and
  `addAtmosphereContent = 0` when `isOutside()` or `wallsNone`;
  **`Exposure.faceTransmittance(face)`** is the one face method (our
  deferred glass grime attaches there); `mineral/sulfur` authors
  `heatOfCombustion 9.2` + `autoignitionTemperature 505`, the won row is
  `Firewood`-class, and we add `combustionProducts`; stretch reads the
  form (felted ≈ 0); the wet law lives only on `Material`; `roof`
  authored-only, `_exposure` transient; rubber re-greps
  `isSkyExposed` callers at its merge; awning `east`, bathhouse `north`;
  `consumed?` struck; Hevea authors no `TapSpec.soils`.
  ⚠ **Two checks rubber leaves to OUR merge** (we land after it):
  (1) re-run rubber's drive and confirm `flueSoot` on its works oven and
  two stoves stays under `fire.flue.ignitesAtKg`, or have that drive
  sweep; (2) rubber's stretch allowance can absorb a 0.97 hot-water
  shrink, so AC 5's *hot water shrinks* is tested on **linen**
  (`Garment.wash.test`), and wool's case is the felting (stretch ≈ 0).
  Rubber's other notes are already in this plan: `lint:biome-sky` (not
  `unhoused`), layers as `{material, thicknessM}` objects
  (`rock/granite`/`rock/limestone`, never "stone"), D21 reading
  `exposure().skyLightFraction()`, Cleanser `damages` derived from
  `corrosiveTo` with rubber's honest tags (never `organic`/`elastomer`),
  and `rubberized-cloth` carrying rubber's tags so no vitriol eats it.
  Lone places warm only themselves: the bathhouse's baths hearth does
  not warm the vestibule unless a Structure row names them — accepted
  as is (the vestibule is a cold lobby).

### The merge rule

The build that lands **second** on any shared file: (1) merges
`origin/master` into its branch first; (2) resolves every conflict **by
hand, as the row below says** — never "theirs" or "ours" wholesale;
(3) **regenerates every generated artifact** rather than merging it —
`pnpm -C packages/server lint:field-meta --snapshot` (the field-meta
golden, `field-tags-golden.json`, `unconsumed-seam-shapes.ts.txt`), the
wiki-spoiler `.snap` (`-u`, keeping EVERY build's review-log paragraph,
in landing order), `pnpm install` (the lockfile), `./tools/slate-index`
(`docs/slates/README.md`); (4) recomputes a numeric ceiling on the merged
tree (≤ master's; never summed, never raised — fix code instead);
(5) re-runs the tests and drive named in the row, and `lint:family`;
(6) a sibling's drive is re-run after ours lands where a row says so.

### Files both edit — rubber × cleanliness

| file | rubber | ours | kind | resolution |
|---|---|---|---|---|
| `S/lib/material/Material.ts` (fields, `fieldMeta`, getters) | `lightAbsorption` (`1/m`), `elasticity`, `crosslinking`; the wet law `permeability()`/`wetProperty()` (if first) | `combustionProducts`, `flammableLimit`, `vapourLPerLPerHour`, `ashFraction` | textual | keep both; append `fieldMeta` keys, never reorder; ⚠ `combustionImparts` (food aroma) already exists — never "unify"; then regenerate the golden |
| `S/lib/slot/Attired.ts` | `exposeToRain(delta)`; `immerse(parts?)` (storage's, if rubber lands it) | `doff(garment, {careful})`; the soil clause in the impression (:251–276); the rinse inside `immerse()`; the whole `immerse(parts?)` only if nobody has | textual | three methods, one file: keep all; ONE `immerse(parts?: (partKey) => boolean)`; our rinse line is added inside it in either order |
| `S/lib/slot/Wearable.ts` | W8 stretch term in `fitOn`; `getClo` k_void migration (if first) | shrink = scale the `cutTo*` stamp; `feltShrink` 0.85 | textual + ⚠ meaning | separate regions; rubber reads the `felted` form as non-stretching (asked); re-run rubber's fit test and our `Garment.wash` test |
| `S/lib/ground/Floor.ts` | `isOnGrade()` default → `exposure().onGrade`; snow gated on `rainReaches()`; terrace defaults | `takesSoil`, `receiveTraffic`, `soilFeetOf`, `strewn`, `stalls`, `cleaningMethod`, `hasPests`, `soilAugmenter`, `fieldMeta` | textual + ⚠ meaning (`getGroundKind()` reads `isOnGrade()`) | different methods; the `markupAugmenters` line is ours; after rubber, pin the drive floors' ground kinds (D15); if a building floor flips to earth, author `floor: {material}` on the row |
| `S/lib/husbandry/Producing.ts` | `:383–390` the `weather` window reads the air | `stampTheHand` (`:1184`) applies `TapSpec.soils` | textual + meaning | distant hunks; rubber's Hevea row authors no `soils` so latex leaves nothing on the hands (test) |
| `S/lib/config/AppSettings.ts` + `C/platform/content/settings/*.yaml` | `light.solar.*`, `envelope.solarSegmentsMax`, `pump.*`, `wetness.impermeableBelowPct` | `cleanliness.*` (new `cleanliness.yaml`), `fire.flue.*`, `textiles.wash.*`, `kitchen.surfaceInoculum`, `lye.ashKgPerL`, `wetness.windFactor` | textual | append in each owner's section; `wetness.yaml` gets both keys |
| `C/base-library/…/material/mineral/sulfur.yaml` | **creates** (tags, ρ, mp, k, colour) | adds `combustionProducts`, `heatOfCombustion 9.2`, `autoignitionTemperature 505`; creates the row at rubber's path if absent | add/add if we are first | rubber keeps our three keys and its values; rubber tests a firing never ignites its charge |
| `C/trade-quarrying/…/thing/sulfur.yaml`, `C/rejection/…/idea/deposit/quarry-hill.yaml` | the won row (`Firewood`), the band `{toZ: −10.4}` (halite → −10.4…−12) | fuller's earth `−1.6…−2`, chalk `−6…−6.5`; the sulfur row + band only in the fallback | textual (two list inserts) | second lander hand-merges `stratigraphy` in `toZ` order; nothing of ours at or below −10; rubber's test digs −10.2 (sulfur) and −11 (salt) |
| `C/base-library/…/material/bulk/vitriol.yaml`, `caustic/quicklime.yaml` | `corrosiveTo` loses `organic`, gains honest tags | nothing (Cleanser `agent: acid`; `burns` derived from `corrosiveTo`) | — | no textual collision; rubber publishes the tag words it adds (`cellulose`, `protein`, …) in the commit |
| `C/base-library/…/material/wood/*.yaml` and other `organic` rows | honest tags where vitriol must still catch | `ashFraction` on the log materials (oak, pine; ⚠ never `wood/ash.yaml`, the tree) | textual | keep both keys |
| `C/terminus/…/general-store/counter.yaml` | `rubber-boots`, `rubber-gloves` + prices | soap, soda, scrub-brush, broom, rushes, hopper, kettle, ash, fuller's earth, chalk + prices | textual | union of lines and prices (repair adds too); `lint:reachability` R + `lint:mass` after |
| `C/terminus/…/market/square.yaml` + the market zone's cells | `under-the-awning` **`east`** off the square | the bathhouse **`north`** off the square | direction/cell | never the same compass word or `coords` cell; today the square uses `northeast`, `south`, `west` |
| `C/terminus/package.json`, `pnpm-lock.yaml` | `@saxonberg/content-trade-rubber` | **`@saxonberg/content-trade-fuel`** (the general store's washing soda and ash lines; terminus does not depend on it today) and maybe trade-smithing (the barbell prop) | textual | union the deps; `pnpm install` regenerates the lock |
| `S/platform/idea/cmd/device/FireController.ts` (`runFiring`) | `for <duration>` hold, crosslink branch, the mould seam | one call after the output lands: the recipe's `soils` + `recordHeat` on Soilable chamber contents | textual | rubber's rewrite is the base; ours is one call appended (storage re-applies its `isComposition` swap in the same method) |
| `S/lib/mould/Mould.ts` | `holdsCast()` | reads (the soap frame row) | — | the frame's cast is `soap-bar`, so `holdsCast` reads true |
| `S/lib/craft/Recipe.ts` | (`consumed?` on `RecipeInputSlot` is DROPPED per rubber D10; its host table still lists it) | `soils` | textual only if rubber keeps `consumed?` | keep both |
| `S/lib/biome/Atmospheric.ts`, `S/platform/idea/api/WeatherLogic.ts`, `AmbientLit.ts`, `VisionModality.ts` | `roof`, `exposure()`, solar gain, ventilation and sky rewiring | **nothing** (we read `addAtmosphereContent`, `drawAtmosphereContent`, leg (d)) | — + ⚠ meaning | none textual; three of rubber's answers move our baselines (Risk 12) — asked of rubber |
| `S/platform/thing/Window.ts` | reads `transmissivity` | Soilable + the grime factor | — | none |
| `scripts/check-envelope.ts`, `check-biome-sky.ts` (+ its list), `check-biome.ts`, `check-light-sources.ts` | creates/extends | our rows must pass them | — | rows in rubber's exact shape (D27); if we author BOTH keys on a LISTED interior we also delete it from the list |
| `S/lib/mixin.ts`, `S/api/mixin.ts`, `check-closed-vocabularies.ts`, `check-template-scans.ts` | none expected | `Soilable`, `Flued`, −`Hygiene`; `Action` declared; +2 `LAZY_DICT` | — | none |
| `lint:lib-statics` / `lint:object-verbs` ceilings | neither raises | neither raises | textual if a number moves | recompute on the merged tree; never raise |
| docs: `ground.md`, `textiles.md`, `fire.md`, `mould.md`, `light.md`/`glass.md`, slates (`structures`, `glass`, `standing-instructions`, `biome-normalization`, `weather`) | its sections | ours | textual | different sections; dedupe the identical structures-slate lines (air mixing; the flue as an object) at the second sweep |

### Files both edit — repair × cleanliness

| file | repair | ours | kind | resolution |
|---|---|---|---|---|
| `S/platform/thing/Lantern.ts` → `Lamp.ts` | W1 **deletes `Lantern.ts`**; the failed-facing flux factor moves to `Lamp.getEmittedFlux`; the lantern row re-points to `Lamp` | Soilable on `Lamp`; the soot term in the same `getEmittedFlux`, glazed share only | delete + meaning | if repair is first: we compose on `Lamp`; if we are first (we composed on `Lamp` from W0 regardless): repair carries our composition and factor across when it folds `Lantern` in |
| `S/platform/thing/Chair.ts` (+ `AssembledChair.ts` deleted) | `Chair` = `Assembled(Crafted(Durable(Postured(Slotted(Good)))))`, `getRestQuality()` scales by structural lines | Soilable OUTERMOST; `restQualityAsKept` on top | textual + benign meaning | the two multipliers compose (test: failed cushion AND filthy seat); the bed and armchair rows move to `Chair` and stay Soilable |
| `S/platform/thing/equipment/Garment.ts` (+ `AssembledGarment.ts` deleted) | composes `AssembledMixin`; `leather-boots` re-points to `Garment` | `Labelled(Soilable(…))` outermost; `wash()` override; `describeForLaundress()` | textual + meaning | keep repair's chain, ours outermost, our class-body methods; `wear(dose, 'corrosion')` routes to the line that gives first |
| `S/platform/thing/Timber.ts` | `Seasoning(Stackable(Durable(Constructed(Crafted(Good)))))`, `condition` as stack identity | the `seasonPhrase()` override (wood prose) | textual | keep repair's chain, add our method; re-run the byte-identity test |
| `S/platform/thing/{Tool,Vat,Receptacle}.ts` | recomposed (Assembled/Keen/Durable/Crafted) | **no edit** (`Hopper extends Vat`; our brushes are `Tool` rows; the copper a `Receptacle` row) | — | re-run `Hopper` tests after repair; the copper and jars read *one piece* — accepted |
| `S/platform/idea/api/CraftingLogic.ts` | `callHouse` factored from `resolveMaker` (:352–400); `diagnoseImpl`; `repairImpl` rewritten (:3222+); `applyAssembledOutput` | `Recipe.soils` at `craftImpl`'s output-stamp site (:3135–3162); `contaminateFromKit` beside `contaminateTools` (:958) | textual, adjacent hunks | expect clean merges; re-read if hunks touch; storage's template-choice helper sits in the same file |
| `S/api/crafting.ts` | `diagnose`, **`fulfillingHand(giver, venue, discipline?)`** (public) | consumes `fulfillingHand`; adds it in repair's shape only if absent | meaning | ONE public seam; the second lander deletes its copy |
| `S/platform/thing/Tariff.ts` | `quoteFor(lines: {key, label, qty}[]) → Quote` (generic) | `SERVICE_KINDS += wash, bath`; `serviceDisciplines`; `disciplineFor(kind)` | textual + meaning | the quote is generic (an unpriced key is null, never derived); `cover` is never a line |
| `S/lib/commerce/PricedOffer.ts` | `collectMinor(amount, reason)` | consumes it; `houseAccount()`, `canSettle(charge)` (added here if repair has not) | meaning | whoever is second adopts the other's body verbatim; the house account is the one `collect` resolved, never re-walked |
| `S/platform/idea/cmd/retail/OrderController.ts` | the repair arm; `performService` → `{ok, detail, charge?}`; one collector; one durative helper | the `wash` and `bath` arms on that seam; `performService`'s kind type excludes `bath` | **hotspot** | the first lander builds the seam, the second rebases its arms onto it — never a parallel collect path |
| `order.yaml` help | repair is a quote | +2 lines | textual | union |
| `S/lib/mixin.ts` / `S/api/mixin.ts` | maybe `Weathering` (W7) | `Soilable`, `Flued`, −`Hygiene` | textual | union; `lint:mixin-names` |
| `S/lib/material/Material.ts` fieldMeta, `C/base-library/…/wood/oak.yaml` | W7 `weathers`, `weatheringDays`, `laying` | our four fields; `ashFraction 0.01` on oak | textual | union of keys |
| `S/platform/idea/cmd/perception/SurveyController.ts` | W7 `fabricReport()` lines, no digits | one floor line | textual | order: holding → fabric → floor; the digit regex covers both; repair W7 likely lands AFTER us and adds beside our line |
| `C/hinkley-hills/…/lots/kitchen.yaml`, `lots/yard.yaml` | W7 `enclosure`/`roof` on the house-programme's rooms (⚠ `yard` is outdoors — asked of repair to exclude it) | the Window, −`ambientSource: sky`, clothes-line + midden in the yard | textual | union of keys; repair rebases on our Window if we landed first |
| `C/terminus/…/wharfside/bank.yaml` | a named `yard` exit | a named `lavoir` exit | textual | union; both named (every compass word and `down` are taken) |
| `C/terminus/…/general-store/counter.yaml` | billhook (W5); reed-bundle, slates, lime-sack (W7) | our ten lines | textual | union |
| `scripts/__fixtures__/field-meta-golden.json`, `src/mud/__tests__/wiki-spoiler-fields.snapshot.test.ts` + `.snap` | re-snapshot; its review-log entry | re-snapshot; our entry (`stains` is the spoiler) | textual | regenerate; keep every entry |
| `scripts/check-closed-vocabularies.ts` | none planned | `Action` in `CLOSED_BY_DESIGN`; `SERVICE_KINDS`+2, `CONDITION_TEMPLATES`+1 | textual | re-run the gate |
| docs: `retail.md`, `employment.md`, `behavior.md`, `mould.md`, `vocations.md`, `crafting.md`, `race.md` | its sections | ours | textual | `retail.md`: **extend** repair's *a priced service is performed by a person* section, one description of the arm seam |

### Files both edit — storage-and-ice × cleanliness

| file | storage | ours | kind | resolution |
|---|---|---|---|---|
| `S/lib/material/Material.ts` | W0 `getCastTemplate()` default rule; W1 `permeability()`/`wetProperty()` | our four fields | textual | keep all; the `hard-soap-curd` material authors `castTemplate` explicitly (D24.3) so the new default never fires on the bar |
| `S/lib/slot/Wearable.ts` | `getClo` → `wetProperty` + byte-identity test | the shrink (separate region) | textual | re-run storage's clo test AND our shrink test; our "getClo untouched" check asserts clo VALUES, not source text |
| `S/lib/slot/Attired.ts` | `immerse(parts?)` | `doff`; the rinse inside `immerse()`; the whole `immerse(parts?)` only if nobody has | textual | ONE `immerse(parts?)`; if we are first storage deletes its copy and keeps its callers (`Pool.onEntered`, `giveWay`, `restamp`) |
| `S/lib/wetness/Wet.ts` | none | the far-past guard narrowed by holder chain | meaning | storage's drive reads the dug-out heap's wetness before any clock jump (asked); our test holds a logged-out swimmer's shirt frozen |
| `S/lib/thermal/ThermalRegulation.ts` | `effectiveAmbient` reads `immersionOf`; `restamp` re-immerses | consumes `exchangeWithWater(waterK, dtS)`; adds it beside the fold, in storage's arithmetic, only if storage has not exposed it | meaning | ONE cold-water law; a river bathe and a pool swim chill alike |
| `S/lib/ground/Floor.ts` (`FloorMixin`) + `S/platform/thing/Floor.ts` (twin) | `bears`, `supportIsSlotted` (base false); `WaterSurface`, `IceSheet` extend the twin | `takesSoil() = !supportIsSlotted()` and everything in D15; Soilable on the twin (so the surfaces inherit it and answer `takesSoil() false`) | textual (high) + meaning | second lander hand-merges both member sets; fieldMeta grows only by ours; `supportIsSlotted` exists ONCE (we add the base only if storage is absent) |
| `S/lib/ground/GroundKind.ts` | the eleventh kind `ice` | `cleaningMethod` typed `Record<GroundKind, …>` | meaning | tsc fails if `ice` is unmapped; our value: *scraped, not swept* |
| `S/lib/boundary/Adornable.ts`, `S/platform/idea/api/PersistableLogic.ts` | its fallback (the sheet captured through the room) would be our slice | the fixture-state slice (skips Persistable fixtures); `captureHostOf` walks fixture → host after the self check | meaning | ONE slice in D31b's shape; the sheet keeps its own record so the slice skips it; the self check in `nearestPersistableHost` (:418) stays first |
| `S/lib/location/{Shore,WaterSource}.ts`, `C/water/src/idea/WatercourseCatalogue.ts`, `C/trade-fishing/…/FishingController.ts` | the frozen gate in `reachFor`; `iceAt`; `stillWaterMps` 0.5 | `ShoreMixin.drawAt` + `WaterRead.underIce` + `hardnessDgh`; `reachFor` refactored onto `drawAt` | meaning | ONE gate method; whoever is second refactors fishing onto it; the under-ice draw is built where the hardness is filled; our winter reaches pinned against 0.5 m/s |
| `S/lib/employment/Employed.ts` | `isOnShiftFor(org)` | consumed by `KeptDoor` (added in storage's shape only if absent) | meaning | one method |
| `C/base-library/…/material/wood/sawdust.yaml`, `C/trade-carpentry/src/thing/Sawdust.ts` + row | material tags `[wood, organic, granular, flammable, absorbent, sawdust]`; `Poolable(Stackable(Good))` | consumed (`strew`, the `sawdust` Cleanser); created at storage's paths as a plain Stackable only if absent | meaning | sweep NEVER touches a `Sawdust` good; strew consumes it into `strewn`; storage re-classes our fallback row |
| `S/platform/location/Pool.ts` | the floor default, the support hooks, `immersionOf`'s temperature | nothing in the file (`bathe` reads `isSwimmable && immersionOf != null`) | — | our `bathe` never re-implements support |
| `S/platform/idea/api/CraftingLogic.ts` | the template-choice helper (off-spec lump, salvage) | ours (above) | textual | regions do not overlap |
| `C/hearthworks/…` | `idea/business.yaml` (ice par), `agent/cook.yaml` | `location/cookhouse.yaml` (the re-class) | — | **disjoint files**; after ours lands the icebox's contents persist with the room — storage re-runs its steps 16 and 21 on a fresh DB (⚠ a bought ice block is titled chattel: verify `fulfill` re-titles it to the business or a restart moves it owner-side) |
| `S/lib/mixin.ts`, `S/api/mixin.ts`, `AppSettings.ts`, `check-closed-vocabularies.ts` (`SEASONS` — storage declares it), `check-ground.ts`, `check-location-classes.ts` | its additions | ours | textual | union; re-run each gate |
| new verbs (`lint:verb-collisions`) | `deposit`, `withdraw` (category `custody`), `scrape`, `mark`, kernel `cut` | `sweep`/`muck`, `strew`, `dispose`, `beat`, `bathe`, `scrub`, moved `dry` | none | verified: no word is claimed twice; on a sheet `sweep` points at `scrape` for snow (one act, one verb) |
| docs: `ground.md`, `watershed.md`, `retail.md`, `employment.md`, `persistence.md`, `textiles.md`, `crafting.md`, `content-packs.md` | its | ours | textual | `ground.md` merged section by section; neither writes a pack count |

### Shared contracts — one owner each, the exact names

| concept | owner | the names both sides use |
|---|---|---|
| the one wet law | first lander (rubber D12.1 ≡ storage D9) | `Material.permeability(): number`, `Material.wetProperty(dry, fluid, saturation): number`; setting `wetness.impermeableBelowPct` (2); `textiles.clo.absorptionReference` hoisted. We only READ it (`Garment.wash`'s `wet(permeability())`) |
| immersion | storage | `Attired.immerse(parts?: (partKey: string) => boolean)` (rubber's filter); `SwimmableMixin.immersionOf(occupant): {mediumTag, temperatureK} \| null` (Pools only). Our rinse runs INSIDE `immerse()`; a pool bather enters through `giveWay`/the swim engagement, never `immerse()` directly |
| the cold-water exchange | storage | `ThermalRegulation.exchangeWithWater(waterK, dtS)` — the arithmetic `effectiveAmbient` folds; our tub/shore bathe calls it once per `BATHE_S` |
| the frozen gate + the water you can reach | **storage** (its D15, kernel `ShoreMixin`; built here in the same shape only if storage is absent) | `ShoreMixin.drawAt(key, room): {draw} \| {refusal: 'frozen', line}`; `WaterRead.underIce?: WaterDraw` (274 K, the reach's hardness; built by the water pack); fishing's `reachFor`, wash, bathe, rinse call it |
| floors | storage (base), ours (soil) | `FloorMixin.bears(loadKg)` (base true), `supportIsSlotted()` (base false; `WaterSurface`/`IceSheet` true); **`takesSoil() = !supportIsSlotted()`** (ours); `GROUND_KINDS` + `ice`; `cleaningMethod: Record<GroundKind, …>`; `markupAugmenters = [floorAugmenter, snowAugmenter, soilAugmenter]` |
| sawdust | storage | material `/stuff/idea/material/wood/sawdust` tags `[wood, organic, granular, flammable, absorbent, sawdust]`; good `/trade/carpentry/thing/sawdust` (`Poolable(Stackable(Good))`, qty = kg, `poolKey = sawdust\|<wetnessBand>`). Sweep never touches it; strew consumes it; no `sawdust` DirtKind |
| sulfur | rubber | `/stuff/idea/material/mineral/sulfur` (+ our `combustionProducts`, `heatOfCombustion 9.2`, `autoignitionTemperature 505`); won row `/trade/quarrying/thing/sulfur` (`Firewood`); band `{toZ: −10.4}`; our `brimstone` stock line at the chandlery |
| rubber's wearables | rubber | `/trade/rubber/thing/{rubber-gloves, rubber-apron, rubber-boots}` — standalone `Garment` rows (repair's ask), so Soilable/Labelled reach them untouched; `permeability() = 0` makes them come out of a wash damp, not soaked, and keeps lye out |
| the construction answer | rubber | `enclosure: none \| {material, thicknessM} \| [layers]`, `roof:` the same; `AtmosphericMixin.exposure(): Exposure` (`skyLightFraction()`, `skyVisible()`, `windEnters()`, `isOutside()`, `wallsNone`, `onGrade`); `lint:biome-sky`. Pre-rubber we author one `{material, thicknessM}` layer each; `none` and lists only post-rubber |
| the paid service | repair | `CraftingApi.fulfillingHand(giver, venue, discipline?)` (candidates restricted to the tariff's house); `Tariff.quoteFor(lines: {key, label, qty}[]) → Quote`; `PricedOffer.collectMinor(amount, reason)`, `houseAccount()`, `canSettle(charge)`; `performService → {ok, detail, charge?}`; one durative helper; one refusal constant. Ours on top: `Tariff.serviceDisciplines`, `BankingApi.indemnify`, `PnlCategory 'damages'` |
| lamps | repair (the fold) | `platform/thing/Lamp` (no `Lantern`); `Lamp.getEmittedFlux` the one pane funnel: failed facing lines × our soot, glazed share only |
| chairs and garments | repair (the chains) | `Chair = Assembled(Crafted(Durable(Postured(Slotted(Good)))))`; `Garment = Assembled(…)`; ours OUTERMOST: `Soilable` on Chair, `Labelled(Soilable(…))` on Garment; `Tub = Bulkable(Thermal(Chair))` |
| `Material` fieldMeta union | each its own keys | rubber `lightAbsorption, elasticity, crosslinking`; storage `permeability(), wetProperty()` (methods); repair W7 `weathers, weatheringDays, laying`; ours `combustionProducts, flammableLimit, vapourLPerLPerHour, ashFraction`; `TapSpec.soils`, `Recipe.soils` ours |
| closed vocabularies | each declares its own | `SERVICE_KINDS += wash, bath` (ours), `CONDITION_TEMPLATES += clean` (ours), `Action` (ours, `CLOSED_BY_DESIGN`), `SEASONS` (storage, `CLOSED_BY_DESIGN`); `CLOSED_VOCABULARY_CEILING` stays 5 |
| Terminus exits and cells | by name | the square: rubber `east` (awning), ours `north` (bathhouse); the Quay: repair named `yard`, ours named `lavoir`; distinct market-zone `coords` |
| the cookhouse | disjoint | storage `idea/business.yaml` + `agent/cook.yaml`; ours `location/cookhouse.yaml` |

### Re-check before each wave (what has landed, which fallback branch)

Run these against `origin/master` and record the answers in § Grounding:

| before | probe | if present | if absent |
|---|---|---|---|
| W0 | `git log origin/master -- packages/server/src/mud/platform/thing/Lantern.ts` shows a deletion; `-- platform/thing/Chair.ts` shows repair's recomposition | re-ground W0 on repair's chains; compose ours outermost | compose on `Lamp` anyway; `Chair`/`Garment` as master has them; repair carries ours across |
| W0 | `git log origin/master -- packages/server/src/mud/lib/ground/Floor.ts` shows `supportIsSlotted` | `takesSoil` reads it | add `supportIsSlotted()` base `false` in storage's shape |
| W0 | `src/mud/__tests__/wiki-spoiler-fields.snapshot.test.ts` header | add our review-log paragraph after theirs | add ours first |
| W2 | `git log origin/master -- packages/server/src/mud/lib/slot/Attired.ts` shows `immerse(` | add the rinse line inside it | build `immerse(parts?)` in storage's shape |
| W2 | `git grep -n permeability packages/server/src/mud/lib/material/Material.ts` | read it | read nothing (the wash wets by `wet(1)` until the law lands; note it) |
| W2 | `git log origin/master -- packages/content/trade-fishing/src/idea/cmd/fishing/FishingController.ts` shows the frozen gate | refactor it onto `drawAt` | build `drawAt` reading `frozen` alone; fishing untouched |
| W3 | `git log origin/master -- packages/content/base-library/content/stuff/idea/material/mineral/sulfur.yaml` | add our three keys | create material + won row + band at rubber's paths |
| W3 | `quarry-hill.yaml` has the −10.4 band | insert ours above −10 in `toZ` order | insert ours; leave −10…−12 untouched |
| W3 | `git grep -n getCastTemplate packages/server/src/mud/lib/material/Material.ts` shows storage's default | author `castTemplate` on `hard-soap-curd` (do it regardless) | same |
| W4 | `git log origin/master -- packages/server/src/mud/lib/spatial/Exposure.ts` | author `enclosure: none` + `roof: {…}` on the lavoir; `windEnters()` in `dry`; `exposure()` in airing; pin the drive floors' ground kinds | one `{material, thicknessM}` layer per key on every new interior; `_biomePath` sky on the drying ground; the `// rubber: migrate` fallback |
| W4 | `git log origin/master -- packages/server/src/mud/lib/ground/GroundKind.ts` shows `ice` | the exhaustive map already has it (tsc) | the map covers ten; tsc catches the eleventh later |
| W4 | `git log origin/master -- packages/content/base-library/content/stuff/idea/material/wood/sawdust.yaml` | strew storage's good | create the fallback material + plain row at storage's paths |
| W6 | `git grep -n fulfillingHand packages/server/src/mud/api/crafting.ts` | consume it, `quoteFor(lines)`, `collectMinor`, `houseAccount` | build the seam in repair's shape; repair deletes its copy |
| W6 | `git grep -n isOnShiftFor packages/server/src/mud/lib/employment/Employed.ts` | consume | add the one-liner in storage's shape |
| W6 | `git grep -n exchangeWithWater packages/server/src/mud/lib/thermal/ThermalRegulation.ts` | consume | add it beside `effectiveAmbient`'s fold, same arithmetic |
| W6 | `market/square.yaml` has rubber's `east` exit; `bank.yaml` has repair's `yard` | take `north` / named `lavoir` | the same words regardless |
| W7 | every sibling that landed: re-run ITS drive once ours is merged where a row above says so (storage 16/21 on a fresh DB; rubber's flue soot across its cures; repair's `order repair` on the shared seam) | — | — |

### Between the siblings (not ours; named so everyone sees them)

- **rubber × storage**: ONE steady-state envelope formula in storage's
  `envelopeSteadyStateK(outsideK, atS)` — rubber folds interior faces and
  solar into it; `FireController.runFiring` — storage's `isComposition`
  swap re-applied inside rubber's rewrite; the wet law and
  `wetness.impermeableBelowPct` one copy; the ice material's move
  (`bulk/ice.yaml`) carries rubber's `lightAbsorption`; the four
  hollow-mere interiors need `roof:`; `WaterSurface` turns off rain
  puddling; stale `MaterialLogic` wording in rubber's D12.1 / W5 /
  host table.
- **rubber × repair**: rubber boots/gloves standalone `Garment` rows, no
  bill, no `extends: leather-boots`; brick is rubber's row and stays
  `weathers: false`; `Mould.ts` — `holdsCast` (rubber) vs `carryPayload`
  (repair); `lint:biome-sky` pays repair's cobbler shop and tinker yard;
  `LayerState` stores `areaM2` + exterior so repair W7 never needs a
  standing structure; `SurveyController` three-way order.
- **repair × storage**: `tickBusiness` grouping evaluates per slot with
  the season clock; `check-openings` overlap arm season-aware;
  `unpackIntoCold` carried whole into `receiveBench`; `perceivedGoods`
  never descends into a shut Sealable; storage's `SEASONS` declared; the
  `BOOT_ENTRY_CEILING` 83 → **85, approved by the owner 2026-10-17**
  for storage's two entries (cleanliness adds NONE — both catalogues
  warm lazily — so at our merge the ceiling is master's, unchanged); the icehouse rooms are
  `Locale` (`lint:location-classes`).

---

## ⭐⭐ Host placement

| new thing | host | what composing it claims about everything already on that host | narrowing check |
|---|---|---|---|
| `SoilableMixin` | `Garment` | every garment may carry dirt by kind and be washed — true of a shirt, an apron, rubber's gloves, a DisguiseGarment | — |
| | `Creature` (per body-part site) | every body that wears things can be dirty where it was touched — true of a person, a cow, a dog (a muddy dog is honest); `Corpse` is NOT a Creature (Thing branch) — a body's dirt dies with it; the garments carry the evidence | no guard: a site-less read is the whole-body band |
| | the `Floor` twin (`platform/thing/Floor`) | every room's ground may be soiled, strewn, swept — true of a street (mud is weather's, left alone) and a hall alike | the cleaning METHOD narrows by ground kind — a method on the floor, never a guard in a verb |
| | `Window` | every pane may grime and pass less light | — |
| | `Chair` (and so the bed, the cot, `Tub`; after repair W1 `Chair` = `Assembled(Crafted(Durable(Postured(Slotted(Good)))))` and `AssembledChair.ts` is gone) | every seat and bed may be filthy and rest you worse | Soilable composed OUTERMOST, so its factor sits outside repair's structural factor; `Floor` is Postured but not a Chair; `restQualityAsKept` is total on Postured (band `clean` when not Soilable) |
| | `Lamp` (repair deletes `Lantern`) | every lamp may soot; only its GLAZED share dims (facing lines of glass) | total: a billless torch or flare soots and does not dim — no guard |
| | `Bandage` | a dressing may be dirty, washed, boiled | — |
| | `CraftVessel` | a pot, glass, pail or kettle may be greasy as well as *used*; the tiers read both | `Serviceable.soiled` keeps its *used* meaning; two facts, two fields |
| | `KitchenTool`, `ButcherBlock` (trade-cooking), `SurgicalKit` (trade-medicine) | the kit the tiers read | pack classes; `Tool` itself stays unsoilable — a sledge is soilable for nobody |
| | `Rug` (new `platform/thing/Rug`, `Soilable(Good)`) | a textile floor covering that is beaten | — |
| `handCleanliness()`, `soilHands()`, `bathe()`, `wash()`, `perceivedBandModifier` override | `Creature` | every body answers how clean its hands are through what covers them | replaces `HygieneMixin` (deleted) |
| `doff(garment, {careful})` | `Attired` (on `Creature`) | the wearer owns the transfer between its layers — the three-copies lesson in `Attired.ts` | — |
| `ContaminableMixin`, `ThermalMixin` | `Bandage`; `ContaminableMixin` on `SurgicalKit` | a dressing and a kit can carry microbes, be boiled, be flamed | the kernel `Tool` and `Good` stay as they are |
| `LabelledMixin` | `Garment` | every garment may be marked — true | — |
| `takesSoil()` (= `!supportIsSlotted()`), `receiveTraffic`, `soilFeetOf`, `strewn`, `cleaningMethod` (exhaustive over `GroundKind`, `ice` included), `reconcileStalls` + `stalls` field, `hasPests`, `soilAugmenter` | `FloorMixin` (`lib/ground/Floor.ts`) | every floor says whether it takes soil (storage's water surface and ice sheet say no, by the same predicate that says standing on them is a slot), takes traffic and names its method; `stalls` is null everywhere but the byre floor row | ONE predicate, no class check; the stall accrual runs only when the row authors `stalls:` — a declared capability, not a guard |
| `restQualityAsKept()` | `PosturedMixin` | every rest surface can say how it rests you AS KEPT | — |
| `FluedMixin` (`lib/fire/Flued.ts`: `flueSoot`, `catchFlue`, `sweepFlue`) | `Hearth`, `Oven` (so rubber's oven and stoves too) | a hearth and an oven burning indoors have a flue that soots and can catch | ⛔ not `Firebox` (Campfire extends it); `Forge`/`Kiln` deferred; the brazier gets its own flueless sibling |
| `Brazier` (new `platform/thing/Brazier` = `SpaceHeating(Placing(Firebox))`) | the brazier rows (`/stuff/thing/brazier`, the ward's) | a flueless hearth you can carry; its exhaust goes to the room | a sibling, not a subclass of Hearth — no `flued: false` flag |
| `DryingRack` (moved from trade-cooking to `platform/thing/DryingRack`, byte-identical) | the rack rows, the `clothes-line` | the class that affords a platform verb lives with the verb | the cooking row re-points `class:`; no commons row names a trade class |
| `combustionProducts`, `flammableLimit`, `vapourLPerLPerHour`, `ashFraction` | `Material` | any material may say what it gives off burning, at what share its vapour flashes, how fast it evaporates, what ash it leaves; the honest zero/null default leaves every shipped row byte-identical | — |
| `offGas` | `MaturationProfile` | any profile may name its gas (replaces the CO₂ hardcode) | a census test pins every shipped profile |
| `soils` | `Recipe` | any recipe may say what making it dirties | — |
| `hardnessDgh` | `WaterDraw` (kernel) + `BulkPayload` (declaration-merge from `lib/cleanliness/WaterHardness.ts`) | drawn water remembers its source's hardness; blends by volume | — |
| `bleach(dose)` | `DyedMixin` | any dyed thing fades under an oxidiser dose | — |
| `DirtKind`, `Cleanser` (Ideas) + two catalogues | `platform/idea/` | row families; nothing composes them | — |
| `WashPolicy`, `WashSpec`/`WashOutcome`, `WaterHardness`, `StainRecord` | `lib/cleanliness/` value objects | nothing composes them | instance-shaped (`lint:lib-statics` at ceiling) |
| `PersistentLocale` | `platform/location/` | one authored place on a grid whose state outlives the process; props capture, chattel owner-side | ⛔ not PersistentLocation (coords; warren claims) |
| fixture-state slice | `AdornableMixin.captureSlice`/materialize | a persistable host remembers its non-chattel fixtures' runtime state | — |
| `Tub` (`Bulkable(Thermal(Chair))` — Soilable comes through `Chair`, never composed twice) | `platform/thing/Tub` | a seat you lie in that holds water | the `fixture/tub` row re-classed; the bathroom archetype unchanged |
| `KeptDoor` (Exit subclass) + `kept-door` kind row | `platform/idea/` | an exit that asks a doorman ON SHIFT at the business the row names | no doorman on shift → open; never a gauge; a seat, never presence |
| `drawAt(key, room)` + `WaterRead.underIce?` | `ShoreMixin` (kernel) + the water pack's read builder | every shore answers *what water can I have here, now* — open, through a hole, or not at all | fishing, wash, bathe, rinse all call it; one sentence in one place |
| `exchangeWithWater(waterK, dtS)` | `ThermalRegulation` (storage's fold exposed as a method) | a body in water loses or gains heat by one law whether it swims or bathes | consumed; built here in storage's shape only if absent |
| `soils` | `TapSpec` (`platform/idea/species/Species.ts`) | any tap may say what taking it dirties; the cow's does, the Hevea's does not | the deposit comes from the row, never from `stampTheHand` |
| `doorman`, `remarks` brains | `lib/behavior/` | commons brains any venue configures | — |
| `Hopper` (Vat subclass), `SoapKettle` (CraftVessel + Maturing), `SoapBar` (`Seasoning(Good)`) | `trade-chandlery/src/thing/` | the chandler's vessels; one profile-seam override each; the soap frame is a ROW over the kernel `Mould` twin | pack classes under the pack root |
| `seasonPhrase()` hook (wood prose moved to `Timber`) | `SeasoningMixin` | the mixin speaks for *a solid drying in air*; the composer speaks for itself | name-the-substrate fix; Timber byte-identical by test |
| `indemnify` | `BankingApi`/`BankingLogic` (+ `PnlCategory 'damages'`, named generically) | a house may pay a person it owes | the conservation chokepoint is `postTransaction`, unchanged; refuses `payee === hand` or a payee seated at the paying house |
| `fulfillingHand`, `quoteFor(lines)`, `houseAccount()`, `canSettle`, the shared refusal constant | repair W3's (`CraftingApi`, `Tariff`, `PricedOffer`) | consumed; built here in repair's exact shape only if repair has not landed | the second lander deletes its copy |
| `SERVICE_KINDS += wash, bath`; `CONDITION_TEMPLATES += clean` | `Tariff`, `Condition` | declared closed vocabularies grow by two and one | ceiling untouched |
| `Sweepings`, `Manure`, `Ash` stacks; `broom`, `flue-brush`, `scrub-brush`, `washboard`, `copper`, `trough`, `clothes-line`, `midden`, `rushes`, `urine-tub` rows | content (commons / trades / Terminus) | rows over shipped classes | — |

**The narrowing test, applied.** Nothing above needs `if (host is a
garment)`: a vessel's wash runs its own override, a floor's method comes
from its kind, a campfire has no flue because it never composed one, a
room with no `stalls:` never reconciles them, a `Postured` that is not
Soilable rests you as it did. The one place a guard was tempting —
*"is this Soilable a body?"* in `wash` — is answered by sites: a body
passes its hand parts, everything else passes `''`.

---

## Convention conformance

- **`props:` / `cast:`** on every new row; no `populates:`, no `container:`
  (`lint:instanceable`). A new NPC born holding kit is a **pack class**
  `CastMixin(StagedMixin(NPC))` (repair D14) — the laundress carries
  nothing; the attendant and doorman carry nothing; the washerwomen hold a
  basket as a room prop.
- **Locations, not rooms** — `PersistentLocale` /
  `Locale`; `PersistentLocation` only where a holding
  furnishes.
- **The `<root>/<branch>/` pattern** — kernel rows in the platform pack
  (`/platform/idea/DirtKind/*`, `/platform/idea/Cleanser/*`,
  `/platform/idea/Condition/metabolism/*`), commons in `base-library` /
  `generic-objects` (`/stuff/…`), trades under `/trade/<x>/…`, Terminus
  under `/world/terminus/…`. Controllers at `<root>/idea/cmd/<category>/`,
  views at `<root>/cmd/<category>/`.
- **Every new interior authors `enclosure:` AND `roof:`** (rubber's
  `lint:biome-sky`), never `_temperature` (`lint:envelope`), and a light
  answer (`lint:light-sources`).
- **Module scope declares** — the two catalogues warm lazily; the Washer's
  effect registry is gone with the Washer; no module-scope registration.
- **Import boundary** — no `fs`/`path` in the mudlib; packs import the
  kernel by specifier; the water pack's draw change is in the water pack.
- **Verbs on objects** — `wash/bathe/soil` on the thing, `doff` on the
  wearer, `receiveTraffic` on the floor, `catchFlue` on the hearth,
  `judge` on the brain, `indemnify` on the Api as an orchestration.
  `lint:object-verbs` stays at zero.
- **Mixin authoritative, controller dumb** — `WashController` binds,
  settles water, calls `wash(spec)`, renders the outcome.
- **No new module category, no free helper** — `pestRatePerHour` and
  `contaminateFromKit` are module functions beside their siblings in
  files that already hold that shape.
- **No new Mongo collection, no migration.** The dev DB is dropped for
  the re-classed rows.
- **A person keys on `getIdentityPath()`** (the stain's bleeder, the
  indemnity's payee, the deed).
- **Gates this build must pass**: `lint:family` in full; named because
  they will fire — `lint:field-meta` (snapshot the golden), `lint:template-scans`
  (+2 LAZY_DICT), `lint:closed-vocabularies` (`Action` in CLOSED_BY_DESIGN),
  `lint:verb-collisions` (`dry` moves; `sweep`, `scrub`, `strew`, `dispose`,
  `beat`, `bathe` are new words), `lint:instrument-args` (broom, brush,
  washboard declared), `lint:arg-kinds`, `lint:self-contributions`,
  `lint:reachability` arm R (every new thing row propped, stocked or made),
  `lint:mass`, `lint:perishable` (checked: it fires only for a `_materialPath`
  whose Material tabulates a non-zero `spoilActivationEnergy` —
  `check-perishable.ts:27–30`; the `manure`, `sweepings`, `soap`, `lye`
  and `glycerin` materials author none, so the `Manure`/`Sweepings`
  `StackableMixin(Good)` rows pass; they compost through `feed`'s
  `compost` tag, not through Freshness),
  `lint:pathogens` (the `contaminates` keys must be shipped pathogens),
  `lint:menu-staff` (`call:` on both new houses), `lint:openings`,
  `lint:biome-sky`, `lint:envelope`, `lint:light-sources`, `lint:ground`
  (the floor rows), `lint:unconsumed-seams` (every new persistent field
  read), `lint:on-create` (no new `onCreate` work), `lint:conditions` /
  `lint:condition-arms` (the two toxin rows), `lint:unconsumed-seams`,
  `lint:untitled` (new subtrees under `/world/terminus` are covered by
  the locality title), `lint:schema` (untouched), **`lint:bills`** (no new
  recipe output here, but rows over `Tool`, `Receptacle` and `Mould` meet
  its arms 7b/7d once repair lands — confirm green), **`lint:location-classes`**
  (`PersistentLocale` extends `Locale`, so
  `extendsAny` finds it; every authored place is a singleton). ⭐ **And
  the wiki-spoiler audit** (`src/mud/__tests__/wiki-spoiler-fields.snapshot.test.ts`
  + `.snap`, a vitest, not a `lint:*`): every new `fieldMeta` field needs
  a review-log paragraph in the header and a bless; this build's one real
  spoiler is **`SoilableMixin.stains[]`** (the bleeder's TRUE blood type and
  `donorIdentityPath` — exactly what `analyze blood` gates): tag it
  `spoiler: 2` and never surface `donorIdentityPath`; `deposits`,
  `washes`, `heat`, `strewn`, `flueSoot`, `ashKg` and the Material fields
  are level 0 (read out in words). Keep every sibling's entry; regenerate
  the `.snap` with `-u` only after each field has its entry.

---

## Waves

Each wave is independently landable and ends at one commit. Sibling
hotspots per wave are named; **the second to land merges by hand**.

### W0 — The substrate: soil by kind, the rows, the hosts, persistence

> ✅ **Done — `99939b917`.** Siblings probed first: none had landed (master
> = rodney), so every W0 fallback applied — `Lantern.ts` still exists,
> Soilable went on `Lamp` regardless; `supportIsSlotted()` added base
> `false`. What changed against the plan: the hand methods live on
> **`AttiredMixin`**, not `Creature` (B1); `ServiceableMixin.soil()` is
> renamed **`markUsed()`** (B2 — the plan's "soil is freed by Hygiene"
> missed it); one deposit per LAYER (a pair of gloves covers both hands and
> takes an act once); `Recipe.soils` and its rows landed here (W1's first
> piece); `Rug` moved to W4 with `beat` (a row nothing props fails
> `lint:reachability`). Surprise: the Floor twin's own static
> `markupAugmenters` read now finds Soilable's list — production unions the
> chain, two snow tests read the static and were moved to the union read.

**Goal.** `SoilableMixin`, the two row families and catalogues, the hosts
composed, the hands clock retired onto the derived read, fixtures and
venues that keep a record. Nothing deposits yet except the shipped
treater's hands; every row is byte-identical in play.
Implements D1–D4, D9, D31.

**Files.**
- `S/lib/cleanliness/{Soilable,WaterHardness,WashPolicy,StainRecord}.ts` (new);
  `S/lib/mixin.ts` (`Mixins.Soilable`, `Mixins.Flued` later; `Hygiene`
  removed), `S/api/mixin.ts` (`isSoilable`; `isHygiene` removed).
- `S/platform/idea/{DirtKind,DirtKindCatalogue,Cleanser,CleanserCatalogue}.ts`
  + `C/platform/content/platform/idea/{DirtKindCatalogue,CleanserCatalogue}.yaml`
  + rows `C/platform/content/platform/idea/DirtKind/*.yaml` (10),
  `…/Cleanser/*.yaml` (14); `scripts/check-template-scans.ts` (+2);
  `scripts/check-closed-vocabularies.ts` (`Action` declared).
- Hosts: `S/platform/thing/equipment/Garment.ts` (+Soilable, +Labelled),
  `S/lib/creature/Creature.ts` (Hygiene → Soilable; `handCleanliness`,
  `soilHands`), `S/platform/thing/Floor.ts` (+ `takesSoil`;
  `supportIsSlotted` base `false` if storage is absent), `S/platform/thing/Window.ts`,
  `S/platform/thing/Chair.ts` (Soilable OUTERMOST on whatever chain repair
  left), `S/platform/thing/Lamp.ts` (not `Lantern` — repair deletes it;
  if `Lantern.ts` still exists at W0 it composes nothing here and `Lamp`
  carries the soot funnel from the start),
  `S/platform/thing/Bandage.ts` (+Soilable, Contaminable, Thermal),
  `S/platform/thing/CraftVessel.ts`, `S/platform/thing/Rug.ts` (new) +
  `C/generic-objects/content/stuff/thing/furnishing/rug.yaml`,
  `C/trade-cooking/src/thing/{KitchenTool,ButcherBlock}.ts`,
  `C/trade-medicine/src/thing/SurgicalKit.ts`.
- Readers migrated: `S/lib/vitals/Vitals.ts` (`applyTreatment`),
  `S/platform/idea/cmd/medical/TreatController.ts`,
  `S/lib/husbandry/Producing.ts` (`stampTheHand`),
  `C/trade-medicine/src/behavior/nurses.ts`, `WashController.washHands`
  (sites). `S/lib/vitals/Hygiene.ts` and its test deleted; `Vitals.sepsis.test.ts`,
  `Producing.pourTake.test.ts` re-pinned on deposits.
- Persistence: `S/platform/location/PersistentLocale.ts` (new),
  `S/lib/boundary/Adornable.ts` (fixture-state slice),
  `S/platform/idea/api/PersistableLogic.ts` (apply the slice on
  materialize; `captureHostOf` walks fixture → host); rows re-classed:
  `C/hearthworks/…/location/cookhouse.yaml`, `C/hearts-delight/…/dairy/location/byre.yaml`,
  `C/terminus/…/wharfside/chandlery/location/floor.yaml`,
  `…/wharfside/mill/location/floor.yaml`, `…/infirmary/ward.yaml`,
  `…/general-store/shop-floor.yaml`, `C/rejection/…/location/glaziers-hut.yaml`.
- Presentation: `look` lines — a garment's `describeSoil` in its
  distinguishing form (`presentation.md` forms), the body's hands line in
  `look hands` / `look <person>` (the Attired impression's upkeep clause,
  `Attired.ts:251–276`, gains the soil clause), the floor's `soilAugmenter`.
- Golden: `scripts/__fixtures__/field-meta-golden.json` (`lint:field-meta
  --snapshot`) and the wiki-spoiler `.snap` + review-log entry (`stains`
  is the spoiler). ⚠ Hotspots with every sibling — regenerate, never
  hand-merge.
- Tests: `Soilable.test.ts` (soil/band/remove; no clock — a day of
  idling changes nothing, AC 1), `DirtKindCatalogue.test.ts` /
  `CleanserCatalogue.test.ts` (a malformed row skipped and named; a
  pack-root row found), `Creature.hands.test.ts` (glove vs bare; the
  derived number; sepsis seeds as before at the threshold),
  `PersistentLocale.test.ts` (singleton restore/seed; a prop's
  field survives; fixture slice round-trips the floor's deposits and a
  Window's). ⚠ `Bandage` composes its three new mixins here but keeps
  the authored `dressingQuality` until W5 derives it (the tier does not
  exist before W2's wash record and W5's heat stamp).

**Acceptance.** AC 1 (unit), 2 (bands in words), 23 (a row in a test
pack is found with no code); `lint:family`; `pnpm test:near` on
`lib/cleanliness`, `lib/vitals`, `lib/boundary`, `platform/thing`,
`platform/location`, trade-medicine, trade-cooking, hearthworks.

**Commit.** `build(cleanliness W0): dirt by kind on the layer it reaches — Soilable, the two row families, the hands clock retired, places that keep a record`

### W1 — The producers, gloves and doffing

> ✅ **Done — `765137f1c`.** Every D6 producer landed except plating
> (B6 — plating drops no crumbs; eating does). Worked acts carry their dirt
> on `WorkResult.soils` — the GROUND's answer, like its credit (B7): the
> plan's "dig/split → mud" was one line in a verb that also splits stone
> and hive frames. The tap's soils land in `completeTap`, after the draw,
> for every yield shape, not inside `stampTheHand` (milk only). The doff
> moves dirt to whatever is now on the hands (bare once the gloves are
> off); it copies rather than moves (contact spreads). Combat and the
> treatment/slaughter deposits key the stain on the LIVE bleeder (a corpse
> composes no Vitals, so a carcass's blood carries no sample).

**Goal.** Every act in D6 deposits where it should; the butcher's apron
bloodies and his shirt does not; gloves take the dirt and give it back
carelessly. Implements D5, D6, D7, D8 (the stain record).

**Files.** `S/lib/craft/Recipe.ts` (`soils`), `S/platform/idea/api/CraftingLogic.ts`
(apply `soils` at the **output-stamp site in `craftImpl`**, beside
`contaminateTools` at `:3135–3162` — not `resolveMaker`, which is
repair's hunk), `S/platform/idea/cmd/device/FireController.ts`
(`runFiring`: `soils` + `recordHeat` after the output lands; rubber's
version is the base when it landed first), `S/platform/idea/species/Species.ts`
(`TapSpec.soils`) + `S/lib/husbandry/Producing.ts` (`stampTheHand` applies
the tap's own) + the cow species row, `S/platform/idea/cmd/bulk/EatController.ts`
+ trade-cooking's `PlateController` (`crumbs`), recipe rows (`render-tallow`,
cooking's, baking's, `melt-wax`); `C/trade-cooking/src/idea/cmd/crafting/ButcherController.ts`,
`C/trade-ranching/…/SlaughterController.ts`, `S/platform/idea/cmd/ground/WorkedActController.ts`,
`C/trade-mining/…/HewController.ts` (+ the mining pack's `dust` DirtKind
row — AC 23's first real consumer), `C/trade-tanning/…/TanController.ts`,
`S/lib/exertion/Exerting.ts` (sweat), `S/platform/idea/api/CombatLogic.ts`
(:2550 — blood with the bleeder's sample), `S/lib/spatial/Mobile.ts`
(:929 — `receiveTraffic` / `soilFeetOf`) + `S/lib/ground/Floor.ts` (the two
methods), `S/platform/idea/cmd/device/StokeController.ts`,
`S/platform/idea/api/FireLogic.ts` (`emitExhaustInto` soot onto Soilable
fixtures/props), `S/lib/slot/Attired.ts` (`doff`), `UnequipController.ts`
+ `remove.yaml` (`manner`), `wash.yaml` help (the clock sentence goes).
Tests: per producer (a butcher's apron reads *bloodied*, the shirt clean;
`look hands` after butchering bare; quick doff dirties, careful does not;
walking the mire muddies boots not shirt; a shop floor after N muddy
customers reads *marked*; a combat bleed stains the victim's coat with
the victim's type; tapping a Hevea or the maple fixture deposits
nothing; a water surface takes no traffic).

**Acceptance.** AC 2, 3; drive steps 1–4 pass in a unit harness;
`lint:family`; `test:near` on every touched pack.

**Commit.** `build(cleanliness W1): every producer names its deposit — the apron takes the blood, the glove takes the dirt and gives it back carelessly`

### W2 — Washing, drying, hardness, the forensic stain

> ✅ **Done — `c77081bcc` + its follow-up.** The chemistry is
> `washSite` (B8); `immerse` built in storage's shape with the rinse inside
> (storage absent); `drawAt` reads `frozen` and a hole by SHAPE
> (`openWaterAreaM2`), fishing untouched (storage's gate not on master);
> the wind term deferred (B9). The calibration: heat `0.8 → 1.2` over
> 283–343 K, a cleanser that answers a kind lifts ≥ 0.9 of it per wash.
> No `BloodReading` unit test — drive step 5 is its proof.

**Goal.** `wash` cleans by chemistry and can ruin; a washed garment is
wet and dries; hard water scums; blood reads off a shirt. Implements
D10–D13, D8 (the reading), D9 (label verb reaches a garment).

**Files.** `wash.yaml` (target `objects`/`SoilableMixin`, `cleanser`
arg, help), `scrub.yaml` + `ScrubController.ts` (new),
`WashController.ts` (rewritten), `S/lib/cleanliness/Soilable.ts`
(`wash`), `Garment.ts` (`wash` override: felt/shrink/rot/bleed/wet),
`CraftVessel.ts` (`wash` override chains the shipped tipping),
`S/lib/material/Dyed.ts` (`bleed` helper on `launder`'s loss),
`S/lib/slot/Wearable.ts` (shrink = scale the stamp; the felt shrink),
`S/lib/wetness/Wet.ts` (the guard narrowed by holder chain), `dry.yaml`
+ `DryController.ts` + **`DryingRack.ts`** moved to platform
(trade-cooking's view/controller deleted, its `drying-rack` row
re-pointed; `C/trade-cooking/pack.yaml` loses the view),
`C/generic-objects/…/fixture/clothes-line.yaml`, `S/lib/location/Shore.ts`
(`drawAt`) + `C/trade-fishing/…/FishingController.ts` (`reachFor` onto
it),
`S/lib/location/WaterSource.ts` (`hardnessDgh`), `C/water/src/idea/WatercourseCatalogue.ts`
(fill it; `hardnessWords` → `WaterHardness`), `S/lib/bulk/Bulkable.ts` /
`BulkableLogic.ts` (payload blend of `hardnessDgh`),
`S/platform/thing/WaterFixture.ts` (the soft/hard line; the supply's
hardness), `rinse.yaml` (shore default), `C/trade-medicine/src/idea/reading/BloodReading.ts`
(the stain branch), `label.yaml` help; `S/lib/slot/Attired.ts`
(`immerse()`'s rinse line — and the whole `immerse(parts?)` if storage
has not landed, D7).
Tests: `Soilable.wash.test.ts` (grease vs water vs soap; blood cold vs
hot → set; set answers to oxidiser only; hard 12 vs soft 5; soda narrows
it), `Garment.wash.test.ts` (boiled wool felts; hot linen shrinks the
stamp; harsh bleach wears; red + white → pink; comes out `soaked`),
`Wet.test.ts` (a Thing dries over 8 h; a logged-out swimmer's body AND
worn shirt both hold; a rubber glove comes out damp, wool soaked),
`Shore.drawAt.test.ts` (open / hole / frozen; fishing unchanged),
`DryController.test.ts` (a garment on a line; a hide as before),
`BloodReading.stain.test.ts`, `WaterFixture.hardness.test.ts` (a tap off
the Cold Fell main reads soft; the Quay hard).

**Acceptance.** AC 4, 5, 6, 9; drive steps 5, 7, 8, 9 in unit shape;
`lint:verb-collisions` (dry) green; `lint:family`.

**Commit.** `build(cleanliness W2): washing removes dirt and can ruin the cloth — time, heat and a cleanser; wet and drying; hard water; the stain that names its bleeder`

### W3 — Soap and the cleansers; bleaching; the perils

> ✅ **Done.** Rubber absent: sulfur created at rubber's paths and numbers
> (material + `Firewood` won row + the −10.4 band), plus fuller's earth
> (−1.6…−2) and chalk (−6…−6.5) in the column. Soap: the **hopper** runs
> `lye-leach` only through ash and spends the ash (`Maturing.matchProfile`
> hook); the **kettle owns its two transforms** (fat + lye → paste, soft
> soap + salt → curd) — no profile for fat or soft soap anywhere, so a cask
> of tallow stays tallow (B15); the frame is a `Mould` row; the bar cures
> by `SeasoningMixin` with its own `seasonPhrase`. The splash is
> DETERMINISTIC (B13). Over-washed skin and coal-tar fractionation are
> deferred (B14, B16); the `Brazier` class moves to W4 with the flue (a
> hearth already breathes into its room, so sulfur fumes a room today).

**Goal.** Lye, soft soap, glycerin, a cured bar, and every § 6 cleanser
as a row with a source; the bleach ladder; lye in the eyes, fumes in a
shut room, naphtha by a flame. Implements D21–D25.

**Files.** `trade-chandlery`: `src/thing/{Hopper,SoapKettle,SoapBar}.ts`,
`content/trade/chandlery/idea/maturation/{lye,saponification}.yaml`,
`idea/material/{lye,soft-soap,hard-soap-curd,hard-soap,glycerin}.yaml`,
`thing/{hopper,soap-kettle,soap-frame,soap-bar,soft-soap-jar,lye-flask,glycerin-jar}.yaml`,
`pack.yaml` (no dairy dependency — the frame is a row over the kernel's
`Mould` twin);
`C/terminus/…/wharfside/chandlery/{thing/counter.yaml, idea/outfit.yaml,
location/floor.yaml, agent/chandler.yaml}` (lines, the hearth, the
roster). Kernel: `S/lib/maturation/Seasoning.ts` (`seasonPhrase` hook),
`S/platform/thing/Timber.ts` (the wood prose), `S/lib/fire/Burner.ts`
(`ashKg`, `takeAsh`), `S/lib/material/Material.ts` (`ashFraction`,
`combustionProducts`, `flammableLimit`, `vapourLPerLPerHour`, fieldMeta),
`S/lib/maturation/MaturationProfile.ts` + `Maturing.ts` (`offGas`),
`S/lib/material/Evaporation.ts` (volatile liquids), `FireLogic.ts`
(`combustionProducts`; per-material limit), `S/lib/cleanliness/Soilable.ts`
(`reconcileAiring`), `S/lib/material/Dyed.ts` (`bleach`),
`S/lib/creature/Creature.ts` (`perceivedBandModifier`, raw skin),
`S/platform/idea/api/BulkableLogic.ts` (the splash). Content:
`base-library` gases `sulfur-dioxide`, `ammonia`, `flour-dust`, `flax-dust`,
`naphtha-vapour`; platform Conditions `sulfurDioxide`, `ammonia`;
`trade-fuel` `washing-soda` (material + thing + `soda-from-lye.yaml`),
`naphtha` material + `fractionation/coal-tar.yaml` (+ `coal-tar` tag),
the ash rows (`ashFraction` on log/dry-log rows via their materials);
`trade-quarrying` `fullers-earth`, `chalk` (materials, won rows, the
column band — ⚠ rubber hotspot `quarry-hill.yaml`); rubber's sulfur row
gains `combustionProducts` (or is created at rubber's path if absent);
`generic-objects` `tools/{scrub-brush,broom,flue-brush}.yaml`,
`urine-tub`; general-store `counter.yaml` lines (soap, soda, scrub-brush,
broom, rushes, hopper, kettle, ash, fuller's earth, chalk) — ⚠ hotspot
with rubber (boots, gloves) and repair (billhook; W7 reed/slates/lime);
the chandlery counter's `brimstone` line; `S/platform/thing/Brazier.ts`
(new) + the brazier rows re-pointed; `wash.yaml` cleanser narrowing reads
the Cleanser rows. ⚠ Sulfur fallback (if rubber is absent): the
material WITH `heatOfCombustion`/`autoignitionTemperature`, the won row
(`Firewood`), the −10.4 band — all at rubber's paths. `cleanser` Discipline credit: `chemistry` on the profiles.
Tests: the soap chain end to end in a unit harness (ash + water → lye in
half a day; lye + tallow at 373 K → soft soap + glycerin lees; salt →
curd; frame → bar; 28 days → mild; a 3-day bar *harsh*), `Seasoning`
(Timber prose byte-identical), `Maturing.offGas` census (every shipped
profile's gas unchanged), `flammable.limit.test.ts` (1 % flour flashes,
1 % smoke does not), `airing.test.ts` (linen whitens by day not night;
wool yellows; SO₂ whitens wool), `caustic-eyes.test.ts` (band drops;
rinse restores), `fumes.test.ts` (a shut room poisons; a door clears).

**Acceptance.** AC 7, 8, 10, 11; drive steps 6, 10, 11 in unit shape;
`lint:perishable`, `lint:pathogens`, `lint:conditions`,
`lint:fraction-schedules`, `lint:reachability` green.

**Commit.** `build(cleanliness W3): lye from ash, soap from fat and lye, a bar that cures — the cleansers as rows, the bleach ladder, lye in the eyes and fumes in a shut room`

### W4 — Places: floors, debris, the flue, dust, stalls, rest, pests, windows

> ✅ **Done — `ec8386825` + the W4 commit.** Siblings still absent. The
> floor carries traffic, strewing, the sweep, the stalls and the pests; the
> verbs `sweep`/`muck`, `strew`, `dispose`, `beat` ship in `inventory`; the
> flue soots and catches; the Hearts' Delight mill house holds the stones
> (the dust flashes); the byre floor is a row with `stalls`. ⚠ The window
> premise was wrong for homes — see **B18**: a sky room's opening is now a
> one-sided pane in the room, so the cookhouse, the Hinkley kitchen and
> the cooking kitchen archetype each carry `/stuff/thing/fixture/window`
> and keep their `ambientSource: sky`. The scrub refusal is a returned
> `Soilable.washRefusal()` hook the Floor overrides (B19); the `clean`
> contract is `clean <place>` / `clean <thing> at <place>` (B20). Surprise:
> a pack's tsc could not see the WaterHardness payload merge (nothing in its
> import closure loaded it) — the three readers import it by type now.

**Goal.** A place is kept as well as it is used; the dangerous
cleanable catches; the mill explodes; the byre is mucked out onto a
field; rest and pests read the room. Implements D15–D20, D22's mill
house, D30.

**Files.** `S/lib/ground/Floor.ts` (methods, `strewn`, `stalls`,
`soilAugmenter`, `hasPests`), `S/lib/slot/Postured.ts`
(`restQualityAsKept`), `S/lib/metabolism/Metabolic.ts`, `S/lib/vitals/Vitals.ts`
(the rest readers), `S/lib/material/Freshness.ts` (`pestRatePerHour`),
`S/lib/fire/Flued.ts` (new) + `S/platform/thing/{Hearth,Oven}.ts`,
`S/platform/thing/Lamp.ts` (the soot term in the one `getEmittedFlux`
funnel, glazed share only), `S/platform/thing/Window.ts`
(grime factor), views + controllers (platform `inventory`): `sweep.yaml`
(`verbs: [sweep, muck]`, tool arg broom/flue-brush) + `SweepController.ts`,
`strew.yaml` + `StrewController.ts`, `dispose.yaml` + `DisposeController.ts`,
`beat.yaml` + `BeatController.ts`; rows `generic-objects`:
`stuff/thing/{sweepings,rushes}.yaml`, `fixture/midden.yaml`
(the campus midden re-pointed), material `bulk/sweepings`; `trade-ranching`
`manure` material + thing; `C/trade-milling/…/MillController.ts`
(`finishGrind` dust), `C/trade-textiles/…/ScutchController.ts` (flax
dust), `C/hearts-delight/…/location/mill-house.yaml` (new, enclosed) +
`millsite.yaml` (props/exit/miller station moved) + `agent/miller.yaml`;
`C/hearts-delight/…/dairy/thing/byre-floor.yaml` (new; `stalls:`) +
`byre.yaml` (`floor: {template}`, a midden in the yard), `C/trade-farming/src/idea/reading/SoilSurveyReading.ts`
(the nitrogen line); Hinkley: `lots/kitchen.yaml` (+ the Window, −
`ambientSource: sky`) + `lots/yard.yaml` + `thing/kitchen-window.yaml`
(the Window row, both anchors), a
`clothes-line` in the yard, a `midden`; `S/platform/idea/cmd/perception/SurveyController.ts`
(one room line: *"The floor is <band>; <method> would see to it."* —
repair W7 is likely to land AFTER this build: leave a clean slot, the
agreed order is holding → fabric → floor, no digits);
contracts: `S/lib/employment/Condition.ts` (`clean`), `JobController.ts`
+ `job.yaml`, `ContractLogic.ts`. Tests: traffic (a shop floor; none on
a water surface or an ice sheet), sweep gathers debris and the used
strewn layer into ONE sweepings heap and **leaves a loose `Sawdust`
stack alone**, strew consumes the sawdust stack and converts blood to
debris, `cleaningMethod` is exhaustive (a compile-time test over
`GROUND_KINDS`), the ground kind of every drive floor is unchanged after
rubber (post-merge pin),
dispose → midden → `feed` raises nitrogen (read by `analyze soil`), the
flue soots per kg burnt × incompleteness and catches at the threshold
with a roaring fire, a swept one does not, a grimed Window passes less
(the walk's lux at the counter drops and returns after `wash window`),
rest as kept × room, the archetype still calls it a bedroom, pests appear
over crumbs + an open loaf and the loaf's freshness falls faster, the
mill house at 1 % flour flashes on `strike`, damped and swept it does not,
the byre accrues `6 × days` manure, a `clean` contract pays on a swept
floor and refuses when it already holds.

**Acceptance.** AC 12–17, 22; drive steps 12–15, 22 in unit shape;
`lint:ground`, `lint:biome-sky`, `lint:light-sources`, `lint:envelope`,
`lint:self-contributions`, `lint:instrument-args` green.

**Commit.** `build(cleanliness W4): a place is kept as well as it is used — floors by their kind, the heap, the flue that catches, the dust that flashes, the byre's manure to the field`

### W5 — The tiers: kitchen, clinic, surgery

> ✅ **Done — the W5 commit** (the `cleanTier` method itself rode W4's
> commit, in `Soilable.ts`). Tiers derive on read; a dressing's quality is
> its tier (the authored field is gone from four rows); `boil <cloth> in
> <pot>` stamps a held boil and runs the kill law, `heat <kit>` holds an
> instrument in the flame; `applyTreatment` seeds from the worst of hands,
> dressing and instrument (surgery opens a wound whatever its type); the
> nurse boils a raw bandage first when competent and a pot is in the ward;
> the ward has a lit brazier and a cook pot (its prose always smelt of
> boiled linen). The kitchen tier inoculates the INPUTS before the
> working's kill (B24). See B22–B25.

**Goal.** Semmelweis. Implements D14.

**Files.** `S/lib/cleanliness/Soilable.ts` (`cleanTier`, `recordHeat`),
`S/lib/vitals/Dressing.ts` (`getDressingQuality` derived from the tier —
the authored field retired; `Dressing.test.ts`) + the four bandage rows
(drop `dressingQuality: 1`),
`S/platform/idea/cmd/crafting/{Boil,Heat}Controller.ts` (the heat stamp
on a Soilable), `S/lib/vitals/Vitals.ts` (`TreatmentOpts` tiers; the
inoculum), `TreatController.ts`, `C/trade-medicine/src/idea/cmd/medical/{Operate,Suture}Controller.ts`,
`nurses.ts` (boils when competent), `CraftingLogic.ts`
(`contaminateFromKit`) + `S/lib/craft/ManualBuild.ts`, `ward.yaml` (a pot
of water on the ward's brazier → the ward props a `/stuff/thing/brazier`
+ a `cook-pot`; its prose is now true), the cookhouse rows (kitchen-tier
reads: nothing to author — ⚠ storage's ice par line lands in
`hearthworks/idea/business.yaml`; this build touches `cookhouse.yaml`
only for its class, W0). Tests: a boiled bandage is `disinfected`, a
washed one `clean`, raw `presentable`; dressing with each + scrubbed vs
unwashed hands → the sepsis seed differs (AC 18); a flamed kit is
`sterile`, a washed one is not and seeds the wound; food on a board at
`clean` vs `sanitised` → `analyze` reads contamination vs none.

**Acceptance.** AC 18; drive steps 16, 17 in unit shape.

**Commit.** `build(cleanliness W5): the clean tiers — washing removes, heat kills, only enough heat kills spores; the kitchen, the clinic and surgery read them`

### W6 — The people: laundress, lavoir, bathhouse, doorman

> ✅ **Done — the W6 commit.** Repair and storage still absent, so their
> seams are built here in their exact shapes (read off their branches):
> repair's `PricedOffer.house/houseAccount/canSettle/collectMinor`,
> `Tariff.quoteFor`, `BankingApi.canSettle`, `CraftingApi.fulfillingHand`
> + `NOBODY_TO_WORK`, the `{ok, detail, charge?, hand?, declined?}`
> collector and `payPiecework` (byte-identical hunks, so the merge is
> clean); storage's `Employed.isOnShiftFor`. New here: `wash`/`bath`
> service kinds, `Tariff.serviceDisciplines`, `WashPolicy`,
> `Garment.describeForLaundress`, `BankingApi.indemnify` (`damages`),
> `Tub`, `Copper`, `bathe` (+ `Attired.bathe`,
> `ThermalRegulation.exchangeWithWater`), `KeptDoor` + the `doorman` and
> `remarks` brains; the lavoir (three rooms, the laundry business, Bet the
> laundress, a washerwoman) off the bank by a named exit, the bathhouse
> (vestibule, baths, gym; Nell) north of the square, Mr Pruitt on the
> Goodkin parlor arch. ⚠ `CraftingLogic`'s `fulfillingHand` rode the W5
> commit (the file carried both). See B26–B33.

**Goal.** Somebody is paid for all of it. Implements D26–D29.

**Files.** `Tariff.ts` (`wash`, `bath`; `serviceDisciplines`),
`OrderController.ts` (two arms on repair W3's seam — `fulfillingHand`,
`quoteFor(lines)`, the `{ok, detail, charge?}` collector, the one
durative helper, `canSettle` before the act; ⚠ if repair has not
landed, build that seam here in repair's exact shape and repair deletes
its copy), `S/api/crafting.ts` (`fulfillingHand` if absent),
`S/lib/commerce/PricedOffer.ts` (`houseAccount()`, `canSettle` if
absent), `order.yaml`, `S/lib/cleanliness/WashPolicy.ts`,
`Garment.ts` (`describeForLaundress`), `S/api/banking.ts` +
`BankingLogic.ts` (`indemnify`; `PnlCategory 'damages'`), `S/platform/thing/Tub.ts`
(new) + `fixture/tub.yaml` re-classed, `bathe.yaml` + `BatheController.ts`
(platform `crafting`), `Creature.ts` (`bathe`), `S/platform/idea/KeptDoor.ts`
+ `/stuff/idea/exits/kept-door.yaml`, `S/lib/behavior/{doorman,remarks}.ts`,
Terminus content: `wharfside/lavoir/**`, `market/bathhouse/**`,
`counting-houses/{banking-hall.yaml (the arch kind), agent/doorman.yaml}`,
`wharfside/agent/{fisher,pilot}.yaml` (a `remarks` line), `wharfside/bank.yaml`
(the lavoir exit), `market/square.yaml` (the bathhouse exit),
`generic-objects` `fixture/{trough,washboard,copper}.yaml`,
`smithing/thing/barbell.yaml` propped, `market/bathhouse/structure.yaml`,
`counting-houses/business.yaml` (the `doorman` position),
`S/lib/employment/Employed.ts` (`isOnShiftFor` if storage is absent),
`S/lib/thermal/ThermalRegulation.ts` (`exchangeWithWater` if storage has
not exposed it). Tests: `OrderController.wash.test.ts`
(no hand → refusal; the quote names fibre, kinds, price; `yes` → washed
at the hand's band; a novice hand boils a **wool jumper** and felts it
(silk is not in the game — the user's decision); the house pays the cover
to the customer's account and the deed is on the hand; `indemnify`
refuses when the customer IS the hand or holds a seat there; a customer
who cannot pay is refused before the wash; the bathhouse's attendant
answers `order wash` and ruins it at untrained; off shift refused;
a player holding the seat is paid piecework), `bathe.test.ts` (a tub of
hot water: clean and warm; a winter shore: clean, soaked and chilled;
frozen refused; through a hole, 274 K; a pool bather chills by the same
law as a swimmer), `order bath` (the copper cold → refused; hot →
engaged, collected at completion; a per-settlement attendant is paid),
`KeptDoor.test.ts` (tannery apron refused in words; a coat admits the
same person; no doorman ON SHIFT → open, an off-shift doorman in the
hall judges nothing; regard waives),
`remarks.test.ts`, `lint:menu-staff`/`lint:openings` green on both
houses.

**Acceptance.** AC 19, 20, 23 (a second lavoir/bathhouse is rows);
drive steps 18, 20.

**Commit.** `build(cleanliness W6): somebody is paid for it — the laundress at her band and the house that stands for her, the lavoir, the bathhouse and its gym, the doorman who says why`

### W7 — The drive, the docs, the MR

> ✅ **Done.** The drive is `packages/wire/tests/cleanliness.dirty.wire.test.ts`; 22 runs, the last 22/22 on a fresh DB including the restart. The docs: `docs/subsystems/cleanliness.md` + the appended sections. The MR carries B1–B39 and the drive's findings.

**Goal.** `packages/wire/tests/cleanliness.dirty.wire.test.ts` runs the
requirements' drive (steps 1–20, 22, 23; 21 cut) against the real socket
on **`WIRE_PORT=2013`** (build-2's port — never the default), including
the restart (the assembly precedent: let the saves land, SIGTERM,
`bootOwnedWorld()`, re-open, re-assert every stain, band, wet garment,
sooted flue, curing bar, swept floor and the mill's air). Every
checkpoint asserts the verb was UNDERSTOOD and a STATE CHANGED (never
`refusedFor` alone). Docs: new `docs/subsystems/cleanliness.md` (the
model, the rows, the tiers, the hosts, the fidelity limits —
particulates as gases, the airing sample, the stall accrual as the one
calendar term); updates to `textiles.md` (the soiling seam lit; wash,
bleed, shrink, felt; sun fade), `spoilage.md` (pests; the kitchen
reader), `harm.md` / `blood.md` (the tiers; the stain), `fire.md` (the
flue, products, limits), `furnishing.md` (debris, rest, pests no longer
"deliberately not here"), `retail.md` / `employment.md` (the two service
kinds; the laundress; indemnity), `contract.md` (`clean`), `persistence.md`
(the fixture slice; `PersistentLocale`), `maturation.md`
(`offGas`; soap), `ground.md` (the floor's soil, `takesSoil`; merged
with storage's water-surface/`ice`/`bears` sections), `watershed.md`
(hardness travels; the under-ice draw), `behavior.md` (doorman, remarks),
`mould.md`, `vocations.md` (laundress, bath attendant, sweep: demand with
supply), **`race.md`** (the four Material fields), **`crafting.md`**
(`Recipe.soils`, `TapSpec.soils`, `contaminateFromKit`), **`light.md` /
`glass.md`** (the Window grime factor; the construction-face seam),
`retail.md` / `employment.md` — **extend repair's *a priced service is
performed by a person* section**, never a parallel one; `content-packs.md`
— **write no pack count** (rubber and storage change it; the chandlery
grew, no new pack here); slate appends deduped against rubber's identical
structures-slate lines (air mixing; the flue as an object); `CLAUDE.md`
map line for `cleanliness.md` **left to the sweep** (index files are
swept, not raced). Then `pnpm test` once, push, MR.

**Commit.** `drive(cleanliness): <what driving found>` then the MR.

---

## Reachability wiring

| capability | verb | affordance | data | boot / warm | arg gate |
|---|---|---|---|---|---|
| soil on a thing | `look` | — | the DirtKind rows | `DirtKindCatalogue.peek` (lazy; `look` never warms — `describeSoil` falls back to the key word cold) | — |
| `wash`/`scrub` a soilable | platform `crafting` views | `WaterFixture` peers (shipped), `Shore` (shipped), washboard peers | Cleanser rows | `CleanserCatalogue.warmed` in `execute` (async, before the step) | `target requires: SoilableMixin` — every W0 host composes it; `cleanser requires: any`, controller-narrowed by tag |
| bare `wash` (hands) | same | same | — | — | no target → sites |
| `dry` a garment | platform (moved) | `DryingRack` (moved to the platform) environment | `clothes-line` row; the cooking rack row re-pointed | — | `target requires: any`; refusal in words |
| `remove … carefully` | `remove.yaml` | shipped | — | — | `manner` optional word |
| `analyze blood <shirt>` | shipped `analyze` | the Reading row (shipped) | — | `ReadingCatalogue` (shipped) | `BloodReading` branch |
| `label shirt` | shipped | `LabelledMixin` contributes `label.yaml` (shipped) | — | — | `requires: LabelledMixin` — Garment now composes it |
| soap chain | `put`, `pour`, `stoke`, `get` | the vessels' shipped buckets | two profile rows, five materials, seven things, counter lines | `MaturationProfileCatalogue` (booted, reader rule — exists) | the hopper's seam needs a `potash` item; the kettle `fat` + `lye` |
| `sweep`/`muck`, `strew`, `dispose`, `beat` | platform `inventory` views | the floor is a fixture — the views bind `reachable` floors by keyword (`lint:ground` (d): floor rows carry `floor, ground`); broom/brush `environment` | sweepings/manure/rushes rows, midden rows | — | `tool` declared, optional; `beat` target `requires: SoilableMixin`, the controller refuses anything that is not a rug or a garment in words |
| the flue, and the grate's ash | `sweep <hearth>` (brush → flue; bare → ash) | the hearth's peers bucket gains the sweep view | `fire.flue.*` settings; `Material.ashFraction` | — | `requires: FluedMixin` on the hearth arm; the tool arg decides which |
| dust → flash | shipped `strike`/`light` | — | three gas rows with `flammableLimit` | `MaterialCatalogue` (booted) | — |
| `bathe` | platform view | `Tub` peers, `Shore` peers (the wash precedent) | tub rows re-classed | — | controller-narrowed water |
| `order wash` / `order bath` | shipped `order` | Tariff peers (shipped) | the two tariffs (`serviceDisciplines` on the lavoir's), two businesses, `call:` | the houses load with their rooms | the hand: `CraftingApi.fulfillingHand(giver, venue, tariff.disciplineFor(kind))`, restricted to the tariff's house |
| `bathe`/`wash` at a frozen shore | same views | shore peers | the water pack's `underIce` draw | — | `ShoreMixin.drawAt` refuses or hands over the under-ice draw |
| the doorman | movement | the exit kind row naming the business | the brain config; the `doorman` position | — | `KeptDoor.canTraverse` → a doorman `isOnShiftFor` that business |
| `job post clean …` | shipped `job` | shipped | — | — | the phrase |
| a pack's new dirt / cleanser | — | — | ONE row under its root | the lazy warm finds it by class | — |

Each link above fails closed and silent; the drive is what proves them
in order.

---

## Acceptance-criteria coverage

| AC | wave | proof |
|---|---|---|
| 1 idle changes nothing; the 6 h decay is gone | W0 | `Soilable.test` (a game day, no change); `Hygiene.ts` deleted; drive 3 |
| 2 outermost layer, kind + band in words | W0, W1 | `Creature.hands.test`, drive 1, 4 |
| 3 gloves wash; careless doffing | W1 | `doff.test`, drive 2 |
| 4 grease/soap, hot blood sets, boiled wool felts, dye bleeds | W2 | `Soilable.wash.test`, `Garment.wash.test`, drive 5, 7, 8 |
| 5 wet, colder (the wet law), dries, `dry`, shrink | W2 | `Garment.wash.test`, `Wet.test`, drive 9 |
| 6 `analyze` reads the bleeder's type | W2 | `BloodReading.stain.test`, drive 5 |
| 7 lye/soft/hard/glycerin with shipped verbs; a short cure is harsh | W3 | the chain test, drive 6 |
| 8 every § 6 cleanser a row; does what it says, damage where it says | W3 | `CleanserCatalogue.test` enumerates the fourteen; `Soilable.wash.test` per action |
| 9 hard vs soft; soda narrows | W2 | `Soilable.wash.test`, `WaterFixture.hardness.test`, drive 7 |
| 10 linen whitens by day not night; sulfur whitens wool; sun yellows it | W3 | `airing.test`, drive 11 |
| 11 lye eyes until rinsed; fumes build/clear; naphtha ignites | W3 | `caustic-eyes.test`, `fumes.test`, `flammable.limit.test`, drive 10, 11 |
| 12 floors by kind; debris swept and disposed; a shop soils with customers | W1, W4 | traffic test, sweep/dispose tests, drive 4, 12 |
| 13 a grimed window passes measurably less; washed, it returns | W4 | the lux test, drive 12 |
| 14 flue soots; a heavy one catches; a swept one does not | W4 | `Flued.test`, drive 12 |
| 15 rest worse in a filthy bed/room; pests over debris + food, leave with the cause | W4 | rest + pests tests, drive 13 |
| 16 mill dust explodes; damped and swept it does not | W4 | mill-house test, drive 14 |
| 17 the byre fouls; manure raises nitrogen | W4 | stalls + `feed` + `analyze soil`, drive 15 |
| 18 the three tiers each seed what their clean counterpart does not | W5 | the tier tests, drive 16, 17 |
| 19 the laundress quotes, washes at her band, refused off shift, pays for ruin, a player holds the seat | W6 | `OrderController.wash.test`, drive 18 |
| 20 the doorman refuses with a reason, admits when dressed; another way in | W6 | `KeptDoor.test`, drive 20 |
| 21 the Washer | — | **cut by the user, 2026-10-17** → `washer-at-the-ford-slate` |
| 22 a `clean` contract pays | W4 | contract test, drive 22 |
| 23 a new kind/cleanser by a pack with no code; a second lavoir/bathhouse is rows | W0, W1 (mining's `dust`), W6 | catalogue test over a test-pack row; the venues are rows over shipped classes |
| 24 the drive end to end including the restart | W7 | the wire file's record below |

---

## Test & gate strategy

- **Unit** — every mixin method and every host override above; the
  deposit/no-clock invariant; the catalogues' malformed-row path; the
  persistence round trips (a singleton venue, the fixture slice); the
  soap chain in one harness; the flash limit; the airing integral by day
  and night; the tiers' truth table; the laundress's prompt flow
  (`promptConfirm` declined keeps the coin); the doorman's three answers;
  the `clean` contract's refusal when it already holds.
- **Byte-identity tests** (the generalisations): Timber's seasoning prose;
  every shipped maturation profile's off-gas; every shipped recipe with
  no `soils`; `Wearable.getClo` untouched (the wet law is a sibling's).
- **Only the drive proves**: the binder reaching floors and windows by
  keyword, the water temperature at a real basin fed by a real copper,
  the hardness arriving through a conduit, a door opened clearing the
  fumes, the restart.
- **Gates**: `pnpm -C packages/server lint:family` after every wave; the
  touched packs' own vitest; `pnpm test:near`. **`pnpm test` runs twice:
  before the MR opens and at `/finalize`** — never between (size is not
  the trigger; the moment is). A green run stays valid until a source
  file changes.
- **Hotspots to merge by hand when a sibling lands first** — the full
  per-file table is § Parallel builds: `OrderController.ts`, `Tariff.ts`,
  `PricedOffer.ts`, `CraftingLogic.ts` (`craftImpl`'s stamp site,
  `contaminateTools`; repair's `callHouse`/`fulfillingHand`; storage's
  template-choice helper), `SurveyController.ts`, `Garment.ts`, `Chair.ts`,
  `Lamp.ts`, `Timber.ts`, `Attired.ts` (`exposeToRain` / `immerse` /
  `doff`), `Wearable.ts`, `Floor.ts` (rubber's onGrade/snow; storage's
  `bears`/`supportIsSlotted`), `GroundKind.ts`, `Material.ts` fieldMeta
  (rubber's three fields, storage's two methods, repair W7's three, this
  build's four), `Producing.ts` (rubber's weather window),
  `WatercourseCatalogue.ts`, `FishingController.ts`, `wood/oak.yaml`
  (repair's `laying`, this build's `ashFraction` — ⚠ `wood/ash.yaml` is the
  TREE), general-store `counter.yaml`, `market/square.yaml`,
  `wharfside/bank.yaml`, `hinkley-hills/lots/kitchen.yaml`,
  `quarry-hill.yaml` (the `toZ` order), the field-meta golden and the
  wiki-spoiler `.snap` (regenerate), `pnpm-lock.yaml` (`pnpm install`,
  never by hand), `Mixins`/`MixinApi`, `check-closed-vocabularies.ts`.
  Not hotspots after all: `Receptacle.ts` (no edit here), the infirmary
  `tariff.yaml` (no edit here), `hearthworks/idea/business.yaml`
  (storage's; this build touches only `cookhouse.yaml`).

---

## Risks & opens

### Requirements discrepancies — RESOLVED with the user, 2026-10-17

All twelve are settled; the requirements doc was amended to match
(commit after `4f6650636`). The user's calls: **6** the house pays its
**posted cover** (appraisal deferred); **12** a **wool jumper**, not silk —
⭐ the user called silk *"another RGO we didn't think about"*, so it is a
missing raw-goods chain, not a missing row (no slate yet; see Deferred
seams); **4** the byre's stall accrual is **allowed** as the one named
exception, now written into § 1; **2** both dusts (decided earlier).
Risk 6 (grime on rubber's glass faces) — **deferred**, as the plan
proposes. Items 1, 3, 5, 7, 8, 10 are reworded in the requirements as the
fixes below propose; 9 and 11 stand as the plan describes. The list is
kept as the record.


1. **§ 6 names the wrong verbs.** *"water `strain`ed through wood ash"*
   and *"fat `boil`ed with lye"* — `strain` is hospitality's cocktail
   strain (a verb collision) and `boil` mints nothing on any host. AC 7
   ("with shipped verbs") is met by D24 (lye and soap by maturation in a
   hopper and a kettle: `put`, `pour`, `stoke`, `add`, `get`). **Fix:**
   reword § 6 to *water left to drip through ash in a hopper; fat and lye
   kept at the boil in a kettle.*
2. **§ 11 / drive 14 say "the wharfside mill … flour".** The wharfside
   mill is a textile mill; flour is milled at Hearts' Delight, outdoors.
   The user decided BOTH (flour dust at a new enclosed mill house at the
   Delight millsite; flax dust at the wharfside scutching board). **Fix:**
   drive step 14 runs at the Hearts' Delight mill house; § 11 names both
   dusts.
3. **Drive 15 reads nitrogen with `survey`.** `survey` is the holding
   verb; readings are the instrument's (`instrumentation.md`). The plan
   adds the nitrogen line to `analyze soil`. **Fix:** drive 15 says
   `analyze soil`.
4. **§ 1 vs § 11 — the byre.** *"Nothing soils in the absence of an act"*
   and *"stalls foul with every animal-day kept"* conflict; D20 keeps the
   accrual under doctrine § 3a's continuous-local-process exception and
   declares it on the row. **Fix:** § 1 should name the one exception.
5. **"The Goodkin bank (wharfside)… back office."** The bank is in
   counting-houses; its back room is the Circle parlor, through the
   hall's archway. **Fix:** the words.
6. **§ 14 "the house pays you its value."** No appraisal mechanism exists
   in the engine. D26 pays the tariff's **posted cover** (`prices.cover`).
   **Fix:** say *the house's posted cover*, or accept an appraisal seam
   as a later build.
7. **§ 7 "the river says which."** Terminus has no soft river in reach;
   the soft water is the Cold Fell main (every tap, the lavoir's
   trough). D12 makes hardness travel so the WATER says which, wherever
   drawn. **Fix:** *the water's own read says which — a river, a trough,
   a tap.*
8. **§ 10 "every customer who walks into a shop soils its floor."** Only
   with dirt on their feet; a dry paved town yields clean customers
   (D15 deposits what is on the feet). **Fix:** *every customer brings in
   what is on their feet.*
9. **§ 10 "a rug is taken out and beaten."** No rug exists; the plan adds
   one row and `beat` (small, in W4). Flagging it as content the
   requirements assumed.
10. **§ What exists — three stale facts:** lard has no row (tallow and
    olive oil are the fats), buttermilk EXISTS (dairy merged), dye does
    NOT fade with sun today (D21 makes it so). No action beyond the
    table.
11. **§ 4 `dry` "exists for food, hides and turf"** — it is trade-cooking's
    pack verb; the plan moves it to the platform (engineering; noted
    because it touches a pack's manifest).
12. **Drive 18 "a silk she ruins"** — no silk material row exists. The
    drive ruins a **wool jumper** (boiled by a novice laundress) unless
    the user wants a silk row added (one material + one garment row).

### Risks

1. **The maturation blend match (D24.2).** `Maturing` matches
   `inputCategory` on the slot's material tags; a tallow + lye pour may be
   a generic blend. The build reads `Maturing.ts:489` first; the fallback
   (the kettle's own profile seam reading constituents) is named and
   needs no kernel change. If constituents are not kept on the blend
   either, the honest step is a `fat`-tagged blend base — report rather
   than invent.
2. **Fixture-state persistence (D31b)** is new kernel capture work on
   the spine; the round-trip test is the gate, and `captureHostOf` must
   learn to walk a fixture to its host.
3. **`dry` moving to the platform** removes a view from `trade-cooking`'s
   installed set — check `pack.yaml` and `lint:reachability` for the
   rack rows; `lint:verb-collisions` will say if two `dry` views exist
   for one commit.
4. **The flash limit as a particulate fiction** — 1 % by "volume share"
   is a chosen number; the drive calibrates it so ten grinds without
   sweeping reach it and two do not. Written into `cleanliness.md` as a
   fidelity limit.
5. **The over-washed-skin wound** rides the `graze` behaviour; if no
   bleed-free surface trauma exists, use `abrasion` or report — do not
   mint a trauma type.
6. **Rubber's construction glass faces** take no grime this build (D19):
   rubber has one figure per face but no method and this build adds no
   per-place grime state. Named in Deferred seams with the attach point
   (`Face.transmittance()`); the user may prefer a per-place number now
   (a field on `AtmosphericMixin` — this plan declines it).
7. **The remark brain and the doorman read keywords/forms** — "dressed
   for the room" has no station tag (textiles.md: purpose emerges). A
   realm authors the criterion as garment keywords; coarse but honest and
   grain.
8. **Two new service kinds and one new contract template** touch two
   declared closed vocabularies — the ceiling is unaffected but the
   `lint:closed-vocabularies` census file must be re-read, not assumed.
9. **`SeasoningMixin` prose hook** — a small refactor of a shipped
   mixin; Timber byte-identity by test.
10. **The nurses brain boiling bandages** adds a `forceCommand` branch;
    if it fights the triage cadence, drop it — the player drives step 16.
11. **Merge order.** The four builds run in parallel and land in an
    order nobody can promise; each shared piece has a fallback for either
    order (§ Parallel builds); the build agent runs the per-wave re-check
    list there before W0, W2, W3, W4, W6.
12. **Three rubber rewirings this build only READS, and which could move
    its baselines** (asked of rubber, § Parallel builds): (a) `onGrade`
    → `exposure().onGrade` may re-floor a structure's ground storey and
    every ship cabin from boards to earth, which changes
    `cleaningMethod` and `soilFeetOf` (pin the drive floors' kinds);
    (b) whether an AUTHORED `ambientSource: sky` rung is multiplied by
    `skyLightFraction()` — 19 window-lit interiors incl. the Hinkley
    kitchen, cookhouse and byre would go dark and drive steps 12, 16, 17
    lose their light; (c) whether an open-sided roofed place
    (`wallsNone`) ventilates as outside — else the lavoir holds gas like
    a shut room (the urine tub is kept out of it until confirmed).
13. **Stretch vs shrink.** Rubber's D16 (`fitOn` allowance from
    `elasticity`) would let a shrunk jumper still fit; this build shrinks
    felted wool by 0.85 and asks rubber to read the `felted` form as
    non-stretching. If neither lands, drive 8's fit consequence is weak
    and the plan says so in the record.
14. **The soil factor on a `Chair` after repair's structural factor** —
    two multipliers compose; the order (Soilable outermost) is asserted
    by a test with a failed cushion AND a filthy seat.
15. **Dirty wire worlds**: repair's drive buys out the general store's
    billhook, this one its soap and brushes — if the dirty files share a
    boot, each re-stocks (`untilRestocked`); verify isolation first.

---

## Deferred seams

Each leaves as a slate line, never a plan section.

- **The Washer at the Ford and the dying index** → `docs/slates/tails/washer-at-the-ford-slate.md`
  (cut by the user, 2026-10-17; the slate exists). The attach point
  is the dialogue-effect registry (`BankCounter.onCreate`'s shape) and a
  maintained index at `beginDying`/`stabilize`/`expireDying`.
- **Grime on a construction glass face** (rubber's hothouse roof) →
  `glass-slate`: the attach point is rubber's `Face.transmittance()` /
  `Exposure.faceTransmittance(face)` (asked of rubber — today its two
  readers each read the cached figure); a face then multiplies by a
  per-place soot term the way a `Window` does; no per-place field until
  then. The stove house (a sooty stove under glass; a grimed roof → less
  solar gain → a colder house → the latex tap closes) is the first
  consumer. ⭐ Beside it: repair W7 weathers a *glazing layer* (putty)
  while this build grimes a *Window object* — different objects until a
  Window is a face of `Exposure`; note both in glass-slate.
- **The house mends it** — a laundress-rotted garment is `wear`-damaged,
  so the tailor's mend (repair's band table) is the second remedy beside
  the cash cover → `retail`/`contract` slates with the appraisal line.
- **Wind on the drying line, pests in a store, sawdust strewn on ice for
  footing** — `windEnters()` is consumed once rubber lands (D11); storage's
  `StoreConditions` reads `Floor.hasPests()` when the granary arrives
  (storage-slate names it); strewn sand on a sheet clears at thaw (storage's
  `clearSurface` hook) — all later.
- **A flue on the forge and the kiln; a building's shared stack; air
  mixing between rooms** → `structures-slate`.
- **Dirt from the calendar** (road dust, damp, mildew) →
  `stewardship-doctrine.md § 3a`'s legible-local-process rule; the
  byre's stalls are the one instance and the shape to copy.
- **Stale urine's collection** (who fills the tub) → `sanitation-slate`.
- **An appraisal of a garment's value** (the laundress pays a cover,
  not a value) → `retail`/`contract` slates (an `appraise` reading).
- **Silk** → ⭐ a raw-goods chain nobody has designed (sericulture: mulberry,
  the worm, reeling, throwing) — the user's call, 2026-10-17; no slate yet.
  **Cotton** → `textiles` content. The laundress's ruin case uses wool.
- **Seznick's and the dorm's windows as objects** → content, one row
  each over `Window`, when those homes want the drive's light step.
- **Washing soda and potash as a trade's product** beyond the one
  evaporative row → `trade-fuel` content; glycerin's products →
  `cosmetics-slate`.
- **Clean-home-is-immunity** → `disease-slate`; **eyes as anatomy** →
  `physiology-slate`; **the sterile field** → `surgery-specialty-slate`;
  **chlorine, detergent, the machine** → `laundry-slate` / `inquiry-slate`.
- **Hiring a cleaner onto your own premises** → `standing-instructions-slate`
  (player-hires-player ships through the `clean` contract).
- **The `props`-only half of `Staged`** (repair's finding) — unchanged
  here; no NPC in this build is born holding kit.

---

## Critical files

Read first, in this order.

0. **Re-ground the siblings before W0** (and again before W2, W3, W4,
   W6) with the probes in § Parallel builds › *Re-check before each wave*;
   `git show origin/reqs/<x>:docs/plans/<x>-plan.md` for whichever has
   not landed. Record the state in § Grounding.
1. `docs/requirements/cleanliness-requirements.md` (at `4f6650636`+).
2. `docs/subsystems/textiles.md § The soiling seam`, `spoilage.md § The
   silent population`, `persistence.md § captureHostOf` and `§ The
   keyed-holder ground pattern`, `maturation.md`, `mould.md`, `fire.md`,
   `ground.md`, `furnishing.md § Deliberately not here`, `retail.md § The
   priced SERVICE`, `employment.md`, `contract.md`, `instrumentation.md`,
   `behavior.md`, `docs/stewardship-doctrine.md § 3, § 3a`,
   `docs/antipatterns.md` (the reader rule, Mixin on the wrong host).
3. `S/lib/vitals/Hygiene.ts`, `S/lib/slot/Attired.ts:120–140, 575–620`,
   `S/platform/idea/cmd/crafting/WashController.ts`, `wash.yaml`,
   `S/lib/craft/Serviceable.ts:30–56`, `S/lib/material/Contaminable.ts`.
4. `S/platform/location/{Location,PersistentLocation}.ts` headers,
   `S/api/stuff.ts:800–836`, `S/lib/persistence/Persistable.ts` header,
   `S/lib/boundary/Adornable.ts:140–235`, `S/lib/ground/Floor.ts`,
   `S/lib/stuff/Place.ts:365–430`.
5. `S/platform/idea/JointCatalogue.ts` (the catalogue shape),
   `scripts/check-template-scans.ts:58–95`, `scripts/check-closed-vocabularies.ts`.
6. `S/lib/maturation/{MaturationProfile,Maturing,Seasoning}.ts`,
   `S/lib/mould/Mould.ts`, `C/trade-dairying/src/thing/{SettingPan,Wheel,Hoop}.ts`,
   `C/trade-chandlery/src/**`, `C/trade-textiles/src/thing/BleachingGreen.ts`.
7. `S/platform/idea/api/FireLogic.ts:500–640`, `S/lib/fire/Burner.ts:895–1000`,
   `S/platform/thing/{Hearth,Oven,Campfire,Lamp,Window}.ts` (`Lantern.ts`
   until repair deletes it),
   `S/platform/idea/modalities/VisionModality.ts:339–450`.
8. `S/platform/idea/api/CraftingLogic.ts:300–420, 955–1130, 3130–3170`,
   `S/lib/craft/Recipe.ts`, `S/lib/vitals/Vitals.ts:314–330, 3175–3215`,
   `C/trade-medicine/src/idea/cmd/medical/OperateController.ts`,
   `C/trade-medicine/src/behavior/nurses.ts`.
9. `S/platform/idea/cmd/retail/OrderController.ts`, `S/platform/thing/Tariff.ts`,
   `S/lib/commerce/PricedOffer.ts`, `S/lib/employment/{Employed,Condition,Position}.ts`,
   `S/platform/idea/api/{BankingLogic,ContractLogic,EmploymentLogic}.ts`,
   `S/lib/banking/LedgerEntry.ts`.
10. `S/lib/spatial/Mobile.ts:880–1040`, `S/lib/boundary/Exitable.ts:190–205`,
    `S/platform/idea/AshoreExit.ts`, `S/lib/behavior/{greets,enforces}.ts`.
11. `S/lib/wetness/Wet.ts`, `C/trade-cooking/src/idea/cmd/crafting/DryController.ts`,
    `S/lib/location/WaterSource.ts`, `C/water/src/idea/WatercourseCatalogue.ts:1430–1530`,
    `S/platform/thing/WaterFixture.ts`.
12. Content: `C/terminus/content/world/terminus/{wharfside/bank.yaml,
    wharfside/chandlery/**, counting-houses/{banking-hall,circle-parlor}.yaml,
    infirmary/ward.yaml, general-store/counter.yaml, market/square.yaml}`,
    `C/hearthworks/…/location/cookhouse.yaml`, `C/hearts-delight/…/{dairy/location/byre.yaml,
    location/millsite.yaml}`, `C/hinkley-hills/…/lots/{kitchen,yard}.yaml`,
    `C/rejection/…/thing/hut-window-west.yaml` (the Window row shape),
    `C/saxonberg-lounge/content/world/lounge/idea/business.yaml` (the
    hospitality house shape).
13. `packages/wire/tests/assembly.dirty.wire.test.ts:600–700` (the restart),
    `packages/wire/src/runner/boot.ts`, `packages/wire/src/harness/{session,world}.ts`.

---

## Build decisions (made by the build, not the plan)

- **B1 — The hand and part soil methods are `AttiredMixin`'s, not
  `Creature`'s** (`handSites`, `footSites`, `handCleanliness`,
  `soilHands`, `soilBodyPart`, `washHands`, `soilFrom`, `trunkSite`). The
  wearer owns the covering stack the soiling seam walks, and every caller
  narrows with the shipped `MixinApi.isAttired` — a method on the
  `Creature` class would have needed an `instanceof` or a cast at every
  reader. *Nearest pattern: `outermostAt` already lives there.*
- **B2 — `ServiceableMixin.soil()` → `markUsed()`.** It is the *used* bit
  and CraftVessel composes both; `soil(kind, amount)` would have shadowed
  it silently (seven tests caught the glass pool never marking a glass).
- **B3 — `DirtKind.waterLifts`** (a row field the plan's table lacked):
  what water alone takes per standard wash (mud 0.7, grease 0.05) — the
  rate D7's rinse and a cleanser-less wash need. `Cleanser.ambient` marks
  `sunlight`/`sulfur-fume`. Fuller's earth and chalk are two rows (15, not
  14).
- **B4 — A body with no hands resolved takes a hand act on the whole body**
  (`''`), and reads its worst site — a bare `new Creature()` in a test,
  a cow. One honest fallback, no guard.
- **B5 — The three new closed lists (`CLEANSER_ACTIONS`, `DIRT_FORMS`,
  `SOIL_WHERES`) are not in `CLOSED_BY_DESIGN`**: the census does not
  detect them (their refusals are returned strings, or a throw it does not
  pair), and the lint refuses a declaration it cannot see. Each one's
  closure is argued at its declaration instead.

- **B6 — No crumbs at plating** (`PlateController` untouched): eating is the
  act that drops them, so the one debris producer is `eat`.
- **B7 — A worked act's dirt is the subject's `WorkResult.soils`**, landed
  by `WorkedActController.land` — quarry earth muds hands and feet, rock
  and a split block dust the hands, a hive or a wheel leaves none. The verb
  lands it and never decides it (mixin authoritative).
- **B8 — The wash chemistry is `Soilable.washSite(spec, site)`**, not
  `wash(spec)`: `ServiceableMixin.wash()` is the shipped no-arg service wash
  (tip the dregs) on every CraftVessel, and the two must not shadow each
  other. The verb calls both where both apply.
- **B9 — The rack class moved with `dry`;** the WIND term on a line waits
  for rubber (`windEnters()`): reading the biome from `Wet` closed an import
  cycle that left `WetMixin` undefined where `Thing` composes it.
- **B10 — Hardness reaches a tap through its main** (`SupplyServing.
  readWaterHardnessDgh`, the Conduit reads its reach) pulled into the tap's
  payload at `settle()` (`Bulkable.settleBulk` hook). A tap that is its own
  source may author `hardnessDgh`. Unknown water washes as 8 °dH.
- **B11 — Five Material fields, not four:** `vapourMaterial` names the gas
  a volatile liquid's vapour is (naphtha → naphtha-vapour).
- **B12 — Cleansers are spent by use**: a bar's MASS by the row's kg per
  wash (a bar worn to nothing is gone), a flask's litres.
- **B13 — The lye splash is deterministic, not a draw.** Drawing a caustic
  off the tall hopper bare-handed splashes the face (`Hopper.
  afterPouredOutBy`, the new `Bulkable` hook the pour verb calls); gloves
  are the careful hand. `uncertainty.md` bans rolling what an action DID,
  which is what the plan's "epistemic draw on the act" would have been.
- **B14 — Over-washed skin is deferred** (Risk 5's own instruction): no
  bleed-free surface trauma exists and minting one is out of scope. The
  Cleanser rows' `skinHarshness` stays authored as the seam; AC 11 does not
  name it.
- **B15 — The soap kettle owns its chemistry** (`classifyForeignPour` /
  `applyForeignPour` overrides) rather than a profile for fat and one for
  soft soap: those would make every cask of tallow and jar of soft soap
  "active" forever. Only `saponification` (on `soap-paste`, a tag nothing
  else carries) and `lye-leach` are profile rows.
- **B16 — Naphtha is sold, not yet distilled**: its material and a flask
  at the general store ship; the coal-tar `FractionSchedule` row is
  deferred (the solvent's chemistry and its flash are what AC 11 asks).
  Its vapour enters the room on a pour into an open vessel and when it is
  spent in a wash.
- **B17 — Airing settles at `look`** (`Soilable.reconcileAiring`, awaited
  by the look verb; a garment's override walks daylight in 2-hour steps
  with `CelestialApi.isDayAt`). Only a garment lying in a ROOM airs —
  worn or carried, it is not hung out.

- **B18 — A sky room's daylight comes through a pane IN the room.** D19
  put a two-sided `Window` between the Hinkley kitchen and yard, but both
  are minted per lot, so `attachedHosts` (template paths) cannot name
  them. Instead `AmbientLit.openingTransmissivity()` finds the Window among
  a `'sky'` room's contents whose keyword is its `ambientOpening`, and the
  vision walk multiplies the sky leg by it: grime and shutters darken the
  room, and a home kitchen gets one as a plain prop. *Lens 2: every house
  minted from the archetype carries it with no wiring.* The drive's step 12
  runs at the Hearthworks cookhouse (a persistent singleton with a hearth
  and the same window row); the Seznick room and the dorm stay prose.
- **B19 — The scrub refusal is the floor's** (`Soilable.washRefusal()`,
  a returned string, `null` by default): an earth floor answers *water
  only makes mud — it wants strewing and sweeping*; a floor that takes no
  soil has nothing to wash. `wash`/`scrub` render it.
- **B20 — `job post clean <place>` / `clean <thing> at <place>`.** A
  place means its floor (`soilBand() === 'clean'`); a thing found at the
  place means that thing (a Flued host: soot under a fifth of the catch);
  a marked thing binds by chattel. Post refuses a subject already clean
  (the shipped *already holds* rule). A pointed-at floor means its room.
- **B21 — Pests add `cleanliness.pests.ratePerHour` (0.1/h)** to an open
  food's growth while the floor has them, beside light-strike; only food
  lying loose in a room is reached.
- **B22 — Raw is `presentable`.** A thing clean to look at but never
  washed or heated since it was last touched reads `presentable`, not
  `clean`: nobody has MADE it clean. So the shipped bandages dress at 0.3
  until boiled or washed — the gap the drive's step 16 shows.
- **B23 — An instrument outside surgery wants `disinfected`** (the suture
  needle); surgery wants `sterile`. The plan read the instrument only for
  surgery; a suture kit is an instrument too, so `SutureKit` composes
  Soilable + Contaminable like the surgical kit. Surgery seeds whatever the
  wound's type — the knife opens it.
- **B24 — The kitchen tier inoculates the inputs before the kill.**
  `contaminateFromKit` became `inoculateInputs` (bench path) and a
  `kitInoculum` term into `buildMicrobialLoad` (by-hand path): each
  Soilable tool short of sanitised, and the maker's dirty hands, put
  `staph-aureus` on the FOOD (perishable inputs only — a dirty hand on gin
  is a dirty bottle), so a stew boiled long enough is safe and a salad cut
  on a dirty board is not.
- **B25 — `boil` takes `in <pot>`** (a declared `[capability.pot]`
  default) for a cloth or tool; `heat` holds a Soilable `Tool` in the flame
  for 60 s. Both stamp `recordHeat` and run `Contamination.killOver`.
- **B26 — `indemnify` takes the house's path** (`{houseAccountId,
  housePath, payeeKey, amount, memo}`) and returns a reason rather than
  throwing: `self-dealing` when the payee holds any seat at that house
  (`EmploymentApi.employeesOf`, which covers the hand), `house-short`,
  `no-account` (a cash customer is told the house owes them — the coin
  payout from the till is not built), `nothing-owed`.
- **B27 — The band chooses the METHOD, never the outcome**
  (`WashPolicy`): untrained boils and reaches for lye, novice boils with
  soap (the old way — the drive's "low-band laundress boils it"),
  competent reads the fibre (wool lukewarm, blood cold, linen hot),
  proficient+ never reaches the shrink line. The chemistry on the garment
  decides what that does.
- **B28 — The house's soap is not spent by a paid wash** (the bar on the
  lavoir's shelf stays whole); `spendCleansers` is the wash verb's, and a
  paid arm spending the house's stock is the par loop's job — deferred
  with the par lines (no `restocks` brain was authored on Bet or Nell).
- **B29 — `exchangeWithWater`**: hot water puts a tenth of `h·A·ΔT·dt`
  into the body's heat load; cold water pulls the effective ambient to
  the water until the next re-stamp and reconciles — the shipped fold
  chills the core. Storage's own law replaces this at its merge.
- **B30 — The copper is a `WaterFixture` over its own fire** (`Copper`:
  `copperLit`, `heatsToK` 330): its water is hot while lit. The fire's
  fuel is the house's abstraction (it still costs the house a wage). A
  `heat copper` model would have needed a placement-at-boot the props
  grammar does not have (`onto:` is a stale docstring, not a key).
- **B31 — The doorman decides he is on duty** (`judge(host, mover,
  config, door)` reads `door.getKeptBy()` and `isOnShiftFor`), not the
  exit: the seat is HIS rule, and it gives `keptBy` a reader outside the
  class (the seam census). No `conditional:` on the kind rows — the
  orphan scan cannot see Exit's own fields through its lib import.
- **B32 — The lavoir is outdoors** (`_biomePath` outdoor): it is open on
  three sides; the laundry and the bathhouse rooms are sky-lit interiors
  through a named doorway/windows (on `SKYLIT_INTERIORS`). The kind row is
  `/platform/idea/exits/kept-door` (beside `ashore`), and the Goodkin arch
  is its own row `counting-houses/exits/parlor-arch` naming the house.
- **B33 — The fisher remarks on a coat; the pilot does not** (she has no
  behaviours to add a line to). The washerwoman is an `Extra` answering to
  the laundry (`institution:`), per `lint:identity`.
- **B34 — The opening IS the pane.** The three kitchens' prose `window`
  detail is gone (it made `wash window` ambiguous against the real pane);
  `lint:light-sources` accepts a Window prop whose keywords carry the
  opening's word as the thing you can look at.

- **B35 — A strew's capture rides behind the reply.** `strew` kept the
  floor by awaiting `captureHostOf`; behind a busy world that wait was the
  whole command. The capture is fire-and-forget.
- **B36 — The mill house is 4 m a side** (`extent: 4`, the creamery
  floor's precedent). A room takes its zone's cell unless it says
  otherwise, and a stones' house is not a 20 m cell — lens 1: the flash
  must be derivable from the room you stand in.

- **B37 — Skin holds no set stain** (`Soilable.holdsSetStains()`, default
  true; `Creature` false). Setting is the fibre's — protein bound into a
  weave — and a hot bath washes bloodied hands. One override today; the
  hook is where a glazed board or a waxed apron would say the same.
- **B38 — `captureHostOf` captures keyless** (kernel fix, regression
  test): a re-capture reuses the stash inside `capture`, so a derived key
  never becomes explicit.

- **B39 — Only an unnamed target strips** (`UnequipController`): a word
  that names nothing you have on is refused (*You aren't wearing coat*),
  the manner-word refusal's sibling.

- **B40 — The grate chokes, and ash is the hearth owner's** (review, the
  ash lens pass). A deep ash bed multiplies the draught down (a share of the
  burner's own capacity, `fire.ash.choke*`) and the look says so — lens 3a:
  hearths need tending, so the sim must make them. Raked ash is minted
  *made from* the hearth, so the shipped fresh-title rule gives it to the
  hearth's title-holder (lens 4/7: no new rule — the taking case). Hearth
  ash got its own row (`wood-ash`); the old row's prose was a failed
  clamp's. Big ash, quality, the potash works → `potash-slate`.

- **B41 — A bath at home** (review). The bathroom tub's "brass tap" was
  prose with nothing behind it (lens 3a); it is a real cold `WaterFixture`
  prop now (`bath-tap`). Hot water stays a COPPER's, placed per house in
  rows — the generic archetype is tier-agnostic by its own rule — and the
  Hinkley Hills houses get one (`lots/bathroom`). Lens 5: the tap, the
  copper and a later boiler all answer `fill tub from …`. Not a third bulk
  slot on the tub: the slot vocabulary is closed (`interior | surface`).

- **B42 — `HygieneMixin`, split out of `AttiredMixin`** (review:
  *"Attired has a buncha stuff about washing hands"*; supersedes B1's
  host). `lib/cleanliness/Hygiene.ts` holds `handCleanliness`,
  `washHands`, `soilHands`, `soilBodyPart`, `soilFrom`, `bathe`, `doff`'s
  transfer and `immerse`'s rinse (an override over Attired's soak — the
  storage contract's `immerse` stays on Attired). Attired keeps the
  covering stack and the body-site reads (`handSites`, `trunkSite`…), which
  the doorman's dress code reads too. Composed OUTERMOST on `Creature`;
  callers narrow with `MixinApi.isHygienic`. The test was the import list:
  Attired no longer imports the cleanliness module's types.

- **B43 — The keeping verbs are the instruments', not `Location`'s**
  (review). W4 hung `sweep`/`strew`/`dispose` on the base `Location`, so
  every place in the world conferred them. `crafting.md` § *Split by what
  performs the act*: `SweepingTool` (broom, flue brush — `sweep`/`muck`),
  `Litter` (rushes — `strew`), `Heap` (sweepings, muck — `dispose`), each
  `environment` to whoever holds it. `dispose` is the HEAP's, not the
  midden's: holding a heap you can always try, and the refusal names what
  lifts it (three rooms have a midden). Raking a grate wants a broom or a
  brush in hand now.

- **B44 — An external bleed stains** (review: *"I never considered
  garments getting soiled from blood loss"*). Every act names its deposit,
  and a bleed's was nowhere. `bleedOut` routes the laceration, puncture,
  avulsion and foreign-body drains: the innermost layer over the wound (the
  skin when bare), the bleeder's own blood on the stain, a heavy bleed
  drips on the floor; a rupture bleeds inward and stains nothing. Laundry,
  the dress code and `analyze` read it with no further code. Dressings that
  stay on and are changed → `dressings-slate` (the medic vertical's).

- **B45 — Controllers are input and output** (review: *"I don't like
  controllers doing things that the stuff items they operate on should be
  doing themselves"*). This build's own verbs moved their acts onto the
  objects, each returning an outcome the verb words: `Metabolic.eat`,
  `Floor.strewWith`, `Floor.sweepInto`, `Flued.sweepChimney`,
  `Burner.rakeGrate`, `Midden.takeRefuse` (a `Midden` class again — it is
  the receiver, and `peers` there restores bark's `dispose`, which B43's
  heap-only affordance dropped), `Soilable.holdAtHeat` (boil = wet heat,
  flame = dry), `CleanserUse.spend` (one owner; a paid bath now spends the
  house's soap — the act's, not B28's wash abstraction). The rest of the
  tree is `controllers-are-io-slate` (132 of 341 controllers mutate).
  ⚠ Corrected in review: the first cut put the acts' internals in
  module functions (findable only by reading the controllers); they are
  methods now — `Bulkable.holdsFood`, `Metabolic.claimUtensil`/
  `leaveCrumbs`, `Vitals.loseBlood` (B44's bleed), the heap mint inlined
  in `Floor.sweepInto` / `Burner.rakeGrate`.

- **B46 — `beat` is `brush`** (review: *"is it ever going to take any
  target that's not a rug?"*). One verb for the loose dirt out of any
  Soilable thing, dry — `Soilable.brushOff(effort)` over a new DirtKind
  field `brushLifts` (crumbs 0.9, ash/flour 0.8, mud 0.5, soot 0.3, manure
  0.2; grease, sweat, milk, blood nothing) — so brush, wash and bleach split
  the dirt by its own nature. Conferred by `SweepingTool` (a new clothes
  brush and carpet beater, `capability: brushing`, stocked at the store;
  a broom does it worse); `beat` is its alias; `Rug` confers nothing now. A
  floor is swept. `boil`'s rework (immersion takes the liquid's heat) and
  the narrow-verb audit → `verb-interfaces-slate`.

- **B47 — Rotten food is refuse, and rots away** (review: *"where does
  litter/trash go in this game?"*). A midden takes rotten food whatever its
  material; food rotten three game days (`freshness.rotAwayAfterS`) lying
  loose in a room is destroyed (deferred — a `look` must not destroy what
  it walks), leaving crumbs on the floor (`Freshness.rottenSince`). Bounds
  what a kept place collects of food. The route trash takes to being gone —
  collection, transformation, the waste trades, abandoned ownership —
  `waste-slate` (the user: the end is just destroying it).

- **B48 — The rest of this build's controller logic moves onto objects**
  (review: complexity on the objects through their mixins and class
  taxonomy; an Api static only when it belongs to no instance; no lib
  statics). `order wash` → `Garment.launderBy` + the tariff's
  `quoteLaundry` / `houseCleansers` / `houseWaterHardness` / `payCover`;
  `order bath` → `Tariff.houseVessel` + `Tub.drawFrom`; `dry`'s wet
  outlook → `Wet.dryingOutlook`; hands and bath spend their own soap; a
  wash of several things in one water → `CraftingApi.wash` (the one piece
  with no owner: items × water × cleansers) — first written as a new
  `CleanlinessApi`, folded into CraftingApi in review: a one-method Api is
  overkill, and washing is repair's upkeep twin (dirt where repair is wear). `DryController`'s
  `prospectFor` (the drying law, moved here from trade-cooking) is left
  for `controllers-are-io-slate` — not this build's to make worse or better.

- **B49 — A tap's dirt is derived, not authored on the species** (review:
  *"soils on species is a little weird"*). The cow, ewe and goat carried
  the identical milking entry — the act's, copied onto each animal.
  `TapSpec.soils` is gone; `Producing.soilTheTaker` derives it: an animal's
  take puts a share of the manure on the floor she stands in on the hands
  (so mucking out the byre keeps the milker clean), a hand-drawn liquid
  splashes the apron as its own kind; a plant's tap dirties nothing.

- **B50 — No catalogues** (review: *"we recently did a refactor over
  catalogs to get rid of full scans and eager loading"*). `CleanserCatalogue`
  answered a REVERSE question (which cleanser is this material? — a tag
  search over every row): flipped — 13 material rows name their cleanser
  (`cleanser:`, `identity:constituent`) and `Material.getCleanser()` reads
  it. `DirtKindCatalogue` warmed every row by class (and `WashController`
  called `allWarmed()` every wash): dirt kinds are a closed platform
  vocabulary now, loaded by path when `soil()` first makes one
  (`Soilable.dirtKind`, a method — `dirtRow`/`dirtRowFor` were module
  functions). Each row reads itself (`descriptor()`). Template-table scans
  42 → 40; both catalogue singletons and rows deleted.

- **B51 — The place taxonomy** (review, the user's decision). Every place
  is a `Place` (root rename from `Location`); a **Locale** is one
  particular place, a **Location** one of many laid out to a plan, either
  `Persistent…`; spherical says so (`SphericalLocale` / `SphericalLocation`).
  This build's `PersistentCartesianLocation` → **`PersistentLocale`**
  (done, 14 rows).
- **B52 — The place rename, by class name** (review; `place-taxonomy-slate`).
  Root `lib/stuff/Location` → `Place` (`isPlace()`); `CartesianLocation` →
  `Location` (the lib geometry root shares the twin's name, the default for
  lib/platform pairs — no `CartesianPlace` coined); `SingletonCartesian
  Location` → `Locale`; `FurnishableRoom` → `PersistentLocation` (it is not
  on the grid — WRONG, corrected by B53: it is a `Location` in its
  holding's frame); `SingletonSphericalLocation` → `SphericalLocale`.
  Scripted over ~690 files, root first so the two `Location`s never meet.
  Hand fixes where the root was named by STRING: the runtime branch-file
  allowlist in `Stuff._registerTopLevelBranch` (tsc cannot see it; a boot
  would have died), `lint:module-scope`, `lint:ground`'s root probe, the
  field-meta golden, Studio's base list. ⏸ The `/…/location/` path segment
  is NOT renamed (~1,100 identity-path references) — the slate's open
  question. Round fixes the full lint family found on the way: the
  `isHygienic` combat allowlist entry, the Hinkley bathroom lot in
  `FURNISHED`, the archetype test's `Midden`, and `Wet.dryingOutlook`'s
  `BiomeApi` import cycle (the read moved to `Atmospheric.dryingConditions`
  — the air is the place's to describe).
- **B53 — Every place has coordinates but the void** (review, the user:
  *"PersistentLocation is most definitely a grid … the only exception
  would be the Void"*). `VoidLocation` → `Void`, the one class on bare
  `Place`; `PersistentLocation`, the dorm `Corridor`, `Lounge`,
  `CircleFloor`, `Tombstone` → `Location`; `Offstage` → `Locale` (its five
  rows author a cell behind their venue). The cells: a minted node takes
  the one beside the neighbour it was wired to
  (`Location.plotBesideNeighbour`, from `OuterWarren.ensureNode`; it
  refuses rather than overwrite, which the grid never checked); a holding
  lays its rooms out in its OWN frame from the floorplan
  (`HoldingWarren.layOut`), because a plat's houses would share the
  street's cells and the generic room rows have no zone — so a door out
  of a holding crosses frames (`Warren.laysOutOwnFrame`, read by
  `Location.addExit`: the dorm's `unit-N`/`out` would otherwise throw).
  The rooms that moved off bare `Place` keep their size their own
  (`sizedByZoneCell()` false) — their light was tuned unsized; authoring
  extents is open. `Tombstone.extent` (a path) → `takenDownExtent`, which
  had collided with `Location`'s metres. Found on the way: the Hearthworks
  cellar and cookhouse both authored (2,0,0) and the grid kept one
  silently — the cellar is under the cookhouse now, (2,0,-1).

## Drive record

*(appended at build time, not at plan time)*

`packages/wire/tests/cleanliness.dirty.wire.test.ts`, `WIRE_BOOT=1
WIRE_PORT=2013`. Runs, and what each found:

- **Run 1 (smoke)** — 3/3: the lavoir off the bank, the bathhouse north of
  the square, the cookhouse window and its survey line.
- **Run 2** (fresh DB) — 3/18. The drive's own mistakes: `clone` refuses a
  row with a live instance on ground the founder holds no title to
  (gloves, sulfur, a flue brush are BOUGHT now). And two real defects:
  - ⚠ **a served dish dropped no crumbs** — `EatController`'s dish path
    (a stew in a bowl) never reached the crumbs; both paths share
    `leaveCrumbs` now;
  - ⚠ **the stalls stamped on first READ** — a fresh world's byre began
    fouling from the first look; `setStalls` starts the clock when the row
    applies it.
- **Run 3** — the doorman refuses in his own words (*"not in that state —
  there's a bathhouse off the market"*). The drive's own mistakes:
  `butcher first carcass` parses `first` as the body (no ordinal in that
  binder) — the drive answers the ambiguity prompt instead; `heat surgical
  kit` is two words for a one-token arg; a fresh avatar wears no shirt.
  Found: the free `analyze atmosphere` names only what is OBVIOUS (8 %),
  and flour flashes at 1 % — honest (*you cannot see a flammable share*),
  so the drive reads it with a trained nose.
- **Runs 4–7** — a sibling's world starved mine once (two 3 GB worlds on
  15 GB) and a fresh-DB boot outlasted the 420 s budget once
  (`WIRE_BOOT_TIMEOUT` raised). Found: ⚠ **`remove apron` with no apron
  on stripped the player bare** — the `manner` arg this build added
  swallowed the word and left no target, which means "everything"; a
  stray manner is a refusal now (+ test). The harness: answer a prompt by
  its KIND (an object prompt answered `yes` resolves to nothing and wedges
  the session), and poll in slices so a stale wait cannot swallow the next
  command's prompt. The requirements' wool jumper did not exist — a row,
  stocked at the store.
- **Run 8 + three diagnostics** — two defects no unit test could see:
  - ⚠ **dirt was invisible in a dim room.** The deposits were all there
    (logged server-side); the soil line was gated on `canMakeOutMarks`,
    the light to read FINE PRINT, and the cookhouse is ~4 lux at noon. Dirt
    is seen wherever the thing is.
  - ⚠⚠ **every engaged completion that called back into its controller
    ran on a dead proxy** — `_executeOne` destructs the clone when
    `execute` returns. So over the wire `wear` never put anything on (the
    nutrition-fitness drive's tolerated "not-worn" finding — this is its
    cause), and this build's sweep, bathe and order-bath completions, and
    the shipped boil, would have done nothing. Fixed by resolving up front
    or calling statics (+ a test that destructs the controller as the
    dispatcher does). ⚠ `equip` of several things still chains through
    `this.dressNext` — the general fix (a census of `this.` inside
    completions, or a dispatcher that keeps an engaged controller alive) is
    left as a finding.
- **Run 10** — drive 1 (the apron takes the blood, not the shirt; the
  hands do) and drive 4 (strewn and swept) PASS. Found: wearing what is
  already worn threw inside the completion (it had never been reachable)
  — refused in words now. Plain cold water takes half the blood off the
  hands and a cold soap wash leaves grease marked: real chemistry, so the
  drive washes with soap and scrubs.
- **Runs 11–17** — found, and fixed:
  - ⚠ **a swept heap was a stack** ("24 heap of sweepingss", a tenth-kilo
    each) — the sweepings and muck rows are `Good`s now, one heap;
  - ⚠ **a paid bath had no hand in the room** — the bathhouse slate and
    Nell stood in the vestibule while the tubs were in the baths; both
    moved to the baths;
  - ⚠ **a wash could hang the session** — its settle and warm wait on a
    world draining a clock jump; both are bounded now and the slow one is
    named in the log;
  - the dead-proxy class got its ratchet (`lint:completion-this`,
    census 8) rather than a ninth hand fix;
  - the drive's own: an hour in the shut cellar's fumes killed the cook
    (drive 11 has its own player); a bare keyword query reads the ROOM
    first, so held things are queried `me:i:[keyword.X]`.
- **Run 18** — smoke, drives 1–5, 7, 11, 12 (both halves), the muck, the
  boil and the heated kit PASS; drive 5's `analyze blood shirt` reads the
  bleeder's type. Found:
  - `strew` and `order wash` waited on a world still draining the last
    clock jump — the drive now settles after every jump, and a strew's
    host capture is fire-and-forget (B35);
  - ⚠ **the mill house never read flour** — it took the zone's 20 m cell,
    8,000 m³; three grinds' ~800 L of dust is a hundredth of a percent in
    that. It authors `extent: 4` (64 m³) now (B36).
- **Run 19** (fresh DB) — 18/22: smoke, drives 1–5, 7, 9, 11, 12, 14 (the
  mill house's flour now reads), 15, 16, 22 (the clean contract posted,
  done and paid) PASS. Found:
  - ⚠ **the drive had answered no prompt in nineteen runs.** Its answerer
    read `promptId` under `payload`; a `PromptEnvelope` carries it at the
    top level. Every earlier pass had dodged a question; `order wash`'s
    confirm waited out the timeout. The answerer reads either shape and
    logs before it gives up;
  - ⚠ **a hot bath SET the blood on the bather's hands** — the copper is
    ~330 K, over blood's 318 K set point, and only a bleach lifts a set
    stain. Skin holds no set stain now (B37);
  - ⚠⚠ **a player who logged out in the cookhouse woke in the lounge.**
    `captureHostOf` passed the stashed key to `capture` as an explicit
    one, so the first soiled floor made the singleton cookhouse a keyed
    holding, and the avatar's placement recorded a `#key` only a warren
    resolves. A kernel defect from the persistence Wave 2, first reached
    by this build's kept places (B38);
  - the record held the set-stain shirt, and the first query after the
    restart came back empty — the drive waits for the inventory now and
    logs how long it took.
- **Run 20** (fresh DB) — 21/22: every step but the restart PASS,
  including drive 18 (Bet names the fibre and price and brings the apron
  back; the bath attendant felts the jumper and the house pays cover) and
  drive 20 (the doorman turns the apron away in words, a bath, a jumper,
  the arch opens). No restore-placement warning after B38. Found, by
  probing the warm world after the run:
  - the restart's shirt was not missing — drive 9 had hung it on the
    cookhouse's drying rack, and the kept place gave it back, one copy,
    still soiled with blood and grease. The drive read the cook's pockets;
    it reads the room now;
  - ⚠ **`remove shirt` with the shirt on the rack stripped the cook
    bare** — a named target that matches nothing reaches the controller
    as a result with no `stuff`, and fell through to the strip. Refused
    in words now (B39);
  - finding, not this build's: a returning player gets a SECOND aether
    implant each login — the restored one lands in the pack, not the
    cranial slot, so `Avatar`'s loadout mints another (`Avatar.ts` loadout
    occupy). Three boots, three implants.
- **Run 21** (fresh DB) — 21/22: the restart PASSES (the stained shirt
  comes back from the kept cookhouse's rack). Drive 2's second `wear
  gloves` was refused — *your hands are busy*: the knife from the
  butchery was still in hand, which is the rule, not a defect. The drive
  puts the knife up first. `lint:reachability`'s naming ratchet caught
  the new jumper printing "wool jumper" without answering to it.
- ⭐ **Run 22** (fresh DB, after the docs-only master merge) — **22/22,
  restart included.** The exit criterion is met.
