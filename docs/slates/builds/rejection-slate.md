# Rejection slate (working doc) — the mining town, and the one mine

> **Status: PARTIAL** — Stage A (the metal chain) shipped 2026-09-01 →
> [mining.md](../../subsystems/mining.md)
> **Left:** everything below the water table — shaft, hoist, pump · the
> drainage commons + the hoist toll and district · sulfides and roasting ·
> collapse entrapment, the rescue clock and cascade · the deep ecology, the apex
> (dirt dragons, whelps, firedrakes) and the pre-Fallow Hush · the speaking cast
> (Val, Earl, Rhonda) + the LLM tiers over the mute town · the seismic network,
> hazard-pay clauses and claim-price risk premia · the Veshko buyout arc (the
> temporal mirror) · jurisdictional isolation of the claim field · tribute
> pitches and the setting-day auction · high-grading as an OFFENCE (needs an
> adjudicator) · the on-site governance surface · the old prospector
> **Size:** a build

Mechanics: [mining-slate](./mining-slate.md) — the four play layers, the
dangers, the deep ecology, and § *The mine's machinery* (the 3D zone,
three-state persistence, vein-vs-heading, seal-and-reap, the ten-direction
faces), **graduated 2026-08-31 out of the now-deleted content bible**.
The supply chain that consumes what the mine raises:
[metal-chain-slate](./metal-chain-slate.md).
Architecture for the cast: [llm-content-slate](./llm-content-slate.md).
Substrate: [parcel](../../subsystems/parcel.md) ·
[hazard](../../subsystems/hazard.md) ·
[encumbrance](../../subsystems/encumbrance.md) ·
[respiration](../../subsystems/respiration.md) ·
[thermal](../../subsystems/thermal.md) · [light](../../subsystems/light.md) ·
[belief](../../subsystems/belief.md) · [trait](../../subsystems/trait.md) ·
[contract](../../subsystems/contract.md) ·
[employment](../../subsystems/employment.md) ·
[perception](../../subsystems/perception.md).

---

## ⭐ The merge — what this replaces

*(SHIPPED as the one venue: the town is Rejection, the mine the Ferrow, the
`rejection` pack. The temporal mirror remains below.)*

---

## Placement — a Terminus venue

*(Placement SHIPPED — a Terminus venue at `terminus/rejection/…`, walked in by
Kestrel Road.)*

**What it costs, and the fix.** Rejection's flavour was *geographic*
isolation — a dead-end valley, one road out. On the city's edge that's gone,
so the isolation becomes **jurisdictional**, which is stronger:

- ⭐ **The claim field lies outside Terminus's declared jurisdiction.**
  [civics](../../subsystems/civics.md) already models
  Locality-declared jurisdiction with derive-on-read residency, so
  "ungoverned" stops being a fictional assertion and becomes an engine
  state. Nobody in the city cares what happens at the diggings — and the law
  formally doesn't reach them. That is the ungoverned political case,
  mechanically.
- **Val's goal re-targets.** "The fare out of the valley" no longer means
  anything with the city right there. He wants **passage through the
  terminal** (`terminus/terminal/` — the TPA hub with three departure gates
  already exists) to somewhere genuinely far: Saxonberg, the second city.
  Same money threshold, a real elsewhere.
- ⭐ **Why the city is safe and the camp is not.** Dirt dragons need loose
  ground. Terminus is built up and paved; the diggings are disturbed earth.
  So the danger gradient is legible straight off the map, and it quietly
  explains the settlement pattern — *the city is safe because it is a city.*

**The highland lore mostly survives.** The content bible sites the mine
"where the fertile valleys climb toward frontier wild," in the
"outer-valley lesser-house hills" — outskirts can climb. House Ferrow's
blazon over the lintel, the Widening lapse, and the co-op's reopening all
carry over unchanged; only "remote" goes.

---

## The reframe that runs the town

> **The town isn't dumb. It's mute.**

