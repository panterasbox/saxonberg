# Cockpit layouts + server-authoritative input mode — implementation plan

Phased plan for the build. **Authoritative spec:**
[cockpit-layouts-requirements.md](../requirements/cockpit-layouts-requirements.md)
— read it first; every Goal / Surface decision / Constraint / Acceptance
criterion there is settled. This plan is *how*. Branch:
`feature/cockpit-layouts-build` off `origin/master`.

**Through-line:** the client owns **zero** command semantics. Two
server-authoritative axes ride the existing `clientState` channel —
`cockpit.layout` (what the cockpit looks like) and `cockpit.inputMode` (how
typing is scoped). The client is a pure view: a `layout → component`
registry swaps the cockpit on a `cockpit.layout` update; the command
interpreter prepends the mode prefix server-side.

## Verified seams (build on these — do not re-discover)

| Seam | Location | Role |
|---|---|---|
| `clientStateSchema` (flat array) | `mud/lib/connection/HasInteractive.ts:176` | add `cockpit.layout`, `cockpit.inputMode` |
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

1. **`forum <board>` deep-open — PENDING USER.** Default in this plan:
   accept the one-click downgrade (typing `forum` opens the forum layout's
   board list; opening a specific board is a click). If we want zero
   regression, `ForumController` pushes the board handle for the client to
   auto-select (a small server-driven `forumNav` add). *Confirm before
   Phase 1.*
2. **`cockpit.inputMode` shape** — empty-string = unset (not `null`). The
   indicator shows the **raw prefix** (`chat devtalk`), not a separate
   friendly label (server stores only the prefix).
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
  (Add `cockpit.inputMode` now too, to avoid a second schema edit.)
- **Verb (new MVC pair):** `mud/cmd/shell/layout.yaml` (`verbs:[layout]`,
  `controller: shell/LayoutController`, `requiresHasInteractive` validator,
  one required `name`); `mud/obj/command/shell/LayoutController.ts` mirrors
  `StyleController` — narrow `MixinApi.isHasInteractive`, reject unknown name
  (`controller-rejected`), else `setClientState('cockpit.layout',name)` →
  `Avatar.save()` → `pushClientStateUpdate(...)` + confirmation line.
  Register on `HasInteractiveMixin.commandContributions.self` beside
  `style.yaml` (`:218`).
- **`ForumController`** — on bare `forum` / board-read only (not
  `post`/`vote`/`make`), also set `cockpit.layout='forum'` server-side (the
  replacement for the deleted client watcher). Factor the save/push triple
  into a shared helper (a thin `CockpitLayoutApi.setLayout(host,name)` or a
  private) so `Layout`/`ForumController` don't drift.

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
  - **Retire `?surface=cms` takeover → deep-link:** delete the
    `IS_CMS_SURFACE` full-screen branch (`:718`) + the `if (IS_CMS_SURFACE) return;`
    WS guard (`:424`) so WS always connects; on mount, once
    `connectionPhase==='in-world'`, `sendCommand('layout builder')` once and
    `history.replaceState` to strip the param. The dev account-menu CMS
    launcher sends `layout builder` instead of opening a tab.

## Phase 4 — Server-authoritative input mode (separable; command-parsing)

- **Schema:** `cockpit.inputMode` (default `''`, string validator).
- **Verb:** `mud/cmd/shell/mode.yaml` + `mud/obj/command/shell/ModeController.ts`
  — `mode off`/bare `mode` → write `''`; `mode <prefix…>` → trimmed prefix;
  the StyleController commit triple. Register on `commandContributions.self`.
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
  const modePrefix = (opts.interactive && !opts.forced && MixinApi.isHasInteractive(giver))
    ? giver.getClientState<string>('cockpit.inputMode') : '';
  commandText = CommandApi.applyInputMode(commandText, modePrefix);
  ```
  The `interactive && !forced` gate confines it to real player input (scripts/
  NPC/forced bypass). Echo reflects the **dispatched** text. `msh.ts` stays
  Stuff-unaware.
- **Client (display-only):** delete the `inputMode` store slice; `CommandBar.tsx`
  drops the `mode` interception + prefix-wrapping (`:566-590`) — `submitBase`
  sends verbatim; the indicator pill reads `clientState['cockpit.inputMode']`,
  its close button + Esc-on-active-mode send `mode off`. `ForumChatSidecar`'s
  "talk here" sends `mode chat <handle>`; `active` derives from clientState.

## Hard / risky parts (approach + decision)

1. **Interpreter prepend on the hot path** — a *pure* `applyInputMode`
   (exhaustively unit-tested) behind an `interactive && !forced` gate; empty
   input already short-circuited upstream; `/` **strips** the slash so
   `/look` lexes as `look`; echo = dispatched text. One pure fn + one gated
   reassignment; no `msh` change.
2. **Layout refactor w/o regressing forum** — extract the two `mainView`
   branches verbatim into `World`/`ForumLayout`; `forumNav` stays client-only
   nav set by clicks in `ForumView`; forum *entry* preserved by
   `ForumController`'s server-side layout write. The typed-`forum <board>`
   deep-open is the one-click-downgrade (decision #1).
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
- **`executeCommand` integration**: `cockpit.inputMode='chat'` → bare `hello`
  runs verb `chat`; forced/no-interactive bypasses (regression).
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
