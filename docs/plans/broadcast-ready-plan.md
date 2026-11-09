# Broadcast-ready — implementation plan

Executes [broadcast-ready-requirements](../requirements/broadcast-ready-requirements.md)
(seeded by [broadcast-ready-slate](../slates/builds/broadcast-ready-slate.md)). **Kind:**
feature — server + client + the Rodney overlay (`packages/rodney`), plus a small change in the
separate `pblive` repo. **Leads from:** kernel and overlay together; the kernel waves land first
because every client and overlay wave reads what they put on the wire. The first consumer is the
founder's weekly stream, and the build's exit criterion is the requirements' blocking drive run
against the real stack with OBS open.

What the code needs, in one paragraph: the server-wide `StreamState` singleton becomes a mixin on
the player's own character, saved by the persistence spine that already saves them, with five
phases, a standby reason read from a pack row, an agenda, and two wall-clock timers that re-arm
after a restart; the broadcast feed routes each streamer's state to the sockets opened with that
streamer's own token, over an allowlisted snapshot; private frames carry a server stamp the client
redacts while on air; the look pipeline says who is broadcasting; the client gets a controls card
that can pop out; Rodney is wired to the real feed; pblive gets a scoped control token.

---

## Grounding

Facts verified this cycle by opening the files. Paths are repo-relative unless marked.

### The stream today (server)

- `packages/server/src/mud/platform/idea/StreamState.ts` (111 lines) — ONE server-wide `Idea`
  singleton at `/platform/idea/StreamState`. `mode: 'live' | 'standby'`, `awayUntil: number | null`
  (epoch ms), both **TypeScript `private` plain fields with no `fieldMeta`** — in memory only; the
  docstring says *"Not a persisted record… a reboot resets to `live`."* `setAway` / `goLive` emit
  `Events.StreamStateChanged` with the whole snapshot. `canEvict` and `canDestruct` both veto.
- Its row is `packages/content/platform/content/platform/idea/StreamState.yaml`
  (`class: /platform/idea/StreamState`, `data: {}`) and it is a platform-pack **`boot:` entry**
  (`packages/content/platform/pack.yaml:72`, `role: sync-read`). Retiring it lowers the
  `lint:boot-entries` ceiling by one.
- `packages/server/src/mud/platform/idea/cmd/stream/StreamController.ts` (145 lines) — two
  subcommands, `away <duration>` and `back`; the shell-style duration parser (`15m`, `1h30m`,
  `90s`, bare number = minutes) lives here as a private static; it resolves the singleton with
  `StuffApi.findByTemplatePath`. The view is
  `packages/content/platform/content/platform/cmd/stream/stream.yaml` (`category: stream`,
  `validators: [/lib/command/validators/requiresStreamer]`, no `opens_card`).
- `packages/server/src/mud/lib/command/validators/requiresStreamer.ts` — preload calls
  `AccessApi.isStreamer(giver)`; the body refuses with *"you don't have permission to stream"*.
  `AccessRegistry.seedStreamersGroup` (`platform/idea/AccessRegistry.ts:116`) seeds the managed
  group `streamers` from env `STREAMER_PLAYER_IDS`; membership is by **player id**.
- `Events.StreamStateChanged: 'stream.stateChanged'` and `Events.RelayMessage` in
  `packages/server/src/mud/lib/events.ts:53-54`; payload map at lines 123/131. The payload today
  is a bare `StreamStateSnapshot` — **no player in it**.
- `packages/server/src/backend/BroadcastFeed.ts` (228 lines) — singleton; `connections: Set<socketId>`
  + a per-socket frame counter; on first connection subscribes to `StreamStateChanged` (push to
  **all**), `ReactionScopeDeltaEvent` (push to all) and `RelayMessage` (filtered by
  `isOverlayOwnChannel`, which reads env `OVERLAY_TWITCH_LOGIN` / `OVERLAY_YOUTUBE_CHANNEL` /
  `OVERLAY_KICK_CHANNEL`, then push to all). The 0→1 / 1→0 connection edge calls
  `StreamApi.setOverlayReading(on)`.
- `packages/server/src/services/websocket/WebSocketService.ts` — one env `BROADCAST_TOKEN`
  (min 16 chars, else the feed is disabled with an error log), `crypto.timingSafeEqual` compare,
  `?broadcast=<token>` checked **before** session auth (lines 147-175), accepted as the sentinel
  principal `service:broadcast` → `Backend.handleWebSocketConnect(ws, principal, sessionId, true)`
  → `Application.handleUserConnect(..., isBroadcast)` → `BroadcastFeed.addConnection(socketId)`.
  A broadcast connection has **no `Interactive`**.
- Inbound socket messages dispatch through `packages/server/src/backend/inbound/index.ts`
  (`inboundHandlers`: `ping`, `command`, `mql-*`, `forum-*`, `prompt-*`, `client-state-write`,
  `reaction-expand`, `affordance-resolve`). `handleCommand` requires a `CommandGiver` holder on the
  socket's `Interactive` and runs `Avatar.executeCommand`.
- Wire types in `packages/types/src/index.ts`: `StreamStateSnapshot` (2574), `StreamStateEnvelope`
  (2585), `RelayChatEnvelope` (2600), both in the `Envelope` and `EnvelopeTemplate` unions
  (2621-2654).
- `packages/server/src/mud/platform/idea/api/StreamLogic.ts` — `setOverlayReading` (292) sentinel-
  tunes the three env channels under `OVERLAY_SENTINEL` (`overlay:broadcast`);
  `startOverlayYoutubePoll` (541) re-resolves the founder's live broadcast every
  `youtube.overlayPollIntervalMs` (15 min, `packages/content/platform/content/settings/youtube.yaml`)
  through `YoutubeClient.liveVideoOf` (`backend/YoutubeClient.ts:285`, **`search.list?eventType=live`**,
  ~100 quota units). `YoutubeClient` authenticates with ONE operator reader
  (`YOUTUBE_READER_CLIENT_ID/_SECRET/_REFRESH_TOKEN`, line 144). There is **no per-user YouTube
  token anywhere**: `GoogleProfile` (`lib/identity/GoogleProfile.ts`) persists identity fields only
  (googleId, email, names, photo, rawProfile); `TwitchProfile` (`lib/identity/TwitchProfile.ts:49-50`)
  is the precedent for stored OAuth tokens — `accessToken`/`refreshToken` with
  `marshaller: EncryptedStringMarshaller.templatePath`. The Google strategies are
  `passport-google-oauth20` (`services/auth/PassportConfig.ts:27`); `AuthRoutes.ts` requests
  `scope: ['profile', 'email']` for both login (58) and link (261-263); `setupLinkRoutes` is
  provider-parameterized with `session: false` and `Backend.handleProviderLink`. No Helix
  `/streams` (viewer count) call exists in `backend/TwitchClient.ts`.

### Persistence, timers, events

