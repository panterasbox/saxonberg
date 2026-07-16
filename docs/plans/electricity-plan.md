# Electricity implementation plan — the `shock` channel + conduction-spread

> Derived from `docs/requirements/electricity-requirements.md`
> (authoritative) and `docs/slates/builds/electricity-slate.md`, verified
> against the build-3 code. Nine phases, each independently testable, in
> dependency order.

## Grounding facts established from the code (read before planning)

- **Channel vocabulary** is a closed, additively-growable tuple in
  `lib/material/Channel.ts` (`CHANNELS = ['edge','point','blunt']`, the
  `Channels` static holder, `Channels.isChannel`). Re-exported through
  `lib/vitals/Condition.ts` and `api/condition.ts`. Adding `'shock'` is a
  one-line vocabulary extension — but every table keyed on `Channel`
  (`ARMOR_PROFILES`/`DELIVERY_PROFILES` in `Construction.ts`,
  `materialHeight` in `MaterialLogic.ts`, `channelDefaultType` in
  `ConditionLogic.ts`) becomes non-exhaustive and must default sensibly.
- **The response home** is `MaterialApi` (`api/material.ts`) forwarding to
  `MaterialLogic` (`obj/api/MaterialLogic.ts`, gated
  `FromModule('/api/material#MaterialApi')`). The physics core is
  module-private free functions; MAGNITUDE is `dial(key, fallback)` reading
  `AppApi.setting`. This is the home for `I = V/R` per the requirement.
- **`inflict` already branches** at `ConditionLogic.inflict` (line 165):
  `Channels.isChannel(spec.mechanism)` → `inflictThroughStack` (the
  covering-stack fold, `MaterialApi.attenuate` per layer → `resolveTrauma`)
  vs `inflictPassthrough` (thermal/tearing). The shock branch must **skip the
  covering fold** — a third path beside these two, leaving both existing
  paths byte-identical.
- **`Material`** declares `density`/`thermalConductivity`/`specificHeat`/
  `hardness`/`toughness` as `private _x: Quantity<U>` + strict `protected
  get/set` throwing on unit mismatch + public `getX/setX` + entries in
  `persistentFields` + `fieldMarshallers` (`QuantityMarshaller.pathFor(unit)`).
  **The class header explicitly says `electricalConductivity` was removed as a
  fake 0–1 scalar and to "re-add as a real Quantity when a consumer — fire,
  electricity — actually lands."** This phase is that re-add.
- **`lib/quantity.ts`**: `Unit` is a string-literal union (`bpm`/`mmHg`/`L`
  are the vitals precedent); `unitOps` maps each unit to `ARITHMETIC_OPS`;
  `registerConverter(from,to,fn)` wires scale conversions (`mmHg↔Pa`, `L↔m³`,
  `mL↔L`). Tag tables (for banding) register via `Quantity.registerTagTable` /
  `config/quantity-tags.yaml`.
- **The gather-walk**: `lib/perception/AudienceGather.ts` — `static
  gather(sourceLoc, sourceDb)` runs a private recursive `walkOutward` with a
  `visited: Set<string>` cycle guard, `MAX_HOPS` cap, per-edge attenuation
  (`cumulativeTau`), collecting `AudienceArrival[]`. A pure namespace class,
  physics reused from `SoundModality.walkAt`. This is the structural template
  for the conduction walk — but the graph is different (contact edges, not
  room exits) and it divides current toward a ground sink.
- **The death seam**: `Vitals.ts` — `reconcileConditions()` (line 547) is
  reconcile-on-read, presence-frozen (first-touch stamp, linkdead re-stamp,
  `elapsed<=0` guard, `MAX_REASONABLE_GAP_SEC` far-past guard), integrates
  `Trauma.tickedAt` via `TRAUMA_BEHAVIOR[t.type].tick`, and fires
  `setCauseOfDeath('exsanguination') + setLifecycleState('dead')` when
  `bloodVolume` floors. It is driven by `getVitalSign('bloodVolume')` (line
  304). **`heartRate` is a declared vital sign (`_heartRate: Quantity<'bpm'>`,
  band `{baseline:70, survivableMin:30}`) that nothing currently drives on
  read** — the undriven seam electricity claims. Respiration/Thermal/Metabolic
  (`lib/respiration/Respiration.ts:479-511`,
  `lib/thermal/ThermalRegulation.ts:502`, `lib/metabolism/Metabolic.ts:777`)
  are the reconcile-cascade→`applyDeath` precedent; the sustained-affliction
  seeds (`seeds/lib/respiration/conditions/asphyxiation.yaml`,
  `seeds/lib/thermal/conditions/hypothermia.yaml`) are `/lib/vitals/Condition`
  Ideas with `resolution.by`/`observableSigns`.
