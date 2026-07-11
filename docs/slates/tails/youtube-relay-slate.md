# YouTube Live Chat Relay — Scope

> **Status (2026-07-02): YouTube READ shipped, OUTBOUND deferred.**
> Read-only YouTube chat shipped in the **unified stream-tuning build**
> (`feature/stream-tuning` → [streaming.md](../../subsystems/streaming.md)),
> which **superseded this slate's two locked decisions**: the surface is
> now **unified** (`watch`/`tune` over a `StreamerTarget`, not a parallel
> `Youtube*` mirror — only the *transport* stays per-platform), and v1 is
> **read-only, not full two-way**. Retained for the still-deferred
> **YouTube outbound** design below — `liveChatMessages.insert` + the
> **quota accountant / coalescing / drop policy** + per-player
> `youtube.force-ssl` OAuth + the `GoogleProfile` token extension +
> `google-reauth`. The "10% that is NOT a copy" (transport, live-only
> bind, quota) all still applies to the outbound cycle.

**Lineage:** Wave 3+ of
[external-chat-relay-slate.md](./external-chat-relay-slate.md); sequel
to the shipped Twitch relay (MR !101, `feature/twitch-relay-build`) and
the unified stream-tuning build.
**Sits on:** the Google OAuth spine (primary login) +
[livestream.md](../../subsystems/livestream.md) +
[streaming.md](../../subsystems/streaming.md) +
[broadcast-patronage-track.md](../../tracks/broadcast-patronage-track.md).

## Thesis

Add YouTube live chat as a **second, parallel relay surface** beside
Twitch — bidirectional from day one. The Twitch relay is the template;
YouTube is ~90% a structural copy of it. This doc is about the **10%
that cannot be copied**, because that's the whole engineering risk.

Two decisions are **locked** (asked + answered 2026-06-28):

- **Architecture = mirror as-built.** A self-contained `Youtube*`
  surface paralleling the Twitch one. **Twitch code is untouched.** We
  are *not* extracting a shared relay core this cycle (the slate's old
  `externalBinding` unification is explicitly deferred — revisit at a
  hypothetical third provider).
- **v1 scope = full two-way.** Inbound read **and** outbound write
  (`liveChatMessages.insert`) ship together. This pulls the **quota
  budget + coalescing/drop policy** and the **per-player write OAuth**
  into the first pass as load-bearing, not deferred.

## The parallel surface (the copyable 90%)

Each file mirrors its Twitch sibling almost verbatim. Inventory:

| Twitch (template) | YouTube (new) | Category |
|---|---|---|
| `backend/TwitchClient.ts` | `backend/YoutubeClient.ts` | Backend infra |
| `backend/TwitchRelayReader.ts` | `backend/YoutubeRelayReader.ts` | Backend infra |
| `mud/obj/TwitchRelay.ts` | `mud/obj/YoutubeRelay.ts` | Stuff (Idea) singleton |
| `mud/obj/api/TwitchLogic.ts` | `mud/obj/api/YoutubeLogic.ts` | Logic singleton |
| `mud/api/twitch.ts` | `mud/api/youtube.ts` | Api facade |
| `mud/obj/command/social/TwitchController.ts` | `…/YoutubeController.ts` | Controller |
| `mud/cmd/social/twitch.yaml` | `mud/cmd/social/youtube.yaml` | Verb YAML |
| `seeds/.../Topic/world.twitch.message.yaml` | `…/world.youtube.message.yaml` | Topic seed |
| `client/.../twitchTemplate.tsx` | `…/youtubeTemplate.tsx` | Client template |

Patterns inherited **as-is** (no redesign):

- **Presence-gating** — a channel's connection exists only while ≥1
  player is tuned in (0→1 opens, 1→0 closes; debounced; player-logout
  drop; `world.youtube.message` is subscription-gated).
- **Three-case identity bridge** — `RelaySpeaker` resolution
  (in-game egress mirror / external-unlinked / external-linked).
