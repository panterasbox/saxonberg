# Argument-map (forums cycle 2) — implementation plan

This plan executes [argument-map-requirements.md](../requirements/argument-map-requirements.md) against the merged forums cycle-1 substrate ([forums.md](../subsystems/forums.md)). It is **not new storage**: the argument-map is a typed-claim-graph interpretation + verb mode + computed read projection over the same `Board`/`Entry` documents the popularity organizer uses, plus a new argument rendering mode in the existing `ForumView`.

A fresh build agent should read the requirements doc and `docs/subsystems/forums.md` first, then work the waves in order. Every constraint in the requirements' *Key constraints* section threads through every wave: reuse `ForumSubscriptionRegistry` (never touch `MqlSubscriptionRegistry`); persist-then-fire through `ForumsLogic.recordEvent`, populating all four dependency keys; `author` stays a durable id resolved to name on read; controllers return `void`; the body side-channel is reused unchanged; the client builds real `forum …` command strings.

The decomposition is four waves, each independently testable:

1. **Wave 1 — Relation/organizer widening + the contribution verb mode.** Widen `EntryRelation`, rename `'structure'` → `'argument'`, add the organizer-scoped vocabulary enforcement, `forum make/on --argument`, `forum reply --pro|--con|--rebut`, and body-edit. All server, all unit-testable.
2. **Wave 2 — The neutral default lens projection + open-objection + the circle highlight.** A computed read projection (spine + valence-grouped children + open-objection flag), the per-viewer author×circle overlay, organizer-aware branching in `ForumSubscriptionRegistry`, and the wire-shape extensions. Server + types.
3. **Wave 3 — The maturity seam.** The owner `mature` verb emitting a decoupled `mature` `ForumEvent` + `ForumEventFired` with no consumer.
4. **Wave 4 — The client argument rendering mode.** `ForumView` argument mode (organizer-gated, additive), valence-grouped layout, open-objection badge, circle highlight, three-way contribution affordance, maturity action.

---

## Wave 1 — Relation/organizer widening + the contribution verb mode

### Goal

Light the typed-claim-graph store and the contribution surface. After this wave, an `'argument'` board exists with a `parent: null` prose spine, accepts only typed-edge contributions (`supports` / `objects-to` / `responds-to`), rejects `'reply'`, and a popularity board rejects typed edges — all enforced at contribution time. Body-edit lands here too: cycle 1 shipped no edit path (`Entry.editedAt` is reserved-but-unused), so this wave *builds* the minimal one — **edit-in-place on the `Entry`, with the prior body captured in an append-only `'entry-edited'` event** (the lossless trail). No notifications (deferred). See Risks §1.

### Files

**Modify**

- `packages/server/src/mud/lib/forum/Entry.ts` — widen `EntryRelation` from `'reply'` to `'reply' | 'supports' | 'objects-to' | 'responds-to'` (line 27). Add a `getRelation(): EntryRelation` accessor for the inter-stuff contract (today `relation` is read as a field; the lens projection in Wave 2 needs a method surface). Add `editedAt`-stamping support via a `setBody`/`editBody` method (see below). `relation` and `editedAt` are already in `persistentFields` — no schema change.
- `packages/server/src/mud/lib/forum/Board.ts` — rename `BoardOrganizer = 'popularity' | 'structure'` → `'popularity' | 'argument'` (line 22) and update the doc comment (lines 10-13, 37). Clean code+docs rename, **no data migration** (cycle 1 always persists `'popularity'`; no `'structure'` value exists in any stored doc).
- `packages/server/src/mud/lib/forum/ForumEvent.ts` — add the new event kinds to `ForumEventKind` (line 26): `'argument-attached'` (typed-edge contribution) and `'entry-edited'` (body edit). (`'mature'` lands in Wave 3.) Keep `'reply-created'` for popularity replies.
- `packages/server/src/mud/obj/api/ForumsLogic.ts` — the substantive change:
  - Add an off-class `legalRelationsFor(organizer)` helper returning the organizer-scoped vocabulary (`'popularity'` → `['reply']`, `'argument'` → `['supports','objects-to','responds-to']`).
  - Add `createArgumentBoardOnSubject` / extend `makeForum` to mint `organizer: 'argument'` and light the `'argument-forum'` manifestation (the popularity path lights `'popularity-forum'`). Generalize the off-class `buildBoard(subject, opts)` to take an `organizer` + the surface string. `postThread` for an argument board creates the `parent: null` prose spine (no `up`/`down` seeding — see below).
  - Add `attachClaim(actor, parent, relation, body)` — the typed-edge contribution. Validates `relation ∈ legalRelationsFor(parentBoard.organizer)`; rejects otherwise. Builds the `Entry` with `entry.relation = relation`, `parent = parent._id`, **no `seedAuthorVote` / no `up=1`** (argument entries are reputation-blind — never seed a vote). Records an `'argument-attached'` event populating all four dependency keys.
  - Add `editBody(actor, entry, body)` — owner-or-author body edit; **capture the prior body**, re-MML the new body, stamp `editedAt`, save, then record an `'entry-edited'` event whose `data` carries the **prior body** (the lossless trail — recoverable from the append-only log; the grounded source the deferred dedup/summarization LLM consumers read). Edit-in-place on the `Entry`, append-only history in the log. Reused by both organizers.
  - Guard the popularity `reply` path: it must reject when the parent's board is `'argument'` (and conversely `attachClaim` rejects on a `'popularity'` board). Guard `castVote` to **refuse on an `'argument'` board** (the "vote unafforded" acceptance criterion — server half).
  - Add `resolveArgumentBoardByHandle` (or generalize `resolveBoardByHandle` to try both manifestations) so the controller and registry can resolve an argument board by its flat title handle.
