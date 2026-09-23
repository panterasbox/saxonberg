# Thermal slate (working doc)

> **Status: PARTIAL** — the `Thermal` capability, Option-C
> thermoregulation, worn insulation, and phase change all shipped
> → [thermal.md](../../subsystems/thermal.md)
> **Left:** the generic hot-object radiant read · the indoor
> room-ambient convection bump · microclimates beyond the campfire
> (sun-spot / shade-spot) · sauna / steam room content · behavioral
> thermoregulation (basking) · worn-gear wrinkles (crushed loft, a
> garment's own thermal mass) · phase-change consumers (iced drinks,
> cold storage / the ice economy, freezing content, condensation) ·
> weather-driven per-region frostbite (tracked at physiology-slate) ·
> the `clo` / covering-fold reconciliation
> ⚠⚠ **DEFECT, found by the fishing drive 2026-09-21 — every unfed Cast
> in the world collapses by game-hour ~7 and dies.** A probe on a fresh
> body at the market square: satiation falls **24 %/h**, linear, to 0 at
> hour 4.5; `starvation`; the core drifts. The cold branch spends
> `COLD_SPEND_PER_DEGREE` 0.05 %/min per K below a floor of
> `310 − BAND_HALF_WIDTH_K(8) − CLO_TO_KELVIN(2.5)·clo`: a naked body at
> 294 K (21 °C) has an 8 K gap; the student outfit (~0.6 clo) buys 1.5 K.
> Out of fuel → drift → death by exposure at room temperature. **No Cast
> row wears anything.** Two dials are ~10× off physiology: 1 clo is
> *defined* as comfort at 21 °C seated → ~7 K per clo, not 2.5; shivering
> peaks near 5× basal (basal is 1.2 %/h of satiation here) → ~0.01
> %/min/K, not 0.05. Plus a content sweep: dress the cast. Wire test
> characters were minted naked too (fixed: `TestHooks` dresses them).
> Recorded on the fishing plan's drive record and MR !268; the fix is
> this slate's owner's.
> **Size:** a tail

The generic `Thermal` heat-exchange capability this slate designed is
built (`lib/thermal/`), along with Option-C thermoregulation, the
thermos/campfire content, and phase change. What remains below is the
opportunistic tail: content (sauna), a handful of unwired seams (the
generic radiant read, the indoor convection bump, worn-gear wrinkles),
and two items explicitly tracked elsewhere (frostbite-from-weather at
`physiology-slate`, the clo/fold reconciliation split with
`textiles-slate`).

> **Surfaced by:** `docs/staging/eternal-university/objects/thermos.md`
> (the worked model lives there as content; this is its substrate home).

---

## What exists vs. what this adds

All of it shipped: the generic `Thermal` capability, the biome conductivity
column, the temperature-read methods, and both drivers (corpse cooling +
living-body thermoregulation). See [thermal.md](../../subsystems/thermal.md).

---

## The `Thermal` capability, the cooling model, and the vessel case

Shipped as designed: the `(T0,t0)`-stamped mixin orthogonal to whatever
else the host is; lazy Newton's-cooling-on-read with `τ = R·C`; re-stamp
on every ambient discontinuity; the thermos as the sealed/unsealed
barrier switch with the calorimetric bulk couplings (refill / partial
pour / mix). See [thermal.md](../../subsystems/thermal.md)
(`ThermalMixin`, `τ = R·C`, *The thermos (Flask)*, and the cached-ambient
re-stamp trigger list).

## The living body — thermoregulation (Option C)

Shipped as Option C: the three-regime thermoneutral dead-band (pinned /
cold-stress-burns-fuel / heat-stress-burns-water / fail-into-passive-
drift), the endotherm/ectotherm `thermalStrategy` split, torpor as the
ectotherm cold-consequence, and the Q10 coupling driving basal drain.
See [thermal.md](../../subsystems/thermal.md) §
`ThermalRegulationMixin — the living body (Option C)` and § `Q10 (the
metabolism edit)`.

