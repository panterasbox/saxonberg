# Senses slate (working doc)

> **Status: Wave 1 SHIPPED 2026-06 — authoring half + physics half
> both landed.** Authoring (2026-06 senses build): per-sense
> `Detail` slot map, `<sense channel="X">` MML wrapper,
> `senseStripAugmenter`, the four single-sense verbs, gestalt
> `sense` verb, auto-on-entry switch, hierarchical perception topic
> vocabulary, `BodyPlan.getModalities()`, `Species.olfactoryProfile`.
> Physics (2026-06 perception build): `Modality` base class + seven
> singletons + `PerceptionApi`; field propagation walks for vision
> (relocated from retired `LightApi`), smell (ppm + identity +
> conduit), sound (dB + logarithmic merge + linear-amplitude
> accumulation); touch ambient + per-detail temperature via biome
> chain; ESP via augment-conferred AetherMixin; per-frame modality
> attribution at `Scene.modality` + `SensorMixin.filterMessage`;
> `SpeciesApi.deriveSensorium` retired in favor of
> `PerceptionApi.sensorium`. See
> [docs/subsystems/senses.md](../../subsystems/senses.md) for the
> shipped substrate.
>
> Still ahead (Wave 2/3 open work below): smell trails / temporal
> persistence, active-sense pattern (echolocation), full ESP local-
> field walk (eavesdropping in range, encryption stripping for
> non-addressee dms), per-species `hearingProfile` / `tactileProfile`
> / `gustatoryProfile`, vitals burn-damage on scalding contact, RT60
> / reverberation acoustic modeling, NPC scent-tracking AI,
> sensorium-relative stealth, alien channels (electroreception /
> magnetoreception / pit-sensing), chemesthesis as its own modality.
>
> Refinement (2026-06, pre-ship): ESP organ universalized across
> sentient beings (open Q #12 resolved → emotes stay telepathic-only;
> the dog perceives the wave via its empathic organ, no double-event
> needed); authoring discipline settled as **events single-channel
> per frame, state multi-sense via MML `<sense>` tags + per-sense
> Detail slot maps** so content authors never write the same thing
> five times.

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

- [docs/subsystems/light.md](../../subsystems/light.md) — **vision**, the
  shipped exemplar (`LightApi`, `canSee`, `visionProfile`, bands). The
  substrate aligns to its shape; vision converges gradually, not in a
  big-bang refactor.
- The sound slate has been **retired as a standalone slate**; its
  acoustic detail is the *hearing* instance (`SoundApi`,
  `hearingProfile`, dB/Hz/RT60, masking, Conduit transmissivity) and
  is now retained in this slate's **Deep acoustic spec** section below,
  the depth source for the committed hearing-polish wave.
- [docs/subsystems/biome.md](../../subsystems/biome.md) — the **atmosphere
  medium** (air/water/vacuum) smell diffuses through; ambient temperature;
  the instrument pattern (GasAnalyzer, Thermometer, Barometer…).
- [docs/subsystems/race.md](../../subsystems/race.md) — **Material**
  (texture/hardness for touch); **Species** templates carry the
  per-sense sensitivity profiles.
- [docs/subsystems/quantities.md](../../subsystems/quantities.md) — every
  channel's signal is a `Quantity<U>` (lux/dB/ppm/°C…) with friendly
  tags + instrument reveal.
- [docs/slates/vitals-slate.md](../builds/vitals-slate.md) — body temperature
  (thermal), and consumables/eat-drink (the taste tie).
- [docs/slates/augmentation-slate.md](../tails/augmentation-slate.md) — the
  **implant is an artificial sense-organ**; sensor augments *are*
  `PerceptionChannel`s; the baseline implant provides the ESP channels.
- [docs/subsystems/perception.md](../../subsystems/perception.md) — the
  viewer-aware-query pattern; per-viewer Shadow overrides.
- [docs/subsystems/inspection-pane.md](../../subsystems/inspection-pane.md) /
  [message-rendering-slate.md](../tails/message-rendering-slate.md) — the
  percept feeds the pane; the pedagogical seam (prose vs instrument)
  is the rendering.