- `packages/server/src/mud/api/forums.ts` — forward the new logic methods: `attachClaim`, `editBody`, the argument-board make/resolve. Thin gated statics only.
- `packages/server/src/mud/obj/command/social/ForumController.ts` —
  - `executeMake` / `executeOn`: replace the `argument-deferred` rejection (lines 131-137, 158-164) with the real branch — `model.argument` mints/attaches an argument board.
  - Add a `reply` valence branch: parse `--pro` / `--con` / `--rebut` flags into a relation (`supports` / `objects-to` / `responds-to`). On an argument board, `reply` **requires** exactly one valence flag and routes to `ForumsApi.attachClaim`; on a popularity board the flags are rejected and the bare `reply` routes to `ForumsApi.reply` as today. (Per the *Surface decisions*: `--rebut` = `responds-to`; "rebuttal" depth is a pro/con whose *parent* is itself an argument, which is depth in the tree, not a fourth edge.)
  - Add an `edit` subcommand → `ForumsApi.editBody`.
  - `executeVote`: refuse on an argument board (mirror the server guard with a friendly note).
- `packages/server/src/mud/cmd/social/forum.yaml` —
  - Update the `--argument` flag descriptions on `make`/`on` (drop "deferred; reserved", lines 23-26, 38-41).
  - Add `--pro` / `--con` / `--rebut` boolean options to the `reply` subcommand (fields `pro`/`con`/`rebut`). Keep `body` optional+greedy (dual-source, unchanged).
  - Add an `edit` subcommand (args: `entry` required, `body` optional+greedy — same dual-source shape as `reply`).
- `packages/server/src/mud/lib/forum/__tests__/ForumDocuments.test.ts` — extend with the widened `EntryRelation` + renamed `BoardOrganizer` round-trip assertions.

**Create**

- `packages/server/src/mud/obj/api/__tests__/forums.argument.test.ts` — the wave's behavioral test home (sibling of `forums.test.ts` / `forums.voting.test.ts`).

### Approach

The store shapes already ship the seams: `Entry.relation` and `Board.organizer` are persistent fields, `'argument-forum'` already exists in `SubjectSurface` (`Subject.ts` lines 42-44), and `ForumEvent` already populates four dependency keys. So Wave 1 is mostly *enforcement and routing*, not new persistence.

The organizer-scoped vocabulary is enforced in one place — `attachClaim` and `reply` both consult `legalRelationsFor(board.organizer)` before building the `Entry`. This is the single contribution-time gate the requirements call for; the controller surfaces a friendly rejection note, the logic throws on a programmatic violation (the cycle-1 `reply`-on-locked-thread precedent, `ForumsLogic.ts` lines 165-167).

`makeForum`/`buildBoard` generalize cleanly: the off-class `buildBoard` (lines 482-510) currently hardcodes `organizer = 'popularity'` and the `'popularity-forum'` surface. Parameterize both. The argument spine is just `postThread` with `organizer === 'argument'` semantics: a `parent: null` Entry carrying the thesis prose, but with **no vote seeding** — `seedAuthorVote` and `up = 1` are popularity-only. The cleanest cut is a branch in `postThread` (or a sibling `postSpine`) keyed on the board's organizer.

