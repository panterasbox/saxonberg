# Console foundations — implementation plan

A concrete build sequence for the requirements at
[docs/requirements/console-foundations-requirements.md](../requirements/console-foundations-requirements.md).
Server substrate (topic catalogue) plus client cockpit (tabbed
terminal, gutter, filter drawer) shipped together in one branch.

This plan assumes the reader knows the Idea / Hydrator / mixin
framework primitives — when in doubt, defer to the subsystem docs
referenced inline rather than restating them.

## Phasing overview

Five phases, each independently sanity-checkable
(`pnpm -C packages/<pkg> build && pnpm -C packages/<pkg> test`
green before moving on). Phase 1 is the server substrate;
Phase 2 ports the existing client to a typed frame store without
UI change; Phases 3–5 add the cockpit surface incrementally.

| Phase | Scope | Roughly |
|---|---|---|
| 1 | `Topic` Idea + `TopicCatalogue` singleton + seeds + `TopicDescriptor` type + wire push | 100 min |
| 2 | Client frame store migration (no UI change) | 45 min |
| 3 | `ClientStateMixin` substrate + tab strip + per-tab filtering + persistence | 120 min |
| 4 | Gutter + filter drawer + unread badges | 90 min |
| 5 | Docs sweep + risk cleanup | 40 min |

Phase 1 and Phase 2 are independent and can land in either order.
Phase 3 depends on both. Phase 4 depends on Phases 1 and 3.
Phase 5 is the documentation pass and gates only the merge.

There is **no separate Topics-vocabulary lift** — `MessageApi`'s
internal `TOPICS` const stays in place. Server-internal call sites
keep their current autocomplete; the client never imports a typed
mirror because frames carry their topic on the wire and the
catalogue carries everything else.

## Phase 1 — Topic Idea + TopicCatalogue + seeds + wire push

Goal: stand up the persistent `Topic` template population, the
`TopicCatalogue` singleton with auto-fallback, the seed YAMLs,
the `TopicDescriptor` wire type, and the session-establish wire
push.

### Files

- **Create** `packages/server/src/mud/lib/messaging/Topic.ts` —
  `class Topic extends Idea`. Substrate class in a new
  `lib/messaging/` subsystem dir (the right category for
  topics; ships with one file but earns the dir by being a
  real subsystem — future messaging substrate lands here too).
  Four persistent string fields: `topic` (the dotted path),
  `family` (path prefix without the last segment), `label`
  (friendly display name), `description` (authored prose).
  Each field has a `setX` invariant on the setter: `topic`
  and `family` are non-empty; `label` and `description` are
  non-empty strings. `static persistentFields = ['topic',
  'family', 'label', 'description']`. `static readonly
  TEMPLATE_PATH_PREFIX = '/lib/messaging/Topic/'` — per-
  instance templates live at
  `/lib/messaging/Topic/<dotted-path>` (mirrors Biome's
  `/lib/biome/<name>` shape under a fresh subsystem dir).
  Follow the schema-on-mixin / setter-invariant conventions
  per the [templates subsystem doc](../subsystems/templates.md).
