# Clinical medicine — implementation plan

Executes `docs/requirements/clinical-medicine-requirements.md`. **Kind:
feature. Lead end: kernel-led** (Stage A in `packages/server/src/mud/` +
the platform pack; Stage B in `trade-medicine` + `terminus` +
`species-and-names` + `base-library`). First consumers: the Terminus
infirmary and combat/the delve.

What is being built: blood you can type, draw, store and transfuse (with a
real incompatibility reaction and a saline floor); a foreign-body wound
only extraction resolves; `operate` deepened into a durative, blood-costing,
interruptible act over a five-row operation catalogue; suturing with a
mandatory removal; the `nursing`/`medicine` Discipline split and the
nurse position; `prescribe` → `administer`; a thin, autarky-sourced drug
slice on the shipped `dose`/tag substrate; and the first slice of a
personal calendar on the aether implant, which medicine writes the return
date to.

---

## Grounding

Verified this cycle by opening the files. Paths are relative to
`packages/server/src/mud/` unless they start with `packages/`.

### The body

- **`bloodVolume`** is a first-class vital sign on `VitalsMixin`
  (`lib/vitals/Vitals.ts` — `VITAL_SIGNS`, `_bloodVolume` at ~L736,
  `QuantityMarshaller.pathFor('L')`, universe default `{baseline 5,
  survivableMin 3.2}` at L235). `hasVitalSign('bloodVolume')` (L978) is
  the bloodless-clade gate. Bleeds drain it in
  `LACERATION_BEHAVIOR.tick` (`platform/idea/Condition.ts` ~L900);
  exsanguination opens the dying window at L2530.
- **`PLASMA_RESTORE_CEILING_FRAC = 0.85`** — `lib/metabolism/Metabolic.ts`
  L238 (`METABOLIC_DEFAULTS`), applied in `restorePlasma` L1074–1100:
  hydration refills volume only up to `baseline × 0.85`, and both the
  const and the method carry the "raising this deletes the blood build's
  premise" warning. **Not touched by this plan.**
- **`introduceToxin(type, amount)`** (Metabolic L1616) is the injected
  route straight onto `toxinBurdens[type]` — the bloodstream seam past
  digestion. `applyAntidote(type)` (L1608) crashes a burden.
  `resolveToxinBehavior(type)` (L1025) resolves a toxin's `Condition` row
  at **`TemplatePathPrefixes.metabolismCondition + type`** =
  `/platform/idea/Condition/metabolism/<type>` — so every new drug active
  is a row in that directory of the **platform** pack, keyed by its toxin
  type.
- **`VitalsMixin.applyTreatment(wound, {by, efficacy, treater})`**
  (L2826) is the one treatment primitive: runs
  `TRAUMA_BEHAVIOR[type].resolve`, stamps `careQuality`, resets the
  open-wound sepsis clock, seeds sepsis on dirty care (`seedSepsis`,
  L2905). `severPart(key)` (L1701) is the one writer of `missing`, cascades
  the subtree, vacates the slots. `convalescenceFactor()` (L1148),
  `getCarer()`/`_setCarer()` (L1237), `nextInterestingAt()` +
  `rescheduleNotify()` + `onNotifyFire()` (L2957–3030) are the notify
  alarm: a one-shot `ScheduleApi.schedule`, rebooked on state change,
  gated on `isHasInteractive`.
- **`getConsciousness()`** (L1071) reads: dead → dying record → blood
  fraction `< 0.7` → `spo2` floor → brain capacity / head trauma. **No
  condition can make a body read `unconscious` today** — there is no
  effect kind for it. Anaesthesia needs one (D9).
- **`VitalEffect`** (Condition.ts L687–747) is a five-kind union —
  `vital` · `reserve` · `function` · `expression` · `convalescence`;
  the last three are READ kinds (never integrated). `lint:conditions`
  (`packages/server/scripts/check-conditions.ts`, `EFFECT_KINDS` array)
  enumerates the kinds; a new kind is a lint edit too.
- **`AfflictionRecord`** (Condition.ts L41) = `{kind:'affliction',
  templatePath, stage, elapsed, magicOrigin?, tickedAt?, pathogenLoad?,
  symptomsAt?, inflictedBy?}`. **`ProgressionSpec`** (L773) = `{law:
  stage|decay|logistic|burden, intervalMs?, decayPerSec?}`. The `decay`
  arm (Vitals L1952) subtracts `decayPerSec × elapsedSec` from `stage`
  and relieves at 0 — a landed impulse that fades, the shape the
  transfusion reaction wants. **No new arm is needed anywhere in this
  plan**; `lint:condition-arms` ceiling stays 5.
- **`TraumaType`** (Condition.ts L103) is a closed nine-member union;
  **`Trauma`** (L154) carries `type · site · severity · bleeding? ·
  dressed? · mechanism? · inflictedBy? · careQuality? · openSince? ·
  septicSeeded? · peak? · maimAllowed?`. **`TraumaBehavior`** (L795) is
  `onset/tick/mend/resolve/reopen/describe` + `signature?` +
  `resolution?`. `RUPTURE_BEHAVIOR` (L1207) is the exemplar for a wound
  whose `resolve` only surgery reaches: laceration's bleed, `mend`
  no-op until `dressed`, `resolution: 'surgery'`. `PUNCTURE_BEHAVIOR`
  (L1158) delegates wholesale to laceration. `TRAUMA_BEHAVIOR` roster at
  L1345; `BLEED_FAMILY` (the sepsis-capable set) right after it.
  `HARM_DEFAULTS` (L260) holds every rate.
- **`mismatchLine`** (`platform/idea/cmd/medical/TreatController.ts`
  L153) is the word table `treat` renders a refusal from — `surgery`,
  `setting`, `rinsing` are there; a new resolution token needs a word.
- **`InflictSpec`** (`api/condition.ts` L187) = `EnergyInflictSpec |
  ShockInflictSpec | CorrosionInflictSpec`; `InflictOutcome` = `{trauma,
  afflicted, reached?}`. Producers this plan touches:
  `platform/idea/cmd/combat/ShootController.ts` L160
  (`shot.profile.toInflictSpec('body.torso')` → `ConditionApi.inflict`)
  and `lib/hazard/HazardDelivery.ts` (`toInflictSpec`; options carry an
  optional injected `toxin`). The `step-dart` trap row
  (`packages/content/generic-objects/content/stuff/thing/traps/step-dart.yaml`)
  is `delivery: {channel: point, energy: 2, siteSelector: [feet],
  toxin: {type: venom, amount: 4}}`, `concealment: hidden` — "a walking
  novice springs it". It is cloned by `props:` into the Sunken Delve
  corridor rows (`packages/content/newbie-wilds/content/world/newbie-wilds/delve/corridor-1..3.yaml`).
- **`MATERIAL_FORK_SLICES`** (Vitals L138) — `forkSlice_Vitals` (L888)
  copies the seven signs only; a new per-body blood field must be added
  there to reach the corpse.

### Reserves

- `lib/reserve.ts`: `BIOLOGICAL_RESERVE_KEYS` (L70) is nine keys
  (`endurance · satiation · hydration · flesh · lean · protein · wind ·
  vitamin-c · alcohol-tolerance`), seeded at L140–200 — `seeded(pct,
  floorEffect)`; `lean`/`wind` seed with `floorEffect: null` (no acute
  floor; `getConditionBand` skips a floorEffect-less reserve). Installed
  by `Creature`'s `installBiologicalReserves()` (idempotent). Regen of
  `lean`/`wind` rides `Metabolic`'s slice (the relaxation-to-seed
  pattern). A tenth key is one entry + one regen line.

### Engagements

- `lib/craft/ManualBuildStep.ts` — `DurativeActivity` on `hands`,
  `onComplete`/`onAbort`, `cancelable`, `replaceableBy`. The
  `engageStep` shape is `platform/idea/cmd/crafting/ManualBuildController.ts`
  L68–125 (start → `started`/`completed-sync`/`engagement-conflict`/
  `start-rejected`).
- `lib/combat/Coup.ts` — the interruptible durative on `body`, with the
  **declaration-merge** for a new `AbortReason`:
  `declare module "@saxonberg/types" { interface AbortReasonRegistry {
  "combat-intervened": true } }` (L31). `coupEligible` re-checks
  co-presence at start and completion.
- `lib/vitals/TendingEngagement.ts` — a `SustainedEngagement` on the
  carer's `attention`; `_setCarer(carer, band)` on start, cleared on
  abort. `EngagementSlot` = `body | hands | attention | voice`
  (`lib/activity/Engaged.ts` L66).
- `platform/idea/SchedulerRegistry.ts` L216: a conflicting engagement is
  refused (`engagement-conflict`) unless the existing one's
  `replaceableBy` includes the newcomer's `type`, in which case the old
  is terminated with reason `'replaced'`. **Combat's participant hold**
  (`lib/combat/CombatSession.ts` L418, `type = COMBAT_PARTICIPANT_TYPE`)
  takes `body`. An operation that wants "surgeon attacked → interrupted"
  must hold `body` and list combat's type in `replaceableBy` (W3).

### The shipped medical acts

- `trade-medicine` (`packages/content/trade-medicine/`): `pack.yaml` root
  `/trade/medicine`, `requires.title` held by `/compact/trade`.
  `src/idea/cmd/medical/OperateController.ts` — one tick, competent+
  in `medicine`, patient must `Postures.Lie`, worst undressed rupture,
  `applyTreatment(…{by:'surgery', efficacy: 0.4+0.15·rank})`, credits
  `medicine formidable`. View `content/trade/medicine/cmd/medical/operate.yaml`
  (`verbs: [operate, surgery]`; kit arg `default:
  "me:i:[capability.surgery]"`, `requires: [ToolMixin]`).
  `src/thing/SurgicalKit.ts` = `AudibleMixin(ToolItem)`,
  `commandContributions.environment: ['trade/medicine/cmd/medical/operate.yaml']`,
  `capabilities: ['surgery']` — the carried-instrument shape.
  `src/thing/Splint.ts` the same for `set.yaml` (⚠ the view's verb is
  **`splint`**; `set` is a scripting builtin — `lib/script/builtins.ts`).
  `src/behavior/nurses.ts` — triage + dress/tend on the `medicine` band,
  claims `attention`. Rows: `antivenin.yaml` (Material, `tags:
  [antidote:venom, liquid, remedy]`), `antivenin-vial.yaml`
  (`/platform/thing/Receptacle`, `interiorMaterial` = antivenin, 0.25 L),
  `surgical-kit.yaml`, `splint.yaml`.
- Kernel medical verbs (`platform/idea/cmd/medical/`): `Dose`, `Treat`,
  `Tend`, `Undress`, `Cool`, `Warm`, `Rinse`; views in
  `packages/content/platform/content/platform/cmd/medical/`. `dose.yaml`
  `verbs: [dose]`, `with` default `"reachable:[mixin.BulkableMixin]"`.
  **`DoseController`** reads only `antidote:<toxin>` Material tags,
  spends `DOSE_LITRES = 0.05`. `VitalsMixin.commandContributions.self`
  (Vitals L688) = `treat / undress / dose / tend`.
- **Every `'medicine'` competence site** (the census for D1):
  `TendController` L29 · `TreatController` L271/318 (the dressing act),
  L437 (the `for` diagnosis commit), L604/631 (the stabilization/illness
  arm) · `AssessController` L114 (sharpening), L252 (`realMedBand`,
  interior naming) · trade-medicine `OperateController` L37 ·
  `SetController` L30/80/92 · `AnalyzePatientController` L52/87 ·
  `nurses.ts` L32 · `physician.yaml` dossier (`medicine: proficient`) ·
  `Discipline/forensics.yaml` `specializes: [medicine]`.
