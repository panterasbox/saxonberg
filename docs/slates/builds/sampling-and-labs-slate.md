# Sampling & labs slate — the field/bench split, and why the round-trip is the lesson

**Captured 2026-09-01.** The companion to
[instrumentation-slate](./instrumentation-slate.md): that one says *you
are as good as your toolkit*; this one says **where the toolkit lives,
what it costs, and what you carry to it.**

> **Status: design conversation, captured. Not requirements.**

**Provenance:**

> **User: "these tools should be very expensive and player should not
> have access to them immediately. I would say the first place you
> encounter them is on the university campus in the labs … if we
> restrict them to the labs, then the students need a way to bring in
> samples of what they want to measure / analyze from the field …
> that's an area where maybe you have to round trip between the mines
> and the campus early on to do the surveying you need to make a profit
> on mining."**

**Parent:** [instrumentation-slate](./instrumentation-slate.md) (the
three gates, the aether line, siting-by-anatomy — **read first**).
**First consumer:** [mining-slate](./mining-slate.md) (`assay`, the
prospecting-as-deduction layer — **amended, not overturned**, see Part 4).
**Neighbours:** [discovery-slate](./discovery-slate.md),
[eternal-university-slate](./eternal-university-slate.md) (the campus the
labs sit on), [college-slate](./college-slate.md),
[vocations.md](../../vocations.md) (the assayer this mints),
[crafting.md](../../subsystems/crafting.md) (Grade → precision),
[senses.md](../../subsystems/senses.md).

---

## Part 0 — The verdict: the four questions, and they are unanimous

The fork was: **does `assay` split into a field read and a lab assay, or
does the mining slate's free in-situ version stand alone?** Run against
the standing four-question order, the split wins **all four** — which is
rare enough to record the reasoning rather than just the answer.

### 1. Pedagogy — richest real science ⭐⭐⭐

- **Qualitative field ID vs. quantitative lab analysis** is a real
  epistemological divide that geology, chemistry, biology and
  environmental-science students all actually learn.
- **Sampling is itself a skill** — where, how many, representative vs.
  biased. Experimental design, smuggled into mining, and badly
  under-taught elsewhere.
- **A measurement without provenance is worthless.** *"17.3% magnetite"*
  means nothing without *"from face 3, gallery 2."* A deep lesson
  delivered by one data field.
- ⭐ **The loop is literally hypothesis → test → revise.** The field read
  forms a hypothesis, the assay tests it, the result updates your model
  of the deposit. Not a metaphor for the scientific method — the thing.
- ⭐ And the round-trip teaches what almost no game does: **knowledge
  costs time and money, and deciding what is worth measuring IS the
  expertise.**

Unsplit teaches that a skilled person simply *knows* —
expert-intuition-bypasses-measurement, which is anti-pedagogical in a
game whose thesis is instruments.

### 2. Author expressiveness ⭐⭐

**One authored truth, many readouts.** The author writes a deposit's real
composition (already shipped substrate); the field read is a coarse
function of it, the bench assay a precise read of the same. Unsplit, an
author must separately author *what assay says* — a second source of
truth free to drift from the composition.

It also hands authors a **per-locality dial with zero pack code**: a
frontier camp has no lab (long round-trip, rich assayers); a university
town has one on campus. Same mechanism, different economy — the
trade-is-mechanism / locality-is-expression rule. New bench instruments
become pure content: ship one that reads a new channel and every
material already has the property.

### 3. Immersion & roleplay ⭐⭐

Unsplit, you stand at a rock face and a number appears — a UI, not a
world. Split gives an **assayer you know by name** with a queue and a
reputation; a **satchel of labelled samples** that makes a prospector
*read* as a prospector (the legibility the parent slate already values);
and **salting** — a real, historical, commitable fraud, with the
certified assayer existing precisely to catch it.

⭐ The parent slate wanted a social layer. It arrives free from one
provenance field.

### 4. Gamification / self-improvement ⭐⭐⭐

The decisive one, and the least expected:

> **The split gives the PLAYER a skill to get better at; unsplit gives
> only the CHARACTER a stat.**

Sample selection is genuine judgment with a **measurable hit rate** — did
the samples you chose assay rich? Trackable, improvable, real. And
perfectly shaped for the mirror property: the engine can show a
prospector their **calibration** (predicted vs. actual), a real-unit
model of a real competence. Unsplit, competence is a number that unlocks
a better number.

