# Vitals (substrate) — requirements

This build delivers the **models, not the applications**: the data
shapes, type systems, resolution chains, and seams that let a living
agent's body be modeled honestly — but **none of the specific behaviors,
content, or verbs** that act over them. A body that *can* be sick, hurt,
strong, depleted, unconscious, or dead — modeled from real substrate —
with the drivers, conditions, instruments, and treatment that *make* it
so deferred to a named follow-up build.

The dividing line throughout: **model = the shape of the thing** (fields,
types, derived readings, seams); **application = a specific behavior or
content over the shape** (the bleed tick, the influenza template, the
`bandage` verb, the death-watcher). This build is all the nouns and none
of the verbs.

This is the substrate the vitals slate's central principle —
"differentiation is the product" — will *rest on*; that assessable
payoff is consciously sequenced into the next build, on top of these
models. It is also the consumer the race subsystem deferred for:
`OrganismMixin.lifecycleState` ships as a bare field with no driver, and
this build lays the state model the eventual driver transitions.

Seeding slate: [docs/slates/builds/vitals-slate.md](../slates/builds/vitals-slate.md).
A second design thread ran through requirements — physical attributes
(strength/dexterity) as *derived readings over body substrate*, and
magic reserves as plural authored pools — which reshaped two of the
models below (the generalized `Reserve` substrate; tissue composition on
`BodyPart`). That deferred-design is captured separately (see
Cross-references); this doc scopes only what gets built.

## Goals

Outcomes, grouped by model layer. Each is a *shape that exists and
persists*, not a behavior that runs.

### 1. Measurement vocabulary — new `Quantity` units

- `bpm` (rate; serves pulse and respiration via separate scales),
  `mmHg` (pressure, converter to/from `Pa`), `L` (volume, converter
  to/from `m³`) exist in the `Unit` union with `unitOps` entries and
  friendly-tag tables in `quantity-tags.yaml`. Each round-trips through
  `QuantityMarshaller`. (`N`, `degrees`, `ms`, `K`, `%`, `J` already
  exist and need nothing.)

### 2. Vital-sign state model + derived readings

- **`VitalsMixin`** (`lib/vitals/Vitals.ts`) composes onto animate
  biological organisms (the playable Character species + the bullfrog
  NPC; **not** the Constructa tutor-bot or the Plantae peace lily). It
  is the state home: vital-sign fields, the active-condition collection
  (layer 5), the derived getters.
- **Vital signs** are first-class fields with `static fieldMarshallers`:
  core temperature (`K`), heart rate (`bpm`), respiratory rate (`bpm`),
  blood pressure (two `Quantity<'mmHg'>` fields — systolic + diastolic),
  SpO₂ (`%`), blood volume (`L`). Each has a per-species survivable
  *band* read as data.
- **Derived readings compute on every call, never stored/cached** (the
  `getSpecies` HMR discipline): `getConditionBand()` →
  `healthy`/`hurt`/`serious`/`critical`/`dead` over blood-volume
  fraction + vitals-out-of-band + trauma/reserve load;
  `getConsciousness()` → `conscious`/`unconscious`/`dead` over blood
  volume + SpO₂ + head trauma. These are the rendered surface; there is
  **no stored health scalar**.
- *Deferred (application):* the live driver that watches a vital and
  flips lifecycle. The band/consciousness readings exist and reflect
  whatever the fields hold (settable by author/debug); nothing watches
  and transitions yet.

### 3. `Species.vitalProfile`

- A per-species shape carrying healthy baselines + survivable bands,
  parallel to `visionProfile`/`lifespanMin`. Authored for the Animalia
  roster (the 7 humanoid variants + the bullfrog); a **universe-default
  biological profile** backstops any animate species without one. The
  shape is built to admit a later age-curve (reserved, not filled).

### 4. Anatomy + tissue model (the load-bearing centerpiece)

This layer is load-bearing twice — it is the injury *site* (vitals) and
the strength/dexterity *substrate* (deferred physical attributes) — so
it is modeled in full now.

