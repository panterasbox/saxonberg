# Thermal

The third vitals **driver**: a generic `Thermal` heat-exchange
capability (lazy Newton's-cooling-on-read) that drives object
temperature everywhere — algor mortis on a corpse, a thermos that holds
coffee hot, a campfire that burns down to embers — and, layered over it,
Option-C thermoregulation that finally **drives** `coreTemperature` on
the living body.

Source: `lib/thermal/` (`Thermal.ts`, `ThermalRegulation.ts`); content
in `obj/` (`Flask.ts`, `Campfire.ts`, `Receptacle.ts`). Mirrors
`MetabolicMixin` beat-for-beat — read [metabolism.md](./metabolism.md)
alongside this.

## The two layers

| Layer | Mixin | Drives | On |
|---|---|---|---|
| Generic capability | `ThermalMixin` | a bulk `getTemperature()` | any Tangible+Containable Stuff (thermos, corpse, campfire, body) |
| Living regulation | `ThermalRegulationMixin` | `coreTemperature` (Vitals) | every `Creature` (composes over `ThermalMixin`) |

⭐ **Food is a Thermal host, and that is not decoration.** `Prop` and
`Provision` — the classes every food row in the library is over — compose
`ThermalMixin` since the cooking build, because the spoilage gauge asks
its host what temperature it is. A cold larder and a warm windowsill are
then different answers to the same question, for free, and preservation
becomes a subject rather than a flag. Thermal is reconcile-on-read and
costs nothing until something reads it, so the anvil and the toilet carry
it unharmed. See [spoilage.md](./spoilage.md).

A bare `Thermal` object drifts toward ambient. The regulation layer
defends a setpoint by spending metabolism's reserves; when it fails (out
of fuel, an ectotherm, a corpse) the body falls back to the passive
`ThermalMixin` drift.

## `ThermalMixin` — the generic capability

Lazy reconcile-on-read mirroring metabolism: a stamped temperature
(`stampedTemperatureK`) + a game-time stamp (`thermalClockStamp`), a
`WorldClockApi.getNow()` now-source that returns `null` (idle) when no
clock is bootstrapped, a first-touch seed, a linkdead freeze, a far-past
absence guard (`MAX_REASONABLE_GAP_SEC`), and the `_thermalReconciling`
reentry guard.

- **`getTemperature(): Quantity<'K'>` is SYNC.** It reconciles against
  the **cached** ambient (`lastAmbientK`) with the closed-form Newton's
  step `T(now) = ambient + (T0 − ambient)·e^(−Δt/τ)` — no biome call on
  the read path. Exact for a piecewise-constant ambient, so no
  sub-stepping.
- **`restamp(): Promise<void>` is async** — the one `await` in the model.
  It freezes the current temperature under the *old* `lastAmbientK`,
  resolves the new scope's ambient (`BiomeApi.resolveTemperatureFor`),
  and re-anchors. Every ambient discontinuity fires it.
- `getSurfaceTemperature()` blends core↔ambient by the medium exposure —
  a sealed, high-R vessel reads ~ambient though its contents scald (the
  surface-vs-contents sensory gate); a bare object reads ~its own core.
