# Social surface (client rebuild, Wave 6) — implementation plan

Executes [social-surface-requirements.md](../requirements/social-surface-requirements.md).
Read that first; it holds the scope decisions and the non-goals, and this
plan does not re-argue them.

**Shape of the work.** Six phases, in order. Phases 1–4 are the three
surfaces plus the wiki; each is independently shippable and can be
committed on its own. Phase 5 is the `cockpit.layout` retirement and
**must be last** — it deletes the frame the earlier phases are built
against. Phase 6 is docs + acceptance.

Each phase names its server half first (there is one in three of the
four), then its client half, then its tests.

⚠ **Run `pnpm test:near` in the loop and `pnpm test` once, before the
MR.** See [testing.md](../testing.md).

---

## Grounding — facts established by investigation

Everything below was checked against the tree, not inferred from docs.
The plan depends on these; if one turns out false at build time, stop and
re-check rather than working around it.

### The wire already carries more than the client uses

| Fact | Where |
|---|---|
| `ForumEntryRecord` already ships `organizer`, `relation` and `openObjection` per record — the argument lens is **live on the wire** and computed from relations only, never from votes | `packages/types/src/index.ts` ~1543 |
| `ForumSubscriptionScope.kind` is `'index' \| 'board' \| 'thread'` — there is **no subject scope** | same, ~1537 |
| Reaction state (`ReactionBucket`, `ReactionActState`, familiar-biased `sample`, `ReactionExpandMessage`) is fully modelled and fully wired | same, ~1635–1721 |
| `WatchTarget` covers Twitch, YouTube (videoId **and** channelId) and **Kick**, and `StreamEmbed` renders all three | types ~2715; `packages/client/src/components/embed/StreamEmbed.tsx:82,94,110` |
| `ConnectionEstablishedPayload` already carries a cached authored catalogue (`topicCatalogue`) with "client caches for the session, edits land at next login" semantics | types ~2760; composed at `packages/server/src/mud/obj/Avatar.ts:873` |
| `clientState` keys shipped: `cockpit.mode`, `cockpit.arrangements`, `cockpit.savedArrangements`, `cockpit.watch`, `cockpit.shelf`, `cockpit.inputModes`, `cockpit.layout` — **no `cockpit.tuned`** | `packages/server/src/mud/lib/connection/HasInteractive.ts:261–545` |
| `cockpit.mode` defaults to `null`, deliberately, so `getCockpitMode()` can migrate a legacy `cockpit.layout` instead of silently answering `play` | same, :379 |

### The client is behind its own server

| Fact | Where |
|---|---|
| The reaction quick palette is a **hardcoded six-entry `QUICK` array** with hardcoded emoji | `packages/client/src/components/ReactionBar.tsx:58` |
| `REACTABLE_PREFIXES` is `["speech.", "act.emote", "speech.channel"]` — **omits `act.combat`**, which the server treats as reactable | `ReactionBar.tsx:32` vs `packages/server/src/mud/api/reaction.ts:39` |
| `REACTABLE_TOPICS` contains `'speech.vocal'` **three times** (S2 collapse leftover); the client's livestream `CHAT_TOPICS` has the same duplication with `'speech.relay'` | `api/reaction.ts:40-42`; `packages/client/src/layouts/LivestreamPanes.tsx:25` |
| `packages/client` has **zero references** to `argument-forum` / `popularity-forum` / `free-chat` / `rules-chat`; `ForumView.tsx` (928 lines) is Board→Thread→Post only | grep across `packages/client/src` |
| `App.tsx` renders `LAYOUT_REGISTRY[clientState["cockpit.layout"]]` | `packages/client/src/App.tsx:321,764` |
| `ViewsMenu` **already sends** `cockpit mode <mode> <arrangement>` and reads `LEGACY_LAYOUT_MIGRATION` — the menu is migrated, the frame is not | `packages/client/src/components/ViewsMenu.tsx:11,171` |
| `Terminal.tsx` mounts `ReactionBar` per row and is used by **both** form factors (mobile differs in frame chrome and play-surface panes, not the transcript) | `Terminal.tsx:121`; `WorldLayout.tsx:270` |
| `StreamEmbed`'s header comment says "Both platforms are wired" above a **three**-platform switch | `StreamEmbed.tsx:8` |

### The server model the forum client has to catch up to

- A **Subject** is one record: identity + audience + the surfaces it
  lights up, at most one of each of four
  ([forums.md](../subsystems/forums.md) § The four surfaces).
