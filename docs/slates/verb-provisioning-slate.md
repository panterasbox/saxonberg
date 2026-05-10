# Verb-provisioning slate (working doc)

Working slate for the **verb-acquisition pattern**: a single
canonical verb (one YAML view + one controller) reachable through
many provisioning paths — innate physiology, learned skill,
wielded instrument, worn implant, transient consumable, ambient
world effect — each with its own permission gate and its own
narrative framing, dispatching to the same engine pipeline.

The motivating cluster is **inspection / perception verbs**
(`look`, `analyze`, `identify`, `recognize`, `scan`, `measure`,
`scry`, `decipher`, …) where the player's *path to knowing* is
narratively interesting and mechanically distinct, but the
engine's underlying read is the same. The pattern generalizes
beyond inspection — `pick-lock` (skill / lockpicks /
biometric-spoofer implant), `mend` (skill / repair-kit / nanite
swarm), `light fire` (skill / flint-and-steel / pyrokinetic
implant) — but inspection is where the seam shows clearest and
ships first.

See also:

- [docs/subsystems/quantities.md](../subsystems/quantities.md) — the
  **instruments-reveal** path is one branch of this slate's
  taxonomy; the Quantities substrate holds the canonical-units-
  vs-tags pedagogical claim and the per-instrument roster.
- [docs/slates/recognition-slate.md](./recognition-slate.md) — actor
  recognition is one inspection verb; same shape with a
  per-viewer memory dimension.
- [docs/slates/identification-slate.md](./identification-slate.md) —
  item identification is another; the trigger-verb roster
  there (`read scroll of identify`, `analyze`, `taste`,
  `learn-from-teacher`) is exactly this slate's branching
  taxonomy applied to one verb family.
- [docs/subsystems/perceiver.md](../subsystems/perceiver.md) —
  the **innate** path is already shipped: `PerceiverMixin`
  contributes `look` / `scry` / `locate` to every Character.
  The wielded-instrument seam (`ScryableMixin.canScryFor`) is
  shipped as an ad-hoc one-off; this slate is the scaffold
  that says "this is one of N paths."
- [docs/subsystems/command-routing.md](../subsystems/command-routing.md)
  — the per-giver recency stack and frame attribution already
  carry "where did this binding come from" data; the slate
  rests on those primitives.
- [docs/subsystems/properties.md](../subsystems/properties.md) —
  the shadow / mask mechanism is the per-path override seam.
- [docs/subsystems/call-security.md](../subsystems/call-security.md)
  — paths gate at the source, not in the controller.
- [docs/slates/mixin-slate.md](./mixin-slate.md) — skill-as-mixin and
  implant-as-Wearable both show up here as candidate mixins.
- [docs/slates/embodiment-slate.md](./embodiment-slate.md) — wearable
  body-slot mechanics underpin implants; same composition shape.
- [docs/design-philosophy.md](../design-philosophy.md) — layered
  presentation; same engine numbers, different prose framing.

---

## The shape

```
                              ┌─────────────────────────┐
                              │  AnalyzeChemistry verb  │
                              │  YAML view + controller │
                              └──────────▲──────────────┘
                                         │ binds via
       ┌─────────────────┬───────────────┼───────────────┬─────────────────┐
       │                 │               │               │                 │
   innate            learned          wielded         worn /            ambient /
  (physiology)       (skill)        (instrument)      installed         transient
                                                      (implant /        (consumable
                                                       wearable)         / world aura)
       │                 │               │               │                 │
PerceiverMixin     KnownSkill        Wieldable       Wearable in     Buff / shadow /
contributes on    contributes       contributes     `body.implant.*` LocationFloodMixin
   `self`         on `self`         when held       contributes      contributes
                  once learned                      while installed  for duration
       │                 │               │               │                 │
  innate gate       skill-rank      instrument-     implant-power /   buff-active
                    threshold        calibration    biocompat /        check
                                                    license check
                                         │
                                         ▼
                                ┌────────────────────┐
                                │  Controller        │
                                │  - reads frame.via │
                                │  - dispatches to   │
                                │    shared analysis │
                                │  - renders flavor  │
                                │    per source      │
                                └────────────────────┘
```

