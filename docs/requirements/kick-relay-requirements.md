# Kick relay — requirements

Add **Kick** as the third transport under the shipped unified streaming
surface ([streaming.md](../subsystems/streaming.md)): `watch` a Kick
stream in the cockpit and `tune` its chat into the console with full
parity to Twitch and YouTube, plus **Kick as a full auth provider** (a
`KickProfile` + co-equal login and link flows, the Twitch-provider
precedent — one unified provider interface, no link-only tier) so a
player can sign in with Kick, a character can be tuned by name, and an
external Kick speaker with a linked character renders with their
persona. The surface layer
(`watch`/`tune` verbs, `StreamerTarget`, the composite-keyed
`StreamRelay`, presence-gating, the `RelaySpeaker` identity bridge,
history/throttle) is **shared and already built** — this build adds the
per-platform transport and widens the platform vocabulary. The one
genuinely new architectural piece: Kick's official API delivers chat by
**inbound webhook** (signed HTTP POSTs to a public URL), not an
outbound connection — the first webhook receiver in the streaming
stack. Read-only v1; posting is a named phase 2.

Seeded by [kick-relay-slate.md](../slates/tails/kick-relay-slate.md)
(scope decision 2026-07-28). Rides
[streaming.md](../subsystems/streaming.md),
[twitch-relay.md](../subsystems/twitch-relay.md) (transport-tier
precedent), the multi-provider OAuth spine in `PassportConfig`
([connection.md](../subsystems/connection.md)), and
[livestream.md](../subsystems/livestream.md) (the overlay broadcast
feed).

## Goals

- **Watch parity.** `watch <kick-url|slug> [--kick]` sets a
  server-authoritative `cockpit.watch` `WatchTarget` of a new kick
  shape; the client renders the public Kick player
  (`player.kick.com/<slug>`) in the focal embed, same treatment as the
  Twitch player. A `kick.com/<slug>` URL carries its own platform; a
  bare slug needs `--kick` (or resolves through a character — below).
- **Tune parity (read-only).** `tune <target> --kick` (and the URL /
  character forms) binds a Kick channel into the shared relay: inbound
  chat lines arrive as relay frames in the console, `list`/`who`/
  `history` include Kick rows with zero changes (they are already
  platform-agnostic over the composite `channelKey`), presence-gating
  opens the transport on the 0→1 tuned-player edge and closes it on
  1→0, and `PlayerLoggedOut` drops ride the existing centralized
  `StreamLogic.dropPlayer`.
- **The webhook transport.** A `KickClient` + `KickRelayReader` pair in
  `backend/` (the `YoutubeClient`/`YoutubeRelayReader` shape) plus an
  inbound webhook receiver route: Kick `chat.message.sent` events are
  signature-verified, deduplicated, normalized, and handed to
  `StreamApi.dispatchInbound('kick', …)`. Event subscriptions are
  created/deleted per presence edge using the **app access token**
  (client-credentials) with an explicit `broadcaster_user_id`.
- **Kick as a co-equal auth provider.** `AuthProvider` widens to
  `'google' | 'twitch' | 'kick'`: a `KickProfile` identity Document +
  the full strategy pair — a `kick` **login** strategy (mints a session
  via the generic `findOrCreateUserFromProvider` path, `/auth/kick` +
  `/auth/kick/callback` routes, a start-screen provider entry) and a
  `kick-link` strategy (`/auth/kick/link` + unlink) — both on the
  generic `passport-oauth2` `OAuth2Strategy` with PKCE (the Twitch
  transcription), the `user:read` + `channel:read` scope set (identity
  + the owner-channel fetch). `hasAnyProvider` and the
  unlink only-provider invariant count all three providers. A linked
  Kick identity lights up: `tune <character>` character-form
  resolution to the linked Kick slug (today Twitch-only), and the
  `RelaySpeaker` **external-linked** case (honest-to-origin handle,
  linked persona on hover) for Kick speakers.
- **Overlay forwarding.** The owner's own Kick channel joins the
  broadcast-overlay sentinel set: `OVERLAY_KICK_CHANNEL` env, sibling
  of the two existing `OVERLAY_*` sentinels, forwarded to pbox-stream
  through the existing `RelayChatEnvelope` path.
