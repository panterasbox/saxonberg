# Senses slate (working doc)

> **Status: PARTIAL** — Wave 1 shipped 2026-06, both halves (authoring +
> the physics/`Modality` layer) → [senses.md](../../subsystems/senses.md);
> the `sense` verb is being CUT and `look` made the take-it-all-in verb by
> [legibility-slate § Part D](../builds/legibility-slate.md) (2026-09-18).
> **Left:** smell trails / temporal persistence + NPC scent-tracking · the
> active-sense pattern (echolocation) + the alien channels
> (magneto-/electroreception, pit-sensing) · differential per-channel
> rendering · sensorium-relative stealth / NPC detection · the full ESP
> local-field walk · the natural-empathy ESP organ on `BodyPlan`
> (sentience-implies-telepathy — contradicted by what shipped, see the
> ledger) + implant tiers / innate variation / independent jamming + the
> deferred ESP channels · per-species
> `hearingProfile` / `tactileProfile` / `gustatoryProfile` · organ-condition
> modulation (vitals) · touch texture/hardness off Material + the
> sub-modality fork · taste's consumables tie · the gestalt output now
> owed by `look` (salience threshold · dark-playable · the sectioned
> pedagogical mode) · the sense-aware click · skills afford perception
> verbs · chemesthesis · the deep acoustic spec (partial-transmissivity
> conduits + material-derived transmissivity · frequency + masking gates ·
> `listen` localization · RT60 · Doppler · noise dose · `analyze sound` +
> the acoustic instrument roster · the biome-chain ambient resolver)
> **Size:** a build (several waves riding different builds: hearing
> polish · smell trails + tracking · alien/active channels · ESP field
> physics)

> Still ahead (Wave 2/3 open work below): smell trails / temporal
> persistence, active-sense pattern (echolocation), full ESP local-
> field walk (eavesdropping in range, encryption stripping for
> non-addressee dms), per-species `hearingProfile` / `tactileProfile`
> / `gustatoryProfile`, vitals burn-damage on scalding contact, RT60
> / reverberation acoustic modeling, NPC scent-tracking AI,
> sensorium-relative stealth, alien channels (electroreception /
> magnetoreception / pit-sensing), chemesthesis as its own modality.

Working slate for **the senses** — how a being perceives the world
across vision, hearing, smell, touch, and taste. Light (vision) is
shipped; sound (hearing) is slated; the two already mirror each other,
which proves the abstraction. This slate extracts that shared substrate
and hangs all five senses off it, plus the gestalt verb so a player
perceives a new room without typing five commands.

