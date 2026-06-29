# Cockpit layouts + server-authoritative input mode — implementation plan

Phased plan for the build. **Authoritative spec:**
[cockpit-layouts-requirements.md](../requirements/cockpit-layouts-requirements.md)
— read it first; every Goal / Surface decision / Constraint / Acceptance
criterion there is settled. This plan is *how*. Branch:
`feature/cockpit-layouts-build` off `origin/master`.

**Through-line:** the client owns **zero** command semantics. Two
server-authoritative axes ride the existing `clientState` channel —
`cockpit.layout` (what the cockpit looks like) and `cockpit.inputModes` (how
typing is scoped). The client is a pure view: a `layout → component`
registry swaps the cockpit on a `cockpit.layout` update; the command
interpreter prepends the mode prefix server-side.

## Verified seams (build on these — do not re-discover)

| Seam | Location | Role |
|---|---|---|
| `clientStateSchema` (flat array) | `mud/lib/connection/HasInteractive.ts:176` | add `cockpit.layout`, `cockpit.inputModes` |
| write+save+push template | `mud/obj/command/shell/StyleController.ts` `commit()` (~`:126`) | the pattern `Layout`/`ModeController` mirror |
| welcome snapshot | `mud/obj/Avatar.ts:389` (`clientState: snapshotClientState()`) | add `broadcastSources` to the payload |
| inbound clientState write | `backend/inbound/clientState.ts` | generic — **unchanged** (new keys ride it) |
| per-player push | `Application.sendClientStateUpdateToInteractive` (`backend/Application.ts:186`) | layout/mode pushes |
| envelope push + fan-out | `Application.sendEnvelopeToInteractive` (`:164`); `ConnectionApi.getAllInteractives()` (`mud/api/connection.ts:63`) | StreamSource live push |
| **command entry** | `CommandGiverMixin.executeCommand` (`mud/lib/command/CommandGiver.ts:490`), from `backend/inbound/command.ts:82` | the input-mode prepend hook |
| empty-line short-circuit | `backend/inbound/command.ts:47` (upstream) | makes the prepend no-op-on-empty free |
| client clientState dispatch | `services/websocket.ts:399-413` (`client-state-update`) | layout/mode arrive here unchanged |
| client cockpit | `App.tsx` (`mainView`/`setMainView`; `recognizeForumNavigation` `:294`; `IS_CMS_SURFACE` `:317`,`:718`; `onAnyTopic` `:481`; `visibleFrames` `:342`) | refactor into the layout registry |
| store slices to delete | `store/index.ts` (`mainView` `:296`,`:900`; `inputMode` `:242`,`:904`) | deleted (Phase 1 / Phase 4) |

## Resolved decisions (the planner's 7 open questions)

1. **No auto-switching of layout (RESOLVED).** Layout changes **only** via
   the explicit `layout` verb (typed / Views-menu). The `forum` verb does
   **not** set layout; `ForumController` is untouched. The `?surface=cms`
   deep-link auto-entry is dropped. Every layout is one click in the Views
   menu, so discoverability is unaffected. (Diegetic auto-switch deferred.)
2. **`cockpit.inputModes` shape** — a `{ barId → prefix }` map; a missing key
   = that bar unset. The indicator shows the **raw prefix** (`chat devtalk`),
   not a separate friendly label (server stores only the prefix). *(Per-bar,
   not per-player — see Phase 4.)*
3. **StreamSource live-push** — **include** the `StreamSourcesChanged`
   fan-out (acceptance lists it; the listener is small). Welcome-snapshot is
   the baseline; the push keeps it live when the operator changes config.
4. **Twitch `parent`** — derived from `window.location.hostname`
   (correct-by-construction, never hard-coded; satisfies the embed-safety
   constraint without config).
5. **Esc under a server mode** — Esc-on-active-mode sends `mode off` over
   the bus (consistent with "client owns zero command semantics"; the small
   round-trip is acceptable).
6. **`build`/`cms` verb** — not shipped; entry is the Views menu +
   `layout builder` + the `?surface=cms` deep-link.
7. **Subsystem doc home** — decided at finalize (`docs/subsystems/
   cockpit-layouts.md` vs a `client-shell.md` section).

---

## Phase 1 — Layout substrate

Server-authoritative layout axis + refactor the hard-coded grid into a
registry; delete `mainView`/`recognizeForumNavigation`; world + forum
behavior-identical.

### Server
- **`@saxonberg/types`** — the single vocabulary both ends share:
  ```ts
  export type LayoutName = 'world'|'forum'|'livestream-viewer'|'streamer'|'builder';
  export const LAYOUT_NAMES: readonly LayoutName[] = ['world','forum','livestream-viewer','streamer','builder'];
  ```
