# Storms & wetness — requirements

Weather **Wave 2** — the "teeth" the weather tail deferred, promoted to a
build because it introduces a new cross-cutting **wetness** substrate and is
the **Storm frontier** prereq for [capability-magic](../slates/deferred-rpg/capability-magic-slate.md)
(the Storm noun), sibling of the shipped
[electricity](../subsystems/electricity.md) Lightning-frontier. It gives
storms consequences, activates the dormant electricity wet-skin seam, and
proves the mundane version of the magic Lightning bolt. Seeded by
[storms-and-wetness-slate.md](../slates/builds/storms-and-wetness-slate.md);
consumes the [weather Wave-2 tail](../slates/tails/weather-slate.md) and the
shipped [weather.md](../subsystems/weather.md) field over
[biome.md](../subsystems/biome.md) / [address.md](../subsystems/address.md),
plus [electricity.md](../subsystems/electricity.md),
[thermal.md](../subsystems/thermal.md), [bulk.md](../subsystems/bulk.md),
[reserve.md](../subsystems/reserve.md).

The governing decision — settled up front because everything hangs off it —
is **how authored and procedural weather coexist**. The answer is a single
resolved atmospheric state that folds both as inputs in precedence; the rest
of the build is consequences hanging off that resolve.

## Goals

- **One resolved atmospheric state** that folds, in precedence,
  **authored pin → procedural weather (climate-lean-biased) → biome
  baseline** — the single read every consumer sees, **indifferent to whether
  the weather is authored or modelled**. An authored always-rainy room and a
  procgen storm produce the same puddles and the same shocks.
- **Authored weather pins at two tiers** — a whole `Locality` (an
  always-stormy moor) and a single scope (`Location`, a weeping chamber) — as
  one override primitive applied at both, in **two flavors**: **frozen**
  (fully static) and **pinned-but-alive** (force the weather *type*; let the
  model still animate intensity / temperature by season & time-of-day).
- **Authored climate lean** on a `Locality` — a softer authored layer than a
  pin ("this region *tends* snowy/grim") that biases the procgen
  distribution without fixing the outcome.
- **A wetness substrate** — any object (a cloak, firewood, a body) can be
  **wet**, tracked as a per-object **stored, decaying gauge** (dries over
  game-time; shelter / warmth accelerate it), fed by precipitation exposure
  and immersion, presence-frozen like the other reconcile-on-read gauges.
- **Wetness drives the shipped consequences** — **electricity** (activates
  the dormant `isRainWet` seam: a wet body reads ~100× lower resistance →
  deadlier shocks) and **thermal** (wet → faster heat loss / wet-bulb
  wind-chill).
- **Precipitation → puddle accumulation** — rain fills an outdoor `Floor`'s
  surface-bulk pool (draining / evaporating over time), so rain electrifies
  the ground under a downed wire or a strike with **no bespoke glue** (weather
  → bulk → electricity).
- **Storm lightning strikes** — a `storm` scope occasionally takes an ambient
  strike routed through the shipped `ElectricityApi.conduct` (a source held
  at potential into the conduction graph) — the **mundane proof** of the magic
  `Create·Lightning` bolt.
- **Cloud → light dimming** — overcast / storm read dimmer (the perception /
  light seam).
- **Cloud forms** — the resolved weather carries a **derived visible cloud
  form** (a small genus vocabulary — cirrus / cumulus / stratus /
  cumulonimbus / …), surfaced through `analyze weather` and a `look up` sky
  read, and usable as a **deterministic forecast tell** (cirrus presages a
  front). A legibility + inquiry (sky-reading) surface, *described from* the
  resolved weather — never a physics input.
- **Legibility** — `analyze weather` reveals the resolved state **and its
  provenance** (authored-pin vs procgen vs climate-leaned); wetness is
  inspectable (a band, not a number); a strike is perceivable.
- **The weather subsystem doc is updated to Wave 2** (the coexistence resolve
  + wetness), including a wetness section.

## Non-goals

- **Magic `Create·Lightning`** — the frontier noun itself. This build ships
  the *mundane* strike on the reserved seam; magic consumes it later
  ([capability-magic](../slates/deferred-rpg/capability-magic-slate.md)).
- **Weather simulation / stored weather state / a weather tick** — the
  inherited dealbreaker. Weather stays a stateless procedural field computed
  on read; only *wetness* stores per-object state.
- **Clouds grown from vertical convection / advection** — the visible cloud
  form is *derived from* the resolved weather type + trend (a legibility
  read), NOT *grown from* a modelled vertical atmosphere or moving fronts
  (the deferred vector-wind / spatial work). No consequence reads the cloud
  form — it is presentation + a forecast tell, never a physics input.
