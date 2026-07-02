# Stream tuning — implementation plan

Self-contained build spec. Execute against the closed-scope requirements
at [`../requirements/stream-tuning-requirements.md`](../requirements/stream-tuning-requirements.md)
(read it first — this plan realizes it and does not re-argue scope). The
superseded [`../requirements/youtube-relay-requirements.md`](../requirements/youtube-relay-requirements.md)
retains useful YouTube transport/quota/live-only mechanics; consult its
"10% that is NOT a copy" only for those mechanics.

**One-line summary.** Unify the shipped Twitch chat relay + the retired
video-embed path into two platform-agnostic verbs — `watch` (single focal
video; the server resolves + holds the embed target as authoritative
`cockpit.watch` state and pushes it to the client) and `tune` (N chat
follows + Twitch posting) — over a runtime `StreamerTarget`; add
**read-only** YouTube chat behind the
same surface with a single env reader account; and extend the overlay
`BroadcastFeed` to carry the overlay-owner's own chat (both platforms,
unified) while live.

## Planner decisions (resolved; D4 is product-overridable)

- **D1 — Unify the relay STATE.** Rename the shipped `TwitchRelay`
  (`/obj/TwitchRelay`) → `StreamRelay` (`/obj/StreamRelay`); re-key its
  channel map from `broadcasterId` to composite `channelKey(service, key)`
  (Twitch `key`=broadcasterId, YouTube `key`=liveChatId); tag each
  `ChannelEntry` with `service` + a display `handle`. `list`/`who`/
  `history` become platform-agnostic over one table. The Twitch transport
  reader/client stay per-platform. Rationale: the feature's thesis is
  unification, and `deliver` already takes a `service`-tagged
  `RelaySpeaker`. (Fallback if the shipped Twitch suite proves too costly
  to re-green: keep `TwitchRelay`, add a parallel read-only `YoutubeRelay`,
  aggregate in `StreamApi`. Not preferred.)
- **D2 — `StreamerTarget` = pure parser (in `lib/`) + async resolver (in
  the Logic).** `lib/streaming/StreamerTarget.ts` owns the value-object +
  a **pure, total, unit-tested** `parse()`. Real resolution (Twitch
  login→broadcasterId over the network; character→`User`→`TwitchProfile`
  over the DB) lives on `StreamLogic`, which may import `backend/` readers
  + identity docs. `lib/` stays backend-free (CLAUDE.md).
- **D3 — Overlay forwarding = sentinel viewer + one relay-emitted event.**
  A `BroadcastFeed` 0→1 edge calls `StreamApi.setOverlayReading(true)`,
  which `addTuned`s a sentinel playerId (`overlay:broadcast`) to the
  `OVERLAY_*` channels — reusing the existing presence edge to open the
  reader and giving `dispatchInbound` a channel entry. `deliver` skips the
  sentinel in the Avatar fanout but **emits `Events.RelayMessage`** per
  delivered line; `BroadcastFeed` subscribes, **filters to the `OVERLAY_*`
  channel keys**, and pushes a `RelayChatEnvelope`. The relay stays
  mud-pure (emits via `EventApi`, never imports `backend/`).
