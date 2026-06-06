# Console foundations — requirements

The cockpit's terminal is currently a single scrolling firehose with
no in-cockpit tools for managing it. This build introduces the
foundational shape for how players consume server messaging: a
**tabbed terminal** with **per-tab topic filtering**, a **delimiting
left-edge gutter** that exposes each frame's topic and provides
per-frame actions, and a **topic catalogue substrate** that turns the
topic vocabulary into authored content so players can learn it and
the future help system can tap in. This is "console v1" — the
incremental step the eventual hybrid (multi-visible split terminals,
chat-channel tabs, sender filtering, search) builds on.

Seeded by [docs/slates/console-filtering-slate.md](../slates/console-filtering-slate.md);
also reshapes the single-terminal picture in
[docs/slates/client-cockpit-slate.md](../slates/client-cockpit-slate.md)
and consumes the per-topic stylesheet model from
[docs/slates/message-rendering-slate.md](../slates/message-rendering-slate.md).

## Goals

### Client cockpit

- **Tabbed terminal** replaces the single Terminal component. Tabs
  are user-creatable named filter scopes. One uncloseable default
  tab ("All") catches everything.
- **Per-tab filter state** (a list of muted topic paths) persists
  per-character via the new `ClientStateMixin` substrate (see
  Server substrate (client state) below).
- **One command bar** continues to serve all tabs; tab does not
  affect command routing in v1.
- **Tab unread badge** counts frames that arrived since the player
  last had this tab active; switching to a tab clears its badge.
- **Per-tab scroll position** preserved across tab switches.
- **Auto-scroll-to-bottom** only when the active tab is already at
  the bottom; otherwise leave the player in place and surface a
  "jump-to-bottom" affordance.
- **Filter drawer** opens from a gear icon on the tab strip; edits
  the active tab's muted set. Tree of topics with friendly labels
  (raw dotted path on hover); family checkboxes toggle their leaves;
  per-leaf and per-family count badges of frames muted since session
  start.
- **Hybrid topic discovery** — drawer is seeded with the static
  catalogue and auto-extends when a frame on a previously unseen
  topic arrives.
- **Left-edge gutter stripe** per frame: colored by topic,
  vertical-spans the frame, provides hover-tooltip (friendly label
  + raw path + description + timestamp) and click-popover (mute /
  solo / open new tab filtered / mute family). The gutter is the
  frame-inspection surface; no right-click is used.
- **No new global gestures** introduced. Right-click stays reserved
  for the future cockpit-wide story; left-click on inline tags
  retains its current "send default command" behavior.

### Server substrate (topic catalogue)

- A new **`lib/messaging/` subsystem dir** owning topic
  substrate (and the right home for future messaging substrate
  as it lands). The dir starts with `Topic.ts`; it earns its
  keep by being the right category for messaging concerns, not
  by initial size.
- A **`Topic extends Idea`** class at
  `packages/server/src/mud/lib/messaging/Topic.ts` with
  persistent fields `topic`, `family`, `label`, `description`
  and `TEMPLATE_PATH_PREFIX = '/lib/messaging/Topic/'`.
  Per-topic instances live at
  `/lib/messaging/Topic/<dotted-path>` (mirrors Biome's
  `/lib/biome/<name>` per-instance shape).
- A **`TopicCatalogue` singleton Idea** at
  `packages/server/src/mud/obj/TopicCatalogue.ts` (sibling to
  `EventRegistry` in `obj/` per the singleton-in-`obj/`
  convention) holding the runtime cache + accessor surface,
  populated lazily from `/lib/messaging/Topic/` instances, with
  auto-fallback for missing descriptors and HMR-aware
  invalidation.
- **Initial seed YAMLs** at
  `seeds/lib/messaging/Topic/<dotted-path>.yaml` for every
  existing topic string (leaves + families), plus
  `seeds/obj/TopicCatalogue.yaml` for the singleton.
- **Wire push of the catalogue snapshot** to the client on
  session-establish; client caches for the session; no live updates.
- A new subsystem doc **`docs/subsystems/topics.md`** describing the
  `Topic` class, `TopicCatalogue` singleton, auto-fallback, and
  wire push.
