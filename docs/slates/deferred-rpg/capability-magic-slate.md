# Capability & magic slate (working doc)

> **Status: deferred — RPG.** This is the RPG capability layer:
> how a being's abilities are modeled, how they advance, and how
> magic works. RPG is on hold; physics and biology ship first.
> The design is captured because decisions in the *shipping*
> Vitals and Materials substrate must not preclude it — there is
> exactly one negative obligation (below), and the rest is parked
> design space. When RPG work begins, this slate is the starting
> point.
>
> **Update (2026-06):** the shipping Vitals *substrate* build now
> generalizes reserves into one `Reserve` axis (`lib/reserve/`) — so
> the magic-side reserve (mana) already has its mechanism built ahead
> of RPG. What's parked is the magic *content* riding it, not the
> reserve substrate. See Part II's reserve note + the obligation.
>
> **Update (2026-07):** a focused design pass pinned the *baseline
> shipping* model — a single **Focus** reserve (mental, coupled to the
> body via a magical metabolism), capacity and recovery as **separate**
> knobs, a discipline taxonomy carved by **engine-domain**, and an
> orders-vs-guilds access split. Captured in **Part IV**, which resolves
> Open Qs 1 / 3 / 9 and, on two points (single pool; mana coupled to the
> body), **supersedes earlier leans** in Parts II and the Open Questions.

Two halves, deliberately **symmetric**:

- **Capability** — physical ability, derived from the body + learned
  skill + acquired knowledge. The "stat system," reframed to fit the
  derived-not-stored discipline.
- **Magic** — a supernatural-but-lawful physics channel, plus the
  magic-side capability (affinity, mana) that mirrors the physical
  side.

See also:

- [docs/design-philosophy.md](../../design-philosophy.md) — the
  through-lines this slate obeys: derived-not-stored, "model
  honestly" + the **invented-sciences corollary** under Principle 2
  (magic is honest if internally consistent and measurable), Principle
  4 (reality-shaped seeding — which magic *cannot* use, the honest
  break).
- [docs/slates/vitals-slate.md](../tails/vitals-slate.md) — the body
  substrate physical capability derives from; the
  **endurance ⟷ mana** reserve symmetry; CON dissolving into Vitals.
- [docs/subsystems/race.md](../../subsystems/race.md) — `BodyPlan` /
  anatomy / `Species` baselines that physical capacity reads; the
  deferred genetics that eventually source the baseline.
- [docs/subsystems/quantities.md](../../subsystems/quantities.md) — the
  `Quantity<U>` + instrument + `analyze` pattern magic reuses
  wholesale.
- [docs/slates/senses-slate.md](../tails/senses-slate.md) — the
  `PerceptionChannel` generalization (which absorbed the sound slate);
  magic joins as another channel.
- [docs/subsystems/race.md § Material substrate](../../subsystems/race.md) —
  Material's orthogonal classification layers + capability-mixin
  pattern that the magical-property layer mirrors.

---

## Principle

1. **Derived, not stored** — the through-line from Vitals. Capability
   falls out of substrate + skill, not character-sheet scalars.
2. **Horizontal mastery, not vertical inflation.** Bodies are bounded;
   depth comes from skill, knowledge, and gear — never 10 → 1000.
3. **Symmetric physical/magic.** The same four axes — capacity, skill,
   knowledge, reserve — run down both sides.
4. **Magic is honest science**, just invented: lawful, measurable,
   predictable, instrument-readable. Per the design-philosophy
   invented-sciences corollary.

---

## Part I — Capability (the stat system, reframed)

### Stats are derived and dynamic, not stored

D&D-style stored stats (STR/DEX/CON/…) are the character-sheet
equivalent of stored HP — gamey abstractions over state we model for
real. The derived treatment:

- **CON dissolves into Vitals.** Resilience, stamina, disease/poison
  resistance *are* blood volume + survivable bands + the endurance
  reserve + condition progression. A CON score beside that is two
  sources of truth — the HP anti-pattern again.
- **Physical capacity is derived** — strength (force) and
  dexterity/coordination (fine motor + agility) fall out of anatomy
  intactness + condition + endurance + a stored baseline. The pattern
  mirrors Vitals exactly: a **stored baseline** (build / species /
  later genetics) **× derived condition factors** = effective current.
  Concretely, the strength baseline *is* **per-part muscle mass** — the
  tissue composition the Vitals substrate build ships on `BodyPart`
  (`/obj/material/tissue/muscle`). Strength reads as real force
  (`N` / `kg`), instrument-measurable (a **dynamometer** reads grip the
  way a thermometer reads fever), and a *task* selects which parts'
  muscle it draws on — so grip ≠ deadlift, and a fractured limb loses
  *local* force for free off the anatomy trauma model. Dexterity's
  substrate is likewise measurable beneath the skill layer — reaction
  time (`ms`), joint range-of-motion (`degrees`) — which is the
  capacity-vs-skill split made physical: **substrate sets the ceiling,
  skill realizes performance within it.**
