# Fire & combustion — requirements

The next **frontier-physics** build: **combustion as a driver** — the Fire
channel the [capability-magic](../slates/deferred-rpg/capability-magic-slate.md)
Fire school will actuate, built for its own sake (the electricity →
mundane-`Create·Lightning` precedent, the storms → mundane-storm-lightning
precedent). It ships the *whole* high-temperature physics system in one
build — the combustion driver, the full Andy-Weir real chemistry, and **all
the high-heat physics the crafting system will later stand on** (phase
change / melting, the furnace family, an inert heat-as-crafting-control
seam) — stopping at exactly one line: **the crafting recipes themselves**.
Seeded by [fire-combustion-slate.md](../slates/builds/fire-combustion-slate.md);
consumes [thermal.md](../subsystems/thermal.md) (passive `Thermal` + the
shipped `Campfire` furnace + the deferred phase-change shape),
[materials-response.md](../subsystems/materials-response.md) (the reserved
`heat` `Channel` this build lands), [harm.md](../subsystems/harm.md)
(`ConditionApi.inflict` + the `burn` trauma), [weather.md](../subsystems/weather.md)
(the `WetMixin` gauge fire reads; the presence-gated boundary fan-out the
fire tick mirrors), [respiration.md](../subsystems/respiration.md) (the
`breathableMedia` + laid-unread `contaminant` seam smoke/CO land on),
[bulk.md](../subsystems/bulk.md) (fuel + smoke-emission + molten-liquid),
and [crafting.md](../subsystems/crafting.md) (the downstream consumer of the
heat-control + phase-change substrate).

## Goals

- **Combustion driver** — a `Combustible` capability on matter (real
  `autoignitionTemperature` / `heatOfCombustion` + a char residue) and a
  `Burning` active state: flammable matter driven past its (wetness-adjusted)
  ignition point **ignites**, **burns** (consumes fuel, feeds its own heat
  back, radiates, emits light + smoke), and **self-extinguishes** the instant
  any fire-triangle leg (fuel / oxygen / heat) fails. Owned by a gated
  `FireApi` / `FireLogic`, `ignite` / `douse` verbs.
- **Ignition is a derivable energy balance** — "will it catch?" is real
  accounting over shipped numbers: heat delivered must exceed the fuel's
  thermal inertia (`mass × specificHeat × ΔT` to reach its ignition point)
  **plus** the latent heat to boil off any water it holds (the `WetMixin`
  saturation). Thermal inertia gates it (a match won't light a beam); a wet
  object won't catch until dried — the *wet-firewood* the weather tail
  deferred, now **derived**.
- **Real combustion chemistry (the teach-the-lesson cut)** — combustion is
  **complete** with enough air (hot, clean) and **incomplete** when starved
  (cooler, sooty smoke + **carbon monoxide**, a real toxin on the
  respiration/toxicity path). Flame temperature shifts with air supply, so
  **ventilation and a bellows are reasoned mechanics** (crack a door → hotter
  + cleaner; seal the room → smoke, CO, self-smother). An enclosed fire kills
  by **CO, not flame**. *(No flammability-limits / LEL-UEL model — that's the
  over-simulation line, out of scope.)*
- **Spread** — a burning object heats adjacent flammables (thermal radiant +
  the containment/contact graph); the dry ones catch; fire propagates
  **room-to-room through OPEN boundaries** (a closed door / seal is a
  firebreak); wet objects resist. Driven by a **presence-gated fire tick** (a
  game-time `ScheduleApi.recurring` fan-out over occupied scopes — the
  weather-boundary / storm-strike precedent); an unwatched fire **freezes**.
- **Three extinguishers** — **water/wet** (a `douse` bulk-pour + the wetness
  gauge remove heat), **smother** (a sealed container / no air removes O₂),
  **fuel-starvation** (it burns to embers on its own).
- **Consequences via shipped seams** — touch-a-fire = burn
  (`ConditionApi.inflict` through the **`heat` channel**); a smoke-filled
  room asphyxiates + CO-poisons (respiration); firelight (`LightSource`); a
  wet body/object in a burning room dries fast (thermal + wetness reads).
- **The materials-response `heat` channel lands** — heat delivered resolves
  through the covering stack into a tissue `burn` (severity + type), the same
  `resolveTrauma` shape the mechanical channels use, **retiring the
  `'thermal'` magnitude-only passthrough**. No parallel fire-damage path.
- **Phase change (the high-heat materials physics)** — heat driven past a
  material's `meltingPoint` **flows it to a `Bulkable` liquid** (a
  latent-heat plateau at the transition — the reserve-clamp), and the reverse
  **solidifies** a liquid below its melting point (a casting) and **boils** a
  liquid past its boiling point to a gas (steam). Bidirectional; unlocks the
  deferred **Water** ice/steam for free. Homed in `lib/thermal/` (heat drives
  it — a hearth, the sun, or a fire; not fire-specific).
