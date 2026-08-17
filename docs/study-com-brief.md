# Study.com brief — WIP

> **Status: work in progress.** Written to be handed to the
> **study.com-side agent** — an agent that knows the study.com product
> and content structure well — so it can come back with a document our
> own agents use to synthesize **Magic 101** against the real product.
>
> This is **not** the outward-facing pitch. The pitch derives from this
> later; the deal thinking lives in
> [study-com-strategy.md](./study-com-strategy.md). Keep this one
> factual and unsold.
>
> **Accuracy rail:** everything below is marked **[shipped]**,
> **[designed]**, or **[sketch]**. Nothing is described as existing
> that doesn't. If a claim here can't survive an insider reading it,
> it doesn't belong here.

---

## 1. What Saxonberg is

A text-first, persistent multiplayer world — a MUD in form, an
educational platform in intent. TypeScript across the stack. It is a
real running system with a real economy, not a prototype or a mockup.

The distinguishing property is a **model-selection criterion**. Every
simulation chooses what to be faithful to; most choose spectacle. This
one selects fidelity to **the curriculum**. Heat obeys Newton's law of
cooling. Electricity obeys Ohm's law and resolves through a real
conduction graph. Combustion needs fuel, oxygen, and an ignition
balance. Money is conserved through a single sealed ledger chokepoint.
Metabolism runs on real intake chemistry. Materials have real
properties and respond to real mechanisms.

The consequence: **the model is the syllabus**, and competence
transfers in both directions.

## 2. The thesis

Education scaled **instruction** (books → video → online courses, now
being commoditized by LLMs) and it scaled **assessment** (standardized
testing). It never scaled **application** — practice with stakes, over
time, among people. Labs, internships, clinical hours, flight time are
still handmade, because application needs a world that responds
honestly.

This is that world: the application layer of education at software
scale. A flight simulator for everything else.

The product framing: **applied hours**, sold the way clinical hours
and flight time are sold, for every subject in a catalog.
*Instruction is the manual; this is the lab.*

