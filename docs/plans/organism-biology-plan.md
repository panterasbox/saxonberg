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
   always. Birth is a non-goal, so D8 seeds lactation at founding and
   re-enters it at the end of the shipped dry period (`restDays`), stated as
   the stand-in for calving.
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
  shipped tick that walks **every** resident object is the residency sweep:
  `ResidencyLogic` (`/platform/idea/api/residency`) runs a
  `ScheduleApi.recurring` pass that refreshes presence
  (`presenceWalkImpl()`) and then walks `StuffApi.getAllObjects()` asking
  each cold-tail object `canEvict` (`docs/subsystems/residency.md` § *One
  sweep*). The subsystem's own title is *object self-maintenance sweeps*.
- `docs/slates/engine/respiration-slate.md` § 2 records the same defect for
  air: *a body standing still is never re-checked* (the in-place trigger).

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
- What exactly `ResidencyLogic.presenceWalkImpl()` counts as present, and
  the sweep's period. D17 depends on both; W6b reads them first.
- The crowded-rooms cost figures. The planner did not find them in
  `docs/subsystems/`; D17's cost risk is stated without numbers and W6b
  measures.
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
| S9 | Flaw kinds `pierced`, `slashed`, `scorched`, `nicked` and `Flaw.site` on `FlawedMixin` | *integument as pelt* — generalize hide → pelt | P9 `look` words them. P12 `holed` stays the hull's. P13 the header is *the flaws a body carries*. **No new mixin.** |
| S10 | **Phenology**: `Species.phenology: [{ condition, trigger }]` (a field) and `VitalsMixin.reconcilePhenology()` (the trigger evaluation, called from the thermal cascade where torpor is decided). Seven new **Condition rows** in the platform pack | *body states* — **generalize** `Condition`: a state is a condition; the new piece is what brings one on and clears it by daylength, core temperature, sex, stage or an event. (The ledger called this genuinely new; grounding found `thermal/torpor.yaml` already is one.) | P9 `look` shows `observableSigns`, `assess` names the condition, `help milk` names lactation. P10 rows of the shipped `Condition` Idea; no new class, kind or catalogue. P11 none. P12 no second state model: every onset and clear is the shipped `afflict` / `relieve`. P13 `VitalsMixin` owns conditions; `Species` owns what a kind of body does on a schedule. P14 a condition comes on only at the body's reconcile or by a named act, and its signs are visible. |
| S10b | Three read-only **`VitalEffect` kinds**: `metabolism` (a factor on basal drain), `pace` (a factor on traverse time), `temper` (a delta on the handling read) | *body states* — extend the effect channel (`Condition.ts:755`), beside `clearance`, which is already a read-only factor with one reader | P9 n/a. P10 n/a. P11 none. P12 this is the answer to *is it a new name for an existing call*: they are three more members of the one effect union, read the way `clearance`, `sedation` and `analgesia` are, not a parallel mechanism. P13 the union is *what a condition does*. P14 read, never integrated. |
| S11 | `Species.variants` (sex, stage, then neutered deltas), `Species.development` (plan and name per stage), `Species.pays` | *sex, age*, *metamorphosis*, *square-cube check* | P9 n/a. P10 fields on existing rows. P13 species facts. Each has a reader outside `Species.ts` in the wave that adds it (`lint:unconsumed-seams`). |
| S12 | `castrate` verb (view + controller in `trade-ranching`), `HeadOverlay.castratedAtAgeDays`, `Herdbook.neuteredFraction`, an optional `to <book>` on the shipped `return` | *reproductive states, castration* | P9 one view, one word, no options; `help` says what it does and when it refuses; `return … to <book>` is an arg in the def. P11 none. P12 new act. P14 the animal decides (`castratePlan`). |
| S13 | `Silkworm` (class in `trade-sericulture/src/agent/`, **on `Creature`**, as `Livestock` is — not `Beast`, which is a deliberating `Actor`) and `LarvalClock` (value object in its `lib/`, extracted from `RearingMixin`) | *metamorphosis* — the tray becomes the compression (ranching D19) | P9 `put`/`get` on a tray, as today. P12 none. P13 one clock, two holders. P14 see D10: the exemplar is content you can see, and it is minted only by an act (`put`, `get`), never by a read. |
| S14 | `lint:scaling` (`packages/server/scripts/check-scaling.ts`) | *square-cube check* — **genuinely new** gate (`lint:anatomy` is structural only) | n/a for P9–P14 beyond P3: it never refuses a creature, it fails a row over a limit with no `pays`. |
| S15 | `testharness` subcommands `body`, `body-age`, `body-sex`, `body-wound`, `body-sever`, `body-kill`, `body-wet`, `keep-current`, `carcass`, `daylight-pin`, `daylight-unpin` | staging tooling this build owes | P9 test-world only; `help testharness` documents each; hyphen compounds, never a nested subcommand (the `clock-advance` / `weather-pin` shape). P12 the shipped `afflict` stages every condition (its target widened from a named character to any body, and stage `0` relieves); `body-wound` is part-level. There is no state tool. No `isWizard` check (`requiresTestWorld`). |
| S16 | **`Stuff.keepCurrent()`** — an `@hook` (default no-op) the residency sweep calls on every **present** object, and the sweep's second pass that calls it. Implementers in this build: `ThermalRegulationMixin` (the thermal reconcile, with torpor's cascade and phenology), `RespirationMixin` (the in-place re-check of the medium), `RearingMixin` and `Cocoons` (the exemplar worm and the moth) | *body states* / *metamorphosis* — **generalize** the shipped sweep (`ResidencyLogic`), whose stated job is object self-maintenance and whose one question today is `canEvict` | P9 n/a. P10 n/a. P11 none: the sweep asks every object the same question. P12 not a second scheduler and not a new reconcile: each implementer calls the reconcile it already has. P13 the sweep is *self-maintenance*; eviction was its first use. P14 this is what makes a change visible without a read: it happens on the tick, and the room is told what `afflict` already tells it. Four implementers, so it is a hook and not a method in the wrong place. |

