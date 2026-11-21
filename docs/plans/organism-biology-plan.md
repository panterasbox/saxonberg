# Organism biology — implementation plan

Executes [organism-biology-requirements](../requirements/organism-biology-requirements.md)
(seeding slate: [organism-biology-slate](../slates/engine/organism-biology-slate.md), whose
§ *Reuse ledger for the plan* is the input to § New substrate below).
**Kind:** feature. **Lead end:** kernel, with first consumers in `species-and-names`,
`trade-ranching`, `trade-fishing`, `trade-sericulture`, `trade-apiculture`,
`trade-cooking` and `trade-tanning`.

A body plan becomes a composition of module documents that expands into the
same flat part list the engine reads today. One derived value, the **`Body`**,
is the body of *this* individual (species adjustments, sex, stage, castration
applied), and every anatomy reader moves onto it. Parts gain a third role
(`produces`), a third combination rule (max), an integument, sense organs, a
fill, and states (regrowing, sealed). Lists on the side retire: `sensoryPorts`,
`locomotionModes`, `breathing` / `breathingByStage`, `Species.production[]`,
`Species.butcheryYield[]`.

## ⚠ Requirements conflicts found by grounding

Scope is not reopened here. Each item is a place the requirements doc states
something the code does not support as written, with the reading this plan
builds. **The owner should confirm 1, 3 and 5 before `/build`.**

1. **Drive step 16 (restart) cannot hold as written for three of its seven
   reads.** Wild animals are `cast:` and are re-minted fresh at boot
   (`Beast` composes no `PersistableMixin`; `Persistable.reseedCast`). A
   `Corpse` is not durable (`platform/thing/Corpse.ts:185`). A loose thing in
   a staged place is lost. So *"the frog, still a frog"* and *"the severed
   foreleg, still lying where it was"* are false for the Hollow Mere frog and
   the treeline wolf. This plan does **not** make wild animals persistent
   (that would be a class persisting everything it hosts, review question P6).
   Instead (D15): the drive's metamorph is a **named kept tadpole** (a
   `KeptAnimal`, which persists once named), and the severed foreleg is read
   back **from a persistent place or the player's hands** (Hearts Delight's
   `PersistentHall`, or carried). The wild frog after a restart is whatever
   its row's age says.
2. **"The bee and the silkworm name no plan"** is wrong in detail: both (and
   the delve cricket) name `sessile`. No scope change; they get an `insect`
   plan.
3. **"Acuity has a reader today"** is half true. `VisionModality` reads
   `viewer.getVisionProfile()`, but `PerceptionMixin.getVisionProfile()`
   returns `null` and nothing overrides it, so `Species.visionProfile` has
   never reached live perception. Wiring the eye in (D11) **turns on** the
   dark-sight nine person species have authored since they shipped
   (`bandShift: -1`) and the kobold's `+1`. That is a visible change for
   players.
4. **"The ox register counts it."** Nothing counts oxen anywhere. The ox
   register is a `Herdbook` row (`hearts-delight/.../thing/ox-book.yaml`,
   `femaleFraction: 0`). D8 adds a composition read to the herdbook.
5. **"The same cuts come off as before."** True for the species that list
   named cuts. Three species list *counted* lines instead (wolf, hog, pit
   pony: `stew-meat`, `prime-cut`), and unit counts are hand-authored
   everywhere. D5 keeps the same **rows** per species and derives the
   **counts**; a golden test pins the row sets, and the count differences are
   listed in the wave.
6. **`salt-hide` is a recipe, not a verb** (reached by `cure <hide>`), and
   **there is no stifle verb** (a cocoon is stifled by being held hot). The
   drive script uses the real words.
7. **Lactation has no production cause.** `freshen()` has no caller outside
   tests, and the `event` window reads open always. Birth is a non-goal, so
   D8 seeds lactation at founding and re-enters it at the end of the shipped
   dry period (`restDays`), stated as the stand-in for calving.
8. **The ledger says glands fill "the reserve axis".** This plan keeps the
   store on `ProducingMixin.tapState` (D2) and says why.
9. **"The tutor-bot is a biped with no tissue anatomy."** Its row names
   `biped`, which is flesh and bone. There is no "no tissue" flag. It keeps
   the composed biped and stays valid; it is not made of steel by this build.
10. **The slate asks every new tissue for a dielectric.** No dielectric field
    exists on any material capability and nothing reads charge, so authoring
    one would be an orphan key (`lint:material-kinds` clause b). Left to
    mana-economy as a named seam.

## Grounding

Verified this cycle at `a1bf2b289`. Paths are relative to
`packages/server/src/mud/` unless they start with `packages/` or `docs/`.
Items marked *(survey)* were read by a delegated survey with line numbers and
not re-opened by the planner; the build agent re-opens them before relying on
them.

### The body model