- **`HasInteractive.ts:176`** — schema entry `cockpit.layout` (default
  `'world'`, validator = `LAYOUT_NAMES.includes(v)`); import `LAYOUT_NAMES`.
  (Add `cockpit.inputModes` now too, to avoid a second schema edit.)
- **Verb (new MVC pair):** `mud/cmd/shell/layout.yaml` (`verbs:[layout]`,
  `controller: shell/LayoutController`, `requiresHasInteractive` validator,
  one required `name`); `mud/obj/command/shell/LayoutController.ts` mirrors
  `StyleController` — narrow `MixinApi.isHasInteractive`, reject unknown name
  (`controller-rejected`), else `setClientState('cockpit.layout',name)` →
  `Avatar.save()` → `pushClientStateUpdate(...)` + confirmation line.
  Register on `HasInteractiveMixin.commandContributions.self` beside
  `style.yaml` (`:218`).
- **`ForumController` — unchanged.** No layout write (no auto-switch). The
  forum board view is reached via `layout forum` / the Views menu; the
  `forum` verb stays pure CRUD. (The deleted client `recognizeForumNavigation`
  is simply *not* replaced.)

### Client — registry refactor
New `packages/client/src/layouts/`: `types.ts` (`LayoutProps`,`LayoutDef`),
`index.ts` (`LAYOUT_REGISTRY: Record<LayoutName,LayoutDef>`), `WorldLayout.tsx`
(today's terminal grid: TabStrip+Terminal+FilterDrawer+InspectionPane,
`drawerOpen` local), `ForumLayout.tsx` (ForumView+ForumChatSidecar, `scenePeek`
local). `components/ViewsMenu.tsx` = the "Views" dropdown.
- `App.tsx`: `const layout = (clientState['cockpit.layout'] as LayoutName) ?? 'world'`;
  render always-on minimum (`Frame`, `ReconnectBanner`, `ViewsMenu`,
  `<ActiveLayout {...layoutProps}/>`, `CommandBar`) where
  `ActiveLayout = (LAYOUT_REGISTRY[layout] ?? LAYOUT_REGISTRY.world).Component`.
  **Delete** `recognizeForumNavigation` + its call, the `mainView` reads, the
  `useEffect([mainView])` reset.
- `ViewsMenu.tsx`: items over `LAYOUT_NAMES`; `onMouseEnter→onCommandPreview('layout '+n)`,
  `onClick→onCommandClick('layout '+n)`; highlight current.
- `store/index.ts`: delete `mainView`/`setMainView`; keep `forumNav` (client
  nav *within* the forum layout). Update `forumStore.test.ts`.

**Acceptance:** `layout world|forum` round-trips + persists across reconnect;
unknown rejected; world pixel-identical; `forum` opens the board view via
`cockpit.layout`.

## Phase 2 — Livestream-viewer + platform-agnostic embed

### Types
```ts
export type StreamSource = { platform:'twitch'; channel:string } | { platform:'youtube'; videoId:string };
export interface StreamSourcesEnvelope { type:'stream-sources'; frameId:number; sources:StreamSource[]; }
```
Add to `Envelope` (`:971`) + `EnvelopeTemplate` (`:991`); add
`broadcastSources: StreamSource[]` to `ConnectionEstablishedPayload` (`:1262`).

### Server
- **Config:** `mud/config/app-settings.yaml` key `livestream.broadcastSources`
  = JSON-array string (the `renown.decayHalfLives` precedent).
- **Reader:** `mud/api/stream-source.ts` → `StreamSourceApi.current(): StreamSource[]`
  (parse + shape-validate; `[]` on absent/malformed).
- **Snapshot:** `Avatar.ts:389` payload gains `broadcastSources: StreamSourceApi.current()`.
- **Live push:** the `config` verb's `AppApi.setSetting` fires
  `Events.StreamSourcesChanged`; a boot listener (near `Application` init
  `:111`) fans `{type:'stream-sources',sources}` to `getAllInteractives()`
  via `sendEnvelopeToInteractive`.

### Client
- `components/embed/StreamEmbed.tsx` — props `{sources}`; local `selected`
  (default 0); picker buttons only when `sources.length>1`. Twitch →
  `<iframe src="https://player.twitch.tv/?channel=…&parent=${window.location.hostname}" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" allow="autoplay; fullscreen"/>`.
  YouTube → "coming soon" placeholder (shape only).
- Store: `broadcastSources` + setter; set from `setConnected(payload.broadcastSources)`
  and a new `onEnvelope('stream-sources',…)` handler in `App.tsx` (websocket.ts
  unchanged — dispatches by `.type`).
- `layouts/LivestreamViewerLayout.tsx` — grid: large `<StreamEmbed>` + a chat
  `Terminal` (frames where `topic ∈ {world.twitch.message, world.youtube.message}`
  — an **allowlist** predicate, since the `muted` denylist can't express
  "only twitch") + a compressed game `Terminal` (the complement) + always-on
  minimum. Both over the one shared `frames` buffer; client-side filters, no
  ingest routing. Register in `LAYOUT_REGISTRY`.