`castVote` gets an early guard: resolve the entry's board, and if `organizer === 'argument'`, throw. The controller mirrors this so the CLI shows a clean message; the GUI (Wave 4) simply never renders vote controls.

Body-edit: `editBody` captures `entry.body` (the prior text) before mutating, re-runs `Mml.markdownToMml` (the cycle-1 body discipline, `ForumsLogic.ts` line 142) on the new body, stamps `editedAt = new Date()`, saves, and records an `'entry-edited'` event **carrying the prior body in `data`** so the trail is lossless and the live delta fires. Authorization: the entry's `author` or the board-subject's owner. This is generic across both organizers (the requirements scope edit to body-only for argument; popularity inherits it for free). **No edit notification is pushed** — the requirements defer the whole notification/inbox concern (there is none today; `follow` is passive); v1 edits surface through the live subscription delta + the `editedAt` "edited" marker only, and the away-case is covered durably by the `'entry-edited'` log row feeding the deferred diff-lens.

The `--rebut` → `responds-to` mapping is the one place to be careful: `responds-to` is the *neutral* edge (questions/clarifications). The requirements name the verb `--rebut` but the edge is `responds-to`; "rebuttal" proper is a `supports`/`objects-to` whose parent is itself an argument (depth-2). The controller maps the three flags to the three edges; the depth-2 rebuttal is exercised by attaching a `--con` to a node that is itself a `--pro` child.

### Tests

Mapped to acceptance criteria:

- `EntryRelation` includes the three typed edges; `BoardOrganizer` is `'popularity' | 'argument'` — round-trips through `ForumDocuments.test.ts`.
- An `'argument'` board **rejects** a `'reply'` contribution; a `'popularity'` board **rejects** a typed-edge contribution (organizer-scoped vocabulary, both directions).
- `forum make … --argument` and `forum on <subject> --argument` light an `'argument-forum'` manifestation on an `'argument'` board with a `parent: null` prose spine.
- `forum reply <node> --pro|--con|--rebut` attaches an `Entry` with relation `supports` / `objects-to` / `responds-to` respectively, at arbitrary depth; cover each edge **and a depth-2 rebuttal** (a `--con` under a `--pro`).
- A vote verb is **refused** on an `'argument'` board (server guard + controller note).
- A claim's body **edits in place** (the `Entry.body` mutates, `editedAt` stamped) and the edit appends exactly one `'entry-edited'` event whose `data` **carries the prior body** — the lossless trail, asserted recoverable from the log. No edit notification is pushed (no notification side-effect). Re-parent / merge / split / delete are not afforded (no such verb exists).
- Every contribution + edit appends exactly **one** `forum_events` row (append-only) with all four dependency keys populated.

### Exit criteria

- `pnpm --filter server test` green for the forum suites.
- `pnpm --filter server build` clean (the `BoardOrganizer` rename and `EntryRelation` widening compile across all consumers — grep for `'structure'` returns zero hits in `packages/server/src`).
- `forum make X --argument`, `forum reply <node> --pro`, `forum edit <node>` all dispatch end-to-end against a test world.
- No new module category, no free-floating exported helper (all logic lands in `ForumsLogic` off-class helpers or `ForumsApi` statics).

---

## Wave 2 — The neutral default lens projection + open-objection + the circle highlight

### Goal

A viewer-agnostic structural read projection — spine, valence-grouped children, an **open-objection flag** per node, depth — computed on read from pure relations, asserted to read no `up`/`down` and to carry no stored display-order. Plus the per-viewer, non-reordering author×circle highlight overlay. Both ride the existing `ForumSubscriptionRegistry` via an **organizer-aware branch in the projection path** — `MqlSubscriptionRegistry` is untouched.

### Files

**Modify**

