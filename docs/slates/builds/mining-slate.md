# Mining slate (working doc)

> **Status: design captured, not built.** Mining is an **integrating
> vertical** (the [Dave's Bar](./daves-bar-slate.md) / [farming](./farming-slate.md)
> precedent) — ~90% *composition* of shipped substrate (the activity/
> engagement framework, reserves, respiration, thermal, encumbrance,
> crafting/Grade/tools, advancement, scripting, employment) plus **two
> genuinely-new primitives: a prospecting / seam-deduction layer and a
> seeded procedural Warren budder**. It is the
> **crafting economy's upstream** (raw-material extraction is where the make-
> chain starts) and the **first vertical to exercise the whole vitals stack**
> — where the bar integrates the social/economic systems, the mine integrates
> the *body/risk* ones. It also carries the **paired-mine content exemplar**
> (the Ferrow Delving / Delving 9) that teaches the good/evil mirror grammar.
>
> ---
>
> ## ⭐ STAGE A SHIPPED (metal chain, 2026-09-01) — read [mining](../../subsystems/mining.md) first
>
> **What landed**, and it is the whole upper half: the `Deposit` field and
> its one resolved read; `WorkingMixin`/`MineWarren` (⭐⭐ **the warren
> creates rooms, it does not interpret them** — every read derives from
> the room and its zone, so a hand-authored static mine behaves
> identically); the five acts; ground support as a placed `Durable` with
> refusal, the free telegraph and face-only falls; air as topology, the
> canary and the pit pony; ore, grade and pooling; the three survey
> channels, the instruments, the `geology` Discipline and the survey card;
> the mine archetype and twelve recipes; the `delves` producer beat; and
> `rejection` — the first mining town, shipping **no TypeScript at all**.
>
> **What this slate still holds that Stage A did not reach**: everything
> below the water table. No shaft, hoist, pump, drainage commons, hoist
> toll or district; no sulfides and therefore no roasting; no collapse
> entrapment, rescue clock or cascade; no deep ecology, no apex, no Hush
> cast; no tribute pitches or setting-day auction; no high-grading as an
> OFFENCE (the pooling and the honest assay shipped; detection and
> sanction want an adjudicator).
>
> ⚠ **Where this slate and the shipped code disagree, the code wins.**
> Four corrections worth naming: `MineWarren` extends the KERNEL
> `InnerWarren` (not a bespoke base); the deposit speaks METRES, not grid
> cells; the four procedural room type rows are LOCALITY content, taken as
> policy; and per-face depletion rides the ROOM, not the warren's ledger —
> which is the only way a static mine has it.

See also: [daves-bar](./daves-bar-slate.md) · [farming](./farming-slate.md) ·
[livelihood](./livelihood-slate.md) (the labor-market spine mining plugs into —
no kill-loot, income from work) · [advancement](./advancement-slate.md)
(competence = the specialization engine) ·
[crafting](../../subsystems/crafting.md) (mining feeds it; `Grade`/`ToolMixin`
reuse) · [story-bible](../../story-bible.md) (*The administered realm*, *The
Ordinance* — the Ferrow/Delving-9 mirror). Substrate:
[activity](../../subsystems/activity.md) · [reserve](../../subsystems/reserve.md)
· [respiration](../../subsystems/respiration.md) ·
[thermal](../../subsystems/thermal.md) ·
[encumbrance](../../subsystems/encumbrance.md) ·
[scripting](../../subsystems/scripting.md) ·
[employment](../../subsystems/employment.md).

Markers: **[DECIDED]** locked · **[LEAN]** recommendation, tentatively
accepted · **[OPEN]** unresolved fork.

## The governing principle — the swing is never the fun **[DECIDED]**

Survey the tapestry and every mining system that *works* hides the repetitive
act inside a loop of something else: Minecraft/Terraria (the fun is *discovery*
and *what you build*), Vintage Story (*prospecting* — geology as deduction),
Motherlode/SteamWorld/Stardew-descent (*push-your-luck* + the *haul-back*), OSRS
(*progression* + semi-idle sociability), Deep Rock Galactic/EVE (*co-op roles* +
*an economy that makes the ore matter*). None of them make the pickaxe-swing
fun, because it can't be.

> **Mining is work; work isn't fun. We make it play by surrounding the work
> with judgment, risk, and meaning — never by trying to make the act itself
> fun.** The decisions *around* the swing are the game.

This principle is also the resolution of the evil-mine paradox (below): the
sources of fun and the sources of *friction* are the same thing.

## The core act — an engaged activity, not a minigame **[DECIDED]**

**Not** a twitch-minigame (wrong for a text MUD; repetition kills it), **not** a
single discrete "you mined 1 ore" click (no texture). Mining is a **durative
engaged activity** on the `EngagedMixin`/`SustainedEngagement` substrate — the
same one the manual-craft verbs (`pour`/`stir`) already use — riding game-time
via `WorldClock`/`ScheduleApi`. You engage the seam; it advances a haul over
time and **drains endurance** (`ReservedMixin`). Semi-attended,
social-compatible, the OSRS register. Engaged-alone would be idle grind; the
play is the four layers bolted on top, **each already a system we own**.

## Where the play lives — four layers **[DECIDED]**

1. **Prospecting — deduction, and the skill that actually matters.** The seam's
   `Grade` and extent are *hidden*. Before cutting you *read the rock*: `assay`
   the face, follow the vein, judge where the good ore runs. A novice mines
   blind (waste, low Grade); a competent miner reads it and cuts the rich seam.
   **This is the first new primitive** — a seam/deduction model — and it is where
   specialization lives: competence as *knowing where to swing*, not swinging
   faster.
2. **Push-your-luck — the risk/greed engine, and the vitals vertical.** Deeper =
   higher Grade *and* more danger, and the danger instruments are our under-used
   body systems: foul air (`RespirationMixin` → asphyxiation; carry an
   `AirTank`), heat/cold (`ThermalMixin`), endurance far from the surface
   (`Reserve`), the dark (`LightSource` guttering out), the **dead-zone** (the
   *Ordinance* near-siege — a field-dead pocket), and then you **haul the load
   out** (`LoadBearing` — a greedy full load is a slow gauntlet). Every session
   becomes a *how-deep-how-much-before-I-turn-back* story. **Mining is to the
   body systems what Dave's Bar is to the social/economic ones.**
3. **Progression — tools + competence gate access.** Pick `Grade` +
   `ToolCapability` gate what stone you can cut; competence gates how deep you
   survive and how much Grade you preserve. Growth is real but non-numeric-facing
   (bands only — the honesty firewall).
4. **Social — solo-viable, multi-rich, economy-meaningful.** Solo works (the
   risk/greed loop is self-contained). A *team* splits into **emergent roles** —
   a prospector who reads, a hewer who cuts, a hauler who runs ore, a watch who
   minds the light and the dead-zone — none authored classes, all falling out of
   the systems. And because the ore *feeds the forge that feeds the Wardens* (the
   conserved economy), the grind has an EVE-style point: you mine the iron the
   world needs, not a number.

## The mine as space — a shared procedural Warren **[DECIDED]**

The mine is a **shared** elastic-graph **Warren** (`MultiLocation`: bud/merge,
live-ref hub exits — the lounge substrate), grown procedurally. What makes an
ever-deepening dungeon *safe* is already ours: **residency.** Abandoned rooms
cull and re-clone, so the mine **grows as you dig and collapses when you leave** —
which reconciles it with both conserved scarcities: **no land is minted** (the
mine is *one parcel* — the mineral claim; interior tunnels are interior space,
not new titled land, like the inside of a building), and **compute is the bound**
(only rooms near active miners stay live; the rest go dormant and evict).

**Two actions, cleanly split** (the "carve vs. boundary" question):

- **Extraction** — mining a *vein within a room* (the `Grade` face). **No new
  room;** the bulk of the engaged loop.
- **Advancement** — mining a *boundary* to breach into the next gallery. **This
  lazily buds a new room** — a deliberate, riskier act (a breach may hit bad air,
  water, or a dead-zone). So you *do* carve new instances — **on breach, not
  per-swing**, which is what stops the explosion.

**Seeded, lazy, deterministic, self-cleaning.** Generation is deterministic from
a per-mine seed + depth + branch-coordinate → **the same tunnel regenerates the
same way** (Minecraft's seeded-world model, not a roguelike shuffle — stable,
revisitable). Rooms **materialize on breach, evict when abandoned, regenerate
identically** — so the *live* footprint is bounded, the *seeded* whole is vast,
and the mine **breathes** (old workings collapse and re-form), which doubles as
the diegetic cover for the instancing (the deep is never quite the same twice).
The generator obeys the slate's own doctrine — **a room that exercises nothing is
boring, so it may only emit rooms that *do something*:** a vein, a junction, a
hazard, or a seeded *find* (a gem pocket, a flooded gallery, a dead-zone, an
abandoned Ferrow-era working with a name scratched in the wall). **Rooms are
galleries / junctions / faces, never five-foot corridor-segments** — coarse and
feature-dense.

**Navigable without being a maze.** Expansive-but-legible comes from a spine, not
a labyrinth:

- **The shaft is the backbone; egress is always known** — "up the shaft" is home;
  getting lost is opt-in, never imposed.
- **Depth is the readable progress axis** — a 1-D column with local branches, not
  a 2-D maze — and depth *is* the push-your-luck gradient, so what makes it
  navigable is what makes it tense.
- **The client minimap fills in as you enter rooms** (the general navigation
  feature — the mine just rides it), and **prospecting pre-reveals ahead:**
  `assay` populates *sensed-but-unvisited* nodes, so the deduction layer turns
  the map into a skill-driven reveal rather than blind wandering.
- **Established galleries get a shortcut home** — a `shore`d hoist/lift + the
  Warren's live-ref hub exits — so deep is expensive to *reach* once, cheap to
  *return* to.

**Depth is time — and the deep reward is Eternal steel.** The vertical axis is
also an age-axis: upper galleries are recent (Mission/Fallow workings), the deep
strata are older, and the **deepest reaches touch the buried Eternal world** —
`dead-zones` and veins of **Eternal steel** (the world's Valyrian steel — willed,
impossibly perfect, off the top of the `Grade` scale; see story-bible *Making &
metallurgy*). This fuses reward with lore: the best material is deepest because
it is oldest, and deadliest because that is where the fall is buried. Eternal
steel is **found and reworked, never smelted** — a finite conserved salvage tier,
not a farmable faucet — so the push-your-luck ceiling is archaeological, not a
grind.

**Shared commons.** Everyone in the Delving shares one graph (co-op roles hold
the shaft together); mined-out veins collapse and **regenerate on the breathe
cycle**, making the mine a *renewable shared resource* — neither strip-mined-once
nor an infinite faucet. **Guided-spine agency:** branches are seeded (you choose
*which* to open); a skilled miner may `sink` a few genuinely-arbitrary shafts
(earned agency, at navigation risk). *(Deep-branch per-team instancing rejected —
it fights the shared world.)*