- `MessageApi`'s existing internal nested topic-string const
  (`TOPICS`) stays where it is. It's purely an autocomplete
  convenience for server-internal call sites; it is *not* lifted,
  *not* exported, *not* mirrored.

### Server substrate (client state)

This build also stands up the **first substrate for client-UI
state persisted server-side** — a recurring category that's
neither `settings` (player-tunable knobs) nor `PropertiedMixin`
(universal per-Stuff bag). Console foundations is the first
consumer; theme, notification preferences, keybinds, channel
mutes, saved MQL queries, and onboarding state will land on the
same substrate as they ship.

- A new **`lib/client/` subsystem dir** for server-side
  substrate that supports clients (any client — the React
  cockpit is the first, but mobile / admin tools / future
  cockpit variants would all live under the same category).
  `ClientStateMixin` is its first inhabitant.
- A **`ClientStateMixin`** at
  `packages/server/src/mud/lib/client/ClientState.ts` composed
  onto Avatar (and any future Stuff that has a client attached).
  Carries a single `_clientState` persistent field; exposes
  `getClientState` / `setClientState` / `snapshotClientState`.
  Features contribute keys + defaults via the schema-on-mixin
  pattern (`static clientStateSchema: ClientStateSchemaEntry[]`).
- A **generic wire path** for client mutations:
  - `client-state-write` inbound message
    (`{ key: string, value: unknown }`); server validates the
    key against the schema chain and calls
    `avatar.setClientState`.
  - `clientState: Record<string, unknown>` on
    `ConnectionEstablishedPayload`, populated by
    `avatar.snapshotClientState()` at session-establish.
- **Console foundations contributes its schema** via a small
  console-state mixin (or directly on Avatar's class chain —
  planner's call) declaring `console.tabs` and
  `console.activeTab` with their defaults.
- A new subsystem doc **`docs/subsystems/client-state.md`**
  describing the mixin, the schema-on-mixin contribution
  pattern, the wire surface, and the contrast with `settings`
  and `PropertiedMixin`.

### Shared

- A new `TopicDescriptor` interface in **`@saxonberg/types`**
  carrying `{ topic, family, label, description }` — the wire-safe
  payload shape used by both the server-side snapshot and the
  client store.
- `ConnectionEstablishedPayload` is extended in two ways: a
  `topicCatalogue: TopicDescriptor[]` field (for the catalogue
  snapshot) and a `clientState: Record<string, unknown>` field
  (for the client-state snapshot). Both flow on the same
  session-establish handshake.
- A `ConsoleTab` interface in **`@saxonberg/types`** for the
  shape of an individual tab; client + server stay aligned on
  the structure even though the wire transports it as
  `unknown` inside `clientState`.
- **No `Topics` constants enum** is exported anywhere. Topic
  strings are raw at every wire boundary; the catalogue is the
  source of truth for everything beyond the string itself.

## Non-goals

- **Brief mode** (`prose.verbose = brief | full`) — deferred. The
  pane addresses the underlying verbosity pain structurally; revisit
  if a player asks. (Per
  [[feedback-dont-port-classic-mud-ergonomics]].)
- **Per-perceiver location memory** — deferred to a future
  generalized "perception memory" subsystem that absorbs the
  recognition-slate's actor-level work too.
- **Channel-mute axis** — chat-slate territory. Channels are
  server-side membership, distinct from the client-side topic
  filtering this build delivers. Channels will share the tab strip
  when they land.
- **Reactions display controls** — defer to reactions-slate.
- **Search (Ctrl-F across the scroll)** — Wave-3 surface in the
  slate; pull when content demands.
- **Sender filter (per-`stuff-id` "show only this person")** —
  Wave-3 surface; revisit when the global right-click story
  is settled.
- **Compact mode, permanent timestamps, author/admin frames
  toggle** — slate tail; ship when asked for.
- **Multi-visible split terminals** (the true hybrid) — explicitly
  v2; this build is the incremental step toward it.
- **Tab-scoped command-bar context** for chat-class verbs — needs
  chat-slate substrate first.
- **Tab reordering / drag-and-drop** — polish for later.
- **Live mid-session updates of topic descriptors** — descriptor
  edits land on next login; no subscription substrate for
  catalogue in v1.
- **Right-click context menus** anywhere — gesture reservation per
  [[feedback-reserve-global-input-gestures]].
- **A `describe-topic` authoring verb** — descriptors are edited
  through the existing workspace shell; dedicated verb is later
  polish.
- **A new `TopicCatalogueApi` class** — the `TopicCatalogue`
  singleton Idea's instance methods are the access surface (per
  [[feedback-no-new-apis-default]]).
