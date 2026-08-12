# Study.com strategy (working doc)

**Status: internal working doc — talks about study.com directly.**
This is the between-us strategy layer: product map from public
sources, stakeholder analysis, video prioritization, and
go-to-market alternatives. The videos themselves stay what
[education-videos.md](./education-videos.md) says they are — a pitch
for the game, not a deal proposal. This doc is where the deal
thinking lives so the videos don't have to carry it.

Everything below about study.com is from **published sources only**
(researched 2026-07); items marked ⚑ are open questions to answer by
interviewing the resident insider.

> **Engagement / "it's a game" positioning** — how to lead with the
> fun/gamification story *without* the burned word, why the category failed,
> the validated novelty claim, and the first-mover / ideal-operator close:
> [study-com-engagement-and-positioning.md](./study-com-engagement-and-positioning.md).
> That doc carries the emotional half of the business case this doc makes
> structurally.

> **⚠️ Business framing corrected (2026-08-05) — read
> [study-com-platform-business-model.md](./study-com-platform-business-model.md).**
> The "go-to-market alternatives / deal models" below were written as
> **Study-partnership** shapes, implicitly treating the game as a product
> *we own and Study partners with*. That's wrong at the root: **Saxonberg is
> AGPL-3 open source; Study *licenses and runs its own instance*.** The deal
> runs in reverse — any party can operate the platform, Study has no special
> authority, and our revenue is **custom platform + integration support** and
> **managed ops / PaaS**, not customer ownership. Model E ("platform
> license") is the closest existing shape; the business-model doc is its
> correct, foundational form. Read the deal models below as *shapes of an
> operator relationship*, not as us selling a product we own.

---

## Study.com product map (public)

- **College Saver / College Saver Pro** (~$95 / ~$235 per month).
  200+ ACE- and/or NCCRS-credit-recommended courses; credits have
  transferred to 1,500–2,000 institutions. Structure: subject →
  course → chapter → lesson, with chapter tests + a final exam.
  **As of 2025, lessons and quizzes are optional** — only chapter
  tests + final are required — and the final's proctoring **moved from
  live supervision to automated identity verification**, TypingDNA
  (typing-pattern) + Veriff (ID + selfie). *(Corrected 2026-08-07: this
  bullet previously said "proctoring was removed" and "finals are
  open-book." `Proctored_Exam` is alive and CX credit rides it —
  [platform-reality §6](./study-com-platform-reality.md); "open-book" is
  unverified. Say "identity-verified proctored final.")*
- **Test prep** — SAT/ACT/AP, GED, HESI, ASVAB, real-estate
  licensure, TOEFL (new AI-tutoring experience), and **teacher
  certification for every state** (Praxis, FTCE, CBEST…). Claimed
  65M+ users across prep products. Adaptive algorithm builds
  personalized study plans from diagnosed strengths/weaknesses.
- **K-12 / homework help / homeschool** — 88,000+ video lessons with
  transcripts, 24/7 expert homework help.
- **Working Scholars** — the mission/B2G channel: city- and
  sponsor-funded no-cost bachelor's pathway (Study.com credits →
  partner universities, originally Thomas Edison State). CZI-funded
  district deployment; 150+ graduates, ~$20M tuition saved.
- **Stated strategic direction** (2025 product PR): remove barriers
  for returning adults ("some college, no degree," under 35,
  working), reduce academic anxiety, expand tutoring/coaching,
  invest in AI-driven personalization. Leadership: CEO/co-founder
  Adrian Ridner.

### The finding that matters most

