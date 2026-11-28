# Tropes, build 1 — implementation plan

Builds the **primitives of plot**: every act's actor, cause and people on the ledgers that already
exist; a exercise record whose credit is named by the act's definition; a closed vocabulary of
descriptive **beats**; a **trope matcher** that turns beats into trait, regard and renown writes;
an optional **roster pack** that holds every reading; and the gates that make the old way
unwriteable. Executes [tropes-requirements](../requirements/tropes-requirements.md) (closed
scope); seeded by [tropes-slate](../slates/engine/tropes-slate.md). **Kind:** feature.
**Leads from:** kernel. **First consumer:** the hand-written characterization writers that ship
today, moved onto tropes with today's behavior as the regression check.

Path shorthand used throughout: **`S/`** = `packages/server/src/mud/`, **`C/`** =
`packages/content/`, **`W/`** = `packages/wire/`.

---

## Grounding

Every fact below was read in the file named, on `reqs/tropes` at `c1751c31a` (4 behind
`origin/master`, 6 ahead), 2026-11-24.

### Who is acting, and because of what

- `S/api/execution-context.ts` — `getActor()` (:738) reads the nearest actor-bearing frame
  (`#actorBearer`, :714: a Command frame's giver, `metadata.actingSystem`, `metadata.actor`,
  `metadata.actingAuthor`). `getActingAuthor()` (:625) is the labor-plane read and is `null` for a
  forced chain. `getCurrentCausingCommandId()` (:1037) walks for `metadata.causingCommandId`.
  `captureActor()` (:755) / `runAsCaptured()` (:768) carry an `ActorClaim { actor, system }`.
  `runAsSystem(name, fn)` (:789) and `runAsSelf(fn)` (:816) exist.
- `runRoot(target, method, fn, opts?)` (:1186) and `runRootGuarded` (:1222) plant a root with
  `caller: null` and **no actor requirement**; `RunRootOpts` (:132) is `{ circleScope?,
  jurisdictionBound? }`. Non-test call sites: about 60 across 20 files — `SandboxLogic` 13,
  `api/test-harness.ts` 11, `backend/TestHooks.ts` 11, `backend/Backend.ts` 8,
  `WorldClockRegistry` 4, `SchedulerRegistry` 3, `PersistableLogic` 2, `api/schedule.ts` 2,
  `backend/inbound/command.ts` 2, `YoutubeRelayReader` 2, and one each in
  `MqlSubscriptionRegistry`, `CommandGiver`, `api/security.ts`, `api/record.ts`, `api/access.ts`,
  `inbound/wiki.ts`, `inbound/locality.ts`, `TwitchRelayReader`, `KickRelayReader`, `CmsSession`.
  Two pass a `null` target (`inbound/wiki.ts:34`, `inbound/locality.ts:46`).
- **Three separate continuation captures, none complete:**
  - `S/api/schedule.ts` `captureAttribution` (:156) carries `commandId`, `author`, `actor` and
    replants all three (:205–212).
  - `S/platform/idea/SchedulerRegistry.ts` `register` (:419–423) keeps `causingAuthors` and
    `causingActors` maps; `continuationMetadata` (:693) replants author and actor —
    ⚠ **never `causingCommandId`**. An engagement's completion root therefore has an actor and no
    cause.
  - `S/platform/idea/WorldClockRegistry.ts` (:782–784) captures the actor only.
- A command's id is planted at `S/lib/command/CommandGiver.ts:1139–1143`
  (`causingCommandId: outer.commandId`). No ledger row stores it.
- Brains already act as themselves: `S/lib/behavior/Behaved.ts:863`
  (`runAsSelf(() => descriptor.act(ctx))`) and :246. A brain's turn has **no act id** unless it
  dispatches a command.
- **Authorship used for an in-fiction actor (the defect):** `S/platform/idea/api/ConditionLogic.ts:194`
  (`resolveInflicter`), `S/lib/vitals/Vitals.ts:3896`, `S/platform/idea/api/ChattelLogic.ts:257`
  and :314, `S/platform/idea/ChattelRegistry.ts:179` (which also keys the person on
  `getTemplatePath()`, the shared-lineage antipattern). `getActingAuthor()` has 40 other call
  sites (CraftingLogic 7, provenance, documents, wiki, git, …) — most are the labor plane and
  correct.

### The ledgers

| ledger | row class | writer (one function each) | names its actor by | carries |
|---|---|---|---|---|
| `bank_ledger` | `S/lib/banking/LedgerEntry.ts` | `postTransaction`, `S/platform/idea/api/BankingLogic.ts:2245` | `actingActorKey()` (:152) → `getActor()` identity path, else `'system'` | accounts, `kind`, `category`, `txId`; **no people, no act** |
| `chattel_events` | `S/lib/chattel/ChattelEvent.ts` | `ChattelRegistry.appendEvent`, `S/platform/idea/ChattelRegistry.ts:162` | **authorship** (:179) | `chattelId`, `event` (`mint · transfer · released`), `from`, `to` |
| `contract_events` | `ContractEvent` | `appendEvent`, `S/platform/idea/api/ContractLogic.ts:145` | `actorKey()` (:140) or a passed `actor` | `contractId`, `event`, `actor`, `counterparty`, `txId`, `memo` |
| `accountability_events` | `S/lib/accountability/AccountabilityEvent.ts` | `AccountabilityApi.record` from seven producers | each producer | kinds `opened · violated · death · harm · abandonment`; a per-producer `sessionId`; **no witnesses** |
| `transcripts` | `S/lib/advancement/TranscriptEntry.ts` | `buildAndSave`, `S/lib/advancement/Advancement.ts:87` | the host (`ownerKeyOf` → identity path) | `owner, kind, when, discipline, difficulty, outcome, tags, archetype` |
| `disposition_events` | `S/lib/trait/DispositionEntry.ts` | `buildAndSave` in `S/lib/trait/Dispositioned.ts:150` | the host | `owner, kind, when, disposition, valence, tags, archetype` |
| `renown_events` | `RenownEvent` | `appendImpl`, `S/platform/idea/api/RenownLogic.ts:97` | passed `source` | `subject, source, kind, signal{}, locality, groups` |
| `chronicles` | `S/lib/chronicle/ChronicleEntry.ts` | `PersonaMixin.recordDeed` / `recordChronicleOnce`, `S/lib/character/Persona.ts:320/:331` | the host | `owner, kind, when, where, who[], text, tags, key` |

- A contract breach by claim expiry runs **lazily on a read** (`expireStale` → `breachClaim`,
  `ContractLogic.ts:446`), so the root's actor may be an unrelated reader; the row already names
  the claimant (`actor: claimant`).
- The bank's posting path already reads the paying account's balance before it writes
  (`balanceMinor(accountId)`, the floor check) and reads the warmed registry cache only
  (`AccountBalance.cachedCurrency`). `S/lib/banking/AccountBalance.ts:64` holds each account's
  `owner` key.
- ⚠ **`give` moves custody and never title.** `S/platform/idea/cmd/inventory/GiveController.ts:126`
  is one `ContainmentApi.move`; no chattel event is written. Title moves only through
  `transferChattel` (7 callers: `ConsignmentShelf.ts:385`, `Stock.ts:578/:778`,
  `TitleTransferController.ts:282`, `ContractLogic.ts:1823`, potash `ashes.ts:130`, farming
  `Tract.ts:803`). The slate's `give` beat (*"a chattel transfer … with no sale"*) has no fact
  behind it for the `give` verb today (D7).

### The writers to delete

| writer | site | what it writes |
|---|---|---|
| blood gift | `S/lib/vitals/Blood.ts:101–113` (`BLOOD_GIFT_SIGNATURE`, `BLOOD_GIFT_RENOWN`), applied in `S/lib/commerce/DonationBank.ts:396–424` (`creditGift`) | generosity +2; compassion +2 when the lot was short; an `applaud` renown reaction from the bank's business; ⚠ players only (`isHasInteractive`, :386) |
| the trait graft | `S/lib/advancement/Advancement.ts:532–540` | `creditSignature` fans `dispositionValence` into `imprintSignature` — the only caller of either imprint method |
| combat | `runResolutionConsumers`, `S/platform/idea/api/CombatLogic.ts:5521–5556` | witnesses' regard for the victor: dial `combatRegardUnlawfulKill` −20, `combatRegardDuelWin` +2; witnesses come from `roomBelievers` (:5559 — every sensor in the room, no perception check) and are discarded |
| contract breach | `ContractLogic.ts:468–477` | the issuer's regard for the claimant, dial `contractBreachRegardPenalty` 15 |
| hand-feeding | `S/lib/husbandry/Bonded.ts:844–852` | `ILL_FROM_HAND_REGARD` −25 when the food carries a pathogen load, else `HAND_FEED_REGARD` 10 × need |
| petting | `S/platform/idea/cmd/social/PetController.ts:83` | `PET_REGARD` 6 |
| introductions | `S/platform/idea/cmd/social/IntroduceController.ts:138` | `REGARD_INTRODUCE_BUMP` 1 to every listener |
| dialogue | the `regard` effect, `S/lib/npc/DialogueConversation.ts:383–387` | `npc.adjustRegard(player, delta)`; 23 uses in 8 rows — clerk 4, officer 3 (build-1 targets); Dave 4, Remy 4, Augie 3, Mara 2, Sloane 2, Katie 1 (untouched) |

- A kept animal's regard **is** its bond: `bondWith = regard/100 × handling` (`Bonded.ts:9`, :365),
  and petting is gated on it (`PetController.ts:67`). `S/lib/belief/BeliefStore.ts:860–875` says
  so. See D27.
- The terminal clerk has only courteous choices today
  (`C/terminus/content/world/terminus/terminal/agent/clerk.yaml:87–126`) — no rude one and no
  confession; drive step 13 needs both authored. Its `warm` branch gates on regard ≥ 20.
- `RenownApi.append` has two callers outside `RenownLogic`: `DonationBank.ts:413` and
  `TestHarnessLogic.ts:400`. Renown's own ingestion of real reactions and receptions
  (`RenownLogic.ts:192/:257/:526`) and the dossier seeds (`Cast.ts:241` `seedTo`,
  `Dispositioned.seedTraitClaims` :377) are separate doors.
- `DispositionedMixin` composes on `Character` (`S/lib/character/Character.ts:116`), so players
  and NPCs both keep a trait ledger; `imprintSignature` / `imprintDeed` are `SelfOnly`
  (`Dispositioned.ts:254–281`). A host with no identity path writes nothing (`ownerKey`), and an
  `Extra` keeps no personal regard (`keepsPersonalRegard`, `BeliefStore.ts:870`).

### Discipline credit

- 108 `creditDeed` / `creditSignature` call sites outside tests: server 46, drilling 10, medicine
  9, water 7, mining 7, glass 6, farming 4, ceramics 3, and 16 more across 13 packs.
- Named on a row today: recipes (`recordCraftEvidence`, `S/platform/idea/api/CraftingLogic.ts:2528`,
  reads `recipe.getDiscipline()` / `getDifficulty()`, credits `success` only); joints
  (`CraftingLogic.ts:5132–5140`, reads `row.competence.discipline`).
- ⚠ A joint's `competence` is also a **gate**: `{ discipline, band }`, refused below the band
  (`CraftingLogic.ts:4875`). The knot rows (`C/platform/content/joints/reef-knot.yaml`,
  `bowline.yaml`, `clove-hitch.yaml`, …) carry `competence: null`. Rope hard-codes `ropework` at
  `S/platform/thing/Rope.ts:798` (tie, `easy`) and :1126 (splice, `standard`) — both `creditSignature`; the cordage pack at
  `C/trade-cordage/src/thing/RopeJack.ts:349`.
- Operations are documents (`C/trade-medicine/content/operations/*.yaml`, kind
  `C/platform/content/kinds/operation.yaml`, catalogue `S/platform/idea/OperationCatalogue.ts`);
  `OperationDescriptor` (`S/lib/vitals/Operation.ts`) already has `competence.discipline` and
  `difficulty`. `OperateController.ts:181` ignores both. Suture, Set, Bleed, Transfuse, Prescribe,
  Test and the `nurses` brain (`C/trade-medicine/src/…`, 9 sites) hard-code `nursing` / `medicine`.
- Failure is credited in almost one place: the glass gather that chills off the pipe
  (`C/trade-glass/src/thing/Gather.ts:353`, `standard`, hard-coded). ⚠ A gather has **no Form row
  until it is blown**: its `form` is `gather`, then `bubble`, then a Form key (`Gather.ts:41`,
  :128), so a gather that chills early has no form to name. Forms are the kernel's shared
  `/platform/idea/FormCatalogue` (ceramics uses it too) and no form row carries a difficulty.
  `Blowpipe.formingDiscipline()` (`C/trade-glass/src/thing/Blowpipe.ts:45`) hard-codes
  `glasswork`. What exists from the first dip is the gather's own row,
  `C/trade-glass/content/trade/glass/thing/gather.yaml`. ⚠ **The forge has no failure outcome at all** — `CraftingApi.craft` resolves to a
  grade; a quench may `crack` (`C/trade-smithing/src/lib/Quenchable.ts:134`) and credits nothing.