One verb, one controller, one engine read. N provisioning paths,
N gates, N flavors of output prose.

---

## Core claim

**Verbs are interfaces; sources are providers.** The YAML view
declares the verb's shape (name, args, validators, scope, output
contract). Any source that can satisfy the gate may bind to the
verb on the giver's stack. The controller is path-agnostic at the
data layer and path-aware only at the prose layer.

This is the same separation the engine already uses for
**target-side capability seams** (a Throne contributing `sit` on
`environment`, a Scryable instrument contributing `scry`-targeting
on the wielder). The slate's contribution is to apply it
symmetrically on the **actor-side**: a learned skill, a worn
implant, a sipped potion can each contribute the same verb on
`self` with their own gate and flavor.

---

## The provisioning taxonomy

| Path | Composition | Gate | Lifetime | Flavor lens |
|---|---|---|---|---|
| **Innate** | Mixin contributes verb on `self` from birth (`PerceiverMixin → look`) | Always available; species / clade-conditioned | Lifetime of the character | "you peer into…" |
| **Skill** | `KnownSkillsMixin` (proposed) — contributes verbs whose definitions list it as a skill source. Rank thresholds may unlock more capable variants of the same verb. | Skill present + rank ≥ threshold | Persistent once learned (and not forgotten / atrophied) | "you draw on your knowledge of…" |
| **Wielded instrument** | A `Stuff` composing `Wieldable` contributes the verb when in the giver's hand (today's `subsystems/quantities.md` pattern) | Wielded + instrument-functional (calibration, charge, intact) | While wielded | "the meter reads…", "the lens reveals…" |
| **Worn implant / wearable** | A `Stuff` composing `Wearable` in a body slot — including future implant slots like `body.implant.brain` — contributes the verb while installed | Installed + powered + biocompatible / licensed | While installed | "your retinal HUD reports…", "the implant whispers…" |
| **Consumable / transient** | A potion / scroll / spell installs a buff (mixin or shadow) for a duration; the buff contributes the verb | Buff active + duration not elapsed | Duration-bounded | "for a moment you perceive…" |
| **Ambient / world** | A location, aura, or piece of furniture contributes the verb on `self` while the giver is inside scope | Inside the contributing scope | While in scope | "the chamber's warding light shows you…" |

The taxonomy is open-ended — a "magical mark" path or a "telepathic
share" path slots in by adding a row, not by reshaping the
controller. New paths are pure additions; the controller never
learns about them by name.

---

## Wiring sketch

### YAML view — path-agnostic

The view declares the verb's shape. It does not enumerate paths.

```yaml
# mud/cmd/analyze.yaml
verb: analyze
synopsis: analyze <target> [for <property>]
controller: AnalyzeController
scope:
  target: { try: [self, inventory, environment] }
  property: { type: ident, optional: true }
output:
  channel: instrument-or-prose
```

### Source mixins — each contributes the binding

A path that grants the verb composes a mixin whose
`contributedCommands()` lists `analyze` for the appropriate bucket
(`self` for actor-side capabilities) plus a `via` tag identifying
the path:

```ts
// Skill path
class KnownSkillsMixin extends Mixin(Stuff) {
  contributedCommands(bucket: Bucket) {
    if (bucket !== 'self') return [];
    return this.knownSkills
      .flatMap((skill) => skill.contributedCommands())
      .map((c) => ({ ...c, via: { kind: 'skill', source: c.skillId } }));
  }
}

// Instrument path
class WieldableInstrumentMixin extends Wieldable(Stuff) {
  contributedCommands(bucket) {
    if (bucket !== 'self' || !this.isWielded()) return [];
    return [{ verb: 'analyze', via: { kind: 'instrument', source: this.id } }];
  }
}

// Implant path — `Wearable` already shipped; the implant body slot
// is the only new piece, plus a `via` tag.
class CyberneticImplantMixin extends Wearable(Stuff) {
  bodySlot = 'body.implant.brain';
  contributedCommands(bucket) {
    if (bucket !== 'self' || !this.isInstalled() || !this.hasPower()) return [];
    return [{ verb: 'analyze', via: { kind: 'implant', source: this.id } }];
  }
}
```

