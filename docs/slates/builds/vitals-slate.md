# Vitals slate (working doc)

Working slate for the **Vitals** subsystem — the basic-biology layer
that gives a living agent a lifecycle: it can be healthy, hurt, sick,
exhausted, unconscious, and dead. No RPG, no combat, no character
sheet. Just the body as a system with measurable state that degrades,
progresses, recovers, and eventually terminates.

The load-bearing decision this slate makes: **there is no primary
hitpoint scalar.** "How hurt am I" is *derived* from a substrate of
real biological state — blood volume, vital signs, and a set of
discrete conditions afflicting the body. The familiar, accessible
"you're hurt / you're dying / 0 = death" surface is preserved as a
**rendered summary** over that substrate, not as the source of truth.

Why bother, when `addHp(-10)` is simpler: a single scalar collapses
the exact differentiation our nursing students practice on. Disease,
poison, fracture, laceration, bruise, infection, blood loss,
exhaustion — these *require different assessment and different
treatment*, and a single HP bar erases all of it. The differentiation
**is** the educational product; it is not a polish layer added later
— the educational principle is the v1 spec, not something staged in.

This is also the consumer the race subsystem deferred for: race.md
ships `OrganismMixin.lifecycleState` (`alive`/`dead`/`undead`) with
"state-machine present, transition flow not." Vitals is what drives
the transition.

See also:

- [docs/subsystems/race.md](../../subsystems/race.md) — `OrganismMixin`
  (`lifecycleState`, `age`), `Species` (lifespan, lifecycle states),
  `BodyPlan` (anatomy as slots), `SpeciesApi.isAlive`/`isAnimate`.
  Vitals composes onto Organisms and drives the deferred
  death-transition flow. Also earns race.md's deferred "tissue
  authoring as named Details with their own materials."
- [docs/subsystems/quantities.md](../../subsystems/quantities.md) — the
  `Quantity<U>` substrate. Every vital sign is a real-units Quantity
  with friendly tags; the marshaller / `initProp({marshaller})`
  pattern holds them. Needs a few new units (see below).
- [docs/subsystems/biome.md](../../subsystems/biome.md) — the
  **instrument + `measure <field>` + `analyze` provenance** pattern.
  Taking a patient's vitals is the same shape, targeted at an
  organism instead of the environment. The Thermometer already
  exists.
- [docs/subsystems/activity.md](../../subsystems/activity.md) —
  `ScheduledEmission` / `ScheduleApi.recurring` cadence. Condition
  progression (bleeding, infection, healing) reuses this; a
  condition is *not* an engagement-slot activity, but it borrows the
  ticking machinery.
- [docs/subsystems/perception.md](../../subsystems/perception.md) —
  viewer-aware query pattern. A measurement targeted at another
  organism is a perception, not an environment read.
- [docs/subsystems/properties.md](../../subsystems/properties.md) —
  `PropertiedMixin`, masks. Content-defined per-condition data and
  resistances live in the property bag; equipment/buffs mask
  effective values.
- [docs/subsystems/collections.md](../../subsystems/collections.md) —
  the active-conditions collection surface on the host.
- [docs/subsystems/lifecycle.md](../../subsystems/lifecycle.md) —
  `StuffApi.destruct` is *removal from the world*; **death is a
  lifecycle-state transition, not destruction.** A corpse persists.
- [docs/design-philosophy.md](../../design-philosophy.md) — Principle 4
  (reality-shaped models seed from real data), which the nutrition
  model and the species roster both instance; and the "model
  honestly / layered presentation" disciplines the instrument seams
  follow.

---

## Principle

Three claims:

1. **Health is derived, not stored.** No `hp` field. The body's
   truth is blood volume + vital signs + active conditions +
   reserves. The accessible "how hurt am I" readout is a rendered
   band over that substrate. One source of truth; the familiar bar
   is a view.

2. **Differentiation is the product.** Conditions are
   *distinguishable* — a fracture is not a fever is not a poisoning
   is not blood loss. They present differently (different vital
   signatures, different observable signs), progress differently,
   and resolve differently. A nursing student must be able to
   *assess* the difference even before the full treatment verb suite
   ships. Anything that collapses conditions into an undifferentiated
   "damage" number fails the principle.

3. **Vitals are real, measurable units.** Body temperature in
   Kelvin (rendered °C/°F-friendly), pulse in beats/min, blood
   pressure in mmHg, SpO₂ in %, blood volume in litres. Same
   `Quantity<U>` honesty as light and sound: authors work with
   friendly tags, students with instruments read the real numbers.

The substrate decision: **state + behavior live on a `VitalsMixin`
composed onto the Organism.** The body owns its own biology. Resist
spinning up a `VitalsApi` until a genuine cross-host helper appears (default to
mixin methods on the body itself); the candidate for an Api is the
deferred `inflict` seam, and it's parked.

---

## Layered design

| Layer | Concern | Lives in |
|---|---|---|
| 1. `VitalsMixin` | State home: vital-sign fields, reserves, active-condition collection | `lib/vitals/Vitals.ts` |
| 2. Vital signs | Continuous measurable state as `Quantity<U>`; survivable bands | `VitalsMixin` fields + a band table |
| 3. Anatomy | Typed `BodyPart` structure on shared `BodyPlan` + instance deltas; `DetailedMixin` for addressing/look | `BodyPlan` descriptors + `DetailedMixin` + flesh material |
| 4. Conditions | Two kinds: authored **afflictions** (templated Ideas) + parameterized **trauma** | `lib/condition/...` templates + a trauma value shape |
| 5. Progression | Conditions evolve over time | `ScheduledEmission` / `ScheduleApi.recurring` |
| 6. Death & lifecycle | Vitals drive `lifecycleState` transitions; corpse handling | race.md's `OrganismMixin` + a transition driver |
| 7. Pedagogical seam | Instruments, `measure`/`assess` verbs, the derived summary readout | `Thermometer` (exists), Sphygmomanometer, PulseOximeter, Stethoscope |
| 8. Reserves | Endurance + nutrition (satiation/hydration) as depletable-recovering axes; mana out | `VitalsMixin` reserve fields |

---

## Layer 1 — `VitalsMixin`

Composes onto an Organism that should have a body that can break —
`Character` (every Avatar + NPC) and animate animal NPCs. A peace
lily (sessile, no agency) does not compose it; a frog does.