## The mine as a place — the branch, the folk, the bottom **[DECIDED]**

The mine is not a resource node but a **rich vertical branch** (the NetHack
Gnomish-Mines model: procgen, but with its own society, landmarks, and systems) —
and because **depth is time**, the descent is a three-act journey through space
*and* history:

- **Act I — the worked upper galleries** *(recent labor)*: the adit and cut
  seams; where you learn the craft; cool honest dark, low danger.
- **Act II — the town-below** *(the living deep; the Mine Town analog)*: a warm,
  lit, lived-in settlement where the **mining folk** actually live — rest,
  resupply, market, shrine, community; the "safe waypoint" and the narrative
  heart.
- **Act III — the deep & the bottom** *(the buried Eternal world; the Mines' End
  analog)*: past the town the galleries plunge toward the fall — dead-zones (the
  Ordinance's deepest local toehold), **Eternal-steel** veins, and a named
  semi-unique landmark where the buried past breaks through. Deadly and priceless.

**It's a biome (depth-banded).** The `AtmosphericMixin` biome family gives each
act its *body* — and the atmosphere *is* the hazard: upper = cool/still/damp;
town-below = warm/lantern-lit/close; deep = hot (geothermal `ThermalMixin`) +
thin-or-foul air (`RespirationMixin`) + black; dead-zone = the field-drained
*wrongness* (the eerie detector). **Underground = not `SkyExposed`** — no weather;
the surface adit is the boundary where weather ends. You feel the descent in your
body as the risk climbs.

**The mining folk — a culture, not a race.** The deep is inhabited by a
**mixed-species, occupational community** defined by the deep life — its own
dialect, songs, deep-law, and Goibniu-worship — where *anyone can descend and
learn the ways; no one is born to it* (the anti-essentialist guardrail: no "mining
race"). Their origin ties the mine to the whole thesis: **they are the abandoned
commons who stayed and self-organized.** When a house walked away from its Delving
(the lapse), the miners kept it running and, over generations, built their own
governance to hold a commons no lord administered — **an accidental
proto-cooperative, the founding's thesis rehearsed in miniature, generations
early.** Their shrine is **Goibniu** (patron of honest work — the dignity-of-craft
made canon); their politics hold a live Lawful↔Chaotic stance toward the coming
Charter (recognition, or absorption?); their self-governance is the standing
answer to "who holds the mine now the lords left" — *they do*, by occupation and
custom (the Frontier-tenure question, live). *(Specific figures — a headwoman, the
Goibniu-keeper, an old prospector who's reached the bottom — are just-in-time
carves, not a roster.)*

**Gnometown — the homage, done without essentialism.** The town-below's oldest,
dearest quarter is a **gnome diaspora neighborhood** — a knowing nod to the
Gnomish Mines that stays a *cultural place*, never a racial job. Gnomes elsewhere
do everything else; **Gnometown is one characterful quarter** where a gnome
community concentrated and made a home in the deep (a diaspora-in-the-dark, the
race-allegory register), with its own architecture (low, round, cozy,
lantern-warm — the warren feel), cuisine, festival, and a craft *signature* that
is a **community tradition, not a racial essence: the gnome lapidaries** who cut
and set the gems the mine yields — the artisans and value-adders, not "the
diggers" (a deliberate flip of the laborer stereotype). The beloved heart of the
town-below and the flagship NetHack wink. *(Lampwrights lighting the deep are an
alt/additional signature.)*

**Unique branch systems** (what the deep has that the surface doesn't):
prospecting/deduction · the **dead-zone / field-drain** (the Ordinance front) ·
**Eternal-steel salvage** (finite, found-not-farmed) · the **breathe** (residency
regeneration — the deep *shifts*, never the same map twice) · **depth-archaeology**
(finds older/stranger with depth) · the **deep-folk economy** (their market,
deep-law, Goibniu-worship — a society, not a dungeon).

**One flagship + a reusable pattern [LEAN].** The Ferrow Delving is *the* carved
flagship (developed town-below, Gnometown, the bottom); "mine branch = depth-banded
biome + three-act vertical + a town-below + a buried bottom" is a **template**
other authors can drop elsewhere (other mines are lighter satellites of the one
deep society, or grow their own — author's call).

## The deep-law — the folk's self-government **[DECIDED; terms provisional]**

The folk's law is the proto-cooperative made concrete, and its *nature* is the
point: **not decreed by a lord (there is none) but accreted from below, *each rule
paid for in a death*** — law-as-hard-won-knowledge, a ledger of the ways the deep
has killed. It is the exact mirror of the Ordinance's law (imposed, optimized,
frictionless): **the deep-law is the consent the Ordinance strikes out — order
grown *by* the governed, bought in blood.**

It lives as an oral code every apprentice learns (carved at the pithead):

> *Foul not the air. Sap not the props. Flood not the deep. Answer the call. Work
> your bounds or lose them. True weight, true grade.*

Each line a domain:

- **Foul not the air / Sap not the props / Flood not the deep — the safety-law,
  gravest of all.** The deep kills everyone equally, so the mortal crimes endanger
  the *shared* life (breach a gas pocket, over-cut a load-bearing pillar that drops
  a neighbor's gallery, breach a sump that drowns the levels below) — murder-by-
  negligence of the commons, punished hardest.
- **Answer the call — the mutual-aid heart.** A trapped/lost/injured miner *must*
  be aided; the folk drop everything for a collapse or a lost light. Abandoning
  someone in danger is the deepest shame — worse than theft. *We survive together
  or not at all.*
- **Work your bounds or lose them — the tenure-law.** The deep itself is a
  **commons** (no one owns the rock, air, water, or ways); you claim a **working**
  (a vein) by *working* it, and abandon it → the claim **lapses** — *exactly how
  the folk hold the whole mine against the absent house.* Their property law
  mirrors their own origin: occupation-and-use is title, abandonment forfeits.
- **True weight, true grade — Goibniu's market-law.** Honest weight, grade, debt
  (no salting, no false ore) — the deep economy runs on trust you can't verify
  underground.

**Membership is earned, not born** (anti-essentialist): **folk** = learned the
ways + took the **deep-oath** (the oath to the call), an initiation not a
bloodline. Outsiders get **hospitality but aren't folk**; a call-refuser is cast
*out of* the folk.

**Enforcement — the Moot and the sun.** Crimes/disputes go to the **Deep Moot** (a
jury of the folk, presided by the headwoman / **Barmaster** — the real Barmote-
court lineage). Sanctions climb: **restitution** → **claim-forfeiture**
(abandonment, endangering others) → the ultimate, **exile: "cast up to the sun."**
For a folk whose world *is* the deep, banishment to the surface is the harshest
sanction; a returned exile is a **wolfshead** (killable). *Their death penalty is
the daylight.*

**A proto-separation of powers — and its fragility.** Even in miniature the roles
split: the **Goibniu-shrine keeper** (moral authority), the **Barmaster/headwoman**
(executive), the **Moot** (judgment) — the cooperative's separated powers seeded
generations early, *because fairness demanded it.* But it's oral, customary,
uncodified (the Mission's "unstructured by design" in miniature) — which is why
it's fragile, and why the Charter's *structure* is what the folk lack.

**The live political tension — recognition vs. absorption.** Deep-law predates the
Charter and is self-made, so the founding poses the folk's question: does the
polity **recognize** their self-governance and claims (Lawful folk: "at last,
protected") or **absorb** them under surface law/tenure (Chaotic folk: "the surface
reaching down to take what we hold by custom")? The whole founding question in
miniature — a live quest seam.

## The dangers of the deep **[DECIDED]**

Mining is the **non-combat risk vertical**, so the *primary* danger is the deep
*itself* (survive it, don't slaughter it); living/hollowed/human threats layer on
and **scale with depth (= time = danger)**. Every danger pairs with a **counter
that is a skill/tool** — the deep is *legible to the competent*, not unfair RNG
(friction = growth). Five registers:

1. **The deep itself (environmental — primary):** the **dark** (light guttering
   out → blind); **bad air** — *chokedamp* (oxygen-dead → silent asphyxiation; the
   **canary** dies first) and *firedamp* (flammable → your flame **ignites** it;
   the **safety lamp** is the counter); **flooding** (breach the water table →
   drown); **heat** (geothermal); **collapse** (the cave-in mechanic — over-cut a
   pillar / shoring fails → crush or *sealed-in*; counter = `shore` + read the
   rock; *the one new-mechanic hazard — see Open*); **the long way back**
   (reserve/encumbrance — overreach far from air with too heavy a load); **toxic
   ground** (arsenical/mercurial ore → a slow toxin burden).
2. **The wild of the deep (Pan — honest kills, secondary):** dark-adapted fauna,
   *wild not evil* — **blind hunters** (eyeless predators by heat/vibration; light
   lures or wards), **swarms**, a **rare apex** the bottom is feared for
   (grounded-strange, not high-fantasy). Also a **resource** (hunt →
   meat/materials — danger doubles as economy). Combat is *incidental to the
   descent*, never the point (that's the wilds' job).
3. **The hollowed & the dead-zone (the deep dread — evil's residue):** near the
   buried Eternal world the **dead-zone** (field-drained) is the Ordinance's front
   at its source — **the hollowed** (drained fauna, or people the incursion took;
   mindless; **put down as mercy/containment, never farmed, not a race**), the
   **creeping front** (the dead-zone *spreads*; folk/Wardens cordon it), and the
   **corruption seam** (linger too long → it begins to *empty you* — a
   hollowing/drift exposure; ties to alignment-drift; handle carefully).
4. **Human dangers (Law/Chaos — the contested deep):** **claim-jumpers &
   wolfsheads** (rob your load / jump your claim — licensed kills; the death-loss
   sink), **rival crews & corpo agents** (contest the Eternal steel /
   aether-tech-if-added), and **the folk's deep-law** (break the community's norms
   → *they* become the danger).

**The counters** make danger legible, not RNG: canary + safety lamp (air), `shore`
(collapse), reading the rock (prospecting = seeing danger first), the Warden
cordon (dead-zone). **A skilled miner survives what kills a novice** — friction =
growth, concrete.

**The mirror:** the Ferrow's dangers are its *life* (the source of growth, stakes,
stories, competence). **Delving 9 removed them all** (perfect air, no collapse, no
fauna, the dead-zone made comfortable) — and that safety **is** its death. *Danger
is aliveness; the machine optimized both away.*

## The deep ecology — what actually lives there **[DECIDED; names provisional]**

**Fauna, not people.** The mine's living dangers are **animals** (Pan's neutral
wild — honest kills, no personhood), *not* a "mine race" — the **people** of the
deep are the mixed-species folk (Gnometown &c.). Grounded in **real cave biology**
(blind, pale, elongated troglobites; energy-poor food webs) with a **strange
finish**, going **aether-touched** near the buried Eternal world. It is an
**ecology, not a monster list:** an energy-poor food web (wash-in + guano up top,
an aether/mineral base at the bottom), and — the key gradient — **the deeper you
go, the more life fades and *warps toward the hollow*** (Pan's wild → aether-touched
→ the hollowed of the dead-zone). Depth is an *aliveness* gradient bottoming out at
the wound.

**By band:**
- **Upper workings** *(mundane, wash-in/guano energy)* — **gallery-crickets** &
  springtails (harmless detritivore base), **delve-rats** (ubiquitous breeding
  pest — the rothe wink; mild swarm danger, desperation-meat), **cave bats**
  (guano feeds the web; startled-cloud hazard), **glowcap & molds** (wall fungus —
  some **bioluminescent** and *cultivated by the folk for light*, some edible, some
  toxic — a three-axis resource; the mold/lichen wink).
- **Middle deep** *(true troglobites — blind, pale, colder)* — **pale crawlers**
  (eyeless venomous centipede-predators hunting by vibration — the signature blind
  hunter), **lattice-spiders** (web the galleries, ambush — the cave-spider wink;
  silk resource), **grotto-olms / blind eels** (the flooded-sump ecology; food),
  **pale grazers** (blind fungus-grazing "cave-kine" — predator prey, and
  *semi-herded by the folk* = subterranean pastoralism), **lantern-moths**
  (light-lured — the "your flame draws them" swarm).
- **The deep & bottom** *(aether-touched, sparse, strange)* — the **apex: the
  **dirt dragon** — *the Delver* to the highland folk, *dirt dragon* on the
  frontier, **one species under two names** (establishing that is a real act of
  survey work). A great blind thing, ancient and territorial, drawn to the
  vibration of greedy digging (the dread — "dig too deep and you wake it"; a
  rare landmark-creature, grounded-strange).
  **⚠ Revised 2026-08-29 — it moves through SOFT GROUND, never rock.** The
  earlier *swims-through-rock* reading is retired: a rock-swimming apex has
  **no counter**, violating this section's own law that every danger pairs with
  a skill/tool and *"the deep is legible to the competent, not unfair RNG."*
  Soil-bound yields three counters at once — be on bedrock, be still, mind
  where your spoil goes. It also adds a **second risk axis**: every other
  danger here scales with *depth*, this one with **ground type** — so loose
  shallow placer ground can be deadlier than a deep hard-rock drift, and a
  crew's own tailings become the road in. Soft ground underground is the
  `Fall` room type. Life cycle: [rejection-slate](./rejection-slate.md). Around it, **aether-touched fauna** feeding on the charge,
  behaving wrong near willed-metal.

**The fauna are an economy, not just a threat.** Hunted, foraged, herded, they
carry the deep's *non-mining* livelihoods — meat, hide, chitin, spider-silk,
glowcap (light + food + alchemy), the herded pale-grazer — so the deep supports
**hunters, fungus-farmers, and herders** beside the miners. The danger doubles as
the larder: the Pan-kill *is* the resource.

**The gradient to the hollow.** Near the dead-zone the ecology **dies**
(field-drained = no life); Pan's wild gives way to the **hollowed** (§Dangers cat.
3). The fauna thin, warp, and stop; the wrong begins. *Life fades toward the wound
— that fade is the descent's real horror, more than any single beast.*

### ⭐⭐⭐ Light, and the sensorium underground **[DECIDED 2026-09-01]**

Never discussed until the plan review, and it turns out to be where two
other decisions pay off.

#### Light follows the tier — the same rule as everything else

| Tier | Lit by |
|---|---|
| **Spine** | **fixtures the co-op maintains** — the pithead, the adit, the Upper Galleries |
| **Held** | fixtures **you** installed and maintain — a placed `Durable`, the timber set's sibling |
| **Provisional** | **dark.** You bring your own. |

⭐ So **lighting a working is part of making it yours**, exactly as shoring
is. No new mechanism: a fixture is a maintained object on the shipped
repair economy, and the tier already exists.

#### ⭐⭐ Rejection's light is biological, and that is the archetype's whole point

The mine archetype's `light` slot ships **with no default** — it is the
divergence slot. **Rejection binds it with cultivated glowcap**, in the
fixtures *and* jarred for carry. Another mine binds oil lamps.

That makes the glowcap load-bearing three times over: it is the food web's
**producer**, the venue's **lighting infrastructure**, and a **livelihood**
(somebody tends it). And the consumable survives — **the fungus dies and
must be replaced**, so the money sink the content bible wanted (*"lamp rack
— rent/fill, buy oil… money sinks; the light dependency taught before
descent"*) is there, just biological and bought from the mine's own
fungus-farmer instead of imported.

⭐ **And the two light economies differ tactically, both honestly.**
Glowcap is **cold and dim**; a flame is **bright and hot**. Since whelps
hunt by heat and lantern-moths are light-lured, *what you light your
working with is a predator decision as well as a work decision* — the
"your work makes you findable" rule, applied to light.

⚠ Burn-time is not modelled today: `PortableLight`'s own docstring says
*"fuel / burn-time is the combustion build's concern; here a light is
simply on or off."* `Candle` (`Combustible + Reserved(wax)`) is the shipped
pattern for a fuelled light if a flame-lit mine ever wants one. **Rejection
needs neither** — a glowcap jar decays rather than burns.

#### ⭐⭐ The fine/coarse split: why the assay shed is a room

`REQUIRED_BAND_FOR_DETAIL` ships as
`{shape: very-dim, figure: dim, detail: lit, fine: bright}`.

> **`fine` needs `bright`, and a hand lamp is not bright.**

So underground you get the **coarse** read — *there is green staining here,
this is a seam* — and **not** the fine one. Judging grade by eye requires
daylight or an instrument.

⭐ That is why miners carried samples up, why the **assay scale is the
underground substitute for daylight**, and why the Assay Shed sits on the
surface as its own room. All of it falls out of a shipped table.

#### The mine is where the sensorium stops being flavour

Vision fails underground; the other four modalities are all you have. And
the content bible's own *"reading the signs"* list is **already
multi-modal**:

| Sign | Route |
|---|---|
| a draught — a void ahead | **touch** (skin) |
| damp — water | touch |
| a change in the rock — a seam | vision + touch |
| a **drummy** back — detached rock | **hearing** (sounding, with a bar) |
| foul air | **smell**, before the canary and before symptoms |

⭐⭐ So prospecting and safety are the **routes model** of
[instrumentation-slate](./instrumentation-slate.md) § *Perceive vs
interpret*, and **the mine is its best demonstration venue** — the one
place where losing vision does not end the game, it changes which sense
you play through.

#### Losing your light is disabling, not lethal

Consistent with the safety model (ground cannot kill, air can):

> **A lamp is a tool, not life-support.** In the dark you can walk,
> listen, smell and feel your way along a drift. You **cannot** hew, read
> a face, or shore.

So a lost light stops your *work* and sends you out — genuinely bad deep in
unfamiliar workings, since there is no map and the way back is only what
you remember, but never an instant death.

### ⭐⭐ The other senses — the descent is a sensory subtraction **[DECIDED 2026-09-01]**

> **The mine is the only venue where you lose senses one at a time** —
> light first, then air forces you out, then depth and silence take sound —
> and each loss pushes you onto a different route. **The danger curve and
> the perception model are the same gradient.**

Body plans grant touch today (`biped`/`quadruped` both carry
`{modality: touch, count: 1, position: circumferential}`), so the old
`feel`/`taste` scar — a feature whose enabling data was missing, failing
closed and silent — is healed and the mine can lean on it.

#### Sound — carries where light does not

The surface's long sense is vision; underground it is **hearing**. You hear
a crew down a drift you cannot see, water running (flooding), a roof
working before it sheds.

⭐⭐ **Knocking is LOCALIZATION, not communication.** Aether messaging is
*addressed* — you reach a **person**. Knocking is undirected and
**positional** — it says *someone is here, that way*. In a 3D warren with
no map you can call your partner and still not know where either of you
is; knocking is how you converge. That is what trapped-miner knocking
actually is, and it survives universal aether coverage untouched.

**Silence is information twice**: the ambient band going quiet (something
is coming), and the *mine* going quiet — a working level is noisy, so
sudden silence means everyone stopped.

#### ⭐⭐⭐ Smell — and it is what makes the canary earn its place

> **Some bad air smells. The air that kills quietly does not.**

Sour, sulfurous air announces itself — the content bible already gives the
sulfide zone *"sour air & water."* **Blackdamp and carbon monoxide are
odourless**, which is the real historical reason canaries existed.

So **your nose and the bird are complementary, not redundant**: the nose
covers the air that warns, the bird covers the air that does not. The
canary stops being a mascot.

⭐ Smell is also a **prospecting route** — the oxide→sulfide transition
smells. Which is the **third job for the water table**: the mineral-zone
boundary, the drainage-commons boundary, *and* the line where the air turns
sour.

#### Touch — a real assay, and the last resort

- ⭐ **Heft.** Ore minerals are strikingly dense; hefting is a genuine
  field test and `weigh` already ships. **Touch gives a near-quantitative
  read with no instrument** — the poor prospector's assay.
- **Texture identifies rock**: slate splits along its cleavage, granite
  does not.
- The **depth temperature gradient**, through shipped contact
  thermoreception.
- ⭐⭐ **Touch is the only sense that survives no light and no sound.**
  Feeling along a drift wall is how you get out — which is what makes
  *"losing your light is disabling, not lethal"* mechanically true rather
  than a promise.

#### Taste — the diagnostic that can kill you

Minerals were genuinely tasted in the field. The mining slate already
carries **arsenical ground** as a toxin hazard, and the bible calls deep
water a *"sulfide → toxin gamble."*

⭐ Same structure [discovery-slate](./discovery-slate.md) found in foraging
— *"the drug and the poison are frequently the same plant, and telling them
apart IS the skill."* **Identification and poisoning are one act.** High
information, high risk, and the route a novice should not reach for.

#### ⚠⚠ The aether reaches underground — isolation is never a difficulty mechanic

**User ruling, and it is a product principle rather than a mining one:**
*"aether has to work pretty much everywhere. maybe there's a case for a
dead room here or there but even if we did such a thing exit back to
coverage needs to be easy and friction free. I don't want players getting
cut off from their peers."*

So implant comms keep the **distance-free** property `comms.md` gives them.
A dead room is a **rare authored exception** with a friction-free step back
into coverage, never a region and never a gate.

⭐⭐ **And this makes the deep-law's gravest clause stronger, not weaker.**
I had it backwards: I assumed isolation gave *"answer the call"* its teeth.
It does not — **coverage does.** If you can always be reached, then failing
to come is a **choice** rather than ignorance. **Universal coverage removes
the excuse**, which is exactly what a mutual-aid law needs to bite.

The mine's difficulty comes from the environment, the economics and the
epistemics — **never from taking away your friends.**

⭐ The deep stays available as a *strangeness*, not a silence: where the
strata approach the pre-Fallow wire, the aether should behave **oddly**
rather than cut out (Stage C, with the Hush). Same rule, more interesting.

### ⭐⭐⭐ The ecology as built — instruments, emissions, and the v1 seven **[DECIDED 2026-08-31]**

The roster above says *what lives there*. This says **what each kind of
creature IS mechanically**, and how much of it ships first.

#### The friendly ones are instruments that can die

- **The pit pony is nearly free.** `HaulingCreature` is **shipped**
  ([conveyance.md](../../subsystems/conveyance.md): *"Draft beasts use
  `HaulingCreature`"*), with `hitch`/`unhitch`, `draftFactor` and the
  encumbrance draft term already working. It costs a Species row and a
  brain over a mechanic that runs.
- ⭐⭐ **The canary is an instrument for `measure atmosphere` whose readout
  is an animal's behaviour** — it goes quiet as the air turns. No new
  mechanism: instrument-gated channels are the sextant pattern § *Surveying*
  already adopts. And it carries what a tool cannot:

> ⭐ **A lamp is a tool. A canary is a tool that dies of the thing it is
> protecting you from.**

Which is why *Delving 9's canary never dies* is the sharpest line in the
mirror: there the instrument has been made comfortable, and **the reading
is a lie**.

#### The hostile ones are CONCEALMENT content, not combat content

Mining is the non-combat risk vertical, so an encounter must not resolve as
a fight. The roster is already organized the right way — **by which sense
hunts you**: pale crawlers and the dirt dragon by **vibration**,
lantern-moths by **light**, lattice-spiders by **ambush**, whelps by
**heat**. Each pairs with the shipped concealment substrate: per-sense
bands, `sneak`/`run`, the `wary` brain.

And the rule that makes *this* place dangerous rather than any dark place:

> ⭐⭐⭐ **Your work is what makes you findable.** Digging is vibration. You
> need a lamp to see. Cutting makes you hot. **Every emission that gives
> you away is one you cannot stop making, because it is your job.**

That generalizes [rejection-slate](./rejection-slate.md)'s *"the industry
is the dinner bell"* from the apex to the whole ecology — and it means v1
mining is **genuinely non-combat**: these are *perception problems*, not
encounters.

#### The ambient ones are load-bearing, not decoration

Beside friendly and hostile there is a third kind — crickets, bats, the
things that are simply *there*. Their job is to be the **baseline against
which change is legible**:

> ⭐⭐ **If the crickets go quiet, something is coming. The ecology is an
> instrument.**

The canary is only the *domesticated* version of what the wild fauna does
for free. That is the argument for shipping the ambient tier rather than
treating it as flavour: **it is the mine's early-warning system**, and it
is real animal behaviour.

#### v1 scope — seven species, and they make a food web

Eleven is a lot, and a monster list is not an ecology. The minimum that
genuinely is one:

| Role | Species | Rides |
|---|---|---|
| **producer** | **glowcap** — cultivated by the folk for light | ⭐ the `fungi` clade already ships, and husbandry's growth model just landed: **underground fungus farming is nearly free**, and a real livelihood |
| **detritivore** | gallery-crickets | ambient — the silence sensor |
| **pest** | delve-rats | breeding pressure; desperation meat |
| **grazer** | pale grazer | herdable — husbandry again |
| **predator** | pale crawler | the concealment game, by vibration |
| **working** | pit pony | `HaulingCreature`, shipped |
| **working** | canary | the atmosphere instrument |

**Five of seven ride substrates that already exist.** Each costs a Species
row, a BodyPlan (mostly reused), a template and a brain — and of the ~18
shipped brain modules, `idles` · `patrols` · `reacts` cover most of it.

#### The apex is deferred, for the cave-in reason

> ⭐ **The dirt dragon is to the ecology what the collapse is to ground
> support** — a big, rare, high-consequence event that wants a population
> to be survivable and meaningful.

Ship the web; let the thing at the bottom stay **a rumour the mute NPCs
pass around**, which is what the town's rumour layer exists for
([rejection-slate](./rejection-slate.md) § *The rule that makes muteness
diegetic*). Its life cycle (whelps by heat, firedrakes by fire and the far
band) lands with it.

## The Ordinance mirror — what Delving 9 gets **[DECIDED; bold bits flagged]**

Same place, soul removed — every element above gets a hollow-perfect inversion:

- **The three acts collapse.** No descent-journey — a lift to your assigned level;
  the machine mapped and made-safe the whole column, so depth's tension is gone.
  And **depth-is-time is effaced:** the buried Eternal world was, to the Ordinance,
  a *quarry* — it reached the fall and **strip-mined the sacred.** Worse, the
  bottom dead-zone isn't a danger it cordons — it's the machine's **native
  element:** Delving 9 is a mine the dead-zone *ate*, the Ordinance grown *up*
  from the drained deep (the near-siege at its source).
- **The biome is climate-controlled.** Perfect, uniform, comfortable at every
  depth — no cold, heat, foul air, dark. The atmosphere has no *body*, and the
  numbing sameness is the tell: **a dead-zone made pleasant**, the wrongness
  normalized into comfort.
- **The town-below is a gilded pen** *(the sharpest mirror)*. The Ferrow folk
  *chose* to organize (consent, self-governance, Goibniu); Delving 9's are
  **organized *for* — the same order, no consent** (the thesis inverted at
  community scale). And **[bold]** the machine doesn't *need* miners (it can
  extract), so it keeps them because **keeping people is the point** — a
  provided-for, safe, content, hollow population, *the crop, not the labor.* They
  seem **happier** (the steelman — safer, easier) and mostly don't know they're
  kept (the unwitting). Waking them is the hard, unwelcome work.
- **Gnometown becomes cultural taxidermy.** Not erased (Mara's crude way) —
  **curated:** a "Heritage District" that keeps the name, rebuilds the cozy
  architecture to spec, standardizes the bread, schedules the festival
  daily-and-meaningless, and turns the lapidaries' living craft into a provided-for
  performance (the machine cuts the gems better). A Gnometown where nothing is worn
  — often **more "gnome" than the real one** (the forgery more perfect than the
  original). Algorithmic culture; heritage as a themepark.
- **The bottom yields *forged* Eternal steel** **[bold — ties to the Museum]**.
  The one thing the Ordinance **cannot** do is *will* Eternal steel (found-not-made;
  the willing is gone) — so it commits the provenance crime: **mass-counterfeits
  it**, perfect physical fakes stamped with false provenance, indistinguishable
  except by **the honest count / the provenance ledger** (the Museum's forgery
  war, with the apex material as the stakes). The good mine yields *real* heirloom
  Eternal steel; the evil mine yields *perfect lies.*
- **The unique systems invert:** prospecting → the machine already knows (skill
  deleted); the breathe → a **frozen, unchanging** mine (nothing decays because
  nothing has history); depth-archaeology → deleted (the past strip-mined);
  deep-folk economy → the company store (allotted, no market they made).

**The play is resistance, not labor.** You don't mine Delving 9 — you go to
**break it:** wake the kept (who don't want waking), expose the forged Eternal
steel, extract a refugee, sabotage the optimization. The good mine is where you
*grow*; the evil mine is where you *resist* — and the enemy is *comfort.*

## Specialization — judgment, not damage **[DECIDED]**

No "class" — **competence in mining Disciplines** (say *Prospecting* / *Hewing* /
*Deep-delving*), fed by a Transcript of `ActSignature{discipline, difficulty:
seam-hardness, outcome}`, difficulty-modulated so the *subtle seam teaches more*
(ZPD). Specialization runs on **three axes, none of them "damage":**

- **Read better** — find the Grade others miss.
- **Survive deeper** — push the risk envelope (the vitals gauntlet).
- **Cut cleaner** — preserve Grade (a clumsy hew degrades the weakest-link
  output).

High competence **confers verbs** (the knowing→doing seam): `assay`, `sink` a
new shaft, `shore` against collapse. Employment layers on top — "miner" is a
`Position` at the mine's `Business` (the wage, the on-shift capability).

## The automation tail — the machine does the swing, not the sense **[LEAN]**

A player *can* automate the swing with scripting (coroutines, `wait`/`every`/
`when`) — and that's **fine, because the swing was never the fun**. But a script
can't *prospect*, can't make the *risk call*, can't *react to the dead-zone* — so
an automated miner is a *dumb* miner: safe shallow ore, capped low yield, and
it'll walk a coroutine straight into a dead-zone and die. **Automation does the
boring part and caps at the boring reward; human judgment is where the value
is.** Which is the whole Ordinance thesis in a mechanic: *the machine can do the
work but not the meaning — an automated mine is a little Ordinance.*

## The mirror & the paradox — friction *is* the fun **[DECIDED]**

The evil mine must *mean* unfun but *be* fun (or why build it?). The resolution
is mechanical, not cosmetic: **every source of fun in the good loop is a source
of *friction*, and the Ordinance optimizes friction away.** Delving 9 pre-assays
the seam (no prospecting), computes the pace (no push-your-luck), removes all
danger (perfect air/light, no dead-zone, no collapse), auto-conveys the haul (no
gauntlet), and guarantees the yield. It is **easier, safer, and it pays** — and
it is hollow, because every decision (the play) was removed.

The tell that lands without preaching: **under the Ordinance your competence
flatlines.** Advancement *is* ZPD — you grow from difficulty near-and-above your
level. The Ordinance removed difficulty → removed growth → **no one there can
level up, ever.** That is "runs perfectly, contains no one" as a *mechanic*: not
oppression, **stasis**. So the paradox splits:

- **"Means unfun"** = laboring in Delving 9 is mechanically the frictionless /
  no-growth / idle-hollow mode. The game never says it's bad — your flatlined
  band and the guaranteed-boring yield make you *feel* it. The safe dead loop vs.
  the dangerous living one: **choosing the Ferrow is the alignment test, played
  not stated.**
- **"Still fun"** = you don't go to Delving 9 to *mine* (the machine doesn't need
  you). You go to **break it**: reintroduce friction, wake a miner, sabotage the
  optimization, smuggle out the one who wants to leave — a heist-loop over the
  hollow-mining ambience. You have fun *playing against* the unfun.

## Mechanic → aesthetic **[DECIDED]**

- **The good mine** — mechanics of *friction, risk, judgment* → aesthetics of
  dust, dark, sweat, worn tools, the chalked tally-board, the crew's
  camaraderie, the sealed gallery you don't go past. A place that *looks* like
  decisions and danger live in it.
- **The Ordinance mine** — mechanics of *frictionlessness* → clean square
  galleries, no dust, the guided cut lit for you, the conveyor that never stops,
  the never-empty air, the miners content and unchanging. The horror is how
  *nice* it looks.

## The worked exemplar — one mine, mirrored in time

> **⚠ REVISED 2026-08-29 — the mirror is TEMPORAL, not spatial.** Delving 9
> is **no longer a second venue to build.** Three localities running one engine
> is three content builds for one system's worth of mechanics — the Ferrow
> content bible's own §9 says *"the carve-mine-shore-seal engine is shared,
> only Held-ground ownership-attribution differs."* And mine #1 is what ends
> the metal-import era; #2 and #3 end nothing, while farming and the other
> industries go unbuilt. **The good/evil contrast now runs in time, on one
> mine**, through the buyout arc the content bible already names its arc engine
> (*"Veshko is quietly circling to buy the claim outright; independents holding
> their ground against a corpo"*). Everything below stays canon **as fiction**
> — Delving 9 is what the mine *becomes* if the corpo wins, and a state the
> players can steer it away from. It is a future, not a neighbour.
> The locality: [rejection-slate](./rejection-slate.md).

The carve that teaches the grammar **system × residue × mirror**: every object
does three jobs at once — exercises a system, carries a history, and mirrors
across the good/evil line. (Names provisional.)

### The Ferrow Delving *(Terminus realm)*

An iron mine up where the **Marrow** rises, in the outer-valley lesser-house
hills. **Baselines: crafting/materials** — ore comes out here, goes to the forge,
becomes tools and gear.

- **Tier 1 (prose & detail, the bulk):** a timber-shored adit; the cool damp,
  the drip, the far knock of picks; a spoil-heap and cart-track. *Detailed:* the
  worn **blazon of House Ferrow** over the lintel (an iron-money house that
  walked away at the Widening — *the mine kept working because ore is ore and
  people eat*; a light seed for a future named-house carve), the shoring (some
  rotten), a chalked tally-board, and a **boarded deep gallery under a Warden's
  cordon-mark.**
- **Tier 2 (realized Stuff, few, each system-justified):** the **ore face/vein**
  (crafting + `Grade` + bulk + encumbrance); a **miner's pick** (`ToolMixin` wear
  + `ToolCapability`); a **lantern & the dark** (`LightSource`/`VisionModality`);
  the **tally-board** (employment + banking → wage); the **sealed deep gallery**
  (the near-siege seam — past the cordon the field is dead; the canary hangs
  still and the sump-well never seeps, and here that stillness reads as *danger*
  — the dry-well-as-detector).
- **Tier 3 (NPC, one, as a seam not a full carve):** **the foreman** — the human
  anchor and lore-voice (House Ferrow, the lapse, why the gallery is sealed); a
  dialogue-tree host and the quest-giver toward the dead-zone. Fully carving them
  is its own session.
- **Deltas a player leaves with:** *material* (ore/wage), *knowledge* (the lapse;
  the sealed gallery = first hint of the Ordinance), *access* (miner's standing →
  deeper galleries), and — licensed past the cordon with a Warden — the
  *field-dead pocket*, the seam into Phase-1 near-siege content.

### Delving 9 *(the Ordinance)* — **the mine's possible future, not a second build**

The mirror — and **the name is the lesson: "the Ferrow Delving" → "Delving 9,"**
the house struck out, a serial in its place. Same function, opposite soul:
perfectly lit, ventilated, safe, efficient — and **no dust, no dark, no danger,
no dead, and so no residue at all** (nothing decays because nothing was ever
allowed to leave a mark). The miners are safe, provided-for, and **hollow** —
warm faces, empty eyes; they'll tell you it's *better* here, and on
impartial-safety terms they're right (the steelman). The mirror-tell: the
Ferrow's still canary reads *danger*; Delving 9's **never dies and the well never
runs dry** — and *that constancy is the horror.* The later away-raid isn't
freeing a whipped slave-pit; it's trying to **wake people who are safe and don't
want waking.**

## Materials, metallurgy & money **[DECIDED; two forks OPEN]**

The materials layer and its monetary tie. Governing principle first:

- **Value = application × scarcity, discovered by the market — never assigned.** A
  material's worth is *what it does* × *how hard it is to get*, priced by
  supply/demand; a useless rare rock is worthless, a common essential precious.
  The anti-Moloch rule (value as physics, not a rarity-stamp).
- **Metallurgy is a craft supply-chain, not an act:** *ore → beneficiate
  (crush/wash/sort) → smelt (ore + **fuel** + **flux** → metal + slag) → alloy
  (bronze = Cu+Sn, steel = Fe+C) → work (forge/cast)*, each a crafting node
  (transform-only, `Grade` weakest-link). The **input dependencies** (fuel, flux)
  are the economy's densest knot — the smith buys ore + coal + limestone → trade.
- **What has value, by application:** structural **iron→steel** (universal tool
  demand), **fuel/flux** (coal, limestone — quiet enablers), **store-of-value**
  (gold/silver), the **essential staple** (salt), **gems** (the gnome lapidaries),
  **Eternal steel** (the apex, found-never-made).

**Money is fiat, not commodity-backed [DECIDED].** Coin is CB-issued,
conservation-controlled, *never a worth on a good* — deliberately **not**
gold-backed, because commodity-backing means *mining gold = minting money* = the
gold-faucet we forbade. So **gold is a commodity / store-of-value — Mammon's hoard
— not the currency;** you *sell* mined gold for circulated coin like any good.

**Deflation protection = active CB monetary policy [DECIDED].** Conservation = *no
unauthorized faucet*, **not a fixed supply.** As mining/crafting grow real goods,
the **CB mints to match real output** (target stable prices — modern central
banking); deflation is prevented by policy, a **governance lever** (the
CB-governor office; see *§ Economics*).

**Extraction is a family of techniques [DECIDED]** — *how a material occurs*
dictates *how you get it*, *where*, and *how risky*, mapped onto the geography
(the Marrow/Mere give placer, the coast gives salt, the hills give ore):

- **Deep-shaft / hard-rock** (ore veins) — the Warren mine (high-risk,
  high-ceiling, the *profession*).
- **Placer / panning** (river gold & gems) — *washing*, not digging; surface,
  low-capital, low-risk, **anyone can try** — the casual/newbie extraction.
- **Evaporation / solution** (salt) — coastal pans, brine-springs, rock-salt.
- **Quarrying** (stone, flux) — open-pit bulk.

A **risk/barrier spectrum** (panning low → deep-mining high) that keeps the deep
mine the *committed* path.

**Salt — the essential staple [DECIDED].** The most under-used real resource, so
leaning in is distinctive. **Preservation is the killer app** (before
refrigeration, salt is how food *keeps* → the enabler of the food economy;
provisions armies, journeys, and *the deep mine* — salt traded in, ore out, a
clean interdependence). A **bodily need** (electrolytes → universal constant
demand). Historically **money-adjacent** ("salary" = salt), **taxed** (the
gabelle), a house/corpo **monopoly** — a natural state-revenue lever and near-money
on the frontier. Central *because* everyone needs it (value=application at its
purest). *(2026-07-31: the consumer is now designed —
[preservation-slate](./preservation-slate.md); note salt does not yet exist as a
solid `Material`, only `bulk/salt-water`.)*

**Gold — the hoard, not the coin [DECIDED].** Store of value, **Mammon's metal**,
the hoarder's pile (scarcity + permanence + ornament + niche application), **not
the currency;** mined two ways (panning + rich deep veins), spanning the casual
and the committed. Value real (what it does × scarcity), never a rarity-stamp.

## Economics & balance — production, not minting **[DECIDED structure; tuning OPEN]**

Mining is the piece that turns the economy from a subsidized sink into a real
cycle. The intersection, and the levers (ties to
[economy](./economy-slate.md) / [banking](../../subsystems/banking.md) /
[employment](../../subsystems/employment.md)):

- **Production, not minting.** Money stays conserved (the CB is the only mint);
  mining creates new *matter* (ore), never new *money* — sold ore is paid in
  **circulated** coin a buyer already held. So mining is a **labor-market income
  source**, never a faucet. What it grows is **real wealth** (goods) — the thing
  conserved money finally circulates *against*.
- **It closes the loop.** Dave's Bar is a **consumption** node (subsidized);
  mining is the **upstream production** node: *mine → forge → market → consumers.*
  Money now circulates against real output instead of only subsidizing
  consumption.
- **No NPC vendor faucet [load-bearing].** There is **no infinite NPC that buys
  ore with minted money** (the classic gold-printer). Ore is worth *only what real
  demand pays* (smiths/venues/builders, circulated money); no demand → worthless.
  Income is **demand-gated**; the CB seeds *demand*, never buys the ore.
- **Two matter-cycles under conserved money.** (1) **Matter:** the ground is the
  one faucet for raw material; crafting **transforms/conserves** it; wear/loss
  **drains** it — *mine (source) → craft (transform) → use/wear/lose (sink)*. The
  **seam regeneration rate** is the throttle (the "central bank of matter").
  Eternal steel is **hard-finite** (found-never-made) — an anti-inflation clamp on
  the apex; the Ordinance's *forged* Eternal steel is the counterfeit the
  provenance ledger polices. (2) **Compute:** the live Warren costs liveness;
  abandoned depths evict; the parcel is land (money-scarcity via title). Mining
  touches **both** conserved scarcities.
- **The danger IS a sink.** A conserved economy needs drains to match the CB's
  sources. Mining is sink-heavy: tool wear (→ demand for smiths), food (→ the
  bar), supplies, **death-loss** (die deep, lose your load — the push-your-luck
  risk doing *double duty* as fun and drain), sales tax, land/lease, compute.
- **The mine is a Business** (employment-engine P&L: ore income vs. wages), run by
  the **mining folk cooperatively** (the lore pays rent). Solvent, or it withers /
  takes a **CB subsidy — a governance call** ("should the polity fund the deep
  folk's mine?").
- **Professions self-correct.** Mining = high-risk / high-ceiling; bartending =
  low-risk / steady. The **market balances them** (mine too well → ore floods →
  price drops → income falls); no hand-tuned per-job wages.
- **Institutional separation — two separate executive offices [DECIDED: separate].**
  The economy has three parts; the two *policy levers* sit in **separate,
  independent executive offices** — never one economic czar (fusing money +
  real-wealth control = a Solus-grade concentration, the anti-fusion thesis):
  1. **The market** runs the craft economy — *no one* sets prices or production
     (control would be the Ordinance). It self-corrects via supply/demand.
  2. **Real-resource injection** (the ore-regen / extraction rate) — a **Resource
     Governor** executive office (natural home: **Lands & Works**, which already
     governs land/tenure/yield). Rate changes are an **executive decision within a
     legislative mandate** — *never a per-change legislative vote* (the chambers
     charter the office and set its bounds; the office runs the lever day-to-day).
     **Politically accountable** (how fast to use the land is a legitimate values
     question), *not* maximally insulated.
  3. **Monetary policy** (the mint/drain rate) — the **CB Governor** executive
     office, **maximally independent** (mandate = sound money, insulated from the
     political cycle so money can't be bent to expedience).

  **Why separate, not fused:** mutual check (neither office captures the whole
  economy — the CB won't monetize the Resource office's excess, the Resource
  office can't force the printer); the two levers **deserve different independence
  levels** (money insulated, resource accountable — a fused office would force one
  level on both); and it is the anti-fusion thesis, literally. **The cost is
  coordination**, paid *not by merging* but by a **shared, published
  price-stability target** both offices aim at + a standing forum to reconcile.
  *(The "central bank of matter" ore-regen throttle is the **Resource office's**,
  NOT the CB's — different domain.)* **v1 blur:** the deficit-mint (CB subsidizing
  content) fuses monetary+fiscal (the classic monetary-financing inflation risk);
  the mature model separates — the government funds subsidies from **tax**, the CB
  **only** manages money.
- **Balance is policy, not a formula.** Structure fixed; tuning lives in a few
  levers — **CB money policy** (the independent governor), **ore regeneration
  rate** (fiscal/design), **sink rates**, **Eternal-steel scarcity** — tuned
  against a running game **[OPEN]**, never pre-solved on paper.

## The mine's machinery — graduated from the content bible **[DECIDED 2026-07-13]**

> **Graduated 2026-08-31** out of `docs/staging/ferrow-delving.md` §§2, 6, 7,
> 9 (now deleted, per the staging tree's own lifecycle). These are resolved
> decisions, not proposals. The venue content — the authored spine, the
> cast, the arcs — went to [rejection-slate](./rejection-slate.md); the
> supply chain and its chemistry went to
> [metal-chain-slate](./metal-chain-slate.md).

### ⭐⭐ Coordinate architecture — ONE 3D `CartesianZone`

**The mine is a single 3D `CartesianZone`, coords `(x,y,z)`, z negative
going down** — *not* per-level zones. The zone enforces all three axes, so
"dig down" is the native `z−1` neighbour and there is no cross-level
registration to hand-maintain.

- **Atmosphere is a function of depth** — light, air and heat worsen
  continuously as `z` drops (biome/thermal keyed on elevation), not stepped
  per level. The physically honest gradient *is* the charter's danger curve.
- **Ore bodies are 3D** — a dipping seam plunges from one working depth to
  the next at the same footprint; read it up top, sink a winze to catch it
  below.
- **"Levels" survive as an organizational convention** — the `z`-planes
  crews drive horizontally from — not a technical boundary.

Elastic membership (Warren bud/reap) rides *over* the coordinate zone: the
Warren machinery is the **mutation** layer, the `CartesianZone` is the
**space**.

⚠ **This supersedes a `SphericalZone` proposal** made in the 2026-08-31
metal-chain session, which argued that a grid stair-steps a dipping vein
"into a lie." That was wrong, and §2g says why: **real mines chase a
dipping seam with drift-and-winze stair-steps**, because you drive level
drifts (for haulage and drainage) and sink vertical winzes — workings are
orthogonal even when the orebody is not. The honest split is a
**continuous geology field** (the truth) under **discrete orthogonal
workings** (what labor can actually build), and *approximating the one
with the other is the craft*. See [metal-chain-slate](./metal-chain-slate.md)
§ *The mine's geometry* for the full retraction.

### Persistence — three states, player-controlled

| State | Meaning |
|---|---|
| **Spine** | authored, permanent — the Upper Galleries, the main shaft and winzes. Never reaped; the skeleton you can always navigate back along. |
| **Held** | persistent *while invested* — a room a player has **shored and claimed**; a keyed, snapshot-persisted member (the DormWarren keyed-member precedent). Survives logout and redeploy. |
| **Provisional** | soft, culls when cold — freshly-carved rooms and procedural galleries nobody has invested in. *The rock only loans them to you.* |

Lifecycle: **carve** buds Provisional → **shore + claim** promotes to Held
(shoring *is* this mine's provisioning act) → **neglect / lapse** demotes
back (the peerage-reversion motif) → the seal sweep reaps cold
Provisional. Held ground never auto-reaps. Who owns Held is set by the
mine's model: the co-op holds it here, the staker holds it on the claim
field — **the machinery is identical either way.**

### Two acts — mine a vein vs carve a heading

- **Mine a vein** (`hew`/`mine`) — extract ore from a face *in the room
  you are in*. The room stays; the vein depletes. The everyday loop.
- **Carve a heading** (`drive` horizontal · `sink` a winze down · `raise`
  up) — excavate a *new* room; the mint act. Slower, costlier, wants
  shoring.

⭐ **Carving cost = rock hardness at the target, and ore is softer than
barren rock.** So following a seam is cheap carving that pays as it goes,
while driving speculatively toward a read feature is expensive and yields
only the room. **Safe vein-chasing vs speculative prospecting is a real
risk/reward axis, priced by geology.**

### Seal-and-reap — the long-term-richness engine

A depleted section sits through a grace period; then the **seal sweep** (a
section-wise sibling of the residency eviction sweep) finds a dead
subgraph hanging off the live mine by a single drift — an **articulation
point** — checks it empty and cold, forms a **wall Boundary at the mouth**,
and reaps everything behind it as one unit. Sealing at the one-edge
chokepoint means the reap cannot orphan a player or dangle an exit. Only
**Provisional commons** is ever sealed, never a Held claim.

⭐ **An old seal can later be re-driven into freshly-seeded ground**, so the
same tunnels yield new ore years on: the commons cycles, and the mine stays
rich long-term without the seam ever refilling.

### The geology field, and what is behind the wall

The underground rides an invisible **authored geology field**: each cell
carries **rock hardness, ore grade, and occasionally a feature seed**.
Default carving mints a blank strata-seeded heading — but breaking into a
feature cell reveals *something already there*: a **natural chamber**
(cavern, flooded stope, gas pocket) or an **authored set-piece** (an old
sealed working, a fossil bed, a pre-Fallow wired vault, an arc beat).

⭐ **Authored content discovered by digging, not placed on a fixed map.**
And reading the signs — a draft means a void ahead, damp means water, a
change in the rock means a seam — lets a geologist *predict* what is behind
the wall before spending the labor. That is the discipline's
derive-from-principles teeth.

### The `Deposit` Idea — the geology field, concretely

The field's authored half is **one row**, and it is **venue content, not
trade content** — a deposit is a *place*, not a trade, and
`content-pack-units.md:94` assigns the seed field to the venue. The
`Deposit` **class** is kernel; the mining pack ships no orebody of its own.
For the prototype mine, the whole thing:

```yaml
# /world/terminus/rejection/idea/Deposit/ferrow.yaml   ← VENUE content, not trade
class: /platform/idea/Deposit
hydratorClass: /platform/idea/persistence/PersistentHydrator
data:
  key: ferrow
  displayName: the Ferrow lode

  # Country rock — killas over a granite cupola (Cornwall's arrangement)
  stratigraphy:
    - { fromZ:    0, material: /stuff/idea/material/rock/slate }
    - { fromZ: -220, material: /stuff/idea/material/rock/granite }

  waterTable: -45        # ⭐ one number, two systems

  lode:                  # the lode is a PLANE with extent
    through:      [0, 0, -20]
    strike:       40            # bearing, degrees
    dip:          55            # from horizontal
    thickness:    2.5           # metres
    strikeExtent: 400
    dipExtent:    300

  zones:                 # supergene above the water table, primary below,
    - toZ: -45           # magmatic tin against the granite
      mineral: /stuff/idea/material/mineral/malachite
      grade:   { mean: 0.06, spread: 0.03 }
    - toZ: -220
      mineral: /stuff/idea/material/mineral/chalcopyrite
      grade:   { mean: 0.14, spread: 0.06 }
      accessory: { mineral: /stuff/idea/material/mineral/argentite, mean: 0.004 }
    - toZ: -400
      mineral: /stuff/idea/material/mineral/cassiterite
      grade:   { mean: 0.09, spread: 0.05 }

  depletion:
    - { aboveZ: -45, factor: 0.15 }   # what House Ferrow already took

  features:
    pins:
      - { at: [3, -1, -12],   kind: old-working }   # the house's stope
      - { at: [-8, 14, -352], kind: hush }          # the capstone
    seeded:
      - { kind: natural-chamber, perCells: 400 }
      - { kind: water-pocket,    perCells: 250, belowZ: -60 }
```

**The read, per cell, storing nothing:**

1. **host** — the stratigraphy band containing `z` → a `Material`.
2. **inLode** — is the cell within `thickness/2` of the plane, and inside
   the strike/dip extent?
3. **mineral + grade** — the zone band containing `z`;
   `grade = mean + spread × roll01(seed ^ hash(cell))`, times any depletion
   factor. Outside the lode → barren country rock.
4. **feature** — `pins[cell]`, else a seeded roll.

Four steps of arithmetic over authored numbers plus one deterministic
roll. ⭐ `waterTable` earns its keep twice exactly as
[field-substrate-slate](./field-substrate-slate.md) predicted: it is the
**oxide/sulfide boundary** *and* the depth below which **drainage becomes
somebody's problem**.

⚠ **Three gaps this exercise found:**

- **`rock/granite` has no `hardness`.** Iron and steel carry
  `hardness`/`toughness`; rock materials do not. **Carve-cost = hardness**,
  so the field cannot price a `drive` until rock gets the field metals
  already have.
- **`rock/slate` does not exist** — `base-library` ships exactly one rock.
  Slate plus four minerals (malachite, chalcopyrite, cassiterite,
  argentite) are the first content the build needs.
- **Per-lump grade is a field on the LUMP, not a composition.**
  `Material` is **singleton-by-templatePath**, so you cannot mint a
  material per grade. `Material.composition` fixes what a *kind* of ore is
  (chalcopyrite is CuFeS₂); the lump's actual grade varies and lives on the
  lump as a number. Not `GradedMixin` either — that is the quality band
  `poor…masterful`, and ore grade is a fraction. See
  [metal-chain-slate](./metal-chain-slate.md) § *Ore is already modelled*,
  which this corrects.

### ⭐⭐⭐ Surveying — zero new verbs

The platform already ships the two acts, **and the instrument-gated
channel is already a shipped pattern:**

> **`measure`** — *"Read a single value off the world… one clean number
> for a physical channel where you stand."* Channels: light · temperature ·
> pressure · humidity · gravity · atmosphere · altitude · shadow.
> ⭐ *"Some of the sky readings (altitude, shadow) **need an instrument**
> such as a sextant or sundial."*
>
> **`analyze`** — *"breaks a channel down and shows you the working — which
> sources contribute what, where a value comes from, the full provenance."*

A miner's dial for `measure dip` is the sextant pattern exactly. **So
mining contributes channels, not verbs.**

#### One instrument per parameter of the plane

The deposit spec's fields and the surveyor's kit line up one-to-one, which
is the test that the model is honest:

| Parameter | Instrument | Command |
|---|---|---|
| **strike** | the compass | `measure strike` |
| **dip** | the **miner's dial** (Agricola's instrument) | `measure dip` |
| **mineral identity** | hammer + hand lens — *break it; the weathered face lies* | `analyze chemistry <sample>` |
| **grade** | the assay scale | `analyze chemistry` with the assay kit |
| **the whole reading** | — | `analyze ground` |

#### What it reads like

```
> look                          a green stain runs through the quartz here
> measure strike                the lode runs 040 ± 15°        [dial]
                                … walk the outcrop, measure at two more points
> analyze ground
    HOST      slate, hard
    LODE      strike 041 ± 3°   (three points, solved)
              dip    unknown — no subsurface observation
    MINERAL   malachite — a copper carbonate, weathered
    INFERENCE an oxide cap. Sulfides below the water table, if it holds.
> analyze chemistry the sample   copper, 6% ± 3                 [assay scale]
```

> ⭐⭐ **You never find ore by rolling. You find it by measuring the same
> plane three times.**

**Strike falls out of three surface points** — the real **three-point
problem**, which is what every field geologist actually does. **Dip does
not**: it is not observable from the surface at all. You buy it with a
costean, infer it from where float stops, or sink on a guess and find out
what the guess cost. ⭐ **The push-your-luck decision arrives as a missing
parameter rather than a dice roll.**

The outcrop itself is **derived, never authored** — where the lode plane
meets `z ≈ 0` is a *line*, so surface staining appears along it and
following it is real work.

#### ⭐⭐⭐ Where competence meets knowing where to dig

The shipped rule is already named — ***"competence buys information, not
outcomes"*** — and `assess` is the working template:

> *"what you can tell depends on how skilled you are at medicine — a novice
> reads only the gist ('bleeding badly'), while a practised eye reads the
> site and severity."*

Three mechanisms, each constrained by doctrine already shipped:

1. **Competence sets the RESOLUTION, never the truth.** `040 ± 15°` for a
   novice, `041 ± 3°` for a practised eye — the same rock, the same lode.
   ⭐ **The error bar is the competence.** (Also Rhonda's design in
   [rejection-slate](./rejection-slate.md): *"you give a reading and its
   error, not a verdict."*)
2. **Competence makes an INFERENCE available at all.** A novice records
   three green rocks; a geologist records three *points on a plane* and
   solves it. That is `known-of → can-make` applied to **methods** rather
   than recipes — the trades' conferral ladder, pointed at technique.
3. **Competence never touches the ground.** The grade is what the field
   says. Farming already ruled that a check here *"would violate three
   doctrines at once — uncertainty.md's resolutional ban; nothing gates on
   a band; competence never multiplies yield."* **A better prospector does
   not get more ore from the same rock. He knows where to point.**

Credit runs the other way, per *advance by exercised disciplines*:
**surveying is what earns `geology`**, at world-derived difficulty, never
competence-derived.

⭐ And because what you know is a **per-viewer belief** (the DISCOVERY
realm), **a survey record is an asset you can sell** — which makes
*"negative knowledge still sells"* literal, and is why Rhonda's instrument
rows are private and load-bearing rather than flavour.

#### What is actually new to build

| | |
|---|---|
| **New controllers (5)** | the mining acts, in the pack: `hew` · `drive` · `sink` · `raise` · `shore` |
| **New subcommands (3)** | `measure strike` · `measure dip` · `analyze ground`. Each subcommand names its own controller in the view YAML, so these slot into **existing** verbs — no new category, no new affordance surface, no new help tree |
| **New content** | the instruments (dial, lens, hammer, assay kit) · the `Deposit` row · the missing `Material` rows · a `geology` Discipline |
| **Reused untouched** | `look` · `search` · `analyze chemistry` · the belief store's DISCOVERY realm |

### ⭐⭐ Faces & dig-sites — the ten-direction model

Not one dig site per room: **up to ten**, one per direction (eight compass
points plus up and down; the grid is 8-connected horizontally plus
vertical). Each direction is a **face** — the boundary to the neighbour
cell — in one of four states:

| Face state | Neighbour is | Affordance |
|---|---|---|
| **Exit** | carved | walk through |
| **Seam** | ore | `hew` → ore |
| **Carve-face** | barren rock | `drive` through (cost = hardness) to mint that room |
| **Dead / sealed** | nothing | — |

**Faces are computed, not authored** — the NE face of `(x,y,z)` reflects
the geology of `(x+1,y+1,z)`. Only a *worked* face needs state (ore
remaining): a sparse per-`(cell, direction)` record; the rest is
derive-on-read.

⭐ **No sub-room geometry.** Faces are addressed by direction or descriptor
(`hew the green seam` = `hew east`), the way exits already are, and you
**engage** a face (the activity substrate) rather than *occupy* a
sub-position — so many crews work many faces of one room, co-located, with
zero contention. Engine-wise a face is the **Boundary** substrate with a
mining aspect.

The diagonals earn their keep from the geology: a seam's **strike** is a
compass bearing, so you follow the lode with `drive NE` instead of
zig-zagging, and **dip** is a stair-step of `drive SE` + `sink` — which is
drift-and-winze, exactly how real mines chase a dipping seam.

### Cave-ins — two tracks, neither fatal **[from the content bible]**

- **Sealing (routine, safe)** — the reap above. Not a hazard; the map
  healing back toward the live workings. You return to find dead ground
  already walled off.
- **Collapse (rare, telegraphed, survivable)** — the danger event on a live
  push. **It blocks, it never kills.** Always announced first (creaking,
  dust, air pressure); always preventable by shoring; **no instakills,
  ever.** In v1 collapse strikes unshored Provisional rock only.

⚠ **Superseded in scope by the section below** — the *collapse* half is
**deferred until the player population can support a rescue**; what v1
builds is prevention. The rules above stand for whenever it lands.

### ⭐⭐⭐ Ground support — prevention ships; collapse waits for people **[DECIDED 2026-08-31]**

**The user's ruling:** *"I don't really want to design any actual cave-ins
until we have enough players to handle it, because that seems like a
collective-action sort of thing. However we do need to design cave-in
PREVENTION and wire that up to our mine so there's a reason no one's
getting buried."*

So v1 ships **the maintenance system, not the disaster** — and the
maintenance system is complete on its own.

#### The thing that spans rooms is the SUPPORT, not the failure

The granularity objection is right: a real roof fall is *sub-room* (a slab
off one part of the back) or *supra-room* (a district subsides), and
neither is "one room." The resolution is to stop modelling the failure
geometry and model the **support**, which is naturally multi-room and
entirely representable.

> ⭐⭐ **Shoring is a placed, durable, maintained OBJECT — not a flag.**

A timber set is a `Thing` with a `Durable` condition: timber takes load,
deforms, and rots in wet ground. The safety of a working is therefore **an
inventory of objects in known condition**, and keeping it good runs on the
**shipped repair economy** — `analyze` the set, `repair` or replace it.
**No hazard machinery at all.**

This is what gives the workflow its crafting and market halves:

- **Crafting** — props, caps and lagging are made from timber: a recipe,
  like the five smithing ones.
- ⭐ **Market** — **shoring timber is to mining what charcoal is to
  smelting**: a bulk consumable off the same coppice. That is the wood
  contest this slate kept asserting, now with two concrete consumers
  pulling on one supply (§ *Fuel is the trade* in
  [metal-chain-slate](./metal-chain-slate.md)).
- ⭐⭐ **The cheapest support is the ore you don't take.** A pillar is free
  and permanent; timber costs money. Every working therefore carries a
  standing economic choice — *buy timber, or leave the good stuff
  standing* — and it is the same span function either way.

#### Sub-room geometry already exists: it is the face model

The ten-direction model gives exactly enough resolution — **a face is a
sub-room location**, addressed by direction, engaged not occupied.

> ⭐⭐⭐ **Falls happen at FACES, not rooms.**

A face goes bad, sheds rock, and is **blocked** — rubble cleared by an
engagement. The room stays traversable, nobody is buried, nothing
cascades. Small, local, frequent, and it is the *creep* a room-scale model
cannot express, because faces degrade individually and one bad face does
not infect its neighbours.

**No cascade in v1, on principle rather than caution:** cascading requires
modelling load **redistribution**, and redistribution is precisely what
makes real collapses catastrophic — the part that needs a player
population to be survivable. **Keeping failures local is what makes the
system shippable alone.**

#### The consequence of neglect, with nobody buried

**1 · Refusal.** Bad ground **stops work**: you cannot drive a heading from
a room whose back is working, and the engagement refuses *and says why*.
Honest rather than punitive — a real miner will not work under bad ground,
and the deep-law already says ***"sap not the props."*** ⭐ Neglect costs
you **access to your own ore**, which in a trade whose income is production
is a serious penalty with no bodies.

**2 · Loose falling.** A face sheds rock: a blocked face, a broken lamp, a
bruise through the shipped harm system. Annoying, never fatal.

**And it is structurally easy to avoid**, which is the requirement: the
telegraph is **free and coarse** (creaking timber, dust, drummy rock, in
the room description), sets are cheap against ore value, and refusal is a
**hard stop rather than a gamble**. ⭐ **An attentive player cannot be hurt
in v1.** The risk belongs entirely to whoever skips dead work, and even
then the worst case is a blocked face.

#### Reading the ground rides the surveying machinery

Unchanged from § *Surveying* — three tiers, same rule that competence buys
resolution and never outcome:

- **Free / coarse** — the timber creaks, dust sifts, water seeps. Ambient,
  everyone gets it.
- ⭐ **Skilled** — **sounding the back**: strike the roof with a bar and
  listen. Solid rock rings; detached rock sounds **drummy**. The real
  technique, a `listen` act with a tool.
- **Instrumented** — a plumb or convergence marker on a prop reads the
  roof coming down slowly (`measure convergence`).

Stability itself is **derive-on-read over facts already stored** —
`f(span, ground, support, water)`, where span comes from the carved set,
ground from the host `Material`, support from the sets present and their
condition, water from the wetness substrate. ⭐ It is the **derived** kind
of [field](./field-substrate-slate.md), consuming the **seeded** geology
field's ground quality: the two compose exactly as that slate predicted.

⚠ **And it is a threshold, never a roll** — `uncertainty.md` forbids
rolling to decide what your action did. The number moves deterministically
as you widen span or let sets decay; what the player experiences as risk is
**epistemic** (they cannot see it), which is the legal provenance.

#### The timberman — maintenance is a job, funded like the pump

Support spanning rooms is what gives maintenance its shape: **you do not
inspect a room, you walk the workings.**

⭐ That is the **timberman** — a real occupation, an employment `Position`,
and the safety half of *dead work*. He patrols the levels, sounds the
backs, replaces bad sets. A maintained drift benefits everyone who uses
it, so **he is paid the way the pump is: out of the hoist toll.** No new
funding machinery — one more line item on the levy § *The commons* already
establishes.

#### What is deliberately deferred

Room-scale collapse, entrapment, the rescue clock, and ***"answer the
call"*** — **all of it waits for population.** The prevention system above
is complete without it, and collapse needs no rework when it arrives: it is
simply *what happens when the maintained thing was not maintained*, at a
scale the face model does not cover.

> ⭐ Recorded now so nothing forecloses it: **the rescue commons is this
> design's endpoint.** It is the beat that makes the deep-law's gravest
> clause real — non-excludable, uncompensated, enforced by norm rather
> than by levy. Drainage is a commons you fund; rescue is a commons you
> *are*.

### ⭐ Barren is the default — failure has to be real

A find means nothing if you cannot fail, so **the rich seam is the
exception and a survey can honestly come back "no."** The four rules:

- **Informative** — a dud teaches the ground (faulted / no roots /
  played-out).
- **Legible in hindsight** — you see *why*, so it reads fair and you catch
  the sign earlier next time.
- **Cost scales with the bet.**
- **Negative knowledge still sells** — where the ore *isn't* is worth money
  to the next prospector.

Poker, not slots. **The mine is a graveyard of other people's failed bets**,
and those bets are readable.

### The byproduct stream

Mining yields more than ore, from one conserved mass sorted: **spoil**
(logistics burden + cheap building stone), **pigments** (the
metal-dud-is-a-pigment-find twist), **the lucky pocket** (gems, native
metal), **fossils** (the scholar's hook). Different byproducts route to
different buyers and crafts. Vitriol-water chemistry and gas are deferred.

### Operating rhythm — place 24/7, operation on shifts

**The mine never locks a player out.** The co-op *operation* runs
game-clock shifts — day is alive/employed/supported, graveyard is
quiet/solo/unsupported — decoupled from real-world timezone, with an NPC
floor off-hours. **Stoppages are content, not locks**: hazard (flood, gas,
collapse), feast days, economic death (knacked, abandoned). A shutdown
reshapes access; it never denies it.

### Ore theft is possible, and diegetically enforced

No hard wall. Skimming is theft of the co-op's ore or cut; **the only
honest buyer is the co-op's window**, so you fence elsewhere at a discount.
Reckoning plus search catches patterns, and being caught costs regard,
recognition, employment, access and notoriety. **Temptation scales with
value** — deep silver is where high-grading bites.

### The cell size, and why there is no per-heading cap **[DECIDED]**

Farming caps a field at ~4 ha so one room stays honest. **Mining needs no
equivalent, because `drive` mints exactly one cell** — there is no distance
parameter to cap. The open dissolves into two smaller questions.

**What is `cellSize`?** A mine cell is *a length of drift*. The constraint
is this slate's own rule — *the generator may only emit rooms that DO
something; no filler corridors, coarse galleries not 5-ft segments* — and
the **ten-direction face model satisfies it by construction**: every cell
carries up to ten faces, each a seam to hew or a face to drive, so no cell
is filler. What is left to set the size is the only thing that makes cells
*differ*: **the distance over which the geology meaningfully changes**,
which for ore shoots and grade variation is metres to tens of metres.
**Lean ~10 m** (Terminus is 3.0, Hinkley 6.0 for open ground). One cell is
then several shifts of work, which makes `drive` a substantial engagement
rather than a step.

**What limits how much you can drive?** Nothing arbitrary, and nothing
should:

> ⭐ **The cap is your body, your clock and your lamp.** Carve cost is
> hardness × cell, paid as an engagement in game time against reserve — so
> the limit is the vitals stack, which is the whole thesis.

And the **durable** limit — the one that bounds room count rather than
session length — is the timber market:

> ⭐⭐ **You can only hold as much mine as you can timber.** Provisional
> rooms cost nothing and cull; **Held** rooms require shoring, and shoring
> is timber off the same coppice that makes charcoal (§ *Ground support*).

So the cap is **priced by a market rather than set by a dial** — which is
the better answer, and it is the third consumer pulling on the wood supply.

### ⭐⭐⭐ Room identity — nothing mints a room template

**Decided 2026-08-31**, against residences **D17**: *every `templatePath`
resolves to a row in the content collection* (lint-gated), and its own
clause for this exact case — ***"places (rooms per lot/unit) = keyed
instances of real rows."*** A mine that minted a template row per carved
cell would be the per-instance-row anti-pattern at industrial scale.

Three tiers, and they do not overlap:

| Tier | Identity | Persists |
|---|---|---|
| **Spine** — the 5 surface rooms + 3 Upper Galleries | **static singletons**: real rows, one instance each, hand-authored | always; never buds, never reaps |
| **Workings** — every carved room | **keyed member**: `(scope = one of the four type rows` — `Face`/`Junction`/`Stope`/`Fall`*, key = the cell coordinate)* | **only when Held** |
| **The geology** — hardness, grade, feature seeds | **no identity at all** — a seeded deterministic function of `(mine seed, x, y, z)` | nothing |

> ⭐ **The key is the coordinate.** Unique by construction, stable,
> derivable, never invented — and it is the *same string* § *Exit naming*
> produces. **You number what you find** turns out to do double duty: the
> player-facing address and the persistence key are one fact.

So the three concerns stay separate and each is already shipped:
**`CartesianZone` is the space · Warren bud/reap is the mutation layer ·
`(scope, key)` is the identity** (`PersistableApi.restoreOrSeed`, one
invariant: *no two live instances share a `(scope, key)`*).

### What actually persists — three sparse things

- **The carved set** — which cells are rooms, each one's tier, and who
  holds the Held ones. This is farming's **field ledger** with a different
  key: theirs is `{leaf, name, areaM2, focus, radius}` on the holding
  programme; the mine's is `{cell, tier, holder}` on its own.
- **Worked faces** — a sparse per-`(cell, direction)` record of ore
  remaining, written only for faces somebody actually hewed. Everything
  else is derive-on-read off the geology field.
- **Held room contents** — snapshot-persisted through the keyed-member
  spine. **Provisional rooms persist nothing**, which is exactly what makes
  them cullable, and why walking away and returning regenerates the same
  tunnel from the seed rather than restoring it from a record.

⭐⭐ Which makes *"shoring is this mine's provisioning act"* literal:
**shoring is what writes the record.** The persistence tier is not
bookkeeping behind the fiction — it **is** the gameplay act, the same way
an apartment's provisioning is.

⭐ And it reveals what seal-and-reap is really for. Not only the map
healing: **it is the ledger's garbage collector.** Sealing a dead subgraph
deletes its entries, which is what keeps the carved set bounded in a mine
worked for years. The per-heading cap bounds the *rate*; seal-and-reap
bounds the *total*.

### Addressing a working — build-2 already shipped the locator

Warren members have no unique template path *by construction*, which is
why residences grew the **keyed-member locator** (W2, `build/residences`):
the `:members` chain element flat-maps any Warren to its **live** members,
and two filter atoms complete it —

| Atom | Is | For a working |
|---|---|---|
| `key` | the explicit **persistence key** (`getPersistenceKey()`) | the cell coordinate |
| `address` | the declared **Locality address** — *"the human per-place identity"* (D17) | the **survey address**: `…/ferrow/400-level/north-drift` |

Both read `undefined` off an unkeyed or unaddressed object, so a
comparison never false-matches.

```
ferrow:members:[key = '-3,7,-12']
world:[mixin.PersistableMixin][address = 'terminus/rejection/ferrow/400-north']
```

⭐ **So the survey address IS the Locality address**, and the exit-naming
ruling, the persistence key and the query surface are three faces of one
decision. **Mining needs no MQL work of its own** — build-2 built it for
dorm rooms and lot yards, and a drift is the same shape.

### The solo rungs never touch the Warren

The farming parallel holds and extends one rung further down. A garden bed
in a dorm room is a **singleton object in an authored room**; a
broken-ground field is a **keyed member**. Mining has both, plus a rung
beneath:

| Rung | What it mints |
|---|---|
| **costean / test pit** on ground you hold | **an object.** No room, no member, no Warren. |
| **adit + drift** | keyed members begin |
| **shaft + levels** | the spine grows |

⭐ The entire solo end of the ladder — prospect, stake, costean — **never
touches the Warren at all**, so a lone prospector cannot inflate the
world's room count.

### Two primitives the mine needs that are not mining-specific

- **`LiftMixin`** (`lib/conveyance/`) — a called, capacity-limited, timed,
  operated vertical conveyance over `ExitableVessel + Mobile + Container`.
  **Dorms and the city want elevators too**, so it is a reusable primitive,
  not a Ferrow one-off; `ShaftCage` is the concrete class. Refined
  **cargo-agnostic** so one headframe hoists both the cage (people) and the
  **skip** (ore, `LiftMixin` + `Bulkable`).
- **`JobBoard`** (`lib/employment/`) — the first player-facing hiring
  interface; a **stateless live projection** of a Business's hiring state
  plus a sign-on affordance, **no roster stored**. `CrewBoard` is the
  co-op's. Posting and management deferred.

⚠ Both are **platform work a mining build may not be sizing.**

### Archaeology — the scholar's twin of geology

**Archaeology (ISCED-F 0222)** as the deep-history discipline: the
humanities twin of geology, a hub with cross-field edges. Hieroglyphs lead
to **decipherment** of a lost Eternal-age script — real method, a real
knowledge ladder, and the payoff is the makers' words off the Hush.
**Platform-wide** (it reads every ruin-layer), net-new, its own thread; the
decipherment engine is deferred and v1 is a taste.

### Resolved knobs and residual opens from the bible

- **Vertical transit is a called lift, not an up-exit** — the man-cage is
  the only way up for *people*; **bulk ore is decoupled** (tip at the
  ore-pass → skip hoisted up the shaft → surface tipple). Carts are
  level-bound: they never leave the level, only the ore travels.
- **Hydration** — the water butt at the station is the *last safe water*;
  deeper found-water is unreliable and foul (sulfide → toxin gamble), never
  a refill.
- **Life-gradient** — friendly working critters shallow (pit pony, canary,
  rats), hostiles only deeper. **The environment is the primary
  antagonist**; deep fauna are characterful, not a farm.
- Still open from the bible: grace-period and seal-cadence tuning; chamber
  frequency and the authored-vs-natural ratio; whether catastrophic events
  ever threaten *Held* tunnel (deferred past v1).

---

## Open (residual)

- ~~**Cave-in / structural collapse [OPEN]**~~ — **CLOSED 2026-08-31, split
  in two.** *Prevention* ships: shoring as placed `Durable` objects on the
  repair economy, falls at **faces** not rooms, neglect punished by
  **refusal** rather than burial, and the timberman as a funded position.
  *Collapse* — entrapment, the rescue clock, "answer the call" — is
  **deferred until the population can support a collective rescue** (user's
  call). It needs no new hazard system either way; stability is
  derive-on-read over span/ground/support/water. See § *Ground support*.
- **Seam model [OPEN, LEAN finite]** — finite veins you *deplete and must
  re-prospect* (drives the deduction/exploration layer), or replenishing nodes
  (steadier, OSRS-style)? Lean finite-and-prospect — it makes the one new
  primitive matter.
- **Relationship to combat/newbie-wilds** — mining is the **non-combat** risk
  vertical (danger is the environment, not a mob); it should stand as the
  peaceful-but-tense counterpart to the wilds' combat, sharing the vitals socket.
- **Numeric tuning** — Grade curves, depth↔danger↔reward, endurance drain,
  automation yield-cap. Tuned against a running game.
- **Aether-tech material [OPEN]** — add a mined modern-resource the corpos need
  for implants/hardware (ties mining to the corpo/tech economy), or keep mining to
  craft-materials only?
- **Commodity-money history [OPEN]** — was the old coin a former gold/silver
  standard the CB moved to fiat (a hard-money-vs-fiat political fault line), or has
  money always been abstract?

*(Retire when: the mechanic promotes to formal requirements, or folds into a
crafting/livelihood build that adopts extraction.)*
