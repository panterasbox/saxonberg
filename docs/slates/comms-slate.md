# Comms slate (working doc)

> **Status: architecture set, internals open.** The communication
> substrate — the verb taxonomy, the two transports it spans, and the
> routing. It defines *what* the comm types are and *how they're
> addressed*; it delegates the physics (acoustic reach → sound slate),
> comprehension (→ language slate), the device (→ implant slate),
> expression (→ emotes slate), and NPC brains (→ npc-dialogue slate).

Working slate for **communication** — how beings talk to each other,
near and far. It's the integrating spine: speech, DMs, group chats, and
named channels all live here as a coherent family, with the mechanics
handed off to the slates that own them.

The load-bearing decisions:

1. **Two transports, honestly distinct.** Communication travels one of
   two ways, and they are *not* the same medium:

   | | **Acoustic** | **Implant (neural)** |
   |---|---|---|
   | comm types | say, whisper, shout | tell/DM, chat channels (+ remote emote perception) |
   | perceived via | the senses (you *hear* it) | direct cognition (you *know* it — a thought, willed, not sensed) |
   | gated by | sound physics, hearing, **language** | nothing sensory; **attribution** only |
   | reach | physical space (distance, walls, masking) | membership / addressing (distance-free) |
   | privacy | public, overhearable | private/addressed |
   | feel | atmospheric, in-the-world | a thought arriving, attributed |

   This dichotomy gives both transports a reason to exist: acoustic is
   local, atmospheric, overhearable, language-bound; implant is distance-
   free, private, and "magic." Players choose by what they want.