**Still open — behavioral thermoregulation.** Nothing plays the
ectotherm's other lever: basking on a warm rock, retreating to shade,
burrowing at night is **agency seeking a better effective ambient** (an
NPC routine, or a manual move for a player ectotherm) — the same
effective-ambient input the dead-band already reads, but the response is
**relocate**, not spend fuel. Ties to npc-behavior. No code anywhere
implements it.

### Insulation / clothing — the worn `R` (how a jacket works)

Shipped, and in a richer shape than designed here: `clo` **derives** from
fabric loft/conductivity/wetness rather than an authored field, summed
**per body part** by surface share (Meeh's law), with **windproofing** as
a separate per-outer-layer term. Wind chill / heat index / the wet-bulb
evaporative ceiling all read live. The "too much jacket" consequence
(insulation that saves you in cold cooks you working hard in it) is
shipped too, coupled through the internal heat-load shed rate. See
[thermal.md](../../subsystems/thermal.md) §§ *Worn insulation is
SURFACE-WEIGHTED PER PART, and `clo` DERIVES*, *The internal heat load*.

**Local frostbite — half-shipped, tracked at physiology-slate.** The
wound type exists (the `cold` channel resolves to `frostbite` through
the covering fold), but only a **delivered cold blow** produces it; cold
*weather* still drives the core alone with no per-region read, which is
the wrong order for a real cold day (fingers go first). The producer is
`physiology-slate § Part 7g` — not owned here. See `thermal.md §
Non-goals`.

**Deferred wrinkles (the substrate accommodates them):** **crushed
loft** (a heavy pack compressing down kills trapped air — an
encumbrance interaction) and **the jacket's own thermal mass** (a frozen
cloak is cold to don — free, because the garment would itself be a
`Thermal` object warming toward skin) remain unbuilt. (Wet-insulation
collapse — water conducts ~25× air — **did** ship, folded into the `clo`
formula's wetness term; kept here because the paragraph is one unit.)

## Heat sources — the campfire (Wave 2)

Shipped: the furnace-as-active-generation-layer pattern (a fire sustains
its temperature against cooling via combustion, falls back to passive
`Thermal` embers on burnout — the environmental twin of the body's
regulation furnace); the outdoor warming-slot path end to end
(`SkyExposed`-gated, `Postured` log-seats carrying `warmth` +
`restQuality`, capacity = huddle limit); fuel as a `Reserve`; combustion
breathing (air supply / bellows / smother); smoke as a bulk emission;
touch = burn; cooking as a heat-driven state change; fire spread. See
[thermal.md](../../subsystems/thermal.md) §§ *The furnace couple*, *The
warming slot*, and [fire.md](../../subsystems/fire.md) for the
combustion driver.

**Still open — the generic radiant read.** > *Any `Thermal` object
hotter than ambient contributes radiant warmth to nearby bodies'
effective ambient, `∝ (T_object − ambient)`.* A hot rock warms your
hands as it cools; a corpse (≈ ambient) contributes nothing; a roaring
fire roasts you — with **no special "source" type**, anything hot
enough radiates, the same read. What shipped is narrower: only an
*authored* warming-slot fixture (the campfire's log-seats) contributes;
there is no standalone "any nearby hot Thermal object" helper. No code
implements the general read.

**Still open — the indoor room-ambient bump.** Outdoors the fire is
radiant-only (right — the hot air convects to the sky); indoors, trapped
convection should genuinely warm the room's air as a **uniform bump**
(a hearth warms the cabin) — this half of the `SkyExposed` split is not
wired.

**Still open — microclimates beyond the fire.** The general pattern the
campfire's warming slots are one instance of: sub-room thermal variation
without geometry = **microclimates as occupiable features**, either
*capacity-limited* (a sun-spot a lizard basks in, a shade-spot) or
*uncapped* (a per-detail warm zone — biome already resolves temperature
per-detail). "No sub-room geometry" as a style — thermal zones are
things you *occupy*, not places you stand — has one built instance and
is otherwise open.

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

## Phase change / ice — the engine shipped; the consumers below did not

The core substrate this section speculated about is **built**: a
latent-heat reserve clamps temperature at the transition point until
exhausted, bidirectional (melt/freeze at 0 °C, boil/evaporate at
100 °C), driven by any heat source. See
[thermal.md](../../subsystems/thermal.md) § *Phase change (the fire
build)* (`MeltableMixin` + `reconcilePhase`, `lib/thermal/Meltable.ts`).
What it unlocks when built:

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

None of the four are built as content/behavior — only the engine
underneath them is. Condensation (a cold glass "sweating") rides the
same tier, also unbuilt.

## Extensions to existing substrate, the method surface, consumers, and scope

All shipped as designed: `Material.thermalConductivity`, the biome media
conductivity column (`BiomeApi.conductivityOf`, vacuum nonzero), `wind`
as an atmospheric property, the `clo` unit, `getTemperature()` /
`getContentsTemperature()` / `getSurfaceTemperature()`, every named
consumer (thermos, vitals, campfire family), and the lumped-capacitance
/ tabulated-`R` / single-barrier-and-wall abstraction disclosure. See
[thermal.md](../../subsystems/thermal.md) (throughout; the abstraction
disclosure is now its own § *Honest scope (the abstraction)*),
[biome.md](../../subsystems/biome.md), and
[quantities.md](../../subsystems/quantities.md).

## Open questions

Six of seven resolved and shipped — Body-vs-generic (Option C) and Heat
sources (`thermal.md`'s `ThermalRegulationMixin` + furnace-couple
sections), Phase change (`thermal.md § Phase change (the fire build)`),
`R` granularity (resolved lean — tabulated vessel/garment-type
constants, not per-instance geometry — `thermal.md § Honest scope`),
and conductivity-unit placement (`quantities.md`, `W/(m·K)`).
Insulation granularity resolved *better* than either option it offered:
per-body-**part**, surface-weighted (Meeh's law), not a body-wide scalar
— `thermal.md §` *Worn insulation is SURFACE-WEIGHTED PER PART*. The
frostbite unlock it named shipped as a wound *type*; weather-driven
per-region frostbite is still open, tracked at `physiology-slate § Part
7g` (see *Insulation / clothing* above).

7. ⭐⭐ **Two insulation models, and they do not talk — RESOLVED** *(injury
   build, 2026-09-18)*. `thermal.md § Non-goals` carries the resolution:
   `clo` is now the one insulation number, read by both the fold
   (`heatAttenuationFraction`) and thermoregulation, each keeping its
   own physics (a pulse vs steady-state loss). **Still open** — the
   deeper reconciliation this question's own text deferred:
   - *Leans:* the fold is per-blow and per-site and should stay so
     (armour is layered and local); `clo` is body-wide and steady-state.
     The honest join is that **both derive from the same fabric
     properties** — loft, density, conductivity — so a wool coat that is
     warm to stand in is also warm against a frost bolt, *by
     construction*. Today `clo` reads loft and the fold reads
     conductivity, and a fabric could be authored to satisfy one and not
     the other.
   - A test that walks every shipped covering material and asserts the
     two readings are monotonic in each other would make the drift
     visible without forcing a merge.
   - → textiles-slate owns the fabric properties; this slate owns the
     two readers.

---

## Build order

Waves 1–3 all shipped (the mixin + thermos + corpse cooling; the
campfire/heat-source model; living-body thermoregulation). See
[thermal.md](../../subsystems/thermal.md).

---

## What this slate does NOT cover

- **Drainable fluid / `Drinkable`** → `bulkable-slate.md` (composes alongside).
- **Consumable effects** (warmth/alertness *on drinking*) → `vitals-slate.md`.
- **Ambient temperature** → `biome.md`.
- **The `K` thermal scale** → `quantities.md`.
