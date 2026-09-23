# Comms slate (working doc)

> **Status: PARTIAL** — wave 1 shipped: the two-transport model,
> `say`/`whisper`/`shout` with `meta.acousticDb`, `say --to`/`shout --to`, the
> whisper-vs-tell split, `dm`/`tell`/`reply`/`broadcast` over the `CommsMixin`
> hosted update →
> [comms.md](../../subsystems/comms.md); channels graduated to
> [chat.md](../../subsystems/chat.md); the `<chan>` chip to
> [message-rendering.md](../../subsystems/message-rendering.md)
> **Left:** speech on the acoustic reach walk at all (today every speech
> verb reaches the room and only the room — `acousticDb` is a stamp nothing
> reads for speech; a shout does not leave the room) · dynamic-reach shout
> (the voice-projection attribute + the vitals tie) · whisper's redacted
> overhear form · language gating on acoustic + encoded-cognition
> implant · the first-class conversation primitive ·
> implant security (spoofing / interception) + the hardened-baseline
> guarantee · the implant dependency as written (universal — but only
> Avatars carry one; the per-NPC implant + remote-NPC `tell` + the
> `addressed` responder trigger) · DM addressing (Q1) · persistent
> history lifetime (Q5) · directed-say multi-target (Q8) · the moderation
> control plane + the trust-tiered policy · async mail
> **Size:** a wave

Working slate for **communication** — how beings talk to each other,
near and far. It's the integrating spine: speech, DMs, group chats, and
named channels all live here as a coherent family, with the mechanics
handed off to the slates that own them.

The load-bearing decisions shipped — see [comms.md](../../subsystems/comms.md):
two honestly distinct transports (§ Two transports — the table), the implant
as cybernetic in mechanism and ESP in phenomenology (same section), directed
speech as an option via `--to` (§ Directed speech — `say --to`), and
`whisper` split out of `tell` as acoustic (§ The verb surface;
`whisper.yaml` + `dm.yaml`).

See also:

- [docs/slates/senses-slate.md](../tails/senses-slate.md) — acoustic propagation/
  reach/masking (the *hearing* channel of the unified `PerceptionChannel`
  substrate, which absorbed the sound slate); `say`/`whisper`/`shout` are
  sound sources it models. Comms *consumes* this for the acoustic family.
- [docs/slates/language-slate.md](../tails/language-slate.md) — comprehension
  gating; a translation implant dissolves it.
- [docs/slates/augmentation-slate.md](../tails/augmentation-slate.md) — the cybernetic
  cognitive-interface device + augmentation framework that carries the
  implant transport. Comms is its first/baseline consumer; DM is the
  tutorial on-ramp.
