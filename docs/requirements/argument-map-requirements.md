# Argument-map (forums cycle 2) — requirements

The **argument-map** is the load-bearing **deliberation surface** of the
polity — where a proposal is reasoned through before a vote. It is the
`organizer: 'argument'` reading of the forum board primitive that
[forums cycle 1](../subsystems/forums.md) shipped: **not new storage**,
but a typed-claim-graph interpretation + verb mode over the same
`Board`/`Entry` documents the popularity organizer uses. The governing
claim, and the reason it is a distinct organizer rather than a ranked
feed: **load-bearing deliberation must be organized by the argument's
structure, not by any user-signal ranking** — in a gamified polity any
outcome-affecting ranking decays to popularity/exploit, so the only
ungameable organizer is the logic of the argument itself.

This build lights up the inert seams cycle 1 reserved (the second
`Board.organizer` value — renamed `'structure'` → `'argument'` here, see
*Surface decisions* — the `'argument-forum'` manifestation, the
`--argument` flag, the typed-edge `Entry.relation` field) and ships the
**small-and-
safe slice**: the relation-store, the neutral default lens, the valence
verb mode, and the cockpit rendering of that lens. The rich
"argument-explorer" (plural lenses) and every *scale* problem are
deferred by design.

Seeded by [argument-map-slate.md](../slates/builds/argument-map-slate.md);
builds directly on the merged forums substrate
([forums.md](../subsystems/forums.md)).

## Goals

- **Typed claim-graph over the existing store.** A `'argument'` board's
  `Entry` tree carries typed edges — `supports` (pro), `objects-to`
  (con), `responds-to` (neutral: questions/clarifications) — with the
  node's *role* derivable from its edge (no separate node-type field).
  The root spine is the `parent: null` `Entry` (the proposal as prose).
  No new collection, no new Document type.
- **Egalitarian, structural contribution.** Anyone in the audience
  attaches a typed node to any node, one-person-one-voice. The graph
  grows by argument, not by ranked posting; dissent is a permanent
  navigable node, never a downvote.
- **The neutral default lens is computable and ungameable.** A
  viewer-agnostic structural projection — spine, valence-grouped
  children, **open-objection** flags, depth — computed on read from pure
  relations, with no display-order or score field welded onto the
  `Entry`. This is the one shared read surface and it stays boring by
  construction.
