# Stream tuning — requirements

A unified, platform-agnostic surface for *tuning into a livestream* — any
live broadcast on Twitch or YouTube — and consuming it inside the cockpit:
**watch** its video in the focal embed, **follow** its chat in the
aggregated chat pane, and (Twitch this cycle) **post** to that chat under
your own linked identity. The streamer is specified by an argument string
(a URL, a handle plus a platform opt, or an in-game character), resolved
lazily into a runtime `StreamerTarget` value — **nothing is persisted.**

This build unifies three surfaces that today are decoupled and
platform-specific:

- the **Twitch chat relay** (`twitch` verb + `world.twitch.message`) —
  shipped ([twitch-relay.md](../subsystems/twitch-relay.md));
- the **livestream-viewer video embed** — an operator-curated
  `livestream.broadcastSources` AppSetting picker
  ([cockpit-layouts.md](../subsystems/cockpit-layouts.md));
- **YouTube chat** — never built (deferred in
  [youtube-relay-slate.md](../slates/tails/youtube-relay-slate.md)).

It **supersedes** the youtube-relay slate's locked "mirror-as-built, keep
the surfaces separate, do not extract a shared core" decision: the
**player-facing surface is unified**; only the backend *transports* stay
per-platform (their protocols genuinely differ). It also **narrows** that
slate's "full two-way v1" to **read-only YouTube chat** this cycle.

It also **extends the overlay/broadcast substrate** in one direction: the
**overlay owner** (a single privileged broadcaster account) can push their
**own** active stream's chat — Twitch **and** YouTube, unified — onto the
broadcast overlay while live. The owner's authorization and verbs
(`requiresStreamer`/`streamers`, `STREAMER_PLAYER_IDS`, `stream
away`/`back`, the global `StreamState` singleton; see
[livestream.md](../subsystems/livestream.md)) are **unchanged**; what's new
is a chat frame type on the `BroadcastFeed`. The overlay's *render* half
lives in the sibling `pbox-stream` repo, so this build delivers the
**server-side wire contract** (the envelope + the forwarding), not the
overlay UI.

## Goals

- **One tuning surface for both platforms.** A player consumes any live
  Twitch or YouTube stream through the same two verbs, with platform an
  option — never a hardcoded list of streamers anywhere.
- **`watch` — the focal video (cardinality 1).** `watch <target>` puts a
  stream in the focal embed; a second `watch` swaps it. The server
  resolves the embed target and holds it as **server-authoritative
  per-viewer state** (`cockpit.watch`), then pushes it to the client,
  which renders the platform's public-player iframe. Most forms resolve
  with **no external call** (Twitch handle, YouTube URL / videoId / `UC…`
  channelId) — so watching works immediately even when the chat relay is
  unconfigured. A YouTube **`@handle`** additionally resolves via a cheap
  `channels.list?forHandle` lookup (reusing the YouTube reader credential,
  memoized) so the grammar is symmetric with Twitch's bare handle. Both
  Twitch and YouTube players render for real. (Nothing here is
  "client-owned": the client mirrors server state, per the cockpit's
  client-owns-zero-command-semantics law.)
- **`tune` — chat follow (cardinality N).** `tune <target>` follows a
  streamer's chat into the aggregated chat pane; many at once, interleaved
  with per-line provenance. `tune <target> <message>` posts (Twitch,
  linked account). `tune off <target>` stops; bare `tune` lists tunes +
  live status.
- **`StreamerTarget` is a first-class runtime type, not a stored row.**
  Resolved lazily from the argument string, held in memory for the
  session, evaporates on logout/reboot — matching the relay's existing
  memory-resident, lazy philosophy. No registry collection.
- **Tri-modal target grammar, platform via opt.** A target is a URL
  (platform self-evident), a bare handle plus `--twitch`/`--youtube`, or
  an in-game character/MQL seed resolved through their linked profile. No
  `platform:handle` prefixed strings (that smuggles an opt into the arg).
- **YouTube chat, read-only.** Reading a currently-live YouTube channel's
  chat into the same aggregated pane, via a single operator-configured
  reader account. Live-only bind; auto-teardown when the stream ends.
- **Linking is derived, never manual.** A streamer who is a Saxonberg user
  is already linked by having authed (their `TwitchProfile.login` *is* the
  link). A reverse handle→`User` lookup lights the existing
  `external-linked` `RelaySpeaker` (persona-on-hover) for Twitch. No link
  verb, no new mapping storage.
