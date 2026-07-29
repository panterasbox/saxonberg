# Kick Stream Relay — Scope

> **Status (2026-07-28): design captured, not built.** The third
> transport under the shipped **unified streaming surface**
> ([streaming.md](../../subsystems/streaming.md)) — Kick joins Twitch
> (two-way) and YouTube (read-only) behind `watch`/`tune`. The primary
> goal is **tune-in parity**: pull up a Kick stream in the cockpit and
> read its chat, exactly like the other two platforms. **Account
> linking is in scope from day one** (it lights up `tune <character>`
> resolution + the `RelaySpeaker` linked-persona case); **posting is a
> deliberately-cheap phase 2** — a small increment once linking exists,
> shippable whenever, skippable indefinitely.

**Lineage:** sibling of
[youtube-relay-slate.md](./youtube-relay-slate.md) (and Wave N of
[external-chat-relay-slate.md](./external-chat-relay-slate.md)); the
first platform added *after* the unification, so unlike the YouTube
build it inherits the shared surface instead of mirroring a parallel
one.
**Sits on:** [streaming.md](../../subsystems/streaming.md) +
[twitch-relay.md](../../subsystems/twitch-relay.md) (transport
specifics) + the `PassportConfig` multi-provider OAuth spine
([connection.md](../../subsystems/connection.md), the
`twitch`/`twitch-link`/`twitch-reauth` strategy trio) +
[livestream.md](../../subsystems/livestream.md).

## Thesis

The streaming build already paid for platform-agnosticism: the verbs,
the relay table, the resolver, `list`/`who`/`history`, presence-gating,
the identity bridge, and the throttle are all shared — **"transports
stay per-platform"** is the only rule. Kick therefore slots in as a
third transport, not a refactor. The `watch` half is nearly free (Kick
has the simplest embed of the three); the chat-relay half is the real
work; and it carries **one genuinely new architectural wrinkle** — the
official Kick API delivers chat by **inbound webhook**, not an
outbound connection.

## The inherited surface (the copyable 90%)

Nothing here is new design — inventory of the seams that widen:

