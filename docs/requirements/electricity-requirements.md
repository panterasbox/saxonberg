# Electricity — requirements

The electricity subsystem adds **`shock` as a materials-response channel**
and the **conduction-spread** that makes it electricity and not a reskinned
damage type: an honest Ohm's-law model (`I = V/R`, *current* is what harms)
resolved over a conductive-contact graph with a ground path, so a shock
flows through water, betrays metal armor, and spares the insulated. It is
the prerequisite subsystem for the **Lightning** frontier noun in
[capability-magic Part IV](../slates/deferred-rpg/capability-magic-slate.md),
but is built for its own sake — hazards, stun weapons, and electrocution —
with **magic deferred**. Seeded by
[electricity-slate.md](../slates/builds/electricity-slate.md); consumes
[materials-response](../subsystems/materials-response.md),
[harm](../subsystems/harm.md)/[vitals](../subsystems/vitals.md),
[perception](../subsystems/perception.md) (the `Audible` gather-walk),
[bulk](../subsystems/bulk.md), and [quantities](../subsystems/quantities.md).

## Goals

- **A `shock` channel** in the closed materials-response `Channel`
  vocabulary — delivered by sources, resolved against bodies, failing tissue
  through the same channel surface as edge/point/blunt.
- **Electrical conductivity as a real `Material` property**
  (`Quantity<'S/m'>`), authored for a starter roster (a metal, salt water,
  fresh water, wood, rubber/leather, flesh) — the height the shock model
  reads. New `V` / `A` / `Ω` / `S·m` quantity units.
- **Ohm's-law resolution.** A shock's harm is the **current through the
  body** = the voltage across it ÷ the resistance of its path — *not* the
  mechanical energy-attenuate fold. It is the current that harms, not the
  voltage.
- **Full potential-difference model.** A shock requires **bridging two
  points at different potential**, so bird-on-a-wire, the one-hand rule, and
  insulated positioning are *true and emergent*, not scripted.
- **Conduction-spread.** A shock from a source distributes current across the
  **conductive-contact graph** (edges: containment / resting-on-surface /
  co-immersion in a shared conductive pool), dividing toward ground; every
  bridged body takes the current that actually passes through it and is
  inflicted accordingly. Reuses the `Audible` `AudienceGather`-over-a-graph
  pattern.
- **Grounding via the room's modeled `Floor`.** Standing on it grounds you
  unless an insulator (rubber boots, an insulating floor, a mat) breaks the
  path — the counterplay.
- **The armor inversion, emergent.** Metal armor is a low-resistance path →
  it *conducts* (near-zero protection, spreads current across the body);
  leather/rubber adds series resistance → real protection. Falls out of
  conductivity; **not** a special case.
- **Wet skin lowers body resistance** (~100×), making a wet body markedly
  more vulnerable — with **weather/rain as the driver**.
- **Event-triggered + reconcile-on-read sustain.** Contact fires one
  resolution; a *persisting* closed circuit is a **"being-shocked"
  condition** integrating current × time lazily on read (the harm-bleed
  idiom, presence-frozen), cleared when the circuit breaks. **Tetany
  sustains the circuit** ("can't let go").
- **Vitals coupling.** Current bands drive outcomes: perception (tingle) →
  **let-go / tetany** (a `paralysis` condition that prevents release — a
  weaponizable disarm) → **fibrillation** (disrupts `heartRate` → arrest,
  **driving the previously-undriven `heartRate` death seam**,
  `cause = 'electrocution'`). Local `burn` trauma at contact sites.
- **Faction-blind conduction** — the current is indifferent to allegiance
  (a pool hazard hits everyone bridged to it), demonstrable without magic.
- **The v1 demonstrable vertical (mundane sources):** a **flooded room with
  a downed live wire** (the reachable GlassAlley-style demonstrator, primary)
  + a **stun baton** (`Wieldable`, delivers shock on hit — the combat
  toe-hold).
- **Legibility.** `analyze` (the multimeter) reveals conductivity /
  resistance / path-to-ground bands and the raw V/A/Ω on measurement; pips
  render the armor inversion; a sensory live-ness cue (hum / ozone).
- A subsystem doc **`docs/subsystems/electricity.md`** exists.

## Non-goals

- **Magic `Create·Lightning`** — deferred to the magic build. Chain
  lightning, the caster-in-the-graph, and the magic-side of faction-blind
  friendly-fire arrive *free* then (a spell is just another source imposing
  a potential into the same graph).
- **Power / circuits as infrastructure** — no current-flow-over-wires, no
  grid, no generation/distribution, no devices-that-draw-power, no
  charge/capacitance state. Deferred. **But unified, not forked:** when it
  lands it is *this same Ohm's-law physics scaled up and aggregated* (one
  law, two scales), never a second "power" abstraction — so v1 must leave
  the seams (see Surface decisions + Constraints), because real students
  expect the wall socket and the lightning bolt to obey the same rules.