- **Graceful dormancy.** With no Kick env configured, the transport is
  dormant (`isConfigured()`, the YouTube precedent): verbs
  reject-and-point, nothing errors, local dev needs no tunnel.

## Non-goals

- **Posting (phase 2).** `POST /public/v1/chat` with per-poster
  `chat:write` user tokens is deliberately out. The linking surface is
  shaped so phase 2 is an increment (a `kick-reauth` incremental-scope
  strategy, the `twitch-reauth` precedent, + send-then-mirror through
  the existing throttle/echo-suppress) — but no outbound code ships
  now. Kick posts reject-and-point like YouTube posts do today.
- **Patron intake / monetization.** Kick subs/tips → fund-standing is
  not here; the patronage ledger stays Twitch-native (earlier locked
  decision).
- **Moderation surface.** The `moderation:chat_message:manage` delete
  endpoint has no in-world consumer.
- **Posting-as-bot.** Kick's bot-token mode posts only to the app's
  own channel — useless for per-poster identity.
- **A quota accountant.** The YouTube quota machinery has no Kick
  analog — webhook delivery is push and unmetered; tune-time lookups
  are low-volume. Nothing to budget in a read-only build.

## Surface decisions

### Transport = the official webhook API (Pusher rejected)

Kick's official public API delivers chat via event subscriptions
pushed to a registered public HTTPS webhook. The unofficial Pusher
WebSocket Kick's own site uses (outbound, tunnel-free, no auth for
public chat) is rejected: unsanctioned, breakable without notice, and
the wrong foundation for an account-linking surface that already
requires a registered Kick developer app. The webhook receiver is the
accepted cost; the deploy topology (Caddy-terminated public HTTPS on
the live box) already supports it.

### Read path runs on the app token — the provider is not load-bearing for the relay

Confirmed against Kick's docs: an **app access token**
(client-credentials grant) may create `chat.message.sent`
subscriptions with an explicit `broadcaster_user_id` — no user token,
no `events:subscribe` user scope, no linked account required to read
any public channel's chat. Consequence: the relay works for players
with no Kick account at all; the `KickProfile` provider exists for
sign-in and the two identity features (character-form resolution +
linked-persona rendering) — not as transport plumbing. The
login/link-time scope set is therefore small (`user:read` +
`channel:read` — the latter because the token-owner `GET /channels`
fetch that captures the slug requires it).

### Signature verification (webhook security)

Per Kick's published scheme: each delivery carries
`Kick-Event-Signature` (Base64 RSA-PKCS1v15 signature),
`Kick-Event-Message-Id` (ULID, idempotency key),
`Kick-Event-Message-Timestamp` (RFC3339), and event type/version
headers. The receiver:

- reconstructs `messageId.timestamp.rawBody` (period-joined), hashes
  SHA256, and verifies RSA-PKCS1v15 against **Kick's public key**,
  fetched from `GET /public/v1/public-key` at first use and cached
  (re-fetch once on verification failure as the key-rotation hedge —
  rotation is undocumented);
- rejects deliveries whose timestamp falls outside a replay window
  (dial), and drops duplicate message ids via a TTL ring keyed on the
  ULID (webhooks are at-least-once);
- on any verification failure: drop + mudlog, never dispatch. The raw
  request body must be preserved for signing (route-local raw-body
  capture — body-parser JSON re-serialization is not byte-stable).

### Binding semantics: persistent, Twitch-style (no live-only bind)

The YouTube divergence (live-only bind, stream-end auto-untune) does
not apply: Kick channels are addressed by durable slug/broadcaster-id
(no per-broadcast chat id), the `player.kick.com` embed renders an
offline channel gracefully (offline card), and Kick chatrooms exist
independent of live status. So `watch` and `tune` bind persistently
with **no liveness check** and no auto-untune — messages flow when the
channel is active, exactly the Twitch model.

### Subscription lifecycle rides the presence gate