Explicitly **not** new: **no mixin at all**, no new timer or scheduler
entry (D17 adds a pass to a shipped sweep), no Api (one static on
`SpeciesApi`, one on `ConditionApi`), no logic singleton, no collection, no
hook, no registry, no pelt class, no severed-part class, no integument
mixin, no body-state model. One document kind (`body-module`).

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
  - word the short and long description from the species' `called` name and
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
  [{ part, atAgeDays, sealed? }]` is an authorable instruction field (the
  applier's phase 2, `applyLostParts`) that calls the delta half. It is how
  `ox.yaml` authors its castration and how a herd replays one (D8). It never
  mints a part or a wound.

### D8. Variation: sex, castration, age, reproductive states

- **`Species.variants`** (sex and stage in W2; `neutered` in W7):
  `sex.<sex>`, `neutered`, and `stage.<stage>`, each
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
- **The arg gate** is `handle`'s: the `animal` arg requires `HandlingMixin`
  (per `handle.yaml`). The controller then refuses anything that is not a
  `Livestock` in its own words, copying `BreedController.ts` ~61, and asks
  the animal.
- **The herdbook** records it: `HeadOverlay.castratedAtAgeDays`. ⚠
  `mintHead` replays it through the **delta half only** (`lostParts` /
  `severPart`), never `ConditionApi.sever` — the full sever would mint a
  fresh pair of gonads on the floor and a fresh wound at every draft.
  `Herdbook.neuteredFraction` (default 0; the ox book authors 1) seeds
  founding stock through `HeadSeed`, replayed the same way. The herd's
  composition read gains counts by `called` name (*two oxen*, *one steer*).
- **How the player's steer reaches the ox register.** Nothing today moves a
  head between herds. The shipped `return <animal>` gains an optional
  `to <book>` arg: `Livestock.returnToHerd(book?)` asks
  `HerdRegistry.refile(fromId, index, toId)`, which refuses a different
  species or a book the player does not keep, removes the head from the
  source tally and files it in the destination with its overlay carried
  (age, flesh, handling, castration). Drive step 9: castrate a drafted
  calf, age it, `return steer to ox book`, and read the book — it counts
  one more ox. The calf herd's own read says *steer* before that.
- **The ox** is cattle + male + neutered + mature. `ox.yaml` authors
  `sex: male` and `lostParts: [{ part: body.torso.gonads, atAgeDays: 60 }]`
  instead of being a bare `Livestock`. It is heavier (`massFactor`) and
  calmer (`temper`), read by `HandlingMixin` through `getBody()`.
- **Growth (W2).** `Species.massAt(age, variant)` becomes von Bertalanffy
  (`W∞ (1 − b·e^(−kt))³`, `k` derived from `matureAt` so 95 % is reached
  there; no new authored number). `Creature.getMass` stops freezing the
  seeded frame for a body whose `getLifeStage()` is non-null and whose row
  authored no mass: it derives on read. Stage deltas carry proportions (the
  young's big head and long legs as `scale`), coat and temper.
- **Reproductive states are conditions** (D9): `in-season`, `rut`,
  `pregnant`, `lactating`, `with-young`, rows of the shipped `Condition`
  Idea. The first two come on by the species' phenology (the shipped
  `Species.breeding` daylength band, sex and maturity); the last three are
  event conditions.
  ⭐ **Lactation drives the udder**: the gland authors `activeIn:
  /platform/idea/Condition/reproduction/lactating`, and
  `Producing.tapWindow` answers `not-lactating` (a new `TapClosedReason`,
  with a reason row) when the body does not carry it. The acts that bring it
  on and take it off are write paths that already exist: `mintHead` afflicts
  a mature female of a milking species whose overlay is not dried off (the
  founding seed, and every later draft — the overlay's shipped `driedOffAt`
  is the whole record, so the herd needs no new field);
  `Producing.dryOff` relieves it; the end of `restDays` afflicts it again
  (conflict 7). `pregnant` and `with-young` ship as rows with their effects
  and are brought on only by staging, because conception is a non-goal.

### D9. Phenology: conditions on a schedule

**A state of the body is a `Condition`.** The first draft of this plan gave
states their own mixin, document kind and catalogue. That duplicated what
ships: a `Condition` already has a `signature` of effects, a `resolution`,
`observableSigns`, a place on every `Creature` through `VitalsMixin`, and
`assess` to read it. `packages/content/platform/content/platform/idea/Condition/thermal/torpor.yaml`
is the proof — an ectotherm's cold state, brought on by core temperature and
cleared by warmth. So nothing new models a state. **What is new is
phenology**: the timing of a body's seasonal and life events.

**The rows** (platform pack, beside `thermal/`):

| row | brought on by | signature | signs |
|---|---|---|---|
| `thermal/sluggish` | the thermal cascade (below) | `pace` | slow, cold to the touch |
| `dormancy/denning` | phenology: short days and a cold core | `metabolism` 0.1, `sedation` | buried to the eyes in the mud, does not stir |
| `reproduction/in-season` | phenology: the breeding band, female, mature | `temper` | restless, calling |
| `reproduction/rut` | phenology: the breeding band, male, mature, entire | `metabolism` 1.2, `temper` | thick-necked, bold |
| `reproduction/lactating` | the act (D8) | `metabolism` 1.3 | in milk, a full bag |
| `reproduction/pregnant` | staging only (conception is a non-goal) | `metabolism` 1.15, `pace` | heavy in the flank |
| `reproduction/with-young` | staging only | `temper` | watchful, will not be driven off |

**Every effect the first draft named, mapped onto the effect channel** (the
`VitalEffect` union, `platform/idea/Condition.ts:755`, which has eight kinds
today: `vital`, `reserve`, `function`, `expression`, `convalescence`,
`sedation`, `analgesia`, `clearance`):

| old effect | now | reader |
|---|---|---|
| a basal rate | ⭐ new kind **`metabolism`** `{ factor }` | `Metabolic.basalDrain`, multiplied beside the shipped Q10 `thermalMultiplier()` |
| `pace` | ⭐ new kind **`pace`** `{ factor }` | the traverse duration in `LocomotionLogic` |
| `temper` | ⭐ new kind **`temper`** `{ delta }` | `HandlingMixin`'s read |
| `torpid`, `feeds: false` | the shipped **`sedation`** kind | consciousness already reads it (`Vitals.ts:1760`); an unconscious body does not eat and its brain's beat is already skipped. No new reader. |
| `produces` | not an effect — the gland's `activeIn` names the condition | `Producing.tapWindow` |
| `seen` | the shipped **`observableSigns`** | the look augmenter and `assess`, as for every condition |

Three kinds are added because three effects have no member in the union: a
`reserve` drain is an amount per hour and cannot say *a tenth of the usual
rate*. Each is a read-only factor with one reader, the shape `clearance`
already has. They live **in the union**, so there is one mechanism (P12).

**Cold-slowed and torpor are two rows of one rule.** The thermal cascade
(`ThermalRegulation.reconcileThermalCascade`, `:794`) already has this shape
on the hot edge: hyperthermia's row comes on at `setpoint + 2.5 K`, and the
lethal dwell reads `survivableMax`, *"two facts an author should be able to
tune independently"*. The cold edge has only the far threshold. So for an
ectotherm the cascade gains the near one: **`sluggish`** comes on below
`setpoint − THERMAL_DEFAULTS.SLUGGISH_ONSET_K` and **`torpor`** below
`survivableMin`, exactly as shipped. They stay two rows rather than one row
with stages because `requiresConscious` gates on torpor's path, and the
signature's effects are not stage-indexed (only `sedation` carries
`atStage`). `sluggish` carries `pace` only: metabolism already falls with
core temperature through Q10, and a second factor would count the cold
twice. ⭐ This is the thermal rule's, not phenology's — it is physics, the
same for every cold-blooded body, and no species schedules it.

**Phenology is declared on the species:**

```yaml
phenology:
  - condition: /platform/idea/Condition/dormancy/denning
    trigger: { daylightFrom: 0, daylightTo: 0.42, coreBelowK: 283 }
  - condition: /platform/idea/Condition/reproduction/rut
    trigger: { daylightFrom: 0.30, daylightTo: 0.46, sex: male, stage: adult, entire: true }
