# Comms

The communication substrate — how beings talk to each other, near
and far. Comms is the integrating spine over two **honestly distinct
transports**: an **acoustic** channel (you *hear* it — `say`,
`whisper`, `shout`) and an **implant / ESP** channel (you *know* it,
a thought arriving — `dm` / `tell`). It owns the speech verb family
and the directed-message primitive; it hands the rest off — acoustic
reach to the senses substrate, the channel model to
[chat](./chat.md), and frame composition / delivery to
[messaging](./messaging.md).

This doc covers what Wave 1 shipped: the verb surface, the
`meta.acousticDb` stamping, the `say --to` directed-speech path, and
the whisper-vs-tell transport split. The channel half (named, lived-in
chat channels) graduated into [chat](./chat.md); the unbuilt waves
(dynamic-reach shout, regional channels, the conversation primitive,
implant security) are flagged in **Deferred** below.

## Two transports — acoustic vs implant

The load-bearing decision: communication travels one of two ways, and
they are *not* the same medium.

| | **Acoustic** | **Implant (ESP)** |
|---|---|---|
| comm types | `say`, `whisper`, `shout` | `dm` / `tell` (+ chat channels, remote emote) |
| perceived via | the senses — you *hear* it | direct cognition — you *know* it |
| modality stamp | `meta.modality: 'hearing'` | `meta.modality: 'verbal-esp'` |
| gated by | sound reach, hearing, language | attribution only; no sensory gate |
| reach | physical space (distance, walls) | membership / addressing (distance-free) |
| privacy | public, overhearable | private, addressed |
| carrier mixin | `VocalMixin` | `AetherMixin` |

Acoustic is local, atmospheric, overhearable, and (eventually)
language-bound; implant is distance-free, private, and "magic." The
two mixins compose independently onto a host — a character can be
Vocal without being Aether (mute, or pre-augmentation) and Aether
without Vocal (post-vocal-loss with an implant). See
[messaging.md § VocalMixin / AetherMixin](./messaging.md) for the
capability split and the Containable-wins audience rule both share.

Diegetically the implant is **cybernetic in mechanism, ESP in
phenomenology** — a neural interface delivering coherent thoughts
willed into existence, bypassing the sense organs. The same Aether
substrate carries DMs, chat channels, and the remote perception of
emotes. The baseline AetherImplant is universal and always-on for
players (see [augmentation.md](./augmentation.md)), which is why
`dm` / chat are zero-friction.

## The verb surface

Six verbs ship across the two transports. Three acoustic (gated by
`VocalMixin`), one implant directed-message (gated by `AetherMixin`),
plus the two Aether pronoun/broadcast verbs that ride alongside.

| Verb | YAML | Controller | Transport | Mixin method |
|---|---|---|---|---|
| `say` (`'`) | `cmd/say.yaml` | `SayController` | acoustic | `VocalMixin.say` |
| `whisper` | `cmd/whisper.yaml` | `WhisperController` | acoustic | `VocalMixin.whisper` |
| `shout` | `cmd/shout.yaml` | `ShoutController` | acoustic | `VocalMixin.shout` |
| `dm` / `tell` | `cmd/dm.yaml` | `DmController` | implant | `AetherMixin.tell` |
| `reply` | `cmd/reply.yaml` | `ReplyController` | implant | cohort replay of `tell` |
| `broadcast` | `cmd/broadcast.yaml` | `BroadcastController` | implant | `AetherMixin` |

The acoustic verbs are contributed via
`VocalMixin.commandContributions.self`
(`['say.yaml', 'whisper.yaml', 'shout.yaml']`); the implant verbs via
`AetherMixin.commandContributions.self`
(`['dm.yaml', 'reply.yaml', 'broadcast.yaml', 'chat.yaml']`). The
`chat.yaml` contribution is the channel surface — its substrate lives
in [chat](./chat.md), not here.

Each controller is a thin composition-narrowing + outcome-reporting
shell: it checks the host carries the right capability mixin
(`MixinApi.isVocal` / `MixinApi.isAether`), reports a `mixin-missing`
note + "You cannot speak." self-frame if not, then delegates to the
mixin method that owns the prose and the Scene composition.

### Acoustic — say / whisper / shout