- **`OrderController.treatWorst`** (`platform/idea/cmd/retail/OrderController.ts`
  L325) — the paid `order treatment` path; reads no band literal (check
  and re-point if it does at build time).

### Disciplines

- Rows are `class: /platform/idea/Discipline` leaves; the platform's
  live in `packages/content/platform/content/platform/idea/Discipline/`
  (32 rows). **`medicine.yaml`: `iscedf: "0913"` (Nursing and
  midwifery), description "First aid and the care of wounds…",
  `specializes: [services]`.** `forensics.yaml` specializes it.
- `DisciplineCatalogue` (`platform/idea/DisciplineCatalogue.ts`) warms
  **by class** — `Template.findByClass(Discipline.CLASS_PATH)` — so a row
  under any pack root is recognized at boot. Descriptor fields: `key ·
  channel · label · description · iscedf · requires · specializes ·
  synergizes · conferrals · stock`. NPC dossiers assert competence per
  key (`competence: [{discipline, asserting}]`; `lint:dossiers` folds
  the seeded run).

### Employment

- `packages/content/terminus/content/world/terminus/infirmary/business.yaml`
  — `/platform/idea/Business`, one `physician` position (`key/noun/label/
  wageRate 6`; no `confers` — retired, see below), roster 07–19 every day, `banksAt: goodkin`,
  `operatingLocations: [/world/terminus/infirmary/ward]`. `ward.yaml`
  props the splint, the surgical kit, the antivenin vial, a basin, three
  bandages, the cot, the tariff; `cast: [physician]`. `physician.yaml`
  (Aldis Verrow, `/platform/agent/Cast`) carries `shifts` + `nurses
  (cadenceMs 20000)` brains, `archetype: physician`.
- ✅ **`design/trades-and-labor` + `design/retire-conferral` MERGED to
  master (2026-09-24); this branch is caught up.** `Position.confers` is
  **gone**, replaced by **`fulfills`** (Discipline keys a seat serves an
  `order` in, on shift) + **`requires: {discipline?, band?}`** (the hiring
  gate) + `purchases` + `headcount`. Nothing references the old `confers`.
  The `medicine` Discipline key is unchanged by the merge (only its iscedf
  moves in W0), so the new `nursing` key is additive. W6 authors the nurse
  seat in this shape (below). ⭐ Verified: the merge touched none of this
  build's other substrate (Vitals, Condition, Metabolic, Species, bulk,
  the Disciplines, comms/implant, ranged/combat/hazard, trade-medicine) —
  only `business.yaml`.

### Species

- `platform/idea/species/Species.ts` — `fieldMeta` (L711) with
  `authorable: true` on the content-facing fields; `vitalProfile`,
  `innateMixins`, `naturalAttacks` carry `spoiler: 1, spoilerName: 0`.
  Ten playable + six NPC-first `homo/*` rows in
  `packages/content/species-and-names/content/stuff/idea/species/animalia/chordata/mammalia/primates/hominidae/homo/`
  (`sapiens.yaml` is the exemplar; it authors `vitalProfile.bloodVolume`).
- `lib/Seeded.ts` (`Seeded.unit(…)`) is the seeded-hash value object the
  weather field uses — the "seeded, not drawn" primitive for a birth roll.

### Bulk, spoilage, materials

- `FreshnessMixin` composes onto **`Provision` only**
  (`platform/thing/Provision.ts` L51). Bulk holders never compose it:
  **a bulk slot's gauge is `BulkPayload.freshness`**, seeded lazily by
  `Freshness.loadOf(slot)` when the slot's Material tabulates
  `spoilActivationEnergy` (`lib/material/Freshness.ts` L651–680), and
  reconciled through the **holder's** `ThermalMixin` (L625–640).
  `Receptacle` = `ThermalMixin(BulkableMixin(Thing))`
  (`platform/thing/Receptacle.ts`); `GradedReceptacle`/`Bottle` also
  compose Thermal. **So a blood unit needs no `FreshnessMixin` host
  widening at all** — it is a perishable Material in a Receptacle.
  `Freshness.bandOf` thresholds: `freshness.band.{tainted,spoiled,rotten}At`
  = 0.25 / 0.6 / 0.85. `lint:perishable` gates a row's own
  `_materialPath`, not `interiorMaterial`.
- `BulkPayload` (`lib/bulk/Bulkable.ts` L134) is extended per subsystem
  by `declare module '../bulk/Bulkable' { interface BulkPayload { … } }`
  (`Freshness.ts` L213 declares `freshness`; `Contaminable.ts` declares
  `pathogens`/`pathogenStamp`). Each module blends its own field on a
  transfer.
- Materials: `packages/content/base-library/content/stuff/idea/material/tissue/{flesh,bone,muscle,plant-tissue,fruit-flesh}.yaml`
  (`flesh.yaml` tabulates `spoilActivationEnergy: 80000, waterActivity:
  0.99`); `bulk/salt-water.yaml` (`tags: [liquid, brine, conductive]`,
  `edibility: false`); `bulk/water.yaml`. `Material.toxicity:
  ToxinTag[]` = `[{type, amount}]`, the per-serving dose.
- `Plant` rows (`class: /platform/thing/Plant`, e.g.
  `packages/content/trade-forestry/content/trade/forestry/thing/hazel-stool.yaml`)
  author `harvestTemplatePath` (what `harvest` clones), `harvestTool`
  (`''` = by hand — `lib/husbandry/Growing.ts` L583), `discipline`, a
  `profile` with `fruitFillDays` (the regrow cycle) and can ship
  ready-to-harvest. `HarvestController` mints via `StuffApi.clone`.
- Willow exists: species
  `packages/content/trade-forestry/content/stuff/idea/species/plantae/tracheophyta/magnoliopsida/malpighiales/salicaceae/salix/alba.yaml`
  (Salix alba, `_defaultMaterialPath: tissue/plant-tissue`).
- Recipes are `Document`s (`recipeId`, `inputSlots`, `toolCapabilities`,
  `outputTemplate`, `outputMaterial`, `outputPortionL`, `requiresHeatK`,
  `discipline`) resolved by trade verbs (`cook`, `mix`) after a by-hand
  learn (`docs/subsystems/crafting.md` § the knowledge ladder). The
  by-hand cooking path needs a `CookPot` (`trade-cooking/src/thing/`) and
  reachable heat. **Nothing generic steeps a herb in water without a
  cooking dependency** — the prep needs a verb of its own (D10).

### The implant, hosted apps, persistence

- `Avatar.installDefaultLoadout` (`platform/agent/Avatar.ts` L1170–1245)
  occupies the cranial slot with `AetherImplant` and hosts three
  session-scoped apps: `CommsUpdate`, `ForumsUpdate`,
  `CredentialWalletUpdate` (`platform/idea/*Update.ts`, each
  `XMixin(AetherHostedMixin(Idea))` with `static TEMPLATE_PATH =
  TemplatePaths.<x>` and a platform row
  `packages/content/platform/content/platform/idea/<X>Update.yaml`).
  A hosted app's `static commandContributions.self` (e.g.
  `lib/forum/Forums.ts` L53: `['platform/cmd/social/forum.yaml']`)
  reaches the host through hosted-update self-seeding. Apps are **not**
  in the Avatar snapshot; they re-provision every login.
- `Avatar` = `PersistableMixin(EstateMixin(ForkableMixin(
  PostRegistrationMixin(HasInteractiveMixin(AetherMixin(…))))))`
  (L161). A declared persistent field on any Avatar mixin rides the
  default slice into `holder_snapshots`.
