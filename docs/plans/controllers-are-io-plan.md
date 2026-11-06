# Controllers are input and output — implementation plan

Executes [controllers-are-io-requirements.md](../requirements/controllers-are-io-requirements.md)
(kind **refactor/sweep**, lead end **kernel**; the first consumers are the
kernel's own verbs named there). Seeding slate:
[controllers-are-io-slate.md](../slates/builds/controllers-are-io-slate.md)
(the doctrine, the 2026-11-05 scan, the decisions, the reuse ledger).

What the build does, in one paragraph: it adds `verb@source` to the
command line and a reply that names the other offer; it installs seven
census-then-ratchet gates (one per link of the chain); it makes the act
convention one shape with the words on the controller; it moves the
rules, durations and state changes of `harvest`, `plant`, `put`, `order`,
`treat`, `throw`, `read`, `tan` and `pour` onto their objects; it splits
twelve switch controllers into per-subcommand controllers under the
agreed noun rule and decides the fight pairs; and it splits the five
dated mixins and mints the markers the duck-typing census earned.

Branch `reqs/controllers-are-io` (build-2), off master `4b20f2ce5`.

---

## Fault lines

Every place this build cuts something in two or moves a boundary. One
row per cut. Names marked *(grain)* are the plan's pick and the owner may
rename them at review without re-planning.

### Mixin splits (D6)

| old mixin (keeps its name as the composition) | new halves | who loses what |
|---|---|---|
| `OrganizationMixin` (`lib/employment/Organization.ts`) | `StaffedMixin` (the chart: `positions`, `rosterSlots`, `appointingAuthority`, `proprietorPath`, `parentOrganization`, `startsShiftOnHire`, `name`, every roster/hire/shift method incl. client-surface's `showShiftStatus`) + `OnCallMixin` (`call`, `getCall`/`setCall`/`callFor`, `_lastCalled`, `_callTicket`, the four private helpers) | nobody: `OrganizationMixin = OnCallMixin(StaffedMixin(Base))` keeps `_mixinName='OrganizationMixin'`, so `isOrganization`, `FromMixin('OrganizationMixin')` (EmploymentLogic :71,:83,:457,:672; Employed.ts:173) and all 37 authored `call:` rows stand |
| `WaterPlaceMixin` (`lib/location/WaterPlace.ts`) | `WaterStateMixin` (`water`, `column`, `tide`, every level/band/medium/arrival method, the descend/ascend contributions) + `HaulOutMixin` (`pullOut`, `loadNamed`, `deliverOut`, `isHelpless`, `pullerStation`, `PULL_OUT_REAL_S`) | nobody: composite keeps the name; `isWaterPlace` keeps returning the composite type |
| `MetabolicMixin` (`lib/metabolism/Metabolic.ts`) | `DigestingMixin` (all seven persisted fields, every reconcile/ingest/toxin method, `vomit.yaml`) + `EatingMixin` (`eat`, `claimUtensil`, `leaveCrumbs`, `EatOutcome`, `eat.yaml`; typed to compose over `Digesting` because `eat` calls `this.canIngest`) | nobody; `EatController` keeps calling `eat` |
| `LoadBearingMixin` (`lib/encumbrance/LoadBearing.ts`, no fields) | `CarryingMixin` (`getBorneBurden`, `getCarryCapacity`, `getStrainCeiling`, `getLoadRatio`, `wouldExceedCeiling`, `subscribableFields`) + `BuoyantMixin` (`getDisplacedVolumeM3`, `getNetBuoyancyN`, `NEUTRAL_DENSITY_KG_M3`, `G`) | nobody; `Carrying` imports the density constant from `Buoyant.ts` for its in-water correction |
| `ChattelMixin` (`lib/chattel/Chattel.ts`) | `ChattelTitleMixin` (`_chattelId`, `_place`, stamp/transfer/owner/custody, `markupAugmenters`, `onDestruct`) + `MadeFromMixin` (`_madeFromOwner`, `_madeByProcess`, `recordMadeFrom`, `getMadeFromOwner`, `recordMadeBy`, `isMadeByProcess`) | nobody; `requires: [ChattelMixin]` (consign.yaml:34, check.yaml:29) and `FromMixin("ChattelMixin")` (ChattelLogic:51) stand |

### Controller splits (D9, D10)

| old | new files (`platform/idea/cmd/<cat>/`) and view changes |
|---|---|
| `system/WikiController.ts` (1062 l, 17 arms) | `WikiControllerBase` + one controller per subcommand (`WikiReadController` … `WikiListController`); `wiki.yaml` gains `controller:` per subcommand; the fallthrough bare `wiki <page>` routes to `WikiReadController` |
| `social/PartyController.ts` (15 arms) | `PartyControllerBase` + 15 |
| `social/ChatController.ts` (13) | `ChatControllerBase` + 12 + `ChatPostController` (the fallthrough post) |
| `social/ForumController.ts` (11) | `ForumControllerBase` + 11 (bare `forum <board>` → `ForumViewController`) |
| `author/PackController.ts` (8) | `PackControllerBase` + 7 (pin/unpin one controller with a flag → two) |
| `social/GroupController.ts` (8) | `GroupControllerBase` + 8 |
| `social/SoulController.ts` (8) | `SoulControllerBase` + 7 (disable/enable → two) |
| `banking/BankController.ts` (8) — **last, W6** | per-subcommand over the existing `BankingControllerBase` |
| `work/JobController.ts` (5) | `JobControllerBase` + 5; the board becomes a view arg with a default (it is self-resolved today, :92-98) |
| `inventory/EquipController.ts` (`set`/`sets` + flat) | `EquipSetController`, `EquipSetsController`; the flat path stays `EquipController` |
| `stream/TuneController.ts` (4 + bare) | `TuneControllerBase` + 4 + `TuneInController` (the bare form) |
| `civics/TitleController.ts` (4) — **last, W6** | per-subcommand + `TitleControllerBase`; `subdivide`/`transfer` move under it |
| `combat/FightController.ts` (19) | `FightGambitController` (the twelve gambit words are ONE act, `queueGambit(name)`) + `FightStatusController`, `FightBreakController`, `FightRushController`, `FightSwitchController`, `FightDrawController`, `FightFinishController`, `FightYieldController` |
| `inventory/ThrowController.ts` (3 acts) | `TossController` (`toss <item> to <person>`), `ThrowController` (pitch: `throw <item>`), `HurlController` (`hurl <item> at <target>`, the consent gate) |
| `perception/ReadController.ts` (read + cast) | `ReadController` (reads only) + `magic/ReciteController` (`recite <scroll>` casts) |
| `trade-tanning` `TanController.ts` (lay-in + lift) | `TanController` lays in only; the lift becomes the hide's own rule on removal from the pit (`get hide from pit`, which the controller's docstring already promised) |
| `bulk/PourController.ts` + `crafting/PourController.ts` | ONE `bulk/PourController.ts` over `PourTargetMixin`; `crafting/pour.yaml` retired; `KNOWN_COLLISIONS` drops `pour` |

### Rules moved (D4, D5, D11)

| from (controller) | to (object method) |
|---|---|
| Harvest: `bandFor` :453, the count :308, difficulty :359, tool gate :242-258, unready arms :263-290, the swath duration `3000+swathM2*60`/cost 6 :433-434, nitrogen pro-rata :592, carry-or-drop :572-574, the mint loop :543-558, `landSwath` :482, the label/stand selection :139-194 | `GrowingMixin.harvestPlanFor(req)` (`lib/husbandry/Growing.ts`), `SoilMixin.harvestPartFor(req)` (`lib/husbandry/Soil.ts`), the tool's `getSwathM2` (already) |
| Plant: pot-path checks :96-249, broadcast rate/area :407-431, duration `3000+area*10`/cost 5 :445-446, seed spend :564-567, `maySow` :486, `landUseRefusal` :517, `landSowing` :534 | `CultivableMixin.plantPlanFor(req)` (`lib/husbandry/Cultivable.ts`), `SoilMixin.sowPlanFor(req)`, `PlantableMixin` (the seed's own rate) |
| Put: `offersFor` :435-473, preposition→placement matching :143-197, `openSlotFor` :412-420 | `PlacingMixin.placementFor(word)`, `SlottedMixin.openSlotFor(item)`, `ContainerMixin.canAddContainable` (already); the move stays `ContainmentApi.move` |
| Order: the six service arms :238-483, `runDurativeService` :310-346, bath `12000` :695, `reachableTariffs` :717, `resolveSubject` :755, `findGrave` :766, `resolveAttendantPoint` :779, `resolveWindowIssuer` :735, `CLINIC_*` :56-65 | `PricedOfferMixin.orderPlanFor(req)` (default refusal) overridden by `Tariff` (dispatching to `Tub`, `Garment`, `DonationBank`, `Postmortem`, the condition logic) and `CommerceMenu`; the subject becomes a view arg; the two-houses case becomes `onExcess: prompt` on `counter` |
| Treat: `pickWound` :71, `difficultyFor` :84, `outcomeFor` :119, `BAND_SCORE` :110, `tendInfection` :607-641 (incl. the field write `infection.pathogenLoad` :636), `resolveTreatment` :513 (an `MqlApi.resolveMany('reachable')` walk), `TREAT_FLUID_LITRES` :54 | `VitalsMixin.treatmentPlanFor(req)` (`lib/vitals/Vitals.ts`) — the patient decides the wound, the difficulty and the outcome; the remedy answers through what it already is (`isDressing` → `getDressingQuality`; `isBulkable` → the interior; else hands) |
| Throw: the catch arm → already `Tossable.tossTo`; the attack delivery :153-293 (`IMPACT_SITES`, caustic energy, shatter) | `Combatant.deliverThrown(item, target)` (`lib/combat/Combatant.ts`, beside `resolveThrown`/`mayDeliverTo`); the item's `impactVerdict`/`sufferImpact` already its own |
| Read: `fireAnyWorking` :222 (the scroll cast) | `ReciteController` → `Arcane.dischargeAt` (already on the object); `Read` never casts |
| Tan: `lift` :177-230 (`becomeLeather`, `consumeBark`, the penalty band, the deed) | `TanningMixin.onLiftedFrom(pit, by)` (`trade-tanning/src/lib/Tanning.ts`), fired from `Tanpit`'s removal hook |
| Pour (crafting): `POUR_MS=3000` :40, `effortW 150` :131, the serving size :118-126, `addIngredient` :77-91; Pour (bulk): `WATCH_EFFORT_W=60` :271, the credit rules :122-183 | `PourTargetMixin.receivePour(req)` on `ManualBuildMixin` (pace, contribution) and `BulkableMixin` (transfer; the mould watch reads `Mould.getPourDurationS`, already the mould's) |
| every `ActPlan` consumer: `beginSelf`/`beginPeers` on the plan, `line: Mml` on `ActRefusal`/`ActOutcome` (25 implementers, 12 controllers) | the words move to the controller: `engagePlan(context, plan, words)`; the object returns `reason` + facts |

### Verbs and subcommand words added, aliased or renamed (D8, D9, D10)

| word | change | why |
|---|---|---|
| `toss <item> to <person>` | new verb (catch) | throw split; `Tossable` already names the act |
| `hurl <item> at <target>` | `hurl` leaves `throw`'s alias list and becomes the attack | throw split |
| `throw <item>` | keeps `lob`, `heave` as aliases; a typed `to`/`at` tail gets a teaching refusal naming `toss`/`hurl` | an act split cannot keep the old form silently |
| `recite <scroll>` | new verb (cast from a scroll) | read split |
| `staff appoint \| dismiss \| apply \| quit` *(grain)* | new noun; the four flat views stay as alias views routed to the same controllers | the business seat is a noun you operate |
| `wallet draw` — W6 | `draw` moves under `wallet`, old `draw` kept as an alias view | money noun; water-supply holds `wallet` |
| `title subdivide \| transfer` — W6 | move under `title`, old words kept as alias views | parcel noun; water-supply holds `title` |
| `fight defend` | routes to `DefendController` (same beat, `queueGambit('defend')`) | the one true duplicate found |
| `fight close` → `fight crowd`; `fight disarm` → `fight wrest`; `fight sweep` → `fight trip`; `fight switch` → `fight swap`; `fight draw` → `fight ready`; `fight status` → `fight report` *(grain)* | subcommand renamed | the body verb keeps the common word (door, trap, floor, device, money, status); the fight takes the jargon |
| `wiki read`/`forum read` → `view`; `wiki move` → `wiki rename`; `party show`/`group show`/`soul show` → `view`; `chat make`/`forum make`/`group make`/`soul make` → `create`; `chat who` → `chat members`; `tune who` → `tune viewers`; `party transfer` → `party cede`; `forum reply` → `forum respond`; `group add`/`remove` → `group admit`/`expel`; `soul search` → `soul lookup`; `pack status` → `pack state`; `pack provision` → `pack fill`; `bank open` → `bank join` (W6) *(all grain)* | subcommand renamed | one word, one act; the physical verb keeps the word |
| `wiki edit`, `forum edit`, `soul edit` vs shell `edit` | **not touched** | wizard-axis moves the shell verb under its tree (command-taxonomy item 8); the pair dissolves when it lands — the gate counts it until then |
| `title buy` vs `buy`, `bank transfer` vs `transfer`-alias, `stall rent` vs `rent`, the sibling-held nouns (`settings get`, `git status`, `errors clear`, `testharness clock|ship`, `cockpit`, `player`) and the pack nouns | **counted, not resolved** | outside this build's kernel scope or in a sibling's hands |
| `pour` / `add` | one view, `verbs: [pour, add]` | rung 1 |

### Outcome wording that changes

Only where the convention rewrote it (listed in the MR): every refusal
and completion line of the twelve `ActPlan` controllers (shape, knead,
carve, cut, dip, paint, stir, coil, impress, turn, twist, fit's pasteOn
arm) moves from the object to the controller **verbatim** — same words,
new owner. The moved kernel verbs keep their words. New words appear only
on the new verbs (`toss`, `hurl`, `recite`, the renamed subcommands) and
on the three new dispatcher sentences (the other offer, source not found,
source affords nothing).

### Ordering against siblings

| sibling | overlap | this plan |
|---|---|---|
| `reqs/water-supply` (build-1, 72 commits) | `BankController`, `WalletController`, `TitleController`, `ClockController`, `BankingControllerBase`, `check-reachability.ts`, `lib/employment/{Employed,Position,Roster,ShiftSchedule}.ts` | `bank`, `wallet`, `title`, `clock` are **W6, last**; never waited on; whichever merges second reconciles (the split is additive — per-subcommand files beside their base) |
| `build/client-surface` (build-3) | `CommandGiver._runChain` (the "Ring what?" prompt, +54 l), `CommandLogic.objectCandidates`, `command.ts` (`AssembleError.missing`), `Organization.ts` (+`showShiftStatus`), `ChatController.ts` (+4), `LookController.ts` | W1 edits `_runChain` in the same region: merge by hand, both features keep (scope filter runs BEFORE the askable probe); `showShiftStatus` lands in `StaffedMixin`; `look` excluded |
| `reqs/wizard-axis-cleanup` (build-4) | shell verbs, `reserve`/`treasury`, `BankingControllerBase`, the domain-local `Lease`/`Unlease`/`Provision` controllers | excluded from regrouping; the gates count them; `edit`-pairs left |

---

## Grounding

Facts verified this cycle by opening the files (paths under
`packages/server/src/mud/` unless given in full; `V/` =
`packages/content/platform/content/platform/cmd/`). What the surveys
claimed and the files contradicted is marked ⚠.

### The command line and the dispatcher

- **Tokenizer.** `api/command-line.ts` (130 l) is the facade;
  `platform/idea/api/CommandLineLogic.ts` (390 l) is the logic: `lex`
  (:108-150) → `splitOnPipe` (:158-186) → `classify` (:197-262); the
  verb is `rawTokens[0].value` (:213-219, :315-318). `'` is a literal
  character (header :6-8); `"` is the only quoting form. `format()`
  (`formatCommand` :264, `quoteIfNeeded` :284, `NEEDS_QUOTING_RE =
  /[\s"\\|]/` :278) re-emits `rawTokens` — the round-trip property is
  `parse(format(parse(t))) === parse(t)`. `ParsedCommand` is `{verb,
  rawTokens, source, start, emotePrefixed?}` (`api/command-line.ts`
  :51-67).
- **`@` is reserved nowhere.** No hit for `'@'` in `api/mql/*.ts`,
  `CommandLineLogic.ts`, `api/command.ts`, `CommandLogic.ts` or
  `lib/command/*.ts`; `docs/mql-grammar.md` mentions `@` once, as
  "No named groups (`@@group`)" (:863). Alias bodies use `$@` and `$1..$9`
  (`ShellLogic.ts` :170-176) — `$`-prefixed, unrelated.
- **Dispatch order.** `lib/command/CommandGiver.ts` `executeCommand`
  (:650-830): input-mode prefix (:690) → `parser.parse` (`parsers/msh.ts`
  :57-77 wraps `parsePipeline`) → `ShellApi.expandAliases` (:773-783,
  verb-position only) → `_runChain(parsed, outer)` (:794). `_runChain`
  (:1001-1203): `matches = getAffordances().filter(hasVerb)` (:1008);
  unknown verb (:1082); per match `CommandApi.assemble` (:1067); a shape
  error `continue`s (:1090); bind/unknown-subcommand stop the chain
  (:1091-1108); a fresh attempt ctx carries `commandSource:
  affordance.source` (:1113-1127); resolve → preload → validators; a
  FIELD validator refusal falls through and the first refusal stands if
  nobody claims (:1163-1178); `_executeOne` (:1183); all-shape →
  `shape-fall-through` (:1195-1199). `_executeOne` (:1215-1280) picks
  `controllerForSubcommand(sub) ?? resolvedController` (:1223-1226).
- **Affordances.** `getAffordances()` (:441-452) walks the recency stack
  newest-first and resolves `'self'` to the giver; `Affordance = {command,
  source: Stuff, bucket}` (:296-302); `RecencyBucket = self | inventory |
  environment | peers` (:278). Pushers: `CommandLogic.ts` :3663-3746
  (the containment orchestration), `lib/magic/Caster.ts:215` and
  `lib/advancement/Advancement.ts:456` (a catalogue pushed on bucket
  `self`), shadows (:3763), hosted updates (:3838). Attribution is
  documented at `docs/subsystems/command-routing.md` :578-640.
- **A second match loop.** `lib/script/Interpreter.ts` `bindCommand`
  (:605-675) re-implements the match: `parsePipeline` →
  `actor.getAffordances().filter(hasVerb)` → `assemble` → shape
  `continue`. It is synchronous, inside a generator (:302). Any change to
  what "matches" means must land in BOTH places or be shared.
- **Alias expansion.** `platform/idea/api/ShellLogic.ts` `expandAliases`
  (:88-113): `\verb` bypass (`stripBypassPrefix` :153-168 rebuilds the
  command via `format` + `parsePipeline`); `expandOnce` (:198+) replaces
  `rawTokens[0]` from the alias body; `expansion.expandedText =
  format(result)`. `CardLogic.ts` :118-120 also calls it.
- **Cardinality.** `CommandLogic.applyCardinalityPolicy` (:1274-1360):
  for `type: object` — 0 → `[]`, 1 → it, a set → `too-many`, a count →
  top, policy `top`/`error`/`prompt`; `prompt` with no
  `context.interactive` degrades to an `ambiguous` `validator-failed`
  note (:1324-1325); otherwise `promptMqlObject`. `MqlApi.resolveOne` /
  `resolveMany` (`api/mql.ts` :97, :110) are **synchronous**. `me` is a
  seed (`mql-grammar.md` :36, :134); `all X` is the quantity prefix
  (:685); `#<id>` is a seed (:244).
- **Note kinds.** `packages/types/src/index.ts` `Note` union :874-903 has
  **29** members (⚠ `response-envelope.md` :111 still says 16).
  `CommandRejectedNote.reason` is the closed union at :565-583
  (`shape-fall-through` :577). The dispatcher proses `command-rejected`,
  `mql-error`, `validator-failed`, `controller-error` only
  (`CommandGiver.ts` `proseForFrameworkNote` ~:90-130;
  `response-envelope.md` :470-478); controller notes are never prosed by
  it. Kind versioning is append-only and per-kind-frozen
  (`response-envelope.md` :193-198). No kind carries an "alternative".
- **Help.** `lib/command/CommandDefinition.ts` `getHelpText` (:456-527)
  renders a `Subcommands:` block (:489-506); `HelpCatalogue.ts` :430-447
  makes one topic per verb from it. `hasVerb` (:364) is
  case-insensitive; `controllerForSubcommand` (:345-350) prefers the
  subcommand's own `controller:`.
- **Per-subcommand controllers** are first-class: `command.schema.json`
  :163 (`$defs.subcommand.properties.controller`), `command-spec.md`
  :1475-1540 (the `analyze` exemplar). Shipped: `V/shell/cockpit.yaml`
  (six subcommand controllers), `V/banking/house.yaml` (five entries, two
  classes), `V/system/trace.yaml` (two). ⚠ The slate's "cockpit ×7" is six
  subcommand-level plus the verb-level one. **A subcommand controller
  does not receive a parent-bound arg**: `CommandLogic.ts` :1037-1042
  binds the subcommand's own `args` only; verb options, `payload:` and
  verb-level validators carry (:1098-1104, :2955-2975, :1820-1843). So a
  noun's bound object is re-resolved per subcommand through a shared base
  (`banking/BankingControllerBase.ts` `resolveBank` :73-83 is the shape).
- **`args` XOR `subcommands`** unless `fallthrough: true`
  (`command-spec.md` :1541-1583; `chat`, `forum`, `tune`, `wiki`, `equip`
  use it).
- **A domain-local alternate controller.** Views are `command-view`
  documents served store-first (`CommandLogic.preloadAll` :693-733;
  `reload(docPath)` :676-689; `viewKeyOf` :141-143). A runtime write goes
  through `DocumentApi.save` → `DocumentLogic.saveImpl` (:599-647): a
  changed `controller:` is wizard code trust (:610-624), then
  `CommandApi.validateCommandView` and `CommandApi.reload` (:646) — live,
  no restart. A controller must be a class on disk named by a template
  row (`command-spec.md` :1941-1956; 374 `*Controller.yaml` rows ship);
  affordance comes only from class statics (`command-routing.md`
  :391-450). ⚠ `world-seed` ships no `src/`; the domain-local exemplar is
  now `packages/content/terminus` (`content/world/terminus/university-avenue/idea/cmd/BlowController.yaml`
  → `src/university-avenue/idea/cmd/BlowController.ts`, afforded by
  `src/university-avenue/thing/Whistle.ts:36`).

### The acts: `ActPlan` and its consumers

- `lib/craft/ActPlan.ts` (53 l): `ActRefusal {ok:false, reason, line:
  Mml}` (:24-28), `ActPlan {ok:true, durationMs, effortW, beginSelf: Mml,
  beginPeers?, onComplete, onAbort?}` (:31-46), `ActOutcome {ok:true,
  line: Mml, peers?}` (:49-53). Packs import it as
  `@saxonberg/server/mud/lib/craft/ActPlan` through the server's
  `exports` map (`packages/server/package.json` :7 `"./mud/lib/*"`).
- `platform/idea/cmd/crafting/ManualBuildController.ts` (252 l; ⚠ not
  under `lib/craft/`): `engageStep(context, {durationMs, effortW,
  beginSelf, beginPeers?, onComplete, onAbort?})` (:69-126; `canExert`
  :73-79; a non-Engaged giver completes at once :80-83; `ManualBuildStep`
  + `SchedulerApi.start` :84-92); `engagePlan(context, plan)` (:141-171;
  zero duration runs now :142-145; a late refusal is prose only :162);
  `paceMs` (:228-241); `declineStep` (:244-251).
- `lib/command/EngagedActController.ts` (172 l): `engageAct(context,
  {durationMs, beginSelf, beginPeers?, cost (felt %), onComplete,
  onAbort?})` (:114-171) converts `cost` to watts via
  `giver.wattsForFeltCost` (:122). ⚠ There is no `engageStep` or
  `engageAround` on it; `engageAround` is `LocomotionLogic`'s.
- Effort reaches `exert` from the scheduler:
  `platform/idea/SchedulerRegistry.ts` `emitExertion` (:512-522) calls
  `actor.exert({durationS, powerW: e.effortW})` at completion and
  pro-rata on terminate (:535, :559, :572).
- **Planned consumers** (all forward `durationMs`/`effortW` untouched
  through `engagePlan`, and send `plan.line` on refusal):
  `ShapeController` (:51-71), `KneadController` (:35-52),
  `CarveController` (:101-113, `turnDown` :200-207), `CutController`
  (:58-86), `DipController` (:82-93), `PaintController` (:62-72),
  `StirController` knead arm (:52-69), `inventory/CoilController`
  (:25-30), `trade-cordage` `TwistController` (:30-39). **Instant**
  (`ActOutcome|ActRefusal`): `ImpressController` (:45-54),
  `device/TurnController` (:38-51), `StirController` hand-worked arm
  (:112-136, folds `out.line` into its own sentence). ⚠ `fit` and
  `strike` do NOT use `ActPlan` (`FitController` :68-72 reads
  `Faced.pasteOn`'s `{ok, line: string}`; `trade-smithing`
  `HammerController` :117-131 gets a bare `Promise<Mml>` from
  `StrikingDie.strikeWith`).
- **Protocol mixins** (`lib/craft/`, every default returns `null`):
  `KneadVessel.ts` :43/:56, `Carvable.ts` :48/:61, `Shapeable.ts`
  :40/:53, `Forming.ts` :89/:117 (+ `refuseBeyond` :66, `resolveForming`
  :189 building `line:` at :194/:201/:214), `DipBath.ts` :51/:64,
  `Impressible.ts` :29/:42 (default refusal with `line:` :46),
  `Turnable.ts` :21/:34 (:38), `HandWorked.ts` :28/:41; `Cuttable.ts` is
  interfaces only (:46, :52 — duck-typed in `CutController` :35);
  `StrikingDie.ts` :27/:35 is not `ActPlan`.
- **Implementers that build `line:`** (the sites W3 rewrites): kernel
  `lib/material/Compounding.ts` (:200; :209, :276), `Greenware.ts` (:192,
  :252; nine sites :208-310), `Faced.ts` (:405; :411-456),
  `lib/mould/Mould.ts` (:784, :856; :790-881), `platform/thing/GlazeTub.ts`
  (:62; :74-112), `ScrewPress.ts` (:76; :84-139), `Rope.ts` (:894,
  :1032); packs `trade-ceramics` `Wheel.ts:41`, `BrickTable.ts:61` (:97),
  `TemperPit.ts:78` (:92-129); `trade-quarrying` `Clay.ts:491`
  (:466-503); `trade-glass` `Blowpipe.ts:62` (:72), `Melt.ts:68`
  (:75-94), `Gather.ts:155` (:159); `trade-chandlery` `DipPot.ts:68`
  (:102); `trade-papermaking` `PulpVat.ts:82` (:87-108); `trade-baking`
  `DoughTrough.ts:81` (:86); `trade-carpentry` `lib/PatternStock.ts:71`
  (:79-128); `trade-tailoring` `CuttingTool.ts:76` (:80); `trade-cordage`
  `RopeJack.ts:154`; `trade-dairying` `Churn.ts:58` (:85-86);
  `trade-sugar` `SugarLoaf.ts:152`; `water` `IceSheet.ts:354`.
- **Outcome shapes today.** 112 `*Outcome`/`*Result` declarations
  (non-test); `ok: false` at 1,064 sites in 263 files. The dominant shape
  is `{ok, reason, line: string}` (`Tearable.ts:21`, `Tieable.ts:25`,
  `Sealable.ts:44`, `Line.ts:86`, `Book.ts:60`, …); `Pullable.ts:34` and
  `Tossable.ts:24` use `self: Mml`; `ForSale.ts:48` carries a `Note`;
  `Metabolic.ts:427` (`EatOutcome`) has no line. `lib/ground/Workable.ts`
  is a second plan vocabulary (`WorkPlan` :82-103 discriminates on
  `kind`, carries `prose: string` and `cost`).
- **Durations in kernel controllers** (the constants that move or are
  counted): `HeatController` :32/:34/:36, crafting `PourController`
  :40 (`POUR_MS`), `WashController` :45, `SteepController` :37,
  `RepairController` :32, `StirController` :30/:32, `BatheController`
  :28/:30, `device/BailController` :48-53, `FireController` :49,
  `BrushController` :16, `SweepController` :23, `RentController` :33,
  bulk `PourController` :271 (`WATCH_EFFORT_W`); `engageAct` sites with
  inline math: `HarvestController` :432-434, `PlantController` :444-446,
  `BailController` :172-174; `OrderController.runDurativeService`
  :310-330 and `SteepController` :100-104 build a `ManualBuildStep`
  directly.

### The kernel controllers in scope

(Surveyed in full by file; the per-line inventory is in § Fault lines →
*Rules moved*. Here: what each is, and what already exists on the object.)

- **Harvest** `inventory/HarvestController.ts` (651 l, `EngagedActController`);
  view `V/inventory/harvest.yaml` `verbs: [harvest, pick]`, args
  `target` (`Visible`, `Growing|Cultivable`), `part` (`SoilMixin`, `at`),
  `tool` (`with`/`using`, default the reaping/cutting capabilities).
  ~19 mutations, 5 module functions (`dial` :68, `bandFor` :453,
  `nowSeconds` :466, `landSwath` :482, `standingPhrase` :645), a label
  match on `.raw.toLowerCase()` (:139-147) and a `getPlants()` walk
  (:191-194). ⚠ `Growing.ts`, `Soil.ts`, `Cultivable.ts` carry **no**
  plan/complete method today; they carry the per-step reads the controller
  composes (`Growing.ts` `isPolycarp` :1045, `getFruitSetCount` :1079,
  `settleCycle` :1090, `isAreaCrop` :1117, `takeSwath` :1148,
  `settleRatoon` :1164, `growsByFieldRule` :1192, `getHarvestTemplatePath`
  :1226, `getNutrientDraw` :1237, `ripeSibling` :1581, `isHarvestable`
  :1598, `transplantDifficulty` :1655; `Soil.ts` `sowingRefusal` :457,
  `ensureCropTitle` :462, `resolvePartFor` :516, `rootedAreaCrop` :536,
  `drawNutrient` :1322; `Cultivable.ts` (⚠ at `lib/husbandry/`, not
  `lib/smallholding/`) `hasSoil` :325, `getPlants` :371, `occupy` :391,
  `vacate` :407). Tests `inventory/__tests__/HarvestVerb.test.ts`,
  `AreaCrop.test.ts` (:503), `harvest-view.test.ts`; wire
  `forestry.dirty` (:147-169, asserts `nothing-ripe`), `clinical-medicine`
  :223, `cover.soak` (sow/harvest).
- **Plant** `inventory/PlantController.ts` (617 l); view `plant.yaml`
  `verbs: [plant, sow]`, args `seed` (`Plantable`), `part`, `pot`
  (`Cultivable|Soil`), `drill`. ~21 mutations, 6 module functions
  (`maySow` :486 walks `EmploymentApi.operatorsAt`). Tests
  `PlantVerbs.test.ts` :207, `AreaCrop.test.ts` :618,
  `DormHouseplant.test.ts`; wire `forestry` :316, `field-population`,
  `cover`/`tracts`.
- **Put** `inventory/PutController.ts` (490 l); view `put.yaml` `verbs:
  [put, place]`, `item` (inventory, `Containable`), `target` (peers,
  `in/into/on/onto/from`, `Container|Placing`). Six mutations; the
  preposition→placement matching and slot search are the controller's;
  `Surfaced` is not consulted (`on` is a `Placing` member). Dead imports
  `ChattelApi`/`Chattel` (:69, :71). Test `PutController.test.ts`; wire
  `placement.dirty` (:145-378) and ~36 others.
- **Order** `retail/OrderController.ts` (859 l, `CraftController`); view
  `order.yaml`: `cocktail` (string, greedy), `brand`, `counter` (default
  `reachable:[class.Tariff]`), `menu`. **Six** service kinds
  (`platform/thing/Tariff.ts` :93-102: repair, treatment, burial,
  transfusion, wash, bath — ⚠ the requirements and help text say five)
  plus the menu path. Four `MqlApi`/room-walk self-resolutions (:717-788).
  Tests `OrderRepair.test.ts`, `OrderTransfusion.test.ts`; wire
  `cooking` :102, `consequence` :192, `repair` :375+, `cleanliness`
  :632-657; transfusion is not driven (`blood-economy` :110).
- **Treat** `medical/TreatController.ts` (687 l); view `treat.yaml`
  `verbs: [treat, bind, dress]`, `target` (`$focus`, `Vitals`), `with`
  (`any`), `for` (string). The outcome math and the infection tending are
  the controller's; `resolveTreatment` :513 walks `reachable`. Object
  methods already there: `Vitals.applyTreatment` :601, `stabilize` :424,
  `relieve` :591. Test `TreatController.test.ts`; wire `recovery`,
  `injury`, `clinical-medicine` :148, `consequence` :323.
- **Throw** `inventory/ThrowController.ts` (366 l); view `throw.yaml`
  `verbs: [throw, hurl, lob, heave]`, `item` (`Tangible`, `mustBeHeld`),
  `target` (`at`), `recipient` (string, `to`). Three acts: catch
  (`Tossable.tossTo`, `lib/spatial/Tossable.ts:39`; `Line.ts:205`
  overrides), pitch (`move` into the room :144), attack (consent
  `CombatApi.splashSetFor` :103 + `Combatant.mayDeliverTo` :104 →
  `CombatLogic.ts:300`; `initiateCombat` :118; `Combatant.resolveThrown`
  :559 → `CombatLogic.ts:270`; the delivery :153-293 is the
  controller's). No controller unit test (`api/__tests__/command-binder-throw.test.ts`
  binds only); wire: `rubber` :655 (`throw vitriol at`), soak files only
  for `throw … to`.
- **Read** `perception/ReadController.ts` (298 l); view `read.yaml`,
  `target` (`$focus`, greedy, `Marked|Display`), `page` (number). Arms:
  display → `Display.readScreen` (:243); page → `instanceof Book`
  (:100) → `openTo`; marks → `Marked.deviceFor/refreshMarks/readFor/teach`
  (`lib/description/Marked.ts` :182/:190/:205/:198); scroll cast
  `fireAnyWorking` :222 → `Arcane.getCarriedSpellPath` (:165),
  `requiresMark` (:231), `dischargeAt` (:245), `Consumable.consume`.
  No controller test; wire `paper` :292-392 (`read notebook page 3`,
  `read screen`), `logistics` :168, `maritime-space` :144.
- **Fight** `combat/FightController.ts` (355 l); view `fight.yaml`, 19
  subcommands, no top-level args; every arm is one `Combatant` call
  (`offerBreak` :115, `bumRush` :151, `orderCoup` :172,
  `beginWeaponSwitch` :203, `drawSidearm` :226, `queueGambit` :247,
  `yieldFight` :284). No mutations, no durations. ⚠ `fight.yaml:103`
  (`switch`'s weapon arg) requires `VitalsMixin`. Pairs with top-level
  views: `device/disarm` (trap), `device/switch`, `banking/draw`,
  `combat/defend` (`DefendController` :46 queues the same gambit),
  `inventory/sweep`, `boundary/close`, `social/status`. Wire `identity`
  :223 (`fight strike`).
- **Tan** `packages/content/trade-tanning/src/idea/cmd/tanning/TanController.ts`
  (260 l); view `…/content/trade/tanning/cmd/tanning/tan.yaml`, `hide`
  (`TanningMixin`), `pit` (objects, default `reachable:[mixin.ContainerMixin]`).
  The lift arm (`hide.isTanned()` :94 → `lift` :177) calls
  `Tanning.becomeLeather` (:329), `Tanpit.consumeBark` (:122),
  `tanPenaltyBands` (:351). `findPit` narrows `instanceof Tanpit`
  (:235-250). ⚠ The docstring (:26-27) promises `get hide from pit` does
  the conversion; nothing but `TanController` calls `becomeLeather`.
  Test `tanning.test.ts` (objects only); wire `carcass-chain` :985.
- **Pour, bulk** `bulk/PourController.ts` (310 l); view `V/bulk/pour.yaml`
  `verbs: [pour]`, `source`/`target` (`mustHaveBulkSlot`), options
  `amount`, `exact`. `BulkableApi.transfer` :94, `afterPouredOutBy` :97 /
  `afterPouredInBy` :116 (`Bulkable.ts` :491/:497; `Mould.ts:756`
  overrides); the credit rules :122-183; the mould watch
  (`Mould.getPourDurationS`, `WATCH_EFFORT_W=60` :271, `watchThePour`
  :277). **Pour, crafting** `crafting/PourController.ts` (230 l,
  `ManualBuildController`); view `V/crafting/pour.yaml` `verbs: [pour,
  add]`, `spirit` (`any`), `vessel` (default
  `reachable:[mixin.ManualBuildMixin]`). `POUR_MS=3000` :40, `effortW
  150` :131; header :18-22 says the two views are told apart by the
  target (a build vessel is not Bulkable).

### The twelve switch controllers

None of the twelve views gives a subcommand its own `controller:`.
Line counts / arms / the shared preamble each arm needs:

| controller | lines | arms | preamble that every subcommand re-resolves |
|---|---|---|---|
| `system/WikiController.ts` | 1062 | 17 (`switch` :84-126) | none; `registry()` :906; `requirePage` :840 shared by 7 arms |
| `social/PartyController.ts` | 341 | 15 (:49-82) | `isPartyMember(giver)` :43-47 |
| `social/ChatController.ts` | 501 | 13 (:47-85, bare post :87) | none |
| `social/ForumController.ts` | 561 | 11 (:95-124) | `resolveForums` :71-92 (`mixin-missing ForumsMixin`) |
| `author/PackController.ts` | 378 | 8 (:59-78) | none |
| `social/GroupController.ts` | 321 | 8 (:49-72) | `isAvatarStuff` :44-47; `findGroupByName` :300 shared by 6 |
| `social/SoulController.ts` | 359 | 8 (:56-75) | `holdsCatalogue` :84 (`AccessApi.canAtPath` :88) |
| `banking/BankController.ts` | 408 | 8 (:51-83) | `resolveBank` (`BankingControllerBase` :73-83) |
| `work/JobController.ts` | 745 | 5 (:99-118) | `MqlApi.resolveOne('reachable:[class.JobBoard]')` :92-98 |
| `inventory/EquipController.ts` | 902 | `set`/`sets` + flat (:191-199) | `isAttired` :181-189 |
| `stream/TuneController.ts` | 426 | 4 + bare (:93-111) | `parseTarget` :125 shared by 5 |
| `civics/TitleController.ts` | 685 | 4 (:130-141) | `atDeedDesk` :463 per arm |

Help already lists subcommands (`getHelpText` :489-506).

### The overlap census (re-measured)

52 subcommand/top-level pairs across 28 words and 371 views (script:
`/home/bobalu/.claude/jobs/2eb60486/tmp/planner/explore-sub/census.mjs`;
⚠ the slate said 50). **One true duplicate**: `fight defend` =
`combat/defend`. Same act, different operand: `title buy` / `retail/buy`,
`stall rent` / `retail/rent`. Every other pair is a homonym. The pairs
inside this build's nouns are listed in § Fault lines.

### The gates (re-measured, all exit 0 today)

- `scripts/pack-roots.ts` exports `packSources` :42, `packOfClassPath`
  :66, `classFileOf` :86, `composesMixin` :123, `extendsAny` :201,
  `classPathOfFile` :300, `packSrcFiles(srcDir)` :351 (every `.ts` under
  a pack `src/`), `declaredMixins` :401, `isTemplateRelPath` :567 (false
  when `cmd` is in the path — so `idea/cmd/*Controller.yaml` rows are not
  `templateRows`), `walkYamlFiles` :611, `templateRows` :637,
  `effectiveRow` :683, `fieldMetaEntries` :862. ⚠ There is **no shared
  `controllerFiles()`**; every gate rolls its own walk.
- `check-verb-collisions.ts`: own `commandViews` :43-70; `KNOWN_COLLISIONS`
  :93-99 — `lease`/`unlease` SAFE, and `pour: "platform: bulk/pour.yaml
  vs crafting/pour.yaml — undiagnosed."` (:98); header :25/:78 still says
  "nine"; ratchets both ways (a healed row left listed fails). 371 views,
  3 known.
- `check-instrument-args.ts`: walk :288-311 hard-codes
  `src/mud/platform/idea/cmd/**` and `<pack>/src/idea/cmd/**` — **this is
  why the ten domain-local controllers are skipped**: they live at
  `packages/content/terminus/src/{market,mayfield-row,university-avenue}/idea/cmd/`
  and `packages/content/eternal-university/src/duncan-hall/idea/cmd/`
  (ten `.ts`; rows under each pack's `content/world/terminus/**/idea/cmd/`).
  Their bases `terminus/src/lib/LettingController.ts`,
  `eternal-university/src/lib/HallController.ts`,
  `trade-ice/src/lib/IceActController.ts` are skipped too.
  `BESPOKE_RESOLUTION_CEILING = 1` :182; shapes `FOR_WALK` :227,
  `CHAIN_WALK` :231, `SPREAD_WALK` :249 (cannot cross a parenthesized
  cast — `BlowController.ts:92`, `TallyController.ts:105` would be
  missed), `ALIAS_DECL` :276; `TYPE_TEST` :224; `SURROUNDINGS` :189-205.
  375 controllers, 1 finding. No test, no fixture.
- `check-reachability.ts`: `commandViewFiles` :325, `scanSourceLiterals`
  :356 (walks every pack `src/`); ceilings `PHRASE_SHAPE 6` :837,
  `ARTICLE_SHAPE 114` :866, `UNNAMEABLE_GOOD 68` :893, `UNCONFERRED 0`
  :906, `UNDECLARED_ROW 0` :927; test + `scripts/__fixtures__/reachability/`.
- `check-completion-this.ts`: `COMPLETION_THIS_CEILING = 0` :39 (fails
  above and below); walks all of `src/mud` and every pack `src/`
  (:74, :93-103) — sees the ten.
- `check-object-verbs.ts`: `api/` only (`API_ROOT` :39); holds zero with
  no constant (:409); `EXEMPT_APIS` :48 (57).
- `check-controller-rows.ts`: every absolute `controller:` must name a row
  with `class:`; literal 0 (:106, :116); 373 refs.
- `check-arg-kinds.ts`: object args must declare `requires:` naming a
  declared mixin or `any`; 435 args (326 mixin, 109 `any`).
- `check-mixin-names.ts`: unique literal `_mixinName` (:131-137); a kernel
  name must be in `Mixins` (:139-140); `requires:`/`default:` tokens must
  be declared (:92-111). `Mixins` is `lib/mixin.ts:277` (Chattel :413,
  WaterPlace :472, LoadBearing :526, Metabolic :532, Organization :690,
  Crafted :659); `MixinRefusals` :897.
- `check-act-effort.ts`: TS-AST over every literal with `effortW` +
  `durationMs`; 51 checked, 31 unchecked (`plan.effortW` cannot be
  evaluated).

### The controller census (heuristic, re-derived)

385 controller files = kernel 264 + packs 111 + domain-local 10
(script and CSV: `/home/bobalu/.claude/jobs/2eb60486/tmp/planner/explore-gates/`
`census.py`, `controller-census.csv`; regexes recorded there). Kernel /
packs / world / all: **mutations** 217 / 208 / 15 / 440 (StuffApi
destruct·clone·create 54, `ContainmentApi.move` 80, `BulkableApi.*` 59,
foreign `.setX(` 211, foreign field writes 36); **module functions** 142 /
129 / 4 / 275; **decision tokens** 784 / 547 / 14 / 1,345; **duration
declarations** 20 / 40 / 0 / 60; **self-resolution** 352 / 52 / 10 / 414
(`StuffApi.find*` 24, `MqlApi.resolve*` 23, typed surroundings walks 13,
`.raw` 218, `toLowerCase` 125); **duck probes** 65 / 95 / 5 / 165.
⚠ Every one of these is a regex count (lint-family.md § *four ways a
census lies*, 1): the gates' own classifiers in W0 are the numbers of
record, and this build publishes those, not these.

### Duck typing (AST, re-derived)

302 probed names / 622 sites across 1,973 files (`duck.mjs`,
`duck-probes.csv`, `duck-report.txt` in the same scratch dir). ⚠ The
slate's "25 names / 61 sites declared by nothing" does not reproduce:
**15 names / 24 sites are declared by no class and no interface**, and
of those only five are method probes on a name nobody defines —
`beforeRestore` (`lib/location/FloorplanWarren.ts:370`), `setHandling`
(`trade-apiculture/src/lib/Colony.ts:630`), `grazingDemandPerGameDay`
(`trade-farming/src/location/Tract.ts:967`), `getFixedInPlace`
(`trade-mining/.../AssayController.ts:467`), `getVentilated`
(`trade-mining/src/lib/Working.ts:908`). The rest are data-key `'x' in`
checks on the archetype record (`lib/archetype/Archetype.ts` :377-612:
`heatK`, `bulkSource`, `seating`, `presence`, `lightLux`, `vesselKind`),
a validator-module shape (`CommandLogic.ts` :1219/:1230 `preload`) and the
thenable test (`then`/`catch`). The marker candidates:
- `availablePowerW` — classes `energy/src/lib/GridPowered.ts:139`,
  `trade-carpentry/src/thing/Sawmill.ts:154`,
  `trade-milling/src/thing/GristMill.ts:101`, kernel
  `lib/craft/Comminuting.ts:303`; the bare interface
  `lib/supply/Powered.ts:26`; probes `lib/pump/Pumping.ts:469`,
  `water/.../PowerReading.ts:83` → **four unrelated definers** ✓.
- `getReachRef` / `generationW` — classes `water/src/thing/Conduit.ts:232`,
  `ControlStructure.ts:142` (+ `:232`); probe-local interfaces in
  `Sawmill.ts:44-45`, `GristMill.ts:43-44`, `WatercourseCatalogue.ts:303`,
  `PowerReading.ts:62-63`; probes `Sawmill:169-170`, `GristMill:114-128`,
  `WatercourseCatalogue:1169`, `PowerReading:75-76` → two definers in one
  pack, probed from **two other packs** that declare no dependency ✓ (P4).
- `canBeNamedBy` — `lib/description/Named.ts:161/308`,
  `lib/craft/Crafted.ts:187`, `lib/craft/Assembled.ts:328`; read through
  casts at `Named.ts:310` and `Crafted.ts:189` → three definers ✓.
- `getGrade` — eight definers but `GradedMixin` (`lib/craft/Graded.ts:59`)
  and `isGraded` exist → non-use, not a missing marker.
- `getSampling` — one mixin (`lib/instrument/Sampled.ts:111`) → a
  predicate, not a marker. `getCellSize` — one chain
  (`platform/idea/location/CartesianZone.ts:48` ← `ReachZone`, `SeaZone`)
  → `instanceof CartesianZone`, not a marker.
- Predicate-exists non-use: `getContainer` ×8 (`isContainer`),
  `getQuantity` ×5 (`isStackable`), `getContents` ×2, `getHandling` ×2
  (`isHandling`), `'organization' in` ×7 (`isOrganization`), `tool` ×2,
  `store` ×1. `getMass` ×3 has no predicate (`Tangible`, `Creature`,
  `Coin`, `Rope` define it).

### Mixin persistence and composition (what makes the splits safe)

- Capture writes one slice per layer keyed by that layer's own
  `_mixinName` (`api/mixin.ts` :920-1000, key :939-945); **restore merges
  every `{fields}` slice by field name and ignores the key**
  (`PersistableLogic.ts` :746-762, over `getAllPersistentFields`
  :853-900). Only `hydrateSlice` layers restore by key (:847-852); none of
  the five declares one. So old snapshots restore after a split; new
  snapshots file the moved fields under the new layer's name.
- The composition exemplar: `lib/material/Alloyed.ts` :69-82 —
  `class AlloyedMixin extends TemperedMixin(CompositionMixin(Base)) {
  static _mixinName = 'AlloyedMixin' }` with an explicit
  `AlloyedClass<TBase>` return type (:76-80 says why: TypeScript
  inference collapses on a deep chain) and `interface Alloyed extends
  Composition, Tempered` (:67). `FromMixin` walks the caller's chain for
  an own `_mixinName` (`SecurityPolicies.ts` :399-433), so the composite
  must keep the old name static.
- Hosts: `OrganizationMixin` — `platform/idea/Organization.ts:35`,
  `platform/idea/Business.ts:397`; `WaterPlaceMixin` —
  `platform/location/Pool.ts:26`, `Compartment.ts:78`, water pack
  `Band.ts:59`, `SeaStop.ts:42`, `SeaPatch.ts:36`, `ReachStop.ts:40`,
  `ReachPatch.ts:60`; `MetabolicMixin` — `lib/creature/Creature.ts:182`;
  `LoadBearingMixin` — `Creature.ts:153`; `ChattelMixin` —
  `lib/stuff/Good.ts:74`, `Vessel.ts:81`, `lib/creature/KeptAnimal.ts:113`,
  `trade-ranching/src/agent/Livestock.ts:99`.
- Cluster bridges: `eat` → `this.canIngest` (`Metabolic.ts:579`) and
  `BulkableApi.ingestSolid` (:591, :612); `WaterPlace.pullOut` →
  `isLoadBearing(puller).getStrainCeiling()` (:642) and `canRise` →
  `getNetBuoyancyN` (:753); `Chattel`'s made-from is consumed only by
  `ChattelLogic.derivedTitle` (:307-325) and `ownerOfInputs` (:333-353).
  ⚠ `Chattel`'s made-from fields are **not persisted** (read once, on
  arrival — `Chattel.ts:290`, :303); the persisted maker is
  `CraftedMixin.maker` (`lib/craft/Crafted.ts` :153-161).

### The wire harness

`packages/wire`: `Session.open(handle, {wizard?, startLocation, parcels})`
(`src/harness/session.ts` :288) over `/auth/test-login`; `cmd(text)` →
`{status, notes, text, said()}` (:85-105, :620); `query`/`queryOne`
(:712/:795); `awaitActivity` (:811), `awaitPrompt`/`answerPrompt`
(:841/:860). Assertions `expectOk`, `expectRefused`, `expectNote(r, kind,
{reason})` (`assertions.ts` :31-41). Staging endpoints in
`src/harness/world.ts`: `/auth/test-clock` (:178-212), `/auth/test-hand`
(:315-328, clones a template into the hands), `/auth/test-weather`,
`/auth/test-ship`; ⚠ there is no `/auth/test-stage`. `WIRE_PORT` default
2012 (`boot.ts:37`; this worktree uses 2013). No wire test snapshots an
envelope today; `.wire/result.json` records per-test state only.
Exemplars: `ceramics-a.dirty.wire.test.ts` `act()` :135-157 (engagement
→ clock → `awaitActivity`), `forestry.dirty.wire.test.ts` :168-169
(`expectNote(…, 'controller-rejected', {reason: 'nothing-ripe'})`).

### What does NOT exist (so the build does not go looking)

- No `lint:controller-resolution`, `-mutations`, `-decisions`,
  `-functions`, `-duck-typing`, `-mixin-clusters`, `-subcommand-words`.
- No shared controller enumerator in `pack-roots.ts`.
- No plan/complete methods on `Growing`, `Soil`, `Cultivable`, `Vitals`,
  `Tariff`, `Placing`; no `orderPlanFor`, `treatmentPlanFor`,
  `harvestPlanFor`, `receivePour` anywhere.
- No note kind carrying an alternative; no `scope` on `ParsedCommand`.
- No `toss`, `hurl`, `recite`, `staff` view. (`hurl` is an alias of
  `throw`.)
- No pack-level `testOnly`; `testOnly:` is a view key only
  (`CommandLogic.admitsView` :137-139).

---

## ⭐⭐ New substrate

Each cites its ledger row (the slate's *Reuse ledger for the plan*) or
says *genuinely new* and what was searched.

| kind | name | ledger row / status |
|---|---|---|
| field | `ParsedCommand.scope?: string` | ledger "`@` in the command line" — generalizes the tokenizer; no new type |
| note kind | `other-offer { verb, source: StuffRef, scopedForm }` | ledger "telling the player the other offer exists" — generalizes the note kinds; a new kind because kinds are per-kind-frozen |
| note reasons | `command-rejected.reason` += `source-not-found`, `source-affords-nothing` | same row |
| method | `CommandGiver.matchAffordances(parsed)` | ledger "narrowing the affordances to one source" — generalizes `_runChain`; shared with `Interpreter.bindCommand` (it exists twice today) |
| assemble option | `CommandApi.assemble(…, {scopeSource})` | same row; the binder's `default:` machinery, per invocation |
| mixins (split halves) | `StaffedMixin`, `OnCallMixin`, `WaterStateMixin`, `HaulOutMixin`, `DigestingMixin`, `EatingMixin`, `CarryingMixin`, `BuoyantMixin`, `ChattelTitleMixin`, `MadeFromMixin` | ledger "a split mixin keeping its old name" — the `Alloyed` composition shape; ten `Mixins` entries |
| protocol mixins (markers) | `PoweredMixin` (from the bare `lib/supply/Powered.ts` interface), `WaterPoweredMixin` (`getReachRef`, `generationW`), `NameTakingMixin` (`canBeNamedBy`) | ledger "a registered marker mixin" — each has ≥2 unrelated definers and a by-name probe (§ Grounding → Duck typing) |
| protocol mixin | `PourTargetMixin` (`receivePour(req)`), hosts `BulkableMixin` and `ManualBuildMixin` | ledger "`pour` as one act" — rung 1; earned by two unrelated hosts |
| type change | `ActRefusal`/`ActPlan`/`ActOutcome` lose `line`/`beginSelf`/`beginPeers`; `ActOutcome<F>` carries facts; a reason union per act | ledger "an act's plan, refusal, outcome" — generalizes; same file `lib/craft/ActPlan.ts` (moving it is a sweep, not this build) |
| classes | ~75 per-subcommand controllers + 10 noun bases; `FightGambitController` + 7; `TossController`, `HurlController`, `ReciteController`; `HarvestWordedController` (the doctrine exemplar); the `staff` controllers | ledger "a subcommand with its own controller" (cockpit/house/trace shape) and "an alternate controller for one verb" |
| rows | one `<Name>Controller.yaml` per new controller in `packages/content/platform/content/platform/idea/cmd/<cat>/` | `lint:controller-rows` requires them |
| gates | `check-duck-typing.ts`, `check-controller-resolution.ts` (absorbs `check-instrument-args.ts`), `check-controller-mutations.ts`, `check-controller-decisions.ts`, `check-controller-functions.ts`, `check-mixin-clusters.ts`, `check-subcommand-words.ts`; `pack-roots.controllerFiles()` | ledger "count-only-falls gates" — the `object-verbs`/`instrument-args` pattern |
| wire | `packages/wire/tests/controllers-are-io.dirty.wire.test.ts` + the committed baseline JSON | ledger "the before/after record" |
| Api / hook / registry / document kind | **none** | — |

Searched and rejected: a `RemedyMixin` for `treat` (one host, Dressing —
a property wearing a verb's clothes); a `ServiceMixin` for `order`
(`PricedOfferMixin` is already the provider shape, so it gains a method);
a central act registry (⛔ rejected by the owner, verb-interfaces slate).

---

## Plan-level decisions

### D1 — `@` splits in the tokenizer; `format()` re-emits it; aliases carry it

- `CommandLineLogic.parsePipelineImpl` (:305-325): after `classify`, if
  `rawTokens[0]` is a word whose value has `@` at an index **greater than
  0**, then `verb = value.slice(0, i)` and `scope = value.slice(i + 1)`
  (the first `@`; MQL has no `@`). The raw token is left intact, so
  `formatCommand` (:264) already round-trips byte-for-byte. `format()`
  must also handle a synthesized command whose token 0 lacks the `@`
  (after alias expansion): when `cmd.scope` is set and token 0 contains
  no `@`, emit `${token0}@${quoteIfNeeded(scope)}` — `parsePipeline`
  re-splits it. The round-trip property is unchanged and gets a test.
- A token whose `@` is at index 0 (`@bob hi`) is not split (unknown verb,
  as today). The split touches **only the verb token**; `say hi @bob`
  has `@` in token 2 and is never looked at — this is the whole guarantee,
  and it is a tokenizer unit test (`say hi @bob`, `say@me hi @bob`,
  `@bob hi`, `wind@"pocket watch"`, `pour@me:flask into glass`).
- Multi-word scopes are quoted with `"`: `wind@"pocket watch"`. ⚠ The
  requirements' `wind@'pocket watch'` uses `'`, which the tokenizer treats
  as a literal (apostrophes in chat); see *Requirements disagreement*.
- **Aliases.** `ShellLogic.expandAliases` (:88-113) looks up `parsed.verb`
  (now bare) and rebuilds the command; the invocation's `scope` is copied
  onto the result after `expandRecursive` and after `stripBypassPrefix`
  (an alias body may carry its own `@`; the invocation's scope wins —
  `w@watch` with `w → wind $@` yields `wind@watch`). `\wind@watch` bypasses
  the alias and keeps the scope.
- The input echo (`_emitInputEcho`) and `CardLogic` need nothing: both go
  through `format`.

### D2 — source-filter semantics, the source fills its slot, cardinality, batch

- **Resolution.** In `CommandGiver.matchAffordances(parsed)` (new, shared
  with `Interpreter.bindCommand`): if `parsed.scope` is set, resolve it
  with `MqlApi.resolveMany(scope, ctx)` using the same `MqlContext` the
  binder builds for a `scope: [reachable]` object arg (a bare word walks
  reach; `me`, `here`, `#id`, chains and `all` are MQL's own). Sync.
- **Which affordances count as "from" a source `s`:** `a.source === s`,
  **or** `s === giver && a.bucket === 'self'` (a catalogue pushed on the
  giver's `self` bucket — spells, the advancement catalogue — is the
  giver's own; `cast@me` means your casting). A mixin's contributions are
  its host's, so "the object's own" and "its mixins'" are one thing. A
  room's `environment`/`inventory` contributions are the room's
  (`here@…` works). Shadow sources are their own Stuff and are not `me`.
- **Zero matches** → `command-rejected { reason: 'source-not-found',
  detail: scope }`, prosed by the dispatcher ("You see no 'nonsense' to
  do that with."). **Matches but none affords the verb** →
  `command-rejected { reason: 'source-affords-nothing' }` ("The pocket
  watch offers no `say`."). Both fail closed and loud (P3).
- **Several match.** Feed them to `CommandApi.applyCardinalityPolicy`
  (ledger) with spec `{type: 'object', onExcess: 'prompt'}`, `fname:
  'source'` and the `how` the binder derives from the desugared query
  (`isSet`, `quantity`; the derivation is factored out of the resolve
  sites in `CommandLogic` ~:1480-1580 into one logic method). An
  interactive giver is asked "which watch?"; a script or NPC gets the
  `cardinality:ambiguous` refusal and never waits (Q5). A scope that
  declared plurality (`all watches`, `3 watches`) returns the set →
  **batch**: `_runChain` runs the chain once per source in order, each
  with its own attempt ctx (`commandSource` = that source), and folds
  every attempt's notes onto the outer ctx, which becomes the one
  envelope. Scenes are each controller's own, as today.
- ⭐ **The source fills the slot it fits.** `CommandApi.assemble(parsed,
  command, {…, scopeSource})`: for the **first** positional object arg
  whose `requires:` the source satisfies — (a) if the line typed nothing
  for it, the source is bound to it (as a per-invocation `default:
  "#<stuffId>"`, the binder's own mechanism); (b) if the line typed a
  word for it and the source is among that word's matches, the source
  wins the slot (the scope resolves the ambiguity in its favor); (c) if
  the typed word matches things and not the source, typed words win and
  bind normally. This is what makes `wind@me:watch` wind the carried
  watch (the view's `target` is required, `wind.yaml:13-17`),
  `wind@all watches` wind each, and `pour@me:flask into glass` pour from
  the flask. `say@me hello` and `set@watch 4:00` have no object slot and
  are unaffected. Lens 1: the thing you scoped to is the thing you mean —
  derivable, one rule. ⚠ This is the decision the owner may not expect;
  without it drive steps 1–3 cannot pass as written.
- An unscoped command is byte-identical to today: `scope === undefined`
  short-circuits every branch above.

### D3 — the other offer: one new note, worded by the dispatcher

- **Detection.** In `_runChain`, after the chain settles on a refusal —
  a field `validator-failed` that stood (`firstRefused`) or a
  `controller-rejected` note on the claiming attempt — probe every
  remaining match for the same verb whose `source` differs from the one
  that answered: `assemble` (with `scopeSource` = that source, so the
  source fills its slot), `resolveModel` with `interactive` stripped (a
  prompt can never fire from a probe; an ambiguity counts as "would not
  take"), `preloadValidatorDeps`, `runValidators`. The first that passes
  is the other offer. Bounded by the handful of same-verb affordances;
  runs only on refusals.
- **The note.** `other-offer { verb, source: StuffRef, scopedForm }`
  (new kind in `packages/types/src/index.ts`, appended to the `Note`
  union; `docs/subsystems/response-envelope.md` gains its row and the
  count becomes 30). Emitted on the claiming ctx; **prosed by the
  dispatcher** in `proseForFrameworkNote` — it is a dispatcher fact, not
  a controller's: *"The wheat on the far bed also answers `harvest` —
  `harvest@here:2nd wheat`."* The controller's own refusal words are
  untouched (lens 2: the controller owns its wording, the dispatcher owns
  the chain's).
- **The scoped form** is derived by one rule, never authored: `me` when
  the source is the giver; `me:<handle>` when the giver's container chain
  holds it; `here:<handle>` when the location holds it; `<handle>`
  otherwise — `handle` being the presentation's handle form
  (`presentation.md`). When that form resolves to more than one thing,
  the ordinal of this source in the resolved order is prefixed
  (`2nd wheat`), which the binder's natural-language layer already reads
  (`mql-grammar.md` :665). The generator proves its own form by resolving
  it once.
- "Would have taken the line" is a **binder** fact (its view binds your
  words); the note says *also answers*, not *would have succeeded* — the
  controller is never run speculatively.

### D4 — one outcome convention; the words come off the object

`lib/craft/ActPlan.ts` becomes:

```ts
export interface ActRefusal<R extends string = string> { ok: false; reason: R; facts?: Readonly<Record<string, unknown>> }
export interface ActPlan<F = unknown> { ok: true; durationMs: number; effortW: number;
  onComplete: () => ActDone<F> | Promise<ActDone<F>>; onAbort?: (reason: AbortReason) => void }
export type ActDone<F = unknown> = ActOutcome<F> | ActRefusal;
export interface ActOutcome<F = unknown> { ok: true; facts: F }
```

- No `Mml`, no `line`, no `beginSelf`/`beginPeers`. Each protocol file
  declares its reason union beside its request type (`type CarveRefusal =
  'too-hard' | 'no-stock' | …`) and its facts type; a controller's wording
  is a `switch` over the union with an exhaustiveness `never` arm, so an
  unmapped reason fails `tsc`, not the player.
- `ManualBuildController.engagePlan(context, plan, words)` takes the
  controller's words: `{ beginSelf: Mml, beginPeers?: Mml, onRefused:
  (r: ActRefusal) => Mml, onDone?: (facts) => { self: Mml, peers?: Mml } }`.
  The late-refusal path (:162) sends `words.onRefused(out)`. `declineStep`
  and `turnDown` take a reason and the controller's own line, as now.
- `engageAct` (`EngagedActController`) gains the same `plan` overload so
  Harvest/Plant can hand an `ActPlan` straight through; `cost` (felt %)
  stays for the ground verbs that still use it. The object computes
  `effortW` with `actor.wattsForFeltCost(cost, durationS)` where it used
  to pass a cost (Harvest's 6, Plant's 5), so the body spends the same.
- Credit: an outcome's facts may carry `credit?: {discipline,
  difficulty}`; `engagePlan`/the controller records the deed. (The
  `Workable` vocabulary is **not** converted here — deferred, see
  § Deferred seams.)
- Every implementer in § Grounding → *Implementers that build `line:`*
  is rewritten: each `line:` becomes a `reason` from the file's union
  (facts where the sentence used a number — the hand, the mass, the
  count); each consuming controller gains the `switch` with the verbatim
  former words. Pack implementers compile against the kernel type and
  must change in the same wave; every touched pack's vitest runs.

### D5 — durations and effort move with the act

For the verbs in scope: Harvest and Plant's inline durations and costs,
Order's `12000` bath and the transfusion duration, crafting Pour's
`POUR_MS`/`150` and bulk Pour's `WATCH_EFFORT_W` move into the objects'
plans (D11, D12). `lint:controller-decisions` counts the rest (the 52
constants) and they fall with the pack burn-down. Acceptance: the drive
record's `engagement-started.duration` per step is equal before and
after.

### D6 — the five mixin splits (the host table is in § Host placement)

Names and contents are in § Fault lines. Rules the build follows for each:

1. Two new files beside the old (`lib/employment/Staffed.ts` +
   `OnCall.ts`; `lib/location/WaterState.ts` + `HaulOut.ts`;
   `lib/metabolism/Digesting.ts` + `Eating.ts`;
   `lib/encumbrance/Carrying.ts` + `Buoyant.ts`;
   `lib/chattel/ChattelTitle.ts` + `MadeFrom.ts`), each a proper mixin
   (`_mixinName`, interface, IS/IS-NOT docstring, `fieldMeta` for the
   fields it carries, `commandContributions` for the views it affords).
2. The old file keeps its factory and interface and becomes the
   composition (`Alloyed.ts` :69-82 shape, with the explicit return type):
   `interface Organization extends Staffed, OnCall`;
   `OrganizationMixin = class extends OnCallMixin(StaffedMixin(Base)) {
   static _mixinName = 'OrganizationMixin' }`. `isX`, `FromMixin`,
   `findByMixin`, `requires:` and every content row keep working; no
   content moves.
3. Persisted field names are unchanged; a split only changes the capture
   slice's key, and restore is key-agnostic (§ Grounding). A unit test per
   split captures a host, materializes a fresh one, and reads every
   persisted field back equal.
4. `Mixins` gains the ten names; `MixinRefusals` only where a view's
   `requires:` names a half (none planned).
5. `EatingMixin`'s base type is `MixinConstructor<Stuff & Digesting>`
   (`eat` calls `this.canIngest`); `CarryingMixin` imports
   `NEUTRAL_DENSITY_KG_M3` from `Buoyant.ts`; `HaulOutMixin` keeps its
   `MixinApi.isLoadBearing(puller)` read (a cross-mixin read through the
   predicate — not a bridge).
6. `Organization`'s third cluster (`name`, `getName`, `setName`,
   `presentationPhrase`) rides `StaffedMixin` — the chart carries the
   organization's name. ⚠ Judgment, not a split: the requirements name
   two ideas.

### D7 — markers: three minted, five fixed, the rest replaced

- **Mint** (≥2 unrelated definers + a by-name probe): `PoweredMixin`
  (`lib/supply/Powered.ts` — the existing bare interface becomes the
  protocol mixin; hosts `GridPoweredMixin`, `ComminutingMixin`, `Sawmill`,
  `GristMill`; probes at `lib/pump/Pumping.ts:469` and
  `water/.../PowerReading.ts:83` become `MixinApi.isPowered`);
  `WaterPoweredMixin` (`lib/supply/WaterPowered.ts`: `getReachRef(): string
  | null`, `generationW(): number`; hosts `water` `Conduit`,
  `ControlStructure`; the probe-local `PowerTake`/`Generator` interfaces in
  `Sawmill.ts`, `GristMill.ts`, `WatercourseCatalogue.ts`,
  `PowerReading.ts` are deleted and replaced by `isWaterPowered`);
  `NameTakingMixin` (`lib/description/NameTaking.ts`: `canBeNamedBy`;
  composed by `Named`, `Crafted`, `Assembled`; the casts at `Named.ts:310`,
  `Crafted.ts:189` become `isNameTaking`). Each is presented as the verb
  or question it serves (verb-interfaces § 2) — a one-line docstring,
  nothing more this build.
- **Fix the five dead names** (⛔ `?.()` on a name nobody defines):
  `beforeRestore` (`FloorplanWarren.ts:370`), `setHandling`
  (`Colony.ts:630`), `grazingDemandPerGameDay` (`Tract.ts:967`),
  `getFixedInPlace` (`AssayController.ts:467` — `Containable` has
  `fixedInPlace`), `getVentilated` (`Working.ts:908`). Each is either
  wired to the method that exists or deleted with its dead branch; the
  build records which, per site, in the W2 commit.
- **Type, don't probe:** the archetype record's `'x' in` keys get an
  interface (`Archetype.ts` :377-612); the validator module shape
  (`CommandLogic.ts` :1219/:1230) gets a type; the thenable tests
  (`then`/`catch`) are the gate's one allowlisted idiom.
- **Replace where a predicate exists:** `getContainer` ×8, `getQuantity`
  ×5, `getContents` ×2, `getHandling` ×2, `'organization' in` ×7, `tool`,
  `store`; `getGrade` → `isGraded` (a definer that does not compose
  `GradedMixin` is a finding, recorded, not papered); `getSampling` →
  `isSampled` (add the predicate if absent); `getCellSize` →
  `instanceof CartesianZone` (a kernel class, importable by packs).
  `getMass` stays a finding (four unrelated definers, no mixin — a
  `MassiveMixin` is a question for the mass gate's owner, not this build).

### D8 — seven gates, census then ratchet, every controller file counted

- `pack-roots.controllerFiles()` (new): kernel
  `src/mud/platform/idea/cmd/**/*Controller.ts` + every file
  `packSrcFiles(srcDir)` returns whose name ends `Controller.ts` (this
  reaches `src/<locality>/idea/cmd/` and `src/lib/*Controller.ts`).
  `check-instrument-args.ts` and `check-completion-this.ts` are refitted
  onto it (completion-this already saw the ten; its count must not move).
- Each gate: a ceiling constant = its own W0 census; fails above, logs
  below; `--advisory` prints the full table; a test under
  `scripts/__tests__/` with fixtures asserting a **positive** finding
  (lint-family.md lesson 3), and the invariant *at or below the ceiling,
  above zero* (lesson 2). `docs/lint-family.md` gets one entry per gate.
  The family picks them up with no list edit.

| gate | counts | noise control | ceiling |
|---|---|---|---|
| `lint:duck-typing` (`check-duck-typing.ts`) over all of `src/mud` + pack `src/` | by TS-AST: `?.(name)`, `typeof x.name === 'function'`, `'name' in x` on a non-literal, `as unknown as {…}` casts; each probed name classified against declared class/interface members — **undefined** (zero after W2, hard), **one chain**, **≥2 definers** | the thenable idiom allowlisted; data-record `'x' in` on a typed record not counted | undefined = 5 → 0; probes = W0 count |
| `lint:controller-resolution` (absorbs `instrument-args`) | instrument-args' four walk shapes (cast gap fixed) + `StuffApi.find*(` / `MqlApi.resolve*(` inside a controller + `.raw` **followed by a string method or regex test** + `toLowerCase()`/`replace(/^the\s+/`/`.includes(` on a model string + `constructor.name` | `.raw` in a `note(`/`Mml`/scene line is a refusal's words, not resolution; the 90 %-noise estimate came from bare `.raw`/`.includes` and both are excluded | W0 count per shape (the one `instrument-args` finding is one of them) |
| `lint:controller-mutations` | `StuffApi.(destruct\|clone\|create)(`, `ContainmentApi.move(`, `BulkableApi.*(`, `.setX(` on a receiver other than `this`/`ctx`/`context`/`model`, a field write `x.y =` whose receiver is not one of those or a controller-local literal | comments and strings stripped; `ctx.note`/`context.note` never counted | W0 count (heuristic today 440) |
| `lint:controller-decisions` | `Math.*(`, numeric literals ≥ 2 in arithmetic, comparisons against a literal, `const UPPER =` of a number/array/object, duration declarations (`_MS`/`_S`/`durationMs`/`effortW` literals) | string constants (`TOPIC`) excluded; a literal in a `note(`/`Mml` line excluded | W0 count (heuristic 1,345; durations 60) |
| `lint:controller-functions` | module-level `function`/`const f = (` declarations in a controller file | none needed | W0 count (heuristic 275) |
| `lint:mixin-clusters` | per mixin factory: connected components of members over `this.` references (a field merged with its accessors), components of ≥2 members; mixins with ≥2 such components | module-private helpers that take `this` as a parameter are edges | W0 count (slate: 45) → 40 after W2 |
| `lint:subcommand-words` | every `subcommands:` key (and subcommand alias) that is also a `verbs:` entry of any view, across every pack | sibling-held views are counted like any other — the gate is realm-wide | W0 = 52 → the W5/W6 remainder |

### D9 — the subcommand rule, applied

- **Per-subcommand controllers** for the twelve (§ Fault lines). Each
  noun gets a base (`<Noun>ControllerBase extends CommandController`)
  holding the preamble as a method (`resolveWiki`, `requireMember`,
  `resolveForums`, `requireCatalogue`, `resolveBoard`, …) and the few
  helpers two or more arms share; everything an arm alone used goes into
  that arm's controller. Views: each subcommand gets `controller:`; the
  verb-level `controller:` is dropped where every subcommand has one and
  kept pointing at the bare-form controller where `fallthrough: true`
  (`chat`, `forum`, `tune`, `wiki`, `equip`). Where a preamble resolved
  the noun by hand (Job's board), it becomes a subcommand arg with a
  `default:` (`requires: any` with `[class.JobBoard]`, as `charter`/`berth`
  do). One row per controller.
- **Fight.** The twelve gambit words are one act (`Combatant.queueGambit(name)`)
  → one `FightGambitController` named by twelve subcommands; `status`,
  `break`, `rush`, `switch`, `draw`, `finish`, `yield` get their own.
  `defend` routes to `combat/DefendController` (the one true duplicate:
  same beat). The six renamed words are grain. `fight.yaml:103`'s
  `VitalsMixin` on a weapon slot is corrected to `WieldableMixin` in
  passing (a finding, one line).
- **Flat verbs that move under a noun** this build: `appoint`/`dismiss`/
  `apply`/`quit` → `staff <sub>` (grain; the noun a seat is operated
  through); `draw` → `wallet draw` and `subdivide`/`transfer` → `title …`
  in W6. `tip`/`collect` stay flat (a jar is a thing you put money in);
  `pay` stays flat (a recipient, an act). The old top-level words stay as
  **alias views** — the old view file keeps its `verbs:`, loses its body
  and points `controller:` at the new per-subcommand controller with the
  same args — so a saved `appoint bob` runs unchanged (ledger "old
  top-level word kept working").
- **Which pairs are decided** and how is the § Fault lines table. The
  rule for renames: the physical/common verb keeps the word; the
  subcommand takes a word of its own. Renamed subcommand words are **not**
  aliased (that would re-create the pair); a saved script naming one is a
  break this build accepts, see *Requirements disagreement* 4.
- `carve` **gains options**: `--with <knife>`, `--of <material>`,
  `--for <purpose>` beside its one natural preposition (`carve X from
  Y`); the old preposition forms keep binding (the view declares both;
  `help carve` shows the option form first). Other kernel bench verbs in
  scope with ≥4 prepositions (`plant`, `harvest`, `treat`): `plant` and
  `harvest` gain `--with`/`--at`/`--in` beside their first preposition;
  `treat` gains `--with`/`--for`. Nothing a player typed changes meaning.

### D10 — three real splits: throw, tan's lift, read's cast

- **Throw** → `toss <item> to <person>` (catch; `TossController` over
  `Tossable.tossTo`, afforded by `TossableMixin` on `inventory` — the
  line in your hands), `throw <item>` (pitch; `lob`/`heave` aliases;
  afforded as today), `hurl <item> at <target>` (attack; `HurlController`;
  the consent gate `mayDeliverTo` and `initiateCombat` stay where they
  are on `Combatant`; the delivery moves to `Combatant.deliverThrown`).
  `throw X to Y` / `throw X at Y` keep binding (optional `to`/`at` slots)
  and **refuse with a teaching line** naming the new word (the refusal is
  the progression UI). Collision ladder: three words, no shared shape, no
  dispatcher trick needed.
- **Tan's lift** → no new word. The hide becomes leather when it leaves
  the pit: `TanningMixin.onLiftedFrom(pit, by)` (bark, penalty band,
  `becomeLeather`, the deed), fired from `Tanpit`'s containable-removed
  hook with the remover from the move's custody. `tan` lays in only;
  `get hide from pit` is the lift — exactly what the controller's
  docstring promised (:26-27). ⚠ Risk: the removal hook must carry the
  actor; if `onContainableRemoved` does not, the build threads the mover
  through `ContainmentApi.move`'s existing custody derivation (it already
  knows who moved what) rather than adding a verb.
- **Read's cast** → `recite <scroll>` (`magic/ReciteController`, `magic`
  category) afforded by the scroll's own class (the Arcane +
  Marked + Consumable thing) on `inventory`/`peers`; `read` never casts.
  `cast <spell>` is untouched.

### D11 — the type dispatchers become protocols on the model

- **`order`**: `PricedOfferMixin.orderPlanFor(req: {actor, kind, subject?,
  brand?, hand}) : ActPlan | ActRefusal` with a refusing default;
  `Tariff` overrides and dispatches by kind to the house's objects
  (`Tub.drawFrom`, `Hygienic.bathe`, `Garment.launderBy`,
  `DonationBank.transfuseInto`, `Postmortem.interIn`,
  `ConditionApi.treatWorstResolvable`, `CraftingApi.repair`) — each a
  call the controller makes today, now made by the provider;
  `CommerceMenu` overrides for the menu. The view: `service` (string, the
  first word), `subject` (object, optional, `for`, `requires: any` — a
  corpse, a garment, an item to repair), `brand`, `counter` (as today
  but `onExcess: prompt`, which retires the two-houses scan), `menu`.
  The controller words the quote, confirms the price (`promptConfirm` is
  I/O), engages the plan, words the outcome.
- **`treat`**: `VitalsMixin.treatmentPlanFor(req: {by, with?, named?}) :
  ActPlan | ActRefusal` — the patient picks the wound (bleeding first),
  the difficulty, the outcome band, applies the dressing / takes the
  fluid / tends the infection, and returns facts (site, outcome,
  `credit`). The remedy answers through what it is (`isDressing` →
  `getDressingQuality`; `isBulkable` → the interior litres; neither →
  hands and the actor's `cleanTier`). The `for` word resolves against the
  condition catalogue inside Vitals (it is the body's own vocabulary).
- **`put`**: `PlacingMixin.placementFor(word?: string)` (which placement
  a preposition names; the offers list), `SlottedMixin.openSlotFor(item)`,
  `ContainerMixin.canAddContainable` (exists); the controller asks the
  target which mode the words name and calls `ContainmentApi.move(item,
  target, placement)` — the one movement primitive (an Api that
  orchestrates is allowed; it is not a rule). `Feeder.noteFilledBy`
  becomes `Feeder`'s own `onContainableAdded` consequence.
- **`harvest` / `plant`**: `GrowingMixin.harvestPlanFor({actor, tool,
  part})`, `SoilMixin.harvestPartFor` / `sowPlanFor({actor, seed, drill,
  part})`, `CultivableMixin.plantPlanFor({actor, seed})` — each returns an
  `ActPlan` whose `onComplete` does what `landSwath`/`landSowing` do
  today (mint, stamp, grade, draw nitrogen, settle, title) and returns
  facts (count, mass, grade, the standing phrase's ratio). `HarvestController`
  becomes: read the model → ask the plant (or the bed, for a part) → word
  the refusal or the beginning → `engageAct(plan, words)` → word the
  facts. Its wording is three overridable methods (`wordRefusal`,
  `wordBegin`, `wordDone`) — which is what `HarvestWordedController`
  overrides for drive step 16.

### D12 — `pour` unified (rung 1), `KNOWN_COLLISIONS` drops a row

`PourTargetMixin` (`lib/bulk/PourTarget.ts`): `receivePour(req: {actor,
source, measure?, exact?}) : ActPlan | ActRefusal` with a refusing
default. `BulkableMixin` composes it (transfer, the after-hooks, the
credit rules, the mould watch as a plan with `Mould.getPourDurationS` and
the watch's effort); `ManualBuildMixin` composes it (the graded-bottle
contribution and the discrete-ingredient path, paced by `paceMs` on the
vessel, `POUR_MS`/`150` now the vessel's). One view `V/bulk/pour.yaml`
`verbs: [pour, add]`, `source` (`requires: any`), `target`
(`into`/`in`/`to`, `requires: PourTargetMixin`), options `amount`,
`exact`; `crafting/pour.yaml` is deleted and `ManualBuildMixin`'s
contributions name the bulk view. `check-verb-collisions.ts` :98 is
removed (the gate fails if it is left), and its header's "nine" becomes
"two". `lint:arg-kinds` admits `PourTargetMixin` once it is in `Mixins`.

### D13 — the before/after record, captured before W1

W0 lands `packages/wire/tests/controllers-are-io.dirty.wire.test.ts`
with drive steps 10–15 as named checkpoints and a recorder that writes,
per step, `{status, notes: [{kind, reason}], duration:
engagement-started.duration, state: <mql-query facts>}` — no prose — to
`packages/wire/tests/__fixtures__/controllers-are-io/baseline.json` when
`CAIO_RECORD=1`, and **compares** against it otherwise. The baseline is
committed in W0 (a record of reasons, durations and state, not a content
golden). Every later wave runs the file; a diff is a finding. Step 10's
growth is `staged` (the plant's stage set with `eval`, not the clock).

### D14 — drive step 16, the doctrine test, in a `.dirty` wire file

`HarvestWordedController` (`platform/idea/cmd/inventory/`, `@internal`,
documented in `command-spec.md` as *the* alternate-controller exemplar)
extends `HarvestController` and overrides only the three wording
methods. Its row ships in the platform pack. The drive: a wizard session
`eval`s `DocumentApi.save('/platform/cmd/inventory/harvest',
'command-view', {…controller: '/platform/idea/cmd/inventory/HarvestWordedController'})`
(wizard code trust, live via `CommandApi.reload`), harvests the twin of
step 10's plant, asserts state and `engagement-started.duration` equal
to step 10's record and the prose different, then restores the view
(`DIRTY_REASON`: a shared view is rewritten).

### D15 — what the dispatcher owns, what the controller owns (restated for the build)

The dispatcher proses: `command-rejected` (incl. the two new reasons),
`other-offer`, `mql-error`, `validator-failed`, `controller-error`. A
controller proses everything after its `execute` began. A moved act's
refusal is a `controller-rejected { reason }` note **plus** the
controller's own line — the reason string is the act's closed union
member, unchanged across the move (acceptance: same refusal reason).

---

## ⭐⭐ Host placement

Two tests for every row: no guard re-narrows the host set; and an honest
default does not answer "no" on most hosts. Findings the rule produces
are written down here, not coded around.

| new mixin / field | host(s) | what composing it claims | finding |
|---|---|---|---|
| `StaffedMixin` | `platform/idea/Organization` (:35), `Business` (:397) via the composite | every organization has a chart and a roster | — |
| `OnCallMixin` | same, via the composite | every organization answers *who is called for this* | ⚠ **honest-default finding**: `call` is authored on 37 business rows and on no government or publisher; on a non-business `Organization` the default answers "nobody". Kept on the composite because the requirement is that nothing already built loses what it composes; the honest host is `BusinessMixin`. → mixin-slate |
| `WaterStateMixin` | the seven water places | every water place has water, a column and a tide | — |
| `HaulOutMixin` | the seven water places via the composite | from every water place somebody can be pulled out onto the bank or deck | every host answers yes (Pool, Compartment, a band, a reach) |
| `DigestingMixin`, `EatingMixin` | `Creature` (:182) | every creature digests and can eat | — (as today) |
| `CarryingMixin`, `BuoyantMixin` | `Creature` (:153) | every creature bears a load and displaces water | — (as today; `Respiration.ts:1232` and `WaterPlace.ts:753` read buoyancy) |
| `ChattelTitleMixin` | `Good`, `Vessel`, `KeptAnimal`, `Livestock` via the composite | every one can be owned and titled | — |
| `MadeFromMixin` | same, via the composite | every one may carry its inputs' owner onto itself | ⚠ **finding**: an animal is not made from inputs (ranching writes SERVED only); on `KeptAnimal`/`Livestock` the default answers "no". Kept on the composite for the same reason; the honest hosts are `Good` and `Vessel`. → mixin-slate |
| `PoweredMixin` | `GridPoweredMixin`, `ComminutingMixin`, `Sawmill`, `GristMill` | each can say how much power it can draw now | the four already define it |
| `WaterPoweredMixin` | `Conduit`, `ControlStructure` (water pack) | each takes power from a reach | pack hosts compose a kernel protocol — the P4 shape |
| `NameTakingMixin` | `NamedMixin`, `CraftedMixin`, `AssembledMixin` | each can say who may name it | the three already define it |
| `PourTargetMixin` | `BulkableMixin`, `ManualBuildMixin` | a bulk holder and a build vessel can each receive a pour | two unrelated hosts, earned |
| `ParsedCommand.scope` | the parsed command (a value, not a Stuff) | — | — |
| `orderPlanFor` | `PricedOfferMixin` (default refuses), `Tariff`, `CommerceMenu` | a priced offer may answer an order | a `PricedOffer` that is neither refuses honestly |
| `treatmentPlanFor` | `VitalsMixin` | a body can be treated | — |
| `harvestPlanFor` / `plantPlanFor` / `sowPlanFor` | `GrowingMixin` / `CultivableMixin` / `SoilMixin` | a plant can be harvested, a pot planted, a bed sown | the views already require these |
| `placementFor` / `openSlotFor` | `PlacingMixin` / `SlottedMixin` | — | — |
| `onLiftedFrom` | `TanningMixin` (trade-tanning) | a hide knows what leaving the pit means | pack-local |
| `HarvestWordedController` | a controller row, not a host | — | — |

---

## Convention conformance

- `props:`/`cast:`: no content rows change designation; the new rows are
  controller rows (`class:` + `data: {}`). Locations: none added. The
  `<root>/<branch>/` pattern: every new controller at
  `/platform/idea/cmd/<category>/<Name>Controller`, every new mixin under
  `lib/<subsystem>/`, no new category (`magic` holds `recite`; `staff`
  views under `employment/`). Persistence per content: no row changes
  staged/live; a split moves no field's persistence (P6).
- Module scope declares; lifecycles initialize: the new mixins and
  controllers add no module-scope statements; `check-module-scope`
  unchanged. The import boundary (`lint:imports`): mixins import nothing
  outside `src/mud`; the gates are `scripts/`, outside the boundary.
- Verbs on objects: no new `XApi.verb(host, …)`; `lint:object-verbs`
  stays at zero. The one orchestrating Api call kept is
  `ContainmentApi.move` (the one movement primitive).
- No new module category, no free helper: the new scripts are gates; the
  per-noun bases are controllers; the outcome types are value types in an
  existing `lib/craft/` file.
- P3 refuse/skip/throw: every new dispatcher path is a note + prose
  (`source-not-found`, `source-affords-nothing`, a cardinality refusal
  for a script) — nothing degrades to "top" silently. P4 no duck typing:
  three markers minted, five dead names fixed, and a gate holds the
  count. P5 the mixin decides: every moved rule is a method on the
  object that owns the state; the controller reads, calls, words. P7
  load on use: no boot entry; the markers are composed, the plans are
  called. P8 names: classes named for what they are (`Carrying`, not
  `LoadBearingHalf`); the common word stays with the body verb at every
  pair; one verb per act (`toss`/`throw`/`hurl`, `recite`).
- **Lint gates this build must pass**: the whole family
  (`pnpm -C packages/server lint:family`), with particular attention to
  `lint:mixin-names` (ten + four new names), `lint:arg-kinds`
  (`PourTargetMixin` in `requires:`), `lint:controller-rows` (~90 new
  rows), `lint:reachability` arm A (every new view named by a static —
  `toss`, `hurl`, `recite`, `staff`, the alias views), `lint:verb-collisions`
  (the `pour` row removed; no new pair), `lint:completion-this` (zero,
  both ways), `lint:act-effort` (the moved durations evaluate),
  `lint:self-contributions`, and the seven new gates at or below their
  ceilings.

---

## Waves

Each wave is independently landable and ends at one commit
(`build(controllers-are-io W<n>): …`). Mid-build verification is
`pnpm test:near` + every touched pack's vitest + `lint:family`; the full
suite runs at code-complete and at `/finalize` only.

### W0 — the gates and the baseline

Goal: every link has its count before anything moves, and the drive's
before-record exists. Decisions: D8, D13.
- `scripts/pack-roots.ts`: `controllerFiles()`; refit
  `check-instrument-args.ts` and `check-completion-this.ts` onto it (the
  latter's count must stay 0; the former becomes
  `check-controller-resolution.ts` and `lint:instrument-args` is
  removed from `package.json` — the family is derived).
- The seven gates (D8 table), each with its test + fixture asserting a
  positive finding, ceilings = their own census. `docs/lint-family.md`:
  seven entries; the `verb-collisions` header's stale "nine".
- `packages/wire/tests/controllers-are-io.dirty.wire.test.ts`: steps
  10–15 with the recorder; run once with `CAIO_RECORD=1` against a
  booted world (`WIRE_PORT=2013`), commit the baseline JSON.
Acceptance: `lint:family` green with the seven new gates listed by
`--list`; each new gate's fixture test fails when its fixture violation
is removed; the baseline JSON is committed and the file passes against
it. Commit.

### W1 — `verb@source` and the other offer

Goal: drive steps 1–5 and 18 (the alias case). Decisions: D1, D2, D3, D15.
Files: `api/command-line.ts` (`scope`), `CommandLineLogic.ts` (split,
`format`), `ShellLogic.ts` (carry), `CommandGiver.ts`
(`matchAffordances`, `_runChain`: scope filter → cardinality → batch;
the other-offer probe; prose), `lib/script/Interpreter.ts`
(`bindCommand` → `matchAffordances`), `api/command.ts` +
`CommandLogic.ts` (`assemble` `scopeSource`; the `how` derivation
factored), `packages/types/src/index.ts` (`other-offer`, two reasons),
`docs/subsystems/command-parsing.md` (the `@` form), `command-routing.md`
(the scope filter, the other offer), `response-envelope.md` (the kind),
`mql-grammar.md` (one line: the scope is an MQL expression),
`shell-alias.md` (carry). ⚠ `_runChain` is also edited by
client-surface (the "Ring what?" prompt); the scope filter is applied
to `matches` before anything else so the two changes compose.
Tests: tokenizer (the five forms + round-trip), `CommandGiver` unit tests
(scope filter, self bucket, source-fills-slot (a)(b)(c), batch, the
non-interactive refusal, the other-offer probe never prompts),
`Interpreter` (a scoped verb in a script), wire steps 1–5, 18.
Acceptance: an unscoped command is byte-identical (the W0 baseline file
passes unchanged); steps 1–5 pass; `say hi @bob` is untouched. Commit.

### W2 — the five splits and the markers

Goal: drive step 17; `lint:duck-typing` undefined = 0;
`lint:mixin-clusters` 45 → 40. Decisions: D6, D7.
Files: the ten new mixin files + the five old (compositions); `lib/mixin.ts`
(`Mixins`); `lib/supply/Powered.ts` → mixin, `lib/supply/WaterPowered.ts`,
`lib/description/NameTaking.ts`; the hosts named in D7; the five dead
names; the predicate replacements; `docs/subsystems/mixins.md` (the
composition-of-halves shape), `employment.md`, `underwater.md`,
`metabolism.md`, `encumbrance.md`, `chattel.md`, `energy.md` (the
markers). ⚠ Merge note: client-surface adds `showShiftStatus` to
`Organization.ts`; it belongs in `StaffedMixin`.
Tests: per split, capture → materialize round-trip reading every
persisted field (`PersistableApi`), plus the existing suites of each host
unchanged; `lint:mixin-names`; wire step 17 as `staged` (the four states
captured and re-materialized through `eval`, read back by player verbs).
Acceptance: all five composites keep their `_mixinName`; every
`requires:`/`FromMixin`/`findByMixin` site unchanged; ceilings lowered in
the two gates' constants. Commit.

### W3 — the outcome convention

Goal: one shape, words on the controller, durations where they already
were. Decisions: D4, D5 (the type half).
Files: `lib/craft/ActPlan.ts`; `ManualBuildController.engagePlan` (+
words), `EngagedActController.engageAct` (plan overload); the nine
protocol files' reason unions; every implementer in § Grounding →
*Implementers*; the twelve consuming controllers (verbatim words into a
`switch`); `FitController`'s `pasteOn` arm and `StrikingDie.strikeWith`
onto the same shape (so the "not ActPlan" exceptions close);
`docs/subsystems/crafting.md` § the act protocols,
`command-spec.md` § *Resolution outcomes*. Packs touched: ceramics,
quarrying, glass, chandlery, papermaking, baking, carpentry, tailoring,
cordage, dairying, sugar, water, smithing — each pack's vitest runs.
Acceptance: `tsc` green with every reason mapped (the `never` arm); the
ceramics/cordage/glass wire files unchanged in outcome; `lint:act-effort`
unchanged or better; `grep -rn "line: Mml" lib/craft lib/material
lib/mould platform/thing packages/content/*/src` returns nothing.
Commit.

### W4 — the kernel acts onto their objects

Goal: drive steps 6, 10–16; `lint:controller-{mutations,decisions,
functions,resolution}` lowered by the kernel verbs' share. Decisions:
D5, D10, D11, D12, D14.
Files: `Growing.ts`, `Soil.ts`, `Cultivable.ts`, `Plantable` +
`HarvestController`, `PlantController` (+ `HarvestWordedController` and
its row); `Placing.ts`, `Slotted.ts`, `Feeder` + `PutController`;
`PricedOffer.ts`, `Tariff.ts`, `CommerceMenu.ts` + `OrderController` +
`order.yaml`; `Vitals.ts` + `TreatController` + `treat.yaml`;
`Combatant.ts` + `ThrowController` → `TossController`/`HurlController`
+ `toss.yaml`/`hurl.yaml`/`throw.yaml` + the affording statics
(`Tossable`, the self bucket for `hurl`); `ReadController` +
`magic/ReciteController` + `recite.yaml` + the scroll's static;
`trade-tanning` `Tanning.ts`, `Tanpit.ts`, `TanController.ts`, `tan.yaml`;
`lib/bulk/PourTarget.ts`, `Bulkable.ts`, `ManualBuild.ts`,
`bulk/PourController.ts`, delete `crafting/PourController.ts` +
`crafting/pour.yaml`, `check-verb-collisions.ts` :98; the rows; docs:
`husbandry.md`, `smallholding.md`, `spatial.md`, `retail.md`, `harm.md`,
`ranged.md`, `magic-items.md`, `bulk.md`, `crafting.md`, `command-spec.md`
(the alternate-controller section).
Tests: each moved rule's unit test moves with it (the plan/outcome
tested on the object; the controller tested for wording only); new
controller tests for toss/hurl/recite/pour; the W0 baseline file passes
unchanged for steps 10–15; the `carcass-chain` wire file's tan steps
updated to `get hide from pit`.
Acceptance: the baseline comparison is equal in state, reasons and
durations; step 16 ends in the same state with different words; the
four controller gates' ceilings lowered; `pour` is one view and the
collisions gate passes with two rows. Commit.

### W5 — the subcommand rule, applied (all but the water-supply nouns)

Goal: drive steps 7–9; `lint:subcommand-words` lowered. Decisions: D9.
Files: the ten switch controllers (not bank/title) → bases +
per-subcommand controllers + rows; their views (`controller:` per
subcommand, the renames, `fight`'s split); `staff.yaml` + controllers +
the four alias views (`appoint`, `dismiss`, `apply`, `quit`) + `Persona.ts`
(:135-190, afford `staff` beside the aliases); `carve.yaml`,
`plant.yaml`, `harvest.yaml`, `treat.yaml` options; `help` needs nothing;
docs: `command-spec.md` § *Choosing between them* (the rule as decided),
`chat.md`, `forums.md`, `party.md`, `wiki.md`, `emotes.md`,
`content-packs.md`, `combat.md` (the renamed words), `employment.md`
(`staff`).
Tests: the existing controller tests re-pointed at the per-subcommand
classes; a binder test per renamed word; wire steps 7–9 (each noun's
subcommands, `help <noun>`, each alias view, `fight defend` = `defend`,
`carve` with options = the old chain).
Acceptance: every subcommand does what it did; every old top-level word
that moved still runs; the overlap gate's ceiling lowered to the
remainder and the remainder listed in the MR. Commit.

### W6 — bank, wallet, title, clock (last; reconcile with water-supply)

Goal: the four water-supply-held nouns. Decisions: D9 (the W6 rows).
Before starting: `git fetch` and `git merge-tree` against
`origin/reqs/water-supply` for `BankController.ts`, `WalletController.ts`,
`TitleController.ts`, `ClockController.ts`, `BankingControllerBase.ts`;
if water-supply has merged, merge master first; if not, build on this
branch and note in the MR that whichever merges second reconciles.
Files: `BankController` → per-subcommand over `BankingControllerBase`
(`bank open` → `bank join`); `wallet.yaml` + `WalletDrawController`
(`draw` alias view); `title.yaml` + `TitleSubdivideController`/
`TitleTransferController` (alias views) + `TitleControllerBase`;
`clock` is only counted. Rows, docs (`banking.md`, `parcel.md`).
Acceptance: the four nouns' subcommands and alias views pass the
step-7 checks; the overlap ceiling lowered again. Commit.

### W7 — the drive, the record, the MR

Run the whole blocking drive (the wire file, all 18 steps) once against
a standing world; append the drive record below; open the MR READY with
the list of outcome wordings that changed (D4) and the overlap
remainder (D9); then the full suite once, alongside review.

---

## Reachability wiring

The five links for each new capability — verb · affordance · data · load
· arg gate — each of which fails closed and silent.

| capability | verb (view) | affordance (static) | data (row) | load | arg gate (`requires:`) |
|---|---|---|---|---|---|
| `verb@source` | none — the command line | n/a | n/a | n/a | the source fills only a slot whose `requires:` it satisfies (D2) |
| `toss` | `V/inventory/toss.yaml` | `TossableMixin.commandContributions.inventory` (new static; `Line` composes it) | `TossController.yaml` | on use | `item: TossableMixin`, `recipient: object, AgentMixin` |
| `hurl` | `V/inventory/hurl.yaml` | the same `self` list `throw` rides (`Persona`/`Avatar`) | `HurlController.yaml` | on use | `item: TangibleMixin, mustBeHeld`; `target: VisibleMixin` |
| `recite` | `V/magic/recite.yaml` | the scroll class's `inventory`/`peers` (the thing that is Arcane + Marked + Consumable; the build names the class) | `ReciteController.yaml` | on use | `target: [ArcaneMixin, MarkedMixin]` |
| `staff …` | `V/employment/staff.yaml` + the four alias views | `PersonaMixin.commandContributions.self` (:135-190) | one row per subcommand controller | on use | as the old views |
| per-subcommand controllers (W5/W6) | the existing views, `controller:` per subcommand | unchanged | one row each (`lint:controller-rows`) | on use | each subcommand's own `args` |
| `pour` unified | `V/bulk/pour.yaml` `[pour, add]` | `BulkableMixin` (already) + `ManualBuildMixin` (re-pointed from `crafting/pour.yaml`) | `bulk/PourController.yaml` (exists); `crafting/PourController.yaml` deleted | on use | `target: PourTargetMixin` — in `Mixins`, so `lint:arg-kinds` admits it |
| `HarvestWordedController` | the `harvest` view, re-pointed at runtime by the drive | unchanged (`Plant`, `Cultivable`, `Panel`) | `HarvestWordedController.yaml` | on use | unchanged |
| the markers | none | none | none | composed by their hosts | `isPowered`/`isWaterPowered`/`isNameTaking` replace the probes |
| the split halves | `eat.yaml`/`vomit.yaml`, `descend.yaml`/`ascend.yaml` move to the half that owns them | the composite unions both halves' statics (`queryMixins`) | none | — | none |

---

## Acceptance-criteria coverage

| criterion (requirements § Acceptance) | wave(s) |
|---|---|
| every blocking-drive step passes against a live world | W7 (steps 1–5, 18: W1; 17: W2; 6, 10–16: W4; 7–9: W5/W6) |
| for every kernel verb moved: same state, same refusal reason, same duration | W0 baseline + W4 comparison; D15 keeps reason strings |
| `verb@source` works for every verb with no per-verb change | W1 (the command line; no view touched) |
| no word in the command surface means two acts | W5/W6 for the kernel nouns and fight; the gate ratchets the remainder (see *Requirements disagreement* 4) |
| nothing a player typed or saved stops working | alias views (W5/W6), scope-free commands byte-identical (W1); the two accepted breaks are named (throw's `to`/`at` → a teaching refusal; renamed subcommand words) |
| an alternate controller produces identical state | W4 (`HarvestWordedController`, step 16) |
| every defect class counted, lower than the scan, cannot rise | W0 (the gates) + W2/W4/W5 (the lowerings) |

---

## Test & gate strategy

- **Unit**: tokenizer forms and round-trip; dispatcher scope semantics
  (every D2 branch, including the non-interactive degrade and the batch);
  the other-offer probe (never prompts, finds the second source); per
  split a capture/materialize round-trip; each moved rule's test moves to
  the object; each new controller a wording test only; each gate a
  positive fixture + the invariant test.
- **Wire (the drive IS the file)**: `controllers-are-io.dirty.wire.test.ts`.
  Paces: steps 1–9, 11–16, 18 **instant**; step 10 **staged** (growth
  set with `eval`, the harvest driven by player verbs); step 17
  **staged** (the four states captured and re-materialized through
  `eval`, read back by player verbs — the same path a restart takes;
  there is no restart endpoint). No **short** step needs the clock past
  an hour; **no soak drive**. Dirty because step 16 rewrites a shared
  view (restored) and the baseline consumes seeds.
  Pairs the plan names: steps 1–3 — two `Watch` clones
  (`/auth/test-hand` for the carried one, `clone` for the one on the
  table); step 5 — two wheat plants in one bed, one `isHarvestable`, one
  not, both answering `wheat` (the unripe one answers first by scope
  order; the reply names `harvest@here:2nd wheat`); step 6 — a graded
  bottle, a jug, a glass and a shaker; step 14 — a line (`Tossable`), a
  ball, a buddy session; step 15 — a notebook, a wall display, a scroll.
- **Every checkpoint fails once on purpose** before the record is
  trusted (B2): the record helper is run against a deliberately wrong
  baseline.
- **Browser walk** once at code-complete (B3):
  `e2e/tests/controllers-are-io-walk.spec.ts` — type `wind@`, see the
  other-offer line, `help bank`, `fight report`.
- **Gates**: the whole family at every wave; the seven new gates'
  ceilings are lowered in the wave that earns it, never raised.
- `pnpm test` runs twice: at code-complete alongside review, and at
  `/finalize`.

---

## Risks & opens

1. **`_runChain` conflicts with client-surface.** Both builds edit the
   same function. The merge is by hand; the plan's ordering (scope filter
   first, then the chain, then the askable prompt) composes. Whichever
   merges second reconciles.
2. **The source-fills-its-slot rule (D2)** is the one semantic the
   requirements implied but did not state. If the owner wants
   `wind@me:watch watch` instead, the rule shrinks to (b)/(c) and steps
   1–3 are retyped — a view change, not a re-plan.
3. **The other-offer probe runs the binder twice on a refusal.** Cheap,
   but a validator with side effects (none known; validators are
   documented pure) would fire twice. The probe strips `interactive` so
   no prompt can fire.
4. **Tan's lift on removal** needs the remover at the hook. If
   `onContainableRemoved` carries no actor, the build threads custody
   from `ContainmentApi.move` (it derives custody already) — a kernel
   hook signature change the MR must call out.
5. **The `line:` sweep touches 13 packs.** Mechanical but wide; each
   pack's vitest runs; a pack whose test asserts a refusal's prose (not
   its reason) needs that assertion moved to the controller test.
6. **`WaterPoweredMixin` makes two pack things compose a kernel
   protocol** and deletes four probe-local interfaces in three other
   packs. The pack rung check (`content-packs.md`) must still pass:
   the mixin lives in the kernel, so no new pack dependency is declared.
7. **Renamed subcommand words** are grain; expect review to rename some.
   A rename is a view edit plus its test, minutes each.
8. **Heuristic census numbers** in § Grounding are not the gates'
   numbers; W0 publishes the classifiers' own counts and the MR cites
   those.
9. **Chattel title on restart** — drive 17's "made-by good" is a
   `Crafted.maker` fact plus a chattel title; made-from is read-once by
   design and is not expected to survive (it never did).

What the build should stop and ask about: nothing in this plan; a
compliant path exists for every fork named above.

---

## Deferred seams

Each leaves as a slate entry, never as a plan section.

- `look`'s six class-specific arms → onto their objects after
  client-surface merges — **one-resolution-rule-slate** § 2 (already
  there).
- The pack burn-down (Smelt, Fell, Saw, Butcher, Mow, Mill, Spin, Dye,
  Draft, Operate…) under the ratchets — **controllers-are-io-slate**
  keeps the scan list as its *Left*.
- `Workable`'s second plan vocabulary (`kind`/`prose`/`cost`) onto
  `ActPlan`; `Cuttable` as a protocol mixin — **verb-interfaces-slate**.
- `OnCallMixin` → `BusinessMixin` only; `MadeFromMixin` → `Good`/`Vessel`
  only; the other 40 split-cluster mixins as the gate's ranked census;
  `getMass`'s four definers — **mixin-slate**.
- The printer's forme, the herd, Katie's and Walter's nouns; the
  workspace trees (item 8) after wizard-axis; `title buy` over `ForSale`
  (rung 1); the `edit` pairs after wizard-axis —
  **command-taxonomy-slate**.
- `shadowed-by:` on the view as the carrier for the two remaining
  `KNOWN_COLLISIONS` rows — **affordance-verb-slate** (already there).
- `@name` mentions inside a message tail — **chat slate**.
- `engagement-completed` carrying what changed (the facts an
  `ActOutcome` now has) — **response-envelope** follow-on.

---

## ⚠ Requirements disagreement

Stated, not absorbed:

1. **`wind@'pocket watch'`** — the command line treats `'` as a literal
   character (chat apostrophes; `CommandLineLogic.ts` :6-8). The quoted
   form is `wind@"pocket watch"`. The example should change, not the
   tokenizer.
2. **`order`'s "five services"** — there are six (`Tariff.ts` :93-102;
   transfusion is the sixth). The plan moves all six.
3. **Drive 17's "made-by good"** — the persisted maker is
   `CraftedMixin.maker`; `Chattel`'s made-from is read once on arrival and
   never persisted. The step checks the chattel TITLE and the crafted
   maker survive; it cannot check made-from, which never survived.
4. **"No word in the command surface means two acts"** cannot reach zero
   in this build: 52 pairs exist, most in views this build does not own
   (sibling-held nouns, pack nouns) or that dissolve when wizard-axis
   lands (`edit`). The plan resolves the pairs inside the kernel nouns it
   splits and fight, and the gate ratchets the rest — which is the
   acceptance line's other sentence ("lower, and cannot rise"). And a
   renamed subcommand word is a break for a saved script that named it;
   the requirements promise aliases only where the act is the same.
5. **`throw … to` / `throw … at`** cannot keep working silently once the
   acts are split; the plan gives them a teaching refusal naming `toss`
   and `hurl`. If the owner wants them to run, the throw view keeps the
   arms and routes — the smush the build is removing.

---

## Critical files

Read first, in this order:
- `docs/requirements/controllers-are-io-requirements.md`;
  `docs/slates/builds/controllers-are-io-slate.md` (the ledger).
- `packages/server/src/mud/platform/idea/api/CommandLineLogic.ts`;
  `packages/server/src/mud/api/command-line.ts`;
  `packages/server/src/mud/lib/command/CommandGiver.ts` (:441-452,
  :650-830, :1001-1280); `packages/server/src/mud/lib/script/Interpreter.ts`
  (:605-675); `packages/server/src/mud/platform/idea/api/ShellLogic.ts`
  (:88-260); `packages/server/src/mud/platform/idea/api/CommandLogic.ts`
  (:1274-1360 cardinality; :968-1104 subcommand binding);
  `packages/types/src/index.ts` (:565-583, :874-903).
- `packages/server/src/mud/lib/craft/ActPlan.ts`;
  `packages/server/src/mud/platform/idea/cmd/crafting/ManualBuildController.ts`;
  `packages/server/src/mud/lib/command/EngagedActController.ts`;
  `packages/server/src/mud/lib/material/Alloyed.ts` (:67-82).
- The five mixins and their hosts (§ Grounding → *Mixin persistence*).
- The nine kernel controllers and `TanController`, both `pour` pairs
  (§ Grounding → *The kernel controllers in scope*).
- `packages/server/scripts/pack-roots.ts`,
  `check-instrument-args.ts`, `check-verb-collisions.ts`,
  `check-reachability.ts`, `check-completion-this.ts`,
  `scripts/__tests__/check-reachability.test.ts` (the fixture shape);
  `docs/lint-family.md` § *four ways a census lies*.
- `packages/wire/src/harness/{session,world,assertions}.ts`;
  `packages/wire/tests/forestry.dirty.wire.test.ts`,
  `ceramics-a.dirty.wire.test.ts`.
- `docs/subsystems/command-spec.md` (:80-175, :1409-1584, :1941-1956),
  `command-routing.md` (:578-640), `mixins.md` (:152-182, :412-442),
  `response-envelope.md`, `testing.md` (:60-116, :879-960).

## Drive record

*(appended at build time)*
