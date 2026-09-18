# Nutrition & fitness — implementation plan

Executes [nutrition-and-fitness-requirements](../requirements/nutrition-and-fitness-requirements.md)
(closed product scope; seeding slate
[nutrition-and-fitness-slate](../slates/builds/nutrition-and-fitness-slate.md)).
**Kind:** feature. **Lead end:** kernel — the first consumer is every
body that already works (the quern, the anvil, the plough, the two
`eats` cast), which is what makes a kernel-led build not premature: the
producers are running today and are simply not read.

What the code needs, in one paragraph: five new biological `Reserve`s on
the body (`lean`, `protein`, `wind`, `vitamin-c`, `alcohol-tolerance`) that
ride the metabolism clock that already runs; one `exert()` verb on a
kernel mixin, emitted at three chokepoints (the scheduler's completion,
the self-powered traverse, the combat exchange) and read by four things
(the endurance debit, the muscle stock, the wind stock, the heat load);
conditioning bands derived from body stocks rather than the Transcript;
reach expressed as body-gated reads on verbs everyone already has; one
`gym` archetype and one made device; ten fruit rows that carry a vitamin;
and every new rate a `config`-turnable dial.

Planned 2026-09-18 against `design/nutrition-fitness` at `bfbbb9fa1`
(0 behind `origin/master`). Build-4's `design/harm-survey` (93 commits
ahead of master, unmerged) is read where noted; the two waves that
compose on it are gated on its merge.

---

## Grounding

Every fact below was verified by opening the file this cycle. Paths are
repo-relative; `mud/` means `packages/server/src/mud/`.

### The body and its reserves

- `mud/lib/reserve.ts` — `ReserveStored {capacityValue, currentValue, unit, theme, floorEffect}` (:56-62);
  `BIOLOGICAL_RESERVE_KEYS = ['endurance','satiation','hydration','flesh']` (:65-70);
  `Reserve.defaultBiological()` (:129-160) returns the keyed record, `flesh`
  seeded at 55 with `floorEffect: 'emaciation'`; `ReservedMixin` persists
  `reserves: Record<string, ReserveStored>` (`{persistent, runtimeState}`),
  `installBiologicalReserves()` is **per-key idempotent** (:238-242 — a body
  hydrated from an older record gains only the keys it lacks, so a new
  reserve needs **no migration**). `adjustReserve(key, Quantity)` throws on a
  missing key and clamps `[0, capacity]`. Called from the `Creature`
  constructor (`mud/lib/creature/Creature.ts:249`).
- `mud/lib/metabolism/Metabolic.ts` — `NutrientRoute.reserve` is the closed
  union `"satiation" | "hydration" | null` (:176); `NUTRIENT_ROUTING` (:337-346)
  routes `water/carb/sugar/fat`, and `protein: {reserve: null, absorbPerMin 0.5, yieldPerLitre 70}`
  — the protein pool drains and is **discarded** at :797-804. `routeIntake`
  (:1277) fans `BlendLabel.nutrientsOf(payload, material)` tags through
  `routeTag` (:1400, a table lookup) so an unknown tag is a no-op.
  `integrateSlice` (:707-714) runs absorbDigestion → basalDrain →
  coupledRecovery → clearBurdens → partitionFlesh; `partitionFlesh` (:741-772)
  reads `reserveCurrent('satiation')` (:1514) against `FLESH_SURPLUS_AT 70` /
  `FLESH_DEFICIT_AT 25` and is a no-op when the host lacks `flesh`.
  `reconcileMetabolism` (:579-672): first-touch seed, **linkdead re-stamp**
  (:596-602), `isLivingBody()` guard, **far-past guard** `MAX_REASONABLE_GAP_SEC`
  unless `integratesLongAbsence()`, `STEP_SEC 60`, `MAX_STEPS 720`.
  `reconcileCascade` (:1058-1103): for every `theme: 'biological'` reserve with
  a `floorEffect` in `CONDITION_PATHS` (:323), spawn `self.afflict({kind:'affliction', templatePath, stage:0, elapsed:0})`
  at `current <= 0`, `self.relieve` at `current >= CONDITION_CLEAR_PCT (15)`
  (`collapse` clears at 10); lethal only if the effect is in `LETHAL_SEC`.
  All dials are the hard `METABOLIC_DEFAULTS` const (:190-316); nothing in
  this file reads `AppApi.setting`. `EAT_PORTION_LITRES: 0.4` (:209).
  `coupledConsumers()` is a `@hook` (:962).
- `mud/lib/creature/Creature.ts` — composition (:134-203): `ChattelMixin(BrandedMixin(PostmortemMixin(ConcealableMixin(LoadBearingMixin(ContainerMixin(ContainableMixin(DisguisableMixin(PerceptibleMixin(VisibleMixin(ThermalRegulationMixin(ThermalMixin(RespirationMixin(MetabolicMixin(VitalsMixin(ReservedMixin(PosedMixin(SlottableMixin(AttiredMixin(BodyPlanSlotsMixin(SlottedMixin(OrganismMixin(PropertiedMixin(Agent)))))))))))))))))))))))`.
  `getEndurance/getSatiation/getHydration/getFlesh` (:263-291);
  `BODY_CONDITION_BANDS` (:209-217) and `bodyConditionBand()` (:310-320,
  thresholds 0.12/0.3/0.72/0.9); `BODY_CONDITION_PHRASE` (:230-236) is
  livestock idiom and `bodyConditionPhrase()` (:327) has **exactly one
  production caller**: `packages/content/trade-ranching/src/agent/Livestock.ts:132`
  (`stockmanRead`). `getMass()` (:347) lazy-seeds from
  `Species.getBaseMass()` (own → plan → 0).
- `mud/platform/idea/species/Species.ts` — `getBaseMass()` :701, `getStature()` :715 (own else plan), `massAt(ageDays)` :847. biped authors `baseMass: 70 / baseStature: 1.75`.
- `mud/platform/idea/species/BodyPlan.ts` — `TissueComposition {tissuePath, mass}` (:63-68), `BodyPart.tissues` (:88);
  `packages/content/species-and-names/content/stuff/idea/species/BodyPlan/biped.yaml`
  authors torso `bone 8 / muscle 12 / flesh 20` etc. — plan-level flyweights
  summing past the species mass (the 92.9 kg on 70 kg the requirements
  name). **Nothing aggregates tissue by kind.** Untouched by this build.
- Conditions: rows at `packages/content/platform/content/platform/idea/Condition/metabolism/`
  (collapse, dehydration, emaciation, starvation + 7 toxins). `emaciation.yaml`
  is the shape: `signature: []`, `progression: {law: stage, intervalMs: 86400000}`,
  `resolution: {by: food}`, `observableSigns: [...]`, `contagion: null`.
  `VitalEffect` (`mud/platform/idea/Condition.ts:410-450`) has the
  `{kind:'reserve', reserve, pctPerHour}` arm, integrated at `mud/lib/vitals/Vitals.ts:949`.
  `mud/lib/paths.ts` carries `metabolismStarvation/Dehydration/Collapse/Emaciation` (:82-92)
  and the `metabolismCondition` prefix (:145). `ConditionCatalogue`
  (`mud/platform/idea/ConditionCatalogue.ts`) self-warms the rows into live
  Ideas, so a new row under the prefix resolves with no boot edit.
- `lint:conditions` (`packages/server/scripts/check-conditions.ts`) refuses a
  `progression` block without one of the four laws; `lint:condition-arms`
  holds the reconcile-arm census — a new condition must ride an existing
  spawn path (the cascade), never a new arm.

### Nutrients and the label

- `mud/platform/idea/material/Material.ts` — `nutrients: string[]` (:559) and
  `nutrientAmounts: Record<string, number>` (:569) are **open string keys**,
  both `{persistent, spoiler: 1}` (:737-738); accessors :800-805.
- `mud/lib/metabolism/NutritionLabel.ts` — `renderNutritionLines` (:35-55)
  prints every key in `amounts`; `labelFaceOf` (:90-125) prefers the bulk
  payload → a `Composed` host's composition → the own Material. Composers:
  `mud/platform/thing/Dish.ts`, `packages/content/trade-baking/src/thing/Loaf.ts:75`
  (`StalingMixin(NutritionLabelMixin(Provision))`). A bare `Provision`
  (`mud/platform/thing/Provision.ts:52` — `CraftedMixin(ComposedMixin(Contaminable(Cured(ThermalDose(Freshness(Thermal(Detailed(Thing))))))))`) carries no label.
- `mud/lib/metabolism/BlendLabel.ts` — `nutrientsOf` (:81-92) unions the
  ingredients' tags; `amountsOf` (:102-119) sums `mg × servings` over the
  composition. So a food's routing tags **derive from its parts** already.
- 31 material rows author `nutrientAmounts` today (mg **per kg** — bran
  `{carb: 210000, protein: 155000, fibre: 430000}`, wheat-flour
  `{carb: 810000, protein: 92000}`); `fibre` is already a tag on bran.
- Fruit: `packages/content/trade-farming/content/trade/farming/idea/material/{orange,lemon,lime,grapefruit,cherry,cranberry,grape,olive,mint,juniper}.yaml`
  — `orange.yaml` authors `nutrients: ["water", "sugar"]`, no amounts, edible;
  the discrete `trade/farming/thing/orange.yaml` is `class: /platform/thing/Provision`, mass 0.18.
- Loaves: `packages/content/trade-baking/content/trade/baking/thing/white-loaf.yaml`
  authors `composition: [{wheat-flour 7.8}, {bran 0.2}]` (the authored-
  composition precedent); `lean-loaf.yaml` is the chain's output row.
- The eat path: `EatController.ts:84-85` → `BulkableApi.ingestSolid(giver, material, portion, payload)` → `Metabolic.ingest` → `routeIntake`.

### Dials

- `mud/lib/config/AppSettings.ts` — `AppSettingKeys` is one flat `as const`
  (values are dotted strings, e.g. `freshnessMuMaxPerHour: "freshness.muMaxPerHour"` at :1233);
  `AppSettingFallbacks` holds exactly one code-side fallback.
- Values ship as `packages/content/platform/content/settings/<area>.yaml`
  (`settings: [- key/value]`, merge-missing; 47 files today, no `body.yaml`).
- `AppApi.setting(key): string` (`mud/api/app.ts:104`, `''` if unset);
  `AppApi.setSetting` is what the wizard `config` verb calls
  (`ConfigController.ts:67`, view `platform/cmd/system/config.yaml`,
  `requiresWizard`). The per-read pattern is `mud/lib/material/Freshness.ts:129-138`
  — a module-private `function dial(key, fallback)` (`parseFloat`, fallback
  on `''`/NaN/throw). Per-read means a `config` change is seen by the next read.

### Exertion producers

- `mud/platform/idea/cmd/crafting/ManualBuildController.ts` — `BuildStepOptions {durationMs, beginSelf, beginPeers?, onComplete, onAbort?}` (:36-47) has no effort field; `engageStep` (:60-73) builds `new ManualBuildStep({actor, slots:['hands'], durationMs, onComplete, onAbort})` → `SchedulerApi.start`. `paceMs` (:164-177); `declineStep` (:180-187). **`engageStep(` call sites: 25 in 22 files** (kernel: Heat:55, Pour:106,171, Stir:53, Wash:71,130, Boil:150, Repair:66; packs: Knead:89, Plate:74, Dye:167, Mordant:86, Garnish:45, Muddle:60, Strain:79, Hammer:133, Quench:78,148, Sharpen:86, Alter:103, Cut:131, Sew:82, Scutch:141, Spin:132, Weave:109). **Five sites bypass it with `new ManualBuildStep(`:**
  `trade-mining/src/idea/cmd/mining/MiningActController.ts:122`,
  `trade-smelting/src/idea/cmd/smelting/SmeltController.ts:339`,
  `trade-farming/src/idea/cmd/farming/FieldWorkController.ts:153`,
  `trade-milling/src/idea/cmd/milling/MillController.ts:189` (`grindMs = mill.grindMs(kg)`),
  `trade-fuel/src/idea/cmd/fuel/CharController.ts:107` (`attention` slot).
