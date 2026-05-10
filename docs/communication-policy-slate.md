# Communication policy slate (working doc)

Working slate for trust-tiered communication — the moderation
substrate that protects players from harassment, griefing, and
maliciously-authored zone NPCs by gating *what kinds of messages
are allowed* based on *how familiar the sender is*.

The framing: **recognition is a security primitive.** How well
the receiver knows the sender determines what messages get
through. Strangers default to constrained channels (emote-only,
templated text); friends bypass filters; foes are dropped;
authority overrides for safety warnings.

See also:

- [docs/recognition-slate.md](./recognition-slate.md) —
  recognition state is the primary input.
- [docs/social-graph-slate.md](./social-graph-slate.md) —
  bucket assignments map to trust tiers.
- [docs/subsystems/messaging.md](./subsystems/messaging.md) —
  MML, scene composer, message routing. The MessageGate sits
  in this pipeline.
- [docs/vision.md](./vision.md) — Saxonberg's safety
  positioning. This slate makes the safety claim concrete.

---

## Principle

**Every message between two actors goes through a `MessageGate`**
that computes the sender's effective trust tier from the
receiver's perspective and applies a per-tier policy.

The trust tier is derived from:

1. The receiver's recognition state of the sender.
2. The sender's bucket assignment (if any) in the receiver's
   social graph.
3. Global / role overrides (mods, faculty, system).
4. Source-type metadata (player vs NPC; trusted-zone vs
   sandboxed-zone NPC).

The policy determines:

- Whether the message is delivered at all.
- Whether it's filtered (profanity, link-stripping, etc.).
- Whether it's rate-limited.
- Whether it's restricted in form (emote-only, template-only).
- Whether it's logged for moderation review.

---

## The trust tier model

Six tiers (5 plus a "blocked" floor), in order of increasing
permission:

| Tier | Source | Default policy |
|---|---|---|
| **Blocked** | `foes` bucket | All messages dropped |
| **Unknown** | Stranger; or NPC from sandboxed/un-vetted zone | Emote-only or template-only |
| **Acquaintance** | Recognized but not friend-bucketed | Standard chat with profanity filter, rate-limited |
| **Friend** | `friends` bucket; or `classmates`/`study-group`/etc. | Full chat with light filter, normal rate |
| **Trusted** | Close friends (subset of friends, opt-in by player) | Unrestricted (subject to global rules) |
| **Authority** | Mods / staff / faculty (role-based) | Privileged broadcast; can override player blocks for warnings |

A target's tier from a given viewer is computed:

```ts
function effectiveTier(viewer: Stuff, sender: Stuff): TrustTier {
  // 1. Authority overrides everything
  if (sender.role === 'authority') return TrustTier.Authority;

  // 2. Foes blocked unconditionally
  const record = viewer.knownPeople.get(sender);
  if (record?.bucket === 'foes') return TrustTier.Blocked;

  // 3. Bucketed friends and trusted friends
  if (record?.bucket === 'trusted-friends') return TrustTier.Trusted;
  if (isInFriendCategoryBucket(record)) return TrustTier.Friend;

  // 4. Recognized but uncategorized
  if (record) return TrustTier.Acquaintance;

  // 5. Sender-side metadata for unrecognized
  if (sender.zone?.trustLevel === 'sandboxed') return TrustTier.Unknown;

  // 6. Default for unrecognized players
  return TrustTier.Unknown;
}
```

Per-tier policy is configurable:

```yaml
trustPolicies:
  Blocked:
    deliver: false
  Unknown:
    deliver: true
    requireForm: ['emote', 'template']
    rateLimit: '3/minute'
    profanityFilter: strict
  Acquaintance:
    deliver: true
    rateLimit: '20/minute'
    profanityFilter: standard
  Friend:
    deliver: true
    rateLimit: '60/minute'
    profanityFilter: light
  Trusted:
    deliver: true
    rateLimit: '120/minute'
    profanityFilter: none
  Authority:
    deliver: true
    bypassesPlayerBlocks: ['warning', 'system']
    rateLimit: 'unlimited'
```

---

## The MessageGate

A pipeline element between sender and receiver:

```ts
interface MessageGate {
  // Returns the sender-receiver-relative tier
  getTier(viewer: Stuff, sender: Stuff): TrustTier;

  // Apply policy to a candidate message
  process(viewer: Stuff, message: Message): Message | null;
  // null = dropped; transformed Message = filtered/formatted
}
```

Process order:

1. **Tier computation** — `effectiveTier(viewer, sender)`.
2. **Deliverability** — does the tier permit any delivery?
   If no, drop and (optionally) log.
3. **Form check** — is the message's form allowed for this
   tier? (Tier `Unknown` may only allow emote / template; a
   raw text message fails.)
4. **Rate-limit check** — has this sender exceeded their tier's
   rate? If yes, drop or queue.
5. **Filter pass** — apply per-tier filters (profanity, link
   stripping, length limits).