- `packages/types/src/index.ts` — extend `ForumEntryRecord` (lines 766-789) additively with argument-mode fields, all optional so the popularity projection is byte-identical when they're absent:
  - `relation?: 'reply' | 'supports' | 'objects-to' | 'responds-to'` — the edge (drives the valence marker + grouping).
  - `openObjection?: boolean` — true on an `objects-to` with no answering child.
  - `inCircle?: boolean` — the per-viewer highlight flag (resolved against the viewer's circle at projection time).
  - `editedAt?` — the edit stamp, projected from `Entry.editedAt` (add to `projectEntry` if not already on the wire), so the client can render the **"edited" marker**. A `'entry-edited'` event re-resolves the scope; `recordsEqual` must compare `editedAt`/`body` so the marker + revised text update live.
  - Add `'argument'` to the `ForumSubscriptionScope` documentation (the scope kinds are unchanged — an argument board is still watched as a `board` scope and its spine+tree as a `thread` scope; the organizer drives the *projection shape*, not the scope kind).
- `packages/server/src/mud/obj/ForumSubscriptionRegistry.ts` — the load-bearing change:
  - `projectScope` (lines 232-253) branches on the resolved board's `organizer`. For `'argument'`, route through a new `ForumsApi.readArgumentLens(board|root, viewer)` instead of `readBoard`/`readThread` + `projectEntries`. The scope-kind plumbing (index/board/thread, the dependency index, the dirty-batch, `diffRecords`) is **entirely reused** — only the per-scope projection function changes.
  - `projectEntry` (lines 267-288) gains the argument fields when the source entry belongs to an argument board: `relation`, `openObjection`, `inCircle`. The popularity projection leaves them `undefined`.
  - `recordsEqual` (lines 528-539) compares the new fields so a delta fires when an open-objection clears (a child attaches to a previously-open objection → the parent's `openObjection` flips false → `replace` op) or a highlight changes. **This is what makes the badge clear live.**
  - Author-name resolution (`resolveAuthorNames`, lines 434-459) is reused unchanged — `author` stays a durable id resolved on read.
- `packages/server/src/mud/obj/api/ForumsLogic.ts` —
  - Add `readArgumentLens(board, viewer)` and `readArgumentThread(root, viewer)` — the computed lens. Walk the entry tree (reuse the `readThread` descendant-collection logic, lines 271-287, but **sort structurally / chronologically, never by score**), compute per-node `openObjection` (an `objects-to` entry with no children of its own), and group children by valence on read. **Reads no `up`/`down`.** No stored order field is touched.
  - Add the per-viewer circle resolution: given the viewer, resolve their circle membership and stamp `inCircle` per node from `Entry.author ∈ circle`. The circle source is the viewer's `contacts` — resolve via `GroupApi.isMember(authorPlayerId, 'contacts:<viewerPlayerId>:<label>')` or `GroupApi.membersOf` for a batch check. This is a **render-time overlay**: it sets a flag, never reorders.
  - The `openObjection` computation lives **on the logic singleton** (in `readArgumentLens`), not in the registry — the registry stays a generic re-resolve/diff observer; the organizer semantics live with the rest of the forum logic. (See Risks for the recommendation.)
- `packages/server/src/mud/api/forums.ts` — forward `readArgumentLens` / `readArgumentThread`.

**Create**

- `packages/server/src/mud/obj/api/__tests__/forums.lens.test.ts` — the lens + open-objection + highlight tests.
- Extend `packages/server/src/mud/obj/__tests__/ForumSubscriptionRegistry.test.ts` — the live-delta-clears-the-badge test + the two-viewers-different-highlight test.

### Approach

The lens is the requirements' "dumb store, smart consumers" idiom: nothing is welded onto the `Entry`. `readArgumentLens` re-reads the current-state `Entry` docs (exactly as `readThread` does today, `ForumsLogic.ts` lines 271-287) and derives everything. The spine is the `parent: null` root; children are grouped by `relation` into Supporting (`supports`) / Objections (`objects-to`) / Questions (`responds-to`); `openObjection` is `relation === 'objects-to' && childrenOf(node).length === 0`. "Answering" an objection = attaching *any* child to it (the requirements: "the only way to clear it is to answer it"). Because the registry re-resolves the whole scope on every `ForumEventFired` and `diffRecords` keys on id + compares `openObjection`, attaching a child fires a `replace` for the now-answered objection, clearing the badge live — no extra event plumbing.

The organizer-aware branch is the surgical reuse the constraints demand. `ForumSubscriptionRegistry.projectScope` already re-reads the board (`getBoard`, line 244) — so it already has the `organizer` in hand. The branch is one `if (board.getOrganizer() === 'argument')` that swaps the projection function. The dependency index (`byBoard`/`byThread`/`indexSubs`), `routeFire`, `markDirty`/`drainDirty`, and `diffRecords` are all organizer-agnostic and reused verbatim. `MqlSubscriptionRegistry` is never imported or touched.

The circle highlight is per-viewer, so it must be computed inside the projection (the registry projects per-viewer already — `projectScope(scope, viewer)`, line 233 — so two subscriptions for two viewers over the same board naturally produce different `inCircle` stamps over the *identical* structural records). The signal is `Entry.author` (a durable playerId) ∈ the viewer's `contacts` circle. Resolving via `GroupApi` (`contacts:<viewerPlayerId>:<label>` ref, the `ContactsGroupProvider` shape) keeps the subject-as-consumer-of-group-substrate discipline and reuses the read-only audience seam. Batch the membership check once per projection (mirror `resolveAuthorNames`' batched-lookup pattern, not per-node).

### Tests

Mapped to acceptance criteria:

- The lens returns spine + valence-grouped children + an open-objection flag per node, computed from relations only — **assert it reads no `up`/`down`** (e.g. set `entry.up`/`down` to garbage and confirm the lens output is unaffected) and carries no stored order field.
- Answering an open objection (attaching any child) **clears its flag** — both in a direct `readArgumentLens` call and **live via a subscription delta** (the `recordsEqual` `replace` path).
- The author×circle highlight marks nodes whose author is in the viewer's circle, as a per-viewer overlay that does **not** change node order; **two viewers with different circles see different highlights over the identical structural projection**.
- A structural mutation drives the live delta through `ForumSubscriptionRegistry` (`ForumEventFired`); the existing MQL-sub / inspection-pane tests still pass (registry diff/route untouched for popularity).

### Exit criteria

- `pnpm --filter server test` green, including the untouched `MqlSubscriptionRegistry` suite (no-regression structurally trivial — proven by the suite passing).
- `pnpm --filter types build` clean (additive `ForumEntryRecord` fields).
- A subscription opened on an argument board emits a structural result frame; a follow-up contribution emits a delta that flips an `openObjection`.
- The lens projection never reads `getScore()`/`up`/`down` (grep the new code paths).

---

## Wave 3 — The maturity seam

### Goal

The subject owner runs an explicit verb emitting a decoupled `mature` `ForumEvent` + `ForumEventFired` carrying the board/subject keys, with **no consumer** wired. This is the reserved handoff to the deferred vote layer.

### Files

**Modify**

- `packages/server/src/mud/lib/forum/ForumEvent.ts` — add `'mature'` to `ForumEventKind` (line 26).
- `packages/server/src/mud/obj/api/ForumsLogic.ts` — add `matureArgument(actor, board)`: owner-gated (the board-subject's owner); records a `'mature'` event via the off-class `recordEvent` helper, populating all four dependency keys (`subject`, `board`, `thread` = the spine root's `_id`, `entry` = spine root). Persist-then-fire holds (the durable row lands, then `ForumEventFired` fires). **No consumer** — the event fires into the bus and the existing `ForumSubscriptionRegistry.routeFire` will mark the board's subscriptions dirty (a harmless re-resolve; the lens may surface a `matured` state later, but v1 wires nothing that *binds* the event).
- `packages/server/src/mud/api/forums.ts` — forward `matureArgument`.
- `packages/server/src/mud/obj/command/social/ForumController.ts` — add a `mature` subcommand → `ForumsApi.matureArgument`, owner-gated (reuse the `ownsSubject` helper, lines 385-390), refused on a popularity board.
- `packages/server/src/mud/cmd/social/forum.yaml` — add a `mature` subcommand (arg: `board` required).
- `packages/server/src/mud/obj/api/__tests__/forums.argument.test.ts` — extend with the maturity tests.

### Approach

This is the smallest wave: one new event kind, one gated logic method, one verb. The decoupling is the point — `matureArgument` does exactly what `recordEvent` does for every other mutation (`ForumsLogic.ts` lines 351-367), and stops. The test asserts the event *fires* (an `EventApi` listener catches one `ForumEventFired` with `kind === 'mature'` and the right keys) and that **nothing binds** it (no measure/vote/docket side-effect; the board is unchanged but for the new log row).

Owner gate: the requirements say "the subject owner runs an explicit verb." Resolve the board's subject, check `subject.getOwner() === actorPlayerId` (the `ownsSubject` precedent). A non-owner is refused with a controller note.

### Verb-spelling recommendation

The requirements leave the verb's exact spelling open. Recommend `forum mature <board>` — it matches the event kind (`'mature'`), reads as an owner action ("mature this deliberation"), and avoids overloading `close`/`lock` (which carry popularity/thread-lock connotations from cycle 1's `thread-locked` kind). Avoid `forum close` (collides with the deferred archive cascade's "close a deliberation" framing, which the cooperative build owns).

### Tests

- `forum mature <board>` emits exactly one `'mature'` `ForumEvent` row + one `ForumEventFired`, with `subject`/`board`/`thread`/`entry` populated.
- The event has **no consumer**: assert the fire happens and no measure/vote document is created and the board is otherwise unchanged.
- A non-owner is refused; the verb is refused on a popularity board.

### Exit criteria

- `pnpm --filter server test` green.
- `forum mature <board>` dispatches and the durable row lands before the fire (persist-then-fire, provable by the durable row being findable inside the `ForumEventFired` listener).

---

## Wave 4 — The client argument rendering mode

### Goal

`ForumView` gains an argument rendering mode chosen by the board's `organizer`, additive and organizer-gated so the popularity view is unchanged. It renders the neutral default lens live (reusing the three existing subscriptions): a prominent spine, children grouped under Supporting / Objections / Questions with +/−/? markers, open-objection badges, the circle highlight, the three-way contribution affordance building `forum reply --pro|--con|--rebut`, and the owner's maturity action. No vote controls, no scores, no popularity sort selectors. Reuses the body side-channel + `compose` discipline and the `ForumChatSidecar` unchanged.

### Files

**Modify**

- `packages/client/src/components/ForumView.tsx` — the contained reshaping:
  - Detect organizer mode from the live records. The index/board projection now carries the board's organizer; the simplest signal is a per-board `organizer` field on the index `ForumEntryRecord` (add to `projectBoard` in Wave 2) **or** infer from the presence of `relation` on the records. **Recommendation:** add an optional `organizer?: 'popularity' | 'argument'` to `ForumEntryRecord` and stamp it in `projectBoard` + `projectEntry`, so the client gates explicitly rather than inferring. (Fold this into Wave 2's types change.)
  - When `organizer === 'argument'`, render an `ArgumentTree` branch instead of the popularity thread-list/post-tree branch (lines 585-669). The recursive nesting reuses the existing `buildChildren` grouping (lines 377-389) but groups a node's children by `relation` into three sub-lists under *Supporting* / *Objections* / *Questions* headings, each node carrying a `+` / `−` / `?` marker. The spine (the `parent: null` root) renders prominently at the top as the proposal/thesis.
  - **Remove** in argument mode: `VoteControls` (lines 277-311 — not rendered), the `sort` `Select` (lines 593-601 — no ranked order), the `scoreText` display.
  - **Add** in argument mode: an open-objection badge on any node with `openObjection === true`; a circle-highlight marker (a non-reordering visual treatment) on `inCircle === true` nodes; an **"edited" marker** on any node with `editedAt` set (history is not inlined — the diff-lens is deferred); the owner maturity action (a button previewing/sending `forum mature <boardHandle>`). A node's `edit` affordance (author/owner) builds a `forum edit <node>` command string with the body on the side-channel.
  - The contribution affordance becomes a three-way valence choice (*add support* / *add objection* / *ask*), each building the matching `forum reply <node> --pro|--con|--rebut` command string and carrying the multi-line body on the existing `fields` side-channel via `replyForumEntry`-style helpers. Every click routes through the shared `onCommandClick` / `onCommandPreview` handlers (the `hoverPreview` discipline, lines 224-229) — never a raw websocket frame.
  - Keep the popularity branch byte-for-byte unchanged (the mode is a top-level fork inside the component).