- [docs/slates/access-slate.md](../tails/access-slate.md) /
  [command affordances](../../subsystems/command-routing.md) — **skills
  gate revelation *and* afford the verbs** that reveal (two sides of the
  same capability); a skill is just one source object that contributes
  the revealing verb.

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
spec (worked examples, every seam) is retained in the **Deep acoustic
spec** section below.

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

**Organ = ESP-sensitive organ; multiple diegetic shapes; ungated *by design*.**
A channel exists iff you have the organ. The setting's diegetic
inventory of ESP-sensitive organs is broad:

- **Implants** — the citizen-default. The baseline implant is
  **universal among citizens + hardened**, so every citizen has
  verbal + emotive ESP.
- **Natural empathy** — the biological / magical-creature path.
  Animals, familiars, magical beings, sentient plants — whatever the
  setting wants — declare an empathic organ on their `BodyPlan`. A
  dog's empathic organ is the same channel slot as a citizen's
  implant; the diegetic flavor differs, the substrate sees one
  thing: organ present, channel enabled.

The practical rule is **sentience implies telepathy in this universe**.
If a being meaningfully perceives and reacts to the world (the dog, the
cat, the parrot in the corner), its `BodyPlan` declares an ESP organ —
implant, empathy, or magical bond, content's call. **Emotes / DM / chat
land on everyone sentient in the room.** Only the genuinely-inanimate
(rock, kettle, bookshelf) lack the organ, and they weren't perceiving
anything anyway. Per-channel physics keeps it ungated even though it's
a sense: universal organ across the sentient population + network
physics with no falloff / masking.

This resolves the dog-doesn't-perceive-the-wave tension cleanly. The
dog has the empathic organ; the emote frame lands. No physical-motion
second event needed, no per-event content burden for differential
rendering across senses — one emote, one channel, every sentient being
in the room perceives it. See **Authoring surface — events vs. state**
below for why this split keeps content buildable.

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

## Authoring surface — events vs. state

Where the multi-sense complexity lives matters for keeping content
authorable. The substrate's discipline is **events are single-channel;
state is multi-sense via tags**. Authors never write the same content
five times.

### Events stay single-channel per frame

A `Scene.send` rides ONE channel. A say rides the hearing channel; an
emote rides the emotive ESP channel; a footstep rides hearing; the
snick of a match igniting rides hearing. The substrate handles
per-recipient detection on that channel — whoever's sensorium has it,
and is in range, perceives the frame.

Multi-modal events (a door slamming makes a sound AND is visible) are
authored as separate Scenes when both channels matter; in practice
authors typically pick the *salient* channel (the slam is acoustic;
the door changing from open to closed is a state change anyone
looking after will notice).

This is the rule that resolves the "Bobalu's wave needs five sensory
versions" nightmare. It doesn't. One emote on the emotive ESP channel,
delivered to every sentient organ in the room.

### Events that leave persistent affordances

A wax candle being lit is one event — a single hearing-channel frame
for the snick-and-fizz of the match. The *lit candle* is then
persistent state in the room with multi-sense affordances (vision:
flickering light; touch: heat; smell: the smoke). Anyone in the room
at the moment hears the lighting; anyone who walks in afterward looks
/ sniffs / feels and queries the affordances per the state-authoring
rules below.

The substrate never tries to fan one event across all senses. The
event is one channel; the affordance it leaves behind is queryable
per-sense for as long as the affordance persists. This mirrors how
reality works — events are single sensory hits, things afford across
senses.

### State goes multi-sense via MML `<sense>` tags

Room and Stuff long-descriptions are authored once with per-sense
inline regions:

```mml
The kitchen is warm.
<sense channel="smell">Garlic and roasting bread.</sense>
<sense channel="hearing">The steady sizzle of bacon, a kettle hissing.</sense>
<sense channel="touch">Gritty flour dusts the countertop.</sense>
A <detail key="bookcase">tall walnut bookcase</detail> stands against the north wall.
```

A `senseStripAugmenter` sits in the existing `markupAugmenters`
pipeline. At compose-time it reads the viewer's sensorium and strips
any `<sense channel="X">…</sense>` whose channel isn't in the viewer's
set. **Untagged text is the default — perceivable to anyone — so
existing prose doesn't need to be retrofitted.**

Same room serves every sensorium. A blind viewer's prose drops the
visual regions; a bat's prose surfaces echolocation regions where
authored.

### Detail entries are multi-sense, shared keyword

