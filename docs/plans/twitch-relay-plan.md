# Twitch two-way relay — implementation plan

A grounded, phased plan for the Twitch relay build (Phases 2 + 6 of the
[Broadcast & Patronage track](../tracks/broadcast-patronage-track.md) plus
the deferred auth-slate incremental-scope tail). **Authoritative spec:**
[external-chat-relay-requirements.md](../requirements/external-chat-relay-requirements.md)
— read it in full first; every Goal, Surface decision, Constraint, and
Acceptance criterion there is settled and binding. This plan is *how*, not
*what*. Branch: `feature/twitch-relay-build`, freshly branched from
`origin/master` (fetch first — the local `master` worktree is stale).

The build spans three packages (`server` + `types` + `client`) and is a
**dedicated separate surface**, not a `Channel` facet (the recorded
deviation from the slate). Its center of gravity is the
**backend↔mudlib layering**: `backend/` may import `mud/`, but `mud/` may
**not** import `backend/`. That one fact dictates the outbound DI port and
the inbound down-call below.

## 0. Self-bootstrapping orientation (read these mirrors first)

Build against shipped precedents; do not invent new shapes.

| Relay piece | Mirrors | Evidence (read before coding) |
|---|---|---|
| `TwitchClient` (EventSub session + Helix + token), `TwitchRelayReader` (presence-gated worker) | `BroadcastFeed` singleton (lazy boot, `EventApi.on`, reconnect) | `backend/BroadcastFeed.ts`; [livestream.md](../subsystems/livestream.md) |
| `TwitchChannel` (registry Document) + seeder | `Channel` + `ChannelSeeder` reading `mud/config/channels.yaml` (insert-only/idempotent) | `mud/lib/social/Channel.ts`, `backend/ChannelSeeder.ts`; [chat.md](../subsystems/chat.md) |
| `TwitchRelay` singleton (caches, history ring, presence, echo-tags, queue) | `ChannelCatalogue` (`PostRegistrationMixin(Idea)`, `postRegister` warm, history-ring map, ungated reads, singleton-destruct refusal) | `mud/obj/ChannelCatalogue.ts` |
| `TwitchApi` / `TwitchLogic` | `ChatApi` (thin `StuffApi.singleton` forwarding shell + `decorateApiClass`) ↔ `ChatLogic`-style gated singleton (`FromModule('mud/api/twitch#TwitchApi')`) | `mud/api/chat.ts`, `mud/obj/ChannelCatalogue.ts` |
| Inbound hand-built frames → `MessageApi.sendMessage` per recipient | `ChannelCatalogue.postToChannel`'s **manual witness loop** (NOT Scene — Scene requires a Stuff actor) | `mud/obj/ChannelCatalogue.ts` (the per-recipient `sendMessage` fanout) |
| `TwitchTunedMixin` (per-Avatar tuned `Set<string>`) | a collection mixin (Set surface `addX/removeX/hasX/getXs`), persistent field via accessor | [collections.md](../subsystems/collections.md), `lib/mixin.ts` |
| `world.twitch.message` Topic | `world.narration` Topic genre seed | `mud/seeds/lib/messaging/Topic/world.narration.yaml`; [topics.md](../subsystems/topics.md) |
| Re-auth strategy + write-back | `twitch-link` strategy + `Application.findOrCreateTwitchProfile` upsert (overwrites scopes+tokens, keyed `twitchUserId`) + `handleProviderLink` (upsert runs *before* the already-linked short-circuit) | `services/auth/PassportConfig.ts`, `services/auth/AuthRoutes.ts`, `backend/Application.ts` (≈L443, L572, L577) |
| Outbound DI port | the sanctioned **backend→mudlib DI seam** (boot-time injection into an Api) | CLAUDE.md *Export discipline & the sanctioned-exception registry* |
| Collections + indexes | `Collections` enum + `createIndexes()` | `backend/PersistenceManager.ts` |

### House conventions (do not drift)

- **No new module categories.** One new subsystem folder `mud/lib/twitch/`
  (Document + mixin + value types), `mud/api/twitch.ts` forwarding shell,
  `mud/obj/api/TwitchLogic.ts` singleton, `mud/obj/TwitchRelay.ts` registry
  singleton, one `obj/command/social/` + `mud/cmd/social/` verb MVC pair,
  `backend/` infra files, one `mud/config/` YAML, one Topic seed. No
  free-floating helpers — fold into Api statics or value-objects.
