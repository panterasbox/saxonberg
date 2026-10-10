# Inquiry slate (working doc) — discovering, verifying, and trusting knowledge

> **Status: PARTIAL** — the instrument seam (`analyze` / `measure`) and
> the Competence ladder shipped →
> [advancement.md](../../subsystems/advancement.md)
> **Left:** the `Law` catalog Idea · the `predict` lab-notebook loop ·
> knowledge banking of confirmed laws · the publish + replicate library ·
> the evidential range and the overreach paper · ⭐⭐⭐ **the law →
> TECHNOLOGY rung — the epoch on-ramp** (a recipe declares the `Law`s it
> depends on and REFUSES by name; added 2026-09-25, § below) · deferred:
> credibility as a renown consumer, the published refutation,
> misinformation-as-crime
> ⭐⭐⭐ **The epoch on-ramp is OFF the critical path (2026-10-08)** — a
> recipe that ships-and-refuses needs a **gate token**, not a law
> catalogue, and the token rides the shipped `RecipeKnowledge` ladder plus
> the realm's `epoch`. ⚠ Also: **the row is not a law — the law is the
> TypeScript**, and the name collides with governance's. § end.
> **Size:** a build

See also:

- [capability-magic-slate.md](./capability-magic-slate.md) —
  **origin + first consumer.** Part IV § 4 designs magic's use of this
  loop; the apparatus was lifted here so it stops being magic-specific.
- [deduction-slate.md](./deduction-slate.md) — **sibling, and the shared
  spine.** Its hard line — *truth is **shown**, not argued or voted;
  forums are civic aftermath, never the adjudicator* — is this slate's law
  too. Deduction investigates a **specific past event** (a murder) by
  demonstrated evidence; inquiry discovers a **general law** by experiment.
  Same epistemics, different object.
- [identification-slate.md](./identification-slate.md) — the
  **instrument seam** (`analyze X with Y`, real-Material readouts) inquiry
  measures with.
- [../../subsystems/advancement.md](../../subsystems/advancement.md) — the
  **Competence** measurement + the `RecipeKnowledge` "known-of → can-do"
  knowledge ladder that banked knowledge rides.
- [../../subsystems/forums.md](../../subsystems/forums.md) — the boundary:
  forums host *discourse and the civic aftermath*, never adjudicate *what
  is true* (that's the sim's job).
- [reputation-slate.md](./reputation-slate.md) /
  [../../subsystems/renown.md](../../subsystems/renown.md) — **credibility**
  as a renown consumer.
- [farming-slate.md](farming-slate.md), the University content, and the
  gamification-mirror thesis — the pedagogy this is the engine for.

---

## The load-bearing distinction: where does the answer key live?

Two kinds of knowledge, split by where truth is checked — and this
substrate owns exactly one of them:

- **Sim-native knowledge** — the answer key is **the running simulation.**
  Falloff, resonance, dosage, a material's response: the engine *computes*
  these lawfully, and you recover them by experiment. Assessment = you
  **do** or **predict** it and the engine grades. Members: magic, combat,
  crafting, medicine, farming — every honest-sim discipline. **This slate.**
- **Imported real-world knowledge** — the answer key is **external authored
  content** (real history, chemistry theory, math, language); you cannot
  experiment your way to it. Assessment = an **exam** against authored
  right-answers. The didactic / study.com sibling — *not* this slate, but
  it shares the frame below.

## The discovery loop

You **don't author laws.** A law is an *emergent consequence of an honest
function* the engine already computes — inverse-square is discoverable
because the falloff function genuinely is inverse-square. Discovery = a
player recovering a relationship the engine truly computes but never
states.

Worked (a fire bolt that fizzles across a courtyard): **observe** (weaker
far away) → **measure** (an instrument reads 100 at 5 m, 25 at 10 m, 11 at
15 m) → **hypothesize** (×2 distance → ÷4 → inverse-square) → **predict**
(the game asks: what at 20 m? → 100/16 ≈ 6) → **verify** (test at 20 m,
reads ~6 → confirmed).

Two keystones keep it a *game*, not a lecture:

1. **The engine exposes measurements, never the model.** Instruments and
   `analyze` give *this instance's* numbers — data points — never the
   general relationship. The moment a tool prints `k/d²`, discovery is
   dead. So it never does.
