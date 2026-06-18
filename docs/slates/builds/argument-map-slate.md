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

> **Factoring superseded by [forums-slate.md](./forums-slate.md) (2026-06):**
> the argument-map is no longer "not a forum" — it is the
> `organizer: 'structure'` mode of the one forum primitive, sharing that
> slate's Part-0 substrate. The "distinct from forums" framing below is
> retained as the *organizer-level rationale*; this slate remains the
> authoritative spec for the structure organizer (data model, principles,
> scale problems).

> **Update (2026-06-18) — substrate mapping + consumption model.** Two
> refinements landed in design conversation, both additive: (1) the data
> model is now pinned to the **cycle-1 forum substrate** — the structure
> organizer is an *interpretation + verb mode over the same `Board`/`Entry`
> store*, not new storage (the seams already ship inert: `Board.organizer:
> 'structure'`, the `Entry.relation` enum, the `'argument-forum'`
> manifestation, the `--argument` flag); see **The substrate** below. (2) The
> reading half is sharpened into a **store/lens split** — the record and the
> *default* lens stay neutral; *your* lens is free — which supersedes the flat
> "never rank" framing; see **Reading the map** below. This is the documented
> **follow-on to forums cycle 1** (builds once the cycle-1 substrate lands).

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
Kialo / IBIS shape. (**Strict tree in v1** — see *The substrate* below; the
DAG case — one canonical claim reused under many parents — ≡ the deferred
dedup problem, so it defers with it.)

## The substrate — the structure organizer over `Board`/`Entry`

The claim-graph is **not new storage.** It is the `organizer: 'structure'`
*reading* of the same cycle-1 forum substrate the popularity organizer uses —
the seams ship inert in cycle 1 and this build lights them up:

- **`Board.organizer: 'structure'`** — the per-board axis (cycle 1 always
  `'popularity'`; the field is already there).
- **`Entry.relation`** — the typed-edge field (`'reply'` for popularity;
  `'supports' | 'objects-to' | 'responds-to'` here). **The node "type" is
  derivable from its edge — there is no separate node-type field.** A *pro* is
  an `Entry` attached via `supports`; a *con* via `objects-to`; a *rebuttal*
  is just a pro/con one level deeper (its parent is an argument, not the
  spine). The **root spine** is the `parent: null` `Entry` — the proposal as
  prose. The four node-kinds above are a *taxonomy of roles*, all carried by
  the one `relation` field.
- **The `'argument-forum'` manifestation + the `--argument` flag** — already
  reserved on `Subject` and the `forum` verb.
- **The vote aggregate is inert here.** `Entry.up`/`down` (the Wave-2
  popularity aggregate) is never read under `'structure'`; nothing ranks, so
  there is nothing to game — principle 1, made concrete.

**Verb surface — reuse `reply`, don't invent.** Contribution is the existing
`forum reply <node>` with valence flags: `--pro` → `supports`, `--con` →
`objects-to`, `--rebut` → `responds-to`. The spine is `forum make … --argument`
+ the root post. (The structure organizer is a verb *mode*, not a new verb.)

**Three provisional model decisions** (settled in conversation; flagged to
revisit):

1. **`responds-to` = the neutral edge** — questions / clarifications / "what
   does X mean" that take *no side*. `supports`/`objects-to` carry all valence
   (pro/con/rebuttal-by-depth), so the third edge holds non-adversarial moves
   rather than duplicating them.
2. **Strict tree in v1.** `Entry.parent` is a single ref → tree for free. The
   DAG case (canonical-claim reuse) **is** the dedup problem below — deferring
   DAG and deferring dedup are the *same* deferral.
3. **The spine is any prose thesis.** Decoupled from the bill lifecycle, the
   root is just "the thing being argued." Consequence: **the argument forum is
   independently valuable *before* governance exists** — the polity can run a
   structured argument about *what government to have*, no measure/docket
   required. The only governance seam reserved is a **`mature → vote` event**
   (see *Convergence*), emitted at convergence; the vote itself is the
   deferred measure/docket layer that consumes it.

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
  trust on this topic flagged), never a global ranking. (Expanded into the
  **store/lens split** in *Reading the map* below.)
- **Contribution = attach a typed node** to a claim (a pro, a con, a
  rebuttal). The graph grows by argument, not by posting.
- **Convergence-detection + a time-box** ends deliberation: the map *matures*
  (objections answered, structure stable, no new substantive claims) → hands
  the (possibly amended) proposal to the weighted **vote**, with an
  anti-railroad minimum period (no closing into a vacuum).
- **The map informs; it doesn't decide.** Reasoning is structured here; the
  binding decision is the separate weighted ballot. Polling may sense
  agreement on claims (advisory), never rank them.