- **Fog → visibility, snow depth** — deferred Wave-2 teeth (the weather tail
  keeps them).
- **Vector wind / wind direction** — scalar `Quantity<'m/s'>` stays; direction
  (sailing / fire-spread / scent / precip drift) is deferred.
- **Wet firewood / the fire coupling** — needs the Fire noun; the wetness
  gauge ships the seam (a `wet` read), not the fire consumer.
- **The far economy** — farming (rain+sun), sailing (wind), travel-gating a
  storm-blocked pass. Named, not built.
- **Weather-sense / "storm's coming" NPC content** — forecasting is *free*
  from determinism, but the NPC-facing content is deferred.
- **A bulk-weight tie for wet garments** — cheap and optional; not required
  for v1 (the electricity + thermal reads are the load-bearing consumers).

## Surface decisions

### The coexistence resolve (the spine)

**Question:** how do authored and procedural weather coexist, given someone
wants an always-rainy room *and* modelled weather in localities?

**Decision:** a **single resolved atmospheric state**; authoring and procgen
are different *inputs* to it, in a precedence stack (outer wins):

1. **Authored pin** — this scope is *always* raining.
2. **Procedural weather** — the shipped per-Locality field (Wave 1).
3. **Authored climate lean** — biases the procgen *distribution*.
4. **Biome baseline** — the shipped authored static state.

Every consumer (wetness, thermal, electricity, light, `analyze`) reads the
**resolved** state and never the procgen field directly — the integration
invariant that makes authored and modelled rain indistinguishable downstream.
This extends the shipped resolve (`BiomeLogic.resolveQuantityFor` already
folds the procgen field deviation onto the biome baseline, SkyExposed-gated);
the new work is letting an authored pin win over the procgen input, and
exposing a resolved **precipitation / "is it raining here"** read that the
wetness/puddle consumers use.

### Weather = sky dynamics; authored atmosphere = anywhere

**Question:** an always-rainy *indoor* room has no sky — how does it rain?

**Decision:** the two are different layers that compose. The **weather
system** models the sky over a Locality; its *field deviations*
(temperature / humidity / wind / pressure) stay SkyExposed-gated (indoors
gets no wind-chill from the storm outside — unchanged from Wave 1). **Authored
atmosphere** pins any scope, sky or not: an indoor weeping chamber authors its
temperature/humidity directly (the existing `AtmosphericMixin` per-scope
override) **and** declares a precipitation pin the wetness / puddle / light
consumers read. So "it rains indoors" is authored atmosphere + a precipitation
pin, not a sky-gated weather scope — no fiction of a modelled sky where there
isn't one. The **precipitation read is not sky-gated** (an authored pin at any
scope, or procgen at a SkyExposed scope); the **field-deviation read stays
sky-gated** (Wave 1 behavior preserved).

### A — both pin tiers

A pin applies at **`Locality`** scale (covers its address subtree) *and*
**scope** (`Location`) scale (a single room, overriding within an otherwise-
modelled Locality). One authored declaration, resolved at both tiers by the
same upward walk the address/biome resolves already use.

### B — both pin flavors, one field with a mode

An authored pin carries a **mode**: **`frozen`** (fully static — the weather
never changes here; the cheap narrative set-piece) or **`alive`** (the *type*
is forced, e.g. `rain`, but the model still animates its intensity /
temperature by season & time-of-day). One authored field, not two.

### C — the climate lean is a distinct, softer layer

A `Locality` may carry an authored **climate lean** (the reserved
`Locality`-tier field weather.md named — "Narnia is polar") that biases the
procgen *distribution* (leans the transition/season weighting toward
snow/storm) **without** fixing the outcome. Distinct from a hard pin: "usually
grim" ≠ "always raining." Cheap, because the procgen already samples a
distribution.

### D — author always wins

Precedence is absolute: **authored pin > procgen (climate-lean-shaped) >
biome baseline**. A designer's pin is law; the model never overrides an
author. (No case was found where procgen should beat an authored pin.)

### Wetness — a stored, decaying, object-level gauge

**Question:** derived-at-read vs stored; and where does it live?

**Decision:** a **stored, decaying gauge**, on **any object** — not just
creatures — so a cloak, firewood, or a body can be wet (the electricity build
flagged the stored gauge as the upgrade over its derived stopgap). It is a
per-**object** property, *not* weather state, so the weather no-stored-state
dealbreaker is untouched. Modeled as a **cross-cutting gauge in the
`Reserve`-family shape** (a neutral capacity primitive at `lib/`, the
`ReservedMixin` precedent) — wetness is a 0..dry↔soaked saturation that
**fills** on exposure and **drains** (dries) over game-time.