2. **Discovery is gated by *prediction*, not by stating the law.** The game
   never parses a hypothesis — no equation-grading, no NLP. It asks you to
   **predict an untested case** and checks your number against the real
   evaluator within a tolerance. Correctly predicting a *novel* case is
   proof of the model, ungameable by memorization, and trivial to build
   (compare two numbers). This is the deduction-slate spine in the
   general-law register: **truth is demonstrated, not argued.**

## The pieces

| Piece | What it is | Reuses |
|---|---|---|
| **`Law` catalog** | pure-data leaf `Idea`s (the Discipline/Recipe precedent) — each marks *"this relationship is discoverable,"* names the independent + dependent quantities, points at the **real evaluator**, carries a **tolerance** and an **evidential range**, and a **null `realWorldAnalog`** seam. **Never the equation** (that stays emergent). | data-Idea catalogs |
| **Instruments** | read true quantities at a point (data, never laws). | identification-slate `analyze` seam |
| **The `predict` loop** | a lab-notebook that, once enough measurements are logged, offers "test your model"; you submit a value for a novel condition; checked vs the evaluator. | `PromptApi.text` |
| **Knowledge banking** | a confirmed law → a knowledge entry, banding into Competence; higher bands can gate on *understanding*. | advancement Competence + `RecipeKnowledge` ladder |
| **The library** | published laws are **teachable goods** — first discoverer publishes, others learn cheaply via one confirming replication. | the guild learn-rate buff + University teaching econ + the wiki/publishing surface |

## Misinformation — the wrong paper

The mechanic is **self-defending**, and that reframes it. Because the sim
is the answer key, the `predict` gate is automatically a lie-detector: a
false paper's confirming prediction *fails*, because reality won't
cooperate with the lie. **You cannot publish a falsehood that survives
verification.** So misinformation is not an epistemic exploit — it is a
**social/temporal** one: the lie can't beat the sim, only *people who
haven't checked yet*, and only until they do. Exactly how real scientific
misinformation works — always caught by replication, but replication is
costly and slow, and the lag does the damage.

**The teeth = verification cost.** A false paper is toothless when checking
is one cheap cast; it bites where checking is **costly** (rare
materials/instruments), **dangerous** (the paper claims *"this ritual is
safe"* — verifying means trying it), **noisy** (a probabilistic law where
one trial can't separate a subtle error from variance — the replication
problem), or **frontier** (no established truth to check against; the paper
is the only source).

**The centerpiece — the subtly-wrong paper.** The blatant lie is caught
instantly and is boring. The insidious one is **correct within its
evidence, wrong beyond it** — predicts perfectly at 5–15 m (all the author
measured, or all a *malicious* author wanted you to test), then diverges
catastrophically at 50 m when you finally rely on it. This is why `Law`
carries an **evidential range**: *"supported over [5,15] m"* is a different
claim from *"universal."* And the on-theme crux: **honest overreach and
deliberate curve-fitting are indistinguishable by inspecting the paper** —
the only way to tell a mistaken scientist from a saboteur is to test
out-of-range. Intent lives in **provenance and track record**, never in the
claim itself (the belief/recognition thesis, applied to knowledge).

**The social layer (truth stays demonstrated, per the deduction hard
line).** A paper's *truth* is never voted — it is settled by re-runnable
replication against the sim. What the social layer adds is **discourse and
consequence**, not adjudication:

- **Credibility** — a renown consumer: authors whose papers replicate
  accrue standing; whose papers are refuted lose it (papers carry their
  author via the pervasive provenance tag).
- **A refutation** is a *published failed replication anyone can re-run*,
  not an argument won. Forums may host the discussion; they never decide
  the fact.
- A **learned-but-wrong law** is a *false belief* you hold (the belief
  substrate) until a refutation — or a painful out-of-range failure —
  corrects it.
- **Deliberate lethal misinformation** (a false "safe ritual" someone dies
  relying on) is an **epistemic attack** — the blame-ledger/attribution
  precedent names the author; reads straight onto evil-as-manipulation /
  the hollowing (poisoning the shared knowledge commons). *Deferred with
  alignment.*

## The unification (loose now, tight-seam reserved)

Sim-native (this slate) and imported/didactic (study.com) share **one
frame** — so there is no walled-off "College of Magic" and no duplicated
substrate:

| Shared frame | Didactic (study.com) | Experiential (this slate) |
|---|---|---|
| **University** (enrollment, credentials, teaching econ) | courses | labs / practica |
| **Competence / Transcript** (banks as bands) | exam results | deeds + confirmed predictions |
| **Assessment** (graded evidence) | an **exam** (authored key) | a **prediction / practice** (engine key) |
| **Published knowledge** (teachable good) | an authored lesson | a discovered law written up |

