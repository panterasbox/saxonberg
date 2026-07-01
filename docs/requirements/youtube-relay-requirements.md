# YouTube Live Chat Relay — requirements

Bridge YouTube live chat into the world as a **second, parallel relay
surface** beside the shipped Twitch relay — bidirectional from day one.
A tuned-in player reads a YouTube broadcaster's live chat as in-world
messages and can post back to that chat as themselves. The Twitch relay
(`feature/twitch-relay-build`, MR !101) is the structural template;
this build copies that surface wholesale into `Youtube*` siblings and
solves the handful of places YouTube's API genuinely differs —
per-chat streaming, live-only binding, Google-OAuth token storage, and
a hard daily quota. Seeded by
[youtube-relay-slate.md](../slates/tails/youtube-relay-slate.md)
(Wave 3 of
[external-chat-relay-slate.md](../slates/tails/external-chat-relay-slate.md)).

## Goals

- **Inbound:** a player can `youtube tune <channel>` and receive that
  channel's currently-live chat as `world.youtube.message` frames,
  presence-gated (the upstream connection exists only while ≥1 player
  is tuned in).
- **Outbound:** a player who has granted the write scope can post into a
  tuned YouTube chat from in-world, appearing in YouTube as their own
  linked Google identity, with the post mirrored back into the world
  (egress) and echo-suppressed on read-back.
- **Identity:** inbound YouTube authors resolve through the existing
  three-case `RelaySpeaker` bridge (in-game egress mirror /
  external-unlinked / external-linked), honest-to-origin rendering with
  a `<youtube/>` provenance glyph.
- **Auth:** YouTube API credentials (read + write scopes, refreshable
  tokens) are stored on the **existing `GoogleProfile`**, acquired
  through an **incremental opt-in reauth path** that leaves the primary
  Google login untouched.
- **Quota safety:** outbound never silently overruns YouTube's daily
  quota; a budget accountant reserves read headroom, coalesces queued
  posts, and degrades gracefully with an honest notice to the poster.
- **Twitch untouched:** no behavioral change to the shipped Twitch
  relay; the only shared-code edit is widening the relay wire types in
  `@saxonberg/types`.

## Non-goals

- **Shared relay core / `externalBinding` unification.** We are *not*
  extracting a transport-agnostic relay abstraction this cycle. Twitch
  and YouTube remain parallel surfaces. (Deferred — revisit at a
  hypothetical third provider; see the external-chat-relay slate.)
- **Patron intake from YouTube.** Memberships / Super Chat → fund-stake
  is **out**. The patronage ledger is Twitch-native by an earlier
  locked decision
  ([broadcast-patronage-track.md](../tracks/broadcast-patronage-track.md));
  YouTube monetization is a separate future payload-intake slate. Do
  not conflate Super Chat with in-world money.
- **Stream-start auto-rebind while tuned.** Catching a *new* broadcast
  on a channel you're already tuned to requires quota-costly live-status
  polling — deferred. v1 binds to the broadcast that is live *at tune
  time* only.
- **Quota-ceiling increase audit.** Raising YouTube's 10k-units/day cap
  with Google is an ops task. The budget layer must work correctly
  *under* the default ceiling.
- **Offline / persistent channel binding.** YouTube live chat has no
  existence outside an active broadcast; there is nothing to bind to
  when the channel is dark.

## Surface decisions

### Architecture: parallel mirror, Twitch untouched

A self-contained `Youtube*` surface paralleling the Twitch relay
file-for-file. `YoutubeClient` / `YoutubeRelayReader` (backend),
`YoutubeRelay` (Idea singleton) / `YoutubeLogic` (logic singleton) /
`YoutubeApi` (facade) / `YoutubeController` + `youtube.yaml` /
`world.youtube.message` topic seed / `youtubeTemplate.tsx` (client).
Inherited as-is from Twitch: presence-gating (debounced 0→1/1→0 +
player-logout drop), three-case identity bridge, echo-suppress (TTL),
history ring, per-player + global token-bucket anti-spam, the
`list/tune/untune/history/who` + bare-post verb shape, and the
reject-and-point unscoped-post redirect.

### Auth: extend `GoogleProfile`, leave the base login untouched

`GoogleProfile` is currently a bare identity store (`google_profiles`:
`googleId/email/displayName/givenName/familyName/photoUrl/rawProfile`);
the primary login requests `['profile','email']`, no offline access, and
**discards** OAuth tokens in its verify callback. Therefore:

- **Grow `GoogleProfile`** with `accessToken` / `refreshToken`
  (encrypted via `EncryptedStringMarshaller`, mirroring `TwitchProfile`)
  / `expiresAt` / `scopes`, plus `hasScope()` and `applyRefreshedToken()`
  — the exact `TwitchProfile` shape, applied to the existing doc. These
  fields stay null/empty for any user who never opts into the relay.
- **The base `/auth/google` login is NOT modified.** It stays
  identity-only (`['profile','email']`, no `access_type:offline`). The
  primary login is shared by every user; changing its scope/consent
  would drag all existing players through a fresh consent screen and
  hoard YouTube tokens for people who never use the relay.
- **A new incremental opt-in path** — `google-reauth` Passport strategy
  + `/auth/google/reauth?scope=…` route — requests
  `access_type:'offline'` + `prompt:'consent'` and the YouTube scopes,
  writing tokens + scopes back to the player's `GoogleProfile`. This
  mirrors `twitch-reauth` exactly (incremental scope assembly,
  reject-and-point on missing write scope).
- **Scopes:** the reader account needs `youtube.readonly` (or
  `youtube.force-ssl`); each posting player needs **`youtube.force-ssl`**
  (`liveChatMessages.insert` has no API-key path).
- **Token refresh:** a Google token-refresh path mirroring the Twitch
  relay's (refresh against Google's token endpoint, persist via
  `applyRefreshedToken`).

This is the one place "mirror Twitch" is the *wrong* instinct at the
data layer (Twitch was a new provider → new profile; Google is the
existing primary provider → grow it) but the *right* instinct at the
flow layer (the login/reauth split is identical).

### Reader transport: `streamList` primary, `list`-polling fallback