```

A trigger is a conjunction of the terms it authors: a daylength band (with
`rising`, the `TapWindowSpec` photoperiod shape), `coreBelowK` /
`coreAboveK`, `sex`, `stage`, `entire` (not neutered). The condition is
carried while the trigger holds and relieved when it stops. An **event**
condition (lactating) is not in `phenology`; the act owns it.
`Species.setPhenology` is async and ensures each condition row
(`StuffApi.ensureConstituent`), so a schedule naming no row throws at
hydration.

**The onset and clear site is torpor's.** `VitalsMixin.reconcilePhenology()`
walks the species' `phenology`, and for each entry calls the shipped
`afflict` or `relieve`. It is called from **one place**:
`ThermalRegulationMixin.reconcileThermalRegulation()` (`:339`), immediately
after `reconcileThermalCascade(elapsed)` (`:391`) — the moment the core is
fresh and torpor has just been decided. No class is added: the evaluation is
a method on the mixin that owns conditions, reading a field on the species.

⛔ **No read mints a condition, and after D17 none can.** As shipped, that
reconcile is entered by a `coreTemperature` read. D17 makes the read pure,
so the reconcile is entered only by writes: a thermal re-stamp (a move, a
change of covering or work), `exchangeWithWater`, and the keep-current tick.
The look augmenter and `assess` read the conditions already on the body.

- **Daylength in a drive.** `testharness daylight-pin <fraction>` (D16)
  pins the daylength the Locality reads, in the one daylength read
  `CelestialLogic` already answers; `reconcilePhenology`, the breeding band,
  castration's season and the coat's cycle all read through it. The drive
  then runs `testharness keep-current` (D16) — the same pass the sweep
  runs — so the condition comes on with nobody moving and nobody reading.
- **Consumers**: `denning` (bullfrog), `in-season` and `rut` (cattle, sheep,
  goat, pig), `lactating` (dairy), `sluggish` (frog, fish, crab — which need
  their three plans to author `thermalStrategy: ectotherm`, which no row
  does today).
- **Medicine sees them**, and that is accepted as honest: `assess` lists a
  cow in season or in milk, as a vet would. The rows author plain names
  (`spoilerName: 0` is the shipped default, so the name shows) and
  `observableSigns` anyone can see; their `signature` and `resolution` keep
  the shipped spoiler level 1. `resolution` is authored honestly so `treat`
  refuses in words: nothing dresses a pregnancy.
- **Persons.** Conditions sit on every `Creature`, so a person species may
  list phenology the day someone authors it (sleep, a person's pregnancy)
  with no host to move. None does in this build.

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
- ⛔ **A read never mints** (the crowded-rooms rule). The exemplar is
  minted by `RearingTray.refreshExemplar()`, called **only from write
  paths**: the tray's arrival and departure hooks (every `put`, every
  `get`), the tray's `keepCurrent()` (D17, when somebody is present), and
  the `@TestOnly` staging setter.
- **The cocoon is spun from the worm's own gland**: shell mass =
  larval mass × the `silk-gland` share of the fifth-age body ×
  the satisfaction terms the tray already carries. The share is calibrated
  so `meanShellMg` equals today's; a golden test pins every tray number.
  Stifle, scorch, the ten-day deadline and `unwind` are **not edited**.
- **Emergence.** Today's pierced flag and egg lot are unchanged. The
  exemplar **moth** is minted by `Cocoons.keepCurrent()` (D17) — the tick,
  when somebody is present — and by the staging setter. It is never minted
  by `look`.
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
| castration on a herd animal | `HeadOverlay.castratedAtAgeDays` in the herd document, replayed by the delta half | always |
| conditions on a schedule | derived: re-evaluated at the body's reconcile from the species' `phenology` | always (nothing to store beyond `VitalsMixin.conditions`) |
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

`testharness` subcommands (test world only), each its own controller over
`TestHarnessApi`, which calls the same model methods a player act reaches.
⛔ A command is `verb subcommand target`, never deeper, so each act is a
**hyphen compound** (the `clock-advance` / `weather-pin` precedent):

| subcommand | does | through |
|---|---|---|
| `body <target>` | **reads**: stage, sex, called name, conditions, core temperature, capacities, what it perceives of `--of <target>` | getters |
| `body-age <target> <days>` | sets the age | `setAge` |
| `body-sex <target> <sex>` | sets the sex | `setSex` |
| `body-wound <target> <part> <channel> [severity]` | wounds one part | `ConditionApi.inflict` |
| `body-sever <target> <part> [channel]` | takes a part off | `ConditionApi.sever` (the shipped `severPart` until W6) |
| `body-kill <target>` | kills into a corpse | `ConditionApi.die` |
| *(a condition)* | the shipped `afflict <target> <condition path> [stage]` — target widened to any body, stage `0` relieves | `afflict` / `relieve` |
| `body-wet <target> <0..1>` | wets the body | `wet` |
| `carcass <species path> [kg] [age days]` | mints a fresh corpse here | `mintCorpseFrom` |
| `keep-current` | runs the sweep's keep-current pass once, now (the author's seam onto the same pass the timer runs) | `ResidencyApi` |
| `daylight-pin <fraction>` / `daylight-unpin` | holds the daylength the Locality reads (or `--at`) | `CelestialLogic`; whoever pins, unpins |

The tray and the cocoons are staged through the existing `/auth/test-stage`
route with the two `@TestOnly` setters D10 names.

### D17. Reading is pure; a tick keeps present bodies current

*(Owner, 2026-11-22: fix the read-writes path in this build.)*

**The read.** `ThermalRegulationMixin.getVitalSign('coreTemperature')` stops
calling the reconcile. It returns **the core the body would have now**:
the stored core carried forward over `now − thermalRegStamp` against the
cached effective ambient (re-read off the room's
`envelopeTemperatureLast()`, itself a non-integrating read), through the
same slice arithmetic. It stores nothing, spends no reserve, afflicts and
relieves nothing, and leaves the stamp alone. To make that one formula and
not two, `integrateThermalSlice` is split into a **pure step** (core,
ambient, insulation, reserve levels, slice → next core and what it would
spend) and the applier that writes the result; the reconcile applies, the
read discards. The projection reads reserve levels and does not draw them
down, so over a long gap it is slightly optimistic about a body that is
running out of fuel; the write path is exact.

**Who relied on the read to advance state, and what each does now:**

| caller | relied on it? | now |
|---|---|---|
| `Metabolic.thermalMultiplier()` (`:1993`) | incidentally: every metabolism reconcile also advanced thermal state | reads the projected core; advances nothing. The Q10 factor it computes is the same number. |
| `VitalsMixin.getConditionBand()` (`:1949`), `assess`, the harness, any vital listing | yes — this was the only thing that updated a body standing still | read the projected core and the conditions **already on the body**; change nothing |
| `restamp()` (`:719`), `exchangeWithWater` (`:751`) | they are writes | unchanged: they call the reconcile explicitly |
| the cascade's `readCore()` | no (inner storage) | unchanged |

**The tick.** Nothing shipped ticks every body (Grounding). The beat
reaches only `Behaved` hosts and engagements only `Engaged` ones, and a
player, a cow and a silkworm are neither or not both. The one shipped pass
over every resident object is the **residency sweep**, and that is what is
generalized:

- `Stuff.keepCurrent()` — an `@hook`, default no-op.
- After its presence walk, `ResidencyLogic`'s sweep calls `keepCurrent()` on
  each object that is **present** (somebody connected is with it). Present
  objects are exactly the ones the eviction half never considers, so the
  touch a proxied call makes changes no eviction decision, and the cold tail
  is never woken. The pass runs under `ExecutionContextApi.runRoot` with the
  logic singleton as principal (the card sweep's lesson: a scheduled
  callback has no principal and a gated call would be denied silently).
- `ThermalRegulationMixin.keepCurrent()` calls
  `reconcileThermalRegulation()`. All its shipped guards stand: nothing
  below `REG_STEP_SEC`, nothing while the world is held still, a re-stamp
  only for a linkdead body, and a gap past `MAX_REASONABLE_GAP_SEC` dropped.
- **It reaches every embodied creature** that can be torpid or carry a
  scheduled condition, because it asks by what an object *is*, not what it
  composes besides: players, NPCs, kept and wild animals, a fish in a
  keepnet or a tank, a silkworm, a head of stock.
- **Game clock only.** The sweep's timer decides *when* a body is brought
  current; *how much* is always game-seconds since its stamp.
- **No boot entry and no new timer.** The sweep is already installed.

**An offline body does not tick.** A logged-off player's body is not
resident, so the sweep never sees it. A linkdead one is resident and is
asked, and the reconcile's shipped linkdead branch re-stamps and returns:
frozen, as metabolism's rule requires. An animal nobody is with is not
present, is not asked, and costs nothing; when somebody arrives it is
brought current on the next pass, with a long absence dropped by the
far-past guard — the shipped rule that a body nobody could have helped is
not billed for the time.

**Torpor is unchanged from the outside**: the same onset
(`core < survivableMin`), the same clear, the same `requiresConscious`
gate, the same row. ⚠ **The one difference, stated:** a body **standing
still** used to change only when something read its core (and then
changed because it was read). It now changes on the tick, within one
sweep period plus one `REG_STEP_SEC`, whether or not anything reads it, and
a read no longer changes it. A **moving** body is unchanged: every move
re-stamps.

**Respiration's in-place trigger is absorbed.** `RespirationMixin` also
implements `keepCurrent()` and calls its shipped `reassess()`, so a body
already standing in a room when the air turns to smoke is re-checked on the
tick. This is a tick, not the setter fan-out the slate decided (§ 2); it
costs up to a sweep period of latency and nothing when nobody is present.
The slate's § 3 (breathers drawing down a room's air reserve) is **not**
built here and does not share the tick.

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
| `reconcilePhenology()` | `VitalsMixin` | Every body that carries conditions can carry one on a schedule. A species with no `phenology` (every person today) does nothing, and that is *this kind of body keeps no calendar*, a species fact, not a default on the host. No guard, no narrowing: conditions are already on `Creature`. |
| `Species.phenology` | `Species` | Absent on most rows means no scheduled condition, the statement an absent `breeding` already makes. |
| `metabolism`, `pace`, `temper` effects | the `VitalEffect` union | Any condition may carry one; a wound, a fever or a drug can now say *slower* without inventing its own read. |
| `keepCurrent()` | `Stuff` (an `@hook`, default no-op) | ⚠ A method on the base class claims something of every object, so it claims only what is true of every object: *you may be asked to bring yourself up to date, and most of you have nothing to do*. It is the shape `canEvict` and `onDestruct` already have. The behavior lives on the four implementers, each of which means it for every host it composes on. |
| the keep-current pass | `ResidencyLogic` | The sweep that already walks every object. |
| the pure core read | `ThermalRegulationMixin.getVitalSign` | Same host; it stops writing. |
| the `sluggish` onset | `ThermalRegulationMixin`'s cascade | Asked only of an ectotherm, in the branch that already asks. |
| `produces` reading | `ProducingMixin.taps()` | Unchanged composers. |
| `castratePlan` | `Livestock` | Every head of stock can be asked; the animal answers no for a female. That is a refusal with a reason, the shape `breedRefusal` already has, not a re-narrowing guard: the verb is afforded by `Livestock` and means something for every species of stock. |
| `castrate` affordance | `Livestock.commandContributions` | A sheepdog (`WorkingAnimal`) does not afford it. |
| `Silkworm` | pack class on `Creature` | One species. A body, not a deliberating actor — the rung `Livestock` uses. |
| `lostParts` | `VitalsMixin` | Every body with parts may be authored missing one; absent on almost every row means *whole*, which is the answer. |
| `Species.variants`, `development`, `pays` | `Species` | Absent on most rows means *one form, within limits*, which is the same statement an absent `ageCurve` already makes. |
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
- **Verbs on objects** — `castratePlan`, `getBody`, `reconcilePhenology` are the
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
- **Reading never writes** — the one shipped violation this build touches
  (the core-temperature read) is removed in W6b, and every mint this build
  adds (a condition, an exemplar worm, a moth, a severed part) is on a write
  path named in its decision.
- **P7 load on use** — modules and scheduled conditions are ensured by the row that cites
  them; `comesOffAs` rows are ensured at the act. No boot entry
  (`lint:boot-entries`).
- **P8 names** — `Body` is what it is; `sustains` sits beside `governs` and
  `serves`; `castrate` over *geld* (requirements); no class is an adjective.
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
| `TapWindowSpec` `event` | W6 | W7 |
| `breathing`, `breathingByStage` | W7 | W8 |
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
- The `testharness` subcommands of D16 that call shipped code: `body`,
  `body-age`, `body-sex`, `body-wound`, `body-sever` (the shipped
  `severPart`), `body-kill`, `body-wet`, `carcass`, `daylight-pin`,
  `daylight-unpin`; and the shipped `afflict` widened to any body, with
  stage `0` relieving.
**Gates:** `lint:command-views`, `lint:subcommand-words`, `lint:view-keys`,
`lint:test-seams`, `lint:wizard-axis`.
**Acceptance:** goldens green on untouched code; a wire test stages a
wounded, killed cow and reads the wound on the corpse; a pinned daylength
closes the sheep's milk window.
**Commit:** `test(organism-biology): W0 goldens and the body staging tools`

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

### W2 — Bodies that vary: sex, stage, growth

**Goal:** the variant machinery every later organ hangs on.
**Implements:** D8 (variants, `called`, growth; **not** castration).
- `Species.variants.sex` and `.stage` (`add`, `scale`, `massFactor`,
  `integument`, `temper`, `called`); `bodyFor({ stage, sex })`; the species'
  async setters ensure the modules a variant adds.
- `called` names in presentation (*bull*, *cow*, *calf*, *ewe*, *lamb*);
  stage proportions for the livestock; `temper` read by `HandlingMixin`.
- von Bertalanffy `massAt`; `Creature.getMass` derives the frame for an
  aging body with no authored mass.
**Gates:** `lint:unconsumed-seams` (readers: `OrganismMixin`, `Handling`,
presentation), `lint:anatomy` (every variant's body), `lint:presentation`.
**Acceptance:** a calf and a cow of one row read different names,
proportions and masses; the `massAt` golden is **re-pinned deliberately**,
with the old and new figures in the commit body; the yield and tap goldens
still pass at the reference mass.
**Commit:** `feat(species): W2 sex and stage variants; the growth curve`

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

### W4 — The integument

**Goal:** every exterior part has a skin; coats insulate; hides armor.
**Implements:** D3.
- Integument blocks on every module (materials from W1); the crab is chitin.
- The armor layer; `primaryTissueMaterial` skips the integument.
- Coat clo in `insulationAt`; the sheep's coat names the wool tap's key, so
  its depth is the fleece's standing; the shiver `look` line.
**Gates:** `lint:anatomy` (integument clause on), `lint:does-nothing`,
`lint:perishable`.
**Acceptance:** persons' insulation and detection goldens unchanged; a shorn
sheep's coat clo is ~0 and its core falls faster than an unshorn one's in a
staged cold wet night (unit arithmetic over `ThermalRegulation`); a wet coat
reads lower than a dry one; `look crab` says chitin. ⚠ Run `pnpm test:gym`
once here: animals gain natural armor and the balance benches may move.
**Commit:** `feat(species): W4 the integument — armor, coat and skin`

### W5 — What a carcass gives

**Goal:** yields derive; the pelt comes off; `butcheryYield` is gone.
**Implements:** D5.
- `TissueMixin.comesOffAs`, authored on the tissue rows; `portionKg` on
  `CutMixin` and the cut rows; pelt, feathers, down, carapace and organ rows
  (hide and fish-skins exist).
- The calf's abomasum as a `newborn` stage-delta part (W2), naming the vell.
- `Butcherable.dress` and `Species.dressOut` rewritten; the pelt line, its
  flaws and the skinner's hand; `Flawed` kinds and `site`; the corpse's
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
after `cure` and `tan` is leather with the flaw (wire); a hen gives feathers
and down; the crab gives chitin; both gates fail on a tissue whose
`comesOffAs` names no row.
**Commit:** `feat(butchery): W5 cut maps derive from the body; the pelt`

### W6 — Parts that change

**Goal:** the severed part is a thing; stumps seal; claws regrow; coats
cycle.
**Implements:** D7.
- `ConditionApi.sever`; the `subtree` option on `mintCorpseFrom` with every
  item D7 lists; `Corpse.subtree`; `missingPartsAugmenter` suppressed for a
  part; the avulsion path; the participant gate on `severPart`;
  `testharness body-sever` moves to `ConditionApi.sever`.
- Delta fields; `lostParts` and its applier; sealing in `afflict`; regrowth
  at reconcile; `moultEveryDays` on the crab.
- Coat `cycle`; the pelt's grade from the coat at death.
**Gates:** `lint:mixin-clusters`, `lint:object-verbs`, `lint:field-meta`,
`lint:silent-catch`, `lint:perishable`.
**Acceptance:** a staged wolf foreleg lies in the place, reads *a wolf's
foreleg* (not *the body of*), weighs its share, is carried, butchered for a
shank and reads its decay stage (wire); the wolf's later corpse lacks that
shank; a crab aged past a moult has its claw and a burned one does not (unit
and wire); under a pinned short day a pelt grades above a long-day one.
**Commit:** `feat(harm): W6 the severed part is a thing; regrowth and the coat's year`