The simulation runs identically for every resident — the store has real stock,
everyone works real shifts, holds real regard, gets rained on. What is scarce
is not intelligence but **language**. Three residents can talk about what is
happening; the rest only *do* things. A mute NPC who is materially consistent
is far more convincing than a talkative one who is materially static — the
uncanny valley is not dumbness, it is dumb **and** context-free.

### Four tiers of townsfolk

| Tier | Who | Mechanism | Cost |
|---|---|---|---|
| **0** | the world | weather, light, shifts, stock, mine condition | free — does most of the work |
| **1** | the many | canned brains + [prose](../../subsystems/prose.md) templates **over live state** | free |
| **2** | the many, ambient | Batch API overnight: today's idle lines from *yesterday's real events* | half price, no latency |
| **3** | the three | live model calls, on `engage` or a witness trigger they'd care about | the only runtime spend |

Tier 1 is where "dumb but immersive" is won: the storekeeper's line is not
authored text, it is a template reading the stock counter — *"Powder's out
till the freight comes Thursday."* True because the counter says so, so it is
never wrong and never stale.

### ⭐ The rule that makes muteness diegetic

> **A background NPC never answers a question. It produces a fact, and
> defers.**

The storekeeper doesn't reason about the cave-in; he says the assay shed is
shut and *"ask Earl, he did the timbering."* That hides the capability
boundary inside a social convention, funnels players toward the characters
worth spending money on, and turns the mute residents into the town's
**rumour layer** — they generate facts and half-truths; the three speaking
characters are the town's mouth.

---

## The cast

Homage archetypes (*Tremors*), differentiated **mechanically** — every cell is
a number or a data source, and nobody wrote "gruff." Names likely want to
shift off the originals before ship; the archetypes are what matter.

| | **Val** | **Earl** | **Rhonda** |
|---|---|---|---|
| **Wants** | the fare out — a money threshold | a claim of his own — a parcel title | survey coverage — instrument data |
| **Knows** | today, the bar, who owes him; poor recall | every job they took, every debt, tool condition | seismograph rows **nobody else can read**; no local history, doesn't know your name until introduced |
| **Is** | impulsive, brave; regard swings fast | cautious, loyal; regard moves slowly and remembers | curious, socially oblivious |
| **Can** | dig, haul, repair, drive | dig, haul, repair, timber | read instruments — **cannot** dig |

**The goals conflict productively, and that is the engine.** Rhonda wants into
dangerous ground; Val takes the risky gig if the payout closes his gap; Earl
won't risk the tools or the partner. Three numbers, not a script.

Rhonda is also the [knowledge-asymmetry](./llm-content-slate.md) case — her
instrument rows are private to her, so she is the first consumer of the
**isolated per-character call** rather than the shared director context.

---

## Dirt dragons

The mining slate's apex predator, named and given a body. **One species, two
names** — *the Delver* in the highlands, *dirt dragons* on the frontier;
establishing they are the same animal is a real act of survey work.

**Soil, never rock.** This is the whole tactical game and it is required by
the mining slate's own law that every danger pairs with a counter. Bedrock is
safe; loose ground is not. Which means:

- **The mine manufactures its own threat.** Tailings, spoil, backfill,
  disturbed overburden — every ton moved makes more navigable ground. The
  danger map is something the players build by working.
- **The industry is the dinner bell.** They are blind and hunt by vibration.
  Drills, blasting, ore carts, a stamp mill. Production and predation are one
  variable.
- ⭐ **The risk map goes two-dimensional.** Every other danger in the mining
  slate scales with *depth*; this one scales with **ground type**. A shallow
  placer claim can be deadlier than a deep hard-rock drift.

Most counter-play is already shipped: `sneak`/`run` are locomotion modes, and
[encumbrance](../../subsystems/encumbrance.md)'s consequence ladder means **the
ore you are carrying is what gets you killed** — the whole greed decision, with
no new mechanics and no dice.

