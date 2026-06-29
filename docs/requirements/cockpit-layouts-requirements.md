# Cockpit layouts + server-authoritative input mode — requirements

Two cleanups that share one principle: **the client owns zero command
semantics.** The server is the single source of truth for both *what the
cockpit looks like* (layout) and *how your typing is scoped* (input mode);
the client merely displays that state and routes frames.

1. **Layouts.** Unify all cockpit view-switching under one
   server-authoritative axis. Today the client has a transient, client-only
   `mainView` (`terminal` | `forum`) flipped by a client-side input-watcher.
   This replaces it with a `clientState`-backed **layout** the player sets
   with a **`layout <name>`** verb; the client holds a `layout → component`
   registry and swaps the whole cockpit. The existing terminal and forum
   views fold in as layouts; new layouts ship: **livestream-viewer**,
   **streamer**, and **builder** (the CMS, folded in from its standalone
   surface).
2. **Input mode (redo).** Today `mode <prefix>` is a *client-only* string
   trick (the command bar wraps `foo` → `<prefix> foo`). This moves it
   server-side: `mode` sets per-player state, the **command interpreter
   prepends the prefix on the way in**, and the client becomes a
   display-only indicator. This removes the last client-only command
   behavior, making command-bus primacy absolute.

Seeded by the [client-cockpit slate](../slates/tails/client-cockpit-slate.md)
("Modes" + the content-surface `live-stream` payload). Builds on the merged
[Twitch relay](../subsystems/twitch-relay.md), the
[livestream](../subsystems/livestream.md) substrate, the
[CMS](../subsystems/cms.md) surface, the
[command-parsing](../subsystems/command-parsing.md) entry path, and the
client's existing `clientState` channel.

## Goals

### Layout system
- A player's **layout** is server-authoritative per-player UI state on a new
  `clientState` key (e.g. `cockpit.layout`), set by a **`layout <name>`**
  verb, pushed via `pushClientStateUpdate`, restored from the welcome
  snapshot on reconnect, and synced across the player's connections. Default
  `world`.
- The client owns a **layout registry** keyed by layout name; on a
  `cockpit.layout` change it swaps the whole cockpit. The current
  client-local `mainView` field and the `recognizeForumNavigation` watcher
  are **deleted**; their behavior is subsumed by the layout system.
- Layouts: **`world`** (today's terminal cockpit), **`forum`** (today's
  board view), **`livestream-viewer`**, **`streamer`**, **`builder`**.
- An **always-on minimum** (status header + command bar/input + a layout
  affordance + the input-mode indicator) renders in every layout, so the
  player can always type — including `layout world` to leave.
- A prominent client **"Views" menu** (dropdown) switches layouts; per the
  click model it previews/sends `layout <name>` (the first use teaches the
  verb).

### Livestream-viewer layout
- A large **video embed** pane + a **chat terminal** (a `Terminal` scoped to
  livestream chat topics — `world.twitch.message`, and future
  `world.youtube.message`) + a compressed **game terminal** (the inverse
  topic filter) + the always-on minimum. The two terminals reuse the
  existing per-tab `muted` filter mechanism over the one shared frame
  buffer; no new ingest-time routing.

### Platform-agnostic video embed (multistream-ready)
- A **`StreamSource`** platform-union value (`{platform:'twitch', channel}` |
  `{platform:'youtube', videoId}`) in `@saxonberg/types`.
- A server-owned **broadcast source descriptor** (`StreamSource[]`) derived
  from operator config (AppSettings/env), surfaced to player clients
  (welcome snapshot + a live push on change).
- The embed renders the **player-selected** source's iframe; the viewer
  **picks the platform** among available sources (no-op picker when one is
  configured). **Twitch is wired** (the Twitch player iframe); the YouTube
  source shape is defined and picker-accommodated but not rendered.