- **Nothing imports `TwitchLogic`** except `api/twitch.ts`. Consumers call
  `TwitchApi`.
- **Acting principal from context** (`getActingAuthor`), never a parameter.
- **Member privacy:** `api/` + `backend/` default to `#`; `lib/`/`obj/`
  mixin instance state uses TS `private` (proxy-trap rule); persistent
  fields public for the Hydrator. Tokens never logged (only `_id`/login).
- **Inter-Stuff contract = methods only.** Export discipline: classes &
  types only — the one sanctioned exception is the DI port (registered).

### Settled decisions (resolved in design; do not re-open)

1. **One reader account for all channels** — a single operator-provisioned
   Twitch identity (env `TWITCH_READER_USER_ID`, its `TwitchProfile` holds
   `user:read:chat`); its `twitchUserId` is the `user_id` condition on
   every subscription.
2. **Outbound layering = DI port** (`TwitchRelayPort` injected at boot via
   `TwitchApi.installRelayPort`) — **approved**, register it in the
   sanctioned-exception registry. Not event-based (the reject-and-point
   contract needs the inline send result).
3. **Client work in scope** — `packages/client` pane + glyph + hover-reveal
   ship in this build.
4. **`force_verify=true`** on re-consent (only reached when `hasScope`
   fails, so the prompt appears only when a grant is genuinely needed).
5. **Channel addressing:** `broadcasterLogin` first, then `label`, both
   case-insensitive.
6. **Dials** as AppSettings: `twitch.historyCap`, `twitch.sendRatePerPlayer`,
   `twitch.globalSendRate`, `twitch.echoTtlMs`.

---

## Build order & justification

**Auth → integration client → relay surface → client.** Auth ships first
because both directions hard-block on scope acquisition (reader's
`user:read:chat`; each poster's `user:write:chat` via the
`hasScope`-fails → reject-and-point → re-consent loop). The integration
client is second — the reader and the outbound port both consume it, and it
has **zero** dependency on the relay surface (an explicit acceptance
criterion). The relay surface (largest) is third. Client rendering is
fourth (depends on the shared wire types landing in phase 3).

---

## Phase 1 — Incremental-scope re-authorization flow

Goal: an authenticated route that re-runs Twitch OAuth for an
already-linked user with an **expanded** scope set, writing broadened
token+scopes back to the **existing** `TwitchProfile`.