### The life cycle — three sensory games, one substrate

| Stage | Domain | Hunts by | Counter | Rides |
|---|---|---|---|---|
| **Dirt dragon** | underground, soft ground only | vibration | be still, be quiet, be on rock | locomotion, encumbrance |
| **Whelps** | surface, daylight | **heat / infrared** | be cold; they overheat and must shed it | [thermal](../../subsystems/thermal.md) |
| **Firedrakes** | airborne, night | smell + heat | be indoors, be odourless | [fire](../../subsystems/fire.md), [ranged](../../subsystems/ranged.md) far band |

Concealment is already **per-sense and band-based**, so these are three
genuinely different problems over one shipped mechanic: a player who just
climbed out of a hot drift carrying a lantern is lit up to a whelp and
invisible to a dragon.

**The names carry content.** *Firedrake* rhymes with **firedamp**, already in
the mining slate's danger list — a miner's word for a thing that flies and
burns. And *whelps* is **wrong**: the town thinks they are juvenile dragons;
they are a separate life stage. A folk taxonomy corrected by observation is
exactly the epistemics the prospecting layer is built on.

⭐ **Whelps reproduce by eating** — eat enough, split, exponential. An
unchecked outbreak has a doubling time, so the town either responds together
or is overrun: a commons problem with a clock, which is a **governance** event
rather than a raid. It also makes their combat self-pressuring — anything they
eat mid-fight becomes another one.

**The adult is a hazard, not a combatant.** Nobody wins a fight with one; you
avoid, escape, or trap it. Whelps are the fightable stage, and they live in the
old workings — a century of abandoned levels, collapsed adits and backfilled
stopes is a network of voids too small for an adult and perfectly sized for
something young. That is why the fightable thing is near rock: not moving
*through* it, living in the holes the town made and forgot.

---

## The real science is the payoff

Two places where the fiction forces genuine method — the practicum thesis with
teeth:

- **Seismic triangulation.** Three stations, arrival-time differences, and you
  locate an event in three dimensions, depth included. Discriminating settling
  from a blast from a moving animal is real signal work: periodicity,
  magnitude, depth. The player learns seismology because it is the only way to
  survive.
- **Placer versus lode is the risk gradient, for free.** Placer works loose
  sediment; lode cuts hard rock. That real economic-geology distinction *is*
  the traversability line — rich easy ground is lethal, poor hard ground is
  safe. Nothing has to be forced; that is how mining works, and the animal
  just makes it matter.

## The economy

- **Claim prices encode danger.** The market discovers the risk premium on
  soft ground by itself — real land economics produced by a predator.
- ⭐ **Hazard pay as a verifiable contract clause.** [Contracts](../../subsystems/contract.md)
  are clauses over verifiable conditions, and a seismic threshold is exactly
  that: *"pays double if station 3 exceeds twelve events in six hours."*
  Rhonda's data becomes contractually load-bearing. Tightest available
  integration; build toward it early.
- **The seismic network is a commons.** Stations break, need placing, need
  visiting, and everyone benefits whether they paid or not. An underfunded
  early-warning system in a town that makes its money by making noise is the
  political economy the platform exists to teach, at a shippable size.

## The temporal mirror

The corpo (Veshko, per the content bible) circling to buy the claim is the arc
engine, and it is how this locality carries the Ordinance lesson without a
second venue: the mine can *become* Delving 9 — safe, lit, ventilated,
provided-for, hollow — and the players are the ones who decide whether it
does. Change beats comparison, and it costs one build instead of two.

---

## Worked example — Rhonda's context window

Dusk on day 47; a stranger walks into her camp; station 3 has been misbehaving
for five days.

**Block A — identity. Cache-stable, never changes between turns.**

