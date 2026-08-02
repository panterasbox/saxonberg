# Mind slate — the equilibrium, and what disturbs it

**Captured 2026-08-02**, out of the physiology slate's admission that
**the mind is the one part of the experience that is not modelled.**
**Reframed the same day** (below) from a single-condition design into a
general one.

> ⭐⭐⭐⭐⭐ **Build the equilibrium everyone lives in. Conditions are what
> disturbs it.**

The subject is **not** mental illness. It is **the mental state everyone
has**, of which illness is a perturbation — which is both the honest
framing and the one that is entirely codable without settling a single
question about any named condition.

> **Status: design direction, nothing built.** Foundation is the
> **deferred `traits-stress` build**, already specified in
> [trait.md](../../subsystems/trait.md).

Related: [trait.md](../../subsystems/trait.md) (**the foundation**),
[reserve.md](../../subsystems/reserve.md) (the equanimity Reserve),
[activity.md](../../subsystems/activity.md) (**the start/stop axis**),
[emotes.md](../../subsystems/emotes.md) (**the evidence channel**),
[belief.md](../../subsystems/belief.md) (per-viewer regard — **the
discovery mechanism**), [chronicle.md](../../subsystems/chronicle.md)
(the outside view), [magic.md](../../subsystems/magic.md) (Composure /
the Reeve Line), [physiology-slate](./physiology-slate.md) (the
pharmacology), [mortality.md](../../subsystems/mortality.md) (the
linkdead-freeze precedent).

---

## The hard rule

> **Honest or not at all.**

Modelling this badly is worse than not modelling it. Every mechanic has to
survive: *"is this what it is like, or is this what it looks like from
outside?"* Same bar as `arcane-science.md`'s *nothing may contradict real
science*.

---

## ⭐⭐⭐⭐ Three tiers, and only one is about illness

| Tier | What | Who has it |
|---|---|---|
| **the equilibrium** | stress fills when you act **against yourself**, empties when you live **in accordance with who you are** — ⭐ **and "yourself" is CONFIGURABLE, see § the dials** | **everyone** |
| **situational** | grief, burnout, fear, exhaustion — **reactive, resolves** | anyone, sometimes |
| **persistent** | ⚠ **not all oscillatory** — see § *Shapes* — managed, not cured | some people |

> **Everyone has a mental state. Illness is what happens when the
> equilibrium cannot be reached.**

**The build order falls out**: tier 1 is the substrate and is valuable on
its own **even if no named condition is ever authored.** Tiers 2 and 3 are
**content on a system.**

⭐ This is **CK3's actual insight**, and the good one: **stress comes from
being untrue to yourself**, not from adversity. We have trait positions
**derived from what you actually did**, so *acting against yourself* is
**computable** rather than declared.

---

## The structural problem

The body is simulated and the player **observes** it. The mind is not —
**the player is it.** Therefore:

> ⭐⭐⭐⭐ **A mind condition cannot be a readout, because the thing it
> affects is the reader.**

The mechanism lives in **the channel between the game and the player** —
what you are told, how reliable it is, how the world looks from inside.

### ⭐⭐⭐ And the "avatar has no mind" objection dissolves

