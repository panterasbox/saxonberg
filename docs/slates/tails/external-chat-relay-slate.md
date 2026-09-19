# External chat relay slate (working doc)

> **Status: PARTIAL** — Twitch two-way and YouTube read shipped, as a
> unified `watch`/`tune` surface over `StreamerTarget` — NOT the
> `Channel`-facet model designed below →
> [streaming.md](../../subsystems/streaming.md)
> **Left:** YouTube outbound (the design is owned by
> [youtube-relay-slate.md](./youtube-relay-slate.md); only the *why deferred* remains here)
> **Size:** a tail

> **Status: Twitch + YouTube-READ SHIPPED → [streaming.md](../../subsystems/streaming.md);
> YouTube outbound deferred.** The shipped work **deviated** from the
> "external channel = a `Channel` facet" model below — the relay is a
> dedicated **unified** surface (`watch`/`tune` verbs over a
> `StreamerTarget`, `world.{twitch,youtube}.message` topics),
> **player-initiated + memory-resident** (no registry collection), not
> admin-curated. Twitch (two-way) + YouTube (read-only) both ship; the
> `externalBinding`/`Channel`-facet unification below is **not** how it
> landed. Retained only for the deferred **YouTube outbound** design (see
> [youtube-relay-slate.md](./youtube-relay-slate.md)); read the subsystem
> doc for the shipped shape.

See also:

- [auth-providers-slate.md](./auth-providers-slate.md) — **the keystone.**
  Supplies `TwitchProfile` (the linked token), the incremental
  `user:write:chat` / `user:read:chat` scope acquisition, and the
  encrypted token storage this feature spends.
- [docs/deployment.md](../../deployment.md) — Twitch `clientId`/secret and
  the worker live with the rest of the server config (SSM/`.env`).

---

*The model below this line — inbound reader, outbound Helix send under the player's own token, echo tag-and-suppress, provenance glyph, EventSub transport, the throttle — shipped (in the unified shape) → [streaming.md](../../subsystems/streaming.md) · [twitch-relay.md](../../subsystems/twitch-relay.md). Waves 1–2 shipped; Wave 3 is [youtube-relay-slate.md](./youtube-relay-slate.md).*

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
