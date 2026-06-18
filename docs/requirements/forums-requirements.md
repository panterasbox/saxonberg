# Forums (cycle 1) — requirements

The first build of the **forums** subsystem
([forums-slate.md](../slates/builds/forums-slate.md)): durable,
addressable, multi-author boards on the aether implant. Cycle 1 delivers the
**shared board substrate**, the **popularity organizer**, the **full client**
(generic subscription engine + a structured body side-channel + React GUI), and
**chat↔forum linking** — everything except the *structure* (deliberation /
argument-map) organizer, which is a later cycle. The governing thesis: one
board primitive (`Subject → Board → Thread → Post`) with a per-board
`organizer` axis; cycle 1 builds `organizer: 'popularity'` and ships the
`organizer` field + reply-tree storage so structure is a later *organizer*, not
a later *schema migration*. Because the `Subject` is a layer inserted between a
surface and its `GroupRef` audience, cycle 1's **first wave is a chat retrofit**
onto the shared Subject layer (chat's `owner`+`groupRef` move up to the
Subject); forums then add a Board surface on top.

## Goals

- **Subject is the linking spine.** A persisted `Subject` lifts the identity +
  audience currently split across `Channel.owner` + `Channel.groupRef` + name
  into one Document: `title` (the handle), `owner` (playerId, mutation gate),
  `groupRef` (audience binding — *mint* a managed group for the curated case,
  *bind* an existing `guild:`/`mql:`/`contacts:` ref, or *open* via empty ref),
  the lit **manifestations** (up to one each of the **four surfaces** — see
  *The four surfaces* below), and lifecycle. Cycle 1 exercises **standing**
  subjects at **board and thread grain** (incl. promote-a-thread); only the
  **ephemeral lifecycle + archive cascade** (bills) + the governance trigger
  remain deferred.
- **The hierarchy is `Board → Thread → Post`.** A `Board` is a persisted
  long-lived venue (popularity organizer) holding many Threads; a `Thread` is a
  persisted root `Entry` (a submission); a `Post` is a persisted child `Entry`
  (a comment, single `reply` edge — strict tree). Every board belongs to a
  Subject.
- **`SubjectCatalogue`** (singleton `Idea`) warms subjects at boot, indexes
  subjects by title + boards by name, lazily loads boards/entry-trees — the
  runtime view; the Documents are the source of truth. (Named after its root
  entity, like `ChannelCatalogue` / `SoulCatalogue`.)
- **Source of record = CRUD docs + an append-only log alongside.** Every forum
  mutation **dual-writes**: it updates the current-state Document *and* appends
  a faithful event to an append-only **`forum_events`** collection
  (chronicle-shaped — dumb store / smart consumers) **and** fires a transient
  in-process `ForumEventFired` on `EventApi` (persist-then-fire). The log is the
  **durable audit/archive twin**; the **live feed is the in-process `EventApi`
  bus**; CRUD docs stay the queryable truth (not event-sourced). The write and
  the fire are independent siblings of the mutation — neither causes the other
  (`Document.save()` is silent; `EventApi.fire` persists nothing).
- **Popularity voting + ordering.** Every `Entry` (thread roots + posts) is
  votable; a vote is a **toggle state per `(entry, voter)` ∈ {up,none,down}**,
  stored one row per pair in a **`forum_votes`** store with a **denormalized
  `up`/`down` aggregate on the Entry**. Each cast dual-writes (store + aggregate
  + a `vote-cast` event) so the score updates **live** via the subscription
  engine. Net `up − down` drives **new / top / hot / controversial** sorts,
  applied at both the board's thread-list and comment-siblings within a thread.
  Your **own entry auto-upvotes** (+1, locked, Reddit-style). **Discovery-only**
  (never wired to standing / money); **flat one-account-one-vote** (audience
  members only; trust-weighting deferred); **context-scoped** per board;
  **anti-snowball** via hide-until-threshold (below).
- **Aether-hosted capability (like DMs).** Forums ride a **`ForumsUpdate`** —
  `ForumsMixin(AetherHostedMixin(Idea))`, a **hosted update on the existing
  aether implant**, mirroring `CommsUpdate` exactly (**no separate implant**).
  It confers the forum capability (read + post), is reached via `findReachable`
  host-descent, and contributes the `forum` verb surface. It's **born-with**:
  the Avatar loadout hosts a `ForumsUpdate` at spawn via `hostUpdate`, alongside
  the comms + travel-credential updates (`Avatar.ts`).