- The scheduler's abort reasons are `cancelled · replaced · preconditions-changed ·
  host-destroyed · thrown` (`S/lib/activity/Engaged.ts:57–65`), plus what subsystems add.
  `SchedulerRegistry.terminate` (:577) records nothing about the work that stopped; it already
  treats `cancelled`, `replaced` and `preconditions-changed` alike for exertion (:584).
  `isDurativeActivity` is an unexported function in `SchedulerRegistry.ts:83`.
- `operate` offers **every** operation row: `OperateController.ts:53` reads
  `ConditionApi.operations().all()` and the body picks among them (`body.operable`). A new row
  for suturing would become an `operate` choice unless rows say which act performs them.
- `TranscriptEntry` inherits `Document.find` (`S/lib/persistence/Document.ts:353`); the owner read
  is already `TranscriptEntry.find({ owner })` (`Advancement.ts:237`).
- `BeliefStore.learnIdentityOf(subject, name)` (`S/lib/belief/BeliefStore.ts:779`) is where an
  introduction lands; callers: `IntroduceController.ts:136`, `Soul.ts:249` (both: the subject is
  the one acting, `name` given), `PerceptionLogic.ts:1498` and `Perceiver.ts:234` (recognition,
  `name: null`), `Bonded.ts:724` (a witness learns an animal's name from its namer).
- `lint:lib-statics` holds statics on non-Api classes at 334
  (`packages/server/scripts/check-lib-statics.ts:240`).
- ⚠ Line numbers above were read at `c1751c31a`; master was merged since (`7888e1670`). Those the
  review re-checked are corrected. **Find a site by its symbol, not its line.**

### Content, packs, documents

- A document **kind** is itself a document: `C/platform/content/kinds/<kind>.yaml`, composing
  traits (`shipped: { dir }`, `catalogued: { by: <singleton>, load: per-path | whole | boot }`,
  `keyworded`, `titled`). 22 kinds are catalogued; six load `whole` (emotes, recipes, topics, …).
  A catalogue extends `S/lib/document/DocumentCatalogue` and lives at
  `S/platform/idea/<X>Catalogue.ts`; its value class lives in `lib/`
  ([document-store.md](../subsystems/document-store.md) § *Idea or document — the test*).
- A content-only pack with a document root of its own exists: `C/expression/` (`root:
  /expression`, `content/emotes/`, no `src/`).
- A wire file declares the packs its world has (`declareFile({ packs: [...] })`,
  `W/src/harness/registry.ts:82`); a dirty file gets a world of its own. The scaffold
  (`C/test-fixtures`, `testOnly`) has a lit bank, a forge and basin, a greeter and a noticeboard;
  `standIn`, `fundedAccount`, `standInNpc` (`W/src/harness/scaffold.ts`), `hand`, `stage(path,
  method, …args)`, `advanceWorldClock`, `restartWorld` (`W/src/harness/world.ts`) exist.
  `lint:wire-content` holds the count of drive files that name placeholder content at 113
  (`packages/server/scripts/check-wire-content.ts:60`).
- Ratchet precedent: a `const CEILING` in the script
  (`packages/server/scripts/check-create-sites.ts:44`, `check-counters.ts:55`,
  `check-contribution-keys.ts:38` at 0). `lint:family` runs all 121 `lint:*` scripts.

### Siblings in flight

- `build/organism-biology` (build-4, swept, unmerged): changes `OperateController`'s credit to
  `difficulty: op.difficulty`, and adds 5 `runRoot` sites in `api/test-harness.ts`.
- `build/stream-arrival` (build-2): adds one `runRoot(body, 'executeCommand', …)`.
- `build/which` (build-3): touches none of this.

---

## ⭐⭐⭐ The surface, by kind

The code shape in one place (the owner, 2026-11-28 — review's opening questions answered here). ⚠
**The names `attempt` / `credit` (Exercise, recordExercise, ExerciseActivity, the `attempt` beat) are under
review** with the owner — see D32 once it lands; the shape below does not change with the names.

**Api statics**

| static | on | why not P1 / P12 / P13 |
|---|---|---|
| `occurred(...occurrences)` | `NarrativeApi` (new) | the one orchestration across five ledgers and three write doors; no existing Api owns more than one ledger. Named for the narrative ladder — quests land here later (D31) |
| `tropes()`, `beats()` | `NarrativeApi` | catalogue doors, the `CraftingApi.joints()` shape |
| `disciplines()` | `CraftingApi` | Disciplines have no Api today (the Api OO sweep retired `AdvancementApi`; advancement lives on `AdvancementMixin`), and `CraftingApi` already stands the catalogue in its `needs`. A door beside what it already declares; a fault line logged for the tech tree (D30) |
| `getCurrentAct()` | `ExecutionContextApi` | the existing causing-command read becomes a read of it (N3) |
| `captureContinuation()` / `runAsContinuation()` | `ExecutionContextApi` | replace three partial captures, which are deleted (N2) |
| `runRoot(…, { acting })` | `ExecutionContextApi` | a required option on the existing call, not a new one (N1) |

**Mixin methods** (no new mixin)

| method | on | host set |
|---|---|---|
| `recordExercise(credit, result)` | `AdvancementMixin` | `Character` — same hosts as `creditDeed`, which only falls |
| `imprintFromTrope(write)` | `DispositionedMixin` | `Character` — replaces `imprintSignature` + `imprintDeed` |

**Protocols / interfaces**

| protocol | implemented by | asked by |
|---|---|---|
| `BeatSource { occurrences() }` | the five ledger row classes | their writers, at save |
| `ExerciseActivity` | work engagements, opt-in | the scheduler, at an engagement's end |

**Value classes** (`lib/`, never template-instanced): `Beat` vocabulary + `BeatOccurrence`
(`lib/narrative/Beat.ts`, versioned — D29) · `Trope` (`lib/narrative/Trope.ts`, over a document) ·
`Exercise` (`lib/advancement/`, built only by `DisciplineCatalogue.exerciseFrom`, an instance method).

**Documents and catalogues:** kinds `trope` and `beat` (asserted beats), each with a catalogue
singleton; documents because nothing writes them at runtime (P10).

**Fields** — per host, with the share left empty, in *Host placement* below: `actId`/`causeId` on
all five ledgers; `fromParty`/`toParty`/`heldBefore` (bank); `basis`/`txId` (chattel);
`witnesses` + kinds `yielded`/`spared` (accountability); `definition`/`counterparty`/`ending`/`beat`
(transcript); `trope`/`actId`/`counterparty` (disposition); `act` (operation rows); `credit` (the
gather row).

**The command layer — every verb and controller this build touches** (one layer above the
Standard Model: the CLI's views, controllers and affordances). The rule held throughout: **controllers
stay IO** — none fires a beat or writes a reading (P5; D-list), so every row below is a view, an
argument, or a call moved onto a model.

| verb / controller | change | player-visible? |
|---|---|---|
| `give` — `give.yaml` + `GiveController` | ⭐ new option **`--lend`**; default now passes title when the giver owns the thing (D7); help states both | **yes** |
| `talk` — the dialogue effect | new effect `assert` (an asserted beat) on the clerk's and officer's rows, replacing `regard` there; the lounge and Katie unchanged (D21) | the same choices; new authored lines for the clerk (a rude line, a confession) |
| `introduce` — `IntroduceController` | the regard bump leaves the controller; the `tell` occurrence comes from the model's identity-learning path (D21, P5) | no — regard moves only with the roster installed |
| `pet` — `PetController` | `PET_REGARD` deleted; the reading moves to *Pet the Dog* | no — same direction and size with the roster |
| `operate` — `OperateController` | lists only `forAct('operate')` rows, so new operation rows do not appear as choices; credit from the row | no — exactly today's five choices (tested) |
| `suture` · `set` · `bleed` · `transfuse` · `prescribe` · `test` (trade-medicine) | Discipline from the operation row's `exercises:`, not a literal; the patient on the record | no |
| `tie` · `splice` (rope, the rope jack) | `ropework` from the knot's joint row | no |
| the glass bench (gather, blowpipe) | `glasswork` from the gather and blowpipe rows; the gather at **hard** | `competence` weighs glass more |
| `donate` (blood) | the gift's trait and renown move to tropes | no — same with the roster |
| `title transfer` · `buy` · `sell` · `shelf consign` / `reclaim` | each chattel transfer states its basis (gift · sale · terms · restored) | no |
| `job claim` / `complete` / `abandon`, `attack` / `fight yield` / `finish`, `pay` | no view change; their models write the new row fields | no |
| `traits` · `chronicle` · `standing` · `competence` | no view change; `chronicle` shows a trope's telling (said only when surprising) | **yes** — tellings appear |
| `help beats` | new help topic for the published beat vocabulary | **yes** |
| `testharness act` | ⚠ owed **test-only** verb (drive step 15) — reads an act's id and owner | test worlds only |

**No new player verb. No affordance moves.** One new option (`give --lend`), one new dialogue effect
(`assert`), one help topic, one test-only verb.

**Retired:** `ActSignature.dispositionValence`; `BLOOD_GIFT_SIGNATURE`, `BLOOD_GIFT_RENOWN`; dials
`combatRegardUnlawfulKill`, `combatRegardDuelWin`, `contractBreachRegardPenalty`; `PET_REGARD`,
`ILL_FROM_HAND_REGARD`, `REGARD_INTRODUCE_BUMP`; `captureActor`/`runAsCaptured` and the two private
capture maps; `imprintSignature`/`imprintDeed`.

**Review pressure points, named in advance:** `yielded`/`spared` in the harm ledger (it already
holds `abandonment`); mostly-empty `counterparty` (accepted — no care ledger); the continuation
rewrite's breadth (W1's risk).

## ⭐⭐ New substrate

Each item cites the slate's § 10 reuse-ledger row, or says *genuinely new* and what was searched.

| # | item | ledger row / status |
|---|---|---|
| N1 | `RunRootOpts.acting` (required) on `runRoot` / `runRootGuarded` | **generalizes** *actor resolution* — no new call, a required field on the existing one |
| N2 | `ExecutionContextApi.captureContinuation()` / `runAsContinuation()` and the `ContinuationClaim` type — **replaces** `captureActor` / `runAsCaptured`, `ScheduleApi`'s private `Attribution`, and `SchedulerRegistry`'s two maps | **generalizes** *the cause* + *actor resolution*; the three specifics are deleted (P1 ⭐) |
| N3 | `ExecutionContextApi.getCurrentAct()` → `{ actId, causeId }` | **generalizes** *the cause*. One line on the difference: `getCurrentCausingCommandId()` answers *which typed command should a client match this output to* (commands only); `getCurrentAct()` answers *which choice is this, and what caused it* (a brain's turn has one too). After W1 the first is implemented as a read of the second's command case — one stack walk, two questions |
| N4 | fields on existing rows: `actId`, `causeId` (five ledgers); `fromParty`, `toParty`, `heldBefore` (bank); `basis`, `txId` (chattel); `witnesses` and kinds `yielded`, `spared` (accountability); `definition`, `counterparty`, `ending`, `beat` (transcript); `trope`, `actId`, `counterparty` (disposition); `act` (operation rows) | *chokepoints*, *witnesses*, *the exercise record* — **generalize**; ⛔ no new collection |
| N5a | `CraftingApi.disciplines()` — the door to the existing `DisciplineCatalogue`, and `exerciseFrom` on it (D30) | **reuses** the catalogue and the Api that already stands it |
| N5 | `Exercise` value class, `S/lib/advancement/Exercise.ts` — the authored half of an `ActSignature`: a definition path plus `Subcheck`s without their outcome. One shape: `recordExercise` adds the outcome and writes through the same `creditSignatureImpl`. Built in one place, `DisciplineCatalogue.exerciseFrom` (an instance method on the existing singleton — no new static) | **generalizes** *Discipline credit as data* / *act signature shape* |
| N6 | `AdvancementMixin.recordExercise(credit, result)` | **generalizes** *the exercise record*; `creditDeed` / `creditSignature` stay only as the ratchet's falling count |
| N7 | `ExerciseActivity` protocol in `S/lib/activity/Engaged.ts` (an engagement names the work it is); its narrowing `isExerciseActivity` is an unexported function in `SchedulerRegistry.ts` beside `isDurativeActivity` | **generalizes** *chokepoints* (scheduler end) — *genuinely new* as a protocol; searched `lib/activity`, the 11 engagement classes: nothing lets the scheduler ask what work an engagement is |
| N8 | `S/lib/narrative/Beat.ts` — the detected-beat vocabulary, the `BeatOccurrence` value, the `BeatSource` interface | *genuinely new* (*trope / beat / event bus*: none). Searched for `Beat`, `Trope`, `Narrative`, `Incident`: only `lib/behavior/BehaviorBeat` (an NPC's deliberation tick, unrelated) |
| N9 | `occurrences()` on the five ledger row classes (implementing `BeatSource`) — named so it cannot be confused with `NarrativeApi.beats()`, the asserted-beat catalogue door | **generalizes** *chokepoints* — five implementers of one protocol |
| N10 | `S/lib/narrative/Trope.ts` value class + document kind `trope` + `S/platform/idea/TropeCatalogue.ts` | *genuinely new* — a trope is metadata nothing writes (P10): a document, not an Idea |
| N11 | document kind `beat` (asserted beats) + `S/platform/idea/BeatCatalogue.ts` | *genuinely new*; rows, per slate § 4 *The pen* |
| N12 | `NarrativeApi` (`S/api/narrative.ts`) + `NarrativeLogic` (`S/platform/idea/api/NarrativeLogic.ts`) — the matcher | *genuinely new*. Searched `api/` for an existing home: `EventApi` is ruled out by the slate; `AccountabilityApi`, `RenownApi` each own one ledger; the matcher orchestrates across five ledgers and three write doors, which is what an Api is for |
| N13 | `DispositionedMixin.imprintFromTrope` — **replaces** `imprintSignature` / `imprintDeed` | **reuses** *trait ledger + write*; the old two are deleted with their one caller |
| N14 | dialogue effect `assert` — **replaces** `regard` for the clerk and officer | **replaces** *dialogue effects* (the `regard` effect stays for the lounge and Katie, counted by the gate) |
| N15 | pack `morality-commons`, root `/morality` (content only) | *genuinely new* — slate § 10's `/system/narrative` is superseded by § 3.10 (not a system pack) |
| N16 | `lint:characterization`, `lint:discipline-by-name`, `lint:tropes` | **reuses** *ratchet gate pattern* |
| — | **retired:** `ActSignature.dispositionValence`, the `creditSignature` graft, `BLOOD_GIFT_SIGNATURE`, `BLOOD_GIFT_RENOWN`, dials `combatRegardUnlawfulKill`, `combatRegardDuelWin`, `contractBreachRegardPenalty`, constants `PET_REGARD`, `ILL_FROM_HAND_REGARD`, `REGARD_INTRODUCE_BUMP` | *act signature shape*, *hand-written writers to delete* |

### Every § 10 ledger row, accounted for

| ledger row | where it lands |
|---|---|
| trait ledger + write | N13, D23 |
| regard write | reused as is (`BeliefStore.adjustRegard`), called by the matcher, D18 |
| renown write | reused (`RenownApi.append`), called by the matcher, D18 |
| Discipline credit as data | N5/N6, D9; knot rows, operation rows, the gather row, W2 |
| act signature shape | valence slot retired, D23 |
| the exercise record | N4 transcript fields, D9–D12 |
| the cause | N2/N3, D1–D2 |
| the telling | reused (`recordDeed` / `recordChronicleOnce`), D19 |
| a pub/sub bus | ⛔ not used; the matcher is called directly by the five ledger writers, D15 |
| actor resolution | N1, D3; siblings' sites, D3 |
| chokepoints | N4/N9, D4–D8, D13 |
| witnesses | N4, D8 |
| dialogue effects | N14, D21 |
| hand-written writers to delete | W4; introductions move to the roster (slate § 9) |
| ratchet gate pattern | N16, D24 |
| trope / beat / event bus | N8, N10–N12, N15 |
| player reads | reused unchanged; the chronicle carries the telling, D19 |

### P9–P14, per item

| item | P9 predictable from def + help | P10 metadata a Document | P11 no caller branches on destination | P12 not a synonym | P13 fits its host's sentence | P14 nothing moves or decides invisibly |
|---|---|---|---|---|---|---|
| N1 `acting` | no player surface | n/a | one field, every caller states it | extends `runRoot` | *"plant a root"* — who for is part of it | throws when absent; never defaults |
| N2 continuation claim | no player surface | n/a | one capture, one restore | replaces three, adds none | execution context carries context | restores exactly what it captured |
| N3 `getCurrentAct` | none | n/a | a read | adds the parent to an existing read | same | a read |
| N4 row fields | none; `give` passing title is said in `give`'s help (D7) | rows of existing ledgers | writers state facts they hold | no | each field is about its ledger's own subject (see Host placement) | stamped from context, never chosen |
| N5 `Exercise` | none | built only from an authored row | n/a | replaces a `Subcheck` built in code | advancement: what an act credits | no default discipline: a row without one credits nothing |
| N6 `recordExercise` | `competence` shows the same rows | n/a | one call for every definition family | the definition-taking form of `creditDeed`; the old one only falls | `AdvancementMixin`: *"append evidence"* | no |
| N7 `ExerciseActivity` | none | n/a | scheduler asks the engagement, never its class | no | an engagement says what it is | records only the chooser's own stop (D10) |
| N8 `Beat` | published vocabulary; help topic `beats` | detected list is code (each has detection); asserted are documents | n/a | "beat" collides with dialogue's node text and combat's clock — see Risks R9 | new subsystem `narrative` | descriptive only |
| N9 `occurrences()` | none | pure computation on a row | the row decides its beats | no | a ledger row describing itself | pure |
| N10 trope + catalogue | readable rows; the telling is the player surface | ✅ document kind, value class in `lib/` | n/a | no | n/a | a trope with an unreadable step is refused at install |
| N11 asserted beat | the dialogue line is the def | ✅ document kind | n/a | no | n/a | an unknown beat fails `lint:tropes`; absent pack = a stated skip |
| N12 `NarrativeApi` | none | n/a | callers pass occurrences; never branch on trope | no | the one orchestration | writes only what a row says, cites trope + act |
| N13 `imprintFromTrope` | `traits` unchanged | n/a | n/a | replaces two methods | `Dispositioned`: *"the append primitive"* | gated to the matcher |
| N14 `assert` effect | the choice's line + the row | row data | n/a | replaces `regard` where converted | dialogue effects | says what the player did, not what the listener feels |
| N15 pack | n/a | documents only | n/a | n/a | "what is written down" axis | absent = nothing characterizes |
| N16 lints | n/a | n/a | n/a | three questions, three gates | lint family | fail loudly |

---

## ⭐⭐⭐ Convergence and divergence (2026-11-28)

**C1 — what already does it, and the two this plan had missed:**

- ⭐⭐ **Reactions already key "the act" on the command id.** `ReactionRegistry` aggregates emotes
  `inReactionTo: <commandId>`, credits the act's speaker, and writes renown receptions
  (reactions.md). That is the same identity as D1's `actId` — and `CombatNarration` **mints its own
  command id** for dramatic beats in a detached scheduler root, which contradicts D1's *a deferred
  continuation keeps the originating act*. ⇒ **Converge:** after W1, a reaction's `inReactionTo` IS
  the act id, and combat narration reacts to the act it narrates (`getCurrentAct()`), not a fresh
  id. W1 owns it; reactions.md gains the line at the sweep.
- **Participation already records one row per command** (`participation_events`, kind
  `command`) — the seed of build 2's attended time. ⇒ Not used in build 1; recorded as the attach
  point (Deferred seams).
- Shipped and reused as planned: the five ledgers, `Subcheck`/`creditSignatureImpl` under
  `Exercise`, the chronicle for tellings, `PerceptionApi.perceives` for witnesses, belief's
  identity learning for `tell`, the dialogue effect applier for `assert`.

**C2 — unifying, or adding a head? The survivors after build 1:**

| two doors to one job | retired by |
|---|---|
| `recordExercise` + `creditDeed` + `creditSignature` | `lint:discipline-by-name`'s falling count; the ~100-site sweep (build 2) |
| dialogue effects `assert` + `regard` | the lounge's motives (build 2); `lint:characterization` counts `regard` |
| regard writes: the matcher + two named residuals | motives (lounge), and the bond (stays — mechanics) |
| `getCurrentAct()` + `getCurrentCausingCommandId()` | the second becomes a read of the first (N3); whether both stay public — api-normalization Part 8 |
| `ActSignature` as `creditSignature`'s legacy parameter | dies with `creditSignature` |

Real unifications, each with its old heads deleted in this build: three continuation captures →
one (N2); `imprintSignature` + `imprintDeed` → `imprintFromTrope` (N13); combat's own witness loop
(`roomBelievers`) → the accountability row's witnesses (D8); hand-written readings → tropes.

**C3 — generic names:** `Exercise` (named for advancement's evidence, D32) · `occurrences()`
(a row describing itself) · none found that hides a duplicate. ⚠ **The word *beat* means three
things:** the narrative beat (this build), the dialogue node's `beat:` line text, and combat's /
behavior's tick (`BehaviorBeat`). The `assert` effect sits on a dialogue node whose text key is
`beat:` — a reader will trip. **Kept** (the narrative meaning is the right one and the slate's
vocabulary); help and the `beat` kind's header say which beat, and the vocabulary collision is
logged for the dialogue format's next pass.

**C4 — look-alikes:** `TropeCatalogue` + `BeatCatalogue` (two document catalogues, two kinds —
intended: different pens, slate § 4) · `ExerciseActivity` beside `DurativeActivity` (two engagement
protocols — intended: one says what the engagement *is*, the other how it *runs*) · detected beats
(code) vs asserted beats (rows) — intended, the pen split.

**C5 — deliberate divergence:** `yielded` / `spared` land in the harm ledger rather than a new
fight ledger (no new collection; it already holds `abandonment`) · the roster's readings live in a
pack, not beside the kernel's mechanism (the Nazi test) · `NarrativeApi` is new rather than folded
into `AccountabilityApi` or `RenownApi` (each owns one ledger; the matcher spans five).

**C6 — fault lines logged** (api-normalization-slate Part 8): Disciplines' home with the tech
tree; `NarrativeApi` as the quest layer's home; the two current-act reads; catalogue doors on
topical Apis.

## Plan-level decisions

### The actor and the cause (wave 1)

**D1 — The act id is the choice's id; the cause is the act it follows from.**
`getCurrentAct()` returns `{ actId, causeId }`: `actId` is the nearest frame's
`metadata.actId ?? metadata.causingCommandId`; `causeId` is the next *different* one further up the
stack, else the replanted `metadata.causeId`, else `null`. So:
- a typed command's `actId` is its `commandId` (already planted, `CommandGiver.ts:1141`);
- a command dispatched from inside another act (a script, a forced command, an alias chain) is its
  own act whose `causeId` is the enclosing act;
- a brain's turn that dispatches no command gets `metadata.actId = SecurityApi.uuid()` planted in
  `Behaved` beside its `runAsSelf` (D25) — a separate key so NPC scenes do not start carrying a
  `commandId` nobody issued;
- ⭐ **a deferred continuation keeps the originating `actId`** — it is not a new act. The forge
  finishing three hours later writes rows with the same `actId` as the command that started it.
  That is requirements goal 1 (*"a finished engagement is the end of the act begun at the
  choice"*) and drive step 15.
Field names on every row: **`actId: string`** (`''` when the work is a named system's and no act
exists) and **`causeId: string | null`**.

**D2 — One continuation capture.** `captureContinuation(): ContinuationClaim` = `{ actor:
ActorClaim, actId, causeId, author }`; `runAsContinuation(claim, fn)` replants all four on one
pushed frame. `ScheduleApi` (`captureAttribution` / `planRunInner`), `SchedulerRegistry`
(`causingAuthors` + `causingActors` → one `continuations` map; `continuationMetadata` deleted) and
`WorldClockRegistry` (`s.actor` → `s.continuation`) all use it. `captureActor` / `runAsCaptured`
are deleted once their callers move (grep first; a caller that only wanted the actor still takes
the whole claim). This is what gives an engagement's completion its cause.

**D3 — No work starts anonymous: `acting` is a required field.** `RunRootOpts` gains
`acting: { actor: unknown } | { system: string } | { continuation: ContinuationClaim }`, required
by type. `runRoot` / `runRootGuarded` plant it on the root's metadata and throw `SecurityError`
when the claim is empty (a continuation whose actor and system are both null, an empty system
name). `ScheduleOptions` with `propagateAttribution: false` and no `system` throws at schedule
time. Each of the ~60 sites states its claim: the socket boundary and `executeAsyncBody` name the
avatar / giver; relay readers, `Backend`, `TestHooks`, `test-harness`, `PersistableLogic`,
`MqlSubscriptionRegistry`, `record`, `access`, the two `null`-target reads and
`SchedulerRegistry`'s `hostDestroyed` name a system (`'backend'`, `'twitch-relay'`,
`'test-harness'`, `'persistence'`, `'subscription'`, `'wiki-read'`, `'scheduler'`, …);
`SandboxLogic`'s 13 name the crossing avatar or `'sandbox'` per site; `CmsSession` names the
session's avatar. ⭐ **How siblings are caught:** the field is required, so a branch that adds a
`runRoot` without it fails `tsc` on its catch-up merge of master (organism-biology's 5 sites →
`{ system: 'test-harness' }`; stream-arrival's 1 → `{ actor: body }`). The runtime throw is the
backstop for a JS-level bypass. To verify in this wave, per slate § 3.7: prompt resume, a reaction
fired by a message, the REST/CMS boundary — each gets a unit test asserting `getActor()` or
`actingSystem()` is non-null inside.

**D4 — In-fiction acts resolve the actor.** `resolveInflicter` (`ConditionLogic.ts:194`),
`Vitals.ts:3896`, `ChattelLogic.ts:257/:314` and `ChattelRegistry.actingAuthorPath` (:178) read
`getActor()` and key the person by `getIdentityPath()`. `api/condition.ts:34`'s doc comment is
corrected. The other 40 `getActingAuthor` sites are **not** swept (labor plane, or outside the
requirements' three named defects) — see Risks R6.

**D5 — What each ledger row gains.**

| ledger | new fields | stamped by |
|---|---|---|
| `bank_ledger` | `actId`, `causeId`, `fromParty`, `toParty`, `heldBefore` | `postTransaction` |
| `chattel_events` | `actId`, `causeId`, `basis`, `txId`; `actor` fixed (D4) | `ChattelRegistry.appendEvent` |
| `contract_events` | `actId`, `causeId` | `ContractLogic.appendEvent` |
| `accountability_events` | `actId`, `causeId`, `witnesses: string[]`; kinds `yielded`, `spared` | `AccountabilityLogic.record` |
| `transcripts` | `actId`, `causeId`, `definition`, `counterparty`, `ending`, `beat` | `buildAndSave` |
| `disposition_events` | `trope`, `actId` | `imprintFromTrope` |
| `renown_events` | none — `signal.trope`, `signal.actId` ride the existing free `signal` object | the matcher |
| `chronicles` | none — tag `trope:<key>` and `key` ride existing fields | the matcher |

Each `packages/server/src/schema/<collection>.yaml` gets the fields described; `pnpm gen:schema`
after. **No new index in this build** — the look-backs build 1 runs are served by the indexes
that exist (`transcripts {owner}`, `contract_events {contractId}`, `accountability_events
{sessionId}`, `disposition_events {owner}`); an `{ actId }` index waits for build 2's author
surfaces, the first reader that would use it. A breach by lazy expiry stamps `actId` = the
`claimed` row's `actId` (the promise is the act; the lapse is its end), read from the contract's
own events.

**D6 — People, not accounts.** `fromParty` / `toParty` are each account's recorded owner key,
read from the warmed registry cache (a new `AccountBalance.cachedOwner(accountId)` beside
`cachedCurrency`; no await on the posting path, the existing rule). A sentinel or escrow account
has party `''`. A party is a person's identity path **or an institution's path** — the blood bank
is a cast member in two roster tropes, so a role may be filled by an institution. `heldBefore` is
the paying account's balance the floor check already read; with `amount` it is the *share of what
the chooser held* (slate § 3.8). The kernel records both; the trope picks.

**D7 — A chattel transfer states its basis; `give` passes title.** `transferChattel(newOwner,
basis)` — `basis` required: `{ kind: 'unrequited' } | { kind: 'sale', txId } | { kind: 'terms',
ref } | { kind: 'restored' }`, stored as `basis` + `txId` on the event. The 7 callers each state
the fact they already hold (shelf and stock sales → `sale` with the money leg's `txId`; a
consignment reclaim and a loan's return → `restored`; a tract's crop to its operator and stock
taken into a business → `terms`; `title transfer` and `give` → `unrequited`). A row therefore says
gift or sale **by itself**, which is what lets a trope look back at it after a restart.
⭐ `GiveController` gains one step: after the move, when the giver is the good's stamped owner,
`item.transferChattel(recipient, { kind: 'unrequited' })`. A giver who is not the owner hands over
custody only, as today, and no `give` beat exists. ⭐ **An option, not an imposed choice (review
question P15; the owner, 2026-11-28):** `give` gains **`--lend`** — hand it over and keep title
(custody only, no `give` beat). **Passing title is the default** (the owner). The view gains the
option; `give`'s help says both (P9).

**D8 — Witnesses are captured by the harm ledger's writer, before the row saves (wave 1).**
`AccountabilityLogic.record` — the one writer — computes them synchronously as it builds the row:
the row's harmer (`killer`, else `initiator`) is resolved to its live body by identity; every
sensor in that body's place (`MessageApi.getSensors(place)`) for whom
`PerceptionApi.perceives(viewer, harmer)` holds, minus the row's own parties, is a witness — the
rule every surface already uses, so light and concealment decide it. Stored as `witnesses`
(identity paths) on the row. A row with no live harmer (an environmental death) has `[]`.
The matcher (W3) only **reads** `witnesses` off the occurrence; it computes nothing, so a
look-back after a restart sees the same audience. Other ledgers get no witnesses column: no
build-1 trope reads one there, and build 2's derived regard puts each witness's memory in their
own belief store. `roomBelievers` in `CombatLogic` stays until **W4**, where the regard loop that
uses it is deleted.

### The exercise record (wave 2)

**D9 — The credit call takes a `Exercise`, which only a definition can make.**
`Exercise` (`S/lib/advancement/Exercise.ts`) is a frozen value: `{ definition: string (the
row's path), lines: CreditLine[], beat: 'work' | 'aid' }`, where `CreditLine` is
`Omit<Subcheck, 'outcome'>` — the authored half of what `ActSignature` already carries, not a
second shape (P12). It is built in exactly one place: **`DisciplineCatalogue.exerciseFrom(path,
data)`**, an instance method on the existing catalogue singleton
(`/platform/idea/DisciplineCatalogue`, which already stands at boot as `CraftingApi`'s declared
need, `S/api/crafting.ts:564`; reached through a new door **`CraftingApi.disciplines()`** (D30), the
`CraftingApi.joints()` shape — an Api static, so a pack's setter never looks a singleton up by
path), which also refuses a discipline key no row
defines. A catalogue's `parse` or a row class's setter calls it with the row's own data; nothing
else constructs one. No static is added, so `lint:lib-statics` (334) does not move — caller
audit: the callers are the four definition families below, each a parse or a setter.
A definition exposes its credit: `Recipe.getExercise()`, `JointDescriptor.credit`,
`OperationDescriptor.credit`, `Gather.getExercise()`. `AdvancementMixin.recordExercise(credit,
{ outcome, difficulty?, counterparty?, ending? })` turns the lines into `Subcheck`s and writes
through the existing `creditSignatureImpl`, adding `definition`, `counterparty` (identity path),
`ending` and `beat` to the row(s). `ActSignature` survives only as `creditSignature`'s legacy
parameter until the sweep. Build 1 moves:
- **recipes** (`recordCraftEvidence`) and **joints** (the `fit` credit in `CraftingLogic`);
- **rope** — `Rope.ts:798/:1126`, `RopeJack.ts:349` → the knot row's credit. Knot rows get
  `competence: { discipline: ropework, band: untrained }` — the band is the gate's floor, so
  nothing is newly refused — and a new optional joint field `difficulty` (reef knot `easy`,
  splice `standard`; default `standard`, today's values);
- **medicine** — all 9 sites → an operation row. Operation rows gain **`act`**
  (`operate` by default; `suture`, `set`, `bleed`, `transfuse`, `prescribe`, `test`), and
  `OperationCatalogue` gains `forAct(act)`. ⭐ `OperateController` reads
  `operations().forAct('operate')` (and `named` within it) instead of `all()`, so the new rows
  for suturing, setting, prescribing and testing are **never offered by `operate`**; each of
  those controllers `ensure`s its own row. W2 has a test that `operate` lists exactly the five
  rows it lists today;
- **glass** — ⭐ the definition is **the gather's own row** (`…/trade/glass/thing/gather.yaml`
  gains `exercises: { discipline: glasswork, difficulty: hard }`, read by a `Gather` setter). It
  exists from the first dip, so a gather that chills as a `gather` or a `bubble` still has a
  credit, and the failure and the later success share one `definition` — which is what *Seeing
  It Through*'s `same: [definition]` needs. **This is the one `hard` row** drive step 8 uses
  (hot glass was `standard` in code; raising it is a stated change to glass's evidence weight).
  `Gather.ts:280/:353` credit from it. `Blowpipe.formingDiscipline()` stops hard-coding
  `glasswork` and reads a `discipline` field authored on `blowpipe.yaml`. The shared
  `FormCatalogue` and the form rows are **not** touched.
- A row that names no discipline yields no `Exercise` and credits nothing (today's behavior for
  an undisciplined recipe).

**D10 — Failure is credited; abandonment is recorded, by the scheduler, when the actor's own act
ended the work.** Failure: every moved site passes its real outcome (`Set`'s computed outcome,
the chilled gather's `failure`); nothing invents a failure where the model has none.
Abandonment: an engagement that is work implements `ExerciseActivity` — `workCredit(): Exercise |
null` and `workCounterparty(): Stuff | null` — narrowed by `isExerciseActivity(e)`, an **unexported
function in `SchedulerRegistry.ts`** beside `isDurativeActivity`. `SchedulerRegistry.terminate`
records one transcript row with `ending: 'abandoned'` when **the one acting as it ends is the
engagement's own actor** (`ExecutionContextApi.getActor() === e.actor`, the wave-1 read) — for
any abort reason: the player's cancel, a replacing act, ⭐ **and `preconditions-changed` when
their own act broke the preconditions (walking off)**. It records nothing when someone else or a
named system ended it (barged out, harmed, the host destroyed, a sweep, a throw) — that is
fortune, build 2's `befall`. The row carries the engagement's originating `actId` (D2) and, as
`causeId`, the act that ended it. ⚠ Verify in W2 that leaving the place actually ends a craft
build today; if it does not, the engagement is missing a precondition (its host), which is fixed
on the engagement — never by a tropes special case. Implementers in build 1: the craft build
engagement, the medicine engaged acts (bleed, transfuse, operate), and the glass gather's working
window if it is an engagement (else `Gather` records it where the hot gather is left). An
`abandoned` row is **excluded from the competence fold** at the one mapping from rows to
evidence — recorded, not credited.

**D11 — The counterparty is on the row; care is a beat the definition names.** `counterparty` is
the identity path of the person or animal worked on or for (a patient; later a customer). A
definition whose act relieves another's harm says `beat: aid` in its credit (the operation rows
do); everything else is `attempt`. The transcript row keeps it, so `TranscriptEntry.occurrences()`
needs nothing else.

**D12 — Difficulty: the row's default, a model's measurement over it.** `recordExercise`'s optional
`difficulty` is the override; a site passes it only when it measures one (a wound's severity in
`Set`). A site with no measurement passes none and gets the authored value.

### Beats and the matcher (wave 3)

**D13 — A beat is derived from a ledger row, by the row.** `BeatSource { occurrences():
BeatOccurrence[] }` is implemented by `LedgerEntry`, `ChattelEvent`, `ContractEvent`,
`AccountabilityEvent` and `TranscriptEntry` — pure computation over the row's own fields. The
same function serves live detection (called on the row just written) and look-back (called on
rows read from the ledger), so the two can never disagree and nothing depends on memory.
A `BeatOccurrence` is `{ beat, roles: Record<string, party>, params, price, witnesses, actId,
causeId, at, where, durable }`. A `where:` value may end in `+` — *this or anything above it in
the parameter's own ordered vocabulary* (`DIFFICULTIES`, `OUTCOMES`): `hard+` is hard or
formidable, `success+` is success or critical. No other operator exists in build 1.

| beat | roles | derived from | params |
|---|---|---|---|
| `attempt` | worker · *for* | a transcript row, `beat: attempt` | `definition`, `discipline`, `difficulty`, `outcome`, `ending` |
| `aid` | helper · helped | a transcript row, `beat: aid`, with a counterparty | same |
| `give` | giver · receiver | a chattel `transfer` with `basis: unrequited` whose actor is the from-party; a bank leg of category `transfer` between two different non-empty parties | `what` (`goods` / `money` / `blood`), `amount`, `share`, `receiverNeed` |
| `exchange` | the parties | a chattel `transfer` with `basis: sale`; a bank leg of category `sales` | `amount` |
| `harm` | harmer · harmed | accountability `opened` / `harm` | `consented`, `lethality`, `sentient` |
| `kill` | killer · killed | accountability `death` with a killer | `consented`, `lethality`, `sentient` |
| `yield` | yielder · victor | accountability `yielded` (new; written at `CombatLogic.ts:353`) | `sessionId` |
| `spare` | sparer · spared | accountability `spared` (new; written where the stroke is declined or lapses, `CombatLogic.ts:5335`) | `sessionId` |
| `promise` | promiser · promisee | contract event `claimed` | `contractId` |
| `keep` · `break` | promiser · promisee | contract events `fulfilled` · `breached` | `contractId` |
| `abandon` | abandoner · charge | accountability `abandonment` (the ship's producer) | `sessionId` |
| `provide` | provider · provided | **not durable** — `Bonded`'s feed and pet paths | `kind` (`food` / `comfort`), `need`, `sickened` |
| `tell` | teller · told | **not durable** — `BeliefStore.learnIdentityOf`, when a name is given and the one acting is the subject (someone telling a listener who they are); recognition (`name: null`) and a namer naming an animal are not a `tell` | `what: identity` |
| asserted | per its row | **not durable** — the dialogue `assert` effect | `degree` |

The vocabulary (`DETECTED_BEATS`, each with its roles and whether it is durable) is a const in
`lib/narrative/Beat.ts`. The build verifies each mapping against the writer (the exact
`category` a bare `pay` posts; whether a yield under lethal terms opens the finishing window —
Risks R4).

**D29 — The detected-beat vocabulary is public contract (the owner, 2026-11-28).** Acts and beats are
the Standard Model's measurement surface for the Compact (standard-model.md § *the Compact's
measurement contract*; measurement.md A17/A18, proposed). `lib/narrative/Beat.ts` therefore carries
a **version** and its header says so; a test pins the closed list, so adding, removing or redefining
a detected beat fails until the vocabulary's version is bumped in the same change. The build adds
exactly the D13 list and no other.

**D30 — The Discipline catalogue's door is `CraftingApi.disciplines()`, for now (the owner,
2026-11-28).** No new Api for one method. `AdvancementApi` was retired by the Api OO sweep —
advancement lives on `AdvancementMixin` — and `CraftingApi` already declares the catalogue in its
`needs`, so the door goes beside what it already stands. Disciplines want a real home with the
**tech tree**, which will be something other than advancement; logged in api-normalization-slate
Part 8.

**D32 — Exercise, not work or credit (the owner, 2026-11-28).** *Work* already means the labor market
(the `work` command category, `job`, employment) and sits beside the labor plane; *credit* means money
owed (credit.md) and provenance's credit routing, and implies a reward. What the record holds is
advancement's own idea — **evidence that a Discipline was exercised**. So: a definition row's field
`exercises:`; value class `Exercise`; `AdvancementMixin.recordExercise(exercise, outcome)`; engagement
protocol `ExerciseActivity`; the beat `attempt` (succeeded · failed · abandoned); the gate
`lint:discipline-by-name`. Where older prose in this plan still says a definition's *credit*, read
*what it exercises*; the code uses the D32 names only.

**D31 — `NarrativeApi` keeps its name.** The kernel side is descriptive and narrative; the pack is
`morality-commons` because the roster is prescriptive. The quest layer, the next rung up the
narrative ladder, lands beside the trope matcher in the same Api.

**D33 — Reactions and combat narration converge on the act id (C1).** After W1 a reaction's
`inReactionTo` is the act's `actId`; `CombatNarration` reacts to the act it narrates instead of
minting a fresh command id. W1, with a test that a reaction to a combat beat aggregates on the
attack's act.

**D14 — Three beats are not durable in build 1, and the catalogue refuses to look back at them.**
`provide`, `tell` and asserted beats have no ledger; each is handed to the matcher by its one
kernel site and exists for that act only. A trope may **close** on one (every build-1 use does);
`TropeCatalogue.parse` refuses a trope that names one in an earlier plot step — loudly, at
install. Their durable home is build 2's incident memory in the listener's belief store (slate
§ 3.6) — Deferred seams.

**D15 — The matcher runs when a row is written, called by the row's writer.** After its row
saves, each of the five writers calls `NarrativeApi.occurred(...row.occurrences())`; the three
non-durable sites call `NarrativeApi.occurred(occurrence)`. `occurred` is gated
(`@CallSecurity(FromModule(...))` naming exactly those eight modules — `BankingLogic`,
`ChattelRegistry`, `ContractLogic`, `AccountabilityLogic`, `Advancement`, `Bonded`,
`BeliefStore`, `DialogueConversation` — plus `DonationBank`, D26), so feature and pack code
cannot fire a beat. ⛔ **No controller is on the list** (P5): an introduction's `tell` comes
from the listener's own `learnIdentityOf`, a pet's `provide` from the animal's own method. No bus, no end-of-root hook: because a row says what it is by itself (D7),
nothing has to wait for the rest of the act. `NarrativeLogic.occurredImpl`, per occurrence:
1. `TropeCatalogue.closingOn(beat)` — the tropes whose last plot step is this beat. The catalogue
   loads `whole` on its first ask; **with no roster installed it is empty and the matcher
   returns** — that is the whole of *"pack absent ⇒ nothing characterizes"*.
2. Bind the closing step's roles and check its `where` params.
3. Earlier steps and `never` steps: look back (D16).
4. Cast conditions (closed list in build 1: `person`, `animal`, `institution`, `stranger-to:
   <role>` — the role-filler holds no belief record of the other).
5. Repetition factor (D17); apply the writes (D18); keep the telling (D19).
Failures inside the matcher never break the act that fired it: `occurred` returns a promise the
writer does not await for its own result, and a throw is recorded through `DiagnosticApi` (the
schedule guard's policy), never swallowed.

**D16 — Look-back is a ledger query by person.** For an earlier step the matcher reads that
beat's ledger through the row class's inherited `Document.find` (the read `Advancement` already
uses):

| earlier beat | read |
|---|---|
| `attempt`, `aid` | `TranscriptEntry.find({ owner: <person>, definition: <same> })` — the `{ owner }` index |
| `promise` | `ContractEvent.findByContractId(<same contractId>)` |
| `harm`, `yield` | `AccountabilityEvent.find({ sessionId: <same> })` |

It maps the rows through `occurrences()` and keeps those matching the step's `where`, its `same:`
link to the closing occurrence (`definition`, `contractId`, `sessionId`, `counterparty`) and its
`within:` window (game seconds). Nothing is cached, nothing is a cursor, a restart loses
nothing. Circle scope: the queries apply the same scope filter the ledgers' existing readers do.

**D17 — Repetition diminishes by reading the trope's own past trait rows.** A trope row may
carry `repeat: { window, falloff, per?: <role> }`. The factor is `falloff ^ n`, where `n` counts
the chooser's `disposition_events` rows with this `trope` inside the window
(`DispositionEntry.find({ owner, trope })`, the `{ owner }` index) — and, with `per`, only those
whose **`counterparty`** is the party filling that role now. `imprintFromTrope` therefore writes
`counterparty` on the row whenever the trope declares `repeat.per` (identity path; `''`
otherwise). The factor scales every write the firing makes. A trope that writes no trait cannot
diminish in build 1 (regard cannot cite); the catalogue refuses `repeat` on one.

**D18 — Writes go through the three existing doors and cite trope and act.**
- trait → `chooser.imprintFromTrope({ disposition, valence, trope, actId, counterparty })` (D23);
- regard → `holder.adjustRegard(subject, delta)` — unchanged, and **cannot cite** (the stated
  build-1 gap); for a `witnesses` role, one call per witness named on the occurrence (D8);
- renown → `RenownApi.append({ subject, source, kind: 'reaction', signal: { emote, trope,
  actId, tags } })` then the scheduled `RenownApi.recompute()` the blood gift used.
A role filled by something that keeps no such ledger (an institution, an `Extra`, a body with no
identity path) is skipped — those hosts already no-op, and the matcher does not narrow around
them.

**D19 — The telling is kept in the chronicle; it is said aloud only when surprising.** On
closing, each person in the cast who is a `Persona` gets a chronicle deed: text from the trope's
`telling` (Liquid over the role names and the occurrence's params, rendered by `ProseApi`), `who`
= the other cast members, `where`, tags `['trope:<key>']`, and a `key` when the row says so (via `recordChronicleOnce`). `telling.keep` has three values: `every` (the default — a line per
firing), `once` (one line per person, ever) and `once-per-other` (one line per person per
counterparty) so a petted dog is one line,
not fifty. **Rule 1:** the text never carries a number or a position. **Rule 2:** the chooser is
*told* at the time (one scene line to self, the same text) only when a trait write runs against
the grain — the write's sign opposes the sign of the chooser's current position on that axis and
the axis is past its floor band (`traitPosition`). Otherwise the chronicle is the only surface.
`traits`, `standing`, `competence`, `profile` are unchanged.

**D20 — Module taxonomy.** Every file fits an existing category:

| file | category |
|---|---|
| `S/lib/narrative/Beat.ts` | named vocabulary + value object (new subsystem folder `narrative`) |
| `S/lib/narrative/Trope.ts` | value class over a document |
| `S/lib/advancement/Exercise.ts` | value class |
| `S/platform/idea/TropeCatalogue.ts`, `BeatCatalogue.ts` | catalogue singletons (the `DocumentCatalogue` family) |
| `S/api/narrative.ts` | Api — forwarding shell, ends `SecurityApi.decorateApiClass` |
| `S/platform/idea/api/NarrativeLogic.ts` | Api logic singleton at `/platform/idea/api/narrative` |
| `C/platform/content/kinds/trope.yaml`, `beat.yaml` | kind declarations |
| `packages/server/scripts/check-characterization.ts`, `check-discipline-by-name.ts`, `check-tropes.ts` | lint scripts |

`NarrativeApi`'s surface: `occurred(...occurrences)`, `tropes()` (the catalogue door, the
`CraftingApi.joints()` shape), `beats()` (the asserted-beat catalogue door; the rows' own method is `occurrences()`). No free helper, no
new category, no `eslint-disable`. `NarrativeApi` declares `static needs` per the standing rule
(*no class readies its Api*).

**D21 — Content asserts a beat; the row says who is who.** A `beat` document:
`{ key, title, roles: [speaker, listener], description }`, `keyworded: { unique: true }`. Its key
may not be a detected beat's name (`BeatCatalogue.parse` refuses). The dialogue effect is
`{ verb: assert, beat: honor, degree?: slight | plain | great }` — the player is `speaker`, the
NPC `listener`. `DialogueConversation.applyEffects` resolves the key through
`NarrativeApi.beats().byWord(key)`: found → `occurred`; **not found → a stated skip**: nothing is
written and one `MudlogApi` line is logged per beat key per boot (*asserted beat 'honor' has no
row — no morality pack installed*), so an operator can see why nothing characterizes (P3; `lint:tropes` catches a typo at build
time by checking every `assert` in content against the beat rows shipped anywhere in the repo).
Terminus therefore does not `requires:` the roster.

### The roster pack (wave 4)

**D22 — Pack `morality-commons`, root `/morality`, content only.** `C/morality-commons/`
(`pack.yaml`, `package.json`, `README.md`, `content/tropes/*.yaml`, `content/beats/*.yaml`; no
`src/`), on the "what is written down" axis like `/expression`. Documents land at
`/morality/tropes/<key>` and `/morality/beats/<key>`. ⛔ No pack lists it in `requires:` and
`lint:tropes` enforces that. It is in the default boot union; a world without it is a world
whose `SAXONBERG_PACKS` / `declareFile({ packs })` omits it. The root name, the pack id and its
title holder are the owner's to confirm — Risks R2.

The trope row (build-1 shape):

```yaml
key: seeing-it-through
title: Seeing It Through
cast:
  worker: { is: person }
plot:
  - beat: attempt
    roles: { worker: worker }
    where: { difficulty: hard+, outcome: failure }
  - beat: attempt
    roles: { worker: worker }
    where: { outcome: success+ }          # success or critical (D13)
    same: [definition]
    within: 2592000          # game seconds
writes:
  - { to: worker, trait: patience, valence: 2 }
  - { to: worker, trait: diligence, valence: 2 }
telling:
  text: "{{ worker }} failed at a piece of work, and went back to it until it came right."
  keep: every                             # telling variables are the cast's role names only
repeat: { window: 2592000, falloff: 0.5 }
reference: "ours"
```

The 18 rows and what each replaces, with today's sizes as the starting dials:

| row | closes on | writes (starting values) |
|---|---|---|
| `the-gift-blood` | `give` `what: blood` | giver generosity +2; renown `applaud` from the receiver |
| `answering-the-call` | `give` `what: blood`, `receiverNeed: short` | giver compassion +2 |
| `the-gift` | `give` `what: goods \| money`, receiver a person | giver generosity; receiver regard for giver (new — small) |
| `murder-in-plain-sight` | `kill`, `consented: false`, `sentient: true` | killer compassion − (new); witnesses regard −20 |
| `the-fair-fight` | `yield`, after consented `harm` in the same session | victor boldness (new); witnesses regard +2 |
| `sparing-the-yielded` | `spare`, after `yield` in the same session | victor forgiveness, compassion (new) |
| `the-broken-promise` | `break`, after `promise` on the same contract | promiser constancy − (new); promisee regard −15 |
| `the-word-kept` | `keep`, after `promise` | promiser constancy; promisee regard + (new) |
| `seeing-it-through` | above | patience, diligence |
| `walking-off-the-job` | `attempt`, `ending: abandoned` | patience −, diligence − |
| `tending-the-stranger` | `aid`, helped `stranger-to: helper` | helper compassion; helped regard + |
| `abandoning-ship` | `abandon` | master compassion −, constancy −; those aboard regard − |
| `pet-the-dog` | `provide` `kind: comfort`, provided an animal | carer warmth; animal regard +6; `repeat.per: animal`; `keep: once-per-other` |
| `the-bad-meal` | `provide` `kind: food`, `sickened: true` | animal regard −25; no trait |
| `making-an-acquaintance` | `tell` `what: identity` | told regard +1. ⭐ Kept on the roster (ruled): this is **not** a lounge dependency — without the pack the lounge loses a +1 per introduction, and Dave's `warm` branch is still reachable by his own dialogue numbers, which this build does not touch |
| `the-confession` | asserted `confess` | listener regard; speaker honesty |
| `the-slight` | asserted `slight` | listener regard − |
| `the-courtesy` | asserted `honor` | listener regard by `degree` (+1 / +2 / +10) |

Beat rows: `confess`, `slight`, `honor`.

**D23 — One door into the trait ledger.** `DispositionedMixin.imprintFromTrope(write)` —
`@CallSecurity(FromModule('/platform/idea/api/NarrativeLogic'))`, `@Final`, `@Unshadowable` —
replaces `imprintSignature` and `imprintDeed`, which are deleted with the `creditSignature` graft
(`Advancement.ts:525–540`), `ActSignature.dispositionValence` and `DispositionSubcheck`'s export
from advancement (the type moves into `lib/trait`). `seedTraitClaims` (the authored dossier) is a
different door and stays. trait.md and advancement.md lose "one signature, two outputs".

**D25 — NPCs are characterized like anyone.** `Behaved` (:246, :863) already runs a brain as
itself; this build adds the `actId` plant (D1) there and nowhere else. `DonationBank`'s
players-only guard (`isHasInteractive`, :386) is deleted (in W3, with D26) — who is characterized is decided by who
keeps a ledger (D18), not by the site. An NPC with no identity path writes nothing, as today.

**D26 — The blood gift's facts.** `DonationBank` hands the matcher one `give` occurrence when a
donor gives **their own** unit: `{ giver: donor, receiver: the bank's business, what: blood,
receiverNeed: wasShort ? 'short' : 'none' }`. It is the ninth gated caller of `occurred`, because
whether the lot was short is a fact only the bank holds at that moment. `creditGift` and both
`Blood.ts` constants are deleted **in W3**, in the same commit that deletes
`dispositionValence` — its only user — so every wave compiles. (If the unit's entry into the bank already writes a chattel
transfer, use that row and pass `receiverNeed` on it instead — verify first.)

**D27 — Two regard writes stay in code, named.** (a) The `regard` dialogue effect
(`DialogueConversation.ts:383`) — the lounge cast and Katie are not touched. (b) The **positive**
hand-feed (`Bonded.ts:850`, need-weighted): the requirements keep *"the bond's own mechanics"*,
the bond is regard × handling, and with it moved to a trope no animal could ever be bonded in a
world without the roster. Only the sickening branch moves (*The Bad Meal*), and petting's +6
(*Pet the Dog*) as the requirements say. ⚠ So the regard ceiling is **2 named sites, not 0** —
Risks R3.

### The ratchet (wave 5)

**D24 — Three gates.**
- **`lint:characterization`** (`check-characterization.ts`) — counts, across the kernel tree and
  every pack `src/` (`scripts/pack-roots.ts`): calls to `.imprintFromTrope(` outside
  `NarrativeLogic` (**ceiling 0**); `RenownApi.append(` outside `NarrativeLogic`, `RenownLogic`
  and `TestHarnessLogic` (**0**); `.adjustRegard(` / `.setRegard(` outside `NarrativeLogic` and
  `BeliefStore` itself (**ceiling 2**, the two files of D27, named in the script with the build
  that retires each); and, as data, `verb: regard` effects in content rows (**ceiling 16** —
  the lounge's 15 and Katie's 1; may only fall).
- **`lint:discipline-by-name`** (`check-discipline-by-name.ts`) — three checks, by the TypeScript AST
  (not a regex): (1) the count of `.creditDeed(` and `.creditSignature(` call sites (**ceiling =
  the count after wave 2**, about 108 minus the ~20 moved; may only fall) — a count of calls, so
  a signature built in a `const` and passed through is still counted; (2) `new Exercise(`
  outside `DisciplineCatalogue` (**0**); (3) every `.exerciseFrom(path, data)` call: `data` must not
  be an object literal, **nor an identifier whose declaration in that file is initialized from
  an object literal** (the `const x = {…}` pass-through), nor a spread of one — it must trace to
  a parameter or a field (the row's data). The set of files calling `exerciseFrom` is listed in the
  script with a ceiling (4 after W2); a new one is a new definition family, reviewed.
- **`lint:tropes`** (`check-tropes.ts`) — every trope and beat document in the repo parses
  (through the catalogues' `parse`, read off disk as the installer does); every `assert` effect
  names a shipped beat; no `pack.yaml` `requires:` names `morality-commons`.
A ceiling here rises only by the lint family's rule: a caller audit, never a quotation.

**D28 — The drive is four files.** See Test & gate strategy.

---

## ⭐⭐ Host placement

| new thing | host | what composing it claims about everything else on that host | verdict |
|---|---|---|---|
| `acting` | every `runRoot` | every root is started by someone or something — the rule itself | meant by every host |
| `actId`, `causeId` | the five ledger rows | every row of these ledgers records an act or a named system's work | true of all; `''` only for system work, which is honest, not a "no" |
| `fromParty`, `toParty` | `LedgerEntry` | every leg has two ends that are owned accounts or sentinels | sentinel legs carry `''` — a minority (mint, drain, cash bridge) |
| `heldBefore` | `LedgerEntry` | every paying leg has a balance before | `0`/absent on sentinel-paid legs only |
| `basis`, `txId` | `ChattelEvent` | every **transfer** has a basis | meaningless on `mint` / `released` — stored only on `transfer` rows; the field is optional by kind, not defaulted |
| `witnesses` | `AccountabilityEvent` only | every harm row had an audience (possibly empty) | ✅ — and deliberately **not** on bank, chattel, contract or transcript rows, where nearly every row would answer "nobody read this" (the P2 quiet form) |
| kinds `yielded`, `spared` | `AccountabilityKind` | the ledger records how a fight ended, not only harm | it already holds `abandonment`; `deriveBlame` reads only `death` / `harm`, so the new kinds are inert there — verify the other readers |
| `definition`, `ending`, `beat` | `TranscriptEntry` | every evidence row came from some definition | rows from un-moved sites carry `''` until the sweep — a falling count the ratchet measures, not a permanent "no" |
| `counterparty` | `TranscriptEntry` | some work is done on or for someone | ⚠ most rows (solitary work) will be empty. It stays here because the slate rules it (§ 3.5, *the exercise record carries its counterparty*) and the alternative is a new care ledger, which is forbidden. Recorded as a known quiet-form answer |
| `trope`, `actId` | `DispositionEntry` | every trait row was written by a trope | true of every `deed` after this build; `claim` rows (dossier seeds) carry `''` |
| `counterparty` | `DispositionEntry` | some trait writes were toward someone | written only when the trope declares `repeat.per`; most rows carry `''`. Accepted: it is the only readable source for per-other repetition, and the alternative (the chronicle `key`) has no window |
| `act` | operation rows | every operation is performed by some verb | defaults to `operate`; five of the rows are |
| `credit` | the `gather` thing row | a gather is worked from its first dip | one row |
| `recordExercise` | `AdvancementMixin` (on `Character`) | everyone who can advance can be credited from a definition | same host set as `creditDeed` |
| `imprintFromTrope` | `DispositionedMixin` (on `Character`) | same hosts as the methods it replaces | no change |
| `ExerciseActivity` | an engagement class, opt-in | only work engagements implement it | no guard, no default: a combat or dialogue engagement simply is not one |
| `occurrences()` | the five row classes | each ledger's rows can describe themselves | a row that is no beat returns `[]` — e.g. an escrow hold. Honest: most bank legs are not gifts, but every one is asked once at write time and the function is three comparisons |
| `Trope`, asserted `Beat` | documents | — | P10 |
| `TropeCatalogue`, `BeatCatalogue`, `NarrativeLogic` | kernel singletons | the kernel holds mechanism and no reading | with no rows installed they hold nothing |

No new mixin is introduced, so no mixin's host set changes. No guard re-narrows a host anywhere
in this plan; if a wave finds itself writing `if (isX(owner))` around a new field, it stops and
re-plans (B1).

---

## Convention conformance

- **`props:` / `cast:`** — the only world rows touched are two agents' dialogue (clerk, officer)
  and scaffold rows in `test-fixtures`; no `populates:`, no `container:`.
- **Places, not rooms** — no new place. Step 18 looks at four existing ones.
- **`<root>/<branch>/`** — no new class in a pack. The roster pack ships documents only, under
  `/morality/<shipped dir>/`. Kernel files follow D20.
- **Module scope declares** — no executable statement at module scope; `NarrativeApi` ends with
  the sanctioned `decorateApiClass`.
- **Import boundary** — `lib/narrative/*` imports nothing outside `src/mud`; row classes import
  only `lib/narrative/Beat` types. Trade packs touched (cordage, medicine, glass) import the
  kernel by package specifier only.
- **Verbs on objects** — writes are the host's own methods (`recordExercise`, `imprintFromTrope`,
  `adjustRegard`); `NarrativeApi.occurred` takes occurrences, never a world object as its first
  parameter (`lint:object-verbs`).
- **P3 refuse / skip / throw** — a trope that cannot be read is a `TypeError` at install; an
  unknown asserted beat is a build failure (`lint:tropes`) and a stated skip at runtime only when
  no roster is installed; a role-filler with no ledger is a skip by the ledger's own rule; an
  empty `acting` throws; a matcher failure is a recorded diagnostic.
- **P4 no duck typing** — `BeatSource`, `ExerciseActivity` and `Exercise` are declared kernel
  types; packs name them by import. No `?.()` on an undeclared name.
- **P5 the mixin decides** — controllers lose their constants and gain nothing: `PetController`,
  `IntroduceController`, `GiveController` call the object and render. What an act means is
  decided in one place, the trope row.
- **P6 persistence per content** — nothing new persists by class. Rows are ledger rows; the
  matcher's witness cache is per-act memory and is never needed after a restart (D16).
- **P7 load on use** — `TropeCatalogue` loads `whole` on the first occurrence; `BeatCatalogue`
  by word on the first `assert`. No boot entry.
- **P8 names** — `Exercise` (what it is), `ExerciseActivity` (an interface; the `-ity` noun, not an
  adjective), `NarrativeApi` (the subsystem), `Trope`, `Beat`. The word *beat* collides in prose
  with dialogue's node text and combat's clock — Risks R9.
- **American English** throughout rows and help.
- **Lint gates this build must pass:** `lint:family` whole; specifically `lint:schema` (new
  fields documented, `gen:schema` run), `lint:document-kinds`, `lint:data-ideas` (no new data
  Idea), `lint:module-scope`, `lint:imports`, `lint:object-verbs`, `lint:lib-statics`,
  `lint:mixin-names` (none added), `lint:mixin-clusters` (`Advancement`, `Dispositioned`),
  `lint:instanceable`, `lint:view-keys` (no new view key), `lint:wire-content`,
  `lint:test-bootstrap`, `lint:bills` (joint rows), and the three new ones.

---

## Waves

Each wave ends at a commit, staged by name, pushed. `pnpm test:near` + the touched packs' vitest
+ `lint:family` gate each wave; `pnpm test` runs once at code-complete.

### W1 — the actor and the cause  (D1–D8)

**Goal:** every ledger row says who chose and because of what; no root starts anonymous.

1. `S/api/execution-context.ts`: `RunRootOpts.acting`; `ContinuationClaim`,
   `captureContinuation`, `runAsContinuation`, `getCurrentAct`; delete `captureActor` /
   `runAsCaptured` after step 2.
2. Move the three captures: `S/api/schedule.ts`, `S/platform/idea/SchedulerRegistry.ts`,
   `S/platform/idea/WorldClockRegistry.ts`.
3. State `acting` at every `runRoot` / `runRootGuarded` site (the Grounding list).
4. D4: `ConditionLogic.ts`, `Vitals.ts`, `ChattelLogic.ts`, `ChattelRegistry.ts`,
   `api/condition.ts` (comment).
5. D5/D6: row classes + `packages/server/src/schema/{bank_ledger,chattel_events,contract_events,
   accountability_events}.yaml`; `postTransaction`, `AccountBalance.cachedOwner`,
   `ChattelRegistry.appendEvent`, `ContractLogic.appendEvent`, `AccountabilityLogic.record`;
   `pnpm gen:schema`.
6. D7: `transferChattel(newOwner, basis)` and its 7 callers; `GiveController`; `give`'s help text
   in `C/platform/content/platform/cmd/inventory/give.yaml`.
7. `S/lib/behavior/Behaved.ts`: the `actId` plant (D25).

**Acceptance:** unit tests — a scheduled callback, a durative completion, an emission and a
world-clock callback each read the originating `actId` and actor; a nested command reads its
parent as `causeId`; `runRoot` with an empty claim throws; a bank leg between two players carries
both parties and `heldBefore`; a sale's chattel row carries `basis: sale` and the leg's `txId`,
a `give`'s `unrequited`; harm and death name `getActor()` under a forced NPC command (where
`getActingAuthor()` is null). **Commit:** `feat(tropes): W1 — the actor and the cause on every
ledger`.

### W2 — the exercise record  (D9–D12)

**Goal:** the credit call takes the act's definition; failure and abandonment are on the record.

1. `S/lib/advancement/Exercise.ts`; `TranscriptEntry` fields + `transcripts.yaml`;
   `AdvancementMixin.recordExercise`; the fold's row→evidence mapping skips `ending: abandoned`.
2. `S/lib/activity/Engaged.ts` (`ExerciseActivity`), `SchedulerRegistry.terminate`.
3. Definitions: `DisciplineCatalogue.exerciseFrom`; `Recipe.getExercise()`; `S/lib/craft/Joint.ts` +
   `JointCatalogue.parse` (`difficulty`, `credit`); `S/lib/vitals/Operation.ts` +
   `OperationCatalogue.parse` (`act`, `credit`) and `forAct`; `Gather`'s `credit` setter.
4. Sites: `recordCraftEvidence` and the `fit` credit in `CraftingLogic`; `Rope.ts:798/:1126`;
   `RopeJack.ts:349`; the nine medicine sites and `OperateController`'s `forAct('operate')`;
   `Gather.ts:280/:353`; `Blowpipe.formingDiscipline`.
5. Rows: knot joints in `C/platform/content/joints/`; operation rows in
   `C/trade-medicine/content/operations/` (new rows, each with its `act`, for suture, set, bleed,
   transfuse, prescribe, test); `credit` on `…/trade/glass/thing/gather.yaml`; `discipline` on
   `…/thing/blowpipe.yaml`. The form rows and `FormCatalogue` are untouched.

**Acceptance:** `competence` after tying a knot reads as before (drive 10); a gather that
chills while still a `gather` writes a `failure` row whose `definition` is the gather row, at
`hard`, and a later cracked-off piece writes a `success` row with the same `definition`;
`operate` offers exactly the rows it offers today; starting a craft build and **walking out**
writes an `abandoned` row with the starting command's `actId` and moves no band, while the same
build ended by another character's act writes none; a sutured patient is the row's `counterparty`.
`grep -rn "'ropework'\|'nursing'\|'medicine'"` in the moved files returns nothing. **Commit:**
`feat(tropes): W2 — credit named by the definition; failure and abandonment recorded`.

### W3 — beats and the matcher  (D13–D21, D23)

**Goal:** the mechanism, with no reading in it.

1. `S/lib/narrative/Beat.ts`, `Trope.ts`; `occurrences()` on the five row classes; the two new
   accountability kinds written in `CombatLogic.ts` (:353, :5335).
2. Kinds `trope`, `beat`; `TropeCatalogue`, `BeatCatalogue`.
3. `S/api/narrative.ts`, `S/platform/idea/api/NarrativeLogic.ts` (match, look-back,
   repetition, writes, telling — witnesses are read off the row, D8); the `occurred` call in each of the five writers.
4. `DispositionedMixin.imprintFromTrope`; `DispositionEntry` fields + `disposition_events.yaml`;
   delete `imprintSignature` / `imprintDeed`, the graft, `dispositionValence` — ⭐ **and, in the
   same commit, their only user:** `DonationBank.creditGift`, the players-only guard and both
   `Blood.ts` constants go, replaced by D26's `give` occurrence. Nothing else references the
   valence slot, so the wave compiles and its tests pass on its own.
5. `DialogueConversation`: the `assert` effect (the `regard` case stays) and its logged skip.
   `BeliefStore.learnIdentityOf`: the `tell` occurrence (the +1 in `IntroduceController` stays
   until W4, so introductions behave as today through W3).
6. Help: a `beats` concept topic and a `tropes` one (the vocabulary is public; lens 1).

**Acceptance (all with fixture trope documents `remember`ed in unit tests — no pack yet):** a
one-step trope fires and writes a trait row tagged with trope and act; a two-step trope completes
from rows written before a simulated restart (catalogue and matcher stood up fresh); a `never`
step blocks; repetition halves; a witness in the dark is not a witness; an against-grain write
tells the chooser and a with-grain one does not; with an empty catalogue every writer behaves
exactly as before. ⚠ W3 compiles and passes alone, but between W3 and W4 the blood gift writes
nothing (its writer is gone, its rows are W4's). Both waves are on one unmerged branch, so no
player sees the gap; W3's blood test asserts the occurrence is handed over, W4's that it lands.
**Commit:** `feat(tropes): W3 — beats, the matcher, asserted beats`.

### W4 — the roster pack  (D22, D25–D27)

**Goal:** today's characterization, as rows; the hand-written writers gone.

1. `C/morality-commons/` — 18 trope rows, 3 beat rows; register it in the workspace and the
   default pack union (`pnpm install` after adding the package).
2. Delete (the blood gift's writer already went in W3): `runResolutionConsumers`' regard loop and
   `roomBelievers`; the breach regard block
   in `ContractLogic`; `ILL_FROM_HAND_REGARD` and the sickening branch in `Bonded` (replace with a
   `provide` occurrence — the positive branch stays, D27); `PET_REGARD` in `PetController`
   (the pet act moves onto `Bonded` as the animal's own method, which hands over the `provide`
   occurrence); `REGARD_INTRODUCE_BUMP` and its `adjustRegard` in `IntroduceController` (the `tell` already
   comes from `learnIdentityOf`, W3 — the controller fires nothing);
   the three `AppSettingKeys` dials and their seeds.
3. Content: `clerk.yaml` and `officer.yaml` — every `{ verb: regard }` becomes `{ verb: assert,
   beat: honor, degree }`; the clerk gains one rude choice (`slight`) and one confession
   (`confess`), written in his voice. B4: grep `packages/content` for `verb: regard` and confirm
   only the 16 lounge and Katie uses remain.
4. Scaffold: `C/test-fixtures` gains what the drive stages on (a greeter dialogue with the three
   asserted choices, a donation window if the testbed bank has none, a kept animal, a Cast NPC
   with an identity).

**Acceptance:** per replaced writer, a regression test asserting the same people move the same
direction at the starting size (blood +2 / +2 / applause; −20 / +2; −15; +6; −25; +1; the
dialogue values), and the new halves exist (the killer's compassion; the promiser's constancy).
**Commit:** `feat(tropes): W4 — the roster pack; the hand-written writers deleted`.

### W5 — the ratchet  (D24)

**Goal:** the old way cannot merge.

1. The three scripts + `package.json` `lint:*` entries; ceilings set from the tree as it stands.
2. `docs/lint-family.md`: three entries (what each protects, why, how a ceiling moves).

**Acceptance:** each gate is made to fail once on purpose (add an `adjustRegard` in a
controller; a `creditDeed` with a literal; a trope naming an unknown beat) and then passes
clean. **Commit:** `feat(tropes): W5 — the gates`.

### Closing — drive, walk, docs

Run the blocking drive and the browser walk; record them in § Drive record. Docs graduated at
`/finalize`, not here: a new `docs/subsystems/narrative.md`; trait.md, advancement.md,
accountability.md, chattel.md, banking.md, activity.md, call-security.md (the `acting` rule),
measurement.md (§ 3.10's wording: the kernel knows the facts, the roster reads them).

---

## Reachability wiring

No new verb and no new affordance. The five links, per capability:

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| a trope fires | every existing verb that reaches one of the eight writers | existing | `morality-commons` `content/tropes/` | `TropeCatalogue` `whole`, on the first occurrence in the process | n/a |
| an asserted beat | `talk` → a choice | the NPC's existing dialogue affordance | the `assert` effect on the row + `content/beats/` | `BeatCatalogue.byWord` at the effect | the effect's `beat` is required; `lint:tropes` checks it |
| credit from a definition | every moved act's own verb | existing | `credit` / `competence` / `difficulty` on the definition row | the definition is already loaded by the act (that is the rule) | a definition with no discipline credits nothing — say so in each catalogue's parse doc |
| abandonment | whatever the actor does that ends their own work — cancelling it, starting something else, walking off | existing | none | n/a | only engagements that implement `ExerciseActivity`, and only when the one acting is the engagement's actor (D10) |
| `give` passes title (default) · `--lend` keeps it | `give` | existing; the view gains `--lend` | none | n/a | giver must be the stamped owner; otherwise custody only; both stated in help |
| the telling | `chronicle` | existing | the trope's `telling` | with the trope | n/a |

Fail-closed risks to check in the drive, each of which would be silent: the roster pack missing
from the default union (nothing fires anywhere — step 1 catches it); `occurred`'s gate rejecting
a writer whose module id was mistyped (the gate must throw into the diagnostic, and W3's tests
call through the real gate, not around it); a kind declaration whose `catalogued.by` path is
wrong (install refuses).

---

## Acceptance-criteria coverage

| requirements criterion | waves | proved by |
|---|---|---|
| every trait, regard, renown change names its trope; every trait change traces to its act | W3, W4, W5 | trait rows carry `trope` + `actId`; renown `signal.trope`; regard cannot cite — the requirements' stated gap; drive 1, 17 |
| replaced behaviors: same people, same direction, about the same size | W4 | W4 regression tests; drive 1, 2, 5, 6, 7, 12, 13 |
| killing in plain sight changes the killer | W3, W4 | drive 6 |
| failing then finishing hard work → patience, any trade | W2, W3, W4 | unit test over two definitions; drive 8 (at the glass bench — Risks R5) |
| a deferred finish belongs to the choice and the person | W1 | W1 tests; drive 15 |
| a trope added as rows only works | W3 | W3's fixture-document tests are exactly this; W4 adds 18 with no code |
| a dialogue choice asserting a beat fires tropes like a detected one | W3, W4 | drive 13 |
| the lounge and Dave's Bar exactly as today | W3 (the `regard` effect stays) | drive 18; `git diff --stat` shows no file under `C/saxonberg-lounge` or Katie's row |
| NPCs are characterized | W1 (D25), W4 | drive 14 |
| roster absent → nothing characterizes, every trade runs | W3 (D15), W4 | drive 16 (its own world) |
| after a restart every write is there; a look-back completes | W3 (D16) | drive 17 |
| no hand-written write can merge; no new credit-by-name; rope and medicine from rows | W2, W5 | the gates; drive 10, 11 |

Unmapped: none. Two criteria are met with a stated qualification — regard cannot cite its act
(the requirements say so), and the regard code ceiling is 2 rather than 0 (R3).

---

## Test & gate strategy

**Unit (vitest, colocated `__tests__/`, importing `test-bootstrap` where the wired runtime is
touched):** the W1–W4 acceptance lists above. Arithmetic that a season would otherwise prove:
`repeat`'s falloff curve over a year of eight-weekly gifts (S1) and a season of daily petting
(S2), in `NarrativeLogic.repeat.test.ts`.

**Only the drive can prove:** the restart (17), the absent pack (16), attribution across a real
deferred finish (15), and that the converted dialogue reads right (13).

**Drive files** (build-1 port `WIRE_PORT=2014`):

| file | steps | world |
|---|---|---|
| `W/tests/tropes.dirty.wire.test.ts` | 1–7, 9–12, 14, 15, 17 and 13 against the scaffold greeter | scaffold + `morality-commons` + the trades staged on; names no placeholder content |
| `W/tests/tropes-content.dirty.wire.test.ts` | 8 (glasshouse), 13 (the terminal clerk; the officer), 18 (bank, work board, forge, terminal in their own light; Dave unchanged — assert his lines and his regard deltas byte-for-byte against values read before the build) | the placeholder world; **raises `WIRE_CONTENT_CEILING` by one** (test-only ratchet; the reason is that the regression target *is* placeholder content) |
| `W/tests/tropes-no-roster.dirty.wire.test.ts` | 16 — give blood, forge, tie a knot, pet; assert no trait row, no regard change, no telling, and each act's own result | same packs **minus** `morality-commons` |
| `W/tests/tropes.soak.dirty.wire.test.ts` | S1, S2 | soak lane |

Pace and staging, per step:

| # | pace | staged how (existing tools unless marked) |
|---|---|---|
| 1 | instant | `standIn` at the scaffold bank's donation window |
| 2 | instant · staged | `stage(<bank>, …)` to set the lot short — use the bank's own stock setter; if none is callable, **owed tool:** `testharness` has no stock stage, add the method to the bank, not a harness verb |
| 3, 4 | instant | two `standIn` characters; `hand` a stamped good; `fundedAccount` |
| 5 | short · staged | lethal consented terms; a third `standIn` watching; see R4 |
| 6 | instant · staged | `standInNpc` victim; a watcher |
| 7 | short | post a gig with a short claim window; `advanceWorldClock` under a game day |
| 8 | short | dip a gather and let it chill on the pipe (a `failure` at `hard`, definition = the gather row); dip again and crack a piece off (`success`, same definition). `W/tests/glass.dirty.wire.test.ts` is the precedent |
| 9 | instant | start a craft build at the scaffold forge and **walk out of the place**, as the requirements say; assert the `abandoned` row and *Walking Off the Job* |
| 10 | instant | scaffold rope |
| 11 | short · staged | `standInNpc` + `testharness afflict` a wound; a needle via `hand` |
| 12 | instant | scaffold kept animal; `hand` a food `stage`d with a pathogen load |
| 13 | instant | — |
| 14 | instant · staged | `stage(<npc>, 'forceCommand', 'give …')` on a Cast NPC |
| 15 | short · staged | start a build, `advanceWorldClock` past it while idle; read the transcript row's `actId` and owner through a harness read (**owed tool:** `testharness act <stuffId>` — lists the ledger rows carrying a character's latest `actId`; test-only, under `system`) |
| 16 | instant · staged | the pack list |
| 17 | instant · staged | `restartWorld()`; then finish the second half of *Seeing It Through* begun before it |
| 18 | instant | `look` in each |
| S1, S2 | span | soak; staged twins are the unit arithmetic above |

Every checkpoint asserts a **sentence or a row value**, never "not refused", and each is made to
fail once on purpose before it is trusted (B2).

**Browser walk:** `e2e/tests/tropes-walk.spec.ts`, once at code-complete: give blood and read the
chronicle line; the clerk's three choices; `give` a good and see the title line change on `look`;
pet the animal; `traits` and `standing` render with no number that was not there before.

**Gates:** `lint:family` every wave. `pnpm test` exactly once at code-complete and once at
`/finalize`.

---

## Risks & opens

**For the owner — decisions this plan made that the requirements did not:**

- **R1 — `give` passes title by default; `--lend` keeps it (D7).** ✅ Ruled by the owner
  2026-11-28.
- **R2 — the pack's name, root and title holder (D22).** ✅ Name and root ruled 2026-11-28:
  `morality-commons` at **`/morality`** (slate § 1a — the trope is the platform's first
  prescriptive unit; the kernel's descriptive side keeps *narrative* names). It adds a top-level
  document root beside `/expression` — CLAUDE.md's namespace table gains the row at the sweep. The holder in `requires.title` is not decided
  (`C/expression/pack.yaml` names a group; `C/wiki-starter/pack.yaml` names none); unless told
  otherwise the build ships with no title claim, as wiki-starter does, and records it here.
- **R3 — the regard ceiling is 2, not 0 (D27).** Slate § 9 says 0. Two writes cannot move this
  build: the lounge's dialogue effect (requirements: not touched) and the positive hand-feed
  (requirements: the bond's mechanics stay; and a bond that needed the roster would make petting
  depend on an optional pack). Both are named in the gate.
  ✅ Ruled 2026-11-28: the ceiling stays 2; the slate and requirements are being updated to match.
- **R3a — introductions stay on the roster.** ✅ Ruled 2026-11-28. Not a lounge dependency (see
  the `making-an-acquaintance` row, D22).
- **R4 — `spare` needs a real alternative.** The engine accepts a person's yield automatically
  (`CombatLogic.ts:344–354`); the declined or lapsed finishing stroke (:5133–5338) is where a
  victor chooses. If a yield under lethal terms does not open that window, *Sparing the Yielded*
  can only fire on the incapacitation path and drive step 5 (*"to a yield … the victor spares"*)
  must be staged as a lethal duel to a downed opponent. Verify in W3 before writing the row; do
  not record `spare` where nobody chose.
- **R5 — the forge cannot fail.** ✅ Ruled 2026-11-28: drive at the glass bench; crafting's failure
  outcome is its own conversation, not this build's. Requirements step 8 says *"at a forge (or any trade)"*. No
  craft resolve has a failure outcome; glass does. The plan drives step 8 at the glass bench; the
  definition is the gather's own row, made `hard` (D9). *Seeing It Through* will be unreachable at the forge until
  some build gives forging a failure — a fact about smithing, not about tropes.

**Where the requirements look wrong or thin (not absorbed — reported):**

- *"Every … renown change comes from a trope."* Renown's own ingestion of players' real reactions
  and receptions is not a hand-written characterization and is not moved; the gate counts
  `RenownApi.append` callers only. If the owner means reactions too, that is a different build.
- The clerk has no rude choice and no confession today; step 13 requires writing them (W4).
- The clerk's `warm` branch (regard ≥ 20) becomes unreachable in a world without the roster.
  Placeholder content, and the same shape the lounge was protected from.
- *Goods as a share of holdings* (slate § 3.8) is not recorded: there is no cheap honest measure
  of what a person holds in goods. Money records amount and `heldBefore`. No build-1 trope reads
  a share.

**From the 2026-11-28 review — one finding not taken as written:** *"TranscriptEntry has no
`find`"*. It inherits `Document.find` and `Advancement.ts:237` already calls
`TranscriptEntry.find({ owner })`; D16 now writes each look-back read out.

**Engineering risks:**

- **R6 — `getActingAuthor` elsewhere.** 40 sites remain; some (the craft maker's mark,
  `Maturing`, `Growing`, `Fractionating`, `ContractLogic`) may be the same defect. Out of the
  requirements' three; a census gate is a Deferred seam. Do not sweep them here.
- **R7 — `acting` at ~60 sites is wide and touches the socket boundary and the sandbox.** Wrong
  claims are silent (a system named where a person acted). W1's tests assert the claim at the
  boundaries that matter (command in, schedule, engagement, world clock, REST); `SandboxLogic`'s
  13 are reviewed one by one against sandbox.md.
- **R8 — the matcher on the bank's posting path.** `occurred` is called after every leg. With a
  roster installed, `closingOn('give' | 'exchange')` is a map read and most legs match nothing;
  the call must stay off the await path of `postTransaction` (fire, guard, do not block
  settlement). Run `call-security-performance` and `db-performance` wire files before the MR.
- **R9 — the word *beat*.** Dialogue rows already use `beat:` for a node's text, and combat and
  behavior use *beat* for a clock tick. The owner ruled the word; the code keeps it out of the
  dialogue schema (the effect is `assert`, its field `beat`). If review finds it confusing in
  rows, the cheap change is the effect's field name.
- **R10 — sandbox circles.** Trope writes land on `stamp` ledgers and revert with the circle like
  any trait or transcript row; regard and chronicle follow their own existing policies. Verify
  one trope inside a circle writes stamped rows and that field look-backs do not read them.
- **R11 — a lazy breach's actor.** `breachClaim` runs under whoever's read expired the claim; the
  row's party fields, not the root's actor, name the promiser (D5). The W3 test must breach by
  another player's read.
- **R12 — order with organism-biology.** It is swept and will likely merge first; W2's
  `OperateController` edit then conflicts in one line (take the row's credit), and its 5 harness
  roots need `acting` on the catch-up merge. Catch up before W1's commit.
- **R13 — the catch-up.** The branch is 4 behind `origin/master`; merge master before W1.

**Stop and ask rather than guess:** R1 if the owner objects; any site where stating `acting`
honestly needs a person the code does not have; any new detected beat (a kernel vocabulary
change the requirements call deliberately rare); any file that will not fit D20's table.

---

## Deferred seams

Each leaves as slate work in [tropes-slate](../slates/engine/tropes-slate.md) § 9 *Build 2*, not
in this plan:

- **Durable `provide`, `tell` and asserted beats** — their home is the incident memory derived
  regard needs in the belief store (§ 3.6). The attach point is `BeatOccurrence.durable` and
  `TropeCatalogue.parse`'s refusal (D14).
- **Regard that cites its act** — `adjustRegard` is called from one place (the matcher) plus the
  two named residuals; build 2 replaces that call.
- **Attended time as price** — `BeatOccurrence.price` has the slot; nothing fills `attention`.
- **The ~90 remaining credit-by-name sites** — `lint:discipline-by-name`'s falling ceiling; per-act
  credit on host kinds (`exercises: { <act>: … }`) is the shape the sweep will need and is not built.
- **`take` / `return` / `flee` / `protect` / `discover` / `befall`** — vocabulary entries only
  when their facts exist.
- **The author surfaces** — the first reader that wants an `{ actId }` index and a
  *could-fire-here* read over `TropeCatalogue`.
- **A `getActingAuthor`-in-fiction census gate** (R6) — add to the slate's § 8.
- **The dialogue `regard` effect's removal** — with motives (§ 3.11).

---

## Critical files

Read first, in this order:

1. `docs/requirements/tropes-requirements.md`, `docs/slates/engine/tropes-slate.md` § 3, § 4, § 6
2. `S/api/execution-context.ts` (:132–145, :600–830, :1020–1260)
3. `S/api/schedule.ts` (:120–215), `S/platform/idea/SchedulerRegistry.ts` (:300–520, :680–702),
   `S/platform/idea/WorldClockRegistry.ts` (:770–950)
4. `S/lib/advancement/Advancement.ts` (:50–145, :500–560), `TranscriptEntry.ts`,
   `ActSignature.ts`
5. `S/lib/trait/Dispositioned.ts` (:140–290), `DispositionEntry.ts`
6. `S/platform/idea/api/BankingLogic.ts` (:140–160, :2225–2340), `S/lib/banking/LedgerEntry.ts`,
   `AccountBalance.ts`
7. `S/platform/idea/ChattelRegistry.ts` (:140–185), `S/lib/chattel/Chattel.ts`,
   `S/platform/idea/cmd/inventory/GiveController.ts`
8. `S/lib/accountability/AccountabilityEvent.ts`, `S/platform/idea/api/CombatLogic.ts`
   (:330–360, :5015–5060, :5130–5340, :5515–5570)
9. `S/platform/idea/api/ContractLogic.ts` (:140–165, :440–490, :780–830)
10. `S/lib/commerce/DonationBank.ts` (:380–430), `S/lib/vitals/Blood.ts` (:85–115),
    `S/lib/husbandry/Bonded.ts` (:1–90, :800–860), `PetController.ts`, `IntroduceController.ts`
11. `S/lib/npc/DialogueConversation.ts` (:370–440), `DialogueEffects.ts`
12. `S/platform/idea/FormationCatalogue.ts` and `S/lib/document/DocumentCatalogue.ts` (the
    catalogue pattern); `docs/subsystems/document-store.md` § *Kinds are declared*, § *Idea or
    document*
13. `S/lib/craft/Joint.ts`, `S/platform/idea/JointCatalogue.ts`, `S/platform/thing/Rope.ts`
    (:770–790, :1100–1116), `S/lib/vitals/Operation.ts`, `C/trade-medicine/src/idea/cmd/medical/`,
    `C/trade-glass/src/thing/Gather.ts`
14. `packages/server/scripts/check-create-sites.ts`, `check-contribution-keys.ts`,
    `check-wire-content.ts`
15. `W/src/harness/scaffold.ts`, `world.ts`, `registry.ts`;
    `W/tests/aether-devices.dirty.wire.test.ts` (the drive's shape)
16. `docs/measurement.md` § the reading rules (:380–440); `docs/review-questions.md`

---

## Drive record

*(appended at build time)*