### W6b — Reads are pure; the sweep keeps present bodies current

**Goal:** looking at a body stops changing it, and a body standing still is
kept current by a tick.
**Implements:** D17.
- Read `ResidencyLogic` (`presenceWalkImpl`, the sweep period) first.
- Split `integrateThermalSlice` into the pure step and the applier;
  `getVitalSign('coreTemperature')` returns the projection.
- `Stuff.keepCurrent()` (`@hook`); the sweep's second pass over present
  objects, under `runRoot`; `ThermalRegulationMixin.keepCurrent()` and
  `RespirationMixin.keepCurrent()`.
- `testharness keep-current`.
- `docs/antipatterns.md` gains (or extends) the row for a read that writes,
  with this as the worked case; `thermal.md`, `residency.md` and
  `respiration.md` are updated in this wave, not at the sweep, because the
  doctrine they state changes.
**Gates:** `lint:unconsumed-seams` (the hook has two overrides here, four by
W8), `lint:reconcile-chains`, `lint:thin-forwarder`, `lint:gates`,
`lint:floating-promises`, `lint:test-seams`.
**Acceptance:**
- **unit:** a `coreTemperature` read leaves `conditions`, the stored core,
  the reserves and `thermalRegStamp` byte-identical, for a body whose
  projected core is past the torpor line;
