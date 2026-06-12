# Vitals (substrate) — implementation plan

This plan builds the **substrate/models only** for the Vitals subsystem: data shapes, type systems, resolution chains, and seams. **No live behavior, no content, no verbs, no instruments, no drivers.** Every phase compiles and tests green before the next. Obey `docs/requirements/vitals-requirements.md` (the closed scope) over the slate.

The build agent must read, before starting: `docs/requirements/vitals-requirements.md`, and the subsystem docs `race.md`, `quantities.md`, `collections.md`, `lifecycle.md`, `activity.md`, `properties.md`, `state-model.md`.

## Verified ground-truth facts the plan rests on

These were confirmed by reading the real code; build against them, not against the slate's older shapes:

- **Quantity substrate** (`lib/quantity.ts`): the `Unit` union (~L38-62), `unitOps` map (~L104-130), and `registerConverter(from,to,fn)` (private; called at module-load, e.g. `g↔kg`). `K/Pa/%/N/J/degrees/ms/Hz` already exist; **`bpm`/`mmHg`/`L` do not.**
- **Tag tables load from YAML** (`config/quantity-tags.yaml`) via `QuantityApi.loadTagTables`, validated against `config/quantity-tags.schema.json`. **The schema's `patternProperties` regex enumerates allowed units and does NOT include `bpm`/`mmHg`/`L`** — it must be extended or load fails at boot. (Easy to miss.)
- **First-class Quantity field pattern** (exemplar: `Material._density`, `Tangible._mass`): private backing field + protected get/set with strict unit+invariant check on the **setter**, `static fieldMarshallers = { field: QuantityMarshaller.pathFor(unit) }`, and the field name listed in `static persistentFields`. `QuantityMarshaller.pathFor(unit)` encodes the unit (`%`→`pct`, `m³`→`m3`, `/`→`-per-`).
- **Plain-`Record` persistent fields hydrate free** — the precedent is `Tangible._detailMaterialPaths: Record<string,string>` listed in `persistentFields` with no marshaller. This is how the condition collection and reserve map persist (plain-serializable values; only embedded `Quantity` leaves need marshalling — see the Reserve persistence decision below).
- **Resolution-walk precedent**: `Tangible.getMaterial(detailKey)` walks longest dotted-prefix → bulk default; `OrganismMixin.getSpecies()` computes-not-caches via `findByTemplatePath`. The anatomy resolver mirrors both.
- **Mixin registration**: a mixin file sets `static _mixinName = 'XMixin'`, exports `XMixin`, and **must be added to the `Mixins` constants** in `lib/mixin.ts`. `persistentFields` are collected per-mixin via `MixinApi.queryMixins` (walks the prototype chain by `_mixinName`).
- **`SpeciesApi.isAnimate`** already gates animacy (Animalia alive/undead, Constructa powered, Plantae/Fungi never). Death never routes through `StuffApi.destruct`. The `requiresAnimate` validator reads `isAnimate`. **Do not re-model any of this.**
- **No *named* NPC class exists**: bullfrog / peace-lily / tutor-bot are **species seeds**, not instantiated Stuff classes. This build adds a concrete **`Creature`** class (Phase 1.5) as the body layer; `VitalsMixin`/`ReservedMixin` compose onto it, and `Avatar`/`Character` inherit them via `Creature`. The "bullfrog composes / lily+tutor-bot don't" acceptance: a bare `Creature` (given the bullfrog species) is a real biological body with vitals; the lily/tutor-bot are non-animate species with **no Stuff class**, so they never become Creatures. The runtime composition guard (Vitals requires Organism) is structurally satisfied on Creature but kept as a backstop.
- **`ScheduleApi.recurring(intervalMs, fn, opts?)`** is the cadence primitive shapes target. The engagement-bound `ScheduledEmission` in `api/scheduler.ts` is **wrong** for conditions. No live ticks are built; only the shapes.
- **Species capability fields** (`Species.ts`): `lifespanMin/Max`, `visionProfile`, `olfactoryProfile`, `circadianBand`, `diet`, each with a getter/setter, listed in `persistentFields`; flat object profiles (e.g. `visionProfile`) persist without a marshaller. `vitalProfile` parallels these.
- **`BodyPlan`** (`BodyPlan.ts`) is a Singleton flyweight with `slots: SlotSpec[]` and `persistentFields`. `BodyPart` descriptors are added parallel to `slots`. Body-plan seeds live at `seeds/lib/body-plans/{biped,quadruped,sessile}.yaml`.
- **Tissues are Materials authored as seeds** under `seeds/lib/material/tissue/` (`flesh.yaml` exists; the `lib/material/tissue/` TS dir does NOT exist — tissues are plain `Material` singletons via YAML `class: /lib/material/Material`). `muscle` and `bone` are new seeds, no new TS.

---

## Phase 0 — Read & orient (no code)

Read the requirements doc and the subsystem docs listed above. Confirm the verified facts. Note the two hard "resist" rules: **no new Api**, **no registry**. Everything is mixins, value shapes, static substrate modules, and `findByTemplatePath` templates.

---

## Phase 1 — Measurement vocabulary: new Quantity units

**Goal:** `bpm`, `mmHg`, `L` exist with `unitOps`, converters (`mmHg↔Pa`, `L↔m³`), tag tables, and round-trip through `QuantityMarshaller`. (Acceptance criterion 1.)

### Files to modify