- **It's dynamic.** A fracture (via the part→slot/capability
  coupling), fatigue, blood loss, or disease lowers effective
  capability *continuously* — unlike a fixed D&D STR. A familiar
  readout ("Strength: 14, strong") is surfaced for accessibility, but
  it's rendered from substrate, never the truth — the HP-band trick.
- **The only genuinely *stored* capacity attributes are physical
  build-baseline and magic affinity.** Everything else is skill
  (learned), knowledge (learned), or derived state.

### Advancement — three honest channels

Advancement can't be a number inflating; there's no stored number.
It splits into:

1. **Conditioning** — bounded and *bidirectional*. Training raises the
   baseline within biological ceilings (untrained → peak athlete,
   ~2–3×, not 100×); disuse, injury, illness, and aging lower it
   (atrophy, detraining — real exercise physiology, so it's
   pedagogically honest).
2. **Skill** — deep, learned, the **main axis**, and **on-mission**
   (learning is the point of the platform). It's *competence, not
   power*: a skilled actor with average capacity beats a strong
   novice. The **capacity-vs-skill split is the core nuance** D&D's
   single STR number erases.
3. **Knowledge** — know-*what* (diagnoses, identifications, recipes,
   which antidote for which toxin) — feeds the treatment / forensics /
   crafting loops.

**Scaling is horizontal.** The power fantasy comes from breadth and
mastery (more skills, deeper technique, more knowledge) and from gear
(a bounded, complementary channel), not from magnitude. A peak human
stays a peak human; the world stays coherent; and "you learn more
things" suits an educational platform better than "your numbers get
bigger."

### What dissolves (and why)

- **CON →** Vitals.
- **INT →** the *player's* real knowledge + learned skill. An INT stat
  that does the thinking substitutes a die roll for the learning that
  is the whole point; rejected.
- **CHA →** derived presence (appearance / voice / condition — a sick
  or wounded person presents worse) + learned social skill (**bedside
  manner** is on-mission) + a magical-charm counterpart. Raw "force of
  personality" has no substrate and, like INT, doesn't become a stored
  stat.

---

## Part II — Magic as a physics channel

### Magic is invented-but-honest science

Magic behaves by laws, is measurable, and is predictable — it is
*supernatural only in that its laws are authored*, not drawn from a
textbook. So it gets the full channel treatment: real (invented)
units, conservation, propagation through conduits, attenuation,
instruments that read it, an `analyze` that reveals its math. It joins
the `PhysicsChannel` generalization the sound slate anticipates — a
thaumic field is just another channel alongside light, sound, heat.

The pedagogy (per the design-philosophy corollary) is the **scientific
method itself** — hypothesize, measure, predict, verify — taught in a
clean, learnable sandbox, plus transferable structure (conservation,
fields, equilibrium, falloff). The discipline: rigorous internal
consistency; magic never becomes the fudge layer.

The honest asymmetry with the physical side: physical capability
*derives from real substrate* (and can seed from real datasets,
Principle 4); magic has **no real-world dataset** — its substrate and
laws are authored. That's fine and appropriate: magic is overtly
fictional, so an authored-but-lawful substrate is legitimate where an
authored INT stat was not.

### The magic-side capability (symmetric to physical)

| Axis | Physical | Magic |
|---|---|---|
| **Capacity (baseline)** | body build + condition (derived) | **affinity** (measurable coupling to the field) |
| **Skill (applied)** | learned technique | learned spellcraft |
| **Knowledge** | techniques, materials | spells, lore |
| **Reserve (fatigue)** | **endurance** — a `Reserve` instance | **mana** — magic-side `Reserve` instance(s) |
| **Advancement** | bounded conditioning + deep skill | (mostly-fixed) affinity + deep skill |

- **Affinity** is a *measurable* property — coupling strength to the
  thaumic field — not a die roll. Likely **per-school/element** (so
  several small affinities, not one scalar), an innate baseline,
  possibly marginally trainable (symmetric to conditioning). Read by
  an instrument the way vitals are read by a thermometer.
- **Mana** is the magical reserve, depleting and recovering on a
  lawful curve — **endurance's mirror**. Both ride **one generalized
  `Reserve` substrate** (`lib/reserve/`, shipped by the Vitals build): a
  depletable-replenishing capacity axis whose instances differ only in
  what drains them, what replenishes them, and their theme.
  Endurance/satiation/hydration are the *biological* instances; mana is
  *magic-side*. The split is instance-level, not substrate-level — mana
  isn't biology, but it isn't a second mechanism either.
