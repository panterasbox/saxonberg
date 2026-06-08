# Augmentation slate (working doc)

> **Status: Wave 1 shipped 2026-06.** The substrate is real
> (`AugmentMixin.confers`, `MixinApi.getActiveMixins` / `isActive`,
> `_augmentGated` + `_grantsModalities` mixin self-declarations,
> `@RequiresActive` decorator, cranial slot on biped/quadruped,
> `AetherImplant` template, `Avatar.enter` bootstrap, the
> verb-level `requiresVerbalESP` / `requiresEmotiveESP` validators).
> See [docs/subsystems/augmentation.md](../subsystems/augmentation.md)
> for the shipped doc. Wave 2+ items below remain.

Working slate for **augmentation** — how an avatar acquires capabilities
its species didn't give it: sensors, limbs, organs, cognition. We
reached for it earlier than planned because comms/emotes/senses now
assume the baseline comm implant exists.

The load-bearing decisions:

1. **Augmentation = an *acquired*, capability-granting part installed
   into a body location.** The clean axis is **innate ⊕ acquired**:
   innate capabilities come from your `BodyPlan` (species); acquired ones
   come from installed augments. **Effective capability = innate ×
   condition × augments**, *derived* (the derived-not-stored discipline).

2. **Arms and sensors are the *same category*.** Augments differ only by
   *which capability* they grant → *which subsystem* they plug into
   (below). "Implant" is the internal form; "prosthetic" replaces a part;
   "graft/enhancement" modifies tissue. **Cybernetic is the flavor**, not
   the category — keep the framework **flavor-agnostic** so a magical
   augment (an enchanted eye, a bound spirit) could plug in later. Build
   cybernetic-only now.

3. **The mechanism reuses what we have — no bespoke engine.** An augment
   is a **`Stuff` in an anatomical/internal slot** (the "implantable"
   affordance, via the slot/embodiment system) that **contributes
   capabilities** the host's resolution includes — exactly how wearables
   contribute affordances and masks/shadows layer over properties.

4. **Three operations on the body:** **add** a capability you lacked
   (ESP, thermal vision, gills), **replace** a lost/damaged innate part
   (prosthetic arm, artificial heart — straight into vitals), **enhance**
   an innate one (stronger arm, sharper eye).

5. **The baseline implant is the do-now thing.** Universal, issued at
   char-gen (standard-issue on enrollment), hardened, always-on; provides
   the **verbal + emotive ESP channels** (cybernetic in mechanism, ESP in
   phenomenology — thoughts willed into existence). Everything else is
   opt-in depth.

See also:

- [docs/slates/senses-slate.md](./senses-slate.md) — **sensor augments
  *are* `PerceptionChannel`s**; the implant is the **ESP sense-organ**
  (verbal + emotive channels). Augments add channels to the sensorium.
- [docs/slates/comms-slate.md](./comms-slate.md) /
  [docs/slates/emotes-slate.md](./emotes-slate.md) — the baseline implant
  carries DM/chat (verbal) + emote perception (emotive). The DM-as-
  tutorial on-ramp.
- [docs/slates/vitals-slate.md](./vitals-slate.md) — **install/remove is
  a medical procedure** (surgery); **replace** augments are prosthetics
  for lost limbs/organs; organ *condition* modulates an augment.
- [docs/slates/capability-magic-slate.md](./capability-magic-slate.md) —
  **motor/cognitive** augments feed the (deferred RPG) capability layer;
  the effective = innate × augments derivation lives there too. Magic
  augments are the flavor-agnostic future.
- [docs/subsystems/slot.md](../subsystems/slot.md) /
  [docs/subsystems/embodiment.md](../subsystems/embodiment.md) — the
  **"implantable" affordance**; augments occupy anatomical slots.
- [docs/subsystems/race.md](../subsystems/race.md) — `BodyPlan` (the
  innate baseline + the anatomical slots augments install into).
- [docs/slates/language-slate.md](./language-slate.md) — a **translation**
  augment (the natural first opt-in capability).
- [docs/design-philosophy.md](../design-philosophy.md) — derived-not-
  stored; liberal diegesis (cybernetic now, magic-able later).

---

## Principle

1. **Innate ⊕ acquired** — body = `BodyPlan` (innate) + installed
   augments; effective capability is *derived* from both.
