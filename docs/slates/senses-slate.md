# Senses slate (working doc)

> **Status: substrate set, forks leaned.** The unified perception
> substrate — all five senses as instances of one `PerceptionChannel`,
> a convenience "take in everything" verb, and the per-viewer percept
> model that feeds the inspection pane. **Absorbs and retires the old
> sound slate** (sound becomes the *hearing* instance).

Working slate for **the senses** — how a being perceives the world
across vision, hearing, smell, touch, and taste. Light (vision) is
shipped; sound (hearing) is slated; the two already mirror each other,
which proves the abstraction. This slate extracts that shared substrate
and hangs all five senses off it, plus the gestalt verb so a player
perceives a new room without typing five commands.

The load-bearing decisions:

1. **A sense is a `PerceptionChannel`.** One substrate; each sense is an
   instance with the same five parts (emission / propagation+medium /
   attenuation+masking / per-species sensitivity / pedagogical
   rendering). The physics differs per channel; the *design decisions*
   are shared. (This is the `PhysicsChannel` generalization the sound
   slate anticipated; `LightApi` and `SoundApi` already instantiate it
   informally.)

2. **Three physics families.** *Ambient/field* senses propagate and are
   perceived passively (vision, hearing, smell, ambient-temperature) —
   they share the source→medium→attenuation→Conduit→detection walk.
   *Contact/active* senses require an act + contact (touch-texture,
   taste) — "reaches you" = "you touched it." *Network* senses (ESP, via
   the implant) have no propagation/medium/falloff — uniform delivery to
   an addressed/tuned audience, routed by membership.

3. **A gestalt verb + auto-on-entry.** Perceiving a space is *one*
   action across all your senses, fired automatically on room entry —
   players type zero commands, not five. Single-sense verbs exist for
   deliberate focus.

4. **Perception is viewer-relative and capability-gated** (the percept
   model): a sense reveals facts gated by *(have the sense) + (signal
   reaches you / you made contact) + (skill/instrument)*. Two beings in
   the same room perceive different things. The senses substrate is the
   physics under the inspection-pane percept.