The exact name of the contribution hook is a detail (the existing
seam is in `command-routing.md` and the per-giver stack); the
slate's claim is that **multiple sources may contribute the same
verb** and the dispatcher records `via` on the resulting frame.

### Per-path gating — at the source, not the controller

Each source vetoes its own contribution before the binding lands
on the stack. The controller never asks "does the player have a
skill / instrument / implant" — by the time the controller runs,
the binding is already proof of provisioning.

This is the symmetry of the existing scope try-list (target-side
gating) applied to the actor-side. It's also the right place for
**cost** semantics: a skill path may charge stamina, an instrument
path may consume a battery, an implant path may dissipate heat.
Costs live with the source mixin; the controller is cost-blind.

### Controller — path-aware only at the prose layer

```ts
class AnalyzeController extends StuffWrappedController {
  execute(frame) {
    const reading = MaterialApi.analyze(frame.target); // engine read
    return this.renderFor(frame.via, reading);
  }
  renderFor(via, reading) {
    switch (via.kind) {
      case 'skill': return ProseApi.format(SKILL_TEMPLATE, { reading, via });
      case 'instrument': return ProseApi.format(INSTRUMENT_TEMPLATE, { reading, via });
      case 'implant': return ProseApi.format(IMPLANT_TEMPLATE, { reading, via });
      case 'innate': return ProseApi.format(INNATE_TEMPLATE, { reading, via });
      // …new paths add a case; absence falls through to a generic template
    }
  }
}
```

The engine read is shared. The prose template is per-path. New
paths add a template; they don't fork the analysis pipeline.

### Shadows for path-conditional behavior

When a path doesn't just frame the read but **alters** it — e.g. a
hood-and-mask disguise that shadows recognition (per
[recognition-slate.md](./recognition-slate.md)), or a calibrated
instrument that returns more digits than the eyeball — the shadow
mechanism is the seam. Path mixin → installs shadow on the read
methods → controller's call to `MaterialApi.analyze` traverses the
shadow stack.

The shadow seam predates this slate; the slate's only addition is
that **path mixins are first-class shadow installers**. A
`PrecisionScale` instrument shadows `weigh` to return three
decimal places; a `WitchSightImplant` shadows `look` to ignore
illusions; a `TruthPotion` shadows speech rendering for its
duration.

---

## Worked example — `analyze chemistry of beaker`

Five paths to the same verb against the same target:

1. **Innate (none).** No species in v1 has innate chemical
   analysis. The path is empty for default characters; a future
   silicate-based species might have it.

2. **Skill.** `Skill.Chemistry.rank ≥ 2` contributes `analyze`.
   Render: *"You recognize the salty note, faint sulfides — looks
   like brackish water with traces of pyrite runoff."* Pedagogical
   framing: the player's CHARACTER reasons from prior coursework.

3. **Wielded instrument.** A `pH-meter` or `SpectrumAnalyzer` in
   hand contributes `analyze`. Render: *"pH meter: 6.2. Slight
   acid. Spectrometer fixed peaks at 432 nm and 588 nm."* Numbers
   come from the same `MaterialApi` read; the framing is
   instrument-direct.

4. **Worn implant.** A `ChemAssay` cybernetic in
   `body.implant.fingertip` contributes `analyze`. Render: *"Your
   fingertip pad reports H₂O, FeS₂ traces, pH 6.2, T 295 K."*
   Same numbers; HUD framing.

5. **Consumable.** Drinking a `Potion of Detect Substance` installs
   a 60-second buff that contributes `analyze`. Render: *"For a
   heartbeat the beaker reveals itself — water, iron pyrite,
   slightly acid."* Same numbers; magical framing; expires.

All five paths read the same engine state. Pedagogically the
student sees the same chemistry from five angles — and the
**chemistry is the engine's chemistry**, not bespoke per-path
copy.