2. **One category, four capability-types** — sensors/limbs/organs/
   cognition are all augments; the capability decides the subsystem.
3. **One mechanism** — slotted `Stuff` that contributes capability;
   reuse, don't invent.
4. **Frictionless baseline, opt-in depth** — everyone has the comm
   implant (hardened); richer augments are acquired.
5. **Flavor-agnostic** — cybernetic now, magic-able later.

---

## The augmentation model

### Forms (by how they attach)

- **Implant** — installed internal (comm chip, artificial organ, neural
  interface).
- **Prosthetic** — replaces a lost/damaged part (cyber-arm, artificial
  heart). The vitals tie.
- **Graft / enhancement** — modifies existing tissue (subdermal armor,
  enhanced muscle).

### Capability-types (by what they grant → which subsystem)

| Grants | Plugs into | Example |
|---|---|---|
| a **sense** (channel) | senses substrate | comm implant (ESP), thermal-vision eye, echolocation rig |
| a **motor** capability | capability / locomotion | cyber-arm (manipulation, strength), wheels |
| an **organ / vital** function | vitals | artificial heart/lung, filter |
| a **cognitive** capability | capability / comms / access | translation chip, skill-chip, memory, comm tier |

### The three operations

**Add** (new capability the body lacked) · **Replace** (a lost/damaged
innate part — prosthetic; vitals owns the loss, augmentation owns the
replacement) · **Enhance** (boost an innate capability).

---

## The mechanism (reuse, no bespoke engine)

An augment is a **`Stuff` occupying an anatomical/internal slot** — the
**"implantable" affordance** on `BodyPlan` (slot capacity by body region:
cranial / ocular / cochlear / limb / torso / dermal …). While installed,
it **contributes capabilities** the host's resolution walks include:

- a sensor augment contributes a `PerceptionChannel` → it appears in the
  sensorium;
- a cyber-arm contributes manipulation + a strength modifier → capability
  resolution includes it;
- an artificial organ contributes a vital function → vitals includes it.

So **effective capability = innate baseline + slotted contributions**,
resolved at query time — the same shape as masks/shadows over properties
and the derived-capability model. No new engine; it's slotted-Stuff-
contributes-capability.

**Condition & failure** (from the implant work): augments can lose power,
malfunction, be jammed/EMP'd/hacked; organ condition (vitals) modulates
quality. The **baseline is hardened** — casual failure can't kill basic
comms/ESP; only exotic attacks reach the **trust boundary** (spoofed ESP
attribution — late-game espionage). **Install/remove is a medical
procedure** (cyberdoc/clinic; risk, recovery, rejection — the vitals
surgery tie, and a rich nursing-pedagogy scenario).

---

## The baseline implant (the do-now load-bearing piece)

The *only* augment the current infrastructure requires:

- **Universal, issued at char-gen** (standard-issue on enrollment),
  **hardened**, always-on.
- Provides the **verbal + emotive ESP channels** (senses slate) — so
  DM/chat (verbal, language-gated) and emote perception (emotive,
  language-free) work, ungated, for every citizen.
- **DM is the tutorial on-ramp** to the whole augmentation system: first
  DM → "I have an implant" → discover its features → onboard.

Build this; defer the rest.

---

## Character generation

Augmentation is one of char-gen's customization axes:

- **Baseline implant: always issued** — a non-choice default (universal,
  hardened).
- **Optional starting augments: a build/loadout choice** — like picking a
  background/class; augments become part of character identity (a sensor
  package, a prosthetic, a skill-chip).
- **In-world acquisition** later via install (cyberdoc/clinic — the
  vitals procedure).

This slate doesn't design char-gen itself — it's one axis; the baseline-
issued part is what's load-bearing now, the loadout is designed-for.

---

## What this stresses

- **senses** — sensor augments are `PerceptionChannel`s; the implant is
  the ESP organ; augments add channels to the sensorium.
- **vitals** — replace-augments are prosthetics for lost limbs/organs;
  install = surgery; organ condition modulates an augment.
- **slot / embodiment** — the "implantable" affordance + anatomical-slot
  capacity; augments contribute capability like wearables contribute
  affordances.
- **race / `BodyPlan`** — the innate baseline + the anatomical slots.
- **capability-magic** — motor/cognitive augments + the effective =
  innate × condition × augments derivation; the deferred RPG layer.