- **Typed `BodyPart` descriptors on `BodyPlan`** (the model layer),
  declared once on the shared `biped` and `quadruped` plans, parallel to
  `slots`. v1 part roster is coarse: head, torso, two arms (+hands), two
  legs (+feet), heart, lungs (quadruped: head, torso, four legs, heart,
  lungs).
- **Tissue composition per part** — each `BodyPart` carries named
  tissues with masses (e.g. muscle, bone, flesh), not a single
  `defaultMaterial`. Tissues are authored Materials under
  `/lib/material/tissue/...` (the existing `flesh` precedent; `muscle`,
  `bone` join it). This is race.md's deferred "tissue authoring as named
  Details with their own materials," earned here. The mass-per-tissue is
  the substrate a later strength reading aggregates.
- **Instance-delta resolution** — the instance carries only deltas (this
  part fractured / missing / atrophied); structure lives on the shared
  `BodyPlan`. An **anatomy resolver** (mixin methods `getParts()`,
  `getPart(key)`, `getInjuredParts()`) walks instance-delta →
  `BodyPlan`-structure — the `getMaterial` / `Zone.lookupField` shape.
- **Stable dotted `body.*` keys** are the identity anchor everything
  downstream points at (trauma `site`, slot/vital couplings, future
  graph edges, future part-promotion). Locked now.
- **Coarse part→slot and part→vital couplings as data** — a missing hand
  disables its `hand:left` slot; the heart `governsVital` heart rate.
  Coarse enforcement is fine (the data is the model; rich consequence is
  application).
- *Deferred-with-seam:* the innervation/vascular **graph**
  (`innervatedBy` / `suppliedBy` declared-but-empty, no reader);
  **part-as-Stuff promotion** (severed limbs, transplants); MQL anatomy
  queries beyond `look`.

### 5. Condition type system (shapes only, no behaviors, no content)

- **`ActiveCondition`** — the common shape both kinds present behind, in
  a collection on `VitalsMixin` (`getConditions()`, `hasCondition()`,
  `afflict()`, `relieve()`), per collections.md.
- **Afflictions (Kind A)** — a `Condition extends Idea` template class
  with the `ConditionTemplate` field shape (`signature`, `progression`,
  `resolution`, `observableSigns`, `contagion?` reserved). Resolved by
  `findByTemplatePath` like Materials/Species. The instance record holds
  `{ templatePath, stage, elapsed }`. **Zero authored condition content**
  ships (no influenza, no venom) — the class and field shape exist; the
  catalog is application.
- **Trauma (Kind B)** — a `Trauma` value shape (`{ type, site, severity,
  process flags }`), a closed engine `TraumaType` union, and the
  `TRAUMA_BEHAVIOR` strategy-table *structure* (the
  `onset`/`tick`/`resolve`/`describe` interface) co-located with the
  value, the `lib/quantity.ts` substrate-module precedent. The table
  ships its **skeleton + a no-op/identity exemplar entry**, not live
  per-type behavior.
- *Deferred (application):* live progression, the hemorrhage/infection
  ticks, authored condition content, the resolution-transitions
  lifecycle. The collection round-trips and the types compile; nothing
  ticks.

### 6. Generalized `Reserve` substrate

- **`lib/reserve/`** — a depletable-replenishing capacity axis as its
  own small substrate (broader than vitals, since magic reserves share
  it). A **`Reserve`** carries `{ key, capacity (Quantity), current
  (Quantity), floor-effect seam, theme }`. Held in a keyed collection on
  a host via the reserve substrate (composition target: Character),
  surfaced per collections.md (`getReserve(key)`, `getReserves()`,
  `setReserve`/`adjustReserve`).
- **Biological reserve instances** — endurance, satiation, hydration as
  `Quantity<'%'>` reserves, pre-seeded on the body. Their floor-effect
  feeds the derived `getConditionBand` (low endurance → collapse load;
  starvation/dehydration → degradation contribution) — a *derived
  reading*, like consciousness reads vitals.
- **Authored-thematic seam** — the substrate supports content-defined
  reserves (a guild's "charge," a tradition's "essence"); "mana" is
  never an engine word. **No magic reserve content ships** — the seam is
  demonstrated (an authored reserve can be defined), not populated.