- **Open-objection is the one dual-use metric.** An `objects-to` with no
  answering child is both the best reading-triage cue ("a hole in the
  argument") and the convergence signal — modelled once, surfaced in the
  default lens, unfarmable (the only way to clear it is to *answer* it).
- **Delegated attention without delegated authority.** A non-reordering
  highlight layer ("N in your circle engaged here") computed per-viewer
  from `Entry.author` × the viewer's circle. It routes *attention*, never
  *votes*; every node stays fully present and equally weighted.
- **Reputation-blind structure.** No node is weighted by its author's
  renown; the up/down vote aggregate is never read under `'argument'`.
- **A cockpit rendering of the default lens.** The existing `ForumView`
  gains an argument mode (organizer-gated, additive — the popularity view
  is unchanged) that renders the neutral default lens live
  (reusing the forum subscription engine), with the circle highlight.
- **Decoupled mature→vote seam.** A `mature` event the deferred
  measure/vote layer will consume, emitted by an explicit owner verb —
  the deliberation record hands off without knowing who picks it up.
- **Claims refine without losing history.** A claim's body edits in
  place (the read stays clean), while every edit appends a lossless
  `'entry-edited'` event capturing the prior text — refinement and a
  tamper-evident trail at once, the trail being the grounded source the
  deferred dedup/summarization LLM layer reads.
- **Archived as the deliberation record.** Every structural mutation
  appends to the existing append-only `forum_events` log — the
  tamper-evident legislative-history substrate.

## Non-goals

Everything the slate defers to *scale*, plus the surfaces another build
owns:

- **Claim dedup / canonicalization** — the make-or-break scale problem
  (assisted curation: system suggests, humans confirm). Out. Its absence
  is why v1 is a **strict tree** (single `parent` ref); the DAG case
  (one canonical claim under many parents) *is* the dedup problem and
  defers with it.
- **Integrity-grade map-summarization** (grounded, drillable,
  reproducible LLM compression). Out.
- **Automated convergence-detection** + the anti-railroad minimum-period
  floor + any time-box scheduler. Out — v1 maturity is a manual verb.
- **Mass-scale moderation of claim quality** (fallacy-flagging,
  mis-parent detection, the curation pipeline). The general
  constabulary/appeals machinery already covers bad-faith content; no
  argument-specific moderation here.
- **Proposal version-control + map re-anchoring** (branch/edit/merge of
  the spine document across versions). Out; leans on the
  versioned-law-document thread.
- **Node refactoring** — re-parent, merge, split, delete. Deferred with
  dedup. v1 allows **body-edit only** (see *Editing* in Surface decisions).
- **Edit notifications + the notification substrate.** No push when a
  claim is edited (or for any forum activity). There is no notification
  inbox in the codebase today and `follow` is passive (it tunes which
  surfaces you see, it pushes nothing) — so wiring edit-push for
  responders/followers would be the first active-follow delivery in the
  whole forum subsystem, a **cross-cutting "active-follow notifications +
  inbox" build** that isn't argument-map-specific. Deferred wholesale. The
  away-case is covered *durably* instead: the `'entry-edited'` row in the
  append-only log feeds the deferred diff-lens ("what changed since I last
  looked"). In v1, edits surface only through the **live subscription
  delta** (open views update) + an **"edited" marker**.
- **Response version-anchoring** — pinning an objection to the specific
  claim version it answered (the rigorous "moving-goalposts" fix). v1
  edits in place; the lossless trail + the edited marker are the v1
  mitigation. Version-anchoring arrives with **proposal version-control**
  (above), which it is a special case of.
- **The vote / measure / docket consumer** of the `mature` event. The
  binding weighted ballot is the separate governance build; v1 emits the
  event into no consumer.
- **The rich argument-explorer** — guided tours (steelman/skeptic),
  question-lenses, diffs ("what changed since I looked"), linear-vs-
  spatial renders, lens-keyed derived caches. The slate's "explorer is
  plural" track; deferred as its own open-ended build. v1 ships **only**
  the neutral default lens + the circle highlight.
- **Polling attachment** (Pol.is-style agreement sensing on claims) —
  advisory sibling, out of scope.
- **Ephemeral bill lifecycle / archive cascade / governance trigger** —
  the cooperative build owns *who* opens and closes a deliberation;
  forums cycle 1 already noted these deferred.

## Surface decisions

### The organizer value is `'argument'`, not `'structure'`

Cycle 1 shipped `BoardOrganizer = 'popularity' | 'structure'` with
`'structure'` reserved-and-inert. This build **renames that value to
`'argument'`** — `BoardOrganizer = 'popularity' | 'argument'` — so the
organizer agrees with the already-shipped user-facing names (the
`'argument-forum'` manifestation, the `--argument` flag, "argument-map").
The rename is **code-and-docs only, no data migration**: cycle 1 always
persists `organizer: 'popularity'`, so no `'structure'` value exists in
any stored document. ("Structure" survives as the *conceptual* organizing
principle — the argument's structure is what organizes — but the enum
value, the flag, and the surface name are all "argument".)

### `responds-to` is the neutral edge

`supports` and `objects-to` carry all valence (pro / con, and
rebuttal-by-depth — a pro/con whose parent is itself an argument). The
third edge, `responds-to`, holds **non-adversarial moves** — questions,
clarifications, "what does X mean" — that take no side, rather than
duplicating valence. Node role is read from the edge; there is no
separate node-type field.

### Strict tree in v1

`Entry.parent` is a single ref, giving a tree for free. The DAG case
(a canonical claim reused under many parents) is *the same deferral* as
claim dedup — deferring one defers the other. Recursion (an argument
about an argument) is depth in the tree, not a graph.

### The spine is any prose thesis

The root `Entry` is decoupled from any bill/measure lifecycle: it is
simply "the thing being argued." Consequence — **an argument forum is
independently valuable before governance exists**: the polity can run a
structured argument about *what government to have* with no measure or
docket. The only governance seam reserved is the `mature → vote` event.

### Relation vocabulary is organizer-scoped

`EntryRelation` widens from `'reply'` to
`'reply' | 'supports' | 'objects-to' | 'responds-to'`. The vocabularies
do not mix per board: a `'popularity'` board uses only `'reply'`; a
`'argument'` board uses only the three typed edges (its spine root is
`parent: null`, like any thread root). The organizer selects which
subset is legal — enforced at contribution time.

### The store stays dumb; lenses are computed on read

The `Entry` gains **no** display-order field, score, or precomputed view
under `'argument'`. The neutral default lens and the open-objection
metric are computed on each read from the pure relation store (the
chronicle / belief-store "dumb store, smart consumers" idiom). The
denormalized `up`/`down` aggregate is never read; no vote verb is
afforded on an argument board.

### Maturity is a manual owner verb emitting a decoupled event

v1 convergence is **not** automated. The subject owner runs an explicit
verb that emits a `mature` `ForumEvent` (+ its transient
`ForumEventFired` twin) carrying the board/subject keys. No time-box
scheduler, no anti-railroad floor, no convergence heuristic — those
defer. The event has **no consumer** in this build; it is the reserved
handoff to the deferred vote layer.

### Client: the argument rendering mode (the UX delta)

`ForumView` gains an **argument rendering mode**, chosen by the board's
`organizer`, that displays the neutral default lens live through the
existing `ForumSubscriptionRegistry`. It is **not** the popularity view
with edge labels bolted on — the argument organizer reads differently, so
the mode is a real (if contained) reshaping of the cycle-1 client. The
delta, relative to the popularity forum:

- **Layout — nested valence-grouped list.** The existing recursive node
  renderer is reused, but a claim's children are **grouped by valence**
  under headings (*Supporting* / *Objections* / *Questions*) rather than
  sorted by score, each node carrying a valence marker (pro `+` / con `−`
  / question `?`). A single-column nested tree — *not* a Kialo two-column
  split (a candidate for the deferred explorer track, not v1). The **root
  spine** renders prominently at the top as the proposal/thesis, not as a
  plain thread title + body.
- **Removed.** Vote controls do not render (no up/down arrows, no score,
  no anti-snowball placeholder), and the popularity **sort selectors**
  (new/top/hot/controversial) are absent — there is no ranked order to
  choose. This is principle 1 made visible: nothing on the shared surface
  is ranked.
- **Added.** An **open-objection flag** (a visible badge on any
  `objects-to` with no answering child — the triage cue + convergence
  signal), the **author×circle highlight** (a non-reordering marker), and
  the owner's **maturity action** (the close/mature affordance).
- **Contribution affordance.** A node's reply control becomes a **three-way
  valence choice** — *add support / add objection / ask* — each building
  the corresponding `forum reply --pro|--con|--rebut` command string
  (reusing the body side-channel composer), in place of the single popularity
  "reply".
- **Reused unchanged.** The subscription-driven live tree, expand/collapse
  navigation, the body side-channel + `compose` prompt, the real-command-
  string discipline (every click previews/sends a `forum …` string via the
  shared `onCommandClick`/`onCommandPreview` handlers), and the
  `ForumChatSidecar` (the informal chat *around* the deliberation, board-
  scoped as in cycle 1).

The plural-lens **explorer** (guided tours, question-lenses, diffs,
linear-vs-spatial renders) is a separate later track; v1 ships only this
one neutral default lens + the highlight.

### Editing — edit-in-place with a lossless trail (body-only)

Arguments are living things; claims need refinement. But a deliberation
record must also be tamper-evident, and a claim that silently mutates
under the responses attached to it breaks the argument's integrity. The
substrate already reconciles these: the `Entry` is the **current state**
and `forum_events` is an **append-only, lossless log**. So editing is
**not** a choice between edit and append — it is both:

- **The `Entry` body edits in place** (the default read stays clean — one
  current claim, refined; no revision pile to wade through). Body-only:
  re-parent / merge / split / delete are **not** in v1 (the structural-
  refactoring half of the dedup deferral).
- **Every edit appends an `'entry-edited'` event capturing the prior
  body** — the lossless edit trail. This is the tamper-evident history,
  and the **grounded source the deferred LLM dedup/summarization
  consumers read**: keeping the log lossless is exactly what an
  integrity-grade (drillable, reproducible) summarizer needs, so the log
  is never compacted.
- **The rendered claim carries an "edited" marker.** History itself is
  not inlined into the default lens (that is the read-bloat trap); it
  surfaces through the deferred **diff-lens** ("what changed since I last
  looked"), which the slate already lists and which this trail powers.

There is **no existing edit verb in cycle 1** (`Entry.editedAt` shipped
as a reserved-but-unused field) — so this build *adds* the minimal
edit path (an `editBody` logic method + a `forum edit` verb + the
`'entry-edited'` event), shared by both organizers.

Notifications on edit (responders, followers) and response version-
anchoring are **out of scope** — see Non-goals.

### Delegated-attention circle source

The v1 highlight signal is `Entry.author` ∈ the viewer's circle, using
the **already-stored** authorship (zero new data). The circle source is
the viewer's existing `contacts` / a `GroupRef` (per-topic circles and
regard-as-feeder are a later refinement). The highlight is a render-time
overlay only — it never reorders the structural projection.

## Constraints

- **Reuse the substrate; invent no new module category.** The argument
  organizer is a verb *mode* + a read projection over `Board`/`Entry`/
  `ForumsLogic`/`ForumController`/`forum.yaml`/`ForumView` — not a new
  subsystem. New work lands in the existing `lib/forum/` + `api/forums.ts`
  + `obj/api/ForumsLogic.ts` + `obj/command/social/ForumController.ts`
  surfaces. (See CLAUDE.md "Module Categories — DO NOT INVENT NEW ONES".)
- **No ranking on any shared surface.** The default lens and the stored
  record carry no user-signal ordering; capture attaches only to shared
  surfaces, so the one shared read (the default lens) must stay
  structural. Per-viewer computed lenses are safe but none ship beyond
  the highlight in v1.
- **Persist-then-fire holds.** Structural mutations dual-write through
  `ForumsLogic.recordEvent` exactly like popularity mutations: append the
  durable `forum_events` row, then fire `ForumEventFired` — independent
  siblings, durable-first. New event kinds populate all four dependency
  keys so the subscription index routes.
- **Reuse the subscription observer; do not touch MQL-sub.** Structure
  live-reads ride the existing `ForumSubscriptionRegistry` (an organizer-
  aware branch in the projection path), never `MqlSubscriptionRegistry`.
- **`author` is a durable id, resolved to a name on read** — never a
  frozen byline (the cycle-1 invariant; keeps structure reputation-blind
  and rename-safe).
- **Controllers return `void`; outcomes ride the dispatch envelope.**
  New verbs follow the cycle-1 `ForumController` conventions.
- **The body side-channel is reused unchanged** — a claim body is MML via
  the same three routes (greedy markdown / `fields` / `compose` prompt);
  no command-spec schema change.
- **Audience via `GroupRef` through the Subject**, read-only via
  `GroupApi` — an argument board is a *consumer* of the group substrate,
  identical to a popularity board.

## Acceptance criteria

- `EntryRelation` includes the three typed edges; a `'argument'` board
  rejects a `'reply'` contribution and a `'popularity'` board rejects a
  typed-edge one (tests cover the organizer-scoped vocabulary).
- `forum make … --argument` (and `forum on <subject> --argument`) lights
  an `'argument-forum'` manifestation on a `'argument'` board with a
  `parent: null` prose spine.
- `forum reply <node> --pro|--con|--rebut` attaches an `Entry` with
  `relation` `supports` / `objects-to` / `responds-to` respectively, at
  arbitrary depth (rebuttal = a pro/con whose parent is an argument);
  tests cover each edge and a depth-2 rebuttal.
- The neutral-default-lens projection returns spine + valence-grouped
  children + an **open-objection flag** per node (an `objects-to` with no
  child), computed from relations only — asserted to read no `up`/`down`
  and to carry no stored order; answering an open objection clears its
  flag.
- A vote verb is refused / unafforded on a `'argument'` board.
- The author×circle highlight marks nodes whose author is in the viewer's
  circle, as a per-viewer overlay that does **not** change node order;
  two viewers with different circles see different highlights over the
  identical structural projection.
- Every structural mutation appends exactly one `forum_events` row
  (append-only; no in-place mutation) and the live delta is driven by
  `ForumEventFired` through `ForumSubscriptionRegistry` — MQL-sub /
  inspection-pane tests still pass (registry untouched).
- A claim's body **edits in place**, and the edit appends exactly one
  `'entry-edited'` event **capturing the prior body** (the lossless trail
  — asserted recoverable from the log); the edited claim surfaces with an
  **"edited" marker** and updates live via subscription delta. Re-parent /
  merge / split / delete are not afforded; no edit notification is pushed
  (live delta + marker only).
- The owner maturity verb emits a `mature` `ForumEvent` + `ForumEventFired`
  with the board/subject keys; no consumer is wired (asserted: the event
  fires, nothing binds).
- `ForumView` renders a `'argument'` board in argument mode (chosen by
  `organizer`): a prominent spine, children grouped under *Supporting /
  Objections / Questions* with valence markers, open-objection badges, and
  the circle highlight — fed live by a forum subscription.
- In argument mode the client shows **no vote controls, no score, and no
  popularity sort selectors**; an unanswered objection carries the
  open-objection badge and the badge clears live (via subscription delta)
  when a child is attached to it.
- A node's contribution control offers the **three valence choices** and
  each emits the matching `forum reply --pro|--con|--rebut` command string
  through the shared command-click/preview path (no raw websocket frame);
  the multi-line body rides the existing side-channel.
- The popularity `ForumView` is **unchanged** for `'popularity'` boards
  (the argument mode is additive, organizer-gated); the `ForumChatSidecar`
  works identically in both modes.
- `docs/subsystems/forums.md` is extended (or a sibling
  `argument-map.md` graduates) documenting the argument organizer:
  relation vocabulary, the lens/store split, open-objection, the
  highlight, and the mature seam.

## Cross-references

- [argument-map-slate.md](../slates/builds/argument-map-slate.md) —
  seeding slate (the model, the spine principles, the store/lens split,
  the hard scale problems).
- [forums.md](../subsystems/forums.md) — the cycle-1 substrate this
  builds on: `Board`/`Entry`/`Subject`, `ForumsLogic`, the event log +
  persist-then-fire, `ForumSubscriptionRegistry`, the verb model, the
  body side-channel, the cockpit `ForumView`.
- [cooperative-slate.md](../slates/builds/cooperative-slate.md) §
  *Deliberation* — the governance framing this surface serves
  (three-surface taxonomy, deliberate-as-equals/vote-by-weight, the
  ungameable-organization principle); the deferred vote consumer of the
  `mature` event.
- [chronicle.md](../subsystems/chronicle.md) /
  [belief.md](../subsystems/belief.md) — the "dumb store, smart
  consumers" precedent the relation-store + computed-lens split follows.
- [grouping.md](../subsystems/grouping.md) — the `GroupRef` audience seam
  reused read-only.
- [contacts.md](../subsystems/contacts.md) — the v1 circle source for the
  delegated-attention highlight.
