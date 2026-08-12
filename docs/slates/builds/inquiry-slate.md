# Inquiry slate (working doc) — discovering, verifying, and trusting knowledge

> **Status: sketch / pre-requirements.** A design pass, not a spec. Spun
> out of [capability-magic-slate.md](../deferred-rpg/capability-magic-slate.md)
> Part IV on 2026-07-15, when the "how a student discovers a magical law"
> thread grew into something that isn't magic-specific at all: a
> **platform substrate for how *sim-native knowledge* is discovered,
> verified, trusted, and corrupted.** Magic is the vivid *showcase*, not
> the owner — the same loop serves physics, medicine, crafting, farming,
> any honest-sim discipline.
>
> **Why it's its own thing:** it realizes the gamification-mirror thesis's
> deepest claim — teach not just *what is true* but ***how to know***. The
> scientific method (and its failure modes) is the most transferable
> real-world skill there is, and here it's learned by *doing*, not lecture.

See also:

- [capability-magic-slate.md](../deferred-rpg/capability-magic-slate.md) —
  **origin + first consumer.** Part IV § 4 designs magic's use of this
  loop; the apparatus was lifted here so it stops being magic-specific.
- [deduction-slate.md](./deduction-slate.md) — **sibling, and the shared
  spine.** Its hard line — *truth is **shown**, not argued or voted;
  forums are civic aftermath, never the adjudicator* — is this slate's law
  too. Deduction investigates a **specific past event** (a murder) by
  demonstrated evidence; inquiry discovers a **general law** by experiment.
  Same epistemics, different object.
- [identification-slate.md](../tails/identification-slate.md) — the
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
- [farming-slate.md](./farming-slate.md), the University content, and the
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