- *Deferred (application):* the drain/replenish *producers* — consumption
  refilling satiation, locomotion exertion draining endurance, any
  recharge rule. Reserves hold state and feed the band; what moves them
  is application (author/debug-settable for now).

### 7. Lifecycle / death / consciousness seams (no driver)

- **Death-as-transition-not-destruction modeled as a seam** —
  `lifecycleState` already distinguishes `dead` from `destroyed`; this
  build adds the **cause-of-death field** (stamped at transition by the
  future driver) and shapes death as *living-stop + postmortem-start*
  (the postmortem-progression seam exists; zero postmortem conditions
  ship). The corpse is the live Stuff with `lifecycleState: 'dead'`;
  animacy gating already stops animate verbs on non-`alive`/`undead`.
- **Consciousness** is the derived reading from §2.
- *Deferred (application):* the driver that watches vitals and *performs*
  the `alive → dead` transition, corpse decay, postmortem progressions.

## Non-goals

The applications — explicitly out, deferred to the named follow-up
build(s).

- **All live behavior:** condition progression / the hemorrhage tick,
  the death-watcher driver, reserve drain/replenish producers
  (consumption, exertion wiring). Nothing ticks or transitions
  autonomously in this build.
- **All authored content:** no disease/poison/affliction templates, no
  magic-reserve content, no food/consumables. Type shapes only.
- **The assessment/treatment surface:** `assess`, targeted `measure …
  on <patient>`, the instruments (Sphygmomanometer / PulseOximeter /
  Stethoscope), the hemorrhage→bandage treatment loop, the full
  treatment verb suite. All application.
- **Physical-attribute readings:** the `getStrength`-style force readings
  over muscle, dexterity readings, the dynamometer. The *substrate* they
  read (tissue composition) is built; the readings have no consumer and
  are deferred to the physical-attributes design (Cross-references).
- **The anatomy graph + part-promotion:** innervation/vascular edges
  (declared-but-empty), severed-limb / transplant Stuff promotion, MQL
  anatomy queries.
- **`inflict` producer seam, contagion, age-curve bands, GCS
  consciousness scale, deep metabolism, pharmacology.** Reserved fields
  / shaped seams only where noted; no consumers.
- **Combat, mana/magic as a system, body transformation, character
  stats/attributes as stored numbers, mental/psychological state.**
  Other-subsystem or RPG-layer territory. Magic, when it lands, acts
  *through* this substrate (reserves + conditions + vitals), no parallel
  pool.
- **Vitals/reserves on non-biological organisms** (Constructa robot,
  Plantae lily) — their power/lifecycle models are separate.

## Surface decisions

### Scope posture — substrate maximal, applications deferred

This build packs in as much *model* as cleanly fits and ignores specific
use-cases. The "differentiation is the product" payoff is sequenced into
the next build on top of these shapes — a conscious models-first
ordering, not a hollowing of the principle.

### Reserve — generalize to a substrate