2. **The implant is cybernetic in mechanism, ESP in phenomenology.** A
   neural interface delivering *coherent thoughts willed into existence*,
   bypassing the sense organs. That's the single substrate carrying DMs,
   chat, **and** the remote/ESP perception of emotes — and it's *why*
   those feel like magic while being tech. (The emote slate's "ESP
   channel" *is* this implant channel.) The device/system is its own
   slate; comms defines only the dependency.

3. **Directed speech is an option, not the default.** `say` is
   undirected ~95% of the time (room chat). Directedness opts in via an
   option: `say --to barkeep one beer please` — keeping the common case
   untouched and dodging "is the first word a name or the message"
   ambiguity. (General rule: **free-prose-tail verbs direct via `--to`;
   structured-tail verbs direct positionally** — `smile iffy` vs
   `say --to iffy …`.)

4. **`whisper` is acoustic, not implant.** Today's `tell.yaml` groups
   `[tell, whisper]`, but they're different transports — `whisper` is a
   quiet *sound* (sound slate ~25 dB, maskable, overhearable);
   `tell` is the *implant* private channel. Split them.

See also:

- [docs/slates/senses-slate.md](./senses-slate.md) — acoustic propagation/
  reach/masking (the *hearing* channel of the unified `PerceptionChannel`
  substrate, which absorbed the sound slate); `say`/`whisper`/`shout` are
  sound sources it models. Comms *consumes* this for the acoustic family.
- [docs/slates/language-slate.md](./language-slate.md) — comprehension
  gating; a translation implant dissolves it.
- [docs/slates/augmentation-slate.md](./augmentation-slate.md) — the cybernetic
  cognitive-interface device + augmentation framework that carries the
  implant transport. Comms is its first/baseline consumer; DM is the
  tutorial on-ramp.
- [docs/slates/chat-slate.md](./chat-slate.md) — the **channel system**
  (the implant family's big subsystem): the projection-over-social-graph
  model, membership/subscription, roles, config, the `chat <channel>`
  surface. Comms defines the conversation primitive + transport; chat
  owns the channel model on top.
- [docs/slates/emotes-slate.md](./emotes-slate.md) — expression riding
  the implant/ESP channel; emotes are perceived near or far over it.
- [docs/slates/senses-slate.md](./senses-slate.md) — **ESP is a
  sense-channel family** (verbal = language-gated, emotive = language-
  free); the implant is its organ. Reception *is* sensing; comms delivers
  *on* these channels. (Acoustic speech rides the hearing channel.)
- [docs/slates/npc-dialogue-slate.md](./npc-dialogue-slate.md) — NPC
  responders consume directed speech (and implant DM for remote NPCs).
- [docs/subsystems/messaging.md](../subsystems/messaging.md) — the Scene
  composer + delivery chokepoint; comms is a new audience-resolution
  source feeding it.
- [docs/design-philosophy.md](../design-philosophy.md) — Principle 2
  (model honestly) drives the diegetic-channels stance and the
  two-transport honesty; Principle 3 lets one mechanism render as a
  friendly `[Gossip] …`.

---

## Principle

1. **Two transports, each honest** (acoustic = sensed; implant =
   willed). The dichotomy above is the spine.
2. **Diegetic throughout.** No OOC channel overlays — a chat channel is
   an implant network; a DM is a neural link. The implant is the
   in-fiction explanation for every non-acoustic channel.
3. **Frictionless baseline.** The implant is universal and always-on, so
   DM/chat are zero-friction; richer media/features are opt-in depth
   (implant slate).
4. **Routing is the work; physics is delegated.** For the implant family
   the design is *who's in the conversation* (addressing/membership). For
   the acoustic family comms just assigns verbs to the sound + language
   slates and stays out of the way.

---

## Acoustic family — say / whisper / shout

One primitive — **vocalize at volume V** — with three presets:

- **whisper** → low dB, short reach, *usually directed* (you whisper to
  someone); overhearers get the redacted form *"X whispers something to
  Y"* — the hidden content is the **words** (a speech feature; contrast
  emotes, which have no hidden content).
- **say** → normal dB, room reach; undirected by default.
- **shout** → high dB, multi-room reach.

**Dynamic-reach shout** falls out for free: shout is just a *louder
sound source*, and the sound slate already computes who hears a loud
source across rooms. The skill/attribute hook = the speaker's output dB
scales with a **voice-projection attribute** (and clarity degrades with
distance — sound-slate attenuation). Nice ties: vitals (exhaustion/lung
capacity throttles it) and a future oratory/projection skill.

Reach is the **sound slate**; comprehension (do you understand it) is the
**language slate**. Comms' only acoustic job: define the verb family,
wire the volume presets + the projection attribute, add the optional
`--to` addressee, and split `whisper` out of `tell`'s controller.

### Directed acoustic speech

`say --to <target> <message>` (and `shout --to`): public, but
*addressed* — the room still hears, the target is marked, and the target
frame is what signals an NPC it's being spoken to (the dialogue trigger).
Rendering mirrors emotes: self "You say to the barkeep, …", peers "Bobalu
says to the barkeep, …", target "Bobalu says to you, …".

---

## Implant family — tell/DM, chat channels

Reach here is **membership/addressing**, not space. One routing
primitive at different sizes:

| Form | Members | Identity | Lifetime |
|---|---|---|---|
| **DM / tell** | 2 | ad-hoc (generated id) | ephemeral or pinned |
| **group** | N | ad-hoc id, optionally named | until disbanded |
| **chat channel** | open / role-scoped | a stable name (`Gossip`, a guild) | persistent |

A DM is an unnamed 2-member conversation; multi-channel chat = you're
tuned into several at once, each its own conversation/buffer. The current
`tell` verb is the degenerate 2-member case (now cleanly *implant*, with
`whisper` moved to acoustic).

**Thoughts willed into existence → attribution is the trust boundary.**
Because an implant message is a thought appearing in your mind, the
baseline's most important guarantee is unmistakable attribution ("this
thought is Bobalu's, not yours"). The high-end threat is therefore
**spoofing** (a hacked implant injecting a thought you mistake for your
own, or impersonating someone) — espionage/horror gameplay for later. It
follows that the baseline empathic layer must be **hardened**: casual
jamming can't touch basic DM/chat/emotes; only exotic attacks reach the
trust boundary.

**Language still applies (lean).** Two readings of "willed thought":
(i) pure pre-linguistic *meaning* (implant transcends language), or
(ii) *encoded cognition* (you think in a language; the receiver needs it,
or a translation implant). *Lean (ii)* — it keeps the language slate
load-bearing, makes the translation implant a meaningful upgrade, and
preserves the pedagogy. Acoustic stays language-gated regardless.

---

## The implant dependency

The implant is the baseline form of a broader system, its own slate
([augmentation-slate.md](./augmentation-slate.md)).
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

Provenance (room vs channel vs DM vs which channel) is a **tagged label
in the complete message string** (a `<chan>`-style semantic region — so
it flattens to the failsafe AND the client renders it as a chip/color/
placement), **never hokey narrative** ("Over the radio, …" calcifies into
boilerplate) and **never stripped to bare metadata** (the string must
stay complete). The full model — tagged-complete-string → flatten/reflow
— is the [message-rendering slate](./message-rendering-slate.md). The two
transports have a natural phenomenological distinction the UI can lean on
(*heard* vs *a thought arriving / known*). Multi-channel chat needs the
per-conversation buffer/tab model (client-cockpit + console-filtering
slates).

## NPC reachability

In-person NPCs (barkeep) → acoustic `say` (optionally `--to`). Remote
NPCs (dispatcher, squad medic) → implant DM, requiring the NPC be
addressable + responsive (the responder is the **npc-dialogue slate**).
"Has an implant / is addressable" is a per-NPC content flag.

## Moderation

The expression-policy gate (emotes slate) spans **all** families — it can
restrict a player to emote-only, or gag their say/shout/chat — and keys
on the conversation/channel identity comms surfaces.

---

## Worked scenarios

- **Room chat (acoustic, undirected):** `say hey all` → everyone in
  earshot hears (sound-slate reach), comprehension per language slate.
- **Order a drink (acoustic, directed):** `say --to barkeep one beer
  please` → room hears "Bobalu says to the barkeep, …"; the barkeep's
  responder is triggered (dialogue slate).
- **Shout across the map (acoustic, dynamic reach):** `shout HELP` →
  loud source; projection attribute sets dB; sound slate computes who, in
  which rooms, hears it (faint at the edges).
- **DM a friend (implant):** `tell iffy meet me at the gate` → a 2-member
  conversation over the implant; private, distance-free, attributed.
- **Guild chat (implant channel):** post to `[Guild]` → all tuned
  members receive it as an attributed thought; renders with the channel
  chip.
- **Remote NPC (implant):** `tell dispatcher status?` → reaches the
  dispatcher's responder over the implant.

---

## Open questions

1. **Addressing.** How you get someone's DM handle — directory / must-
   have-met / contacts list? *Lean: contacts/handle with in-fiction
   acquisition.*
2. **Channel membership/gating.** open / role / invite / subscription;
   guild & party channels consume membership defined elsewhere.
3. **Regional channels.** A channel scoped to a zone (a bridge between
   acoustic locality and implant networks)? Worth considering.
4. **Language × implant: (i) vs (ii).** *Lean (ii) — encoded cognition,
   translation-implant stays meaningful.*
5. **Persistence/history.** Channel logs / DM history as an implant
   *storage* capability (so even history is diegetic). Lifetime?
6. **Identity / anonymity** on channels (handles/pseudonyms via implant).
7. **Interception/privacy.** Acoustic overhearing (sound slate) vs
   implant hacking/tapping (security gameplay; the spoofing trust
   boundary).
8. **Directed-say multi-target?** `--to` a small group within the room.
9. **The implant-system boundary** — confirm what stays in the implant
   slate vs comms at requirements.

---

## Build order

Indicative; big subsystem, several cycles.

**Wave 1 — acoustic cleanup + DM.** Wire say/whisper/shout to the sound +
language slates; add `say --to` / `shout --to`; split `whisper` (acoustic)
from `tell` (implant); the conversation primitive (DM/group) over the
baseline implant; subsume the old `tell`.

**Wave 2 — channels.** Persistent named chat channels + membership
rules; multi-channel client routing (per-conversation buffers);
attribution-by-context rendering; the moderation expression-policy
handoff.

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

- The **two-transport model** and the verb→transport assignment
  (say/whisper/shout = acoustic; tell/chat = implant).
- The acoustic family wired to sound + language; `--to` directed speech;
  the `whisper`/`tell` split; shout's projection-attribute dynamic reach.
- The implant family: the conversation primitive (DM/group/channel),
  attribution-as-trust-boundary, the language (ii) lean, the baseline-
  implant dependency + hardened guarantee.
- Provenance-as-tagged-label rendering (message-rendering slate) +
  conversation-id frame tagging + the
  client per-conversation buffers.
- NPC reachability (acoustic in-person, implant remote) feeding the
  dialogue responders.
- The moderation handoff (channel identity → expression-policy gate).
- Tests: a directed say is public but addressed (target triggered); a
  shout's reach scales with projection + attenuates; a DM reaches only
  its participants; a channel reaches tuned members; an unreachable
  target fails cleanly.

Channels-depth, the implant system, async mail, interception/security,
and identity wait for their own waves/slates.