### Streamer layout
- The viewer layout **minus the video embed**, with a labeled **"stream
  stats — coming soon"** placeholder where the video was. The actual
  engagement-stats content is refine-later.

### Builder layout (CMS folded in)
- The existing CMS UI (`CmsSurface` tree + Monaco editor) is **re-homed**
  into an in-session `builder` layout, rendered within the main app with the
  **WebSocket session live** (today it is a `?surface=cms` full-screen
  takeover that opens *no* WS). The `CmsApi`/`CmsLogic` REST surface and the
  `CmsSession.runAsSessionPlayer` attribution bridge are **reused
  unchanged** — a client re-mount + layout integration, **not** a CMS
  rewrite. `?surface=cms` becomes a **deep-link** into `builder`; the
  standalone no-WS takeover is retired.

### Multiple command bars + per-bar input mode (server-authoritative)
- A layout may have **multiple terminals, each with its own command bar**
  pinned to its bottom (input lives with its output). Each bar carries its
  own **input mode** (scope/prefix); modes are **per-bar, not per-player** —
  a single global mode is wrong when terminals are topic-filtered (the chat
  bar wants chat scope while the game bar is plain).
- **`mode <prefix>`** / **`mode off`**, issued from a given bar, set/clear
  **that bar's** mode. Modes live server-side as a `clientState` map
  `cockpit.inputModes` (`{ barId → prefix }`).
- Command submissions carry a **bar id** (context — *which* input region the
  command came from, not a client rewrite). The **command interpreter
  prepends that bar's prefix** before tokenizing, with two exemptions: a line
  beginning with the **escape char `/`** (runs raw) and the **`mode` command
  itself** (so `mode off` always works). `chat`-mode bar + typing `hello` ⇒
  the server dispatches `chat hello`.
- A bar's scope may be **layout-set** (a hardwired chat bar, set when the
  layout mounts) or **user-set** (`mode` from that bar).
