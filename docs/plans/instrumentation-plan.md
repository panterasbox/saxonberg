# Instrumentation — implementation plan

Executes [instrumentation-requirements.md](../requirements/instrumentation-requirements.md)
(kind **feature**, **kernel-led**; first consumers are the thirty-two
shipped reads across six trades, every one retrofitted, and the
prospector's round trip). What is built: the two read verbs become one
flat ladder — a **channel** is a row any pack can ship, a **route** is a
rung on that channel (eye · instrument · bench · record), competence
resolves detail and never access, an instrument's grade is a ceiling, a
reading is an act with a seeded honest error, a sample is the real
material stamped with where it was taken, a bench is a fixed tool that
eats the sample over game-time, and the two engine-meta reads leave the
verb. Stage A is the retrofit and the ladder; Stage B is the sample, the
bench, the lab, the assayer, salting, the spoiled sample and the mirror.

Requirements decisions are cited as `R-D<n>`; this plan's own decisions
are `D<n>`.

---

## Grounding

Verified this cycle by opening the files. The long-form survey is in the
scratchpad (`grounding-verified.md`); this is every fact a wave depends
on, with its citation.

### The verb layer

- **A view is one document per file, loaded whole; nothing merges two
  documents' `subcommands` maps.** Schema closed (`additionalProperties:
  false`) — `packages/server/src/mud/lib/command/command.schema.json:6-116`;
  loader caches one `CommandDefinition` per file —
  `packages/server/src/mud/lib/command/CommandLogic.ts:495-497,540-545,556`.
  `commandContributions` names a **whole view**
  (`{self?, inventory?, environment?, peers?}: string[]`,
  `packages/server/src/mud/api/command.ts:328-333`). So a pack channel
  today is a stanza inside the platform's `measure.yaml` / `analyze.yaml`
  naming a pack controller by absolute path
  (`packages/content/platform/content/platform/cmd/perception/measure.yaml`,
  `analyze.yaml`) — advertised in every install and dying on dispatch
  where the pack is absent (`CommandGiver.ts:1237-1247`,
  `controller-error`). An unknown subcommand **stops** the affordance
  chain (`CommandLogic.ts:875-897`, `CommandGiver.ts:1088-1104`).
  ⭐ **De-subcommanding is therefore forced** (D1).
- **The shipped flat-positional shape is `cast <spell> [at <target>]`**:
  `packages/content/arcana/content/system/arcana/cmd/magic/cast.yaml`
  (`spell: string required`, `target: object optional requires: any`),
  controller `packages/content/arcana/src/idea/cmd/magic/CastController.ts`
  (resolves the string against a catalogue, refuses with
  `controller-rejected` + prose). An unresolved object arg binds as
  `MqlOneResult` with `stuff === null` and the typed text in `raw`
  (`MeasureLightController.ts:33-41`, `CastController.ts:57-68`).
- **The listing idiom**: `packages/content/arcana/src/idea/cmd/magic/SpellsController.ts`
  — topic `shell.result`, one call to the actor's own `spellsView()`,
  *"within your command (band)"* / *"beyond you yet (needs band)"*, and
  the firewall *bands and prose only, never numbers; a self-view*.
- **Affordance today**: `Avatar.commandContributions.self` carries
  `analyze.yaml` (`packages/server/src/mud/platform/agent/Avatar.ts:203+`);
  ten platform instruments + `SurveyInstrument`, `SoilKit`, `Spade`,
  `MeasureBook` carry `measure.yaml` on `environment`/`peers`
  (`grep -rl 'measure.yaml' packages/server/src packages/content`).
  `docs/subsystems/command-routing.md:536-541` states *"nothing should
  ever put `measure` on a body"* — a doctrine line this plan **lifts**
  (D3), with the reason.
- **`CommandController.refuse(context, topic, line, reason, detail)`**
  exists (`packages/server/src/mud/lib/command/CommandController.ts:142-169`)
  with the exact prose-plus-note shape; the three trade bases hand-roll
  it (`SurveyChannelController.ts:104-108`, `SoilChannelController.ts:113-121`,
  `MeasurePassageController.ts:87-93`).
- **Arg schema** (`command.schema.json:180-292`): `type`
  string|object|objects|struct, `required`, `greedy`, `default` (through
  `ShellApi.expandVariables`), `scope` (MQL fragments, first non-empty
  wins), `prepositions`, `requires` (mixin names, `|` for either, `any`),
  `onExcess`/`onShortage`/`onFiltered`. `[capability.X]` is a first-class
  MQL bracket filter dispatching to `hasCapabilityByLowercaseName`
  (`api/mql/resolver.ts:1573-1582`), requiring `MixinApi.isTool`; ~29
  content rows already use it.
- **`system/` verbs are free**: `affordances.yaml` and `errors.yaml`
  carry no validators (`packages/content/platform/content/platform/cmd/system/`).
  The `author/` category is only partly wizard-gated (`eval`, `reload`,
  `practice`, `cms`, `studio` carry `requiresWizard`; `clone`, `destruct`,
  `goto`, `pack`, `player`, `wizard` do not).
- **Verb names free**: `assay`, `readings`, `sample`, `trace` match no
  `verbs:` line in any view (`grep -rlE '^verbs:.*\b(readings|sample|assay|trace)\b' packages/content`). `collect` is taken.

### The lint that should have caught the core defect

- `packages/server/scripts/check-instrument-args.ts` — ceiling
  `BESPOKE_RESOLUTION_CEILING = 0`, passes, while nine platform reads
  hunt through an **alias**: `const inv = MixinApi.isContainer(giver) ?
  (giver as Stuff & Container).getContents() : []; if
  (!inv.some((i) => i instanceof GasAnalyzer))` —
  `MeasureAtmosphereController.ts:31-34`, `MeasureShadowController.ts:31`,
  `MeasureTemperatureController.ts:37`, `MeasureGravityController.ts:33`,
  `MeasurePressureController.ts:33`, `MeasureDensityController.ts:35`,
  `MeasureHumidityController.ts:33`, `MeasureAltitudeController.ts:51,147`.
  The matcher's `CHAIN_WALK` (`/\.getContents\(\)\s*(?:as[^;]*?)?\.(find|filter|some)\(/`)
  needs the walk and the predicate on one statement; the alias breaks the
  statement in two. Widen, then convert (D17).
- `packages/server/scripts/check-capabilities.ts:60-135` — producers are
  `capabilities:` lists in YAML rows; consumers are `toolCapabilities:`,
  archetype `needs: {tool: X}`, and `[capability.X]` / `hasCapability(X)`
  in source. Both ceilings 0. ⭐ A Reading row's `instrument:` /
  `handTool:` / `bench:` field is a **new consumer shape** the scanner
  must learn in the same wave the rows land, or `declaredNeverConsumed`
  fires on every instrument capability (W1).

### Instruments, tools, quality

- The ten platform instruments are `export default class X extends
  Thing` with **no mixin and no static but `commandContributions`**
  (`packages/server/src/mud/platform/thing/instrument/Thermometer.ts:16-20`
  and nine alike). `Balance.ts:12-17` contributes `weigh.yaml` instead
  and is out of scope. Rows: nine in
  `packages/content/generic-objects/content/stuff/thing/instrument/`
  (altimeter, balance, barometer, gas-analyzer, gravity-meter,
  hydrometer, hygrometer, photometer, thermometer; row shape
  `photometer.yaml`: `class`, `shortDescription`, `keywords`, `register`,
  `long`). **`Sundial` and `Sextant` have no row anywhere.**
- `packages/server/src/mud/platform/thing/ToolItem.ts` =
  `CraftedMixin(ToolMixin(DurableMixin(DetailedMixin(Thing))))`
  (`ToolItem.ts:37-39`); `CraftedMixin` composes `GradedMixin`
  (`lib/crafting/Crafted.ts:110`). `SurveyInstrument`
  (`packages/content/trade-mining/src/thing/instrument/SurveyInstrument.ts:23`)
  and `SoilKit` (`packages/content/trade-farming/src/thing/SoilKit.ts:26`)
  already extend it; their rows declare `capabilities:`
  (`trade-farming/content/trade/farming/thing/soil-kit.yaml`:
  `capabilities: ["soil-testing"]`, `mass`, `_materialPath`). So every
  pack instrument already carries `gradeBand` (default `fair`) and
  `condition` 0..1 with `wear(amount)` (`lib/crafting/Durable.ts:71,89-92`);
  `ToolMixin.hasCapability` **already returns false for a broken tool**
  (`Tooled.ts:111-118`). **Nothing calls `.wear()` on a reading** —
  `.wear()` appears only in `MaintainController`, `SharpenController`,
  `HammerController`.
- `MaterialApi.gradeConditionScale(grade, condition)`
  (`api/material.ts:157-159` → `MaterialLogic.ts:403-411`):
  `lerp(0.85, 1.15, ordinal/4) × lerp(0.5, 1, condition)`, dialled; used
  by thermal, armor, delivery and `CombatLogic.instrumentDeliveryScale`
  (`CombatLogic.ts:2278`, narrowing with `MixinApi.isGraded`/`isDurable`).
  ⭐ The ceiling model reuses it (D6).
- **`ToolCapability` is an open vocabulary** — the kernel keeps no list
  (`SurveyChannelController.ts:58-63`).

### Competence

- `packages/server/src/mud/lib/advancement/CompetenceBand.ts` — a
  **static-method value object**: bands `untrained · novice · competent ·
  proficient · expert` (`:22-35`), `FLOOR = 'untrained'` (`:58`),
  `forTheta`, `rank`, `atOrAbove`, `lowered`, `oneBelow`, `higher`.
- `competenceBandFor(discipline)` on `AdvancementMixin`
  (`lib/advancement/Advancement.ts:283` iface, `:509-526` impl);
  `creditDeed({discipline, difficulty, outcome})` (`:281`, `:470-482`).
  The only kernel host is `lib/character/Character.ts:99`
  (`AdvancementMixin(...)`) — Avatar, Cast and Extra all descend from it.
- **The byte-identical band read** `MixinApi.isAdvancing(g) ? await
  g.competenceBandFor(D) : CompetenceBand.FLOOR` sits at
  `SurveyChannelController.ts:216-218`, `SoilChannelController.ts:213-215`,
  `MeasurePassageController.ts:102-104`. The **per-trade band→hedge
  tables do not move**: mining `ERROR_DEG` + `SOLVE_FROM`
  (`SurveyChannelController.ts:79-99`), farming `PH_ERROR` +
  `GENERALISE_FROM` (`SoilChannelController.ts:88-108`), haulage's
  prose-only `CONFIDENCE` (`MeasurePassageController.ts:39-52`).
- **Disciplines are rows**, `class: /platform/idea/Discipline`, at
  `<root>/idea/Discipline/<key>.yaml` with `key`, `channel: skill`,
  `label`, `iscedf`, `description`, `specializes`
  (`packages/content/trade-farming/content/trade/farming/idea/Discipline/soil-science.yaml`;
  `trade-mining/content/trade/mining/idea/Discipline/geology.yaml`;
  platform's at `packages/content/platform/content/platform/idea/Discipline/`).
  `DisciplineCatalogue` (`platform/idea/DisciplineCatalogue.ts`) finds
  pack rows (geology bands today). Absent: `chemistry`, `physics`.
  Doctrine: a Discipline is an ISCED-F field, not a job title
  (`docs/subsystems/advancement.md:463`).
- **An NPC's competence is seeded by its dossier**:
  `packages/content/hearts-delight/content/world/terminus/hearts-delight/agent/farmer.yaml:25-27`
  — `competence: [{discipline: soil-science, asserting: competent}]`.
- **The wizard-gated competence harness exists**: `practice <discipline>
  [difficulty] [outcome]`
  (`packages/content/platform/content/platform/cmd/author/practice.yaml`,
  validator `requiresWizard`). The wire harness can log a session in as
  a wizard (`packages/wire/src/harness/session.ts:187-202`, `opts.wizard`).

### The record

- **Mining's field book is a per-viewer belief, not a class**:
  `store.know(DISCOVERY, referentFor(deposit, where, channel), {knownAs:
  String(reading), found: true})` (`SurveyChannelController.ts:239-256`),
  referent `` `survey:${deposit path}@${where}#${channel}` `` (`:281-289`),
  read back by `recallAll()` (`:258-279`). Farming is verbatim with
  prefix `soil:` and keys on the covering **Locality address**
  (`SoilChannelController.ts:233-277`, `groundIdOf()` `:284+`).
  ⭐⭐ **The reading is stored, the band is not** (`:234-238`) — a reader
  who improves re-reads old notes better. Both duck-type the store
  (`typeof store.know !== 'function'` → return). Storage `beliefs`
  keyed on `getIdentityPath()` (`lib/belief/BeliefStore.ts:112,236-272`).
- `DOCUMENT_KINDS` is closed to packs (`DocumentKinds.ts:12-16`, 15 kinds).
  A ledger on an instance persists as a `persistent` field through the
  spine into `holder_snapshots` — `MineWarren.ts:137-140`,
  `trade-tailoring/src/thing/MeasureBook.ts:88-90` (flat scalars, default
  Hydrator).

### The portion and its clocks

- `packages/content/trade-mining/src/thing/Ore.ts` — `Ore extends
  StackableMixin(Thing)` (`:43-45`); `grade` in [0,1], `fieldMeta
  {persistent, authorable, spoiler: 1, spoilerName: 0}` (`:49-54`);
  `metalFractionOf(path)` = kind composition × grade (`:91-98`);
  `onMerged` mass-weights grade (`:104-120`), `canMergeWith` stashes the
  absorbed grade first because `StackableLogic.merge` destructs the
  absorbed stack before the hook (`:155-163`); `onSplit` copies `grade` +
  `gangueMaterialPath` (`:130-137`). ⚠ **`split` auto-copies only
  `stackIdentityFields`** (`lib/stuff/Stackable.ts:30-39,87-102`).
- **No generic lump class exists** (exhaustive search). `Chattel`
  excludes stackable hosts (`lib/chattel/Chattel.ts:20-24`) — provenance
  cannot be chattel-shaped.
- `packages/server/src/mud/platform/thing/Provision.ts:51-56` =
  `CraftedMixin(ComposedMixin(ContaminableMixin(CuredMixin(ThermalDoseMixin(FreshnessMixin(ThermalMixin(DetailedMixin(Thing))))))))`
  — **not Stackable**; the perishable clocks (`FreshnessMixin` bands
  `fresh|tainted|spoiled|rotten` at 0.25/0.6/0.85,
  `lib/material/Freshness.ts:83,116-118`) already run on it.
  `pnpm lint:perishable` checks that a class source's composition string
  reaches `FreshnessMixin` (`scripts/check-perishable.ts:55,122-152`).
- **Ore is minted at a face by `hew`**: `winOre()` — a **module-level
  function** — `StuffApi.clone(oreRow)` → `setGrade(chosen.grade)` →
  `ContainmentApi.move(lump, room)` → `working.recordWinning` →
  `stampChattel(owner)` → `creditDeed`
  (`packages/content/trade-mining/src/idea/cmd/mining/HewController.ts:129-215`).
  Faces come from `working.facesOf()` (`trade-mining/src/lib/Working.ts:216,448`;
  `Face` `:91`, `getOreRow` `:196`). Each face is a **room**
  (`packages/content/rejection/content/world/terminus/rejection/ferrow/face.yaml`,
  `class: /trade/mining/location/MineRoom`, `oreRow:`).
- `Deposit.surfaceReadingAt(x, y, errorDeg, seed)` takes the band's error
  as INPUT and returns truth + observation
  (`trade-mining/src/idea/Deposit.ts:413`) — the test shape *"identical
  truth, different resolution."*

### The timed, unattended act

- `packages/content/trade-milling/src/idea/cmd/milling/MillController.ts:1-40,153-208`
  is the ruling: attended work is `ManualBuildStep` + `SchedulerApi.start`;
  **unattended work is `WorldClockApi.after(Quantity.of(s,'s'), () => {
  void finish(...); }, { host, tag })`** (`api/worldclock.ts:167-173`), a
  **module-level** completion (a controller is destructed when `execute`
  returns; a `this` callback silently no-ops), and a **busy flag on the
  host**. `SchedulerRegistry.start` **throws on `slots: []`** — an
  engagement cannot express unattended work.

### The place, the queue, the pay

- **An archetype is a document, its only reader is `survey`**, which
  reports a room as an archetype when its fixtures satisfy the declared
  needs (`ArchetypeCatalogue.ts:54-67`, `Archetype.ts:449-468,502-572`,
  `SurveyController.ts`). ⚠ `roomArchetypes()` filters to
  `getIndustry() === null` (`SurveyController.ts:157-168`) — **a lab
  archetype with `industry:` is never reported.** The gym is the model:
  `packages/content/generic-objects/content/archetypes/gym.yaml`
  (`archetypeId`, `label`, `capabilities: [{key, needs: {tool: X}}]`, no
  industry). Fourteen ship (`packages/content/*/content/archetypes/`).
- **Non-carryable is `fixedInPlace: true` on the row**
  (`lib/spatial/Containable.ts:211,277-284`; `GetController.ts:200-227`,
  refusal `fixed-in-place`). `FixtureMixin` is self-seating, a different
  job (`lib/furnishing/Fixture.ts:20-23,66-74`).
- **A workplace is a `Business` row** with `positions[]` (`key`, `noun`,
  `label`, `wageRate`, `confers`, `purchases?`), `rosterSlots[]`,
  `operatingLocations` naming the **fixture**
  (`packages/content/saxonberg-lounge/content/world/lounge/idea/business.yaml`).
  The pay leg: `EmploymentApi.ensureOperatorAt(venuePath)` →
  `EmploymentApi.operatingAccountOf(business)` → a `BankingApi` post with
  `Money.of(amount, BankingApi.compactCurrency())`
  (`platform/idea/cmd/retail/BuyController.ts:305-320`).
- `AttendantMixin` (`lib/attendant/Attendant.ts:123,141-149,231-234,296-318`)
  is a **person-serves-you** lease (roster assignee on shift, same room,
  attention-free); the assay is unattended and does not compose it (D13).
- **The campus is the `eternal-university` pack**, content only, its
  zones are `CartesianZone` rows with an `address:` on the zone
  (`packages/content/eternal-university/content/world/terminus/eternal/campus-farm.yaml`;
  rooms under `campus-farm/location/`, contents by `props:`,
  `yard.yaml:44,64`). University Avenue is the `terminus` pack's
  (`terminus/content/world/terminus/university-avenue.yaml`). **The mine
  is the `rejection` pack** (`rejection/content/world/terminus/rejection/…`,
  `idea/coop-business.yaml`, `thing/claims-counter.yaml`) — a venue pack
  with no `src/`.

### Blast radius

- **29 test files** invoke `analyze <x>` / `measure <x>`:
  `packages/content/trade-mining/src/__tests__/exemplar.test.ts`,
  `trade-mining/src/idea/cmd/perception/__tests__/survey.test.ts`,
  `trade-smelting/src/__tests__/smelt.test.ts`,
  `trade-tailoring/src/__tests__/fit-and-waste.test.ts`,
  `water/src/idea/cmd/perception/__tests__/AnalyzePower.test.ts`,
  `water/…/AnalyzeWater.test.ts`,
  `packages/server/src/mud/__tests__/wiki-spoiler-fields.snapshot.test.ts`,
  `mud/api/__tests__/{bulk-mql,card-birth-path,command-affordances,material-response}.test.ts`,
  `mud/lib/command/__tests__/{CommandDefinition.fallthrough,CommandExamples}.test.ts`,
  `mud/lib/perception/__tests__/MeasureChannel.totality.test.ts`,
  `mud/lib/zone/__tests__/Elevation.test.ts`,
  `mud/platform/__tests__/ArchetypeCatalogue.test.ts`,
  `mud/platform/idea/cmd/bulk/__tests__/BulkVerbs.test.ts`, and the
  twelve per-controller suites in
  `mud/platform/idea/cmd/perception/__tests__/{Analyze*,Measure*}.test.ts`.
- **7 wire drives**: `packages/wire/tests/{crafting,consequence,metal-chain,metallurgy,farmstead,grain-chain}.dirty.wire.test.ts`, `textiles.wire.test.ts`.
- `MeasureChannel.totality.test.ts` scans `platform/idea/cmd/perception/*Controller.ts`
  for bare `.format()`; `MEASURE_CHANNELS` (`lib/perception/MeasureChannel.ts:64-89`)
  is the MML `<quantity channel=…>` vocabulary — **not** the reading
  channel roster.

### Catalogue warm pattern

- `platform/idea/MaterialCatalogue.ts:2-64` — **self-warming**, selects
  rows by template-path infix `/idea/material/` across every root
  (`Template.findByPathInfix`), keeps a row whose class extends
  `Material` wherever it lives, residency-vetoed; a pack go-live
  re-warms idempotently. `ArchetypeCatalogue.ts:40-67` warms in
  `postRegister` and lazily. `SurveyController.ts:34-41,162` reaches a
  catalogue by `StuffApi.findByTemplatePath`.

---

## Plan-level decisions

### D1 — One flat view per verb; the channel is a string positional (R-D2, R-Placement)

`measure.yaml` and `analyze.yaml` lose their `subcommands` and take the
`cast` shape. Both views declare the same four args:

```yaml
args:
  - name: channel      # the fact being read — `light`, `strike`, `grade`
    type: string
    required: true
  - name: subject      # optional; scope decides what it means (D2)
    type: object
    required: false
    scope: ["$focus", "reachable"]
    requires: any
  - name: tool         # every tool in reach; the Reading narrows by capability
    type: objects
    required: false
    prepositions: [with, using]
    default: "reachable:[mixin.ToolMixin]"
    scope: ["reachable"]
    requires: [ToolMixin]
```

`measure` → `/platform/idea/cmd/perception/MeasureController`,
`analyze` → `/platform/idea/cmd/perception/AnalyzeController`. Each
resolves `model.channel` through `InstrumentApi.reading(channel)` and
hands off to the Reading's rung (D2). An unknown channel refuses:
*"There is no reading called 'x'. `readings` lists what you can find
out."* `analyze` keeps `opens_card: survey` (the record channels).

**Why `type: objects` for the tool:** one view cannot carry a per-channel
`[capability.X]` default. The plural-with-default and
narrow-on-the-one-thing-no-predicate-asks shape is the sanctioned one
(`check-instrument-args.ts` doc, kind 4); the Reading narrows the bound
list by its declared capability. Reach, not carry, is the definition —
a bench on the wall and a photometer on the table both count, and the
same slot serves `assay` (D12).

**Unresolved subject text is a parameter.** `measure elevation moon`
binds `subject.stuff === null, raw: 'moon'`; a Reading may read
`param = subject.raw` when its scope is `here`. This is how the sextant's
body and mining's face direction (`sample the north face`) travel.

**Rejected:** a verb per trade (`survey-strike`) — thirty verbs for one
act; and a kernel view-merge feature — new machinery to preserve a shape
the requirements already reject.

### D2 — A channel is a `Reading` row; the code is a class per channel (R-D4, R-D16, engineering Q2)

New kernel substrate `packages/server/src/mud/lib/instrument/Reading.ts`
— an abstract `Idea` (singleton by templatePath, the `Material` shape,
`Material.ts:135-153`) — with one concrete subclass per channel, each a
template row at `<root>/idea/reading/<channel>.yaml`:

```yaml
class: /platform/idea/reading/LightReading
hydratorClass: /platform/idea/persistence/PersistentHydrator
data:
  channel: light
  kind: fact                 # fact | preview | record   (R-D3)
  scope: [here, subject]     # self | here | subject — what `subject` means
  subjectRequires: [ContainerMixin]   # mixin names, checked by the Reading (R-D4)
  discipline: awareness      # null = deliberately unbanded (figure, the previews)
  instrument: photometry     # tool capability of the measure rung; null = none
  handTool: null             # capability that lifts the eye ceiling (D7)
  eyeCeiling: expert         # best band the naked eye can realize
  bench: null                # capability of a bench that reads a SAMPLE; null = place-bound (R-D13)
  improves: "whether there is light enough to work, read or sight by"   # AC12
  stakes: "an hour lost, a shot you cannot reshoot"                     # AC12
```

`Reading` exposes, in order of who calls it:

- **row getters** (`getChannel()`, `getScope()`, … — methods are the contract);
- **`runAnalyze(ctx, subject, tools)` / `runMeasure(ctx, subject, tools)`**
  — gated `FromModule` to the two controllers; resolve the subject by
  scope, check `subjectRequires` (refusing by the missing mixin's
  sentence, R-D12), compute the effective band (D5, D6, D7), narrow the
  tools, run the rung, wear the instrument, credit the deed where the
  class says so;
- **`@hook analyze(ctx, subject, band, handTool?)`**,
  **`@hook measure(ctx, subject, instrument, band)`**,
  **`@hook benchRead(ctx, sample, bench, band)`** (Stage B) — the
  per-channel bodies; the base implementations **refuse naming the
  missing route** (*"You have no way to tell that by eye; a photometer
  would."*), so a channel with no eye rung is honest for free;
- **`truth(subject)`** — the underlying figure with no band. ⭐ This is
  the **engine's own read surface** R-D9 names: tests assert values
  through it, never through the prose;
- **`routesFor(actor, tools)`** — the ladder as data for `readings` (D15);
- protected helpers `bandOf` (D4), `ceilingOf` (D6), `observe` (D8),
  `remember`/`recallAll` (the survey-book belief note generalized, prefix
  = channel), `decline` (wraps the refusal shape).

**`ReadingCatalogue`** (`platform/idea/ReadingCatalogue.ts`) is the
`MaterialCatalogue` shape verbatim: `Template.findByPathInfix('/idea/reading/')`,
keep rows whose class extends `Reading`, singleton by path, residency
veto, idempotent re-warm on pack go-live. ⚠ **It warms lazily on first
`InstrumentApi.reading()` and in `postRegister`, never only at boot** —
the inert-reference-Idea trap has bitten three times; the controller
path must not depend on boot order. `api/instrument.ts` (`InstrumentApi`:
`reading(channel)`, `readings()`) forwards to
`platform/idea/api/InstrumentLogic.ts` — the mandatory Api↔Logic split.

A pack's channel is its row + its class + nothing in the platform:
`packages/content/trade-mining/content/trade/mining/idea/reading/strike.yaml`
→ `class: /trade/mining/idea/reading/StrikeReading` →
`packages/content/trade-mining/src/idea/reading/StrikeReading.ts`.
`classFileOf` resolves it by longest prefix into the pack's `src/` like
any pack path. **Installing the pack installs the channel; nothing else
registers it** — the requirements' load-bearing test.

### D3 — `measure` joins `analyze` on the Avatar; the instrument affords a RUNG, not the verb (R-D12, drive A2)

`Avatar.commandContributions.self` gains `measure.yaml`, `readings.yaml`
(D15) and, in Stage B, `sample.yaml`. Every `commandContributions` of
`measure.yaml` on an instrument class is deleted. The instrument's
affordance moves to the channel row's `instrument:` capability, which
the Reading checks against the bound tools.

**This lifts `command-routing.md:536-541`** (*nothing should ever put
`measure` on a body*), and the reason is R-D12: *"`measure light`
carrying nothing"* must answer *"you have nothing that could read
that"*, and an unafforded verb can only answer *unknown command*. The
line homed from this slate described the affordance mechanism before
the ladder existed; the ladder puts the gate on the channel where the
refusal can name the missing thing. The sweep rewrites the box.

### D4 — The hoisted band read lives on `Reading` (engineering Q3)

`protected async bandOf(actor, discipline | null)` on the `Reading`
base: `null` → `expert` (a deliberately unbanded channel reads at full
resolution — figure, the previews); otherwise
`MixinApi.isAdvancing(actor) ? actor.competenceBandFor(discipline) :
CompetenceBand.FLOOR`. All three copies become calls to it because all
three callers become Readings; Stage B's `assay` runs a Reading's bench
rung, so it inherits the same home. **No free helper, no Api static with
a world-object first parameter** (`lint:object-verbs` stays at zero), no
static on `CompetenceBand` (that file must not import `MixinApi`). The
per-trade tables stay module consts in the trade's Reading classes.

### D5 — The effective band is a minimum, never a sum (R-D5, R-D7)

`effective = min(bandOf(actor), ceiling)`, where the ceiling is
`eyeCeiling` for the eye rung (lifted to the `handTool`'s ceiling when
one is bound, D7), and `ceilingOf(instrument)` for the measure rung
(D6). A novice with a masterful dial reads novice-wide; an expert with a
poor dial is capped. `min` is the whole of "grade raises the ceiling;
competence realizes it."

### D6 — Grade → ceiling reuses `gradeConditionScale`; drift reuses `wear()` (R-D7, decided upstream)

`ceilingOf(tool)`: `MixinApi.isGraded(tool) && MixinApi.isDurable(tool)`
→ `s = MaterialApi.gradeConditionScale(tool.getGradeBand(), tool.getCondition())`;
`s ≥ 1.10 → expert · ≥ 1.00 → proficient · ≥ 0.85 → competent · ≥ 0.70
→ novice · else untrained`. (`fair` at full condition scales 1.0 →
`proficient`: a shop-bought instrument caps a proficient reader, which
is the tool trade's story — R-D7.) Not graded → `proficient`.

Every measure rung calls `instrument.wear(dial)` after reading, dial
`instrument.wearPerReading` (default `0.002`, a new `AppSettings` key +
yaml seed per `docs/subsystems/app-settings.md`). A tool whose
`isBroken()` is true is named in the refusal (*"your photometer is past
reading with"*) — narrowing uses `getCapabilities()` (raw) and then
`isBroken()`, because `hasCapability` already hides a broken tool.

### D7 — The hand tool is an eye-ceiling lift, not a third rung (R-D14)

A `handTool:` capability on a row lifts `eyeCeiling` to `expert` when
one is bound, on the **analyze** rung. The words stay words. Mining's
`grade` channel is the first consumer: `eyeCeiling: novice` (a naked eye
tells ore-bearing from barren and no more), `handTool:
field-identification` (a hand lens or a streak plate — two rows over
`ToolItem`, no class). D5's `min` means a novice with a lens is still a
novice — the lens is the characterful early purchase precisely because
it pays off as you learn.

### D8 — Observation is seeded, and the band always contains the truth (R-D3, uncertainty.md)

`observe(truth, band, seed)` in the base: a half-width fraction per band
(`untrained .5 · novice .3 · competent .15 · proficient .07 · expert .03`
of magnitude; trade classes override with their own units — mining keeps
`ERROR_DEG`), a centre offset drawn **from the seed** within the band,
and the invariant `truth ∈ [centre − hw, centre + hw]` asserted by one
base test over every band. Seed = hash(subject identity path, channel,
actor identity path, game day) — a re-read the same day agrees with
itself; tomorrow's may differ (epistemic provenance, seeded not drawn).
`kind: preview` channels bypass `observe` and show the exact band the
engine will apply (the Tier A invariant is satisfied by exactness).

### D9 — Disciplines: `chemistry` and `physics` are minted; the raw-physics channels band on `awareness` (R-D5; engineering Q — a fork the requirements did not decide)

`chemistry` (ISCED-F 0531) is decided upstream. The plan also mints
**`physics` (ISCED-F 0533)** by the same doctrine, because `electrical`,
`power`, `water`, `pressure` and `gravity` are listed as ladder channels
and no shipped Discipline is honest for them. Both rows are the
platform's (`packages/content/platform/content/platform/idea/Discipline/{chemistry,physics}.yaml`,
`channel: skill`, no `specializes`). Assignment: light · temperature ·
humidity · altitude · elevation · shadow · sky · weather · time ·
atmosphere → `awareness`; chemistry · density → `chemistry`; electrical
· power · water · pressure · gravity → `physics`; the trades keep theirs;
`figure`, `response`, `weapon` stay `discipline: null`. ⚠ **Flagged for
the user** (§ Risks): the discipline is a row field, so reversing any of
these is a content edit.

### D10 — `passage` is an eye rung only

It is banded with no instrument — the trained eye by definition. Its row
declares `instrument: null`; `measure passage` refuses naming the route
(*"nothing reads that; you work it out — `analyze passage`"*). The
haulage tests and any wire step that typed `measure passage` change to
`analyze passage`. ⚠ Flagged (§ Risks) — it is the one shipped verb
phrase this build retires.

### D11 — `altitude` splits into `altitude` (altimeter) and `elevation` (sextant)

One controller today serves two facts. `elevation [sun|moon]` is the
celestial body's angular height (`instrument: sighting`, param = body,
default sun); `altitude` is yours (`instrument: altimetry`). Two rows,
two small classes, both platform.

### D12 — Engine meta leaves for a free `system` verb: `trace` (R-D3, engineering Q7)

`analyze address` and `analyze atmosphere` become `trace address
[place]` and `trace atmosphere` — `packages/content/platform/content/platform/cmd/system/trace.yaml`
(subcommands are fine on a platform-only verb; no pack contributes to
it), controllers moved to `platform/idea/cmd/system/TraceAddressController.ts`
/ `TraceAtmosphereController.ts` with their tests. Afforded on Avatar
`self` beside `affordances` and `errors`, **no validator** — the shipped
shape for a free engine diagnostic, and no new wizard check. `analyze
address` then refuses as an unknown channel, pointing at `readings`
(drive P39: not offered as a reading, not refused confusingly).

### D13 — The assay is the water mill; the bench is a fixed `ToolItem` with a queue of batches (R-D16, R-D21, decided upstream)

`AssayBench` (`packages/content/trade-mining/src/thing/instrument/AssayBench.ts`,
`extends ToolItem`) carries: runtime `busy` + an ordered `pending` list
of batches (runtime-only, like `AttendantMixin._queue`), and persistent,
authorable `setupS` (default 1800), `perSampleS` (600) and `fee` (minor
units per sample, default 25). Row
`trade-mining/content/trade/mining/thing/instrument/assay-bench.yaml`:
`capabilities: [assaying]`, `fixedInPlace: true`, mass 180. It contributes
`trade/mining/cmd/mining/assay.yaml` on `environment`; `Ore` contributes
it on `inventory` so a carried sample affords the verb in the field
(drive H19's refusal names the missing bench).

`assay <samples> [at <bench>]` — `samples: objects required scope
reachable requires [SampledMixin]`, `bench: object optional prepositions
[at, on] default "reachable:[capability.assaying]" requires [ToolMixin]`.
Duration = `setupS + n × perSampleS` (**amortized**, R-D21). The
controller enqueues the batch on the bench and, when the bench is idle,
starts it: `WorldClockApi.after(Quantity.of(s, 's'), () => { void
finishAssay(...) }, { host: bench, tag: 'assay' })`; `finishAssay` is
**module-level**, checks `actor.isDestroyed()`, runs each sample's
channel `benchRead`, destructs the sample, mints a `ReadingRecord` (D14)
into the bench's room stamped chattel to the customer, narrates
`toSelf`/`toPeers` if the actor is present, then starts the next pending
batch. A busy bench tells you where you are in the queue and roughly
when. **No engagement, no `AttendantMixin`** — nothing of yours is held.

**Which channel a sample runs:** the readings whose `bench:` capability
the bench declares and whose `subjectRequires` the sample satisfies;
`grade` for ore, `chemistry` for anything else tangible. A sample no
reading claims is refused by name.

### D14 — Two records, not one (R-D11, engineering Q5)

- **My notes** stay the belief `DISCOVERY` note, band re-derived at
  read-back, nothing stamped — generalized into `Reading.remember()`
  with the channel as prefix. The existing `survey:`/`soil:` prefixes are
  preserved verbatim (the field books keep working).
- **Somebody else's reading I can check** is a **thing**: `ReadingRecord`
  (`packages/server/src/mud/platform/thing/ReadingRecord.ts`, row
  `/platform/thing/reading-record` in the platform pack), a `Thing`
  whose persistent scalars are `channel`, `subjectLabel`, `reading`
  (prose), `value` (number | null), `unit`, `band`, `takenBy` (identity
  path), `takenByLabel`, `takenWith` (bench template path),
  `takenWithGrade`, `takenOn` (game ms), `sampledAt`, `sampledBy`,
  `sampledOn`, `tell` (string | null). It persists as any carried Thing
  does (the owner's snapshot; a report left in a room rides the room
  overlay) — **no new collection, no `DOCUMENT_KINDS` edit**. `look`
  renders it (a `DetailedMixin` long-description override): *"Assayed by
  Prof. Iwe at the university bench, a proficient hand — 17.3 % magnetite
  ± … — sample taken at the north face of Ferrow, by you, on …"*. Band
  names are the sanctioned vocabulary; no number about a person.

⚠ R-D11 as written (*"what is written carries who took it…"*) is true of
the second record only; the sweep rewords the requirements line rather
than breaking the re-read property of the first.

### D15 — `readings` is the self-only listing, and the mirror rides on it (R-lens 3, R-D20, drive P40 + L32)

`perception/readings.yaml` → `ReadingsController`, `SpellsController`
shape: for every Reading, `routesFor(actor, tools)` → one line per route
in words — *by eye: within you (competent)* / *beyond you yet* · *with a
photometer: in reach* / *none in reach* · *at a bench: a bench that can
assay* / *no bench — you cannot carry this anywhere*. `readings <channel>`
adds `improves` and `stakes` (AC12). No numbers, no table.

The **mirror** is a trailing stanza, present only when the actor holds
`ReadingRecord`s of channel `grade` (bound by `MqlApi.resolveMany('me:i:[class.ReadingRecord]')`,
the binder's own resolver, not a walk): for each report, the actor's own
field-call note for `sampledAt` (a `grade:` belief note written by
`analyze grade` at a face, `knownAs` = the qualitative band called) is
compared with the assayed band → prose: *"Of the seven samples you have
had assayed, your eye called five right; you tend to overcall poor
rock."* Self-only by construction (`toSelf`, own beliefs, own reports).

### D16 — The person read extends `patient` (R-D8, drive M; collision: `assess` + combat fog)

No new channel. `analyze patient <person>` (trade-medicine, medicine-
banded, wordy) gains: a `toTarget` line so the subject perceives the
read (Scene's Sensor requirement — every `VitalsMixin` host is a
sensor), and an **honestly-wrong** arm at `untrained`/`novice` using the
seeded misread the way combat's fog does (`AssessController` /
`CombatApi` assess is the precedent to copy, not re-derive). No trait is
ever asserted (narration doctrine).

### D17 — The instrument-args gate: widen first, then convert (engineering Q8)

W0 teaches `check-instrument-args.ts` the **alias form** — `const NAME =
… <recv>.getContents() …` (ternary included) followed within twelve lines
by `NAME.(some|find|filter)(` with a `TYPE_TEST` — and raises the ceiling
to **9** with the census in the doc comment. W1 deletes all nine
controllers (the hunts vanish by construction) and lowers the ceiling to
**0**.

### D18 — Migration: same words, vaguer answers, and the bypass is `truth()` + `practice` (R-D9, engineering Q9)

`analyze ground` / `measure strike` still parse — the channel is the
same token in positional form — so the 29 files and 7 drives keep
dispatching. W1 preserves every channel's **output verbatim** (a
mechanical move), so nothing changes until W2 bands the free reads
channel by channel, each with its tests beside it. A test that asserts
*a read happened* is untouched; a test that asserts a **value** asserts
`await reading.truth(subject)` (or the Api the Reading consults) — the
engine surface, not a player act. A wire step that needs a competent
reader logs in as a wizard and runs the shipped, already-gated `practice
<discipline> hard success` a few times (`author/practice.yaml`) — an
existing check, not a new one; a wire step that needs a number uses
`eval` on land it holds. **No new trust tier, no new wizard check.**

### D19 — The sample is a mixin on the material's own goods class; there is no lump class (R-D15, engineering Q4)

`SampledMixin` (`packages/server/src/mud/lib/instrument/Sampled.ts`,
registered in `Mixins`): persistent fields `sampledAt` (location template
path, `ref: identity`), `sampledBy` (identity path — `getIdentityPath()`,
never `getTemplatePath()`), `sampledOn` (game ms), `sampledFrom` (source
path or null); `isSample()`, `getSampling()`, and `stampSampling(...)`
gated `FromModule('/platform/idea/cmd/inventory/SampleController')`.
`onSplit` copies all four; `onMerged` nulls them when the absorbed
stack's differ (a pooled lot has no single origin — honest, and it is
why merging cannot launder provenance). Composed **outside**
`StackableMixin` on `Ore` (`Ore extends SampledMixin(StackableMixin(Thing))`,
Ore's own `onSplit`/`onMerged` keep calling `super`) and on `Provision`
(not stackable; stamped in place). The composers have no common pack
ancestor (mining, platform) → kernel `lib/`. A soil portion and a bulk
medium are **deferred seams**, not stubs (§ Deferred seams).

### D20 — `sample <thing|face>` is a platform verb that re-stamps where you stand (R-D10, R-D17, engineering Q4/Q6)

`inventory/sample.yaml` → `/platform/idea/cmd/inventory/SampleController`,
afforded on Avatar `self`; `subject: object required scope reachable
requires any`. Three cases, in order:

1. bound `Stuff` that `isSampled` and `isStackable` → `split(1)` and
   **stamp the split-off with here / actor / now** (the sample was taken
   here — true);
2. bound `Stuff` that `isSampled` (not stackable) → stamp in place;
3. unresolved raw text + a room that answers `sampleFace(actor, raw)`
   (duck-typed, the `analyze power` precedent; mining's `WorkingMixin`
   implements it by the `winOre` path with `SAMPLE_LUMPS = 1`, no
   engagement, `toPeers` narration so a bystander sees it — R-D10) →
   the minted lump is stamped;
4. otherwise refuse **in terms of the thing**: *"You cannot carry the
   light anywhere — it is here, not a thing you can take."* (drive F14,
   AC14).

⭐ **Salting falls out** (R-D17, drive J): carry a rich lump to a barren
claim, drop it, `sample` it there — the stamp says the barren face,
honestly, because that is where it was taken. The stamp itself is
unforgeable (gated setter, no `authorable`, no verb edits it); the fraud
is upstream of the record. AC17 holds.

### D21 — The spoiled sample reads honestly of itself, and the tell is derived (R-D19)

The `chemistry` channel's bench rung on a `Provision` reports its
composition **and its freshness band as it is now** — the shipped
`FreshnessMixin` clock did the "reading wrong" in transit, no second
clock. At `competent` and above the assayer adds the **tell**, derived
from provenance: `elapsed = now − sampledOn` against the material's
spoilage window and the sample's temperature → *"this has been N hours
in the carrying and it was warm; what it says now is about the journey,
not the batch."* Stored in `ReadingRecord.tell`.

### D22 — The laboratory is mining's archetype, industry-less; the first lab is campus content; the second is mine content (R-D18, engineering Q6)

`packages/content/trade-mining/content/archetypes/laboratory.yaml`:
`archetypeId: laboratory`, `label: a laboratory`, `capabilities: [{key:
bench, needs: {tool: assaying}}, {key: table, needs: {surface: true}}]`,
**no `industry:`** (or `survey` never reports it). `assaying` is declared
by the bench row in the same wave (`lint:capabilities`). The campus lab
is `eternal-university` content only (a small `CartesianZone` with an
`address`, one room, `props: [assay-bench, table]`, an exit wired the way
`campus-farm` is), plus a `Business` row with an `assayer` position and a
`Cast` row whose dossier seeds `chemistry: proficient`. The second lab is
`rejection` content only (a bench row `props:`-placed in the co-op's
office, `fee` set higher, no roster). Zero pack code for either.

---

## ⭐⭐ Host placement

| new thing | host | what composing it claims | guard needed? |
|---|---|---|---|
| `Reading` (abstract Idea) + 31 concrete classes | kernel `lib/instrument/Reading.ts`; concretes at `platform/idea/reading/*.ts` and each pack's `src/idea/reading/*.ts` | a stateless singleton per row; nothing else composes it | none — rows are the host set |
| `Reading` row fields (`channel … stakes`) | the Reading row | authored per channel | none |
| `ReadingCatalogue` | `platform/idea/ReadingCatalogue.ts` singleton | one roster, warmed by infix | none |
| `InstrumentApi` / `InstrumentLogic` | `api/instrument.ts`, `platform/idea/api/InstrumentLogic.ts` | the subsystem's Api | none |
| `measure` / `readings` / `sample` affordance | `Avatar.commandContributions.self` | every player can attempt every rung; refusals name the route | none — NPCs use Apis |
| instrument capability + grade + condition | the ten platform instruments become **rows over `/platform/thing/ToolItem`** (`capabilities:`); their classes are deleted | an instrument is a tool: graded, durable, wearing; a broken one reads nothing | none — `ToolItem` already carries all three |
| `MeasureBook` (tailoring) as the `figure` instrument | its row gains `capabilities: [fitting]`; the class gains `ToolMixin` if it lacks it (W1 verifies) | the book is the tool you read a figure with | none |
| `SampledMixin` (4 fields) | `Ore` (trade-mining) and `Provision` (platform), outside `Stackable` on Ore | any lump of ore and any provision may be a sample; null = not one; no clock, no behaviour | none — `assay` requires the mixin, so the host set is the requirement |
| `Working.sampleFace(actor, raw)` | trade-mining `lib/Working.ts` | a working can yield a one-lump sample of a face | none |
| `AssayBench` (busy, pending, setupS, perSampleS, fee) | trade-mining `thing/instrument/AssayBench.ts` extends `ToolItem`; `fixedInPlace` on the row | a bench is a graded, durable, fixed tool with a queue | none |
| `ReadingRecord` (15 scalars) | `platform/thing/ReadingRecord.ts` extends `DetailedMixin(Thing)` (Thing already brings Chattel) | a report is a carried thing owned by somebody | none |
| `instrument.wearPerReading` dial | `AppSettings` key vocabulary + yaml | one dial, read by `Reading.runMeasure` | none |
| `chemistry`, `physics` Disciplines | platform Discipline rows | fields of study | none |
| `laboratory` archetype | trade-mining `content/archetypes/` | a room with an assaying bench is a lab | none |
| `assayer` position | the campus `Business` row (content) | a workplace | none |

**Deliberately NOT placed:** nothing on `Thing`, `Location`, `Character`
or `Creature`; no field on `Material`; no mixin on any base class. The
Freshness-off-every-Thing shape does not occur: the only widening is
`SampledMixin` on `Provision`, and it is inert data with no gate that
re-narrows it.

---

## Convention conformance

Checked at plan time against the current tree.

- **`props:` / `cast:`** — the campus lab room and the co-op office
  place the bench and table with `props:` (`campus-farm/location/yard.yaml:44`
  is the shape); `populates:` is retired.
- **Locations, not rooms** — the lab is a `CartesianLocation` in a
  `CartesianZone` (copy `campus-farm.yaml`); `FurnishableRoom` only if
  the room is somebody's to furnish, which a university lab is not.
- **The five axes / `<root>/<branch>/`** — platform rows at
  `/platform/idea/reading/…`, `/platform/thing/reading-record`; mining's
  at `/trade/mining/idea/reading/…`, `/trade/mining/thing/instrument/…`;
  the water pack's at `/system/water/idea/reading/…`; generic instrument
  rows stay at `/stuff/thing/instrument/…` (commons) naming the platform
  class. Controllers at `<root>/idea/cmd/<category>/`, views at
  `<root>/cmd/<category>/`.
- **Module categories** — `Reading` is a Stuff class (lib substrate +
  instanceable concretes); `ReadingCatalogue` a singleton Idea;
  `SampledMixin` a mixin in `lib/instrument/`; `InstrumentApi` +
  `InstrumentLogic` the Api pair; `AssayBench`, `ReadingRecord` Stuff
  classes. **No free helper, no new category.** `finishAssay` and
  `winSample` are module-level *non-exported* functions in their
  controllers (the `winOre` precedent).
- **Module scope declares; lifecycles initialize** — the catalogue warms
  in `postRegister`/first use; band tables are `const` data.
- **Import boundary** — packs import the kernel by specifier
  (`@saxonberg/server/mud/lib/instrument/Reading`; the `exports` map's
  `./mud/lib/*` covers the subdirectory) and gate with absolute
  `FromModule` paths. No `fs`/`path` in the mudlib.
- **Verbs on objects** — `reading.runMeasure(...)`, `bench.enqueue(...)`,
  `sample.stampSampling(...)`, `working.sampleFace(...)`; the Api holds
  only `reading(channel)` / `readings()`.
- **Identity keys** — `sampledBy`, `takenBy` are `getIdentityPath()`.
- **Message topics** — `sense.reading` for readings, `shell.result` for
  `readings`, `act.deed` for `sample`/`assay` narration.
- **Lint gates this build must satisfy** — the whole family
  (`pnpm -C packages/server lint:family`, 48 gates, derived). The ones
  it *touches*: `instrument-args` (D17), `capabilities` (Reading rows are
  consumers; `assaying`, `field-identification`, `fitting` and the ten
  instrument capabilities are declared), `arg-kinds` (every object arg
  has `requires`), `binder-models` (new controller tests dispatch
  through the binder), `verb-collisions`, `object-verbs`, `drive-scripts`
  (the drive is a wire file), `instanceable` (concrete Readings live
  under `platform/idea/reading/`, never `lib/`), `mixin-names`
  (`SampledMixin` registered), `module-scope`, `imports`, `field-meta`,
  `perishable` (Provision's composition string still reaches
  `FreshnessMixin`), `pathogens`, `unconsumed-seams` (every `@hook` has a
  consumer), `does-nothing`, `thin-forwarder`, `world-scan`, `census`,
  `lib-statics`, `test-bootstrap`, `test-content`, `presentation`,
  `untitled`, `topics`, `person-keys`, `identity`, `schema` (no
  collection).

---

## Waves

Every wave ends at a commit that passes `lint:family` + `pnpm test:near`
+ every touched pack's own vitest. `pnpm test` runs once before the MR
and once at `/finalize`.

### Stage A — the retrofit, the honest read, the trained eye, the ladder

#### W0 — Ground truth: the gate learns the alias form; two Disciplines

- `packages/server/scripts/check-instrument-args.ts`: add `ALIAS_WALK`
  (a `const NAME = … .getContents() …` statement whose `NAME` is then
  `.some/.find/.filter`ed with a `TYPE_TEST` within twelve lines,
  receiver in `SURROUNDINGS`); ceiling `0 → 9`; the census of nine in
  the doc comment (D17).
- `packages/content/platform/content/platform/idea/Discipline/chemistry.yaml`
  (`iscedf: "0531"`) and `physics.yaml` (`"0533"`), the `soil-science`
  row shape (D9).
- `instrument.wearPerReading` added to the `AppSettings` key vocabulary
  and yaml seed (D6).
- Acceptance: `lint:instrument-args` reports 9 at ceiling 9; the two
  Disciplines resolve through `DisciplineCatalogue` (one test each).
- Commit: `build(instrumentation W0): the gate learns the alias form; chemistry and physics are Disciplines`.

#### W1 — The Reading substrate and the flat verbs (mechanical; every channel's output preserved)

Land as several `refactor(instrumentation):` commits, then the wave
commit. Order matters — each step keeps the tree green.

1. **Substrate.** `lib/instrument/Reading.ts` (D2, with `bandOf`,
   `ceilingOf`, `observe`, `remember`/`recallAll`, `decline`, the three
   `@hook` rungs with refusing defaults, `truth`, `routesFor`);
   `platform/idea/ReadingCatalogue.ts` (`MaterialCatalogue` shape);
   `api/instrument.ts` + `platform/idea/api/InstrumentLogic.ts`. Tests:
   catalogue warm by infix across two roots (a platform row and a
   fixture pack row), `observe`'s containment invariant over all bands,
   `bandOf`'s three cases.
2. **The two controllers + flat views** (D1): `MeasureController`,
   `AnalyzeController` rewritten; `measure.yaml` / `analyze.yaml` flat;
   `Avatar.commandContributions.self` gains `measure.yaml` (D3).
   ⚠ First thing to verify here: `measure elevation moon` binds
   `subject.raw === 'moon'` with `stuff === null` (D1's parameter path).
   If the binder instead rejects, add `- name: param, type: string,
   required: false` after `subject` and read that; record which in the
   plan.
3. **Platform channels → Readings** (17 rows at
   `packages/content/platform/content/platform/idea/reading/`, classes at
   `platform/idea/reading/`): light, temperature, pressure, humidity,
   density, gravity, atmosphere (measure rung; the analyze rung is a new
   one-line eye read), altitude, **elevation** (D11), shadow, sky,
   weather, time, chemistry, electrical, response, weapon (moved out of
   `cmd/combat/`). Each class is the old controller's body under the
   rung method; prose unchanged. Move each controller's test beside its
   Reading, converting hand-built models to binder dispatch
   (`lint:binder-models`). `MeasureChannel.totality.test.ts` scans
   `platform/idea/reading/` too. Delete the old controllers.
4. **Instruments become `ToolItem` rows** (D3, D6): the ten classes in
   `platform/thing/instrument/` (all but `Balance`) deleted; the eight
   generic-objects rows other than `balance.yaml` re-based to
   `class: /platform/thing/ToolItem` with `capabilities:` (`photometry`,
   `thermometry`, `barometry`, `hygrometry`, `gravimetry`, `gas-analysis`,
   `altimetry`, `hydrometry`), `mass` and `_materialPath`; **new rows `sundial.yaml`
   (`dialling`) and `sextant.yaml` (`sighting`)** — the two dead reads
   become reachable (AC6). `check-capabilities.ts` learns the three row
   keys as consumers. `command-affordances.test.ts` updated: the verb is
   the Avatar's. `lint:instrument-args` ceiling `9 → 0`.
5. **Pack channels → Readings**, each in its own pack, stanzas deleted
   from the platform views: mining `strike`, `dip`, `ground`
   (`SurveyChannelController` becomes an abstract `SurveyReading` base in
   `trade-mining/src/idea/reading/`; `ERROR_DEG`/`SOLVE_FROM` stay);
   farming `texture`, `acidity`, `soil` (the same for `SoilChannelController`;
   `texture`'s instrument capability is whatever `Spade.ts`/`SoilKit.ts`
   declare today — read them); haulage `passage` (analyze-only, D10),
   `load`; medicine `patient`, `postmortem`; tailoring `figure`
   (`instrument: fitting`; `MeasureBook` row gains the capability, class
   gains `ToolMixin` if absent); water `power`, `water`. `Spade`,
   `SoilKit`, `SurveyInstrument`, `MeasureBook` lose their
   `commandContributions`. The pack unit tests move with their classes.
6. **`trace`** (D12): view, two moved controllers, two moved tests.
7. **Refusals** go through `CommandController.refuse()` in the two new
   controllers and `Reading.decline` (the census-and-ratchet the helper's
   doc asks for advances by exactly these sites).
- Acceptance: every one of the 29 test files green with **unchanged
  assertions** except the model-shape and affordance-source conversions
  named above; `pnpm -C packages/content/<pack> test` green for mining,
  farming, haulage, medicine, tailoring, water; `lint:family` green;
  `analyze address` refuses naming `readings`; `trace address` answers.
- Commit: `build(instrumentation W1): one flat ladder — a channel is a row any pack ships`.

#### W2 — The honest read, the trained eye, the ceiling (R-D2, R-D5, R-D7, drive A–D)

- Every `kind: fact` Reading class gets a band → prose table for its eye
  rung and `observe` on its measure rung; `discipline:` set per D9.
  Minimum set the drive needs, written first: **light** (novice *bright
  enough to read by* → trained *an hour of usable light, mostly off the
  west window* → photometer lux ± band; the per-source breakdown is now
  the `expert` eye read and the photometer's, never the novice's),
  **texture** banded on `soil-science` (drive D11 — confidence differs),
  **temperature**, **sky**, **weather**, **time**, **chemistry**,
  **electrical**, **power**, **water**, **load**, **passage**, **patient**,
  **postmortem** (already banded — verify only).
- `runMeasure`: effective band (D5), `ceilingOf` (D6), `wear()` after
  the read, the broken-tool refusal; `runAnalyze`: `eyeCeiling` and the
  `handTool` lift (D7).
- The `atmosphere`, `density`, `gravity`, `pressure`, `humidity`,
  `altitude`, `elevation`, `shadow` eye rungs may honestly be the base
  refusal (*"no way to tell by eye; a barometer would"*) — decide per
  channel by whether a person can actually tell, and say so in the row's
  `improves`/`stakes`.
- Tests: for each banded channel, the **three-reader test** — novice,
  expert, instrument on one fixture: all three contain `truth`, novice
  is wider than expert, expert-by-eye is wider than instrument
  (`Deposit.surfaceReadingAt`'s identical-truth shape); the ceiling test
  (novice + masterful tool = novice; expert + poor tool = capped);
  `wear()` called once per measure; broken tool refused by name.
- Commit: `build(instrumentation W2): the free read is honest; grade is a ceiling, competence is what you get`.

#### W3 — `readings`, the person read, and the ragged ladder (R-D6, R-D8, R-D13, drive F, M, P40)

- `perception/readings.yaml` + `ReadingsController` (D15, without the
  mirror stanza yet); `routesFor` on every Reading; `improves`/`stakes`
  authored on all 31 rows (AC12 — a row that cannot answer is marked
  `discipline: null` and says why in `stakes`).
- `patient` gains `toTarget` + the honest-wrong arm (D16); a test that
  the subject received a frame and that an untrained read can name the
  wrong sign while a proficient one cannot.
- `Avatar.commandContributions.self` gains `readings.yaml`.
- Commit: `build(instrumentation W3): readings — within you, beyond you yet; a person can tell you looked`.

#### W4 — Stage A drive

- `packages/wire/tests/instrumentation.dirty.wire.test.ts` (dirty: it
  `practice`s competence onto a character and, in Stage B, stakes and
  hews) — checkpoints A1–A3, B4–B5, C6–C8, D9–D11, E12–E13, F14–F15,
  M33–M35, N36–N37 (two `declareFile` pack lists: with and without
  `trade-haulage`, asserting `passage` is absent then present with no
  platform file in the diff), P39–P40. Every checkpoint must be able to
  fail (assert the sentence, not "a response arrived").
- The seven affected drives re-run (`pnpm wire` on those files);
  assertions that read a value from prose move to `eval` or to a
  band-tolerant match per D18.
- Commit: `drive(instrumentation): Stage A — the ladder, driven`.

### Stage B — the sample, the bench, the lab, the assayer

#### W5 — The sample and the field call (R-D10, R-D14, R-D15, drive G)

- `lib/instrument/Sampled.ts` + `Mixins.Sampled` (D19); composed on `Ore`
  and `Provision`; `Ore`'s split/merge tests extended (split keeps the
  stamp; merge of two origins nulls it).
- `inventory/sample.yaml` + `SampleController` (D20); `Working.sampleFace`
  in trade-mining with `winSample` beside `winOre`; Avatar affords
  `sample`.
- Mining's **`grade` channel** (row + `GradeReading`): scope `[here,
  subject]`; eye rung at a face reads `facesOf()` qualitatively
  (`eyeCeiling: novice`), `handTool: field-identification`, and
  **writes the field call** as a `grade:` belief note (D15's mirror
  input); subject rung on an `Ore` reads the lump the same way;
  `measure grade` refuses naming the bench; `bench: assaying` declared
  (the rung lands in W6). Rows `hand-lens.yaml`, `streak-plate.yaml` over
  `ToolItem` with `capabilities: [field-identification]` in trade-mining.
- Carry limit is the shipped encumbrance ladder on the lump's honest
  mass (`SAMPLE_MASS_KG` dial on the row, 0.5) — no new code; the drive
  proves eighteen samples slow you.
- Commit: `build(instrumentation W5): a sample is the real material, stamped where it was taken`.

#### W6 — The bench, `assay`, the record, the laboratory (R-D13, R-D16, R-D21, drive H19–22, I24–25)

- `AssayBench` + row (D13); `assay.yaml` + `AssayController` +
  `finishAssay`; `ReadingRecord` + row (D14); `benchRead` implemented on
  `GradeReading` (`Ore.metalFractionOf` × band via `observe`, credits
  `chemistry`) and on `ChemistryReading` (composition; the freshness arm
  lands in W8); `laboratory.yaml` archetype (D22).
- Campus lab content in `eternal-university`: zone, room, `props:`, exit.
- Tests: queue order and amortized duration; completion after the actor
  logged out mints the report into the room; `assay` in a room with no
  bench refuses naming the bench; the report's fields; `survey` reports
  the room as *a laboratory*.
- Commit: `build(instrumentation W6): the bench eats the sample and hands you a paper`.

#### W7 — The assayer (R-lens 6, drive H23)

- The campus `Business` row (`assayer` position, `wageRate`,
  `operatingLocations: [the bench's path]`, roster) and the `Cast` row
  (dossier `competence: [{discipline: chemistry, asserting: proficient}]`).
- `AssayController`: when an on-shift assignee of a position whose
  `operatingLocations` names the bench is in the bench's room, the batch
  runs at **their** band and the customer pays `fee × n` from their
  primary account to the business's operating account (the
  `BuyController` leg). The proprietor and on-shift staff pay nothing.
- Tests: staffed vs unstaffed band; the fee posts once; an unfunded
  customer is refused before the sample is taken.
- Commit: `build(instrumentation W7): pay the assayer`.

#### W8 — Salting and the spoiled sample (R-D17, R-D19, drive J, K)

- Salting is content-free (D20); the wave is **tests**: the stamp cannot
  be set by any verb, `authorable: false`, a second `sample` at a
  different place re-stamps, a report reproduces the stamp.
- `ChemistryReading.benchRead` on a `FreshnessMixin` host: the freshness
  band as read now, and the derived tell at `competent+` (D21).
- Commit: `build(instrumentation W8): the record is truthful; people are not; the sample went off in the carrying`.

#### W9 — Aggregation and the mirror (R-D6 record rung, R-D20, drive I26–27, L32)

- `GroundReading` (mining) reads the actor's `grade` reports
  (`MqlApi.resolveMany('me:i:[class.ReadingRecord]')`) with distinct
  `sampledAt` faces; below `SOLVE_FROM[band]` distinct faces it says
  *not enough yet — N more from different faces*; at or above, it solves
  the grade gradient over the faces' warren coordinates into words
  (*richer to the north-east*).
- `ReadingsController` gains the mirror stanza (D15).
- Commit: `build(instrumentation W9): what your samples add up to, and how your eye has been doing`.

#### W10 — The second laboratory, the Stage B drive, the MR

- `rejection` content: an assay bench row `props:`-placed in the co-op's
  office, `fee` higher, no roster (D22). Zero pack code — the wave's own
  falsifiable test.
- The wire drive grows checkpoints G16–18, H19–23, I24–27, J28–29,
  K30–31, L32, O38; run it; run the seven drives again; `pnpm test` once;
  append the drive record; push; open the MR.
- Commit: `drive(instrumentation): Stage B — the round trip, driven` then the MR.

---

## Reachability wiring

Each link fails closed and silent.

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| a reading (any channel) | `measure` / `analyze` flat views | `Avatar.commandContributions.self` | a `Reading` row at `<root>/idea/reading/<channel>` with `class:` | `ReadingCatalogue` warms by infix, lazily on first `InstrumentApi.reading()` and in `postRegister` | `subject requires: any`; `tool requires: [ToolMixin]` — the Reading refuses by `subjectRequires` in its own words |
| the instrumented rung | same | same | the instrument **row** declares `capabilities: [<cap>]` and the Reading row `instrument: <cap>` — both, or `lint:capabilities` fails | rows install with the pack | the Reading narrows the bound tools by `getCapabilities()` then `isBroken()` |
| a trade's channel | same | same | the pack's row + class; **no platform file** | the pack's install | same |
| `trace address` / `atmosphere` | `system/trace.yaml` | Avatar `self` | — | — | `location requires: ContainerMixin` |
| `readings` | `perception/readings.yaml` | Avatar `self` | every Reading row's `improves`/`stakes` | the catalogue | `channel` optional string |
| `sample` | `inventory/sample.yaml` | Avatar `self` | `SampledMixin` on `Ore`/`Provision`; `Working.sampleFace` | — | `subject requires: any`; case 4 refuses in the thing's terms |
| `assay` | `trade/mining/cmd/mining/assay.yaml` | `AssayBench.commandContributions.environment` **and** `Ore.commandContributions.inventory` | the bench row (`capabilities: [assaying]`, `fixedInPlace`), a room that `props:` it, the `reading-record` row | the bench is placed by content; the record row installs with the platform pack | `samples requires: [SampledMixin]`; `bench requires: [ToolMixin]`, narrowed to `assaying` |
| the laboratory | `survey` (shipped) | — | `laboratory.yaml`, industry-less; `assaying` declared by a row | `ArchetypeCatalogue` | — |
| the assayer | `assay` | — | the `Business` row's position + `operatingLocations` naming the bench; the `Cast` row's seeded competence | the roster tick | — |
| the mirror | `readings` | — | `grade:` belief notes written by `analyze grade`; `ReadingRecord`s in inventory | — | — |

⚠ The fifth link (the binder): every object arg here is `any` or a
kernel mixin the target composes; a pack-only mixin never appears in a
platform view.

---

## Acceptance-criteria coverage

| AC | wave |
|---|---|
| 1 vague, honest, no tool, no trust | W2 |
| 2 better with a Discipline, no tool | W2 (eye rung) |
| 3 instrument improves; better instrument only for the skilled | W2 (D5, D6) |
| 4 no refusal for permission; every refusal names a route | W1 (base refusals), W3 |
| 5 wrong instrument cannot take the reading | W1 (capability narrowing; the light bug is moot) |
| 6 every gated instrument exists | W1 (sundial, sextant rows) |
| 7 write a reading down; another sees who and how well | W6 (`ReadingRecord`) |
| 8 paid to take a reading another cannot | W7 |
| 9 a bystander can tell | W5 (`sample` `toPeers`), W6 (`assay`) |
| 10 reading a person: condition in words; they know | W3 |
| 11 install/remove a trade adds/removes its readings; nothing advertised then fails | W1 (rows), proven W4 (N36–37) |
| 12 every reading names the decision and the cost | W3 (`improves`/`stakes`) |
| 13 sample, carry, read elsewhere; says where from | W5, W6 |
| 14 un-carryable told why in the thing's terms | W5 (case 4) |
| 15 assay takes spendable time; batch, courier, pay | W6 (batch, unattended), W7 (pay); courier = the shipped haulage market, unchanged |
| 16 no instrument, no lab, no money — worse, not blocked | W5 (eye + hand tool) + the drive's G16–18 |
| 17 fraudulent origin the record does not contradict | W8 |
| 18 spoiled sample reads wrong; competent assayer says so | W8 |
| 19 self-only calibration | W9 |
| 20 a second lab, not the university's, works | W10 |

Nothing unmapped.

---

## Test & gate strategy

- **Unit (`pnpm test:near` + each touched pack's vitest):** the
  substrate (catalogue warm across roots, `observe` containment,
  `bandOf`, `ceilingOf` boundaries); the three-reader test per banded
  channel; the ceiling test; wear once per measure; the broken-tool
  refusal; `Sampled` through split/merge; `sample`'s four cases; the
  bench queue and amortization; completion after logout; the record's
  fields; the stamp's immutability; the tell; aggregation's
  not-enough-yet; the mirror's arithmetic on a fixture of notes + reports.
  New controller tests dispatch through the binder (`lint:binder-models`).
- **Only the drive can prove:** that the verb is reachable without an
  instrument and refuses by name; that the trade's channel is absent
  without the pack; that the report is where the mill-shaped completion
  left it after a walk-out; that `survey` calls the campus room a
  laboratory; that the second lab is rows.
- **Gates:** `pnpm -C packages/server lint:family` after every wave —
  never a subset. `lint:instrument-args` moves `0 → 9 → 0` (W0, W1).
- **Full suite:** once before the MR (W10), once at `/finalize`. Never in
  the background. A green run stays valid until a source file changes.
- **Wire:** the new file plus the seven affected drives, run at W4 and
  W10 with `WIRE_PORT` per worktree.

---

## Risks & opens

Things the user should look at before the build runs (the build will
decide them in this order if unanswered: this plan → design-lenses →
CLAUDE.md → the nearest shipped pattern):

1. **D3 lifts a doctrine line** (`command-routing.md:536-541`). The reason
   is R-D12; the sweep rewrites the box. If the user wants `measure`
   kept off the body, drive step A2 must be reworded to accept *unknown
   command* — the plan does not recommend that.
2. **D9 mints `physics`** beyond the decided `chemistry`, and assigns the
   raw-physics channels to `awareness`/`physics`. Every assignment is a
   row field; reversing one is a content edit.
3. **D10 retires `measure passage`** in favour of `analyze passage`. One
   shipped phrase, in haulage's tests and possibly the logistics drive.
4. **D14 corrects R-D11's wording** — the taker/band stamp lives on the
   assay record, not on the field book, to keep the shipped re-read
   property.
5. **W1 is large** (31 rows, 31 classes, 24 controllers deleted, 12
   instrument rows, 29 test files). It is one wave because a half-moved
   verb is not landable; it lands as a series of `refactor(...)` commits
   inside the wave.
6. **The binder's treatment of an unresolved optional object** (D1's
   parameter path) is verified at W1 step 2 before anything depends on
   it; the fallback (`param` string arg) is written down.
7. **`texture`'s instrument** and **`MeasureBook`'s composition** are
   read at W1 step 5, not assumed.
8. **The `assay` refusal "where a bench is"** names the archetype and
   `help assay`, not a place — a kernel or trade controller must not
   name campus content, and a world scan for benches is forbidden.
9. **A report left on a bench across a restart** persists only if the
   lab room's overlay captures it; the drive collects within a session.
10. **Report persistence via the room overlay** is furnishing's
    owner-based slice — confirm at W6 that a code-minted item in an
    unowned campus room survives `look` after a reconnect; if not, mint
    the report into the customer's inventory when present and into the
    room only when absent, and say so in the plan.
11. **`wiki-spoiler-fields.snapshot.test.ts`** changes if any new field
    is spoiler-marked; `Sampled`'s fields are not (provenance is what a
    sample *is*), `ReadingRecord.value` is `spoiler: 1` (the number the
    bench earns) — one snapshot update, deliberate.
12. **The wire drive needs two pack lists** (N36–37); confirm the harness
    can boot twice in one file or split the N checkpoints into a sibling
    file.

---

## Deferred seams

Attach points only; the design goes back to slates at the sweep.

- **Samples of a bulk medium** (a sealed flask of mine air, a bottle of
  river water, milk from a vat) — `BulkPayload` takes provenance the way
  `CraftedMixin` echoes onto it (`declare module`, `Crafted.ts:52-74`);
  `sample` gains a fifth case for a `Bulkable` subject into a carried
  vessel. → `instrumentation-slate.md` (parent).
- **A soil portion and the soil bench rung** — farming has no spadeful
  class; the bench rung for `acidity`/`texture` waits on one. →
  `instrumentation-slate.md` § field/bench, cross-ref `smallholding.md`.
- **The multimeter** (`electrical`'s measure rung) and **a timepiece**
  (`time`'s) — a row each when content motivates; the channel rows
  already carry `instrument: null` with the reason in `stakes`. →
  `instrumentation-slate.md`.
- **Attestation and the certified assayer** — `ReadingRecord` carries
  taker + band; a credential kind and a seat are the institutions
  slate's. → `credential.md` deferred ledger, `institutions-slate.md`.
- **An attended bench** (a human assayer serving in person, a lease, a
  visible queue of people) — `AttendantMixin` on the bench when a
  position wants attention rather than a fee. → `employment.md` note.
- **The courier** — demand only; freight's mechanism. → `freight-slate.md`.
- **Sensor augments, medical instruments, acoustic reads** — the
  requirements' non-goals, already homed.

---

## Critical files

Read first, in this order.

- `docs/requirements/instrumentation-requirements.md`
- `packages/server/src/mud/lib/command/command.schema.json:180-292`,
  `packages/content/arcana/content/system/arcana/cmd/magic/cast.yaml`,
  `packages/content/arcana/src/idea/cmd/magic/{CastController,SpellsController}.ts`
- `packages/content/platform/content/platform/cmd/perception/{measure,analyze}.yaml`
  (the shape being replaced)
- `packages/server/src/mud/platform/idea/MaterialCatalogue.ts` (the
  catalogue to copy), `platform/idea/DisciplineCatalogue.ts`
- `packages/server/src/mud/lib/advancement/{CompetenceBand,Advancement}.ts`
- `packages/content/trade-mining/src/idea/cmd/perception/SurveyChannelController.ts`,
  `packages/content/trade-farming/src/idea/cmd/perception/SoilChannelController.ts`,
  `packages/content/trade-haulage/src/idea/cmd/perception/MeasurePassageController.ts`
  (the three bases that become Readings)
- `packages/server/src/mud/platform/idea/cmd/perception/{MeasureLightController,AnalyzeLightController,MeasureAtmosphereController,MeasureAltitudeController}.ts`
- `packages/server/src/mud/platform/thing/ToolItem.ts`,
  `lib/crafting/{Tooled,Durable,Crafted}.ts`, `api/material.ts:157-159`
- `packages/server/scripts/{check-instrument-args,check-capabilities}.ts`
- `packages/content/trade-mining/src/thing/Ore.ts`,
  `trade-mining/src/lib/Working.ts`,
  `trade-mining/src/idea/cmd/mining/HewController.ts:129-215`
- `packages/content/trade-milling/src/idea/cmd/milling/MillController.ts:1-40,153-208`
- `packages/server/src/mud/platform/thing/Provision.ts`,
  `lib/material/Freshness.ts`
- `packages/content/generic-objects/content/archetypes/gym.yaml`,
  `packages/server/src/mud/platform/idea/cmd/perception/SurveyController.ts:157-168`
- `packages/content/saxonberg-lounge/content/world/lounge/idea/business.yaml`,
  `packages/server/src/mud/platform/idea/cmd/retail/BuyController.ts:300-320`
- `packages/content/eternal-university/content/world/terminus/eternal/campus-farm.yaml`
  and `campus-farm/location/yard.yaml`
- `packages/content/hearts-delight/content/world/terminus/hearts-delight/agent/farmer.yaml:25-27`
- `packages/content/platform/content/platform/cmd/author/practice.yaml`
- `packages/wire/tests/metallurgy.dirty.wire.test.ts` (drive shape),
  `packages/wire/src/harness/session.ts:187-202`
- `docs/subsystems/{command-routing,advancement,crafting,spoilage,employment,measurement,uncertainty}.md`

---

## Drive record

*(appended at build time — the output of running
`packages/wire/tests/instrumentation.dirty.wire.test.ts`, the count, and
what each failure was)*