- **Create** `packages/server/src/mud/obj/TopicCatalogue.ts` —
  the singleton Idea that owns the runtime catalogue. Mirrors
  `obj/EventRegistry.ts` structurally.
  - `class TopicCatalogue extends PostRegistrationMixin(Idea)`.
  - Instance state: `private cache: Map<string, TopicDescriptor>
    | null = null` — transient, runtime-only.
  - Instance methods (the access surface; callers resolve the
    singleton via `StuffApi.findByTemplatePath('/obj/TopicCatalogue')`
    and dispatch through the standard security gate):
    - `getDescriptor(topic: string): TopicDescriptor` — primary
      accessor. Calls `ensureCache()`, then resolves in three
      tiers: (1) cache hit returns the authored entry; (2)
      walks the family chain looking for an authored ancestor
      and inherits from it (label =
      `<family.label> (<last-segment-titlecased>)`, description
      = family's, family = the matched ancestor); (3) default
      derived fallback (`label` = last segment titlecased,
      `description` = `'(no description)'`, `family` = path
      prefix). The contract: this method never returns "not
      found."
    - `getSnapshot(): TopicDescriptor[]` — flat array of every
      authored descriptor (cache contents), used by the wire
      push. Inherited / derived shapes are not in the snapshot;
      the client runs the same three-tier resolution against
      its cached snapshot.
    - `invalidateCache(): void` — drops the cached map.
  - `postRegister()`: subscribes to `Events.StuffCreated` and
    `Events.StuffDestructed` (unfiltered — `EventApi.on` has no
    built-in path filter). The listener checks
    `stuff.getTemplatePath()?.startsWith('/lib/messaging/Topic/')`
    and calls `invalidateCache()` only on match. HMR-aware out
    of the box; cache repopulates on next access.
  - `canDestruct(): VetoResult` — refuses with the standard
    singleton message (mirrors EventRegistry).
  - Private `ensureCache()`: if null, scan `StuffApi` for all
    Topic instances under `/lib/messaging/Topic/`, extract a
    `TopicDescriptor` from each, populate the map.
  - Private `resolveInherited(topic)`: walks the dotted-path
    family chain (`segments.slice(0, i).join('.')` for `i` from
    `length-1` down to `1`); returns an inherited descriptor
    from the first ancestor found in the cache, or `null`.
  - Private `deriveFallback(topic)`: `label` = last path segment
    titlecased (`'speech.say' → 'Say'`); `description =
    '(no description)'`; `family` = path prefix without the last
    segment.
- **Create** `packages/server/src/mud/seeds/obj/TopicCatalogue.yaml`
  — the singleton seed:
  ```yaml
  class: /obj/TopicCatalogue
  data: {}
  ```
  Mirrors `seeds/obj/EventRegistry.yaml` exactly. The singleton
  carries no persistent state; cache is transient.
- **Create seed YAMLs** at
  `packages/server/src/mud/seeds/lib/messaging/Topic/<dotted-path>.yaml`
  — one per topic leaf and per family. **Flat path strings,
  no nested directories** — every file is a `Topic` leaf
  carrying its full `topic` and `family` in the data. The full
  file list, derived from the existing strings inside
  `MessageApi.TOPICS`:
  - `seeds/lib/messaging/Topic/world.yaml` (family Topic,
    `topic: world`, `family: ''`, `label: World`, …)
  - `seeds/lib/messaging/Topic/world.speech.yaml` (family
    Topic)
  - `seeds/lib/messaging/Topic/world.speech.say.yaml` (leaf
    Topic)
  - `seeds/lib/messaging/Topic/world.speech.tell.yaml`
  - …and so on for every entry in `MessageApi.TOPICS`.

  Total ≈ 25 leaf YAMLs + ≈ 10 family YAMLs. No `FolderZone`
  scaffolding (the admin-scoping pattern from biome isn't
  needed at v1 — system-owned content; revisit if a doc team
  emerges that wants its own write scope).
- **Modify** `packages/server/src/mud/bootstrap.ts` — add
  `{ templatePathPrefix: '/lib/messaging/Topic/' }` so every
  Topic under that prefix clones at boot. The flat path keeps
  boot ordering trivial.
- **Modify** `packages/types/src/index.ts` — add
  `interface TopicDescriptor { topic, family, label, description }`
  (the wire-safe shape used by both server snapshot and client
  consumers) and extend `ConnectionEstablishedPayload` with
  `topicCatalogue: TopicDescriptor[]`. This is the wire-push
  vehicle; clients read it on session-establish. **No `Topics`
  constants enum** is exported from this package — only the
  descriptor shape.
- **Modify** `packages/server/src/mud/obj/Avatar.ts:251` —
  populate `payload.topicCatalogue` from
  `(await StuffApi.findByTemplatePath('/obj/TopicCatalogue')).getSnapshot()`
  when composing the welcome scene.
- **Modify** `packages/client/src/store/index.ts` — add a new
  `catalogue` slice: `topicCatalogue: Map<string, TopicDescriptor>`
  + `setTopicCatalogue(records: TopicDescriptor[])` setter
  (replaces wholesale, called once per session-establish), plus
  a `getTopicDescriptor(topic): TopicDescriptor` selector that
  applies the **same three-tier resolution as the server**
  (cache hit → family-inherited → derived default). The
  resolution logic duplicates between client and server;
  that's intentional — neither side wants to round-trip for an
  inherited or derived value.
- **Modify** `packages/client/src/store/index.ts` —
  `setConnected(payload)` reads `payload.topicCatalogue` and
  calls `setTopicCatalogue` as part of its existing payload
  consumption.

### Tests

- **Create**
  `packages/server/src/mud/lib/messaging/__tests__/Topic.test.ts`
  — Topic field round-trip via Hydrator (use the existing
  `makeStuff` / `makeStuffAtPath` helpers from
  `lib/security/__tests__/test-setup`; the biome test is a
  direct template). Cover label + description round-trip,
  setter invariants reject empty strings.
- **Create**
  `packages/server/src/mud/obj/__tests__/TopicCatalogue.test.ts`
  — three-tier resolution: (1) seeded lookup returns the
  authored descriptor; (2) family-inherited lookup returns
  `<family.label> (<leaf>)` shape inheriting the family's
  description when only an ancestor is seeded; (3) fully
  unknown topic returns the derived default (titlecased last
  segment, `'(no description)'`). Plus: `invalidateCache`
  clears the cache and the next access rebuilds; subscription
  on `Events.StuffCreated` / `Events.StuffDestructed` at
  `/lib/messaging/Topic/` fires `invalidateCache`;
  `canDestruct` refuses.
- **Modify**
  `packages/server/src/mud/obj/__tests__/Avatar.test.ts` — the
  `enter()` welcome-scene test asserts `payload.topicCatalogue`
  is populated (non-empty array, contains at least one
  representative entry).
- **Modify** `packages/client/src/store/__tests__/` — add a
  `topicCatalogue.test.ts`: `setTopicCatalogue` populates the
  map; `getTopicDescriptor` returns seeded entries and falls
  back for unknown topics.

### Sanity check

Both packages build + test green. Bootstrap should now log
~35 entries cloned for `/lib/messaging/Topic/*` plus the
`TopicCatalogue` singleton (verify the actual count matches
the YAML files).

### Dependencies

No prior phase blocks this one. Within Phase 1: Topic class
→ catalogue singleton (uses Topic type) → seeds (need the
class) → wire push (needs `getSnapshot()`). Sequential within
the phase.

## Phase 2 — Frame store migration + catch-all wire path

Goal: move the client `messages: string[]` into a typed Zustand
`frames` slice and turn the websocket client into a catch-all
deliverer. No UI change yet — Terminal still receives a flat
list. This phase isolates the rebuild on the client so Phase 3's
tab UI work has a clean baseline.

### Files

- **Modify** `packages/client/src/store/index.ts` — new
  `frames` slice:
  - `interface Frame { id: string; topic: string; body: string;
    sigil?: string; timestamp: number }`
  - `frames: Frame[]` initial `[]`
  - `appendFrame(frame: Frame): void`
  - `clearFrames(): void` for disconnect
- **Modify** `packages/client/src/services/websocket.ts` —
  - Add `onAnyTopic(handler: (frame: MessageFrame) => void): void`
    + `offAnyTopic(handler)`. The catch-all handler fires for
    *every* inbound MessageFrame, after the topic-specific
    handlers (so the existing per-topic call sites — the
    inspection pane's, the prompt slice — still work unmodified).
    Mirrors the `onTopic`/`offTopic` shape; stored on a separate
    `Set<FrameHandler>` so it doesn't pollute the
    topic-keyed map.
  - In `handleMessage`, after the topic-specific dispatch loop,
    iterate the catch-all set with the frame.
- **Modify** `packages/client/src/App.tsx`:
  - Remove `const [messages, setMessages] = useState<string[]>([])`
    at line 209.
  - Remove the `renderTopics` array at lines 271–289 entirely
    (replaced by the catch-all wire path below).
  - The per-topic `for (const topic of renderTopics)` setup
    becomes one `onAnyTopic(handle)` registration. `handle`
    extracts `{ id, topic, body }` from the frame, pulls
    `timestamp` from `frame.meta.timestamp`, and calls
    `appendFrame`. Sigil baking moves out of `App.tsx:305`:
    the input-echo handler (`system.log.command.*`) sets
    `frame.sigil = snap?.sigil ?? basePrompt` before appending,
    instead of concatenating into the body string. The Terminal
    renderer is responsible for prefix concatenation at render
    time (Phase 3).
  - `__injectMessage` debug hook now calls `appendFrame` with a
    synthesized frame (topic = `'world.narration.action'` or
    similar; the existing debug-hook string-passing semantics
    don't carry topic so this is the best fallback).
  - Pass `frames` from the store to Terminal as a prop, not
    `messages`.
- **Modify** `packages/client/src/components/Terminal.tsx`:
  - Update the `messages: string[]` prop to `frames: Frame[]`.
  - Each frame renders with `{frame.sigil ?? ''}{frame.sigil
    ? ' ' : ''}{frame.body}` (Phase 4 replaces this with the
    gutter wrapper; for now keep the visual identical).
  - Use `frame.id` as the React key instead of array index.

### Dependencies

No prior phase blocks this one. Phase 2 lands independently of
Phase 1; the frame store doesn't know about the catalogue.

### Tests

- **Modify** `packages/client/src/services/__tests__/websocket.test.ts`
  — add a case: `onAnyTopic(handler)` fires for an inbound
  frame whose topic has no per-topic handler registered
  (this is the catch-all-delivery acceptance test from the
  requirements).
- **Create** `packages/client/src/store/__tests__/frames.test.ts`
  — `appendFrame` adds to the array; `clearFrames` empties;
  frames retain their `id`/`topic`/`sigil` shape.
- The Terminal test (if one exists; check
  `packages/client/src/components/__tests__/`) updates to
  pass `frames: Frame[]`. **No existing Terminal test
  found** — `MmlRenderer.test.tsx` is component-level and
  exercises the renderer directly.

### Sanity check

Client build + test green. Manual smoke test: log in, the
terminal still shows messages (now with sigils prepended
correctly via the new path). Disconnect/reconnect still works.

## Phase 3 — ClientStateMixin substrate + tabs + persistence

Goal: stand up the `ClientStateMixin` substrate, contribute the
console schema, ship the tabbed terminal with per-tab muted set
persisted through the new substrate. Console foundations is the
first consumer of `ClientStateMixin`; the substrate generalizes
for future cockpit-UI persistence (theme, notifications, etc.).

### Files

- **Create** `packages/server/src/mud/lib/client/ClientState.ts`
  — the `ClientStateMixin` substrate in a new `lib/client/`
  subsystem dir. The category is "server-side support for
  clients" — any client (React cockpit today; mobile, admin
  tools, future cockpit variants later) goes here.
  - `ClientStateSchemaEntry<T = unknown>` type exported:
    `{ key: string; defaultValue: T; validator?: (v: unknown) => boolean }`.
  - `export function ClientStateMixin<TBase extends
    Constructor<Stuff>>(Base: TBase)`.
  - `static clientStateSchema: ClientStateSchemaEntry[] = []` —
    schema-on-mixin contribution slot; mixins higher in the chain
    add their entries (the walker concatenates).
  - Persistent field `_clientState: Record<string, unknown> = {}`
    on the mixin; `static persistentFields = ['_clientState']`.
  - `getClientState<T>(key: string): T` — returns the stored
    value if present, else walks the resolved schema chain for
    a default; throws (or logs + returns `undefined`) if the
    key isn't in any contributing schema.
  - `setClientState(key: string, value: unknown): void` —
    validates the key against the resolved schema chain (and
    runs the entry's optional validator); rejects unknown keys;
    writes into `_clientState`.
  - `snapshotClientState(): Record<string, unknown>` — walks the
    schema, returns `{ [key]: getClientState(key) }` for every
    declared key (so the snapshot is dense even for unset keys
    that have defaults).
  - `getClientStateSchema()` (static, walks the mixin chain
    similarly to how `EnvironmentMixin` aggregates `static
    settings`) — used by both `setClientState` for validation
    and by the wire handler for the writable-key check.
- **Create**
  `packages/server/src/mud/lib/client/ConsoleClientState.ts` —
  small feature mixin that contributes console foundations'
  client-state schema:
  ```ts
  export function ConsoleClientStateMixin<TBase extends
    Constructor<Stuff>>(Base: TBase) {
    return class extends Base {
      static clientStateSchema: ClientStateSchemaEntry[] = [
        { key: 'console.tabs',
          defaultValue: [{ name: 'All', muted: [] }] },
        { key: 'console.activeTab', defaultValue: 'All' },
      ];
    };
  }
  ```
  (The mixin can also hold future console-state-related methods
  if/when they emerge; for v1 it's pure schema.)
- **Modify** `packages/server/src/mud/obj/Avatar.ts` — compose
  `ClientStateMixin` and `ConsoleClientStateMixin` into Avatar's
  class chain. The exact composition order follows existing
  patterns; ClientStateMixin sits above the consumer mixins so
  it sees the aggregated schema.
- **Modify** `packages/server/src/mud/obj/Avatar.ts:251` — also
  populate `payload.clientState` from
  `this.snapshotClientState()` when composing the welcome scene.
  (This is the **same callsite** Phase 1 touches for
  `topicCatalogue`. Both populations happen here.)
- **Modify** `packages/types/src/index.ts` — add
  `interface ConsoleTab { name: string; muted: string[] }`
  exported alongside the existing types. Also extend
  `ConnectionEstablishedPayload` with
  `clientState: Record<string, unknown>`. (This is **in addition
  to** Phase 1's `topicCatalogue` extension to the same type.)
- **Add the `client-state-write` inbound message type.**
  - `packages/types/src/index.ts` — add to the inbound-message
    union: `{ type: 'client-state-write', payload: { key:
    string, value: unknown } }`.
  - `packages/server/src/backend/Application.ts` — extend
    `processUserMessage` with a `client-state-write` case:
    look up the schema chain via
    `Avatar.getClientStateSchema()`, reject unknown keys,
    optionally invoke the entry's validator, call
    `avatar.setClientState(key, value)`, then `avatar.save()`.
- **Modify** `packages/client/src/store/index.ts` — new
  `clientState` slice (replaces the bespoke `consoleTabs`
  slice from the prior plan revision):
  - `clientState: Record<string, unknown>` — the cached
    snapshot.
  - `setClientStateSnapshot(snapshot: Record<string, unknown>):
    void` — wholesale replace, called from session-establish.
  - `setClientState<T>(key: string, value: T): void` —
    optimistic local update + sends `client-state-write` wire
    message.
  - **Feature-specific selectors** read from `clientState`:
    - `const tabs = useStore(s => (s.clientState['console.tabs']
      as ConsoleTab[]) ?? DEFAULT_TABS)`
    - `const activeTabName = useStore(s =>
      (s.clientState['console.activeTab'] as string) ?? 'All')`
  - **Feature-specific actions** wrap the generic setter:
    - `addTab(name)`, `renameTab(old, new)`, `deleteTab(name)`,
      `setActiveTab(name)`, `addMuteForActiveTab(topic)`, etc.
      — each reads current `console.tabs` /
      `console.activeTab`, computes the new value, and calls
      `setClientState`.
  - **Other client-only slice fields** stay separate from
    `clientState`: `unreadCounts`, `scrollPositions`,
    `mutedSinceSessionStart` are session-scoped, not
    persisted. They live alongside but outside the
    `clientState` bag.
- **Modify** `packages/client/src/services/websocket.ts` — add
  `sendClientStateWrite(key, value)` method that posts the
  outbound `client-state-write` message. The store-slice
  `setClientState` action debounces calls by 250ms to avoid
  flooding the wire on rapid filter-checkbox toggles.
- **Modify** `appendFrame` in the frames slice — on every
  append, walk the *currently-derived* tab list (read from
  `clientState['console.tabs']`); for each tab whose `muted`
  does NOT include `frame.topic`, if that tab is not active,
  increment its `unreadCount`.
- **Modify** `packages/client/src/services/websocket.ts` — in
  `handleConnectionEstablished`, read `payload.clientState`
  and call `setClientStateSnapshot`.
- **Create** `packages/client/src/components/TabStrip.tsx`:
  - Renders tabs from the `console.tabs` clientState selector.
  - Per-tab: name span + unread badge (from session-scoped
    `unreadCounts`) + hover-revealed pencil + hover-revealed ×
    (except `'All'`).
  - Trailing `+` button creates a new tab in inline-edit mode.
  - Double-click name → inline rename input, Enter commits /
    Escape reverts.
  - × click → small Popover (anchored, click-outside cancels)
    with `[Delete] [Cancel]` buttons.
  - All gestures invoke the feature-specific store actions
    (which wrap `setClientState`); no right-click handler bound
    anywhere.
- **Modify** `packages/client/src/App.tsx` — render
  `<TabStrip />` above `<Terminal />` in the left column. The
  Terminal receives the filtered frame list (see next bullet).
- **Modify** `packages/client/src/components/Terminal.tsx`:
  - Accept `frames: Frame[]` (the filtered list, computed by a
    selector in App or directly via a store selector).
  - Filtering rule: drop any frame whose topic is in the
    active tab's `muted` array.
  - Auto-scroll: only auto-scroll if `containerRef.current` is
    already at the bottom before the new frame appends.
    Otherwise, render a "jump to bottom" affordance fixed-
    bottom-right of the scroll container.
  - On scroll, throttle `setScrollPosition(activeTabName, offset)`
    so per-tab positions persist.
  - On tab switch, restore `scrollPositions[newTabName]` and
    `clearUnreadFor(newTabName)`.

### Tests

- **Create**
  `packages/server/src/mud/lib/client/__tests__/ClientState.test.ts`
  — covers the mixin:
  - Schema-on-mixin walker concatenates entries from multiple
    mixins in the chain
  - `getClientState` returns stored value when present, schema
    default when unset
  - `setClientState` rejects unknown keys
  - `setClientState` invokes the entry validator when present
  - `snapshotClientState` returns the full dense map
  - `_clientState` round-trips through Hydrator save/restore
- **Create**
  `packages/server/src/backend/__tests__/clientStateWrite.test.ts`
  — validates the inbound `client-state-write` handler:
  - Known writable key → calls `setClientState` and
    `avatar.save()`
  - Unknown key → rejected (no write)
  - Schema-validator rejection → no write
- **Modify**
  `packages/server/src/mud/obj/__tests__/Avatar.test.ts` —
  composed Avatar carries the aggregated client-state schema
  including `console.tabs` and `console.activeTab`; round-trip
  through save/restore; `enter()` welcome-scene payload
  includes `clientState` populated by `snapshotClientState`.
- **Create**
  `packages/client/src/store/__tests__/clientState.test.ts` —
  covers the client clientState slice:
  - `setClientStateSnapshot` populates the bag
  - `setClientState` optimistically updates + would-send wire
    (mock the websocket client)
  - Feature selectors return the right typed shape with default
    fallback when keys are absent
- **Create**
  `packages/client/src/store/__tests__/consoleTabs.test.ts` —
  covers the feature-specific tab actions that wrap
  `setClientState`. Per the requirements' acceptance bullets:
  - Tab create / `'All'`-undeletable invariant / unique-name
    rejection
  - Mute add / remove on active tab
  - Unread counter increments for inactive tabs whose filter
    allows the frame, ignores frames the filter mutes,
    `clearUnreadFor` resets
  - Active-tab switch restores scroll position
  - Scroll-position preservation on switch
  - Each mutation results in a `client-state-write` outbound
    (mocked)
- **Create**
  `packages/client/src/components/__tests__/TabStrip.test.tsx`
  — render flow: shows tabs, inline-edit create, rename via
  double-click, delete-confirm popover, no `×` on `'All'`. Use
  the React Testing Library pattern in the existing
  `InspectionPane.test.tsx`.

### Sanity check

Server + client build + test green. Manual smoke: log in,
create a tab, mute a topic, switch tabs, reconnect — tabs and
mutes survive.

### Dependencies

Phase 3 depends on Phase 1 (payload extension reuses the same
session-establish path) and Phase 2 (frame store is the
filtering substrate). It can land before Phase 4 because
muted-topic editing is fine without the drawer's full tree UI.

## Phase 4 — Gutter + filter drawer + unread/mute count badges

Goal: the visual inspection surface — colored gutter per frame,
hover tooltip, click action popover, and the filter drawer
showing a topic tree with friendly labels and muted counts.

### Files

- **Modify** `packages/client/src/components/Terminal.tsx`:
  - Replace the plain `<Message>` with a `<FrameRow>` component
    that renders:
    - Left-edge `<GutterStripe topic={frame.topic} />` — 3px
      wide, full-height of the row, background-color derived
      per-topic. Hover-tooltip and click-popover wiring lives
      inside this component.
    - The existing MML body to the right.
  - The frame `sigil` (when present) renders inline at the
    start of the body, not baked in.
- **Create** `packages/client/src/components/GutterStripe.tsx`:
  - Resolves the topic descriptor via
    `useStore.getState().getTopicDescriptor(topic)`.
  - Color derivation: hash the family path (e.g.
    `world.speech`) to a hue (0–360) and use a fixed S/L so
    every topic within a family shares a hue cluster. A
    24-bit-FNV-1a hash → modulo 360 is plenty.
  - Hover (>250ms delay): floating tooltip with friendly
    label + raw dotted path + description + timestamp.
  - Click: action popover anchored to the stripe with four
    buttons: *Mute in this tab*, *Solo in this tab*, *Open in
    new tab filtered to this*, *Mute family*. Each calls the
    corresponding store action; popover closes on action or
    click-outside.
  - No right-click handler bound.
- **Create** `packages/client/src/components/FilterDrawer.tsx`:
  - Gear icon on the right edge of the TabStrip opens this as
    a slide-out drawer (overlay or pushed column — pick one in
    the build, the requirements don't constrain it).
  - Builds a topic tree from the catalogue snapshot:
    `Map<family, Topic[]>` keyed by family, sorted by
    descriptor `label`.
  - For each leaf: friendly label + raw-path hover tooltip + a
    checkbox bound to `mutedForActiveTab(topic)`. Per-leaf
    badge shows the mute-count for the leaf (frames matching
    the leaf's topic that were suppressed by this tab's filter
    since session start).
  - For each family: family label + family checkbox (toggles
    all currently-known leaves under it) + family badge
    (sum of leaf badges).
  - **Hybrid discovery:** the catalogue snapshot is the seed
    list; the drawer also includes any topic seen in `frames`
    that isn't in the catalogue — those get the derived
    fallback label and are sorted into their derived family.
    Implementation: union the catalogue's known topics with
    `new Set(frames.map(f => f.topic))` and call
    `getTopicDescriptor` for each.
- **Modify** `packages/client/src/store/index.ts`:
  - Add `mutedSinceSessionStart: Record<string, number>` — keyed
    by topic, incremented in `appendFrame` for every frame
    whose topic is muted by the active tab. (This is the
    drawer's badge source; cleared on disconnect.)
  - Add a `frames`-slice helper `wasMutedByActiveTab(topic):
    boolean`.
- **Modify** `packages/client/src/components/TabStrip.tsx` —
  add the gear icon at the right end of the strip that toggles
  drawer visibility.
- **Extend `App.tsx`** with the drawer container.

### Tests

- **Create** `packages/client/src/components/__tests__/GutterStripe.test.tsx`
  — color derivation is stable for the same topic; hover shows
  tooltip with the four fields; click opens action popover;
  popover *Mute* action calls `addMuteForActiveTab`.
- **Create** `packages/client/src/components/__tests__/FilterDrawer.test.tsx`
  — renders tree from seeded catalogue; family checkbox toggles
  all leaves; auto-extends with newly-seen topic; mute-count
  badges reflect suppressed frames.
- **Modify** `client/src/store/__tests__/consoleTabs.test.ts`
  (the feature-action tests from Phase 3) to cover the
  family-mute expansion logic.

### Sanity check

Client build + test green. Manual smoke: terminal rows show
colored gutters; hover reveals topic info; click opens the
mute popover; gear opens drawer; toggling checkboxes affects
visible frames.

### Dependencies

Phase 4 depends on Phase 1 (catalogue is the drawer's data
source) and Phase 3 (mute state and tab actions are the
gutter's targets).

## Phase 5 — Docs sweep

Goal: ship the subsystem doc, update CLAUDE.md, and align
adjacent subsystem docs.

### Files

- **Create** `docs/subsystems/topics.md` — see the outline
  below.
- **Create** `docs/subsystems/client-state.md` — describes the
  `ClientStateMixin` substrate, the schema-on-mixin
  contribution pattern, the `client-state-write` wire surface,
  and the contrast with `settings` and `PropertiedMixin`.
  Cross-references
  [[feedback-settings-vs-propertied-vs-client-state]] and
  [[feedback-dont-widen-substrate-for-narrow-concerns]].
- **Modify** `CLAUDE.md` documentation map — add entries for
  `topics.md` and `client-state.md` in alphabetical position.
- **Modify** `docs/subsystems/messaging.md` — add a brief
  cross-reference: descriptors and the catalogue substrate
  live in `topics.md`; `MessageApi`'s internal `TOPICS` const
  is unchanged.
- **Modify** `docs/subsystems/shell-environment.md` — add a
  short note distinguishing settings from client-state with a
  cross-reference to `client-state.md` (the doc enumerates
  the existing settings examples; this clarifies what doesn't
  belong there).

No tests. Validate that the docs link checker (if there is
one) doesn't break.

### Subsystem doc outline — `docs/subsystems/topics.md`

```markdown
# Topics

The substrate for "what kind of message is this?" — per-topic
authored descriptors plus a runtime catalogue.

## File layout
| File | Role |
... (per the inspection-pane.md precedent)

## No code-side constants mirror
- MessageApi's internal `TOPICS` const stays where it is
- No `Topics` export in @saxonberg/types — only
  `TopicDescriptor`
- Topic strings are raw at every wire boundary

## The Topic Idea (content)
- lib/messaging/Topic.ts — class Topic extends Idea
  (substrate; lives in the lib/messaging/ subsystem dir
  alongside future messaging substrate)
- Persistent fields: topic, family, label, description
- Per-instance template at /lib/messaging/Topic/<dotted-path>
  (TEMPLATE_PATH_PREFIX = '/lib/messaging/Topic/')
- Setter invariants per the standard template pattern
- Author edits through the workspace shell

## The TopicCatalogue singleton
- obj/TopicCatalogue.ts — singleton Idea at
  /obj/TopicCatalogue (sibling of EventRegistry per the
  singleton-in-obj/ convention)
- Instance methods: getDescriptor(topic), getSnapshot(),
  invalidateCache()
- Resolved via StuffApi.findByTemplatePath('/obj/TopicCatalogue')
- Cache is transient instance state populated lazily by
  scanning all /lib/messaging/Topic/ instances
- postRegister subscribes to Events.StuffCreated/StuffDestructed
  at /lib/messaging/Topic/ for HMR invalidation
- canDestruct refuses (singleton)

## Auto-fallback for unknown topics
- The lookup contract: always returns a populated descriptor
- Three tiers in order: (1) cache hit returns authored entry;
  (2) family-inherited — walk the family chain, inherit from
  the nearest authored ancestor; (3) derived default
  (titlecased last segment, no description)
- Family inheritance lets dynamic-topic generators (MudlogApi
  composes `system.log.<category>.<level>` at runtime)
  inherit useful labels from a single authored family entry
- Mirrors EventRegistry's auto-registration philosophy

## Wire push on session-establish
- Server populates payload.topicCatalogue from
  TopicCatalogue.getSnapshot()
- Client caches in the store catalogue slice
- No live updates; descriptor edits land next login

## Contrast with EventRegistry
- Both are singleton Ideas in obj/ owning a per-X data shape
- EventRegistry: transient per-event policy closures; no
  content
- TopicCatalogue: cache of persistent per-topic descriptors
  sourced from /lib/messaging/Topic/* templates
- EventRegistry has a code-side Events enum; TopicCatalogue
  intentionally has no code-side vocabulary mirror beyond
  MessageApi's internal autocomplete const

## Seed YAML structure
- One file per topic (leaf or family) at
  seeds/lib/messaging/Topic/<dotted-path>.yaml
- Flat path strings under the Topic/ prefix; no nested
  directories; no FolderZone scaffolding at v1
- Plus seeds/obj/TopicCatalogue.yaml for the singleton

## Boot sequence
- SeederManager inserts the YAMLs
- BootstrapManager clones via templatePathPrefix:
  /lib/messaging/Topic/ and the singleton
- First call to getDescriptor scans loaded
  /lib/messaging/Topic/* instances into the cache
```

### Subsystem doc outline — `docs/subsystems/client-state.md`

```markdown
# Client state

The substrate for **client UI state persisted server-side** —
configuration the client mutates through UI gestures, stored
durably on the server because that's where the player's
identity lives.

## What client state is — and isn't
- IS: tabs, theme, notification prefs, keybinds, channel
  mutes, saved MQL queries, onboarding flags
- NOT settings: settings are player-tunable knobs via the
  `settings` command. Client state is mutated through UI
  gestures, not configured manually.
- NOT generic Stuff properties: PropertiedMixin is composed
  on every Stuff in the world; client-cares concerns live on
  a narrower mixin.

## ClientStateMixin
- lib/client/ClientState.ts — composed onto Avatar (and any
  future Stuff that has a client attached; coins, NPCs,
  doors never compose it)
- Persistent field _clientState: Record<string, unknown>
- Methods: getClientState, setClientState,
  snapshotClientState
- Schema-on-mixin contribution: each feature mixin declares
  its keys via static clientStateSchema; the chain-walker
  aggregates

## Wire surface
- Server → client on session-establish:
  ConnectionEstablishedPayload.clientState (dense snapshot)
- Client → server anytime: { type: 'client-state-write',
  payload: { key, value } }
- Server validates key against aggregated schema, optionally
  runs entry validator, calls avatar.setClientState +
  avatar.save()

## Feature contribution pattern
Each new client-state feature contributes via a small mixin
declaring its schema; the mixin gets composed onto Avatar.
Console foundations contributes ConsoleClientStateMixin with
`console.tabs` and `console.activeTab`. Future themes
contribute their own mixin with `theme.*` keys. Wire surface
is shared; no new outbound message types per feature.

## Contrast
- EnvironmentMixin (settings): player-tunable knobs via the
  `settings` command. Different UX, different shell surface.
- PropertiedMixin: universal per-Stuff bag; would pollute
  with client-cares flags. Don't widen it.
- ClientStateMixin: focused mixin that goes only where
  clients attach.

## Liveness
- v1: no mid-session live updates; edits land at next login
- v2 (if needed): server pushes setting-changed events for
  multi-device coherence
```

## Architectural decisions

These are calls the requirements explicitly deferred to the
planner.

### 1. Source-tree split — `Topic` in `lib/messaging/`, `TopicCatalogue` in `obj/`

Two server-side files in their conventional homes:

- `lib/messaging/Topic.ts` — substrate Idea class in a new
  `lib/messaging/` subsystem dir. Topics are a messaging
  concept, and `lib/messaging/` is the right category for
  them even if it currently holds just one file — per
  [[feedback-respect-lib-subsystem-categorization]], `lib/`
  follows a subsystem taxonomy and new code goes into the
  relevant subsystem dir, not at lib/ root. Future messaging
  substrate (richer MessageApi pieces, MML primitives) lives
  here too. Per-instance templates at
  `/lib/messaging/Topic/<dotted-path>`, mirroring Biome's
  `/lib/biome/<name>` shape.
- `obj/TopicCatalogue.ts` — singleton Idea, sibling to
  `obj/EventRegistry.ts` per the singleton-in-`obj/`
  convention. Lives at `/obj/TopicCatalogue`.

Plus one shared type in `packages/types/src/index.ts`:

- `interface TopicDescriptor { topic, family, label,
  description }` — the wire-safe shape used by the server
  snapshot and the client catalogue slice. No `Topics`
  constants enum is exported.

The subsystem name is **messaging**, not **topics** —
`lib/topics/` would be a one-thing subdir and the wrong
category (topics are a messaging concern, not their own
top-level subsystem). The subsystem doc still goes to
`docs/subsystems/topics.md` because topics are substantial
enough to warrant their own doc; `messaging.md` cross-
references it.

`MessageApi`'s internal `TOPICS` nested const is **not lifted**
— it's autocomplete-only for server call sites and stays where
it is. The catalogue does not depend on it; both are
independent: descriptors are content (in the DB), `TOPICS` is
a code-side autocomplete convenience.

### 2. Catalogue access shape — singleton Idea, not module functions

`TopicCatalogue` is a singleton Idea (composing
`PostRegistrationMixin(Idea)`) with instance methods, not a
module of free functions and not an Api class. This matches
the `EventRegistry` precedent exactly: a Stuff-shaped singleton
whose runtime state is transient and whose access surface
dispatches through the standard call-security gate.

Access pattern:
```ts
const catalogue = await StuffApi.findByTemplatePath(
  '/obj/TopicCatalogue'
);
const descriptor = catalogue.getDescriptor('world.speech.say');
const snapshot = catalogue.getSnapshot();
```

Why not a `TopicCatalogueApi` class: instance methods on a
Stuff singleton ARE the access surface — no static-utility
indirection adds value, and a parallel Api class would just
shadow the singleton's methods (per
[[feedback-no-new-apis-default]]).

Cache state lives on the singleton instance as a private
`Map<string, TopicDescriptor> | null`. HMR-aware: `postRegister`
subscribes to `Events.StuffCreated` and `Events.StuffDestructed`
unfiltered (no built-in path filter on `EventApi.on`); the
listener checks the template-path-prefix inline and fires
`invalidateCache` on `/lib/messaging/Topic/` matches. Next
access rebuilds.

### 3. Sigil-extraction approach — `Frame.sigil?: string`

Per-frame `sigil` field on the `Frame` shape. The websocket
client's existing `system.log.command.*` handler (which
already shifts the snapshot off the FIFO queue) sets
`frame.sigil` before calling `appendFrame`. The Terminal
renderer concatenates `frame.sigil + ' ' + frame.body` at
render time. This keeps the topic-classification step on the
clean body and the gutter color derivation on the clean topic
— there's no extracting needed at the gutter end.

### 4. Catch-all WebSocket delivery composes with per-topic handlers

The catch-all fires *after* the existing per-topic dispatch.
Concretely, in `handleMessage`, after the existing topic-
keyed loop completes, an additional loop walks the
`anyTopicHandlers: Set<FrameHandler>` and invokes each. Per-
topic handlers (the inspection pane's, the prompt slice's
explicit per-topic hooks) continue to work unmodified. The
new App-side frame-store registration uses `onAnyTopic` only
— that's the single subscription that consumes everything for
the new `frames` slice.

### 5. Console state persists via `ClientStateMixin`, not via `settings`

Console tabs are not a setting (no player will `settings set
console.tabs '[…]'` from the shell) and not a generic
`PropertiedMixin` property (the universal substrate has no
business carrying client-cares concerns). They live on the new
`ClientStateMixin` substrate, contributed via the
`ConsoleClientStateMixin` schema mixin composed onto Avatar.

Storage is `_clientState: Record<string, unknown>` on the
mixin — one persistent field, hydrated as plain JSON. The
schema entry declares the default
(`[{ name: 'All', muted: [] }]`); `getClientState` returns the
stored value or the default; `setClientState` writes through.

Wire path: client sends a generic `client-state-write` message
(see Decision 7); server validates the key against the
aggregated schema chain (`Avatar.getClientStateSchema()`),
calls `avatar.setClientState(key, value)`, then
`avatar.save()`.

Why not `settings`: settings have a specific UX surface
(the `settings` command, player-tunable scalar knobs); tabs
aren't tunable from the shell and the schema's `set` verb
rejects structured values anyway. Per
[[feedback-settings-vs-propertied-vs-client-state]].

Why not `PropertiedMixin`: `PropertiedMixin` is composed onto
every Stuff; widening its surface with client-cares flags
would pollute a universal substrate with a narrow concern.
Per [[feedback-dont-widen-substrate-for-narrow-concerns]].

### 6. Gutter color derivation — family-hash to hue, fixed S/L

```ts
function colorForTopic(family: string): string {
  // FNV-1a 24-bit hash of family path
  let h = 2166136261;
  for (let i = 0; i < family.length; i++) {
    h ^= family.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  const hue = h % 360;
  return `hsl(${hue}, 65%, 50%)`;
}
```

Hashing the *family*, not the leaf topic, clusters every leaf
in a family at the same hue. Saturation/lightness fixed at
65%/50% for legibility on the dark terminal background. The
requirements specify "colored by topic, clustered by family"
— this gives both.

### 7. Inbound dispatcher placement for `client-state-write`

The existing two-channel inbound dispatcher
(`Application.processUserMessage`) already routes
`command` / `mql-*` / `prompt-*` / `heartbeat`. Add one more
case for `client-state-write`. The handler is small (validate
key against schema, call `setClientState`, save) and **stays
inline** in the dispatcher rather than factoring to a separate
file. Per [[feedback-no-premature-registries]] + the codebase's
existing dispatcher pattern, a generic wire path doesn't
justify its own file when it's a handful of lines.

The dispatcher case is the ONLY new inbound path. Future
client-state features (theme, notifications, keybinds) reuse
the same case — they only contribute new schema entries via
their own mixin compositions, not new wire surface.

### 8. Seed YAML structure — flat paths, no folders, no FolderZone

Every topic (leaf or family) is one YAML file at
`seeds/lib/messaging/Topic/<full-dotted-path>.yaml`. No
nested directories under the `Topic/` prefix, no `FolderZone`
admin scaffolding, no `_family.yaml` convention.

Example:

- `seeds/lib/messaging/Topic/world.yaml` — `Topic`,
  `topic: world`, `family: ''`
- `seeds/lib/messaging/Topic/world.speech.yaml` — `Topic`,
  `topic: world.speech`, `family: world`
- `seeds/lib/messaging/Topic/world.speech.say.yaml` —
  `Topic`, `topic: world.speech.say`, `family: world.speech`

The hierarchical meaning is encoded in the `topic` / `family`
fields, not in the directory structure. The Biome precedent
(`/lib/biome/<name>`) is the closest analog for the template-
path shape; this builds on it with deeper per-instance
identifiers under a fresh subsystem dir.

`FolderZone` admin scoping (the biome pattern's reason for
folder-shaped seeds) isn't justified at v1 — topics are
system-owned, no doc-team write scope exists. Revisit if a
team emerges that needs scoped editing rights.

## Test strategy summary

| Acceptance criterion | Test file | Cases |
|---|---|---|
| Frames in Zustand `{id, topic, body, sigil?}` | `client/src/store/__tests__/frames.test.ts` | append, append-preserves-shape |
| Catch-all wire path | `client/src/services/__tests__/websocket.test.ts` | new test: `onAnyTopic` fires for unknown topic |
| Tab strip default+`'All'`-undeletable | `client/src/store/__tests__/consoleTabs.test.ts` | invariant test |
| Tab create/rename/delete | `client/src/store/__tests__/consoleTabs.test.ts` + `client/src/components/__tests__/TabStrip.test.tsx` | per-action |
| Scroll preservation | `client/src/store/__tests__/consoleTabs.test.ts` | round-trip per-tab offset |
| Unread badges | `client/src/store/__tests__/consoleTabs.test.ts` | increment / clear |
| Filter drawer renders tree | `client/src/components/__tests__/FilterDrawer.test.tsx` | seeded tree + hybrid extension |
| Mute counts | `client/src/components/__tests__/FilterDrawer.test.tsx` | counter increments on muted frame |
| Gutter color + hover + click | `client/src/components/__tests__/GutterStripe.test.tsx` | per-action |
| `ClientStateMixin` core | `server/src/mud/lib/client/__tests__/ClientState.test.ts` | schema walker, get/set, snapshot, validator, persistence round-trip |
| `client-state-write` handler | `server/src/backend/__tests__/clientStateWrite.test.ts` | known/unknown key, validator rejection |
| Console schema on Avatar | `server/src/mud/obj/__tests__/Avatar.test.ts` | composed schema includes `console.tabs`/`console.activeTab`; payload `clientState` populated |
| Client clientState slice | `client/src/store/__tests__/clientState.test.ts` | snapshot hydrate, setClientState optimism + wire emission |
| `Topic` hydration | `server/src/mud/lib/messaging/__tests__/Topic.test.ts` | label/description round-trip |
| Catalogue lookup + fallback | `server/src/mud/obj/__tests__/TopicCatalogue.test.ts` | seeded + fallback + family + invalidate + HMR subscription + canDestruct |
| WebSocket catch-all integration | `client/src/services/__tests__/websocket.test.ts` | already covered above |

### Vitest gotchas observed

- The client tests reach into private wire-client state via
  `(websocketClient as unknown as { … })` casts. The pattern is
  documented in
  `client/src/services/__tests__/websocket.test.ts` and the
  build should follow it for any new wire test paths.
- The server tests use `makeStuff` / `makeStuffAtPath` from
  `mud/lib/security/__tests__/test-setup.ts` for Stuff
  creation under test; the `installV1QuantityMarshallers`
  pattern from `Biome.test.ts` is biome-specific and *not*
  needed for the Topic Idea tests.
- The client uses `@testing-library/react` (see
  `InspectionPane.test.tsx`); the `act` import from `'react'`
  (not `'react-dom/test-utils'`) is the established pattern.
- Zustand state resets between tests via
  `useStore.setState({ … })` — see `inspectionPane.test.ts`'s
  `resetPane()` helper. New slice tests should follow the
  same pattern.

## Dependency graph

```
Phase 1 (catalogue substrate)  ──┐
                                 │
Phase 2 (frame store)  ──────────┤
                                 │
                                 ↓
        Phase 3 (ClientStateMixin + tabs + persistence)
                                 │
                                 ↓
                Phase 4 (gutter + drawer)
                                 │
                                 ↓
                  Phase 5 (docs)
```

- Phase 1 and Phase 2 are independent (either order).
- Phase 3 depends on Phases 1 and 2.
- Phase 4 depends on Phases 1 and 3.
- Phase 5 (docs) depends on the whole build.

**Heads up — Avatar.ts:251 and `ConnectionEstablishedPayload`
are modified in both Phase 1 and Phase 3.** Phase 1 adds the
`topicCatalogue` field; Phase 3 adds `consoleTabs` and
`consoleActiveTab`. The two are independent additions to the
same callsite + the same type; just don't drop one when
shipping the other.

A weekend split: Saturday morning, Phase 1 + Phase 2.
Saturday afternoon, Phase 3 first half (`ClientStateMixin`
substrate + Avatar composition + wire path). Sunday morning,
Phase 3 finish (tabs UI + integration) + Phase 4. Sunday
afternoon, Phase 5 + verification.

## Out-of-scope vigilance

Things the build will be tempted toward but should resist:

- **Lifting `MessageApi`'s internal `TOPICS` const** out into
  a separate file (or into `@saxonberg/types`). It stays
  exactly where it is — server-internal autocomplete only.
  The catalogue is the truth for content; the const is an
  ergonomic aid for server call sites.
- **Adding a `Topics` constants enum export** to
  `@saxonberg/types`. Only `TopicDescriptor` ships through
  shared types; topic strings are raw at the wire boundary.
- **Carving out a `lib/topics/` subsystem dir.** Wrong
  category — topics are a messaging concern. `Topic.ts` lives
  in `lib/messaging/`; `TopicCatalogue.ts` lives in `obj/`
  with the singletons.
- **`FolderZone` admin scaffolding** for topic seeds.
  System-owned at v1; revisit when a doc team needs scoped
  edits.
- **Putting console state in `settings`.** Tabs are not a
  player-tunable knob; they're client UI state. Per
  [[feedback-settings-vs-propertied-vs-client-state]] they
  belong on `ClientStateMixin`, not `EnvironmentMixin`.
- **Adding `clientReadable`/`clientWritable` flags to
  `PropertiedMixin`.** PropertiedMixin is composed onto every
  Stuff; client-cares concerns belong on a narrower mixin
  composed only where the concern is real. Per
  [[feedback-dont-widen-substrate-for-narrow-concerns]].
- **A bespoke `console-settings-update` wire message.** Every
  client-state feature uses the same generic `client-state-
  write` path; never invent a feature-specific persistence
  wire message.
- **A `describe-topic` verb** for editing descriptors. Per the
  non-goals — workspace shell handles it.
- **Live mid-session catalogue updates.** The session snapshot
  is enough. Don't add an `mql-subscribe` for the catalogue.
- **Right-click handlers, anywhere.** Verify each new component
  binds `onClick`, never `onContextMenu`. The
  `TabStrip.test.tsx` and `GutterStripe.test.tsx` should each
  assert "no contextmenu handler bound" explicitly.
- **Pre-muting any topic by default.** Default is "everything
  visible in every tab." Resist the temptation to ship `'All'`
  with a sample `muted: ['system.log.command.info']` or
  similar.
- **Adding a `TopicCatalogueApi` class.** Per the non-goals.
  The `TopicCatalogue` singleton Idea's instance methods are
  the access surface; no static-utility indirection needed.
- **Per-frame topic *prefix* matching** in the filter
  evaluation. Muted set is exact-leaf-only;
  family-checkbox-expands-to-leaves at toggle time, not at
  match time.
- **Multi-visible split terminals.** v2.
- **Tab reordering.** v2.
- **Search.** Wave-3.
- **Channel filtering / sender filtering.** Chat-slate work.
- **Brief mode.** Deferred.

## Risk register

Things the codebase reveals that the requirements doc didn't
fully cover:

1. **`ClientStateSchemaEntry.validator` is optional; v1 ships
   with no validators on `console.tabs` / `console.activeTab`.**
   A malformed value from the client (array of strings instead
   of `ConsoleTab` objects, or `activeTab` set to a name no
   tab has) would persist. v1 trusts the cockpit; this is
   acceptable because we ship only one client and it's our
   own. If/when third-party clients become real, the schema
   entries gain validator functions. Flag for later, not a
   v1 blocker.

2. **Schema-on-mixin walker** — the implementation walks the
   mixin chain via the prototype chain (similar to how
   `EnvironmentMixin` aggregates `static settings`). The
   build should verify this works under `@CallSecurity`
   wrapping (the Avatar instance is a Proxy; static-field
   access on the class itself should be unaffected, but
   worth checking). If the static-aggregation pattern has
   gotchas, fall back to a registry-style explicit
   contribution call from each mixin's setup — but try the
   static pattern first.

3. **`client-state-write` debounce + reconnect ordering.** If
   the player toggles a filter, the debounce fires, the server
   persists, the connection drops immediately. On reconnect,
   the server's `console.tabs` is the new value — fine. But if
   the player is mid-typing a tab rename when the disconnect
   happens, the in-progress edit is lost. v1 acceptance: tab
   edits live in client-only state until committed (Enter
   pressed); only committed edits go over the wire. Already
   implied by the "Enter commits" gesture, but worth being
   explicit in the build.

4. **`world.identity` family has only one leaf (`change`).**
   The requirements list it as a family. The catalogue
   accessor should treat single-leaf families the same as
   multi-leaf families — the family checkbox in the drawer
   toggles the one leaf. No special-case needed; flagged so
   the build doesn't trip on it.

5. **`system.log.*` is partly dynamic; `.root` is an
   accessor convention, not a sentinel topic.** Two related
   gotchas the seeder must handle:

   (a) `MessageApi.TOPICS.system.log.root === 'system.log'`
   — the `.root` key is a JS accessor for the *family-prefix
   string*, used because `system.log` is a family with sub-
   namespaces (`.command`) AND needs its bare prefix
   available as a string for callers that want to filter the
   whole family. It's NOT a leaf; the family descriptor for
   `system.log` is generated from the structure either way,
   so the seeder must **deduplicate `.root` accessors against
   the family-derivation step** (or filter them out before
   walking). Same goes for any future `.root` accessors that
   land in `TOPICS`.

   (b) `system.log.<category>.<level>` topics are **composed
   dynamically by MudlogApi** (see
   `packages/server/src/mud/api/mudlog.ts:50` —
   `topicFor(category, level)`). They are *not* enumerated in
   `MessageApi.TOPICS`. The currently-observed dynamic
   shapes are `system.log.command.info` and
   `system.log.command.warn` (emitted by
   `CommandGiver._emitInputEcho`, `CommandGiver.ts:677`).
   With the family-inheriting fallback (Phase 1), these get
   useful labels ("Command (info)" / "Command (warn)") from
   the authored `system.log.command` family descriptor —
   **hand-seeding the leaves is optional**. Hand-seed only if
   per-level prose adds real authored value; otherwise let
   the family-inheriting fallback handle them. Future dynamic
   shapes work the same way.

6. **Persistence of `console.tabs` via `Avatar.save()`.** The
   server's settings write fires `avatar.save()` to write
   through. Avatar already has periodic autosave; the
   immediate save here is belt-and-suspenders. Should be
   fine, but the build should verify `save()` is safe to call
   concurrently with the periodic timer (per the existing
   "concurrent saves are safe, MongoDB last-write-wins" note
   in `Avatar.ts:174`).

7. **Hybrid drawer extension memory.** A long session
   accumulates seen-but-uncatalogued topics in
   `Set(frames.map(f => f.topic))`. For a single play
   session this is bounded by the topic vocabulary (likely
   <50); not a memory concern. Flagged so the build doesn't
   over-engineer a TTL.

8. **Wire-push payload size.** With ~35 topic descriptors at
   ~200 bytes each, the payload grows by ~7KB. The existing
   `ConnectionEstablishedPayload` is much smaller. Not a
   concern at v1 sizes; flagged in case the descriptor prose
   grows aggressively.

9. **YAML authoring volume.** Phase 1 ships ~35 YAML files
   for the topic seeds. The build agent should write a small
   script (or use code generation) to produce them from
   `MessageApi.TOPICS` rather than hand-typing each — but the
   script's output is the deliverable, not the script. **The
   shape of each YAML is small (class + 4 fields); copy-pasting
   is fine.**

## Critical files for implementation

- /home/bobalu/play/saxonberg/packages/server/src/mud/api/message.ts
  — owns `TOPICS` const (read-only reference; not modified)
- /home/bobalu/play/saxonberg/packages/server/src/mud/api/mudlog.ts
  — `topicFor()` reveals the dynamic emit shape under
  `system.log.*` (Risk #5 context)
- /home/bobalu/play/saxonberg/packages/server/src/mud/obj/Avatar.ts
  — composes `ClientStateMixin` + `ConsoleClientStateMixin`;
  payload composition at line 251 populates both
  `topicCatalogue` (Phase 1) and `clientState` (Phase 3)
- /home/bobalu/play/saxonberg/packages/server/src/mud/obj/EventRegistry.ts
  — structural precedent for `TopicCatalogue` singleton
- /home/bobalu/play/saxonberg/packages/server/src/mud/lib/biome/Biome.ts
  — substrate-in-`lib/<subsystem>/` precedent for
  `Topic` (`lib/messaging/Topic.ts`)
- /home/bobalu/play/saxonberg/packages/server/src/backend/Application.ts
  — `processUserMessage` dispatcher; gains the
  `client-state-write` case
- /home/bobalu/play/saxonberg/packages/server/src/mud/lib/shell/Environment.ts
  — read-only reference for how schema-on-mixin walks
  (`EnvironmentMixin.settings` aggregation) — used as a
  pattern guide for `ClientStateMixin.clientStateSchema`
- /home/bobalu/play/saxonberg/packages/types/src/index.ts
  — `TopicDescriptor` + `ConsoleTab` + extended
  `ConnectionEstablishedPayload` + the inbound message union
- /home/bobalu/play/saxonberg/packages/client/src/store/index.ts
  — Zustand store gains `frames`, `topicCatalogue`, and
  `clientState` slices
- /home/bobalu/play/saxonberg/packages/client/src/services/websocket.ts
  — adds `onAnyTopic` catch-all + `sendClientStateWrite`
- /home/bobalu/play/saxonberg/packages/client/src/App.tsx
  — drops `useState<string[]>`, removes static
  `renderTopics`, mounts `<TabStrip />`