- **comms / emotes** — the baseline carries verbal + emotive ESP.
- **access / verb-provisioning** — augments may gate/afford capabilities
  and verbs (a skill-chip affords its verbs; a sensor affords a perception
  verb).
- **char-gen** — a customization axis (baseline issued + optional loadout).

---

## Open questions / forks

1. **Umbrella term** — *Resolved: augmentation* (implant = the central
   form); slate renamed.
2. **Char-gen scope now** — baseline-issued only, or also the optional
   starting-augment loadout? *Lean baseline now; loadout designed-for,
   built when char-gen matures.*
3. **Mechanism = slotted-Stuff-contributes-capability** — *Lean yes;
   reuse slots/embodiment + capability resolution, no bespoke engine.*
4. **Magic augments later** — *Lean: keep the framework flavor-agnostic;
   build cybernetic-only now.*
5. **Slot model** — how many augment slots, by which body regions, with
   what capacity; the interplay with vitals anatomy (an augment occupies
   an anatomy location → does losing the location lose the augment?).
6. **Prosthetic ↔ vitals boundary** — vitals owns the loss/wound;
   augmentation owns the replacement. Pin the seam.
7. **Effective-capability resolution** — exactly how augment
   contributions layer over the innate baseline (shared with
   capability-magic's derived-capability model).
8. **Failure-mode depth in v1** — *Lean: baseline reliable; power/jam/
   hack/spoofing layer comes later.*
9. **Cognitive augments vs RPG capability** — skill-chips overlap with the
   deferred capability/skill system; reconcile when that lands.

---

## Build order

Incremental, baseline-first.

**Wave 1 — the "implantable" affordance + the baseline implant.** The
implantable slot affordance on `BodyPlan`; the baseline comm implant as
an installed `Stuff` providing the verbal + emotive ESP channels
(senses); char-gen issues it. Enough to make the comms/senses dependency
concrete.

**Wave 2 — install + first opt-in augment + the contribution mechanism.**
Install/remove as a (medical) procedure (vitals tie); the slotted-
contribution capability resolution generalized; the **translation**
augment as the first opt-in capability (language tie).

**Wave 3+ — the roster + depth.** Sensory / motor / organic / cognitive
augments across their subsystems; the char-gen loadout; failure modes,
power/maintenance, and eventually the hacking/spoofing trust-boundary
layer; the magic-augment flavor.

---

## What this slate does NOT cover

- **The comms protocol** (DM/chat/channels) → comms slate; the baseline
  *carries* it.
- **The senses substrate** → senses slate; augments *contribute channels*
  to it (the implant is the ESP organ).
- **The vitals medical system** → vitals; install/prosthetics *consume*
  it (surgery, organ loss).
- **The capability/skill system** → capability-magic; motor/cognitive
  augments *consume* it; the effective-capability derivation lives there.
- **Char-gen itself** — augmentation is one of its axes, not the whole.
- **Magic** — deferred; the framework just stays flavor-agnostic so it
  can host magical augments later.

---

## Once shaped into formal requirements

This slate boils down to:

- The **augmentation** umbrella (acquired, capability-granting; innate ⊕
  acquired; effective = innate × condition × augments, derived); the
  **forms** (implant/prosthetic/graft) and **capability-types**
  (sensory/motor/organic/cognitive → subsystem).
- The **three operations** (add/replace/enhance).
- The **mechanism**: an augment is a `Stuff` in an anatomical slot (the
  "implantable" affordance) contributing capability the host's resolution
  includes — reusing slots/embodiment + capability resolution.
- The **baseline implant** (universal, issued, hardened) providing the
  verbal + emotive ESP channels — the do-now piece — and the DM tutorial
  on-ramp.
- **Install/remove as a medical procedure** (vitals); condition/failure;
  the hardened baseline + the spoofing trust boundary.
- **Char-gen interface** (baseline issued; optional starting loadout).
- Tests: a being's effective sensorium/capability = innate + installed
  augments; the baseline implant grants verbal + emotive ESP to every
  citizen, ungated; an augment occupying a slot contributes its
  capability; install/remove runs through the medical procedure; the
  baseline survives casual failure (comms/ESP hold).

The full augment roster, char-gen loadout, prosthetics-via-vitals depth,
failure/hacking layer, and magic augments wait for their own waves.