- `mud/lib/craft/ManualBuildStep.ts` — `ManualBuildStepOptions {actor, slots, durationMs, onComplete, onAbort?, host?}`; `implements DurativeActivity`; `onStart` stamps `startedAt = Date.now()` (**wall ms**); `onComplete(){ this._onComplete(); }`.
- `mud/api/scheduler.ts:61-79` — `DurativeActivity extends Engagement { duration; replaceableBy; onComplete() }`, no effort. Eight classes implement it: `ManualBuildStep`, `CastActivity` + `StudyActivity` (**kernel**, `mud/lib/magic/`), `SearchActivity`, `DressingStep`, `OfferEngagement`, `HazardActivity`, `BehaviorBeat`.
- `mud/platform/idea/SchedulerRegistry.ts` — the completion chokepoint is `dispatchOnComplete(e)` (:539-551), reached from `completeFromTimer` (:493, after `clearTimersAndSubs` + `deregister`) and `runOnCompleteInPlace` (:472, the <100 ms path); aborts go through `terminate(e, reason)` (:498-513) → `dispatchOnAbort`. The registry already narrows `MixinApi.isSensor(actor)` before envelopes, so a narrowed body call is in-pattern.
- **Endurance debit census — exactly five sites**, all `%` points, all before `SchedulerApi.start`, none refusing on insufficiency:
  mining `MiningStepOptions.cost` (:48) → `spend()` (:149-154; `HEW_COST 4 / HEW_MS 9000`, `DRIVE_COST 12 / DRIVE_MS 40000`, `SHORE_COST 8 / SHORE_MS 20000`, durations scaled by `paceForGround(base, hardnessMPa)`, min 500 ms);
  farming `FieldStepOptions.cost` (:67) → `spend()` (:176-181; `lime 4`, `ditch 5`, `grub 6`, `mow 8`, `plough round(14 / max(1, draught))` with duration `14000·(1+stoniness)/max(0.5, draught)`) + `credit()` (:191-198, `AGRICULTURE` deed);
  smelting `SMELT_COST 10` over `SMELT_MS 120_000` on the `attention` slot (:85-87, :330-345);
  `mud/lib/encumbrance/LoadBearing.ts` `drainForTraversal()` (:351-360: `DRAIN_PER_TRAVERSAL 2.0 × (ratio − LIGHT_LOAD_FLOOR 0.25)`, nothing under the floor);
  `mud/lib/vitals/Vitals.ts` `drainForLimp()` (:830-845; on harm-survey rewritten over `capacityScalar('locomotion')` at :1316-1330). Combat and magic never debit.
- `LoadBearing.getCarryCapacity` (:306-318) = `mass × CAPACITY_FRACTION 0.5 × CONDITION_BAND_MARGIN × enduranceMargin` — **no muscle term**; `enduranceMargin` (:184-193) maps endurance fraction onto `[ENDURANCE_FLOOR 0.5, 1]`.
- `mud/platform/idea/api/LocomotionLogic.ts` `engageAround(actor, mode, exit, action)` (:372-410): after a successful self-powered traverse runs `actor.drainForTraversal()` then `actor.drainForLimp()`; `mode: LocomotionMode` is in scope; passthrough riders never reach it (structural). `checkEnablementScope` (:505-548, module function) walks `findEnablementHost` — the actor's **container and its contents** — for a host composing the mode's `enablementMixin`, then `canBeEngagedBy`, then the heavy-load veto.
- `mud/platform/idea/LocomotionMode.ts` — `costMultiplier` (:99, "forward-looking knob") with `getCostMultiplier()` (:247) and **zero production readers**. Rows: walk 1.0, run 2.0 (`speed 2.0`, `noiseLevel loud`), climb 2.0 (`speed 0.5`).
- `mud/platform/idea/cmd/movement/LocomotionControllerBase.ts` `execute` (:53-169): `mode` is a `const` from `LocomotionApi.loadMode(this.modeName(context))` (:75); gates are `canTraverseExit` (:115) then combat `disengage`, then `engageAround`. **No step exists to downgrade a mode**; `emitRejection` maps the guard gate onto `LocomotionGateFailedNote['gate']` (:239-253). `RunController` overrides only `modeName() → 'run'`. `run.yaml` view has `requiresAnimate` + `requiresConscious`, arg `target` `requires: any`.
- **Nothing composes `ClimbableMixin`** — not one class under `mud/` or any pack `src/`, not one content row (`grep -rn "ClimbableMixin(" ` and `grep -rln Climbable --include=*.yaml` both return nothing outside the mode/verb views). `packages/content/rejection/content/world/rejection/ferrow/winze-head.yaml` has exits `east`/`west` only and a `hole` detail; its header comment says the winze "is CLIMBED" but no `down` exit and no ladder exist. ⚠ The requirements' survey sentence *"one exit in the world is climbable (the Ferrow winze ladder)"* is **false**: `climb` has never been reachable by anyone. See Risks.
- `mud/lib/locomotion/Climbable.ts` — `CLIMBING_CAPABILITY_PROP = Property.of<number>('climbing')` (:27), `canBeEngagedBy` (:69-75) `getProp(...) ?? 1 >= difficulty`. Nothing sets the prop anywhere.
- Combat: `mud/lib/character/Character.ts:96` composes `CombatantMixin` **outer** of `CommandGiver`/`Mobile`/… and of the whole `Creature` body (`AdvancementMixin(CombatantMixin(CommandGiverMixin(MobileMixin(HaulerMixin(EngagedMixin(CasterMixin(MemorizedMixin(SoulMixin(VocalMixin(PerceptionMixin(PerceiverMixin(SensorMixin(GenderedMixin(DispositionedMixin(PersonaMixin(StatusMixin(BeliefStoreMixin(HidingMixin(EmployedMixin(Creature))))))))))))))))))))`); `Combatant.onExchangeResolved(ctx)` is a `@hook` no-op terminal (`mud/lib/combat/Combatant.ts:284`) invoked from `CombatLogic.witnessExchange` (:3140-3184) actor-first then target with a `CombatHookContext {session, beat, actor, target, gambit, outcome, channel, instrument, venue}`. **No class overrides it today.** `enduranceRatio` (:1688) already feeds tempo and poise.
- Magic: `mud/lib/magic/CastActivity.ts` — `CastActivityOptions {actor, spellId, durationMs, onComplete, onAbort?, host?}`, slots `hands+voice`; constructed from `packages/content/arcana/src/idea/cmd/magic/CastController.ts:96-118`. On harm-survey `mud/platform/idea/api/MagicLogic.ts:989-1018` `absorbWasteHeat` → `if (MixinApi.isThermalRegulation(endpoint)) endpoint.absorbHeatLoad(load)`.
- Build-4 (`design/harm-survey`, branch only): `mud/lib/thermal/ThermalRegulation.ts` `heatLoadJ` (persisted `{persistent, runtimeState}`), `absorbHeatLoad(joules)` (:147-151), `shedAndOffset(sliceSec, ambientK)` (:376 — `HEAT_SHED_W 400 × SHED_BODY_CLO / (SHED_BODY_CLO + clo) × sliceSec`, costs hydration on `HEAT_SPEND_PER_DEGREE`, stops past `WET_BULB_CEILING_K` or at hydration 0, `noteSweat()` while load remains); `mud/lib/vitals/BodyCapacity.ts` (`BODY_CAPACITIES`, `FUNCTION_BANDS`); `Vitals.capacity(key): FunctionBand` (:1132), private `capacityScalar` (:1107); `mud/api/mixin.ts` gains `isThermalRegulation` (:1240). **Master has `Mixins.ThermalRegulation` (`mud/lib/mixin.ts:351`) and the mixin, and none of the above.** Build-4 also touches `AppSettings.ts` (+76), `platform/content/settings/response.yaml`, `Vitals.ts` (+718), `AssessController.ts` (+167 from :193 down), `BodyPlan.ts`, the three BodyPlan rows, `Thermal.ts`, `MagicLogic.ts`, arcana `settings/magic.yaml`.

### Advancement

- `mud/platform/idea/Discipline.ts` — `DisciplineChannel = skill|knowledge|conditioning` (:40); `ConferralRule {band, verbs}` (:53-56); `DisciplineDescriptor` (:63-74) and `fieldMeta` (:110-120) carry key/channel/label/description/iscedf/requires/specializes/synergizes/conferrals — **`channel` is never read at fold time**.
- `mud/platform/idea/DisciplineCatalogue.ts` `buildDescriptor` (:178-207) **whitelists keys** — a new row key is dropped unless added; `conferralRules` (:162-171).
- `mud/lib/advancement/Advancement.ts` — `bandsForImpl(owner)` (:151-168) groups `TranscriptEntry.find({owner})` by discipline → `Competence.bandOf(rows)`; only disciplines **with evidence** appear; `conferredVerbsImpl` (:177-189); `refreshConferrals()` (:360-383) is called only after an append (:413, :431), pops then conditionally pushes the catalogue as command source into the `self` bucket; `competenceBandFor` (:459-470) + `suppressed` (:497-502, reads `Vitals.expressionSuppression()`). The two fold caches (:195-222) are `DerivedStandingCache`s invalidated by the ledger's own notify.
- `mud/lib/advancement/Competence.ts` `derive` (:119) is a pure BKT fold sorted by `when`, no decay; `CompetenceBand.ts` bands `untrained|novice|competent|proficient|expert`, `atOrAbove`, `lowered`.
- Decay precedents: `mud/lib/Decay.ts:39-42` `Decay.byHalfLife(ageS, halfLifeS)`; `mud/lib/trait/TraitPosition.ts:94-105` `deriveAxis(disposition, evidence, now, dials)` with `halfLifeSeconds`; participation decays on `realAt` with `AppSettingKeys.participationDecayHalfLife` (:129).
- Rows: `packages/content/platform/content/platform/idea/Discipline/` (30 rows). `alcohol-tolerance.yaml`: `channel: conditioning`, no iscedf, no conferrals. `mixology.yaml:13-16` is the conferral shape (`- band: competent / verbs: [social/flourish.yaml]`).
- `PracticeController.ts:61-63` is the wizard credit harness (`creditDeed` then `competenceBandFor`).

### Archetype, tools, device, look, assess

- `mud/lib/archetype/Archetype.ts` — `CapabilityNeed` (:141-152) `{tool}|{heatK}|{bulkSource}|{surface:true}|{seating}|{coldStorage:true}|{rest}|{presence}|{lightLux}|{cultivation}|{vesselKind}`; `CapabilitySlot {key, needs, default}` (:154-159); `ArchetypeData.industry: string|null` — a room archetype has none; `surveyScope` default `space`; `satisfies(space)` (:449-468) pools `getContents()` **plus** `getFixtures()` and is "reported, never enforced"; `satisfyingItem` (:502-509) `pool.find(i => MixinApi.isTool(i) && i.hasCapability(need.tool))`. `ArchetypeCatalogue.warm()` (:54-67) reads `DocumentApi.listOfKind('archetype')`.
- `mud/platform/idea/cmd/perception/SurveyController.ts` `roomArchetypes()` (:160-167) reports every archetype with `industry === null` (bedroom/kitchen/bathroom/living today) for the room you stand in. View `platform/cmd/perception/survey.yaml` (`requiresAnimate`, `requiresEmbodied`).
- Room archetype rows live in `packages/content/generic-objects/content/archetypes/{bedroom,kitchen,bathroom,living}.yaml`; `bedroom.yaml` is `archetypeId: bedroom / label: a bedroom / capabilities: [- {key: sleeping, needs: {rest: 1}, default: /stuff/thing/fixture/bed}]`. Venue archetypes (`trade-mining/content/archetypes/mining.yaml` etc.) carry `industry:` and `{tool: X}` needs.
- `packages/server/scripts/check-capabilities.ts` — an archetype slot's `needs: {tool: X}` **counts as a consumer** (:124-126); consumers also: `toolCapabilities:`, `[capability.X]` in a view, `hasCapability('X')` in source. Ceilings: required-never-declared **0**; declared-never-consumed is a ratchet.
- `mud/lib/craft/Tooled.ts` — `capabilities: (string|CapabilitySpec)[]` `{persistent, authorable}` (:45-56); `hasCapability` false when Durable + broken (:78-85); `capabilityRate` (:87-95). `mud/platform/thing/ToolItem.ts:37` = `CraftedMixin(ToolMixin(DurableMixin(DetailedMixin(Thing))))`. `packages/content/trade-smithing/src/thing/Anvil.ts` is the exemplar: `class Anvil extends ToolItem { static commandContributions = { environment: SMITHING, peers: SMITHING } }` (verbs as yaml paths). **Row-level `commandContributions:` is dead** (`CommandLogic.ts:3111-3143` reads the constructor chain only). Kernel classes with contributions today: `platform/thing/{JobBoard,PaymentCard,Tariff,TipJar,WaterFixture,Stock,WateringCan,ConsignmentShelf}.ts`. A pack row may name a kernel class (`copper-ingot.yaml` is `class: /platform/thing/Ingot`).
- Recipe shape: `packages/content/trade-smithing/content/recipes/fire-poker.yaml` — `recipeId, name, keywords, inputSlots: [{slot: stock, category: forgeable, minGrade: poor, kind: item, count: 1}], toolCapabilities: [striking, anvil], outputTemplate, outputMaterial: '', outputApplication: tangible, requiresHeatK: 700, difficulty: trivial, discipline: smithing`. 14 recipes ship there.
- Counters: `packages/content/distribution/content/trade/distribution/thing/counter.yaml` (`class: /platform/thing/Stock`, `stockLines: [{itemTemplatePath, par}]`, `prices: {path: n}`; today malt-sack 5 and grist-sack 7) at `/world/terminus/counting-houses/cash-and-carry`; `distribution/package.json` depends on base-library, platform, trade-milling. The general store's counter (`terminus/content/world/terminus/general-store/counter.yaml`) already references `trade-farming` seed rows.
- Look: `LookController.ts:349,386` → `target.getMarkupLong(actor)` → `Mml.augment` → `MixinApi.getAllMarkupAugmenters(ctor)` (`mud/api/mixin.ts:1859-1884`) walks the **constructor chain with `hasOwnProperty('markupAugmenters')`** root → leaf — so a `static markupAugmenters` on a CLASS (`Character`) is collected exactly like one on a mixin. `MarkupAugmenter = (text, host, viewer, opts?) => string` is sync. Exemplars: `mud/lib/species/Organism.ts:131-145` (`ageAugmenter`, appends `\n\n${line}`), `mud/lib/slot/Attired.ts:305-322` (registered :529).
- Who is a "person": `Character` (PCs, `NPC` → `Cast`/`Extra`/`Crafter`). `Livestock` (`trade-ranching/src/agent/Livestock.ts:59` = `ProducingMixin(HandledMixin(HandlingMixin(Creature)))`) and `KeptAnimal` (`mud/lib/creature/KeptAnimal.ts`) extend **`Creature`, not `Character`**.
- Assess: `mud/platform/idea/cmd/perception/AssessController.ts` (master) — `medBand`/`precise` (:100-106), the condition-band block (:113-119), the dying block, the afflictions block (:157-192, `named = medBand === 'competent' || precise`, signs unless named). Build-4's diff to this file **starts at :193** (interior wounds + `renderAnatomy`).
- Quantities: `'kg/m³'` is a registered unit (`mud/lib/quantity.ts:76,204`).
- Wire: `packages/wire/tests/*.wire.test.ts` (18 files); harness `packages/wire/src/harness/` exports `Session.open(handle, {startLocation?, wizard?})`, `cmd/prose/query/awaitActivity`, `declareFile({file, packs, dirtyReason?})`, `expectOk/expectRefused/expectNote/expectNoNote`. `platform-smoke.wire.test.ts:123` drives `config` from a founder session.
- Drive geography: Terminus lanes `packages/content/terminus/content/world/terminus/delight-road/{crossroads,milestone,flats,ford,drove}.yaml` (exits `media: [ground]`, so `run` is admitted); `hearts-delight/content/world/hearts-delight/location/{millsite,farmstead-yard}.yaml`; the dorm `eternal-university/content/world/eternal/duncan-hall/location/dormroom.yaml` (`class: …/DormRoom`, a `FurnishableRoom` stack); the smithy `hearthworks/content/world/hearthworks/location/smithy.yaml`; a coat `trade-tailoring/content/trade/tailoring/thing/coat.yaml`; cash-and-carry at `/world/terminus/counting-houses/cash-and-carry`.