Create the subscription on the relay's 0→1 tuned-player edge, delete
on 1→0 (`DELETE /public/v1/events/subscriptions` takes subscription
ids, so the reader keeps a `broadcasterId → subscriptionId` map).
Kick's limits (10,000 subscriptions per event type; 1,000
`chat.message.sent` for unverified apps) are orders of magnitude above
presence-gated usage. No documented create/delete rate limits; if
throttling surfaces in practice, the fallback (hold subscriptions
long-lived, gate *dispatch* on presence) is a contained reader-local
change — not designed now.

### The provider = `KickProfile`, transcribed from the Twitch pair

Kick is a **new provider** (not an existing login), so this is the
TwitchProfile case, not the grow-`GoogleProfile` case — and it enters
as a **co-equal login provider, not a link-only tier** (one unified
provider interface; if an identity can link, it can log in):
`AuthProvider` widens to include `'kick'`, a `KickProfile` Document in
`mud/lib/identity/` (provider user id, slug/display name, scopes,
encrypted tokens, `hasScope()`, `applyRefreshedToken()`), and the full
strategy pair in `PassportConfig` — a `kick` **login** strategy
(verify → `handleProviderAuth('kick', …)`, the already-generic
`findOrCreateUserFromProvider` path) plus a `kick-link` strategy —
both on the same generic `passport-oauth2` `OAuth2Strategy` the Twitch
strategies use — endpoints `https://id.kick.com/oauth/authorize` /
`https://id.kick.com/oauth/token`, PKCE S256 mandatory (the one
mechanical delta from the Twitch transcription; `passport-oauth2`
supports it natively). Routes: `/auth/kick` + `/auth/kick/callback`
(login) and `/auth/kick/link` + unlink, following the Twitch route
shapes; the start screen's data-shaped provider list gains the Kick
entry. `hasAnyProvider` and the unlink only-provider invariant count
all three providers. Refresh-token rotation handled as TwitchProfile
does. (The `kick-reauth` incremental-scope strategy is the phase-2
posting seam, not built now.)

### Local dev: transport-dormant, no tunnel required

`KickRelayReader.isConfigured()` gates on the env set
(`KICK_CLIENT_ID`/`KICK_CLIENT_SECRET` + the webhook base URL);
unconfigured → dormant reader, reject-and-point verbs, zero errors.
The signature verifier and receiver route are unit-tested with
synthetic keypair-signed payloads, so the transport logic is fully
testable without a tunnel; a tunnel recipe is a README nicety, not
build scope.

### Client surface: one embed case + one color

`WatchTarget` gains `{ platform: "kick"; channel: string }`;
`StreamEmbed.iframeFor` gains the `player.kick.com/<slug>` case
(autoplay/muted parity with the Twitch player). The relay console
template is already service-parameterized — `SERVICE_COLOR` gains a
kick entry (Kick green) and the clickable-chip `tune <handle> --kick`
preview falls out. A `world.kick.message` Topic seed joins its two
siblings (subscription-gated delivery, the same pattern).

## Constraints

- **Module taxonomy.** `KickClient` / `KickRelayReader` live in
  `backend/` (the Api→backend direct-import bridge, the
  `ConnectionLogic`→`ConnectionManager` pattern — no DI port, no new
  events); the webhook receiver registers with the other backend
  routes **before the SPA catch-all**. No new Api/Logic pair —
  `StreamApi`/`StreamLogic` absorb the kick branches (`resolveTarget`,
  `dropPlayer`, `dispatchInbound`). `KickProfile` in
  `mud/lib/identity/`. No new module categories.
- **Platform unions widen; no parallel surface.** `Platform`
  (`StreamerTarget`), `Service` (`StreamRelay`), `WatchTarget` +
  `RelaySpeaker.service` (`@saxonberg/types`) each gain `'kick'`. No
  `Kick*` verb, no `KickRelay` singleton — the unified surface is the
  whole point (the retired per-platform `twitch`/`youtube` verbs are
  the antipattern).
- **`StreamerTarget.parse` stays pure and total** — the kick URL/opt
  branches do no network/DB work; slug resolution lives on
  `StreamLogic.resolveTarget` via `KickClient`.