- **D4 — YouTube `@handle` is supported (LOCKED = (c)).** The grammar is
  fully symmetric with Twitch: `watch mkbhd --youtube` and
  `tune mkbhd --youtube` both work. (Everything is server-side; the axis
  is whether resolution needs an *external* YouTube Data API call.) The
  server resolves a Twitch handle, a YouTube URL, or a YouTube videoId
  from the argument **with no external call**; a bare YouTube **`@handle`**
  is resolved via `channels.list?part=id&forHandle=<@handle>` → channelId,
  then embedded as `youtube.com/embed/live_stream?channel=<channelId>`
  (durable — tracks the channel's live status across streams). Raw `UC…`
  channelIds are also accepted (skip the lookup). Details:
  - **Credential reuse — no separate `YOUTUBE_API_KEY`.** The
    `channels.list` call rides the **P3 `YoutubeClient` reader credential**
    (`YOUTUBE_READER_*`), which the client already holds for chat. So
    `@handle` resolution **couples to P3** — `watch --youtube @handle`
    lands *with/after P3*, not standalone in P2. In P2, YouTube `watch`
    accepts URLs/videoIds/`UC…` (no credential needed); `@handle` is wired
    when the resolver exists.
  - **Cost:** `channels.list` = **1 quota unit**, and handle→channelId is
    stable, so **cache it** (a `Map<handle, channelId>` on `YoutubeClient`)
    — repeat watches/tunes re-spend nothing.
  - **Consistency:** `tune --youtube @handle` already needs the same
    channel resolve (channel→live broadcast→liveChatId), so P3's
    `YoutubeClient.resolveChannel` is the single home for handle→channelId;
    `watch` reuses it.
  - **Degradation:** if the YouTube reader is unconfigured, `watch
    --youtube @handle` rejects-and-points ("YouTube isn't configured — give
    a YouTube URL"); URL/videoId watching still works with no credential.

## Conventions the build MUST respect (CLAUDE.md)

- **Module categories:** backend transport (`YoutubeClient`,
  `TwitchRelayReader`) in `backend/`; in-memory state = `obj/` `Idea`
  singleton (`StreamRelay`); gated logic = `obj/api/StreamLogic` forwarded
  by a thin `api/stream.ts` facade ending in
  `SecurityApi.decorateApiClass`; verbs = YAML view in `mud/cmd/stream/` +
  controller in `mud/obj/command/stream/`; `StreamerTarget` = a Named
  value-object in `lib/streaming/`. **No new module category, no
  free-floating helpers.**
- **Api→backend bridge:** `StreamLogic` imports the backend readers
  directly (the sanctioned direction, per `TwitchLogic`→`TwitchRelayReader`).
  Deep `lib/` + non-api `obj/` (incl. `StreamRelay`) stay backend-free.
- **Actor from context:** posting player = `context.commandGiver` /
  `getActingAuthor`, never a parameter.
- **Actorless frames:** relay frames use `MessageApi.sendMessage` (not
  `.scene`, which needs a Stuff actor).
- **Gates:** `StreamLogic` methods `FromModule('/api/stream#StreamApi')`.
- **Style:** no `.js` import extensions; server files single-quoted
  (repo has NO prettier config — do not run prettier); client files match
  the local double-quote style in `packages/client`.

---

## Phase 0 — Shared seams (additive; lands test-green)

Widen the wire contract + add the value-object/parser/clientState/dials.
Nothing consumes them yet.

**`packages/types/src/index.ts`:**
- Widen `RelaySpeaker` (~2081): both non-`in-game` arms `service:
  'twitch'` → `'twitch' | 'youtube'`.
- Rename `TwitchMessagePayload` (~2095) → `RelayMessagePayload` (keep
  `TwitchMessagePayload` as a type alias to limit churn); add `service:
  'twitch' | 'youtube'`; rename fields `broadcasterId`→`channelKey`,
  `broadcasterLogin`→`channelHandle`; keep `speaker`, `text`, `egress?`.
- Add `RelayChatEnvelope` (overlay wire contract): `{ type: 'relay-chat';
  frameId: number; service: 'twitch'|'youtube'; channelHandle: string;
  speaker: RelaySpeaker; text: string }`; add to the `Envelope` union
  (~1184) + `EnvelopeTemplate` (~1205).
- Add `WatchTarget`: `{ platform: 'twitch'; channel: string } | {
  platform: 'youtube'; videoId: string } | { platform: 'youtube';
  channelId: string }` (embed-shaped; the `channelId` arm renders the
  `live_stream?channel=` form for `@handle`/`UC…` targets; replaces the
  retiring `StreamSource`).
- Add `YOUTUBE_SCOPE_READONLY =
  'https://www.googleapis.com/auth/youtube.readonly'` (reader-only).

**`packages/server/src/mud/lib/streaming/StreamerTarget.ts` (new):**
- `type Platform = 'twitch' | 'youtube'`.
- `type ParsedTarget = { form: 'url'|'handle'|'character'; platform?:
  Platform; identifier: string } | { form: 'reject'; reason:
  'ambiguous-handle'|'url-opt-conflict'|'character-youtube'|'empty' }`.
- `class StreamerTarget` (resolved value): `{ platform, key, handle,
  character?: StuffRef }`.
- `static parse(arg, opts: { twitch?: boolean; youtube?: boolean }):
  ParsedTarget` — **pure**. URL detection (`twitch.tv`, `youtu.be`,
  `youtube.com` `@handle`/`watch?v=`/`live`); URL⊕opt conflict → reject;
  bare handle + exactly one opt → `handle`; bare handle + no opt → `try
  character else ambiguous-handle`; no `platform:handle` prefix accepted.
  YouTube-URL → extract `videoId`.
- Tests `lib/streaming/__tests__/StreamerTarget.test.ts`: all three forms,
  ambiguous-bare-handle reject, URL/opt-conflict reject, YouTube-videoId
  extraction, `--youtube`-on-character reject.

**`packages/server/src/mud/lib/connection/HasInteractive.ts`:** add
`clientStateSchema` entry `cockpit.watch`, `transient: true`, default
`null`, validator = `null` or `{platform, channel|videoId}` (the
`cockpit.inputModes` transient precedent).

**`AppSettings.ts` + `config/app-settings.yaml`:** add `youtube.historyCap`,
`youtube.reconnectBackoffMs`, `youtube.pollIntervalMs`.

*Ordering:* strictly first. Union widening is source-compatible; existing
suites unaffected.

---

## Phase 1 — Unify the chat surface + retire the `twitch` verb

Retarget the shipped Twitch relay behind the unified controller/Api/target
with byte-parity behavior. Embed still runs on `broadcastSources` until P2.

**Relay state (D1):**
- `obj/TwitchRelay.ts` → `obj/StreamRelay.ts`: composite `channelKey`,
  `ChannelEntry.{service,handle}`, `deliver` sets `payload.service` +
  emits `Events.RelayMessage` (D3, consumed in P4); sentinel-aware
  `addTuned`/`removeTuned`.
- `backend/TwitchRelayReader.ts`: unchanged responsibilities (Twitch
  transport); `dispatchInbound` down-call now targets `StreamApi`.
- `obj/api/TwitchLogic.ts` → `obj/api/StreamLogic.ts` (`/obj/api/stream`,
  gated `FromModule('/api/stream#StreamApi')`), target-shaped, dispatch on
  `target.platform`: `tune(avatar, target)`, `untune`, `dropPlayer`,
  `tunedTargetsFor`, `whoTuned`, `historyFor`, `post` (Twitch-only;
  YouTube→`{ok:false, reason:'read-only'}`), `dispatchInbound(service,
  NormalizedInbound)`, `resolveTarget(parsed, opts): ResolvedTarget |
  RejectReason` (D2 async resolver: URL→direct; Twitch handle→
  `resolveLogin`; character→`Avatar.getUser`→`User.twitchProfileId`→
  `TwitchProfile.login`→`resolveLogin`; character+`--youtube`→reject),
  `setOverlayReading(on)` (stub; wired P4). **Guard the sentinel
  `overlay:broadcast` out of `whoTuned`/`tunedTargetsFor` (R4).**
- `api/twitch.ts` → `api/stream.ts` (`StreamApi`, `decorateApiClass`):
  forwarding shell + call-shape types (`TuneResult`, `PostResult`,
  `NormalizedInbound`, `ResolvedTarget`, `TuneReason`).

**Verbs (category `stream`):**
- `mud/cmd/stream/tune.yaml`: `verbs:[tune]`, `controller:
  stream/TuneController`, `validators:[requiresAnimate]`, `fallthrough:
  true`; subcommands `off`/`list`/`who`/`history`; boolean opts
  `--twitch`/`--youtube`; greedy trailing `message` (bare-post). Bare
  `tune` = list.
- `mud/obj/command/stream/TuneController.ts`: mirror `TwitchController`
  dispatch + reject-and-point; parse via `StreamerTarget.parse` →
  `StreamApi.resolveTarget`; post via `StreamApi.post`. Reject copy:
  `tune <handle> --twitch`, `/auth/twitch/reauth?scope=user:write:chat`.
- `mud/seeds/obj/command/stream/TuneController.yaml`.

**Retire the `twitch` verb:** delete `mud/cmd/social/twitch.yaml`,
`mud/obj/command/social/TwitchController.ts`, its seed. `world.twitch.message`
topic stays.

**Boot:** `TwitchRelayReader.get().boot()` stays. Point
`StreamLogic.requireRelay` at `/obj/StreamRelay` (lazy `StuffApi.singleton`
— no seed unless `TwitchRelay` had one).

**Client:**
- `lib/templates/twitchTemplate.tsx` → `relayTemplate.tsx` parameterized by
  `service` (twitch-purple `⊳ twitch` glyph; YouTube `<youtube/>` red glyph
  inert until P3); preview → `tune <handle> --twitch`.
- `TemplateRegistry.ts` (~49): map `world.twitch` (P3: `world.youtube`) →
  `relayTemplate`.
- `App.tsx` `twitchFrameFields` → generalized `frame.relay` carrying
  `service`; `store/index.ts` `ConsoleFrame.twitch` → `ConsoleFrame.relay`.
  **Grep `frame.twitch` first; retain an alias if other consumers exist
  (R6).**
- `LivestreamPanes.tsx` `CHAT_TOPICS` already allowlists both — unchanged.

*Tests:* `TuneController.test.ts` (port the twitch-controller parity
assertions: tune/untune/list/who/history/post + reject-and-point);
`StreamLogic` resolve tests vs a mocked `TwitchRelayReader`; update tests
importing `TwitchApi`/`TwitchRelay` paths. *Ordering:* after P0;
independent of P2.

---

## Phase 2 — `watch` verb + per-viewer embed + retire `broadcastSources`

Swap the global operator embed for per-viewer `watch`-driven state and
clean-retire the entire `broadcastSources` path in one coupled move (embed
never broken mid-phase).

**`watch` verb:** `mud/cmd/stream/watch.yaml` + `obj/command/stream/
WatchController.ts` + seed. `watch <target>` parses via
`StreamerTarget.parse`, resolves the *embed* shape (Twitch→`{platform:
'twitch',channel}`; YouTube URL/videoId→`{platform:'youtube',videoId}`;
YouTube `UC…` channelId→`{platform:'youtube',channelId}` embedded as
`live_stream?channel=`; YouTube `@handle`→**resolved via the P3
`YoutubeClient.resolveChannel` (D4=(c)), so the `@handle` embed path is
wired in P3, not P2** — in P2, `watch --youtube` accepts URLs/videoIds/
`UC…` only), writes `cockpit.watch` via the
`HasInteractive` write→push (`setClientState`→`pushClientStateUpdate`; no
`save()` — transient, the `ModeController` precedent). `watch off` →
`null`. `watch` best-effort delegates to `StreamApi.tune` (watching implies
chat-follow; Twitch now, YouTube chat-tune lands P3 — YouTube `watch` sets
the embed and defers the implied tune until P3).

**Retire `broadcastSources` (grep-clean gate):**
- Server: delete `mud/api/stream-source.ts` + its test; remove
  `AppSettingKeys.livestreamBroadcastSources` + the yaml block; remove the
  `StreamSourcesChanged` emit in `ConfigController.ts` (~74-76); remove
  `Events.StreamSourcesChanged` (`events.ts` ~50); remove
  `Application.wireBroadcastSourcesPush` (~132-141) + its `AppBootstrap.ts`
  call (~244); remove the `broadcastSources` field + `StreamSourceApi`
  import from `Avatar.ts` (~38, ~420); fix `AppSettingsSeeder.test.ts`.
- Types: delete `StreamSource`, `StreamSourcesEnvelope`, remove from the
  unions, remove `broadcastSources` from `ConnectionEstablishedPayload`
  (~1563).
- Client: `store/index.ts` — remove the `broadcastSources` slice, add a
  `watch` selector reading `clientState['cockpit.watch']`; `App.tsx` —
  remove the `stream-sources` listener (~361-370); `StreamEmbed.tsx` —
  **remove the picker** (`PickerRow`/`PickerButton`), take a single
  `WatchTarget | null`, render one iframe (Twitch `player.twitch.tv?
  channel=…&parent=window.location.hostname`; YouTube `youtube.com/embed/
  <videoId>` for the videoId arm, `youtube.com/embed/live_stream?channel=
  <channelId>` for the channelId arm) or the empty placeholder;
  `LivestreamViewerLayout.tsx` —
  read `clientState['cockpit.watch']`; fix `connectionLink.test.ts`.

**Grep-list (zero after P2):** `broadcastSources`, `StreamSource`,
`StreamSourceApi`, `StreamSourcesEnvelope`, `StreamSourcesChanged`,
`livestreamBroadcastSources`, `livestream.broadcastSources`,
`wireBroadcastSourcesPush`, `stream-sources`, `PickerRow`, `PickerButton`.

*Tests:* `WatchController.test.ts` (sets/clears `cockpit.watch`, embed-shape
resolution, bare-YouTube-handle reject); client embed render (single
source, no picker). *Ordering:* after P1 (watch delegates to P1
`StreamApi.tune`).

---

## Phase 3 — YouTube chat, READ-ONLY

Add the YouTube transport + read-only relay path behind the unified
surface. Single env reader account; `GoogleProfile` untouched.

**Backend transport (`backend/`):**
- `backend/YoutubeClient.ts`: injected transport, `Map<liveChatId,
  StreamConnection>` (`liveChatMessages.streamList` primary; `list`-poll
  fallback at server `pollingIntervalMillis`); `resolveChannelId(ref):
  channelId | 'unknown'` (**D4=(c)**: `@handle`→`channels.list?part=id&
  forHandle=<@handle>`, 1 quota unit, memoized in a `Map<handle,channelId>`;
  `UC…` passes through; this is the single home for handle→channelId,
  consumed by BOTH `tune` and `watch`), `resolveLiveChatId(channelRef):
  {liveChatId} | 'not-live'` (channelId→current live broadcast→
  `liveStreamingDetails.activeLiveChatId`), `openStream`, `closeStream`,
  `readerToken()` (refresh env `YOUTUBE_READER_REFRESH_TOKEN` against
  Google's token endpoint with `YOUTUBE_READER_CLIENT_ID/SECRET` — **no
  `GoogleProfile`**; the `channels.list` resolve reuses this token, so
  **no separate `YOUTUBE_API_KEY`**). `forTest(transport)` factory.
  Per-stream reconnect w/ backoff, re-resolving liveChatId on reconnect.
- `backend/YoutubeRelayReader.ts`: presence-gated per-liveChatId reader;
  `isConfigured()`, `resolveChannel(ref)`, `subscribe(target)`/
  `unsubscribe(target)` (live-only bind, reject-if-not-live), stream-end
  detection → **auto-untune** (`StreamApi.dropChannel` + notice); observes
  `PlayerLoggedOut`; `dispatchInbound` down-call with `service:'youtube'`.

**Mud + Api:**
- `StreamRelay`: YouTube channels register `service:'youtube'`,
  `key`=liveChatId, no echo/throttle/send.
- `StreamLogic`/`StreamApi`: YouTube branch of `tune`/`resolveTarget`/
  `dispatchInbound`; YouTube `post`→`read-only` (controller
  reject-and-points "YouTube posting isn't available"); not-configured +
  live-only reject copy.
- **`watch --youtube @handle` lights up here (D4=(c)).** `WatchController`'s
  YouTube-`@handle` path (deferred in P2) now resolves via
  `YoutubeClient.resolveChannelId` → a `{platform:'youtube', channelId}`
  `WatchTarget`. Reader-unconfigured → reject-and-point ("give a YouTube
  URL"). URL/videoId/`UC…` watching stays credential-free.
- Topic seed `mud/seeds/lib/messaging/Topic/world.youtube.message.yaml`
  (mirror the Twitch one; `family: world.youtube`).
- **Do NOT create `mud/api/youtube.ts`/`YoutubeLogic`** — the surface is
  unified on `StreamApi`; only the *transport* is per-platform. (This
  diverges from the superseded slate's parallel-mirror file inventory and
  matches the requirements' "unify the surface, keep transports
  per-platform.")
- Boot: `YoutubeRelayReader.get().boot()` beside the Twitch reader in
  `AppBootstrap.ts`.

**Client:** `relayTemplate` YouTube branch lights up; `App.tsx` ingest
handles `world.youtube.message`; `TemplateRegistry` maps `world.youtube`.

*Tests:* `YoutubeRelayReader.test.ts` + `YoutubeClient.test.ts` (mocked
transport): liveChatId resolution, live-only reject, stream-end teardown/
auto-untune, presence-gating parity; `StreamLogic` YouTube resolve +
read-only-post reject. *Ordering:* after P1 (StreamApi seam) + P2 (`watch
--youtube` video already works; its implied chat-tune now lands).

---

## Phase 4 — Overlay chat forwarding (owner's own chat → `BroadcastFeed`)

Ship the server wire contract + forwarding (render lives in `pbox-stream`).
Preserves one-token/one-feed/one-owner.

- **Event (D3):** add `Events.RelayMessage` (`lib/events.ts`) or a
  `RelayMessageEvent` value in `lib/events/` mirroring
  `ReactionScopeDeltaEvent`. `StreamRelay.deliver` emits `{service,
  channelKey, channelHandle, speaker, text}` per delivered inbound line.
  Relay imports no `backend/` — `EventApi.emit` only.
- `backend/BroadcastFeed.ts`: in `ensureSubscribed`, add
  `EventApi.on(Events.RelayMessage, …)` that **filters to
  `OVERLAY_TWITCH_LOGIN`/`OVERLAY_YOUTUBE_CHANNEL`** and `pushRelayChatToAll`
  a `RelayChatEnvelope` (mirror `pushReactionDeltaToAll`). In
  `addConnection`/`removeConnection`, drive 0→1 / 1→0 →
  `StreamApi.setOverlayReading(true/false)`.
- `StreamApi.setOverlayReading(on)` / `StreamLogic`: resolve `OVERLAY_*`
  via the readers, `addTuned`/`removeTuned` sentinel `overlay:broadcast`
  (reuses presence edges to open/close owner reads, independent of any
  player `tune`). Twitch: `resolveLogin(OVERLAY_TWITCH_LOGIN)`. YouTube:
  `resolveChannel(OVERLAY_YOUTUBE_CHANNEL)`→liveChatId; re-resolve on
  reconnect + a **single-channel light live-status poll** (AppSetting
  interval) to catch owner stream-restart (acceptable divergence from the
  deferred N-channel viewer auto-rebind).
- **Env:** `OVERLAY_TWITCH_LOGIN`, `OVERLAY_YOUTUBE_CHANNEL` (documented
  beside `BROADCAST_TOKEN`/`STREAMER_PLAYER_IDS`).

*Tests:* `BroadcastFeed` overlay test (mocked readers + fake broadcast
socket): owner Twitch+YouTube chat → `relay-chat` envelopes,
provenance-tagged; a viewer tuning a **different** channel does **not**
leak onto the feed (filter proof); owner read gated on overlay presence
(0→1 opens, 1→0 closes); re-resolve on reconnect. *Ordering:* after P3
(needs both readers).

---

## Phase 5 — Docs

- `docs/subsystems/streaming.md` (new): fold in `twitch-relay.md` (retire
  it or leave a superseded banner pointing here); cover the `tune`/`watch`
  surface, the tri-modal target grammar, both transports, the
  read-only-YouTube boundary, the overlay-chat forwarding +
  `RelayChatEnvelope` contract for `pbox-stream`.
- `docs/subsystems/cockpit-layouts.md` (edit): replace the
  "Livestream-viewer + embed" section — the embed is now `watch`-driven
  per-viewer `cockpit.watch` clientState; `broadcastSources`/
  `StreamSourceApi`/picker retired; drop the `livestream.broadcastSources`
  cross-refs.
- `docs/subsystems/livestream.md` (edit): add the overlay `RelayChatEnvelope`
  + the relay→feed event-bus seam to the `BroadcastFeed` section.

*Ordering:* last (documents the shipped shape).

---

## Risk register

- **R1 — refactoring shipped `TwitchRelay` (D1).** Re-keying to composite
  `{service,key}` touches the shipped path + tests. Mitigation: keep
  mutator signatures stable, add `service` defaulted, re-green ported
  Twitch tests in P1 before P3. Fallback = dual singletons.
- **R2 — YouTube `@handle` resolution (D4=(c), LOCKED).** Server resolves
  `@handle`→channelId via `channels.list?forHandle` (1 quota unit,
  memoized), reusing the P3 reader credential (no `YOUTUBE_API_KEY`). The
  coupling to watch: `watch --youtube @handle` lands **in P3** (the
  resolver's home), not P2 — P2 YouTube `watch` is URLs/videoIds/`UC…`
  only. Reader-unconfigured degrades to a URL-only reject.
- **R3 — `streamList` availability + quota.** If unavailable in our tier,
  the `list`-poll fallback must be wired day one behind the `YoutubeClient`
  seam. Ops prerequisite before P3 live-tests: provision the reader
  account's `youtube.readonly` refresh token (`YOUTUBE_READER_*`).
- **R4 — overlay sentinel in `who`/`list`.** Filter `overlay:broadcast`
  out of `whoTuned`/`tunedTargetsFor` (it's not an Avatar).
- **R5 — `RelayMessage` bus volume.** In-process; `BroadcastFeed` filters
  to `OVERLAY_*` before the wire, so no chat leaks; cadence ≈
  `ReactionScopeDeltaEvent` (fine).
- **R6 — client `frame.twitch`→`frame.relay` rename.** Grep first; retain
  an alias if other consumers exist.
- **R7 — style.** Server single-quote (no prettier run); client
  double-quote (match locally); no `.js` import extensions.

## Critical files
- `packages/types/src/index.ts`
- `packages/server/src/mud/obj/TwitchRelay.ts` → `StreamRelay.ts`
- `packages/server/src/mud/obj/api/TwitchLogic.ts` → `StreamLogic.ts`
- `packages/server/src/mud/api/twitch.ts` → `stream.ts`
- `packages/server/src/backend/BroadcastFeed.ts`
- `packages/server/src/backend/YoutubeClient.ts` / `YoutubeRelayReader.ts` (new)
- `packages/client/src/components/embed/StreamEmbed.tsx`

## Cross-references
- Requirements: [`../requirements/stream-tuning-requirements.md`](../requirements/stream-tuning-requirements.md)
- Subsystems: [twitch-relay.md](../subsystems/twitch-relay.md),
  [livestream.md](../subsystems/livestream.md),
  [cockpit-layouts.md](../subsystems/cockpit-layouts.md),
  [connection.md](../subsystems/connection.md),
  [messaging.md](../subsystems/messaging.md)