- **A `lib/topics/` subsystem directory** — wrong category;
  topics are a messaging concern. The new dir is
  `lib/messaging/`, which is the right subsystem name even
  while it currently holds only `Topic.ts`. Per
  [[feedback-respect-lib-subsystem-categorization]].
- **Lifting `MessageApi`'s internal `TOPICS` const** — it stays
  internal to `MessageApi`. Server call sites keep their current
  autocomplete; clients receive topic strings via the wire and
  never need a typed mirror.
- **Any `Topics` constants export** from `@saxonberg/types` — only
  `TopicDescriptor` is shared; topic strings are raw.

## Surface decisions

### Frames are stored globally; tabs are filters over them

There is a single `frames` array (in Zustand): `{ id, topic, body,
sigil? }[]`. Each tab renders by filtering this array against its
muted set. Tabs do not own their own histories — switching to a tab
that's been inactive applies its filter retroactively over the full
history.

Rationale: keeps history coherent (un-muting retro-shows the frame),
avoids duplication, matches the slate's founding principle ("server
prints everything; client decides what to show") at the tab level
too.

### Each tab's filter is independent (no global mute layer)

Each tab has its own `muted: string[]`. There is no global mute
layer underneath. Muting in tab A does not affect tab B.

Rationale: simplest mental model — a tab is a complete view scope.
A player who wants "system never appears anywhere" creates a single
broad-mute tab and lives in it; "All" stays uncluttered for
diagnostic moments. The "global mute + per-tab inclusion overlay"
alternative was considered and rejected — heavier mental model with
no use case it uniquely enables.

### Muted leaves stored explicitly, not as path prefixes

`muted: string[]` contains leaf topic strings explicitly (e.g.
`['world.speech.say', 'system.shell.author']`). Family checkboxes
in the drawer expand to toggling every leaf currently known under
that family. There is no prefix-matching at filter-evaluation time.

Rationale: filter evaluation is trivial set membership; family
checkbox state is derived from leaf state at render; persisted form
matches actual behavior 1:1.

### Default filter — all on

Fresh players see every frame in every tab. Players opt in to
muting. Nothing is muted by default.

Rationale: opinion-free default. Players learn the taxonomy by
seeing the firehose and trimming what they don't want. Per
[[feedback-dont-port-classic-mud-ergonomics]] — don't pre-mute on
their behalf.

### Single command bar; tab does not scope commands in v1

The active tab is purely a view. Typed commands route to the world
exactly as today. Chat-class verbs (`say`, `tell`) keep their
current explicit-target semantics.

Rationale: the world is singular and the player has one mouth;
multiple command bars would imply parallel input contexts that don't
exist. Single bar is forward-compatible: when chat lands, the active
tab can implicitly scope chat verbs without a UI-shape change.

### Gutter is the frame-inspection surface; right-click is unused

Every frame renders with a left-edge color stripe (2-3px wide,
vertical-spans the frame, color derived per-topic and clustered by
family). Hover → floating tooltip (label + raw path + description +
timestamp); click → action popover (mute in tab / solo / open in
new tab filtered / mute family).

Right-click is not bound on frames or anywhere else in this build.

Rationale: the gutter must exist anyway for visual delimitation and
topic-color cues (aligning with the message-rendering slate's per-
topic stylesheet model); layering inspection onto it is natural and
free. Reserves right-click for the future cockpit-wide global-
gesture story per [[feedback-reserve-global-input-gestures]].

### No code-side `Topics` constants mirror; raw strings at boundaries