- **Dials are AppSettings, not hardcoded** (`kick.*`: replay-window
  seconds, dedup-ring TTL/size, resolution-cache TTL — the youtube
  slate's explicit do-better rule).
- **Secrets hygiene.** `KICK_CLIENT_SECRET` and all tokens never
  appear in logs/output (the `GITLAB_PUSH_TOKEN` sanitization
  precedent); `KickProfile` tokens encrypted at rest like
  TwitchProfile's. New env goes through the SSM deploy-time
  materialization documented in
  [deployment.md](../deployment.md).
- **External speakers have no Stuff actor** — inbound dispatch goes
  through the existing `dispatchInbound`/`sendMessage` chokepoint
  ([streaming.md](../subsystems/streaming.md)); no actor is minted for
  a Kick chatter.
- **The webhook route trusts nothing unverified.** Signature
  verification precedes all parsing/dispatch; the route has no session
  and must not touch auth middleware state.

## Acceptance criteria

- **Parse tests:** `StreamerTarget.parse` covers `kick.com/<slug>`
  URLs (scheme-less, `www.`, trailing query), bare slug + `--kick`,
  the `--kick`/`--twitch`/`--youtube` conflict rejections, and the
  character form falling through unchanged.
- **Verifier tests:** the signature verifier accepts a
  synthetic-keypair-signed payload and rejects: bad signature, altered
  body, stale timestamp, and a replayed message id (dedup ring).
- **Reader tests:** with an injected fake client (`forTest`
  precedent), the 0→1 edge creates a subscription, 1→0 deletes it (id
  map exercised), `dropPlayer` unsubscribes, and inbound normalized
  events reach `dispatchInbound('kick', …)`.
- **Client tests:** `StreamEmbed` renders `player.kick.com` for the
  kick `WatchTarget`; the relay template renders a kick line with the
  kick service color and `tune <handle> --kick` chip preview.
- **Provider observable:** `/auth/kick` login round-trip mints a
  session and a User (via `findOrCreateUserFromProvider('kick', …)`,
  covered like the Twitch login tests); the start screen lists Kick;
  `/auth/kick/link` round-trip creates a `KickProfile` bound to the
  User; unlink removes it (and a kick-only user gets the
  only-provider refusal, all three FKs counted); `tune <character>`
  resolves through the linked profile; a Kick chat line from a linked
  external speaker renders the linked-persona case.
- **Relay observable:** `watch`/`tune`/`untune`/`list`/`who`/
  `history` all work against a kick channel end-to-end (manual, live
  box); overlay forwarding pushes the `OVERLAY_KICK_CHANNEL` sentinel
  channel's lines to the broadcast feed.
- **Dormancy:** with no Kick env, boot is clean, verbs
  reject-and-point, no reader/route errors.
- **Docs:** [streaming.md](../subsystems/streaming.md) gains the Kick
  transport section (webhook shape, app-token subscriptions,
  persistent binding, linking); [deployment.md](../deployment.md)
  gains the env + webhook-URL registration note; the slate updates to
  shipped-status at the sweep.
- **Posting untouched:** no outbound Kick path exists; a Kick-directed
  post reject-and-points naming the phase-2 deferral.

## Cross-references

- Seeding slate: [kick-relay-slate.md](../slates/tails/kick-relay-slate.md)
- Subsystem docs: [streaming.md](../subsystems/streaming.md),
  [twitch-relay.md](../subsystems/twitch-relay.md),
  [connection.md](../subsystems/connection.md),
  [livestream.md](../subsystems/livestream.md),
  [app-settings.md](../subsystems/app-settings.md),
  [deployment.md](../deployment.md)
- Siblings: [youtube-relay-slate.md](../slates/tails/youtube-relay-slate.md)
  (the deferred YouTube outbound is unrelated to this build),
  [external-chat-relay-slate.md](../slates/tails/external-chat-relay-slate.md)
- External: Kick docs — webhook security (`/public/v1/public-key`,
  RSA-PKCS1v15 over `id.timestamp.body`), events subscriptions
  (`/public/v1/events/subscriptions`, app-token +
  `broadcaster_user_id`, 1,000-sub unverified cap), OAuth 2.1
  (`id.kick.com/oauth/*`, PKCE S256), chat send
  (`POST /public/v1/chat`, `chat:write` — phase 2)