## Reading the map — the store/lens split (the consumption model)

How we *store* the graph must not bake in how it's *read*, and the "never
rank" principle governs the **record and the shared default view** — *not*
your personal navigation. Three tiers, kept strictly apart:

- **The record — no ranking, lossless.** A *dumb store* of pure typed
  relations + prose + provenance (`node, parent, relation, author, body,
  timestamps`) — **nothing about traversal.** No display-order field, no
  score, no precomputed view welded onto the `Entry`. Store the least, so the
  artifact stays open to explorers not yet imagined. (The house idiom: **dumb
  store, smart consumers** — the chronicle / belief-store precedent.) Dissent
  stays reachable forever.
- **The default lens — neutral, shared.** What a stranger with no circle and
  no chosen sort sees: **structural** (spine, valence-grouped, open-objections
  flagged). This is the *one* view everyone shares, so it is the *only* read
  surface that must stay ungameable. Keep it boring.
- **Your lens — free.** Sort, filter, reorder, collapse, tour, summarize —
  **anything** — computed on read, owned by you, stored nowhere, binding
  nothing.

**Why a free personal lens is *not* the gameability hole.** Gaming needs a
**shared target** — one ranking the whole audience climbs, so manipulation
pays off across everyone. A per-viewer, self-chosen, computed-on-read lens has
*no shared target*: to "game" my lens you must manipulate *my* circle or *my*
chosen sort — i.e. persuade me, or watch me choose badly — with no leverage
multiplier. **Capture attaches only to shared surfaces** (a stored order, or a
default everyone inherits). So personalization is safe *exactly up to* the
point it becomes a default. The line runs between *shared* and *yours* — not
between *highlight* and *sort* (an earlier over-statement, now corrected).

### The two triage sources (both non-ranking)

- **Structural salience — intrinsic to the graph.** Properties the structure
  itself exposes, no user signal: **open objection** (an `objects-to` with no
  answering child — a literal hole in the argument, the single best cue);
  **contested** (many cons vs pros); **depth / unexplored**. You cannot *farm*
  these — the only way to move "open objection" is to *answer* it, which
  improves the argument. Attacking the metric and improving the map are the
  same act.
- **Delegated attention — per-viewer, opt-in, non-reordering.** A *highlight*
  layer ("N in your circle engaged here"), never a re-sort. "People you trust
  on this topic" reuses `contacts` / a `GroupRef` / a per-topic circle (regard
  the obvious feeder); the v1 engagement signal is the **authorship you
  already store** (`Entry.author` × your circle) — zero new data. This is the
  *safe place for delegation*: you delegate **attention, not votes** — a
  captured trust-set can only mis-route *what you read*, never *what binds*,
  and every node stays fully present. Liquid democracy's benefit (expertise
  scales triage) with its risk defused by construction.

### One metric, two jobs

**Open-objection count is dual-use.** As a *reading* aid it is the triage
worklist ("go here"); as a *convergence* signal it is the time-box's companion
(trending to ~0 + claim-novelty drying = maturing). Model it once; it serves
both. (Automated convergence stays deferred — but the signal it will read is
the one the default lens already renders.)

### The explorer is plural

Because the store is just relations + prose, *every* read is a query or a
traversal — so the "argument explorer" is not one screen but an **open-ended
family of lenses**, extensible forever without touching the artifact: multiple
**ways in** ("drop me at the open objections / where my circle is arguing"),
**guided tours** (steelman tour, skeptic's tour), **question-lenses** ("what's
the case against?" → the con-subtree; "what's unresolved?" → open objections),
**diffs** ("what changed since I last looked" — free from the event-log /
subscription seam), and **linear vs. spatial** renders. Precomputed artifacts
(LLM summary, salience index) live as **derived caches keyed by lens**, never
as fields on the canonical `Entry`.

**The split as a build boundary.** Cycle-2 ships the **relation-store + the
neutral default lens** — small and safe. The **explorer** is then its own
open-ended track, *because* the substrate was built to be read a hundred ways.

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

- the typed nodes carried by `Entry.relation` over a `'structure'` `Board`
  (no new storage — see *The substrate*), rooted at a prose spine;
- the **`reply --pro/--con/--rebut`** verb mode + the **neutral default lens**
  (spine, valence-grouped, open-objections flagged) + the author-×-circle
  attention highlight;
- structural navigation + attach-a-node contribution, audience via a
  `GroupRef`;
- egalitarian contribution (one-person-one-voice);
- archived (the deliberation record — the dumb relation-store);
- convergence by **time-box** (no automated maturity-detection yet);
- the **`mature → vote` event seam** — decoupled: emitted at convergence, with
  the vote itself the deferred measure/docket layer that consumes it.

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