- **`broadcastSources` retired.** The operator-curated video list, its
  AppSetting, Api, envelope, event, boot push, and welcome-snapshot field
  are removed. The embed is per-viewer, driven by `watch`.
- **The `twitch`/`youtube` verbs retired.** Platform now rides in the
  target/opt; the everyday path is `tune`/`watch`. The Twitch relay's
  machinery is retargeted behind the unified surface.
- **Overlay chat — the owner's own chat on the broadcast feed.** The
  overlay owner's own active-stream chat (Twitch + YouTube, unified and
  provenance-tagged) is forwarded to the `service:broadcast` overlay while
  live, as a new envelope on the existing `BroadcastFeed`. The owner's
  external channels are env config (like the reader account); the read is
  overlay-presence-gated; the render lives in `pbox-stream`.

## Non-goals

- **YouTube outbound (posting).** Read-only this cycle. Posting needs
  per-player Google OAuth with `youtube.force-ssl`, the
  `GoogleProfile`-token extension + a `google-reauth` strategy, the
  `liveChatMessages.insert` path, and the **quota accountant + coalescing
  + drop policy**. All deferred; the CLI reserves the shape so it's not a
  retrofit. (youtube-relay-slate §P3, §4.)
- **Character → YouTube resolution.** `GoogleProfile` stores no YouTube
  channel id and no tokens, so a character cannot resolve to a YouTube
  channel. `tune <character> --youtube` rejects-and-points ("specify a
  YouTube handle or URL"). Lands when `GoogleProfile` grows the channel
  field, with YouTube outbound. Character resolution **works for Twitch**
  this cycle.
- **The outbound platform-action family** — `follow` / `sub` /
  `cheer <bits>` / `gift`, and all monetization (Twitch donos/bits/gift
  subs, YouTube Super Chat/memberships). Grammar is sketched under the
  same target; none is built. Patron intake remains a separate,
  Twitch-native track ([patron intake]; broadcast-patronage-track.md).
- **Go-live notifications & follow-groups.** "Notify me when a streamer I
  follow goes live" and tuning a whole group at once are deferred. Twitch
  `stream.online` EventSub is cheap; YouTube go-live needs quota-costed
  polling. A later cycle over the social-graph notify layer.
- **Persisted tunes / streamer discoverability.** Explicitly rejected —
  the platforms own discovery; we assume the player already knows who they
  want and can name them. Nothing about who-tuned-whom is stored.
- **Multi-streamer overlay scoping.** One hardcoded overlay owner remains;
  multiple platform-managed streamers with per-stream overlay scope is out
  — the global single-feed `StreamState`/`BroadcastFeed` is *not* refactored
  to be per-overlay ([livestream.md](../subsystems/livestream.md)).
- **The overlay *render*.** The client that draws the owner's chat on the
  stream overlay lives in the sibling `pbox-stream` repo; this build ships
  only the server wire contract (envelope + forwarding) and documents it.
- **YouTube stream-start auto-rebind while tuned.** Catching a *new*
  broadcast on an already-tuned channel needs a quota-costed live-status
  poll; deferred (youtube-relay-slate §2, Wave 2). Tuning binds the
  current broadcast only; a new stream means re-tuning.

## Surface decisions

### The verb split: `watch` (single) vs `tune` (multi)

Two top-level verbs, not one verb with subcommands, because the
cardinalities are a genuine semantic difference, not a syntactic one:
video is a single focal embed (`watch`), chat is an unbounded aggregated
feed (`tune`). `watch <target>` **implies** `tune <target>` (watching a
stream pulls its chat in — the thing you actually want); `tune` alone
follows chat without claiming the focal pane. Both live in the existing
`mud/cmd/stream/` category alongside the overlay-owner `stream` verb.

### Target grammar — opt, not prefix

`StreamerTarget` resolution accepts three argument forms:

1. **URL** — `watch twitch.tv/shroud`, `watch youtu.be/…`,
   `watch youtube.com/@handle`, `…/watch?v=…`. Platform + identifier
   parsed from the URL; a conflicting `--platform` opt is an error.
2. **Bare handle + platform opt** — `watch shroud --twitch`,
   `tune mkbhd --youtube`. `--twitch` / `--youtube` are mutually
   exclusive boolean opts. A bare handle with no opt and no character
   match is ambiguous → reject-and-point ("add --twitch or --youtube").
   A Twitch handle resolves with no external call; a YouTube `@handle`
   resolves via `channels.list?forHandle` → channelId (D4=(c), reusing the
   YouTube reader credential, memoized), embedded as `live_stream?channel=`;
   a raw `UC…` channelId skips the lookup. So bare-handle grammar is
   symmetric across platforms — but YouTube `@handle` needs the reader
   configured (URL/videoId watching does not).
3. **In-game character / MQL** — `tune alice`, `tune @alice`. Resolves
   through the character's `Avatar → User → TwitchProfile.login`. If the
   character has linked both platforms, the opt disambiguates; YouTube via
   character is deferred (non-goal), so `--youtube` on a character
   rejects.

No `platform:handle` prefixed strings. The resolved target carries
`{ platform, channelId/login, character? }`.

### `StreamerTarget` is a runtime value, not a persisted entity

The earlier "first-class Streamer reference" decision resolves to a
first-class **type** (a `lib/`-homed value-object + resolver), not a Mongo
row. It is held in the in-memory relay state for the session's lifetime
and reconstructed lazily on the next `tune`/`watch`. This preserves the
Twitch relay's "no registry collection, evaporates on reboot" property.

### Video embed is per-viewer, driven by `watch`

The focal embed source becomes **per-viewer session state** (a
`clientState`/envelope channel carrying the watched `StreamerTarget`),
replacing the global operator `broadcastSources`. `watch <target>` sets
it; `watch off` clears it; the embed is empty until the viewer watches
something. Rendering reuses the sandboxed-iframe `StreamEmbed` (Twitch
`player.twitch.tv?parent=<hostname>`, YouTube `youtube.com/embed/<id>`,
both already wired). The multi-source **picker is removed** — there is one
watched stream, chosen by the verb.

### Unify the surface, keep transports per-platform

The **player-facing surface is platform-agnostic and single-code-path**:
the verbs, the target grammar, the `RelaySpeaker` union, the aggregated
chat pane, `list`/`who`/`history`. The **backend transports stay
per-platform** because the protocols differ — Twitch multiplexes N channel
subscriptions over **one** EventSub session; YouTube holds a **long-lived
stream per `liveChatId`** with no multiplexing (youtube-relay-slate §1).
This revises the slate's "no shared core" lock: there *is* a shared surface
now; how much relay *state* is unified vs. two singletons behind the Api is
the planner's call, provided the controller/Api paths are
platform-agnostic.

### YouTube read auth — single reader account, no auth-spine change

Reading YouTube live chat requires OAuth (`youtube.readonly`); an API key
is insufficient for `liveChatMessages`. Because **posting is deferred**, no
*per-player* Google tokens are needed. A **single operator reader account**
supplies the read credential — its refresh token + client id/secret via
env (`YOUTUBE_READER_*`, paralleling `TWITCH_READER_USER_ID`), refreshed
inside the backend `YoutubeClient`. **`GoogleProfile` is not touched**, and
the `google-reauth` strategy + per-player scope acquisition are deferred
with outbound. Until the reader is configured, `tune … --youtube` returns
"YouTube chat relay isn't configured" (the Twitch precedent).

### YouTube live-only bind + teardown

YouTube chat exists only during an active broadcast. `tune <yt-target>`
resolves the channel → its currently-live broadcast →
`liveStreamingDetails.activeLiveChatId` → opens the read stream. **Not
live → reject** ("that channel isn't streaming right now"). Stream ends →
the reader detects the close and **auto-untunes** with a notice to tuned
players ("the stream ended"). No persistent offline binding.

### Identity bridge widened to YouTube; persona for Twitch only

`RelaySpeaker`'s `service` widens from `'twitch'` to `'twitch' | 'youtube'`
in both arms, plus a `world.youtube.message` payload/topic. Twitch lines
from a linked streamer render `external-linked` (handle default,
persona-on-hover via reverse `login → User`). YouTube lines are
`external`-only (no channel stored → no reverse link this cycle). Rendering
stays honest-to-origin: a `<youtube/>` provenance glyph mirrors
`<twitch/>`; message text is escaped plain text, never MML.

### Overlay chat — owner's own chat, both platforms, env-configured

The overlay owner's own external channels are **env config alongside
`BROADCAST_TOKEN`/`STREAMER_PLAYER_IDS`** — `OVERLAY_TWITCH_LOGIN` and
`OVERLAY_YOUTUBE_CHANNEL` (names indicative). This keeps the single-owner
model (no per-user channel storage, no `GoogleProfile` extension) and no
per-overlay `StreamState` refactor — the one global feed serves the one
owner.

- **Read is overlay-presence-gated.** While ≥1 `service:broadcast`
  connection is open, the relay reads the owner's configured channels via
  the same reader accounts used for viewer tuning (0→1 opens, 1→0 closes),
  independent of any player's `tune` state. YouTube naturally yields chat
  only while the owner is live; the read binds the owner's current live
  broadcast and re-resolves it on reconnect (and, acceptable because it's a
  **single** channel, a light live-status poll to catch a stream restart —
  the divergence from the deferred *N-channel* viewer auto-rebind non-goal).
- **Forwarded via a new `BroadcastFeed` envelope.** The owner's channel
  chat reaches the broadcast principal as a new relay-chat envelope
  (unified across platforms, `service`-tagged, honest-to-origin), filtered
  to the configured overlay channels — **not** every relayed channel. The
  relay stays backend-free (pure mudlib), so the seam is the event bus:
  the relay emits a relay-message event and the backend `BroadcastFeed`
  subscribes and forwards (mirroring how it already consumes
  `StreamStateChanged`/reaction-delta events). Exact seam is the planner's
  call; the mud/backend boundary is the constraint.
- **Render is out of this repo.** The `pbox-stream` overlay consumes the
  new envelope; this build ships the wire type + the server forwarding +
  the `@saxonberg/types` contract, and documents it for `pbox-stream`.

## Constraints

- **Reuse the `MessageApi.sendMessage` chokepoint** for relay frames —
  external speakers have no `Stuff` actor, so `MessageApi.scene` (which
  requires one) is not usable; the relay hand-builds the frame. Frames are
  subscription-gated (their own topic), not implant-gated.
  ([messaging.md](../subsystems/messaging.md), twitch-relay.md.)
- **Module taxonomy** (CLAUDE.md): backend transport = `backend/` infra
  (`YoutubeClient`, `YoutubeRelayReader`, mirroring the Twitch pair);
  in-memory state = `obj/` Idea singleton; gated logic = `obj/api/*Logic`
  forwarded by a thin `api/*.ts` facade; verbs = YAML view +
  `obj/command/stream/` controller. The `StreamerTarget` value-object +
  resolver is a named value-object in `lib/` (its own subsystem folder,
  e.g. `lib/streaming/`) — **not** a free-floating helper. No new module
  category.
- **Api derives the actor from execution context** — the posting player is
  `getActingAuthor`/`commandGiver`, never a parameter (spoofable). The
  Api→backend bridge pattern (`TwitchLogic` imports `TwitchRelayReader`
  directly) is the sanctioned dependency direction; deep `lib/`/non-api
  `obj/` stay backend-free. (twitch-relay.md, gated-api-actor-from-context.)
- **Video embed safety** — the Twitch iframe `parent` is
  `window.location.hostname` (correct-by-construction, never hard-coded);
  both iframes stay sandboxed. (cockpit-layouts.md.)
- **Retirement must be clean** — no dangling references to
  `broadcastSources`, `StreamSourceApi`, `StreamSourcesEnvelope`,
  `StreamSourcesChanged`, the `twitch`/`youtube` verbs, or the embed
  picker. Grep-clean is an acceptance check.
- **Presence-gating preserved** — a channel's backend connection exists
  only while ≥1 player is tuned (0→1 opens, 1→0 closes; debounced;
  `PlayerLoggedOut` drops). YouTube reader streams close per-`liveChatId`.
- **No hardcoded streamer list** anywhere except the single overlay-owner
  account (which is a separate, existing concern).
- **YouTube dials are AppSettings** (`youtube.*`), not hardcoded constants
  — history cap, reconnect backoff, poll interval. (The Twitch relay's
  hardcoded constants are grandfathered; new YouTube code does better.)
- **The overlay stays one token / one feed / one owner.** The
  `service:broadcast` principal, `BROADCAST_TOKEN`, and the single global
  `BroadcastFeed`/`StreamState` are preserved — no per-overlay or
  per-streamer keying (that's the deferred multi-streamer non-goal). The
  relay's mud-purity (no backend import; forward to the feed only via the
  event bus) is a hard boundary. (livestream.md.)

## Acceptance criteria

- `watch <url>` and `watch <handle> --twitch|--youtube` set the focal
  embed to a live Twitch/YouTube stream; a second `watch` swaps it;
  `watch off` clears it. No wizard config, no reader account, no scopes
  required for `watch`. Both platforms render a real player.
- `tune <handle> --twitch` reads that channel's chat into the aggregated
  pane (parity with the retired `twitch tune`); `tune <handle> --twitch
  <message>` posts under the player's linked identity; unlinked/unscoped →
  reject-and-point.
- `tune <channel> --youtube` (or a YouTube URL) on a **currently-live**
  channel reads its live chat into the same aggregated pane; a non-live
  channel rejects; ending the stream auto-untunes with a notice.
  **Posting to YouTube is absent/rejected** (read-only).
- `tune alice` resolves a Twitch-linked character to their login and tunes
  their Twitch chat; `tune alice --youtube` rejects-and-points (deferred).
- Bare `tune` lists current tunes with live status; `tune off <target>`
  and `watch off` work; `list`/`who`/`history` behave platform-agnostically.
- A Twitch line from a linked streamer shows external handle with
  persona-on-hover; a YouTube line shows the external handle only; both
  carry a platform provenance glyph and escaped-plain text.
- `StreamerTarget` parsing is unit-tested across all three forms (URL,
  handle+opt, character), including the ambiguous-bare-handle rejection
  and the URL/opt-conflict rejection.
- YouTube `liveChatId` resolution, live-only reject, and stream-end
  teardown are tested (against a mocked `YoutubeClient`).
- `broadcastSources` and the `twitch`/`youtube` verbs are removed;
  grep-clean of the retired identifiers; the embed picker is gone.
- `RelaySpeaker.service` and the relay payloads are `'twitch' | 'youtube'`
  in `@saxonberg/types`; the client renders both topics.
- With a `service:broadcast` overlay connected and the owner live, the
  owner's own Twitch **and** YouTube chat appear on the `BroadcastFeed` as
  the new unified relay-chat envelope, provenance-tagged per platform,
  filtered to the `OVERLAY_*`-configured channels (a viewer tuning some
  *other* channel does not leak onto the overlay feed). The owner's channel
  read is gated on overlay presence, and re-resolves on reconnect / stream
  restart. Tested against mocked readers + a fake broadcast socket.
- The `@saxonberg/types` relay-chat overlay envelope is defined and
  documented for the `pbox-stream` consumer; the mud-purity boundary
  (relay → feed only via the event bus) holds (no backend import in the
  relay singleton).
- A unified subsystem doc exists (`docs/subsystems/streaming.md` — the
  `tune`/`watch` surface, target grammar, both transports, the
  read-only-YouTube boundary, **and the overlay-chat forwarding**), the
  Twitch-relay content folds into it, `cockpit-layouts.md` is updated for
  the watch-driven embed + `broadcastSources` retirement, and
  `livestream.md` gains the overlay relay-chat envelope.

## Cross-references

- **Seeding slates** —
  [youtube-relay-slate.md](../slates/tails/youtube-relay-slate.md)
  (superseded on unification + narrowed to read-only),
  [external-chat-relay-slate.md](../slates/tails/external-chat-relay-slate.md)
  (retained for the YouTube live-only + resolution mechanics).
- **Subsystem docs** —
  [twitch-relay.md](../subsystems/twitch-relay.md) (the relay this
  retargets), [cockpit-layouts.md](../subsystems/cockpit-layouts.md) (the
  embed + retired `broadcastSources`),
  [livestream.md](../subsystems/livestream.md) (the overlay-owner substrate
  + `BroadcastFeed` this extends with a chat envelope; overlay *render*
  lives in the sibling `pbox-stream` repo),
  [connection.md](../subsystems/connection.md) (the OAuth spine
  + `TwitchProfile`/`GoogleProfile`),
  [messaging.md](../subsystems/messaging.md) (the `sendMessage`
  chokepoint), [belief.md](../subsystems/belief.md) (the persona the
  external-linked speaker reveals).
- **Tracks** —
  [broadcast-patronage-track.md](../tracks/broadcast-patronage-track.md)
  (the go-live/patron-intake work this feeds).