> **⚠ CORRECTED 2026-08-07 — the premise of this section is too strong.**
> [platform-reality §6](./study-com-platform-reality.md) verified against
> the stage DB that **`Proctored_Exam` is alive**, with
> `Typing_Dna_Result_For_Proctored_Exam` and
> `Veriff_Result_For_Proctored_Exam` beside it, and that **CX earns credit
> through it**. So proctoring was **not removed** — its *mode* changed,
> from live human supervision to **automated identity verification**
> (typing cadence + ID/selfie). "Open-book" is not verified either way and
> should not be asserted. **What survives** of the argument below: point 1
> (completion is their central product problem) is independently
> confirmed, and point 2's *conclusion* is right for a better reason —
> the seam should grade **assessment provenance** rather than assume it,
> because issuers differ and modes change, not because their final is
> weak. **What dies:** "identity-verified, *not* proctored," and any read
> that treats their strongest signal as a lowered bar. The correct
> phrasing everywhere is **"identity-verified proctored final."**

**They removed proctoring to fight completion anxiety.** Their own
product motion is to *lower the rigor cost* of finishing, because
completion is the metric that hurts. That cuts two ways for us:

1. It confirms the thesis: completion/continuation is their central
   product problem, and our whole offer is a motivation engine that
   raises the *desire* to finish without touching the instrument.
2. It breaks our old "proctored = deed" shorthand. Study.com's
   strongest current signal is an **identity-verified, open-book
   final** — real, but not proctored. The seam must grade assessment
   provenance rather than assume it (see below). It also opens a
   door: a game-side capability ceiling that *wants* a stronger
   signal gives study.com a reason players would voluntarily opt
   into higher-rigor assessment — rigor as an unlock, not a barrier.
   ⚑ Was dropping proctoring controversial internally? Is a
   higher-rigor tier plausible as an opt-in product?

### The missing social dimension (added 2026-07-28)

**Education is inherently social — and study.com's product today has
essentially none of it.** 88,000 lessons consumed alone; self-paced
structurally means self-isolated, and the loneliness of the deferred
goal is plausibly *the* stall-churn driver. Every mitigation
available inside a content library is, at best, a comment section.
A persistent world supplies the entire missing dimension natively —
cohort, peers, mentors, being known, being needed — because
text-first is social-first (conversation is literally the medium).
This is not a feature add: it is the half of education their product
category structurally cannot provide, delivered without touching the
product they have. Pitch-weight: co-headline with completion. ⚑ Ask
the insider: has product ever attempted community features, and what
happened?

### Seam correction (design-side)

The credential substrate already models this correctly — validity is
derived, the record is a presentation. Make it explicit: a credential
event carries its **assessment conditions** (proctored /
identity-verified open-book / unverified self-report), and
deed-weight is issuer- and conditions-graded. Vertical-agnostic for
free: CLEP is proctored, Sophia is open-book, a bootcamp is
project-graded — one schema, graded provenance, no per-partner
hardcoding.

---

## Stakeholder map → what each values

⚑ All titles/priorities below are inferred from public materials;
the insider interview should correct the roster and name actual
champions ("not everyone gets it" — who does?).

| Stakeholder | What they steer on | What our content must show them |
|---|---|---|
| Product (College Saver) | Course completion, subscription retention, "barrier removal" | A player *wanting* to finish tonight's chapter because their character is waiting on it. The motivation engine, concretely. |
| Leadership / strategy | Differentiation, moat vs content commoditization + LLMs, new growth | A persistent credentialed world no content competitor can copy; the vertical-agnostic platform story. |
| Academic & credit partnerships (ACE/NCCRS-facing) | Credibility of credit recommendations, assessment integrity | The claim/deed ladder: the game *raises* the value of their assessment signal and never touches the instrument. Especially resonant post-proctoring-removal. |
| Growth / marketing | Acquisition cost, new audiences, brand | Gamer/streamer channel; "every species is real taxonomy, every food is USDA data" as PR-grade credibility. |
| Working Scholars / mission | Learner persistence in sponsored cohorts, sponsor-visible outcomes | A cohort experience: study together in a shared world; measurable persistence. |
| Engineering / integration | Cost and risk of anything new | One outbound credential event feed; zero product changes for a pilot. |

## Video priority (by stakeholder value)

Priority is stakeholder-value-ordered, but the videos themselves are
**experience-first** ([education-videos.md](./education-videos.md)):
each video is a player experience in Schell's sense, shown as fun —
the exec read (engagement / personalization / marketing /
completion) is derived from the experience in its closing beat,
never the subject. Fun is the carrier; if the video isn't fun, no
business claim in it lands.