- **unit:** the projected core equals what the reconcile then stores, for
  the W0 cold cases;
- the W0 torpor goldens: the **moving** pairs pass unchanged; the
  **standing-still** pairs are re-pinned to *comes on at the same core,
  on the tick, with no read* — the difference D17 states, in the commit
  body;
- a linkdead body is re-stamped and unchanged by a pass; an object nobody
  is present with is not called (unit, with a counting stub);
- a body in a room that turns to smoke is in crisis after one pass, having
  not moved (unit);
- the cost of one pass over a full room is measured and recorded in the
  commit body.
**Commit:** `fix(thermal): W6b reading a body no longer changes it; the keep-current tick`

### W7 — Castration and phenology

**Goal:** the ox, lactation, the season, the cold-blooded.
**Implements:** D8 (castration, reproductive conditions), D9.
- The `gonads` part on the male delta; `variants.neutered`; `castrate`
  (view, controller, controller row, reasons), `Livestock.castratePlan`;
  `HeadOverlay.castratedAtAgeDays`, replayed by the delta half;
  `Herdbook.neuteredFraction`; the composition read; `return … to <book>`
  and `HerdRegistry.refile`; `ox.yaml` (`sex`, `lostParts`).
- The three `VitalEffect` kinds and their three readers
  (`Metabolic.basalDrain`, `LocomotionLogic`, `HandlingMixin`).