- `packages/client/src/store/forumActions.ts` — add valence-aware contribution helpers: `attachArgumentClaim(nodeId, valence, body)` building `forum reply <nodeId> --pro|--con|--rebut` with the body on the side-channel (mirror `replyForumEntry`, lines 79-81), and `matureArgument(boardHandle)` sending `forum mature <boardHandle>`. The subscription wiring (`subscribeForumScope` / `applyForumResult` / `applyForumDelta`) is reused unchanged — the same three scopes carry the argument records.
- `packages/client/src/store/index.ts` — no slice change needed if organizer is read off the records; the `forumRecords` / `forumNav` slice stays pure state. (Confirm: the argument mode adds no bus-borne UI state — mode is derived from data, compose drafts stay React state, per the client-owns-UI-state rule.)
- `packages/client/src/store/__tests__/forumStore.test.ts` — extend with argument-record delta application (the badge-clear delta updates the record set; the highlight flag flips).

**Create**

- (Optional) `packages/client/src/components/__tests__/ForumView.argument.test.tsx` if the client test harness supports component tests; otherwise the acceptance is exercised through `forumStore.test.ts` + manual verification.

### Approach

The requirements are explicit that this is "not the popularity view with edge labels bolted on" but "a real (if contained) reshaping." The cleanest structure is a top-level organizer fork inside `ForumView`: the popularity render path (lines 541-672) is untouched; an argument path renders the spine + valence-grouped recursive tree. `CommentNode` (lines 402-462) is the precedent for the recursive renderer — the argument node renderer is its sibling: same recursion, but no `VoteControls`, children grouped by `relation`, valence marker + open-objection badge + circle highlight added.