| Seam | Change |
|---|---|
| `lib/streaming/StreamerTarget.ts` — `Platform` union | + `'kick'`; `parse` gains a `kick.com/<slug>` URL branch + a `--kick` opt. Slugs only — no `classifyKickRef` (Kick has none of YouTube's three ref kinds). Pure, unit-tested. |
| `obj/StreamRelay.ts` — `Service` union | + `'kick'`; the table is already composite-keyed (`channelKey(service, key)`) — zero structural change. |
| `obj/api/StreamLogic.ts` — `resolveTarget` | + a kick branch (slug → broadcaster id via `KickClient`); `dropPlayer` unsubscribes the third reader. |
| `@saxonberg/types` — `WatchTarget` | + `{ platform: "kick"; channel: string }`; widen `RelaySpeaker.service`. |
| `client/components/embed/StreamEmbed.tsx` | + one iframe case: `https://player.kick.com/<channel>` (public player, Twitch-shape). |
| `backend/BroadcastFeed.ts` — overlay forwarding | + `OVERLAY_KICK_CHANNEL` sentinel (sibling of the two existing `OVERLAY_*` envs). |
| Patterns inherited as-is | presence-gating (0→1 subscribe / 1→0 unsubscribe, `PlayerLoggedOut` drop centralized in `StreamLogic.dropPlayer`), three-case `RelaySpeaker`, echo-suppress, history ring, token-bucket throttle, reject-and-point. |

## The parts that are NOT a copy

### 1. Inbound webhooks — the new transport shape

Twitch is an **outbound** EventSub WebSocket (one multiplexed session);
YouTube is **outbound** per-`liveChatId` reads. Kick's official public
API delivers chat as **event subscriptions pushed to a public HTTPS
webhook** (`chat.message.sent`), so `KickRelayReader` needs a partner
the other transports don't have: **an inbound Express route** in
`backend/` — the first webhook receiver in the streaming stack.

- **Receiver route** (`backend/`, the `HelpRoutes`/`CmsRoutes`
  registration precedent): verify the Kick signature against their
  published public key, normalize, hand to
  `StreamApi.dispatchInbound('kick', …)`. Unverifiable payload →
  drop + mudlog, never dispatch.
- **Subscription lifecycle rides the existing presence gate**: 0→1
  tuned players → create the `chat.message.sent` subscription for that
  broadcaster; 1→0 → delete it. Same edges `StreamLogic` already
  drives for the other readers.
- **Deploy topology is ready** — the live box terminates TLS behind
  Caddy at a public hostname; the route just needs a path (and the
  webhook URL configured in the Kick developer app).
- **Local dev is the cost**: webhooks can't reach localhost, so dev
  needs a tunnel (or the reader simply stays dormant when
  unconfigured, like the YouTube reader's `isConfigured()` gate —
  acceptable, since the relay is untestable-locally only at the
  transport layer; everything above `dispatchInbound` unit-tests as
  usual).
- **Rejected alternative:** the unofficial Pusher WebSocket Kick's own
  site uses (outbound, no tunnel, no auth for public chat). Tempting
  shape, unsanctioned and breakable — build on the official API.

### 2. Account linking — `KickProfile`, the TwitchProfile precedent

Kick is a **new provider** (not an existing login), so this is the
TwitchProfile case, *not* the grow-`GoogleProfile` case:

- **`KickProfile`** identity Document
  (`mud/lib/identity/KickProfile.ts`), mirroring `TwitchProfile`:
  provider user id, slug/display name, scopes, encrypted tokens,
  `hasScope()`, `applyRefreshedToken()`.
- **`kick-link` strategy** in `PassportConfig` + `/auth/kick/link`
  routes. No platform passport package needed — the Twitch strategies
  are already built on the generic `passport-oauth2` `OAuth2Strategy`,
  and Kick's OAuth 2.1 + PKCE is natively supported by it. Mostly
  transcription.
- **Full login provider, not link-only** — Kick joins
  `google`/`twitch` as a co-equal `AuthProvider`: a `kick` login
  strategy + `/auth/kick` routes + a start-screen entry, alongside
  `kick-link`. One unified provider interface — if an identity can
  link, it can log in; no link-only carve-out.
- Linking is what lights up: `tune <character>` character-form
  resolution for Kick (today only Twitch resolves; YouTube rejects
  `character-youtube`), and the `RelaySpeaker` **external-linked**
  hover-persona case.

### 3. Rate limits — reads are free, writes are throttled anyway

The scoping question this slate answers explicitly:

- **Reading has zero rate-limit exposure.** Webhook delivery is push —
  no polling budget, no quota meter (the YouTube accountant has no
  Kick analog). The only metered calls are low-volume tune-time
  lookups (slug → broadcaster id, live status).
- **Posting** (`POST /public/v1/chat`, scope `chat:write`, per-poster
  user token, `broadcaster_user_id` addressing): Kick publishes no
  specific chat-send limits — the API 429s and expects backoff. The
  relay's existing outbound token-bucket throttle is inherited for
  free, and relay volume is trivial next to native Kick chat. Low
  risk — but still phase 2, because it needs nothing from phase 1
  except the linking that's already in scope.

## Scope decision (2026-07-28)

- **Phase 1 (the goal):** platform vocabulary + `watch` embed +
  read-only relay via webhooks + `kick-link` account linking with
  `KickProfile`. Character-form `tune` works; posting rejects-and-
  points (the YouTube precedent).
- **Phase 2 (cheap, whenever):** posting — acquire `chat:write` via a
  `kick-reauth`-style incremental-scope upgrade (the `twitch-reauth`
  machinery precedent), send-then-mirror through the existing
  throttle + echo-suppress. Hours, not days, once phase 1 exists.

Phase 1 sizing: about the YouTube half of the streaming build
(~500–700 server lines + one client case + tests), plus the webhook
receiver + the linking transcription. Build-day scale, not slate-arc
scale.

## Out of scope (explicit)

- **Patron intake / monetization.** Kick subs/tips → fund-standing is
  not here (the patronage ledger is Twitch-native by the earlier
  locked decision).
- **Moderation surface** (`moderation:chat_message:manage` delete
  endpoint) — nothing in-world consumes it.
- **Posting-as-bot** (Kick's bot-token mode posts to the app's own
  channel only) — useless for the relay's per-poster identity model.

## Open questions for requirements

1. **Webhook signature scheme details** — confirm the header set +
   public-key rotation story against current Kick docs before
   committing the verifier.
2. **Subscription lifecycle cost** — confirm create/delete per
   presence edge is cheap and unthrottled; if subscriptions are
   better held long-lived, gate dispatch (not subscription) on
   presence instead.
3. **Live-status semantics** — does `watch` need a liveness check at
   tune time (YouTube's live-only bind) or does the embed handle
   offline channels gracefully (Twitch-style persistent bind)?
   Expected: Twitch-style — `player.kick.com` embeds an offline
   channel fine.
4. **Dev-tunnel stance** — document a tunnel recipe, or accept
   transport-dormant local dev (`isConfigured()` gate)?

## Suggested internal phasing (phase 1)

- **P0 — seams:** widen `Platform`/`Service`/`WatchTarget`/
  `RelaySpeaker`; `StreamerTarget.parse` kick branch + `--kick` opt
  (+ tests); `kick.*` AppSettings; `KICK_CLIENT_ID`/`KICK_CLIENT_SECRET`
  env.
- **P1 — provider:** `KickProfile` + the `kick` login strategy +
  `kick-link` + routes + the start-screen entry.
- **P2 — `KickClient`:** app-token OAuth, slug→broadcaster resolve,
  subscription create/delete, signature verification helper.
- **P3 — inbound:** the webhook receiver route + `KickRelayReader`
  (presence-gated subscribe/unsubscribe, normalize →
  `dispatchInbound('kick', …)`); `StreamLogic` resolve + drop
  branches; `OVERLAY_KICK_CHANNEL`.
- **P4 — client + docs:** `StreamEmbed` kick case (+ test);
  streaming.md gains the Kick transport section; deployment.md notes
  the webhook URL + env.