- `packages/server/src/mud/lib/character/Avatar.ts:170-215` — the Avatar family's mixin stack,
  `PersistableMixin` **outermost**, wrapping `CartographerMixin(EstateMixin(ForkableMixin(
  SaxonbergClientMixin(ClientStateMixin(HasInteractiveMixin(AetherMixin(CalendarMixin(
  NotifyPolicyMixin(ContactsMixin(WardrobeMixin(PartyMemberMixin(SubjectSubscriberMixin(
  NamedMixin(ShelledCharacter)))))))))))))`. Everything inside the spine rides the
  `holder_snapshots` record per mixin (`docs/subsystems/persistence.md § Per-mixin composition`:
  the default slice is the mixin's own `fieldMeta` persistent entries). `Avatar.fieldMeta`
  (`:386`) declares `playerId`, `mortalArc`, `lastSeen`.
- The re-arm pattern for a persisted deadline: `packages/server/src/mud/lib/calendar/Calendar.ts`
  — `calendarEntries` persistent, `calendarPingHandle` transient (*"re-armed in onCreate"*),
  `rescheduleCalendarPing()` cancels and re-arms from the stored entries; an overdue entry fires
  at the re-arm.
- `packages/server/src/mud/api/schedule.ts` — `ScheduleApi.schedule(ms, fn)` / `recurring(ms, fn)`
  / `cancel(handle)` wrap **`setTimeout`** in `runRoot`. A handle is in-memory; **nothing about a
  schedule survives a restart**, so a durable deadline is a stored epoch plus a re-arm.
- `Avatar.enter(interactive, { firstArrival })` (`Avatar.ts:922`) → `recordFirstArrival`
  (chronicle deed, `recordOnce('first-arrival')`) → `sendWelcome` (topic `session.link`,
  *"Welcome, <name>."* when `firstArrival`). Character creation's commit is
  `EmbodyController.commit` (`platform/idea/cmd/charactergen/EmbodyController.ts:~650`), which
  ends in `ConnectionApi.transfer` + `avatar.enter(interactive, { firstArrival: true })`. No event
  is emitted for a first arrival today.
- `SocialApi.online(): Avatar[]` (`api/social.ts:159`) — the connected, non-linkdead roster.

### Client state, cards, the client

- `packages/server/src/mud/lib/connection/ClientState.ts` — `ClientStateMixin` declares no keys;
  any mixin on the chain declares `static clientStateSchema` entries (`key`, `defaultValue`,
  `validator`, **`transient`** — in-memory, never persisted). `setClientState(key, value)` throws on
  an undeclared key; `pushClientStateUpdate(key, value)` pushes `client-state-update` to every
  connection. The client writes with `websocketClient.sendClientStateWrite(key, value)`
  (`packages/client/src/services/websocket.ts:579`) → `backend/inbound/clientState.ts`
  (requires an Avatar holder; validates through `setClientState`; saves unless guest). Our client's
  keys are on `SaxonbergClientMixin` (`lib/connection/SaxonbergClient.ts:219-592`: `console.*`,
  `cards.*`, `style.overlay`, `cockpit.layout`, `cockpit.mode`, `cockpit.watch`, `cockpit.tuned`,
  `cockpit.shelf`, …).
- Cards: `packages/server/src/mud/lib/connection/Cards.ts` — `CARDS: Record<CardId, CardDefinition>`
  (total by construction); `CardSource` is `mql | payload | client | prompt`; `settings`
  (`:395`) is the precedent for a **`client`-source singleton pinned card** opened by its own verb
  (`opens_card: settings`). `CardApi.open(context, cardId)` (`api/card.ts:93`) **throws** unless
  the running view declared `opens_card`. `CardId` union at `packages/types/src/index.ts:1057`;
  `CardPayload` at 1277. The client renders a `client` card body in
  `packages/client/src/components/cards/CardBodies.tsx` (`card.cardId === 'settings'` at 1124 →
  `SettingsPanel`). Cards are per-`Interactive` (`CardApi.#interactiveFor` takes the FIRST
  connection of a multiplexed player).
- `packages/client/src/components/StreamerDeck.tsx` — the dead scaffold: five `GROUPS` of chips
  (moderation, rewards, penalties, community, broadcast), hover-preview only, fake readout.
  Rendered by `layouts/ModeStage.tsx:621` for `focal: "deck"`, the `watchStreamer` stage config
  (`:247`, `{ panel: "tuned", focal: "deck" }`); `modes.ts:60` maps layout `streamer` to it.
- Frames: `MessageFrame` (`packages/types/src/index.ts:41`) carries `topic`, **`tags?: string[]`**,
  `meta.modality`. The client keeps `tags` on `ConsoleFrame` (`App.tsx:443-446`). The record layer
  stores `tags` verbatim (`docs/subsystems/record-layer.md:134,145`) — a backfilled line keeps
  them. `MessageApi.Tags` (`api/message.ts:85-92`) holds the framework-defined `audience:*` tags.
- Private frames today: tells/DMs/replies/hails emit topic **`speech.comms`** with
  `modality('verbal-esp')` (`lib/comms/Comms.ts:179,216`, `cmd/social/DmController.ts`,
  `ReplyController.ts:85`, `HailController.ts:80`). Chat posts emit **`speech.channel`** with
  `.tags(['channel:<name>'])` (`platform/idea/ChannelCatalogue.ts:377-392`); a channel's `kind` is
  `'player-created' | 'open-join-standalone'` (`lib/social/Channel.ts:33`) — the player-made
  channel is the private frequency (`docs/subsystems/chat.md:16`). **Nothing stamps a frame
  "private" by name today**; the topic is the only tell.
- The presence line: `LookController.presenceLine(target)` (`cmd/perception/LookController.ts:
  ~935-965`) composes *"Now: <status>, <posture>, <engagements>, away."* — `away` is added when
  `isHasInteractive(target) && target.isLinkdead()`. The person chip (`personOf`, `:874`) carries
  `status`. The room body (`:312-322`) appends `state` segments after the long description — the
  floor puddle (`BulkableApi.floorPuddleSummary`) is the precedent for a derived room-state line.
- Text size: every client width class is **rem** (`components/ui/tokens.ts:239-262`, client-surface
  D9: *"window size, browser zoom and a future font-size setting are one case"*), so a root
  font-size change rescales the layout coherently. No `visibilitychange` / `document.hidden` /
  `window.open` / Document Picture-in-Picture / web-manifest exists anywhere in
  `packages/client/src` or `index.html` (`grep` on 2026-11-08).
- ⚠ **Pop-out windows do not exist.** `docs/requirements/client-surface-requirements.md:112`
  reads *"Pop-out card windows; the streamer deck's future → broadcast-ready-slate"* — the
  client-surface build handed the **responsibility** here, not a feature. The requirements'
  sentence *"handed here by the client-surface build"* is the inverse. This build owns pop-out.

### Rodney (`packages/rodney`, mock-driven on this branch)

- `src/hooks/useStreamState.ts` — one WS to `${VITE_SAXONBERG_WS}/?broadcast=${VITE_BROADCAST_TOKEN}`;
  parses `stream-state` (`{mode, awayUntil}`) and `relay-chat`; `?mock` feeds canned chat when no
  feed is configured; reconnects every 2 s; `connected` goes false on drop.
- `src/hooks/useShow.ts` — the **`Show` shape the overlay already consumes**: `topic`, `agenda:
  {title, done}[]`, `current`, `world`, `playersOnline`, `crawl: string[]`, `build: {at}`, `money`,
  `community: {newPlayers, newFollowers, subsAndGifts, goal, recent: Arrival[]}`, `wikiOfDay`,
  `client: {foreground, mode, lastVerb}`. Today it is `EMPTY` unless `?mock`, and
  `?fg= ?mode= ?verb=` vary the mock client facts. Its header says the feed *"does not carry any
  of this yet — the broadcast-ready build adds it."*
- `src/hooks/useAwayTimer.ts` — counts to an absolute target; `override === null` means live.
- `src/scenes/live/LiveOverlay.tsx` — the 1520×855 content area, 400-wide `Sidebar`, 1520×225
  `LowerThird`, the `Nameplate`, mock stand-ins for the display and camera. `live` is
  `mock || (feed.connected && feed.state?.mode === 'live')`.
- `src/scenes/live/panels.tsx` — `PANELS: PanelRow[]` (`key`, `weight`, `seconds`, `when(show)`,
  `render(show)`): `join`, `world`, `about`, `gitlab`, `money`, `community`, `wiki`, `compact`,
  `what` (→ `ScreenGuide`), `fact` (→ `FactPanel`). Its header: *"The rows move into the game as
  content when the broadcast-ready build lands."* `LowerThird.tsx` runs a smooth weighted
  round-robin over the eligible rows with `?pin=<key>`.
- `src/show/profiles.ts` — `PROFILES.saxonberg` with `panels: ['what','fact','join','world','money',
  'community','compact','about','gitlab','wiki']`, chosen per page by `?show=`. `src/show/facts.ts`
  — 66 facts with `verbs[]`. `src/show/channel.ts` — the person/studio constants.
- `src/scenes/standby/StandbyOverlay.tsx` — the monastery, the two banners, the countdown off
  `feed.state?.awayUntil`, chat, aphorisms. There is **one standby page for every non-live phase**;
  it knows nothing of a reason, a start time or an outro.
- `docs/obs-setup.md` — four OBS scenes **Starting · Live · Away · Ending**; the browser sources
  have *"Page permissions: Advanced access to OBS (lets the overlay switch scenes later)"*;
  Away contains no Desktop, Camera or Mic; the Elgato OBS plugin owns the hard cuts.
- `vite.config.ts` — multi-page (`index`, `standby`, `live`), port 5200, the `virtual:repo-stats`
  plugin counting the checkout.

### pblive (`/home/bobalu/play/pblive`, separate repo)

- TypeScript 4.3 / Node, `yarn build && nodemon dist/index.js`. `src/util/aws.ts` loads **every**
  parameter from SSM (`/pblive/<NODE_ENV>/*`, fallback `/pblive/default/*`) and the secret bundle
  from Secrets Manager; `Backend.initialize` awaits both — the process cannot start without AWS.
- `src/backend/Application.ts` — `controllers: Record<string, any>` (`lighting` only);
  `onAction` dispatches `execute` by `payload.settings.function = "<controller>.<func>"`; unknown →
  `sendAlert`. `src/lib/LightingController.ts` (Hubitat Maker API over `axios`) is the controller
  shape to copy. `pblive-streamdeck/plugin.js` connects to a hard-coded `ws://localhost:2081` and
  sends `init` / `reset` / `execute` with each button's `settings`.

### Deployment and build identity

- No build identity exists on the server. `deploy/dev/update.sh` receives `DEPLOY_SHA` from CI
  (`.gitlab-ci.yml:340`), fast-forwards, swaps the client bundle, restarts. `.env` is materialized
  from SSM by `deploy/materialize-env.sh` and `scp`'d to the box **before** `update.sh` runs
  (`docs/deployment.md:316-321`), so `update.sh` can append to it.

### Testing

- Wire tier: `packages/wire/tests/<feature>[.dirty].wire.test.ts`; `Session.open(handle,
  {wizard, committees, offices, parcels})` (`packages/wire/src/harness/session.ts:218-336`),
  `envelopesOf(type)`, `eval`; a `.dirty` file declares `DIRTY_REASON`. There is no restart helper
  — a restart's staged twin is logout → login (the Avatar is destructed and re-materialized from
  `holder_snapshots`). Browser walks are `e2e/tests/<feature>-walk.spec.ts` (precedents: cordage,
  energy, ground, paint, paper, harbors).

---

## ⭐⭐ New substrate

The reuse ledger the slate lacked, built here. Each row: what it reuses or generalizes, or
*genuinely new* with what was searched.

