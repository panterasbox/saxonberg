# Thermal slate (working doc)

Working slate for a generic **`Thermal` capability** — objects that **hold a
temperature and exchange heat with their environment**, drifting toward
ambient over time. Surfaced by Gus's thermos (a vacuum flask keeping coffee
hot), but it's **cross-cutting substrate**: vitals (body core temp, corpse
algor mortis), bulkable (hot/cold drinks), and future content (ovens, forges,
coolers, hot stones) all consume it. Today it's **scattered and gapped** —
ambient lives in biome, the `K` thermal scale in quantities, corpse-cooling
inline in vitals — with **no generic object-thermal capability**. This slate
is that home.

> **Status: SHIPPED 2026-06 — graduated to
> [docs/subsystems/thermal.md](../../subsystems/thermal.md).** The generic
> `Thermal` heat-exchange capability (lazy Newton's-cooling-on-read) and
> Option-C thermoregulation (the third vitals driver, driving
> `coreTemperature`) are live, with `Flask`/`Campfire` content. This slate
> stays as the tail register for the deferred surface captured below.

> **Surfaced by:** `docs/staging/eternal-university/objects/thermos.md`
> (the worked model lives there as content; this is its substrate home).
> **Audit (2026-06-07):** confirmed gaps below against bulkable / vitals /
> biome / quantities / race.

---

## What exists vs. what this adds

**Exists (reused):**
- **Ambient temperature** — `biome.md` `resolveTemperatureFor(scope, detail?)`,
  the biome→room→detail chain. *(per-room + per-detail)*
- **`Quantity<'K'>` thermal scale** — `quantities.md` (freezing→boiling tags;
  YAML ready, pending a consumer).
- **`Material.thermalConductivity` — already a real property** today
  (`Quantity<'W/(m·K)'>`, validated + marshalled; landed with the vitals
  material refactor). *No longer a gap — the slate text below is corrected.*
- **`coreTemperature` vital sign — already live** (`Vitals.ts`:
  `Quantity<'K'>`, baseline 310, survivableMin 301 / max 315, banded and wired
  toward the death seam, with a postmortem-changes comment). Like `spo2`: the
  state + danger band exist, **undriven** — the thermal pass is the driver.
- **Corpse cooling (algor mortis)** — named in `vitals-slate.md` but
  **body-specific**, a postmortem progression, *not* a generic model; this
  slate generalizes it.

**Gap (this slate adds):**
- the generic **`Thermal` capability** (object temperature + cooling), for
  arbitrary objects, not just bodies;
- a **medium conductivity column** on biome's media table (currently
  density-only) — the material side already shipped;
- **object temperature-read methods**;
- the **drivers**: corpse cooling (generic `Thermal`) and **living-body
  thermoregulation** (the metabolism heat seam — see the new section below).

---

## The `Thermal` capability

A mixin composed on any object that holds a temperature distinct from ambient —
**orthogonal to whatever else it is** (a vessel, a body, a stone). It holds:

- a **stamped temperature** `(T0, t0)` — value + the world-clock instant it was
  stamped;
- a **`barrier`** — an optional medium reference (vacuum / air / none; default
  **none**). The *wall* is the object's existing `Tangible` material — not a
  separate field.

Composes with, never inside, other capabilities: **`Thermal` ⊥ `Drinkable`**
(a thermos is both; a cooler is `Thermal`-not-`Drinkable`; a paper cup is
`Drinkable`-not-`Thermal`).

---

## The cooling model

**Lazy Newton's cooling on read** — the watch's store-and-compute pattern, no
ticking:

```
T(now) = ambient + (T0 − ambient) · e^(−(now − t0) / τ)
```

- `ambient` from `BiomeApi.resolveTemperatureFor(scope, detail?)`.
- **Re-stamp on ambient change** (vessel changes rooms, room temp shifts):
  freeze current `T` under the *old* ambient → new `(T0, t0)`, continue under
  the new ambient. Piecewise-exponential; the only events that touch it are
  discrete ambient changes.

**`τ = R · C`:**

