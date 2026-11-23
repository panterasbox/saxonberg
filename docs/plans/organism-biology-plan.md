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
applied), and every anatomy reader moves onto it. `Body` builds itself: the
expansion of modules into parts is its construction, not a second module. Parts gain a third role
(`produces`), a third combination rule (max), an integument, sense organs, a
fill, and states (regrowing, sealed). Lists on the side retire: `sensoryPorts`,
`locomotionModes`, `breathing` / `breathingByStage`, `Species.production[]`,
`Species.butcheryYield[]`.

## ⚠ Requirements conflicts — resolved 2026-11-21

Grounding found ten places where the requirements doc stated something the
code did not support. The owner ruled on three and the requirements doc was
amended (`964de5e25`); the rest are factual corrections that change no scope.
Nothing here is open.

1. **Restart (drive step 16).** Wild animals are `cast:` and are re-created
   at boot by design; a `Corpse` composes no `PersistableMixin`; a loose
   thing persists only in a persistent place. **Owner:** the restart proves
   stage persistence on the **silkworm tray**, not the wild frog. The
   severed foreleg is read back from a `PersistentHall`
   (`ContainerMixin.captureSlice` captures a loose thing there). No animal
   class gains persistence, and this plan has no kept-tadpole dependency.
2. **Named cuts.** **Owner:** the wolf, the hog and the pit pony yield named
   cuts derived from the body, and every animal gains its skin and organ
   rows. The golden is *today's rows ⊆ the new rows*; W5 lists the added
   rows per species.
3. **Dark-sight.** `Species.visionProfile` never reached live perception
   (`PerceptionMixin.getVisionProfile()` returns `null`). **Owner:** turn it
   on, the whole profile — `scotopicMin` and `photopicMax` as well as
   `bandShift`. Drive step 15 checks a dark-sighted person species sees in a
   dark place where a plain human does not.
4. Bee, silkworm and cricket name `sessile`, not "no plan". They get an
   `insect` plan.
5. Nothing counts oxen today. The ox register is a `Herdbook` row
   (`hearts-delight/.../thing/ox-book.yaml`). D8 adds the composition read
   and the act that files a steer into it.
6. `salt-hide` is a recipe reached by `cure <hide>`, and there is no stifle
   verb (a cocoon is stifled by being held hot). The drive uses the real
   words.
7. `freshen()` has no production caller and the `event` window reads open
   always. Birth is a non-goal, so D9 brings lactation on at `mintHead` (a
   mature female whose overlay is not dried off, or whose dry period has
   run out), stated as the stand-in for calving.
8. The ledger says glands fill "the reserve axis". D2 keeps the store on
   `ProducingMixin.tapState` and says why (reviewed and kept).
9. The tutor-bot's row names `biped`, which is flesh and bone; there is no
   "no tissue" flag. It keeps the composed biped and stays valid.
10. No dielectric field exists on any material capability and nothing reads
    charge. Left to mana-economy as a named seam.

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
  `lib/metabolism/Metabolic.ts:1990`) *(survey)*.
- ⭐ **A state of the body already has a model: `Condition`.** The effect
  union `VitalEffect` (`platform/idea/Condition.ts:755`) has eight kinds:
  `vital`, `reserve`, `function`, `expression`, `convalescence`, `sedation`,
  `analgesia`, `clearance`. `Condition` carries `signature`, `progression`,
  `resolution`, `observableSigns` (`:1616`, unspoilered) with the rest at
  spoiler level 1. Rows live under
  `packages/content/platform/content/platform/idea/Condition/` in
  `circulation`, `magic`, `metabolism`, `mortality`, `pathogen`,
  `respiration`, `thermal`. `thermal/torpor.yaml` is an ectotherm's cold
  state (`expression`, an endurance drain, `resolution.by: warmth`).
- Torpor is brought on and cleared in
  `ThermalRegulationMixin.reconcileThermalCascade` (`:794`): below
  `survivableMin` an ectotherm is afflicted with torpor and an endotherm
  with hypothermia; above it both are cleared. It is called from
  `reconcileThermalRegulation` (`:339`, call at `:391`), which runs at the
  re-stamp events (`:719`, `:751`) and on a `coreTemperature` read
  (`:274`). The hot edge has two thresholds; the cold edge has one.
- ⚠ **That read writes.** `ThermalRegulationMixin.getVitalSign`
  (`:272`) calls `reconcileThermalRegulation()` for `coreTemperature`, which
  integrates slices into the stored core, spends reserves, advances
  `thermalRegStamp`, and runs the cascade that afflicts and relieves. So
  `assess`, the harness and any vital listing change a body by looking at
  it. The reconcile already has three guards the fix keeps: it returns
  while `ExecutionContextApi.worldHeldStill` (crowded-rooms D15), it only
  re-stamps for a linkdead body (`:360`), and it drops a gap past
  `MAX_REASONABLE_GAP_SEC`. Below `REG_STEP_SEC` it does nothing yet
  (crowded-rooms D18).
- Callers of the reconciling read: `Metabolic.thermalMultiplier()`
  (`lib/metabolism/Metabolic.ts:1993`, the only caller by literal);
  `VitalsMixin.getConditionBand()` (an out-of-band core adds severity,
  `Vitals.ts:1949`) and every generic vital listing (`assess`, the harness
  read). Callers of the reconcile as a **write**: `restamp()` (`:719`) and
  `exchangeWithWater` (`:751`). The cascade's own `readCore()` reads inner
  storage and never re-enters.
- **What ticks a body today: nothing general.** `behavior.md` states the
  shipped rule: *a body integrates only at its own changes, its own acts'
  reads and a deliberate read of it.* The deliberation beat reaches only
  `BehavedMixin` hosts (not a player, a `Livestock` or a bare `Creature`).
  Respiration's crisis drain is a `SchedulerApi` engagement and needs
  `EngagedMixin` (`Respiration.ts:787`), which `Livestock` lacks. The one
  shipped pass that walks **every** resident object is the residency sweep
  (real-time, and presence-scoped — not used; see the wake shape below):
  `ResidencyLogic` (`/platform/idea/api/residency`) runs a
  `ScheduleApi.recurring` pass that refreshes presence
  (`presenceWalkImpl()`) and then walks `StuffApi.getAllObjects()` asking
  each cold-tail object `canEvict` (`docs/subsystems/residency.md` § *One
  sweep*). The subsystem's own title is *object self-maintenance sweeps*.
- `docs/slates/engine/respiration-slate.md` § 2 records the same defect for
  air and is **[DECIDED]**: the medium change fans out from the setter
  (`Atmospheric.setAtmosphere` → every respiring occupant one containment
  level deep gets a `reassess()`), *"not a scheduler, not a poll"*.
- ⭐ **The shipped shape for state that advances with nobody reading is a
  persisted game-clock wake** (crowded-rooms D8; `docs/subsystems/mould.md`
  § *When a set advances*; `docs/antipatterns.md` § *A read the room makes
  for everyone that changes the world*): a thing banks at its own changes
  and arms `wakeAtS` (persistent, `runtimeState`) through
  `WorldClockApi.at(…, { tag })` for when its next change is due, never more
  than `MOULD_SET_STEP_S` (one game hour, a constant) away; a restart
  re-arms and a wake already past fires at once. `MouldMixin.wakeAtS`
  (`lib/mould/Mould.ts:392-435`) and `ThermalMixin.liquorWakeAtS`
  (`lib/thermal/Thermal.ts:706-740`) are the two instances. The residency
  sweep is **not** this: it runs on real time and its presence walk makes
  the world depend on who is watching.