- **CLI surface.** A `forum` verb with **subcommand fallthrough** (chat.yaml
  pattern): `forum list / make / follow / post / reply / read / vote` + sort
  selectors. The CLI drives the *same controllers* the GUI uses.
- **Command strings stay canonical; structured data rides a side channel.** The
  GUI constructs **real command strings** (verb + selectors) — preserving the
  command spec as the scriptable / aliasable / replayable surface (the whole
  point of exposing it). Input that can't sit on a command line — a multi-line
  post **body**, form fields — rides an **optional structured payload alongside
  the string** (HTTP method+path vs body): the existing `{type:'command',
  payload:{ text, fields? }}`, where `fields` fills only **YAML-designated
  body-typed args**. The dispatcher parses `text` normally, overlays the body
  fields, then runs the same resolve → validate → controller → envelope chain.
  **Used sparingly** (only body-bearing verbs — post/reply/edit) and **always a
  side channel, never a replacement** — no string-less dispatch path is exposed
  (`assembleFromStructured`'s string-less mode stays an internal helper).
- **Subscription engine (generic, reusable).** Extract the MQL-subscription
  machinery (per-Interactive registry, dependency index, `setImmediate` batched
  re-resolve, snapshot + delta wire, client store) into a reusable
  **subscription engine** that **listens on the in-process `EventApi` bus**
  (`EventApi.on(ForumEventFired)`), re-resolves current-state docs, and pushes
  snapshot + deltas. It does **not** tail Mongo; `forum_events` is the durable
  twin, not the live feed. Built so wiki/CMS can bind it later.
- **React forum GUI — a primary view *inside* the cockpit.** The forum is a
  `Terminal | Forum` main-area view-switch (not a separate phase): the **Frame +
  CommandBar persist**, the **right column swaps** from the inspection pane to
  the chat sidecar, and live **scene events surface as a peek/toast** so you
  never leave live play. The `forum` verb flips the view + navigates (diegetic;
  CLI and GUI converge). Browse boards → threads → post-trees driven **live** by
  the subscription engine; cast votes and post/reply via **real command
  strings** (vote/sort inline; post/reply carry the body on the structured
  side-channel); sort by the popularity orderings. Reads = subscription (live
  deltas on the viewed set) + structured query (paginate / lazy-load a
  subtree). **Chat is a contextual sidecar** that stacks the subjects on the
  current path — the board's chat at the board, the thread's chat when you open
  a promoted thread (parent reachable) — and a thread carries a **promote**
  affordance to light up its own chat.
- **Chat retrofit onto the Subject layer (Wave 0).** `Channel` drops `owner` +
  `groupRef` (they move to `Subject`) and gains a `subject` ref. The three
  channel kinds map: player-created → a **curated** subject (managed group);
  open-join-standalone → an **open** subject (empty ref); **ad-hoc stays
  runtime-only** (no subject) in v1. `SubjectCatalogue` subsumes the channel
  name-registry. A subject then lights up chat + forum **à la carte**, both
  inheriting its `groupRef` — linked siblings (group changes cascade to both).
- **Follow the subject (per-surface mute).** Subscription/tuning moves from
  per-channel to **per-subject** (keyed on `subjectId`): one `follow` tunes you
  into all the subject's lit surfaces (chat live + forum notifications), with an
  optional **per-surface mute** overlay. Today's per-channel subscription state
  is migrated.
- **Verb model + discovery.** A `subject` verb owns identity + audience
  (`subject make <name>` mints a managed-backed curated subject by default;
  `--group <ref>` / `--open` for the rest). Surfaces light up with **`forum on
  <subject> [--argument]`** (default popularity) / **`chat on <subject>
  [--rules]`** (default free) — the type flag selects which of the four. `chat
  make` / `forum make` survive as **sugar** (subject-make + light-up in one
  step; default popularity/free). `make` = create-new (errors
  if the name's taken); `on` = attach-to-existing (gated by `Subject.owner`).
  A **board-subject's title is a flat-global handle** (case-insensitive,
  unique; `RESERVED_NAMES` carries over); a **thread-subject's handle is
  board-scoped** (`board/thread`). A plain thread is **promoted** to a
  thread-subject with its own chat via `forum <board> promote <thread>` →
  `chat on <thread>` (precedent: chat's `promoteAdHocToManaged`). A
  visibility-scoped `subject list` lifts today's `visibleChannels` (open
  subjects always shown; ref-backed shown to members) and shows each subject's
  lit surfaces.
- **Audience via the read-only facade.** Subjects bind a `GroupRef` resolved
  **read-only** through `GroupApi` (`managed` / `mql` / `contacts` providers);
  membership is the eligibility gate. **Base roles come from the ref** (managed
  groups carry owner/admin/member); `Subject.owner` gates mutations, mirroring
  today's `Channel.owner`. The per-surface **override** layer (board-local
  bans/pins/mods-beyond-rank) is **NOT in v1** — aspirational in chat today,
  deferred here too.
