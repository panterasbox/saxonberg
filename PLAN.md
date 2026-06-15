# Pantera's Box Livestream — Master Plan

Status legend: ✅ done · 🔨 in progress · 📋 planned · 🔒 needs owner approval (server-side)

---

## 1. Brand foundation

**Hierarchy.** Pantera's Box (PB) is the forward-facing **parent** brand. **Saxonberg** (the multiplayer text game) and **the livestream** are *sibling productions* under PB — the livestream is **not** part of saxonberg.

- Livestream chrome = **PB brand**: navy/white/crimson, the Borromean-rings seal, scholarly-society tone.
- Saxonberg's **watercolor storybook** house style (Beatrix Potter / E.H. Shepard, via the `gpt-image-1` `illustrate.ts` pipeline) is **only** saxonberg's in-world content. It does *not* govern livestream overlays.
- On stream this is two intentional registers: **PB chrome = the frame**, **saxonberg = the content** shown within it.

**Origin.** Both names come from E.L. Konigsburg's *From the Mixed-Up Files of Mrs. Basil E. Frankweiler*. **Saxonberg** is Mrs. Frankweiler's lawyer; the **Borromean rings** are Michelangelo's stonemason's mark — the payoff that authenticates the marble *Angel*. So the rings mean *the mark of authentic authorship*. (Live meta-note: the show is built largely with AI agents, under a seal about authentic authorship.)