1. **`lib/quantity.ts`**
   - Add `'bpm' | 'mmHg' | 'L'` to the `Unit` union (group them under a `// Vitals (rate / pressure / volume)` comment).
   - Add `bpm: ARITHMETIC_OPS`, `mmHg: ARITHMETIC_OPS`, `L: ARITHMETIC_OPS` to `unitOps`.
   - Register converters at module-load alongside the existing `g↔kg` block:
     - `registerConverter('mmHg','Pa', n => n * 133.322368)` and `registerConverter('Pa','mmHg', n => n / 133.322368)`.
     - `registerConverter('L','m³', n => n / 1000)` and `registerConverter('m³','L', n => n * 1000)`.
   - `bpm` has **no converter** (it is its own rate axis; the slate's "pulse and respiration via separate scales" is a *tag-scale* distinction, not a unit conversion — see tags below).

2. **`config/quantity-tags.schema.json`**
   - **Extend the `patternProperties` regex** to include the three new units: `...|m/s²|bpm|mmHg|L)$`. (Without this, `loadTagTables` throws at boot — this is the easy-to-miss step.)

3. **`config/quantity-tags.yaml`** — add three unit blocks:
   - `bpm` with **two scales** (the "separate scales" requirement): author `pulse` first (so it's the default) — e.g. `bradycardic`(0) / `normal`(60) / `tachycardic`(100) — then `respiration` — e.g. `bradypneic`(0) / `normal`(12) / `tachypneic`(20). (Thresholds are coarse v1 bands; tune to the slate's vital table.)
   - `mmHg` `default`: `hypotensive`(0) / `normal`(90) / `elevated`(120) / `hypertensive`(140). (Single scale; systolic prose. Diastolic re-uses it.)
   - `L` `default`: a coarse blood-volume vocabulary is awkward as an absolute-litre table; author a minimal `default` (e.g. `empty`(0) / `low`(3) / `normal`(5)) so the unit has a table and `round-trips`. The clinical band logic lives in `vitalProfile`, not the `L` tag table.

### Marshaller note

`QuantityMarshaller.pathFor('mmHg' | 'bpm' | 'L')` already works (generic encode). The per-unit marshaller singleton is created on demand by the persistence pipeline; **confirm a seed exists or is auto-created** — check how existing units (`kg/m³`, `g/mol`) get their `QuantityMarshaller` singleton. If marshaller singletons are seeded per-unit, add seeds for the three new units mirroring the existing ones; if they're lazily `singleton(pathFor(unit))`-created, nothing more is needed. (Inspect `seeds/lib/persistence/` for `QuantityMarshaller` seeds during the build.)

### Tests (gate Phase 1)

- `lib/__tests__/quantity.vitals-units.test.ts` (or extend the existing quantity test):
  - `Quantity.of(120,'mmHg').to('Pa')` ≈ 15998.7; `Pa→mmHg` round-trips; `L↔m³` round-trips.
  - `bpm` add/scale work; `bpm` has no converter (calling `.to('Hz')` throws).
  - tag lookups: `Quantity.of(110,'bpm').tag('pulse')==='tachycardic'`; `.tag('respiration')` differs at the same value; `mmHg` and `L` default tags resolve.
- Marshaller round-trip: for each of `bpm/mmHg/L`, `QuantityMarshaller` (resolved via `pathFor`) `toStored`→`fromStored` is identity. Use the existing marshaller test harness (`installV1QuantityTagTables` helper).
- Run `QuantityApi.loadTagTables()` against the real YAML in a test (or rely on the boot path) to confirm the schema accepts the new units.

---

## Phase 1.5 — Hierarchy: extract the `Creature` class (body / agency split)

**Goal:** insert a **concrete `Creature`** class between `Agent` and `Character`, carrying the **body** mixins; `Character extends Creature` and adds the **agency** mixins. **No behavior change — the full existing suite stays green.** This gives `VitalsMixin`/`ReservedMixin` (and a future non-agent organism — a frog, a corpse) a real home, replacing the test-fixture approach. **This is the riskiest phase (mixin composition order); do it in isolation and run the whole suite before moving on.**

Rationale: vitals are body-state, not agent-state (the requirements' core principle). The class hierarchy should reflect it — a body that can break, with or without agency.

### The partition

Today `Character` is one ~19-mixin stack on `Agent`. Split it:

- **Creature (body):** `Named`, `Organism`, `Sexed`, `Slotted`, `BodyPlanSlots`, `Posed`, `Visible`, `Containable`, `Container` (+ `Vitals`, `Reserved` added in Phases 2/4).
- **Character (agency):** `Persona`, `Gendered`, `Sensor`, `Perceiver`, `Perception`, `Vocal`, `Soul`, `Engaged`, `Mobile`, `CommandGiver`.

The identity mixins split along **sex (body) vs. gender/persona (social)** — the line `SexedMixin`'s own docstring already draws ("sex from biology, pronouns from social presentation"):
- **`Sexed` → Creature.** Biological sex; reads `species.getSexDeterminationSystem()` (an Organism-layer fact). A body has a sex.
- **`Gendered` → Character.** Pronouns are social presentation, consumed **only** by agency/command/grammar layers (`api/grammar`, `api/command`, `lib/command/Focused`, `Avatar`, MQL pronoun-memory) — nothing on the body/description layer reads them (verified: `lib/description/` has no pronoun reference). `GenderedMixin` is dependency-free (a lone `pronouns` field), so relocating it is safe.
- **`Persona` → Character.** Bio/aspiration is narrative/social identity (char-gen), not raw body.

### Preserve these documented composition-order constraints (from `Character.ts`)

The split keeps every one — each is body-inner / agency-outer, and only one straddles the boundary:
- **`Containable` before (inner of) `Mobile`** (Mobile uses setContainer/getContainer): Containable inner on Creature, Mobile outer on Character ✓ — the one cross-boundary constraint, still satisfied.
- **`Organism` between `Named` and `Gendered`**: preserved in the full chain — `Named`+`Organism` on Creature (inner), `Gendered` on Character (outer); the comment's intent ("species/identity surface before the gender/perception layers stack on top") maps exactly onto the body→agency split.
- **`BodyPlanSlots` outer of `Slotted`, after `Organism`** (reads species→bodyPlan): all on Creature ✓.
- **`Perceiver` directly outer of `Sensor`; `Perception`+`Sensor`+`Perceiver` together**: all on Character ✓.
- **`Engaged` immediately inner of `Mobile`**: both on Character ✓.

### Files

1. **`lib/creature/Creature.ts`** (new). Compose the body stack on `Agent` (inner→outer), preserving order:
   `Container(Containable(Visible(Posed(BodyPlanSlots(Slotted(Sexed(OrganismMixin(NamedMixin(Agent)))))))))`.
   `export class Creature extends CreatureBase` — **concrete** (a simple organism or a test can instantiate a bare body). `Agent` already calls `Stuff._registerTopLevelBranch`; Creature does not re-register. Carry over the relevant ordering comments. (Placement: `lib/creature/` as its own entity-layer dir; `lib/character/Creature.ts` is the low-friction alternative — pick one, be consistent.)
2. **`lib/character/Character.ts`** — `Character` now `extends Creature`, composing only the agency stack:
   `CommandGiverMixin(MobileMixin(EngagedMixin(SoulMixin(VocalMixin(PerceptionMixin(PerceiverMixin(SensorMixin(GenderedMixin(PersonaMixin(Creature))))))))))`.
   Remove the body mixins + their now-unused imports (they live in Creature); keep `Character` abstract.
3. No `Mixins`-registry change here — existing mixins are relocated, not added.

### Tests (gate Phase 1.5)

- **The entire existing suite passes unchanged** — this phase is behavior-preserving. That is the primary gate.
- `instanceof`: `avatar instanceof Creature` and `avatar instanceof Character` both true; the prototype chain is `Avatar → Character → Creature → Agent`.
- A bare `new Creature()` (or a minimal test subclass) exposes the body surface (`getSpecies`, slots, `Visible`, `Container`) and has **no** command execution (`executeCommand` absent) — proving the split.
- Avatar still composes the full surface (spot-check a command verb, a perception verb, speech).

---

## Phase 2 — `vitalProfile` on Species + `VitalsMixin` vital-signs + derived readings

**Goal:** `Species.vitalProfile` shape + universe default; `VitalsMixin` with vital-sign Quantity fields, the survivable-band reader, and the derived `getConditionBand()` / `getConsciousness()` (computed every call). (Acceptance criteria 2, 3; the death/consciousness *reading* half of 7.)

### 2a. `Species.vitalProfile`

Colocate the type in `Species.ts` (no `types.ts` barrel). Shape it to admit a later age-curve without filling it.

In **`lib/species/Species.ts`**, add an exported interface and field:

```ts
/** One vital sign's healthy baseline + survivable band, per species. */
export interface VitalBand {
  baseline: number;        // healthy resting value, canonical unit
  survivableMin: number;   // below → fatal/critical contribution
  survivableMax: number;   // above → fatal/critical contribution
  // reserved age-curve seam — declared, no reader this build:
  // ageCurve?: AgeCurveSpec;
}

/** Per-species vital baselines + bands. Keyed by VitalSign (see Vitals.ts). */
export interface VitalProfile {
  // one VitalBand per VitalSign key; bloodPressure split into two.
  coreTemperature: VitalBand;   // K
  heartRate: VitalBand;         // bpm
  respiratoryRate: VitalBand;   // bpm
  bloodPressureSystolic: VitalBand;  // mmHg
  bloodPressureDiastolic: VitalBand; // mmHg
  spo2: VitalBand;              // %
  bloodVolume: VitalBand;       // L
}
```

- Add `protected vitalProfile: VitalProfile | null = null;` with `getVitalProfile()/setVitalProfile()` (validate shape on the setter like `setOlfactoryProfile` does), and add `'vitalProfile'` to `persistentFields`. Flat nested record → **no marshaller** (same as `visionProfile`).
- **Import note:** `VitalSign` lives in `Vitals.ts` and `VitalProfile` lives in `Species.ts`. To avoid a Species→Vitals import cycle, define the `VitalSign` string-union in a tiny leaf module the owning module of the signs (`lib/vitals/Vitals.ts`) re-exports, OR keep `VitalProfile` keyed by literal field names (as above) so `Species.ts` needs no `vitals` import. **Recommendation: key `VitalProfile` by literal field names** (above) — zero cross-import, and `VitalsMixin` maps its `VitalSign` enum onto these keys internally.

### 2b. Universe-default backstop

Author a universe-default `VitalProfile` constant. **Recommendation:** a module-level `UNIVERSE_DEFAULT_VITAL_PROFILE` const exported from `lib/vitals/Vitals.ts` (Homo-sapiens-shaped baselines). `VitalsMixin` reads `species.getVitalProfile() ?? UNIVERSE_DEFAULT_VITAL_PROFILE`. This mirrors the sessile-bodyplan backstop pattern and keeps it as a substrate constant, not an Api/registry. (Do not seed a "default species" — the backstop is engine code.)

### 2c. `VitalsMixin` — `lib/vitals/Vitals.ts`

New file. Docstring must state **what it is NOT for** (not agent-state; not a health scalar; not a condition-content catalog; not the death driver) and the **"always composed with OrganismMixin" constraint as a runtime check**, not a comment.

Surface (this phase ships the vital-sign + derived-reading half; the condition collection lands Phase 5):

```ts
export type VitalSign =
  | 'coreTemperature' | 'heartRate' | 'respiratoryRate'
  | 'bloodPressureSystolic' | 'bloodPressureDiastolic'
  | 'spo2' | 'bloodVolume';

export type ConditionBand = 'healthy' | 'hurt' | 'serious' | 'critical' | 'dead';
export type Consciousness = 'conscious' | 'unconscious' | 'dead';

export interface Vitals {
  getVitalSign(sign: VitalSign): Quantity<Unit>;
  setVitalSign(sign: VitalSign, value: Quantity<Unit>): void;
  getVitalBand(sign: VitalSign): VitalBand;        // reads species profile / default
  getConditionBand(): ConditionBand;               // derived, never stored
  getConsciousness(): Consciousness;               // derived, never stored
  getCauseOfDeath(): string | null;                // Phase 6 field; declare now
  setCauseOfDeath(value: string | null): void;
}
```

Implementation notes:
- **Storage:** seven first-class Quantity fields, one per `VitalSign`, each a private backing field with a strict setter (unit match + non-negative where applicable, e.g. `bloodVolume ≥ 0` — invariant on the setter per the requirements). Map `setVitalSign(sign, q)` to the right backing field; `getVitalSign` reads it. Each field in `persistentFields`; each in `static fieldMarshallers` via `QuantityMarshaller.pathFor(<unit>)` (`coreTemperature`→K, heart/resp→bpm, BP→mmHg, spo2→%, bloodVolume→L).
- **`getVitalBand(sign)`** resolves `this.getSpecies()?.getVitalProfile() ?? UNIVERSE_DEFAULT_VITAL_PROFILE` then indexes by sign. **Composition dependency:** `VitalsMixin` calls `getSpecies()` — so it requires `OrganismMixin`. Enforce with a **runtime guard** in a method or in `setVitalSign`/constructor: `if (!MixinApi.isOrganism(this)) throw` — satisfying "always composed with X becomes a check, not a comment." (Compile-time: type the mixin's `this` against `Organism` where feasible.)
- **Derived readings compute every call** (no field, no cache — the `getSpecies` HMR discipline). `getConditionBand()` reads blood-volume fraction (`current / baseline`), counts out-of-band vitals, and **will later** add trauma/reserve load (Phases 4/5 feed in; this phase's version reads vitals + blood volume only, with a clearly-marked seam for the trauma/reserve contribution so Phases 4-5 extend it without reshaping). `getConsciousness()` reads blood volume + SpO₂ (+ head-trauma seam, fed Phase 5). If `lifecycleState==='dead'`, both return `dead` (read the existing `OrganismMixin.getLifecycleState()` — do not re-model).

### 2d. Compose onto Creature

Add `VitalsMixin(...)` to the **`Creature`** composition (`lib/creature/Creature.ts`, Phase 1.5), *outer* of `OrganismMixin`/`BodyPlanSlots` so `getSpecies()` and the anatomy/slot surface resolve. Register in **`lib/mixin.ts` `Mixins`**: `Vitals: 'VitalsMixin'`. Vitals lands on the **body** layer — every Character/Avatar inherits it via Creature, and a bare Creature (frog, corpse) has it too. The "always composed with Organism" guard is structurally satisfied (both on Creature); keep the runtime check anyway.

### 2e. Seeds: author `vitalProfile` for the Animalia roster

Add a `vitalProfile:` block to each of the 8 Animalia species seeds:
- the 7 humanoids: `seeds/.../homo/{sapiens,infernalis,periannath,eldarinus,draconicus,khazadicus,semiorcus}.yaml`
- the bullfrog: `seeds/.../lithobates/catesbeianus.yaml` (distinct bands — frog HR/temp differ from human).

Do **not** author `vitalProfile` on the lily or tutor-bot (they are non-biological; the universe default is irrelevant since they don't compose `VitalsMixin`). The acceptance test "animate species with no profile resolves the universe default" is proven by a test fixture, not a production species.

### Tests (gate Phase 2)

- `lib/vitals/__tests__/Vitals.signs.test.ts`:
  - All seven vital-sign fields persist + re-hydrate through the **Avatar** template (the only persisted Creature — `Character`/`Creature`/`Agent` are runtime-only — Acceptance 2). Clone a test Avatar, set vitals, save→hydrate, assert equality.
  - `bloodVolume` setter rejects negative; unit-mismatch setter throws.
  - `getVitalBand` reads the species profile; a fixture animate species with **no** `vitalProfile` falls back to `UNIVERSE_DEFAULT_VITAL_PROFILE` (Acceptance 3).
  - `getConditionBand()` / `getConsciousness()` compute and reflect set field values (e.g. blood volume below `survivableMin` → `critical`/`dead` band, low SpO₂ → `unconscious`) with **no** lifecycle mutation (the reading reflects the substrate; nothing transitions — Acceptance 7).
- Composition guard: a fixture that composes `VitalsMixin` without `OrganismMixin` throws on use (the runtime check).

---

## Phase 3 — Anatomy + tissue model

**Goal:** typed `BodyPart` descriptors on `BodyPlan` (parallel to `slots`) with per-part tissue composition; instance-delta resolution; the anatomy resolver (`getParts/getPart/getInjuredParts`); stable `body.*` keys; part→slot and part→vital couplings as data; innervation/vascular graph fields declared-but-empty. (Acceptance criterion 4.) New tissues `muscle`, `bone` as Material seeds.

### 3a. `BodyPart` descriptor on `BodyPlan`

In **`lib/species/BodyPlan.ts`**, colocate the type and add the field parallel to `slots`:

```ts
/** Named tissue + its mass within a body part. */
export interface TissueComposition {
  tissuePath: string;        // Material templatePath, e.g. /lib/material/tissue/muscle
  mass: number;              // kg (plain number; aggregated by future strength reading)
}

/** Typed anatomical part descriptor — the model layer, shared across a body plan. */
export interface BodyPart {
  key: string;               // canonical dotted path: 'body.arm.left.hand'
  parent: string | null;     // tree edge; 'body.arm.left'
  tissues: TissueComposition[];   // named tissues + masses (NOT a single defaultMaterial)
  enablesSlots?: string[];   // affordances this part gates ('hand:left')
  governsVital?: VitalSign;  // organ→vital coupling ('body.torso.heart' → heartRate)
  severable?: boolean;       // future part-promotion seam
  innervatedBy?: string[];   // DECLARED-but-empty, no reader this build
  suppliedBy?: string[];     // DECLARED-but-empty, no reader this build
}
```

- Add `public bodyParts: BodyPart[] = [];` with `getBodyParts()/setBodyParts()` (setter validates: unique keys, every `parent` references a known key or `null`, every `governsVital` is a valid `VitalSign`, every `enablesSlots` entry names a slot on this plan). Add `'bodyParts'` to `persistentFields`. Plain nested array of plain records → **no marshaller** (`mass`/`tissuePath` are scalars).
- `VitalSign` import: `BodyPlan.ts` would need `VitalSign` from `Vitals.ts`. To avoid a cycle (`Vitals`→`Species`→`BodyPlan`→`Vitals`), type `governsVital` as `string` on `BodyPlan` with a doc-comment that it's a `VitalSign` literal, and validate against the known sign set passed in or a small shared constant array. **Recommendation:** extract the `VITAL_SIGNS` readonly tuple to the lowest-level module (`lib/vitals/Vitals.ts`) and import the *value* array into `BodyPlan` for validation only — values don't create the same structural cycle risk; verify no cycle at build and fall back to `string` + runtime check if tsc complains.

### 3b. Instance-delta storage + anatomy resolver on `VitalsMixin`

The instance carries only **deltas**; structure lives on the shared `BodyPlan`. Mirror `Tangible._detailMaterialPaths` (plain `Record`, free hydration).

In **`lib/vitals/Vitals.ts`** add:

```ts
/** Per-part instance delta — only what differs from the BodyPlan structure. */
export interface BodyPartDelta {
  missing?: boolean;         // severed/absent → disables coupled slots
  // (severity/condition state lives in the condition collection, not here)
}

export interface ResolvedBodyPart extends BodyPart {
  // structure from BodyPlan, merged with the instance delta:
  missing: boolean;
}
```

- Storage: `public bodyPartDeltas: Record<string, BodyPartDelta> = {};` in `persistentFields` (free).
- Resolver methods (collections.md Shape B read surface, keyed by part `key`):
  - `getParts(): ResolvedBodyPart[]` — walk `getSpecies().getBodyPlan().getBodyParts()`, merge each with `bodyPartDeltas[key]`.
  - `getPart(key): ResolvedBodyPart | null` — single lookup; the walk is delta → BodyPlan-structure (the `getMaterial`/`getSpecies` resolution shape).
  - `getInjuredParts(): ResolvedBodyPart[]` — v1: parts with `missing===true` (later: parts bearing trauma — seam noted).
- **Part→slot coupling:** add `isSlotDisabledByAnatomy(slot): boolean` — returns true iff some part with `enablesSlots` including `slot` resolves `missing`. This is read by the existing slot machinery. **Wiring decision:** do NOT modify `SlottedMixin.canOccupy` invasively; instead expose the predicate on `VitalsMixin` and have `BodyPlanSlotsMixin.getSlotNames`/`canOccupy` consult it where the host composes both (a coarse check is acceptable per requirements). During the build, locate `BodyPlanSlotsMixin` and add the minimal consult; if that proves to entangle, the acceptance test can assert the predicate directly plus a thin `canOccupy` gate. Keep enforcement coarse.

### 3c. Tissue Material seeds

Author `seeds/lib/material/tissue/muscle.yaml` and `seeds/lib/material/tissue/bone.yaml` mirroring `flesh.yaml` (`class: /lib/species/.../Material`, density/hardness/tags appropriate: muscle ~1060 kg/m³ soft; bone ~1900 kg/m³ hard). No new TS — they are plain `Material` singletons resolved by `findByTemplatePath`.

### 3d. Body-plan seeds: declare `bodyParts`

Add a `bodyParts:` block to `seeds/lib/body-plans/biped.yaml` and `quadruped.yaml` (NOT `sessile.yaml` — no agency anatomy):
- **biped** roster (coarse v1): `body.head`, `body.torso`, `body.arm.left`(+`body.arm.left.hand`), `body.arm.right`(+`.hand`), `body.leg.left`(+`body.leg.left.foot`), `body.leg.right`(+`.foot`), `body.torso.heart`, `body.torso.lungs`. Each with `tissues` (muscle/bone/flesh masses), `parent`, and the couplings: `body.arm.left.hand` → `enablesSlots: ['hand:left']`; `body.torso.heart` → `governsVital: heartRate`; `body.torso.lungs` → `governsVital: respiratoryRate`.
- **quadruped** roster: head, torso, four legs, heart, lungs.

### Tests (gate Phase 3)

- `lib/vitals/__tests__/Vitals.anatomy.test.ts`:
  - `getParts()`/`getPart(key)` resolve the BodyPlan structure (Acceptance 4 resolution chain).
  - Tissue composition read: `getPart('body.leg.left').tissues` returns the seeded muscle/bone/flesh masses (Acceptance 4 tissue read).
  - Instance-delta: set `bodyPartDeltas['body.arm.left.hand'] = { missing: true }`, assert `getInjuredParts()` includes it and `isSlotDisabledByAnatomy('hand:left')` is true; and that the coupled slot is disabled (Acceptance 4 part→slot coupling).
  - Deltas round-trip through persistence.
- `lib/species/__tests__/BodyPlan.bodyParts.test.ts`: setter validation (duplicate key, bad parent, unknown vital) throws; seeded biped/quadruped parse.

---

## Phase 4 — Generalized `Reserve` substrate

**Goal:** `lib/reserve/` substrate; a `Reserve` value shape; a reserve mixin holding a keyed collection; three biological reserves pre-seeded on the body; the floor-effect feeds `getConditionBand`; an authored non-biological reserve definable through the seam. (Acceptance criterion 6.) Engine identifier is `Reserve`, never `Mana`.

### Architectural decisions (resolved)

- **Reserve composition — Recommendation: a sibling `ReservedMixin` that `VitalsMixin` depends on, both composed on `Creature` (Phase 1.5); `VitalsMixin` reads reserves via the host's reserve surface.** Rationale: reserves are "broader than vitals" (magic shares them), so they are their own substrate (`lib/reserve/`), and Vitals must not own them. Compose both on Creature; `getConditionBand` reads `this` (the host) for its reserve surface. Enforce the dependency with a runtime guard in `VitalsMixin`'s band reader (`if reserve surface present, fold in floor effects`) — coarse, not a hard composition requirement, so a future non-biological reserve host can compose `ReservedMixin` alone.
- **`Reserve` storage shape — Recommendation: a value object in a keyed `Record<key, ReserveStored>` collection (collections.md Shape B keyed-Map surface), persisted as a plain Record whose values are plain-serializable.** Because a `Reserve` holds `Quantity` capacity/current, store the **decomposed scalar form** (`{ capacityValue, currentValue, unit, theme, floorEffect }`) in the Record so it hydrates free (the `_detailMaterialPaths` precedent + the `AmbientLit` "decompose Quantity into scalars" precedent the Marshaller doc cites). The `Reserve` *value object* (with `Quantity` accessors) is reconstructed by the getter from the stored scalars — **no marshaller needed**, mirroring how mixins rebuild `Light` from `ambientIntensity`+`ambientColor`. This avoids a per-element Quantity marshaller inside a Map (which the marshaller layer doesn't cleanly support).

### Files to create

1. **`lib/reserve/Reserve.ts`** — the value shape + theme/floor seam:

```ts
export interface Reserve {
  key: string;                  // 'endurance' | 'satiation' | 'hydration' | content keys
  capacity: Quantity<Unit>;     // typically Quantity<'%'>
  current: Quantity<Unit>;
  theme: string;                // 'biological' | content theme ('charge','essence' — content)
  floorEffect: string | null;   // seam: named effect when current hits floor (no consumer)
}
/** Decomposed persistence shape held in the keyed Record (free hydration). */
export interface ReserveStored {
  capacityValue: number;
  currentValue: number;
  unit: Unit;
  theme: string;
  floorEffect: string | null;
}
```

Include conversion helpers `toStored(reserve)` / `fromStored(stored)` as pure functions in this module (not a Marshaller subclass — they're called by the mixin getter/setter).

2. **`lib/reserve/Reserved.ts`** — `ReservedMixin` exporting `Reserved` interface, `_mixinName = 'ReservedMixin'`. Docstring states what it is NOT for (not vitals; not agent-state; "Reserve" is engine, content names ride on `theme`/`key`). Surface (collections.md Shape B):

```ts
export interface Reserved {
  getReserve(key: string): Reserve | undefined;
  getReserves(): ReadonlyMap<string, Reserve>;
  setReserve(reserve: Reserve): void;          // key derives from value → addX-style
  adjustReserve(key: string, delta: Quantity<Unit>): void;  // clamps [0, capacity]
  hasReserve(key: string): boolean;
  removeReserve(key: string): boolean;
}
```

Storage: `public reserves: Record<string, ReserveStored> = {};` in `persistentFields` (free). Getters reconstruct `Reserve` value objects via `fromStored`. `setReserve`/`adjustReserve` apply the floor/cap invariant **on the setter** (current clamped to `[0, capacity]`, unit match).

3. Register in **`lib/mixin.ts`**: `Reserved: 'ReservedMixin'`. Compose `ReservedMixin` onto **`Creature`** (`lib/creature/Creature.ts`), *inner* of `VitalsMixin` so the band-feed can read the reserve surface.

### Biological reserves pre-seeded on the body

The three reserves (endurance, satiation, hydration) as `Quantity<'%'>` with `theme: 'biological'`. **Seeding mechanism — Recommendation:** since reserves are *instance* state not template content, seed them at body construction. Add an init that runs when a `Creature` is built/cloned: populate `reserves` with the three biological reserves at full capacity if absent. Put this init as a small method on `ReservedMixin` (e.g. `installBiologicalReserves()`) called from `Creature`'s construction/post-register path (find where an existing `installDefaultLoadout`-style init runs and add alongside, or call it lazily on first `getReserves`). Keep "what's biological" as a substrate constant `BIOLOGICAL_RESERVE_KEYS` in `lib/reserve/Reserve.ts`.

### Band feed

Extend `VitalsMixin.getConditionBand()` (the seam left in Phase 2) to fold in reserve floor effects: if the host composes `ReservedMixin` and a biological reserve is floored (e.g. `current` near 0), add a degradation contribution (low endurance → collapse load; starvation/dehydration → band worsens). This is a **derived reading**, exactly like consciousness reading vitals.

### Authored-thematic seam

No content ships. The seam is: `setReserve({ key:'<content>', theme:'<content-theme>', ... })` works for any non-biological reserve. The acceptance test defines one (e.g. `key:'charge', theme:'arcane'`) and round-trips it.

### Tests (gate Phase 4)

- `lib/reserve/__tests__/Reserved.test.ts`:
  - Three biological reserves instanced on a fixture body, persist + re-hydrate (Acceptance 6).
  - `adjustReserve` clamps to `[0, capacity]`; unit mismatch throws.
  - **Authored-reserve seam**: define a non-biological reserve through `setReserve`, round-trip it (Acceptance 6 authored seam).
- `lib/vitals/__tests__/Vitals.bandFeed.test.ts`: floor a biological reserve, assert `getConditionBand` reflects it (Acceptance 6 band-feed). Assert engine never emits the word "mana".

---

## Phase 5 — Condition type system (shapes only)

**Goal:** `ActiveCondition` unifying Kind-A affliction records and Kind-B `Trauma` values behind one collection on `VitalsMixin`; the `Condition extends Idea` template class + `ConditionTemplate` field shape (zero content); the closed `TraumaType` union + `TRAUMA_BEHAVIOR` strategy-table skeleton with one no-op exemplar; `ProgressionSpec` shapes authored against `ScheduleApi.recurring`. (Acceptance criterion 5.) Nothing ticks.

### Files to create

1. **`lib/condition/ActiveCondition.ts`** — the unified collection element + the two kinds:

```ts
/** Kind-A: affliction instance record — resolves behavior from a content template. */
export interface AfflictionRecord {
  kind: 'affliction';
  templatePath: string;     // findByTemplatePath → Condition Idea
  stage: number;
  elapsed: number;          // ms
}
/** Kind-B: trauma value — behavior from the static TRAUMA_BEHAVIOR table. */
export interface Trauma {
  kind: 'trauma';
  type: TraumaType;         // closed engine union
  site: string;             // body.* key (Phase 3)
  severity: number;
  bleeding?: boolean;
  dressed?: boolean;
  // runtime-only ScheduleApi.recurring handle is NOT persisted (re-arm on hydrate)
}
export type ActiveCondition = AfflictionRecord | Trauma;
```

All fields plain-serializable → the collection persists as a plain array/Record, **free hydration**, no marshaller. The runtime schedule handle is **not** a persistent field.

2. **`lib/condition/Trauma.ts`** (or co-locate in `ActiveCondition.ts`) — the closed union + the behavior table skeleton, the `lib/quantity.ts` substrate-module precedent (value + static tables in one module, no Api/registry):

```ts
export type TraumaType =
  | 'laceration' | 'fracture' | 'contusion' | 'avulsion' | 'burn'; // closed v1 set

export interface ProgressionSpec {
  intervalMs: number;       // targets ScheduleApi.recurring(intervalMs, fn, opts?)
  // stages/cadence shape; no live scheduler is created this build
}
export interface TraumaBehavior {
  onset(host: Vitals, t: Trauma): void;
  tick(host: Vitals, t: Trauma): void;
  resolve(host: Vitals, t: Trauma): void;   // 'by: Treatment' deferred — omit param
  describe(t: Trauma): string;
}
/** Skeleton + a no-op/identity exemplar entry. NOT live per-type behavior. */
export const TRAUMA_BEHAVIOR: Record<TraumaType, TraumaBehavior> = {
  laceration: NOOP_BEHAVIOR,   // exemplar identity entry
  fracture:   NOOP_BEHAVIOR,
  contusion:  NOOP_BEHAVIOR,
  avulsion:   NOOP_BEHAVIOR,
  burn:       NOOP_BEHAVIOR,
};
```

`NOOP_BEHAVIOR` is the identity exemplar (`onset/tick/resolve` no-op, `describe` returns a plain `"${type} of ${site}"` string). **Crucial:** the interface signatures must be authored against `ScheduleApi.recurring` (intervalMs + a zero-arg `fn`), **never** against `ScheduledEmission`'s `{engagement, actor, elapsed}` callback. Add a doc-comment citing the requirements constraint.

3. **`lib/condition/Condition.ts`** — `Condition extends Idea` template (Kind-A behavior home), resolved by `findByTemplatePath` like Materials/Species. Colocate `ConditionTemplate` field shape:

```ts
export interface ConditionTemplate {
  name: string;
  signature: VitalEffect[];       // how it perturbs vital signs (shape only)
  progression: ProgressionSpec;
  resolution: ResolutionSpec;     // shape only
  observableSigns: string[];
  contagion?: ContagionSpec;      // RESERVED, no consumer
}
```

`Condition` carries these as fields/props (mirror Material/Species: scalar fields + `persistentFields`, property-bag for content-defined entries per properties.md). **Zero authored condition content ships** — the class + shape exist; no `/lib/condition/disease/...` seeds.

### Collection surface on `VitalsMixin`

Add to `lib/vitals/Vitals.ts` the `ActiveCondition` collection (collections.md):

```ts
getConditions(): readonly ActiveCondition[];
hasCondition(pred: (c: ActiveCondition) => boolean): boolean;
afflict(condition: ActiveCondition): void;    // add
relieve(condition: ActiveCondition): boolean; // remove (resolution)
```

Storage: `public conditions: ActiveCondition[] = [];` in `persistentFields` (free; both kinds are plain-serializable). `afflict`/`relieve` are pure add/remove this build (no `onset`/`tick` invocation — nothing ticks). The runtime schedule handle a future tick holds is **not persisted** (re-arm on hydrate — documented, not built).

### Band/consciousness feed

Extend `getConditionBand()` to fold the trauma/reserve load seam left in Phase 2 (trauma severity contributes to the band), and `getConsciousness()` to read a head-trauma contribution (trauma with `site` under `body.head`). Coarse v1 — derived, never stored.

### Tests (gate Phase 5)

- `lib/condition/__tests__/Condition.types.test.ts`: the type system compiles; `TRAUMA_BEHAVIOR` has all `TraumaType` keys + the no-op exemplar; `describe` returns prose. Assert no authored condition seeds exist (no `/lib/condition/disease|poison/...`).
- `lib/vitals/__tests__/Vitals.conditions.test.ts`: the `ActiveCondition` collection round-trips for **both** a Kind-A `AfflictionRecord` and a Kind-B `Trauma` (Acceptance 5). `afflict`/`hasCondition`/`relieve` work across both kinds.
- Band feed: a `Trauma` at `body.head` shifts `getConsciousness`; trauma severity shifts `getConditionBand` — with no lifecycle transition.

---

## Phase 6 — Death / consciousness seams (no driver)

**Goal:** the cause-of-death field (already declared in Phase 2's `Vitals` surface — fill it in here), the reliance on the existing `lifecycleState` `dead`/`destroyed` distinction (NOT re-modeled), and the derived `getConsciousness()` (built Phase 2/5). **No driver performs a transition.** (Acceptance criterion 7.) Postmortem-progression seam exists; zero postmortem conditions ship.

### Files to modify

- **`lib/vitals/Vitals.ts`**: `causeOfDeath: string | null = null` field (scalar → free hydration), `getCauseOfDeath()/setCauseOfDeath()`, in `persistentFields`. Doc-comment: stamped at transition by the *future* driver; this build only provides the field. Add the **postmortem-progression seam** as a documented no-op (e.g. a `getPostmortemProgressions(): readonly never[]` returning `[]`, or simply a doc-comment seam — keep it minimal; the requirement is "the seam exists," not a populated reader).
- **Do not** add any watcher, any `recurring` call, any `alive→dead` logic, any `StuffApi.destruct` route. Rely on `SpeciesApi.isAnimate` + `requiresAnimate` (already present). Vitals/reserves are body-state; corpses are bodies with full state and reduced agency — no special-casing.

### Tests (gate Phase 6)

- `lib/vitals/__tests__/Vitals.death-seam.test.ts`:
  - `causeOfDeath` persists + re-hydrates.
  - Set a vital below floor → `getConditionBand`/`getConsciousness` **reading** reflects it; assert `getLifecycleState()` is **unchanged** (no autonomous transition — Acceptance 7).
  - Set `lifecycleState='dead'` (author/debug) → `getConsciousness()==='dead'`, vitals still readable on the corpse (body-state persists), `SpeciesApi.isAnimate` false (existing gate, not re-modeled).

---

## Phase 7 — Documentation

**Goal:** the two new subsystem docs are the source of truth; cross-reference notes land in the adjacent docs. (Acceptance criterion: docs.)

### New docs

1. **`docs/subsystems/vitals.md`** — the `VitalsMixin` surface; the vital-sign set + units + `vitalProfile`/universe-default; the anatomy+tissue model (`BodyPart` on `BodyPlan`, instance-delta resolution, `getParts/getPart/getInjuredParts`, `body.*` key convention, part→slot/vital couplings, the declared-but-empty graph seam); the condition two-kind type system (`ActiveCondition`, Kind-A `Condition` Idea + `ConditionTemplate`, Kind-B `Trauma` + closed `TraumaType` + `TRAUMA_BEHAVIOR` skeleton); the death/consciousness seams (cause-of-death field, the lifecycle distinction relied upon, postmortem seam); the derived readings (`getConditionBand`/`getConsciousness`, computed-never-stored). State explicitly what is **deferred** (drivers, ticks, content, instruments, verbs, the physical-attribute readings, the anatomy graph, part-promotion). **Forward-compat note to author:** call out the producer seam for a future combat / *mechanism-of-injury* system — `afflict()` is the door an insult comes through; the future `inflict(target, …)` builds a `Trauma` (mechanism + `site` + energy → outcome) and calls it. `TraumaType` is a closed-but-extensible union (grow it additively: `puncture`/`abrasion`/`electrical-injury`/`blast`), and the body's per-part tissue Materials are where a future `Material.resistance` response reads from. None of that ships here; the point is the seam is labeled so combat plugs in without reshaping the substrate. ("Damage type" is explicitly *not* the model — mechanism-of-injury meets body material; see capability-magic-slate's channels-not-nouns decomposition for the magic-side mirror.)

2. **`docs/subsystems/reserve.md`** — the `lib/reserve/` substrate; `Reserve` value shape + decomposed persistence; `ReservedMixin` surface; the three biological instances; the floor-effect→band feed; the authored-thematic seam (content names ride on `theme`/`key`; "mana" is never an engine word). Defer the drain/replenish producers.

### Cross-reference notes to add (small edits)

- **`docs/architecture.md`**: the entity hierarchy now reads `Agent → Creature → Character → Avatar` — `Creature` is the body layer (organism + vitals + reserves + anatomy), `Character` the agency layer. Document the split + its "body-state not agent-state" rationale.
- **`docs/subsystems/race.md`**: the deferred death-transition + tissue-authoring notes now point here (the driver is deferred to a follow-up; the substrate ships here). `OrganismMixin` now composes at the `Creature` layer.
- **`docs/subsystems/lifecycle.md`**: death ≠ destruction — corpse is the live Stuff with `lifecycleState:'dead'`; never route through `StuffApi.destruct`.
- **`docs/subsystems/activity.md`**: a non-engagement cadence consumer exists (conditions will use `ScheduleApi.recurring`, not `ScheduledEmission`) when progression lands.
- **`docs/subsystems/quantities.md`**: the new `bpm`/`mmHg`/`L` units + converters + tag scales (`bpm` pulse/respiration scales).
- **`docs/slates/deferred-rpg/capability-magic-slate.md`**: a note that mana rides the `Reserve` substrate (content theme, not engine word). *(Already added during requirements — confirm it's present.)*

---

## Cross-file invariants & easy-to-miss wiring (checklist)

- [ ] **`Mixins` registry** (`lib/mixin.ts`) gains `Vitals: 'VitalsMixin'` and `Reserved: 'ReservedMixin'`. Without this, `MixinApi.hasMixin`/slot `accepts` validation and `queryMixins` field-collection silently miss the mixins.
- [ ] **`quantity-tags.schema.json` regex** extended with `bpm|mmHg|L` — or boot's `loadTagTables` throws.
- [ ] Every new **first-class `Quantity` field** appears in BOTH `persistentFields` AND `static fieldMarshallers` (`QuantityMarshaller.pathFor(unit)`); the **invariant lives on the setter**, not a post-hydrate normalize.
- [ ] Every new **plain-Record/array field** (`bodyPartDeltas`, `reserves`, `conditions`, `causeOfDeath`, `vitalProfile`, `bodyParts`) appears in `persistentFields` and holds only plain-serializable values (decompose any embedded `Quantity` into scalars — the Reserve decision).
- [ ] **No marshaller is created for a Map/array of value-objects** — decompose to scalars instead (the marshaller layer is per-field, not per-element).
- [ ] **`VitalsMixin` composes outside `OrganismMixin`** on `Creature` so `getSpecies()` resolves; the "always composed with Organism" rule is a **runtime guard**, not a comment (structurally satisfied on Creature, kept as a backstop).
- [ ] **Derived readings never get a backing field** — `getConditionBand`/`getConsciousness` compute every call (grep the diff to ensure no `this.conditionBand =` slipped in).
- [ ] **No `StuffApi.destruct` reference** anywhere in `lib/vitals/` or `lib/condition/`.
- [ ] **No `ScheduledEmission` import** in `lib/condition/` — only `ScheduleApi.recurring` shapes; no live `recurring()` call is made this build.
- [ ] **No new Api class** (`VitalsApi`/`BodyPartApi`/`ReserveApi`/`ConditionApi`) and **no registry** — resist all four.
- [ ] **Tissue seeds** (`muscle`, `bone`) referenced by body-plan `bodyParts.tissues[].tissuePath` actually exist as seeds (path match).
- [ ] **Mixin docstrings** state what each mixin is NOT for.
- [ ] **Composition target**: `VitalsMixin`/`ReservedMixin` land on **`Creature`** (→ `Character` → `Avatar`). The lily/tutor-bot are non-animate species with no Stuff class — they never become Creatures. A future frog/NPC is a `Creature` (or extends it).
- [ ] **Phase 1.5 is behavior-preserving**: the full pre-existing suite must pass after the body/agency split, before any vitals code lands. Composition order is the risk — preserve every documented constraint.

---

## Genuinely uncertain / hard-as-written — resolved with the user before build

1. **`Creature` class is the composition home (resolved).** The body/agency split (Phase 1.5) gives `VitalsMixin`/`ReservedMixin` a real host — `Creature`, concrete, between `Agent` and `Character`. Tests no longer need ad-hoc fixtures: instantiate a bare `Creature` for the non-agent-organism cases (the frog, a corpse), and `Avatar` for full agency. There is still no *named* NPC class (e.g. a concrete bullfrog) — that remains out of scope (content/agent territory); the bullfrog's `vitalProfile` seed is authored, and a future frog NPC just extends `Creature`.

2. **Part→slot coupling enforcement point.** Keep it **coarse**: expose `isSlotDisabledByAnatomy` on `VitalsMixin` and add a minimal consult at the slot layer; if that consult entangles the slot subsystem more than "coarse enforcement is fine" intends, fall back to asserting the predicate directly in tests + a thin `canOccupy` gate. Do not deeply refactor the slot subsystem.

3. **`VitalSign` import direction (cycle risk).** Key `VitalProfile` by literal field names; type `BodyPlan.governsVital` defensively (`string` + runtime validation against a `VITAL_SIGNS` value tuple imported value-only). Verify at build that the value-only import doesn't reintroduce a cycle; if it does, drop to `string` + a passed-in validation list. Canonical `VITAL_SIGNS`/`VitalSign` lives in the lowest-level leaf module, re-exported by `Vitals.ts`.

4. **Reserve seeding trigger.** Lazy-init biological reserves on first `getReserves` (composition-target-agnostic, HMR-safe) unless a shared construction hook is cleaner; keep `BIOLOGICAL_RESERVE_KEYS` a substrate constant.

5. **`L` tag table semantics.** Ship a minimal `L` `default` table only so the unit round-trips; the clinical band logic lives in `vitalProfile` (per-species), not the tag table. (Unit table = coarse prose; band logic = profile.)

---

## Critical files for implementation

- `packages/server/src/mud/lib/quantity.ts`
- `packages/server/src/mud/lib/species/Species.ts`
- `packages/server/src/mud/lib/species/BodyPlan.ts`
- `packages/server/src/mud/lib/character/Character.ts`
- `packages/server/src/mud/lib/mixin.ts`

New files: `lib/vitals/Vitals.ts`, `lib/reserve/Reserve.ts`, `lib/reserve/Reserved.ts`, `lib/condition/ActiveCondition.ts`, `lib/condition/Trauma.ts`, `lib/condition/Condition.ts`; seeds `seeds/lib/material/tissue/{muscle,bone}.yaml`, plus `vitalProfile`/`bodyParts` edits to existing species + body-plan seeds; `config/quantity-tags.{yaml,schema.json}`; docs `docs/subsystems/{vitals,reserve}.md`.
