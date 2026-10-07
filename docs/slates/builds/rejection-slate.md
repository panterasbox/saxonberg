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
> the on-site governance surface · the old prospector ·
> ⭐⭐ **the quarry column's DENSITY (added 2026-09-23, extraction build)** —
> the extraction build authors ONE pit whose column stacks granite over
> limestone over coal over rock salt in a single hillside, so every drive step
> is reachable in one place. That is a mineral museum and it fails lens 1's
> *derivable world* for anybody who knows geology. **The honest spread is two
> or three small rooms with an honest column each** (a stone pit · a
> lime-and-coal cut · a salt spring) — more rows, **no more code**, and the
> drive walks between them. Deliberately deferred by the user to a dedicated
> content pass that builds out what 1.0 ships for real; this is that pass's
> work.
> ⭐⭐ **Added 2026-10-07 (content pass):** the **1996 prototype** is on
> disk (`zone/null/spiffy/areas/minetown/` — Sue, Tina, the pogo stick,
> BobCode, and a handyman shop with no handymen in it) · **residents
> decided — yes, but not the miners**, and Val and Earl may be the whole
> local cast · **the graboids are TERRAIN, not a boss**, which hands the
> town *the only safe place is the one that is killing you* · ⛔ the
> juvenile-graboid-in-the-workings idea refused · ⚑ one open question left:
> does the town know what they are?
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

## ⭐⭐⭐ The 1996 prototype — and it survives

Added 2026-10-07. Rejection's cast is not a fresh invention: a version of
it was built for EotL and never published, and **it is still on disk** at
`zone/null/spiffy/areas/minetown/`.

```
room/   diner.c  handy.c  trailer.c  plant.c  road1-4.c
mon/    sue.c  suecc.c  tina.c
obj/    pogostick.c
mov/    tinapogo.mov  tinadiner.mov  tinafind.mov  tinanewguy.mov
        suediner.mov  suemoney.mov
```

⚠ **`room/handy.c` is seven lines — *"a handymans shop"* — and there is no
`val.c` or `earl.c`.** But Val existed concretely enough to be read:

```c
// tina.c, fixcheck()
if( objectp(val=present("val",ENV(THISO))) && val->query("working") ) {
    mp_setup(MOV "tinabother");
```

⭐ A `working` property on Val, and a program for a child pestering him
while he is busy. **`tinabother.mov` was never written.** The hook
survives and the handymen do not — which is the same scar as the shop.

### What the prototype already had, and where it now lives

The NPCs were written in **BobCode** (`doc/mudlib/bobcode.doc`), whose
opening sentence is this project's thesis stated thirty years early:

> *"This allows you to have your monsters **take on activities and
> interaction when alone, rather than just sit around and wait to be
> killed.**"*

`tina.c` carries, in 199x LPC:

| what she has | where it lives now |
|---|---|
| `friends` / `foes` string arrays, `save_object` across reboots | [belief.md](../../subsystems/belief.md) — per-viewer identity memory |
| three-tier recognition (stranger / known / attacked) | regard + the auto-introduce feature |
| `set_msgin("pogoes in")` by mode; short changes with her state | [presentation.md](../../subsystems/presentation.md) — the late-bound forms |
| a route program with `@groundcheck` between every move | [behavior.md](../../subsystems/behavior.md) — brains with `candidate` triggers |
| halting every other NPC's program to stage one scene | `StagedMixin`'s troupe, and nothing else yet |

⭐⭐ **So the cast table above is a re-derivation of something that
already ran.** Tina is a working prototype of the belief and presentation
layers, and the only thing she lacked was a platform willing to
generalize her.

### ⭐⭐ Sue is the model for how a business should be written

`sue.c`'s description is three economic facts, all of them personal:

> *"Her husband died some years back in a freak mining accident, so now
> she runs this place to support her daughter, Tina. It's not much, but
> **the owner of the plant kicks in money to help 'em out once a month**
> too. The town likes 'em here, so they have **fairly little problem
> paying the bills.**"*

The industry killed her husband, which is why the diner exists; the plant
owner pays her monthly **off the books**, so the town's welfare is a man
rather than an institution; and **she is solvent because the town likes
her** — her regard *is* her revenue.