6. **Deliver** — forward to receiver's MML composer.

Each step can transform or reject the message.

---

## Per-source-type metadata

### Players

Every player is in a tier from each receiver's perspective.
Default for unrecognized: `Unknown`. Player-to-player messages
go through MessageGate.

A new account is `Unknown` to everyone. The player can elevate
specific players via friend-bucket assignment. Recognition by
itself elevates only to `Acquaintance`.

### NPCs

NPCs inherit trust from their **zone** unless individually
elevated:

```ts
zone.trustLevel: 'core' | 'verified' | 'sandboxed';
```

| Zone trust | NPC default tier (to a player who hasn't elevated) |
|---|---|
| `core` | Acquaintance |
| `verified` | Acquaintance |
| `sandboxed` | Unknown |

A core-zone NPC (a tutor in the official chemistry lab) can
send full text. A sandboxed-zone NPC (in a player-authored area
not yet vetted) defaults to emote-only or template messages.

This is the **anti-malicious-content infrastructure**. A griefer
authoring a zone with abusive NPCs can't get those NPCs to send
arbitrary text to players without admin promotion of the zone.

Players can manually elevate specific NPCs they want to
interact with normally — adds the NPC to a recognition record
with bucket assignment.

### System

System-generated messages (login banners, server notices)
bypass MessageGate via the `Authority` tier with a system role.

---

## Constrained communication forms

For low-trust senders (Unknown tier), arbitrary text isn't
allowed. Instead, constrained forms:

### Emotes

A curated set of pre-defined emote actions:

```
wave, nod, smile, frown, bow, shrug, point, clap, dance,
applaud, sigh, groan, laugh, cry, jump
```

Each emote is a templated message: *"Bob waves at you."*
Players fill emote at the sender; the framework renders it at
the receiver. Safe by construction; expressive enough for basic
communication; impossible to use for harassment.

### Templates

Pre-defined message templates with limited slots:

- *"<sender> says hello to <target>."* (Greeting)
- *"<sender> asks <target>: are you a student here?"*
- *"<sender> offers <target> a high five."*

The template fills via verb (`greet target`, `ask-student
target`); the rendered message is fixed-form. Useful for
authored NPCs in sandboxed zones or for newly-met strangers
before they've earned trust.

### Constrained text

Some tiers may allow free text but with constraints:

- Length-capped (max 100 chars)
- Profanity-filtered
- Link-stripped

A player in `Acquaintance` tier can send text but it's filtered;
a player in `Friend` tier sends near-unfiltered.

---

## Authority override mechanics

Mods, staff, and faculty roles get the `Authority` tier
universally. They can:

- Send warnings / system notices that bypass player blocks.
- Override per-zone policies (mute a zone temporarily).
- Inspect message logs for moderation.
- Forcibly elevate or demote tiers (kick a player to `Blocked`
  globally).

This is heavy power; a strong audit trail attaches to authority
actions. Authority role is granted server-side, not earnable in
gameplay.

A player can mute warnings from a specific authority figure
only by escalating to that figure's authority chain (file a
complaint with the head moderator, etc.) — out-of-band, not a
gameplay action.

---

## Message logging for moderation

All messages flowing through MessageGate can be logged with
metadata: sender, receiver, sender's effective tier, action
taken (delivered / filtered / dropped). Authority tier
moderators query the logs.

Log retention is server-policy. Defaults:

- Delivered messages: 30 days
- Dropped messages: 90 days (longer because they're more
  likely to need review)
- Authority actions: indefinite

---

## Worked scenarios

### Scenario A — sandboxed NPC tries to spam a player

```
[player Mara is in a player-authored zone]
[NPC ZoneCreatedByGriefer attempts to send: "Click this URL
 you'll love it..."]

MessageGate processes:
  effectiveTier(Mara, NPC) = Unknown (zone.trustLevel = sandboxed)
  policy.requireForm = ['emote', 'template']
  message form = 'free-text' → REJECTED
  log: sandboxed-zone NPC attempted unrestricted-form message; dropped
```

Mara never sees the message. The author of the zone might be
flagged for review.

### Scenario B — friend at a party

```
[Mara's friend Bob sends: "this party is wild! 🎉"]

MessageGate processes:
  effectiveTier(Mara, Bob) = Friend
  policy = light profanity filter, normal rate
  message form = 'free-text' → permitted
  filter pass: clean
  → delivered to Mara's MML composer
```

Mara sees: *"Bob: this party is wild! 🎉"*

### Scenario C — blocked foe attempts contact

```
[Mara has blocked Greg → bucket 'foes']
[Greg sends: "hey come on, talk to me"]

MessageGate:
  effectiveTier(Mara, Greg) = Blocked
  policy.deliver = false
  → DROPPED
  log: blocked-tier sender; dropped
```

Mara never sees Greg's message. Greg may or may not be told
his message was blocked (server policy).

### Scenario D — moderator warning

