# Argument-map slate (working doc)

> **Status: the model and the load-bearing principle are settled; the
> *scale* problems (claim dedup, map-summarization) are the open work.** The
> **argument-map** is the load-bearing **deliberation surface** of the
> polity — where a bill is reasoned through before the vote. It is
> deliberately **distinct from forums**: not a thread of messages organized
> by recency or popularity, but a **navigable typed graph of claims** (the
> bill as spine; claims → objections → rebuttals), organized by the
> argument's own logic. The *governance framing* — why it exists, the
> three-surface taxonomy, the workflow — lives in the cooperative slate's
> *Deliberation* section; this slate specs the **surface itself.**

Working slate for the **argument-map** — the structured-argumentation
surface where the legislature deliberates. The governing claim, and the
reason it isn't a forum: **load-bearing deliberation must be organized by the
argument's structure, not by any user-signal ranking** — because in a
gamified polity any outcome-affecting ranking collapses to popularity/exploit
over time, so the only ungameable organizer is the *logic of the argument
itself.*

See also:

- [cooperative-slate.md](./cooperative-slate.md) §
  *Deliberation* — the **governance framing**: the three-surface taxonomy
  (social forum / polling / deliberation), the
  chatter→poll→deliberate→converge→vote workflow,
  deliberate-as-equals/vote-by-weight, and the ungameable-organization
  principle. This slate is the surface that section points to.
- [delivery-slate.md](./delivery-slate.md) — the comms
  family (chat / email / **social forum**). The argument-map **reuses the
  `GroupRef` audience seam** (L1) but is *not* a conversation product — its
  artifact (a claim-graph) and interaction (argue/navigate) are wholly its
  own. The social forum is the *informal* discussion *around* a deliberation;
  the argument-map is the *formal* structure *of* it.
- **The archive** (cooperative-slate § *The record*) — the argument-map is the
  **legislative history**: tamper-evident, the record the judiciary reads for
  spirit-judgment, and the source any map-summary must be drillable to.
- **Polling** (Pol.is / vTaiwan) — the *sensing* sibling; advisory, never the
  organizer. May attach to claims (sense agreement) but never ranks them.
- **Prior art** — **Kialo** (the clean modern reference: navigable pro/con
  claim trees); **IBIS** (Rittel's Issue–Position–Argument framework) + the
  **Toulmin** argument anatomy; MIT's **Deliberatorium** (large-scale
  argument-mapping for crowds — the scale problem this slate inherits);
  argument-diagramming tools (Rationale, Araucaria, Carneades).

---

## The spine

1. **Structure is the organizer — and the only ungameable one.** The
   argument-map has *no ranking* (no votes order the content). Organization
   comes from the argument's logic — the typed graph of claims and their
   relations — which is *authored*, not *voted*, so there is nothing to
   capture. (The principle the cooperative slate banked: in a gamified polity
   any user-signal ranking decays to popularity; structure is the escape.)
2. **Dissent is a node, not a downvote.** An objection is a permanent,
   navigable part of the structure — never buried, never deleted. The
   minority view is preserved *by construction.*
3. **Contribute as equals; decide by weight.** Anyone contributes claims
   one-person-one-voice (the free-expression right); influence-weighting
   enters only at the separate *vote*, after the map matures.
4. **The failure mode is bad-faith content, not a ranking exploit.** With no
   ranking to game, the attack surface shifts to fallacious / duplicate /
   off-topic claims — a **curation/moderation** problem (the constabulary +
   appeals judiciary), which the governance already handles.
5. **It's the legislative history.** The whole map + its evolution persists
   in the tamper-evident archive — the record the judiciary reads for the
   *spirit* of a law.
6. **Reputation-blind.** An argument from a nobody and from a celebrity are
   evaluated identically — by support and objections, never by the author's
   **renown**. Weighting arguments by reputation would rebuild the
   appeal-to-authority fallacy *and* a gameable rank (farm renown →
   dominate). Reputation routes *attention* (whom you choose to read — opt-in,
   per-circle) and weights the *vote* (via the consumer chamber), never the
   *structure*. The safe arrow is **conduct → reputation** (good-faith
   deliberation *earns* regard; bad-faith earns notoriety — accountability),
   never **reputation → authority** (capture). See the cooperative slate's
   *Deliberation* section.

---

## The data model — a typed claim-graph

The artifact is a **graph of typed nodes**, rooted at a proposal:

- **Root: the proposal / bill** — a version-controlled document (amendment =
  branch / edit / merge; law is versioned like code). The map argues *about*
  it.