- **Sustained heat sources — the furnace family** — `Furnace`-family objects
  (forge / kiln / oven), `Combustible`-fed sources holding a real,
  **fuel-and-air-driven** temperature (charcoal hotter than wood; a bellows
  hotter still). The shipped `Campfire`'s pinned-hot-while-fuelled pattern
  generalized.
- **The inert heat-as-crafting-control seam** — a built, tested
  **`ThermalApi.reachableHeatFor`** read (the maximum sustained temperature
  reachable from a position — the crafting-reachability precedent), **left
  unconsumed** (no recipe calls it this build), so the future smithing branch
  gates on it with zero retrofit.
- **Real `Material` properties** — `autoignitionTemperature: Quantity<'K'>`,
  `heatOfCombustion: Quantity<'MJ/kg'>`, `meltingPoint: Quantity<'K'>` +
  `latentHeatOfFusion` (and `boilingPoint` + `latentHeatOfVaporization`),
  authored with real figures on the base-library roster.
- **Legibility + the inquiry surface** — bands for the casual player
  (`smouldering / burning / blazing / dying`; air `clear / hazy / choking`);
  `analyze` reads real units (ignition temp K, heat of combustion MJ/kg,
  current temperature, O₂ / CO levels); the observe→predict→verify loops are
  genuine (sealed-room self-smother; wet-log-won't-catch; bellows-runs-hotter).
- **Declarative demonstrators** — a **burning woodshed** (spread +
  wet-resists-fire), a **sealed-room CO death** (the ventilation lesson), a
  **working forge** (a bellows-fed furnace melting a metal past its melting
  point → a pourable liquid — the crafting substrate proven, no recipe).
- **A `fire.md` subsystem doc** covering the combustion driver + the
  high-heat physics; `thermal.md` updated for phase change; `race.md` for the
  new `Material` props.

## Non-goals

- **The crafting recipes** — cooking / smelting / smithing / glassmaking /
  charcoal-burning recipes are the **deferred consumer** ([crafting.md](../subsystems/crafting.md)).
  This build ships the temperature-control seam + phase change + furnaces
  they stand on; **no recipe is built.**
- **Fire as a combat weapon / burning damage-over-time** — combat rides the
  `burn` channel later; not this build.
- **The far economy** — map-scale wildfire, arson as a crime, a fire brigade,
  fire insurance. Named, not built.
- **Vision-obscuring smoke** — smoke → visibility is the weather tail's
  fog→visibility seam; smoke here is a *breathing* hazard only.
- **Cross-room smoke drift** — smoke fills the scope it's produced in; drift
  through boundaries is deferred (the fire tick may pass it later).
- **Flammability limits (LEL/UEL) / a full gas-mixture model** — the
  over-simulation line; the clean complete/incomplete + air-fuel model is the
  cut.
- **The magic Fire school** — the frontier noun; magic actuates this exact
  combustion substrate later ([capability-magic](../slates/deferred-rpg/capability-magic-slate.md)).
- **Electricity `Joule → fire`** — a hot current igniting is a small
  cross-channel combo (electricity's `jouleHeat` → temperature → ignition);
  an optional stretch, not a v1 acceptance criterion.

## Surface decisions

### D1 — Fire cadence: a presence-gated fire tick

Fire advances and spreads on a **game-time `ScheduleApi.recurring` fire
tick** that fans out over **occupied** scopes (the weather-boundary /
storm-strike precedent), advancing each `Burning` object (consume fuel, feed
heat, emit smoke/CO, char) and checking spread to neighbours. An **unwatched
fire freezes** — consistent with the whole presence-freeze substrate, zero
server work in empty rooms, and no offline-arson grief surface. A single
`Burning` object also reconciles-on-read for `analyze` freshness, but the
**tick is the authoritative driver** (spread can't be reconcile-on-read
alone — nothing reads the neighbour to ignite it). Fire state is stored on
the object; the tick + reconcile keep it honest.

### D2 — `Burning` representation

A **`Combustible` capability mixin** (the material coefficients + the marker;
`MixinApi.isCombustible`) + a **`Burning` active state** (stored: ignited-at,
fuel remaining, complete/incomplete flag), driven by the gated `FireApi` /
`FireLogic`. **Fuel is a `Reserve`** (the `Campfire` precedent — added,
depletes at the burn rate, floored = out). Ignition **routes through the
`heat` channel** into `ConditionApi.inflict` for the *harm* to a body, and
into the `Burning` state for the *combustion* of an object — no parallel
path. The gated logic is the single writer of `Burning`.

### D3 — Ignition kinetics: the energy balance, threshold-triggered

Heat delivered raises the object's temperature through the **shipped thermal
reconcile** (`τ = R·C`, mass × specificHeat gating the rate); when its
temperature crosses `autoignitionTemperature` — **raised by the latent heat
of its water** (`WetMixin` saturation) — it **ignites**. So ignition is
instant on the threshold cross, but *reaching* the threshold is the derivable
energy balance (a small flame can't out-heat a big wet log's inertia + water).
No separate "sustained for N seconds" timer — the thermal inertia already
models it.

### D4 — Consumption end-state: fuel drains → char, structural burn-through destructs

Burning drains the fuel `Reserve`; at exhaustion the object stops burning and
**its material transforms to `ash` / `char`** (the Material swap — embers
cool via passive `Thermal`). A **structural** object that burns through
(a door, a rope bridge) **destructs** (`StuffApi.destruct`) — a burned-through
door leaves its opening; content decides the after-state via a
`hasBurnedThrough` seam. The engine ships the char-transform + the destruct;
what a specific burned exit *becomes* is content.

### D5 — Combustion chemistry: complete/incomplete + air-fuel → smoke + CO

The oxygen leg reads the scope's **air supply** (respiration's
`breathableMedia` read + a scope air/O₂ level). The air-fuel ratio drives a
**complete/incomplete** determination: complete → high flame temperature,
minimal smoke; incomplete (starved) → lower temperature + **soot smoke + CO**.
Smoke + CO accumulate as a **scope contaminant** (the laid-unread respiration
`contaminant` seam — its first consumer): the scope's medium becomes
un-breathable (asphyxiation) and CO is a real toxin (the toxicity path). A
**bellows / open boundary** raises the air supply → shifts toward complete →
higher flame temperature (the forge's why). No LEL/UEL (D-non-goal).

### D6 — Spread mechanics: contact + open boundaries, closed = firebreak

Within a scope, a `Burning` object heats **co-located / in-contact**
neighbours (the thermal radiant read + the containment/contact graph the
electricity `conduct` walk models); any crossing their ignition point catch.
**Room-to-room** spread propagates only through **open** exits / boundaries
(a **closed door or seal is a firebreak** — the `Sealable`/`Lockable` read),
never coordinates; `SkyExposed` still gates indoor-uniform vs outdoor-radiant.
The fire tick (D1) runs the spread check.

### D7 — Phase change: melt flows to a `Bulkable` liquid, homed in thermal

Heat past `meltingPoint` **flows the solid's mass into a `Bulkable` liquid**
(molten metal / wax / water), with a **latent-heat plateau** (the
reserve-clamp: temperature holds at the transition while `latentHeatOfFusion`
is absorbed). Reverse: a liquid below its melting point **solidifies** to a
solid Stuff (a casting — pour molten metal into a mould → cools → a cast
object), and past `boilingPoint` **boils** to a gas (steam, a bulk emission).
Bidirectional, **homed in `lib/thermal/`** (heat drives it — a hearth, the
sun, or a fire; not fire-specific), couples to the shipped `Bulkable`
fluids. Unlocks the deferred **Water** ice/steam channel.

### D8 — Furnace generalization

A **`Furnace`-family** (`Forge` / `Kiln` / `Oven`) of `Combustible`-fed
sustained heat sources whose held temperature is set by the fuel's
`heatOfCombustion` + the air-supply ratio (bellows). The shipped `Campfire`'s
pinned-hot-while-fuelled pattern is the seed; the planner decides whether the
`Campfire` refactors onto a shared `FurnaceMixin` or the family composes the
pattern in parallel (a plan-level call — behaviour is identical either way).

### D9 — The heat-as-crafting-control seam: `ThermalApi.reachableHeatFor`, inert

A gated **`ThermalApi.reachableHeatFor(scope|maker)`** read returns the
maximum sustained temperature reachable from a position (the crafting
emergent-reachability principle applied to heat). **Built + tested, consumed
by nothing this build** — the future smithing branch reads it as its
temperature `control` gate with zero retrofit. Homed in `lib/thermal/`
(heat, not fire). Confirmed inert.

### D10 — Naming + homes

- `lib/fire/` — the combustion subsystem: `Combustible` + `Burning`, the
  `FireApi` / `FireLogic` gated pair (`ignite` / `douse` / the tick), the
  `Furnace` family. `FireApi` is the domain noun (parallel to
  `WeatherApi` / `ElectricityApi`, the magic Fire school).
- `lib/thermal/` — the phase-change layer (`Meltable` / phase state + the
  latent-heat reserve-clamp in the thermal reconcile) + `ThermalApi.reachableHeatFor`.
- `lib/material/` — the new `Material` props + the materials-response `heat`
  channel resolution.
- `device` verb category for `ignite` / `douse` (operating a fire), `bulk`
  reuse for the `douse` pour.

### D11 — Magic hook: purely mundane, the seam is the driver itself

No magical-property `Material` field this pass. The **`FireApi.ignite` + the
`heat` channel ARE the seam** the magic Fire school will actuate (inject heat
→ the same combustion physics) — the electricity `conduct` precedent (magic
Lightning will reuse `conduct`). No new inert magic field needed.

## Constraints

- **Presence-freeze, no runaway** — the fire tick is presence-gated (occupied
  scopes only); an unwatched fire does zero work (the weather/metabolism/harm
  discipline). No global tick over every fire in the world.
- **No parallel damage path** — heat-to-body routes through the materials-
  response **`heat` channel** → `ConditionApi.inflict` (the electricity-
  through-`conduct` invariant); combustion-of-object routes through the gated
  `FireLogic`. One writer each.
- **Real Quantities under a banded surface** — ignition temp / heat of
  combustion / melting point are real `Quantity`s; players see bands, raw
  numbers only on `analyze` ([[banding-presentation-not-security]]).
- **Reconcile-on-read + presence-gated tick idiom** — no bespoke timers;
  `ScheduleApi.recurring` (wrapped in `runRoot`) for the tick; the `Burning`
  read path mirrors the harm-wound reconcile.
- **Go through the Api layer** — `StuffApi.create`/`destruct` for the
  transient/char transforms, `ContainmentApi`/`BulkableApi` for the molten
  flow, no direct mechanism calls.
- **No new module categories** — `Combustible` / `Meltable` capability
  mixins in their subsystem folders, `FireApi` gated facade + `FireLogic`
  singleton, the `Furnace` Stuff family, the `Material` additions, declarative
  demonstrator content. Nothing free-floating.
- **Content authored + placed declaratively** — the woodshed / sealed-room /
  forge demonstrators ride `adornments:` / `populates:` / authored fields, no
  imperative construction in hooks (the substation / Weeping-Moor precedent).
- **The crafting seam stays inert** — `reachableHeatFor` is built and tested
  but no recipe consumes it; the non-goal line is enforced.

## Acceptance criteria

- **Ignition energy balance:** a dry flammable object heated past its
  (wetness-adjusted) autoignition point ignites; a **wet** one does not until
  dried; a small flame fails to ignite a high-thermal-inertia object it can't
  out-heat. All tested against real shipped `Thermal`/`WetMixin` numbers.
- **Burning + self-extinguish:** a `Burning` object consumes its fuel
  `Reserve`, radiates heat, emits light + smoke, and **goes out** when fuel
  runs out (→ char/embers), when smothered (no O₂), or when doused (water/wet).
  Each triangle-leg-pulled extinguish tested.
- **Chemistry:** an air-starved fire burns **incomplete** → measurably lower
  flame temperature + soot smoke + **CO**; opening a boundary / a bellows
  shifts it toward **complete** → hotter + cleaner. A **sealed room** fills
  with smoke + CO, **asphyxiates/poisons** an occupant, and **self-smothers**
  as it eats the O₂. Tested end-to-end through respiration.
- **The `heat` channel:** heat delivered resolves through the covering stack
  into a tissue `burn` via `ConditionApi.inflict` (the `resolveTrauma` shape);
  the `'thermal'` passthrough is retired; armor/coverings attenuate heat.
  Tested; byte-compatible where a burn was already produced.
- **Spread:** a burning object ignites adjacent dry flammables and propagates
  **through an open door but NOT a closed one** (firebreak); a wet neighbour
  resists; driven by the presence-gated tick; an **unwatched** scope's fire
  does not advance (presence-freeze). Tested.
- **Phase change:** heat past `meltingPoint` flows a solid to a `Bulkable`
  liquid with a latent-heat plateau; cooling a liquid below it solidifies a
  casting; past `boilingPoint` it boils to gas. Bidirectional, tested; ice→
  water→steam falls out.
- **Furnaces:** a `Forge`/`Kiln`/`Oven` holds a fuel-and-air-driven
  temperature (charcoal hotter than wood; bellows hotter than not); reaches
  smelting heat only with the bellows. Tested.
- **The inert crafting seam:** `ThermalApi.reachableHeatFor` returns the
  reachable max temperature and is **called by no recipe** (grep-verified /
  test-verified inert).
- **Legibility + inquiry:** `analyze` shows real units (K, MJ/kg, O₂, CO);
  bands surface for players; the sealed-room-self-smother and
  wet-log-won't-catch predictions verify in the demonstrators.
- **Demonstrators:** the burning woodshed (spread + wet-resist), the
  sealed-room CO death, and the working forge (melt-to-liquid) stand up
  reachable-by-teleport with integration tests.
- **Docs:** `fire.md` exists; `thermal.md` covers phase change;
  `race.md`/`CLAUDE.md`/`architecture.md` reflect the new mixins + Material
  props; the AppSettings dials are seeded (seeder count bumped).

## Cross-references

- **Seeding slate:** [fire-combustion-slate.md](../slates/builds/fire-combustion-slate.md).
- **Consumed subsystems:** [thermal.md](../subsystems/thermal.md) (Campfire /
  passive Thermal / the phase-change shape),
  [materials-response.md](../subsystems/materials-response.md) (the `heat`
  channel), [harm.md](../subsystems/harm.md) (`ConditionApi.inflict` / `burn`),
  [weather.md](../subsystems/weather.md) (`WetMixin` / the presence-gated
  fan-out), [respiration.md](../subsystems/respiration.md) (`breathableMedia`
  / `contaminant`), [bulk.md](../subsystems/bulk.md) (fuel / smoke / molten
  liquid), [light.md](../subsystems/light.md) (`LightSource`).
- **Downstream consumers:** [crafting.md](../subsystems/crafting.md) (the
  reserved cooking/smithing branches read the heat-control seam + phase
  change — no recipe built here); [capability-magic-slate](../slates/deferred-rpg/capability-magic-slate.md)
  (the Fire school actuates this combustion channel).
- **Antipatterns as sieve:** [antipatterns.md](../antipatterns.md) (go
  through the Api layer; no parallel mechanism; declarative content).