Reordering [education-videos.md](./education-videos.md)'s candidates
by the value the *study.com side* gets from watching:

1. **Real mastery, real capability** (product + leadership) — the
   seam beat end-to-end: hit a ceiling → complete real coursework →
   pass the verified final → the conferral fires → do the thing.
   This is the completion story told as gameplay; the single
   highest-value artifact for the people whose metric is completion.
2. **Learning as adventure** (leadership + Working Scholars) — the
   University, dual advancement, guilds as the subject taxonomy made
   social. The vision video; establishes that education is the
   game's core, not a skin.
3. **The knowledge ladder** (academic/credit stakeholders) — claim
   vs deed, bands not numbers, assessment provenance graded
   honestly. The rigor-alignment story, aimed at the people who
   protect the ACE relationship.
4. **`look` vs `analyze`** (product + marketing) — the pedagogical
   seam on screen; one fountain, prose then physics. Short,
   demonstrable, shareable.
5. **Seeded from reality** (marketing) — real taxonomy, USDA data,
   student-verifiable content. Credibility ammunition.

Gamer-series episodes (vitals, honest world, scripting) remain the
evidence base that the game is *fun on its own feet* — link, don't
remake.

---

## The LinkedIn flank (leverage, added 2026-07-30)

LinkedIn Learning is a direct study.com competitor — and Saxonberg's
chronicle/advancement substrate is a **LinkedIn-killer primitive**:
the professional profile LinkedIn *pretends* to be, produced as a
byproduct of play. Four structural advantages over the incumbent:

1. **Deeds with receipts vs. claims** — résumés are self-authored,
   endorsements are reciprocity theater; the chronicle/transcript
   draws deed-vs-claim at the schema level (witnessed, receipted,
   derive-on-read). The mirror-with-receipts IS what a profile page
   has always pretended to be.
2. **Fun vs. chore** — nobody wants to be on LinkedIn; it's a
   between-jobs performance. The participation engine accrues the
   profile as a byproduct of wanting to show up. Their engagement
   problem is our foundation.
3. **Earned memory vs. connection spam** — per-viewer recognition,
   regard from behavior, durable contacts.
4. **Transacted vs. asserted work history** — employment, wages,
   contracts, escrow: the work happened on the ledger.