- The seven condition rows; `Species.phenology` and its async setter;
  `VitalsMixin.reconcilePhenology()` and its one call site in
  `reconcileThermalRegulation`; phenology authored on the frog and the
  livestock.
- `THERMAL_DEFAULTS.SLUGGISH_ONSET_K`, the near cold threshold in the
  cascade, `TemplatePaths.thermalSluggish`; `thermalStrategy: ectotherm` on
  the fish, crustacean and frog plans.
- `activeIn` on the udder, `not-lactating`, the afflict at `mintHead` and at
  the end of `restDays`, the relieve at `dryOff`; delete the `event` window
  kind.
**Gates:** `lint:conditions`, `lint:condition-arms` (phenology adds **no
arm** to `reconcileConditions`; it calls `afflict` / `relieve`),
`lint:mixin-clusters` (`reconcilePhenology` reaches `conditions` through
`this.`), `lint:unconsumed-seams` (each new effect kind and `phenology` has
a reader outside its file), `lint:arg-kinds`, `lint:one-word`,
`lint:verb-collisions`, `lint:reason-rows`, `lint:controller-rows`,
`lint:kept-animals`.
**Acceptance:** a non-lactating cow refuses with the reason and a lactating
one gives milk (wire); a castrated calf's herd line reads steer; aged to
adult it is called an ox, outweighs a bull of the same age and handles
calmer; `return steer to ox book` raises that book's ox count by one (wire);
drafting it twice mints no gonads and no wound (unit); under a pinned short
cold day a frog that has **not moved** carries `denning` after one
keep-current pass, reads its signs on `look`, and its basal drain falls to a
tenth (unit and wire); `look` and `assess` at a body whose trigger has just
come true change nothing on it (unit: the conditions list is identical
before and after each read); a chilled trout is `sluggish`
before it is torpid (unit). ⚠ Ectothermy is new behavior for five fish, the
crab and the frog: a unit test holds each at its habitat's temperatures and
asserts it is neither torpid in water it tolerates nor dead.
**Commit:** `feat(species): W7 castration, the ox and phenology`