A `Detail` keyword refers to the *thing*, not to a particular sensory
rendering of it. So one keyword (`bookcase`) carries per-sense
entries:

```yaml
details:
  bookcase:
    aliases: [shelves]
    vision: "Hand-tooled leather spines, dust along the top edge..."
    touch: "Smooth walnut, grain runs vertical; one spine is gilt and
            cool to the fingertip..."
    echolocation: "A solid broad mass against the wall, motionless;
                   small variations in the returns suggest..."
```

Lookup becomes sense-aware: `host.getDetail('bookcase', 'vision')`.
Single-sense verbs pass their sense; missing entries (no `smell` for
a non-smelly object) fall through to a polite "you don't perceive
anything notable about the bookcase that way" — same shape as today's
lookup-miss path.

Aliases stay at the keyword level (aliases describe the thing, not a
sense's view of it).

A `<detail key="X">` wrap with no explicit `sense=` attribute defaults
to vision — backwards-compatible with all existing detail authoring.
The explicit `sense="X"` form is for non-default-sense entries.

### Augmenter behavior under the gestalt

The `<detail>` augmenter wraps a keyword in click-targetable MML for
any sense the viewer has at least one entry for. So a `bookcase`
whose only entry is `touch` will be wrapped for a viewer with touch
(so they can `feel bookcase` and drill into it), and won't be wrapped
for a viewer without touch.

The click defaults to `look <kw>` — the dominant verb stays dominant.
If the click lands on something with no vision detail, the same
polite lookup-miss path fires and the player learns to type
`feel <kw>` / `smell <kw>` for sense-specific exploration. The
sense-aware-click variant (gestalt composer threads per-fragment sense
provenance into `<detail sense="…">`, so clicks dispatch to the
sense-appropriate verb) is a v2 polish; v1 keeps click = look.

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
- **access / command affordances** — skills gate revelation + afford
  perception verbs (a skill is a source object that contributes the
  verb; see command-routing § Affordance attribution).
- **messaging / `SensorMixin`** — the unification: `onMessage` reception
  *is* sensing; a frame's channel = the sense. The senses substrate
  becomes the perceptual layer of messaging.
- **DetailedMixin + MarkupAugmenter** — Detail entries gain a per-sense
  slot map (`{vision, hearing, smell, touch, taste, echolocation, …}`,
  shared keyword, aliases at the keyword level); `getDetail(key, sense)`
  lookup. A new `senseStripAugmenter` in the existing `markupAugmenters`
  pipeline reads the viewer's sensorium and strips
  `<sense channel="X">…</sense>` regions inaccessible to the viewer;
  the `<detail>` augmenter wraps any keyword the viewer has at least
  one sense's entry for. Untagged prose and `<detail>` without `sense=`
  default to vision / perceivable-by-anyone, so existing content
  doesn't need retrofitting.
- **comms / implant / emotes** — ESP is a sense-channel family here;
  the organ is authored per-creature on the `BodyPlan` (citizens get
  implants, animals get natural empathy, magical beings get magical
  bonds — same channel slot, diegetic flavor varies). Comms / emotes
  deliver *on* these channels; the language gate is the verbal
  channel's property; ungated emote delivery is preserved (universal
  organ across sentient beings + network physics).

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
12. **Emotes: telepathic-only or also physical?** *Resolved: telepathic-
    only.* The animal-doesn't-perceive-the-wave tension dissolves by
    universalizing the ESP organ across sentient creatures — animals,
    familiars, magical beings each declare an empathic organ on their
    `BodyPlan` (the diegetic flavor varies: implant, biological empathy,
    magical bond; the substrate sees one channel-slot, present). See
    **ESP — a channel family** above. One emote, one channel, every
    sentient being in the room perceives it; no double-event needed.
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
- **The deep acoustic spec** — now folded into the **Deep acoustic
  spec** section above as the hearing instance's depth source.
- **Magic/extra-sensory channels** — a `PerceptionChannel` could later
  host scry/detect/aura (the "magic lens"); deferred to the magic
  subsystem, but the substrate accommodates it.
- **The skill/capability system** that gates revelation + affords verbs
  — access + command affordances own it (a skill contributes its verbs
  as a source object; see command-routing § Affordance attribution);
  this consumes it.
- **Consumables/diet mechanics** — vitals owns eat/drink; taste reads
  from it.