- Shipped: `popularity-forum` (cycle 1), `argument-forum` (cycle 2),
  `free-chat`. **Parked: `rules-chat`.** ⚠ The mock badges *Argument* as
  `reserved` — **the mock is stale**; cycle 2 shipped it. Build it live.
- Grain: **venue** (board-grain, flat-global handle) vs **topic**
  (promoted thread, board-scoped `parent/name`, inherits the parent's
  audience).
- Audience: open / bound to an existing ref / curated (a managed group
  minted alongside).
- Lighting a surface up is `forum on <subject> [--argument]` and
  `chat on <subject> [--rules]` (`packages/server/src/mud/cmd/social/forum.yaml:59`,
  `chat.yaml:84`).
- `subject list` exists but returns **prose**, and
  `SubjectCatalogue.visibleSubjects(actor)` is the per-viewer filter.

### Emote grammar

`EmoteGrammar = { slots: Record<string, EmoteSlot>, template: string }`,
`SlotKind = 'stuff' | 'free'`, slot order is insertion order
(`packages/server/src/mud/lib/social/EmoteGrammar.ts:32-47`). `EmoteSpec`
carries `verb`, `aliases`, `grammar`, `emoji`, `tags`, `valence`
(`packages/server/src/mud/obj/SoulCatalogue.ts:45`). `soul list` exists
but is gated `requiresCoreAccess` — it is the *authoring* face.

---

## Decisions

### D1 — The emote catalogue rides `ConnectionEstablishedPayload`

Not a REST route, not a new WS envelope. `topicCatalogue` is the exact
precedent sitting in the same payload: authored reference data, global,
cached for the session, mid-session edits landing at next login. Adding
`emoteCatalogue` beside it costs zero new transport and inherits
semantics that are already documented and already understood by the
client store.

Rejected: a `/api/emotes` REST route on the `HelpRoutes` pattern. It
works, but it buys a second transport and a fetch lifecycle for data that
is smaller than the topic catalogue already shipped on connect.

### D2 — The picker composes the explicit `--msg` selector

`re ;nod` is a real command but means *the most recent act in view*. A
picker opened on message 112 must send `react --msg 112 ;nod`. The
preview string and the sent string are produced by **one function** and a
test asserts **their equality**, never the literal string twice — two
copies of one sentence is how a second renderer lies while every
per-state test passes. This is also the interaction the slate says the
command-line axiom binds hardest on.

### D3 — Forum subjects get a fourth subscription scope

`ForumSubscriptionScope.kind` gains `'subjects'`. It reuses the whole
existing document-change observer — registry, dependency index, delta
envelope, error envelope — rather than inventing a channel. The rail is
live for the same reason board and thread lists are.

Rejected: a REST read. The rail must update when somebody lights a
surface up, and the observer already does exactly that job.

### D4 — Wiki is a second arrangement of `chat` mode

The mode vocabulary is closed and shipped. `watch` already carries two
arrangements (`viewer`, `streamer`), so `chat` carrying `forums` + `wiki`
is the existing pattern, not a new axis.

### D5 — These surfaces do NOT ride the MQL pane catalogue

`Panes.ts` serves MQL over **Stuff**. Forum subjects are Documents, the
wiki page arrives on `world.wiki.page`, stream state is its own envelope.
An arrangement in `chat` or `watch` selects a **composition of
components**, not a pane set. `SHIPPED_ARRANGEMENT_PANES` stays empty for
those modes — which is what its own comment already says it is for.

Consequence: `SHIPPED_ARRANGEMENT_PANES` still needs re-keying to
`Record<CockpitMode, Record<string, readonly PaneId[]>>` so `watch`'s two
arrangements are expressible, but nothing in this build fills them.

### D6 — Standby is the streamer's state, not the viewer's

`StreamStateSnapshot` is served to `service:broadcast` connections (OBS
browser sources) — it is the overlay's state. A **viewer** watching an
external Twitch channel cannot be told by Saxonberg whether that channel
is on standby; that is inside the iframe and is Twitch's business.

So the standby overlay belongs to the **`streamer` arrangement**, where
`stream away 15m` is the operator's own control and the state is theirs.
The `viewer` arrangement gets no standby treatment, because inventing one
would be a fabricated figure about somebody else's stream. ⚠ The mock
shows the Live/Standby toggle in a screen headed *WATCH*; treat that as a
mock demo control, not a viewer feature.