- [docs/slates/chat-slate.md](../tails/chat-slate.md) — the **channel system**
  (the implant family's big subsystem): the projection-over-social-graph
  model, membership/subscription, roles, config, the `chat <channel>`
  surface. Comms defines the conversation primitive + transport; chat
  owns the channel model on top.
- [docs/slates/emotes-slate.md](../tails/emotes-slate.md) — expression riding
  the implant/ESP channel; emotes are perceived near or far over it.
- [docs/slates/senses-slate.md](../tails/senses-slate.md) — **ESP is a
  sense-channel family** (verbal = language-gated, emotive = language-
  free); the implant is its organ. Reception *is* sensing; comms delivers
  *on* these channels. (Acoustic speech rides the hearing channel.)
- [docs/slates/npc-dialogue-slate.md](../tails/npc-dialogue-slate.md) — NPC
  responders consume directed speech (and implant DM for remote NPCs).
- [docs/subsystems/messaging.md](../../subsystems/messaging.md) — the Scene
  composer + delivery chokepoint; comms is a new audience-resolution
  source feeding it.
- [docs/design-philosophy.md](../../design-philosophy.md) — Principle 2
  (model honestly) drives the diegetic-channels stance and the
  two-transport honesty; Principle 3 lets one mechanism render as a
  friendly `[Gossip] …`.

---

## Principle

*1, 2 and 4 shipped → comms.md § Two transports, § `meta.acousticDb`
stamping (reach is the senses substrate's); chat.md intro (all-diegetic).*

3. **Frictionless baseline.** The implant is universal and always-on, so
   DM/chat are zero-friction; richer media/features are opt-in depth
   (implant slate).

---

## Acoustic family — say / whisper / shout

*`say` / `whisper` / `shout` shipped at 60 / 30 / 90 dB → comms.md § Acoustic.*
*One whisper design point remains:*

- **whisper** → low dB, short reach, *usually directed* (you whisper to
  someone); overhearers get the redacted form *"X whispers something to
  Y"* — the hidden content is the **words** (a speech feature; contrast
  emotes, which have no hidden content).

**Dynamic-reach shout** falls out for free: shout is just a *louder
sound source*, and the sound slate already computes who hears a loud
source across rooms. The skill/attribute hook = the speaker's output dB
scales with a **voice-projection attribute** (and clarity degrades with
distance — acoustic attenuation, see senses.md). Nice ties: vitals (exhaustion/lung
capacity throttles it) and a future oratory/projection skill.

### Directed acoustic speech

*Shipped → comms.md § Directed speech — `say --to` (`say --to` / `shout --to`,
public but addressed, the three-audience render, the target-frame seam).*

---

## Implant family — tell/DM, chat channels

Reach here is **membership/addressing**, not space. One routing
primitive at different sizes:

| Form | Members | Identity | Lifetime |
|---|---|---|---|
| **DM / tell** | 2 | ad-hoc (generated id) | ephemeral or pinned |
| **group** | N | ad-hoc id, optionally named | until disbanded |
| **chat channel** | open / role-scoped | a stable name (`Gossip`, a guild) | persistent |

**Thoughts willed into existence → attribution is the trust boundary.**
Stated in [comms.md § Two transports](../../subsystems/comms.md) (implant
comms are *gated by attribution only; no sensory gate*) and § Deferred
(*Implant security*: spoofing is the high-end threat; the baseline is
hardened against casual jamming by design; the espionage/horror layer is
its own wave — the backlog half, in `Left`).

**Language still applies (lean).** Two readings of "willed thought":
(i) pure pre-linguistic *meaning* (implant transcends language), or
(ii) *encoded cognition* (you think in a language; the receiver needs it,
or a translation implant). *Lean (ii)* — it keeps the language slate
load-bearing, makes the translation implant a meaningful upgrade, and
preserves the pedagogy. Acoustic stays language-gated regardless.

---

## The implant dependency

The implant is the baseline form of a broader system, its own slate
([augmentation-slate.md](../tails/augmentation-slate.md)).
Comms commits only to:

- A **universal, always-on baseline implant** (standard-issue;
  educational framing: issued on enrollment) providing DM + chat + emote
  perception, frictionless.
- **DM as the tutorial on-ramp** to the broader implant/augmentation
  system.
- The **hardened-baseline** guarantee (basic comms/emotes never break
  from casual gameplay; only exotic attacks degrade them).

Everything else about implants — slots, tiers, install-as-medical-
procedure, failure modes, non-comms augmentations — lives in the implant
slate.

---

## Provenance & UI

*Shipped → message-rendering.md (`<chan id>` chip, `chatTemplate`, the
tagged-complete-string model), chat.md § Posting (`meta.channelId` routing),
cockpit.md (the `chat` mode; the client `ChatSurface`).*

## NPC reachability

In-person NPCs (barkeep) → acoustic `say` (optionally `--to`). Remote
NPCs (dispatcher, squad medic) → implant DM, requiring the NPC be
addressable + responsive (the responder is the **npc-dialogue slate**).
"Has an implant / is addressable" is a per-NPC content flag.

## Moderation

The expression-policy gate (emotes slate) spans **all** families — it can
restrict a player to emote-only, or gag their say/shout/chat — and keys
on the conversation/channel identity comms surfaces.

### Trust-tiered policy (deferred)

Deferred game-design layered on the shipped substrates, not a new
mechanism. The kernel: **recognition is a security primitive.** How
familiar a sender is to a receiver — read off the recognition substrate
([recognition-slate.md](../tails/recognition-slate.md)) plus the receiver's
social buckets ([contacts.md](../../subsystems/contacts.md)) — gates *what
kinds* of messages that sender may direct at them. A stranger's reach is
narrow; a friend's is wide. The point is protecting players from
harassment and griefing without an OOC moderation layer: the wall falls
out of who-knows-whom, in-fiction.

The trust-tier sketch — **stranger → acquaintance → trusted** — is a
*concept*, a gradient riding the existing grouping
([grouping.md](../../subsystems/grouping.md)) + contacts + recognition
state, **not** a standalone gate, an `effectiveTier` reader of bare
Stuff fields, or a `trustPolicies` registry. A receiver's familiarity
with a sender narrows or widens the permitted message kinds; recognition
plus bucket membership is the input, the methods-only inter-Stuff
contract is the access path. No new registry — exhaust the shipped
recognition/grouping/contacts surfaces first.

The sharpest concern is **maliciously-authored zone NPCs**: a griefer
who authors a zone shouldn't be able to have its NPCs spray arbitrary
messages at players. That trust is expressed through the *shipped*
[AccessApi](../../subsystems/access.md) / Zone `ownerGroup`–`accessGroups`
model — an NPC's reach derives from how trusted its owning zone is —
**not** a bespoke `zone.trustLevel` enum. An untrusted zone's NPCs are
treated as strangers to the player.

Authority/audit overrides all tiers: staff can always see and intervene
(warnings, mutes, review), per the shipped access model. This is the
out-of-band moderation floor under the in-fiction gradient.

**Explicitly dropped:** the old "emotes as a constrained safe-mode
fallback for low-trust senders" idea. Emotes are a full first-class ESP
channel (emotes-are-magic; [emotes-slate.md](../tails/emotes-slate.md)), not a
moderation safe-mode — a narrowed sender isn't pushed into emote-only as
a sanitized substitute for speech.

---

## Worked scenarios

- *Room chat (acoustic, undirected) — shipped: comms.md § Acoustic.*
- **Order a drink (acoustic, directed):** `say --to barkeep one beer
  please` → room hears "Bobalu says to the barkeep, …"; the barkeep's
  responder is triggered (dialogue slate).
- **Shout across the map (acoustic, dynamic reach):** `shout HELP` →
  loud source; projection attribute sets dB; sound slate computes who, in
  which rooms, hears it (faint at the edges).
- *DM a friend (implant) — shipped: comms.md § Implant — dm / tell.*
- *Guild chat — chat-slate § Worked scenarios ("Guild chat,
  group-projected"); the attributed-thought delivery and the channel chip
  shipped (chat.md § Posting, message-rendering.md).*
- **Remote NPC (implant):** `tell dispatcher status?` → reaches the
  dispatcher's responder over the implant.

---

## Open questions

1. **Addressing.** How you get someone's DM handle — directory / must-
   have-met / contacts list? *Lean: contacts/handle with in-fiction
   acquisition.*
2. *Resolved: open (standalone) · roster (a managed group) · bound (a
   party's or committee's `GroupRef`) — chat.md § Three channel kinds,
   § Bound channels.*
3. *Regional channels → moved verbatim to chat-slate § Open questions Q6
   (cluster pass; chat owns the place-binding axis).*
4. **Language × implant: (i) vs (ii).** *Lean (ii) — encoded cognition,
   translation-implant stays meaningful.*
5. **Persistence/history.** Channel logs / DM history as an implant
   *storage* capability (so even history is diegetic). Lifetime?
6. *Resolved: `chat anonymity <name> permit|forbid` + `--anon` — chat.md
   § `anonymity`.*
7. **Interception/privacy.** Acoustic overhearing (sound slate) vs
   implant hacking/tapping (security gameplay; the spoofing trust
   boundary).
8. **Directed-say multi-target?** `--to` a small group within the room.
9. *Resolved: attunement = `AetherMixin` (perceive + host), transmit = the
   `CommsMixin` hosted update — comms.md § Comms is a hosted update,
   augmentation.md.*

---

## Build order

Indicative; big subsystem, several cycles.

*Wave 1 shipped → comms.md. The first-class conversation primitive did
not — carried in § Implant family.*

*Wave 2 shipped → chat.md, message-rendering.md, cockpit.md — except the
moderation expression-policy handoff (§ Moderation).*

**Wave 3 — depth.** Dynamic-reach shout tuning (projection attribute,
vitals tie); regional channels; interception/security on richer implant
media; identity/anonymity.

**Adjacent / future:** async mail; the implant *system* (its own slate);
the comms side of the moderation control plane.

---

## What this slate does NOT cover

- **Acoustic physics** (propagation, reach, masking) → sound slate.
  Comms assigns the verbs; the sound slate computes who hears.
- **Comprehension / languages** → language slate.
- **The implant device & augmentation system** → implant slate. Comms
  commits only to the universal baseline + the hardened guarantee.
- **Emote vocabulary/grammar** → emotes slate. Comms transports remote
  emote perception over the implant channel.
- **NPC responders / dialogue** → npc-dialogue slate.
- **The moderation control plane** — comms surfaces channel identity to
  the policy gate; it doesn't own moderation.
- **Guild/party membership semantics** — comms consumes a membership set.

---

## Once shaped into formal requirements

This slate boils down to:

- The acoustic family wired to sound + language; `--to` directed speech;
  the `whisper`/`tell` split; shout's projection-attribute dynamic reach.
- The implant family: the conversation primitive (DM/group/channel),
  attribution-as-trust-boundary, the language (ii) lean, the baseline-
  implant dependency + hardened guarantee.
- NPC reachability (acoustic in-person, implant remote) feeding the
  dialogue responders.
- The moderation handoff (channel identity → expression-policy gate).
- Tests: a directed say is public but addressed (target triggered); a
  shout's reach scales with projection + attenuates; a DM reaches only
  its participants; a channel reaches tuned members; an unreachable
  target fails cleanly.

Channels-depth, the implant system, async mail, interception/security,
and identity wait for their own waves/slates.