---

## Deep acoustic spec (retained from the retired sound-slate)

The sound slate's core shipped into [senses.md](../../subsystems/senses.md)
(the `Sound` value object, dB log-addition, `SoundConduit`, the bare
`listen` verb, the basic conduit-existence walk). What follows is the
**still-deferred acoustic depth** — the committed-but-unbuilt
hearing-polish wave (`SoundLevelMeter` + `measure sound`, the async
biome-chain `resolveAmbientSoundLevelFor` walker, RT60/reverberation,
partial-transmissivity muffled-door subclasses, per-species
`hearingProfile`). This is the mine-for-depth reference; do not start
new design here.

### Channel-keyed Conduit transmissivity (material-derived)

Conduit transmissivity is channel-keyed (`transmissivity:
Record<ChannelKind, number>`, e.g. `light`/`sound`, growing over time).
Canonical worked values (authors override per content):

| Conduit | Light | Sound |
|---|---|---|
| Open doorway | 1.0 | 0.95 |
| Closed wooden door | 0.0 | 0.4 |
| Closed steel door | 0.0 | 0.1 |
| Open glass window | 0.95 | 0.95 |
| Closed glass window | 0.95 | 0.3 |
| Curtained doorway | 0.6 | 0.7 |
| Blanket-over-window | 0.05 | 0.6 |
| Locked steel hatch | 0.0 | 0.05 |

