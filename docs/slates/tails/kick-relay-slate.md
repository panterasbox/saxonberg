# Kick Stream Relay — Scope

> **Status: PARTIAL** — wave 1 shipped 2026-07-28 (MR !152): webhook
> transport, `watch` embed, Kick as a full login+link provider, overlay
> forwarding, dormancy → [streaming.md](../../subsystems/streaming.md)
> **Left:** phase-2 posting (`kick-reauth` + `chat:write` through the
> existing throttle/echo-suppress) · boot-time webhook-subscription
> reconciliation · `kick.com/video/…` URL forms
> **Size:** a tail

> **Status (2026-07-28): SHIPPED** (`feature/kick-relay`, MR !152) →
> [streaming.md](../../subsystems/streaming.md) § the Kick transport +
> [connection.md](../../subsystems/connection.md) (the third co-equal
> auth provider) are the live reference. Everything below landed as
> designed — the webhook transport, the `watch` embed, Kick as a full
> login+link provider (`user:read` + `channel:read`), overlay
> forwarding, graceful dormancy — with one addition beyond the slate:
> unconfigured providers now guard-and-redirect and the start screen
> disables their buttons (a latent Twitch hole fixed alongside). This
> slate is **retained as the tail** for the deferred surface: **phase-2
> posting** (`kick-reauth` + `chat:write` through the existing
> throttle/echo-suppress), boot-time webhook-subscription
> reconciliation, and `kick.com/video/…` URL forms.

**Lineage:** sibling of
[youtube-relay-slate.md](./youtube-relay-slate.md) (and Wave N of the
retired external-chat-relay-slate, absorbed into youtube-relay-slate.md —
see
[cluster-relays.md](../../plans/slate-compaction/cluster-relays.md));
the first platform added *after* the unification, so unlike the YouTube
build it inherits the shared surface instead of mirroring a parallel
one.
**Sits on:** [streaming.md](../../subsystems/streaming.md) +
[twitch-relay.md](../../subsystems/twitch-relay.md) (transport
specifics) + the `PassportConfig` multi-provider OAuth spine
([connection.md](../../subsystems/connection.md), the
`twitch`/`twitch-link`/`twitch-reauth` strategy trio) +
[livestream.md](../../subsystems/livestream.md).

## Thesis

> Cut — SHIPPED · DOCUMENTED, landed as designed. See
> [streaming.md](../../subsystems/streaming.md) § Kick (read-only, the
> webhook transport) for the live reference: the inbound-webhook
> transport shape (the "one genuinely new architectural wrinkle" this
> thesis names) is exactly what shipped.

## The inherited surface (the copyable 90%)

> Cut — SHIPPED · DOCUMENTED. Every seam in the inventory table widened
> as designed (`StreamerTarget.Platform` +`'kick'`, `StreamRelay.Service`
> +`'kick'`, `StreamLogic.resolveTarget`/`dropPlayer`, `WatchTarget` +
> `RelaySpeaker.service`, `StreamEmbed`'s Kick iframe case,
> `OVERLAY_KICK_CHANNEL`), and the inherited patterns (presence-gating,
> the identity bridge, echo-suppress, history ring, token-bucket,
> reject-and-point) shipped unchanged. See `streaming.md § Module
> layout`, `§ Presence-gating`, `§ The transports`.

## The parts that are NOT a copy

### 1. Inbound webhooks — the new transport shape

> Cut — SHIPPED · DOCUMENTED. The receiver route, presence-gated
> subscription lifecycle, deploy topology, dormant-local-dev stance, and
> the rejected-Pusher-alternative call are all live and stated near-
> verbatim in `streaming.md § Kick (read-only, the webhook transport)`
> (`KickWebhookRoutes`, `KickWebhookVerifier`, `KickRelayReader`). The
> one open thread it names — a crashed process can orphan a Kick-side
> subscription, "a boot-time reconciliation sweep is a named deferred
> seam" (`backend/KickRelayReader.ts:21`) — is carried forward
> unchanged in `streaming.md`'s own Deferred/non-goals list, and in this
> slate's `Left`.

### 2. Account linking — `KickProfile`, the TwitchProfile precedent

> Cut — SHIPPED · DOCUMENTED, in [connection.md](../../subsystems/connection.md)
> (outside this batch's write list, already covers it): `KickProfile`
> as an identity Document with cached OAuth credentials, the
> `kick`/`kick-link` strategies on the generic `passport-oauth2`
> `OAuth2Strategy`, and Kick as a full co-equal `AuthProvider` alongside
> `google`/`twitch`.

(Character-form `tune` resolution for Kick and the `RelaySpeaker`
external-linked hover-persona case — both shipped, both what "linking
lights up" — are `streaming.md § The target grammar` and
`§ Identity / rendering`.)

### 3. Rate limits — reads are free, writes are throttled anyway

> **Reading — cut, SHIPPED · DOCUMENTED.** Zero rate-limit exposure
> (webhook delivery is push, no polling budget, no Kick quota meter) is
> stated as shipped in `streaming.md § Kick`.

- **Posting** (`POST /public/v1/chat`, scope `chat:write`, per-poster
  user token, `broadcaster_user_id` addressing): Kick publishes no
  specific chat-send limits — the API 429s and expects backoff. The
  relay's existing outbound token-bucket throttle is inherited for
  free, and relay volume is trivial next to native Kick chat. Low
  risk — but still phase 2, because it needs nothing from phase 1
  except the linking that's already in scope.

## Scope decision (2026-07-28)

> Phase 1 — cut, SHIPPED (see the status block above). Phase 2 remains:

- **Phase 2 (cheap, whenever):** posting — acquire `chat:write` via a
  `kick-reauth`-style incremental-scope upgrade (the `twitch-reauth`
  machinery precedent), send-then-mirror through the existing
  throttle + echo-suppress. Hours, not days, once phase 1 exists.

## Out of scope (explicit)

- **Patron intake / monetization.** Kick subs/tips → fund-standing is
  not here (the patronage ledger is Twitch-native by the earlier
  locked decision).
- **Moderation surface** (`moderation:chat_message:manage` delete
  endpoint) — nothing in-world consumes it.
- **Posting-as-bot** (Kick's bot-token mode posts to the app's own
  channel only) — useless for the relay's per-poster identity model.

## Open questions for requirements

> All four resolved by what shipped — cut, SHIPPED · DOCUMENTED:
> Q1 (signature scheme) → `streaming.md § Kick` (RSA-PKCS1v15/SHA256,
> public-key fetch + one retry-and-refetch on rotation); Q2
> (subscription lifecycle) → shipped as create-on-0→1/delete-on-1→0 per
> presence edge, not long-lived; Q3 (live-status semantics) → shipped
> Twitch-style, exactly the "expected" guess (persistent bind, no
> live-only check, offline channels embed fine); Q4 (dev-tunnel stance)
> → shipped transport-dormant, no tunnel needed. See `streaming.md §
> Kick (read-only, the webhook transport)` for all four.

## Suggested internal phasing (phase 1)

> Cut — all of phase 1 (P0–P4) SHIPPED as designed; see the status
> block above and `streaming.md`'s History section for the build
> sequence that landed it.