**Why this is study.com leverage, not a hazard:** the megacorp can
stand up its own game-shaped credential world with its own models —
eventually. Study.com can be **first** to wield this one: partnering
with Saxonberg flanks LinkedIn Learning with an asset LinkedIn cannot
copy quickly (an honest world compounds; content can be generated,
provenance can't). First-mover on the seam = the urgency argument in
the room. This is deck/conversation material — the *videos* keep the
no-competitor rule (V3 carries exactly one unnamed sentence); the
named, four-point version lives here and in any investor context.

## StudyAI — the wedge, and its numbers are the argument (added 2026-08-03)

Study already ships **StudyAI** (the CX + Test Prep "Student AI
Assistant") — a topic-aware, **function-calling** LLM agent in
`prediction-services` with real tools (enroll, create study plan, set
goal, create classroom, recommend next lesson). Full technical + leverage
capture: [study-com-studyai.md](./study-com-studyai.md). Two things it
hands the pitch:

1. **The concept is pre-sold internally.** Study built and staffed
   AI-assisted learning (the "Alpacas" team), so the idea isn't foreign and
   there are internal validators. The tuned function-calling tool layer is
   a reusable asset — their tools become our commands.
2. **Its numbers are the argument, not a liability.** 94% of Test Prep /
   74% of CX users only click canned pills; ~1.5k users; the team's own
   note that it "isn't working as expected"; a router that can't infer
   intent. Every one is a **container failure** — a web page can't host a
   conversational, context-dependent agent. Saxonberg fixes each:
   conversation is the medium (pills → real interaction), location is
   intent (fixes routing), doing is the point (fixes engagement). And
   Study's own roadmap pivot — "invisible AI, focused, embedded in the
   activity" — **is a classroom.**

Pitch line: *"You already built the intelligence and believe in it; it's
underperforming because a website can't host it. We're the world where the
same tools finally work."* Use these figures **only** in the Study-facing
deck (their own data reflected back) — never in public materials.

## Go-to-market alternatives

Models, lightest first. Not mutually exclusive — A is the on-ramp to
any of the others, and all of them ride the same seam, which is why
the seam (not any deal shape) is what the videos describe. All are
vertical-agnostic: "study.com" below is "the first ed-tech partner."

- **A. Credential integration (issuer model).** Study.com unchanged;
  completion/exam events land as transcript evidence in the game.
  Cheapest yes; the pilot shape. Engineering reality (interview Q3):
  instrumentation exists (an event data layer already records
  everything) but distribution doesn't (warehouse/reporting only) —
  so A itself is two-phase: pilot off a scheduled warehouse export
  for a flagged cohort (batch latency acceptable for proof), then a
  thin pub/sub relay on the existing event stream for the real-time
  deed moment. Revenue: none/affiliate at first — this model buys
  the *proof*, not the business.
- **B. Bundle / retention layer.** Game membership bundled with
  College Saver (or Pro) as a subscriber benefit. The game is the
  reason the subscription outlives the immediate goal. Revenue:
  per-subscriber license or bundle share. Needs A shipped.
- **C. Net-new co-branded product.** The user-suggested shape: a new
  SKU where you access study.com's content *through* the world —
  video lessons embedded diegetically in the University (the vision
  doc already places embedded educational video in-world), progress
  feeding your avatar natively. Closest to "the University IS the
  study.com learning model"; largest build, largest differentiation.
  ⚑ Appetite for new SKUs vs. bolt-ons?
- **D. Working Scholars cohort pilot.** One sponsored cohort studies
  in a shared world; persistence measured against the program's own
  baseline. Small, mission-aligned, sponsor-visible, and produces
  the outcomes data every other model wants to cite.
- **E. Platform license (vertical-agnostic endgame).** The engine as
  a white-label capability any ed-tech catalog plugs into — each
  partner's taxonomy a college of the University. Study.com's
  best version of this is *exclusivity* in their categories; other
  ed-tech partners (or non-education verticals entirely) are the
  BATNA that keeps the platform story honest.

Sequencing instinct (revised after interview): **A → (B or C)**, the
measurable cohort run as a **College Saver product experiment** (a
flagged segment) rather than through Working Scholars — the program
turned out to be peripheral to the business (interview Q6). E stays
the standing frame; D survives only as a later sponsor-facing story.
The videos support all of these without naming any of them.

---

## ⚑ Insider interview list

Public research can't answer these; the user can. Answers recorded
inline as they land (interview 2026-07-28).

1. Org & champions: who actually decides on partnerships/product
   bets? Who internally "gets it" already?

   **A:** The pitch audience is four executives: **Laura Dansbury**
   (head of product), **Chris Mancini** (chief growth officer),
   **Michael Shmeir** (president & COO), **Adrian Ridner** (CEO &
   founder). The idea has so far been shared only with designers and
   engineers — no product people yet. Unknown whether any of the four
   game or already grasp the inherent value.

   *Implication:* no assumed gamer literacy at the decision table.
   The videos must carry the value proposition to non-gamers —
   demonstrate the loop on screen, translate it into completion/
   retention/growth vocabulary, zero game-culture jargon. Champion
   development among the designers/engineers who've already heard it
   is a real asset (internal validators when product asks around),
   but the artifacts must stand alone for a product/growth/COO/CEO
   audience. Four people also means potentially four different lead
   videos: Dansbury → the seam beat (completion), Mancini → the
   acquisition-channel/moat story, Shmeir → cost/risk shape of a
   pilot, Ridner → the vision + mission (Working Scholars) frame.
2. Metrics: what does College Saver product actually steer on —
   completion? monthly retention? credits-per-subscriber? What's
   the churn shape (goal-completion vs stall)?

   **A (user's inference, not internal data):** both modes are real —
   subscribers cancel because they **transferred to where they were
   headed** (goal completion: College Saver is explicitly a
   waypoint product) or because they **give up** — not completing at
   a rate that justifies the monthly resubscribe (stall churn).
   Exact split unknown; the specific steering metric unknown.

   *Implication:* pitch both stories, but note the asymmetry:
   goal-completion churn is *structural* for a transfer-credit
   product (arguably healthy — the product worked), while stall
   churn is pure loss. The motivation engine attacks stall churn
   directly, which makes it the primary claim; the
   world-outlives-the-goal retention story is the secondary upside.
   Asking product for the actual split is a natural conversation
   opener with Dansbury.
3. Taxonomy & plumbing: how are courses/chapters/lessons identified
   internally? Does any outbound completion webhook/API exist today
   (e.g., for Working Scholars university partners)?

   **A (shape only, no proprietary detail):** there's a **service
   layer exposing the data via common CRUD APIs**, built on
   Hibernate/HQL (i.e., a Java stack over a relational store), plus
   **Solr** as a search data source and **Cassandra** for user
   metadata.

   *Implication:* the integration-cost story firms up — course/
   lesson/completion data is already behind an internal API surface,
   so an outbound credential feed is a thin new consumer on existing
   services, not a data-layer project. Entities being
   relationally-modeled implies durable internal IDs to map
   Disciplines onto.

   **Outbound today:** transcripts go to ACE-compatible institutions,
   possibly via Credly — but **don't over-weight Credly** (user
   correction): it's a CX-side transcript channel at most, not an
   integration rail.

   **The real integration picture (user):** an integration layer will
   need to be **built**, probably with **pub/sub that doesn't exist
   yet** — the learning platform isn't real-time the way a game is.
   There IS an event data layer recording all sorts of events, but it
   flows into a **data warehouse used only for reporting**; no other
   application consumes it.

   *Implication:* the honest engineering story is
   **instrumentation exists; distribution doesn't.** That's still a
   good story — "tap the event stream you already capture" is a far
   smaller ask than instrumenting a learning platform from scratch;
   the build is a relay, not sensors. Two-phase framing for the
   pitch: (1) **pilot on the ugly path** — a scheduled export /
   warehouse pull for a flagged cohort at daily-ish grain, enough to
   prove the loop even though the conferral lands hours late; (2)
   **productize with the thin event relay** (the pub/sub tap) to make
   the moment real-time — pass the final, walk into the University,
   the conferral fires while it still feels like consequence. The
   latency question is honest product tiering, not a blocker: the
   claim-tier (coursework knowledge) tolerates batch fine; it's the
   deed-tier *moment* that deserves real-time. Still open: taxonomy
   churn-stability over time (map at course grain if chapters
   reshuffle).
4. Proctoring removal: internal rationale and reception; ACE/NCCRS
   reaction; any plans for an opt-in higher-rigor tier?

   **A:** mostly **competitive parity** — other ed-tech sites had
   already abandoned proctoring while keeping their ACE credential,
   so study.com was matching the category, not innovating on
   anxiety. (Reception + rigor-tier appetite still unasked.)

   *Implication:* the whole credit-by-exam category has flattened
   downward on assessment rigor — a completion-cost arms race where
   nobody can afford to be the strict one. That makes
   **rigor-as-an-unlock** a category-level differentiator rather
   than a study.com-specific fix: an opt-in, demand-side reason for
   learners to *choose* a stronger verification (the game's deed
   tier wants it) restores a rigor signal without re-imposing a
   barrier — and competitive pressure can't force it back out,
   because it's chosen, not required. This is a pitch line worth
   testing on the academic-credibility stakeholders: "we make rigor
   something learners ask for."
5. Prior art: has gamification been tried/pitched internally? What
   happened, and what vocabulary is burned?

   **A:** nothing to speak of — some hackathon projects that went
   nowhere. No burned vocabulary identified.

   *Implication:* clean slate, two-sided. No scar tissue around the
   concept — but the existing pattern for game-shaped ideas at
   study.com is "hackathon project that dies," which is exactly the
   bucket this pitch must not land in. Bottom-up demos without exec
   sponsorship don't survive there; that argues for (a) artifacts
   with production polish and metric framing that read as a business
   proposal, not a hack-day toy, and (b) routing to the four execs
   deliberately rather than debuting through engineering channels
   the idea has already been socialized in. The "not gamification"
   language rule stands on its own merits (accuracy), unburdened by
   local history.
6. Working Scholars: who runs it, and is a cohort pilot politically
   plausible?

   **A:** the user (2 years inside) doesn't know what Working
   Scholars is.

   *Implication:* that ignorance IS the answer — the program is
   peripheral to the business (PR-forward, mission-driven, small),
   not an internal center of gravity. Public materials over-weight
   it. **Demote model D** from the sequencing: a cohort pilot there
   has no internal constituency to champion it. The measurable-
   cohort idea survives, but re-homed: run it as a College Saver
   product experiment (a flagged user segment), where the metric
   owners actually live. D stays on the list only as a later
   sponsor-facing story once something works.
7. Test-prep vs College Saver: which business unit is healthier /
   hungrier for engagement products?

   **A:** test prep is a little bigger; the two are about equal in
   priority. The load-bearing observation: both are **"high-stakes"
   learning** — concrete goals satisfied with urgency (get the
   degree, pass the exam) — and together they're ~95% of the
   business. The game is **low-stakes by design**, which makes the
   pitch harder. And the user names the ethical edge himself: a
   player who brings *greater* urgency to their avatar than to a
   real immediate goal is arguably exhibiting dysfunction. Tread
   lightly.

   *Implication:* see "The high-stakes reconciliation" below — this
   answer sets a governing constraint on all pitch framing.

## The high-stakes reconciliation (governing pitch constraint)

Study.com sells high-stakes learning; Saxonberg is low-stakes by
design. The naive pitch ("we add engagement") walks straight into
the dysfunction critique: engagement that competes with a learner's
real, urgent goal is harm, not value — and a room of education
executives will (rightly) probe exactly there.

The resolution is structural, not rhetorical:

- **The avatar borrows its stakes; it has none of its own that
  compete.** The claim/deed design means the education-linked
  capability ceiling rises *only* through real progress. There is no
  in-game grind that substitutes for the coursework — the coursework
  IS the advancement path. Time spent pursuing that ceiling is time
  studying. The displacement failure mode (grinding instead of
  learning) is the one thing this architecture cannot produce.
- **Low-stakes is the feature, not the apology.** A high-stakes
  journey is lonely, abstract, and deferred-reward — the degree pays
  off years out while the monthly grind pays off never. The game
  supplies an immediate consequence surface for real progress
  (tonight's chapter changes your character tonight) and a
  **rehearsal space where the knowledge gets used and failure is
  cheap**. That is anxiety *relief* aimed at the exact problem their
  2025 product motion targets — confidence through low-stakes
  application before high-stakes performance.
- **Design guardrail, sayable out loud:** the game refuses
  manufactured urgency — no streak punishment, no FOMO mechanics, no
  time-pressure retention tricks. Urgency belongs to the real goal;
  the game only reflects it. (This is already the ethos — honest
  systems, no dark patterns — so the pitch can claim it truthfully.)
- **Never pitch engagement for engagement's sake.** The metric story
  is completion of the *real* thing; in-game investment is the
  mechanism, never the outcome we sell.

Test-prep note under the same lens: prep users are one-and-done by
nature — but the deed they earn (the passed exam) confers permanent
capability in a world that persists after the subscription ends.
"Your credential outlives your subscription, somewhere" is a reason
prep users enter the world at all — a post-exam afterlife for the
achievement, not a reason to linger in prep.
