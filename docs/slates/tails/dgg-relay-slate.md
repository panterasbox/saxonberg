# destiny.gg Stream Relay — Scope

> **Status (2026-09-01): design conversation, captured. Not
> requirements.** The fourth transport, and the first that is a
> **community** rather than a platform. Two-way is the point of it — a
> read-only dgg relay would miss the use case that motivates it.

**Lineage:** sibling of
[kick-relay-slate.md](./kick-relay-slate.md) and
[youtube-relay-slate.md](./youtube-relay-slate.md) (Wave N of
[external-chat-relay-slate.md](./external-chat-relay-slate.md)). Like
Kick it arrives *after* the unification, so it inherits the shared
surface rather than mirroring a parallel one.
**Sits on:** [streaming.md](../../subsystems/streaming.md) (the shipped
substrate — read it first) +
[twitch-relay.md](../../subsystems/twitch-relay.md) (the outbound
machinery this reuses wholesale) +
[connection.md](../../subsystems/connection.md) (the OAuth spine it
notably does **not** ride) +
[livestream.md](../../subsystems/livestream.md).

**Provenance:**

> **User: "I'd want writes. like I want this application to be a way to
> watch destiny and that involves dgg chat both ways. but probably not
> everyone is gonna care about that — I don't think even destiny's
> audience uses dgg, just the hardcore or very old community members."**

---

## Thesis

destiny.gg is a single-channel community site with a custom WebSocket
chat, several third-party clients, and a developer-key dashboard. The
**read** path is the cheapest transport we would have shipped; the
**write** path is cheap in machinery and expensive in category, because
dgg is the first target that hands out a credential without being able
to log anyone in.

⭐ **The audience being small is the design input, not an objection.** It
is what makes per-player credentials the right answer instead of the
wrong one.

---

## What is actually there (verified 2026-09-01, web)

| | |
|---|---|
| **Endpoint** | a plain WebSocket. ⚠ Sources disagree between `wss://chat.destiny.gg/ws` and `wss://chat.destinygg.com/ws` — **resolve at build time** |
| **Anonymous read** | ✅ *"you can run the chat anonymously and still be able to view all messages in chat"* — auth is needed only for whispers and posting |
| **Auth (write)** | a **64-char alphanumeric token** from `destiny.gg/profile/developer`, reportedly non-expiring; or a `sid` browser cookie that dies after ~5 h idle |
| **Message types** | `CHAT_MESSAGE`, `USER_JOINED`, `USER_QUIT`, `BROADCAST`, `WHISPER`, `MUTE`/`UNMUTE`, `BAN`/`UNBAN`, `SUB_ONLY`, `ERROR_MESSAGE` |
| **Wire format** | a type prefix followed by JSON. ⚠ **The exact shape is NOT verified** — read it off `destinygg/chat-gui` before writing a parser |
| **Policy** | one library README: *"Unauthorized chat bots are subject to being banned, ask Cake in DGG for permission"* |

⚠⚠ **`destinygg/chat` (the Go backend) is ARCHIVED.** There is no
authoritative public source for the protocol; the community client
libraries are the de facto spec. Twitch/YouTube/Kick give us versioned
APIs with deprecation notices — **this one can drift silently**, and that
is a standing maintenance cost the other three do not carry.