Because a sim discipline is an *honest model of real science*, the two
modes can credential **overlapping real competencies** — you could learn
field-falloff from a physics lesson+exam or discover it through fire magic.

**Decision — loose now, tight-seam reserved.** v1: sim disciplines
**self-credential** (their own competencies); the transferable *real*
thing is the **scientific method itself** (hypothesize/measure/predict/
verify), so inquiry teaches something real with **zero authored
curriculum**. The explicit **discovered-law ↔ real-course-credit mapping**
is a deferred seam — the null `realWorldAnalog` field on `Law`, cashed only
when study.com integration lands.

## Consumers

- **Magic** — the showcase (any grid cell has discoverable laws: falloff,
  resonance, cost-vs-magnitude). See capability-magic-slate Part IV.
- **Medicine / crafting / farming / combat** — every honest-sim discipline
  already computes lawful relationships players currently learn by feel;
  inquiry is what turns "feel" into "understood, banked, teachable."

## ⭐⭐⭐ From law to TECHNOLOGY — the epoch on-ramp (added 2026-09-25)

Everything above recovers a **law**: a relationship the engine genuinely
computes and never states. That answers *how does this world work?*

It does **not** answer *how does a thing that did not exist come to
exist?* There is no hidden function in the engine that says *latex +
sulfur + heat = rubber* waiting to be found. Vulcanization is not a law
to recover; it is **a process that has to enter the world.** Those are
two different acts, and the second one is currently unowned.

### ⚠ Why it is unowned — we retired its mechanism

The standing doctrine is the user's, from the farming cycle: *build the
trades out at medieval tech first, then let them get more advanced as
players come on and actually exercise disciplines.* The recorded
mechanism was **conferrals + known-of→can-make recipes**.

⛔ **Conferral was retired** ([advancement-slate](./advancement-slate.md),
MR !285): *a competence band must NEVER confer verbs; the verb is GLOBAL
and the OUTCOME is GRADUATED.* The `RecipeKnowledge` half survives; the
conferral half is gone and nothing replaced it.

> **So the industrial epoch has no on-ramp**, which is why the content
> tree can only grow medieval: **8 rows stamp `epoch: medieval`, zero
> stamp anything else, and nothing reads the field.** Five eras declared
> ([`lib/craft/Epoch.ts`](../../../packages/server/src/mud/lib/craft/Epoch.ts)),
> one authored, none enforced — while the *setting* already runs a
> substation, a teleport authority and an aether.

### The rule

> **A recipe EXISTS and REFUSES, naming the LAW you do not yet
> understand.**

That is the conferral retirement's own replacement rule applied to
technology — *the refusal IS the progression UI; if something lifts it,
the thing must EXIST so the player can be told.* The row ships on day
one and cannot run:

> *"You could vulcanize this, if anyone understood what sulfur does to
> latex."*

The gate is **knowledge + materials**, both of which are world state a
player can change — never a measured threshold. It rides the shipped
`RecipeKnowledge` known-of→can-do ladder, with inquiry supplying the
rung: a recipe declares the `Law`s it depends on, and a law is held once
somebody **demonstrated it by prediction**.

### ⭐⭐ Why this is the right shape

- **No conferral.** Nothing appears or vanishes on a band. The refusal
  names something a player can go and do.
- **Nothing is authored ahead of demand.** The recipe exists; the world
  just cannot run it yet. Same posture as `help forge` for a
  non-smith.
- ⭐⭐⭐ **Per-instance tech trees.** Each running platform demonstrates
  its own laws in its own order, so two realms genuinely **diverge in
  technology**. That is the federation thesis made material rather than
  asserted.
- **Technology becomes a SOCIAL artifact.** Laws are teachable goods
  through the library; guilds hold mysteries; the University is the
  engine. ⭐ This is what makes the University load-bearing for the
  ECONOMY and not only for credentials — the platform's pedagogical
  claim, cashed.
- **Magic and future tech stay one axis** (design-lenses § 5). A spell
  you can cast and a process you can run are both *capability gated on
  understood law*. The slate already says the College of Magic is the
  lab wing of the science faculty; this is that sentence with teeth.
