# Agent coordination — implementation plan

Executes
[agent-coordination-requirements.md](../requirements/agent-coordination-requirements.md):
one deliberation beat per NPC over declared candidate tasks (the arbiter),
a house-authored rule for who among the able is called (the call), and the
can-make gate on `order`/`mix`/`serve` with a derived, seeded-only rung for
authored people (the capability gate). **Kind: feature. Leads from:
kernel** — first consumers Dave's Bar and the Hearthworks; the market bakery
and one goods-yard outfit are the world-didn't-break check.

Seeds: [agent-coordination-slate](../slates/builds/agent-coordination-slate.md)
(the arbiter) · [call-slate](../slates/builds/call-slate.md) (the call).

---

## Grounding

Every fact below was verified by opening the file this cycle (2026-09-30,
`design/crew` caught up to master). Where the requirements doc or a slate
says otherwise, the correction is flagged **⚠ corrects**.

### The dispatch loop — `packages/server/src/mud/lib/behavior/Behaved.ts` (564 lines)

- `BehaviorWiring { spec, parsed, state, live, ambient, handle? }`;
  `_wiring: BehaviorWiring[]` is runtime-only. `fieldMeta` persists
  `behaviors` + `dispositions`.
- `_wireBehaviors()` at `postRegister`: `_parseTrigger` → warm the brain via
  `StuffApi.resolveExport(spec.brain, BRAIN_EXPORT)` → push a wiring → for
  `parsed.source === 'cadence'` call `_scheduleJittered(wiring, intervalMs)`.
  Witness wirings get no schedule; `engage` wires nothing.
- `_parseTrigger` (:483-503) accepts `/^cadence:(\d+)(ms|s|m)?$/`, `engage`,
  and the four `WITNESS_TOPIC` keys; throws otherwise (loud at wire time).
- `_scheduleJittered` = `ScheduleApi.schedule(delay, cb)` one-shot + re-arm
  with fresh ±25% jitter, through `_effectiveCadence(baseMs, ambient)` (the
  `behavior.ambientCadenceScale` / `FloorMs` app settings; identity when
  unwarmed so unit tests keep fast cadences).
- `_fireCadence(wiring)`: resolve → `presenceGated !== false && !_hasAudience()`
  → skip; `_blocked(requiresFree)` → skip; `_runAct`.
- `_runAct(descriptor, wiring, perceived, source)` is the **single funnel**:
  `AppApi.isWorldOpen()` gate; for `source === 'witness'` with `claims` on an
  `Engaged` host, `_startBeat(claims)` (a `BehaviorBeat` for `BEAT_MS = 2500`);
  assembles `BrainContext` (`say`/`emote`/`emoteFree` bound); `await
  descriptor.act(ctx)` in try/catch → `_warn`.
- `handleMessage` dispatches witness triggers: arrival/departure by
  room-occupant delta against `_seenPlayers`; emote/speech via
  `_recoverSubject`.
- `canEvict()` **vetoes eviction for any host with a non-empty
  `behaviors:`** (`'active NPC behavior spec'`). ⚠ corrects the
  requirements' *Residency* collision: residency never evicts a Behaved
  host, so nothing an NPC is mid-way through dies on eviction. Only a reboot
  loses runtime state. See D8.
- `fireBeat(brainPath)` — the existing observation seam (a wizard `eval`,
  the economic-bootstrap wire drive uses
  `eval ${PARCEL} --on ${npcKeyword} return this.fireBeat('${brain}')`).
- `_currentPlayers()` = room occupants that are `Sensor` and not `Behaved`.
- `static commandContributions = { peers: ['platform/cmd/social/talk.yaml'] }`.

### The brain contract — `lib/behavior/brain.ts`

`BrainStatics { label; claims?; requiresFree?; presenceGated?; ambient?;
act(ctx); open?() }`. `BehaviorSpec { brain, trigger, config? }`.
`BrainContext { host, config, state, perceived?, trigger: {source:
'cadence'|'witness', raw}, say, emote, emoteFree }`. `ParsedTrigger` is
`cadence | witness | engage`. Trigger parsing lives on the mixin (the
export-discipline rule — the module exports types + vocabulary only).

**38 brains**: 24 kernel (`lib/behavior/`: arms, backs-up, cellars,
combatant, converses, covers, crossing-ritual, eats, enforces, feeds,
follows, greets, homes, idles, introduces, patrols, prints, random-chatter,
reacts, restocks, shifts, tree-dialogue, wanders, wary) + 14 in nine packs
(`residence/maintains`, `trade-farming/farms`, `trade-fishing/{fishes,
reads-water}`, `trade-haulage/hauls`, `trade-medicine/nurses`,
`trade-mining/{delves,reads-air}`, `trade-ranching/{herds,raids}`,
`trade-shopkeeping/{consigns,stocks}`, `trade-tailoring/tailors`,
`trade-textiles/weaves`). All 38 `label`s repeat the filename. Verified
statics table (claims / requiresFree / presenceGated / ambient):

| declares `claims` | backs-up, combatant, converses, crossing-ritual, feeds, follows, greets, homes, introduces, patrols, random-chatter, reacts, tree-dialogue, wanders, wary, reads-water, nurses, tailors (⚠ typed `string[]`, not `EngagementSlot[]`) |
|---|---|
| **no slot at all** (17) | arms, cellars, covers, eats, enforces, idles, prints, restocks, shifts, maintains, farms, fishes (requiresFree only), hauls, delves, reads-air, herds, raids, consigns, stocks, weaves |
| `presenceGated = false` | cellars, eats, enforces, feeds, homes, prints, restocks, shifts, maintains, farms, fishes, hauls, nurses, delves, reads-air, herds, raids, consigns, stocks, weaves |

`nurses` (`trade-medicine/src/behavior/nurses.ts`) carries a private
`triageRank(body)` (400 dying · 300+severity open bleed · 100+severity wound ·
infection load) — the smuggled priority.

Rows naming brains (`grep -rh "brain: " packages/content --include=*.yaml`):
idles 43 · introduces 22 · greets 20 · tree-dialogue 10 · shifts 10 · feeds 8
· consigns 7 · random-chatter 4 · cellars 4 · restocks 3 · converses 3 ·
delves 2 · nurses 2 · maintains 2 · homes 2 · follows 2 · eats 2 · arms 2 ·
one each for weaves, tailors, stocks, herds, reads-air, hauls, reads-water,
fishes, wary, reacts, prints, enforces, crossing-ritual, covers, backs-up.
**93 `trigger: cadence:` lines** across the content tree; witness triggers:
arrival 42 · departure 3 · emote 1; `engage` 11.

### `BehaviorBeat` — `lib/behavior/BehaviorBeat.ts` (62 lines)

A `DurativeActivity` of type `'behavior-beat'` holding the brain's slots for
`durationMs`; `interruptibleBy: ReadonlySet<AbortReason> = new Set()`
(empty); `replaceableBy = []`; `onComplete`/`onAbort` no-ops; `getHost()`
returns the actor.

### The importance vocabulary — ⚠ corrects "empty"