5. **Messaging *is* sensing — and ESP is a sense.** Anything that
   receives a frame is a `Sensor`; `SensorMixin.onMessage` *is* "a signal
   landed." So **every `MessageFrame` arrives on a channel, and the
   channel *is* the sense** that perceives it (speech → hearing, a wave →
   vision/ESP, a DM → ESP). Senses aren't a layer beside messaging —
   they're its **perceptual layer**. It follows that **ESP is a sense**
   (not a separate "comms" thing): the **implant is an artificial
   sense-organ** that adds ESP channels to your sensorium, the way eyes
   add vision. ("Senses are just brainwaves; an organ converts a signal
   to neural activity, an implant injects it directly — no principled
   difference.") ESP is a **channel *family*** — see below.

See also:

- [docs/subsystems/light.md](../subsystems/light.md) — **vision**, the
  shipped exemplar (`LightApi`, `canSee`, `visionProfile`, bands). The
  substrate aligns to its shape; vision converges gradually, not in a
  big-bang refactor.
- [docs/slates/sound-slate.md](./sound-slate.md) — **retired as a
  standalone slate**; its acoustic detail is the *hearing* instance
  (`SoundApi`, `hearingProfile`, dB/Hz/RT60, masking, Conduit
  transmissivity). Retained there until absorbed into the hearing build.
- [docs/subsystems/biome.md](../subsystems/biome.md) — the **atmosphere
  medium** (air/water/vacuum) smell diffuses through; ambient temperature;
  the instrument pattern (GasAnalyzer, Thermometer, Barometer…).
- [docs/subsystems/race.md](../subsystems/race.md) — **Material**
  (texture/hardness for touch); **Species** templates carry the
  per-sense sensitivity profiles.
- [docs/subsystems/quantities.md](../subsystems/quantities.md) — every
  channel's signal is a `Quantity<U>` (lux/dB/ppm/°C…) with friendly
  tags + instrument reveal.
- [docs/slates/vitals-slate.md](./vitals-slate.md) — body temperature
  (thermal), and consumables/eat-drink (the taste tie).
- [docs/slates/augmentation-slate.md](./augmentation-slate.md) — the
  **implant is an artificial sense-organ**; sensor augments *are*
  `PerceptionChannel`s; the baseline implant provides the ESP channels.
- [docs/subsystems/perception.md](../subsystems/perception.md) — the
  viewer-aware-query pattern; per-viewer Shadow overrides.
- [docs/slates/inspection-pane-slate.md](./inspection-pane-slate.md) /
  [message-rendering-slate.md](./message-rendering-slate.md) — the
  percept feeds the pane; the pedagogical seam (prose vs instrument)
  is the rendering.
- [docs/slates/access-slate.md](./access-slate.md) /
  verb-provisioning — **skills gate revelation *and* afford the verbs**
  that reveal (two sides of the same capability).

---

## Principle

1. **One substrate, five instances** — `PerceptionChannel`; physics
   differs, design is shared.
2. **Field vs contact** — propagate-and-perceive-passively vs
   act-and-touch.
3. **Perceive everything in one action** — the gestalt, auto on entry.
4. **Viewer-relative + capability-gated** — the percept model; the
   pedagogical seam renders it.

---

## The `PerceptionChannel` substrate (what's shared)

Each sense instantiates five parts; only the physics in each differs:

| Part | Vision | Hearing | Smell | Touch/temp | Taste |
|---|---|---|---|---|---|
| **emission** | light/reflectance | dB | odor concentration | temperature / texture | flavor compounds |
| **propagation + medium** | transparent media, Conduits | air/water/solid, Conduits | diffusion through atmosphere | contact / short radiant | contact only |
| **attenuation + masking** | falloff, occlusion | distance, louder-masks | distance + **time decay** | n/a (contact) | n/a (contact) |
| **per-species sensitivity** | `visionProfile` ✓ | `hearingProfile` ✓ | `olfactoryProfile` | `tactileProfile` | `gustatoryProfile` |
| **rendering (pedagogical seam)** | lux/Kelvin + prose | dB/Hz + prose | ppm + prose | °C / hardness + prose | concentration + prose |

The detection check is uniform: *the signal reaches the viewer above
their threshold, unmasked, and they have the sense.* Built once; each
sense plugs its physics in.

## The three physics families

- **Ambient/field** (vision, hearing, smell, ambient-temp): propagate;
  perceived passively; share the **source→medium→attenuation→Conduit→
  per-viewer-threshold** walk (the `LightApi`/`SoundApi` shape).
- **Contact/active** (touch-texture, taste): no propagation; require an
  act + contact. "Signal reaches you" collapses to "you touched it."
  (Ambient *temperature* is the one touch facet that's also a field —
  it lives in both, via biome.)
- **Network** (ESP, via the implant — see *ESP channels*): no
  propagation/medium/falloff; uniform delivery to an addressed/tuned
  audience, routed by membership not proximity. The implant is the organ.

One perception/detection *layer* over three propagation *models*.

---

## The five senses

### Vision (light) — shipped exemplar

`LightApi` + `canSee` + `visionProfile`. The substrate aligns to its
shape; converge it onto `PerceptionChannel` gradually (don't break
working vision).

### Hearing (sound) — absorbs the sound slate

The acoustic instance: dB SPL / Hz / RT60, propagation mirroring light,
`hearingProfile`, masking, Conduit channel-keyed transmissivity,
SoundLevelMeter. Substrate-level decisions live here; the deep acoustic
spec (worked examples, every seam) is retained in the retired
[sound-slate](./sound-slate.md) until absorbed into the hearing build.

### Smell (olfaction) — new

Diffusion through the **biome atmosphere** (medium already exists);
**GasAnalyzer** instrument already exists. *Unique physics:* **temporal
persistence** — a smell lingers after its source leaves → **scent trails
/ tracking** (a dog NPC, a tracking skill follows a fading gradient).
That time dimension is the one mechanic light/sound lack. `olfactoryProfile`
makes animals' noses far keener than ours.

### Touch / temperature — new (contact family)

Contact or short radiant. **Temperature** ties to the thermal `Quantity`
(Kelvin), vitals body-temp, biome ambient-temp (Thermometer exists);
**texture/hardness** read straight off the **Material** substrate (already
modeled). *Payoff:* you can **perceive in the dark** — feel your way,
sense a hot stove — vision-independent. `tactileProfile`.

### Taste (gustation) — new (contact family, narrowest)

Direct contact/ingestion; ties to the **consumables/diet** system
(vitals eat/drink) and Material chemistry. Gameplay: poison/spoilage
detection, flavor (sweet/bitter/…). `gustatoryProfile`.

---

## ESP — a channel family (the implant sensorium)

ESP isn't one sense and it isn't "comms-not-a-sense" — it's a **family of
`PerceptionChannel`s** carried by the **implant (an artificial
sense-organ)**, parallel to how the physical senses are a family. It's a
*third physics family* alongside field and contact: **network** — no
propagation/medium/falloff, uniform delivery to the addressed/tuned
audience, routed by membership (conversations/channels), not proximity.

Two channels ship (the split is **earned**, not arbitrary — it's exactly
the verbal/emotive line the language decision already drew):

| ESP channel | Carries | Gating | Renders to |
|---|---|---|---|
| **verbal / propositional** | words (DM, chat) | **language-gated** (the comms (ii) lean lives *here*) | comms buffer (text) |
| **emotive / expressive** | affect/intent (emotes) | **language-free** (a smile is universal) | the emote rendering |

(DM vs chat is *routing* within the verbal channel — conversations/
membership — not a separate sense.)

**Organ = the implant; gated like any sense, but ungated *by design*.**
A channel exists iff you have the organ (the implant); the baseline
implant is **universal among citizens + hardened**, so everyone has
verbal + emotive ESP and **emotes/DM/chat always land** — the ungating is
now *explained* (universal organ + network physics with no falloff/
masking), not merely asserted. Per-channel physics keeps it ungated even
though it's a sense.

**Multiplicity buys expressiveness** (the reason it's a family, not one
blob):

- **Implant tiers add channels** — a basic implant is verbal-only (text);
  a richer one adds emotive (you *feel* emotes, not just read them);
  future tiers add more. Channels-as-tiers = a progression hook, exactly
  like organs adding physical channels.
- **Innate variation** — a natural empath could have the emotive channel
  with no implant; a construct/AI might be verbal-only.
- **Independent jam/augment** — a dampener hits emotive but not verbal.
- **Distinct render** per channel (verbal → buffer, emotive → emote
  rendering).

**Deferred ESP channels (substrate open, like alien physical senses):**
imagery / sensory-share ("send me what you're seeing"), presence-
awareness (who's on the network), and a true **empathic *sense***
(perceive feelings nobody transmitted — distinct from receiving a
transmitted emote). Built when earned.

**The one open consequence:** organ-gating means **non-implant beings
(wild animals, primitive NPCs) lack ESP** → they don't perceive ESP-
delivered emotes/chat. Fine for players (universal implant). It surfaces
a real question: are emotes **purely telepathic** (a dog never perceives
your "wave"), or do they *also* throw a physical-expression signal on a
sensory channel (the dog sees you wave via vision)? *Lean: telepathic-
only* (consistent with the locked "emotes are magic/ESP"), with
physically-visible *actions* being a separate, genuinely-sensory thing —
but it's your call (Open Q below).

---

## Species & body-type: the sensorium

A being's senses aren't one field on the Species template — they're a
**three-layer interface** across race.md and vitals, mirroring the
vitals/anatomy model:

| Layer | Question | Where |
|---|---|---|
| **organ** | does the channel *exist*? | **`BodyPlan`** — a `PerceptionChannel` is enabled iff the BodyPlan has the organ (eyes / ears / nose / a bat's larynx+ears / a viper's pit organs). No eyes → no vision channel at all. |
| **profile** | how is it *tuned*? | **`Species`** — `visionProfile`/`hearingProfile`/`olfactoryProfile`/`tactileProfile`/`gustatoryProfile` (additive, the established pattern). A bat hears into ultrasound; a dog's nose dwarfs ours. |
| **condition** | is the organ *working*? | **instance / vitals** — a damaged eye dims vision; a lost ear cuts hearing. Senses plug straight into anatomy + organ condition. |

So: **organ (present?) × profile (tuned how?) × condition (intact?) →
the channel and its quality.** Senses sit exactly at the race.md ∩
vitals seam.

### Senses humans lack are just new channels

Adding a sense we don't have is *not* special-casing — it's one more
`PerceptionChannel` instance + the organ on the BodyPlan + the profile
on the Species:

- **Echolocation** (bat, dolphin) — an **active sense**: emit a chirp,
  perceive the *reflection*; reveals **shape / distance / motion**
  (spatial info, like vision, but from sound). This needs a new
  substrate sub-pattern: **emit-and-perceive-the-return**, vs passive
  field reception.
- **Magnetoreception** (heading), **electroreception** (prey muscle
  activity), **infrared pit-sensing** (remote heat → thermal "vision").

Each is a channel def + an organ + a profile. The substrate doesn't
blink — which is the whole payoff of the abstraction.

### Differential rendering — what each sense is good and bad at

The thing that keeps a non-human sensorium from being reskinned vision:
**each channel renders its percept in its own information idiom**, with
distinct strengths and blind spots. The gestalt composer needs
per-channel render vocabularies, not one prose mold.

| Sense | Good at | Blind to / foiled by |
|---|---|---|
| echolocation | shape, distance, **motion**; dark-proof | **color**; soft/absorbing surfaces; masked by noise; range-limited |
| smell | **identity, history, trails** (who/what was here) | spatial precision; instantaneous detail |
| vision | color, fine detail, range | darkness, occlusion |

### What it's like to be a bat (the worked example)

Fly into a pitch-black cave; the auto-gestalt fires, built from *your*
sensorium:

- **Human:** *"Pitch dark — you can't see. Water drips ahead; it smells
  of guano."* (Vision returns nothing; faint sound/smell lead.)
- **Bat:** *"The chamber yawns wide above you; a narrow fissure runs
  north; something small flutters erratically near the far wall."*
  (Echolocation thriving — shape, distance, motion — colorless, darkness
  irrelevant.)

Same room, radically different percept. **The gestalt composes from your
channels, weighted by your profile** (bat → echolocation-led, dog →
smell-led, human → sight-led) — and *that* is Nagel's bat-experience,
delivered. Text can do this *better* than graphics, which would have to
fake echolocation visually; we describe what echolocation *reveals*, in
its own terms.

### Sensorium-relative stealth & NPC perception (emergent payoff)

Every being — including NPCs — perceives through *its* channels, so
detection is per-observer and stealth gets rich for free:

- Hide from a **bat**: hold still + find a soft/absorbing nook
  (motion + echo are its strength).
- Hide from a **dog**: mask your *scent*.
- Hide from a **human**: stay out of *sight*/light.

The same nook beats one observer and fails another; a guard dog smells
you, a bat echolocates you, a guard must see you. No bespoke stealth
code — it falls out of the substrate.

**The chain:** BodyPlan organs + Species profiles → which channels you
have & how tuned → your gestalt → what it's like to be you. **Body-type
determines the experienced world.**

---

## The gestalt verb — perceive everything in one action

The convenience: a being entering a space takes it in across *all* its
ambient senses at once. So:

- **Auto-fires on room entry** — the player perceives a new room's
  gestalt for free, typing nothing. (This is the "don't make me type
  five commands" answer — they type *zero*.)
- **An explicit verb re-triggers it.** *Lean name: `sense`* (alternatives:
  `perceive`; the bare-`look` form stays *ambient vision* for
  consistency with the single-sense verbs, so the all-senses gestalt
  wants its own word). The name is the least-settled part; the
  auto-on-entry + the output shape matter more.

**The output — sight-led prose with salient cross-sensory percepts woven
in:**

- Only senses with a **notable** signal contribute (a salience
  threshold) — never "Smell: nothing. Sound: nothing." A neutral room
  reads mostly visual; a room with a strong smell / odd sound / biting
  cold surfaces those.
- **Viewer-relative** — shaped by your sensory profile + capabilities
  (a tracker notices the scent trail in the gestalt; a dog's gestalt is
  smell-dominant).
- **Darkness becomes playable** — in the dark, vision drops out and the
  gestalt naturally leads with sound/smell/touch: *"You can't see, but
  you hear water dripping, smell damp stone, and the air is cold."* The
  multi-sense model makes blindness/darkness perceptible rather than a
  blank.
- **Pedagogical-seam mode** — a sectioned/measured variant (Sight /
  Sound / Smell with real units) for student/instrument use, same engine.

The gestalt feeds the **inspection-pane** room focus as the multi-sense
percept; drill into a single sense for depth.

## Single-sense verbs (deliberate focus)

`look`/`examine`, `listen`, `smell`/`sniff`, `feel`/`touch`,
`taste`/`lick`. Bare form = that sense applied to the surroundings
(ambient); targeted form (`smell <thing>`) = that sense on a thing,
deeper. These are how you focus one channel when the gestalt flagged
something worth investigating — or when a contact sense needs an
explicit act.

---

## The percept connection (the physics under the pane)

A sense reveals facts gated by **(have the sense) + (signal reaches you /
contact) + (skill/instrument/capability)**; the revealed facts feed the
percept that renders in the inspection pane (per the percept model).
`look` adds visual facts, `smell` adds odor facts, a thermometer adds the
measured temp, `appraise` (a skill) adds quality. Internal state never
appears unless a perception reveals it; the raw dump stays admin-gated.
The senses substrate is what makes that model real.

---

## Worked scenarios

- **Enter a dark cellar:** auto-gestalt fires; vision is dark, so the
  output leads with *"the drip of water, a sour mildew smell, cold damp
  air."* Player `feel`s along the wall to navigate.
- **Dog tracks a scent:** the fugitive left an odor trail; it decays over
  time (smell's persistence); the dog (huge `olfactoryProfile`) follows
  the fading gradient room to room via Conduits.
- **Hot stove:** `feel stove` → contact thermoreception → "searing hot"
  (and a vitals burn if you hold it); a thermometer reads the real °C.
- **Taste-test:** `taste stew` → gustation → "off, faintly bitter" →
  a poison/spoilage cue (consumables tie).
- **Student mode:** `sense` in pedagogical mode → sectioned readout with
  lux / dB / ppm / °C from the instruments the student carries.

---

## What this stresses

- **light / sound** — converge onto `PerceptionChannel` (gradually for
  shipped light; sound's detail becomes the hearing instance).
- **biome** — the atmosphere medium (smell diffusion, ambient temp); the
  instrument roster covers most channels already.
- **Material** — texture/hardness/material-temp feed touch.
- **quantities** — a `Quantity<U>` per channel + tags + instruments.
- **race / `BodyPlan`** — **organ-gates-channel** (a sense exists iff the
  BodyPlan declares its organ); `Species` carries the three new
  sensitivity profiles; alien organs (echolocation, pit-sensing) enable
  new channels.
- **vitals** — organ *condition* modulates channel quality (a damaged
  eye/ear); body/ambient temperature; consumables for taste.
- **perception.md** — the viewer-aware substrate this layers on.
- **inspection-pane / message-rendering** — the percept render + the
  pedagogical seam.
- **access / verb-provisioning** — skills gate revelation + afford
  perception verbs.
- **messaging / `SensorMixin`** — the unification: `onMessage` reception
  *is* sensing; a frame's channel = the sense. The senses substrate
  becomes the perceptual layer of messaging.
- **comms / implant / emotes** — ESP is a sense-channel family here; the
  implant is its organ. Comms/emotes deliver *on* these channels; the
  language gate is the verbal channel's property; ungated emote delivery
  is preserved (universal hardened organ + network physics).

---

## Open questions / forks

1. **Generalize vs align light/sound.** *Lean: extract the abstraction
   they already share; build new senses on it; converge vision/hearing
   gradually — no big-bang refactor of shipped light.*
2. **Smell's time dimension (trails/decay/tracking).** The one truly-new
   mechanic; gameplay-rich but stateful. *Lean: design the persistence
   seam now, build trails/tracking as its own wave.*
3. **Field vs contact vs network: one detection model?** *Lean: one
   perception layer over the three propagation families.*
4. **Gestalt verb name** — `sense` / `perceive` / other. *Lean `sense`;
   genuinely open, low-stakes.* The output shape (salient weave,
   viewer-relative, dark-playable) is the load-bearing part.
5. **Gestalt: accumulate vs fresh.** Does re-`sense`ing accumulate with
   prior single-sense percepts in the pane, or refresh? (Ties to the
   inspection-pane accumulate-vs-latest question.) *Lean accumulate-per-
   focus.*
6. **Wave cut.** Substrate + field senses (smell, ambient-temp) + the
   gestalt first; contact senses (touch-texture, taste) + smell-trails
   later? *Lean yes; capture all five in the design (done here).*
7. **Touch sub-modalities** — temperature / texture / pressure / pain
   as one `tactileProfile` or split? *Lean one coarse tactile channel
   v1, split if content demands.*
8. **Organ-gates-channel wiring** — the BodyPlan→channel-enablement link
   (+ vitals condition modulating quality). New seam at race ∩ vitals.
   *Lean: a channel is enabled iff the BodyPlan declares its organ;
   organ condition scales the channel; keep it data-driven on the
   BodyPlan, not hardcoded per species.*
9. **The active-sense pattern** — echolocation/electrolocation as
   emit-and-perceive-the-return, a `PerceptionChannel` sub-type distinct
   from passive field reception. *Lean: model it; it's the cleanest proof
   the abstraction generalizes — but build after the passive channels.*
10. **Differential rendering** — per-channel render vocabularies
    (echolocation → spatial/motion, no color; smell → identity/history),
    so a non-human sensorium isn't reskinned vision. *Lean: each channel
    owns its render idiom; the gestalt composer dispatches per channel.*
11. **ESP: single sense or family?** *Resolved: a family* — verbal
    (language-gated) + emotive (language-free) baseline channels, further
    channels (imagery/presence/empathic-sense) deferred. The split is
    earned by the verbal/emotive language distinction; multiplicity buys
    implant-tiers/innate-variation/independent-jamming.
12. **Emotes: telepathic-only or also physical?** Organ-gating means
    non-implant beings (animals) lack ESP → don't perceive emotes. *Lean:
    emotes are telepathic-only (consistent with "emotes are magic"); a
    physically-visible **action** a dog can see is a separate, sensory
    thing.* Genuinely open — your call.
13. **Do ESP channels join the room gestalt?** *Lean no* — chat/DM aren't
    "in the room"; they render to the comms buffer, not the look-gestalt.
    Network channels paint a different surface than field/contact ones.

---

## Build order

Indicative; large subsystem, builds in waves (designed whole here).

**Wave 1 — substrate + field senses + gestalt.** Extract
`PerceptionChannel`; the **organ-gates-channel** link on `BodyPlan` (a
channel exists iff its organ does) + the field-family propagation walk
(reusing light/sound); **smell** (diffusion through biome atmosphere, no
trails yet) + ambient-temperature; the **gestalt** verb + auto-on-entry +
salient-weave output + dark-playable behavior + **per-channel
differential rendering**; `olfactoryProfile`. Hook the percept into the
pane. Also: **register the ESP channels** (verbal + emotive) as
`PerceptionChannel`s with the implant as organ + network physics — mostly
recognizing what comms/emotes already deliver, now as senses (the
`SensorMixin` reception = sensing unification); they render to the comms
buffer, not the gestalt.

**Wave 2 — contact senses + instruments.** **Touch** (contact
thermoreception off Material/thermal; texture/hardness) + **taste**
(consumables tie); `tactileProfile`/`gustatoryProfile`; the single-sense
verbs; per-channel instruments (most exist); organ-condition scaling the
channel (vitals tie).

**Wave 3 — alien channels + trails + convergence.** The **active-sense
pattern** (echolocation as emit-and-perceive-the-return) + a first
non-human channel (bat echolocation) — proving the abstraction; smell
**persistence/trails → tracking**; sensorium-relative stealth/NPC
detection; converge vision (light) onto the substrate; the
pedagogical-seam sectioned/measured gestalt mode.

---

## What this slate does NOT cover

- **The inspection-pane / percept rendering** — consumed; the pane slate
  + percept model own how facts display.
- **The deep acoustic spec** — retained in the retired sound-slate as the
  hearing instance's detail until absorbed.
- **Magic/extra-sensory channels** — a `PerceptionChannel` could later
  host scry/detect/aura (the "magic lens"); deferred to the magic
  subsystem, but the substrate accommodates it.
- **The skill/capability system** that gates revelation + affords verbs
  — access + verb-provisioning own it; this consumes it.
- **Consumables/diet mechanics** — vitals owns eat/drink; taste reads
  from it.

---

## Once shaped into formal requirements

This slate boils down to:

- The **`PerceptionChannel`** substrate (the shared parts) + the
  **field/contact/network** family split + the uniform detection check;
  the **messaging = sensing** unification (`SensorMixin` reception is
  sensing; a frame's channel *is* the sense).
- The **five physical senses** as instances (vision/hearing
  shipped/absorbed; smell/touch/taste new) with their physics + ties
  (biome/Material/vitals/consumables).
- **ESP as a channel family** (network physics): **verbal** (language-
  gated) + **emotive** (language-free) baseline channels, the **implant
  as their organ** (universal + hardened → emotes/DM/chat always land;
  tiers/innate variation add channels), render-to-comms-buffer; further
  ESP channels (imagery/presence/empathic-sense) deferred-with-seam.
- The **species/body-type interface**: the three-layer attach (organ on
  `BodyPlan` *gates* the channel × `Species` profile *tunes* it × vitals
  condition *modulates* it); the three new sensitivity profiles; **alien
  channels** (echolocation/etc.) as plain instances + the **active-sense**
  (emit-and-perceive-the-return) sub-pattern; **differential rendering**
  (per-channel render idioms); the sensorium-relative stealth/NPC-detection
  payoff.
- The **gestalt verb** (`sense`) + auto-on-entry + the salient-weave,
  viewer-relative, dark-playable output + the pedagogical-seam mode; the
  single-sense verbs.
- The **percept tie** (senses reveal facts → the inspection-pane percept;
  capability-gated; raw state admin-only).
- **Smell persistence/trails** as a designed-for seam (built later).
- Tests: a being perceives only what its profile + the reaching signal
  allow; a dark room's gestalt leads non-visually; a dog follows a
  decaying scent trail; a contact sense requires the act; an instrument
  reveals the real `Quantity` where prose gives a tag.

Smell trails/tracking, the magic-lens channel, touch sub-modality splits,
and the full vision-convergence wait for their own waves.