A generalized `lib/reserve/` substrate, not three concrete fields on
`VitalsMixin`. Rationale: the plural-thematic-mana insight (a guild's
"charge," a tradition's "essence") makes reserves a provably *open
authored set*, not an N=2 coincidence — the same signal that earned the
two-kind condition type. Biological reserves are instances; magic
reserves are the authored seam. (Considered and rejected: concrete
fields, with magic re-deriving the shape later — rejected now that the
open set is established.)

### Anatomy — tissue composition, defer the graph

`BodyPart` carries a named-tissue composition with masses (the strength
substrate); the innervation/vascular graph is declared-but-empty with no
reader. Rationale: tissue composition is cheap, load-bearing twice, and
brutal to retrofit; the graph has zero readers in a models build and is
easy to get wrong without a consumer pulling on it.

### Condition model — two-kind, shapes only

Afflictions as content-template Ideas (Kind A) + trauma as parameterized
values (Kind B), one `ActiveCondition` collection. This build ships the
*types and table skeleton*, zero authored content, no live behavior.
Documented fallback (not taken): one unified `Condition` shape with
trauma as a degenerate site-bearing template.

### Composition home — extract a `Creature` class

`VitalsMixin`/`ReservedMixin` and the anatomy live on a new **`Creature`**
class inserted between `Agent` and `Character` (`Character extends
Creature`). The body mixins (`Organism`, `Named`, `Sexed`, `Slotted`,
`BodyPlanSlots`, `Posed`, `Visible`, `Containable`, `Container` +
`Vitals`/`Reserved`) move to `Creature`; the agency/social mixins
(`Persona`, `Gendered`, `Sensor`, `Perceiver`, `Perception`, `Vocal`,
`Soul`, `Engaged`, `Mobile`, `CommandGiver`) stay on `Character`. The
identity split is **sex (body) vs. gender/persona (social)** — `Sexed`
reads biology and stays on the body; `Gendered` (pronouns) is social
presentation consumed only by agency layers and moves up. Rationale: this
build's own principle — **vitals are body-state, not agent-state** — so
the hierarchy should carry a body layer below the agent layer. `Creature`
is concrete (a frog, a corpse, a simple animal can be a body without
agency). This is a behavior-preserving refactor done first (the planner's
Phase 1.5); the all-kingdoms `Organism`/`Creature` further split is
deferred (YAGNI — no plant/robot Stuff exists). Supersedes the first-cut
"compose onto Character" framing.

### Inherited decisions (unchanged from the first-cut requirements)

First-class Quantity vital-sign fields (not props); new `bpm` (not
`Hz`); blood pressure as two `mmHg` fields; pain derived from trauma
(not a tracked vital); binary derived consciousness (GCS deferred); `%`
reserves (not a `J` budget); `vitalProfile` + universe default;
`inflict`/contagion/aging deferred with reserved seams.

## Constraints

- **Progression targets `ScheduleApi.recurring`, not `ScheduledEmission`.**
  Even though live progression is deferred, the `TRAUMA_BEHAVIOR` /
  `ProgressionSpec` shapes must be authored against
  `ScheduleApi.recurring(intervalMs, fn, opts?)` — `ScheduledEmission`
  is engagement-bound (callback takes `{ engagement, actor, elapsed }`)
  and a condition occupies no engagement slot. Any handle a future tick
  holds is **not persisted** (re-arm on hydrate).
- **Death never routes through `StuffApi.destruct`.** The corpse is the
  live Stuff with `lifecycleState: 'dead'`; rely on the existing
  animacy gate (`SpeciesApi.isAnimate`, the `requiresAnimate`
  validator). Vitals/reserves are **body-state, not agent-state** —
  agency is gated separately, so corpses and unconscious bodies are just
  bodies with full state and reduced agency; no special-casing.
- **Persistence is free for scalars, marshalled for Quantities.** Mixin
  scalar fields hydrate with no marshalling; `Quantity` fields need
  `static fieldMarshallers = { field: QuantityMarshaller.pathFor(unit) }`.
  **Per-field invariants go on the setter** (blood volume ≥ 0, unit
  match), not a post-hydrate normalize.
- **No new Api, no registry, no Api for content.** State + behavior on
  mixins; afflictions are `findByTemplatePath` templates; trauma
  behavior is a static strategy table (substrate module); reserves are a
  mixin + value shape. Resist `VitalsApi` / `BodyPartApi` / `ReserveApi`
  / any catalog registry — the only Api candidate (`inflict`) is parked.
- **Subsystem placement.** New code in `lib/vitals/`, `lib/condition/`,
  `lib/reserve/`. Mixin files drop the `Mixin` suffix (`Vitals.ts`
  exports `VitalsMixin`, marker `_mixinName = 'VitalsMixin'`, registered
  in the `Mixins` constants). Tissues are Materials under
  `/lib/material/tissue/`. Each mixin docstring states what it is **not**
  for; any "always composed with X" constraint is a compile/runtime
  check, not a comment.
- **No engine identifiers named after content or brand** — the reserve
  substrate is `Reserve`, never `Mana`; "mana"/"charge"/"essence" are
  content names over it.

## Acceptance criteria

- `bpm` / `mmHg` / `L` exist with converters (`mmHg ↔ Pa`, `L ↔ m³`) and
  tag tables; a Quantity in each round-trips through `QuantityMarshaller`.
  Tests cover converters + tags.
- `VitalsMixin` composes onto the playable Character species + the
  bullfrog; not the lily or tutor-bot. All vital-sign fields persist and
  re-hydrate through the Avatar template. Tests cover the round-trip.
- `Species.vitalProfile` authored for the Animalia roster; an animate
  species with no profile resolves the universe default. Test covers the
  fallback.
- `BodyPlan` (biped + quadruped) declares typed `BodyPart` structure with
  per-part **tissue composition**; `getParts()` / `getPart(key)` /
  `getInjuredParts()` resolve instance-delta → BodyPlan-structure; a
  delta marking a part missing disables its coupled slot. Tests cover the
  resolution chain, the tissue composition read, and the part→slot
  coupling.
- The condition type system compiles and the `ActiveCondition` collection
  round-trips for both a Kind-A record (`{ templatePath, stage, elapsed }`)
  and a Kind-B `Trauma` value; the `TRAUMA_BEHAVIOR` table exists with
  its interface + exemplar entry. No authored condition content exists.
  Tests cover the collection round-trip for both kinds.
- The `Reserve` substrate exists in `lib/reserve/`; the three biological
  reserves are instanced on the body and persist; `getConditionBand`
  reflects a floored reserve; an **authored** reserve can be defined
  through the seam (a test defines a non-biological reserve). Tests cover
  the band-feed and the authored-reserve seam.
- The death/consciousness seams exist: the cause-of-death field, the
  `lifecycleState` `dead`/`destroyed` distinction relied upon (not
  re-modeled), and the derived `getConsciousness()` reading. **No driver
  performs a transition** — a test sets a vital below floor and confirms
  the *reading* reflects it, with no autonomous lifecycle change.
- Subsystem docs exist and are the source of truth:
  `docs/subsystems/vitals.md` (the mixin surface, vital-sign set,
  anatomy+tissue model, condition two-kind type system, death/
  consciousness seams, the derived readings) and
  `docs/subsystems/reserve.md` (the reserve substrate, biological
  instances, the authored-thematic seam). Cross-reference notes land in
  race.md (death-transition + tissue deferrals now point here),
  lifecycle.md (death ≠ destruction), activity.md (a non-engagement
  cadence consumer, when progression lands), quantities.md (the new
  units), and capability-magic-slate (mana rides the reserve substrate).

## Cross-references

- **Seeding slate:** [docs/slates/builds/vitals-slate.md](../slates/builds/vitals-slate.md)
- **Deferred design home:**
  [capability-magic-slate.md](../slates/deferred-rpg/capability-magic-slate.md)
  already holds the physical-attributes thread (strength/dexterity as
  derived capacity, the capacity-vs-skill split, conditioning,
  mana-as-reserve). The requirements conversation's deltas are folded
  into it: the generalized `Reserve` substrate, plural-thematic reserves
  ("mana" as content, not an engine word), and strength's concrete
  substrate (per-part muscle mass / tissue composition, force-readable).
  Built *here*: only the substrate those readings will consume (tissue
  composition on `BodyPart`; the `Reserve` axis).
- **Subsystem docs (read before building in-area):**
  [race.md](../subsystems/race.md), [quantities.md](../subsystems/quantities.md),
  [biome.md](../subsystems/biome.md) (instrument pattern, for the
  deferred measure surface), [activity.md](../subsystems/activity.md)
  (ScheduleApi.recurring), [lifecycle.md](../subsystems/lifecycle.md),
  [perception.md](../subsystems/perception.md),
  [properties.md](../subsystems/properties.md),
  [collections.md](../subsystems/collections.md),
  [state-model.md](../subsystems/state-model.md).
- **Adjacent slates:** [thermal-slate.md](../slates/tails/thermal-slate.md)
  (algor mortis, a future postmortem consumer),
  [capability-magic-slate.md](../slates/deferred-rpg/capability-magic-slate.md).
- **Related requirements in flight:** none.