| new piece | kind | reuses / generalizes | ledger |
|---|---|---|---|
| `BroadcastMixin` (`lib/livestream/Broadcast.ts`) | kernel mixin | **generalizes** the `StreamState` singleton to one state per player; rides `PersistableMixin`'s default slice (no `captureSlice`); the deadline re-arm is `CalendarMixin.rescheduleCalendarPing`'s shape | the singleton retires in the same wave |
| `standby-reason` · `lower-third-panel` · `stream-token` | document kinds (`DocumentKinds.ts`) | the `aroma` kind (authored metadata nothing writes, read by path when named) and `map` / `water-right` (runtime-written, `onVanish: keep`); `DocumentApi.read/list/save/delete` | genuinely new **kinds**, no new mechanism; no new Mongo collection |
| `Events.PlayerFirstArrival`, `Events.StreamShowChanged` (replaces `StreamStateChanged`'s payload) | event names | the `Events` table + payload map | one new name; one payload gains `playerId` |
| `broadcast:<playerId>` and `control:<playerId>` principals | WS principals | **generalizes** the `service:broadcast` sentinel (same `?param=` pre-session path, same `timingSafeEqual`, same no-`Interactive` push target); the control principal is the deliberate second writer the slate named | no new service module; `WebSocketService` + `Backend` + `Application` grow a branch each |
| `MessageApi.Tags.Privacy.Private` (`privacy:private`) | frame tag constant | the `audience:*` tag family (framework-defined frame metadata, stored verbatim by the record layer) | one constant, six stamp sites |
| `stream` `CardId` | card row | the `settings` row (client-source, pinned, singleton, opened by its verb) | one row |
| `stream.state` · `stream.foreground` · `session.arrivedFrom` | transient clientState keys | `cockpit.watch` / `cockpit.tuned` (transient keys pushed by the server) | three schema entries on `SaxonbergClientMixin` |
| `/auth/google/youtube` scope step-up + `GoogleProfile.youtubeRefreshToken` / `youtubeChannelId` | auth route + two fields | the existing Google link strategy; `TwitchProfile`'s `EncryptedStringMarshaller` fields; `YoutubeClient`'s token refresh | **not** a fourth provider (connection.md's co-equal rule) — a scope on the Google one |
| `YoutubeClient.liveBroadcastOfUser` · `TwitchClient.streamOf` | backend transport calls | the per-platform transport seam | two Helix/Data-API calls |
| pop-out (`components/cards/PopOut.tsx`) + `public/manifest.webmanifest` | client | **genuinely new** — searched `packages/client` for `window.open`, `documentPictureInPicture`, `manifest`, `standalone`: none | see D13 |
| Rodney `src/show/rules.ts`, `src/obs.ts` | overlay | **genuinely new** in Rodney — the slate's rules table and the OBS switch; `useStreamState` / `useShow` grow, they are not replaced | overlay-local |
| pblive `src/lib/SaxonbergController.ts` + `.env` config | pblive | `LightingController`'s controller shape; `ws` already a dependency | own repo |

**What is deliberately NOT new:** no new Api and no new logic singleton — the `stream` verb's
reads and mutations are methods on `BroadcastMixin`, the feed is `BroadcastFeed` grown, token and
YouTube work live in `StreamLogic` behind `StreamApi` (P1: *an Api with one concept in it is a
method in the wrong place*). No new hook: `onCreate` (re-arm) and `captureSlice` are existing
hooks, and the default slice means we do not even implement the latter. No new module category,
no free helper, no eslint exception.

---

## Plan-level decisions

**D1 — The stream's state is a mixin on the Avatar family root, inside the spine.**
`BroadcastMixin` composes in `Avatar.ts`'s stack between `AetherMixin` and `CalendarMixin` (inside
`PersistableMixin`, so its persistent fields ride the `holder_snapshots` record the Avatar already
writes; outside `HasInteractiveMixin`, which it reads for the on-air client). Fields: `phase`
(`offline | starting | live | standby | ending`), `reason` (a reason row's key or `null`),
`startsAt` / `awayUntil` / `endsAt` (epoch ms or `null`), `topic`, `agenda: string[]`,
`agendaIndex`, `channels: { twitch?, youtube?, kick? }` — all `persistent: true`. Transient: the
ending timer handle, `lastVerb`, the viewer-stat cache. The singleton `StreamState` is deleted
(class, row, boot entry). *Reasoning:* the requirements decided the host at product level ("on each
streamer's character, saved by the spine that already saves them"); the Avatar is the narrowest
class that exists for a role that is a **group over players**, not a class (see § Host placement
for the P2 argument). Keyed by `getIdentityPath()` wherever keyed — every player shares one
template path.

**D2 — Reasons and panels are pack DOCUMENTS, not Stuff clones.** Two kinds in `DocumentKinds`:
`standby-reason` (`contentDir: standby-reasons`, path `/platform/stream/reasons/<key>`) and
`lower-third-panel` (`contentDir: lower-third-panels`, path `/platform/stream/panels/<key>`), both
`onVanish: 'delete'`, `naturalKey: null`. Shipped reasons: `bathroom` (5m), `food` (15m), `water`
(3m), `privacy` (no timer, `privacy: true`), `technical` (no timer), `generic`. A reason row:
`{ label, copy, defaultDurationMs | null, privacy, scene? }`. A panel row: `{ key, weight, seconds,
when, title?, body? }` where `when ∈ always | world | money | community | wiki | client` is a closed
vocabulary the overlay evaluates. *Reasoning:* metadata nothing writes or queries is a document
read by path (the `aroma` precedent; memory: *"METADATA nothing writes or queries = a DOCUMENT"*);
`stream away bathroom` reads `/platform/stream/reasons/bathroom` by path on use (P7 — no roster,
no boot entry, no scan); a Stuff class would add a `lib/` file, a `lint:instanceable` surface and a
`StuffApi.singleton` round trip for a six-field record. The requirements' word *clone* was the
slate's shorthand for "a row, not a code change", which a pack document satisfies (edit the file in
the pack, or the `cms` card at runtime); the plan records this as an engineering choice, not a
scope change.

**D3 — The ending timer and every other deadline are a stored epoch plus a re-arm; expiry
never changes phase except `ending → offline`.** `stream end` sets `phase = ending`, `endsAt =
now + stream.outroMs` (new AppSetting, default 60 000) and arms `ScheduleApi.schedule`; the fire
calls `goOffline()`. `onCreate` (after materialize) re-arms from `endsAt`; an overdue `endsAt`
goes offline at once. `awayUntil` and `startsAt` expiring do **nothing** (the shipped behavior: the
overlay shows 0:00; only `stream back` / `stream live` return the desktop) — fail closed, made
structural. ⭐ **Real wall time is correct here and deliberate.** These are epoch-ms (`Date.now()`)
and `ScheduleApi` milliseconds, as the shipped `awayUntil` already is: the stream is **interface
tier**, outside the fiction (lens 3), and its minutes are the audience's. The never-real-time rule
(`docs/`, memory) governs the fiction's clock — nothing here reads or writes `WorldClockApi`.

**D4 — One token names one player, stored as a hash in a document; the env token maps to the
founder during the changeover.** `stream token` mints 32 random bytes (base64url), shows it once,
and saves `/platform/stream/tokens/<sha256hex>` = `{ playerId, scope: 'overlay', issuedAt }`
(kind `stream-token`, `onVanish: keep`); a repeat `stream token` deletes the previous document for
that player+scope (the mixin remembers the current hash in a persistent `tokenHashes` field) and
writes the new one — rotation. `stream token --control` does the same with `scope: 'control'`. On
upgrade, `?broadcast=<t>` → `StreamApi.resolveToken(t)` (hash → `DocumentApi.read` by path — a
path read, never a search) → `{playerId, scope}`; scope must be `overlay`. `?control=<t>` requires
`scope: 'control'`. `BROADCAST_TOKEN`, when set, still matches by `timingSafeEqual` and resolves to
the **first id in `STREAMER_PLAYER_IDS`** with a deprecation warning at boot; when
`STREAMER_PLAYER_IDS` is empty the env token is refused with an error log (fail loud). No new
collection (the `documents` store). *Reasoning:* the WS upgrade runs before any Avatar is loaded,
so the token→player fact cannot live only on the Avatar; a hash-keyed path turns the lookup into a
read.

**D5 — The feed is routed per streamer and carries an allowlisted snapshot.** `BroadcastFeed`
keeps `connections: Map<socketId, playerId>`. `Events.StreamShowChanged` carries `{ playerId,
show }`; the feed pushes to that player's sockets only. The `stream-state` envelope's `state` is
the allowlist, built by `BroadcastMixin.show()`:

```ts
interface StreamShow {
  phase: 'offline'|'starting'|'live'|'standby'|'ending';
  reason: { key, label, copy, privacy, scene? } | null;
  startsAt: number|null; awayUntil: number|null; endsAt: number|null;
  topic: string|null; agenda: { title, done }[]; current: number;   // Rodney's Show shape
  client: { foreground, mode, layout, lastVerb } | null;              // the streamer's own client
  playersOnline: number;
  build: { sha, at } | null;
  panels: { key, weight, seconds, when, title?, body? }[];            // the rows
}
```

Nothing of another player, no frame body, no card content, no argument of any command. Two more
envelopes: `stream-event` (`{ kind: 'new-player', name, fromStream }` — to every streamer's feed)
and the shipped `relay-chat`, now filtered **per streamer** by that streamer's `channels` (the
founder's default from the `OVERLAY_*` env). `reaction-delta` keeps going to every feed (it is
already world-public).

**D6 — Client facts reach the server by the mechanism that exists.** The client writes
`stream.foreground` (transient key, validator: `saxonberg | other-tab | other-app`) through
`client-state-write` on `visibilitychange` / `focus` / `blur`; `cockpit.mode` and `cockpit.layout`
are already there. **The verb is recorded server-side**: at the end of a dispatch in
`CommandGiver.run` (`lib/command/CommandGiver.ts`), `if (MixinApi.isBroadcastHost(giver) &&
giver.isOnAir()) giver.noteVerb(ctx.verb)` — the parsed verb only. The mixin's `show()` reads those
keys off `this.getClientState(...)`. Any change to a show-relevant key (`stream.foreground`,
`cockpit.mode`, `cockpit.layout`, `lastVerb`) re-emits `StreamShowChanged` only while
`phase !== 'offline'`.

**D7 — Player count, build stamp, welcomes.** `playersOnline = SocialApi.online().length`,
re-pushed to every connected feed on `PlayerLoggedIn` / `PlayerLoggedOut`. The build stamp is env
`SAXONBERG_BUILD_SHA` + `SAXONBERG_BUILD_AT` (ISO), appended to `.env` by `deploy/dev/update.sh`
after the fast-forward (`git show -s --format=%cI "$TARGET"`); `BroadcastFeed` reads them once;
unset → `build: null` and Rodney hides the age line (no fallback that could lie). Welcomes:
`Avatar.enter` emits `Events.PlayerFirstArrival { playerId, name, arrivedFrom }` when
`opts.firstArrival`; `arrivedFrom` is the connection's `?from=` query param (closed vocabulary:
`stream`), read in `WebSocketService.handleUpgrade`, stamped on the `Interactive` as a runtime
field (`arrivedFrom`), and the client preserves `?from=stream` from the landing URL into its WS
URL. This is the slate's stream tag, with no deep-link build needed.

**D8 — Redaction keys on one server stamp: the `privacy:private` tag.** `MessageApi.Tags.Privacy.
Private = 'privacy:private'`, stamped at the six private emitters: `CommsMixin.tell` (self + target
frames), `DmController`, `ReplyController`, `HailController` (all `speech.comms`) and
`ChannelCatalogue.post` **for `player-created` channels** (the private frequency; `open-join`
channels are common bands and stay in the clear). A **terminal card** whose filter is a
`channel:<name>` tag on a `player-created` channel gets `private: true` on its `card-opened` /
`card-touched` envelope (the registry resolves the channel kind at open — the server's stamp for
the "private card" husk). The client redacts **only** on these two stamps, and only while its own
`stream.state.phase ∈ {starting, live, ending}`. ⭐ Because the record layer keeps `tags`, a
backfilled tell redacts too. *This answers the slate's open question 4:* private channels are the
`player-created` kind, and the server now says so on the frame.

**D9 — The on-air marker has two homes, both already status homes.** `LookController.presenceLine`
adds `broadcasting` when `MixinApi.isBroadcastHost(target) && target.isOnAir()` (beside `away`); the
same read feeds the person chip's `status`. The room gets a `state` segment after the long
description — *"A broadcast reaches this place."* — when any occupant is on air (the floor-puddle
line's shape and position). Per `perception-output-slate` § the rule, a thing's **state** lives in
its status or a line reading its own state — not a second voice bolted onto the description. A
statement, not a gate: nothing checks it before letting anyone in.

**D10 — The `stream` grammar, one verb, one controller, the mixin deciding.** Subcommands:
`start [in <dur>]` · `live` · `away <reason> [<dur>]` / `away <dur>` (a bare duration is the
`generic` reason — the shipped grammar) · `back` · `end` · `off` · `segment <title>` · `agenda
<item; item; …>` / `agenda clear` · `next` · `token [--control]` · `channel <twitch|youtube|kick>
<handle>` · bare `stream` (prints the state and opens the controls card; `opens_card: stream`).
Every transition is a mixin method (`startStream(at)`, `goLive()`, `goStandby(reason, until)`,
`endStream(at)`, `goOffline()`, `setTopic`, `setAgenda`, `advanceAgenda`) that **refuses by name**
on an illegal move (`stream back` while `offline` → `not-streaming`; `stream live` during `ending`
→ `ending`); the controller parses, resolves the reason row, and renders the refusal
(controllers-are-io; P5). The duration parser moves from the controller's private static onto the
view's arg parsing (`lib/command/parsers`) only if a parser for shell durations already exists
there — the build checks; otherwise it stays a controller-local parse of a string arg (it is IO).

**D11 — pblive's control token is a second principal that can run exactly one verb.** The
`?control=<token>` upgrade yields principal `control:<playerId>` with no `Interactive`, registered
in `BroadcastFeed`'s sibling set of control sockets. Its only accepted inbound message is
`{ type: 'command', payload: { command } }`; `handleControlCommand` (a branch in the backend's
inbound layer keyed on the principal, not a new handler file) tokenizes with `CommandLineApi`,
**refuses unless the first word is literally `stream`** (no alias expansion, no script builtins),
refuses `stream token` (a control token must not mint tokens), then dispatches through the
streamer's resident Avatar (`PlayerApi` lookup by playerId; `executeCommand`) — `requiresStreamer`
still gates. The streamer's Avatar **must be online**; otherwise `{ type: 'control-result',
ok: false, reason: 'streamer-offline' }`. The dispatch-response's status is echoed back as
`control-result` so the Stream Deck shows ✓ or ⚠. The registry slate's invariant (*the overlay
token READS, the player's session WRITES*) is kept for `overlay` tokens; the `control` scope is the
deliberate exception the slate named, bounded to one verb.

**D12 — YouTube under the streamer's own login is a scope step-up on the Google link, not a
provider.** `GET /auth/google/youtube` (requires auth) runs `passport-google-oauth20` with
`scope: ['https://www.googleapis.com/auth/youtube.readonly']`, `accessType: 'offline'`,
`prompt: 'consent'`, `session: false`, on the **current user's** linked `GoogleProfile`; the callback
stores `youtubeRefreshToken` (encrypted, `EncryptedStringMarshaller`) and `youtubeChannelId`
(`channels.list?mine=true`, 1 unit) on that `GoogleProfile` (same collection). `YoutubeClient`
gains a per-user token path (`refreshFor(profile)`) and `liveBroadcastOfUser(profile)` →
`liveBroadcasts.list?part=snippet&broadcastStatus=active&mine=true` (1 unit) → `liveChatId`.
`StreamLogic.openOverlayYoutube(playerId)` prefers the linked route and falls back to the env
channel + `search.list` only for the founder with no link yet. The giving build shares this link
(*whichever lands first builds it* — this build does). The `stream` card shows *"YouTube: link your
channel"* with the route when no link exists.

**D13 — Pop-out is Document Picture-in-Picture; the PWA lean is verified and found to be a
different thing.** A card pops out by moving its React subtree into a
`documentPictureInPicture.requestWindow({ width, height })` window through a portal (same JS
realm, same socket, same store — the card stays the server's card). Chrome gives one PiP window per
tab, chromeless and always-on-top, which is what the unshared-monitor use needs. **The PWA
standalone window cannot host a popped card:** an installed app window is a separate document with
its own WebSocket, so it is a second `Interactive` and the card (per-`Interactive`,
`CardApi.#interactiveFor`) is not there. The build still ships `public/manifest.webmanifest`
(`display: standalone`) so the **main client** can run chromeless under the display capture — a
real gain for the show, and the honest reading of the lean. ⚠ Flagged in § Risks for the owner:
the requirements' window LEAN (installed PWA) is inverted by the facts; PiP is primary.

**D14 — Rodney is wired, not rebuilt.** `useStreamState` parses the new `stream-state` (`StreamShow`)
and `stream-event`; `useShow(profile, feed)` returns the feed's show when connected and the mock
under `?mock` as today (every panel's `when` keeps hiding on empty). `src/show/rules.ts` is the
table: `phase → scene` (`starting→Starting`, `live→Live`, `standby→Away`, `ending→Ending`,
`offline→Away`), `reason.scene` overriding, `live ∧ foreground ≠ saxonberg → layer game-summary`.
`src/obs.ts` applies a scene through `window.obsstudio.setCurrentScene` when the browser source has
*Advanced access*, else through obs-websocket (`obs-websocket-js`, `VITE_OBS_WS_URL` /
`VITE_OBS_WS_PASSWORD`), else does nothing and says so in the page's corner. **The overlay holds
its last scene when the feed drops** (`connected: false` changes nothing); it never infers `live`.
`panels.tsx` keeps its renderers keyed by `key`; the **rows** (weight, seconds, when, copy) come
from the feed's `panels`, and a row with no bespoke renderer renders as title + body — so a new
copy-only panel is a pack document and nothing else. The standby page reads `phase` and `reason`:
Starting shows the countdown to `startsAt` and the agenda; Away shows the reason's copy and, for a
privacy reason, **no countdown**; Ending shows the outro.

**D15 — Streamer channels for a second streamer are a field set by the streamer.** `stream channel
twitch <login>` etc. writes `channels` on the caller's own mixin (`requiresStreamer`). The founder's
`OVERLAY_*` env values seed the first `STREAMER_PLAYER_IDS` player's channels when the field is
empty (read at first `show()`), so nothing changes for the founder on day one.

**D16 — Viewer counts, uptime and chat rate go to the streamer's client only, never the feed.**
While on air, `StreamLogic` polls Twitch Helix `GET /streams?user_login=` (viewer_count, started_at)
and YouTube `videos.list?part=liveStreamingDetails` (concurrentViewers) every
`stream.statsPollMs` (60 000) and pushes `stream.state` (the transient key) with
`{ ...show, viewers: { twitch, youtube }, startedAt, chatRate, online: RosterRow[] }`. Chat rate is
lines per minute over the last five minutes from the relay events for that streamer's channels.


**D17 — Settled at /build (2026-11-09).** (a) **Pop-out is Document Picture-in-Picture (D13 stands).**
The requirements themselves decided it: *"the build verifies [the PWA window], with Document
Picture-in-Picture the fallback"* — verification found the standalone window is a second
`Interactive` that cannot host the session's card, so the fallback is the mechanism. Risk #2 is
closed; the build does not stop for it. (b) **The mixin is `BroadcastMixin` (`lib/livestream/
Broadcast.ts`, `Mixins.Broadcast`, `MixinApi.isBroadcastHost`), not `StreamerMixin`.** Every
Avatar composes it, so a `MixinApi.isStreamer` true for every player would sit beside
`AccessApi.isStreamer` (membership of the `streamers` group) and mean something else under the
same word (P8, names). "Streamer" means the group; the mixin is the broadcast state a body
carries.

---

## ⭐⭐ Host placement

| new field / mixin / class | host | what composing it claims about everything else on that host |
|---|---|---|
| `BroadcastMixin` — `phase`, `reason`, `startsAt`, `awayUntil`, `endsAt`, `topic`, `agenda`, `agendaIndex`, `channels`, `tokenHashes` | `Avatar` (the family root, `lib/character/Avatar.ts`), inside `PersistableMixin` | *every played body may run a stream of its own.* True by construction: the streamer axis is a managed **group over players** (`streamers`), so any Avatar can be in it and there is no narrower class. ⭐ **P2, the quiet form:** most Avatars will read `phase: 'offline'` forever. That is not a pool with no current — a pool is a different KIND of water from a river, while a player who is not streaming is the same kind of thing as one who is, in the state the verb hasn't moved. The test is *could this host ever honestly answer yes*; every Avatar can, by one `group add`. The default costs nine `null`/`offline` fields in a snapshot that already carries a calendar, contacts, a wardrobe and a map most players never fill. No guard re-narrows the set (`requiresStreamer` gates the VERB, as `requiresWizard` gates `eval` on the same `AuthorMixin` host — the shipped split in livestream.md). **Not** on `Character` (an NPC never streams; a `Cast` with a `phase` field would be the paintable peak) and not on `HasInteractive` (a `Login` has no character to carry it). |
| `Interactive.arrivedFrom` (runtime, not persisted) | `Interactive` (`platform/idea/Interactive.ts`) | *a connection may know which door it came in by.* A connection concept; nothing in-world reads it. |
| `GoogleProfile.youtubeRefreshToken` · `youtubeChannelId` | `GoogleProfile` Document | *a Google identity may carry a YouTube authorization.* Every `GoogleProfile` is a Google account and every Google account has (or can have) a YouTube channel; empty when not stepped up. |
| `stream.state` · `stream.foreground` · `session.arrivedFrom` (transient clientState) | `SaxonbergClientMixin` | *our client speaks these words* — one client's vocabulary, where every `cockpit.*` key already lives. |
| `stream` CardId row | `Cards.ts` catalogue | a card some command opens (`stream`) — the catalogue's own rule. |
| `privacy:private` tag | frame metadata | framework-defined, like `audience:*`; stamped by the six private emitters only. |
| `CardState.private?` (server) / `card-opened.private?` (wire) | `CardRegistry` + envelope | *a card may be about something private* — set only for a terminal filtered to a player-created channel. |
| `standby-reason` · `lower-third-panel` · `stream-token` | `DocumentKinds` | kinds of the platform's (a pack cannot declare one); the first two authored by the platform pack, the third runtime-written like `map`. |

No new class. No mixin on a base class. The two things the plan **refused** to host:
`lastVerb` on `CommandGiver` (every NPC brain's dispatch would carry a field one host reads — it is
transient on `BroadcastMixin`, written by one seam), and a `Streamer` Document per player (the
requirements chose the spine, and the presence line needs the person in the room to answer
`isOnAir()` without a document read).

---

## Convention conformance

Checked at plan time against the current tree, not recalled:

- **`props:` / `cast:`** — no rows place content; n/a. **Locations, not rooms** — no new place.
- **Namespace** — kernel code under `/platform/…`; the pack documents at `/platform/stream/…`,
  the shape command-view documents already use (`/platform/cmd/…`). No pack `src/` touched.
- **Module scope declares; lifecycles initialize** — the re-arm runs in `onCreate`; the feed
  subscribes lazily on first connection (as today); the build stamp is read at first use.
- **Import boundary** — `WebSocketService` (services layer) resolves tokens through
  `this.backend` (as it hands off today), and `Backend`/`BroadcastFeed` call `StreamApi`; no mud
  file imports `fs`/`crypto` — the hash lives in `StreamLogic` via `SecurityApi` (if
  `SecurityApi` lacks a sha256, it gains one static; `api/**` may import `crypto`).
- **Verbs on objects** — every transition is `avatar.<method>()`; no `StreamApi.away(host, …)`.
- **Api/Logic split kept** — `StreamApi` ↔ `StreamLogic` already exist; token resolve, YouTube
  link reads and stat polls are methods there, gated `FromModule('/api/stream#StreamApi')`.
- **Inter-Stuff methods only** — `isOnAir()`, `show()`, `noteVerb()`, `getChannels()`; LookController
  narrows with `MixinApi.isBroadcastHost`.
- **Persistence** — `fieldMeta` on the mixin; a `string[]` agenda and a `Record` of channels are
  plain JSON (⚠ never a bare `Map` field).
- **Kernel mixin registry** — `Mixins.Broadcast: 'BroadcastMixin'` in `lib/mixin.ts`;
  `MixinApi.isBroadcastHost` predicate (`lint:mixin-names`). ⚠ `AccessApi.isStreamer(subject)` (axis
  membership) and `MixinApi.isBroadcastHost(obj)` (composition) answer different questions; D17 names
  the mixin apart (`isBroadcastHost`) so the word *streamer* means only the group.
- **One view, one word** — `stream` only; subcommands are words of the noun (`lint:one-word`,
  `lint:subcommand-words`: none of `start live away back end off segment agenda next token channel`
  is a flat verb with a different controller — `start` and `end` are checked by the gate).
- **Topics** — no new topic: the verb answers on `shell.result`; the first-arrival event is not a
  frame. `lint:topics` unaffected.
- **Document kinds** — editing `DocumentKinds.ts` is a platform act (its own header); three kinds.

**Review questions P3–P8:**

- **P3 refuse/skip/throw** — an illegal phase move refuses by name; an unknown reason word that is
  not a duration refuses naming both readings; a bad/revoked token is a 401 with a warn (never a
  fallback to a shared feed); an env token with no `STREAMER_PLAYER_IDS` is refused loudly;
  a control command whose first word is not `stream` is refused and echoed as `control-result`;
  an unset build stamp is `null` (the overlay hides the line) — never a fabricated date; a
  `requestWindow` that throws (no PiP support) falls back to the card in place with a notice.
- **P4 no duck typing** — every narrowing is `MixinApi.isBroadcastHost` / `isHasInteractive` /
  `isStatus`; Rodney types the envelopes from `@saxonberg/types`-mirrored interfaces (it already
  inlines them) and switches on `type`.
- **P5 the mixin decides** — phase legality, timer arming, the on-air predicate, the show
  projection and the allowlist are `BroadcastMixin`'s; `StreamController` parses and renders;
  `BroadcastFeed` routes what the event carries and computes nothing about a stream.
- **P6 persistence per content** — the mixin's fields persist because they are the streamer's
  own state; the three transient keys are declared `transient`; token documents are
  `onVanish: keep` (a credential nothing authored must survive a pack reconcile); reason and panel
  rows are `delete` (authored content, the pack is authoritative). No class persists anything it
  does not host.
- **P7 load on use** — a reason is read by path when `stream away <reason>` names it; panels are
  listed by prefix when a feed socket connects (once per connection, not at boot); tokens are read
  by their hash path at upgrade; the singleton's boot entry is **removed**. Zero new boot entries.
- **P8 names** — `BroadcastMixin` (the person who streams; not `StreamingMixin`, which names an
  activity, and not `BroadcasterMixin`, which collides with the in-world `broadcast` ESP verb
  livestream.md already warns about); `stream` the verb keeps the common word; the card is `stream`
  (what you type); `StreamShow` for the wire shape, matching Rodney's `Show`.

**Lint gates this build must pass** (`pnpm -C packages/server lint:family`; the ones it touches):
`lint:boot-entries` (ceiling falls to one fewer — update the ceiling), `lint:instanceable`
(the deleted row), `lint:mixin-names`, `lint:field-meta`, `lint:module-scope`, `lint:imports`,
`lint:command-views` (`opens_card: stream` ∈ `CARD_IDS`; `category: stream`), `lint:one-word`,
`lint:subcommand-words`, `lint:closed-vocabularies` (the phase vocabulary and `when` words are
declared with their validation arrays), `lint:duck-typing`, `lint:controller-decisions` (durations
live on the mixin / AppSettings, not the controller), `lint:reachability` (`stream` afforded by
`BroadcastMixin`'s `self` bucket — moved off `AuthorMixin`), `lint:test-bootstrap`, `lint:envelope`
(new envelope members in both unions), `lint:schema` (unchanged collections; `DocumentKinds` is not
a collection), `lint:wizard-axis` (no `isWizard`). Plus `pnpm lint`, `pnpm wire` for the drive
file, and Rodney's own `tsc`.

---

## Waves

Each wave is independently landable and ends at a commit; staged kernel → client → Rodney →
pblive. Commit titles are suggestions in the repo's voice.

### W0 — The stream belongs to the streamer (kernel)

**Goal:** `BroadcastMixin` on the Avatar, five phases, reasons as documents, the full `stream`
grammar, the ending timer, persistence across a restart; the singleton retired. Implements
**D1, D2, D3, D10, D15**.

**Files:**
- new `packages/server/src/mud/lib/livestream/Broadcast.ts` (`BroadcastMixin`; `fieldMeta`;
  `commandContributions.self: ['platform/cmd/stream/stream.yaml']`; `onCreate` re-arm; methods:
  `getPhase`, `isOnAir` (= phase ∈ starting/live/ending), `startStream(at|null)`, `goLive()`,
  `goStandby(reason: StandbyReason, until|null)`, `endStream(at)`, `goOffline()`, `setTopic`,
  `setAgenda(items)`, `clearAgenda`, `advanceAgenda`, `setChannel(service, handle)`,
  `getChannels`, `noteVerb(verb)`, `show(): StreamShow`; every mutator emits
  `Events.StreamShowChanged { playerId, show }`); `__tests__/Broadcast.test.ts`.
- new `packages/server/src/mud/lib/livestream/StandbyReason.ts` — the named value object read
  off a `standby-reason` document (`fromDocument(doc)`, throws on a malformed row; `isPrivacy`,
  `defaultDurationMs`).
- `packages/server/src/mud/lib/mixin.ts` (+`Broadcast`), `api/mixin.ts` (+`isBroadcastHost`).
- `packages/server/src/mud/lib/character/Avatar.ts` — compose `BroadcastMixin` between `AetherMixin`
  and `CalendarMixin`; remove the `AuthorMixin` affordance of `stream.yaml` (grep `stream.yaml`
  in `lib/author/Author.ts`).
- `packages/server/src/mud/lib/document/DocumentKinds.ts` (+`standby-reason`, `lower-third-panel`,
  `stream-token`); `packages/content/platform/content/standby-reasons/{bathroom,food,water,privacy,
  technical,generic}.yaml`; `packages/content/platform/content/lower-third-panels/*.yaml` (the ten
  keys Rodney's `PROFILES.saxonberg.panels` lists, with Rodney's current weights and seconds).
- `packages/server/src/mud/lib/events.ts` — `StreamShowChanged: 'stream.showChanged'` replacing
  `StreamStateChanged`; payload `{ playerId: string; show: StreamShow }`.
- `packages/types/src/index.ts` — `StreamShow`, `StreamPhase`, `StreamStateEnvelope.state:
  StreamShow`; keep the envelope name.
- `packages/server/src/mud/platform/idea/cmd/stream/StreamController.ts` — the grammar of D10;
  `packages/content/platform/content/platform/cmd/stream/stream.yaml` — subcommands, args,
  `opens_card: stream` (the card row lands in W4; until then the controller does not call
  `CardApi.open` — the `opens_card` key is only validated against `CARD_IDS`, so add the row's
  `CardId` in W0 with `source: client` and let W4 render it).
- `packages/content/platform/content/settings/stream.yaml` — `stream.outroMs` (60000),
  `stream.statsPollMs` (60000); `AppSettings.ts` keys.
- delete `platform/idea/StreamState.ts`, `content/platform/idea/StreamState.yaml`, the
  `pack.yaml:72` boot entry; lower the `lint:boot-entries` ceiling; `BroadcastFeed` compiles
  against the new event in this wave with a **temporary** "push to all" so the wave lands green
  (W1 makes it per-streamer).
- `docs/subsystems/livestream.md` — the pieces table.

**Acceptance:** unit tests — every legal and illegal transition; `stream away 15m` = generic;
`stream away privacy` has `awayUntil: null`; `endStream` then `onCreate` after a simulated
materialize with `endsAt` in the past → `offline`; `onCreate` with `endsAt` in the future re-arms
(fake timers) and fires `goOffline`; `awayUntil` expiry changes nothing; capture → materialize
round-trips every field (the avatar-family wire test's pattern, in a unit test over
`PersistableApi`). `pnpm -C packages/server lint:family` green. **Commit:** `feat(livestream): the
stream belongs to the streamer — BroadcastMixin, five phases, reasons as rows; the singleton retires`.

### W1 — One token per streamer, one feed per token (kernel + backend)

**Goal:** per-streamer tokens and routing, the allowlisted snapshot, client facts, player count,
build stamp, welcomes, per-streamer chat, the pblive control principal. Implements **D4–D7, D11,
D15**.

**Files:**
- `StreamLogic.ts` / `api/stream.ts` — `issueToken(avatar, scope)`, `revokeToken`, `resolveToken(raw):
  { playerId, scope } | null` (sha256 → `DocumentApi.read('/platform/stream/tokens/<hex>')`);
  `setOverlayReading(playerId, on)` per streamer with sentinel `overlay:<playerId>`;
  `channelsFor(playerId)` (field, else the founder's env seed); the YouTube poll per streamer.
- `services/websocket/WebSocketService.ts` — `?broadcast=` → `backend.resolveStreamToken` (async;
  the env token path stays sync and first); `?control=`; `?from=` read and threaded;
  `handleWebSocketConnect(ws, principal, sessionId, kind: 'player'|'broadcast'|'control',
  arrivedFrom?)`.
- `backend/Backend.ts`, `backend/Application.ts` — the two principal branches;
  `Interactive.setArrivedFrom`.
- `backend/BroadcastFeed.ts` — `connections: Map<socketId, playerId>`; `controls: Map<socketId,
  playerId>`; per-player push on `StreamShowChanged`; snapshot on connect from the resident Avatar
  (`PlayerApi` by playerId; a streamer not resident → `{ phase: 'offline', … }` **is not sent** —
  the socket waits; fail closed means no synthesized live); `PlayerLoggedIn/Out` → re-push
  `playersOnline` to all; `PlayerFirstArrival` → `stream-event` to all; `RelayMessage` → the
  streamers whose `channels` match; `buildStamp()` from env once.
- `backend/inbound/command.ts` — the control branch (principal `control:*`): first-word gate,
  `stream token` refusal, resident-Avatar dispatch, `control-result` echo. `packages/types` —
  `StreamEventEnvelope`, `ControlResultEnvelope`.
- `lib/command/CommandGiver.ts` — the one-line `noteVerb` seam at the end of `run`.
- `lib/connection/SaxonbergClient.ts` — `stream.foreground` (transient, validated), `stream.state`
  (transient, server-written), `session.arrivedFrom` (transient).
- `lib/character/Avatar.ts` — `Events.PlayerFirstArrival` emitted in `enter` when `firstArrival`;
  `lib/events.ts` + payload.
- `deploy/dev/update.sh` — append `SAXONBERG_BUILD_SHA` / `SAXONBERG_BUILD_AT` to `.env`;
  `docs/deployment.md` one line.
- Tests: `BroadcastFeed.test.ts` (two players, two sockets, no cross-talk; snapshot withheld for a
  non-resident streamer; relay filter per streamer), `WebSocketService` token tests (bad, revoked,
  wrong scope, env fallback with/without `STREAMER_PLAYER_IDS`), the control-branch tests (`look`
  refused; `stream token` refused; `stream away food` dispatched as the player).

**Acceptance:** two streamers' feeds never move each other (unit); `BROADCAST_TOKEN` still works
for the founder; a `stream-event` reaches every feed on a first arrival with `fromStream` true when
the socket came in with `?from=stream`. **Commit:** `feat(livestream): one token per streamer —
per-player feeds, the allowlist, the control principal, the build stamp`.

### W2 — Nobody is broadcast without being told (kernel)

**Goal:** the privacy stamp and the on-air marker. Implements **D8, D9**.

**Files:** `api/message.ts` (`Tags.Privacy`); `lib/comms/Comms.ts`, `cmd/social/DmController.ts`,
`ReplyController.ts`, `HailController.ts`, `platform/idea/ChannelCatalogue.ts` (stamp;
player-created only); `platform/idea/CardRegistry.ts` + `Cards.ts`/types (`private?` on a terminal
card whose filter names a player-created channel); `cmd/perception/LookController.ts`
(`presenceLine` + the room `state` segment, source label `Broadcast`); tests for each stamp site
and for the two look lines (a second session sees `broadcasting` on the streamer and the room
line; both clear on `stream off`); `docs/subsystems/comms.md`, `chat.md`, `card-surface.md`,
`presentation.md` one paragraph each.

**Acceptance:** every `speech.comms` frame and every player-created channel post carries
`privacy:private`; open-join posts do not; the look lines appear and clear. **Commit:**
`feat(livestream): the privacy stamp and the on-air marker`.

### W3 — YouTube under the streamer's own login; the streamer's numbers (backend)

**Goal:** the scope step-up, own-broadcast detection, viewer counts to the streamer's client.
Implements **D12, D16**.

**Files:** `services/auth/AuthRoutes.ts` (`/auth/google/youtube[/callback]`), `PassportConfig.ts`
(a `google-youtube` strategy), `backend/Backend.ts` (`handleYoutubeStepUp`),
`lib/identity/GoogleProfile.ts` (+2 encrypted/plain fields), `backend/YoutubeClient.ts`
(`refreshFor`, `liveBroadcastOfUser`, `concurrentViewersOf`), `backend/TwitchClient.ts`
(`streamOf(login)` — Helix `/streams`), `StreamLogic.ts` (prefer the link; stats poll while on air
→ `pushClientStateUpdate('stream.state', …)`), `packages/content/platform/content/settings/
stream.yaml` (`stream.statsPollMs`), client `SettingsPanel` gets the link button in W4; tests with
the injected transports (one unit per call; the `search.list` path exercised only when no link).

**Acceptance:** with a linked profile the founder's live chat binds with zero `search.list` calls
(assert on the fake transport); `stream.state` carries viewer counts on the poll. **Commit:**
`feat(streaming): YouTube live detection under the streamer's own login; the streamer's numbers`.

### W4 — The client on air (client)

**Goal:** the controls card, the dead deck deleted, redaction rendering, the on-air type size, the
relay panel hidden, the foreground report, `?from=`. Implements **D6, D8 (client half), D13's
groundwork**.

**Files:**
- `packages/client/src/components/cards/StreamControls.tsx` (the `stream` card body: phase, reason
  picker from `stream.state.reasons` — the rows ride `stream.state`, so the picker is content-fed —
  timer, *Back*, topic + agenda with `next`, the streamer-only block: viewers, uptime, chat rate,
  who is online by name, the rotation's now/next with skip and pin (`stream rotation skip|pin
  <key>` → two more subcommands in W0's grammar; pin/skip ride `stream.state` to the feed as
  `rotation: { pinned?, skip? }` — add to the allowlist); every control previews and sends its
  `stream …` command through the ordinary bus.
- `CardBodies.tsx` — `card.cardId === 'stream'`; `useCardFeed.ts` `CARD_LABEL.stream`.
- delete `components/StreamerDeck.tsx`; `layouts/ModeStage.tsx` `watchStreamer.focal` → `null`
  (the stage shows the controls card where the arrangement puts it; the `streamer` layout's
  arrangement opens `stream` — `cockpit.arrangements` default for that layout).
- `App.tsx` / `MmlRenderer.tsx` / the terminal row — a frame with `tags ∋ 'privacy:private'`
  renders *[private message]* while `clientState['stream.state']?.phase` is on air; a card with
  `private: true` renders as a husk (title only) under the same condition.
- `lib/style/` — an `on-air` root class setting `html { font-size: 140% }` (rem layout
  follows); `TunedRail` and `speech.relay` frames hidden under the same condition.
- `services/websocket.ts` — `?from=` carried from `location.search` to the WS URL;
  `visibilitychange`/`focus`/`blur` → `sendClientStateWrite('stream.foreground', …)` (debounced,
  only while `phase !== 'offline'`).
- `components/settings/SettingsPanel.tsx` — *Link YouTube* (`/auth/google/youtube`).
- Tests: redaction on/off by phase (store tests), the foreground mapping, the card body's
  controls' previews.

**Acceptance:** `pnpm -C packages/client test:near` green; the controls card opens on `stream`
and every chip sends a real command. **Commit:** `feat(client): the stream controls card; redaction
and the on-air size; the dead deck goes`.

### W5 — Pop-out (client)

**Goal:** any card in its own chromeless window. Implements **D13**.

**Files:** `components/cards/PopOut.tsx` (the portal into `documentPictureInPicture.requestWindow`,
copying the stylesheets, returning the card on close), a `pop out` control on `Card.tsx`'s action
row (client-side only — the server's card is untouched; the window is a rendering of the same
`CardState`), `public/manifest.webmanifest` + `<link rel="manifest">` + icons, a one-paragraph
verification note in `docs/subsystems/client-shell.md` recording what the PWA window can and cannot
do (D13). Playwright: `e2e/tests/broadcast-ready-walk.spec.ts` step for the pop-out (Chromium
supports `documentPictureInPicture` behind a flag in headless — the walk asserts the fallback
notice when unsupported and the real window when supported).

**Acceptance:** the controls card pops out, keeps updating from the same socket, and returns in
place on close. **Commit:** `feat(client): any card pops out — Document Picture-in-Picture, and
the client installs`.

### W6 — Rodney on the real feed (overlay)

**Goal:** wire, not rebuild. Implements **D14**.

**Files:** `src/hooks/useStreamState.ts` (envelopes; `StreamShow`; `stream-event`; `connected`
semantics unchanged); `src/hooks/useShow.ts` (`useShow(profile, feed)`; mock preserved under
`?mock`; `community.recent` and `crawl` grow from `stream-event`s; `build` from the feed);
`src/show/rules.ts`; `src/obs.ts`; `src/scenes/standby/StandbyOverlay.tsx` (Starting / Away /
Ending by `phase`; the reason's copy; no countdown on a privacy reason; the agenda on Starting);
`src/scenes/live/LiveOverlay.tsx` (`live` from `phase === 'live'`; the rules' layers);
`src/scenes/live/panels.tsx` (rows from the feed; the generic text renderer; `rotation.pinned`
and `skip` honored); `src/scenes/live/LowerThird.tsx` (the crawl gets *"Welcome, <name>!"* and
*"straight from the stream"*); `README.md` + `docs/obs-setup.md` (the scene switch, the token is
now `stream token`'s, `obs-websocket` fallback env). `package.json` + `obs-websocket-js`.

**Acceptance:** with `?mock` and no server the preview still cycles (drive 13); against the stack
the four scenes follow the phases; a feed drop holds the scene. **Commit:** `feat(rodney): the
overlay on the real feed — scenes by phase, the rules table, OBS switching, rows from the game`.

### W7 — pblive's game buttons (its own repo, its own MR)

**Goal:** config from `.env`, a `saxonberg` controller behind the control token.

**Files (in `/home/bobalu/play/pblive`):** `src/util/config.ts` → read `.env` (`dotenv`) with
`SERVER_PORT`, `SESSION_SECRET`, `MAKE_API_URI`, `MAKE_API_ACCESS_TOKEN`, `SAXONBERG_WS_URL`,
`SAXONBERG_CONTROL_TOKEN`; `src/util/aws.ts` kept behind `PBLIVE_CONFIG=ssm` for the old path (or
deleted — the owner's call at build time; default `.env`); `src/lib/SaxonbergController.ts`
(one `ws` client to `${SAXONBERG_WS_URL}/?control=${token}`, reconnecting; `send(action, button)`
sends `{ type: 'command', payload: { command: settings.command } }` and maps `control-result` to
`sendOk` / `sendAlert`); `Application.ts` registers `saxonberg`; `pblive-streamdeck/plugin.js`
makes `PBLIVE_URI` configurable in the property inspector. Buttons are configured with
`function: "saxonberg.send"` and `command: "stream away bathroom"` etc.

**Acceptance:** a button press runs `stream away privacy` as the configured streamer and lights ✓;
a non-`stream` command lights ⚠. **Commit (pblive):** `feat: .env config and the saxonberg
controller behind the scoped control token`.

### W8 — Docs, the drive, the MR

`docs/subsystems/livestream.md` rewritten around the mixin (the pieces table, the token model, the
allowlist, the control principal, the redaction stamp, the on-air marker, the real-time note);
`streaming.md` (per-streamer overlay reading; the YouTube link); `CLAUDE.md` map blurb left to the
sweep; `packages/wire/tests/broadcast-ready.dirty.wire.test.ts` (`DIRTY_REASON`: *issues stream
tokens that persist and adds a second streamer to the group*); `e2e/tests/broadcast-ready-walk.spec.ts`;
run the blocking drive against the real stack with OBS open and append § Drive record. **Commit:**
`docs(livestream): broadcast-ready — the subsystem doc, the drive record`.

---

## Reachability wiring

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| the `stream` grammar | `stream` + subcommands (`stream.yaml`) | `BroadcastMixin.commandContributions.self` — every Avatar sees it; `requiresStreamer` gates (the shipped split) | — | the view is a `command-view` document the platform pack installs | `reason` and `duration` are **string args** parsed by the controller (a required arg with no default fails closed — `away` requires one; `start` has none required); `agenda` is `greedy` by design (the whole rest is the list) — ⚠ the only greedy arg in the grammar, deliberately |
| a standby reason | `stream away <reason>` | — | `/platform/stream/reasons/<key>` documents | read by path on use (`DocumentApi.read`) | an unknown key that is not a duration → `unknown-reason` refusal naming both readings |
| the panels | — (the feed) | — | `/platform/stream/panels/*` documents | `DocumentApi.list('/platform/stream/panels/')` once per feed connection | malformed row → the row is skipped with a warn and the others ship |
| the overlay token | `stream token` | the grammar | `/platform/stream/tokens/<sha256>` | read by path at upgrade | wrong scope / revoked → 401 |
| the control token | `stream token --control` | the grammar | same kind, `scope: control` | same | first word must be `stream`; `stream token` refused |
| the controls card | `stream` (bare) | `opens_card: stream` on the view; the `streamer` layout's arrangement | `Cards.ts` row (`client` source) | pushed on open; body from `stream.state` | `CardApi.open` throws if the view forgets `opens_card` |
| client facts | — | the client writes `stream.foreground` | `clientStateSchema` entry | transient | validator: the three words only |
| the stream tag | — | `?from=stream` on the client URL | `Interactive.arrivedFrom` | runtime | closed vocabulary: `stream` |
| the on-air marker | `look`, `who` chips | `presenceLine` + the room `state` segment | `isOnAir()` | — | none — a statement |
| redaction | — | the `privacy:private` tag; `card.private` | — | — | the client redacts only on the stamp AND its own phase |
| YouTube link | the settings card's button | `/auth/google/youtube` | `GoogleProfile` fields | — | requires an authenticated session with a Google profile |
| a second streamer | `group add streamers <player>` (shipped) | the `group` verb | the managed group | — | — |

Each link is tested once in the wire drive by the step that uses it; **the `opens_card` gate and
the `requires:` chain are checked by `lint:command-views` and `lint:reachability` at build time.**

---

## Acceptance-criteria coverage

| requirements AC | waves |
|---|---|
| A streamer can run a whole show from commands, a popped-out card or the Stream Deck | W0 (commands) · W4+W5 (card, pop-out) · W1+W7 (Stream Deck) |
| A server restart leaves every overlay where it was | W0 (spine + re-arm) · W1 (snapshot withheld for a non-resident streamer; the overlay holds) · W6 (hold on drop) |
| Two streamers at once, neither moves the other's overlay | W1 |
| On air, private messages never appear on the broadcast; privacy standby shows no desktop/camera/mic nor any timer | W2 (stamp) · W4 (rendering) · W6 + OBS setup (absence of sources; no countdown on privacy) |
| Players in a broadcast room can see it is being broadcast | W2 |
| The overlay frames the desktop with the sidebar and a rotating lower third; panels, reasons and scene rules change without code | W6 (rules table, rows from documents) · W0 (reason rows) |
| Chat from both platforms appears as one stream in the sidebar | shipped relay + W1 (per-streamer filter) + W3 (YouTube under own login) |

**Unmapped: nothing.** Two requirement statements are adjusted by findings, not dropped —
*"handed here by the client-surface build"* (pop-out is built here, W5) and *"an installed app
(a PWA in a standalone window)"* (D13: PiP is the mechanism; the PWA ships for the main window).

---

## Test & gate strategy

**Unit (vitest, `test:near` per wave):** the mixin's transition table and timers (fake timers);
capture → materialize of every field; the feed's routing with two players; token issue / resolve /
revoke / scope; the env-token fallback both ways; the control branch's three refusals; the six
stamp sites; the two look lines; the YouTube link path with the fake transport (zero `search.list`
when linked); the client's redaction switch by phase; the foreground mapping; Rodney's
`rules.ts` as a pure table test. ⚠ `pnpm test` runs **twice** — at code-complete beside the open
MR and at `/finalize` — never between.

**The blocking drive** — `packages/wire/tests/broadcast-ready.dirty.wire.test.ts` for the wire
half, `e2e/tests/broadcast-ready-walk.spec.ts` for the browser half, and the real show with OBS
open for what only a screen can prove. Every step's pace, and how it is proved:

| # | requirements step | pace | wire / walk / OBS | how |
|---|---|---|---|---|
| 1 | `stream start in 2m` + agenda → Starting; `stream live` → Live frame | instant | wire (snapshot) + OBS (the frame) | assert `stream-state.phase` and `agenda` on a broadcast socket opened with the drive's own `stream token` |
| 2 | a tell reads *[private message]* on air | instant | wire (tag) + walk (render) | B sends A a tell; A's frame carries `privacy:private`; the walk reads the redacted line |
| 3 | `stream away bathroom` from the popped-out card → Away 5:00, no desktop/camera/mic | instant | walk (pop-out + click) + OBS | `awayUntil ≈ now+5m`, reason `bathroom`; the OBS scene is Away |
| 4 | `stream away privacy` from the Stream Deck → no timer; the tell reads in full | instant | wire (control socket) + walk | a control socket sends the command; `awayUntil: null`, `reason.privacy: true`; the walk reads the full tell |
| 5 | restart the server → the overlay holds the privacy standby | **staged** | wire | the staged twin of a restart is **logout → login** (`session.close()` + `Session.open`, which destructs and re-materializes the Avatar from `holder_snapshots`); the broadcast socket stays open and receives the same snapshot; nothing sends `live`. The real restart is walked once on the stack (the show's rehearsal) |
| 6 | `stream back` → Live; other tab, other app → `other-tab`, `other-app` | instant | wire (foreground write) + walk | the wire writes `stream.foreground` through `client-state-write`; the walk blurs the page |
| 7 | `stream next` steps the agenda | instant | wire | `current` advances, `done` flips |
| 8 | the Elgato privacy button with the server stopped | instant | OBS only | not a wire step — the Elgato plugin talks to OBS; walked at the rehearsal |
| 9 | a second player sees *broadcasting* on the streamer and the room; clears on `stream off` | instant | wire | B `look`s: the person chip `status` / presence line and the room `state` segment; after `stream off`, absent |
| 10 | a second streamer's `stream away food` does not move the founder's overlay | instant | wire | two sessions, two tokens, two broadcast sockets; assert no frame on A's socket |
| 11 | `stream end` → Ending, then offline after the outro; redaction off | short (one real minute, or `stream.outroMs` set to 2 s in the drive via `config`) | wire | `phase: ending` → `offline`; a tell after that is not redacted |
| 12 | Twitch and YouTube chat with glyphs; YouTube found without a search call | instant | wire (relay-chat envelopes with the injected transports' synthetic lines) + the show | assert zero `search.list` on the fake transport when linked |
| 13 | Rodney's `?mock` preview cycles with no server | instant | walk (Rodney page) | `playwright` against `localhost:5200/live.html?mock` |
| 14 | a new player's *"Welcome, <name>!"* in the ticker; *"straight from the stream"* with the tag | instant | wire | a fresh `Session.openAtRoster` → enroll → the `stream-event` on A's socket with `fromStream` when the socket URL carried `?from=stream` |
| 15 | the Saxonberg card shows the build's date and age | instant | wire (`build` on the snapshot) + the stack | `SAXONBERG_BUILD_*` set in the drive env |
| 16 | type `smelt` → the guide lights the command line; the next fact is smelting; never the arguments | instant | wire + walk | `client.lastVerb === 'smelt'` and no other field changes when `smelt the ore` is typed |

**Blocking vs soak:** every step is `instant`, `short` or `staged` — all blocking. **Soak drive:
none** (the requirements say so; nothing here reads game time). Make each checkpoint fail once on
purpose before trusting it (B2): redact with the phase forced `offline`, open a feed with a wrong-
scope token, push a tell without the tag.

**Gates:** `pnpm -C packages/server lint:family`, `pnpm lint`, `pnpm -C packages/rodney build`
(tsc), `pnpm wire` for the drive file, `pnpm test` at the two moments.

---

## Risks & opens

1. ⚠⚠ **The requirements are wrong about who hands pop-out to whom** (Grounding § client). The
   client-surface requirements deferred pop-out *to* this slate; nothing shipped. This plan owns it
   (W5). **Owner's eye:** no scope leaves — but the build's size grows by one client wave.
2. ⚠⚠ **The window LEAN inverts on the facts** (D13). An installed PWA's standalone window is a
   second connection and cannot host the same session's card; Document Picture-in-Picture can, is
   chromeless, always-on-top and one-per-tab. The plan ships PiP as the pop-out and the manifest for
   the main window. **Owner's call if this reading is unwelcome** — the alternative (fan cards out
   to every multiplexed `Interactive` and open the controls card in a second standalone client) is a
   card-surface change (`CardApi.#interactiveFor` takes the first connection by design) and would be
   a different build.
3. ⚠ **Reasons and panels as documents, not clones** (D2). An engineering choice inside the
   requirements' "rows, not code"; recorded so nobody reads the word *clone* as a promise of
   `clone /platform/stream/reasons/bathroom`.
4. ⚠ **P2 on the Avatar host.** Argued in § Host placement; the owner may still prefer a narrower
   carrier. The only narrower honest one is a document per streamer, which the requirements ruled
   out by choosing the spine and which would cost the presence line a document read.
5. **Twitch's simulcast terms on a combined chat** — the owner's call, made (the chat stays); the
   OBS setup doc keeps the warning. Not an engineering risk.
6. **YouTube scope step-up** needs the Google OAuth client to have the YouTube Data API enabled and
   the consent screen to list `youtube.readonly`; a verification-pending app is limited to test
   users (the founder is one). The build records the console steps in `deployment.md`.
7. **`documentPictureInPicture` availability** — Chrome 116+ only; the walk asserts the fallback
   notice elsewhere. The founder streams from Chrome.
8. **`obsstudio.setCurrentScene` permission** — a browser source without *Advanced access* silently
   has no `window.obsstudio` control; `src/obs.ts` says so in the page corner and falls back to
   obs-websocket when configured. Never silent (P3).
9. **Timers are wall time** — deliberate (D3); if the owner wants the game-clock rule to cover the
   interface tier too, say so now; it would make `stream away 15m` mean fifteen *game* minutes.
10. **The `BROADCAST_TOKEN` changeover** — resolves to `STREAMER_PLAYER_IDS[0]`; if the founder is
    not first in that list the overlay reads the wrong streamer. The boot log names the resolved
    player; the Rodney doc tells the founder to move to `stream token` the first week.
11. **Where `lastVerb` is recorded** (D6) — one line in `CommandGiver.run`; forced commands (the
    arrival `look`) also count. The build may exclude `forced` frames (the stack flag exists) if the
    guide flickers.
12. **The control principal has no `Interactive`** — a `stream` command's `shell.result` goes to the
    streamer's own client (they are the giver); only the status is echoed to pblive. Good for the
    show; noted so nobody expects prose on the Stream Deck.

**#2 is closed by D17** — the build does not stop for it; everything else is decided here with
its limb.

---

## Deferred seams

Clean attach points, each with the slate it leaves as:

- **The registry** (`streamer-registry-slate`) — `BroadcastMixin.channels` and the token documents
  are the fields the registry's claim-by-proof will own; the `streamers` group stays the gate.
- **Giving / money and community cards** (`giving-slate`, `budget-slate`) — `stream-event` is the
  envelope their arrivals ride (`kind: 'sub' | 'gift' | 'member' | 'patron'`); `money` stays `null`
  on the feed until the ledger exists; Rodney's `when` hides both rows.
- **The wiki article of the day** (`wiki-content-slate`) — `wikiOfDay` stays `null` until the
  public route ships; Rodney reads it client-side when it exists.
- **A show chosen by `stream start <show>`** — `topic`'s sibling field `show` on the mixin is one
  word away; not this build (the requirements' non-goal).
- **Kick on the show** — a `channels.kick` field already exists; turning it on is `stream channel
  kick <slug>`.
- **Alerts in the lower third** (track Phase 4) — a fourth envelope kind, same socket.
- **Per-card pop-out across connections** — if the owner wants a popped card in a second
  standalone client, the seam is `CardApi.#interactiveFor` fanning out; a card-surface change.
- **The deep-link page** (`deep-links-slate`) — `?from=stream` is the first tag; the slate's
  `/go/watch/<streamer>` route would set it.

No stub ships for any of these.

---

## Critical files

Read first, in this order:

1. `docs/requirements/broadcast-ready-requirements.md` · `docs/slates/builds/broadcast-ready-slate.md`
2. `packages/server/src/mud/platform/idea/StreamState.ts` · `platform/idea/cmd/stream/StreamController.ts` ·
   `packages/content/platform/content/platform/cmd/stream/stream.yaml`
3. `packages/server/src/backend/BroadcastFeed.ts` · `services/websocket/WebSocketService.ts` ·
   `backend/Application.ts` (`handleUserConnect`) · `backend/inbound/index.ts`, `command.ts`,
   `clientState.ts`
4. `packages/server/src/mud/lib/character/Avatar.ts` (the stack, `fieldMeta`, `enter`) ·
   `lib/calendar/Calendar.ts` (the re-arm) · `lib/persistence/Persistable.ts` ·
   `docs/subsystems/persistence.md § Per-mixin composition`
5. `packages/server/src/mud/lib/connection/ClientState.ts` · `SaxonbergClient.ts` · `Cards.ts` ·
   `platform/idea/CardRegistry.ts` · `api/card.ts` · `docs/subsystems/card-surface.md`
6. `packages/server/src/mud/lib/document/DocumentKinds.ts` · `api/document.ts`
7. `packages/server/src/mud/lib/comms/Comms.ts` · `platform/idea/ChannelCatalogue.ts` ·
   `cmd/perception/LookController.ts` (`presenceLine`, the room body) · `api/message.ts` (Tags)
8. `packages/server/src/mud/platform/idea/api/StreamLogic.ts` · `backend/YoutubeClient.ts` ·
   `services/auth/AuthRoutes.ts` · `lib/identity/GoogleProfile.ts`, `TwitchProfile.ts`
9. `packages/client/src/components/StreamerDeck.tsx` · `layouts/ModeStage.tsx` · `App.tsx`
   (frame ingest) · `components/cards/Card.tsx`, `CardBodies.tsx` · `services/websocket.ts` ·
   `components/ui/tokens.ts`
10. `packages/rodney/src/hooks/useStreamState.ts`, `useShow.ts` · `scenes/live/LiveOverlay.tsx`,
    `panels.tsx`, `LowerThird.tsx` · `scenes/standby/StandbyOverlay.tsx` · `show/profiles.ts` ·
    `docs/obs-setup.md`
11. `/home/bobalu/play/pblive/src/backend/Application.ts`, `src/lib/LightingController.ts`,
    `src/util/aws.ts`, `CLAUDE.md`; `/home/bobalu/play/pblive-streamdeck/plugin.js`
12. `packages/wire/src/harness/session.ts` · `packages/wire/tests/client-surface.dirty.wire.test.ts` ·
    `docs/testing.md § Staging` · `docs/workflow.md § No merge waits on the clock`

## Drive record

*(appended at build time)*