| File | Category | Change |
|---|---|---|
| `mud/lib/identity/TwitchProfile.ts` | Document (modify) | Add `hasScope(scope: string): boolean`. |
| `services/auth/PassportConfig.ts` | service (modify) | Scope constants `TWITCH_CHAT_READ_SCOPE='user:read:chat'`, `TWITCH_CHAT_WRITE_SCOPE='user:write:chat'`. Register a `'twitch-reauth'` OAuth2 strategy (own callback URL, `state:true`), verify callback reusing `buildTwitchProfile` → `PassportTwitchProfileWithTokens`; override `authorizationParams()` to inject `force_verify:'true'`. |
| `services/auth/AuthRoutes.ts` | service (modify) | `GET /auth/twitch/reauth` (behind `requireAuth`): read `?scope=` against an **allowlist** `{user:read:chat,user:write:chat}`; `passport.authenticate('twitch-reauth', { scope:[...TWITCH_IDENTITY_SCOPE, ...alreadyGranted, ...requested], session:false })` (incremental — include current scopes so Twitch doesn't drop them). `GET /auth/twitch/reauth/callback` (requireAuth) → `Backend.handleProviderLink('twitch', userId, profile, …)` (reuses the upsert-before-short-circuit write-back) → redirect `?reauth=success|collision|failure`. |
| `services/auth/__tests__/twitch-reauth.test.ts` | test | OAuth round-trip mocked (stub strategy verify / `buildTwitchProfile` fetch): scopes written to the **same** `_id`, no second row, `hasScope` true after. |

**Decisions:** reuse `handleProviderLink` (collision guard + upsert already
correct; same-user re-auth returns `already-linked`, treated as success
because the scope write-back precedes the short-circuit). The reader
account grants `user:read:chat` through the same route (admin self-serve).

---

## Phase 2 — Shared backend Twitch integration client

Goal: standalone EventSub-session + Helix + token plumbing,
**event-type-parameterized**, consumable by Phase-4 payment intake with no
chat-relay assumption. Modeled on `BroadcastFeed` (singleton, lazy boot,
reconnect/backoff).

| File | Category | Surface |
|---|---|---|
| `backend/TwitchClient.ts` | backend-infra (new) | Singleton `TwitchClient.get()`. `openSession(): Promise<EventSubSession>` (welcome→`session_id`→keepalive timer→reconnect on `session_reconnect`/close with backoff); `createSubscription({ type, version, condition, sessionId, token }): Promise<{ id }>`; `deleteSubscription(id)`; `sendChatMessage({ broadcasterId, senderId, token, text }): Promise<{ ok; messageId?; error? }>`; `tokenFor(profile): Promise<TwitchToken>` (decrypt → refresh-if-expired → `profile.applyRefreshedToken` write-back). Inject a `TwitchTransport` interface (`{ fetch; openWebSocket }`) defaulting to real `fetch`+`ws` — the **test seam**. The `type` param on `createSubscription` is the proof of no-chat-assumption (acceptance criterion). |
| `backend/__tests__/TwitchClient.test.ts` | test | Mocked transport: synthetic `session_welcome` → `createSubscription` issues the right Helix POST; `sendChatMessage` hits Send Chat Message; expired token → refresh + write-back; `session_reconnect` re-subscribes. |

**Notes:** EventSub `channel.chat.message` needs a **user** token (the
reader's), not an app token — `tokenFor` resolves the reader's
`TwitchProfile`. One ws session carries N subscriptions; the client owns
session lifecycle, the reader owns *which* subs exist.

---

## Phase 3 — The relay surface (server)

### 3a. Registry + seeder
- `mud/lib/twitch/TwitchChannel.ts` — Document, `collectionName='twitch_channels'`, `persistentFields=['broadcasterId','broadcasterLogin','label']`, `static findByLogin`.
- `mud/config/twitch.yaml` — `channels: [{ broadcasterId, broadcasterLogin, label }, …]` (multiple → multi-channel).
- `backend/TwitchChannelSeeder.ts` — `static run()` insert-only/idempotent, matched on `broadcasterId` (mirrors `ChannelSeeder`).
- `backend/AppBootstrap.ts` — `await TwitchChannelSeeder.run();` beside `ChannelSeeder.run()`.

### 3b. Topic + shared wire types
- `mud/seeds/lib/messaging/Topic/world.twitch.message.yaml` — `class:/lib/messaging/Topic`, `data:{ topic:world.twitch.message, family:world, label:Twitch, description:… }`.
- `packages/types/src/index.ts` — the **shared speaker union** (server composes, client switches):
  ```ts
  type RelaySpeaker =
    | { kind: "in-game"; ref: StuffRef }
    | { kind: "external"; service: "twitch"; externalName: string }
    | { kind: "external-linked"; service: "twitch"; externalName: string; ref: StuffRef };
  interface TwitchMessagePayload {
    broadcasterId: string; broadcasterLogin: string;
    speaker: RelaySpeaker; text: string; egress?: boolean;
  }
  ```

### 3c. Tuning store
- `mud/lib/twitch/TwitchTuned.ts` — `TwitchTunedMixin`, `_mixinName='TwitchTunedMixin'`, persisted `Set<string>` of tuned `broadcasterId`s, surface `addTuned/removeTuned/isTuned/getTunedIds`. Register in `lib/mixin.ts`. Compose onto `Avatar` (subscription-gated, not implant-gated — no aether host).

### 3d. Relay singleton + Api/Logic
- `mud/obj/TwitchRelay.ts` — `PostRegistrationMixin(Idea)`. `postRegister` warms `byId/byLogin/byLabel` from `twitch_channels`. Owns: `history: Map<broadcasterId, MessageFrame[]>` (ring, `twitch.historyCap`); `presence: Map<broadcasterId, number>`; echo-tag `Map<string, number>` keyed `${twitchUserId} ${text}`→expiry; outbound FIFO `queue` + per-player token-bucket throttle. Methods: `resolveChannel(idOrLoginOrLabel)`, `historyFor`, `appendToHistory`, `noteEcho`, `isEcho`, `recordPresence(broadcasterId, delta) → { count, prev }`, `enqueueOutbound`.
- `mud/api/twitch.ts` — thin gated forwarding shell; statics `resolveChannel`, `tunedChannelsFor`, `tune/untune`, `historyFor`, `whoTuned`, `post(speaker, broadcasterId, text)`, `dispatchInbound(normalized)` (backend reader's down-call entry), `installRelayPort(port)` (DI seam). `SecurityApi.decorateApiClass`.
- `mud/obj/api/TwitchLogic.ts` — `@internal`, gated `FromModule('mud/api/twitch#TwitchApi')`; resolves `TwitchRelay` via module-private `requireRelay()`; holds the outbound fork, inbound dispatch, presence-event firing.

### 3e. Reader worker + presence event
- `mud/lib/events.ts` — add `TwitchPresenceChanged:'twitch.presenceChanged'`, payload `{ broadcasterId; count; prev }`.
- `backend/TwitchRelayReader.ts` — singleton, lazy boot. `Map<broadcasterId, { subId }>`. `EventApi.on(TwitchPresenceChanged)`: **0→1** create a `channel.chat.message` sub (condition `{ broadcaster_user_id, user_id: READER_USER_ID }`) via `TwitchClient`, **debounced**; **1→0** delete, debounced. `EventApi.on(PlayerLoggedOut)` lets presence recompute. On inbound notification: **normalize** to `{ broadcasterId, senderTwitchUserId, senderLogin, senderDisplay, text }` → `TwitchApi.dispatchInbound(...)` (down-call). Normalization stays decoupled from delivery (future-bridge seam).

### 3f. The DI port (layering crux — the approved sanctioned exception)
`mud/` cannot import `backend/`, so outbound (`TwitchLogic.post`) cannot
call `TwitchClient` directly. Define `interface TwitchRelayPort { send(opts):
Promise<{ ok; error? }> }` (homed beside the Api types it speaks). At boot
`Application` constructs a `TwitchClient`-backed impl and calls
`TwitchApi.installRelayPort(impl)`. `TwitchLogic.post` calls the installed
port (throws "relay offline" if unset). **Register this seam** in the
sanctioned-exception registry (CLAUDE.md) with its reason. Inbound is the
reverse direction (backend → `TwitchApi.dispatchInbound`) — a normal
down-call, no port.

### 3g. Verb + controller
- `mud/cmd/social/twitch.yaml` — `verbs:[twitch]`, `controller:TwitchController`, `fallthrough:true`. Subcommands `list/tune/untune/history/who` (each `{ args:[{ name:channel }] }` except `list`); top-level `args:[{ name:channel },{ name:message, greedy:true }]` for the bare post.
- `mud/obj/command/social/TwitchController.ts` — `model.subcommand` absent → `executePost`: resolve `TwitchChannel`; resolve poster's `TwitchProfile` (via `User.twitchProfileId`); **unlinked or `!hasScope('user:write:chat')` → reject-and-point** (note links the reauth route; no mirror); else `TwitchApi.post(...)` (throttle → port-send → on `{ok}` mirror a case-1 `egress` frame + `noteEcho`). `tune/untune` → `TwitchApi.tune/untune`; `list` live+tuned status; `who` tuned avatars; `history` reads the ring.

### 3h. Inbound resolution + dispatch (`TwitchLogic.dispatchInbound`)
**Echo check first:** `TwitchRelay.isEcho(senderId, text)` → drop. Resolve
speaker: `TwitchProfile.findByTwitchUserId(senderId)` → `User.find({
twitchProfileId })` → Avatar → cache `twitchUserId→Avatar` (invalidate on
link/unlink). Unlinked → case 2; linked → case 3 (`ref:
MessageApi.refOf(avatar)`). Hand-build `MessageFrame`s (no Scene),
`topic:'world.twitch.message'`, `meta.channelId=broadcasterId`, payload =
`TwitchMessagePayload`, body via `Mml`; deliver to each tuned-in Avatar
(`TwitchTunedMixin.isTuned(broadcasterId)`, online) via
`MessageApi.sendMessage`. Append one frame to the ring.

### 3i. Collections/indexes
- `backend/PersistenceManager.ts` — add `twitch_channels` to `Collections` + `createIndexes()` (unique `broadcasterId`, index `broadcasterLogin`).

---

## Phase 4 — Client (`packages/client`)

Route `world.twitch.message` to its **own cockpit pane** (distinct from
`world.chat.message`). Switch on `payload.speaker.kind`: render `<twitch/>`
glyph + handle by default; linked MUD persona (case 3) on mouseover;
outbound mirror (`egress:true`) shows native speaker + `⊳twitch` marker. Add
the `<twitch/>` glyph to the client MML parser/renderer. The `twitch` verb's
clickable affordances **preview their command in the command bar on
mouseover** (global client rule). Any server-side `Mml` helper is a static
on `Mml` (`api/mml.ts`), not a free function.

---

## Genuinely hard / risky parts

1. **Stuff-less synthetic speaker + 3-case union.** No Stuff actor for
   inbound; `MessageApi.scene` requires one. → never use Scene for inbound;
   hand-build frames + `MessageApi.sendMessage` (ChannelCatalogue's manual
   loop is the precedent). Union lives in `@saxonberg/types` so server +
   client agree. Resolution cache invalidated on link/unlink.
2. **EventSub session + per-channel presence-gating.** One ws session, N
   subs, keepalive + `session_reconnect` re-subscribe, edge-triggered +
   debounced create/delete per broadcaster. → `TwitchClient` owns
   session/keepalive/reconnect; `TwitchRelayReader` owns the
   `broadcasterId→subId` map and reacts to `TwitchPresenceChanged`. Presence
   crosses the boundary via `EventApi` (no down-import), per BroadcastFeed.
3. **Scope-parameterized strategy + write-back.** Risk: a second row or
   dropped scopes. → `twitch-reauth` reuses `buildTwitchProfile`; request
   includes current scopes (incremental) + `force_verify=true`; write-back
   rides the `twitchUserId`-keyed upsert (same row). `hasScope` added.
4. **Echo tag-and-suppress.** Success → `noteEcho(senderTwitchUserId, text)`
   TTL; `dispatchInbound` drops a match within TTL. **Accepted limitation:**
   exact-text within TTL can false-drop a legit repeat — documented.
5. **Throttle/queue.** Per-player token-bucket + global FIFO drained by
   `ScheduleApi.recurring` at a max rate; bursts shaped, not errored. Dials
   = `twitch.*` AppSettings. Lives on the relay singleton.
6. **Outbound layering (port).** The injected `TwitchRelayPort` is the only
   way mudlib reaches the backend client — a registered sanctioned
   exception (approved).

---

## Test strategy (no live Twitch)

- **Transport mock** in `TwitchClient` (`{ fetch, openWebSocket }`): drive
  synthetic `session_welcome`/`keepalive`/`session_reconnect`/
  `channel.chat.message` and assert Helix POSTs — subscription lifecycle,
  Helix send, token refresh+write-back, reconnect re-subscribe.
- **Inbound dispatch:** feed a normalized inbound straight to
  `TwitchApi.dispatchInbound` with a tuned-in test Avatar; assert a
  `world.twitch.message` frame, correct speaker case (2 vs 3 via mocked
  `User.find`), ring landing, and only-that-broadcaster's-subscribers
  receive it.
- **Presence-gating:** two channels; tune 0→1 fires one
  `TwitchPresenceChanged`, reader (mocked client) creates exactly one sub;
  last untune tears down only that channel's sub; debounce via timer
  advance.
- **Outbound happy / reject-and-point:** mock the injected port; linked +
  scoped → case-1 `egress` mirror on `{ok:true}`; unlinked/unscoped → no
  mirror + reject note, and the same Avatar still receives a tuned inbound.
- **Echo / throttle:** `noteEcho` then matching inbound drops; an outbound
  burst is shaped by the queue, not thrown.
- **Auth:** reauth route, OAuth round-trip mocked — same-`_id` write-back,
  no new row, `hasScope` flips true.

---

## Subsystem doc (finalize)

`docs/subsystems/twitch-relay.md`: integration client, registry,
presence-gated multi-subscription reader, separate-surface/own-topic, the
three-case identity bridge, outbound fork + echo suppression +
throttle/queue, the DI port, the chat-bridge seam, and the
YouTube/payment-intake deferrals.

## Cross-references

- Requirements: [external-chat-relay-requirements.md](../requirements/external-chat-relay-requirements.md)
- Track: [broadcast-patronage-track.md](../tracks/broadcast-patronage-track.md) (the shared `TwitchClient` is Phase-4 payment intake's seam)
- Precedents: [chat.md](../subsystems/chat.md), [messaging.md](../subsystems/messaging.md), [livestream.md](../subsystems/livestream.md), [belief.md](../subsystems/belief.md), [topics.md](../subsystems/topics.md)
- Auth: `services/auth/*`, [connection.md](../subsystems/connection.md), [auth-providers-slate.md](../slates/tails/auth-providers-slate.md)
