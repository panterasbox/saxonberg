# Argument-map slate (working doc)

> **Status: PARTIAL** — v1 shipped 2026-06 (forums cycle 2): the
> `organizer: 'argument'` claim graph, the lenses, `reply
> --pro|--con|--rebut`, `mature`, the client argument mode
> → [forums.md](../../subsystems/forums.md)
> **Left:** claim dedup / canonicalization · integrity-grade
> map-summarization · automated convergence-detection (+ the anti-railroad
> floor) · mass-scale moderation of claim quality · proposal
> version-control + map re-anchoring · editing & refactoring · the vote
> consumer · the plural-lens explorer
> **Size:** a wave

Working slate for the **argument-map** — the structured-argumentation
surface where the legislature deliberates. The governing claim, and the
reason it isn't a forum: **load-bearing deliberation must be organized by the
argument's structure, not by any user-signal ranking** — because in a
gamified polity any outcome-affecting ranking collapses to popularity/exploit
over time, so the only ungameable organizer is the *logic of the argument
itself.*

See also:

- [cooperative-slate.md](../builds/cooperative-slate.md) §
  *Deliberation* — the **governance framing**: the three-surface taxonomy
  (social forum / polling / deliberation), the
  chatter→poll→deliberate→converge→vote workflow,
  deliberate-as-equals/vote-by-weight, and the ungameable-organization
  principle. This slate is the surface that section points to.
- [delivery-slate.md](../builds/delivery-slate.md) — the comms
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

3. **Contribute as equals; decide by weight.** Anyone contributes claims
   one-person-one-voice (the free-expression right); influence-weighting
   enters only at the separate *vote*, after the map matures.
4. **The failure mode is bad-faith content, not a ranking exploit.** With no
   ranking to game, the attack surface shifts to fallacious / duplicate /
   off-topic claims — a **curation/moderation** problem (the constabulary +
   appeals judiciary), which the governance already handles.

---

## Mechanics (the buildable surface)

- **Convergence-detection + a time-box** ends deliberation: the map *matures*
  (objections answered, structure stable, no new substantive claims) → hands
  the (possibly amended) proposal to the weighted **vote**, with an
  anti-railroad minimum period (no closing into a vacuum).
- **The map informs; it doesn't decide.** Reasoning is structured here; the
  binding decision is the separate weighted ballot. Polling may sense
  agreement on claims (advisory), never rank them.

## Reading the map — the store/lens split (the consumption model)

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

## Open problems — deferred to scale

- **Claim dedup / canonicalization** (assisted curation) — the make-or-break
  scale problem.
- **Integrity-grade map-summarization** (grounded, drillable, reproducible).
- **Automated convergence-detection** (+ the anti-railroad minimum).
- **Mass-scale moderation** of claim quality (the curation pipeline).
- **Proposal version-control + map re-anchoring.**
- A full surface doc: done — [forums.md § The argument
  organizer](../../subsystems/forums.md#the-argument-organizer-cycle-2).