The live-update story is free: the three subscriptions (`index`/`board`/`thread`, lines 482-512) carry the argument records the same way; a contribution delta or a badge-clear delta flows through `applyForumDelta` (`store/index.ts` lines 906-924) into the record set, and React re-renders. The badge clears live because Wave 2's `recordsEqual` fires the `replace`.

Every affordance is a real command string through the shared handlers — the vote-click discipline (`hoverPreview`, `onCommandClick`/`onCommandPreview`) carries over directly to the three valence buttons and the maturity button. The body rides the `fields` side-channel exactly as `replyForumEntry` does (lines 79-81) — no command-spec change, the `compose` prompt remains available for the CLI path.

`ForumChatSidecar` is reused unchanged (board-scoped, as in cycle 1) — verify it works identically in argument mode (it keys on the board handle, organizer-agnostic).

### Tests

Mapped to acceptance criteria:

- `ForumView` renders an `'argument'` board in argument mode (chosen by `organizer`): a prominent spine, children grouped under *Supporting* / *Objections* / *Questions* with valence markers, open-objection badges, circle highlight — fed live by a forum subscription.
- In argument mode the client shows **no vote controls, no score, no popularity sort selectors**; an unanswered objection carries the badge and **the badge clears live** (via subscription delta) when a child is attached.
- A node's contribution control offers the **three valence choices**, each emitting the matching `forum reply --pro|--con|--rebut` string through the shared command-click/preview path (no raw frame); the multi-line body rides the side-channel.
- The popularity `ForumView` is **unchanged** for `'popularity'` boards (the argument mode is additive, organizer-gated); the `ForumChatSidecar` works identically in both modes.

