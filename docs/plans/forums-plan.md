# Forums (cycle 1) — implementation plan

This plan executes the forums cycle-1 requirements
(`docs/requirements/forums-requirements.md`) as five independently-testable
waves. The governing shape is one board primitive (`Subject → Board → Thread →
Post`) with a per-board `organizer` axis, cycle 1 building `organizer:
'popularity'`. Wave 0 is foundational and non-negotiably first: it inserts a
`Subject` Document layer *between* a surface and its `GroupRef` audience and
retrofits chat onto it (chat's `owner`+`groupRef` move up to the Subject).
Waves 1–4 add the forum board substrate, the append-only `forum_events` log
with persist-then-fire, the extracted generic subscription engine + command
body side-channel, and the React GUI. Three invariants thread every wave and
must never be violated: **persist-then-fire** (a mutation appends the durable
`forum_events` row *and* fires a transient `ForumEventFired` on `EventApi` as
independent siblings — neither causes the other; `Document.save()` is silent
and `EventApi.fire` persists nothing), **no string-less dispatch path** (the
client `{type:'command', payload:{text, fields?}}` always carries a real
command string; `assembleFromStructured`'s string-less mode stays internal),
and **no MQL-subscription regression** (the engine extraction must keep MQL-sub
+ the inspection pane working unchanged).

A note on naming the new subsystem: per the constraints, `Subject` + `Board` +
`Entry` + `ForumsMixin` + `ForumsUpdate` live in a **new `lib/forum/`
subsystem folder**; `SubjectCatalogue` + subscription-registry singletons in
`obj/`; `ForumsApi` in `api/forums.ts`; `ForumsLogic` in
`obj/api/ForumsLogic.ts`; verb YAML in `mud/cmd/social/`; controllers in
`obj/command/social/`. No new module *category* is introduced.

---

## Wave 0 — Subject layer + chat retrofit

**Goal.** Introduce the persisted `Subject` Document and `SubjectCatalogue`
runtime view; retrofit `Channel` so its `owner`+`groupRef` move onto `Subject`
and it gains a `subject` ref; migrate per-channel subscription state to
per-subject (follow + per-surface mute); lift `visibleChannels` →
`visibleSubjects`. Existing chat must not regress.

**Files.**

- **Create** `lib/forum/Subject.ts` (Document). `extends Document`,
  `static collectionName = Collections.ForumSubjects`. Persistent fields
  (public for the Hydrator): `title` (the addressing handle), `owner`
  (playerId, mutation gate — lifted from `Channel.owner`), `groupRef`
  (lifted from `Channel.groupRef`; empty = open), `lifecycleClass:
  'standing' | 'ephemeral'` (cycle 1 always `'standing'`), `state:
  'active' | 'archived'`, `manifestations: { surface:
  'popularity-forum'|'argument-forum'|'free-chat'|'rules-chat'; ref: string }[]`
  (a subject lights up **1–4 of the four surfaces**, at most one of each; cycle
  1 implements popularity-forum + free-chat — the other two are reserved/
  deferred), the subject `grain: 'venue' | 'topic'` (board-grain vs thread-grain),
  and (for thread-grain) optional `parentSubject` ref + `boardScopedName`.
  Methods-only contract: `getTitle/setTitle`, `getGroupRef`,
  `addManifestation/getManifestations/hasManifestation(surface)`, `getOwner`.
- **Create** `obj/SubjectCatalogue.ts` (singleton `Idea` +
  `PostRegistrationMixin`, mirrors `ChannelCatalogue`). Warms subjects at
  `postRegister` via `Subject.find({})`; indexes by `title.toLowerCase()`
  (flat-global board-subjects) and by `parentSubject + '/' + boardScopedName`
  (board-scoped thread-subjects); subsumes the channel name-registry +
  `RESERVED_NAMES`; owns the per-subject subscription read/write
  (`follow`/`mute`) keyed on `subjectId`; owns `visibleSubjects(actor)` (lifted
  from `visibleChannels`); mints the backing managed group only for the curated
  case.
- **Create** `api/subject.ts` (`SubjectApi`, thin gated facade, ends with
  `SecurityApi.decorateApiClass`): `makeSubject(owner, title, {group?|open?})`,
  `resolveByTitle`, `resolveBoardScoped(board, thread)`, `visibleSubjects`,
  `follow/mute(actor, subjectId, surface?)`, `getSubscription`.
- **Create** `obj/api/SubjectLogic.ts` (HMR-able logic singleton at
  `/obj/api/subject`; `SubjectApi` statics forward here, like
  `ChatApi → ChatLogic`).
- **Create** `cmd/social/subject.yaml` + `obj/command/social/SubjectController.ts`
  — the `subject` verb (`make <name>` default-mints managed group; `--group
  <ref>` / `--open`; `list`; subcommand-fallthrough like `ChatController`).
- **Modify** `lib/social/Channel.ts` — drop `owner`+`groupRef` from
  `persistentFields` + class; add `subject` ref; add `procedure:
  'free' | 'rules-of-order'` (default `'free'`; cycle 1 is free-only, the
  `rules-chat` surface is the deferred procedure) — a subject may carry two
  Channels (free + rules); keep existing `kind` values but map them to subject
  types (see Risks — avoid a data migration of `kind`).
- **Modify** `obj/ChannelCatalogue.ts` — audience resolution (`audienceFor`,
  `postToChannel` fanout) reads `groupRef` *via the Channel's Subject*, not off
  the Channel; subscription read/write delegates to the per-subject store;
  `visibleChannels` delegates to / is replaced by `visibleSubjects`;
  `createPlayerChannel`/`promoteAdHocToManaged`/`disband`/`rename` mint/bind a
  Subject first, then a Channel pointing at it. `RESERVED_NAMES` migrates to
  `SubjectCatalogue`.
- **Modify** `api/chat.ts` + `obj/api/ChatLogic.ts` — re-point reads to be
  subject-aware; keep the surface stable for `ChatController`.
- **Modify** `cmd/social/chat.yaml` + `obj/command/social/ChatController.ts` —
  `chat make` becomes sugar (subject-make + `chat on`, default `--free`); add
  `chat on <subject> [--rules]` attach (default free; `--rules` deferred but the
  flag is reserved), gated by `Subject.owner`. `make` errors on taken name; `on`
  denied to non-owner.
- **Modify** `backend/PersistenceManager.ts` — add `ForumSubjects =
  'forum_subjects'` to `Collections`; unique case-insensitive index on `title`;
  index on `parentSubject`.

**Approach.** The Subject sits between surface and audience: today `Channel`
binds a `GroupRef` directly; now `Channel → Subject → GroupRef`. The audience
fanout chokepoint is `ChannelCatalogue.postToChannel`/`audienceFor` (the only
place that reads `channel.groupRef` and calls `GroupApi.membersOf`); re-route
through the Channel's Subject. The three channel kinds map: player-created →
**curated** subject (mints a managed group, the
`createPlayerChannel`/`mintBackingGroup` precedent); open-join-standalone →
**open** subject (empty ref); ad-hoc → **runtime** (`AdHocChannel`, no subject,
unchanged). Per-subject subscription replaces the per-channel
`chat.subscription.<channelId>` PropertiedMixin key with a
`subject.subscription.<subjectId>` key carrying `{followed, mutedSurfaces}`; a
one-time migration reads existing `chat.subscription.*` keys and rewrites them
keyed by the channel's new subject (lazy on first read, idempotent). `subject
make` default-mints a managed group (curated); `--group <ref>` binds an
existing `guild:`/`mql:`/`contacts:` ref and mints nothing; `--open` leaves
`groupRef` empty.

**Tests.**
- `Subject` create/read/update + persistence round-trip through `forum_subjects`.
- `subject make` mints a managed group by default; `--group`/`--open`
  bind/empty without minting.
- `make` on a taken title errors; `on` denied to a non-owner.
- Existing chat tests pass unchanged; a player-created channel is now exposed as
  a curated `Subject`, an open channel as an open `Subject`; `Channel` carries
  `subject` and no longer `owner`/`groupRef`.
- `follow <subject>` tunes all lit surfaces; `mute <subject>:<kind>` silences
  one without un-following; migrated subscription state round-trips.
- Removing a member from the backing managed group removes them from the
  subject's audience.
- `subject list` shows open subjects to everyone, ref-backed to members;
  case-insensitive title resolve.

**Exit criteria.** All existing chat tests green; chat operates through Subject;
`forum_subjects` registered + indexed; per-subject follow/mute works and
migrates; `subject` verb + `chat on` live.

---

## Wave 1 — forum board substrate

**Goal.** `Board`/`Entry` Documents (Board→Thread→Post, strict `reply` tree),
`ForumsApi`+`ForumsLogic`, the born-with `ForumsUpdate` hosted update, the
`forum` CLI verb (subcommand fallthrough), `forum on`/`forum make` sugar, and
thread promotion (board-scoped thread-subject + its own chat).

**Files.**

- **Create** `lib/forum/Board.ts` (Document, `Collections.ForumBoards`):
  `subject` ref (every board belongs to a Subject), `organizer:
  'popularity'|'structure'` (cycle 1 always `'popularity'`, but the field
  ships), `name`, `description`, an empty `override` bag (designed-in but inert
  in v1).
- **Create** `lib/forum/Entry.ts` (Document, `Collections.ForumEntries`):
  `board` ref, `parent: string|null` (null = root = Thread), `relation`
  (`'reply'` for popularity; the typed-edge field ships generically for the
  deferred structure organizer), `author`, `body`, `createdAt`/`editedAt`,
  optional `subject: string|null` (a promoted Thread's thread-subject),
  `state: 'active'|'locked'`, denormalized vote aggregate `up`/`down`
  (populated in Wave 2; default 0).
- **Create** `lib/forum/ForumsUpdate.ts` — `ForumsMixin(AetherHostedMixin(Idea))`,
  `static TEMPLATE_PATH`, mirroring `CommsUpdate.ts`.
- **Create** `lib/forum/Forums.ts` — `ForumsMixin` (capability mixin, sibling
  to `CommsMixin`). `static commandContributions = { self: ['social/forum.yaml']
  }`; resolves its operator via `getHost()` and gates on
  `MixinApi.isAether(operator)`, copying the `CommsMixin.tell` operator-
  resolution + `InactiveCapabilityError` pattern. Confers read + post.
- **Create** `api/forums.ts` (`ForumsApi`, self-decorates) +
  `obj/api/ForumsLogic.ts` (HMR-able at `/obj/api/forums`): `createBoard`,
  `postThread`, `reply`, `readBoard`/`readThread` (tree reads),
  `promoteThread`, resolve-by-handle. Forwarding shell + logic split like
  `ChatApi`/`ChatLogic`.
- **Create** `cmd/social/forum.yaml` + `obj/command/social/ForumController.ts`
  — `forum list / make / on / follow / post / reply / read / promote` +
  (Wave 2) `vote` + sort selectors. `forum make`/`forum on <subject>` default to
  the **popularity** organizer; `--argument` selects the structure organizer
  (reserved/deferred — flag ships, behavior doesn't). `fallthrough: true`.
  `post`/`reply` declare a body-typed arg (greedy text in CLI; Wave 3 lights up
  the `fields` side-channel).
- **Modify** `obj/Avatar.ts` (~line 524, default loadout) — after
  `hostUpdate(comms)` + `hostUpdate(cred)`, clone a `ForumsUpdate` and
  `this.hostUpdate(forums)`. Extend the idempotency guard so a re-run doesn't
  double-host.
- **Modify** `lib/paths.ts` (`TemplatePaths`) — add `forumsUpdate`; seed the
  `ForumsUpdate` template wherever `commsUpdate` is seeded.
- **Modify** `backend/PersistenceManager.ts` — add `ForumBoards`,
  `ForumEntries`; index `forum_boards` on `subject`, `forum_entries` on
  `board` + `parent`.

**Approach.** `ForumsUpdate` rides the existing aether implant exactly like
DMs — no new physical implant. The Avatar loadout already clones +
`hostUpdate`s a `CommsUpdate` + travel credential (`Avatar.ts` ~524); forums
add a third hosted update there (born-with). The `forum` verbs are afforded via
`ForumsMixin.commandContributions`, surfaced on the host's recency stack by the
existing `CommandApi.applyHostedUpdateDelta` path that `hostUpdate` already
fires; a holder is reached via `ContainmentApi.findReachable(actor, null,
MixinApi.isForums)` (the `DmController` pattern). Board→Thread→Post: a Thread
is a root `Entry` (`parent: null`); a Post is a child `Entry` with `relation:
'reply'` (strict tree for popularity). Every Board belongs to a Subject;
`forum make` is sugar (subject-make + board light-up + a `{kind:'board'}`
manifestation). **Thread promotion**: `forum <board> promote <thread>` mints a
thread-subject (board-scoped handle `board/thread`, `parentSubject` = the
board's subject), stamps `Entry.subject`, and `chat on <thread>` lights its
thread-scoped chat — the `promoteAdHocToManaged` precedent. All mutations route
through `ForumsLogic` (the Wave 2 `record(event)` dual-write hooks here).
Controllers return `void`; outcomes ride the dispatch-response envelope.

**Tests.**
- `Board`/`Entry` create/read/update + round-trip; a Board belongs to a
  Subject; a Thread holds a Post reply-tree.
- A holder whose aether hosts a `ForumsUpdate` is afforded the `forum` verbs
  (via `findReachable`); one without is not; the Avatar loadout hosts a
  `ForumsUpdate` at spawn.
- CLI: an implanted player can `forum make`, post a thread, `reply`, `read`,
  `list` — observable through the envelope.
- Thread promotion: a plain thread promotes to a thread-subject with its own
  chat; addressable by board-scoped handle; its chat distinct from the board's;
  following the thread-subject independent of the board-subject.

**Exit criteria.** Forum CRUD works end-to-end via CLI through the envelope;
`ForumsUpdate` born-with + reachable; promotion produces an addressable
thread-subject + chat; collections registered.

---

## Wave 2 — event log + voting

**Goal.** The append-only `forum_events` collection + the `record(event)`
helper (persist-then-fire); votes (`forum_votes` toggle store + denormalized
aggregate + `vote-cast` events; auto-upvote-own; new/top/hot/controversial
sorts; anti-snowball hide-until-threshold via app-settings).

**Files.**

- **Create** `lib/forum/ForumEvent.ts` (Document, `Collections.ForumEvents`,
  append-only — the `ChronicleEntry` precedent: a plain `Document`, the row IS
  the event): `subject`, `board`, `thread`, `entry`, `kind`
  (`'post-created'|'vote-cast'|'thread-locked'|…`), `actor`, `at`, `data` bag.
  Plus the transient `ForumEventFired` (a `BusEvent`-shaped DTO with `static
  KIND = 'forum.eventFired'` + a `payload` carrying the dependency keys the
  engine indexes on — `board`/`thread`/`entry`/`subject` — like
  `FieldChangedEvent`).
- **Create** `lib/forum/Vote.ts` (Document, `Collections.ForumVotes`): one row
  per `(entry, voter)`: `entry`, `voter`, `value: 'up'|'down'` (absence =
  none). Unique compound index on `(entry, voter)`.
- **Modify** `obj/api/ForumsLogic.ts` — add the private `record(event)` helper:
  (1) append the `ForumEvent` row via `await forumEvent.save()` (silent), then
  (2) `EventApi.fire(new ForumEventFired(payload))`. Every mutation
  (`postThread`/`reply`/`vote`/`promote`/`lock`) calls `record` after updating
  the CRUD doc. Add `castVote(entry, voter, direction)`: toggle the
  `forum_votes` row (up→none→down), recompute + write the denormalized
  `up`/`down` aggregate on the `Entry`, then `record` a `vote-cast` event. Add
  `sortEntries(list, mode)` for new/top/hot/controversial. Add
  `displayScoreFor(entry)` applying the anti-snowball gate.
- **Modify** `api/forums.ts` — surface `vote`, sort params on reads.
- **Modify** `cmd/social/forum.yaml` + `ForumController.ts` — `forum vote
  <entry> up|down`; sort selectors on `list`/`read`.
- **Modify** `backend/PersistenceManager.ts` — add `ForumEvents`,
  `ForumVotes`; index `forum_events` on `subject`/`thread`/`board`/`entry`;
  unique compound index on `forum_votes (entry, voter)`.
- **Modify** `mud/config/app-settings.yaml` + the `AppSettingKeys` vocabulary —
  add `forums.antiSnowball.minVotes` (K) + `forums.antiSnowball.minMinutes`
  (T); read via `AppApi` sync cached reads.

**Approach.** Dual-write is two independent siblings: the write doesn't fire the
event (`Document.save()` is silent, no change-stream) and the event doesn't
cause the write (not event-sourced). `record` does both explicitly,
**persist-then-fire** so no listener observes a live event whose durable row is
missing — mirroring `MqlSubscriptionApi.fireFieldChange` → `EventApi.fire`, and
the `ChronicleApi.record` silent-append precedent for the durable side. A vote
is a toggle state per `(entry, voter) ∈ {up, none, down}`: one row in
`forum_votes` + a denormalized `up`/`down` aggregate on the `Entry` so the
score updates live via the Wave 3 engine (which re-resolves the current-state
`Entry`, now carrying the new aggregate). Your own entry auto-upvotes (the
author's vote row is created `up` and locked at post time). Net `up − down`
drives sorts: hot = `sign(net)·log10(max(|net|,1)) + createdAt/45000` (exact
constants deferred tuning); sorts apply at both the board thread-list and the
comment-sibling levels. Anti-snowball is **display-only**: the server ranks on
true scores always; `displayScoreFor` returns a placeholder until K votes OR T
minutes since creation (app-settings). Votes are discovery-only, flat
one-account-one-vote (audience members only, gated by `GroupApi` membership via
the Subject), never wired to standing/money. **`forum_events` is append-only**
— never mutated or deleted in normal operation.

**Tests.**
- Dual-write: every mutation appends exactly one `forum_events` row; the log is
  append-only (assert no in-place mutation); current-state docs match the
  replayed log for a sample sequence.
- Voting: up/down toggle (up→none→down) in `forum_votes` with a denormalized
  aggregate; an own entry starts at +1 locked; a cast appends a `vote-cast`
  event (the live-delta half lands in Wave 3's test).
- Sorts: new/top/hot/controversial produce expected order at thread-list and
  comment-sibling levels.
- Anti-snowball: displayed score hidden until K/T, but server ranking uses true
  scores throughout — assert ranking is unaffected by the display gate.
- Vote limits: only audience members vote; one vote per account; not wired to
  any standing/money surface.

**Exit criteria.** `record` dual-writes persist-then-fire; voting toggle +
aggregate + auto-upvote + sorts + anti-snowball gate all pass;
`forum_events`/`forum_votes` registered + indexed.

---

## Wave 3 — subscription engine + command body side-channel

**Goal.** Extract/generalize the MQL-subscription machinery into a reusable
Document subscription engine that listens on `EventApi` and re-resolves
current-state docs (NOT a Mongo tail; MUST NOT regress MQL-sub/inspection-pane).
Light up the command **body side-channel** (`{text, fields}` → fill YAML
body-typed args; no string-less path).

**Files.**

- **Create** `obj/DocSubscriptionRegistry.ts` (singleton `Idea`, the
  generalized sibling of `MqlSubscriptionRegistry`). Holds the per-Interactive
  registry, the three-level dependency index (`KIND → by → value → Set<state>`),
  the refcounted `EventApi.on` listener table, the `setImmediate`-batched dirty
  queue + `reresolveAndEmit` — lifted from `MqlSubscriptionRegistry` but
  parameterized over a **resolver** (re-resolve a Document set given the
  subscription's scope) and a **projector** (Document → wire record) instead of
  MQL/Stuff-specific `MqlApi.resolveOne/Many` + `projectStuffInto`. Forums
  register a resolver that re-reads the current-state `Board`/`Entry` docs (the
  subscription scope = a board's thread-list or a thread's post-tree) and
  projects them with the denormalized vote aggregate + `displayScoreFor`.
- **Create** `api/doc-subscription.ts` (`DocSubscriptionApi`, self-decorates) +
  `obj/api/DocSubscriptionLogic.ts` (HMR-able at `/obj/api/doc-subscription`),
  mirroring the `MqlSubscriptionApi`/`MqlSubscriptionLogic`/registry three-tier
  split.
- **Modify** `backend/inbound/index.ts` + add
  `backend/inbound/forumSubscription.ts` — register
  `forum-subscribe`/`forum-unsubscribe` inbound handlers calling
  `DocSubscriptionApi`.
- **Wire** the engine listener: `ensureListener` subscribes via
  `EventApi.on(ForumEventFired, …)`; `routeFire` reads `board`/`thread`/`entry`
  keys off the payload, marks matching subscriptions dirty, `drainDirty`
  re-resolves current-state docs → diff → delta.
- **Modify** `backend/inbound/command.ts` — accept an optional `fields` on
  `{type:'command', payload:{text, fields?}}` and thread it into
  `executeCommand` as `ExecuteCommandOpts.bodyFields`.
- **Modify** `lib/command/CommandGiver.ts` (`executeCommand`) — after the parser
  produces `parsed` (the normal string path), if `opts.bodyFields` is present,
  overlay them onto the bound model's body-typed args before resolve/validate:
  parse `text` normally → bind → overlay `fields` only onto YAML args declared
  body-typed → run the **same** resolve → validate → controller → envelope
  chain. This reuses the *internal* `assembleFromStructured` coercion (field-name
  legality + coercion) for the *overlay only* — the string is always parsed
  first; the string-less mode is never exposed as a client inbound.
- **Modify** `cmd/social/forum.yaml` — mark `post`/`reply`/`edit` body args as
  body-typed (a `body: true` flag) so the side-channel knows which args `fields`
  may fill.

**Approach.** The engine is the `MqlSubscriptionRegistry` pattern generalized:
it **listens on the in-process `EventApi` bus** (`EventApi.on(ForumEventFired)`),
routes via the dependency index, batches on `setImmediate`, and **re-resolves
current-state docs** to diff → delta. It does **not** tail `forum_events` (the
durable twin, read only for history/audit). Because `MqlSubscriptionRegistry`
is left untouched and the new `DocSubscriptionRegistry` is a parallel singleton,
**MQL-sub + the inspection pane are not regressed** — the extraction is by
parameterization of a copy, not by mutating the existing registry (a later
refactor can collapse the two once both are proven; cycle 1 does not). The
persist-then-fire invariant is what makes the live delta correct: the engine
only ever re-reads committed CRUD docs, so a delta can never reflect an event
whose row hasn't landed. The **body side-channel** keeps the command string
canonical: `text` is always present and parsed; `fields` fills only
YAML-designated body args, overlaid *after* the parse; the dispatcher runs the
identical validate → controller → envelope chain. Used sparingly
(post/reply/edit only); a malformed payload is rejected by the existing
`assembleFromStructured` coercion without bypassing validation.

**Tests.**
- A client opens a forum subscription and receives an initial snapshot then
  deltas as entries change; a forum mutation both appends a `forum_events` row
  and fires `ForumEventFired` that drives the delta (persist-then-fire; neither
  a side-effect of the other); the engine listens on `EventApi`, not a Mongo
  tail.
- A `vote-cast` updates the displayed score live via a subscription delta with
  no manual refresh (completes the Wave 2 voting acceptance criterion).
- MQL-sub / inspection-pane tests still pass — assert `MqlSubscriptionRegistry`
  untouched.
- Body side-channel: a `{text, fields}` command parses the string and overlays
  `fields` onto body-typed args, running the same validate → controller →
  envelope chain; a body-bearing verb behaves identically whether the body is
  inline (CLI) or via `fields` (GUI); no string-less dispatch path is exposed; a
  malformed payload is rejected without bypassing validation.

**Exit criteria.** Forum subscriptions deliver snapshot + live deltas driven by
`ForumEventFired`; MQL-sub unaffected; the body side-channel overlays correctly
and rejects malformed payloads; CLI and GUI body paths are behavior-identical.

---

## Wave 4 — React forum GUI (a primary view inside the cockpit)

**Goal.** The forum is a **primary view inside the in-world cockpit** (a
`Terminal | Forum` main-area switch — **not** a new `connectionPhase`); Frame +
CommandBar persist, the right column is view-sensitive, live scene events still
surface. Board→thread→post-tree rendered live via the subscription engine;
votes via plain command strings; post/reply via string + body side-channel; the
nested chat sidecar (subject-path stack).

**Files.**

- **Modify** `packages/client/src/App.tsx` (in-world JSX, ~lines 564–597) — the
  IA seam. Refactor the `LeftColumn` content slot to render **`Terminal` OR
  `ForumView`** by a new `mainView` store value; add a slim **primary-view
  switch** (`Terminal | Forum`) above the slot (distinct from the `TabStrip`
  filter-tabs, which stay *inside* the Terminal view). Keep **`Frame` +
  `CommandBar` mounted across both views**. Make the **right column
  view-sensitive**: `InspectionPane` in terminal view, `ForumChatSidecar` in
  forum view. Add a **scene peek/toast** so live scene frames surface while the
  Forum view is active (live awareness not severed). It is **not** a
  `connectionPhase` swap — the player stays in `in-world`.
- **Modify** `packages/client/src/store/index.ts` — add an in-world
  `mainView: 'terminal' | 'forum'` slice + `setMainView`; hold forum nav target
  (current board/thread) for the view.
- **Wire** verb-driven navigation — typing `forum` / `forum <board>` flips
  `mainView` to the forum and sets the nav target (via a `controller-focus`-style
  note on the dispatch-response envelope, or a client-side recognizer for the
  `forum` verb); clicking the view-switch does the same. CLI and GUI converge.
- **Create** `packages/client/src/components/ForumView.tsx` (+ children:
  `BoardList`, `ThreadList`, `PostTree`, `VoteControls`, `ComposeBox`) — browse
  boards → threads → post-trees, sortable by the popularity orderings. Mounts in
  the LeftColumn content slot.
- **Create** `packages/client/src/components/ForumChatSidecar.tsx` — the
  contextual chat rail stacking subjects on the current path (board's chat at
  the board; thread's chat when a promoted thread is open, parent still
  reachable — the subject-path stack).
- **Modify** `packages/client/src/services/websocket.ts` — add
  `subscribeForum(spec)` / `unsubscribeForum` (mirroring `subscribeMql`) sending
  `forum-subscribe`/`forum-unsubscribe`, and handle the
  `forum-subscription-result` / `forum-subscription-delta` envelopes into a
  forum store (mirroring `feedStuffRegistry`); extend the command send to
  optionally carry `fields`.
- **Modify** `packages/client/src/App.tsx` (~line 369) — the command-send path
  accepts an optional `fields` payload for body-bearing verbs.
- **Create** a client forum store slice (`packages/client/src/store/
  forumActions.ts`) holding the live board/thread/entry records fed by deltas.
- **Modify** `packages/types` — add the `forum-subscribe`/result/delta envelope
  shapes + the forum record shapes (sibling to the MQL subscription envelopes).

**Approach.** **IA: forum is a primary view in the cockpit, not a phase.** The
shell has no router — there's a `connectionPhase` machine and a terminal-centric
in-world cockpit. Rather than add a `forum` phase (which would hide the
terminal/command-bar — a leave-the-game context switch), add a `mainView`
toggle *within* `in-world`: the LeftColumn content slot renders `Terminal` or
`ForumView`; `Frame` + `CommandBar` stay mounted; the right column swaps
`InspectionPane` ↔ `ForumChatSidecar`; live scene frames surface as a peek so
the player never goes dark on live play. This encodes the diegetic split (forum
= in-cockpit view; CMS/wiki/settings = a separate phase/overlay tool). Reads =
subscription (live deltas on the viewed set: a board's thread-list, a thread's
post-tree, vote counts — the engine re-resolving current-state docs when a
`ForumEventFired` lands) + structured query for pagination/lazy-load of a
subtree. Writes ride the command bus as **real
command strings**: votes and sort/navigate are plain strings (`forum vote
<entry> up`); post/reply send a command string with the multi-line **body on
the `fields` side-channel**. The GUI builds the same strings the CLI types —
every action stays scriptable/aliasable/replayable; no string-less path.
Casting a vote sends `forum vote …` and the score updates via subscription
delta without a manual refresh. The chat sidecar reuses the Wave 0 Subject-path
stack: opening a promoted thread surfaces its thread-scoped chat alongside the
still-reachable board chat (not replacing it).

**Tests.**
- The React forum view renders a board → thread → post-tree live.
- Casting a vote sends a plain command string and the score updates via
  subscription without manual refresh.
- Posting/replying sends a command string with the body on the `fields`
  side-channel and the new entry appears via delta.
- Nested chat: opening a promoted thread surfaces its thread-scoped chat
  alongside the still-reachable board chat — the subject-path stack, not a
  replacement.
- **IA:** toggling to the Forum view keeps `Frame` + `CommandBar` mounted (a
  command still submits) and swaps the right column to the chat sidecar; the
  `forum` verb flips `mainView`; a live scene frame surfaces while the Forum
  view is active; the player stays in `connectionPhase: in-world` (no phase
  swap).

**Exit criteria.** Forum is a cockpit primary view (Frame + CommandBar persist,
right column view-sensitive, live scene peek, verb + click navigation, no phase
swap); GUI live-renders board→thread→post; votes + post/reply work via command
strings (+ body side-channel) with live delta updates; nested chat sidecar
stacks subjects on the path.

---

## Finalize (out of band)

At sweep, `docs/subsystems/forums.md` graduates documenting the substrate,
organizer model, Subject/hierarchy, the event-log + subscription engine, and
the client channels. The plan + requirements docs retire per the workflow rules.

---

## Risks / open implementation questions

- **Engine extraction vs. collapse.** Cycle 1 ships `DocSubscriptionRegistry`
  as a *parallel copy* of `MqlSubscriptionRegistry` parameterized over
  resolver/projector, deliberately leaving MQL-sub untouched to satisfy the
  no-regression invariant. This duplicates the dirty-queue/index/listener
  machinery. A later refactor can collapse the two onto one core; do **not**
  attempt the collapse in cycle 1 (regression risk). Open: whether the shared
  core lives in `lib/forum/` or a neutral `lib/subscription/` — recommend a
  neutral folder if the collapse is foreseen, but parking next to forums is
  acceptable since wiki/CMS are downstream-not-yet-built.
- **`Channel.kind` rename → data migration.** Existing channel docs persist
  `kind: 'player-created' | 'open-join-standalone'`. **Keep those strings** and
  map them to subject types at read, OR add a one-shot `kind` migration in Wave
  0 — do not silently rename the enum (it would orphan existing docs). The plan
  above assumes keep-and-map.
- **Subscription query/pagination model** (carried from the slate's open
  questions). The engine must serve both live deltas on a viewed set and
  navigate/paginate/lazy-load deep trees. Cycle 1 scopes a subscription to a
  single board's thread-list or a single thread's post-tree; deep-subtree paging
  is a structured query (`DocSubscriptionApi` query path) and the boundary
  between a live-subscribed window and a paged window needs a concrete cut at
  build time.
- **Body-typed arg marking.** The YAML needs a `body: true` flag the dispatcher
  reads to know which args `fields` may fill. Confirm `CommandDefinition`'s
  field shape can carry it without a parser change; if not, a small
  `command-spec` extension lands in Wave 3.
- **`ForumEventFired` payload keys.** `routeFire` reads dependency keys off the
  payload (`board`/`thread`/`entry`/`subject`). `record` must populate all four
  on every event so the index routes correctly even for events that nominally
  touch one level (e.g. a `vote-cast` must carry its entry's `board` + `thread`
  so a board-list subscription showing aggregate scores re-resolves).
- **Auto-upvote-own locking.** The author's vote row is created `up` and locked;
  `castVote`'s toggle path must refuse to toggle the author's own row.
- **Migration of existing chat subscription state.** Wave 0 rewrites
  `chat.subscription.<channelId>` keys to `subject.subscription.<subjectId>`.
  Lazy-on-read (idempotent) is safer than one-shot-at-warm (no boot-time write
  storm).
- **`setImmediate` vs `ScheduleApi`.** The copied engine uses `setImmediate`
  for dirty-batching, matching `MqlSubscriptionRegistry`'s existing pattern.
  This follows precedent rather than the `ScheduleApi`-over-bare-timers rule;
  keep it consistent with the source registry (a divergence here would be a
  gratuitous difference from the thing being generalized).

## Inter-wave dependencies

- **Wave 0 is strictly first** — it introduces `Subject`/`SubjectCatalogue`,
  the layer everything else binds.
- **Wave 1 depends on Wave 0** (Board belongs to a Subject; promotion mints a
  thread-subject; `forum on` attaches to a Subject).
- **Wave 2 depends on Wave 1** (`record` lives on `ForumsLogic`; votes
  denormalize onto `Entry`).
- **Wave 3 depends on Wave 2** (the engine listens for `ForumEventFired`, fired
  by Wave 2's `record`; the live-vote-delta test needs both). The body
  side-channel piece depends only on Wave 1's `forum post`/`reply` verbs, so it
  could land earlier — but keep it in Wave 3 (the "reads + writes complete"
  framing).
- **Wave 4 depends on Wave 3** (the GUI consumes the engine for reads and the
  body side-channel for writes).

Each wave is independently testable against its mapped acceptance criteria, and
Wave 0's "existing chat must not regress" gate runs the full existing chat suite
before any forum code lands.