- **Floor** (`obj/Floor.ts`) composes `BulkableMixin` with a **surface** bulk
  slot (`surfaceBulk`, `surfaceMaterial` Pattern-A path, `_surfaceAmount:
  Quantity<'L'>`) — the puddle. It carries a `Material` via `Thing`/`Tangible`.
  It is an `Adornment` fixture, one per authoring room. This is both the
  co-immersion pool and the ground node.
- **Covering stack** is walked by `resolveCoveringStack(host, partKey)` in
  `ConditionLogic.ts` (reads `getSpecies().getBodyPlan().getSlotsCovering`),
  ordered outside-in by `Construction.LAYER_DEPTH`. Armor/weapons are emergent
  `ConstructedMixin` compositions (`lib/material/Constructed.ts`,
  `lib/equipment/Weapon.ts`, `Armor`); no `isArmor`/`isElectrical` narrowing
  exists — the requirement's inversion constraint is already the house style.
- **Demonstrator precedent**: `domain/lounge/GlassAlley.ts` — a one-off
  `Location` subclass (Singleton + PostRegistration + Populates + Exitable),
  class-constant hazard config, fires on the `onEntered` movement hook, calls
  `ConditionApi.inflict` (never `afflict`). `+
  __tests__/GlassAlley.integration.test.ts` drives it end-to-end through real
  movement + world clock. This is the flooded-room's template.
- **Legibility**: `analyze` (`cmd/perception/analyze.yaml`) is a
  subcommand-per-controller verb (`AnalyzeResponseController` etc.). Pips are
  a `markupAugmenters` contribution on `ConstructedMixin`
  (`responsePipsAugmenter`, reads `MaterialApi.previewBand`).
- **Dials**: `AppSettingKeys` (`lib/config/AppSettings.ts:30`) string-const
  map + `config/app-settings.yaml` `settings:` list; consumers read
  `dial(AppSettingKeys.x, fallback)`.

### Ambiguities / hard spots flagged up front

1. **Where the starter Material roster is authored — RESOLVED.** The roster
   lives in the **`@saxonberg/content-base-library` content pack** at
   `packages/content/base-library/content/lib/material/**` (already carries
   `element/copper.yaml`, `bulk/water.yaml`, `rock/granite.yaml`,
   `textile/wool.yaml`, … with hardness/density). So electricity's
   `electricalConductivity` values are authored **there** (add the field to
   existing materials; add rubber/leather + a flesh/tissue material if
   absent), and the banding tag tables go in the pack's
   `content/quantity/quantity-tags.yaml` (**not** a top-level
   `config/quantity-tags.yaml`). Phase 1's "starter roster" and "tag tables"
   file targets are corrected accordingly.
2. **Wet-skin modeling.** Weather ships (`lib/weather/`, `WeatherType` with a
   `rain` type + `humidity` field) but there is **no per-body wetness state**.
   Two honest options: (a) **derived, resolution-time** wetness — a body is
   "wet" iff co-immersed in a conductive pool OR under active rain in a
   SkyExposed scope, computed in the resistance read, nothing stored (matches
   the "potential is computed at resolution, not stored" philosophy); (b) a
   **stored drying gauge** (`Quantity`-typed wetness that decays over game
   time). The plan recommends (a) for v1 and names (b) as the upgrade.
3. **The "being-shocked" condition shape.** `ActiveCondition = Trauma |
   AfflictionRecord`; neither carries a **current magnitude**. The plan
   proposes a **third condition kind** (`SustainedShock`, additive to the
   closed union) carrying `{kind:'shock', current, tickedAt, source, sites}`.
   Alternative: an `AfflictionRecord` + a side-table. The additive union is
   cleaner and matches "grow additively," but touches the shared condition
   type — flag for sign-off.
4. **New Api name.** The response math extends `MaterialApi`; the graph walk +
   source-potential + inflict orchestration is the new gated Api. The plan
   names it **`ElectricityApi`/`ElectricityLogic`** (umbrella that the deferred
   grid extends) rather than `ConductionApi` (too narrow).
5. **Current-division fidelity.** Per requirement D1, **simple
   conductance-to-ground division with `electricity.*` dials, not a full
   Kirchhoff mesh.** The plan commits to this; the walk exposes a seam a future
   mesh solver can replace without changing callers.

---

## Phase 1 — Units + the `Material.electricalConductivity` property + starter roster

**Outcome.** `V` / `A` / `Ω` / `S/m` are real `Quantity` units that
round-trip through the marshaller with real-world scale converters; `Material`
carries `electricalConductivity: Quantity<'S/m'>` as a strict-typed sibling of
`hardness`/`toughness`; a starter roster (copper, salt water, fresh water,
wood, rubber/leather, flesh) authors real values. No behavior yet — the axis
and the seam only.