- **Subsystem doc** `docs/subsystems/forums.md` graduates at finalize.

## Non-goals

- **The argument-forum surface (structure organizer / argument-map)** — typed
  claim-graph, `supports`/`objects-to`/`responds-to` edges, deliberation verbs,
  structure GUI — the next cycle
  ([argument-map-slate.md](../slates/builds/argument-map-slate.md)). It's
  declarable in the four-surface taxonomy and cycle 1 ships the `organizer`
  field + generic typed-edge *storage shape* so it's a later surface, not a
  schema migration; **no structure behavior is built**.
- **Ephemeral-subject lifecycle** — the bill/event auto-archive: the external
  lifecycle trigger + the **archive cascade** (on-floor → passed → archived).
  Thread-grain manifestation itself is now *in scope* (promote-a-thread), but
  promoted thread-subjects are **standing** (manually disbanded); the
  ephemeral/auto-archive mechanism + governance trigger defer to Part 2 / co-op.
- **Governance integration** — the caller that mints/archives bill-subjects on
  the legislative lifecycle (cooperative-slate).
- **Trust-weighted votes; votes → producer-standing / co-op money** — the
  cooperative-slate's feedback-economy wiring. v1 votes drive discovery only.
- **The rules-of-order chat surface (`procedure: 'rules-of-order'`); chat
  `logged` retention + `chat_log`** — deferred (parked); cycle 1 chat is
  free-procedure only. (Declarable in the taxonomy; behavior deferred.)
- **A string-less structured dispatch path** as a general write channel — the
  structured payload is **always** a side channel attached to a real command
  string, never a replacement. (Char-gen's command-string construction is the
  intended pattern, not a hack to migrate; no refactor of it in this cycle.)
- **Reactions on entries** — reusing the act-scoped reaction layer on persisted
  entries is an open bridge ([forums-slate](../slates/builds/forums-slate.md)
  open questions); deferred.
- **External-reality bindings** (mirror a forum from an external service).

## Surface decisions

### Unified primitive, per-board organizer; popularity now
One board primitive; `organizer ∈ {'popularity','structure'}` selects ordering
+ vote semantics. Cycle 1 builds `'popularity'` (votes order siblings, strict
reply-tree). `'structure'` deferred. The override of the prior factoring
(social-forum-as-chat-facet / argument-map-as-not-a-forum) stands; ungameability
is preserved for the deferred structure organizer (votes sense, never order).

### Hierarchy `Board → Thread → Post`
All three are `Entry`-or-container Documents: a Thread is a root `Entry`
(submission), a Post a child `Entry` (comment). A Board is a venue holding many
Threads. (One root proposal per thread is a *structure*-organizer rule, not
relevant to popularity.)

### The four surfaces (a subject lights up 1–4)
A subject declares **any non-empty subset of four surfaces**, at most one of
each:
- **popularity forum** — a `Board`, `organizer: 'popularity'` (vote-ranked
  reply tree). **[cycle 1]**
- **argument forum** — a `Board`, `organizer: 'structure'` (typed claim-graph /
  argument-map). **[deferred — Part 2]**
- **free chat** — a `Channel`, `procedure: 'free'` (free-flowing stream; the
  existing chat). **[cycle 1]**
- **rules-of-order chat** — a `Channel`, `procedure: 'rules-of-order'`
  (recognized-speaker discipline). **[deferred — parked]**

So *forum* = {popularity, argument} (the two organizers) and *chat* = {free,
rules} (the two procedures); a subject may hold **both** organizers and/or
**both** chat procedures at once (e.g. a bill: argument forum + rules-of-order
chat + a free chat). The per-board organizer axis still holds — each `Board` is
one organizer; a subject just composes up to two boards + two channels. Cycle 1
**implements popularity-forum + free-chat**; argument-forum + rules-chat are
reserved surface types built later (the taxonomy ships now).