- `getContentsTemperature()` is the held-fluid temperature (= the
  object's own temperature for a vessel whose Thermal IS its contents).

### Cached-ambient (the load-bearing decision)

`getTemperature()` reads `lastAmbientK`, never the async biome chain.
This keeps the read sync — critical because the body's `getVitalSign`
override (below) would otherwise force the *entire* vitals read surface
async. The cache is refreshed only at **re-stamp events**; correctness
rests on every ambient change firing one:

1. **Containment move** — `ThermalMixin.onMoved` (the witness
   `ContainmentApi.move` fires on every mover) calls `restamp()`. This is
   the one event thermal listens to (the genuine divergence from
   metabolism's pure-lazy model — a sync read can't lazily re-resolve, so
   a move that didn't re-stamp would drift toward a stale ambient
   forever).
2. **In-place ambient shift** — `AtmosphericMixin.setTemperature` fans
   out `restamp()` over the scope's Thermal contents.
3. **Seal toggle** / **bulk transfer** — see the thermos.
4. **A furnace's lit state changes** — `FurnaceMixin.restampHeated()`
   fans out over the furnace's **heat scope** from `_setLit()` and from
   the burnout branch of `reconcileFurnaceFuel()`. The same shape as (2).

### ⭐⭐ The furnace couple — a heat source that HOLDS you outranks the biome

`restamp()` asks `heatSourceK()` before it walks the biome chain: if the
host's container is a lit, fuelled `Furnace`, or the host **rests on**
one, that furnace's `getHeldTemperatureK()` **is** the ambient.

The couple is read here, on the body being heated, rather than added as
a furnace term to `BiomeLogic` — because `resolveTemperatureFor` walks
`Atmospheric` ancestors and a `Furnace` deliberately is not one: **a lit
forge must not warm the room it stands in.** The distinction the couple
preserves is exactly that one — *inside the fire* is not *near the
fire*, and near-the-fire already has its own mechanism
(`Furnace.heatContents`, a radiant walk over the furnace's room
SIBLINGS, for Meltables only).

⭐ **The firebox stays pinned; what climbs is what is in it.**
`FurnaceMixin.getTemperature()` is unchanged — a lit furnace is hot
instantly, with no warm-up. The body inside drifts toward that held
temperature over **its own** `τ = R·C`, so a loaf takes loaf-time and a
pot of water takes pot-time, and `reconcilePhase` still pins boiling
water at 373 K inside a 500 K oven. An oven's own thermal mass is a
deferred seam, not an omission.

`Oven` composes **both** `ContainerMixin` and `PlacingMixin` (a range is
a firebox you put a loaf in *and* a plate you stand a pot on — the
shipped kitchen-range row's prose already said so); `Campfire` composes
`PlacingMixin`. `Forge` and `Kiln` compose neither: a forge is not a
chamber, and its Meltable path is the radiant one.

### ⭐⭐ The cold twin — `holderK()` and a Coolbox

The rule under `heatSourceK` was never about heat: **what HOLDS this
body outranks the biome chain.** A shut icebox holds its contents
exactly as a lit oven does, and the chain cannot answer for either,
because a `Coolbox` is not `Atmospheric` and must not be — *a cold box
does not cool the kitchen*, for the same reason a lit forge does not
warm the room.

So `restamp()` and `refreshAmbientFromEnvelope()` each ask, in the
same position and in this order: `heatSourceK()` → `holderK()` → the
chain. ⚠ Both sides must ask identically; the day they disagree is the
day a box keeps its cold on one path and not the other, which is why
the scope read is one shared `ambientScopeOf()`.

`CoolboxMixin` (`lib/thermal/Coolbox.ts`) composes on a
`Container & Thermal & Sealable` host and adds two reads:

- **`coldestMass()`** — the contained `Thermal` with the lowest
  temperature, or null.
- **`getContentsTemperature()`** — overridden: the coldest mass while
  the lid is shut, else the box's own body. ⭐ A READ, computed each
  time, never a cached ambient: `restamp` rewrites `lastAmbientK` from
  the chain on every move, so anything stashed there is undone by the
  next thing put in the box. The box's walls staying near the room is
  not a fudge — it is what a zinc-lined chest full of ice is, and it
  is why `getContentsTemperature` and `getTemperature` are two
  methods.

And two seams in `ThermalMixin`, both on the **body being held**:

| seam | what it does |
|---|---|
| `holderK()` | a body in a shut Coolbox takes the box's interior as its ambient |
| the lent-insulation clause in `effectiveR()` | the **coldest mass** borrows the box's `insulationR`, so the ice warms toward the ROOM through the walls |

### ⭐⭐ Two questions, one step apart: *what holds me* vs *what air reaches me*

`Thermal` asks both, and they are different functions in the same file:

| | function | question | reader |
|---|---|---|---|
| **holder** | `ambientScopeOf` | the immediate enclosing placement host, else the container — **one step** | `enclosingCoolbox`, because what you are IN outranks the room and an icebox two hops away is not holding you |
| **air** | `airScopeOf` | the nearest scope outward that is `Atmospheric` — a **walk**, under the same depth cap the biome chain uses | both ambient paths, pull (`refreshAmbientFromEnvelope`) and push (`restamp`) |

They were the same call until the base-class narrowing build. Before it a
bag WAS atmospheric (every `Vessel` was), so one step always landed on
something with air — it just had no *envelope*, and that is the defect:

> ⚠⚠ **A perishable in a bag was frozen at whatever ambient it was
> stamped with when it went in.** Carry a loaf from a cold street into a
> warm bakery and it stayed street-cold indefinitely, with nothing in the
> game saying so. The pull side asked the bag for
> `envelopeTemperatureLast()`, got `null`, and left the cached ambient
> alone; the push side resolved the bag's own temperature, which walks
> the chain for the BIOME value and so missed the shop's envelope. Two
> paths, one cause.

⭐⭐ **And "one step outward" would not have fixed it** — measured, not
argued. **A worn bag's container is the WEARER**: a `Creature` is a
`Container`, so bag → carrier → room is two hops and the carrier has no
air either. Capping the walk at two turns exactly one case of
`Thermal.bagged.test.ts` red — the worn one, which is the journey a
player actually takes.

⭐ **A documented limit, asserted so it stays visible:** the holder read
stays immediate, so a loaf in a bag inside a shut icebox reads the
**room**, not the cold. What holds the loaf is the bag.

⚠⚠ **The coldest mass is excluded from `holderK`.** It is the thing
MAKING the interior cold; handing it its own temperature as ambient is
a body in equilibrium with itself — no drift, no melt, no clock. It
reads the room instead, through the borrowed walls. That is the whole
clock an icebox runs on, and it is asserted directly.

⚠ `effectiveR()` runs on every reconcile of every Thermal body in the
game. Both clauses short-circuit on the enclosing scope not being a
shut `Coolbox` before any other read — for a body standing in a room
that is one mixin lookup answering no.

### τ = R·C

- `C = mass × specificHeat` — `Tangible.getMass()` × the host's
  `Material.getSpecificHeat()` (falling back to a dial). A `Bulkable`
  vessel derives `C` from its **contents** (more fluid → larger C →
  slower cooling).
- `R` = series resistance: the surrounding medium's conductivity
  (`BiomeApi.conductivityOf`, dominant) + the wall material's (minute)
  + ⭐ **any insulation lent by a shut `Coolbox` holding it**, for the
  one body that is making the cold. A sealed `Sealable` host switches
  its barrier to `vacuum` (τ in hours); open collapses to the air term
  (τ in minutes).

⚠ **`R` is geometry and material, not mass** — which is why a bare
block of ice has a tiny `R` and an enormous leak. A 4 kg block left in
a warm kitchen is gone in game-MINUTES; inside a box it borrows the
walls and lasts hours. That is not a dial to tune, it is the reason a
cold box is an object worth owning, and content that keeps ice keeps
it in the box.

## The thermos (`Flask`)

`ThermalMixin(SealableMixin(BulkableMixin(Movable)))`. The vessel's Thermal
temperature IS its contents. Sealing is the barrier switch (vacuum vs
air); seal toggles re-stamp. The bulk couplings ride a gated thermal tier
on `BulkableApi.transfer`:

- **Refill** → the destination adopts the incoming temperature.
- **Partial pour** → the source's C shrinks → the remainder cools faster
  (re-anchored at the reduced capacity).
- **Mix** → same-material calorimetric blend (specific heats cancel →
  volume-weighted average), via `ThermalMixin.setContentsTemperature`.

A plain `Receptacle` (`ThermalMixin(BulkableMixin(Movable))`) is the
non-sealable case (a mug): no barrier → it cools in minutes.

## Senses (`feel`, burn)

`feel <thermal object>` reports the object's **surface** band
(`Touch.bandFor`). A sealed thermos reads ~ambient though scalding inside
— "measuring requires unsealing" is a fact of touch. The general
**scalding-band (≥ 345 K) burn hook** afflicts a `burn` trauma on contact
— wired on `feel` and a bare-handed `get`, gating on `Touch.bandFor`
(no new verb, no thermal Api). The campfire is one consumer of this
hook, not its own mechanic. Contact-touch (external) stays separate from
the body's interoceptive shiver/sweat cues (sensing its own core).

## `ThermalRegulationMixin` — the living body (Option C)

Composes on `Creature` outer of `ThermalMixin`/`MetabolicMixin`, inner of
`LoadBearing`. Drives `coreTemperature` by overriding **`getVitalSign`**
(the `getReserve` analogue) — and it stays **SYNC** because the reconcile
reads a **cached effective ambient** (`effectiveAmbientK`), never a live
biome call. Every cockpit poll, condition cascade, and `getConditionBand`
read sees a reconciled core temp.

The per-slice reconcile (mirroring metabolism's skeleton) branches on the
thermoneutral dead-band:

- **Within `[setpoint ± band]`** → pin core at setpoint, zero cost.
- **Below band (cold stress)** → spend **satiation** ∝ gap to hold the
  setpoint; shiver cue. Out of fuel → drift (the "starving = cold"
  cliff).
- **Above band (heat stress)** → spend **hydration** ∝ gap to sweat,
  capped by the **wet-bulb evaporative ceiling**; sweat cue. Past the
  ceiling or out of water → drift up.

**Strategy split** (`BodyPlan.thermalStrategy`): an **endotherm** defends
the setpoint; an **ectotherm** / dead / no-spendable-reserves body floats
to the effective ambient (the robot/corpse limiting case — no special
case). `effectiveAmbient()` (a `protected` re-stamp-time resolver, **not**
an Api) sums biome ambient + occupied warming-slot `warmth` + the
wind-chill (cold) / heat-index (hot) transforms read through the
surrounding-medium conductivity (immersion: cold water chills far
faster). Worn `clo` widens the comfort band downward.

### ⭐⭐ Worn insulation is SURFACE-WEIGHTED PER PART, and `clo` DERIVES

Both halves changed in the textiles build, and both were the same
defect: a number that should have come from physics was a flat sum over
an authored field.

**`clo` derives.** The persistent `clo` field on `WearableMixin` is
gone. A wool coat is warm because wool conducts at 0.04 W/mK and its
form traps air:

```
clo   = (t / k_eff) / R_CLO           R_CLO = 0.155 m²·K/W
t     = mass / (density × A_covered)
k_eff = k_fibre·(1 − loft) + k_void·loft
k_void = k_air·(1 − s) + k_water·s    s = wetness × min(1, wAC / ABS_REF)
```

⭐ `loft` is the **construction form's**, which is why *form sets the
band* is not merely an ordering rule — a knit traps air and a plain
weave does not, so the same wool insulates differently by how it was
made. `A_covered` comes from the garment's own `slotClaims`, so it
states its `clo` **with no wearer** (the inspection card needs that).

⭐ **Wet cloth is a different object.** Water floods the loft, and the
loft is where the insulation lived — `k_water` is 23× `k_air`. Wet wool
retains more than wet linen because `waterAbsorptionCapacity` differs
(33% vs 20%), not because anything is special-cased. And `getMass()` is
wetness-aware on `Tangible`, so a soaked cloak is genuinely heavier to
encumbrance. ⚠ **Organisms are excluded from that**, deliberately: flesh
authors a 25% absorption capacity, so without the carve-out a rained-on
character would gain a quarter of their mass and move carry capacity,
thermal mass, basal drain and the mass-scaled fist at once. A body's
water is metabolism's business.

**The sum is per part.** `wornInsulationKelvin()` now reads
`Attired.bodyInsulation()`, which weights each part's covering by its
share of the body's surface — Meeh's law (`m^(2/3)`) over the tissue
masses `BodyPlan.bodyParts` already authors, organs excluded. ⚠ A
body-wide sum **cannot** teach that bare extremities cost you: gloves
and a cloak of the same clo were worth exactly the same, and going out
with nothing on your hands was free. Now a bare hand costs its surface
share and a cloak beats a shirt because it covers more.

**Wind.** `windproofing()` is the surface-weighted average of each
part's **outermost** layer's `weaveDensity`, discounted by that layer's
wetness, and it scales the wind-chill term down by
`textiles.windproofWeight`. ⭐ There is no `shell` role word: *the dense
oiled thing simply is one*. A jumper under an open coat does not break a
wind, and a soaked shell stops working.

### Cascade → conditions

`reconcileThermalCascade` spawns/clears seeded `Condition` Ideas off the
driven core (the metabolism cascade pattern): **hypothermia** (endotherm)
or **torpor** (ectotherm — alive but immobile, read by
`requiresConscious`) below `survivableMin`; **hyperthermia** above
`survivableMax`. Lethal dwell → `setCauseOfDeath` + `setLifecycleState
('dead')`. Seeds: `seeds/lib/thermal/conditions/`.

### Q10 (the metabolism edit)

`MetabolicMixin.thermalMultiplier()` (previously inert) reads the driven
`coreTemperature` and scales basal drain by `Q10 ^ ((core − reference) /
10)` (dials in `METABOLIC_DEFAULTS`). An endotherm pinned at setpoint ≈ 1;
an ectotherm whose core floats cold burns far less fuel.

### The warming slot — outdoor proximity without geometry

The engine has no positions within a room, so a naïve campfire would
warm the whole room uniformly — wrong outdoors, right indoors. The
split rides `SkyExposedMixin`: **indoors**, trapped convection would
warm the room's ambient (**still a follow-on** — not wired); **outdoors**,
the fire is radiant-only and warms nobody who isn't *at* it, and "at" is
**slot occupancy, not coordinates**. `Campfire` composes `Postured`
log-seats carrying a `warmth` attribute (alongside `restQuality` — the
same seat that lets you rest also keeps you warm), read by
`ThermalRegulationMixin.effectiveAmbient()` when occupied. **Capacity is
the huddle limit**: the number of seats caps how many bodies the fire
warms, for free — no distance math, no collision geometry, just how many
logs there are. This is the shipped instance of a general pattern
(microclimates as *occupiable* features, not *located* ones); a generic
"any hot `Thermal` object radiates to nearby bodies" read (a hot rock,
not just an authored fixture) remains open — see
[thermal-slate](../slates/tails/thermal-slate.md).

## ⭐⭐ The internal heat load — heat that is not the weather's

**The regulation model was ambient-only, and that was a hole.** A body
inside its comfort band was pinned to the setpoint **at zero cost on
every slice**, which meant heat put INTO it was erased on the next read.
`ThermalMixin.depositHeat` worked on objects and did nothing at all to a
person — so the η < 1 losses `arcane-science.md` places squarely in the
caster had nowhere to land, and its published claim that *"Destroy·Fire
is limited by thermoregulation, not by mana"* could not be true of the
engine.

- **`heatLoadJ`** (persistent, runtime state) — joules absorbed by an
  internal source and not yet shed. **`absorbHeatLoad(j)`** is the one
  writer.
- **`shedAndOffset(slice, ambient)`** runs in **every regulated branch**
  (within-band, cold-stress and heat-stress — a caster working in a cold
  room is still carrying what they absorbed). It sheds up to
  `HEAT_SHED_W` (400 W), charges the shedding to hydration on the shipped
  `HEAT_SPEND_PER_DEGREE` scale, and returns what is left as a real
  temperature: `ΔT = Q / (m·c)`. A 70 kg body is ≈ 293 kJ/K, so 1 MJ
  unshed is **+3.4 K**.
- ⭐ **This makes over-working a PACE problem, not a total one.** Space
  the load and you shed between and never warm; chain it and you
  accumulate faster than 400 W can carry away.
- ⚠ **Shedding is sweating**, so it stops entirely past the wet-bulb
  ceiling and with no hydration left. You cannot cool yourself in a
  sauna, and that is the honest failure rather than a special case.

⭐ Its first consumer is magic (a frost caster absorbs `Q + W`), but the
seam is **not magic's** — it is a plain joule load precisely so that
exertion, which wants it next, does not have to invent a second one.

### Hyperthermia starts at `setpoint + 2.5 K`

The row used to spawn at `survivableMax` — **315 K, which is heat
STROKE.** Clinical hyperthermia is a core above ~38.3 °C, so the shipped
constant named the condition at the wrong temperature, and a player who
knows physiology would have been surprised *wrongly*.

⭐ Keying it to the setpoint also separates two facts an author should be
able to write independently: *when does this species get sick* and *when
does it die*. Keyed to `survivableMax`, tuning survivability silently
moved a different condition's onset. **The lethal dwell still reads
`survivableMax`** — being ill is not the same as dying of it, and a body
that sits at 313 K is miserable rather than doomed.

## Dials

All tuning constants live in `THERMAL_DEFAULTS` (`lib/thermal/Thermal.ts`)
— τ geometry, band half-width, spend-per-degree, body specific heat,
wet-bulb ceiling, wind-chill, torpor band, lethal dwell — except the Q10
coefficient + reference, which live in `METABOLIC_DEFAULTS` (its consumer
is `basalDrain`). **Rates are playtest-tuned, not plan decisions.**

## Honest scope (the abstraction)

The skeleton is real physics — lumped-capacitance Newton's cooling,
`τ = R·C`, the standard first-order model — not a tuned curve. What's
approximated: **one temperature per object** (no internal gradients — a
log's core and its crust read the same); **tabulated effective `R`** (no
thickness/area geometry — vessel-type and garment constants fit to
realistic hold-times, not derived from wall thickness); and a **single
barrier + single wall** per object (a two-wall flask lumps to one term).
Honest engineering numbers, game-tuned — not CFD.

## ⭐⭐ The envelope — a room holds a state different from its outside

The envelope build (2026-09-24). Indoor temperature used to be a
**decree**: one biome row authored 294 K and every interior in the realm
inherited it, in January, at 4 a.m., with the door standing open.

Now a room's warmth is **derived** — it drifts toward outside at a rate
its construction and its openings set, and is pushed up by whatever is
burning in it. The state lives on `AtmosphericMixin`
(`envelopeTemperatureK` / `envelopeClockStamp` / `envelopeOutsideK`),
because *every scope that can carry an atmosphere can hold a state
different from its outside* — true of a room and of a wardrobe, and
**inert where `getVolume()` is null**, which is the geometry answering
rather than a guard.

### ⭐ Authors author CAUSES, not EFFECTS

> *You cannot author "well-insulated"; you author granite and the
> physics decides.*

```yaml
enclosure:
  material: /stuff/idea/material/rock/granite
  thicknessM: 0.45
```

⭐⭐ **`EnclosureSpec { material, thicknessM }` — and it is not the
thermal subsystem's.** It answers *what physically bounds this place, and
what is it made of*, which is one fact with several possible readers; the
envelope is the first. Its vocabulary lives at
[`lib/spatial/Enclosed.ts`](../../packages/server/src/mud/lib/spatial/Enclosed.ts),
`AtmosphericMixin` implements it, and that module carries the naming
argument — briefly: *fabric* is the right UK building term and collides
with cloth, *walls* is untrue because **a fence is not a wall**, *shell*
is `holding.md`'s word for condition and weathering, and an **enclosure**
covers drystone, palings, hedge and hurdle while also being the technical
term on this side. A pen has an enclosure and no envelope, which is why
the two are named separately.

⭐ **A vessel needs no `enclosure:` at all** — it IS matter, so its
envelope is made of whatever it is made of, and `ExitableVessel`
overrides `enclosureDefaults()` to say so: the row's `_materialPath` at a
one-centimetre wall. A box, a barrel and a carriage are millimetres of
stuff, not the third of a metre a BUILDING defaults to, and the
conduction is linear in the thickness — handing a coach a wall like a
wall would make it a thermos. ⚠ That override lived on `Vessel` and moved
to `ExitableVessel` with `AtmosphericMixin` in the base-class narrowing
build, where it would otherwise have been orphaned: no `super` to call
and no interface to implement.

A Location **names** a material exactly as it names its floor's, and
stays space rather than matter. A U-value is an *effect*, and an authored
effect is a room warm for no reason a player can be told. The 154 content
rows that already carry a real `thermalConductivity` are what make the
honest version cheap.

This **dissolves** the agreement problem rather than working around it:
a granite shopfront with a timber stockroom behind it is *a stone shop
with a timber lean-to*. The dishonesty was never *rooms differ* — it was
*rooms differ for no reason*, and a material is a reason.

### The arithmetic

`T ← Decay.toward(T, outside + P/U, elapsed, C/U)` with

- `U_enclosure = A / (t/k + R_films)` — conduction through the wall **in
  series with the still-air films either side of it** (~0.17 m²K/W).
  ⚠ Without the film term a high-conductivity enclosure is absurd rather
  than merely bad: an iron sheet computes to 16 000 W/K. With it the
  same shed is ~265 W/K, and real granite (2.9 W/(m·K)) gives a 3 m cell
  ~165 W/K instead of 435.
- `U_open = openingUPerM3 · V · n` — an open door is the inside air
  leaving, not conduction, so it scales with volume.
- `C = C_air + ρ·c·A·activeDepth` — the **skin** of the enclosure that
  answers within the hour. The stone holding the day is literally this
  term.
- `P = Σ spaceHeatOutputW()` over `SpaceHeating` contents.

⚠⚠ **A reentry guard, and it is load-bearing.** The contents walk asks
each heat source for its output; `spaceHeatOutputW()` asks `isLit()`,
which runs the fuel reconcile, whose burnout edge calls
`restampHeated()` → `ThermalMixin.restamp()` → `effectiveAmbient()` →
`BiomeApi.resolveTemperatureFor(container)` → **this room's envelope
again**. Four subsystems, each individually correct, closing a ring.
`ThermalMixin` has had `_thermalReconciling` for the same reason since
it shipped. Found by the drive as a `feel` that never answered.

⚠⚠ **No far-past guard, deliberately.** A body's long absence is a
logout and is dropped; a **room's** is a fact about the world, and a
room left overnight is cold in the morning.

### ⭐⭐ The room integrates itself; bodies READ it

`envelopeTemperatureLast()`, not `envelopeTemperatureSync()`. A body's
reconcile calling the integrating read closes a ring **through an
await**, which no per-call reentry guard catches: the room's integration
walks its contents → lighting a fire restamps every Thermal body
standing in it → a restamp resolves the room's temperature → round it
goes. Four subsystems, each individually correct, and a `feel` in a
cookhouse with a lit hearth that never answered.

⚠ It costs a body nothing in accuracy. The room re-integrates whenever
anything **resolves** its temperature — every `feel`, every `measure`,
and the body's own re-stamp path one level up — so the value a body
reads is never more than one event stale.

### Reaching bodies and food: the PULL side

`lastAmbientK` is a cache stamped at placement and movement events, and
a room whose temperature drifts *continuously* produces no such event.
So both `ThermalMixin.reconcileThermal` and
`ThermalRegulationMixin.reconcileThermalRegulation` re-read the room's
envelope at the top of their reconcile — three lines each, no scheduler,
no fan-out. The body caches the **offset** (wind chill, a warming seat,
a soaking) and re-derives on the raw number.

### ⭐ Cold is a cost, not a corpse

The cold branch was retuned by measurement (`Thermal.cold.gym.test.ts`
prints the table). Before: **every** row of sixteen was dead inside
twelve game hours, including a body in a wool coat in a 21 °C room.

- `CLO_TO_KELVIN` 2.5 → **8**, which is the number the unit is *defined*
  by: a naked body's comfort floor is 302 K, and one clo is comfort at
  21 °C, so one clo is worth 8 K.
- `COLD_SPEND_PER_DEGREE` 0.05 → **0.005**, calibrated with the cap so
  the gap shivering can close is **20 K** — which puts a naked body's
  drift target on an 8 °C night at exactly the shipped `survivableMin`.
- ⭐⭐ **`COLD_SPEND_MAX_BASAL_MULT = 5`.** Shivering peaks at about five
  times resting metabolism. The shipped branch was linear and
  **uncapped**, so a cold enough room drained the tank and the body
  **starved to death in a snowdrift** — the wrong death twice, because
  cold kills by cooling you and hypothermia is rescuable. Past the
  coverable gap the body drifts toward `ambient + coveredGap`.
- Worn `clo` now enters `bodyTau()`: insulation matters most once you
  have stopped generating heat.

## Non-goals (deliberate)

Object-to-object conduction (a hot pot doesn't warm the table),
~~ventilation (no inter-room air mixing — weather-adjacent)~~ — ⭐
**narrowed, not lifted**: a room exchanges heat with **outside** and its
openings set the rate; rooms still do not mix air with each other as a
general mechanism, and an interior doorway counts for nothing. Installed
thermal gear (augment cooling), temperature-blending glob merge, heated
vehicle cabins, sauna
rooms (the heat-index/wet-bulb *model* is in; rooms are not), campfire
fidelity tiers (smoke/cooking/spread), behavioral AI, fever content
(the movable `setpoint` is the structure only). Each rides an existing
seam when wanted.

⭐ **One of these came off the list, and one HALF of another.** *Magic
content* is the frost spell, arrived by an existing seam as this section
predicted. *Per-region frostbite* is now a **wound the engine can
express** — the `cold` channel resolving at a `body.*` site through the
covering fold (materials-response.md) — but ⚠ **only a delivered cold
blow produces it.** Cold *weather* still drives the core alone and spawns
hypothermia without ever touching a hand, which is the wrong order for a
real cold day (fingers go first). The producer is
`physiology-slate § Part 7g`. **Exertion as a heat load** joins the
list: `absorbHeatLoad` is the attach point and nothing calls it from the
body's own work yet.

⭐ **Worn insulation damps the shed rate** (injury build): `HEAT_SHED_W ·
SHED_BODY_CLO / (SHED_BODY_CLO + clo)`, one resistance in series with
another, so the parka that keeps you warm standing still is what cooks
you working hard in it.

⭐⭐ **And that `clo` is now the ONE insulation number.** The covering fold
used to score a thermal blow by a conductivity heuristic of its own; it
now reads `Wearable.getClo()` — the same derivation that widens the
comfort band and damps shedding. Three readers, one number; each keeps
its own physics (steady-state loss here, a pulse in the fold). See
materials-response.md § One insulation number, and thermal-slate § Open
questions 7 (resolved).

The Wave-2 indoor convection room-bump and a standalone
radiant-from-nearby-Thermals helper (Steps 2.1 / 2.4 indoor) are partial:
the outdoor warming-slot `warmth` path is wired end to end; the indoor
room-ambient bump is a follow-on.

## Phase change (the fire build)

the host's own `depositHeat` + `reconcilePhase` (sealed mixin methods since the Api OO sweep — `ThermalApi`/`ThermalLogic` are retired; the phase engine is module-private in `lib/thermal/Thermal.ts`; the
`api/thermal.ts` + `platform/idea/api/ThermalLogic.ts` pair — the heat-delivery /
phase-change surface `ThermalMixin` deliberately keeps off its own class).
**`depositHeat(joules)`** is the heat-DELIVERY primitive the sync model lacked
(the reconcile only *cools toward ambient*): `ΔT = Q / C`, thermal inertia
gating the rise — the same joules barely warm a heavy log but shove a shaving
hot, which is what makes ignition a derivable energy balance. **`MeltableMixin`**
(`lib/thermal/Meltable.ts`) + **`reconcilePhase`** is the bidirectional
transition engine, driven by *any* heat source (hearth / sun / fire, not
fire-specific): a solid past its material's `meltingPoint` holds a **latent-heat
plateau** (clamp temperature to the melting point, absorb the overshoot into the
accumulator until `mass × latentHeatOfFusion`) then **melts** — destructing and
flowing its mass to a molten `Bulkable` pool in the scope's `Floor`; a
liquid-holding vessel **boils** to gas above its boiling point and **solidifies**
to a cast `Thing` below its melting point. Bidirectional — **ice → water → steam
falls out of the shipped water material**. The **furnace family** (`FurnaceMixin`,
generalizing the `Campfire` pin — see [fire.md](./fire.md)) heats the Meltables
in its scope toward its held temperature; a body's `reachableHeatK()` (on ThermalMixin) reads the
hottest reachable furnace — the crafting-control read `CraftingLogic`'s heat
gate consumes (`recipe.requiresHeatK`; see [crafting.md](./crafting.md)). See
[fire.md](./fire.md) for the combustion driver + the full high-heat physics.

### ⚠⚠ What drives the phase check — a defect, fixed 2026-09-28

Until the placement build, `reconcilePhase()` had exactly **three
callers in the whole tree**: a lit `Furnace`'s heat pass, two spell
endpoints, and tests. So **nothing in the world melted from being
warm.** A block of ice on a hot floor sat at its melting point
forever with the latent accumulator untouched, because the engine
above was complete and had no ambient driver — a fire or a wizard had
to be pointed at a thing before its phase was ever reconciled.

`reconcileThermal()` drives it now, **immediately after the drift
that makes a body warm**, and narrowed to `Meltable` hosts: the
`Bulkable` freeze/boil rung has its own callers (a `CraftVessel`
drives it from its own reconcile) and widening it would double-run
them. The call sits outside the reentry guard so the plateau's own
`setContentsTemperature` is not swallowed.

⭐ It is one line on the lazy read path, and it is the reason an
icebox has a clock at all.

### ⭐ A body may author its own starting temperature

`ThermalMixin.stampedTemperatureK` is `authorable` (2026-09-28). A
*space* could always state its own (`Atmospheric._temperature` — the
279 K cold store); a **body** could not, so a row shipping a block of
ice minted one at the model's default room temperature: above its own
melting point, therefore not ice, satisfying no cold check, and
melting from the instant it existed.

Every other route to a cold solid is a **history the world plays
out** — a freeze, a quench — and an authored object has no history,
so it says so itself.

⚠ It SEEDS and does not pin: the reconcile takes over from there, so
an authored 268 K block in a 293 K room warms exactly as it should.
Content that wants a thing to *stay* at a temperature authors the
SPACE, not this.