- **Echo-suppress** — tag `(senderId, text)` on outbound with a TTL;
  reader drops the matching inbound read-back.
- **History ring**, per-player + global **token-bucket** anti-spam,
  the `youtube list/tune/untune/history/who` + bare-post verb shape,
  the **reject-and-point** unscoped-post redirect.

## The 10% that is NOT a copy

### 1. Transport: per-chat streaming, not one multiplexed session

Twitch holds **one** EventSub WebSocket session and multiplexes N
channel subscriptions over it. `liveChatMessages.streamList` is a
**long-lived HTTP server-stream per `liveChatId`** — no multiplexing.

- `YoutubeClient` owns a `Map<liveChatId, StreamConnection>`, not a
  session + subscription-id map. Open = start a `streamList` stream;
  close = abort it. (`streamList` is the low-latency push path; if it
  proves unavailable in our quota tier, fall back to `list` polling at
  the server-returned `pollingIntervalMillis` — same `YoutubeClient`
  seam, costlier.)
- No `onSessionReset` reconnect-all dance; instead **per-stream**
  reconnect-with-backoff on drop (and re-resolve the liveChatId — see
  below — because a reconnect may straddle a stream restart).

### 2. Live-only binding + liveChatId resolution (the real new logic)

Twitch binds to a `login` persistently. **YouTube chat exists only
during an active broadcast**, addressed by an `activeLiveChatId` that
is **reborn with every stream**. So tuning is a resolution, not a
lookup:

```
tune(channel) →
  resolve channel handle/id →
  find its *currently live* broadcast →
  liveStreamingDetails.activeLiveChatId →
  open streamList on it
```

Decisions this forces (carry into requirements):