```
name     Rhonda — graduate seismologist, second season on the survey.
         Not from here.
traits   curious 0.9 · patient 0.7 · cautious 0.6 · trusting 0.5 ·
         deferential 0.2 · gregarious 0.2
goal     18 of 24 survey stations reporting. You need station 7 back.
register Technical and precise. Real units, error bars. No local idiom.
         Explains without condescending. Goes quiet rather than bluff.
can      read_instrument · place_station · analyze · walk · give · trade
cannot   dig · timber · haul · fight
```

**Standing orders** — the doctrine, in four lines:

```
- You say and propose. You never decide outcomes. Asked whether ground
  will hold, you give a reading and its error, not a verdict.
- You know only what appears below. If it isn't there, you don't know it,
  and you say so.
- You don't know a person's name until you're told it.
- You may be busy, refuse, or end the conversation.
```

**Block B — slow state.** Re-cached a few times an hour: survey progress,
supplies and money, open contracts, instrument condition.

**Block C — volatile.** Everything after the last cache breakpoint.

```
TIME     day 47, 19:40, dusk. Clear, 14°C, wind 8 km/h west.
PLACE    Survey camp, east bench. Open sky. Firelight — dim.
PRESENT  Earl  [known · regard +12]
         an unfamiliar man  [unknown · regard 0 · no name]
SPEAKER  the unfamiliar man

MEMORY   day 44 · station 7 stopped reporting; you haven't reached it
         day 46 · Earl refused to re-timber the north drift — said the
                  ground "sounds wrong." You logged the remark.
         day 46 · the store has no powder until Thursday

INSTRUMENTS  — only you can read these —
  station 3   north drift, 340 m   14 events/6h   max M1.8   ↑ from 2/6h
  station 5   east bench,  120 m    1 event/6h    max M0.4   nominal
  station 7   south tail,  600 m    —             offline since day 44
  station 3's cluster is shallow, under 40 m, and periodic.
  Periodic is wrong for settling.
```

That last line is the design paying off: **the drama enters the world as a
sensor reading in a context window nobody else has.** She cannot say
"something is down there" — she is not a narrator. She can say the pattern is
periodic and settling isn't, which is worse.

Note the provenance of the powder line: a *mute* NPC produced a fact, it
became a belief row, and a *speaking* NPC is who can voice it.

**What comes out is commands, not prose:**

```
say "Station three's been running fourteen events in six hours since
     Tuesday. Shallow — under forty metres. And periodic."
emote frowns at the drum
```

Had she emitted `dig`, the dispatcher refuses her — she has no such verb — and
the refusal is *real* rather than a prompt asking her to stay in character.
**Write-back:** anything she asserts becomes a belief or chronicle row, so the
record is the source of truth on what she said, not the model's memory of it.

---

## The payoff

The scenario nobody authored: the seismograph shows movement under the north
drift; Earl reads the timbering and refuses; Val's fare gap is $340 and the
hazard contract pays $500. The player walks in on an argument that exists
because **three goal-states and one sensor reading intersected** — and can
settle it in any direction, including badly.

## The venue — graduated from the content bible **[2026-07-13, still live]**


### The charter, and the history you dig down through

*"A working delving run by an independent miners' cooperative, up where
the fertile valleys climb toward frontier wild."* **Veshko** — heavy
industry, *"results are the only morality"* — is the off-taker for the ore
and is quietly circling to buy the claim outright. **Independents holding
their ground against a corpo is the arc engine.**

Depth is an archaeological section — three layers:

1. **Geological deep-time** — the lode was emplaced by hot fluids aeons
   ago, its cap weathered to oxide near-surface. What the *geologist*
   reads.
2. **The human layer** — the co-op did not dig virgin ground: **they
   reopened a lapsed great-house mine.** A peerage house worked this lode
   for coin and craft, then abandoned it at the **Widening** (as it
   abandoned its manor); commoners of the lapsed countryside reopened it a
   generation on, working the leavings and going deeper than the house
   dared. Evidence on the ground: a weathered **house-mark** over the old
   adit, finer dressed stone up top, a **played-out oxide zone**, a ruined
   count-house on the surface.