### Exit criteria

- `pnpm --filter client test` green; `pnpm --filter client build` clean.
- Manual: an argument board renders the lens, a `--pro`/`--con`/`--ask` contribution previews the right command on hover and sends it on click, an open-objection badge clears live when answered, two browser sessions with different contacts see different highlights, and a popularity board renders exactly as before.
- No raw websocket frames from the GUI (every action is a `forum …` string through `onCommandClick`/`sendCommand`).

---

## Risks / open implementation questions

1. **Edit path — RESOLVED (build the minimal one).** Cycle 1 shipped no edit verb or `editBody` method (`Entry.editedAt` is a declared-but-unused reserved field; grep confirms zero edit code). The requirements (Surface decisions § *Editing*) settle this: Wave 1 **builds** the minimal body-edit path — `ForumsLogic.editBody` (edit-in-place, capturing the prior body into the `'entry-edited'` event for a lossless trail) + a `forum edit` verb + the event kind — shared by both organizers. The model is explicitly **edit-in-place on the `Entry`, append-only history in `forum_events`**; the log is the grounded source the deferred LLM dedup/summarization reads, so it is never compacted. **Notifications and response version-anchoring are out of scope** (deferred to a cross-cutting notifications build / proposal version-control respectively); v1 surfaces edits via the live delta + an "edited" marker only.

