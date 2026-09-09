# Consequence — implementation plan

Executes [consequence-requirements](../requirements/consequence-requirements.md)
(closed scope), seeded by [consequence-slate](../slates/builds/consequence-slate.md).
**Kind:** feature, with one refactor movement (III, the eight-arm
unification) and one content movement (IV). **Leads from:** kernel; the
first consumer is Movement IV, inside the build.

What is being built: a wound spends the poise of the fighter it lands on
and caps what they can recover; the fight's outcome credits the
Disciplines each side actually used (the loser as `failure`, bounded by a
floor and by the rule that losing to your betters is not evidence); death
suppresses expressed competence globally and temporarily without touching
the Transcript; the `Condition` Idea's three dead channels (`signature`,
`resolution`, `contagion`) become the effect channel the existing seven
reconcile arms route through — the arm census **falls** from 7 to 5 and
the parallel-store census from 1 to 0; and the wreckage becomes other
people's paid work through one new kernel primitive (a priced *service*)
that a second clinic, repair shop and necropolis reuse with zero code.

Four movements, eighteen waves (`W0a` is done). Every wave lands
independently at one commit on `design/consequence`.

---

## Grounding

Facts verified this cycle by opening the file. Paths are relative to
`packages/server/src/mud/` unless they start with `packages/`.

### The condition machinery (Movement III's refactor spine)

- `lib/vitals/Vitals.ts:1038` `reconcileConditions()` — one private
  method, **seven arms**, each bound as a `this.conditions.filter(...)` on
  record shape: `traumas` (:1052, `kind === 'trauma'`), `shocks` (:1055),
  `sustained` (:1058), `decayingMagic` (:1061, `affliction && magicOrigin
  !== undefined`), `infections` (:1069, `affliction && pathogenLoad !==
  undefined`), `progressing` (:1080, `affliction && neither`), `dyings`
  (:1086). Every arm except `dyings` carries the presence-freeze idiom
  (first-touch stamp, linkdead re-stamp, `elapsed <= 0`, far-past guard
  `HARM_DEFAULTS.MAX_REASONABLE_GAP_SEC`); `dyings` opts out of both,
  loudly commented. The bleed→death floor (:1329) and the electrocution
  floor follow the loops.
- `Vitals.ts:913` `progressAffliction(record, elapsedSec)` — resolves the
  row by `StuffApi.findByTemplatePath<Condition>`, **returns early if the
  row carries `toxinBehavior`** (two mechanisms owning `stage`), then
  `stage = floor(elapsed / progression.intervalMs)`.
- `Vitals.ts:947` `progressInfection` — closed-form logistic on
  `pathogenLoad`; the **only effect any affliction has on a body today is
  hard-coded here**: stage ≥ 2 drains `hydration` via `adjustReserve`
  (:1010). No other affliction does anything.
- `lib/metabolism/Metabolic.ts:1037` `reconcileToxinConditions()` — the
  eighth mechanism: iterates `this.toxinBurdens`, derives a band from the
  authored `toxinBehavior.bands`, and **writes it into the condition's
  `stage`**; spawns/relieves the record itself (`self.afflict`,
  `self.relieve`) keyed by `TemplatePathPrefixes.metabolismCondition +
  type`. The purge (`vomit`) fires from here.
- `Vitals.ts:1565` `afflict(condition)` — runs the `canAfflict` veto, then
  `this.conditions.push`. `:1576` `relieve` — splice. Both public,
  ungated, called directly by every driver (metabolism, thermal,
  respiration, magic, `PassageController`, `CombatHookContext`'s
  `afflict` consequence at `CombatLogic.ts:2599–2680`).
- `Vitals.ts:678` `getConditionBand()` — reconciles, then folds blood
  fraction, out-of-band vital signs, floored biological reserves
  (`MixinApi.isReserved` narrow) and non-trivial trauma into a severity
  index. `:844` `isSlotImpairedByTrauma(slot)` — **fracture-only**, a
  derived read consumed at `lib/slot/Slotted.ts:338` (`canOccupy`),
  `platform/idea/api/MagicLogic.ts:428` (hands) and
  `CombatLogic.ts:3681`. `:772` `drainForLimp` — laceration/avulsion at
  `body.leg.*` only.
- ⭐ **Nothing regenerates `bloodVolume`.** The only writers in the tree
  outside tests are `platform/idea/Condition.ts:402/407` (the bleed's
  read/set) and `Vitals.resetVitalsToSpeciesBaseline`. A bled fraction is
  permanent until death. This is the real "hospital problem" and it
  decides W11: a burn's plasma weep is only a *consequence* rather than a
  permanent debit if fluid restores plasma.
- `platform/idea/Condition.ts` — the record vocabulary + the Idea.
  `AfflictionRecord` (:41) `{kind, templatePath, stage, elapsed,
  magicOrigin?, tickedAt?, pathogenLoad?, symptomsAt?}`; `Trauma`
  (:112) `{kind, type, site, severity, bleeding?, dressed?, tickedAt?,
  mechanism?, inflictedBy?}`; `ActiveCondition` (:345) is the five-way
  union. **`VitalEffect` (:353) is `{sign: string; delta: number}` — the
  shape the slate calls "what it must become".** `ProgressionSpec` (:360)
  is `{intervalMs}` only. `ResolutionSpec` (:565) `{by: string}`.
  `ContagionSpec` (:570) `{vector: string}`. The Idea (:591, `SingletonMixin(PropertiedMixin(Idea))`)
  carries `signature` / `progression` / `resolution` / `observableSigns`
  / `contagion` / `toxinBehavior` / `pathogenBehavior` / `mentalBands`,
  all persistent, spoiler-levelled in `fieldMeta` (:655). Accessors
  `getSignature` (:674) / `getResolution` (:688) / `getContagion` (:702)
  have **zero callers** outside the file.
- `Condition.ts:161` `HARM_DEFAULTS`; `:465` `decayingBehavior(rate,
  phrase)` — `CONTUSION_BEHAVIOR` (:481), `FRACTURE_BEHAVIOR` (:494) and
  `BURN_BEHAVIOR` (:500) are all this: severity decays, nothing else.
  `TraumaBehavior` (:380) is `onset/tick/resolve/reopen/describe`.
- `platform/idea/ConditionCatalogue.ts` — **exists and is live**: its
  `postRegister` → `warm()` stands every row under
  `TemplatePathPrefixes.condition` (`/platform/idea/Condition/`) whose
  `class` is `/platform/idea/Condition` up as a singleton. The vitals.md
  "no Condition Idea is live" warning is historical. ⚠ It walks a
  **path prefix**, so a pack-owned condition row under `/trade/...` would
  not warm (Deferred seams).
- The 23 rows live at
  `packages/content/platform/content/platform/idea/Condition/{metabolism,thermal,respiration,magic,mortality,pathogen}/`.
  All carry `signature: []` and `contagion: null`. `recovering.yaml` is
  `progression: {intervalMs: 3600000}`, `resolution: {by: rest}`,
  `observableSigns: [unsteady, hollow, newly-made]`. `venom.yaml`
  authors `resolution: {by: antivenin}` and a `toxinBehavior`;
  `salmonella.yaml` a `pathogenBehavior`. `TemplatePaths.mortalityRecovering`
  and `TemplatePathPrefixes.{condition,metabolismCondition,pathogenCondition,magicCondition}`
  are in `lib/paths.ts:81–150`.
- `api/condition.ts` — **exactly four statics**: `inflict`, `die`,
  `embodyForSession`, `reembody`. Its own header (:14) still claims it
  "forwards `afflict`/`relieve`/`conditionsOf`"; harm.md corrected this
  on 2026-07-31. `ConditionLogic` (`platform/idea/api/ConditionLogic.ts`)
  gates with `@CallSecurity(ConditionApiCallers)` at :221/:237/:243/:249;
  the death choreography (`dieImpl` :294, `divideBody` :426,
  `mintCorpseFrom` :564, `reembodyImpl` :723) lives there.
- `platform/idea/cmd/charactergen/PassageController.ts` —
  `RECOVERY_RESERVE_COST = 60` (%), drains `satiation/hydration/endurance`,
  then `body.afflict({templatePath: recovering, stage: 0, elapsed: 0})`.
  The comment names this "the price of coming back cheap" and puts it in
  the floor route, not in `reembody`, on purpose.
- `platform/idea/cmd/perception/AssessController.ts:96–104` reads
  `competenceBandFor('medicine')`; the affliction readout (:143–190)
  names the condition at `competent`+ and otherwise emits
  **`observableSigns[0]` only** (:170). `platform/idea/cmd/medical/TreatController.ts`
  — `pickWound` (:41) auto-selects the worst bleeding wound;
  `difficultyFor(w)` (:55) from severity; `outcomeFor(band, quality)`
  (:90); dressing found by `MixinApi.isDressing` over reachable (:136);
  `TRAUMA_BEHAVIOR[type].resolve` (:164); `stabilize` (:171);
  `StuffApi.destruct(dressing)` (:173); `creditDeed medicine` (:177).
  `tendInfection` (:239) knocks `pathogenLoad` by band, spends nothing.
  **Nothing reads `Condition.resolution`.** No medical verb costs money.

### Combat (Movement II)

- `platform/idea/api/CombatLogic.ts:1000` `energyFor(band)` steady 1.2
  → open 4.5; `:1728` `resolveExchange`; **`:1804` `effectiveDamage =
  poiseDamage * reachScale`** is weapon balance × reach, i.e. pressure;
  `:1826–1829` erodes both sides' poise **before** any blow is resolved
  and independent of what lands. The `land` case (:1932) calls
  `commitInflict` (:2180) whose `ConditionApi.inflict` is at `:2261`;
  the returned `InflictReport` (:2072) carries `band: OutcomeBand`
  (`turned | grazes | bites | bites-deep`, via
  `MaterialApi.severityToBand`) and `traumaType` — **already in scope
  right after the inflict** in `land` (:1936), `exploit` (:1917), the
  riposte (`reactiveDispatch` :2053) and `partingShot` (:4796). So the
  wound→poise edge needs no signature change; it is a second mutation
  after the report.
- `lib/combat/Poise.ts` — `value` is `private` (:79); bands
  `steady|pressed|reeling|broken|open` (:38); `restore(amount,
  enduranceRatio)` (:137) clamps to a **per-call ceiling** that is
  `enduranceRatio(combatant)` at the two call sites (`CombatLogic.ts:1756`
  the defend beat, `:2743` the influence `steady` arm). No stored ceiling.
- `lib/combat/CombatSession.ts:76–171` `CombatantState` — `poise`,
  `tempo`, `flags`, `competenceBand` (snapshotted at open by
  `snapshotBandsImpl` `:3992`, reading **only `MELEE_COMBAT_DISCIPLINE`**
  at `:4003`), `sharpness`, `down`, `side`, `lastStruckBy`, `bandSeen`.
  No morale field, no exchange tally. `CombatResolution` (:67) includes
  `"disengage"`, **never passed to `endWith`** by any caller.
- `lib/combat/Sharpness.ts:65` `resolve({competenceBand, composure?})` —
  `g(composure)` defaults to 1; the header (:11) and the field (:48) both
  name it the `traits-stress` seam. **Ships untouched.**
- `lib/combat/Combatant.ts:314–346` `onDefeated(ctx)` /
  `onDefeatedFoe(ctx)` — no-op terminals, `@hook`, "compose via super";
  **zero overrides** in kernel or any of the 42 packs (only the test
  double in `platform/idea/api/__tests__/CombatLogic.hooks.test.ts`).
  Fired from `endWith` (`CombatLogic.ts:3085–3140`) after
  `narrateResolution`, before `session.resolve`, each followed by
  `applyConsequences(ctx)`; the venue's `onCombatResolved` after them.
  The accountability death row and `runResolutionConsumers` (:4813,
  chronicle deed + witness regard, `void session; // reserved`) run from
  `endWith`'s **callers**, not inside it.
- `lib/combat/CombatHookContext.ts:82` `CombatConsequence` — eight kinds
  (`rider | afflict | toxin | reserve | wear | influence | shock |
  flavor`), drained by `applyConsequences` (`CombatLogic.ts:2591`). The
  `afflict` kind calls `recipient.afflict(c.condition)` directly.
