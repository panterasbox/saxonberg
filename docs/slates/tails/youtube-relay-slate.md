# YouTube Live Chat Relay — Scope

> **Status: PARTIAL** — YouTube READ shipped in the unified stream-tuning
> build (2026-07-02) → [streaming.md](../../subsystems/streaming.md)
> **Left:** outbound `liveChatMessages.insert` · the quota accountant +
> coalescing and drop policy · per-player `youtube.force-ssl` OAuth · the
> `GoogleProfile` token extension + `google-reauth`
> **Size:** a wave

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

> Superseded by the code — neither locked decision below is what
> shipped: the surface unified onto `StreamApi`/`tune`/`watch` rather
> than mirroring a parallel `Youtube*` stack, and v1 shipped read-only,
> not full two-way. See the status block above and
> [streaming.md](../../subsystems/streaming.md).

## The parallel surface (the copyable 90%)

> Cut — SHIPPED, in a different shape than designed here. There is no
> `mud/api/youtube.ts` / `YoutubeLogic` / `YoutubeController` /
> `youtube.yaml` — `streaming.md` states outright: *"the surface is
> unified on `StreamApi`; only the transport is per-platform."* The
> real module layout is `streaming.md § Module layout`
> (`backend/YoutubeClient.ts` + `YoutubeRelayReader.ts` are the only
> YouTube-specific files; everything else routes through the shared
> `StreamApi`/`StreamLogic`/`StreamRelay`/`WatchController`/
> `TuneController`). The inherited patterns (presence-gating, the
> three-case identity bridge, echo-suppress, history ring, token-bucket,
> reject-and-point) shipped as designed — see `streaming.md §
> Presence-gating`, `§ The transports`.

## The 10% that is NOT a copy

> **1. Transport, and 2. Live-only binding + liveChatId resolution —
> cut, SHIPPED · DOCUMENTED.** Both landed as designed here: no
> multiplexed session, per-`liveChatId` reads via `YoutubeClient`
> (shipped on the `list`-poll path day one, `streamList` left as a
> later optimization rather than the primary path this slate assumed);
> tune-time live resolution, not-live reject, and stream-end
> auto-untune all shipped. See
> [streaming.md](../../subsystems/streaming.md) § The transports
> (YouTube) and § YouTube boundaries this cycle for the live reference,
> including the still-deferred stream-start-while-tuned rebind.

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

⭐ **Verified 2026-09-20: `GoogleProfile` today carries no OAuth token
fields at all** (`mud/lib/identity/GoogleProfile.ts` — no `scopes`,
access/refresh token, `hasScope()`, or `applyRefreshedToken()`; the
shipped YouTube reader auth is a separate env-based credential,
`YOUTUBE_READER_CLIENT_ID`/`_SECRET`/`_REFRESH_TOKEN`, not a
`GoogleProfile`-backed reader account). This closes the "verify" above
as **no** — the extension this section designs is real, unstarted work,
not a smaller top-up.

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

> **5. Shared-type touch — cut, SHIPPED · DOCUMENTED.**
> `RelaySpeaker.service` / `WatchTarget.platform` are widened to
> `'twitch' | 'youtube' | 'kick'` in `@saxonberg/types` and every
> consumer; the YouTube-red provenance glyph render shipped. See
> [streaming.md](../../subsystems/streaming.md) § Identity / rendering.

## Out of scope (explicit)

- **Capital intake.** YouTube memberships / Super Chat → fund-standing
  is **not** here. The capital ledger is **Twitch-native only** by an
  earlier locked decision; YouTube monetization is a separate future
  payload-intake slate. Do not conflate Super Chat with in-world money.
- **Shared relay core / `externalBinding` unification** — deferred (see
  locked decision above).
- **Stream-start auto-rebind** while tuned — Wave 2.
- **Quota-increase audit** with Google (raising the 10k ceiling) — an
  ops task, not a build task; the budget layer must work *under* 10k.

## Risks / open questions for requirements

1. Q1 (does `GoogleProfile` store OAuth tokens?) resolved above, § 3:
   **no** — verified against `GoogleProfile.ts` 2026-09-20.
2. Q2 (`streamList` vs `list`-poll) resolved: shipped on the
   `list`-poll path; `streamList` stays a later optimization behind
   the same `YoutubeClient` seam — see `streaming.md § The transports
   (YouTube)`.
3. Q3 (reader account model) resolved differently than guessed: the
   reader auth is **env-based**
   (`YOUTUBE_READER_CLIENT_ID`/`_SECRET`/`_REFRESH_TOKEN`,
   `backend/YoutubeClient.ts:142-144`), not a `GoogleProfile`-backed
   account — see `streaming.md § The transports (YouTube)`.
4. **Coalescing UX** — is a merged multi-line YouTube post acceptable
   in-world, or does it confuse the egress mirror? (Render decision.)
   Still open — outbound is unbuilt.

## Suggested internal phasing (one cycle, two-way)

> P0/P1/P2/P4/P5 below describe the mirror architecture (a
> self-contained `Youtube*` stack) that did not ship — cut,
> SHIPPED · DOCUMENTED / SUPERSEDED. The read path shipped unified on
> `StreamApi`/`StreamLogic`/`StreamRelay` + the shared `tune`/`watch`
> verbs (`streaming.md § Module layout`); docs landed as
> `streaming.md` itself. **P3 (outbound) remains — the only phase not
> built:**

- **P3 — outbound:** `insert` path + **quota accountant** + coalescing
  + drop policy + echo-suppress + per-player `force-ssl` gate &
  reject-and-point.
