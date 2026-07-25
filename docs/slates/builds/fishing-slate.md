# Fishing slate (working doc)

> **Status: design captured, not built.** Fishing is the **third
> extraction vertical** and the **lightest** — a lean sibling of
> [mining](./mining-slate.md) and [farming](./farming-slate.md), not a
> full integrating vertical. It is ~90% *composition* of shipped
> substrate (the activity/engagement framework, reserves, crafting/`Grade`/
> tools, the creature/species stack, metabolism, weather, time, advancement,
> employment, the conserved economy) plus **one genuinely-new primitive: a
> catch-distribution model** read through the shipped weather/time fog, and
> **one small bespoke mechanic: the landing contest**. Where mining is the
> body-**gauntlet** vertical and farming the patient-**cultivation** one,
> fishing owns the **accessible, opportunistic, contemplative** niche —
> *panning grown up*, the socializer's low-attention income floor. It is
> also the **first real gameplay consumer of weather-as-a-system** beyond
> wetness, and the natural driver to finally build **perishability**. The
> **spatial model** bottoms out in navigable rooms as **three regimes** —
> a shore *feature* in a land room (v1, free) / a boat on a **liquid
> warren** (the elastic-graph substrate — a graph by default, a coordinate
> lattice only for the open sea) / diving the depth-layer beneath it — each
> reusing a *different* shipped spatial primitive, more body-systems
> re-admitted each step out and down.

See also: [mining](./mining-slate.md) (the precedent extraction vertical —
share its "the boring act is never the fun" doctrine, its Business/
employment/conserved-economy wrapper, its `Grade`/`ToolMixin` reuse; **read
the water** is the aquatic twin of **read the rock**) · [farming](./farming-slate.md)
(the sibling *source node*; fishing is farming's low-barrier cousin and
shares the food→craft→market loop) · [ranching](./ranching-slate.md) (the
deferred **aquaculture** tail — fish-farming is ranching-in-water) ·
[economy](./economy-slate.md) (the conservation spine; fishing is a source
node, never a faucet) · [crafting](../../subsystems/crafting.md) (the
transform stage fishing feeds; `Grade` weakest-link + maker's-mark reuse).
Substrate: [activity](../../subsystems/activity.md) ·
[reserve](../../subsystems/reserve.md) · [race](../../subsystems/race.md) /
[vitals](../../subsystems/vitals.md) (fish are creatures) ·
[metabolism](../../subsystems/metabolism.md) (eating the catch; the
spoilage tail) · [weather](../../subsystems/weather.md) /
[time](../../subsystems/time.md) (the catch distribution *is* a function of
these) · [advancement](../../subsystems/advancement.md) ·
[employment](../../subsystems/employment.md) ·
[locomotion](../../subsystems/locomotion.md) /
[respiration](../../subsystems/respiration.md) (the deferred diving tail).

Markers: **[DECIDED]** locked · **[LEAN]** recommendation, tentatively
accepted · **[OPEN]** unresolved fork.

## The niche — the accessible, restful vertical **[DECIDED]**

The three extraction verticals sort by *temperament*, and fishing owns the
one the others leave empty:

| Vertical | Temperament | Body-system load |
|---|---|---|
| **Mining** | high-commitment, high-risk *expedition* | the vitals **gauntlet** (air/heat/dark/collapse) |
| **Farming** | patient, place-bound *cultivation* | biology, slow game-time |
| **Fishing** | **low-barrier, opportunistic, contemplative** | the body's **rest** — near-zero |

The economy slate already names "fish" as one of the idle-activity reward
trickles, and the mining slate names **panning** as "anyone can try,
low-capital, low-risk — the casual/newbie extraction." **Fishing is
panning's aquatic twin:** the accessible, semi-idle, socializer-friendly
income floor — what a new player or someone parked in chat can *do*
without the mine's risk or the farm's patience. Deliberately the
**low-vitals-load** vertical: where mining drains you hard, fishing barely
touches endurance and can even *restore* a reserve (a calm activity).
**Mining is the body's gauntlet; fishing is the body's rest** — and that
complementarity is a design goal, not an accident.

## The design space — three orthogonal axes **[DECIDED]**

Everything below — different waters, different catch, dock vs. boat, nets
vs. rods, crabbing, depth — is **three orthogonal axes over one catch
substrate**, which is why the space is large but the engine is small:

| Axis | The question | Range (low → high commitment) |
|---|---|---|
| **Place** — *where the water is* | how you occupy the water | shore/bank **feature** → **boat** on a grid → **diving** a depth-layer |
| **Method** — *how you take* | tool/verb + throughput/selectivity | hand-gather → rod → trap/pot → net → commercial |
| **Noun** — *what you take* | the species (a `Creature`/forageable) | finfish · crustacean · mollusk · cephalopod · eel · aquatic plant · the apex |

They compose freely: rake clams by hand off a shore flat *(shore × hand ×
mollusk)*; jig squid from a boat at night *(boat × rod × cephalopod)*; set
crab pots off a dock *(shore × trap × crustacean)*; spear a deep grouper
diving *(dive × spear × finfish)*. **v1 pins one cell of the cube** (shore
× rod × finfish); every other cell is a named later wave that adds **one
value along one axis, never a new engine**. Underneath all three sits the
shared physics — the **water composition** (§below) every axis reads.

## The governing principle — the wait is never the fun **[DECIDED]**

Fishing inherits mining's doctrine, sharpened. Mining's core act (the
swing) is boring; fishing's core act (**the wait**) is even more nakedly
so. Every fishing system that works hides the wait inside something else —
the *catch* surprise, the *place* knowledge, the *tackle* choice, and a
brief *skill beat* at the bite. So, same resolution as mining: **not** a
twitch-minigame (wrong for a text MUD; repetition kills it), **not** a
single discrete "you caught 1 fish" click (no texture).

> **You can't make the wait fun. You make it play by making the *catch* a
> genuine surprise drawn from water you learn to read** — and by putting
> one small moment of skill at the bite.

Where mining surrounds the work with **risk and deduction**, fishing
surrounds it with **uncertainty and place-knowledge**.

## The core act — a durative engaged activity **[DECIDED]**

Fishing is a **durative engaged activity** on the shipped `EngagedMixin`/
`SustainedEngagement` substrate — the exact one mining's swing and the
manual-craft verbs (`pour`/`stir`) already use, riding game-time via
`WorldClock`/`ScheduleApi`. You `cast`; it advances toward a bite over
game-time, drawing **near-zero endurance** (`ReservedMixin`), fully
interruptible and social-compatible (you chat while you fish). Engaged-
alone would be idle grind; the play is the four layers on top — **each
already a system we own.**

## The loop **[DECIDED]**

1. **`cast`** at a fishable feature — a `FishableMixin` on a water body /
   dock / the moor pool (a shipped `Floor`-pool or a placed fixture).
2. **Tackle** — a rod (`ToolMixin` — `ToolCapability` gates *what water*
   you can work; wear on use) + **bait/lure**. Bait is a *consumable from
   another activity* (dig worms, use a caught baitfish) → a small supply
   chain, and a **stance knob**: a lure biases the hidden distribution
   toward its target species (the tackle-matching layer).
3. **The wait** — the engaged activity advances; a bite arrives on
   game-time (weather/time-conditioned, below).
4. **The bite → the landing contest** — the one skill-expression beat
   (§*The landing contest*). A big fish *fights*; you can lose it.
5. **The catch** — a fish creature (species, size, quality band), or
   **junk** (the old boot — the genre wink + a mild sink), or nothing.
6. **Downstream** — clean/fillet → cook/preserve → eat/sell.

## Where the play lives — four layers **[DECIDED]**

1. **Read the water — the catch-distribution primitive.** A fishing
   spot's **catch table is hidden** and *stochastic per cast*, but
   **partially legible**: you can learn what a spot holds, and read the
   *conditions* that shift it. This is the **one genuinely-new primitive**
   — the aquatic twin of mining's *prospecting* (read the rock → **read the
   water**) — and it is where competence lives: a novice casts blind, a
   skilled angler knows this pool runs trout at dawn and turns over before
   a storm. §*The catch distribution* details it.