Three supporting arguments, in brief: practice never scaled because it
is **expensive** (here it's an economy, so knowing pays in income and
capability rather than in badges), **unrewarding** (here division of
labor manufactures genuine demand for expertise — being needed is the
motivator you can't manufacture any other way), and **rationed**
(internships go by connection, clinical seats by lottery, flight hours
by wallet — here the layer costs a subscription and reads on a phone).

One honesty rail we hold everywhere: **practice scales. It does not
replace regulated practica.** Nothing here claims to substitute for
licensure hours.

## 3. Why we invented a subject

To demonstrate curriculum ingestion we need a curriculum, and we don't
have a license. The answer in plain sight: **invent the subject
matter, and then we can teach it however we want.**

That's what magic already is in this world — a completely invented
science. So we authored it properly, as something a college could
actually teach.

**The hard rule we set ourselves:** *nothing in the invented science
may contradict real science.* The bar is **higher** for an invented
subject than for a real one, because a student must never have to
unlearn anything. The College will eventually teach real courses; the
fictional one has to be able to sit next to them.

## 4. The invented subject — thaumology

Full document: `docs/arcane-science.md`. Summary:

**One impossible thing.** *A caster can relocate energy between their
own body and one chosen point, in either direction, in a form of their
choosing, with no medium in between.* Precisely: local conservation of
energy fails; global conservation holds. It breaks **locality** and
nothing else.

Everything downstream is real physics, and that is the whole design.
Mana is measured in kilojoules. A full reserve is about one banana
(440 kJ). Spell costs are derived from specific heat, latent heat, and
phase change. The **second law writes the price list** — delivering
energy as heat is cheap, as coherent light is dear, and that ordering
is exergy. Cooling costs more than heating *and the heat goes into the
caster*, so a cold spell is limited by the caster's body temperature
rather than by their reserve. Mastery is delivery efficiency, so it is
capped at η ≤ 1 — the second law is the game's anti-power-creep
mechanism. Transmutation is not forbidden, it is **unaffordable**:
chemical bonds run at eV, nuclear binding at MeV, a factor of 10⁶,
and a student can establish that in one page.

**What is invented vs. what is real:**

| Invented | Real |
|---|---|
| One postulate | Conservation of energy |
| One taxonomy (5 verbs × 13 domains) | Thermodynamics, all of it |
| The names of the laws and their discoverers | Specific and latent heat, phase change |
| The historical narrative of the field | Efficiency, exergy, refrigeration |
| | Dimensional analysis, unit conversion |
| | Affine and exponential models, curve fitting |
| | Extrapolation and its dangers, error bars |
| | Landauer's principle |
| | Experimental design, controls, replication |
| | Reading a paper for claim, evidence, range, gap |

**Everything a student would be graded on is real.** That is the whole
demonstration.

The field also carries the strands a real science course carries — a
history of its own taxonomic revisions (two categories split by
experiment, two domains confirmed within living memory, one major
result deliberately credited to nobody), a misconceptions bank, an
ethics unit hanging off a measured intercept, and a set of honest open
problems.

**Five laboratory experiments run on the shipped build today**, with no
new code: a calorimetry experiment that establishes the energy
equivalence (the demonstration room contains a stone basin that turns
out to be a calorimeter); a two-variable measurement that recovers an
affine law and its intercept; a selective-suppression experiment; a
field-boundary mapping survey; and a circuit-membership demonstration.
The demonstration area was built as a feature showcase and turns out
to be a teaching laboratory that was only ever missing its theory.

## 5. The second invented subject — Poli Sci 200: The Compact

Full document: `docs/compact-political-science.md`.

A social science to the first one's natural science. The world's
governing structure is an invention of our own design with its primary
sources written: a constitution with entrenchment tiers ending in
unamendable eternity clauses, a three-chamber legislature whose
chambers are **dimensions of every member** rather than groups of
different people, a legislature that enacts *requirements* while the
executive *implements* them and the judiciary verifies conformance, a
judiciary whose jury pool scales from one person to a sortition of the
citizenry, a tamper-evident record every member can independently
re-derive, and a founder's charter that is a self-binding,
self-diluting, code-enforced precommitment.

**200-level** because it presumes working knowledge of how a real
state is organized *and* how a real firm is governed. Without both,
the interesting provisions read as arbitrary; with them, nearly every
article is legible as a deliberate departure from a known baseline.

**What is invented** is the case: the chamber structure, the influence
mechanics, the parameter values, this instance's charter. **What is
real** is everything a student is graded on: separation of powers and
the delegation problem, social choice theory, constitutional
entrenchment and eternity clauses (which several real constitutions
have), precommitment and credible commitment, Hirschman on exit and
voice, Tiebout sorting, Ostrom's commons design principles, Lessig on
code as a regulatory modality, sortition and deliberative democracy,
Goodhart's law, and the gap between formal and effective institutions.

Two structural notes that matter for course design:

**The honesty rail is different in this register.** A social science
course cannot rail on "never contradicts real science," because most
of its questions are contested. The analog is four rules: never
misrepresent a real institution; never present a contested normative
question as settled; treat the Compact as a **case rather than a model
answer**, with the strongest case against every major design decision
put fairly; and name what real practice does wherever the Compact
departs from it. We also state the conflict of interest openly — the
course is taught inside the institution it studies — and resolve it
with a rule in the syllabus: **a student must be able to earn the top
grade by arguing well that the Compact is badly designed.** If that
isn't true, it's marketing rather than a course.

**The assessment split falls on the positive/normative line.** The
same procedural item generator works here, running over rules instead
of physics — *given this allocation history and these parameters, does
the bill carry?* has a deterministic, computed key, generates
unbounded variants, and cannot be answer-shared. *Was this act fair?*
has no key and should not have one; it is graded by rubric on argument
quality. So the machine-gradable and human-gradable halves separate
cleanly, and the separation is itself a methodological lesson we can
teach rather than hide. The generator's only requirement is a
deterministic evaluator, and a well-specified constitution is one.

Named here because **one natural and one social science together
demonstrate that the method generalizes across a catalog**, rather
than that magic is a special case. That generalization is the actual
claim.

## 6. What we think the classroom is

Full document: `docs/slates/builds/college-slate.md`. The parts
relevant to you:

**We would adopt your taxonomy verbatim** — course → chapter → lesson,
your metadata fields, your lesson types, your objective tagging. Not
"inspired by." We have no incumbent course taxonomy to protect, and
the payoff is that ingesting real content later becomes a data import
rather than a redesign.

**Four assessment modes.** Examination (procedurally generated,
engine-computed key) · Practical (perform a procedure, submit a
result, the engine checks it against truth within tolerance) · Essay
or oral defense (LLM- or instructor-graded) · and **Deed** — the
engine witnessed you do it in the course of living. The fourth is the
one a content library structurally cannot produce, and it is what
"applied hours" means operationally.

**Assessment provenance is already modelled.** The world's identity
ledger already distinguishes a **deed** (engine-witnessed) from a
**claim** (asserted), and credentials carry which. That maps directly
onto proctored / identity-verified open-book / unverified
self-report, and it means a credential's weight can be graded by its
assessment conditions without hardcoding any particular issuer.

**The item generator is the piece we're most interested in.** Because
the simulation computes real physics, exam items can be *generated
from the running world with a computed answer key*: sample a real
object with real material properties, compose a question about it, and
derive the key by running the actual subsystem. Nobody authors the
key, so it cannot be wrong. Distractors generate from characteristic
student errors — a dropped term, a missing efficiency factor, an order
-of-magnitude unit slip. Every student gets different numbers, so
answer-sharing does nothing.

That last property matters given the 2025 move away from proctoring:
it is a **higher integrity signal at lower friction**, which is a
different trade from the one usually on offer.

And the same generator spec emits both the multiple-choice item *and*
the practical version of the same question. One generator, both
assessment modes.

**Everything else is composition.** Enrollment is a contract (which
brings tuition, aid, deferred payment, and third-party sponsored
cohorts along for free). Teaching is employment — a position with a
roster and shifts, which a **player** can be hired into. Cohorts are
groups, study groups are parties, discourse is forums, evidence is the
transcript, the diploma is the identity ledger. No new subsystem.

**On the social gap.** Self-paced structurally means self-isolated,
and a persistent world supplies the missing dimension natively —
cohort, lab partner, TA, office hours, and a professor who knows your
name, which here is a *modelled state* rather than a metaphor. Our
resolution to the self-paced-vs-cohort tension is the one real
universities already use: **content is self-paced, sections are
scheduled.**

## 7. What actually exists today

Marked honestly, because an insider will read this.

**[shipped]** — the simulation substrates the courses would ride:
thermal (Newton cooling), fire and combustion, electricity (Ohm's law
+ conduction graph), materials with real properties, metabolism,
husbandry/growth, a conserved two-tier money system, employment,
work contracts, forums, per-viewer belief and recognition, an
advancement system with competence bands and a transcript, an
append-only identity ledger with deed/claim, a document store, a
path-addressed help catalogue with a REST API and an in-game browser,
a CMS, and the magic system the invented science describes — including
a three-room demonstration area.

**[shipped]** — the client: text-first, with a card that can embed
external video (built for livestreaming; a video lesson would play in
it with no new work).

**[designed, not built]** — the discovery/inquiry loop (observe →
measure → hypothesize → **predict** → verify, with published findings
and the failure modes of scientific publishing); the college apparatus
in §6.

**[authored]** — the invented science itself, as a design constraint
document. The mechanisms it describes are shipped; the *science* is a
layer of explanation and content rules on top of them.

**[not started]** — Magic 101 as actual course content. That is what
this brief exists to unblock.

## 8. What we need from you

Roughly in order of how much each changes what we build.

1. **The item schema.** How procedurally generated questions are
   specified: question types, how variants and parameters are
   declared, distractor rules, how the key is expressed, and any
   metadata items carry (difficulty, objective, cognitive level). We
   want our generator to emit *your* item format, so this is the
   highest-value answer.
2. **The content taxonomy fields.** Course, chapter, and lesson
   metadata; lesson types and what assets each carries; learning
   objectives and how they're tagged; prerequisite modelling.
3. **What ACE / NCCRS actually require as assessment evidence.** This
   determines whether the **deed** mode could ever count toward
   credit-recommended assessment, or whether it stays strictly a
   motivation and capability layer. It materially changes the pitch,
   so we want the real answer rather than the hopeful one.
4. **The project / essay schema and rubric format** used for
   hand- or LLM-graded work.
5. **Whether the adaptive engine consumes an outbound signal.** If
   in-world performance could feed personalization, that is a far
   deeper integration than a credential event feed — and it's the
   version where the two products actually improve each other.
6. **Lesson-type inventory and assets** — specifically whether video
   lessons carry transcripts we can render as text, since text is our
   native register.

Two softer ones, if the agent can speak to them: **has product ever
attempted community features, and what happened?** And **is a
higher-rigor opt-in assessment tier plausible** as a product, given
the direction of travel on proctoring?

## 9. What we'd like back

A document our agents can synthesize **Magic 101** from. Ideally:

- The **course/chapter/lesson skeleton** a study.com course of this
  kind would actually have — how many chapters, how lessons are sized,
  where assessments sit, what a final looks like.
- The **item schema**, with two or three worked examples in the real
  format.
- Guidance on **objective tagging** — how learning objectives are
  written and attached, since that's the hook a credit recommendation
  hangs on.
- An honest read on **where our four assessment modes map onto the
  product**, and where they don't.
- Anything about the product we've assumed wrongly in this brief. That
  is genuinely the most useful thing it could return.

## 10. Constraints that won't move

- **Nothing may contradict real science.** Applies to the invented
  subject most of all.
- **Practice scales; it does not replace regulated practica.**
- **Real money never buys in-game advantage.** A subscription
  entitles a learner to content. In-game tuition is in-game money.
  These stay separate.
- **A course never gates a capability outright.** Competence does, and
  a course is one of several ways to earn it. We won't build homework
  into a toll booth.
- **Assessment integrity is never lowered to raise completion.** Our
  whole contribution is raising the *desire* to finish without
  touching the instrument.

---

## TODO before this goes out

- [x] ~~Author the Compact 200 sketch~~ — done, and deeper than
      planned: `docs/compact-political-science.md` is a full course
      treatment, the social-science sibling of `arcane-science.md`.
      §5 above summarizes it.
- [x] ~~Confirm the shipped/designed inventory in §7~~ — verified
      2026-08-02 against `docs/subsystems/`; all 22 claimed subsystems
      have source-of-truth docs. Re-verify if this sits unsent for
      long.
- [ ] Decide whether the study.com-side agent gets `arcane-science.md`
      and `compact-political-science.md` in full or only §§4–5.
      *(Lean: in full. The rigor is the argument, and the
      misconceptions banks plus the open problems are what make these
      look like real fields rather than themed skins.)*
- [ ] Add the worked demo sequence — lecture hall video → lab →
      examination → credential — as a concrete script, once the
      classroom rooms exist.
- [ ] Nothing in here is sold. Keep it that way; the selling happens
      in the videos and the pitch, not in the brief.