- `platform/idea/species/BodyPlan.ts` (853 lines): `class BodyPlan extends
  SingletonMixin(Idea)`. Authored fields: `slots`, `locomotionModes`,
  `defaultLocomotionMode`, `sensoryPorts`, `bodyParts` (`ref:
  'identity:constituent'`), `baseMass`, `baseStature`, `thermalStrategy`,
  `breathing`, `voice`, `respires`, `lungVolumeL`. `BodyPart` = `key`,
  `parent`, `tissues[{tissuePath, share}]`, `governs?`, `serves?`,
  `severable?`, `innervatedBy?`, `suppliedBy?`. `setBodyParts` validates keys,
  shares in `(0,1]`, `governs` against `VITAL_SIGNS ∪ BODY_CAPACITIES`,
  `serves` against `BODY_CAPACITIES`, parents, and slot references.
  `isInterior`, `getPartSurfaceFraction` (Meeh's law), `interiorChildrenOf`,
  `getSlotsAt`, `getSlotsCovering`, `getModalitiesIn(medium)` live here.
- Nine plan rows: `packages/content/species-and-names/content/stuff/idea/species/BodyPlan/`
  (`avian`, `biped`, `canid`, `fowl`, `quadruped`, `sessile`, `swine`) and
  `packages/content/trade-fishing/content/stuff/idea/species/BodyPlan/`
  (`crustacean`, `fish`). `swine` `extends:` quadruped and **re-authors the
  whole `bodyParts` array** (row inheritance replaces arrays unless the field
  declares `inherit: by-entry`, `docs/subsystems/templates.md`). The crab's
  carapace is `tissue/bone`. No plan has a skin, an eye, an ear or a kidney.
  `thermalStrategy` is authored by **no row**, so every body, the frog and
  the fish included, is an endotherm today *(survey)*.
- `platform/idea/species/Species.ts` (1947 lines): `production: TapSpec[]`
  (`:769`, getter `:1580`), `butcheryYield` (`:936`), `breathingByStage`
  (`:960`), `breathingFor(stage)` (`:1395`), `ageCurve`, `massAt` (`:1639`,
  linear from 7 % of adult mass to `matureAt`), `lifeStageAt` (`:1659`,
  `null` without a curve), `resolvedTissues` / `tissueShareOf` /
  `partsCarrying` (`:1229-1270`), `dressOut` (`:1292`), `visionProfile`,
  `olfactoryProfile`, `breeding`, `handlingRange`, `biddability`. `TapSpec`
  (`:445`), `TapWindowSpec` (`:527`), `LIFE_STAGES` (`:618`).
- `lib/species/Organism.ts`: `_speciesPath`, `bornAt`, `diedAt`,
  `lifecycleState`, `sex` (validated by the species' determination system).
  `getLifeStage()` returns `null` for a played body, always (`:350`).
- **36 non-test call sites read `…getBodyPlan()`**: `lib/vitals/Vitals.ts`
  (10), `Species.ts` (5), `lib/respiration/Respiration.ts` (3),
  `platform/idea/api/LocomotionLogic.ts` (2), `ElectricityLogic.ts` (2),
  `lib/slot/Wearable.ts` (2), `BodyPlanSlots.ts` (2), `Attired.ts` (2), and
  one each in `AssessController`, `PerceptionLogic`, `ConditionLogic`,
  `ThermalRegulation`, `Vocal`, `lib/boundary/Exit.ts`, `api/species.ts`,
  `packages/content/trade-tailoring/src/thing/CuttingTool.ts`.
- `lib/vitals/Vitals.ts` (4371 lines): `bodyPartDeltas: Record<string,
  BodyPartDelta>` (`persistent, runtimeState`), `BodyPartDelta = { missing? }`
  (`:222`), `ownFunction` / `conduitFunction` / `upstreamFunction` /
  `functionScalar` (`:2190-2290`), `functionAt` (`:2311`), `capacityScalar`
  (min over `governs` × mean over `serves`, `:2322`), `capacity` (`:2346`),
  `hasMissingVitalGovernor` (`:2420`), `severPart` (`:2659`, marks the
  subtree, releases held things, mints nothing). `MATERIAL_FORK_SLICES =
  ['Vitals','Trauma','CauseOfDeath','Anatomy']` carries wounds and deltas
  onto a corpse *(survey)*.
- `lib/vitals/BodyCapacity.ts`: six capacities, four function bands, and a
  stated rule that the continuous scalar never leaves `VitalsMixin`.
- `platform/idea/Condition.ts`: `Trauma` records `site` (a part key) and
  `mechanism` (the channel). `AVULSION_BEHAVIOR.onset` (`:1226`) is the one
  production caller of `severPart`. `ConditionLogic` has no handling for a
  wound aimed at a missing part.
- `packages/server/scripts/check-anatomy.ts`: clauses (a) shares sum to 1,
  (b) a yielding species names a shipped plan, (c) no `fraction` beside a
  claiming cut, (d/e) claimed tissues resolve and are carried. It reads a
  row's own `bodyParts` and does **not** resolve `extends:` *(survey)*.

### Hosts

- `lib/creature/Creature.ts:165-243` already composes, on every body:
  `ThermalRegulationMixin`, `ThermalMixin`, `RespirationMixin`,
  `MetabolicMixin`, `SoilableMixin` (sites are part keys), `VitalsMixin`,
  `ReservedMixin`, `AttiredMixin`, `BodyPlanSlotsMixin`, `SlottedMixin`,
  `OrganismMixin`. `Agent = WetMixin(TangibleMixin(Stuff))`, so every body
  has one wetness scalar *(survey)*.
- Animal rungs: `platform/agent/Beast` = `BehavedMixin(Actor)` (the wolf, the
  frog); `lib/creature/KeptAnimal` (`PersistableMixin`, pets);
  `platform/agent/DraftAnimal` (on `Beast`, persistable);
  `packages/content/trade-ranching/src/agent/Livestock.ts:124` =
  `ProducingMixin(HandledMixin(HandlingMixin(ChattelMixin(BrandedMixin(Creature)))))`
  (**not** an `Actor`: no `Sensor`, no `Perception`); `WorkingAnimal` =
  `HandledMixin(KeptAnimal)`.
- `platform/thing/Corpse.ts:120`: `Postmortem(Concealable(Contaminable(Container(Thermal(Vitals(Reserved(Attired(BodyPlanSlots(Slotted(Organism(Propertied(Butcherable(Thing)))))))))))))`.
  Own fields `conditionAtDeath`, `takenTissues`, `takenLines`,
  `ofIdentityPath`. Minted by `ConditionLogic.mintCorpseFrom` *(survey)*.

### Yields

- `lib/husbandry/Producing.ts` (1300 lines): `taps()` (`:346`) is the one
  reader of `species.getProduction()`. Persistent `tapState: Record<key,
  TapState>` (`standing`, `lastTaken`, `driedOff`, `worst`, `brooding`,
  `fullSince`) and `productionStamp`. Composers: `Livestock`,
  `trade-apiculture/src/thing/Hive.ts:87` (the hive is an `Organism` whose
  species is the bee), `trade-forestry/src/thing/SapStandard.ts:84`.
  `always` and `event` windows both read open; `freshen()` has no production
  caller.
- `production:` is authored by ten species rows: three trees and hevea
  (`sap`, `gum`, `latex`), the bee (`honey`), cattle and goat (`milk`), sheep
  (`wool`, `milk`), hen (`eggs`); pig and dog author `[]` *(survey)*.
- `lib/craft/Butcherable.ts` (`ButcherableMixin`, host: `Corpse`):
  `butcherPlan` refuses `sentient-corpse` before anything else, then
  `no-yield` on an empty `butcheryYield`. `dress` clones one exemplar per
  yield line, reads each cut's `CutMixin.tissues`, calls `species.dressOut`,
  gates depth on the tools, decides joint or trim on the hand
  (`handFor(difficulty)`), and matches `for <word>` against exemplar
  keywords. `woundedAt` marks a cut damaged when a trauma sits on a part
  carrying its tissues.
- Cut rows: `packages/content/trade-cooking/content/trade/cooking/thing/cut-*.yaml`
  (class `/platform/thing/Cut`, `tissues:` naming
  `/stuff/idea/material/tissue/muscles/*`). `butcheryYield` is authored by 15
  species rows (one of them, the dog, empty on purpose).
- Hides: `packages/content/trade-ranching/content/trade/ranching/thing/hide.yaml`,
  class `/trade/tanning/thing/Hide` =
  `TanningMixin(CraftedMixin(MoistureMixin(FreshnessMixin(ThermalMixin(Good)))))`.
  `Good` composes `IntegrityMixin`, which composes `FlawedMixin`
  (`lib/material/Flawed.ts`), so **a hide already carries a flaw record**.
  `TanningMixin.becomeLeather` (`packages/content/trade-tanning/src/lib/Tanning.ts:368`)
  changes the same object's material in place.
- Rendering: `packages/content/trade-cooking/content/recipes/render-tallow.yaml`.
  Lamp oil exists only as petroleum:
  `packages/content/trade-fuel/content/stuff/idea/material/bulk/lamp-oil.yaml`
  (tags `liquid, lamp-oil, fuel, flammable`). A lamp burns its interior
  bulk by `heatOfCombustion`; the street-lighting `FuelStore` counts casks
  tagged `lamp-oil` *(survey)*.
- Sericulture: `RearingMixin` (`packages/content/trade-sericulture/src/lib/Rearing.ts:208`)
  on `RearingTray`; `Cocoons` reconciles stifle, scorch and emergence off its
  own heat trajectory; `unwind` is the one verb *(survey)*.

### Senses, thermal, armor

- Detection is one pure function,
  `PerceptionLogic.effectivePerceptionImpl(viewer, target, attention)`
  (`platform/idea/api/PerceptionLogic.ts:998`) = `capacityOf(viewer) +
  attention + lightConditionsFor(viewer, target)`, compared with the
  concealment level's requirement (subtle 2, hidden 4, deep 7, buried 11).
  Every path uses it (passive `concealmentAdmits`, `search`, hints, ambush,
  the `wary` brain). There is no per-observer check at a sneaking traverse.
- `sensoryPorts` has two production readers: `walkInnateModalities`
  (`PerceptionLogic.ts:647`, via `getModalitiesIn`) and
  `SpeciesLogic.buildDossier` (the only reader of `position`) *(survey)*.
- The only wound-to-sense coupling is `lib/creature/Actor.ts:95-125` (a
  caustic at the head drops the perceived band) *(survey)*.
- Insulation: `Attired.insulationAt(part)` (`lib/slot/Attired.ts:905`) sums
  worn `getClo()`; `bodyInsulation()` weights by surface share;
  `ThermalRegulation` reads it (`lib/thermal/ThermalRegulation.ts:186, 214,
  380`). `ThermalRegulationMixin`'s only composer is `Creature`, so it runs
  for every animal. Nothing in thermal reads wool. A body's
  `coreTemperature` has no reading channel; the visible outputs are the
  hypothermia and torpor afflictions, the condition band, and self-only
  shiver cues *(survey)*.
- Armor: `ConditionLogic.inflictThroughStack` (`:1247`) folds
  `MaterialApi.attenuate` over `resolveCoveringStack` (`:127`), whose
  `CoveringLayer = { occ, material, construction, grade, condition }`. The
  residual meets `primaryTissueMaterial(part)`, **the first listed tissue**.
  Resist forms are a closed kernel list: `plate`, `mail`, `padded`,
  `quilted`, `hide` *(survey)*.
- Metabolism: `basalDrain` multiplies `thermalMultiplier()` (Q10,
  `lib/metabolism/Metabolic.ts:1990`). No body state with its own rate
  exists *(survey)*.

### Persistence, tools, gates

- There is no row key for staged or live. A row chooses by its class and
  that class's `shouldPersist()`. `cast:` is never captured. A named
  `KeptAnimal` persists; an unnamed one does not. Herd animals persist
  through the herd document's sparse `HeadOverlay`
  (`packages/content/trade-ranching/src/idea/HerdRegistry.ts:214`).
  `bodyPartDeltas` and `conditions` persist exactly when the body has a host
  record (players: yes) *(survey)*.
- Staging: `testharness` (test world only, `requiresTestWorld`, view at
  `packages/content/platform/content/platform/cmd/system/testharness.yaml`),
  with `clock-advance` capped at one day, `afflict`, `species`, `vanish`.
  The wire route `/auth/test-stage` calls `set*` / `add*` methods on a target
  by path or id. **No tool wounds a part, kills into a corpse, sets a body
  state or an age** — the tooling this build owes (D16).
- Documents: `Placement` and `Shape` are the precedent (a value class in
  `lib/`, a `DocumentCatalogue` subclass in `platform/idea/`, rows in a
  pack's `content/<plural>/`, ensured by the host's async setter through a
  domain Api). `DOCUMENT_KINDS` is a closed kernel const on master
  (`lib/document/DocumentKinds.ts:110`); the sibling `build/naming-overhaul`
  (build-3) replaces it with per-pack `content/kinds/*.yaml` *(survey)*.
- Materials: a new tissue under an existing kind is one row. Kinds in
  `platform/idea/material/` include `Hide`, `HideHorn`, `Horn`, `Fat`,
  `FatOilWax`, `Flesh`, `Muscle`, `Stone`, `Oil`. `lint:material-kinds`
  holds orphan keys at 0 and data gaps at a ceiling of 5950 *(survey)*.
- Gates with ceilings this build can trip: `lint:data-ideas` (13),
  `lint:mixin-clusters` (42, a global count), `lint:lib-statics`,
  `lint:unconsumed-seams` (an authored field on a data Idea needs a reader
  **outside its own file**), `lint:material-kinds`, `lint:closed-vocabularies`,
  `lint:census`.
- Sibling seam: `build/naming-overhaul` touches `SpeciesLogic.ts`
  (`resolveNamePools`, imports), `lib/species/NameBank.ts`,
  `lib/vitals/Vitals.ts` (`treatNamed`), `lib/mixin.ts` and `api/mixin.ts`
  (two new mixin names) *(survey)*.

### Could not ground

- How `ref: 'identity:constituent'` on `bodyParts` loads tissue materials
  when the list is **derived** from modules rather than authored (W1 reads
  `docs/subsystems/templates.md` and the applier before choosing between a
  constituent declaration on the derived field and an explicit `ensure`).
- Whether a lamp accepts any combustible liquid or only one tagged
  `lamp-oil` (`platform/thing/Lamp.ts:172`), which decides the whale-oil
  row's tags.
- Whether a drafted `Livestock` standing in a place survives a restart or is
  re-minted from `HerdRecord.drafted`.
- `Creature.getMass` (`lib/creature/Creature.ts:893-960`) seeds its frame
  once; the exact write site D8 changes was not read line by line.
- The exact count of 91 species rows (the planner counted 87 naming
  `class: /platform/idea/species/Species` plus rows under other spellings).

## ⭐⭐ New substrate

Every item cites its ledger row. Each was checked against P9–P14 (P9:
predictable from the def and help · P10: metadata is a document · P11: no
caller branches on the destination · P12: no synonym · P13: fits the host's
header sentence · P14: nothing moves or decides invisibly).

| # | item | ledger row | P9–P14 |
|---|---|---|---|
| S1 | **`body-module` document kind** + value class `lib/species/BodyModule.ts` + `platform/idea/BodyModuleCatalogue.ts`, reached by `SpeciesApi.modules()` | *module composition* — generalize | P9 n/a (no command). P10 yes, a document, not an Idea. P11 none. P12 new concept. P13 n/a. P14 expansion is pure and deterministic. |
| S2 | **`lib/species/BodyComposition.ts`** — the import-pure expander (modules + adjustments → flat parts, shares renormalized) | *module composition* | P9 n/a. P10 n/a (arithmetic). P11 none. P12 none. P13 one concept. P14 pure. Instance methods only (`lint:lib-statics`). |
| S3 | **`lib/species/Body.ts`** — the value object every anatomy reader asks: parts, interior test, surface shares, slots-at, producers, sense organs, breathing, gaits, integument, fill | *governs / serves*, *breathing from organs*, *locomotion* — generalize | P9 n/a. P10 n/a (derived, never authored). P11 none. P12 **replaces** `BodyPlan`'s anatomy getters, which are deleted in the same wave. P13 one concept: *the body of one individual*. P14 pure. |
| S4 | `OrganismMixin.getBody()` | *sex, age* — reuse | P9 n/a. P11 none. P12 replaces `getSpecies()?.getBodyPlan()` at 36 sites. P13 the header is runtime biology of one organism. P14 a read. |
| S5 | `BodyPart` fields `produces`, `sustains`, `senses`, `breathes`, `gait`, `integument`, `fill`, `regrows` | *produces*, *sense organs*, *breathing*, *integument*, *module fill*, *part states* | P9 n/a. P10 fields on module documents. P11 none. P12 `sustains` is the third rule, not a synonym of `serves`. P13 all are facts about a part. P14 none act. |
| S6 | Three capacities: `vision`, `hearing`, `filtration` (+ `smell` read by `Olfactory`) in `BODY_CAPACITIES` | *governs / serves* — reuse; *sense organs* | P9 shown by `assess`. P10 a closed kernel tuple, as shipped. P12 none exist. P13 fits *what a body can still do*. |
| S7 | `BodyPartDelta` gains `lostAtAgeDays`, `sealed` | *part states* — generalize the delta | P9 n/a. P13 the delta is *what differs on this instance*. P14 regrowth happens at the body's own reconcile and `look` words it. |
| S8 | `ConditionApi.sever(body, partKey, cause)` → `ConditionLogic` (sever, mint, place) and `Corpse.subtree` | *severed part* — generalize the corpse | P9 n/a. P11 none: the one sever entry for every caller. P12 replaces direct `severPart` calls; `severPart` becomes its participant-gated half. P13 `Corpse` is *a body without agency*; a part of one is the same thing. P14 the part lands in the body's own place by `ContainmentApi.move`, and the room is told. **No new class.** |
| S9 | `TissueMixin.comesOffAs` (a tissue material names the rows it leaves a carcass as) | *cut maps* — generalize | P9 n/a. P10 a field on existing material rows. P11 none. P12 replaces `Species.butcheryYield`, deleted. P13 the header is *it came from a living thing*. |
| S10 | Flaw kinds `pierced`, `slashed`, `scorched`, `nicked` and `Flaw.site` on `FlawedMixin` | *integument as pelt* — generalize hide → pelt | P9 `look` words them. P12 `holed` stays the hull's. P13 the header is *the flaws a body carries*. **No new mixin.** |
| S11 | **`BodyStateMixin`** (`lib/species/BodyState.ts`, kernel, in `Mixins`) + **`body-state` document kind** + `platform/idea/BodyStateCatalogue.ts`, reached by `SpeciesApi.bodyStates()` | *body states* — **genuinely new** (ledger: searched metabolism.md, thermal.md, vitals.md; planner also grepped `dormant`, `torpor`, `hibernat`, `sleep` — only the thermal torpor affliction and magic suppression) | P9 `look` says the state; `help` for `milk` names it. P10 the state is a document. P11 none. P12 thermal torpor stays an affliction (a consequence); a state is a mode with a rate. P13 own mixin, one concept. P14 derived states are computed on read; event states change only by a named act. |
| S12 | `Species.variants` (sex, neutered, stage deltas), `Species.development` (plan and name per stage), `Species.states`, `Species.pays` | *sex, age*, *metamorphosis*, *square-cube check* | P9 n/a. P10 fields on existing rows. P13 species facts. Each has a reader outside `Species.ts` in the wave that adds it (`lint:unconsumed-seams`). |
| S13 | `castrate` verb (view + controller in `trade-ranching`), `HeadOverlay.castratedAt`, `Herdbook.neuteredFraction` | *reproductive states, castration* | P9 one view, one word, no options; `help` says what it does and when it refuses. P11 none. P12 new act. P14 the animal decides (`castratePlan`). |
| S14 | `Silkworm` (class in `trade-sericulture/src/agent/`) and `LarvalClock` (value object in its `lib/`, extracted from `RearingMixin`) | *metamorphosis* — the tray becomes the compression (ranching D19) | P9 `put`/`get` on a tray, as today. P12 none. P13 one clock, two holders. P14 see D10: the tray never mints silently — the exemplar is content you can see. |
| S15 | `lint:scaling` (`packages/server/scripts/check-scaling.ts`) | *square-cube check* — **genuinely new** gate (`lint:anatomy` is structural only) | n/a for P9–P14 beyond P3: it never refuses a creature, it fails a row over a limit with no `pays`. |
| S16 | `testharness body` and `testharness carcass` subcommands | staging tooling this build owes | P9 test-world only; `help testharness` documents both. P12 `afflict` stays condition-level; `body` is part-level. No `isWizard` check (`requiresTestWorld`). |

Explicitly **not** new: no Api (two statics on `SpeciesApi`, one on
`ConditionApi`), no logic singleton, no collection, no hook, no registry, no
pelt class, no severed-part class, no integument mixin.

P1's second half — *is the specific one gone?* — per generalization:
`BodyPlan.bodyParts` as an authored field, `sensoryPorts`, `locomotionModes`,
`breathing`, `Species.breathingByStage`, `Species.production`,
`Species.butcheryYield`, the `sex` and `window: event` halves of `TapSpec`,
and `BodyPlan`'s anatomy getters are each **deleted in the wave that
replaces them**, with every row re-authored in that wave.

## Plan-level decisions

### D1. Modules are documents; a plan is a list of them; keys do not change

A **module** is a `body-module` document at `<root>/modules/<name>`
(`packages/content/species-and-names/content/modules/`, and a pack's own for
its own shapes). It holds a subtree of parts with **relative** keys, tissue
**weights** (any positive numbers), roles, an integument and a fill.

A `BodyPlan` row authors `modules:` instead of `bodyParts:`:

```yaml
modules:
  - { module: /stuff/modules/torso-mammal,   as: [body.torso] }
  - { module: /stuff/modules/head-mammal,    as: [body.head],  at: body.torso }
  - { module: /stuff/modules/limb-fore,      as: [body.leg.frontLeft, body.leg.frontRight],
      at: body.torso, innervatedBy: [body.torso.spine.lower], weight: 0.136 }
```

- `as` is the absolute key of each instance's root part; its length is the
  count. A module's inner parts hang under it (`<as>.hand`). ⭐ **Expansion
  therefore reproduces today's keys exactly**, which is what keeps slots
  (`covers: [body.head]`), stored trauma `site`s, stored `bodyPartDeltas`
  and tests valid with no migration.
- `weight` is the module's share of the body relative to the others; default
  is the module's own. Shares are `moduleWeight / Σ weights × tissueWeight /
  Σ module tissue weights`, so **the sum is 1 by construction**.
- A species adjusts through `Species.variants` and a top-level `body:` block
  (`scale: { <as key>: factor }`, `add: [module entries]`, `integument:
  { <as key>: … }`). Scaling renormalizes.
- `BodyPlan.setModules` is async, ensures each document through
  `SpeciesApi.modules()` (the `Shaped.setShape` shape), expands with
  `BodyComposition`, and hands the result to the existing `setBodyParts`
  validation. `bodyParts` stops being authored; `lint:anatomy` refuses the
  key on a row.
- ⭐ **`lint:anatomy` stays meaningful**: it imports `BodyComposition` (import
  pure) and checks the **expanded** plan of every species variant: (a) sum
  to 1 survives as a regression check on the expander; new clauses — every
  module path resolves; every exterior part has an integument that resolves
  to a material row; every `comesOffAs` row resolves; every `produces`
  yield resolves; every `development` plan resolves; no two instances share
  a key.
- The nine plans are re-expressed in W1 with **identical keys and identical
  shares** (a golden test captured in W0 compares them to 1e-6). New tissues
  arrive in later waves, each taking its share from `flesh`, never from a
  named muscle.
- `swine` stops re-authoring the quadruped list: it becomes the quadruped's
  modules with a `torso-swine` module and scaled limbs.
- `sessile` stays an empty plan for the 41 plants. Bee, silkworm and cricket
  move to an `insect` plan.

*Why documents:* a module is metadata nothing writes, read by path (P10); a
`SingletonMixin(Idea)` with rows would raise `lint:data-ideas`.

### D2. `produces`: the gland is a part, the store stays on the tap host

A part may author `produces:` — a `TapSpec` minus `sex` (the gland exists
only on the sex whose delta adds it) and with `activeIn?: <state key>`.
`Body.producers()` returns them; `ProducingMixin.taps()` reads
`organism.getBody()?.producers()` instead of `species.getProduction()`.
`Species.production`, its accessors and the `sex` field retire.

- The tap key is unchanged, so `tapState` restores by key with no migration.
- ⭐ **The store stays `ProducingMixin.tapState`**, not a `Reserve`. A
  `Reserve` holds capacity, current, theme and a floor effect; a tap also
  holds `driedOff`, `brooding`, `fullSince` and `worst`, which is the
  feedback law's whole state. Moving `standing` alone would leave two
  records per gland, and `Hive` is not a `Creature`. This departs from the
  ledger's wording (conflict 8).
- **Windows are untouched** (`TapWindowSpec` moves with the spec). `event`
  retires in favor of `activeIn: lactating` (D8).
- **The feedback law becomes a fact about the organ**: `behaviour`,
  `windowDays`, `broodAfterDays`, `restDays` are authored on the gland part.
- **Wounding a gland stops it**: the fill is multiplied by the part's
  function band (`full` 1 · `impaired` 0.5 · `failing` and `lost` 0), read
  through `functionAt` when the host is `Vitals`. A hive and a tree have no
  wounds and fill at 1.
- Where each gland sits: the udder (a female-delta module on cattle, goat,
  sheep); the oviduct (hen, female delta); the fleece (the sheep's torso
  coat, D3); the sap, gum and latex on a `sapwood` part the tree species
  adds to `sessile` (tissue-less, so the plan stays weightless and exempt
  from clause a); honey on the bee's `crop` (the hive is the colony-organism
  and reads its species' body, exactly as it reads `production[]` today).

### D3. The integument: one block on the part, four readers

```yaml
integument:
  skin:  { material: /stuff/idea/material/organic/rawhide, weight: 7, form: hide }
  coat:  { material: /stuff/idea/material/tissue/fur, depthM: 0.03, loft: 0.9,
           cycle: { daylightFrom: 0, daylightTo: 0.45, thick: 1.6 } }
  under: { material: /stuff/idea/material/textile/down, depthM: 0.01, loft: 0.97 }
```

A module authors a default; a part or a species overrides. `skin` is a
tissue (it has a weight and is in the sum); `coat` and `under` are optional.

1. **Armor.** `resolveCoveringStack` appends one innermost layer from
   `body.integumentAt(site)` when the skin authors a `form`
   (`CoveringLayer.occ` becomes nullable). Bare skin authors **no form**, so
   persons' combat numbers do not move; a hide is `hide`, a carapace and a
   shell are `plate`. `primaryTissueMaterial` keeps reading the first
   **non-integument** tissue, in authored order.
2. **Face.** Nothing new. `SoilableMixin` is already on every body with part
   keys as sites, and `Attired.outermostAt` already decides glove or skin.
   The bare-skin wording reads the integument's material. `Faced` is **not**
   composed on creatures (tattoos are a non-goal).
3. **Pelt.** D5.
4. **Insulation.** `Attired.insulationAt(part)` adds the coat's clo by the
   garment's own law (`thickness / k_eff / R_CLO`, `k_void` through
   `material.wetProperty` with the **body's** wetness). The coat's depth is
   `depthM × cycle factor × standing fraction`, where the standing fraction
   is `standingIn(key) / capUnits` when the coat is also a producer (the
   fleece) and 1 otherwise. Skin alone contributes nothing, so persons are
   unchanged. `ThermalRegulation` needs no edit: it already reads
   `bodyInsulation()`, and it already runs for every animal.

   *What makes "the shorn sheep reads colder" observable:* shearing empties
   the fleece's standing, the coat term falls, the low band narrows, and
   core temperature drifts. The drive reads `coreTemperature` through the
   harness (the step is `staged`), and a player sees the third-person shiver
   line this build adds to `look` (the self-only cue at
   `ThermalRegulation.ts:984` gains a `markupAugmenter` twin).

### D4. Tissue materials are rows under existing kinds

No new kind class. New rows in
`packages/content/base-library/content/stuff/idea/material/tissue/`:

| row | kind | used as |
|---|---|---|
| `keratin` | `Horn` | hoof, claw, beak |
| `chitin` | `HideHorn` | the crab's carapace and claws; the insect cuticle |
| `cartilage` | `HideHorn` | ears, the fish's skeleton (sturgeon) |
| `dentine`, `enamel`, `ivory` | `HideHorn` | teeth, tusk |
| `fur`, `feather`, `scale` | `HideHorn` | coats |
| `skin` | `Hide` | a person's and a frog's skin |
| `shell` | `Stone` (eggshell's kind) | a shell |
| `kidney`, `eye`, `udder`, `gonad`, `swim-bladder` | `Flesh` | named organ tissues, so each can name what it comes off as |

Pack rows: `blubber` (`Fat`), `spermaceti` (`FatOilWax`), `whale-oil` (the
kind and tags of `lamp-oil`) in `trade-fishing`; `silk-gland` in
`trade-sericulture`. Every row authors every field its kind's capabilities
expect, so the data-gap ceiling does not rise.

**The crab:** its `bone` becomes `chitin` and its torso gains a `plate`
carapace integument. `look` words the shell from the integument's material.

### D5. Cut maps derive from tissues; `butcheryYield` retires

**The reference points forward.** A tissue material names what it leaves a
carcass as: `TissueMixin.comesOffAs: string[]` (`ref: identity:relation`, not
a constituent — the butcher ensures the rows at the act). `muscles/shank`
names `cut-shank`; `muscles/loin` names `cut-loin` and `cut-chop`; generic
`muscle` names `stew-meat`; `bone` names the bone row; `rawhide` names the
hide row; `feather` and `down` name theirs; `blubber` and `spermaceti` name
theirs. A reverse search over cut rows would be the P7 defect.

`Butcherable.dress` then:

1. collects the tissues of the body's **present** parts
   (`body.getParts()` minus `bodyPartDeltas.missing`, and only the corpse's
   `subtree` when it has one);
2. gathers their `comesOffAs` rows in body order, de-duplicated;
3. clones one exemplar per row and reads its claims as today (a `Cut` claims
   tissues; any other row claims the tissue that named it);
4. derives mass as today (`Σ claimed shares × mass × finish`);
5. derives **units**: the number of present parts carrying the claim, raised
   to `round(kg / portionKg)` when the row authors `portionKg` (a new field
   on `CutMixin`, authored on the cut rows so a cow's counts match today's).

`Species.dressOut` keeps the arithmetic and loses the list parameter;
`Species.butcheryYield`, `ButcheryYield`, `no-yield`'s list test (it becomes
*no row came off*) and `lint:anatomy` clauses (b), (c) retire.
`conditioned: false` becomes a property of the tissue's kind (skin and bone
do not scale with condition). `maxAgeDays` (the vell) becomes a stage delta:
the calf's abomasum is a part of the `newborn` variant only (D8).

**The pelt** is the line whose claim is the integument. `butcher <carcass>
for pelt` works through the existing `for <word>` match (the hide, feathers,
scales and carapace rows carry `pelt` as a keyword beside their own word, so
`for feathers` works too). One pelt comes off, with:

- a flaw per wound: every trauma on an exterior part whose mechanism is
  `edge`, `point`, `heat` or `corrosion` becomes `slashed`, `pierced` or
  `scorched` with `site` = the part;
- **the skinner's hand**: skinning is one more line with a difficulty
  (`standard`); a hand below `handFor(difficulty)` adds one `nicked` flaw per
  missing band, on the largest parts first — derived, never rolled;
- **pelt before cuts**: a cut taken from a part whose integument is still on
  adds a `slashed` flaw there when the pelt is later taken. A bare
  `butcher <carcass>` takes the pelt first.
- the coat's depth at death (D7's cycle, read at `diedAtGameSec`) stamped as
  the pelt's grade, so the winter pelt is the better pelt.

Tanning needs no change to keep the flaw: `becomeLeather` mutates the same
object, and `Flawed` rides on `Good`. `look` words flaws through `Flawed`'s
existing augmenter, extended for `site`.

**Glands** are organ parts with their own tissue, so they come off as named
rows by the same rule. **Blubber** renders through a new recipe row
`packages/content/trade-fishing/content/recipes/render-blubber.yaml`
(`render-tallow`'s shape) into `whale-oil`. Lamp oil is an existing material;
`whale-oil` is a second row carrying the same tags, so lamps and the fuel
store take it with no code.

**Persons** are unaffected: `butcherPlan` refuses a sentient corpse before
any yield is computed, as today.

### D6. The redundant rule: `sustains`, and kidneys

`BodyPart.sustains?: string[]` — any surviving one suffices. `capacityScalar`
becomes `min(governs) × mean(serves) × max(sustains)` (each term 1 when no
part claims it). The consumer is a new capacity, **`filtration`**, sustained
by two kidneys added to the mammal, fowl and fish torso modules. Losing one
leaves `filtration` full; losing both begins dying through the existing
anatomy death floor (`VITAL_GOVERNED_CAPACITIES` generalizes to *every
governor or every sustainer missing*). `assess` shows it, as it shows
`clearance`.

### D7. Parts that change

- **The delta.** `BodyPartDelta = { missing?, lostAtAgeDays?, sealed? }`.
  `lostAtAgeDays` is the body's age at the loss (an age, not a clock time,
  so a staged age advance crosses a moult honestly). `sealed` is `'heat'` or
  `'corrosion'`.
- **Sealing.** A part is sealed when the wound that took it was heat or
  corrosion, or when a later `burn` or `caustic` trauma is aimed at a
  missing part: `VitalsMixin.afflict` stamps `sealed` on that stump and
  re-sites the trauma to the nearest present ancestor. Today that wound
  lands on a part the body does not have, silently (P3).
- **Regrowing.** A part authors `regrows: moult` (or `{ days: n }`); a
  species authors `moultEveryDays`. At `VitalsMixin.reconcileConditions` a
  missing, unsealed subtree root whose loss predates the latest moult
  boundary (`floor(age / moultEveryDays)`) is restored. The harm doc's
  sentence *a severed limb is an absence* retires.
- **Cycling.** A coat's `cycle` is a daylength band (the `TapWindowSpec`
  photoperiod shape) and a thickness factor, **derived on read** at the
  body's place. No per-instance state, nothing to persist.
- **The severed part is a `Corpse` with a `subtree`.** `ConditionApi.sever`
  marks the subtree missing (the existing `severPart`, now gated to
  `ConditionLogic` by a participant contract), mints `/stuff/thing/Corpse`
  through the existing `mintCorpseFrom` path with `subtree: <root key>`,
  forks the Trauma slice filtered to that subtree, sets its mass to the
  subtree's share, and moves it to the body's place with
  `ContainmentApi.move`. `AVULSION_BEHAVIOR.onset` stops calling `severPart`
  itself; `ConditionLogic.inflict` calls `sever` after `afflict` accepts the
  wound (the ordering rule the avulsion comment already states). It is
  carried, butchered (D5 reads `subtree`) and spoils (`PostmortemMixin`) with
  no further code. Its `look` names it from the species and the part.

### D8. Variation: sex, castration, age, reproductive states

- **`Species.variants`**: `sex.<sex>`, `neutered`, and `stage.<stage>`, each
  a delta (`add` modules, `scale` modules, `massFactor`, `integument`
  overrides, `temper` deltas on `biddability` and the handling range, and
  per-variant `called` names: *bull*, *cow*, *steer*, *ox*, *heifer*,
  *calf*). `species.bodyFor({ stage, sex, neutered })` memoizes one `Body`
  per key.
- **Castration is a sever.** The male delta adds a `gonads` part.
  `castrate <animal>` (trade-ranching) asks `animal.castratePlan(by)`, which
  refuses a female, an animal with none, an unhandled animal (the existing
  handling read) and one out of season for it (flies: the daylength band on
  the species' `neutered` delta), then calls `ConditionApi.sever` on the
  gonads with a risk the hand sets (a laceration whose severity falls with
  stockmanship — derived). **`neutered` is derived**: male, gonads missing,
  and `lostAtAgeDays < matureAt`. No new field on the organism.
- **The herdbook** records it: `HeadOverlay.castratedAt`; `mintHead` replays
  it as a sever on draft. `Herdbook.neuteredFraction` (default 0; the ox
  book authors 1) seeds founding stock through `HeadSeed`. The herd's
  composition read gains the counts by `called` name, which is what *the ox
  register counts it* means (conflict 4).
- **The ox** is cattle + male + neutered + mature. `ox.yaml` authors the
  sever instead of being a bare `Livestock`. It is heavier (`massFactor`) and
  calmer (`temper`), read by `HandlingMixin` through `getBody()`.
- **Growth.** `Species.massAt(age, variant)` becomes von Bertalanffy
  (`W∞ (1 − b·e^(−kt))³`, `k` derived from `matureAt` so 95 % is reached
  there; no new authored number). `Creature.getMass` stops freezing the
  seeded frame for a body whose `getLifeStage()` is non-null and whose row
  authored no mass: it derives on read. Stage deltas carry proportions (the
  young's big head and long legs as `scale`), coat and temper.
- **Reproductive states** are body states (D9): `in-season` (derived from
  the shipped `Species.breeding` daylength band, sex and maturity), `rut`
  (the male twin), `pregnant`, `lactating`, `with-young` (event states).
  ⭐ **Lactation drives the udder**: the gland authors `activeIn: lactating`,
  and `Producing.tapWindow` answers `not-lactating` (a new
  `TapClosedReason`, with a reason row) when it is not active. A dairy
  herd's founding females are seeded lactating; drying off ends the state;
  the end of `restDays` re-enters it (conflict 7). `pregnant` and
  `with-young` ship as rows with their effects and are set only by staging,
  because conception is a non-goal.

### D9. Body states: one shape, one mixin

A **body state** is a `body-state` document at `<root>/body-states/<key>`:

```yaml
key: denning
trigger: { daylightFrom: 0, daylightTo: 0.42, coreBelowK: 283 }   # or { event: true }
rate: 0.1                 # multiplies basal drain
effects: { torpid: true, feeds: false, pace: 0 }
seen: "is buried to the eyes in the mud, and does not stir"
```

- `Species.states` lists the paths a species can be in.
- **`BodyStateMixin`** holds the event states (`bodyStates: Record<key,
  { sinceS }>`, persistent) and answers `activeStates()`, `isInState(key)`,
  `enterState(key)`, `leaveState(key)`, `stateRate()`. Derived states are
  computed on read from the document's trigger, the calendar at the body's
  place and the body's own core temperature; they are never stored.
- **Every effect has a reader in this build**: `rate` →
  `Metabolic.basalDrain`; `pace` → the traverse duration in
  `LocomotionLogic`; `feeds: false` → `EatingMixin`'s refusal; `torpid` →
  `BehavedMixin` skips the deliberation beat; `temper` → `HandlingMixin`;
  `produces` → D8; `seen` → a `look` augmenter.
- **Consumers**: `denning` (bullfrog), `in-season` and `rut` (cattle, sheep,
  goat, pig), `lactating` (dairy), `cold-slowed` (frog, fish, crab: `pace`
  and `rate` follow core temperature below a threshold). The last needs
  those three plans to author `thermalStrategy: ectotherm`, which no row
  does today.
- **Host:** see § Host placement — composed on the animal rungs, not on
  `Creature`.

### D10. Metamorphosis: per-stage plans, one identity

- **`Species.development`**: per `LifeStage`, `{ plan, called, massFactor }`.
  The stage vocabulary stays `LIFE_STAGES`. The bullfrog: `newborn` →
  `tadpole` (gills, a tail, no legs), `juvenile` → `froglet` (gills and
  lungs), `adult` onward → `frog`. It gains an `ageCurve` (it has none, which
  is why its shipped `breathingByStage` has never applied).
- **Breathing derives from organs.** A respiratory part authors `breathes:
  { medium, apparatus, intake }` (the frog's skin is its integument's).
  `Body.breathing()` is the per-medium maximum over present, functioning
  organs. `BodyPlan.breathing`, `getBreathableMedia`,
  `Species.breathingByStage`, `breathingFor` retire; `Respiration.breathingNow`
  and `Metabolic.canIngest` read the body. `respires` and `lungVolumeL` stay
  declared on the plan.
- **The swap.** `getBody()` already answers the new stage's body. What needs
  an event is the instance state keyed to the old plan.
  `VitalsMixin` gains persistent `formStage` and, inside
  `reconcileConditions`, `reconcileForm()`: when the stage has changed it
  remaps `bodyPartDeltas` and trauma `site`s by key (an unmatched part's
  wounds pass to its nearest matched ancestor), releases slots the new plan
  lacks (the code `severPart` already uses), tells the room, and stamps
  `formStage`. **Mass carries**: mass is derived from the growth curve times
  the stage's `massFactor` (≤ 1 across a change), so none is created.
- **One identity** is free: it is the same object, the same identity path,
  the same record.
- **The silkworm.** `Silkworm` (pack class on `Beast`) is one worm. Its
  stage comes from the pack's `LarvalClock` (degree-days, extracted from
  `RearingMixin` so the tray and the worm run one law) by overriding
  `getLifeStage()`: larva → `newborn`, pupa → `juvenile`, moth → `adult`.
  ⭐ **The tray is the compression** (ranching D19 and D21): while a rearing
  is in a larval age the tray holds **one exemplar worm as real content**,
  seeded from `(tray key, index)` so the same worm is the same worm.
  `get silkworm from tray` is an ordinary move and lowers the count by one;
  `put silkworm in tray` folds it back and destructs it (the egg lot's
  adoption shape). The tray mints the next exemplar at its own reconcile,
  which is when its name and `look` are computed anyway.
- **The cocoon is spun from the worm's own gland**: shell mass =
  larval mass × the `silk-gland` share of the fifth-age body ×
  the satisfaction terms the tray already carries. The share is calibrated
  so `meanShellMg` equals today's; a golden test pins every tray number.
  Stifle, scorch, the ten-day deadline and `unwind` are **not edited**.
- **Emergence** mints one exemplar moth beside an unstifled stack, in
  addition to today's pierced flag and egg lot. A lone worm that reaches
  spinning off the tray spins a stack of one carrying its seed, and the moth
  that emerges carries the same seed. *For the silkworm, identity is the
  seed (the herd's rule); for the frog it is the object.*

### D11. Sense organs are parts

- A part authors `senses: { modality, media?, watchDeg?, apertureMm? }` and
  `serves: [vision | hearing | smell]`. `Body.modalitiesIn(medium)` replaces
  the plan's; `sensoryPorts`, `SensoryPort`, `getSensoryPorts`,
  `getModalities`, `portMedia` retire. The dossier renders organs.
- **A wound costs the sense.** `Actor` already has the two hooks
  (`perceivedBandModifier`, `canSeeOverride`); they read
  `capacity('vision')`: `impaired` −1 band, `failing` −2, `lost` cannot see.
  `Olfactory.acuity()` is multiplied by the `smell` band. `hearing` ships as
  a capacity `assess` shows, with no multiplier (the `clearance` precedent,
  stated).
- **Acuity from eye size.** `Actor.getVisionProfile()` (new override of the
  `PerceptionMixin` null) builds the profile from the body: `bandShift =
  −round(2·log2(apertureMm / REFERENCE))`, clamped to ±1. Persons' eye
  apertures are authored so the derived shift equals the `bandShift` each
  species authors today; `visionProfile.bandShift` is then removed from the
  rows. This is the change in conflict 3.
- **The watched share.** `watchDeg` is the angle the eyes cover together
  (person 190, wolf 250, cat 200, cattle 330, sheep 320, horse 350, hen 300,
  fish 330, crab 360). `effectivePerceptionImpl` gains one term:
  `(watchDeg/360 − 190/360) × detection.watchWeight × visionBandFactor`.
  The reference is the person's, so **persons and players read exactly as
  today**. With the dial at 6, a cow adds about +2.3 and detects a `subtle`
  hide (requirement 2) that a wolf (+1) misses. No facing is introduced.
- **A player's eye.** Players get eyes as parts through the composed biped.
  `look` at yourself gains a line from a `Vitals` augmenter beside
  `missingPartsAugmenter` (a wounded sense organ is worded; other wounds stay
  `assess`'s).

### D12. The honesty check, and fill

- **`lint:scaling`** reads every species row with a tissue-bearing body and
  computes four indices from numbers already authored (`adultMass`,
  `stature`, module shares, organ `apparatus`, gaits, `thermalStrategy`,
  habitat medium): bone stress (mass over bone cross-section, exempt in
  water), diffusion breathing (a `tracheae` or `skin` apparatus against body
  thickness), flight (wing loading, for a body with a `fly` gait), and heat
  (surface against volume for an endotherm). A species over a limit must
  author `pays: [{ limit, by }]`. The gate counts **species over a limit
  with no payer**; the ceiling is **0** and is met by the retrofit, not by
  raising it. It never refuses a creature at runtime.
- `Species.pays` is read by the lint and rendered by
  `SpeciesLogic.buildDossier` (its reader outside `Species.ts`).
- **Fill.** A module authors `fill: solid | sparse | hollow`.
  `inflictThroughStack` scales a `point` insult's residual by the part's
  fill (dials `response.fill.sparse`, `response.fill.hollow`) before it
  meets tissue. Shipped: wings and fin sets are `sparse`; the swim bladder
  is `hollow`; everything else is `solid`, so no person's numbers move.

### D13. The whale is rows

`packages/content/trade-fishing/content/`: a `cetacean` plan composed from
four new modules (`head-cetacean` with the spermaceti organ, the melon and a
toothed jaw; `torso-cetacean` with lungs and a blubber `under` layer;
`flipper-pair`; `fluke`), the `sperm-whale` species (sex deltas, an age
curve, `pays` if the check asks), an agent row, the material rows of D4, the
thing rows they come off as (blubber, spermaceti, tooth, whale meat) and the
`render-blubber` recipe. **No `.ts` file is touched for the whale**; the
wave's acceptance is a diff with no source in it.

### D14. Attach points for the deferred magic (seams, not stubs)

| deferred piece | the seam it attaches to | slate |
|---|---|---|
| the payer declaration | `Species.pays[].by` — a path the mana build will validate | mana-economy-design-pack |
| the swap's other triggers (polymorph, the curse) | `OrganismMixin.getBody()` is a method, so a timed shadow can answer a different body, and `reconcileForm()` then runs the same remap | spellbook-slate |
| a part's charge as a source of function | `VitalsMixin.ownFunction(key)` is the one place a part's function is computed | mana-economy-design-pack |
| a part's function from a mark or its contents | the same `ownFunction` | bestiary-slate |
| the *added* part state | `BodyPartDelta` | bestiary-slate |
| animated corpses | `Corpse.subtree` and the corpse's kept body | spellbook-slate, decomposition-slate |

None of these adds a field, a parameter or a branch in this build.

### D15. Persistence, per piece of content

| state | where it lives | survives a restart when |
|---|---|---|
| missing, sealed, `lostAtAgeDays` | `VitalsMixin.bodyPartDeltas` (already persistent) | the body has a host record: a player, a named kept animal, a draft animal |
| `formStage` | `VitalsMixin` | the same |
| stage itself | derived from `bornAt` (already persistent) | the same; a `cast:` animal returns at its row's age |
| castration on a herd animal | `HeadOverlay.castratedAt` in the herd document | always |
| event body states | `BodyStateMixin.bodyStates`; for a herd animal, `HeadOverlay.states` | host record, or the herd document |
| gland stores | `ProducingMixin.tapState` (already persistent; herd overlay already carries dry-off) | as today |
| the severed part | a `Corpse` with `subtree` | it is carried by a player or lies in a persistent place — exactly as any other good |
| the pelt's flaws, and the leather's | `Flawed` on the same `Hide` object | the same |
| the tray's stage, the exemplar's seed | `RearingMixin`'s persistent fields | as today |
| coat cycle, derived states, neutered, ox | derived | always |

No class gains `PersistableMixin`. No new collection. No migration: stored
`bodyPartDeltas` and `tapState` keep their keys (D1, D2), and a stored delta
without the new fields reads as *lost before the record began, unsealed*.

### D16. Staging tools

Two `testharness` subcommands (test world only), each a thin controller over
`TestHarnessApi`, which calls the same model methods a player act reaches:

- `testharness body <target> <op> [value] [cite]` — `age <days>` ·
  `sex <sex>` · `wound <part> <channel> [severity]` (through
  `ConditionApi.inflict`) · `sever <part> [channel]` (through
  `ConditionApi.sever`) · `kill` (through `ConditionApi.die`) ·
  `state <key> [off]` · `wet <0..1>` · a bare `body <target>` **reads**
  (stage, sex, called name, states, core temperature, capacities).
- `testharness carcass <species path> [kg] [age days]` — mints a fresh
  corpse of that species where you stand.

The tray and the cocoons are staged through the existing `/auth/test-stage`
route (`setDegreeDays`, `setSpunAt`; the pack adds the setter where one is
missing).

## ⭐⭐ Host placement

| new thing | host | what composing it claims about the host's other composers |
|---|---|---|
| `getBody()` | `OrganismMixin` | Every organism has a body of its own kind and stage. True of a plant (the empty body), a hive (the bee's), a corpse (the body it was). No guard. |
| part roles, integument, fill, senses, breathing | the **module document** | Nothing about any class. |
| `sustains` evaluation, delta fields, sealing, regrowth, `formStage`, `reconcileForm` | `VitalsMixin` | Every body with wounds can lose, seal and regrow a part. Regrowth answers yes only where a part authors `regrows`; that is data on the part, not a default on the host. ⚠ New members must reach existing ones through `this.` (`bodyPartDeltas`, `conditions`), or `lint:mixin-clusters` counts a split (43 > 42). |
| coat clo | `AttiredMixin.insulationAt` | *A body is the only thing that wears anything*; its own coat is its innermost covering. Skin contributes nothing, so a person's read is unchanged. |
| integument armor layer | `ConditionLogic.resolveCoveringStack` | Not a host. |
| `comesOffAs` | `TissueMixin` (a material capability) | Every material that came from a living thing can say what it leaves a body as; wood and leaf legitimately author none today and gain it with foraging. |
| flaw `site` and the four kinds | `FlawedMixin` | Every article can carry a sited flaw; unsited flaws stay valid. |
| `Corpse.subtree` | `Corpse` | Every corpse is a whole body or a part of one. `null` on most is *the whole body*, which is an answer, not a "no". |
| **`BodyStateMixin`** | **`Beast`, `lib/creature/KeptAnimal`, `Livestock` (pack)** — not `Creature` | ⚠ **The riskiest placement in the plan.** On `Creature` it would claim states for every player, 116 human NPCs, shades and corpses, none of whose species lists one — the *honest default that answers no on most hosts* (the firebox on every ship). On the three animal rungs every composer's species can list states. The cost is three composition sites with no common ancestor below `Creature`; the first person state (sleep, a person's pregnancy) is the signal to move it down. Readers narrow with `MixinApi.isBodyState`. |
| `produces` reading | `ProducingMixin.taps()` | Unchanged composers. |
| `castratePlan` | `Livestock` | Every head of stock can be asked; the animal answers no for a female. That is a refusal with a reason, the shape `breedRefusal` already has, not a re-narrowing guard: the verb is afforded by `Livestock` and means something for every species of stock. |
| `castrate` affordance | `Livestock.commandContributions` | A sheepdog (`WorkingAnimal`) does not afford it. |
| `Silkworm` | pack class on `Beast` | One species. |
| `Species.variants`, `development`, `states`, `pays` | `Species` | Absent on most rows means *one form, no states, within limits*, which is the same statement an absent `ageCurve` already makes. |
| watch term, vision profile from the eye | `PerceptionLogic` (logic), `Actor` (the two shipped hooks) | `Livestock` is not an `Actor`; the watch term narrows on `Organism`, not `Sensor`, so a cow is read. |

**Narrowings written down as findings rather than coded:**

- `Livestock` has no `Sensor` or `Perception`, so a cow has no light term in
  detection and reads neutral light. The watch term still applies. Whether
  stock should be `Actor`s is a ranching question, not this build's.
- The watch term and the wounded-eye modifier need the viewer's awareness
  band warmed; a brain tick warms anatomy only. Unchanged here, noted for
  concealment-by-channel.

## Convention conformance

Checked at plan time against `CLAUDE.md` and the docs named.

- **`props:` / `cast:`** — no new placement key; staged animals arrive by
  `clone --here` or `testharness carcass`. `container:` is not authored.
- **Locations, not rooms** — no new place.
- **Path pattern** — modules at `<root>/modules/`, states at
  `<root>/body-states/`; the whale under `/trade/fishing`; the silkworm
  class at `/trade/sericulture/agent/Silkworm`; kernel value objects in
  `lib/species/`; catalogues in `platform/idea/`.
- **Module categories** — value objects (`Body`, `BodyComposition`,
  `BodyModule`, `BodyState` the value, `LarvalClock`), one kernel mixin, two
  catalogues, controllers, a brain-free pack class. No new category, no free
  helper, no new `eslint-disable`.
- **Module scope** — nothing executes at module scope; catalogues are
  reached on use.
- **Import boundary** — `BodyComposition` imports types only. Packs import
  the kernel by package specifier.
- **Verbs on objects** — `castratePlan`, `getBody`, `isInState` are the
  object's; `ConditionApi.sever` is lifecycle orchestration (the
  `ConditionApi.die` shape).
- **P3 refuse / skip / throw** — a wound at a missing part re-sites and
  seals instead of landing nowhere; an unknown module path throws at
  hydration; a species over a limit fails the lint; `not-lactating`,
  `not-male`, `already-castrated`, `out-of-season` are reason rows.
- **P4 no duck typing** — every cross-pack read narrows with `MixinApi.isX`;
  the silkworm depends on no other trade.
- **P5 the mixin decides** — `ButcherController`, the tap controllers and
  the new `CastrateController` only bind arguments and word the answer.
- **P6 persistence per content** — D15; no class newly persists what it
  hosts.
- **P7 load on use** — modules and states are ensured by the row that cites
  them; `comesOffAs` rows are ensured at the act. No boot entry
  (`lint:boot-entries`).
- **P8 names** — `Body` is what it is; `sustains` sits beside `governs` and
  `serves`; `castrate` over *geld* (requirements); no class is an adjective.
- **American English** throughout new rows and prose.

**Gates this build must pass** (the build runs `pnpm -C packages/server
lint:family` at every wave; the ones most likely to speak):
`lint:anatomy` (extended), `lint:scaling` (new), `lint:census`,
`lint:content-refs`, `lint:material-kinds`, `lint:unconsumed-seams`,
`lint:data-ideas`, `lint:mixin-names`, `lint:mixin-files`,
`lint:mixin-clusters`, `lint:lib-statics`, `lint:closed-vocabularies`,
`lint:field-meta` (its golden fixture is regenerated in each wave that
changes `fieldMeta`), `lint:instanceable`, `lint:kept-animals`,
`lint:perishable`, `lint:reason-rows`, `lint:command-views`, `lint:one-word`,
`lint:verb-collisions`, `lint:view-keys`, `lint:subcommand-words`,
`lint:object-verbs`, `lint:duck-typing`, `lint:boot-entries`,
`lint:module-scope`, `lint:imports`, `lint:silent-catch`, `lint:test-seams`,
`lint:drive-scripts`, `lint:wizard-axis`. **No ceiling rises.** If one
would, the wave folds the addition instead (review question B1).

## Waves

Every wave ends green on `pnpm test:near`, each touched pack's own vitest and
`lint:family`, and at one commit. B4 applies to every wave that retires a
key: grep `packages/content` for it before committing.

### W0 — Goldens and staging tools

**Goal:** pin today's behavior, and build the tools the drive needs.
**Implements:** D16.
- Characterization tests, written against master's behavior:
  the resolved tissue shares of the nine plans; the row set and masses
  `dressOut` gives each of the 15 yielding species at a reference mass; each
  tapped species' tap keys and specs; a full tray run's numbers
  (`meanShellMg`, heft bands, counts); persons' detection score and worn
  insulation.
- `testharness body` and `testharness carcass` (view stanzas, two
  controllers under `platform/idea/cmd/system/`, `TestHarnessApi` /
  `TestHarnessLogic`). `sever` here calls the shipped `severPart` until W5
  replaces it.
**Acceptance:** goldens green on untouched code; a wire test stages a
wounded, killed cow and reads the wound on the corpse.
**Commit:** `test(organism-biology): W0 goldens and the body staging tools`

### W1 — The composed body

**Goal:** modules, `Body`, `getBody()`; nothing a player can see changes.
**Implements:** D1, S1–S4.
- `body-module` kind (added to `DOCUMENT_KINDS`; ⚠ merge seam with
  `build/naming-overhaul`, which moves kinds to `content/kinds/*.yaml` —
  whichever merges second converts the two kinds this build adds),
  `BodyModule`, `BodyModuleCatalogue`, `SpeciesApi.modules()`.
- `BodyComposition`, `Body`, `Species.bodyFor()` (memoized; replaces
  `resolvedTissuesCache`), `OrganismMixin.getBody()`.
- Migrate all 36 `getBodyPlan()` anatomy reads to the body; delete
  `BodyPlan`'s anatomy getters. `BodyPlan` keeps `slots`, masses, `voice`,
  `respires`, `lungVolumeL`, `thermalStrategy`, `defaultLocomotionMode`.
- Re-express the nine plans as modules; `swine` composes; add the `insect`
  plan and move bee, silkworm and cricket to it.
- `lint:anatomy` rewritten over expanded bodies.
**Acceptance:** the W0 share and yield goldens pass unchanged; `bodyParts:`
appears in no row; `lint:anatomy` fails on a deliberately broken module.
**Commit:** `feat(species): W1 body plans compose from modules`

### W2 — What a part is for

**Goal:** the third role, the third rule, gaits and fill.
**Implements:** D2, D6, D12 (fill).
- `produces` on parts; `Producing.taps()` reads the body; gland wound
  factor; re-author the ten tapped species (udder, oviduct, fleece, crop,
  sapwood); delete `Species.production` and its accessors;
  `Livestock.ts:419` follows.
- `sustains`, `filtration`, kidneys; the death floor generalized.
- `gait` on limb, wing and fin modules; `Body.gaits()`; delete
  `locomotionModes` from `BodyPlan` and every row; `LocomotionLogic`,
  `Exit.whatWouldPass` and the dossier read the body.
- `fill` on modules and the `point` delivery read.
**Acceptance:** tap goldens pass; a staged udder wound stops the fill (unit);
one kidney lost leaves `filtration` full and both lost begins dying (unit);
a `point` insult to a wing delivers the `sparse` share (unit).
**Commit:** `feat(species): W2 glands, the redundant rule, gaits and fill`

### W3 — The integument

**Goal:** every exterior part has a skin; coats insulate; hides armor.
**Implements:** D3, D4.
- The tissue rows; integument blocks on every module; the crab is chitin.
- The armor layer; `primaryTissueMaterial` skips the integument.
- Coat clo in `insulationAt`; the fleece ties to the wool tap; the shiver
  `look` line.
**Acceptance:** persons' insulation and detection goldens unchanged; a shorn
sheep's coat clo is ~0 and its core falls faster than an unshorn one's in a
staged cold wet night (unit arithmetic over `ThermalRegulation`); a wet coat
reads lower than a dry one; `look crab` says chitin. ⚠ Run `pnpm test:gym`
once here: animals gain natural armor and the balance benches may move.
**Commit:** `feat(species): W3 the integument — armor, coat and skin`

### W4 — What a carcass gives

**Goal:** yields derive; the pelt comes off; `butcheryYield` is gone.
**Implements:** D5.
- `TissueMixin.comesOffAs`, authored on the tissue rows; `portionKg` on
  `CutMixin` and the cut rows; pelt, feathers, down, carapace rows (hide and
  fish-skins exist).
- `Butcherable.dress` and `Species.dressOut` rewritten; the pelt line, its
  flaws and the skinner's hand; `Flawed` kinds and `site`; the corpse's
  `look` for a taken pelt (bare skin).
- Delete `Species.butcheryYield` and all 15 lists; retire `lint:anatomy`
  clauses (b), (c).
**Acceptance:** the W0 yield golden passes on **row sets** for all 15
species, with the unit-count differences listed in the commit body; a cow
killed with a flank puncture gives a pelt whose `look` names the hole; the
same pelt after `cure` and `tan` is leather with the flaw (wire); a hen
gives feathers and down; the crab gives chitin.
**Commit:** `feat(butchery): W4 cut maps derive from the body; the pelt`

### W5 — Parts that change

**Goal:** the severed part is a thing; stumps seal; claws regrow; coats
cycle.
**Implements:** D7.
- `ConditionApi.sever`, `Corpse.subtree`, the avulsion path, the participant
  gate on `severPart`; `testharness body … sever` moves to it.
- Delta fields, sealing in `afflict`, regrowth at reconcile,
  `moultEveryDays` on the crab.
- Coat `cycle`; the pelt's grade from the coat at death.
**Acceptance:** a staged wolf foreleg lies in the place, is carried,
butchered for a shank and reads its decay stage (wire); a crab aged past a
moult has its claw and a burned one does not (unit and wire); a winter pelt
grades above a summer one (unit).
**Commit:** `feat(harm): W5 the severed part is a thing; regrowth and the coat's year`

### W6 — Bodies that vary, and their states

**Goal:** sex, castration, the ox, growth, body states, lactation.
**Implements:** D8, D9.
- `Species.variants`; the `gonads`, udder and oviduct as sex deltas;
  `called` names in presentation; von Bertalanffy `massAt`; derived frame
  mass in `Creature.getMass`; stage deltas (the vell moves here).
- `castrate` (view, controller, controller row, reasons),
  `Livestock.castratePlan`, `HeadOverlay.castratedAt` and `states`,
  `Herdbook.neuteredFraction`, the composition read, `ox.yaml`.
- `body-state` kind, `BodyState` value, `BodyStateCatalogue`,
  `SpeciesApi.bodyStates()`, `BodyStateMixin` on the three rungs (`Mixins`
  entry, `MixinApi.isBodyState`, refusal phrase), every effect's reader.
- State rows; `thermalStrategy: ectotherm` on the fish, crustacean and frog
  plans; `activeIn: lactating` and `not-lactating`; founding seed.
**Acceptance:** a non-lactating cow refuses with the reason and a lactating
one gives milk (wire); a castrated calf's herdbook line reads steer, and at
adult age it is called an ox, outweighs a bull of the same age and handles
calmer (unit and wire); the ox book's read counts it; a cold frog's pace and
rate fall (unit). ⚠ Ectothermy is new behavior for five fish, the crab and
the frog: a unit test holds each at its habitat's temperatures and asserts
it neither goes torpid in water it tolerates nor dies.
**Commit:** `feat(species): W6 sex, castration, growth and body states`

### W7 — Metamorphosis

**Goal:** one creature, several bodies; the frog and the silkworm.
**Implements:** D10.
- `Species.development`; `breathes` on organs; `Body.breathing()`; delete
  `BodyPlan.breathing`, `getBreathableMedia`, `Species.breathingByStage`,
  `breathingFor`; `Respiration` and `Metabolic.canIngest` follow.
- `formStage`, `reconcileForm`.
- Tadpole, froglet and frog plans and modules; the frog's `ageCurve`,
  `denning` wired to it.
- `LarvalClock`, `Silkworm`, the tray's exemplar, the gland-derived shell,
  the exemplar moth; larva, pupa and moth plans.
**Acceptance:** a kept tadpole aged across its change is the same object
with the same name, breathes air, and a staged wound on its tail has passed
to its torso (wire); the W0 tray golden passes to the milligram; a worm
taken off a fifth-age tray reads as a fifth-age larva; an unstifled stack
staged to emergence leaves a moth and pierced cocoons.
**Commit:** `feat(species): W7 metamorphosis — the frog and the silkworm`

### W8 — Senses

**Goal:** eyes, ears and noses are parts.
**Implements:** D11.
- Sense organ parts on every head module; `vision`, `hearing`, `smell`
  capacities; delete `sensoryPorts` and its surface; the dossier.
- `Actor.getVisionProfile()`; the capacity-driven band modifier; remove
  `bandShift` from the species rows; `Olfactory` reads `smell`.
- The watch term and its dial; the self-`look` line.
**Acceptance:** persons' detection golden unchanged; a staged eye wound
lowers a wolf's and a player's perceived band, and the player's `look` at
themselves says so (wire); a cow perceives a `subtle`-hidden player that a
wolf does not (wire, read through `testharness body`'s read and
`PerceptionApi.perceives`).
**Commit:** `feat(senses): W8 sense organs are parts`

### W9 — The honesty check and the whale

**Goal:** every species passes or pays; a new animal is rows.
**Implements:** D12 (check), D13.
- `check-scaling.ts`, the `lint:scaling` script entry, `Species.pays`, the
  dossier line; `pays` authored wherever the check asks.
- The whale's rows and the `render-blubber` recipe.
**Acceptance:** `lint:scaling` is 0 over the roster; the whale's commit
touches no `.ts`; a staged whale carcass gives blubber, spermaceti, teeth and
cuts, and rendered blubber fills a lamp (wire).
**Commit:** `feat(species): W9 the square-cube check; the whale`

### W10 — Drive, walk, docs

**Goal:** the exit criterion.
- `packages/wire/tests/organism-biology.dirty.wire.test.ts` (the 16 blocking
  steps) and `organism-biology.soak.dirty.wire.test.ts` (the 4 span steps);
  each checkpoint is made to fail once on purpose (B2).
- `e2e/tests/organism-biology-walk.spec.ts`, once (B3).
- Subsystem doc edits the build accumulates: `race.md` (the body, modules,
  variants, development), `vitals.md` and `harm.md` (the delta, sever,
  `sustains`), `butchery.md`, `taps.md`, `ranching.md`, `sericulture.md`,
  `senses.md`, `thermal.md`, `respiration.md`, and a new
  `docs/subsystems/body.md` if `race.md` would pass ~1,400 lines.
- `pnpm test` once, at code-complete.
**Commit:** `test(organism-biology): W10 the drive and the walk`

## Reachability wiring

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| skin a carcass | `butcher <body> for pelt` (shipped view) | shipped (`Corpse` is `Butcherable`) | integument on the module; `comesOffAs` on the skin material; the pelt row carries the keyword `pelt` | the butcher ensures `comesOffAs` rows at the act | `cut` is a string matched to exemplar keywords, as today |
| pluck, scale, shell | the same verb, `for feathers` etc. | the same | the coat material's `comesOffAs` | the same | the same |
| gland and blubber yields | `butcher` | the same | the organ's tissue row names its thing row | the same | the same |
| render blubber | the shipped render path (`cook`/recipe) | the pot | `render-blubber` recipe; `whale-oil` material | recipe documents load as today | recipe slot category `blubber` — a tag on the blubber material |
| milk a lactating cow | `milk` (shipped) | `Livestock` | udder part with `activeIn: lactating`; the state row; the reason row | the state is ensured by `Species.setStates` | unchanged |
| castrate | `castrate <animal>` (new view, `trade-ranching/content/trade/ranching/cmd/ranching/castrate.yaml`, `category: ranching`) | `Livestock.commandContributions` gains the view key | the `gonads` part on the male delta | the controller row `…/idea/cmd/ranching/CastrateController.yaml` | `animal` requires `HandledMixin`, as `handle` does; the animal refuses the rest |
| pick up a severed part | `get` (shipped) | it is a `Thing` | `/stuff/thing/Corpse` row | cloned at the sever | none |
| regrow | none (reconcile) | — | `regrows` on the part; `moultEveryDays` on the species | with the body | — |
| take a worm off a tray | `get <worm> from <tray>` (shipped) | the tray is a container; the exemplar is content | the `Silkworm` agent row; the three stage plans | the tray clones the exemplar | none |
| body states | none (derived) or the act that sets one | — | `Species.states` → state documents | ensured by the species' setter | — |
| an eye wound dims sight | none | — | eye parts on head modules | with the body | — |
| stage a body | `testharness body`, `testharness carcass` | test world only | — | — | `requiresTestWorld` |

⚠ The four classic silent failures, checked per row above: a view nothing
affords (`castrate` is added to `Livestock`'s contributions in the same
wave), a row nothing loads (every new document is ensured by an async setter
that throws on a miss), a mixin nothing reaches (`BodyStateMixin` has seven
readers in W6), a `requires:` nothing composes (`castrate` requires a mixin
`Livestock` composes).

## Acceptance-criteria coverage

| criterion | wave |
|---|---|
| Every animal can be looked at and butchered; coat first | W3, W4 |
| A newly authored species is butcherable, skinnable, insulated | W4 (rule), W9 (the whale proves it) |
| A pelt shows every wound, in its part; survives tanning | W4 |
| The crab is chitin | W3 (look), W4 (yield) |
| The whale exists; blubber renders to lamp oil | W9 |
| Milking needs a lactating animal; the refusal names the reason | W6 |
| Castration exists; the ox; the register counts it | W6 |
| Wounding a gland stops what it makes | W2 |
| Wounding an eye costs sight, animal and player | W8 |
| A wide-eyed grazer detects what a hunter misses | W8 |
| A severed part lies in the world, is carried, butchered, spoils | W5 |
| A claw regrows at the moult unless burned | W5 |
| Losing one kidney leaves a body standing | W2 |
| Shorn, plucked or wet is colder | W3 |
| The tadpole becomes the frog, same creature, breathes by its organs | W7 |
| Larva → pupa → moth; deadline, stifle and reel read the same | W7 |
| Every one of these survives a restart | D15, proved in W10 — ⚠ as amended by conflict 1 |
| No species is rejected; any over a limit names what pays | W9 |

Unmapped: none. Amended: the restart criterion (conflict 1) and the
"same cuts" collision (conflict 5).

## Test & gate strategy

**Unit tests** prove arithmetic: expansion and renormalization, the three
combination rules, gland fill under a wound, coat clo dry, wet and shorn,
derived yields against the goldens, flaw derivation, sealing and regrowth
across a moult boundary, the growth curve, neutered derivation, state
triggers and rates, the trauma remap across forms, the larval clock against
the tray golden, derived band shift, the watch term, the four scaling
indices. **Only the drive** can prove the wire flows, the restart and the
words.

### The blocking drive

| # | pace | how it is staged |
|---|---|---|
| 1 | instant | `clone` a cow (or draft one), `testharness body <cow> wound body.torso point 2`, `testharness body <cow> kill`; then the player's `butcher … for pelt`, `look pelt` |
| 2 | instant | player verbs only |
| 3 | instant | player verbs: `cure <pelt>` with salt (the `salt-hide` recipe), `tan <pelt> in <pit>`; the pit's liquor clock is advanced with `testharness clock-advance` in ≤ 1-day steps or the hide's tannage set through `/auth/test-stage` (`setTannage`) |
| 4 | instant | `testharness carcass <hen>` |
| 5 | instant | `clone` a shore crab; `testharness body <crab> kill` |
| 6 | short | `testharness body <crab> sever body.claw.left`, `… age <past the next moult>`; second crab: `sever`, `wound body.claw.left heat 2`, `age` |
| 7 | instant | `testharness carcass <sperm-whale>`; the player butchers and renders |
| 8 | instant | draft a cow; `testharness body <cow> state lactating off` then on |
| 9 | instant | the player's `castrate`; then `testharness body <steer> age <adult days>` beside a staged bull of the same age; read both with `handle` and the ox book |
| 10 | instant | `testharness body <wolf> wound body.head.eye.left point 2`; a hidden player; `testharness body <observer>` read and `perceives` for the wolf and a cow |
| 11 | instant | `testharness body <wolf> sever body.leg.frontLeft`; player verbs after |
| 12 | short | two sheep; the player's `shear`; `testharness weather-pin rain`, `clock-advance` a night in steps; `testharness body <sheep>` reads |
| 13 | short | a **named kept** tadpole; `testharness body <tadpole> age <past the change>`; then `… age` into winter with the weather pinned cold |
| 14 | short | `/auth/test-stage` `setDegreeDays` on a tray; `get silkworm from tray`; the stifling oven; `unwind`; a second stack with `setSpunAt` back-dated past ten days |
| 15 | instant | `testharness body <player> wound body.head.eye.left point 2`; the player's `look me` |
| 16 | short | restart the wire world; read back the pelt and leather (carried), the ox (the herd document), the kept frog, the foreleg (carried, and one left in Hearts Delight's persistent hall), the lactating cow (returned to its herd before the restart), the tray, the player's eye |

### The soak drive (named for the lane, never run by `/build`)

`organism-biology.soak.dirty.wire.test.ts`: (1) a lamb across a game year;
(2) a sheep's coat across a winter; (3) a bullfrog through a winter; (4) a
silkworm generation on its own degree-days. Staged twins: blocking steps 9
and 12 (growth and the coat), 13 (the winter), 14 (the generation). The
arithmetic of each season is proved in the unit tests named above.

`pnpm test` runs at code-complete and at `/finalize` only. Everything
between is `pnpm test:near`, the touched packs' vitest, and `lint:family`.

## Risks & opens

- **W1 is wide.** 36 call sites and nine plans move in one wave, and the
  only proof nothing changed is the W0 goldens. If the goldens cannot be
  made exact (floating-point renormalization), stop and widen the tolerance
  deliberately, in the test, with the reason.
- **Constituent loading for derived parts** (could not ground). If the
  applier loads constituents from authored data only, tissue materials will
  not be resident when a body is first read. Settle it first in W1.
- **`lint:mixin-clusters` is at its ceiling.** `VitalsMixin` gains members
  in W2, W5 and W7. Each must share state with existing members.
- **Ectothermy turns on** for seven species in W6. Kept fish in a cold tank
  could go torpid. The W6 unit test is the guard; if a shipped water is
  colder than a species' own tolerance, that is a content finding to record,
  not a dial to bend.
- **Dark-sight turns on** for nine person species in W8 (conflict 3).
- **Animals gain armor** in W3; the gym benches may move.
- **Unit counts change** in W4 (conflict 5). Recipes that take cuts by
  count should be re-read (`sausage`, `hearty-stew`).
- **The tray's exemplar** is the least-proven design in the plan (D10). If
  the tray's container hooks cannot hold a live creature beside leaf and
  frass without the feeding or naming logic counting it, stop and ask rather
  than adding a second verb.
- **Merge seams with `build/naming-overhaul`:** `DocumentKinds`,
  `SpeciesLogic.ts`, `Vitals.ts`, `lib/mixin.ts`, `api/mixin.ts`.
- **Stop and ask** if: a ceiling would have to rise; a module needs a field
  the list in S5 does not have; `castrate` collides in `lint:verb-collisions`;
  the scaling check flags a person species and the honest payer is unclear.

## Deferred seams

The seams are D14's table. The design they wait for stays in its slate; this
plan carries none of it.

- The four new sense channels, per-channel concealment and attention →
  [senses-slate](../slates/engine/senses-slate.md) and the
  concealment-by-channel build. Seam: `senses.modality` on a part.
- Charge, the mana organ, the payer's validation, dielectric →
  [mana-economy-design-pack](../slates/engine/mana-economy-design-pack.md).
- Bindings, animated corpses, polymorph →
  [spellbook-slate](../slates/engine/spellbook-slate.md),
  [decomposition-slate](../slates/engine/decomposition-slate.md).
- Marks, contents, the added part, cryptobiosis →
  [bestiary-slate](../slates/world/bestiary-slate.md).
- Conception, gestation, birth →
  [ranching-slate](../slates/trades/ranching-slate.md). Seam: the `pregnant`
  and `with-young` state rows, and `HeadOverlay.bornAt`.
- Reattachment and prosthetics →
  [physiology-slate](../slates/engine/physiology-slate.md) §7h.
- Horn, glue, gelatin as trades →
  [butchery-slate](../slates/trades/butchery-slate.md),
  [rendering-slate](../slates/trades/rendering-slate.md). Seam: the tissue
  rows and their `comesOffAs`.
- The hunt and the try-works → the whaling build.

## Critical files

Read first, in this order:

1. `packages/server/src/mud/platform/idea/species/BodyPlan.ts`
2. `packages/server/src/mud/platform/idea/species/Species.ts` (`:60-146`,
   `:425-660`, `:1168-1360`, `:1580-1670`)
3. `packages/server/src/mud/lib/species/Organism.ts`
4. `packages/server/src/mud/lib/vitals/Vitals.ts` (`:200-232`,
   `:2170-2440`, `:2636-2700`) and `lib/vitals/BodyCapacity.ts`
5. `packages/server/src/mud/platform/idea/Condition.ts` (`:130-260`,
   `:1215-1250`) and `platform/idea/api/ConditionLogic.ts` (`:98-180`,
   `:784-960`, `:1247-1481`)
6. `packages/server/src/mud/lib/husbandry/Producing.ts`
7. `packages/server/src/mud/lib/craft/Butcherable.ts`,
   `lib/butchery/Cut.ts`, `platform/thing/Corpse.ts`
8. `packages/server/src/mud/lib/slot/Attired.ts` (`:680-960`),
   `lib/thermal/ThermalRegulation.ts` (`:180-220`, `:900-960`)
9. `packages/server/src/mud/platform/idea/api/PerceptionLogic.ts`
   (`:630-700`, `:920-1070`), `lib/creature/Actor.ts`
10. `packages/server/src/mud/lib/spatial/Shape.ts`, `Shaped.ts`,
    `platform/idea/ShapeCatalogue.ts` (the document precedent)
11. `packages/server/src/mud/lib/material/Flawed.ts`, `Tissue.ts`
12. `packages/server/scripts/check-anatomy.ts`, `check-mixin-clusters.ts`,
    `check-unconsumed-seams.ts`, `pack-roots.ts` (`ratchet`)
13. `packages/content/species-and-names/content/stuff/idea/species/BodyPlan/*.yaml`,
    `packages/content/trade-fishing/content/stuff/idea/species/`
14. `packages/content/trade-ranching/src/agent/Livestock.ts`,
    `src/idea/HerdRegistry.ts`, `src/lib/HeadSeed.ts`
15. `packages/content/trade-sericulture/src/lib/Rearing.ts`,
    `src/thing/RearingTray.ts`, `src/thing/Cocoons.ts`
16. `packages/content/trade-tanning/src/lib/Tanning.ts`
17. `packages/content/platform/content/platform/cmd/system/testharness.yaml`
    and `packages/server/src/mud/api/test-harness.ts`
18. `docs/review-questions.md`, `docs/lint-family.md` § census-then-ratchet,
    `docs/subsystems/ranching.md` §§ D19–D21

## Drive record

*(appended at build time)*