**Files to change.**
- `lib/quantity.ts`: add `'V' | 'A' | 'Ω' | 'S/m'` to the `Unit` union (a new
  "Electricity" comment block near the vitals units); add each to `unitOps` =
  `ARITHMETIC_OPS`; register real converters for the coursework scales —
  `registerConverter('kV','V', n=>n*1000)` + inverse, `mV↔V`, `mA↔A`, `kΩ↔Ω`,
  `MΩ↔Ω` (these sub/super units also join the `Unit` union). `S/m` needs no
  converter (base axis, like `bpm`).
- `config/quantity-tags.yaml`: register banding tag tables for `A` (the
  current ladder: `imperceptible`/`tingle`/`let-go`/`tetanic`/`fibrillating`
  thresholds), for `Ω` (`conductor`/`resistive`/`insulator`), and for `S/m`
  (`insulator`/`poor`/`good`/`conductor`) — the banded surface over raw
  numbers. Follows the vitals `bac`/thermal tag-table precedent.
- `lib/material/Material.ts`: re-add `_electricalConductivity: Quantity<'S/m'>`
  (default `Quantity.of(0,'S/m')`), strict `protected get/set` throwing on unit
  mismatch (copy the `hardness` block verbatim), public
  `getElectricalConductivity()/setElectricalConductivity()`, add
  `'electricalConductivity'` to `persistentFields` and `fieldMarshallers`
  (`QuantityMarshaller.pathFor('S/m')`). Update the class header (remove the
  "removed as fake scalar" note for this field).