One primitive — **vocalize at volume V** — with three presets. The
shared `vocalEmit` helper in `VocalMixin` composes the body and fires
the Scene; the verb word ("say" / "whisper" / "shout") drives the
prose and the dB + topic come from the calling method.

- **`say`** — normal volume (60 dB), room reach, undirected by
  default. Topic `world.speech.say`.
- **`whisper`** — quiet (30 dB), short reach. Topic
  `world.speech.whisper`. `whisper.yaml` makes `target` a **required**
  positional arg — whisper is implicitly directed (you whisper *to*
  someone).
- **`shout`** — loud (90 dB), multi-room reach. Topic
  `world.speech.shout`.

All three stamp `meta.modality: 'hearing'` for sensorium gating, and
emit to peers via the Containable-wins rule (a Containable speaker
addresses its environment's peers; a pure-Container speaker — a
haunted room — addresses its own contents). See
[messaging.md](./messaging.md) for that rule's detail.

### Implant — dm / tell

`dm` (alias `tell`) is the directed-message verb. `dm.yaml` takes a
`type: objects` target with `cardinality: { min: 1, max: 10 }` at
`scope: online`, plus a greedy `message`. It carries the
`requiresVerbalESP` validator so a host without an active implant is
turned away before dispatch. `DmController` delegates to
`AetherMixin.tell`, which stamps `meta.modality: 'verbal-esp'` and
fires `world.speech.dm`.

Three cardinality cases inside the controller:

1. **Single target** → `speaker.tell(target, message)` — the classic
   1:1 rendering ("X → Y: msg" to self, "X → you: msg" to target).
2. **2–10 targets** → opens an **ad-hoc Channel** via
   `ChatApi.openAdHoc` so subsequent `chat <handle> ...` posts route
   to the same cohort, then `speaker.tell(targets, message, {
   channelId })`. The ad-hoc channel half is documented in
   [chat.md § Three channel kinds](./chat.md).
3. **> 10 targets** → refused with a `controller-rejected`
   (`recipient-cap-exceeded`) note and a self-frame steering the
   player to `chat make <name>`. Groups that size belong on a real
   channel with membership / subscription / moderation.

DM **cohort state** (`getLastInboundCohort` / `getLastOutboundCohort`)
lives on `AetherMixin` itself, stamped automatically by `tell` —
runtime-only, never persisted, reset when the host destructs (logout
for Avatars). `reply` / `dm .` consume it for reply-all. The `dm
<ad-hoc-handle> ...` post-to-known-channel shape is **not** in v1;
posting to an ad-hoc cohort goes through `chat <handle> ...`.

## `meta.acousticDb` stamping

The single piece of physical-reach metadata comms contributes is
`meta.acousticDb` — the **source level** in decibels, stamped on every
acoustic frame for the sound-propagation walk's reach computation.
`VocalMixin` holds a flat per-verb table:

```ts
const DB = { whisper: 30, say: 60, shout: 90 } as const;
```

Reach is *not* computed here — that's the senses substrate's job.
Comms only declares how loud the source is; who actually hears it
(distance, walls, masking) is resolved downstream. The implant family
carries no `acousticDb` at all — implant reach is membership, not
space.

**v1 ceiling**: these are flat scalars — every speaker shouts at the
same volume regardless of size, condition, or skill. The vitals
substrate (deferred) is the natural seam to vary `acousticDb`
per-speaker (constitution / projection / fatigue); when it lands, the
constant lookup becomes a computed value.

## Directed speech — `say --to`

Directedness is an **option, not a default** — `say` is undirected
room chat ~95% of the time, so addressing opts in via `--to` rather
than guessing whether the first word is a name or the message.
`say.yaml` and `shout.yaml` carry a `to` option (`short: t`, `type:
object`, `scope: online`, `field: target`) with a `mustBeAgent`
validator. `whisper` is always-directed, so it takes `target`
positionally instead.

The general rule comms follows: **free-prose-tail verbs direct via
`--to`; structured-tail verbs direct positionally** (`say --to iffy
…` vs the emote `smile iffy`).

Directed speech is **public but addressed** — the room still hears,
and the target gets its own target-frame. `vocalEmit` renders three
audiences when a target is present:

- self — "You say to *Y*, …"
- peers — "*X* says to *Y*, …"
- target — "*X* says to you, …"

