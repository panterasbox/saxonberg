# The pump — implementation plan

Executes [pump-requirements.md](../requirements/pump-requirements.md).
**Kind:** feature · **Leads from:** kernel · **first consumers:** the
village well at Rejection (hand suction pump), a brine bore with no head
(a force pump fitted after the fact), and the Wharfside city intake (a
grid-powered pump that finally costs a watt and can be switched off).

What is built: a kernel **pump** substrate — a `Pump` thing with five
authored facts (mechanism · lift · throughput · power · seal), a
displacement-mechanism ROW vocabulary that carries the suction law, a
`LiftSource` shape any fluid-at-depth host answers, the suction ceiling
as arithmetic over the pressure the place already resolves, the `pump`
verb unified behind one interface the furnace bellows now implements,
leather packing as a placed `Durable` tool that wears with use, a tap
that reads the main it is plumbed to, and three content attachments in
three packs. Nothing underneath it is new.

---

## Grounding

Every fact below was verified by opening the file on `reqs/pumps` at
`805bd78ea` (2026-10-09). Where the Phase 1 survey was stale or shallow,
the correction is marked ⚠.

### The attach point

- `packages/content/trade-drilling/src/thing/Wellhead.ts` —
  `PersistableMixin(BulkableMixin(GroundPointMixin(Good)))` (l.173).
  `BAILER_L = 12` (l.122), `liftL(): number` returns it (l.529),
  `async lift()` lifts `min(liftL(), sumpL)` from the sump into the
  `interior` slot via `addToHead` (l.541–550). Fields `depthM`
  (authorable), `linedToM` (authorable), `swingBank`, `rigStamp`,
  `sumpL`, `drawnL`, `bodyKey`, `outfitPath` (authorable), `claimPath`
  (authorable) — ⚠ **`bodyKey` and `sumpL` are persistent but NOT
  authorable** (l.203–213), which matters for W3. `reconcileRig()` runs
  hourly on a world-clock handle **armed only by the siting act**
  (`armRig`, l.298; the header at l.276–290 explains the `lint:on-create`
  ratchet) and also at the top of every `lift()`; a wellhead nobody sited
  still reconciles on read. `reconcileInflow` seeps into the sump when
  `headAtm() < FLOW_FLOOR_ATM` and the hole stands in a leg
  (`deposit.legAt(body, x, y)` — presence by (x, y), not by depth).
  `crewOnShift()` reads the ROOM's contents for rostered hands.
- `packages/content/trade-drilling/content/trade/drilling/cmd/drilling/bail.yaml`
  — positional `hole` (`requires: [GroundPointMixin]`) FIRST, then three
  `greedy: true` prepositional args; the header comment states the
  boot-fatal ordering rule. `rig` defaults to `reachable:[capability.derrick]`
  and `BailController.noDerrick` refuses without one.
- `packages/content/trade-drilling/src/idea/cmd/drilling/BailController.ts`
  — the trip is an engagement; `completeBail` is a MODULE function (the
  destructed-controller scar, documented in its header); it calls
  `hole.lift()` and then `BulkableApi.transfer(from, into, {kind:'measure',
  litres, mode:'lenient'})`.
- `packages/content/trade-drilling/src/idea/cmd/drilling/BoreController.ts:275–279`
  — `bore` refuses with `wants-bailing` when `getSumpL() > 0 && headAtm()
  <= 0`. This is AC 7's second half and it ships.
- ⚠ `packages/wire/tests/drilling.dirty.wire.test.ts:666–705` records that
  two hands over a full game day moved the hole **one metre**
  (`SAMPLE_CAP_S` caps each reconcile at one hour of credit). **Sinking a
  bore to a brine leg inside a drive is not feasible** — the pump drive
  needs a bore that already exists (D13).

### The verb to unify

- `packages/content/platform/content/platform/cmd/device/pump.yaml` —
  `verbs: [pump, work]`, controller `/platform/idea/cmd/device/PumpController`,
  one `target` arg `scope: reachable`, `requires: BurnerMixin`,
  validators animate/conscious/embodied + `canReach`. `work` is claimed
  by no other view (grep of every `verbs:` line).