- ⭐ **`epoch` becomes meaningful without becoming a gate.** A world's
  epoch is a **DERIVED read over the law catalogue** — a description of
  its knowledge frontier. The stamp on a *tool* stays what it is (the
  land-use covenant restricts means, not ends). Nothing gates on the
  world's epoch; it is a label, like a Competence band.

### ⭐⭐⭐ The bootstrap, and why it is the honest part

*If nothing can be made until a law is understood, how is there a forge?*

**Because medieval technology is knowledge-by-TRADITION and industrial
technology is knowledge-by-LAW.** Smiths worked iron for three thousand
years with no metallurgy; brewers fermented for longer with no
microbiology. The shipped baseline is **pre-understood by construction**
— it works, and nobody has to know why.

> **The Industrial Revolution is what happened when making things started
> requiring theory.** That is the real break, and this mechanism encodes
> it rather than inventing one.

⭐ So the two knowledge kinds are not a hierarchy, they are different
epistemics, and the game can teach the difference by making you feel it:
you can be a superb smith who understands nothing, and you cannot be a
chemist that way.

### ⚠ The honest risks

1. **Nobody does the science and the world stays medieval forever.**
   Acceptable, and the same answer guilds got: *absence is meaningful*.
   A realm that never industrialized is honest content, and tech advance
   becomes a real collective achievement.
2. **Too slow for a small server.** Mitigations already exist: the
   library's publish shortcut (learn from a paper, one confirming
   replication), and ⭐ **a content pack may ship a world that already
   knows things** — packaging is a packaging choice, not a permissions
   structure. A realm can start industrial by installing its history.
3. ⚠ **It must not become a wizard gate.** Inquiry is open to anyone
   holding an instrument. The anti-elitist read is the correct one:
   **the smith who measures carefully is who advances the world.**
4. **Law-catalogue granularity** — the slate's own open question, now
   load-bearing: a technology's `requires` is only as good as the laws
   marked discoverable. Start tiny, grow by consumer need.

### The first consumer

⭐ **Rubber**, not magic — see [rubber-slate](./rubber-slate.md). It is
the better proof case because vulcanization is the canonical technology
that *cannot* be had without theory, its law is a genuinely honest
function of the engine's own material fields, and over-applying it
produces **a different real material** rather than a failure — which is
the physical analogue of this slate's own evidential-range / overreach
paper, the piece it calls its soul.

## Open questions / scope

- **`Law`-catalog granularity** — how many relationships are worth marking
  discoverable (vs. emergent-but-unrewarded)? Start tiny; grow by consumer
  need.
- **Does `analyze` upgrade** to *show the curve* once you've discovered a
  law (earned legibility), or stay data-only forever?
- **The publish shortcut's economics** — how much cheaper is
  learning-from-a-paper than cold discovery, and how does a *published
  refutation* propagate to holders of the now-false belief?
- **Evidential-range as the build's soul** — is the subtly-wrong/overreach
  paper worth the range-modeling, or is v1 "blatant lies bounce off
  verification, social layer later"? *(Lean: the overreach paper is the
  whole point — it's where this stops being anti-cheat and becomes a lesson
  in how science actually fails.)*
- **Scope discipline** — this is a *substrate*, not a content catalog; it
  ships the loop + the `Law` seam + the publishing surface, and lets each
  discipline bring its own discoverable relationships. Do **not** author a
  fictional curriculum.
- Deferred consumers: credibility (renown), misinformation-as-crime
  (alignment + blame-ledger), and the imported/didactic study.com track.

---

## ⭐⭐⭐ What the `Law` row was actually doing — and the name (2026-10-08)

Raised when the drilling track asked this slate for its on-ramp. Two
objections, both the user's, and the second one is the load-bearing one.

### 1 · ⚠ The name collides, and it is cheap to fix today

> *"when we use the word 'Law' here it's almost always in reference to
> governance, but you're talking about laws of nature?"*

Correct, and the collision is real: in this project *law* means the
legislated kind nearly everywhere else — the Compact, the amendment
library, law-as-content over forums. The nature reading has reached
exactly three docs (this one, [tradition-slate](../tails/tradition-slate.md),
[uncertainty.md](../../uncertainty.md) § *Law vs Tenet*) and **zero lines
of code**: no `Law` class, no `Law` document kind. So it is a three-doc
rename now versus a real one later.

⭐ **Proposed: `Principle`.** It reads as nature, collides with nothing,
and survives the naming rule (name a thing for what it IS). The existing
`Law`/`Tenet` split is unaffected — it is positive-vs-normative, not
nature-vs-statute, and *principles are true; a tradition decides which
ones you bother investigating* reads the same.