- **Fed by** precipitation exposure (reads the *resolved* "is it raining
  here" — procgen or authored, indifferent) and immersion (a conductive-pool
  co-immersion, the electricity precedent).
- **Dries** reconcile-on-read over game-time, **presence-frozen** (the
  metabolism / harm / electricity-sustain idiom — no tick); **shelter and
  warmth accelerate drying** (the thermal coupling reused as a drying rate).
- **Surfaced** as a band (damp / wet / soaked), never a raw number, for the
  player; a real value under the hood.

### Pin declaration — an authored field with a mode

An authored weather pin is a declarative field on `Location` **and**
`Locality` — a `{ type, mode }` shape (`type` a `WeatherType`; `mode` =
`frozen | alive`) — resolved by the same upward walk. Distinct from, and
higher-precedence than, the `Locality` climate lean. It rides the existing
declarative-content authoring pattern (no imperative construction — the
electricity-content lesson).

### Lightning model

A `storm`-typed **SkyExposed** scope occasionally takes an **ambient strike**:
an `EnergizedMixin` source (a transient high-potential node) fires the shipped
**`ElectricityApi.conduct`** at the struck scope — never a bespoke shock path.
Frequency is a `storm.strikeRate` **dial**; **tall / conductive objects are
strike attractors** (a raised rod / sword biases the strike toward itself — a
cheap emergent bonus). A strike **fires regardless of whether a body is
present** (the world weathers whether you watch; an empty scope just gets a
scorch / an `Audible` thunderclap). Wet ground + a strike = the conductive-
puddle shock falls out of the shipped conduction walk.

### Puddle accumulation

Precipitation at an outdoor scope **accumulates into the `Floor`'s surface-
bulk pool** (the shipped bulk sink), **evaporating** over game-time at a rate
that reads temperature / humidity (a hot dry day dries the ground faster).
**Authored indoor rain accumulates a floor puddle too** — the consequence
layer is indifferent to whether the rain is authored or modelled (the spine
invariant). A fresh-water rain pool is weakly conductive; the loop to a lethal
shock still wants a real source (a wire / a strike), matching electricity's
model.

### Cloud forms — descriptive derivation + an honest forecast tell

**Question:** can the sky show cloud *formations*, the way a kid reads clouds?

