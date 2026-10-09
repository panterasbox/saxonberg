# Underwater slate — places below the surface, and the way back up

> ⚠⚠ **The title is the bias, and § 8a names it.** This document was
> written as an **exploration** slate, so its gravity is *going down and
> surviving.* The trade half's gravity is **"what you came up with, and
> how often"** — which is why the Journey looked like the right
> primitive for a thing a worker does fifty times a day.

> **Status: UNBUILT** — designed 2026-09-18 out of the fishing rewrite,
> to be built when somebody wants it; the design is the point of writing
> it now. No underwater room, medium, column or ascent exists.
> **Left:** ⚠ **a band is not standable; its BED is** (added 2026-09-23 from the
> ground build: every Location gets a floor by default, so a water band must
> declare `noDefaultFloor: true` or the open column will be floored and
> sittable — the ground build ships the declaration and a test, not a row) ·
> the column — bands as zones, `depth` as a zone field,
> `up`/`down` derived · implicit up + declared ceilings + the reach-to-air
> gate · medium derived from the reach's level · light / temperature /
> pressure derived from depth · buoyancy as a read (density × volume vs
> the medium) and the placement rule · the ascent/descent **Journey** on
> the `swim` mode with the buoyancy load factor · the lifeline and the
> ballast stone · the tank epoch (the bends as a stop set) · per-individual
> stature (body density) · the default column for a dive-declared body
> · ⭐⭐ **§ 8 (2026-10-08), the TRADE half**: the **medium affordance
> table** (water first, vacuum second) · the surface-supply rung with the
> bends moved onto it · the bed as **ground with a cover** (forestry's
> pattern, third consumer) · **recharge as a function of the harvest act**
> · line signals · the **tide clock** · and § 8a's **two corrections to
> DECIDED items.**
> **Size:** a build — places first; hunting is the act that happens in them.
> ⚠ § 8's trade half is **its own increment**, and *salvage ships before
> harvest*.

**Sits on:** [logistics.md](../../subsystems/logistics.md) (⭐⭐ **the
Journey — a sustained engagement whose beat is one leg; every beat issues
the same `traverse`; the vehicle is present in every node; length is an
event budget; express vs local is one lane with two stop sets; the fault
table**) · [watershed.md](../../subsystems/watershed.md) (the reach and
its level) · [location.md](../../subsystems/location.md) + `SphericalLocation`
(no implicit adjacency, explicit exits) · [zone.md](../../subsystems/zone.md)
(field inheritance) · [respiration.md](../../subsystems/respiration.md)
(`breathableMedia`, the water-breather inversion, `AirTank`) ·
[thermal.md](../../subsystems/thermal.md) (`conductivityOf(water)`) ·
[light.md](../../subsystems/light.md) · [locomotion.md](../../subsystems/locomotion.md)
(`Swimmable`) · [encumbrance.md](../../subsystems/encumbrance.md)
(`LoadBearing`) · [materials-response.md](../../subsystems/materials-response.md)
(`Material.density`, `getMass()`) · [mortality.md](../../subsystems/mortality.md)
(the corpse) · [fishing-slate](../tails/fishing-slate.md) § 6 (layers; the reach
as the bus) · [hunting-slate](./hunting-slate.md) (the act) ·
[physiology-slate](./physiology-slate.md) (BMI / body density).

Markers: **[DECIDED]** with the user · **[LEAN]** · **[OPEN]**.

---

## 1. What this is, and is not **[DECIDED]**

Underwater content **operates on the same terms as content above water**
— rooms, zones, exits, brains — with a little ingenuity and narrative
licence. **Atlantis is in bounds.** It is not procgen (nobody generates
rooms), not foraging, and not fishing's: the act below the surface is
**hunting's** (stalk and strike), fishing owns angling and trapping from
above. This slate is the *places*, their physics, and the journey between
them and the air.

## 2. ⭐⭐ The invariants **[DECIDED]**

**Implicit up.** In open water, *up* is implicit the way *the sky* is
outdoors. The mine's rule inverts: there, every room needs an authored
way out and a collapse takes it; here every open-water node has a way to
the surface by default, and only a **ceiling** takes it.

> An underwater node has an implicit `up` unless it declares
> `ceiling: true`. A ceiling node must reach a node with an air surface
> through authored exits, and a gate proves it — the way `lint:locations`
> proves every location plots.

**Ceilings are declared, never inferred** — a cave, a wreck's deck, ice,
an overhang. An air pocket in a cave is a node whose level is above the
water's (the air bell divers find). A tidal cave whose mouth *becomes* a
ceiling at high water is legible, predictable, and avoidable by reading
the clock — the flat's cutoff, turned vertical.

**Depth is a number on the node; the vertical exits derive from it.** An
author writes `depth: 12` (metres below the reach's surface), never an
`up`/`down` arrow — the watershed's move (*an uphill reach is
unrepresentable*). Adjacent nodes at different depths get `up`/`down`
derived; a gate refuses a column where `up` does not shrink depth.