- **Nodes** (typed argument units):
  - **claim / position** — an assertion;
  - **pro / support** — an argument *for* its parent;
  - **con / objection** — an argument *against* its parent;
  - **rebuttal** — a pro/con attached *to another argument* (you argue about
    arguments — recursive).
- **Edges** — typed relations (`supports` / `objects-to` / `responds-to`).

Recursion is the point: every node can carry its own pros and cons, so nuance
lives in *depth* (the objection-to-the-objection), not in a flat pile. The
Kialo / IBIS shape. (Tree by default; a DAG once a claim is reused under
multiple parents — open whether to allow reuse or keep it a strict tree.)

## Standard-model situation

The argument-map is a **Document-backed structured artifact** (the
deliberation record), *not* a `Stuff` graph in the world tree — the claims
are records inside the artifact. It **reuses the `GroupRef` audience seam**
from the delivery-slate (who may read/contribute, through the `GroupApi`
facade) but has its own **L2 artifact** (the claim-graph) and **L3
interaction** (navigate / attach a node / refactor). It persists in the
archive. And it's **text-first by nature** — claims are prose statements, the
map is navigable text structure: exactly what the medium renders well, and
why this fits a text polity rather than fighting it.

## Mechanics (the buildable surface)

- **Navigation is structural.** You read the map by walking its logic — drill
  into a claim's objections, their rebuttals — not a ranked feed.
  Personalized triage comes from **delegated attention** (what the people you
  trust on this topic flagged), never a global ranking.
- **Contribution = attach a typed node** to a claim (a pro, a con, a
  rebuttal). The graph grows by argument, not by posting.
- **Convergence-detection + a time-box** ends deliberation: the map *matures*
  (objections answered, structure stable, no new substantive claims) → hands
  the (possibly amended) proposal to the weighted **vote**, with an
  anti-railroad minimum period (no closing into a vacuum).
- **The map informs; it doesn't decide.** Reasoning is structured here; the
  binding decision is the separate weighted ballot. Polling may sense
  agreement on claims (advisory), never rank them.

## The hard problems (the open work)

The model is simple; *scale* is where the work is:

- **Claim dedup / canonicalization — the central problem.** At polity scale,
  hundreds will make near-identical claims; without merging equivalents into
  **canonical claims**, the graph bloats and fragments into unreadability
  (the argument-map's version of the firehose). Merging is hard (who decides
  two claims are "the same"?) *and* a capture vector if automated. Likely
  answer: **assisted curation** — the system *suggests* merges (LLM,
  integrity-grade, grounded), humans (sortition clerks / the community)
  confirm; never silent algorithmic merging. The make-or-break problem for
  scale.
- **Map-summarization** — even structured, a huge map is a lot. An LLM
  **summary of the argument** (strongest pros/cons, the open objections) is
  *compression, not ranking* — and must be **integrity-grade** (grounded,
  every line drillable to its nodes, reproducible). Advisory; the raw map
  stays authoritative.
- **Convergence-detection** — when is an argument "done"? Heuristics
  (objections answered, claim-novelty drying up, structure stable) + the
  time-box + the anti-railroad floor. Open tuning.
- **Moderation of bad-faith / off-topic claims** — the curation problem
  (constabulary flags, appeals judiciary reviews), plus structural hygiene
  (mis-parented claims, fallacy-flagging). Distinct from dedup.
- **Proposal version-control** — branch / edit / merge of the bill document,
  and the map re-anchoring across versions. (Leans on the
  versioned-law-document thread.)
- **Editing & refactoring** — can a claim be edited (versioned/archived)? Who
  may re-parent / merge / split nodes, and how it's tracked.

## Buildable now — the small-scale slice (v1)

A **basic claim-tree** without the scale machinery:

- the typed nodes (claim / pro / con / rebuttal) + relations, rooted at a
  proposal;
- structural navigation + attach-a-node contribution, audience via a
  `GroupRef`;
- egalitarian contribution (one-person-one-voice);
- archived (the deliberation record);
- convergence by **time-box** (no automated maturity-detection yet);
- the hand-off to the weighted vote.

This works for a *small* deliberation (a few dozen participants) — the
population-ladder pattern again: small bodies deliberate fine on the bare
claim-tree; **mass** deliberation needs the deferred dedup + summarization
layer.

## Open problems — deferred to scale

- **Claim dedup / canonicalization** (assisted curation) — the make-or-break
  scale problem.
- **Integrity-grade map-summarization** (grounded, drillable, reproducible).
- **Automated convergence-detection** (+ the anti-railroad minimum).
- **Mass-scale moderation** of claim quality (the curation pipeline).
- **Proposal version-control + map re-anchoring.**
- **A full surface doc** — graduates to `docs/subsystems/` once a slice
  ships.