- **Magic reserves are plural and authored, not one universal pool.**
  Rather than a single MP scalar, a tradition/guild/school *defines its
  own reserve* — a capacitor guild's "charge" (recharged at a source), a
  necromancer's "essence" (replenished by death), a cleric's "favor"
  (granted, not earned). Each is content on the shared axis;
  **"mana" is a content word, never an engine primitive** (the engine
  has reserves). This is the affliction-vs-trauma authored-content move
  applied to reserves — the substrate ships the axis + the authored
  seam; the thematic pools are content.

### Instruments (the seam, symmetric to vitals / sound / light)

| Instrument | Reveals |
|---|---|
| Thaumometer | ambient thaumic field at a location |
| Affinity-meter | a being's coupling (per school) |
| Mana gauge | current reserve vs. capacity |
| Spell-`analyze` | the "equations" of a cast — cost, output, falloff |

---

## Part III — Elemental magic ↔ the Materials subsystem

The worry: classical elemental magic (fire/water/earth/air) is a
*folk ontology of matter* that contradicts the real chemistry the
Materials subsystem already models. The resolution: **elements are
verbs, not nouns.**

### Two moves

**1. Elemental schools actuate *real* physical channels.** The
supernatural part is the actuator; the consequences are real physics.

| School | Actuates (real channel) |
|---|---|
| Fire | thermal energy / combustion |
| Water | fluids, phase, pressure |
| Earth | solid matter (the Materials subsystem) |
| Air | gases, pressure (the biome atmosphere substrate) |
| Lightning | electricity (a real channel to add) |

A Fire spell *injects real thermal energy*; what happens next obeys
real chemistry. Real matter is never reclassified — iron stays Fe.

**2. Materials gain an orthogonal *magical-property layer*** — the
same orthogonal-classification + capability-mixin pattern Material
already uses (tags, composition, chemistry; `RadioactiveMaterial`).
A material gets a magical resonance / per-school affinity (and maybe a
thaumic conductivity, symmetric to electrical conductivity). So magic
**enriches** Materials instead of contradicting it; elemental
interactions become grounded and learnable.

### Worked examples

- **Fire on an oak door** → thermal injection → oak (real flammable
  material) heats, ignites, combusts. Teaches flammability/combustion.
- **Fire on iron** → heats (real), does *not* combust, eventually
  melts at iron's real melting point. Teaches phase change.
- **Earth on granite vs. running water** → granite (dense, mineral,
  high earth-resonance) responds strongly; water doesn't. Effect
  scales with real density × magical resonance.
- **Measuring affinity** → an affinity-meter reads a mage's coupling
  the way a thermometer reads a patient's temperature: the magical
  "vitals check."
- **Deriving a law by experiment** → a student measures a spell's
  falloff at increasing distance, hypothesizes inverse-square,
  verifies with the thaumometer. The method *is* the lesson.

### Taxonomy — held open

Classical four, **wu xing** (wood/fire/earth/metal/water, whose
*generating/overcoming cycles* are exactly the complementary,
relational structure to aim for and map cleanly onto resonance), or a
fully invented set — all are content choices. **The architecture is
taxonomy-agnostic** (schools-actuate-channels + magical-layer), so the
taxonomy is deliberately **left open** until the build picks one.

---

## Part IV — The effect substrate + the magic grammar

> **Status 2026-07: BUILT.** The magic core build shipped this part —
> the effect substrate + casting (closed `Effect` union, the governing
> invariant structurally enforced), the N-axis resist seam (channel +
> toxin delegated to the shipped folds; mental = the one new Composure
> resolver), the grid as 18 advancement-Discipline leaves (**lightning
> and storm graduated from frontier** — their substrates shipped; time
> + spirit remain), the anatomical faculty (`CasterMixin` +
> `Species.facultyProfile`, mana = an absolute avail/max `pt` Reserve),
> provenance + the anti-magic field (modifiers dormant, impulses
> untouchable), the interruptible `CastActivity`, a 9-spell roster, and
> the Practicum demonstrator. **v1 is deliberately room-scoped** (the
> `deliverAt` ranged-integration seam waits for the ranged build) and
> hostile casts write the accountability `harm` ledger. See
> [docs/subsystems/magic.md](../../subsystems/magic.md). Still open
> here: Transform/polymorph, multi-cell composition, wards, the
> inquiry + magic-items consumers, Spirit/Time.

> **Design pass 2026-07-15.** This part supersedes the loose "magic-side
> capability mirrors the physical" sketch in Part II with a concrete
> shape, and it explicitly **retires a wrong turn** this pass explored
> and rejected: magic is **not** a parallel "mental plane" with its own
> combat, its own death, and a full mirror of the Vitals stack. There is
> **one** combat/interaction model — the shipped one — and magic feeds
> **inputs** into it. Everything below is smaller and more buildable than
> the mirror-a-whole-plane idea it replaces.

### The frame, in one line

**Magic = spend a reserve → fire a list of declarative effects → they
land in the systems we already have.** Mostly physical (fire, force,
ice), occasionally mental (fear, charm), all on one road.

