# Fire & combustion — code-verified phased implementation plan

The Fire channel (combustion as a driver) + all the high-heat physics
crafting will later stand on. Traces to
[fire-combustion-requirements.md](../requirements/fire-combustion-requirements.md)
(authoritative — the 11 surface decisions D1–D11) and the
[slate](../slates/builds/fire-combustion-slate.md); verified against the
build-3 code (citations are `file:line`).

## 1. Grounding facts established from the code

**Campfire / furnace pattern (D8).** `obj/Campfire.ts` composes
`ThermalMixin(LightSourceMixin(ReservedMixin(PosturedMixin(SlottedMixin(Thing)))))`
(34-36). The pin is a `getTemperature()` **override** (61-67): `reconcileFuel()`
then, if `fuelRemaining() > 0`, return `Quantity.of(BURN_TEMP_K,'K')` else
`super.getTemperature()`. Fuel is a `Reserve` keyed `'fuel'`,
`theme:'combustion'`, depleted against game-time in `reconcileFuel` (79-101);
the burnout edge calls `setContentsTemperature(BURN_TEMP_K)` (97) to release the
pin. This is exactly the shape D8 generalizes.

**Thermal (D3 heat delivery / D7 phase change ride this).**
`lib/thermal/Thermal.ts`: `getTemperature()` is SYNC (242-245) — reconcile-on-read
then return `stampedTemperatureK`. `reconcileThermal` (358-410) is closed-form
Newton cooling toward the **cached** `lastAmbientK` (139/189). `restamp()`
(420-442) is the single async re-resolve. `getTau = effectiveR() ×
thermalCapacity()` (265-267); `thermalCapacity` = mass × specificHeat, or
contents-derived for a Bulkable vessel (277-301). **Critical divergence:** the
only "set temperature" primitive is `setContentsTemperature(k)` (310-316), which
*overwrites* `stampedTemperatureK` and re-anchors the clock. There is **no "add
joules / deposit heat" path** — objects only drift toward `lastAmbientK`.
Radiant warming is body-only (warming-slot `warmth` →
`ThermalRegulation.effectiveAmbient`, `ThermalRegulation.ts:376-382`); a hot
object does **not** raise a neighbouring *object's* temperature today. The
module states "**NOT an Api**" (30-33) — **no `ThermalApi` exists** (confirmed:
no `api/thermal.ts`, no `ThermalLogic.ts`).

**Materials-response `heat` channel (D2 / the AC channel landing).**
`lib/material/Channel.ts`: `CHANNELS = ['edge','point','blunt','shock']` (42);
`MECHANICAL_CHANNELS = ['edge','point','blunt']` (54). `heat`/`cold` are named as
*reserved-to-grow* in the doc (16-17) but are **not in the vocab**.
`ConditionLogic.inflict` (199-212) dispatches shock→`inflictShock`,
`Channels.isChannel`→`inflictThroughStack`, else→`inflictPassthrough`.
`inflictThroughStack` (243-302) resolves the covering stack outside-in
(`resolveCoveringStack`, 82-120), folds each layer via `MaterialApi.attenuate`
(260), then `MaterialApi.resolveTrauma` (276). **Both response internals bail for
a non-mechanical channel:** `attenuateImpl` passes energy through untouched if
`!isMechanicalChannel` (`MaterialLogic.ts:335-337`), and `resolveTraumaImpl`
returns `null` for non-mechanical (354). So `heat` **cannot reuse the
hardness/toughness fold** — it needs its own insulation-based attenuate +
heat→burn resolve, exactly as `shock` got `resolveShock` (567-573).
`InsultKind = Channel | 'thermal' | 'tearing'` (`Condition.ts:72`);
`inflictPassthrough` maps `'thermal'`→burn (315). **Divergence:** the
`'thermal'` token has **no production caller** — the touch-burn path
(`FeelController.reportSurface`, `GetController.burnOnGrab`) builds a `Trauma`
*directly* via `Touch.contactBurn` (`Touch.ts:101-110`), bypassing
`ConditionApi.inflict`. `'thermal'` is exercised only in
`ConditionLogic.test.ts:72`. `burn` is already a live `TRAUMA_BEHAVIOR`
(`Condition.ts:329`).