- Starter roster (see ambiguity #1 for location): author
  `electricalConductivity` on copper ≈ `6e7 S/m`, salt water ≈ `5 S/m`, fresh
  water ≈ `0.01 S/m`, wood ≈ `1e-4 S/m`, rubber/leather ≈ `1e-13 S/m`, flesh ≈
  `0.2 S/m` (dry-skin resistance handled in Phase 5). Values are **content**,
  authored as concepts→numbers per the constraint.

**Tests.** `lib/__tests__/quantity` — V/A/Ω/S·m construct, arithmetic, and
convert (`Quantity.of(50,'kV').to('V')` = 50000; `10 mA` = `0.01 A`).
`Material` — `setElectricalConductivity` strict-throws on wrong unit; the
field survives a marshaller round-trip (hydrate from bare number / `{value,
unit}` / tag string → `Quantity<'S/m'>`). Roster test: each material resolves
its authored conductivity.

**Risk/decision.** The `Ω` glyph (U+03A9) and `S/m` as map keys — confirm no
lint/encoding issue (the repo already uses `W/(m·K)`, `MJ/m³`, `·`). Roster
location per ambiguity #1.

---

## Phase 2 — The `shock` channel + Ohm's-law circuit resolution on `MaterialApi`

**Outcome.** `'shock'` is in the `Channel` vocabulary
(`Channels.isChannel('shock')` true); `MaterialApi` gains the honest,
scale-invariant circuit primitives — `I = V/R`, `P = I²R`, a material→
resistance read, a series-resistance sum for a covering stack, and a
current→trauma/band resolution — all as pure, dial-parameterized functions.
No graph, no bodies yet: the physics core in isolation.

**Files to change.**
- `lib/material/Channel.ts`: append `'shock'` to `CHANNELS`; update the header
  (shock is delivered/resisted through the same surface but **resolves by
  circuit, not the energy-attenuate fold**).
- `lib/material/Construction.ts`: `ARMOR_PROFILES`/`DELIVERY_PROFILES` are
  `Record<ArmorForm, Record<Channel, …>>` — adding `'shock'` makes them
  non-exhaustive and fails typecheck. **Recommend the subtype narrowing**
  (`MECHANICAL_CHANNELS` = `edge|point|blunt`) — shock is **not** a
  construction-shape axis (resistance is a material/series property), so keep
  `Construction` honestly mechanical and let `shock` live only where circuit
  code reads it. Update `Construction.doesNothing` and `deliverableChannels`.
- `api/material.ts` + `obj/api/MaterialLogic.ts`: add the circuit surface (Api
  forwards; logic in module-private free functions):
  - `ohmsCurrent(voltage: Quantity<'V'>, resistance: Quantity<'Ω'>):
    Quantity<'A'>` — `I = V/R` (guard R→0 with a floor dial).
  - `jouleHeat(current: Quantity<'A'>, resistance: Quantity<'Ω'>):
    Quantity<'W'>` — `P = I²R` (the loss term; seeds the Joule→fire seam,
    unused for harm in v1 but the honest formula ships now).
  - `bodyResistance(material, wet: boolean): Quantity<'Ω'>` — flesh
    conductivity + nominal geometry (dial) → dry ≈ 100 kΩ; `wet` divides by the
    wet-skin factor (~100×, Phase 5 consumes the flag).
  - `contactResistance(material): Quantity<'Ω'>` — a node/edge series
    resistance from a material's conductivity + nominal geometry; a conductor ≈
    0, an insulator ≈ ∞ (clamped by dials).
  - `seriesResistanceOfCoveringStack(layers): Quantity<'Ω'>` — **the covering
    stack contributes series resistances** (not the attenuate fold): sum
    `contactResistance(layer.material)` outside-in. The armor inversion's
    engine (Phase 5): metal→~0 added, rubber→large added.
  - `resolveShock(current: Quantity<'A'>): TraumaResolution | null` — map
    current bands to the outcome: below let-go = `null`/tingle, contact `burn`
    severity from current×(dial), higher bands flagged for the vitals coupling.
- `lib/config/AppSettings.ts` + `config/app-settings.yaml`: `electricity.*`
  dials with **real-world-grounded** seeded literals —
  `electricity.body.dryResistanceOhms: 100000`, `electricity.body.wetFactor:
  100`, `electricity.geometry.*` nominal length/area,
  `electricity.resistanceFloorOhms`, `electricity.letGoAmps: 0.01`,
  `electricity.fibrillationAmps: 0.1`, `electricity.burnPerAmpSecond`, etc.

**Tests.** Pure math: `I=V/R` (120 V across 100 kΩ ≈ 1.2 mA = tingle; 120 V
across 1 kΩ wet ≈ 120 mA = fibrillation; 50 kV taser across high internal R =
low mA); `P=I²R`; series-stack sum (adding a rubber layer raises R by orders
of magnitude, adding steel barely moves it); `resolveShock` band cutoffs; the
static-shock teachable (thousands of V, tiny current → `null`). Assert
`Channels.isChannel('shock')` and that `Construction` still typechecks.

---

## Phase 3 — `inflict` shock branch (skips the covering-stack fold)

**Outcome.** `ConditionApi.inflict(body, {mechanism:'shock', site, current})`
lands a shock **without** running the covering-stack attenuate fold — the path
resistance was resolved upstream (Phase 4). The mechanical
(`inflictThroughStack`) and passthrough paths stay byte-identical; shock is a
third sibling. A shock produces a contact `burn` trauma whose severity comes
from the **current**, not energy.

**Files to change.**
- `api/condition.ts`: extend `InflictSpec` — for a `shock` mechanism the
  magnitude is a **current** (`Quantity<'A'>`), not `energy`. Add an optional
  `current?: Quantity<'A'>` (or a discriminated `InflictSpec` union keyed on
  mechanism) and document that shock's magnitude is current-through-victim.
- `lib/vitals/Condition.ts`: `channelDefaultType('shock') = 'burn'` (the local
  contact burn); no new `TraumaType` needed. The being-shocked *sustain* is
  Phase 6.
- `obj/api/ConditionLogic.ts`: in `inflict`, branch **before**
  `inflictThroughStack`: `spec.mechanism === 'shock'` → a new module-private
  `inflictShock(target, spec, inflicter)` that (a) does **not** call
  `resolveCoveringStack`/`MaterialApi.attenuate`, (b) calls
  `MaterialApi.resolveShock(spec.current)` → a `burn` trauma at the site, (c)
  stamps `tickedAt`, runs `TRAUMA_BEHAVIOR['burn'].onset`, afflicts. Keep the
  edge/point/blunt routing exactly as-is (shock intercepted first).

**Tests.** `inflict({mechanism:'shock', current})` on a body → a `burn` trauma
with current-derived severity; **the covering stack is never consulted**
(spy/assert `resolveCoveringStack` not called on the shock path); the existing
mechanical + passthrough tests remain green (byte-identical proof).

**Risk/decision.** The `InflictSpec` shape change (energy vs current) — a
discriminated union is safest but ripples to caller typing; a loosened
`magnitude` with a mechanism-gated interpretation is lower-churn. Recommend the
discriminated union for honesty; flag the churn.

---

## Phase 4 — The conduction-graph walk (new gated `ElectricityApi`/`Logic`) + grounding + insulation + potential difference

**Outcome.** A live source imposes a potential; a pure walk over the
**conductive-contact graph** (containment / resting-on-surface / co-immersion
in a shared conductive pool) with the room's `Floor` as ground computes
**current-through-each-bridged-body** by conductance-to-ground division, and
inflicts each accordingly. Bird-on-a-wire, the one-hand rule, grounding, and
insulation are emergent. This is "the soul."

**Files to add.**
- `lib/electricity/Energized.ts` — **`EnergizedMixin`** (new subsystem folder
  `lib/electricity/`): the source capability. Carries `getVoltage():
  Quantity<'V'>` and marks a node **held at potential** (the generalizable seam
  — the deferred grid's wall socket and the magic Lightning bolt compose the
  same mixin). Registered in the `Mixins` roster + `MixinApi.isEnergized`.
- `api/electricity.ts` — **`ElectricityApi`** (thin gated forwarding shell,
  ends with `SecurityApi.decorateApiClass`). Surface:
  - `conduct(source: Stuff & Energized): ConductionOutcome[]` — the event
    resolution: walk the graph from the source, collect `{victim,
    currentThrough}`, call `ConditionApi.inflict({mechanism:'shock', current})`
    per victim (the `Audible.emit`/`AudienceGather.gather` precedent).
  - `currentThrough(source, victim): Quantity<'A'>` — the probe (multimeter /
    tests / analyze) without inflicting.
  - `pathToGround(node): boolean` / `groundNodeFor(node): Stuff | null` —
    grounding legibility.
- `obj/api/ElectricityLogic.ts` — **`ElectricityLogic extends ApiLogic`**
  (registered `/obj/api/electricity`, gated
  `FromModule('/api/electricity#ElectricityApi')`, `@internal`,
  `@Unshadowable`). The walk in **module-private free functions**:
  - `buildConductiveGraph(sourceLoc)` — nodes = Stuff in scope + the `Floor`
    (ground); edges from three relations: **containment**
    (`Container`/`Containable` via `ContainmentApi`), **resting-on-surface**
    (`restingOn`/`Surfaced`, incl. the `Floor`), **co-immersion** (two things
    whose feet/contents share the same `Floor` surface-bulk pool when that
    pool's `Material` conducts). Each edge carries `contactResistance`.
  - `resolvePotentials(graph, source)` — connected-to-source = live
    (`source.getVoltage()`), connected-to-ground (`Floor`) = 0 V, else floats.
    **Computed at resolution time, never stored.**
  - `divideCurrent(graph)` — for each body bridging a potential difference, `I
    = ΔV / R_path` where `R_path = bodyResistance(wet) +
    seriesResistanceOfCoveringStack(...) + edge series`, divided by
    conductance-to-ground (**simple conductance division + dials, D1**). A body
    with **no** path to ground (or an insulator breaking it) gets **zero
    current** (bird-on-a-wire / insulated boots / dry step).
  - `MAX_NODES`/`visited` cycle guard mirroring `AudienceGather`.

**Files to change.** `lib/mixin.ts` (`Mixins` roster) + `api/mixin.ts`
(`MixinApi.isEnergized`); `config/app-settings.yaml` + `AppSettingKeys`
(`electricity.division.*`, `electricity.pool.minConductivityForBridge`,
grounding dials).

**Tests (fixtures, no combat/world needed).** Two bodies in a conductive
`Floor` pool with a live source bridged in → **both** take current; a body on
a **dry/insulated step** (or in rubber-soled boots) → **zero** current
(grounding/insulation counterplay); **bird-on-a-wire** — a body touching only
the live node with no ground path → zero current; **potential difference** —
same-potential contacts → no current, different-potential → current.
`pathToGround` reflects the insulator break.

**Risk/decision.** Co-immersion detection must be **sync** (the walk is sync,
like `AudienceGather`) — read the `Floor` surface-bulk field directly, don't go
async through `BiomeApi`. The graph must generalize additively (a wire = a
high-conductivity edge, a second source = another live node) — **do not
hardcode single-source**.

---

## Phase 5 — The armor inversion (emergent) + wet-skin (weather-driven)

**Outcome.** A plate-armored body takes **more** current than an unarmored one
(metal is a low-resistance series path); a rubber/leather-clad body takes
**less** — falling out of `seriesResistanceOfCoveringStack`, with **no**
`isElectrical` narrowing. A **wet** body takes markedly more than a dry one,
driven by rain/immersion.

**Files to change.**
- `obj/api/ElectricityLogic.ts` (`divideCurrent`): fold the covering stack's
  **series resistance** into `R_path` — read the body's worn `Constructed`
  layers via the same `resolveCoveringStack` the mechanical path uses (summed
  as resistance). Metal armor's near-zero series R barely raises `R_path`;
  rubber's large series R collapses the current. Pure conductivity reading —
  the inversion is emergent.
- Wet-skin (ambiguity #2, recommend derived): an `isWet(body)` predicate —
  true iff co-immersed in a conductive pool OR in a SkyExposed scope under
  active `rain` (`WeatherApi`); passed as the `wet` flag into `bodyResistance`.
  Nothing stored. Stored-gauge is the flagged upgrade.

**Tests.** Plate breastplate body vs bare body under identical source/graph →
plate current **>** bare (the inversion, an acceptance criterion); rubber-clad
→ current **<** bare; wet body (in-pool or under seeded rain) → current **>**
dry (~ the wet factor); rubber-soled + plate — the boots still break the ground
path (insulation dominates).

**Risk/decision.** "Metal spreads current across the body → lower protection"
is honestly a *distribution* effect; v1 renders it as **lower series R → higher
through-current** (the observable criterion), without multi-site entry/exit
distribution.

---

## Phase 6 — Reconcile-on-read "being-shocked" sustain + tetany

**Outcome.** A persisting closed circuit becomes a **being-shocked condition**
that integrates current×time **lazily on read** (harm-bleed idiom,
presence-frozen), clears when the circuit breaks, and **tetany** sustains the
circuit ("can't let go") — self-reinforcing until contact breaks.

**Files to add/change.**
- `lib/vitals/Condition.ts`: add the third condition kind (ambiguity #3) —
  `SustainedShock { kind:'shock', current: Quantity<'A'>, tickedAt?, source?:
  string, sites: string[] }`; widen `ActiveCondition = Trauma |
  AfflictionRecord | SustainedShock`.
- `seeds/lib/electricity/conditions/being-shocked.yaml` and `.../tetany.yaml` —
  `/lib/vitals/Condition` Ideas (the asphyxiation/hypothermia seed shape:
  `resolution.by: circuit-broken`, `observableSigns: [rigid, jerking,
  teeth-clenched]`). Tetany's disarm/can't-release rides the volition gate (the
  hypothermia "gates volitional verbs" precedent).
- `lib/vitals/Vitals.ts` (`reconcileConditions`): extend the existing
  reconcile-on-read (reuse its first-touch/linkdead/far-past machinery
  verbatim) to integrate `SustainedShock` — accrue current×elapsed as contact
  `burn` severity and (Phase 7) drive `heartRate`. **Re-verify the circuit
  still closed** on reconcile (cheap: still co-immersed / source still live /
  tetany present) via a narrow `ElectricityApi.currentThrough` probe; if broken
  (or below let-go and no tetany), `relieve` the record. Tetany → circuit held
  closed regardless of volitional attempts.
- `obj/api/ElectricityLogic.ts` (`conduct`): on a mid/high current, afflict the
  `being-shocked` `SustainedShock` (event → sustain hand-off) and, at the
  tetanic band, afflict `tetany` (paralysis).
- Volition gate: tetany prevents `release`/`unwield`/`drop`/movement (a
  weaponizable disarm) — wire through the existing consciousness/volition gating
  the thermal/vitals conditions use.

**Tests.** Standing in the live pool → a `being-shocked` record accrues burn
severity on successive reads as a **manual world clock** advances; stepping out
(source dies / pulled free) → record cleared; **presence-freeze** — a linkdead
body integrates nothing across the gap; **tetany** — with tetany present, a
`release`/move attempt fails and the circuit keeps accruing until tetany is
externally cleared.

**Risk/decision.** Re-walking the whole graph on every read could be costly —
store enough on the record to cheaply re-verify (source path + contact sites),
full-walk only on the event (`conduct`). The union widening touches shared
code.

---

## Phase 7 — The vitals electrocution death seam (the undriven `heartRate`)

**Outcome.** A sufficient sustained/high current drives `heartRate` to
fibrillation → arrest → **death with `cause = 'electrocution'`**, via the
vitals seam (`setCauseOfDeath` + `setLifecycleState('dead')`), **never**
`StuffApi.destruct`. A mid current inflicts tetany/`paralysis` (the disarm).
This **drives the previously-undriven `heartRate` death seam**.

**Files to change.**
- `lib/vitals/Vitals.ts`:
  - `getVitalSign` (line ~302): add the drive hook `if (sign === 'heartRate')
    this.reconcileConditions();` — the read that arms the seam (mirrors the
    `bloodVolume` line).
  - `reconcileConditions` shock branch: at the fibrillation current band,
    disrupt `heartRate` (drive `_heartRate` toward/below `survivableMin` = 30
    bpm → arrest); when arrested and not already dead,
    `setCauseOfDeath('electrocution') + setLifecycleState('dead')` (the
    `exsanguination` block's exact shape). `getConsciousness()` already reads a
    failing body as unconscious → the waypoint falls out for free.
- `lib/electricity/` current-band table: `imperceptible → tingle → let-go →
  tetany(paralysis) → fibrillation(arrest)`, thresholds from `electricity.*`
  dials (let-go ≈ 10 mA, fibrillation ≈ 100 mA).

**Tests (through the vitals seam).** High sustained current + advancing world
clock → `heartRate` falls to arrest, `getLifecycleState()==='dead'`,
`getCauseOfDeath()==='electrocution'`; mid current → `paralysis`/tetany, no
death, disarm holds; below-let-go → tingle only. **Death ≠ destruction** —
assert `dead` but not destructed.

**Risk/decision.** The `heartRate` drive hook must not perturb existing
`heartRate` reads (combat, char-gen) — the reconcile is a cheap no-op when no
`SustainedShock` is active. The `_reconcilingConditions` guard covers
reentrancy.

---

## Phase 8 — The two sources + the flooded-room demonstrator

**Outcome.** A **stun baton** (`Wieldable`, delivers shock on hit) and the
**flooded room with a downed live wire** (the reachable primary demonstrator)
exist and teach the whole model with no magic; the pool hazard is
**faction-blind** (hits everyone bridged, allies included).

**Files to add.**
- `lib/electricity/LiveWire.ts`: a `Thing` composing `EnergizedMixin`
  (`getVoltage()` ≈ 120–240 V) — the downed wire. Optionally a `switch`able
  live/dead state (reuse `SwitchableMixin`).
- `domain/lounge/FloodedCell.ts` (mirror `GlassAlley.ts`): a one-off `Location`
  subclass (Singleton + PostRegistration + Populates + Exitable), with a
  `Floor` whose **surface-bulk** is water (the pool), a `LiveWire` in the water,
  a **dry insulated step**, and **rubber boots** on offer. Trigger = the
  movement/presence hook (`onEntered` → `ElectricityApi.conduct(wire)`).
  Class-constant config, calls the Api (never `afflict`). + its seed + a
  reachable exit.
- `seeds/domain/eternal/arms/stun-baton.yaml`: a `Weapon`/`Wieldable`
  composing `EnergizedMixin` (taser ≈ 50 kV at low mA); on a landed hit it
  imposes a potential at the contact and calls `ElectricityApi.conduct` (routes
  through the walk → `inflict(shock)`, **not** the mechanical fold). Delivers
  tetany/disarm at the mid band; low-lethal.
- (Optional) `lib/electricity/ElectricEel.ts` — a creature source, if cheap.

**Files to change.** Combat wiring for the baton's on-hit → `conduct` (the
`CombatLogic` consequence seam routes to `ConditionApi.inflict`; the baton's
shock consequence routes to `ElectricityApi.conduct` instead).

**Tests.** `domain/lounge/__tests__/FloodedCell.integration.test.ts` (the
GlassAlley template): walk a barefoot wet body into the flooded cell → shocked;
a body on the dry step or in rubber boots → **unharmed** (counterplay); **two
allied bodies** in the pool both take current (**faction-blind**). Baton test:
a landed hit delivers shock + tetany/disarm in combat.

**Risk/decision.** The baton delivering through the graph (not a direct
`inflict`) is the honest unification but adds a combat→electricity hop; keep
the combat mechanical path untouched. Confirm the co-immersion edge reads the
`Floor` surface-bulk sync.

---

## Phase 9 — Legibility (`analyze` + pips + multimeter) + dials consolidation + the subsystem doc

**Outcome.** `analyze` reveals conductivity / resistance / path-to-ground
**bands** and the **raw V/A/Ω on measurement** (the multimeter); pips render
the armor inversion; a live-ness sensory cue (hum/ozone); a
`check-does-nothing`-style lint flags a shock-inert construction; all
`electricity.*` dials are documented; `docs/subsystems/electricity.md` exists.

**Files to add/change.**
- `cmd/perception/analyze.yaml` + `obj/command/perception/AnalyzeElectricalController.ts`
  (the `AnalyzeResponseController` pattern) — point at a material/creature →
  conductivity/resistance/path-to-ground **bands**, and raw
  `Quantity<'V'|'A'|'Ω'|'S/m'>` numbers on measurement (banding is
  presentation, not security). Reads
  `ElectricityApi.currentThrough`/`pathToGround` +
  `Material.getElectricalConductivity`.
- `lib/material/Constructed.ts` (`responsePipsAugmenter` sibling): a
  **shock-column** pip contribution rendering the inversion (a steel
  breastplate near-empty — "conducts, barely protects"). Reads the
  series-resistance/conductivity read, not `previewBand`.
- Sensory cue: a live source contributes a hum/ozone `Audible`/`Smell` so
  live-ness is perceivable but the *hazard's* live-ness stays opaque until
  probed.
- `scripts/check-does-nothing.ts` (extend, the `check-gate-strings`
  standalone-WARN precedent): flag a `Constructed`/`Material` inert on the shock
  channel — a pure `doesNothing`-style predicate, fixture-tested.
- `config/app-settings.yaml` + `AppSettingKeys`: final `electricity.*` section
  with real-world-grounded literals + a comment cross-referencing the doc.
- `docs/subsystems/electricity.md`: the subsystem doc — the honest Ohm's-law
  core, the channel-but-circuit resolution, the conduction graph + the
  `Audible`-walk reuse, grounding/insulation, the armor inversion, wet-skin,
  the reconcile-on-read sustain + tetany, the electrocution death seam, the
  sources + demonstrator, legibility, the dials, and the **named deferred
  seams** (magic Lightning, the power grid as *this same physics scaled up*,
  AC/DC, Joule→fire) with the generalizable-seam note.

**Tests.** `analyze electrical` on a material → correct bands + raw numbers on
measurement; the shock pip column renders the inversion (steel near-empty,
rubber full); the lint flags an inert construction (fixture); a live source's
hum/ozone is perceivable. Doc presence is an acceptance criterion.

**Risk/decision.** The multimeter's raw-number reveal is the inquiry-slate seam
(a discoverable relationship), **not** the discovery loop — honest numbers only,
don't build predict-verify here.

---

## Cross-cutting constraints honored (checklist for review)

- **No new module categories** — `EnergizedMixin` (a `lib/electricity/`
  mixin), `ElectricityApi`/`ElectricityLogic` (gated Api + `*Logic` singleton),
  value-objects in `lib/electricity/`, controllers, seeds, dials. No
  free-floating helpers.
- **`inflict` branches on channel** — shock intercepted before the covering
  fold; mechanical + passthrough paths byte-identical (Phase 3).
- **Honest, scale-invariant formulas** — `I=V/R`, `P=I²R`, real magnitudes
  (copper 6e7 S/m, salt water 5 S/m, dry-skin 100 kΩ, mains 120–240 V, taser
  50 kV, let-go 10 mA, fibrillation 100 mA); generalizable seams (source
  imposes potential, wire = conductive edge, fixture held at potential) so the
  grid plugs in additively — no hardcoded single-source.
- **Real quantities under a banded surface** — V/A/Ω/S·m real, bands in
  presentation, raw numbers only on `analyze`.
- **Reconcile-on-read, presence-frozen, no tick** — the being-shocked sustain
  rides `reconcileConditions`'s presence-freeze machinery.
- **Death ≠ destruction** — electrocution via the vitals seam.
- **Armor inversion emergent** — pure conductivity/series-resistance reads, no
  `isElectrical` narrowing.
- **Legibility mandatory** — `analyze` + pips + the does-nothing lint.
- **Conductivity is content** — roster values in seeds/packs.
- **Out of scope, seams left open** — magic Lightning, power grid, AC/DC,
  Joule→fire all named/deferred; `EnergizedMixin`/graph/units generalize
  additively.

## Decisions — all APPROVED (2026-07-15)

All six are locked: #1 resolved to the base-library pack; #2–#6 approved as
the planner recommended (derived wet-skin; `SustainedShock` union kind;
`ElectricityApi`/`ElectricityLogic`; `MECHANICAL_CHANNELS` subtype;
discriminated `InflictSpec`).


1. Starter Material roster **location** — **RESOLVED**: the
   `@saxonberg/content-base-library` content pack
   (`packages/content/base-library/content/lib/material/**` + the pack's
   `content/quantity/quantity-tags.yaml`), not in-tree seeds.
2. Wet-skin: **derived resolution-time** (recommended) vs **stored drying
   gauge** (ambiguity #2).
3. Being-shocked: **new `SustainedShock` condition kind** widening the closed
   `ActiveCondition` union (recommended) vs `AfflictionRecord` + side-table
   (ambiguity #3).
4. New Api name **`ElectricityApi`/`ElectricityLogic`** (recommended umbrella)
   vs `ConductionApi` (ambiguity #4).
5. `Channel` widening: **`MECHANICAL_CHANNELS` subtype** to keep `Construction`
   mechanical-only (Phase 2 decision).
6. `InflictSpec`: **discriminated union** (energy vs current) vs loosened
   magnitude (Phase 3 decision).

## Cross-references

- Requirements: [electricity-requirements.md](../requirements/electricity-requirements.md)
- Slate: [electricity-slate.md](../slates/builds/electricity-slate.md)
- Subsystems: materials-response, harm, vitals, perception (`AudienceGather`),
  bulk (`Floor`), quantities, app-settings.
