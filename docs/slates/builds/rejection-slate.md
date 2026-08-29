# Perfection slate (working doc) — the mining town that talks back

> **Status: experience design, pre-requirements.** A small mining town in a
> dead-end valley, built as the **content exemplar for LLM-driven NPCs**
> ([llm-content-slate](./llm-content-slate.md)). Three residents are driven
> by a language model; the other eleven are not, and the design problem this
> slate exists to solve is making that boundary **invisible and diegetic**.
> Homage to Perfection, Nevada — the characters come from *Tremors*, the
> industry does not.

Leans on: [mining](./mining-slate.md) (the industry) ·
[llm-content](./llm-content-slate.md) (the architecture) ·
[npc-behavior](./npc-behavior-slate.md) (the brain ladder) ·
[belief](../../subsystems/belief.md) (recognition + regard) ·
[trait](../../subsystems/trait.md) · [contract](../../subsystems/contract.md)
(gig labour) · [employment](../../subsystems/employment.md) ·
[parcel](../../subsystems/parcel.md) + [smallholding](../../subsystems/smallholding.md)
(claims) · [fasttravel](../../subsystems/fasttravel.md) (the road out) ·
[perception](../../subsystems/perception.md) · [biome](../../subsystems/biome.md).

---

## The reframe that makes it work

> **The town isn't dumb. It's mute.**

The simulation runs identically for all fourteen residents — the store has
real stock, everyone works real shifts, holds real regard for the player,
gets rained on. What is scarce is not intelligence but **language**. Three of
them can talk about what is happening; the other eleven only *do* things.

That reads as immersive rather than cheap because a mute NPC who is
materially consistent is far more convincing than a talkative one who is
materially static. The uncanny valley is not dumbness — it is dumb **and**
context-free.

## Taking the liberty at the economy, not the people

*Tremors* establishes geographic isolation and a highway out, and essentially
no industry — which is a gift: the economy is ours to install and the
characters survive it intact. (The franchise's own prequel arguably helps
here: the town was founded as a silver-mining camp called Rejection and
renamed itself later. Worth confirming before it goes in any player-facing
text.)

Mining buys four things the town needs:

1. **Contract labour** — Val and Earl are handymen, so they are gig workers
   ([contract](../../subsystems/contract.md)).
2. **A company store** with finite stock — the honest-numbers surface the
   mute residents speak from.
3. **Claims that can be owned** ([parcel](../../subsystems/parcel.md)).
4. ⭐ **An economic reason for seismographs to exist.** Rhonda stops being a
   tourist with instruments and becomes the person whose data says where the
   ore and the cave-ins are.

And **make the road real**: one [fast-travel](../../subsystems/fasttravel.md)
node out of the valley, with a fare. Isolation you can price is isolation the
player can feel.

---

## The three, differentiated mechanically

| | **Val McKee** | **Earl Bassett** | **Rhonda LeBeck** |
|---|---|---|---|
| **Wants** | the fare out — a money threshold | a claim of his own — a parcel title | survey coverage — instrument data |
| **Knows** | today, the bar, who owes him; poor recall | every job they ever took, every debt, tool condition | seismograph rows **nobody else can read**; no local history, doesn't know your name until introduced |
| **Is** | impulsive, brave; regard swings fast | cautious, loyal; regard moves slowly and remembers | curious, socially oblivious |
| **Can** | dig, haul, repair, drive | dig, haul, repair, timber | read instruments — **cannot** dig |

Every cell is a number or a data source. Val's recklessness is a goal that
pays out above a threshold; Earl's grudges are a slower regard-decay
constant; Rhonda's outsider status is
[belief](../../subsystems/belief.md)'s recognition rule doing its ordinary
job. Nobody wrote "gruff."

**The goals conflict productively, and that is the engine.** Rhonda wants
into dangerous ground; Val will take the risky gig if the payout closes his
gap; Earl won't risk the tools or the partner. The *Tremors* dynamic, as
three numbers rather than a script.

### Rhonda is the asymmetry case

She is the reason
[llm-content-slate](./llm-content-slate.md) § *Knowledge asymmetry* exists:
her instrument rows are private to her, and a shared director context would
hand them to everyone. She is the first consumer of the **isolated
per-character call**.

---

## Four tiers of townsfolk

