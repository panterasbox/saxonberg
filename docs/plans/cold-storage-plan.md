# Cold storage — implementation plan

Executes [cold-storage-requirements.md](../requirements/cold-storage-requirements.md),
plus two scope additions the user approved at planning (recorded here;
the requirements doc is amended at the sweep): **the walk-in / AC as the
proof that a Thing and a Location compose one mixin and get one
behaviour**, and **the general resolve-on-read stepped-dependency fix**
(graduating `reconcile-chains-slate`). **Kind:** feature. **Lead end:**
kernel; first consumers the Terminus infirmary's blood fridge (a Thing)
and the general store's walk-in cold room (a Location), both on the
avenue feeder.

The pieces, one branch: **A** `ClimateControlMixin` drives an
`Atmospheric` interior toward a setpoint while its host is supplied and
lets it drift when cut — composed on a Thing (the fridge) and on a
Location (the walk-in) with no second code path; **B** the general
trajectory primitive: a changing value publishes its trajectory, every
dependent gauge integrates over it instead of sampling the endpoint —
applied to `Thermal`, the envelope, `Freshness`, `Contaminable`,
`Maturing`, `Growing`, `ThermalDose`; **C** electric cold production with
an honest latent-heat freeze, the ruin of a frozen blood unit, a carried
cooler; **Rung 1** of the containment read.

Written 2026-10-01 against `design/energy` at `3389e8f95`; re-planned
the same day after the scope additions. Line numbers are from that tree.

---

## Grounding

### The Thing≡Location crux — verified, and the verdict

**At the body it holds, cleanly.** A Thermal body's ambient comes from
`airScopeOf(host)` (`lib/thermal/Thermal.ts:377–385`): step outward
through `getEnclosingScope()` and **return the first scope that is
`Atmospheric`** (L380). Both ambient paths use it — the pull side reads
that scope's `envelopeTemperatureLast()` (L740–743) and the push side
`BiomeApi.resolveTemperatureFor(scope)` (L906–913), whose first step is
`resolveEnvelopeTemperature(scope)` (`platform/idea/api/BiomeLogic.ts:
268–270`). A loaf in a fridge and a loaf in a walk-in therefore read
their enclosure by the same code, with no class named anywhere. The hive
already proves a Thing composes `AtmosphericMixin` (`trade-apiculture/
src/thing/Hive.ts:73`), and `ExitableVessel` (the coach) proves a Thing's
envelope can *apply* (`lib/boundary/ExitableVessel.ts:172–215`).

**One step up it breaks, in the scope's own outside.** An envelope drifts
toward `envelopeOutsideK`, seeded by `outsideKFor(scope)` (BiomeLogic
L877–905), which runs the biome **chain walk** (`syncChainWalk`
L1118–1215): at each Atmospheric ancestor it reads the authored
`_temperature` override (`ownGetter`, L1297) and the ancestor's **biome
default** — it never reads an ancestor's **integrated**
`envelopeTemperatureK`. So a fridge standing in the general store would
drift toward the *biome row's* indoor default, not toward the shop it
stands in — which is exactly the decree the envelope build removed for
rooms (*one biome row authored 294 K and every interior inherited it*),
reintroduced one level down. Today's only nested envelope composer, the
coach, parks in the street, where the biome IS its outside, so nothing
has tripped it.

**Verdict: the promise holds at the body and is one seam short at the
scope.** The seam is not a change to the air walk — it is
`outsideKFor` asking, before the chain, whether the scope has an
*enclosing* Atmospheric whose envelope applies, and taking its
`envelopeTemperatureLast()` as the outside (the last-integrated value,
per the room-integrates-itself ring rule, BiomeLogic L920–935). A room's
enclosing scope is nothing (its outside stays the weather); a Thing's is
the room. This is flagged as **F1** below rather than folded in silently.

Two obligations fall on any Thing that composes the mixin, both already
met by the coach and both the mixin's constraint can enforce:
- `getVolume()` must be non-null (`AtmosphericMixin` defaults it to
  `null`, L1111; `envelopeApplies()` refuses without it, L639) — an
  authored `interiorVolumeM3`, the `ExitableVessel.interiorVolume`
  precedent (L160–174);