- `packages/server/src/mud/platform/idea/cmd/device/PumpController.ts` —
  extends `CommandController`, synchronous; four exits: `empty-result`,
  `not-a-furnace` ("has no bellows to work"), `no-bellows` (same prose,
  `getBellowsMultiplier() <= 1`), `not-lit` ("You work the bellows, but X
  is cold — air without fire moves nothing."); then toggles
  `setBellowsActive` with the two scenes ("You lean into the bellows, and
  X roars up white-hot." / "You ease off the bellows, and X settles back
  to its banked glow."). ⚠ **It has no controller test**
  (`platform/idea/cmd/device/__tests__/` holds none for it); AC 10's
  only shipped assertion is `fire.dirty.wire.test.ts:495–500`, which
  checks that `pump forge` is *understood*.
- `packages/server/src/mud/lib/fire/Burner.ts:291–330` — `pump.yaml` sits
  in the `peers` bucket only. `bellowsMultiplier` (authorable) and
  `bellowsActive` (runtimeState) at l.347–363; `isBellowsActive` /
  `setBellowsActive` / `getBellowsMultiplier` / `isLit` /
  `fuelRemaining` are the methods the controller uses.
- The protocol precedent: `packages/server/src/mud/lib/ground/Workable.ts`
  (`planWork` → `WorkPlan | WorkRefusal`, `completeWork` → `WorkResult`;
  a declared SHAPE, nothing composes it; each controller carries a
  module-private narrowing — `DigController.ts:37–57`) and
  `platform/idea/cmd/ground/WorkedActController.ts` (`land()` as a
  module function; `engageAct` from `GroundWorkController` →
  `EngagedActController`, whose `EngagedStepOptions.cost` is a felt
  percentage converted by `wattsForFeltCost`). The watts-native variant is
  `platform/idea/cmd/crafting/ManualBuildController.ts` — `engageStep`
  takes `BuildStepOptions` with a **required `effortW`**, checks
  `canExert` first, and starts a `ManualBuildStep` (`lib/craft/ManualBuildStep.ts`,
  `effortW?: number`). `LiftController` is the exemplar consumer.

### The physics, shipped

- `packages/server/src/mud/lib/biome/Atmospheric.ts` — `_pressure` /
  `_detailPressures` (l.400–434), `getPressure(detailKey?)` forwards to
  `BiomeApi.resolvePressureFor(self, detailKey)` (l.589–591), `setPressure`
  asserts `'Pa'`.
- `packages/server/src/mud/api/biome.ts` — `densityOf(tag): Quantity<'kg/m³'>`
  (l.162), `getRootBiome()` (l.204), `resolvePressureFor(scope: Stuff &
  Container, detailKey?)` (l.222), `resolveGravityFor(scope, detailKey?)`
  (l.259). Logic in `platform/idea/api/BiomeLogic.ts`
  (`pressureFromElevation` at l.843 — `P = P_sea − ρ·g·h` when the walk
  falls through to the root).
- `packages/server/src/mud/platform/idea/reading/AltitudeReading.ts:84–96`
  — `altitudeAt(scope, density)` computes
  `(seaLevel − localPressure) / (density × gravity)` with
  `seaLevel = getRootBiome().getDefaultPressure() ?? 101325 Pa`; `measure`
  declines `no-medium-for-altitude` when air density is 0. ⚠ The suction
  ceiling is **not literally this expression**: altitude is
  `(P_sea − P_local) / (ρ_air·g)`; the ceiling is `P_local / (ρ_fluid·g)`.
  What they share is *a pressure difference expressed as a column of a
  medium*, which is the primitive D7 extracts.
- `packages/server/src/mud/platform/idea/reading/PressureReading.ts` +
  `content/platform/idea/reading/pressure.yaml` — `scope: [here]`,
  `instrument: barometry`, `eyeCeiling: untrained` (the eye rung refuses
  and names the barometer). The instrument is a ROW:
  `generic-objects/content/stuff/thing/instrument/barometer.yaml`
  (`class: /platform/thing/Tool`, `capabilities: [barometry]`).
- Authored elevations in the whole corpus: `terminus.yaml` **35 m**,
  `hinkley-hills.yaml` **130 m**. ⚠ **Rejection authors no elevation**
  (`rejection.yaml`, `location.yaml`), so its pressure is the root
  101325 Pa and its water ceiling is 10.33 m; Hinkley at 130 m reads
  ≈ 99.8 kPa and ≈ 10.17 m. Those are the two places the drive compares.

### The power bill, shipped and inert

- `packages/content/water/src/thing/Conduit.ts` — `SwitchableMixin(Thing)`
  (l.95). `headM` persistent, resolved at construction by `resolveHead`
  (l.312–335; `reach.elevation − landM` for supply). `isGravityFed()`
  (l.337), `requiresPump()` (l.348), `pumpWattsFor(m3s)` (l.360–370) =
  `ρ·g·|Δh|·Q/η` with `BiomeApi.densityOf('water')`, root gravity and
  `AppSettingKeys.waterPumpEfficiency` (kernel key, l.2005 of
  `lib/config/AppSettings.ts`) at 0.6. `readingFor(catalogue, nowS,
  demand, draws)` (l.388–434) derives the six-word state — only `cut`
  and `off` are stored — and `pumpWatts: this.pumpWattsFor(delivered)`.
  `supplyReport(nowS)` (l.443–505) implements `SupplyReporting` and
  prints "needs a pump, and that pump draws N kW". ⚠ Confirmed: every
  caller of `pumpWattsFor` outside this file is a test.
- `packages/content/terminus/content/world/terminus/wharfside/thing/city-intake.yaml`
  — `class: /system/water/thing/Conduit`, `reachRef: kestrel:confluence`,
  `on: true`, `extent: /world/terminus`, `capacityM3S: 1.2`, a `pump`
  room **Detail** ("The pump is running. The pump is always running.").
  It is a prop of `wharfside/bank.yaml` (l.129). Wharfside's parcel is
  `landUse: industrial, powerBand: industrial, feeder: terminus-main:bank`
  (`terminus/pack.yaml:84`); the industrial band ceiling is **60 kW**
  (`energy/content/settings/energy.yaml`). ⚠ `ρ·g·5·1.2/0.6 = 98.1 kW`:
  the intake's own numbers exceed what its premises' band supplies (see
  Risks — this is a finding, not a defect the plan hides).
- `packages/server/src/mud/lib/supply/SupplyState.ts` — the six words,
  `SUPPLY_STATE_PRECEDENCE`, `SUPPLY_STATE_GLOSS`, `SupplyReporting`
  (optional async `supplyReport(nowS)`), and `StreetLightingSupply` whose
  `isServingNow(path)` is **sync** "because the vision walk asks" — the
  precedent for the sync read D10 adds.
- ⚠⚠ **No tap in the realm reads any conduit.** `WaterFixture`
  (`platform/thing/WaterFixture.ts`) is
  `UnboundedSourceMixin(ThermalMixin(BulkableMixin(Thing)))`, `fixedInPlace`,
  affords `wash`/`rinse`/`cool`; it knows nothing about a main.
  `StorageNode.serves(path)` and `headOverServedGroundM()` have **no
  caller outside the class and its tests**. The requirements' sentence
  "every tap above it reports an honest supply failure in the vocabulary
  that already exists" is true of the *vocabulary* and false of the
  *tap* — the link is this build's (D10). The Terminus taps that exist
  under the intake's extent: the Duncan Hall tap (eternal-university
  pack), and standpipes in **prose only** at `market/offstage.yaml`.
- The water pack ships no controllers and no command views (its
  `src/idea/cmd/perception/__tests__/` tests the two READING classes
  `WaterReading` / `PowerReading`, which ride the platform's flat
  `analyze`). `analyze water <target>` narrows on `SupplyReporting` by
  shape (`WaterReading.ts:156`); `analyze power <target>` duck-types
  `availablePowerW` for a consumer (`PowerReading.ts` header).

### Power sources

- `packages/server/src/mud/lib/supply/Powered.ts` — the kernel shape
  `isPowered()` · `availablePowerW()` · `poweredTrajectory(fromS, toS):
  Piecewise`. `lib/Trajectory.ts` — `Piecewise.integrate(f, subSteps)`
  (l.137). The structural read precedent is
  `lib/biome/Atmospheric.ts:1634–1643` (`poweredTrajectoryOf(host)` tests
  `typeof h.poweredTrajectory === 'function'`).
- `packages/content/energy/src/lib/GridPowered.ts` — implements `Powered`;
  the meter resolves LAZILY on first read (header ⚠); `availablePowerW()`
  is the band ceiling while powered; `poweredTrajectory` is the
  catalogue's cut-complement. Composed by `ElectricLight`
  (`GridPoweredMixin(LightSourceMixin(SwitchableMixin(Thing)))`) and
  `ColdStore`. ⚠ **No pack outside `energy` imports it today.**
- ⚠ `switch.yaml` (`requires: SwitchableMixin`) is afforded by exactly
  one static in the tree: `arcana/src/thing/ManaLamp.ts:55–56`. Neither
  `SwitchableMixin` nor `ElectricLight` affords it. An `ElectricPump` must
  declare it itself (D11).
- `packages/server/src/mud/platform/thing/LoadDevice.ts` + `LiftController.ts`
  — the human rung: `effortW = load × wattsPerKg`, paid at completion by
  `SchedulerRegistry.emitExertion` (l.496–503) → `actor.exert({durationS,
  powerW})`. `lib/exertion/Exerting.ts` — `exert` debits only the excess
  over `sustainableW()`, grows wind/lean, deposits `(1 − η)` of the work
  as heat with `η = dial(AppSettingKeys.exertionEfficiency, 0.25)`
  (l.272). `canExert` is the double-shift refusal. ⭐ **`exertionEfficiency`
  is the muscle-efficiency dial D6 needs; nothing new is minted.**
- `lib/slot/Hauler.ts` — composed on `Character` and
  `platform/agent/DraftAnimal` only; its ONLY reader is `hitch.yaml`'s arg
  gate. Out of scope; read for its placement lesson (conveyance.md:226–246).

### The seal

- `packages/server/src/mud/lib/material/Durable.ts` — `wear(amount =
  WEAR_PER_USE 0.01)`, `isBroken()` at `crafting.brokenThreshold`
  (fallback 0.1). `lib/craft/Tooled.ts:111–116` — `hasCapability` is
  **false on a broken Durable**: capability loss, not a state machine.
- `platform/thing/Tool.ts` — `CraftedMixin(ToolMixin(DurableMixin(Good)))`,
  deliberately empty. `trade-mining/src/thing/TimberSet.ts` extends it and
  stamps `capabilities = ['timber-set']`; `Working.supportHere` sums the
  sets standing in the room, condition-weighted (mining.md:272).
- `platform/cmd/crafting/repair.yaml` — `item` `requires: DurableMixin`,
  kit `capability.mending or capability.anvil`; its help says **"Restores
  fully — gear never obsoletes, it asks for care"**, and
  `CraftingApi.repair` prices the material cost off the deficit (doubled
  when broken) and draws same-kind stock. ⚠ Nothing in the shipped repair
  economy makes a good *unrepairable*. The requirements' drive step 6
  ("wear it out past repairing") assumes otherwise — see Risks & opens.
- `packages/content/trade-tanning/` — `Hide.ts`, `Tanpit.ts` (affords
  `tan` in `peers`), `lib/Tanning.ts`, one recipe `recipes/salt-hide.yaml`,
  the `leatherwork` Discipline row. `trade-drilling/content/recipes/bailer.yaml`
  is the recipe shape to copy (`inputSlots: hide · stave`,
  `toolCapabilities: [cutting]`, `outputTemplate`, `discipline: leatherwork`).
  The leather material (`base-library/.../material/organic/leather.yaml`)
  tabulates **no `spoilActivationEnergy`**, so a leather `Tool` passes
  `lint:perishable`.
- ⚠ `platform/idea/cmd/crafting/MakeController.ts:31–36` — `make` is
  gated by `requireDeed(...)`: a catalogue recipe must have been
  **learned** by a first faithful hand build. A drive cannot `make
  packing` on a fresh character. The drilling drive answered the same
  problem by propping its kit on the claims-office hire rack
  (`rejection/.../location/claims-office.yaml:36–60`) because ⚠⚠ the
  Rejection provisioning till **cannot take money** (`settleSale` → null
  → `insufficient-funds`; two drives have hit it). The Terminus tannery
  (`wharfside/tannery/idea/outfit.yaml`) is a Business with a VACANT seat
  and no counter — nobody sells leather goods anywhere.

### Fluid movement

- `packages/server/src/mud/lib/bulk/Bulkable.ts` — the `Bulkable`
  interface's host-policy seams (l.395–423): `getBulkPayloadForDraw`,
  `getBulkAvailable`, `isBulkEmpty`, `debitBulk`; base impls at l.839–898.
  `BulkSlot.remaining()` (l.306). `lib/bulk/UnboundedSource.ts` overrides
  three seams and validates composition (`__validateComposition__`).
  `lib/fractionation/Fractionating.ts` overrides `getBulkMaterialPath`
  (l.571), `getBulkAvailable` (l.608), `debitBulk` (l.659),
  `getBulkPayloadForDraw` (l.678) — the four-seam shape
  (fractionation.md:113–140).
- `platform/idea/cmd/bulk/FillController.ts` — `fill X from Y` is a thin
  direction over `BulkableApi.transfer`; `applied <= 0` prints "You can't
  fill X from Y." with no reason beyond the transfer's own notes.
- `lib/spatial/Container.ts:21` — witness hooks `canAddContainable` /
  `canRemoveContainable` (pre-mutation veto) dispatched by
  `ContainmentApi.move`. `lib/stuff/Staged.ts` — `props:`/`cast:` on a
  **Container** host; props are captured on a persistable host.
  `platform/cmd/inventory/put.yaml` — `target` `requires: [VisibleMixin,
  ContainerMixin|PlacingMixin]`, prepositions `in/into/on/onto/from`.
  ⚠ **No row can author a `Placement` onto another prop** (no
  `applyPlacement`; no shipped row carries `placement:`), which rules out
  the Placing route for a pump born fitted — see D4.
- `platform/idea/Placement.ts` + `PlacementCatalogue.ts` + the three rows
  under `content/platform/idea/Placement/` — the enum-became-rows
  precedent `lint:closed-vocabularies` cites. The catalogue warms in
  `onCreate` (which is why D1 does **not** add a catalogue).

### Readings

- `lib/instrument/Reading.ts` — a channel is a ROW; `analyze`'s hook
  `analyze(context, subject, band, handTool, param)` (l.473), `measure`
  (l.491); `bracketed(...)` (l.714), `seedFor` (l.784), `decline`, `report`.
  Rows: `channel`, `kind`, `scope`, `subjectRequires`, `discipline`,
  `instrument`, `instrumentNoun`, `handTool`, `eyeCeiling`, `bench`,
  `improves`, `stakes`. `platform/idea/ReadingCatalogue.ts` warms by the
  `idea/reading/` infix, lazily on first miss. `analyze.yaml`'s `subject`
  is `greedy: true`, `requires: any`. `trade-drilling/.../HeadReading.ts`
  is the exemplar of an eye rung that answers in words with no digit.

### Content homes

- `packages/content/rejection/` — rows only, no `src/` (its README makes
  that a reviewer's check). Rooms: the pithead yard
  (`location/pithead-yard.yaml`, hub, outdoor biome, `props:` already
  carries the tram and the board), the claims office (the hire rack),
  the Dry (a water butt in prose only), the salt country (`salt-spring`,
  `salt-flat`, `seep-hollow`, `oil-rise`, `dry-rise`, `gas-flat`). The
  salt flat's prose says *nothing anybody has ever bothered to stake*
  and that is its pedagogy (the crest says nothing; the instrument does).
- `packages/content/hinkley-hills/.../thing/district-tank.yaml` —
  `StorageNode`, `elevationM: 145`, gravity. `thing/standpipe.yaml` —
  `WaterFixture`, propped in `lots/yard.yaml`. ⛔ Untouched by this build.
- `packages/content/generic-objects/pack.yaml` claims `/stuff/thing/gear`,
  `/stuff/thing/instrument`, `/stuff/thing/fixture` among others; a pump
  row lands under a claimed extent (`lint:untitled`).
- Kernel platform rows (mechanisms, the reading) live in the platform
  pack at `packages/content/platform/content/platform/idea/...`
  (`Placement/on.yaml` and `reading/pressure.yaml` are the shapes).

### Gates and harness

- `pnpm -C packages/server lint:family` is the derived roster; all
  passing at plan time. Ratchets whose ceilings are near this build:
  `ON_CREATE_CEILING = 82` (no new `onCreate` is planned),
  `CLOSED_VOCABULARY_CEILING = 5` (no new kernel list is planned),
  `LIB_STATICS_CEILING = 341` (new `lib/` files carry only
  `_mixinName` / `fieldMeta` / `commandContributions` statics; run
  `--report` before and after W0 — a rise is a caller audit),
  `RECONCILE_CHAINS_CEILING = 0` (its regex matches temperature samplers;
  the pump's reconcile integrates a trajectory regardless),
  `DECLARED_NEVER_CONSUMED_CEILING = 0` / `REQUIRED_NEVER_DECLARED = 0`
  (the `packing` capability must be declared by a row AND consumed by a
  `hasCapability('packing')` in source, in the same wave).
- `packages/wire/src/harness/index.ts` exports `Session`, `declareFile`,
  `uniqueHandle`, `plain`, `expectOk`, `expectRefused`, `expectNote`,
  `engagementIdOf`, `isOwnedTestWorld`, `advanceWorldClock`,
  `worldClockNow`. `Session.open(handle, { startLocation, wizard })`,
  `cmd`, `prose`, `drainProse`. `drilling.dirty.wire.test.ts` is the
  nearest precedent (funding by `reserve override`, `daylight()`,
  `walk()`, the `WIRE_BOOT_TIMEOUT` note for a fresh DB).

---

## Plan-level decisions

**D1 — Two families, family B only, and the mechanism is a ROW.**
The requirements split the ladder into bucket machines (family A,
`LiftMixin`'s, three slates' — untouched) and displacement machines
(family B, this build). The ceiling belongs to *pumps that pull*, so a
pump row names its mechanism and the law follows from the mechanism.
The mechanism is a **row**, not a closed union: `platform/idea/PumpMechanism`
(`SingletonMixin(Idea)`, `PATH_INFIX = '/idea/PumpMechanism/'`; fields
`name`, `pulls: boolean`, `description`) with two rows in the platform
pack, `suction` (`pulls: true`) and `force` (`pulls: false`). A pump
holds an identity ref to its mechanism and resolves it with
`StuffApi.singleton(path)` on its (async) plan path — **no catalogue, no
`onCreate` warm, no kernel list** (`lint:closed-vocabularies` stays at 5,
`lint:on-create` at 82). A third mechanism (`centrifugal`, `sucker-rod`)
is a row with `pulls:` set honestly. *Reasoning:* `lint:closed-vocabularies`'
own header names `Placement` and the reading channels as the shape; a
convenience list in kernel source is the thing a pack can never add to.

**D2 — `PumpingMixin` in a new `lib/pump/` subsystem, `platform/thing/Pump`
as its instanceable twin.** The mixin is the capability (narrowed by
`MixinApi.isPumping`, named in `Mixins.Pumping = 'PumpingMixin'`, refusal
`"{} isn't a pump"`), the class is what rows name. One kernel host today
(D15 places the pack subclass in `energy`); the mixin exists so a pack can
compose the capability over its own mover without subclassing a concrete
kernel class, and so arg gates and readings can name it. ⚠ A new
`lib/<subsystem>/` folder is a new subsystem by the project's rule — the
subsystem is **the pump**, documented at `docs/subsystems/pump.md` (W5);
it is not bulk (bulk is matter and nothing else, by its own header) and
not fire.

**D3 — The hand rung is the worked-act protocol, and the bellows is its
second implementer.** `lib/pump/Pumpable.ts` declares `Pumpable`
(`planPump(by) → PumpPlan | PumpRefusal`, `completePump(by, token) →
PumpResult`) in the exact shape of `Workable`. `BurnerMixin` implements it
(a refusal for `no-bellows` / `not-lit` with the prose the controller
prints today; a plan with `durationMs: 0`, the toggle in `completePump`
returning the two existing scenes). `PumpingMixin` implements it (a stroke
session on the hands). `pump.yaml` targets **the thing you stand at** —
a furnace, a well, a wellhead, or a loose pump — with `requires: any`
(the `dig.yaml` reasoning, verbatim: three things share no mixin and an
alternation deletes a check). `PumpController` becomes a
`ManualBuildController` (the `LiftController` shape: `engageStep` with a
watts-native `effortW`), narrows the bound target by shape
(module-private `asPumpable`), **hops one level into a bound container
for the pump set in it**, and lands the completion in a module function.
AC 10 is then provable by a controller test that did not exist.

**D4 — A pump is a `Good` SET IN its source; a source is a `Container`
that accepts only pumps.** The requirements say a pump is fitted, moved,
and swapped (step 5: *get a force pump onto the same source*). The
coupling must be dynamic and must survive boot for the village well
(born fitted). Placement (`put pump on well`) cannot be authored into a
row today (grounding ⚠), so the coupling is **containment**: `Well`,
`Wellhead` and `Conduit` compose `StagedMixin(ContainerMixin(...))`,
veto everything but a `PumpingMixin` host in `canAddContainable`, and
ship their pump in `props:`. `put pump in well` / `get pump from well`
are the shipped verbs; `pumpFitted()` on the source and `sourceOf()` on
the pump are one containment read each. The same shape holds the seal:
a `Pump` is a `Container` that accepts only a thing offering `packing`,
`put packing in pump`, `props: [packing]` on a row. ⚠ The veto narrows
CONTENTS, not the host set — a well that accepted a coin would be the
lie, and nothing re-narrows which classes may be wells.

**D5 — `LiftSource` is the one vocabulary for "the fluid stands this far
below the draw point", and it adds no field.** `lib/pump/Pumpable.ts`
declares `LiftSource`: `standingDepthM()`, `standingMaterial()`,
`standingAvailableL()`, `liftInto(litres) → litres moved`,
`liftScope()` (the place whose atmosphere applies). `Well` answers it
from its authored `depthM`; `Wellhead` answers it from the hole's own
`depthM` and `sumpL` (its `lift()` generalises to `liftInto(litres)` with
`lift()` kept as `liftInto(BAILER_L)` so `bail` is byte-identical). The
`Conduit` does **not** implement `LiftSource` — it has no draw slot; it has
a *duty* (`|headM|`, `capacityM3S`) and asks its pump whether the duty is
met. So the three places the number already lives (the well's depth, the
bore's depth, the conduit's signed head) stay where they are, and the one
new thing is the method name two of them answer.

**D6 — The body-to-object seam is `effortW` doing something, and nothing
new.** Question 4 asked for the smallest honest shape. The hand rung
reads the body through the shipped exertion path: `planPump` prices one
spell at the handle as `effortW = max(HAND_FLOOR_W, powerForDuty(h, Q) /
exertionEfficiency)` where `powerForDuty = ρ·g·h·Q/η_pump` (the conduit's
own equation, moved onto the pump) and `exertionEfficiency` is the
shipped muscle dial (0.25). The scheduler pays the body at completion
(`emitExertion`), `canExert` refuses the double shift, and the pump
lifts `throughputLps × strokeS` litres in `completePump`. The machine
rung reads its mover through the kernel `Powered` shape, structurally
(`typeof self.availablePowerW === 'function'`): a pump that has a mover
delivers `min(throughput, P·η/(ρ·g·h))`, and a pump that has none
delivers only when worked. ⭐ That is the coupling the steam-engine slate
asks for, stated as what already exists: **a prime mover is a `Powered`
implementer**, and the pump is the first thing that consumes one for
mechanical work. No new event, no new Api, no kernel field the engine
build will have to move.

**D7 — The suction ceiling's home is `BiomeApi`, as two statics, and
`AltitudeReading` is refactored onto the first.** `BiomeApi.columnHeightOf(
pressure: Quantity<'Pa'>, density: Quantity<'kg/m³'>, gravity:
Quantity<'m/s²'>): Quantity<'m'>` (pure: `ΔP/(ρ·g)`) and
`BiomeApi.suctionHeadFor(scope: Stuff & Container, fluidDensity?:
Quantity<'kg/m³'>): Promise<Quantity<'m'>>` (= `columnHeightOf(
resolvePressureFor(scope), fluidDensity ?? densityOf('water'),
resolveGravityFor(scope))`), both forwarding to `BiomeLogic` (the
Api↔Logic split). `AltitudeReading.altitudeAt` becomes
`columnHeightOf(P_sea − P_local, ρ_air, g)`. A vacuum answers a 0 m head,
which is the altimeter's refusal in the pump's register. The ceiling is
therefore *a consequence of where you stand* and the fluid you lift
(brine is denser than water and its ceiling is lower, for free) — no row
carries it, and `pressureFromElevation` makes a pump lift less uphill
with nobody authoring that.

**D8 — The seal is a placed `Durable` TOOL, wear is per use, and the
machine's use is its running time integrated.** The packing is a row over
`/platform/thing/Tool` (`capabilities: [packing]`, leather) that a tanner
makes from a hide (`trade-tanning/content/recipes/packing.yaml`, the
bailer's recipe with one slot). The pump refuses without a packing that
`hasCapability('packing')` — which is false the moment it is broken, so
"the packing has gone" is capability loss with no state machine. Wear: a
hand pump wears its packing per spell (`pump.wearPerStroke` dial); a
powered pump wears it per running hour, and running hours over an
unobserved gap are **the integral of `poweredTrajectory`** between stamps
(`reconcileRunning(nowS)`), never a sample of `isPowered()` now. `repair`
works on it exactly as on any Durable (soft goods: a mending kit and
leather stock), and replacement is `get packing from pump` / `put packing
in pump`. ⚠ The seal is a constitutive part in the in-flight **assembly**
requirements' terms; this build ships it as an occupant and names the
hand-off in § Deferred seams.

**D9 — `analyze pump` is a reading row, eye rung only, and it does not
explain anything.** `content/platform/idea/reading/pump.yaml` +
`platform/idea/reading/PumpReading.ts`: `scope: [subject]`, `discipline:
physics`, `instrument: ""`, `eyeCeiling: expert`. The eye rung names the
mechanism in words (*it pulls* / *it pushes*), the packing's condition in
five words and no digit (sound · worn · leaking · perished · gone), and
for a pulling pump the depth it will draw from where it stands,
`bracketed` by band. Its `improves`/`stakes` prose names no atmosphere.
The subject may be the pump or the source holding it (the same one-hop
narrowing as the verb).

**D10 — A tap reads the main it is plumbed to, synchronously, through a
kernel shape.** `lib/supply/SupplyState.ts` gains `SupplyServing {
supplyStateNow(): SupplyState | null }` beside `SupplyReporting` — the
sync sibling `StreetLightingSupply.isServingNow` already is. `Conduit`
implements it from what is sync-knowable: `cut`, `!isOn()`, and
`requiresPump() && !pumpFitted()?.isRunning()` (an unpowered or switched-
off pump reads `off` — "somebody closed it, and somebody can open it
again"; a power cut at the pump reads the same word, recorded in Risks).
`WaterFixture` gains one authorable identity ref `suppliedBy` (default
`''` = its own source, today's behaviour): when set, `isBulkEmpty` /
`getBulkAvailable` answer empty/0 while the supply reports a state, a
markup augmenter line says *"Nothing comes out of it: it has been shut
off."* (the gloss), and `supplyReport` delegates so `analyze water
standpipe` prints the main's report. Resolution is
`StuffApi.findByTemplatePath(suppliedBy)`; an unresolved main **fails
open and logs once** (a tap on a main the world has not loaded behaves as
it always has; `analyze water tap` says the main could not be found).
`dry` / `frozen` / `fouled` need the river and are **not** read at the
tap in this build (Deferred seams).

**D11 — The city's pump is a thing in the `energy` pack, and the conduit
delivers what its pump can.** `/system/energy/thing/ElectricPump =
GridPoweredMixin(SwitchableMixin(Pump))`, affording `switch.yaml` in
`peers` + `environment` (the ElectricLight precedent for composition; the
ManaLamp precedent for the affordance, since nothing else affords
`switch`). It is the electric appliance the energy pack owns, exactly as
it owns `ElectricLight` and `ColdStore`; the water pack keeps shipping no
verbs and no mover. The `city-intake` row gains `props: [intake-pump]`
and loses its `pump` Detail (the prose moves onto the pump row);
`Conduit.readingFor` adds the pump trouble and caps `delivered` at
`pump.deliverableM3S(|headM|, demand)`; `pumpWattsFor` reads through the
fitted pump's `powerForDuty` when one is fitted and keeps its own
expression when none is (the aqueduct, gravity-fed, still reports 0 W and
is otherwise untouched — AC 8's second half, AC 13).

**D12 — The village and the deep well are two `Well` rows in Rejection,
and the pumps are `gear` rows.** `platform/thing/Well =
StagedMixin(ContainerMixin(ThermalMixin(BulkableMixin(Thing))))`,
`fixedInPlace`, implementing `LiftSource` over an authored `depthM`
(metres from the collar to the standing water) with an inexhaustible body
below (`standingAvailableL = ∞`; the finite aquifer is a named non-goal)
and a bounded `interior` slot (the trough at the collar) that starts
empty — so `fill bucket from well` before anybody pumps says, honestly,
that there is nothing in it. Rows: `rejection/.../thing/village-well.yaml`
(`depthM: 6`, `props: [hand-pump]`) propped in the pithead yard, and
`thing/deep-well.yaml` (`depthM: 14`, no pump) propped at the far fringe
(builder reads the room first; any Rejection room off the pithead with
room in its prose for *"a well somebody sank and gave up on"* will do).
Pump rows in `generic-objects` under the claimed `/stuff/thing/gear/`:
`hand-pump.yaml` (`mechanism: .../suction`, `throughputLps: 0.5`,
`strokeS: 20`, `props: [packing]`) and `force-pump.yaml` (`mechanism:
.../force`, `liftM: 30`, `throughputLps: 0.4`, `props: [packing]`), the
force pump propped on the claims-office hire rack with the drilling kit
(the shipped answer to a till that cannot take money).

**D13 — The brine bore the drive fits a pump to is AUTHORED, and
`bodyKey` becomes authorable to make that possible.** Sinking a bore in a
drive is not feasible (grounding ⚠: a game-day of crew moves one metre).
`Wellhead.fieldMeta.bodyKey` gains `authorable: true` (one line, drilling's
own class), and Rejection ships `thing/old-brine-bore.yaml` (`class:
/trade/drilling/thing/Wellhead`, `depthM` > 11 — e.g. 25 — `bodyKey:` the
quarry-hill brine body's key, `linedToM` as the ground wants) plus a
propped `/trade/drilling/thing/derrick` in the same room, at the **salt
spring hollow** — the rim, where drilling's own pedagogy says a bore finds
a metre of leg and is not worth a crew; *somebody sank it where the brine
showed and walked away* is the story the hollow already tells. Not the
flat: the crest's whole lesson is that nothing on the surface tells you.
An unsited wellhead has no clock handle, so inflow is reconciled on read;
the drive advances the clock and bails. This also makes AC 11 provable
(depth > 10.33 m, `bail` lifts its load) and AC 7 cheap (`bore` refuses
`wants-bailing` at a hole with a sump and no head).

**D14 — The `Wellhead` keeps producing while hands are on shift.** AC 6's
*continuous rate*: `reconcileRig` credits, after `reconcileInflow`, the
fitted pump's lift from presence — `pump.throughputLps × 3600 × hands ×
PUMP_DUTY` litres per hour of elapsed presence (capped by the sump and
the slot), and from a running powered pump at full duty — so a producing
hole with a crew fills casks while its owner sleeps. The hand's own
spell at the handle is `pump wellhead`, strictly more than one bail over
the same span (0.5 L/s × 20 s = 10 L per 20 s against 12 L per 30 s).

**D15 — Staging is six waves, kernel first, each landable.** W0 the
kernel substrate; W1 the verb and the reading; W2 the village (rows,
tanning, the wire file is born); W3 the bore; W4 the city; W5 the docs
and the slates. The wire file grows a suite per wave from W2.

---

## ⭐⭐ Host placement

For every new field, mixin, interface and class: the host, and what
composing it claims about everything else on that host.

| what | host | the claim, and what it refuses |
|---|---|---|
| `PumpingMixin` (`lib/pump/Pumping.ts`) | `platform/thing/Pump` only (and pack subclasses of it) | *this is a displacement machine that moves a fluid.* ⛔ Not on `BurnerMixin` — a furnace is not a pump; its bellows implements the **protocol** (`Pumpable`), not the capability. ⛔ Not on `Tool`/`Good`. |
| `Pumpable` (interface) | `BurnerMixin`, `PumpingMixin` | *a person can work this with their hands.* Sources do **not** implement it; the controller hops one level into a bound source for the pump set in it. |
| `LiftSource` (interface) | `Well`, `Wellhead` | *a fluid stands some way below my draw point and can be raised into it.* ⛔ Not `WaterFixture` (a tap has nothing below it). ⛔ Not `Conduit` (it has a duty, not a draw slot — D5). |
| `ContainerMixin` + `StagedMixin` | `Pump` (holds its packing), `Well`, `Wellhead`, `Conduit` (hold their pump) | each vetoes everything else in `canAddContainable` ("Only a pump goes in a well." / "Only a packing fits in the barrel."). The veto narrows **contents**, never which classes may be wells. ⚠ `Wellhead` is `Persistable` outermost — `PersistableMixin(StagedMixin(ContainerMixin(BulkableMixin(GroundPointMixin(Good)))))`; props and a player-set pump are captured. |
| `mechanism` (identity ref), `liftM`, `throughputLps`, `strokeS` (authorable); `runStamp` (persistent) | `PumpingMixin` | the five numbers minus power (power is the mover: the class). Nothing else needs them. |
| `depthM` | `Well` | metres from the collar to the standing water. Same word as `Wellhead.depthM` (the hole's depth, where the sump stands); both answer `standingDepthM()`, each from its own fact. |
| `suppliedBy` (identity ref, authorable, default `''`) | `WaterFixture` | *this tap is plumbed to a main.* ⛔ Not on `Bulkable` or `UnboundedSource` (a coffee urn is not on a main). An empty value is today's behaviour exactly. |
| `SupplyServing` (interface) | `Conduit` | the sync subset of the six words. A `StorageNode` and the `GridCatalogue` are later implementers, not this build's. |
| `PumpMechanism` (class + 2 rows) | `platform/idea/`, platform pack rows | a vocabulary row; resolved by path; no catalogue. |
| `Pump` (class) | `platform/thing/Pump = PumpingMixin(StagedMixin(ContainerMixin(CraftedMixin(Good))))` | a made, graded, carriable machine that holds one packing. `Crafted` so a smith's mark and grade can ride it when assembly makes it a recipe output; no `ToolMixin` (it offers no capability to a recipe). |
| `Well` (class) | `platform/thing/Well` | a fixed fixture over a standing body; `Thing` not `Good` (the `WaterFixture` reasoning: plumbed into the ground). |
| `ElectricPump` (class) | `energy/src/thing/ElectricPump = GridPoweredMixin(SwitchableMixin(Pump))` | *a pump that runs off a wire and can be switched.* ⛔ `Switchable` is NOT on `Pump` (a hand pump has no switch) and `GridPowered` is NOT in the kernel (a pack's lib; the kernel reads the `Powered` shape structurally). |
| `pump.yaml` affordance (`peers`) | `Well`, `Wellhead`, `Pump`, `BurnerMixin` (already) | a loose pump on a floor still affords the verb and declines *"It is not set in anything."* ⛔ Not `Conduit` — the intake is machinery, switched never worked (watershed's ruling, kept). |
| `switch.yaml` affordance (`peers` + `environment`) | `ElectricPump` | nothing else affords `switch` today but the ManaLamp. |
| packing row | `/trade/tanning/thing/packing` over `/platform/thing/Tool` | leather, `capabilities: [packing]`, graded by the hide. The tanning pack owns the made good and its recipe. |

**The narrowing test, applied.** The one guard this design writes is
`canAddContainable` on four hosts, and it narrows what may be *put in*,
not which hosts compose the mixin. `PumpingMixin.isRunning()` feature-
detects an optional mover and an optional switch on `this` — that is the
`poweredTrajectoryOf` shape (an optional capability), not a re-narrowing
of the host set. If a later wave finds itself writing `if
(MixinApi.isWell(source))` inside the mixin, the source shape is wrong
and the finding goes in the plan, not the code.

---

## Convention conformance

Checked against the current tree, not recalled.

- **`props:` / `cast:`** — every born-with pump and packing is `props:`
  on a `Staged` host; `populates:` appears nowhere.
- **Locations, not rooms** — no new Location class; `Well` and `Pump` are
  Things; the two Rejection rows go into existing
  `SingletonCartesianLocation` / `AuthoredWorking` rooms via `props:`.
- **The five axes and `<root>/<branch>/`** — kernel classes at
  `/platform/thing/Pump`, `/platform/thing/Well`, `/platform/idea/PumpMechanism`,
  `/platform/idea/reading/PumpReading`; platform rows under
  `content/platform/idea/PumpMechanism/` and `content/platform/idea/reading/`;
  commons rows at `/stuff/thing/gear/`; venue rows at
  `/world/terminus/rejection/thing/` and `/world/terminus/{wharfside,market}/thing/`;
  the pack class at `/system/energy/thing/ElectricPump`; the trade's
  good + recipe at `/trade/tanning/thing/packing` + `content/recipes/`.
  `lib/pump/` holds only inherited substrate (`lint:instanceable`
  invariants 1, 2, 7, 12).
- **Module scope declares; lifecycles initialize** — no module-scope
  statements; no new `onCreate`; the mechanism resolves on first use.
- **The import boundary** — `lib/pump/` imports only `mud/`; `energy`
  imports the kernel by package specifier
  (`@saxonberg/server/mud/platform/thing/Pump`); the water pack imports
  nothing from `energy`; `terminus` names `/system/energy/thing/ElectricPump`
  by row (the `hall-light.yaml` precedent).
- **Verbs live on objects** — `planPump` / `completePump` /
  `liftInto` / `pumpFitted` / `supplyStateNow` are methods on the
  objects; the two new `BiomeApi` statics are pure arithmetic and a
  resolve, not `XApi.verb(host, …)`. No new Api class.
- **Module categories** — one new `lib/<subsystem>/` folder (`lib/pump/`:
  a mixin file and an interface file, the `lib/ground/Workable.ts`
  category); no free helper, no new Api, no logic singleton, no new
  Mongo collection, no new `eslint-disable`.
- **Inter-Stuff contract** — every cross-object read is a method; the
  controller reads `model.target?.stuff` as `MqlOneResult`, never as
  `Stuff`.
- **Identity, not lineage** — the mechanism ref and `suppliedBy` are
  template paths declared `ref: 'identity'`; nothing keys a person.
- **Lint gates this build newly satisfies** (the family runs as a
  whole; these are the ones with new work in them): `lint:mixin-names`
  (`Pumping` added to `Mixins`), `lint:instanceable` (two new
  instanceable classes with rows; `lib/pump/` substrate-only),
  `lint:controller-rows` (`PumpReading`'s row ships with its class;
  `PumpController`'s row already exists), `lint:reachability` (`pump.yaml`
  afforded by four statics; every new row propped or placed),
  `lint:capabilities` (`packing` declared by the tanning row AND consumed
  by `hasCapability(PACKING)` in `Pumping.ts`, same commit), `lint:mass`
  (every new Thing row authors `mass` + `_materialPath`),
  `lint:perishable` (leather is non-perishable — verified),
  `lint:arg-kinds` (`requires: any` declared on `pump.yaml`),
  `lint:verb-collisions` (no second view claims `pump` or `work`),
  `lint:closed-vocabularies` (ceiling stays 5 — mechanisms are rows),
  `lint:on-create` (ceiling stays 82), `lint:lib-statics` (ceiling stays
  341 — verify with `--report` before and after W0), `lint:unconsumed-seams`
  (every new authorable field has a reader in the same wave),
  `lint:untitled` (every new row under a claimed extent), `lint:imports`,
  `lint:module-scope`, `lint:drive-scripts` (the drive is a wire file),
  `lint:test-bootstrap` (every new unit test imports it),
  `lint:instrument-args` (nothing hunts; the pump's source is its
  container and the source's pump is its contents).

---

## Waves

### W0 — the kernel substrate (D1, D2, D5, D6, D7, D8, D10)

**Goal.** Everything a row will name exists, is tested, and reaches no
player yet.

**Files.**
- `packages/server/src/mud/lib/pump/Pumpable.ts` — `Pumpable`,
  `PumpPlan` (`kind:'plan'`, `durationMs`, `effortW`, `beginSelf`,
  `beginPeers?`, `token`), `PumpRefusal` (`kind:'refusal'`, `reason`,
  `prose`), `PumpPrognosis`, `PumpResult` (`self`, `peers?`,
  `litres`), `LiftSource`. Types only, the `Workable.ts` category.
- `packages/server/src/mud/lib/pump/Pumping.ts` — `PumpingMixin` +
  `Pumping` interface. `static _mixinName = 'PumpingMixin'` (widened to
  `string`), `fieldMeta` (`mechanism: {persistent, authorable, ref:
  'identity'}`, `liftM`, `throughputLps`, `strokeS` authorable,
  `runStamp` persistent), `commandContributions: { peers:
  ['platform/cmd/device/pump.yaml'] }`, `const PACKING = 'packing'`.
  Methods per D3/D6/D8: `mechanism()`, `sourceOf()`, `packingFitted()`,
  `ceilingHereM()`, `powerForDuty(headM, m3s)`, `handWattsFor(headM)`,
  `planPump`, `completePump`, `isRunning()`, `moverPowerW()`,
  `deliverableM3S(headM, demandM3S)`, `reconcileRunning(nowS)`,
  `canAddContainable` (packing only). Dials: `pump.wearPerStroke`,
  `pump.wearPerRunningHour`, `pump.handFloorW`, `pump.crewDuty` — keys
  declared in `lib/config/AppSettings.ts`, values seeded in the platform
  pack's settings yaml (find the file the `exertion.*` keys are seeded
  in and sit beside them).
- `packages/server/src/mud/platform/idea/PumpMechanism.ts` +
  `packages/content/platform/content/platform/idea/PumpMechanism/{suction,force}.yaml`.
- `packages/server/src/mud/platform/thing/Pump.ts`,
  `packages/server/src/mud/platform/thing/Well.ts` (both with
  `canAddContainable` vetoes; `Well` implements `LiftSource`,
  `fixedInPlace` in the constructor, `commandContributions.peers =
  ['platform/cmd/device/pump.yaml']`).
- `packages/server/src/mud/lib/mixin.ts` — `Pumping: 'PumpingMixin'` +
  the refusal phrase.
- `packages/server/src/mud/api/biome.ts` + `platform/idea/api/BiomeLogic.ts`
  — `columnHeightOf`, `suctionHeadFor`;
  `platform/idea/reading/AltitudeReading.ts` refactored onto
  `columnHeightOf` (behaviour identical — its tests must not change).
- `packages/server/src/mud/lib/supply/SupplyState.ts` — `SupplyServing`.
- `packages/server/src/mud/platform/thing/WaterFixture.ts` — `suppliedBy`
  + the three overrides + the augmenter line + `supplyReport` delegation
  (D10). No row sets it yet; behaviour with `''` is unchanged.

**Tests** (`__tests__/` beside each, every file importing
`test-bootstrap`): `Pumping.test.ts` — a suction pump over a `Well` at
6 m plans; at 14 m refuses `beyond-suction` with the depth in the prose
and no digit of the ceiling; a force pump plans at 14 m and refuses
`beyond-lift` past `liftM`; no packing → `no-packing`; a broken packing →
the same; `completePump` moves `throughput × strokeS` litres into the
trough and wears the packing by the dial; `deliverableM3S` with a fake
`Powered` host is power-limited; `reconcileRunning` over a 0/1
`Piecewise` with a mid-gap cut wears for the powered hours only (the
`lint:reconcile-chains` lesson, asserted). `Well.test.ts` — vetoes a
coin, accepts a pump; trough bounded; `fill` from an unpumped well moves
0. `BiomeApi.suctionHead.test.ts` — 101325 Pa / water / 9.81 → 10.33 m;
at an elevation of 130 m strictly less; brine (1200 kg/m³) strictly less
than water; vacuum → 0; `AltitudeReading.truth()` unchanged at the two
fixtures its existing tests use. `WaterFixture.suppliedBy.test.ts` — a
fixture whose supply answers `'off'` reads empty and prints the gloss;
one whose supply is unresolvable reads as before and logs once.

**Acceptance.** `pnpm test:near` green; `lint:family` green with
`lib-statics` and `on-create` ceilings unchanged.
**Commit:** `build(pump W0): the pump substrate — Pumping, Well, the mechanism rows, the ceiling on BiomeApi`.

### W1 — one `pump` verb, and the bellows as its implementer (D3, D9)

**Files.**
- `packages/content/platform/content/platform/cmd/device/pump.yaml` —
  `requires: any`, description *"Work a pump — a well's handle or a
  furnace's bellows"*, help rewritten to cover both; `canReach` kept.
- `packages/server/src/mud/platform/idea/cmd/device/PumpController.ts` —
  rewritten over `ManualBuildController` (D3). Narrowing order: the bound
  target as `Pumpable`; else, if the target is a Container, the first
  content `MixinApi.isPumping` as `Pumpable`; else decline
  `nothing-to-pump` ("X has nothing to pump."). `durationMs <= 0` →
  `completePump` immediately (the bellows' instant toggle, no
  engagement); otherwise `engageStep({ durationMs, effortW, beginSelf,
  beginPeers, onComplete: () => void land(...) })` with `land` a module
  function that calls `completePump`, narrates `self`/`peers`, and
  returns if the giver is destroyed.
- `packages/server/src/mud/lib/fire/Burner.ts` — `implements Pumpable`:
  `planPump` returns `{kind:'refusal', reason:'no-bellows', prose: "<X>
  has no bellows to work."}` when `bellowsMultiplier <= 1`,
  `{reason:'not-lit', prose: "You work the bellows, but <X> is cold — air
  without fire moves nothing."}` when not lit or unfuelled and not
  already active; else `{kind:'plan', durationMs: 0, effortW: 0,
  beginSelf: '', token: !bellowsActive}`; `completePump` toggles and
  returns the two shipped scenes verbatim. `pump.yaml` stays in `peers`.
- `packages/server/src/mud/platform/idea/reading/PumpReading.ts` +
  `packages/content/platform/content/platform/idea/reading/pump.yaml`
  (D9).
- Rows: `packages/content/generic-objects/content/stuff/thing/gear/hand-pump.yaml`,
  `force-pump.yaml` (D12; `mass`, `_materialPath` iron, keywords
  including `pump`, `handle`, `cylinder`, `"hand pump"` / `"force pump"`
  — a printed phrase must be a keyword, the bailer row's lesson).

**Tests.** `PumpController.test.ts` (new) — AC 10 pinned: a furnace
with `bellowsMultiplier 1` → `no-bellows` with the exact prose; cold →
`not-lit` with the exact prose; lit → toggles on with "roars up
white-hot", again → off with "settles back to its banked glow"; a chair →
`nothing-to-pump`; a `Well` holding a hand pump → an engagement starts
with `effortW > 0`; the same well with no pump → `no-pump` from the
controller's hop ("Nothing is set in the well to work."). ⚠ Controller
tests skip the binder, so the fire wire's `pump forge` checkpoint stays
the proof that the arg gate change broke nothing. `PumpReading.test.ts`
— the five condition words; a pulling pump at Rejection's pressure
reports a bracket containing 10.33; a pushing pump reports no depth.

**Acceptance.** `pnpm wire -- fire.dirty` (or the whole `pnpm wire`) still
passes its `pump forge` checkpoint; `lint:family` green.
**Commit:** `build(pump W1): one pump verb — the bellows implements it, and analyze pump reads the packing`.

### W2 — the village: Rejection, tanning, and the drive is born (D4, D8, D12)

**Files.**
- `packages/content/trade-tanning/content/trade/tanning/thing/packing.yaml`
  (`class: /platform/thing/Tool`, `capabilities: [packing]`,
  `_materialPath: /stuff/idea/material/organic/leather`, `mass: 0.3`,
  `gradeBand`, keywords `[packing, seal, leather, cup, "leather packing"]`)
  + `packages/content/trade-tanning/content/recipes/packing.yaml` (one
  `hide` slot, `toolCapabilities: [cutting]`, `discipline: leatherwork`,
  `outputTemplate: /trade/tanning/thing/packing`). ⚠ `hand-pump.yaml` and
  `force-pump.yaml` (W1) author `props: [/trade/tanning/thing/packing]` —
  a commons row naming a trade's row. If `generic-objects`' manifest has
  no `requires:` on `trade-tanning`, the builder adds the dependency the
  way other packs declare theirs (read `pack.yaml`'s `requires` grammar
  in content-packs.md) — or moves the two pump rows into `trade-tanning`?
  No: a pump is not leather. The honest dependency is the commons on the
  trade that makes its consumable, declared.
- `packages/content/rejection/content/world/terminus/rejection/thing/village-well.yaml`
  (`class: /platform/thing/Well`, `depthM: 6`, `interiorBulk: true`,
  `interiorCapacity: 20`, `props: [/stuff/thing/gear/hand-pump]`,
  longDescription in words: a handle, a cylinder, leather in it, no
  numbers) + `props:` line in `location/pithead-yard.yaml`.
- `thing/deep-well.yaml` (`depthM: 14`, no pump) + its `props:` line in
  the chosen room (D12); `location/claims-office.yaml` `props:` gains
  `/stuff/thing/gear/force-pump` and one spare
  `/trade/tanning/thing/packing` on the hire rack, with a comment citing
  the till defect and the `make` deed gate.
- `packages/wire/tests/pump.dirty.wire.test.ts` — born here with
  `DIRTY_REASON` naming what it consumes (*wears a packing on the village
  well, moves the force pump out of the claims office, and leaves water
  in two troughs*). Suites: (1) `look well` reads words and no digit;
  (2) `pump well` → engagement → `fill bucket from well` moves litres
  (assert state: `look bucket` holds water); (3) `measure pressure` at
  Rejection with the barometer, then the same character at Hinkley
  (`Session.open(handle, { startLocation: HINKLEY_YARD })`), the second
  figure strictly lower; (4) at the deep well with the hand pump:
  `beyond-suction`, prose contains `14` and no `10`; `analyze pump`
  nowhere explains; (5) `put force pump in deep well`, `pump well` →
  litres; (6) N spells → `analyze pump` condition word changes; `repair
  packing` with a mending kit if one is reachable else record; `get
  packing from pump`, `put packing in pump` with the rack's spare. Every
  checkpoint asserts UNDERSTOOD + a state change, never "not refused".
  `declareFile` lists `platform`, `world-seed`, `terminus`, `rejection`,
  `generic-objects`, `trade-tanning`, `trade-mining`, `hinkley-hills`.

**Acceptance.** Suites 1–6 pass on an owned world (`WIRE_BOOT=1
WIRE_PORT=2013`); `lint:reachability` and `lint:capabilities` green.
**Commit:** `build(pump W2): the village well — a hand pump on it, a force pump on the rack, and leather that wears`.

### W3 — the bore (D5, D13, D14)

**Files.**
- `packages/content/trade-drilling/src/thing/Wellhead.ts` — compose
  `StagedMixin(ContainerMixin(...))` under `Persistable`; implement
  `LiftSource` (`standingDepthM = depthM`, `standingAvailableL = sumpL`,
  `standingMaterial = sumpMaterial()`, `liftInto(litres)` = the body of
  `lift()` parameterised; `lift()` = `liftInto(this.liftL())`);
  `canAddContainable` (pumps only); `commandContributions.peers =
  ['platform/cmd/device/pump.yaml']`; `pumpFitted()`; `reconcileRig`
  credits pump lift from presence and from a running mover (D14);
  `fieldMeta.bodyKey.authorable = true` with a comment naming D13.
  ⚠ Keep `liftL()` and `BAILER_L` — `bail` is byte-identical.
- `packages/content/rejection/content/world/terminus/rejection/thing/old-brine-bore.yaml`
  + a `/trade/drilling/thing/derrick` prop, both propped into the salt
  spring hollow's room (builder: read `location/salt-spring.yaml` and
  `idea/deposit/quarry-hill.yaml`, confirm the brine body's key and that
  `legAt(body, x, y)` is non-null for that room's cell — the hole must
  stand in the leg or the sump never fills; confirm which zone's
  `deposit:` the salt rooms resolve). `depthM: 25` (or deeper than
  whatever `measure structure` says the leg is there, and in every case
  > 11 m).
- `Wellhead.test.ts` additions: `liftInto` caps at the sump; the fitted
  pump's crew credit; `lift()` still 12 L; a pump in the hole is captured
  by `PersistableApi.capture`.
- Wire suite (7): at the hollow, `advance('2 hours')`, `bail into cask`
  (litres > 0 at a 25 m hole — AC 11); `look wellhead`; `put force pump in
  wellhead`; `pump wellhead` twice and compare litres over the same span
  against one bail (AC 6); `bore` → `wants-bailing` while the sump stands
  (AC 7). ⚠ `bail` needs the derrick in reach and the bailer in hand (the
  rack); funding is not needed because nobody is hired.

**Acceptance.** `trade-drilling`'s own vitest + `drilling.dirty.wire`
unchanged; suite 7 passes.
**Commit:** `build(pump W3): a lift on the bore — Wellhead answers LiftSource, and an abandoned brine hole at the spring`.

### W4 — the city: the intake draws, and a tap notices (D10, D11)

**Files.**
- `packages/content/energy/src/thing/ElectricPump.ts` (D11) +
  `packages/content/energy/README.md` line; the energy `package.json`
  already depends on the server.
- `packages/content/water/src/thing/Conduit.ts` — compose
  `StagedMixin(ContainerMixin(SwitchableMixin(Thing)))`; `pumpFitted()`;
  `implements SupplyServing` (`supplyStateNow`); `readingFor` adds the
  pump trouble and the `deliverableM3S` cap; `pumpWattsFor` reads through
  the fitted pump when one is fitted; `supplyReport` prints the pump's
  line (*"its pump draws N kW — all the line gives it — and lifts Q
  m³/s"*). `canAddContainable` (pumps only). ⚠ The pack still ships no
  view and no controller.
- `packages/content/terminus/content/world/terminus/wharfside/thing/intake-pump.yaml`
  (`class: /system/energy/thing/ElectricPump`, `mechanism: force`,
  `liftM: 30`, `throughputLps: 1200`, `on: true`, `props: [packing]`,
  the old Detail's prose as its `longDescription`), `city-intake.yaml`
  (`props: [intake-pump]`, `pump` Detail removed),
  `market/thing/standpipe.yaml` (`class: /platform/thing/WaterFixture`,
  `suppliedBy: /world/terminus/wharfside/thing/city-intake`) + a `props:`
  line in `market/square.yaml`. ⚠ `terminus/pack.yaml` must already
  `require` `energy` (it names `ElectricLight`) — verify; and `water`.
- Tests: `energy/src/__tests__/ElectricPump.test.ts` (powered + on →
  running; cut → not running; `analyze power` duck: `availablePowerW`);
  `water/src/__tests__/Conduit.test.ts` additions (a pumped conduit with
  no pump fitted reads `off`; with a stopped pump reads `off`; with a
  running pump delivers `min(capacity, power-limited Q)`; the aqueduct
  fixture unchanged, 0 W).
- Wire suites (8–9): `analyze water the intake` reads kW; `analyze
  water aqueduct` reads gravity and 0 W; `switch pump off` at the bank;
  at the market square `fill bucket from standpipe` fails and `look
  standpipe` / `analyze water standpipe` carry `off`; `switch pump on`;
  the fill succeeds. (13) at Hinkley `fill can from standpipe` succeeds
  and `analyze water tank` is unchanged.

**Acceptance.** `energy`, `water`, `terminus` vitest green; suites 8, 9,
13 pass.
**Commit:** `build(pump W4): the city intake costs a watt — ElectricPump, the conduit delivers what its pump can, and the market standpipe reads the main`.

### W5 — docs, slates, and the drive record

- `docs/subsystems/pump.md` (new): the two families, the mechanism row,
  `LiftSource`, the protocol, the ceiling's home, the seal, the two
  movers, the tap link, the content attachments, the lint story.
- One-line map entry in `CLAUDE.md` — ⚠ an index file; **leave it to the
  sweep** unless the branch is the only one touching it that day.
- `docs/subsystems/watershed.md` (the verb ruling stands for the conduit;
  the pump thing; `SupplyServing`; the tap link), `drilling.md` (the
  attach point is consumed; `bodyKey` authorable; the abandoned bore),
  `energy.md` (`ElectricPump`, the `Powered` shape's first mechanical
  consumer), `biome.md` (`columnHeightOf`/`suctionHeadFor`), `bulk.md`
  (a tap on a main), `fire.md` (the bellows implements `Pumpable`),
  `exertion.md` (the hand rung as an `effortW` consumer whose watts do
  something; the `pace` slot still vacant), `instrumentation.md` (the
  `pump` channel).
- Slates: `docs/slates/builds/inquiry-slate.md` gains the suction limit
  as a candidate first case (one paragraph + a pointer);
  `docs/slates/tails/drilling-slate.md` § *The pump — its own history*
  cut to a pointer; `docs/slates/builds/pump-slate.md` compacted to its
  Left (the sweep's `/compact-slate` does the ledger; W5 records the
  built items); `steam-engine-slate.md` § *The real substrate is the
  coupling* gets the sentence D6 earned: *a prime mover is a `Powered`
  implementer; the pump is its first mechanical consumer.*
- Append § Drive record below after running the whole wire file on an
  owned world, with the output and the count.

**Commit:** `docs(pump): pump.md, the seven subsystem updates, and the slates the build seeds` then `drive(pump): <what driving found>`.

---

## Reachability wiring

Five links per capability — **verb · affordance · data · boot · arg
gate** — each fails closed and silent.

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| `pump well` / `pump wellhead` | `platform/cmd/device/pump.yaml` (exists; `requires` widened) | `Well.commandContributions.peers`, `Wellhead.…peers`, `Pump.…peers` (W0/W3); `BurnerMixin.peers` unchanged | `village-well.yaml` propped in the pithead yard; `hand-pump.yaml` in its `props:`; `packing.yaml` in the pump's `props:`; the two `PumpMechanism` rows | mechanism resolved by `StuffApi.singleton` on first plan — no roster to warm; props cloned by `applyProps` at hydrate | `requires: any` — nothing is refused at the binder; the controller declines `nothing-to-pump` / `no-pump` in words |
| `pump forge` (unchanged) | same view | `BurnerMixin.peers` (unchanged) | — | — | ⚠ widened from `BurnerMixin` to `any`: a non-furnace target now reaches the controller and is declined there instead of by the binder's "won't hold a fire" phrase. AC 10's three refusals are unchanged in reason and prose. |
| `put pump in well` / `get pump from well` | `put.yaml`, `get.yaml` (exist) | the Well/Wellhead/Conduit are Containers (W0/W3/W4) | — | — | `put`'s `requires: [VisibleMixin, ContainerMixin\|PlacingMixin]` passes once the source composes `ContainerMixin`; `canAddContainable` vetoes everything but a pump, diegetically. ⚠ Verify `get <x> from <y>` binds nested contents (the view has a `from` source arg — check before W2's wire). |
| `analyze pump <subject>` | `analyze.yaml` (exists, flat) | `analyze` is afforded wherever it is today (not touched) | `content/platform/idea/reading/pump.yaml` + `PumpReading.ts` | `ReadingCatalogue` warms by infix, lazily on miss — no list | `subjectRequires` left EMPTY so `analyze pump well` binds the well; the reading hops into the container and refuses in its own words when nothing pumps |
| `switch pump off/on` (intake) | `switch.yaml` (exists) | `ElectricPump.commandContributions` `peers` + `environment` (W4) — nothing else affords `switch` but the ManaLamp | `intake-pump.yaml` in `city-intake.yaml`'s `props:`; `on: true` | `GridPowered` resolves the wharfside meter lazily on first read (`terminus-main:bank`, industrial) — ⚠ never at `onCreate` | `requires: SwitchableMixin` — `ElectricPump` composes it |
| a tap reads its main | `fill` / `look` / `analyze water` (exist) | `WaterFixture` already affords its verbs | `market/thing/standpipe.yaml` with `suppliedBy`, propped in `market/square.yaml` | `StuffApi.findByTemplatePath(suppliedBy)` — the intake is a fixed prop of the bank room; ⚠ if residency evicts it the tap fails OPEN and logs (D10) | `fill`'s `mustHaveBulkSlot` passes; emptiness is the fixture's own policy seam |
| `bail` at the abandoned bore | `bail.yaml` (exists) | the derrick (`peers`) and the bailer (`environment`) — both must be present: a propped derrick row and the rack's bailer in hand | `old-brine-bore.yaml` with an authorable `bodyKey` (W3), the derrick prop | the hole's clock is never armed; inflow reconciles on read (`lift()` → `reconcileRig()`) — the drive advances the clock first | `hole` `requires: [GroundPointMixin]` — the wellhead composes it |
| `make packing` (the tanner's) | `make.yaml` (exists) | wherever `make` is afforded today | `recipes/packing.yaml` installed as a recipe document by the pack's `content/recipes/` convention (the bailer precedent) | — | ⚠ `make` is deed-gated (`requireDeed`): a fresh character cannot make it. The drive uses the rack's spare and records the gate; the recipe is still the trade's demand and `lint:capabilities` sees both sides. |

---

## Acceptance-criteria coverage

| AC | wave | how it is proved |
|---|---|---|
| 1 — work a pump by hand, water into a carried vessel | W2 | wire (2): `pump well` engagement + `fill bucket from well` state change; unit: `completePump` → trough litres |
| 2 — refused past ~10 m, told the depth, no explanation anywhere | W0 + W2 | unit: `beyond-suction` prose carries the depth, not the ceiling; wire (4) at the 14 m well; a grep in W5 that no shipped prose (rows, help, `improves`/`stakes`) names the atmosphere as the reason |
| 3 — higher elevation lifts less; a barometer shows both pressures | W0 + W2 | unit: `suctionHeadFor` at 0 m vs 130 m; wire (3): `measure pressure` at Rejection then Hinkley, strictly lower; `analyze pump` at Hinkley reports a smaller bracket |
| 4 — a force pump lifts where suction refused | W2 | wire (5) on the same 14 m well; unit: `force` mechanism at 14 m plans |
| 5 — packing degrades, reads in words, repairable, replaceable by a made part | W1 + W2 | unit: wear per spell, five words; wire (6): condition word changes, `repair packing`, swap with the rack's spare; the recipe row + `lint:capabilities` prove the tanner can make one |
| 6 — a bore with no head yields a continuous rate, strictly more than bailing | W3 | wire (7): litres over one span vs one bail; unit: crew credit in `reconcileRig` |
| 7 — `bail` still clears, `bore` still refuses through standing water | W3 | `drilling.dirty.wire` unchanged; wire (7) asserts `wants-bailing` |
| 8 — the intake draws real power from a real source; the aqueduct draws none | W4 | wire (8): `analyze water the intake` kW and `analyze power pump` watts from `terminus-main:bank`; `analyze water aqueduct` 0 W; unit: gravity fixture unchanged |
| 9 — stopping the pump is observable from a tap uphill, in the vocabulary, and reversible | W4 | wire (9): switch off → the market standpipe's `look`/`analyze water` carry `off` and `fill` fails → switch on → fill succeeds |
| 10 — `pump forge` unchanged: prose, toggle, three refusals | W1 | `PumpController.test.ts` pins the exact strings and reasons; `fire.dirty.wire` `pump forge` still understood |
| 11 — a bucket still comes up from below the ceiling | W3 | wire (7): `bail` at a 25 m hole lifts; unit: `liftInto` consults no pressure |
| 12 — a second pump is rows; a row says the mechanism, not the ceiling | W0 + W1 | the force pump IS the second row with zero code; `PumpMechanism` rows carry `pulls`, pump rows carry only `mechanism:`; a unit test that a third mechanism row (`pulls: true`) inherits the ceiling with no code |
| 13 — the Hinkley standpipe still runs on gravity | W4 | wire (13): fill at Hinkley succeeds; `analyze water tank` unchanged; the tank and standpipe rows are not in the diff |

Nothing is unmapped. ⚠ AC 5's "replaced by a part somebody made from a
hide" is proved by a part the *rack* carries plus a recipe the tanner's
Discipline credits — see Risks for why the drive cannot buy or make one.

---

## Test & gate strategy

- **Unit** (`test:near` + each touched pack's own vitest): the
  arithmetic (`suctionHeadFor`, `powerForDuty`, `handWattsFor`,
  `deliverableM3S`), the protocol's refusals and plans, the two vetoes,
  the integral over a `Piecewise`, the controller's string pins (AC 10),
  the conduit's new troubles, the fixture's supply read, `Wellhead.liftInto`
  and the crew credit, `AltitudeReading.truth()` unchanged.
- **Wire** (`packages/wire/tests/pump.dirty.wire.test.ts`): the thirteen
  checkpoints above, grown per wave, each asserting the verb was
  understood AND a state changed. `DIRTY_REASON` names what it consumes.
  Run on an owned world with build-2's port: `WIRE_BOOT=1 WIRE_PORT=2013
  WIRE_BOOT_TIMEOUT=900000 npx vitest run tests/pump.dirty.wire.test.ts`
  from `packages/wire`.
- **Lints**: `pnpm -C packages/server lint:family` after every wave; the
  ratchets named in § Convention conformance may not rise — a rise is a
  caller audit written into this plan, not a number edited.
- **`pnpm test`** exactly twice: before the MR opens, and at `/finalize`.
  Check `git status --short | grep -vE '^.. (docs/|CLAUDE\.md|.*\.md$|packages/content/)'`
  before starting it; a green run stays valid until a source file
  changes.
- The drive record is appended below only with the output and the
  count of a real run.

---

## Risks & opens

1. ⚠⚠ **The tap-to-main link is new wiring the requirements described
   as existing.** The vocabulary exists; the link does not (Grounding).
   D10 closes it with one authorable ref on `WaterFixture` and one sync
   shape on the conduit. The user should register that AC 9 costs a
   kernel field and a Terminus row, not zero.
2. ⚠ **"Past repairing" is not a thing the repair economy has.**
   `repair.yaml`: *gear never obsoletes*. The plan ships the packing as
   repairable (leather stock + a mending kit) **and** replaceable, and
   does not invent an irreparable state for one good. If the user wants
   leather to be consumable-only, that is a crafting-wide decision
   (`Durable` would need an `irreparable` seam with more than one
   implementer) and belongs in a slate, not here.
3. ⚠ **The drive cannot buy or make the seal.** The Rejection till cannot
   take money (two drives have recorded it), no tanner sells anywhere,
   and `make` is deed-gated. Drive step 6's "buy a new seal from somebody
   who made it out of a hide" is executed as *take the spare from the
   hire rack* with the recipe shipped for the trade. Recorded as a
   deviation in the drive record; the fix is retail's and the bootstrap's.
4. ⚠ **The bore is authored, not sunk.** D13 makes `bodyKey` authorable
   so a venue can ship an abandoned hole. Drilling's doc says reaching a
   body is how a hole learns which it is in; an authored key is a venue
   asserting a history. The builder must confirm the hollow's cell is in
   the brine leg (`legAt` non-null) or the sump never fills and every
   bore checkpoint fails for a reason that is not the pump's.
5. ⚠ **The city intake's own numbers exceed its band.** 98.1 kW wanted,
   60 kW industrial ceiling → the pump delivers ≈ 0.73 m³/s of a 1.2
   capacity. The plan lets the physics answer and prints it; nobody
   authored a lie. The user may prefer to raise the wharfside band or
   lower `capacityM3S`; either is a row.
6. ⚠ **A power cut at the pump reads `off`.** The six words have no
   *unpowered*; a seventh is "a design conversation, not an edit"
   (SupplyState's header). Recorded; the gloss *"it has been shut off"*
   is slightly loose for a feeder cut.
7. ⚠ **Residency of the intake prop.** A tap resolves its main by
   `findByTemplatePath`; a conduit evicted from residency would read as
   unresolved → the tap fails open and logs. The drive will tell; if it
   bites, the fix is a `StuffApi.singleton` on a singleton-shaped conduit
   or a pin, decided then.
8. ⚠ `Container` on `Conduit` and `Wellhead` is a composition change on
   two packs' classes. Both vetoes are strict; `look` will list the pump.
   Review question for the water pack: *a conduit holds its pump* is the
   claim; it is true.
9. ⚠ `lint:lib-statics` — the new mixin's framework statics should not
   count; verify with `--report` before W0 lands. `lint:instrument-args`
   — the controller's one-hop into the *bound* target is a narrowing of
   the arg, not a hunt; if the gate's regex disagrees, the fallback is
   `Well`/`Wellhead` implementing `Pumpable` by delegation (two small
   methods each), not a gate edit.
10. ⚠ `get <x> from <y>` binding nested contents, and `reachable` depth
    for a pump inside a well, are assumed and must be checked at W2's
    first wire run. If `get pump from well` does not bind, the pump
    affords nothing the player can type to retrieve it — a reachability
    failure that would be invisible to every unit test.
11. The `generic-objects` → `trade-tanning` manifest dependency for a
    pump row's `props: [packing]`: confirm the `requires:` grammar in
    content-packs.md; if a commons pack may not depend on a trade, the
    pump rows ship with `props: []` and the packing is propped beside
    them on the rack and in the well row's own `props:` (a `Well` is
    Staged; a pump inside it is not reachable by the well's `props:` —
    so the packing would have to be put in by hand in the drive; prefer
    the declared dependency).
12. The gym's vacant `pace` slot: a hand pump is sustained work at a
    fixed machine, but `Pump` composes no `ToolMixin` and offering `pace`
    would be the first consumer of an archetype need with no second —
    left in Deferred seams, as the requirements allow ("worth a look, not
    a goal").

**Stop and ask** only for: a worktree hazard; a ratchet that would have
to rise with no caller audit that clears it; or the discovery that the
brine body cannot be placed under any Rejection room by rows.

---

## Deferred seams

Attach points, each with the slate it leaves as.

- **The prime mover's coupling** — a steam engine, a horse gin, a water
  wheel are each *a `Powered` implementer in its own pack*; the pump
  reads `availablePowerW` / `poweredTrajectory` and nothing else.
  → [steam-engine-slate](../slates/builds/steam-engine-slate.md) § *The
  real substrate is the coupling* (W5 adds the sentence).
- **The finite aquifer** — `LiftSource.standingAvailableL()` is `∞` on a
  `Well`; a drawdown model replaces that one method.
  → the unbounded-source deferral in bulk.md, and
  [climate-and-water-requirements](../requirements/climate-and-water-requirements.md).
- **`dry` · `frozen` · `fouled` at the tap** — `SupplyServing` is the sync
  subset; the river-derived words need a reconciled cache on the conduit.
  → watershed.md's deferred list.
- **The packing as a PART** — today an occupant the pump vetoes everyone
  else out of; assembly's *constitutive part* model absorbs it
  (`get packing from pump` becomes the disassembly verb, inspection
  rules change). → [assembly-requirements](../requirements/assembly-requirements.md),
  which should name the pump as its second consumer.
- **A pump as a recipe output** (the smith's cylinder) — lands with
  assembly; today the two pumps are stocked rows.
- **The city pump's keeper** — a packing that wears on a pump nobody
  tends will one day stop the city; the position (a waterworks seat on a
  Business) is the polity's. → civics / employment; the wear-per-running-
  hour dial is the grain.
- **A seventh supply word for *unpowered*** → SupplyState's header says
  where that conversation happens.
- **The suction limit as a discoverable law** → inquiry-slate (W5 seeds
  it).
- **Mine dewatering, the drainage commons, the levy** → mining-slate,
  metal-chain-slate (unchanged by this build).
- **The gym `pace` slot** → exertion.md's own note.

---

## Critical files

Read first, in this order:

1. `docs/requirements/pump-requirements.md`
2. `packages/content/trade-drilling/src/thing/Wellhead.ts`
3. `packages/server/src/mud/lib/ground/Workable.ts` +
   `packages/server/src/mud/platform/idea/cmd/ground/WorkedActController.ts` +
   `packages/server/src/mud/platform/idea/cmd/device/LiftController.ts` +
   `packages/server/src/mud/platform/idea/cmd/crafting/ManualBuildController.ts`
4. `packages/server/src/mud/platform/idea/cmd/device/PumpController.ts` +
   `packages/content/platform/content/platform/cmd/device/pump.yaml` +
   `packages/server/src/mud/lib/fire/Burner.ts` (l.280–370, 600–705)
5. `packages/server/src/mud/platform/idea/reading/AltitudeReading.ts` +
   `packages/server/src/mud/api/biome.ts` + `platform/idea/api/BiomeLogic.ts`
6. `packages/server/src/mud/lib/bulk/Bulkable.ts` (l.255–345, 395–430,
   830–900) + `lib/bulk/UnboundedSource.ts` +
   `platform/thing/WaterFixture.ts`
7. `packages/content/water/src/thing/Conduit.ts` +
   `packages/server/src/mud/lib/supply/SupplyState.ts` +
   `packages/server/src/mud/lib/supply/Powered.ts` +
   `packages/content/energy/src/lib/GridPowered.ts` +
   `packages/content/energy/src/thing/ElectricLight.ts`
8. `packages/server/src/mud/lib/material/Durable.ts` +
   `lib/craft/Tooled.ts` + `platform/thing/Tool.ts` +
   `packages/content/trade-mining/src/thing/TimberSet.ts`
9. `packages/server/src/mud/lib/stuff/Staged.ts` +
   `lib/spatial/Container.ts` (the witness hooks) +
   `platform/idea/Placement.ts` (the rows precedent, and why not here)
10. `packages/server/src/mud/lib/instrument/Reading.ts` +
    `packages/content/trade-drilling/src/idea/reading/HeadReading.ts`
11. `packages/server/src/mud/lib/exertion/Exerting.ts` (l.1–120, 185–280)
12. `packages/wire/tests/drilling.dirty.wire.test.ts` +
    `packages/wire/src/harness/index.ts` + `docs/testing.md` § Two tiers
13. `packages/content/rejection/content/world/terminus/rejection/location/{pithead-yard,claims-office,salt-spring}.yaml`,
    `idea/deposit/quarry-hill.yaml`,
    `packages/content/terminus/content/world/terminus/wharfside/{bank.yaml,thing/city-intake.yaml}`,
    `market/square.yaml`
14. `packages/server/scripts/check-closed-vocabularies.ts`,
    `check-capabilities.ts`, `check-reachability.ts`, `check-lib-statics.ts`
    (headers)

---

## Drive record

*(appended at build time, not at plan time)*