### 1. The effect substrate — spells as data

A cast is a trigger-agnostic envelope:

```
Cast = { trigger, cost, targeting, effects: Effect[] }
```

**Trigger-agnostic is load-bearing:** the *same* `Effect` fires whether
it came from a spell, a quaffed potion, a scroll, a rune, or a trap. So
the gallery you get is not just spells — it's every magic item, hazard,
and monster power, for free. This is the `Consumable`/`Effect` "Gap 0"
substrate already named in
[magic-items-slate.md](../tails/magic-items-slate.md) (declarative
closed union + a `script` trapdoor); a spell is one more consumer of it.

**The one governing invariant:**

> An `Effect` primitive exists **iff** a gated Api already does that
> work. Magic is a new *trigger*, never a new *mechanism*.

This is what keeps magic from becoming the fudge layer Principle 4
forbids. A fireball is legal because `ConditionApi.inflict(thermal)`
exists and real combustion takes over; "gain 5 levels" is illegal —
there is no Api that does it, so you do not get to fake one. No backing
Api → the `script` trapdoor, or go build the real system first. **The
effect catalogue is therefore a curated map of the actuator-safe Api
surface** — magic can do exactly what the world can already do, from a
new door.

The catalogue (each primitive = a thin wrapper over a shipped Api):

