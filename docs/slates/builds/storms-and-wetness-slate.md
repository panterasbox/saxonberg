# Storms & wetness slate — the Storm frontier + a wetness substrate

**Framing.** This is **weather Wave 2** (the "teeth" the
[weather tail](../tails/weather-slate.md) has been holding), promoted to a
build because it (a) introduces a genuinely new cross-cutting **substrate —
wetness**, and (b) is the **Storm frontier** prereq for the
[capability-magic](../deferred-rpg/capability-magic-slate.md) build (the
Storm noun), the sibling of the just-shipped
[electricity](../../subsystems/electricity.md) Lightning-frontier prereq.

**Why now (the convergence).** One build serves three goals at once:

1. **It activates electricity content already built.** The electricity build
   wired `isRainWet` defensively (a SkyExposed scope under active rain → wet
   skin → deadlier shocks), but weather Wave 1 is a stateless field with no
   real precipitation *state* driving anything, so that seam is dormant.
   Landing wetness lights it up.
2. **Wetness is a real platform primitive, not one-off content.** Wet is a
   property *thermal* reads (wind-chill, faster heat loss), *light* reads
   (overcast dims — Wave-2 anyway), *fire* will read (wet won't burn), and
   *electricity* reads (wet = deadly). Build it once; four systems consume it.
3. **Storm lightning is the mundane proof of the magic Lightning bolt.** A
   storm strike is the same `EnergizedMixin` source imposing a potential into
   the conduction graph that electricity left a seam for — validating the
   generalization *before* magic consumes it.

Deepens electricity; supports magic; makes the world feel alive. The
governing north star stays **"build something cool"** — rain you can feel,
puddles that form and conduct, storms that darken and threaten.

---

## The opening decision — authored ↔ procgen coexistence (the spine)

The whole build hangs off one resolve, so it's decided first. **Good news:
the architecture already stratifies this** — the atmospheric read is a single
resolve point (`BiomeLogic.resolveQuantityFor`) that already folds authored
biome + procedural weather deviation together, SkyExposed-gated, and
weather.md *explicitly reserved* the authored-climate seam on `Locality`.

### The principle

> **One resolved atmospheric state. Procgen and authoring are just different
> *inputs* to it, in precedence order. Every consequence reads the resolved
> state and never knows which won.**

An authored always-rainy room and a procgen storm produce **the same puddles
and the same shocks** because the consequence layer can't tell them apart.
That indifference is the integration invariant — protect it.

### The precedence stack (outer wins)

1. **Authored pin** — this scope is *always* raining. **Author always wins.**
2. **Procedural weather** — it happens to be storming today (per-Locality,
   seeded from address; shipped Wave 1).
3. **Authored climate lean** — this region *tends* snowy/grim; shapes the
   *distribution* procgen samples from, not the outcome (the reserved
   `Locality` field).
4. **Biome baseline** — authored static state (shipped).

### The line that resolves the "always-rainy room"

> **Weather is sky-driven *dynamics*. Authored atmosphere is *any* state,
> *anywhere*.**

Weather stays sky-gated (it models the sky over a locality). An always-rainy
**indoor** room — a wizard's weeping chamber, a rain-machine greenhouse —
isn't fighting the weather system; it's **authored atmosphere** that reads
"raining," on the biome layer, no sky required, driving the same
wetness/conduction consequences. Two clean composable things (procgen models
the sky; authoring pins anything), not one overloaded one.

### Settled decisions (A–D)

- **A — both tiers.** A pin applies at **Locality** scale (a whole
  always-stormy Blighted Moor) *and* **scope** scale (one always-rainy
  chamber) — one override primitive at two tiers.
- **B — two pin flavors.** **Frozen** (fully static authored override, never
  changes — the cheap narrative set-piece, the `_atmosphere` precedent) *and*
  **pinned-but-alive** (force the *type* to `rain`, but let the model still
  animate intensity/temperature by season & time-of-day).
- **C — keep the climate lean** as a distinct, softer layer from a hard pin
  ("usually grim" ≠ "always raining"); the reserved `Locality` climate field,
  cheap because procgen already samples a distribution.
- **D — author always wins.** Pin > procgen > climate-lean-shaped-procgen >
  biome. A designer's pin is law; the model never overrides an author.

---

## The wetness substrate

**Wetness = a cross-cutting object property** — a per-body / per-object
**drying gauge** (decays over game-time; the reserve / metabolism-gauge
precedent). This is *object* state, NOT weather state, so the weather
"no-stored-state" dealbreaker is untouched: weather stays a stateless field;
a soaked cloak carries its own wetness between rooms and dries out.

- **Fed by** rain exposure (reads the resolved "is it raining here" — procgen
  *or* authored, indifferent), immersion (pool co-immersion — the electricity
  precedent), and splashing/spills.
- **Decays** over game-time; sheltered / warm / windy scopes dry faster (the
  thermal coupling reused as a drying accelerant), presence-frozen like the
  other reconcile-on-read gauges.
- **Read by:** **electricity** (wet skin → ~100× lower resistance → deadlier;
  activates the dormant `isRainWet` seam), **thermal** (wet → faster heat loss
  / wet-bulb wind-chill — the wet-collapse loop), **light** (n/a), **fire**
  (deferred — wet won't ignite), **bulk** (a wet garment is heavier — cheap
  tie, optional v1).

The one real open call: **derived-resolution-time vs a lightly-stored
decaying gauge.** Electricity flagged the stored-gauge as the upgrade; the
lean here is the **stored gauge** (a body that got rained on stays wet after
it steps inside, and dries over minutes) — that's the behavior that feels
real. Settle at requirements.

## Storm dynamics + lightning

- **Precipitation → puddle accumulation (the bulk tie).** Rain fills an
  outdoor `Floor`'s surface-bulk pool (draining / evaporating over time). The
  emergent loop falls out with **zero bespoke glue**: rain → conductive
  puddles → outdoor shock hazards; a downed wire or a strike in the rain
  electrifies everyone standing in the water. Three systems (weather → bulk →
  electricity) meeting on their own.
- **Storm lightning strikes.** `storm` is already in the weather vocabulary;
  give it occasional **ambient strikes** — a strike = an `EnergizedMixin`
  source firing `ElectricityApi.conduct` at a struck outdoor scope. The
  *mundane* version of the magic `Create·Lightning` bolt, on the exact seam
  electricity reserved ("a spell is just another source imposing a
  potential"). Tall / conductive objects as strike attractors is a cheap,
  cool emergent bonus (a rod, a sword held aloft).
- **Cloud → light dimming** — the straightforward weather-teeth consumer
  (overcast/storm read dimmer; the perception/light seam).
- **Cloud forms — the sky as a readable instrument.** A small cloud-genus
  vocabulary (cirrus / cumulus / stratus / cumulonimbus / …) **derived** from
  the resolved weather type + the near-term forecast trend, surfaced through
  `analyze weather` and a `look up` sky read. Rides two things we already have:
  the **transition grammar** (which *is* the "front approaching" sequence — a
  clear sky trending toward rain shows cirrus thickening) and **free
  deterministic forecasting** (so the tell is a *true, learnable* sky-reading
  signal — the observe→predict→verify inquiry loop, hedged in prose since our
  tell is certain where the real sky's is probabilistic). Presentation + an
  inquiry tell, **never a physics input** (no consequence reads the form).
  Luke Howard's cloud grammar as the amateur-naturalist patron saint of the
  whole "player as sky-reader" idea. Clouds *grown from* vertical
  convection/advection (a real vertical atmosphere + moving fronts) stay
  **deferred** with the vector-wind / spatial work — this is clouds *described
  from* the resolved weather, honestly abstracted.

## Scope

**v1 (the felt layer + the coexistence spine):**
- The precedence resolve (pins at both tiers, both flavors, the climate lean,
  author-wins) — the single authored/procgen resolve every consumer reads.
- The wetness drying gauge + its **electricity** and **thermal** reads.
- Precipitation → outdoor `Floor` puddle accumulation.
- Storm lightning strikes (the magic-Lightning proof).
- Cloud → light dimming.
- Cloud forms (the derived genus + the deterministic forecast tell — the
  sky-reading inquiry surface).

**Deferred (named, not built):** fog → visibility; snow depth; vector wind
(direction — sailing / fire-spread / scent / precip drift); **clouds grown
from vertical convection / advection** (a real vertical atmosphere + moving
fronts producing form — v1 *describes* the cloud from the resolved type
instead); wet firewood / fire coupling (needs the Fire noun); the far economy
(farming, sailing, travel-gating a storm-blocked pass); weather-sense /
"storm's coming" NPC content (forecasting is *free* from determinism, but the
NPC content is deferred); ambient flavor (petrichor, sun-after-rain).

## Dealbreakers

1. **Weather stays stateless / no-tick / no stored weather state** (inherited
   — the lazy-compute discipline IS the guardrail). Wetness is a per-*object*
   gauge, which is allowed (object state, the reserve precedent) — do not
   conflate the two.
2. **Nothing depends on weather.** Enrichment, never a gate or required input;
   every consumer works with weather flat / absent / authored (thermal +
   electricity already do). No "wait for rain to proceed."
3. **Author always wins** (D) — a pin is never overridden by the model.
4. **Consumers read the ONE resolved state, never the procgen field
   directly** — the integration invariant that makes authored and procedural
   rain indistinguishable downstream.
5. **Weather = sky dynamics; authored atmosphere = anywhere** — an indoor
   "always raining" room is authored atmosphere, not a sky-gated weather
   scope.

## Open questions (for requirements)

- **Wetness storage** — derived-resolution-time vs a stored decaying gauge
  (lean: stored). Where does it live — a `WetMixin` / a reserve-style gauge /
  a condition? What dries it, how fast, and does shelter/warmth accelerate it?
- **How a scope declares a pin** — extend the inline `_atmosphere` override?
  A new `weatherPin` / `climate` field on `Locality` + `Location`? Frozen vs
  pinned-but-alive as one field with a mode, or two?
- **Lightning targeting + frequency** — random outdoor scope in the striking
  Locality? A `storm.strikeRate` dial? Attractor bonus (tall/conductive)? Does
  a strike need a body present, or does it fire into an empty scope (and just
  scorch)?
- **Puddle accumulation / evaporation** — rate model; does it read humidity /
  temperature (a hot day evaporates faster)? Does authored *indoor* rain
  accumulate a floor puddle too (probably yes — consequences are indifferent)?
- **Climate lean representation** — a bias on the transition table
  (`SEASON_BIAS` sibling) vs a per-field authored deviation floor?

## Cross-references

- [weather-slate](../tails/weather-slate.md) — the Wave-1 tail this consumes
  (the deferred "teeth" + the reserved authored-climate seam).
- [weather.md](../../subsystems/weather.md) — the shipped procedural field +
  the biome-deviation seam this extends.
- [electricity.md](../../subsystems/electricity.md) — the dormant `isRainWet`
  seam this activates + the `EnergizedMixin` / `conduct` seam storm lightning
  reuses.
- [biome.md](../../subsystems/biome.md) — the resolve chain + inline
  `_atmosphere` override + `climate` axis + `SkyExposedMixin` gate.
- [thermal.md](../../subsystems/thermal.md) — the wet-collapse consumer + the
  drying accelerant.
- [address.md](../../subsystems/address.md) — the Locality tier (the weather
  authority + the reserved climate-lean field home).
- [bulk.md](../../subsystems/bulk.md) — the `Floor` surface-bulk pools
  precipitation accumulates into.
- [capability-magic-slate](../deferred-rpg/capability-magic-slate.md) — the
  downstream consumer (the Storm frontier noun; storm lightning = the mundane
  Create·Lightning proof).