### W8 — Metamorphosis

**Goal:** one creature, several bodies; the frog and the silkworm.
**Implements:** D10.
- `Species.development`; `breathes` on organs; `Body.breathing()` derives;
  delete `BodyPlan.breathing`, `getBreathableMedia`,
  `Species.breathingByStage`, `breathingFor` and the proxy.
- `formStage`, `reconcileForm`.
- Tadpole, froglet and frog plans and modules; the frog's `ageCurve`;
  `denning` on the frog.
- `LarvalClock`, `Silkworm` on `Creature`, `refreshExemplar` on the tray's
  write paths and its `keepCurrent()`, `Cocoons.keepCurrent()`, the gland-derived shell, the exemplar moth; larva, pupa and
  moth plans; the two `@TestOnly` setters.
**Gates:** `lint:test-seams`, `lint:mixin-clusters`, `lint:anatomy`
(development clause on), `lint:duck-typing`, `lint:pack-extends`.
**Acceptance:** the breathing golden passes for every unstaged plan; a
tadpole aged across its change is the same object with the same name,
breathes air, and a staged wound on its tail has passed to its torso (wire);
the W0 tray golden passes to the milligram; `look` at a tray mints nothing
(unit: the content count is unchanged by reads); a worm taken off a
fifth-age tray reads as a fifth-age larva; an unstifled stack staged to
emergence leaves a moth and pierced cocoons after one keep-current pass.
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
not (wire, through `testharness body <observer> --of <player>`).
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
| skin a carcass | `butcher <body> for pelt` (shipped view) | shipped (`Corpse` is `Butcherable`) | integument on the module; `comesOffAs` on the skin material; the pelt row carries the keyword `pelt` | the butcher ensures `comesOffAs` rows at the act | `cut` is a string matched to exemplar keywords, as today |
| pluck, scale, shell | the same verb, `for feathers` etc. | the same | the coat material's `comesOffAs` | the same | the same |
| gland and blubber yields | `butcher` | the same | the organ's tissue row names its thing row | the same | the same |
| render blubber | the shipped render path (`cook`/recipe) | the pot | `render-blubber` recipe; `whale-oil` material | recipe documents load as today | recipe slot category `blubber` — a tag on the blubber material |
| milk a lactating cow | `milk` (shipped) | `Livestock` | udder on the female delta with `activeIn:` the `lactating` condition row; the reason row | the gland's condition path is ensured with the module | unchanged |
| castrate | `castrate <animal>` (new view, `trade-ranching/content/trade/ranching/cmd/ranching/castrate.yaml`, `category: ranching`) | `Livestock.commandContributions` gains the view key | the `gonads` part on the male delta | the controller row `…/idea/cmd/ranching/CastrateController.yaml` | `animal` requires `HandlingMixin` (`handle.yaml`'s gate); the controller refuses a non-`Livestock` (`BreedController` ~61); the animal refuses the rest |
| file a steer as an ox | `return <animal> to <book>` (shipped view, one new optional arg) | shipped (`Livestock`) | the ox book row | — | `book` requires the herdbook's class, as `draft`'s does |
| pick up a severed part | `get` (shipped) | it is a `Thing` | `/stuff/thing/Corpse` row | cloned at the sever | none |
| regrow | none (reconcile) | — | `regrows` on the part; `moultEveryDays` on the species | with the body | — |
| take a worm off a tray | `get <worm> from <tray>` (shipped) | the tray is a container; the exemplar is content | the `Silkworm` agent row; the three stage plans | the tray clones the exemplar on a `put` or `get` | none |
| conditions on a schedule | none (the body's reconcile) or the act that owns an event condition | — | `Species.phenology` → condition rows in the platform pack | ensured by `Species.setPhenology` | — |
| an eye wound dims sight; dark-sight | none | — | eye parts on head modules; the species' `visionProfile` | with the body | — |
| a still body is kept current | none (the tick) | — | — | the residency sweep, already installed; no boot entry | — |
| stage a body | the `testharness` subcommands of D16 | test world only | — | — | `requiresTestWorld` |

⚠ The four classic silent failures, checked per row above: a view nothing
affords (`castrate` is added to `Livestock`'s contributions in the same
wave), a row nothing loads (every new document is ensured by an async setter
that throws on a miss, and every tissue by `ensureConstituent`), a mixin
nothing reaches (none is added), a `requires:`
nothing composes (`castrate` requires a mixin `Livestock` composes).

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

Proved beyond the requirements' list (owner's decision, D17): **reading a
body never changes it, and a body standing still is kept current** — W6b,
drive steps 12 and 13.

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

| # | pace | how it is staged |
|---|---|---|
| 1 | instant | `clone` a cow, `testharness body-wound <cow> body.torso point 2`, `testharness body-kill <cow>`; then the player's `butcher … for pelt`, `look pelt` |
| 2 | instant | player verbs on the cow; then `testharness carcass <wolf>` and `<hog>` and the player's `butcher` — named cuts, and no row lost |
| 3 | instant | player verbs: `cure <pelt>` with salt (the `salt-hide` recipe), `tan <pelt> in <pit>`; the pit's liquor clock advanced with `testharness clock-advance` in ≤ 1-day steps |
| 4 | instant | `testharness carcass <hen>` |
| 5 | instant | `clone` a shore crab; `testharness body-kill <crab>` |
| 6 | short | `testharness body-sever <crab> body.claw.left`, `body-age <crab> <past the next moult>`; second crab: `body-sever`, `body-wound <crab> body.claw.left heat 2`, `body-age` |
| 7 | instant | `testharness carcass <sperm-whale>`; the player butchers and renders |
| 8 | instant | draft a cow; `testharness afflict <cow> /platform/idea/Condition/reproduction/lactating 0` (relieve), `milk` refuses; `afflict` it again, `milk` gives |
| 9 | instant | draft a bull calf; the player's `castrate`; the herd read says steer; `testharness body-age <steer> <adult days>` beside a staged bull of the same age; `handle` both; the player's `return steer to ox book`; read the ox book |
| 10 | instant | `testharness body-wound <wolf> body.head.eye.left point 2`; a hidden player; `testharness body <wolf> --of <player>` and the same for a cow |
| 11 | instant | in Hearts Delight's `PersistentHall`: `clone` a wolf, `testharness body-sever <wolf> body.leg.frontLeft`; the player picks the foreleg up, butchers a second one for a shank, and leaves one lying |
| 12 | short | two sheep; the player's `shear`; `testharness weather-pin rain`, `clock-advance` a night in steps with `testharness keep-current` after each — **nobody moves and nobody reads**; then `testharness body <sheep>` reads: the shorn one is colder and carries hypothermia first; `assess` it twice and its conditions are the same both times; a wet and a dry wolf by `body-wet` |
| 13 | short | `clone` a tadpole; `testharness body-age <tadpole> <past the change>`; then `testharness daylight-pin 0.35`, `weather-pin snow`, `clock-advance`, `keep-current`: the frog, which has not moved, carries `sluggish`, then `denning`, and its rate falls |
| 14 | short | `/auth/test-stage` `setDegreeDays` on a tray; `get silkworm from tray`; the stifling oven; `unwind`; a second stack with `setSpunAt` back-dated past ten days, then `keep-current` |
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
  in W3, W6, W7 (`reconcilePhenology`) and W8. Each new member shares state
  with existing ones through `this.`.
- **Medicine now sees seasons and milk.** `assess` and diagnosis list
  `in-season`, `lactating`, `denning` beside wounds and fevers. Accepted as
  honest. The thing to watch is noise: a herd read should not turn into a
  page of conditions, and `treat` must refuse each of these in words rather
  than offer a dressing.
- ⚠ **Torpor's driver changes (W6b).** The read that used to bring a
  still body current is gone, and the tick replaces it. Three things can go
  wrong: a still body nobody is present with is no longer updated by an
  `assess` from afar (accepted: nobody is there); the projection and the
  reconcile disagree (the W6b unit test pins them equal); a caller nobody
  found relied on the read (the W0 goldens for moving bodies and the full
  suite are the net). Latency is one sweep period plus one step.
- **The tick costs per present body.** One pass now calls every present
  object's `keepCurrent()`; most return at once (no-op, or under
  `REG_STEP_SEC`). The crowded-rooms figures were not found, so W6b
  measures one pass over a full room and records it. If it is not
  negligible, the remedy is slicing the pass (residency.md already names
  budgeted slicing as the escalation), not moving work back onto reads.