- ⚠ **Finding 6 is wrong in its strong form.** `outcomeToResult`
  (`CombatLogic.ts:4917`) maps `whiff → "failure"` and `parried →
  "partial"`, and `mintExchangeSignature` (:4874) mints it **every
  exchange** for the player side, at `difficultyFor(targetState)` (:4908)
  = the *target's poise band* (`open/broken → easy`, `reeling →
  standard`, else `hard` if armed). `TreatController.ts:92/:257` also
  write `failure`. So production writes negative evidence today, and it
  writes it at the difficulty that stings most (an `easy` failure against
  an open target). What remains true: **no fight's outcome is ever
  credited**, the loser is never credited with anything at resolution,
  and difficulty is never derived from the opponent's competence. The
  requirements' survey sentence ("nothing has ever written one") is
  incorrect; the goals it motivates are unaffected and the floor is more
  urgent, not less.
- `:3884–3887` `MELEE_DISCIPLINE = "melee-combat"`, `BLADES_DISCIPLINE`,
  `UNARMED_DISCIPLINE`, `COMMAND_DISCIPLINE`; `:3921`
  `MELEE_COMBAT_DISCIPLINE` (same string, one use). `blades` is inferred
  from `instr.channel === 'edge' | 'point'` (:4892); `unarmed` from
  `instr && !instr.weapon` (:4899). **No weapon names a Discipline.**
  `platform/thing/equipment/Weapon.ts` composes
  `Wieldable(Slottable(Keen(Crafted(Durable(Constructed(Detailed(Thing)))))))`;
  `WeaponProfile` (`lib/combat/WeaponProfile.ts:65`) derives reach /
  balance / guard / handedness / delivery from shape. Shipped arms rows:
  `packages/content/generic-objects/content/stuff/thing/arms/{steel-sword,steel-dagger,steel-spear,steel-mace,steel-warhammer,steel-flail,steel-shield,oak-waster,fire-poker,belt-knife,leather-whip}.yaml`.
- Discipline rows (all `packages/content/platform/content/platform/idea/Discipline/`):
  `melee-combat`, `blades` (`specializes: [melee-combat]`, ISCED-F 1014),
  `unarmed`, `darts`, `sports`, `guarding` (1032), `awareness`,
  `stealth`, `medicine` (0913), `smithing`, `command`, and 15 others. No
  bludgeon / polearm / flail / forensics discipline.
- `lib/behavior/combatant.ts:36–118` — the NPC combat brain: draws a
  sidearm when disarmed, **goes passive at `broken`/`open`** (the only
  morale-shaped behaviour), closes when out-reached, disarms at
  `reeling`, feints or strikes. **No brain, NPC or content class ever
  calls `yieldFight` or `offerBreak`.** `yieldFight` (:294) names the
  killer via `session.opponentState(actor)`, which is **null in any
  fight that is not exactly two-sided** — a yield in a melee fires no
  `onDefeatedFoe`. `offerBreakImpl` (:3187) dissolves an edge when both
  ends hold a fresh offer; a session with no edges resolves as `draw`.
  `disengageImpl` (:4757) is the flee path (parting shots, then
  `removeParticipant`). `DEFAULT_TERMS.stopCondition` is `"yield"`
  (`lib/combat/CombatTerms.ts:60`) and **nothing in the engine ever
  enforces it**.
- Narration: `lib/combat/CombatNarration.ts:97` `ExchangeReport.defenderPoise`
  is the band *after* the blow, used at :583–604 to pick the `land` line;
  the crossing `openingCracked` is narrated on a parry (:607). **No
  band-to-band delta is ever narrated.** `dispatchBandChanges`
  (`CombatLogic.ts:2969`) already computes the per-beat net transition
  against `bandSeen` and fires `onPoiseBandChanged` — no prose.
- Gym: `packages/server/scripts/__tests__/combat-gym.test.ts` pins
  canonical winners + beat counts at `:428–546` and the formation matrix
  at `:844+`; `vitest.gym.config.ts`; `pnpm test:gym` is its own CI job.
  **W1 will move these pins; budget for re-pinning.**
- `packages/server/scripts/check-combat-dynamics.ts` allowlists the
  `MixinApi.isX` predicates `CombatLogic.ts` and `lib/combat/*.ts` may
  use (`isAdvancing`, `isVitals`, `isReserved`, `isOrganism`, … 29 in
  all). A new predicate in either home fails CI unless added with a
  reason.
- `lib/config/AppSettings.ts:761–787` `combat.*` keys +
  `packages/content/platform/content/settings/combat.yaml` — a dial is one
  line in each.

### Advancement (the floor, the rule, the suppression)

- `lib/advancement/Competence.ts` — `derive(evidence)` folds rows sorted
  by `when ?? 0`; `DIFFICULTY_PARAMS` (slip/guess), `DIFFICULTY_TRANSIT`
  (ZPD), `OUTCOME_CORRECTNESS` (`failure 0 · partial 0.4 · success 0.8 ·
  critical 1`); `pL = post + (1 - post) * transit` — **transit applies
  after a failure too**. `seedRunFor(band)` searches ascending
  difficulties with `outcome: "success"` rows only. `bandOf` is the only
  band read.
- `lib/advancement/CompetenceBand.ts` — `COMPETENCE_BANDS` (five),
  `BAND_FLOORS` (0 / 0.2 / 0.45 / 0.7 / 0.9), `forTheta`, `rank`,
  `atOrAbove`, `FLOOR`.
- `lib/advancement/ActSignature.ts:33` `Difficulty` (five), `:49`
  `Outcome` (four), `Subcheck`, `ActSignature { discipline: Subcheck[] }`.
- `lib/advancement/Advancement.ts` — `creditSignatureImpl` (:118) writes
  one `TranscriptEntry` per subcheck then `practisingCache.refresh`;
  `bandsForImpl` (:180) groups by discipline → `Competence.bandOf`;
  `competenceBandFor` (:459) is `TranscriptEntry.find({owner,
  discipline})` → `Competence.bandOf`; the two sync faces
  (`practisingCompetenceCached`, `competenceDigestCached`) ride
  `DerivedStandingCache`s invalidated **only** by the ledger's own
  notify. `AdvancementMixin` is composed **outermost** on `Character`
  (`lib/character/Character.ts:93`) and holds no per-character state.
  Consumers of `competenceBandFor` outside the mixin: 28 sites across
  kernel and packs (stealth, medicine, perception, magic ×7, combat,
  mining, dyeing, cooking, farming, textiles ×2, haulage, transport,
  arcana) — **every one goes through this method**, none reads θ.
- `docs/subsystems/identity.md` / `lint:dossiers`: an authored
  competence claim is seeded as `success` rows with `when: null` (folds
  first). The floor (D1) and the above-band rule (D2) touch only failure
  rows, so **no dossier re-scores** — the collision the requirements
  name is closed by construction, and `lint:dossiers` stays green.

### Anatomy (the `governs` rename)

- `platform/idea/species/BodyPlan.ts:94` `governsVital?: string` on
  `BodyPart`. **Every read is an organ-exclusion filter**, not a vital
  coupling: `BodyPlan.ts:467` (surface fraction — "a part with
  `governsVital` is internal") and `lib/slot/Attired.ts:646/660/685/705`
  (insulation, windproofing and the two dressed-impression walks skip
  organs). `Vitals.ts:85` mentions it in a comment only. YAML: `heart:
  governsVital: heartRate` / `lungs: governsVital: respiratoryRate` in
  `packages/content/species-and-names/content/stuff/idea/species/BodyPlan/{biped,quadruped}.yaml`
  and `packages/content/trade-mining/content/stuff/idea/species/BodyPlan/avian.yaml`
  (7 lines). Tests: `BodyPlan.bodyParts.test.ts`,
  `Vitals.anatomy.test.ts`, `Slotted.covering.test.ts`.

### Movement IV — what content can and cannot do today

- A Business is 30 lines of YAML with **no priced services on it**:
  `packages/content/terminus/content/world/terminus/general-store/business.yaml`
  (positions / rosterSlots / `banksAt` / `operatingLocations`; stands up
  lazily via `EmploymentApi.ensureOperatorAt`). Dave's Bar:
  `packages/content/saxonberg-lounge/content/world/lounge/idea/business.yaml`.
  A Cast NPC with positions is `class: /platform/agent/Crafter` + an
  `archetype` + `competence: [{discipline, asserting}]` + `shifts`
  brain — `packages/content/hearthworks/content/world/hearthworks/agent/smith.yaml`
  (51 lines) is the minimal one. `hearthworks` is a **venue pack with no
  `src/`** composing two trades by `props:` reference — the proof that a
  venue is content.
- **Prices live on fixtures**, not businesses: `lib/commerce/PricedOffer.ts`
  (a `prices: Record<key, minor>` map, nothing else) composed by
  `lib/commerce/Menu.ts` (keys are **recipe ids**; `/platform/thing/Menu`)
  and the retail `Stock` counter (keys are **item template paths**).
  `platform/idea/cmd/retail/OrderController.ts` resolves the key
  (:69), stands the business up (:88), calls `CraftingApi.craft({recipeRef,
  makerMode: 'fulfilling-bartender'})` (:93), and **its private
  `charge()` (:141–193)** builds the `Charge`, splits it, settles
  credential-then-cash through `BankingApi.settle`, and remits demo tax.
  ⭐ **No shipped priced key resolves to anything but a recipe or a
  stock line.** Paying for `repair`, `treat` or a corpse examination has
  no path. The one paid *service* in the tree is the TPA fare
  (`packages/content/tpa/src/lib/FastTravel.ts:843–873`) — pack code,
  not content.
- `repair` (`platform/idea/cmd/crafting/RepairController.ts` →
  `CraftingLogic.ts:2058` `repairImpl`) costs **materials only**: metal
  wants `reachableHeatK() ≥ 900` + an `anvil` capability; soft goods a
  `mending` tool; `needKg = massKg × deficit × 0.6` (×2 if broken);
  `item.setCondition(1)`. Afforded by `MendingTool` and trade-smithing's
  `Anvil` (`packages/content/trade-smithing/src/thing/Anvil.ts:14–26`).
  Armour rows are `/platform/thing/equipment/Garment` composing
  `DurableMixin`; Attired reads `worn`/`ragged` upkeep bands
  (`Attired.ts:253–275`).
- `pay` (`platform/idea/cmd/banking/PayController.ts:55–110`) settles a
  `Charge` with `presented: false` by `{kind: "credential"}` against the
  payer's linked account — **no physical credential needed**. A shade
  (no wallet, no gear) can therefore pay from its own account; bank
  accounts survive death (identity-keyed, mortality.md § What survives).
- `lib/employment/Condition.ts:56` `CONDITION_TEMPLATES = ["delivery",
  "supply"]` — **closed**; `:50–54` says why ("every member must be
  checkable by the engine at turn-in… that is the wall *guard my shop*
  sits behind"); `JobController.parseCondition` (:172–290) refuses any
  other phrase. `Clause.ts:22` `CLAUSE_SHAPES = ["achieve","maintain"]`,
  and `maintain` has no violation engine. Escrow: the issuer's own bank
  custodies (`BankingLogic.ts:987–1003`); an NPC payee gets an account
  opened. `platform/thing/JobBoard.ts` affords `job` to peers; a board
  is one `props:` line. ⭐ **A guard contract is inexpressible on the
  shipped board** — the requirements' "if it does need engine work, that
  is a finding worth stating loudly" is now a fact.
- `lib/activity/Engaged.ts:66` slots `body|hands|attention|voice`, one
  occupant each; `SchedulerRegistry` is the only writer. Pure-occupancy
  engagements exist (`lib/attendant/AttendanceEngagement.ts` holds
  `attention` with no duration); **no verb is pure occupancy**.
  `ManualBuildController.engageStep` (:60–107) is the generic engaged-act
  shape.
- `lib/mortality/Postmortem.ts` — `sinceDeath()` (:97, unguarded on
  purpose), `getDecayStage()` (:106), `getForensicReadability()` (:116)
  reading `MORTALITY_DEFAULTS.FORENSIC_READABILITY` (`MortalArc.ts:62`,
  `fresh 1 · stale 0.6 · decomposed 0.25 · spent 0`, "consumed by a
  **future** examination surface"). Consumers: `butcher` reads
  `sinceDeath` (`packages/content/trade-cooking/src/idea/cmd/crafting/ButcherController.ts:182`);
  **nothing reads stage or readability.** `assess <body>` works today
  (a `Corpse extends Creature` carries Vitals) and reports `is dead` +
  the wound list. Corpse row:
  `packages/content/generic-objects/content/stuff/agent/Corpse.yaml`;
  identity minted `${corpseRoot}/${deceased}/${diedAtGameSec}`.
- `analyze` (`packages/content/platform/content/platform/cmd/perception/analyze.yaml`)
  is a subcommand-per-controller view; a pack adds a stanza whose
  `controller:` lives in the pack (`trade-mining`'s `measure strike` /
  `analyze ground` precedent). Nothing under `analyze` or `measure`
  reads a corpse or a patient.
- No `trade-medicine` or funerary pack exists. `treat`/`assess`/`undress`
  are platform verbs; the only dressing row is
  `packages/content/saxonberg-lounge/content/world/lounge/thing/bandage.yaml`.
  `trade-smithing` exists with `src/` (Anvil, Whetstone). `cure` is
  trade-cooking's meat curing, not medical.

### Gates and tests already in place

- `packages/server/scripts/check-condition-arms.ts` — `ARM_CEILING = 7`,
  `KNOWN_PARALLEL_STORES = ["lib/metabolism/Metabolic.ts#reconcileToxinConditions"]`,
  exports `armsIn(file, src)`; fixture
  `scripts/__fixtures__/condition-arm-shapes.ts.txt`, test
  `scripts/__tests__/check-condition-arms.test.ts` (must-fire ×4,
  must-not-fire ×4). In the derived roster (30 gates,
  `packages/server/package.json:38–68`).
- `check-does-nothing.ts` is the pattern W0c copies (a pure check +
  a roster walk, `EXIT_ON_FINDINGS = true`). `@hook` tags in
  `lib/`+`platform/` (non-test): **77**, 30 of them on
  `lib/combat/{Combatant,CombatReactive}.ts`; data Ideas with
  `fieldMeta` under `platform/idea/` (non-cmd, non-api): **22**.
- The measured estimator curves (slate § Q8) were re-derived from
  `Competence.ts` constants this cycle and stand.

---

### ⚠ Resync against master, 2026-09-08 (`a8fd82d7f`)

Two builds landed after this plan was written — **world-scan** and
**refactor/stackable** — 50 commits, merged with **zero textual
conflicts**. ⚠ That is the dangerous shape (the identity build merged
clean and then failed two gates), so the facts were re-checked rather
than assumed:

- ✅ **`lint:condition-arms` still reads 7 + 1 parallel** at the same
  lines. `Vitals.ts`, `Condition.ts`, `CombatLogic.ts`, `Competence.ts`,
  `Advancement.ts`, `Combatant.ts`, `NaturalAttack.ts`, `Poise.ts`,
  `BodyPlan.ts` and `api/condition.ts` are **untouched by master**.
- ✅ `Metabolic.ts` changed, but **comment-only** (a perf note about
  `getOccupiedHost`). W11/D21's plasma coupling is unaffected.
- ✅ The `GlobbableMixin` → `StackableMixin` rename touches nothing this
  plan references.
- ⭐ **New: `packages/wire`** — the wire-test harness shipped. See the
  Test & gate strategy; it moves several items off the drive-only list.
- ⭐ **New: `FromTemplateMethod`** call-security policy. See D12.
- ⭐ **New gate: `lint:whole-table`.** See Convention conformance.

## Plan-level decisions

Numbered so waves and commits can cite them. Lens limbs are named where a
lens chose.

### D1 — The floor is derived inside the fold, never stored

`Competence.derive` tracks the running high-water θ over the ordered
evidence and returns `band = max(forTheta(θ), oneBelow(forTheta(θmax)))`.
Cost: one comparison per row in the pass already made — no second fold,
no stored mark. A stored high-water mark would be a second source of
truth for a number the ledger owns (advancement.md § derive-on-read) and
would need a migration path this repo forbids. The floor is a property of
the *estimator*, so it re-legislates every history without rewriting a
row, `seedRunFor` is unaffected (successes only raise θmax), and
`lint:dossiers` keeps folding the same function. ⚠ The floor is one band
below best-ever, not best-ever: a veteran who loses is *rusty, not reset*
(lens 3).

### D2 — Failures above your band contribute nothing, decided at derive time

A `failure` or `partial` row whose difficulty rank exceeds the rank of
the band the fold has reached *at that row* is skipped by `derive`. Band
rank ↔ difficulty rank is the identity map (untrained↔trivial …
expert↔formidable): "above your band" means the task was harder than
your band is expected to meet. The row is still appended, still shown by
`transcriptEntries` and `chronicle` — **the record stays true; the
estimator declines to read it as evidence about you.** Credit-time
filtering was rejected: it would need every credit site to read the band
first (an async read on a fire-and-forget path) and would put a lie of
omission in the ledger. A `success` above your band is kept — that is
the desirable-difficulty path and the whole point of fighting up.

### D3 — Suppression is a body read applied at the competence surface

`VitalsMixin` gains `expressionSuppression(): number` — bands to
suppress, derived on read from the active conditions' `expression`
effects (D4) times each condition's taper. `AdvancementMixin` applies it
at its **four read surfaces** (`competenceBandFor`, `competenceBands`,
`practisingCompetenceCached`, `competenceDigestCached`) via
`CompetenceBand.lowered(band, n)` when `MixinApi.isVitals(this)` — never
inside `bandsForImpl` and never in the fold caches, so the cache stays a
fold of the ledger and the taper needs no invalidation. Direction:
advancement → `MixinApi` predicate → body method. Advancement imports no
vitals module; vitals imports no advancement module; the `expression`
effect kind is the neutral vocabulary between them. The narrowing is
composition (a host with no body has nothing to suppress), not a
re-narrowing of the host set. Across-the-board by construction: every
one of the 28 consumers already reads through these surfaces.

### D4 — `signature` is the effect channel; the affliction arms collapse onto a declared law

`VitalEffect` becomes a discriminated union of four kinds (host placement
below), and `VitalsMixin` gains one interpreter, `applyEffects(effects,
intensity, elapsedSec)`, which every arm calls after advancing its law:

| kind | fields | what it does | intensity |
|---|---|---|---|
| `vital` | `sign`, `perHour` | integrates a rate on a vital sign (`setVitalSign`, invariants apply) | stage / severity / load |
| `reserve` | `reserve`, `pctPerHour` | `adjustReserve` when `MixinApi.isReserved` (the shipped infection drain, generalized) | same |
| `capability` | `disables: 'slots-at-site'`, `aboveSeverity` | a derived slot impairment (the fracture read, generalized) — read, not integrated | severity |
| `expression` | `bands` | competence suppression (D3) — read, not integrated | taper |

`ProgressionSpec` becomes `{ law: 'stage' | 'decay' | 'logistic' |
'burden', intervalMs?, decayPerSec? }`. The three affliction arms
(`decayingMagic`, `infections`, `progressing`) become **one** arm over
`afflictions` that dispatches on the **row's declared law** — the
discriminator moves from "which optional field happens to be set" to
"what the author said". `burden` is the toxin law: the arm reads the
host's live burden through the shipped `Metabolic` surface
(`MixinApi.isMetabolic` narrow — Metabolic wraps Vitals on `Creature`, so
the runtime `this` carries it) and derives `stage`; `reconcileToxinConditions`
keeps absorption, spawn/relieve and the purge but **stops writing
`stage`**, and `progressAffliction`'s toxin skip goes away. Trauma
behaviours gain a `signature` on `TraumaBehavior` interpreted by the same
call. `traumas`, `shocks`, `sustained` and `dyings` keep their arms
(their laws are the integrate/circuit/pull/countdown mechanisms the
census already names). **`ARM_CEILING` 7 → 5; `KNOWN_PARALLEL_STORES` →
`[]`.** `contagion` gets a consumer only if it is nearly free (D14).

Lens 2 chose the law-on-the-row over a per-kind subclass: a new
affliction is a row with a law and a signature, no engine work.

### D5 — Winning pays in the two empty hooks, and the per-exchange mint is retired

The fight credits **once per side at resolution**, from the default
bodies of `CombatantMixin.onDefeated` (the loser's signature) and
`onDefeatedFoe` (the winner's) — the object credits its own transcript
(verbs on objects), overriders keep it via `super`, and the hooks stop
being no-ops. Not a new `CombatConsequence` kind: consequence kinds are
mid-fight state mutations drained per beat; this fires once, after the
fight, on a ledger. `mintExchangeSignature` and `outcomeToResult` are
retired: twenty per-exchange rows per fight drown the verdict (a loser
who wins eight of twenty exchanges nets *up* today) and are the live
death-spiral in Grounding. `mintAssessSignature`, `mintCommandDeed` and
the coup deed stay. Brains bank nothing (the shipped parity rule; an
`Extra` shares one identity across every instance, so crediting it would
make "the wolves of this wood" a single learner — a real design, not this
build's). The signature: `melee-combat` always, plus every discipline in
the actor's `exercised` set (D6); difficulty from `CompetenceBand.difficultyAgainst(mine,
theirs)` (rank gap −2… +2 → trivial…formidable, equal = standard) using
each side's snapshotted band; outcome `failure` for the victim (`partial`
when the victim won at least half the exchanges they were in — a close
loss), `success` for the named killer, nothing for a `draw`
(backing down records none, per the meet-or-defy table). A yield in a
melee names the killer as `lastStruckBy` else the sole live foe, closing
the `opponentState` gap.

### D6 — A weapon declares what it exercises; a beast's difficulty comes from its BODY

`Weapon` gains an authored `exercises: string[]` (Discipline keys). Arms
rows author it; three Discipline rows are added because the sim already
tells the practices apart by delivery form and guard class (advancement.md
§ *Prefer specializations*): `bludgeons` (mace, warhammer, poker),
`polearms` (spear), `flails` (flail, whip); `blades` covers sword, dagger,
belt-knife and the oak waster (a practice sword). No wielded weapon →
`unarmed` (shipped). `snapshotBandsImpl` snapshots `competenceBand` as the
**max over `melee-combat` and the wielded weapon's `exercises`** — which
also fixes `Sharpness` reading only `melee-combat` for a swordsman.

#### ⭐⭐ The beast: a third answer, replacing both the ones first considered

**The problem.** Exchange difficulty derives from the opponent's
competence band, and that feeds two things — how much you *learn* from
winning (the ZPD gate) and how much you *lose* from losing (difficulty
modulation).

⚠⚠ **A beast has no meaningful transcript.** Wolves are `Extra`s sharing
one identity, so the band reads `untrained` and every wolf fight is
`easy`. Beating one teaching you nothing is *correct*. But **losing to
one would be the single most punishing loss in the game** — an `easy`
failure is the maximal-sting case (Δθ ≈ −0.22, measured) — so being
mauled by a wolf would cost more competence than being beaten by a master
swordsman. That is backwards, and it is a correctness problem rather than
a preference.

**Both first-considered answers were wrong:**

- *the shared transcript* — the bug above;
- *an authored `Species.contestBand`* — declined because the identity
  build settled that a competence claim is **seeded evidence, never a
  declared floor**.

⭐ **The resolution is the plan's own reasoning, acted on instead of
abandoned: a beast's danger is its BODY, not a contest skill.** So derive
the difficulty from the body, which already says how dangerous the animal
is. `NaturalAttack.deriveProfile` (`lib/combat/NaturalAttack.ts`) yields
`tempoFactor` / `poiseDamageFactor` / `overextendFactor` / `reachRank`
from the species' authored `naturalAttacks` hints (`massKg`, `lengthM`,
`reach`) with a banded body-scale fallback off `BodyPlan.baseMass`. Map
that profile onto the difficulty scale for any **non-sentient**
opponent; sentient opponents keep the transcript read.

**Why this is better than either:**

- **Derived, never declared** — it honours the identity build's rule
  rather than working around it.
- **Honest** — a dire wolf is a hard fight because it is large, fast and
  long-reached, which is *what the rows already say*. Skill was never the
  right noun for a wolf.
- ⭐ **Authors get the flexibility for free.** There is no new authoring
  surface to learn and nothing to keep in sync: author a heavier,
  longer-reached animal and it *is* a harder fight, in the same numbers
  that already govern how it hits. A `Species.contestBand` would have
  been a second dial to drift out of agreement with the first.
- It reuses a shipped, unit-tested pure function; no new curve settings.

⚠ **The band-to-difficulty map is a small new pure function** and belongs
beside the profile it reads, on `NaturalAttack`. W3's acceptance asserts a
`largeBodyMassKg`-class beast reads `hard` (so losing to it barely stings
and beating it teaches), while a rat reads `easy` (beating it teaches
nothing, and losing to it is a story, not a career setback).

### D7 — Morale is a derived read, never a stored scalar; it fills nothing in `Sharpness`

Per combat-experience Thesis 13, `lib/combat/Morale.ts` is a value-object
(the `Sharpness` shape): `Morale.bandFor(state, session)` → `resolute |
shaken | breaking`, a pure function each beat over state that already
exists — own poise band and its trend (`bandSeen`), wounds taken this
fight (the `InflictReport` bands tallied on `CombatantState`), condition
band, focus-fire count, allies down, the foe's band, and the terms
(lethal terms lower the break point for a sentient). It is **not**
`g(composure)`: that seam ships untouched and empty (requirements
non-goal; two claimants). The `combatant` brain reads it and *decides*
(yield / accept a break / flee); a player's morale is computed, narrated
and readable by `assess`, and never seizes their decision.

### D8 — A beast does not take a yield; the non-fighter's exits are the others

`yieldFight` against a session whose every live foe is non-sentient is
refused with prose ("it does not understand surrender"); a breaking beast
flees instead (the brain issues a traverse through `disengage`). The
non-fighter's exits against a beast are back down (ignored by a beast —
honest), flee, and somebody intervening. Lens 3 chose: a wolf that takes
surrenders is a lie the player would notice (slate Q4).

### D9 — De-escalation is terms renegotiated down, never a social minigame

Per Thesis 12: `fight parley` spends the beat like `defend`; against a
**sentient** foe whose morale read is `shaken` or `breaking` it dissolves
that foe's edge (the `offerBreak` mechanism) and, when no edges remain,
resolves the session as `disengage` — the declared-never-used resolution's
first use. It credits `awareness` (reading the target is the skill; no
diplomacy Discipline exists and this build does not add one — Deferred
seams) at difficulty from the foe's morale band. The engine models the
stakes; the words are roleplay.

### D10 — Wound → poise is a second mutation after the report, plus a stored ceiling

In `resolveExchange` (and the riposte), after `commitInflict` returns a
landed `InflictReport`: `targetState.poise.spend(dial(combat.wound.spend.<band>))`
and, for `bites`/`bites-deep`, `targetState.poise.lowerCeiling(dial(combat.wound.ceiling.<band>))`
floored at `combat.wound.ceilingFloor`. `Poise` gains a stored `ceiling`
(default 1) that `restore` folds with `enduranceRatio`. At session open
the ceiling is seeded from the body's live trauma (any wound at or above
the `bites` band), so a fighter who enters already cut enters capped.
Session-scoped, like all of `Poise`. The erode at `:1826` is untouched:
pressure and wound are two different edges (slate Finding 1).

### D11 — The poise read is prose from the transition the engine already computes

`dispatchBandChanges` gains a narration call beside the hook: a self line
per direction of crossing and a peers line, from band words only; the
land line gains a clause when the wound spend crossed a band
(`ExchangeReport.footingLost`). Never the scalar; no card (requirements
non-goal).

### D12 — The `afflict` door is gated like `inflict`, records the inflicter, and internal drivers keep their direct calls

`ConditionApi.afflict(target, spec)` / `relieve(target, cond)` /
`conditionsOf(target)` forward to `ConditionLogic` methods carrying
`@CallSecurity(ConditionApiCallers)`; `AfflictionRecord` gains
`inflictedBy?` stamped from `ExecutionContextApi.getActingAuthor()` (the
`Trauma.inflictedBy` precedent — the accountability foundation for a
poisoning). The shipped drivers (metabolism, thermal, respiration, magic,
`PassageController`) keep calling the body directly (harm.md's stated
rule); the door's first consumers are the `CombatHookContext.afflict`
consequence (re-routed through the Api) and W13's `revive`.

⚠ **Re-opened by the resync (2026-09-08).** Master shipped
`FromTemplateMethod(templateGlob, methodName)` — *"trust by the calling
FUNCTION, not merely by the calling object"* — whose own doc criticises
exactly the shape `inflict` uses: *"a singleton has dozens of methods,
and admitting all of them because one of them needs the reach is the
same shape as admitting a whole module."*

**W7 must evaluate it rather than reflexively copying `inflict`'s
`FromModule`.** ⚠ It may not apply here: the legitimate caller is the
`ConditionApi` **facade**, an Api class with *no template identity*,
which is why the `FromModule` form was chosen originally. If it does not
apply, say so in the commit — the point is that the choice is made, not
inherited.

### D13 — `resolution.by` is a closed treatment vocabulary matched against what the treater offers

`TreatController` stops picking a wound and applying a dressing
unconditionally. It resolves the *treatment offered* (a `Dressing` item →
`dressing`; a potable `Bulkable` vessel → `fluid`, routed through
`Metabolic.ingest`; nothing → `medicine`, the load knock; `rest` and
`warmth` are self-resolving and refuse a `treat`) and matches it against
what the target's conditions declare: traumas through a new
`TraumaBehavior.resolution` (`laceration | puncture | avulsion →
dressing`; `burn → fluid`; `contusion → rest`; `fracture → rest`, splint
deferred), afflictions through the row's `resolution.by`. A mismatch is
refused with prose ("a bandage does nothing for a burn"). `by: rest`
gains `atStage` — the stage at which the condition relieves itself.
`antivenin`/`antitoxin` map to the shipped `Metabolic` antidote seam
(`Metabolic.ts:401`) when an item carrying that token is offered; no new
item class ships (the venom row keeps its token; the drive does not
require an antidote item). W14's judgment loop builds on this: the
medic chooses the condition, not the sim.

### D14 — `contagion` gets a reader only as a read, not a spread

A `contagion` consumer is "nearly free" only as a *read*: `analyze
patient` (W13) reports the row's `contagion.vector` at `proficient`+ so a
medic can say "this spreads by touch". No spread mechanism ships
(requirements non-goal → disease-slate). That is one consumer, which is
what `lint:unconsumed-seams` asks for.

### D15 — `governsVital` → `governs: string[]`, semantics preserved

`BodyPart.governs?: string[]` (vital-sign keys today; capacity keys
later, physiology's axis). Every read stays "a part with a non-empty
`governs` is internal" (the organ filter). The 3 rows are edited, the
dev DB is dropped (no migration, ever). `isSlotImpairedByTrauma` is
renamed `isSlotImpairedByCondition` and reads `capability` effects
(D4) at the slot's `bodyPart` — fracture and burn both declare one.

### D16 — Diminishment is the `recovering` row, two bands tapering over twelve game-hours

`recovering.yaml` authors `signature: [{kind: expression, bands: 2}]`,
`progression: {law: stage, intervalMs: 3600000}`, `resolution: {by:
rest, atStage: 12}`; suppression = `ceil(bands × (1 − stage/atStage))`
(2 for six hours, 1 for six, then cleared), floored at `untrained`.
`PassageController` keeps the reserve cost. **A better way back applies
the same row at a later stage**: W13's `revive` service afflicts
`recovering` at `stage: 6, elapsed: 6h` — one band, six hours, zero new
rows. The slate's tuning sub-questions (bands, hours, floor) are answered
with these defaults and flagged under Risks as tuning.

### D17 — One kernel primitive for Movement IV: the priced service, on a `Tariff` fixture

`/platform/thing/Tariff` = `PricedOfferMixin(DetailedMixin(Thing))` plus
`services: Record<offerKey, ServiceKind>` where `ServiceKind` is a closed
kernel vocabulary `repair | revive | burial`. `OrderController` grows a
service branch: a key on a `Tariff` in the room dispatches to the
service's orchestration with the on-shift position as the maker
(`repair` → `CraftingApi.repair` with the on-shift maker; `revive` →
`ConditionApi.reembody` + the D16 affliction; `burial` →
`corpse.interIn(grave)`), then collects. `OrderController.charge()` is
lifted onto `PricedOfferMixin.collect(customer, key, reason)` so `Menu`
and `Tariff` share one settlement path (a controller-private folded onto
the object). Player-rendered services bill through the same fixture:
`repair`, `treat` and `analyze postmortem` call
`Tariff.resolveFor(actor)?.collect(customer, key, …)` when the actor is
on shift for the business operating there and the customer is not the
actor (the customer is the item's chattel owner for a repair, the patient
for a treatment). Treatment is **player-medic only** in this build — the
NPC-medic act needs a brain that makes clinical decisions, which is W14's
judgment loop performed by software, and that is a Deferred seam. Lens 2
chose the fixture: a second clinic is a `Tariff` row and a business row.

### D18 — The guard contract needs kernel code, and this is the finding

The board's clause vocabulary is closed to `delivery | supply`. A guard
contract needs: a third `CONDITION_TEMPLATE` **`watch`** (`{ place,
gameHours }`), its phrase form in `JobController.parseCondition` (`watch
<place> for <n> hours`), a `holdsFor` that reads accrued watch on the
`ContractRecord`, a `WatchEngagement` (`SustainedEngagement` claiming
`body`+`hands`+`attention`, leaving `voice`) started by a new `watch`
verb (`cmd/work/watch.yaml`, afforded by the board's claim — it rides the
claimant like `fulfill`) that stamps `ContractApi.noteWatch(contractId,
place, seconds)` on release, and nothing else — a guard's value is
presence with free hands. Four kernel touches; stated loudly as the
requirements asked.

### D19 — W0c's census is two classes, ratcheted, read before W1 starts

`lint:unconsumed-seams` counts (a) every `fieldMeta` field on a data Idea
under `platform/idea/**` (non-cmd, non-api) with no reader outside its
declaring file across kernel + packs, and (b) every `@hook`-tagged method
with zero overrides across kernel + packs. Ceiling = the measured count
at W0c; may fall, never rise. The census output is pasted into this plan
under W0c before W1 starts, and any seam it finds that belongs to this
build is added to the wave it belongs to (the slate's instruction).

### D20 — Aftermath is emission, not a system

Per Thesis 11, W6 adds the after-read (what each side is left with:
wounds, worn gear, the disciplines tested) as narration from a
session-scoped `runResolutionConsumers`, and nothing else. Every durable
product of a fight (accountability, chronicle, regard, wear, the corpse)
already has its consumer.

---


### D21 — Fluid restores VOLUME, never blood; the restore is capped well below baseline

⚠⚠ **Raised by the user after the plan was written, and it is a real
collision.** W11 as first drafted had `bloodVolume` *"climb toward
baseline"* on hydration. That **silently deletes the premise of
[blood-slate](../slates/builds/blood-slate.md)**, whose whole gap is:

> *"Nothing replaces the blood. You can stop a bleed; you cannot undo
> one… the treatment for a big one is a thing the world has no way to
> produce."*

A full restore gives the world exactly that way — drink and wait — and
demotes transfusion from a treatment to a convenience, leaving that build
with nothing to be for.

⭐ **It is also physiologically wrong, and the correct model is the one
that preserves the other build.** Drinking restores **plasma volume, not
red cells**: a body that has lost a lot of blood and taken on water has
its volume back and its oxygen-carrying capacity still gone — dilutional
anaemia, which is precisely *why* transfusion exists.

**The decision:** `bloodVolume` climbs on hydration only to
`METABOLIC_DEFAULTS.PLASMA_RESTORE_CEILING_FRAC` of the species baseline
— a **fraction, not the baseline**. Enough to walk a body back out of the
immediate hypovolemic danger; never enough to make it whole. The
remaining deficit is what blood-slate's transfusion is for, and this
build hands that build a *sharper* motivation than it had: a survivor who
is permanently short until somebody gives.

⚠ The ceiling is a dial, but **that it is below 1.0 is a shape decision,
not a tuning one.** A future change that raises it to baseline is
deleting another build's reason to exist and must be argued as such.

### D22 — An effect naming a vital a species does not have is a NO-OP, never an error

Forced by D4 + W11 and flagged first as
[blood-slate](../slates/builds/blood-slate.md) open question 6: *"Species
with no blood — `constructa`, `plantae` and `fungi` clades exist. Do they
bleed at all?"*

The 23 rows and the trauma table now declare effects naming specific
vital signs (`bloodVolume`, `spo2`, `coreTemperature`). A clade whose
`Species.vitalProfile` has no entry for the named sign must **absorb the
effect silently**, not throw and not zero-fill: a construct that takes an
edge blow has a wound, and no bleed, and that is the honest answer.

⚠ It must be a *deliberate* no-op with a test, because the failure mode
is the silent-and-closed one this whole build exists to end — an effect
that does nothing because nobody wrote the branch reads identical to an
effect that does nothing because the author said so.
## ⭐⭐ Host placement

For every new field, mixin and class: which host carries it, and what
composing it claims about everything else on that host. The test: if a
guard is needed to re-narrow the host set, the host is wrong.

| what | host | claim it makes, and why it holds |
|---|---|---|
| `VitalEffect` union, `ProgressionSpec.law`, `ResolutionSpec.atStage`, `applyEffects` interpreter, `expressionSuppression()`, `isSlotImpairedByCondition` | **`VitalsMixin`** (`lib/vitals/Vitals.ts`) + the vocabulary in `platform/idea/Condition.ts` | Every body that can carry a condition can have that condition act on it. `VitalsMixin` composes only onto `Creature` (vitals.md), so the claim is "every creature", which is exactly the set that bleeds today. No guard. |
| `TraumaBehavior.signature`, `TraumaBehavior.resolution` | the closed `TRAUMA_BEHAVIOR` table (`platform/idea/Condition.ts`) | The engine trauma vocabulary declares its consequences and its treatment beside its tick, the way it already declares `describe`. Kind B stays a closed engine vocabulary (slate lens 2). |
| `AfflictionRecord.inflictedBy?` | the record (`platform/idea/Condition.ts`) | Plain scalar, persists free (the `Trauma.inflictedBy` precedent). |
| `Poise.ceiling` | **`Poise`** (`lib/combat/Poise.ts`) | Session-scoped like the scalar it caps; evaporates with the session. Never on the body — a wound's *lasting* cost is the trauma itself, already there. |
| `CombatantState.exercised`, `.exchangesWon/.exchangesLost`, `.woundsTaken` | **`CombatantState`** (`lib/combat/CombatSession.ts`) | Per-fight tallies; nothing outside the session reads them; they die with it. |
| `Morale` value-object | `lib/combat/Morale.ts` (a named value-object, the `Sharpness` file shape) | Pure function; holds no state. No mixin, no field — Thesis 13's "never stored morale points" is structural. |
| `Weapon.exercises: string[]` | **`Weapon`** (`platform/thing/equipment/Weapon.ts`) | A weapon says what skill it exercises. Not on `Wieldable` (a shield, a torch, a tool are wieldable and exercise nothing in a fight); not on `WeaponProfile` (derived, and a Discipline cannot derive from mass). The one place `lint:inert-weapon` already walks. |
| `CompetenceBand.lowered(band, n)`, `.difficultyAgainst(mine, theirs)` | **`CompetenceBand`** (`lib/advancement/CompetenceBand.ts`) | Band arithmetic beside the band vocabulary; both are pure. |
| the floor + the above-band rule | **`Competence.derive`** (`lib/advancement/Competence.ts`) | Estimator policy lives in the estimator so `seedRunFor` and `lint:dossiers` fold the same function. |
| suppression applied at the read | **`AdvancementMixin`** (`lib/advancement/Advancement.ts`) | The mixin that owns the surface applies the term at the surface. The `MixinApi.isVitals` read is composition (a host with no body has nothing to suppress), not a re-narrowing: today every `AdvancementMixin` host is a `Character`, which is a `Creature`, which has Vitals. |
| `onDefeated` / `onDefeatedFoe` default bodies | **`CombatantMixin`** (`lib/combat/Combatant.ts`) | The combatant credits its own transcript; `MixinApi.isAdvancing` narrows (the mixin is on `Character` below `AdvancementMixin`, so the runtime `this` carries both — the `refreshConferrals` precedent). Already allowlisted in `lint:combat-dynamics`. |
| `ConditionApi.afflict/relieve/conditionsOf` | **`api/condition.ts`** + `ConditionLogic` | The subsystem's existing Api grows three statics; no new Api (Apis are per-subsystem). |
| `Tariff` | **`platform/thing/Tariff.ts`** (`PricedOfferMixin(DetailedMixin(Thing))`) | A priced fixture is a Thing in a room, the `Menu` precedent exactly. Not on `Business` (prices live on fixtures — retail.md, and a business with two counters prices them differently). |
| `PricedOfferMixin.collect(customer, key, reason)` | **`PricedOfferMixin`** (`lib/commerce/PricedOffer.ts`) | The fixture that prices collects; `Menu` and `Tariff` share it. Claims every priced fixture can settle to the business operating at its location — true of both consumers. |
| `Postmortem.interIn(grave)` | **`PostmortemMixin`** (`lib/mortality/Postmortem.ts`) | The corpse is interred; it already owns the clock and the eviction opinion. Composed on `Creature` — the claim "every creature can be buried" is honest (a hanging carcass too). |
| `watch` clause template + `holdsFor` | `lib/employment/Condition.ts` | The closed vocabulary grows by one, where the doc says the extension seam is. |
| `WatchEngagement` | `lib/employment/WatchEngagement.ts` (`SustainedEngagement`) | Beside the contract it serves; the `AttendanceEngagement` shape. |
| `ContractRecord.watchedSec` | the record (`lib/employment/ContractRecord.ts`) | Accrual lives on the contract it settles, not on the worker — a guard's watch is *for* a contract. |
| `bludgeons`, `polearms`, `flails`, `forensics` Discipline rows | content (`packages/content/platform/content/platform/idea/Discipline/`) | Pure data, zero code (the advancement.md rule). |
| the clinic, repair shop, necropolis | **venue packs with no `src/`** (the `hearthworks` precedent), composing platform verbs + `trade-smithing` fixtures by `props:`; the two new stanza controllers (`analyze patient`, `analyze postmortem`) ship in **one new capability pack `trade-medicine`** (root `/trade/medicine`) | The instrumentation split: a stanza on the platform's `analyze` view whose controller lives in the trade. Both stanzas read a body and grade `medicine`/`forensics`, so they share a pack ancestor. A second clinic/necropolis is rows only. |

**Rejected placements, so nobody re-proposes them:** a `Diminished`
mixin on `Avatar` (death is body-state; a Cast NPC can die too);
suppression stored on `MortalArc` (the arc is the identity's durable
record, not a clock); morale on `CombatantState` as a scalar (Thesis 13);
`exercises` on `WeaponProfile` (derived from shape; a skill does not
derive from mass); a `ServiceMixin` on `Business` (prices are on
fixtures); a `Treatable`/`Patient` mixin (every creature is already a
patient; that is `VitalsMixin`).

---

## Convention conformance

Checked at plan time against the current tree, not recalled:

- **`props:` / `cast:`** (`lib/stuff/Populates.ts`; `populates:` is
  retired): every room row in W13/W15/W16 places fixtures under `props:`
  and `Crafter`/`Extra` NPCs under `cast:`. A `Behaved` class in `props:`
  throws at boot.
- **Locations, not rooms:** venue rows are `CartesianLocation` rows with
  coords (⭐ every location plots — the metal-chain lesson);
  `FurnishableRoom` only if somebody furnishes it (nobody does here).
- **`<root>/<branch>/`:** `trade-medicine` claims `/trade/medicine`;
  controllers at `/trade/medicine/idea/cmd/perception/*Controller`, views
  as stanzas on the platform's `cmd/perception/analyze.yaml` (the
  `measure strike` precedent). Venue packs claim `/world/<locality>`.
  Every new template path lies inside a pack's `requires.title`
  (`lint:untitled`).
- **Module scope declares; lifecycles initialize:** `Morale.ts` and the
  effect interpreter are pure; no module-scope statements.
- **Import boundary (`lint:imports`):** nothing new imports outside
  `src/mud/`; the gate scripts under `scripts/` are outside the tree.
- **Module categories:** no new category. New files are a Stuff class
  (`Tariff`), a mixin-adjacent value-object (`Morale`), an engagement
  (`WatchEngagement`), controllers, a gate script + fixture + test. **No
  free helper functions**: `OrderController.charge` folds onto
  `PricedOfferMixin.collect`; band arithmetic onto `CompetenceBand`;
  morale onto a value-object class with statics.
- **Verbs on objects:** `corpse.interIn(grave)`, `tariff.collect(...)`,
  `poise.lowerCeiling(...)`, `combatant.onDefeated(ctx)`; the two new
  Api statics take a target as `ConditionApi.inflict` does — the
  `lint:object-verbs` census stays at zero (it exempts `ConditionApi`'s
  producer shape as it does `inflict` today; confirm at W7 with
  `--list`, and if it fires, the door takes a `{target, …}` spec like
  `InflictSpec`'s sibling rather than a widening of `EXEMPT_APIS`).
- **`requiresWizard`:** not used anywhere in this build.
- **No migrations:** D15 and D4's `ProgressionSpec` shape change mean the
  dev DB is dropped at W8 and W10 (`pnpm dev:clean`, drop the worktree's
  DB, reboot).
- **No new Mongo collections.**

**Lint gates this build must pass** (the family runs derived; these are
the ones it touches):

| gate | why it fires here |
|---|---|
| `lint:condition-arms` | **must fall** 7 → 5 (W8a), parallel 1 → 0 (W8b); ceiling and list edited in the same commits |
| `lint:unconsumed-seams` (new, W0c) | ceiling measured at W0c; falls at W3, W7, W8, W9, W12, W13 |
| `lint:combat-dynamics` | W1–W6 add no `MixinApi.isX` to `CombatLogic.ts` / `lib/combat/*` beyond the allowlist |
| `lint:inert-weapon` | `exercises` is authored, not derived; unaffected, but the rows are re-walked |
| `lint:dossiers` | D1/D2 must leave every `asserting:` fold unchanged |
| `lint:instanceable` | `Tariff` at `/platform/thing/Tariff`; `Morale`, `WatchEngagement` under `lib/` and never instanced from a row |
| `lint:census` / `lint:untitled` | every new `props:` path and pack path resolves and is titled |
| `lint:arg-kinds` | `watch`, `fight parley`, the two `analyze` stanzas declare `requires:` |
| `lint:topics` | new topics `combat.footing`, `combat.aftermath`, `act.service` are authored descriptors |
| `lint:field-meta` | `Weapon.exercises`, `Tariff.services`, `ContractRecord.watchedSec` entries well-formed |
| `lint:schema` | `contracts` schema doc gains `watchedSec` |
| `lint:object-verbs` | stays at zero (above) |
| `lint:whole-table` (new on master) | ⚠ **an Api may not hand back its table.** Flags `.find`/`.filter`/`[0]` right after a whole-collection read. Watch W17's contract lookup (`board.allContracts().filter(…)` is the shape it fires on — ask the board for the claim, don't fetch the table) and W12's condition read (host-internal `this.conditions` is fine; a *consumer-side* `getConditions().find(…)` is not) |
| `lint:world-scan` (new on master) | no new world-wide registry read; W12's suppression is a per-host field read |
| `lint:gates` | the new `FromModule` strings on `ConditionLogic.afflict/relieve/conditionsOf` resolve |
| `lint:test-bootstrap` | every new test touching the wired runtime imports `test-bootstrap` |
| `lint:perishable` / `lint:pathogens` | untouched but re-run (W11 edits pathogen rows) |

---

## Waves

Numbering follows the slate (four movements). `W0a` is done on this
branch. Each wave: goal, decisions, files, acceptance, commit.

### Movement I — the instruments

#### W0b — the couplings as characterization tests

*Goal.* One test per row of the slate's "what is actually wired" table,
so the two absent edges are absent **on purpose** and W1/W8 flip them.

*Files.* `lib/combat/__tests__/couplings.characterization.test.ts` —
Sharpness band→value (0.35→1.0, `composure` absent ≡ 1); `energyFor`
steady 1.2 … open 4.5; `restore` capped by `enduranceRatio`;
`focusMultiplierFor` > 1 with two attackers; weapon wear on strike and
parry; **wound→poise absent** (a landed `bites-deep` leaves the target's
band exactly where pressure alone put it). `lib/vitals/__tests__/couplings.characterization.test.ts`
— fracture greys `canOccupy`; the limp drains on traverse;
`LoadBearing` band→capacity; armour wears per blow (`ConditionLogic:927`);
**signature→vitals absent** (a row with a non-empty `signature` changes
no vital sign over an hour).

*Acceptance.* All green; the two "absent" tests are named so their flip
in W1/W8 is a one-line edit.

*Commit.* `build(consequence W0b): the couplings as characterization tests`

✅ **Done.** 8 tests, green first run. ⭐ **The wave shrank, and that is
the finding:** most of the table the plan drafted is *already*
characterized — fracture → `canOccupy` and the trauma decay laws in
`Trauma.behaviors.test.ts`, weapon + armour wear in
`CombatLogic.gearwear.test.ts`, the Sharpness curve and its inert
`g(composure)` in `Sharpness.test.ts`, `restore` capped by endurance in
`Poise.test.ts`, `LoadBearing` in its own gauge test. Duplicating them
would have been noise, so both files cite them by path instead and carry
only what was genuinely unpinned. What shipped:

- `lib/vitals/__tests__/couplings.characterization.test.ts` — **three
  absent edges**: a row that *declares* a `signature` moves no vital sign
  over three hours (W8 flips it; the row's own `progression` **does**
  stage, which is what makes the silence damning rather than ambiguous);
  a burn costs no blood (W11); a bruise costs no endurance (W11).
- `lib/combat/__tests__/couplings.characterization.test.ts` — **the
  absent edge**, by a paired run: two identical fights differing only in
  the defender's plate, so one is wounded and one is not, and both end
  the beat **in the same poise band**. Plus `Poise.restore` having no
  ceiling but endurance (W1 adds one). Two live edges pinned for
  contrast: `energyFor` (the same strike bites deeper into an open
  guard) and the focus multiplier.

⭐ **The paired-run instrument is legitimate here because combat is
deterministic** — `grep` for `Math.random` / `UncertaintyApi` in
`CombatLogic.ts` returns nothing. Recorded because a future stochastic
element would silently invalidate the shape.

#### W0c — `lint:unconsumed-seams`

*Goal.* The instrument that would have found this slate's findings (D19).

*Files.* `packages/server/scripts/check-unconsumed-seams.ts` (exports
`unconsumedIn(files)`; `SEAM_CEILING` set to the measured count; an
enumerated `KNOWN_EXTENSION_ONLY` list, **empty at first**, so an
allowlisting is a visible diff), `scripts/__fixtures__/unconsumed-seam-shapes.ts.txt`
(must-fire: a `fieldMeta` field read only by its own accessor; a `@hook`
with no override — must-not-fire: a field read from another file by
accessor; one read by bracket in a Hydrator; a `@hook` overridden in a
pack), `scripts/__tests__/check-unconsumed-seams.test.ts`,
`packages/server/package.json` (`"lint:unconsumed-seams"` — the derived
roster picks it up), `docs/lint-family.md` (one entry). Walks kernel +
every pack `src/` via `scripts/pack-roots.ts`.

*Acceptance.* `pnpm -C packages/server lint:unconsumed-seams --list`
output **pasted below this wave in the plan** before W1 starts; the
ceiling equals the count; the fixture test proves both halves fire;
`lint:family --list` shows 31 gates. Any seam the census names that
belongs to this build is added to its wave here.

*Commit.* `build(consequence W0c): lint:unconsumed-seams — census 21, ceiling set`

✅ **Done.** 33 gates in the family, all green; 14 fixture tests.
`SEAM_CEILING = 21`, `KNOWN_EXTENSION_ONLY = []`.

#### The census, pasted as D19 requires

```
unconsumed seams — 21 found

  declared-and-unread FIELDS: 4
    platform/idea/Condition.ts            661  Condition.contagion
    platform/idea/species/Species.ts      529  Species._parentCladePath
                                          531  Species.lifecycleStates
                                          534  Species.lifespanMin

  un-overridden HOOKS: 17
    lib/combat/CombatHookContext.ts       118  CombatVenue.onCombatOpened
                                          131  CombatVenue.onBloodDrawn
                                          145  CombatVenue.onCombatResolved
    lib/combat/CombatReactive.ts           59  CombatReactive.onWielded
                                           69  CombatReactive.onUnwielded
                                           97  CombatReactive.onStrikeResolved
                                          109  CombatReactive.onStruck
                                          119  CombatReactive.onParry
                                          131  CombatReactive.onBypassed
    lib/combat/Combatant.ts               123  Combatant.onSessionEntered
                                          134  Combatant.onExchangeResolved
                                          144  Combatant.onPoiseBandChanged
                                          154  Combatant.onDowned
                                          164  Combatant.onDefeated
                                          175  Combatant.onDefeatedFoe
                                          186  Combatant.onCoupBegun
    lib/magic/Memorized.ts                132  MemorizedMixin.competenceRankFor
```

#### ⭐⭐ What it found that the plan did not have

**Seventeen of the twenty-one are combat hooks.** `Combatant` (7),
`CombatReactive` (6) and `CombatVenue` (3) are the three surfaces
`docs/subsystems/combat-hooks.md` calls *"the wizard-facing combat
extension grammar"*, and **not one of them is composed by anything that
ships** — not in the kernel, not in any of the 42 packs. Only test
doubles implement them. The grammar is complete, documented, invoked by
the engine at the right moments, and spoken by nobody.

That is the same shape as `signature`/`resolution`/`contagion` at four
times the size, and it independently corroborates the slate's Finding 0
from a direction the slate never looked.

⚠⚠ **This build wires three of the twenty-one and deliberately leaves
the rest.** W3 gives `onDefeated`/`onDefeatedFoe` default bodies; W13
gives `contagion` a reader. **Ceiling falls 21 → 18.** Inventing
consumers for the other seventeen would be *exactly the mistake the arm
census exists to stop*, in a new costume: the `progressing` arm was added
because somebody found a declared-and-unread field and filled it rather
than asking why it had no reader. A hook earns a consumer when something
genuinely needs to hook it. Recorded here, and the gate now holds the
number so the next build inherits the question instead of rediscovering
it.

⭐ The four field seams that are **not** this build's: `Species`'s three
(`_parentCladePath`, `lifecycleStates`, `lifespanMin`) belong to the
maturation/lifespan axis — → species-slate, added to Deferred seams.

#### The gate's own three false-positive shapes, and the fix

The first cut reported **38**. Twelve were false, from three shapes worth
recording because each is a repo convention rather than a bug:

1. a `protected _foo` read through `getFoo()` — the underscore defeats
   `get` + capitalize;
2. ⭐ a **boolean read through its predicate-form getter** (`respires` →
   `isRespiring()`) — the CLAUDE.md convention, which *no* name
   derivation can reach;
3. an interface `@hook` implemented by the mixin **in the same file**
   (`Detailed.applyDetails`), where "no override outside the declaring
   file" is the wrong question entirely.

The fix for 1 and 2 was to stop guessing the accessor's name and
**derive** the read surface — which methods actually read `this.<field>`.
The fix for 3 was body shape: a `@hook` counts only as a **terminal**
(empty body, bare-constant return, or a bodiless contract). That is also
what separates `Combatant.onDefeated` (dead) from `Detailed.applyDetails`
(a Hydrator applier, no caller and no override, entirely alive). All
three are pinned in the fixture.

### Movement II — combat that resolves

#### W0d — the floor and the above-band rule *(⚠ a live bug fix — the FIRST behavioural change)*

⚠⚠ **Promoted out of W3 by the user's call.** This is not a safety rail
for a new feature: a whiff already mints an `easy` failure every
exchange (`CombatLogic:4929`), which is the maximal-sting case, so
**characters on the live world are being de-ranked today**. It touches
`Competence.ts` and `CompetenceBand.ts` and nothing else, depends on no
wave before it, and is independently landable. W0b and W0c precede it
only because they are *instruments* — a test file and a lint script,
neither of which changes runtime behaviour — so **this is the first wave
that changes the world**, and if the build is ever cut short the
de-ranking bug is already fixed.

*Goal (D1, D2).* `lib/advancement/Competence.ts` —
running θmax + the band floor; the above-band failure skip;
`lib/advancement/CompetenceBand.ts` — `lowered(band, n)`,
`difficultyAgainst(mine, theirs)`, `oneBelow`. Tests in
`lib/advancement/__tests__/Competence.floor.test.ts` pinning the measured
scenarios: 20× hard✓ + 6 standard✗ stays ≥ `proficient`; 10× standard✓ +
10 formidable✗ is unchanged; 50× hard✓ + 1 loss is Δθ ≈ 0; 200× easy✓
still saturates at `competent`; `seedRunFor` returns the same runs for
all five bands; `lint:dossiers` green.
*Commit:* `fix(consequence W0d): the floor and the above-band rule, derived in the fold`

✅ **Done.** 15 new tests; the 6 existing advancement suites, 48 files of
magic / practicum / medical / perception / combat consumers (410 tests)
and all 33 gates green — `lint:dossiers` included, as D1 predicted from
construction (both rules touch only `failure`/`partial` rows, and every
dossier claim is seeded as `success`).

**Shipped.** `CompetenceBand` gained the arithmetic both rules need and
W3/W12 will reuse — `lowered(band, n)`, `oneBelow`, `higher`,
`difficultyAgainst(mine, theirs)` (the rank gap mapped onto the
difficulty ladder) and `bandFor(difficulty)` (the identity map between
the two five-rung ladders). `Competence.derive` gained a running `θmax`
and the two rules, both inside the single existing pass.

⭐ **`theta` stays raw and only the BAND is floored.** That was not
spelled out in D1 and is load-bearing: everything downstream re-derives
from the band, so flooring the surface makes the promise the player is
shown, while flooring `theta` would have made the *next* fold inherit a
fiction and compound it.

⭐⭐ **The above-band rule is order-dependent, and that is correct rather
than a wart.** The band a row is compared against is the one the fold has
reached *at that row*, so a formidable failure that meant nothing to a
novice means something once the same character has become an expert. A
test pins it (`the rule re-legislates as the history plays forward`),
because the alternative reading — compare against the final band — would
retroactively excuse an expert's whole apprenticeship.

⚠ One tuning fact worth having in front of W3: after this wave a
`trivial` failure still costs everybody, because `trivial` maps to
`untrained` and no band sits below it. The rule excuses being outclassed,
never fumbling something anyone could do.


#### W1 — wound → poise

*Goal.* The loop closes: getting cut staggers you; staying cut keeps you
losing (D10). First, smallest, not a stretch.

*Files.* `lib/combat/Poise.ts` (`ceiling` field, `lowerCeiling(to)`,
`restore` folds `min(enduranceRatio, ceiling)`, `ceiling()` read);
`platform/idea/api/CombatLogic.ts` — after `commitInflict` in `land`
(:1936), `exploit` (:1917), `reactiveDispatch` (:2053) and `partingShot`
(:4796): `if (landed) applyWoundToPoise(targetState, report)` as a
module-private beside `commitInflict`; the state factory / `snapshotBandsImpl`
seeds `ceiling` from the body's live trauma (`MaterialApi.severityToBand`
over `getConditions()`); `lib/config/AppSettings.ts` +
`packages/content/platform/content/settings/combat.yaml` — `combat.wound.spend.grazes`
(0.05) / `.bites` (0.15) / `.bitesDeep` (0.3), `combat.wound.ceiling.bites`
(0.85) / `.bitesDeep` (0.6), `combat.wound.ceilingFloor` (0.4).
`scripts/__tests__/combat-gym.test.ts` — re-pin the canonical cells and
the formation cells; add one cell asserting a first-blood cut turns a
previously even matchup. W0b's absent test flips.

*Acceptance.* `pnpm test:near` + `pnpm test:gym` green with new pins;
`lint:combat-dynamics` green (no new predicate); the gym's "no policy
dominates" and NPC≈PC cells still hold.

*Commit.* `build(consequence W1): a landed wound spends poise and caps recovery`

#### W2 — the poise read

*Goal.* Per-exchange narration of the delta — prose, never a card (D11).

*Files.* `lib/combat/CombatNarration.ts` (`narrateBandChange({combatant,
from, to, beat})` with a self line per direction — *you give ground* /
*you find your feet* — and a peers line; `ExchangeReport.footingLost?:
boolean` adds a clause to the land line); `CombatLogic.ts`
`dispatchBandChanges` (:2969) calls it beside the hook; `narrate` (:3459)
sets `footingLost` when W1's spend crossed a band; topic `combat.footing`
authored in the topic catalogue (`lint:topics`). Snapshot tests in
`lib/combat/__tests__/CombatNarration.test.ts`.

*Acceptance.* A fixture fight's transcript shows the crossing in words
on the beat it happens; no digit ever appears in a poise line (a test
greps the rendered lines for `\d`).

*Commit.* `build(consequence W2): the poise read — you give ground, in words`

#### W3 — the outcome model: winning pays *(the floor moved to W0d)*

*Goal (D5, D6).* `platform/thing/equipment/Weapon.ts`
(`exercises: string[]`, `fieldMeta` authorable + persistent, `getExercises()`);
the eleven arms rows; three Discipline rows (`bludgeons.yaml`,
`polearms.yaml`, `flails.yaml`, each `specializes: [melee-combat]`,
`iscedf: "1014"`, the meaning written beside the code); `lib/combat/CombatSession.ts`
(`exercised: Set<string>`, `exchangesWon`, `exchangesLost`,
`woundsTaken: OutcomeBand[]` — the last also feeds W4); `CombatLogic.ts`
— `resolveExchange` accumulates the tallies; `snapshotBandsImpl` reads
the max over `melee-combat` + the wielded weapon's `exercises`;
`lib/combat/NaturalAttack.ts` gains the pure profile→difficulty map (D6)
and `difficultyFor` routes non-sentient opponents through it (sentience
via `SpeciesApi.isSentient`, never a new `MixinApi.isX` in `lib/combat/`
— `lint:combat-dynamics`); retire
`mintExchangeSignature` / `outcomeToResult` / the transcript-only `difficultyFor(target)`
and the two tests that pin them (`CombatLogic.test.ts:2286/:2309` become
fight-level assertions); `yieldFight` names the killer as `lastStruckBy
?? sole live foe`; `lib/combat/Combatant.ts` — `onDefeated` /
`onDefeatedFoe` default bodies mint the fight signature (brain-driven
hosts bank nothing — read `ctx.targetState.brainPath`); `MELEE_COMBAT_DISCIPLINE`
folds into `MELEE_DISCIPLINE`. Tests: a fixture fight credits the loser
`failure` at the right difficulty and the winner `success`, both only
for disciplines in `exercised`; a draw credits nobody; ⭐ **a large-bodied beast reads `hard` and a rat reads `easy`** (D6), so losing to a wolf is a story rather than a career setback; `lint:unconsumed-seams`
falls by 2. Gym: the pinned cells are unaffected (crediting is
post-resolution) — assert the hook-fire counts still match.
*Commit:* `build(consequence W3): winning pays — the two empty hooks credit the disciplines you used`

#### W4 — morale & surrender

*Goal.* An opponent that gives up (D7, D8).

*Files.* `lib/combat/Morale.ts` (`Morale.bandFor(state, session,
foeState)`; dials `combat.morale.*` for the break points; inputs listed
in D7); `lib/behavior/combatant.ts` — read the band each beat: `breaking`
+ sentient + the edge's `stopCondition` at or past `yield` →
`host.yieldFight()`; `shaken` + a standing break offer → `host.offerBreak()`;
`breaking` + non-sentient → flee through the room's first traversable
exit (via `LocomotionApi.traverseWithDefault`, which calls `disengageImpl`);
`CombatLogic.ts` — `yieldFight` refuses when every live foe is
non-sentient (prose through `CombatNarration`); `assessCombat` reports
the foe's morale band; `CombatNarration` — a *waver* line on the
transition to `shaken` and a *breaks* line on `breaking` (peers see the
tell). Gym: a cell where a non-lethal 1v1 against an outmatched sentient
ends in a `yield` before incapacitation; a cell where a wolf flees rather
than yields; the NPC≈PC parity cell still holds (a player's morale
narrates and never acts).

*Acceptance.* The default `stopCondition: yield` is finally something an
NPC does; the gym's death-seam cell count drops; `lint:combat-dynamics`
green (`isSentient` is read through `SpeciesApi`, not a `MixinApi`
predicate).

*Commit.* `build(consequence W4): morale as a read — an opponent that gives up`

#### W5 — de-escalation

*Goal.* The non-fighter's exits (D9).

*Files.* `packages/content/platform/content/platform/cmd/combat/fight.yaml`
(`parley` subcommand, `requires:` on the target);
`platform/idea/cmd/combat/FightController.ts` (`doParley` →
`combatant.parley(target)`); `lib/combat/Combatant.ts` (`parley`
forwards to `CombatLogic.parleyImpl`); `CombatLogic.ts` (`parleyImpl`:
resolves the beat as `defend`; sentient + `shaken|breaking` → dissolve
the edge via the break mechanism; no edges → `endWith(session,
"disengage")`; credits `awareness` at difficulty from the foe's morale
band); the `combatant` brain accepts a standing break offer when
`shaken` (already in W4); `CombatNarration` parley lines (accepted /
refused / "it has no ear for it"). Tests: a parley against a breaking
duelist ends the fight as `disengage` with no loss recorded for either
side; against a wolf it is refused; against a `resolute` foe it fails
and costs the beat.

*Acceptance.* Drive step 23 is reachable without a martial Discipline;
`CombatResolution.disengage` has its first caller.

*Commit.* `build(consequence W5): parley — the terms renegotiated down to no fight`

#### W6 — aftermath

*Goal.* The combat-side wake as emission (D20).

*Files.* `CombatLogic.ts` — `runResolutionConsumers` takes the session
for real (drop `void session`), and adds the after-read: for each
participant still present, a `combat.aftermath` scene naming what they
are left with (worst wound by `describe`, worn armour by the Attired
upkeep band, the disciplines `exercised` — "your bladework was tested");
`CombatNarration.narrateAftermath`. Topic authored. Tests: the after-read
fires once per participant on every resolution kind, including `draw` and
`disengage`.

*Acceptance.* Drive step 4's "look yourself over" has a combat-side
twin the moment the fight ends.

*Commit.* `build(consequence W6): the aftermath — what the fight left you with`

### Movement III — the body remembers

#### W7 — the `afflict` door

*Goal.* Nothing downstream is reachable without it (D12).

*Files.* `api/condition.ts` (`afflict(target, spec: AfflictSpec)`,
`relieve(target, cond)`, `conditionsOf(target)`; fix the stale header
comment); `platform/idea/api/ConditionLogic.ts` (three gated methods;
`afflict` resolves the row through the catalogue, stamps `inflictedBy`
from context, runs `canAfflict` via the body's own `afflict`);
`platform/idea/Condition.ts` (`AfflictionRecord.inflictedBy?`);
`CombatLogic.ts` `applyConsequence` `afflict` kind → `ConditionApi.afflict`;
`docs/subsystems/harm.md` correction note. Tests: the gate refuses a
direct caller; a hook rider's affliction carries the inflicter.

*Acceptance.* `lint:gates` green on the new `FromModule` strings;
`lint:object-verbs --list` unchanged at zero; `lint:unconsumed-seams`
falls (the `afflict` consequence now has a consumer through the Api).

*Commit.* `build(consequence W7): ConditionApi.afflict — the door`

#### W8 — the eight-arm unification *(two commits; the ratchet falls)*

*W8a — the effect channel and the one affliction arm (D4).*
`platform/idea/Condition.ts` — `VitalEffect` union (four kinds),
`ProgressionSpec.law`, `ResolutionSpec.atStage`, `TraumaBehavior.signature`
+ `.resolution` (D13's tokens), the `Condition` accessors unchanged;
`lib/vitals/Vitals.ts` — `applyEffects(effects, intensity, elapsedSec)`
(private), `expressionSuppression()` (public), `isSlotImpairedByCondition`
(renamed from `isSlotImpairedByTrauma`; reads `capability` effects on the
trauma type at the slot's part), and `reconcileConditions` rewritten so
`decayingMagic` + `infections` + `progressing` become one `afflictions`
arm dispatching on `row.getProgression()?.law` (`stage` → the dwell
counter; `decay` → the magic decay, `decayPerSec` on the row replacing
the `magicDreadDecayPerSec` dial read for rows that author it, dial as
fallback; `logistic` → `progressInfection`), each followed by
`applyEffects(row.getSignature(), intensityOf(record), elapsed)`; the
trauma arm calls `applyEffects(TRAUMA_BEHAVIOR[t.type].signature,
t.severity, elapsed)` after `tick`; the infection's hard-coded hydration
drain moves onto the five pathogen rows' `signature` (W11 authors them;
W8a carries the five rows so nothing regresses). `lib/slot/Slotted.ts:338`,
`MagicLogic.ts:428`, `CombatLogic.ts:3681` rename. The 23 rows gain
`progression.law` (`stage` where `intervalMs` is authored, `logistic` on
the pathogen rows, `decay` on the two magic rows, `burden` on the toxin
rows, `null` stays `null`). `check-condition-arms.ts` `ARM_CEILING = 5`.
W0b's absent test flips. Drop the dev DB (record shape changed).
*Commit:* `build(consequence W8a): signature is the effect channel — three arms become one, ceiling 7 → 5`

*W8b — the burden law absorbs the parallel store.* `Vitals.ts` — the
`burden` law: `stage` derived from `self.toxinLevelFor(type)` (a new
public read on `MetabolicMixin` beside `getBAC`, `MixinApi.isMetabolic`
narrow) against the row's `toxinBehavior.bands`; `Metabolic.ts`
`reconcileToxinConditions` keeps absorption, spawn/relieve, the purge,
and **stops writing `stage`**; `progressAffliction`'s toxin skip is
deleted; `check-condition-arms.ts` `KNOWN_PARALLEL_STORES = []`. Tests:
`Metabolic.toxin.test.ts` / `.alcohol.test.ts` / `.antidote.test.ts` read
the same bands from the same burdens.
*Commit:* `build(consequence W8b): the burden law — the parallel store is gone`

*Acceptance (both).* `lint:condition-arms` reports 5 arms, 0 parallel;
every existing vitals/metabolism/thermal/respiration/magic test green
(`test:near` over the four `lib/` folders + `platform/idea/api/__tests__/MagicLogic*`);
a body three days into starvation still stages; a dread still decays; an
infection still drains hydration (now from its row).

#### W9 — `resolution.by` dispatched

*Goal.* Treatment differs by condition (D13).

*Files.* `platform/idea/cmd/medical/TreatController.ts` (resolve the
treatment offered → match against the target's declared resolutions →
refuse mismatches with prose → apply: `dressing` as today; `fluid` →
`Metabolic.ingest` from the offered vessel through the shipped bulk
transfer; `medicine` → the load knock; `antivenin`/`antitoxin` → the
`Metabolic` antidote seam when the offered item carries the token);
`platform/idea/cmd/medical/treat.yaml` (an optional `with <item>` arg,
`requires: any`); `Vitals.ts` — the affliction arm relieves a `by: rest`
condition at `atStage`; `docs/subsystems/harm.md`. Tests: a bandage on a
burn is refused; water on a burn works and consumes the water; `recovering`
clears itself at stage 12.

*Acceptance.* Drive step 9; `lint:unconsumed-seams` falls (`resolution`
has a reader).

*Commit.* `build(consequence W9): resolution.by — a burn needs fluid, a cut needs a bandage`

#### W10 — the capability term + the `governs` rename

*Goal.* Generalize what fracture does bespoke; unblock physiology (D15).

*Files.* `platform/idea/species/BodyPlan.ts:94` (`governs?: string[]`;
the validator checks each entry against `VITAL_SIGNS` today, a capacity
vocabulary later), `:467`; `lib/slot/Attired.ts:646/660/685/705`
(`part.governs?.length`); the three `BodyPlan` rows (7 lines); the three
tests; `BURN_BEHAVIOR.signature` gains `{kind: capability, disables:
'slots-at-site', aboveSeverity: 1}` and `FRACTURE_BEHAVIOR.signature`
`{…, aboveSeverity: HARM_DEFAULTS.FRACTURE_IMPAIR_SEVERITY}` (the shipped
constant, unchanged); `docs/subsystems/vitals.md`, `harm.md`,
`physiology-slate.md` (a one-line "unblocked" note). Drop the dev DB.

*Acceptance.* A hand burned above severity 1 cannot hold a shield; a
healed one can; the covering/insulation tests are byte-identical in
outcome; `grep -rn governsVital packages` returns nothing.

*Commit.* `build(consequence W10): the capability term, and governsVital → governs`

#### W11 — the 23 rows + the two dead traumas + plasma restores

*Goal.* Every affliction does what its author says (the content half of
D4), and the two numbers-that-count-down become consequences.

*Files.* `platform/idea/Condition.ts` — `BURN_BEHAVIOR` gets a
`signature` `[{kind: vital, sign: bloodVolume, perHour: −HARM_DEFAULTS.BURN_WEEP_L_PER_HOUR_PER_SEVERITY}]`
(the plasma weep, Finding 4) beside W10's capability term; `CONTUSION_BEHAVIOR`
gets `[{kind: reserve, reserve: endurance, pctPerHour: −HARM_DEFAULTS.CONTUSION_STIFFNESS_PCT_PER_HOUR}]`
(the sparring currency — small); `lib/metabolism/Metabolic.ts`
`reconcileMetabolism` — **plasma restoration (D21)**: while `hydration` is
above `METABOLIC_DEFAULTS.PLASMA_RESTORE_HYDRATION_PCT`, `bloodVolume`
climbs at `PLASMA_RESTORE_L_PER_HOUR` **toward
`PLASMA_RESTORE_CEILING_FRAC` of the species baseline — a fraction, never
baseline** (a reserve→vital coupling like `drainForLimp`, not an arm — it
iterates no conditions). ⚠⚠ The ceiling being below 1.0 is a **shape**
decision: at baseline this build would delete blood-slate's premise.
Effects naming a vital a species lacks are silent no-ops (D22);
the 23 rows authored per the table below; `AssessController.ts:170`
reads signs past `[0]` (all signs at `novice`+, the name at
`competent`+). Tests per row family in `lib/vitals/__tests__/rows.consequence.test.ts`
(warm the catalogue, afflict, advance an hour, assert the declared
effect and nothing else).

| row family | law | signature (intensity = stage) | resolution |
|---|---|---|---|
| `metabolism/{starvation,dehydration,emaciation,collapse}` | `stage` | reserve/vital effects the driver does **not** already own (`collapse`: none — it is a gate) | `rest` (`atStage` where the driver does not already clear it) |
| `metabolism/{alcohol,venom,lead,carbonMonoxide,ptomaine,botulinum-toxin,staph-toxin}` | `burden` | `venom`: `vital heartRate` ↑ + `reserve endurance` ↓; `lead`: `expression 1` (the cognitive tax, honest); `carbonMonoxide`: `vital spo2` ↓; the two food toxins: `reserve hydration` ↓; `alcohol`: none new (its effects are the shipped BAC readers) | the authored token (`antivenin`, `chelation`, `air`, `rest`) |
| `thermal/{hypothermia,hyperthermia,torpor}` | `null` (the thermal driver owns the clock) | `reserve endurance` ↓ (shivering / heat exhaustion); `torpor`: `expression 1` | `warmth` / `cooling` / `warmth` |
| `respiration/asphyxiation` | `null` | none new (respiration owns `spo2`) | `air` |
| `magic/{dread,overchannel-strain}` | `decay` | `dread`: `reserve endurance` ↓; `overchannel-strain`: `expression 1` | `rest` |
| `pathogen/*` (5) | `logistic` | the hydration drain moved from code (W8a) | `medicine` |
| `mortality/recovering` | `stage` | `expression 2` (W12 authors it; W11 leaves the row as W12 finds it) | `rest`, `atStage: 12` |

*Acceptance.* Drive steps 8–10; a burn victim who drinks recovers plasma
**to the ceiling and no further — still measurably short, and `assess`
says so** (D21) — and one who does not slides toward the exsanguination
window on the burn's own clock; a bloodless clade takes an edge wound and
no bleed, asserted rather than incidental (D22); a bruised sparrer is a little slower the next morning
and nothing else; `lint:perishable`/`lint:pathogens` green.

*Commit.* `build(consequence W11): twenty-three rows say what they do; a burn weeps, a bruise stiffens, fluid restores`

#### W12 — diminishment

*Goal.* Punishment across the board, temporary, never in the record
(D3, D16). The reference implementation of three of this build's
mechanisms on one row.

*Files.* `recovering.yaml` (D16's three blocks);
`lib/advancement/Advancement.ts` — the four surfaces apply
`CompetenceBand.lowered(band, self.expressionSuppression())` under
`MixinApi.isVitals`; `platform/idea/cmd/charactergen/CompetenceController.ts`
— renders a `(diminished)` marker beside a suppressed band and one line
naming why, so both facts of the criterion are visible; `docs/subsystems/mortality.md`
§ The recuperation model (decided). Tests: `Advancement.suppression.test.ts`
— a body under `recovering` at stage 0 reads two bands lower everywhere
(`competenceBandFor`, the digest, a Spell's `requiredBand` gate, combat's
`snapshotBandsImpl`), one lower at stage 6, its own band at 12; the
Transcript is byte-identical before and after; `chronicle` shows no new
row.

*Acceptance.* Drive steps 15–18; `lint:unconsumed-seams` falls
(`signature` has its third reader).

*Commit.* `build(consequence W12): dying diminishes everything for a while, and writes nothing`

### Movement IV — the wake

Every wave here passes the second-instance test: the pack ships the
mechanism once; a second venue is rows.

#### W13 — the diagnosis surface + the priced service + the clinic

*Goal.* Issue #38a, and the one kernel primitive Movement IV needs (D14,
D17).

*Kernel files.* `platform/thing/Tariff.ts` + `lib/commerce/PricedOffer.ts`
(`collect`, lifted from `OrderController.charge`; `Tariff.resolveFor(actor)`
static, the `JobBoard.resolveIn` shape); `platform/idea/cmd/retail/OrderController.ts`
(the service branch: `repair` / `revive` / `burial`; `revive` refuses a
non-shade customer, afflicts `recovering` at stage 6); `platform/idea/cmd/crafting/RepairController.ts`
and `platform/idea/cmd/medical/TreatController.ts` (three lines each:
`Tariff.resolveFor(giver)?.collect(customer, key, reason)` on
completion, customer = chattel owner / patient, skipped when customer is
the actor or no tariff prices it); topic `act.service`;
`docs/subsystems/retail.md` (the service key), `employment.md`.

*Pack files.* New capability pack `packages/content/trade-medicine/`
(`pack.yaml` claiming `/trade/medicine`; `src/idea/cmd/perception/AnalyzePatientController.ts`
— the `analyze patient <target>` stanza: signs by `medicine` band
(`untrained`: "something is wrong"; `novice`: all `observableSigns`;
`competent`: the candidate conditions whose signs overlap what is
observed — **plural, unranked**; `proficient`: the `resolution.by` and
`contagion.vector`; `expert`: the stage); `content/trade/medicine/thing/{cot,dressing-cabinet,tariff}.yaml`;
`content/trade/medicine/location/ward.yaml` (a furnished-ward bundle the
`bar.yaml` bundle precedent); the `analyze.yaml` stanza contributed as
the pack's `command-view` overlay the way `trade-mining` contributes
`measure strike`). Venue: the clinic as rows in `terminus` (Counting-House
Row has a medical gap) — `business.yaml` (a `physician` position
conferring nothing, a `porter`), `ward.yaml` with `props:` the tariff /
cot / cabinet + a `Stock` of bandages, `cast:` one `Crafter` medic with
`competence: [{medicine, proficient}]` and `shifts`. Tariff services:
`revive` priced; treatment key priced (billed when a player-medic on
shift treats).

*Acceptance.* Drive steps 11–14 and 19; issue #38a's "competence buys
information, not outcomes"; a second clinic authored in `rejection` as
rows only (the test is run, not assumed: the build agent authors it and
deletes it, or keeps it — the mining town needs one); `lint:untitled` /
`lint:census` green; `lint:unconsumed-seams` falls (`contagion` has a
reader).

*Wire.* Add `consequence.dirty.wire.test.ts` — the `analyze patient` envelope and the `order treatment` billing round-trip.

*Commit.* `build(consequence W13): analyze patient, the Tariff, and the first clinic`

#### W14 — the judgment loop

*Goal.* Issue #38b: stop auto-selecting; the medic chooses, and can be
wrong (slate Q7's kill test applies).

*Files.* `TreatController.ts` — `treat <target> for <condition> [with
<item>]`: the medic names what they are treating (a condition by sign or
name, matched against `analyze patient`'s candidates); the graded deed's
difficulty comes from the ambiguity (how many candidates shared the
observed signs — a world measurement) and its outcome from whether the
chosen condition was the one the body carried; a wrong choice spends the
supply, credits `failure`, and the body's course tells the medic (the
next `analyze` shows the signs unchanged); `treat.yaml` (`for` arg);
`packages/content/trade-medicine/…/Condition/` — **no new rows**; instead
W11's rows are checked for at least two pairs with overlapping
`observableSigns` (the pathogen family already overlaps by design). Tests:
two conditions sharing two signs; the wrong pick is graded `failure` at
`hard`, the right one `success`.

*Kill test.* If, after W8/W9/W11, no two shipped conditions are
distinguishable by their *course* (what they do over an hour), W14 is
cut rather than shipped as a rubric over a coin flip — recorded in this
plan, and the slate keeps it.

*Acceptance.* Drive step 13.

*Commit.* `build(consequence W14): the medic chooses — and can be wrong`

#### W15 — the repair shop

*Goal.* Issue #39 as content over W13's primitive.

*Files.* Rows only. A smithy venue: either the shipped `hearthworks`
smithy gains a `Tariff` (`props:` one line, `repair` priced) and a
service `order repair <item>` served by Berta on shift, or a second
repair shop in `rejection` — **both**, since the second is the test.
`packages/content/hearthworks/content/world/hearthworks/thing/tariff.yaml`;
`packages/content/rejection/…/smithy/` rows (`business.yaml` with a
`smith` position, the room with `props:` `/trade/smithing/thing/anvil` +
a forge + the tariff, a `Crafter` smith). The worn-armour read: no code
— `Attired`'s upkeep band already renders `worn`/`ragged`; W6's
after-read names it.

*Acceptance.* Drive step 20; issue #39's acceptance ("no engine
changes" — true of this wave); `repair` by an on-shift player smith bills
the harness's chattel owner.

*Commit.* `build(consequence W15): the repair shop — two of them, rows only`

#### W16 — the necropolis

*Goal.* Issue #40 + the forensic examination the decay curve has waited
for.

*Kernel files.* `lib/mortality/Postmortem.ts` (`interIn(grave)`:
`ContainmentApi.move` into a container fixture, a chronicle deed on the
deceased's identity — "laid to rest at …" — and the corpse stops vetoing
eviction at once; the grave keeps it); `docs/subsystems/mortality.md`.

*Pack files.* `packages/content/trade-medicine/src/idea/cmd/perception/AnalyzePostmortemController.ts`
— `analyze postmortem <body>`: reads `getForensicReadability()` and the
wound map; at readability `r`, the examiner sees `ceil(r × wounds)` of
the wounds (worst first) and the cause is *inferred* from them by the
`forensics` band (`competent`: the mechanism family; `proficient`: the
cause; `expert`: the time since death from the decay stage) — the stamp
is never read, so the reading can be wrong and gets worse as `r` falls;
credits `forensics` at difficulty from `1 − r`; `forensics.yaml`
Discipline (`specializes: [medicine]`, ISCED-F 0912). Venue: a
necropolis locality (rows) with titled plots (`PlatBook` over parcels,
the residence machinery), grave fixtures (an existing container fixture
class from `generic-objects`; `Marked` headstones by `props:`), a
`Business` (`undertaker` + `mason` positions), a `Tariff` (`burial`
priced, served by `order burial <body>` → `interIn`), a `Menu` of
stonework recipes.

*Acceptance.* Drive step 21; issue #40's "the headstone reads by touch in
the dark" (already true of `markForm: embossed` — a test asserts it); the
bereaved pays; a second necropolis is rows.

*Commit.* `build(consequence W16): the necropolis — read a body before it is gone, and bury it`

#### W17 — the guard contract *(the finding)*

*Goal.* Finding 5.2 over the board — **and it needs kernel code** (D18).

*Files.* `lib/employment/Condition.ts` (`watch` template, `holdsFor`
reads `record.watchedSec ≥ gameHours × 3600`); `lib/employment/ContractRecord.ts`
(`watchedSec`) + `packages/server/src/schema/contracts.yaml`
(`pnpm gen:schema`); `platform/idea/cmd/work/JobController.ts`
(`watch <place> for <n> hours` phrase); `lib/employment/WatchEngagement.ts`;
`platform/idea/cmd/work/WatchController.ts` + `packages/content/platform/content/platform/cmd/work/watch.yaml`
(afforded by the claim credential like `fulfill`; refuses off-place;
`cancel` releases and stamps); `api/contract.ts` `noteWatch`;
`docs/subsystems/contract.md` (the third template; the wall it was
behind). Content: a `props:` line placing the shipped `JobBoard` in the
mine (`rejection`) and an authored posting in the mine's business.

*Acceptance.* Drive step 22: while watching, `hew`/`haul`/`craft` are
refused by the engagement conflict and `say` is not; the contract settles
on the accrued hours; `lint:schema` green after `gen:schema`.

*Commit.* `build(consequence W17): the guard contract — a third clause, stated loudly`

### Closing

`docs: consequence — subsystem docs current` if not folded into the
waves; the drive; the MR. The subsystem docs each wave touches are
listed in the wave; `docs/subsystems/lint-family.md` and the roadmap
index line are left to the sweep (CLAUDE.md § Worktrees rule 5).

---

## Reachability wiring

Each link fails closed and silent.

| capability | verb | affordance | data | boot |
|---|---|---|---|---|
| wound → poise (W1) | none (inside the exchange) | — | `combat.wound.*` settings rows (merge-missing) | the settings pack installs them; a dial missing reads its code fallback — **assert the row exists** in the gym cell |
| the poise read (W2) | none | — | topic `combat.footing` descriptor | `lint:topics` |
| the credit (W3) | none (the hooks) | `onDefeated`/`onDefeatedFoe` fire from `endWith` for every named victim/killer — a yield in a melee now names one | `Weapon.exercises` on eleven rows; three Discipline rows | `DisciplineCatalogue` warms rows by descendant walk — a new row needs no list edit; **a row with a typo'd `specializes` is silently orphaned** — assert the three keys resolve in a test |
| morale (W4) | none | the `combatant` brain is invoked by the engine each beat for every brain-driven state | `combat.morale.*` rows | as W1 |
| parley (W5) | `fight parley <target>` | `fight.yaml` is contributed by `CombatantMixin.commandContributions` — the new subcommand rides it | `requires:` on the target arg | `lint:arg-kinds` |
| aftermath (W6) | none | fires from `runResolutionConsumers` on every resolution path (five callers — **check all five**) | topic `combat.aftermath` | `lint:topics` |
| `afflict` door (W7) | none | `ConditionApi` statics | — | `lint:gates` resolves the `FromModule` |
| the effect channel (W8) | none | every arm calls `applyEffects` | 23 rows' `progression.law` + `signature` | `ConditionCatalogue.warm` stands the rows; **a row whose `law` is misspelled advances nothing, silently** — W0c's census does not catch a bad *value*; add a `lint:conditions` value check to W8a's acceptance (a 20-line sibling of `check-pathogens.ts`, in the derived roster) |
| `resolution.by` (W9) | `treat … [with <item>]` | the shipped medical contributions | `TraumaBehavior.resolution` + rows' `resolution.by` | as W8 |
| capability term (W10) | none | `Slotted.canOccupy` reads it for every slot check | `governs` on three rows | the rename breaks nothing silently: the validator throws on an unknown key at hydrate |
| the rows (W11) | none | — | 23 rows | catalogue warm; `lint:conditions` |
| diminishment (W12) | `competence` shows it; `passage` applies it | `PassageController` is afforded by `IncorporealMixin` | `recovering.yaml` | catalogue warm |
| `analyze patient` (W13) | `analyze patient <target>` | the stanza is a `command-view` contribution of `trade-medicine` **overlaying the platform's `analyze.yaml`** — confirm the overlay merges subcommands rather than replacing the view (the `measure strike` precedent does; verify at W13 with `help analyze` on a booted world) | the stanza's `requires: VitalsMixin` | `SAXONBERG_PACKS` includes `trade-medicine`; the pack's `boot` list; **the deployment manifest** (content-packs.md § the capability rung) — a pack with `src/` that is not on the manifest boots nowhere |
| the Tariff (W13) | `order <service> [<item>]` | `Menu`/`Tariff` contribute `order.yaml` to environment (the `CommerceMenu.commandContributions` precedent — `Tariff` must declare its own) | `tariff.yaml` rows with `prices` + `services` | the fixture is a `props:` line; `EmploymentApi.ensureOperatorAt` stands the business up lazily on the first order — **the operating location must be the room the tariff is in** |
| treatment billed (W13) | `treat` | — | the tariff prices `treatment` | on-shift is derived from the roster tick — a medic outside their schedule bills nothing; the drive runs inside the shift |
| repair billed (W15) | `repair` / `order repair <item>` | `Anvil` affords `repair`; the tariff affords `order` | `tariff.yaml` | the forge's 900 K must be reachable — the shipped `hearthworks` forge is; assert `reachableHeatK` in the drive |
| `analyze postmortem` (W16) | `analyze postmortem <body>` | as `analyze patient` | `forensics.yaml` | as W13 |
| burial (W16) | `order burial <body>` | the necropolis tariff | grave fixtures on titled plots — the plot title must resolve (`ParcelApi.ownerOf`) or `place`/containment is refused | `lint:census` on every plot path |
| the guard contract (W17) | `job post watch <place> for <n> hours`, `watch` | `JobBoard` affords `job`; the claim's credential affords `watch` (the `fulfill` precedent — `CredentialWalletUpdate`) | a board in the mine (`props:`), `contracts.yaml` schema | `gen:schema`; `lint:schema` |

---

## Acceptance-criteria coverage

| requirement acceptance criterion | waves |
|---|---|
| A player who is cut mid-fight can tell the fight turned, from prose alone | W1 (the mechanism) + W2 (the read) |
| A player who loses a fight can name which skills it cost them, and it is the ones the fight used | W3 (`exercised` → the signature) + W6 (the after-read names them) |
| A long record cannot be reduced to a beginner by a run of bad luck, and the player can say so from what the game shows | **W0d** (D1) + W12's `competence` marker precedent (the band shown is the floored one) |
| Beaten by someone far better → not diminished | **W0d** (D2) + W3 (difficulty from the body, D6) |
| Dies → worse at everything for a while, history intact, both visible | W12 (suppression + the `(diminished)` marker; `chronicle` unchanged) |
| Tell a burn from a cut from a poisoning by what it does and what fixes it | W8 + W9 + W11 |
| An author adds a new affliction by writing a row, and a player meets it | W8 (law + signature) + W9 (resolution) + W7 (a way to afflict it) + W13 (a way to meet it: `analyze patient` shows it) |
| A medic can be wrong, find out, and is not told the answer | W13 (candidates, unranked) + W14 (the choice, graded by the body's course) |
| No martial skill, present at violence, survives without winning | W4 (a foe that breaks) + W5 (parley, break, flee) + W8/D8 (the beast is honestly different) |
| Somebody not in the fight earns money — a repair, a treatment, a burial | W13 (Tariff; treatment) + W15 (repair) + W16 (burial) |
| A second clinic, repair shop, necropolis with no new code | W13 (rejection's clinic), W15 (two shops), W16 (rows) — each wave's acceptance *runs* the test |
| Every row of the meet-or-defy table is true of the shipped game | rows 1–3, 6, 7, 9 are true today (Grounding); row 4 (XP loss) → W12; row 5 (levels buy survivability) → W1 keeps `Sharpness` on the contest and adds nothing to the body — a gym cell asserts an expert dies to a knife at `open` exactly as fast as a novice; row 8 (flee/surrender) → W4/W5 (an NPC can now do both) |

Nothing unmapped. The drive's 24 steps map: 1–5 → W1/W2/W3/W6; 6–7 →
W0d/W3; 8–10 → W10/W11/W9; 11–14 → W13/W14; 15–19 → W12/W13; 20 → W15; 21 →
W16; 22 → W17; 23–24 → W4/W5.

---

## Test & gate strategy

- **Unit** (`pnpm test:near` per wave): the estimator scenarios (W0d);
  the effect interpreter per kind and per law (W8); each row family's
  declared effect and *nothing else* (W11); the suppression at all four
  surfaces (W12); narration snapshots (W2, W4, W5, W6); the gate fixtures
  (W0c, the `lint:conditions` sibling); the clause `holdsFor` (W17).
- **Gym** (`pnpm test:gym`, its own CI job): re-pinned at W1; new cells
  at W1 (first blood turns a fight), W4 (yield before death; the wolf
  flees), the survivability row (an expert at `open` dies as fast as a
  novice). Run at W1, W3, W4, W5 and before the MR.
- **Pack suites**: `trade-medicine`'s own vitest (two controllers);
  `trade-smithing`'s (unchanged, re-run at W15).
- **Lint family**: `pnpm -C packages/server lint:family` at every wave
  end (cheap); the two ratchets' numbers recorded in each commit message
  that moves them.
- ⭐⭐ **Wire tests — a tier that did not exist when this plan was
  written** (`packages/wire`, landed on master). They flow over the **raw
  WebSocket and assert the ENVELOPE** — by `kind` and `reason`, never by
  the sentence that renders it — plus one-shot `mql-query` reads and
  counted prose. One boot per run; a suite that mutates the world is
  named `*.dirty.wire.test.ts`.

  **This build adds `consequence.dirty.wire.test.ts`**, and it takes most
  of what was previously drive-only:

  | claim | channel |
  |---|---|
  | `analyze patient` exists after the overlay merge (not `unknown-verb`) | envelope |
  | the lazy business stand-up + on-shift billing under a tariff | envelope of `order treatment` |
  | `competence` reports the diminished band after death, and the intact history | `mql-query` |
  | a fresh boot survives the two DB drops | the suite's own boot |
  | the `afflict` door refuses an ungated caller | envelope |

- **Still only the drive can prove**: the poise read *in the client's
  rendering* (the card surface treats `look` and combat lines
  differently — textiles found three defects exactly there, and an
  envelope assertion cannot see a rendering); and the reserve cost +
  suppression *felt* in the dorm, which is a judgement about whether a
  price lands, not a fact about a message.
- ⚠ `pnpm test` runs **twice**: before the MR opens, and at `/finalize`.
  Everything between is `test:near` + the touched packs' suites + the
  lint family, however large the wave (W8 included).

---

## Risks & opens

Things the build should price, and the two that need the user's eye.

1. ✅ **Finding 6 was wrong in its strong form — CORRECTED 2026-09-08**
   (commit `b2fe4eb4a`), in both the slate and the requirements doc,
   before this plan was committed. Combat whiffs (`CombatLogic:4929`) and
   failed treatments (`TreatController:92`, `:257`) write `failure`
   today; the false claim came from grepping for a *literal* where every
   production site *computes* the value. Scope is unaffected. ⚠ **What
   the correction promotes: the measured death spiral is LIVE.** A whiff
   against an `open` opponent mints an `easy` failure — the maximal-sting
   case (Δθ ≈ −0.22) — every exchange. **W3a's floor is a bug fix, not a
   safety rail for a new feature.** See the ordering note in Risk 13.
2. ✅ **A beast's opponent band (D6) — RESOLVED, and neither way it was
   first framed.** The shared-transcript read was a live correctness bug
   (losing to a wolf would sting *more* than losing to a master); an
   authored `Species.contestBand` violated "seeded, never declared". The
   difficulty now derives from `NaturalAttack.deriveProfile` — the body
   facts the species rows already author. ⭐ Content authors get the
   flexibility with **no new surface**: a heavier, longer-reached animal
   is a harder fight in the same numbers that already govern how it hits.

3. **The per-exchange mint is retired** (D5). A player used to seeing
   `practisingCompetence` move every exchange now sees it move per fight.
   The requirements say per-fight; recorded because it is a felt change.
4. **Gym pins move at W1** and possibly W4. Budget a re-pin pass and
   check the "no policy dominates" / "no loadout dominates" cells hold —
   if a wound spend makes the guard-breaker strictly dominant, the spend
   dials come down before the pins go in.
5. **W8b's burden law reads across the Metabolic seam** through
   `MixinApi.isMetabolic` inside `reconcileConditions`. `Metabolic` wraps
   `Vitals` on `Creature`, so the runtime `this` carries it; a test
   fixture that composes `VitalsMixin` without `MetabolicMixin` and
   afflicts a toxin row will read stage 0 — that is correct (no burden,
   no stage), but the `Metabolic.*.test.ts` fixtures must compose both.
6. **The `analyze` stanza overlay.** If a pack's `command-view` overlay
   replaces the platform view rather than merging its subcommands, W13
   needs the `measure strike` mechanism read closely before writing; the
   plan assumes merge because trade-mining ships that way. Verify on a
   booted world at W13 before authoring the second stanza.
7. **Tuning numbers ship visible** — `combat.wound.*`, `combat.morale.*`,
   `HARM_DEFAULTS.BURN_WEEP_*` / `CONTUSION_STIFFNESS_*`,
   `METABOLIC_DEFAULTS.PLASMA_RESTORE_*`, `recovering`'s `bands: 2` /
   `atStage: 12`. All are dials or row values; none is a shape decision.
   The slate said "deliberately gentle at the formidable end": D2 makes
   the formidable end contribute nothing, which is gentler than gentle.
8. **`lint:combat-dynamics`.** W4's sentience read must go through
   `SpeciesApi.isSentient` (already how `handleDown` does it), never a
   new `MixinApi.isX` in `lib/combat/`.
9. **The suppression and the live digest.** The client's subscribed
   `competenceDigest` subtracts suppression on read but is not re-pushed
   when the taper lifts (no ledger notify). The verb is current; the live
   field lags until the next append. Acceptable for this build; noted so
   nobody reads it as a defect in the drive.
10. **W14's kill test** (slate Q7) is real: if W11's rows do not make at
    least two conditions distinguishable by course, W14 is cut and the
    slate keeps it.
11. **Two DB drops** (W8a, W10). Anyone mid-fight or dying on the dev DB
    at deploy is dropped with it — the requirements' collision, answered
    as the requirements say.
12. **The `lint:conditions` value gate** proposed in Reachability (a
    misspelled `law` advances nothing silently) is a new gate not in the
    requirements — it is the census-then-ratchet reflex, ~20 lines, and
    the derived roster absorbs it without a list edit. Not a new module
    category (a `scripts/check-*.ts`).

13. ✅ **The floor was a live bug fix sitting at W3 — RESOLVED.** The
    user's call: it is now **W0d and lands first**, before any feature
    wave. `Competence.ts` + `CompetenceBand.ts` only; nothing precedes
    it. If this build is ever interrupted or lands in stages, the
    de-ranking bug is already fixed.

No new module category, no new exported helper, no new Mongo collection
is planned anywhere above. If a wave finds it needs one, it stops there
and the answer is "fold it in".

---

## Deferred seams

Clean attach points, each leaving as a slate, none as a plan section:

- **`g(composure)`** — untouched, still `1`; two claimants
  (combat-experience T5, mind-slate `traits-stress`). W4's morale read is
  a *separate* function and must not be folded into it. → both slates
  already carry the note; the sweep adds "consequence built morale beside
  it, not in it".
- **The NPC medic** — an NPC that renders `treatment` on `order` needs a
  brain that makes W14's clinical decision; the Tariff's `ServiceKind`
  vocabulary is where `treatment` slots in when it exists. →
  medic-judgment-slate.
- **A pack-owned condition row** — `ConditionCatalogue.warm` walks
  `/platform/idea/Condition/` by prefix; a `/trade/<x>/idea/Condition/`
  row would not warm. The fix is a class-keyed walk. → health-vertical-slate.
- **A diplomacy Discipline** — parley credits `awareness`; T12's
  "face/diplomat career" wants its own field of study. → combat-experience-slate.
- **Group morale (rout & rally)** — W4 is per-combatant; T13's
  leader-down shock and ally-fleeing contagion ride the same read with
  the threat graph as input. → combat-experience-slate.
- **`contagion` as a spread** — W13 reads the vector; nothing spreads. →
  disease-slate.
- **The severed limb** at `AVULSION_BEHAVIOR.onset`; the splint for
  `fracture → rest`; instruments (a stethoscope that turns `analyze
  patient`'s bands up one). → physiology-slate / health-vertical-slate.
- **A `Species` contest band** for beasts (Risks 2). → species-slate.
- **`Species._parentCladePath` / `lifecycleStates` / `lifespanMin`** —
  three authored fields no code reads, found by W0c's census. The
  maturation/lifespan axis. → species-slate.
- ⭐⭐ **The combat hook grammar — seventeen un-composed `@hook`s**
  (`Combatant` ×7, `CombatReactive` ×6, `CombatVenue` ×3, minus the two
  W3 fills). Documented, invoked, implemented by nobody but test doubles.
  `lint:unconsumed-seams` now holds the number. → combat-experience-slate.
- **`MemorizedMixin.competenceRankFor`** — `return 0` under "composed
  hosts supply the real read"; no host does. → magic-model-design.
- **The temple** — a second `revive` vendor with different terms; the
  Tariff makes it rows. → mortality-slate.
- **Corpse custody and remains after `spent`** — `interIn` keeps the
  corpse in the grave; what a grave holds after terminal decay is
  unmodelled. → mortality-slate.

---

### ⭐ What this build hands blood-slate (D21, D22, W16)

Checked against [blood-slate](../slates/builds/blood-slate.md) after the
user raised it. The cut stands — ABO/Rh genotypes, allele frequencies and
the compatibility graph are a build — but three things change for it:

- **A sharper motivation than it had.** D21 leaves a bled body
  *permanently short* rather than merely slow to recover. Transfusion
  stops being "faster healing" and becomes the only route back to whole.
- **Its open question 6 is answered here** (D22): bloodless clades absorb
  a bleed effect silently. Blood-slate can delete the question.
- ⭐ **W16 gives it its first non-transfusion consumer.** Blood-slate's
  open question 1 asks *"does blood type interact with anything else,
  ever? … candidates worth checking early: forensics."* This build ships
  `analyze postmortem` and a `forensics` Discipline. **Nothing here reads
  blood type** — but the reader now exists, so that question is
  answerable rather than speculative when blood is built.

⚠ **Not folded in, deliberately:** the draw/store/transfuse loop over
`Bulkable` + `introduceToxin` (metabolism's bloodstream seam, which
blood-slate correctly identifies as already built). It is a small amount
of code and a large amount of design — types, compatibility, donation
economics, consent-while-unconscious — and taking the mechanism without
the design is how a half-built system ships.

## Critical files

Read first, in this order:

1. `packages/server/src/mud/lib/vitals/Vitals.ts` (:268–400 the
   interface; :905–1000 the affliction laws; :1038–1345 the seven arms)
2. `packages/server/src/mud/platform/idea/Condition.ts` (:41–120 the
   records; :353–420 `VitalEffect` / `ProgressionSpec` / `TraumaBehavior`;
   :455–560 the behaviours; :565–735 the Idea)
3. `packages/server/src/mud/lib/metabolism/Metabolic.ts` (:1037–1100)
4. `packages/server/src/mud/lib/advancement/{Competence,CompetenceBand,ActSignature,Advancement}.ts`
5. `packages/server/src/mud/platform/idea/api/CombatLogic.ts` (:1728–1960
   `resolveExchange`; :2180–2307 `commitInflict`; :2591–2681
   `applyConsequences`; :2969 `dispatchBandChanges`; :3085–3140 `endWith`;
   :3992 `snapshotBandsImpl`; :4813 `runResolutionConsumers`; :4874–4961
   the retiring mint)
6. `packages/server/src/mud/lib/combat/{Poise,Sharpness,Combatant,CombatSession,CombatHookContext,CombatNarration}.ts`
7. `packages/server/src/mud/lib/behavior/combatant.ts`
8. `packages/server/src/mud/platform/idea/cmd/medical/TreatController.ts`,
   `…/cmd/perception/AssessController.ts`, `…/cmd/charactergen/PassageController.ts`
9. `packages/server/src/mud/platform/idea/cmd/retail/OrderController.ts`,
   `lib/commerce/{PricedOffer,Menu}.ts`, `platform/thing/JobBoard.ts`
10. `packages/server/src/mud/lib/employment/{Condition,Clause,ContractRecord}.ts`,
    `platform/idea/cmd/work/JobController.ts`, `lib/attendant/AttendanceEngagement.ts`
11. `packages/server/src/mud/lib/mortality/{Postmortem,MortalArc}.ts`
12. `packages/server/scripts/check-condition-arms.ts` + its fixture and
    test; `check-does-nothing.ts`; `check-combat-dynamics.ts`
13. `packages/content/platform/content/platform/idea/Condition/**` (the
    23 rows), `…/Discipline/{blades,melee-combat,unarmed,medicine}.yaml`,
    `packages/content/generic-objects/content/stuff/thing/arms/*.yaml`
14. `packages/content/hearthworks/` (whole — the venue-pack precedent),
    `packages/content/terminus/content/world/terminus/general-store/business.yaml`,
    `packages/content/trade-mining/content/trade/mining/cmd/` (the stanza
    precedent), `packages/content/trade-mining/pack.yaml`
15. `docs/subsystems/{harm,vitals,combat,combat-hooks,mortality,advancement,contract,retail,employment,content-packs}.md`

---

## Drive record

*(appended at build time — the output of running the requirements doc's
24-step drive against the running game, and what it found; precedent
`farming-plan.md § Checkpoint A`.)*
