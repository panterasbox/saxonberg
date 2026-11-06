# Water supply — a tap gives what its supply gives

The running-water and irrigation build (water-supply, 2026-11). The
watershed ([watershed.md](watershed.md)) knew where water ran; this is how
it gets to a tap, a field and a well, and what goes wrong on the way.

## The premises citation

A premises says where its water comes from on its **parcel**, the twin of
energy's feeder: `waterSource` on `ParcelRecord`/`TitleClaim` is a supply's
template path, `none` (a declared dry premises), or `''` (inherit). A pack
declares it on a title claim (`waterSource:`). `ParcelApi.waterOf(path)` is
the longest-prefix-then-parent walk. `ParcelApi.citeWaterSource(extent,
path)` is the runtime write, made by a plumber's completed service run.
`PlatBook.lotWaterSource` stamps a sold lot. `lint:water-posture` (ceiling 0): every
residential/commercial/industrial/civic claim declares or inherits a
supply. ⚠ An inherited `none` does not count — a premises is dry only if it
says so itself. A `kept` grant fills an empty record from its claim, and a
record that already cites (a service run's write) is never overwritten.

## The fixture reads it, and fails closed

`WaterFixture` resolves its premises: the room at the end of its
containment walk, or a keyed holding room by its **persistence key** (the
lot, not the shared row). It asks `waterOf`, loads the supply on use
(`StuffApi.singleton` — a supply composes `SingletonMixin`, so the room that
props it adopts the same instance), and reads it. **Before it resolves it
is empty and says nothing**; it never runs endlessly because a main was
not loaded. `natural: true` is a source (a leat, a pond, a spring trough).
`suppliedBy` names a supply outright (a hydrant on a main).

The supply is the kernel **`WaterSupply`** shape (`lib/supply/SupplyState.ts`):
`supplyStateNow`, `supplyHeadM` (async), `drawL`, `availableL`,
`shareFor(landUse)`, `serves(path)`, optional `readWaterChemistry`.
Implemented by the water pack's `Conduit` and `StorageNode`, and the
kernel's `WaterStore` (+ `SingletonWaterStore`, `PersistentWaterStore`).

**The seventh word.** `SupplyState` gained `unplumbed` (*no pipe brings
water here*), ahead of `cut` in precedence.

**Pressure is head.** Head is the supply's water surface minus the outlet's
height (its zone's elevation plus its storey × `construction.storeyHeightM`).
At or below 0 the outlet reads `dry` (*"the water stands below here"*).
Below `water.weakHeadM` the tap runs weak (a draw gives at most
`water.weakDrawL`). A pumped main holds its line at
`water.mainPressureHeadM` over its served ground.

**A shortage is shared by rank** (`Conduit.shares`): `priority` serves
civic outlets first, then the trades, then houses, weighted by an
authored `demandSplit`; `proportion` gives everybody the same fraction. At
the tap a share of 0 reads `overdrawn` and a partial share runs weak. A
continuous outlet (the fountain) asks as civic. `ConduitReading.carriesM3S`
is what the main physically carries, whatever words its reading says.

**Intermittent supply.** A `StorageNode` fills on a `ShiftEntry` schedule
while its main delivers (the main's 0/1 `deliveryLog`), and is drawn at the
district rate. It is reconciled hour by hour on read. A `WaterStore` (butt,
cistern) fills from the rain on its roof or from what is poured in. Its
level is its interior bulk, primed at its authored first level from its
first read.

## The pipe in the room

**A room has water because a pipe brings it**: a supply-reading fixture
needs a sound `PipeRun` in its room. The exemptions are `natural`,
`suppliedBy`, a `Street` (a public outlet's pipe is under the street), and a
`WaterStore` supply standing in the same room. `lint:water-plumbed`
(ceiling 0) is the census.

`PipeRun` (kernel) = `AdornmentMixin(AssembledMixin(DurableMixin(ThermalMixin(BulkableMixin(Good)))))`.
It is out of the room's loose listing (part of the room's structure, not
concealment). It **bursts** off its room's temperature trajectory (lead
bulges to 0.4, `brittle` iron to 0) and **leaks** onto the floor on the
thaw, once; `repair` mends it. Its standing water carries the supply's
chemistry, and a lead run leaches into it by the face law, so the first
draw of the morning carries the lead. One piece without a bill; a
plumber's run (`trade-plumbing`) is laid empty and filled by `fit`. A
**service run** refuses its last length where the main it names does not
serve the premises, and cites the main on completion (the `Assembled`
hooks `canTakeMembers` / `afterMembersFitted`).

## Chemistry, health, the kit

`WaterChemistry` (pH, hardness, salt) rides the payload. The lead law
reads the WATER's pH and softness: hard water scales a lead pipe shut. A
dose tag is the Condition row's **file leaf** (`lint:toxin-keys`, ceiling
0); `dysentery` now exists. **The kit, not the eye**, says whether water is
fit: `analyze water` prints a fouled verdict and the lead only with the
water-test kit in hand.

## Readings

These are under the new `hydrology` Discipline: `analyze flow <weir>` (with a
competent reader's account of what the gates above take, and what no gate
accounts for), `analyze stage <staff gauge>` (`0.4·Q^0.4`), and `analyze
water-table <observation well>`, the only reader of an aquifer's level.
Units: `m³/s`, `L/s`, `miner-in` (0.7373 L/s).

## Gates, the ditch, the rota

`Gate` (water pack) is a `ControlStructure` that is Sealable, Lockable and
Throttleable (kernel `ThrottleableMixin`, `lib/spatial/Throttleable.ts`: `opening`, an opening trajectory,
and a work log of who set it). `open … to <setting>`. `canOpen` refuses a
padlocked gate to somebody with no key, and a locked `Door` to everybody.
The catalogue **credits diversions** into the course a control names, less
seepage by `lining`. An artificial channel carries only what it is given:
no catchment, none of the river's draws above its headgate, and its works
draw on what it carries. The **rota is the turn list**:
`Gate.reconcileScheduled` opens and shuts a turnout for its position's
roster windows, and records a refused turn when it is padlocked.

## Soil, stores and wells

**Soil**: `SoilMixin.inlets` integrate a gate's opening × capacity ×
method efficiency (`settleInlets`, async, on the read path). What the soil
can't take is ponded; ponds drain and leach salt. `soilSalinityDsm()` reads
the salt left behind. Maas–Hoffman salt is folded into the plant's water
term (salt is physiological drought). A ponded bed drowns roots.
`PlantPot.drained`.

**Wells**: a `Well` cites an `Aquifer` (the kernel `GroundWater` shape) or
keeps a lone, recovering body. `collarM` stands a hillside well above its
zone.

## Staged or live

Staged or live is the content's choice (D30). Each stateful kind ships
plain (staged) plus a `Persistent…` twin used where a row needs live state:
`PersistentConduit` (the city intake, the aqueduct), `PersistentGate` (the
Delight's gates), `PersistentWaterStore` (a sold roof cistern),
`PersistentAquifer` (the Delight valley), `PersistentWell` (a dug well).

## Deferred

See the plan's build notes for each wave's deferrals: the loft (paint's
storeys), the survey's plumbing line, the irrigates/rides brains, rights
documents, rota → calendar, the bank breach, `ditch with tile`, deep
percolation into an aquifer, the drilled bore's strike, and `dig well`
(the cut W10 → digging-slate).