```ts
export interface Vitals {
  // Vital signs — Layer 2
  getVitalSign(sign: VitalSign): Quantity<Unit>;
  setVitalSign(sign: VitalSign, value: Quantity<Unit>): void;

  // Active conditions — Layer 4 (collection surface, collections.md)
  getConditions(): readonly ActiveCondition[];
  hasCondition(pred: ConditionQuery): boolean;
  afflict(condition: ActiveCondition): void;   // add
  relieve(condition: ActiveCondition): void;   // remove (resolution)

  // Reserves — Layer 8
  getEndurance(): Quantity<"%">;
  setEndurance(v: Quantity<"%">): void;

  // Derived — Layer 7 (computed, never stored)
  getConditionBand(): ConditionBand;     // healthy | hurt | serious | critical | dead
  getConsciousness(): Consciousness;     // conscious | unconscious | dead
}
```

Storage shape: vital signs are marshalled `Quantity` props (or
first-class fields with `static fieldMarshallers`); the active-
condition collection is a persistent list of `ActiveCondition`
records; reserves are a `Quantity<'%'>`. Derived getters compute on
every call — never persisted, never cached (HMR-safe, same discipline
as `OrganismMixin.getSpecies`).

**Why a mixin and not properties-on-Avatar:** vitals is genuine new
per-entity *state plus a method surface* — exactly what a mixin is
for, and it composes uniformly onto every Organism kind. The
content-defined per-condition data still lives in the property bag
(Layer 4), but the engine vocabulary (the vital signs themselves,
the bands, the reserves) is first-class.

---

## Layer 2 — Vital signs

The continuous measurable state. Each is a `Quantity<U>` with a
survivable band; leaving the band is what eventually flips the
lifecycle state (Layer 6).

| Sign | Unit | Healthy (Homo sapiens) | Survivable band | Notes |
|---|---|---|---|---|
| Core temperature | `K` (thermal scale) | ~310 K (37 °C) | ~301–315 K | Fever ↑, hypothermia ↓ |
| Heart rate | `bpm` (new) | 60–100 | ~30–220 | 0 → cardiac arrest |
| Respiratory rate | `bpm` (breaths) | 12–20 | ~6–40 | 0 → respiratory arrest |
| Blood pressure | `mmHg` (new), systolic/diastolic | ~120/80 | sys ~70–200 | Two values; shock at low |
| SpO₂ | `%` | 95–100 | ~70–100 | Hypoxia below |
| Blood volume | `L` (new) | ~5 L | ~3.2–5 L | Hemorrhage drains it; floor → death |
| Hydration | `%` | ~100 | ~70–100 | Slow axis |

New units this needs in the `Quantity` catalog: **`bpm`** (rate;
serves both pulse and respiration via separate scales), **`mmHg`**
(pressure, with a converter to/from the existing `Pa`), and **`L`**
(volume, converter to/from `m³`). Each ships a friendly tag table
(`bpm`: `bradycardic`/`normal`/`tachycardic`; `mmHg`:
`hypotensive`/`normal`/`hypertensive`; etc.) so casual prose and
authoring stay tag-friendly while instruments reveal the numbers.