- Castration's host act exists: `operate <patient> [for <operation>] [with
  <kit>]`
  (`packages/content/trade-medicine/content/trade/medicine/cmd/medical/operate.yaml`).
  `patient` is `type: object`, `scope: reachable`, `requires: VitalsMixin`,
  which every `Creature` composes — so the gate already admits livestock
  and kept animals. Operations are documents in
  `packages/content/trade-medicine/content/operations/`
  (`lib/vitals/Operation.ts`); `amputation.yaml` is `resolution: severance`
  with `addresses: { flag: unsalvageable }`, and `OperateController` (`:146`)
  severs the matched part. Three things in the shipped path do not fit a
  healthy animal: `addresses` can only name a wound or the `unsalvageable`
  flag; the controller requires the patient **lying** (`:83-89`); the kit's
  default MQL names `capability.surgery`.
- **Every daylength band authored today** (grep `daylightFrom`): six
  `Species.breeding` blocks (pig, goat, sheep, cattle, dog, hen); two
  `photoperiod` tap windows (the ewe's milk 0.46–0.62, the hen's eggs
  0.45–1); three `weather` tap windows (birch, pine, hevea) and the maple's
  optional `freeze-thaw` band. Their evaluation is written twice:
  `Species.breedsAtDaylight` (`Species.ts:1600`) and `Producing`'s `inBand`
  (`:465-510`).
- Names: `Species.commonNames` and `Species.maleNames` exist, and
  `Livestock.answerToSpecies` (`Livestock.ts:397`) **stamps** keywords and
  the short description onto a head at draft, so a stamped calf can never
  come to answer to *ox*. `build/naming-overhaul`'s plan does not mention
  `maleNames`, `commonNames` or a species rung (grep of its plan); its WC5
  makes holders name their own entries (`HerdRegistry.ts:367`) and stops
  cloning exemplars to read keywords in `Butcherable.ts:292`.
- A traverse has no duration to scale (the audit: `crossingRealS` is 0 for
  a step; `LoadBearing.ts:25` calls pace a non-goal). Its cost is
  `ExertingMixin.traversePowerW` (`lib/exertion/Exerting.ts:497`).
- Q10 at a 283 K core already gives about 0.08 of the basal rate
  (`Metabolic.ts` ~326, ~1990).

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
  (`lib/document/DocumentKinds.ts:110`). ⚠ On `origin/build/naming-overhaul`
  that file is **deleted**: a kind is declared at
  `<pack>/content/kinds/<leaf>.yaml` (`title:` plus `traits: { shipped:
  { dir }, catalogued: { by, load } }`; the planner read
  `packages/content/platform/content/kinds/shape.yaml` on that branch). A
  pack that ships a kind declares it or requires its declarer, and leaves
  are unique across packs (`ground` already declares `body`). D1 follows
  that shape.
- `StuffApi.ensureConstituent(path, holderPath?)` exists
  (`api/stuff.ts:970`) — the explicit door a setter uses to load a row it
  cites.
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

- Whether a lamp accepts any combustible liquid or only one tagged
  `lamp-oil` (`platform/thing/Lamp.ts:172`), which decides the whale-oil
  row's tags.
- `Creature.getMass` (`lib/creature/Creature.ts:893-960`) seeds its frame
  once; the exact write site D8 changes was not read line by line.
- `WorldClockApi.at`'s exact signature and cancel shape (taken from the
  mould's use, not read), and that `testharness clock-advance` fires due
  wakes (the coordinator's statement).
- The length of a game hour in real time, so D17's per-body wake cost is
  stated as a count, not a rate; W6b measures.
- Whether a player can make a handled calf lie down, which decides whether
  castration's `posture: any` is needed or merely kinder (D8).
- The `ToolMixin` capability a stockman's knife offers (D8's `instrument`).
- How `lint:closed-vocabularies` wants a new closed tuple declared.
- Which rows, if any, author `respires: false`.
- The exact count of 91 species rows (the planner counted 87 naming
  `class: /platform/idea/species/Species` plus rows under other spellings).

*Closed since the first draft:* constituent loading for derived parts (D1
makes `modules` a non-constituent field and ensures every tissue and
integument path explicitly).

## ⭐⭐ New substrate

Every item cites its ledger row. Each was checked against P9–P14 (P9:
predictable from the def and help · P10: metadata is a document · P11: no
caller branches on the destination · P12: no synonym · P13: fits the host's
header sentence · P14: nothing moves or decides invisibly).

| # | item | ledger row | P9–P14 |
|---|---|---|---|
| S1 | **`body-module` document kind** (declared in the platform pack's `content/kinds/body-module.yaml`, shipped dir `body-modules/`) + value class `lib/species/BodyModule.ts` + `platform/idea/BodyModuleCatalogue.ts`, reached by `SpeciesApi.modules()` | *module composition* — generalize | P9 n/a (no command). P10 yes, a document, not an Idea. P11 none. P12 new concept. P13 n/a. P14 expansion is pure and deterministic. |
| S2 | **`lib/species/Body.ts`** — the value object every anatomy reader asks: parts, interior test, surface shares, slots-at, producers, sense organs, breathing, gaits, integument, fill. ⭐ **Its constructor is the expansion** (plan data + module documents + a variant → parts, shares renormalized); there is no separate expander. Import-pure (types and the two closed tuples only), so `lint:anatomy` constructs it | *governs / serves*, *breathing from organs*, *locomotion* — generalize | P9 n/a. P10 n/a (derived, never authored). P11 none. P12 **replaces** `BodyPlan`'s anatomy getters, which are deleted in the same wave. P13 one concept: *the body of one individual*. P14 pure. Instance methods only (`lint:lib-statics`). |
| S3 | `OrganismMixin.getBody()` | *sex, age* — reuse | P9 n/a. P11 none. P12 replaces `getSpecies()?.getBodyPlan()` at 36 sites. P13 the header is runtime biology of one organism. P14 a read. |
| S4 | `BodyPart` fields `produces`, `sustains`, `senses`, `breathes`, `gait`, `integument`, `fill`, `regrows` | *produces*, *sense organs*, *breathing*, *integument*, *module fill*, *part states* | P9 n/a. P10 fields on module documents. P11 none. P12 `sustains` is the third rule, not a synonym of `serves`. P13 all are facts about a part. P14 none act. |
| S5 | Three capacities: `vision`, `hearing`, `filtration` (+ `smell` read by `Olfactory`) in `BODY_CAPACITIES` | *governs / serves* — reuse; *sense organs* | P9 shown by `assess`. P10 a closed kernel tuple, as shipped. P12 none exist. P13 fits *what a body can still do*. |
| S6 | `BodyPartDelta` gains `lostAtAgeDays`, `sealed`; `VitalsMixin.lostParts` (an authorable instruction field: a row may author a body that arrives already missing a part) | *part states* — generalize the delta | P9 n/a. P13 the delta is *what differs on this instance*. P14 regrowth happens at the body's own reconcile and `look` words it. |
| S7 | `ConditionApi.sever(body, partKey, cause)` → `ConditionLogic` (sever, mint, place), a `subtree` option on `mintCorpseFrom`, and `Corpse.subtree` | *severed part* — generalize the corpse | P9 n/a. P11 none: the one sever entry for every caller. P12 replaces direct `severPart` calls; `severPart` becomes its participant-gated half. P13 `Corpse` is *a body without agency*; a part of one is the same thing. P14 the part lands in the body's own place by `ContainmentApi.move`, and the room is told. **No new class**, but not free: D7 lists what the mint and the corpse's readers must learn. |
| S8 | `TissueMixin.comesOffAs` (a tissue material names the rows it leaves a carcass as) | *cut maps* — generalize | P9 n/a. P10 a field on existing material rows. P11 none. P12 replaces `Species.butcheryYield`, deleted. P13 the header is *it came from a living thing*. |
| S9 | Flaw kinds `slashed`, `burned`, `nicked` and `Flaw.site` on `FlawedMixin`; a puncture is the shipped `holed` | *integument as pelt* — generalize hide → pelt | P9 `look` words them. P12 no `pierced`: a hole is `holed`, with its one leak rule (a holed skin makes a leaking waterskin, for free). P13 the header is *the flaws a body carries*. **No new mixin.** |
| S10 | **Phenology**: `Species.phenology: [{ condition, trigger }]` (a field), `VitalsMixin.reconcilePhenology()` (the trigger evaluation, run from the thermal reconcile), and eight new **Condition rows** in the platform pack | *body states* — **generalize** `Condition`: a state is a condition; the new piece is what brings one on and clears it by daylength, core temperature, sex, stage or an event | P9 `look` shows `observableSigns`, `assess` names the condition, `help milk` names lactation. P10 rows of the shipped `Condition` Idea; no new class, kind or catalogue. P11 none. P12 no second state model, **no new effect kind**, no wake of its own. P13 `VitalsMixin` owns conditions; `Species` owns what a kind of body does on a schedule. P14 a condition comes on only at the body's wake, its own change, or a named act. |
| S11 | `Species.variants` (sex, stage, then neutered deltas), `Species.development` (plan and name per stage), `Species.pays` | *sex, age*, *metamorphosis*, *square-cube check* | P9 n/a. P10 fields on existing rows. P13 species facts. Each has a reader outside `Species.ts` in the wave that adds it (`lint:unconsumed-seams`). |
| S12 | **Castration as an operation**: `packages/content/trade-medicine/content/operations/castration.yaml`; two optional fields on the operation document (`addresses.part`, `posture`); `VitalsMixin.operable()` (the whole operation match, moved off the controller); `HeadOverlay.lostParts` and seeded traits; `Herdbook.neuteredFraction`; the `herd enter` view | *reproductive states, castration* | P9 `operate <animal> for castration` is the shipped def; an operation that addresses a healthy part is **never** chosen by a bare `operate`. `herd enter <animal> in <herd>` says what it does. P10 the operation is a document. P11 none. P12 **no `castrate` verb**. P13 an operation document is *what an operation is*; no season on it. P14 the body answers every refusal, and nothing is operated on that was not named. |
| S13 | `Silkworm` (class in `trade-sericulture/src/agent/`, **on `Creature`**, as `Livestock` is — not `Beast`, which is a deliberating `Actor`) and `LarvalClock` (value object in its `lib/`, extracted from `RearingMixin`) | *metamorphosis* — the tray becomes the compression (ranching D19) | P9 `put`/`get` on a tray, as today. P12 none. P13 one clock, two holders. P14 see D10: the exemplar is content you can see, and it is minted only by an act (`put`, `get`), never by a read. |
| S14 | `lint:scaling` (`packages/server/scripts/check-scaling.ts`) | *square-cube check* — **genuinely new** gate (`lint:anatomy` is structural only) | n/a for P9–P14 beyond P3: it never refuses a creature, it fails a row over a limit with no `pays`. |
| S15 | `testharness` subcommands `body`, `body-wound`, `body-sever`, `body-kill`, `daylight-pin`, `daylight-unpin`; the shipped `afflict` given an object target | staging tooling this build owes | P9 test-world only; `help testharness` documents each; hyphen compounds, never nested. P11 `type: object` targets, `enum` words, reason rows. P12 plain setters are **not** subcommands; `carcass` is not one; `afflict` keeps its name (no second word for one act) and loses its string-name matcher. No `isWizard` check. |
| S16 | **One game-clock wake per body**: `ThermalRegulationMixin.thermalWakeAtS`; (pack) wakes on `RearingMixin` and `Cocoons`; the setter fan-out `Atmospheric.setAtmosphere` → occupants' `reassess()` | *body states* / *metamorphosis* — **reuse** the shipped wake shape (`MouldMixin.wakeAtS`, `Thermal.liquorWakeAtS`) and build respiration-slate § 2 **as decided** | P9 n/a. P10 n/a. P11 none. P12 more instances of one shape, not a scheduler, a sweep or a hook; phenology rides the body's one wake rather than arming a second. P13 the wake sits beside the stamp it advances. P14 this is what makes a change happen with nobody reading, on the world's clock. |
| S17 | **`DaylengthBand`** — one value object (`lib/time/DaylengthBand.ts`) over the shipped keys `{ daylightFrom, daylightTo, rising? }` with `holds(fraction, rising)` | *part states* (the ledger's *calendar windows*) — **generalize** the two shipped evaluators (`Species.breedsAtDaylight`, `Producing`'s `inBand`), both deleted | P9 n/a. P10 a value class; bands stay authored where they are facts, under the keys rows already use. P12 replaces two copies of one sentence. P13 one concept. P14 pure. |

Explicitly **not** new: **no mixin at all**, **no hook**, no new verb for
castration, no new `VitalEffect` kind, no timer or sweep, no Api (one static
on `SpeciesApi`, one on `ConditionApi`), no logic singleton, no collection,
no registry, no pelt class, no severed-part class, no integument mixin, no
body-state model. One document kind (`body-module`), one value object for
daylength, one new view (`herd`).

P1's second half — *is the specific one gone?* — per generalization:
`BodyPlan.bodyParts` as an authored field, `sensoryPorts`, `locomotionModes`,
`breathing`, `Species.breathingByStage`, `Species.production`,
`Species.butcheryYield`, the `sex` and `window: event` halves of `TapSpec`,
and `BodyPlan`'s anatomy getters are each **deleted in the wave that
replaces them**, with every row re-authored in that wave. For states the
question runs the other way: the general thing (`Condition`) already
existed, so the specific one this plan first drafted (a `BodyStateMixin`
with its own document kind) **is never built**, and the hardcoded
torpor-or-hypothermia choice in the thermal cascade stays the thermal
rule it is while the schedule-driven onsets go through one evaluator.

## Plan-level decisions

### D1. Modules are documents; a plan is a list of them; keys do not change

A **module** is a `body-module` document in a pack's `content/body-modules/`
(path `<root>/body-modules/<name>`; `species-and-names` ships the shared
ones, a pack its own shapes). It holds a subtree of parts with **relative**
keys, tissue **weights** (any positive numbers), roles, an integument and a
fill.

**The kind is declared, not listed.** `body-module` is declared in the
**platform pack**, at
`packages/content/platform/content/kinds/body-module.yaml` (`title:` + `traits: { shipped: { dir: body-modules },
catalogued: { by: /platform/idea/BodyModuleCatalogue, load: use } }`), the
shape `build/naming-overhaul` gives `shape.yaml`. The platform declares it
because every pack that ships an animal ships modules, and a pack must
declare a kind or require its declarer. The leaf is checked unique
(`ground` holds `body`). ⭐ **W1 merges `origin/master` first.** If
naming-overhaul has landed, the yaml file is the whole declaration. If
it has not, W1 also adds the stanza to `DOCUMENT_KINDS` **as a shim**,
marked for deletion at the merge that removes the const.

A `BodyPlan` row authors `modules:` instead of `bodyParts:`:

```yaml
modules:
  - { module: /stuff/body-modules/torso-mammal, as: [body.torso] }
  - { module: /stuff/body-modules/head-mammal,  as: [body.head],  at: body.torso }
  - { module: /stuff/body-modules/limb-fore,    as: [body.leg.frontLeft, body.leg.frontRight],
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
- A species adjusts through `Species.variants` (D8) and a top-level `body:`
  block (`scale: { <as key>: factor }`, `add: [module entries]`,
  `integument: { <as key>: … }`). Scaling renormalizes.
- **Loading.** `modules` is a plain persistent field, **not** a constituent
  reference. `BodyPlan.setModules` is async (the `Shaped.setShape` shape):
  it ensures each module document through `SpeciesApi.modules()`, builds the
  default `Body`, and then **awaits `StuffApi.ensureConstituent` for every
  tissue path and every integument material path the expansion produced**,
  with the plan as holder. A path naming no row throws at hydration. A
  species does the same in its own async setters for the modules its `body:`
  and `variants` add. `bodyParts` stops being a field; `lint:anatomy`
  refuses the key on a row.
- ⭐ **The expansion is `Body`'s constructor.** `new Body(planData, modules,
  variant)` is the only place parts are computed; `BodyPlan` and `Species`
  hold `Body` values and never part lists. `lint:anatomy` imports `Body`
  (import-pure) and checks the body of **every species variant**: (a) sum to
  1 survives as a regression check; new clauses — every module path
  resolves; every exterior part has an integument that resolves to a
  material row (from W4); every `comesOffAs` row resolves (from W5); every
  `produces` yield resolves (from W3); every `development` plan resolves
  (from W8); no two instances share a key.
- The nine plans are re-expressed in W1 with **identical keys and identical
  shares** (a golden captured in W0 compares them to 1e-6). New tissues
  arrive in later waves, each taking its share from `flesh`, never from a
  named muscle.
- `swine` stops re-authoring the quadruped list: it becomes the quadruped's
  modules with a `torso-swine` module and scaled limbs.
- `sessile` stays an empty plan for the 41 plants. Bee, silkworm and cricket
  move to an `insect` plan.
- ⭐ **Legacy plan fields are proxied, not orphaned.** `Body` answers
  `modalitiesIn(medium)`, `gaits()` and `breathing()` from W1. Until the
  wave that derives each from parts, `Body` reads the plan's still-authored
  `sensoryPorts` (to W9), `locomotionModes` (to W3) and `breathing` /
  the species' `breathingByStage` (to W8). Each field and its proxy branch
  are deleted together in that wave. No reader outside `Body` touches them
  after W1.

*Why documents:* a module is metadata nothing writes, read by path (P10); a
`SingletonMixin(Idea)` with rows would raise `lint:data-ideas`.

### D2. `produces`: the gland is a part, the store stays on the tap host

A part may author `produces:` — a `TapSpec` minus `sex` (the gland exists
only on the sex whose delta adds it; sex deltas land in W2, **before** this,
so no bull milks in between) and, from W7, `activeIn?: <condition path>`.
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
  stays as shipped through W6 and retires in W7 in favor of `activeIn:`
  the `lactating` condition (D8).
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
4. **Insulation.** The coat is counted **outside `Attired`**, whose header
   is *a body with clothes on it*. `ThermalRegulationMixin` sums worn clo
   and integument clo at its three read sites (`:186`, `:214`, `:380`):
   `bodyInsulation()` as shipped, plus a private `coatInsulation()` that
   walks the body's exterior parts by surface share — the way natural armor
   joins the stack in `resolveCoveringStack`, not inside the wearer's walk.
   The coat's clo follows the garment's own law (`thickness / k_eff /
   R_CLO`, `k_void` through `material.wetProperty` with the **body's**
   wetness). Its depth is `depthM × cycle factor × standing fraction`,
   where the standing fraction is `standingIn(key) / capUnits` when the
   coat is also a producer (the fleece) and 1 otherwise. Skin alone
   contributes nothing, so persons are unchanged. `ThermalRegulation`
   already runs for every animal.

   *What makes "the shorn sheep reads colder" observable:* shearing empties
   the fleece's standing, the coat term falls, the low band narrows, and
   core temperature drifts. The drive reads `coreTemperature` through the
   harness (the step is `staged`), and a player sees the third-person shiver
   line this build adds to `look` (the self-only cue at
   `ThermalRegulation.ts:984` gains a `markupAugmenter` twin).

### D4. Tissue materials are rows under existing kinds

No new kind class. **The rows land in W1**, before any module cites them
(W3's kidneys, udder and swim bladder; W4's skins and coats). New rows in
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

⚠ **Two gates read the lists this retires and must learn the new
references in the same wave**, or they go blind and pass:
`lint:census` (`check-template-census.ts` ~518–550 reads
`production[].yieldRow` and `butcheryYield[].cut`) and
`check-reachability.ts` (~497 counts a cut reachable through its `cut`
faucet). W3 teaches both `produces.yieldRow` on module documents; W5 teaches
both `comesOffAs` on tissue material rows.

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

**The golden is containment, not equality** (owner): for each of the 15
yielding species, every row it yielded before this build is still yielded.
The wolf, the hog and the pit pony move onto named muscles and so gain named
cuts while keeping `stew-meat` and `offal` (generic `muscle` and organ
`flesh` still name them). Every animal also gains its skin row and its organ
rows. W5's commit lists the added rows per species.

`Species.dressOut` keeps the arithmetic and loses the list parameter;
`Species.butcheryYield`, `ButcheryYield`, `no-yield`'s list test (it becomes
*no row came off*) and `lint:anatomy` clauses (b), (c) retire.
`conditioned: false` becomes a property of the tissue's kind (skin and bone
do not scale with condition). `maxAgeDays` (the vell) becomes a stage delta:
the calf's abomasum is a part of the `newborn` variant only. Stage deltas
exist from W2, so the vell never lacks a home.

**The integument is the first line of every carcass.** A bare
`butcher <carcass>` takes it before any cut. `butcher <carcass> for <word>`
takes the one line that word names, and each coat answers to **its own
word**: only the hide row answers to `pelt` (and `hide`, `skin`); the
feather row answers to `feathers`, the down row to `down`, the scales to
`scales`, the carapace to `carapace` and `shell` to `shell`. A hen's
`for feathers` takes the feathers and leaves the down; nothing is tied, so
nothing prompts. `lint:anatomy` gains a clause: within one body's lines no
two rows share a word. The word is read off the **row** (naming-overhaul WC5
removes the exemplar keyword clone at `Butcherable.ts:292`; W5 builds on
whichever is on master after its merge and adds no second lookup).

One skin comes off, with:

- a flaw per wound on an exterior part, by mechanism: `point` → the shipped
  **`holed`**; `edge` → `slashed`; `heat` **and `corrosion`** → `burned`
  (a caustic burn is a burn to a tanner: the grain is gone either way);
  `blunt` and the rest mark nothing. Each carries `site` = the part;
- **the skinner's hand**: skinning is one more line with a difficulty
  (`standard`); a hand below `handFor(difficulty)` adds one `nicked` flaw per
  missing band, on the largest parts first — derived, never rolled;
- **skin before cuts**: a cut taken from a part whose integument is still on
  adds a `slashed` flaw there when the skin is later taken.
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
  has two halves:
  1. **the delta half** — `VitalsMixin.severPart(key, { lostAtAgeDays,
     sealed })`, gated to `ConditionLogic` and to the applier by a
     participant contract. It marks the subtree and releases held things. It
     mints nothing and wounds nothing.
  2. **the mint half** — `mintCorpseFrom(host, slices, cause, now,
     { subtree: key })`, then `ContainmentApi.move` into the body's place.

  `AVULSION_BEHAVIOR.onset` stops calling `severPart` itself;
  `ConditionLogic.inflict` calls `sever` after `afflict` accepts the wound
  (the ordering rule the avulsion comment already states).

  ⚠ **The mint is not free.** Today `mintCorpseFrom`
  (`ConditionLogic.ts` ~784–880) stamps *the body of X*, `ofIdentityPath`,
  the whole mass and the whole body's keywords, and every corpse reader sees
  the whole plan. With `subtree` it must:
  - word the short and long description from the body's common name (D8) and
    the part (*a wolf's foreleg*), and stamp keywords for the part, not the
    body;
  - set mass to the subtree's share of the body's mass;
  - fork the Trauma slice filtered to the subtree's parts;
  - **mark the subtree's complement missing in the forked deltas**, so
    slots, butchery (D5), surface shares and insulation all read only what
    is there, with no reader learning about `subtree`;
  - leave `ofIdentityPath` empty (a part is not the person's body of
    record) and keep `_speciesPath`, `bornAt` and `diedAtGameSec`.

  And one reader must learn it: `missingPartsAugmenter` (`Vitals.ts:1178`)
  is suppressed when `subtree` is set, or a foreleg would read *missing the
  head, the torso…*. `PostmortemMixin` needs no change (it reads the clock).
  The whole body's own corpse, minted later, already inherits the missing
  foreleg through the Anatomy slice.
- **A body may arrive already missing a part.** `VitalsMixin.lostParts:
  [{ part, atAgeDays, sealed? }]` is an authorable **`seed`** field
  (`fieldMeta` `seed: true`, the applier's phase 3): it runs **at mint
  only** and calls the delta half. On a restore the persisted
  `bodyPartDeltas` are the truth and `lostParts` is not replayed, so a claw
  that regrew is not severed again by its own row. It is how `ox.yaml`
  authors its castration and how a herd replays any loss (D8). It never
  mints a part or a wound.
- **Closed lists.** `sealed` (`heat`, `corrosion`), `fill`, `gait` and the
  flaw kinds are closed tuples; W3, W5 and W6 declare each the way
  `lint:closed-vocabularies` requires (read the gate first).

### D8. Variation: sex, castration, age, reproductive conditions

- **`Species.variants`** (sex and stage in W2; `neutered` in W7):
  `sex.<sex>`, `neutered`, and `stage.<stage>`. A variant **overrides the
  species' own fields by their own names** and adds body deltas:
  `commonNames`, `biddability`, `handlingRange`, `adultMass` scaling
  (`massFactor`), and for the body `add` modules, `scale` modules and
  `integument`. `species.bodyFor({ stage, sex, neutered })` memoizes one
  `Body` per key, and the species' getters gain the same key
  (`getCommonNames(variant)`, `getBiddability(variant)`,
  `getHandlingRange(variant)`). `OrganismMixin` gains the one read that
  hides the key from callers: `getCommonNames()` =
  `species.getCommonNames(this body's variant)`.
- ⭐ **One naming path, read late.** There is no `called` field. A bull is
  a bull because `variants.sex.male.commonNames` says so; a steer and an ox
  by `neutered` and stage. `Species.maleNames` retires, and so does
  `Livestock.answerToSpecies`' stamp (`:397`, called from
  `HerdRegistry.ts` ~808): nothing writes species words onto a head at
  draft, which is what lets a calf come to answer to *ox*. Two readers take
  its place, and **both are needed**:
  - **Targeting.** The stamp is today the *only* thing that puts species
    words on a head (the generic row's keywords are `of, head, stock,
    animal, beast`), and MQL and `call` match on `getKeywords` (the fold at
    `lib/description/Detailed.ts` ~234). So `Livestock` overrides
    `getKeywords(viewer)` as a **late fold**: the row's keywords from a
    typed `super.getKeywords(viewer)`, plus `this.getCommonNames()`,
    lowercased and de-duplicated. `operate calf` binds because the calf's
    variant says *calf* at the moment of the bind.
  - **Presentation.** The species rung in `lib/stuff/Stuff.ts` (~466 and
    ~500) calls `getSpecies()?.getCommonNames()[0]` with no variant. Both
    sites change to `this.getCommonNames()[0]` (the organism's read above),
    so every body's handle follows its variant with no caller holding a
    key.

  Naming-overhaul's plan does not mention these fields (grepped). Its
  `call` path asks a body `answersToCall(text)` over its own name and
  keywords, which the fold feeds; W2 re-checks that after merging master.
- ⭐ **One temper dial.** `HandlingMixin` reads
  `species.getHandlingRange(variant)` and `getBiddability(variant)` — the
  two shipped species dials, overridden by the variant. There is no
  `temper` field and no temper effect on a condition. The ox is calmer
  because its `neutered` variant authors a higher `biddability`.
- **Castration is an operation** (owner, 2026-11-22):
  `operate <animal> for castration`. The male delta adds a `gonads` part;
  `packages/content/trade-medicine/content/operations/castration.yaml`
  (`resolution: severance`, `anaesthesia: none`, `addresses: { part:
  gonads }`, `posture: any`) severs it through `ConditionApi.sever` (D7),
  wound, risk and the part on the floor included. **`neutered` is
  derived**: male, gonads missing, and `lostAtAgeDays < matureAt`. It works
  on any male body with the part — a bull calf, a pit pony, a dog.
- **No season on the operation.** A daylength band there would have one
  consumer and would legislate a custom. A farmer who cuts in fly season
  pays what an open wound already costs: the shipped open-wound sepsis
  clock and the wound's own care quality. Nothing is added.
- ⛔ **A bare `operate` never castrates** (P14). An operation whose
  `addresses` names a healthy `part` matches **only when it is named with
  `for`**. Without that rule castration would match every entire male, and
  `operate bull` on a bleeding bull would pick it (the shipped match sorts
  by `wound?.severity ?? 5`, `OperateController.ts` ~260).
- **What `operate` needs to reach an animal.** Its view gate already does
  (`patient` requires `VitalsMixin`, which every body composes). Two
  optional fields on the operation document, each defaulting to today's
  behavior: `addresses.part` (a module part name; the match is the body's
  present part of that name) and `posture: lying | any` (default `lying`).
- **One place refuses.** The whole match moves onto the body:
  `VitalsMixin.operable(named, ops)` holds what `OperateController`'s
  `matchesFor` holds today (the wound and flag matches, the sort, the
  posture and anaesthesia gates) plus the part match and the named-only
  rule, and answers `{ ok: true, op, partKey?, wound? }` or
  `{ ok: false, reason, facts }`. The controller calls it and
  `this.refuse(context, answer)`; its `this.fail(text)` sites (~83–114,
  ~265) go, and each wording becomes a reason row. New reasons:
  `no-such-part` (a female, or already done). There is no class check and
  no refusal worded in the controller. The kit is named (`with knife`); the
  row's `instrument` is the capability a stockman's knife offers. Nothing
  is added to `Livestock`.
- **On a person it follows `operate`'s existing rule, unchanged.** No
  livestock-only special case. The rule that exists is the patient's hold
  (`lib/vitals/OperationEngagement.ts`): the operation occupies the
  patient's body, and **a conscious patient can end it** (the thrash); only
  an anaesthetised one cannot. With `anaesthesia: none` the patient is
  conscious, so a person being operated on can always stop it. `operate`
  writes no accountability event of its own today (grep), for amputation
  either; the sever's wound carries `inflictedBy` as every inflicted wound
  does. This build changes neither fact.
- **The herdbook records it, generically.** `HeadOverlay.lostParts`
  (`[{ part, atAgeDays, sealed? }]`) replaces a castration-only field:
  `returnToHerd` writes the head's missing subtree roots, and `mintHead`
  seeds them through the delta half (D7), so a drafted head that lost an
  eye keeps the loss across `return`, and a steer stays a steer. ⚠ Never
  `ConditionApi.sever` on replay — that would mint fresh gonads and a fresh
  wound at every draft. `Herdbook.neuteredFraction` (default 0; the ox book
  authors 1) seeds founding stock the same way. The herd's composition read
  counts by the variant's common name (*two oxen*, *one steer*).
- **Moving a head between registers is its own act: `herd enter <animal>
  in <herd>`.** Nothing today moves a head from one herd to another, and it
  is not `return` (which gives a head back to its own herd — one verb per
  act). It is an institution's transaction, so it is a subcommand of its
  noun (`title transfer`, `shelf consign`; `lint:institution-verbs`): a new
  view `herd` in `trade-ranching` with the one subcommand `enter`. The noun
  is right: the record *is* the herd, and herding is `move`.
  - `animal` is `type: object` requiring `HandlingMixin`. `herd` is
    **`type: string`** with the preposition `in`, exactly as `draft` and
    `move` take a herd: `Herdbook` is `FixtureMixin(Thing)` with no mixin
    of its own to gate on, and none is declared. The controller resolves
    the word with `registry.pick(named, where)`, the registry's own naming
    (naming-overhaul WC5).
  - `HerdRegistry.refile(fromId, index, toId, by)` decides, and refuses by
    reason row: a null `by` (it checks this itself; `requireActor` lets
    null through), a `by` that is not the actor (`AccessApi.requireActor`,
    `lint:actor-claims`), an actor who may not keep the **source** herd
    *or* the destination (`mayKeep` on both — `cull`'s precedent,
    `HerdRegistry.ts` ~587–601), a different species, a head not drafted.
  - ⚠ **A refiled head takes a new index, and a head is seeded from
    `(herd, index)`.** So the destination's overlay entry carries the
    head's **seeded traits explicitly — sex first**, then the seeded
    handling, flesh and age — beside `lostParts`, and `mintHead` prefers an
    overlay value to the seed. Otherwise the ox book would redraw the steer
    as a cow.

  Drive step 9: operate on a drafted calf, age it, `herd enter steer in
  oxen`, read the book — one more ox.
- **The ox** is cattle + male + neutered + mature. `ox.yaml` authors
  `sex: male` and `lostParts: [{ part: body.torso.gonads, atAgeDays: 60 }]`
  instead of being a bare `Livestock`.
- **Growth (W2).** `Species.massAt(age, variant)` becomes von Bertalanffy
  (`W∞ (1 − b·e^(−kt))³`, `k` derived from `matureAt` so 95 % is reached
  there; no new authored number). `Creature.getMass` stops freezing the
  seeded frame for a body whose `getLifeStage()` is non-null and whose row
  authored no mass: it derives on read. Stage deltas carry proportions (the
  young's big head and long legs as `scale`) and the coat.
- **Reproductive states are conditions, on one schedule** (D9).

### D9. Phenology: conditions on a schedule

**A state of the body is a `Condition`.** A `Condition` already has a
`signature` of effects, a `resolution`, `observableSigns`, a place on every
`Creature` through `VitalsMixin`, and `assess` to read it.
`packages/content/platform/content/platform/idea/Condition/thermal/torpor.yaml`
is the proof — an ectotherm's cold state, brought on by core temperature and
cleared by warmth. Nothing new models a state. **What is new is
phenology**: the timing of a body's seasonal and life events.

**The rows** (platform pack, beside `thermal/`). Every effect is a shipped
`VitalEffect`; **no kind is added**:

| row | brought on by | signature | reader that makes it matter |
|---|---|---|---|
| `thermal/sluggish` | the thermal cascade (below) | `expression` 1 | expressed skill, and the traverse's exertion cost |
| `dormancy/denning` | phenology: short days and a cold core | `sedation` | consciousness; an unconscious body does not eat and its brain's beat is skipped |
| `reproduction/in-season` | phenology: the species' `breeding` band, female, mature | — | `Livestock.serveBy` (replacing its direct daylength read) |
| `reproduction/rut` | phenology: the same band, male, mature, entire | `reserve` (a satiation drain: he eats less and burns mass) | `breedRefusal`'s *no male* reads a male in rut |
| `reproduction/lactating` | phenology: daylength for the ewe; freshening for the cow and the goat (as `hircus.yaml` authors) | — | the udder's `activeIn` |
| `reproduction/laying` | phenology: the hen's long-day band, female | — | the oviduct's `activeIn` |
| `reproduction/pregnant` | staging only (conception is a non-goal) | `reserve` (a satiation drain) | `assess`, `look` |
| `reproduction/with-young` | staging only | — | `assess`, `look`; game law |

Each row authors `observableSigns`, which `look` and `assess` show.

**What the first drafts added and this one does not:**

- **No `pace` effect.** A traverse has no duration to scale. `sluggish`
  costs through the shipped `expression` effect, and
  `ExertingMixin.traversePowerW` (`:497`) multiplies by `1 + bands ×
  exertion.suppressedPowerPerBand`, reading the body's existing expression
  suppression: a slow body pays more to cross, which is where slowness
  lives in this engine.
- **No `metabolism` effect.** Denning needs none: its trigger includes a
  cold core, and Q10 at 283 K already gives about 0.08 of the basal rate; a
  second factor would count the cold twice. The other costs are amounts per
  hour, which the shipped `reserve` effect says.
- **No `temper` effect** (D8: one dial).

**Sluggish and torpor are two rows of one rule.** The thermal cascade
(`ThermalRegulation.reconcileThermalCascade`, `:794`) already has this shape
on the hot edge: hyperthermia's row comes on at `setpoint + 2.5 K`, and the
lethal dwell reads `survivableMax`. The cold edge has only the far
threshold. For an ectotherm the cascade gains the near one: **`sluggish`**
below `setpoint − THERMAL_DEFAULTS.SLUGGISH_ONSET_K` and **`torpor`** below
`survivableMin`, exactly as shipped. Two rows, not one with stages, because
`requiresConscious` gates on torpor's path and signature effects are not
stage-indexed. This is the thermal rule's, not phenology's.

**One daylength value object.** Every band in the game is a
`DaylengthBand` (`lib/time/DaylengthBand.ts`) with `holds(fraction,
rising)`. It reads the keys rows already author — `daylightFrom`,
`daylightTo`, `rising` — so **nothing is renamed** and the six `breeding`
blocks do not change.
`Species.breedsAtDaylight` and `Producing`'s `inBand` are deleted into it.
Where each band authored today goes:

| authored today | goes to |
|---|---|
| six `Species.breeding` blocks | stay on `Species.breeding`, typed as the band. **`in-season` and `rut` read it** (`trigger: { season: breeding }`) and never re-author it |
| the ewe's milk `window: photoperiod` (0.46–0.62) | a `phenology` entry for `lactating` on the sheep. The tap's `photoperiod` kind **retires** |
| the hen's eggs `window: photoperiod` (0.45–1) | a `phenology` entry for `laying` on the hen |
| the cow's and goat's milk `window: event` | `lactating` by freshening (below). The `event` kind **retires** |
| birch, pine, hevea `weather` windows; the maple's `freeze-thaw` | stay on the gland's `window` (a tree carries no conditions, and the term beside the band is the air's temperature), with the band typed as the value object |
| *(new)* the coat's `cycle` | authored as the value object |

**Phenology is declared on the species:**

```yaml
phenology:
  - condition: /platform/idea/Condition/reproduction/lactating
    trigger: { daylightFrom: 0.46, daylightTo: 0.62, sex: female, stage: adult }
  - condition: /platform/idea/Condition/reproduction/rut
    trigger: { season: breeding, sex: male, stage: adult, entire: true }
  - condition: /platform/idea/Condition/dormancy/denning
    trigger: { daylightFrom: 0, daylightTo: 0.42, coreBelowK: 283 }
```

A trigger is a conjunction of the terms it authors: a daylength band (or
`season: breeding`, the species' own), `coreBelowK` / `coreAboveK`, `sex`, `stage`,
`entire`, or `event: true`. The condition is carried while the trigger
holds and relieved when it stops. `Species.setPhenology` is async and
ensures each condition row, so a schedule naming no row throws at
hydration.

⭐ **One lactation schedule.** `lactating` is the only thing that says a
body is in milk. The udder authors `activeIn:` its path and nothing else;
`Producing.tapWindow` answers `not-lactating` (a new `TapClosedReason`, with
a reason row) without it. A winter ewe does not carry it, so she does not
read *in milk* and does not give. The cow's entry is `event: true`:
freshening is an act, and there are exactly two write paths: **`mintHead`**
afflicts a mature female whose overlay is not dried off, or whose
`driedOffAt` is older than the tap's `restDays` (the rest is read only at
draft today, `Livestock.ts` ~414–423, and stays there), and
**`Producing.dryOff`** relieves. So a cow that dries off while standing
drafted stays dry until she is returned and drafted again past her rest —
the stand-in for calving (conflict 7), and what the shipped rest already
does.

**Where onsets and clears happen** (never in a read — D17):

- `VitalsMixin.reconcilePhenology()` walks the species' `phenology` and
  calls the shipped `afflict` / `relieve`. No class is added.
- It runs from **one place**: `reconcileThermalRegulation()`, right after
  `reconcileThermalCascade` (`:391`). Every `Creature` composes
  `ThermalRegulationMixin` (`Creature.ts` ~198) and D17 gives every living
  body a wake at most one game hour apart, so **phenology needs no wake of
  its own**: a daylength or stage boundary is noticed within a game hour,
  and a core-dependent trigger at the moment the core is fresh.
- An event trigger is evaluated by its act.
- **`daylight-pin` is a setter and fans out**: pinning or unpinning runs
  the thermal reconcile on the living bodies in that Locality at once, the
  way a weather pin is *applied at once*. That is how the drive brings on
  denning, the season, the rut and a ewe's milk; the coat's cycle is a pure
  read of the same pinned value. There is no pin in `CelestialLogic`
  today: it is added as a `@TestOnly` slot the daylength read honors,
  reached only through `TestHarnessApi.pinDaylight` / `unpinDaylight` (the
  `pinWeather` shape, `api/test-harness.ts` ~122–140).

- **Medicine sees them**, accepted as honest: `assess` lists a cow in
  season or in milk, as a vet would. The rows author plain names
  (`spoilerName: 0`, the shipped default) and `observableSigns` anyone can
  see; `signature` and `resolution` keep the shipped spoiler level 1.
  `resolution` is authored so `treat` refuses in words.
- **Retiring `photoperiod`, `event`, `breedsAtDaylight` and `inBand`
  touches**, besides the two species rows: `lib/husbandry/__tests__/Producing.test.ts`,
  the `TapActController` test, ranching's breeding test,
  `packages/wire/tests/taps*.dirty.wire.test.ts`, `docs/subsystems/taps.md`
  and `ranching.md`. W7 updates each; the tests keep their assertions and
  change how the window is brought about.
- **Persons.** Conditions sit on every `Creature`, so a person species may
  list phenology the day someone authors it, with no host to move.

### D10. Metamorphosis: per-stage plans, one identity

- **`Species.development`**: per `LifeStage`, `{ plan, massFactor }`; the
  stage's names are `variants.stage.<stage>.commonNames` (D8).
  The stage vocabulary stays `LIFE_STAGES`. The bullfrog: `newborn` →
  `tadpole` (gills, a tail, no legs), `juvenile` → `froglet` (gills and
  lungs), `adult` onward → `frog`. It gains an `ageCurve` (it has none, which
  is why its shipped `breathingByStage` has never applied).
- **Breathing derives from organs.** A respiratory part authors `breathes:
  { medium, apparatus, intake }` (the frog's skin is its integument's).
  `Body.breathing()` is the per-medium maximum over present, functioning
  organs. `BodyPlan.breathing`, `getBreathableMedia`,
  `Species.breathingByStage`, `breathingFor` retire; `Respiration.breathingNow`
  and `Metabolic.canIngest` read the body. **Lung facts get one home**: the
  respiratory part's `breathes` block carries `volumeL` (at the plan's base
  mass), and *does this body respire* is derived (it has a respiratory
  organ). `BodyPlan.respires` and `lungVolumeL` retire with `breathing`; a
  row authoring `respires: false` (grep in W8) becomes a torso module with
  no lungs.
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
- **The silkworm.** `Silkworm` is a pack class on **`Creature`** (the
  `Livestock` rung: a body with no deliberation beat; `Beast` is
  `BehavedMixin(Actor)` and a caterpillar does not deliberate). Its stage
  comes from the pack's `LarvalClock` (degree-days, extracted from
  `RearingMixin` so the tray and the worm run one law) by overriding
  `getLifeStage()`: larva → `newborn`, pupa → `juvenile`, moth → `adult`.
  A worm on a tray reads the tray's clock; off it, its own.
- ⭐ **The tray is the compression** (ranching D19 and D21): while a rearing
  is in a larval age the tray holds **one exemplar worm as real content**,
  seeded from `(tray key, index)` so the same worm is the same worm.
  `get silkworm from tray` is an ordinary move and lowers the count by one;
  `put silkworm in tray` folds it back and destructs it (the egg lot's
  adoption shape).
- ⛔ **A read never mints.** The exemplar is minted by
  `RearingTray.refreshExemplar()`, called **only from write paths**: the
  tray's arrival and departure hooks (every `put`, every `get`), the tray's
  own game-clock wake (armed for the projected hatch off its degree-day
  clock, capped at one game hour — the mould's shape, since its temperature
  drifts), and the `@TestOnly` staging setter.
- **The cocoon is spun from the worm's own gland**: shell mass =
  larval mass × the `silk-gland` share of the fifth-age body ×
  the satisfaction terms the tray already carries. The share is calibrated
  so `meanShellMg` equals today's; a golden test pins every tray number.
  Stifle, scorch, the ten-day deadline and `unwind` keep their rules; the
  one edit is *when* emergence is applied (the stack's wake, below).
- **Emergence.** A `Cocoons` stack arms its own wake at `spunAt +
  emergeDays` (exact). The wake does what the read-time reconcile does
  today (the pierced flag, the egg lot) and mints the exemplar moth; the
  reconcile-on-read stops minting. It is never done by `look`.
- A lone worm that reaches spinning off the tray spins a stack of one
  carrying its seed, and the moth that emerges carries the same seed. *For
  the silkworm, identity is the seed (the herd's rule); for the frog it is
  the object.*
- **Staging setters.** The two setters the drive needs (`degreeDays`,
  `Rearing.ts` ~240; `spunAt`, `Cocoons.ts` ~165) are marked `@TestOnly`
  (`lint:test-seams`).

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
- **The species' vision reaches perception** (owner). `Actor` overrides
  `getVisionProfile()` (the `PerceptionMixin` null) to answer from the body
  and the species: `scotopicMin` and `photopicMax` as the species row
  authors them (retinal chemistry is declared, not derived), and `bandShift`
  **derived from the eye** — `−round(2·log2(apertureMm / REFERENCE))`,
  clamped to ±1. Persons' apertures are authored so the derived shift equals
  the `bandShift` each row authors today, and `bandShift` is then removed
  from the rows.
- ⚠ `scotopicMin` and `photopicMax` are read by **no computation** today.
  `VisionModality.perceiveFor` (`:180-200`) gains both: a raw band below
  the viewer's `scotopicMin` perceives nothing, and one above `photopicMax`
  is held at `photopicMax` less one band (dazzled). Every shipped row authors
  the widest range (`pitch-black` … `blinding` or `bright`), so the visible
  change is the nine `bandShift: -1` species seeing one band further into
  the dark and the kobold one band less — the change the owner asked for,
  proved by drive step 15.
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
| stage itself | derived from `bornAt` (already persistent) | the same; a `cast:` animal is re-created at its row's age, by design |
| a herd animal's lost parts (castration, an eye) | `HeadOverlay.lostParts` in the herd document, seeded by the delta half at draft | always |
| conditions on a schedule | none (the body's wake, through the thermal reconcile) or the act that owns an event condition | — | `Species.phenology` → condition rows in the platform pack | ensured by `Species.setPhenology` | — |
| wakes | `thermalWakeAtS` and the pack's two, each persistent `runtimeState`; a restart re-arms and one already past fires at once | the body or thing has a host record; otherwise armed afresh at mint |
| event conditions (lactating) | `VitalsMixin.conditions` (already persistent); for a herd animal, the shipped `HeadOverlay.driedOffAt` | host record, or the herd document |
| gland stores | `ProducingMixin.tapState` (already persistent; herd overlay already carries dry-off) | as today |
| the severed part | a `Corpse` with `subtree` | it lies in a persistent place (`ContainerMixin.captureSlice`, the drive's `PersistentHall`) or is carried — exactly as any other good |
| the pelt's flaws, and the leather's | `Flawed` on the same `Hide` object | the same |
| the tray's stage, the exemplar's seed | `RearingMixin`'s persistent fields | as today — **the restart's proof of stage persistence** (owner) |
| coat cycle, neutered, ox | derived | always |

No class gains `PersistableMixin`. No new collection. No migration: stored
`bodyPartDeltas` and `tapState` keep their keys (D1, D2), and a stored delta
without the new fields reads as *lost before the record began, unsealed*.

### D16. Staging tools

⛔ Three rules, each of which the first drafts broke: a command is `verb
subcommand target`, never deeper; a plain setter call is not a subcommand;
a target is an object the binder resolves, never a name a controller
matches.

**The final `testharness` surface this build adds** (test world only; every
target `type: object`, every closed word an `enum`, every refusal a reason
row, no refusal text in a controller):

| subcommand | args | through |
|---|---|---|
| `body <target> [perceiving <other>]` | `target` object; `other` object, preposition `perceiving` | **reads**: stage, sex, names, conditions, projected core temperature, capacities, and whether it perceives `other` |
| `body-wound <target> <part> <channel> [severity]` | `channel` enum of `CHANNELS` | `ConditionApi.inflict` |
| `body-sever <target> <part>` | | `ConditionApi.inflict` with a `tearing` insult at sever severity — **the real avulsion**, so the wound, the sever and (from W6) the part on the floor all happen as in play. Never a woundless severed part. |
| `body-kill <target>` | | `ConditionApi.die` |
| `afflict <target> <condition> [stage]` (shipped, changed) | `target` becomes `type: object`; stage `0` relieves | `afflict` / `relieve`. The name is kept — one word for one act — and its string-name matcher is deleted. Callers to re-check: `aether-devices.dirty.wire.test.ts` ~460, `size-and-carrying.dirty.wire.test.ts` ~793, `testharness.yaml` ~42 and ~73, `TestHarnessController.test.ts`. |
| `daylight-pin <fraction>` / `daylight-unpin` | `--at <place>` as `weather-pin` | `TestHarnessApi.pinDaylight` / `unpinDaylight`, `@TestOnly`; fans out (D9); whoever pins, unpins |

**Through `/auth/test-stage`** (`TestHarnessApi.stage`, runs as the system;
`docs/testing.md`): `setAge`, `setSex`, `setWetness`, the tray's
`setDegreeDays` and the stack's `setSpunAt`. A setter that does not exist
is added `@TestOnly` (`lint:test-seams`).

**Not tools:** a carcass is `clone` + `setAge` + `body-kill`.
`clock-advance` (shipped) fires every due wake **at the new time**
(`WorldClockRegistry.drainDue`, ~528–535), so the body's reconcile sees the
whole jump at once; D17's rule for the far-past guard is what makes that
integrate rather than vanish. The drive still steps a night in hours, so
intermediate crossings (sluggish before torpid) are observed in order.

### D17. Reading is pure; a body wakes itself on the game clock

*(Owner, 2026-11-22. The first version of this decision used the residency
sweep; that was wrong and is withdrawn — it runs on real time, reaches only
what somebody is present with, and overrode a decided slate.)*

**The read (kept).** `ThermalRegulationMixin.getVitalSign('coreTemperature')`
stops calling the reconcile. It returns **the core the body would have
now**: the stored core carried forward over `now − thermalRegStamp` against
the cached effective ambient (re-read off the room's
`envelopeTemperatureLast()`, a non-integrating read), through the same
slice arithmetic. It stores nothing, spends no reserve, afflicts and
relieves nothing, and leaves the stamp alone. `integrateThermalSlice` is
split into a **pure step** and the applier that writes its result, so there
is one formula: the reconcile applies, the read discards. The projection
reads reserve levels without drawing them down, so over a long gap it is
slightly optimistic about a body running out of fuel; the write path is
exact.

**Who relied on the read to advance state, and what each does now:**

| caller | relied on it? | now |
|---|---|---|
| `Metabolic.thermalMultiplier()` (`:1993`) | incidentally | reads the projected core; the Q10 factor is the same number; advances nothing |
| `VitalsMixin.getConditionBand()` (`:1949`), `assess`, the harness, any vital listing | yes — the only thing that updated a still body | read the projection and the conditions **already on the body**; change nothing |
| `restamp()` (`:719`), `exchangeWithWater` (`:751`) | they are writes | unchanged |
| the cascade's `readCore()` | no | unchanged |

**The wake.** The shipped shape (`MouldMixin.wakeAtS`), a third time:

- **What arms.** `ThermalRegulationMixin.thermalWakeAtS` — persistent,
  `runtimeState`; `setThermalWakeAtS` arms `WorldClockApi.at(…, { tag:
  'thermal-regulation' })`.
- **When.** At every re-stamp (a move, a change of covering or work,
  entering water) and at the end of every reconcile, wake included.
- **For when.** The projected time of the body's **next threshold
  crossing**, found with the pure step against the cached ambient: the
  sluggish onset, `survivableMin`, the hyperthermia onset, `survivableMax`,
  the end of a lethal dwell, or the clearing side of any of them.
- **The cap.** Never more than **one game hour** away
  (`THERMAL_WAKE_STEP_S`, a constant like `MOULD_SET_STEP_S`, not a dial).
  The cap bounds the error from what the projection holds still: a room
  whose envelope drifts, the weather, the reserves.
- **What it does.** `reconcileThermalRegulation()` — the banked integration,
  the cascade, phenology's core-dependent triggers — then re-arms.
- **Where it persists.** On the body, with its other runtime state: a
  restart re-arms it, and a wake already past fires at once. It is armed
  with `host: this`, as the mould arms its own (`Mould.ts` ~414), so
  destructing the body cancels it (`WorldClockRegistry.ts` ~808).
- **Whether it ever disarms.** Not while the body lives and is resident:
  it is always re-armed, at most a game hour out. It disarms at death, at
  destruct and eviction, and while linkdead. W6b measures what that costs.
- **Who has one.** Every living resident body. Destruct and eviction
  cancel it (above); a corpse has none (the cascade already returns for a body that
  runs no living processes).

⚠⚠ **The far-past guard changes meaning, or the wake integrates nothing.**
The reconcile today throws away any gap over `MAX_REASONABLE_GAP_SEC`
(four game hours; `ThermalRegulation.ts:365`, `Thermal.ts` ~142) and
re-stamps without cooling. A wake that fires late — after a restart, or
because `clock-advance` moved the clock a day and drained the due wakes at
the new time — would hit that guard and leave a frog skipped through a
night exactly as warm as it started. So:

- the guard applies **only to a body that had no wake armed** when the gap
  began (`thermalWakeAtS === 0`: it stood up from offline, or was
  linkdead) — *absence is not billed*, the guard's actual purpose;
- a body with a wake armed integrates **the whole gap**, sliced as the
  reconcile already slices (`REG_STEP_SEC`, then the remainder);
- **the read-time projection follows the same rule** (it reads
  `thermalWakeAtS` too), or W6b's *projection equals reconcile* test fails.

**An offline body does not tick.** A logged-off body is not resident and
has no armed wake; its persisted `thermalWakeAtS` is re-armed when it
stands up again with no wake armed, so the far-past guard (above) drops
the gap.
A linkdead body's wake fires, the reconcile's shipped linkdead branch
re-stamps and returns, and the wake is **not re-armed** until the body's
next re-stamp at reconnect: frozen.

**The world no longer depends on who is watching.** A frog in a pond nobody
visits goes sluggish at the hour the cold reaches it. That is the point,
and it is also a cost (Risks).

**Torpor is unchanged from the outside**: the same onset
(`core < survivableMin`), the same clear, the same `requiresConscious`
gate, the same row. ⚠ **The one difference, stated:** a body **standing
still** used to change only when something read its core. It now changes on
its own wake, at the projected crossing and at most one game hour late, and
a read no longer changes it. A **moving** body is unchanged.

**Respiration's in-place trigger is built as decided**
(`respiration-slate.md` § 2): `Atmospheric.setAtmosphere` fans out to every
respiring occupant one containment level deep and calls its shipped
`reassess()`, fire-and-forget and caught, the `onMoved` shape. No
scheduler, no poll; the idle case stays zero-cost. § 3 (breathers drawing
down a room's air reserve, the floor crossing as a second caller of the
same fan-out) is not built here.

## ⭐⭐ Host placement

| new thing | host | what composing it claims about the host's other composers |
|---|---|---|
| `getBody()` | `OrganismMixin` | Every organism has a body of its own kind and stage. True of a plant (the empty body), a hive (the bee's), a corpse (the body it was). No guard. |
| part roles, integument, fill, senses, breathing | the **module document** | Nothing about any class. |
| `sustains` evaluation, delta fields, sealing, regrowth, `formStage`, `reconcileForm` | `VitalsMixin` | Every body with wounds can lose, seal and regrow a part. Regrowth answers yes only where a part authors `regrows`; that is data on the part, not a default on the host. ⚠ New members must reach existing ones through `this.` (`bodyPartDeltas`, `conditions`), or `lint:mixin-clusters` counts a split (43 > 42). |
| coat clo | `ThermalRegulationMixin` (a private `coatInsulation()`, summed with worn clo at its three read sites) | Every regulating body may have a coat; a person's skin contributes nothing. `Attired` is not touched: it is *a body with clothes on it*. |
| integument armor layer | `ConditionLogic.resolveCoveringStack` | Not a host. |
| `comesOffAs` | `TissueMixin` (a material capability) | Every material that came from a living thing can say what it leaves a body as; wood and leaf legitimately author none today and gain it with foraging. |
| flaw `site` and the four kinds | `FlawedMixin` | Every article can carry a sited flaw; unsited flaws stay valid. |
| `Corpse.subtree` | `Corpse` | Every corpse is a whole body or a part of one. `null` on most is *the whole body*, which is an answer, not a "no". |
| `reconcilePhenology()` | `VitalsMixin` | Every body that carries conditions can carry one on a schedule. A species with no `phenology` (every person today) does nothing, and that is *this kind of body keeps no calendar*, a species fact, not a default on the host. No guard, no narrowing: conditions are already on `Creature`. |
| `Species.phenology` | `Species` | Absent on most rows means no scheduled condition, the statement an absent `breeding` already makes. |
| `thermalWakeAtS` | `ThermalRegulationMixin` | Every body that regulates heat has a next moment its state changes. The wake sits beside the stamp it advances. |
| the atmosphere fan-out | `AtmosphericMixin.setAtmosphere` | Every place whose air can change tells whoever is breathing it. The slate's decided home. |
| the pure core read | `ThermalRegulationMixin.getVitalSign` | Same host; it stops writing. |
| the `sluggish` onset | `ThermalRegulationMixin`'s cascade | Asked only of an ectotherm, in the branch that already asks. |
| `produces` reading | `ProducingMixin.taps()` | Unchanged composers. |
| `operable(named, ops)` (the whole operation match) | `VitalsMixin` | Every body with parts can be asked which operation can be done on it; the match and its refusals move here from the controller, one is added. No class check anywhere. |
| the late `getKeywords(viewer)` fold | `Livestock` (pack) | A head of stock has no authored species words; the fold supplies them from its variant. A wolf or a dog authors its own keywords on its row and needs none. |
| `getCommonNames()` | `OrganismMixin` | Every organism has names for the body it is now. |
| `refile(from, index, to, by)` | `HerdRegistry` (pack) | The registry holds every herd and names its own entries; it decides who may move a head between two of them. |
| the `herd` view's affordance | the `Herdbook`'s `environment` contributions, where `draft` already is | A place with no book affords neither. |
| `DaylengthBand` | a value object | No host. |
| `Silkworm` | pack class on `Creature` | One species. A body, not a deliberating actor — the rung `Livestock` uses. |
| `lostParts` | `VitalsMixin` | Every body with parts may be authored missing one; absent on almost every row means *whole*, which is the answer. |
| `Species.variants`, `development`, `pays` | `Species` | Absent on most rows means *one form, within limits*. A variant overrides the species' own fields by name, so no reader learns a second vocabulary. |
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
  `clone --here`. `container:` is not authored.
- **Locations, not rooms** — no new place.
- **Path pattern** — modules at `<root>/body-modules/`,
  the kind declared in the platform pack's
  `content/kinds/`; the whale under `/trade/fishing`; the silkworm
  class at `/trade/sericulture/agent/Silkworm`; kernel value objects in
  `lib/species/`; catalogues in `platform/idea/`.
- **Module categories** — value objects (`Body`, `BodyModule`, `LarvalClock`), no mixin, one
  catalogues, controllers, a brain-free pack class. No new category, no free
  helper, no new `eslint-disable`.
- **Module scope** — nothing executes at module scope; catalogues are
  reached on use.
- **Import boundary** — `Body` imports types and the two closed tuples only. Packs import
  the kernel by package specifier.
- **Verbs on objects** — `operable`, `refile`, `getBody`, `reconcilePhenology` are the
  object's; `ConditionApi.sever` is lifecycle orchestration (the
  `ConditionApi.die` shape).
- **P3 refuse / skip / throw** — a wound at a missing part re-sites and
  seals instead of landing nowhere; an unknown module path throws at
  hydration; a species over a limit fails the lint; `not-lactating`,
  `no-such-part`, every refusal `operate` used to word in its controller,
  and the register's refusals are reason rows the object answers with.
- **P4 no duck typing** — every cross-pack read narrows with `MixinApi.isX`;
  the silkworm depends on no other trade.
- **P5 the mixin decides** — `ButcherController`, the tap controllers and
  the new `HerdEnterController` only bind arguments and word the answer;
  `OperateController` asks the body and words nothing itself.
- **P6 persistence per content** — D15; no class newly persists what it
  hosts.
- **Reading never writes** — the one shipped violation this build touches
  (the core-temperature read) is removed in W6b, and every mint this build
  adds (a condition, an exemplar worm, a moth, a severed part) is on a write
  path named in its decision: the thing's own change, its own game-clock
  wake, or an act.
- **P7 load on use** — modules and scheduled conditions are ensured by the row that cites
  them; `comesOffAs` rows are ensured at the act. No boot entry
  (`lint:boot-entries`).
- **P8 names** — `Body` is what it is; `sustains` sits beside `governs` and
  `serves`; castration is the operation's file name, its word; no class is
  an adjective.
- **American English** throughout new rows and prose.

**Gates this build must pass** (the build runs `pnpm -C packages/server
lint:family` at every wave; the ones most likely to speak):
`lint:anatomy` (extended), `lint:scaling` (new), `lint:census` and
`lint:reachability` (both **taught the new references** in W3 and W5, D5),
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

**The order is set by four dependencies** the first draft got wrong: sex and
stage variants come before any gland or organ that hangs on one (W2 before
W3 and W5); tissue rows come before any module that cites them (W1); a plan
field is deleted only in the wave that derives it, with `Body` proxying it
until then (D1); a staging tool that calls a new Api arrives with it.

| field or list | still authored through | derived and deleted in |
|---|---|---|
| `bodyParts` | W0 | W1 |
| `locomotionModes`, `Species.production`, `TapSpec.sex` | W2 | W3 |
| `Species.butcheryYield` (incl. `maxAgeDays`) | W4 | W5 |
| `TapWindowSpec` `event` and `photoperiod`; `breedsAtDaylight`, `inBand`; `Species.maleNames` (W2) | W6 | W7 |
| `breathing`, `breathingByStage`, `respires`, `lungVolumeL` | W7 | W8 |
| `sensoryPorts`, `visionProfile.bandShift` | W8 | W9 |

### W0 — Goldens and staging tools

**Goal:** pin today's behavior, and build the tools the drive needs.
**Implements:** D16.
- Characterization tests, written against master's behavior:
  the resolved tissue shares of the nine plans; the row set and masses
  `dressOut` gives each of the 15 yielding species at a reference mass; each
  tapped species' tap keys and specs **by sex** (a bull gives no milk, a
  cockerel no eggs); `massAt` at five ages for every species with a curve;
  a full tray run's numbers (`meanShellMg`, heft bands, counts); persons'
  detection score and worn insulation; the modalities, gaits and breathable
  media every plan answers today.
- ⭐ **Torpor's goldens** (D17): for a cold-blooded body and a warm-blooded
  one, the core temperature at which torpor (or hypothermia) comes on, the
  temperature at which it clears, and the `requiresConscious` refusal while
  it holds — each taken twice, once for a body that **moves** (re-stamps)
  and once for one **standing still**. The standing-still pair is recorded
  as shipped (it changes only when its core is read) and is the one golden
  W6b re-pins, on purpose.
- The `testharness` subcommands of D16: `body`, `body-wound`, `body-sever`
  (a real avulsion through `ConditionApi.inflict`), `body-kill`,
  `daylight-pin`, `daylight-unpin`; `afflict`'s target becomes an object
  (its five callers re-checked, D16). Setters go through
  `/auth/test-stage`; add `@TestOnly` `setWetness` if none exists.
- `TestHarnessApi.pinDaylight` / `unpinDaylight` and the `@TestOnly` pin
  slot in `CelestialLogic`.
- `DaylengthBand` (S17) lands here, with `breedsAtDaylight` and `inBand`
  reimplemented on it and their behavior pinned first. The authored bands
  do not move until W7.
**Gates:** `lint:command-views`, `lint:subcommand-words`, `lint:view-keys`,
`lint:test-seams`, `lint:wizard-axis`.
**Acceptance:** goldens green on untouched code; a wire test stages a
wounded, killed cow and reads the wound on the corpse; a pinned daylength
closes the sheep's milk window; `body-sever` leaves an avulsion on the
body.
**Commit:** `test(organism-biology): W0 goldens and the body staging tools`

> ✅ **W0 done.** `DaylengthBand` (S17) shipped with both evaluators on it
> (`breedsAtDaylight`, `inBand`/`seasonSide`); bands not moved. The
> testharness gained `body`, `body-wound`, `body-sever`, `body-kill`,
> `daylight-pin`, `daylight-unpin`; `afflict` takes an object target
> (scope `reachable, online`, so a player is still named by name) and
> stage 0 relieves. The goldens freeze plans, taps by sex, `massAt` and
> `dressOut` to `species/__tests__/goldens/organism-biology.golden.json`
> (`WRITE_GOLDEN=1` regenerates). Decisions B1–B3 below.

### W1 — The composed body

**Goal:** modules, `Body`, `getBody()`; nothing a player can see changes.
**Implements:** D1, D4 (rows only), S1–S3.
- **Merge `origin/master` first.** Declare `body-module` in the platform
  pack's `content/kinds/`; add the `DOCUMENT_KINDS` shim only if
  naming-overhaul has not landed.
- `BodyModule`, `BodyModuleCatalogue`, `SpeciesApi.modules()`.
- `Body` (its constructor is the expansion), `Species.bodyFor()` (memoized;
  replaces `resolvedTissuesCache`), `OrganismMixin.getBody()`.
  `BodyPlan.setModules` with the explicit `ensureConstituent` pass.
- Migrate all 36 `getBodyPlan()` anatomy reads to the body; delete
  `BodyPlan`'s anatomy getters. `Body` proxies `sensoryPorts`,
  `locomotionModes` and `breathing` / `breathingByStage`, which stay
  authored. `BodyPlan` keeps `slots`, masses, `voice`, `respires`,
  `lungVolumeL`, `thermalStrategy`, `defaultLocomotionMode`.
- Re-express the nine plans as modules; `swine` composes; add the `insect`
  plan and move bee, silkworm and cricket to it.
- **All of D4's tissue material rows**, authored complete. Nothing cites
  them yet; `lint:census` and `lint:material-kinds` hold them.
- `lint:anatomy` rewritten over `Body`.
**Gates:** `lint:anatomy`, `lint:census`, `lint:material-kinds`,
`lint:data-ideas`, `lint:lib-statics`, `lint:unconsumed-seams`,
`lint:field-meta`, `lint:imports`, `lint:boot-entries`.
**Acceptance:** every W0 golden passes unchanged; `bodyParts:` appears in no
row; `lint:anatomy` fails on a deliberately broken module; a body cloned in
a cold world has its tissue materials resident.
**Commit:** `feat(species): W1 body plans compose from modules`

> ✅ **W1 done.** `BodyModule` + `BodyModuleCatalogue` (`SpeciesApi.modules()`,
> a `DOCUMENT_KINDS` shim — naming-overhaul has not landed), `Body` (its
> constructor is the expansion; imports types only), `Species.bodyFor()`,
> `OrganismMixin.getBody()`, `BodyPlan.setModules` (async: modules, then
> every tissue via `ensureConstituent`) and `applyModules` (sync, for
> resident modules). Every anatomy reader moved to the body; `BodyPlan` lost
> `bodyParts` and its anatomy getters. The nine plans became 26 modules
> (generated with today's shares as weights, so the golden matches to the
> digit) plus the `insect` plan; the 20 D4 rows landed; `lint:anatomy`
> builds every plan through `Body`. Fixtures moved to `setFlatParts`
> (`lib/species/__tests__/flat-body.ts`). Decisions B4–B8.

### W2 — Bodies that vary: sex, stage, growth

**Goal:** the variant machinery every later organ hangs on.
**Implements:** D8 (variants, names, the one temper dial, growth; **not**
castration).
- `Species.variants.sex` and `.stage`: field overrides by the fields' own
  names (`commonNames`, `biddability`, `handlingRange`, `massFactor`) and
  body deltas (`add`, `scale`, `integument`); `bodyFor({ stage, sex })` and
  the variant-keyed getters; the species' async setters ensure the modules
  a variant adds.
- `OrganismMixin.getCommonNames()`; the species rung in `Stuff.ts` (~466,
  ~500) reads it (*bull*, *cow*, *calf*, *ewe*, *lamb*); `Livestock`'s late
  `getKeywords(viewer)` fold. Delete `Species.maleNames` and
  `Livestock.answerToSpecies` with its call in `HerdRegistry` (~808);
  re-author the rows that used them.
  `HandlingMixin` reads the variant-keyed dials.
- von Bertalanffy `massAt`; `Creature.getMass` derives the frame for an
  aging body with no authored mass.
**Gates:** `lint:unconsumed-seams` (readers: `OrganismMixin`, `Handling`,
presentation), `lint:anatomy` (every variant's body), `lint:presentation`.
**Acceptance:** every drafted livestock species **binds** by each word it
answered to before (`look cow`, `handle ewe`, `call` by the same words —
wire, since a bind is what breaks); a head drafted as a calf and aged to
adult answers to its adult name with no re-draft; a calf and a cow of one row read different names,
proportions and masses; the `massAt` golden is **re-pinned deliberately**,
with the old and new figures in the commit body; the yield and tap goldens
still pass at the reference mass.
**Commit:** `feat(species): W2 sex and stage variants; the growth curve`

> ✅ **W2 done.** `Species.variants` (`sex`, `stage`; async setter ensures
> added modules), `bodyFor(variant)` memoized per form through
> `BodyPlan.bodyWith(deltas)`, variant-keyed `getCommonNames`,
> `getBiddability`, `getHandlingRange`, `massAt`. `OrganismMixin` gained
> `getVariant()` and `getCommonNames()`; `getBody()` passes the variant.
> The species rung in `Stuff.ts` reads the organism. `maleNames` and
> `answerToSpecies` are gone; `Livestock` folds its words late in
> `getKeywords(viewer)` and `getShortDescription()`. Five ranching rows
> re-authored; the calf has a young body's proportions. `massAt` is von
> Bertalanffy (re-pinned: birth and adult unchanged, juveniles heavier —
> the figures are in the commit body). Decisions B9–B12.

### W3 — What a part is for

**Goal:** the third role, the third rule, gaits and fill.
**Implements:** D2, D6, D12 (fill).
- `produces` on parts; `Producing.taps()` reads the body; the gland wound
  factor. Re-author the ten tapped species: the udder and the oviduct as
  **female-delta modules** (W2's variants), the fleece as a `produces` on
  the sheep's torso, the bee's crop, the trees' sapwood. Delete
  `Species.production`, its accessors and `TapSpec.sex`; `Livestock.ts:419`
  follows. `window: event` is **kept** until W7.
- `sustains`, `filtration`, kidneys (tissue row from W1); the death floor
  generalized. The swim bladder joins the fish torso here.
- `gait` on limb, wing and fin modules; `Body.gaits()` derives; delete
  `locomotionModes` and its proxy; `LocomotionLogic`, `Exit.whatWouldPass`
  and the dossier already read the body.
- `fill` on modules and the `point` delivery read.
- **Teach `lint:census` and `check-reachability.ts` `produces.yieldRow`** on
  module documents, in place of `production[].yieldRow`.
**Gates:** `lint:census`, `lint:reachability`, `lint:anatomy`,
`lint:mixin-clusters` (Vitals gains `sustains`), `lint:closed-vocabularies`.
**Acceptance:** the by-sex tap golden passes (no bull milks, no cockerel
lays); a staged udder wound stops the fill (unit); one kidney lost leaves
`filtration` full and both lost begins dying (unit); a `point` insult to a
wing delivers the `sparse` share (unit); the gait golden passes; both gates
fail on a module whose `yieldRow` names no row.
**Commit:** `feat(species): W3 glands, the redundant rule, gaits and fill`

> ✅ **W3 done.** Parts gained `produces`, `sustains`, `gait`, `fill`
> (module-level `fill`, per-instance `gait` on a plan's module ref).
> `Producing.taps()` reads the body's glands; `glandFactor` scales the fill
> by the gland's function band; a body with no gland for a key another
> form has refuses `wrong-sex`. `Species.production`, `TapSpec.sex` and
> `BodyPlan.locomotionModes` are gone; `Species.body` (a species-wide
> delta) carries the fleece, the crop and the sapwood; the udders and the
> oviduct are female-delta modules. `filtration` (sustained by two kidneys
> in every vertebrate torso, from flesh), the death floor's both-missing
> rule, the swim bladder (hollow), wings sparse, `response.fill.*` dials.
> The census reads glands' `yieldRow`s and module tissues; reachability
> already walked every content file. Golden re-pinned: only kidneys and
> the swim bladder added (from flesh), gaits identical as sets, taps by
> sex identical. Decisions B13–B15.

### W4 — The integument

**Goal:** every exterior part has a skin; coats insulate; hides armor.
**Implements:** D3.
- Integument blocks on every module (materials from W1); the crab is chitin.
- The armor layer; `primaryTissueMaterial` skips the integument.
- `ThermalRegulationMixin.coatInsulation()`, summed with worn clo at its
  three read sites (`Attired` untouched); the sheep's coat names the wool tap's key, so
  its depth is the fleece's standing; the shiver `look` line.
**Gates:** `lint:anatomy` (integument clause on), `lint:does-nothing`,
`lint:perishable`.
**Acceptance:** persons' insulation and detection goldens unchanged; a shorn
sheep's coat clo is ~0 and its core falls faster than an unshorn one's in a
staged cold wet night (unit arithmetic over `ThermalRegulation`); a wet coat
reads lower than a dry one; `look crab` says chitin. ⚠ Run `pnpm test:gym`
once here: animals gain natural armor and the balance benches may move.
**Commit:** `feat(species): W4 the integument — armor, coat and skin`

> ✅ **W4 done.** `integument` (skin · under · coat) on modules and parts,
> overridable per instance by a body delta; skin is a tissue on the
> module's root (its weight taken from flesh), resolved only on exterior
> parts. Natural armor is one fold step after the worn stack (a separate
> step, so `CoveringLayer` keeps its occupant); `primaryTissueMaterial`
> skips the skin. `coatInsulation()` sits beside worn clo at all three
> read sites; a coat tied to a tap is as deep as its standing; `look`
> shows a watched body shivering (`isShivering`) and a plated body's shell
> (*Its shell is chitin.*). Every module authored an outside; the crab is
> chitin; the sheep's coat is wool tied to `wool`. `lint:anatomy` gained
> the outside clause. The golden: dressOut, taps and mass unchanged; plans
> only skin-for-flesh (the bird wing took its skin from generic muscle,
> having no flesh) and the crab's chitin. `test:gym`: every bench but
> `waster-spar` passes — that one was red on master already (it authored
> `mass:`, refused since the textiles build, and calls a `setHardness` its
> material lacks); a finding for its owner. Decisions B16–B17.

### W5 — What a carcass gives

**Goal:** yields derive; the pelt comes off; `butcheryYield` is gone.
**Implements:** D5.
- `TissueMixin.comesOffAs`, authored on the tissue rows; `portionKg` on
  `CutMixin` and the cut rows; feathers, down, carapace, shell and organ
  rows, each answering to its own word (hide and fish-skins exist; only the
  hide answers to `pelt`).
- The calf's abomasum as a `newborn` stage-delta part (W2), naming the vell.
- `Butcherable.dress` and `Species.dressOut` rewritten; the pelt line, its
  flaws (`holed`, `slashed`, `burned`) and the skinner's hand (`nicked`);
  `Flaw.site`; the corpse's
  `look` for a taken pelt (bare skin).
- Move the wolf, hog and pit pony onto modules with named muscles.
- Delete `Species.butcheryYield` and all 15 lists; retire `lint:anatomy`
  clauses (b), (c). **Teach `lint:census` and `check-reachability.ts`
  `comesOffAs`** in place of `butcheryYield[].cut`.
**Gates:** `lint:census`, `lint:reachability`, `lint:anatomy`,
`lint:content-refs`, `lint:no-authored-faucet`, `lint:mass`.
**Acceptance:** the yield golden becomes **today's rows ⊆ the new rows** for
all 15 species, and the commit body lists the added rows per species and the
unit-count changes; a vell comes off a calf and not a cow; a cow killed with
a flank puncture gives a pelt whose `look` names the hole; the same pelt
after `cure` and `tan` is leather with the flaw (wire); a hen's bare `butcher` gives feathers and down first, and `for feathers`
gives feathers alone with no prompt; the crab gives chitin; both gates fail on a tissue whose
`comesOffAs` names no row.
**Commit:** `feat(butchery): W5 cut maps derive from the body; the pelt`

> ✅ **W5 done.** `comesOffAs: [{ tissue, cut }]` lives on the BODY MODULE
> (B18), copied onto every part of its instance; `Body.yieldLines(present)`
> gives the rows, the outside first; `Body.coatMassKg` weighs a coat (it
> has depth, not share). `Species.dressOut` takes the derived lines (claims
> over present parts × live weight × finish; a hide and bone unconditioned;
> a cut a piece per part or per `portionKg`, anything else one lot; a 5 g
> floor, a coat kept at any weight). `Butcherable.dress` rewritten; only a
> cut goes joint-or-trim. The pelt: `holed`/`slashed`/`burned` per wound
> at its site, `slashed` where a cut came off first, `nicked` per band
> short; `Flaw.site` worded by `look`; a skinned `Corpse` says so.
> `Species.butcheryYield` and the 14 lists are gone (the dog's deliberate
> empty list too, B19); the vell is the newborn's `abomasum` part; new
> rows: tissues `intestine`, `abomasum`; things `feathers`, `down`,
> `carapace` (no `scales`/`shell` row: nothing has them yet). Golden: W0's
> `dressOut` stays frozen as the containment reference and passes (every
> row still comes off, adult ∪ newborn); the derived carcass is pinned as
> `carcass`. `lint:anatomy` lost the yield-list clauses and gained *no two
> rows off one body share a word* (the roe lost `fish`). Decisions B18–B20.

### W6 — Parts that change

**Goal:** the severed part is a thing; stumps seal; claws regrow; coats
cycle.
**Implements:** D7.
- `ConditionApi.sever`; the `subtree` option on `mintCorpseFrom` with every
  item D7 lists; `Corpse.subtree`; `missingPartsAugmenter` suppressed for a
  part; the avulsion path; the participant gate on `severPart`;
  `testharness body-sever` moves to `ConditionApi.sever`.
- Delta fields; `lostParts` as a `seed` field (mint only); sealing in `afflict`; regrowth
  at reconcile; `moultEveryDays` on the crab.
- Coat `cycle`; the pelt's grade from the coat at death.
**Gates:** `lint:mixin-clusters`, `lint:object-verbs`, `lint:field-meta`,
`lint:silent-catch`, `lint:perishable`.
**Acceptance:** a staged wolf foreleg lies in the place, reads *a wolf's
foreleg* (not *the body of*), weighs its share, is carried, butchered for a
shank and reads its decay stage (wire); the wolf's later corpse lacks that
shank; a crab aged past a moult has its claw and a burned one does not (unit
and wire); under a pinned short day a pelt grades above a long-day one; a crab row
authoring `lostParts` whose claw has regrown still has it after a restore
(unit).
**Commit:** `feat(harm): W6 the severed part is a thing; regrowth and the coat's year`

> ✅ **W6 done.** `ConditionApi.sever` (delta + mint); `inflict` severs
> after an avulsion past the line LANDS (the delta at once, the part's mint
> detached and caught), and `AVULSION_BEHAVIOR.onset` no longer severs.
> The mint is `mintCorpseFrom(…, { subtree })` → *a wolf's foreleg*,
> weighing its share, laid in the body's place; the corpse calls
> `restrictToSubtree`, which marks the rest missing and keeps only the
> part's wounds. `BodyPartDelta` gained `lostAtAgeDays` and `sealed`; a
> burn or caustic aimed at a stump seals it and re-sites to the nearest
> present part; `regrows: moult` + `Species.moultEveryDays` restore an
> unsealed loss at the moult; `lostParts` is a seed field (mint only);
> `getLostParts()` lists subtree roots. A coat may `cycle` (a daylength
> band × `thick`), read at the body's place for insulation and at the kill
> for the pelt's grade (`fine` in the thick season, else `fair`). Content:
> the crab's claws regrow every 60 days; quadruped and canid fur is 1.6×
> deep below a 0.45 day. Decisions B21–B22. The severed part's mint needs
> the corpse template from the store, so it is proved by the drive (W11),
> as the plan's own acceptance says (*wire*).

### W6b — Reads are pure; bodies wake themselves ✅ done

> **Done note.** The read runs the reconcile's own guards and slices on a
> probe (`_probe`: core, heat load, the reserves a slice spends) routed
> through `readCore`/`setCore`/`reserveCurrent`/`spendReserve`, so the
> projection equals the reconcile by construction. The wake is armed at
> the end of every reconcile and every re-stamp; a unit world with no
> event bus arms nothing (guarded on the EventRegistry), and the thermal
> suites' `core(c); // seed` reads became `reconcileThermalRegulation()`
> — a read no longer seeds. The W0 goldens passed **unchanged** (their
> torpor pairs reconcile explicitly), so nothing was re-pinned. ⚠ B17 was
> real: the projection reached `standingIn`, which reconciles production —
> fixed by banking the coat (B23). Smoke fan-out: a unit test, proven red
> with the call removed. Not done here: the wire step (a body torpid after
> `clock-advance` with no read) goes to the W11 drive; the bath-in-a-smoky-
> room case is not separately tested (the fan-out only reaches occupants
> one level deep, which a bath's occupant is not). Counted: one wake per
> resident living body, and at most one reconcile per body per game hour
> when no threshold is near (the cap) — a full room of N bodies costs N
> reconciles an hour, against N × reads-per-hour before.

**Goal:** looking at a body stops changing it; a body standing still is
brought current by its own game-clock wake; a room that turns to smoke
tells whoever is in it.
**Implements:** D17.
- Split `integrateThermalSlice` into the pure step and the applier;
  `getVitalSign('coreTemperature')` returns the projection.
- `thermalWakeAtS`, `setThermalWakeAtS` (armed with `host: this`), the
  crossing projection, the one-game-hour cap; armed at every re-stamp and
  after every reconcile; cancelled at destruct; not re-armed while
  linkdead.
- The far-past guard narrowed to a body with no wake armed, in the
  reconcile **and** the projection.
- `AtmosphericMixin.setAtmosphere` fans out to respiring occupants one
  containment level deep (`reassess()`), fire-and-forget and caught.
- `thermal.md`, `respiration.md` and the antipatterns row are updated in
  this wave, because the doctrine they state changes here.
**Gates:** `lint:reconcile-chains`, `lint:field-meta`,
`lint:floating-promises`, `lint:silent-catch`, `lint:mixin-clusters` (the
wake must reach the stamp through `this.`).
**Acceptance:**
- **unit:** a `coreTemperature` read leaves `conditions`, the stored core,
  the reserves, `thermalRegStamp` and `thermalWakeAtS` identical, for a
  body whose projected core is past the torpor line;
- **unit:** the projected core equals what the reconcile then stores, for
  the W0 cold cases;
- the W0 torpor goldens: the **moving** pairs pass unchanged; the
  **standing-still** pairs are re-pinned to *comes on at the same core, on
  the body's wake, with no read* — the difference D17 states, in the
  commit body;
- a body cooled in place and never read is torpid after `clock-advance`
  crosses its wake (wire); **a single `clock-advance` of a full game day
  cools it by the whole day** (unit: the gap is integrated, not dropped),
  while a body that stood up from offline across the same gap is not
  billed; a restart with a wake pending re-arms it, and one
  already past fires at once (unit);
- a linkdead body's wake re-stamps, changes nothing and is not re-armed
  (unit);
- a body standing in a room whose atmosphere is set to smoke is in crisis
  without moving (unit); a body in a bath in that room is not;
- wakes armed per resident body, and reconciles per game hour in a full
  room, are counted and recorded in the commit body.
**Commit:** `fix(thermal): W6b reading a body no longer changes it; bodies wake on the game clock`

### W7 — Castration and phenology ✅ done

> **Done note.** Landed in four commits: W7a `d3aa2e20c` (castration and
> `operable`), W7b `293e03acc` (the herdbook keeps the cut, `herd enter`,
> the ox), W7c `d1c48eda9` (phenology — ⚠ its commit message repeats
> W7b's by mistake; the content is phenology), W7d `ebb749e6f` (sluggish,
> ectotherms). Surprises: pack reason codes must be PATHS (a bare code is
> the platform's), so the body's seven `operable` rows went to the
> platform pack; Organism's daylight reads split into their own
> `lint:mixin-clusters` cluster, so they became `CelestialApi.daylightHere`
> (B27); the bullfrog had borrowed the furred quadruped plan, so it got
> its own `anuran` plan now (B30) rather than waiting for W8. Not done
> here, for the drive (W11): the full draft→operate→age→`herd enter`→
> redraft chain and the frog denning after `clock-advance` on a standing
> world — each half is unit-tested. `mintHead`'s loss replay is unit-
> covered only through `seedLostParts` (a real mint needs the row).

**Goal:** the ox, lactation on one schedule, the season, the cold-blooded.
**Implements:** D8 (castration, the register), D9.
- The `gonads` part on the male delta; `variants.neutered`.
  `castration.yaml` in `trade-medicine`; `addresses.part` and `posture` on
  the operation document; the operation match moved into
  `VitalsMixin.operable`, with the named-only rule for a part; every
  `this.fail` in `OperateController` replaced by `this.refuse` and a reason
  row.
- `HeadOverlay.lostParts` and seeded traits, written at `return` and
  preferred at `mintHead`; `Herdbook.neuteredFraction`; the composition
  read; the `herd` view with `enter`, `HerdRegistry.refile(…, by)`;
  `ox.yaml` (`sex`, `lostParts`).
- The eight condition rows; `Species.phenology` and its async setter;
  `VitalsMixin.reconcilePhenology()`, its one call after the thermal
  cascade, the `daylight-pin` fan-out.
- **Move the bands** (D9's table): the ewe's and the hen's `photoperiod`
  windows become phenology entries; `in-season` and `rut` read
  `Species.breeding`; `Livestock.serveBy` reads `in-season`; delete the
  `event` and `photoperiod` window kinds, `breedsAtDaylight` and `inBand`.
- `activeIn` on the udder and the oviduct, `not-lactating`, the afflict at
  `mintHead` (not dried off, or past `restDays`), the relieve at `dryOff`.
- `THERMAL_DEFAULTS.SLUGGISH_ONSET_K`, the near cold threshold in the
  cascade, `TemplatePaths.thermalSluggish`; the suppressed-power term in
  `traversePowerW`; `thermalStrategy: ectotherm` on the fish, crustacean and
  frog plans.
**Gates:** `lint:conditions`, `lint:condition-arms` (phenology adds **no
arm**; it calls `afflict` / `relieve`), `lint:mixin-clusters`,
`lint:unconsumed-seams`, `lint:institution-verbs`, `lint:subcommand-words`,
`lint:verb-collisions` (`herd`), `lint:actor-claims`, `lint:reason-rows`,
`lint:controller-decisions`, `lint:controller-rows`, `lint:kept-animals`,
`lint:closed-vocabularies`.
**Acceptance:** `operate <calf> for castration with knife` takes the gonads
and leaves the wound; on a cow it is refused by the body (`no-such-part`);
it works on a staged pit pony and a dog; **a bare `operate bull` on an
entire, bleeding bull addresses the bleed and never castrates** (unit); a
conscious patient can end it. The shipped operations' refusals read the
same words as before, now from reason rows (the existing `operate` tests,
re-pointed). The calf's herd line reads steer; aged to adult it answers to *ox*,
outweighs a bull of the same age and handles calmer; `herd enter steer in
oxen` raises that book's ox count by one **and the head drafts out of it
as the same male** (wire); `refile` refuses a null `by` and an actor who
does not keep the source (unit); drafting it twice mints
no gonads and no wound, and a head that lost an eye keeps the loss across
`return` (unit). A ewe under a pinned winter day carries no `lactating`,
does not read *in milk* and refuses `milk` with the reason; under a pinned
spring day she gives; a dried-off cow refuses and a fresh one gives (wire).
Under a pinned short cold day a frog that has **not moved and is not read**
carries `sluggish` and then `denning` after `clock-advance` crosses its
wakes (unit and wire); `look` and `assess` change nothing on it (unit). A
chilled trout is `sluggish` before it is torpid, and pays more to cross
(unit). ⚠ Ectothermy is new behavior for five fish, the crab and the frog:
a unit test holds each at its habitat's temperatures and asserts it is
neither torpid in water it tolerates nor dead.
**Commit:** `feat(species): W7 castration as an operation, the ox, and phenology`

### W8 — Metamorphosis ✅ done

> **Done note.** W8a `a895c36d1` (the frog; breathing from organs), W8b
> (the silkworm). Breathing derived cleanly: W0's golden held for every
> shipped plan (fish and crab exactly); only the frog's new plans differ,
> as D10 says. The tray golden did NOT exist (W0 never wrote one) — W8b
> pinned it from the code as it stood before the gland factor, then the
> factor came in at exactly 1 (the shipped larva's gland is 0.25 of a body
> that sums to 1). Emergence moving to a wake re-pointed the stifling
> tests from reads to clock advances that fire the wake. ⚠ `@TestOnly`
> cannot mark an instance setter (lint:test-seams' own rule), so the two
> staging setters are plain `setDegreeDays` / `setSpunAt`, reached through
> the `@TestOnly` `testharness stage` (B33). For the drive (W11): the
> tadpole crossing its change on a standing world, and a staged stack
> letting out its moth across `clock-advance`.

**Goal:** one creature, several bodies; the frog and the silkworm.
**Implements:** D10.
- `Species.development`; `breathes` on organs; `Body.breathing()` derives;
  delete `BodyPlan.breathing`, `getBreathableMedia`,
  `Species.breathingByStage`, `breathingFor`, `respires`, `lungVolumeL` and
  the proxy; lung volume and *does it respire* read off the lungs.
- `formStage`, `reconcileForm`.
- Tadpole, froglet and frog plans and modules; the frog's `ageCurve`;
  `denning` on the frog.
- `LarvalClock`, `Silkworm` on `Creature`, `refreshExemplar` on the tray's
  write paths and its own wake, the `Cocoons` emergence wake, the gland-derived shell, the exemplar moth; larva, pupa and
  moth plans; the two `@TestOnly` setters.
**Gates:** `lint:test-seams`, `lint:mixin-clusters`, `lint:anatomy`
(development clause on), `lint:duck-typing`, `lint:pack-extends`.
**Acceptance:** the breathing golden passes for every unstaged plan; a
tadpole aged across its change is the same object with the same name,
breathes air, and a staged wound on its tail has passed to its torso (wire);
the W0 tray golden passes to the milligram; `look` at a tray mints nothing
(unit: the content count is unchanged by reads); a worm taken off a
fifth-age tray reads as a fifth-age larva; an unstifled stack staged to
emergence leaves a moth and pierced cocoons once `clock-advance` crosses
its wake.
**Commit:** `feat(species): W8 metamorphosis — the frog and the silkworm`

### W9 — Senses

**Goal:** eyes, ears and noses are parts; the species' vision is live.
**Implements:** D11.
- Sense organ parts on every head module; `vision`, `hearing`, `smell`
  capacities; delete `sensoryPorts`, its surface and the proxy; the dossier.
- `Actor.getVisionProfile()`; `scotopicMin` and `photopicMax` read in
  `VisionModality.perceiveFor`; the capacity-driven band modifier; remove
  `bandShift` from the species rows; `Olfactory` reads `smell`.
- The watch term and its dial; the self-`look` line.
**Gates:** `lint:closed-vocabularies`, `lint:perceived-surfaces`,
`lint:dossiers`, `lint:light-sources`, `lint:unconsumed-seams`.
**Acceptance:** the modality golden passes; a plain human's detection and
perceived-band goldens are unchanged; a `bandShift: -1` species perceives
one band better in a dark place (unit and wire); a staged eye wound lowers a
wolf's and a player's perceived band, and the player's `look` at themselves
says so (wire); a cow perceives a `subtle`-hidden player that a wolf does
not (wire, through `testharness body <observer> perceiving <player>`).
**Commit:** `feat(senses): W9 sense organs are parts; dark-sight is live`

### W10 — The honesty check and the whale

**Goal:** every species passes or pays; a new animal is rows.
**Implements:** D12 (check), D13.
- `check-scaling.ts`, the `lint:scaling` script entry, `Species.pays`, the
  dossier line; `pays` authored wherever the check asks.
- The whale's rows and the `render-blubber` recipe.
**Gates:** `lint:scaling`, `lint:census`, `lint:reachability`,
`lint:content-refs`, `lint:material-kinds`.
**Acceptance:** `lint:scaling` is 0 over the roster; the whale's commit
touches no `.ts`; a staged whale carcass gives blubber, spermaceti, teeth and
cuts, and rendered blubber fills a lamp (wire).
**Commit:** `feat(species): W10 the square-cube check; the whale`

### W11 — Drive, walk, docs

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
**Gates:** `lint:drive-scripts`, the whole family.
**Commit:** `test(organism-biology): W11 the drive and the walk`

## Reachability wiring

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| skin a carcass | `butcher <body>` (takes the integument first) or `butcher <body> for pelt` (shipped view) | shipped (`Corpse` is `Butcherable`) | integument on the module; `comesOffAs` on the skin material; **only the hide row** answers to `pelt` | the butcher ensures `comesOffAs` rows at the act | `cut` is a string matched to the row's own words |
| pluck, scale, shell | the same verb: `for feathers`, `for down`, `for scales`, `for carapace`, `for shell` | the same | the coat material's `comesOffAs`; each row its own word, none shared | the same | the same |
| gland and blubber yields | `butcher` | the same | the organ's tissue row names its thing row | the same | the same |
| render blubber | the shipped render path (`cook`/recipe) | the pot | `render-blubber` recipe; `whale-oil` material | recipe documents load as today | recipe slot category `blubber` — a tag on the blubber material |
| milk an animal in milk | `milk` (shipped) | `Livestock` | udder on the female delta with `activeIn:` the `lactating` condition; the species' `phenology` entry; the reason row | the gland's condition path is ensured with the module | unchanged |
| castrate | `operate <animal> for castration [with <kit>]` (shipped view; **only when named**) | shipped: whatever affords `operate` today | `castration.yaml` in `trade-medicine/content/operations/`; the `gonads` part on the male delta | operations load as today | `patient` requires `VitalsMixin`, which every body composes; the head binds by its variant's words (the `getKeywords` fold); the body refuses the rest by reason row |
| file a steer as an ox | `herd enter <animal> in <herd>` (new view `herd`, one subcommand, `category: ranching`) | the `Herdbook`'s `environment` contributions, beside `draft` | the ox book row | the controller row `…/idea/cmd/ranching/HerdEnterController.yaml` | `animal` object requiring `HandlingMixin`; `herd` a string with `in`, resolved by the registry as `draft`'s is |
| pick up a severed part | `get` (shipped) | it is a `Thing` | `/stuff/thing/Corpse` row | cloned at the sever | none |
| regrow | none (reconcile) | — | `regrows` on the part; `moultEveryDays` on the species | with the body | — |
| take a worm off a tray | `get <worm> from <tray>` (shipped) | the tray is a container; the exemplar is content | the `Silkworm` agent row; the three stage plans | the tray clones the exemplar on a `put` or `get` | none |
| conditions on a schedule | none (the body's reconcile) or the act that owns an event condition | — | `Species.phenology` → condition rows in the platform pack | ensured by `Species.setPhenology` | — |
| an eye wound dims sight; dark-sight | none | — | eye parts on head modules; the species' `visionProfile` | with the body | — |
| a still body changes on time | none (its own wake) | — | — | armed at re-stamp and at mint; persisted; no boot entry | — |
| smoke reaches whoever is standing in it | none (the setter's fan-out) | — | — | — | — |
| stage a body | the `testharness` subcommands of D16 | test world only | — | — | `requiresTestWorld` |

⚠ The four classic silent failures, checked per row above: a view nothing
affords (`herd` is added to the `Herdbook`'s contributions in the same
wave; `operate` is already afforded), a row nothing loads (every new
document is ensured by an async setter that throws on a miss, every tissue
by `ensureConstituent`, and the operation by the shipped catalogue), a
mixin nothing reaches (none is added), a `requires:` nothing composes
(`operate`'s is `VitalsMixin`; `herd enter`'s is `HandlingMixin`, which
`Livestock` composes). A fifth, new here: **a target that no longer
binds** — retiring the name stamp is covered by the keyword fold and its
W2 wire test.

## Acceptance-criteria coverage

| criterion | wave |
|---|---|
| Every animal can be looked at and butchered; coat first | W4, W5 |
| A newly authored species is butcherable, skinnable, insulated | W5 (rule), W10 (the whale proves it) |
| A pelt shows every wound, in its part; survives tanning | W5 |
| No cut an animal yielded before is lost; a wolf yields named cuts | W5 |
| The crab is chitin | W4 (look), W5 (yield) |
| The whale exists; blubber renders to lamp oil | W10 |
| Milking needs a lactating animal; the refusal names the reason | W7 |
| Castration exists; the ox; the register counts it | W7 |
| Wounding a gland stops what it makes | W3 |
| Wounding an eye costs sight, animal and player | W9 |
| A dark-sighted person species sees in the dark as its row says | W9 |
| A wide-eyed grazer detects what a hunter misses | W9 |
| A severed part lies in the world, is carried, butchered, spoils | W6 |
| A claw regrows at the moult unless burned | W6 |
| Losing one kidney leaves a body standing | W3 |
| Shorn, plucked or wet is colder | W4 |
| The tadpole becomes the frog, same creature, breathes by its organs | W8 |
| Larva → pupa → moth; deadline, stifle and reel read the same | W8 |
| Every one of these survives a restart (stage proved on the tray) | D15, proved in W11 |
| No species is rejected; any over a limit names what pays | W10 |

Unmapped: none.

Proved beyond the requirements' list (owner's decisions): **reading a body
never changes it, and a body standing still changes on its own wake** (D17;
W6b; drive steps 12 and 13), and **a winter ewe is not in milk** (D9; W7;
drive step 8).

## Test & gate strategy

**Unit tests** prove arithmetic: expansion and renormalization, the three
combination rules, gland fill under a wound, coat clo dry, wet and shorn,
derived yields against the goldens, flaw derivation, sealing and regrowth
across a moult boundary, the growth curve, neutered derivation, state
triggers and rates, the trauma remap across forms, the larval clock against
the tray golden, derived band shift and the scotopic floor, the watch term, the pure core
projection against the reconcile,
the four scaling indices. **Only the drive** can prove the wire flows, the
restart and the words.

### The blocking drive

⚠ **Stand in the test world, never in a real place** (test-world-lifecycle,
!638, merged 2026-11-22). `lint:wire-content` fails a new or edited wire
file that names `/world/<x>` (other than `/world/testbed`) or `/corpo/<x>`.
The drive stands in the test-only `test-fixtures` pack's `/world/testbed`
through `standIn()` / `fundedAccount()` / `standInNpc()`
(`packages/wire/src/harness/scaffold.ts`), and restarts through the
harness's `restartWorld()`, never `bootOwnedWorld` / `stopOwnedWorld`.
The animals, the herd and its book, the tray, the tanning pit, the pond
and the `PersistentHall` the restart step reads back are **cloned or
authored into the testbed** (a herd and a persistent hall there are
test-fixtures rows this build owes in W0), not borrowed from Hearts
Delight, Hollow Mere or the newbie wilds. The runner purges `wire-`
characters at the start and end of every run.

| # | pace | how it is staged |
|---|---|---|
| 1 | instant | `clone` a cow, `testharness body-wound <cow> body.torso point 2`, `testharness body-kill <cow>`; then the player's `butcher … for pelt`, `look pelt` |
| 2 | instant | player verbs on the cow; then a wolf and a hog (`clone`, `body-kill`) and the player's `butcher` — named cuts, and no row lost |
| 3 | instant | player verbs: `cure <pelt>` with salt (the `salt-hide` recipe), `tan <pelt> in <pit>`; the pit's liquor clock advanced with `testharness clock-advance` in ≤ 1-day steps |
| 4 | instant | `clone` a hen, `testharness body-kill`; the player's `butcher hen for feathers`, then bare `butcher` for the down |
| 5 | instant | `clone` a shore crab; `testharness body-kill <crab>` |
| 6 | short | `testharness body-sever <crab> body.claw.left`, `/auth/test-stage` `setAge` past the next moult; second crab: `body-sever`, `body-wound <crab> body.claw.left heat 2`, `setAge` |
| 7 | instant | `clone` a sperm whale on a shore, `testharness body-kill`; the player butchers and renders |
| 8 | instant | draft a ewe; `testharness daylight-pin 0.35` (winter): she is not in milk and `milk` refuses with the reason; `daylight-pin 0.55`: she gives. Draft a cow; `testharness afflict <cow> …/reproduction/lactating 0`, `milk` refuses; afflict again, she gives |
| 9 | instant | draft a bull calf; the player's `operate calf for castration with knife` (and first a bare `operate calf`, which finds nothing to do); the herd read says steer; `/auth/test-stage` `setAge` to adult beside a staged bull of the same age; `handle` both; the player's `herd enter steer in oxen`; read the ox book and draft him back out |
| 10 | instant | `testharness body-wound <wolf> body.head.eye.left point 2`; a hidden player; `testharness body <wolf> perceiving <player>` and the same for a cow |
| 11 | instant | in the testbed's `PersistentHall`: `clone` a wolf, `testharness body-sever <wolf> body.leg.frontLeft`; the player picks the foreleg up, butchers a second one for a shank, and leaves one lying |
| 12 | short | two sheep; the player's `shear`; `testharness weather-pin rain`, `clock-advance` a night in one-hour steps (each fires the wakes at the new time and the whole step is integrated) — **nobody moves and nobody reads**; then `testharness body <sheep>`: the shorn one is colder and carries hypothermia first; `assess` it twice and its conditions are the same both times; a wet and a dry wolf by `setWetness` |
| 13 | short | `clone` a tadpole; `/auth/test-stage` `setAge` past the change; then `testharness daylight-pin 0.35`, `weather-pin snow`, `clock-advance`: the frog, which has not moved and has not been read, carries `sluggish`, then `denning` |
| 14 | short | `/auth/test-stage` `setDegreeDays` on a tray; `get silkworm from tray`; the stifling oven; `unwind`; a second stack with `setSpunAt` back-dated past ten days, then `clock-advance` across its wake |
| 15 | instant | `testharness body-wound <player> body.head.eye.left point 2`; the player's `look me`; then two unwounded players, a plain human and a `bandShift: -1` species, `look` in the same dark place |
| 16 | short | restart the wire world; read back the pelt and leather (carried), the ox (the herd document), the foreleg lying in the `PersistentHall`, the lactating cow (returned to its herd before the restart), **the tray's worms at the stage they had reached**, the player's eye |

`daylight-unpin` and `weather-unpin` close the drive: whoever pins, unpins.

### The soak drive (named for the lane, never run by `/build`)

`organism-biology.soak.dirty.wire.test.ts`: (1) a lamb across a game year;
(2) a sheep's coat across a winter; (3) a bullfrog through a winter; (4) a
silkworm generation on its own degree-days. Staged twins: blocking steps 9
and 12 (growth and the coat), 13 (the winter, by the daylight pin), 14 (the
generation). The arithmetic of each season is proved in the unit tests
named above.

`pnpm test` runs at code-complete and at `/finalize` only. Everything
between is `pnpm test:near`, the touched packs' vitest, and `lint:family`.

## Risks & opens

- **W1 is wide.** 36 call sites and nine plans move in one wave, and the
  only proof nothing changed is the W0 goldens. If the goldens cannot be
  made exact (floating-point renormalization), stop and widen the tolerance
  deliberately, in the test, with the reason.
- ⚠ **The growth curve moves every aged animal's mass (W2).** von
  Bertalanffy is not the shipped straight line, so a half-grown animal
  weighs differently, and mass feeds dry-matter intake
  (`dryMatterIntakeKgPerDay`), basal drain, draught power, carry capacity,
  thermal mass and every carcass yield. The goldens that catch it: W0's
  `massAt` golden (re-pinned on purpose, both figures in the commit), the
  yield golden (taken at a reference mass, so it must **not** move), the
  ranching pack's feed and `flesh` tests, and the plough's draught tests in
  `trade-farming`. Adult mass is unchanged by construction; if an adult
  figure moves, the curve is wrong.
- **`lint:mixin-clusters` is at its ceiling.** `VitalsMixin` gains members
  in W3, W6, W7 (`reconcilePhenology`, `operable`) and W8;
  `ThermalRegulationMixin` gains the wake and `coatInsulation`. Each new member shares state
  with existing ones through `this.`.
- **Medicine now sees seasons and milk.** `assess` and diagnosis list
  `in-season`, `lactating`, `denning` beside wounds and fevers. Accepted as
  honest. The thing to watch is noise: a herd read should not turn into a
  page of conditions, and `treat` must refuse each of these in words rather
  than offer a dressing.
- ⚠ **Torpor's driver changes (W6b).** The read that used to bring a
  still body current is gone and the body's own wake replaces it. What can
  go wrong: the projection and the reconcile disagree (a W6b unit test pins
  them equal); a caller nobody found relied on the read (the W0 goldens for
  moving bodies and the full suite are the net); a wake is lost across a
  restart (pinned by a unit test, and the mould's shape is the proof it
  works).
- ⚠ **The wake costs per body.** Every living resident body now holds one
  armed thermal wake and reconciles **at least once a game hour** (the
  cap); phenology rides the same wake and arms none of its own.
  A reconcile is the work a re-stamp
  already does. The count scales with resident bodies, not with players or
  readers, and eviction is what bounds it. The real-time rate depends on
  the length of a game hour, which the planner did not ground; W6b counts
  wakes and reconciles in a full room and records them. If it is too much,
  the lever is the constant (a longer step for a body projected to stay
  inside its band), never a read.
- ⚠ **Unwatched bodies now pay for the cold.** A resident animal nobody
  visits shivers through its reserves on its wakes, where before it paid
  nothing until read. That is the ruling (the world does not depend on who
  is watching), and *cold is a cost, not a corpse* still bounds it; but
  `behavior.md`'s rule that an NPC cannot starve unobserved now has thermal
  spend acting on the same reserves. W6b adds a unit test: a resident,
  unread, clothed NPC in a cold room for a game day is cold and not dead.
- **No effect kind is added**, but `traversePowerW` gains a term read for
  every body; with no expression suppression it is ×1, and the persons'
  goldens guard it.
- **`operate` on an animal** runs a controller written for patients: its
  posture check, kit default and wording assume a person. D8 lists the
  two document fields that open it; if the controller needs more than
  reading them, stop and ask rather than add a class check.
- **The far-past guard is narrowed** (D17). Any body with a wake armed now
  integrates a long gap in full; a bug that leaves a wake armed on a body
  that should be frozen would bill an absence. W6b's linkdead and
  stood-up-from-offline tests are the guard.
- **Moving `operate`'s match onto the body** (D8) rewrites a shipped
  controller's refusals. The existing `operate` tests must pass with only
  their wording source changed.
- **The `herd` word** may collide (`lint:verb-collisions`). If it does,
  take the collision ladder; do not fall back to overloading `return`.
- **Retiring the name stamp** changes how every drafted head is addressed.
  The W2 acceptance drafts each livestock species and addresses it by every
  word it answered to before.
- **Two gates go blind if untaught** (`lint:census`,
  `check-reachability.ts`): W3 and W5 each include a deliberately broken row
  that must fail.
- **Ectothermy turns on** for seven species in W7. Kept fish in a cold tank
  could go torpid. The W7 unit test is the guard; if a shipped water is
  colder than a species' own tolerance, that is a content finding to record,
  not a dial to bend.
- **Dark-sight turns on** in W9, by the owner's decision. The risk left is
  balance in dark places (the mine, the delve), not whether to do it.
- **Animals gain armor** in W4; the gym benches may move.
- **Unit counts change** in W5. Recipes that take cuts by count should be
  re-read (`sausage`, `hearty-stew`).
- **The tray's exemplar and the moth** are the least-proven design in the
  plan (D10). If the tray's hooks cannot hold a live creature beside leaf
  and frass without the feeding or naming logic counting it, stop and ask
  rather than mint from a read or add a second verb. (The moth's write path
  is the stack's own wake.)
- **Merge seams with `build/naming-overhaul`:** the kind declarations (D1),
  `SpeciesLogic.ts`, `Vitals.ts`, `lib/mixin.ts`, `api/mixin.ts`.
- **Stop and ask** if: a ceiling would have to rise; a module needs a field
  the list in S4 does not have; a head stops binding by a word it answered
  to; the scaling check flags a person species and the
  honest payer is unclear; a wake would have to be armed from a read.

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
- ⭐ **Built as decided, to be cut at the sweep:**
  [respiration-slate](../slates/engine/respiration-slate.md) § 2, *the
  in-place trigger* — the setter fan-out, in W6b (D17). `/finalize` cuts
  § 2 and the header's *Left* line for it. § 3 (the air reserve as a
  breathable read) stays in the slate; its floor crossing is the fan-out's
  second caller.
- Conception, gestation, birth →
  [ranching-slate](../slates/trades/ranching-slate.md). Seam: the `pregnant`
  and `with-young` condition rows, and `HeadOverlay.bornAt`.
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
   `:740-850` the effect union, `:1215-1250`, `:1600-1780`),
   `packages/content/platform/content/platform/idea/Condition/thermal/torpor.yaml` and `platform/idea/api/ConditionLogic.ts` (`:98-180`,
   `:784-960`, `:1247-1481`)
6. `packages/server/src/mud/lib/husbandry/Producing.ts`
7. `packages/server/src/mud/lib/craft/Butcherable.ts`,
   `lib/butchery/Cut.ts`, `platform/thing/Corpse.ts`
8. `packages/server/src/mud/lib/slot/Attired.ts` (`:680-960`),
   `lib/thermal/ThermalRegulation.ts` (`:180-220`, `:262-290` the read,
   `:339-400`, `:700-760`, `:785-860` the cascade, `:900-960`);
   `lib/mould/Mould.ts` (`:392-435`, the wake) and `docs/subsystems/mould.md`
   § *When a set advances*; `lib/thermal/Thermal.ts` (`:706-740`);
   `lib/respiration/Respiration.ts` (`reassess`) and the `Atmospheric`
   setter;
   `docs/slates/engine/respiration-slate.md` § 2
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
17. `packages/content/trade-medicine/content/trade/medicine/cmd/medical/operate.yaml`,
    `src/idea/cmd/medical/OperateController.ts`,
    `content/operations/amputation.yaml`,
    `packages/server/src/mud/lib/vitals/Operation.ts`
18. `packages/content/platform/content/platform/cmd/system/testharness.yaml`
    and `packages/server/src/mud/api/test-harness.ts`
19. `docs/review-questions.md`, `docs/lint-family.md` § census-then-ratchet,
    `docs/antipatterns.md` § *A read the room makes for everyone that
    changes the world*,
    `docs/subsystems/ranching.md` §§ D19–D21

## Build decisions (recorded by `/build`)

Decisions the build made that the plan did not, and what decided each.

- **B1 (W0) — the daylight pin is the world's, not a Locality's.** The plan
  said `--at <place>` as `weather-pin`. Daylength is a function of latitude
  and time with no place tier (`daylightSecondsFor(profile, lat, t)` takes
  no place), and the sync readers (`Producing`) never hold one. So the pin
  is one slot on `CelestialLogic`, reached only through the `@TestOnly`
  `CelestialApi.pinDaylightFraction`, and `daylight-pin` takes no `--at`.
  *Decided by:* the nearest pattern (a pin lives on the thing the read
  consults) and lens 1 (daylength is derivable from latitude, so a
  per-Locality pin would assert something false). A pinned day reads as
  neither rising nor falling (yesterday equals today), which only matters
  to a `rising` band; none of the drive's bands has one. The fan-out to
  living bodies (D9) arrives with phenology in W7, its first reader.
- **B2 (W0) — goldens for detection, insulation and torpor are pinned in
  the wave that changes them, before the change.** Each is taken against
  untouched code at the start of W4 (insulation), W6b (torpor) and W9
  (detection), which is the same guarantee as taking them at W0 and keeps
  each beside the code it guards. *Decided by:* the nearest pattern.
- **B3 (W0) — the drive's testbed fixtures and the W0 wire acceptance
  land with the drive (W11).** Their only consumer is the drive, and a
  wire run needs a standing world; the build skill runs the drive once, at
  code-complete. The staging tools are unit-tested here
  (`TestHarnessController.test.ts`). *Decided by:* the build skill's
  "drive once at code-complete".

- **B4 (W1) — the `body-module` kind is the `DOCUMENT_KINDS` stanza only.**
  naming-overhaul has not landed, so there is no `content/kinds/` reader on
  master; a `kinds/body-module.yaml` would be a file nothing reads. The
  stanza is marked as the shim; the merge that deletes the const adds the
  yaml. *Decided by:* the plan's own fallback (D1).
- **B5 (W1) — three ceilings moved, each with a caller audit in the
  script.** `lint:boundary-roles` +1 (the new catalogue is commons, as every
  document family's is: every anatomy read in any circle goes through it);
  `lint:material-kinds` +207 (the D4 rows author every field their nearest
  shipped kin authors; what stays unauthored is what no comparable row
  authors — template forms, `biologicalSource`, rare dials); and
  `lint:data-ideas` fell 13 → 12 and was re-pinned. The plan said *no
  ceiling rises*; both rises are direct consequences of S1 and D4 as the
  plan wrote them. *Decided by:* CLAUDE.md's ratchet rule (a rise wants a
  caller audit, and these have one).
- **B6 (W1) — part order is the modules' order.** A body expands module by
  module, so `body.torso.heart` now follows `body.torso` rather than the
  legs. No reader depends on order (a root is `parent: null`, the depth
  ladder sorts by area); the golden compares parts by key. *Decided by:*
  the model (order was never a fact about a body).
- **B7 (W1) — fixtures keep flat part lists through `setFlatParts`.** Each
  part becomes a resident single-part module via the catalogue's sanctioned
  `remember` (its own doc says "a fixture"), so 58 test files changed one
  call each instead of being rewritten as modules. Shares are renormalized,
  which every ratio-only reader ignores. *Decided by:* the nearest pattern
  (`remember` is the documented fixture door).
- **B8 (W1) — module paths are the pack's own root.** `species-and-names`
  has no `root:`, so its modules are `/species-and-names/body-modules/…`
  (the plan's example said `/stuff/body-modules/…`); trade-fishing's are
  `/trade/fishing/body-modules/…`. Names are `<segment>-<plan>`; a module
  two plans share keeps the base plan's name (the canid's legs are
  `leg-fore-quadruped`). A species `body:` block arrives with variants in
  W2, its first author. *Decided by:* the installer's path rule.

- **B9 (W2) — `Livestock` folds its short description late, as well as
  its keywords.** The plan named the keyword fold and the `Stuff.ts`
  species rung; but the identity rung asks the short description FIRST,
  and the generic row's `head of stock` would have won, so a cow would
  have read *a head of stock*. `getShortDescription()` answers the form's
  first word, else the row's. *Decided by:* the nearest pattern (the stamp
  it replaces set exactly this field).
- **B10 (W2) — the naming rule.** A body answers to its stage's words,
  then its sex's, then the species' own, minus any word authored only
  under the OTHER sex; a body of no recorded sex excludes nothing (as the
  stamp never did). Stage words moved off the species list, so an adult
  no longer answers to `calf`; and a bull no longer answers to `heifer` (a
  female word). A bull still answers to `cow` and `cattle`, which the
  room calls him. *Decided by:* lens 1 (the words are the animal's kind,
  sex and age, derivable) and the shipped draft-names rule, kept.
- **B11 (W2) — the growth curve reaches the adult mass exactly at
  `matureAt`.** Raw von Bertalanffy reaches 95 % there and creeps up
  after; normalizing to raw-at-maturity (and flat after) keeps the plan's
  rule *an adult weighs what its row says*, with birth still at 7 %.
  *Decided by:* the plan's own test (if an adult figure moves, the curve
  is wrong).
- **B12 (W2, fixing W0) — the staging statics take a handle, not a
  body.** `lint:object-verbs` holds Api statics whose first parameter is a
  world object at zero. The harness already names things by handle
  (`stage` a path or `#id`, `vanish` an id), so `bodyReport`, `woundBody`,
  `severBodyPart`, `killBody` and `afflict` take `#<stuffId>` / a path / a
  resident name, and the controllers pass the bound body's id. *Decided
  by:* the compliant path (no exemption added).

- **B13 (W3) — a body of no recorded sex has no udder.** The tap's old
  *tri-state rule* (an unrecorded sex is open) cannot survive the gland
  becoming a female's part: a body of no recorded sex is the species' own
  body. Herd heads always carry a sex; the change reaches only fixtures.
  *Decided by:* D2 (the gland is a part of the female body).
- **B14 (W3) — a species-wide `body:` block (`Species.body`).** D1 named
  it; W3 is its first author: the sheep's fleece, the bee's crop and the
  four trees' sapwood are on every form, so they are a species delta, not a
  sex one. Sync `applyBody`/`applyVariants` twins exist for resident
  modules (the `applyModules` shape), and the fixture helper gained
  `setFlatTaps` and `setFlatGaits` (B7's door). *Decided by:* the plan
  (D1, D2).
- **B15 (W3) — gaits ride limbs, plus a per-instance `gait` on a module
  ref.** The canid shares the quadruped's legs but also crawls; a ref-level
  `gait` (beside `innervatedBy`) says *this plan's legs also crawl*
  without copying the module. The crab's gaits sit on its torso (its legs
  are not modeled). Gaits are compared as sets. *Decided by:* lens 2 (a
  second canid-like plan is a one-line ref, not a module copy).

- **B16 (W4) — natural armor is its own fold step, not a nullable
  `CoveringLayer`.** The plan made `CoveringLayer.occ` nullable; the fold
  reads the occupant in six places (wear, assembly, clo). One attenuate
  step after the worn stack, from `body.integumentAt(site).skin`, is the
  same innermost layer with no null guards. *Decided by:* the nearest
  pattern (the fold's own call, reused).
- **B17 (W4) — the coat depth reads the tap's standing through
  `standingIn`.** That read reconciles production (it advances a tap's
  stamp). It is the shipped tap read; W6b, which makes the core read pure,
  owns whether the projection may call it. *Decided by:* the nearest
  pattern; flagged for W6b.

- **B18 (W5) — `comesOffAs` is on the body module, not the material.** As
  a material capability it would be unauthored on every food and animal
  row (`lint:material-kinds` counts every `fieldMeta` key of a capability
  mixin, and `comesOffAs: []` is a forbidden sentinel), and an honest
  default answers *nothing* on most of them — P2's sign that the host is
  wrong. On the module it is still forward (a tissue names its rows, not a
  reverse search over cut rows), any species built from modules still
  yields with no list of its own, and a module can say what ITS tissue
  comes off as: the swine's fat is leaf fat and the cow's is suet, the
  hen's leg is thigh and drumstick and the cow's is leg and shank, with no
  new tissue rows for the difference. The entry field is `cut`, already a
  reachability faucet. *Decided by:* P2 and the gate's own doctrine.
- **B19 (W5) — the dog yields like any canid.** Its row authored an empty
  yield as a deliberate refusal. With yields derived from the body, no
  per-species list exists to be empty; the project's rule is that code
  never legislates culture (soft limits), and the named-animal gate is
  what protects a pet. *Decided by:* the soft-limits doctrine.
- **B20 (W5) — units and the floor.** A cut comes off each part carrying
  it (or in `portionKg` portions); anything else is one lot (a hide is one
  hide). The *nothing worth taking* floor fell from 50 g to 5 g (a crab's
  offal is grams), and a coat is kept at any weight. Unit counts changed
  (the commit body lists them per species); masses re-derive from shares.
  *Decided by:* lens 1 (a hide is one skin; a small animal's meat is
  small, not absent).

- **B21 (W6) — `subtree` lives on `VitalsMixin`, not `Corpse`.** The
  missing-parts line is `VitalsMixin`'s, and it must stay silent for a
  part; reading a `Corpse` field from there is a downward import or a duck
  type. *The body is only this part of one* is a fact about a body's
  parts, so `getSubtree()`/`restrictToSubtree()` sit with
  `bodyPartDeltas`, and every other reader sees only the missing deltas.
  *Decided by:* the host-placement test (the reader's own host).
- **B22 (W6) — the sever's mint is detached from `inflict`.** `inflict` is
  synchronous and every caller reads its outcome at once; the delta lands
  synchronously (the body is missing the part when it returns) and the
  part's async mint follows, its failure logged. *Decided by:* the nearest
  pattern (`inflict`'s shape is shipped).

- **B23 (W6b) — the coat's tap is BANKED for the thermal read.** Reading a
  tap live (`standingIn`) reconciles production, so a projection that
  called it wrote (B17's flag). Each coat tap's fill is banked at the end
  of every reconcile, at the seed and at every re-stamp; the reconcile
  integrates its span with the banked fill (the coat the body wore across
  that span) and then re-banks, so the projection still equals the
  reconcile. Cost: a shearing shows in the core at the next reconcile or
  wake, never more than a game hour on. *Decided by:* D17 (a read never
  writes) over the nearest pattern; no new member on `Producing`.

- **B24 (W7) — the neutered form has its own stage words, and replaces
  the sex form's.** `variants.neutered` is a `VariantSpec` with an
  optional `stage` map (a steer grows into an ox); a neutered body drops
  its sex form's words unless the neutered form says them (an ox is not a
  bull). *Decided by:* lens 1 (a player who knows cattle knows a steer is
  not called a bull) over a flat word list.
- **B25 (W7) — `herd enter` goes through `Livestock.enterHerd`.** The
  register decides (`HerdRegistry.refile`, which takes the traits it is
  to write); the head carries its own traits and rebinds itself, so the
  controller words only success. *Decided by:* the mixin decides, the
  controller is dumb (the nearest pattern: `returnToHerd`).
- **B26 (W7) — reason codes: the body's are the platform's, the pack's
  are paths.** `operable`'s seven rows live in the platform pack (the
  kernel body speaks them); `no-body`/`no-kit` and ranching's six are
  `/trade/<x>/reasons/<code>`. *Decided by:* `ReasonCatalogue.pathOf`'s
  rule (a bare code is the platform's).
- **B27 (W7) — `CelestialApi.daylightHere(stuff, offsetS)`.** A sync
  daylength at a thing's place (the climate site up its containment, the
  pin honored), used by phenology and the coat. Putting it on
  `OrganismMixin` split the mixin into a second co-use cluster
  (`lint:mixin-clusters` 43 > 42). *Decided by:* the gate.
- **B28 (W7) — phenology's terms.** An unmodelled term HOLDS (the taps'
  tri-state rule); `stage` means at-or-past (an aged cow still milks); a
  dead body carries no season. *Decided by:* the nearest pattern
  (`tapWindow`) and lens 1.
- **B29 (W7) — the hen is in season too.** She authors `breeding`, and
  `breed` now reads `in-season`, so the hen's schedule carries it beside
  `laying`. *Decided by:* consistency — every species that breeds in
  keeping reads one condition.
- **B30 (W7) — the bullfrog gets the `anuran` plan in W7.** It borrowed
  the quadruped (fur, a hide, cut-loin); an ectotherm needs its own plan
  for W7's acceptance, and W8 adds the tadpole's and froglet's beside it.
  *Decided by:* the acceptance (a frog that is not ectotherm cannot be
  sluggish) and lens 1.
- **B31 (W7) — a severance always goes through `ConditionApi.sever`.**
  `operate`'s severance (amputation included) now mints the part into the
  room, as D7's sever does everywhere. *Decided by:* D7 (one sever).

- **B32 (W8) — an unmodelled body breathes air.** A plan with no parts
  at all (a test fixture, the sessile plan for plants and yeast) breathes
  as a person does; a body WITH parts breathes only from its organs, and
  one with none does not respire. *Decided by:* the taps' tri-state rule
  (unmodelled is the ordinary case) and zero regressions in the shipped
  sessile rows.
- **B33 (W8) — the staging setters are `set*` mutators reached through
  `testharness stage`.** `@TestOnly` marks Api statics only (an instance
  method's descriptor cannot be withheld through the call-security Proxy —
  `lint:test-seams`). *Decided by:* the gate's own rule and the shipped
  `stage` seam.
- **B34 (W8) — a lone worm off the tray does not age on its own.** Its
  clock is the degree-days it left with; ageing off-tray (its own
  temperature trajectory) and the lone worm spinning a stack of one are
  deferred to the sericulture slate. *Decided by:* D17 (no read may
  advance it, and a per-worm wake for an off-tray curiosity is cost
  without a consumer).
- **B35 (W8) — the larva's gland share is pinned by a test, not
  computed at boot.** `GLAND_SHARE_REFERENCE = 0.25`, asserted equal to
  the real modules' share. *Decided by:* load on use (no boot read) and
  the golden (the shipped worm spins exactly what it did).

## Drive record

*(appended at build time)*