```
[Mod Alice issues warning: "Please refrain from spam in
 public channels."]
[Alice has Authority tier; receivers include some who blocked
 Alice (rare but possible)]

MessageGate processes for each receiver:
  effectiveTier = Authority
  policy.bypassesPlayerBlocks = ['warning']
  → delivered even to receivers who blocked Alice
```

The warning reaches everyone in the targeted scope. Audit
trail records the action.

---

## What this stresses for existing slates

### Recognition slate

Recognition state is the primary input. The MessageGate calls
into recognition store for every message. Performance: lookup
must be fast (per-player Map; in-memory cache).

### Social graph slate

Bucket assignments are read for tier resolution. Both system
buckets (`friends`, `foes`) and user-defined ones map to tiers
via the bucket's `trustTier` field on the SocialBucket.

### Messaging subsystem (api/mml.ts)

The MessageGate sits between message production and MML
composition. The composer can assume messages reaching it are
already gate-cleared.

### Persistence

Per-player tier-policy overrides + message logs at scale.
Persistence requirements similar to recognition — lots of
records, fast lookup, durable.

### Authoring tools

Zone metadata for trust level needs author UI. A new zone
defaults to `sandboxed`; admin must promote to `verified` or
`core`. Zone authors should know their zone is sandboxed and
what that means for NPC messaging.

---

## Open questions

1. **Tier defaults** — table above is a sketch; concrete
   numerical rate limits and filter strictness need playtesting.
2. **NPC tier escalation by player** — how does a player
   manually elevate a sandboxed NPC's trust? Probably a `trust
   X` verb that bumps the NPC to Acquaintance for the player
   only.
3. **Zone trust levels and admin process** — workflow for
   promoting a zone from sandboxed to verified to core.
   Out-of-band; depends on server admin model.
4. **Drop-vs-bounce** — does Greg get told his message to Mara
   was dropped (by being blocked)? Privacy concern (Mara
   doesn't want Greg to know they're blocking) vs UX
   (Greg-the-genuine-stranger-not-griefer might be confused).
   Lean: silent drop; Greg's message looks delivered to him.
5. **Self-messaging** — a player to themselves (notes,
   self-talk). Tier? Trusted, presumably.
6. **Group communication channels** — do channels have their
   own tier rules? A guild channel may be Friend-tier
   regardless of individual relationships. Compose channel-
   level + sender-level policy?
7. **Indirect communication** — A says something to B; B is
   in a room with C. Does C see it? Public emit, yes; tell-
   style direct, no. The gate runs per-receiver.
8. **Constrained-form vocabulary** — emote roster size,
   template count. v1 starts with ~20 emotes, ~10 templates.
9. **Rate limits in dense rooms** — a player in a 200-actor
   room receives many messages. Per-source rate limits help;
   need an additional global aggregate-receive cap?
10. **Cross-zone trust** — a player from zone A enters zone B.
    Their player tier is computed per receiver, not zone-tied.
    NPCs are zone-tied. Confirm this is the right model.
11. **Trust elevation via gameplay** — can a stranger earn
    Acquaintance through quest completion / introduction? For
    players, recognition (via introduction event) does this.
    For NPCs, the player may need a manual elevation verb.
12. **Authority abuse safeguards** — what prevents a rogue
    moderator from harassing? Audit trail + oversight role
    above moderator (admin / head-mod). Out-of-band.
13. **Off-platform reporting integration** — a player reports
    harassment; does it integrate with off-platform
    moderation tooling? Server-policy; out of substrate
    scope.

---

## Build order

**Wave 1** — substrate.

- `MessageGate` pipeline element + `effectiveTier` resolver.
- Tier policy registry; per-tier defaults.
- Message routing changes: every message routes through gate.

**Wave 2** — sandbox / zone trust.

- `zone.trustLevel` field; default `sandboxed` for new zones.
- NPC tier inheritance from zone.
- Player-elevate-NPC verb.

**Wave 3** — constrained forms.

- Emote system (verbs + templates).
- Template message system.
- v1 emote roster, v1 template roster.

**Wave 4** — moderation tools.

- Authority role + privileges.
- Message log + retention.
- Authority verbs (warn, mute, kick, log-query).

**Adjacent / future**:

- ML-based content filtering integration (per-tier
  configurable).
- Off-platform moderation integration.
- Trust-elevation gameplay paths.

---

## What this slate does NOT cover

- **Specific emote / template content** — small content
  packages; not framework.
- **Profanity-filter implementation** — pluggable per-tier;
  v1 uses a simple word-list filter, replaceable later.
- **Authentication / identity** — handled at OAuth / session
  layer, not here.
- **Moderation UX** — moderator dashboards, complaint
  workflows, escalation. Out-of-band; this slate provides
  the substrate.
- **Inter-server moderation** — federated trust sharing.
  Far-future.
- **AI/ML content moderation** — the substrate exposes
  filter hooks; specific ML models aren't here.
