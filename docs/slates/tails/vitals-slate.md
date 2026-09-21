# Vitals slate (working doc)

> **Status: PARTIAL** — the substrate (2026-06), then the harm driver,
> the dying arc and metabolism →
> [vitals.md](../../subsystems/vitals.md) ·
> [harm.md](../../subsystems/harm.md) ·
> [mortality.md](../../subsystems/mortality.md)
> **Left:** medical instruments past the thermometer (sphygmomanometer,
> pulse-oximeter, stethoscope) + the perception-targeted `measure on
> <patient>` generalization · the consumable/nutrition system (eat/drink
> effect-list, `NutritionFacts`, `kcal`, the nutrition-label instrument,
> diet×nutrition gating) and the endurance↔locomotion exertion wiring ·
> the restorative-producer mirror (a generalized heal/resolve surface for
> treatment, consumables and magic) · the affliction-inflict path
> (`ConditionApi.inflict` is trauma-only) · the full treatment verb suite,
> deeper anatomy fidelity + part-as-Stuff promotion, contagion, pain
> modelling, aging-curve vital bands, GCS, and magic-healing pedagogy
> (open questions)
> **Size:** a wave

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

**Shipped, see vitals.md § The load-bearing decision + § `VitalsMixin`
surface.** No stored `hp`; health derives from blood volume, vital signs,
active conditions and reserves; state + behavior live on `VitalsMixin`
composed onto the Organism.

## Layer 1 — `VitalsMixin`

**Shipped as designed** — see vitals.md § `VitalsMixin` surface.

## Layer 2 — Vital signs

**Shipped as designed**, including the new `bpm`/`mmHg`/`L` units and the
per-species `Species.vitalProfile` — see vitals.md § Vital signs +
`vitalProfile`.

## Layer 3 — Anatomy

**Shipped, and taken further than designed here** — typed `BodyPart` on
`BodyPlan`, instance-delta resolution, stable `body.*` keys, the
innervation/vascular graph (`innervatedBy`/`suppliedBy`), and `severPart`.
See vitals.md § Anatomy + tissue and harm.md § The depth ladder / § The
function axis / § The sever. Part-as-Stuff promotion (a severed limb as an
object; transplants/prosthetics) remains deferred-with-seam — see harm.md
§ What this is NOT.

---

## Layer 4 — Conditions

**Shipped, and grown a third kind** — Kind A (afflictions), Kind B
(trauma), and Kind C (`SustainedShock`, added by the electricity build)
behind one `ActiveCondition` collection. See vitals.md § Conditions — the
three-kind type system. ⚠ **Still open**: the vitals build shipped zero
Kind-A content, and `ConditionApi.inflict` remains **trauma-only** — an
affliction (disease, poison) cannot be inflicted through the Api at all;
see harm.md § `ConditionApi` and [disease-slate](../builds/disease-slate.md).

## Layer 5 — Progression

**Superseded by the shipped mechanism.** This layer designed progression
on `ScheduledEmission` / `ScheduleApi.recurring`. What shipped instead is
**reconcile-on-read** — no recurring tick, no handle to re-arm; see
harm.md § The wound driver — reconcile-on-read and vitals.md's
`reconcileConditions`.

## Layer 6 — Death & lifecycle

**Shipped** — the whole death-transition driver, the corpse-as-forensic-
record, algor mortis, cause-of-death stamping, and consciousness gating
this layer designed is now [mortality.md](../../subsystems/mortality.md)
in full (dying as a rescuable clock, `ConditionApi.die`, the corpse, the
shade, the passage). See also vitals.md § Death & consciousness seams.

---

## Layer 7 — The pedagogical seam + the accessible summary

### The derived summary (the "HP bar" replacement)

**Shipped as designed** — `getConditionBand()` — see vitals.md §
`VitalsMixin` surface.

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

**Shipped, and further than the "stub or ship one loop" fork asked** —
every condition/trauma declares `resolution.by`, `treat` dispatches on
what the medic is offering, and the full hemorrhage → bandage → arrest
loop is live. See harm.md § `resolution.by` and § The medic vertical.

---

## Layer 8 — Reserves (endurance + nutrition; mana out)

Reserves are depletable-and-recovering axes, distinct from injury
(you can be exhausted, starving, *and* uninjured). Modelled as
`Quantity<'%'>` on `VitalsMixin`.

**Endurance/fatigue.** **Shipped** — the reserve, the wound-limp drain,
and the locomotion coupling are documented in vitals.md § Reserves and
harm.md § The couplings.

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
[capability-magic-slate.md](../builds/capability-magic-slate.md). Different
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

**The harmful direction — `inflict`.** **Shipped** — `ConditionApi.inflict`
is exactly this door; see harm.md § The `inflict` producer.

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

**Shipped as designed** — see harm.md § laceration (the flagship trauma
behavior) and § The medic vertical.

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

**Shipped as designed** — see vitals.md § `VitalsMixin` surface
(`getConsciousness()`).

---

## What this stresses for existing subsystems / slates

### Race subsystem

**Shipped as designed** — `Species.vitalProfile`, typed `BodyPart` on
`BodyPlan`, and the death-transition flow now owned by
[mortality.md](../../subsystems/mortality.md). See vitals.md and race.md.

### Quantities substrate