- **AC vs DC** — a real distinction (AC fibrillates, DC throws), but a v1
  non-goal; v1 ships a single `shock`.
- **Joule → fire** — the first *post-v1* coupling (current heats water,
  ignites oil/gas — the bridge to the Fire noun). Named, not built.
- **cold → ice, humidity, hand-chains** (holding-hands contact edges), **and
  full Kirchhoff mesh** current-division — deferred.
- **The inquiry discovery loop** — v1 exposes the honest numbers via
  `analyze`; the *discover-Ohm's-law-by-prediction* loop lands with
  [inquiry-slate](../slates/builds/inquiry-slate.md). Electricity provides
  the seam (a discoverable relationship), not the loop.

## Surface decisions

### Temporal model — event-trigger + reconcile-on-read sustain
"Discrete pulse vs continuous current" is a false binary in a text/event/
command medium. Contact is an **event** (one conduction-walk resolution); a
persisting circuit becomes a **condition reconciled on read** (harm-bleed
idiom), never a tick. This is the medium's native grain and the codebase's
established answer to continuous physics.

### Full potential-difference, not path-to-ground
A shock triggers on a potential *difference* across two contact points.
Chosen because honesty and emergence point the same way — it makes the
counterintuitive teachable cases (bird-on-a-wire, one-hand rule) true and
discoverable. **Potential is computed at resolution time** (walk from
source: connected-to-source = live, connected-to-ground = 0), *not* stored
as an ambient field — so live-ness is invisible except via the sensory cue /
`analyze`.

### Circuit resolution, not the energy-attenuate fold
`shock` uses the channel *vocabulary* but resolves by `I = V/R`. The
covering stack **contributes series resistances** to the path rather than
subtracting energy per layer; the walk computes current-through-victim
upstream, so the shock path **skips the covering-stack fold** inside
`inflict` (see Constraints).

### Current-division fidelity — simple + dialled (D1)
Divide by conductance-to-ground with tunable `electricity.*` dials, **not** a
full Kirchhoff mesh solve. Honest-enough per the banding philosophy;
upgradeable if a consumer needs it.

### Contact-graph edge set (D2)
v1 edges: **containment** (contents ↔ container), **resting/surface** (thing
↔ the surface it rests on, incl. `Floor`), and **co-immersion in a shared
conductive bulk pool.** Hand-chains, damp-not-pooled floors, and humidity
are deferred.

### Ground = the room's `Floor`
Reuse the modeled `Floor` as the ground node; an insulator on the path
(footwear material, floor material, a mat) breaks it.

### Wet skin in v1 core (D4-adjacent), weather-driven
A wet body reads lower resistance; the coupling is core (it is the real
reason water is deadly). Rain is the driver — electricity neighbours
[weather](../slates/tails/weather-slate.md), which ships just before it.

### Salt vs fresh water (D4)
In — free (two `Material` conductivity values) and a cheap teachable.

### Joule → fire out of v1 (D3)
The stretch coupling; explicitly deferred to the first post-v1 wave.

### v1 vertical = hazard + baton
The flooded-room live-wire hazard (primary demonstrator) + the stun baton
(combat toe-hold); mundane sources only.

### Unified physics across scales — real students
The deferred power grid is **this model scaled up and aggregated, one
consistent Ohm's law**, not a forked "power" abstraction — because we will
have real students, and an EE major must not find the wall socket and the
lightning bolt obeying different rules. This forces two v1 commitments (see
Constraints): **real-world-grounded magnitudes** (so the multimeter reads
numbers consistent with coursework) and **honest scale-invariant formulas**
(`I = V/R`, `P = I²R`), plus **generalizable seams** — a source *imposes a
potential*, a wire is *a conductive edge*, a fixture is *held at potential*
— so the grid plugs in additively.

## Constraints

- **Module categories** — no new module type. The conduction resolution is a
  **gated `Api` + `*Logic` singleton** (the `ConditionApi`/harm precedent);
  the response math extends the existing `MaterialApi` surface where it fits
  (the materials-response home). No free-floating helper modules. Final harm
  routes through the shipped **`ConditionApi.inflict`** door.
- **`inflict` branches on channel** — mechanical channels fold through the
  covering stack; **`shock` does not** (path resistance is resolved upstream
  in the conduction walk, which then calls `inflict` with the resolved
  current). The planner must preserve the existing mechanical path
  byte-identically and add the shock branch beside it.
- **Real quantities under a banded surface** — V/A/Ω/S·m are real
  `Quantity`s; players see bands, and raw numbers only on measurement
  (`analyze`). Banding is presentation, never security
  ([banding-presentation-not-security]). Authors author *concepts*, never
  numbers; every magnitude is an `electricity.*` **AppSettings** dial with a
  seeded-literal fallback (the materials-response shape-vs-magnitude split).