### Gates that bite this build

`packages/server/package.json` runs 40 `lint:*` scripts under `lint:family`. The ones this build must design around: `lint:object-verbs` (an `XApi.exert(host, …)` fails — ceiling 0), `lint:mixin-names` (rule 3: a kernel `_mixinName` must be in `Mixins`), `lint:capabilities` (both directions), `lint:instrument-args` (the device is a declared arg), `lint:arg-kinds` (every object-typed slot declares `requires:`), `lint:conditions` + `lint:condition-arms` (the scurvy row), `lint:unconsumed-seams` (a new authored field must be read outside its file), `lint:lib-statics` (`LIB_STATICS_CEILING = 337` — public static **methods** on non-Api lib/platform classes; statics inside a mixin factory and static fields are excluded), `lint:verb-collisions` (`lift` must be a fresh verb), `lint:module-scope`, `lint:imports`, `lint:instanceable`, `lint:schema` (no new collection), `lint:presentation` (no article in a stem), `lint:drive-scripts` (the drive is a wire file), `lint:test-bootstrap`.

---

## Plan-level decisions

- **D1 — `lean` is a biological `Reserve` on the body, `%`, seeded at 50.** The 5-site copy of commit `6f1df5ab3`: `BIOLOGICAL_RESERVE_KEYS` + `defaultBiological()`, the Creature reader, the Metabolic partition step, `lib/paths.ts` (none needed — no floor condition), the band + phrase. `%` not kg: the per-part tissue masses stay plan flyweights (the 92.9 kg sum is inherited, not this build's), and a kg-denominated stock beside them would be the second store the requirements forbid. If anything ever needs a per-part muscle figure it is a derived share of `lean` over the plan's `muscle` tissue masses, never a store. **No `floorEffect`** — a body at lean 0 is *gaunt* in the mirror, not a condition; starvation and emaciation already own the lethal and the chronic floors.
- **D2 — protein gets a home: a `protein` biological reserve** (cap 100, seed 50, no floor effect), and `NutrientRoute.reserve` widens from the closed union to `string | null` so `protein → 'protein'` routes exactly as `carb → satiation` does. The pool that "delivers nowhere" now delivers there; muscle spends it (D6) and turns it over slowly (a basal drain, dial). Harm's healing can read the same reserve later — the seam the metabolism doc named, filled with no new shape.
- **D3 — micronutrients ride the reserve substrate.** A `vitamin-c` biological reserve (cap 100, seed 100, `floorEffect: 'scurvy'`), a basal drain on the metabolism clock (full → empty over `body.vitaminCDrainDays` **active** game-days; default 30 game-days — the expedition timescale the metabolism slate asked for), filled by the `vitamin-c` **tag** through the widened routing table (`{reserve: 'vitamin-c', absorbPerMin 2.0, yieldPerLitre 75}` — one orange portion of 0.4 L restores ~30 %, which clears the condition at the shipped 15 % hysteresis). The scurvy row is spawned and cleared by the **shipped cascade** — `CONDITION_PATHS.scurvy` + `TemplatePaths.metabolismScurvy` + one row; **no new spawn path, no new arm**. The 0 / 15 % thresholds are kept: the *drain* is the dial that sets the timescale, and the hysteresis width is a property of the cascade every floored reserve shares. `nutrientAmounts` keys stay open strings; the label needs no code.
- **D4 — conditioning is a body STOCK (option B).** `wind` and `alcohol-tolerance` are biological reserves on the metabolism clock; a conditioning Discipline's band is a **threshold read over `current / capacity`** (untrained < 20 % ≤ novice < 40 % ≤ competent < 60 % ≤ proficient < 80 % ≤ expert), never a Transcript fold. The row declares which stock with a new `stock:` field on `Discipline` (`wind.yaml: stock: wind`, `alcohol-tolerance.yaml: stock: alcohol-tolerance`), read by `Advancement.bandsForImpl` / `competenceBandFor` — so the field has a reader outside its file (`lint:unconsumed-seams`). Decay is a per-slice half-life in `integrateSlice`, so *never tax absence* rides the linkdead freeze and the far-past guard **for free**. ⚠ This contradicts one requirements sentence (*"The Transcript stays append-only; nothing is stored"*) — an engineering sentence that should not have been there; the product claims it protects (bands only, no gauge, fades with play, frozen by absence) all hold. **Sharpened from the handoff's sketch:** exertion writes **no** Transcript rows for `wind` — a row per traverse would be a Mongo write per step for evidence that decides nothing. The Transcript is untouched by this build. See Risks for the trade-off, flagged for the user.
- **D5 — the exertion event is `{ durationS, powerW }`** (metabolic watts, game seconds — power over a duration is joules, and both are units the engine speaks), emitted by `host.exert(e)` on a new kernel **`ExertingMixin`** (`mud/lib/exertion/Exerting.ts`, `Mixins.Exerting`, `MixinApi.isExerting`), composed on `Creature`. Three chokepoints, one per producer family: (a) **`SchedulerRegistry`** at `completeFromTimer` / `runOnCompleteInPlace` (and pro-rata at `terminate` for a cancelled/replaced step) reading an **optional `effortW?: number` on `DurativeActivity`** — an activity that declares none emits nothing, which is how searches, dressing, hazards, offers and behavior beats are excluded *by construction* rather than by a type test; `ManualBuildStep` and `CastActivity` gain the option; (b) **`LocomotionLogic.engageAround`** after a successful self-powered traverse: `powerW = exertion.walkW × mode.getCostMultiplier() × loadFactor`, `durationS = exertion.traverseNominalS` (60) — the first reader `costMultiplier` has ever had. ⚠ **Once-over fix (2026-09-18):** `sneak.yaml` authors `costMultiplier: 1.5` (a movement-point guess nobody read) — as metabolic watts that would make a fresh body's *sneak* (450 W) exceed the 300 W it can sustain and "break to a walk". Two corrections: `sneak.yaml` → `costMultiplier: 1.0` (a crouch at half speed over the nominal traverse is walking's power, not more; the row's doc comment says so), and **`canSustainPace` is asked only of modes with `speed > 1`** — breaking *to a walk* only means something when you are going faster than one. `climb`/`swim` keep 2.0 (600 W: the rest line), `sneak` and `walk` never trip the pace check; (c) **combat** at `Character.onExchangeResolved(ctx)` — the override must live on the `Character` class (or outer), because `CombatantMixin` is composed *outer* of the whole `Creature` body, so an override on a Creature-level mixin would lose to the mixin's own no-op terminal. Why the registry and not `ManualBuildStep.onComplete`: the requirements say `cast` and `study` tire you like work, and those are not `ManualBuildStep`s; one field on the interface reaches every durative class at one site, and the registry already narrows on the actor (`isSensor`) for envelopes.
- **D6 — what one exertion does, in order, inside `exert()`:**
  1. **Endurance** (now): `debitPct = max(0, powerW − sustainableW) × durationS / exertion.joulesPerEndurancePct`, where `sustainableW = exertion.baseSustainableW × (1 + body.windSustainGain × wind/100)`. Effort *below* what the body can sustain costs no endurance — that is the aerobic threshold, and it is what keeps a walk free and lets a conditioned body hold a run. Nothing is refused here; refusal is `canExert` (D9).
  2. **Wind** (over sessions): `wind += body.windGainPerHour × durationS/3600 × min(1, powerW / sustainableW)` when `powerW ≥ body.windFloorFraction × sustainableW` — duration at a pace you can hold; a heavy act still counts for its duration but no more.
  3. **Lean** (over months, overload): `ceilingW = getMass() × body.peakWPerKg × leanMargin`, `leanMargin = 0.6 + 0.8 × lean/100` (1.0 at the seed); when `powerW ≥ body.overloadFraction × ceilingW`: `gain = body.leanGainPerHour × durationS/3600 × (powerW/ceilingW)`, capped by protein — `spend = gain × body.proteinPerLeanPct`, `lean += min(gain, protein/body.proteinPerLeanPct)`, `protein −= spend`. A load that no longer clears the threshold trains nothing — the mill stops making you stronger.
  4. **Heat**: `this.depositWorkHeat(powerW × durationS × (1 − exertion.efficiency))` — a `protected` seam that is a **no-op on master** and, in W6, forwards to `absorbHeatLoad`. η = `exertion.efficiency` (0.25).
  Decay lives in **`Metabolic.integrateSlice`** as steps 6–9, after `partitionFlesh`: `partitionLean` (Newton relaxation toward the seed baseline with τ = `body.leanDetrainDays`, plus catabolism `body.leanCatabolismPerDay` while `satiation ≤ FLESH_DEFICIT_AT`), `decayWind` (half-life `body.windHalfLifeDays`), `decayTolerance` (half-life `body.toleranceHalfLifeDays`), `drainMicronutrients` (`vitamin-c` basal; `protein` turnover `body.proteinTurnoverPerDay`). Every step is a no-op on a host lacking the reserve (the `partitionFlesh` rule).
- **D7 — the five debits collapse onto `exert`, felt cost preserved by construction.** `BuildStepOptions`, `MiningStepOptions`, `FieldStepOptions` gain a **required** `effortW` (TypeScript makes the 25 + 5 sites the census); `spend()` is deleted from both pack bases and the smelt's inline debit goes. The three packs' watts are chosen so that **at their reference duration and a fresh body** the debit equals the old cost exactly (`(effortW − 300) × durationS / 1500 = cost`): hew `967 W` (4 % over 9 s), drive `750 W` (12 % over 40 s), shore `900 W` (8 % over 20 s), smelt `425 W` (10 % over 120 s), lime `900 W` (4 % over 10 s — read the base ms off each controller), ditch/grub/mow likewise, plough `powerW = 300 + 1500·(14/max(1,draught)) / durationS` computed at the site so the draught still divides the cost. A test (`Exerting.felt-cost.test.ts`) pins all eight figures. ⚠ Two honest consequences, flagged in Risks: harder ground (a longer `paceForGround`) now costs proportionally more than reference ground, and a barged-in step costs pro-rata rather than the whole figure up front. **The traversal load drain folds in** — `loadFactor = 1 + exertion.loadPowerPerRatio × max(0, ratio − LIGHT_LOAD_FLOOR)` with `loadPowerPerRatio = 1/6`, which reproduces `2.0 × (ratio − 0.25)` per traverse for a fresh body at the nominal 60 s; `LoadBearing.drainForTraversal` is **deleted** (no second drain beside the producer). **`drainForLimp` stays separate**: it is a wound penalty read off trauma/capacity, not work, and build-4 is rewriting it — folding it would put two builds on one function for no reader gained.
- **D8 — every new rate is a per-read dial.** A module-private `dial(key, fallback)` (the Freshness shape) in `Exerting.ts` and in `Metabolic.ts`; keys under `body.*` and `exertion.*` in `AppSettingKeys`; values in a new `packages/content/platform/content/settings/body.yaml`. Metabolic's existing `METABOLIC_DEFAULTS` stay constants. The full key table is in W0.
- **D9 — reach is a body read on verbs everyone already has; the `wind` row confers nothing yet.** Every rung of the first ladder is a verb a fresh body is already afforded (`run`, `climb`, every step verb), so a `ConferralRule` on the `wind` row would be a no-op push. The three rungs: **the sustained run** — a re-resolution step in `LocomotionControllerBase.execute` between `loadMode` and `canTraverseExit`: `if (MixinApi.isExerting(actor) && !actor.canSustainPace(mode)) → mode = walk`, a `pace-broken {from, to}` note (new kind in `@saxonberg/types`) and a winded line; `canSustainPace(mode)` is `powerW(mode) ≤ sustainableW || endurance ≥ exertion.paceFloorPct` (50); **the climb without the rest** — the climb traverse is the same locomotion exertion at `climb`'s `costMultiplier 2.0`, and when its power exceeds `sustainableW` the traverse narrates a rest line (*"You have to stop on the ladder to get your breath."*) and pays the excess; a conditioned body pays and says nothing; **the double shift** — `canExert(effortW, durationS)` on the mixin projects the debit and refuses when it would leave endurance under `exertion.exhaustionFloorPct` (10), with the one refusal line owned by the mixin (`exhaustionRefusal()`: *"You're too tired for that."*, reason `too-tired`); `engageStep` and both pack `engageAct`s call it before `SchedulerApi.start`. The `wind` row ships `conferrals: []` with the mechanism intact for the swim; `refreshConferrals()` is additionally invoked (`void`) when a conditioning stock's band crosses in either direction (detected in `exert` and in `decayWind`), so a future conferral needs no append.
- **D10 — the climb needs content, because nothing composes `Climbable`.** A kernel `mud/platform/thing/Ladder.ts` = `ClimbableMixin(DetailedMixin(Thing))` (the enablement walk looks in the actor's container and its contents, so a ladder *thing* in the room is the host), a rejection row `/world/rejection/thing/winze-ladder` (`axes: [down, up]`, `difficulty: null`), a `down` exit on `winze-head.yaml` with `media: [vertical]` to a new `/world/rejection/ferrow/winze-foot` room (class `AuthoredWorking`, `up` back, the ladder listed under `props:` in both). Minimal, and it is what makes the requirements' rung true. ⚠ Flagged for the user: this corrects a false premise in the requirements' survey.
- **D11 — one `gym` archetype**, `packages/content/generic-objects/content/archetypes/gym.yaml` beside the four room archetypes (the requirements say "platform archetype"; generic-objects is where the platform's room archetypes live), `industry: null` so `survey` reports it in any room, slots `{key: load, needs: {tool: load}}`, `{key: pace, needs: {tool: pace}}`, `{key: mat, needs: {surface: true}}`, no defaults. The two kinds are **`load`** and **`pace`** — the requirements' own words for the two families — minted by this consumer so `lint:capabilities` is satisfied the moment the row lands, before any device exists.
- **D12 — the exemplar device is a kernel class with a trade's row.** `mud/platform/thing/LoadDevice.ts` `extends ToolItem` with `static commandContributions = { environment: [platform/cmd/device/lift.yaml], peers: [same] }` and four authorable fields `loadMinKg / loadMaxKg / wattsPerKg / setDurationS`; the row `packages/content/trade-smithing/content/trade/smithing/thing/barbell.yaml` (`class: /platform/thing/LoadDevice`, `capabilities: [load]`, mass 20, iron, `loadMinKg 20 / loadMaxKg 160 / wattsPerKg 15 / setDurationS 30`); the recipe `trade-smithing/content/recipes/barbell.yaml` in the fire-poker shape. Kernel class because a second load device (a mason's stone, a sandbag) has no common pack ancestor with smithing — the CLAUDE.md test for kernel substrate — and the verb it affords must be one verb. The verb is **`lift <load> [with <device>]`**, category `device`, `platform/cmd/device/lift.yaml` + `platform/idea/cmd/device/LiftController.ts` (extends `ManualBuildController` for `engageStep`); the load is `type: number`, the device a declared object arg with `default: "reachable:[capability.load]"` and `requires: [ToolMixin]` (`lint:instrument-args`, `lint:arg-kinds`); the controller checks the row's range (*"That bar takes between 20 and 160."*, `load-out-of-range`) then the body (`load > getStrainCeiling()` → *"You can't get that off the floor."*, `too-heavy`), then `engageStep({ durationMs: setDurationS×1000, effortW: load × wattsPerKg, … })`. `lift 60` on the exemplar is 900 W for 30 s.
- **D13 — an orange and a barbell are for sale at the cash-and-carry.** `distribution/content/trade/distribution/thing/counter.yaml` gains `stockLines` for `/trade/farming/thing/orange` (par 6, price 1) and `/trade/smithing/thing/barbell` (par 1, price 12); `distribution/package.json` gains the two pack dependencies. The general store keeps selling seeds, not fruit — the counter that prices what the trades ship is the distributor's.
- **D14 — the mirror is a `static markupAugmenters` on the `Character` class.** `getAllMarkupAugmenters` walks constructors with `hasOwnProperty`, so a class static is collected like a mixin's. `Character` is every PC and NPC and **no animal** (`Livestock`, `KeptAnimal` extend `Creature`), which is exactly the host set — no guard, and the stockman's line is byte-identical. The phrase table lives on `Creature` beside `bodyConditionBand`: `leanBand()` (`slight < 0.25 ≤ ordinary < 0.6 ≤ hard < 0.85 ≤ powerful`) and `bodyBuildPhrase()` over (flesh band × lean band), person register, describing a body and naming nobody. `BODY_CONDITION_PHRASE` and `bodyConditionPhrase()` are untouched.
- **D15 — the two derived numbers are methods on `Creature` and gauges nowhere.** `bodyMassIndex()` = `getMass() / getStature()²` (species stature), `bodyMassIndexBand()` (`underweight < 18.5 ≤ healthy < 25 ≤ overweight < 30 ≤ obese`), `getBodyDensity(): Quantity<'kg/m³'>` from the fat fraction (`F = 0.08 + 0.32 × flesh/100`, tissue densities 900 fat / 1100 lean — `1 / (F/900 + (1−F)/1100)`) with no consumer yet. `assess` gains one `blocks.push` after the condition-band block, gated on `named || precise`, saying the band in words; no number anywhere.
- **D16 — the strength read reaches encumbrance.** `LoadBearing.getCarryCapacity` gains `× leanMargin` (the D6 formula, 1.0 at the seed) read off the `lean` reserve when present — so the tailor's tape, the water, the physician and the lift gate all read the one figure. Neutral for every body that has not trained.
- **D17 — fruit carries its vitamin as rows, wholemeal-vs-white as composition.** The ten `trade/farming/idea/material/*.yaml` fruit rows gain `vitamin-c` in `nutrients` and a `nutrientAmounts` block in the shipped mg/kg convention (orange `{water: 870000, sugar: 90000, vitamin-c: 530}`; the others from real data). A `wholemeal-loaf.yaml` row beside `white-loaf.yaml` (`composition: [{wheat-flour 6.5}, {bran 1.5}]`) so the drive can `look` at both from one wheat; no loaf row authors an amount — the label derives it.
- **D18 — `alcohol-tolerance` is fed where alcohol is absorbed.** In `Metabolic.absorbToxin` for the `alcohol` type, `tolerance += body.toleranceGainPerGram × absorbedGrams`; it decays in the slice (D6) and its band reads through D4. Its *consumer* (widening the `bac` band thresholds by tolerance) is a deferred seam — the requirement is that the band exists and fades on the active clock.
- **D19 — no migration, no new collection, no new document kind.** New reserve keys install idempotently on next construct; the scurvy row, the archetype, the discipline row, the settings file are all new paths; the dev DB is dropped, never migrated.
- **D20 — build-4 composition is one wave, gated.** W6 lands only after `origin/master` contains `design/harm-survey`'s `absorbHeatLoad` + `isThermalRegulation` + `capacity()`; until then `depositWorkHeat` is a no-op and the drive's heat step is recorded as skipped with that reason, exactly as the requirements allow.
- **D21 — the stocks reach mass, so the tape notices.** `Creature.getMass()` adds a derived term once the body-plan seed has run: `+ body.massPerFleshPct × (flesh − 55) + body.massPerLeanPct × (lean − 50)` (dials, 0.3 and 0.25 kg per point; zero for a body lacking the reserves; the seed body masses exactly the species figure). One read, and every mass consumer — carry capacity, basal drain, thermal mass, the fist, textiles' girth — inherits it, which is what makes *"you have moved since last time"* true without touching the tailor. ⚠ Flagged in Risks: this is the one change in the plan that every mass reader sees.

---

## ⭐⭐ Host placement

| what | host | what composing it claims |
|---|---|---|
| `lean`, `protein`, `wind`, `vitamin-c`, `alcohol-tolerance` reserves | `Reserve.defaultBiological()` → installed by the **`Creature` constructor** | *every living body has muscle, an amino pool, a wind, a vitamin store and a tolerance* — true of a frog, an ox and a person alike; a body that predates them gains them idempotently; nothing not alive gets them (the `installBiologicalReserves` site is `Creature`, and `Character`, `Livestock`, `KeptAnimal` all extend it). Same claim `flesh` already makes. |
| the decay/turnover slice steps | **`MetabolicMixin.integrateSlice`** | metabolism owns the clock and the freeze rules; each step is a no-op on a host lacking its reserve — the `partitionFlesh` rule, no guard on the host set. |
| `exert()`, `canExert()`, `canSustainPace()`, `sustainableW()`, `ceilingW()`, `conditioningBand()`, `depositWorkHeat()` | **`ExertingMixin`** on **`Creature`**, composed outer of `ThermalRegulationMixin` and inner of `LoadBearingMixin` | *every body can work and tires by working* — a frog that never traverses under `engageAround` simply never exerts. It reads `getMass`, `getReserve`/`adjustReserve` (through Metabolic's reconciling override, so a debit lands on a fresh value) and, in W6, `absorbHeatLoad` — all beneath it. Not on `Character`: the producers include locomotion, which livestock and kept animals also do. |
| `onExchangeResolved` override | **`Character` class** | combat is `Character`'s already (`CombatantMixin` composes there); the override composes via `super`. Placing it lower would be shadowed by the mixin's terminal. |
| `effortW?` | **`DurativeActivity`** (the interface) + `ManualBuildStepOptions` + `CastActivityOptions` | an activity *may* declare effort; absence means "not work". No claim on the other six implementers. |
| the emit | **`SchedulerRegistry`** (completion + pro-rata abort) | the scheduler already knows the actor and the duration; it narrows on `isExerting` exactly as it narrows on `isSensor`. |
| the locomotion emit (folding the load drain) | **`LocomotionLogic.engageAround`** | the universal self-powered chokepoint; riders and `forceMove` never reach it — the walked-vs-rode exclusion stays structural. |
| `stock: string` | **`Discipline`** (+ `DisciplineDescriptor`, `buildDescriptor`) | a Discipline *may* name a body stock; only `conditioning` rows do. Read by `Advancement.bandsForImpl`. |
| the conditioning branch of the fold | **`AdvancementMixin`** (`bandsForImpl`, `competenceBandFor`) | already every `Character`; narrows `MixinApi.isExerting(owner)` to read the stock — composition, not re-narrowing: every Advancement host is a Creature. |
| the pace re-resolution + `pace-broken` note | **`LocomotionControllerBase.execute`** | the verb layer, where a mode is chosen; `Mobile.traverse` is untouched (the encumbrance doc's red flag). |
| `Ladder` | kernel **`platform/thing/Ladder.ts`** = `ClimbableMixin(DetailedMixin(Thing))` | the first instanceable `Climbable`; a `Thing` because the enablement walk looks at the room's contents. Rows: rejection's winze ladder. |
| `leanBand`, `bodyBuildPhrase`, `bodyMassIndex[Band]`, `getBodyDensity` | **`Creature`** beside `bodyConditionBand` | reads the two stocks and the species; true of every body. The *phrase* is person-register but the *reads* are body facts. |
| the body line augmenter | **`Character` class static** | people only; animals keep their stockman read. No guard. |
| `leanMargin` in `getCarryCapacity` | **`LoadBearingMixin`** | reads a reserve it already reads beside (`endurance`); a host without `lean` gets 1.0. |
| `LoadDevice` (+ `commandContributions`, four fields) | kernel **`platform/thing/LoadDevice.ts`** `extends ToolItem` | "a made thing you load and lift" — Crafted (a smith's mark and grade), Tool (`capabilities: [load]` satisfies the archetype), Durable (a broken bar offers nothing). The row is a trade's. |
| `LiftController` + `lift.yaml` | **platform**, category `device` | the verb any load device confers; the kernel class affords it. |
| `gym.yaml` | **generic-objects** `archetypes/` | one archetype document; zero code per variant. |
| `scurvy.yaml` | **platform** `Condition/metabolism/` beside `emaciation` | spawned by the shipped cascade off `vitamin-c`'s floor. |
| `wind.yaml` (+ `stock:` on `alcohol-tolerance.yaml`) | **platform** `Discipline/` | content. |
| `body.yaml` settings + `AppSettingKeys` | **platform** settings + kernel key vocabulary | the freshness pattern. |
| `barbell.yaml` row + recipe, `wholemeal-loaf.yaml`, the fruit amounts, the counter lines, the winze rows | their trades' packs | rows, never code. |

**The test applied:** no method in this plan opens with `if (!(this is a person)) return` or `if (!(host instanceof Character))`. The one narrowing that looked like a guard — "people get the body line, animals don't" — is solved by *choosing the host* (`Character`), and the one that is genuinely composition (`isExerting(owner)` in Advancement, `isExerting(actor)` in the registry/locomotion) is the sanctioned predicate narrowing every driver already uses.

---

## Convention conformance

Checked at plan time against the current tree:

- **`props:` / `cast:`** — the new winze rows use `props:` (as `winze-head.yaml` does). No `populates:`.
- **Locations, not rooms** — `winze-foot` is a location row of the rejection pack's existing class (`/trade/mining/location/AuthoredWorking`) with `coords`; no new location class. The dorm is a `FurnishableRoom` stack already.
- **The path pattern** — kernel classes at `/platform/thing/{LoadDevice,Ladder}`; the barbell row at `/trade/smithing/thing/barbell` naming a kernel class (the `copper-ingot` precedent); the ladder row at `/world/rejection/thing/winze-ladder`; the discipline row at `/platform/idea/Discipline/wind`; the condition at `/platform/idea/Condition/metabolism/scurvy`; the verb view at `platform/cmd/device/lift.yaml` with its controller at `/platform/idea/cmd/device/LiftController`.
- **Module scope declares** — `dial()` is a function declaration; the mixin factory, the `EXERTION_DEFAULTS` const-object and the phrase tables are declarations. No module-scope statements.
- **The import boundary** — `lib/exertion/Exerting.ts` imports `AppApi` from `../../api/app` (the `Freshness.ts` precedent) and `MixinApi`; nothing outside `src/mud/`. The registry imports nothing new from a pack.
- **Module categories** — one new mixin (`lib/exertion/`, a new *subsystem folder* for a concern no existing folder owns: exertion is the producer side that metabolism, encumbrance and locomotion each half-owned), two new instanceable kernel classes in `platform/thing/`, one controller, one view. **No new Api, no logic singleton, no free helper, no new module category.** `Exerting.ts` exports the factory + its interfaces + the `Exertion` type only.
- **Verbs live on objects** — `host.exert(e)`, `actor.canSustainPace(mode)`, `giver.canExert(w, s)`; nothing on an Api takes the host first. `lint:object-verbs` stays at 0.
- **`Mixins` + `MixinApi.isX`** — `Exerting: 'ExertingMixin'` added to `mud/lib/mixin.ts`; `isExerting` added to `mud/api/mixin.ts` (`lint:mixin-names` rule 3).
- **Inter-Stuff contract** — every cross-object read is a method (`getReserve`, `getMass`, `getStature`, `hasCapability`, `getLoadMaxKg`…). `LoadDevice`'s four fields are `public` for the Hydrator with `get*`/`set*` pairs and setter-side range invariants.
- **Persistent fields are scalars** — the reserves are the existing decomposed record; `LoadDevice`'s fields are numbers; nothing needs a marshaller.
- **Dials, not constants** — every new rate reads `dial()`; nothing new lands in `METABOLIC_DEFAULTS`.
- **Gates this build must pass** (run per wave with `pnpm -C packages/server lint:family`): `lint:object-verbs`, `lint:mixin-names`, `lint:capabilities`, `lint:instrument-args`, `lint:arg-kinds`, `lint:conditions`, `lint:condition-arms`, `lint:unconsumed-seams`, `lint:lib-statics`, `lint:verb-collisions`, `lint:module-scope`, `lint:imports`, `lint:instanceable`, `lint:presentation`, `lint:field-meta`, `lint:census`, `lint:drive-scripts`, `lint:test-bootstrap`, `lint:does-nothing`, plus `pnpm lint` (ESLint). `lint:lib-statics`: the new classes add no public static *methods* (`commandContributions` and `markupAugmenters` are fields; `Creature`'s new reads are instance methods).

---

## Waves

Each wave is independently landable, ends at a commit, and is gated by `pnpm test:near` + the touched packs' vitest + `lint:family`. `pnpm test` runs once, before the MR opens (W7), and again at `/finalize`.

### W0 — the five stocks and the dials

**Goal.** The body carries `lean`, `protein`, `wind`, `vitamin-c` and `alcohol-tolerance`; the metabolism clock turns them over; scurvy spawns and clears off the cascade; every rate is a `config` key. Nothing exerts yet.

**Implements** D1, D2, D3, D4 (the stocks + decay), D8, D15 (the reads), D18, D19.

**Files.**
- `mud/lib/reserve.ts` — `BIOLOGICAL_RESERVE_KEYS` gains the five keys; `defaultBiological()` gains `lean {100, 50, %, biological, null}`, `protein {100, 50, %, biological, null}`, `wind {100, 0, %, biological, null}`, `'vitamin-c' {100, 100, %, biological, 'scurvy'}`, `'alcohol-tolerance' {100, 0, %, biological, null}`; the landscape table comment gains five rows.
- `mud/lib/metabolism/Metabolic.ts` — `NutrientRoute.reserve: string | null`; `NUTRIENT_ROUTING.protein.reserve = 'protein'`; new route `'vitamin-c': {reserve: 'vitamin-c', absorbPerMin 2.0, yieldPerLitre 75}`; `CONDITION_PATHS.scurvy = TemplatePaths.metabolismScurvy`; `absorbDigestion` unchanged in shape (the `route.reserve !== null` branch now delivers protein and vitamin C); `integrateSlice` gains steps 6–9 `partitionLean(stepMin)`, `decayWind(stepMin)`, `decayTolerance(stepMin)`, `drainMicronutrients(stepMin)` per D6, each guarded by `hasReserve`; `absorbToxin` for type `alcohol` adds the tolerance gain (D18); a module-private `dial(key, fallback)`.
- `mud/lib/paths.ts` — `metabolismScurvy: "/platform/idea/Condition/metabolism/scurvy"`.
- `packages/content/platform/content/platform/idea/Condition/metabolism/scurvy.yaml` — the emaciation shape: `name: scurvy`, `signature: []`, `progression: {law: stage, intervalMs: 604800000}`, `resolution: {by: food}`, `observableSigns: [bleeding-gums, bruising, listless, old-wounds-opening]`, `contagion: null`. Not lethal (no `LETHAL_SEC` entry).
- `mud/lib/config/AppSettings.ts` — a `body`/`exertion` block: `bodyLeanGainPerHour "body.leanGainPerHour"`, `bodyLeanDetrainDays`, `bodyLeanCatabolismPerDay`, `bodyProteinPerLeanPct`, `bodyProteinTurnoverPerDay`, `bodyOverloadFraction`, `bodyPeakWPerKg`, `bodyWindGainPerHour`, `bodyWindHalfLifeDays`, `bodyWindSustainGain`, `bodyWindFloorFraction`, `bodyVitaminCDrainDays`, `bodyToleranceGainPerGram`, `bodyToleranceHalfLifeDays`, `exertionBaseSustainableW`, `exertionJoulesPerEndurancePct`, `exertionTraverseNominalS`, `exertionWalkW`, `exertionLoadPowerPerRatio`, `exertionPaceFloorPct`, `exertionExhaustionFloorPct`, `exertionEfficiency`, `exertionCombatExchangeW`, `exertionCombatExchangeS`.
- `packages/content/platform/content/settings/body.yaml` — the values: `leanGainPerHour 2`, `leanDetrainDays 45`, `leanCatabolismPerDay 1`, `proteinPerLeanPct 1.5`, `proteinTurnoverPerDay 8`, `overloadFraction 0.7`, `peakWPerKg 12`, `windGainPerHour 6`, `windHalfLifeDays 30`, `windSustainGain 1.5`, `windFloorFraction 0.5`, `vitaminCDrainDays 30`, `toleranceGainPerGram 0.5`, `toleranceHalfLifeDays 20`, `baseSustainableW 300`, `joulesPerEndurancePct 1500`, `traverseNominalS 60`, `walkW 300`, `loadPowerPerRatio 0.1667`, `paceFloorPct 50`, `exhaustionFloorPct 10`, `efficiency 0.25`, `combatExchangeW 700`, `combatExchangeS 6`. Each key gets the one-paragraph comment the freshness file gives its keys — what it is, its unit, why the default.
- `mud/lib/creature/Creature.ts` — `getLean()`, `getProtein()`, `getWind()`, `getVitaminC()` readers (the `getFlesh` shape); `LEAN_BANDS` + `leanBand()`; `bodyBuildPhrase()` with the (5 × 4) table (below); `bodyMassIndex()`, `BMI_BANDS` + `bodyMassIndexBand()`, `getBodyDensity()`; `getMass()` gains the D21 composition term after the seed (the override already exists at :347 — extend it, do not add a second override), reading `bodyMassPerFleshPct` / `bodyMassPerLeanPct` (two more keys in the block above, `body.massPerFleshPct 0.3`, `body.massPerLeanPct 0.25` in `body.yaml`).

The build phrase table (person register; the reviewer's test is that adjacent cells read differently):

| flesh \ lean | slight | ordinary | hard | powerful |
|---|---|---|---|---|
| emaciated | gaunt — skin over bone | gaunt | gaunt and stringy | *(unreachable in practice; render "gaunt and stringy")* |
| thin | slight, with no flesh to spare | lean | wiry | rangy and hard |
| good | soft, in good flesh | in good flesh | in good flesh, hard | broad and hard |
| fleshy | heavyset and soft | heavyset | heavyset, thick through the shoulders | burly |
| fat | fat, and carrying it badly | running to fat | running to fat, but strong under it | massive |

**Tests.** `mud/lib/metabolism/__tests__/Metabolic.stocks.test.ts` (routing widened: protein lands on `protein`, `vitamin-c` on `vitamin-c`; each slice step no-op without its reserve; lean relaxes to 50; wind halves at the half-life; vitamin C empties over the dialled days and the cascade afflicts `scurvy`, one orange-sized ingest clears it; linkdead re-stamp integrates nothing; a `config` change is seen on the next slice — `AppApi.setSetting` then read); `mud/lib/creature/__tests__/Creature.build.test.ts` (bands at the thresholds; every table cell is a distinct string; BMI band from biped 70 kg / 1.75 m is `healthy`; density falls as flesh rises). `lint:conditions` on the new row.

**Acceptance.** A fresh body reads `in good flesh` from `bodyBuildPhrase()`; `config body.vitaminCDrainDays` lists the key; the slice tests pass; `lint:family` green.

**Commit.** `build(nutrition-fitness W0): five stocks on the body — lean, protein, wind, vitamin C, tolerance — and the dials that turn them`

### W1 — exertion: one event, every producer

**Goal.** `ExertingMixin` on the body; the scheduler, the traverse and the exchange emit it; the five debits collapse onto it; felt costs pinned; the double-shift refusal exists.

**Implements** D5, D6 (`exert`), D7, D9 (the `canExert` rung), D16.

**Files.**
- `mud/lib/exertion/Exerting.ts` — `export interface Exertion { durationS: number; powerW: number }`; `export interface Exerting { exert(e: Exertion): void; canExert(powerW, durationS): boolean; exhaustionRefusal(): string; canSustainPace(mode: LocomotionMode): boolean; sustainableW(): number; ceilingW(): number; conditioningBand(stock: string): CompetenceBandName }`; `ExertingMixin<TBase extends MixinConstructor<Stuff>>` with `static _mixinName = 'ExertingMixin'` (widened to `string` per the memory note), the D6 body, a `protected depositWorkHeat(_joules: number): void {}` no-op, a `protected onConditioningBandCrossed(stock)` that `void`-calls `refreshConferrals()` when `MixinApi.isAdvancing(this)`, and the module-private `dial()`. Reads reserves through `getReserve`/`adjustReserve` (the Metabolic override reconciles first).
- `mud/lib/mixin.ts` — `Exerting: 'ExertingMixin'`. `mud/api/mixin.ts` — `isExerting(obj): obj is Stuff & Exerting`.
- `mud/lib/creature/Creature.ts` — compose `ExertingMixin(` outer of `ThermalRegulationMixin(` and inner of `LoadBearingMixin(`, with the placement comment.
- `mud/api/scheduler.ts` — `DurativeActivity` gains `readonly effortW?: number` with the doc comment: *metabolic watts this activity costs its actor for its duration; absent = not work (a search, a dressing)*.
- `mud/lib/craft/ManualBuildStep.ts` — `ManualBuildStepOptions.effortW?: number`, stored and exposed as `readonly effortW`. `mud/lib/magic/CastActivity.ts` — the same option; `packages/content/arcana/src/idea/cmd/magic/CastController.ts` passes `effortW: 300` (the mana-economy slate's figure; a const in the controller, not a dial — the pack's own number). `StudyActivity` likewise at 150 W where it is constructed (grep `new StudyActivity`).
- `mud/platform/idea/SchedulerRegistry.ts` — a private `emitExertion(e, fraction)`: `if (isDurativeActivity(e) && e.effortW && MixinApi.isExerting(e.actor)) e.actor.exert({ durationS: e.duration/1000 × fraction, powerW: e.effortW })`; called with `1` at the top of `completeFromTimer` and `runOnCompleteInPlace` (before the completion closure, so a `too-tired` state is visible to it), and with `min(1, (Date.now() − e.startedAt) × WorldClockApi.getScale() / e.duration)` in `terminate` for reasons `cancelled` / `replaced` / `preconditions-changed` (not `thrown`, not `host-destroyed`).
- `mud/platform/idea/cmd/crafting/ManualBuildController.ts` — `BuildStepOptions.effortW: number` (required); `engageStep` refuses via `canExert` before `SchedulerApi.start` (`declineStep(context, Mml.fromMarkup(giver.exhaustionRefusal()), 'too-tired')`) and passes `effortW` into the step. The 25 call sites each gain an `effortW:` — a table of watts by verb in the commit body (pour/stir/garnish/muddle/strain 150; wash/heat/boil/plate 200; repair/sharpen/sew/spin/weave/dye/mordant/alter/cut 250; knead/scutch 400; hammer/quench 600).
- The five bypass sites: `MillController.ts:189` `effortW: 550`, `CharController.ts:107` `effortW: 200`; `MiningActController.ts` (`MiningStepOptions.cost` → `effortW`, `spend()` deleted, `canExert` refusal added), `FieldWorkController.ts` (same), `SmeltController.ts` (inline debit deleted, `effortW: 425`, `canExert`). The per-verb watts per D7.
- `mud/platform/idea/api/LocomotionLogic.ts` `engageAround` — replace the `drainForTraversal()` call with `if (MixinApi.isExerting(actor)) actor.exert({ durationS: dial(traverseNominalS), powerW: dial(walkW) × mode.getCostMultiplier() × loadFactor(actor) })` where `loadFactor` reads `getLoadRatio()` when `isLoadBearing`; the `drainForLimp()` call stays. Since `LocomotionLogic` is a logic singleton it may not hold the dial — expose the traverse exertion as `actor.exertTraverse(mode)` on the mixin instead and call that; the mixin owns the dials.
- `mud/lib/encumbrance/LoadBearing.ts` — delete `drainForTraversal` (and its interface entry, doc comment, `DRAIN_PER_TRAVERSAL`); `getCarryCapacity` gains `× leanMargin(bearer)` (D16). Tests that called `drainForTraversal` move to `Exerting.traverse.test.ts`.
- `mud/lib/character/Character.ts` — `onExchangeResolved(ctx) { super.onExchangeResolved(ctx); if (MixinApi.isExerting(this)) this.exert({ durationS: dial(combatExchangeS), powerW: dial(combatExchangeW) }); }` — via `this.exertExchange()` on the mixin so the dial stays there.
- `docs/subsystems/encumbrance.md`, `metabolism.md`, `locomotion.md`, `activity.md` — one paragraph each pointing at the new `docs/subsystems/exertion.md` (written at the sweep; the plan is the interim record).

**Tests.** `mud/lib/exertion/__tests__/Exerting.test.ts` (debit is excess-only; walk at 300 W costs 0; run at 600 W costs 12 % per nominal exit on a fresh body and 0 at wind 100; wind and lean move per D6 and lean spends protein; `canExert` refuses at the floor; the band-crossing hook fires once per crossing). `Exerting.felt-cost.test.ts` pins hew 4 / drive 12 / shore 8 / smelt 10 / lime 4 / ditch 5 / grub 6 / mow 8 / plough 14 at draught 1 and the loaded traverse `2.0 × (ratio − 0.25)`. `SchedulerRegistry.exertion.test.ts` (a step with `effortW` exerts once at completion; without it never; a cancelled step exerts pro-rata; a sub-100 ms step exerts). `Character.exchange.test.ts` (an exchange exerts). The three packs' controller tests update (`spend` gone; a `too-tired` refusal case each).

**Acceptance.** Every `engageStep` and `engageAct` site compiles only with an `effortW`; the felt-cost test is green at the shipped dials; `lint:object-verbs` still 0; `pnpm test:near` + the mining/farming/smelting/milling/fuel/arcana pack suites green.

**Commit.** `build(nutrition-fitness W1): one exertion event — the scheduler, the traverse and the exchange emit it; five debits become one`

### W2 — reach: the wind band, the pace, the ladder

**Goal.** `wind` and `alcohol-tolerance` read as conditioning bands; a fresh body's run breaks to a walk; the climb exists and reads the body; the band re-confers on crossing.

**Implements** D4 (the band), D9, D10.

**Files.**
- `mud/platform/idea/Discipline.ts` — `public stock: string = ''` + `fieldMeta.stock: {persistent: true}` + `getStock/setStock`; `DisciplineDescriptor.stock: string`. `mud/platform/idea/DisciplineCatalogue.ts` — `buildDescriptor` reads `stock` (string, default `''`); `getStock(key)`.
- `packages/content/platform/content/platform/idea/Discipline/wind.yaml` — `key: wind`, `channel: conditioning`, `label: Wind`, `stock: wind`, `description:` (what it is, that it fades while you play and not while you are away, that it buys the run, the climb and the second shift), `conferrals: []` with a comment saying why (D9). `alcohol-tolerance.yaml` gains `stock: alcohol-tolerance`.
- `mud/lib/advancement/Advancement.ts` — `bandsForImpl` appends, after the transcript fold, one `{discipline, band}` per catalogue descriptor whose `stock` is non-empty and which the owner `hasReserve`s (band = `owner.conditioningBand(stock)`, narrowed on `isExerting`), replacing any transcript-derived entry for the same key; `competenceBandFor(discipline)` short-circuits to the stock band when the descriptor names one. Both go through `suppressed`.
- `@saxonberg/types` `packages/types/src/index.ts` — `PaceBrokenNote { kind: 'pace-broken'; from: string; to: string }` added to the note union beside `LocomotionGateFailedNote`.
- `mud/platform/idea/cmd/movement/LocomotionControllerBase.ts` — after `loadMode` and before the target/exit resolution: `let mode = …; if (MixinApi.isExerting(actor) && !actor.canSustainPace(mode)) { const walk = await LocomotionApi.loadMode('walk'); context.note({kind:'pace-broken', from: mode.getName(), to: 'walk'}); MessageApi.scene(actor).topic('shell.result').toSelf(Mml.fromMarkup("You're winded — you drop to a walk.")).send(); mode = walk; }` (`mode` becomes `let`). The check is gated on `mode.getSpeed() > 1` (D5's once-over fix), so `walk` and `sneak` never trip it and `sneak.yaml`'s `costMultiplier` is corrected to `1.0` in this wave.
- `mud/lib/exertion/Exerting.ts` — `exertTraverse(mode)` narrates the climb's rest line when `mode.getName() === 'climb'` and the mode's power exceeds `sustainableW()` (the `MessageApi.scene(...).toSelf` shape, topic `act.deed`).
- `mud/platform/thing/Ladder.ts` — `ClimbableMixin(DetailedMixin(Thing))`, doc comment naming it the first instanceable `Climbable`.
- `packages/content/rejection/content/world/rejection/thing/winze-ladder.yaml` (`class: /platform/thing/Ladder`, `axes: [down, up]`, `difficulty: null`, `mass: 40`, `register: definite`, prose); `ferrow/winze-head.yaml` gains `down: {destination: /world/rejection/ferrow/winze-foot, media: [vertical]}` and the ladder under `props:`; new `ferrow/winze-foot.yaml` (`AuthoredWorking`, `coords {x:-2, y:-1, z:-2}`, `up` with `media: [vertical]`, the ladder under `props:`, the glowcap, an `oreRow`, prose that says the air is worse).
- `mud/lib/creature/Character.ts` — nothing further; `refreshConferrals` on crossing already lands via W1's hook.

**Tests.** `Advancement.conditioning.test.ts` (a `stock` discipline's band tracks the reserve with no transcript rows; `competence` shows it; suppression applies). `LocomotionControllerBase.pace.test.ts` (a fresh actor with endurance under the floor running an exit emits `pace-broken` and traverses under `walk`; an actor at wind 100 keeps `run`). `Ladder.test.ts` (a ladder in the room satisfies `checkEnablement` for `climb` down; `climb down` at the winze head lands in the foot). `DisciplineCatalogue.test.ts` gains the `stock` key. `lint:unconsumed-seams` must not rise (the field is read in `Advancement.ts`).

**Acceptance.** `competence` lists `wind` for a body with wind > 0; `run` breaks for a fresh body and holds at wind 100 (unit-level); `climb down` at the winze head works for the first time; `lint:family` green.

**Commit.** `build(nutrition-fitness W2): reach — the wind band off the body, the run that breaks, and a ladder somebody can climb`

### W3 — the mirror

**Goal.** `look <person>` prints the body line; `assess` says the BMI band; livestock reads are untouched.

**Implements** D14, D15 (assess).

**Files.**
- `mud/lib/character/Character.ts` — `static markupAugmenters: MarkupAugmenter[] = [bodyAugmenter]`; `bodyAugmenter` narrows `host instanceof Character`? No — the walk only reaches this static for `Character` constructors, so the augmenter needs only the `isDestroyed()` guard and `MixinApi.isReserved(host)`; it appends `\n\n${capitalize(bodyBuildPhrase())}.` as a sentence about a body (*"Wiry."* / *"In good flesh."*), no name, no pronoun.
- `mud/platform/idea/cmd/perception/AssessController.ts` — after the condition-band block (:113-119) and before the dying block: `if ((medBand === 'competent' || precise) && target instanceof Creature) blocks.push(Mml.escape(\`${who} ${BMI_PHRASE[target.bodyMassIndexBand()]}.\`))` with `BMI_PHRASE` a four-entry table (*underweight for their frame* / *of a healthy weight* / *carrying more than is good for them* / *heavily overweight*). Inserted above :193 so build-4's diff merges cleanly.
- `docs/subsystems/ranching.md` — no change; a test asserts `Livestock.stockmanRead()` output is byte-identical to the shipped string for a default body.

**Tests.** `Character.mirror.test.ts` (`getMarkupLong` on a Character ends with the body line; on a `Livestock` fixture it does not; two bodies with different stocks render different lines; the line contains no name). `AssessController.body.test.ts` (an untrained looker gets no BMI line; a competent one gets the band in words; no digits appear in the block).

**Acceptance.** The `look` regression (five rooms, before/after, per the presentation build's transcript-diff practice) shows exactly one added line per person and none per animal.

**Commit.** `build(nutrition-fitness W3): the mirror — a body line on look, the band in words on assess, the stockman's read untouched`

### W4 — the fruit, the loaves, the counter

**Goal.** The citrus carries its vitamin; wholemeal and white read differently on the label; a person can buy an orange.

**Implements** D13 (the orange line), D17.

**Files.**
- `packages/content/trade-farming/content/trade/farming/idea/material/{orange,lemon,lime,grapefruit,cherry,cranberry,grape,olive,mint,juniper}.yaml` — `nutrients` gains `vitamin-c` where real data supports it (all but olive and juniper, which gain `fibre`/`fat` amounts instead) and each gains a `nutrientAmounts` block in mg/kg (orange `{water: 870000, sugar: 90000, vitamin-c: 530}`, lemon `{…, vitamin-c: 530}`, lime `290`, grapefruit `310`, cherry `70`, cranberry `130`, grape `30`, mint `310`).
- `packages/content/trade-baking/content/trade/baking/thing/wholemeal-loaf.yaml` — beside `white-loaf.yaml`, `composition: [{wheat-flour, 6.5}, {bran, 1.5}]`, prose about the crumb; the bakery counter `packages/content/terminus/content/world/terminus/market/thing/bread-counter.yaml` (`stockLines` :34, `prices` :37 — white-loaf par 4 at 4) gains the wholemeal line (par 4, price 3).
- `packages/content/distribution/content/trade/distribution/thing/counter.yaml` — `stockLines` + `prices` for `/trade/farming/thing/orange` (par 6, price 1); `distribution/package.json` gains `@saxonberg/content-trade-farming`. (The barbell line lands in W5 with its row.)

**Tests.** `NutritionLabel.composition.test.ts` (the two loaf rows render different `vitamin-c`-free but different `fibre`/`protein` amounts, and neither row authors `nutrientAmounts`); a routing test that an orange ingest lands `vitamin-c`; `lint:census` for the new rows; the distribution pack's own test (menu materializes with the orange line).

**Acceptance.** `look orange` (a Provision has no label — the *material* is inspectable via the crate/label path already shipped; the acceptance is the ingest, proved in the drive); `buy orange` at the cash-and-carry succeeds.

**Commit.** `build(nutrition-fitness W4): the fruit carries its vitamin, two loaves from one wheat, and an orange for sale`

### W5 — the gym and the bar

**Goal.** One `gym` archetype; a barbell a smith makes; `lift <load>`; the bar priced.

**Implements** D11, D12, D13 (the barbell line).

**Files.**
- `packages/content/generic-objects/content/archetypes/gym.yaml` — per D11, with the header comment (why one archetype; the three slots; reported never enforced; a bar on a dorm floor counts).
- `mud/platform/thing/LoadDevice.ts` — per D12; `fieldMeta` for the four fields `{persistent, authorable}`; setters validate `0 < min ≤ max`, `wattsPerKg > 0`, `setDurationS ≥ 1`.
- `mud/platform/thing/Ladder.ts` — landed in W2.
- `packages/content/platform/content/platform/cmd/device/lift.yaml` — `verbs: [lift]`, `controller: /platform/idea/cmd/device/LiftController`, validators `requiresAnimate`, `requiresConscious`, `requiresEmbodied`, args `load` (`type: number`, required) and `device` (`type: object`, `required: false`, `prepositions: [with, on]`, `default: "reachable:[capability.load]"`, `scope: ["reachable"]`, `requires: [ToolMixin]`, validators `canReach`), help text in the house voice.
- `mud/platform/idea/cmd/device/LiftController.ts` — per D12; the begin line (*"You set yourself under the bar and lift."*), peers line, completion line (*"You rack the bar."*); the refusals `load-out-of-range`, `too-heavy`, `not-a-load` (device lacks `load`).
- `packages/content/trade-smithing/content/trade/smithing/thing/barbell.yaml`, `packages/content/trade-smithing/content/recipes/barbell.yaml` (stock `forgeable`, `count: 2`, tools `[striking, anvil]`, `requiresHeatK: 700`, `difficulty: standard`, `discipline: smithing`, `outputTemplate: /trade/smithing/thing/barbell`).
- `packages/content/distribution/content/trade/distribution/thing/counter.yaml` + `package.json` — the barbell line (par 1, price 12) and the smithing dependency.
- `docs/subsystems/furnishing.md` — a paragraph under the archetypes table for `gym` (at the sweep).

**Tests.** `Archetype.gym.test.ts` (a `LoadDevice` dropped in a `FurnishableRoom` fixture satisfies `load`; a `Surfaced` thing satisfies `mat`; `pace` unsatisfied and reported); `LiftController.test.ts` (in range → a step with `effortW = load × wattsPerKg` and the right duration; out of range → `load-out-of-range`; above the strain ceiling → `too-heavy`; the device is a declared arg — `lint:instrument-args` passes); `LoadDevice.test.ts` (setter invariants, `commandContributions` affords `lift` in the environment); trade-smithing's recipe test includes `barbell`; `lint:capabilities --list` shows `load` consumed by the archetype + the view + the controller and declared by the row, `pace` consumed by the archetype and declared by nothing (a declared-never-consumed count that does not rise; the required-never-declared direction is 0 because the archetype is a consumer, not a requirer).

**Acceptance.** `survey` in a dorm room with a barbell on the floor reports `a gym` with `load` met and `pace` missing; `lift 60` runs a 30 s step and moves `lean` on a fresh body; `lift 200` is refused by the row's range with the honest line; `forge`/`hammer` a barbell from two bars of stock at Hearthworks.

**Commit.** `build(nutrition-fitness W5): the gym archetype, a barbell a smith makes, and lift`

### W6 — heat and function (gated on build-4)

**Precondition.** `git merge origin/master` into the branch after `design/harm-survey` has merged; `MixinApi.isThermalRegulation` and `ThermalRegulation.absorbHeatLoad` exist on the merged tree. If they do not by the time W5 lands, **skip this wave**, record it in the drive as the requirements allow, and leave the seam as it is (a no-op `depositWorkHeat`).

**Goal.** Exertion is heat; reach ANDs with function.

**Implements** D20.

**Files.**
- `mud/lib/exertion/Exerting.ts` — `depositWorkHeat(joules)` becomes `if (MixinApi.isThermalRegulation(this)) this.absorbHeatLoad(joules)`; `canSustainPace` also requires `capacity('locomotion') === 'full'` when `MixinApi.isVitals(this)`; `exertTraverse` for `climb` refuses nothing new (the harm build's own gates stay).
- Resolve merge conflicts in `AppSettings.ts` (both branches append blocks), `AssessController.ts` (this build's block sits above build-4's), `Creature.ts` (composition comments).

**Tests.** `Exerting.heat.test.ts` (an exertion at 600 W for 60 s deposits 27 kJ; a body in a 1-clo coat sheds half as fast and spends more hydration over the same shift than a bare one; the sweat cue fires while load remains).

**Acceptance.** Drive step 7.

**Commit.** `build(nutrition-fitness W6): exertion is heat — one guarded call into build-4's heat load, and reach reads function`

### W7 — the drive

**Goal.** The requirements' drive as a wire file, run against the live game; the record appended below; `pnpm test` once; push; MR.

**Files.** `packages/wire/tests/nutrition-fitness.dirty.wire.test.ts` — `declareFile({ file, packs: ['trade-farming','trade-milling','trade-baking','trade-smithing','hearts-delight','terminus','eternal-university','rejection','distribution','hearthworks','generic-objects'], dirtyReason: 'advances two named bodies through a dialled season; consumes an orange and a barbell off the cash-and-carry par; leaves a bar on a dorm floor' })`. Two sessions H and L (`Session.open`, fresh enrol) plus a founder session for `config`. The fourteen steps map 1:1 onto the requirements' drive; each checkpoint must be able to fail (assert the *string*, the *note kind*, the *reserve moving* via `query`, never "status is defined"). Step 6b's `place` is `drop` (there is no `place` verb; the requirements' word is the product's, the engine's act is `drop`). Step 7 asserts the sweat line or records `skipped: build-4 not merged` from a single `const HEAT = …` switch. Step 5/14 snapshot every `body.*`/`exertion.*` key through `config <key>` and restore them, asserting the restore.

**Acceptance.** The record below shows the run — the output, the count, each failure named — before the MR opens.

**Commit.** `drive(nutrition-fitness): <what driving found>`

---

## Reachability wiring

Each link fails closed and silent; each is named so the drive can check it.

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| **the stocks** | none (no readout — by design) | n/a | `Reserve.defaultBiological()` | the `Creature` constructor installs them on every construct (idempotent per key) | n/a |
| **scurvy** | none | n/a | `Condition/metabolism/scurvy.yaml`; `CONDITION_PATHS.scurvy`; the `vitamin-c` tag on fruit rows | `ConditionCatalogue.warm()` stands the row up by prefix; the cascade runs on every reserve read | n/a |
| **the dials** | `config` (exists, `requiresWizard`) | `AuthorMixin`/wizard | `settings/body.yaml` + `AppSettingKeys` | the `settings` document kind merges missing keys at pack install | `config <key> <value>` — string args |
| **exertion** | every durative verb (exists) + `run`/`climb`/`go` + combat | unchanged — the instruments already afford the verbs | `effortW` on every `BuildStepOptions` site (the compiler is the census) | `Mixins.Exerting` registered; `ExertingMixin` composed on `Creature` | n/a |
| **the wind band** | `competence` (exists) | `AdvancementMixin.commandContributions.self` | `Discipline/wind.yaml` with `stock: wind`; `buildDescriptor` reads `stock` | `DisciplineCatalogue.postRegister` warms it | `competence wind` |
| **the pace** | `run` (exists) | universal | `run.yaml` `costMultiplier: 2.0` (exists) | the controller base reads `canSustainPace` | `target requires: any` (exists) |
| **the climb** | `climb` (exists, never reachable) | universal | `Ladder` class + `winze-ladder` row + the `down`/`up` exits with `media: [vertical]` | the rejection pack installs the rows; `Ladder` is instanceable under `/platform/thing/` | the enablement walk finds the ladder in the room's contents |
| **the double shift** | every step verb | unchanged | `exertion.exhaustionFloorPct` | n/a | `canExert` before `SchedulerApi.start` |
| **the mirror** | `look` (exists) | universal | the phrase table | `Character.markupAugmenters` is a class static the walk collects | n/a |
| **assess band** | `assess` (exists) | medic/self | `BMI_PHRASE` | n/a | the `named || precise` gate |
| **an orange** | `buy` (exists) | the Stock counter affords it | the counter's `stockLines` + `prices` line; `distribution` depends on `trade-farming` | the counter tops to par on standup/reset | `buy orange` binds by keyword |
| **the gym** | `survey` (exists) | universal | `archetypes/gym.yaml` (`industry: null`) | `ArchetypeCatalogue.warm()` from `documents {kind: archetype}` | n/a |
| **`lift`** | `lift` — **new** | `LoadDevice.commandContributions.environment/peers` (a class static — a row's `commandContributions:` is dead) | `barbell.yaml` names `class: /platform/thing/LoadDevice` and `capabilities: [load]`; the recipe; the counter line | the trade-smithing pack installs the rows; the platform pack installs the view | ⭐ `device` arg `requires: [ToolMixin]` with `default: "reachable:[capability.load]"` — a target that is not a Tool is refused **before the controller runs**; the drive must `lift 60` with the bar in the room, not held |
| **heat** (W6) | none | n/a | n/a | `MixinApi.isThermalRegulation` on the merged tree | n/a |

Two things the wire file must specifically prove because a unit test cannot: that `lift` is *afforded* with the bar on the dorm floor (the `environment` bucket, not `inventory`), and that `climb down` at the winze head binds an exit at all (the first climb in the game's history).

---

## Acceptance-criteria coverage

| requirements acceptance criterion | wave |
|---|---|
| Looking at any person prints a body line; livestock prints exactly what it printed before | W3 |
| `assess` names the body-condition band in words, never a number; no readout of a reserve/BMI/fitness figure anywhere | W3 (+ W0 reads, no gauge anywhere) |
| A hew, a plough and a smelt cost what they cost; a mill, a knead, a hammer and a weave now cost something in proportion; a cart on wheels still hauls free | W1 (felt-cost test; a wheeled cart's draft sits under `LIGHT_LOAD_FLOOR`, so `loadFactor = 1`) |
| A fresh body's `run` breaks to a walk within a few exits; a worked body holds it; an idle body loses it; an absent body loses nothing | W2 (+ W0's freeze rules) |
| The climb at the winze reads differently for the conditioned body and the fresh one | W2 |
| Working in a coat produces a sweat line and costs more water; cold air produces neither | W6 (conditional, per the requirements) |
| Two bodies of one species that spend a dialled season differently read differently to `look`; the tape says the worked body has moved | W3 + W1 (mass is unchanged by the stocks in this build — see Risks: the tape moves only if mass moves) |
| A person can buy an orange somewhere a person can go | W4 |
| Bread alone for a dialled expedition produces a condition the physician can see; an orange resolves it | W0 + W4 |
| A wholemeal and a white loaf from one wheat show different amounts; no loaf row authored an amount | W4 |
| A bar placed in any room makes it meet the gym's load slot, no code, no second archetype; a mat and a bag read the same way | W5 (a "bag" is a `pace` device — no exemplar ships; the slot reads `pace`, see Risks) |
| A body that has outgrown the world's load stops gaining muscle from it and gains again at a chosen heavier load; a body on a sustained device gains wind and not muscle | W1 (unit) + W5 (drive 6b) — the sustained-device half is proved at unit level only (Risks) |
| The exemplar device is made by a shipped trade and priced at the counter | W5 |
| The body-rate dials are visible in `config`, and turning them back restores the pre-drive figures | W0 + W7 |
| Alcohol tolerance fades on the active-play clock and not with absence | W0 + W2 |

**Unmapped:** none. Two criteria are mapped with a caveat each (the tape, the sustained device) — both in Risks for the user's eye.

---

## Test & gate strategy

- **Unit** (per wave, `pnpm test:near` + the touched pack's `pnpm test`): the slice steps, the routing widen, the cascade on `vitamin-c`, the exertion arithmetic and the felt-cost pins, the registry emit (complete / sub-100 ms / pro-rata abort / no `effortW`), the pace re-resolution, the ladder enablement, the conditioning band branch, the augmenter host set (Character yes, Livestock no), the assess block, the archetype fit, the lift controller's three refusals, the device setters. Anything touching the wired runtime imports `test-bootstrap` (`lint:test-bootstrap`).
- **Golden the stockman read once:** a test that `Livestock.stockmanRead()` on a default body equals the shipped string, kept permanently (it is a contract with ranching, not a content golden).
- **Only the drive can prove:** that `lift` is afforded from the floor, that `climb down` binds, that a `config` change moves a season inside one session, that the two bodies diverge on `look` from one starting point, that `buy orange` then `eat orange` clears scurvy end to end, that `survey` names the gym in a dorm. Written as the wire file in W7 and **run**, with the record below.
- **`pnpm test` runs twice**: before the MR (after W7's drive is green) and at `/finalize`. Everything between is `test:near` + pack suites + `lint:family`.
- **Gates**: `lint:family` after every wave; the ones named under Convention conformance are the ones this build can break. Watch `lint:capabilities`' declared-never-consumed count (must not rise — `pace` is consumed by the archetype, so it does not), `lint:lib-statics` (no new public static methods), `lint:unconsumed-seams` (`Discipline.stock` is read; `LoadDevice`'s four fields are read by `LiftController`), `lint:verb-collisions` (`lift` is unclaimed today — verified by grep over `content/**/cmd/**/*.yaml`; the build re-runs the gate).

---

## Risks & opens

**For the user's eye (decisions the plan makes that the requirements did not):**

1. ⭐ **Option B for conditioning, and sharper than sketched (D4).** The band is a threshold over a body stock; the Transcript gets **no** `wind` rows at all. This contradicts the requirements sentence *"The Transcript stays append-only; nothing is stored"* — the stock IS stored (as a reserve, like `flesh`). What the sentence was protecting still holds: bands only, no gauge, fades with play, frozen by absence, `alcohol-tolerance` true by the same rule. The trade-off: Option A (a half-life fold over the Transcript keyed on an active-play age) would need a new persisted active-play stamp on every owner and every entry, a `now` parameter threaded through `Competence.derive`, and the two fold caches invalidated on time rather than on append — three new mechanisms for a band that physiology says is a body state anyway (VO₂max is not a memory of your evidence). B is one reserve and one field. **If the user wants the Transcript to carry the evidence for its own sake** (the chronicle-shaped argument), the seam is `exert` appending a `wind` deed per *engagement completion* only (never per traverse) — a one-line addition later, with the band still read off the stock.
2. ⭐ **The requirements' climb premise is false (D10).** Nothing in the game composes `ClimbableMixin`; the winze has no `down`. The plan authors the minimum (a kernel `Ladder`, one rejection ladder row, one new room, two exits) because the rung is in the acceptance criteria. This is a small content addition to a pack (`rejection`) this build was not otherwise touching.
3. **Felt cost is preserved at reference conditions, not identically (D7).** Harder ground now costs proportionally more than reference ground (a hew on hard rock used to cost 4 % whatever its duration); a barged-in step costs pro-rata rather than the whole figure up front. Both are more honest; both are visible to a player who knows the old numbers.
4. **The tape.** *"The tailor's tape says the worked body has moved"* requires **mass** to move, and this build's stocks are `%` reserves that do not change `getMass()`. Textiles' girth reads mass. Two options: (a) `Creature.getMass()` adds a derived term `± body.massPerFleshPct × (flesh − 55) + body.massPerLeanPct × (lean − 50)` — one read, every mass consumer (capacity, basal drain, thermal mass, the fist) inherits it, and it is honest (a fatter body weighs more); (b) leave mass alone and drop the tape claim to a follow-on. **The plan takes (a)** in W0 with small dials (0.3 kg per flesh point, 0.25 kg per lean point — a body from `emaciated` to `fat` spans roughly 27 kg on a 70 kg frame) and a test that the seed body masses exactly the species figure. Flagged because it touches every mass reader; the encumbrance doc's *"three production reads changed and only three"* history says how far a mass change reaches.
5. **The sustained-device exemplar does not ship.** The requirements say one exemplar made by a trade; the `pace` kind is minted by the archetype and consumed by nothing else, and the criterion *"a body on a sustained device gains wind and not muscle"* is proved at unit level (a 400 W / 600 s exertion) and by the run, not by a device. A treadmill row (*"the run that goes nowhere"*) plus a `pace <device>` verb is a follow-on of the same shape as W5. Recorded as a deferred seam.
6. **`alcohol-tolerance` has a band and no consumer.** The requirement is that it fades honestly; widening the `bac` band thresholds by tolerance is a metabolism-tail seam, not this build's.

**Engineering risks:**

- **The pack graph changes in W4 and W5** (`distribution/package.json` gains `trade-farming` and `trade-smithing`). A stale `node_modules` fails every pack suite at collection with a `PackLogic` "Cannot find module" that reads like a repo defect — run `pnpm install` after each of those waves before trusting any test result.
- **Build-4 merge.** Both branches append to `AppSettings.ts` (mechanical conflict), both touch `AssessController.ts` (this build's block sits above build-4's first hunk), both add a `MixinApi` predicate, and build-4 rewrites `Vitals.ts` (+718) — this build does **not** touch `Vitals.ts`, deliberately. `drainForLimp` is left alone for the same reason. W6 is the only wave that reads build-4's surface, and it is gated.
- **The walk gains wind.** At `windFloorFraction 0.5` a 300 W walk on a 300 W sustainable body trains wind (slowly; the half-life bounds it). Physiologically true of an untrained body; a player who only walks will hold `novice` wind at equilibrium. If that reads wrong in the drive, raise the floor fraction — it is a dial.
- **Dial magnitudes are plan estimates.** Every number in `body.yaml` is a defensible default whose job is to make the drive legible at a dialled-up rate; the shipped rates are playtest. The felt-cost pins are the only numbers that must hold exactly.
- **`refreshConferrals` on crossing** does a transcript read per crossing; crossings are rare (five bands, half-life decay) and the call is `void`. If a slice crosses repeatedly at a threshold (jitter), debounce with a stamped last-band on the mixin (runtime-only field).
- **`lint:capabilities` declared-never-consumed** — `pace` is consumed by the archetype so it does not count; `load` is consumed three ways. The count cannot rise.
- **The registry's pro-rata abort uses wall elapsed × clock scale** against a game-ms duration; a paused world clock over-credits an aborted step slightly. Acceptable; noted in the code.
- **The `eats` cast** (pantry-hand, clerk) now carry all five stocks and eat bread: they hold `in good flesh`, never overload, and their `vitamin-c` drains over 30 active game-days — since NPCs integrate long absences (`integratesLongAbsence`), a cast member on bread alone **will** get scurvy in about 30 game-days of world time. The requirements call this correct and worth watching; the drive records their state at the end.

---

## Deferred seams

Clean attach points, and the slate each leaves as (written at the sweep, not here):

- **The sustained device** — a `pace` row (treadmill / rower / wheel) + a `pace <device> [for <minutes>]` verb over the same `engageStep` with `effortW` from the row; the archetype slot already waits for it. → a section in the nutrition-and-fitness slate's tail.
- **The real-world adapter** — `exert({durationS, powerW})` is the one shape a device session converts into; the `Journey` binding is logistics'. → [mirror-slate](../slates/builds/mirror-slate.md) (unchanged).
- **Tolerance as a consumer** — `bac` band thresholds scaled by the `alcohol-tolerance` stock. → metabolism-slate's tail.
- **The wider deficiency roster** — iron/anaemia, the B group, calcium: a reserve key + a route + a condition row each, over the shipped `nutrientAmounts` keys. → metabolism-slate's tail.
- **Protein → healing** — harm's healing rate reading the `protein` reserve. → the disease/healing slate.
- **Conferrals on the `wind` row** — the swim, when there is water; the `refreshConferrals`-on-crossing hook is already wired. → fishing/underwater design.
- **Casting effort as a dial** — `CastActivity` carries a const 300 W; arcana's own `settings/magic.yaml` (on build-4) is where it moves once build-4 lands.
- **A per-part muscle read** — a derived share of `lean` over the plan's `muscle` tissue masses, for the capability-magic strength read. → capability-magic-slate.
- **The beauty canon** — W3's body augmenter is the attach point the cosmetics slate's *Beauty* section names: its vocabulary is one person-register table today and becomes a per-culture **canon** document's when that lands; the augmenter's shape (facts in, a described line out, seeded per viewer) does not change. → [cosmetics-slate § Beauty](../slates/builds/cosmetics-slate.md).
- **Sweat as body soiling** — `depositWorkHeat` is where an exertion deposits on a `Soilable` body the day room-condition ships one; the gym makes you dirty and the bathhouse is its neighbour. → [rendering-slate § 8 (soap)](../slates/builds/rendering-slate.md) + room-condition.

---

## Critical files

Read these first, in this order:

1. `docs/requirements/nutrition-and-fitness-requirements.md` — the product scope and the drive.
2. `packages/server/src/mud/lib/reserve.ts` and `packages/server/src/mud/lib/metabolism/Metabolic.ts` (the routing table :337, `integrateSlice` :707, `partitionFlesh` :741, `reconcileMetabolism` :579, `reconcileCascade` :1058, `absorbToxin`, `reserveCurrent` :1514).
3. `packages/server/src/mud/lib/creature/Creature.ts` (composition :134-203, the bands :209-236, the readers :263-330) and `packages/server/src/mud/lib/character/Character.ts` (composition :92-125).
4. `packages/server/src/mud/platform/idea/SchedulerRegistry.ts` (:440-560) and `packages/server/src/mud/api/scheduler.ts` (:61-79); `packages/server/src/mud/lib/craft/ManualBuildStep.ts`; `packages/server/src/mud/platform/idea/cmd/crafting/ManualBuildController.ts`.
5. `packages/server/src/mud/platform/idea/api/LocomotionLogic.ts` (`engageAround` :372-410, `checkEnablementScope` :505, `findEnablementHost`) and `packages/server/src/mud/platform/idea/cmd/movement/LocomotionControllerBase.ts` (:53-169).
6. `packages/server/src/mud/lib/encumbrance/LoadBearing.ts` (:100-109, :184-193, :306-360).
7. `packages/server/src/mud/lib/advancement/Advancement.ts` (:151-225, :360-383, :455-505), `packages/server/src/mud/platform/idea/Discipline.ts`, `packages/server/src/mud/platform/idea/DisciplineCatalogue.ts` (:155-210).
8. `packages/server/src/mud/lib/material/Freshness.ts` (:125-140 — the `dial` shape) and `packages/content/platform/content/settings/freshness.yaml`; `packages/server/src/mud/lib/config/AppSettings.ts` (:1221-1245 — a key block).
9. `packages/server/src/mud/lib/archetype/Archetype.ts` (:141-215, :449-515); `packages/content/generic-objects/content/archetypes/bedroom.yaml`; `packages/content/trade-smithing/src/thing/Anvil.ts`; `packages/server/src/mud/platform/thing/ToolItem.ts`; `packages/content/trade-smithing/content/recipes/fire-poker.yaml`; `packages/content/distribution/content/trade/distribution/thing/counter.yaml`.
10. `packages/server/src/mud/lib/species/Organism.ts` (:131-145 — the augmenter shape) and `packages/server/src/mud/api/mixin.ts` (:1859 — how augmenters are collected); `packages/server/src/mud/platform/idea/cmd/perception/AssessController.ts` (:95-200).
11. `packages/content/rejection/content/world/rejection/ferrow/winze-head.yaml`; `packages/server/src/mud/lib/locomotion/Climbable.ts`.
12. `packages/content/trade-mining/src/idea/cmd/mining/{MiningActController,HewController}.ts`, `packages/content/trade-farming/src/idea/cmd/farming/{FieldWorkController,PloughController}.ts`, `packages/content/trade-smelting/src/idea/cmd/smelting/SmeltController.ts` (the debits to remove).
13. `packages/wire/tests/grain-chain.dirty.wire.test.ts` and `packages/wire/src/harness/` — the drive's shape.
14. `packages/server/scripts/check-capabilities.ts`, `check-instrument-args.ts`, `check-arg-kinds.ts`, `check-unconsumed-seams.ts`, `check-lib-statics.ts` — the gates this build can trip.
15. For W6 only: `git show design/harm-survey:packages/server/src/mud/lib/thermal/ThermalRegulation.ts` (:130-160, :370-420) and `…/lib/vitals/BodyCapacity.ts`.

---

## Drive record

*(appended at build time, not at plan time)*