References: [destinygg/chat](https://github.com/destinygg/chat) ·
[destinygg/chat-gui](https://github.com/destinygg/chat-gui) ·
[gabrieljablonski/dgg-chat](https://github.com/gabrieljablonski/dgg-chat)
· [Fritz-02/dgg-bot](https://github.com/Fritz-02/dgg-bot) ·
[dukemiller/destiny-chat-client](https://github.com/dukemiller/destiny-chat-client)

---

## The inherited surface (the copyable 90%)

Everything the unification already provides, unchanged:

- `StreamRelay` channel table, `channelKey(service, key)` composite,
  presence **edges** (0→1 open / 1→0 close) — dgg is one more service
  string.
- `MessageApi.sendMessage` on `world.dgg.message`; the
  `Events.RelayMessage` overlay-forwarding seam.
- `StreamLogic.dropPlayer` — the centralized logout drop already covers
  every reader.
- **The whole outbound stack**: the token-bucket throttle,
  echo-suppression, and the three-case `RelaySpeaker` identity bridge.
  These were built once for Twitch and are the expensive part of writes;
  dgg reuses them.
- `cockpit.tuned` + the rail composer branching on **`canPost`** — a
  server fact, so no client edit when dgg gains posting.

⭐ Structurally it is Twitch-shaped (a persistent socket) **minus** the
hard part: no EventSub multiplexing, because there is only one channel.

---

## The parts that are NOT a copy

### 1. ⭐⭐ Single channel — the grammar mismatch

`StreamerTarget` exists to answer *which streamer's chat*. destiny.gg has
**one chat**. So:

- `key` is a constant, not a resolved broadcaster id;
- `tune <handle> --dgg` is meaningless — there is no handle to name;
- the target form is a **singleton**: `tune dgg`, or the site URL.

Presence-gating and the channel table work unchanged. But dgg is a
special case in a grammar built entirely around naming a streamer, and
that is the one genuine architectural friction. **Decide the target form
before anything else** — it is the only thing here that touches a pure,
total, unit-tested parser everything else depends on.

### 2. ⭐⭐ A credential category we do not have

`TwitchProfile` / `KickProfile` exist because those platforms **log you
in** — token-bearing, encrypted at rest, hanging off an OAuth
relationship. destiny.gg has **no OAuth of its own**; it *consumes*
Twitch/Google/Discord as its logins.

So a dgg token is an **outbound-only capability credential with no login
relationship**. It cuts both ways against our own rule that a linkable
identity is a login vector:

- **safer** — nobody can authenticate *into anything* with it;
- **less safe** — a raw, non-expiring bearer secret, no scopes, revocable
  only by the user regenerating it on dgg.

⚠ It is **not** a `credential.md` credential either — that subsystem is
in-world (payment / travel / key). Conflating them would be a category
error. This wants its own answer: encrypted at rest, per-player, 401
handled as "your key was regenerated, re-enter it."

### 3. Writes: per-player tokens, not a bot account

Two possible shapes, and the small audience decides between them:

| | one operator bot | ⭐ per-player token |
|---|---|---|
| attribution | collapses — everyone is the bot | posts as yourself |
| dgg moderation | can only ban **the whole relay** | bans the individual, correctly |
| blast radius | one bad actor kills it for every user | contained |
| friction | none | needs a dgg account + a dashboard visit |
| the policy | **exactly what gets bots banned** | a third-party client, of which dgg has several |

Friction only matters when serving everyone, and this feature is *for*
the hardcore regulars — precisely the people who have a dgg account and
will fetch a key. **The niche audience inverts the trade.**

It also transforms the permission ask: *"each user connects with their
own account and posts as themselves; we run no bot"* is a far easier
conversation, and the existence of a developer dashboard suggests it is
sanctioned.

⚠ **User-facing risk to surface in the UI:** posting through our client
can get someone's **own dgg account** banned. Correct behaviour, and not
obvious to a user who reads it as "the app's chat box."

### 4. The gate is a person, not a ToS

Every other transport is governed by a published API agreement we can
read and comply with. This one is governed by **asking someone**. That is
a dependency the other three do not have, and it cannot be engineered
around.

---

## Scope decision

**Two phases, Kick's shape.** Ship read first — it needs no credential at
all, proves the socket and the parser, and gives the permission
conversation something already running to point at. Writes follow once
the credential story is settled.

⭐ This is the same read-then-`chat:write` phasing Kick already uses, so
it is a precedent rather than a new pattern.

## The product framing (why it earns a transport despite the audience)

"A way to watch Destiny" decomposes into things already built: `watch`
his Kick/YouTube stream for video, then `tune` **both** dgg *and* the
platform chat — `tune` is already **cardinality N** with per-line
provenance, so the hardcore rump and the masses interleave in one card,
labelled by service.

⭐ dgg is not a separate mode; it is one more `tune` target in an
aggregation that already works without it. **That is the argument for
building it despite the audience size** — the marginal feature is
additive to an existing view.

⚠ But state the trade honestly: Kick bought a **platform** (thousands of
channels, one integration). dgg buys **one community**. Worth it iff that
specific community is a target.

---

## Out of scope (explicit)

- **Whispers / PMs.** The protocol carries them; the relay has no
  private-message surface and should not grow one here.
- **Moderation events** (`MUTE`/`BAN`/`SUB_ONLY`) as anything but
  ignored frames. We are a client, not a mod tool.
- **dgg as an auth provider.** There is no OAuth to ride. A `DggProfile`
  in the `twitch_profiles`/`kick_profiles` sense does not exist and
  should not be faked.
- **`external-linked` speaker rendering.** No reverse profile walk is
  possible, so dgg lines render `external`-only, like YouTube.
- **Video embed.** Destiny streams on other platforms; the existing
  Kick/YouTube/Twitch embeds already cover the video half. dgg's own
  player is not a target.
- **Other sites running `chat-gui`.** It is open source and forked; this
  slate is about destiny.gg specifically. A generic "dgg-protocol chat"
  transport is a bigger and different idea.

---

## Open questions for requirements

1. ⭐ **The singleton target form.** `tune dgg`? A URL? A `--dgg` opt
   with a fixed key? This touches `StreamerTarget.parse`, which is pure
   and total — decide before writing code.
2. **Where does the player's token live?** Not a `*Profile` (no OAuth),
   not a `credential.md` credential (in-world). A new small store, or a
   field on `User`? Encryption at rest is not optional.
3. **How is the token entered?** A verb, a settings pane, the CMS? It is
   the first secret a *player* hands us directly rather than via OAuth
   redirect.
4. **Has permission been asked?** Blocking for writes; probably not for
   an anonymous read. Should happen before phase 2 is planned, not after
   it is built.
5. **What does the wire actually look like?** Read `chat-gui` and pin the
   frame shapes in the requirements — this slate deliberately does not
   guess.
6. **Reconnect / backoff dials.** `dgg.*` AppSettings mirroring
   `youtube.*` / `kick.*` (historyCap, reconnectBackoffMs). Any
   rate limit on posting is unknown and needs measuring; the existing
   token bucket is the throttle either way.
7. **Does an archived protocol change the maintenance answer?** A
   transport whose spec can drift with no deprecation notice may want a
   louder failure mode than the others.

---

## What this slate does NOT cover

- **The permission conversation itself** — a human task, not a design
  one.
- **The outbound platform-action family** (`follow`/`sub`/`cheer`) —
  already a streaming-wide non-goal.
- **Overlay forwarding of a dgg channel.** Mechanically free
  (`OVERLAY_DGG_CHANNEL` beside the others) but only meaningful if the
  overlay owner streams *to* dgg, which is not our case.