`MessageApi`'s internal nested `TOPICS` const stays where it is —
it's an autocomplete convenience for server-internal call sites,
nothing more. There is no separate code-side constants file
mirroring the vocabulary, no `Topics` export from
`@saxonberg/types`, and no MessageApi lift. Topic strings cross
the wire raw; the `TopicCatalogue` is the source of truth for
everything *beyond* the string itself (label, description,
family).

Rationale: a typed mirror buys autocomplete the server already
has internally and adds a parallel "vocabulary truth" alongside
the catalogue content; the client never needs to type a literal
topic string (frames carry their topic; the catalogue carries the
rest); two files for what amounts to a small set of substrate
classes don't justify a dedicated subsystem dir.

### Topic descriptors are content — per-topic Idea templates

Each topic (every leaf and every family) gets a `Topic` Idea
template stored at `/lib/messaging/Topic/<dotted-path>` with
persistent fields `topic`, `family`, `label`, `description`.
Initial set seeded via per-topic YAMLs at
`seeds/lib/messaging/Topic/<dotted-path>.yaml`. Authors edit
through the existing workspace shell.

Rationale: descriptors are authored prose, which is content, which
lives in the database (same pattern as Species / Material / Biome).
Per-topic documents (not a singleton with hundreds of props)
because "it's gonna get huge" is the design assumption; per-entity
files matches authoring ergonomics and keeps edits non-conflicting.

### Catalogue snapshot pushed on session-establish, cached for session

Server pushes the in-memory `TopicCatalogue` snapshot to the client
on session-establish, alongside the existing connection bootstrap.
Client caches for the session. Mid-session descriptor edits land on
next login.

Rationale: catalogue is small enough to ship as one snapshot;
descriptors don't change mid-play in practice; avoids a subscription
substrate this build doesn't need. The pattern is forward-compatible
with later moving to MQL-subscribed live updates if real demand
appears.

### Tab gestures: inline edit, no prompt-stack involvement

Tabs are client-only view state, and tab management gestures live
in the tab strip itself rather than routing through the CommandBar
prompt slot:

- **Create.** Left-click a `+` affordance at the end of the tab
  strip. A new tab appears in the strip in edit mode with its name
  field focused. Enter commits; Escape removes the in-progress tab.
- **Switch.** Left-click the tab.
- **Rename.** Double-click the tab name (or click a hover-revealed
  pencil icon) → the name field activates with current text →
  Enter commits, Escape reverts.