- **Respiration's re-check is now a poll**, where its slate decided a
  fan-out from the setter. It is correct and late by up to a sweep period;
  smoke kills a little slower than it would. Say so in `respiration.md`.
- **Three new effect kinds** touch `Metabolic`, `LocomotionLogic` and
  `HandlingMixin` for every body. With no condition carrying them the
  factors are 1 and the delta 0; the persons' goldens guard it.
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
  is settled by D17.)
- **Merge seams with `build/naming-overhaul`:** the kind declarations (D1),
  `SpeciesLogic.ts`, `Vitals.ts`, `lib/mixin.ts`, `api/mixin.ts`.
- **Stop and ask** if: a ceiling would have to rise; a module needs a field
  the list in S4 does not have; `castrate` collides in
  `lint:verb-collisions`; the scaling check flags a person species and the
  honest payer is unclear; `return … to <book>` needs a new view key.

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
- ⭐ **Absorbed, to be cut at the sweep:**
  [respiration-slate](../slates/engine/respiration-slate.md) § 2, *the
  in-place trigger* — built here as `RespirationMixin.keepCurrent()` (D17).
  `/finalize` cuts § 2 and the header's *Left* line for it. § 3 (the air
  reserve as a breathable read, breathers drawing it down) stays in the
  slate; its seam is the same `keepCurrent()`.
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
   `platform/idea/api/ResidencyLogic.ts` and `docs/subsystems/residency.md`
   § *One sweep*; `lib/respiration/Respiration.ts` (`reassess`);
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
17. `packages/content/platform/content/platform/cmd/system/testharness.yaml`
    and `packages/server/src/mud/api/test-harness.ts`
18. `docs/review-questions.md`, `docs/lint-family.md` § census-then-ratchet,
    `docs/subsystems/ranching.md` §§ D19–D21

## Drive record

*(appended at build time)*