3. **The deep layer** — below the house-workings the strata approach the
   **pre-Fallow wired aether**; the workings stop looking like anyone's
   mining and become **the Hush**. The co-op, chasing silver down-dip, is
   unknowingly digging *toward* it.

> ⭐ **The ownership chain is the world's whole economic history in one
> hole: house → abandoned at the Widening → reclaimed by the commons
> (co-op) → Veshko now wants it corporate** — which is what makes the
> buy-out arc quietly tragic.

**What a newcomer learns, in the order the mine forces it on them:** the
body under stress (dark → *light*; bad air → *respiration*; deeper is
hotter → *thermal*; cutting spends you → *reserve*; ore is heavy →
*encumbrance/haulage*) · extraction → economy (cut it, haul it, assay it,
sell it) · teamwork and emergent roles (hewer, hauler, lamp-scout,
timberer) · **a claim is a parcel** — *"mining is a sneaky-good teacher of
ownership."*

**Archetypes served:** prospector, geologist, survivalist, hauler.

**The core state-change:** the push-your-luck descent. *One more cart, or
climb out while I still can?* **The vertical shaft is the escape route
whose length is the tension.**

### The authored spine

*(SHIPPED as the `rejection` pack's rows — pithead yard, claims office, assay
shed, provisioning, the Dry, the adit; cage bottom, timbered drift, winze head;
Face/Junction/Stope/Fall. ⚠ The Hush shipped as a NATURAL CHAMBER — its own
`SphericalZone` off an authored pin, mining.md § *Features, and the chamber
seam*; the Wire-Deep / pre-Fallow payload is still unbuilt.)*

### The cast

Distinct from the three *speaking* characters (Val, Earl, Rhonda) in
§ *The cast* above — these are the mine's own functional roster:

- **The old prospector** — mentor; reads rock, teaches push-luck wisdom.
  (Lives down the west drift at the face.)
- **Deep fauna** — cave-adapted, stranger toward the wire; characterful
  threats, not a spawn-farm. Mostly deferred.

### The arcs

1. **Tutorial** — *cut your first cart* → the loop.
2. **The push-luck arc** — follow a seam deeper.
3. **The faultline arc** — Veshko wants the delving: hold or sell?
4. **The Hush** — what is in the wire-deep (capstone).

### Objects still needing a scoping pass

Big-mechanism threads: the **seam / mineable face**, the **tribute-pitch
mechanism** (a share-contract over a pitch), the **readable inscription**
(house-mark + deep-law board + deep glyphs → archaeology). Light and heat:
lamp, fixed wall-lamps, stove. Tools: pick, shovel, pinch-bar, sledge;
hand-drill + drill-steel + powder (deep tier); shoring timber. Haulage and
water: ore cart, water butt and flask, drainage gutter and sump, the winze
and windlass. Rock: the seam, the carve-face, ore.


### Two bible opens that are venue calls, not mechanics

- **Arrival** — a TPA terminal at the Pithead, or a walked frontier-road
  approach? *Leaning both: TPA for return trips, a road for the felt first
  arrival.*
- **Does the co-operative have a governance surface on-site** — deep-law
  as a mini-Assembly — or is that flavour for v1? *Bible leaned flavour;*
  ⚠ *the metal-chain session's commons ruling (the district as a voluntary
  `Organization` with a register, and the pump levy) makes this a real
  surface rather than flavour. Revisit.*

---

## Open

4. **Two platform primitives** the content bible commits to that don't exist
   and aren't mining-specific: `LiftMixin` (`lib/conveyance/`) and `JobBoard`
   (`lib/employment/`). Platform work a mining build may not be sizing.
5. **Cast names** — how far off the originals to move them.
6. **How much of the collapse is knowable.** If the old workings hold the
   answer that's an investigation vertical; if it stays rumour the town is
   cheaper and spookier.
7. **Whether the full life cycle runs here** or whelps and firedrakes are a
   later escalation the town only dreads at first.