### D7 — `rules-chat` renders as parked, not as an affordance

It is in the vocabulary and it is not built. The unlit-surface control
for it renders in the not-wired treatment and does not send a command —
`chat on --rules` describes itself as "deferred; reserved" in its own
spec, and a control that reliably refuses is worse than one that says so.

---

## Phase 1 — Reactions and the emote picker

### Server

**`packages/types/src/index.ts`**
- Add `EmoteCatalogueEntry`: `{ verb: string; emoji?: string; aliases?: string[]; tags?: string[]; slots: EmoteSlotSpec[] }` where
  `EmoteSlotSpec = { name: string; kind: 'stuff' | 'free'; required: boolean }`, in declaration order.
- Add `emoteCatalogue: EmoteCatalogueEntry[]` to `ConnectionEstablishedPayload`, documented like `topicCatalogue` (session cache; edits land at next login).

**`packages/server/src/mud/obj/SoulCatalogue.ts`**
- Add `getSnapshot(): EmoteCatalogueEntry[]` — projects the warm cache to
  the wire shape. **Canonical verbs only** (skip alias keys, which map to
  the same `Emote`); the aliases ride their record's `aliases` field.
  Mirror `TopicCatalogue.getSnapshot()`'s shape and gating.

**`packages/server/src/mud/api/soul.ts`**
- Add `SoulApi.snapshot()` forwarding to the logic singleton. Player-
  readable: no `requiresCoreAccess`. This is the read face; `soul list`
  stays the author face.

**`packages/server/src/mud/obj/Avatar.ts` (~873)**
- Add `emoteCatalogue: await SoulApi.snapshot()` beside `topicCatalogue`.

**`packages/server/src/mud/api/reaction.ts` (~39)**
- Remove the two duplicate `'speech.vocal'` entries. Add a comment naming
  the S2 collapse so the next reader doesn't re-add them.

### Client

**`packages/client/src/store/index.ts`**
- `emoteCatalogue: Map<string, EmoteCatalogueEntry>` keyed by verb,
  populated at connection-established beside `topicCatalogue` (~1435).

**`packages/client/src/components/ReactionBar.tsx`**
- **Delete `QUICK`.** The quick row derives from the catalogue: emoji-
  bearing entries, ordered by the player's own recent use where that is
  known, else catalogue order, capped at six.
- Fix `REACTABLE_PREFIXES` → derive from a single exported constant that
  mirrors the server set including `act.combat`. Better: ship the server
  set on the connection payload too, so the client cannot drift again —
  do this if it is a one-line addition, otherwise leave a test that
  asserts the two lists match.
- A non-reactable frame renders no `+` at all (the mock's `not reactable`
  chip is design commentary, not product furniture — do not build it).

**New: `packages/client/src/components/social/EmotePicker.tsx`**
- Inline expander beneath the frame on desktop; the grid of catalogue
  cells (emoji above, canonical verb below); a `SLOTS` row that renders
  one control per declared slot of the selected emote (`stuff` → an MQL-
  resolving input, `free` → free text, styled dashed per the mock); and
  the composed command shown verbatim with a send control.
- **One `composeReactCommand(gutter, verb, slotValues)` function** feeds
  both the preview and the send. Export it for the equality test.

**New: `packages/client/src/components/social/EmoteSheet.tsx`**
- The touch path. Long-press a frame → bottom sheet: quick row of six +
  an `all` control that expands to the full slot-aware palette. Existing
  chips stay tappable inline without the gesture. Safe areas per the
  shipped mobile chrome (62/34, sticky-footer bleed).

**`packages/client/src/components/Terminal.tsx`**
- Mount the picker/sheet from the existing `ReactionBar` seam (:121).
  Branch on pointer capability, not on viewport width — a touch laptop
  should get the gesture.

**Coalesced delta line**
- On a `reaction-delta` naming an act whose author is `selfAvatarId`,
  emit one summarising line. Suppress for anyone else's acts. The frame
  is **never re-surfaced**.

### Tests

`packages/client/src/components/social/__tests__/`
- `emotePicker.test.tsx` — grid renders from a store-seeded catalogue; a
  slot-bearing emote renders one control per slot; a `free` slot renders
  in the free treatment.
- `composeReactCommand.test.ts` — preview string `===` sent string, over
  a table of slot permutations. **Assert equality of the two renderings,
  never the literal twice.**