- The client deletes its input-wrapping (`inputMode` store slice + the
  CommandBar prefixing); each bar renders a **display-only mode indicator**
  from `cockpit.inputModes[barId]`. Affordances that set a mode (e.g. the
  chat sidecar's "talk here") **send `mode <prefix>`** like any command.

### Composition grammar + the no-modal / summoned-pane tier
- Every layout obeys the shared **composition grammar** — see
  [cockpit-composition.md](../cockpit-composition.md) (the never-blind law,
  fixed-chrome/fluid-content, hierarchy-encoding splits, the canonical
  splits, the responsive tiers). Layouts are variations on one system.
- **No modals.** A would-be modal renders in one of two tiers, both keeping
  a terminal on screen: the **layout tier** (big/sticky, the `layout` verb)
  and the **summoned-pane tier** (transient panes beside the current
  terminal — the inspection pane is the existing proof). This build
  establishes the **summoned-pane tier** as a first-class mechanism.
- **Settings** is the first new summoned-pane consumer: a settings pane
  (notification categories + environment/user variables) that renders beside
  a terminal, with each control **sending the real command** (`settings` /
  `var` / the notification-settings verbs) per command-bus primacy. The
  notification-settings **backend is being built separately (landing on
  master)**; the pane consumes it when present and degrades gracefully when
  absent.

## Non-goals

- **YouTube video rendering** — the `StreamSource` union + picker
  accommodate `youtube`, but only the Twitch iframe renders this cycle. The
  YouTube **chat relay** is a separate queued build (distinct from this
  video work).
- **Any auto-switching of layout** — no domain verb, NPC, item, or URL
  implicitly changes layout this cycle. The only switch is the explicit
  `layout` verb (+ the Views menu). The slate's diegetic-trigger vision
  (verbs/NPCs that flip layout) is deferred.
- **Stream-engagement stats content** — streamer mode ships the placeholder
  only.
- **CMS feature changes** — the fold re-homes the existing surface; no new
  CMS capability (versioning / op-log / editor tiers stay deferred per
  [cms.md](../subsystems/cms.md)).
- **Auto-tuning the relay on viewer entry** — entering livestream-viewer
  does **not** auto-tune the broadcast channel's chat; the chat terminal is
  relay-topic-scoped and shows whatever the player has `twitch tune`'d.
  (Auto-tune is a noted future nicety.)
- **The notification-settings backend** — built separately (landing on
  master); this build only renders it in the settings pane (graceful when
  absent). No new settings/notification server surface here beyond what the
  settings pane needs to drive the existing `settings`/`var` verbs.
- **A full settings catalogue** — the settings pane establishes the
  summoned-pane pattern and surfaces notification categories + env/user
  vars; an exhaustive settings UI is later content.
- **Per-connection input-mode** — modes are per-bar (and a player's bars are
  layout-defined); per-*device* input contexts remain a later refinement.
- **Mobile layouts** — the registry must not assume desktop-only real
  estate, but mobile layouts are their own slate.
- **Study / classroom / tutor layouts** — the slate's other catalogue
  entries are out; this build does world / forum / livestream-viewer /
  streamer / builder.

## Surface decisions

### One server-authoritative layout axis; the client-local `mainView` is deleted
Layout is server-authoritative per-player UI state, identical in kind to
`console.tabs` — so it's a `clientState` key, set by the `layout` verb,
pushed + persisted. The transient client-only `mainView` and
`recognizeForumNavigation` are removed; *all* layout lives in the one axis.
Default `world`. (This unifies what were two parallel systems — the
client-local view flip and the proposed mode push — into one.)

### The verb is `layout`; the menu is "Views"
The switch verb is **`layout <name>`** — it pairs with the existing `style`
verb (the cockpit-config family: `style` = appearance, `mode` = input scope,
`layout` = arrangement). Not `mode` (taken by input-scope), not `view`
(collides with the in-game vision concept). The client dropdown is labeled
**"Views"** (newcomer-legible) and sends `layout <name>` on use; menu noun
and verb intentionally differ.

### `layout` is the only way to switch — no auto-switch (deferred)
Layout changes happen **only** through the explicit `layout` verb — typed,
or sent by the **"Views" menu** dropdown per the click model. **No domain
verb, URL, NPC, or item implicitly changes layout this cycle.** The `forum`
verb stays pure forum CRUD; you reach the forum board via `layout forum`
(or the Views menu), not as a side effect of `forum`. The standalone
`?surface=cms` takeover is retired; builder is entered the same way
(`layout builder` / the menu), not via an on-load auto-switch. This costs
nothing in discoverability — the Views menu makes every layout one click.
Auto-switching off domain triggers (the slate's diegetic-trigger vision) is
**deferred**.

### Input mode moves to the server; the interpreter applies it
`mode <prefix>` / `mode off` set per-player input-mode on `clientState`
(`cockpit.inputMode`). The **command-parsing entry** (`CommandLineApi` /
the `msh` dispatch path) gains a pre-tokenize step: if the dispatching
player has an input mode set, and the raw line is neither `/`-escaped nor a
`mode` command, prepend the prefix. The interpreter reads the mode from the
player's `clientState` server-side. The client is display-only. Per-player
granularity; `/` is the escape. This is the load-bearing, sensitive change —
it sits on the hot path every command traverses.

### Broadcast sources: operator config, surfaced live, viewer-picked
The streamer's live channels are operator config (AppSettings/env, mirroring
`TWITCH_READER_USER_ID`), a platform-tagged `StreamSource[]` owned by the
livestream substrate, surfaced to player clients (welcome snapshot + live
push). The viewer renders the embed for the selected platform. Twitch wired;
YouTube shape-defined, picker-accommodated, not rendered.

### Builder = the CMS re-homed; Streamer = viewer-minus-video
Builder mounts the existing `CmsSurface` in-session (WS live), reusing the
unchanged REST surface. Streamer reuses the viewer layout with the video
pane replaced by a labeled placeholder. Both as described in Goals.

## Constraints

- **Command-bus primacy is now absolute.** Every layout switch and every
  mode change is a real command on the wire; the client never carries
  command semantics of its own (the `mainView` flip and the `inputMode`
  wrap are *deleted*, not relocated). ([client-cockpit slate](../slates/tails/client-cockpit-slate.md))
- **Reuse `clientState`.** Layout and input-mode both ride the existing
  `clientStateSchema` + `pushClientStateUpdate` + `client-state-update`
  envelope + welcome-snapshot restore. No parallel per-player UI-state path.
- **The interpreter hook is load-bearing.** The input-mode prepend sits on
  the raw-input entry every command crosses; it is a clean, well-tested
  pre-tokenize step keyed on the submission's **bar id** (looking up that
  bar's prefix in `cockpit.inputModes`), that cannot mangle escaped or
  `mode`-management input, and is a verbatim no-op when the bar has no mode.
  The inbound command message gains a `barId` field (threaded to the
  interpreter).
- **The composition grammar is binding.** Every layout obeys
  [cockpit-composition.md](../cockpit-composition.md) — never-blind,
  fixed-chrome/fluid-content, hierarchy-encoding splits, the canonical
  splits, the responsive tiers. No modals: would-be modals are layouts or
  summoned panes that keep a terminal visible.
- **Command preview moves to the ghost command line; affordance clicks are
  unmoded.** Per-bar mode forces preview out of the (now multiple, now moded)
  command bars into a dedicated always-on **ghost command line** (a
  command-styled strip beside the primary bar). A clicked affordance submits
  with **no `barId`** so the interpreter never prepends — preview equals send.
  Shift-click-loads-a-bar is **retired** (no honest target under N bars),
  replaced by copy-to-clipboard (paste explicitly). Typed/pasted input in a
  bar still obeys that bar's mode. See the click-model table in
  [cockpit-composition.md](../cockpit-composition.md).
- **Embed safety.** Third-party iframes (Twitch now, YouTube later) are
  sandboxed/allowed appropriately; the Twitch player's `parent` param is
  config-driven (the host domain), never hard-coded.
- **CMS fold is re-home only.** The server `CmsApi`/`CmsLogic`/`/api/cms/*`
  and `CmsSession.runAsSessionPlayer` are untouched; the Monaco editor stays
  lazy-loaded.
- **Layout registry accommodates mobile** (no fixed-desktop-columns
  assumption); **always-on minimum** in every layout.
- **Client conventions.** New components under `packages/client/src/
  components/`, stores under `src/store/`, services under `src/services/`;
  React + Zustand + styled-components; no free-floating modules.

## Acceptance criteria

- `layout <name>` sets `cockpit.layout`; the client receives the
  `client-state-update`, swaps the whole cockpit, and the layout **persists
  across reconnect**. Unknown names rejected with a clear note.
- `cockpit.layout` is in `clientStateSchema` (default `'world'`); a fresh
  player loads in `world`. The client-local `mainView` +
  `recognizeForumNavigation` are gone; the forum board view is reached via
  `layout forum` (or the Views menu), and the `forum` verb itself does
  **not** change layout (no auto-switch).
- **World** renders the current cockpit, behavior-identical (regression).
- **Livestream-viewer** renders a Twitch embed (selected source) + a chat
  terminal showing only `world.twitch.message` (accommodating
  `world.youtube.message`) + a game terminal of the complement + always-on
  minimum.
- `StreamSource` lands in `@saxonberg/types`; the operator-config Twitch
  source is surfaced (snapshot + live push) and the embed renders it; the
  platform picker is present and a no-op for one source.
- **Streamer** renders the viewer layout minus the embed + the stats
  placeholder. **Builder** renders the CMS tree + Monaco in-session (WS
  connected); `?surface=cms` deep-links into builder; CMS reads/writes work
  through the unchanged REST surface.
- The **"Views" menu** previews/sends `layout <name>` per the click model.
- **Per-bar input mode:** `mode <prefix>` from a given bar sets
  `cockpit.inputModes[barId]`; a subsequent bare command **from that bar** is
  dispatched with the bar's prefix prepended, while a command from a
  different (un-moded) bar is unaffected; `/` escapes a one-off raw command;
  `mode` / `mode off` are never prefixed; `mode off` clears that bar. With no
  mode set the interpreter is a verbatim no-op (regression). Each bar shows
  its own indicator; the client no longer wraps input. Tests cover the
  interpreter prepend keyed on `barId` (the two exemptions + the no-op).
- **Multiple command bars:** a multi-terminal layout (livestream-viewer)
  renders a bar per input-taking terminal; submissions carry the originating
  `barId`.
- **Settings pane (summoned-pane tier):** a settings pane renders beside a
  terminal (never a full-screen modal); its controls send the real
  `settings`/`var`/notification commands; it surfaces notification categories
  when the (external) backend is present and degrades gracefully otherwise.
- **Composition:** each shipped layout conforms to
  [cockpit-composition.md](../cockpit-composition.md) (canonical split,
  always-on terminal, fixed chrome).
- Client `pnpm build` green; the shared wire-type change compiles on server
  + client; the relevant server tests (the `layout`/`mode` verbs' clientState
  writes, the interpreter prepend, the StreamSource surfacing) pass.
- A subsystem doc exists (a new `docs/subsystems/cockpit-layouts.md` or a
  documented section in `client-shell.md` — decided at finalize) covering
  the layout axis + registry, the five layouts, the `StreamSource` embed,
  the CMS fold, and the server-authoritative input-mode + interpreter hook.

## Suggested phasing (for the Plan phase)

The build is large and naturally sequences (the planner owns the final
shape):

1. **Layout substrate** — `cockpit.layout` clientState key + `layout` verb +
   client layout registry; extract `world`, fold in `forum`, delete
   `mainView`/`recognizeForumNavigation`. (The "Views" menu.)
2. **Livestream-viewer + embed** — the multi-pane layout, the `StreamSource`
   union, operator-config sources surfaced live, the Twitch embed +
   topic-split terminals.
3. **Streamer + builder** — the streamer stub; the CMS re-home.
4. **Per-bar input-mode** — the multi-command-bar substrate (barId on
   submissions; `cockpit.inputModes` map), the server `mode` verb + the
   interpreter prepend keyed on barId + client display-only. (Touches
   command-parsing + the wire command shape; the multi-bar bars themselves
   are exercised by the livestream-viewer layout from phase 2.)
5. **Summoned-pane tier + settings pane** — the modal-killer second tier and
   its first consumer (the settings pane). Soft-depends on the
   notification-settings backend landing on master; degrades gracefully.
   Cuttable / deferrable if the build runs long.

## Cross-references

- **Design reference (binding):** [cockpit-composition.md](../cockpit-composition.md)
  — the layout grammar every layout obeys
- **Seeding slate:** [client-cockpit-slate.md](../slates/tails/client-cockpit-slate.md)
- **Builds on:** [twitch-relay.md](../subsystems/twitch-relay.md),
  [livestream.md](../subsystems/livestream.md), [cms.md](../subsystems/cms.md),
  [client-shell.md](../subsystems/client-shell.md),
  [command-parsing.md](../subsystems/command-parsing.md) (the interpreter
  entry the input-mode prepend hooks), [topics.md](../subsystems/topics.md)
- **Client-state precedent:** `HasInteractiveMixin.clientStateSchema`,
  `pushClientStateUpdate`, the `client-state-update` envelope, the
  connection-established snapshot
- **Related future:** the YouTube chat relay (separate build); diegetic
  layout triggers + study/classroom/tutor layouts (the slate's broader
  catalogue); per-connection input mode