**Material-derived transmissivity (Pedagogical Seam #3).** Authors
needn't hand-tune every Conduit — sound transmission can be derived from
acoustic impedance: `transmissivity ≈ f(thickness, density,
acousticImpedance)`. The Material substrate (race.md) already carries
density; adding `acousticImpedance` to materials and deriving Conduit
values from `(material, thickness)` is physics-honest and authorially
efficient. v1: an explicit helper
`MaterialApi.derivedTransmissivity(mat, thicknessM, channel)`; v2:
implicit derivation with override. An acoustic-engineering / materials
student can verify the model against a textbook.

**Walls are silent in v1.** Sound only propagates through Conduits; two
rooms separated by a bare wall (no Conduit) are sonically isolated.
Authors place a "thin wall" Adornment with low-transmissivity Conduit
for cross-wall leak. This is a known fidelity loss (real walls leak at
low levels); the full fix needs geometric adjacency from the spatial
subsystem — revisit if content cases pile up.

### SoundApi propagation and detection

The deferred surface mirrors `LightApi` almost line-for-line:

```ts
class SoundApi {
  static soundAt(loc: Stuff & Container): Sound;          // aggregate
  static loudestSourceAt(loc): SoundSource | null;
  static perceivedSound(viewer: Stuff & Sensor): Sound;
  static canHear(viewer: Stuff & Sensor, source: SoundSource): boolean;
  static loudnessThreshold(viewer: Stuff & Sensor): Quantity<dB>;
  static directionOf(viewer: Stuff & Sensor, source): Direction | null;
  static reverbTimeAt(loc: Stuff & Container): Quantity<seconds>;  // RT60
}
```

**Aggregate at a location.** Recursive walk through containment +
Conduits, attenuating each source by `∏(conduit transmissivities)` and
summing **logarithmically** across sources, depth-bounded like
`LightApi.lightAt`. Per-source attenuation is `attenuated =
source_amplitude × ∏(transmissivities)`; multiplying by 0.5
transmissivity is ~6 dB. The walk runs in linear-amplitude space
internally and reports dB at the boundary (physically correct for
incoherent sources).

**Per-viewer detection** runs three gates:

```ts
function canHear(viewer, source) {
  const ambient = SoundApi.soundAt(viewer.location);
  const c = sourceLoudnessAt(source, viewer.location);
  // 1. Frequency: outside the species range, not perceived
  if (!speciesHearsBand(viewer, c.dominantBand)) return false;
  // 2. Threshold: quieter than the viewer's threshold
  if (c.amplitude.value < loudnessThreshold(viewer).value) return false;
  // 3. Masking: buried under louder ambient
  if (ambient.amplitude.value - c.amplitude.value > MASKING_THRESHOLD)
    return false;
  return true;
}
```

The masking gate is real acoustics — a 30 dB whisper in a 60 dB forge
room isn't perceived; it falls out of the additive model.

**Localization (direction).** The walk records which Conduit each source
last crossed to reach the listener; MML renders the direction ("You hear
footsteps to the east"; "a steady humming from the north"). Multiple
near-equal paths render ambiguous ("from somewhere northeast"). Sound
localizes where v1 light does not — an accepted API divergence, since
sound direction matters more to gameplay.

### Pedagogical seams (the curriculum touchpoints)

Acoustics shows up across physics, biology, and engineering, so the
seams are unusually rich. Each falls out of physics-honest math.

- **Seam 1 — decibels as a logarithmic scale.** Real dB SPL underneath;
  log addition (`combined = 10·log₁₀(10^(a/10) + 10^(b/10))`, so
  60+60 = 63 dB, 60+30 ≈ 60.04 dB). Exposed by `analyze sound`.

- **Seam 2 — frequency ranges per species** (`Species.hearingProfile`,
  parallel to `visionProfile`). Real Hz ranges from biology references;
  frequencies outside a species' range are simply not perceived (a dog
  hears a whistle a human in the room doesn't):

  | Species | Hearing range |
  |---|---|
  | Homo sapiens | 20–20,000 Hz |
  | Homo khazadicus | 16–16,000 Hz (low-shifted; matches scotopic vision) |
  | Canis familiaris | 67–45,000 Hz |
  | Felis catus | 55–79,000 Hz |
  | Chiroptera | 1,000–110,000 Hz |
  | Loxodonta | 16–12,000 Hz (perceives infrasound) |
  | Lithobates catesbeianus | 100–2,000 Hz |
  | Mus musculus | 1,000–90,000 Hz |
  | Constructa metallica (tutor-bot) | 20–22,000 Hz |
  | Spathiphyllum wallisii | none (no Sensor) |

  v1 shape: low/high cutoff in Hz + a sensitivity scalar; structured for
  full Fletcher-Munson curves later.

- **Seam 3 — acoustic impedance from materials** (see Channel-keyed
  Conduit transmissivity above). Material acoustic properties drive
  Conduit transmissivity; physics-literate students predict, others use
  friendly defaults.

- **Seam 4 — reverberation per location** (`location.reverbTime:
  Quantity<seconds>`, RT60). Authors pick an archetype, the value comes
  pre-set; MML adds echo characterization for high-reverb spaces ("your
  footsteps echo for several seconds"):

  | Space archetype | RT60 |
  |---|---|
  | Anechoic chamber | <0.1 s |
  | Bedroom (carpeted) | 0.4 s |
  | Living room | 0.6 s |
  | Lecture hall | 1.2 s |
  | Cathedral | 6–10 s |
  | Large cave | 5–15 s |

- **Seam 5 — the Doppler effect (v2).** When v2 brings frequency content
  + activity-driven motion vectors, `f_observed = f_source · (c +
  v_observer) / (c + v_source)` falls out of correct math. Deferred —
  needs frequency content + motion vectors not in v1.

- **Seam 7 — hearing damage / noise dose (later wave).** Real NIHL
  dose-response (OSHA: 85 dB / 8 h, 90 dB / 4 h, …);
  `actor.cumulativeNoiseDose: Quantity<dB·hours>` accumulates with
  high-amplitude exposure, over-threshold accumulation temporarily (or
  permanently for severe doses) narrows the species hearing range. Gives
  ear-protection items a concrete purpose. Ties to occupational safety /
  audiology / public-health curricula. Design slot reserved.

(Seam 6 — scientific instruments as in-world Stuff — is the `analyze`
pattern + instrument roster below.)

### The `analyze` pattern

A verb family that renders the engine's internal numbers in pedagogical
form — same code path, instrument-style rendering instead of casual
prose. Sample:

```
> analyze sound here

Sources audible at your location:
  fountain (10ft west)
    Source:        30 dB SPL @ 100–800 Hz (water-trickling)
    At your pos:   28 dB (1 dB attenuation through open door)
  refrigerator-compressor (in next room)
    Source:        38 dB SPL @ 80–200 Hz (compressor-hum)
    Path:          through wooden door (transmissivity 0.4)
    At your pos:   30 dB

Aggregate:         32.1 dB SPL (logarithmic sum)
Dominant band:     80–800 Hz
Reverberation:     0.6s (living room)
Your threshold:    0 dB (Homo sapiens, age 22)
Detected:          both sources audible
```

Casual players get prose ("you hear water trickling and a faint hum");
students get the physics; developers get a debug surface — one engine,
three render paths. Instrument roster (in-world Stuff that, when used,
exposes the engine's numbers): `SoundLevelMeter` (`measure sound here` →
aggregate dB SPL), `SpectrumAnalyzer` (`measure spectrum here` →
dominant band + per-band contribution), `Stethoscope`
(`listen-with stethoscope to X` → sub-threshold body sounds), `TuningFork`
(`strike tuning-fork` → precise frequency for resonance), `Sonar`
(`ping sonar` → emit, time the reflection, report distance).

### Worked scenarios (the propagation/detection mechanics)

- **Sneaker past a sleeping guard.** `sneak` mode →
  `mode.noiseLevel: silent` → amplitude 0, no `SoundEvent` emitted. The
  guard NPC's Sensor receives no notification; wake-on-sound never
  fires. Falls straight out of the locomotion `noiseLevel` scalar.

- **Runner past a fountain room.** Fountain ambient-emits 30 dB
  (100–800 Hz, water-trickling). Runner enters room A at `loud` (~75 dB)
  → listeners hear aggregate ~75 dB, fountain masked. Runner traverses
  east → paired Motion+Sound events ("footsteps moving east" to A,
  "arriving from west" to B). In A footsteps fade and the fountain is
  audible again; in B the listener hears approaching footsteps + B's
  ambient; in room C across a glass wall the fountain is attenuated
  ×0.3 → ~21 dB at the conduit, below most thresholds.

- **Romeo and Juliet through a closed window.** Juliet yells at 80 dB; a
  `Window` boundary with `transmissivity[sound] = 0.4` cuts it to ~32 dB
  in Romeo's chamber; his 0 dB threshold → he hears it. MML: *"You hear
  Juliet calling, faintly…"* — "faintly" comes from the attenuation.

- **Masking.** A forge emits 60 dB clanging in room A; a 25 dB whisper
  there is masked (25 vs 60 dB ambient) and not perceived; the same
  whisper in forge-free room B is heard. The additive log model handles
  it naturally.

- **Biology student plays a dog.** Dog (`hearingProfile: 67–45,000 Hz`).
  A hidden device emits a 25,000 Hz / 50 dB ultrasonic pulse. Humans
  (`20–20,000 Hz`) don't perceive it; the dog does. MML for the dog:
  *"You hear a high-pitched pulsing whine humans likely cannot detect."*
  The student literally has a different perception — the curriculum win.

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
- **ESP as a channel family** (network physics): **verbal**
  (language-gated) + **emotive** (language-free) baseline channels, the
  **organ authored per-creature on the `BodyPlan`** — citizen implants,
  animal natural empathy, magical bonds all instantiate the same
  channel slot — **universally present across sentient beings** so
  emotes / DM / chat always land on every sentient being in the room;
  tiers / innate variation add channels; render-to-comms-buffer;
  further ESP channels (imagery / presence / empathic-sense)
  deferred-with-seam.
- The **species/body-type interface**: the three-layer attach (organ on
  `BodyPlan` *gates* the channel × `Species` profile *tunes* it × vitals
  condition *modulates* it); the three new sensitivity profiles; **alien
  channels** (echolocation/etc.) as plain instances + the **active-sense**
  (emit-and-perceive-the-return) sub-pattern; **differential rendering**
  (per-channel render idioms); the sensorium-relative stealth/NPC-detection
  payoff.
- The **authoring discipline** that keeps it buildable: **events are
  single-channel per `Scene.send`**; **state (room / Stuff descriptions
  + Detail entries) is multi-sense** via `<sense channel="X">…</sense>`
  MML wrappers and per-sense slot maps on Detail entries (shared
  keyword, aliases at the keyword level). A `senseStripAugmenter`
  filters the prose to the viewer's sensorium at compose-time;
  default-untagged regions are perceivable to everyone, preserving
  backwards compatibility with all existing detail authoring
  (`<detail key="X">` without `sense=` defaults to vision). Click
  defaults to `look <kw>`; sense-specific drill is typed. Events that
  leave persistent affordances (lighting a candle → light + heat +
  smell affordances in the room) are one-channel events plus
  multi-sense state.
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
