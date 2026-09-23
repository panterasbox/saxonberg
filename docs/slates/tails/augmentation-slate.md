# Augmentation slate (working doc)

> **Status:** PARTIAL — Wave 1 shipped 2026-06 (`confers`,
> `getActiveMixins`, `@RequiresActive`, the cranial slot, `AetherImplant`)
> → [augmentation.md](../../subsystems/augmentation.md). The substrate
> also grew a third (employment) conferral leg and two more real
> `_augmentGated` consumers (`CasterMixin`, `MakerMixin`) since Wave 1 —
> see augmentation.md.
> **Left:** the medical install/remove procedure · the char-gen augment
> loadout · translation, prosthetic, sensor, motor and cognitive
> augments (only the baseline `AetherImplant`/cranial-slot form ships) ·
> the failure and hacking modes · the multi-region slot model (only
> `cranial`, capacity 1, exists)
> **Size:** a wave

Working slate for **augmentation** — how an avatar acquires capabilities
its species didn't give it: sensors, limbs, organs, cognition. We
reached for it earlier than planned because comms/emotes/senses now
assume the baseline comm implant exists.

See also:

- [docs/slates/senses-slate.md](../builds/senses-slate.md) — **sensor augments
  *are* `PerceptionChannel`s**; the implant is the **ESP sense-organ**
  (verbal + emotive channels). Augments add channels to the sensorium.
- [docs/slates/comms-slate.md](../tails/comms-slate.md) /
  [docs/slates/emotes-slate.md](../builds/emotes-slate.md) — the baseline implant
  carries DM/chat (verbal) + emote perception (emotive). The DM-as-
  tutorial on-ramp.
- [vitals-slate.md](./vitals-slate.md) — **install/remove is
  a medical procedure** (surgery); **replace** augments are prosthetics
  for lost limbs/organs; organ *condition* modulates an augment.
- [docs/slates/capability-magic-slate.md](../builds/capability-magic-slate.md) —
  **motor/cognitive** augments feed the (deferred RPG) capability layer;
  the effective = innate × augments derivation lives there too. Magic
  augments are the flavor-agnostic future.
- [docs/subsystems/slot.md](../../subsystems/slot.md) /
  [docs/subsystems/embodiment.md](../../subsystems/embodiment.md) — the
  **"implantable" affordance**; augments occupy anatomical slots.
- [docs/subsystems/race.md](../../subsystems/race.md) — `BodyPlan` (the
  innate baseline + the anatomical slots augments install into).
- [docs/slates/language-slate.md](../tails/language-slate.md) — a **translation**
  augment (the natural first opt-in capability).
- [docs/design-philosophy.md](../../design-philosophy.md) — derived-not-
  stored; liberal diegesis (cybernetic now, magic-able later).

---

## The augmentation model

### Forms (by how they attach)

- **Implant** — installed internal (comm chip, artificial organ, neural
  interface).
- **Prosthetic** — replaces a lost/damaged part (cyber-arm, artificial
  heart). The vitals tie.
- **Graft / enhancement** — modifies existing tissue (subdermal armor,
  enhanced muscle).

### The three operations

**Add** (new capability the body lacked) · **Replace** (a lost/damaged
innate part — prosthetic; vitals owns the loss, augmentation owns the
replacement) · **Enhance** (boost an innate capability).

---

## The mechanism (reuse, no bespoke engine)

The **"implantable" affordance** on `BodyPlan` names slot capacity by
body region: cranial / ocular / cochlear / limb / torso / dermal … —
only `cranial` (capacity 1) is shipped; the rest are still just names
(see the slot-model open question below).

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

- **DM is the tutorial on-ramp** to the whole augmentation system: first
  DM → "I have an implant" → discover its features → onboard.

---

## Character generation

Augmentation is one of char-gen's customization axes:

- **Optional starting augments: a build/loadout choice** — like picking a
  background/class; augments become part of character identity (a sensor
  package, a prosthetic, a skill-chip).
- **In-world acquisition** later via install (cyberdoc/clinic — the
  vitals procedure).

This slate doesn't design char-gen itself — it's one axis; the baseline-
issued part is what's load-bearing now, the loadout is designed-for.

---

## Open questions / forks

1. **Slot model** — how many augment slots, by which body regions, with
   what capacity; the interplay with vitals anatomy (an augment occupies
   an anatomy location → does losing the location lose the augment?).
   **First concrete pressure (fast-travel build, 2026-06-12):** the
   travel implant collided with the capacity-1 `cranial` slot already
   holding the baseline `AetherImplant`, so the travel credential shipped
   as a *card* default instead. As players accrue augs, cranial-only-
   capacity-1 won't hold. The *mechanism* answers already exist — (a)
   **more regional slots** (ocular / cochlear / limb / torso / dermal per
   the list above) and (b) **capacity-expander augs** that `_grantsSlots`
   (the `CyberArm` seam in augmentation.md). The open *design* question is
   whether slot scarcity is a **deliberate loadout economy** (choosing
   your augs is a real tradeoff — the on-theme RPG version) or just a
   **ceiling you grow past** — and that fork is **game design** (deferred),
   downstream of the augmentation build wave.
2. **Prosthetic ↔ vitals boundary** — vitals owns the loss/wound;
   augmentation owns the replacement. Pin the seam.
3. **Effective-capability resolution** — exactly how augment
   contributions layer over the innate baseline (shared with
   capability-magic's derived-capability model).
4. **Cognitive augments vs RPG capability** — skill-chips overlap with the
   deferred capability/skill system; reconcile when that lands.

---

## Build order

Incremental, baseline-first.

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