## Phase 3 — Streamer stub + Builder (CMS re-home)

- **Streamer:** factor the two-terminal body into `LivestreamPanes`;
  `layouts/StreamerLayout.tsx` = `LivestreamPanes` with the embed replaced by
  a "stream stats — coming soon" placeholder.
- **Builder:** `layouts/BuilderLayout.tsx` renders the existing `<CmsSurface/>`
  in the content slot (restyle its `Screen` from `100vh/100vw` to
  `flex:1; min-height:0` so the always-on minimum stays visible); `cmsInit`
  runs on mount; server CMS surface untouched; Monaco lazy.
  - **Retire the `?surface=cms` takeover (no auto-entry):** delete the
    `IS_CMS_SURFACE` full-screen branch (`:718`) + the `if (IS_CMS_SURFACE) return;`
    WS guard (`:424`) so WS always connects. The URL is **no longer special-
    cased** — it loads the normal cockpit (`world`); builder is entered
    explicitly via the Views menu or `layout builder` (no on-load
    auto-switch, per "no auto-switching"). The dev account-menu CMS launcher
    sends `layout builder` (an explicit click) instead of opening a tab.

## Phase 4 — Multiple command bars + per-bar input mode (command-parsing + wire)

Mode is **per-bar**, not per-player (the chat bar wants chat scope while the
game bar is plain). The multi-bar bars are exercised by phase 2's
livestream-viewer (chat + game terminals).

- **Wire:** the client→server command message gains `barId?: string` (which
  input region it came from); thread from `backend/inbound/command.ts:82`
  into `executeCommand(commandText, { interactive, bodyFields, barId })` and
  onto the command context. Legacy/no-bar submissions → `'main'`.
- **Schema:** `cockpit.inputModes` — `Record<string,string>` (`{ barId →
  prefix }`), default `{}`, object-of-strings validator.
- **Verb:** `mud/cmd/shell/mode.yaml` + `mud/obj/command/shell/ModeController.ts`
  — reads the dispatch's `barId` from context: `mode off`/bare `mode` → delete
  `inputModes[barId]`; `mode <prefix…>` → set it; the StyleController commit
  triple (write the whole map + save + push). Register on
  `commandContributions.self`.
- **Interpreter prepend (load-bearing):** pure helper in `mud/api/command.ts`:
  ```ts
  static applyInputMode(rawText: string, modePrefix: string): string {
    if (!modePrefix) return rawText;                       // no-op
    const t = rawText.trimStart();
    if (t.startsWith('/')) return t.slice(1);              // escape → run raw
    if (t.split(/\s+/)[0]?.toLowerCase() === 'mode') return rawText; // mode-cmd exempt
    return `${modePrefix} ${rawText}`;
  }
  ```
  Hook in `CommandGiver.executeCommand` right after `giver` is bound (`:500`),
  before context build (`:521`):
  ```ts
  const modes = (opts.interactive && !opts.forced && MixinApi.isHasInteractive(giver))
    ? giver.getClientState<Record<string,string>>('cockpit.inputModes') : undefined;
  commandText = CommandApi.applyInputMode(commandText, modes?.[opts.barId ?? 'main'] ?? '');
  ```
  The `interactive && !forced` gate confines it to real player input (scripts/
  NPC/forced bypass — no barId). `barId` also rides the command context so
  `ModeController` knows which bar. `applyInputMode` stays pure (per-bar
  lookup at the call site); `msh.ts` stays Stuff-unaware. Echo reflects the
  **dispatched** text.
- **Client (display-only):** delete the `inputMode` store slice. Each
  `CommandBar` is bound to a `barId` and **submits it** with every command;
  it drops the `mode` interception + prefix-wrapping (`:566-590`) —
  `submitBase` sends verbatim. Its indicator pill reads
  `clientState['cockpit.inputModes'][barId]`; pill-close + Esc send `mode off`
  from that bar. `ForumChatSidecar`'s "talk here" sends `mode chat <handle>`
  from the forum bar; `active` derives from clientState.
- **Layout-set bar scope (optional, v1-cuttable):** a hardwired chat bar
  (viewer's chat terminal) seeds its scope by the *client* sending
  `mode <scope>` on layout mount (command-bus primacy, no server-seeds-mode
  coupling) — or ship user-set-only and add the default later.

**Acceptance:** `mode chat` from bar X → bare `hello` from X dispatches
`chat hello`; a command from a different un-moded bar is unaffected; `/look`
runs raw; `mode`/`mode off` never prefixed; `mode off` clears that bar; no
mode = verbatim no-op; each bar shows its own indicator; submissions carry
`barId`.

## Phase 5 — Summoned-pane tier + settings pane (soft-depends on the notification-settings backend; cuttable)

The modal-killer second tier + its first consumer. A **summoned pane**
renders beside the current layout's terminal (never full-screen, never
blocks input — the inspection pane is the existing proof).