### Subject grain-polymorphic; board + thread grain in cycle 1
A surface manifests at the subject's grain: a **venue** (board-grain: a `Board`
/ board-wide `Channel`) or a **promoted topic** (thread-grain: a `Thread` on a
parent board / thread-scoped `Channel`). Cycle 1 exercises both grains — board
(standing subjects: gossip, guild) and **thread** (promote-a-thread →
thread-subject + its own surfaces). Promoted thread-subjects are **standing**;
only the **ephemeral lifecycle + archive cascade** (bills) + governance trigger
remain deferred.

### Source of record: CRUD + `forum_events` (dual-write)
Documents are truth; `forum_events` is an append-only faithful mirror serving
**audit + archive** (the durable twin). Not full event-sourcing — the log is
never the rebuild source. Follows the `chronicle` precedent (silent append).

### Change propagation: persist-then-fire on `EventApi`
A mutation in `ForumsLogic` (1) updates CRUD docs, then (2) via a single
`record(event)` helper **appends the `forum_events` row** (`Document.save` —
silent) **and fires a transient `ForumEventFired` on `EventApi`**. The two are
independent siblings — the write doesn't fire the event (no change-stream;
`save()` is silent) and the event doesn't cause the write (not event-sourced).
Persist-then-fire so no listener observes a live event whose durable row is
missing. Mirrors the existing `fireFieldChange` → `EventApi.fire` pattern.

### Reads: a subscription engine on the bus (not a Mongo tail)
The extracted engine **listens on `EventApi`** (`EventApi.on(ForumEventFired)`),
routes via a dependency index, batches on `setImmediate`, and **re-resolves
current-state docs** to diff → delta — the `MqlSubscriptionRegistry` pattern. It
does **not** tail `forum_events` (that's the durable twin, read only for
history/backfill/audit). Reads = subscription deltas + structured query for
pagination/lazy subtree. The engine is shared platform infra (wiki/CMS later).

### Writes: command string canonical + a structured body side-channel
The command **string is the canonical channel** — the GUI builds **real command
strings** (verb + selectors), so every action is scriptable / aliasable /
replayable and legible to future string-riding capabilities (scripting). Bus
primacy + validators + response envelope ride the parsed string. For input that
can't sit on a command line (a multi-line post **body**, form fields), the
string carries an **optional structured payload** — HTTP method+path vs body —
on the existing `{type:'command', payload:{ text, fields? }}`; `fields` fills
only **YAML-designated body args**, overlaid after the string parses. **Used
sparingly** (post/reply/edit only) and **never a replacement**: no string-less
dispatch path is exposed to clients (`assembleFromStructured`'s string-less mode
stays an internal/test helper). The CLI supplies body args inline / via prompt;
the GUI via `fields` — same parsed command either way. (Char-gen's
`enroll species elf` string-building is the *intended* pattern, not a hack —
only its free-text fields would ever use the side-channel.)

### Vote mechanics
Up/down **toggle** (up → none → down), one row per `(entry, voter)` in
`forum_votes` + a denormalized `up`/`down` aggregate on the Entry; each cast
dual-writes a `vote-cast` event → live delta. Net `up − down` →
**new / top / hot / controversial** (hot = `sign(net)·log10(max(|net|,1)) +
createdAt/45000`; exact constants are deferred tuning). Sorts apply at the
thread-list **and** comment-sibling levels.