- `reactableTopics.test.ts` — an `act.combat` frame offers the
  affordance; a `world.expression.tell` frame does not; the client list
  and the server list agree.
- `noHardcodedEmoji.test.ts` — source guard: no emoji literal and no
  verb/emoji pair survives in `ReactionBar.tsx` or the picker.

`packages/server/src/mud/obj/__tests__/SoulCatalogue.test.ts`
- `getSnapshot` returns canonical verbs only, with slots in declaration
  order and `required` derived correctly.

`packages/server/src/mud/api/__tests__/reaction.test.ts`
- `REACTABLE_TOPICS.size` is the number of distinct topics (guards the
  duplication from coming back).

---

## Phase 2 — Forums on the Subject model

### Server

**`packages/types/src/index.ts`**
- `ForumSubscriptionScope.kind` gains `'subjects'` (`id` unused, as with
  `'index'`).
- New `ForumSubjectRecord`:
  `{ id, title, grain: 'venue' | 'topic', handle, parent: string | null, audience: { kind: 'open' | 'bound' | 'curated'; label: string }, surfaces: SubjectSurface[], openObjections: number }`.
- `SubjectSurface` = `'popularity-forum' | 'argument-forum' | 'free-chat' | 'rules-chat'` — export it; today it lives server-side only.
- `ForumSubscriptionResultEnvelope` / `ForumSubscriptionDeltaEnvelope`
  carry `ForumSubjectRecord[]` when the scope is `subjects`.

**`packages/server/src/mud/obj/ForumSubscriptionRegistry.ts`**
- Six touch points, all already visible in the file: scope validation
  (:109), initial resolve (:188, :246), delta routing (:359, :373), plus
  a `projectSubjects(viewer)` built on
  `SubjectCatalogue.visibleSubjects(actor)`.
- `openObjections` is derived from the subject's argument board's records
  using the **same** `openObjection` computation the entry projection
  uses — one derivation, not a second implementation.
- Dependency index: a subjects subscription re-resolves when a subject is
  minted, a surface is lit, or an argument board's open-objection set
  changes.

### Client

**New: `packages/client/src/components/social/SubjectRail.tsx`**
- Visible subjects, topic-grain ones nested under their parent, each with
  its lit-surface chips and its open-objection count when non-zero.

**New: `packages/client/src/components/social/SubjectHeader.tsx`**
- Title, grain, handle, audience binding chip; the surface tabs (lit) and
  the `+ <Surface>` controls (unlit). Unlit controls preview
  `forum on <handle> [--argument]` / `chat on <handle>`; `rules-chat`
  renders in the not-wired treatment and sends nothing (D7).

**New: `packages/client/src/components/social/ArgumentBoard.tsx`**
- The typed claim graph, indented by depth, edge-coloured by
  `relation`, `openObjection` rows flagged.
- ⭐ **One `openCount` derivation** over the rendered array, consumed by
  the header badge, the row flags and the maturity-gate copy. A test
  changes the array and asserts all three move together.
- The maturity gate renders its copy from that count (singular / plural /
  "every objection answered") and previews `forum mature <thread>`.

**New: `packages/client/src/components/social/PopularityBoard.tsx`**
- Post list with score and reply count; opening a post renders the
  comment tree with per-node collapse and a depth ceiling past which the
  tail is a *continue this thread* control. Comment sort axis.
- Reuse `ForumView`'s existing sort/vote/post plumbing from
  `store/forumActions.ts` — those actions are correct and stay.