Healthy baselines and survivable bands are **per-species** — read
from the `Species` template (a frog's heart rate band is not a
human's). This extends the existing `Species` capability fields
(`lifespanMin`, `visionProfile`) with a `vitalProfile`.

---

## Layer 3 — Anatomy (the *site* of trauma)

"Broken/missing limbs, cuts, bruises" need somewhere to *be*. The
nursing segment is the load-bearing user base (and the study.com
demo surface), so anatomy will get *deep* over time — limbs, organs,
eventually muscles/bones/nerves/vessels. The substrate has to absorb
that depth without buckling.

`DetailedMixin` is the obvious reach (it already does dotted-path
addressing, a real nested tree, and per-Detail flesh materials), but
two facts about it shape the design: it's **purely per-instance with
no template inheritance**, and consumers hang extra data off keys via
**parallel `Record<key, …>` maps** (`TangibleMixin._detailMaterialPaths`)
with no referential integrity. Pour deep anatomy straight into that
and you get per-NPC duplication of a shared skeleton plus N fragile
stringly-typed joins. So the design **splits the job in two**:

- **`DetailedMixin` is the addressing / presentation layer.** What a
  part is *called*, how it reads when you `look` at it, how MQL
  drills into it (`detailPath`). Per-instance, light, already wired
  into the examine flow. Keep using it exactly as-is.
- **`BodyPlan` is the model layer.** The *structure* of anatomy
  lives **once** on the shared `BodyPlan` singleton as typed
  `BodyPart` descriptors — not parallel Records. The instance carries
  only *deltas* (this part fractured, that part missing).

This keeps Detail light no matter how deep anatomy goes, because the
depth accumulates on the shared flyweight, not per-body.

### The model layer — `BodyPart` on `BodyPlan`

```ts
interface BodyPart {
  key: string;              // canonical dotted path: 'body.arm.left.hand'
  parent: string | null;    // tree edge; 'body.arm.left'
  defaultMaterial: string;  // flesh template path (race.md per-Detail material)
  enablesSlots?: string[];  // affordances this part gates ('hand:left')
  governsVital?: VitalSign; // organ → vital coupling ('body.torso.heart' → heart rate)
  severable?: boolean;      // can detach (future part-promotion seam)
  // future fidelity, declared-but-empty in v1:
  // innervatedBy?: string[]; suppliedBy?: string[];  // the graph edges
}
```

Anatomy is shared across a body plan (every biped has the same
skeleton), so this is one declaration per `BodyPlan`, parallel to how
it already declares `slots`. v1 fills `key` / `parent` /
`defaultMaterial` and the coarse `enablesSlots` / `governsVital`
couplings; everything else is reserved.

### The addressing layer + the resolution chain

A localized trauma (Layer 4, Kind B) is keyed to a part `key`. A
part's *current state* (intact / fractured / missing / function) is
an **instance delta**; its *structure* is the `BodyPlan` descriptor.
Anatomy lookups walk **instance-delta → BodyPlan-structure** — the
same established resolution shape as `getMaterial` (longest-prefix
override → bulk) and `Zone.lookupField` (instance → ancestor). Raw
`DetailedMixin.getDetail` stays the per-instance cosmetic/override
layer; anatomy queries go through an anatomy resolver (mixin methods:
`getParts()`, `getPart(key)`, `getInjuredParts()`) that composes the
two. No `BodyPartApi`, no index — iterate until volume demands more.

Stable dotted-path keys under a `body.` namespace are the anchor
everything downstream points at: trauma `site`, the slot/vital
couplings, and (later) graph edges and part-promotion. Lock the
convention now; it's the one thing that's expensive to retrofit.

### Design now vs. defer

**Design now** (cheap to decide, brutal to retrofit): the
template/instance split (structure on `BodyPlan`, state as deltas);
typed `BodyPart` descriptors instead of parallel Records; stable
`body.*` keys as identity; the part→slot/vital couplings *as data*
(coarse enforcement is fine in v1 — a missing hand disabling its
`hand:left` slot is the v1-relevant case, since "broken/missing
limbs" was in the original ask).

**Defer, but leave the seam** (stable keys make all three additive):
the innervation/vascular **graph** (orthogonal to the containment
tree — a spinal nerve serving a leg muscle; parts gain
`innervatedBy` / `suppliedBy` when stroke/ischemia fidelity arrives);
**part-as-Stuff promotion** (a severed limb or transplant organ
spawns a Tangible made of its flesh material and the body marks the
part absent — graduated, not Stuff-per-part); **MQL anatomy queries**
beyond today's `look`-targeting.

This is the "tissue authoring at the Detail level" race.md defers —
Vitals earns it, but as typed structure on `BodyPlan`, with Detail
carrying only the addressing. v1 keeps the part list coarse (limbs,
head, torso, heart, lungs); arbitrary depth is purely additive behind
the stable keys.

---

## Layer 4 — Conditions (the differentiation payoff)

A condition is a discrete affliction overlaid on the organism. They
split into **two kinds** — this is the key structural call.

### Kind A — Afflictions (authored content, templated Ideas)

Diseases, poisons, toxins, infections. These *have identity*: a name,
an etiology, a characteristic vital signature, a progression, and a
resolution. They are **content**, exactly like Materials and Species
— templated Ideas resolved by path, authored by content teams under
`/lib/condition/...`:

```
/lib/condition/disease/influenza
/lib/condition/disease/sepsis
/lib/condition/poison/snake-venom
/lib/condition/toxin/carbon-monoxide
```

A `Condition extends Idea` template carries (some fields as property-
bag entries, per properties.md):

```ts
interface ConditionTemplate {
  name: string;
  signature: VitalEffect[];        // how it perturbs vital signs
  progression: ProgressionSpec;    // stages + cadence (Layer 5)
  resolution: ResolutionSpec;      // what relieves it (the treatment seam)
  observableSigns: string[];       // for assessment prose ("flushed", "feverish")
  contagion?: ContagionSpec;       // optional; disease spread (deferred)
}
```

This parallels Organism→Species and Tangible→Material reference
shapes: the organism's active-condition record holds the
**templatePath** of the affliction plus per-instance runtime state
(current stage, elapsed time). No registry — `findByTemplatePath`
resolution like every other content reference — no registry, no Api
for content; afflictions are authored templates like Materials.

### Kind B — Trauma (parameterized damage, not templated)

Fracture, laceration, contusion, avulsion, burn. These are *not*
kinds with identity; they're damage instances. Two properties make
them a **value backed by engine behavior**, not an Idea:

- **A small *closed* vocabulary with *uniform* behavior.** ~A dozen
  trauma types, and a laceration behaves like a laceration
  everywhere (bleed scaled by severity, located by site). That's
  engine vocabulary — like locomotion modes or the
  `Material.resistance.<type>` damage vocabulary — not an open
  authored catalog the way diseases are.
- **Parameterized, especially by `site`.** "Laceration of the left
  forearm" and "…right thigh" aren't two identities; they're one
  type at two coordinates. Templating that is a combinatorial
  explosion. The site is a parameter, not part of the identity
  (afflictions aren't located — influenza isn't "on your arm").

Plus weight: a body may carry a dozen wounds at once, so each must be
cheap — a record in a list, not a cloned Idea.

So the symmetry with Kind A: **both kinds separate *instance state*
from *type behavior*; they differ only in where the behavior lives.**
An affliction's instance record is `{ templatePath, stage, elapsed }`
and its behavior is on the **Idea** at the path; a trauma's instance
record is the value below and its behavior is in a **closed engine
behavior table**.

```ts
interface Trauma {
  type: TraumaType;      // closed engine union: laceration | fracture | ...
  site: string;          // body.* part key (Layer 3) — 'body.leg.left'
  severity: number;      // current damage; mutates as it worsens / heals
  // runtime process state, mutated by progression + treatment:
  bleeding?: boolean;    // a laceration not yet dressed
  dressed?: boolean;     // pressure/bandage applied → bleed arrested
  // runtime-only: the ScheduledEmission handle, so the tick can be
  // cancelled on resolution or death (not persisted).
}
```

Per-type behavior is a strategy table co-located with the value
shape — the precedent is `lib/quantity.ts` (a value class + unit /
op tables as a substrate module, not an Api, not a registry):

```ts
interface TraumaBehavior {
  onset(o: Vitals, t: Trauma): void;            // what applying it does, now
  tick(o: Vitals, t: Trauma): void;             // the per-cadence progression
  resolve(o: Vitals, t: Trauma, by: Treatment): void;
  describe(t: Trauma): string;                   // (type, severity, site) → prose
}

const TRAUMA_BEHAVIOR: Record<TraumaType, TraumaBehavior> = {
  laceration: { /* onset: start a bleed; tick: clot or worsen; … */ },
  fracture:   { /* onset: disable the site's slots + add pain; … */ },
  // …
};
```

**How a trauma gets used — the lifecycle:**

1. **Apply.** A producer (a fall, a hazard, later combat, a scalpel —
   or the parked `inflict` seam) builds a `Trauma` and calls
   `organism.afflict(t)`; it lands in the collection keyed by `site`.
2. **Onset.** `afflict` runs `TRAUMA_BEHAVIOR[t.type].onset`. A
   laceration registers a `ScheduledEmission` (Layer 5) draining
   blood volume at a rate derived from `(severity, site)`; a fracture
   flips the site's slots off (Layer 3 part→slot coupling) and adds
   pain.
3. **Progress.** The emission ticks `behavior.tick` — bleed drains
   volume; a dressed wound heals (severity ↓); a fracture heals only
   while splinted *and* nourished (Layer 8 recovery-enabler).
4. **Assess / forensic-read.** `assess` and autopsy iterate the
   collection; `behavior.describe(t)` turns the value into prose
   ("a deep gash on the left leg, bleeding freely"). No template
   resolution — Layer 3 *is* the wound map.
5. **Resolve.** Treatment targets a specific trauma; `behavior.resolve`
   runs the per-type effect. **Resolution usually *transitions* the
   trauma, not deletes it** — pressure/bandage arrests the bleed
   emission and flips the wound to `dressed`, which then heals over
   time; a splint enables fracture recovery. `relieve()` drops it
   only when severity reaches 0 (healed) — possibly leaving a scar
   Detail later.
6. **Persist.** The trauma is plain serializable data (`type` / `site`
   strings, `severity`, the process flags), marshalled as part of the
   active-condition list — no Idea, no marshaller, no path resolution
   for the *instance*. Only the *behavior* resolves at read time from
   the static table (trivially HMR-safe; nothing cached).

The instance is a value because it's the *coordinates*; the behavior
is engine code because the *type taxonomy is fixed*. A fracture of
the left tibia, severity 3, is data — never a content template.

### Both held in one collection

The organism's `getConditions()` returns both kinds behind a common
`ActiveCondition` shape. The split is in *authoring and identity*,
not in storage — querying "is this organism bleeding?" or "what's
afflicting them?" crosses both.

> **Refinement point, not locked:** the two-kind split is the lean.
> If a build finds the unification awkward, collapsing to one
> `Condition` shape (with trauma as a degenerate, site-bearing
> template) is the fallback. Decide at requirements time.

---

## Layer 5 — Progression

Conditions evolve over time. Reuse the activity framework's cadence
machinery — `ScheduledEmission` / `ScheduleApi.recurring` — which
already wraps callbacks in an execution context with proper frame
attribution. **A condition is not an engagement** (it doesn't occupy
a body/hands/attention/voice slot; it's not something the actor is
*doing*), so it borrows the cadence but not the `EngagedMixin` slot
model.

Worked progression examples:

- **Hemorrhage** (from a laceration) ticks blood volume down at a
  rate derived from `(severity, site)`. Reaching the survivable
  floor flips lifecycle → dead (Layer 6). Treatment (apply pressure,
  bandage) stops the tick; transfusion restores volume.
- **Infection** ramps core temperature up over stages and degrades
  SpO₂; untreated `influenza` peaks then resolves on its own,
  `sepsis` cascades toward multi-vital failure.
- **Healing** is progression in reverse: an untreated minor
  contusion ticks severity down to resolution; a fracture does not
  self-resolve without intervention (splint → enables slow recovery).

Each condition's `ProgressionSpec` declares its stages and cadence;
the scheduler fires the per-tick `VitalEffect`. The 100ms duration
floor and HMR-aware dispatch from activity.md apply unchanged.

---

## Layer 6 — Death & lifecycle

race.md ships the state machine (`lifecycleState`: `alive` / `dead` /
`undead`) and `SpeciesApi.isAlive`/`isAnimate`, but explicitly
defers the *transition flow*. Vitals is the driver:

- A **fatal vital** crossing its survivable floor (blood volume → 0,
  cardiac/respiratory arrest, core temp out of range) transitions
  `alive → dead`.
- The transition is **not destruction.** `StuffApi.destruct` removes
  a Stuff from the world; death leaves a **corpse** — the same Stuff,
  `lifecycleState: 'dead'`, animacy gone (so `requiresAnimate` verbs
  stop dispatching, per race.md). Death is **not a global freeze**:
  the living processes stop (heart rate / respiration → 0, blood
  volume frozen) but **postmortem progressions begin** — cooling
  toward ambient (algor mortis), rigor, lividity, decomposition —
  running on the same Layer-5 cadence machinery in reverse. The
  corpse can be examined, carried, and (later) treated/revived or
  decay into removal. Corpse decay and resurrection are their own
  waves.
- The driver **stamps the ground-truth cause of death** at the
  transition — it already knows what crossed the threshold, so
  recording it is free. This is the answer key; forensics surfaces
  *evidence*, not the stamp (below).
- **Consciousness** is a second derived state below death:
  `conscious` / `unconscious` / `dead`, computed from blood volume,
  SpO₂, and head trauma. Unconsciousness gates animate verbs the way
  death does but is recoverable. This is the in-world hook for
  level-of-consciousness assessment (a real nursing vital;
  full Glasgow-Coma-Scale fidelity is a later pass).

### The corpse is a forensic record

Killing the HP scalar pays off again here. Because health was never
one number, a corpse is a **complete record of how it died** — the
state that killed it persists into the dead body instead of
collapsing to "0 HP." Forensics is just **assessment (Layer 7)
pointed at a non-agent**, with *deeper access* (you can fully dissect
a corpse — autopsy reveals organ-level trauma a living exam can't):

- **Cause / mechanism** — the fatal condition or vital is still
  present (blood volume at its floor + a deep laceration →
  exsanguination); the trauma instances are still on their body
  parts (Layer 3 *is* the wound map).
- **Toxicology** — afflictions are named, identity-bearing conditions
  (Layer 4, Kind A) that persist; a tox screen names *which* poison
  or disease.
- **Time since death** — the postmortem progressions read against
  **biome ambient temperature** (a corpse cooling from ~37 °C toward
  room temp), the same `K` / thermal `Quantity` the clinical
  thermometer already uses. Decomposition over time means **evidence
  degrades** — forensic difficulty rises with time since death.
  *(Algor mortis is a consumer of the generic **`Thermal`** capability —
  `docs/slates/thermal-slate.md` — which owns the cool-toward-ambient
  `τ = R·C` model; this body case shares it rather than re-deriving it.)*

The pedagogy is the **evidence-vs-answer-key gap**: the examiner
reads signs and concludes (and can be wrong); the stamped cause is
ground truth. Forensic nursing, postmortem changes, toxicology, and
cause-of-death reasoning are real curriculum — and it demos as a
CSI-flavored scene that is secretly the assessment loop.

This rests on one architectural fact worth stating plainly: **vitals
are body-state, not agent-state.** Agency is gated separately
(animacy / consciousness), so corpses, unconscious patients, and
anesthetized patients are all just bodies with full vitals and
reduced/zero agency — no special-casing anywhere. Two cheap v1
decisions keep the payoff reachable: the cause stamp, and modelling
death as living-stop + postmortem-start (so the postmortem-
progression seam exists even if v1 ships zero postmortem conditions).
Forensics itself — the verbs, instruments, decomposition content — is
a future wave.

---

## Layer 7 — The pedagogical seam + the accessible summary

### The derived summary (the "HP bar" replacement)

`getConditionBand()` returns a coarse, plain-language band —
`healthy` / `hurt` / `serious` / `critical` / `dead` — computed from
blood-volume fraction, how many vital signs are out of band and how
far, and the pain/consequence load from active trauma. This is the
**accessible surface**: gamers read it like an HP bar, non-gamers
read it as plain English, and "critical → dead" preserves the
familiar "0 = death" affordance — all *derived*, never stored.

### Instruments + targeted `measure` / `assess`

The biome subsystem already shipped the pattern: an instrument Stuff
+ a `measure <field>` subcommand + an `analyze` provenance verb. A
nurse taking vitals is the same shape, **targeted at an organism**
rather than the environment (the viewer-aware-query pattern from
perception.md — a measurement of another body is a perception):

| Instrument | Verb | Reveals |
|---|---|---|
| Thermometer *(exists)* | `measure temperature on <patient>` | Core temp in real units |
| Sphygmomanometer | `measure pressure on <patient>` | Systolic/diastolic mmHg |
| PulseOximeter | `measure oxygen on <patient>` | SpO₂ % + pulse bpm |
| Stethoscope | `listen-with stethoscope to <patient>` | Heart/respiratory sounds, sub-threshold otherwise |
| (unaided) | `assess <patient>` | Observable signs + derived band — no numbers |

`assess` is the no-instrument observation (flushed, pale, bleeding,
labored breathing — drawn from each condition's `observableSigns`);
instruments turn qualitative signs into the real `Quantity` numbers.
That *is* the assessment half of nursing craft, falling out of the
existing instrument pattern as content, not new engine.

### Treatment — the resolution seam

Each affliction/trauma declares what relieves it (`ResolutionSpec`):
stop-the-bleed for hemorrhage, antidote for a specific poison,
antibiotic for an infection, splint for a fracture, rehydration for
dehydration. The *seam* (a condition knows how it resolves) is v1;
the full player-facing **treatment verb suite** (bandage / splint /
administer / debride / transfuse …) stages behind it.

> **Open scope (fork #3, unresolved):** does honoring the principle
> require shipping ≥1 real treatment loop in v1 (e.g.
> bleed → bandage → stop), or is "assess + progress + die, treatment
> seam stubbed" enough biology for the first build? A nurse must be
> able to *assess differently* in v1; whether they can *act* in v1
> is the open call. Lean: ship one end-to-end loop (hemorrhage →
> pressure/bandage → arrest) so the principle is demonstrably real,
> not just declared.

---

## Layer 8 — Reserves (endurance + nutrition; mana out)

Reserves are depletable-and-recovering axes, distinct from injury
(you can be exhausted, starving, *and* uninjured). Modelled as
`Quantity<'%'>` on `VitalsMixin`.

**Endurance/fatigue.** Exertion (locomotion modes, activities,
carried load) drains it; rest recovers it; depletion gates strenuous
action and feeds the derived bands at the extremes (collapse from
exhaustion).

**Nutrition — satiation (+ hydration).** The NetHack model, not the
Zelda one: food sustains, it does not repair. Three roles, all
grounded:

1. **Anti-starvation.** Satiation drains over time; food refills it.
   Drink feeds the hydration vital (Layer 2) the same way. Hit the
   floor → starvation / dehydration degrades vitals → death.
2. **Side-effect vector.** Most food is neutral (just fills the
   reserve); some carries a payload through the *same condition
   machinery* (Layer 4): spoiled meat → a GI illness, a stimulant →
   elevated heart rate, alcohol → impairment, an allergen → a
   reaction. This is where food gets interesting without becoming a
   healing crutch.
3. **Recovery *enabler*, not healer.** Being nourished and hydrated
   is a *precondition* for the body's own healing-progression ticks
   (Layer 5) to run; malnourished / dehydrated → recovery stalls or
   reverses. The honest version of "food helps you heal" — the body
   heals, nourishment merely permits it. A sandwich never closes a
   wound.

Food/drink items are `Edible` content (race.md has the deferred
`DietApi` / `Edible` / `Portable` prior art); their consumption
effects ride the condition / vital / reserve operations above. Deep
metabolism (calories, macros, blood glucose, a `J` energy budget)
stays out — the *axis* is in, the *biochemistry* is a future wave.

**Mana is explicitly out of scope** — but not arbitrarily so: mana is
the **magic-side reserve, the mirror of endurance** (the physical
reserve). It's separate from Vitals because it isn't biology, but it's
endurance's symmetric sibling in the capability system. See
[capability-magic-slate.md](../deferred-rpg/capability-magic-slate.md). Different
recovery model, no biological grounding, deeply RPG — *not* a vital.

### Consumables — eat, drink, and the effect-list

Food and potions are **not two systems.** A consumable is any item
that, when consumed, fires a **declared list of effects** on the
consumer — and `eat` / `drink` is just the delivery verb (the split
is physical form, solid vs. liquid, not effect type). It's the
producer/seam pattern again: consumption *delivers*, the effects
*produce* operations, and the body (plus other subsystems) is the
substrate they act on. The consumable stays **agnostic about where
its effects land** — it declares "fill satiation," "apply
intoxication," "restore blood volume," "halve my size"; each effect
feeds whatever owns it.

So the food-vs-potion contrast lives entirely in the *payload*:

| Consumable kind | Effect lands in | In Vitals scope? |
|---|---|---|
| Nutritive (bread, water, an apple) | reserves (satiation / hydration) | yes |
| Pharmacological (coffee, alcohol, medicine, antidote) | vital perturbation / condition / restorative seam | yes |
| Hazardous (poison, spoiled meat, toxic mushroom) | applies an affliction (Layer 4 Kind A) | yes |
| Magical potion (heal, buff, cure) | restorative seam / a condition (supernatural reach) | effects yes, magic *system* no |
| Transformational ("EAT ME" cake, polymorph) | body-parameter change (size / species) | **no — transformation / RPG** |

The Alice cake is the clarifying case: identical *delivery* to eating
bread, but its *effect* (change scale) lands in transformation
territory nowhere near vitals. Vitals owns the nutritive /
pharmacological / hazardous columns and never has to know magic
exists.

**Food-ness is data, not a class.** A thing is *food* by carrying
nutrition data and participating in the diet system (race.md's
deferred `Edible` / `DietApi` / `diet`) — not by its type. That lets
a magic cake be food-shaped *and* magic-effected without a hierarchy
fight. Diet × nutrition is a grounded reuse: a carnivore eating grain
extracts little satiation, or gets nauseated (coarse v1; fidelity
later).

**Nutrition data is real-data-shaped.** A consumable carries a
`NutritionFacts` record modeled to mirror real datasets (USDA
FoodData Central, nutrition labels): energy (`kcal` — a new Quantity
unit with a converter to `J`), macros (protein / carb / fat in `g`),
water (`g` / `mL`), sodium and micros (`mg`). **v1 consumes only the
satiation/hydration-relevant subset** (energy → satiation, water →
hydration); the rest is seeded-but-dormant, waiting for the metabolic
consumer — the same shape-the-schema-for-data discipline as
`vitalProfile`'s age-curve room. This is an instance of the
reality-shaped-seeding principle now recorded in
[design-philosophy.md](../../design-philosophy.md) (Principle 4).

**The nutrition label is an instrument.** `examine label on the
ration` → the real macros: the `analyze` / `measure` instrument-reveal
pattern (Layer 7) pointed at food instead of a body. A nutrition
student reads real numbers verifiable against the same public
sources.

**Effect timing reuses existing machinery.** Instant effects (fill
satiation) apply at once; onset+duration effects (alcohol
intoxication, a stimulant, a slow poison) **apply a condition** that
progresses and self-resolves on the Layer-5 cadence. Consumption is
just one more producer feeding the condition / operation seams.

---

## Producers and seams (parked)

The body is acted on from two directions. Vitals owns *neither
producer* — only the body itself and the catalog of legal operations
on it.

**The harmful direction — `inflict`.** A clean "apply an insult to a
body" primitive — `inflict(target, { type, site, magnitude })`
producing the right trauma / vital change — would let combat,
accidents, fire, and hazards push harm through one door,
combat-agnostic.

**The restorative direction — the mirror.** Symmetric: a "resolve a
condition / restore a vital / replenish a reserve" surface that
mundane treatment, consumable items, healing skills, **and magic**
all feed. Healing is never a generic number-add; every producer
names a *specific* operation (bandage → bleed, antidote → this
poison, splint → fracture-recovery, regenerate → regrow a Detail).
The body doesn't care whether the producer is a tourniquet or a
spell — **magic acts *through* the same biological substrate, not
around it**: it resolves the modeled conditions and restores the
modeled vitals, with no parallel health pool. One source of truth.
Magic is just a supernatural producer with longer reach (instant,
multi-condition, or the mundanely-impossible).

**Both parked deliberately.** Nothing in the state model depends on
nailing either *generalized* seam now. The restorative operations
themselves are real and partly v1 (the treatment loop, each
condition's `ResolutionSpec`); what's parked is the *producer-facing
primitive*. If a clean shape falls out when a real producer (combat,
a hazard, the magic subsystem) needs it, adopt it; if it feels
forced, producers mutate state directly. Don't design either in the
abstract.

---

## Worked scenarios

### Scenario A — taking a patient's vitals

- Student approaches an NPC patient. `assess patient` → "She looks
  flushed and is breathing rapidly." (Observable signs from an
  active `influenza` condition's `observableSigns`.)
- `measure temperature on patient` (Thermometer) → 39.4 °C
  (`feverish` tag; instrument reveals the number).
- `measure oxygen on patient` (PulseOximeter) → SpO₂ 93%, pulse 104
  bpm (`tachycardic`).
- The student reads the signature, names the likely condition, and
  (v1-scope-permitting) intervenes. The whole loop is the biome
  `measure`/`analyze` pattern, targeted at a body.

### Scenario B — bleeding out and stopping it

- A laceration on `body.leg.left`, severity 0.6, opens a hemorrhage:
  blood volume ticks down via `ScheduledEmission`.
- Derived band walks `healthy → hurt → serious` as volume drops;
  `assess` shows pallor; SpO₂ and BP fall (shock).
- Untreated: blood volume hits the survivable floor → lifecycle
  `alive → dead` → corpse. Not destructed; it persists.
- Treated (the v1-lean end-to-end loop): apply pressure/bandage →
  `ResolutionSpec` stops the tick. Volume stabilizes; transfusion
  (later wave) restores it. Band recovers.

### Scenario C — disease progression and self-resolution

- `influenza` afflicts an NPC. `ProgressionSpec` ramps temp over
  stages, dips SpO₂, then peaks and resolves on its own over
  in-game days.
- `sepsis` instead cascades: temp + HR climb, BP collapses, multiple
  vitals leave band → death unless treated. Same machinery,
  different `ProgressionSpec` — the *differentiation* the principle
  demands.

### Scenario D — exhaustion

- An NPC runs a long distance (locomotion exertion). Endurance
  reserve drains toward 0.
- At the floor, the derived band reflects collapse; strenuous-action
  verbs gate. Rest recovers the reserve over time. No injury
  involved — the reserve is an independent axis.

### Scenario E — unconsciousness, not death

- Severe blood loss drops the patient below the consciousness
  threshold but above the death floor. `getConsciousness()` →
  `unconscious`. Animate verbs stop dispatching (same gate as death)
  but the patient is alive and recoverable.
- Restore volume → consciousness returns. This is the LOC
  assessment hook.

---

## What this stresses for existing subsystems / slates

### Race subsystem

- `Species` gains a `vitalProfile` (per-species healthy baselines +
  survivable bands), parallel to `visionProfile` / `lifespanMin`.
- `BodyPlan` gains a typed `BodyPart` structure (the model layer),
  parallel to its slot declaration; `DetailedMixin` stays the
  per-instance addressing/look layer. Resolution walks
  instance-delta → `BodyPlan`-structure (same shape as `getMaterial`
  / `Zone.lookupField`). The slot↔detail link (`userFacingDetail`)
  is the half-built wiring the part→slot coupling extends.
- race.md's deferred **death-transition flow** is now owned here;
  race.md updates to point at Vitals as the driver.
- race.md's deferred **tissue-at-the-Detail-level** is earned here.

### Quantities substrate

- New units: `bpm`, `mmHg`, `L` (vital signs), plus `kcal`
  (nutrition energy) — each with a converter where one applies
  (`mmHg ↔ Pa`, `L ↔ m³`, `kcal ↔ J`) and a friendly tag table.
  Additive to the `Unit` union; no machinery change. `kcal` ships
  with the food/consumables wave, not Wave 1.

### Biome / instrument pattern

- The `measure <field>` + instrument + `analyze` pattern generalizes
  from "measure the environment" to "measure a target Stuff." That
  generalization (targeted measurement via the perception viewer-
  aware query) is the one genuinely new bit of plumbing; the rest is
  content (the instruments).

### Activity substrate

- Condition progression consumes `ScheduledEmission` /
  `ScheduleApi.recurring`. No change to the activity framework; a
  condition is a *non-engagement* cadence consumer. Worth a one-line
  note in activity.md that the cadence machinery has consumers
  outside the engagement-slot model.

### Lifecycle / persistence

- Reinforces "death ≠ destruction." Corpse is a persisted Stuff with
  `lifecycleState: 'dead'`. lifecycle.md gets a note distinguishing
  the two.

### Locomotion

- Exertion → endurance drain is a future wire: locomotion modes
  carry an exertion cost the reserve consumes. Designed-for, not
  built in the first wave necessarily.

---

## Open questions

1. **v1 treatment scope (fork #3).** Ship ≥1 end-to-end treatment
   loop, or stub the resolution seam entirely? *Lean: one real loop
   (hemorrhage → bandage → arrest) so the principle is demonstrably
   real.*
2. **Two-kind condition model vs. unified.** Afflictions-as-content
   + trauma-as-parameters, or one `Condition` shape? *Lean two-kind;
   collapse is the documented fallback.*
3. **Vital-sign storage: marshalled props or first-class fields?**
   *Lean first-class fields with `static fieldMarshallers` — the
   vital signs are stable engine vocabulary, not content-defined
   keys.*
4. **Rate unit: new `bpm`, or reuse `Hz`?** *Lean new `bpm` — pulse
   and respiration read in beats/breaths-per-minute everywhere in
   nursing; `Hz` would force constant conversion and read wrong.*
5. **Blood pressure as one field or two?** Systolic + diastolic are
   two numbers. *Lean two `Quantity<'mmHg'>` fields (or a small
   value object) — both are clinically load-bearing.*
6. **Pain as a modelled vital or a derived consequence?** *Lean
   derived from trauma severity + site for v1; promote to a tracked
   axis only if analgesia content earns it.*
7. **Consciousness granularity.** Binary (`conscious`/`unconscious`)
   v1, GCS-style scale later? *Lean binary v1; the threshold is
   derived, the scale is a later pass.*
8. **Where do healthy baselines live for NPCs without a rich
   Species?** *Read from `Species.vitalProfile`; a universe-default
   profile backstops species that haven't authored one (mirrors the
   sessile-bodyplan backstop).*
9. **Contagion / disease spread.** In or out for v1? *Lean out;
   `ContagionSpec` is a reserved field, no consumer in the first
   wave.*
10. **Endurance unit: `%` reserve or a real energy budget (`J`)?**
    *Lean `%` reserve v1; a metabolic `J` model is a much bigger
    (and genuinely interesting) pedagogical lift for a later wave.*
11. **`inflict` seam — adopt or skip?** Parked; decide when a real
    producer needs it. *Lean: don't build until combat/hazard
    content forces the shape.*
12. **Aging interaction.** race.md has `age`; do vital bands shift
    with age (pediatric vs. geriatric ranges)? *Lean: design slot
    reserved, not v1 — but `vitalProfile` should be shaped so an
    age-curve can layer in.*
13. **Deep-anatomy depth ceiling.** How far into muscles / bones /
    nerves / vessels does the nursing pedagogy actually need to go,
    and when? *Lean: v1 stops at limbs/head/torso + heart/lungs; the
    typed-`BodyPart`-on-`BodyPlan` + stable-keys design makes
    arbitrary depth additive, so depth follows clinical content
    demand. The two forks it has to leave open — the innervation/
    vascular graph and part-as-Stuff promotion — are documented in
    Layer 3 as deferred-with-seam, not designed now.*
14. **Postmortem fidelity (parked).** How rich do postmortem changes
    get — a single cooling curve for time-of-death, or the full
    algor / rigor / livor / decomposition suite? *Lean: v1 ships none
    (only the two cheap enabling seams — the cause stamp + the
    living-stop / postmortem-start death model); fidelity follows
    forensics content. Algor mortis against biome ambient temp is the
    natural first increment.*
15. **Magic-healing pedagogy preservation (parked).** Magic acting
    *through* the substrate is settled — but if it can instantly
    cure anything, it trivializes the nursing model. Levers:
    context/setting gating (clinical scenarios magic-light), domain
    split (magic = acute trauma, medicine = disease + diagnosis),
    stabilize-not-cure, or scarcity (and these compose). *No lean —
    resolved when the magic subsystem lands, not in Vitals v1. The
    seam stays magic-agnostic until then.*
16. **A shared `Effect` vocabulary (parked).** `inflict`, the
    restorative seam, consumption, and (later) magic are all
    producers firing operations on the body; they may converge on
    one `Effect` / operation type. *Lean: don't abstract until there
    are three real consumers — let it emerge, then extract.*
17. **Consumption mechanics.** Partial consumption / servings (Glob
    handles discrete stacks; portions-within-an-item is a separate
    axis) and food spoilage (a freshness progression on the *item*
    that flips its payload nutritive → hazardous). *Lean: v1 consumes
    whole items, no spoilage; both are later refinements.*

---

## Build order

Indicative waves; final cut decided at requirements.

**Wave 1 — substrate.**

- New `Quantity` units (`bpm`, `mmHg`, `L`) + converters + tag
  tables.
- `VitalsMixin` with vital-sign fields, survivable-band table,
  derived `getConditionBand` / `getConsciousness`.
- `Species.vitalProfile` on the v1 species roster + universe
  default.
- Anatomy: typed `BodyPart` structure on `BodyPlan` (biped /
  quadruped) + instance-delta resolution + the anatomy resolver
  (`getParts` / `getPart` / `getInjuredParts`); stable `body.*` keys;
  part→slot/vital couplings as data.
- Reserve axes (endurance, satiation, hydration) on `VitalsMixin`
  with drain / recover + starvation / exhaustion degradation.

**Wave 2 — conditions + progression.**

- `ActiveCondition` shape + the active-condition collection on
  `VitalsMixin`.
- Trauma value shape + the closed `TraumaType` vocabulary + the
  `TRAUMA_BEHAVIOR` strategy table (onset / tick / resolve /
  describe) and the resolution-transitions-not-deletes lifecycle.
- `Condition extends Idea` template (Kind A) + first content
  (one disease, one poison) under `/lib/condition/...`.
- Progression via `ScheduledEmission`; the hemorrhage + infection
  ticks.

**Wave 3 — death, assessment, the one treatment loop.**

- Death-transition driver (`alive → dead`), corpse handling,
  consciousness gating.
- `assess` verb + observable-signs prose.
- Instruments: Sphygmomanometer, PulseOximeter, Stethoscope +
  targeted `measure on <patient>` (the perception-targeted
  generalization).
- The v1 end-to-end treatment loop (hemorrhage → bandage → arrest),
  pending fork-#3 resolution.

**Adjacent / future waves (own slates when they earn content):**

- Full treatment verb suite (splint, administer, debride,
  transfuse, …).
- Resurrection / revival; corpse decay; postmortem progressions
  (algor / rigor / livor / decomposition) and the forensics surface
  (autopsy / toxicology / time-of-death) that the cause-stamp +
  postmortem seams enable.
- Contagion / disease spread.
- Consumables: the eat/drink effect-list delivery, `Edible` food
  content + `NutritionFacts` (real-data-shaped; satiation/hydration
  subset live), the `kcal` unit, the nutrition-label instrument, and
  diet × nutrition gating.
- Endurance↔locomotion exertion wiring; deep metabolic (`J`) model.
- Deeper anatomy fidelity (muscles/bones/nerves), the innervation/
  vascular **graph** (`innervatedBy` / `suppliedBy`), and
  part-as-Stuff **promotion** (severed limbs, transplant organs,
  prosthetics) — all additive behind the stable `body.*` keys.
- Age-curve vital bands; GCS consciousness scale.
- The `inflict` damage-intake seam (if combat/hazard content
  adopts it).

---

## What this slate does NOT cover

- **Combat.** Vitals is the body's state model; combat is a
  (deferred, RPG-layer) *producer* of insults against it. Combat
  mechanics, weapons, to-hit, the `inflict` seam itself — all
  combat-slate territory.
- **Mana / spell resources.** Out of subsystem entirely.
- **Magic healing as a *system*.** Magic acts *through* this
  substrate — a future producer feeding the restorative seam that
  resolves the modeled conditions and restores the modeled vitals,
  with no parallel health pool. But spells, casting, and the magic
  system itself are magic-subsystem territory, deferred with the
  rest of RPG. The pedagogy tension it raises is captured as an
  open question.
- **Body transformation** (size / shape / species change — the
  "EAT ME" cake, polymorph). Delivered through the same consume seam,
  but the effect lands in transformation / polymorph (RPG) territory,
  not vitals.
- **The generic consumable mechanism beyond body effects.** Vitals
  defines the nutritive / pharmacological / hazardous effect
  operations; a fully general `Consumable` substrate and non-body
  payloads (buffs, teleport draughts) belong to the subsystems that
  own those effects.
- **Character creation / stats / attributes** (strength, etc.) —
  RPG character-sheet territory, deferred with the rest of RPG.
- **Deep metabolism / nutrition biochemistry.** The satiation +
  hydration *reserve* axis and food consumption-effects are in
  (Layer 8); a full metabolic model (calories, macros, blood
  glucose, a `J` energy budget) is a future pedagogical wave. Diet
  data (`DietApi` / `Edible`) prior art lives in race.md.
- **Pharmacology depth.** Drug interactions, dosing curves,
  pharmacokinetics — a rich nursing pedagogy seam, but its own
  subsystem once treatment verbs exist.
- **Mental/psychological state.** Stress, morale, fear — a separate
  axis, not modelled here.

---

## Once shaped into formal requirements

This slate boils down to:

- The `VitalsMixin` interface + composition targets.
- The vital-sign field set, units, per-species `vitalProfile`
  shape, and survivable-band table.
- The anatomy model: typed `BodyPart` descriptors on `BodyPlan`,
  the instance-delta resolution chain, the anatomy resolver surface,
  the `body.*` key convention, and the part→slot/vital couplings
  (with the graph + promotion forks explicitly deferred).
- New `Quantity` units (`bpm`, `mmHg`, `L`) + converters + tag
  tables.
- The `ActiveCondition` shape; the two-kind split (affliction
  template + trauma value); the first condition content roster.
- Progression wiring onto `ScheduledEmission`.
- The death-transition driver + corpse + consciousness gating,
  including the ground-truth cause-of-death stamp and the
  living-stop / postmortem-start death model (the two cheap seams
  that keep forensics reachable).
- The derived-band / derived-consciousness computation.
- The reserve axes (endurance, satiation, hydration); the consumable
  eat/drink effect-list delivery; `NutritionFacts` (real-data-shaped,
  satiation/hydration subset consumed in v1); the `kcal` unit; the
  nutrition-label instrument; diet × nutrition gating.
- `assess` + the targeted `measure on <patient>` generalization;
  the first instruments.
- The v1 treatment-loop scope decision (fork #3).
- Tests gating: a vital crossing its floor flips lifecycle; a
  hemorrhage tick drains volume on cadence; bandage arrests it;
  derived band tracks the substrate; assessment surfaces the right
  signs per condition; death leaves a non-destructed corpse with
  animacy gone.

The treatment-suite / resurrection / contagion / metabolic /
combat-`inflict` items wait for their own waves with their own
slates.