The target-frame is what marks an NPC as being spoken *to* — the seam
a future dialogue responder keys on. Without `--to`, only the self
and peers frames render ("You say, …" / "*X* says, …").

## Relation to messaging and chat

Comms is a **source** feeding the [messaging](./messaging.md)
pipeline, not a parallel one. Every verb composes through
`MessageApi.scene` and goes out the single `MessageApi.sendMessage`
delivery chokepoint:

- **MML / Scene composer** — `messaging.md` owns the
  actor/target/peers audience taxonomy, MML body composition, the
  markdown→MML pipeline (so `**bold**`, `@name` mentions, and
  `[label](mudcmd:…)` work in speech bodies), and `commandId` /
  `causingCommandId` auto-attribution. Comms supplies the verb prose
  and the topic/modality/meta stamps; the composer does the rest.
- **Reception gating** — the `'hearing'` vs `'verbal-esp'` modality
  stamp routes through `SensorMixin.filterMessage`, the same
  reception gate that drops implant frames for implant-less
  recipients. Acoustic frames additionally feed the senses
  substrate's reach walk via `acousticDb`.

The **channel half** of the comms design — named, persistent,
membered chat channels — shipped under [chat](./chat.md), not here.
Chat consumes the `AetherMixin` `'verbal-esp'` transport and the group
substrate; comms owns the speech verbs and the directed-message
primitive that *mints* the ad-hoc channel chat then manages. The
boundary: comms = the verb-to-transport family + 1:1 / small-cohort
directed messages; chat = the lived-in channel model on top of the
implant transport.

## Deferred

Wave 1 shipped the acoustic say/whisper/shout family, the `say --to`
directed path, and the `dm`/`tell` implant primitive. The
[comms slate](../slates/tails/comms-slate.md) retains the rest of the
design space. Designed but **not yet built**:

- **Dynamic-reach shout** — shout currently stamps a flat 90 dB. The
  designed extension makes output dB scale with a **voice-projection
  attribute** (and clarity degrade with distance via acoustic
  attenuation, see senses.md), with vitals (lung capacity / fatigue) throttling it.
  The `acousticDb` seam exists; the attribute does not.
- **Language gating** — acoustic comprehension (do you understand the
  words) routes to the language slate; the `'hearing'` frames carry no
  language metadata yet. Implant leans toward *encoded cognition*
  (you think in a language; the receiver needs it, or a translation
  implant) — also unbuilt.
- **Regional channels** — a channel scoped to a zone, bridging
  acoustic locality and implant networks. Open question in the slate.
- **The conversation primitive** — a first-class DM/group conversation
  object with its own identity and lifetime. v1 has the degenerate
  cases (1:1 `tell`, multi-target → ad-hoc Channel via chat) but no
  unified conversation entity.
- **Implant security** — attribution is the implant trust boundary
  ("this thought is *X*'s, not yours"); the high-end threat is
  spoofing (injected or impersonated thoughts). The baseline is
  hardened against casual jamming by design; the espionage/horror
  security layer is its own wave.
- **Async mail** and the **moderation control plane** (the
  expression-policy gate keying on channel identity) — adjacent
  futures.

## Related

- [messaging.md](./messaging.md) — the Scene composer,
  `MessageApi.sendMessage` delivery chokepoint, modality stamping,
  `SensorMixin.filterMessage`, and the `VocalMixin` / `AetherMixin`
  capability split with the Containable-wins audience rule.
- [chat.md](./chat.md) — the channel model riding the implant
  transport: `Channel` Documents, the three channel kinds, the ad-hoc
  channel `dm` mints, `ChannelCatalogue`.
- [emotes.md](./emotes.md) — expression riding the Aether/ESP channel;
  `SoulMixin` grants local emote, remote emote needs both `SoulMixin`
  and `AetherMixin`.
- [augmentation.md](./augmentation.md) — the baseline AetherImplant
  that makes `'verbal-esp'` universal for players and gates
  `AetherMixin` active.
- [message-rendering.md](./message-rendering.md) — end-to-end render
  of the frames comms emits (server MML + client parse + theme
  cascade).
- [comms slate](../slates/tails/comms-slate.md) — the full two-transport
  design and the deferred waves this doc's **Deferred** section
  summarizes.
</content>
</invoke>