**Tokens (shared across PB surfaces).**
- Palette: Old Glory Blue `#002147` (ground), white (text), Old Glory Red `#BB133E` (accent — *attention/state/urgency only*, never decorative). Emphasis blue `#4D9FFF` for interactive bits on the dark ground.
- Type — the three-voice model (mirrors saxonberg's `faces.ts`): **serif = the world speaks · sans = the app chrome · mono = you + the machine** (Source Serif 4 / Source Sans 3 / Source Code Pro, self-hosted, no CDN).

---

## 2. The show

Not a coding stream anymore — an **agentic-dev** stream: orchestrating multiple Claude sessions, reviewing MRs, system design, validating in browser. Premise: *"watch me conduct a swarm of AIs to build the world you're standing in — and help decide what they build next."*

**Defining rhythm: agentic dev is mostly *waiting*** for agents to run. That dead time is structural — and it's where you turn to the world and the community. The gaming/piano scenes exist precisely to fill it.

**Two frames** (scene families):

| Work frame (swappable hero + rails) | Show frame (fullscreen + corner cam + light chat) |
| --- | --- |
| War Room (terminal / orchestration) | The World (saxonberg, community time) |
| UI-Verify (browser) | Gamez (game fullscreen) |
| Split (terminal + browser) | Piano (visualizer fullscreen) |
| Review (MRs / docs) | Standby / AFK (the monastery) |
| Design (markdown / architecture) | |

Principles:
- **Surface-agnostic hero**: one center slot holds terminal / browser / split; the frame (cam, Agent Board, chat lower-third, World Ticker) stays constant. Future-proof as work shifts server→UI.
- **Overlays supply what the hero lacks**: terminal hero → show World Ticker + chat; browser-showing-the-game hero → suppress them (avoid doubling).
- **Persistent work anchors**: the **World Ticker** (live saxonberg state — always-on heartbeat) and the **Agent Board** (kanban of what each Claude is doing — turns invisible orchestration into a spectator sport). These belong to the Work frame; Show scenes shed them (optional minimized Agent-Board "pill").
- **Terminal-first toolchain**: Windows Terminal → WSL → tmux, big font, ~80–90 cols. `glow`/`bat`/`yazi` replace VS Code's preview/file-tree; VS Code demotes to an occasional scratch-edit cut-away. Camera follows attention; overlays carry persistent context (show one focused agent big, not a 2×2 tile).
- **Local/prod as metaphor**: AWS prod = the canon world (serves overlays, where viewers live); local = the forge (where you build the next version). Hero can carry a `DEV/LOCAL` tag.

Capture: hybrid — display/region-capture the work surface (FancyZones-style), composite PB overlays as **OBS browser sources** on top (transparent, switchable, no desktop chrome leak).

---

## 3. Surfaces

1. **(a) OBS broadcast output** — what goes out to Twitch/YouTube; streamer composes.
2. **(b) Viewer experience** in the saxonberg app — embed + interactive HUD (see §6).
3. **(c) Streamer-mode controls** in the saxonberg client — drive overlays.
4. **Stream Deck** (via the existing `pblive` backend) — physical buttons.

**One command bus, many remotes.** Overlay/scene control = commands in saxonberg's existing bus. CLI, React streamer-mode, and Stream Deck are thin remotes that all fire the *same* commands → mutate `StreamState` → overlays react. Stream Deck reaches it through `pblive` (a new `OverlayController` forwarding to saxonberg). Logic is written **once**.

---

## 4. Integration architecture (overlay app ⇄ saxonberg)

Two directions over saxonberg's existing WebSocket:

- **Outbound (read-only): the broadcast feed.** A curated server projection pushes public game state + `StreamState` to overlay connections. Safe by construction — DMs/private channels are never tapped.
- **Inbound (control): scoped commands.** Streamer commands (scene, lower-third, `awayUntil`) and — later — *viewer* commands (HUD clicks) enter the same command bus, scoped by identity.

### Key findings from the saxonberg recon

- **WS auth**: session middleware on upgrade → `userId` from `session.passport.user.id`; 401 otherwise (`services/websocket/WebSocketService.ts`).
- **Test-login bypass** is gated by `AUTH_MODE==='test'` (+ boot-abort if `NODE_ENV=production`). Correctly **dead in prod** — so the broadcast principal must be a **separate, prod-enabled** path, not this.
- **No service/bot identity exists yet.**
- **Subscriptions**: `mql-subscribe` → `mql-subscription-result` (snapshot) → `mql-subscription-delta`. All read-only/query-only. **No REST** for game state (and none needed — snapshot+deltas covers it).
- **Chat frames carry a structured `payload`** (`channelId`, `speaker.displayName`, `text`) *and* an MML `body`. → For chat display we render off `payload`; **no MML renderer needed initially.**
- **MML**: `parseMml.ts` is zero-import (copy verbatim); `MmlRenderer.tsx` only entangles `useStore` (stuff lookup) + `FACE_STACKS`. Extractable to a shared package with a small refactor — **deferred** until prose-rich overlays.
- **`@saxonberg/types`** is a single-file, `private` workspace package.

### Decisions

- **Repo: keep pbox-stream a sibling repo.** Consume `@saxonberg/types` via a local `link:`; **Vite bundles it at build → no runtime package dep, no publishing.** Promote a shared `@saxonberg/mml` package only when prose overlays need it (a DRY win for saxonberg too).
- **Broadcast auth**: a `service:broadcast` principal, **read-only, no `CommandGiver`** (commands auto-rejected, subscriptions allowed). Authenticated by a prod secret. Because the overlay is a **browser** (OBS browser source) the token rides as a **query param / WS subprotocol** (browsers can't set WS headers) — acceptable since it grants only public read-only data and the OBS source URL is private to the streamer.
- **Feed**: a dedicated **`BroadcastFeed`** server projection (taps public events + `StreamState`), *not* a fake spectator avatar shoehorned into audience routing.
- **`StreamState`**: session-wide doc holding overlay state (active scene, lower-third text, camera focus, `awayUntil`, alert queue). Mutated by commands, pushed via the feed.

---

## 5. The overlay app — `~/play/pbox-stream`

OBS browser sources, multi-page Vite + React + r3f. Sibling to `saxonberg`/`pblive`/`flagwaver`.

**Built ✅**
- Repo scaffold, shared tokens (`palette.ts`, `faces.ts`), self-hosted fonts.
- **Cloth engine** (`src/engine/`) — flagwaver's Jakobsen Verlet cloth ported to modern three.js: physics primitives near-verbatim, geometry/render rebuilt on `BufferGeometry` (THREE.Geometry/ParametricGeometry were removed in r125), `MeshStandardMaterial` (PBR), Perlin-ish gust wind.
- **Standby/AFK overlay** (`/standby.html`) — generated blue-hour monastery backdrop (rings in the window), waving PB banner on a brass crossbar, three-voice timer + rotating serif aphorism. Resilient layering: monastery as CSS, timer as DOM, banner as an error-boundaried transparent WebGL layer (degrades gracefully — never a blank screen).
- Verified: typecheck, prod build, live render. `awayUntil` currently demo/`?until=` param.

**Polish backlog 📋**
- Banner: pennant point (alpha-cut), woven normal/roughness maps, shadow cast on the wall, final motion tuning.
- Optimize the 5.8 MB banner albedo.

**Overlay roadmap 📋**
- Chat lower-third (prose-wide, channel-colored, off `payload`).
- World Ticker (presence/events).
- Agent Board (per-Claude status lanes).
- Lower-thirds, alerts, transition stingers.

---

## 6. Viewer experience (saxonberg app) — embed-as-stage

**Video-as-stage, controls-as-HUD.** The embedded Twitch/YouTube stream goes **near-full-bleed**; game affordances float as an edge-docked HUD. Feels like a game client, works on mobile, and makes the watch-and-play pitch physical.

Rules:
- **Legibility over moving video**: every HUD element gets a scrim/blur/opaque backing.
- **No occlusion**: dock to edges/corners, collapsible/auto-hide, keep center clear.
- **No double-overlay**: *interactive + live state → app HUD; ambient + branding → baked into the broadcast.* Never both.
- **Latency**: video lags live state by seconds. HUD is driven by **game state, not video pixels**. Decide per-feature: act on **live state** (ahead of video) vs **delay HUD to match video**.
- Consequence: in-app viewers have the live HUD, so they may want a **cleaner broadcast** — baked overlays mainly serve the twitch.tv/bare-embed audience without a HUD.

---

## 7. Viewer interactivity ("click stuff on the stream")

- That tech is **Twitch Extensions** — but Extensions render only on twitch.tv / Twitch apps, **not on third-party embeds**. Wrong tool for an embed-first design.
- **Better: a native interactive layer in the saxonberg embed.** Viewers are already authenticated saxonberg users, so clicks are authenticated. No sandbox/review/PubSub limits, full game integration, and **platform-agnostic** (works for Twitch *or* YouTube — so the platform choice doesn't constrain interactivity).
- Viewer clicks = **scoped commands into the same command bus** → the "gamify the community / tune incentives" flywheel, made literal. Inbound half of the WS integration; broadcast feed is the outbound half.
- Account-linking (Twitch) is for the **chat-identity bridge**, not interactivity.
- Optional, much later: a thin Twitch Extension as a **funnel** for the twitch.tv-only audience into the full saxonberg experience.

---

## 8. Phased roadmap

Each phase is end-to-end. 🔒 = server-side, needs owner approval before implementation.

- **Phase 0 ✅** — Standby overlay vertical slice (done; proves the engine + composition + tokens).
- **Phase 1 🔒** — *Make the countdown real.* Broadcast token auth (`service:broadcast`), minimal `BroadcastFeed` pushing `StreamState` (incl. `awayUntil`); wire `useAwayTimer` to it. Smallest possible proof of auth + feed + the whole loop.
- **Phase 2 🔒** — *Public chat over the feed.* Forward `world.chat.message`; build the chat lower-third off `payload`.
- **Phase 3** — *Control plane.* `StreamState`-mutating commands (scene / lower-third / afk) drivable from CLI → then React streamer-mode → then Stream Deck (`pblive` `OverlayController`).
- **Phase 4** — *World Ticker + Agent Board.*
- **Phase 5** — `@saxonberg/mml` extraction for prose-rich overlays.
- **Phase 6** — *Viewer experience*: embed-as-stage layout + interactive HUD.
- **Phase 7** — *Inbound viewer commands* (scoped) — the interactive flywheel.
- **Later** — optional Twitch Extension funnel.

Phase 1 is explicitly designed so the feed extends toward inbound viewer commands later (not a read-only dead end).

---

## 9. Open decisions

- 🔒 **Approve Phase-1 server changes** (broadcast token mechanism, `BroadcastFeed`, `StreamState`) — owner gates all saxonberg server work. Implement behind a config flag echoing the existing `AUTH_MODE` pattern.
- **Twitch vs YouTube** as the broadcast platform — still open; native-HUD interactivity makes it non-blocking for the app, but it affects the chat bridge and account-linking.
- **Latency model** for HUD/interaction (act-on-live vs delay-to-video) — per-feature, decide as we build the HUD.
- Banner final tuning + pennant/normal-map polish.

## 10. Decided

- Brand hierarchy & tokens (§1). · Two-frame scene model (§2). · Terminal-first toolchain (§2). · Sibling repo + `link:` types, Vite-bundled (§4). · Read-only `service:broadcast` principal, query-param token (§4). · `BroadcastFeed` projection over fake-spectator (§4). · Chat off `payload`, defer MML (§4). · Video-as-stage + HUD, no double-overlay (§6). · Native interactive layer over Twitch Extensions (§7).