**(User: *"the player has a real mind and the avatar doesn't, so I don't
know."*)**

> **The avatar has no mind — and it has no PAIN either. We model pain
> fine.**

Pain is a fact about the body rendered as a message to the player. A mental
state is a fact about the brain rendered as a change in the channel. **Same
move, one level up.**

> **The condition belongs to the AVATAR. The experience belongs to the
> PLAYER.** Not a compromise — the split the whole game already runs on.

---

## What already exists

| Piece | State |
|---|---|
| **traits** — 17 opposed pairs, derived on read over `disposition_events` | **shipped** |
| **emotes** — SoulMixin, Emote Ideas, EmoteGrammar, three dispatch paths | **shipped, purely social** |
| **the activity framework** — `SustainedEngagement`, slots, **`AbortReason`** | **shipped** |
| **regard / belief** — per-viewer, accumulated | **shipped** |
| **Composure / the Reeve Line** | shipped (magic) |
| **the equanimity Reserve** (stress) | **specified**, deferred to `traits-stress` |
| **the break condition** | **specified**, deferred |
| ⭐ **the cope-drinking → tolerance spiral** | **specified**, deferred |

⭐⭐⭐⭐ **That last row is remarkable** — somebody already saw that
**self-medication is where mental health meets pharmacology** and named
it, before either half of this design existed. It is the exact bridge to
[physiology-slate](./physiology-slate.md) § Part 7h.

> **The mind has a vital sign, an anatomy, and a designed break. Nothing
> READS any of it** — the same finding as the anatomy in the physiology
> slate.

---

## Mechanism 1 — ⭐⭐⭐ the start/stop axis

**(User: *"depression/mania in particular is somewhat expressable through
our sustained activity system — when you're depressed everything just
feels a little bit harder."*)**

The precise version is sharper than "harder":

> **Depression is not SLOWNESS. It is NOT FINISHING.**

**Initiation and persistence, not speed** — and that maps exactly onto
shipped machinery: `SustainedEngagement` plus the **`AbortReason`
vocabulary.** *The activity system already models "you stopped, and here
is why."* **Adding an honest reason costs almost nothing.**

### ⭐⭐⭐ One axis, both directions

> **The ability to START and to STOP.**

- **Depression** — trouble starting, trouble continuing.
- **Mania** — trouble stopping, and too much starting. *(Increased
  goal-directed activity is literally a diagnostic criterion, not a
  metaphor.)*
- **Anxiety, burnout, grief, exhaustion** — all live on the same dial.

> **One mechanic, many conditions.**

---

## Mechanism 2 — ⭐⭐⭐⭐ emotes as EVIDENCE

**(User: *"both may even be measurable through emotes but we've never
talked about making emotes mechanical. right now they're purely
social."*)**

Keep them socially pure. The inversion is the point:

> **Emotes do not DO anything. They are how you are READ.**

**Not output** — the game puppeting your character's expression would
break the agency guard below. **Input**: your expressive history becomes a
**`disposition_events` source**, exactly like every other trait signal,
because **emoting is something you did.**

> ⭐⭐⭐ **The lounge doctrine applied to expression: EVIDENCE IN, NO
> EFFECTS OUT.**

No combat emotes, no buff emotes, nothing to optimise — and it is **the
honest instrument** for the discovery model below, because it is how
people actually read each other:

> **Nobody diagnoses a friend. They notice you stopped laughing.**

Visible to anyone who was there, recordable by the system, **nothing
broadcast.**

### What is already on an `Emote` (checked 2026-08-02)

**(User: *"emotes already have some metadata on them for our reputation
system… it's barely thought out but it's there."* More than barely.)**

- **`valence: number`** — the **signed renown value of the emote AS A
  REACTION** (esteem `+` / notoriety `−`, default `0`); seeded
  cheer/applaud/clap/laugh/grin/agree `+1`,
  scowl/glare/frown/disagree/groan `−1`. Deliberately per-emote, **not** a
  central config map.
- **`tags: string[]`** — the classification hook, consumed by the reaction
  layer for chip grouping (`tags[0]`).
- The renown event carries **"raw, uninterpreted emote + tags (no
  valence/polarity, no score)"** — record raw, interpret at read.

#### ⭐⭐⭐ Which exposes exactly the seam this needs

> **Valence says what the emote means about the TARGET. The mind layer
> needs what it means about the ACTOR.**

Same emote, two readings: laughing at your joke is `+1` esteem **toward
you**; laughing *at all* is evidence **about me**. **One is shipped, the
other is not** — genuinely different axes, not one number reused.

#### ⭐⭐⭐⭐ And the inward read needs NO new metadata

The tempting move is a second field — tagging emotes *depressive* or
*elevated*. ⚠ **Don't.** That is **the topping-mapping failure again**: a
legible label, immediately gameable, turning expression into a
declaration.

> **The signal is in the DISTRIBUTION, not the emote.**

**Rate** (you emote less) · **range** (your repertoire narrows) ·
**drift** (what you reach for changes). All three are **statistics over a
log that already exists**, and none requires labelling a single emote with
a mood.

**Robust in the right way**: you cannot game it by picking sad emotes,
because it is not about *which* — it is about **how much and how varied.**
Which is how people actually notice: *nobody says "he used the sad emote";
they say **"he's been quiet."***

⭐ And `valence` earns a **legitimate second use**: **drift in the mean
valence of your reactions.** Someone who used to cheer and now scowls is
real signal, from a field that already exists, **without reinterpreting
what that field means.**

#### ⭐⭐⭐ Half of this is already scoped under another name

`trait.md`'s deferred list includes **"full-surface disposition-valence
authoring (only a starter set rides authored `ActSignature`s today)."**

**Emoting is an act**; acts carry `ActSignature`s that feed
`disposition_events`. So **emotes-as-disposition-evidence is already
deferred work** — it simply was not described as a mental-health
mechanism. **Mechanism 2 is largely a CONSUMER of an existing item, not a
new ask.**

#### ⚠ The requirements question this leaves

**Where does a durable per-actor emote history live?**
`ReactionRegistry` is **explicitly ephemeral**; only renown taps it into
`renown_events`, which are oriented around the **target**. So the actor's
expressive history may exist there as a side effect, or may need
`disposition_events` to take an emote signature.

**Flagged, not guessed** — it decides whether mechanism 2 is **a read over
existing data** or **needs a new write path.**

---

## Mechanism 3 — ⭐⭐⭐⭐⭐ reactive vs oscillatory

The distinction that separates tier 2 from tier 3, and the reason tier 3
needs new machinery rather than a reskin:

> **Stress is REACTIVE. The chronic conditions are OSCILLATORY.**

| | Stress (tier 1–2) | Chronic (tier 3) |
|---|---|---|
| **shape** | a Reserve that **depletes** | a **phase** that turns |
| **cause** | what happened to you | ⭐ **nothing in particular** |
| **discharge** | the break condition | the episode |
| **role of events** | it *is* the events | **triggers MODULATE; they do not CREATE** |

A stress meter answers *"what happened to you."* **A chronic condition is
the thing that does not need an answer** — people look for a proportionate
cause and often there is not one, and **structural non-reactivity teaches
that better than any text**, because the player will look for the trigger
too and will not find one.

⭐ It also kills the worst failure mode — **randomness as the mechanism.**
Not random: **periodic with perturbation.** Computable, and not a
caricature.

### ⭐⭐⭐⭐ Oscillation is derive-on-read

**Phase as a function of game-time**, from a stored offset and period,
perturbed by the ledger. **No tick**; the alarm layer books the next
transition ([physiology-slate](./physiology-slate.md) § Part 5).

So the state exists **whether anyone is looking or not** — which is the
point:

> ⭐⭐⭐⭐ **The honest property is not the period. It is the INDIFFERENCE.**
> *An episode that politely waits for you to log in is a lie.*

Which makes it **the second thing to opt out of the linkdead freeze**,
alongside the dying clock — the same reason mortality carved that
exception: **some things are not about whether you are watching.**

⭐⭐⭐ **And most of the time, nothing is happening.** Long stretches of
ordinary, punctuated by episodes. Accurate, a large part of **why these
conditions are misunderstood**, and it stops the condition being a costume
you wear.

---

## ⭐⭐⭐⭐ Discovery: state is a RELATIONSHIP, not a readout

**(User: *"discoverability needs to be something you actively engage with.
if the game is mood spam from everyone then no one is important. plus
measuring it requires active engagement anyway."*)**

Nothing is broadcast, so:

> **You can only see a change from a BASELINE YOU ALREADY KNOW.**

A stranger cannot tell. Someone who has known you for months can tell in
one exchange. **Regard and belief are per-viewer**, so what you know about
someone's state is *your* accumulated read, never a property they emit.

Which **kills the spam problem entirely** and makes the companion and
long-relationship work load-bearing: **those relationships are the only
instrument that can read this.**

> ⭐⭐⭐⭐ **Isolation is not punished. It just means nobody can tell.**

No malus, no debuff. **The detection instrument is other people** — so
being alone means the instrument is not there. Bleaker than a penalty and
considerably more accurate.

---

## The channel

> ⭐⭐⭐⭐ **A body condition is something the game TELLS you about. A mind
> condition is something the game DOES NOT.**

A status line models **the outside view** — the exact thing that makes
these conditions misunderstood. **The world's responses change, and your
own readouts do not.**

### ⭐⭐⭐ The chronicle is the outside view

> **The record is how you find out.**

What you actually did, what you actually spent, who actually said what —
how insight is recovered in life, and **the ledger already exists.** It is
also what makes this survivable rather than cruel: **the record does not
lie, and it is always readable.**

### ⭐⭐⭐⭐ The guard: never remove agency — change the TERRAIN

> **Change what is EASY, never what is POSSIBLE.**

Every option you had, you still have; **the gradient tilts.** More
accurate — *people in an episode make choices; they are not puppets* — and
more respectful.

---

## The build: stress's five consumers

> **The meter is specified. NOTHING READS IT.** That is what "stress is
> not exhausted" actually means — not that the meter needs depth, but that
> it has **no consumers**, exactly like the anatomy's four dead seams.

| Surface | What stress does there | Status |
|---|---|---|
| **activity** | harder to start, harder to sustain — **the abort axis** | shipped substrate |
| **emotes** | expression shifts; **others can see it** | shipped substrate |
| **the break** | the Darkest Dungeon discharge — **characterful, not numeric** | specified |
| **regard** | how you treat people, and how they read you | shipped |
| **substances** | ⭐ the **cope spiral**, already named | specified |

**Every surface already exists. The build is the reading, not the
writing.**

---

## Worked example — bipolar I

⚠ **Accuracy authority: the user, who has Bipolar I** and brought the
original brief. **Check lived-experience claims with them before this
becomes requirements** — the same rule as arcane-science's, on a subject
where the expert is in the room. **Opt-in, always.**

⚠ **Do not extrapolate to conditions nobody in the room has authority on.**
**The mechanisms above are general; the content here is not.**

### ⭐⭐⭐⭐⭐ Mania is the MASK verb — the fun IS the symptom

**(The user's own resolution of the fun/honesty tension:** *"mania can be
fun but that's actually kind of a bad thing because in my case it led to
full blown psychosis since I wasn't medicated."***)**

If it plays well — more energy, bolder choices, everything working — and
that is what walks you toward the crash, **the game has modelled the trap
rather than a description of it.** The player *wants* it.

> **The danger is not that mania is fun. It is that it is fun and you do
> not want it to stop.**

Structurally it is [physiology-slate](./physiology-slate.md)'s **mask**
verb: **function now, cost later, and you want it.**

> ⭐⭐⭐⭐ **So the game does not need to punish you for stopping the
> medication. It needs to make you not want to take it.**

**The most common real reason people stop mood stabilisers**, and far
better than a pill timer. ⚠ **With the guard: you must be able to SEE IT
COMING AND CHOOSE ANYWAY.** A surprise is a gotcha; a visible tradeoff
taken because it feels good is **the truth**.

### Depression, and the part that is not fun

**No pretence available.** Two honest mitigations:

- ⭐ **The social layer stays intact** — goal-directed activity is heavy;
  **talking to people is not.** You can be present without being able to
  work.
- ⭐⭐⭐⭐ **The intervention is OTHER PLAYERS** — not a mechanic, **people
  noticing.** What a multiplayer game can do that a single-player one
  structurally cannot.

> **Same test as blood donation: does the game make caring about someone
> worth doing?** If the soft-skills thesis works anywhere it works here —
> **and if it does not work here, that is worth knowing.**

### ⭐⭐⭐⭐⭐ Management, not cure — the pharmacology already fits

**Lithium** has a famously **narrow therapeutic index** — the effective
dose sits close to the toxic one, requiring regular blood monitoring.
**That is [physiology-slate](./physiology-slate.md) § Part 7b exactly**,
with nothing to invent:

- taken **continuously**, not as a cure;
- a window **narrow enough that testing matters**;
- **the physician's product is the MEASUREMENT** — an information vocation
  with a customer who needs it forever;
- **stopping because you feel fine** is mechanically expressible.

⚠ **Which deliberately reopens the physiology slate's chronic boundary**
(*time heals everything except what is gone*):

> **Mental health is where CHRONIC belongs.**

The body returning to baseline is right; **a mind condition managed
indefinitely is also right.** Different rules, for a real reason.

---

## The company we are in

**(User: borrowed from CK3 and Darkest Dungeon — "we're in good company
here.")**

| | The good idea | What we already have |
|---|---|---|
| **CK3** | stress from **acting against your own traits** | trait positions **derived from what you did** ⇒ computable |
| **Darkest Dungeon** | discharge is **characterful, not numeric** — paranoid, hopeless, masochistic | the condition layer + authored `Condition` Ideas |

**Neither has a cycle** — both are purely reactive, which is why tier 3
needs new machinery.

---

## Worked example — ADHD, and what it corrects (2026-08-02)

**(User: *"I know another really common one especially in our target demo
is ADHD. I don't have that personally but let's talk about that one and
see how it fits the abstraction."*)**

⚠ **Authority: NOBODY IN THE ROOM.** Neither the user nor the assistant has
ADHD ⇒ **be more conservative here than with the bipolar material, not
less.** Everything below wants checking with someone who has it before it
becomes requirements.

⚠ **And the caricature to refuse first**, because it changes every
mechanic:

> **ADHD is not a failure to attend. It is a failure to CHOOSE what to
> attend to.** *Hyperfocus and distractibility are the same mechanism, not
> opposites.*

### ⭐⭐⭐⭐ It breaks tier 3 — usefully. Shapes, not oscillation

Tier 3 was written as **oscillatory**. ADHD is **chronic but CONSTANT** —
no cycle, no episodes, no phase. **The tier was over-fitted to the one
condition it was derived from.** Oscillation is a **shape**, not the tier:

| Shape | Character | Example |
|---|---|---|
| **cyclic** | a phase turning over time | the bipolar worked example |
| **constant** | always on, **varying with CONTEXT** | ADHD |
| **triggered** | episodic-reactive | panic |

**One more condition and the taxonomy corrected itself.**

### ⭐⭐⭐⭐⭐ And it fits the start/stop axis BETTER than the example it came from

Executive function **is** initiation, sustaining and switching. But
differently:

> **Depression lowers the whole curve. ADHD makes it DEPEND ON THE TASK.**

Not shifted toward one end — **high variance at both ends at once,
contingent on the task.** Boring task, cannot start. Interesting task,
cannot stop. **Same person, same hour.**

And the modulator is documented rather than invented: attention follows
**novelty, interest, challenge and urgency** rather than importance ⇒

> ⭐ **The deadline works when the plan does not.**

**One modifier on the start/stop axis, keyed to properties activities
already have.**

### ⭐⭐⭐ Hyperfocus is a REAL upside — and unaimable

The first condition here with a genuine advantage, and that is **accurate
rather than compensatory**: sustaining an engagement well past where
anyone else would abort.

> ⚠ **The upside is real and you cannot aim it.**

Not a superpower, not a deficit — **you do not choose when it arrives.**
Threads between the two framings people with ADHD most object to.

### ⭐⭐⭐⭐ Time blindness proves the CHANNEL principle generalises

Poor sense of duration and future time — *now* and *not now* rather than a
graded timeline. **The mechanism is already ours:**

> **The game stops telling you how long you have been doing something.**

**Not a debuff — a channel modification.** Elapsed time and duration
estimates go vague or absent. Good evidence that *the mechanism is the
channel* was **not a bipolar-specific trick.**

### ⭐⭐⭐⭐ The strongest result: THE ENVIRONMENT DETERMINES THE DISABILITY

Tier 1 already houses the heaviest part. CK3's *stress from being untrue
to yourself* is **literally the cost of masking** — performing sustained
conventional function.

So an ADHD character in a role demanding routine sustained work
accumulates stress fast — **not because the work is hard, but because
doing it their way is not permitted.** Put them in varied, urgent or
self-paced work and **the cost disappears.**

> **The condition is constant. The disability depends on the room.**

**The social model of disability, expressed mechanically** — and
structurally true here because **we model environments and employment.**
Most games get this wrong by making the condition the disability; **ours
cannot, because the stress comes from the MISMATCH, not the trait.**

⭐ Arguably the strongest pedagogical result in this slate — **and it
arrived from a condition nobody in the room has**, which is decent
evidence the abstraction is doing real work.

### Rejection sensitivity closes the loop

Commonly reported alongside ADHD though not in the DSM: negative reception
lands disproportionately hard. Mechanically **the same reception signal,
weighted differently per person** — tying mechanism 3 straight to the
reputation surface.

> ⭐⭐⭐ **For an invisible condition, other people's reactions ARE the
> experience** (user). **The reputation work is not a detour from this
> slate; it is half of it.**

---

## ⭐⭐⭐⭐ Mechanism 4 — magic is the manifestation channel

**(User: *"reading about ADHD makes me think it's a natural fit for how
magic works. which is itself another sustained activity but specifically
tuned to mental constitution. that's one place we can make these
conditions actually manifest themselves in the physical world."*)**

### ⭐⭐⭐⭐⭐ The arcane science has a hole exactly where the mind goes

`arcane-science.md`: Mind and Sense effects are **energetically free**
(Landauer, ~3×10⁻²¹ J per bit), so they are **not reserve-limited at
all** — they are limited by **specification**, and:

> **"nobody knows what fixes the specification."**

The field's admitted centre of ignorance. And what fixes specification is
plausibly **the caster's own cognition.**

⭐ **But do not answer it** — that document is right that holding the
question open is the better pedagogy:

> **The mind does not ANSWER the specification problem. It is an
> observable INPUT to it.**

Thaumology can **measure** that casters specify differently and have **no
idea why** — **a correlation without a mechanism**, which is what a mature
science looks like with an open problem, and more useful than a solved
one.

### ⭐⭐⭐ Casting is the purest test of the start/stop axis

Spells carry `castSecondsDefault`, so a cast is **an engagement with a
duration and a fail state** — which makes it the cleanest instrument in
the game for executive function, because **the failure is immediate and
visible** (unlike hauling or crafting).

> ⭐⭐⭐⭐ **Cannot light a lamp on a Tuesday. Flawless when the building is
> burning.**

**The emergency caster** — inconsistent in a **patterned** way, better
under pressure. Accurate (urgency as the activating force) and it makes a
**good character rather than a deficient one.**

### ⭐⭐⭐⭐ It solves the invisibility problem without breaking no-broadcast

> **Your state does not show. Your WORK does.**

Magic never reveals a condition — **your state changes what your magic
does**, so an observer sees an unusual **outcome**, never a diagnosis.
Which is how you actually notice something is wrong with a craftsperson:
**not by looking at them, but at what they made.**

And it obeys the discovery rule exactly: **you can only see the change
from a baseline you know.** *You have watched them cast a hundred times.
Today it is off.*

**The manifestation channel this slate was missing, with no new
doctrine.**

### Two guards

⚠ **Composure vulnerability stays TIER 1.** The Reeve Line says a
**depleted** person is easier to pattern — that is depletion, **not
illness**. Anyone exhausted is easier to sway. Keeping it universal avoids
the genuinely bad note (*"the mentally ill are easier to mind-control"*)
**and is more accurate.**

⚠ **NOT WHICH SPELLS — WHEN.** A condition must never bias you toward
particular **nouns**; *"ADHD casters are good at Fire"* is **astrology.**
It affects **initiation and consistency** — the executive-function axis,
which is the thing that is actually true.

### ⭐⭐⭐ The content answer

**The inquiry substrate is the vehicle: the correlation is a discoverable
research result.** Players can find that mental constitution predicts
specification quality, publish it, and argue about it — **teaching
*correlation without mechanism* by making people live it.**

⚠ **With an edge worth naming rather than avoiding**: in-world researchers
studying and categorising minds is **dark, and it should be.** The
evidence firewall and the consent thread already exist to make that **a
live tension rather than an oversight.**

---

## Worked example — autism, and the decision NOT to model it (2026-08-02)

**(User, who is not autistic but whose father is: *"I want to be extra
careful with this one and for a reason you might not expect… there's a
certain compatibility between autism and a platform that is almost
entirely deterministic and transparent. I don't want to exploit that…
I dunno if I'd actually want to put it in the game."*)**

### The worry, named precisely

Not commercial. **Taxonomic:**

> **If we model procedural excellence as a trait of a NAMED KIND OF
> PERSON, the game asserts that the category is real and that it comes
> with abilities.**

The astrology problem from § ADHD, **with a real-world category
attached** — so the game would be making a claim about actual people.

### ⭐⭐⭐⭐ Structurally it is not tier 3 at all

Bipolar has a **cycle**; ADHD has **task-dependence**. Both are
*dysregulation* — something happening to a baseline. This is not.

> **Autism is not a condition ON the equilibrium. It is a DIFFERENT
> equilibrium.**

Which means **no new machinery**: tier 1 already covers it. *Stress fills
when you act against yourself* — **if "yourself" is configured
differently, the same act costs differently.** That is the entire model.

It is also where § ADHD's *environment determines the disability* stops
being an insight and becomes **the whole thing**: remove the mismatch and
very little "disorder" remains — **which is the position most autistic
people actually hold.**

### ⭐⭐⭐⭐⭐ So: BUILD THE DIALS, NOT THE DIAGNOSIS

Everything it would need decomposes into settings **anyone** could have:

| Dial | What it does |
|---|---|
| **transition cost** | switching context is expensive; **routine is cheap** |
| **sensory load** | crowds, noise, light **drain the equanimity Reserve** |
| **procedural vs improvisational** | following a specification exactly is easy; **abstracting a novel solution is hard** |
| **depth of interest** | sustained engagement far past where others disengage |

**Every one is DIMENSIONAL, not categorical — which is also the actual
science.**

> **BUILD THE DIALS, NOT THE DIAGNOSIS. Let people recognise themselves
> without being named.**

A character who finds the crowded market exhausting, the routine job a
relief, and transitions costly is **a character.** Players who see
themselves in it will. **Nobody is labelled, the game asserts no category,
and the empathy payoff survives completely** — *you play someone like that
and you understand something.* **No diagnosis is required to get there.**

⭐ **These dials earn their place independently**: transition cost and
sensory load are good character differentiation for a game that already
models environments, crowds and routine work. **Build them for their own
sake.**

### ⭐⭐ The general line this revealed

**A rule for everything after:**

> **If it has a SHAPE OVER TIME, model it as a condition. If it is a
> CONFIGURATION, make it a dial.**

Bipolar needs the cycle; ADHD needs the task-dependence — **shapes dials
cannot carry.** Autism is a **stable configuration**, so dials carry it
perfectly and **a condition would be the wrong tool as well as the wrong
politics.**

### ⭐⭐⭐ The text medium cuts both ways — and mostly the good one

**(User: *"in some ways we're levelling the playing field there but in
other ways it's a new challenge."*)** Both true, and the sharper form:

> **Text does not remove social difficulty. It converts IMPLICIT rules
> into EXPLICIT ones.**

Gone: facial expression, tone, body language, eye contact. Added: emote
conventions, channel etiquette, prose register, response timing. **Not
neutral — a convention you can be TAUGHT beats a cue you are supposed to
just GET.** A genuine accessibility property, and **an accident of the
medium rather than anything we designed.**

### ⭐⭐⭐ The accommodation is already in the platform — leave it unnamed

The game is deterministic, transparent, real-unit and
derive-from-principles because **that is good design for everyone** (the
Andy Weir property). That it is *especially* good for some players is **a
consequence, not a feature.**

> **A good accommodation is INVISIBLE. Naming it creates the category it
> was meant to dissolve.**

Say *"this game is good for autistic players"* and we have made a class,
made a claim, and turned a property of the design into a marketing
surface. **Leaving it unnamed keeps it a property.**

### ⚠ THE DECISION

> **Do NOT model autism in the game.**

**Not because it is offensive — because modelling it is strictly worse on
every axis we care about:**

- **less accurate** — the traits are dimensional, not categorical;
- **less respectful** — it asserts a category the game then reinforces;
- **less useful** — the dials serve everyone, the label serves nobody;
- **and it forfeits nothing** — the understanding a player would reach is
  **fully available through the dials.**

> **DO build the dials.** They are a **tier-1 feature** and they stand on
> their own merits.

⭐ **Recorded deliberately**, because *"we considered it and here is why we
did not"* is far more durable than silence — **otherwise someone proposes
it again in a year with none of this context.**

---

## ⚠ What to refuse

| | Why |
|---|---|
| **a stat or a debuff** | reduces a person to a modifier |
| **a visible status readout** | models the **outside** view — the thing that makes it misunderstood |
| **a cure** (for tier 3) | false, and it trivialises the management |
| **a permanent penalty** | cruel, and not what these conditions are |
| **randomness as the mechanism** | patterns and precipitants, not dice — **the one games get wrong every time** |
| **broadcasting state** | mood spam ⇒ **nobody is important** |
| **mechanical emotes** | emotes are **evidence, never effects** |
| **inflicting a named condition unasked** | ⇒ **opt-in, always** |
| **the mentally ill NPC as spectacle** | the worse of the two vehicle failures |
| **biasing a condition toward particular spell NOUNS** | astrology — it is **when and how consistently**, never **what** |
| **composure vulnerability as a CONDITION marker** | it is **depletion** (tier 1, universal), not illness |
| **modelling autism as a condition** | ⚠ **decided against** — see § *the decision*; **dials, not diagnosis** |
| **naming the platform's accommodation** | **a good accommodation is invisible**; naming it creates the category |

**Vehicles, for tier 3: BOTH, NPC FIRST** — the NPC version proves the
behavioural model without altering anyone's play.

---

## Open questions (for requirements)

1. **What empties the meter, concretely?** Tier 1 is the whole build, and
   it lives or dies on this: *living in accordance with your traits* needs
   a real list of acts, not a gesture.
2. **How strongly does the abort axis bite?** Too weak and it is
   invisible; too strong and it is a play-blocker. **Wants tuning against
   a real session.**
3. **Where does durable per-actor emote history live?** (`ReactionRegistry`
   is ephemeral; `renown_events` is target-oriented.) **Decides whether
   mechanism 2 is a read or a new write path.** And over what window does
   the rate/range/drift read run — **the window length IS the
   sensitivity.**
4. **Does the break condition sit on the tier-2 boundary** — i.e. is a
   break how a situational condition is *entered*? *Leans yes.*
5. **The cycle's period and episode length at 12×** (tier 3). Clinical
   episodes run 1–2 weeks minimum; at 12× that is about a real day — never
   stuck, possibly reading as rapid-cycling. **The user's number.**
6. **Is the phase ever visible to the player?** Perhaps
   **retrospectively, in the chronicle** — *you can see the shape of it
   after, never during.* Possibly the most honest available compromise.