2. **Push-your-luck — the gentle kind.** Not "how deep dare I go" but the
   soft greed loop: *recast or keep this one? move spots or wait out the
   tide? horse the big one in fast (risk the snap) or play it patient (risk
   the throw)?* The tension is in the **landing contest** and the
   **opportunity cost of the wait**, never in bodily danger.
3. **Progression — tackle + competence.** Rod `ToolCapability` gates the
   water you can work; competence (an *Angling* `Discipline`) gates how
   well you read a spot and how reliably you land a fighter. Growth is real
   but **non-numeric-facing** (bands only — the honesty firewall).
4. **Social — solo-viable, ambient, economy-meaningful.** Solo works (the
   loop is self-contained); it's the **low-attention thing** the chat crowd
   can do together on a dock. And the catch **feeds the larder** (the
   conserved food economy — §*Economics*), so it's income, not a number.

## The catch distribution — read through the shipped weather/time fog **[DECIDED]**

This is fishing's signature fit and what makes it *distinct* from mining.
Mining's hidden variable is **`Grade`** (read by prospecting). Fishing's
hidden variable is the **catch distribution**, and it is a genuine
function of *shipped* procedural fields — so "reading the water" is
literally reading the weather/time fog you already built:

- **Weather** (`WeatherApi.resolveWeatherFor`) — fish bite before a storm;
  clarity, precipitation, and the coming front shift the table.
- **Game-time + celestial** (`WorldClockApi` / `CelestialApi`) — dawn/dusk
  feeding windows, tides, season.
- **Biome + locality** (`AtmosphericMixin` / `AddressApi`) — the water
  body's own character (cold mountain stream vs. brackish Terminus canal).
- **Bait/lure** — the player's stance knob, re-weighting the table.

Each `FishableMixin` spot carries a **weighted catch table** (species →
weight, each entry gated/scaled by the condition function above) plus a
**junk/nothing** tail. A cast **draws once** from the conditioned table.
The distribution is *learnable* (revisit a spot, `read` it, competence
pre-reveals more of it — the mining `assay` analog) but never fully
deterministic. **[LEAN] finite-per-session pressure:** a spot lightly
*depletes* under heavy fishing and **recovers over game-time** (the
renewable-node model, OSRS-style — not strip-once), which nudges the
move-spots decision without the mine's hard re-prospect.

> **This is the first real gameplay consumer of weather-as-a-system.**
> Weather's own slate names farming as its "far economy"; fishing gets
> there sooner and cheaper — it *reads* the weather field rather than
> integrating it over a growth window.

## Water composition — the honest-science substrate **[DECIDED]**