**New: `packages/client/src/components/social/ChatSurface.tsx`**
- The subject's `free-chat` log; the composer states `chan <handle>
  <msg>`; the held-vs-server-history boundary rendered as a real
  statement with a `load more` control, not a silent truncation.

**`packages/client/src/components/ForumView.tsx`**
- Retired. Its board/thread rendering is replaced by
  `PopularityBoard` + `ArgumentBoard`; its navigation is replaced by the
  subject rail. Keep `store/forumActions.ts`.

### Tests

`packages/client/src/components/social/__tests__/`
- `subjectRail.test.tsx` — grain nesting, lit-surface chips, open counts.
- `argumentLens.test.tsx` — ⭐ the one-derivation test above.
- `commentTree.test.tsx` — collapse hides the subtree; the depth ceiling
  produces the continue-thread control with the right count.
- `unlitSurfaces.test.tsx` — `+ Argument` previews a real command;
  `rules-chat` is not-wired-treated and emits nothing.

`packages/server/src/mud/obj/__tests__/ForumSubscriptionRegistry.test.ts`
- A `subjects` subscription resolves to visible subjects only; lighting a
  surface pushes a delta; the open-objection count matches the entry
  projection's own computation.

---

## Phase 3 — Wiki into the shared shell

Smallest phase. `WikiPane.tsx` is sound and its guarantees (body arrives
already rendered and already gated; every affordance is a composed
command) are **preserved unchanged**.

### Client

- Restyle `WikiPane` into the `chat`-mode `wiki` arrangement: the
  page-tree sidebar, the breadcrumb, the body, the section anchors.
- **Search renders hatched.** Hatched ground, dashed border, `╌╌`, and a
  reason. It is not an input.
- **Cut** the mock's `OFFICIAL` standing badge, *what it affords*, *seen
  in play*, and *composed by*. None has a server half; three hatches on
  one page would read as a broken page. Record all four in the wiki tail
  (Phase 6).

### Tests

- `wikiSearch.test.tsx` — the search affordance is not an input and does
  not silently accept text.
- The existing `WikiPane` tests must still pass unchanged; if a restyle
  breaks one, the restyle is wrong.

---

## Phase 4 — Livestream

### Server

**`packages/server/src/mud/lib/connection/HasInteractive.ts`**
- New `cockpit.tuned` clientState key beside `cockpit.watch` (:508):
  an array of `{ platform: 'twitch' | 'youtube' | 'kick'; handle: string; canPost: boolean }`.
  `canPost` is true only for Twitch with an authorized linked identity —
  YouTube and Kick are read-only this cycle, which the `tune` spec
  already states.
- Written by the `tune` / `tune off` path through the normal write → save
  → push commit triple; the rail is a projection of relay registrations,
  never a second source of truth.

**`packages/types/src/index.ts`**
- Export the tuned-target shape. Re-key `SHIPPED_ARRANGEMENT_PANES` to
  `Record<CockpitMode, Record<string, readonly PaneId[]>>` (D5) — the
  `play` entry becomes `{ default: ['place'] }`; every other mode stays
  empty.

### Client

**`packages/client/src/layouts/LivestreamPanes.tsx`**
- De-duplicate `CHAT_TOPICS` (:25).
- The focal/feed split becomes reader-controlled: `reading` / `even` /
  `theater` presets plus a drag, persisted client-side. The world feed
  stays visible in every preset (never-blind).

**New: `packages/client/src/components/social/TunedRail.tsx`**
- Reads `cockpit.tuned`. One row per target with its platform tag and its
  read-only / read·post capability. ⭐ **Convention 3**: the composer for
  a read-only target is not live — the same flag drives the copy and the
  control.
- The composer previews `tune <handle> --<platform> <msg>`.

**Standby (D6)**
- The overlay lands in the **`streamer`** arrangement only, driven by
  `StreamStateSnapshot`. The `viewer` arrangement gets none.
- Countdown ticks locally off absolute `awayUntil`, so it survives a
  reconnect.

**`packages/client/src/components/embed/StreamEmbed.tsx`**
- Fix the stale header comment (it says "Both platforms" over a
  three-platform switch). No behaviour change.

### Tests

- `tunedRail.test.tsx` — rows render from state; a read-only target's
  composer is disabled and says why; a newly-tuned target appears without
  a reconnect.
- `splitPresets.test.tsx` — all three presets change the focal share and
  the world feed is present in each.
- `standby.test.tsx` — the overlay renders in `streamer` and **not** in
  `viewer`; the countdown derives from `awayUntil`.

---

## Phase 5 — Retire `cockpit.layout` from the client

⚠ **Last.** Everything above is built against the working frame; this
phase swaps the frame out from under all of it in one move.

**`packages/client/src/App.tsx`**
- Replace the `cockpit.layout` read (:321) with `cockpit.mode` +
  `cockpit.arrangements[mode]`.
- ⚠ `cockpit.mode` is deliberately `null` for a legacy player
  (`HasInteractive.ts:379`). The server's `getCockpitMode()` migrates on
  read, but **verify what the pushed snapshot actually contains** — if it
  pushes the raw null, the client falls back through
  `LEGACY_LAYOUT_MIGRATION`, which `ViewsMenu` already imports. Check
  this by driving a legacy account, not by reading the code.

**`packages/client/src/layouts/`**
- Delete `index.ts`'s `LAYOUT_REGISTRY`, `ForumLayout.tsx`,
  `LivestreamViewerLayout.tsx`, `StreamerLayout.tsx`.
- New `MODE_REGISTRY: Record<CockpitMode, Record<string, ComponentType>>`
  — `chat: { forums, wiki }`, `play: { default }`,
  `watch: { viewer, streamer }`, `build: { default }`,
  `govern: { default }` (govern falls back to `play` until it has a
  surface; it must fall back **visibly**, not silently).

**`packages/client/src/components/ViewsMenu.tsx`**
- Drop the `LAYOUT_REGISTRY` import (:30) and the `LAYOUT_NAMES` loop;
  offer `COCKPIT_MODES` × their arrangements directly. It already sends
  the right command (:171).

### Tests

- `noLayoutKey.test.ts` — source guard: nothing under
  `packages/client/src` references `cockpit.layout` or `LAYOUT_REGISTRY`.
- `legacyLayoutMigration.test.tsx` — a player whose only state is
  `cockpit.layout: "streamer"` lands in `watch` / `streamer`.
- ⭐ `wiringAtTheLayout.test.ts` — **extend the existing guard** to cover
  every hook the three new surfaces need. This is the test that exists
  because Wave 4 shipped a dead mobile pane surface with every mobile
  component test green.

---

## Phase 6 — Documentation and acceptance

- **`docs/subsystems/`** — `reactions.md` (the picker + the catalogue
  read), `emotes.md` (`SoulApi.snapshot`, the payload cache),
  `forums.md` (the `subjects` scope; ⚠ correct nothing about the model —
  the server was right, the client was behind), `wiki.md` (the shell
  placement, the hatched search, and the **four cut blocks recorded as
  design questions for the wiki tail**), `streaming.md` +
  `livestream.md` (`cockpit.tuned`, the split presets, D6's
  standby-is-the-streamer's rule), `cockpit.md` (`chat`'s two
  arrangements, the per-arrangement pane keying), `client-shell.md` (the
  mode registry replacing the layout registry).
- **`CLAUDE.md`** — one-line map edits only if a doc is added. ⚠ It is a
  swept index file, not a raced one.
- **`docs/slates/builds/client-slate.md`** — mark Wave 6 shipped and
  record where the build diverged from the mocks: the stale `reserved`
  badge on Argument, the retracted Kick finding, D6, and the four cut
  wiki blocks.
- **Drive it live** — all three surfaces, desktop and phone viewport,
  before calling it done. A component test proves rendering, never
  wiring.

---

## Deferred seams (attach points, not stubs)

- **Wiki page standing / canon.** The mock's `OFFICIAL` badge implies a
  Make-chamber adoption act. Real design surface, governance-adjacent,
  no server half. Goes to the wiki tail.
- **Wiki search + forum search.** Both recorded unwired in Track C. The
  hatched field is the attach point.
- **`rules-chat`.** In the vocabulary, parked. Lighting it up is one
  server unpark plus removing D7's treatment.
- **Phone-native forums / wiki / livestream.** Needs mocks; the
  interleave-vs-switch call is Convention 6's and should not be guessed.
- **`govern` mode's surface.** Falls back visibly in Phase 5; the
  fallback is where it attaches.

---

## Critical files

**Server**
- `packages/types/src/index.ts` — every wire shape in this build
- `packages/server/src/mud/obj/SoulCatalogue.ts` + `api/soul.ts`
- `packages/server/src/mud/obj/Avatar.ts` (~873, the connect payload)
- `packages/server/src/mud/obj/ForumSubscriptionRegistry.ts`
- `packages/server/src/mud/obj/SubjectCatalogue.ts`
- `packages/server/src/mud/lib/connection/HasInteractive.ts`
- `packages/server/src/mud/api/reaction.ts`

**Client**
- `packages/client/src/App.tsx`, `layouts/index.ts`
- `packages/client/src/components/Terminal.tsx`, `ReactionBar.tsx`
- `packages/client/src/components/ForumView.tsx` (retired),
  `WikiPane.tsx`, `StreamerDeck.tsx`
- `packages/client/src/layouts/LivestreamPanes.tsx`
- `packages/client/src/store/index.ts`, `store/forumActions.ts`,
  `store/reactionActions.ts`

**Reference**
- `docs/design_handoff/` — the four screens, `CONVENTIONS.md`,
  `DESIGN-SYSTEM.md`. ⭐ **Render them, do not read them.** The Wave 2
  build audited mocks by text and rebuilt three layouts as a result.