`packages/types/src/index.ts:654-656` declares the empty
`AbortReasonRegistry` and `AbortReason = keyof AbortReasonRegistry`. It is
**augmented in eight modules already**: `lib/activity/Engaged.ts:57`
(`cancelled` · `replaced` · `preconditions-changed` · `host-destroyed` ·
`thrown`), `lib/script/AbortReason.ts` (`barge-in` · `step-declined` ·
`resource-limit`, the exemplar for a subsystem-owned augmentation + a
runtime array), `lib/attendant/AttendanceEngagement.ts` (`service-idle`),
`lib/vitals/{Tending,Operation}Engagement.ts`, `lib/combat/{Coup,
CombatSession}.ts`, and a pack's `content/transport/src/lib/journey/
abort-reasons.ts`. What is empty is the set of **behavioural** reasons and
`BehaviorBeat.interruptibleBy`.

⚠⚠ **`interruptibleBy` is consulted by nothing.** `platform/idea/
SchedulerRegistry.ts` reads `replaceableBy` at `start()` (:216) and never
reads `interruptibleBy`; `cancel(engagement, reason)` (:284) cancels
unconditionally. Every engagement declares the set; no code honours it. The
arbiter is therefore the field's **first consumer** (D1, D7).

### Engagement slots — `lib/activity/Engaged.ts`

`EngagementSlot = 'body'|'hands'|'attention'|'voice'`, `ENGAGEMENT_SLOTS`.
`_setEngagement`/`_clearEngagement` are `@CallSecurity(BySchedulerRegistry)
@Final @Unshadowable` — only the `SchedulerRegistry` singleton
(`TemplatePaths.schedulerRegistry = '/platform/idea/SchedulerRegistry'`)
claims or frees a slot. A deliberative winner claims through
`SchedulerApi.start(new BehaviorBeat(...))`, as witness brains do today.
`SchedulerApi.cancelByPredicate(actor, pred)` exists (:339).

### Scheduling

`ScheduleApi.schedule(delayMs, fn, opts?)` / `recurring(intervalMs, fn,
opts?)` / `cancel(handle)` in `api/schedule.ts` (:183/:223/:293). The roster
tick is **game time**: `EmploymentLogic.installRosterSchedule()`
(`platform/idea/api/EmploymentLogic.ts:1421-1433`) arms
`WorldClockApi.every(Quantity.of(ONE_GAME_HOUR_S,'s'), () => this.runTick())`,
called from `platform/idea/EmploymentEngine.ts` `postRegister → warm()`
(manifest-booted), plus one immediate `EmploymentApi.tickRoster()` at
`backend/AppBootstrap.ts:233`. `runTick` (:1323) iterates `allBusinesses()`
→ `tickBusiness(business, date, nowRaw)` (:1360), which
`ensureRostered`s each assignment, evaluates `roster.evaluate(assignment,
date)` and flips on/off shift (settling the wage on the off transition).
**`ensureOperatorAt(fixture)` calls `tickBusiness` for that one house** (the
doc comment at :1338-1358) — so the roster is brought current at the moment
of an `order`, not a game-hour later. `WorldClockApi` (`api/worldclock.ts`)
exposes `getNow/getScale/setScale/pause/resume/snapshot/restore/after/at/
every/onDate/cron` — **no `setNow`**, and the envelope wire test records
that `setScale` is an operator act a drive may not call.

### Employment

- `lib/employment/Organization.ts`: `OrganizationFields` (:212-218),
  `OrganizationMixin` `fieldMeta` (:228-243: appointingAuthority,
  parentOrganization, proprietorPath, positions, rosterSlots, name);
  `getPosition(key)` (:336), `getRoster()` (:341), `getRosterAssignments()`
  (:345), `holdersOf(key)` (:108 iface). Transitions gated
  `AnyOf(SelfOnly, FromTemplate('/platform/idea/api/employment'))`.
  `ensureRostered` (:428-436) upserts with **no `requires` check** — an
  NPC roster assignee is never means-tested.
- `platform/idea/Business.ts`: `BusinessMixin` `fieldMeta` (:166-176:
  operatingLocations, banksAt, parLines, charter, payrollArrears);
  `setCharter(value)` (:190) is the **throw-loudly Phase-1 setter idiom**
  (`Business.charter: '…' is not a charter (expected one of …)`).
- `lib/employment/Position.ts`: `PositionData` (:63-161) with `fulfills?:
  string[]`, `headcount?`, `requires?`, `purchases?`, `noun?`;
  `POSITION_REQUIREMENT_KEYS = ['gigs','discipline','band']` (:45);
  `Position.fromData` throws on an unknown key (:292-297).
- `lib/employment/Roster.ts`: `ShiftEntry { days: number[]; hours: [start,
  end) }`; `evaluate(assignment, date)` matches `date.weekday` + hour.
  `DefaultCalendar` weekday = `totalDays % 7`, names `Oneday…Sevenday`; the
  lounge roster treats `[0..4]` as weekdays and `[5,6]` as the weekend, so
  **"Saturday" = weekday 5.**
- `lib/employment/Employed.ts`: `isFulfilling(discipline?)` (:381-416) —
  on-shift record → `organization.getPosition(e.positionKey)?.fulfills` →
  ⚠⚠ **`serves.includes(discipline)` — an EXACT match, no `specializes`
  walk** → `isBusiness(organization)` → standing in an
  `getOperatingLocations()` entry. `beginCovering(business)` (:503)
  forwards to `EmploymentLogic.beginCover` → `beginCoverImpl` (:803) →
  `business.beginCover(actor, nowRaw)` (the first `fulfills` seat, else
  `positions[0]`). `shiftState()` (:513), `getEmployment(orgPath)` (:357),
  `getActiveEmployments()`. Imports `StuffApi`, `MixinApi`, and
  `platform/idea/api/EmploymentLogic` already.
- `lib/behavior/covers.ts` (cadence, `presenceGated = true`, `ambient =
  false`): scans the proprietor's room for another `isFulfilling()` maker;
  `beginCovering`/`endCovering`. `lib/behavior/shifts.ts` (`presenceGated =
  false`, `ambient = false`): `host.shiftState()` → `teleport` to
  `config.behindBar` / `config.offstage` (`StuffApi.singletonOrClone`);
  returns early when `getEmployments().length === 0` (the "not yet resolved
  is not off duty" guard).
- `EmploymentApi` (`api/employment.ts`) statics include `businessAt`,
  `operatorsAt`, `ensureOperatorAt`, `businessOfProprietor`, `tickRoster`,
  `bringCurrent`, `employeesOf`, `tipRecipientFor`, `shiftStateOf`.
  `EmploymentBootCallers = AnyOf(EmploymentApiCallers,
  FromTemplate('/platform/idea/EmploymentEngine'))` (:101).

### The demand-side vocabulary precedent — `lib/attendant/Attendant.ts`

`ServiceDiscipline` union (:40-47) + `SERVICE_DISCIPLINES` array (:49-53);
field `discipline: ServiceDiscipline = "line"` (:134), `fieldMeta` at :126
— a **bare persistent field with no setter validation** (copy the
union+array shape, NOT the unvalidated field). `resolveServer()` (:302-323)
walks `business.getRosterAssignments()` → live assignee → `isEmployed &&
shiftState()==='on-shift'` → same room → `attention` slot free.
`OrderController.ts:114` consults `point.requestAttention(key)` for the
`closed` answer only; the maker resolves inside `CraftingLogic` (:152-154,
`makerMode: 'fulfilling-bartender'`).

### The routing defect — `platform/idea/api/CraftingLogic.ts:196-215`

`resolveMaker(mode, discipline?)` is **sync**, reads
`ExecutionContextApi.getActingAuthor()`; `'self'` → the giver;
`'fulfilling-bartender'` → walks `loc.getContents()` for `isEmployed &&
isFulfilling(discipline)`, then sorts by `getIdentityPath() ?? stuffId`
and takes `[0]`. A player's identity path begins `/platform/agent/Avatar/`,
every NPC's `/world/` — **the player wins every tie**. `MakerMode = 'self'
| 'fulfilling-bartender'` (`api/crafting.ts:38`); `CraftRequest { recipeRef,
makerMode, brand?, target? }` carries no principal. `RecipeView { recipeId,
name, keywords }` (:107) — no difficulty/discipline on the view.

### The knowledge ladder — two ledgers

- **Chronicle** (`Collections.Chronicles`): `lib/script/RecipeKnowledge.ts`
  — `knownKey(id) = 'recipe-known:<id>'` (claim), `madeKey(id) =
  'recipe-made:<id>'` (deed). `PersonaMixin.hasClaimed(key)` / `hasDone(key)`
  (`lib/character/Persona.ts:320-329`), `recordChronicleOnce(key, fields)`
  (:290-300, dedups on `{owner,key}` regardless of kind).
  `ChronicleEntryFields.archetype` is documented *"claims only"*.
- **Transcript** (`Collections.Transcripts`): where `competence:` seeds land.
  `TranscriptEntry.archetype` is likewise *"claims only"* (:53).
- `CraftController.requireDeed(context, recipeRef, verb)`
  (`platform/idea/cmd/crafting/CraftController.ts:46-72`): `lookupRecipe`
  → no view ⇒ `true`; `isPersona(giver) && hasDone(madeKey)` ⇒ `true`; else
  `toSelf` scene on topic `act.deed` *"You've heard of X, but you haven't
  learned to VERB it — work it by hand first."* + note `{kind:
  'controller-rejected', reason: 'not-learned', detail: recipeRef}`.
  Callers: `MakeController.ts:36`, `trade-cooking/…/CookController.ts:31`,
  `trade-smithing/…/ForgeController.ts:65`, `trade-baking/…/
  BakeController.ts:54`. **Not** callers: `OrderController`
  (`makerMode: 'fulfilling-bartender'`), `MixController` and
  `ServeController` (`packages/content/trade-hospitality/src/idea/cmd/
  crafting/`, both `makerMode: 'self'`, both `extends CraftController`).
  ⚠ corrects the requirements' *"Five one-shots decline without the deed —
  make, cook, forge, bake, preserve"*: `PreserveController` mentions
  `requireDeed` in a comment only and crafting.md documents preserving acts
  as deliberately ungated (*"a gate whose key does not exist is a lock"*).
  See D3 and § Risks.
- `recordCraftEvidence(maker, recipe)` (`CraftingLogic.ts:1709-1739`):
  bails without discipline; `difficulty` = the recipe's word if in
  `DIFFICULTIES`, else **silent `'easy'`**; `maker.creditDeed({discipline,
  difficulty, outcome:'success'})` (Transcript deed); then every other
  present `isCommandGiver && getIdentityPath() && isPersona` occupant gets
  the known-of claim via `recordChronicleOnce`.
- The can-make deed mints in `captureManualBuildImpl` (`platform/idea/api/
  ScriptLogic.ts:311-334`) on the `strain`/`quench`/`plate` terminal mint.

### The two five-rung vocabularies, and the bridge

- `CompetenceBandName = 'untrained'|'novice'|'competent'|'proficient'|
  'expert'`, `COMPETENCE_BANDS`, `CompetenceBand.FLOOR` (`lib/advancement/
  CompetenceBand.ts`). Read: `AdvancementMixin.competenceBandFor(discipline):
  Promise<CompetenceBandName>` (`lib/advancement/Advancement.ts:504-519`,
  async — folds `TranscriptEntry.find`). The catalogue is reached
  **duck-typed** via `StuffApi.findByTemplatePath(TemplatePaths.
  disciplineCatalogue)` (:134-146) — the pattern for `lib/` reading
  `platform/idea/DisciplineCatalogue`, which exposes `getDiscipline(key)`,
  `has(key)`, `getRequires/getSpecializes/getSynergizes(key)`.
- `Difficulty = 'trivial'|'easy'|'standard'|'hard'|'formidable'`,
  `DIFFICULTIES` (`lib/advancement/ActSignature.ts:33-45`).
- `Recipe.difficulty: string = ''` (`lib/craft/Recipe.ts:288`), set by
  `r.difficulty = str(data.difficulty)` in `fromDocument` (:356) with **no
  validation**. Census over the 98 recipe rows (`packages/content/*/content/
  recipes/*.yaml`, fourteen packs): easy 34 · standard 29 · **moderate 17 ·
  simple 1** · hard 12 · trivial 3 · formidable 2 (`trade-mining/{assay-kit,
  miners-dial}`). The 18 unrecognized words sit in trade-hospitality (10),
  trade-distilling (4), trade-winemaking (2), trade-baking (1),
  trade-brewing (1). ⚠ corrects the requirements' "97 recipes" — 98 rows.
- ⭐ `Competence.seedRunFor(band)` (`lib/advancement/Competence.ts:196+`),
  **measured against the shipped constants**:

  | band | `{difficulty, count}` |
  |---|---|
  | untrained | easy, **0** |
  | novice | easy, 2 |
  | competent | easy, 6 |
  | proficient | **standard**, 4 |
  | expert | **hard**, 4 |

  So a seeded history is made of *easy* work up to competent, *standard*
  at proficient, *hard* at expert — and **nothing reaches `formidable`**.
  This is the band→difficulty partner D3 reads.

### The dossier — `lib/npc/Cast.ts:185-245`

`CastMixin._seedDossier()` at `postRegister` (after `hydrateBeliefs`):
prologue → `seedChronicleClaims` (skip if any `claim` exists); renown →
`RenownApi.seedTo`; `competence:` (:222-244) guarded on
`existing.some(e => e.kind === 'claim')`, then per claim
`Competence.seedRunFor(claim.asserting)` and `run.count` ×
`creditSignature({discipline:[{discipline, difficulty: run.difficulty,
outcome:'success'}]}, {kind:'claim', when:null, archetype: stamp})`.
`CompetenceClaim { discipline, asserting }`. **Only the dossier writes
`kind: 'claim'` Transcript rows today** (advancement.md: *"no consumer mints
claims this increment"*).

`Character` (`lib/character/Character.ts:99-135`) composes, inner→outer:
`Employed`, `Hiding`, `BeliefStore`, `Status`, `Persona`, `Dispositioned`,
… `Engaged`, … `CommandGiver`, `Combatant`, `Advancement` (outermost).
`NPC = Costumed(Behaved(PostRegistration(Character)))` (`lib/npc/NPC.ts`);
`Cast = CastMixin(NPC)`; `Avatar` alone composes `PersistableMixin`
(`platform/agent/Avatar.ts:163`). `BeliefStore.recognizes(subject): boolean`
(:680) and `regardFor(subject): number` (:710) are **sync**.

### Content

- Bar business `packages/content/saxonberg-lounge/content/world/lounge/idea/
  business.yaml`: positions `bartender` (`fulfills: [bartending]`, wage 4)
  + `keeper` (`purchases`); roster Mara `[0..4] 6–14` (both seats), Remy
  `[0..4] 14–22`, Sloane `[0..4] 22–24 + 0–6`, Augie `[5,6] 10–24`.
  **Weekend 00–10 is nobody's.** `operatingLocations:
  [/world/lounge/location/bar]`; `offstage` row exists at
  `/world/lounge/location/offstage`. Dave (`agent/dave.yaml`) is the entity
  authority and names `covers`. Dossiers: Mara bartending proficient /
  mixology proficient; Remy bartending competent / mixology proficient;
  Sloane competent / competent; Augie proficient / competent; Dave expert /
  competent. Every bar cast row names `shifts` at `cadence:30s` with
  `{behindBar, railStool, offstage}` config, plus `idles`
  (9–11s), `random-chatter`, `converses`, `greets`, `introduces`,
  `tree-dialogue`, and Mara `restocks` at `cadence:15m`.
- Bar menu `saxonberg-lounge/…/thing/bar-menu.yaml` offers **26** recipes.
  Hospitality recipes (`trade-hospitality/content/recipes/`, 25 rows, all
  `discipline: bartending`): easy — aperol-spritz, coffee, cuba-libre,
  dark-and-stormy, gin-tonic, moscow-mule, paloma, press-{grapefruit,lemon,
  lime,orange}, screwdriver, vodka-soda, whiskey-ginger; **moderate** —
  cosmopolitan, daiquiri, gimlet, manhattan, margarita, martini, negroni,
  old-fashioned, tom-collins, whiskey-sour; **hard** — mojito. ⭐ Under D3
  with `moderate → standard`, Mara and Remy (proficient) make the standard
  cocktails, Sloane/Augie/Dave (competent) only the easy ones, and
  **nobody at the bar can make the mojito** — the first thing
  `lint:menu-staff` will report, by design (W6 resolves it as content).
- Hearthworks business `packages/content/hearthworks/content/world/terminus/
  hearthworks/idea/business.yaml`: `smith` (`fulfills: [smithing]`), `cook`
  (`fulfills: [cooking]`, `purchases`), `kitchen-hand` (`fulfills:
  [cooking]`, `headcount: 1`, `requires: {gigs: 2}`, **unrostered**);
  roster smith + cook `[0..6] 6–19`; `operatingLocations` = smithy +
  cookhouse. Cast rows: `agent/{cook,smith}.yaml` only (cook: cooking
  proficient, recipe-knowledge competent; brains introduces, shifts 30s,
  restocks 90s, idles 20s). Menus `thing/{kitchen-menu,smithy-menu}.yaml`.
- Goods-yard outfits `packages/content/terminus/content/world/terminus/
  goods-yards/<outfit>/idea/outfit.yaml` (bottling, brewing, crowsfoot,
  farm, hollis, pantry, veshko, vintner): one `hand` each, `[0..6] 6–18`;
  `fulfills` on crowsfoot `[distilling, fermenting]`, vintner + brewing
  `[fermenting]`. Other menus: `trade-brewing/…/brewhouse-board`,
  `trade-winemaking/…/cellar-book`, `trade-distilling/…/still-book`.
- `DisciplineCatalogue` rows: `platform/content/platform/idea/Discipline/
  mixology.yaml` (`specializes: [bartending]`, `requires:
  [recipe-knowledge]`, a `conferrals` block the retired-conferral decision
  leaves inert). `bartending.yaml`, `cooking.yaml` beside it.
- App settings: `lib/config/AppSettings.ts` `AppSettingKeys.
  behaviorAmbientCadenceScale / FloorMs` (:206/:214); seeded by
  `packages/content/platform/content/settings/behavior.yaml` (the
  `settings` kind, merge-missing).

### Gates and harness

- `pnpm -C packages/server lint:family` runs every `lint:*` in
  `package.json` (48 today). Census-then-ratchet exemplars:
  `scripts/check-dossiers.ts` (runs `Competence.seedRunFor` at build time
  over `packages/content` rows through `pack-roots.ts`'s `effectiveDoc` /
  `inheritanceIndex`), `scripts/check-openings.ts` (walks every pack's
  Business rows; the shape for a per-house content gate),
  `scripts/check-lib-statics.ts` (`LIB_STATICS_CEILING = 337`; counts public
  statics on **exported class declarations** — `export const brain = class`
  is a class *expression* and is not counted; a `@internal` class is
  exempt). `scripts/check-instanceable-placement.ts` invariant 8:
  `packBrainShapeOk` — a pack `behavior/*.ts` has **exactly one export**,
  `export const brain = class`.
- `lib/behavior/__tests__/Behaved.test.ts` drives beats with
  `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync`.
- Wire tier: `packages/wire/tests/<feature>[.dirty].wire.test.ts`, harness
  `packages/wire/src/harness/{session,assertions,registry,world}.ts`
  (`Session`, `declareFile`, `uniqueHandle`, `expectOk/expectRefused/
  expectNote`; `Session` takes `{ startLocation?, wizard?, withCharacter? }`).
  The wire world's clock runs at 12× and **drives may not set it**.

---

## Plan-level decisions

**D1 — `order` stays synchronous; importance flows one way.**
`order` resolves its maker inside `craftImpl` exactly where it does today
and returns the drink in the same dispatch. The change is *who* and *what
happens to them*: the chosen maker's interruptible engagements are cut with
the new `'called'` reason (`host.preemptFor('called')` →
`SchedulerApi.cancelByPredicate(host, e => e.interruptibleBy.has('called'))`),
the break-off is narrated as one act, and the craft proceeds. The
alternative — `order` posts a request and returns, the maker's next beat
picks it up — changes the verb's response shape (the patron gets no drink
in the envelope), makes every existing bar test and the attendant's instant
`scrum` venue asynchronous, and is what the requirements cut as the board
unification. Importance flows one way: a call preempts a task; a task never
defers a call (a `critical` body need that must beat a call is § Deferred).

**D2 — the call-policy field lives on `OrganizationMixin`**, as
`call: CallPolicy | ''` with `setCall` in the `setCharter` throw-loudly
idiom, `fieldMeta { call: {persistent, authorable} }`. Reasoning: the call
is a rule about the **chart** (who among the seat-holders is told to act),
not about trading — a watch or a registry with two clerks needs it the day
it has two, and `BusinessMixin` requires `OrganizationMixin` on its base so
every Business inherits the field. Placing it beside `banksAt` would make
the watch a Business again to get a rule, the exact conflation the
organizations build undid. Closed vocabulary, **two members, both with a
shipped consumer**: `regulars` (the bar — the relational leg first) and
`rota` (the Hearthworks kitchen — no relational leg; the least-recently
called able hand). Order of legs for `regulars`: *capability* (already
filtered by the caller) → *your regular* (highest `regardFor(patron)` among
candidates that `recognizes(patron)`) → *freest* (lowest current-intention
band; a non-Behaved candidate reads `pressing` while holding any engagement,
`idle` otherwise) → *rotation* (least-recently called; a runtime
`Map<identityPath, number>` on the organization). `rota` skips the second
leg. No leg ever reads insertion, authored or identity order; the rotation
leg is what breaks the residual tie, and it is what gives a new hire *some*
orders. A house with **no** `call` and a request: `call()` returns
`{ ok: false, reason: 'no-call-policy' }` and the caller declines — never
the first member. `''` is legal on a house with no fulfilling seat.

**D3 — the seeded-deed bridge is derive-on-read at the gate, over
seeded evidence only.** No Chronicle rows are written, no marker is
invented, no 70×98 seed loop runs. `canMake(maker, recipe)` (module-private
in `CraftingLogic`, surfaced as `CraftingApi.canMake(recipeRef)` for the
acting author) is:

```
hasDone(madeKey(recipe))                                        — the lived deed
|| (recipe.discipline && recipe.difficulty
    && run = seedRunFor(await maker.seededBandFor(recipe.discipline))
    && run.count > 0
    && rank(recipe.difficulty) <= rank(run.difficulty))          — the seeded deed
```

`AdvancementMixin.seededBandFor(discipline)` folds only `kind === 'claim'`
Transcript rows — the rows **only a dossier writes**. That is the
"marked as seeded" property by construction: a player has no claim rows,
so twenty hand-built gin-tonics raise their *lived* band and license
nothing — *the hands learn* stays true — while Mara's authored
`mixology: proficient` licenses every standard cocktail. `seedRunFor` is
the band→difficulty mapping (grounding table); `formidable` is reachable by
hand only. Weighed against seeding rows at `_seedDossier`: rows need a
provenance marker the schema documents as claims-only, an idempotency story
against `recordChronicleOnce`'s key dedup, and a re-seed whenever a pack
adds a recipe; derive-on-read needs none and matches the engine's posture.
Cost: one extra Transcript fold per gate (the `competenceBandFor` fold
already runs on every craft). ⚠ A future LMS `claim` faucet would license
recipes too — recorded in § Risks as intended, not accidental.

**D4 — `shifts` and `covers` leave the brain rail for the roster tick;
cover is evaluated on demand.** `tickBusiness` gains the move: on an
off→on transition the assignee is teleported to the assignment's `station`
(new optional `RosterAssignment.station`, default `operatingLocations[0]`);
on on→off to `business.offstage` (new `BusinessMixin` field). Shift windows
are whole hours, so game-hour granularity IS the shift's granularity — the
brain's 30 s poll was only ever catching up with an hourly flip. Cover: the
game-hour problem is real for a 30 s→60 min move, and the answer is that
**`ensureOperatorAt` already runs `tickBusiness` at the moment of an
`order`** — so `tickBusiness` also evaluates cover: no roster assignee
on-shift in any `fulfills` seat, a proprietor resolvable via the entity
authority, and not already covering ⇒ `beginCover` + teleport to the
station; a rostered fulfilling holder on-shift and the proprietor covering
⇒ `endCover`. The proprietor steps behind an empty bar **when somebody
orders**, which is what presence-gating was approximating. Two brains
deleted, 11 rows lose their `shifts`/`covers` specs, 22 timers/min gone.

**D5 — four urgency bands: `idle · wanted · pressing · critical`.**
Each rung is a distinct arbiter behaviour, which is the test a band
vocabulary should pass: `idle` = not a candidate this beat; `wanted` = runs
if nothing outranks it; `pressing` = beats every `wanted` regardless of
kind; `critical` = beats everything, preempts a running interruptible task
(`'outranked'`), and wakes the agent early. A fifth rung would have no
distinct behaviour; competence's five are estimator thresholds and light's
six are physical, neither a reason to copy the count. Cross-kind order
`threat > body > work > social > filler` breaks ties **within** a band.

**D6 — `urgency(ctx)` is async, one beat per agent.** Signature
`urgency(ctx: BrainContext): Urgency | Promise<Urgency>`; the arbiter
awaits each. The reads brains need are already async (metabolism
reconcile, transcript folds, the par sheet through perception). Cost per
beat = N candidate reads, N ≈ 3–6 per row, once per `behavior.beatMs` while
watched; today those same reads run N times per N independent timers. The
`Urgency` value carries `{ band, because }` where `because` **is the
switch sentence** (third person, no subject: *"glances at the near-empty
gin bottle and heads for the cellar"*), so the 38 sentences the lens pass
priced are the 38 `because` strings and nothing else is written.

**D7 — the beat's cadence and early wake.** One `ScheduleApi.schedule`
one-shot per agent, re-armed with jitter (the shipped anti-lockstep shape),
at `behavior.beatMs` (default 20 000) when the room has an audience, at
`behavior.beatNightlyMs` (default 120 000) when it does not; when unwatched
only candidates whose brain declares `presenceGated = false` are consulted,
and an agent with none skips the beat's body entirely. Early wake through
`requestBeat()` (debounced to `behavior.beatMinGapMs`, default 3 000): the
call resolver requests one after a preemption (so the agent re-decides the
moment the drink is served) and `handleMessage` requests one on any
perceived `act.combat*` / `speech.` frame (a `critical` candidate can only
become critical because of something the host perceived or something on a
clock it already reads). The `ambient` dial keeps applying to the beat
period of agents whose winning candidate is `ambient !== false`.

**D8 — nothing new persists.** The current intention (`{brain, band,
because, since}`) is runtime state on `BehavedMixin`. `Behaved.canEvict`
already vetoes eviction of every host with a behaviour spec, so the
residency collision the requirements name cannot occur; a reboot re-decides
at the first beat, which is honest, and a host with no prior intention
narrates no switch (so a reboot produces no spurious act). ⚠ This reverses
the slate's lean, which was written before `canEvict` was checked; flagged
for the user in the handoff. The per-(host,spec) scratch bag stays
transient as today.

**D9 — the two gates.** `lint:idle-cadence` (`scripts/check-idle-cadence.ts`)
computes Σ over every content row of `60 000 / intervalMs` for each
`trigger: cadence:<n>` spec, plus per row `60 000 / behavior.beatNightlyMs`
for each `trigger: candidate` spec whose brain source declares
`presenceGated = false` (read by regex from the brain file, resolved through
`pack-roots.ts` like `classFileOf`); `IDLE_CADENCE_CEILING_PER_MIN` is
today's census (expected 257.2), may fall, never rise; its test asserts the
invariant (≤ ceiling, > 0), never the number. Arms: a `candidate` spec whose
brain declares no `urgency` → ERROR; a brain declaring `urgency` wired on
`cadence:` → ERROR after W4; a brain whose `summary` equals its filename or
is absent → ERROR after W4; a `kind` outside `TASK_KINDS` → ERROR; a
`discipline` naming no shipped Discipline row → ERROR; a `kind` of `work`,
`body` or `threat` with empty `claims` → ERROR after W4. `lint:menu-staff`
(`scripts/check-menu-staff.ts`): for every menu row (`offeredRecipes`),
find the room whose `props:` places it, the Business whose
`operatingLocations` contains that room, its roster assignees' `Cast` rows,
and for each offered recipe whether some assignee holding a seat that
fulfils the recipe's discipline (with the `specializes` walk over Discipline
rows) satisfies D3's rule against the dossier's `asserting`;
`MENU_STAFF_SHORTFALL_CEILING` = today's count (with the 18 difficulty words
corrected first, W0), driven to 0 by W6. Arms at ceiling 0 from the start:
a recipe row whose `difficulty` is outside `DIFFICULTIES`; a Business (or
Organization) row with any `fulfills` seat and no `call:`; a `call:` outside
`CALL_POLICIES`. Both scripts are `lint:*` entries in `packages/server/
package.json`, so the derived `lint:family` runs them with no list edit.

**D10 — staging the 38-brain re-declaration so no wave breaks the
world.** The new statics are **optional** on `BrainStatics` (W1), so an
un-migrated brain type-checks. The `cadence:` trigger stays parseable
through the whole build; only a row that says `trigger: candidate` needs a
brain that declares `urgency`, and a `candidate` spec over a brain without
one is skipped with a `_warn` at wire time (the unresolvable-brain
precedent). Kernel brains + the rows naming them migrate in W2; each pack's
brains + the rows naming them migrate in W4, pack by pack, each pack's own
vitest green before the next; the lint arms that make the declarations
mandatory ratchet from WARN to ERROR in W4's last commit. No kernel list
names a pack brain: a pack's `src/behavior/*.ts` declares its own statics,
by package specifier, as today.

**D11 — `isFulfilling` walks `specializes`.** ⚠ Required by the
requirements' *"mixology already specializes bartending, so seat eligibility
is untouched"*, which is false against the shipped exact-match `includes`.
`EmployedMixin.isFulfilling(discipline)` reads the catalogue duck-typed (the
`Advancement.ts:134` pattern, `TemplatePaths.disciplineCatalogue`,
`getSpecializes`) and accepts a seat listing any ancestor of the recipe's
discipline. `recordCraftEvidence` then credits `mixology` for a cocktail —
the requirements' intended credit change.

**D12 — which hospitality rows move to `mixology`.** The 20 cocktails.
`coffee` and the four `press-*` juice recipes stay `bartending`: a squeezed
lime is not mixology, and moving them would demand a mixology band to press
a lime. ⚠ The requirements say "25"; the build agent applies the 20 and
records the difference in the MR.

**D13 — content the build authors.** Bar roster: Remy `[0..4] 12–22`
(overlap 12–14 with Mara, the lunch rush); Sloane adds `[5,6] 0–6`; Augie
becomes `[5,6] 6–24`. Every hour of the week is covered by a non-proprietor
(a unit test over `Roster.evaluate` proves it — see § Test strategy, since
the wire clock cannot reach a Saturday). Hearthworks: a new `Cast` row
`agent/cookhand.yaml` (name, `register: indefinite`, `archetype: cook`,
`competence: [{cooking, competent}]`, brains `introduces`, `idles`, and the
kitchen work as candidates) rostered on `kitchen-hand` `[0..6] 11–19`
(overlapping Odo's 6–19). `call: regulars` on the bar; `call: rota` on the
Hearthworks; every other Business with a `fulfills` seat (the three
fermenting outfits, the bakery, any Hearts-Delight house the gate finds)
gets `call: rota`. ⭐⭐ **The mojito stays unmakeable** (user, 2026-09-30).
Nobody at the bar can make the menu's only `hard` cocktail, and **that is
the finding, not a defect to tune away**. Promoting Mara to `expert` would be
rewriting a dossier to make a number go green — the exact move the
requirements' Collisions section forbids (*"if the bands do not produce
sensible behaviour, the derivation is wrong, not the people"*) — and lowering
the mojito hides the only hard drink on the rail. ⭐ A bar offering a drink
none of its staff can make is a **standing vacancy for a skilled
mixologist**, which is lens 3b's whole mechanism and the clearest thing this
build can show. **So `MENU_STAFF_SHORTFALL_CEILING` does NOT reach 0 in W6:**
it falls to exactly the mojito's count, and the gate's job is to keep saying
so. W6's acceptance is *the ceiling falls to the mojito and no further*, and
the drive gains a checkpoint: **order the mojito and be told nobody here can
make it, and that nobody could.** Exact
row lists are the gate's output, not this plan's guess.

---

## ⭐⭐ Host placement

| new thing | host | what composing it claims |
|---|---|---|
| `call` field + `setCall` + runtime `_lastCalled` | `OrganizationMixin` (`lib/employment/Organization.ts`) | every chart may author how it calls; a chart with no `fulfills` seat leaves it `''` and nothing reads it. No guard re-narrows: the gate requires it only where a fulfilling seat exists |
| `call(request)` method | `OrganizationMixin` | the house owns the rule, so the house resolves it (verbs on objects); reads candidates' `recognizes/regardFor/getIntention/getEngagements` — all public reads |
| `offstage` field | `BusinessMixin` (`platform/idea/Business.ts`) | only a trading house parks a rostered cast (the roster tick enumerates `BusinessMixin` and nothing else — employment.md's own rule); a non-Business Organization has no roster to move |
| `station?` on `RosterAssignment` | `lib/employment/Roster.ts` (data) | a shift is somewhere; default `operatingLocations[0]` keeps every shipped row valid |
| `_intention`, `getIntention()`, `requestBeat()`, `preemptFor(reason)`, the per-agent beat handle | `BehavedMixin` | any Behaved host deliberates — an NPC today, reactive scenery later; a host with only witness/engage specs never arms a beat (nothing to deliberate) |
| `Urgency` value object, `URGENCY_BANDS`, `TASK_KINDS`, `TASK_KIND_ORDER` | `lib/behavior/Urgency.ts` (value object / vocabulary — an existing category) | instance methods only (`outranks`, `rank`), no public statics, so `lint:lib-statics` is untouched |
| `'called'` · `'outranked'` abort reasons + `BEHAVIOR_ABORT_REASONS` | `lib/behavior/brain.ts` (declaration-merge augmentation, the `lib/script/AbortReason.ts` shape) | the behaviour subsystem owns its reasons; a pack may add its own by the same augmentation |
| `kind`, `summary`, `discipline?`, `produces?`, `consumes?`, `requires?`, `urgency?`, `interruptibleBy?` | `BrainStatics` (`lib/behavior/brain.ts`) | brain-declared, never author-set — the spec stays `{brain, trigger, config}` |
| `interruptibleBy` sourced from the brain | `BehaviorBeat` constructor arg | a beat is interruptible by what its brain says; default `['called','outranked']` for a reflex |
| `seededBandFor(discipline)` | `AdvancementMixin` (on `Character`) | any character may be asked what its dossier licensed; a player answers the floor. Mirrors `competenceBandFor` |
| `canMake` (module-private) + `CraftingApi.canMake(recipeRef)` + `resolveMaker(mode, candidates, recipe)` | `CraftingLogic` / `CraftingApi` | crafting owns "who can make this"; the kernel learns no recipe word on `Persona` |
| `not-learned` (with `couldHave` detail) + `no-call-policy` decline reasons | `CraftDeclineReason` (`api/crafting.ts`) + `lib/craft/CraftingDecline.ts` | declines are data the controller renders, as today |
| `specializes` walk in `isFulfilling` | `EmployedMixin` | a seat listing `bartending` fulfils every specialization; a seat listing `mixology` does not fulfil `bartending` |
| `behavior.beatMs` · `beatNightlyMs` · `beatMinGapMs` | `AppSettingKeys` + `platform/content/settings/behavior.yaml` | operator dials, merge-missing |
| the shifts/cover move | `EmploymentLogic.tickBusiness` (+ `ensureOperatorAt` path) | employment machinery lives in the employment engine; presence is a consequence of employment state (employment.md's own claim) |

**No new mixin, no new class, no new module category, no new Api, no new
collection.** The `Mixins` registry is untouched.

⭐ The host-placement test applied: the only place a guard was tempting is
`call()` on a plain `Organization` with no fulfilling seat — and the answer
is not a guard but that nothing ever calls `call()` on such a house
(`craftImpl` reaches it only through a fulfilling candidate's employment).

---

## Convention conformance (checked at plan time)

- **`props:` / `cast:`** — unchanged; the new cookhand is designated under
  the cookhouse row's `cast:` (`lib/stuff/Staged.ts` gates a Behaved
  target under `cast:` only).
- **Locations, not rooms** — no new location; `station`/`offstage` name
  existing location rows.
- **`<root>/<branch>/`** — new Cast row at
  `/world/terminus/hearthworks/agent/cookhand`; no new class paths; brains
  stay at `/lib/behavior/<verb>` and `/<packRoot>/behavior/<verb>`.
- **Module scope declares** — the `declare module '@saxonberg/types'`
  augmentation is a declaration; `BEHAVIOR_ABORT_REASONS` is a const.
- **Import boundary (`lint:imports`)** — `lib/behavior/Urgency.ts` imports
  nothing outside `src/mud`; `Employed.ts` reads the catalogue through
  `StuffApi` + `TemplatePaths` (no `platform/idea/DisciplineCatalogue`
  import from `lib/`).
- **No new module category, no free exported helper** — every function is
  a method, a module-private in a Logic, or a value-object instance method.
  Trigger parsing stays on the mixin.
- **Verbs on objects** — `organization.call(req)`, `host.preemptFor(reason)`,
  `host.requestBeat()`, `maker.seededBandFor(d)`; `CraftingApi.canMake
  (recipeRef)` takes no world object (actor from context, the `craft` shape),
  so `lint:object-verbs` stays at 0.
- **The XApi ↔ XLogic split** — `CraftingApi.canMake` forwards to
  `CraftingLogic`; cover/shift moves are `EmploymentLogic` module-privates
  behind the existing gated methods. No Api collapsed, none minted.
- **Privacy** — new persistent fields public (Hydrator); runtime state
  TypeScript-private; no `#` on any Stuff host.
- **Boolean fields** — none new.
- **Lint gates this build must pass**: the whole derived `lint:family`,
  and by name the ones it touches — `lint:gates` (no new `FromModule`
  strings), `lint:imports`, `lint:module-scope`, `lint:lib-statics` (no new
  public static on an exported class declaration), `lint:object-verbs`
  (census 0), `lint:openings` (every edited Business row: `fulfills` shape,
  supplier arm, reachability arm for the new `headcount` house),
  `lint:dossiers` (the cookhand's dossier + Mara's `expert`, derivable),
  `lint:identity` (the cookhand: `register: indefinite` on a nameless Cast
  ⇒ must be `definite` — a nameless Cast is *the* cookhand; or give it a
  name and `proper`), `lint:dispositions`, `lint:instanceable` (pack
  brain shape — one export; new statics are fine), `lint:unconsumed-seams`
  (`offstage` on `platform/idea/Business.ts` is read by `EmploymentLogic`),
  `lint:field-meta`, `lint:mixin-names` (untouched), `lint:test-bootstrap`,
  `lint:drive-scripts` (the drive is a wire file), `lint:census`,
  `lint:controller-rows`, `lint:verb-collisions`, `lint:schema` (no
  collection), **plus the two new gates `lint:idle-cadence` and
  `lint:menu-staff`**.

---

## Waves

Every wave lands green on `pnpm test:near` + every touched pack's vitest +
`pnpm -C packages/server lint:family`, and ends at the named commit.
`pnpm test` runs once, before the MR.

### W0 — the two gates as census, and the difficulty vocabulary closed ✅ DONE

*Implements D9 (census half), the 18-row fix.*

> **W0 note.** Both gates landed and `lint:family` is green with them in
> the derived roster (61 gates). The censuses came in at
> `IDLE_CADENCE_CEILING_PER_MIN = 263.2` (the plan predicted 257.2 — the
> difference is two specs the gate *revived*, below) and
> `MENU_STAFF_SHORTFALL_CEILING = 11`. Both carry a `*_HIGH_WATER`
> constant beside the ceiling, the `check-mass` shape, so a lowering is
> not a failing test and the past cannot be edited down.
>
> ⚠⚠ **The idle-cadence gate's FIRST RUN found five shipped behaviour
> specs with no `trigger:` at all** — `/world/terminus/infirmary/agent/
> {nurse,physician}.yaml` and `/world/terminus/necropolis/agent/
> undertaker.yaml`. `_parseTrigger(undefined)` throws, the spec is
> skipped with a `_warn`, and so: **nobody in that infirmary had ever
> been nursed**, and none of the three had ever gone off shift. The
> `nurses` specs also carried a spec-level `cadenceMs: 20000` the engine
> never reads — configuration of nothing, which is what made the missing
> trigger look deliberate. Fixed: the `nurses` specs get
> `trigger: cadence:20s`; the three trigger-less `shifts` specs are
> **removed** rather than given a trigger, because they carried no
> `config.behindBar`/`offstage` either and so could never have moved
> anybody — W3's roster tick is what actually gives those three houses
> the move, and it must now cover the infirmary and the necropolis too
> (added to W3's row list).
>
> ⭐ The menu-staff census is more interesting than the plan guessed: **11
> shortfalls, only one of them the mojito.** `fine-roast` (cooking ·
> hard) at the Hearthworks with a `proficient` cook; `leather-jerkin`
> (tailoring · hard) on the smithy menu where **no seat fulfils
> tailoring at all**; and seven fermenting/distilling lines
> (`wash-mash`, `distil`, `compound-gin`, `brandy`, `grappa`,
> `lager-mash`, both vermouths) whose yard hands are `novice` or carry no
> claim in the discipline at all. These are the same finding as the
> mojito wearing work clothes — a house offering what its staff cannot
> make — so W6 weighs each as content rather than driving the ceiling to
> the mojito alone. The `call:` arms report **8 houses** with a
> `fulfills` seat and no rule; WARN until W5 (`CALL_FIELD_SHIPPED`).

- `packages/server/scripts/check-idle-cadence.ts` + `lint:idle-cadence`
  in `package.json`: today's Σ 60/period as `IDLE_CADENCE_CEILING_PER_MIN`
  (the report prints per-row and per-brain contributions; the top three
  should be `sellsword`-class rows). Test asserts the invariant only.
- `packages/server/scripts/check-menu-staff.ts` + `lint:menu-staff`: the
  derivation over rows (D9), `MENU_STAFF_SHORTFALL_CEILING` = today's
  count; the no-`call` arm and the `CALL_POLICIES` arm are WARN this wave
  (the field does not exist yet), ERROR in W5.
- `lib/craft/Recipe.ts` `fromDocument`: `difficulty` outside `DIFFICULTIES`
  **throws** (the `maxHeatK` throw idiom two lines above) — a misspelt
  difficulty now fails the pack at `read`, where `recordCraftEvidence`
  silently credited `easy`. Import `DIFFICULTIES` from
  `../advancement/ActSignature`. `recordCraftEvidence` keeps its fallback
  one wave, then loses it.
- Content: `moderate → standard` (17 rows), `simple → easy` (1 row), in
  trade-hospitality, trade-distilling, trade-winemaking, trade-baking,
  trade-brewing. `Recipe.schema.test.ts` round-trip still green.
- Acceptance: both gates run under `lint:family --list`; `lint:menu-staff
  --report` names the bar's mojito shortfall; the recipe pack suites green.
- Commit: `build(agent-coordination W0): idle-cadence + menu-staff census
  gates; recipe difficulty closed`.

### W1 — the contract: bands, kinds, reasons, the declarations ✅ DONE

*Implements D5, D6 (the shape), the registry population.*

> **W1 note.** `lib/behavior/Urgency.ts` ships the four bands, the five
> kinds and the tie-break; `brain.ts` carries the `called`/`outranked`
> augmentation, `BEHAVIOR_ABORT_REASONS`,
> `DEFAULT_BEAT_INTERRUPTIBLE` and the seven new optional statics;
> `BehaviorBeat` takes `interruptibleBy` from its brain;
> `_parseTrigger` accepts `candidate`; and `_wireBehaviors` now fails
> loudly on a `requires: {mixins}` the host does not compose.
> 24 kernel brains re-declared. **Nothing behavioural changed** — no row
> says `candidate` yet.
>
> **Six decisions the plan did not make:**
>
> 1. ⭐⭐ **`tree-dialogue` declares `interruptibleBy: []`** — *nothing*
>    interrupts a conversation with a player, not even a call. An NPC
>    that walked off mid-sentence because its own next beat found
>    something better would be the arbiter leaking into the fiction
>    (lens 3a, *the fiction cannot betray itself*). This is the first
>    non-empty use of a field nothing had ever read, and it is a
>    deliberate empty.
> 2. ⚠⚠ **`homes.urgency` writes the trail, and has to.** The trail is
>    written by *noticing where you are standing*, and it must be written
>    on a beat this brain LOSES — an animal carried through a room while
>    it was eating still passed through that room. Leaving the note in
>    `act` would mean an animal that never wins a beat has no way home at
>    all, which is the exact failure the trail exists to prevent. It is
>    the one urgency with a side effect and it is commented as such.
> 3. ⚠⚠ **`feeds.urgency` must not read metabolism.** A metabolism read
>    RECONCILES, so asking *am I hungry* once a beat per candidate is
>    what starves the lane's unowned cat in an afternoon of uptime (the
>    guard the brain already carries, multiplied by the beat). Its
>    urgency asks the free question — *is there anything to eat* — and
>    leaves *will it eat* inside the beat it won, where the refusal reads
>    as a refusal.
> 4. **`arms` and `backs-up` factored their reads into one module
>    function each** (`firstWieldable`, `alliedFighter`) shared by
>    `urgency` and `act`. Deciding to pick up a knife and picking it up
>    ask the same question, and two copies of that walk would drift.
> 5. **`prints` declares no `discipline`** — the realm ships no
>    journalism Discipline row. The gate's own arm caught the invented
>    key on its first run, which is the arm working.
> 6. **Four slotless brains gained `claims`** — `enforces`
>    (`attention`), `cellars`/`restocks`/`eats` (`hands`+`body`). "Does
>    not do two things at once" is only true if the act says which hands
>    it is using, so the contract test makes `claims` mandatory for any
>    `work`/`body`/`threat` brain.
>
> The gate gained the declaration arms (WARN behind
> `DECLARATIONS_ARE_GATES = false`, ERROR in W4): **121 findings**, which
> *is* W2's and W4's migration list — every row wiring a brain that now
> declares `urgency` on a `cadence:` of its own.
>
> ⚠ One gate bug worth the note: the Discipline walk was first rooted at
> `packages/content`, which descends into every pack's `node_modules`,
> where the workspace symlinks make it unbounded — **the gate hung
> rather than failing**, which is the worst way for a gate to be wrong.
> It walks each pack's `content/` subtree only.

- `lib/behavior/Urgency.ts`: `UrgencyBand`, `URGENCY_BANDS` (ascending),
  `TaskKind`, `TASK_KINDS`, `TASK_KIND_ORDER`, `class Urgency { constructor
  (band, because); rank(); outranks(other, kindOf) }` — instance methods.
- `lib/behavior/brain.ts`: augment `AbortReasonRegistry` with `called: true;
  outranked: true`; export `BEHAVIOR_ABORT_REASONS`. Extend `BrainStatics`
  with optional `kind`, `summary`, `discipline`, `produces`, `consumes`,
  `requires` (`{ mixins?: string[] }` — checked at wire time with
  `MixinApi.hasMixin`, failing loud like a bad trigger), `urgency(ctx)`,
  `interruptibleBy: readonly AbortReason[]`. `ParsedTrigger` gains
  `{ source: 'candidate' }`; `BrainContext.trigger.source` gains
  `'candidate'`. `_parseTrigger` accepts `candidate`.
- `BehaviorBeat` takes `interruptibleBy` from its constructor; `_startBeat`
  passes the brain's set (default `['called','outranked']`).
- Kernel brains re-declared (24 files): `kind` per the roster table in
  the slate, `summary` (a sentence), `claims` on every work/body/threat
  brain that had none (`restocks`/`cellars`/`prints`/`eats`/`homes`:
  `hands`+`body` or `body`; `enforces`/`arms`/`wary`: `attention`),
  `discipline` where the act exercises one (`restocks` → none;
  `cellars` → the trade's; `nurses` is a pack's), `produces`/`consumes`
  kinds where the act moves goods, `urgency(ctx)` on every non-witness,
  non-engage brain with its `because` sentence. `nurses`' triage rank is
  NOT touched here (W4). `shifts`/`covers` get no declarations (they
  leave in W3).
- Tests: `Urgency.test.ts` (rank/outranks/kind order); `brain-contract
  .test.ts` walks every kernel brain and asserts the declarations parse
  (`kind ∈ TASK_KINDS`, `summary !== label`, `claims` non-empty for
  work/body/threat).
- Acceptance: nothing behavioural changes yet — every existing behaviour
  test green; `lint:idle-cadence --report` shows the declaration arms as
  WARN.
- Commit: `build(agent-coordination W1): the brain declarations — kind,
  summary, urgency, interruptibleBy; called/outranked reasons`.

### W2 — the deliberation beat ✅ DONE

*Implements D6, D7, D8; kernel-brain rows migrate.*

> **W2 note.** ⭐⭐⭐ **263.2 → 40.2 fires/min.** The realm's idle cost
> fell 85% in one wave: 75 specs across 52 rows became
> `trigger: candidate`, so 15 kernel brains stopped running timers of
> their own and joined their agent's one beat.
> `IDLE_CADENCE_CEILING_PER_MIN` ratcheted to 40.2 (28 cadence specs
> left, all pack brains — W4 — plus `shifts`/`covers`, W3).
>
> `_deliberate()` asks each candidate once, sorts by band → kind →
> hysteresis, preempts on `critical`, emotes the winner's `because`
> **only on a switch**, claims the winner's slots and runs one act. Early
> wake on a perceived `act.combat*`/`speech.` frame, debounced.
> `fireBeat` on a candidate brain runs the agent's **deliberation**, not
> that brain — a drive that could run one candidate's act directly would
> test something the world never does.
>
> **Two decisions the plan did not make:**
>
> 1. ⭐ **`cancelByPredicate` gained an optional `reason`** (threaded
>    through `SchedulerApi` → `SchedulerLogic` → `SchedulerRegistry`). It
>    hardcoded `'cancelled'`, which was invisible while nothing selected
>    on a reason at all; an `onAbort` told `'cancelled'` when it was in
>    fact `'called'` is the same class of dishonesty as a field nothing
>    reads. Not a new Api — one existing gated method, one optional arg.
> 2. **The context builder moved out of `_runAct` into `_context()`**,
>    shared with the beat: ⭐ a brain must be asked how much it wants the
>    beat **through exactly the context it will act in**, or `urgency`
>    could read a world `act` cannot.
>
> ⚠⚠ **A finding from writing the tests:** starting a `BehaviorBeat`
> under test needs the **EventRegistry singleton** bootstrapped (the
> registry subscribes to `Events.StuffDestructed` for any engagement with
> a host) — and nothing in the behaviour suite had ever started a
> durative engagement. `Behaved.test.ts`'s slot-contention test hand-rolls
> a plain `Engagement` with no `duration`, which takes a different path
> through `register`. **So the witness beat's own machinery had never run
> under test**, in the subsystem whose whole contention story rests on
> it. `deliberation.test.ts` mirrors
> `SchedulerApi.hostDestruction.test.ts`'s `makeRegistry`.
>
> ⚠ And a test-writing trap worth recording: a preemption test must drive
> the beat through `requestBeat`/`fireBeat`, never the timer. A
> `BehaviorBeat` holds its slots for 2.5 s and the beat PERIOD is 20 s, so
> advancing a full period means the thing you meant to interrupt already
> finished — the first version passed while asserting nothing.
>
> `trade-ranching`'s `working-animals` row assertion widened to accept
> `candidate`; it was the only pack test pinning the trigger vocabulary.

- `BehavedMixin`: `_beatHandle`, `_intention: Intention | null`,
  `_lastBeatAt`; `_wireBehaviors` collects `candidate` wirings and arms
  **one** `_scheduleBeat()` (jittered one-shot, re-armed; period from
  `AppSettingKeys.behaviorBeatMs` / `behaviorBeatNightlyMs`, identity
  defaults when unwarmed); `_deliberate()`:
  1. `AppApi.isWorldOpen()`; audience = `_hasAudience()`; if no audience
     and no candidate whose brain is `presenceGated === false`, return.
  2. per candidate: resolve; skip if presence-gated and unwatched; skip if
     `_blocked(requiresFree)`; `u = await urgency(ctx)`; skip `idle`.
  3. sort by `Urgency.rank` desc, then `TASK_KIND_ORDER`, then the current
     intention (hysteresis), then declaration order.
  4. winner ≠ current: if `winner.band === 'critical'` or `rank(winner) >
     rank(current)`, `preemptFor('outranked')`; if audience, `emoteFree(
     winner.because)` — **the switch prose, only on a switch**; set
     `_intention`. Winner = current: no prose.
  5. `_startBeat(claims, interruptibleBy)` then `_runAct(descriptor,
     wiring, undefined, 'candidate')`.
- `requestBeat()` (debounced by `beatMinGapMs`, schedules `_deliberate` at
  1 ms); `handleMessage` calls it on `act.combat*`/`speech.` frames.
  `preemptFor(reason)` → `SchedulerApi.cancelByPredicate(host, e =>
  e.interruptibleBy.has(reason))`, returns whether anything was cut, and
  clears `_intention` when the cut engagement was the intention's beat.
  `getIntention()` public. `fireBeat(brainPath)` keeps working for cadence
  wirings and gains the candidate path (fires `_deliberate` when the named
  brain is a candidate — the drive's seam).
- `AppSettingKeys` + `platform/content/settings/behavior.yaml`: the three
  keys.
- Rows: every `trigger: cadence:<n>` spec naming a **kernel** deliberative
  brain (`idles`, `random-chatter`, `converses`, `wanders`, `patrols`,
  `restocks`, `cellars`, `eats`, `homes`, `feeds`, `prints`, `enforces`,
  `arms`, `wary`) becomes `trigger: candidate` across every pack's content
  (mechanical; the per-spec interval is dropped — pacing is the agent's).
  `shifts`/`covers` rows untouched until W3.
- Tests (`Behaved.test.ts`, fake timers): one beat arms per host; a
  `pressing` work candidate beats a `wanted` filler; a `critical` body
  candidate preempts a running interruptible beat with `'outranked'`; the
  switch prose fires exactly once per change; an unwatched host with no
  nightly candidate runs no urgency; `requestBeat` debounces.
- Acceptance: `lint:idle-cadence` ceiling **lowered** to the new census
  (expect the kernel share of 257.2 to collapse to the nightly-candidate
  rows); bar cast still idle-emotes and chatters under the drive harness.
- Commit: `build(agent-coordination W2): one deliberation beat per agent —
  the arbiter, the switch prose, the early wake`.

### W3 — `shifts` and `covers` leave the brain rail

*Implements D4.*

- `lib/employment/Roster.ts`: `RosterAssignment.station?: string`.
  `platform/idea/Business.ts`: `offstage` field (`fieldMeta` persistent +
  authorable, `authorPicker: 'Template'`), `getOffstage()`.
- `EmploymentLogic.tickBusiness`: module-private `moveForShift(actor,
  business, assignment, on)` (teleport via `StuffApi.singletonOrClone`,
  `Mobile.teleport`, the `shifts` body verbatim) on each transition;
  module-private `reconcileCover(business, nowRaw)` (D4) called at the end
  of `tickBusiness` — so both the hourly tick and `ensureOperatorAt` run
  it. `beginCover`'s "first `fulfills` seat" stays (it is the seat a cover
  covers; the *arbitration* placeholder was `resolveMaker`'s, retired in
  W5).
- Delete `lib/behavior/shifts.ts`, `lib/behavior/covers.ts`, their tests;
  update `behavior.md` + `employment.md` (the canned-brain table, the
  `shifts`/`covers` section).
- Rows: remove the `shifts` spec from 10 cast rows and `covers` from
  Dave's; add `offstage:` to the lounge and Hearthworks Business rows
  (`/world/lounge/location/offstage`, `/world/terminus/hearthworks/
  location/offstage`) and to any other Business whose cast named `shifts`
  (the 10 rows' `offstage` configs are the list); `station:` only where
  `behindBar` differed from `operatingLocations[0]`.
- Tests: `lib/employment/__tests__/Offstage.test.ts` and the per-venue
  `offstage.test.ts` re-pointed at the tick; a new `cover-on-demand.test.ts`
  (no rostered maker, an `ensureOperatorAt` ⇒ the proprietor is covering
  and standing at the station; a rostered maker comes on ⇒ cover ends).
- Acceptance: `lint:idle-cadence` lowered again; the `bar-loop` /
  `employment-wages` / `city-budget-wage` suites green untouched.
- Commit: `build(agent-coordination W3): shifts and cover on the roster
  tick — two brains retired, cover on demand`.

### W4 — the nine packs re-declare their brains

*Implements D10; the lint arms go ERROR.*

Per pack, in this order (each pack's own vitest green before the next):
residence (`maintains`), trade-shopkeeping (`stocks`, `consigns` — 8 rows),
trade-farming (`farms`), trade-fishing (`fishes`, `reads-water`),
trade-haulage (`hauls`), trade-medicine (`nurses` — its private
`triageRank` becomes its `urgency`: 400 → `critical`, 300+ → `pressing`,
100+ → `wanted`, else `idle`, with the reason naming the patient),
trade-mining (`delves`, `reads-air`), trade-ranching (`herds`, `raids`),
trade-tailoring (`tailors` — fix `claims: string[]` to
`readonly EngagementSlot[]`), trade-textiles (`weaves`). Each brain gains
`kind`, `summary`, `claims` (the 12 slotless work brains claim `hands` or
`body`), `discipline` (`farms` → `agriculture`-class key the pack's
Discipline rows actually ship — verify per pack; a brain whose act
exercises no shipped Discipline declares none), `produces`/`consumes`
kinds, `urgency`. Its rows' `trigger: cadence:` → `candidate`.

Last commit of the wave flips the `lint:idle-cadence` declaration arms
from WARN to ERROR and lowers the ceiling to the post-migration census.

- Commit per pack: `build(agent-coordination W4/<pack>): <brains>
  re-declared as candidates`; closing commit `build(agent-coordination
  W4): the declaration arms are gates`.

### W5 — the call and the capability gate

*Implements D1, D2, D3, D11, D12.*

- `lib/employment/CallPolicy.ts`: `CallPolicy = 'regulars' | 'rota'`,
  `CALL_POLICIES`, `CallRequest { patron: Stuff; candidates: readonly
  Stuff[] }`, `CallVerdict = { ok: true; chosen: Stuff } | { ok: false;
  reason: 'no-call-policy' | 'nobody' }`.
- `OrganizationMixin`: `call` field + `setCall` (throws on an unknown word)
  + `getCall()`; `_lastCalled: Map<string, number>` (runtime); `call(req):
  CallVerdict` implementing D2's legs (reads `WorldClockApi.getNow()` for
  the rotation stamp; identity via `getIdentityPath()`).
- `AdvancementMixin.seededBandFor(discipline)`.
- `CraftingLogic`: `canMakeImpl(maker, recipe)` (D3); `resolveMaker(mode,
  candidates, recipe)` **async and handed its set** — `craftImpl` computes
  the present `isEmployed && isFulfilling(recipe.discipline)` occupants
  (the same walk, now the caller's), filters by `canMakeImpl`, and: none
  fulfilling ⇒ the existing no-maker decline; fulfilling but none can ⇒
  `not-learned` with `detail` naming who could (present able makers, then
  the house's roster holders via `holdersOf` who `canMake`, then *"nobody
  here can"*); else resolves the house from the first candidate's
  fulfilling employment (`getActiveEmployments()[…].organizationPath` →
  `StuffApi.findByTemplatePath`) and calls `house.call({patron, candidates})`
  → `no-call-policy` decline, or `chosen`. Then `if (isBehaved(chosen) &&
  chosen.preemptFor('called'))` emit one scene to peers (*"X sets aside
  what they were doing and comes over."*) and `chosen.requestBeat()`. Craft
  proceeds. `recordCraftEvidence` drops the `'easy'` fallback (W0 made it
  unreachable).
- `CraftingApi.canMake(recipeRef): Promise<boolean>` (actor from
  `getActingAuthor`); `CraftDeclineReason` gains `'not-learned'` and
  `'no-call-policy'`; `CraftingDecline.messageFor` renders both, the first
  with the names.
- `CraftController.requireDeed` reads `CraftingApi.canMake` (so the
  derived rung applies to `make`/`cook`/`forge`/`bake` too — an NPC never
  types those, and a player has no seeded band, so nothing observable
  changes for them). `MixController` + `ServeController` call
  `requireDeed(context, model.cocktail, 'mix'|'serve')` before crafting.
- `EmployedMixin.isFulfilling`: the `specializes` walk (D11).
- Content: 20 cocktail rows → `discipline: mixology` (D12).
- `lint:menu-staff`: the no-`call` and `CALL_POLICIES` arms → ERROR.
- Tests: `CallPolicy.test.ts` (regulars picks the recognizer; rota rotates;
  no policy refuses; no identity-order tie anywhere — a player and two NPCs
  over 30 calls each get some); `canMake.test.ts` (a seeded proficient
  makes standard not hard; a player with lived deeds and no claims makes
  nothing by band; the chronicle deed lifts it; a formidable recipe is
  hand-only); `knowledge-ladder.test.ts` gains the `mix`/`serve`/`order`
  cases (read the menu ⇒ still refused; the wiki-parity claim extended to
  three more verbs); `isFulfilling` specializes case; the refusal names
  somebody present, then somebody rostered, then nobody.
- Acceptance: the bar suite (`menu.test.ts` over the hospitality
  archetype) green — its ordered lines must be makeable by its materialized
  staff, which is the gate working; `lint:menu-staff` at the W0 ceiling.
- Commit: `build(agent-coordination W5): the call — a house's authored
  rule, and the can-make gate on order/mix/serve`.

### W6 — the realm rosters its consumers

*Implements D13.*

- Bar: the three roster edits; `call: regulars`; Mara `mixology: expert`.
- Hearthworks: `agent/cookhand.yaml` (a `Cast`; `lint:identity` rule 2
  decides its register), `cast:` entry on the cookhouse row, roster slot
  `kitchen-hand [0..6] 11–19`; `call: rota`.
- Every other Business the gate names: `call: rota`.
- `lint:menu-staff` ceiling → **0**; `lint:dossiers` green (Mara's
  `expert` derivable at `hard × 4`).
- Tests: `roster-coverage.test.ts` in `saxonberg-lounge` — every
  `(weekday, hour)` of the week has a non-proprietor `bartender` on the
  bar's roster via `Roster.evaluate`; the Hearthworks `hearthworks`
  suite asserts two on-shift `cooking` fulfillers at 12:00.
- Commit: `build(agent-coordination W6): two on the rail, a cookhand at
  the hearth, the weekend staffed; every house calls`.

### W7 — the drive and the docs

- `packages/wire/tests/agent-coordination.dirty.wire.test.ts` (dirty:
  appoints a newcomer to the bar's `bartender` seat and earns them a deed;
  neither reverts). Steps 1–14 of the requirements' drive script as
  checkpoints; step 15 replaced by the W6 roster test **and** a live
  checkpoint that no cover is active at the bar under the drive's hour.
  Beats are fired through `eval … this.fireBeat(...)` (the shipped seam)
  where waiting on a real beat would exceed the harness budget; the switch
  prose checkpoint reads the peers' scene.
- Docs: `behavior.md` (the two-layer model, the declarations table, the
  beat, the settings, the retired brains), `employment.md` (the call, the
  tick's move + cover-on-demand, `station`/`offstage`), `crafting.md`
  (the gate on all eight one-shots, `canMake`, the refusal that names),
  `advancement.md` (`seededBandFor` and what a claim licenses),
  `identity.md` (the dossier's third consumer), `attendant.md` (one line:
  the supply-side twin exists now), `lint-family.md` (two gates). A line
  in `CLAUDE.md`'s map only if `behavior.md`'s one-liner no longer holds
  (it should: the doc grows, the blurb stays).
- Commit: `drive(agent-coordination): <what driving found>` then `docs:
  agent-coordination — subsystem docs`.

Then: `pnpm test` once, push, open the MR against `master`.

---

## Reachability wiring

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| the beat | none new | n/a | `trigger: candidate` on 80+ rows (W2/W4) — a row left on `cadence:` keeps the old path, visible to `lint:idle-cadence` | `settings/behavior.yaml` merge-missing keys; unwarmed ⇒ identity defaults | n/a |
| switch prose | none | n/a | a brain's `because` | `Soul` on the host (`emoteFree` is a safe no-op otherwise — a mute NPC switches silently, which is honest) | n/a |
| preemption | `order` (existing) | existing (`Menu` affords `order`) | `interruptibleBy` on every beat | `SchedulerRegistry` booted (always) | n/a |
| the call | `order` | existing | `call:` on every fulfilling Business (W6) — **absent ⇒ `no-call-policy` decline, never the first member**; `lint:menu-staff` refuses the row | the house stands up lazily at `ensureOperatorAt`, as today | n/a |
| the gate on `mix`/`serve` | existing hospitality verbs | `BarStation` statics (unchanged) | the recipe's `difficulty` + `discipline`; the dossier's `competence:` | `RecipeCatalogue` + `DisciplineCatalogue` warmed (both manifest-booted) | `mix.yaml`/`serve.yaml` args unchanged — ⚠ verify neither view's `args[].requires` names a mixin the newcomer lacks; the drive's step 10 is the check |
| the derived rung | — | — | claim-kind Transcript rows (dossier only) | Transcript store active (`transcriptActive()`) | n/a |
| shifts/cover on the tick | — | — | `offstage:` on the Business; `station?` | `EmploymentEngine` armed; `ensureOperatorAt` at the first order | n/a |
| the cookhand | — | `cast:` on the cookhouse row | the roster slot; the dossier | residency spawns cast on arrival; the tick materializes the record | n/a |
| the two gates | — | — | — | `lint:family` derives the roster from `package.json` | — |

---

## Acceptance-criteria coverage

| criterion (requirements) | wave | proof |
|---|---|---|
| Two or more people work one shift, no player, work shared | W5 + W6 | `roster-coverage` + `CallPolicy` rota test; drive 7 |
| A patron can predict who comes over; a regular gets their regular | W5 (`regulars`) | `CallPolicy` regular test; drive 9 |
| A newly hired player gets some orders and not all | W5 (rotation leg, no identity order) | the 30-call distribution test; drive 8 |
| An NPC visibly changes task with a stated cause | W2 | switch-prose test; drive 2, 3 |
| Does not do two things at once; working reads as working | W1 (`claims` mandatory) + W2 (one winner) | contract test + beat test |
| The palette tells what each brain is for | W1 + W4 (`summary`, `kind`, `requires`) | `lint:idle-cadence` summary arm |
| Told the bartender does not know it, and who does | W5 | refusal-naming test; drive 4, 14 |
| Read the menu, cannot `mix`; after a hand build, can | W5 | `knowledge-ladder` extension; drive 10–13 |
| The same gate refuses a player and an NPC | W5 (`canMakeImpl` is the one read) | `canMake` test |
| Remy and Sloane differ in what they can make, no new content | W0 + W5 | `canMake` over the shipped dossiers |
| Nobody credited with a trade they were wrongly routed into | W5 (gate before credit; mixology credit) | `recordCraftEvidence` test |
| Somebody other than the owner on the bar at 03:00 Saturday | W6 | `roster-coverage` (weekday 5, hour 3) + no-cover checkpoint |
| Every house can make everything it offers, or the build says which | W0 (census) → W6 (ceiling 0) | `lint:menu-staff` |
| Idle cost lower, and a gate holds it | W0 → W2/W3/W4 | `lint:idle-cadence` ceiling lowered three times |
| A house with staff and no call rule cannot boot | W5 (arm ERROR) + resolver refusal | `lint:menu-staff`; `CallPolicy` no-policy test |

Nothing unmapped. ⚠ One requirements sentence the plan does **not**
implement: gating `preserve` — it was never gated (grounding) and gating it
now would lock a verb with no by-hand earning path; recorded in § Risks for
the user rather than absorbed.

---

## Test & gate strategy

- **Unit** (`test:near` per wave): `Urgency`, the brain contract walk, the
  beat (fake timers), `CallPolicy`, `canMake`/`seededBandFor`,
  `isFulfilling` specializes, cover-on-demand, roster coverage, the
  ratchet tests for both gates (invariant, never the number; plus a
  fixture each that asserts a POSITIVE finding — a `moderate` recipe row is
  refused, a fulfilling house without `call:` is refused, a `candidate`
  spec over an `urgency`-less brain is refused).
- **Pack suites**: each of the nine packs' own vitest at its W4 commit;
  trade-hospitality's at W5 (the `mix`/`serve` gate).
- **Lints**: `lint:family` at every commit.
- **Drive** (the exit criterion): the wire file in W7, run against the
  booted world before the MR; the record appended below.
- **Full suite**: once, before the MR opens; once at `/finalize`.
- What only the drive proves: the switch prose reaching a peer's
  transcript; the preemption-then-serve sequence in one dispatch; the
  refusal text as a player reads it; two NPCs sharing orders with no
  wizard present.

---

## Risks & opens

1. **Requirements inaccuracies, recorded not absorbed.** (a)
   `AbortReasonRegistry` is not empty — eight augmentations exist; the
   behavioural set is. (b) `preserve` is not deed-gated today, by
   documented design; this plan leaves it so (a gate with no earning path
   is a lock). (c) 98 recipes, not 97; 20 cocktails move, not 25 (D12).
   (d) The residency collision is moot (`canEvict`). (e) *"seat eligibility
   is untouched"* needs D11's walk. The user should confirm (b) and (c).
2. **`interruptibleBy` has never been consulted by anything.** The
   arbiter and the call are its first consumers; every existing engagement
   that declared a set was declaring to nobody. `cancelByPredicate` on the
   host is the honest mechanism; nothing in `SchedulerRegistry` changes.
3. **Drive step 15 is not clock-reachable.** The wire clock runs at 12×
   and `setScale` is an operator act; a game week is 14 real hours.
   Covered by the roster-coverage unit test plus a live "no cover active"
   checkpoint. If the user wants it driven live, it needs a `clock` verb
   the project has so far refused.
4. **The derived rung licenses future LMS claims.** Any `kind: 'claim'`
   Transcript row licenses recipes at its band. Today only the dossier
   writes claims; the academy faucet (advancement.md) will too, which is
   arguably right (an attested course licenses what it taught). Flagged.
5. **Two houses in one room.** `craftImpl` resolves the house from the
   first candidate's fulfilling employment; every shipped venue has one
   house per room, but a shared room with two fulfilling houses would
   route the call to whichever candidate came first in `getContents()`.
   The build should decline `ambiguous-house` if the candidates' houses
   differ rather than pick — cheap, and the honest answer.
6. **The `nurses` row config `cadenceMs: 20000`** — its own pacing knob,
   read by the brain; under the beat it is dead config. W4 removes it.
7. **Formidable recipes are hand-only** (two mining rows). Correct under
   D3, but a menu offering one will never pass `lint:menu-staff` unless a
   chronicle deed is earned by a Cast — which nothing does. If such a menu
   appears, the answer is content (do not offer it) or the deferred seam
   below, not a widening of the rule.
8. **A Behaved host that is not `Engaged`** (reactive scenery later): the
   beat runs, `preemptFor` is a no-op, `_startBeat` is skipped — as
   `_runAct` already handles. No guard needed; noted so the build does not
   add one.
9. **Ambient budget under the beat.** `beatMs` 20 s with `idles` as a
   `wanted` filler means an idle emote up to every 20 s while watched —
   louder than the documented 60 s floor. The build applies
   `_effectiveCadence` (scale + floor) to the beat period whenever the
   winning candidate is `ambient !== false`, and should tune `beatMs`
   against the pacing table in behavior.md § Ambient pacing budget before
   the drive.
10. **The cookhand's register.** `lint:identity` rule 2 refuses
    `indefinite` on a nameless Cast; either name the cookhand or use
    `definite` (*the* cookhand). The build decides; both are legal.

---

## Deferred seams

Clean attach points, each with the slate it leaves as:

- **The LLM arbiter** — `Behaved._deliberate` sorts a `Candidate[]`
  (`{wiring, descriptor, urgency}`) through one protected method
  `_arbitrate(candidates): Candidate | null`; an LLM brain overrides it
  with the list as its prompt. → llm-content-slate.
- **A brain-specific break-off sentence** (`breaksOff?: string` on
  `BrainStatics`) — the kernel's one generic sentence serves until a
  brain wants its own. → agent-coordination-slate.
- **A `critical` need that refuses a call** — importance flows one way
  (D1); the reverse needs a criterion and an appeal. → call-slate (lens 7
  question already recorded there).
- **The addressed posting** — `claimMode` gains `addressed`; the
  resolver already takes a handed-in set. → call-slate § the board
  unification.
- **The push-at-range column** (dispatch, turnout, hue and cry) — the
  caller hands a different candidate set. → call-slate + policing-slate.
- **A Cast earning a chronicle deed by acting** (the formidable rung for
  NPCs) — the by-hand verbs through `forceCommand` from a brain. →
  npc-behavior-slate.
- **`produces`/`consumes` consumed** — the chain walk over the
  declarations; `vocations.md` derived. → vocations register.
- **The senior seat, the inventory duty, the shift hand-off** →
  daves-bar-slate.
- **`Troupe`** stays unspent. → call-slate § the name.

---

## Critical files

Read first, in this order:

- `docs/requirements/agent-coordination-requirements.md`
- `packages/server/src/mud/lib/behavior/Behaved.ts` ·
  `lib/behavior/brain.ts` · `lib/behavior/BehaviorBeat.ts`
- `packages/server/src/mud/lib/activity/Engaged.ts` (the augmentation +
  the participant gate) · `platform/idea/SchedulerRegistry.ts` (:216,
  :284, :339) · `api/scheduler.ts`
- `packages/server/src/mud/platform/idea/api/CraftingLogic.ts` (:196-215,
  :1709-1739) · `api/crafting.ts` · `platform/idea/cmd/crafting/
  CraftController.ts` · `platform/idea/cmd/retail/OrderController.ts` ·
  `packages/content/trade-hospitality/src/idea/cmd/crafting/
  {Mix,Serve}Controller.ts`
- `packages/server/src/mud/lib/script/RecipeKnowledge.ts` ·
  `lib/character/Persona.ts` (:280-335) · `platform/idea/api/ScriptLogic.ts`
  (:311-334)
- `packages/server/src/mud/lib/advancement/{Competence,CompetenceBand,
  ActSignature,Advancement}.ts` · `lib/npc/Cast.ts` (:185-245)
- `packages/server/src/mud/lib/employment/{Organization,Employed,Position,
  Roster}.ts` · `platform/idea/Business.ts` · `platform/idea/api/
  EmploymentLogic.ts` (:795-830, :1320-1440) · `platform/idea/
  EmploymentEngine.ts` · `lib/behavior/{shifts,covers}.ts` (to retire)
- `packages/server/src/mud/lib/attendant/Attendant.ts` (:36-56, :302-323
  — the vocabulary shape to copy, the unvalidated field not to)
- `packages/server/src/mud/lib/craft/Recipe.ts` (:288, :335-365)
- `packages/server/scripts/{check-dossiers,check-openings,
  check-lib-statics,pack-roots}.ts` · `docs/lint-family.md`
- `packages/content/saxonberg-lounge/content/world/lounge/{idea/business,
  agent/*,thing/bar-menu}.yaml` · `packages/content/hearthworks/content/
  world/terminus/hearthworks/{idea/business,agent/*}.yaml` ·
  `packages/content/trade-hospitality/content/recipes/*.yaml`
- `packages/content/platform/content/settings/behavior.yaml` ·
  `packages/server/src/mud/lib/config/AppSettings.ts` (:195-215)
- `packages/wire/tests/trades-and-labor.dirty.wire.test.ts` +
  `economic-bootstrap.dirty.wire.test.ts` (the `fireBeat` seam) ·
  `packages/wire/src/harness/`
- `docs/subsystems/{behavior,activity,employment,crafting,advancement,
  identity,attendant}.md`

---

## Drive record

*(appended at build time, not at plan time — the output of running the
requirements doc's drive script against the booted world, checkpoint by
checkpoint, with the count and what each failure was. Precedent:
`farming-plan.md § Checkpoint A`.)*