- **Tune-time bind.** `youtube tune <channel>` resolves the **current**
  live broadcast. **Not live → reject** ("that channel isn't streaming
  right now"). No persistent offline binding.
- **Stream-end teardown.** `streamList` closes when the broadcast ends.
  Reader detects close, **auto-untunes** the channel with a notice to
  tuned players ("the stream ended").
- **Stream-*start* while tuned** (re-bind to a new broadcast) is the
  expensive case — it needs polling the channel's live status, which
  costs quota. **v1: deferred.** Tuning is current-broadcast-only;
  catching a *new* stream means re-tuning. (A light background
  live-status poll is a Wave-2 nicety, quota permitting.)

### 3. Auth: grow `GoogleProfile`, do NOT mint `YoutubeProfile`

This is the one place "mirror Twitch" is the **wrong** instinct.
Twitch was a *new* provider, so it got a new `TwitchProfile`. **Google
is already the primary login** (`passport-google-oauth20`). Players and
the reader account already have `GoogleProfile`s. So:

- **Extend `GoogleProfile`** with the YouTube fields TwitchProfile
  carries: `scopes`, encrypted access/refresh tokens (it may already
  hold OAuth tokens — verify), `hasScope()`, `applyRefreshedToken()`.
- **Incremental-scope reauth** mirrors `twitch-reauth` but on Google:
  a `google-reauth` strategy + `/auth/google/reauth?scope=…` route,
  `force_verify`-equivalent (`prompt=consent&access_type=offline`).
- **Scopes:** reader needs `youtube.readonly` (or `youtube.force-ssl`);
  each posting player needs **`youtube.force-ssl`** (insert requires
  it — no API-key path for writes).
- Matches the auth-providers slate verbatim: *"YouTube … most likely
  grows `GoogleProfile` with token fields + YouTube scopes rather than
  minting a third profile."*

### 4. Quota budget + coalescing/drop (the new subsystem piece)

`liveChatMessages.insert` ≈ **50 units**; default ceiling **10,000
units/day**. That's ~200 posts/day naive — outbound is rate-bound from
day one. This is genuinely new design (Twitch had no quota meter):

- **A central daily quota accountant** in `YoutubeClient` (or
  `YoutubeRelay`): tracks units spent, resets on the API's daily
  boundary, **reserves headroom for reading**.
- **Coalescing.** Because cost is per-*insert* regardless of length,
  **batch queued outbound lines into one insert** within a short window
  (e.g. 1–2s) — multiple in-world lines → one YouTube post → one charge.
- **Drop/suppress policy** when budget runs low: graded degradation
  (e.g. below X% budget, relay only streamer/operator lines; below Y%,
  stop outbound entirely and tell the poster). Surfaced honestly to the
  poster, never silent.
- **All dials = `youtube.*` AppSettings** (the Twitch relay's
  `HISTORY_CAP`/TTL/bucket constants are hardcoded; do better here):
  `youtube.dailyQuotaUnits`, `youtube.insertCost`,
  `youtube.readReserveUnits`, `youtube.coalesceWindowMs`,
  `youtube.degradeThresholds`.

### 5. Shared-type touch (the one unavoidable edit outside the surface)

`@saxonberg/types` is the only shared code the mirror must touch:

- Widen `RelaySpeaker`'s `service` from the `'twitch'` literal to
  `'twitch' | 'youtube'` (currently a literal in two arms).
- Add `YoutubeMessagePayload` (or generalize to a `RelayMessagePayload`
  carrying `service`) + the `world.youtube` client template registration
  + `ConsoleFrame.youtube` extraction.
- Provenance render: `<youtube/>` glyph + plain-string speaker, exactly
  the honest-origin rule Twitch uses.

## Out of scope (explicit)

- **Patron intake.** YouTube memberships / Super Chat → fund-standing
  is **not** here. The patronage ledger is **Twitch-native only** by an
  earlier locked decision; YouTube monetization is a separate future
  payload-intake slate. Do not conflate Super Chat with in-world money.
- **Shared relay core / `externalBinding` unification** — deferred (see
  locked decision above).
- **Stream-start auto-rebind** while tuned — Wave 2.
- **Quota-increase audit** with Google (raising the 10k ceiling) — an
  ops task, not a build task; the budget layer must work *under* 10k.

## Risks / open questions for requirements

1. **Does `GoogleProfile` already store OAuth tokens?** If the primary
   login discards them post-auth, the reauth/token-refresh plumbing is
   bigger than a mirror. **Verify first** — this is the load-bearing
   unknown.
2. **`streamList` availability + true quota cost** in our project tier
   — confirm against the live quota calculator before committing the
   reader to it vs `list` polling.
3. **Reader account model** — one dedicated Google/YouTube account
   (its tokens in *its* `GoogleProfile`); confirm env shape
   (`YOUTUBE_READER_CHANNEL_ID` or reader account id) paralleling
   `TWITCH_READER_USER_ID`.
4. **Coalescing UX** — is a merged multi-line YouTube post acceptable
   in-world, or does it confuse the egress mirror? (Render decision.)

## Suggested internal phasing (one cycle, two-way)

- **P0 — seams:** widen `RelaySpeaker`/payload types; extend
  `GoogleProfile` (scopes/tokens/`hasScope`/`applyRefreshedToken`);
  `google-reauth` strategy + route; `youtube.*` AppSettings.
- **P1 — `YoutubeClient`:** `streamList` connection manager +
  channel→liveChatId resolution + per-stream reconnect.
- **P2 — inbound:** `YoutubeRelayReader` (presence-gate, live-only bind,
  stream-end teardown) + `YoutubeRelay` + `YoutubeLogic`/`YoutubeApi`
  `dispatchInbound` + topic + client template. **Reading works.**
- **P3 — outbound:** `insert` path + **quota accountant** + coalescing
  + drop policy + echo-suppress + per-player `force-ssl` gate &
  reject-and-point.
- **P4 — verb:** `youtube.yaml` + `YoutubeController`
  (list/tune/untune/history/who + bare post).
- **P5 — docs + tests:** `docs/subsystems/` relay doc (or extend the
  Twitch one into a shared "external chat relay" subsystem doc covering
  both); reader/relay/quota/auth tests mirroring the Twitch suite.