---

## Part 1 — ⭐⭐ The structural finding: samplability splits the roster

The lab-restriction has a hard constraint inside it. Sort the **ten
shipped instrument classes** by what they measure:

| instrument | measures | samplable? |
|---|---|---|
| Thermometer, Barometer, Photometer, Hygrometer, Altimeter, Sextant, GravityMeter, Sundial | **the environment where you stand** | ❌ you cannot carry "the light level at the mine face" to campus |
| Balance, GasAnalyzer | **a thing / a captured medium** | ✅ |

> ⚠⚠ **Eight of ten cannot be lab-bound**, because an environment-reader
> locked in a lab can only ever measure the lab.

So the field/rental programme is **not** a later nice-to-have — it is
structurally mandatory for a whole instrument class. Which resolves into
the cleaner design:

- **Field instruments** — portable, cheap-ish, early. They read the world
  where you are. (The eight.)
- **Bench instruments** — expensive, lab-bound, **sample-eating**. This is
  what "very expensive, first met in the campus labs" correctly describes,
  scoped to this class. (Balance, GasAnalyzer, + the assay furnace,
  spectrometer, etc. that don't exist yet.)

Gases and liquids are the interesting middle: **a sealed flask of mine air
IS portable**, so capture-then-bench works for media even though it never
works for fields (light, gravity, altitude, sky).

---

## Part 2 — Three tiers, not two

The four-question pass argues for a middle rung the conversation started
without:

| tier | cost | tells you |
|---|---|---|
| **naked eye** | free, competence-only | "rock" → "ore-bearing rock" |
| **hand tool** — lens, streak plate, hardness kit | cheap, early, portable | likely mineral, rough quality |
| **bench assay** | expensive, lab-bound, consumes a sample | the actual number |

⭐ The middle rung is **pedagogically better than free-then-expensive**,
because even qualitative field ID uses tools in real geology — and it
gives players an early, affordable, characterful purchase that makes them
*feel* like a prospector long before they can afford a lab.

---

## Part 3 — The sample object (cheaper than it looks)

**Ore grade is already a shipped composition fraction**, so a rock sample
is just *a small quantity of the material* and the bench assay reads its
real composition. **No snapshot machinery** — it rides substrate that
exists.

> ⭐ **The one genuinely new field is provenance: which seam it came
> from.** Without that link an assay is useless.

And that single field is load-bearing far beyond bookkeeping:

- **Salting** becomes possible — swap a rich sample's provenance for your
  worthless claim. The classic mining fraud, now commitable.
- **The certified assayer** exists to prevent it — which is gate 3 of the
  parent slate (certification) arriving with a *reason* rather than as an
  abstraction.
- **A vocation is minted.** Lab-bound expensive instruments + samples that
  must travel = **unmet demand for assay services**, which is the stated
  test for whether a vocation is real ([vocations.md](../../vocations.md)).

### Sample integrity — the free pedagogical bonus

A rock sample does not degrade. **A biological or chemical one does** —
which makes sampling *technique* matter (sealed vs. open, time in transit,
temperature) and rides the shipped spoilage/preservation and thermal
substrates. Chain-of-custody as a real mechanic, not a lecture.

---

## Part 4 — ⭐ The mining slate is amended, NOT overturned

An earlier framing called this a collision with
[mining-slate](./mining-slate.md)'s free in-situ `assay`. **That was
wrong, and the reconciliation is cheap:**

> **The mining slate's `assay` becomes the FIELD tier.** Its
> prospecting-as-deduction, its map pre-reveal of sensed-but-unvisited
> nodes, its competence-confers-verbs — **all survive intact** as the
> qualitative layer. The bench tier is *added above* it, not substituted
> for it.

⭐⭐ **And this is what makes the round-trip a decision rather than a
chore: the field read's job is choosing what to sample.** You cannot haul
fifty rocks to campus; you carry the three you judged worth assaying.
Competence = better judgment about what is worth the trip = fewer wasted
round-trips. **The skill expresses itself in the sampling, not the
walking.**

⚠ **Naming needs deciding** (Open question 1): if `assay` stays the field
verb, the bench act needs its own; if `assay` becomes the bench act, the
mining slate's verb needs renaming and its text updating.

---

## Part 5 — The economy: a capital ladder, and the lab as a place

The progression is a genuine investment arc rather than an XP track:

1. **Field read** — free. Slow, coarse, and you eat the round-trip.
2. **Hand tool** — cheap. The first purchase that changes how you work.
3. **Bench, someone else's** — pay the campus assayer, or queue as a student.
4. **Rented field kit** — pay to skip the round-trip. The checkout programme.
5. **Owned field kit** — expensive. You are a professional; the trip is gone.

⭐ Each rung buys *time*, which is the resource the round-trip spends. That
is a legible reason to accumulate capital that is not a bigger number.

**The lab is a place with authority**, and that gives the university a real
economic function beyond teaching — campus access, lab hours, student
privileges vs. paying outsiders, an assayer with a queue. The practicum
thesis with a balance sheet.

---

## Part 6 — ⚠ The tedium risk, and the four levers

A pure walk-there-walk-back loop is a chore, and the user flagged the
feeling ("I dunno") before the analysis did. Four mitigations, **all
riding systems already owned, and all of which ADD world rather than
subtract it**:

1. **Batch** — carry N samples, assay together; amortizes the trip.
2. **Assay takes game-time** — drop off, go do something else, collect.
   Semi-attended, the same register as the mining seam itself.
3. **Courier the samples** — demand for [freight](./freight-slate.md); you
   never walk it.
4. **Pay an assayer** — the vocation above; you never own the instrument.

Each turns "walk back" into a choice with a price, which is the difference
between a loop and a commute.

---

## Part 7 — What this answers in the parent slate

Resolves, or sharpens, several of
[instrumentation-slate](./instrumentation-slate.md)'s open questions:

- **Q1 (channel/instrument mapping)** — Part 1 gives the organizing axis:
  **environment-readers are portable; sample-eaters are bench.** The
  mapping should be built along that split, not as one flat table.
- **Q5 (certification authority)** — Part 3: certification exists because
  **salting** exists. The reason precedes the institution.
- **Q6 (instrument crafting / does Grade buy precision)** — the three-tier
  ladder wants Grade to buy **precision** at the bench and **portability**
  in the field; two different goods from one axis.
- **Its "where to start" step 2 (author the instrument set)** — Part 2's
  hand-tool rung is the cheapest, highest-value first content.

---

## Open questions

1. ⚠ **Verb naming.** Does `assay` stay the field verb (bench gets a new
   one) or move to the bench (mining slate's verb renamed)? Touches
   shipped mining design text either way.
2. **Is the field read free, or does it want the hand tool?** Part 2 says
   free-at-coarse, better-with-tool. Confirm the naked-eye rung actually
   says something useful, or collapse to two tiers.
3. **What is a sample, as an object?** A `Globbable` quantity of the
   material with a provenance stamp? A distinct `Sample` class wrapping
   one? The glob substrate looks close — verify before minting a class.
4. **Where does the provenance stamp live**, and can it be forged
   *mechanically* (the salting vector) or only socially (you lie about
   it)? The honest answer is probably: the stamp is truthful, but nothing
   forces you to submit the sample you claim.
5. **Do labs exist off-campus?** A mining company's own assay office is
   plausible and would change the economy sharply — it is the "who owns
   the means of measurement" question, and it is political.
6. **Sample integrity dials** — which materials degrade, over what clock,
   and does a botched sample read *wrong* or read *nothing*? (Reading
   wrong is richer and crueller; decide deliberately.)
7. **Does the calibration mirror ship?** Part 0's gamification argument
   leans on predicted-vs-actual being *shown*. That is a real feature with
   a real cost, and the argument is weaker without it.

---

## What this slate does NOT cover

- **The general capability/competence/condition gating model** — the
  parent slate owns it; this one assumes it.
- **The `analyze` retrofit** — still the parent slate's "where to start";
  this slate constrains its shape (Part 7) without doing it.
- **The mining game itself** — [mining-slate](./mining-slate.md) owns
  prospecting, depth, push-your-luck; only its `assay` tier is touched.
- **The university as an institution** — campus governance, enrolment,
  lab access policy live in
  [eternal-university-slate](./eternal-university-slate.md) /
  [college-slate](./college-slate.md). This slate only says the lab is a
  place with hours and an owner.
- **Augment-mounted instruments** — the parent slate's siting-by-anatomy
  section. A forearm assay probe is a *later* rung on Part 5's ladder and
  is not designed here.
