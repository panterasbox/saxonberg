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
needs the Fire noun*; the thermal tail's *smoke / cooking / fire-spread* and
*phase change / ice*; the electricity slate's *Joule → fire* stretch).

**Scope posture: build the whole system in one go.** Per the
no-half-grown-systems rule, this is a *maximal* build — the full combustion
driver + the complete Andy-Weir real chemistry (ignition as a derivable
energy balance; stoichiometry → complete/incomplete combustion → smoke +
carbon monoxide; the observe→predict→verify measurement surface) **and all
the high-heat physics the crafting system will later stand on** (phase change
/ melting, the forge-kiln-oven furnace family, and the inert heat-as-a-
crafting-control seam). It stops at exactly one line: **the crafting recipes
themselves** (cooking / smelting / smithing) are the deferred consumer — we
build the substrate they need, not the recipes.

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
  radiates to neighbours (spread).
- **Fuel** — burning **consumes** the material at a burn rate, releasing
  `Material.heatOfCombustion` (real, MJ/kg) as heat. Fuel exhaustion → the
  reaction stops → embers cool (the campfire's burnout, now general).
- **Oxygen** — combustion needs O₂ in a real ratio to the fuel; the burn
  reads the **breathable-medium / air supply** (respiration's read). No
  air, no fire (a sealed box, a smothered flame, underwater); smoke
  displaces breathable air — the asphyxiation tie.

### Andy-Weir pillar 1 — ignition is an *energy balance*, derivable from the numbers we shipped

"Will it catch?" is not a coin flip against a threshold — it is real energy
accounting the player can reason about, and **every input already exists**:
the heat delivered must exceed the fuel's **thermal inertia** (mass ×
`specificHeat` × ΔT to raise it to its ignition point — both on
`Material`/`Thermal` today) **plus** the **latent heat to boil off any
water it holds** (the `WetMixin` saturation × water's latent heat). That one
balance teaches three real things at once: **activation energy** (you must
*start* the exothermic reaction before it self-sustains), **thermal
inertia** (a match won't light a big log — too much mass to heat past
ignition; a small flame ignites kindling but not a beam), and **latent
heat** (wet wood won't catch because the energy goes into boiling the water,
not raising the temperature — the *wet-firewood* the weather tail deferred,
now derived, not flagged). Fire's ignition is the exact `τ = R·C` thermal
model + the wetness gauge, cashed out.

### Andy-Weir pillar 2 — stoichiometry → complete vs incomplete combustion → smoke + CO

The oxygen leg is **chemistry, not a flag.** With enough air (the right
air-fuel ratio) combustion is **complete** → hot, clean, high flame
temperature. Starved of air it is **incomplete** → cooler, and it throws
**sooty smoke + carbon monoxide.** This makes the marquee real lesson fall
out: an enclosed fire kills by **CO, not flame** — the smoke, not the burn,
is the danger, and **ventilation** becomes a reasoned mechanic (crack a
door → more air → the fire runs hotter *and* cleaner; seal the room → it
smokes, poisons, and eventually self-smothers as it eats the O₂). A bellows
genuinely *works* — more O₂ shifts the ratio toward complete, raising the
flame temperature (the same read a forge needs to hit smelting heat). CO
rides the respiration `contaminant` seam already laid; soot is a bulk
emission. This is the single mechanic that turns smoke from flavour into
**taught fire-safety science.**

Everything else is a **consequence of the triangle over real matter**: a
metal poker heats but never ignites; a closed room starves the fire and
poisons its occupants; water/wetness or a sealed lid or fuel-starvation puts
it out. **The method is the lesson** (the Andy-Weir throughline) — a player
learns real combustion by playing with it, not by reading a tooltip.

### The measurement + inquiry surface (teach *how to know*)

Real science is only taught if it is **measurable and predictable**, so the
build ships the observe→predict→verify loop (the inquiry throughline —
knowledge *demonstrated*, not told): `analyze` reads real units — autoignition temperature (K),
heat of combustion (MJ/kg), current temperature, the scope's O₂ level and
CO buildup — and the experiments are genuine: *predict* a sealed-room fire
self-smothers when the O₂ runs out, and verify it; *predict* the wet log
won't catch (run the energy balance) and verify; *predict* the bellows makes
the forge hotter and the smoke thinner, and verify. Bands for the casual
player (`smouldering / burning / blazing / dying`; air `stuffy / choking`),
raw numbers on `analyze` for the student.

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
- **`meltingPoint: Quantity<'K'>`** (+ `latentHeatOfFusion`,
  `boilingPoint`/`latentHeatOfVaporization`) — the real phase-transition
  temperatures (iron 1811 K, glass ~1700 K, wax ~330 K, ice/water 273 K,
  water→steam 373 K). Drives the **phase-change** layer below (a fire melts
  wax, a forge melts iron, ice melts near a hearth, water near a fire boils
  to steam) — and is what the smelting/casting crafting branch will gate on.
- (residue) the material a burned thing chars to (ash / charcoal), the
  `composition` / transform precedent — or a simple destruct at ash.

The wetness coupling reads through the **existing** `WetMixin` gauge (a wet
object's effective ignition temperature climbs with saturation — the
latent heat of boiling the water off), the mirror of wetness raising heat
loss.

## The high-heat materials physics — what crafting will stand on

This build is deliberately **maximal**: it ships not just the burn/spread
loop but *all the high-temperature physics crafting will later consume* —
so that when the cooking / smelting / smithing / kiln branches land, the
substrate is already there and honest. **We build everything up to (but not
including) the crafting recipes themselves.** Three supporting pieces:

**Phase change (the latent-heat reserve-clamp).** Heat driven into matter
past its `meltingPoint` / `boilingPoint` **transitions its state** — solid →
liquid → gas — with a **latent-heat plateau** (temperature holds at the
transition while the latent heat is absorbed, the reserve-clamp pattern the
thermal tail already shaped as the cold mirror of the campfire). This is the
one genuinely-new substrate the build adds beyond combustion, and it is
**bidirectional** — the same clamp gives **melting** (wax by a candle, iron
in a forge, ice by a hearth) and **freezing/solidifying** (molten metal
cooling to a casting; the deferred *Water* channel's ice/steam falls out for
free). Smelting *is* melting; casting *is* solidifying — so phase change is
the literal physics the smithing branch stands on, built now, its recipes
deferred.

**Sustained heat sources — the forge / kiln / oven / furnace.** The shipped
`Campfire` is one authored instance of the **furnace layer** (active heat
generation over passive `Thermal`, fuel-fed, pinned-hot-while-fuelled). This
build **generalizes it**: a `Furnace`-family of `Combustible`-fed sources
that hold a **real, legible temperature** set by their fuel (charcoal/coke
burns hotter than wood → a higher flame temperature) and their **air
supply** (a bellows/draught shifts the ratio toward complete combustion →
hotter still — the *why* a forge needs a bellows to reach smelting heat).
A campfire ~900 K, a bread oven ~500 K, a pottery kiln ~1300 K, a
bellows-forced forge 1600 K+. These **are fire content** (they burn), and
their temperature is the number crafting reads.

**The heat-as-crafting-control seam (built shaped, left inert).** Crafting
already resolves `recipe + maker + reachable tools/inputs + (fixed) control
→ output`, with feasibility **emergent from reachability** and **cooking /
smithing named as reserved branches** (the `_control` parameter live but
fixed at `fair`). Fire supplies the missing input: **a heat source's
sustained temperature is a crafting control.** This build ships the **read**
— a reachable-heat query / a thermal capability a recipe *would* gate on
("is there a reachable heat source ≥ T?") — as an **inert, shaped seam**
(the codebase's declared-but-unpopulated pattern), so the smelting branch
later reads it with zero retrofit. A recipe's required temperature is real
(you cannot smelt iron over a campfire — 1811 K melting point vs ~900 K —
you need the bellows-forced forge), which is exactly crafting's
emergent-reachability principle, and *teaches metallurgy for free*. **No
crafting recipe is built this pass** — only the physics and the seam it
reads.

## Scope — build the whole system (everything but the recipes)

**Governing decision (per the no-half-grown-systems rule):** build the fire
and high-heat physics as a *complete system in one go*, with the full
Andy-Weir real-science depth and all the infrastructure the crafting
branches will stand on — and stop exactly at the line where **actual
crafting recipes** begin. The build is the substrate; cooking/smelting/
smithing/glassmaking recipes are the deferred consumer. Roughly four phases
inside one build:

1. **The combustion driver.** The fire triangle over shipped substrate:
   `ignite`/`douse` verbs + a `Combustible` capability + a reconcile-on-read
   `Burning` state driven by a gated `CombustionApi`; ignition as the
   **energy balance** (thermal inertia + boil-off latent heat); burn
   consumes fuel (`heatOfCombustion`), feeds heat back, chars → ash /
   destructs; the three extinguishers (water/wet, smother/seal, fuel-starve).
2. **The real chemistry (Andy-Weir).** Stoichiometry → **complete vs
   incomplete combustion** → smoke + **carbon monoxide** (the
   `contaminant`/respiration seam) → asphyxiation + ventilation as reasoned
   mechanics; the air-supply → flame-temperature coupling (bellows). The
   `analyze` measurement surface + the observe→predict→verify loops.
3. **Spread — the soul.** A burning object heats adjacent flammables
   (thermal radiant read + the containment/contact graph the electricity
   `conduct` walk models) → the dry ones catch; room-to-room through **open**
   boundaries (a closed door = a firebreak); wet objects resist.
4. **The high-heat materials physics crafting stands on.** The **phase-change**
   latent-heat reserve-clamp (melting / boiling / solidifying, bidirectional
   — smelting *is* melting, and the deferred Water ice/steam falls out); the
   generalized **`Furnace` family** (forge / kiln / oven — `Combustible`-fed
   sources holding a real, air-and-fuel-driven temperature); and the
   **inert, shaped heat-as-crafting-control seam** (the reachable-heat
   query a recipe *would* gate on — built, not consumed).

**Demonstrators** (declarative, the substation / Weeping-Moor / GlassAlley
precedent, reachable by teleport, integration-tested): a **burning woodshed**
(spread + wet-resists-fire), a **sealed-room CO death** (the ventilation
lesson), and a **working forge** (a bellows-driven furnace melting a metal
past its melting point — the crafting substrate proven, no recipe).

## Couplings, and the cut

| Coupling | in this build? |
|---|---|
| thermal (a fire is hot → radiant warming + touch-burn) | **yes** (shipped reads) |
| materials (autoignition / heat-of-combustion → what burns) | **yes** |
| wetness (wet resists ignition; fire dries; water douses) | **yes** |
| bulk (fuel; **smoke + soot** as an unbreathable emission) | **yes** |
| respiration (a fire breathes; **CO** poisons; smother = no O₂; ventilation) | **yes** (the marquee real-science hazard) |
| stoichiometry (complete vs incomplete → smoke/CO/flame-temp; bellows) | **yes** (Andy-Weir pillar 2) |
| energy-balance ignition (thermal inertia + latent heat of water) | **yes** (Andy-Weir pillar 1) |
| light (firelight) | **yes** (free) |
| spread (object → object, room → room via open boundaries) | **yes** (the soul) |
| **phase change** (melting / boiling / solidifying, latent-heat clamp) | **yes** (the crafting substrate; unlocks Water ice/steam too) |
| **sustained heat sources** (forge / kiln / oven furnace family) | **yes** (fire content; the temperature crafting reads) |
| **heat-as-crafting-control seam** (reachable-heat query) | **yes, but inert** (built shaped, consumed by crafting later) |
| electricity (Joule → fire: a hot current ignites) | **stretch** (the electricity slate's reserved combo) |
| the measurement / inquiry surface (`analyze`, predict→verify) | **yes** (teach *how to know*) |
| **actual crafting recipes** (cooking / smelting / smithing / kiln) | **the deferred line — NOT built** (this build is the substrate they stand on) |
| fire as a combat weapon / burning DoT | **deferred** (combat rides the burn channel) |
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
- **Phase-change representation** — a `Phase`/state on the object + a
  latent-heat `Reserve`-clamp (the thermal-tail shape), bidirectional
  (melt ⊕ freeze / boil ⊕ condense)? Does a melted object stay one Stuff
  (state flag) or flow to a `Bulkable` liquid (molten metal as bulk → the
  casting mould)? How much couples to the shipped `Bulkable` fluids?
- **Furnace generalization** — a `FurnaceMixin` / `Combustible`-fed
  sustained-heat layer the shipped `Campfire` refactors onto, or a parallel
  `Furnace` family? How is the target temperature set (fuel `heatOfCombustion`
  + air-supply ratio → flame temp) and capped realistically?
- **The heat-as-crafting-control seam** — where does the reachable-heat read
  live so the future smithing branch consumes it with no retrofit
  (a `ThermalApi.reachableHeatFor` / a `HeatCapability` a recipe requires,
  the `ToolCapability` sibling)? Confirm it stays **inert** this pass.
- **Andy-Weir depth of the chemistry** — is stoichiometry a binary
  complete/incomplete + a ratio, or a fuller air-fuel model (flammability
  limits LEL/UEL, so a gas leak burns only in a concentration band)? Is CO
  a real toxin `Quantity` on the respiration/toxicity path, or a banded
  hazard? How far before it stops teaching and starts simulating.
- **Taxonomy hook for magic** — leave the same magical-property seam
  electricity/materials left (a per-school resonance / thaumic property),
  or purely mundane this pass?

## Cross-references

- [thermal.md](../../subsystems/thermal.md) / [thermal-slate](../tails/thermal-slate.md)
  — the passive `Thermal` substrate + the shipped `Campfire` furnace layer +
  the combustion design surface this build promotes (§ *A fire is a Thermal
  object kept hot by combustion*, the microclimate/warming-slot model).
- [electricity.md](../../subsystems/electricity.md) /
  [electricity-slate](./electricity-slate.md) — the channel + spread-driver
  precedent (a reserved `thermal`/Joule→fire combo; the conduction-graph
  walk fire spread mirrors); the mundane-frontier-built-for-its-own-sake
  posture.
- [weather.md](../../subsystems/weather.md) /
  [weather-slate](../tails/weather-slate.md) — the wetness gauge fire reads
  (wet resists ignition), the `SkyExposed` indoor/outdoor split, the
  presence-gated boundary fan-out (the spread-tick precedent), and the
  deferred *wet-firewood* the Fire noun unblocks.
- [harm.md](../../subsystems/harm.md) /
  [materials-response.md](../../subsystems/materials-response.md) — the
  `ConditionApi.inflict` driver + the reserved `thermal` mechanism this
  build's channel realizes; the `burn` trauma behavior.
- [respiration.md](../../subsystems/respiration.md) — the breathable-medium /
  `contaminant` seam a fire breathes and smoke poisons.
- [bulk.md](../../subsystems/bulk.md) — fuel-as-bulk + smoke-as-emission +
  molten-matter-as-fluid (the casting seam).
- [crafting.md](../../subsystems/crafting.md) — the **downstream consumer**:
  the reserved cooking / smithing branches over `recipe + reachable tools/
  inputs + control → output`; this build supplies the temperature
  **control** (sustained heat sources) + the phase-change physics (smelting
  = melting) they stand on, and the inert heat-as-control seam they read.
  **No recipe built here.**
- The **inquiry** throughline (observe→predict→verify; knowledge
  demonstrated, not told) — the measurement surface the Andy-Weir depth
  serves; electricity is its flagship discoverable-law domain and fire is
  the combustion sibling.
- [capability-magic-slate](../deferred-rpg/capability-magic-slate.md) — the
  **magic** downstream consumer: the **Fire** school actuates this
  combustion channel (schools-actuate-real-channels); the magical-property
  material layer.

---

## The fire service — making fire survivable in a property game (2026-07-31)

**(Out of the vocations register, which flagged the fire brigade as the
largest civic hole: combustion ships and nobody fights fires.)** The
user's objection is the right one and worth stating precisely:

> **Irreversible loss while you are offline, in a game whose premise is
> that property is worth investing in, is a rage-quit — not a mechanic.**

Five reframes dissolve most of it, and the first changes what fire *is*.

### ⭐⭐⭐ The brigade exists because fires SPREAD, not because they destroy

One house burning is a private tragedy. Cities built fire services —
and building codes, and insurance — because of **conflagration**:
one house takes the block (London 1666, Chicago 1871).

So the design question is **not** *"how much damage does fire do to your
building"* but ***"does it reach your neighbour."*** Which puts fire
somewhere already modelled:

> **Fire is [the emission model](./zoning-slate.md)'s catastrophic
> case** — a spillover that crosses parcel boundaries.

A **nuisance and an externality**, not a new destruction system. It is
about neighbours — which is the interesting part, and what justifies a
*public* service at all.

### ⭐⭐⭐ Ignition needs a SOURCE, and sources are things you left running

The direct answer to the offline problem, and it needs **no special
rule** because the ignition balance already ships: a lit forge, an
unbanked hearth, a knocked lamp, a lightning strike, arson.

> **No source, no fire.** The player who banked the forge before logging
> off is safe; the player who left it lit is gambling. **A decision, not
> a dice roll.**

**And the history is exact: *curfew* is *couvre-feu* — "cover the
fire."** The medieval curfew bell was a **fire-prevention ordinance**.
So a locality passing a curfew is passing a **fire code** — the best
available example of a mundane law with an honest reason behind it.

### ⭐⭐ Damage, not craters

Fire damage should be **condition damage** — already shipped, with
**repair** as a trade from the salvage work. A burned shop is a
**damaged** shop.

> **Fire produces repair bills, not craters.**

An economic *shock* rather than a wipe; it feeds the building trades;
it is recoverable. **Total loss stays rare and EARNED** — ignoring
warnings, or a compounding failure. Never a bad roll on a Tuesday.

### ⭐⭐ Prevention is the gameplay; firefighting is the emergency

Most of what a real fire service does is **inspection and code
enforcement** — the same `directive` → **inspector** machinery already
designed for the turnpike and the scrapyard.

So the ordinary relationship to fire is **buy the extinguisher, keep the
firebreak, pass the inspection** — ownership *texture*, not disaster:

> **Risk is a dial you control.** A player doing the sensible things
> essentially never burns down.

Which is the whole answer to *"how do you make it not suck"*:
**avoidable by ordinary diligence, expensive to ignore.**

### ⭐⭐⭐ Insurance is the mechanic that exists precisely for this

Fire is *why* insurance exists: it converts a **catastrophic tail risk**
into a **predictable premium** — the honest solution rather than a
mitigation bolted on.

And the history is the best pedagogical object in the thread:

> **Insurers issued FIRE MARKS and ran their own brigades — which would
> let an uninsured building burn.** The most vivid argument for public
> provision anyone has ever made, and the same lesson as the
> LULU/holdout pair, learned the hard way.

⚠ **Insurance is its own industry and its own conversation** — named
here as fire's dependency, **not designed here.**

### ⭐⭐ Fighting it is a public event, not a chore

A fire spreads on a beat, so it is a **durable activity** like the
Journey and the auction — but a **public** one:

> **A burning street is a call to the neighbourhood**, and anyone
> present can join.

**Bucket brigade → volunteer company → paid service** is the three-rung
ladder again, and **the bottom rung needs no employment at all.**
Genuinely rare content: most of what has been designed is solo or
party-scoped; **this is district-scoped by nature.**

### The crime, and the escape valve

**Arson**, and insurance's classic **moral hazard** — burn your failing
business for the payout. A real crime, and **investigable**: the world
knows what happened while the claim asserts something else, which is the
[enforcement slate](./enforcement-slate.md)'s **true / honest-error /
lie** triad applied to a *claim*. It gives the coroner a sibling: **the
fire investigator.**

**And the honest escape valve is Tiebout.** A locality with strict
codes, a paid brigade and mandatory insurance is **safe and taxed**; one
with none is **cheap and dangerous**.

> **You choose your risk tolerance by choosing where to live** — the
> best possible answer to *"this might suck for me"*: **there is
> somewhere it does not.**
