# External chat relay slate (working doc)

> **Status: shape proposed.** Bridge the in-game channel system to
> external chat services (**Twitch first**, YouTube deferred). An external
> channel is **not a new subsystem** — it's the existing `Channel` with one
> new *binding* facet ("this channel mirrors a Twitch broadcaster's
> chat"). Inbound: one shared reader injects external messages as ordinary
> channel frames. Outbound: a player posting sends to the service **as
> themselves**, via their linked token. Sits on top of the
> [auth-providers keystone](./auth-providers-slate.md).

The relay turns a Twitch channel's chat into a frequency you can tune
inside the game: you read it in your console alongside guild/global, and
when you post, it goes out under *your* Twitch identity. Scope is
deliberately tiny — a **handful of admin-curated channels** (maybe just
one), not user-created bridges.

This is the feature the panterasbot attempt never landed. The thing that
sank it — a `Map<userId, ChatClient>` of persistent per-user IRC sockets
for sending — is **deleted**, not ported: Twitch's Helix *Send Chat
Message* REST endpoint (2024) makes outbound a stateless call. See *Why
this is tractable now* below.

See also:

- [auth-providers-slate.md](./auth-providers-slate.md) — **the keystone.**
  Supplies `TwitchProfile` (the linked token), the incremental
  `user:write:chat` / `user:read:chat` scope acquisition, and the
  encrypted token storage this feature spends.
- [chat-slate.md](./chat-slate.md) — the channel substrate this extends:
  the **generative axes** (this adds a `binding` value), subscription ≠
  membership, the config block, the `chat <channel> <message>` verb,
  history ring, rendering.
- [docs/subsystems/chat.md](../../subsystems/chat.md) — shipped `Channel`
  Document (`lib/social/Channel.ts`), `ChannelCatalogue`, the
  `world.chat.message` topic, the `'verbal-esp'` modality stamp, the
  audience-fanout chokepoint the inbound path reuses.
- [docs/subsystems/messaging.md](../../subsystems/messaging.md) — the
  `MessageApi.scene` pipeline; the inbound path injects a channel frame
  with a **stringly external speaker** (no Stuff), a small new wrinkle.
- [message-rendering-slate.md](./message-rendering-slate.md) — provenance:
  the `<chan>` label + a service glyph (`<twitch/>`) marking external
  origin, per the layered-presentation principle.
- [docs/deployment.md](../../deployment.md) — Twitch `clientId`/secret and
  the worker live with the rest of the server config (SSM/`.env`).

---

## Principle

1. **An external channel is a `Channel` with a binding facet** — not a new
   kind, not a new subsystem. It reuses subscription, history, fanout,
   rendering, and the post verb wholesale.
2. **You post as yourself.** Outbound is attributed to the player's own
   linked Twitch identity (their token), never a single relay bot.
3. **One reader in, fan out internally.** A single shared connection per
   bound channel reads all external messages; the existing audience
   chokepoint distributes them. Never one connection per player.
4. **Admin-curated, not user-bridged.** A small set of relayed channels,
   seeded as content; players tune in, they don't create bridges.
5. **The boundary is honest.** External messages render with clear
   provenance; the in-game channel is a *mirror* of the external chat plus
   the in-game participants.

---

## The model: a binding facet on `Channel`

In the chat slate's axis model, **binding** ranges over
`untethered · group · place · activity`. The relay adds one value:
**external service**. Concretely, an open-join standalone `Channel` gains
an optional block:

```ts
// extends lib/social/Channel.ts (persistentFields += 'externalBinding')
externalBinding?: {
  service: 'twitch';          // 'youtube' later
  broadcasterId: string;      // the Twitch user id of the channel-of-record
  broadcasterLogin: string;   // for display / the reader join
};
```

Everything else about the channel is ordinary: membership =
open-join-standalone (universal eligibility, gated by per-player
subscription), lifetime = persistent, config block as usual. The binding
is **content** — admin-seeded for the curated channel(s), not a player
affordance. A channel with no `externalBinding` behaves exactly as today.

## Inbound (Twitch → game)

One **shared reader** per bound channel, run as a backend worker:

1. Connect once to the channel's chat (transport choice below) — **no
   auth per player**.
2. On each external message, normalize to `{ channelId, externalName,
   text }` and inject it into the channel via the normal messaging path,
   stamped `'verbal-esp'` on the `world.chat.message` topic.
3. The existing **audience-fanout chokepoint** delivers it to every tuned-in
   in-game subscriber. No relay-specific fanout.

**The one new wrinkle:** the speaker is an external Twitch user with **no
in-game Stuff**. The messaging pipeline normally assumes a `Stuff &
Sensor` speaker. Inbound external frames carry a *stringly* speaker (the
Twitch display name) instead — an "authorless" channel frame the renderer
labels by provenance. This is the only place the relay touches the
messaging substrate's assumptions; define the synthetic-speaker frame
shape here.

## Outbound (game → Twitch)

When a player posts to a relay channel (`chat <ch> <message>`), the post
path forks on `externalBinding`:

1. Resolve the player's linked **`TwitchProfile`**. If absent, or lacking
   `user:write:chat`, **reject-and-point** — "link your Twitch / authorize
   chat to post here." This rejection is the **incremental-scope trigger**
   from the auth slate: first post → re-consent flow → token broadened.
2. Stateless **Helix Send Chat Message**:
   `POST /helix/chat/messages { broadcaster_id, sender_id, message }` with
   the player's token. `sender_id` = the player's own `twitchUserId` —
   "post as yourself" is the *simplest* case for this endpoint (no
   moderator/`channel:bot` requirement, which only applies to app-token
   bots).
3. The post **also** appears in the in-game channel (the mirror) — see the
   echo problem next.

No persistent connection, no `Map<userId, ChatClient>`, no
connect/refresh/quit lifecycle. The token refresh is handled by the auth
slate's `RefreshingAuthProvider.onRefresh → save()`.

## The echo problem (real, must decide)

A player's outbound message goes to Twitch, and the shared reader (which
sees *all* channel traffic, including theirs) will read it right back —
producing a duplicate in-game line. Options:

- **Tag-and-suppress (lean):** record `(senderTwitchUserId, text)` on send
  with a short TTL; the reader drops inbound frames matching a pending tag.
  Clean, no double-render.
- **Reader-is-canonical:** *don't* echo outbound to the in-game channel at
  all; let the reader's copy be the single source. Simpler, but adds a
  round-trip of latency before you see your own message.
- **Accept the echo:** dedupe by `(sender, text)` within a window at render
  time. Crudest.

Recommend tag-and-suppress; this is the one piece of relay-specific
state worth its keep.

## Provenance rendering

External messages must read as external. Reuse the message-rendering
slate's tagged-string model: the channel `<chan>` label carries a
**service glyph** (`<twitch/>`) and the external speaker name renders as a
plain string subject — `[⊳twitch #channel] someviewer: message`. In-game
posts on the same channel render normally (in-game speaker), so the mirror
visibly distinguishes "a Twitch viewer said" from "a player here said."
(Panterasbot's `<twitch/>` glyph + `<subject>user</subject>` pattern,
modernized onto the tagged-complete-string renderer.)

## Transport choices

- **Read (inbound):** **anon IRC** (`justinfan`, zero auth — fast path) vs
  **one EventSub `channel.chat.message` websocket** (durable, Twitch's
  forward direction, needs a `user:read:chat` token — the
  broadcaster's/yours). *Open call; lean EventSub for longevity, anon IRC
  acceptable for a v1 spike.*
- **Send (outbound):** Helix *Send Chat Message* REST. Not a choice — it's
  the whole reason this is tractable.

## Rate limits & flooding

- **Per-player send** (20 msgs/30s, 1/s/channel) is *per linked token*, so
  casual use never collides — each player has their own budget.
- **The real risks** are (a) flooding the actual Twitch channel and (b)
  your **app's** aggregate Helix rate budget (keyed on client id) if many
  players post at once. Both are mild at this feature's scope (a curated
  channel, modest concurrent posters), but the outbound path should carry
  a **per-player throttle + a global send queue** so a burst degrades
  gracefully instead of erroring. Flooding mitigation beyond that is a
  *product/moderation* decision (it's your channel), not engine.

## Reused vs. new

| Reused (chat substrate) | New (this slate) |
|---|---|
| `Channel` Document + `ChannelCatalogue` | `externalBinding` block + seed of the curated channel(s) |
| subscription/tuning, notification levels | the inbound **shared reader** worker |
| history ring, `chat history` | the **synthetic stringly-speaker** channel frame |
| `world.chat.message` topic + audience fanout | the outbound **fork** in the post path → Helix send |
| `chat <channel> <message>` verb | echo **tag-and-suppress** state |
| `<chan>`-label rendering | the `<twitch/>` provenance glyph |
| `TwitchProfile` token + refresh *(auth slate)* | the incremental-scope reject-and-point on first post |

The engine footprint is small: a worker, a post-path fork, a frame-shape
addition, and a config block. Everything player-facing already exists.

## YouTube (deferred — why)

Same `Channel` + `externalBinding` abstraction (`service: 'youtube'`), but
two hard constraints push it past v1:

- **Live-only.** YouTube live chat exists *only during an active
  broadcast* — no persistent channel chat to bind to when you're offline.
- **Quota.** The Data API's 10k-units/day default is brutal for chat:
  reading is poll-only and continuous polling of one chat can exhaust the
  daily quota by itself; `liveChatMessages.insert` is a heavy write.
  Sustained use needs a quota-increase audit.

So YouTube is feasible on the same shape but gated on quota + a
live-session model. The `service` field anticipates it; the worker
interface should not assume a Twitch-only transport.

## Why this is tractable now (panterasbot retro)

The old branch held one Twurple `ChatClient` per user (`Map<userId,
ChatClient>`), each a persistent authenticated IRC socket — plus a
redundant per-user *join* on top of the shared read client. That
N-connections-to-babysit topology is what never stabilized. The Helix
send endpoint collapses outbound to a stateless REST call, so:

- send = the player's token + one POST (no socket),
- receive = one shared reader (no per-user joins),

which is exactly the "many out, one in" shape the old attempt was fighting
the protocol to approximate.

## Build waves

- **Wave 1 — inbound read-only.** `externalBinding` on `Channel` + seed
  the curated channel; the shared reader (transport per the open call);
  synthetic-speaker frame + provenance glyph. **Outcome:** players tune in
  and *read* the Twitch channel in-game. No tokens spent — read needs no
  player auth.
- **Wave 2 — outbound send.** Post-path fork → Helix send via the player's
  token; incremental-scope reject-and-point; echo tag-and-suppress;
  per-player throttle + global queue. **Outcome:** players post to Twitch
  as themselves, depends on the auth slate's chat scope.
- **Wave 3+ — YouTube.** Generalize the worker transport; live-session
  binding; quota strategy. Its own pass.