- **Delete.** Hover-revealed `×` icon on the tab. Click `×` →
  small confirm popover anchored to the icon ("Delete 'Guild
  Chat'? [Delete] [Cancel]"); click-outside cancels. The "All" tab
  has no `×` (uncloseable).

No right-click is bound on tabs (per
[[feedback-reserve-global-input-gestures]]).

Rationale: tabs are pure client state; routing creation through the
prompt-stack substrate would (a) misuse a substrate built for
server-driven question-asking, and (b) put the text input in a
visually-distant location (CommandBar) from the thing being
created (tab strip). Inline edit is the modern web pattern (Slack,
Discord, browser tabs); users already know it; the input lives
where the result lives.

### Custom topics auto-fallback at lookup time, inheriting from family

The catalogue accessor never returns "not found." On lookup:

1. If the topic has an authored `Topic` template, return it.
2. Otherwise walk the family chain (split by `.`, drop last
   segment, repeat) looking for an authored ancestor. If
   found, derive an entry: `label` = `<family-label>
   (<last-segment-titlecased>)`, `description` = the family's
   description, `family` = the matched family path.
3. Otherwise default: `label` = last segment titlecased,
   `description = '(no description)'`, `family` = path prefix.

Rationale: same liveness principle as `EventRegistry`'s
auto-registration; new topics don't have to ship simultaneously
with their descriptors. The family-inheriting step scales
dynamic-topic generators like `MudlogApi` — leaves emitted as
`system.log.command.{info,warn}` inherit useful labels from the
authored `system.log.command` family descriptor, no per-leaf
hand-seeding required. Authors override per-leaf by writing a
specific Topic seed; the cache hit at step 1 wins.

### Contrast with `EventRegistry` (architectural intent)

`EventRegistry` is a singleton Idea holding transient per-event
properties; its seed is empty (`data: {}`) because the meaningful
state (access-policy closures) doesn't serialize. The code-side
`Events` enum is the vocabulary; the Idea is the runtime gate.

`TopicCatalogue` diverges in two ways: (a) its content half is
**persistent authored prose** (per-topic `Topic` Ideas at
`/lib/messaging/Topic/<path>`) rather than transient closures,
and (b) it
has *no* code-side vocabulary mirror — `MessageApi`'s internal
`TOPICS` const is for server-side autocomplete only. The
catalogue accessor populates from the `Topic` instances rather
than walking a code enum. This contrast is captured explicitly
in `docs/subsystems/topics.md`.

## Constraints

- **Frame store moves into Zustand.** Today `App.tsx:209` holds
  `messages: useState<string[]>`; the migration to a typed Zustand
  slice is in scope because topic-keyed entries are load-bearing
  for filtering.
- **Sigil prefix held alongside the frame, not baked into the body.**
  Today the echo-paired sigil is concatenated into the body string
  at `App.tsx:305`; the renderer should hold the body clean and
  concatenate the sigil at render time. Topic classification stays
  clean.
- **Subscribe-to-all on the wire client.** `WebSocketClient.onTopic`
  is exact-match today; the build adds a single catch-all delivery
  path so frames on never-seen topics still reach the store. The
  static topic list in `App.tsx:271-289` is removed in favor of
  catch-all delivery + the typed catalogue.
- **`Topic extends Idea` follows existing Idea conventions:** per-
  field invariants on setters (per
  [[feedback-field-invariants-on-setters]]); persistent fields are
  public so the Hydrator can reflect into them; field naming uses
  the bare conceptual name (per
  [[feedback-template-path-field-naming]] applied generally).
- **TopicCatalogue is a singleton Idea**, not a module nor an
  Api class. Matches the `EventRegistry` precedent exactly: lives
  at `/obj/TopicCatalogue`, seeded by
  `seeds/obj/TopicCatalogue.yaml` (`{ class: /obj/TopicCatalogue,
  data: {} }`), composes `PostRegistrationMixin(Idea)`. The cache
  is transient instance state; the source of truth lives on the
  per-topic `Topic` Ideas at `/lib/messaging/Topic/`. Resolves via
  `StuffApi.findByTemplatePath('/obj/TopicCatalogue')` and
  dispatches instance methods through the standard security gate.
  No `TopicCatalogueApi` (per [[feedback-no-new-apis-default]]);
  the Idea instance is the access surface.
- **Per-character console state lives on the new
  `ClientStateMixin` substrate**, not on `settings` and not on
  `PropertiedMixin`. Settings are for player-tunable knobs via
  the `settings` command (per
  [[feedback-settings-vs-propertied-vs-client-state]]);
  PropertiedMixin is the universal per-Stuff bag and must not be
  widened with client-cares concerns (per
  [[feedback-dont-widen-substrate-for-narrow-concerns]]).
  `ClientStateMixin` is composed onto Avatar (and any future
  Stuff that has a client attached), carries the
  `_clientState` persistent field, and exposes
  `getClientState` / `setClientState` / `snapshotClientState`.
  Each feature contributes its keys + defaults via a schema-on-
  mixin pattern. Console foundations contributes `console.tabs`
  (default `[{ name: 'All', muted: [] }]`) and `console.activeTab`
  (default `'All'`).
- **No premature registries** (per
  [[feedback-no-premature-registries]]). The catalogue is built
  from a path scan at boot, not from a dynamic-registration API.
- **Friendly-label fallback derivation** lives in the catalogue
  accessor, not at the call site. Renderers always receive a fully
  populated descriptor; they never branch on "missing entry."
- **No new global gestures introduced** (per
  [[feedback-reserve-global-input-gestures]]). Right-click stays
  uncommitted.

## Acceptance criteria

### Client behavior

- [ ] Frames live in Zustand as `{ id, topic, body, sigil? }`; the
      `App.tsx` `useState<string[]>` is removed.
- [ ] Inbound frames whose topic is not in the catalogue still
      reach the store via a catch-all wire path.
- [ ] A tab strip renders above the Terminal. The default "All"
      tab is uncloseable (no `×` icon).
- [ ] Create: a `+` affordance at the end of the tab strip spawns
      a new tab in-place in edit mode with the name field focused;
      Enter commits, Escape removes the in-progress tab.
- [ ] Rename: double-click on a tab name (or click a hover-revealed
      pencil icon) activates the name field; Enter commits,
      Escape reverts.
- [ ] Delete: a hover-revealed `×` on each non-"All" tab opens a
      confirm popover anchored to the icon; click-outside cancels.
- [ ] No prompt-stack involvement for any tab management gesture.
- [ ] No right-click handler bound on the tab strip.
- [ ] Switching tabs is instant and preserves per-tab scroll
      position.
- [ ] An inactive tab's badge increments with frames matching its
      filter; activating the tab clears its badge.
- [ ] Auto-scroll fires only when the active tab is already at the
      bottom; otherwise a "jump to bottom" affordance is visible.
- [ ] A gear icon on the tab strip opens the filter drawer for the
      active tab. The drawer shows a topic tree with friendly
      labels; raw dotted paths reveal on hover. Family checkboxes
      toggle their currently-known leaves.
- [ ] Per-leaf and per-family mute-count badges in the drawer
      reflect frames suppressed since session start.
- [ ] Drawer auto-extends with newly-seen topics that weren't in
      the seed catalogue.
- [ ] Every frame renders with a left-edge color stripe whose
      color is derived per-topic and clustered by family. Hover
      shows a tooltip with friendly label + raw path + description
      + timestamp. Click opens an action popover: *Mute in this
      tab*, *Solo in this tab*, *Open in new tab filtered to this*,
      *Mute family*.
- [ ] Tab list and per-tab `muted` lists persist via the
      `ClientStateMixin`'s `console.tabs` / `console.activeTab`
      keys on Avatar; client mutations round-trip through the
      `client-state-write` wire path; survive reconnect.
- [ ] Right-click on a frame, the gutter, the tab strip, or inline
      MML tags is a no-op (not bound).
- [ ] Existing inline-tag affordances unchanged: `<player>`,
      `<npc>`, `<item>`, `<exit>` left-click still sends the
      default command; hover preview still shows the command in
      the bar.

### Server substrate

- [ ] `Topic extends Idea` exists at
      `packages/server/src/mud/lib/messaging/Topic.ts` with
      persistent fields `topic`, `family`, `label`,
      `description`, the invariants on setters, and
      `TEMPLATE_PATH_PREFIX = '/lib/messaging/Topic/'`.
- [ ] `TopicCatalogue` singleton Idea exists at
      `packages/server/src/mud/obj/TopicCatalogue.ts`, composes
      `PostRegistrationMixin(Idea)`, has instance methods
      `getDescriptor`, `getSnapshot`, `invalidateCache`, and
      refuses `canDestruct`.
- [ ] Seed YAMLs exist at
      `seeds/lib/messaging/Topic/<dotted-path>.yaml` for every
      existing topic string (leaves + families); plus
      `seeds/obj/TopicCatalogue.yaml` for the singleton.
- [ ] Server pushes the catalogue snapshot on session-establish
      over the existing connection-established payload path.
- [ ] `TopicDescriptor` interface is exported from
      `@saxonberg/types`; client store consumes it. No `Topics`
      constants are exported from `@saxonberg/types`.
- [ ] `MessageApi`'s internal nested `TOPICS` const is unchanged
      (no lift, no mirror file, no `lib/topics/` directory).
- [ ] A new subsystem doc `docs/subsystems/topics.md` describes
      the `Topic` class, `TopicCatalogue` singleton, auto-fallback
      behavior, contrast with `EventRegistry`, and wire-push
      delivery.
- [ ] `ClientStateMixin` exists at
      `packages/server/src/mud/lib/client/ClientState.ts` and is
      composed onto Avatar. Persistent field `_clientState` round-
      trips through Avatar's save cycle. Schema-on-mixin walker
      concatenates each mixin's `static clientStateSchema` to
      build the effective key/default map. `getClientState` /
      `setClientState` / `snapshotClientState` work as specified.
- [ ] Console foundations contributes `console.tabs` and
      `console.activeTab` to the client-state schema (via a small
      console-state mixin or directly on Avatar's chain).
- [ ] Server accepts inbound `client-state-write` messages,
      validates the key against the schema, and persists via
      `avatar.setClientState` + `avatar.save()`.
- [ ] `ConnectionEstablishedPayload` carries
      `clientState: Record<string, unknown>` populated by
      `avatar.snapshotClientState()`; client store hydrates from
      it on session-establish.
- [ ] A new subsystem doc `docs/subsystems/client-state.md`
      describes the mixin, schema-on-mixin contribution, the wire
      surface, and the contrast with `settings` and
      `PropertiedMixin`.
- [ ] `CLAUDE.md` documentation map gains entries for both
      `topics.md` and `client-state.md`.

### Tests

- [ ] Zustand `frames`-slice tests cover: `appendFrame`,
      `clearFrames`, frame shape preservation.
- [ ] Zustand `clientState`-slice tests cover: snapshot
      hydration; `setClientState` optimistic update + wire
      emission (mocked); feature selectors return typed shapes
      with default fallback.
- [ ] Zustand console-tabs feature-action tests cover: tab
      create, `'All'`-tab-undeletable invariant, unique-name
      rejection, mute add/remove on active tab, unread counter
      increments/clears, active-tab switch restores scroll
      position, each mutation emits a `client-state-write`.
- [ ] `Topic` template hydration test (label + description
      round-trip via Hydrator).
- [ ] `TopicCatalogue` accessor tests: seeded lookup;
      auto-fallback for missing template; family resolution;
      family-inheriting fallback.
- [ ] `ClientStateMixin` tests cover: schema walker
      concatenates contributions, `getClientState` returns
      stored value or schema default, `setClientState` rejects
      unknown keys, `snapshotClientState` returns dense map,
      `_clientState` round-trips through Hydrator.
- [ ] `client-state-write` handler tests: known writable key
      persists; unknown key rejected; validator rejection
      blocks the write.
- [ ] WebSocket integration test confirms catch-all routing
      surfaces frames whose topic is not in any per-topic
      handler.

## Cross-references

- Seeding slate:
  - [docs/slates/console-filtering-slate.md](../slates/console-filtering-slate.md)
- Adjacent slates touched / aligned:
  - [docs/slates/client-cockpit-slate.md](../slates/client-cockpit-slate.md)
    — multi-terminal as tabs reshapes the slate's single-Terminal
    picture; chat-slate channels will eventually share the tab
    strip.
  - [docs/slates/message-rendering-slate.md](../slates/message-rendering-slate.md)
    — per-topic stylesheet model is what the gutter color derives
    from.
  - [docs/slates/chat-slate.md](../slates/chat-slate.md) —
    deferred; channel axis will land alongside chat.
- Related subsystem docs:
  - [docs/subsystems/messaging.md](../subsystems/messaging.md) —
    how frames are emitted and routed today.
  - [docs/subsystems/shell-environment.md](../subsystems/shell-environment.md)
    — settings keyspace; this build's `console.*` keys
    explicitly do *not* live there (see
    [[feedback-settings-vs-propertied-vs-client-state]]); the
    doc gains a cross-reference to the new `client-state.md`.
  - [docs/subsystems/inspection-pane.md](../subsystems/inspection-pane.md)
    — sister cockpit surface; defines the client subscription /
    render pattern this build mirrors.
- Closely related code:
  - `packages/server/src/mud/api/message.ts` — owns the
    `TOPICS` nested const for server-internal autocomplete;
    unchanged by this build.
  - `packages/server/src/mud/obj/EventRegistry.ts` —
    structural precedent for `TopicCatalogue` (singleton Idea
    in `obj/`).
  - `packages/server/src/mud/lib/biome/Biome.ts` — substrate-in-
    `lib/<subsystem>/` precedent with per-instance templates at
    `/lib/biome/<name>`; `/lib/messaging/Topic/<dotted-path>`
    mirrors the same shape under a fresh subsystem dir.
