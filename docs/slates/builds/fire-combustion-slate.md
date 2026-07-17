# Fire & combustion slate — the Fire channel (combustion as a driver)

The next **frontier-physics** build in the "real channels magic actuates"
arc (sibling of the shipped [electricity](./electricity-slate.md)
Lightning-frontier and the [storms-and-wetness](../tails/weather-slate.md)
Storm-frontier). The [capability-magic](../deferred-rpg/capability-magic-slate.md)
model is *elemental schools inject **real** physics; the consequences obey
real chemistry* — Fire → **thermal energy / combustion**. So this build
ships the **mundane** combustion substrate — ignition, burning, spread,
smoke, extinguishing — for its own sake, and the magic Fire school actuates
it later (the electricity → mundane-`Create·Lightning` precedent).

Fire is the **marquee element** and the one that best pays off the last two
builds: it composes thermal (heat), materials (flammability), bulk
(fuel + smoke), air/respiration (a fire breathes), and wetness (wet resists
fire) — every substrate the vitals/atmosphere track just built. It also
closes several deferred tails at once (the weather tail's *wet-firewood
needs the Fire noun*; the thermal tail's *smoke / cooking / fire-spread*;
the electricity slate's *Joule → fire* stretch).

## What is already shipped (do NOT rebuild)

The thermal build already shipped a **contained, fuel-fed hot object** —
the `Campfire` (`Thermal` + `LightSource` + `Postured` warming-slots +
`Reserved` fuel, **pinned hot while fuelled → embers on burnout**). That is
the *furnace layer* (active heat generation over passive `Thermal`) as a
single authored object. The gap this build fills is combustion as a
**general driver**: fire that **starts** on arbitrary flammable matter,
**consumes** it, **spreads**, **smokes**, and **goes out** — the Fire
*channel*, not one authored fire object.

Also already in hand:

- **Thermal** — passive Newton cooling, the SYNC `getTemperature` cached
  read, radiant warming (any hot object warms nearby bodies' effective
  ambient `∝ (T − ambient)`), the indoor-convection / outdoor-radiant split
  gated by `SkyExposedMixin`, `feel` + the scalding-band `burn` hook.
- **Harm / conditions** — `ConditionApi.inflict` (the driver that routes a
  mechanism through the covering stack into vitals) already has a **`burn`
  `TRAUMA_BEHAVIOR`** live; touch-a-hot-thing already burns.
- **Materials-response** — a reserved **`thermal` mechanism** in the
  `InsultKind` vocab (byte-preserving magnitude-only passthrough → `burn`
  *until its channel lands* — **this build is that channel landing**), plus
  the real `Material` mechanical props + the discipline of real Quantities.
- **Wetness** (this-cycle) — a per-object `0..1` saturation gauge on the
  matter seam, with real `Material.waterAbsorptionCapacity`; a wet thing
  should resist ignition (boil the water off first).
- **Bulk** — continuous matter as a holder attribute (fuel-as-bulk; a
  surface pool; smoke as a bulk emission → an unbreathable medium).
- **Respiration / air** — the breathable-medium read (`breathableMedia`,
  the laid-unread `contaminant` seam); a fire *breathes* the same air a
  lung does, and smoke suffocates.
- **Light** — `LightSource` (flickering firelight for free).
- **Electricity** — `EnergizedMixin` + `conduct`; a hot enough current can
  ignite (the *Joule → fire* cross-channel combo).

## The honest core — the fire triangle

Combustion is an **exothermic reaction that consumes fuel + oxygen and
releases heat + light + smoke + residue** (char → ash). The real,
learnable, and cheap-to-model skeleton is the **fire triangle**: a fire
needs **fuel**, **oxygen**, and **heat**, and self-sustains only while all
three hold. Remove any leg → it goes out. That single rule *is* the whole
counterplay:

- **Heat** — a material **ignites** when its temperature is driven past its
  **autoignition temperature** (a real, tabulated `Material` property, K:
  paper ≈ 500 K, wood ≈ 570 K, most metals/stone effectively never). Once
  burning, the reaction **feeds its own heat back** (self-sustaining) and
  radiates to neighbours (spread) — but a wet object must first boil off
  its water (the wetness coupling raises the effective ignition threshold).
- **Fuel** — burning **consumes** the material at a burn rate, releasing
  `Material.heatOfCombustion` (real, MJ/kg) as heat. Fuel exhaustion → the
  reaction stops → embers cool (the campfire's burnout, now general).
- **Oxygen** — the burn rate reads the **breathable-medium / air supply**
  (respiration's read); no air, no fire (a sealed box, a smothered flame,
  underwater). Smoke displaces breathable air — the asphyxiation tie.

Everything else is a **consequence of the triangle over real matter**: a
wet log won't catch; a metal poker heats but never ignites; a closed room
starves the fire and fills with smoke; water/wetness or a sealed lid or
fuel-starvation puts it out. **The method is the lesson** (the Andy-Weir
throughline) — a player learns real combustion by playing with it.

## The spine decision (for requirements)

**How is a burning thing represented, and what drives it?** The strong
lean, by the shipped precedents:

- A **`Combustible` / `Flammable` capability** on matter (the
  `ignitionTemperature` + `heatOfCombustion` + a char/ash residue), the
  Material-coefficient + capability-mixin pattern (thermal / electricity).
- A **`Burning` active state** that reconciles **on read, presence-frozen,
  no tick** (the harm-wound / metabolism / electricity-`SustainedShock`
  idiom): each read integrates elapsed game-time → consume fuel, feed heat
  back, emit smoke/light, progress char → ash, and **re-verify the triangle**
  (fuel left? air? still hot?) — extinguishing itself the instant a leg
  fails, exactly as `SustainedShock` re-verifies its circuit.
- A gated **`CombustionApi` / `FireLogic`** driver (the `ConditionApi` /
  `ElectricityApi` precedent) owning **`ignite`** (the producer — heat
  meets flammable matter → start burning), the burn integration, and
  **`spread`** (a burning object heats its neighbours; any that cross their
  ignition point catch). Ignition **routes through the reserved
  materials-response `thermal` channel** — no parallel damage path (the
  electricity-routes-through-`conduct` invariant).

Spread with **no sub-room geometry** reuses the shipped shapes: a burning
object heats **contact / co-located** neighbours (the thermal radiant read
+ the containment/contact graph the electricity `conduct` walk already
models) and can propagate **room-to-room** through open boundaries (the
`Audible` audience-gather / exit-graph precedent) — never coordinates.
Indoor vs outdoor uniformity stays gated by `SkyExposed` (a hearth warms
the cabin; an open bonfire is radiant-only).

## The `Material` additions (real, tabulated)

Symmetric to the `electricalConductivity` / `waterAbsorptionCapacity`
additions — real Quantities, `0` until authored, values from the
base-library pack:

- **`autoignitionTemperature: Quantity<'K'>`** — the temperature at which
  the material self-ignites (real: paper 506 K, wood ~570 K, cotton ~680 K;
  metals/stone/water effectively `0`/none → non-combustible).
- **`heatOfCombustion: Quantity<'MJ/kg'>`** — energy released per unit mass
  burned (real: wood ~15, oil ~42, ethanol ~27). Drives how hot / how long
  it burns and how far it spreads.
- (residue) the material a burned thing chars to (ash / charcoal), the
  `composition` / transform precedent — or a simple destruct at ash.

The wetness coupling reads through the **existing** `WetMixin` gauge (a wet
object's effective ignition temperature climbs with saturation — the
latent heat of boiling the water off), the mirror of wetness raising heat
loss.

## v1 — the demonstrable vertical

The end-to-end loop, all over shipped substrate:

1. A **`Torch` / `Tinderbox`** (the `Campfire`/`LiveWire` authored-source
   precedent) — an `ignite <target>` verb delivers heat to a target.
2. A **flammable object** (dry firewood, a wooden door, a bale of straw)
   crosses its ignition point → **starts `Burning`**: consumes its fuel,
   glows/lights (`LightSource`), emits **smoke** (a bulk emission → an
   unbreathable medium), radiates heat, chars → ash / destructs on burnout.
3. **Spread** — the burning object heats adjacent flammables; the dry ones
   catch; a spreading fire (object → object, and through an open door to
   the next room). A **wet** object (rained on / doused) **won't** catch.
4. **Extinguish** — three honest counters, each a triangle leg pulled:
   **water** (a `douse` verb / a rain puddle / the wetness gauge removes
   heat), **smother** (seal the container / no air removes oxygen), **fuel
   starvation** (it burns out to embers on its own).
5. **Consequences for free** — touch = burn (`ConditionApi.inflict`, the
   harm channel); the smoke-filled sealed room suffocates
   (respiration asphyxiation); firelight (`LightSource`); a wet body in a
   burning room dries fast (the thermal + wetness reads).
6. A **declarative demonstrator** — a dry woodshed / barn (the substation /
   Weeping-Moor / GlassAlley precedent): a room of authored flammable
   fixtures, reachable by teleport, an integration test proving the spread
   loop and the wet-resists-fire invariant.

## Couplings, and the v1 cut

| Coupling | v1? |
|---|---|
| thermal (a fire is hot → radiant warming + touch-burn) | **v1** (shipped reads) |
| materials (autoignition / heat-of-combustion → what burns) | **v1** |
| wetness (wet resists ignition; fire dries; water douses) | **v1** |
| bulk (fuel; **smoke** as an unbreathable emission) | **v1** (smoke = the marquee hazard) |
| light (firelight) | **v1** (free) |
| spread (object → object, room → room via open boundaries) | **v1** (the soul) |
| respiration (a fire breathes; smoke suffocates; smother = no O₂) | **v1** (smother extinguish + smoke asphyxiation) |
| electricity (Joule → fire: a hot current ignites) | **stretch** (the electricity slate's reserved combo) |
| cooking (heat → food state change; the oven) | **stretch** (metabolism content) |
| fire as a weapon / burning damage-over-time in combat | **stretch** (combat rides the burn channel) |
| char/transform chemistry (smelting / forging inputs) | **stretch** (crafting) |
| the far economy (wildfire, arson crime, fire brigade) | **named, not built** |

## Dealbreakers / constraints (by precedent)

- **No sub-room geometry** — spread is object↔object (contact/co-location)
  + room↔room (open boundaries), never coordinates; indoor/outdoor
  uniformity gated by `SkyExposed` (the thermal precedent).
- **Reconcile-on-read, presence-frozen, no tick** — the `Burning`
  progression rides the harm/metabolism/electricity-sustain idiom (a fire
  in an unwatched room doesn't burn the server down doing nothing; it
  advances on the next read, presence-frozen when no one is about — with a
  design note that a *spreading* fire may want the presence-gated
  scheduler fan-out the weather boundary uses, an open question).
- **Ignition routes through the reserved materials-response `thermal`
  channel** — no parallel fire-damage path (the electricity-through-`conduct`
  invariant); touch-burn stays `ConditionApi.inflict`.
- **Real units under a banded surface** — ignition temp / heat of
  combustion are real Quantities; the player sees `smouldering / burning /
  blazing / dying`, raw numbers only on `analyze`.
- **The mundane fire is the Fire noun** — built for its own sake; magic's
  Fire school actuates this exact substrate later (no engine word "magic").
- **No new module categories** — a `Combustible` capability mixin
  (`lib/` — fire's own subsystem folder), a gated `CombustionApi`/`FireLogic`,
  the `Material` additions, declarative demonstrator content. Everything
  through the Api layer.

## Open questions (requirements-carryable)

- **`Burning` representation** — an `ActiveCondition` on the object (the
  harm-wound precedent) vs a dedicated `FireMixin` state vs a `Reserve`
  (fuel) draining to an ember floor. (Lean: a `Combustible` capability +
  a `Burning` active state driven by `CombustionApi`, fuel-as-`Reserve`.)
- **Ignition kinetics** — instant on crossing `autoignitionTemperature`,
  or sustained-heat-for-a-duration (a piloted-vs-auto ignition nuance)?
  Does a small flame ignite a big log, or does mass/thermal inertia gate
  it (heat-in vs the log's `Thermal` τ)?
- **Spread mechanics** — reuse the thermal radiant read + the electricity
  contact-graph walk, or the `Audible` audience-gather fan-out? Room-to-room
  only through **open** exits/doors (a closed door as a firebreak)? Does a
  spreading fire need a presence-gated scheduler tick (the weather-boundary
  precedent) or is reconcile-on-read enough?
- **Consumption end-state** — `StuffApi.destruct` at ash, transform to a
  `charcoal`/`ash` material, or drain a fuel `Reserve` to embers (the
  campfire precedent)? What happens to a burned door's exit?
- **Smoke** — a bulk emission filling the scope (the `contaminant`
  respiration seam), toxic; does it drift room-to-room; does it obscure
  vision (the deferred fog→visibility seam)?
- **Oxygen coupling depth** — v1 smother-extinguish + smoke-asphyxiation,
  or full burn-rate-reads-air-supply (bellows/draught) in v1 vs a tier?
- **Wet coupling magnitude** — how much saturation blocks ignition; does a
  burning object dry *itself* / *its neighbours* (fire drives the wetness
  reconcile)?
- **Extinguish surface** — which counters in v1 (water/`douse`, smother,
  starve) and their verbs; is `douse` a bulk-pour reuse?
- **Taxonomy hook for magic** — leave the same magical-property seam
  electricity/materials left (a per-school resonance / thaumic property),
  or purely mundane this pass?

## Cross-references

- [thermal.md](../subsystems/thermal.md) / [thermal-slate](../tails/thermal-slate.md)
  — the passive `Thermal` substrate + the shipped `Campfire` furnace layer +
  the combustion design surface this build promotes (§ *A fire is a Thermal
  object kept hot by combustion*, the microclimate/warming-slot model).
- [electricity.md](../subsystems/electricity.md) /
  [electricity-slate](./electricity-slate.md) — the channel + spread-driver
  precedent (a reserved `thermal`/Joule→fire combo; the conduction-graph
  walk fire spread mirrors); the mundane-frontier-built-for-its-own-sake
  posture.
- [weather.md](../subsystems/weather.md) /
  [weather-slate](../tails/weather-slate.md) — the wetness gauge fire reads
  (wet resists ignition), the `SkyExposed` indoor/outdoor split, the
  presence-gated boundary fan-out (the spread-tick precedent), and the
  deferred *wet-firewood* the Fire noun unblocks.
- [harm.md](../subsystems/harm.md) /
  [materials-response.md](../subsystems/materials-response.md) — the
  `ConditionApi.inflict` driver + the reserved `thermal` mechanism this
  build's channel realizes; the `burn` trauma behavior.
- [respiration.md](../subsystems/respiration.md) — the breathable-medium /
  `contaminant` seam a fire breathes and smoke poisons.
- [bulk.md](../subsystems/bulk.md) — fuel-as-bulk + smoke-as-emission.
- [capability-magic-slate](../deferred-rpg/capability-magic-slate.md) — the
  downstream consumer: the **Fire** school actuates this combustion channel
  (schools-actuate-real-channels); the magical-property material layer.