| Effect primitive | Backing Api (shipped) | e.g. |
|---|---|---|
| `InjectChannel(channel, energy, site)` | `ConditionApi.inflict` | fireball, force-bolt, ice-shard |
| `Afflict(condition)` / `Relieve` | `Vitals.afflict/relieve` | fear, charm, slow, cure, dispel |
| `AdjustReserve(key, Δ)` | `Reserved.adjustReserve` | restore/drain mana or stamina |
| `Move(kind)` | `LocomotionApi` / `ContainmentApi` | shove, blink, levitate, pin-in-place |
| `Conjure(template)` | `StuffApi.clone` | wall of stone, summon, create water |
| `Sense(query)` | `PerceiverApi` / `PerceptionApi` | detect, scry, ESP |
| `Cloak(belief)` | `RecognitionApi` / belief | illusion, disguise, invisibility |
| `EmitField(light/heat/sound)` | light / thermal / `Audible` | darkness, warmth, thunderclap |
| `Transform(...)` | *(no Api yet — polymorph's own gap)* | ⚠ trapdoor or build-first |
| `Script(...)` | the scripting interpreter (code-trust gated) | the exotic 5% |

Two families cut across it — **impulse** (fire-and-resolve: inject, move,
mend) vs **modifier** (installs a `Condition` the reconcile-on-read
drivers realize by *pull*). This is the shadow-vs-condition line the
magic-items work already drew.

Two payoffs this shape buys, both the actual point:

- **Density.** The world can be full of magical things without a code
  project per item — a bestiary of monster powers, a catalog of
  wands/potions/scrolls/charms, environmental traps, and eventually
  player-authored magic, all authored as *concept-data* (channel,
  condition, template, energy band), never a bespoke class.
- **Honest emergence.** Because effects ride real systems, one wand does
  many believable things by understanding *what it is*: a wand of frost
  freezes a puddle solid, shatters a glass, chills a fever down, or
  punctures an unarmored throat. Fireball spreads in a wooden room and
  only heats iron. Magic is discoverable and consistent, not arbitrary —
  the Andy-Weir "reason from principles" payoff.

### 2. The resist seam — where an effect meets combat

Magic meets the one combat model at exactly **one field on an effect**:

```
Effect.resist?: { axis, intensity }   // absent = unresisted (self-buffs, utility)
```

The resolution is the **materials-response shape, generalized to N
axes** — because materials-response already *is* a resist seam for one
axis (a channel folds through armor, residual meets tissue). We lift that
shape rather than inventing a save system. Two knobs, each with a
distinct job:

- **Mitigators *subtract*** — armor, wards, a resistance-buff each remove
  a *fraction* of intensity, folded outside-in. (Physical: the covering
  stack's `attenuate`.)
- **The substrate *gates*** — tissue, Composure — it does not subtract;
  it **sets the thresholds** the residual must clear for each stage, and
  it **picks the outcome type**. (Physical: `resolveTrauma` reads tissue
  hardness/toughness for laceration-vs-fracture *and* the cutoff.)

```
resolve(target, insult):
  residual = fold mitigators(target, axis) outside-in    // SUBTRACT; 0 ⇒ deflected/immune
  substrate = substrate(target, axis)                    // GATE
  type  = substrate.typeFor(insult.quality)              // 'edge'→laceration, 'fear'→dread
  stage = bandFor(residual, type, substrate.factor())    // authored bands, substrate-scaled
  return stage ? { conditionTemplate: type, stage, residual } : null
```

The axis catalogue (v1) — physical is the shipped function, the others
register a resolver of the same signature:

| axis | mitigators | substrate | outcome |
|---|---|---|---|
| **channel** (edge/point/blunt/thermal) | armor covering stack | tissue hardness/toughness | Trauma — *shipped, `MaterialApi.attenuate`* |
| **mental** (fear/domination/anguish) | wards *(optional)* | **Composure**, read as profile × current mana/calm | condition stage |
| **toxin** | — | metabolism burden ÷ body mass | banded condition — *shipped* |
| **none** | — | — | lands in full |

Consequences worth locking:

- **residual → stage** is the shipped toxin/severity banding, generalized:
  ascending cutoffs authored on the **condition seed** (magnitude = dials,
  the toxin-`bands` precedent), **scaled by a `factor()` read from target
  state.** This is where "different inputs into one combat model" lives —
  `Composure = profile × current mana/calm`, so **a drained, frayed mage
  resists fear worse** and a rested one shrugs it. One function call, all
  the immersive-sim coupling; no plane.
- **Resist sets the *onset* stage; the condition's driver owns the
  *evolution*.** The seam decides how hard it hits; the reconcile-on-read
  condition decides what it does over time (a landed "despair" then bleeds
  will exactly as a laceration bleeds blood).
- **Two gates, cleanly separated.** A spell and a sword pass the *same*
  two: the **active** gate = the shipped combat model (dodge / parry /
  defend / poise / *interrupt the cast*) — whether it lands at all; the
  **passive** gate = this seam — given it lands, how much. There is no
  parallel resolution anywhere.
- **Immunity is not a special case** — a `Mitigator` returning `1` drives
  residual to `0`; hard-resist is the limit of graded resist. This closes
  the shipped "`afflict` has no veto layer" gap named in
  magic-items-slate.
- **Intensity units are per-axis, not unified.** The channel axis carries
  *real energy* (grounded in `hardness`/`toughness`, Principle 4); the
  mental axis carries an **authored potency scalar** (`Will × competence ×
  mana-spent`) — dimensionless and legitimate precisely because Principle
  4 licenses magic to be authored-but-lawful. No fake unified unit.
- **Banding-is-presentation holds:** you `analyze` your *own* resistances;
  an enemy's Composure you only ever feel as outcome.

The entire "mental" exploration of this pass collapses to **one cell of
that table** — *mental = Composure is the substrate, a plain
strength-vs-strength contest.* Fear is an `Afflict` with a Composure
`resist`. That is all it was ever worth; the parallel-plane machinery was
overbuilt and is dropped.

### 3. The grammar = the skill tree = advancement Disciplines

Magic's specialization layer is an **Ars-Magica-style verb × noun
grammar**, and it is **not new machinery** — it is content in the shipped
[advancement](../../subsystems/advancement.md) Catalog.

**The locked roster (2026-07-15 — folk-named).**

- **5 verbs (operations):** Create · Destroy · Control · Transform · Perceive
- **11 nouns (domains = subsystems):** Fire · Water · Air · Earth · Light ·
  Plant · Beast · Body · Mind · Sense · Arcana
- **Frontier nouns (legible gaps — unbuilt subsystems, deferred):**
  Storm/Weather · Lightning · Time · Spirit

A spell is a **two-word address** — `Create·Fire`, `Control·Mind`,
`Transform·Body` — that names *which operation, on which real system.*
The **verbs** are the effect primitives (Create ≈ Conjure/Mend, Destroy ≈
Inject/Afflict, Control ≈ Move/Compel, Perceive ≈ Sense, Transform ≈ the
unbuilt one), carved by two questions so the set is complete: *does it
exist yet?* (no → Create) and *does its essence change?* (yes → Transform;
no → Control); Perceive is the read-only one.

The **nouns each actuate one real subsystem** (the governing discipline — a
noun that maps to no subsystem is a *frontier*, not a hole):

| Noun | Actuates | Covers |
|---|---|---|
| **Fire** | thermal | heat, flame, cold (its absence) |
| **Water** | bulk / fluids | liquids, flow, pressure, phase |
| **Air** | respiration + `Audible` + biome pressure | breath, sound, pressure — *the gaseous medium* |
| **Earth** | materials | stone, metal, mineral, solid matter |
| **Light** | the light / vision subsystem | illumination, darkness, glare, seeing-in-dark |
| **Plant** | Plantae / farming | wood, growth, herbs, rot |
| **Beast** | Animalia | animals, their bodies & products |
| **Body** | vitals / harm | flesh, wounds, healing, the mortal form |
| **Mind** | conditions | thought, emotion, will, memory |
| **Sense** | belief / perception | *semblance* — illusion, disguise, what one believes they perceive |
| **Arcana** | mana `Reserve` + magic-origin conditions + in-flight casts | fuel, counter, dispel, detect, ward — *magic acting on magic* |

Three nouns were pressure-tested against the physics and the carve is
deliberate:

- **Light is split *out* of Fire** — the sim **decouples** heat and light
  (`ThermalMixin` emits no light; a hot iron doesn't glow unless it *also*
  composes `LightSourceMixin`; the campfire composes both as *independent*
  facts). So cold light and invisible heat are both real and playable.
- **Air is *narrowed*** to the gaseous medium (breath + pressure + sound).
  Its folk baggage scatters: temperature → Fire, humidity → Water, and
  **weather/wind → a frontier** (`WeatherApi.weatherAt` is a *stateless*
  procedural function — no state to grab — and vector wind is deferred; so
  "call a storm" needs a stateful wind/weather sim first). Sound **stays
  in** Air by the *same* decoupling rule Light was split by — sound
  literally *is* air in motion (pressure waves), so it's coupled, not
  separate. (Real thunderclap = Air; a phantom sound only-you-hear = Sense
  — the Light/Sense physical-field-vs-belief parallel.)
- **Arcana is reflexive** — the one noun with no external medium; its
  "substrate" is the machinery of magic itself. It carries **two
  asterisks** the physical nouns don't (see the provenance section below):
  it needs magic to be *taggable*, and it is the **highest fudge-risk
  noun** — every Arcana effect must still bottom out in a real op
  (`AdjustReserve` / `Relieve` / cast-parameter edit / a resist
  `Mitigator`), never a free-floating buff. This is where "Effect iff a
  gated Api exists" does its hardest work.

**Crucial clarification — the grid is a skill/classification lens, NOT an
effect-builder.** What a spell *does* is its `effects` (real Api calls) —
open-ended, you build anything the engine can do; you do **not** translate
an idea into the vocabulary to build it. "Glue an item to the floor" is
just a `Move`-veto effect; you build it directly. The grid only governs
**who can cast it and how well** — a spell draws on *two* disciplines
(its verb + its noun), and the tag is *derived from what it does*, applied
after, not a hoop. Even in tabletop Ars Magica the grid computes no
outcome; it is a skill-and-difficulty framework, and a GM adjudicates the
effect. The consistency players love ("fire always burns") is inherited
from the **subsystems**, never imposed by the grid.

The skill-tree structure falls out of the Catalog's existing edges:

- `synergizes` — pyromancy *synergizes* Create + Fire; a spell's
  competence is a function of **both** its axes, so getting better at
  **Fire** lifts *every* fire spell across all five verbs.
- `requires` — prerequisites (no Transform·Mind without some Transform and
  some Mind).
- band-gated `conferrals` — climbing an axis unlocks new casts (the
  `AdvancementMixin` affordance-push).

### 3½. Magical provenance — a pervasive tag

Everything magic produces is **stamped with its provenance**, everywhere
we can reach — not as a dispel-helper for Arcana, but as a first-class
cross-cutting axis. This is what makes magic **governable as a class**:
the moment every magical thing carries a mark, an author can write *"no
magic in this ward,"* the engine can suppress/detect/dispel it, and the
"Effect iff a gated Api" discipline becomes auditable at runtime.

**The tag is rich, not a boolean.** The natural stamp is the grid address
we already have plus the caster: `{ verb·noun, caster }`. Because it's the
full address, one tag unlocks a spectrum of author gates at no extra cost:
*no magic here* (any tag), *no fire magic* (`·Fire`), *no necromancy in
the chapel* (`·Spirit`), plus detect / dispel / attribution — all reading
the same mark. A boolean would give only the first.

**Where it rides / what reads it:**

| The tag rides on… | so this content becomes writable |
|---|---|
| the **cast** (the attempt) | an anti-magic zone vetoes casting (a `requiresNoSuppression`-style validator, the `requiresConscious` pattern) |
| installed **conditions** | dispel, detect, *and* zones that unravel ongoing magic |
| **items** (enchanted) | detect / disenchant / "no magic items past this gate" |
| in-flight **effects** | counterspell, ward `Mitigator`s keyed to the tag |

**The exemplar — the anti-magic zone.** A `suppresses-magic` field on a
Location/Zone, resolved by the **outward walk** (the biome/address
precedent — so it scopes a room, a building, or a region), optionally
filtered by grid-coordinate. A cast-time validator reads it and vetoes;
ongoing magical conditions check it on their next **reconcile-on-read** and
go dormant. All shipped patterns; no new mechanism.

**The honesty boundary — and it maps onto a line we already drew.** Because
magic *actuates real systems*, suppression must answer "does it un-happen a
fire?" The answer is the **impulse/modifier split** from Part IV § 1:

- **Modifier effects** = *sustained, magically-bound* (a conjured wall, a
  held levitation, a maintained ward, a compulsion) → the magic is still
  holding them up → **suppression drops them.**
- **Impulse effects** = *fired-and-released* (heat injected, rock thrown,
  fire lit) → **real now, not magic** → suppression can't un-happen them;
  the torch keeps burning, a fireball lobbed in from outside still lands as
  real heat.

So **the suppressible line *is* the impulse/modifier line** — already
drawn, and it turns out to be the honest definition of what "no magic here"
means. (Arcana's first asterisk is exactly this tag; its second — the
fudge-risk discipline — is enforced *because* the tag makes all magic
auditable as a class.)

### 4. Learning magic as a science

Magic is learned by the **shipped Competence model, unchanged** — the
same substrate blades, medicine, and farming ride:

- get better by **doing magic at the edge of your ability** (the ZPD the
  BKT estimator already targets),
- evidence accrues honestly in the **Transcript** (casting deeds, an
  `ActSignature` of `{discipline, difficulty, outcome}`),
- competence is a **measured Bayesian estimate, surfaced as a band, never
  a number** — "adept at Fire," not "Fire 47" (the honesty firewall).

**Magic is the *best* domain for the science pedagogy**, because unlike
blades it is a *lawful invented science* with laws you can discover: a
student measures a spell's effect at increasing distance, hypothesizes
inverse-square, verifies with an instrument — the **method is the
lesson.** So the magic disciplines are where "derive it from principles"
gets its purest University expression: you don't memorize spells, you
learn the **laws of the grid** by experiment, and competence follows
understanding.

#### Discovery is a consumer of the inquiry substrate

Magic doesn't own "learning by experiment" — that grew, this same session,
into a platform-level substrate for how *sim-native knowledge* is
discovered, verified, trusted, and corrupted, and was **spun out to
[inquiry-slate.md](../builds/inquiry-slate.md).** Magic is its **first and
most vivid consumer**, not its owner (combat, medicine, crafting, farming
are peers). In brief, and see the slate for the full design:

- **Discovery = recovering a hidden law by experiment** — laws are
  emergent from the honest functions, never authored; the loop is
  observe → measure → hypothesize → **predict** → verify. Two keystones:
  the engine exposes *measurements, never the model*; and discovery is
  gated by **prediction of a novel case** (no equation-parsing, no NLP —
  the deduction-slate's *truth-is-shown-not-argued* spine).
- **Banking + publishing** — a confirmed law banks as Competence and
  becomes a teachable/publishable good (shoulders of giants).
- **The wrong-paper mechanic** — self-defending (a false paper fails
  verification), so misinformation is a *social/temporal* exploit gated by
  verification cost; the insidious case is the **evidential-range
  overreach** (right in-range, wrong beyond). All in the slate.
- **The learning-model unification** — magic is in the *sim-native* camp
  (answer key = the sim) alongside combat/craft, sharing one University /
  Competence / Assessment / publishing frame with the didactic (study.com)
  camp. **Decision: loose now, tight-seam reserved** — magic
  self-credentials; the transferable real thing is the *scientific method
  itself*; a null `realWorldAnalog` seam holds the future real-course
  mapping.

### 5. What this pass settled / left open

**Settled:** one combat model (no mental plane, no mental death); the
effect-substrate shape + the actuator-only invariant; the resist seam as
generalized `attenuate` (mitigators subtract / substrate gates,
substrate-scaled banding, per-axis intensity units, immunity-as-limit);
the grid = advancement Disciplines and its status as a *skill lens, not a
builder*; **the locked roster** (5 verbs × 11 nouns + the 4 frontier
nouns, folk-named, physics-carved — Light split from Fire, Air narrowed to
the gaseous medium with weather→frontier, Arcana reflexive); **magical
provenance as a pervasive rich tag** (grid-address + caster, the ride/read
surface, the anti-magic-zone exemplar, suppressible = the impulse/modifier
line); learning = the shipped Competence model; **magic as the first
consumer of the inquiry substrate** — the discovery loop + learning-model
unification (loose now, tight-seam reserved) were **spun out to
[inquiry-slate.md](../builds/inquiry-slate.md)** this session; magic keeps
the consumer summary in § 4, the platform design lives there.

**Open:** the `Transform` primitive's missing Api (polymorph is its own
build — slot-eviction choreography, per magic-items-slate); multi-cell
spell composition (Create·Fire + Control·Air = a steered firestorm) as a
second combinatorial layer; whether wards are worth a mitigator layer at
all in v1 or Composure-alone suffices for the mental axis; the frontier
nouns' prerequisite builds (a stateful wind/weather sim for Storm, the
electricity channel for Lightning, the presence-hollowing substrate for
Spirit, and whatever safely bounds Time). *(The discovery/inquiry
sub-decisions — `Law` granularity, `analyze`-upgrade, publish economics,
misinformation — now live in inquiry-slate's open questions.)*

**Supersedes/annotates prior open questions:** Q9 (reserve topology) — a
single Focus/mana reserve is the working baseline, plural authored pools
retained as the exotic-tradition seam; Q4 (one channel or many) — magic
is a *trigger* over the shipped channels, not its own propagating field
at this tier; the "affinity" of Part II folds into the noun-discipline
competence (coupling = how good you are at that Form).

---

## The one obligation on shipping work

Everything here is deferred, but one negative obligation binds the
*current* Vitals/Materials work so this stays reachable:

- **Keep capability derivable — never add a stored CON-style scalar**
  to Vitals that duplicates the substrate.
- **All reserves ride one generalized `Reserve` substrate** (shipped by
  the Vitals build), differing by instance, not mechanism:
  endurance/satiation/hydration are biological, mana/charge/essence are
  magic-side and *authored*. The shipping obligation: build the reserve
  axis *generally* (not hardcoded to biology) so magic reserves drop in
  as instances — never fork a second reserve mechanism for magic, and
  never add a stored CON-style scalar that duplicates the substrate.
- **Don't add fake elements to chemistry.** The magical-property layer
  is additive and lands when magic does; real Materials stay the
  single source of truth for what matter is.

---

## Open questions

1. **Elemental taxonomy** — classical four / wu-xing cycles /
   invented. *Held open per user; architecture doesn't care.*
   **→ Advanced in Part IV §5:** top-level taxonomy is by **engine-domain**
   (Evocation/Force/Biomancy/…); the elemental sets survive only as content
   sub-flavor inside an Evocation-type art.
2. **Affinity shape** — per-school vector vs. single scalar; innate-
   fixed vs. marginally trainable. *Lean: per-school + marginally
   trainable, to preserve symmetry with conditioning.*
3. **Mana recovery** — does it interact with bodily fatigue/vitals at
   all (e.g., exhaustion slows mana regen), or is it a fully separate
   curve? *Lean: separate curve, with an optional condition coupling.*
   **→ Resolved in Part IV §3:** coupled — Focus rides a magical metabolism
   fed by ordinary calm / rest / nutrition; pain and fear disrupt it.
4. **One channel or many** — is magic a single thaumic field, or one
   propagating channel per school/element? *Affects the PhysicsChannel
   shape; lean single field + school as a property of casts.*
5. **Skill substrate sharing** — physical skill and spellcraft are
   almost certainly *one* skill system with different content. Confirm
   at build.
6. **Conditioning vs. vitals recovery** — does training share machinery
   with the body's healing-progression ticks? Likely yes (both are
   slow bounded curves on the body).
7. **Gear/focus** — equipment as a bounded capability channel
   (a focus boosts effective affinity; a tool boosts effective skill).
8. **Genetics as baseline source** — ties to race.md's deferred
   genetics; the physical build-baseline and innate affinity both
   eventually source there.
9. **Reserve topology — one pool or plural authored?** A single
   universal mana scalar, or per-tradition authored reserves
   (charge / essence / favor) on the shared `Reserve` axis? *Lean:
   plural + authored — the capacitor-guild "charge" precedent; one MP
   pool flattens flavor and re-introduces a stored scalar by the back
   door.* **→ Part IV §2 overrides this lean for the baseline:** a single
   **Focus** pool, with the plural-authored seam retained only for exotic
   traditions. (The "flattening" worry is answered by carving *disciplines*
   by engine-domain and by the mental statline, not by splitting the pool.)

---

## What this slate does NOT cover

- **The Vitals substrate itself** — [vitals-slate.md](../tails/vitals-slate.md).
  This slate consumes it (capability derives from the body); it doesn't
  redefine it.
- **Combat** — combat-slate territory. Capability *feeds* combat
  (effective strength/skill resolve actions); combat mechanics are
  elsewhere.
- **The actual skill trees, spell lists, and school rosters** —
  content, authored once the substrate exists.
- **Character-creation UI** — where baselines/affinities are rolled or
  chosen.
- **Alternative magic paradigms** beyond the lawful-channel model
  (wild/chaotic magic, pact magic) — deferred; if ever wanted, each is
  its own design.

---

## Once shaped into formal requirements

When RPG work begins, this boils down to:

- The capability model: derived physical capacity (baseline × condition),
  the capacity-vs-skill split, the three advancement channels, the
  horizontal-scaling discipline.
- The skill substrate (shared physical + magical) and the knowledge
  axis.
- Magic as a `PhysicsChannel`: the thaumic field, its units, its
  propagation/conservation laws, the instrument suite.
- The magic-side capability: affinity (per-school, measurable) + mana
  (the reserve), and their symmetry with the physical side.
- The elemental architecture: schools-actuate-real-channels + the
  Materials magical-property layer; the chosen taxonomy.
- Tests gating: effective capability tracks condition; conditioning is
  bounded and bidirectional; a magical law is measurable and consistent
  under `analyze`; an elemental spell actuates the correct real channel
  (fire heats/combusts per real chemistry); resonance scales effect.

The taxonomy, the spell/skill content, and the combat coupling wait
for their own work.
