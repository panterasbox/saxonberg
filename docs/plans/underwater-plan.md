# Underwater — the water place — implementation plan

Executes [underwater-requirements.md](../requirements/underwater-requirements.md)
(**kind: feature · leads from: kernel**; first consumers the Wharfside
diving works on the Kestrel, the Duncan Hall cistern, Hollow Mere under
its ice, the estuary's tide). The build makes water a **state of any
place** (a kernel mixin replacing the `Pool` kind), buds a **column** of
band rooms under any water deeper than standing (a water-pack Warren),
rewrites breath as **store ÷ burn with two clocks**, gives the body
buoyancy and pressure, opens the **medium** as a `Medium` row every
physics seam reads, adds **tides** on the moon clock, ships the
**`/trade/diving`** pack (lifeline, bell, hard-hat suit, the bends, the
jobs) and the Wharfside venue, the two held workings, and the five life
findings. Four stages (A the water place · B the medium · C the trade ·
D tides and life) plus magic; the drive is
`packages/wire/tests/underwater.dirty.wire.test.ts`. Branch
`reqs/underwater` off master; **rubber (build-1) merges first** and W0
begins by merging it in (§ Risks R1).

---

## Grounding

Verified by opening files 2026-10-18 (S = `packages/server/src/mud`,
W = `packages/content/water/src`, T =
`packages/content/terminus/content/world/terminus`). Condensed from the
four surveys the plan was briefed with, re-checked where it leans.

### The water substrate today

- **`Pool`** (`S/platform/location/Pool.ts:61`) =
  `SwimmableMixin(ShoreMixin(SingletonCartesianLocation))`. Fields:
  `bed` (persistent+authorable, the prop row sunk things go to); `axes
  = ['*']`; ctor `floor = {template: TemplatePaths.waterSurface}`
  (`S/lib/paths.ts:136` → `/stuff/thing/surface/water-surface`), a row's
  `floor:` overrides (the mere's ice sheet). Hooks: `canEngageAxis`
  (swimmable only with open water), `canBeEngagedBy` (swim iff in the
  water), `waterTemperatureK` (draw → underIce → 274 K), `onEntered`
  (swum in ⇒ `immerse()`; walked in ⇒ occupy `GROUND_SLOT` or
  `giveWay`), `onExited` (vacate), `canExit` (*"You are in the water;
  swim for it."*), `onContainableAdded` (reconcileSupport + deferred
  `sink`), `sinks` (material density vs `BiomeApi.densityOf('water')`;
  agents, movers and fixed things never sink), `sink` (→ the prop whose
  template is `bed`), `sinkWhatSinks` (the only caller is the thaw,
  `W/thing/IceSheet.ts:628` via a duck call), `onContainableRemoved`.
- Rows with `class: /platform/location/Pool`: Hollow Mere
  `packages/content/hollow-mere/content/world/terminus/hollow-mere/location/pool.yaml`
  (`floor: {template: …/hollow-mere/thing/sheet}`, `waters: {mere:
  hollowmere:mere}` + a `mere` detail, conditional exits `media:
  [ground, water]`, `bed: /system/water/thing/pool-bottom` + that prop)
  and the estuary cove `T/estuary/pool.yaml` (`waters: {pool:
  /stuff/idea/WaterExpanse/greywater}`, `_biomePath:
  /stuff/idea/biome/outdoor/open-water`, one `west` exit `media:
  [water]`). Code importing `Pool`: tests only (`Pool.test.ts`,
  `WaterSurface.test.ts:24`, `W/__tests__/IceSheet.test.ts:30`,
  `trade-ice/src/__tests__/ice-trade.test.ts:29`); prose references in
  `Shore.ts:91`, `api/mixin.ts:1536`, `swim.yaml`, the strand row.
- **`PoolBottom`** (`W/thing/PoolBottom.ts` = `SealableMixin(Holder)`,
  row `W/../content/system/water/thing/pool-bottom.yaml`, shut, never
  opened). `scripts/check-template-census.ts:184` lists `bed` as a
  citation key.
- **Floors.** Protocol `S/lib/ground/Floor.ts:215-241` (`bears`,
  `supportIsSlotted`, `supports`, `supportLoadKgOf`,
  `openWaterAreaM2`, `giveWay(occ, deliberate?)`, `reconcileSupport`);
  ground defaults bear anything. `isOnGrade()` (`:414-437`): sky-exposed
  or `coords.z < 0`. `WaterSurface` (`S/platform/thing/WaterSurface.ts:34`):
  `GROUND_SLOT = 'ground:1'`, `bears = isFrozenWater()`, slotted,
  `canOccupyReason` → the not-bearing words, `giveWay` (vacate, swim
  mode, `immerse`/`wet(1)`, announce), `goIn` (bare `swim`;
  `SwimController.ts:34-38` narrows `floor instanceof WaterSurface`).
  `IceSheet extends WaterSurface` (`W/thing/IceSheet.ts:93`) — patch
  log, `hole` patches (`cut hole` with an ice saw, `:350-380`),
  `sortFloatSink` at the thaw. `Location.ensureFloor`
  (`S/lib/stuff/Location.ts:368`): returns if `noDefaultFloor`;
  existing wins; else clones `floor.template ?? defaultFloor`,
  `addFixture(…, 'floor')`, `onGrade`/`worked`, `resolveUnderfoot`.
  `docs/subsystems/ground.md` §*The two questions*: a mid-column band
  must not be floored by `onGrade` (z<0); *a band is not standable; its
  bed is*.
- **`ShoreMixin`** (`S/lib/location/Shore.ts`): `waters: Record<key,
  citation>` (`:101`); `waterFor(name?)` (`:198`) — a cited key must
  also be a `details:` feature (`lint:water-citations`,
  `scripts/check-water-citations.ts`); `peekWaterRead` memo + refresh
  per 6 h segment (`SEGMENT_S`, `:46, :290-310`); `settleWater`;
  `drawAt` (frozen gate; through a hole when the room's floor has open
  water → `read.underIce`); `waterSlot` (the source slot
  `BulkableLogic.slotFor` reaches); `onCreate` warms. Affords
  `DRAW_VERBS` (`:85`: fill, drink, wash, swim) in the `inventory`
  bucket. Composed by `platform/location/Shore`, `Quay`
  (`S/platform/location/Quay.ts:14` = `ShoreMixin(Street)`), `Pool`.
- **The seam** `S/lib/location/WaterSource.ts`: `WaterRead {ref, atS,
  name, pending?, frozen, draw, underIce?, opaque?}`; `WaterSource
  {currentWaterRef, readWater, waterLinesFor}`. Implemented by
  `W/idea/WatercourseCatalogue.ts` (`readWater :388`; `iceAt :534` async
  loads the index and rolls a per-segment cache; `iceAtSync :563` uses
  `this.loaded` + the same cache; `rollIceCache :577`; the flow memo
  `naturalFlowOf :1042`; `waterStateAt :760-806` — temperature from the
  catchment air, current = flow/(w·d), **salinity `:785-790`** (33 at
  elevation ≤ 0, brackish one hop up, else 0.3 — the docblock names it
  *the one function a tide clock replaces*), oxygen = saturation(T) ×
  turbulence) and `W/idea/WaterExpanse.ts` (`currentWaterRef :129`
  `path@lat,lon`; `readWater :137-165` never frozen, salt draw;
  `depthAt/bottomAt :224-236` narrowest `WaterBand` else the expanse's
  `depthM` 60; `waterStateAt :307` **hard-codes `oxygenMgL: 8`**).
  ⚠ **No LEVEL read exists anywhere** — no level/stage/tide/datum;
  `GeoPosition.depthM` is always 0 (`docs/subsystems/expanse.md:53`).
- **Rows.** Greywater
  (`packages/content/world-seed/content/stuff/idea/WaterExpanse/greywater.yaml`:
  `depthM 70`, `salinityPpt 35`, `waterTemperatureK 286`; node
  `greywater/the-pool.yaml` → `/world/terminus/estuary/pool`). Kestrel
  (`…/Watercourse/kestrel.yaml:53-55`): `confluence` elevation 30
  (works: intake, outfall), `estuary` elevation 0. Hollow Mere
  (`packages/content/hollow-mere/content/stuff/idea/Watercourse/hollowmere.yaml`):
  one node `mere` elevation 300, `meanDepthM 5`, `site.offsetK −12`.
- **Warren.** `S/lib/location/Warren.ts` abstract hooks (`:479-558`:
  `occupantsOf`, `createMember`, `admitArrival`, `attachmentFor`,
  `reconcile`, `wireHostFixtures`, `unwireHostFixtures`);
  `wireHubExit`/`unwireHubExit` live-ref `addBidirectionalExit(…,
  {keepLiveDestination: true})`; `createMemberSerialized`;
  `InnerWarren` (`S/lib/location/InnerWarren.ts:28`, members are rooms).
  ⭐ `MineWarren` (`packages/content/trade-mining/src/idea/MineWarren.ts:129`
  = `SingletonMixin(PersistableMixin(InnerWarren))`) is the keyed-bud
  template: `carve → _carveOne` (`:294-344`: `createMemberSerialized`,
  `addMember`, `placeInGrid` (zone `addLocation` else `setCoordinates`),
  `PersistableApi.restoreOrSeed(room, key)`, `wireHubExit`);
  `memberKeyOf` (`:348`); `roomAt`; `abandon` reaps; `reconcile` culls
  empty provisional cells; `wireHubExit` overridden to wire
  neighbors; `admitArrival`/`attachmentFor` no-ops. `WarrenMemberMixin`
  (`S/lib/location/WarrenMember.ts`) is the member back-ref; the keyed
  durable handle is `<row>#<key>` (`docs/subsystems/location.md` §
  durable handle). `DeferredDestinationExit`
  (`S/lib/boundary/DeferredDestinationExit.ts`): eager exit, destination
  faulted in by the subclass's `computeDestination`.
- **Cistern.** `packages/content/eternal-university/content/world/terminus/eternal/duncan-hall/location/cistern.yaml`:
  `SingletonCartesianLocation`, z −1, `up` → steps, **`_atmosphere:
  water`** (the only such row); `steps.yaml` `down` → cistern, props
  `/stuff/thing/gear/air-tank` + `air-compressor`.

### The body today

- **Respiration** (`S/lib/respiration/Respiration.ts`):
  `RESPIRATION_DEFAULTS` (`:67-104`: drain 1.5 %/s by cause,
  `UNPREPARED_GRACE_SEC 15`, `INHALE_HOLD_SEC 45`, `RECOVER_PER_SEC 4`,
  `ANOXIA_FLOOR_PCT 5`, `ANOXIA_LETHAL_SEC 30`, `TANK_TAP_PER_SEC 0.5`,
  `DYING_WINDOW_SEC 90`). `resolveCurrentMedium` (`:244-265`): the
  engaged mode's medium wins only if breathable (*swimming is at the
  SURFACE*) → `immersedIn()` (nearest ancestor with a non-empty bulk
  `interior`, `:271-285`) → `BiomeApi.resolveAtmosphereFor`.
  ⚠ Respiration **never reads `Swimmable.immersionOf`**; nothing puts
  a body below the surface. `assessExchange` (`:319-380`) reads
  `getBreathableMedia()` (`:206`, from `BodyPlan.breathableMedia`,
  default `['air']`, fish `['water']`), the displacement share
  (`hasBreathableShare`), the worn supply (`findWornAirSupply :301`: a
  worn `Bulkable` whose interior material is breathable — the
  `AirTank`, `S/platform/thing/AirTank.ts` =
  `WearableMixin(SlottableMixin(BulkableMixin(Good)))`).
  `respirationDrainTick` (`:548-621`): linkdead freeze → grace burns
  first (`:579-582`) → tank tap → linear spo2 drain → blackout cue at
  `survivableMin` (force-ends the hold) → `reconcileAnoxiaCascade`
  (`:675-704`: at ≤ 5 % for 30 s → `beginDying(cause, 90)`), so
  **drowning already enters a 90 s rescuable window**; missing: cold
  lengthening it, the blackout → drift/sink stage. `inhale()` (`:732`)
  sets `now + INHALE_HOLD_SEC` **unconditionally** (#94: re-inhale while
  immersed refills); `armDrain` (`:757`) auto-grace. Controllers
  `S/platform/idea/cmd/posture/{Inhale,Exhale}Controller.ts`. Doc
  `docs/subsystems/respiration.md` (its `applyDeath` reference is stale —
  the code calls `beginDying`).
- **Dying** (`S/lib/vitals/Vitals.ts`): `beginDying(cause, windowSec?,
  blame?)` (`:910`, first window wins, starts now), `isDying`,
  `getDyingRemainingSec`, `stabilize()` (`:952`, drops the record only;
  medic call site `cmd/medical/TreatController.ts:310`); the dying arm
  (`:2860-2879`) is exempt from the linkdead freeze; `DyingRecord`
  (`S/platform/idea/Condition.ts:685-711`); `HARM_DEFAULTS.
  DYING_WINDOW_SEC_DEFAULT 180` (`Condition.ts:556`); thermal's window
  300 s (`S/lib/thermal/Thermal.ts:265`). `getConsciousness()` reads a
  dying body as unconscious.
- **Exertion** (`S/lib/exertion/Exerting.ts`): `exert({durationS,
  powerW})` (`:195`: endurance debits the excess over `sustainableW`,
  floored at `exertion.exhaustionFloorPct`; wind gain `:223-233`);
  `traversePowerW(mode)` (`:447`) = `exertion.walkW` 300 ×
  `costMultiplier` (swim 2.0) × loadFactor from `getLoadRatio()`;
  `exertTraverse` (`:462`, nominal 60 s); `exertExchange`;
  `conditioningBand(stock)`; `breathBand()` (`:353`, **"breath" is
  endurance: fresh/tired/winded/spent**) and `noteBodyState()`
  (`:384-418`) speaking crossings on topic `self.body` (`BREATH_CUE
  :148`). Felt-voice precedents: `ThermalRegulation.noteShiver`
  (`:889-903`).
- **Burden** `S/lib/encumbrance/LoadBearing.ts`: `getBorneBurden()`
  (`:250`, mass only), `getLoadRatio()` (`:333`).
  `Creature.getBodyDensity()` (`S/lib/creature/Creature.ts:519-530`,
  *fat floats: the consumer is the water*).
- **Conditions**: rows at
  `packages/content/platform/content/platform/idea/Condition/<area>/*.yaml`
  (`respiration/asphyxiation.yaml`: `progression: null`, `resolution:
  {by: air}`; `thermal/hypothermia.yaml`: a reserve signature);
  `lint:conditions` + `lint:condition-arms` gate the `law` and
  `signature` kinds; template paths in `S/lib/paths.ts:140-170`.
- **Thermal** (`S/lib/thermal/ThermalRegulation.ts`): `effectiveAmbient`
  (`:508-548`) → `isSwimmable(scope)` → `immersionOf(host)` →
  `exchangeWithWater(waterK, 0)` (`:619`, the one immersion fold; the
  gap below `thermal.waterNeutralK` counted twice); restamp re-immerses
  (`:684-686` → `Attired.immerse`, `S/lib/slot/Attired.ts:708`,
  `immerse(parts?)` wets body + every exterior layer; the wet law is
  ice's and merged). Hypothermia `beginDying` at `:725`.
  **Rubber (build-1, `reqs/rubber`, HEAD `570fdaf14`) does NOT touch
  `ThermalRegulation.ts`** (line numbers identical to master); its diff
  is `S/lib/biome/Atmospheric.ts` (+660: `enclosure:`/`roof:`,
  `exposure()`, envelope coupling, solar gain), `BiomeLogic.ts` (+72:
  `exposureOf`, the six sky gates), `Attired.ts` (+50 `exposeToRain`),
  `Wearable.ts` (+38 stretch), `Slotted.ts`, and `lint:biome-sky` (an
  interior lacking `enclosure:`/`roof:` fails; `'none'` is legal for
  both). Plan every Atmospheric/BiomeLogic touch against the merged
  shape (§ Risks R1).
- **Species / plans**: `BodyPlan` (`S/platform/idea/species/BodyPlan.ts`):
  `sensoryPorts` (`:268`), `baseStature` (`:320`), `breathableMedia =
  ['air']` (`:343`), `respires` (`:353`), no lung-volume field. Fish plan
  `packages/content/trade-fishing/content/stuff/idea/species/BodyPlan/fish.yaml`
  (`breathableMedia: [water]`, `body.torso.gills` governs
  `respiratoryRate`). Bullfrog
  `packages/content/species-and-names/content/stuff/idea/species/animalia/chordata/amphibia/anura/ranidae/lithobates/catesbeianus.yaml`
  (quadruped plan ⇒ air only; `lifecycleStates [alive, dead]`).
  `Species.LIFE_STAGES` (`:606-617`) + `lifeStageAt(ageDays)` (`:1549`)
  are age bands; no per-stage form. `WATER_PARAMETERS` (`Species.ts:325`)
  and `habitat` tolerances already carry `oxygenMgL` and `salinityPpt`
  (`brown-trout.yaml:46-51`). Senses: `SenseChannel`
  (`S/lib/description/Perceiver.ts:64-88`); nothing keyed on medium.
  A bare `Creature` without `EngagedMixin` never drowns (the frog today).
- **Advancement**: Discipline rows at
  `packages/content/platform/content/platform/idea/Discipline/*.yaml`
  (`wind.yaml` = conditioning over the `wind` stock, *"the first real
  conferral is the swim, when there is water"*; a skill row has `key,
  channel: skill, label, iscedf, requires`). Reads:
  `competenceBandFor(key)` async, `competenceDigestCached()` sync,
  `creditDeed`. `Swimmable.canBeEngagedBy` gates on
  `SWIMMING_CAPABILITY_PROP` vs `difficulty`
  (`S/lib/locomotion/Swimmable.ts:23, :91-97`) — a check the
  requirements reject.
- **Linkdead**: `Avatar.onLinkdead()` (`S/lib/character/Avatar.ts:1551`)
  reaps a guest, returns if parked, stamps `lastSeen`, emits, saves —
  **touches no position**; `announceSessionPresence(reconnect, …)`
  (`:1180`) runs at the end of `enter`. `HasInteractive.isLinkdead()`.
  The respiration drain freezes on linkdead; the dying clock does not.

### The medium seams today (the census's twelve)

- **0 is-water** — two disagreeing answers: `BiomeLogic.
  resolveAtmosphereFor` (`S/platform/idea/api/BiomeLogic.ts:414`, async,
  walks `Atmospheric` ancestors — `MixinApi.isAtmospheric(cursor)` at
  `:714/:739/:1148/:1402` — the cistern's `_atmosphere`) and
  `Swimmable.immersionOf`. The only sync read is
  `AtmosphericMixin.getInlineAtmosphere()`/`atmosphereBlocks()`
  (`S/lib/biome/Atmospheric.ts:776-781`, the room's own tag). The four
  tag tables `ATMOSPHERE_DENSITIES / CONDUCTIVITIES / BREATHABLE /
  CONTAMINANT` (`BiomeLogic.ts:50-135`; tags air, water, vacuum, smoke,
  blackdamp, stinkdamp, carbon-dioxide) read by `densityOf`,
  `conductivityOf`, `breathableOf`, `contaminantOf`,
  `isKnownAtmosphere`. `AtmosphericMixin` composes on
  `MixinConstructor<Stuff>` (`:400`) — `ExitableVessel`
  (`S/lib/boundary/ExitableVessel.ts`, *a thing you can go inside is a
  place with air*) composes it on a Thing.
- **1 combustion** — `airShareOf` (`:442`) = 1 − Σ contents ⇒ a water
  place reads 1.0; `igniteImpl` (`S/platform/idea/api/FireLogic.ts:244`)
  has no air gate (refuses already-burning / no-fuel / not-flammable /
  too-wet). Lamps/candles are `Burner`s via `IgniteController`.
- **2 wetting** — `WetMixin.wet(delta)` (`S/lib/wetness/Wet.ts`);
  pushers: douse, electricity, rain, `WaterSurface.giveWay`,
  `Pool.onEntered`, thermal re-soak. Bodies only; nothing wets a loose
  object in a water place; nothing reads wetness for paper or ink.
- **3 object cooling** — `Thermal.mediumConductivity()`
  (`S/lib/thermal/Thermal.ts:756`: sealed → vacuum, else `barrier`, else
  `'air'`); `restamp()` (`:1081`) resolves the scope's ambient.
- **4 sources** — the shore is a source (`waterSlot` → `SourceSlot`;
  `WashController.ts:244` scans Bulkable/Shore holders). Salt water
  `packages/content/base-library/content/stuff/idea/material/bulk/salt-water.yaml`:
  `nutrients: []`, `toxicity: []` — inert when drunk.
- **5 speech** — `vocalEmit` (`S/lib/message/Vocal.ts:120`) is
  unconditional, shared by say/whisper/shout; bypassed by
  `TalkController` (act.deed), `PilotController`
  (`W/idea/cmd/social/PilotController.ts:57`), `OrderController`, and
  `cast` (the `voice` slot, `S/lib/magic/CastActivity.ts:25`). Vacuum
  blocks only at the receiver (`AudienceGather.walkOutward:237`).
  Emotes (`SoulMixin`) and `dm`/`tell` (`AetherMixin`) are the AETHER.
- **6 airway** — `Metabolic.ingest` (`S/lib/metabolism/Metabolic.ts:1466`)
  via `BulkableApi.ingest`; `cmd/bulk/DrinkController.ts` transfers
  BEFORE ingest (`:64-69`); `Sip`, `Eat`, `Treat` likewise; no shared
  airway check.
- **7 drag** — `WeaponProfile.derive(inputs)`
  (`S/lib/combat/WeaponProfile.ts:65` inputs: deliveryForm, massKg,
  lengthM, handSlots, hardness); `DeliveryProfile.derive` (`:141`) from
  `Launcher.energySource`; `arenaMaxBandFor` (`CombatLogic.ts:890`) caps
  by `Location.getLinearExtent()` (`S/lib/stuff/Location.ts:272`,
  base `null`); gambits `disarm` (`needsTargetArmed`, checked against the
  foe's instrument only, `CombatLogic.ts:4067`), `subdue` lands
  `grappled` (`S/lib/combat/Gambit.ts:102`); `Morale.pressure`
  (`S/lib/combat/Morale.ts:178`) has no urge input.
- **8 posture** — `sit`/`kneel`/`lie` bind `default: "ground"`
  (`platform/cmd/posture/sit.yaml:20`); with `noDefaultFloor` the binder
  fails generically; the worded refusal is `WaterSurface.canOccupyReason`.
- **9 sight** — `VisionModality.walkFluxAt` (`:541`) folds `ownFlux` +
  child legs through `mergeAttenuated(tau, color)`; Beer–Lambert exists
  only for glass (`trade-glass/src/lib/Tinted.ts:103`). `AmbientLit`
  (`S/lib/perception/AmbientLit.ts`): ambient is DERIVED from the biome's
  sky exposure (`isSkyLit()` `:333`); `/stuff/idea/biome/water/open.yaml`
  is a `SkyExposedBiome`.
- **10 exits** — `Exit.allowsMode` (`S/lib/boundary/Exit.ts:659`): empty
  `media` admits walk/sneak/run; `LocomotionLogic.canTraverseExit`
  (`:215`) → `farSideEnablement` (`:260`) only WIDENS. Modes
  (`packages/content/platform/content/platform/idea/LocomotionMode/`):
  swim `medium: water`, `costMultiplier 2.0`, `enablementMixin:
  SwimmableMixin`; climb `medium: vertical`, `ClimbableMixin`
  (`S/platform/thing/Ladder.ts` = `ClimbableMixin(Good)`, affords
  `climb`, `axes`).
- **11 sound** — `AudienceGather` `MAX_HOPS 2`, `EXIT_TAU 1.0`
  (`S/lib/perception/Modality.ts:108`), `PER_HOP_TAU 0.01`
  (`AudienceGather.ts:88`), direction sticky from the first hop (`:233`).
- **12 electricity** — `buildConductiveGraph`
  (`S/platform/idea/api/ElectricityLogic.ts:158`) reads the floor's
  SURFACE bulk puddle (`conductivePoolOf :208`,
  `immersedInFloorMedium :279`); never the place's medium.

### Content, trade and verbs today

- **Wharfside bank** `T/wharfside/bank.yaml`: `class:
  /platform/location/Quay`, `waters: {river: kestrel:confluence}` +
  `details.river/steps/arch`; exits north/west/south/east(`media:
  [ground, water]` → lower-towpath)/tinkers/northwest/southeast/
  southwest and ⚠ **`down` → `wharfside/knackers/location/yard`**;
  props intake, outfall, aqueduct, aqueduct-house, barge; cast fisher,
  pilot. No steps object. The dive-shop model is the tinker:
  `T/wharfside/tinker/{agent/tinker.yaml, idea/round.yaml (Business:
  positions, rosterSlots, banksAt, operatingLocations, offstage),
  location/{yard,offstage}.yaml, thing/slate.yaml}` reached by the
  bank's `tinkers` exit.
- **Works**: `city-intake.yaml`/`city-outfall.yaml` =
  `/system/water/thing/Conduit` (`W/thing/Conduit.ts`: stored `cut`
  `:202`; `readingFor` `:488-546` derives dry/frozen/fouled/overdrawn;
  no inspection state).
- **Estuary** `T/estuary/`: `pool.yaml` (Pool), `strand.yaml`
  (`/platform/location/Shore`, cites the Greywater, exits west mouth /
  east pool / north brow), `estuary-mouth.yaml` (SingletonCartesian,
  cites nothing, props `thing/tide.yaml` = `/platform/thing/WaterFixture`
  unbounded salt water + two salt pans, exits west reach / east strand /
  `aboard`), `reach.yaml`, `headland/brow.yaml`.
- **Gigs**: `CONDITION_TEMPLATES = ["delivery","supply","watch"]`
  (`S/lib/employment/Condition.ts:76`, CLOSED); `ConditionItemRef` =
  `template | chattel | category` (`:96-99`); `holdsFor(item)` (`:254`);
  `watchHolds(watchedSec)` (`:206`); `JobController`
  (`S/platform/idea/cmd/work/JobController.ts:170-251`) parses the
  phrase `deliver … | supply … | watch <place> for <n> hours`;
  `ContractApi.post/claim/fulfill/complete` (`S/api/contract.ts:113-171`);
  `fulfill` is the engine-sealed capture at the destination;
  `job complete` at the board (`docs/subsystems/contract.md:240-271`);
  a player payee needs a primary account. Only the `restocks` brain
  (`S/lib/behavior/restocks.ts`, `job post … --bounty --business` by
  `forceCommand`) posts city gigs today, onto
  `/trade/haulage/thing/works-board` (`/platform/thing/JobBoard`).
- **Wages**: `Position {key, label, noun, wageRate, headcount,
  fulfills}`, `apply` + `clock on/off`, lump at the off-transition;
  `appoint` (alias `hire`); verbs in `platform/cmd/employment/`.
- **Fishmonger**: `T/market/thing/fish-stall.yaml` is a `Stock` with
  `stockLines: []`, `staffingPolicy: self-service` — **consignment
  only** (`consign <fish> --ask N`; fishing D11). `sell` needs a `buys:
  true` line with `from: {store}` per item row (precedent
  `hollow-mere/icehouse/thing/counter.yaml:19`).
- **Corpse** (`S/platform/thing/Corpse.ts:130`): a `Thing`, open
  Container, **no chattel row** (`Good` composes Chattel, `Thing` does
  not); minted with its own identity (`docs/subsystems/mortality.md`
  §*A corpse's own identity*). Carried Goods keep their titles.
- **Magic**: Spell rows
  `packages/content/arcane-library/content/stuff/idea/magic/Spell/*.yaml`
  (glowlight: `cost 10`, `castingProfile {requiredBand, castSeconds}`,
  `durationSeconds 3600`, `effects: [{kind: emit-field, field: light,
  locus: …}]`). The `Effect` union (`S/lib/magic/Effect.ts:48-247`) is
  closed; modifier (held) kinds are only `emit-field` and `cloak`
  (`familyOf :348`). Held lifecycle: pull-reconciled
  (`Vitals.ts:2788-2815`); `renewSustained` (`:2952`) renews only a
  CHARGED host; a cast is term-bought and lapses at `durationSeconds`;
  **no standing mana bill on a caster**. `ThermalRegulation` already
  carries `_ambientOffsetK` (`:279`). `cast` holds `hands + voice`;
  wands `zap` (`packages/content/arcana/content/system/arcana/cmd/magic/zap.yaml`)
  hold no voice. `lint:spell-cost` (`scripts/check-spell-cost.ts`).
- **Verbs** (checked with `grep -rlE "^verbs:.*\b<v>\b" packages/content`):
  FREE — descend, ascend, dive, surface, jump, equalize, float, tug,
  heave, toss, jot, scrawl, lash, rig, inflate, crank, ring, strike,
  spear, wade, inspect, signal, enter. CLAIMED — `haul`
  (`trade-fishing/content/trade/fishing/cmd/fishing/haul.yaml`, trap
  default `here:[capability.trapping]`, `requires: [ToolMixin]`;
  controller 172 lines), `drop` (platform inventory, `mustBeInInventory`
  — worn gear must come off first), `throw/hurl/lob` (platform; `at` a
  person starts a fight), `write` (platform shell — builder authoring),
  `dress` (treat alias), `pump/work` (device, over the `Pumpable`
  protocol `S/lib/pump/Pumpable.ts` — `planPump/completePump`, no
  mixin), `lift` (LoadDevice), `raise` (mining), `recover` (transport),
  `hire` (appoint alias), `light` (ignite alias), `strike`? — free as a
  view (the combat gambit `strike` is not a view). `lint:verb-collisions`
  (`scripts/check-verb-collisions.ts`) refuses any new collision.
- **Documents**: `MarkedMixin` (`S/lib/description/Marked.ts`,
  `markText` authorable, `getMarkText()`); `Chart`
  (`S/platform/thing/Chart.ts` = `ChartedMixin(MarkedMixin(Good))`).
- **Readings**: the water pack ships
  `content/system/water/idea/reading/{water,depth,power}.yaml`
  (`channel: water`, class `/system/water/idea/reading/WaterReading`) —
  `analyze water` exists; no oxygen or tide line in it today.
- **Fishery mint**: `trade-fishing/src/lib/FishingEngagement.ts:402`
  and `HaulController.ts:111` clone `/stuff/agent/<leaf>`;
  `W/idea/FisheryRegistry.ts` `standingAt/draw/release/read`;
  `FISHERY_PATH = /system/water/idea/FisheryRegistry`.
- **Packs**: a trade pack's shape — `trade-ice/{pack.yaml (id, root,
  requires.title [{extent, holder: {organization: /compact/trade}}]),
  package.json (deps by workspace), tsconfig.json, vitest.config.ts,
  src/{lib,thing,idea/cmd/<cat>,idea/reading,behavior,__tests__},
  content/trade/ice/{thing,idea/{Discipline,reading,cmd},cmd/<cat>}}`.
  `pnpm install` after adding a pack. A bad closed-vocabulary word
  fails the whole pack install with one log line.
- **Wire harness**: `packages/wire/src/harness` — `Session.open(handle,
  {startLocation, wizard})`, `cmd()`, `said()`, `prose()`,
  `drainProse()`, `declareFile({file, packs, dirtyReason})`,
  `isOwnedTestWorld()`, `advanceWorldClock`, `worldClockNow`,
  `expectOk/expectRefused/expectNote`. The storage-and-ice drive
  (`packages/wire/tests/storage-and-ice.dirty.wire.test.ts`) is the
  shape: `goto()`, `say()` asserting *understood*, `refusal(r)` reading
  the four refusing note kinds. Wire drives that touch pools:
  maritime-space (#2, #3, #40), storage-and-ice (#2, 3, 8, 9, 12, 16,
  20), climate-and-water (shore ice reads), fishing (`haul`), pump
  (`pump`).

### What the plan corrects in its brief

- "Rubber rewires immersion (thermal)" — it does not; rubber's thermal
  work is the room envelope (`Atmospheric`/`BiomeLogic`). Immersion
  (`immersionOf` → `exchangeWithWater`, `Attired.immerse`) is ice's and
  is on master. This build's thermal touches are `Thermal.ts` (objects)
  and the `immersionOf` call sites, not the envelope.
- Drowning does not need a new rescuable window — it needs the window
  **derived** (cold) and the **stage before it** (blackout, drift).
- `strike` is free as a verb; the combat gambit is not a view.

---

## Plan-level decisions

**D1 — the water-state mixin is `WaterPlaceMixin`, kernel
`S/lib/location/WaterPlace.ts`; `Pool` survives as the kernel
instanceable twin.** `water: { of: <citation>, depthM: <number> }`
(persistent, authorable; `of` is a water citation exactly as
`waters:` values are — a reach ref or an expanse path; `depthM` is the
floor's depth below the water's datum, negative = normally dry).
Derived on read: `levelNow()` (the water's level above datum, m),
`depthNow()` = `levelNow() + depthM`, `stateNow(): 'dry' | 'wading' |
'swimming' | 'frozen'` (`wading` ≤ `water.column.wadeM` 1.5 × the
viewer's stature factor; `frozen` = the read's `frozen`), `hasColumn()`
= `depthNow() > wadeM`. Everything `Pool` did moves here unchanged
(floor-as-support hooks, `canEngageAxis`, `canBeEngagedBy`,
`waterTemperatureK`, `sinks`, `sink`, `sinkWhatSinks`,
`onContainableAdded/Removed`); the host must also compose `Shore`
(the source slot, `drawAt`, the memoised read — the mixin reads its own
water through `peekWaterRead(WATER_KEY)` where `WATER_KEY = 'water'`
is the key `applyWater` registers in `waters` for the place's own
water, so `waterFor()` with no name answers the place itself and
`lint:water-citations` learns the `water` key needs no `details:`
feature — the place IS the feature) and `Swimmable` (the enablement;
D12 strips its gate). `Pool` =
`WaterPlaceMixin(SwimmableMixin(ShoreMixin(SingletonCartesianLocation)))`,
loses `bed` and the ctor floor default (the mixin's `ensureFloor`
override supplies it). Why the name: the mixin says *this place is a
water* — not "swimmable" (a quality), not "watered". `Mixins.WaterPlace
= 'WaterPlaceMixin'`, refusal `"{} isn't a water you can be in"`.

**D2 — the `Medium` is a row kind, not a column on `Biome`.**
`S/platform/idea/Medium.ts` (instanceable Idea) + rows at
`packages/content/platform/content/platform/idea/Medium/{air, water,
vacuum, smoke, blackdamp, stinkdamp, carbon-dioxide}.yaml` carrying
`density`, `thermalConductivity`, `breathable`, `contaminant`,
`supportsCombustion`, `soundHopTau`, `soundCarriesDirection`,
`lightAttenuationPerM: {r, g, b}` (a `Color`-shaped per-meter
transmittance), `drag`. `S/platform/idea/MediumCatalogue.ts` warms
by template-path infix `/idea/Medium/` (the `MaterialCatalogue` reader
rule — never an allowlist of roots; a pack adds a medium by adding a
row). `BiomeLogic`'s four tables are deleted; `BiomeApi.densityOf /
conductivityOf / breathableOf / contaminantOf / isKnownAtmosphere` keep
their signatures and read the catalogue (callers untouched);
`BiomeApi.mediumProps(tag): MediumProps` is the one new read. Reason:
the biome says what the outside AIR is doing; a meter down it says
nothing true, and the slate's census needs properties every seam can
read by tag. `lint:closed-vocabularies` loses the tag list (a win).

**D3 — ONE medium read: `BiomeApi.mediumFor(stuff): MediumRead` (sync)
and the async tag derives from it.** `MediumRead = { tag, temperatureK,
depthM, waterRef: string | null, immersed: boolean }`. Logic
(`BiomeLogic.mediumForImpl`): walk the containment chain outward from
`stuff`: (a) a `Bulkable` ancestor with a non-empty liquid `interior` →
its material's tag, immersed (respiration's `immersedIn`, moved here);
(b) an `Atmospheric` ancestor with an inline `_atmosphere` → that tag
(the bell, D26; a vacuum room); (c) a `WaterPlace` ancestor →
`place.mediumFor(child)` (`'water'` + depth when the floor does not
support the child, else `'air'` at depth 0); (d) else `'air'` (the sync
default; exotic biome atmospheres are the async read's). `BiomeLogic.
resolveAtmosphereFor` consults `mediumFor` first and returns its tag
when `immersed` or a WaterPlace answered, so the two reads cannot
disagree. `Swimmable.immersionOf` is deleted; `ThermalRegulation.
effectiveAmbient/restamp` read `mediumFor`. `Respiration.
resolveCurrentMedium` reads `mediumFor` (a body in a band is immersed
in water — *swimming is at the surface* stays true only in the surface
place). Per-occupant (a body on the ice and one in the water share a
room), which is why it is not a room tag.

**D4 — the LEVEL read lives on the `WaterSource` seam, memoised per
weather segment with a sync peek (the `iceAt/iceAtSync` pattern).**
`WaterSource` gains `levelAt(citation, place, nowS): Promise<number>`
and `levelAtSync(citation, place, nowS): number | null`; `WaterRead`
gains `levelM`, `clarityM` (the depth at which 1 % of surface light
remains), `tide?: { rangeM, phase, rising, nextHighS, nextLowS,
streamMps }` and `state: WaterState` (the fishery's ten numbers — the
bands and the life findings read them). `WatercourseCatalogue`: level
= 0 at a non-tidal node; at a tidal node (one whose course reaches the
sea within `water.tide.reachM` of elevation, derived from the compiled
index — the estuary node at elevation 0, never the confluence at 30) =
the sea's tide term; `levelCache` keyed by ref, cleared with
`rollIceCache`'s segment. `WaterExpanse`: `tidal: { rangeM, lagH }`
(authorable; the Greywater authors `rangeM 3`); level = the tide term.
The tide term is `W/lib/Tide.ts`, a value object (`/system/water/lib`,
inherited substrate): `Tide.at(profile, synodicDays, rangeM, lagS,
nowS)` → `{ levelM, phase, rising, nextHighS, nextLowS, streamFactor }`
with the lunar day = `dayLength × synodic / (synodic − 1)` (30-day month
⇒ 24 h 50 m; semidiurnal period half of it ⇒ the tide ~50 min later
each day), springs/neaps `1 + 0.3·cos(4π·moonPhase)` (max at new and
full), `streamFactor = −sin(2π·t/period)` (peak at mid-tide, 0 at the
turn). The moon comes from `CelestialApi.moonPhase(time)` (kernel,
`S/api/celestial.ts:140`). **`waterStateAt`'s salinity branch
(`:785-790`) is replaced**: at a tidal node salinity = sea salinity at
the flood, brackish at the ebb, interpolated by phase; elsewhere as
before. Nothing pushes a level into rooms; `WaterPlace.levelNow()` is
`peekWaterRead().levelM ?? 0` with the refresh kicked.

**D5 — the column is one singleton `ColumnWarren` in the water pack,
members keyed `<surfacePath>/<band>`.** `W/idea/ColumnWarren.ts`
(`/system/water/idea/ColumnWarren`, row `column.yaml`) =
`SingletonMixin(PersistableMixin(InnerWarren))` on the `MineWarren`
shape: `bandFor(surface, band)` → `_budOne` (serialized:
`createMemberSerialized` with `_budType`, `addMember`, `setCoordinates
([x, y, z − n])` from the surface's coords (no zone registration —
bands are not addressable cells; `isOnGrade` reads z<0 for the bed),
`PersistableApi.restoreOrSeed(room, key)`, `wire(room)`); `reconcile`
reaps an empty band whose surface is unloaded or whose derived band set
no longer contains it; `admitArrival`/`attachmentFor` no-ops;
`wireHubExit` overridden wholesale. Band rows are the water pack's
(`/system/water/location/band/{lit,dark,bed}.yaml`, class
`/system/water/location/Band` =
`WaterPlaceMixin(SwimmableMixin(ShoreMixin(WarrenMemberMixin(
PersistableMixin(CartesianLocation)))))`, with `surface` (identity
ref to the surface place) and `band` fields stamped at bud; a band's
`water` is derived from its surface — it authors nothing). Why one
singleton: a column needs no per-venue policy rows (MineWarren's reason
for being per-mine); the band templates are the system's and a second
water needs zero rows.

**D6 — bands derive from the water's numbers.** `WaterPlace.bandsNow()`
over `d = depthNow()`, `wade = water.column.wadeM` (1.5), `lit =
clarityM` from the read (a sea 10 m, the Kestrel 3 m, Hollow Mere 8 m —
derived from `contamination`/turbidity with a per-water `clarityM`
override authorable on the course/expanse row): `[]` when `d ≤ wade`;
else `lit` when `d > wade + water.column.minBandM` (2), `dark` when
`d > lit + minBandM`, and always `bed`. Hollow Mere (5 m, clear):
surface · lit · bed. The Wharfside basin (6 m, clarity 3): surface ·
lit · dark · bed. The cistern (3 m): surface · bed. A sea node (70 m):
surface · lit · dark · bed. The thermocline is a deferred seam (§
Deferred). Band depth for the breath/pressure arithmetic: lit =
`wade + (litDepth − wade)/2`, dark = `(litDepth + d)/2`, bed = `d`.

**D7 — `down`/`up` are `ColumnExit`s the Warren supplies; sideways
copies the surface's water exits; authored neighbors are declared on
the surface row.** `W/idea/exits/ColumnExit.ts` extends
`DeferredDestinationExit` with `{surface, band, sense: 'down' | 'up' |
'sideways' | 'neighbor', neighbourPath?}`; `computeDestination` asks
the Warren for `bandFor(surface, band)` (buds on first traversal) or
resolves the neighbor path. `media: ['water']` on every column exit
(swim), plus `['ground']` on bed-band sideways exits (the hard-hat
walks the bed). The surface place's `down` is installed by
`WaterPlace.ensureColumnExits()` at `postRegister`/on the first
`descend` when `hasColumn()`; a surface place that already authors
`down` keeps it and the column is reached only by `descend` (D19) —
**Wharfside's bank is not the water: its `down` → knackers stays**; the
water below the quay is a NEW place (D23) whose own `down` is free.
Sideways: when the Warren buds band B of surface S it copies each exit
of S whose destination is a WaterPlace with a column and whose
`media` includes `water` as a `sideways` ColumnExit to the same band
of that destination (lazy, budded on traversal). Neighbors: the
surface row's `column: { neighbors: [{ band, direction, destination,
opposite? }] }` (authorable) — each becomes a `neighbor` ColumnExit
on that band plus the reverse exit on the authored room (installed when
the band buds, via the authored room's `Exitable.addBidirectionalExit`
with `keepLiveDestination`). The under-ice ceiling: a column `up`
exit's `canTraverse` refuses when the destination surface's floor is
slotted and `openWaterAreaM2() === 0` — *"The ice is a ceiling over
you; the only way up is the hole."* (the hole is open water in the
sheet's log, so `up` into a cut hole is admitted).

**D8 — non-bed bands get a NON-BEARING floor; the bed is ground.**
`W/thing/OpenWater.ts` (`/system/water/thing/OpenWater`, row
`open-water.yaml`) extends `FloorBase`: `bears → false`,
`supportIsSlotted → true`, `openWaterAreaM2 → 1`, `canOccupyReason →
"There is nothing under you but water."`, `giveWay` no-op (you are
already in the water), `resolveUnderfoot` → kind `contrived` is wrong
here — the floor's material is water, the derived kind stays whatever
the fold answers (a test pins `sit` refused in words). The lit/dark
band rows author `floor: { template: /system/water/thing/open-water }`;
the bed row authors nothing — `ensureFloor` mints the default floor,
on grade by z<0, material from the surface's water `bottom` (the
expanse's `bottomAt`, a course node's `bed`, default loam) via
`floor: { material }` stamped at bud. `noDefaultFloor` stays the void's.
This reuses `WaterSurface.canOccupyReason`'s pattern so `sit` in a
band refuses in physics words (seam 8).

**D9 — sinking retargets to the bed band; `pool-bottom` retires.**
`WaterPlace.sink(thing)` → `ColumnWarren.bandFor(this, 'bed')` then
`ContainmentApi.move`; a water place with no column keeps the thing on
its own floor (it is standable water). In a band: a thing that sinks
goes to the bed; one that floats (density < the water's) goes to the
surface place; a neutral body stays. `sinkWhatSinks` keeps its name
(IceSheet's duck call). `PoolBottom.ts`, its row, the `bed` census
key, and Hollow Mere's `bed:` + prop are deleted. Floaters dropped at
the surface stay in the surface place (the strandline, D25, is what
moves them).

**D10 — breath is store ÷ burn with two clocks, on `RespirationMixin`.**
Runtime fields: `o2StoreL`, `co2Urge` (0..1), `holdStartedS`,
`gasLoad: number[]` (D27). `lungVolumeL` = `BodyPlan.lungVolumeL` (new,
default 6) × (stature/baseStature)³. Burn (L O₂/s) = basal
`respiration.basalO2LPerMin` 0.3/60 × `powerFactor` (the body's current
power over `sustainableW`, read from a new `Exerting.currentPowerW()` —
the last `exert`'s power, decaying over 30 s) × `coldFactor` (0.8 below
288 K, the dive reflex) × `conditioning` (wind band: untrained ×1.2 →
expert ×0.8). While immersed and not exchanging: the store drains at
`burn × (1 − intake)` (intake from the apparatus × medium, D21), the
urge rises at `burn / lungVolume × respiration.urgePerLitre`, spoken on
`self.body` at three crossings (*"You want to breathe." · "Your chest
is burning." · "You can't hold it much longer."* — the exertion
`noteBodyState` pattern, ONE line per crossing). Store at 0 → spo2
drains at the shipped rate → the blackout (existing path) with **no
cue before it**. `inhale()` fills the store to lung volume **only when
exchanging** (#94: immersed ⇒ *"There is nothing to breathe here."*,
a controller-rejected note); repeated `inhale` within 10 s lowers the
starting urge by 0.15 each (hyperventilation: no oxygen added, the
warning delayed). `exhale()` sets the store to the residual (0.2 ×
lung volume). `_heldBreathUntil`, `INHALE_HOLD_SEC`,
`UNPREPARED_GRACE_SEC` and the grace branch are deleted; the reflex
hold is the store itself. Surfacing fills the store over the recovery
engagement. Blackout → neutral depth (D14): a limp body above its
neutral depth drifts to the surface place **face-down** (no roll; a
drowning victim floats face-down), below it sinks to the bed; dying
begins when spo2 dwells at the floor — `beginDying('asphyxiation',
windowSec)` with `windowSec = 90 × coldFactor`, `coldFactor = clamp(1
+ (288 − waterK)/8, 1, 4)` (ice water ~6 min — the cold-water survival
lesson); rescue = reaching air (a hauled/carried body at the surface
face-up, or on land) → the recovery engagement → `aspiration`
Condition afflicted on any body that blacked out under water (law
`stage`, intervals of a game-hour, three stages: cough → fever →
drowning in bed; resolved by `treat`; self-limits at stage 1 only if
treated). `applyDeath` references in the doc are corrected to
`beginDying`.

**D11 — a disconnected body is held at the surface.**
`Avatar.onLinkdead()` → if `BiomeApi.mediumFor(this).immersed` and the
medium is water: `WaterPlace.holdAtSurface(body)` — move the body to the
column's surface place (`ascend` by the engine, the one time it moves
you), set runtime `heldAtSurface = true` on the body (an `Avatar`
field; respiration reads it as *face-up, exchanging*; sink/drift skips
it; the dying clock is not touched — a body already dying stays dying,
as the clock's own rule says). Cleared in `enter()` (the reconnect)
and when anyone moves the body. The strand/offline case: a linkdead or
logged-out body resting in a WaterPlace whose state becomes `swimming`
(the flood): `WaterPlace.reconcileOccupants()` (called on any entry,
`look`, and the Shore memo refresh when `levelM` changes) applies the
same hold and emits *"The water is coming in."* to every sensor in the
place. Animals and NPCs: the physics (no hold). Recorded as the
water-only answer; the general rule is physiology-slate's.

**D12 — swimming is a COST, never a check.** Delete
`SWIMMING_CAPABILITY_PROP`, `difficulty`, and the gate in
`Swimmable.canBeEngagedBy` (now: the body's plan lists `swim`).
`RespirationMixin`'s immersion beat (every drain/recovery tick while
immersed at the surface and unsupported) calls `exert({durationS: tick,
powerW: treadW})` where `treadW = exertion.treadW` 150 × technique
(swimming Discipline band: untrained 3.0, novice 2.0, competent 1.3,
proficient 1.0, expert 0.8) × buoyancyFactor (D14: positive buoyancy
→ 0.5, negative → 2+). When endurance reaches the floor (`spent`) and
the body is unsupported in water over its head, the body **goes
under**: moved to the lit band (or the bed when there is no lit band)
by the place, silently (the instinctive drowning response: for the
60 s before going under the body carries runtime `drowningResponse =
true` — `Vocal.canVocalize()` refuses, emotes still work (the aether),
and only `get`/`grab` of a floating thing within reach succeeds,
making it supported). `float` (D19) sets `floating = true` (swimming
band ≥ novice): zero tread cost, speech works, nothing else does
(posture-like). Wading (floor bears) costs nothing. The swimming
Discipline row (`platform/idea/Discipline/swimming.yaml`, `channel:
skill`) is credited by swim traverses and tread ticks (`creditDeed`
per game-minute). `wind.yaml`'s *"the first real conferral is the
swim"* is edited to say the conferral was retired and the swim is a cost.

**D13 — cold shock.** On immersion onset (a transition of `mediumFor`
to water, detected in `Respiration.reassess`) in water below
`respiration.coldShockK` 288: the store is cut to half, the urge set to
0.6, and the cue *"The cold takes your breath."* — one event, 60 s
cooldown. A body that `inhale`d first and jumped loses that half too
(AC: *cold water costs breath on entry*).

**D14 — net buoyancy is a `LoadBearing` read.**
`getDisplacedVolumeM3()` = Σ over the body (mass ÷ `getBodyDensity()`
+ lung air `o2StoreL`-scaled by pressure `1/(1 + depthM/10)`) and every
carried/worn item (mass ÷ material density; a sealed Vessel with a gas
interior counts its interior volume); `getNetBuoyancyN(waterDensity)`
= `g × (waterDensity × V − Σ mass)`. Consumers: `WaterPlace`'s
descent/ascent duration (`traverse` of a column exit takes `bandGapM /
v`, `v = clamp(|F|/k, 0.2, 2) m/s` plus the swimmer's thrust, `exertion.
swimThrustN` 40 × technique); `ascend` refuses when `F + thrust < 0`
(*"You are too heavy to swim up — drop something."*; never a skill
refusal); `drop belt`/dropping the ingot always works (D16). Armor
(density ~7800) sinks you fast and defeats the thrust; a cork float
holds a body up (D12's grab).

**D15 — equalizing caps the descent.** Each `down` traversal accrues
`pressureDebtM += bandGapM`; `equalize` (D19) zeroes it; crossing a
band with debt ≥ `respiration.squeezeAtM` (3 m, raised by the diving
Discipline band to 6/9/12/unbounded) afflicts `squeeze` (pain: a
`self.body` cue + a reserve signature); a second crossing with debt ≥
2× afflicts `burst-eardrum` (vertigo: `requiresPosed` verbs refuse for
its first stage; self-limiting, law `decay` over three game-days).
Descending with `equalize` between bands never hurts. An expert never
needs to type it.

**D16 — `drop belt`: `Wearable.quickRelease`.** New authorable field on
`WearableMixin` (default false); `mustBeInInventory` admits a worn
item whose row says `quickRelease: true`; `DropController` unslots it
then drops. The belt row authors it. A dropped belt sinks to the bed
unless `line` (a live weak ref on the belt, set by `lash`, D19) names
a lifeline — then it hangs at the line's fixed end (the tender hauls it
back).

**D17 — gigs: one new template and one new item ref.** `inspection`
joins `CONDITION_TEMPLATES`: `holdsFor` = the claimant's chronicle
carries an `inspected` deed on the bound item's identity path dated
after `postedAt` (deeds are engine-sealed: `PersonaMixin.recordDeed`,
`S/api/identity.ts`). The phrase: `job post inspect <works> for N`.
`ConditionItemRef` gains `{ kind: 'identity', identityPath }` —
`delivery` of THAT instance (the corpse has no chattel but has an
identity): phrase `job post recover <body> to <place> for N`. The
anchor is `deliver <anchor> to the bank for N` (chattel, shipped). The
contract doc's rule holds: a new template is a new predicate, never a
chokepoint. `inspect` is a kernel verb (D19) over an `Inspectable`
shape (`inspectionReport(viewer): Mml`; `Conduit` implements it —
fouled/cut/silted in its own words) that records the deed.

**D18 — magic: two modifier effect kinds and the standing bill.**
`Effect` gains `{ kind: 'confer-medium', medium }` (breathe-water: the
host's breathing set gains `{medium: 'water', apparatus: 'working',
intake: 1}` while held) and `{ kind: 'offset-ambient', deltaK }`
(keep-warm: `ThermalRegulation._ambientOffsetK += deltaK` while held);
both `modifier` in `familyOf`. The standing bill: the sustained
reconcile (`Vitals.ts:2788-2815`) debits the CASTER's `mana` reserve at
`magic.charge.standbyWatts × attentionFactor` per second for a
caster-held modifier (today only a charged host pays); at zero mana the
binding lapses — *you have your breath to get up on* (the store is full
of water-breathing's oxygen until the lapse; D10's arithmetic takes
over). `cast` underwater: `CastActivity` asks `Vocal.canVocalize()`
before engaging the `voice` slot — refused *"You cannot speak the words
here."*; `zap` is untouched. Breathe-water sets `gasLoad` accrual off
(no compressed gas). Rows: `arcane-library …/Spell/breathe-water.yaml`
(cost 40, `durationSeconds 900`, band competent) and `keep-warm.yaml`
(cost 20, `deltaK +12`); `lint:spell-cost` passes rows without
`joules`. A `wand-of-glowlight` row (arcane-library, a `Wand` with the
glowlight binding) is stocked by the dive master so *a wand works* is
drivable.

**D19 — verbs.** Kernel (platform pack): `descend` [aliases `dive`,
`jump`] and `ascend` [alias `surface`] (`cmd/movement/`, one
`DescendController` with a sense: on a `Shore` that is not itself a
water place → traverse the exit whose destination is a WaterPlace
(`jump` = the same, into the water; the steps are `climb` with the
`Ladder`); in a water place → the column `down`/`up` with mode `swim`,
or `walk` on a bed sideways, refused in words for a weighted diver;
afforded by `ShoreMixin.DRAW_VERBS` and `WaterPlaceMixin`'s
`inventory` bucket); `equalize` and `float` (`cmd/posture/`, afforded
by `WaterPlaceMixin`); `haul` (`cmd/inventory/haul.yaml`, over a kernel
`Haulable` shape `S/lib/spatial/Haulable.ts` — `planHaul(by, sense?)`
/ `completeHaul(by, token)`, the `Workable` discipline; **fishing's
`haul.yaml` and `HaulController.ts` are deleted and `Trap` implements
`Haulable`** — the ladder's rung 1, unify behind an interface; the
view's target is `requires: any`, scope reachable, narrowed by shape);
`inspect` (`cmd/work/inspect.yaml`, over `Inspectable`). Diving pack
(`content/trade/diving/cmd/diving/`): `tug <line>` (a line signal: one
= *ok*, two = *haul me up*, three = *more line*; delivered to whoever
holds the other end, any medium), `heave <line> to <person>` (throw a
lifeline's free end to someone within reach; the target may `get` it),
`jot <text> on <slate>` (writes `markText` of a `Slate` whose row says
`writableUnderwater: true`; a grease pencil in hand), `ring <bell>`
(a hearing-modality scene to every sensor in the column, direction
null), `spear <fish>` (D21: the band's seeded fish → the fishery's
`draw` + the fishing mint), `lash <thing> to <thing>` (ties a line or
an air vessel to a load; the pair floats or sinks as one — the lift).
Reused, no new words: `wear`/`remove` (helmet, dress, boots, belt),
`pump`/`work` (the air pump is `Pumpable`), `appoint`/`apply`/`clock`,
`job`/`fulfill`, `consign`/`buy`, `read` (tables, almanac), `analyze
water`, `cast`/`zap`, `climb` (the quay steps are a `Ladder`), `drop`
(D16), `get` (grab a float or a thrown line). `write`, `throw`,
`dress`, `lift`, `raise`, `recover`, `hire`, `crank`, `lower` are not
claimed. The bell is lowered and raised with `haul <bell> down|up` on
the hoist (one verb, a sense).

**D20 — the fishmonger stays a consignment shelf; `consign` is the
sale.** Fishing D11 decided the stall pays nobody until a buyer buys,
and `sell` needs a `buys: true` line per ITEM ROW — unbounded for fish
species, and a category-bound buys line is a retail kernel change out
of this scope. The AC *a diver can spear a fish and sell it* is met by
`consign <fish> --ask N` listing it on the slab (the drive asserts the
listing). Confirmed by the founder, 2026-10-18.

**D21 — the five life findings.** (1) **Breathing is a rate**:
`BodyPlan.breathing: BreathingSpec[]` (`{medium, apparatus, intake}`,
intake 0..1 of basal need) replaces `breathableMedia` (the field is
deleted — no migration, rows edited: biped/quadruped `[{air, lungs,
1}]`, fish `[{water, gills, 1}]`, crustacean `[{water, gills, 1},
{air, gills, 0.4}]`); `getBreathableMedia()` becomes derived (media
with intake ≥ 1) for every existing caller; the drain runs at `burn ×
(1 − intake)` so a frog under water (`skin` 0.25) lasts four times a
human and must still surface, an eel on land (`skin` 0.3) crosses a
field. (2) **Apparatus by stage**: `Species.breathingByStage?:
Partial<Record<LifeStage, BreathingSpec[]>>` overrides the plan's for
that stage (the bullfrog row: `newborn: [{water, gills, 1}]`,
`juvenile: [{water, gills, 0.6}, {air, lungs, 0.6}]`); `Organism.
getLifeStage` already derives the stage. (3) **Senses by apparatus ×
medium**: `sensoryPorts[].media?: string[]` (default `['air',
'water']` for vision/touch/hearing, `['air']` for smell/taste —
*you would inhale*); `PerceptionApi`'s modality read drops a port whose
media exclude the viewer's medium (`smell` underwater refuses in the
body's words; a shark's row says `[water]`); `BodyPlan.voice: {media}`
(default `['air']`; merfolk `['air','water']`) is what `Vocal.
canVocalize()` reads against `mediumFor`. (4) **Dissolved oxygen
derived**: `WaterExpanse.waterStateAt` computes `oxygenMgL` =
saturation(T, salinity) × mixing(sea state roughness) — the hard-coded
8 goes; a tidepool's water (D25) decays O₂ by hours isolated ×
temperature × `water.tidepool.o2DecayPerHour`; a `Feeder` bowl's
fouled water already reads low. Fish respiration consumes
`state.oxygenMgL` against its habitat tolerance: intake = clamp((O₂ −
min)/margin) — below it the drain runs (the trout in foul water dies).
(5) **Salinity by stage**: `Species.habitatByStage?` overrides
tolerances per stage; the tide replaces the salinity function (D4).

**D22 — prose banks with seeded variation.** Each band row carries
`proseBank: { arrival: string[], look: string[] }` (6–8 lines each,
Liquid-templated); `Band.getLongDescription()` picks by
`Seeded(surfacePath, band, gameHour)` (`S/lib/Seeded.ts`, the fishing
precedent) and appends the derived delta lines (light band, clarity,
water temperature in words, what lies here, the bed's material, the
current). No two consecutive `look`s in one hour read differently; two
columns read differently.

**D23 — the Wharfside water is a NEW place below the quay.**
`T/wharfside/location/basin.yaml` (`Pool`, `water: {of:
kestrel:confluence, depthM: 6}`, `_biomePath` open-water, `column:
{neighbors: [{band: dark, direction: upstream, destination:
…/wharfside/location/intake-mouth}]}`, props `quay-steps` (a `Ladder`
row, `axes: [up]`), exits `up` → bank `media: [vertical]`). The bank
gains `exits.river: {destination: basin, media: [water, vertical]}`
(the `descend`/`jump` target; `climb down` with the bank's own
`quay-steps` prop, `axes: [down]`) — and keeps `down` → knackers. The
intake mouth `T/wharfside/location/intake-mouth.yaml` is an authored
WaterPlace (`Pool`, `depthM: 5`, no column of its own: the
`column.neighbors` link is its way in and out; props `intake-screen`
— the works' underwater face, `Inspectable` via the intake Conduit it
cites) — *the bespoke case is authored rooms beside the column*. A
second water place under the outfall is NOT authored (the wall refusal
is `climb wall` with no ladder named wall).

**D24 — the three existing waters migrate.** Hollow Mere pool:
`water: {of: hollowmere:mere, depthM: 5}`, keeps `floor: sheet` and
the `mere` detail (so `look mere` and the draw keep working — `waters:`
is deleted, the mixin registers its own key), loses `bed:` and the
pool-bottom prop. Estuary pool: `water: {of:
/stuff/idea/WaterExpanse/greywater, depthM: 4}`. The cistern: `class:
/platform/location/Pool`, `water: {of: duncan:cistern, depthM: 3}`
with a one-node Watercourse row
`eternal-university/content/stuff/idea/Watercourse/duncan.yaml`
(`site` of the campus, elevation 35 − 4, `meanDepthM 3`); `_atmosphere:
water` deleted; the steps keep the tank and compressor. Every row that
cited these pools' `waters:` keys keeps its `details:`.

**D25 — the tide, from the shore.** Greywater `tidal: {rangeM: 3,
lagH: 0}`. The estuary gains: `channel.yaml` (`Pool`, `water: {of:
greywater, depthM: 3}`, off the mouth's new `channel` exit `media:
[water]`, the mouth gains `waters: {channel: greywater}` + a `channel`
detail so it is a shore; its `tide` WaterFixture prop is deleted — the
channel is the brine source), `tidepool.yaml` (`Pool`, `depthM: −0.5`,
off the strand's `rocks` exit; `cast:` one shipped fish row for the
drive — the builder picks a trade-fishing agent row with an estuary
habitat, e.g. the gray mullet), `strandline.yaml` (`Pool`, `depthM:
−1.3`, between strand and headland; `tide: { collectsFrom:
[…/estuary/channel] }`). The strandline's `reconcileOccupants` (on
entry/look) moves every floating Thing that has lain in a `collectsFrom`
place since before the last high water onto itself — the realm's
drift, load-on-use through an authored forward ref. The strand's `look`
reads the tide in words (*the tide is on the turn; the rocks at the
point are covered*) from the read's `tide`. The mouth's `analyze
water` and `look channel` read the stream (`streamMps` = `tide.
streamFactor × water.tide.peakStreamMps` 1.2) and slack at the turn.

**D26 — the bell is `AirPocketMixin` on `ExitableVessel`.**
`W/lib/AirPocket.ts` (`/system/water/lib/AirPocket`): `airM3` (the
stock at 1 atm, authorable), `waterlineFraction()` = `1 − 1/(1 +
depthM/10)` (Boyle, depth from `mediumFor(host)`), `refresh(vesselOfAir)`
(resets `_atmosphereContents` and the stock). `ExitableVessel`
already composes `Atmospheric`, so the host authors `_atmosphere: air`;
a body inside breathes it through D3's step (b); fouling is the
shipped `addAtmosphereContent` — `RespirationMixin.exhaleInto(scope)`
adds CO₂ (`/stuff/idea/material/bulk/carbon-dioxide`) at the breather's
burn rate each tick into an `Atmospheric` Thing ancestor (rooms are
untouched: their ventilation is rubber's), and the displacement floor
does the rest; a lamp inside burns the same air. The `Bell`
(`/trade/diving/thing/Bell` = `AirPocketMixin(ExitableVessel)`) hangs
on the hoist's cable: `Hoist` (`/trade/diving/thing/Hoist`, a Tool on
the Derrick shape) implements `Haulable` — `haul bell down|up` moves
the bell one band along the column its place names. A weighted barrel
(`air-barrel.yaml`, a sealed `Vessel` of air) carried into the bell
and `open`ed refreshes it. The caisson is a later host of the same
mixin (the craft size rule) — deferred.

**D27 — the hard-hat suit on the worn-supply path; the bends on
respiration.** `helmet.yaml` is an **`AirTank` row** (slot `head`,
capacity 4 L, `interiorMaterial` air) — the suit and the tank share
one supply path; `dress.yaml` and `boots.yaml` are wearable rows (lead
boots mass 18 kg: negative buoyancy, you walk the bed and cannot swim
up); the hose is a `Lifeline` row (`kind: hose`) whose fixed end is the
`AirPump` (`/trade/diving/thing/AirPump`, a Tool implementing
`Pumpable`: each spell pushes `pump.litresPerSpell` into the helmet
interior at the hose's far end; an NPC `cranks` brain repeats `pump`
while a diver is on the hose) and whose diver end is the helmet. Pump
stops → the helmet drains at `TANK_TAP_PER_SEC` → the `supply` crisis →
`tug` twice → the tender `haul`s. Gas load: `RespirationMixin.gasLoad
[3]` (Haldane half-times 5/20/60 min at the ambient pressure `1 +
depthM/10` atm) accrues whenever the breathed medium comes from a
worn supply or a pocket at depth > 0; on surfacing with any
compartment over its M-value → `decompression-sickness` afflicted after
`respiration.dcsOnsetMin` 20 min (law `stage`: joints → neurological →
dying), relieved by returning below the band whose pressure clears it
(recompression) or by `treat`; `dive-tables.yaml` (Marked) prints the
stops per band and bottom time; the stop is dwelling in a band.
`narcosis` (deeper than 30 m on a supply) ships as a row + the check;
nothing shipped is that deep. Free divers and breathe-water never load.

**D28 — combat underwater.** `WeaponProfile.derive` takes `medium?:
{drag}`: swung forms (bladed, hafted, flail, blunted) multiply tempo
and poise-damage by `1/(1 + 4·drag)`; pointed by `1/(1 + 0.5·drag)`;
`CombatLogic.weaponProfileOfImpl` passes `mediumProps(mediumFor
(wielder).tag).drag`. `DeliveryProfile.derive`: thrown range capped at
`close` in water; `Launcher` gains `worksIn(medium)` (tension-launchers
refuse: *"The string will not draw under water."*). `arenaMaxBandFor`
takes `min(extent cap, clarity cap)` from the read. `subdue`'s
`grappled` flag: a grappled body's `ascend` is refused (*"You are
held."*) — holding someone under is the breath model. `Morale.pressure`
adds `+0.4 × urge` (an input from `co2Urge`); a broken fighter flees
UP (the column's `up`). The drowning grab: a body in `drowningResponse`
whose room contains another body within reach auto-lands `subdue` on
it (the rescuer is grappled, pays tread for two, and *reach, throw,
don't go* is derived). `disarm.needsTargetArmed` widens to any worn
item whose row says `quickRelease` or any held item: landing it on a
helmet unseats it (the supply crisis, in a fight).

**D29 — the twelve seams, placed.** (1) `BiomeLogic.airShareOf` returns
0 when the scope's `mediumFor` tag has `supportsCombustion: false`;
`igniteImpl` gates first — *"There is no air here for a flame."*
(reason `no-air`). (2) `WaterPlace.onContainableAdded`: every arriving
`Wet` thing that is immersed → `wet(1)`; `Attired` bodies → `immerse()`;
paper/ink read wetness in prose only (a `Marked` thing at `wet ≥ 0.5`
reads *the ink has run* — the one new consumer; bandages/tinder are
later). (3) `Thermal.restamp` caches `mediumTag` + the water's
temperature from `mediumFor`; `mediumConductivity` reads the cached tag
(sealed still vacuum). (4) a band/water place is already a `Shore`
(the source); an open vessel inside a water place fills with the water
on arrival (`BulkableLogic`: `onContainableAdded` of an open, empty
Bulkable in an immersing place → `transfer` from the place's slot);
salt water: `salt-water.yaml` gains a hydration debit and a
`toxicity` dose against a new `metabolism/salt-poisoning.yaml`
Condition (the builder matches the row's toxin vocabulary —
`Metabolic.NUTRIENT_ROUTING :359` and the shipped toxin rows — and
pins *drink from the estuary → thirstier, then ill*). (5)
`Vocal.canVocalize(): {ok} | {refusal}` reads `voice.media` ×
`mediumFor`; `vocalEmit` refuses in words; `Talk`, `Pilot`, `Order`
and `CastActivity` ask it first. (6) `Metabolic.canIngest(phase)`:
an immersed air-breather cannot drink or eat (*"You would take in
water."*); `Drink`/`Sip`/`Eat` ask before transferring (the order fix).
(7) D28. (8) D8. (9) `VisionModality.ownFlux` of a WaterPlace band
= the surface place's flux × `transmittance^depth` per channel (the
Medium's per-meter color × clarity); `mergeAttenuated` multiplies the
same color over a column leg — red goes first, blood reads black;
`Band.getAmbientFlux()` reads its surface (an authored ref). (10)
`LocomotionLogic.canTraverseExit`: a ground mode into a destination
whose `stateNow()` is `swimming` or deeper is refused — *"You would be
in over your head there; swim, or go down to it."* (gate `medium`).
(11) `AudienceGather.walkOutward`: `PER_HOP_TAU` ← the medium's
`soundHopTau` (water 0.3), direction `null` while in water; `ring`
rides it. (12) `ElectricityLogic.buildConductiveGraph`: a WaterPlace
room's pool material is its water's draw material (fresh vs salt);
everyone immersed is in the graph.

**D30 — where the code lives (the pack map).**

| what | where | why |
|---|---|---|
| `WaterPlaceMixin`, `Haulable`, `Inspectable`, the `Medium` Idea + catalogue, `BiomeApi.mediumFor`, breath/buoyancy/pressure/gas-load, the seams, `descend`/`ascend`/`equalize`/`float`/`haul`/`inspect`, the swimming + diving Discipline rows, the Condition rows, the two Effect kinds | kernel + platform pack | composed/read by classes with no common pack ancestor; any body swims and dives |
| `ColumnWarren`, `Band`, `ColumnExit`, `OpenWater`, `Tide`, `AirPocketMixin`, the level/tide reads, the band rows and their prose banks, the column biome row | `water` pack (`/system/water`) | true whether or not anyone dives |
| `Lifeline`, `Bell`, `Hoist`, `AirPump`, `TideAlmanac`, `Slate`, the gear rows, `tug`/`heave`/`jot`/`ring`/`spear`/`lash`, the `tends`/`cranks`/`surveys` brains, the dive tables | new `trade-diving` pack (`/trade/diving`, depends on water, trade-fishing, trade-shopkeeping, platform) | practised and quittable; owns no resource |
| the basin, intake mouth, quay steps, the heaving line, the dive shop, its outfit and cast, the harbor works department, the lost anchor, the estuary's channel/tidepool/strandline | `terminus` | the venue; a second site is rows |
| breathe-water, keep-warm, wand-of-glowlight | `arcane-library` | rows beside glowlight |
| the cistern's water row | `eternal-university` | its locality |

---

## ⭐⭐ Host placement

| new thing | host | what composing/placing it claims |
|---|---|---|
| `WaterPlaceMixin` + `water` field | `Pool` (kernel twin) and the water pack's `Band`; authored WaterPlaces are `Pool` rows | only a place that cites a water is water. ⛔ NOT on `Location`, not on `Shore`/`Quay` (a bank is beside water, not in it) — the guard *is this place water* must never be needed. A host must also compose `Shore` + `Swimmable` (a class rule, pinned by a test, not a runtime guard) |
| `column` neighbors field | `WaterPlaceMixin` | the surface declares what lies beside its column; a band never authors |
| `surface`, `band` identity stamps | `Band` only | a band knows its surface; nothing else does |
| `heldAtSurface`, `drowningResponse`, `floating` | `Avatar` (`heldAtSurface`); `RespirationMixin` (`drowningResponse`, `floating`) | the hold is a player-connection fact (Avatar only); the response and the float are breathing states any breather can have |
| `o2StoreL`, `co2Urge`, `gasLoad`, `pressureDebtM`, the burn | `RespirationMixin` | the gas you breathe and the pressure it is at are respiration's physics; ⛔ not on `Vitals`, not on `Exerting` ("breath" there is endurance) |
| `lungVolumeL`, `breathing[]`, `voice.media`, `sensoryPorts[].media` | `BodyPlan` (species overrides on `Species`) | anatomy is the plan's; a species specialises by stage |
| `getNetBuoyancyN`, `getDisplacedVolumeM3` | `LoadBearingMixin` | whatever bears a load has a buoyancy; the water asks |
| `quickRelease` | `WearableMixin` | any worn thing may be quick-release (a belt, a helmet); the drop verb reads it |
| `Medium` rows, `MediumCatalogue` | `platform/idea/` | a medium is a kernel vocabulary any pack extends by a row |
| `mediumFor` | `BiomeApi`/`BiomeLogic` | the one place that already walks the atmosphere chain |
| `OpenWater` floor | the lit/dark band rows' `floor:` | a non-bearing floor is a FLOOR (the posture refusal reuses the protocol); ⛔ never `noDefaultFloor` on a band |
| `AirPocketMixin` | `ExitableVessel` hosts in the diving pack (`Bell`); a Location later | *a thing you can go inside is a place with air* — ExitableVessel already earned `Atmospheric`; the pocket adds depth |
| `Haulable`, `Inspectable` | shapes (interfaces), implemented by `Trap`, `Lifeline`, `Hoist`, `Conduit` | the Workable/Pumpable category — no mixin, a controller narrows by shape |
| `inspection` template, `identity` ref | `Condition` (employment) | a predicate the engine can check; no chokepoint |
| `confer-medium`, `offset-ambient` | `Effect` union; realized on the HOST body (`RespirationMixin.conferredBreathing`, `ThermalRegulation._ambientOffsetK`) | held workings act on the body that holds them |
| the standing bill | the sustained reconcile on `Vitals` debiting the caster's `mana` | the caster pays, as a charged item pays |
| `treadW`, swim/diving competence reads | `RespirationMixin`'s immersion beat calling `Exerting.exert` | the beat that already runs while immersed; exertion stays the one ledger |
| `ColumnExit` | `DeferredDestinationExit` subclass | the lazy far side, exactly DormDoor's shape |
| `Tide` | `W/lib/Tide.ts` value object | read by the catalogue and the expanse; nothing instances it |

The narrowing test: nothing in this plan adds `if (isWaterPlace(x))`
to a base class. The three places a guard was tempting and was
refused: `Location.ensureFloor` (the mixin overrides it), `Avatar.
onLinkdead` (asks `mediumFor`, a read every body has), `Vocal` (asks
the plan's voice media, a read every speaker has).

---

## Convention conformance

- **`props:`/`cast:`** on every new place row; no `populates:`,
  no `container:`. The lost anchor is a `props:` of the basin and sinks
  on first load.
- **Locations, not rooms** — `Pool` and `Band` are
  `SingletonCartesianLocation`/`CartesianLocation`; nothing is a
  `FurnishableRoom`; `lint:locations` (`check-location-classes`).
- **`<root>/<branch>/`** — `/system/water/{idea,location,thing,lib}`,
  `/trade/diving/{thing,idea,cmd,lib?}`, `/platform/idea/Medium`,
  controllers at `<root>/idea/cmd/<category>/`, views at
  `<root>/cmd/<category>/`.
- **Module scope declares; lifecycles initialize** — the catalogue
  warms on first read; `ColumnWarren` is a singleton reached by
  `StuffApi.singleton`; no module-scope statements (`lint:module-scope`).
- **Import boundary** — the water pack and trade-diving import the
  kernel by package specifier only; the kernel imports neither (the
  `Haulable`/`Inspectable` shapes are the seam); `lint:imports`.
- **No new module category, no free helper, no new eslint-disable, no
  new collection, no `isWizard`** — every piece in D30 is a Stuff
  class, mixin, value object, controller, brain, row or Api method.
  Persistence rides `holder_snapshots` (keyed bands, the Warren ledger)
  and the Avatar snapshot.
- **Verbs on objects** — `haul`/`inspect`/`pump` call the host's
  `plan*/complete*`; no `XApi.verb(host)`; `lint:object-verbs` stays 0.
- **Mixin authoritative, controller dumb** — refusals are returned by
  the place/body/line and rendered by controllers.
- **Load on use** — the strandline follows `collectsFrom`; a band buds
  on traversal; nothing is added to any `boot:` (`lint:boot-entries`
  unchanged).
- **Lint gates this build must satisfy** (`pnpm -C packages/server
  lint:family`): `instanceable` (no `/lib/` rows; `OpenWater`, `Band`
  under branch dirs), `mixin-names` (`WaterPlace`, `AirPocket` once),
  `module-scope`, `imports`, `object-verbs`, `lib-statics` (no rise),
  `verb-collisions` (fishing's `haul` view deleted; every new verb
  free), `reachability` (each new verb conferred — § Reachability),
  `boot-entries`, `water-citations` (taught the `water:` key),
  `census` (`water.of`, `column.neighbors[].destination`,
  `tide.collectsFrom` added as citation keys; `bed` removed),
  `conditions`/`condition-arms` (the new rows' laws and signatures),
  `closed-vocabularies` (the medium tags leave the kernel; the
  `BreathingSpec.apparatus` word is an open string), `untitled`
  (`/trade/diving` titled in its `pack.yaml`), `openings` (the three
  positions' `requires`), `shopfronts`/`counters` (the dive counter in
  the outfit's `operatingLocations`), `light-sources` (bands derive
  light — the gate's room census must accept a `WaterPlace` with a
  surface ref; add it to the gate's derivation list, never its
  allowlist), `ground` (the open-water floor and the bed), `biome-sky`
  (rubber's: band rows author `enclosure: none`, `roof: none`),
  `location-graph` (keyed members, the mine precedent), `spell-cost`,
  `arg-kinds` (new views' `requires` resolve), `field-meta` (regenerate
  the golden), `unconsumed-seams` (every new field has a reader),
  `does-nothing`, `test-bootstrap`, `test-content`, `drive-scripts`.

---

## Waves

Every wave lands at a commit, with `pnpm test:near` + every touched
pack's vitest + `lint:family` green. Commits read
`build(underwater A1): …`. Stage order: kernel substrate before the
content that consumes it; each stage ends drivable.

### Stage A — the water place

**A0 — merge rubber; the `Medium` row and the one read (D2, D3).**
Files: `S/platform/idea/Medium.ts`, `S/platform/idea/MediumCatalogue.ts`,
`packages/content/platform/content/platform/idea/Medium/*.yaml` (7),
`S/platform/idea/api/BiomeLogic.ts` (tables → catalogue; `mediumForImpl`;
`resolveAtmosphereFor` consults it), `S/api/biome.ts` (`mediumFor`,
`mediumProps`), `S/lib/biome/Atmospheric.ts` (`atmosphereBlocks` reads
the medium), `S/lib/respiration/Respiration.ts` (`immersedIn` → the
Api), `S/lib/thermal/ThermalRegulation.ts` (`immersionOf` →
`mediumFor`), `S/lib/locomotion/Swimmable.ts` (`immersionOf` removed —
`Pool` keeps the per-occupant answer until A1 moves it). Acceptance:
`BiomeApi.densityOf('water')` etc. unchanged for every caller; a unit
test pins `mediumFor` on a Bulkable interior, an inline atmosphere, and
the default; `pnpm test:near` across biome/respiration/thermal.
Commit: `build(underwater A0): the Medium row and BiomeApi.mediumFor`.

**A1 — `WaterPlaceMixin`; `Pool` becomes the twin; the level read
(D1, D4, D24 part).** Files: `S/lib/location/WaterPlace.ts` (new),
`S/lib/mixin.ts` (registry + refusal), `S/platform/location/Pool.ts`
(rewritten thin), `S/lib/location/WaterSource.ts` (`levelAt`,
`levelAtSync`, `WaterRead.levelM/clarityM/state`), `W/idea/
WatercourseCatalogue.ts` (level 0 + cache; `readWater` fills the new
fields), `W/idea/WaterExpanse.ts` (`tidal` field, level 0 until A-D),
`scripts/check-water-citations.ts` (the `water` key rule),
`scripts/check-template-census.ts` (`water.of`), the three pool rows
(`water:` replaces `waters:`; Hollow Mere keeps `floor:` and the
detail; the cistern becomes a `Pool` with its Watercourse row;
`_atmosphere: water` deleted), `S/platform/idea/cmd/movement/
SwimController.ts` (narrow by `MixinApi.isFloor` + `openWaterAreaM2`,
drop the `instanceof`), tests migrated (`Pool.test.ts`,
`WaterSurface.test.ts`, `IceSheet.test.ts`, `ice-trade.test.ts`).
`PoolBottom` + row + Hollow Mere's `bed:`/prop deleted; `sink` targets
nothing yet (A2) — a sunk thing stays until then. Acceptance: the
storage-and-ice and maritime wire steps touching pools still pass
(`WIRE_BOOT=1 pnpm wire -- storage-and-ice maritime-space`); `stateNow`
pinned for depthM 0.5 / 4 / −0.5 at level 0. Commit: `build(underwater
A1): water is a state — WaterPlaceMixin, Pool the twin, the level read`.

**A2 — the column (D5–D9).** Files: `W/idea/ColumnWarren.ts` + row
`content/system/water/idea/column.yaml`, `W/location/Band.ts` + rows
`content/system/water/location/band/{lit,dark,bed}.yaml` (prose banks
D22), `W/idea/exits/ColumnExit.ts` + the exit-kind row, `W/thing/
OpenWater.ts` + row, `content/stuff/idea/biome/water/column.yaml`
(not sky-exposed, `enclosure: none`, `roof: none` on bands),
`WaterPlace.ts` (`bandsNow`, `ensureColumnExits`, `sink` → bed band,
`reconcileOccupants`, `column` field + `applyColumn`), `S/lib/paths.ts`
(`TemplatePaths.waterColumn`), `S/platform/idea/cmd/movement/
{Descend,Ascend}Controller.ts` + `platform/cmd/movement/{descend,
ascend}.yaml`, `Shore.ts` `DRAW_VERBS` += descend/ascend. Acceptance:
a unit test buds a 6 m/3 m-clarity column (surface·lit·dark·bed), keys
`<surface>/lit`, wires `down`/`up`, reaps when empty; the under-ice
`up` refusal; `sit` in a band refuses in words; a dropped ingot in the
lit band lands on the bed; the cistern's bed holds the tank-wearer
breathing (respiration via A0's `mediumFor` reads water in a band — the
breath model is A3, the shipped drain runs meanwhile). Commit:
`build(underwater A2): the column — ColumnWarren, bands, the bed`.

**A3 — breath: store ÷ burn, two clocks, blackout, the cold window,
#94 (D10, D13).** Files: `Respiration.ts` (the rewrite of the hold
branch; `o2StoreL/co2Urge`; the urge voice; `exhaleInto`; cold shock;
`windowSec` by cold; drift/sink after blackout via the place), `S/lib/
exertion/Exerting.ts` (`currentPowerW()`), `BodyPlan.ts`
(`lungVolumeL`), `Inhale/ExhaleController.ts`, Condition rows
`respiration/{aspiration,cold-shock}.yaml` + `paths.ts`, `AppSettings`
dials (`respiration.*`), `docs/subsystems/respiration.md` (rewritten
later at the sweep; the stale `applyDeath` line fixed now). Acceptance:
unit tests — a resting biped lasts ~90 s on a full store, a kicking one
~35 s; hyperventilation shortens the urge's lead; blackout fires with
no cue; the window is 90 s at 293 K and ~6 min at 276 K; re-inhale
under water is refused; cold shock halves the store once. Commit:
`build(underwater A3): breath is a store — two clocks, the silent
blackout, the cold window`.

**A4 — swimming as cost, the drowning response, `float`, buoyancy,
equalizing, `drop belt` (D12, D14, D15, D16).** Files: `Swimmable.ts`
(gate deleted), `Respiration.ts` (the tread beat, `drowningResponse`,
`floating`, `pressureDebtM`), `LoadBearing.ts` (buoyancy reads),
`WaterPlace.ts` (traversal duration + the `ascend` refusal by force;
going under), `Vocal.ts` (`canVocalize` reads the response — the
medium half is B1), `S/platform/idea/cmd/posture/{Equalize,Float}
Controller.ts` + views, `Wearable.ts` (`quickRelease`), `S/lib/command/
validators/mustBeInInventory.ts`, `cmd/inventory/DropController.ts`,
Condition rows `respiration/{squeeze,burst-eardrum}.yaml`, Discipline
rows `platform/idea/Discipline/{swimming,diving}.yaml` (`wind.yaml`'s
note edited), `WeaponProfile`-free. Acceptance: an untrained body
unsupported in deep water is `spent` in ~60 s and goes under silently
(emotes still send, `say` refused); it `get`s a cork float within reach
and is supported; a novice `float`s at zero cost; an ingot-carrier's
`ascend` is refused for weight and succeeds after `drop ingot`; a worn
belt drops; two un-equalized crossings → squeeze then burst eardrum;
`equalize` between prevents both. Commit: `build(underwater A4):
swimming costs, the drowning response, buoyancy and the squeeze`.

**A5 — the linkdead hold and the Wharfside basin (D11, D23).** Files:
`Avatar.ts` (`heldAtSurface`, `onLinkdead` → `holdAtSurface`, `enter`
clears), `WaterPlace.ts` (`holdAtSurface`, `reconcileOccupants` flood
case), `T/wharfside/location/{basin,intake-mouth}.yaml`,
`T/wharfside/thing/{quay-steps,intake-screen}.yaml`, `bank.yaml`
(`river` exit, `quay-steps` prop), `T/wharfside/thing/lost-anchor.yaml`
(a chattel Good, propped in the basin). Acceptance: a wire smoke
(part of the drive file, steps 1–3, 6, 8b, 8d, 8e, 9 of the
requirements) runs green: quay → surface → lit → dark → bed and back;
two sessions share each band; disconnecting on the bed holds the body
at the surface, breathing; the quay wall refuses, the steps work.
Commit: `build(underwater A5): the body held at the surface; the water
below the quay`.

### Stage B — the medium

**B1 — speech, airway, fire, wetting, cooling, sources (seams 1–6).**
Files: `Vocal.ts` (`canVocalize`; `Talk`/`Pilot`/`Order` route through
it), `CastActivity.ts` (asks it), `BodyPlan.ts` (`voice.media`),
`FireLogic.ts` (`no-air`), `BiomeLogic.ts` (`airShareOf` by medium),
`Metabolic.ts` (`canIngest`), `cmd/bulk/{Drink,Sip}Controller.ts` +
`Eat` (gate before transfer), `WaterPlace.onContainableAdded` (wets
objects), `S/lib/description/Marked.ts` (the run-ink line), `Thermal.ts`
(cached medium), `BulkableLogic.ts` (an open empty vessel fills from
an immersing place), `salt-water.yaml` + `Condition/metabolism/
salt-poisoning.yaml`. Acceptance: unit tests per seam; the drive's
10, 10c. Commit: `build(underwater B1): the medium — no voice, no
flame, no drink; everything wet and cold`.

**B2 — sight, sound, exits, electricity, posture (seams 8–12).**
Files: `VisionModality.ts` (the per-meter color fold; `Band.
getAmbientFlux`), `AudienceGather.ts` + `Modality.ts` (hop tau by
medium, direction null), `LocomotionLogic.ts` (the `medium` gate),
`ElectricityLogic.ts` (the water place as a pool), `OpenWater.ts`
(already A2 — the posture test lands here). Acceptance: a night dive
reads dark and a held glowlight lights the band; red reads dark at
depth (a color test); a walker into the basin is refused in words;
a shock in salt water reaches every immersed body. Drive 10b.
Commit: `build(underwater B2): sight to the water's clarity, sound
without direction, no walking in`.

**B3 — combat (D28).** Files: `WeaponProfile.ts`, `DeliveryProfile.ts`,
`Launcher.ts`, `CombatLogic.ts` (`weaponProfileOfImpl` medium input,
`arenaMaxBandFor` clarity cap, `disarm` widening, the drowning grab),
`Morale.ts` (urge input), `Gambit.ts`, `WaterPlace`/`Respiration`
(`ascend` refused while grappled). Acceptance: the gym benches
(`pnpm test:gym`, a water arena) show a sword's landed poise damage ≤
a quarter of its dry value and a spear's ≥ 80 %; subdue under water
drains the held body's store; morale breaks for the surface at urge
0.8. Drive 11. Commit: `build(underwater B3): the fight is about air`.

### Stage C — `/trade/diving`

**C1 — the pack, the lifeline, `haul` unified, `tug`/`heave` (D19
part).** Files: `packages/content/trade-diving/{pack.yaml, package.json,
tsconfig.json, vitest.config.ts}`, root `package.json` + `pnpm install`,
`src/thing/Lifeline.ts` (two ends: `fixedEnd` weak live ref, `diverEnd`
weak live ref, `lengthM`, `kind: line | hose`; implements `Haulable` —
`planHaul` raises the diver end's host one band along its column at the
hauler's power, refuses when the line is fouled by a `snag` prop in a
band between), `S/lib/spatial/Haulable.ts` + `cmd/inventory/haul.yaml`
+ `HaulController.ts` (kernel), `trade-fishing/src/thing/Trap.ts`
(implements `Haulable`; its `HaulController.ts` + `haul.yaml` deleted;
`verbs.test.ts`/`traps.test.ts` updated), `src/idea/cmd/diving/{Tug,
Heave}Controller.ts` + views, rows `content/trade/diving/thing/
{lifeline,weight-belt,diving-stone}.yaml`, `T/wharfside/thing/
heaving-line.yaml` (a Lifeline prop on the bank). Acceptance: fishing's
drive step that hauls a pot still passes; a tender on the quay hauls a
limp diver from the bed to the surface; `tug` ×2 reaches the tender;
a heaved line is caught by a drowning body. Drive 4 (haul), 8a, 12
(line part). Commit: `build(underwater C1): /trade/diving — the
lifeline, haul unified, the signals`.

**C2 — the bell and the hoist (D26).** Files: `W/lib/AirPocket.ts`,
`Respiration.exhaleInto`, `src/thing/{Bell,Hoist}.ts` + rows
(`bell.yaml`, `hoist.yaml`, `air-barrel.yaml`, `lamp`-in-the-bell is a
shipped lamp), the basin row gains the hoist prop (C5). Acceptance: a
bell at the dark band holds its waterline at ~1/(1+4/10); two breathers
foul it to the displacement floor in the tested minutes; an opened air
barrel resets it; a lamp inside burns it faster; a bell whose hoist is
`salvage`d/cut sits on the bed, alive as long as its stock. Drive 13.
Commit: `build(underwater C2): the diving bell`.

**C3 — the hard-hat suit, the pump, the bends (D27).** Files: rows
`helmet.yaml` (AirTank class), `dress.yaml`, `boots.yaml`, `hose.yaml`
(Lifeline kind hose), `src/thing/AirPump.ts` (`Pumpable`) + row,
`src/behavior/cranks.ts`, `Respiration.gasLoad` + `decompression-
sickness.yaml` + `narcosis.yaml`, `dive-tables.yaml` (Marked, the stops
in `markText`), `docs` later. Acceptance: dressed, the diver walks the
bed and `ascend` is refused (weight); pump stops → supply crisis in the
tested seconds → hauled; a 20-min bottom at the dark band surfaced in
one haul → DCS 20 min later; the same with a stop at the lit band →
none; back down relieves. Drive 14. Commit: `build(underwater C3): the
hard-hat suit, the crewed pump and the bends`.

**C4 — gigs: `inspect`, the two templates, the brains (D17).** Files:
`Condition.ts` (template + ref), `JobController.ts` (phrases),
`ContractLogic.ts` (`inspection` verification via the chronicle),
`S/lib/employment/Inspectable.ts` + `cmd/work/inspect.yaml` +
`InspectController.ts`, `W/thing/Conduit.ts` (`inspectionReport`),
`src/behavior/{tends,surveys}.ts` (tender: hauls on two tugs or after
`diving.tendSilenceS` without a signal while the diver is unconscious;
surveys: the PILOT, on a harbor-works seat, posts the three gigs when due), `src/thing/
Slate.ts`? — no: the slate is a `Marked` Good row with
`writableUnderwater`; `jot` is C5. Acceptance: `job post inspect intake
for 30 --business` → claim → `inspect screen` at the intake mouth →
`fulfill` → `job complete` pays; a corpse on the bed → `recover body to
the bank` settles only for THAT body; the anchor delivery settles.
Drive 15, 15a (the kill is 5's), 15b (the lift is C5). Commit:
`build(underwater C4): work below the waterline — inspect, recover,
lift`.

**C5 — the venue, the lift, the spear, the slate, the almanac (D19,
D20, D21 part, D25 part).** Files: `T/wharfside/diving/{idea/
outfit.yaml (positions master · tender · pump-hand; `banksAt`;
`operatingLocations` incl. the counter and the basin), agent/{dive-
master,tender,pump-hand}.yaml (Cast; brains), location/{shop,
offstage}.yaml, thing/counter.yaml (stone, belt, line, slate, pencil,
tables, almanac, spear, wand-of-glowlight)}`, `bank.yaml` (`divers`
exit, the works board prop; the harbor works `idea/department.yaml`
Business (the warden shape) whose ONE seat the existing pilot on the bank
holds — no new Cast; the founder chose the pilot, 2026-10-18), `src/
thing/{AirBag? (a Vessel row suffices), TideAlmanac.ts}` + rows,
`src/idea/cmd/diving/{Jot,Ring,Spear,Lash}Controller.ts` + views,
`lash` on `Lifeline`/`Vessel` (the pair's combined buoyancy read by
`WaterPlace.sink`), `spear` over the fishery (`Waters.reachAt` → the
registry's `draw` → the fishing mint of `/stuff/agent/<leaf>` into the
spearer's hands), the fish stall untouched, the Greywater's `tidal`
(so the almanac has a tide to print — D4's expanse level is wired here
if D1 stubbed it). Acceptance: drive 12 (buy/hire), 15b, 15c, 15d,
10a. Commit: `build(underwater C5): the dive shop, the lift, the spear,
the almanac`.

### Stage D — tides and life

**D1w — the tide (D4 rest, D25).** Files: `W/lib/Tide.ts`, the
catalogue's tidal nodes + salinity replacement, `WaterExpanse` level,
`WaterRead.tide`, `WaterReading` row (tide + oxygen + stream lines),
the estuary rows (`channel`, `tidepool`, `strandline`, the mouth's
citation; the `tide` WaterFixture deleted), `WaterPlace.
reconcileOccupants` strandline collection, the strand's tide words.
Acceptance: unit — the level repeats ~50 min later each day; springs at
new/full; the tidepool is `dry`-isolated at low water and `swimming`
at high; a floater dropped in the channel lies on the strandline after
the next high water; the mouth's stream peaks mid-tide and is 0 at the
turn. Drive 16–18, 17a. Commit: `build(underwater D1): the tide on the
moon's clock`.

**D2w — life (D21).** Files: `BodyPlan.ts` (`breathing`, port media,
voice), `Species.ts` (`breathingByStage`, `habitatByStage`), every
BodyPlan row (biped, quadruped, fish, crustacean, …) and the bullfrog,
`Respiration.ts` (intake-rated drain; O₂ against tolerance), `Perception
Api`/modalities (port media), `WaterExpanse.waterStateAt` (derived O₂),
the tidepool decay, `docs/subsystems/race.md` later. Acceptance: the
bullfrog composes `EngagedMixin` for the drive (its row names a Creature
class with one — check `KeptAnimal`; else the frog stays the documented
degenerate and the drive uses a tank fish), stays under for ~4× a
human and surfaces (its brain's `surfaces` need: a `candidate` urgency
on the urge — the `wary` brain shape, one beat); a trout in a bowl of
fouled water dies; `smell` underwater refuses in words. Drive 19, 16's
oxygen line. Commit: `build(underwater D2): breathing is a rate, by
apparatus and stage`.

### Magic

**M1 — the two workings and the voice (D18).** Files: `Effect.ts`,
`MagicEffects` parse, the realize arms on `Respiration` (`conferred
Breathing`) and `ThermalRegulation`, `Vitals` sustained reconcile (the
caster's bill), `CastActivity` voice gate, Spell rows, the wand row.
Acceptance: cast breathe-water on the quay, descend, stay past the
store → the binding lapses at the bill's end (mana 0) → the store runs
from that moment; `cast` under water refused; `zap` lights the bed.
Drive 20. Commit: `build(underwater M1): breathing water and keeping
warm are held, and cost`.

### The drive and the docs

**Z1 — the drive file complete, run, recorded.** `packages/wire/tests/
underwater.dirty.wire.test.ts` (dirty: kills and reembodies a
character, moves the clock a day, buys goods, carves a hole in the
mere); every requirements step 1–20 incl. 8a–17a as a checkpoint that
can FAIL (a verb understood + a state change asserted; never
`refusedFor` alone); the sibling drives rerun (`storage-and-ice`,
`maritime-space`, `climate-and-water`, `fishing`, `pump`, `energy`).
`pnpm test` once; MR. Commit: `drive(underwater): what the drive
found`. Docs (`docs/subsystems/underwater.md` new; `respiration.md`,
`location.md`, `spatial.md`, `watershed.md`, `expanse.md`, `thermal.md`,
`locomotion.md`, `combat.md`, `magic.md`, `fishing.md`, `contract.md`,
`race.md`, `content-packs.md` pack count) are the sweep's; the
`CLAUDE.md` map and verb list are not edited by the build.

---

## Reachability wiring

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| go into the water from a shore | `descend`/`dive`/`jump` | `ShoreMixin.DRAW_VERBS` (inventory) | the shore's exit whose destination is a WaterPlace (bank `river`, strand `east`, mouth `channel`) | none | no target; the controller picks |
| down/up the column | `descend`/`ascend` | `WaterPlaceMixin` inventory bucket | `ColumnExit`s the Warren wires; the band rows; `TemplatePaths.waterColumn` | none — the Warren singleton stands up on first `bandFor` | none |
| climb out | `climb` | `Ladder` (`quay-steps`, environment) | the row propped in basin + bank, `axes` | none | existing |
| hold / equalize / float | `inhale`/`exhale`/`equalize`/`float` | `RespirationMixin.commandContributions` (inhale/exhale, shipped) + `WaterPlaceMixin` (equalize/float) | — | — | `requiresConscious` |
| drop ballast | `drop` | shipped | `quickRelease: true` on the belt row | — | `mustBeInInventory` taught quick-release |
| haul | `haul` | `Haulable` hosts' `commandContributions` (Lifeline: `peers` + `inventory`; Hoist: `environment`; Trap: `peers` as fishing had) | — | — | `requires: any`, shape-narrowed |
| line signals | `tug` | `Lifeline` (`inventory`/`peers`) | — | — | `requires: [LifelineMixin?]` — no: `Lifeline` is a class; the view uses `requires: any` + shape |
| throw a line | `heave` | `Lifeline` (`peers`, `inventory`) | the bank's `heaving-line` prop | — | target `requires: any` reachable |
| write under water | `jot` | the `Slate` row's class (`/trade/diving/thing/Slate`, `inventory`) | `writableUnderwater` | — | pencil `requires: [MarkingMixin?]` → use `requires: any` + a `grease-pencil` template check in the controller |
| strike the bell | `ring` | `SignalBell` class (`inventory`/`peers`) | — | — | — |
| spear | `spear` | `Spear` row class (`inventory`) | the band's `Shore` water (the fishery's reach) | none (the registry is the water pack's singleton, reached by path) | fish target optional |
| lift | `lash` | `Lifeline`/`Vessel` rows' class (`inventory`) | the lost anchor prop | — | two targets reachable |
| the bell | `haul bell down/up`, `enter`/`exit` (ExitableVessel's) | `Hoist` (`environment`) | hoist prop on the basin | — | — |
| the suit | `wear`/`remove`, `pump` | shipped; `AirPump` implements `Pumpable` (device `pump` affords via the pump's own `commandContributions`, the well's precedent) | rows | — | — |
| inspect | `inspect` | `Inspectable` hosts (`Conduit`/`intake-screen`: `peers`) | — | — | `requires: any` + shape |
| the jobs | `job post inspect/recover/deliver`, `claim`, `fulfill`, `job complete` | shipped (`JobBoard`) | the works board prop on the bank; the harbor works Business; the `surveys` brain | none (the business loads with the room, `lint:openings` rule 3) | the phrase parser |
| tender/pump-crew wages | `apply`, `clock on/off`, `collect` | shipped | positions on the outfit row | none | `openings` vocabulary |
| sell a fish | `consign` | the stall (shipped) | — | — | the freshness refusal |
| the almanac / tables | `read` | `Marked` (shipped) | rows; the almanac's derived text | — | — |
| analyze water (oxygen, tide) | `analyze water` | shipped | the `WaterReading` row's new lines | none (`ReadingCatalogue`) | `instrument: ""` |
| magic | `cast`, `zap` | arcana (shipped) | the two Spell rows + the wand row | none (`SpellCatalogue`) | the voice gate |
| the tide | `look`, `analyze water` | — | `tidal` on the Greywater; the estuary rows | none | — |

Each new view is listed in the composer's `commandContributions` with
the bucket's DIRECTION in mind (environment: item→holder; inventory:
container→occupant; peers: room siblings). `lint:reachability` is the
proof.

---

## Acceptance-criteria coverage

| AC (requirements § Acceptance criteria) | waves |
|---|---|
| quay → bed → back; two players share each room | A2, A5 (drive 1–3) |
| holding breath ends by choice or an unwarned blackout; nobody surfaced by the game | A3 (drive 4) |
| every blackout rescuable in a window longer in cold; the rescued know | A3, C1 (drive 4, 5) |
| weight changes speed; dropping ballast always works | A4 (drive 6) |
| descending fast hurts; equalizing prevents it | A4 (drive 7) |
| under the ice the only way up is the hole | A2 (drive 8) |
| no fire, no voice, no swung weapon; refusals in the thing's words; wash and fill from the water | B1, B2, B3 (drive 10, 11) |
| dive master outfits; tender hauls and reads signals; the bell lives on its air; the suit on the pump; the bends after surfacing, tables prevent | C1, C2, C3, C5 (drive 12–14) |
| a city job taken, done, paid | C4 (drive 15) |
| the tide ~50 min later daily; tidepool cut off; drift on the strandline | D1w (drive 16, 17) |
| a frog under for a time must surface; fish die without oxygen | D2w (drive 19) |
| water-breathing lasts while held, lapses; casting needs a voice; a wand works | M1 (drive 20) |
| a non-swimmer goes under in ~a minute, silently, unless they reach something; a swimmer rests floating; anyone wades | A4, C1 (drive 8a) |
| out of the water by steps/ladder/slope, never a wall; an unconscious body carried out | A5 (drive 8b; carrying rides the shipped `carry`/`haul` — the plan uses `haul` from the steps) |
| cold water costs breath on entry | A3 (drive 8c) |
| dropped things sink or float; a drowned body and its belongings recovered, still its owner's | A2, C4 (drive 8d, 15a) |
| implant messages/emotes work, speech does not, writing on a slate does, a struck bell is heard by every diver | B1, B2, C5 (drive 10a) |
| a night dive is dark without a light | B2 (drive 10b) |
| spear and sell; air lifts | C5 (drive 15b, 15c) — "sell" per D20 |
| the almanac tells the truth | C5 + D1w (drive 15d) |
| seawater harms | B1 (drive 10c) |
| a disconnected character held safe at the surface, in water or on a strand the tide reaches | A5, D1w (drive 8e, 17a) |
| existing pool, cistern, estuary, storage-and-ice behaviors still work | A1 (the sibling wire drives rerun each wave) |

No AC is unmapped. One AC is met by interpretation (D20).

---

## Test & gate strategy

- **Unit (`test:near` + the two packs' vitest)**: the band derivation;
  the tide function (period, springs, stream); breath arithmetic
  (store, burn, urge lead, hyperventilation, cold window); buoyancy and
  traversal duration; the squeeze ladder; `mediumFor` walk; the
  air-pocket waterline and fouling; the gas load against a table; the
  weapon drag factors; the inspection/identity predicates; the
  strandline collection; port media; `canVocalize`.
- **Only the drive can prove**: the column budded by walking; co-presence;
  the hauled rescue; the pump crew's brain; the jobs end-to-end with
  money; the tide over a game day; the frog's one beat.
- **Lint**: `lint:family` after every wave; `field-meta --snapshot`
  regenerated when fields land (A1, A3, A4, D2w); the verb-collision
  gate after C1 (fishing's view gone).
- **`pnpm test` twice**: before the MR and at `/finalize`. ⚠ A green run
  stays valid until a source file changes; check `git status --short`
  before starting one.
- **Wire**: `WIRE_BOOT=1 WIRE_PORT=<build-4's port> pnpm wire -- underwater
  storage-and-ice maritime-space climate-and-water fishing pump energy`
  (see memory: one WIRE_PORT per worktree; a drive world is ~3 GB — run
  in the foreground).
- **Gym** (`pnpm test:gym`): one water-arena bench for B3; not in `test`.

---

## Risks & opens

- **R1 — rubber merges first and touches `Atmospheric.ts`/`BiomeLogic.ts`
  heavily.** A0 begins with `git merge origin/master` after rubber
  lands; the table→catalogue migration is written against the merged
  `BiomeLogic`. `lint:biome-sky` (rubber's) will count band rows —
  they author `enclosure: none`/`roof: none`. If rubber has not merged
  when A0 starts, write A0 against master and expect a re-merge: the
  table deletion touches lines rubber does not (`:50-135`), the walk
  edits (`:714/:739`) may conflict — small.
- **R1b — cleanliness (reqs/cleanliness, build-2) is NOT merged yet and
  DOES overlap** (checked 2026-10-18, 64 commits): it adds ~326 lines to
  `S/lib/ground/Floor.ts` (the floor protocol A2's `OpenWater` and the bed
  extend), plus small edits (1–19 lines) to `Warren.ts`, `MineWarren.ts`,
  `WatercourseCatalogue.ts`, `Conduit.ts`, the cistern and steps rows,
  `wharfside/bank.yaml`, the estuary rows and fishing's `verbs.test.ts`.
  ⭐ Merge master again (bringing cleanliness) BEFORE A2 — A0/A1 do not
  touch `Floor.ts` and can start now; if cleanliness has not landed by
  A2, build A2 on master and expect the `Floor.ts` merge to be the one
  real conflict of the build.
- **R1c — silk (reqs/silk, build-3) is NOT merged yet; it overlaps by
  DESIGN** (checked 2026-10-18, 20 commits). (a) `S/lib/thermal/Thermal.ts`
  +175: a **bath** holder rung (`enclosingBath` — a thing immersed in a
  vessel of water is at the water's temperature, beside the Coolbox
  rung). ⭐ B1's "objects cool as in water" (D29 seam 3) must EXTEND that
  ladder — coolbox → bath → the water place — not add a parallel ambient
  path in `restamp`; two answers to *the water around this object* is
  the duplicate this repo removes on sight. Merge master (silk) before
  B1. (b) Fishing: silk unified `reel` (one verb, the rod or the basin
  decides; a `Reelable` shape in trade-fishing's `lib/`) — the precedent
  C1's `haul` unification follows (read silk's W3 before writing the
  `Haulable` shape; place it by the same "common pack ancestor" test).
  (c) Silk's Wharfside mill/dyehouse rows and the water pack's
  `fouled-water` material are its own ground — no conflict expected.
- **R2 — `haul` unification deletes a fishing view and controller.**
  The fishing wire drive's haul steps and `verbs.test.ts` must pass
  with the kernel view (no `default:` trap arg — the kernel cannot name
  `capability.trapping`; the fishing drive types the trap). If a bare
  `haul` was relied on, the Trap's `commandContributions` keeps the
  verb sayable and the controller resolves the one Haulable in scope
  when the target is omitted (the controller, not the view, supplies
  the default).
- **R3 — the `Band`'s light.** `lint:light-sources` censuses rooms that
  cannot say where their light comes from; a band derives it from its
  surface. The gate must learn a WaterPlace with a `surface` ref, in
  its derivation rule, not its allowlist. If that needs a ceiling move,
  it is a caller audit, never a rise.
- **R4 — `BodyPlan.breathableMedia` is read by `getBreathableMedia()`
  callers across fishing/pets/respiration.** D21 keeps the method and
  derives it; rows are edited (no migration, drop the DB). A pack
  BodyPlan row still authoring `breathableMedia` must fail the pack's
  read loudly (a closed-vocabulary-style refusal) rather than silently
  breathe nothing — the applier refuses the dead key (`lint:
  instanceable` invariant 13's shape).
- **R5 — the bullfrog as a drowning frog.** `respiration.md` says a bare
  `Creature` never drowns (no `EngagedMixin`). D2w checks the bullfrog
  row's class; if it is a plain `Creature`, the honest path is the
  kept-animal class that has the slot, not a kernel edit. If neither,
  drive 19's frog half uses the documented degenerate and the plan
  records the gap — say so in the drive record.
- **R6 — "the fishmonger buys a speared fish" vs fishing D11.** D20
  interprets the sale as consignment. If the user wants a cash sale,
  the compliant change is a `buys: true` line per fish ROW on the stall
  (bounded to the shipped species) — a rows-only change, no kernel.
- **R7 — `inspection` reads the chronicle.** `PersonaMixin.recordDeed`
  is the sealed writer; the predicate needs a read of deeds by subject
  and date (`ChronicleApi`/`IdentityApi` — the builder confirms the
  read exists; if the ledger exposes no query by item, the template
  verifies a `fulfilled`-style engine row instead: `inspect` at the
  works writes it through `ContractLogic`, the trusted-recording
  pattern the doc already names).
- **R8 — salt water's harm.** The metabolism toxin vocabulary is a
  closed set the builder must match; if no sodium toxin exists, the
  honest first cut is the hydration debit alone (seawater makes you
  thirstier) plus the `salt-poisoning` row on a new toxin key — a row,
  not a kernel list, if the vocabulary is open; if it is closed, that is
  a `lint:closed-vocabularies` finding to record, not a rise.
- **R9 — scope.** This is four builds' worth of waves, and it ships as ONE
  MR: scope stays in, only ORDER varies (the founder's standing rule —
  no scope splits; the build does not open the MR early by cutting
  waves). Every wave is landable alone and nothing in A–C depends on D
  or M, which is what makes the order safe, not what licenses a cut.
- **R10 — the drowning grab auto-lands `subdue`.** A control gambit on a
  rescuer without consent is an accountability event; the producer
  stamps `blame` as environmental (the drowning body's panic) so the
  ledger records *who grabbed whom* and judges nothing (lens 4).
- **R11 — the thermocline and the sea column.** Not required; the sea
  node's column works from `depthAt`. The thermocline is a deferred seam.
- **R12 — the ice sheet's `up` from a hole.** A hole patch is open water
  in the log; `IceSheet.openWaterAreaM2()` must answer > 0 at the hole
  for the ceiling gate — the storage-and-ice drive's step 8 already
  relies on it.
- **Closed with the founder (2026-10-18):** a blacked-out body floats
  FACE-DOWN (D10); the speared fish is SOLD BY CONSIGNMENT (D20, R6);
  the city's gigs are posted by the existing PILOT on a harbor-works
  seat (C5), not a new harbormaster Cast. Nothing open blocks a wave.

---

## Deferred seams

- **The thermocline band** (still water, seasonal) → stays in
  `underwater-slate` § 3 (a fourth band row and one line in `bandsNow`).
- **Domes, air pockets as rooms, the airlock, the air economy, the
  submersible** → `underwater-slate` § 7, § 9 (the `AirPocketMixin` on a
  Location is the attach point).
- **Wrecks and immersion decay** → `decomposition-slate` (the material
  row's environment term; nothing here).
- **The bed's harvest** → the foraging slate (the bed is ground with no
  cover).
- **Bed and foreshore ownership, the right of wreck** →
  `underwater-slate` § 12–13 (the strandline collects; nobody owns it).
- **The surf, tidal streams offshore, whirlpools** → `underwater-slate`
  § 13–14 (`Tide.streamFactor` is the attach point).
- **The general disconnected-body rule** → `physiology-slate` (D11 is
  water-only).
- **The recompression chamber** → the medic vertical (treat relieves
  DCS; the chamber is a room host of `AirPocketMixin` with pressure).
- **A category-bound `buys` line** → `retail` (R6).
- **The river's column with current, river ice per stretch** →
  `river-slate` (the next build; `ColumnWarren` keys on any WaterPlace).
- **Pets swimming, a reef to see** → the pets tail, tourism slate.

---

## Critical files

Read first, in this order: this plan; `docs/requirements/underwater-
requirements.md`; `docs/slates/builds/underwater-slate.md` § 2–7, 11,
13, 15; `docs/subsystems/respiration.md`, `location.md` § MultiLocation,
`ground.md`, `watershed.md`, `expanse.md`, `spatial.md`, `content-packs.md`
§ The capability rung, `contract.md`, `mixins.md`; then
`S/platform/location/Pool.ts`, `S/lib/location/{Shore,WaterSource}.ts`,
`S/lib/locomotion/Swimmable.ts`, `S/platform/thing/WaterSurface.ts`,
`S/lib/ground/Floor.ts`, `S/lib/stuff/Location.ts` (`ensureFloor`),
`packages/content/trade-mining/src/idea/MineWarren.ts`,
`S/lib/location/{Warren,InnerWarren,WarrenMember}.ts`,
`S/lib/boundary/DeferredDestinationExit.ts`,
`S/lib/respiration/Respiration.ts`, `S/lib/vitals/Vitals.ts`
(`beginDying`, the sustained reconcile), `S/lib/exertion/Exerting.ts`,
`S/lib/encumbrance/LoadBearing.ts`, `S/platform/idea/api/BiomeLogic.ts`,
`S/lib/biome/Atmospheric.ts`, `S/lib/message/Vocal.ts`,
`S/lib/magic/{Effect,CastActivity}.ts`, `S/lib/combat/{WeaponProfile,
Morale,Gambit}.ts`, `S/lib/employment/Condition.ts`,
`S/platform/idea/cmd/work/JobController.ts`, `S/lib/pump/Pumpable.ts`,
`S/lib/ground/Workable.ts`, `packages/content/water/src/idea/
{WatercourseCatalogue,WaterExpanse}.ts`, `packages/content/water/src/
thing/{IceSheet,Conduit}.ts`, `S/platform/idea/api/CelestialLogic.ts`,
`packages/content/trade-fishing/src/idea/cmd/fishing/HaulController.ts`,
`packages/content/trade-ice/pack.yaml`, `T/wharfside/bank.yaml`,
`T/wharfside/tinker/idea/round.yaml`, `T/estuary/*.yaml`,
`packages/wire/tests/storage-and-ice.dirty.wire.test.ts`,
`packages/server/scripts/{check-verb-collisions,check-reachability,
check-water-citations,check-light-sources}.ts`.

---

## Build log

Wave-by-wave: what landed, what the build decided, what surprised it.

- **A0+A1 ✅ (872503b98)** — landed as one commit (the medium read's
  third step IS the water place). ⭐ **D2 amended: the medium is a kernel
  vocabulary (`S/lib/biome/Medium.ts`, `MEDIA` + `MEDIUM_TAGS`), not a
  row kind.** Every reader is synchronous on a hot path (a breath, a fire
  tick, a heat slice) and in unit suites with no content store — a
  catalogue reads null cold (the reference-Idea-inert trap). The medium
  is physics, like the materials `Channel` vocabulary; a new medium is
  one entry. No `Medium.ts` Idea/catalogue/rows were made. ⭐ `MediumRead`
  gained **`atSurface`** and **`substance`**: a swimmer in a water place
  is immersed (wet, cold) but breathes the air over it — without that
  the read reintroduced maritime's *swimming drowned you*; `substance` is
  the liquid's own name (a fish in fouled water still breathes nothing).
  `resolveAtmosphereFor` consults `mediumFor` only when the scope has no
  atmosphere of its own (a sealed sub in a flooded room answers for
  itself). `WaterSpec` gained an optional **`feature`** — the `waters`
  key the place's own water registers under (Hollow Mere keeps `mere`,
  so `fill bucket from mere` still binds; the cove keeps `pool`). An
  uncited `Pool` reads `swimming` (legacy deep water). `WaterSurface.
  bears` is true where the water is wading-deep or gone. The cistern
  cites a new one-node still water `duncan:cistern` (eternal-university
  now depends on the water pack). `SwimController`'s `instanceof` was
  left (it works; narrowing is cosmetic).

- **A2–A5 ✅** — landed as one commit: the column, breath, the swim and
  the hold share `WaterPlace.ts` and `Respiration.ts` too closely to land
  apart. Decisions the build made:
  - ⭐ **The column hangs off a kernel SEAM, `WaterColumnMixin`**
    (`S/lib/location/WaterColumn.ts`, `Mixins.WaterColumn`,
    `TemplatePaths.waterColumn`) — the `WaterSource` shape: the kernel
    `WaterPlace` finds the water pack's `ColumnWarren` by path and narrows
    by shape, so `ensureColumnExits`, `sink` → the bed, `takeUnder` and
    `holdAtSurface` live on the kernel mixin and never import the pack.
  - `WaterPlace.bandsNow()` reads `clarityM` off the read: the
    `Watercourse` row gained a top-level `clarityM` (Hollow Mere 8, the
    cistern 2, a river 3 by default, fouled water ≤ 1), `WaterExpanse`
    one (sea 10). Bands: the basin (6 m, 3) lit·dark·bed; Hollow Mere
    (5 m, 8) lit·bed; the cove (4 m, 10) lit·bed; the cistern (3 m) bed.
  - ⭐ Bands are keyed `<surface>#<band>`, captured to their snapshot when
    they empty of people (what sank stays sunk across a restart), reaped
    only when the surface no longer has them. **Sideways copies between
    two neighboring waters' columns were NOT built** — nothing shipped
    has two water places side by side; recorded for river-slate.
  - Neighbors use a new exit kind `/system/water/idea/exits/underwater`
    (`media: [water]`). An authored room beside a band is itself a
    `Band` row with authored `surface`/`band` (the intake's mouth).
  - ⭐ `MediumRead` for a band is always immersed, never at the surface,
    at the band's depth — standing on the bed too.
  - The under-ice ceiling and *"no deeper water that way now"* are
    checked BEFORE the mode gate in `ColumnExit.canTraverse` (they hold
    whatever stroke you use).
  - **A3:** the breath is `_o2StoreL` + `_co2Urge` on Respiration, all
    runtime. ⭐ A body the water takes by surprise has a TIDAL breath
    (half), a deep `inhale` in the last 30 s a full one — that keeps
    *prepared outlasts unprepared* true from physics after the grace
    timers went (tidal ~37 s, deep ~75 s for an untrained 70 kg adult at
    rest). `_lungFill` (the gas volume, for buoyancy) is tracked apart
    from the oxygen store. Gills hold no breath (a body whose plan does
    not breathe air has a zero store). `currentPowerW()` on Exerting
    reads the game clock. The drain's *"You can't breathe!"* cue is
    skipped under water (the hold is silent; the urge speaks on
    `self.body`).
  - **A4:** ⭐ `Swimmable.difficulty` is gone in effect —
    `setDifficulty(non-null)` throws *"a cost, not a check"* (the
    `Enablement` contract keeps the method). ⭐ **D16's `quickRelease` was
    NOT built**: `DropController.dropOperand` already releases worn gear
    through `tryReleaseFromSlots`, so `drop belt` works today; the D28
    disarm widening will read worn-or-held. The tread is a third body-slot
    engagement, `RespirationTread`; the recovery tick treads too. ⭐
    `Vocal.canVocalize()` landed whole here (the drowning response AND the
    medium's `carriesVoice`), and `say`/`whisper`/`shout` now RETURN a
    `VocalResult` the three controllers render — NPC callers ignore it.
    Ascent duration by buoyancy was NOT modelled (no traverse-time seam
    worth building); weight shows as the refusal to rise and as the tread.
    *Only `get` works in the drowning response* was NOT built (the voice
    refusal is the AC's observable half).
  - **A5 / D11:** ⭐ the hold is a BREATHING state on `RespirationMixin`
    (`holdUp`/`releaseHold`/`isHeldUp`), set by `WaterPlace.holdAtSurface`
    — not an Avatar field as the plan said: respiration is what reads it,
    and an Avatar field would be a shape-read across mixins. The Avatar
    decides WHEN (`onLinkdead` → hold; `enter` → release).
  - **A5 / D23:** the Wharfside water is a sub-zone
    `/world/terminus/wharfside/water` (basin, intake mouth, quay steps,
    lost anchor). The bank's `steps` DETAIL was removed — a detail wins
    the binding, and `climb steps` would have read the words.

- **B1–B3 ✅ (d36fced86)**. Decisions:
  - ⭐ The fire gate is in `igniteImpl` off `mediumFor` (refused before
    the flash check); `airShareOf` is UNTOUCHED (it reads contents, not a
    scope) — instead `Burner.completeness()` is 0 under water and the
    water place DOUSES whatever arrives in it and everything it carries.
  - Seam 3 (objects): a water rung in `Thermal.restamp` below the heat
    source and the cold holder, caching the immersed tag for
    `mediumConductivity`. ⚠ Silk is still unmerged: its bath rung goes
    ABOVE this one when it lands (R1c) — the merge is that ordering.
  - Seam 9 color: carried as the band's ambient COLOR TEMPERATURE
    (bluer with depth) rather than a per-channel Beer–Lambert fold
    through `mergeAttenuated` — the vision walk's color leg is a pane's;
    a water color per leg is a later refinement (recorded, not built).
  - ⭐ `MediumRead.visibilityM` (the water's clarity under the surface) is
    how the combat engine reads the range cap — `lint:combat-dynamics`
    refuses a `MixinApi.isWaterPlace` in the engine. `isRespiration`
    joined its allowlist (the breath is vitals substrate, like
    `isMetabolic`).
  - Launchers gained `worksUnderwater` (default false; a speargun row
    would say true). Thrown range was NOT capped (no shipped thrower is
    in the drive). `disarm` was NOT widened to worn gear (no helmet yet;
    revisit at C3).
  - ⭐ The drowning grab is a Respiration relation (`beClungTo`), not an
    auto-landed `subdue` gambit: the grabbed body treads for two. No
    accountability event is written (R10 recorded, not built).

- **C1–C5 ✅ (911878af6)**. Decisions:
  - **C1:** a line's free end is a minted `LineEnd` in the hands of the
    person on it — holding it is being ON the line, dropping it is
    letting go, and `tug` is the END's verb (afforded to its holder).
    Who is on a line is runtime (a line is made fast for a dive and does
    not outlive one). The kernel `haul` verb drives a `Haulable` shape
    (`haulBy(hauler, sense)`); fishing's own `haul` verb and controller
    were deleted and `Trap.haulBy` absorbed them — one verb, two
    implementers.
  - **C2:** the bell fouls by its occupant count over time rather than
    each occupant `exhaleInto` it (the breath engine has no per-breath
    push); an opened air vessel carried in empties into the pocket.
    Bell-occupant gas loading (the bends from a bell) is NOT modelled —
    only a worn supply loads gas.
  - **C4:** an inspection is verified by a sealed `fulfilled` row written
    when the `inspect` verb is used on the works (or a face of them),
    since nothing about the works' STATE changes when you look.
    `ContractApi.recordInspection(identityPath, templatePath)` takes
    paths, not the object (`lint:object-verbs`). The pilot's `surveys`
    brain posts only for works whose rows are resident — it never loads
    a place to post about it.
  - **C5:** the slate's act is `jot slate <words>`, NOT `write` — `write`
    is the shell's content-authoring verb (verb-collision ladder: the
    two acts share nothing). The fish spear is a `Weapon` (pointed — the
    weapon that still hurts below) AND draws from the reach's fishery
    through trade-fishing's `Waters` (a speared fish is a drawn fish).
    `lash <gear> to <load>`: a line's end made fast to a load lets the
    tender haul it; an air bag lifts. ⭐ A line brings at most 80 kg
    off the bottom; a load's weight in the water is taken as its MASS
    (the few per cent a dense load displaces is not counted) — what
    lifts it is air, at `liters × 200 / (1 + d/10) − bag mass` per bag
    (the AirTank convention: a vessel's liters are compressed ×200). The
    lost anchor (300 kg) wants three bags at the bed. The air barrel
    became an `AirBag` (1 L compressed = 200 L free air, so a barrel
    into the bell refreshes 200 L).
  - Lint: the tender, pump hand and pilot dossiers carry `archetype:`;
    position nouns are one word (`divemaster`, `pumper`, `pilot`); the
    dive shop's light is a storm lantern adornment, not a bare
    `ambientIntensity`; the pilot's `intake:`/`anchor:` config fields are
    CITATIONS in `check-reachability`. Pack count 64 → 65.
  - **Moved:** the tide almanac goes to D1w (it prints the tide D1
    builds) and the wand of glowlight to M1. The lift resolves at `lash`
    (the bags and the load rise together to `surfacePlace()`), not in
    `WaterPlace.sink` — sinking is what an unlashed thing does, and a
    lashed pair only ever goes up.

- **D1w ✅ (53fe60b3c)**. Decisions:
  - `Tide` is a value object (instance methods — `lint:lib-statics`) the
    caller hands the moon's phase; θ = 4π(t/day − moonPhase) gives the
    lunar semidiurnal period with no synodic constant in the level.
  - The river's sea-level reaches take the tide from a realm dial
    (`water.tide.rangeM`, 3 m) rather than reading the Greywater row:
    the catalogue has no forward ref to the sea, and adding one for a
    number the realm can dial is the wrong direction.
  - ⭐ A tidal read refreshes every 10 game-minutes, not every six-hour
    segment (`ShoreMixin` memo) — a six-hour memo would have held a
    tidepool dry through half a flood. Shore gains an `onWaterRead`
    hook; WaterPlace reconciles on it and on entry. No timer anywhere.
  - Strandline drift keys on runtime arrival times (lost on restart —
    a restart forgets which tide a plank came in on, and it then waits
    one more tide). The flood hold reads `isLinkdead()`; a logged-out
    body is not in the world to be held.
  - The tide in words is the Shore's (`look` on any tidal water), the
    figures `analyze water`'s; the estuary's `tide` WaterFixture retired
    — `fill pan from tide` now draws from the channel the mouth cites
    (its detail answers to *tide*). Exits are cardinal (`north` to the
    channel, `south` to the tidepool, `up` to the strandline) —
    `lint:locations` refuses a named direction inside one zone.
  - The tide almanac's pages are computed when read (a book that is
    always this week's — the one liberty taken).
- **D2w ✅ (4a66a7b6b)**. Decisions:
  - ⭐ The plan's arithmetic was off: a drain at `burn × (1 − intake)`
    with skin intake 0.25 lasts 1.33×, not 4×. The frog's adult water
    intake is 0.75. And the burn now scales with body mass as the lungs
    already did — without it a half-kilo frog's breath lasted 1/20th of
    a man's.
  - The crab breathes air at 0.9 (not 0.4): at 0.4 a potted crab would
    be dead within the hour the row's own comment promises it lives.
  - A cut-off basin is `water.rimM` on the spec: below the rim the place
    keeps its own water (wading) and its oxygen decays from the moment
    it is first SEEN cut off (load on use; the dial
    `water.tidepool.o2DecayPerHour` × a Q10 of 2).
  - Salinity-by-stage is authored (`habitatByStage`) and read by the gill
    intake's oxygen tolerance only — salinity as a cause of death is the
    fishery's fit, not respiration's. The unconsumed-seams ratchet made
    respiration the outside reader.
  - The frog is a `Beast` with a new kernel brain `surfaces` (one beat:
    pressing to come up on the urge, wanted to dive after `restS`).

- **M1 ✅ (a40645b0b)**. Decisions:
  - Both workings ride the shipped `SustainedEffect` arm (`realizes:
    'confer-medium' | 'offset-ambient'`) rather than a new mechanism; the
    realization pushes into `Respiration.setConferredBreathing` and
    `ThermalRegulation.setWorkingOffsetK` (its own field — the plan's
    warning about `_ambientOffsetK` held: that is the re-stamp's cache).
  - The standing bill uses the charged shell's own standby draw
    (`magic.charge.standbyWatts` × attention) against the caster's mana;
    only these two realizations are billed (a veil and a glowlight stay
    terms bought once, as they shipped). At 5 W the bill is small: the
    TERM (15 game-minutes) is what a diver meets first, and the mana is
    the ceiling on renewing it.
  - The voice gate is in `prepareCastImpl`, after the caster and spell
    checks and before hands — the mixin decides, the controller renders.
  - The wand of glowlight is an arcane-library row stocked at Morrow's,
    so terminus now depends on arcane-library (a new pack edge).

### Review round 1 (2026-10-20)

- **R1 · `ascend`/`descend` are the water's, not the shore's.** `ShoreMixin`
  afforded `swim`, `descend` and `ascend` to every waterside place. On a
  dry quay `ascend` could only refuse, and `descend` was `swim`'s act
  (into the water) under a second name. Now: `WaterPlaceMixin` affords
  `descend`/`ascend` (in the water: down and up the column); the shore
  affords `swim` alone, and `swim` with no way named beside a water takes
  you in, picking the way through `Shore.wayIntoWater()` (which owns the
  iced-over refusal). `jump` moved from `descend` to `swim`, because
  jumping off a quay is the requirement's way in. The base controller's
  `crossPicked` is the one place-picked crossing for both verbs.
  Requirements drive step 2 now reads `swim`, then `descend`.

- **R2 · `float` and `equalize` retired as verbs: a verb is for a choice,
  never for upkeep.** The owner: clearing your ears *"sounds like it
  should be passive like breathing"*, and floating is *the same action*
  as lying down to rest, in the water. Now `lie` (and the word `float`)
  on a water's surface that does not bear you floats you: the body still
  decides (`RespirationMixin.float`, its refusals in words). The ears
  clear on their own: each step down clears a fraction on the way by
  diving band (untrained ¼ … expert all), and the rest clears at
  0.5 m per real second while you aren't descending; a body out cold or in
  the drowning response clears nothing. The squeeze stays at 3 m of
  uncleared pressure, and a burst eardrum at 6 m. The choice left is *how fast you go
  down*. `EqualizeController`/`FloatController` and their views are
  deleted; requirements drive step 7 reworded. ⚠ Lines above that name
  `equalize`/`float` as verbs (D15, D19, A4, the reachability table) are
  superseded by this note. The general principle (passive upkeep,
  disturbed by state, answered by ordinary acts; `rest`; whether
  `inhale`/`exhale` survive) is a design conversation still to have.

- **R3 · The inspection job is cut from this build.** The owner: *"this
  just seems like a totally separate experience from anything water
  related … if it's a real thing then it shouldn't go on look it should
  be its own deal. and if it isn't a real thing and is just look by
  another name, then what exactly is all this infrastructure doing?"*
  It is a contract-and-report interaction, so it needs its own design (what
  an inspector delivers, who can judge whether it is true, how it is paid). That design is not water's. Removed: the `inspect` verb +
  `InspectController`, the kernel `Inspectable` shape, the `inspection`
  condition template, `ContractApi.recordInspection`, the `job post
  inspect` phrase, the water pack's `WorksFace` class and rows, the
  intake screen prop, and the `surveys` brain's intake posting. Kept: the
  intake-mouth room (the column's one authored neighbor, world content),
  and the `identity` item ref with `job post recover <body>` (a delivery
  of THIS body: the existing delivery template). D17's inspection half and
  C4's `inspect` acceptance are superseded by this note.

- **R4 · `proseBank` is gone.** `Band` carried a field no other class in the codebase has: a list
  of lines per band row, one picked by a hash of the surface + band + game
  hour, overriding `getLongDescription`. It modeled nothing: the text
  changed on the hour while the water had not, and two waters read
  differently by a hash rather than a cause. It was also a second description system
  beside `longDescription`/`details`. Now each band row has one authored
  `longDescription`, and `Band.getLongDescription` appends what is true of
  the water there: how far you can see (the surface's read `clarityM`:
  silty brown < 2 m, cloudy green < 6 m, clear) and how far the surface is
  above you (close < 3 m, well < 8 m, a long way). A water that needs its
  own words gets an authored room (the intake's mouth).

- **R5 · `OpenWater` deleted; the place refuses.** A floor object that
  bears nobody existed only so the posture verbs had something to refuse
  through. Now the lit and dark bands set `noDefaultFloor: true`. The kernel
  `Place` gains `groundRefusal(named?)`: when the place has no floor and the
  ground is what was named (`ground`/`floor`, or the verb's default), it
  returns the `noGroundLine()` hook. Sit, lie and kneel ask it before
  "you don't see any …", and bare `stand` asks it too. `Band` overrides the line
  (*"There is nothing under you but water"*). Two `WaterPlace` reads that
  assumed a floor now treat "no floor" as open water: a dense
  arrival sinks, and the swim gate reads the place's own `stateNow()`, so
  a band under ice is still swimmable. posture.md and spatial.md are
  updated.

- **R6 · Depth costs time; deep water repeats the dark, capped.** The
  owner: the stack *"is space you have to traverse to get to surface from
  the bottom so it affects survivability"*, and it must not become a
  100-room stack. Two parts:
  - **The swim takes real seconds.** `descend`/`ascend` in the water run
    a timed step on the hands slot (`ManualBuildStep`, the generic durative
    activity) for `meters / speed`. The speed comes from
    `Respiration.verticalSwimSeconds`: by swimming band, untrained 0.4 to
    expert 1.2 m/s, and ±0.5 m/s per 100 N of weight or lift (ballast
    speeds the way down and slows the way up). The step lands at completion.
    `stop`, or blacking out on the way, leaves you where you were. Weight
    refuses the way up before you spend breath on it. Going into the water
    from a shore stays instant.
  - **The dark repeats.** `ColumnBand` gains `dark-<n>`. The dark between
    the light's end and the bed is cut into about one band per
    `water.column.darkBandM` (10 m, an atmosphere), capped at
    `water.column.maxDarkBands` (5); past the cap the bands thicken. So a
    60 m sea is lit + 5 dark + bed, and a 1,000 m trench is still seven
    rooms with long swims between them. Every dark band clones the `dark`
    row, keyed `<surface>#dark-<n>`. Waters that ship today are unchanged
    (the Kestrel is lit/dark/bed).
  - The drive's `stroke()` helper waits for each arrival. ⚠ Tuning risk: an
    untrained diver in the cold Kestrel has about 45 s of breath after cold
    shock, and the 6 m down and back now takes about 30 s. The drive shows
    whether the numbers hold. ⚠ Not modeled yet: the swim's effort does
    not raise the breath burn (no `effortW` on the step), and hauling a
    body up a lifeline is still instant.

- **R7 · `exhale` help** describes what it does: empties the lungs, so you
  sink, at the cost of the air you held.
- **R8 · `haul` → `pull`, and the pull takes time.** The owner worried
  about poisoning the well for the cargo and logistics design. `haul`,
  hauler and haulage are that domain's words, and the kernel already had
  `HaulableMixin` (a cart you hitch), so a second `Haulable` meaning "a
  thing on a line" collided by name. Now the verb is `pull` (no `haul`
  alias). `lib/spatial/Pullable.ts` replaces it (`pullBy`, `PullSense`,
  `PullOutcome`), `PullController` replaces `HaulController`, and the
  fishing pot, the lifeline, the hoist, the tender's brain, help texts,
  fishing.md and both wire drives are updated. ⭐ `PullOutcome` gains
  `takes: { realS, finish }`. A lifeline pull says its start now and lands
  after the meters, hand over hand (0.6 m/s, slower with a heavy load, plus
  5 s for the steps), as a timed step on the puller's hands. `finish`
  re-checks that the line is still held and the diver still where they were.
  Pots and the bell stay instant. ⚠ `lint:completion-this` caught a real
  defect in R6: the timed swim's completion called back into its
  controller, which is destroyed when `execute` returns, so the swim
  would have played its line and never arrived. Both completions now run
  module functions with everything resolved before the engagement.

- **R9 · One act per way down; `dive` from a quay.** `swim down` skipped
  the timed swim that `descend` ran: two verbs for one act, disagreeing.
  The time now belongs to the way. The kernel `Exit` gains a
  `crossingRealS(mover)` hook (0 for an ordinary step), `ColumnExit`
  answers it with the meters over the body's vertical speed, and the
  movement base asks it on every crossing. A timed crossing checks the gates
  first, holds the hands that long, and crosses at the end. So `descend`,
  `dive` and `swim down` are one act. `WaterPlace.wayDown/wayUp` pick the
  way and refuse in words. `dive` moves to swim's words: from a quay it
  goes in, in the water it goes down.
- **R10 · `heave` is `throw … to`.** `throw` gains a `to <name>` form
  for a toss meant to be caught, over a kernel `Tossable` shape
  (`lib/spatial/Tossable.ts`). The lifeline answers it, keeping its reach
  into the water below a quay; anything else is told to throw it AT
  someone or hand it over. `heave` is one of throw's words. The
  `HeaveController` and its view are deleted. A binder test pins
  `throw rock to mara`.
- **R11 · `spear` is `fish` with the spear in hand.** `TakesFish`
  (`trade-fishing/src/lib/TakesFish.ts`) is the shape of a tool that
  takes a fish itself. `FishController` narrows by shape: a held striker,
  or a named one with `fish using spear`, strikes; a `Rod` casts. The rod
  arg's `requires` is now `any` so a weapon can be named, and anything
  that is neither refuses. The spear affords `fish`; `SpearController` and
  its view are deleted.

- **R12 · `write` is the world's verb; `jot` is gone; the shell's verb is
  `edit`.** The owner: a label is a noun (bottling will affix one); a
  personal note is writing on a personal thing, and there is no writing
  only its author can read. A notes app on the implant is the exception,
  and it goes in the personal-calendar slate. Done here:
  - The shell's authoring view `write` becomes `edit` (`shell/edit.yaml`;
    the class stays `WriteController`, which the CMS and Studio gates
    cite). Docs follow. The tree pivot (`content edit`, `source ls`, …)
    is recorded as command-taxonomy item 8.
  - `MarkedMixin` gains `writingRoom` (authored characters; 0 = takes no
    writing) and `writeOn(by, words)`: held, or fixed where it stands,
    within the room, appended after what is there. How it reads is the
    surface's own form (ink needs light and runs; a scratch doesn't).
    `write` is afforded beside `read` by everything Marked, and
    `write <words> on <thing>` is the kernel `WriteOnController`. A binder
    test pins the free-text-then-`on` shape.
  - The slate is a thin `MarkedMixin(Good)` with `writingRoom: 240`; `jot`,
    `JotController` and `Slate.jot` are deleted.
  - Not done (recorded): a writing implement (pencil, chalk, knife) and
    literacy; the shipped `label` verb's reconciliation with label-as-noun
    (cannery-and-bottling slate).

## Drive record


### Drive runs 1–21 (2026-10-19) — in progress

`packages/wire/tests/underwater.dirty.wire.test.ts`, 15 checkpoints. Best
run so far: **run 19, 6 green** — 1 (the quay reads the water), 15d (the
almanac on the quay), 18 (the tide at the mouth in words; `analyze water`
gives the stream), 16 (the tidepool cut off at low water, its oxygen
falling), 19 (the frog dives and comes up on its own breath), and 10a-dm
held as `it.fails` (the PRE-EXISTING online-scope defect: `dm`/`tell`
resolve nobody, even by the exact displayed name).

**What the drive found, every one fixed and committed:**

| run | found | fix (commit) |
|---|---|---|
| 1 | the diving dress authored `gradeBand: good` (not a band); the dive outfit's stock loads at login → every login 500 | `fine`/`fair` (7c2424c34) — no lint checks the grade-band vocabulary: a finding |
| 5 | ⭐⭐ a full breath was 6 REAL seconds at the 12× clock; both divers blacked out before they could type | respiration's clock is the game clock over the world scale — breath is real-time (7c2424c34) |
| 4–8 | every place citing the Kestrel (bank, basin, each band) did its own multi-second river read; `descend` waited 30 s; every tidal shore re-read the whole sea every 10 game-minutes | ONE read per water per segment, shared; `WaterSource.retide` brings a held read's tide current (0094ad00c) |
| 7 | `climb up` out of the basin refused — WaterPlace.canExit admitted only swimming | climbing out admitted (0094ad00c) |
| 7 | surfacing printed "You can't breathe!" (a drain tick between arrival and reassess) | a body at the surface reassesses, silently (0094ad00c) |
| 15 | a fresh world starts in winter: rotten ice on the confluence, a ceiling over a diver | the drive dives in summer; `descend` onto ice says it is iced over (e75251ae3) |
| 16–17 | ⭐ a one-day clock jump cost 20 s: the frog at the mere's surface trod water and the breath engagement beat every 2 GAME seconds | the beat is real-time (× the world scale); a small body floats on a small lift (e75251ae3) — 1.8 s a game day |
| 19 | `ascend` at the surface tried to swim the basin's `up` (the quay wall) | at a water's surface `ascend` says you are there (c05c1dd39) |

Drive-side lessons: one honest breath per dive (two inhales inside ten
seconds is hyperventilating — the warning goes, requirements step 4);
work gear left on the quay (weight refuses the way up; carrying it all is
"carrying too much to swim"); several air bags are named `me:i:bag`;
the dive counter's air-bag par is 6 (import lines refill at the reset
sweep, not on the game clock).

⚠ **Blocked on memory, not on code** (runs 20–21): an owned drive world
holds ~3 GB; with a sibling worktree's world up on 2010 (build-3) the
16 GB box swaps, a clock jump outruns its 300 s headers timeout, and the
session's memory reaper stopped run 20. The drive resumes when only one
world is up.
*(appended at build time, not at plan time)*