⭐⭐⭐ **The character's circumstances ARE the economy.** Not a business
with a person attached — a business that is the consequence of what
happened to somebody. That is the standard for every premises in
Rejection. See [content-craft.md § 3](../../content-craft.md).

⚠ And one defect worth keeping as a warning: the best line in Minetown
has **never fired.** `call_out(#'command,12,"I swear that girl'd lose her
head if it weren't attached...",THISO)` is missing its `say`, so it would
parse as a command verb and fail — and nobody noticed in thirty years,
because reaching it requires dropping *an item Tina herself owns* in
front of her mother.

## ⭐⭐ Residents — yes, but not the miners

**Decided 2026-10-07.** The town has residents; **the miners are not
among them.** What locals staff is the *supporting* economy, and for a
town of this type that is very small — ⭐ **Val and Earl may be all it
needs.**

That is not a shortfall against the settlement model, it is the model
being honest: Perfection, NV has a population of fourteen and that is the
point of it. Rejection is a resource town under this document's own death
sentence, so ⚠ **it should feel underpopulated.**

⭐⭐⭐ **And the handyman is a content-coverage solution that is also a
character.** A generalist can plausibly fill any economic hole, and a
dying town can only *afford* generalists — the specialist left years ago.
So Rejection does not want a general store and a realty office and a
registry; it wants **two men who do all of it, badly, and resent it.**
Being underemployed and taking any job is who they are, so the coverage
comes out of the character sheet rather than in spite of it.

⭐ And Val's existing `Wants` cell — *the fare out, a money threshold* —
is the settlement model as character. **The people still here are the
ones who have not left yet, and the town's dying is what keeps them.**

## ⭐⭐⭐ The graboids are terrain, not a boss

The threat the cast is aware of, and the shape it has to take.

⚠ **Nobody in *Tremors* wins a fight.** Burt and Heather kill one because
they were **already prepared and everybody thought they were paranoid** —
the rec room full of guns is a joke until it isn't. Everything else in
that film is traps, terrain, and somebody having an idea: the pipe, the
bulldozer, the pole vault, the cliff.

⭐⭐ So the encounter is not a boss fight. It is **a situation that pays
off having prepared and having an idea**, and reaching for a boss is the
same mis-borrow as reaching for environmental storytelling in a world
that runs (see [content-craft.md § 5](../../content-craft.md)).

And the grammar underneath it is: **they hunt by vibration, and they
cannot move through rock.**

### ⭐⭐⭐ Which hands the town its central tension for free

**The only safe place is the one that is killing you.**

The mine is rock, so it is graboid-proof — and it is also where the
rockfall and the damps and the water table are. The surface is safe from
the mine and lethal from below. ⭐ That explains why anybody lives in a
town nobody should live in, it costs nothing (rock versus loose ground is
already what a floor knows about itself — see
[ground.md](../../subsystems/ground.md)), and it is honest.

⛔ **So the juvenile-graboid-in-the-workings idea is refused.** If they
can get into the mine, the rock/surface distinction collapses — and that
distinction is the only thing holding the setting together. It would
trade the premise for one encounter. ⭐ The honest version of the same
itch is to make the mine feel less safe **without breaking the rule**:
a seam thinning toward drift, a working that breaks into loose ground, a
shaft collar everybody hurries through.

### ⚑ Open — does the town know what they are?

In *Tremors* nobody does, and that is the first forty minutes; Rhonda's
instruments are the only honest evidence anyone has.

- If the cast **names** them, Rejection is a monster town.
- If they do not, it is **a town with a problem nobody has explained
  yet** — and then Val and Earl's idle lines get to be about the dog that
  went missing and the fence that fell over, which is a far better use of
  them, and it makes Rhonda's seismograph rows the only thing in the
  valley that is actually *about* it.

⭐ Lean: they do not know. It costs nothing, it is what the source does,
and it puts the knowledge asymmetry the cast table already wants
(Rhonda's private instrument rows) at the centre of the town's one real
question rather than at the edge of it.

⚠ And the traps are already shipped and unused
([hazard.md](../../subsystems/hazard.md), `TrapKit` in
[stealth.md](../../subsystems/stealth.md)). The content question is
whether a player can **set** one, not whether they can find one — because
an improvised trap is the only version that reproduces the source.

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