2. **Where the open-objection computation lives.** Options: (a) in `ForumSubscriptionRegistry` during projection, or (b) in `ForumsLogic.readArgumentLens`. **Recommendation: (b) — the logic singleton.** The registry must stay a generic re-resolve/diff observer (forums.md is emphatic it's instance #1 of a latent generic abstraction, kept clean). Organizer semantics (valence grouping, open-objection, the lens shape) belong with the forum logic; the registry just re-reads whatever the lens returns and diffs it. The registry's only argument-awareness is the one-line `if organizer === 'argument'` branch choosing which projection function to call.

3. **How the organizer-aware projection branches.** **Recommendation:** branch in `ForumSubscriptionRegistry.projectScope` (which already resolves the board and thus has `organizer` in hand) on `board.getOrganizer()`, swapping the projection function (`readBoard`/`readThread` → `readArgumentLens`/`readArgumentThread`). Scope *kinds* (index/board/thread) and the entire dependency-index/dirty-batch/diff machinery are unchanged. This is the surgically minimal touch that satisfies "reuse the observer, never touch MQL-sub."

4. **The maturity verb spelling.** Open. **Recommendation: `forum mature <board>`** (matches the `'mature'` event kind; avoids colliding with `lock`/`close`/the deferred archive cascade). See Wave 3.

5. **Circle source resolution cost.** The per-viewer `inCircle` stamp resolves the viewer's `contacts` circle on every projection. **Recommendation:** batch the membership check once per projection (resolve the viewer's contact playerIds once, then set-test each node's author), mirroring `resolveAuthorNames`' batched pattern — not a per-node `GroupApi.isMember` call. The requirements name `contacts` / a `GroupRef` as the v1 source; resolve the `contacts:<viewerPlayerId>:<label>` ref (or all the viewer's contact labels) read-only via `GroupApi`. Per-topic circles and regard-as-feeder are explicitly deferred.

6. **`organizer` on the wire for client gating.** The client needs to know a board's organizer to pick the render mode. **Recommendation:** add an optional `organizer?` field to `ForumEntryRecord`, stamped in `projectBoard` (index rows) and `projectEntry` (entry rows), folded into Wave 2's additive types change. This makes the client gate explicit rather than inferring from the presence of `relation`. Keeps the popularity projection byte-identical when the field is absent (older flows) but always present going forward.

7. **`resolveBoardByHandle` is popularity-only today** (`ForumsLogic.ts` lines 98-99 hardcode the `'popularity-forum'` manifestation). It must learn to resolve `'argument-forum'`. **Recommendation:** generalize to try both manifestations (an owned subject lights at most one forum surface in v1 practice, but a subject *could* hold both organizers per forums.md — so resolve by handle to whichever forum manifestation exists, or prefer the one matching a passed organizer hint). The registry's `normalizeScope` (lines 175-196) calls `resolveBoardByHandle` and must work for argument boards too.

8. **Open-objection on the spine root.** The spine is `parent: null` and has no `relation` — it is never itself an open objection. Confirm the lens never flags the root; only `objects-to` nodes are candidates.

9. **No `up`/`down` on argument entries, but the field still exists.** Argument entries are created without vote seeding (Wave 1) so `up`/`down` stay `0`. The lens must never read them; the GUI never renders them. The `ForumEntryRecord` vote fields remain on the wire (popularity uses them) but are inert for argument records — the client's argument branch simply ignores them.

---

## Inter-wave dependencies

- **Wave 1 is foundational.** The widened `EntryRelation`, the renamed `BoardOrganizer`, the `attachClaim` contribution path, and the argument-board mint must land before anything can project or render an argument graph. Independently testable via the logic/controller suites with no client or subscription work.

- **Wave 2 depends on Wave 1** (it projects the typed-edge graph Wave 1 produces) and on the additive `ForumEntryRecord` types change (which it owns). It is testable through `ForumsLogic.readArgumentLens` directly plus the registry delta tests, with no client. Wave 2 also lands the `organizer?` wire field (Risk 6) that Wave 4 gates on.

- **Wave 3 depends on Wave 1** (the argument board + owner gate) only. It is independent of Wave 2's lens — the `mature` event is a decoupled emit. It can be built and tested in parallel with Wave 2 if desired, but is sequenced after for a clean event-kind progression in `ForumEventKind`.

- **Wave 4 depends on Waves 1, 2, and 3.** It consumes Wave 2's projected records (relation/openObjection/inCircle/organizer fields), Wave 1's `forum reply --pro|--con|--rebut` + `forum edit` verbs (the command strings it builds), and Wave 3's `forum mature` (the maturity action). It is the only client wave and must come last.

- **Cross-cutting:** the `ForumEntryRecord` extension is owned by Wave 2 but consumed by Wave 4; build it once, additively, in Wave 2. The `ForumEventKind` additions are spread across Waves 1 (`argument-attached`, `entry-edited`) and 3 (`mature`) — each wave adds its own kind. `MqlSubscriptionRegistry` is touched by no wave; its passing suite is the no-regression proof at every exit.

---

### Critical files for implementation

- `packages/server/src/mud/obj/api/ForumsLogic.ts` — relation/organizer enforcement, `attachClaim`, `editBody`, `readArgumentLens` (open-objection + circle), `matureArgument`.
- `packages/server/src/mud/obj/ForumSubscriptionRegistry.ts` — the organizer-aware projection branch (the one place the registry learns about argument mode; `projectScope`/`projectEntry`/`recordsEqual`).
- `packages/server/src/mud/obj/command/social/ForumController.ts` + `packages/server/src/mud/cmd/social/forum.yaml` — `--argument`, `reply --pro|--con|--rebut`, `edit`, `mature` verbs.
- `packages/types/src/index.ts` — additive `ForumEntryRecord` fields (`relation`, `openObjection`, `inCircle`, `organizer`).
- `packages/client/src/components/ForumView.tsx` — the organizer-gated argument rendering mode (the UX delta).