**Every water node cites its reach, and the reach's level is the
surface.** Medium is **derived** from `level − elevation`, not authored:
a shallow node goes dry on the ebb, a shore node goes under on the flood,
and nobody re-authors anything. The level is already the water pack's one
piece of state; tide is already a derive-on-read clock.

**Derived, not authored, from depth and the reach:** light (surface light
× attenuation by depth and the reach's clarity — never a per-room
`ambientIntensity`, the lesson Rejection's twelve dark rooms taught
forestry), temperature (the thermocline off the reach's temperature),
pressure (a *reading* until the tank epoch), and ascent time.

**Survivability is the player's arithmetic, not a guarantee.** The path
exists and its cost is derivable: depth ÷ ascent rate = the breath you
need; the water's cold is the second clock (`conductivityOf(water)` is
~25× air). The deep is legitimately deadly, as the mine's bottom is. What
must hold is *legibility* — the depth reads in the prose, the breath reads
in the body — and one principle:

> ⭐⭐ **Ascent is never gated on skill. Only on breath and ballast.**

## 3. ⭐ Buoyancy — a read, and a placement rule **[DECIDED]**

Every term exists: a material's `density`, a thing's `getMass()`, and the
medium's density (`BiomeApi.densityOf('water')`, beside `breathableOf`).
Buoyancy is `(ρ_medium − ρ_object) × volume` — no new state — and each
outcome is a placement rule:

| net | what | on `drop` in water |
|---|---|---|
| **sinks** | iron, stone, a weight belt, most tools | to the **bed** — the lowest node of the column |
| **floats** | wood, cork, a corked bottle, a body with full lungs | to the **surface** |
| **neutral** | a fish; a diver with the right ballast | stays; the **current** carries it |

Across an abstract layer the reach is the bus (fishing § 6): a floater
dropped in a concrete grotto under an abstract surface becomes **flotsam
on the reach**; a sinker dropped from a boat on an abstract reach lands in
the concrete bed room that cites it.

**The one gap is hollow things.** A sealed steel vessel floats: its
effective density is mass over *displaced* volume. `Bulkable` knows a
vessel's capacity, so displacement is `capacity + shell` for vessels; a
`displacement` field on `Tangible` covers the odd sealed thing (a diving
bell, a hull). The only addition.

**Bodies** — where the deep's push-your-luck lives:

- A body is about neutral; what you carry decides the sign. **Underwater,
  `LoadBearing` measures net negative buoyancy, not weight** — carry a lot
  of what floats, very little of what sinks. **The treasure's density is
  the danger**: a bag of pearls is nothing; one ingot is a sinker with you
  attached.
- **Ballast is deliberate**: the pearl diver's stone takes you down fast;
  **`drop belt` is the one verb that never fails** — instant positive
  buoyancy, the reason the ascent principle holds.
- **Body density is body composition** — fat floats, muscle sinks — which
  is why the physiology slate now carries per-individual stature and BMI:
  a heavy lean body needs less ballast going down and more effort coming
  up; a fat one bobs. True, derivable, and never a number anyone sees.
- The grim honest one: a drowned body sinks, then floats as decay gases
  form. `Postmortem` already stages decay; density by stage is a line.

## 4. Epochs decide the danger stack **[DECIDED]**