- **Mechanism:** a generic summoned-pane slot in the always-on chrome (or a
  per-layout secondary-pane slot) a layout/affordance fills with a content
  component and dismisses, terminal always beside it. A small registry of
  pane kinds (`settings`, future `detail`).
- **`components/settings/SettingsPane.tsx`:** **notification categories**
  (from the external backend's surface; **degrade gracefully** to a "coming
  soon" placeholder when absent) + **env/user vars** (driven by the existing
  `settings` / `var` verbs + the `EnvironmentMixin` schema). Every control
  **sends the real command** per command-bus primacy — no client-only
  settings state.
- **Entry:** a `settings` affordance (a Views-menu item or chrome button)
  opens the pane — **not** a `layout` switch (it coexists with the current
  layout).

**Acceptance:** the settings pane opens beside a live terminal (no modal);
controls send real commands; notification categories render when the backend
is present and degrade when not. **Dependency:** the notification-settings
backend (separate, landing on master) — if not yet landed, ship the
env/user-vars half + the graceful placeholder.

## Hard / risky parts (approach + decision)

1. **Interpreter prepend on the hot path** — a *pure* `applyInputMode`
   (exhaustively unit-tested) behind an `interactive && !forced` gate; empty
   input already short-circuited upstream; `/` **strips** the slash so
   `/look` lexes as `look`; echo = dispatched text. One pure fn + one gated
   reassignment; no `msh` change.
2. **Layout refactor** — extract the two `mainView` branches verbatim into
   `World`/`ForumLayout`; `forumNav` stays client-only nav set by clicks in
   `ForumView`. Forum entry is the explicit `layout forum` (Views menu); no
   `ForumController` change (decision #1 — no auto-switch).
3. **Platform-agnostic embed** — `StreamSource` union; Twitch wired (parent
   from `window.location.hostname`, sandboxed), YouTube shape-only; chat/game
   terminals = allowlist + complement client filters.
4. **CMS re-home** — mount unchanged `CmsSurface` in `BuilderLayout`; WS now
   always live; `?surface=cms` → deep-link; server surface + attribution
   bridge untouched.
5. **Safe deletions** — forum entry + chat "talk here" re-pointed over the
   bus; update `forumStore.test.ts` (asserts the deleted slices).

## Test strategy (no new infra needed)

- **`CommandApi.applyInputMode`** unit table: no-prefix verbatim; `chat`+`hello`→`chat hello`;
  `/look`→`look`; `mode off`/`mode chat x` pass through; whitespace edges.
- **`LayoutController`/`ModeController`/`ForumController`**: clientState set +
  push fired (spy the injected push); unknown layout → rejected note, no write;
  `forum post` does NOT set layout.
- **`executeCommand` integration**: `cockpit.inputModes={main:'chat'}` + barId
  `main` → bare `hello` runs verb `chat`; a command with a different/un-moded
  barId is unaffected; forced/no-interactive bypasses (regression).
- **`StreamSourceApi.current()`**: valid/malformed JSON; welcome payload
  includes `broadcastSources`; the `StreamSourcesChanged` listener fans to
  `getAllInteractives()`.
- **Schema**: default `'world'`; validator rejects unknown via raw setClientState.
- **Client**: update `forumStore.test.ts`; registry test (every `LayoutName`
  resolves); CommandBar no-wrapping. Gate on `pnpm build` green + shared
  wire-type compiling both ends.

## Critical files
- `packages/server/src/mud/lib/command/CommandGiver.ts` — the `executeCommand` prepend hook
- `packages/server/src/mud/lib/connection/HasInteractive.ts` — clientState schema
- `packages/client/src/App.tsx` — registry dispatch + always-on minimum; delete mainView/recognizeForumNavigation/CMS-takeover
- `packages/client/src/store/index.ts` — delete mainView + inputMode slices; add broadcastSources
- `packages/types/src/index.ts` — LayoutName/LAYOUT_NAMES, StreamSource, StreamSourcesEnvelope, broadcastSources
- `packages/server/src/mud/obj/command/shell/StyleController.ts` — the write+save+push template

## Cross-references
- Requirements: [cockpit-layouts-requirements.md](../requirements/cockpit-layouts-requirements.md)
- Seams: [client-shell.md](../subsystems/client-shell.md), [cms.md](../subsystems/cms.md), [livestream.md](../subsystems/livestream.md), [command-parsing.md](../subsystems/command-parsing.md), [twitch-relay.md](../subsystems/twitch-relay.md), [app-settings.md](../subsystems/app-settings.md)