---

## Connections to the existing engine

The pattern slots into shipped surfaces, not against them:

- **Per-giver recency stack** (`command-routing.md`): each binding
  is already a record on the stack. The slate adds a `via` field
  to the record so frames carry "how this binding got here."
- **YAML view + controller MVC** (`command-spec.md`): unchanged.
  One verb is one YAML and one controller regardless of provisioning
  count.
- **Scope try-list** (`command-routing.md`): the slate's actor-side
  gating is the symmetric counterpart of the target-side try-list.
- **Mixin composition** (`mixins.md`): each path is a mixin. New
  paths come with new mixins, not new framework concepts.
- **Shadow seam** (`properties.md`): per-path *behavior* overrides
  install through the existing shadow stack.
- **Call-security** (`call-security.md`): per-path *capability*
  gates use existing policy decorators on the `contributedCommands`
  hook; an unauthorized actor can't even propose a binding.
- **`updates_focus`** (`command-routing.md`): provisioning changes
  (wielding / unwielding an instrument, learning / forgetting a
  skill, plugging in / removing an implant, buff start / expiry)
  fire `system.commands.{added,removed}` so the client's command
  schema stays in sync with the player's current capability set.

---

## Why now / why not now

**Why document now.** The first two paths (innate and wielded
instrument) are already shipped or sketched in adjacent slates,
and a third (skill) is implicit in the roadmap. Without the
unifying frame, the third and fourth and fifth paths each get
re-invented per-channel; with the frame, they're rows in a table.

**Why not implement now.** No path beyond innate and instrument
needs to ship for v1. The slate's job is to make sure when skills
land, when implants land, when the first buff verb lands, the
engineer reaches for "another row in the provisioning table" and
not "another bespoke verb infrastructure."

The slate also identifies one cheap pre-emptive move worth doing
**before** the second non-innate path lands: add the `via` field
to bindings on the per-giver stack, and start emitting it in
frames. Cost: small. Benefit: every path that arrives later starts
out with attribution baked in, and the prose-rendering
plumbing has a place to hang.

---

## Open threads

- **Skill-as-mixin shape.** Is a "Skill" a Stuff (clonable
  template) the player owns and composes a `KnownSkillsMixin`
  collection of? Or a property bag? `mixin-slate.md` doesn't
  pick yet.
- **Rank thresholds.** Skill paths likely contribute *more capable
  variants* of the same verb at higher ranks (more digits, more
  species recognized, more compounds named). Is that one verb
  with a rank-aware shadow, or N adjacent verbs (`analyze`,
  `analyze-precise`, `analyze-expert`)? The slate currently
  assumes shadow-on-one-verb.
- **Cost semantics.** Stamina / battery / heat / charge — these
  feel like a sibling cross-cutting concern. Worth its own slate
  once the second cost-bearing path lands.
- **Conflicts between paths.** If two paths contribute the same
  verb (you have the skill AND wield the instrument), does the
  dispatcher pick one, present a chooser, or aggregate? Default
  proposal: most-recently-asserted source wins, with explicit
  syntax to disambiguate (`analyze beaker via meter`). Aligns with
  the existing recency stack semantics.
- **Authoring ergonomics.** Each path's mixin needs a clean way
  to declare "I contribute these verbs." The exact API name for
  the contribution hook is a detail to land when the second
  provisioning mixin (KnownSkillsMixin or implant) ships.

---

## Cross-references back from this slate

When new slates / subsystems address verb-acquisition, link back
here so the pattern stays one-stop. Specifically:

- `subsystems/quantities.md` (instruments-reveal seam)
  → "one path in the verb-provisioning taxonomy"
- `recognition-slate.md` recognition verbs → "actor-side reads
  through this slate's taxonomy"
- `identification-slate.md` identification triggers → "the
  trigger-verb roster IS this slate's taxonomy applied to one
  verb family"
- A future `skills-slate.md` → "the **skill** path of this slate"
- A future `cybernetics-slate.md` → "the **implant** path of
  this slate"
