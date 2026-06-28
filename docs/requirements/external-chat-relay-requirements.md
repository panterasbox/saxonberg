# Twitch relay (two-way, multi-channel) — requirements

A dedicated, two-way Twitch chat relay: in-game players tune into one or
more curated Twitch channels, **read** their chat in the cockpit, and
**post** to them as their own linked Twitch identity. It is a **first-
class surface of its own** — its own type, store, verb, and message topic
— *not* a `Channel` with a binding facet. Built on a **factored Twitch
integration client** (EventSub + Helix + token) that the coming
payment-intake build (track Phase 4) reuses next push.

It delivers **Phases 2 and 6** of the
[Broadcast & Patronage track](../tracks/broadcast-patronage-track.md)
(inbound + outbound), on the shipped auth-providers keystone (Phase 1).

> **Auth reality (verified against the shipped code).** Phase 1 hardcodes
> the Twitch OAuth scope to identity-only (`['user:read:email']`) and ships
> **no** way to request expanded scopes on demand — the incremental-scope
> re-consent flow was explicitly deferred. Because this build does
> outbound (which needs each player's `user:write:chat`) **and** inbound
> (which needs the reader account's `user:read:chat`), it **builds that
> incremental-scope acquisition flow from scratch** as in-scope work. What
> Phase 1 *does* provide and this build reuses: `TwitchProfile.scopes`
> storage and `applyRefreshedToken` write-back.

> **Deviation from the slate (recorded).** The
> [external-chat-relay-slate](../slates/tails/external-chat-relay-slate.md)
> models an external channel as *"a `Channel` with a binding facet,
> reusing the chat verb wholesale."* This build **deviates**: the Twitch
> relay is a **separate surface**, because Twitch chat is semantically an
> OOC/meta spectator layer, not an in-world frequency, and folding it into
> `Channel` would (a) scatter a strategic integration across an unrelated
> subsystem and (b) force the native chat path to carry external-special-
> case logic forever. A future in-game-chat **bridge** (fan a relay's
> inbound stream into a `Channel` for players who want them merged) is a
> deliberately-anticipated seam — *support both later* — not built here.

## Goals

### The Twitch integration client (shared plumbing)
- A `backend/` Twitch integration client encapsulates the EventSub
  websocket session (welcome → `session_id` → subscription create →
  keepalive → reconnect), Helix REST calls, and token acquisition from
  `TwitchProfile` (auto-decrypted, refresh write-back). It is
  **service-internal infrastructure** with the chat relay as its first
  consumer and **Phase-4 payment intake as the designed-for second** (a
  different EventSub subscription type over the same session/token
  plumbing). No generic multi-vendor abstraction — it is a *Twitch*
  client.

### The relayed-channel registry (multi-channel)
- A `TwitchChannel`-style record (own collection) describes each curated
  relayed channel (`broadcasterId`, `broadcasterLogin`, display label).
  **Multiple** may be relayed simultaneously; the set is admin-curated
  content, seeded from config (the `channels.yaml` / `ChannelSeeder`
  pattern), not a player affordance.

### Inbound (Twitch → game)
- A `backend/` reader worker maintains a **set** of EventSub
  `channel.chat.message` subscriptions — one per relayed channel that has
  ≥1 tuned-in in-game listener. Each subscription is **presence-gated and
  edge-triggered independently** (connect on that channel's 0→1, tear down
  on 1→0, debounced).
- Inbound messages are normalized and delivered to that channel's
  tuned-in in-game subscribers on the relay's **own topic**
  (`world.twitch.message`), reusing the lone `MessageApi.sendMessage`
  delivery primitive. They land in a per-channel history ring
  (`twitch history <channel>`).

### Outbound (game → Twitch)
- `twitch <channel> <msg>` sends to that channel via the stateless Helix
  **Send Chat Message** call under the player's own linked token
  (`sender_id` = the player's Twitch user id — "post as yourself").
- An unlinked player, or one lacking `user:write:chat`, gets a
  **reject-and-point** that triggers the auth keystone's incremental-scope
  re-consent. Unlinked players may still **read** a tuned channel; they
  cannot post.
- A **successful** send mirrors the post into the relay surface; an
  unsuccessful one does not. The reader's echo of the player's own message
  is suppressed.
- Outbound carries a **per-player throttle + global send queue**.

### The identity bridge (both directions)
- The relay frame's `speaker` is a **three-case discriminated union**:
  native in-game (`StuffRef`); external-unlinked (Twitch handle only);
  external-linked (carries *both* the Twitch handle and a `StuffRef` to
  the linked Avatar). Inbound resolution: sender Twitch user id →
  `User.find({ twitchProfileId })` → Avatar (cached).
- Rendering is **honest-to-origin** by default (inbound shows the Twitch
  handle + `<twitch/>` glyph; outbound mirror shows the player's MUD
  identity + `⊳twitch` egress marker), with the *complementary* linked
  identity surfaced on **mouseover / expand**. Never a silent relabel.

### Incremental Twitch scope acquisition (built here)
- A **scope-parameterized re-authorization** capability: an authenticated
  route that re-runs Twitch OAuth for an already-linked user requesting an
  **expanded** scope set, and writes the broadened token + scopes back to
  that user's existing `TwitchProfile` (via `applyRefreshedToken`) — no
  new profile, no collision. A `TwitchProfile.hasScope(scope)` helper
  reports whether a profile already holds a scope.
- **One mechanism, two uses:** the relay-reader account grants
  `user:read:chat` through it once (admin/self-serve), and a player grants
  `user:write:chat` through it on the outbound reject-and-point. The
  re-consent forces a fresh consent prompt so the user sees the new
  permission.

### The verb + cockpit surface
- A **single `twitch` verb** does everything via subcommands +
  bare-post fallthrough: `twitch list` (relayed channels, live + tuned
  status), `twitch tune <channel>` / `untune <channel>`, `twitch
  <channel> <message>` (post), `twitch history <channel>`, `twitch who
  <channel>`. Channels are addressed by `broadcasterLogin` (or label).
- The relay is **subscription-gated, not implant-gated** (a meta/OOC
  surface — no in-world AetherImplant required); its own topic lets the
  cockpit pane it distinctly from in-world chat.

## Non-goals

- **Modeling the relay as a `Channel`.** No `externalBinding` field on
  `Channel`; no reuse of the `chat` verb. (Explicit per the deviation
  note.)
- **The in-game-chat bridge.** Fanning a relay's inbound stream into a
  native `Channel` (so the two merge) is an anticipated seam — the inbound
  normalization stays decoupled from delivery so a bridge can consume it
  later — but **not built** this wave.
- **YouTube or any second service.** The integration client is Twitch-
  specific; a second service is a later, separate effort.
- **Anon-IRC transport.** EventSub is the read transport.
- **Emote translation / Twitch emote image rendering.** Twitch emote codes
  pass through as **text**; no mapping onto the Soul/Emote system (a
  category error). Inline emote images are deferred client polish.
- **Deep-merge identity.** A linked Twitch utterance is never silently
  relabeled as a native in-character post.
- **Recognition-driven name substitution** on relay frames (origin-honest
  default + hover-reveal only; viewer-belief-driven name swap is a noted
  seam).
- **Reactions / renown on inbound relay frames** (no in-world command
  context; outbound *mirror* posts are ordinary acts and remain
  reactable).
- **Player-created relays.** The relayed-channel set is admin-curated.
- **Persistent relay history** beyond the in-memory ring.

## Surface decisions

### Separate surface, shared delivery primitive

The relay is its own subsystem (`TwitchChannel` record, per-player tuning
store, `TwitchApi`/`TwitchLogic`, `TwitchController`, `twitch.yaml`, the
`world.twitch.message` topic). It does **not** model itself as a `Channel`
and does **not** reuse `ChannelCatalogue`'s audience/subscription/history.
It **does** reuse the lowest-level delivery chokepoint
(`MessageApi.sendMessage`) and the wire/frame machinery — so "separate"
is at the channel/verb/store layer, not a reimplementation of message
delivery. The relay owns a lightweight per-player **tuning** store (a set
of tuned-in `broadcasterId`s on the Avatar) and a per-channel **history
ring** on the relay singleton (mirroring `ChannelCatalogue`'s ring shape).

### Single `twitch` verb, multi-channel grammar

One verb, subcommands + `fallthrough: true` bare post (the `chat.yaml`
precedent). Because multiple channels relay at once, the channel is an
explicit argument on every form. `twitch <channel> <message>` is the bare
post; `twitch list/tune/untune/history/who <channel>` the subcommands.
Channel identifier = `broadcasterLogin` (case-insensitive) or an
admin-assigned label alias.

### Factored Twitch integration client (shared with payment intake)

The EventSub session + Helix + token plumbing lives in a `backend/`
Twitch integration client, **separate from** the relay-specific reader
that consumes it. The client exposes: open/close an EventSub session,
create/delete a subscription of a given type, send a Helix chat message,
and read a usable token for a given `TwitchProfile`. The chat relay
subscribes `channel.chat.message`; Phase-4 payment intake will subscribe
`channel.subscribe` / `channel.cheer` through the **same** client. This
build does not implement payment intake, but the client's shape must not
assume chat is the only event type.

### Multi-subscription, per-channel presence-gating

The reader holds a map of active EventSub subscriptions keyed by
`broadcasterId`. A subscription is created on that channel's **0→1**
tuned-in transition and deleted on **1→0**, edge-triggered and debounced
per channel — channels are independent (one busy, one idle). The reader
observes tuning transitions from the relay's own tune/untune verbs +
login/logout; no new always-on global event firehose.

### Own topic, subscription-gated (not implant-gated)

Relay frames carry a distinct topic `world.twitch.message` (authored as a
Topic genre) rather than `world.chat.message`. Delivery is gated by relay
**tuning only** — the relay is an OOC/meta surface and bypasses the in-
world `verbal-esp`/implant perception gate that governs in-world chat. The
distinct topic lets the cockpit route relay traffic to its own pane.

### Two scopes, two grantors — over one new acquisition flow

Both grants flow through the **incremental scope acquisition** built here
(above):

- **Inbound reader:** a **single** operator-provisioned reader account's
  `user:read:chat` — **one account for all relayed channels** (Twitch
  EventSub lets one authenticated user read any public channel's chat; the
  reader's `twitchUserId` is the `user_id` condition on every
  `channel.chat.message` subscription, resolved via a `TWITCH_READER_USER_ID`
  env). Granted once via the re-authorization route (admin self-serve) or
  provisioned out-of-band. The reader reads that account's
  `TwitchProfile.accessToken`; rotation rides `RefreshingAuthProvider`
  write-back.
- **Outbound post:** each posting player's `user:write:chat` — the
  per-player path: first unscoped post → `hasScope` check fails →
  reject-and-point → re-authorization route broadens the token → retry.

### The identity-bridged speaker model

`payload.speaker` is the three-case union (defined in shared wire types so
the client switches on it):

1. `{ kind: "in-game"; ref: StuffRef }` — outbound mirror.
2. `{ kind: "external"; service: "twitch"; externalName }` — unlinked
   inbound sender.
3. `{ kind: "external-linked"; service: "twitch"; externalName; ref }` —
   linked inbound sender (both identities).

Inbound resolution caches `twitchUserId → Avatar`. Outbound is always
case 1 (the poster is a real `Stuff`).

### Outbound fork + echo suppression + queue

`TwitchController` post path: resolve the player's `TwitchProfile` →
reject-and-point if unlinked/unscoped (no mirror) → **send first** via the
integration client (through the per-player throttle + global queue) → **on
success, mirror** a case-1 frame with the egress marker. On send, record
`(senderTwitchUserId, text)` with a short TTL on the relay singleton; the
reader drops a matching inbound frame before delivery. The tag store +
queue are relay-singleton state (written by the post path, read by the
reader) — the one bit of relay-specific state, and it exists only because
outbound is in scope.

### Future chat-bridge seam

The reader normalizes each inbound message to `{ broadcasterId,
speaker(union), text }` and hands it to a relay **dispatch** step that
today delivers to tuned-in players. A future `Channel` bridge would
register as a second consumer of that same normalized stream. Keep
normalization decoupled from delivery; do not build the bridge.

### Seeding the relayed channels

A `config/twitch.yaml` (mirroring `channels.yaml`) lists the curated
relayed channels; a seeder writes the `TwitchChannel` records, insert-only
and idempotent. Multiple entries → multi-channel out of the box.

## Constraints

- **Reuse the delivery chokepoint, not the channel layer.** Relay frames
  go out via `MessageApi.sendMessage`; the relay does not reimplement
  message delivery, but it does own its tuning/history/audience (distinct
  from `ChannelCatalogue`).
- **Backend integration client is shared infra, not chat-local.** It must
  be consumable by payment intake without depending on the relay surface.
  Modeled on `backend/BroadcastFeed.ts` (singleton, lazy boot,
  reconnect/backoff).
- **New subsystem folder is justified, not a stray module.** The mudlib
  surface is a coherent new subsystem (`lib/twitch/` or sibling) with the
  standard categories (Document/mixin/Api+Logic/controller/YAML/Topic) —
  no free-floating helpers, no invented category. Confirm folder name at
  plan time.
- **Tokens stay encrypted at rest and are never logged.**
- **Mirror honesty.** The in-game mirror appears only after a successful
  Twitch send; no optimistic mirror.
- **Bounded EventSub + Helix churn.** Per-channel presence-gating is
  edge-triggered + debounced; outbound respects throttle + queue.
- **Graceful Twitch-side degradation.** Reader/subscription/send failures
  are handled with backoff and never break the surface for tuned-in
  players (relaying simply pauses for the affected channel).
- **Honest, never-merged identity.** Linked MUD identity is carried as
  metadata and surfaced on reveal; it never replaces the origin-honest
  default.

## Acceptance criteria

- A `TwitchChannel` record type + its collection exist; **multiple**
  relayed channels are seeded from `config/twitch.yaml`; the seeder is
  insert-only/idempotent.
- The backend Twitch integration client is a standalone module (EventSub
  session + Helix send + token-from-`TwitchProfile`), with the relay
  reader as a consumer; a unit test exercises the client with the Twitch
  transport mocked, and the client carries no chat-relay-specific
  assumptions (verified by its surface taking an event-type parameter).
- **Inbound:** with a tuned-in subscriber, a simulated EventSub message on
  a relayed channel is delivered on `world.twitch.message` with the
  correct speaker case (2 unlinked / 3 linked), appears in `twitch history
  <channel>`, and reaches only that channel's tuned-in subscribers.
- **Inbound link resolution:** a linked sender yields a case-3 frame
  resolving to the right Avatar; unlinked yields case 2 (test over the
  cached resolution).
- **Multi-channel + presence-gating:** with two relayed channels, a
  subscriber tuning into one creates exactly one EventSub subscription;
  tuning into the second creates the second; the last untune on a channel
  tears down only that channel's subscription. Edge-triggered + debounced
  (test or documented manual verification).
- **Outbound happy path:** a linked, scoped player's `twitch <ch> <msg>`
  issues a Helix send and, on success, mirrors a case-1 frame with the
  egress marker (Helix mocked).
- **Outbound reject-and-point:** an unlinked/unscoped player's post is
  rejected with link/authorize guidance and produces no mirror; the player
  can still read a tuned channel.
- **Echo suppression:** an outbound send's tag causes the reader's read-
  back of the same `(twitchUserId, text)` within TTL to be dropped.
- **Throttle/queue:** an outbound burst is shaped rather than erroring
  (unit-level test).
- **Verb surface:** `twitch list / tune / untune / history / who` and the
  bare `twitch <ch> <msg>` post all route through the single
  `TwitchController` (the `fallthrough` precedent).
- **Client rendering:** an inbound case-3 frame shows `<twitch/>` + handle
  by default with the linked MUD persona on mouseover; an outbound mirror
  shows the native speaker + `⊳twitch` egress marker; relay traffic panes
  distinctly from in-world chat.
- **Incremental scope acquisition works:** the re-authorization route
  re-consents an already-linked user for an expanded scope set and writes
  the broadened token + scopes back to the **existing** `TwitchProfile`
  (no new profile, no collision); `TwitchProfile.hasScope` reports
  correctly. Covered by a test with the OAuth round-trip mocked.
- **Auth grants documented:** the reader account's `user:read:chat` grant
  and the per-player `user:write:chat` reject-and-point → re-consent flow,
  both over the one acquisition route.
- A new subsystem doc `docs/subsystems/twitch-relay.md` covers the
  integration client, the relayed-channel registry, the multi-subscription
  presence-gated reader, the separate surface + own topic, the three-case
  identity bridge, the outbound fork + echo suppression, the chat-bridge
  seam, and the YouTube/payment-intake deferrals.
- Shared speaker-union wire type lands; server + client compile and pass
  `pnpm lint` / `pnpm build`.

## Cross-references

- **Seeding slate (deviated from on the modeling axis):**
  [external-chat-relay-slate.md](../slates/tails/external-chat-relay-slate.md)
- **Track:** [broadcast-patronage-track.md](../tracks/broadcast-patronage-track.md)
  (Phases 2 + 6; the **shared Twitch integration client** is the seam
  Phase 4 payment intake reuses)
- **Keystone (shipped) + the tail this build implements:**
  [auth-providers-slate.md](../slates/tails/auth-providers-slate.md),
  [connection.md](../subsystems/connection.md) — Phase 1 shipped
  `TwitchProfile`, encrypted tokens, `applyRefreshedToken` write-back,
  `TwitchProfile.scopes`, `User.twitchProfileId`, and the linking routes
  (`AuthRoutes.ts` / `PassportConfig.ts`); the **incremental-scope
  re-consent flow is the auth-slate tail this build builds** (identity
  scope is hardcoded today)
- **Chat (the surface we deliberately did *not* reuse, for its
  precedents):** [chat.md](../subsystems/chat.md) — the `fallthrough`
  verb shape, the history-ring shape, `channels.yaml`/`ChannelSeeder`,
  `MessageApi.sendMessage`
- **Messaging:** [messaging.md](../subsystems/messaging.md) — the lone
  `MessageApi.sendMessage` delivery chokepoint the relay reuses
- **Identity / naming:** [belief.md](../subsystems/belief.md) — the
  viewer-aware naming substrate the recognition-driven presentation seam
  would later consume
- **Rendering:** [message-rendering.md](../subsystems/message-rendering.md) —
  tagged-string model, service glyph, hover-metadata
- **Topics:** [topics.md](../subsystems/topics.md) — authoring the
  `world.twitch.message` genre
- **Worker precedent:** [livestream.md](../subsystems/livestream.md) —
  `backend/BroadcastFeed.ts`, the singleton-worker pattern
- **Deployment:** [deployment.md](../deployment.md) — Twitch
  `clientId`/secret + worker config