- **`C`** (thermal mass) `= mass × specific_heat`. Mass from `Tangible`
  (or, for a vessel's fluid contents, the `Drinkable` volume × density);
  specific heat a material property. *Consequence for free: more contents →
  larger `C` → slower cooling.*
- **`R`** (insulation) `= series sum`: the **`barrier` medium's conductivity**
  (dominant) + the **wall = `Tangible` material's conductivity** (minute term).
  No geometry — **tabulated effective resistivities**, vessel-*type* constants
  tuned to realistic hold-times. Barrier dominates; the wall material is the
  minute correction (so glass vs steel vessels differ slightly).

---

## The vessel case — sealing, refilling, mixing (the thermos)

For a vessel the `Thermal` temperature **is the contents'** — the bulk has no
Stuff to host a mixin, so the vessel's `Thermal` holds it, deriving `C` from the
bulk (more coffee → bigger `C` → slower cooling, free). Three vessel-specific
behaviors sit on the base model:

**Sealing gates the effective barrier — the cap is the insulation switch.**

- **Sealed** (`Sealable` closed): heat escapes only through the vacuum barrier
  (the walls) → huge `R`, `τ` in **hours**; the contents are isolated from room
  air.
- **Unsealed** (open): the open mouth is a thermal hole the vacuum can't cover —
  convection + radiation + **evaporation** straight to room air, in parallel
  with the still-good walls → effective `R` **collapses**, `τ` drops to
  **minutes**.

So `Sealable` state **drives the effective barrier** (sealed → `vacuum`,
unsealed → ≈`none`), and **open/close is a re-stamp event**: opening re-stamps
and `τ` collapses (fast cooling begins); closing re-stamps and `τ` is restored,
but at the now-cooler temperature (you don't get the lost heat back). Diegetic
payoffs: "drink it before it goes cold" is real; **measuring the contents
requires unsealing — which is exactly when it starts cooling fast** (checking
isn't free); and a thermos kept sealed all day genuinely stays hot for hours
(Gus's "the break never goes cold" becomes *thermodynamics*, not description).

**Full re-stamp trigger list** (discrete events; pure lazy read between them):
(1) **containment move** to a room with different ambient; (2) **ambient shift
in place** (biome / weather change → a fan-out re-stamp over the room's
`Thermal` objects — the one non-lazy hook, but rare); (3) **seal toggle**
(open/close, above); (4) **bulk transfer** (refill / pour, below).

**Bulk × Thermal couplings.**

- **Refill** re-stamps to the incoming temperature.
- **Partial pour** shrinks `C` → the remaining contents cool *faster*.
- **Mixing** is calorimetry — cold milk into hot coffee → a mass-weighted blend
  `T_mix = (m₁c₁T₁ + m₂c₂T₂)/(m₁c₁ + m₂c₂)` on the bulk transfer (a
  *temperature-aware* transfer — a fidelity tier on the bulkable primitive;
  explicit steam / evaporative mass-loss is deferred with phase change).

**Symmetric warming** — a cold drink in a hot room *warms* (T0 < ambient → the
exponential rises); set by a fire (a Wave-2 source) it warms faster.

**Gus's thermos is the real first consumer** — a `Sealable` + `Bulkable` +
`Thermal(vacuum)` vessel, **not** description-only. `Sealable` + `Bulkable` ship
today; this lights up the moment the `Thermal` mixin lands (Wave 1).

## The living body — thermoregulation (Option C)

A corpse cools; a living body **regulates**. The living model is the passive
`Thermal` term with a **regulation layer on top** — and that layer is what
**resolves the metabolism heat seam** (its two ports: heat-out from fuel-burn,
fuel/water-in from shiver/sweat). **Death removes the layer**, leaving the
plain `Thermal` cooler (algor mortis) — so living and dead are one model minus
one layer.

The shape is a **thermoneutral dead-band**, not a continuous controller —
three regimes on the body's *effective ambient* (biome ambient, modified by
nearby heat sources and **insulation**):

| Effective ambient | Core temp | Metabolic cost |
|---|---|---|
| **Within the thermoneutral band** | pinned at setpoint (310 K) | **zero** |
| **Below the band (cold stress)** | held at setpoint *while affordable* | **burn fuel** ∝ how far below (shiver) |
| **Above the band (heat stress)** | held at setpoint *while affordable* | **burn water** ∝ how far above (sweat) |
| **Resource exhausted / extreme** | regulation fails → **passive `Thermal` drift** toward ambient | — |

Why this shape:

- **"Gentle by default" is structural, not tuned.** The dead band *is* the
  literal implementation of "doesn't bother you until the margins": most rooms
  sit inside it, so core temp pins at 310 K for free and temperature never
  enters the player's mind. Cold/heat register only at the edges — an
  expedition into real weather, a desert, a frozen pass.
- **The metabolism loop closes, and it's felt.** Cold stress spends *fuel*
  (the furnace running harder + shivering); heat stress spends *water* (sweat).
  Weather drives consumption — a cold haul burns rations, a hot one drains the
  waterskin — the same expedition-grade provisioning drama as scurvy. Diegetic
  feedback: "you're shivering," "you're sweating."
- **"Starving = cold" falls out as a cliff.** A body out of fuel can't pay the
  cold-stress spend → regulation fails → it drifts toward ambient →
  hypothermia (the `coreTemperature` survivableMin band, already wired). Hold,
  then crash — more legible and dramatic than a gradual sag.
- **Insulation pays off honestly.** Worn gear raises the body's effective-R
  against ambient (its version of the thermos's `barrier`), shrinking the
  stress gap → less shivering → fewer rations burned. "Wear a coat to save
  fuel" is a real decision, and it ties thermal to **embodiment** (worn slots)
  the way encumbrance tied load to worn slots.
- **The setpoint is explicit → bonus content for free.** A **fever** raises the
  setpoint (the body shivers *toward* it — chills — then sweats when it
  breaks); **magical cold** attacks the setpoint or widens the stress. None of
  this is expressible without an explicit setpoint, which a passive-offset
  model lacks.

**Reconcile-friendly (the lazy-on-read concern).** The three regimes are each
cleanly integrable over an elapsed active-play gap: *pinned* (nothing to
integrate), *proportional spend* (a fuel/water rate ∝ the ambient gap —
integrate like basal drain), *passive drift* (closed-form Newton's cooling).
The only complexity is a regime crossing mid-gap (fuel runs out → held flips to
drifting) — piecewise, the **same** integration shape the metabolism reconcile
already owns, not a new problem. Runs on the **in-session metabolic clock**
like the rest of metabolism (you get cold from *playing* a long expedition, not
from being away).

**Structure vs dials.** Structure (this slate): the three-regime dead-band, the
fuel-cold / water-heat ports, fail-into-passive-drift, the setpoint as an
explicit movable value. Dials (playtest): band width, spend-rate-per-degree,
how much insulation each garment buys, the failure drift rate.

### Cold-blooded species — the regulation layer is optional

Everything above (the dead band, the fuel/water spend) is the **endotherm**
model. A **cold-blooded (ectotherm) body is the passive `Thermal` object** with
the regulation layer simply **removed** — the *living* version of the corpse's
thermal behavior. Its `coreTemperature` drifts toward effective ambient; no
setpoint, no shiver, no sweat. So the regulation layer is an **endotherm trait**,
gated by a **`thermalStrategy: endotherm | ectotherm`** flag on the species /
body-plan (mammals / birds endotherm; reptiles / amphibians / fish / insects —
the sessile frog — ectotherm).

**Q10 is the unifier.** Metabolic rate tracks body temperature (colder body =
slower everything) for *every* creature; the strategies differ only in what they
do about it:

- **Endotherm** — *pins* body temp at setpoint (paying the regulation cost) →
  rate constant regardless of weather.
- **Ectotherm** — *lets* body temp float to ambient → rate (and activity) swings
  with the weather.

Same machinery; the flag picks the branch. What falls out for an ectotherm, all
for free:

- **Thermal inertia** — big ectotherms change slowly (large `C`); a crocodile
  stays warm into the night. Straight from the cooling model.
- **Sluggish-when-cold → torpor / brumation** — cold body → low Q10 rate → a
  snake on a frosty morning is torpid (slow, can't flee). Too cold is **torpor,
  alive but immobile** (reuses the consciousness/condition surface) — *not* the
  homeotherm's hypothermia-to-death. The cold consequence differs by strategy.
- **Death when too hot** — no sweat to dump heat → a critical thermal max hits
  fast (why desert reptiles are nocturnal). Their dangerous edge is *heat*.
- **Behavioral regulation, not physiological** — basking on a warm rock,
  retreating to shade, burrowing at night is **agency seeking a better effective
  ambient** (an NPC routine, or a manual move for a player ectotherm) — the same
  effective-ambient input, but the response is **relocate**, not spend fuel.
  Ties to npc-behavior.

The metabolic-cost trade (endotherms eat far more) reaches into the metabolism
**basal drain** — see [metabolism-slate](./metabolism-slate.md).
*(Intermediate strategies — a brooding python's metabolic heat, tuna regional
endothermy — are a deeper dial; passive-vs-active is the honest v1.)*

Substrate cost is small: ectotherms are the regulation layer *removed*, so they
are **simpler** than what's built; the one genuinely new general piece is the
**Q10 coupling** (rate ∝ body temp, benefiting both strategies), plus the
`thermalStrategy` flag and **torpor** as the ectotherm cold-consequence.

### Insulation / clothing — the worn `R` (how a jacket works)

A jacket is the one thing that makes thermoregulation *interactive* — you
can't eat your way to warm, you have to dress. Mechanically it's **the
thermos's series-`R`, worn**: the body loses heat through resistances in series
(skin/fat → clothing layers → boundary air film → ambient), the *same*
`τ = R·C` series sum the generic capability uses for a vessel. **Worn garments
are barrier layers inserted into that stack** — clothing insulation is not a
new mechanism.

- **A garment's `R` = material + construction.** Material from
  `Material.thermalConductivity` (wool / down poor conductors = good; leather /
  cotton less so); construction (loft, trapped still air) is an authored
  effective value — the slate's "tabulated vessel-*type* constant" pattern. The
  real, legible unit is the **`clo`** (1 clo ≈ a business suit; a t-shirt ~0.1,
  a parka ~4) — the clothing-domain unit, like BAC for alcohol. Add it to
  `quantities.md`.
- **It plugs in through worn slots.** Thermoregulation **walks the body's worn
  garments** (the embodiment/slot surface — where encumbrance already reads
  worn gear) and sums their insulation. No new wearing mechanism.
- **It acts as the feels-like transform** (the encumbrance wind-chill trick,
  run forward). Raising `R` is mathematically identical to **warming the
  effective ambient toward setpoint** — which is *why* the dead-band model
  reads insulation as an effective-ambient term, not a separate path. So a
  jacket **widens the comfort band downward** (no shiver in colder weather)
  *and* **shrinks the fuel spend** when you're below it. Wind chill is the same
  transform with the opposite sign (wind strips the boundary film → lowers `R`
  → colder effective ambient): the literal "feels like" temperature, the same
  effective-unit pattern as encumbrance's effective-kg.
- **You can have too much jacket.** The body is a furnace, so high insulation
  in *warm* ambient traps generated heat → core rises → heat stress → sweat.
  The same garment that saves you in cold is a liability in heat — which is why
  **layering** (adjustable insulation) is the real skill (shed before you
  sweat). Falls out of the `R` model for free.

**Per-region coverage — where the anatomy pays off (fidelity tier).** Coverage
is per-body-region (a jacket covers the torso, not the hands), and the
body-plan slots / `BodyPart`s already give regions **and** surface fractions
(the rule-of-nines — real, and it teaches). Two distinct, honest consequences:

- **Whole-body hypothermia** — core balance summed over regions fails → the
  `coreTemperature` band. A jacket cuts the dominant chunk (torso ~35% of
  surface).
- **Local frostbite** — a bare extremity, sacrificed by vasoconstriction to
  defend the core, takes *localized* cold damage on that `BodyPart` even when
  the core is fine. "Put on gloves" matters separately from "put on a coat,"
  and the tissue-real anatomy earns its keep.

v1 may collapse to a **single body-wide insulation scalar** (sum of worn,
surface-weighted); per-region coverage + frostbite is the deferred tier —
cheap-ish because the regions already exist, and where the "dress your
extremities" drama lives.

**Deferred wrinkles (the substrate accommodates them):** **wet insulation
collapses** (water conducts ~25× air → a soaked jacket stops working; a
`bulk:water` on the garment modulates its `R` — ties to bulkable, with a
self-defeating loop where heat-stress sweat wets your own gear); **crushed
loft** (a heavy pack compressing down kills trapped air — an encumbrance
interaction); **the jacket's own thermal mass** (a frozen cloak is cold to don
— free, because the garment is itself a `Thermal` object warming toward skin).

### Wind, humidity, and the weather seam

Clothing is one term in a larger **"feels like" temperature** the body actually
fights — raw ambient transformed by clothing (`R`), wind, humidity, and radiant
sources. The dead band's two sides each have their own **real-world transform**:

- **Cold side → wind chill** `(temp, wind, clothing R)` — sets the fuel/shiver
  spend.
- **Hot side → heat index** `(temp, humidity)` — sets the water/sweat spend.

These are the two actual public formulas (wind chill defined for T ≲ 10 °C, heat
index for T ≳ 27 °C), and the gap where neither applies (~10–27 °C) **is** the
thermoneutral band — the two real transforms and the dead-band model
independently agree on where "comfortable" sits. The band self-selects which
correction is live (so for a dry body humidity barely matters cold, wind barely
matters hot).

- **Wind — accelerates heat exchange with ambient.** It strips the **boundary
  air film** (part of your `R`). One-liner: *speeds exchange — a penalty when
  retaining heat, a relief when shedding it.* Cold side it's the **opposite-sign
  twin of the jacket** (wind subtracts the film `R` the jacket adds) → wind
  chill — and it introduces **windproofing as a garment attribute distinct from
  `clo`** (down = warm but wind-permeable; a shell = windproof; layer both). Hot
  side it *helps* — carries the humid skin layer away, raising evaporation.
- **Humidity — governs evaporative cooling (the sweat port).** Hot side: high
  humidity suppresses sweat → heat index climbs → more water for less cooling.
  The deadly part is the **evaporative ceiling**: past the **wet-bulb limit
  (~35 °C wet-bulb) the body cannot shed metabolic heat no matter how
  hydrated** → core rises → hyperthermia anyway. The **hot-side mirror of
  "starving = cold cliff"** (dry heat you out-drink; humid heat past wet-bulb
  kills regardless) — real, climate-famous, teachable. Cold side: humidity
  matters less directly, but **damp cold wets your insulation** (the
  wet-collapse loop) → effectively colder; and dry air costs water faster
  (insensible loss) even on a cold night.

**The weather seam — flagged, not designed here.** Wind and humidity are
**atmospheric state**, and biome already owns that reading (humidity is a biome
property today; **wind is a new one to add**). But the *interesting* part —
state that **varies over time and across a region** (storms, fronts, rain, the
diurnal/seasonal swing) — is a **weather subsystem that does not exist** (only
casual mentions). The relationship is the familiar one: **thermal/biome READ the
atmospheric state; weather DRIVES its dynamics.** Thermal is **not blocked** on
it — biome state can be **static-authored** now (a pass authored windy, a jungle
authored humid → wind chill / heat index work today), and weather later makes it
dynamic with no change to thermal. Stubbed at
[weather-slate](./weather-slate.md); design deferred.

## Heat sources — the campfire (Wave 2)

The warming counterpart to the cooling thermos. The key realization: a "heat
source" is **not a separate driver** — it's the **radiant-contribution read** of
the same model, plus a combustion layer.

### Hot objects radiate to their neighbors

> **Any `Thermal` object hotter than ambient contributes radiant warmth to
> nearby bodies' effective ambient, `∝ (T_object − ambient)`** (occupancy-gated,
> below).

A hot rock warms your hands as it cools; a corpse (≈ ambient) contributes
nothing; a roaring fire roasts you. There is no special "source" *type* —
anything hot enough radiates, the same read.

### A fire is a `Thermal` object kept hot by combustion

A fire isn't a passive object cooling toward ambient — it **actively generates
heat from fuel**, sustaining its temperature against cooling: a **furnace
layer**, the same shape as the body's thermoregulation. When the fuel runs out
the layer stops and it falls back to a passive `Thermal` cooler (embers → cold
ash). This is the **third instance of one pattern** — active generation over
passive `Thermal`, the layer removable:

| Active-generation layer | falls back to passive `Thermal` when… |
|---|---|
| living body (regulation furnace) | it dies → corpse cooling |
| endotherm (warm-blood) | (ectotherm = born without the layer) |
| **burning fire (combustion)** | **fuel runs out → cooling embers** |

`Thermal` is the passive substrate; active heat generation (furnace, metabolism,
combustion) is a layer on top. The campfire is the *environmental* instance of
the body's furnace.

### No sub-room geometry → microclimates are occupied, not located

The engine has no positions within a room, so a naïve fire would heat the whole
room uniformly — **wrong outdoors, right indoors**, and the split is already
gated by **`SkyExposedMixin`**:

- **Indoor (`!SkyExposed`):** trapped convection genuinely warms the room's air
  → a **uniform room-ambient bump** (correct — a hearth warms the cabin).
- **Outdoor (`SkyExposed`):** the hot air convects to the sky; the fire is
  **radiant only** and must *not* touch room ambient. You get warmth only if you
  are **at** the fire — and "at" is **slot occupancy, not coordinates.**

**Warming is a capacity-limited slot attribute** — `warmth` on a slot, the
sibling of encumbrance's `coupling` and metabolism's `restQuality` (a slot
conferring a body attribute on its occupant — the third such attribute).
Occupying a fire's warming slot adds its `warmth` to the occupant's **per-body
effective ambient** (already per-body via clothing — this sits alongside it); no
slot → room ambient only (cold, outdoors — which is right). **Capacity = the
huddle limit** — scarcity slots give for free (the spots fill; latecomers wait
or make room), better drama than continuous distance and exactly what geometry
*couldn't* model cheaply.

The spots are usually **logs you sit on** — posture slots — so a campfire seat
can carry **both `restQuality` (recover) and `warmth` (stay warm)**: metabolism
and thermal converging on one occupancy. The number of logs *is* the huddle
limit.

**General resolution (bigger than the fire):** sub-room thermal variation
without geometry = **microclimates as occupiable features** — *capacity-limited*
(slots: the fire's spots, a sun-spot the lizard basks in, a shade-spot) or
*uncapped* (a per-detail warm zone — biome already resolves temperature
per-detail). "No sub-room geometry" becomes a style: thermal zones are things you
*occupy*, not places you stand.

### The composite — a survival-systems hub

The combustion layer is a little economy that reuses half the substrate:

- **Fuel = a `Reserve`** — wood added, depletes at the burn rate, floored = out;
  output (heat + light + smoke) scales with the burn. "Feed it or freeze."
- **Combustion *breathes*** — burn rate depends on air supply, the *same*
  breathable-medium respiration reads (bellows speed it; smothering kills it;
  no air, no fire).
- **`LightSource`** — shipped (`light.md`); flickering light for free.
- **Smoke = a bulk emission** → an unbreathable / toxic medium (respiration +
  toxicity ties).
- **Touch = burn** (conduction damage); **cooking** = heat → food state change
  (the oven use case).
- **Social attractor** — the warm slots *are* why people and NPCs cluster on a
  cold night (agency seeking a warm microclimate — the basking-lizard move, now
  round a fire).

### v1 vs tiers

- **v1:** outdoor-radiant-vs-indoor-convective via `SkyExposed`; warming as a
  capacity-limited slot `warmth` (raising the occupant's effective ambient);
  fuel `Reserve` that depletes and must be fed → embers cool on burnout;
  `LightSource`; touch = burn.
- **Tiers (all ride existing seams):** radiant directionality (front/back,
  occlusion) — *which the slot model mostly obviates*; the air-supply burn
  coupling (bellows / smother); smoke as a bulk emission; fire spread (ignition
  — big, hazardous); cooking.

### Sauna / steam room — the heat-side counterpart

The campfire warms you on the cold side; the **sauna / steam room** is the
heat-side worked example — and almost entirely **content exercising the existing
heat-index / wet-bulb model**, no new substrate. Sauna and steam room are the
two **humidity regimes** made into rooms:

- **Sauna (dry)** — ~90 °C, low humidity → high evaporative ceiling → **sweat
  works**, so it's survivable despite the extreme temp, at the cost of heavy
  **water** spend. **Dehydration is the limiter**, not temperature.
- **Steam room (wet)** — ~45 °C, ~100% humidity → evaporative ceiling ≈ 0 →
  **sweat can't evaporate**, core climbs with no relief, so you overheat at a
  *lower* temp than the sauna (the wet-bulb mechanic). Plus steam **condenses on
  your skin, depositing latent heat** (the reverse of sweat) — a double hit.

So the pair is the canonical demonstration of the temperature-axis vs
humidity-axis split — "it's not the heat, it's the humidity," made into a place.

**Uniform, not radiant — the opposite geometry case from the campfire.** A sauna
is indoor (`!SkyExposed`), so the hot air fills it → **uniform heating is correct
here** (the campfire needed slots because it was outdoor-radiant). But the
**tiered benches** add an intra-room gradient via the *same* warming-slot
pattern: heat rises, so the top bench is hotter → benches are posture slots with
**graduated `warmth`**, and you pick your intensity by which you sit on. So slots
serve a **second purpose** — the campfire used them for **scarcity** (the huddle
limit), the sauna for an **intensity gradient** (bench height). Uniform baseline
+ bench-slot gradient (the indoor-hearth structure).

**The löyly (water on the stones)** is the signature interaction, and it's two
deferred-but-shape-known things together: a **phase change** (water flashes to
steam — the vaporize transition, the stones supplying the latent heat; the mirror
of ice melting) **+ a dynamic humidity spike** (the steam saturates the air →
evaporative ceiling drops → a wave of perceived heat, the air temp barely moving
— a player-triggered mini-weather event). v1 = a statically-authored hot/humid
room; löyly is the fidelity tier (phase change + dynamic atmosphere).

The payoff: voluntary heat-stress as *pleasure* (the campfire is warmth as
comfort; the sauna is heat as ritual), the **cold plunge after** hitting the
other end of the dead band (both extremes in one ritual), and a visceral
heat-index lesson (you *feel* why the cooler steam room is worse). **Content,
buildable on the heat-side thermoregulation once it lands — no new substrate.**

## Phase change / ice — deferred, but shape-known

A **cold drink** with no ice is nothing new — symmetric `Thermal`, warming
toward ambient (and a vacuum flask keeps it cold as well as it keeps coffee hot;
insulation is symmetric). **Ice** is the exception, and the canonical reason
phase change was deferred: **while ice melts it stays at 0 °C** — incoming heat
goes into the latent heat of fusion (breaking the crystal), not into
temperature. Newton's smooth exponential has no plateau, so the lumped model
can't express it.

But the shape is now known — it's the **reserve-clamp pattern, a third time.**
Ice carries a **latent-heat reserve** (the frozen mass); incoming heat flux
*depletes the reserve* (melts ice) instead of raising temperature; while the
reserve lasts, temperature is **pinned at the transition point**; exhausted →
unpin → passive `Thermal` drift (now meltwater). The **cold mirror of the
campfire's fuel reserve**:

| Reserve clamping temperature | clamps at… | exhausted → |
|---|---|---|
| body regulation (fuel / water) | setpoint (310 K) | hypo/hyperthermia drift |
| fire (fuel / combustion) | high burn temp | embers cool |
| **ice (latent heat of fusion)** | **melt point (273 K)** | **meltwater warms** |

So phase change = **a latent-heat reserve clamping temperature at a transition
temp until exhausted**, bidirectional (fills on freezing, empties on melting),
one model for melt/freeze (0 °C) and boil/evaporate (100 °C). (Precisely, ice is
a heat *sink* with a buffer, not a cold *source* — there is no "cold," only
absence of heat — but structurally it mirrors the fire.) What it unlocks when
built:

- **Iced drink** — ice holds the drink near 0 °C while it lasts; melting
  **dilutes** it (a bulk-mixing transfer); ice gone → it warms. The watered-down
  drink for free.
- **Preservation / cold storage** — ice clamps a cooler near 0 °C → **slows
  spoilage** (the deferred perishability topic); *the* counterplay to rot, and
  the **ice economy** (winter ice harvest, sawdust icehouses, ice as a traded
  good).
- **Freezing** — remove enough heat and water → ice (latent heat released): a
  **waterskin freezes solid** on a cold night (can't drink), puddles ice over.
- **Shared with the body** — sweat cooling *is* evaporation (the water→steam
  transition); the body already leans on an abstracted slice (the wet-bulb
  "evaporative ceiling"), and the full latent substrate would underpin it.

Still deferred — but a **known build** (a latent reserve, the campfire's mirror),
not an open unknown. Condensation (a cold glass "sweating") rides the same tier.

## Extensions to existing substrate (name these in requirements)

- **`race.md` (Material): `thermalConductivity` — already shipped.** A real
  validated property (`Quantity<'W/(m·K)'>`) as of the vitals material refactor;
  steel high, glass lower, ceramic lower. Double duty with density
  (density→mass, conductivity→insulation). *No work here — corrects the earlier
  "graduate it from deferred" framing.*
- **`biome.md` (media):** the air/water/vacuum table carries only density; add a
  **conductivity column**. **Vacuum gets a tiny *nonzero* conductivity** —
  real vacuum leaks via radiation, and the cap/neck leak lumps in — so
  insulated vessels cool **slowly, not never**. (Modeling the null explicitly,
  as biome already does for vacuum's density.)
- **`biome.md` (atmosphere):** add **`wind`** as an atmospheric property
  (resolved per-room like temperature; **humidity already exists**). Read by
  thermoregulation's cold/hot "feels like" transforms (wind chill / heat index).
  Static-authored until a **weather** subsystem drives it dynamically — see the
  weather seam above and [weather-slate](./weather-slate.md).
- **`quantities.md`:** the conductivity unit (`W/(m·K)`) — quantities already
  flags heat as a future channel. Add **`clo`** (clothing insulation, the worn
  `R`; 1 clo ≈ a suit, parka ~4) — the legible garment-domain unit, the way
  BAC has its own.

---

## Surface (methods, the contract)

- `getTemperature()` — the object's own temperature.
- `getContentsTemperature()` — for vessels, the held fluid's temperature.
- `getSurfaceTemperature()` — the exterior (≈ambient for a well-insulated
  vessel — the insulation observable as *absence* of exterior heat).

Explicit methods, **not** state-inference. Diegetic gating (a *sealed* vessel's
contents aren't externally measurable — `measure` says so) rides on top as
flavor, never as the load-bearing path.

---

## Consumers

- **The thermos** — `Thermal(vacuum)` + `Bulkable` + `Sealable`; the worked
  vessel (see *The vessel case* above for sealed/unsealed, re-stamp triggers,
  the bulk couplings). **Gus's thermos is the real first consumer** — bulkable
  has landed, so it's buildable now (not description-only), waiting only on the
  `Thermal` mixin (Wave 1).
- **Vitals** — **resolved (Option C, above):** the *living* body reads the
  passive `Thermal` term but layers thermoneutral-band thermoregulation on top
  (spends fuel/water to hold setpoint within affordability, fails into passive
  drift); the *corpse* drops the regulation layer and is a plain `Thermal`
  object cooling toward ambient (algor mortis).
- **Fire / ovens / forges / hot stones (warming)** — see *Heat sources — the
  campfire*. Any hot object radiates to neighbors; an active source sustains its
  temperature via a fuel/combustion layer; proximity = warming-slot occupancy
  (no geometry). Plus coolers, a cooling forge, a corpse (passive `Thermal`).

---

## Honest scope (the abstraction)

The **skeleton is real** (lumped-capacitance Newton's cooling, `τ = R·C` — the
standard first-order model); the **parameters are tuned**:

- **Lumped capacitance** — one uniform temperature per object, no internal
  gradients.
- **Tabulated effective `R`** — no thickness/area geometry; vessel-*type*
  constants fit to realistic hold-times; radiation/neck/wall-conduction all
  lumped into the tabulated numbers.
- **Single barrier + single wall** per object (two-wall flask lumps to one
  wall term — minute anyway).

"Honest engineering numbers, game-tuned" — not CFD.

---

## Open questions

1. **Body vs generic — RESOLVED (Option C).** The living body layers a
   thermoneutral-band regulation model over the passive `Thermal` term (spends
   fuel/water to hold setpoint within affordability; fails into passive drift);
   the corpse is plain `Thermal`. See the thermoregulation section. *(Band
   width + spend rates remain dials.)*
2. **Heat sources — RESOLVED** (see *Heat sources — the campfire*). Not a
   separate driver: any hot `Thermal` object radiates to nearby bodies'
   effective ambient `∝ (T − ambient)`; an active source is a `Thermal` object
   whose temperature is *sustained by a combustion/fuel layer* (furnace) rather
   than cooling. Proximity with no geometry = capacity-limited **warming-slot**
   occupancy; indoor/outdoor split via `SkyExposed`.
3. **Phase change / ice — deferred, shape-known** (see *Phase change / ice*).
   Not an open unknown: a latent-heat reserve clamping temperature at the
   transition point until exhausted (the reserve-clamp pattern, the cold mirror
   of the campfire). Unlocks iced drinks, cold storage / spoilage-counterplay /
   the ice economy, freezing.
4. **`R` granularity** — vessel-type constants (lean) vs per-instance.
5. **Conductivity unit/scale** placement in `quantities.md`.
6. **Insulation granularity** — v1 single body-wide `clo` scalar (sum of worn,
   surface-weighted) vs per-body-region coverage (jacket = torso, gloves =
   hands). Per-region unlocks **frostbite** (local extremity damage, distinct
   from core hypothermia) and reuses the body-plan regions / surface fractions;
   lean body-wide v1, per-region a fidelity tier.

---

## Build order

- **Wave 1** — the `Thermal` mixin (`(T0,t0)` + `barrier`); lazy cooling-on-read
  + re-stamp; `τ = R·C`; the **medium** conductivity column (material side
  already shipped); the temperature-read methods. First consumers: the thermos
  (with bulkable) and corpse algor mortis (plain `Thermal`, regulation removed).
- **Wave 2** — heat sources, **the campfire model** (see *Heat sources*):
  radiant contribution to effective ambient gated by **capacity-limited warming
  slots** (`SkyExposed`: indoor = + room ambient, outdoor = slots only); fuel
  `Reserve` + combustion layer + embers-on-burnout; `LightSource`; touch = burn.
  Richer object consumers (ovens, forges, hot stones).
- **Wave 3 — living-body thermoregulation (Option C).** The thermoneutral
  dead-band layer over the passive term: the fuel-cold / water-heat spend
  (metabolism coupling), insulation from worn gear (embodiment), fail-into-drift
  → the hypo/hyperthermia bands. Lands **with/after the metabolism build** (it
  spends metabolism's reserves) and reads Wave 2's effective ambient.
  Fever / magical-setpoint content rides on top.

---

## What this slate does NOT cover

- **Drainable fluid / `Drinkable`** → `bulkable-slate.md` (composes alongside).
- **Consumable effects** (warmth/alertness *on drinking*) → `vitals-slate.md`.
- **Ambient temperature** → `biome.md`.
- **The `K` thermal scale** → `quantities.md`.