**Self-vote: auto-upvote own (Reddit-style)** — your entry starts at +1,
locked (the author's vote row is fixed `up`).

**Anti-snowball: hide-until-threshold (display only).** The server **ranks on
true scores always**; the displayed number is suppressed (placeholder) until
**K votes OR T minutes** since creation (configurable via app-settings).
Vote-fuzzing + randomized early exposure deferred.

**Discovery-only / flat one-vote** — audience members only; not wired to
standing/money; trust-weighting deferred. The single-thumb-conflation / pile-on
risks are acknowledged cooperative-slate concerns for the later multi-axis
treatment.

### Aether: a born-with `ForumsUpdate`, not a separate implant
Forums are a **hosted update on the existing aether implant**, exactly like
DMs: `ForumsUpdate = ForumsMixin(AetherHostedMixin(Idea))`, hosted on the
`AetherMixin` attunement (the `AetherImplant` is the host; updates plug into
it). **No new physical implant.** The Avatar already clones + `hostUpdate`s a
`CommsUpdate` + a travel credential at loadout (`Avatar.ts`); forums add a
third hosted update there (born-with). The update confers read + post;
attunement-only lurking deferred.

### Chat retrofit: the Subject layer is shared substrate (Wave 0)
The Subject sits *between* a surface and its audience: today `Channel` binds a
`GroupRef` directly; now `Channel → Subject → GroupRef`. So introducing
Subjects **refactors chat**: `Channel` loses `owner` + `groupRef` (up to the
Subject), gains a `subject` ref; the three kinds map (player-created → curated /
open-join-standalone → open / ad-hoc → runtime-only, no subject). This is
cycle-1's foundational wave; forums add a Board surface on the same layer.

### Verb model: `subject` + `on`, with `make` as sugar
`subject make <name>` owns identity + audience binding (default: mint a managed
group — the curated case; `--group <ref>` / `--open` otherwise). `forum on
<subject> [--argument]` (default popularity) / `chat on <subject> [--rules]`
(default free) light up one of the four surfaces. `chat make` / `forum make`
are one-step sugar (create-subject + light-up, default popularity/free)
preserving today's ergonomics.
`make` create-new (name-collision = error); `on` attach-to-existing (gated by
`Subject.owner`). A plain thread is **promoted** to a thread-subject (its own
chat) via `forum <board> promote <thread>` → `chat on <thread>` — precedent:
chat's `promoteAdHocToManaged`. Bills/governance reuse the *API* (`subject`
mint + light-up) but not the player verbs (deferred).

### Follow grain: per-subject, with per-surface mute
One `follow <subject>` tunes all the subject's surfaces; `mute <subject>:<kind>`
silences one. Subscription state migrates from per-channel to per-subject.

### Discovery: title-as-handle, visibility-scoped
A **board-subject's** `title` is a flat-global handle (unique,
case-insensitive); a **thread-subject's** handle is **board-scoped**
(`board/thread`). `subject list` lifts `visibleChannels`: open subjects always
listed; ref-backed subjects listed to members; each row shows lit surfaces.

### Thread promotion + the nested chat rail
A plain thread is a child Entry under the board-subject (no chat of its own); a
**promoted** thread becomes its own thread-subject with a thread-scoped chat
(and, in the deliberation cycle, an argument-map). The GUI presents chat as a
**contextual sidecar stacking the subjects on the current path** — the board's
chat at the board, the thread's chat when you open a promoted thread (parent
still reachable). Promoted thread-subjects are **standing** in cycle 1 (no
auto-archive).

### Client IA: forum is a primary view in the cockpit (not a phase)
The shell has no router — a `connectionPhase` machine + a terminal-centric
cockpit (Frame / LeftColumn[TabStrip+Terminal+CommandBar] / 360px
InspectionPane). The forum is **not** a new phase (that would hide the
terminal/command-bar — a leave-the-game context switch). It's a **new
primary-view axis inside the in-world cockpit**: a `mainView: 'terminal' |
'forum'` switch renders `Terminal` or `ForumView` in the LeftColumn content
slot, while **Frame + CommandBar persist** and the **right column is
view-sensitive** (terminal → `InspectionPane`; forum → the chat sidecar).
**Live awareness persists** in the forum view (scene says/emotes/DMs surface as
a peek/toast). The existing `TabStrip` is filter-tabs and stays *inside* the
Terminal view (a different axis). Navigation is **verb-driven** (`forum` /
`forum <board>` sets `mainView` + the forum nav target) and click-driven (the
view switch). This encodes the diegetic split: **forum = in-cockpit view;
out-of-fiction tools (CMS / wiki / settings) = a separate phase/overlay.**

### Roles & moderation: base roles from the ref; no override in v1
Base roles come from the bound `GroupRef` provider (managed groups carry
owner/admin/member); `Subject.owner` gates mutations. The per-surface override
layer (board-local bans/pins) is aspirational in chat and **not built in v1**.

## Constraints