- **Real-world-grounded magnitudes (the student bar)** — the seeded literals
  and authored Material/source values are **actual physical values**
  (e.g. copper ≈ 6×10⁷ S/m, salt water ≈ 5 S/m, dry-skin ≈ 100 kΩ / wet ≈ 1
  kΩ, mains ≈ 120–240 V, a taser ≈ 50 kV at low mA, let-go ≈ 10 mA,
  fibrillation ≈ 100 mA), not gamey round numbers — so a student's multimeter
  reads what their coursework predicts. This is the unified-physics bar.
- **Honest, scale-invariant formulas** — resolution uses real `I = V/R` and
  `P = I²R` (the loss/heat term), with **no scale-specific fudge**, so the
  shock, the baton, and the deferred substation are one formula set. The v1
  abstractions must **generalize additively** to the grid — a source
  *imposes a potential*, a wire is *a high-conductivity edge* in the same
  graph, a fixture is *held at potential*; the planner must not hardcode
  "single source" or "physical-contact-only edges" in a way the grid can't
  extend.
- **Reconcile-on-read, presence-frozen, no tick** — the "being-shocked"
  sustain rides the vitals condition system and integrates on the read path
  (the metabolism / thermal / harm precedent); it must freeze under absence
  (linkdead / logout) and re-arm on hydrate.
- **Death ≠ destruction** — electrocution stamps `setCauseOfDeath` +
  `setLifecycleState('dead')` via the vitals seam; never routes through
  `StuffApi.destruct`.
- **The armor inversion is emergent, not narrowed** — no `ArmorMixin`-style
  `isElectrical` check; electricity reads `ConstructedMixin` / `Material`
  conductivity exactly as materials-response reads hardness/toughness.
- **Legibility is mandatory** (materials-response Settled-11) — `analyze` +
  pips ship *with* the model; a construction/material that is inert on the
  shock channel is a lint-flaggable smell (reuse the `check-does-nothing`
  shape).
- **Conductivity is content** — the starter Material roster's values live in
  seeds/packs, not code; the electricity engine ships the axis + the seam.

## Acceptance criteria

- `shock` is in the `Channel` vocabulary; a source delivering shock produces
  the right trauma/conditions. Tests cover the Ohm's-law resolution.
- `Material` carries `electricalConductivity`; a starter roster (metal /
  salt water / fresh water / wood / rubber / flesh) is authored. `V/A/Ω/S·m`
  units round-trip through the marshaller.
- In the flooded-room demonstrator, a shock hits **everyone bridged** through
  the water + `Floor`; a character on a dry insulated step or in rubber boots
  is **unharmed** (grounding/insulation counterplay observable and tested).
- A **plate-armored** body takes **more** current than an unarmored one; a
  **rubber-clad** one takes less (armor inversion observable and tested).
- A **wet** body takes more than a dry one (wet-skin coupling tested).
- **Sustained** contact (standing in the pool, or tetany) accrues harm on
  read/over game-time and **clears when the circuit breaks**; tetany prevents
  release (reconcile-on-read sustain tested).
- A sufficient current drives `heartRate` to arrest → death with
  `cause = 'electrocution'`; a mid current inflicts tetany/`paralysis` (a
  disarm). Both tested through the vitals seam.
- The **stun baton** delivers shock on hit in combat; a **pool hazard** is
  faction-blind (hits allies bridged to it) — both observable.
- `analyze` on a material / creature reveals conductivity / resistance /
  path-to-ground bands and raw numbers on measurement; pips render the armor
  inversion.
- The **flooded-room + live-wire** room is reachable and teaches the whole
  model with **no magic**.
- A subsystem doc **`docs/subsystems/electricity.md`** exists.

## Cross-references

- **Seeding slate:** [electricity-slate.md](../slates/builds/electricity-slate.md)
- **Consumed subsystems:** [materials-response.md](../subsystems/materials-response.md)
  (channel vocab; the response-fn home), [harm.md](../subsystems/harm.md) /
  [vitals.md](../subsystems/vitals.md) (`inflict` door, `heartRate` death
  seam, conditions), [perception.md](../subsystems/perception.md) (the
  `Audible` gather-walk), [bulk.md](../subsystems/bulk.md) (water pools,
  `Floor` surface-bulk), [quantities.md](../subsystems/quantities.md) (new
  units), [app-settings.md](../subsystems/app-settings.md) (dials).
- **Couplings / neighbours:** [weather-slate.md](../slates/tails/weather-slate.md)
  (rain → wet-skin driver), [thermal.md](../subsystems/thermal.md) (Joule→fire,
  deferred).
- **Downstream consumers:** [capability-magic Part IV](../slates/deferred-rpg/capability-magic-slate.md)
  (the Lightning noun), [inquiry-slate.md](../slates/builds/inquiry-slate.md)
  (Ohm's law as a discoverable law — seam only).
- **Antipatterns as sieve:** [antipatterns.md](../antipatterns.md) (destroy
  via `StuffApi.destruct`; go through the Api layer; no invented modules).