The medieval diver is a **breath-hold** diver — sponge and pearl divers, a
stone and a rope. So the first gauntlet is **breath + cold + dark +
buoyancy**, all shipped or derived, and *pressure is a reading*. The
**tank epoch** (`ToolMixin.epoch`, the covenant's axis) brings the bends,
narcosis, and the tank's own ballast — as tools, not code. Atlantis stays
reachable to a medieval diver with a rope and a big chest.

**The lifeline** — a rope to the boat — is the medieval "guaranteed path":
an object spanning the layers, hauled from an abstract surface into a
concrete room. Historically it *is* how breath-hold divers survived;
dropping it is the choice you regret.

## 5. ⭐⭐⭐ The column is a lane; the ascent is a Journey **[DECIDED]**

Two kinds of vertical movement:

| between | act | what it is |
|---|---|---|
| two **authored** rooms at different depths | `swim up` / `swim down` | ordinary traversal on a derived exit — a staircase, wet |
| a node and the surface (or the bed), with nothing authored between | `ascend` / `descend` | **a Journey** along the column |

⚠ **Not a `DurativeActivity` with a transient depth** — that idea left a
mid-rise encounter with nowhere to happen (neither the bed nor the
surface fits it) and was not restart-safe. Logistics already built the
right shape for wagons, and it reads unchanged with water for road:

| road (logistics) | column |
|---|---|
| the lane's nodes | **depth bands** — as many as the water's character warrants, **never one per ten feet** |
| `edgeMinutes` on an edge | the band's thickness ÷ swim rate × the **buoyancy load factor** |
| the driver engaged, the vehicle traverses | the diver engaged, the diver traverses — holding **`body`** (not the driver's `hands`), so hands stay free to fight and to drop the belt |
| the vehicle is present in every node | the diver is **in each band, for real** — a predator there is an NPC with a presence trigger in a room, not a bespoke emission |
| express / local stop sets | a breath-hold diver goes **express** to the surface; a tank diver goes **local** — ⭐ **the decompression stop is a stop set**, and the bends is what skipping it costs |
| `route-blocked` | a ceiling that closed — the tidal cave |
| `driver-incapable` | out of breath — the body goes limp and **buoyancy places it** (§ 3); the lifeline is the rescue |
| server restart | the journey is gone and you are **parked in a real band at a real depth** — restart-safe |
| being attacked does not stop the wagon | the shark biting you does not stop you kicking for the surface; stopping is your own `cancel` |

**A mid-rise fight happens in the band you are in** — a room made for that
depth, its light, its cold, its fauna — not at either end.

**Bands come from the physics, not from feet.** A water body has a
surface, a lit layer down to where its clarity kills the light, a
thermocline where the season's warm water sits on the cold, the dark
below, and the bed. A shallow clear pond collapses to **two** bands; a
deep murky estuary has five. So the **default column** for a
dive-declared body derives its band count from the reach's clarity,
temperature and depth — derivation, not procgen, and the boundaries fall
where the *experience* changes. Atlantis authors its own bands and puts
forty rooms in them.

**Every band is its own zone.** The medium's properties — depth, light,
temperature, pressure, what lives there — are **zone fields** inheriting
through the shipped chain, as `_biomePath` and elevation already do.
Twelve rooms at one depth share one band-zone and author none of it
twice.

**Coordinates are the author's choice**: `CartesianLocation` for a
gridded reef; `SphericalLocation` — exists, positions by focus and
radius, *no implicit adjacency, every exit explicit* — for a column, a
dome, a city under one. A column's exits are `up` and `down`, derived
from depth. `lint:locations` is satisfied either way.

**The top band is always concrete.** Even under an abstract surface, the
column's top node is a real room — *the surface at the Kestrel's mouth* —
whose exits are the boat and the bank you dove from; the current's
displacement over the journey (duration × the reach's flow) is *which* of
those exits you surface at, or a shore you do not know. The reach
citation binds it to the record and the bus.

**Express past a hunter [LEAN in].** A diver going express through a band
where something is hunting is present for one beat — long enough for a
presence-triggered brain to act once. The drift-by: the fast ascent is
*safer from the water and less safe from what is in it*, a real trade,
and the encounter is the band's fauna doing its job rather than a roll on
the way up. If the express diver should pass untouched, that is one flag
on the stop set.

## 6. What it costs

Nearly nothing new. The Journey, the Route value object, the per-leg
transaction boundary and its fault table are shipped; `swim` is a
locomotion mode; zones inherit fields; spherical locations exist;
respiration, thermal, light and encumbrance are shipped drivers.
Additions: **`depth` as a zone field** (+ `ceiling` on a node, `_reach`
citation); the **buoyancy load factor** in the leg budget (negative
enough and the budget goes infinite until you drop something — the
principle in one term); a **`swim`-mode Journey** holding `body`; the
**default column** derivation; `displacement` on `Tangible`;
per-individual stature (physiology). The bends is a stop-set rule at the
tank epoch.

## 8. ⭐⭐⭐ Submersion as an ACCESS MODE — the trade half

Designed 2026-10-08, from the water-trade audit
([navigable-water-slate](./navigable-water-slate.md) § 5c). ⚠ **This
document's survival half is DECIDED and its TRADE half did not exist** —
§§ 1–7 answer *how you get down and back*, and nothing answered *why you
went or what you brought up.*

### ⛔ There is no "diving trade", and calling it one was the error

Drafted first as a third RGO family beside ice and whaling. **Wrong.**
User, 2026-10-08:

> *"I wanna distinguish 'diving' as a means to an end where the end is a
> different thing… there's underwater mining, drilling, farming, all sorts
> of stuff. And then there's just 'being underwater' which threads through
> all this."*

⭐⭐⭐ **Submersion is a TAX every underwater trade pays**, and the trades
are whatever you are doing down there: gathering shellfish, mining,
salvage, construction, drilling, cable-laying. So:

- ⛔ **It is not an RGO at all.**
- ⭐⭐ **It belongs on
  [rgo-unification-slate](./rgo-unification-slate.md)'s axis 2** —
  *access mode · where it is · who can tap it* — which that slate already
  calls *"the one the whole roster needs, because it is about the
  economics rather than the fiction."* **Submerged is a missing ROW on
  that axis**; the shellfish bank is merely the first RGO that exists
  *only* behind it.
- ✅ And *a different discipline entirely* survives: the discipline is
  **being underwater**, and the same breath budget serves a gatherer, a
  miner and a salvor.

⚠ **Which also explains the roster blindness** — the RGO census
enumerated **products and places**, and submersion is neither. A family
hid in a third axis, so the census should be re-run on it.

### ⭐⭐⭐ The architecture: a MEDIUM AFFORDANCE TABLE, not a diving subsystem

The medium is **already derived** (`level − elevation`, § 2). What is
missing is one table saying **what a medium imposes**: which verbs work,
which sense and comms channels carry, what the load math is, what the
clock is.

⭐⭐ And `name-the-substrate-not-one-consumer` binds at once, because
**water is not the only medium with a table**: vacuum, smoke, mud, the
void. Same move as the `Expanse` (sea · desert · ice · space) — **name it
the medium table, implement water, let vacuum be the second consumer.**
The submarine, the space station and the smoke-filled room become one
mechanism.

### What submersion IMPOSES

⭐⭐⭐ **No fire.** No forge, no hearth, no lamp, no cooking, no kiln, no
smelt, no powder, no drying — and **light must be imported and is hard.**
That one constraint decides *which crafts can exist underwater at all*,
and the answer is almost none, which is why an underwater settlement is a
different design problem rather than a wet town. **Everything hot happens
topside.**

- **Breath** — a hard, short clock that must reserve its own exit
- **Buoyancy** — load is *net negative*, so you carry almost nothing
- **Speech fails** — Vocal is acoustic; water carries no intelligible voice
- **Sight collapses** to turbidity, and ⭐ **colour is filtered**: red goes
  first, so everything is blue-green and **blood looks black**. `Colour`
  stores **transmittance** with `over()`/`stack()` (the glass build), so
  **depth is a colour filter** on machinery that already exists
- **Cold** — water conducts ~25× air, so thermal stops being flavour
- **Pressure** — equalization, squeeze, and the bends once you breathe gas
  at depth
- **Most tools stop working** — you cannot swing against water
  resistance, cannot sieve, cannot **pour**, cannot dry
- **You cannot rest.** No sleep, no sitting, no camp. There is no staying

### What it EXPOSES

⚠ The gift half, which the exploration framing never asked for:

- ⭐⭐⭐ **The third dimension.** No land locomotion gives free vertical
  movement — a diver has **volume**, not area. A new spatial affordance,
  not a restricted one.
- ⭐⭐⭐ **Weight becomes manageable.** You can move masses you could never
  lift — **which is the actual reason hard-hat divers built bridges.** The
  medium that takes your tools away hands you a crane.
- **Preservation** — cold, dark, anoxic water keeps what the surface
  destroys. The seabed is an **archive** (with the glacier and the ice
  core, the realm's third).
- **Concealment** — invisible from above and inaudible.

### ⭐⭐⭐ A mine kills you by GEOMETRY; water kills you by ARITHMETIC

> You are never lost underwater in the sense of not knowing the way out.
> **Up is always the way out.** You may simply not have the breath to
> take it.

⭐⭐ Which is **why § 2's *"ascent is never gated on skill"* is right** —
not a mercy, the medium's actual topology. And it is the invariant the
ice edge breaks (below).

### ⭐⭐ The ladder is about what the water IS to you

Not depth and time — **relationship**, which is why each rung changes who
you are rather than what your numbers are:

| rung | the water is | how it kills you |
|---|---|---|
| **snorkel** | a **surface you look through** | it mostly does not |
| **free dive** | a **place you visit**, on one breath | you **stay** |
| **bell / pump** | a **place you work in** | you **ascend wrong** |
| **scuba / sub** | a **place you inhabit** | you **run out, far from up** |

⭐⭐ **And a snorkel is an INSTRUMENT, not a locomotion mode.** You stay
in air with your face in water and **look down**, so its function is
**reconnaissance** — survey a bed without spending breath on it. That
slots into `instrumentation.md` as a thing raising the **ceiling on a
sight channel**, and it means you can **prospect** before you commit.

### The edges

#### ⚠⚠ Tidepools — and the SIXTH orphan

A tidepool is underwater **sometimes**, so it is the first place where
**the medium itself is on a clock.**

⭐⭐⭐ **And the driver already ships while the thing it drives does
not.** `CelestialLogic` has `moonPhase`, `moonAltitudeDeg` and the
synodic month — and `fishing.md` names *"the tide clock"* **twice, as a
deferral** (*"the tide clock replaces this one function"*). **The moon
shipped and the tide it drives did not** — the sixth instance of the ice
slate's standing check, and the purest: the forcing function is complete,
pure and memoized, and nothing asks it anything.

⭐⭐ **A tidepool is the first-contact version of the whole activity:**
no equipment, no breath cost, no risk, real yield, replenished by the
tide, **at a time that is computable.** A newbie learns the lunar clock by
arriving at the wrong hour and finding water — a better tutorial than any
authored one. ⭐ And the honest danger is not deep water: **it is being
cut off by the tide**, drowning in four feet because the causeway closed.
The intertidal zone is also **`level − elevation`'s first dynamic
consumer**, since the level finally moves.

#### The trench — where diving stops applying entirely

At full ocean depth **nothing about diving is relevant.** No body goes
there; it is a **vehicle** problem, and the experience is the design:

> ⭐⭐⭐ **The water stops being a medium you are IN and becomes a place
> you are LOOKING AT through a window.** You are in a small lit room. The
> room is the entire world. Outside is lethal, and beautiful.

So the trench is a **spectating** experience with a different verb set —
look, measure, sample through a manipulator — which makes it perceiver +
instrumentation + display, **not locomotion.** ⭐ And it is the sharpest
demonstration of *medium is derived*: still water, every affordance
inverted.

- ⭐⭐ **Implosion is the only death in the game with NO CLOCK.** Bleeding,
  drowning, starving and freezing all give you time; a hull failure gives
  you nothing. Keep it as a deliberate singularity — and it is bulk's
  `sealed` rung plus materials-response, no new mechanism.
- ⭐⭐ **Chemosynthesis.** Vent life does not run on sunlight, and the
  entire rest of the realm's biology does. **The trench is where you learn
  the sun is not the only energy source** — and the resource has a genuine
  *should we*, because the vents are unique.
- ⭐ **Bioluminescence** — the only light is made by living things.
  `LightSource` ships. **A fish is a lamp.**

#### ⭐⭐⭐ Under ice — where § 2's ascent invariant BREAKS

**The ceiling is solid. Up is no longer the way out.** The hole you came
in through is the only exit, it is dark, and the line is how you find it.

> ⭐⭐⭐ **Under-ice diving converts water's arithmetic death into a
> mine's geometric death** — the only place where both apply at once.

⚠ **This is the one genuine exception to a DECIDED invariant**, and it
emerges from **two systems neither of which was built for it**
([climate-slate](./climate-slate.md) + this one). The lifeline stops
being a precaution and becomes **the map.**

### Drowning

⚠ Requested explicitly (*"we have to talk about the experience of
drowning however ugly it might be"*). The machinery is largely shipped:
`respiration`'s asphyxiation + crisis drain, `mortality`'s **rescuable
`dying` clock**, and § 5's *"the body goes limp and buoyancy places it;
the lifeline is the rescue."*

**What is true, because it decides the design.** You do not drown from
lack of oxygen first — you drown from **CO₂**, which creates an
involuntary, overwhelming urge to breathe. Then **laryngospasm**: the
throat closes reflexively, so for a period you are not taking water in.
Then hypoxia, unconsciousness, the spasm relaxes, and water enters.

⭐⭐⭐ **Unconsciousness comes MINUTES before death**, which makes
drowning **the most rescuable death there is** — especially in cold
water. Physiologically true, and exactly the right design, because it
makes the lifeline, the tender and the buddy **mechanically load-bearing
instead of decorative.** The tender's attention — the thing the engine
cannot measure — decides whether you come back, and `mortality.md`'s
rescuable clock gets its best consumer.

**And the ugly part is a design finding.** The experience is not a
countdown; it is an escalation: **discomfort → urgency → panic → and
then calm.** Hypoxia is euphoric; people stop struggling.

⚠⚠ Which creates a transparency problem: **if the final state reads as
peace, the player may not understand they are dying.**

> ⭐⭐⭐ **The resolution is already doctrine — the three voices.** The
> *character* experiences calm; the **narrator appraises** what the
> character cannot. The character's sincere line says everything is fine
> and the narrating line says it is not. **Drowning is the case that
> proves the three-voice model is load-bearing rather than stylistic** —
> the first place where honest perception and the truth are in direct
> opposition, and **the gap IS the information.**
> ([content-craft.md](../../content-craft.md) § 2.)

Three more:

- ⚠ `exertion.md`'s *"every limit SOFT — work never collapses a body"* is
  in tension with drowning, and the resolution is clean: **the hard limit
  belongs to the MEDIUM, not the body.** You never collapse from
  exhaustion down there; you drown.
- ⭐ **The body comes back on its own schedule** — § 3's *"a drowned body
  sinks, then floats as decay gases form."* The thaw again: evidence
  arriving later, unbidden.
- ⭐⭐ **Secondary drowning.** Rescued, feels fine, dies hours later from
  water in the lungs. Fits `harm.md`'s reconcile-on-read conditions, gives
  the medic vertical a consumer, and **makes rescue incomplete** — far
  better than a binary save.

⚠ One content fact worth having: **most sailors historically could not
swim.** The people most exposed to water were the least equipped for it.

---

## 8a. ⚠⚠ The poison-pill audit — corrections to DECIDED items

Run 2026-10-08 at the user's direction: *"it's the furthest along of the
three but that also means it has the most biased design… those prior
decisions might be the support we need or they might be poison pills."*
Every **[DECIDED]** was asked whether it serves a **trade** or only a
**descent**.

⚠⚠ **The framing bias, first.** This document is titled *"places below
the surface, **and the way back up**"* — an **exploration** slate, whose
gravity is going down and surviving. A trade's gravity is **"what you came
up with, and how often."** That bias is why the Journey looked like the
right primitive.

### ⚠⚠⚠ Pill 1 — the Journey is right for an expedition and fatal for a shift

§ 5's lane/Journey model has bands, express/local stop sets, per-leg
transaction boundaries and presence-triggered predators. Excellent for an
expedition. But **a pearl diver does thirty to fifty dives in a working
day** — a Journey each, with bands and per-leg faults, makes the trade
unplayable. It is the three-year-voyage problem in miniature.

⭐ **And § 5's own table already holds the answer**: *"between two
**authored** rooms at different depths — ordinary traversal on a derived
exit — **a staircase, wet**."* So the pill is not in the model, it is in
**which half one reaches for.** Stated properly:

> ⭐⭐⭐ **A worked bed is a PLACE you occupy, not a destination you
> journey to.** The Journey is for *unauthored* column — exploration, an
> uncharted wreck, Atlantis. **The shift happens in a room**, and breath
> is the clock on how long you can *be* in it.

Which is simply mining: you do not Journey into the shaft to swing a pick.

### ⚠⚠ Pill 2 — the epoch ladder skips the rung that matters

§ 4 goes **breath-hold → tank** and skips **surface supply** (the bell,
the hard-hat and pump). Two problems:

1. ⚠ **The bends did not arrive with tanks.** It arrived with surface
   supply and compressed-air caissons — bridge builders, 1870s, *caisson
   disease.* The danger-stack is **off by a rung**, attributed to the
   latest one.
2. ⭐⭐ **It is the rung that makes this a two-person trade.** A pumped
   diver is **dependent** — his life held by a man turning a crank, paid
   by the hour. Skip it and submersion stays a solo activity with a rope,
   losing the most interesting labour relationship in it.

### ⚠ Two riders

- **Atlantis reachable by a medieval diver with a rope** — fine *if* the
  reason is that Atlantis is **shallow** (an authored depth a free diver
  can reach), not that depth is cheap. Without the rider **the epoch
  ladder has nothing to sell**, since the top of the content sits at rung
  one. **The author chooses the depth; depth is what the ladder buys.**
- **`drop belt` never fails** — the right escape hatch, but it needs an
  **economic cost** (the stone and belt are gear; historically the stone
  came up on its own line and was reused). Otherwise risk stops being a
  decision.

### ✅ Three decisions that are load-bearing support

- **"Ascent is never gated on skill. Only on breath and ballast."** Keep,
  and note *why it is good for the TRADE* and not only for safety:
  ⭐ **it puts the skill in yield-per-breath rather than in survival.** A
  trade where competence decides whether you drown is a death-check; one
  where it decides how much you bring up is a job.
- **Net-negative buoyancy** (*"a bag of pearls is nothing; one ingot is a
  sinker with you attached"*) — the decision that forces **trips, not
  yield**, and therefore forces the boat and the second worker. The
  strongest thing in the document for trade purposes.
- **Body density from composition** — a **trade-off**, never a ranking.
  ⛔ Promote the slate's *"never a number anyone sees"* from a note to a
  **prohibition**: the moment it surfaces as a ranking, body type is a
  productivity stat and it is a defect.

### ⚠ One LEAN reversed

§ 7 Q4: *"Pressure as harm at the breath-hold epoch — **none** (lean;
free-divers equalize)."* **Go the other way.** **Ear squeeze for the
untrained** is the real free-diver injury: self-limiting, nobody dies, and
it is the trade's **"you have to be taught"** moment — a first-contact
lesson delivered by your own body in the first ten minutes. Nothing is the
safer choice and the duller one.

---

## 8b. The trades behind the mode

⚠ **Not a build list** — what the access mode makes possible.

**The RGO (the first that exists only behind the mode).** Run the RGO law:

- **Reservoir — the BED, and the bed is already GROUND.** `ground.md`
  mints a floor for **every** Location, and § 2 already names the bed as
  the column's terminus. So a bed can carry a seeded field exactly as a
  `Deposit` does. ⛔ **Not fishing's derived fishery**: fishing happens at
  a boundary and *the animal decides*; here you see it and pick it up.
- ⭐⭐⭐ **And forestry is the precedent.** A `Wood` is *"ground with a
  `StandMixin` cover, derive-on-read from its own soil, **stamped only by
  the axe**."* **A sponge bank is seabed with a cover** — same shape,
  making this the **third consumer** of that pattern (the coppice `Panel`,
  the stand, the bed), which by the promotion rule is the signal to lift
  it. **The mechanism ships with a different feedstock.**
- ⭐⭐⭐ **Recharge depends on the ACT**, and this is the prize. Cut a
  sponge above its base and the holdfast regrows; tear it out and the spot
  is dead. **The conservation decision is inside the act**, made by hand,
  by someone who can see what they are doing and benefits from doing it
  wrong. So the final tranche is a complete set:

| RGO | recharge | the conservation question |
|---|---|---|
| **ice** | 1.0, every winter | **there isn't one** — the control case |
| **whaling** | ≈ 0 | pure **depletion** — whether to stop |
| ⭐ **the bed** | **depends on the act** | a **technique** |

  ⭐⭐ **It is the only one that teaches that sustainability is a SKILL
  rather than a restraint** — you do not take less, you take *correctly*.
  And coral (recharge ≈ 0, decades) means **the mode contains its own
  depletion case**, far cheaper than whaling's.
- **Act — trips, not yield.** Mining fills a cart; forestry drops a bole
  you cannot lift; ⭐ **a diver brings up a handful, over and over.** The
  bottleneck is **trips**, which is what forces the boat and the tender.
- ⭐⭐ **Credit — the share, proven cheaply.** Whaling's hard problem is
  that nobody owns a whale, so the **lay** must be a contract. **This has
  the identical problem at one-tenth the size** — a diver, a tender, a
  boat owner, a buyer, sharing a day's take. **So the share mechanism gets
  proven here before whaling needs it to work**, which is a real argument
  for ordering this first.

**The others, which are ordinary trades paying the tax.** Underwater
**mining** · **salvage** (§ 5c) · **construction** — bridge footings,
harbour works, channel clearing, and the hard-hat diver's actual job, so
submersion is also **infrastructure labour** · cable and pipe laying ·
**recovery of a body**, which is who the town sends for · and deep-sea
**nodule/vent** extraction at the industrial end.

⭐⭐ **Products must be ROWS, not a vocabulary.** The named-work test:
could an author build **a sacred cenote where you dive for offerings and
it is taboo to keep anything**? That inverts the economics, and hardcoding
shell/sponge/coral/pearl locks them out.

### ⛔ The pearl is already forbidden

⭐⭐⭐ A pearl is a textbook **variable-ratio reward**, and the deck
already ratifies the refusal ([`46-reward`](../../lenses/46-reward.md))
plus [`7-endogenous-value`](../../lenses/7-endogenous-value.md)'s
**roulette test**. So this is doctrine, not taste — and the fix is the
historical one: **the commodity was SHELL.** Mother-of-pearl was the
entire industry's income and the pearl a bonus nobody budgeted.
**The income is the work; the dream is the pearl.**

### ⚠⚠ Lens 6's honest weak point

**Unlike ice and whaling, the demand is NOT already shipped and unfed.**
Ice had the icebox; whaling had `lamp-oil` with no recipe. **Nothing in
the realm buys mother-of-pearl, sponges or coral.** Running the chain walk
backwards gives three answers, ranked:

1. ⭐⭐⭐ **Salvage is demand that already exists**, because the cargo was
   already somebody's and already priced. **So the first consumer is the
   wreck, not the shell** — *salvage first, harvest second.*
2. ⭐ **Buttons and inlay** — tailoring and textiles ship.
3. **Sponges are a cleaning tool** — couples to
   [laundry-slate](./laundry-slate.md) and room-condition.

---

## 8c. The lens pass

- **1 Pedagogy** — the strongest of the tranche. ⭐ `wind` already exists
  as **both a Discipline row and a metabolism slow stock**, driven hard by
  nothing; `awareness` reads a bed, `geology` if it is mineral. Four
  derivables: **sustainability as technique** · the breath budget as
  arithmetic · ⭐⭐ **the epochs' opposite failure modes** (staying kills
  the free diver, ascending kills the pumped one, so rung one's lesson is
  *actively wrong* at rung three) · and **shallow-water blackout**, where
  the trick that extends your time kills you **without warning**.
- **2 Expression** — ordinary case is a Location at depth with a cover
  row, **no code**; and ⭐⭐ **because the bed is ground, anything that
  works on ground works underwater.** Bespoke: a wreck, a flooded mine, a
  cenote, a temple, Atlantis.
- **3a Immersion** — ⭐⭐⭐ **you cannot talk**, and if the comms model
  lets you, the fiction betrays itself immediately and obviously. The
  historical answer is the content: **line signals**, a tiny agreed
  vocabulary of tugs — **one rope carrying air, safety and the only
  channel.** Plus the colour filter, the cold and the dark.
- **3b Participation** — ⭐⭐ **who owns a bed?** Excludable (a fixed
  place with extent) with **no title machinery**, since parcels are land.
  So a polity must invent a licence, an allocation, a season or a size
  limit — and ⭐⭐⭐ **a minimum-take rule is a conservation law the
  mechanism will actually reward**, because recharge depends on the act.
  **A law that works**, which is rare.
- **4 Values** — ⭐⭐⭐ the **take-it-or-leave-it** cut: correct technique
  costs breath and yield *now* and preserves a bank for a future you may
  not see. **The engine measures both sides exactly and cannot say which
  to choose.** ⛔ And the gauge temptation is a **"sustainability
  score"** — refuse it; it is precisely the conversion lens 4 warns about.
  ⭐⭐ Plus **the tender's attention**, which keeps a man alive and
  **cannot be measured** — lens 4 pointed at labour rather than
  distribution. ⚠ And *who goes down*: the pearling fleets ran on
  indentured and Indigenous divers with appalling mortality.
- **5 Continuity** — `descend`/`ascend`/`drop belt` answer at every rung
  ✅, and ⭐ the test catches a real leak: **if the tank epoch needs a new
  verb for a decompression stop, that is a failure** — § 5's *the stop is
  a stop set* is the correct answer. ⭐⭐ And the obsolescence has class in
  it: **the free diver is destroyed by the pump**, and the *ama* held on
  into the 20th century partly by **refusing** the technology, because the
  pump's economics required a boss.
- **6 Economy** — § 8b above; the weak point is named rather than papered
  over.
- **7 Governance** — the licence, the season, the bed allocation, the
  minimum take; **does the tender answer for the diver**, on what
  criterion, with what appeal. ⭐ The minimum-take rule is a **tier C**
  exhibit where the polity's choice has a *measurable ecological
  consequence*, which tier C has been short of.

### The Schell instruments

- ⭐⭐⭐ [`62-transparency`](../../lenses/62-transparency.md) — its Q5
  exposure is *"the clock runs while you type… move the input out of the
  pressure window."* **The breath clock IS a pressure window**, so the
  ruling is already written, and it converges with the no-comms physics:
  > **The dive is decided at the surface and executed with a tiny
  > vocabulary.** Set the plan topside; underwater the choices are few and
  > large — keep going, take this one, drop the belt.

  ⭐ Three independent constraints (Schell's pressure window, acoustic
  physics, the 12× clock) land on the same answer.
- ⭐⭐⭐ [`46-reward`](../../lenses/46-reward.md) +
  [`7-endogenous-value`](../../lenses/7-endogenous-value.md) — the pearl,
  above.
- ⭐⭐ [`66-channels-and-dimensions`](../../lenses/66-channels-and-dimensions.md)
  — *"we have one medium, so almost every interface decision is a
  **dimension** decision."* Underwater **the channels themselves change**,
  so this is a dimension decision **forced by the fiction rather than
  chosen** — the third independent arrival at per-channel this session,
  after the submarine and the comms failure.
- ⭐⭐ [`27-time`](../../lenses/27-time.md) — *"his chapter is about
  escaping time; ours about being subject to it."* ⭐ **This is the most
  time-subject act in the design**: a hard, short clock with no pause and
  no rewind, whose budget must reserve its own exit.
- [`2-essential-experience`](../../lenses/2-essential-experience.md) — the
  essence sentence, for ratification:
  > ⭐⭐⭐ **Holding your breath and reaching for something, while
  > somebody waits above.**

  All three clauses are mechanical: the breath is the clock, the reach is
  the gather, and *somebody waits above* is the tender, the rope, the
  trips and the only channel.
- ⚠ [`65-primality`](../../lenses/65-primality.md), as a counterweight —
  by his test (*could an animal do it*) **submersion scores very high**,
  which that entry calls *the enemy of pedagogy*. **The neocortex is in
  the loop only because of the cut**, so the recharge-by-technique
  decision is **load-bearing**: cut it for scope and what remains is a
  primal hold-your-breath toy that still feels good.

---

## 8d. What the audit changed

Five things to build differently:

1. ⭐⭐⭐ **A worked bed is a room, not a Journey.** The Journey is for
   unauthored column.
2. ⭐⭐ **Add the surface-supply rung**, and move the bends onto it.
3. ⭐⭐⭐ **Salvage first, harvest second** — the only part whose demand
   already exists.
4. ⭐⭐⭐ **Shell is the income; the pearl is luck** — on ratified
   doctrine.
5. ⭐⭐ **Decide the dive at the surface**; underwater the vocabulary is
   tiny.

Plus: an economic cost on `drop belt` · the Atlantis-is-shallow rider ·
ear squeeze for the untrained · body composition as a trade-off that must
**never** surface as a number · ⛔ no sustainability gauge · and the
**medium affordance table** as the actual substrate, with vacuum as its
second consumer.

---

## 7. Open

1. **The abort rule for a breath-hold diver who runs out mid-column** —
   `driver-incapable` then buoyancy places the body (lean), or the body
   stays in the band it was in (harsher, simpler).
2. **Where you surface** — the entry point by default with the current
   deciding only over long ascents (lean), or the current always decides.
3. **Ceilings and the gate** — reach-to-air within the column, or within N
   hops across authored exits; and whether an air bell counts as air for
   the gate (lean yes: it is where you breathe).
4. **Pressure as harm at the breath-hold epoch** — none (lean; free-divers
   equalize), or ear/sinus injury below a depth for the untrained.

*(Retire when: the column, the medium and the ascent Journey ship and
hunting has acted in one authored underwater place.)*