- **Module taxonomy** (CLAUDE.md — do not invent categories): `Subject` +
  forum Documents (`Board`/`Entry`) + `ForumsMixin` + the `ForumsUpdate` hosted
  update (`ForumsMixin(AetherHostedMixin(Idea))`, sibling to `CommsUpdate`) in a
  **new `lib/forum/` subsystem folder** (a new subsystem is permitted; a new
  module *category* is not). `SubjectCatalogue` = singleton `Idea` in `obj/`.
  `ForumsApi` in `api/forums.ts` (thin gated facade, ends with
  `SecurityApi.decorateApiClass`). `ForumsLogic` in `obj/api/ForumsLogic.ts`.
  Verb YAML in `mud/cmd/social/`, controllers in `obj/command/social/`. The
  structured **body side-channel** rides the existing `command` inbound in
  `backend/inbound/` (an optional `fields` payload overlaid onto body-typed
  args — *not* a new string-less inbound). The extracted
  subscription engine generalizes the existing `MqlSubscriptionRegistry`
  (placement: planner's call — must not regress it).
- **Chat retrofit touchpoints.** Moving `owner`+`groupRef` off `Channel` onto
  `Subject` + adding a `subject` ref touches `Channel`, `ChannelCatalogue`
  (subsumed by / delegating to `SubjectCatalogue`), the per-channel subscription
  store (migrated to per-subject), and chat discovery (`visibleChannels` →
  `visibleSubjects`). **Existing chat behavior must not regress** — player-
  created and open channels keep working, exposed as curated/open subjects.
- **Bus primacy.** All mutations funnel through the command/dispatch chokepoint;
  the `command` inbound (string + optional body side-channel) feeds the *same*
  chain (so NPCs/quests/systems observe forum actions). Controllers return
  `void`; outcomes ride the dispatch-response envelope (no `{success}` returns).
- **Go through the Api layer; methods-only inter-stuff contract; `Mixins`
  registry constants; `ScheduleApi` over bare timers** — per CLAUDE.md /
  antipatterns.
- **`forum_events` is append-only** — never mutated or deleted in normal
  operation (chronicle invariant; the tamper-evident substrate the structure
  organizer will require).
- **No regression of MQL-subscription / the inspection pane** — the engine
  extraction must keep MQL-sub working unchanged.
- **New Mongo collections** registered with the `PersistenceManager`:
  `forum_subjects`, `forum_boards`, `forum_entries`, `forum_votes`,
  `forum_events`. Documents persist via the `Document` base; persistent fields
  public for the Hydrator.
- **`GroupRef` is read-only through `GroupApi`** — subjects consume membership,
  never own it. A backing managed `Group` is minted **only for the curated
  case** (chat-make precedent); `guild:`/`mql:`/`contacts:`/open subjects bind
  an existing ref and mint nothing.
- **Breadth → waved plan.** The cycle spans the shared Subject layer + a chat
  retrofit, the forum server substrate, an append-only log, a generic
  subscription engine, the command body side-channel, and a React GUI. The plan
  should sequence it in waves — **Wave 0: Subject layer + chat retrofit** (the
  shared foundation) → forum board substrate → event-log → subscription engine +
  body side-channel → React GUI — each independently testable.
- **TypeScript strict** (`noUncheckedIndexedAccess`, no unjustified `any`);
  `#` vs TS-modifier privacy per the layer rules; new Apis self-decorate.

## Acceptance criteria

- **Substrate.** Tests cover `Subject`/`Board`/`Entry` create/read/update +
  persistence round-trip through their collections; a Board belongs to a
  Subject; a Thread holds a Post reply-tree.
- **Dual-write.** Every mutation appends exactly one `forum_events` row; the log
  is append-only (a test asserts no in-place mutation); current-state docs match
  the replayed log for a sample sequence.
- **Voting.** Up/down is a per-`(entry,voter)` toggle (up→none→down) in
  `forum_votes` with a denormalized entry aggregate; an own entry starts at +1
  (locked); a cast appends a `vote-cast` event and the score updates live via a
  subscription delta.
- **Sorts.** new/top/hot/controversial produce the expected order at both the
  thread-list and comment-sibling levels.
- **Anti-snowball.** The displayed score is hidden until K votes / T minutes,
  but server-side ranking uses true scores throughout (a test asserts ranking
  is unaffected by the display gate).
- **Vote limits.** Only audience members can vote; one vote per account; votes
  are not wired to any standing/money surface.
- **Aether capability.** A holder whose aether hosts a `ForumsUpdate` is
  afforded the `forum` verbs (reached via `findReachable` host-descent); one
  without is not; the Avatar loadout hosts a `ForumsUpdate` at spawn
  (born-with) — covered by a test.
- **CLI.** An implanted player can `forum make`, post a thread, `reply`, `vote`,
  `list`/sort, and `read` — each observable through the dispatch-response
  envelope.
- **Body side-channel.** A `{text, fields}` command parses the string and
  overlays `fields` onto body-typed args, running the same validate → controller
  → envelope chain; a body-bearing verb behaves identically whether the body is
  supplied inline (CLI) or via `fields` (GUI); **no string-less dispatch path is
  exposed** to clients; a malformed payload is rejected without bypassing
  validation.
- **Subscription engine.** A client opens a forum subscription and receives an
  initial snapshot then deltas as the underlying entries change; a forum
  mutation both appends a `forum_events` row **and** fires an in-process
  `ForumEventFired` that drives the delta (persist-then-fire; neither is a
  side-effect of the other); the engine listens on `EventApi`, not a Mongo tail;
  MQL-sub / inspection-pane tests still pass (no regression).
- **GUI.** The React forum view renders a board → thread → post-tree live;
  casting a vote sends a plain command string (`forum vote …`) and the score
  updates via subscription without a manual refresh; posting/replying sends a
  command string with the body on the `fields` side-channel, and the new entry
  appears via delta.
- **Chat retrofit.** Existing player-created and open channels keep working,
  now exposed as curated/open `Subject`s with a chat surface; `Channel` carries
  a `subject` ref and no longer its own `owner`/`groupRef`; existing chat tests
  pass (no behavioral regression).
- **Verb model.** `subject make` creates a subject (default: mints a managed
  group); `forum on` / `chat on` attach surfaces to it; `chat make` / `forum
  make` sugar still create-and-light-up in one step; `make` on a taken name
  errors; `on`/attach is denied to a non-owner.
- **Chat↔forum linking.** A subject with both surfaces lit shares one
  `GroupRef`; removing a member from the backing managed group removes them from
  both surfaces.
- **Follow.** One `follow <subject>` tunes the actor into all lit surfaces;
  `mute <subject>:<kind>` silences one without un-following; migrated
  subscription state round-trips.
- **Discovery.** `subject list` shows open subjects to everyone and ref-backed
  subjects only to members, each with its lit surfaces; a board-subject
  resolves by its flat title handle, a thread-subject by its board-scoped
  handle (`board/thread`), both case-insensitive.
- **Thread promotion.** A plain thread promotes to a thread-subject with its
  own chat (`promote` + `chat on`); the thread-subject is addressable by its
  board-scoped handle; its chat is distinct from the board's chat; following
  the thread-subject is independent of following the board-subject.
- **Nested chat (GUI).** Opening a promoted thread surfaces its thread-scoped
  chat *alongside* the still-reachable board chat (the subject-path stack), not
  replacing it.
- **Client IA.** Switching to the Forum view keeps the Frame + CommandBar
  mounted (a command can still be typed) and swaps the right column to the chat
  sidecar; the terminal is one switch away; the `forum` verb flips `mainView` to
  the forum and navigates; a live scene event surfaces while the Forum view is
  active (live awareness not severed). It is **not** a `connectionPhase` swap.
- **Docs.** `docs/subsystems/forums.md` exists and documents the substrate,
  organizer model, Subject/hierarchy, the event-log + subscription engine, and
  the client channels.

## Cross-references

- **Seeding slate:** [forums-slate.md](../slates/builds/forums-slate.md)
- **Deferred next cycle:**
  [argument-map-slate.md](../slates/builds/argument-map-slate.md) (structure
  organizer), [cooperative-slate.md](../slates/builds/cooperative-slate.md)
  (feedback economy, governance lifecycle),
  [delivery-slate.md](../slates/builds/delivery-slate.md) (superseded forum
  factoring; retained transport/audience framing)
- **Reused subsystems:** [chat.md](../subsystems/chat.md),
  [grouping.md](../subsystems/grouping.md), [comms.md](../subsystems/comms.md),
  [augmentation.md](../subsystems/augmentation.md),
  [reactions.md](../subsystems/reactions.md) (threading),
  [chronicle.md](../subsystems/chronicle.md) (append-only-log precedent),
  [mql-subscription.md](../subsystems/mql-subscription.md) (engine to extract),
  [command-routing.md](../subsystems/command-routing.md),
  [command-parsing.md](../subsystems/command-parsing.md),
  [response-envelope.md](../subsystems/response-envelope.md),
  [inspection-pane.md](../subsystems/inspection-pane.md) (subscription consumer
  precedent)