- `holder_snapshots` is `reset: wipe`
  (`packages/server/src/schema/holder_snapshots.yaml`); the nightly
  reset (`docs/subsystems/record-layer.md` § The nightly reset) removes
  **all** player state, accounts included, keeping only `documents` rows
  with a declared kind. **A calendar can therefore be no more durable
  than its owner whichever home it takes**; the requirement's
  "surviving the nightly reset" is read as *durable player state, not
  the record-layer frame store*. `DocumentKinds`
  (`lib/document/DocumentKinds.ts`) is a closed platform vocabulary; the
  `/home/<self>` save gate admits the **owner** only — a clinician
  writing a patient's document would need a new named ownership bypass
  (`saveRelease`'s shape, documented as dangerous).
- `WorldClockApi.at(deadline, cb, {host})` (`docs/subsystems/time.md`)
  is the pause/scale-aware one-shot; schedules are never persisted —
  "persist state, re-arm in `postRegister`".

### Verb names

- **`draw` collides**: `packages/content/platform/content/platform/cmd/banking/draw.yaml`
  (the proprietor's draw). A second view claiming a verb shadows the
  first silently (`lint:verb-collisions`). `test`, `transfuse`,
  `suture`, `prescribe`, `administer`, `steep`, `calendar`, `unstitch`,
  `bleed` claim nothing today; `test` is not a scripting builtin
  (`SCRIPT_BUILTINS` = set/if/each/while/def/wait/every/when).
- `undress.yaml` (`verbs: [undress]`) → `UndressController` calls the
  wound's `reopen`; the clot gate already implements "too early
  reopens".

### Wire harness

- `packages/wire/src/harness/session.ts`: `Session.open(handle,
  {startLocation?, wizard?})`, `session.cmd(line)`, `expectOk`;
  `declareFile({file, packs, dirtyReason?})`. A **wizard** session may
  `practice <discipline> <difficulty> <outcome>` to seed competence
  (`identity`, `consequence`, `nutrition-fitness` drives do). Existing
  medical drive: `tests/recovery.dirty.wire.test.ts` (springs a delve
  trap → `.dirty.`).

### Lint roster

`pnpm -C packages/server lint:family` runs 48 gates. Named below in
§ Test & gate strategy. `lint:condition-arms` ceiling = 5 (must not
rise). `lint:capabilities` requires every declared capability kind to
have a consumer (a view's `[capability.X]` or a recipe slot).
`lint:census` requires every `props:`/`cast:`/exit path to resolve.

---

## Plan-level decisions

### D1 — The Discipline split: `medicine` keeps the doctor, `nursing` is minted, both under a new `health` field

- **`medicine` keeps its key** (the requirements say the doctor is
  `medicine`). Its row is re-anchored: `iscedf: "0912"` (Medicine),
  description rewritten to *diagnosis, operations, prescribing, the
  cross-match decision*, `specializes: [health]`.
- **New `nursing`** (`channel: skill`, `iscedf: "0913"` — the anchor the
  shipped row was wearing, and the shipped description *"First aid and
  the care of wounds — assessing a body, dressing a bleed, judging when
  it has clotted"* moves here verbatim; `specializes: [health]`).
- **New structural node `health`** (`channel: knowledge`, `iscedf:
  "09"`, Health and welfare, no `specializes`) — the *prefer
  specializations* rule wants a spine, and `services` was never the
  right parent for either.
- `forensics.specializes: [medicine]` unchanged.
- **The re-point rule:** *hands-on care credits and grades on
  `nursing`; a judgement credits and grades on `medicine`; a read that
  both professions make takes the better band of the two.*

| site | today | becomes |
|---|---|---|
| `TendController` band → `TendingEngagement` | medicine | **nursing** |
| `TreatController` L271/318 dressing efficacy + deed | medicine | **nursing** |
| `TreatController` L437 `for <condition>` commit deed | medicine | medicine |
| `TreatController` L604/631 stabilization / illness arm | medicine | **nursing** |
| `AssessController` L114 sharpening | medicine | **max(nursing, medicine)** |
| `AssessController` L252 interior naming | medicine | medicine |
| `OperateController` | medicine competent+ | medicine (unchanged) |
| `SetController` (`splint`) | medicine | band **max**, deed **nursing** |
| `AnalyzePatientController` | medicine | medicine |
| `nurses.ts` brain | medicine | **nursing** (and moves to the nurse NPC — W6) |
| `OrderController.treatWorst` | (check) | nursing |
| new `bleed` / `transfuse` / `test` / `suture` / `administer` | — | nursing (gate: max for `transfuse`'s judgement line) |
| new `prescribe` / `operate` catalogue / `steep` | — | medicine |
| physician dossier | medicine proficient | unchanged; nurse Cast asserts `nursing: competent` |

Transcript rows already written under `medicine` by care acts are not
migrated (no migrations; the dev DB is dropped).

### D2 — Blood type: allele frequencies on `Species`, a seeded genotype on `VitalsMixin`

- `Species.bloodGroups: { alleles: Record<string, number> } | null`
  (persistent, `authorable: true`, `spoiler: 1, spoilerName: 0`; getter
  `getBloodGroups()`). Unauthored → the engine default **one allele
  `O` at frequency 1** — every member of an unauthored species is `O`
  and compatible within its species. That is data, not a guard: a wolf
  has blood and one type until an author says otherwise.
- `lib/vitals/BloodType.ts` — a value object (type-level statics only):
  `BloodType.phenotype(genotype: [a, b])` (ABO dominance: `A`/`B`
  codominant, `O` recessive → `A · B · AB · O`); `BloodType.roll(alleles,
  seed)` (two draws from the cumulative frequency table via
  `Seeded.unit`); `BloodType.compatible(donor, recipient)` (same
  `speciesPath` AND the ABO rule: O→any, A→A/AB, B→B/AB, AB→AB);
  `BloodType.mismatch(donor, recipient): 0 | 1 | 2` (ABO / species).
  `BLOOD_DEFAULTS` lives beside it in `lib/vitals/Blood.ts`.
- `VitalsMixin` gains **`bloodGenotype: string | null`** (persistent,
  `authorable: true` — an author pin `bloodGenotype: "AO"` for the NPC
  whose story turns on it; `null` = derive) and **`bloodTyped: boolean`**
  (persistent, `runtimeState: true` — somebody has tested it). Methods:
  `bloodGenotype()` (pin → else `BloodType.roll(species alleles,
  Seeded hash of getIdentityPath())` — **never `Math.random`**, so an
  unrolled body and a rolled one agree and nothing need persist for the
  ordinary case), `bloodType(): string | null` (null iff
  `!hasVitalSign('bloodVolume')`), `isBloodTyped()`, `markBloodTyped()`.
  Both fields join `forkSlice_Vitals` so a corpse carries its type.
- An `Extra` (shared identity) shares a type; recorded, acceptable.

### D3 — The reaction is a `decay`-law Condition seeded proportional to volume × mismatch; saline is the plasma ceiling

- `VitalsMixin.receiveBlood(spec: { litres, blood: {speciesPath, type} |
  null, expander?: true }) : { accepted: number, reaction: 0|1|2 }`:
  - **expander** (saline): `bloodVolume += litres`, capped at `baseline ×
    METABOLIC_DEFAULTS.PLASMA_RESTORE_CEILING_FRAC` — the same ceiling
    drinking obeys, read from Metabolic's constant (import the value; if
    an ESM cycle bites, move the constant to `lib/vitals/Blood.ts` and
    re-export it from `Metabolic.ts` — one source either way).
  - **compatible**: `bloodVolume += litres`, capped at baseline. This is
    how the last 15 % comes back; the ceiling is untouched.
  - **incompatible** (`mismatch > 0`, including an untyped unit whose
    true type mismatches): the plasma fraction only (`litres ×
    BLOOD_DEFAULTS.PLASMA_FRACTION` = 0.55, capped at the expander
    ceiling), and `afflict` the row
    `/platform/idea/Condition/circulation/transfusion-reaction` with
    `stage = ceil(litres × REACTION_STAGE_PER_L (6) × (mismatch === 2 ?
    SPECIES_MISMATCH_SCALE (2) : 1))`, adding to an existing record's
    stage.
- The row (platform pack, `Condition/circulation/transfusion-reaction.yaml`):
  `progression: {law: decay, decayPerSec: <stage 3 clears in ~6
  game-hours>}`; `signature: [{reserve: hydration, pctPerHour: -8},
  {reserve: endurance, pctPerHour: -15}, {vital: bloodVolume, perHour:
  -0.05}, {expression: 1}]`; `observableSigns: [feverish, shivering,
  faint, flushed]`; `resolution: {by: rest}`; `contagion: null`.
  Graded by construction: stage scales the signature; a severe reaction
  drains hydration into the shipped dehydration → dying cascade —
  **nothing new kills anyone**. ⚠ It must not author a `vital` effect on
  `coreTemperature` — thermal drives that sign (two writers on one
  vital is the defect `lint:condition-arms` exists for).

### D4 — The blood unit is a perishable Material in any bulk holder; no `FreshnessMixin` host widening

- **`/stuff/idea/material/tissue/blood`** (base-library) — `density
  1060`, `specificHeat 3600`, `spoilActivationEnergy` + `waterActivity
  0.99` tuned so the payload gauge reads `spoiled` after roughly **3
  game-days at 293 K** and roughly **3 game-weeks at 277 K** (a cold
  larder), computed in a unit test against the shipped `Freshness`
  arithmetic, not by eye; `edibility: false`; `tags: [tissue, blood,
  liquid, organic]`. The gauge rides `BulkPayload.freshness` through
  the holder's Thermal read — **zero spoilage code**.
- `lib/vitals/Blood.ts` declares **`BulkPayload.blood?: { speciesPath,
  type: string | null, donorIdentityPath }`** (the per-module pattern).
  `type: null` = the donor was untested when drawn — the unit is
  **unlabelled**. Blend rule on a transfer into a non-empty slot: equal
  → kept; anything else → `type: 'mixed'` (compatible with nobody).
  Find the per-module blend hook where `Freshness`/`Contaminable` fold
  on a pour (`grep -n freshness lib/bulk/Bulkable.ts api/bulk.ts`) and
  add blood's beside them.
- Vessels: **`/trade/medicine/thing/blood-bag`** (`/platform/thing/Receptacle`,
  `interiorBulk: true, interiorCapacity: 0.5`, empty) and
  **`/trade/medicine/thing/saline-bag`** (same, `interiorMaterial:
  /stuff/idea/material/bulk/salt-water, interiorAmount: 0.5`). Any
  empty bulk holder works for the autarkist — a bottle from the store.
- Transfusing a `spoiled`-or-worse unit is **refused with prose**
  (contamination is blood-slate's).

### D5 — The acts: `bleed` (not `draw`), `transfuse`, `test`; the syringe affords them

- ⚠ **`draw` is the banking verb.** The phlebotomy verb is **`bleed`**
  (alias `venesect`): `bleed [donor] into <vessel> [with <syringe>]`.
  Flagged for review; if a different word is wanted it is one YAML edit.
- Instrument **`Syringe`** (`trade-medicine/src/thing/Syringe.ts` =
  `AudibleMixin(ToolItem)`; row `/trade/medicine/thing/syringe`,
  `capabilities: [{kind: phlebotomy}]`;
  `commandContributions.environment: [bleed.yaml, transfuse.yaml,
  test.yaml]`).
- **`bleed`** (`BleedController`): donor (`requires: VitalsMixin`,
  default self) must have blood, be `conscious` (a body that cannot
  consent is not bled — blood-slate's consent rule, applied to the
  donor only), sit at or above `DONOR_MIN_FRAC (0.9)` of baseline, and
  hold `marrow ≥ DONATION_MIN_MARROW (40)`; vessel (`requires:
  [BulkableMixin]`, `prepositions: [into]`) must be empty or hold the
  same labelled type, capacity ≥ `UNIT_LITRES (0.45)`. Effect:
  `donor.drawBlood(litres)` (Vitals: subtracts volume, `adjustReserve
  ('marrow', −MARROW_COST_PCT_PER_L × litres)`, returns the payload
  stamped `{speciesPath, type: isBloodTyped() ? bloodType() : null,
  donorIdentityPath}`), the vessel filled with `blood` + payload. Credits
  `nursing standard`.
- **`transfuse <patient> from <vessel> [with <syringe>]`**
  (`TransfuseController`): reads the slot — `blood` → the payload;
  `salt-water` → expander; else refused. Spoiled → refused. **The
  judgement line:** a giver at `competent+` in `max(nursing, medicine)`
  who can SEE a mismatch (patient typed AND unit labelled AND
  incompatible) **refuses** — *"you know that will not match"*; below
  competent, or with either side unknown, it proceeds (with a warning
  when unknown). Then `patient.receiveBlood(...)`, spend up to
  `UNIT_LITRES`, narrate by outcome, credit `nursing standard`.
  Competence buys judgement, never a better transfusion.
- **`test [patient] [with <syringe>]`** (`TestController`): a body with
  blood; `markBloodTyped()`; reports the type; credits `nursing easy`.
  Works on self (the autarkist).

### D6 — The foreign-body wound is a tenth `TraumaType`; producers opt in with `embeds`

- `TraumaType` += `'foreign-body'`; `Trauma.foreignBody?: string` (the
  thing embedded, as prose: *"a poisoned needle"*, *"an arrowhead"*).
- `FOREIGN_BODY_BEHAVIOR` (Condition.ts, beside `RUPTURE_BEHAVIOR`):
  `onset` sets `bleeding` (and `embedded` is `foreignBody !== undefined`);
  `tick` bleeds at `FOREIGN_BODY_BLEED_SCALE (0.35)` of the laceration
  rate while embedded (the object tamponades); `mend` is a no-op while
  embedded; `resolve` (extraction) clears `foreignBody`, sets
  `dressed`, arrests the bleed; thereafter it mends at the dressed rate
  × `careScale`; `reopen` noop while embedded; `describe`: *"a puncture
  of <site> with <foreignBody> still in it"*; `resolution: 'extraction'`;
  `signature` function loss `1.5 × puncture`. It joins **`BLEED_FAMILY`**
  so the shipped open-wound sepsis clock (`openSince` →
  `SEPSIS_OPEN_ONSET_SEC`) is the deadline. `mismatchLine` gains
  `extraction: 'extraction — the thing has to come out'`.
- Producer seam: `EnergyInflictSpec.embeds?: string`.
  `ConditionLogic.inflict` (`platform/idea/api/ConditionLogic.ts`):
  when the fold resolves `puncture` at severity ≥ `EMBED_MIN_SEVERITY
  (0.4)` and `spec.embeds` is set, the trauma is minted `foreign-body`
  with `foreignBody = spec.embeds`. Callers: `ShootController` passes
  `embeds: <ammo presentation>` when `shot.profile.integrity !==
  'shatter'`; `HazardDeliveryOptions.embeds?: string` → the
  `step-dart` row authors `delivery.embeds: "a poisoned needle"`. Thrown
  blades and melee do not embed in v1.
- `assess` names it (present state); `treat` refuses via the mismatch.

### D7 — `operate` becomes a durative engagement over a kernel `Operation` catalogue; five trade rows

- **`platform/idea/Operation.ts`** — a pure-data leaf `Idea` (the
  `Discipline` shape): `key · label · addresses {traumaType,
  minSeverity?, interior?, flag?: 'foreign-body' | 'unsalvageable'} ·
  instrument (a capability kind) · competence {discipline, band} ·
  bloodCostL · baseDurationS · anaesthesia: required | advised | none ·
  resolution: surgery | extraction | setting | severance · difficulty`.
  **`platform/idea/OperationCatalogue.ts`** (the `DisciplineCatalogue`
  recipe: `PostRegistrationMixin(Idea)`, warms by
  `Template.findByClass`, `canEvict` veto, `TemplatePaths.operationCatalogue`,
  platform row + a `pack.yaml` boot entry `role: sync-read`).
- **Rows** in `trade-medicine/content/trade/medicine/idea/Operation/`:

| key | addresses | resolution | blood L | base s | anaesthesia | band |
|---|---|---|---|---|---|---|
| `bleed-control` | laceration/avulsion/puncture, exterior, still bleeding, severity ≥ 2.5 | surgery (→ `resolve` as a dressing of efficacy ≥ 0.9) | 0.10 | 90 | advised | competent |
| `extraction` | `foreign-body` | extraction | 0.15 | 180 | advised | competent |
| `rupture-repair` | rupture | surgery | 0.30 | 300 | required | competent |
| `compound-fracture` | fracture ≥ `COMPOUND_FRACTURE_SEVERITY (1.5)` | setting | 0.20 | 240 | required | competent |
| `amputation` | a `severable` part reading `isPartUnsalvageable` | severance (`severPart` + relieve the subtree's wounds) | 0.50 | 360 | required | proficient |

  `splint` refuses a fracture at/above the compound threshold with
  *"It wants surgery."* (the mismatch word). **`Vitals.isPartUnsalvageable
  (key)`** (a read): a severable part whose `functionAt` is `lost` with
  an active wound there, OR a wound-sepsis load ≥ 0.8 seated at that
  site.
- **`lib/vitals/OperationEngagement.ts`** — a `DurativeActivity` on the
  surgeon's `hands` + `attention` + `body` (`replaceableBy:
  [COMBAT_PARTICIPANT_TYPE]` so being attacked interrupts it), and a
  companion `OperationPatientHold` on the patient's `body` (`cancelable`
  iff the patient reads `conscious` — the thrash: a conscious patient
  can end it; an anaesthetised one cannot act). Declaration-merges
  `AbortReasonRegistry['operation-interrupted']`.
  - **duration** = `baseDurationS × (1 + 0.5·severity/3) /
    competenceScale(rank) / gradeConditionScale(kit) × (conscious ?
    CONSCIOUS_DURATION_SCALE 1.5 : 1) × (analgesia ? 0.8 : 1)`.
  - **start**: debit `bloodCostL × 0.5` from `bloodVolume` (the cut),
    stamp `_lastHarmedAt`. The patient's own bleed keeps draining by
    reconcile-on-read for the whole duration — that is the race.
  - **completion**: patient dead → nothing; else debit the rest and
    apply per `resolution`: `applyTreatment(wound, {by, efficacy,
    treater})` where `efficacy = (0.4 + 0.15·rank) ×
    gradeConditionScale(kit) × (conscious ? CONSCIOUS_EFFICACY_SCALE
    0.8 : 1)`; `severance` calls `severPart` then relieves the subtree's
    traumas. The post-op wound is `dressed` and mends at the treated
    rate — follow-up care (`tend`, a cot) advances it. The doctor writes
    the return date (D12): `patient.addCalendarEntry({label:
    'Follow-up: <op label>', whenGameS: now + predictedS, source:
    'medicine'})`.
  - **abort** (any reason): debit the rest, `severity +=
    OPERATION_ABORT_WORSEN (0.5)`, `openSince = now`, `careQuality`
    cleared — *left open, worse than before*.
- **`OperateController`** (trade-medicine, rewritten): `operate
  <patient> [for <operation>] [with <kit>]` — picks the named row or
  the most urgent applicable one; gates: patient `Postures.Lie`,
  surgeon `medicine ≥ row.band`, kit offers the row's capability
  (`surgery` for all five in v1), anaesthesia `required` and patient
  conscious → refused *"not without anaesthesia — they would not lie
  still"*; `advised` and conscious → proceeds with the penalties and a
  line saying so. Starts the engagement through the `engageStep`-shaped
  start/decline handling. Credits `medicine formidable` at completion.

### D8 — Suture is a treated-wound tier with a `sutured` flag; removal rides `undress`/`unstitch`

- `Trauma.sutured?: boolean`, `Trauma.sutureReadyAt?: number`.
- **`SutureKit`** (`trade-medicine/src/thing/SutureKit.ts`,
  `capabilities: [{kind: suture}]`, environment bucket affords
  `suture.yaml`); row `/trade/medicine/thing/suture-kit` (needle + linen
  thread; `_materialPath` steel; `Durable` uses wear per suture).
- **`suture <patient> [with <kit>]`** (`SutureController`): the worst
  exterior laceration/avulsion/puncture with severity ≥
  `SUTURE_MIN_SEVERITY (1.0)` (below it: *"a bandage will do"*);
  `foreign-body` refused (*"the thing has to come out first"*); giver
  band `max(nursing, medicine) ≥ novice` (untrained refused). Effect:
  `applyTreatment(wound, {by: 'dressing', efficacy, treater})` then
  `wound.sutured = true`. `LACERATION_BEHAVIOR.mend` reads `t.sutured`
  → `SUTURED_HEAL_PER_SEC (0.03)` instead of `DRESSED_HEAL_PER_SEC
  (0.02)`. Credits `nursing standard`.
- **Ready** when `severity ≤ CLOT_SEVERITY`: `tick` stamps
  `sutureReadyAt` once and sets `openSince = sutureReadyAt` so the
  shipped `SEPSIS_OPEN_ONSET_SEC` clock does the overstay — stitches
  left in past readiness inoculate the wound; no new arm.
- **Removal**: `undress.yaml` gains the alias **`unstitch`**;
  `reopen` on a sutured wound: severity > CLOT → clears `sutured`, re-arms
  the bleed (too early); ≤ CLOT → clears `sutured` + `dressed`, the
  wound heals to clear (*the wound completes*).
- **The calendar entry**: a treater at `competent+` (in either)
  writes `addCalendarEntry({label: 'Remove stitches', whenGameS: now +
  (severity − CLOT) / (SUTURED_HEAL_PER_SEC × careScale × 1.0),
  source: 'medicine'})` — a prognosis, deliberately at a bed's rate; the
  wound may be ready earlier or later. A `novice` writes nothing.

### D9 — A prescription is a slip of paper; `dose` gains an `active` branch gated on it

- **`lib/vitals/Prescription.ts`** — `PrescriptionMixin` (fields
  `patientIdentityPath · active · dosesLeft · prescriberIdentityPath ·
  writtenAtS`, all persistent; `isFor(patient, active)`, `spendDose()`);
  `Mixins.Prescription`, `MixinApi.isPrescription`. Concrete
  **`platform/thing/Prescription.ts`** = `PrescriptionMixin(Thing)`
  (a slip is a slip). Row `/trade/medicine/thing/prescription`
  (`_materialPath` linen — no paper material exists; leave a note).
- **`PrescriptionPad`** instrument (trade-medicine ToolItem,
  `capabilities: [{kind: prescribing}]`, environment bucket affords
  `prescribe.yaml`). **`prescribe <patient> <active> [<doses>]`**
  (`PrescribeController`): gate `medicine ≥ competent`; `active` is a
  string that must resolve to a warmed Condition at
  `/platform/idea/Condition/metabolism/<active>` carrying a
  `toxinBehavior` (else *"no such remedy"*); clones the slip, stamps the
  fields, moves it into the doctor's hand; credits `medicine easy`.
- **`DoseController`** (kernel) grows a second branch beside
  `antidote:`: a slot whose Material carries `tags: [active]` and
  `toxicity: [{type, amount}]` administers `body.introduceToxin(type,
  amount)` per dose (`toxicity.amount` IS the per-dose amount for a
  remedy). **Gate:** if the active's Condition row declares
  **`prescriptionOnly: true`** (new `Condition` field, persistent +
  authorable), the giver must be `medicine ≥ competent` OR a reachable
  `Prescription` `isFor(patient identity, type)` with doses left is
  spent. **A refused administer names why** (*"that prescription is not
  for them"* / *"no prescription — and you are not licensed for this"*) —
  the 5-rights error is legible, not a silent no-op (D14). `dose.yaml`
  gains the alias **`administer`**; credits `nursing easy`. Antidotes stay
  ungated (emergency).
- Prescription-only in v1: **anaesthesia and antibiosis**. Analgesia
  (willow tea) is folk medicine anyone brews; saline is transfused, not
  dosed. Flagged for review.

### D10 — Two new effect kinds, three actives, two invented species, one prep verb

- **`VitalEffect` gains `sedation` and `analgesia` (read kinds) and
  `clearance` (a rate modifier):**
  - `{kind: 'sedation', atStage}` — `getConsciousness()` returns
    `unconscious` while an active affliction declares it at/above its
    stage (read after the dying check, before the blood read).
  - `{kind: 'analgesia', relief: 0..1}` — read by `OperationEngagement`
    (the conscious penalties scale by `1 − relief`) and by `look`/
    `assess` (*"the pain is dulled"*).
  - `{kind: 'clearance', factor}` — `progressInfection` multiplies the
    body's clearance by Π factors over active afflictions declaring it
    (the infection arm's second modifier beside D12 resistance; not an
    arm).
  `check-conditions.ts` `EFFECT_KINDS` grows by three.
- **Condition rows** (platform pack, `Condition/metabolism/`):
  `anaesthesia.yaml` (toxinType `anaesthesia`, bands drowsy →
  unconscious, `signature: [{sedation, atStage: 2}, {expression, bands:
  2}]`, clearance so one dose holds ~1 game-hour, `prescriptionOnly:
  true`, signs `[drowsy, slack, unrousable]`), `analgesia.yaml`
  (`{analgesia, relief: 0.6}`, signs `[easy, dull-eyed]`),
  `antibiosis.yaml` (`{clearance, factor: 4}`, `prescriptionOnly: true`,
  signs `[]` → give it `[bitter-breathed]` since `lint:conditions` may
  require signs). All `progression: {law: burden}`, `resolution: {by:
  time}` — the alcohol shape.
- **Materials** (`/trade/medicine/idea/material/`): `greywort-root`,
  `grey-draught` (`edibility: true, toxicity: [{type: anaesthesia,
  amount: <one dose>}], tags: [active, remedy, liquid]`),
  `wardmoss`, `ward-water` (antibiosis), `willow-bark`, `willow-tea`
  (analgesia). Each raw simple tabulates a modest Ea (herbs go stale).
- **Species** (trade-medicine ships commons rows, the forestry precedent):
  *Somnaria pallida* **greywort** — a pale, hooded marsh herb whose
  steeped root numbs (Saxonberg-native; the fiction is ours);
  *Bryum custodis* **wardmoss** — a moss on the north face of old stone,
  steeped it keeps a wound from turning. Both `plantae`, `sessile`,
  `diet: photosynthesis`. Willow uses the shipped `salix/alba`.
- **Plants** (`/trade/medicine/thing/plant/{greywort,wardmoss,physic-willow}`,
  `class: /platform/thing/Plant`, the hazel-stool shape): by-hand
  harvest (`harvestTool: ''`), `harvestTemplatePath` → the simple,
  authored ready-to-harvest, `fruitFillDays` short (a fortnight) so the
  garden regrows within a drive's patience.
- **`Simple`** (`trade-medicine/src/thing/Simple.ts` extends
  `Provision` — a medicinal herb rots, honestly) with
  `steepsInto: string` (persistent, authorable — the draught Material)
  and `commandContributions.environment: ['trade/medicine/cmd/crafting/steep.yaml']`.
  **`steep <simple> in <vessel>`** (`SteepController`, an engaged
  `hands` step of 60 game-seconds): the vessel must hold ≥ 0.2 L of
  `water`; consumes the simple; sets the slot's Material to
  `steepsInto` at the same volume (payload cleared); credits `medicine
  easy`. One verb, zero cooking dependency; pharma's extraction-as-a-
  process replaces it later.

### D11 — The donation reserve is a tenth biological reserve, `marrow`; the 0.85 ceiling stands

- `BIOLOGICAL_RESERVE_KEYS` += `'marrow'` (`%`, seeded 100,
  `floorEffect: null` — a wan body is not a sick one). `drawBlood`
  costs `MARROW_COST_PCT_PER_L (60)` per litre (a 0.45 L unit = 27 %).
  Regen in `Metabolic`'s slice at `MARROW_REGEN_PCT_PER_HOUR` when
  `protein` and `satiation` are above their comfortable thresholds
  (the `lean` relaxation shape) — tuned so a unit's cost comes back in
  **~2 game-weeks** (28 real hours): tight, not free. `bleed` refuses
  below `DONATION_MIN_MARROW (40)`.
- Reads: the mirror (`look`'s body line) and `assess` say *"pale — not
  long since they gave blood"* under 70 %. Never a number.
- The ceiling: rest restores volume to 0.85 by hydration exactly as
  shipped; only `receiveBlood` (compatible) closes the gap. Own blood is
  always compatible (same identity → same seeded genotype).

### D12 — The calendar is a mixin on `Avatar` plus a hosted app on the implant; no `CalendarApi`

- **`lib/calendar/Calendar.ts`** — `CalendarMixin` (`Mixins.Calendar`,
  `MixinApi.isCalendarKeeping`), composed on **`Avatar`** (inside
  `PersistableMixin`). Field `calendarEntries: CalendarEntryStored[]`
  (persistent, `runtimeState: true`; `{id, whenGameS, label, source,
  addedAtS, firedAtS?}`). Methods: **`addCalendarEntry({label,
  whenGameS, source})`** — the author seam, `@Final @Unshadowable`,
  **ungated** (the `creditDeed` precedent: the writer set is every
  acting controller; write-authorisation is the calendar slate's open
  question); `getCalendarEntries()`, `removeCalendarEntry(id)`,
  `dueCalendarEntries(nowS)`.
- **The ping**: `rescheduleCalendarPing()` cancels the previous handle
  and books `WorldClockApi.at(nextDue, cb, {host: this})`; re-armed in
  `postRegister` after `materialize` and after every add; the callback
  pushes *"Your calendar: <label>."* to self and stamps `firedAtS`. An
  entry that came due while offline pings once at the next re-arm
  (deferred-not-skipped). Correctness never depends on it firing —
  `calendar` lists overdue entries regardless.
- **The surface**: **`CalendarUpdate`** hosted app
  (`lib/calendar/CalendarApp.ts` `CalendarAppMixin` +
  `platform/idea/CalendarUpdate.ts` = `CalendarAppMixin(AetherHostedMixin(Idea))`,
  `TemplatePaths.calendarUpdate`, row `platform/idea/CalendarUpdate.yaml`,
  cloned in `installDefaultLoadout` beside forums/wallet);
  `commandContributions.self: ['platform/cmd/social/calendar.yaml']`.
  **`calendar`** (`platform/idea/cmd/social/CalendarController.ts`):
  lists overdue + upcoming entries with `DefaultCalendar.formatDate`.
  The app reads its host's entries (`getOperator()` → `isCalendarKeeping`).
- ⚠ **No `CalendarApi` / `CalendarLogic`.** The task suggested the
  Api↔logic pair; it is deliberately not built: `CalendarApi.add(player,
  …)` is exactly the `XApi.verb(host, …)` shape `lint:object-verbs`
  holds at zero, an entry write belongs to one object, and there is
  nothing to orchestrate across objects. The mixin method is the seam
  every future writer (contract, employment, banking) calls. **Flagged
  for review.**
- NPC patients compose no calendar; the seam is narrowed by
  `isCalendarKeeping` and no-ops for them (a nurse's own follow-up on
  an NPC is the brain's business).

### D13 — Staging

Stage A (kernel + platform pack): W0 Discipline split · W1 blood (type,
reserve, receive/draw, reaction, material, payload) · W2 foreign body ·
W3 operations + suture + prescription + drug substrate · W4 calendar.
Stage B (packs): W5 the acts and instruments · W6 the drugs, species,
garden, the nurse, the brains · W7 the drive + docs. Each wave lands at
one commit and is independently landable (W1–W4 ship substrate proven by
unit tests; W5+ ship the verbs that reach it).

### D14 — Pedagogy: the acts enact the NGN clinical-judgment cycle

The build's pedagogical unit is the **NCLEX clinical-judgment cycle**
(`docs/study-com/integration-examples.md`): *recognize cues (`assess`) →
analyze → prioritize → act & re-prioritize → evaluate (`assess` again)* —
study.com's clinical-nursing (NGN) promise, and the study.com federation's
transferable-competence promise (`creditDeed`→Transcript, per
`transfer-network.md`). Three constraints the code must honour:
- **Teach the decision, never the motor.** Phlebotomy hands and the
  surgeon's cut are Row C (sensorimotor) — not simulated; the acts model
  the *judgment* (which wound first, is this blood compatible, is the
  field clean, when to call the doctor). The engaged-step duration is the
  *time it takes*, not a dexterity test — **no QTE** (uncertainty
  doctrine), consistent with D7.
- **Fictional drugs are correct, not a shortcut.** Real pharmacology is
  referent content study.com owns; the invented actives teach the pattern
  (right remedy, the 5 rights, prescribe→administer). Blood keeps the
  recognizable **ABO pattern** (a transferable judgment), not a claim to
  teach hematology.
- **Errors are legible.** A wrong-patient `administer`, a mismatch a
  competent giver can see, an unskilled attempt — each is refused with a
  **named reason**, never a silent no-op. The refusal IS the lesson (the
  mirror shows you). This is a cross-cutting requirement on every new
  controller's refusal prose, not a wave.
The **SBAR handoff** and the shift-long deteriorating-patient scenario
(NGN Q5) are the scenario layer's (Deferred seams); this build leaves the
seam (the two-role scene + the doctor acting on the nurse's report) and
proves the *cycle* in the drive (checkpoint 12).

---

## Host placement

For every new field, mixin and class: the host, and what composing it
claims about everything already on that host.

| what | host | the claim, and why it holds |
|---|---|---|
| `bloodGroups` | `Species` (kernel Idea) | every species may declare its allele table; unauthored = one group. A plant species carrying a null table is honest (the field is data, not a promise). |
| `bloodGenotype`, `bloodTyped`, `bloodGenotype()`, `bloodType()`, `drawBlood()`, `receiveBlood()`, `isPartUnsalvageable()` | **`VitalsMixin`** (`lib/vitals/Vitals.ts`) — composed on `Creature` only | *a body with blood has a blood type* is true of exactly the host set that carries `bloodVolume`; a bloodless clade answers `null` through the existing `hasVitalSign` **data** gate, not a new guard. Not `OrganismMixin` (composed on plants: a peace lily with a genotype is the `Freshness`-on-`Thing` shape). |
| `marrow` reserve | `BIOLOGICAL_RESERVE_KEYS` → every `Creature` | the same set as `flesh`/`lean`; a body that never bleeds still has a reserve at 100 and nothing reads it. |
| `foreign-body` `TraumaType`, `Trauma.foreignBody / sutured / sutureReadyAt` | the closed engine table in `Condition.ts` | every body can carry every trauma; the vocabulary is closed on purpose (harm.md). |
| `EnergyInflictSpec.embeds` | `api/condition.ts` | optional on the spec; every producer that omits it is byte-identical. |
| `sedation` / `analgesia` / `clearance` effect kinds | `VitalEffect` union + `Vitals.getConsciousness` / `OperationEngagement` / `progressInfection` readers | read kinds like `function`/`expression`; a row that does not author them is untouched. |
| `Condition.prescriptionOnly` | `Condition` Idea | authorable on every row, default `false`; only `dose`'s active branch reads it. |
| `Operation` (Idea) + `OperationCatalogue` | kernel `platform/idea/` — instanceable data leaf + singleton, the `Discipline` twin | rows are content (trade-medicine); the catalogue warms by class so a second trade's row is found. Biology (what the op *does*) is `applyTreatment`/`severPart`, kernel. |
| `OperationEngagement`, `OperationPatientHold` | `lib/vitals/` (substrate, never instanced from a row) | the `TendingEngagement` neighbour; claims nothing about any class. |
| `PrescriptionMixin` | `lib/vitals/Prescription.ts`; composed on **`platform/thing/Prescription`** only | a slip is a slip. Not on `Thing` (every rock would be prescribable), not a body field (a prescription is a thing you hold and can lose). |
| `CalendarMixin` | **`Avatar`** | *a played person keeps a calendar* — every Avatar, no NPC. Composing on `Character` would claim every Cast/Extra keeps one (a shopkeeper with a diary nobody reads — the wrong host). If NPC calendars are wanted later, that is a second composer and a real decision. |
| `CalendarAppMixin` → `CalendarUpdate` | the hosted-app trio's host (`AetherHostedMixin(Idea)`) | session-scoped, re-provisioned at login exactly as comms/forums/wallet; the implant is the manifestation, the Avatar holds the state. |
| `Syringe`, `SutureKit`, `PrescriptionPad` | `trade-medicine/src/thing/` = `AudibleMixin(ToolItem)` | the `SurgicalKit` shape; the instrument affords the verb outward (`environment`), never sideways. |
| `Simple` | `trade-medicine/src/thing/Simple.ts` extends `Provision` | a herb IS food-shaped matter (it rots, it can be contaminated); `steepsInto` + the `steep` affordance are true of every simple. Not a Material tag on a `Provision` (a class static is what affords a verb; a row's `commandContributions:` is dead). |
| `Simple` materials, `blood` material | `/trade/medicine/idea/material/` (the antivenin precedent); **blood at `/stuff/idea/material/tissue/blood`** in base-library | blood is biology and belongs in the commons beside flesh; the draughts are the trade's. |
| the two species | commons rows shipped by trade-medicine (`content/stuff/idea/species/plantae/…`) | the forestry precedent (`salix` shipped by trade-forestry). |
| `nursing` / `health` / re-anchored `medicine` rows | platform pack `Discipline/` | skills are platform content (requirements § Placement). |
| Condition rows (`transfusion-reaction`, `anaesthesia`, `analgesia`, `antibiosis`) | platform pack `Condition/circulation/` and `Condition/metabolism/` | `ConditionCatalogue.warm` and `resolveToxinBehavior` both key on the platform prefix; a pack cannot ship a condition today. |

**The narrowing test, applied.** No guard re-narrows a host anywhere in
this plan: the bloodless case is `hasVitalSign`, the no-calendar case is
`isCalendarKeeping` (a different composer, not a flag), the
unauthored-species case is a default table. If the build finds itself
writing `if (isAvatar) …` inside `VitalsMixin` or `if (hasBlood)` inside
`CalendarMixin`, stop and re-read this table. ⚠ **And no medical act may
gate on "the patient is a person"** — every act narrows on `VitalsMixin`
(a `Creature`, animal or human), never on `Avatar`/`Cast`. This is what
keeps the substrate species-agnostic so **veterinary medicine** attaches
later as a Discipline branch with no rewrite (Deferred seams); an
`if (isPerson)` in a treatment path is the same failure this test names.

---

## Convention conformance

Checked against the current tree, not recalled.

- **`props:` / `cast:`** — the ward uses both; the garden and the nurse
  follow (`populates:` is retired; none in the touched rows).
- **Locations, not rooms** — the physic garden is a
  `/platform/location/SingletonCartesianLocation` like the ward; no
  `FurnishableRoom` (nobody furnishes it).
- **The path pattern** — kernel classes at `platform/<branch>/` (`Operation`,
  `OperationCatalogue`, `Prescription`, `CalendarUpdate`), substrate at
  `lib/<subsystem>/` (`lib/vitals/{Blood,BloodType,OperationEngagement,
  Prescription}.ts`, `lib/calendar/{Calendar,CalendarApp}.ts` — a new
  subsystem folder, named for the slate it serves); pack classes under
  `trade-medicine/src/{thing,idea/cmd/<cat>,behavior}/`; rows under
  `/trade/medicine/<branch>/…`, commons rows under `/stuff/…`, platform
  rows under `/platform/…`. Controllers at `<root>/idea/cmd/<category>/`,
  views at `<root>/cmd/<category>/`.
- **Module scope declares; lifecycles initialize** — the catalogue warms
  in `postRegister`; the calendar ping re-arms in `postRegister`; the
  `AbortReasonRegistry` merge is a declaration.
- **The import boundary** — nothing new imports outside `src/mud/`; the
  pack imports the kernel by package specifier only
  (`@saxonberg/server/mud/…`); the wire test lives in `packages/wire`.
- **No new module category, no free helper** — everything is a class,
  a mixin, a value object, a controller, a brain or a row. **No new
  Api** (D12's reasoning); the `Blood` value object's statics are
  type-level (`lint:lib-statics`).
- **Verbs on objects** — `drawBlood`, `receiveBlood`, `bloodType`,
  `addCalendarEntry`, `isPartUnsalvageable`, `markBloodTyped` are
  instance methods; the controllers narrow with `MixinApi.isX` and call
  them. The `object-verbs` census stays at zero.
- **A bound arg is `MqlOneResult`, never `Stuff`** — every new controller
  reads `model.<arg>?.stuff` (the `OperateController` shape).
- **`requires:` on every new object arg names a mixin the real targets
  compose** — `VitalsMixin` for bodies, `[BulkableMixin]` for vessels,
  `[ToolMixin]` for instruments with a `me:i:[capability.X]` default.
  The simple arg on `steep` is the one exception: `requires: any`, with
  the controller narrowing on `Simple`'s `steepsInto` (state the binder
  cannot ask — the `treat with` precedent). Never `A|B`.
- **Instruments are declared arguments** (`lint:instrument-args`) —
  every instrument arg carries an MQL default.
- **`Mixins` constants** — kernel mixins register there (`Calendar`,
  `CalendarApp`, `Prescription`); pack classes register none.
- **Every controller returns `void` and notes refusals**
  (`controller-rejected` + a self scene).
- **Money is untouched.**

---

## Waves

Every wave ends at one commit `build(clinical-medicine W<n>): …`. Before
each: `pnpm test:near` + every touched pack's `pnpm test` +
`pnpm -C packages/server lint:family`. `pnpm test` runs once, before the
MR (W7), and again at `/finalize`.

### Stage A — kernel + platform pack

#### W0 — the two professions (D1)

- Platform pack: edit `Discipline/medicine.yaml` (0912, doctor
  description, `specializes: [health]`); add `Discipline/nursing.yaml`
  (0913, the shipped description, `specializes: [health]`); add
  `Discipline/health.yaml` (09, knowledge). Both new rows: `class:
  /platform/idea/Discipline`, `hydratorClass: …/PersistentHydrator`.
- Re-point every site in the D1 table (kernel + trade-medicine). Add the
  one helper the "better band" reads want **as a method on
  `AdvancementMixin`** — `bestBandFor(keys: string[])` — only if two or
  more sites need it; otherwise two awaits and `CompetenceBand.rank`.
- Tests: `TendController`/`TreatController`/`AssessController` unit
  tests that name `'medicine'` for a care act flip to `'nursing'`;
  `trade-medicine/src/__tests__/nurses.test.ts` likewise.
- Docs touched now (index lines are swept later): none.
- Acceptance: `competence` after `treat` shows `nursing`; `operate`
  still gates on `medicine`; `lint:dossiers` green (the physician's
  claim is unchanged).

#### W1 — blood (D2, D3, D4, D11)

- `Species.bloodGroups` + getter + `authorable` fieldMeta; species rows:
  author alleles on the sixteen `homo/*` rows (frequencies vary by
  species, never by anything real-world; e.g. sapiens `{A: .3, B: .1,
  O: .6}`, khazadicus `{A: .05, B: .45, O: .5}`, eldarinus `{A: .5, B:
  .05, O: .45}` — pick so that the common pool is not one species).
- `lib/vitals/BloodType.ts` + `lib/vitals/Blood.ts` (`BLOOD_DEFAULTS`,
  the `BulkPayload.blood` declaration, the blend rule).
- `VitalsMixin`: the two fields, `bloodGenotype()` (seeded via
  `Seeded`), `bloodType()`, `isBloodTyped()`, `markBloodTyped()`,
  `drawBlood(litres)`, `receiveBlood(spec)`; both fields into
  `forkSlice_Vitals` and `adoptMaterialState`'s apply.
- `lib/reserve.ts`: `marrow`; `Metabolic`: marrow regen in the slice.
- Platform pack: `Condition/circulation/transfusion-reaction.yaml`;
  `lib/paths.ts` `TemplatePaths.circulationTransfusionReaction`.
- base-library: `material/tissue/blood.yaml`.
- Tests: `lib/vitals/__tests__/BloodType.test.ts` (dominance, the
  compatibility table, seeded determinism, the default-O species);
  `Vitals.blood.test.ts` (draw costs volume + marrow and refuses under
  the floor; receive compatible closes the gap to baseline; expander
  caps at the plasma ceiling — assert against
  `METABOLIC_DEFAULTS.PLASMA_RESTORE_CEILING_FRAC`; incompatible → the
  reaction at the right stage, decaying; species mismatch doubles it;
  corpse fork carries the type); `Freshness.blood.test.ts` (the shelf
  life at 293 K and 277 K computed, not eyeballed);
  `Bulkable.blood-blend.test.ts` (mixed types → `mixed`).
- Acceptance: unit-only (no verb reaches it yet). `lint:conditions`
  green on the new row; `lint:condition-arms` still 5.

#### W2 — the foreign body (D6)

- `Condition.ts`: `'foreign-body'` + `FOREIGN_BODY_BEHAVIOR` + roster +
  `BLEED_FAMILY` + `HARM_DEFAULTS.{FOREIGN_BODY_BLEED_SCALE,
  EMBED_MIN_SEVERITY, FUNCTION_LOSS_PER_SEVERITY['foreign-body']}`;
  `Trauma.foreignBody`.
- `api/condition.ts` `EnergyInflictSpec.embeds?`;
  `ConditionLogic.inflict` mints the type; `ShootController` passes
  `embeds`; `HazardDelivery` option + `toInflictSpec`; generic-objects
  `step-dart.yaml` `delivery.embeds`.
- `TreatController.mismatchLine` word; `AssessController` describes it.
- Tests: `Condition.foreign-body.test.ts` (bleeds slower, never mends
  while embedded, extraction resolves then mends, sepsis clock runs);
  `ConditionLogic.embed.test.ts` (a point puncture with `embeds` mints
  the type; without it, a puncture; under the severity floor, a
  puncture); `HazardDelivery` test for the option;
  `TreatController.test.ts` refusal line.
- Acceptance: the delve's step-dart leaves *"a puncture of body.leg.left.foot
  with a poisoned needle still in it"* on `assess`; `treat` says *"It
  wants extraction"*.

#### W3 — operations, sutures, prescriptions, the drug substrate (D7, D8, D9, D10 kernel half)

- `VitalEffect` +3 kinds; `check-conditions.ts` `EFFECT_KINDS`;
  `getConsciousness` sedation read; `progressInfection` clearance
  factor; `Condition.prescriptionOnly` field + getter.
- Platform pack rows: `Condition/metabolism/{anaesthesia,analgesia,antibiosis}.yaml`.
- `Trauma.sutured / sutureReadyAt`; `LACERATION_BEHAVIOR.mend/tick/reopen`
  sutured branches (puncture/avulsion delegate — they inherit);
  `HARM_DEFAULTS.{SUTURED_HEAL_PER_SEC, SUTURE_MIN_SEVERITY,
  COMPOUND_FRACTURE_SEVERITY, OPERATION_ABORT_WORSEN,
  CONSCIOUS_DURATION_SCALE, CONSCIOUS_EFFICACY_SCALE}`; `undress.yaml`
  alias `unstitch` + `UndressController` prose for stitches;
  `Vitals.isPartUnsalvageable`.
- `platform/idea/Operation.ts`, `platform/idea/OperationCatalogue.ts`,
  `TemplatePaths.operationCatalogue`, platform row
  `platform/idea/OperationCatalogue.yaml`, `packages/content/platform/pack.yaml`
  boot entry (`role: sync-read`).
- `lib/vitals/OperationEngagement.ts` (+ the patient hold, the abort
  reason merge).
- `lib/vitals/Prescription.ts`, `platform/thing/Prescription.ts`,
  `Mixins.Prescription`, `MixinApi.isPrescription`.
- `DoseController` active branch + prescription gate; `dose.yaml`
  alias `administer`; `Vitals.commandContributions.self` unchanged.
- Tests: `Vitals.sedation.test.ts` (an anaesthesia affliction at stage 2
  reads unconscious; stage 1 conscious); `Vitals.clearance.test.ts`
  (antibiosis quadruples clearance in the logistic arm);
  `Condition.suture.test.ts` (faster mend, readiness stamps
  `openSince`, early `reopen` bleeds, late reopen completes, overstay
  seeds sepsis via the shipped clock); `OperationCatalogue.test.ts`
  (warms a fixture row by class); `OperationEngagement.test.ts` (debits
  at start and end, resolves per resolution, abort worsens, conscious
  penalties, patient death → no treatment, combat hold replaces it);
  `DoseController.test.ts` (an `active` substance administers the
  burden; prescription-only refused without a slip, allowed with one,
  allowed for a competent doctor; the slip's doses fall).
- Acceptance: unit-only; `lint:condition-arms` still 5;
  `lint:instanceable` green (Operation/Prescription/Catalogue under
  `platform/`).

#### W4 — the calendar (D12)

- `lib/calendar/Calendar.ts`, `lib/calendar/CalendarApp.ts`,
  `platform/idea/CalendarUpdate.ts`, `Mixins.{Calendar, CalendarApp}`,
  `TemplatePaths.calendarUpdate`, platform rows
  `platform/idea/CalendarUpdate.yaml` and
  `platform/cmd/social/calendar.yaml`, `platform/idea/cmd/social/CalendarController.ts`,
  `Avatar` composes `CalendarMixin` + `installDefaultLoadout` hosts the
  app.
- Tests: `Calendar.test.ts` (add/list/due ordering; the ping fires at
  the game-time deadline under `WorldClockApi._advanceForTesting`;
  an overdue entry pings once on re-arm; the field round-trips through
  a snapshot capture/materialize); `CalendarController.test.ts`
  (renders the formatted date, never a raw second count).
- Acceptance: `calendar` on a fresh avatar answers *"Nothing on your
  calendar."*; a test-added entry lists and pings.

### Stage B — packs

#### W5 — the acts and the instruments (D5, D7 verb, D8 verb, D9 verb, D10 verb)

- trade-medicine `src/thing/{Syringe,SutureKit,PrescriptionPad,Simple}.ts`
  + rows `content/trade/medicine/thing/{syringe,suture-kit,
  prescription-pad,prescription,blood-bag,saline-bag}.yaml`.
- Views `content/trade/medicine/cmd/medical/{bleed,transfuse,test,
  suture,prescribe}.yaml`, `cmd/crafting/steep.yaml`; controllers
  `src/idea/cmd/medical/{Bleed,Transfuse,Test,Suture,Prescribe}Controller.ts`,
  `src/idea/cmd/crafting/SteepController.ts`; `OperateController`
  rewritten over the catalogue + engagement; `operate.yaml` gains the
  `for` arg (a string). Controller rows under
  `content/trade/medicine/idea/cmd/<cat>/<Name>Controller.yaml` (the
  shipped shape).
- Operation rows `content/trade/medicine/idea/Operation/{bleed-control,
  extraction,rupture-repair,compound-fracture,amputation}.yaml`.
- `SetController` refuses a compound fracture.
- Tests (pack `src/__tests__/`): one per controller through the real
  binder where a shipped test does so, else the controller-test shape
  with a built model; `instruments.test.ts` extended for the three new
  instruments' affordance buckets.
- Acceptance: with the instruments in hand, all six verbs light up in
  `help`/affordances; `bleed`/`transfuse` round-trip a unit; `operate
  … for extraction` runs durative and can be cancelled.

#### W6 — the supply chain and the clinic (D10 content, D1 positions, the brains)

- trade-medicine materials `content/trade/medicine/idea/material/{greywort-root,
  grey-draught,wardmoss,ward-water,willow-bark,willow-tea}.yaml`;
  species `content/stuff/idea/species/plantae/…/{greywort,wardmoss}`;
  plants `content/trade/medicine/thing/plant/{greywort,wardmoss,
  physic-willow}.yaml`; simples `content/trade/medicine/thing/{greywort-root,
  wardmoss,willow-bark}.yaml` (class `/trade/medicine/thing/Simple`).
- terminus: `infirmary/garden.yaml` (exit `north` from the ward, props
  the three plants + a water butt `/stuff/thing/fixture/basin` or a
  Receptacle of water); `ward.yaml` props the syringe, suture kit,
  prescription pad, two blood bags, a saline bag, a stoppered vial of
  grey-draught (the clinic's own stock), and adds `cast: [nurse]`;
  `infirmary/agent/nurse.yaml` (a `Cast`, `competence: [{nursing,
  competent}]`, `archetype: nurse` — check the archetype catalogue has
  one, else omit); `business.yaml` gains the `nurse` position and a `bloodBank`
  dimension expressed as **par lines** (`parLines: [{category: blood,
  level: 2, unit: L}]`) — the blood bank is what the house keeps on
  hand, not a new field. The nurse seat, in the merged employment shape:
  `{key: nurse, noun: nurse, label: …, wageRate: 4, requires: {discipline:
  nursing, band: competent}}` — a nurse must be competent in `nursing` to
  hold the seat. **No `confers`** (retired), and no `fulfills` (the medical
  acts gate on Discipline competence in their controllers, not on
  `order`-fulfillment). The physician seat is unchanged.
- Brains: `nurses.ts` → reads `nursing`, moves to the nurse row; new
  `src/behavior/physicks.ts` for Aldis: on cadence, if a lying patient
  in the room has an operable wound per the catalogue and the kit is
  reachable → `operate` (through `CommandApi.forceCommand` so nothing
  she does is unavailable to a player); else nothing (the nurse tends).
  Update `physician.yaml` behaviors.
- Store: the general store stocks `syringe`, `suture-kit`, `blood-bag`
  (autarky: buyable; a stock line resolving is four links — verify each).
- Tests: `nurses.test.ts` on the nurse; `physicks.test.ts`; a terminus
  `infirmary` standup test that props resolve (`lint:census` covers
  the rows).
- Acceptance: the garden is walkable from the ward; `harvest greywort`
  → a simple; `steep` → a draught; `look` at the ward shows the nurse
  on shift.

#### W7 — the drive, and the docs the code changed the truth of

- **`packages/wire/tests/clinical-medicine.dirty.wire.test.ts`**,
  `declareFile({file, packs: ['terminus', 'trade-medicine',
  'newbie-wilds', 'generic-objects', 'species-and-names',
  'trade-forestry', 'base-library'], dirtyReason: DIRTY_REASON})`
  (dirty: springs a delve trap, harvests the garden, spends the ward's
  stock). Three sessions: **doctor** (wizard, `practice medicine hard
  success` ×4 → competent; the only honest route to competence inside a
  test), **nurse** (wizard, `practice nursing hard success` ×4),
  **patient** (plain). Checkpoints, each able to FAIL:
  1. `test` → the type is named and `assess` shows it (was `untested`).
  2. `bleed me into bag` → `bloodVolume` down (assess reads the band),
     the bag holds blood; `assess` says pale.
  3. (unit-proven shelf life; the wire asserts the bag's `look` line
     reads fresh now and — after `WorldClockApi` cannot be advanced over
     the wire — the refusal prose exists by transfusing a **pre-spoiled
     bag** the ward props for the drive; if that prop is refused as
     content-for-a-test, assert step 3 in the unit suite and say so in
     the record).
  4. walk `corridor-1` → the dart springs; `assess` names a foreign
     body in a foot; `treat` refuses with *extraction*.
  5. `transfuse patient from bag` (own type) → volume up; `transfuse …
     from saline-bag` → up but capped.
  6. `transfuse patient from <a bag drawn from the other species
     session>` → *reaction* on `assess`.
  7. (= 4) the foreign body.
  8. doctor `prescribe patient anaesthesia`, nurse `administer patient
     with vial`, patient reads unconscious (`say` refused), doctor
     `operate patient for extraction` → the started note; `cancel`
     once → the wound reads worse; `operate` again → runs to completion
     (poll `assess` until *extracted*).
  9. `suture patient` → *sutured*; `calendar` on the patient lists
     *Remove stitches* with a date; `assess` carries no date; (the ping
     cannot be waited for over the wire — assert the entry exists and
     the unit test proved the ping); `unstitch` too early → bleeds;
     later → completes. A `novice` suture (a fourth session with one
     `practice nursing easy`) writes no entry.
  10. nurse `operate` → refused naming `medicine`; nurse `prescribe` →
      refused; doctor both allowed.
  11. autarky: the doctor session alone does 1, 2, 4, 5, 8 (self-draw,
      self-test, self-prescribe, self-administer, self-operate — the
      operation on oneself is allowed by the catalogue for extraction
      only; rupture-repair on yourself is refused: you cannot operate
      inside your own abdomen), harvest + steep the draught, and
      transfuses their own unit back.
- The drive record appended to this plan (output, count, findings).
- Docs: new `docs/subsystems/blood.md` (type, draw, store, transfuse,
  the reaction, the reserve), new `docs/subsystems/calendar.md`;
  `harm.md` § surgery (the catalogue, the engagement, sutures, the
  foreign body), § the medic vertical (the split); `advancement.md`
  (nursing/health); `employment.md` (the nurse); `spoilage.md` (blood
  as a bulk perishable — one paragraph); `metabolism.md` (`active`
  substances, the prescription gate); `comms.md`/`augmentation.md` (the
  fourth hosted app). Index lines in `CLAUDE.md` are the sweep's.

---

## Reachability wiring

Each capability, the five links — every one fails closed and silent.

| capability | verb (view · controller) | affordance (a static on a CLASS) | data (rows) | boot | arg gate (`requires:` the targets compose) |
|---|---|---|---|---|---|
| **test** | `trade/medicine/cmd/medical/test.yaml` · `TestController` | `Syringe.commandContributions.environment` | `thing/syringe.yaml` propped in the ward + stocked at the store | — | patient `VitalsMixin`; syringe `[ToolMixin]` default `me:i:[capability.phlebotomy]` |
| **bleed** | `…/bleed.yaml` · `BleedController` | `Syringe` environment | syringe, `blood-bag`, `material/tissue/blood` (base-library) | — | donor `VitalsMixin`; vessel `[BulkableMixin]` `into`; syringe as above |
| **transfuse** | `…/transfuse.yaml` · `TransfuseController` | `Syringe` environment | `saline-bag`, `Condition/circulation/transfusion-reaction` | the reaction row is warmed by `ConditionCatalogue` (platform prefix) | patient `VitalsMixin`; vessel `[BulkableMixin]` `from` |
| **foreign body** | (none — a consequence) | — | `step-dart.yaml` `embeds`; the delve corridors already `props:` it | — | — |
| **operate** | `…/operate.yaml` (+`for`) · `OperateController` | `SurgicalKit` environment (unchanged) | five `idea/Operation/*.yaml`; `platform/idea/OperationCatalogue.yaml` | **`pack.yaml` boot entry** for the catalogue (`sync-read`) — a catalogue nothing boots reads empty forever | patient `VitalsMixin`; kit `[ToolMixin]` `[capability.surgery]` |
| **suture** | `…/suture.yaml` · `SutureController` | `SutureKit` environment | `suture-kit.yaml` propped + stocked | — | patient `VitalsMixin`; kit `[ToolMixin]` `[capability.suture]` |
| **unstitch** | `platform/cmd/medical/undress.yaml` alias · `UndressController` | `VitalsMixin.self` (shipped) | — | — | shipped |
| **prescribe** | `…/prescribe.yaml` · `PrescribeController` | `PrescriptionPad` environment | `prescription-pad.yaml`, `prescription.yaml`; the three actives' Condition rows | rows warmed by `ConditionCatalogue` | patient `VitalsMixin`; active a string; doses a number |
| **administer** | `platform/cmd/medical/dose.yaml` alias · `DoseController` | `VitalsMixin.self` (shipped) | vials of draught (`Receptacle` rows with `interiorMaterial`) | — | shipped (`[BulkableMixin]` default) |
| **steep** | `trade/medicine/cmd/crafting/steep.yaml` · `SteepController` | `Simple.commandContributions.environment` | simples, plants, the garden, the draught materials | — | simple `requires: any` (controller narrows on `steepsInto`); vessel `[BulkableMixin]` `in` |
| **calendar** | `platform/cmd/social/calendar.yaml` · `CalendarController` | `CalendarAppMixin.commandContributions.self` (hosted-update self-seeding) | `platform/idea/CalendarUpdate.yaml` | `installDefaultLoadout` clones the app; `TemplatePaths.calendarUpdate` | — |
| **the nurse** | — | — | `agent/nurse.yaml`, `business.yaml` position + roster, `ward.yaml` `cast:` | the roster tick materializes the Employment | — |
| **nursing / health Disciplines** | — | — | the two rows | `DisciplineCatalogue` warms by class | `lint:dossiers` folds the nurse's claim |
| **marrow** | — | — | — | `installBiologicalReserves` on `Creature` construct | — |

⚠ Two links this repo has lost before, restated: a `props:` entry is
checked by `lint:census`, but a **stock line** is not — verify the store
lists and prices the three instruments by buying one in the drive; and a
**hosted app is re-cloned every login**, so a `TEMPLATE_PATH` naming a
row the platform pack does not ship fails only at the second login.

---

## Acceptance-criteria coverage

| requirement acceptance | waves | proof |
|---|---|---|
| `test` learns a heritable type | W1, W5 | drive 1; `BloodType.test` |
| `bleed` drops volume, recovers over time, a unit spoils | W1, W5 | drive 2; `Vitals.blood.test` (the 0.85 rest ceiling), `Freshness.blood.test` (shelf life), drive 3 |
| matched raises; saline partial; incompatible harms | W1, W5 | drive 5, 6 |
| the solo autarky loop | W5, W6 | drive 11 |
| `operate` durative, blood-costing, interruptible, worse conscious; five ops; foreign body only by extraction | W2, W3, W5 | drive 8; `OperationEngagement.test`, `Condition.foreign-body.test` |
| `suture` closes; competent care writes the calendar; `calendar` on demand; `assess` never a date; unskilled writes nothing; ping; removal; neglect | W3, W4, W5 | drive 9; `Calendar.test`, `Condition.suture.test` |
| nurse refused `operate`/`prescribe`, doctor allowed, refusals name why; each Discipline advances on its own acts | W0, W5 | drive 10; `competence` output per session |
| every consumable locally sourced | W6 | drive 11 |

Unmapped: none. ⚠ One scope note: the requirements' "the ping fires when
the date arrives" is proven by unit test under the test clock; the wire
cannot advance game-time.

---

## Test & gate strategy

- **Unit** (`test:near` after every wave): named per wave above. Every
  test touching the wired runtime imports `test-bootstrap`
  (`lint:test-bootstrap`). Blood, calendar and operation tests use
  `WorldClockApi._resetForTesting` / `_advanceForTesting`.
- **Pack suites**: `pnpm -C packages/content/trade-medicine test`,
  `…/terminus test` after W5/W6.
- **Gates this build must pass** (`lint:family`, all 48; the ones it
  can trip): `instanceable` (four new kernel classes under
  `platform/<branch>/`, pack classes under `src/<branch>/`, no template
  path starting `/lib/`), `mixin-names` (three new `Mixins` entries),
  `object-verbs` (zero — no Api added), `instrument-args` (every
  instrument arg declared with a default), `capabilities` (`phlebotomy`,
  `suture`, `prescribing` each consumed by a view), `condition-arms`
  (**5**; the sedation/clearance reads and the engagement are not arms —
  use array methods for reads, `for…of` only inside the existing arms),
  `conditions` (four new rows; `EFFECT_KINDS` extended), `census`
  (every new `props:`/exit path resolves), `perishable` (the simples'
  materials are on `Provision`-derived classes), `pathogens`
  (untouched), `verb-collisions` (`bleed`, `test`, `transfuse`,
  `suture`, `prescribe`, `steep`, `calendar`, `administer`, `unstitch`,
  `venesect`), `drive-scripts` (the drive is a wire file — zero
  scripts), `dossiers` (the nurse's `nursing: competent` claim folds),
  `identity` (a Cast row's requirements), `lib-statics` (type-level
  statics only on `BloodType`), `module-scope`, `imports`, `schema`
  (no collection change — must stay byte-identical), `field-meta`
  (every new persistent field declared), `test-content` (kernel tests
  never name `/world/`), `unconsumed-seams` (every new field has a
  reader), `whole-table`, `does-nothing`.
- **The drive** (W7) is the exit criterion; its record goes in this
  plan. `pnpm test` once before the MR.

---

## Risks & opens

- **Combat replacing the operation.** D7 assumes an existing
  engagement's `replaceableBy` listing combat's participant type lets an
  attack terminate the surgeon's activity with `'replaced'`. Verify at
  `SchedulerRegistry.start` (L216) that the newcomer's `type` is what is
  matched and that combat's hold is started through `SchedulerApi.start`;
  if combat installs its hold another way, interrupt through the
  `_lastHarmedAt` stamp instead (poll at completion → abort).
- **`WorldClockApi.at` with `host` on an Avatar** — the host-scoped
  cancel subscribes to `StuffDestructed`; logout destructs the Avatar,
  so the ping dies with the session and re-arms at login. Confirm no
  duplicate ping on reconnect (the handle is cleared on fire).
- **The boot may stop the dart.** Wire characters are dressed; a boot
  layer may attenuate a 2 J point insult below the wound threshold. If
  `assess` shows nothing after corridor-1, the drive removes the boots
  first (an honest act) — never raise the trap's energy for the test.
- **The ESM cycle** on importing `METABOLIC_DEFAULTS` into Vitals (D3).
  The fallback is stated there.
- **`archetype: nurse`** may not exist in the archetype catalogue; omit
  rather than mint one.
- **`lint:conditions` may require non-empty `observableSigns`** — every
  new row authors at least one.
- **Verb word `bleed`** — a review decision, not a build stop.
- ✅ **RESOLVED — `design/trades-and-labor` merged (2026-09-24)** and this
  branch is caught up. The employment refactor (`fulfills`/`requires`,
  `confers` retired) is absorbed; W6 authors the nurse seat as `requires:
  {discipline: nursing, band: competent}` (above), and the merge was
  verified to touch none of this build's other substrate. ⚠ One thing for
  the build to confirm when it reaches Stage B: trades-and-labor's *"every
  recipe authors a discipline"* rule — the new medical acts/`steep` are
  controllers + an engaged step, not Recipe docs, so expected clear, but
  verify nothing in the pack ships a Recipe row without a `discipline:`.
  `build/ground` (biome/floors) and `design/instrumentation` (design docs
  only) do not overlap; instrumentation's subject (measure/analyze/augment)
  brushes `assess`/augment this build only touches lightly — watch, no code
  conflict today.
- **Stop-and-ask only for**: a worktree hazard; a `lint:schema` diff
  (there must be none); a place where the requirements and this plan
  disagree that this document does not already flag.

---

## Deferred seams

Clean attach points, each leaving as a slate note (never a plan section):

- **`docs/slates/builds/blood-slate.md`** — contamination/screening of a
  unit (`ContaminableMixin` reading the same payload; the donor's
  pathogen loads riding into the bag), the shortage summons, gift-only
  credits (`ActSignature.dispositionValence` at `bleed`), Rh, the
  inter-species compatibility topology (v1 is flat incompatibility; the
  `mismatch` read is where a graph goes), the consent prompt on a
  conscious recipient, heart-rate compensation. The `BulkPayload.blood`
  declaration and `receiveBlood` are the seams.
- **`docs/slates/builds/pharma-slate.md`** — the `active` tag +
  `toxicity` as the pharmacopoeia's row shape; `steep` is the stub
  extraction replaces; `Simple` is the herb class it grows;
  `prescriptionOnly` is the controlled-substance flag; the
  `Prescription` slip is what a pharmacy dispenses against.
- **`docs/slates/builds/personal-calendar-slate.md`** — write-
  authorisation on `addCalendarEntry` (ungated in v1), recurring
  entries, shared calendars, the paper manifestation (a `Thing`
  composing a calendar-reading capability over the same mixin), the
  employment/contract/banking writers.
- **`docs/slates/tails/augmentation-slate.md`** — `amputation`'s
  `severPart` is the removal; the stump's `isSlotDisabledByAnatomy` is
  what a prosthetic re-enables; the operation catalogue's `resolution`
  vocabulary gains `install` when that build runs.
- **`docs/slates/builds/medic-judgment-slate.md`** — diagnosis stays
  its own thread; `assess`'s `max(nursing, medicine)` read is the seam.
- **Veterinary medicine** (a new slate) — a `veterinary` Discipline
  branch under `health`, the *same* acts on an animal patient. The seam is
  already open: every act narrows on `VitalsMixin`/`Creature` and blood is
  per-`Species` (an animal has a type), so no substrate change — only a
  Discipline + species care-knowledge + the husbandry/ranching/pets
  ownership tie. The build keeps it open by never gating an act on
  personhood (Host placement).
- **The SBAR handoff + the shift-long deteriorating-patient lab quest**
  (NGN Q5) — the **scenario layer** (eternal-university / demo /
  health-vertical). The seam: the two-role clinical scene ships here, and
  a provider/incoming-shift NPC that acts on a nurse's report is a comms +
  brain concern that rides it. `assess`'s cue-reads and the worsening
  clocks are the raw material a scripted deteriorating patient uses.
- **Surgery-as-a-specialty** (the theatre, the team, asepsis as a
  system) — the catalogue row's `anaesthesia` and `instrument` fields
  are the dials; a `theatre` capability on a Location is where a room
  bonus would attach.

---

## Critical files

Read first, in this order:

1. `docs/requirements/clinical-medicine-requirements.md`
2. `docs/subsystems/harm.md`, `vitals.md`, `reserve.md`, `spoilage.md`
   (§ The gauge, § The blend half), `advancement.md` (§ Catalog, §
   Prefer specializations), `employment.md` (§ Data model), `comms.md`
   (§ Comms is a hosted update), `time.md` (§ Scheduling), `uncertainty.md`
3. `packages/server/src/mud/lib/vitals/Vitals.ts` (the whole mixin
   surface; `getConsciousness`, `applyTreatment`, `forkSlice_*`,
   `rescheduleNotify`)
4. `packages/server/src/mud/platform/idea/Condition.ts` (`TraumaType`,
   `Trauma`, `HARM_DEFAULTS`, `TraumaBehavior`, `RUPTURE_BEHAVIOR`,
   `LACERATION_BEHAVIOR`, `TRAUMA_BEHAVIOR`, `BLEED_FAMILY`,
   `VitalEffect`, `AfflictionRecord`, `ProgressionSpec`, the `Condition`
   class fieldMeta)
5. `packages/server/src/mud/lib/metabolism/Metabolic.ts` (L220–245,
   `restorePlasma`, `introduceToxin`, `resolveToxinBehavior`, the slice)
6. `packages/server/src/mud/lib/reserve.ts`, `lib/Seeded.ts`
7. `packages/server/src/mud/platform/idea/api/ConditionLogic.ts` (the
   fold and where the trauma type is minted),
   `platform/idea/cmd/combat/ShootController.ts`, `lib/hazard/HazardDelivery.ts`
8. `packages/server/src/mud/platform/idea/cmd/medical/{Dose,Treat,Tend,Undress}Controller.ts`,
   `platform/idea/cmd/perception/AssessController.ts`
9. `packages/server/src/mud/lib/craft/ManualBuildStep.ts`,
   `platform/idea/cmd/crafting/ManualBuildController.ts`,
   `lib/combat/Coup.ts`, `lib/vitals/TendingEngagement.ts`,
   `platform/idea/SchedulerRegistry.ts` (L200–275)
10. `packages/server/src/mud/platform/idea/DisciplineCatalogue.ts`,
    `platform/idea/Discipline.ts`, `lib/paths.ts`, `lib/mixin.ts`
11. `packages/server/src/mud/platform/agent/Avatar.ts` (L150–180,
    `installDefaultLoadout`), `platform/idea/ForumsUpdate.ts`,
    `lib/forum/Forums.ts` (the hosted-app shape),
    `lib/augmentation/AetherHosted.ts`
12. `packages/server/src/mud/lib/bulk/Bulkable.ts` (`BulkPayload`, the
    transfer fold), `lib/material/Freshness.ts` (the declaration, `loadOf`,
    `bandOf`), `platform/thing/{Receptacle,Provision,ToolItem}.ts`
13. `packages/server/src/mud/platform/idea/species/Species.ts` (fieldMeta)
14. `packages/content/trade-medicine/**` (everything — it is small),
    `packages/content/terminus/content/world/terminus/infirmary/**`
15. `packages/content/platform/content/platform/idea/Discipline/{medicine,forensics}.yaml`,
    `…/idea/Condition/circulation/hypovolemic-shock.yaml`,
    `…/idea/Condition/metabolism/{alcohol,venom}.yaml`,
    `packages/content/platform/pack.yaml` (the boot list)
16. `packages/content/generic-objects/content/stuff/thing/traps/step-dart.yaml`,
    `packages/content/newbie-wilds/content/world/newbie-wilds/delve/corridor-1.yaml`
17. `packages/content/trade-forestry/content/trade/forestry/thing/hazel-stool.yaml`
    (the Plant row shape), `…/stuff/idea/species/plantae/…/salix/alba.yaml`
18. `packages/server/scripts/check-conditions.ts` (`EFFECT_KINDS`),
    `check-condition-arms.ts` (what counts as an arm),
    `check-capabilities.ts`, `check-instrument-args.ts`
19. `packages/wire/tests/recovery.dirty.wire.test.ts`,
    `injury.wire.test.ts`, `packages/wire/src/harness/session.ts`,
    `docs/testing.md`

---

## Drive record

*(appended at build time — the output of running the requirements doc's
drive script over the wire against a booted world: the count, every
failure, what each found.)*
