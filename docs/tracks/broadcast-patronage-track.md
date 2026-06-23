# Track: Broadcast & Patronage — the road to going live

*A goal-oriented delivery track: the dependency-ordered path from "the
substrate is deep" to "we are live on Twitch, the broadcast is
interactive, and patronage is being recorded as future stake."*

## What this track is

This is a **critical path**, not a new build. It threads slates that
already live across [Build 7 — Economy](../slates/README.md#7-economy),
[Build 9 — Cooperative & governance](../slates/README.md#9-cooperative--governance),
and a cluster of comms/auth/livestream **tails**, plus one net-new
piece, into the single sequence that gets us to broadcast + monetization.

It is **distinct from** the roadmap's "two parallel tracks" (Track A /
Track B), which split work by whether a *client dependency* gates it.
This track is organized by a *destination*: the north star below.

**North star.** Go live on Twitch, broadcast the design and development
of Saxonberg, and convert patronage into *future stake* — the
[cooperative](../slates/builds/cooperative-slate.md) thesis that the
people who fund the world are the people who govern it. The full polity
is parked until there's a member body; this track stands up the **funding
stream** and the **engagement loop** that feed it.

## The north-star sequence

```
[auth-providers keystone]  ← Twitch co-equal login + encrypted TwitchProfile tokens
        │
        ├──► external-chat-relay W1 (inbound: Twitch chat → in-game; no per-player tokens)
        │         └──► external-chat-relay W2 (outbound: post to Twitch as yourself)
        │
        └──► stake-ledger slice  ← honest counter: lifetime_total + recurring_rate per identity
                  ├── ships with: founding-charter self-binding (matched-plus-one, auto-sunsets)
                  └── fed by: Twitch-native payment intake (EventSub subs/bits)

independent, run in parallel:
   • livestream overlay tail   (durable StreamState, scene state, chat forwarding over the feed)
   • async forums (delivery-slate)  ← "continue the conversation while the streamer is offline"
```

The **auth-providers keystone is the universal chokepoint**: the chat
relay spends the Twitch tokens it stores, and the stake-ledger needs the
Saxonberg-identity binding it creates to attribute a dono. Nothing
Twitch-flavored starts before it.

## Starting line — what's already shipped

The track inherits a real head start:

- **Broadcasting at all (server half).** `StreamState` singleton,
  `BroadcastFeed` service, the read-only `?broadcast=<token>` principal
  (gated by `BROADCAST_TOKEN`), the `streamers` access axis
  (`AccessApi.isStreamer` / `requiresStreamer`, seeded from
  `STREAMER_PLAYER_IDS`), and the `stream away`/`back` verb. The OBS-side
  overlay lives in the sibling **`pbox-stream`** repo. See
  [livestream.md](../subsystems/livestream.md).
- **Realtime engagement.** Channels + acoustic/implant comms
  (`say`/`whisper`/`shout`/`dm`/`tell`/`broadcast`) are shipped — enough
  for in-game viewers to talk back during a broadcast *today*. See
  [comms.md](../subsystems/comms.md), [chat.md](../subsystems/chat.md).
- **Async-forum design is settled** (not just ideated) in
  [delivery-slate.md](../slates/builds/delivery-slate.md): forums/email
  as facets of the one conversation primitive, reusing
  `Channel`/`GroupRef`/messaging.

## Phase plan

### Active scope — "Live + interactive broadcast" (this push)

Stops at a genuinely interactive Twitch broadcast, **before** any funding
plumbing. Three phases.

#### Phase 1 — Auth-providers keystone ✅ *shipped 2026-06* *(blocks everything)*
- **Slate:** [auth-providers-slate.md](../slates/tails/auth-providers-slate.md)
- **Extends:** [connection.md](../subsystems/connection.md) (Google-only spine)
- **Build (Waves 1+2):** multi-provider Passport spine (Google + Twitch
  co-equal), `TwitchProfile` Document with **encrypted** access/refresh
  tokens (via an `EncryptedStringMarshaller`, no new Api), `/auth/twitch`
  login, token-refresh write-back, `User.twitchProfileId` (and
  `googleProfileId` relaxed to optional, ≥1 invariant), **and account
  linking** — symmetric `/auth/{twitch,google}/link`, collision-refuse,
  login-via-any-linked-provider → same `User`, and unlink (deletes the
  orphaned profile + tokens, defends the ≥1-provider invariant). Chat
  scopes stay deferred.
- **Outcome:** you can sign in with Twitch; tokens stored encrypted; one
  human links both providers to one `User`.
- **Requirements:** [auth-providers-requirements.md](../requirements/auth-providers-requirements.md) ✎

#### Phase 2 — Twitch chat relay, inbound *(the engagement payoff)*
- **Slate:** [external-chat-relay-slate.md](../slates/tails/external-chat-relay-slate.md) (Wave 1)
- **Extends:** [chat.md](../subsystems/chat.md)
- **Depends on:** Phase 1.
- **Build:** `externalBinding` facet on `Channel` (service / broadcasterId
  / broadcasterLogin), one **shared reader** per bound channel (anon IRC
  or a single EventSub `channel.chat.message` socket — *no per-player
  auth*), synthetic-speaker frames stamped `verbal-esp`, provenance glyph
  rendering (`[⊳twitch #chan] viewer: …`).
- **Outcome:** during a broadcast, Twitch chat appears in-game; tuned-in
  players read it. No player tokens spent.

#### Phase 3 — Livestream overlay polish *(parallelizable with Phase 2)*
- **Slate/doc:** [livestream.md](../subsystems/livestream.md) (the Phase-1
  "not shipped" list)
- **Build:** durable `StreamState` (survives reboot), scene / lower-third
  / camera-focus state on the feed, public chat forwarding over the
  broadcast feed (so the overlay can show in-game + Twitch chat),
  optional streamer-mode affordances.
- **Outcome:** the OBS overlay (in `pbox-stream`) has richer state to
  render; the broadcast looks and behaves like a production stream.

### Queued — "Patronage → stake" (next push, scoped but not started)

The monetization milestone. Sequenced and decided; deferred out of the
first push by choice.

#### Phase 4 — Twitch-native payment intake
- **Decision (locked):** intake is **Twitch-native only** — ingest
  Twitch **EventSub** events (subscriptions, bits/cheers) over the same
  token plumbing the relay uses. No external processor (Patreon/Stripe)
  in scope; revisit only if off-platform patronage becomes a real need.
- **Why this matters:** this is the link the cooperative slate *assumed*
  existed ("a Twitch dono/sub webhook"). No slate covered actually
  ingesting payment events — **this phase is the net-new piece** of the
  whole track and will want its own slate + requirements.
- **Depends on:** Phase 1 (tokens + EventSub plumbing).

#### Phase 5 — Stake-ledger slice + founding-charter
- **Slates:** [cooperative-slate.md](../slates/builds/cooperative-slate.md)
  (the "stake-ledger slice buildable now"),
  [founding-charter.md](../slates/builds/founding-charter.md)
- **Build:** the honest counter — per Saxonberg identity, record
  `lifetime_total` (drives influence reservoir cap) and `recurring_rate`
  (drives regen). Tamper-evident. **No** chambers/voting/executive/reserve
  yet; conversion of accrued ledger entries to Patron-House influence +
  citizenship is **deferred to launch**. Ships with the founder's
  **matched-plus-one** self-binding (auto-sunsets at ratification) — the
  first real test of code-first self-binding.
- **Firewall (entrenched, do not violate):** stake **never** cashes out;
  real money earns *influence (a vote and a name)*, never in-world
  currency or gameplay advantage; the three influence kinds are
  non-fungible. Words allowed: stake / patron / citizen. Never: investor
  / share / equity / return / dividend.
- **Depends on:** Phase 1 (identity binding), Phase 4 (intake events).

#### Phase 6 — Twitch chat relay, outbound
- **Slate:** [external-chat-relay-slate.md](../slates/tails/external-chat-relay-slate.md) (Wave 2)
- **Build:** on `chat <relay-ch> <msg>`, fork on `externalBinding`,
  resolve the player's linked `TwitchProfile`, Helix **Send Chat
  Message** as the player (incremental-scope reject-and-point on first
  post), echo tag-and-suppress, per-player throttle.
- **Depends on:** Phase 1 (chat scope), Phase 2 (the bound channel).

### Later — the offline-continuation surface

#### Phase 7 — Async forums
- **Slate:** [delivery-slate.md](../slates/builds/delivery-slate.md)
- **Build:** persistent thread-tree board Document + async-browse views +
  `world.forum.*` Topic genres; reuses `Channel`/`GroupRef`/messaging and
  the wiki-style `FolderZone` namespace.
- **Scope note:** this is the **social forum** (comms-owned, casual). It
  is *not* the governance **deliberation** surface — the typed claim-graph
  [argument-map](../slates/tails/argument-map-slate.md) is a separate
  thing, organized by argument structure rather than recency. Don't
  conflate them.
- **Why last:** the live loop comes first (most engagement is during
  broadcast); forums host the conversation between streams once there's a
  community to host.

## Decisions log

- **First-push scope** = "Live + interactive broadcast" (Phases 1–3).
  Funding plumbing deferred to the next push.
- **Phase 1 includes account linking** (slate Waves 1+2), not just Twitch
  login — so a Saxonberg↔Twitch identity binding exists ahead of the
  funding push. Chat scopes remain deferred.
- **Payment intake** = **Twitch-native only** (EventSub subs/bits). No
  external processor for now.
- **Track artifact** = this standalone doc (not a Build-10 entry in the
  slate index).

## Open questions (resolve at the relevant phase, not now)

- **Phase 4:** exact EventSub event set (subs only? + bits/cheers? +
  gift subs?) and how each maps to `lifetime_total` vs `recurring_rate`.
  Wants its own slate.
- **Phase 5:** unit accounting + dilution bookkeeping + the ratification
  trigger that fires the founder-margin sunset (cooperative/founding
  leave these explicitly open).
- **Phase 2:** anon-IRC vs single-EventSub-socket for the shared reader
  (the relay slate leans EventSub for longevity).

## Cross-references

- North star & funding model: [cooperative-slate.md](../slates/builds/cooperative-slate.md),
  [founding-charter.md](../slates/builds/founding-charter.md),
  [draft-constitution.md](../slates/builds/draft-constitution.md)
- Engagement substrate: [comms.md](../subsystems/comms.md),
  [chat.md](../subsystems/chat.md), [messaging.md](../subsystems/messaging.md),
  [delivery-slate.md](../slates/builds/delivery-slate.md)
- Streaming + Twitch: [livestream.md](../subsystems/livestream.md),
  [auth-providers-slate.md](../slates/tails/auth-providers-slate.md),
  [external-chat-relay-slate.md](../slates/tails/external-chat-relay-slate.md)
- Process: [workflow.md](../workflow.md) — each phase becomes a normal
  slate → requirements → plan → build cycle.