| Tier | Who | Mechanism | Cost |
|---|---|---|---|
| **0** | the world | weather, light, shift schedules, stock levels, mine condition | free — and does most of the work |
| **1** | the eleven | canned brains + [prose](../../subsystems/prose.md) templates **over live state** | free |
| **2** | the eleven, ambient | Batch API overnight: today's idle lines conditioned on *yesterday's real events* | half price, zero latency |
| **3** | the three | live model calls, on `engage` or a witness trigger they'd plausibly care about | the only runtime spend |

Tier 1 is where "dumb but immersive" is actually won. Walter's line is not
authored text, it is a template reading the stock counter — *"Dynamite's out
till the truck comes Thursday."* True because the counter says so, therefore
never wrong and never stale.

Tier 2 is the underrated one: a miner grumbling about the north drift the
morning after the north drift flooded, written overnight by a model that saw
the day's events, replayed at runtime for nothing.

## ⭐ The rule that makes muteness diegetic

> **A background NPC never answers a question. It produces a fact, and
> defers.**

Walter doesn't reason about the cave-in; he says the assay office is closed
and *"ask Earl, he did the timbering."* Melvin doesn't converse; he repeats
something he overheard, wrong.

That deferral does three jobs at once: it hides the capability boundary
inside a social convention, it funnels players toward the characters worth
spending money on, and it turns eleven mutes into the town's **rumour
layer** — they generate events and half-true beliefs, and the three speaking
characters are the town's mouth. The mute residents never need to be clever;
they need to produce state the clever ones can talk about.

---

## Worked example — Rhonda's context window

Dusk on day 47; a stranger walks into her camp; station 3 has been
misbehaving for five days.

**Block A — identity. Cache-stable, never changes between turns.**

```
name     Rhonda LeBeck — graduate seismologist, second season on the
         Perfection survey. Not from here.
traits   curious 0.9 · patient 0.7 · cautious 0.6 · trusting 0.5 ·
         deferential 0.2 · gregarious 0.2
goal     18 of 24 survey stations reporting. You need station 7 back.
register Technical and precise. Real units, error bars. No local idiom.
         Explains without condescending. Goes quiet rather than bluff.
can      read_instrument · place_station · analyze · walk · give · trade
cannot   dig · timber · haul · fight
```

**Standing orders** — where the doctrine lives, in four lines:

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
PRESENT  Earl Bassett  [known · regard +12]
         an unfamiliar man  [unknown · regard 0 · no name]
SPEAKER  the unfamiliar man

MEMORY   day 44 · station 7 stopped reporting; you haven't reached it
         day 46 · Earl refused to re-timber the north drift — said the
                  ground "sounds wrong." You logged the remark.
         day 46 · Walter has no dynamite until Thursday

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

Note the provenance of the Walter line: a *mute* NPC produced a fact, it
became a belief row, and a *speaking* NPC is the one who can voice it. The
rumour layer, working.

**What comes out is commands, not prose:**

```
say "Station three's been running fourteen events in six hours since
     Tuesday. Shallow — under forty metres. And periodic."
emote frowns at the drum
```

The `say` rides the ordinary speech path and the room hears it. Had she
emitted `dig`, the dispatcher refuses her — she has no such verb — and the
refusal is *real* rather than a prompt asking her to stay in character.

**Write-back:** anything she asserts becomes a belief or chronicle row, so
the record is the source of truth on what she said, not the model's memory of
it. That is what stops her contradicting herself next Tuesday.

---

## The payoff

The scenario nobody authored: Rhonda's seismograph shows movement under the
north drift; Earl reads the timbering and refuses; Val's fare gap is $340 and
the hazard contract pays $500. The player walks in on an argument that exists
because **three goal-states and one sensor reading intersected** — and can
settle it in any direction, including badly.

## Open

1. **The mine itself** — depth model, claim subdivision, cave-in as a
   [hazard](../../subsystems/hazard.md) consumer; how much comes from
   [mining-slate](./mining-slate.md) unchanged.
2. **What is under the north drift.** Deliberately unanswered here; the
   seismic signature is designed to support an answer without asserting one.
3. **The other eleven** — the roster, their trades, which facts each one
   produces for the rumour layer.
4. **Sponsorship surface** — if the three are patron-funded
   ([llm-content-slate](./llm-content-slate.md) § *Funding*), how the town
   displays it without breaking the fiction.
5. **Pack shape** — whether Perfection ships as its own content pack and what
   title root it claims.