The five load-bearing decisions shipped 2026-06 → [senses.md](../../subsystems/senses.md): 1 as
`Modality` singletons + `PerceptionApi` (per-modality walks, not a
generic `PerceptionChannel`); 2 as the `family` data field (ESP tagged
`field` — § Hybrid ESP framing; `network` reserved); 3's `sense` verb
shipped and is being CUT by [legibility-slate § Part D](../builds/legibility-slate.md#part-d--the-perception-verbs--decided) — `look` is the
arrival verb and the take-it-all-in verb; 4 → § `senseStripAugmenter` +
perception.md; 5 → § Per-frame modality attribution + § Organ-gates-
modality widened with augments.

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
- [docs/slates/vitals-slate.md](./vitals-slate.md) — body temperature
  (thermal), and consumables/eat-drink (the taste tie).
- [docs/slates/augmentation-slate.md](../tails/augmentation-slate.md) — the
  **implant is an artificial sense-organ**; sensor augments *are*
  `PerceptionChannel`s; the baseline implant provides the ESP channels.
- [docs/subsystems/perception.md](../../subsystems/perception.md) — the
  viewer-aware-query pattern; per-viewer Shadow overrides.
- [docs/subsystems/card-surface.md](../../subsystems/card-surface.md) /
  [message-rendering-slate.md](../tails/message-rendering-slate.md) — the
  percept feeds the card; the pedagogical seam (prose vs instrument)
  is the rendering.
- [docs/slates/access-slate.md](../tails/access-slate.md) /
  [command affordances](../../subsystems/command-routing.md) — **skills
  gate revelation *and* afford the verbs** that reveal (two sides of the
  same capability); a skill is just one source object that contributes
  the revealing verb.

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

Shipped as the `family` data field on `Modality` (`'field' | 'contact' |
'network'`) → [senses.md](../../subsystems/senses.md) § `Modality` singletons + `PerceptionApi`. ESP
shipped as `field` (the local aether IS a field — § Hybrid ESP framing);
`network` is reserved for future routed-only modalities.

---

## The five senses

### Vision (light) — shipped exemplar

Shipped: `VisionModality` (relocated from the retired `LightApi`) →
[light.md](../../subsystems/light.md) § Propagation, [senses.md](../../subsystems/senses.md) § Propagation walks.

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

Shipped as two `Modality` singletons (`verbal-esp`, `emotive-esp`) tagged
`family: field`, not a third *network* family → [senses.md](../../subsystems/senses.md) § Hybrid ESP
framing.

Two channels ship (the split is **earned**, not arbitrary — it's exactly
the verbal/emotive line the language decision already drew):

| ESP channel | Carries | Gating | Renders to |
|---|---|---|---|
| **verbal / propositional** | words (DM, chat) | **language-gated** (the comms (ii) lean lives *here*) | comms buffer (text) |
| **emotive / expressive** | affect/intent (emotes) | **language-free** (a smile is universal) | the emote rendering |

**Organ = ESP-sensitive organ; multiple diegetic shapes; ungated *by design*.**
A channel exists iff you have the organ. The setting's diegetic
inventory of ESP-sensitive organs is broad:

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

Superseded by [legibility-slate § Part D](../builds/legibility-slate.md#part-d--the-perception-verbs--decided) (2026-09-18): `sense` shipped
2026-06 ([senses.md](../../subsystems/senses.md) § Gestalt verb, § Auto-on-entry) and is being CUT —
`look` already renders every channel (`LookController` passes no sense
filter), so `look` is the arrival verb and the take-it-all-in verb, and
the four single-sense verbs narrow. The output items below are what
remains of the gestalt design, now owed by `look`.

**The output — sight-led prose with salient cross-sensory percepts woven
in:**

- Only senses with a **notable** signal contribute (a salience
  threshold) — never "Smell: nothing. Sound: nothing." A neutral room
  reads mostly visual; a room with a strong smell / odd sound / biting
  cold surfaces those.
- **Darkness becomes playable** — in the dark, vision drops out and the
  gestalt naturally leads with sound/smell/touch: *"You can't see, but
  you hear water dripping, smell damp stone, and the air is cold."* The
  multi-sense model makes blindness/darkness perceptible rather than a
  blank.
- **Pedagogical-seam mode** — a sectioned/measured variant (Sight /
  Sound / Smell with real units) for student/instrument use, same engine.

## Single-sense verbs (deliberate focus)

Shipped (`smell` / `listen` / `feel` / `taste`; `examine` is a `look`
alias) → [senses.md](../../subsystems/senses.md) § Single-sense verbs, § Bare-verb upgrades. Aliases
`sniff` / `lick` and `--peek` still land per content demand (§ What's NOT
in this build); the `--peek` / `look <exit>` design is
[distance-perception-slate § The four patterns](../tails/distance-perception-slate.md)
(pattern 2, the bounded one-hop peek), not repeated here.

---

## The percept connection (the physics under the card)

Shipped → [perception.md](../../subsystems/perception.md) § The three
layers; [card-surface.md](../../subsystems/card-surface.md) (the subject
resolves behind the perception gate, re-checked on every re-resolve); the
instrument rung is the `measure` / `analyze` verb family.

---

## Authoring surface — events vs. state

Shipped → [senses.md](../../subsystems/senses.md) § Authoring discipline.

### Events stay single-channel per frame

Shipped → [senses.md](../../subsystems/senses.md) § Per-frame modality attribution (`Scene.modality`,
`SensorMixin.filterMessage`; a multi-modality event is separate sends).

### Events that leave persistent affordances

Graduated → [senses.md](../../subsystems/senses.md) § Authoring discipline (*events leave persistent
multi-sense affordances*).

### State goes multi-sense via MML `<sense>` tags

Shipped → [senses.md](../../subsystems/senses.md) § `<sense channel="X">` MML wrapper,
§ `senseStripAugmenter`. ⚠ The *untagged text is perceivable to anyone*
rule shipped and is being REVERSED by [legibility-slate § Part D](../builds/legibility-slate.md#part-d--the-perception-verbs--decided) (untagged
prose becomes vision-channel prose); zero content rows use a `<sense>`
region as of 2026-09-18.

### Detail entries are multi-sense, shared keyword

Shipped → [senses.md](../../subsystems/senses.md) § Per-sense `Detail` slot map (the key is
`keywords:`, not `aliases:`; the slots are the five `SenseChannel`s — no
`echolocation` slot), § `<sense channel>` wrapper (`<detail sense=>`
defaults to vision). Zero content rows use a non-vision slot as of
2026-09-18.

### Augmenter behavior under the gestalt

Superseded by the code: `wrapDetailKeysAugmenter`
(`lib/description/Detailed.ts`) wraps every canonical detail key
regardless of the viewer's senses — the strip pass has already removed
the regions the viewer cannot perceive.

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
- *Hot stove* — shipped → [senses.md](../../subsystems/senses.md) § Touch (contact modality),
  [thermal.md](../../subsystems/thermal.md).
- *Taste-test* — superseded by [spoilage.md](../../subsystems/spoilage.md)
  § What a player sees: the freshness band rides `look` / `smell`, `taste`
  gets the palate line, and contamination is reported by NO sense.
- **Student mode:** `sense` in pedagogical mode → sectioned readout with
  lux / dB / ppm / °C from the instruments the student carries.

---

## What this stresses

(Shipped touchpoints removed → [senses.md](../../subsystems/senses.md); what remains is open.)

- **Material** — texture/hardness/material-temp feed touch.
- **race / `BodyPlan`** — **organ-gates-channel** (a sense exists iff the
  BodyPlan declares its organ); `Species` carries the three new
  sensitivity profiles; alien organs (echolocation, pit-sensing) enable
  new channels.
- **vitals** — organ *condition* modulates channel quality (a damaged
  eye/ear); body/ambient temperature; consumables for taste.
- **access / command affordances** — skills gate revelation + afford
  perception verbs (a skill is a source object that contributes the
  verb; see command-routing § Affordance attribution).
- **comms / implant / emotes** — ESP is a sense-channel family here;
  the organ is authored per-creature on the `BodyPlan` (citizens get
  implants, animals get natural empathy, magical beings get magical
  bonds — same channel slot, diegetic flavor varies). Comms / emotes
  deliver *on* these channels; the language gate is the verbal
  channel's property; ungated emote delivery is preserved (universal
  organ across sentient beings + network physics).

---

## Open questions / forks

1. Q1 resolved: per-modality walks on a shared `Modality` base;
   `VisionModality` relocated from `LightApi` — senses.md § Propagation
   walks.
2. **Smell's time dimension (trails/decay/tracking).** The one truly-new
   mechanic; gameplay-rich but stateful. *Lean: design the persistence
   seam now, build trails/tracking as its own wave.*
3. Q3 resolved: one `PerceptionApi` over the `family` field — senses.md
   § `Modality` singletons + `PerceptionApi`.
4. Q4 resolved then overtaken: `sense` shipped and is cut by
   [legibility-slate § Part D](../builds/legibility-slate.md#part-d--the-perception-verbs--decided) — `look` is the verb.
5. Q5 resolved: latest-only, accumulate-per-focus parked — card-surface.md
   § Accumulate vs. latest.
6. Q6 resolved by history: Wave 1 and the contact verbs shipped 2026-06;
   smell trails still wait — senses.md.
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
11. Q11 resolved: a family — `VerbalESPModality` + `EmotiveESPModality`
    — senses.md § Hybrid ESP framing (the language gate on the verbal
    channel is still unbuilt — comms.md § Deferred; its open design is
    not this slate's: the implant half is
    [comms-slate § Implant family](../tails/comms-slate.md) (*Language
    still applies*, lean (ii)), comprehension itself is
    [language-slate § Layer 5](../tails/language-slate.md)).
12. **Emotes: telepathic-only or also physical?** *Resolved: telepathic-
    only.* The animal-doesn't-perceive-the-wave tension dissolves by
    universalizing the ESP organ across sentient creatures — animals,
    familiars, magical beings each declare an empathic organ on their
    `BodyPlan` (the diegetic flavor varies: implant, biological empathy,
    magical bond; the substrate sees one channel-slot, present). See
    **ESP — a channel family** above. One emote, one channel, every
    sentient being in the room perceives it; no double-event needed.
13. Q13 resolved: ESP is not in the `SenseChannel` union; it rides
    frame-level `meta.modality` — senses.md § `SenseChannel` vocabulary.

---

## Build order

Indicative; large subsystem, builds in waves (designed whole here).

**Wave 1** shipped 2026-06 as `Modality` singletons (not
`PerceptionChannel`) → [senses.md](../../subsystems/senses.md); its *per-channel differential rendering*
and *dark-playable* items did not land and keep their own sections above.

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

- **The inspection-card / percept rendering** — consumed; the card slate
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

*Walls are silent in v1* — shipped as designed; graduated → [senses.md](../../subsystems/senses.md)
§ Propagation walks.

### SoundApi propagation and detection

Superseded by the code: there is no `SoundApi`. `SoundModality.soundAt`
is the aggregate, `PerceptionApi.canPerceive` +
`Sound.DEFAULT_HEARING_THRESHOLD_DB` the detection, `AudienceGather` the
push-side direction ([perception.md](../../subsystems/perception.md)
§ Discrete-event sound push). `loudestSourceAt` / `perceivedSound` /
`reverbTimeAt` remain unbuilt (RT60 is Seam 4 below).

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
- **Smell persistence/trails** as a designed-for seam (built later).
- Tests: a being perceives only what its profile + the reaching signal
  allow; a dark room's gestalt leads non-visually; a dog follows a
  decaying scent trail; a contact sense requires the act; an instrument
  reveals the real `Quantity` where prose gives a tag.

Smell trails/tracking, the magic-lens channel, touch sub-modality splits,
and the full vision-convergence wait for their own waves.