**Decision:** yes — a small **cloud-genus vocabulary** *derived* from the
resolved weather type + the near-term forecast trend (the transition grammar
+ free deterministic forecasting), surfaced through `analyze weather` and a
`look up` sky read. It is **presentation + a forecast tell**, not a
simulation: `storm → cumulonimbus`, `overcast → stratus`, `rain →
nimbostratus`, a clear sky trending toward a front → `cirrus` thickening to
`cirrostratus`. Because our weather is deterministic, the tell is a *true,
learnable* sky-reading signal (the observe→predict→verify inquiry loop) — but
the player-facing prose stays **honestly hedged** ("high wisps — a front *may*
be moving in"), since our in-game tell is certain where the real sky's is
probabilistic (the barometer honesty caveat). **Presentation-only:** no
consequence (light / wetness / electricity) reads the cloud *form* — those read
the resolved *type / cloud-coverage* (the one-resolve invariant). Clouds grown
from vertical dynamics are deferred (a non-goal above).

## Constraints

- **Weather stays stateless / no-tick / no-stored-weather-state** — the
  lazy-compute discipline is the guardrail (weather.md dealbreaker 1). The
  *wetness* gauge stores per-**object** state (allowed — the reserve/condition
  precedent); the two must not be conflated.
- **Nothing depends on weather** — enrichment, never a gate or required input.
  Every consumer works with weather flat / absent / authored (thermal +
  electricity already do). No "wait for rain to proceed."
- **Consumers read the ONE resolved state, never the procgen field directly**
  — the invariant that keeps authored and modelled rain indistinguishable
  downstream. New reads (precipitation / wetness input) resolve through the
  same fold.
- **Author always wins** (D) — a pin is never overridden by the model.
- **Weather = sky dynamics; authored atmosphere = anywhere** — field
  deviations stay SkyExposed-gated (Wave-1 byte-identical); the precipitation
  read is the non-sky-gated addition.
- **The strike routes through the shipped `ElectricityApi.conduct`** — no
  parallel shock path; the mundane Lightning is the same seam the magic bolt
  will use (the generalizable-source invariant electricity established).
- **Reconcile-on-read, presence-frozen, no tick** — the wetness gauge rides
  the shipped read-path idiom (metabolism / harm / electricity-sustain); it
  freezes under absence (linkdead / logout) and re-arms on hydrate.
- **Real quantities under a banded surface** — wetness is a real value; the
  player sees `damp / wet / soaked`, raw numbers only on `analyze`. Banding is
  presentation, never security ([banding-presentation-not-security]).
- **No new module categories** — the wetness gauge is a `lib/` cross-cutting
  mixin (the `Reserve`/`Quantity` home), pins are authored fields + the
  weather resolve, the strike is an `EnergizedMixin` source; declarative
  content authored + placed (the electricity-content lesson), no imperative
  construction.
- **Content is authored, placed declaratively** — pinned Localities / rooms,
  the strike-bearing storm content, and any demonstrator ride
  `adornments:`/`populates:`/authored fields, never `StuffApi.create` in a
  hook.

## Acceptance criteria

- **Precedence resolves correctly:** an authored-pinned scope reads its pinned
  weather over the procgen field; `frozen` never varies, `alive` forces the
  type but the model animates intensity/temperature; a `Locality` pin covers
  its subtree; a scope pin overrides within a modelled Locality; a
  climate-leaned Locality's procgen distribution shifts (more snow/storm)
  without a pin. All tested.
- **The consequence layer is source-indifferent:** an authored always-rainy
  scope and a procgen-rain scope produce the same wetness accrual and the same
  puddle/shock (the spine invariant, tested).
- **Field deviations stay SkyExposed-gated + byte-identical to Wave 1** where
  no pin applies (the regression guard); the precipitation read is available
  at non-sky-gated authored-pin scopes.
- **Wetness:** a body/object accrues wetness under rain (procgen or authored)
  and under immersion; dries over game-time on read; shelter/warmth dries
  faster; a linkdead body integrates nothing across the gap (presence-freeze).
  All tested; surfaced as a band.
- **Electricity activation:** a **wet** body takes markedly more shock current
  than a dry one, driven end-to-end through `ElectricityApi.conduct` reading
  the wetness gauge (not the electricity build's derived stopgap). Tested.
- **Thermal:** a wet body loses heat faster (the wet-collapse coupling).
  Tested.
- **Puddle accumulation:** rain accumulates an outdoor `Floor` surface-bulk
  pool; it evaporates over game-time; a source (wire/strike) in the pool
  shocks bridged bodies (the weather→bulk→electricity loop). Tested.
- **Storm lightning:** a strike fires `ElectricityApi.conduct` at a struck
  SkyExposed scope, gated by `storm.strikeRate`; a tall/conductive attractor
  biases the strike; a strike into an empty scope is a no-op harm-wise but
  perceivable (thunderclap). Tested / demonstrated.
- **Light:** overcast / storm dims the scope's light (perception seam).
  Tested.
- **Cloud forms:** `analyze weather` / `look up` reveals a cloud form
  appropriate to the resolved weather (storm→cumulonimbus, overcast→stratus,
  clear-before-a-front→cirrus), the forecast tell is honestly hedged, and the
  derivation is pure / deterministic (tested); **no consequence reads the
  cloud form** (the form is legibility + inquiry, never a physics input).
- **Legibility:** `analyze weather` reveals the resolved state **and its
  provenance** (authored-pin vs procgen vs climate-leaned); wetness is
  inspectable.
- **Doc:** [weather.md](../subsystems/weather.md) is updated to Wave 2 (the
  coexistence resolve + the pins/lean) with a **wetness** section (or a
  dedicated wetness doc if it earns one).

## Cross-references

- **Seeding slate:** [storms-and-wetness-slate.md](../slates/builds/storms-and-wetness-slate.md)
  + the consumed [weather Wave-2 tail](../slates/tails/weather-slate.md).
- **Extended / consumed subsystems:** [weather.md](../subsystems/weather.md)
  (the procgen field + the biome-deviation fold), [biome.md](../subsystems/biome.md)
  (the resolve chain + `AtmosphericMixin` per-scope override + `climate` axis +
  `SkyExposedMixin`), [address.md](../subsystems/address.md) (the `Locality`
  tier — the pin/lean authority), [electricity.md](../subsystems/electricity.md)
  (the `isRainWet` seam this activates + the `EnergizedMixin`/`conduct` seam the
  strike reuses), [thermal.md](../subsystems/thermal.md) (the wet-collapse
  consumer + drying accelerant), [bulk.md](../subsystems/bulk.md) (the `Floor`
  surface-bulk puddle sink), [reserve.md](../subsystems/reserve.md) (the gauge
  shape wetness borrows).
- **Downstream consumer:** [capability-magic Part IV](../slates/deferred-rpg/capability-magic-slate.md)
  (the Storm frontier noun; storm lightning = the mundane `Create·Lightning`
  proof).
- **Antipatterns as sieve:** [antipatterns.md](../antipatterns.md) (go through
  the Api layer; no invented modules; declarative content, not imperative
  construction).