**WetMixin (D3).** `lib/wetness/Wet.ts`: `getWetness()` (129) reads
`Material.getWaterAbsorptionCapacity()` for the dry rate (229); `warmthMultiplier()`
reads the host's own sync `getTemperature()` (242-254). No latent-heat term
exists yet — D3's boil-off is a *new* read (`mass × saturation × capacity ×
waterLatentHeat`) added at the ignition energy balance, not in Wet.

**Respiration `breathableMedia` + `contaminant` (D5).**
`lib/respiration/Respiration.ts`: `getBreathableMedia()` (183-187) reads the body
plan; `assessExchange` (253-279) resolves the medium via `resolveCurrentMedium`→
`BiomeApi.resolveAtmosphereFor`; a *known-but-unbreathable* medium yields cause
`'medium'`→the asphyxiation drain (277). `BiomeLogic.ts` holds three parallel
one-line-growable tables — `ATMOSPHERE_DENSITIES` (39), `ATMOSPHERE_CONDUCTIVITIES`
(54), `ATMOSPHERE_BREATHABLE` (66) — plus the **laid-unread**
`ATMOSPHERE_CONTAMINANT` (80-84, "no reader ships"). A scope's medium is
overridable via `Atmospheric.setAtmosphere(tag)` (`Atmospheric.ts:376-388`). So
smoke lands by (a) a `smoke` row in each table (breathable:false,
contaminant:`'carbonMonoxide'`) and (b) the fire tick setting the scope's
`_atmosphere` override to `'smoke'`.

**Presence-gated tick (D1/D6).** `WeatherLogic.runBoundaryFanout` (554-595) and
`runStormFanout` (721-742) are the exact template: iterate
`ConnectionApi.getAllInteractives()`→`holder.getContainer()`→dedupe by
`room.stuffId`→sky-gate→act per occupied scope. `fireStrike` (780-817) shows
`StuffApi.create` / `ContainmentApi.move` / `StuffApi.destruct` in a fan-out.
Registration: `WorldClockRegistry.registerSystemSchedules` (449-483) arms
`weather:boundary` and `weather:strike` via `this.every(interval, () =>
WeatherApi.onX(), {startAt, tag})` (`every` at 249-272; `runRoot` wrapping used
by the heartbeat at 605). The fire tick is a third `this.every(..., 'fire:tick')`
→ `FireApi.onFireTick()`.

**Reserve (D2).** `lib/reserve.ts` `ReservedMixin` — `getReserve/adjustReserve/
setReserve` + decomposed-scalar persistence. Fuel-as-Reserve is the Campfire
precedent verbatim.

**Material properties (the additions).** `lib/material/Material.ts`: each real
prop is `private _x: Quantity<U>` + strict get/set (267-307 for
`electricalConductivity`/`waterAbsorptionCapacity`), listed in `persistentFields`
(405-414), a `QuantityMarshaller.pathFor(unit)` in `fieldMarshallers` (433-441),
and public `getX/setX` (563-577). Adding the six fire props is this pattern six
times.

**AppSettings dials.** `AppSettingKeys` is grouped by subsystem (wetness 618,
storm 651). `mud/config/app-settings.yaml` seeds them;
`backend/__tests__/AppSettingsSeeder.test.ts:44` asserts `added === 172`. Any new
dial bumps this literal.

**Demonstrator pattern.** `domain/moor/` holds only `__tests__`; content is
declarative YAML under `seeds/domain/moor/*.yaml` + `seeds/lib/address/moor.yaml`,
tested by `domain/moor/__tests__/*.integration.test.ts`. `domain/substation/
FloodedCell.ts` + `substation-content.test.ts` is the imperative-Stuff-subclass
sibling. Reachable-by-teleport.

**Mixin registration.** `lib/mixin.ts:27` `Mixins` maps capability→`_mixinName`;
`api/mixin.ts` has the `isX` narrowing predicates (`isThermal` 851, `isBulkable`
923, `isReserved` 839). `Combustible`/`Meltable`/`Furnace` slot in identically.

**Verbs.** `cmd/device/switch.yaml` (verbs + controller path + validators
`requiresAnimate`/`canReach` + `reachable` scope) → `obj/command/device/
SwitchController.ts` (narrows via `MixinApi.isSwitchable`). `ignite`/`douse` are
this shape; `douse` reuses `cmd/bulk/pour.yaml` + `BulkableApi.transfer`.

### Divergences from the requirements' assumptions (flagged)

- **DIV-1 — `ThermalApi` does not exist.** D7/D9 say "homed in `lib/thermal/`" and
  name `ThermalApi.reachableHeatFor`. Thermal is deliberately mixin-only. The
  build must **create an `api/thermal.ts` + `obj/api/ThermalLogic.ts` gated pair**
  (the `MaterialApi`/`MaterialLogic` shape) to home `depositHeat`, `reconcilePhase`,
  `reachableHeatFor`. An Api pair, not a new module category.
- **DIV-2 — no deposit-heat path.** "Heat delivered raises the object's
  temperature through the shipped thermal reconcile" (D3) is not literally true:
  the reconcile only *cools toward ambient*. A new primitive is required (H1).
- **DIV-3 — the `heat` channel can't reuse the mechanical fold** (H4). It is a
  non-mechanical channel like `shock`, needing its own attenuate + resolve.
- **DIV-4 — the `'thermal'` passthrough has no production consumer.** Retiring it
  is vocab + one test; the *real* work is routing the existing `Touch.contactBurn`
  producers through the new `heat` channel (the "byte-compatible where a burn was
  already produced" AC).
- **DIV-5 — no scope O₂/air-supply gauge exists.** `breathableMedia` is a medium
  *tag*, not a depletable level. Self-smother + the air-fuel ratio (D5) need a new
  per-scope air reserve (H6).
- **DIV-6 — `Bulkable` is authored per-host** (`interiorBulk`/`surfaceBulk`
  flags). A melting solid is not itself `Bulkable`; molten mass must flow into a
  `Bulkable` holder already in the scope (the `WeatherLogic.findRoomFloor`
  precedent, 643-659) (H2).

## 2. Ambiguities / hard spots, with recommended resolutions

**H1 — depositing heat on the sync Thermal read.** Add a
`ThermalMixin.depositHeat(joules)` primitive mirroring `setContentsTemperature`:
reconcile first, `ΔT = joules / thermalCapacity()`, `stampedTemperatureK += ΔT`,
re-anchor the clock. Expose gated as `ThermalApi.depositHeat(stuff, joules)`.
Ignition then is: the fire tick deposits `heatOfCombustion`-derived joules into
self + neighbours + scope; `getTemperature()` crossing the (wetness-adjusted)
autoignition point ignites. Read stays SYNC; "reaching the threshold is the
derivable energy balance" holds (`thermalCapacity` already gates ΔT — a match's
small joules barely move a big log).

**H2 — how melt-to-Bulkable-liquid flows mass.** A `MeltableMixin` host carries a
`'latentHeat'` `Reserve` (`theme:'phase'`). `ThermalApi.reconcilePhase(stuff)`
(driven from the reconcile-on-read + the heat tick): while temperature is pinned
at `meltingPoint`, drain the latent reserve by the delivered heat (the
**reserve-clamp**, the thermal-slate shape); on exhaustion, `StuffApi.destruct`
the solid and `BulkableApi.transfer` its volume (`mass/density`) as the molten
`Material` into the scope's surface-bulk `Floor` (`findRoomFloor` precedent).
Reverse (freeze): a bulk cooling below `meltingPoint` releases latent heat then
`StuffApi.create`s a cast solid. Boil past `boilingPoint` emits a gas bulk
(steam). Homed in `ThermalLogic`, fired by heat (hearth/sun/fire), not
fire-specific.

**H3 — advancing Burning + checking spread without geometry.** `runFireFanout`
mirrors `runStormFanout`. Per occupied scope: for each `Burning` object,
`advance()` = drain its fuel `Reserve` at the burn rate, `depositHeat` back into
self (self-sustain) + co-located neighbours + scope air, emit smoke/CO, re-verify
the triangle (fuel>0 && scope-O₂>floor && temp≥sustain), char/destruct on failure.
Then the **spread check**: co-located/in-contact `Combustible`s (via
`room.getContents()` + the containment graph) whose `getTemperature()` crossed
their ignition point ignite; **room-to-room** only through *open* exits
(`Sealable.isOpen()`/`Lockable` = firebreak). A single `Burning` also
reconciles-on-read for `analyze`; the tick is the authoritative spread driver.

**H4 — how `heat` plugs into `resolveTrauma`.** Add `'heat'` to `CHANNELS`; define
`THERMAL_CHANNELS = ['heat']` (sibling of `MECHANICAL_CHANNELS`). In
`attenuateImpl`, a heat branch: coverings attenuate heat by **insulation** (layer
`Material.thermalConductivity` inverted + construction layer depth) — leather/
padded resists, plate conducts — analogous to the shock series-resistance sum. In
`resolveTraumaImpl`, a heat branch → `type:'burn'`, severity from residual joules.
`channelDefaultType('heat')→'burn'`. `inflict` routes `'heat'` through the
unchanged `inflictThroughStack`. Convert `Touch.contactBurn` producers
(`FeelController`, `GetController`) to `ConditionApi.inflict({mechanism:'heat',
energy, site})`; retire `'thermal'` from `InsultKind` and delete the
`inflictPassthrough` thermal arm (keep `'tearing'`).

**H5 — how smoke/CO makes a scope un-breathable.** Add a `smoke` row to the three
`BiomeLogic` atmosphere tables (breathable:`false`, contaminant:
`'carbonMonoxide'`). The fire tick calls `Atmospheric.setAtmosphere('smoke')` on
the scope once smoke crosses the `choking` band, and clears it when smoke
dissipates. Respiration's existing medium crisis (277) fires asphyxiation with
**no respiration change**. For CO-as-toxin (beyond asphyxiation), wire the
laid-unread `ATMOSPHERE_CONTAMINANT` into a bounded new respiration→metabolism
toxin-burden read (the seam's *first* consumer).

**H6 — self-smother + the air-fuel ratio need a scope O₂ level.** Add a per-scope
air `Reserve` (`'air'`, `theme:'atmosphere'`) on the fire-bearing scope (installed
lazily by the fire tick, or authored on enclosed rooms). Burning consumes it; an
**open** boundary / a bellows replenishes it. The **air-fuel ratio** (fuel burn
rate vs available air) drives complete (hot, clean) vs incomplete (cooler, soot +
CO). A sealed room: air drains → incomplete → smoke+CO accumulate → air floors →
the oxygen leg fails → self-extinguish. The single new state D5 requires.

**H7 — Campfire refactor vs parallel `FurnaceMixin`.** Ship a **shared
`FurnaceMixin`** generalizing Campfire's pinned `getTemperature` override, with
the pin temperature = `f(fuel.heatOfCombustion, air-supply ratio)`; **refactor
`Campfire` onto it** in the same phase, using Campfire's existing tests as the
byte-compat guard (pin stays 800 K). `Forge`/`Kiln`/`Oven` compose it with
different fuel + bellows dials. Lower total surface than a parallel family; kills
the duplicated pin.

**H8 — `ThermalApi` creation (DIV-1).** Create the `api/thermal.ts` +
`obj/api/ThermalLogic.ts` gated pair in Phase 2; it homes `depositHeat`,
`reconcilePhase`, and later `reachableHeatFor`. Not a new module *category* — an
Api pair exactly like `Material`/`Weather`/`Electricity`.

## 3. Phases (dependency-ordered, each independently testable)

### Phase 0 — Material properties + AppSettings dials (foundation)
- **Outcome.** The six real props exist on `Material` and the fire/thermal dials
  are seeded. Unblocks every downstream numeric read. (Goals §"Real Material
  properties"; AC "dials seeded".)
- **Files (edit).** `lib/material/Material.ts` (add `autoignitionTemperature: K`,
  `heatOfCombustion: MJ/kg`, `meltingPoint: K`, `latentHeatOfFusion: J/kg`,
  `boilingPoint: K`, `latentHeatOfVaporization: J/kg` — field + get/set +
  `persistentFields` + `fieldMarshallers`); `lib/config/AppSettings.ts` (new
  `fire.*` / `thermal.phase.*` key group); `mud/config/app-settings.yaml` (seed);
  the base-library material roster seeds (real figures: paper 506 K, wood ~570 K,
  iron mp 1811 K, wax mp ~330 K, water mp 273 K / bp 373 K).
- **Tests.** Extend `lib/material/__tests__` — persistence round-trip; unauthored
  reads `0`. `AppSettingsSeeder.test.ts` count bump.
- **Risk/decision.** Pure-additive, `0`-until-authored (the `electricalConductivity`
  precedent) → zero behaviour change. Low risk.

### Phase 1 — the `heat` channel lands + `'thermal'` retired
- **Outcome.** Heat delivered resolves through the covering stack into a `burn` via
  `ConditionApi.inflict`, coverings attenuate heat, the `'thermal'` passthrough is
  gone, touch-burn is byte-compatible. (Goals §"materials-response heat channel";
  AC "The heat channel".)
- **Files (edit).** `lib/material/Channel.ts` (`heat` into `CHANNELS`; add
  `THERMAL_CHANNELS` + `isThermalChannel`); `obj/api/MaterialLogic.ts`
  (`attenuateImpl` heat/insulation branch, `resolveTraumaImpl` heat→burn branch);
  `obj/api/ConditionLogic.ts` (`channelDefaultType heat→burn`; drop the `'thermal'`
  arm of `inflictPassthrough`); `lib/vitals/Condition.ts` (`InsultKind = Channel |
  'tearing'`); `api/condition.ts` (doc); `lib/perception/Touch.ts` +
  `obj/command/perception/FeelController.ts` + `obj/command/inventory/GetController.ts`
  (route the scalding burn through `ConditionApi.inflict({mechanism:'heat',…})`).
- **Tests.** `MaterialLogic` heat-attenuation (insulating layer turns a burn,
  conductive layer passes it); `ConditionLogic` heat→burn through a covering stack;
  update `ConditionLogic.test.ts:72` (drop `'thermal'`); assert touch-burn severity
  unchanged (byte-compat).
- **Risk/decision.** The attenuate/resolve internals bail for non-mechanical
  channels today — the heat branch is genuinely new code, not a table row. Medium
  risk; well-isolated + test-covered.

### Phase 2 — `ThermalApi` + `depositHeat` primitive (H1, H8)
- **Outcome.** A gated `ThermalApi.depositHeat(stuff, joules)` raises an object's
  temperature via `ΔT = Q/C` on the sync model. Foundation for ignition, spread,
  phase change. (D3; constraint "go through the Api layer".)
- **Files (create).** `api/thermal.ts`, `obj/api/ThermalLogic.ts` (gated pair).
  **(edit).** `lib/thermal/Thermal.ts` (`depositHeat(joules)` primitive).
- **Tests.** Depositing `m·c·ΔT` joules raises temperature by exactly `ΔT`; a tiny
  deposit into a high-`C` host barely moves it (thermal-inertia gate); read stays
  SYNC.
- **Risk/decision.** Small, self-contained. Confirms the ignition energy balance is
  real before any fire code depends on it. Low risk.

### Phase 3 — the combustion driver: `Combustible` + `Burning` + `FireApi`/`FireLogic` + `ignite`/`douse`
- **Outcome.** Flammable matter driven past its (wetness-adjusted) ignition point
  ignites, burns (drains fuel `Reserve`, feeds heat back, emits light+smoke), and
  self-extinguishes when a triangle leg fails; the three extinguishers work.
  Reconcile-on-read for `analyze`. (Goals §"Combustion driver"; AC "Ignition energy
  balance", "Burning + self-extinguish".)
- **Files (create).** `lib/fire/Combustible.ts` (capability mixin: coefficients +
  marker), `lib/fire/Burning.ts` (active state: ignited-at, fuel remaining,
  complete/incomplete flag), `api/fire.ts` + `obj/api/FireLogic.ts` (gated pair:
  `ignite`/`douse`/`advance`), `cmd/device/ignite.yaml` + `cmd/device/douse.yaml`,
  `obj/command/device/IgniteController.ts` + `DouseController.ts` (douse reuses
  `BulkableApi.transfer` + the wetness gauge). **(edit).** `lib/mixin.ts`
  (`Combustible`), `api/mixin.ts` (`isCombustible`); the ignition energy balance
  reads `WetMixin.getWetness()` × capacity × water latent heat (D3's new term).
- **Tests.** Dry object past autoignition ignites; wet one does not until dried;
  small flame fails a high-inertia object; fuel-drain→char/embers; smother (no scope
  air) extinguishes; douse (water/wet) extinguishes — each triangle leg pulled,
  against real `Thermal`/`Wet` numbers.
- **Risk/decision.** `Burning` is the single-writer gated state (D2). Char = Material
  swap; structural burn-through = `StuffApi.destruct` + `hasBurnedThrough` seam (D4).

### Phase 4 — the presence-gated fire tick (spread) (H3, D1/D6)
- **Outcome.** The tick fans out over occupied scopes, advances each `Burning`, and
  spreads to co-located neighbours + through open boundaries (closed = firebreak);
  a wet neighbour resists; an unwatched scope freezes. (Goals §"Spread"; AC "Spread".)
- **Files (edit).** `obj/api/FireLogic.ts` (`runFireFanout` mirroring
  `runStormFanout`; `onFireTick`); `api/fire.ts` (`onFireTick`,
  `fireTickIntervalSeconds`); `obj/WorldClockRegistry.ts` `registerSystemSchedules`
  (add the `fire:tick` `this.every` block). Spread reads `room.getContents()` +
  open-exit graph + `Sealable.isOpen()`.
- **Tests.** Burning object ignites an adjacent dry `Combustible`; propagates
  through an open door but **not** a closed one; a wet neighbour resists; an
  **unoccupied** scope's fire does not advance (presence-freeze) — the
  `runStormFanout` presence-gating test is the template.
- **Risk/decision.** Depends on Phase 3. The one place runaway is possible — the
  presence gate + per-scope dedupe are the discipline.

### Phase 5 — real chemistry: scope air, complete/incomplete, smoke + CO (H5, H6, D5)
- **Outcome.** An air-starved fire burns incomplete (lower flame temp + soot + CO);
  opening a boundary/bellows shifts it complete; a sealed room fills with smoke+CO,
  asphyxiates + CO-poisons an occupant, and self-smothers. (Goals §"Real combustion
  chemistry"; AC "Chemistry".)
- **Files (edit).** `obj/api/BiomeLogic.ts` (`smoke` row in the three atmosphere
  tables + `ATMOSPHERE_CONTAMINANT.smoke = 'carbonMonoxide'`); `obj/api/FireLogic.ts`
  (scope air `Reserve` consume/replenish; air-fuel ratio → complete/incomplete →
  flame temp + smoke/CO emission; `Atmospheric.setAtmosphere('smoke')` at the
  choking band); `lib/respiration/Respiration.ts` (read `ATMOSPHERE_CONTAMINANT` →
  metabolism toxin-burden — the seam's first consumer).
- **Tests (end-to-end through respiration).** Starved fire measurably cooler +
  emits CO; bellows/open boundary → hotter + cleaner; **sealed room** → occupant
  asphyxiates + CO-poisons, fire self-smothers as air floors.
- **Risk/decision.** The scope air reserve (DIV-5) is new state; keep it a plain
  `Reserve`, presence-frozen with the tick. CO-toxin coupling is a bounded new read,
  not a metabolism rewrite.

### Phase 6 — phase change: `Meltable` + latent-heat reserve-clamp + molten flow (H2, D7)
- **Outcome.** Heat past `meltingPoint` flows a solid to a `Bulkable` liquid with a
  latent-heat plateau; cooling below it solidifies a casting; past `boilingPoint`
  boils to gas; bidirectional; ice→water→steam falls out. (Goals §"Phase change";
  AC "Phase change".) *Parallel-ish: needs only Phase 2 + `Bulkable`.*
- **Files (create).** `lib/thermal/Meltable.ts` (phase state + `'latentHeat'`
  reserve). **(edit).** `obj/api/ThermalLogic.ts` (`reconcilePhase`: reserve-clamp
  at the transition, `StuffApi.destruct`+`BulkableApi.transfer` to the scope `Floor`
  on melt, `StuffApi.create` a cast on freeze, gas emission on boil); `lib/mixin.ts`
  (`Meltable`), `api/mixin.ts` (`isMeltable`).
- **Tests.** Solid heated past `meltingPoint` holds temperature while latent heat is
  absorbed, then a molten bulk appears in the scope Floor; a liquid cooled below
  solidifies a Stuff; past `boilingPoint` → gas; the same clamp gives
  ice→water→steam.
- **Risk/decision.** The destruct→bulk mass hand-off (DIV-6) is the fiddly bit —
  route strictly through `StuffApi`/`BulkableApi`/`ContainmentApi` per the
  constraint.

### Phase 7 — the furnace family: `FurnaceMixin` + Campfire refactor + Forge/Kiln/Oven + Candle (H7, D8)
- **Outcome.** `Forge`/`Kiln`/`Oven` hold a fuel-and-air-driven temperature
  (charcoal hotter than wood; bellows hotter than not; smelting heat only with the
  bellows). Plus the **`Candle`** — the compact convergence fixture where the
  furnace layer, the wax phase-change (Phase 6), and the light all compose into one
  honest object. (Goals §"Furnace family"; AC "Furnaces", "The candle".)
- **Files (create).** `lib/fire/Furnace.ts` (`FurnaceMixin`), `obj/Forge.ts` /
  `obj/Kiln.ts` / `obj/Oven.ts` + their seeds; **`obj/Candle.ts`** =
  `FurnaceMixin(LightSourceMixin(MeltableMixin(CombustibleMixin(Thing))))` + a seed
  (small wax fuel `Reserve`; low pin temperature; the wick is the `Combustible`
  ignition site; wax `meltingPoint` ~330 K feeds the melt). **(edit).**
  `obj/Campfire.ts` (refactor the pin onto `FurnaceMixin`); `lib/mixin.ts`/`api/mixin.ts`
  (`isFurnace`).
- **Tests.** Campfire's existing tests pass unchanged (byte-compat pin at 800 K);
  charcoal forge > wood; bellows > no-bellows; only the bellows-forced forge reaches
  iron's 1811 K. **Candle:** `ignite` lights it (a dry wick catches, a wet one does
  not) → it emits light (`LightSource` gated on lit) and its wax **melts** to a pool
  (the Phase-6 `Meltable` clamp) and **wicks-down** (the fuel `Reserve` drains) →
  `douse`/snuff extinguishes it and the pool **resolidifies** as it cools below the
  melting point → left burning, it burns down to a spent stub → a candle in a sealed
  container **self-smothers** (the Phase-5 air reserve). One fixture exercising
  Combustible + Furnace + Meltable + LightSource + the air model together.
- **Risk/decision.** The Campfire refactor is guarded by its own suite; behaviour
  identical either way (D8). The `Candle` is pure composition over the phases below
  it — the "does it all hold together" proof, and a demonstrator fixture in its own
  right (a lit candle on the forge/woodshed bench).

### Phase 8 — the inert `ThermalApi.reachableHeatFor` seam (D9)
- **Outcome.** A gated read returns the max sustained temperature reachable from a
  position; consumed by no recipe. (Goals §"heat-as-crafting-control seam"; AC "The
  inert crafting seam".)
- **Files (edit).** `api/thermal.ts` + `obj/api/ThermalLogic.ts`
  (`reachableHeatFor(scope|maker)` walking reachable `Furnace`s).
- **Tests.** Returns the reachable max temperature; **grep/test-verified inert** (no
  recipe caller).
- **Risk/decision.** Trivial once Phase 7 exists. The non-goal line is enforced by
  the inertness test.

### Phase 9 — declarative demonstrators
- **Outcome.** The burning woodshed (spread + wet-resist), the sealed-room CO death,
  the working forge (melt-to-liquid), reachable-by-teleport, integration-tested.
  (Goals §"Declarative demonstrators"; AC "Demonstrators".)
- **Files (create).** `seeds/domain/<fire>/…yaml` (rooms/adornments/populates),
  `seeds/lib/address/…yaml`, `domain/<fire>/__tests__/*.integration.test.ts` (the
  moor/substation precedent — no imperative construction in hooks).
- **Tests.** Woodshed fire spreads and a wet log resists; sealed room kills by CO
  and self-smothers; forge melts a metal past its melting point to a pourable liquid.
- **Risk/decision.** Declarative-content constraint; teleport-reachable.

### Phase 10 — docs + reflection
- **Outcome.** `fire.md` created; `thermal.md` covers phase change;
  `race.md`/`CLAUDE.md`/`architecture.md` reflect the new mixins + Material props;
  seeder count reconciled.
- **Files (edit).** `docs/subsystems/fire.md` (new), `thermal.md`, `race.md`,
  `CLAUDE.md`, `architecture.md`, `AppSettingsSeeder.test.ts` count.
- **Risk/decision.** The `finalize` sweep graduates these; low risk.

## 4. Cross-cutting constraints honored (checklist)

- **Presence-freeze / no runaway** — the `fire:tick` fan-out iterates
  `ConnectionApi.getAllInteractives()` with per-scope dedupe (Phase 4), the
  `runStormFanout` discipline; an unwatched scope does zero work; `Burning`
  reconcile-on-read is presence-frozen via the world-clock now-source guard. ✔
- **No parallel damage path** — heat-to-body routes only through the `heat`
  `Channel`→`ConditionApi.inflict` (Phase 1); combustion-of-object routes only
  through the gated `FireLogic` (Phase 3). One writer each. ✔
- **Real Quantities under a banded surface** — the six props are real `Quantity`s
  (Phase 0); players see bands (`smouldering/burning/blazing/dying`; air
  `clear/hazy/choking`), raw numbers on `analyze` only. ✔
- **Reconcile + presence-gated tick idiom** — no bespoke timers;
  `WorldClockRegistry.every` / `ScheduleApi.recurring` wrapped in `runRoot`; the
  `Burning` read mirrors the harm-wound reconcile. ✔
- **Go through the Api layer** — `StuffApi.create`/`destruct`, `ContainmentApi.move`,
  `BulkableApi.transfer`, `ThermalApi.depositHeat`/`reconcilePhase` — no direct
  mechanism calls (Phases 2/6). ✔
- **No new module categories** — `Combustible`/`Meltable`/`Furnace` capability
  mixins in their subsystem folders; `FireApi`/`ThermalApi` gated Api pairs (the
  `Material`/`Weather` shape); declarative demonstrator content. ✔
- **Declarative content** — demonstrators ride `adornments:`/`populates:`/authored
  seeds (Phase 9). ✔
- **The crafting seam stays inert** — `reachableHeatFor` built + tested +
  grep-verified unconsumed (Phase 8). ✔

## 5. Decisions (recommended — confirm before coding)

1. **Create a `ThermalApi`/`ThermalLogic` gated pair** (DIV-1/H8) to home
   `depositHeat`, `reconcilePhase`, `reachableHeatFor`. Thermal stays a mixin; the
   Api is the gated facade.
2. **Add `ThermalMixin.depositHeat(joules)`** (H1) — `ΔT = Q/thermalCapacity()`,
   re-stamp — as the single heat-delivery primitive; ignition + spread + phase
   change all drive through it.
3. **`heat` is a non-mechanical `Channel` with its own attenuate (insulation) +
   resolve (heat→burn) path** (H4), not a mechanical-fold table row; convert the
   `Touch.contactBurn` producers to `ConditionApi.inflict({mechanism:'heat'})` and
   retire `'thermal'`.
4. **The fire tick is a presence-gated `fire:tick` `WorldClockRegistry.every`**
   mirroring `weather:strike` (H3); it is the authoritative spread driver, with
   `Burning` reconcile-on-read for `analyze` only.
5. **Phase change destructs the solid and flows molten mass into the scope's
   `Bulkable` Floor** (H2), clamped by a `'latentHeat'` reserve; freeze
   `StuffApi.create`s a casting. Homed in `ThermalLogic`, fired by any heat source.
6. **Smoke lands as a `smoke` atmosphere tag** (breathable:false,
   contaminant:`carbonMonoxide`) set via `Atmospheric.setAtmosphere` (H5); the fire
   adds a **per-scope air `Reserve`** for self-smother + the air-fuel ratio (H6); CO
   wires the laid-unread `ATMOSPHERE_CONTAMINANT` into respiration→metabolism as its
   first consumer.
7. **Ship a shared `FurnaceMixin` and refactor `Campfire` onto it** (H7), guarded by
   Campfire's existing tests; Forge/Kiln/Oven compose it.
8. **Ignition's wetness term is a new read at the energy balance** (D3), not a change
   to `WetMixin`: `autoignition_effective = autoignition + f(getWetness() ×
   waterAbsorptionCapacity × waterLatentHeat / thermalCapacity)`.

## Cross-references

- Requirements: [fire-combustion-requirements.md](../requirements/fire-combustion-requirements.md)
- Slate: [fire-combustion-slate.md](../slates/builds/fire-combustion-slate.md)
- Subsystems: thermal, materials-response, harm, weather (wetness + the tick),
  respiration, bulk, light, biome (atmosphere tables), crafting (the deferred
  consumer of the inert heat-control seam).