`YoutubeClient` owns a `Map<liveChatId, StreamConnection>` (one
long-lived HTTP server-stream per live chat — no multiplexed session,
unlike Twitch's single EventSub socket). v1 is built **stream-first** on
`liveChatMessages.streamList`; if the streaming method proves
unavailable in our quota/project tier, the client falls back to
`liveChatMessages.list` polling at the server-returned
`pollingIntervalMillis` through the same client seam. Per-stream
reconnect-with-backoff on drop (re-resolving the liveChatId, since a
reconnect may straddle a stream restart).

### Live-only binding: resolve at tune-time, tear down at stream-end

`youtube tune <channel>` resolves channel → its *currently live*
broadcast → `liveStreamingDetails.activeLiveChatId` → opens the reader
stream. **Not live → reject** with a clear message. When the broadcast
ends the stream closes; the reader detects close, **auto-untunes** the
channel, and notifies tuned players. Re-binding to a subsequent
broadcast means re-tuning (auto-rebind is a non-goal).

### Outbound coalescing: batch queued lines into one `insert`

Because `insert` costs ~50 units regardless of body length, outbound
lines queued within a short window (a `youtube.*` setting, default
~1.5s) are **merged into a single `insert`**. The egress mirror echoes
the merged post. This is the accepted UX cost of the quota model.

### Degraded mode: mechanism + settings, policy not pinned

A daily quota accountant tracks units spent, reserves headroom for
reads, and exposes a **graded-degradation hook** that throttles/suppresses
outbound as budget runs low, always with an honest notice to the poster
(never a silent drop). The *thresholds* and *whose-lines-survive* order
are `youtube.*` AppSettings, **not** pinned behavior — they are operator
dials. The requirement is that the mechanism and settings exist and the
budget is never silently overrun.

### AppSettings, not hardcoded constants

Unlike the Twitch relay (whose `HISTORY_CAP` / echo-TTL / bucket
constants are hardcoded), all YouTube dials are `youtube.*` AppSettings:
at minimum `youtube.dailyQuotaUnits`, `youtube.insertCost`,
`youtube.readReserveUnits`, `youtube.coalesceWindowMs`,
`youtube.degradeThresholds`, plus the relay's history/TTL/bucket dials.

## Constraints

- **Module taxonomy.** Every new file lands in the fixed category set
  (backend infra / Stuff / mixin / logic singleton / Api facade /
  controller / YAML / client). No new module categories, no
  free-floating helpers — fold utilities into the Api/logic/Stuff that
  owns them. `YoutubeApi` ends with `SecurityApi.decorateApiClass`;
  `YoutubeLogic` is `@internal`, gated
  `FromModule('/api/youtube#YoutubeApi')`.
- **Backend ↔ mudlib seam.** `mud/` may not import `backend/`. Outbound
  posting reaches `YoutubeClient` exactly as Twitch does: the
  `@internal` `YoutubeLogic` calls down to `YoutubeRelayReader.send()`
  (the sanctioned internal-logic-class backend import). No new DI port
  is introduced.
- **Gated actor from context.** Outbound never accepts a spoofable
  actor parameter; the posting principal derives from execution context
  (the command frame's giver), per the gated-Api rule.
- **Tokens encrypted at rest.** `accessToken` / `refreshToken` on
  `GoogleProfile` use `EncryptedStringMarshaller` (the `TwitchProfile`
  precedent). No plaintext credentials in `google_profiles`.
- **Honest provenance.** Inbound YouTube messages render with a
  `<youtube/>` glyph and a plain-string speaker for unlinked authors —
  the in-game frame is a *mirror* of external chat, never a unification.
  No synthetic Stuff for external speakers.
- **Presence cost ceiling.** No upstream connection (stream or poll loop)
  may exist for a channel with zero tuned players. Connection lifecycle
  is strictly presence-gated and debounced.
- **Budget correctness under 10k.** The quota accountant must keep total
  daily units (reads + writes) under the configured ceiling without
  assuming a quota-increase grant.
- **Shared-type edit is the only Twitch-adjacent change.** Widening
  `RelaySpeaker.service` to `'twitch' | 'youtube'` and adding the
  YouTube payload must not alter Twitch runtime behavior.

## Acceptance criteria

- **Inbound, presence-gated:** tuning to a live channel opens exactly
  one reader stream; untuning / last-player-logout closes it; a channel
  with zero tuned players holds no connection. Covered by tests
  mirroring `TwitchRelay.test.ts` / `TwitchClient.test.ts`.
- **Live-only binding:** tuning a non-live channel is rejected with a
  clear message; a broadcast ending auto-untunes tuned players with a
  notice. Tested.
- **Outbound two-way:** a player with `youtube.force-ssl` posts to a
  tuned chat; the message reaches YouTube via `insert`, mirrors back as
  egress, and the read-back is echo-suppressed. A player without the
  scope is rejected-and-pointed to the reauth path. Tested.
- **Coalescing:** multiple outbound lines within the coalesce window
  produce a single `insert` (verified by a mocked client counting
  inserts); the window is a `youtube.*` setting.
- **Quota budget:** the accountant reserves read headroom and never lets
  total daily units exceed `youtube.dailyQuotaUnits`; degraded mode
  fires below threshold and notifies the poster. Tested against a mocked
  budget.
- **Auth, base login untouched:** `GoogleProfile` gains encrypted
  token + scope fields, `hasScope()`, `applyRefreshedToken()`; the
  `google-reauth` route grants `access_type:offline` + YouTube scopes
  and persists them; `/auth/google` is byte-unchanged in scope/params.
  Reauth flow tested (mirroring `twitch-reauth.test.ts`).
- **Identity bridge:** inbound authors resolve to the correct
  `RelaySpeaker` case (unlinked / linked / egress); rendering shows the
  `<youtube/>` glyph and the right speaker. Tested.
- **Twitch unaffected:** the Twitch relay test suite passes unchanged;
  the only diff to shared code is the `RelaySpeaker` union widening +
  the new YouTube payload.
- **Subsystem doc exists:** either a new `docs/subsystems/` relay doc
  for YouTube, or the Twitch relay doc generalized into a shared
  "external chat relay" subsystem doc covering both surfaces.
- **All dials are settings:** no new hardcoded relay constants; the
  `youtube.*` AppSettings keys exist and are read at runtime.

## Cross-references

- **Seeding slate:**
  [youtube-relay-slate.md](../slates/tails/youtube-relay-slate.md)
- **Parent slate:**
  [external-chat-relay-slate.md](../slates/tails/external-chat-relay-slate.md)
  (Wave-3 deferral of YouTube, the `service`-field anticipation)
- **Auth spine:**
  [auth-providers-slate.md](../slates/tails/auth-providers-slate.md)
  ("YouTube grows `GoogleProfile`")
- **Surrounding subsystems:**
  [livestream.md](../subsystems/livestream.md),
  [messaging.md](../subsystems/messaging.md),
  [topics.md](../subsystems/topics.md),
  [app-settings.md](../subsystems/app-settings.md)
- **Track context:**
  [broadcast-patronage-track.md](../tracks/broadcast-patronage-track.md)
  (patron intake is Twitch-native; YouTube monetization out of scope)
- **Template (as-built):** the Twitch relay on
  `feature/twitch-relay-build` (MR !101) — `TwitchClient`,
  `TwitchRelayReader`, `TwitchRelay`, `TwitchLogic`, `twitch.ts`,
  `TwitchController`, `twitch.yaml`, `world.twitch.message`,
  `TwitchProfile`, the `twitch-reauth` flow.