- `envelopeApplies()` must not consult the sky walk — the base version
  (L637–642) walks to the nearest biome and a fridge in a yard would
  answer *sky-exposed → no envelope*; `ExitableVessel` overrides it to
  *volume authored and no `_temperature`* ("a vessel's roof is its
  DECLARATION", L190–215) and overrides `openExteriorOpenings()` to its
  own seal ("for a vessel the SEAL is the door", L216+).

Three more answers the re-plan asked for:
- **Is a Location `Sealable`?** No Location composes `SealableMixin`
  (grep over `lib/stuff/Location.ts`, `lib/location/`,
  `platform/location/`). A walk-in's door is a `Door` on its exit, and
  the envelope's leak term `U_open` counts **only exits onto the sky**
  (`openExteriorOpenings`, Atmospheric L648–660: *interior openings count
  for NOTHING*). So a walk-in standing open to the warehouse leaks
  nothing — the ventilation non-goal, documented, and the honest limit
  this build inherits rather than fixes.
- **Does `GridPoweredMixin.resolveRoomPath` work when the host IS the
  room?** No: `while (isContainable(cursor))` never runs for a Location,
  and `return cursor !== self ? … : null` (energy `src/lib/GridPowered.ts:
  158–169`) answers `null` → off-grid. One line: a host that is not
  Containable is its own premises.
- **The icebox / holder couple:** stays as the passive carried-cold rung.
  The envelope's heat budget sums only `SpaceHeating` contents (L800–806);
  contents read the scope and the scope does not read its contents, so an
  ice block in an `Atmospheric` box would not cool it. Folding `Coolbox`
  into the envelope needs a content back-reaction term (every Thermal
  content as a heat sink/source), which is also what would make *ice in
  an unpowered fridge keeps it cold* true. Deferred (`thermal-slate`), and
  the consequence stated: after a cut, the freezer's own ice warms toward
  the warming compartment and does not hold it — the same abstraction a
  room already makes about a block of ice on its floor.

### The active-cold substrate that exists

- `AtmosphericMixin` (`lib/biome/Atmospheric.ts`): `<TBase extends
  MixinConstructor<Stuff & Container>>` (L289). Fields
  `envelopeTemperatureK / envelopeClockStamp / envelopeOutsideK` (L359–363),
  `_temperature` (authorable exception). `reconcileEnvelope()` L788–830:
  **no far-past guard**; `T ← Decay.toward(T, outside + ΣspaceHeatW/U,
  elapsed, C/U)` with `envelopeCoefficients()` (L860+: `U = A/(t/k +
  R_films) + openingUPerM3·V·n`, `C = C_air + ρcA·activeDepth`),
  `_envelopeReconciling` guard, `envelopeExposedAreaM2` is a `@hook`.
  `envelopeTemperatureLast()` L1012, `getOwnTemperatureK()` L1019
  (authored first, else last integrated). `setTemperature` fans out
  `restamp()` over Thermal contents (L447/481).
- `Location = Addressable(AmbientLit(Atmospheric(Adornable(Container(
  Visible(Detailed(Perceptible(PostRegistration(Stuff)))))))))`
  (`lib/stuff/Location.ts:165`); `platform/location/SingletonCartesianLocation`
  is the row class, and a **pack may extend it**: trade-forestry's
  `Wood` does (`trade-forestry/src/location/Wood.ts:63, 86`).
- The `coldStorage` archetype satisfier (`lib/archetype/Archetype.ts`)
  has two rungs: a SPACE that is Atmospheric with `getOwnTemperatureK() ≤
  283` (L586–594 — a `ColdRoom` Location qualifies as-is) and a HOLDER
  that is `Thermal & Sealable & Container` with `getContentsTemperature()
  ≤ 283` (L598–605 — an Atmospheric `ColdStore` Thing is not Thermal, so
  the holder rung needs one more clause).
- `BurnerMixin` (`lib/fire/Burner.ts`) is the HOT pin and is not
  generalized: it holds a Thermal body at a fuelled temperature and the
  oven's contents read it through `heatSourceK()` (Thermal L830). A
  cooler is not a furnace run backwards — a furnace pins a *body*, a
  climate control drives an *air*. Both stay.
- `CoolboxMixin` / `Icebox` / `holderK` / `lentInsulationR` /
  `coldestMass` (Coolbox.ts; Thermal L694, L864): untouched by this
  build. `Containable.fixedInPlace` is authorable (L234).

### The thermal body and the gauges — what samples what (the ADD-2 census)

Every reconcile-on-read method in the tree was listed
(`grep "reconcile[A-Z]…(): void"` over kernel + packs) and each read:

| gauge | reads a dependency that can STEP or MOVE during its gap | shape today | this build |
|---|---|---|---|
| `ThermalMixin.reconcileThermal` (L746) | `lastAmbientK` — the enclosing scope's envelope, refreshed only at the read (L782) | one closed-form Newton step against the END value; far-past guard 4 game-h on every host (L66, L775); linkdead freeze on interactive hosts | integrates over the scope's published trajectory; guard narrowed to living bodies |
| `AtmosphericMixin.reconcileEnvelope` (L788) | `envelopeOutsideK` (weather = f(t); for a nested scope its enclosing envelope — stepped); `spaceHeatOutputW` of contents (a hearth that burnt out mid-gap "over-credits for one read", L784) | one step against the end values; no guard | integrates over its outside's trajectory and its supply's segments (ClimateControl); the hearth burnout stays bounded-and-noted |
| `Freshness` mixin (L882) + slot `load()` (L662) | host temperature (Arrhenius), `a_w` | single `tempK` for the whole `elapsed` (`advance` L450); no stored driver | integrates over the host's temperature trajectory |
| `Contaminable` mixin (L685) + slot `loads()` (L516) | same | same | same |
| `Maturing.reconcileFerment` (`lib/maturation/Maturing.ts:532–560`, L913) | vat temperature | one `self.getTemperature()` for `days` | integrates over the vat's trajectory (the longest horizon in the tree) |
| `Growing.reconcileGrowth` (`lib/husbandry/Growing.ts`) | ambient via `_lastAmbientK` (L484, L950 — the cold ramp), lux window, soil water | rates from the STORED ambient (a start rectangle). ⭐ Intent read: `-1 = unresolved` exists because the biome resolve is async and the reconcile is sync (L473–483) — a cache workaround, **not** deliberate conservatism | the cold factor integrates over the scope's trajectory; the tri-state stays for a scope with no trajectory yet; soil water is `Soil`'s own exact integral and stays |
| `ThermalDose.reconcileDose` (L621) | own temperature + `lastAmbientK` | answer 2: Simpson between stored and current samples along `Decay.toward` with a CONSTANT ambient (L275–300) | rides the body's published trajectory (one integrator shape); same numbers where the ambient was constant |
| `WaterActivity.reconcileWater` (L630) | ambient humidity | **exposed arm already walks `BiomeApi.airSegmentsFor`** (L683–696) — the tree's existing instance of the primitive; enclosed arm samples (humidity of an enclosed scope has no state to step) | justified (`@samples` marker); no change |
| `Staling` (`trade-baking/src/lib/Staling.ts:197`) | loaf temperature | single sample, justified in prose (τ minutes vs days) | marker only |
| `Wet.reconcileWetness` (L167) | own dry rate × warmth | fast; far-past guard | marker only |
| `Colony.reconcileColony` (apiculture L398) | `outsideK` restamped async | start rectangle over days of a sky outside — answer 1 territory (weather is f(t)) | out of scope; noted on the slate's remainder |
| `Burner` fuel, `Combustible`, `Charged`, `Caster`, `Memorized`, `ManaPowered`, `Metabolic`, `Respiration`, `Vitals`, `MechanicalMovement`, `Soil`, `Improvable`, `Handling`, `Organism`, `Producing`, `Sward`, `SelfHeating`, `Turbary` | own reserves, constant rates, or an exact integral (`Soil.integrateRainfall`) | — | not a stepped dependency; untouched |

Precedents the primitive reuses: `Decay.toward` (`lib/Decay.ts:56`),
`ThermalDose.integrate`'s Simpson with `SUB_STEPS = 8` (L124, L275),
`BiomeApi.airSegmentsFor`'s *never an empty list* contract
(`api/biome.ts:405–418`, `AirSegment { air, durationS, rainMmPerH }`).
`lint:lib-statics` (`scripts/check-lib-statics.ts`) ratchets world-level
statics on value classes (`Freshness.growthRate`, `Contamination.advance`
are on the census): type-level constructors (`Quantity.of`) are admitted.

### Phase change — the asymmetry (ADD 3, verified)

- `reconcileMelt` (Thermal L1049–1065) is rigorous: at/above the melting
  point the overshoot `(T − mp)·C` goes into `Meltable._absorbLatent`,
  the temperature clamps to `mp`, and only when `latentAbsorbedJ ≥ mass ×
  latentHeatOfFusion` does `doMelt` run.
- `reconcileBulkPhase` (L1095–1142) **freezes as a threshold flip**: at
  `temp ≤ mp` the pool is zeroed and a cast minted — no plateau, no
  334 kJ/kg removed. Boil is the same flip. The freeze mints
  `CASTING_TEMPLATE_PATH = '/stuff/thing/Casting'` (L1145), stamps
  prose/material/mass, and moves it into the vessel's container. ⚠ And
  nothing drives it from the lazy read path: `reconcileThermal` calls
  `reconcilePhase` for `Meltable` hosts only (L818); `CraftVessel.
  reconcileThermal` (L236) drives its own drink-ice plateau
  (`absorbIntoIce`), not this. A jug of water in a freezing room never
  freezes today.
- The ice good: `generic-objects/.../ice-block.yaml` (`class:
  /platform/thing/Casting`, `_materialPath: /trade/bottling/idea/material/
  ice`, `mass: 4`, `stampedTemperatureK: 268`). Water
  (`base-library/.../bulk/water.yaml:21–24`) and ice (trade-bottling)
  both tabulate `meltingPoint 273`, `latentHeatOfFusion 334000`. Blood
  (`base-library/.../tissue/blood.yaml`): `spoilActivationEnergy 96000`,
  `waterActivity 0.99`; no freezing behaviour of any kind. `transfuse`
  refuses on `Freshness.bandFor(...)` ∈ {spoiled, rotten}
  (`trade-medicine/src/idea/cmd/medical/TransfuseController.ts:84–86`).
  `Freshness.stampLoad(load)` exists on the slot gauge (L708).

### The energy seam, the containment wire, the drives

Unchanged from the first plan and still true at `3389e8f95`:
`GridPoweredMixin` (energy `src/lib/GridPowered.ts`: `<TBase extends
MixinConstructor<Stuff>>`, lazy meter, live `energizedAtSync`,
`availablePowerW()` from the band dial); `GridCatalogue.cuts` is a
`Set<NodeRef>` with **no timestamps** (L96, L235–245); `ElectricLight`
and its private-seam unit test; the infirmary (`terminus/pack.yaml:86`)
and the general store (L46) both metered on `terminus-main:avenue`, the
avenue pole (`counting-houses/thing/pole.yaml`) affording `sever`/`splice`;
hearthworks cites no feeder; the energy wire drive severs the avenue
(L213–226). `Container.contents` is the only subscribable (L356–387),
`Placing`/`Containable` have none, `_setPlacement` fires nothing,
`REF_FIELDS`/`DETAIL_FIELDS`/`projectFields` (`api/mql-subscription.ts:
106–125, 301–329`), the client `HereList` (`CardBodies.tsx:768–814`).
The hive mints nothing; `StagedMixin` + `props:` is the container-of-
containers shape (`Chest`, `Icebox`, `stocked-icebox`). Wire harness
and the clock-rewind precedent (`fishing.dirty.wire.test.ts:144`, a
wizard `eval` on the object). `Freshness.test.ts:75–85` holds the clock
seams unit tests use.

---

## Plan-level decisions

### D1 ⭐⭐ — the mechanism is the kernel's; the plug is the energy pack's (unchanged)

Kernel `lib/thermal/ClimateControl.ts` typed over a kernel-declared shape
`lib/supply/Powered.ts` (`isPowered()`, `availablePowerW()`,
`poweredTrajectory(fromS, toS)`) that `GridPoweredMixin` implements
structurally (the `TravelNode` ↔ tpa pattern). The composing classes
live in the energy pack beside `ElectricLight`: `/system/energy/thing/
ColdStore` and `/system/energy/location/ColdRoom`. A second grid
appliance is a row; a second supply is a second implementer in its own
pack. No money leg; no draw accounting beyond `availablePowerW() > 0`.

### D2 ⭐⭐ (reopened) — `ClimateControlMixin` drives an `Atmospheric` interior

`ClimateControlMixin<TBase extends MixinConstructor<Stuff & Container &
Atmospheric & Powered>>`. Fields: `setpointK` (persistent, authorable,
default 277) and **`coolingCapacityW`** (persistent, authorable, default
from a `thermal.climate.capacityW` dial, 300 W) — a cause an author can
write (an appliance's nameplate), never an effect.

What it overrides, and only this:

1. **The envelope's heat budget.** `AtmosphericMixin.reconcileEnvelope`
   gains one `@hook`, `envelopeDriveW(T): number` (default `0`), added
   into `heatW` beside the `SpaceHeating` sum. ClimateControl answers
   `−coolingCapacityW` while driving (`isPowered() && availablePowerW() >
   0 && T > setpointK`), `0` otherwise. Steady state becomes
   `outside + (heatW − capW)/U`, **clamped at `setpointK`** (a thermostat
   does not undershoot its dial), integrated with the room's own `C/U`.
   So: a shut fridge pulls down over its real `τ = C/U`; a door standing
   open (a large `U_open`) is a leak the pump cannot beat and the
   interior rises toward the room — honest, with no second time
   constant. A setpoint **above** ambient with a negative capacity is a
   heater on the same two fields (the sign of `capW − leak` decides);
   no direction flag.
2. **Piecewise over the supply.** The envelope integrates segment by
   segment over `poweredTrajectory(stamp, now)` (D7) — the cut and the
   splice inside one unobserved gap each start a new closed-form stretch.
3. **The content phase pass.** After integrating, for each content that
   is `Bulkable & Thermal`: `content.reconcilePhase()` — the cold source
   drives the phase of what it holds, the shape of `Burner.heatContents`
   driving its Meltable siblings. No world-wide widening of the freeze
   (a water-butt freezing solid at boot in Hinkley Hills is not this
   build's risk; see Deferred).

What the **Thing composer** adds (not the mixin — the coach's own
pattern, verbatim): `interiorVolumeM3` → `getVolume()`;
`envelopeApplies()` = volume authored and no `_temperature`;
`openExteriorOpenings()` = `isOpen() ? 1 : 0`; `enclosureDefaults()` =
its own material at an authored wall thickness. The **Location
composer** adds nothing: a room already has a volume, a sky rule, exits
and an `enclosure:`.

**Why not over `Coolbox` (the first plan).** A lumped `ThermalMixin`
body plus the one-step holder couple is a box-shaped shortcut a Location
cannot take (a room carries climate as an envelope, and `holderK` reads
one step, never a walk). Over `Atmospheric`, the fridge and the walk-in
run **the same reconcile, the same hook, the same drive segments**, and
the thing inside reads both by the same `airScopeOf`. That is the
promise the user asked to prove, and it is proven by a unit test that
composes the mixin on a Thing fixture and a Location fixture and asserts
identical readings (W3).

**Heat rejection — decided: a documented abstraction, no waste heat,
with the attach point named.** A fridge rejects `capW·(1 + 1/COP)` into
its kitchen; a walk-in's condenser sits outside and the weather absorbs
it; an AC the same. The magnitude needs COP, which is the billing
build's one new physical quantity (fridge-design-pack's COP fork), so
modelling it now would be a number with no derivation. The attach point
is exact: the enclosing scope's `heatW` sum narrows on
`MixinApi.isSpaceHeating`, so the Thing composer composes
`SpaceHeatingMixin` and answers `spaceHeatOutputW() = capW·(1 + 1/COP)`
the day COP exists; a Location composer answers nothing (its condenser
is outdoors). Honest cost stated in `thermal.md`: a kitchen with a
running fridge is not warmed by it.

### D3 ⭐ (reopened) — compartments and sites

- **The blood fridge** (a Thing): a `ColdStore` row at 277 K whose
  `props:` ships a second `ColdStore` — the **freezer box** at 255 K,
  `fixedInPlace: true`, keywords `[freezer, compartment, box]`, never
  `fridge`; the box ships the ice pan. Each compartment is its own
  envelope at its own setpoint; the box's outside is the fridge's
  interior (F1's seam, applied twice), so a cut warms the box toward the
  warming fridge. `put X in fridge` binds the fridge; `put X in freezer`
  binds the box (MQL level 2); the box's contents are level 3 and reached
  by `get X from freezer`. Fallback if review wants two doors at level 2:
  a kernel `platform/thing/Cabinet` (`StagedMixin(ContainerMixin(Good))`)
  holding sibling compartments — one file.
- **The walk-in** (a Location): `/world/terminus/general-store/cold-room`
  on `/system/energy/location/ColdRoom`, a new room north of the shop
  floor behind a door (`exits.north: { destination, door: … }` — the
  `boundary.md` exit-kind row), `coords` plotted in the store's zone, an
  authored `enclosure:` (`/stuff/idea/material/wood/pine`, `0.12 m` —
  cork-lined in prose), `setpointK: 275`, `coolingCapacityW: 1500`,
  `props:` a prime-cut and root-vegetables. **This is the food cold-store
  the requirements asked for** (the Thing half is proven by the blood
  fridge; the Location half by this). The brewery's 279 K lagering cellar
  stays authored — a deep cellar is cold by depth, which is a cause.
- **AC:** the same class with `setpointK` near comfort. No row ships —
  nothing in Terminus suffers summer heat stress yet — and a W3 unit
  test on a Location fixture at 295 K proves it reachable. Recorded.
- ⚠ **Drive-script note for the user.** Requirements step 2 puts the bag
  *in the freezer*; blood banks at 1–6 °C and D-ADD-3 now makes freezing
  **ruin** a unit. The drive puts the bag in the fridge and the ice pan in
  the freezer; the requirements sentence is amended at the sweep.

### D4 — compartments ship as `props:` (unchanged); `ColdStore` composes `StagedMixin`.

### D5 — the freezer makes ice (reshaped by ADD 3)

1. **The driver** is D2's content phase pass.
2. **The latent freeze.** `reconcileBulkPhase` gains a plateau mirroring
   `reconcileMelt`: at/below `mp`, the undershoot `(mp − T)·C` is
   accumulated into **`BulkPayload.latentRemovedJ`** (declared from
   `Thermal.ts` onto the payload, the way each gauge declares its own
   field) and the temperature clamps to `mp`; when `latentRemovedJ ≥ mass
   × latentHeatOfFusion` the pool solidifies. A pour that empties the
   slot clears the accumulator; a partial pour scales it by the remaining
   mass (the same blend-by-mass rule freshness uses). Boil is left as a
   flip (no boiling feature rides this build) and the asymmetry is noted
   in `thermal.md`. A 4 L pan at 255 K: ~10 min to reach 273 K, then
   `4 kg × 334 kJ` against a ~15 W leak across a 20 K lift is a few game-
   hours — real ice-tray time.
3. **The row the frozen pool becomes.** `Material.castTemplate`
   (persistent, authorable identity path; default `/stuff/thing/Casting`).
   The solidify clones it, stamps mass always, and stamps material/prose/
   keywords only when the clone authored no material. Water authors
   `castTemplate: /stuff/thing/ice-block`; iron keeps the generic cast.
4. **Freezing ruins blood.** `Material.ruinedByFreezing` (authorable
   boolean; `blood.yaml: true`). At the solidify edge of such a material
   no cast is minted: the pool stays liquid at `mp`, its freshness load
   is stamped to `1` (`Freshness.stampLoad` — reads *rotten*, `transfuse`
   refuses *spoiled*), and the accumulator clears so a thaw does not
   re-trigger. The band word is the shipped one; a `hemolyzed` band is not
   minted for one material. General freeze–thaw damage (cell walls in
   produce, texture) → `preservation-slate`.
5. **The pan.** `/stuff/thing/vessel/ice-pan` (generic-objects,
   `Receptacle`, `interiorBulk: true`, `interiorCapacity: 4`, tin,
   `mass: 0.6`); `fill pan from basin` (the ward's basin), `put pan in
   freezer`.

### D6 — the cooler is a row over `Icebox` (unchanged).

### D7 ⭐⭐ (replaced) — the general primitive: a value publishes its trajectory; a gauge integrates over it

**The law** (`uncertainty.md § The second abstraction law`): reconcile-
on-read is exact only when the driver's trajectory is reconstructible
from stored state; a sampled driver that moved is a guess, and the guess
depends on when you looked. The slate's answer — *a changing value
publishes its trajectory as segments; any dependent gauge integrates over
the segments* — is built here once and applied everywhere the census
found a sampled dependency.

**The primitive — `lib/Trajectory.ts`** (a value object beside
`lib/Decay.ts`; the *named value-object* category; type-level
constructors only, so `lint:lib-statics` is untouched):

- `Piecewise` — an ordered list of `Stretch { fromS, toS, at(s): number }`
  over a window. `Piecewise.constant(v, fromS, toS)`,
  `Piecewise.of(stretches)`; instance: `window()`, `at(t)`,
  `refine(other)` (the common breakpoint refinement of two trajectories —
  how a gauge that reads temperature AND water combines them),
  `samples(subSteps)` (midpoint samples per stretch),
  `integrate(f, subSteps)` (Simpson of `f(value)` per stretch — ThermalDose's
  integrator, lifted). **Never empty**: a window with no information is
  one constant stretch (the `airSegmentsFor` rule).
- `TrajectoryLog` — the publisher's **bounded ring of breakpoints**
  `{ atS, value, targetValue, tauS }` (persistent; `capacity` 24 by
  default). `record(atS, value, target, tau)` at each re-stamp;
  `window(fromS, toS): Piecewise` reconstructs each stretch as
  `Decay.toward(value, target, s − atS, tau)` from its breakpoint, holding
  the oldest breakpoint's curve for any part of the window before the
  ring's horizon (bounded, documented, and the `records` field carries
  the horizon so a reader can tell). ⚠ **This is a ring, not the slate's
  "one field".** One field is enough for a supply (the cut); it is not
  enough for a scope that many bodies read at different stamps — each
  body needs the scope's curve from *its own* last stamp, and only a
  short history can answer that. Flagged as **F2**.

**The contract** (what the slate called *declaring drivers*):

- A **publisher** implements `TemperatureTrajectory { temperatureTrajectory(
  fromS, toS): Piecewise }` (in `lib/thermal/Thermal.ts`) — `ThermalMixin`
  (a body's own temperature) and `AtmosphericMixin` (a scope's air,
  authored `_temperature` as a constant) — and `Powered` implementers
  publish `poweredTrajectory(fromS, toS): Piecewise` (0/1).
- A **dependent** asks its publisher for the window `[myStamp, now]`
  and integrates. No push, no fan-out, no ordering rule between gauges:
  each gauge reconciles against the publisher's reconstructed curve, so
  two gauges on one host may have different stamps and both are exact
  within the ring's horizon.

**Applied, in the kernel:**

| dependent | publisher | what changes |
|---|---|---|
| `ThermalMixin.reconcileThermal` | its enclosing Atmospheric scope (`airScopeOf`) — `scope.temperatureTrajectory(stamp, now)`; a holder couple (`heatSourceK`/`holderK`) stays a constant stretch | drift computed per stretch against a **moving** target: the linear ODE with an exponential forcing has the closed form `T = A∞ + (T0 − A∞)e^{−t/τ} + (A0 − A∞)·τa/(τa − τ)·(e^{−t/τa} − e^{−t/τ})` (τ ≈ τa limit handled), module-private beside the Newton step. Records its own breakpoint per stretch. **Far-past guard narrowed to `ThermalRegulation` hosts** (a logout is a body's; matter integrates its absence — `Freshness`'s own rule). |
| `AtmosphericMixin.reconcileEnvelope` | its outside — a sky outside is a constant (the weather deviation is already read at the seed; a weather trajectory is answer-1 work on the slate's remainder); a nested outside (F1) is the enclosing scope's `temperatureTrajectory`; plus `envelopeDriveW` per stretch of the supply's `poweredTrajectory` (ClimateControl) | per-stretch `Decay.toward`; records breakpoints |
| `Freshness` mixin + slot | the host's `temperatureTrajectory`; `WaterActivity` stays an end sample (justified) | `advance` folded per sample over `samples(8)` — closed-form logistic per sample is exact for a piecewise-constant rate; no new static (a module-private fold + the slot gauge's instance method) |
| `Contaminable` mixin + slot | same | same |
| `Maturing.reconcileFerment` | the vat's `temperatureTrajectory` | the culture / evaporative / conversion windows take a sample list instead of one `tempK`; evaporative keeps its own air segments |
| `Growing.reconcileGrowth` | the scope's `temperatureTrajectory` (sync — the last-integrated curve, which is what retires the async `_lastAmbientK` workaround; the `-1` tri-state survives as *no trajectory yet*) | the cold ramp averaged over the samples; lux and soil untouched |
| `ThermalDose.reconcileDose` | the host's `temperatureTrajectory` | its private Simpson-along-`Decay.toward` becomes `Piecewise.integrate` over the published curve; identical numbers for a constant ambient (pinned by its existing tests) |

**Justified samplers** get a `@samples <reason>` TSDoc marker:
`Staling` (τ ratio), `WaterActivity`'s enclosed arm (no stepped state
exists for enclosed humidity), `Wet` (fast, guarded). **The gate:**
`scripts/check-reconcile-chains.ts` → `lint:reconcile-chains`
(census-then-ratchet; auto-joins `lint:family`): every `reconcile*()`
that reads `getTemperature()` / `hostTemperatureK` / `getOwnTemperatureK`
inside its elapsed integration and carries neither a `temperatureTrajectory`
read nor a `@samples` marker. Census today: 6; ceiling set at W1; driven
to 0 by W2.

**Graduation.** `reconcile-chains-slate.md` is retired at the sweep: the
law stays in `uncertainty.md` (Answer 4 → built; the four answers become
three plus the primitive), the contract goes to `thermal.md` (§ The
trajectory contract) and `spoilage.md`; `Colony`'s sky outside and a
weather trajectory for the envelope are the remainder, salvaged into
`thermal-slate`.

### D8 — Rung 1 (unchanged): `holds` + `placement` on `REF_FIELDS`, `placed` on `DETAIL_FIELDS`, `fireFieldChange('placement')` in `ContainmentLogic.place`, `Chest` gains `PlacingMixin`, client `HereList` + `PlacedList`; no nesting.

### D9 — staging: Stage A (W0–W3, kernel) / Stage B (W4–W5, pack + content + drive); every wave independently landable.

### D10 — placement and namespace (amended)

| what | where | path |
|---|---|---|
| `Piecewise`, `TrajectoryLog` | kernel | `lib/Trajectory.ts` |
| `Powered` shape | kernel | `lib/supply/Powered.ts` |
| `ClimateControlMixin` | kernel | `lib/thermal/ClimateControl.ts` |
| the Thing class | energy pack | `/system/energy/thing/ColdStore` |
| the Location class | energy pack | `/system/energy/location/ColdRoom` ← `packages/content/energy/src/location/ColdRoom.ts` (the forestry `Wood` precedent: a pack class extending `platform/location/SingletonCartesianLocation`) |
| generic rows | energy pack | `/system/energy/thing/{cold-store,freezer,refrigerator}` |
| the blood fridge | terminus | `/world/terminus/infirmary/thing/blood-fridge` (+ `freezer-box`) in `ward.yaml` |
| the walk-in | terminus | `/world/terminus/general-store/cold-room` (Location) + an exit on `shop-floor.yaml` |
| the ice pan, the cooler | generic-objects | `/stuff/thing/vessel/{ice-pan,cooler}` |
| `castTemplate`, `ruinedByFreezing` | base-library rows | `water.yaml`, `tissue/blood.yaml` |

`terminus` already depends on `content-energy` and
`content-generic-objects`. The `cold-room` row must `coords`-plot
(every Location plots) and sits in the general store's zone.

---

## ⭐⭐ Host placement

| new thing | host | what composing it claims | why not elsewhere |
|---|---|---|---|
| `Piecewise` / `TrajectoryLog` | value objects, `lib/Trajectory.ts` | nothing — held by publishers as a field | a mixin would claim a trajectory of every host; the log is a field a publisher owns |
| `TemperatureTrajectory` (shape) + a `TrajectoryLog` field | `ThermalMixin` (a body) and `AtmosphericMixin` (a scope) | *this thing's temperature has a reconstructible past* — true of every body and every air | a gauge cannot host it (it is driven) |
| the far-past guard | narrowed to `ThermalRegulation` hosts | *only a living body drops a long gap* | matter integrating its absence is already `Freshness`'s rule |
| `envelopeDriveW` (`@hook`) | `AtmosphericMixin` | *a scope's heat budget may include a driven term* — default 0 costs nothing | on ClimateControl alone the envelope could not read it without a guard |
| `ClimateControlMixin` + `setpointK`, `coolingCapacityW` | the compartment (`ColdStore`) and the room (`ColdRoom`), over `Atmospheric & Powered` | *this scope's air is driven toward a setpoint while supplied* — every composer is an enclosed air with a plug and a dial | on `Atmospheric` it would claim a dial for every room and the hive; on `Coolbox` for the icebox; on `Thing` for everything |
| `Powered` (shape) | implemented by `GridPoweredMixin` | *draws a supply that can be on or off, and can say when it was* | the kernel cannot read the grid |
| `poweredTrajectory`, the cut log | `GridPoweredMixin`; `GridCatalogue` | the grid's history is readable by the thing on it | state beside the state it extends (`cuts`) |
| `interiorVolumeM3`, `envelopeApplies`, `openExteriorOpenings`, `enclosureDefaults` overrides | the Thing composer (`ColdStore`), never the mixin | *a box with a declared roof, a door that is its seal, walls of its own material* | the coach's own pattern; a Location already answers all four |
| `latentRemovedJ` | `BulkPayload` (declared by `Thermal.ts`) | *a held liquid remembers how much of its latent heat has been removed* | on the vessel it would be the pan's opinion about water |
| `castTemplate`, `ruinedByFreezing` | `Material` | *what a frozen pool of this becomes / whether freezing ruins it* | a material fact |
| `holds` / `placement` / `placed` | `Container`+`Placing` / `Containable` / `Placing` | (unchanged) | — |
| `PlacingMixin` on `Chest` | `Chest` | *a chest has a lid* | — |
| `@samples` marker | `Staling`, `WaterActivity` (enclosed arm), `Wet` | *this gauge samples, and here is why* | the lint reads it |

⭐ **The narrowing test, applied.** No `isClimateControl` appears in
`Thermal`, `Atmospheric`, `Freshness` or the archetype: the body reads
the scope through `airScopeOf`; the envelope reads the drive through a
hook; the satisfier reads a temperature. The one predicate the mixin
gains is `MixinApi.isClimateControl` for the `requires:` binder and the
`coldStorage` holder-rung clause (`Atmospheric & Sealable & Container`
reading `getOwnTemperatureK()`), which is a read of the SPACE, not a
class.

---

## Convention conformance

As the first plan, plus:

- **`lib/Trajectory.ts`** is a top-level value object (`lib/Decay.ts`,
  `lib/quantity.ts` precedent); constructors are type-level statics,
  everything else instance methods — `lint:lib-statics` count unchanged.
- **A pack Location class** (`ColdRoom`) extends
  `@saxonberg/server/mud/platform/location/SingletonCartesianLocation` by
  package specifier (forestry's `Wood`); `lint:locations` accepts a
  singleton coordinate class; the row plots `coords` and lives in a zone.
- **`lint:envelope`**: the walk-in authors `enclosure:` and `setpointK`,
  never `_temperature` — the first cold room whose cold is a CAUSE; the
  curated `_temperature` list does not grow.
- **A new lint** (`lint:reconcile-chains`) is a script under
  `packages/server/scripts/` and joins the derived family with no list
  edit; its rationale paragraph goes in `lint-family.md`.
- **`@samples`** is a TSDoc block tag like `@hook`: add it to
  `typedoc.json`'s `blockTags`.
- **Persistent fields** added: the two `TrajectoryLog` rings (`Thermal`,
  `Atmospheric`), `setpointK`, `coolingCapacityW`, `interiorVolumeM3`,
  `BulkPayload.latentRemovedJ`, `Material.castTemplate`,
  `Material.ruinedByFreezing` — all in `fieldMeta`; `lint:field-meta`.
- **Lint gates this build must pass**: `lint:instanceable`, `lint:mass`,
  `lint:perishable`, `lint:power-posture`, `lint:mixin-names`,
  `lint:field-meta`, `lint:imports` (pack tier), `lint:module-scope`,
  `lint:lib-statics`, `lint:unconsumed-seams` (every new field read),
  `lint:placement-words`, `lint:envelope`, `lint:locations`,
  `lint:drive-scripts`, `lint:test-bootstrap`, `lint:reconcile-chains`
  (new), the export-discipline ESLint rules, the energy pack's `vitest`,
  and the boot rung check (`ColdStore`/`ColdRoom` resolve into energy's
  `src/`).

---

## Waves

### Stage A — kernel

#### W0 — Rung 1: the containment read (D8) — ✅ DONE (`9d00c0eed`)

**Done note.** Shipped as planned. `holds` is a `static` descriptor on
both `Container` and `Placing` (capability, never fires); `placement` on
`Containable`; `placed` on `Placing` (grouped, with the row heading).
`Container.contents` gained `dependsOnFields: ['contents','placement']`
and `ContainmentLogic.place` fires a `placement` event (plus the clear on
move's container-change invariant). `Chest` composes `PlacingMixin` for a
lid. Client: `HereList` affix (`· in`) + `▸` holds mark; new `PlacedList`.
New test `mql-subscription.placement.test.ts`; fields snapshot updated.
All 59 gates pass; type-clean. No surprises.

Unchanged from the first plan: `Container.holds` + `contents.dependsOnFields`;
`Placing.holds` + `placed`; `Containable.placement`;
`ContainmentLogic.place` fires `placement`; `REF_FIELDS`/`DETAIL_FIELDS`;
`packages/types` records; `Chest` composes `PlacingMixin`;
`LookController`'s `In it` heading from the row; client `HereList` affix +
`PlacedList`; server + client tests; `card-surface.md`/`spatial.md`.

**Commit.** `build(cold-storage W0): Rung 1 — the wire carries how each
item sits and what holds more`.

#### W1 — the trajectory primitive and its two publishers (D7, F1, F2) — ✅ DONE

**Done note.** `lib/Trajectory.ts` ships `Piecewise` + `TrajectoryLog`
(public constructors + instance methods only — the `lint:lib-statics`
ratchet was at 337/337, zero headroom, so NO new value-statics; a constant
is `new Piecewise([{…tau:0}])`). `ThermalMixin` and `AtmosphericMixin` are
the two publishers (`thermalLog`/`envelopeLog` rings, `runtimeState`);
`reconcileThermal` drifts toward the scope's moving air via the
two-exponential `driftTowardMoving`, far-past guard narrowed to
`ThermalRegulation`. F1 fixed in `BiomeLogic.outsideKFor` via
`enclosingAtmosphericOf`. `envelopeDriveW`/`climateSetpointK` hooks added
(default 0 / null — ClimateControl overrides in W3). `lint:reconcile-chains`
ceiling set to **8** (the honest W1 census; W2 drives to 0). `@samples`
added to typedoc blockTags.

⚠ **Surprise re-planned in place:** routing the body's pull through the
scope trajectory initially pulled an authored-`_temperature` room's temp
(cooling a pan pinned hot in a 293 K room → Evaporative test regressed).
Fixed: the pull reads a scope's trajectory **only when its envelope
applies**; an authored/no-envelope scope stays push-side-owned
(`lastAmbientK`), exactly the old scalar split. Tests: `Trajectory.test.ts`
(12), `Thermal.trajectory.test.ts` (4 — moving-target within 1% of a fine
reference, the narrowed guard both ways), `Atmospheric.nested.test.ts` (2 —
F1). All 582 lib tests green.



**Files.**
- `lib/Trajectory.ts` — `Piecewise`, `TrajectoryLog` (+ tests:
  `lib/__tests__/Trajectory.test.ts`: constant, refine, integrate vs a
  fine-step reference, the ring horizon rule, never-empty).
- `lib/thermal/Thermal.ts` — `TemperatureTrajectory` interface;
  `thermalLog: TrajectoryLog` (persistent); `temperatureTrajectory(fromS,
  toS)`; `reconcileThermal` restructured: window = scope's trajectory
  (`airScopeOf` → `temperatureTrajectory`; holder couples → constant),
  per-stretch moving-target closed form (module-private
  `driftTowardMoving`), breakpoint recorded per stretch, far-past guard
  narrowed to `ThermalRegulation` hosts; `restamp` records a breakpoint.
- `lib/biome/Atmospheric.ts` — `envelopeLog`; `temperatureTrajectory`
  (authored `_temperature` → constant; else the ring); `envelopeDriveW`
  `@hook` (default 0) folded into `heatW`; `reconcileEnvelope` integrates
  per stretch over its outside's trajectory when the outside is a nested
  scope (F1) and over `poweredTrajectory` when the host answers it
  (structural probe on `Powered`'s method).
- `platform/idea/api/BiomeLogic.ts` — **F1**: `outsideKFor(scope)` asks
  the scope's enclosing Atmospheric (the `airScopeOf` walk from the
  scope's own enclosing scope) for `envelopeTemperatureLast()` before the
  chain walk; the trace source gains `'enclosing-envelope'` so `feel`'s
  cause line stays honest.
- `scripts/check-reconcile-chains.ts` + `package.json` `lint:reconcile-chains`;
  `typedoc.json` `@samples`.
- Tests: `Thermal.trajectory.test.ts` (a body in a scope whose envelope
  steps mid-gap lands within 1 % of a fine-step reference; a regulated
  body still drops a long gap; a thing integrates it; a Thermal body with
  no scope is one constant stretch), `Atmospheric.nested.test.ts` (a Thing
  envelope inside a room drifts toward the ROOM's integrated temperature,
  not the biome; the coach in the street is unchanged),
  `ThermalDose` suite unchanged (not yet migrated — W2).
- Docs: `thermal.md` § The trajectory contract (new), § Two questions one
  step apart (the nested outside), `lint-family.md`.

**Acceptance.** Tests + `lint:family` green (`lint:reconcile-chains` at
its ceiling of 6).

**Commit.** `build(cold-storage W1): a temperature publishes its
trajectory — Thermal and the envelope keep a ring; a nested envelope
drifts toward its room`.

#### W2 — the dependents integrate (D7) — ✅ DONE

**Done note.** Every stepped-temperature gauge now integrates over the
host's `temperatureTrajectory`, folded per midpoint sample (exact for the
multiplicative logistic/exponential): `Freshness` + `Contaminable` (mixin
AND slot gauge, via module-private `advance*OverHost` folds — no new
statics, ratchet at ceiling), `Maturing.reconcileFerment` (the conversion
integral + peak/worst over samples; culture/evaporative keep a
time-weighted mean), `ThermalDose.reconcileDose` (integrates the body's
published trajectory stretch-by-stretch, reusing the exact scalar
`integrate`/`scorchOver` per stretch → identical numbers for a constant
ambient). `Staling` got a `@samples` marker (τ-ratio justified).
`lint:reconcile-chains` **driven to 0** (and the gate's doc-prefix
extraction fixed — it was swallowing a preceding sibling method's body as a
false positive, which cleared `reconcileBurning`/`reconcileBurnerFuel`/
`reconcileCellarAir`, none of which integrate a stepped temperature).

**Decision — Growing stays as-is (F6 → no-change).** `reconcileGrowth` is
NOT gate-flagged (it reads `_lastAmbientK`, not the sampling tokens), and
its four limiting factors are per-window MEANS by explicit design (the code
comments: *"the season does not turn inside one integration step"*) —
answer-3, not endpoint sampling. Migrating warmth alone to a trajectory
would be inconsistent with light/water/nutrient and risk a shipped
subsystem for no gate requirement. The intent reads as deliberate, so F6's
sanctioned no-change applies.

Tests: `Freshness.outage.test.ts` (warm-then-cool reads ABOVE the
cold-endpoint sample and within 1% of an independent fold; a cold week
stays fresh while a warm counter spoils). All 528 lib tests + baking green;
type-clean. Docs: spoilage.md, uncertainty.md (the audit table), thermal.md.



**Files.** `lib/material/Freshness.ts`, `Contaminable.ts` (mixin + slot
gauge: read `temperatureTrajectory(stamp, now)` off the host/holder, fold
per sample; no new static), `lib/maturation/Maturing.ts`,
`lib/husbandry/Growing.ts` (the cold ramp over the scope's trajectory;
`restampWarmth` retired where the sync read suffices),
`lib/thermal/ThermalDose.ts` (onto `Piecewise.integrate`),
`trade-baking/src/lib/Staling.ts`, `WaterActivity.ts`, `Wet.ts`
(`@samples`). Ratchet `lint:reconcile-chains` to 0.

**Tests.** `Freshness.outage.test.ts` (+ bulk twin, + Contaminable
twin): a Provision in a scope at 277 K for 7 game-days stays `fresh`, its
counter twin is `spoiled` by day 3; **mid-outage** (scope steps to 293 K
at day 2, read at day 2.25) within 1 % of the reference and far below the
end-sampled figure; **warm-then-cool** (steps 293 K at day 2, back to
277 K at day 2.5, read at day 3) within 1 % and far above the cold-sampled
figure; idempotence (a second read advances nothing); a non-Thermal host
reads the dial. `Maturing.trajectory.test.ts` (a cellar warm for a day
inside a 30-day batch), `Growing.cold.test.ts` (a frost night inside a
week), `ThermalDose` suite unchanged numerically.

**Docs.** `spoilage.md` (the "reads it ONCE" passage → the contract),
`maturation.md`, `husbandry.md`, `uncertainty.md` (Answer 4 built; the
audit table), `reconcile-chains-slate.md` → retired at the sweep with its
remainder salvaged to `thermal-slate`.

**Commit.** `build(cold-storage W2): every gauge that read a rate reads
its trajectory — Freshness, Contaminable, Maturing, Growing, ThermalDose`.

#### W3 — ClimateControl, Powered, the honest freeze (D1, D2, D5) — ✅ DONE

**Done note.** `lib/supply/Powered.ts` (kernel shape); `lib/thermal/
ClimateControl.ts` over `Stuff & Container & Atmospheric & Powered`
(setpointK/coolingCapacityW; `envelopeDriveW(T, powered)` folded into the
envelope; the content phase pass guarded against reentry; positive cools /
negative heats). `AtmosphericMixin.reconcileEnvelope` now **segments the gap
by the supply's `poweredTrajectory`** (the cut/splice read correctly across
an unobserved gap) with a symmetric setpoint clamp; `envelopeDriveW` gained
the `powered` flag; a structural `poweredTrajectoryOf` probe keeps the
kernel free of the energy import; `temperatureTrajectory` reconciles the
scope **only for a Powered scope** (so a ColdStore's cut history is current
while a plain room is not re-integrated on a peek). `MixinApi.isClimateControl`
+ registry + refusal. Archetype holder-rung gained the Atmospheric-sealable
clause (reads its own air). `Material.castTemplate`/`ruinedByFreezing`. The
freeze plateau in `reconcileBulkPhase` (`BulkPayload.latentRemovedJ`, the
cast clones the material's `castTemplate`, the ruin edge stamps freshness
load 1).

**Decisions:** (a) the `thermal.climate.capacityW` AppSettings dial was
NOT added — the authorable `coolingCapacityW` field IS the knob (an
appliance's nameplate per row); a dial for the default-of-the-default adds
plumbing for no behaviour. (b) Boil stays a flip (no boiling feature rides
this build; noted in thermal.md + deferred to thermal-slate).

**Surprises re-planned in place:** the Meltable freeze test expected an
instant flip — updated to a deep undershoot (the plateau is the point); the
async cast-clone now has a `.catch` (a missing template must not crash a
reconcile). The ClimateControl open-door test needed a weak fixture cooler
(50 W) — a strong one overpowers even an open door via the clamp, which is
correct physics, not a bug.

Tests: `ClimateControl.test.ts` (6 — Thing+Location parity, pull-down, the
hold-at-setpoint clamp, cut-drift, the AC, the open door, one-mixin
detection), `Thermal.freeze.test.ts` (3 — plateau, solidify, blood ruin).
All 660 affected lib tests green; type-clean. Docs: thermal.md (the active
twin + phase-both-ways), architecture.md (the mixin + Powered).



**Files.**
- `lib/supply/Powered.ts`; `lib/thermal/ClimateControl.ts` (D2);
  `lib/mixin.ts` + `api/mixin.ts` (`ClimateControl`, refusal
  `"{} doesn't hold a climate"`); `lib/archetype/Archetype.ts` (the
  holder-rung clause); `lib/material/Material.ts` (`castTemplate`,
  `ruinedByFreezing`); `lib/thermal/Thermal.ts` (`BulkPayload.latentRemovedJ`,
  the freeze plateau, the cast-template clone, the ruin edge);
  `lib/bulk/Bulkable.ts` transfer (accumulator scaled/cleared on pour);
  `platform/thing/Icebox.ts` docstring (D6); dial
  `thermal.climate.capacityW` in `AppSettings.ts` + `settings/thermal.yaml`.
- Tests: `ClimateControl.test.ts` with **two fixtures sharing one
  assertion set** — `ClimateControlMixin(FakePowered(SealableMixin(
  AtmosphericMixin(StagedMixin(ContainerMixin(Good))))))` with the four
  Thing overrides, and `ClimateControlMixin(FakePowered(SingletonCartesianLocation))`
  with a volume and an enclosure: powered → interior lands on the
  setpoint over `C/U`; cut → drifts to outside over `C/U`; a scripted
  cut-then-splice inside one gap matches the reference; a Thermal
  content reads the interior (both fixtures, same numbers); a setpoint at
  295 K in a 303 K fixture pulls down (the AC); the Thing with its door
  open cannot hold; the `coldStorage` satisfier accepts both.
  `Thermal.freeze.test.ts`: a pan of water at 255 K plateaus at 273 K
  until `4 kg × 334 kJ` is removed, then mints `/stuff/thing/ice-block`
  at 4 kg; iron mints a generic cast; a half-pour halves the accumulator;
  blood at the edge mints nothing, reads `rotten`, and a thaw changes
  nothing.
- Docs: `thermal.md` § The active twin — ClimateControl (Thing ≡ Location,
  the heat-rejection abstraction, the open-interior-door limit), § Phase
  change (the plateau both ways; boil still a flip), `spoilage.md`
  (freezing and blood), `blood.md`.

**Commit.** `build(cold-storage W3): ClimateControl drives an Atmospheric
interior on a Thing and a Location alike; freezing honors its latent heat
and ruins blood`.

### Stage B — the pack, the content, the drive

#### W4 — the plug, the two classes, the rows (D1, D3, D5.5, D6, D10) — ✅ DONE

**Done note.** `GridCatalogue` now timestamps cuts (`cutSince` + a bounded
`outages` ring) and publishes `poweredTrajectory(node, fromS, toS)` (the
0/1 cut-complement over the node + its upstream). `GridPowered implements
Powered` (adds `poweredTrajectory`; `resolveRoomPath` returns a Location's
own path). `ColdStore` (energy/thing) + `ColdRoom` (energy/location) over
`ClimateControlMixin(GridPoweredMixin(...))`, with the coach overrides +
state-line markupAugmenters. Rows: `ice-pan` + `cooler` (generic-objects);
`blood-fridge` (ships a `freezer-box` which ships the `ice-pan`) + the
walk-in `cold-room` (+ shop-floor north exit, a prime-cut twin on each
side) in terminus; `water.castTemplate` → ice-block; `blood.ruinedByFreezing`.

**Decision folded here (kernel):** `ClimateControlMixin.envelopeDriveW` now
gates on the `powered` segment flag ALONE, not `availablePowerW() > 0` — the
supply trajectory is the real "is the meter live" signal, and gating on the
band-watt dial coupled cooling to a seeded dial (the ColdStore test caught
it). `availablePowerW` stays the analyze/billing figure.

Tests: `ColdStore.test.ts` (4 — both compose ClimateControl+Powered,
pull-down, off-grid holds warm, cut warms); `GridCatalogue` trajectory test
(1·0·1 across a sever→splice). All energy (29) + generic-objects (28) pack
tests green. Docs: energy.md.



- `energy/src/idea/GridCatalogue.ts` — the cut log as a `TrajectoryLog`
  of 0/1 per node (`recordOutage(node, fromS, toS|null)`; `sever`/`splice`
  route through it); `poweredTrajectory(node, fromS, toS)` = the
  complement of cuts on the node and every node upstream (the compiled
  `downstream` sets); source generation read as-now (documented).
- `energy/src/lib/GridPowered.ts` — `implements Powered`;
  `poweredTrajectory`; `resolveRoomPath` returns the host's own path when
  it is not Containable.
- `energy/src/thing/ColdStore.ts` — `ClimateControlMixin(GridPoweredMixin(
  SealableMixin(AtmosphericMixin(StagedMixin(ContainerMixin(Good))))))`,
  `fixedInPlace = true`, `interiorVolumeM3` (authorable), the four coach
  overrides, a `markupAugmenter` state line (*running quietly* / *silent,
  the cold leaking out* / *standing open*).
- `energy/src/location/ColdRoom.ts` — `ClimateControlMixin(GridPoweredMixin(
  SingletonCartesianLocation))`; a state line on the room's description
  (*the compressor hums* / *the air is still and warming*).
- Rows per D10; `water.yaml` `castTemplate`; `blood.yaml`
  `ruinedByFreezing: true`; energy `README`/`pack.yaml` description.
- Tests: `ColdStore.test.ts` and `ColdRoom.test.ts` over the
  `ElectricLight.test.ts` private seam; `GridCatalogue.test.ts` segment
  cases.
- Docs: `energy.md` (consumers, the cut log, `Powered`); a
  `docs/subsystems/cold-storage.md` (decide at the sweep whether it
  stands or folds into `thermal.md`).

**Commit.** `build(cold-storage W4): the grid remembers its cuts; ColdStore
and ColdRoom over GridPowered; the blood fridge, the walk-in, the pan, the
cooler`.

#### W5 — the drive

`packages/wire/tests/cold-storage.dirty.wire.test.ts` (dirty: bleeds a
donor, freezes a pan, severs the avenue). Checkpoints, in the
requirements' order plus the additions:

1. `look fridge` → *running*; the card's `contents` carries the freezer
   box with `holds: true`.
2. `open fridge`; `bleed patient into bag`; `put bag in fridge`; `look
   fridge` → the bag in `contents`; `look freezer` → `holds`, its pan.
3. Rewind (wizard `eval` on the bag's payload stamp and the fridge's
   envelope stamp) 3 game-days; the fridge bag reads fresh, a counter bag
   reads turned; `transfuse … from <counter bag>` → refused *spoiled*.
4. `sever` at the pole → `look fridge` → *silent*; the band read is a
   band. The warm-then-cool integral is proven exactly by W2 (the
   food-safety precedent); the wire proves the wiring: `analyze grid`'s
   trace names the cut.
5. `splice` → *running*.
6. `fill pan from basin`; `put pan in freezer`; rewind the pan and the box
   8 game-hours; `look freezer` → *a block of ice*; `get ice from
   freezer`; `get cooler`; `put ice in cooler`; `put bag in cooler`;
   `close cooler`; walk to the necropolis; `eval` the bag's temperature →
   < 283 K.
7. **The walk-in.** Walk into the general store's cold room: `look` →
   *the compressor hums*; `feel` → cold band; `look prime-cut` → fresh
   after a rewind the shelf twin fails; `sever` → the room reads warming;
   ⭐ **the parity checkpoint**: the fridge's interior and the cold room's
   air, both rewound the same gap under the same cut, read the same band
   (the mixin on a Thing and on a Location, one outcome).
8. **Blood in the freezer**: `put bag in freezer`; rewind 6 h; `look bag`
   → *rotten*; `transfuse` refused — freezing ruins a unit.
9. `look chest` / `look rack` → `placed` groups with headings; `holds` on
   the hive row.

Plus the live browser walk (card rows, the affix, *Hanging from it*, the
cold room's description line). Then `pnpm test` once, push, open the MR.

**Commit.** `drive(cold-storage): <what driving found>`.

---

## Reachability wiring

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| fridge power gating | none new | `Sealable`/`Container` | rows name `ColdStore`; the parcel cites the avenue | lazy meter + lazy grid compile (shipped) | `put X in fridge` requires `Container` ✓; shut → `shut` at the verb |
| the walk-in | `go north` (shipped), `open door` | the exit + its door row | `cold-room` Location row, `coords`, the exit on `shop-floor.yaml`, the general-store parcel's feeder ✓ | the room is its own premises (W4 fix); plots into the zone | — |
| sever / splice | shipped | `LineAccess` | the avenue pole | — | — |
| the freezer's ice | `fill`, `put`, `get … from freezer` | `fill` needs a Bulkable + a water source (basin ✓) | `ice-pan`; `water.castTemplate`; `ice-block` | `MaterialCatalogue` carries water ✓ | `from <holder>` bypasses level 2 |
| the cooler | `put`/`get`/`open`/`close` | `Icebox`'s mixins | `cooler` row | — | `canMove` reads `fixedInPlace` ✓ |
| Rung 1 | `look` | — | the Placement rows' `heading` | `PlacementCatalogue` (boot entry) | — |
| the trajectory | none | none | the rings persist with their hosts | a fresh host has an empty ring = one constant stretch | — |

Every W5 checkpoint asserts a field or a band it could fail on.

---

## Acceptance-criteria coverage

| criterion | wave |
|---|---|
| powered cold store keeps blood and food far longer | W2 (clock), W3 (drive), W4 (rows); drive 3, 7 |
| cut → warms and spoils; restore → cools; correct mid-outage and after warm-then-cool | W1–W2 (tests), W4 (cut log), drive 4–5 |
| freezer yields carryable ice; a loaded cooler keeps a unit cold off-grid | W3 (plateau, castTemplate, phase pass), W4 (pan, cooler), drive 6 |
| `look` fridge = one appliance, two compartments; any container shows how each item sits and what holds more | W0, W4, drive 1, 2, 9 |
| Heart's Delight has no cold store | W4 ships none there |
| `transfuse` still refuses a spoiled unit; a cold-kept unit is stockable | untouched; drive 3, 8 |
| **ADD 1**: one mixin on a Thing and a Location, one behaviour, driven | W3 (two-fixture test), W4 (`ColdRoom`), drive 7 |
| **ADD 2**: every gauge that sampled a stepped dependency integrates; the slate graduates | W1–W2, `lint:reconcile-chains` at 0 |
| **ADD 3**: latent freeze; freezing ruins blood; heat rejection documented | W3; drive 6, 8; `thermal.md` |

---

## Test & gate strategy

Unit per wave as listed; the integrals are tested against a fine-step
numeric reference (the only honest oracle). `pnpm test:near` + the touched
pack suites + `lint:family` after each wave; `pnpm test` exactly twice
(pre-MR, `/finalize`). The drive is a wire file plus the browser walk;
long gaps are wizard `eval` rewinds on the object, never a clock scale.

---

## Risks & opens

**New load-bearing forks (for the user):**

- **F1 — the nested-envelope outside seam** (`BiomeLogic.outsideKFor`
  reads the enclosing scope's last-integrated envelope before the chain).
  Required for the Thing half of the promise; a kernel change to the one
  source of truth for *how warm is this scope*. Blast radius: every
  Atmospheric Thing inside a room (the coach in a coach-house becomes
  correct; the coach in the street is unchanged; the hive, sky-exposed,
  unchanged). Flagged, not folded.
- **F2 — the trajectory log is a bounded ring, not one field.** The slate
  wanted one field; a scope read by many bodies at different stamps
  needs a short history. 24 breakpoints per publisher, persistent;
  beyond the horizon the oldest curve is held and the record says so.
- **F3 — Coolbox stays; the fold is deferred. ✅ DECIDED (user, accepted).**
  Consequence accepted: ice in a cut freezer warms toward the compartment
  and does not hold it (the room abstraction) — which is the wanted
  behaviour, because "throw ice in and it keeps cold" would undercut the
  *cut power → it spoils* drama; the carried `Cooler` (passive `Coolbox`)
  covers the move-your-food-in-a-blackout case. The fix is a content
  back-reaction term in the envelope, which also retires
  `holderK`/`lentInsulationR` — a thermal build, deferred.
- **F4 — cooling capacity is an authored cause (`coolingCapacityW`)**, not
  a derived heat pump; the pull-down time is the envelope's own `C/U`.
  COP and rejection wait for billing.
  - ⭐ **Each cold-store row MUST author its enclosure/insulation** (the
    `enclosure:` material + thickness, via `Enclosed` on `AtmosphericMixin`
    — there is no `EnclosedMixin`; it is an interface Atmospheric
    implements). The enclosure IS the envelope's leak (`U·A`) and, with the
    ceiling `heightM` → volume, the whole `C/U` the pull-down and the
    drift-when-cut ride on. A row left on the universe default is a
    poorly-insulated box that warms in minutes — so the `ColdStore` /
    `ColdRoom` class `enclosureDefaults()` sets an insulated-panel / cold-wall
    default (one of the W3 coach overrides), and the fridge / freezer /
    walk-in rows author real insulation (a thick walk-in holds longer than a
    thin fridge, for free). A thin or absent enclosure is the first thing to
    check if the drive finds a fridge warming too fast — raise the row, not
    the code.
- **F5 — the far-past guard narrowing** (every Thermal thing integrates
  gaps longer than four game-hours): corpses cool across absences
  (wanted), thermoses cool (correct). Grep the thermal suites for tests
  encoding the old guard on a thing.
- **F6 — `Growing` is changed** on the finding that its start rectangle
  was an async-cache workaround, not conservatism; if a reviewer reads
  the intent differently, the W2 Growing task drops to a `@samples`
  marker with no other consequence.
- **F7 — heat rejection is a documented abstraction** (no waste heat on
  either host), attach point named.
- **F8 — a new lint** joins the family; its census/ratchet numbers are
  the build's to set.

Carried from the first plan: the freezer box's contents at MQL level 3
(Cabinet fallback); placement-change subscription storms (name-keyed dep
index); `holds` declared by two mixins; the `ice` material in
trade-bottling (sweep: move to base-library); `Casting`'s `AlloyedMixin`;
hydro generation not logged; the requirements' hive description and the
freezer-for-blood step (sweep edits).

**Stop and ask** only if: F1's seam closes a ring the existing reentry
guards do not catch (then the outside is read at the scope's own restamp
rather than at every integration and the plan is amended); the
`TrajectoryLog` ring cannot persist on an `Atmospheric` Location without
touching the persistence slice (then it is runtime-state and a reboot
loses the history — documented, as cuts already are); or the W5 rewind
cannot reach an envelope stamp through `eval` (then the parity checkpoint
asserts bands after a real-time wait inside the run's budget).

---

## Deferred seams

| deferred | attach point left here | slate |
|---|---|---|
| Rung 2: nesting view, parts-as-parts, part-transparency, chamber rows, MML layout | `placed`/`holds`/`placement` on the wire | `carded-prose-slate`, `chambered-vessels-slate` |
| the preindustrial ice trade | `castTemplate` on water; the cooler; `Casting`'s melt | `cold-chain-slate` / `preservation-slate` |
| the blood-bank economy | the par + a fridge that keeps units | `blood-slate` |
| metered billing, COP, heat rejection (`spaceHeatOutputW` on the Thing composer), brownout, durable cuts | `availablePowerW()`, `coolingCapacityW`, the cut log | `power-utility-slate` |
| the content back-reaction term (folds `Coolbox` into the envelope; ice holds a cut freezer) | the envelope's `heatW` walk | `thermal-slate` |
| a weather trajectory for the envelope's outside (answer 1 made exact); `Colony`'s sky outside | `Piecewise`; `reconcileEnvelope`'s outside stretch | `thermal-slate` (salvaged from `reconcile-chains-slate`) |
| boil as a plateau; freezing in the weather (a jug in a winter room) | `reconcileBulkPhase`; the phase pass is driven only by a cold source | `thermal-slate` |
| ⭐ meltwater inside a container with no `Floor` is lost (a cooler/freezer catches no puddle) — `doMelt`'s `findScopeFloor` returns null for a container, so the solid destructs and its litres vanish; accepted this build (the drama is spoilage, not puddles) | `doMelt` / `findScopeFloor` | `thermal-slate` |
| a cold ROOM's own floor puddle does not freeze (the phase pass drives loose contents, and a `Floor` is a fixture, not a loose content) — the walk-in parity checkpoint does not assert it | the content phase pass vs the scope's `Floor` | `thermal-slate` |
| steam is a disappearance, not a gas (boiling clears the pool; no steam cloud / steam-burn / pressure synergy) | `reconcileBulkPhase`'s boil branch | `thermal-slate` |
| general freeze–thaw damage to food | `ruinedByFreezing` | `preservation-slate` |
| the interior-door leak for a walk-in / AC (ventilation between rooms) | `openExteriorOpenings` | `thermal-slate` (the envelope's ventilation non-goal) |
| a `hemolyzed` band for blood | `stampLoad(1)` | `blood-slate` |
| moving `ice` to base-library | — | sweep note |

---

## Critical files

1. `docs/requirements/cold-storage-requirements.md`; this plan's
   § Grounding (the crux verdict).
2. `docs/uncertainty.md` § The second abstraction law;
   `docs/slates/builds/reconcile-chains-slate.md`; `docs/subsystems/thermal.md`
   (§ The envelope, § Two questions one step apart, § Phase change).
3. `lib/thermal/Thermal.ts` (L260–305, L330–400, L694–950, L1028–1145),
   `lib/biome/Atmospheric.ts` (L289–363, L630–660, L788–900, L980–1030,
   L1111), `platform/idea/api/BiomeLogic.ts` (L250–300, L877–960,
   L1118–1260), `lib/boundary/ExitableVessel.ts` (L150–240),
   `lib/Decay.ts`, `lib/thermal/ThermalDose.ts` (L87–130, L259–320,
   L403–420), `lib/thermal/Coolbox.ts`, `lib/archetype/Archetype.ts`
   (L100–135, L585–605).
4. `lib/material/Freshness.ts`, `Contaminable.ts`, `WaterActivity.ts`
   (L630–700), `lib/maturation/Maturing.ts` (L525–560, L905–920),
   `lib/husbandry/Growing.ts` (L470–495, L800–960),
   `trade-baking/src/lib/Staling.ts`, `lib/wetness/Wet.ts`.
5. `energy/src/lib/GridPowered.ts`, `src/idea/GridCatalogue.ts`,
   `src/thing/ElectricLight.ts` + its test, `docs/subsystems/energy.md`;
   `trade-forestry/src/location/Wood.ts` (the pack Location precedent);
   `trade-apiculture/src/thing/Hive.ts` (L73–200).
6. The containment-wire files and the client (as the first plan);
   `lib/stuff/Location.ts` (L150–180); `scripts/check-lib-statics.ts`,
   `check-envelope.ts`, `check-location-classes.ts`.
7. `packages/wire/tests/{clinical-medicine,energy,fishing,food-safety}.dirty.wire.test.ts`.
8. The content rows named in D10; `generic-objects/.../ice-block.yaml`,
   `fixture/icebox.yaml`; `base-library/.../bulk/water.yaml`,
   `tissue/blood.yaml`; `terminus/.../general-store/shop-floor.yaml`,
   `infirmary/ward.yaml`, `terminus/pack.yaml` (L42–87).

---

## Drive record

*(appended at build time, not at plan time)*