**Shipped** — `bpm`, `mmHg`, `L` (+ converters and tag tables) are in the
`Quantity` catalog. `kcal` still ships with the food/consumables wave
(unbuilt — see Layer 8 below). See [quantities.md](../../subsystems/quantities.md).

### Biome / instrument pattern

- The `measure <field>` + instrument + `analyze` pattern generalizes
  from "measure the environment" to "measure a target Stuff." That
  generalization (targeted measurement via the perception viewer-
  aware query) is the one genuinely new bit of plumbing; the rest is
  content (the instruments).

### Activity substrate

**Superseded** — condition progression did not end up consuming
`ScheduledEmission`/`ScheduleApi.recurring`; it shipped as reconcile-on-read
instead (Layer 5, above).

### Lifecycle / persistence

**Shipped and documented** — "death ≠ destruction" holds; see
[lifecycle.md](../../subsystems/lifecycle.md) and
[mortality.md](../../subsystems/mortality.md).

### Locomotion

- Exertion → endurance drain is a future wire: locomotion modes
  carry an exertion cost the reserve consumes. Designed-for, not
  built in the first wave necessarily.

---

## Open questions

1. resolved — one full loop shipped; see harm.md § `resolution.by` / §
   The medic vertical.
2. resolved — three-kind system shipped; see vitals.md § Conditions.
3. resolved — first-class fields with `static fieldMarshallers`; see
   vitals.md § Vital signs.
4. resolved — `bpm` shipped; see vitals.md § Vital signs.
5. resolved — two `Quantity<'mmHg'>` fields shipped; see vitals.md §
   Vital signs.
6. **Pain as a modelled vital or a derived consequence?** *Lean
   derived from trauma severity + site for v1; promote to a tracked
   axis only if analgesia content earns it.*
7. resolved — binary `conscious`/`unconscious`/`dead` shipped; GCS
   scale remains a later pass.
8. resolved — `UNIVERSE_DEFAULT_VITAL_PROFILE` backstop shipped; see
   vitals.md § Vital signs.
9. **Contagion / disease spread.** In or out for v1? *Lean out;
   `ContagionSpec` is a reserved field, no consumer in the first
   wave.*
10. resolved — `%` reserve shipped; a metabolic `J` model remains a
    later pedagogical lift.
11. resolved — adopted; `ConditionApi.inflict` shipped, see harm.md §
    The `inflict` producer (trauma-only; the affliction half is still
    open, see Layer 4 above).
12. **Aging interaction.** race.md has `age`; do vital bands shift
    with age (pediatric vs. geriatric ranges)? *Lean: design slot
    reserved, not v1 — but `vitalProfile` should be shaped so an
    age-curve can layer in.*
13. resolved for v1 — 16 parts, the innervation/vascular graph, and
    `severPart` shipped; part-as-Stuff promotion remains deferred, see
    harm.md § What this is NOT.
14. superseded — the shipped postmortem substrate goes further than the
    "two cheap seams" lean: decay stages, forensic-readability curve
    and algor mortis all shipped; see mortality.md § The corpse.
15. **Magic-healing pedagogy preservation (parked).** Magic acting
    *through* the substrate is settled — but if it can instantly
    cure anything, it trivializes the nursing model. Levers:
    context/setting gating (clinical scenarios magic-light), domain
    split (magic = acute trauma, medicine = disease + diagnosis),
    stabilize-not-cure, or scarcity (and these compose). *No lean —
    resolved when the magic subsystem lands, not in Vitals v1. The
    seam stays magic-agnostic until then.*
16. resolved — it emerged: `VitalEffect` is now a four-kind union
    (`vital`/`reserve`/`function`/`expression`); see harm.md § The
    effect channel.
17. **Consumption mechanics.** Partial consumption / servings (Glob
    handles discrete stacks; portions-within-an-item is a separate
    axis) and food spoilage (a freshness progression on the *item*
    that flips its payload nutritive → hazardous). *Lean: v1 consumes
    whole items, no spoilage; both are later refinements.*

---

## Build order

Waves 1–3 (substrate; conditions + progression; death, assessment, the
one treatment loop) **shipped** — see vitals.md, harm.md and
mortality.md. The Wave-3 instrument roster (Sphygmomanometer,
PulseOximeter, Stethoscope, the targeted `measure on <patient>`
generalization) did not ship; it is kept above under Layer 7 §
Instruments.

**Adjacent / future waves (own slates when they earn content):**

- Full treatment verb suite (splint, administer, debride,
  transfuse, …).
- Contagion / disease spread.
- Consumables: the eat/drink effect-list delivery, `Edible` food
  content + `NutritionFacts` (real-data-shaped; satiation/hydration
  subset live), the `kcal` unit, the nutrition-label instrument, and
  diet × nutrition gating.
- Endurance↔locomotion exertion wiring; deep metabolic (`J`) model.
- Deeper anatomy fidelity (muscles/bones/nerves) and part-as-Stuff
  **promotion** (severed limbs, transplant organs, prosthetics) — all
  additive behind the stable `body.*` keys. ⚠ The innervation/vascular
  **graph** (`innervatedBy` / `suppliedBy`) itself shipped — see
  vitals.md § Anatomy + tissue.
- Age-curve vital bands; GCS consciousness scale.

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

This section's job is done — requirements were written and the waves
above shipped. What's left of it lives in the sections kept above
(Layer 7 Instruments, Layer 8 Nutrition/Consumables, the restorative
producer mirror, and the open questions still marked open).