The farming/mining doctrine (*Stardew on the surface, real science
underneath*) applied to water: what makes one water differ from another
*mechanically* is not an authored table but a **composition bundle**, and
**every field of it already has a shipped home** — water composition is the
*assembly*, not new physics.

| Field | What it drives | Rides shipped |
|---|---|---|
| **Salinity** | fresh/brackish/salt species split; preservation | `Bulkable` water as a `Material` (fresh vs. salt) + a salinity property |
| **Temperature** | which fish are active; the thermocline (with depth); a fish-kill in warm still water | `ThermalMixin` (water τ, calorimetric blend — shipped) |
| **Clarity / turbidity** | light penetration → the deep dark; sight-feeding vs. lure choice | `light.md` (`VisionModality`, `AmbientLit` dimming) |
| **Dissolved oxygen** | fish presence; a kill in warm/still/foul water (the diver's *own* air is separate) | the respiration `breathable`/`contaminant` seam |
| **Current / flow** | river vs. pond; cast difficulty; a boating hazard; bait drift | a per-cell property |
| **Contaminant / pollution** | sick fish → a **toxin dose** when eaten; the fouled-canal / dead-zone tie | the biome `contaminant` column + `Condition.toxinBehavior` |

Composition **drives the catch distribution** (§above): a warm brackish
canal and a cold clear stream hold different fish *because their
composition differs*, not because someone wrote two tables. **Reading the
water** (the competence layer) is partly reading this composition — a
shipped `analyze water` (the `analyze address`/`analyze response`
precedent) surfaces it in **bands**. Water is `Bulkable` matter *already*
(weather fills/evaporates `Floor` puddles via boundary fan-out — the
shipped weather→bulk loop), so a water-cell's composition is a small
property bundle on top of the bulk it already is.

## Depth — the third dimension and the risk ceiling **[DECIDED]**

Depth is the vertical axis, and it is **physically real, not a tag**:

- **Light falls off with depth** (`light.md`) — the deep is dark (the
  concealment/perception seam; a lamp or a sight-feeder gates it).
- **Temperature stratifies** (`ThermalMixin`) — the thermocline;
  cold-water species hold deep in summer.
- **Pressure + air** — a *diving* hazard (the vitals gauntlet:
  `RespirationMixin` air, `ThermalMixin` cold, pressure), **re-admitted
  only at the boat/dive tier**.
- **Reward gradient** — deeper = bigger/rarer catch (the apex lives deep),
  the way mine-depth = higher `Grade`. **Fishing's push-your-luck ceiling
  is depth**, exactly as the mine's is.

The crucial move: **depth re-admits the body systems, but only above the
accessible floor.** Shore fishing (shallow, from land) stays **restful** —
the niche is protected. The **deep** (reachable only by boat + diving) is
fishing's **aspirational risk vertical** — its adit→bottom gradient, its
"how far dare I go." One substrate spans the calm floor and the tense
ceiling, like the mine's three acts.

## Bodies of water — a biome-flavored taxonomy **[DECIDED; roster provisional]**

Different waters = different **composition** (§above) × **biome**
(`AtmosphericMixin`) × **access mode** (§spatial). The roster, low → high
commitment, each a water-zone with its own table and hazards:

- **Tide pool / shore flat** *(fresh→salt)* — the true floor: hand-gather
  shellfish/crabs at low tide; near-zero tackle; the newbie/casual water.
  Access = a shore *feature* room.
- **Stream / pond** *(fresh, clear, cold)* — bank rod fishing;
  trout/panfish; cozy, safe. The moor pool. Access = a bank feature.
- **River** *(fresh, current)* — flow matters (drift, wading risk); eel
  weirs, migratory runs; the Marrow. Access = bank feature → boat (a
  *linear* body — the one plausible **Warren**; §spatial).
- **Estuary / canal** *(brackish, murky, often fouled)* — the urban
  Terminus water; mixed catch, pollution/contaminant, the dead-zone-
  adjacent grey. Access = dock feature → boat.
- **Coast / bay** *(salt, tidal)* — the boat threshold; crab pots,
  netting, bigger fish. Access = dock → boat grid.
- **Open sea / the deep** *(salt, stratified, dark below)* — the apex
  water: the legendary catch, deep-diving, storms, the risk ceiling.
  Access = boat grid + dive `z`-layers.

## The landing contest — bespoke, light, restful **[DECIDED: bespoke]**

When a fish takes the hook, a **brief bespoke contest** resolves whether
you land it — the loop's single skill beat. **Deliberately NOT the combat
engine:** importing poise/tempo would drag combat's weight into the calm
vertical and break the restful tone. It is its own small mechanic on the
engagement substrate:

- A hooked fish has a **fight rating** (from species × size). The contest
  is a short exchange of **tension choices**: `reel` (gain line, raise
  strain) vs. `give` (bleed off strain, cede line / let it tire). Landing
  succeeds when the fish tires out; it's **lost** if the line strain tops
  the tackle's breaking limit (**snap** — horse it too hard) or slack lets
  the hook throw (**give** too passively). The push-your-luck is the reel/
  give dial against a fish whose remaining fight you can only *read*
  (competence sharpens the read — the fog reused conceptually, not the
  combat fog code).
- **Competence + tackle** set the margins (a better rod tolerates more
  strain; a skilled angler reads the fish's tiring and times the reel).
- **Small fish auto-land** (no contest — most casts stay frictionless and
  idle-compatible); the contest fires **only** on a fighter worth the
  beat, so the calm-vertical tone holds and the skill moment stays a
  *reward*, not a tax.
- Losing a big one is a **story, not a punishment** (you keep your tackle;
  you lost the fish and learned the spot holds a monster) — the gentle-
  greed payoff.

Value-object shape: a `lib/fishing/` `LandingContest` (pure, deterministic
per seed — the combat-gym determinism discipline), driven by an
engaged-activity holder on the `hands`/rod slot. `fishing.*` AppSettings
for the strain/tire/break dials.

## The fish — creatures, an ecology, the larder **[DECIDED]**

Fish are **`Creature`s** (the aquatic casting of the shipped Agent→Creature→
`BodyPlan` stack), not a bespoke item type — so the whole substrate reuses:

- **Fish-as-quarry.** Most are **simple non-sentient creatures** — the
  mining slate's "Pan-wild fauna: honest kills, no personhood." A caught
  fish carries **species data** (habitat / season / size range / fight
  rating), a **`BodyPlan`** (so cleaning yields *parts* — fillet, roe, oil,
  skin/scale, bone), a **`Material`** (fish-flesh tissue), and a **size ×
  quality `Grade`** (the caught-object grading, ore's analog). It dies on
  the vitals death seam when landed.
- **The water as an ecology** (the mining "deep ecology" analog, lighter).
  A body of water has a **food web**: baitfish → predators → a rare
  **apex** (the legendary fish — fishing's *white whale*, the mine Delver's
  calm-vertical twin, a landmark catch feared/sought at one authored
  water). **[LEAN] defer the full web to a later wave**; v1 ships a flat
  authored table per spot.
- **Water-breathing playable species — the latent diving seam [OPEN,
  deferred].** `respiration.md` already ships the water-breather inversion
  and `Swimmable` exists; an aquatic-adapted character could **free-dive /
  spearfish** where a landwalker must angle (locomotion + respiration lit
  up). A gorgeous seam, explicitly **deferred** — v1 is rod-and-line from
  the bank/dock.

## The catch — aquatic harvest, not just fish **[DECIDED]**

Because a fish is a `Creature`, the substrate is **species-general**, and
"fishing" is really **aquatic harvesting** — the noun axis is broad, each a
`Creature` (or a forageable plant) with a *habitat* (which water ×
composition × depth), a *method* it yields to, and a *downstream use*:

- **Finfish** — trout/bass/cod/tuna (rod, net); the staple food + the apex.
- **Crustaceans** — crab/lobster/shrimp/crayfish (**traps/pots**, hand in
  shallows) — the crabbing case; food + shell (chitin material).
- **Mollusks** — clams/mussels/oysters (**hand-gather / rake the tide
  flats**, near-zero capital — the true floor); food + shell + the rare
  pearl.
- **Cephalopods** — squid/octopus (jig/trap, night) — food + ink (a
  material/dye).
- **Eels** — (weirs/traps) — the river-migratory catch; food + skin.
- **Aquatic plants** — kelp/reeds/watercress (**foraging** — ties to
  farming) — food, material, alchemy input.
- **The apex / legendary** — the white whale (a rare landmark catch at one
  deep water — the mine-Delver's calm twin).

This is **content authorable over one engine** — the aquatic twin of the
mine's *deep ecology*, and most of it ships as **data** (species + habitat
+ method + use), not code.

## The method ladder — hand, rod, trap, net, spear **[DECIDED]**

The **method** axis is a clean ladder by *capital × throughput ×
selectivity × skill*, mapping onto the economy slate's idle-vs-scaled and
employ-vs-self-employ sorts. All feed the **one catch substrate**; they
differ in verb, tool, and how they draw from the table:

| Method | Draw | Capital | Selective? | Skill beat | Role |
|---|---|---|---|---|---|
| **Hand-gather** | one, on the spot | none | yes (you pick) | none | the true floor (shellfish, tide flats) |
| **Rod & line** | one per cast | low | yes (bait/lure biases) | **the landing contest** | v1; the expressive, selective act |
| **Trap / pot** | many, **passively over time** | low-mid | by design (crab pot ≠ fish trap) | none (set & return) | crabbing; the *deployed* form |
| **Net** | **many at once**, non-selective | mid | **no** (bycatch + junk) | none | the *scaled* form; sustainability pressure |
| **Spear / gig** | one, active, close | low | very | a diving beat | the aquatic-species / shallows form |

Two load-bearing points:

- **Nets & traps are the *scaled* form** — the aquatic twin of the mine's
  "idle mining → hire NPC miners." A net/pot is **passive bulk extraction**
  (deploy it; it yields over game-time — reuse the **trap/deployable**
  substrate, a placed thing that harvests on a game-clock tick, *not* an
  engaged activity), higher throughput, **no skill expression** — so it
  *caps at the boring reward*, exactly like the automated miner. **Human
  judgment (rod, reading the water) stays where the value is.**
- **Nets raise the commons question [educational + governance hook].**
  Non-selective bulk extraction **overfishes** — deplete a water faster
  than it recovers → the **tragedy of the commons**, the stock collapse.
  This is fishing's **sustainability lesson**, and it ties straight to the
  planned governance: a catch/effort limit is a **Resource Governor** lever
  (the mining slate's extraction-rate office), a water can be a
  **regulated commons** (the deep-law "work your bounds," for a fishery),
  and the depletion/recovery dial *is* the policy. Left ungoverned it's a
  race to the bottom — and that friction is the point (the mine's "friction
  is the fun," wet).

## The spatial model — how water becomes rooms you navigate **[DECIDED; one fork OPEN]**

At the end of the day it has to bottom out in navigable rooms. It does — as
**three regimes, each reusing a *different* shipped spatial primitive, each
re-admitting more of the body systems** — so the accessible floor and the
risk ceiling live on **one** substrate (the mine's adit→bottom, in water).

### Regime 1 — shore: the water is a *feature in a land room* **(v1, zero new spatial substrate)**

You do **not** navigate onto the water. A dock / bank / pier / tide-flat is
an **ordinary land room** in the existing graph, carrying (or bordering) a
`FishableMixin` **feature** that points at a **catch context** (a water
body's composition + table + depth-at-the-margin). You walk the normal land
grid; the water is a thing *in your room* you `cast` at — the way Dave's Bar
is a room with a crafting affordance. **This is the bulk of fishing content
and it is free** — rooms with a fishing affordance, nothing more. Every
body of water gets a *shore* whether or not it ever gets a *surface*.

### Regime 2 — on the water: a **liquid warren** you swim, sail, or dive **(the boat wave)**

Occupying the water body itself is a **`Warren`** (the elastic-graph
substrate — `Warren.ts`: an `Idea` coordinating live `Location`s cloned
from one template, budding/merging, host-migrated, lazily reconstituted,
subclasses supplying policy). This **corrects an over-generalization** in
an earlier draft: I reached for a coordinate grid from the *open-sea* case,
but **most bodies of water aren't open sea** — they're ponds, rivers,
marshes, coves: **irregular, branching, generated shapes**, exactly what a
Warren is *for*. So topology splits:

- **Graph-Warren is the default.** A river is a **dendritic graph**
  (reaches that branch and rejoin at confluences — the drainage network); a
  marsh is a **channel maze**; a pond/cove is a **small irregular blob**.
  None is a regular lattice; all are graphs the Warren buds along (follow
  the current to the next reach; tributaries *merge* — the mine's bud/merge,
  wet).
- **The coordinate lattice is the *special case*** — the **open expanse**
  (sea, large open lake): a featureless plane where compass navigation and
  "reveal a cell at `(x,y)`" genuinely fit. There the `CartesianZone`
  (`location.md`'s mostly-unused coordinate substrate) is right — lazy,
  deterministic-from-coordinates, residency-culled (you *reveal* the fixed
  sea, you don't *bud* it). One body, one topology; most bodies pick graph.

You enter either by **boat** (a `Vessel`/conveyance — the shipped
`Mountable`/`Drivable`) or, in the shallows, by **swimming** (`Swimmable`).
The **land↔water boundary** is a normal exit: a dock room's `board`/`wade`
exit hands you from the land-graph into the water body's edge node; the
reverse returns you to shore. The **client minimap** (the mine's navigation
feature) fills in as you go; `read`/competence pre-reveals adjacent nodes
(the `assay` analog) — the deduction layer, wet.

#### What a *liquid warren* is, in the abstract **[DECIDED]**

The real answer to "most water wants to be a Warren." A **liquid warren is
a `Warren` whose members are filled by one connected `Bulkable` fluid** —
and *that single fact* forces everything that makes water-space differ from
tunnel-space:

1. **Immersion, not walking.** You're *in/on* the medium (swim / float a
   boat / dive), not treading a floor — locomotion is `Swimmable`/boat and
   **respiration matters** (the shipped `breathableMedia` seam; an
   air-breather drowns). Each node has a *surface* you float on and a
   *volume* you sink into.
2. **A depth relation on every node.** Surface + volume + bed. The
   `z`-coordinate in the lattice case; a **`dive` exit to a below-node**
   (`DeferredDestinationExit`) in the graph case — same abstraction ("every
   water node has a below"), two addressings. This is Regime 3.
3. **Current-weighted, directional edges.** The shipped Warren's hub exits
   are symmetric; a liquid warren's edges carry **flow** — downstream is
   cheap, upstream is work, bait and boats **drift**. The current is a
   *field over the graph*. **This is the one genuinely-new mechanism** the
   liquid layer adds beyond the shipped Warren.
4. **Fluid continuity — mixing + level.** Because the members share *one
   connected body* of `Bulkable` water, composition **advects/diffuses**
   across edges (pollution spreads downstream, salt intrudes upstream at
   high tide, a warm layer sits on cold), and the **level** rises and falls
   (tide / flood / drought) covering and uncovering nodes — a **second
   elasticity beside bud/merge** (the mine *buds* to grow; the liquid warren
   *floods* to grow).

The unifying one-liner: **`Biome` is the composable *medium* of a location
when the medium is air; a liquid warren is the same idea when the medium is
a connected, flowing liquid.** Biome walks outward to give a room its
atmospheric character (temp/humidity/breathable/contaminant); the liquidity
layer gives a water-node its **hydraulic** character (the §*Water
composition* bundle) and adds flow + depth + mixing + level, because a
liquid — unlike ambient air — is a *bounded, connected body with a surface
and a current*.

**So: don't subclass per body-type.** Pond / river / lake / sea are **not**
separate Warren classes — that's the type-explosion the house style forbids
(the mine ships *one* Warren + a generation grammar + data, not a class per
mine). Instead, **two orthogonal choices + data**: a **liquidity layer** (a
mixin/medium — the shared "what makes it water," the `AtmosphericMixin`
precedent) composed over a **topology** (graph-Warren default | lattice for
the open expanse — a ~2-shape grammar), with the **body-type** falling out
as *liquidity-params × topology × authored data* — a still pond is "small
liquid graph-warren, zero current, no budding"; a river is "linear liquid
graph-warren, strong downstream current, buds at confluences"; the sea is
"liquid lattice, tidal, deep." Same engine; the variety is parameters, not
classes.

### Regime 3 — under the water: **depth is the vertical relation** **(the diving wave)**

Every water node has a **below** (§*What a liquid warren is*, point 2). In
the **lattice** (open sea) that's literal — `CartesianLocation` is already
3-coordinate (`x,y,z`), so a dive is **moving down `z`** into a depth-layer
cell (`z<0`) beneath the surface cell. In the **graph-Warren** (river / pond
/ lake) it's a **`dive` exit** from the surface node to a below-node
(`DeferredDestinationExit`, budded on descent). Either way, from the surface
you `dive` into the volume. Light falls off with depth (`light.md`),
temperature stratifies (`ThermalMixin`), and air / pressure / cold become
the **vitals gauntlet** (`RespirationMixin` — the water-breather inversion +
`AirTank`; the mine's danger stack, wet). Aquatic species / diving gear gate
it. **The whole water body — the surface nodes + the depth-layers beneath —
is one warren/zone**: the point where fishing's risk ceiling finally touches
the body systems the shore floor deliberately spares.

### What keeps the water-grid *safe* and *alive* — the mine's two systems, wet

- **Residency** bounds it (cells near active boats stay live; the rest go
  dormant → evict → regenerate identically) — a sea vast when seeded, small
  when live.
- **Weather** drives it (the shipped weather→bulk loop that already
  fills/evaporates `Floor` puddles): a storm roils the surface cells (a
  boating hazard + the pre-storm bite), floods the shallows, stratifies the
  calm; the sea **breathes with the weather** the way the mine breathes
  with residency.

**The synthesis:** *water is a zone; how you occupy it scales with
commitment.* **Shore** = a feature in a land room (free, v1). **Boat** = a
**liquid warren** you enter by vessel — a graph by default, a lattice for
the open sea (the boat wave). **Dive** = the depth-layer beneath each node
(the vitals wave). Three tiers, three shipped primitives, more body-systems
each step down — the calm floor and the deep-sea ceiling on **one navigable
substrate**.

## Current & tide — the dynamics that drive the loop **[DECIDED]**

Water composition (§above) is the *static* bundle; **current and tide are
the *dynamics*** — and they touch **every stage** of the loop, which earns
them their own section (the weather-vs-biome split: dynamics separate from
medium). Two facts unify them and keep them cheap:

- **Current is a field; tide is a clock; in tidal water the current *is*
  the tide's derivative.** Flood tide flows in, ebb flows out, slack at the
  turn is no flow — so **one celestial clock drives the whole rhythm.**
- **Both are derive-on-read, not simulated.** Tide is a **stateless
  procedural field over game-time + moon phase** (`TideApi.tideAt(time,
  water)` pure — the `WeatherApi.weatherAt` precedent, computed off the
  shipped `CelestialApi`; **no tick, no stored state, presence-free**). The
  current field is mostly derived too: a static riverine flow authored with
  the graph edges + a tidal component that *derives from `tideAt`*. **No
  fluid-dynamics sim** — a read, not a solver. Both are **deterministic**,
  so they add **zero new dice**: the catch draw stays the only randomness,
  and the landing contest stays bit-for-bit reproducible.

### Current — the flow that shapes every stage

| Loop stage | What current does |
|---|---|
| **Cast / presentation** | Bait **drifts**. You cast *up-current* and let it dead-drift down (the natural presentation); casting against the flow reads wrong and spooks fish. The **current seam** — slow water beside fast — is the **feeding lane** where fish hold (eating what the flow brings), so current shapes the catch **spatially within a node**; finding the seam is the competence. |
| **Wait / bite** | Moving water **feeds** → current is a bite-cadence input: slack is sluggish (slow bites), moderate flow feeds best, blown-out fast water shuts off — a window you read and chase. |
| **Landing contest** | The fish **uses the flow** (turns into the current → higher effective fight), and the reel/give gains a **direction**: muscle it *upstream* (high strain → snap) vs. let it *run downstream* and follow (cede line → snag risk). Current's own loss-mode is the **snag** (a fish runs into structure under flow, breaks you off) — distinct from still-water's throw-the-hook. |
| **Boat** | Current pushes the boat (holding position is work — an anchor, or endurance). And it mints an emergent method: **drift-fishing** — let the flow carry you across nodes, fishing as you go (the aquatic idle-drift; restful, opportunistic, on-niche). |
| **Traversal** | Downstream cheap, **upstream the haul-back** — a trip's shape is fish-your-way-down, then work back (the mine's "how far before I turn around," wet). |

### Tide — the clock that opens windows *and rooms*

- **The bite window.** Fish feed on the **moving** tide (flood/ebb), barely
  at slack — "fish the tide." A predictable daily rhythm (semidiurnal — ~two
  highs/lows) you learn and show up for (a `tide` read + a diegetic
  **tide-board** fixture), with a **monthly** rhythm layered on: **spring
  tides** (new/full moon — big range, strong current, best fishing) vs.
  **neap** (quarter moon — gentle). Honest astronomy off `CelestialApi` —
  the same clock whose **sun** gives dawn/dusk feeding gives the **moon**'s
  tide.
- **The shore-flat access window** *(the level-elasticity, made playable)*.
  At **low tide** the flats are **exposed** — walk out and **hand-gather**
  shellfish/crabs (a feature room, the true floor); at **high tide** they're
  **underwater** — inaccessible on foot, now a shallow boat/wade node. **The
  same place is a different fishery by tide state, and the tide gates the
  method** — the liquid-warren "level covers/uncovers nodes" made concrete
  (the tide literally opens and closes rooms).
- **The tidal danger — the cutoff.** Walk the flat at low water, misread the
  turn, and the flood **strands** you (a channel fills behind you; the flat
  submerges). Legible, predictable, and **entirely avoidable by reading the
  clock** → the *restful floor's one opt-in edge* (friction = growth; a
  novice gets caught, a competent gatherer leaves in time), tying to the
  immersion/vitals seam if you must wade or swim back. The shore-flat's
  push-your-luck, no combat.
- **Tide × salinity** *(the estuary payoff)*. Flood pushes **salt upstream**,
  ebb lets **fresh** down → a node's salinity **oscillates with the tide** →
  the catch table shifts (saltwater species run *up* on the flood, freshwater
  hold on the ebb). The estuary is where tide + current + the fluid-mixing
  point + the table all interact — the **richest water**, and the concrete
  payoff of the liquid-warren's advection property. (Named; depth deferred.)

### The unifying rhythm

**One celestial clock, two hands:** the **sun** gives day/night (dawn/dusk
feeding); the **moon** gives the **tide** → level → tidal current → bite
cadence *and* flat access. Fishing becomes **rhythmic and readable** — learn
the tide, chase the current seam, work the windows — the doctrine made
mechanical: the play is **knowledge and timing, not twitch**, and because it
is all deterministic the wait stays calm and the only surprise stays the
catch.

**Where they enter.** *Current* arrives early and cheap — with the first
**stream/river** water (drift + the hold-seam; mostly derived, one static
flow-per-edge). *Tide* arrives with the **coastal** tier — the shore-flat
hand-gather wave (low-tide flats + the cutoff) and the boat wave (tidal
current + the estuary). **v1** (a still pond / a gentle stream) needs
neither to be complete; a stream v1 may take a *little* current as the first
taste.

## How it fits — the system map

Fishing earns its keep by *composing*, like its siblings. The seams:

- **Crafting** — fishing is an **upstream source node** (mining→forge,
  farming→kitchen, **fishing→the larder**). The transform chain: *clean/
  fillet → cook* (grill/stew — a craft branch) *→ preserve* (smoke / dry /
  **salt**). `Grade` weakest-link + the maker's-mark carry over untouched.
  Fish also yield **materials** (scale/skin, oil, bone, shellfish chitin),
  so it feeds the material economy, not only food.
- **The salt tie-in [DECIDED — the flagship cross-system click].** The
  mining slate makes **salt** "the essential staple, preservation the
  killer app." **Salt + fish = the salt-cod economy** — *catch → salt →
  keep → trade inland.* Fishing gives salt its flagship demand; salt gives
  fishing its shelf-life. Two verticals designed apart snap into a real
  interdependence — the kind of click that makes the world feel
  *discovered*, not assembled. (Coastal salt-pans + inland fisheries + the
  deep mine that eats salted provisions = one interlocked supply map.)
- **Nutrition / metabolism** — fish is the **consumer end**: cooked fish
  routes macros through the shipped digestion buffer (a distinctive lean-
  protein / oil profile). Crucially, **raw or spoiled fish is a toxin
  dose** (`Condition.toxinBehavior` — food poisoning / parasites), which is
  *why cooking and salting matter mechanically*. And a fresh catch is a
  **Law-2 "thing-in-flux"** — it spoils because you took it out of the
  water; salting/smoking arrests it. **Fishing is the natural driver to
  finally build perishability** (metabolism.md names spoilage as a deferred
  tail — fishing is its first real consumer).
- **Weather / time / biome** — fishing's signature consumer (§*The catch
  distribution*).
- **Vitals / reserve** — the **low-load** vertical (§*The niche*): near-
  zero endurance drain, possibly a calm-activity *recovery* — the body's
  rest to mining's gauntlet.
- **Advancement** — an *Angling* `Discipline` fed by an `ActSignature`
  Transcript (difficulty = spot subtlety / fish fight), competence =
  reading water + landing the fight, **bands only**, confers `cast` /
  `read`.
- **Employment / economy** — a **`Business`** (a fishery / fishmonger) with
  a fisher `Position`; conserved source node (sell for *circulated* coin,
  **no NPC faucet** — worth only what real demand pays); the market self-
  corrects (over-fish → price drops). The accessible income floor — the
  *panning* of water.
- **Place** — the Terminus watershed (docks, canals, the Mere, the Marrow)
  and the **Weeping Moor** pools give it an obvious diegetic home; the
  moor already ships as content.

## Scope — v1 and the waves **[DECIDED]**

**v1 = the minimum coherent loop at ONE authored water** (Terminus docks
*or* the moor pool): `cast` → wait → bite → **landing contest** → a catch
(fish / junk / nothing) you can **clean, cook, eat, and sell**, with the
**weather/time-conditioned distribution live** and a first **preserve
(salt)** step proving the spoilage seam. One rod, a couple of baits, a flat
authored catch table (~4–6 species + junk), the *Angling* Discipline, and
the fishery `Business` wrapper.

**Deferred waves — each adds one value along one axis, never a new engine**
(the cube from §*The design space*):

- **Noun breadth** *(cheap, mostly data)* — crustaceans / mollusks /
  cephalopods / eels / plants over the shipped `Creature`/forage substrate;
  the per-water ecology & food web; the legendary apex.
- **Method: hand-gather** *(the floor below rod)* — shellfish / tide-flat
  foraging; near-zero tackle; the true casual entry. **Tide-gated** (low
  tide exposes the flat, high tide covers it) + the **cutoff** danger (the
  flood strands the careless) — the restful floor's one readable edge.
- **Method: trap/pot** *(crabbing)* — the deployable passive-yield form
  (reuse the trap/deployable substrate on a game-clock tick).
- **Method: net + the commons** — bulk non-selective extraction; the
  **scaled form** (caps at the boring reward); **overfishing / depletion →
  the Resource-Governor sustainability lever**.
- **Place: the boat wave** — the water body as a **liquid warren** (a
  graph-`Warren` by default; a `CartesianZone` lattice only for the open
  sea) with the net-new **current field** (directional flow-weighted
  edges); the `Vessel` conveyance + the dock↔water boundary handoff;
  per-node composition/table; the minimap reuse. **Fluid mixing + tide
  level** ride behind it.
- **Place: the diving wave** — depth as the **`z`-layer** under the grid;
  the vitals gauntlet (air / cold / pressure / dark) re-admitted; the
  aquatic-species advantage (the water-breather + `Swimmable` +
  `Respiration` seam).
- **Aquaculture** — fish-farming, the **[ranching](./ranching-slate.md)**
  sibling (raise stock in a pond; the husbandry/breeding substrate reuse).
- **Commercial scale** — trawlers / crews / roles (`Vessel` + employment at
  map scale).
- **The full water-composition & seam economy** — `analyze water` bands,
  depletion/recovery tuning, regional catch maps, the salt-cod trade route
  as content, water pollution as a dead-zone / Ordinance seam.

The sequencing rule (the mine's): **v1 proves the loop; each wave adds one
axis-value and re-admits at most one more body-system.** The floor stays
restful; commitment buys the ceiling.

## Open (residual)

- **Spot model [OPEN, LEAN renewable]** — depleting-and-recovering nodes
  (steadier, OSRS-style — the lean, fits the *restful* tone) vs. mining's
  finite-deplete-and-re-prospect (drives exploration harder but adds
  friction fishing may not want).
- **Junk-catch tone [OPEN]** — the old-boot wink as a genuine sink +
  comedy, or kept rare so the loop stays dignified? Lean: rare, a garnish.
- **Bait as its own micro-activity [OPEN]** — is `dig worms` a real
  sub-loop (a tiny gathering verb) or does bait just come from the shop /
  the catch (baitfish)? Lean: both, lightly — buyable floor + a free
  dig-your-own option.
- **Where v1 lives [OPEN]** — Terminus docks (urban, economy-adjacent,
  near the bank/market) vs. the moor pool (already-built content, cozy,
  isolated). Lean: whichever is closer to a place players already stand.
- **Where the graph/lattice line sits [OPEN, LEAN graph-default]** — graph-
  Warren is the default and the lattice is the open-expanse special case
  (§*What a liquid warren is*); the residual fork is the *boundary* — does a
  **large open lake** take the lattice (open plane) or the graph (irregular
  shore)? Lean: lattice once it's big/open enough to sail by compass, graph
  while it's shaped by its shore.
- **Current field in the boat-wave v1, or deferred within it [OPEN]** — the
  directional flow-weighted edges are the one net-new mechanism; ship them
  with the first boat water (rivers *need* current) or start still-water and
  add flow second? Lean: current with the first *river*, still-water lakes
  need it less.
- **Tide model granularity [OPEN, LEAN semidiurnal]** — full two-highs-a-day
  semidiurnal + spring/neap off the moon, or a simplified single daily
  swing? Lean semidiurnal (it's a cheap pure function and the rhythm *is*
  the point); simplify only if two-a-day reads as noise rather than rhythm.
- **Cutoff danger in the first shore-flat, or deferred [OPEN, LEAN in]** —
  ship the tide-strands-you hazard with the first flat, or start with just
  the access window (flats open/close) and add the danger second? Lean in —
  it's what makes the flat *worth reading* (the reason to learn the tide),
  and it's fully avoidable, so it fits the calm floor.
- **Node coarseness [OPEN]** — how much water is one room/node? Coarse
  enough to keep the live/seeded footprint sane and navigation legible,
  fine enough that composition/depth vary meaningfully node-to-node. Tuned
  against the minimap + residency.
- **Boat as `Vessel` vs. a lighter mount [OPEN]** — a full multi-occupant
  `Vessel` (crew; the conveyance substrate) vs. a solo skiff (a lighter
  `Mountable`). Lean: skiff first (solo), the crewed boat arrives with the
  commercial wave.
- **Numeric tuning** — bite cadence, distribution weights, strain/break
  curves, depletion/recovery rates, cell coarseness. Tuned against a
  running game.

*(Retire when: the mechanic promotes to formal requirements, or folds into
a gathering/livelihood build that adopts water-extraction.)*
