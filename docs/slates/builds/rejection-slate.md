# Rejection slate (working doc) — the mining town, and the one mine

> **Status: merged design, pre-requirements. Placement DECIDED
> 2026-08-29 — this is a venue on the OUTSKIRTS OF TERMINUS**, the main
> locality, not a separate sphere. **One venue**: a mining camp, the mine
> below it, and the staked claim field around it.
> **Ferrow's mechanics + Rejection's cast** (decided 2026-08-29). It carries
> three jobs at once — the **materials faucet** (ends the metal-import era),
> the **property teacher** (staked private claims), and the **content
> exemplar for LLM-driven NPCs**.

Mechanics: [mining-slate](./mining-slate.md) (the four play layers, the
dangers, the deep ecology) + `docs/staging/ferrow-delving.md` (the content
bible — the 3D zone, three-state persistence, vein-vs-heading, seal-and-reap;
⚠ **staging is ephemeral**, so the mechanics it resolved need to graduate into
this slate or the mining slate before that file is deleted).
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

**Three localities running one shared engine was three content builds for one
system's worth of mechanics.** Mine #1 ends the metal-import era; mines #2 and
#3 end nothing, while farming and every other industry go unbuilt. So:

| Was | Now |
|---|---|
| Ferrow Delving (co-op mine, highlands) | **the mechanics** — inherited whole |
| Delving 9 (the Ordinance mirror, a second venue) | **not a build.** The mirror runs **in time** — Delving 9 is what this mine *becomes* if the corpo wins. Still canon as fiction. |
| Perfection / Rejection (a third, frontier mine) | **this locality** — the one mine, with the frontier cast |
| Rejection as "the ungoverned political case" | the **town**, not a second mine |

**Names (proposed).** The **town is Rejection**; the **mine is the Ferrow**.
Each name keeps the half it earned, and it sidesteps a live vocabulary
collision — *"the delve"* is already shipped content (the newbie-wilds trap
ruin), so nothing new should be called a Delving.

**Two inherited contradictions still to settle** (both predate this merge):
`content-pack-units.md:94` calls Ferrow *commons / deep-law* while the content
bible §9 makes it a **company mine held by a co-op `Business`** on tutwork and
tribute. And the co-op model has to be reconciled with the staked-claim field
this slate adds — historically they coexist (a company operation with
independents working the margins), which is probably the answer.

---

## Placement — a Terminus venue

**Decided 2026-08-29: the outskirts of Terminus.** Not its own sphere, not
the highlands. It follows the **Hinkley Hills precedent** exactly — that
suburb is a `CartesianZone` declared at `world/terminus/hinkley-hills.yaml`
with its rooms in the sibling folder, `cellSize: 6.0` rather than the city's
3.0 because *"this is open ground with room between things,"* and ownership
deliberately **not** declared in the zone (it lives in the gated `parcels`
collection — the governing security invariant). The camp takes the same
shape; the mine itself is the separate **3D zone with negative z** the
content bible specifies.

**What this buys.** The materials faucet closes inside one locality:
`terminus/general-store/goods/iron-ingot.yaml` is the shop-side stand-in the
mine exists to replace, `counting-houses` is the bank the buyout runs
through, and `registry` charters the co-op. Mine → ore → shop → player, all
walkable. It also means low-level players reach the mine, which the remote
version made hard.

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

## Open

1. ✅ **RESOLVED 2026-08-29 — the outskirts of Terminus.** See § *Placement*.
1b. ⚠ **Property-teacher overlap with Hinkley Hills.** Hinkley already
   teaches land title on Terminus's outskirts — lots, `PlatBook`,
   `LotHolder`. This venue would teach **mineral** claims. That is a genuine
   real-property distinction (split estate: surface rights vs mineral
   rights, which can be severed and held by different people) and the pair
   could teach it well — but it is two property venues on the same city's
   edge, and worth a deliberate yes rather than drifting into it.
2. **Ownership model** — the co-op/commons contradiction above, and how the
   staked claim field coexists with a company operation.
3. **Graduating the content bible's mechanics** out of ephemeral `docs/staging/`
   before that file is deleted: the 3D `CartesianZone` with negative z, the
   three-state Spine/Held/Provisional persistence, mine-a-vein vs
   carve-a-heading, seal-and-reap at chokepoints.
4. **Two platform primitives** the content bible commits to that don't exist
   and aren't mining-specific: `LiftMixin` (`lib/conveyance/`) and `JobBoard`
   (`lib/employment/`). Platform work a mining build may not be sizing.
5. **Cast names** — how far off the originals to move them.
6. **How much of the collapse is knowable.** If the old workings hold the
   answer that's an investigation vertical; if it stays rumour the town is
   cheaper and spookier.
7. **Whether the full life cycle runs here** or whelps and firedrakes are a
   later escalation the town only dreads at first.
