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

- ⚠ **Most named venues keep no record.** Only `FurnishableRoom`
  (`S/platform/location/FurnishableRoom.ts` =
  `Persistable(WarrenMember(Reserved(… Location)))`, "venue-generic on
  purpose", **never a singleton, not cartesian — authors no `coords`**)
  and pack-owned Field/Wood/MineRoom/Turbary/OpenWorking compose
  Persistable among Locations. The cookhouse
  (`C/hearthworks/…/location/cookhouse.yaml`, `coords` authored), byre
  (`C/hearts-delight/…/dairy/location/byre.yaml`), both mills, the
  chandlery floor, the general store, the ward, the glazier's hut are
  `SingletonCartesianLocation` or `Street`. `CartesianLocation.ts:19–29`:
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
  fixture (`Location.ensureFloor`, `S/lib/stuff/Location.ts:368–430`,
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
- Byre: `SingletonCartesianLocation`, props 3 pails, water-butt, block,
  knife; the herd is a record (`dairy-book.yaml`, `Herdbook.tally 6`,
  `homeExtent` the **yard**). No manure row; `feed`
  (`S/platform/idea/cmd/bulk/FeedController.ts`) spreads `compost`-tagged
  bulk into soil nitrogen with no code. ⚠ Nothing reports nitrogen
  (`SoilSurveyReading.ts` has no nutrient line; `SurveyController.ts`
  reads archetypes + the holding only, :100–135).
- Homes: Hinkley kitchen (`FurnishableRoom`; `/stuff/thing/fixture/range`
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
  candidates)` module-private in `CraftingLogic`, `presentFulfillers(giver)`
  **with no discipline filter** (`CraftingLogic.ts:312`), quote →
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
  `transmissivity()`. One wet law on `Material` instance methods
  `permeability()` / `wetProperty()` (D12.1, shared with storage D9).
  `Attired.exposeToRain(delta)`. Sulfur `/stuff/idea/material/mineral/sulfur`
  (tags `[sulfur, mineral]`, mp 388, **no burn product**) + the won row.
  Vitriol/quicklime `corrosiveTo` narrow to honest tags; rubber resists.
  `lint:biome-sky`: every new interior authors BOTH keys. Rubber does not
  touch `wash`, hearths, chimneys, the infirmary or the chandlery.
- **Repair** (`origin/reqs/repair`): D12 (above); D14 the tinker is a pack
  `CastMixin(StagedMixin(NPC))` — **`NPC` is not widened**, so an NPC born
  holding kit needs its own pack class; D20 the shell's layer clock stays
  on `HoldingWarren` (an Idea) — two clocks; `survey` reads the residence
  pack duck-typed, W7 adds `fabricReport()` (gated on rubber, may ship as
  a follow-up MR); "condition" means three things already — **this plan
  never uses the word for soiling**. Hotspots: OrderController, Tariff,
  PricedOffer, SurveyController, CraftingLogic, Garment, Receptacle,
  general-store counter, infirmary tariff, the field-meta golden.
- **Storage-and-ice** (`origin/reqs/storage-and-ice`): D9 the wet law (as
  rubber); D10 `SwimmableMixin.immersionOf()` — **Pools only; rivers and
  shores are not Pools**; D11 `Attired.immerse()`; D15 the frozen-water
  refusal in `FishingController.reachFor` (shore `peekWaterRead(key)?.frozen`
  and `room.getFloor().openWaterAreaM2() > 0`, by shape); D18 sawdust =
  material `/stuff/idea/material/wood/sawdust` + `C/trade-carpentry/src/thing/Sawdust.ts`
  (`Poolable(Stackable(Good))`, qty = kg, keywords `sawdust, dust, heap`),
  ONE Stackable lying in the room — **no floor-debris model**; the
  cookhouse business gains an ice par line (merge by hand).

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

Methods (the contract; verbs on the object): `deposit(kind, amount, by,
site='')` (the ONE writer; clears `heat`), `soilAt(site)`,
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
| `key`, `agent` (a **material tag** the cleanser item/bulk carries: `soap`, `lye`, `washing-soda`, `vinegar`, `neutral-spirit`, `naphtha`, `fullers-earth`, `chalk`, `silica`, `sawdust`, `vitriol`, `sour-milk`; `sunlight` and `sulfur-fume` are the two AMBIENT agents read from the room, D21) | how the wash finds it |
| `action: Action` | `surfactant · alkali-mild · alkali-strong · acid-mild · acid-strong · solvent · absorbent · abrasive · oxidiser-slow · oxidiser` |
| `damages: [{fibreTag, effect: felts \| rots \| scratches \| burns \| yellows, aboveK?}]` | lye on `protein` → `rots` (lye destroys wool); sand on `glass` → `scratches`; vitriol on `cellulose` → `burns` |
| `hardWaterPenalty: boolean`, `softens: boolean` | soap scums; soda softens |
| `consumesPerWash` (count or litres) | a bar is spent slowly, lye by the litre |
| `skinHarshness: 0..1` | the clinic hand washed raw (D23) |

`Action` is a **closed kernel vocabulary by design** (ten mechanism words
— a pack adds a cleanser ROW, never a mechanism nobody models), declared in
`check-closed-vocabularies.ts`' `CLOSED_BY_DESIGN` with that reason so the
ceiling does not move. The kernel ships its own rows in the platform pack:
twelve DirtKinds (`blood · grease · mud · sweat · soot · manure · ash ·
flour · milk` as films — `milk` is what the milker's apron takes, a film
water and time remove — plus `crumbs`, `shavings`, `sawdust` as debris
forms) and the fourteen
Cleansers of requirements § 6. A trade adds a stain or a cleanser with one
file.

**D3 — The hosts.** See § Host placement. The short list: `Garment`,
`Creature` (per body part), the `Floor` twin, `Window`, `Chair` (seats and
beds), `Lantern`, `Bandage`, `CraftVessel`, trade-cooking's `KitchenTool`
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
hand site, and `depositOnHands(kind, amount, by)` which lands on the
outermost layer (a glove) or the bare hand — the soiling seam's first
consumer (AC 2, 3). The four readers migrate: `Vitals.applyTreatment`
(`treater.handCleanliness()`; `treater.soil()` → `treater.depositOnHands('blood',
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
there via `maker.depositOnHands` / the maker's `outermostAt('body.torso')`
/ the room's floor. Rows: `render-tallow` (grease, hands + apron),
cooking's stews and roasts (grease, soot), baking (flour, hands + floor),
`melt-wax` (grease). Each per-verb producer is one call at a named site:

| act | site | deposit |
|---|---|---|
| butcher | `ButcherController.ts` after `spillGut` (:476) | `blood` + `grease` on the maker's hands and the torso's outermost layer (the apron); `blood` with the carcass's sample on the block and the floor; the `vessel` arg catching blood stays the spill seam |
| slaughter | `C/trade-ranching/…/SlaughterController.ts` (read it first) | `blood` as above |
| milk / any tap | `Producing.stampTheHand` | reads `handCleanliness()`; the act deposits `manure` on hands (a cow's flank) and `milk` on the apron |
| dig / split | `WorkedActController.land` after `completeWork` (:153) | `mud` on hands, feet, legs |
| hew | `HewController.winOre` (:222) | `dust` (a DirtKind row the mining pack adds — the AC 23 test, done once here) |
| tan | `TanController` put-in (:130) and lift-out (:183) | `grease` + `manure` (the bate) on hands and apron |
| exertion | `Exerting.exert` (:195): `powerW > sustainableW()` for `durationS` | `sweat` on the torso's innermost layer — ⭐ the one deposit that lands on the INNER layer (`coveringAt(part).at(-1)`), by excess watts × seconds. ⛔ Not in `ThermalRegulation`'s heat-stress sweat (ambient, clock-like) |
| combat hit | `CombatLogic.ts:2550` after `inflict`, when `outcome.afflicted && BLEED_FAMILY.has(trauma.type)` | `blood` with the **target's** sample on the target's `outermostAt(site)` and on the attacker's hands/weapon arm; the person key is `getIdentityPath()`, never `resolveInflicter`'s template path |
| walking | `Mobile.crossExit` after the move (:929) — `destination.getFloor()?.receiveTraffic(mover)` then `sourceFloor.soilFeetOf(mover)` | mire / standing water / wet earth → `mud` on the feet and legs' outermost layers; the destination floor takes a fraction of what is on the mover's feet (D15). Shop floors soil with their customers by this alone |
| stoke / tend | `StokeController.ts:120` after `burner.stoke(item)` | `ash` + `soot` on hands |
| fire exhaust | `FireLogic.emitExhaustInto` (:503–528) when incomplete | `soot` onto every Soilable fixture and prop in the room (windows, the floor, a lantern) proportional to smoke kg — D19/D20 |
| mill / scutch | `finishGrind` (:384); textiles' scutching completion | dust into the room's air (D22) + `flour` on hands/apron |
| saw | storage's heap | nothing new: the sawdust heap IS the debris (D16) |
| treating a bleed | `applyTreatment` | `blood` on the treater's hands (D4) |

**D7 — Rain and swimming wet but do not soil** — rubber's
`exposeToRain` and storage's `immerse`, read unchanged. If storage has
not landed when W2 starts, `Attired.immerse()` is built here in D11's
exact shape (`wet(1)` on the body and every layer at every exterior
part) and storage consumes it.

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
`cutToStature/cutToGirth × 0.97` after materialising a stock stamp; `harsh
bleaching rots linen` = `oxidiser` on `cellulose` at full dose → `wear()`
through `Durable`; `launder()` for the dye; **bleed** = the strength
`launder()` removed × `textiles.wash.bleedFraction` applied by `applyDye`
onto every co-washed `Dyed` garment with a lower-fastness source — the
stack already supports it; `wet(1)`), **`CraftVessel.wash`** (the shipped
tipping + `clearContamination`; sanitised/disinfected via D14),
**`Creature.wash`** (sites; `skinHarshness` → D23). `textiles` band gates
nothing and **reads before**: a competent hand is told *wool — it will felt
if boiled* in the begin line (lens 1: resolution, not access).

**D11 — `dry` moves to the platform and takes a wet garment.** The view
and controller move from trade-cooking to
`C/platform/content/platform/cmd/crafting/dry.yaml` +
`S/platform/idea/cmd/crafting/DryController.ts` (the rule: platform keeps
the verbs any trade's instrument confers; the cooking pack's copy is
deleted — `lint:verb-collisions`). The controller branches: `isWaterActive`
→ the shipped rate (unchanged); else `isWet && getWetness() > 0` → place
it on the rack/line (a `Placing` host; `reachable:[class.DryingRack]`
stays the default — a class name, no import) with the shipped exposure
fraction, so the Wet reconcile dries it at the rack's air. A
`/stuff/thing/fixture/clothes-line` row (class
`/trade/cooking/thing/DryingRack`, exposure 1, `on`) for the lavoir's
drying ground and the Hinkley yard; a wet garment also dries worn or
dropped, slower. ⚠ **The Wet far-past guard is narrowed to bodies**: the
4 h drop applies when the host `isHasInteractive` (absence = logout);
a Thing integrates its whole gap at its stamp rate (a shirt left on the
line overnight is dry in the morning). AC 5.

**D12 — Hardness rides the water.** `WaterDraw` gains `hardnessDgh?:
number` (kernel `WaterSource.ts`); the water pack's reach read fills it
from the compiled reach (flow-weighted at joins, the shipped value);
`BulkPayload.hardnessDgh?` is declared by declaration-merge from
`S/lib/cleanliness/Hardness.ts` (the `blood` precedent) and blends
volume-weighted through the shipped payload blend; a `WaterFixture`
`suppliedBy:` a conduit carries its source reach's hardness, so **every
Terminus tap off the Cold Fell main is soft (5 dGH) and the Quay is hard
(12)** — the honest geography, and the drive's contrast with no new
river. `WaterFixture`'s look line gains *"The water is soft/hard"* through
the same `hardnessWords` rule (moved to the kernel as a method on the
`Hardness` value object; the water pack calls it). `Soilable.wash`:
`f_hard = 1 − hardWaterPenalty × clamp((dgh − 6)/12)` for a cleanser with
`hardWaterPenalty`; a `softens` cleanser in the same wash (soda, `using`
twice is two cleansers — the `cleanser` arg is `objects`) sets `dgh = 2`.
`rinse.yaml` gains the shore default `wash` already has (`rinse` at a
river works). AC 9.

**D13 — Frozen water.** `wash`/`bathe` at a shore copy storage's D15 gate
verbatim in `WashController.findWater`: `peekWaterRead(key)?.frozen` and
the room's floor offers no `openWaterAreaM2() > 0` → *"The water is frozen
over; you would need a hole."* If storage has not landed, the gate reads
`frozen` alone (the floor shape is theirs to add).

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
method; the ten kinds decide the cleaning method.** The `Floor` twin
(`S/platform/thing/Floor.ts`) composes `SoilableMixin`; `FloorMixin`
gains `receiveTraffic(mover)` (takes `cleanliness.traffic.trackIn` (0.2)
of the mover's foot-layer loads per crossing), `soilFeetOf(mover)`
(`mire`/standing-water/wet `earth` → `mud` on the feet and legs'
outermost layers), `strewn: {materialPath, kg} | null` (persistent,
runtimeState — fresh rushes or sawdust), `cleaningMethod()` (from
`getGroundKind()`: `earth · loose · mire · beaten-floor` → *strew and
sweep*; `set-paving · slab · rock · plate` → *scrub*; `boards` → *scrub or
sand*; `contrived` → *scrub*), and a third markup augmenter `soilAugmenter`
after snow (*"The boards are greasy and crumbed; a litter of sawdust lies
over a dark stain."*). `scrub` (the wash alias, D10) on a floor removes
film kinds by the kind's method: a `strew`-kind floor refuses *scrub*
in its own words (*"you would only make mud"*) and wants `strew` + `sweep`.
**Debris** is deposits of `form: debris`; a strewn absorbent converts
`absorbedBy` films (blood, grease) into debris at `strew`. **`sweep`**
(new platform verb, category `inventory` — it moves matter)
gathers every debris kind on the floor into ONE `/stuff/thing/sweepings`
Stackable (a plain `StackableMixin(Good)` row with
material `/stuff/idea/material/bulk/sweepings` tagged `[organic, compost,
refuse]`, mass = kg swept, keywords `sweepings, heap, pile`), merging with
a heap already lying there; ⭐ **storage's sawdust heap is the same
heap**: a `Sawdust` stack lying on the floor is swept INTO the sweepings
(the sweepings' `canMergeWith` accepts a `sawdust` material, mass-added;
a `get sawdust` before sweeping keeps it pure for the icehouse). A broom
is the instrument (`/stuff/thing/tools/broom`, `Tool` with `capabilities:
[sweeping]`, declared as the view's `tool` arg — `lint:instrument-args`);
bare hands sweep at a third the rate. **`dispose <heap> [in <midden>]`**
moves refuse into a reachable container that `accepts: refuse` (a
`/stuff/thing/fixture/midden` row, `Container`, `fixedInPlace`, at the
byre yard, the lavoir and the Hinkley yard; the campus midden row re-pointed
to it) — the sweepings rot there as compost and `feed` spreads them; with
no midden in reach it refuses in words. **`strew <material> on floor`**
(`strew.yaml`, `inventory`) lays a carried `granular, absorbent`-tagged
stack (rushes, sawdust) as the floor's `strewn`. **`beat <rug>`** removes
debris from a `Rug` (`/stuff/thing/furnishing/rug`, `Soilable(Good)`,
placed `on` a floor) by time alone. A `/stuff/thing/rushes` stack is sold
at the general store (the honest earth-floor cleanser). AC 12.

**D16 — Rest reads the bed and the room as kept; the archetype reads the
furniture.** `Chair` composes `SoilableMixin`; `PosturedMixin` gains
`restQualityAsKept(): number` = `getRestQuality() × bandFactor(soilBand())`
(`clean 1 · marked 0.95 · soiled 0.8 · filthy 0.6`) — a total method
(`Floor` is Postured too; a filthy floor is a worse place to lie, honest).
`Metabolic.currentRestQuality` and `Vitals`' wound recovery read
`restQualityAsKept()` × the ROOM's factor (`host.getContainer()?.getFloor()`
band). `Archetype`'s `rest` need keeps `getRestQuality()` — a filthy bed is
still a bed. Never a punishment: the floor is 0.6 (AC 15).

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
only (⛔ not `Firebox`: `Campfire` extends it and has no flue; `Forge` and
`Kiln` have stacks of their own and are deferred → structures-slate).
Field `flueSoot` kg (persistent, runtimeState). `consumeFuel` is wrapped
(Flued outermost): `flueSoot += kg × (1 − completeness()) ×
fire.flue.sootFraction` (0.02 — a winter's bad fires, a few hundred
grams). **The chimney fire**: in the same wrap, when `flueSoot ≥
fire.flue.ignitesAtKg` (0.5) and `burnPowerW ≥ 0.7 × maxBurnPowerW`
(a roaring fire draws the flue hot), `catchFlue()`: the soot burns as a
`Combustible` charge — `FireApi.emitExhaust` of the soot mass (smoke
into the room), `depositHeat(soot × heatOfCombustion(soot) × 0.3)` onto
the room's thermal mass and `tryAutoignite` over the room's contents
(the shipped spread), a scene (*"a roar in the chimney, and sparks"*),
`flueSoot = 0`, and `wear()` on the host when it is Durable. **`sweep
<hearth>`** with a brush (`/stuff/thing/tools/flue-brush`, `Tool`,
`capabilities: [flue-brushing]`, declared as the sweep view's tool) →
`flueSoot = 0` and `soot` debris on the floor; without the brush the
same verb rakes the GRATE instead — `Burner.takeAsh()` (D24.1) mints the
hearth's `ash` into your hands — and the scene names the brush as what
the flue would want. A lamp's glass: `Lantern` composes Soilable;
`exhaustTick` incomplete → `deposit('soot')` on itself;
`getEmittedFlux()` × `(1 − 0.5 × bandRank/3)`; `wash lantern` restores it.
AC 14.

**D19 — Grime is a factor inside `Window.transmissivity()`; the one
funnel this build ships is the Window object.** `Window` composes
`SoilableMixin`; `transmissivity()` multiplies by `1 − 0.6 × bandRank/3`
(a filthy pane passes 40 %); the walk's leg (d) reads it with no change
(AC 13). Soot reaches windows through D6's fire-exhaust deposit onto the
room's Soilable fixtures (a `BoundaryAnchor` fixture → its `Window`).
⚠ **Rubber's construction glass faces (a hothouse roof) have no object
and rubber exposes no single face-transmission method** (its D5): this
build does NOT add a per-place grime number to `AtmosphericMixin` (a
field on every scope with air, for the one glass roof in the realm) —
the attach point is named in Deferred seams and the note to rubber's
item 4 is answered there, not in code. Homes: a window that is a prose
detail cannot grime; the drive's home is **Hinkley** and its kitchen gains
a real `Window` row over the counter window (`kitchen ↔ yard`, both
FurnishableRoom; `baseTransmissivity 0.85`, keywords `window, glass`);
the Seznick main room's two tall windows and the dorm's stay prose
(`ambientOpening`) and are listed as content to author later.

**D20 — Stalls foul by the animal-day; the manure is a heap; nitrogen
is read by the instrument.** The byre's floor accrues `manure` by
`herd.tally × days` since the last muck-out — ⭐ **the one calendar accrual
in this build**, allowed by doctrine § 3a (*a continuous physical process
with a legible local cause* — the cows are there) and declared on the
row: the byre authors `stalls: { herdbook: /world/terminus/hearts-delight/dairy/thing/dairy-book }`
(load-on-use: the floor's reconcile follows the authored reference,
never a search); `FloorMixin.reconcileStalls()` runs on read when
`stalls` is set, stamping `stallsStamp`. `muck` is an alias of `sweep`
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
(`CelestialApi.daylightFractionAt` × `BiomeApi.isSkyExposed(scope)` or the
scope's `exposure().skyLightFraction()` once rubber lands) and the
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
sulfur row** (the note's item 2; if rubber has not landed, the row is
created here at rubber's path and rubber adopts it); `stoke brazier with
sulfur` then fumes a shut room. (b) **`MaturationProfile.offGas?:
{material, litresPerLitrePerDay}`** replacing the hardcoded CO₂ in
`Maturing.ts:132–157` (the ferment rows author `carbon-dioxide`; a
census test asserts every shipped profile's gas is byte-identical) —
a `chemical` profile `urine → stale-urine` (tags `[liquid, ammonia-source]`)
off-gases `ammonia`; its source is the laundress's piss-tub
(`/world/terminus/wharfside/lavoir/thing/urine-tub`, a `Vat` row seeded
with 20 L of `urine`; refilling it is sanitation-slate's). (c)
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
(`PersistentCartesianLocation`, `enclosure:` + `roof:` authored, props the
grist-mill + toll-bin, exits to/from the millsite, the miller's station
moves). AC 16.

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
   needed; it sets by draining (the nigre is the
   whey); `get bar from frame` mints `/trade/chandlery/thing/soap-bar`
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
evaporative profile whose product is the solid left behind)). `fullers-earth` and `chalk` (materials + won rows in
**trade-quarrying**, one `wins:` band each in the Hill Quarry column
between clay and coal — ⚠ rubber edits the same column; whichever lands
second merges by hand; also stocked at the general store). `sand` reads
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
copies repair's D12 shape with a discipline filter.** `SERVICE_KINDS`
gains both (a declared closed vocabulary; the ceiling is untouched);
`OrderController.performService` gains two arms; `order.yaml` help gains
two lines; `MenuController` lists them for free. `order wash <garment>`:
`ensureOperatorAt(venue)` → `presentFulfillers(giver, 'textiles')` (⚠
repair's call passes no discipline; this build adds the optional
parameter repair's signature already has) → `callHouse` (repair's;
if repair has not landed, factor it here from `resolveMaker`'s tail in
the exact shape and repair consumes it) → no hand ⇒ *"There's nobody here
to do the work."* → the hand reads the garment (`Garment.describeForLaundress()`:
fibre, construction, kinds and bands, what she will do to it at HER band)
→ `Tariff.quoteFor` (repair's; here the lines are `wash` × kinds, +
`hot-wash`, `bleach`) → `promptConfirm` → `Garment.wash(spec)` with the
spec the hand's **textiles band chooses** (`WashPolicy.forBand(band,
garment, kinds)` — a value object in `S/lib/cleanliness/WashPolicy.ts`:
untrained boils everything and uses lye; competent reads the fibre;
expert never ruins) → `collectMinor` → `settlePiecework` for a
`per-settlement` seat. **Ruin** = the outcome's `damage` non-empty
(felted · shrunk · rotted · bled onto): the house pays the customer the
tariff's posted cover (`prices.cover`, grain 20; ⚠ no appraisal mechanism
exists — § discrepancies) through **`BankingApi.indemnify(houseAccountId,
payeeKey, amount, memo)`** → `BankingLogic.indemnifyImpl` (the `payWage`
body under a new `PnlCategory` `'damages'`, employer balance required, the
payee's primary account; a cash-only customer is paid in coin from the
house's till through the shipped `takeCoins`/`moveCoins` when the house
holds coin, else told *the house owes you* and the deed records the debt)
and `hand.recordDeed({kind: 'ruined', what, for: customer})` (AC 19).

**D27 — The lavoir is civic rows; the laundress is a Business with a
Tariff fixture in the same room (two houses in one room, shipped).**
`C/terminus/content/world/terminus/wharfside/lavoir/`: `location/lavoir.yaml`
(`PersistentCartesianLocation`, roofed: `enclosure: none` on the open
sides is NOT allowed by `lint:biome-sky` — author `enclosure: [stone
piers]`, `roof: [slate]`; `ambientSource: sky`, `ambientOpening: arches`;
props a `/stuff/thing/fixture/trough` (`WaterFixture`, `suppliedBy:
/world/terminus/wharfside/thing/cold-fell-aqueduct` — soft, running), two
`/stuff/thing/fixture/washboard` (Fitting, `scrubbing` capability, `peers`
affords `scrub`), a `clothes-line` ×2, a `midden`, the `urine-tub`, the
laundress's `tariff`; `cast:` two washerwomen (plain `Cast` with
`greets`-style lines) so *others are there washing*), `location/drying-ground.yaml`
(sky-exposed, lines), `idea/laundry.yaml` (Business: position `laundress`,
`fulfills: [textiles]`, `requires: {discipline: textiles, band: novice}`,
`headcount: 2`, `compensation: {basis: per-settlement, rate: 1}`, `call:
rota`, `rosterSlots` the NPC laundress 7–17, `operatingLocations` the lavoir
+ the tariff; `banksAt: goodkin`; `parLines: soap` from the chandlery
outfit), `thing/tariff.yaml` (`services: {wash: wash}`, `prices: {wash: 2,
hot-wash: 1, bleach: 2, cover: 20}`), `agent/laundress.yaml` (textiles
`competent`; her low-band twin for the drive is a player at `novice`). Exits
from the Quay (`wharfside/bank.yaml` gains `southwest → lavoir`). Free:
the trough and boards afford `wash`/`scrub` to anyone. A second lavoir is
these rows again (AC 23).

**D28 — The bathhouse is a hospitality venue off the market; the gym
shares its door.** `C/terminus/content/world/terminus/market/bathhouse/`:
`location/{vestibule, baths, gym}.yaml` (Persistent…; `enclosure`+`roof`;
the baths room props a `/stuff/thing/Hearth` + fuel, a **copper**
(`/stuff/thing/fixture/copper` — a `Receptacle` row 100 L `fixedInPlace`,
`seatIn:` the hearth's hob so `heatContents` warms it; `suppliedBy:` the
city main fills it), three **tubs**, a `midden`, soap at par, the
`tariff`; the gym props the barbell (`/trade/smithing/thing/barbell` —
its first prop), a `mat` surface, a basin), `idea/business.yaml`
(position `attendant`, `fulfills: [personal-services]`, `purchases`,
`call: rota`, parLines `soap` (chandlery) and `fuel` (the collier), the
usual), `thing/tariff.yaml` (`services: {bath: bath, wash: wash}`,
`prices: {bath: 3, wash: 2, cover: 20}`), `agent/attendant.yaml`. **The
tub** becomes a thing that holds water: `S/platform/thing/Tub.ts` =
`SoilableMixin(BulkableMixin(ThermalMixin(Chair)))` (a seat you lie in
with a bulk interior; `fixture/tub.yaml` re-classed; the bathroom
archetype's `water` need is unchanged — the basin carries it). **`bathe`**
(new platform verb, `crafting` beside `wash`; `bathe [in <tub|water>]`):
needs a `Tub` holding ≥ 60 L of water in reach OR a `Shore`/`Pool` (the
frozen gate, D13); engages the body for `BATHE_S` (120); at completion
`Creature.bathe(waterK, cleanser)`: every body site `wash`ed (hair is the
head site), `immerse()` (wet, garments and all — bathing dressed is the
player's problem; the scene says so), and the thermal half: in a `Pool`
the shipped immersion fold already runs; at a shore or in a tub the act
deposits `−h·A·(coreK − waterK)·BATHE_S` through `ThermalMixin.depositHeat`
(a winter river chills, a copper-fed tub warms — storage's cold water read
once, not copied). `order bath` is the transfusion-shaped arm: the
attendant on shift, the copper's water ≥ 310 K (else *"the water is not
hot yet"*), the house's soap at par (none → a water bath, said so), engage
the customer, `bathe` at completion, `collect`. The attendant washes your
clothes = `order wash` at the same tariff (AC 20's second half, § 15).

**D29 — The doorman is a judgment the exit asks for; the criterion is
data on his brain; the refusal is his words.** A new exit kind row
`/stuff/idea/exits/kept-door` over `S/platform/idea/KeptDoor.ts` (an
`Exit` subclass, the `FordExit`/`AshoreExit` precedent of a mover-reading
async `canTraverse`): it finds a `Behaved` occupant on EITHER side running
the `doorman` brain (`S/lib/behavior/doorman.ts` — kernel commons; a
doorman is a second-venue thing) and asks `brain.judge(host, mover)` →
`{admit: true} | {admit: false, reason}`; no doorman present → open. The
brain's `config.dressCode`: `{turnsAway: [{outer: [garment keywords or
template paths], where: torso}, {soiledAbove: 'marked'}, {bare: [torso]}],
greets: [...]}` — he reads `mover.outermostAt('body.torso')`'s keywords/
material/form and its `soilBand()`; regard ≥ `config.regardAdmits` (grain
60) waives it (*someone who does not care*). Lens 7: criterion named on
the row, appeal = the alternatives (a borrowed coat, a bath, the hall's
other business, the bank's own officer who can `dispatch` you in), tier C.
The Goodkin hall's north arch becomes `kind: /stuff/idea/exits/kept-door`;
`counting-houses/agent/doorman.yaml` (`Cast`, costume a frock coat,
brain `doorman` + `greets`) stands in the hall. ⛔ No `isWizard`, no gauge,
no `canEnter` on the room (the room would then need the brain's config —
the exit asking the person is the honest shape). **The wharfside remark**:
`S/lib/behavior/remarks.ts` — a `greets`-shaped arrival brain whose lines
are keyed by the arriver's outer torso garment (`lines: [{outer: [coat,
frock], say: "..."}]`); the fisher and the pilot get one line each.
AC 20.

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
fixtures that keep their state.** (a) `S/platform/location/PersistentCartesianLocation.ts`
= `PersistableMixin(SingletonCartesianLocation)` — ONE row, ONE place, ONE
record keyed by its template path; `StuffApi.singleton` already restores
or seeds-and-captures it (grounding), props capture as unstamped contents
(the Oven's `flueSoot`, a tub's water), chattel owner-side, cast transient
(`reseedCast`), air contents (dust) ride `runtimeState`. ⛔ Not
`FurnishableRoom` (not cartesian — the venues author `coords`; and
`WarrenMember`/`Reserved` claim a holding's room). Re-classed rows: the
cookhouse, the byre, the chandlery floor, the textile mill floor, the
glazier's hut, the infirmary ward, the general-store shop floor, the
Circle parlor (the doorman's room — its fire is prose; no state; left as
is), and every new room. (b) **Fixture state**: `AdornableMixin.captureSlice`
captures, for each non-chattel fixture, the fixture's own persistent
`runtimeState` slice under `fixtures: {<slotName>: fields}`, and
`materialize` applies it onto the fixture the row re-minted into that
slot (the floor's `deposits`/`strewn`/`stallsStamp`, a Window's
`deposits` — a Window anchored on two persistable hosts is written twice
with the same state, last wins). The Floor's own comment (`Floor.ts:343–350`)
is the spec. ⛔ Not a floor-keyed `(scope, key)` record per room (one
`holder_snapshots` row per Location at mint — the write-only failure the
`CartesianLocation` header records; storage's `IceSheet` record is one
pool's big log, a different case). **Capture is explicit**: every act in
this plan that writes a Soilable, Flued or floor field calls
`PersistableApi.captureHostOf(thing)` after it (a worn garment → the
wearer, which captures at logout anyway; a floor → `captureHostOf` must
walk fixture → host: `Adornment.getHost()` is added to the walk's
ancestor step). Drive step 23 (AC 24).

---

## ⭐⭐ Host placement

| new thing | host | what composing it claims about everything already on that host | narrowing check |
|---|---|---|---|
| `SoilableMixin` | `Garment` | every garment may carry dirt by kind and be washed — true of a shirt, an apron, rubber's gloves, a DisguiseGarment | — |
| | `Creature` (per body-part site) | every body that wears things can be dirty where it was touched — true of a person, a cow, a dog (a muddy dog is honest); `Corpse` is NOT a Creature (Thing branch) — a body's dirt dies with it; the garments carry the evidence | no guard: a site-less read is the whole-body band |
| | the `Floor` twin (`platform/thing/Floor`) | every room's ground may be soiled, strewn, swept — true of a street (mud is weather's, left alone) and a hall alike | the cleaning METHOD narrows by ground kind — a method on the floor, never a guard in a verb |
| | `Window` | every pane may grime and pass less light | — |
| | `Chair` (and so `AssembledChair`, the bed, the cot, `Tub`) | every seat and bed may be filthy and rest you worse | `Floor` is Postured but not a Chair; `restQualityAsKept` is total on Postured (band `clean` when not Soilable) |
| | `Lantern` | a glassed lamp soots and dims | `Lamp` (no glass) does not compose it |
| | `Bandage` | a dressing may be dirty, washed, boiled | — |
| | `CraftVessel` | a pot, glass, pail or kettle may be greasy as well as *used*; the tiers read both | `Serviceable.soiled` keeps its *used* meaning; two facts, two fields |
| | `KitchenTool`, `ButcherBlock` (trade-cooking), `SurgicalKit` (trade-medicine) | the kit the tiers read | pack classes; `Tool` itself stays unsoilable — a sledge is soilable for nobody |
| | `Rug` (new `platform/thing/Rug`, `Soilable(Good)`) | a textile floor covering that is beaten | — |
| `handCleanliness()`, `depositOnHands()`, `bathe()`, `wash()`, `perceivedBandModifier` override | `Creature` | every body answers how clean its hands are through what covers them | replaces `HygieneMixin` (deleted) |
| `doff(garment, {careful})` | `Attired` (on `Creature`) | the wearer owns the transfer between its layers — the three-copies lesson in `Attired.ts` | — |
| `ContaminableMixin`, `ThermalMixin` | `Bandage`; `ContaminableMixin` on `SurgicalKit` | a dressing and a kit can carry microbes, be boiled, be flamed | the kernel `Tool` and `Good` stay as they are |
| `LabelledMixin` | `Garment` | every garment may be marked — true | — |
| `receiveTraffic`, `soilFeetOf`, `strewn`, `cleaningMethod`, `reconcileStalls` + `stalls` field, `hasPests`, `soilAugmenter` | `FloorMixin` (`lib/ground/Floor.ts`) | every floor takes traffic and names its method; `stalls` is null everywhere but the byre | the stall accrual runs only when the row authors `stalls:` — a declared capability, not a guard |
| `restQualityAsKept()` | `PosturedMixin` | every rest surface can say how it rests you AS KEPT | — |
| `FluedMixin` (`lib/fire/Flued.ts`: `flueSoot`, `catchFlue`, `sweepFlue`) | `Hearth`, `Oven` | a hearth and an oven burning indoors have a flue that soots and can catch | ⛔ not `Firebox` (Campfire extends it); `Forge`/`Kiln` deferred |
| `combustionProducts`, `flammableLimit`, `vapourLPerLPerHour`, `ashFraction` | `Material` | any material may say what it gives off burning, at what share its vapour flashes, how fast it evaporates, what ash it leaves; the honest zero/null default leaves every shipped row byte-identical | — |
| `offGas` | `MaturationProfile` | any profile may name its gas (replaces the CO₂ hardcode) | a census test pins every shipped profile |
| `soils` | `Recipe` | any recipe may say what making it dirties | — |
| `hardnessDgh` | `WaterDraw` (kernel) + `BulkPayload` (declaration-merge from `lib/cleanliness/Hardness.ts`) | drawn water remembers its source's hardness; blends by volume | — |
| `bleach(dose)` | `DyedMixin` | any dyed thing fades under an oxidiser dose | — |
| `DirtKind`, `Cleanser` (Ideas) + two catalogues | `platform/idea/` | row families; nothing composes them | — |
| `WashPolicy`, `WashSpec`/`WashOutcome`, `Hardness`, `StainRecord` | `lib/cleanliness/` value objects | nothing composes them | instance-shaped (`lint:lib-statics` at ceiling) |
| `PersistentCartesianLocation` | `platform/location/` | one authored place on a grid whose state outlives the process; props capture, chattel owner-side | ⛔ not FurnishableRoom (coords; warren claims) |
| fixture-state slice | `AdornableMixin.captureSlice`/materialize | a persistable host remembers its non-chattel fixtures' runtime state | — |
| `Tub` (`Soilable(Bulkable(Thermal(Chair)))`) | `platform/thing/Tub` | a seat you lie in that holds water | the `fixture/tub` row re-classed; the bathroom archetype unchanged |
| `KeptDoor` (Exit subclass) + `kept-door` kind row | `platform/idea/` | an exit that asks a doorman present | no doorman → open; never a gauge |
| `doorman`, `remarks` brains | `lib/behavior/` | commons brains any venue configures | — |
| `Hopper` (Vat subclass), `SoapKettle` (CraftVessel + Maturing), `SoapBar` (`Seasoning(Good)`) | `trade-chandlery/src/thing/` | the chandler's vessels; one profile-seam override each; the soap frame is a ROW over the kernel `Mould` twin | pack classes under the pack root |
| `seasonPhrase()` hook (wood prose moved to `Timber`) | `SeasoningMixin` | the mixin speaks for *a solid drying in air*; the composer speaks for itself | name-the-substrate fix; Timber byte-identical by test |
| `indemnify` | `BankingApi`/`BankingLogic` (+ `PnlCategory 'damages'`) | a house may pay a person it owes | the conservation chokepoint is `postTransaction`, unchanged |
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
- **Locations, not rooms** — `PersistentCartesianLocation` /
  `SingletonCartesianLocation`; `FurnishableRoom` only where a holding
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
- **Verbs on objects** — `wash/bathe/deposit` on the thing, `doff` on the
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
  the locality title), `lint:schema` (untouched).

---

## Waves

Each wave is independently landable and ends at one commit. Sibling
hotspots per wave are named; **the second to land merges by hand**.

### W0 — The substrate: soil by kind, the rows, the hosts, persistence

**Goal.** `SoilableMixin`, the two row families and catalogues, the hosts
composed, the hands clock retired onto the derived read, fixtures and
venues that keep a record. Nothing deposits yet except the shipped
treater's hands; every row is byte-identical in play.
Implements D1–D4, D9, D31.

**Files.**
- `S/lib/cleanliness/{Soilable,Hardness,WashPolicy,StainRecord}.ts` (new);
  `S/lib/mixin.ts` (`Mixins.Soilable`, `Mixins.Flued` later; `Hygiene`
  removed), `S/api/mixin.ts` (`isSoilable`; `isHygiene` removed).
- `S/platform/idea/{DirtKind,DirtKindCatalogue,Cleanser,CleanserCatalogue}.ts`
  + `C/platform/content/platform/idea/{DirtKindCatalogue,CleanserCatalogue}.yaml`
  + rows `C/platform/content/platform/idea/DirtKind/*.yaml` (12),
  `…/Cleanser/*.yaml` (14); `scripts/check-template-scans.ts` (+2);
  `scripts/check-closed-vocabularies.ts` (`Action` declared).
- Hosts: `S/platform/thing/equipment/Garment.ts` (+Soilable, +Labelled),
  `S/lib/creature/Creature.ts` (Hygiene → Soilable; `handCleanliness`,
  `depositOnHands`), `S/platform/thing/Floor.ts`, `S/platform/thing/Window.ts`,
  `S/platform/thing/Chair.ts`, `S/platform/thing/Lantern.ts`,
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
- Persistence: `S/platform/location/PersistentCartesianLocation.ts` (new),
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
  --snapshot`). ⚠ Hotspot with repair and storage — regenerate, never
  hand-merge.
- Tests: `Soilable.test.ts` (deposit/band/remove; no clock — a day of
  idling changes nothing, AC 1), `DirtKindCatalogue.test.ts` /
  `CleanserCatalogue.test.ts` (a malformed row skipped and named; a
  pack-root row found), `Creature.hands.test.ts` (glove vs bare; the
  derived number; sepsis seeds as before at the threshold),
  `PersistentCartesianLocation.test.ts` (singleton restore/seed; a prop's
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

**Goal.** Every act in D6 deposits where it should; the butcher's apron
bloodies and his shirt does not; gloves take the dirt and give it back
carelessly. Implements D5, D6, D7, D8 (the stain record).

**Files.** `S/lib/craft/Recipe.ts` (`soils`), `S/platform/idea/api/CraftingLogic.ts`
(apply `soils` at the maker site), recipe rows (`render-tallow`,
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
the victim's type).

**Acceptance.** AC 2, 3; drive steps 1–4 pass in a unit harness;
`lint:family`; `test:near` on every touched pack.

**Commit.** `build(cleanliness W1): every producer names its deposit — the apron takes the blood, the glove takes the dirt and gives it back carelessly`

### W2 — Washing, drying, hardness, the forensic stain

**Goal.** `wash` cleans by chemistry and can ruin; a washed garment is
wet and dries; hard water scums; blood reads off a shirt. Implements
D10–D13, D8 (the reading), D9 (label verb reaches a garment).

**Files.** `wash.yaml` (target `objects`/`SoilableMixin`, `cleanser`
arg, help), `scrub.yaml` + `ScrubController.ts` (new),
`WashController.ts` (rewritten), `S/lib/cleanliness/Soilable.ts`
(`wash`), `Garment.ts` (`wash` override: felt/shrink/rot/bleed/wet),
`CraftVessel.ts` (`wash` override chains the shipped tipping),
`S/lib/material/Dyed.ts` (`bleed` helper on `launder`'s loss),
`S/lib/slot/Wearable.ts` (shrink = scale the stamp), `S/lib/wetness/Wet.ts`
(the guard narrowed to bodies), `dry.yaml` + `DryController.ts` moved to
platform (trade-cooking's deleted; `C/trade-cooking/pack.yaml` loses the
view), `C/generic-objects/…/fixture/clothes-line.yaml`,
`S/lib/location/WaterSource.ts` (`hardnessDgh`), `C/water/src/idea/WatercourseCatalogue.ts`
(fill it; `hardnessWords` → `Hardness`), `S/lib/bulk/Bulkable.ts` /
`BulkableLogic.ts` (payload blend of `hardnessDgh`),
`S/platform/thing/WaterFixture.ts` (the soft/hard line; the supply's
hardness), `rinse.yaml` (shore default), `C/trade-medicine/src/idea/reading/BloodReading.ts`
(the stain branch), `label.yaml` help. If storage has not landed:
`Attired.immerse()` built here (D7).
Tests: `Soilable.wash.test.ts` (grease vs water vs soap; blood cold vs
hot → set; set answers to oxidiser only; hard 12 vs soft 5; soda narrows
it), `Garment.wash.test.ts` (boiled wool felts; hot linen shrinks the
stamp; harsh bleach wears; red + white → pink; comes out `soaked`),
`Wet.test.ts` (a Thing dries over 8 h; a body still drops the gap),
`DryController.test.ts` (a garment on a line; a hide as before),
`BloodReading.stain.test.ts`, `WaterFixture.hardness.test.ts` (a tap off
the Cold Fell main reads soft; the Quay hard).

**Acceptance.** AC 4, 5, 6, 9; drive steps 5, 7, 8, 9 in unit shape;
`lint:verb-collisions` (dry) green; `lint:family`.

**Commit.** `build(cleanliness W2): washing removes dirt and can ruin the cloth — time, heat and a cleanser; wet and drying; hard water; the stain that names its bleeder`

### W3 — Soap and the cleansers; bleaching; the perils

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
broom, rushes, hopper, kettle, ash) — ⚠ hotspot with rubber (boots,
gloves) and repair; `wash.yaml` cleanser narrowing reads the Cleanser
rows. `cleanser` Discipline credit: `chemistry` on the profiles.
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

**Goal.** A place is kept as well as it is used; the dangerous
cleanable catches; the mill explodes; the byre is mucked out onto a
field; rest and pests read the room. Implements D15–D20, D22's mill
house, D30.

**Files.** `S/lib/ground/Floor.ts` (methods, `strewn`, `stalls`,
`soilAugmenter`, `hasPests`), `S/lib/slot/Postured.ts`
(`restQualityAsKept`), `S/lib/metabolism/Metabolic.ts`, `S/lib/vitals/Vitals.ts`
(the rest readers), `S/lib/material/Freshness.ts` (`pestRatePerHour`),
`S/lib/fire/Flued.ts` (new) + `S/platform/thing/{Hearth,Oven}.ts`,
`S/platform/thing/Lantern.ts` (soot flux), `S/platform/thing/Window.ts`
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
`byre.yaml` (`stalls:`, a midden in the yard), `C/trade-farming/src/idea/reading/SoilSurveyReading.ts`
(the nitrogen line); Hinkley: `lots/kitchen.yaml` + `lots/yard.yaml` +
`thing/kitchen-window.yaml` (the Window row, both anchors), a
`clothes-line` in the yard, a `midden`; `S/platform/idea/cmd/perception/SurveyController.ts`
(one room line: *"The floor is <band>; <method> would see to it."* — ⚠
repair hotspot; read its `fabricReport` shape and add beside it);
contracts: `S/lib/employment/Condition.ts` (`clean`), `JobController.ts`
+ `job.yaml`, `ContractLogic.ts`. Tests: traffic (a shop floor), sweep →
one heap merging storage's sawdust, strew converts blood to debris,
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

**Goal.** Somebody is paid for all of it. Implements D26–D29.

**Files.** `Tariff.ts` (`wash`, `bath`), `OrderController.ts` (two arms —
⚠ repair hotspot: build on repair's `callHouse`/`quoteFor`/`collectMinor`;
if absent, factor them here in repair's shape), `CraftingLogic.ts`
(`presentFulfillers(giver, discipline)`), `order.yaml`, `S/lib/cleanliness/WashPolicy.ts`,
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
`smithing/thing/barbell.yaml` propped. Tests: `OrderController.wash.test.ts`
(no hand → refusal; the quote names fibre, kinds, price; `yes` → washed
at the hand's band; a novice hand boils a **wool jumper** and felts it
(silk is not in the game — the user's decision); the house pays the cover
to the customer's account and the deed is on the hand; off shift refused;
a player holding the seat is paid piecework), `bathe.test.ts` (a tub of
hot water: clean and warm; a winter shore: clean, soaked and chilled;
frozen refused), `order bath` (the copper cold → refused; hot → engaged,
collected at completion), `KeptDoor.test.ts` (tannery apron refused in
words; a coat admits the same person; no doorman → open; regard waives),
`remarks.test.ts`, `lint:menu-staff`/`lint:openings` green on both
houses.

**Acceptance.** AC 19, 20, 23 (a second lavoir/bathhouse is rows);
drive steps 18, 20.

**Commit.** `build(cleanliness W6): somebody is paid for it — the laundress at her band and the house that stands for her, the lavoir, the bathhouse and its gym, the doorman who says why`

### W7 — The drive, the docs, the MR

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
(the fixture slice; `PersistentCartesianLocation`), `maturation.md`
(`offGas`; soap), `ground.md` (the floor's soil), `watershed.md`
(hardness travels), `behavior.md` (doorman, remarks), `mould.md`,
`vocations.md` (laundress, bath attendant, sweep: demand with supply),
`content-packs.md` (pack count unchanged — no new pack; the chandlery
grew), `CLAUDE.md` map line for `cleanliness.md` **left to the sweep**
(index files are swept, not raced). Then `pnpm test` once, push, MR.

**Commit.** `drive(cleanliness): <what driving found>` then the MR.

---

## Reachability wiring

| capability | verb | affordance | data | boot / warm | arg gate |
|---|---|---|---|---|---|
| soil on a thing | `look` | — | the DirtKind rows | `DirtKindCatalogue.peek` (lazy; `look` never warms — `describeSoil` falls back to the key word cold) | — |
| `wash`/`scrub` a soilable | platform `crafting` views | `WaterFixture` peers (shipped), `Shore` (shipped), washboard peers | Cleanser rows | `CleanserCatalogue.warmed` in `execute` (async, before the step) | `target requires: SoilableMixin` — every W0 host composes it; `cleanser requires: any`, controller-narrowed by tag |
| bare `wash` (hands) | same | same | — | — | no target → sites |
| `dry` a garment | platform (moved) | `DryingRack` environment (shipped) | `clothes-line` row | — | `target requires: any`; refusal in words |
| `remove … carefully` | `remove.yaml` | shipped | — | — | `manner` optional word |
| `analyze blood <shirt>` | shipped `analyze` | the Reading row (shipped) | — | `ReadingCatalogue` (shipped) | `BloodReading` branch |
| `label shirt` | shipped | `LabelledMixin` contributes `label.yaml` (shipped) | — | — | `requires: LabelledMixin` — Garment now composes it |
| soap chain | `put`, `pour`, `stoke`, `get` | the vessels' shipped buckets | two profile rows, five materials, seven things, counter lines | `MaturationProfileCatalogue` (booted, reader rule — exists) | the hopper's seam needs a `potash` item; the kettle `fat` + `lye` |
| `sweep`/`muck`, `strew`, `dispose`, `beat` | platform `inventory` views | the floor is a fixture — the views bind `reachable` floors by keyword (`lint:ground` (d): floor rows carry `floor, ground`); broom/brush `environment` | sweepings/manure/rushes rows, midden rows | — | `tool` declared, optional; `beat` target `requires: SoilableMixin`, the controller refuses anything that is not a rug or a garment in words |
| the flue, and the grate's ash | `sweep <hearth>` (brush → flue; bare → ash) | the hearth's peers bucket gains the sweep view | `fire.flue.*` settings; `Material.ashFraction` | — | `requires: FluedMixin` on the hearth arm; the tool arg decides which |
| dust → flash | shipped `strike`/`light` | — | three gas rows with `flammableLimit` | `MaterialCatalogue` (booted) | — |
| `bathe` | platform view | `Tub` peers, `Shore` peers (the wash precedent) | tub rows re-classed | — | controller-narrowed water |
| `order wash` / `order bath` | shipped `order` | Tariff peers (shipped) | the two tariffs, two businesses, `call:` | the houses load with their rooms | the hand: `presentFulfillers(giver, discipline)` → `callFor` |
| the doorman | movement | the exit kind row | the brain config | — | `KeptDoor.canTraverse` |
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
- **Hotspots to merge by hand when a sibling lands first**: `OrderController.ts`,
  `Tariff.ts`, `PricedOffer.ts`, `CraftingLogic.ts` (`callHouse`,
  `presentFulfillers`), `SurveyController.ts`, `Garment.ts`,
  `Receptacle.ts` (repair adds Durable/Crafted — the copper row names it),
  `Attired.ts` (`exposeToRain` / `immerse` / `doff` — three methods, one
  file), `Material.ts` fieldMeta (rubber's three fields, storage's two
  methods, this build's four fields), general-store `counter.yaml`,
  infirmary `tariff.yaml`, `hearthworks/idea/business.yaml` (storage's
  ice line), `quarry-hill.yaml` (rubber's sulfur band), the field-meta
  golden (regenerate), `Mixins`/`MixinApi`.

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
6. **Rubber's construction glass faces** take no grime this build (D19);
   the note to rubber promised a grimed hothouse roof *when one funnel
   exists*. Named in Deferred seams; the user may prefer a per-place
   number now (a field on `AtmosphericMixin` — this plan declines it).
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
11. **Merge order.** Each shared piece has a fallback; the build agent
    runs the § Critical files item 0 check before W0 and again before W2,
    W3, W6.

---

## Deferred seams

Each leaves as a slate line, never a plan section.

- **The Washer at the Ford and the dying index** → `docs/slates/tails/washer-at-the-ford-slate.md`
  (cut by the user, 2026-10-17; the slate exists). The attach point
  is the dialogue-effect registry (`BankCounter.onCreate`'s shape) and a
  maintained index at `beginDying`/`stabilize`/`expireDying`.
- **Grime on a construction glass face** (rubber's hothouse roof) →
  `glass-slate`: when one named per-face transmittance method exists on
  `Exposure`, a face multiplies by the place's floor-side soot the way a
  `Window` does; no per-place field until then.
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

0. **Re-ground the siblings before W0** (and again before W2, W3, W6):
   `git log origin/master -- packages/server/src/mud/lib/spatial/Exposure.ts`
   (rubber), `-- packages/server/src/mud/lib/storage/Store.ts` (storage),
   `-- packages/server/src/mud/lib/commerce/PricedOffer.ts` (repair's
   `collectMinor`); `git show origin/reqs/<x>:docs/plans/<x>-plan.md` for
   whichever has not landed. Record the state in § Grounding.
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
4. `S/platform/location/{CartesianLocation,FurnishableRoom}.ts` headers,
   `S/api/stuff.ts:800–836`, `S/lib/persistence/Persistable.ts` header,
   `S/lib/boundary/Adornable.ts:140–235`, `S/lib/ground/Floor.ts`,
   `S/lib/stuff/Location.ts:365–430`.
5. `S/platform/idea/JointCatalogue.ts` (the catalogue shape),
   `scripts/check-template-scans.ts:58–95`, `scripts/check-closed-vocabularies.ts`.
6. `S/lib/maturation/{MaturationProfile,Maturing,Seasoning}.ts`,
   `S/lib/mould/Mould.ts`, `C/trade-dairying/src/thing/{SettingPan,Wheel,Hoop}.ts`,
   `C/trade-chandlery/src/**`, `C/trade-textiles/src/thing/BleachingGreen.ts`.
7. `S/platform/idea/api/FireLogic.ts:500–640`, `S/lib/fire/Burner.ts:895–1000`,
   `S/platform/thing/{Hearth,Oven,Campfire,Lantern,Window}.ts`,
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

## Drive record

*(appended at build time, not at plan time)*