### 2 · ⭐⭐⭐ The row is not a law. The law is the TypeScript.

> *"aren't our laws of nature just javascript code like any other
> rule/law that gets to be enforced by the machine?"*

Yes — and that observation dissolves the concept this slate was building.
Inverse-square falloff is a function in the engine. It runs whether
anybody knows it or not; it cannot be amended, appealed or disobeyed.
**The row is not the law.** Five distinct things were wearing one noun:

| | what it is | state |
|---|---|---|
| 1 | **the rule** — an evaluator | TypeScript. Already there. Never data |
| 2 | **the codification record** — who required it, what enforces it | ⬅ governance (§ 3 below), not physics |
| 3 | **can this person do it** | ✅ ships — `RecipeKnowledge`'s known-of → can-do ladder |
| 4 | **is it codified in this realm at all** | the `epoch` stamp — half-built (stamped, unread) |
| 5 | **can a player RECOVER the rule by experiment** | ⭐ the only genuinely new machinery, and **this slate's actual subject** |

Everything above this section is about row 5, and row 5 is a **pedagogy
feature about discovery**. It is not what a recipe needs in order to exist
and refuse.

### 3 · ⭐⭐⭐ The codification doctrine — a law of nature is a law whose codification already happened

The user's reframe, recorded close to verbatim because it is the useful
part and it belongs to the governance docs as much as to this one:

> *"what the legislature gives us is not completed laws, because the
> completed law also includes its enforcement — and if that enforcement
> includes code… for us, codification doesn't stop at the legislature, it
> extends to the executive, who are the engineering arm of the government.
> we can't expect a legislature of hundreds/thousands to collectively write
> a javascript class. a bill gets recorded as a law in an extent's slice of
> the document tree, with the compact getting their own slice and it being
> authoritative; it includes product requirements and sometimes metadata,
> and from that the executive derives the engineering requirements."*

> ⭐⭐⭐ **"Law of nature" and "statute" are not two kinds of thing. They are
> two positions in one pipeline.** A law of nature is a law whose
> codification **already happened** — by the engineering arm, pre-adoption.
> A statute is one whose codification is **pending**.

Two consequences:

- ⛔ **The Compact cannot pass a law of nature.** It can pass a
  *requirement that somebody codify one*. A bill saying *"vulcanization is
  latex × sulfur × heat"* is inert until an engineering arm turns it into
  an evaluator — which is why the bill carries product requirements and the
  executive derives engineering ones. Not a quirk of this project: it is
  what codification **means** when the enforcer is a computer.
- ⭐ **A catalogue of real "legislation" grandfathered in at adoption** is
  therefore a coherent artifact — every physical law the platform already
  enforces, entered on the record as law whose codification predates the
  polity. *"We'll see about that"* — flagged, not decided.

⚠ **That build is a GOVERNANCE build about the executive and the document
tree** (→ [legal-code-slate](./legal-code-slate.md),
[executive-slate](./executive-slate.md)). It is **not** on the drilling
track and must not be dragged onto it.

### 4 · The consequence for the epoch on-ramp

The user's own argument closes it:

> *"all our other laws of nature found their way into being codified
> without any of this machinery."*

Combustion, Newton cooling, subtractive dye, Liebig limiting factors,
inverse-square falloff — **every one was codified by the engineering arm
with no catalogue**, because row 2 needs a *record*, and a record can be
prose. A catalogue only buys row 5.

> ⭐⭐ **So a recipe that ships-and-refuses needs a GATE TOKEN, not a law
> catalogue** — and the token rides rows 3 + 4, both of which largely
> exist: `RecipeKnowledge` for the person, `epoch` for the realm. What
> lifts it is that the realm's executive **codified** vulcanization, which
> in practice is a pack install — which is this slate's own escape hatch
> (*"a content pack may ship a world that already knows things"*) arriving
> from the other direction. Per-instance tech trees still fall out; realms
> still diverge, because their executives shipped different things.

⚠ **This does not retire this slate.** Row 5 — recovering a relationship
by experiment, graded by *prediction* rather than by stating the model —
is still the best pedagogical object in the backlog, and
[rubber](./rubber-slate.md) is still its best first consumer. What changed
is that it is **no longer a blocker**: rubber, plastics and drilling can
ship on the token, and discovery can arrive later as what it always was —
a *better way to earn one*.
