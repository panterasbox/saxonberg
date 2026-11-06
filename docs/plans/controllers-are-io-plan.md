# Controllers are input and output — implementation plan

Executes [controllers-are-io-requirements.md](../requirements/controllers-are-io-requirements.md)
(kind **refactor/sweep**, lead end **kernel**; the first consumers are the
kernel's own verbs named there). Seeding slate:
[controllers-are-io-slate.md](../slates/builds/controllers-are-io-slate.md)
(the doctrine, the 2026-11-05 scan, the decisions, the reuse ledger, and
the 2026-11-06 plan-review decisions + the *folded in* table).

What the build does, in one paragraph: it fixes the shape of the whole
command chain. Gates first (a schema gate for every view, then a census
gate per link). Then `verb@source` and the reply that names the other
offer; scripts that fail closed; `--strict`/`--loose`; where a verb
looks first. Then the mixins: five dated splits onto honest hosts, every
mixin in a file named for it, bare verb shapes become protocol mixins
presented as the verbs they serve, the markers the duck census earned.
Then one act convention with the words on the controller, and the
kernel acts (`harvest`, `plant`, `put`, `order`, `treat`, `throw` in
three shapes, `read`/`recite`, `tan`, `pour`) onto their objects. Then
**one view, one word**: `do` replaces `make`, `reel` is fishing's and
silk is `unwind`, `drift` is the miner's, 65 multi-word views keep one
word and a handful of shortcuts become default player aliases, every
view carries its `category:`. Then the subcommand rule as
command-taxonomy wrote it — institution transactions under their noun —
with the twelve switch controllers split per subcommand. The
water-supply nouns last. **Breaking is accepted** (owner, 2026-11-06).

Branch `reqs/controllers-are-io` (build-2), off master `4b20f2ce5`;
⚠ the worktree at `b3cb1e3ee` is 20 commits behind `origin/master`
(`6c0182abd`) — merge master before W0. Revised 2026-11-06 twice after
the owner's plan review (requirements `11113877d`, `b3cb1e3ee`).

---

## Fault lines

Every place this build cuts something in two or moves a boundary. One
row per cut. *(grain)* marks a name the owner may change at review
without re-planning.

### Mixin splits (D6) — each half on its honest hosts, no composite

| old mixin | what stays under the old name | what is carved out | hosts after | who moves |
|---|---|---|---|---|
| `OrganizationMixin` (`lib/employment/Organization.ts`) | the chart: `positions`, `rosterSlots`, `appointingAuthority`, `proprietorPath`, `parentOrganization`, `startsShiftOnHire`, `name`, every roster/hire/shift method (incl. client-surface's `showShiftStatus`) | **`OnCallMixin`** (`lib/employment/OnCall.ts`): `call`, `getCall`/`setCall`/`callFor`, `_lastCalled`, `_callTicket`, the four private helpers | Organization: `platform/idea/Organization` + `Business`; OnCall: **`BusinessMixin` only** (all 37 authored `call:` rows are `class: /platform/idea/Business`) | `CraftingLogic.houseOf` (:373-380) narrows `isBusiness` not `isOrganization`; `:3835` already holds a Business |
| `WaterPlaceMixin` (`lib/location/WaterPlace.ts`) | the water: `water`, `column`, `tide`, every level/band/medium/arrival method, descend/ascend | **`HaulOutMixin`** (`lib/location/HaulOut.ts`): `pullOut`, `loadNamed`, `deliverOut`, `isHelpless`, `pullerStation`, `PULL_OUT_REAL_S` | both on all seven water places (⚠ co-use split only — every host is honestly both) | `PullController` :49-56, `Line.ts:426` narrow `isHaulOut` |
| `MetabolicMixin` (`lib/metabolism/Metabolic.ts`) | digestion: the seven persisted fields, every reconcile/ingest/toxin method, `vomit.yaml` | **`EatingMixin`** (`lib/metabolism/Eating.ts`): `eat`, `claimUtensil`, `leaveCrumbs`, `EatOutcome`, `eat.yaml` (typed over `Metabolic`; `eat` calls `this.canIngest`) | both on `Creature` only | `EatController` :42 narrows `isEating` |
| `LoadBearingMixin` (`lib/encumbrance/LoadBearing.ts`, no fields) | the burden: `getBorneBurden`, `getCarryCapacity`, `getStrainCeiling`, `getLoadRatio`, `wouldExceedCeiling`, `subscribableFields` | **`BuoyantMixin`** (`lib/encumbrance/Buoyant.ts`): `getDisplacedVolumeM3`, `getNetBuoyancyN`, `NEUTRAL_DENSITY_KG_M3`, `G` (LoadBearing imports the constant) | both on `Creature` only | `Respiration.ts:1225`, `WaterPlace.ts:745` narrow `isBuoyant` |
| `ChattelMixin` (`lib/chattel/Chattel.ts`) | the title: `_chattelId`, `_place`, stamp/transfer/owner/custody, `markupAugmenters`, `onDestruct`; `requires: [ChattelMixin]` and `FromMixin("ChattelMixin")` stay | **`MadeFromMixin`** (`lib/chattel/MadeFrom.ts`): `_madeFromOwner`, `_madeByProcess`, `recordMadeFrom`, `getMadeFromOwner`, `recordMadeBy`, `isMadeByProcess` | Chattel: `Good`, `Vessel`, `KeptAnimal`, `Livestock`; MadeFrom: **`Good`, `Vessel` only** | `api/stuff.ts:522-527`, `Mould.ts:1168-1170`, `ChattelLogic.derivedTitle` :307-311 (today un-narrowed — reached for animals) and `ownerOfInputs` :344-350 narrow `isMadeFrom` |

The test (Slotted → Attired, `lib/slot/Attired.ts:10-23`, `slot.md:26-57`):
who composes it, plus which imports leave with the carved half, beside
co-use. The precedent kept `Slotted`'s name on the occupancy half and
carved `Attired`; this plan does the same — the original idea keeps the
name, the later-added idea leaves. No composite, no content change
(`requires:` names only the title half, which keeps its name).

### Mixin file moves (D7b) — one gate, twelve moves

| factory | from | to |
|---|---|---|
| `HeldGoodsMixin`, `ConsignmentShelfMixin` | `lib/retail/Consignment.ts` | `lib/retail/HeldGoods.ts`, `lib/retail/ConsignmentShelf.ts` |
| `SeatedDrivableMixin` | `lib/slot/Drivable.ts` | `lib/slot/SeatedDrivable.ts` (no production composer — `Coach.ts:13` declines it; the move is cheap, the deletion is a finding for the conveyance owner) |
| `PropsMixin`, `CostumedMixin` | `lib/stuff/Staged.ts` | `lib/stuff/Props.ts`, `lib/stuff/Costumed.ts` |
| `CutleryMixin` | `lib/bulk/Utensil.ts` | `lib/bulk/Cutlery.ts` |
| `ToolMixin` (28 importers) | `lib/craft/Tooled.ts` | `lib/craft/Tool.ts` |
| `DisguiseBearingMixin` | `lib/disguise/Disguise.ts` | `lib/disguise/DisguiseBearing.ts` |
| `RegistrarMixin` | `lib/document/Register.ts` | `lib/document/Registrar.ts` |
| `ReservedMixin` (62 importers) | `lib/reserve.ts` | `lib/reserve/Reserved.ts` (a subsystem folder) |
| `LoungeMixin` | `world/lounge/LoungeMixin.ts` | `world/lounge/Lounge.ts` (the concrete class is `world/lounge/location/Lounge.ts`, another directory) |
| `OpenWorkingMixin` | `trade-quarrying/src/lib/Working.ts` | `trade-quarrying/src/lib/OpenWorking.ts` |
| `Throttleable` | fixed on `reqs/water-supply` | whichever merges second keeps one copy |

### Protocol conversions (D8) — bare shapes → protocol mixins, `_mixinKind = 'protocol'`

| shape | hosts (kinds) | verdict | the view's `requires:` after |
|---|---|---|---|
| `Splittable` (`lib/ground/Workable.ts:187`) | Hive, dairy Wheel, quarry Block — 3 packs | **earned** → `SplittableMixin` | `split.yaml`: `SplittableMixin` (was `any`) |
| `Pumpable` (`lib/pump/Pumpable.ts:108`) | `PumpingMixin`, `BurnerMixin`, diving `AirPump` — 3 | **earned** → `PumpableMixin` (a lamp's `no-bellows` refusal becomes the mixin's default) | `pump.yaml`: `PumpableMixin` |
| `Cuttable` (`lib/craft/Cuttable.ts:45`) | Rope, SugarLoaf, IceSheet + the cuts sweep (Bole, Billet, Sheet, Corpse) | **earned** → `CuttableMixin` | `cut.yaml`: `CuttableMixin`; the seven cut controllers ask `cutPlan` |
| `PumpSource` (bare; `pumpFitted`) | Well, BilgeWell, Wellhead, water Conduit — 4 | **earned** → `PumpSourceMixin` | `pump.yaml` source slot |
| `LiftSource` (bare; Bail's four methods) | Well, BilgeWell, Wellhead, Boat, Pumping — 5 | **earned** → `LiftSourceMixin` | `bail.yaml` |
| `TravelNode` (`lib/travel/TravelNode.ts:90`; no `isTravelNode`) | the tpa pack's nodes + the kernel's own fork | **earned** → `TravelNodeMixin` | `teleport.yaml` |
| `Diggable` (`Workable.ts:171`) | `OpenWorkingMixin` only | **not earned** → a property of `OpenWorkingMixin`; `dig.yaml` requires `OpenWorkingMixin` | — |
| `CutPlanner` (`Cuttable.ts:50`) | tailoring `CuttingTool` only | **not earned** → `CuttingTool`'s own method; `cut`'s tool slot requires `ToolMixin` + the `cutting` capability | — |
| `Tappable` (`lib/husbandry/Tappable.ts:45`) | `ProducingMixin` only | **already covered** → the bare interface is deleted; `TapController.ts:63`'s `maxSpiles` probe becomes `instanceof SapStandard` | `tap.yaml`: `ProducingMixin` |
| `Reelable` (fishing `src/lib/Reelable.ts`) | Cocoons only | **dies with the `reel` undo** | — |
| `Workable` itself | the ground protocol (`dig`/`split`/`hew`); its `WorkPlan` vocabulary | kept; its `kind`/`prose`/`cost` plan vocabulary converges on `ActPlan` (D4) | — |

Plus the eleven remaining target-narrowing `typeof` probes in
controllers (§ Grounding → *typeof probes*), each replaced by the
predicate the table names.

### Controller splits (D10, D11)

| old | new files (`platform/idea/cmd/<cat>/`) and view changes |
|---|---|
| `system/WikiController.ts` (1062 l, 17 arms) | `WikiControllerBase` + one controller per subcommand; `wiki.yaml` gains `controller:` per subcommand; the fallthrough bare `wiki <page>` routes to `WikiReadController` |
| `social/PartyController.ts` (15 arms) | `PartyControllerBase` + 15 |
| `social/ChatController.ts` (13) | `ChatControllerBase` + 12 + `ChatPostController` (the fallthrough post) |
| `social/ForumController.ts` (11) | `ForumControllerBase` + 11 (bare `forum <board>` → `ForumReadController`) |
| `author/PackController.ts` (8) | `PackControllerBase` + 7 (pin/unpin → two) |
| `social/GroupController.ts` (8) | `GroupControllerBase` + 8 |
| `social/SoulController.ts` (8) | `SoulControllerBase` + 7 (disable/enable → two) |
| `banking/BankController.ts` (8) — **W8, last** | per-subcommand over the existing `BankingControllerBase` |
| `work/JobController.ts` (5 + the moved `apply`/`quit`/`fulfill`) | `JobControllerBase` + 8; the board becomes a subcommand arg with a default (self-resolved today, :92-98) |
| `inventory/EquipController.ts` (`set`/`sets` + flat; named by `equip`, `wear`, `wield`) | `EquipControllerBase` + `EquipController`, `WearController`, `WieldController`, `EquipSetController`, `EquipSetsController` |
| `inventory/UnequipController.ts` (named by `remove`, `unequip`, `unwield`) | `UnequipControllerBase` + `RemoveController`, `UnequipController`, `UnwieldController` |
| `movement/DescendController.ts` (named by `ascend`, `descend`) | `AscendController` + `DescendController` over one base |
| `social/ProfileController.ts` (named by `profile`, `score`) | `ProfileController` + `ScoreController` |
| `stream/TuneController.ts` (4 + bare) | `TuneControllerBase` + 4 + `TuneInController` |
| `civics/TitleController.ts` (4) — **W8** | per-subcommand + `TitleControllerBase`; `subdivide`/`transfer` move under it |
| `combat/FightController.ts` (19) | `FightGambitController` (twelve gambit words are ONE act, `queueGambit(name)`) + `FightStatusController`, `FightBreakController`, `FightRushController`, `FightSwitchController`, `FightDrawController`, `FightFinishController`, `FightYieldController`; `fight defend` routes to `combat/DefendController` |
| `inventory/ThrowController.ts` (3 acts, one word) | three views of `throw`, provably disjoint (D17): `throw-to.yaml` → `ThrowToController` (catch), `throw.yaml` → `ThrowController` (pitch), `throw-at.yaml` → `ThrowAtController` (attack); `hurl`/`lob`/`heave` deleted |
| `perception/ReadController.ts` (read + cast) | `ReadController` (reads only) + `magic/ReciteController` (`recite <scroll>`) |
| `crafting/MakeController.ts` + `make.yaml` | **deleted**; `shell/DoController.ts` + `do.yaml` (the decouple branch, redone on master — D18) |
| `trade-fishing` `ReelController.ts` (fishing + silk) | the pre-silk `ReelController` (fishing only, `args: []`); `trade-sericulture` `UnwindController` + `unwind.yaml` over `Cocoons.planReel`/`completeReel` (renamed `planUnwind`/`completeUnwind`); `Reelable.ts`, `reel-unified.test.ts` and the `package.json` dependency on fishing deleted (D19) |
| `trade-mining` `DriveController.ts` + `cmd/mining/drive.yaml` (`verbs: [drift]`) | renamed `DriftController.ts` + `drift.yaml` + row; `acts.test.ts` :433-436, :449-451, :489-492 follow (D20; the verb split itself is already on master, `3e915f1d3`) |
| `trade-tanning` `TanController.ts` (lay-in + lift) | `TanController` lays in only; the lift is the hide's own rule on removal from the pit (`get hide from pit`) |
| `bulk/PourController.ts` + `crafting/PourController.ts` | ONE `bulk/PourController.ts` over `PourTargetMixin`; `crafting/pour.yaml` retired; `verbs: [pour]`; `KNOWN_COLLISIONS` drops `pour` |
| `crafting/ScrubController.ts` + `scrub.yaml` | **deleted**; `wash <x> --hard` (the `brush` slot moves into `wash.yaml`; `effort()` reads the option) |
| `crafting/HeatController.ts`'s `boilInPot` arm (:144-196) + the `boil` word | **deleted**; immersion takes the liquid's heat in the vessel's own reconcile (D8c) |
| the seven cut controllers (saw, rive, fell's cross-cut, butcher, scribe/snap/groze, groove/scrape) | each becomes I/O over `target.cutPlan(req)` on `CuttableMixin` (Bole, Billet, Corpse, Sheet, IceSheet); the line: the cut's decision moves, nothing else in those packs is burned down |

### Rules moved (D4, D5, D11)

| from (controller) | to (object method) |
|---|---|
| Harvest: `bandFor` :453, count :308, difficulty :359, tool gate :242-258, unready arms :263-290, the swath duration `3000+swathM2*60`/cost 6 :433-434, nitrogen pro-rata :592, carry-or-drop :572-574, the mint loop :543-558, `landSwath` :482, label/stand selection :139-194 | `GrowingMixin.harvestPlanFor(req)`, `SoilMixin.harvestPartFor(req)`; the tool's `getSwathM2` (already) |
| Plant: pot-path checks :96-249, broadcast rate/area :407-431, duration `3000+area*10`/cost 5 :445-446, seed spend :564-567, `maySow` :486, `landUseRefusal` :517, `landSowing` :534 | `CultivableMixin.plantPlanFor(req)`, `SoilMixin.sowPlanFor(req)`, `PlantableMixin` (the seed's rate) |
| Put: `offersFor` :435-473, preposition→placement :143-197, `openSlotFor` :412-420 | `PlacingMixin.placementFor(word)`, `SlottedMixin.openSlotFor(item)`, `ContainerMixin.canAddContainable` (already); the move stays `ContainmentApi.move` |
| Order: the six service arms :238-483, `runDurativeService` :310-346, bath `12000` :695, `reachableTariffs` :717, `resolveSubject` :755, `findGrave` :766, `resolveAttendantPoint` :779, `resolveWindowIssuer` :735, `CLINIC_*` :56-65 | `PricedOfferMixin.orderPlanFor(req)` (default refusal) overridden by `Tariff` and `CommerceMenu`; the subject becomes a view arg; two houses → `onExcess: prompt` on `counter` |
| Treat: `pickWound` :71, `difficultyFor` :84, `outcomeFor` :119, `BAND_SCORE` :110, `tendInfection` :607-641 (incl. the field write :636), `resolveTreatment` :513, `TREAT_FLUID_LITRES` :54 | `VitalsMixin.treatmentPlanFor(req)` — the patient decides; the remedy answers through what it is |
| Throw: the attack delivery :153-293 (`IMPACT_SITES`, caustic energy, shatter) | `Combatant.deliverThrown(item, target)`; the catch is already `Tossable.tossTo` |
| Read: `fireAnyWorking` :222 | `ReciteController` → `Arcane.dischargeAt` (already); `read` never casts |
| Tan: `lift` :177-230 | `TanningMixin.onLiftedFrom(pit, by)`, fired from `Tanpit`'s removal hook |
| Pour (crafting): `POUR_MS`, `effortW 150`, serving size, `addIngredient`; Pour (bulk): `WATCH_EFFORT_W`, the credit rules | `PourTargetMixin.receivePour(req)` on `ManualBuildMixin` and `BulkableMixin` |
| Heat: `boilInPot` (`DISINFECT_HOLD_S`, the ≥ boil check) | the vessel's thermal reconcile stamps each Soilable occupant's time at the bath's temperature (D8c) |
| Scrub: `effort()` 3/1.5 | `wash --hard` → `WashController.effort()` reads the option; the brush is `wash`'s slot |
| the seven cut controllers: `instanceof Bole/Billet/Sheet/Corpse/IceSheet` arms | `CuttableMixin.cutPlan(req)` on each |
| every `ActPlan` consumer: `beginSelf`/`beginPeers` on the plan, `line: Mml` on the refusal/outcome (25 implementers, 12 controllers) | the words move to the controller: `engagePlan(context, plan, words)`; the object returns `reason` + facts |
| the recording/capture tails (`recordCommand`, `captureManualBuild`) at `PourController :165,:221`, `HeatController :119`, smithing `HammerController :167`, `QuenchController :156-157,:187`, hospitality `MuddleController :66`, `StrainController :86-87,:122`, cooking `PlateController :80-81,:107`, baking `DoughTrough.ts:104`; `Transcriber.ts`; `ScriptLogic` :342,:643 | **deleted** (the decouple, D18): every craft mints the can-make deed in `CraftingLogic.recordCraftEvidence`; `RecipeKnowledge` moves to `lib/craft/` |

### Verbs, words and categories (D9, D16–D20)

| word | change | why |
|---|---|---|
| `do <name> [with <arg>]` | new shell verb (`shell/do.yaml`, innate on `Avatar`); `make` **deleted** — "`make` stops being anything until a trade earns it" | the script runner never made anything; the decouple branch, redone |
| `reel` | back to the pre-silk view (`args: []`, fishing only) | one verb, one act |
| `unwind <cocoons> [with <basin>] --count N` | new `trade-sericulture` verb afforded by `ReelingTool`; the `reels` brain and the silk wire test follow | silk's act is its own |
| `drift` | mining's file and controller renamed to the word; `drive` stays the vehicle's | one view, one word (the split is already on master) |
| `throw X to Y` · `throw X` · `throw X at Y` | one word, three disjoint views, three controllers; `hurl`, `lob`, `heave` deleted | the shapes cannot be confused (D17) |
| `recite <scroll>` | new verb (cast from a scroll) | read split |
| `house appoint \| dismiss \| draw` *(grain: which noun)* | the roster and the operating account are the business's books (`house.yaml` already holds `book`, `pnl`, `payroll`, `roster`); the flat `appoint`, `dismiss`, `draw` views **deleted** | an institution transaction is a subcommand of its noun |
| `job apply \| quit \| fulfill` | the applicant's side of the same roster book and the contract board; the flat views **deleted** | same rule |
| `shelf consign \| reclaim` · `rack check \| reclaim` | the shelf's and the rack's books; the flat `consign`, `reclaim`, `check` views **deleted**; (⚠ fixes in passing: `reclaim` from a `CheckRack` is refused at shape today, `reclaim.yaml` requires `ConsignmentShelfMixin`) | same rule; `reclaim` under two nouns is noun-scoped |
| `title transfer \| subdivide` — W8 | the parcel registry's book; the flat views **deleted** | same rule; water-supply holds `title` |
| `wallet` — W8 | stays as is (`use`/`beneficiary`/`freeze`); `draw` goes to `house`, not `wallet`, because it debits the business's account | the book decides the noun |
| `buy`, `sell`, `order`, `rent`, `charter`, `pay`, `tip`, `collect`, `assay`, `pilot`, the herd verbs | **stay bare** | acts on a good or a person whose bookkeeping follows (command-taxonomy item 1 decides `buy`) |
| `fight defend` | routes to `combat/DefendController` | the one same-act subcommand found |
| `chat/forum/group/soul/subject make` | **kept** | with `make` gone as a verb there is no collision; across five nouns the word is one act (create a record) — one word, one act holds |
| `wiki read`, `bank open`, `party show`, `chat who`, `fight close/disarm/sweep/switch/draw/status`, … | **kept** | a subcommand word is scoped by its noun |
| the 77 extra words on 65 multi-word views | each deleted or minted as a default player alias (table below) | one view, one word |
| `pour` | `verbs: [pour]`; `add` deleted | rung 1 |
| `scrub` | deleted; `wash --hard` | a manner of wash |
| `boil` | deleted; `heat` | a temperature, not an act |
| `category:` | on every view, equal to its directory; `help` lists by category; `help` alone lists the categories | command-taxonomy item 2 |
| `--strict` / `--loose` | reserved per-invocation options (force `onFiltered: error` / `take`); `reload --strict` renamed `reload --force` (wizard-axis holds `ReloadController` — whichever merges second) | explicit-targeting |
| `--async` / `--sync` | already stripped for a command line; the bare multi-statement script line gains it | async-commands |

### Default player aliases minted (D16)

The criterion: **a one- or two-character MUD-standard shortcut for a verb
a player types many times a session**, and nothing else. A synonym is
not a shortcut; the verb is the word `help` teaches. `alias unset`
tombstones any of them, persisted.

| alias | verb | declared on |
|---|---|---|
| `l` | `look` | `perception/look.yaml` (client-surface holds `look`: the two-line edit — `verbs: [look]`, `defaultAliases: [l]` — is made by whichever merges second) |
| `i` | `inventory` | `inventory/inventory.yaml` (`inv` deleted) |
| `h`, `?` | `help` | `system/help.yaml` |
| `'` | `say` | `social/say.yaml` |
| `n` `s` `e` `w` `ne` `nw` `se` `sw` `u` `d` + long forms | `go <dir>` | already on `MobileMixin.defaultAliases` (`lib/spatial/Mobile.ts:300`) — unchanged |
| `stop` | `cancel` | already on `EngagedMixin` (`lib/activity/Engaged.ts:122`) — unchanged |

Deleted: `quaff`, `gov`, `bath`, `melt`, `gob`, `boil`, `mold`, `add`,
`mend`, `scrap`, `infuse`, `shake`, `churn`, `extinguish`, `snuff`,
`burn`, `kindle`, `work`, `fuel`, `toggle`, `tighten`, `hire`, `offices`,
`beat`, `take`, `hand`, `pick`, `inv`, `sow`, `place`, `doff`,
`transplant`, `muck`, `rip`, `hurl`, `lob`, `heave`, `lash`,
`administer`, `nurse`, `bind`, `dress`, `unstitch`, `surface`, `jump`,
`dive`, `tp`, `examine`, `exa`, `scan`, `reveal`, `float`, `purchase`,
`unconsign`, `tell`, `finger`, `re`, `me`, `converse`, `handoff`, `jobs`,
`salt`, `drill`, `plow`, `angle`, `venesect`, `surgery`, `grind`, `hone`;
and `lease`/`unlease` on duncan-hall's `provision`/`unprovision`
(wizard-axis holds those files; whichever merges second). Where the
extra word was the commoner English the view keeps **that** word and the
file is renamed: `light` (not `ignite`); the build lists any other such
pick in the MR.

### Resolution (D21–D23)

| what | from | to |
|---|---|---|
| where a verb looks first | every object arg on `reachable` = person ∪ here ∪ peers, person first (281 args) | no new seed, no flag: a **world act** declares `scope: [here, peers, person]`; an in-hand act keeps `reachable`; the binder compares **tiers across tries** (one-resolution § 3 row 11) so a whole-name hit later still beats a partial earlier. Audit rule in D21; `cut`, `saw`, `fell`, `dig`, `split`, `hew`, `harvest`, `mow`, `plough`, `scrape`, `groove`, `strew`, `sweep`, `repair`, `paint`, `wash` (the floor) go room-first |
| the scorer's name tiers (100/60/50/40, `bareName`) | `scope-walk.ts` :417-473 | collapse into keyword tiers; `NamedMixin.getKeywords()` folds the name and its bare form; the six drive findings keep their outcomes by keyword data (the table in one-resolution § 4) |
| synthesized candidates | detail ids (`pushDetails` :368-394), bulk materials (`pushBulkMaterials` :339-361) | derived `getKeywords()` overrides on `DetailedMixin` and `BulkableMixin`; MQL reads only Perceptible |
| hand-rolled listing filters | `LookController :211-220`, `SenseController :152-161`, `Container :386-397` | MQL predicates `:loose`, `:worn`, `:carried` delegating to `getLooseContents` / `Slotted.getAllOccupants`; `:visible` adopted |
| a disabled affordance row | `reason: string` (prose) | `+ validator`, `+ missing: <mixin>` (structured) |
| a script that would prompt | hangs or falls to a default | refuses, naming the input |

### Ordering against siblings

| sibling | overlap | this plan |
|---|---|---|
| `reqs/water-supply` (build-1) | `Bank`/`Wallet`/`Title`/`Clock`/`BankingControllerBase`, `check-reachability.ts`, employment `Employed`/`Position`/`Roster`/`ShiftSchedule`; `drink.yaml` (`quaff`), `open.yaml`, `fill.yaml`; `Throttleable`'s file | `bank`, `wallet`, `title`, `clock` are **W8, last**; never waited on; whichever merges second reconciles. `drink.yaml`'s word and `Throttleable`'s file: one-line reconciles |
| `build/client-surface` (build-3) | `_runChain` (the "Ring what?" prompt), `CommandLogic.objectCandidates`, `AssembleError.missing`, `Organization.ts` (+`showShiftStatus`), `ChatController.ts`, `LookController.ts`, `look.yaml` | W1 edits `_runChain` in the same region (scope filter first, then the chain, then the askable probe); `showShiftStatus` stays in `OrganizationMixin` (the chart); `look.yaml`'s one word + `l` alias by whichever merges second |
| `reqs/wizard-axis-cleanup` (build-4) | shell verbs, `reserve`/`treasury`, `ReloadController` (`--strict`), the domain-local `Lease`/`Unlease`/`Provision` controllers and views | authoring verbs OUT; `reload --strict` → `--force` and the `lease`/`unlease` words on duncan-hall by whichever merges second |
| `origin/fix/script-runner-decouple` | the `do` work, 1,338 commits behind | used as reference only; redone on master in W6; the branch is retired in the MR |

---

## Grounding

Facts verified this cycle by opening the files (paths under
`packages/server/src/mud/` unless given in full; `V/` =
`packages/content/platform/content/platform/cmd/`). ⚠ marks where a
survey or slate claim and the file disagreed.

### The command line and the dispatcher

- **Tokenizer.** `api/command-line.ts` (130 l) is the facade;
  `platform/idea/api/CommandLineLogic.ts` (390 l) is the logic: `lex`
  (:108-150) → `splitOnPipe` (:158-186) → `classify` (:197-262); the
  verb is `rawTokens[0].value` (:213-219, :315-318). `'` is a literal
  character (header :6-8); `"` is the only quoting form. `format()`
  (`formatCommand` :264, `quoteIfNeeded` :284, `NEEDS_QUOTING_RE =
  /[\s"\\|]/` :278) re-emits `rawTokens`. `ParsedCommand` is `{verb,
  rawTokens, source, start, emotePrefixed?}` (`api/command-line.ts`
  :51-67).
- **`@` is reserved nowhere** (no hit in `api/mql/*.ts`,
  `CommandLineLogic.ts`, `api/command.ts`, `CommandLogic.ts`,
  `lib/command/*.ts`; `mql-grammar.md` :863 only as `@@group`). Alias
  bodies use `$@` (`ShellLogic.ts` :170-176) — `$`-prefixed.
- **Dispatch order.** `lib/command/CommandGiver.ts` `executeCommand`
  (:650-830): input-mode prefix → `parser.parse` (`parsers/msh.ts`
  :57-77) → `ShellApi.expandAliases` (:773-783) → `_runChain` (:794).
  `_runChain` (:1001-1203): `matches = getAffordances().filter(hasVerb)`
  (:1008); unknown verb (:1082); per match `assemble` (:1067); shape →
  `continue` (:1090); bind/unknown-subcommand stop (:1091-1108); attempt
  ctx with `commandSource` (:1113-1127); a FIELD validator refusal falls
  through, the first stands (:1163-1178); all-shape →
  `shape-fall-through` (:1195-1199). `_executeOne` (:1215-1280) picks
  `controllerForSubcommand(sub) ?? resolvedController` (:1223-1226).
  **Unconsumed positionals are a shape error** (`CommandLogic.ts:2847`
  `'too many arguments'`); a missing required positional is a shape
  error (:2600-2606); a declared preposition is **consumed when present,
  never demanded** (`bindPositionals` :2570-2590) — there is no
  "required preposition" key in `command.schema.json` (only
  `prepositions` :262-268).
- **Affordances.** `getAffordances()` (:441-452) newest-first,
  `'self'` → the giver; `Affordance = {command, source, bucket}`
  (:296-302); `RecencyBucket = self | inventory | environment | peers`
  (:278). Pushers: `CommandLogic.ts` :3663-3746, `Caster.ts:215`,
  `Advancement.ts:456` (catalogues on `self`), shadows :3763, hosted
  updates :3838. `command-routing.md` :578-640 documents attribution.
- **A second match loop**: `lib/script/Interpreter.ts` `bindCommand`
  (:605-675), synchronous, inside a generator (:302); scripts never see
  alias expansion (`expandAliases` callers: `CommandGiver.ts:773`,
  `CardLogic.ts:118`).
- **Aliases.** `ShellLogic.expandAliases` (:88-113); `stripBypassPrefix`
  (:153-168); `expandOnce` replaces `rawTokens[0]`; the defaults tier:
  `lib/shell/Alias.ts` `collectDefaultAliases` (:154-190) unions
  `static defaultAliases` over `MixinApi.queryMixins(host.constructor)`
  and throws on a duplicate; lookup session → persistent → tombstone →
  defaults (:255-284); `removeAlias` writes the tombstone (:393-405).
  Shipped defaults: `Mobile.ts:300` (the directions), `Engaged.ts:122`
  (`stop`). ⚠ The defaults walk reads the **host's** mixin chain — a
  pack cannot add a layer to a player's `Shell`, so a pack verb's default
  alias has no home there (D16 decides one).
- **Cardinality.** `CommandLogic.applyCardinalityPolicy` (:1274-1360);
  `prompt` with no `context.interactive` → an `ambiguous`
  `validator-failed` (:1324-1325). `MqlApi.resolveOne`/`resolveMany`
  (`api/mql.ts` :97, :110) are synchronous; `me`, `#<id>`, `all X` are
  MQL's own.
- **`--async`/`--sync`** are already stripped by `assemble`
  (`CommandLogic.ts` :958-961, :1010-1017; `reservedAsync` :1109;
  `CommandGiver.ts` :1184-1189). ⚠ The bare multi-statement script line
  (`CommandGiver.ts` :839-853) awaits `ScriptApi.runAst` synchronously
  with no flag.
- **`onFiltered: take|warn|error`** shipped (`OnFilteredPolicy`
  `api/command.ts:607`; applied `CommandLogic.ts` :555-562; schema :289,
  :401); ⚠ zero views use it; there is no reserved `--strict` — the only
  `--strict` is `ReloadController`'s own (:10, :103, :116).
- **Prompts** live on the Interactive (`Interactive.ts` `promptConfirm`
  :373, `promptCompose` :387), not on `PromptApi` (⚠ the
  script-interaction slate is stale there); 20 files read
  `context.interactive`; `_dispatchBound` (`CommandGiver.ts:1301`)
  passes no interactive.
- **Note kinds**: `packages/types/src/index.ts` `Note` union :874-903
  (29 members; ⚠ `response-envelope.md:111` says 16);
  `CommandRejectedNote.reason` :565-583; the dispatcher proses
  `command-rejected`, `mql-error`, `validator-failed`, `controller-error`
  only (`proseForFrameworkNote`; `response-envelope.md` :470-478).
  `AffordanceEntry` :1503-1553 (`reason?: string`); the disabled row is
  built at `CommandLogic.ts` :2258-2264 from `note.detail` only (the
  `validator` name is dropped :2236-2239).
- **Help.** `CommandDefinition.getHelpText` (:456-527) renders
  `Subcommands:` (:489-506); `HelpCatalogue.ts` :429-447 one topic per
  verb (`keywords: [...def.verbs, 'command']` :440, `relations: []`
  :442); mixin topics :460-476 from `Mixins`; nothing groups by category
  (⚠ `category:` is on **0 of 371 views**).
- **Per-subcommand controllers** are first-class (`command.schema.json`
  :163; `command-spec.md` :1475-1540; `cockpit` ×6, `house` ×5, `trace`
  ×2). A subcommand controller **does not** receive a parent-bound arg
  (`CommandLogic.ts` :1037-1042); `args` XOR `subcommands` unless
  `fallthrough: true` (`command.schema.json` :52-59, :102-125) — so no
  inheritance exists; `store.yaml` repeats the book per subcommand.
- **A runtime alternate controller**: views are `command-view`
  documents (`CommandLogic.preloadAll` :693-733; `reload` :676-689); a
  runtime write via `DocumentApi.save` → `DocumentLogic.saveImpl`
  (:599-647; a changed `controller:` is wizard code trust :610-624;
  `CommandApi.validateCommandView` :626; `reload` :646). A controller is
  a class on disk named by a row (`command-spec.md` :1941-1956); the
  domain-local exemplar is `packages/content/terminus` (⚠ not
  `world-seed`, which ships no `src/`).

### The acts: `ActPlan`, its consumers, the outcome shapes, durations

(Unchanged from the first plan; verified again.) `lib/craft/ActPlan.ts`
(53 l) :24-28 / :31-46 / :49-53. `ManualBuildController.ts` (⚠ at
`platform/idea/cmd/crafting/`): `engageStep` :69-126, `engagePlan`
:141-171, `paceMs` :228, `declineStep` :244. `EngagedActController.ts`
`engageAct` :114-171 (⚠ no `engageStep`/`engageAround`). Effort reaches
`exert` from `SchedulerRegistry.emitExertion` :512-522. Nine protocol
mixins in `lib/craft/` with a `null` default; 25 implementers build
`line:` (kernel `Compounding.ts`, `Greenware.ts`, `Faced.ts`, `Mould.ts`,
`GlazeTub.ts`, `ScrewPress.ts`, `Rope.ts`; packs ceramics `Wheel`,
`BrickTable`, `TemperPit`; quarrying `Clay`; glass `Blowpipe`, `Melt`,
`Gather`; chandlery `DipPot`; papermaking `PulpVat`; baking
`DoughTrough`; carpentry `PatternStock`; tailoring `CuttingTool`; cordage
`RopeJack`; dairying `Churn`; sugar `SugarLoaf`; water `IceSheet`);
twelve consuming controllers (Shape, Knead, Carve, Cut, Dip, Paint, Stir,
Coil, cordage Twist; Impress, Turn, Stir's hand arm). ⚠ `fit` and
`strike` are not `ActPlan`. 112 `*Outcome`/`*Result` declarations; `ok:
false` at 1,064 sites; `Workable.ts` :82-145 is a second plan vocabulary
(`kind`/`prose`/`cost`). Kernel duration constants: `HeatController`
:32-36, crafting `PourController :40`, `WashController :45`,
`SteepController :37`, `RepairController :32`, `StirController :30-32`,
`BatheController :28-30`, `BailController :48-53`, `FireController :49`,
`BrushController :16`, `SweepController :23`, `RentController :33`, bulk
`PourController :271`; `engageAct` sites `HarvestController :432-434`,
`PlantController :444-446`, `BailController :172-174`.

### The kernel controllers in scope

(Unchanged; the per-line inventory is § Fault lines → *Rules moved*.)
Harvest 651 l (`Growing.ts`/`Soil.ts`/`Cultivable.ts` carry **no**
plan/complete methods; ⚠ `Cultivable.ts` is `lib/husbandry/`); Plant
617 l; Put 490 l (dead imports :69,:71); Order 859 l (**six** services,
`Tariff.ts:93-102`); Treat 687 l; Throw 366 l (`Tossable.tossTo`
`lib/spatial/Tossable.ts:39`; `Combatant.mayDeliverTo` :610,
`resolveThrown` :559); Read 298 l (`fireAnyWorking` :222); Fight 355 l
(every arm one `Combatant` call; ⚠ `fight.yaml:103` requires
`VitalsMixin` on a weapon slot); Tan 260 l (`lift` :177; docstring
:26-27 promises `get hide from pit`); bulk Pour 310 l + crafting Pour
230 l. Tests and wire files as in the first plan.

### The twelve switch controllers

Wiki 1062/17 · Party 341/15 · Chat 501/13 · Forum 561/11 · Pack 378/8 ·
Group 321/8 · Soul 359/8 · Bank 408/8 (`BankingControllerBase.resolveBank`
:73-83) · Job 745/5 (`MqlApi.resolveOne('reachable:[class.JobBoard]')`
:92-98) · Equip 902 (if-chain) · Tune 426/4 · Title 685/4. None gives a
subcommand its own `controller:`. Four controllers are named by views of
different verbs: `EquipController` (equip/wear/wield),
`UnequipController` (remove/unequip/unwield), `DescendController`
(ascend/descend), `ProfileController` (profile/score).

### One word, one view — the census

371 views; **65 carry more than one word, 77 extra words** (listed in
§ Fault lines; script `/home/bobalu/.claude/jobs/2eb60486/tmp/planner/fable/verbs.mjs`).
Schema payloads carry `verbs: cmd.verbs` (`CommandLogic.ts:1981`;
client `websocket.ts:969`); `AffordancesController.ts:33` and
`HelpCatalogue.ts:433,440` read `getPrimaryVerb`/`verbs`; `hasVerb`
(`CommandDefinition.ts:364`) matches any entry. `SCRIPT_BUILTINS`
(`lib/script/builtins.ts:28-37`): `set if each while def wait every
when` — claimed on every line (`check-verb-collisions.ts` :120-131).
Subcommands named like a builtin: `reserve/equip/alias/settings/var set`
(5); `make` is not a builtin.

### `make`, `do`, `reel`, `drift` (the folded-in verbs)

- `make` on master: `V/crafting/make.yaml` (`recipe` string, `brand`
  `with`), `MakeController extends CraftController` (`requireDeed` :36 →
  `ScriptApi.invoke` :39), innate on `Avatar.ts:333`; `scripting.md`
  :51, :259-263, :315, :329-346, :367-368, :400-404; `command-spec.md`
  :154-156, :171-172; `CLAUDE.md` :189, :846.
- `origin/fix/script-runner-decouple`: 5 commits, 55 files
  (+539/−761), merge-base `dbf173126`, 1,338 behind. Its `do.yaml`
  (`shell/`; `verbs: [do]`; `name` string required, `arg` string `with`;
  animate + conscious) and `DoController.ts` (48 l: `ScriptApi.invoke`;
  miss → `unknown-script`; ungated by design); `make` deleted; `Avatar`
  swaps the view; `captureManualBuild` (`api/script.ts:160`,
  `ScriptLogic` :342, :643) and `Transcriber.ts` removed;
  `RecipeKnowledge` → `lib/craft/`; `CraftingLogic.recordCraftEvidence`;
  the capture tails removed from Boil/Craft/Heat/Pour/Stir, baking
  Knead, cooking Cook/Plate, hospitality Mix/Muddle/Serve/Strain,
  smithing Forge/Hammer/Quench; prose in drilling `line.yaml`, rejection
  `claims-office`/`store-counter`, apiculture README, the lounge
  `martini.msh`; docs. ⚠ Stale: baking `KneadController` is gone (knead
  is kernel `crafting/KneadController` + `DoughTrough.ts:104`);
  `BoilController` was deleted (`d22c2a429`); `CraftingLogic`,
  `api/crafting.ts`, Heat/Pour/Stir, `ManualBuild.ts` diverged. The
  capture sites on master today: `PourController :165,:221`,
  `HeatController :119`, `HammerController :167`, `MuddleController :66`,
  `StrainController :86-87,:122`, `QuenchController :156-157,:187`,
  `PlateController :80-81,:107`, `DoughTrough.ts:104`.
- `reel`: fishing `reel.yaml` (target `any` not greedy :27, tool
  objects greedy default `reachable:[capability.reeling]` :35-40,
  `--count` :43-44); pre-silk (`ae5b5fc53^`): `args: []`, "Take line
  in". `ReelController` (`ManualBuildController`; `reelableOf` :112-118
  `reelable === true` + `typeof planReel/completeReel`); fishing
  `src/lib/Reelable.ts`; `reel-unified.test.ts`. Sericulture:
  `Cocoons.ts:39` imports `Reelable` from `@saxonberg/content-trade-fishing`,
  :106 implements, :225/:231/:296; `ReelingTool.ts:18-24` affords the
  fishing view key; `reels` brain :158 `forceCommand('reel cocoons --count
  …')`; `package.json` depends on fishing (⚠ `pack.yaml` does not);
  `src/__tests__/reel.test.ts`; wire `silk.dirty` :372, :384, :406.
- `drift`: ⚠ the split is **already on master** (`3e915f1d3`,
  2026-10-09): mining `cmd/mining/drive.yaml` `verbs: [drift]` :18 (file
  and `DriveController.ts:43` still named `drive`); platform
  `movement/drive.yaml` `verbs: [drive]` with **no `unreachable:`**
  (⚠ the slate's "marked unreachable" is false); `Drivable.ts:105-110`
  affords it; `acts.test.ts` :433-436, :448-475, :477-516 assert one
  claimant each and that Drivable **has** the static (:514-515).

### Institution ledger verbs (the census)

Flat views whose controller writes a book (method, line): `pay`
(`BankingApi.settle`/`settleSale`), `draw` (`payDraw` :56), `tip`
(`settle` :70/`transfer` :131), `appoint`/`dismiss`/`apply`/`quit`
(roster `.appoint`/`.dismiss`/`.quitJob`), `consign` (`recordListing`
:255), `reclaim` (`removeHolding` :87), `check` (`recordHolding` :104),
`buy` (`ForSale.sell` :58 → `settleSale`), `sell` (`Stock.buyFrom` :39),
`order`, `rent`, `fulfill` (`ContractApi.fulfill`), `transfer`
(`ParcelApi.transfer`), `subdivide` (`ParcelApi.subdivide`), `embody`
(`issueNote` :791), mining `stake`, `assay` (fee), water `pilot` (fee),
duncan-hall `provision`/`unprovision`, mayfield `lease`/`unlease`
(parcel). One level down: `charter` (`Ship.charterTo` :1488), the herd
verbs (`HerdRegistry`). `collect` writes none. `store.yaml` is the
model (`StoreBook.ts:16-24` affords; `StoreController` :44-48;
`book` repeated per subcommand). ⚠ Counting "the controller writes a
book" over-counts (`assay`, `pilot`, `embody` pay a fee); the gate
counts **the view's operand is the book** (a `book`/`shelf`/`rack`/
`organization`/`registry` arg).

### Protocols, probes, presentation, resolution (the folded-in link-1/3 items)

- Bare shapes and their hosts: § Fault lines → *Protocol conversions*
  (`Workable.ts` :147-189; `Pumpable.ts:108`; `Tappable.ts:45` ⚠ at
  `lib/husbandry/`; `Cuttable.ts` :45-53; `Producing.ts:204` implements
  Tappable; `TapActController.ts:95-102` already narrows `isProducing`).
- **The `typeof` probes that narrow a target** (27 controllers in all;
  the ones a predicate must replace): `CutController :31,:35`;
  `PumpController :53,:61`; `BailController :65-68` (LiftSource);
  `DigController :91-92`; `SplitController :60-61`; `SampleController
  :226` (`sampleFace`: mining `Working.ts:492`, ground `Strata.ts:107`);
  `SurveyController :341` (`lanesAt`, a catalogue); `TeleportController
  :513` (TravelNode); `HitchController :202` (`canHitch` → `isHaulable`
  exists); `TitleController :120,:478` (+ `constructor.name ===
  'DeedDesk'` :477); `ShootController :259` (`getCalibre`,
  `Projectile.ts:39`); forestry `TapController :63`; fishing
  `ReelController :116`; farming `FieldWorkController :84-85`
  (`isImprovable` covers one); mining `AssayController :417`
  (`getGrade` — ⚠ `Ore` is `SampledMixin(StackableMixin(Good))`, not
  Graded), `StakeController :303`, `ShoreController :129`,
  `DriveController :71` (MineWarren, n/a); ranching `BreedController :59`
  (`isOrganism` exists), `HandleController :43-44` (`isHandling`
  exists), `DraftController :386`; smithing `HammerController :208`;
  smelting `SmeltController :971`; dyeing/textiles
  `competenceBandFor` ×3 (`isAdvancing` exists). `PutController :245`
  probes an optional hook on a narrowed Container (fine).
- The cuts: `SawController` (427 l; `instanceof Sawmill` :134, `Bole`
  :175/:287/:351), `RiveController` (384; `Bole || Billet` :134),
  `FellController` (558; the cross-cut arm `instanceof Bole` :157),
  `ButcherController` (671; `instanceof Corpse` :301/:379), glass
  `Scribe`/`Snap`/`Groze` (`instanceof Sheet` :24/:34/:39), ice
  `GrooveController` (⚠ `mark` is now `groove`)/`ScrapeController` over
  `IceActController.ts:46` (`floor instanceof IceSheet`). ⚠ **None calls
  `cutPlan`**; `IceSheet` implements `Cuttable` by class (:94, :354).
  `shear` is a tap, not a cut.
- `boil`: `heat.yaml:7` `verbs: [heat, boil]`; `HeatController`
  `boilInPot` :144-196 (`DISINFECT_HOLD_S` :36; `holdAtHeat(WATER_BOIL_K,
  300, {wet: true})` :188 — nothing checks the pot holds water, the
  target is never moved in). `Soilable.holdAtHeat` :532-542 →
  `recordHeat` :544-556 **keeps the hottest single hold, never sums**,
  and re-runs `killOver` every call. `Thermal.reconcilePhaseImpl` :2251
  has a boil arm (`boilHeldSeconds` :2384-2414, `purifyIfHeld` :2492/:2625)
  for the **liquid only**; `enclosingBath` :585-593 sets a body in a pot
  to the bath's temperature. ⚠ No reconcile stamps the vessel's
  Soilable contents.
- `scrub`: `ScrubController` (23 l) extends `WashController` and
  overrides `effort()` (3 / 1.5) and `act()`; `WashController`
  `durationMs: WASH_MS * effort` :149/:196, `effortW: effort > 1 ? 350 :
  200`; `scrub.yaml` has a `brush` slot `wash.yaml` lacks.
- `_mixinKind` appears in no code. The card's chips come from
  `CommandLogic.ts` :2137-2143 (`composition: string[]`, types
  :2264-2269; client `CardBodies.tsx` :574-617 "Interfaces"); Studio's
  palette `StudioLogic.listMixins` :791-830 (names only;
  `MixinPaletteEntry.kind: 'mixin'|'base'` types :4605;
  `scanExportSources` :384-424 already regexes `_mixinName` :400;
  `describeClass` :597/:616); help mixin topics `HelpCatalogue.ts`
  :460-476, relations :612-640. ⚠ Nothing at runtime maps a mixin to its
  composers (`composesMixin` is `scripts/pack-roots.ts:123`, script-only).
- Resolution: `scope-walk.ts` `scoreCandidate` :417-473 keeps every
  tier (100 :430, 70 :438, 60 :441-447, 50 :449, 40 :458-462, 25, 10n,
  5n); `bareName` :478-483; `scoreCandidates` :495-533, `NAME_TIER = 40`
  :536. ⚠ `NamedMixin` has **no** `getKeywords`; `Perceptible.getKeywords`
  :154-156 returns authored keywords only; `Exit.getKeywords` is done
  (`Exit.ts:299-307`). `pushDetails` :368-394 and `pushBulkMaterials`
  :339-361 still synthesize candidates. Predicates registry
  `api/mql/predicates.ts:124-130` (living/online/mine/here/visible);
  `getLooseContents` `Container.ts:515` (guard :524-528);
  `Slotted.getAllOccupants` :129/:292; the three verbatim filter copies
  `LookController :211-220`, `SenseController :152-161`, `Container
  :386-397`.
- Object-taxonomy: `signatureFromParts` `lib/studio/Blueprint.ts:192-198`
  (`sort().join`), `findBySignature` `BlueprintCatalogue.ts:75`;
  collisions `AudibleMixin(Tool)` ×4 (medicine Splint, PrescriptionPad,
  Syringe; smithing Whetstone), SurgicalKit/SutureKit.
- Call security: `FromMixin` `SecurityPolicies.ts:411` (marker check
  :423-424); 32 `FromMixin(` sites; 30 `where: (caller` sites; no
  `SelfSubject`/`FromIdentity`/`Audited`; `FireLogic.ts:29` has a local
  `selfSubject`.
- Mixin file naming: the twelve (§ Fault lines) verified at
  `Consignment.ts:71/:187`, `Drivable.ts:200`, `Staged.ts:363/:534`,
  `Utensil.ts:70`, `Tooled.ts:86`, `Disguise.ts:51`, `Register.ts:74`,
  `reserve.ts:229`, `LoungeMixin.ts:67`, quarrying `Working.ts:223`; a
  sweep of all 281 factories found no other; `check-mixin-names.ts` has
  no file-name check.
- The capability-keyed affordance table: built `b7f48eea0`
  (2026-07-30), **reversed** by `ff9fd938b` and `85c7d47c5` ("one record
  of verb affordances", 2026-08-30). Today: the `[capability.X]` atom
  (`resolver.ts` :1646, :1725-1760), `Tool.capabilities`
  (`Tooled.ts:105`, `getCapabilities` :173, `hasCapability` :193),
  `CapabilitySpec` (`ToolCapability.ts:49-57`; header :20-37 "names no
  verbs"); `command-routing.md` :391-469 forbids the instance record
  with five reasons; `crafting.md` :455-466; `antipatterns.md:2836`.
  ⚠ Stale docstring `Tooled.ts:101` still advertises `verbs?`.

### The gates and the census (re-measured; all exit 0 today)

(As in the first plan.) `pack-roots.ts` has no shared controller
enumerator; `check-instrument-args.ts` :288-311 misses the ten
domain-local controllers at `<pack>/src/<locality>/idea/cmd/` and the
`src/lib/*Controller.ts` bases; `KNOWN_COLLISIONS` :93-99 holds
`lease`/`unlease`/`pour` (⚠ not `drive`); `check-reachability.ts`
ceilings 6/114/68/0/0; `check-completion-this.ts` 0 both ways;
`check-controller-rows.ts` 373 refs; `check-arg-kinds.ts` 435 object
args. Heuristic census over 385 controllers: mutations 440, module
functions 275, decisions 1,345, duration decls 60, self-resolution 414,
duck probes 165 (kernel / packs / world split in the first plan's
table); 52 subcommand/flat-verb pairs (28 words) — one same-act
(`fight defend`); AST duck census 302 names/622 sites, **five**
method probes on a name nobody defines (`beforeRestore`,
`setHandling`, `grazingDemandPerGameDay`, `getFixedInPlace`,
`getVentilated`).

### The wire harness

`packages/wire` `Session.open` :288, `cmd` :620 → `{status, notes,
text, said()}`, `query`/`queryOne`, `awaitActivity` :811,
`awaitPrompt`/`answerPrompt`; `expectNote(r, kind, {reason})`; staging
`/auth/test-clock`, `/auth/test-hand` :315-328, `/auth/test-weather`,
`/auth/test-ship` (⚠ no `/auth/test-stage`); `WIRE_PORT` 2012 default
(this worktree 2013); no test snapshots an envelope.

### What does NOT exist (so the build does not go looking)

No `lint:command-views`, `-one-word`, `-mixin-files`,
`-institution-verbs`, `-duck-typing`, `-controller-*`, `-mixin-clusters`,
`-subcommand-words`; no shared controller enumerator; no
plan/complete methods on `Growing`/`Soil`/`Cultivable`/`Vitals`/
`Tariff`/`Placing`; no `orderPlanFor`/`treatmentPlanFor`/
`harvestPlanFor`/`receivePour`/`cutPlan` on the sweep's targets; no
note kind carrying an alternative; no `scope` on `ParsedCommand`; no
`do`, `unwind`, `recite`, `drift.yaml`; no `category:` on any view; no
`prepositionRequired`; no `_mixinKind`; no `isTravelNode`,
`isPumpable`, `isSplittable`, `isCuttable`; no `NamedMixin.getKeywords`;
no `:loose`/`:worn`/`:carried` predicates; no reserved `--strict`; no
`SelfSubject`; no `OnCallMixin`, `MadeFromMixin`, `HaulOutMixin`,
`EatingMixin`, `BuoyantMixin`.

---

## ⭐⭐ New substrate

Each cites the slate's reuse-ledger row, a folded-in source, or says
*genuinely new* and what was searched.

| kind | name | ledger / source |
|---|---|---|
| field | `ParsedCommand.scope?: string` | ledger "`@` in the command line" |
| note kind | `other-offer { verb, source: StuffRef, scopedForm }` | ledger "telling the player the other offer exists" — a new kind because kinds are per-kind-frozen |
| note reasons | `command-rejected.reason` += `source-not-found`, `source-affords-nothing`, `needs-input` (script-interaction: the missing input named in `detail`) | same row; script-interaction slate |
| method | `CommandGiver.matchAffordances(parsed)` | ledger "narrowing the affordances to one source"; shared with `Interpreter.bindCommand` |
| assemble options | `{scopeSource}`; the reserved `--strict`/`--loose` beside `reservedAsync` | ledger; explicit-targeting (`onFiltered` shipped, the override is its stated tail) |
| view keys | `category:` (required, = directory); `defaultAliases: [{name, description?}]`; `prepositionRequired: true` on a positional | command-taxonomy item 2; the shell-alias defaults tier re-homed (D16); *genuinely new* — searched `command.schema.json`, `bindPositionals` :2560-2847 |
| mixins (carved halves) | `OnCallMixin`, `HaulOutMixin`, `EatingMixin`, `BuoyantMixin`, `MadeFromMixin` | ledger "a split mixin"; the Attired precedent — five `Mixins` entries; the five originals keep their names |
| protocol mixins | `SplittableMixin`, `PumpableMixin`, `CuttableMixin`, `PumpSourceMixin`, `LiftSourceMixin`, `TravelNodeMixin` (from bare shapes); `PoweredMixin`, `WaterPoweredMixin`, `NameTakingMixin` (from the duck census); `PourTargetMixin` (rung 1 for `pour`) | verb-interfaces § bare shapes (each ≥2 kinds of host); ledger "a registered marker mixin"; ledger "`pour` as one act" |
| mixin static | `static _mixinKind = 'protocol'` on every protocol mixin; `composition` becomes `{name, kind}[]`; `MixinPaletteEntry.kind` gains `'protocol'` | verb-interfaces § 2 |
| MQL predicates | `:loose`, `:worn`, `:carried` | mql-predicate-parity |
| methods on existing mixins | `NamedMixin.getKeywords` (name + bare form), `DetailedMixin.getKeywords` (detail ids), `BulkableMixin.getKeywords` (held material), `PricedOfferMixin.orderPlanFor`, `VitalsMixin.treatmentPlanFor`, `GrowingMixin.harvestPlanFor`, `SoilMixin.sowPlanFor`/`harvestPartFor`, `CultivableMixin.plantPlanFor`, `PlacingMixin.placementFor`, `SlottedMixin.openSlotFor`, `Combatant.deliverThrown`, `TanningMixin.onLiftedFrom`, `Cocoons.planUnwind`/`completeUnwind`, `Soilable.holdAtHeatFor(K, enteredAtS)` (D8c) | one-resolution §§ 4–5; the kernel acts |
| type change | `ActRefusal`/`ActPlan`/`ActOutcome` lose `line`/`beginSelf`/`beginPeers`; facts + a reason union per act; `Workable`'s `WorkPlan` converges on it | ledger "an act's plan, refusal, outcome" |
| `AffordanceEntry` | `+ validator?`, `+ missing?: string` on a disabled row | affordance-suggestion |
| security | `SecurityPolicies.SelfSubject(argIndex)` (the hoist of the 30 `where: (caller…` self-subject clauses) | call-security-pass; `FireLogic.ts:29` is the local precedent |
| studio | the blueprint signature folds the afforded view set | object-taxonomy |
| classes | ~80 per-subcommand controllers + 10 noun bases; `FightGambitController` + 7; `ThrowToController`, `ThrowAtController`, `ReciteController`, `DoController`, sericulture `UnwindController`; `WearController`, `WieldController`, `RemoveController`, `UnwieldController`, `AscendController`, `ScoreController` (+ bases); `HarvestWordedController` (the doctrine exemplar) | ledger "a subcommand with its own controller"; the decouple branch |
| rows | one `<Name>Controller.yaml` per new controller | `lint:controller-rows` |
| gates | `check-command-views.ts` (schema), `check-one-word.ts`, `check-mixin-files.ts`, `check-institution-verbs.ts`, `check-duck-typing.ts`, `check-controller-resolution.ts` (absorbs `instrument-args`), `check-controller-mutations.ts`, `check-controller-decisions.ts`, `check-controller-functions.ts`, `check-mixin-clusters.ts`, `check-subcommand-words.ts`; `check-verb-collisions.ts` learns disjoint shapes; `pack-roots.controllerFiles()` | ledger "count-only-falls gates"; command-taxonomy items 3, 5; the disjointness rule *genuinely new* |
| wire | `controllers-are-io.dirty.wire.test.ts` + the committed baseline JSON | ledger "the before/after record" |
| Api / hook / registry / document kind | **none** (`onContainableRemoved` exists; `RecipeKnowledge` moves, not minted) | — |

Searched and rejected: a `RemedyMixin` for `treat` (one host); a
`ServiceMixin` for `order` (`PricedOfferMixin` is the provider); a
`DiggableMixin`, `CutPlannerMixin`, `ReelableMixin` (one host each — a
property of its host); a `StaffMixin`/`staff` noun (the business's books
already have a noun, `house`); the capability-keyed affordance table
(§ Requirements disagreement 1); a central act registry (⛔ owner).

---

## Plan-level decisions

### D1 — `@` splits in the tokenizer; `format()` re-emits it; aliases carry it

`CommandLineLogic.parsePipelineImpl` (:305-325): after `classify`, if
`rawTokens[0]` is a word with `@` at an index > 0, `verb` = the part
before the first `@`, `scope` = the rest; the raw token is untouched so
`formatCommand` (:264) round-trips. `format()` of a synthesized command
whose token 0 lacks `@` but whose `scope` is set emits
`${token0}@${quoteIfNeeded(scope)}`. A leading `@` is not a split. Only
the verb token is ever looked at — `say hi @bob` is untouched (a
tokenizer test for the five forms). Multi-word scopes are quoted with
`"` (`wind@"pocket watch"`). `ShellLogic.expandAliases` (:88-113) copies
the invocation's `scope` onto the result after `expandRecursive` and
`stripBypassPrefix`; the invocation's scope wins over one in an alias
body.

### D2 — source filter, the source fills its slot, cardinality, batch

In `CommandGiver.matchAffordances(parsed)` (shared with
`Interpreter.bindCommand`): resolve the scope with
`MqlApi.resolveMany(scope, ctx)` using the binder's own `MqlContext`
for a `scope: [reachable]` arg (sync). An affordance is *from* `s`
when `a.source === s`, or `s === giver && a.bucket === 'self'` (a
catalogue pushed on the giver's self bucket is the giver's own —
`cast@me`). Zero matches → `command-rejected: source-not-found`; matches
but none affords the verb → `source-affords-nothing`; both prosed by the
dispatcher. Several matches → `applyCardinalityPolicy` with `{type:
'object', onExcess: 'prompt'}` and the binder's `how` (`isSet`,
`quantity`, factored out of the resolve sites); a script or NPC gets the
`ambiguous` refusal and never waits; a scope that declared plurality
(`all watches`) is a **batch**: `_runChain` runs once per source, each
its own attempt ctx, the notes folded onto the outer ctx (one envelope).
⭐ **The source fills the slot it fits** (`assemble(…, {scopeSource})`):
for the first positional object arg whose `requires:` the source
satisfies — (a) nothing typed → the source is bound (a per-invocation
`default: "#<id>"`); (b) a typed word that matches the source → the
source wins the slot; (c) a typed word that does not → typed words win.
`wind@me:watch` winds the carried watch (`wind.yaml:13-17` requires a
target); `say@me hello` has no slot and is unaffected. Unscoped commands
are byte-identical to today. (Stands — owner, 2026-11-06.)

### D3 — the other offer

After the chain settles on a refusal (a standing field `validator-failed`
or a `controller-rejected` on the claiming attempt), probe every
remaining same-verb affordance from a different source: `assemble` with
that source as `scopeSource`, `resolveModel` with `interactive`
stripped, preloads, validators. The first that passes is the other
offer: `other-offer { verb, source, scopedForm }`, prosed by the
dispatcher (*"The wheat on the far bed also answers `harvest` —
`harvest@here:2nd wheat`."*). The scoped form is derived by one rule
(`me` / `me:<handle>` / `here:<handle>` / `<handle>`, with the ordinal
when still ambiguous — the binder's own natural-language layer) and
proved by resolving it once. "Also answers" is a binder fact; the
controller is never run speculatively.

### D4 — one outcome convention; the words come off the object

`lib/craft/ActPlan.ts` becomes `ActRefusal<R> {ok:false, reason: R,
facts?}`, `ActPlan<F> {ok:true, durationMs, effortW, onComplete: () =>
ActDone<F>, onAbort?}`, `ActOutcome<F> {ok:true, facts: F}`. No `Mml`
anywhere. Each protocol file declares its reason union and facts type; a
controller's wording is an exhaustive `switch` (a `never` arm).
`ManualBuildController.engagePlan(context, plan, words: {beginSelf,
beginPeers?, onRefused, onDone?})`; `EngagedActController.engageAct`
gains the plan overload. `Workable`'s `WorkPlan`/`WorkRefusal`
(`kind`/`prose`/`cost`) converge on the same shape (`dig`/`split`/`hew`
and the tap verbs word their own prose) — this closes the "second plan
vocabulary". `fit`'s `pasteOn` and `StrikingDie.strikeWith` take the
shape too. Every implementer in § Grounding rewrites `line:` →
`reason`; every consuming controller gains the `switch` with the former
words verbatim. Credit rides the outcome's facts (`credit?`).

### D5 — durations and effort move with the act

Harvest/Plant's inline durations and felt costs, Order's bath and
transfusion, crafting Pour's `POUR_MS`/`150`, bulk Pour's watch effort,
`WASH_MS × effort` (now `--hard`), move into the objects' plans; the
object converts a felt cost with `actor.wattsForFeltCost`. The remaining
constants are counted by `lint:controller-decisions`. Acceptance: the
baseline's `engagement-started.duration` per step is equal before and
after.

### D6 — the five splits, each half on its honest hosts

§ Fault lines gives the table. Rules: the original idea keeps the name
and the file; the later-added idea leaves to a new file named for it;
no composite; the carved half composes on its honest hosts only
(`OnCall` → `BusinessMixin`; `MadeFrom` → `Good`, `Vessel`; `HaulOut`,
`Eating`, `Buoyant` → the same hosts as their originals, because every
host is honestly both); every `isX`/`FromMixin`/`findByMixin` site that
reads a carved member narrows on the new predicate (the sites are
listed in the table); `Mixins` gains five names; persisted field names
unchanged (restore is key-agnostic, `PersistableLogic.ts` :746-762). A
unit test per split: capture a host, materialize a fresh one, read every
persisted field back; and the Attired-style invariant (*a government is
Organization and NOT OnCall; a cow is Chattel and NOT MadeFrom*).
`lint:mixin-clusters` 45 → 40.

### D7 — markers (D7a) and mixin files (D7b)

- **D7a.** Mint `PoweredMixin` (from the bare `lib/supply/Powered.ts`;
  hosts `GridPoweredMixin`, `ComminutingMixin`, `Sawmill`, `GristMill`),
  `WaterPoweredMixin` (`getReachRef`, `generationW`; hosts water
  `Conduit`, `ControlStructure`; the probe-local interfaces in
  `Sawmill.ts`, `GristMill.ts`, `WatercourseCatalogue.ts`,
  `PowerReading.ts` deleted), `NameTakingMixin` (`canBeNamedBy`; hosts
  `Named`, `Crafted`, `Assembled`). Fix the five dead names (wire or
  delete, recorded per site). Type the archetype record and the
  validator-module shape; allowlist the thenable idiom. Replace the
  probes a predicate already covers (`getContainer` ×8, `getQuantity`
  ×5, `getContents`, `getHandling`, `'organization' in` ×7, `tool`,
  `store`; `getGrade` → `isGraded` — ⚠ `Ore` must compose `GradedMixin`
  or the probe stays a finding; `getSampling` → `isSampled`;
  `getCellSize` → `instanceof CartesianZone`). `getMass` stays a finding.
- **D7b.** `lint:mixin-files`: a factory `FooMixin` lives in `Foo.ts`
  (kernel `lib/**`, `world/**`, every pack `src/lib/**`); ceiling = the
  W0 census (12 on master; 11 if water-supply's `Throttleable` lands
  first) → 0 at W3. The twelve moves are in § Fault lines; importers
  (`ToolMixin` 28, `ReservedMixin` 62) are mechanical re-paths; B4 — grep
  content for any template `class:` that names a moved file (none
  expected: mixins are never instanced).

### D8 — bare verb shapes → protocol mixins; presentation; the cuts; `boil`; `scrub`; `affords`

- **D8a. The earned test, applied** (§ Fault lines → *Protocol
  conversions*): six conversions (`Splittable`, `Pumpable`, `Cuttable`,
  `PumpSource`, `LiftSource`, `TravelNode`), three demotions
  (`Diggable`, `CutPlanner`, `Reelable`), one deletion (`Tappable` — it
  is `Producing`). Every conversion: `_mixinName`, `_mixinKind =
  'protocol'`, the method with a refusing default, the IS/IS-NOT
  docstring, a `Mixins` entry, `MixinApi.isX`; the view's `requires:`
  names it (each moves an `any` off `lint:arg-kinds`); the controller
  narrows on the predicate. The eleven other target-narrowing `typeof`
  probes: `SampleController :226` → `SampledFaceMixin`? no — one chain
  (`Working`/`Strata`) → a kernel method on `GroundMixin`;
  `SurveyController :341` (a catalogue, not a target) → typed import;
  `TitleController :120/:478` → `isPlatBook`/`instanceof DeedDesk`;
  `ShootController :259` → `isProjectile`; `FieldWorkController :84-85`
  → `isImprovable` + `instanceof Tract`; `AssayController :417` →
  `isGraded` (after `Ore` composes it); `StakeController :303` →
  `instanceof ClaimsRegister`; `BreedController :59` → `isOrganism`;
  `HandleController :43-44` → `isHandling` + `instanceof`;
  `DraftController :386` → `instanceof Herdbook`; `HammerController :208`
  → `instanceof Bloom`; `SmeltController :971` → `instanceof Ore`; the
  three `competenceBandFor` → `isAdvancing`. `MineWarren` probes stay
  (not a Stuff target).
- **D8b. Presentation.** `composition` → `{name, kind}[]`
  (`CommandLogic.ts` :2137-2143; types :2264-2269; `CardBodies.tsx`
  renders protocol chips as *answers: turn · dip* beside the noun
  chips); Studio's palette gains `kind: 'protocol'` via the export scan
  (`scanExportSources` :384-424 regexes `_mixinKind` as it does
  `_mixinName`); `help <verb>` lists *answers:* — the view's `requires:`
  mixins and, under each, the classes that compose it, read **lazily**
  from `StudioLogic`'s export scan (runtime, cached; load on use, no
  build artifact and no boot entry). `help turn` lists who answers
  `turn`. Drive 25.
- **D8c. The cuts sweep and `boil`.** `CuttableMixin.cutPlan(req)` on
  `Bole`, `Billet`, `Corpse`, glass `Sheet`, `IceSheet` (by mixin now),
  `Rope`, `SugarLoaf`; the seven cut controllers become I/O over it
  (their `instanceof` arms move into each host's `cutPlan`). **The line:**
  only the cut's decision moves; those packs' other mutations/decisions
  are the pack burn-down's. `boil`: the vessel's thermal reconcile, in
  its boil arm (`Thermal.ts` ~:2603-2625), stamps each Soilable occupant
  with a new `Soilable.holdAtHeatFor(K, enteredAtS)` that keeps a
  **per-occupant clock since entry** and kills **once, incrementally**
  (⚠ `recordHeat` :544-556 replaces rather than sums, and `holdAtHeat`
  re-kills on every call — both traps named by the survey); `boilInPot`
  retires; the `boil` word is deleted; the water build's purification
  (`purifyIfHeld`) is untouched. `scrub` → `wash <x> --hard` (the
  `cut.yaml` boolean-option precedent :62-73); `ScrubController` and
  `scrub.yaml` deleted; the `brush` slot joins `wash.yaml`.
- **D8d. `requires: affords`.** Built as a slot predicate: the candidate
  itself contributes this view (its class statics, conferred ones
  included, via `queryMixins` + `commandContributions`), opted into per
  slot. The probe against twelve verbs is recorded in the W4 commit:
  `wind`, `adjust`, `pump`, `turn`, `dip`, `carve` (on), `strain`,
  `serve`, `stir`, `tap`, `blow`, `switch` — with the four edges
  (affording ≠ target; placement; conferred; two roles) answered per
  verb. Kept beside the protocol mixin, never instead of it.

### D9 — the subcommand rule as command-taxonomy wrote it

*An act on the world is a bare verb; a transaction with an institution's
book is a subcommand of the institution's noun.* The census
(§ Grounding) and the decisions are in § Fault lines → *Verbs*. Edge
cases decided: `buy`/`sell`/`order`/`rent`/`charter` are acts on a good
(the slate's item 1); `pay`/`tip`/`collect` are acts with a recipient;
fee-paying acts (`assay`, `pilot`, `embody`) are acts; the herd verbs
are acts on animals; `consign`/`reclaim`/`check` are the shelf's and the
rack's books; `appoint`/`dismiss`/`draw` are the house's; `apply`/
`quit`/`fulfill` are the job board's; `transfer`/`subdivide` are the
title's (W8). A subcommand binds its own book (`args` XOR `subcommands`;
no inheritance — the shipped `store` shape). Subcommand words are scoped
by their noun; `make` is kept under its five nouns (one act: create a
record; the verb `make` is gone); `fight defend` routes to
`DefendController`. The twelve switch controllers → per-subcommand
controllers over a base per noun. Fight: one `FightGambitController`
for the twelve gambit words (one act, `queueGambit(name)`) + seven.
`fight.yaml:103`'s `VitalsMixin` on a weapon slot → `WieldableMixin` (a
one-line finding). Options replace preposition piles with **no** old
form kept: `carve X from Y` + `--with`/`--of`/`--for`; `plant X in Y` +
`--with`/`--at`; `harvest X` + `--with`/`--at`; `treat X` + `--with`/
`--for`. `lint:institution-verbs`: a flat view whose operand is a book
→ ceiling = the W0 census → 0 at W7 (W8 for `title`).

### D10 — `throw`'s three shapes, `recite`, tan's lift

`throw.yaml` (`item`), `throw-to.yaml` (`item`, `recipient` with
`prepositions: [to]`, `prepositionRequired: true`), `throw-at.yaml`
(`item`, `target` with `[at]`, required). Each its own controller
(`ThrowController` pitch; `ThrowToController` → `Tossable.tossTo`;
`ThrowAtController` → `mayDeliverTo`, `initiateCombat`,
`Combatant.deliverThrown`). `recite <scroll>` (`magic/`, afforded by the
scroll's class on `inventory`/`peers`, `requires: [ArcaneMixin,
MarkedMixin]`); `read` never casts. Tan: `TanningMixin.onLiftedFrom(pit,
by)` from `Tanpit`'s containable-removed hook, the remover threaded from
`ContainmentApi.move`'s custody derivation if the hook lacks it.

### D11 — `order`, `treat`, `put`, `harvest`/`plant` protocols

As in the first plan: `PricedOfferMixin.orderPlanFor(req)` (`Tariff`,
`CommerceMenu` override; the subject a view arg; `onExcess: prompt` on
`counter` retires the two-houses scan); `VitalsMixin.treatmentPlanFor`
(the patient decides; the remedy answers through `isDressing` /
`isBulkable` / hands); `PlacingMixin.placementFor(word)`,
`SlottedMixin.openSlotFor`, `ContainmentApi.move` the one primitive,
`Feeder`'s note on its own hook; `GrowingMixin.harvestPlanFor`,
`SoilMixin.sowPlanFor`/`harvestPartFor`, `CultivableMixin.plantPlanFor`.
`HarvestController`'s wording is three overridable methods;
`HarvestWordedController` overrides them (drive 16).

### D12 — `pour` unified

`PourTargetMixin.receivePour(req)` on `BulkableMixin` and
`ManualBuildMixin`; one view `V/bulk/pour.yaml` `verbs: [pour]`,
`target: PourTargetMixin`; `crafting/pour.yaml` and `crafting/PourController.ts`
deleted; `ManualBuildMixin`'s contributions name the bulk view;
`KNOWN_COLLISIONS` :98 removed (the gate fails if left).

### D13 — the before/after record; D14 — drive 16; D15 — who proses what

Unchanged from the first plan: W0's wire file records steps 10–15
(`{status, notes[{kind, reason}], duration, state}`, no prose) to a
committed baseline and compares thereafter; `HarvestWordedController`
is installed at runtime by a wizard `DocumentApi.save` of the `harvest`
view, harvests, then restores (`.dirty`); the dispatcher proses its own
notes and nothing of a controller's.

### D16 — one view, one word; default player aliases; where a pack declares them

- **The rule.** `verbs:` is a one-element list; a controller is named
  by views of one verb; `hasVerb` stays (one element). `lint:one-word`
  (a) multi-word views, (b) controllers across verbs, (c) a default
  alias declared twice or equal to any verb or builtin — all 0 at W6.
  The census: 65 views / 77 words / 4 controllers (§ Grounding).
- **Which word stays:** the plain English a player says; the file is
  renamed when the alias was the commoner word (`light`). The table is
  § Fault lines; the MR lists every per-view pick.
- **The alias criterion:** a one- or two-character MUD-standard
  shortcut for a verb typed many times a session (`l`, `i`, `h`, `?`,
  `'`; the directions and `stop` already ship). Nothing else: a synonym
  is deleted, the verb is the word `help` teaches.
- ⭐ **Where a default alias is declared: on the view.**
  `defaultAliases:` on the view (`look.yaml: defaultAliases: [{name:
  l}]`), and the defaults tier (`collectDefaultAliases`, `Alias.ts
  :154-190`) gains a second source: the views the giver can reach
  (`getAffordances()`), read lazily at lookup. Why this and not the
  alternatives: (1) a pack ships views and nothing else a player's
  `Shell` composes — a `static defaultAliases` on a pack mixin has no
  kernel-legal host (the walk reads the **host's** chain); (2) the alias
  belongs beside the word it abbreviates, in the one record a person
  reasons about (the owner's own argument against a second vocabulary);
  (3) an alias reaches a player only while the verb does (load on use —
  the view is already loaded when afforded; no boot entry, no central
  list); (4) `alias unset` tombstones by name as today, persisted;
  `alias list` marks the source as the view. The two shipped mixin
  statics (`Mobile`, `Engaged`) stay — they abbreviate `go <dir>` and
  `cancel`, bodies not extra words. A duplicate name across reachable
  views is a static gate failure (`lint:one-word` (c)), since reach is
  dynamic. `help`'s keywords become the verb + its default aliases;
  the schema payload keeps `verbs` (one element); scripts use real
  verbs (they never saw aliases).
- `lint:verb-collisions`' `BUILTIN_CLAIMS` keep every line's first
  word honest; a default alias may not equal a builtin.

### D17 — `throw`'s shapes are provably disjoint; the collisions gate proves it

`prepositionRequired: true` on a positional: the slot binds only when
its preposition is present (else a shape error naming it). Two views of
one word are **disjoint** when, for every pair, either their required
positional counts differ, or at some positional index both declare
`prepositionRequired` with non-intersecting `prepositions:` sets.
`check-verb-collisions.ts` accepts same-word views that are pairwise
disjoint and fails otherwise; `KNOWN_COLLISIONS` shrinks to
`lease`/`unlease` (gone when wizard-axis drops those words), then the
constant is deleted — so `shadowed-by:` is **not** built: a disjoint pair
is proved, not adjudicated, and a non-disjoint pair is a failure, not a
row (§ Deferred seams records the carrier as unneeded). `_runChain`
routing, verified against `bindPositionals`: `throw ball to ann` fails
`throw.yaml` with `too many arguments` (:2847) and `throw-at.yaml` on
the missing `at` (prepositionRequired) and binds `throw-to.yaml`;
`throw ball` fails the two-slot views on the missing required slot and
binds `throw.yaml`; `throw ball ann` fails all three → the all-shape
note now lists each shape's `getUsage()` (*"throw <item> · throw <item>
to <person> · throw <item> at <target>"*) — the player's error for a
malformed throw.

### D18 — `do` replaces `make` (the decouple, redone on master)

`shell/do.yaml` + `DoController` + row as the branch wrote them
(`ScriptApi.invoke(name, args)`; `unknown-script`; ungated); `make.yaml`,
`MakeController.ts`/`.yaml` deleted; `Avatar.ts:333` swaps the view;
`captureManualBuild` (`api/script.ts:160`, `ScriptLogic` :342/:643),
`Transcriber.ts` (+ test) deleted; `RecipeKnowledge.ts` → `lib/craft/`;
`CraftingLogic.recordCraftEvidence` mints the can-make deed on every
craft; the capture/record tails removed at the nine master sites
(§ Grounding); `ManualBuild.recordCommand`/`getCommandSources` removed;
prose and docs (`scripting.md` P8/P9 retired, `crafting.md` takes the
ladder, `command-spec.md` :154-172, `CLAUDE.md` :189/:846, apiculture/
assembly/forestry). `make` stops being anything until a trade earns it.
The branch's findings slate lands too. The branch is retired in the MR.
Drive 19.

### D19 — `reel` is fishing's; silk is `unwind`

Fishing's `reel.yaml` and `ReelController` return to the pre-silk shape
(`args: []`; `ae5b5fc53^`); `Reelable.ts`, `reel-unified.test.ts` and
sericulture's `package.json` dependency on fishing deleted; sericulture
ships `cmd/sericulture/unwind.yaml` (`cocoons` object `CocoonsMixin`?
— the Cocoons class; `tool` objects `with` default
`reachable:[capability.reeling]`; `--count`) + `UnwindController`
(`ManualBuildController` over `Cocoons.planUnwind`/`completeUnwind`,
the renamed methods), afforded by `ReelingTool` (its contribution key
changes to the sericulture view); the `reels` brain and the silk wire
test say `unwind`; `sericulture.md` § the reel and `fishing.md`'s note.
Drive 20.

### D20 — `drift`

Rename mining's `drive.yaml` → `drift.yaml`, `DriveController` →
`DriftController` + row; `acts.test.ts` follows (the verb split is
already on master; the slate's "marked unreachable" is corrected in
the sweep). Drive 21.

### D21 — where a verb looks first (scope order)

No new seed (MQL grammar stays small), no new flag: **the view's scope
list order is the dial**, and the binder compares **tiers across tries**
(one-resolution § 3 row 11: a whole-name hit in a later try beats a
partial in an earlier; a tie goes to the earlier try, which is what
drill-first means) — so `go.yaml`'s private order returns to the shared
one. `reachable` stays person-first (the in-hand default: `eat`, `drop`,
`wield`, `give`, `wear`). A **world act** declares `scope: [here, peers,
person]`. The audit rule: a verb whose target is, in the common case,
underfoot or standing (a fixture, the ground, a plant, a block, a floor)
is a world act. The W2 commit lists all 281 `reachable` args with the
verdict; the seed list is in § Fault lines → *Resolution*. Drive 23
(`cut ice` cuts the block underfoot while a smaller one is carried).

### D22 — names are not special; MQL reads only Perceptible; the predicates

Collapse the name tiers: `NamedMixin.getKeywords()` folds the name and
its bare form; `scoreCandidate` scores keywords only (*a keyword IS the
phrase · every word a whole word of a keyword · every word begins a
keyword word · partials*); `bareName` goes; `namesEveryWord` uses
`startsAWord` (row 5). The six drive findings keep their outcomes by the
keyword data one-resolution § 4's table names (a content pass, listed
in the W2 commit, each asserted by the test that found it). Detail ids
→ `DetailedMixin.getKeywords`; the held material → `BulkableMixin.getKeywords`
(`via.detailPath`/`via.bulk` stay as facts on the match); recognition
tokens already come from the object's face. `:loose`, `:worn`,
`:carried` predicates delegating to `getLooseContents` (guard kept) and
`Slotted.getAllOccupants`; `:visible` adopted; the three verbatim
copies deleted. `mql-grammar.md` gains the three predicates.

### D23 — `--strict`/`--loose`; scripts fail closed; `--async` on a bare script line; the disabled row

`--strict`/`--loose` reserved per invocation beside `reservedAsync`
(force `onFiltered: error` / `take`); `reload --strict` → `--force`.
Drive 23's second half. Scripts: a prompt with no `interactive` →
`command-rejected { reason: 'needs-input', detail: '<verb> needs
<input> when run from a script' }` at the seam that would prompt (the
cardinality policy, `promptForObject`, `promptConfirm`/`promptCompose`
callers — 20 files) — one guard in `CommandContext.requireInteractive(
what)` that every caller uses; NPC dispatch routes the same refusal to
`DiagnosticApi`. `verb@source` relies on it (D2). The bare
multi-statement script line (`CommandGiver.ts` :839-853) honours a
leading `--async` by detaching `runAst` the way `_executeOne` does.
`AffordanceEntry` disabled rows gain `validator` and `missing` (the
`requires:` mixin the synthesized check found absent). Drive 24, 25.

### D24 — `category:` on every view

Required by the schema gate; equal to the view's `cmd/<category>/`
directory (a gate that they agree, so the directory stays the
convention and the field the data); `help` with no argument lists the
categories, `help <category>` lists its verbs, `HelpCatalogue` groups
command topics by it. Drive 22.

### D25 — the folded-in link-1 decisions: `FromMixin`, the signature

- **`FromMixin` as the marker — not blessed.** A pack class can declare
  any `_mixinName`; the owner's posture is *less permissive until there
  are content developers*. The plan re-anchors the widens on
  `FromTemplate`/`FromClass` where the host set is enumerable, keeps
  `FromMixin` only where the self-subject `where` bounds the spoof, and
  hoists the 30 self-subject clauses into `SecurityPolicies.SelfSubject(argIndex)`
  (`FireLogic.ts:29` generalized). The audit rail, `audit_events`,
  `FromIdentity` and the full pass are **not** this build
  (§ Requirements disagreement 3).
- **The blueprint signature is verb-aware:** `signatureFromParts` folds
  the class's afforded view set (its `commandContributions` union); the
  collapse census re-run; the two collision groups (medicine ×4,
  SurgicalKit/SutureKit) separate or are recorded as true duplicates.

### D26 — the gates

As in the first plan's table (seven census gates, shared
`controllerFiles()`, positive fixtures, ceilings = each gate's own W0
census), plus: **`lint:command-views`** (every view under every pack's
`cmd/**` validates against `command.schema.json` through
`CommandApi.validateCommandView`, plus `category` = directory — zero,
built first, because a sweep of views broke the platform install once);
`lint:one-word` (D16); `lint:mixin-files` (D7b); `lint:institution-verbs`
(D9); `lint:subcommand-words` counting only different-act pairs both
reachable flat (controller identity excludes same-act routes; 46 on the
census) — informational after the owner's noun-scoping ruling, the
builtin line hard; `lint:verb-collisions` learns disjoint shapes (D17).
`lint:instrument-args` is absorbed into `lint:controller-resolution`.

---

## ⭐⭐ Host placement

| new mixin / field | host(s) | what composing it claims | finding |
|---|---|---|---|
| `OnCallMixin` | `BusinessMixin` only | every business answers *who is called* | the 37 `call:` rows are all businesses; a government answers nobody — honest |
| `HaulOutMixin` | the seven water places | from every water place somebody can be pulled out | every host yes; a co-use split |
| `EatingMixin`, `BuoyantMixin` | `Creature` | every creature eats; every creature displaces water | as today |
| `MadeFromMixin` | `Good`, `Vessel` | a made thing may carry its inputs' owner | an animal is not made (ranching writes SERVED only) — it no longer composes it |
| `SplittableMixin` | Hive, Wheel, Block | each can be split in two | the three already implement it |
| `PumpableMixin` | `PumpingMixin`, `BurnerMixin`, `AirPump` | each can be pumped | ⚠ every burner answers `pump` with `no-bellows` today — the refusing default makes the honest "no" explicit; a lamp composes Burner for its flame, not its bellows (a follow-on may narrow to `Firebox`; recorded) |
| `CuttableMixin` | Rope, SugarLoaf, IceSheet, Bole, Billet, Corpse, Sheet | each plans its own cut | the sweep's hosts |
| `PumpSourceMixin`, `LiftSourceMixin` | Well, BilgeWell, Wellhead, Conduit / + Boat, Pumping | a source a pump pulls from / a load a lift raises | the hosts already define the methods |
| `TravelNodeMixin` | the tpa nodes + the kernel fork | a place a ride can leave from | the fasttravel shape, named |
| `PoweredMixin`, `WaterPoweredMixin`, `NameTakingMixin` | as D7a | — | the definers already define them |
| `PourTargetMixin` | `BulkableMixin`, `ManualBuildMixin` | can receive a pour | earned |
| `orderPlanFor` / `treatmentPlanFor` / `harvestPlanFor` / `sowPlanFor` / `plantPlanFor` / `placementFor` / `openSlotFor` | `PricedOffer` / `Vitals` / `Growing` / `Soil` / `Cultivable` / `Placing` / `Slotted` | — | the views already require these |
| `getKeywords` overrides | `Named`, `Detailed`, `Bulkable` | the object says what it answers to | one-resolution § 5 |
| `holdAtHeatFor` | `Soilable` | a soilable thing in a bath is held at its heat | the vessel calls it for its occupants |
| `_mixinKind = 'protocol'` | every protocol mixin | presented as the verb it serves | — |
| `defaultAliases:` / `category:` / `prepositionRequired:` | the view | — | — |

---

## Convention conformance

- `props:`/`cast:`: no row changes designation; new rows are controller
  rows. Locations: none. The `<root>/<branch>/` pattern: kernel
  controllers at `/platform/idea/cmd/<category>/`, mixins under
  `lib/<subsystem>/` (and `lib/reserve/` becomes one), pack verbs under
  their pack (`trade/sericulture/cmd/sericulture/unwind`, `trade/mining/
  cmd/mining/drift`). Persistence per content: no row changes staged/
  live; a split moves no field's persistence (P6).
- Module scope declares (no new module-scope statements; the gates are
  `scripts/`); the import boundary holds (mixins import nothing outside
  `src/mud`; sericulture drops a cross-pack import; carpentry/milling
  drop their probe-local water interfaces for a kernel protocol — P4).
- Verbs on objects (`lint:object-verbs` stays 0); `ContainmentApi.move`
  is the one orchestrating call kept.
- No new module category, no free helper: the per-noun bases are
  controllers; outcome types are value types in `lib/craft/ActPlan.ts`;
  `SelfSubject` is a `SecurityPolicies` static.
- P3: every new dispatcher path is a note + prose; scripts fail closed
  naming the input. P4: duck typing gated, six shapes become protocols,
  five dead names fixed. P5: every moved rule is a method on the object
  that owns the state. P7: no boot entry — the markers are composed, the
  plans called, the default aliases and `help`'s *answers* read lazily.
  P8: classes named for what they are; the original idea keeps a split
  mixin's name; one view one word; the common word stays with the body
  verb; a subcommand word is scoped by its noun.
- **Lint gates this build must pass**: the whole family, with
  `lint:mixin-names` (14 new names), `lint:arg-kinds` (every converted
  protocol in `requires:`), `lint:controller-rows` (~100 new rows),
  `lint:reachability` arm A (`do`, `unwind`, `drift`, `recite`, the
  three `throw`s, the subcommand nouns; every deleted flat view's
  affording static updated), `lint:verb-collisions` (two rows, then
  none; the `throw` trio proved disjoint), `lint:completion-this` (0 both
  ways), `lint:act-effort`, `lint:self-contributions`, and the twelve new
  gates at or below their ceilings.

---

## Waves

Each wave lands independently and ends at one commit
(`build(controllers-are-io W<n>): …`). Before W0: merge `origin/master`
(the worktree is 20 commits behind). Mid-build verification is
`pnpm test:near` + every touched pack's vitest + `lint:family`; the
full suite runs at code-complete and at `/finalize` only.

### W0 — the schema gate, the census gates, the baseline

Goal: every view validates; every link has its count; the drive's
before-record exists. Decisions: D13, D26.
- `lint:command-views` **first** (schema + `category` = directory; it
  will fail until W6 adds `category:` — ship it with `category` as a
  warning line and flip it to required in W6, so the schema half gates
  from day one).
- `pack-roots.controllerFiles()`; `check-instrument-args.ts` →
  `check-controller-resolution.ts`; `check-completion-this.ts` refitted
  (its count must stay 0).
- The census gates: `duck-typing`, `controller-mutations`,
  `controller-decisions`, `controller-functions`, `mixin-clusters`,
  `subcommand-words`, `one-word`, `mixin-files`, `institution-verbs`;
  `verb-collisions` learns disjointness (no view uses it yet; the test
  pins it with a fixture). Each: ceiling = its own census, a
  positive-fixture test, a `docs/lint-family.md` entry.
- `controllers-are-io.dirty.wire.test.ts` with steps 10–15 recorded
  (`CAIO_RECORD=1`, `WIRE_PORT=2013`) and the baseline JSON committed.
Acceptance: `lint:family --list` shows the twelve; each fixture test
fails when its violation is removed; the baseline passes against
itself. Commit.

✅ **W0 gates done** (`a9ba1db95`). Ceilings at HEAD: command-views
schema 0 (hard), category 361 + 10 domain-local views with no category
dir (warning, `CATEGORY_REQUIRED` flips in W6); duck-typing 628,
undefined-name probes 7 (not 5: `beforeRestore` IS defined by
MineWarren; `onConnectionDetached` ×2 and `onLinkRestored` are declared
optional on `HasInteractive` and implemented by nobody);
controller-mutations 359; controller-decisions 1286 (durations 113);
controller-functions 274; controller-resolution hunts 4 (1 → 4 is the
wider census: Unprovision, Unlease, the kernel `CommandController`
base), self-resolution 117; mixin-clusters 44 (accessor pairs folded by
stem, else 77); mixin-files 12; one-word 65/77 · 4 · 0; subcommand-words
pairs 47, builtin **6** (`treasury set` is the sixth); institution-verbs
11 (reads the operand OR the book-writing call — half of D9's verbs take
the book implicitly; four acts allowlisted with reasons: stake, stall,
lease, provision). Decided: **D17 compares positional RANGES**
(`[required, total]`), because the literal required-count rule passed
`pour`'s two views, which one line binds both of. `pack-roots.ts` gained
`controllerFiles()`, `commandViews()`, a shared `ratchet()` (fails above
AND below the ceiling).

### W1 — the command line and the dispatcher

Goal: drive 1–5, 23 (second half), 24, 25 (the greyed-out reason).
Decisions: D1, D2, D3, D15, D23.
Files: `api/command-line.ts`, `CommandLineLogic.ts`, `ShellLogic.ts`,
`CommandGiver.ts` (`matchAffordances`, `_runChain`: scope → cardinality
→ batch → the other-offer probe → the all-shapes usage line; the bare
script line's `--async`; `requireInteractive`), `Interpreter.ts`,
`api/command.ts` + `CommandLogic.ts` (`scopeSource`, `prepositionRequired`,
the reserved `--strict`/`--loose`, the `how` derivation factored, the
disabled row's `validator`/`missing`), `packages/types` (`other-offer`,
three reasons, `AffordanceEntry`), `ReloadController` (`--force`), the
20 `context.interactive` sites, `DiagnosticApi` for NPCs; docs
`command-parsing.md`, `command-routing.md`, `command-spec.md`
(`prepositionRequired`, `--strict`, the usage line),
`response-envelope.md` (30 kinds), `scripting.md` (fail closed),
`shell-alias.md`. ⚠ `_runChain` is also client-surface's (merge by
hand; scope filter first).
Tests: tokenizer forms + round-trip; dispatcher scope semantics (every
D2 branch, the non-interactive refusal, batch); the probe never prompts;
`prepositionRequired` binding; a script that would prompt names its
input; wire 1–5, 23b, 24, 25b.
Acceptance: an unscoped command is byte-identical (the baseline passes);
`say hi @bob` untouched. Commit.

✅ **W1 done** (`5ea55fd79`). `_runChain` is ① scope filter
(`matchAffordances`, `_pickSources`, `_runBatch`) → ② the unchanged
loop (+`scopeSource`, `filterPolicy`) → ③ `_otherOffer`. Decided:
⚠ **the scoped form is MQL's own grammar — `me:i:watch`,
`here:i:wheat:[2]`** — not the plan's `me:watch` / `here:2nd wheat`,
which name a FEATURE (`:` after a seed) and only desugar ordinals at a
query's head; the drive writes `wind@me:i:watch`. A cardinality prompt
with no Interactive gives `needs-input` (D23 over D2's `ambiguous`);
the probe skips the giver's own `self` verbs; an explicit set
(`@inventory`) batches as `all` does; `wiki purge` from a script now
fails closed; Pack's staff offer stays optional (a scripted install
skips it); Buy passes `ask: null` so the seller's refusal stands.
Open: batch under `--async` (each detached attempt fires its own
envelope) — documented, not solved. duck-typing 628 → 627.

### W2 — resolution: where a verb looks, what a name is, the predicates

Goal: drive 23 (first half). Decisions: D21, D22.
Files: `CommandLogic.walkScopes` (tiers across tries), `go.yaml` (back
to the shared order), the audited views (`scope: [here, peers,
person]` on the world acts — the list in the commit), `scope-walk.ts`
(the collapse; `startsAWord` in `namesEveryWord`), `resolver.ts`
(`pushDetails`/`pushBulkMaterials` retired), `Named.ts`, `Detailed.ts`,
`Bulkable.ts` (`getKeywords`), the content pass (the six findings'
keyword data), `api/mql/predicates.ts` (`:loose`, `:worn`, `:carried`),
`LookController :211-220` (⚠ client-surface holds `look` — the
predicate lands, the copy's deletion is whichever merges second),
`SenseController`, `Container.ts`; docs `mql.md`, `mql-grammar.md`,
`command-spec.md` § scope, `one-resolution-rule-slate` (§§ 3–5 marked
done), `perception.md` (the guard stays).
Tests: each of the six findings' tests pass on keyword data; the
cross-try tier test; the three predicates; wire 23a.
Acceptance: `look clay` at the pit looks at the lumps; `cut ice` cuts
the block underfoot; `go hesper` after `look first line` goes. Commit.

### W3 — the mixins: splits, files, markers, protocols, presentation, security

Goal: drive 17, 25 (the card and `help dip`); `lint:mixin-clusters` 45
→ 40; `lint:mixin-files` → 0; `lint:duck-typing` undefined → 0.
Decisions: D6, D7, D8a, D8b, D25.
Files: the five carved mixins + their originals; the twelve file moves;
`lib/supply/Powered.ts` (mixin), `WaterPowered.ts`, `NameTaking.ts`;
the six protocol conversions and three demotions (`Workable.ts`,
`Pumpable.ts`, `Cuttable.ts`, `Tappable.ts` deleted, `TravelNode.ts`,
Bail's `LiftSource`, `PumpSource`), their hosts, the `typeof` probe
sites (D8a's list), the views' `requires:`; `lib/mixin.ts` (`Mixins`);
`_mixinKind` on every protocol mixin; `CommandLogic.ts` :2137-2143 +
types + `CardBodies.tsx` (*answers:*); `StudioLogic` (`kind:
'protocol'`); `HelpCatalogue` (*answers:* on command topics, lazy);
`SecurityPolicies.SelfSubject` + the 30 sites + the re-anchored widens;
`Blueprint.signatureFromParts`; docs `mixins.md` (the split test, the
file rule, `_mixinKind`), `employment.md`, `underwater.md`,
`metabolism.md`, `encumbrance.md`, `chattel.md`, `energy.md`,
`pump.md`, `fasttravel.md`, `studio.md`, `help.md`, `call-security.md`.
⚠ `Organization.ts` is also client-surface's (`showShiftStatus` stays
in it); `Throttleable` is water-supply's.
Tests: per split a capture/materialize round-trip + the NOT-invariant;
every host suite unchanged; `lint:mixin-names`; the card's chips; wire
17 (`staged`), 25a.
Acceptance: `OnCall` composes on `Business` only and `MadeFrom` on
`Good`/`Vessel` only; every moved file imported by path; every bare
shape in the table converted or demoted; `help dip` lists who answers.
Commit.

### W4 — the outcome convention, the cuts, `boil`, `scrub`, `affords`

Goal: one shape, words on the controller; the seven cut verbs through
`cutPlan`. Decisions: D4, D5 (type half), D8c, D8d.
Files: `ActPlan.ts`; `ManualBuildController.engagePlan` + words;
`EngagedActController.engageAct` (plan overload); `Workable.ts`'s
vocabulary; the nine protocol files' reason unions; every implementer
and the twelve consuming controllers; `FitController`'s `pasteOn`,
`StrikingDie.strikeWith`; `CuttableMixin.cutPlan` on Bole, Billet,
Corpse, Sheet, IceSheet + `SawController`, `RiveController`,
`FellController` (cross-cut arm), `ButcherController`, glass
`Scribe`/`Snap`/`Groze`, ice `Groove`/`Scrape`, `IceActController`;
`Soilable.holdAtHeatFor` + `Thermal.ts`'s boil arm + `HeatController`
(`boilInPot` gone, `boil` word gone); `WashController` `--hard` +
`wash.yaml`'s brush slot, `ScrubController`/`scrub.yaml` deleted;
`requires: affords` in the binder + the twelve-verb probe record; docs
`crafting.md` § act protocols + the cuts, `cleanliness.md` (the bath's
heat), `thermal.md`, `command-spec.md` (`affords`), `verb-interfaces-slate`
(items marked done). Packs touched: ceramics, quarrying, glass,
chandlery, papermaking, baking, carpentry, tailoring, cordage, dairying,
sugar, water, smithing, forestry, cooking, ice — each pack's vitest.
Acceptance: `tsc` green with every reason mapped; `grep "line: Mml"`
over the implementers returns nothing; a bandage in a boiling pot is
disinfected by the pot's own reconcile; `wash floor --hard` scrubs;
the cut wire steps (ceramics/forestry/carcass-chain) unchanged in
outcome. Commit.

### W5 — the kernel acts onto their objects

Goal: drive 6, 10–16. Decisions: D5, D10, D11, D12.
Files: as the first plan's W4 (`Growing`/`Soil`/`Cultivable`/`Plantable`
+ Harvest/Plant + `HarvestWordedController`; `Placing`/`Slotted`/
`Feeder` + Put; `PricedOffer`/`Tariff`/`CommerceMenu` + Order;
`Vitals` + Treat; `Combatant.deliverThrown` + the three `throw` views/
controllers; `ReadController` + `magic/ReciteController`; tanning
`Tanning`/`Tanpit`/`TanController`; `PourTarget.ts`, `Bulkable`,
`ManualBuild`, one `PourController`, `check-verb-collisions.ts` :98);
the options on `carve`/`plant`/`harvest`/`treat` (old forms gone); rows;
docs (`husbandry.md`, `smallholding.md`, `spatial.md`, `retail.md`,
`harm.md`, `ranged.md`, `magic-items.md`, `bulk.md`, `crafting.md`,
`command-spec.md` § alternate controllers).
Acceptance: the W0 baseline comparison equal in state, reasons and
durations; step 16 same state, different words; `pour` one view, the
collisions gate at two rows; the `throw` trio routes per D17. Commit.

### W6 — one view, one word: `do`, `reel`/`unwind`, `drift`, the sweep, categories

Goal: drive 18–22; `lint:one-word` → 0; `lint:command-views`'
`category` half flips to required. Decisions: D16, D18, D19, D20, D24.
Files: the 65 views (one word each; `defaultAliases:` on `inventory`,
`help`, `say` — and `look` by whichever merges second); the four
shared controllers split by verb (Equip/Unequip/Descend/Profile);
`Alias.ts` `collectDefaultAliases` (the view source); `HelpCatalogue`
(keywords = verb + default aliases; grouping by category; `help`
alone); every view's `category:`; `shell/do.yaml` + `DoController` +
row, `make` deleted, `Avatar.ts`, the decouple's kernel/pack/prose/doc
changes (D18 list); fishing `reel.yaml`/`ReelController` restored,
`Reelable.ts`/`reel-unified.test.ts` deleted; sericulture `unwind.yaml`
+ `UnwindController` + row, `Cocoons`, `ReelingTool`, the `reels`
brain, `package.json`, `reel.test.ts` → `unwind.test.ts`; mining
`drift.yaml` + `DriftController` + row + `acts.test.ts`; wire `silk`,
`crafting`, `food-safety`, `forestry`; docs `shell-alias.md` (the view
source), `help.md`, `command-spec.md` (one word; `category:`;
`defaultAliases:`), `scripting.md`, `crafting.md`, `sericulture.md`,
`fishing.md`, `mining.md`, `CLAUDE.md`'s verb lists (by the sweep).
Acceptance: no view with two words; no controller across verbs; `l`
looks and `alias unset l` survives a restart (`staged`); `do martini`
makes the drink and `make martini` is no command; `reel` fishes and
`unwind cocoons` reels silk; `drift` cuts, `drive` drives; `help` lists
by category. Commit.

✅ **W6a done early** (`831bff42b` `do`, `ea2589880` reel/unwind,
`c5d830d4a` drift) — file-disjoint from W1–W3, so it ran beside them.
Decided: `unwind`'s `cocoons` arg `requires: StackableMixin` and the
controller narrows `instanceof Cocoons` (no one-consumer mixin minted);
`KneadRequest.commandText` removed (only the capture read it); the
hand-build maker resolves by `getIdentityPath()` (the branch's fix —
template path credited the wrong Avatar); `CraftSuccess.learned` (the
branch's shape) lets Strain/Quench/Plate say a recipe was learned.
Surprises: two real bugs fixed in passing — `sink`'s help pointed at
`drive`, and wire `metal-chain` typed `drive south` (the vehicle's
verb); `conveyance.md` claimed nothing affords `drive`. The crafting
wire file's smithy "lay your own fuel" step came from the branch
unre-driven — W9 confirms it. ⚠ CLAUDE.md (sweep): :189 `def`/`make` →
`def`/`do`; :846 drop `make`, `do` under shell; :830/:852 mining
`hew`/`drift`/…; the findings slate
`tails/script-runner-decouple-findings-slate.md` wants a README row.
Remaining W6: the 65-view sweep, the four controller splits, categories,
default aliases.

### W7 — the subcommand rule: the switch controllers, the institution sweep, fight

Goal: drive 7–9, 22 (the institution half); `lint:institution-verbs`
lowered to the W8 remainder; `lint:subcommand-words` builtin line held.
Decisions: D9.
Files: the ten switch controllers (not Bank/Title) → bases +
per-subcommand controllers + rows; their views; `FightGambitController`
+ seven, `fight.yaml` (`defend` → `DefendController`; the `:103`
fix); `house.yaml` + `HouseAppoint/Dismiss/DrawController` (over the
house base), `job.yaml` + `JobApply/Quit/FulfillController`; `shelf.yaml`
+ `ShelfConsign/ReclaimController`, `rack.yaml` + `RackCheck/ReclaimController`
(the `CheckRack` reclaim defect fixed in passing); the flat `appoint`,
`dismiss`, `apply`, `quit`, `draw`, `fulfill`, `consign`, `reclaim`,
`check` views and controllers **deleted**; their affording statics
re-pointed (`Persona.ts` :135-190, `TipJar`, `StoreBook`-style on the
shelf/rack classes, `CredentialWalletUpdate`); docs `command-spec.md`
§ the rule as written, `employment.md`, `retail.md`, `contract.md`,
`chat.md`, `forums.md`, `party.md`, `wiki.md`, `emotes.md`,
`content-packs.md`, `combat.md`.
Acceptance: every subcommand does what it did; `help <noun>` lists
them; `shelf consign` and `house appoint` work; `fight defend` =
`defend`; the gate's ceiling lowered to `title`'s two. Commit.

### W8 — bank, wallet, title, clock (last; reconcile with water-supply)

Before starting: `git merge-tree` against `origin/reqs/water-supply`
for the five files; merge master first if water-supply has landed.
Files: `BankController` → per-subcommand over `BankingControllerBase`;
`title.yaml` + `TitleSubdivide/TransferController` + `TitleControllerBase`,
the flat `transfer`/`subdivide` deleted; `wallet` unchanged; `clock`
unchanged (its `on`/`off` already conform). Rows, docs (`banking.md`,
`parcel.md`). Whichever merges second reconciles.
Acceptance: the four nouns pass the step-7 checks; `lint:institution-verbs`
at 0. Commit.

### W9 — the drive, the record, the MR

The whole blocking drive (steps 1–25) once against a standing world;
the record appended; the MR READY with: the outcome wordings that
changed, every per-view word pick, the scope-order audit, the twelve
`affords` probes, the `FromMixin` re-anchoring list, the retired branch;
then the full suite alongside review.

---

## Reachability wiring

| capability | verb (view) | affordance (static) | data (row) | load | arg gate |
|---|---|---|---|---|---|
| `verb@source`, `--strict`/`--loose`, `--async` | the command line | n/a | n/a | n/a | the source fills only a slot whose `requires:` it satisfies |
| `throw` ×3 | `inventory/throw.yaml`, `throw-to.yaml`, `throw-at.yaml` | the same `self` list `throw` rides today | three rows | on use | `item: Tangible, mustBeHeld`; `recipient: Agent` (`to`, required); `target: Visible` (`at`, required) |
| `recite` | `magic/recite.yaml` | the scroll class, `inventory`/`peers` | row | on use | `[ArcaneMixin, MarkedMixin]` |
| `do` | `shell/do.yaml` | `Avatar.commandContributions.self` (swapped from `make`) | row | on use | `name: string` |
| `unwind` | sericulture `cmd/sericulture/unwind.yaml` | `ReelingTool` (`environment`/`peers`; key changed) | row | on use | `cocoons: Cocoons`' mixin (the build names it), `tool: ToolMixin` |
| `drift` | mining `cmd/mining/drift.yaml` | as today (`MiningActController`'s host) | renamed row | on use | as today |
| `house appoint\|dismiss\|draw`, `job apply\|quit\|fulfill`, `shelf consign\|reclaim`, `rack check\|reclaim`, `title transfer\|subdivide` | the noun views' new subcommands | the deleted flat views' statics re-pointed at the noun view (`Persona`, `TipJar`→n/a, `StoreBook`-style on the shelf/rack classes, `CredentialWalletUpdate`) | one row per controller | on use | each subcommand's own `args` (the book bound per subcommand) |
| per-subcommand controllers | existing views, `controller:` per subcommand | unchanged | one row each | on use | as today |
| `pour` | `bulk/pour.yaml` `[pour]` | `Bulkable` + `ManualBuild` (re-pointed) | existing row | on use | `target: PourTargetMixin` |
| the protocol conversions | the existing views | unchanged | none | composed | `requires:` names the mixin (off `any`) |
| default aliases | none | the view's `defaultAliases:`, read from `getAffordances()` lazily | none | on use | n/a |
| `category:` | every view | n/a | n/a | n/a | the schema gate |
| `HarvestWordedController` | the `harvest` view re-pointed at runtime by the drive | unchanged | row | on use | unchanged |

---

## Acceptance-criteria coverage

| criterion (requirements § Acceptance) | wave(s) |
|---|---|
| every blocking-drive step passes (1–25) | W9; by step: 1–5 W1 · 6 W5 · 7–9 W7/W8 · 10–16 W5 · 17 W3 · 18 W6 · 19 W6 · 20 W6 · 21 W6 · 22 W6+W7 · 23 W2+W1 · 24 W1 · 25 W3+W1 |
| every moved kernel verb: same state, reason, duration | W0 baseline + W5 comparison; D15 |
| `verb@source` for every verb, no per-verb change | W1 |
| no view answers to more than one word; no controller to more than one verb | W6 (`lint:one-word` 0) |
| breaking accepted: nothing kept binding | W5–W8 (no alias views, no old forms) |
| an alternate controller produces identical state | W5 (drive 16) |
| every defect class counted, lower than the scan, cannot rise | W0 (the gates) + W3/W5/W6/W7 (the lowerings) |
| the folded-in items (reel, drift, ledger nouns, category, scope order, `--strict`, scripts, `--async`, the disabled row, protocols presented, mixin files) | W6 · W6 · W7/W8 · W6 · W2 · W1 · W1 · W1 · W1 · W3 · W3 |

---

## Test & gate strategy

- **Unit**: tokenizer; dispatcher (D2's branches, batch, the probe, the
  fail-closed guard, `prepositionRequired`, the reserved options); the
  cross-try tier; the six scorer findings on keyword data; the three
  predicates; per split a capture/materialize round-trip + the NOT
  invariant; each converted protocol's refusing default; each moved
  rule's test moves to the object; each new controller a wording test;
  each gate a positive fixture + the invariant (at or below the ceiling,
  above zero where a ratchet).
- **Wire (the drive IS the file)** `controllers-are-io.dirty.wire.test.ts`,
  steps 1–25. Paces: all **instant** except 10 and 17 (**staged**: the
  plant's stage set by `eval`; the four states captured and
  re-materialized through `eval`, read back by player verbs — the same
  path a restart takes), 18 (**staged** for the restart half: the
  tombstone captured/materialized), 19 (**short**: the martini over its
  real time, under a game day). **No soak drive.** Dirty: step 16
  rewrites a shared view (restored); steps 19–22 consume stock. Pairs
  the plan names: 1–3 two `Watch` clones; 5 a ripe and an unripe wheat
  in one bed; 6 a graded bottle, a jug, a glass, a shaker; 14 a line, a
  ball, a buddy session; 15 a notebook, a wall display, a scroll; 19
  Dave's Bar; 20 a fishing reach + the Hearts Delight reeling basin; 21
  a drift + a cart; 22 the lounge store + a consignment shelf; 23 two
  ice blocks; 25 a dip pot.
- **Every checkpoint fails once on purpose** (B2); **browser walk**
  once at code-complete (B3): `e2e/tests/controllers-are-io-walk.spec.ts`
  — type `wind@`, see the other-offer line, `help` by category, the dip
  pot's card, `alias unset l`.
- **Gates**: the whole family at every wave; the twelve new gates'
  ceilings lowered in the wave that earns it, never raised; the schema
  gate from W0 on.
- `pnpm test` runs twice: at code-complete alongside review, and at
  `/finalize`.

---

## Risks & opens

1. **`_runChain` and `look` are client-surface's too**; `Organization.ts`
   as well. Merge by hand; whichever merges second reconciles.
2. **The source-fills-its-slot rule (D2)** stands; if it surprises in
   review it shrinks to (b)/(c) — a view change.
3. **The other-offer probe runs the binder twice on a refusal**;
   validators are pure; `interactive` stripped.
4. **Tan's lift needs the remover at the hook**; else custody from the
   move (a kernel hook signature change the MR names).
5. **The `line:` sweep touches 13 packs**; a pack test asserting prose
   moves its assertion to the controller.
6. **`boil`'s fold** is real thermal work (a per-occupant clock, a kill
   applied once); the two traps are named in D8c. If the reconcile
   cannot carry it cleanly, `heat … in pot` stays one more build and the
   `boil` word still goes — say so in the MR.
7. **The five `set` subcommands** (`reserve`, `equip`, `alias`,
   `settings`, `var`) share their word with the `set` builtin. The
   owner's noun-scoping ruling says keep; the builtin claims a line's
   first word only. The gate's builtin line holds them at 5 and the
   question is asked once, here.
8. **The decouple redo** lands against files that diverged by 1,338
   commits; the branch is a reference, not a merge.
9. **`PumpableMixin` on every burner** makes a lamp answer `pump` with
   a refusing default — honest today (it does), narrower later
   (`Firebox` only) as a follow-on.
10. **The scope-order audit** is 281 args by one rule; the room-first
    set may want review (listed in the W2 commit).
11. **`help`'s *answers:* reads `StudioLogic`'s export scan at runtime**
    (lazy, cached). If that proves too heavy for a help topic, the
    fallback is the mixin's own topic listing composers from the same
    scan — still no boot entry.
12. **Heuristic census numbers** in § Grounding are not the gates'; W0
    publishes the classifiers' own.

What the build should stop and ask about: nothing; a compliant path
exists for every fork named.

---

## Deferred seams

- `look`'s six arms → their objects after client-surface merges —
  **one-resolution-rule-slate** § 2.
- The pack burn-down (Smelt, Fell beyond the cross-cut, Saw beyond the
  cut, Butcher beyond the cut, Mow, Mill, Spin, Dye, Draft, Operate…) —
  **controllers-are-io-slate** keeps the scan list.
- `PumpableMixin` narrowed to `Firebox`; `SeatedDrivableMixin`'s
  deletion; `getMass`'s four definers; the other 40 split-cluster mixins
  (the gate's ranked census) — **mixin-slate**.
- The printer's forme, the herd, Katie's and Walter's nouns; the
  workspace trees after wizard-axis; `title buy` over `ForSale`; the
  five `set` subcommands if the owner rules otherwise —
  **command-taxonomy-slate**.
- `shadowed-by:` — **not needed**: the disjointness proof replaces
  adjudication and `KNOWN_COLLISIONS` empties — **affordance-verb-slate**
  (recorded as closed).
- The audit rail (`@Audited`, `audit_events`), `FromIdentity`, pack gate
  participants, interface admission — **call-security-pass-slate**
  (the decision and the hoist landed here).
- Scope-modality's per-modality permeability, transparent containers,
  the feasibility validator — **scope-modality-slate** (only `eat`'s
  `canReach` lands here).
- Object-taxonomy's mint, subtraction, the `/stuff` committee —
  **object-taxonomy-slate** (the signature and census landed here).
- Affordance-suggestion's `narrow()`, relational axis, history, ranking
  — **affordance-suggestion-slate**.
- Async-commands' per-actor cap and generic cancel —
  **async-commands-slate**.
- `@name` mentions in a message tail — **chat slate**.
- `engagement-completed` carrying the outcome's facts —
  **response-envelope** follow-on.
- The decouple branch's findings (stranded recipes, heat-tie shadowing,
  a `record` macro, rows whose class doesn't exist) — its own findings
  slate, landed with W6.

---

## ⚠ Requirements disagreement

Stated, not absorbed:

1. **The capability-keyed affordance table** ("a tool's own data says
   which verbs it offers"; slate row *affordances-tools-confer, MR
   !153*). This design was built (`b7f48eea0`) and **reversed twice**
   (`ff9fd938b`, `85c7d47c5` "one record of verb affordances"):
   `command-routing.md` :391-469 forbids an instance verb record with
   five reasons, `crafting.md` :455-466 and `ToolCapability.ts` :20-37
   say a capability names no verbs, and the object-taxonomy slate
   records the verdict. The slate row describes a July end state as
   current. The plan does **not** build it. Either the row is reworded
   (*capability = requirement + working; verbs stay on the instrument
   class*) or the owner overturns `command-routing.md` § ONE record
   explicitly — a product decision, not this plan's.
2. **Scope-modality** is premature by its own trigger (*"document now;
   build when pulled"*; Q2, where modality is declared, is open; no
   `modality` key exists). The plan ships only `canReach` on `eat.yaml`
   and leaves the slate.
3. **Call-security-pass** is a build of its own (the audit rail, a new
   collection). The plan takes the decision (`FromMixin` not blessed;
   re-anchor where enumerable) and the `SelfSubject` hoist, and leaves
   the rest.
4. **`drive`/`drift` is already split on master** (`3e915f1d3`); the
   slate's "the movement view is marked unreachable" is false. What
   remains is the rename.
5. **`--async`/`--sync` already ship for a typed command**; only the
   bare multi-statement script line lacks the flag. Drive 24's second
   sentence is mostly already true.
6. **`make` under five nouns is kept** — with `make` gone as a verb the
   meta-verb premise is gone, and across the nouns the word is one act.
   The requirements' "renamed only where it conflicts with a meta verb"
   finds no such case; the five `set` subcommands are the honest
   candidates (Risks 7).
7. **`WaterPlaceMixin`'s halves are true of every host** — the split is
   by co-use only; no host narrows. (The requirement's "a garden bed
   stops carrying body physics" names no mixin this build splits —
   `LoadBearing` and `Metabolic` compose on `Creature` only; the plan
   reads it as the general rule, which `OnCall` and `MadeFrom` satisfy.)
8. **`store`/`shelf` already conform or need a noun view**: `store`
   exists; `shelf` and `rack` are new noun views this plan adds (drive
   22 names `shelf consign`).

---

## Critical files

Read first, in this order:
- `docs/requirements/controllers-are-io-requirements.md` (at
  `b3cb1e3ee` or later); `docs/slates/builds/controllers-are-io-slate.md`
  (the ledger, § *Decided at plan review*, § *Folded in*).
- `packages/server/src/mud/platform/idea/api/CommandLineLogic.ts`;
  `api/command-line.ts`; `lib/command/CommandGiver.ts` (:441-452,
  :650-830, :839-853, :1001-1280); `lib/script/Interpreter.ts`
  (:605-675); `platform/idea/api/ShellLogic.ts` (:88-260);
  `lib/shell/Alias.ts` (:139-192, :255-284, :393-405);
  `platform/idea/api/CommandLogic.ts` (:503-562 walkScopes/onFiltered;
  :946-1109 assemble; :1274-1360 cardinality; :2137-2264 affordances;
  :2560-2847 bindPositionals); `packages/types/src/index.ts`
  (:565-583, :874-903, :1503-1553); `lib/script/builtins.ts`.
- `lib/craft/ActPlan.ts`; `platform/idea/cmd/crafting/ManualBuildController.ts`;
  `lib/command/EngagedActController.ts`; `lib/ground/Workable.ts`;
  `lib/pump/Pumpable.ts`; `lib/craft/Cuttable.ts`; `lib/slot/Attired.ts`
  (:1-60) + `docs/subsystems/slot.md` (:26-57); `lib/material/Alloyed.ts`
  (:67-82).
- The five mixins and their hosts; the twelve mixin files; the nine
  kernel controllers, `TanController`, both `pour`s, the seven cut
  controllers; `HeatController` + `lib/cleanliness/Soilable.ts`
  (:532-556) + `lib/thermal/Thermal.ts` (:2384-2414, :2603-2625);
  `WashController`/`ScrubController`.
- `origin/fix/script-runner-decouple` (reference: `git diff
  origin/master...origin/fix/script-runner-decouple`); fishing
  `reel.yaml`/`ReelController.ts`/`src/lib/Reelable.ts`; sericulture
  `Cocoons.ts`, `ReelingTool.ts`, `behavior/reels.ts`; mining
  `cmd/mining/drive.yaml`, `__tests__/acts.test.ts`.
- `api/mql/scope-walk.ts` (:293-394, :417-536), `resolver.ts`
  (:1646-1760, :1825-1835), `api/mql/predicates.ts`; `lib/description/Named.ts`.
- `platform/idea/api/StudioLogic.ts` (:384-424, :597-616, :791-830);
  `platform/idea/HelpCatalogue.ts` (:429-476, :612-640);
  `lib/security/SecurityPolicies.ts` (:399-433); `lib/studio/Blueprint.ts`
  (:192-206).
- `packages/server/scripts/pack-roots.ts`, `check-instrument-args.ts`,
  `check-verb-collisions.ts` (+ its test), `check-reachability.ts` (+
  fixtures), `check-mixin-names.ts`; `docs/lint-family.md` § *four ways
  a census lies*.
- `packages/wire/src/harness/{session,world,assertions}.ts`;
  `packages/wire/tests/forestry.dirty.wire.test.ts`,
  `ceramics-a.dirty.wire.test.ts`, `silk.dirty.wire.test.ts`.
- `docs/subsystems/command-spec.md` (:80-175, :320-360, :1409-1584,
  :1941-1956), `command-routing.md` (:391-469, :578-640), `mixins.md`
  (:152-182, :412-442), `shell-alias.md`, `scripting.md`,
  `response-envelope.md`, `testing.md` (:60-116, :879-960);
  `docs/slates/builds/command-taxonomy-slate.md`,
  `verb-interfaces-slate.md`, `one-resolution-rule-slate.md` (§§ 3–5),
  `docs/slates/tails/affordance-verb-slate.md` (§ the ladder),
  `explicit-targeting-slate.md`, `mql-predicate-parity-slate.md`,
  `script-interaction-slate.md`, `async-commands-slate.md`,
  `affordance-suggestion-slate.md`, `object-taxonomy-slate.md`,
  `docs/slates/builds/call-security-pass-slate.md`.

## Drive record

*(appended at build time)*
