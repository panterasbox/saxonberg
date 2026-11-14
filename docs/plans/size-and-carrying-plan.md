# Size and carrying — implementation plan

Executes [size-and-carrying-requirements](../requirements/size-and-carrying-requirements.md)
(closed scope; every **[DECIDED 2026-11-11, owner review]** section is binding).
**Kind:** feature + a refactor of how every body holds things. **Lead end:** kernel;
first consumers are `get`/`give`/buying/crafting output, `inventory`/`look`, every
place's ways, the shipped species, and the gear rows. Seeding slate:
[size-slate](../slates/builds/size-slate.md) § 8 (*a body carries, it does not
contain*), plus its § 9 (the loose ends controller-liquidity left).

⚠ **Planned against build-2 (`build/controller-liquidity`, tip `47a904bdd`), not
master.** The build starts by merging master once build-2 has landed. Every path
and line below was read at that tip; re-verify a line number before editing, never
a fact. Path shorthand: `$S` = `packages/server/src/mud`, `$C` = `packages/content`,
`$P` = `$C/platform/content/platform`.

## Grounding

> ⚠ **Grounded at build-2's tip `47a904bdd`; build-2 merged as `13cece156` with 19 more
> commits.** Of the files this plan touches, three moved after grounding:
> `LookController.ts` (≈400 lines reworked — *look holds the light steady*; W3's
> `observePlace`/`observeThing` surfaces must be re-found), `PutController.ts` (the
> placement drive fix) and eternal-university's `ProvisionController.ts` (Katie's intake —
> where D29's daypack is offered). Re-verify those three before W3/W5/W6; every other
> grounded file is unchanged. Line numbers everywhere are approximate.

> ⭐ **Master merged at `53f1ebcdc` (load-on-use, !575 — 26 commits), 2026-11-12.** Six
> conflicts, all both-intents: Tangible/Garment imports (the size imports beside master's
> material doors), the boundary-roles ceiling (master 36 + this branch's Form = 37), the
> terminus standup harness (Form rows kept; fabrics are documents now), the layer test
> (`carry` + `fabricPath`), and the spoiler snapshot (regenerated — the union). One
> non-conflict collision: `lint:on-create` — master lowered the ceiling to 71 and this
> branch's `Creature.onCreate` (`ensureSpecies`) made 72; raised with a caller audit.
> **Reconciled against master's doors:** the `wheeled` load is master's act door
> (`LocomotionApi.loadMode`); `ensureSpecies` is the act door over a `_speciesPath` both
> sides declare `identity:constituent`. ⚠ **Open:** forms still load by D1-c (setter
> loads, `ensureShape()` at async seams, a sync miss starts the load and answers unknown)
> — master's rule is *a cold sync read is loud, a class's default citations load with its
> content*. Moving a thing's form (row OR class default) into the applier's constituent
> load, and retiring `Creature.onCreate` into that same wait, is the follow-up that makes
> it one mechanism.

Facts verified at the tip this cycle. What exists, what it does, what it does not.

### Containment and the chokepoint

- `ContainmentApi.move(item, to, placement?)` (`$S/api/containment.ts:206`) →
  `ContainmentLogic.move` (`$S/platform/idea/api/ContainmentLogic.ts:86`). A placing
  destination goes through `placeOn` (:242), which is the only path that calls
  `Placing.canPlace` (:262); the interior route is `moveCore` (:283), whose vetoes
  are `canMove` on the item (:335), `canRemoveContainable` on the source (:337) and
  **`canAddContainable` on the destination (:340)** — the one destination-side hook,
  optional, implemented today by Envelope, Well, BilgeWell, Store, Pumping,
  RearingTray, Wellhead, Copper, Hive, Conduit and **no body**. Post-mutation
  witnesses `onContainableAdded`/`onContainableRemoved`/`onMoved` (:378–380), then
  custody (`followCustody`, :395). `putPlanFor` (:137) asks `canAddContainable`
  first so the refusal is a sentence (:170) and refuses a shut Sealable at the verb
  (:166), never in `move`.
- `ContainerMixin` (`$S/lib/spatial/Container.ts:69–139`): `getContents`,
  `getDeepContents`, `getReachableContents(rung)` (:537–578, the per-container reach
  step), `getLooseContents`, the four witnesses, `placementFor`, destruct evacuation
  (:299–330). **No volume, no item capacity, no mouth.** The `contents` card read
  (:405–422) is the MQL `` `#id:i:visible:carried:[not mixin.AdornmentMixin] - me` ``.
- `ContainableMixin` (`$S/lib/spatial/Containable.ts:66–205`): `getContainer`,
  `getPlacement`, `getEnclosingScope`, `getEnclosingPlace` (build-2 D7),
  **`reachRefusal(actor)`** (:477–501) → `{reason:'enclosed-shut', facts:{by}}` for the
  innermost shut Sealable between a thing and the actor, null at a place, at the
  actor's own chain, or at an agent; `isFixedInPlace` (read by `get`,
  `GetController.ts:358`, never by `move`).
- `SealableMixin` (`$S/lib/spatial/Sealable.ts`): binary open/shut over `Bistate`;
  `isOpen`/`setOpen`/`open(by)`/`close(by)`/`canOpen`/`canClose(by): VetoResult`,
  `seal`. There is no lid object; the lid IS the state.
- No `receive(` on any agent (only `Store.receive`). No `canAccept`/`canReceive`.

### The census — every caller that can put a thing on a body

255 `ContainmentApi.move(` sites in non-test code (145 files). **~75 can land on a
body**; the survey's list is the W0 census's seed and the W4/W5 port list:

- **Kernel, explicit body destination (45):** `GetController.ts:483`,
  `GiveController.ts:100`, `EquipControllerBase.ts:746` (`--from`),
  `HeldGoodsControllerBase.ts:92`, `lib/retail/ConsignmentShelf.ts:421` (buy, via
  `Stock.ts:624`), `lib/retail/HeldGoods.ts:214`, `lib/storage/Store.ts:882/999/1133`,
  `lib/lock/Lock.ts:235`, `lib/commerce/Menu.ts:166`, `lib/husbandry/Producing.ts:1096`,
  `Growing.ts:1125/1289`, `lib/behavior/arms.ts:63`, `platform/agent/Gus.ts:105/117`,
  `lib/character/Character.ts:226` (`wearGarments`), `Avatar.ts:1390`
  (`installDefaultLoadout`), `platform/idea/Login.ts:350`, `EmbodyController.ts:770`,
  `BankingLogic.ts:465/1941/2153` (coins, the Arrival Note, the card),
  `CraftingLogic.ts:2727/5027`, `Plant.ts:320`, `TipJar.ts:82`, `Rope.ts:595/961`,
  `LineEnd.ts:117`, `Book.ts:322`, `Floor.ts:528`, `Flued.ts:166`, `Burner.ts:815`,
  `Estate.ts:341`, `PersistableLogic.ts:942/954` (restore), `Template.ts:637`
  (`props:` into any host), `ConditionLogic.ts:951` (death → corpse),
  `CloneController.ts:247/384`, `ContainmentLogic.ts:205` (`put` zero-route),
  `backend/TestHooks.ts:646`.
- **Packs, explicit (≈30):** trade-fishing `FishingEngagement.ts:447`, `Trap.ts:238/246/251`;
  trade-diving `Spear.ts:69`, `AirBag.ts:116`; trade-forestry `Bole.ts:248`,
  `Standard.ts:115`, `Fellable.ts:257`; trade-tailoring `CuttingTool.ts:179/186`,
  `CutPieces.ts:134`; trade-printing `Printing.ts:133`; trade-chandlery `DipPot.ts:98`;
  trade-textiles `TextileWork.ts:415`; trade-carpentry `PatternStock.ts:148`; tpa
  `ProcureCardController.ts:35`; trade-medicine `PrescribeController.ts:81`;
  trade-apiculture `Hive.ts:388/697`; trade-sericulture `Cocoons.ts:521`,
  `behavior/reels.ts:168`, `behavior/tends.ts:115`; trade-potash `behavior/ashes.ts:93`;
  trade-hospitality `MixController.ts:64`; trade-sugar `SugarLoaf.ts:188`; trade-cordage
  `RopeJack.ts:357`; trade-quarrying `Clay.ts:452`; trade-smelting `Die.ts:116`;
  trade-glass `Gather.ts:259/270`; terminus `MarketStalls.ts:361`.
- **Inherit-the-source's-container (16)** — `where = self.getContainer()`, which is a
  body when the source was carried: `Envelope.ts:57`, `Garment.ts:145`,
  `Integrity.ts:349/549`, `Consumable.ts:132`, `Sheet.ts:400`, `BulkableLogic.ts:881`,
  `Mould.ts:956`, `Thermal.ts:2967`, `Container.ts:325` (evacuation); packs:
  `Quenchable.ts:167`, glass `Sheet.ts:217/286`, `Gather.ts:336`, `Wheel.ts:149`,
  `Block.ts:183`, `Bloom.ts:173`.
- **Non-move entries:** `StackableLogic.ts:158` (`placeDirect` of a split-off into the
  source's container), `Slotted.occupy/occupyAll/seatInSlot`.

### Slots, hands, bodies

- `SlotSpec` (`$S/lib/slot/Slotted.ts:93`) = `{name, accepts, capacity?, postures?,
  userFacingDetail?, bodyPart?, covers?}`; bodies take their universe from
  `BodyPlanSlotsMixin` (`$S/lib/slot/BodyPlanSlots.ts:40`) over
  `species.getBodyPlan().getSlots()`. `occupy` (:435), `canOccupy` (:381 — Vitals'
  `isSlotDisabledByAnatomy`/`isSlotImpairedByCondition`, the Foldable gate, `accepts`,
  `fitsSlot`), `occupyAll` (:566, atomic), `tryReleaseFromSlots` (:179),
  `seatInSlot` (:376 = `move` into the host then `occupy`). `openSlotFor` returns null
  for any Vitals host (:367): `put X on <person>` never seats a slot.
- **Biped** (`$C/species-and-names/content/stuff/idea/species/BodyPlan/biped.yaml:35–55`):
  covering slots `head/torso/legs/feet/hands` (capacity 4), `finger:left/right`,
  `neck`, **`hand:left` / `hand:right`** (`accepts: WieldableMixin`,
  `bodyPart: body.arm.{left,right}.hand`), `sidearm` (SlottableMixin, "belt sheath"),
  `cranial`. Parts `body.arm.*.hand` `serves: [manipulation]` (:121/137). **No `back`,
  no `waist` slot.** **Quadruped:** `head`, `collar`, `back:1` (SlottableMixin,
  `userFacingDetail: back`), `cranial`; **nothing serves manipulation** (:42). **No body
  plan has a mouth part.** The dog (`trade-ranching` `canis/familiaris.yaml`) and the
  draft horse share the quadruped plan.
- `Vitals.canGrip(slot)` (`$S/lib/vitals/Vitals.ts:2313`) via `partForSlot` →
  `functionAt(part)` better than `failing`; `slotRefusalReason` (:2329);
  `isSlotImpairedByCondition` feeds `canOccupy`. Severance (~:2630–2646) vacates the
  lost part's slot occupants **into the body's container** (loose). `capacity(
  'manipulation')` has no caller. `Attired.handSites()` = `partsServing('manipulation')`
  (`$S/lib/slot/Attired.ts:163`, 748).
- **No strength stat** (encumbrance.md) — the only strength-like read is
  `Exerting.leanMargin()` (`$S/lib/exertion/Exerting.ts:490`).
- Species `baseMass`/`stature` (`$S/platform/idea/species/Species.ts:1133/1147`) fall
  back to `BodyPlan.baseMass/baseStature`; biped 70 kg / 1.75 m; gnomus 30/1.0;
  draconicus 125/2.0. **No per-individual stature** (the slate's "physiology's stature"
  does not exist); `Creature.getBodyDensity()` (fat/lean) exists (~:617).
- `Postures` (`$S/lib/slot/Postured.ts:32`) = stand/sit/lie/kneel/mounted — no crouch.
  `BodyProfile` (`$S/platform/idea/LocomotionMode.ts:51`) = `prone|crouched|upright|
  horizontal|varied`; its only reader is `LocomotionLogic.emissionAt` (:403–423).
- `Creature` composition (`$S/lib/creature/Creature.ts:155–215`): `…LoadBearing(
  Container(Containable(…Attired(BodyPlanSlots(Slotted(Organism(Propertied(Agent))…`.
  `Attired` is on Creature only.

### Encumbrance

- `LoadBearingMixin` (`$S/lib/encumbrance/LoadBearing.ts`): `getBorneBurden(ρ?)`
  (:265) walks **contents first at `LOOSE_CARRY_SURCHARGE` 1.25** (:271–273, the v1
  loose-carry model), then slot occupants at `placementCouplingFor(spec)` (:146 —
  Wieldable 1.25, anything else 1.0), then the haulage draft (:309–317). ⚠ Because
  worn items stay in contents and the walk's `visited` set runs contents first, a
  worn garment is charged 1.25 in production (the gauge test seats a worn item that is
  not in contents). `getCarryCapacity` (:322) = `mass × 0.5 × band × endurance ×
  lean`. `wouldExceedCeiling` callers: `GetController.ts:420`, `Growing.ts:1287`.
- **Gravity is not read by encumbrance.** `AtmosphericMixin.getGravity(detail?):
  Promise<Quantity<'m/s²'>>` (`$S/lib/biome/Atmospheric.ts:848`, authorable `_gravity`
  :480) resolves through `BiomeApi.resolveGravityFor` (async chain walk); `Buoyant.ts:28`
  hardcodes `G = 9.81`. `BuoyantMixin.displacementWalk` (`$S/lib/encumbrance/Buoyant.ts:36–60`)
  already derives per-item `volume = mass / material.density` recursing into
  containers — the one volume read in the tree.
- Haulage: `HaulableMixin.handedness` 1|2 (`$S/lib/slot/Haulable.ts:176, 221–240`),
  `getHandedness()` has **no callers**; the hitch gate is `Hauler.handsOccupied()`
  (`$S/lib/slot/Hauler.ts:127`, any Wieldable slot non-empty). The tow:
  `Mobile.crossExit` (`$S/lib/spatial/Mobile.ts:1069–1082`) moves the hauled cart after
  the mover. Terrain/breakaway gates: `LocomotionLogic.checkHaulage` (:322–358).
  Vehicles: `generic-objects/…/gear/handcart.yaml` (`Handcart = Haulable(Vessel)`,
  `handedness: 2`), transport's `wagon/dray/sledge` (`HaulageRig`), `coach`
  (`Coach = Vehicular(Drivable(Sealable(Mobile(ExitableVessel))))`, `interiorVolume: 5`).

### Size: what is measured today

- Mass: `Tangible.mass` (`$S/lib/material/Tangible.ts:222`), `getMass()` (:484, wet
  mass); overrides `Creature` (:643), `Coin` (:165, per-coin × quantity), `Rope`
  (:362, ρ·π(d/2)²·L). Density: `Material.getDensity()` (`$S/lib/material/Material.ts:308`,
  `Quantity<'kg/m³'>`). Units `m³`, `L`, `mL` with converters (`$S/lib/quantity.ts`).
- **No `getVolume` on things**; `getVolume` exists only on Atmospheric scopes
  (`Location` = extent³, `SphericalLocation`, `ExitableVessel.interiorVolume`
  (`$S/lib/boundary/ExitableVessel.ts:112–159`) and three pack overrides).
- ⚠ `Stackable.getMass()` convention is inconsistent: `ManualBuild.ts:383` and
  `Compounding.ts:197` treat it as one unit's; `Sheet.ts:448` divides by quantity;
  `Coin` overrides to the total; the burden walk reads it as-is (`LoadBearing.ts:176`).
- Assembly (`$S/lib/craft/Assembled.ts`): bill on the kind, `parts: PartLine[]` on the
  instance (:613/633) — **no mass on a line, no mass sum**; an assembled thing's mass is
  its one authored `Tangible.mass`.
- `FoldableMixin` (`$S/lib/slot/Foldable.ts`) is a bare boolean over `Bistate`; `Sheet`
  adds a count 0–3. Neither changes size.
- Bulk: `ClosureLevel = 'open'|'dryTight'|'liquidTight'|'sealed'` (`$S/lib/bulk/Bulkable.ts:84`,
  `CLOSURE_ORDER`, `setClosure` throws on a non-member); `interiorCapacity` in L.
  Content: 83 rows `liquidTight`, 15 `sealed`, 4 `open`, 1 `dryTight` (`dry-cask`).
- Water: `WaterPlaceMixin.DEFAULT_WADE_M = 1.5` (`$S/lib/location/WaterPlace.ts:85`,
  dial `water.column.wadeM`); `immerseArrival` (:878–895) walks an arriving thing's
  contents to depth 8 calling `douse()`/`immerse()`/`wet(1)` and skips contents of a
  thing with its own air pocket. Paper's ruin is `IntegrityMixin.afterWetted`
  (`$S/lib/material/Integrity.ts:334`, `SODDEN_AT 0.8` × `wetStrength < 0.5`).

### Places and ways

- `Location.extent` (`$S/lib/location/Location.ts:86`); `getLinearExtent()` (:218) =
  `_extent ?? zone.cellSize ?? null`; `getVolume()` (:418) = extent³;
  **`getCeilingHeight()` (:428) = `Quantity.of(extent, 'm')` — ignores exposure**; its only
  reader is `TraceAtmosphereController.ts:152`. `CartesianZone.cellSize` default 3.0.
  Authored `extent:` ≤ 4: hollow-mere `small-house` (2, roofed), `shed`/`icehouse`
  (3.634), `icehouse/platform`, `mill-house` (4). **No room under 2 m.**
- `Exposure` (`$S/lib/spatial/Exposure.ts`): `top: 'open'|'roof'|'ceiling'`, `walls[]`,
  `wallsNone`, `openSides`, `rainReaches()` (= top open), `holdsAir()` (= top not open
  && !wallsNone); computed by `AtmosphericMixin.exposure()` (`Atmospheric.ts:1416`,
  `buildExposure` :1470–1580, cached).
- `BoundaryOpening {width, height}` (`$S/lib/boundary/Conduit.ts:48`). **`Exit.getOpening()`
  (`$S/lib/boundary/Exit.ts:751`, field :277 authorable, `null` = the whole face) — no
  exit row authors one today**, so every way is its whole face. `Boundary.getOpening()`
  (`$S/lib/boundary/Boundary.ts:238`, default 1×2); rows `door` 1×2, `gate` 2×2, `hatch`
  1×1, `curtain` 2×2.5 (`$P/thing/boundaries/`). `Location.edgeRefusal` (:290, :332–344)
  checks opening ≤ face and boundary ≤ opening, inside one zone; a failing way installs
  unbuilt with a `DiagnosticApi.record` (`Exitable._installUnbuiltExit`
  (`$S/lib/boundary/Exitable.ts:936–990`), channel `location-graph`). **No `turn` field.**
- Exit kinds: platform `passage/track/ashore/berth/kept-door/vessel-in/vessel-out/
  sandbox-*`; generic-objects `/stuff/idea/exits/{archway,stair}` (stair
  `wheelPassable: false`); residence `upstairs/front-door/keyed-door/lot-gate`; water's
  six. **No `crawlway`, no `ladder` kind** — a ladder is a `Climbable` Thing
  (`$S/platform/thing/Ladder.ts`) that enables `climb` on a vertical exit.
- LocomotionMode rows (`$P/idea/LocomotionMode/`): walk 1.0/upright, run 2.0/upright,
  **sneak 0.5/quiet/`bodyProfile: crouched`**, climb (`ClimbableMixin`), swim
  (`horizontal`, `SwimmableMixin`), fly, aerial, sailed, wheeled, ride, drive. Fields:
  `name, speed, noiseLevel, bodyProfile, groundContact, requiresBodyPlanMode,
  requiresPosture, costMultiplier, passthrough, conveyanceMixin, enablementMixin,
  medium`. Controllers `$S/platform/idea/cmd/movement/*Controller.ts` extend
  `LocomotionControllerBase` with `modeName()`; `walk/sneak/run` are `MobileMixin.self`
  contributions (locomotion.md § Authoring, step 4 — **confer the verb**).
- `MountableMixin` (`$S/lib/slot/Mountable.ts`) has only `mountSlot` — no height.

### Reach after controller liquidity (what to remove, exactly)

- `ReachDepth` (`$S/api/command.ts:856`); `FieldDefinition.depth` (:900);
  `CommandContext.depth` (:166–170); `AssembleSuccess.reservedDepth` (:1446);
  schema `command.schema.json:331`; `--top/--open/--deep` parsed at
  `CommandLogic.ts:1066–1083`, written :1236, handed off at `CommandGiver.ts:1408`;
  `RESERVED_TOKENS` (`CommandDefinition.ts:1140–1149`); `rungFor` (`CommandLogic.ts:603`),
  `walkScopes(…, depth)` (:523), `strictCandidates` (:584), `scopedMany/One` (:681/702),
  **`refuseIfShutAway`** (:607–645, re-walks at `deep` and notes `reach:enclosed-shut`);
  `MqlContext.depth` (`$S/api/mql/types.ts:79–93`); `candidatesFromReach(…, depth)`
  (`scope-walk.ts:67–78`); resolver seeds passing `ctx.depth` (`resolver.ts:487–524`,
  :728–760, :582–640, mid-chain anchors :1128–1143 hard-coding `top`/`open`);
  `PerceptionApi.reach(actor, {depth, location, pools})` (`$S/api/perception.ts:396`,
  `reachOf` `PerceptionLogic.ts:1513–1631`), `canReach(…, {depth})` (:431),
  `Container.getReachableContents(rung)`. **Views:** `depth: top` on exactly 8
  (`$P/cmd/inventory/{put,hang,give,drop,wield,remove,wear,unwield}.yaml`); the flags
  on none; `me:e:exits` scopes on the 8 movement views. Docs: mql.md:612–640,
  command-spec.md:736–750. Tests: `CommandGiver.reachRung.test.ts`,
  `mql.reachable-depth.test.ts`, `reach.sameSet.test.ts`, `validation.test.ts`.
- **The viewer filter inside the resolver:** `visibleInside(holder, viewer)`
  (`$S/api/mql/resolver.ts:1176–1210`) — raw contents for the viewer's own and system
  mode; address-through for a shut box in the viewer's keeping (`inViewersKeeping`
  :1216); else `PerceptionApi.visibleContentsOf`. `visibleInsideDeep` (:1229) for `:I`.
  The shipped doc is mql.md:895–910.
- `PerceptionApi.perceives(viewer, target, attention?)` (`perception.ts:458`,
  `perceivesImpl` `PerceptionLogic.ts:1018–1036`): rules = not Concealable → true;
  not concealed → true; discovered (BeliefStore) → true; else effective perception ≥
  the band's requirement. **No holder rule, no covering rule.** `visibleContentsOf`
  (`perception.ts:643`, impl :1094–1136) → `{worn, held, carried, shut}`; for another
  person worn + held, never carried (the "pockets" exclusion :1131). Callers:
  `InventoryController.ts:78`, `QueryController.ts:81`, `observeThing` (:1245),
  `visibleInside`. `isAnotherPerson` = `viewer !== target && isAgent && isSlotted`.
- **Binder:** `CommandLogic.resolveModel` (:1546) → `walkScopes` → `scopedMany` →
  `MqlApi.resolveMany`; `scope-walk.pushDirect` (:144–166) gates every candidate on
  `perceives`, but `matchesFromStuff` seeds (`me`, `inventory`, `online`, `world`,
  path templates) and the viewer's own `:i` do not; `applyCardinalityPolicy`
  (:1426–1543) then picks `stuff[0]`, errors with `2nd x`, or prompts
  (`PromptLogic.mqlObject` :519). Ordinals desugar at the head (`desugar.ts:189–210`).
- **Surfaces:** `QueryController.ts` (no filter of its own; `--ledger` →
  `InventoryController.ledger`), `FindController.ts` (none; adds the template path
  inside `heldExtents` :86), `LookController.ts` (`observeThing` → `visibleContentsOf`,
  groups Wearing/Holding/In it :712–738), `InventoryController.ts` (100 lines; one
  arg, **no options**; `ledger` :74–98 `@internal`), script islands
  `$S/lib/script/Expression.ts:312–330` (`resolveMany`, scope `reachable`), MQL
  subscriptions (`MqlSubscriptionRegistry.ts:227–240`; `Container.contents` read via
  `:visible:carried`, `Attired.worn` read :579–597 filters by `perceives`),
  `CardRegistry.ts` (`resolveSubject` :1574 gates on `perceives`), client
  `CardBodies.tsx:1594–1600` (**`HereList` suppressed for agents: "a person's contents
  are their pockets"**). **There is no object autocomplete** on either side (the phone
  strip suggests handles/channels/emotes only).
- `AccessApi.heldExtents(subject): Promise<string[]>` (`$S/api/access.ts:164`); callers
  Find/Teleport/Reload/Broadcast, `DiagnosticLogic`, `Soil`, `Tract`, `HerdRegistry`.
  No `lens` anything; the per-character `static settings` keyspace lives on
  `Avatar.ts`, `Environment.ts`, `Mobile.ts` etc. The sandbox's wire body is
  `SandboxAvatar` (`SandboxApi.enter`); there is no in-game "play as a test character".

### Combat's beat, the instrument, cordage

- `WeaponSwitch` (`$S/lib/combat/WeaponSwitch.ts`) is a countdown in beats; the
  instrument resolves to nothing while live. `CombatLogic.beginSwitchImpl` (:4349–4365)
  costs `combat.draw.seconds` (1.5) from the `sidearm` slot else `combat.switch.seconds`
  (6) (`AppSettings.ts:1109/1111`); `drawSidearmImpl` (:4367), `findBackupWeapon`
  (:4334). Verbs `fight switch` / `fight draw`. The plain `wield` has no beat.
- `measure`/`analyze` (`$P/cmd/perception/*.yaml`): `tool` is `type: objects`,
  `default: "reachable:[mixin.ToolMixin]"` — found by **reach**, room included ("a bench
  on the wall … counts"); `Reading.narrow` (`$S/lib/instrument/Reading.ts:975`) takes
  the first capable unbroken Tool.
- Cordage: `Line` (`$S/lib/spatial/Line.ts`, `lengthM`, `getHolder()`, `makeFast(who)`,
  `mintEnd()`), `Rope` (`$S/platform/thing/Rope.ts`, `tieTo` :518 — an agent load gets
  the free end **into their hands** via `makeFast`; a thing load becomes `_anchor` with a
  fixed-end knot), `LineEnd = Tieable(TetherEnd(Good))` (`getHolder` :69, `getLashedTo`
  :78, `followLoad`), `RopeEnd = Climbable(LineEnd)`, protocol `Tieable.tieTo(by, load,
  knot)`/`untieBy`, `TetherEnd.tetheredTo()`. Knot joints under `$P/joints/`.

### Persistence and the body of record

- `Avatar.restore()` (`$S/lib/character/Avatar.ts:890`) → `PersistableApi.materialize`;
  `PrimaryAvatar.onCreate` (`$S/platform/agent/PrimaryAvatar.ts:89–174`): snapshot →
  `materialize` (:146) → `reconcileMortalState` → `installDefaultLoadout` (:157).
  `PersistableLogic.restoreRecord` (:1305): `restoreState` (fields; contents via
  `restoreItem` → `move(clone, host)` :942/954; `slottedSlice.worn` →
  `occupyAll(item, slots, {restoring:true})` :828; estate) → `restorePlacement` →
  `overlayOwnedGoods` → `reoccupyRestingHost` → **`host.onRestored()` (:1333;
  declared `Persistable.ts:206`; overrides: `Voyaging.ts:489`, `Ship.ts:1999`)**.
  `SlottedMixin.captureSlice` records `worn` **by contents index** (~:775) — the
  precedent for persisting a within-body reference without a stuffId.
- Residence: `ParcelApi.heldUnitOf(holder)` / `heldUnitsOf` (`$S/api/parcel.ts:424/433`);
  no `getResidence`. Logout (`Avatar.onLinkdead` :1629) drops nothing; unconsciousness
  drops nothing; death moves every body content to the corpse (`ConditionLogic.ts:946–951`).
- New characters: an aspiration outfit (`$S/config/char-gen.yaml`; `EmbodyController.ts:765–778`;
  `Login.ts:345–358` for guests) = a top + `/stuff/thing/clothes/student-trousers` +
  `canvas-shoes`; the AetherImplant into `cranial`; the Arrival Note coin via
  `BankingApi.disburse` (`ContractLogic.ts:1506`). **No pocket anywhere; the lounge
  (`$C/saxonberg-lounge/content/world/lounge/location/lounge.yaml`) has no `props:` and
  no cup** (cups exist: `/trade/hospitality/thing/mug`, `/trade/ceramics/thing/mug`).

### Gear and packs

- `Garment` (`$S/platform/thing/equipment/Garment.ts:78`) = `Tearable(Labelled(Soilable(
  Wearable(Slottable(Assembled(Crafted(Durable(Constructed(Dyed(Good))))))))))` —
  **no `Container`**. `Pack` (`$S/platform/thing/equipment/Pack.ts`) = `Wearable(Slottable(
  Vessel))`; the one row `generic-objects/…/gear/backpack.yaml` claims `[torso]`, no
  volume. 29 Garment rows: tailoring `shirt/trousers/coat/apron` (`/trade/tailoring/thing/`),
  generic-objects `clothes/*` + `armor/*`, rubber's two `extends:` rows. **No row for**
  satchel, purse, belt, sheath, scabbard, holster, quiver, bandolier, saddlebag,
  pannier, pack saddle, saddle, halter, tarp, oilskin, headlamp, lanyard, mule, travois.
- Light: `Lamp` (not Wearable), `PortableLight = LightSource(Switchable(Good))`
  (`$S/platform/thing/equipment/PortableLight.ts`); the only worn light is arcana's amulet.
- Packs and roots: `trade-tailoring` `/trade/tailoring` (makes garments), `trade-textiles`
  `/trade/textiles` (cloth only), `trade-tanning` `/trade/tanning` (leather, no worn
  rows), `trade-smithing`, `trade-cordage`, `transport` `/system/transport` (vehicles,
  `agent/draft-horse`), `generic-objects` writes `/stuff/thing/{clothes,armor,arms,gear}`
  and `/stuff/idea/exits/`, `species-and-names` the body plans.
- The ratchet template: `packages/server/scripts/check-lib-statics.ts` (ceiling const,
  `--lint`/`--report`, `@internal` counted separately, fixture test); gates are
  `scripts/check-*.ts` wired as `lint:*` (`lint:family` derives the roster).
- `DiagnosticApi.record({path, severity, message, channel})` (`$S/api/diagnostics.ts:81`).
  `TemplateApplier` phase 2 dispatches `apply<Field>` for instruction fields
  (templates.md); `lint:on-create` counts `onCreate` methods against a ceiling.

## ⭐⭐ New substrate

Short is the goal. One new mixin, no new Api, no new logic singleton, no new
document kind, no new collection, no new module category. Everything else is a
field, a method or a row on something that exists.

| new thing | kind | where | reuse-ledger row / why genuinely new |
|---|---|---|---|
| `Dimensions` | value object | `$S/lib/spatial/Dimensions.ts` | **genuinely new.** Searched: `BoundaryOpening` (2-D, an opening not a thing — reused as the mouth/clearance type), `Quantity` (a scalar), `Exposure` (faces of a place). Carries `width·depth·height` m, `crossSection(): BoundaryOpening` (the two smaller), `longest`, `boxVolume`, `fitsThrough(opening)`, `fitsWithin(box, closed)` |
| `Form` rows | Idea rows, class `platform/idea/Form` | `$P/idea/Form/{rod,sheet,block,round,flexible}` | generalizes the `LocomotionMode` / `Placement` row pattern (a vocabulary with numbers behind it is rows, not an enum — `lint:closed-vocabularies`); a sixth form is a row and no code |
| `CarryingMixin` | kernel mixin on `Creature` | `$S/lib/embodiment/Carrying.ts` | **genuinely new** (slate § 8 "`agent.receive` on the carrier"). Searched: `LoadBearing` (the gauge, not where things go), `Attired` (covering), `Slotted` (occupancy), `HaulerMixin` (the cart), `Store.receive` (a warehouse's). Owns `receive`, `ready`, `stow`, the homes, `freeHands`, grip |
| pockets as named placement members | a widening of `Placing.placements` (`string[]` → entries `{member, name?, mouth?, volumeM3?, covered?, closes?}`) + one Placement document `/platform/placements/pocket` | `$S/lib/spatial/Placing.ts`, `$C/platform/content/placements/pocket.yaml` | **not a class** (owner review): a pocket is a region the garment offers; the pocketed thing lives in the wearer's contents with the pair, as the ham lives in the room (`placeOn`); `putPlanFor`'s offers, `canPlace(item, name)`, `getPlaced(name)` and the persisted pair already do the job. The widening also lets a range name its two hot plates |
| the hanging rule (the belt) | methods on `Placing` — `hangingLengthM()`, `bearsKg()`, `roomFor(name)`, and the fit step in `canPlace`'s default body; two row fields on the `from` Placement document (`hangs`, `fastens`); one material property `tensileStrengthMPa` | `$S/lib/spatial/Placing.ts`, `$C/platform/content/placements/from.yaml`, `$S/lib/material/Material.ts` | **not a class**: the container rule's one-dimensional case on the shipped `from` placement (a ham from a hook); attach is `put`, detach is `get`. Searched: `Slotted.capacity` (a count, never a length — the owner refuses authored mount counts), `Placing.bearingLoadN` (the force a host presses down, the inverse question) |
| `shapedTo?` on `Container` | field | `$S/lib/spatial/Container.ts` | a container shaped to one kind (a sheath, a holster, a quiver, a knife block, a cup rack); unset = anything that fits. A holster/scabbard/quiver is a **`Pack` row** with `shapedTo` + an authored `mouth`; a belt pouch, bumbag, purse, saddlebag, pannier a `Pack` row with its claim — **no `Pouch`, no `Sheath` class** (owner review) |
| `PortableLight` composes `Wearable(Slottable(…))` | composition change, no new class | `$S/platform/thing/equipment/PortableLight.ts` | the headlamp is a `PortableLight` row claiming `[head]`; the two shipped rows claim nothing and are unchanged. Slottable is also what lets a lamp clip onto a mount point later (the belt) |
| `canid` body plan | row | `$C/species-and-names/…/BodyPlan/canid.yaml` `extends:` quadruped + `body.head.mouth` `serves: [manipulation]` + slot `mouth` | the dog's one "hand"; the horse keeps the quadruped plan (no hands) |
| `stoop` · `crawl` | LocomotionMode rows + thin controllers + views | `$P/idea/LocomotionMode/`, `$S/platform/idea/cmd/movement/{Stoop,Crawl}Controller.ts`, `$P/cmd/movement/` | beside `sneak` (locomotion.md § Authoring) |
| `lens` | view + controller (`author` category) | `$P/cmd/author/lens.yaml`, `$S/platform/idea/cmd/author/LensController.ts` | the builder lens switch; resolves `heldExtents` once at `on` |
| `lint:body-moves` · `lint:perceived-surfaces` | census gates | `packages/server/scripts/check-body-moves.ts`, `check-perceived-surfaces.ts` | census-then-ratchet, template `check-lib-statics.ts` |
| the drive + the walk | wire file, e2e | `packages/wire/tests/size-and-carrying.dirty.wire.test.ts`, `size-and-carrying.soak.dirty.wire.test.ts`, `e2e/tests/size-and-carrying-walk.spec.ts` | precedent: controller-liquidity, cordage |

**Fields on existing hosts** (each argued in § Host placement): `form`, `dimensions?`
on `Tangible`; `mouth?`, `shapedTo?` on `Container`; `turn?` on `Exit`; `hands` on
`LocomotionMode`; `readies:` on `FieldDefinition`; `tensileStrengthMPa` on `Material`;
`hangs`/`fastens` on the `from` Placement row; `back` and `waist` slots on the biped
plan; `Garment` composes `Placing`.

**Classes considered and not made** (P1, owner review): `Pocket` (a Stuff per pocket —
two to four objects per garment for every worn garment in the world, each persisted,
swept and cloned; the member shape costs none), `Pouch`/`Sheath` (rows over `Pack` with
`shapedTo`, hung from a belt), `WornLight` (a composition change on `PortableLight`),
`Belt` (a `Garment` row with a `from` member; the length rule is `Placing`'s for every
from-host).

**Not new, and named so nobody re-invents them:** `BoundaryOpening` (the mouth and
the clearance type), `Exit.getOpening()`, `Boundary.getOpening()`, `Exposure`,
`Sealable` (the lid, the flap), `ClosureLevel` (watertightness), `Material.density`,
`Material.waterAbsorptionCapacity`, `Material.lightAbsorption` (see-through),
`Buoyant.displacementWalk`, `WaterPlace.immerseArrival` (the soak), `Integrity.afterWetted`
(the ruin), `WeaponSwitch` + `combat.draw.seconds`/`combat.switch.seconds` (the beat),
`Vitals.canGrip`/`slotRefusalReason`, `BodyPlanSlots`, `occupyAll`, `tryReleaseFromSlots`,
`HaulableMixin.handedness`, `Mobile.crossExit`'s conveyance region (the tow), `Rope.tieTo`,
`LineEnd`/`TetherEnd`, `Persistable.onRestored`, `SlottedMixin.captureSlice` (by-index
references), `ParcelApi.heldUnitOf`, `AccessApi.heldExtents`, `PerceptionApi.perceives`,
`isAnotherPerson`, `DiagnosticApi.record`, `PlacementCouplingFor`, `cover` (device).

**Deliberately a method, not a mixin:** `Container.fitRefusal` / `bounds` / `getMouth`
/ `closureLevel` / `reconcilePressing` (every container answers them — a place too);
`Exit.clearance` / `clearanceRefusal`; `Creature.envelope`; `Location.getCeilingHeight`
(fixed, not new).

## Plan-level decisions

### Size

- **D1 — a thing's size is `Dimensions`, derived from form × volume, authored only when
  special.** `Tangible` gains `form` (identity ref to a Form row; default by class:
  `Garment`/`Line`/`Sack`/`Pack` → `flexible`, `Sheet` → `sheet`,
  everything else `block`; a row overrides) and `dimensions?` (authored `{width, depth,
  height}` m, the bole's length precedent). `getDimensions()` = authored, else
  `Dimensions.ofForm(form.aspect, getVolumeM3())` (the form row carries `aspect:
  {width, depth, height}` relative — rod 1:1:20, sheet 50:70:1, block 1:1.5:2, round
  1:1:1 — and `rigid: bool`). **Why rows:** a form is a word with numbers behind it; an
  enum would raise `lint:closed-vocabularies`, and a cone or a ring must be no code.
- **D2 — volume derives.** `Tangible.getVolumeM3()` = `getMass() / material.density`
  (the `Buoyant.displacementWalk` rule, promoted to the one read; `Buoyant` calls it).
  Overrides: `Assembled` with a parts record → Σ over `PartLine`s of (the part template's
  `mass` ÷ its material's density × count), read **on use** through `TemplateApi` by the
  line's `template` path (an authored reference — P7), else its own mass/density;
  `Bulkable` → shell (mass/density) + `interiorCapacity` (L → m³); `Stackable` →
  `quantity × unitVolume`, unit volume from the host's own `getMass()` convention (⚠ see
  Risks: the convention is inconsistent — this build reads each host as it is and files
  the sweep); `Creature` → `getMass()/getBodyDensity()`; `Rope` → π(d/2)²·L × a coil
  packing factor. `getPackedVolumeM3()` = `getVolumeM3()` for rigid forms;
  `flexible` → volume × `CARRYING_DEFAULTS.FLEXIBLE_PACKING` (2.0, cloth packs with
  air) × `foldPackingFactor()`.
- **D3 — the folding seam is one method.** `Tangible.foldPackingFactor(): number`,
  default 1; `FoldableMixin` overrides to read `isFolded()` → `CARRYING_DEFAULTS.
  FOLDED_PACKING` (0.6). The folding build replaces the number with the crease model;
  nothing else changes. No fixed dimensions for a flexible thing: `getDimensions()` on a
  flexible form answers its **flat** box (for the mouth test the cross-section is the
  packed cube root squared — a coat squeezes through what a board cannot).
- **D4 — a container bounds a thing only on the sides it closes; fit is one method,
  asked at the chokepoint.** `Container.bounds(): {interior: Dimensions, closed:
  {width, depth, height}, mouth: BoundaryOpening}`:
  - interior = `getDimensions()` less the shell (rigid: `× CARRYING_DEFAULTS.INTERIOR_FRACTION`
    0.9); a `Bulkable` interior derives from `interiorCapacity`; a **place** interior is
    its cube (`getLinearExtent()`³, `getCeilingHeight()` for height);
  - closed: rigid container → width and depth always, height iff `Sealable && !isOpen()`
    (a bucket, a barrel, an open crate, an open chest are open above; a shut chest, a
    shut pocket flap close it); flexible container (sack, pocket, pouch, bag) → the same,
    but "fits along a side" is by volume against capacity and by `longest ≤ interior.
    longest` (its largest stretch); a `Placing` `on` member → nothing closed (a surface
    supports); a place → width/depth closed unless `exposure().wallsNone` or the face is
    in `openSides`, height closed iff `exposure().top !== 'open'`;
  - mouth = authored `mouth?` else derived: rigid → the open or lidded face (width ×
    depth); flexible → the packed cross-section of the container itself; a place → not a
    mouth, entry is through a way (D8).
  **The one-dimensional case — a thing others hang from** (the modular belt, requirements
  § *The modular belt*): a `Placing` host's `from` member is bounded by its **length**,
  and each hung thing takes its **hanging width** (`Dimensions.hangingWidthM()` — the
  middle dimension of the sorted box; a flexible thing its packed cube root).
  `Placing.hangingLengthM()`: default the host's own `getDimensions().longest` (a tool
  rail, a pack's strap, a saddle's skirt; a `round` form answers its circumference — a
  key ring); **`Garment` overrides it while worn** with the wearer's circumference at the
  claimed slot (`π × envelope.width`, × `WAIST_FRACTION` 0.9 for `waist` — a gnome's belt
  holds less than an ogre's), its own longest unworn. `Placing.bearsKg()`: the mass the
  host holds up, from its material — `Material.tensileStrengthMPa` (new authorable
  material property: leather 20, hemp 60, steel 400; unset = unbounded, a pegboard) ×
  the host's cross-section (`depth × height` of its box) ÷ g ÷ `HANG_SAFETY` 4.
  `Placing.roomFor(name): 'none' | 'a small thing' | 'one more pouch' | 'plenty'` words
  the remaining length against `HANG_ROOM_WORDS` (0.04 m / 0.10 m / 0.30 m); never a
  number. One mechanism for every from-host — belt, bandolier, chest harness, vest,
  pack straps and carabiners, saddle, key ring, pegboard, tool rail — **and no belt
  class** (D27).
  **Where the member fit lives:** `Placing.canPlace(item, name)`'s default body (shipped:
  `no-such-placement` → `shut` → ok) gains the fit step between `shut` and ok: for a
  member whose document `encloses` (a pocket) the mouth/volume/capacity checks against
  the member entry's `mouth`/`volumeM3` over `getPlaced(name)`; for a member whose
  document `hangs` (the `from` row gains `hangs: true`, `fastens: true` — row fields, D5)
  the length and the mass: Σ `hangingWidthM` + the item's ≤ `hangingLengthM()`
  (`'no-room-along'`, worded *"there's no room on your belt for the canteen"*), Σ mass +
  the item's ≤ `bearsKg()` (`'too-heavy-for'`, *"the belt won't take it"*); `on` bounds
  nothing. `placeOn` (:262) already asks it, so the belt's rule fires at the chokepoint
  with no new call.
  `Container.fitRefusal(item): ActRefusal<'too-big-for-mouth' | 'too-big-inside' |
  'no-room', {container, item, dims}> | null` runs the two tape-measure checks (mouth
  by cross-section; turned some way it fits every closed side — the three rotations of
  the sorted box) and the capacity check (Σ fill ≤ interior volume; a rigid item fills by
  its bounding box, a flexible one by its packed volume, bulk exactly, a stack count ×
  unit; a thing standing out of an open side fills by cross-section × interior height).
  **It is asked in `Container.canAddContainable`** (the destination veto at `moveCore`
  :340 — every container, bodies excepted, D11; a body is sized by its envelope, D38) and worded at the verbs (`put`, `receive`)
  before moving; a programmatic violation throws `ContainmentError` as today. A **lid**
  that would close on an overhang: `Sealable.canClose(by)` reads `bounds()` with height
  closed and refuses `'sticks-out'` naming the thing (*"the pole sticks out — the lid
  won't shut"*). A `Placing` `on` destination runs `canPlace` only (unchanged); it bounds
  nothing.
- **D5 — pressed in, or it leaves.** `Container.reconcilePressing()`: for each content
  that is not a slot occupant, not fixed in place, and **not placed on a member whose
  document `fastens`** (`from`: a hung thing is clipped or tied — it stays put in water
  and in zero g; `on` does not fasten), the net force direction is one of three: **down** (gravity > 0 and not buoyed) → held by a closed bottom, always;
  **up** (immersed and `item density < medium density`) → leaves unless height is
  closed; **none** (`gravityNow() == 0`) → leaves unless every axis is closed (a thing
  `on` a surface leaves unless fastened). Leaving = `ContainmentApi.move(item,
  getEnclosingPlace())` and a scene line (*the cork bobs up out of the bucket*, *the cup
  drifts off the table*). Triggers: `onContainableAdded` (the arrival), the place's
  `setGravity` (every container in the place, one level — a wizard's zero-g room),
  `WaterPlace.immerseArrival` (already walks the arrival's contents). Never on a
  clock. Water's medium density is `BiomeApi.mediumFor(thing)` (exists).
- **D6 — gravity reads synchronously through a memo.** `AtmosphericMixin.gravityNow():
  Quantity<'m/s²'>` returns the last resolution of `getGravity()`; resolved at
  `postRegister`, re-resolved when `_gravity` is set and when the biome chain changes
  (the exposure cache's rebuild triggers), 9.81 until the first resolution. `getGravity`
  stays the authoritative async read. `LoadBearing.getBorneBurden(ρ?)` multiplies the
  weighted walk by `g / 9.81` of the bearer's enclosing place (zero-g → 0 burden; mass,
  size and hands untouched); `Buoyant.ts:28`'s `G` reads the memo.
- **D7 — places are containers on the same rule, and open sky has no ceiling.**
  `Location.getCeilingHeight()` returns `null` when `exposure().top === 'open'`;
  `SphericalLocation` likewise. `bounds()` on a place is D4's. **Authored content:** when
  `Template.applyProps` (`Template.ts:637`) seeds a prop into a place whose
  `exposure().holdsAir()` is true and `fitRefusal` is non-null, the prop is **not placed**
  and `DiagnosticApi.record` names the thing, its dimensions and the place (channel
  `location-graph`, severity error); an open place lets it spill (placed, no diagnostic).
  Never a trim.
- **D8 — a way's clearance is its tightest gap; a turn is one optional field.**
  `Exit.clearance(): BoundaryOpening` = elementwise min of the face (`source.
  getLinearExtent()` square), `getOpening()` and the hung boundary's `getOpening()`.
  `Exit.turn?: number` (m, persistent, authorable; from the kind row or per site) is the
  longest rigid length that can swing round the bend; unset = unbounded. The traverse
  gate (D21) tests a body's envelope and each held thing's cross-section against the
  clearance, and each held rigid thing's `longest` against `turn`. Two kind rows ship
  (`crawlway` 0.8×0.8 — a hands-and-knees crawl is ~0.4 × stature, so a 1.75 m body
  crawls at 0.7 m and clears it bare, and a pack on the back does not; `ladder`), and
  the shipped `stair` kind gains `turn: 2.2`. **A low
  door is not a kind** (owner review; requirements § Bodies and openings): it is one
  way's authored `opening:` on its `exits:` entry (the drive's low-door room authors
  `north: {destination: …, opening: {width: 0.9, height: 1.4}}`); a site that differs
  from its kind authors `opening:`/`turn:` the same way.

**Decided while building W1** (beyond D1–D8):

- **D1-b** — Tangible's field is `shape` (authored `shape: rod`), not `form`: the glass
  pack's `Sheet`/`Gather` and `Construction` already own `form`/`getForm()`. The rows stay `Form`.
- **D1-c** — Forms load on use (P7): `Tangible.ensureShape()` at the async seams (`put`, prop
  install); a sync `getShape()` miss starts the load (omni scope only — a commons row is never
  minted in a circle) and answers *unknown* once. No boot entry, no `onCreate`.
- **D1-d** — `SIZE_DEFAULTS` (packing, interior fraction, hang safety, the room words) live beside
  `Dimensions`, not in `Carrying.ts`: Tangible importing Carrying cycles through Slotted → Thing.
- **D2-b** — `Assembled` sums `PartLine.volumeM3`, recorded by `CraftingLogic` as each line goes in
  (no sync template read exists); a found thing or any unrecorded line answers by its own mass
  (+ its interior when Bulkable — a cask is its staves and its room).
- **D2-c** — `getMatterVolumeM3()` (mass ÷ density) is the one promoted rule; `Buoyant`'s walk reads
  it, not the outer volume (a vessel's room floods or its contents are walked) — displacement is
  unchanged. Stackable reads `getMass()` as one unit's; `Coin` (mass = the pile's) overrides.
  Rope packs as a coil (×1.3), not cloth (×2).
- **D4-b** — A container's ROOM is known only from an authored box (× 0.9), a vessel's
  `interiorCapacity` (in its rigid form's proportions; a flexible one's as a block) or a place's
  cube. A hollow thing's derived size measures its walls, so it is never asked — every shipped
  `Pack`/`Vessel` with no authored box behaves as before. An unknown size (no mass, no material,
  form not loaded) is never refused. Bodies have no bounds and are never pressed.
- **D4-c** — The derived mouth of a thing-container is its interior's top face (a bag opens as
  wide as it is), not the container's own packed cross-section.
- **D4-d** — `fitRefusal` tries every-side-closed first and reads a place's exposure only when that
  fails (an open side only lets more in) — so a move into a room never resolves its neighbours.
  A place's interior is its cube whatever its top (an open top is an open side).
- **D4-e** — A hanging host takes its FIRST thing whatever its width (a hook is a point); the length
  bounds the sum from the second. `tensileStrengthMPa` is on base `Material` as planned (on
  `Solidity` it raised `lint:material-kinds` by 215 gaps).
- **D4-f** — The specialized `canAddContainable` overrides (well/bilge/wellhead/conduit pumps, Store,
  Hive, both coppers, rearing tray, envelope) own the whole answer; only the default body asks the
  tape measure. Open-fronted places: `openSides ≥ 1` opens depth, `≥ 3` width.
- **D4-g** — `placements` entries: `getPlacements()` returns region keys (`name ?? member`);
  `Placing.placementOf(key)` is the one read of a region's `Placement` — every reader of a placed
  pair goes through the host (`getEnclosingScope`, look/sense headings, dry, put, offers).
- **D5-b** — Arrival pressing fires from the chokepoint (`moveCore` for a thing container, `placeOn`
  for a placed thing), a tick later — not an `onContainableAdded` default overriders would swallow.
  It reads the CONTAINER's medium: a cork floats in a bucket's own water and stays.
  `ContainmentApi.move(placed, itsOwnContainer)` now takes it off its host (was a no-op).
- **D6-b** — `gravityNow()` answers the scope's own `_gravity` synchronously, else the memo, else
  9.81 while the first resolution runs (`postRegister` no longer exists); an exposure rebuild
  re-resolves keeping the last answer.
- **D8-b** — `Exit.clearanceRefusal` measures the mover's own fit box in W1; W2 swaps in the
  envelope and the hand occupants. `turn` rides `ExitInstruction`/bidirectional options per site.

### Hands and carrying

- **D9 — a hand is a slot whose body part serves `manipulation`.** `CarryingMixin.
  handSlots()` = the slots of the body plan whose `SlotSpec.bodyPart` names a part with
  `serves: [manipulation]` (biped `hand:left`/`hand:right` already do). The dog gets a
  `canid` plan row (quadruped + `body.head.mouth` serving manipulation + slot `mouth`
  accepting `WieldableMixin`); the horse keeps the quadruped plan. A hand grips when
  `Vitals.canGrip(slot)`; `freeHands()` = hand slots that are empty and can grip, minus
  a hitched cart's `handedness` (D18).
- **D10 — grip is derived; two hands is a threshold.** `Carrying.handsFor(item): 1 | 2
  | null`: `null` when `item.getMass() > getStrainCeiling()`; `2` when mass >
  `getCarryCapacity() × CARRYING_DEFAULTS.ONE_HAND_FRACTION` (0.3; 70 kg → ~10 kg) or
  `item.getDimensions().longest > stature × TWO_HAND_LENGTH` (0.6; a 1.2 m staff) or the
  item's Wieldable claim names two hand slots **because its use needs two** (owner,
  2026-11-11: two hands *by use* is authored — bow, crossbow, pike — and two hands *by
  weight* is derived; a weapon row whose two-hand claim is only about weight loses it
  in W6, so an ogre wields a human greatsword one-handed and a gnome needs two for a
  longsword — the W6 audit of `generic-objects` arms rows lists each and its reason);
  else `1`. A gnome's threshold sits below an ogre's by construction. No strength stat
  is added (encumbrance.md's rule holds).
- **D11 — `receive` is the one way onto a body; the invariant is a destination veto.**
  `Carrying.receive(item, {prefer?: 'hands' | 'pockets', slot?, for?: 'hold' | 'wear'}):
  ActRefusal<'nowhere-to-carry' | 'cannot-grip' | 'too-heavy', …> | null`. Order is the
  setting `carry.order` (`hands-first` default | `pockets-first`; a `static settings`
  entry on `Carrying`): a free hand (grip permitting) → `seatInSlot`; else the worn
  containers in tier order (ready, then packed; D15) whose `fitRefusal` is null → `move`
  into that container (the home is set, D14); else the refusal in words naming the hands
  and the containers tried. `slot:` pins a destination (equip's claim; `wear` →
  `occupyAll`). The horse: no hands → its worn containers; a cat → *"it has nowhere to
  carry that"*. **What "not loose" means after the placement model:** a content of a
  body is honest when it is a slot occupant (held, worn), **or** it carries a placement
  pair whose host is itself honest on the body (a cup in a coat's pocket, a pouch hung
  from a belt, a canteen clipped to a pack's strap — all live in the body's contents with
  a `(host, member)` pair, because `placeOn` places into the host's environment), or it
  is inside such a thing's own contents. `Carrying.isHonest(item)` is that walk.
  **`Carrying.canReceive(item): ActRefusal | null`** is the same resolution with no
  write — the pre-check a *handed* thing runs before anything moves, money included
  (D-W7a); `receive` is `canReceive` plus the move.
  **The invariant:** `Creature.canAddContainable(item)` vetoes `'loose-on-body'` unless
  `this._receiving === item` (a TypeScript-`private` reentry flag set for the duration
  of `receive`/`seatInSlot`/`occupyAll`'s own move, of `placeOn` into a worn host, of
  `restoreItem`, and of D33's **host-follow** move — a coat handed to a new wearer brings
  its pocketed things, which arrive placed, not loose); **off until the flip (W7)**, when
  W0's census must read 0 outside the allowlist — the same list in D11 and in W0:
  `Carrying`, `Slotted.seatInSlot`, `ContainmentLogic.placeOn`, `ContainmentLogic.
  moveCore`'s host-follow (D33), `PersistableLogic.restoreItem`, `ConditionLogic` death →
  corpse (a `Thing`). `move()`'s contract is unchanged (slate § 8): this item, into this
  container; D33 adds what the item *brings*, never what the caller meant.
- **D12 — the loose-carry model retires at the flip.** `LoadBearing.getBorneBurden`
  drops pass (a) (contents at 1.25); every content of a Creature is honest
  (`Carrying.isHonest`, D11), so the walk covers **slot occupants and placed items**:
  hand slots at `LOOSE_CARRY_SURCHARGE` (renamed `HELD_SURCHARGE`), worn occupants at
  1.0, and every content carrying a placement pair on a worn host (a cup in a pocket, a
  pouch hung from the belt) at the worn floor 1.0 — each recursed into as today, counted
  once by the `visited` set. **Awkwardness** for held loads: `× (1 + AWKWARD_LENGTH ×
  max(0, longest/stature − 1) + AWKWARD_BULK × volume/bodyVolume)`. `held` predicate =
  occupies a hand slot; `carried` = pocketed, hung from a worn host, or inside a worn or
  hung container (everything honest that is neither held nor worn); `worn` unchanged.
  `Hauler.handsOccupied()` → `Carrying.freeHands() < handedness`.
- **D13 — what the body stops with.** On the consciousness capacity falling below
  conscious (`Vitals`' existing cascade), on dying, and on severance of a hand's part:
  `Carrying.releaseHeld(slots?)` moves each hand occupant to the enclosing place with a
  scene line (severance's current move-into-the-body's-container becomes this). Worn
  stays. Death still moves everything to the corpse after the drop. Logout drops nothing.

### Homes, readying, reach

- **D14 — a home is the carrier's knowledge of its things.** `Carrying` keeps `homes:
  Map<stuffId, Stuff>` (runtime, weak refs); `put <thing> in/on <container on me>` and a
  receive into a worn container set it; `drop`/`give` forget it. Persisted **by contents
  path** in `Carrying.captureSlice` (the `SlottedMixin.captureSlice` precedent: never a
  stuffId, which does not survive a restart), restored after contents in `onRestored`.
  No field on `Good`/`Containable` — a brick has no home (P2).
- **D15 — reach tiers derive from the slot and the pair.** `Carrying.tierOf(thing):
  'hand' | 'ready' | 'packed' | 'elsewhere'`: in a hand slot → hand; **hung `from` a
  worn host, or in a pocket of a worn garment, or inside a container that is hung or
  pocketed** → ready (everything on a belt is ready; a canteen clipped to a pack's strap
  is ready); inside a worn container whose slot is `back` (new biped slot, capacity 1,
  `accepts: WearableMixin`) → packed; worn itself, or inside any other worn container
  (torso, legs, neck, hands, a mount's saddlebags while mounted) → ready; else
  elsewhere. The `Pack` row's claim moves `[torso]` → `[back]`; a satchel row claims
  `[torso]` and is ready. Two rows, no flag.
- **D16 — `ready` is the model's act; a verb asks for it with one arg field.**
  `Carrying.ready(item): ActRefusal<'packed' | 'hands-full' | 'not-on-you', {by}> |
  null`: in hand → ok; ready tier → free a hand (`stow(held)` sends the held thing to
  its home if it still fits, else refuse `hands-full` — **never dropped for the player**
  (owner, 2026-11-11): the refusal names the held thing and offers both ways out, *drop
  it* (instant, no beat — `drop` in a fight is free) or *put it away first*; a shield's
  home may be the `back` slot when no pack holds it; a held shield counts as a hand, so
  `handsFor` 2 + a shield refuses naming the shield), then `seatInSlot(item, hand)` and
  the scene line (*you sheathe your sword and pull out your compass*); packed → refuse
  naming the pack (*take it off first*); elsewhere but reachable and fixed in place (a
  bench) → ok (used where it stands); elsewhere otherwise → `not-on-you`. **The
  dispatcher** calls `giver.ready(bound)` for any object arg declaring `readies: true`
  (a `FieldDefinition` field; `measure.tool`, `analyze.tool`, `read`, `light`,
  `pour`/`fill`'s vessel, the crafting tools) before the controller runs and renders the
  refusal; the controller is dumb. In a live combat session `ready` runs through
  `Combatant.beginWeaponSwitch`'s countdown generalized to any item, **priced in two halves
  by holder** (owner, 2026-11-11): `Carrying.readySeconds(item) = putAwaySeconds(held) +
  drawSeconds(item)`, each by where the thing goes or comes from — dropped 0; a shaped
  holder (`shapedTo` set) or a `from`-placement clip `combat.draw.seconds` (1.5); an open
  pocket member, an unshaped pouch or a hung tool `combat.reach.seconds` (**new dial**,
  3); a pocket or pouch with `closes: true` adds `combat.unfasten.seconds` (**new dial**,
  3); packed → refused (`take it off first`; `remove` of a worn pack in a session costs
  `combat.switch.seconds`). Summed, `beatsForSeconds` rounds up; the `WeaponSwitch` holds
  guard down / no instrument throughout as today. The start line names the holder each
  hand goes to (*fumbles at her coat pocket* / *her hand drops to her holster*) — the
  session's existing switch narration, given the holder's noun. No competence term (the
  shipped switch has none; deferred to combat-slate). Outside a session the seconds are
  not spent. `fight draw`/`fight switch` become callers of `ready`.
- **D17 — one rule for binding: the nearest thing you perceive wins.** Delete `ReachDepth`,
  `depth:`, the three flags, `MqlContext.depth`, `refuseIfShutAway`, `rungFor`, the
  `depth:` lines on the 8 views, and the rung parameter on `PerceptionApi.reach/canReach`
  and `Container.getReachableContents`. Reach is one definition: hands and worn things;
  inside **open** worn containers at the ready tier all the way down; the place's top
  level and one level into open things there; never a packed container's inside (*take it
  off first*), never another body. The binder's pools stay (`person` → `here` →
  `peers`), descending the giver's whole carried tree (perceived); the tie-break order
  is hand · ready · packed · room, two equally near prompt *which one?*. `reachRefusal`
  grows `'packed'` beside `'enclosed-shut'` and fires **after** binding, only for a
  perceived thing (the `canReach` validator's wording); `mustNotBeShutAway` folds into
  it. `reachable` as a seed/scope word = `canReach` membership exactly. Mid-chain
  anchors (`resolver.ts:1128`) descend one level into open things, as the room does.
- **D18 — pulling, driving and leading take hands.** `hitch` refuses `'hands-on-cart'`
  when `freeHands() < cart.getHandedness()`; while hitched, `freeHands()` is reduced by
  it and `receive`/`ready` say so (*your hands are on the cart*). A vehicle row's
  `handedness` is what driving it takes (reins 2, a tiller 1; `Drivable` reads it at the
  controller slot). **Leading:** `tie rope to <halter>` anchors the rope on the worn
  halter (a `Tieable` tack row on `collar`); the leader holds the free `LineEnd` in a
  hand (it is a thing, `receive`d). In `Mobile.crossExit`'s conveyance region, beside the
  cart tow: for each hand-held `LineEnd` whose line's far end is anchored on a `Mobile`
  creature in the same place, **pre-check** `exit.canTraverse(animal, animal's default
  mode)` — a refusal (*the panniers won't fit*) refuses the leader's move — then the
  animal traverses after the leader. The rope's length is not modeled across rooms.
  **`tie rope to mule` resolves to the halter:** `Rope.tieTo(by, load)` with a
  `Creature` load that is not the tier (today `makeFast` puts the end in *their* hands,
  which is the right answer for a person) looks for a worn `Tieable` on the animal (the
  halter in `collar`) and anchors there; none → refuses `'no-halter'` (*"the mule wears
  nothing to tie to"*). The free end goes to the leader by `receive({slot: hand})` — a
  rope's end is held, never pocketed; no free hand → the tie refuses `'hands-full'`.

### Bodies and openings

- **D19 — the envelope.** `Creature.envelope(profile: BodyProfile): BoundaryOpening`:
  height = `stature × BODY_PROFILE_HEIGHT[profile]` (`upright 1.0 · crouched 0.6 ·
  prone 0.4 · horizontal 0.4 · varied 1.0` — prone is hands and knees, and a swimmer is
  a crawler's height; consistent with the 0.8 m crawlway, D8), a const beside `BodyProfile` in
  `LocomotionMode.ts`), width = girth = `2·sqrt(mass / (π · stature · bodyDensity))`
  (a cylinder of the body's own density) plus the worn stack's bulk at the widest slot
  (Σ `getPackedVolumeM3()` of worn containers on `back`/`torso` as added depth) and,
  mounted, the mount's envelope height + the rider's seated share (`stature × 0.6`).
  Held things are **not** in the envelope: each is tested on its own cross-section (D8) —
  in a crawlway it goes ahead of you (narrated in the traverse message).
- **D20 — `stoop` and `crawl` are modes with verbs.** Rows: `stoop` (speed 0.8,
  `noiseLevel: normal`, `bodyProfile: crouched`, `costMultiplier: 1.1`, `requiresBodyPlanMode:
  [walk]`, medium ground) and `crawl` (speed 0.3, quiet, `prone`, 1.5, `[walk]`, ground).
  `StoopController`/`CrawlController` extend `LocomotionControllerBase`; views in
  `$P/cmd/movement/` (category movement); **conferred by `MobileMixin.self`** beside
  walk/sneak/run (locomotion.md step 4; `lint:reachability`). `LocomotionMode.hands`
  (new field, default 0): climb `2`, swim `0`; the mode gate refuses `'hands-needed'`
  naming the held things when `freeHands() < hands`. A swimmer is `horizontal`
  (crawl-height). Modes an animal lacks are the plan's `locomotionModes` (a horse never
  stoops).
- **D21 — the traverse gate reads the clearance and tells.** In `Exit.canTraverse(mover,
  mode)` (async, "reads whatever moves"): `clearanceRefusal(mover, mode)` → envelope vs
  `clearance()`; each hand occupant's cross-section vs `clearance()` and `longest` vs
  `turn`; a led animal's and a hitched cart's own pass (cart = its bounding box
  cross-section; `wheeled` exits only, already). The refusal names what works: the
  mover's plan modes with a lower profile that would pass (*"you'd have to stoop —
  `stoop north`"*), *"you'd have to dismount"* for a rider, the pack by name for a
  crawlway (*"the pack won't go — `remove backpack`"*), the thing and its length for a
  turn. It **never changes posture**. `stand` under a ceiling lower than `stature`:
  `Posed.acceptPosture('stand')` refuses `'ceiling-too-low'`. With no gravity the
  envelope is the body's narrowest way round (`min(height, width)` both ways).
- **D22 — water soaks what you carry; a shut tight container keeps it dry.**
  `Container.closureLevel(): ClosureLevel` — `Bulkable` answers its `closure` field (as
  today); any other container derives: `Sealable && !isOpen()` and its material's
  `waterAbsorptionCapacity` is 0 → `liquidTight`, else `open`. `WaterPlace.immerseArrival`
  stops its descent at a holder whose `closureLevel()` ≥ `liquidTight` (the oilskin
  pouch: oiled-linen material, flap shut; the rubber bag); a shut canvas pack does not
  keep dry. Wading wets the body's share under water (`Attired.immerse(parts)` with the
  parts below the water line by stature — the `DEFAULT_WADE_M` constant becomes
  `stature × WADE_FRACTION` 0.85, slate § 6.2). Paper's ruin is `afterWetted` as shipped.

**Decided while building W2** (beyond D19–D22):

- **D19-b** — The worn bulk (`Creature.wornBulk()`) is the containers occupying `back`/`torso`,
  each counted at the most of its packed volume, its authored box, or its walls plus its
  contents' boxes; the added depth is the cube root of the sum. It rides ON TOP of a low body
  (prone, horizontal) and trails BEHIND an upright or crouched one, where a way's face does not
  see it. `envelope(profile, {lengthwise?, bare?})`: `bare` leaves the pack out (would it pass
  without it?).
- **D19-c** — A way UP or DOWN is passed lengthwise — the body's length runs along it — so its
  gap measures the body's girth both ways, like zero g. This is what keeps the creamery's 1×1
  cellar hatch (over steps, `up`/`down`) open to a walking body.
- **D19-d** — The mounted pair is read from either end (`Creature.mountedPair()`); a rider being
  carried by its mount is not asked again — the mount's own traverse measured the pair. A mount
  with no stature (every shipped quadruped: the plan and the horse rows author none) has no
  envelope, so no pair is refused until W6 authors one (drive 18's *dismount*).
- **D20-b** — `stoop`/`crawl` rows require `[stoop]`/`[crawl]` in the plan, not `[walk]`: under
  `[walk]` every quadruped could stoop, and the plan is what says *a horse never stoops*. The
  biped lists both. An empty `media` list admits them (the ground family, and
  `TravelProfile.GROUND_PACES`).
- **D20-c** — The hands gate sits in the cascade after posture, before the exit
  (`handsNeeded` → `hands-needed`). `Carrying` gained the minimal reads W4 builds on:
  `handSlots()` (slots whose `bodyPart` is an `Attired.handSites()` part), `heldThings()`,
  `freeHands()` (empty and `Vitals.canGrip`). A body with fewer hands than the mode asks gives
  all it has. ⚠ Only hand-slot occupants are *held*: a thing W0's `receive` landed loose in the
  body is not, until W4.
- **D21-b** — `clearanceRefusal` is async (it awaits `ensureShape()` on held things and loads
  the plan's modes). Reasons: `too-big-for-way` (facts `lower` · `pack` · `dismount`),
  `held-too-big`, `wont-turn` (with `lengthM`), `cart-too-big`; `Exit.canTraverse` words them
  (gate `clearance`). The suggested mode is the highest-profile, then fastest, lower mode the
  body can engage and the way admits — so `stoop` beats `sneak` at a low door. With a pack and
  no mode that fits it: *"You'd have to crawl, and your canvas backpack won't go through —
  `remove backpack`, then `crawl north`."* A standing body is not turned on its side; a
  lengthwise one may be either way round.
- **D21-c** — The ceiling read is `Creature.acceptPosture(posture)`, not `Posed`'s: on `Posed`
  it split the mixin into two disjoint ideas (posture held · posture allowed here) and raised
  `lint:mixin-clusters` 44 → 45. `Posed` keeps only a `getStature()` hook (`null` default;
  `Creature` answers the species'), which the water reads too. `StandController` asks it first,
  on both the host and the no-host path.
- **D22-b** — A holder keeps the water out only SHUT: `Sealable && !isOpen()` and
  `closureLevel() ≥ liquidTight`. A `Bulkable`'s `closure` says it holds water IN (an open
  bucket is liquid-tight), not that it has a lid.
- **D22-c** — Wading by stature is `WaterPlace.stateFor(body)` (depth ≤ `stature ×
  WADE_FRACTION`); the place's own `stateNow()` keeps the `water.column.wadeM` dial for
  everything with no body in it (the column's bands, the shore's words, a compartment). The
  water floor bears by `stateFor`; the over-your-head gate reads it. A body with no stature
  reads the place. ⚠ Wetting the body's share below the water line is NOT built: body parts
  carry no heights. Deferred to W6 with the pond.
- **D35-b** — `'awkward-load'` on `run` waits for W4's awkwardness, as the plan allowed.

### Perceiving and the lens

- **D23 — MQL names things the same for every viewer; perception is applied only where
  a result is bound or shown.** ⭐ The owner's principle (2026-11-11): *MQL stays simple —
  the things and the interfaces make the determinations; MQL only asks them, passing
  whatever information they need (the asker).* So the engine holds **no perception rule
  of its own**: any viewer-dependence is a method on the object that MQL calls with the
  asker as an argument (`getKeywords(viewer)` — the object decides what it answers to),
  or a surface's call to `PerceptionApi.perceived`. ⛔ The MqlApi surface stays
  `resolveOne` + `resolveMany`; the ordinal travels as a field on the result type, never
  a new function. The resolver returns, for any non-system giver, exactly
  what it returns in system mode (`commandGiver: null`). Concretely, in
  `$S/api/mql/**` and `MqlLogic`: `visibleInside`/`visibleInsideDeep` yield
  `getContents()`/`getDeepContents()` for everyone; **`pushDirect`'s per-candidate
  `perceives` gate is removed**; `resolveOne`/`resolveMany` apply no viewer filter; the
  `visible` predicate keeps only its class half (`MixinApi.isVisible` — *is a Visible
  thing*) and loses its `perceives` clause; the pronoun-class words (`me`, `here`,
  `me:e`, `it/them`) stay viewer-bound because the word is the asker's, and so does
  keyword **matching** through `perceivedKeywordsFor(viewer)` (what the viewer calls a
  thing is the belief store's word, not a hiding — decided by the owner, 2026-11-11:
  names are the asker's, held on the object as `getKeywords(viewer)`). The head ordinal (`2nd knife`) stops being rewritten to an index inside the
  resolver (`desugar.ts:189–210`): `resolveMany` returns it as result metadata
  (`MqlManyResult.ordinal?`) and every surface applies it **after** `perceived`, so an
  ordinal never counts a covered thing; the chain index `:[n]` stays universal (it
  indexes the same list for everyone, and the surface then hides what is not perceived).
  **The one named filter** is `PerceptionApi.perceived(viewer, list): Stuff[]` (a static
  over `perceives`, order-preserving); `PerceptionApi.perceivedHow` labels (D25). The
  surfaces, each calling it, each counted by `lint:perceived-surfaces`:
  1. **the binder** — `CommandLogic.walkScopes` filters each scope try's candidates with
     `perceived(giver, …)` **before** `strictCandidates`/`applyCardinalityPolicy`, then
     applies the ordinal, then `stuff[0]`/error/`promptMqlObject` over the filtered list —
     so *"get knife from Bob"* with one knife in Bob's hand and one in his pocket binds the
     hand's knife and never asks *which one?*; with none perceived it fails to bind exactly
     as for a Bob with no knife. "Nearest perceived wins" is the scope tries' order
     (`person` → `here` → `peers`) and, inside `person`, the tier order hand · ready ·
     packed, which the scope walk orders **universally** (D17) — perception only removes
     candidates, never re-orders them;
  2. the `query` and `find` controllers (`QueryController` after binding its `set`;
     `FindController` over its rows);
  3. the script `( )` island (`$S/lib/script/Expression.ts` — `evaluate` filters the
     `StuffList` by the actor, then the ordinal; a `Value` holding Stuff is built from the
     filtered list);
  4. the MQL subscription projection that feeds the cards (`MqlSubscriptionRegistry.
     resolveByQuery` result → `perceived(giver, …)` before `projectStuffInto` and before
     the diff, so an unperceived id never reaches the wire; the subject-bound path keeps
     its `perceives`), and `CardRegistry`'s query source;
  5. autocomplete — none exists today (§ Grounding); the plan names the rule it will obey
     (§ Deferred seams) and the lint will count it when it appears;
  6. `look` (`observePlace`'s `ROOM_LISTING` result and `observeThing`'s holds),
     `inventory`, and the card reads (`Container.contents`, `Attired.worn`, the
     inspection card's segments).
  `visibleContentsOf` becomes a **grouping** of an already-perceived list (worn/held/
  inside by slot) and loses its person/pockets rule. The client's `HereList` suppression
  for agents (`CardBodies.tsx:1594`) goes: the wire already carries only what is
  perceived. mql.md § *Descending a holder…* is rewritten to say the reverse, with the
  date; mql-grammar.md says `visible` is a class word. ⚠ Removing `pushDirect`'s gate
  means a concealed trap is *named* by the resolver for everyone; every surface above
  hides it, and a verb that binds it refuses on reach or on the act — `binder.perceived.
  test.ts` pins that no surface leaks it.
- **D24 — `perceives` gains the holder rules, in this order** (`perceivesImpl`): (0) the
  builder lens (D25); (1) the target is the viewer, or on the viewer's body at any depth
  → true (*your own things you always perceive*); (2) walk the target's container chain
  up to the viewer's enclosing place: a holder that is a **shut** Sealable whose material
  is not see-through (`lightAbsorption` present and `e^(−α·t)` over its shell ≥
  `SEE_THROUGH_T` 0.3 — glass, mesh, a net) → false; a holder that is **another person**
  → the target must be a hand occupant, or a worn occupant that is `outermostAt` its
  slot (the covering ladder), or **hung `from` a worn host** (attachments are worn on the
  outside — everyone sees the holster), or in a pocket member that is not `covered` on
  an outermost garment, or inside a hung/worn container that is itself perceived by this
  rule **and** open — an inner pocket under a coat fails at the coat, and a pocket
  member with `closes: true` (buttoned) is shut: its contents are not perceived even on
  an outermost garment; (3) the existing concealment/discovery/light rules. A cart under
  a tarp is a shut, opaque holder (D27).
  `isAnotherPerson` is the person test. `Attired.outermostAt` exists.
- **D24a — searching a body finds what its pockets cover** (owner, 2026-11-11). Reuse the
  shipped `search` (`SearchController` + `SearchActivity`, narrow-deep on a named target,
  hands slot, interruptible, awareness-graded) and concealment's per-viewer discovery:
  when `search <body>` completes on a body that **cannot resist** (dead — a `Corpse` — or
  unconscious per Vitals), every item covered on it (rule 2's person branch fails only for
  covering) is recorded as **found by the searcher** through the same discovery record a
  concealed find uses; an item also concealed must still clear `resolveSearch`'s awareness
  check. D24 rule 2's person branch admits an item **found by this viewer on this holder**.
  ⭐ **A find is cleared when the item changes holder** — the discovery record carries the
  holder it was found on (its identity path), and rule 2 admits it only while the item's
  holder is still that one; a move to another holder makes the old find inert (no sweep —
  checked on read). A conscious target refuses before the activity starts (*"Bob won't let
  you"* — an `ActRefusal` on the body, the controller words it); bound bodies and the
  conscious frisk are out of scope (policing, compulsion gate). The room narration
  (*"Mara goes through the dead man's pockets"*) is the activity's start line to witnesses.
  No new verb, mixin or record kind — the discovery record gains the holder field.
- **D25 — the builder lens is a verb and a memo, never a wizard check.** `lens on` resolves
  `AccessApi.heldExtents(giver)` once and stores it on the avatar (`Avatar._lensExtents:
  string[] | null`, runtime; re-resolved by `lens on` and cleared by `lens off`/logout);
  `lens` alone reports. `perceives` rule 0: viewer's `lensExtents()` non-null and the
  target's enclosing place's template path starts with one of them → perceived.
  `PerceptionApi.perceivedHow(viewer, target): 'plain' | 'builder' | null` lets a surface
  label a line `[builder]`; `look`, `inventory`, `query`, `find` label. Another player's
  body is never inside your extent for this rule (rule 2's person test runs first on a
  person; the lens applies to content, not people — Non-goals).

**Decided while building W3** (beyond D17, D23–D25):

- **D17-b** — *"`reachable` = `canReach` membership"* is read as **membership pool +
  the object's refusal**: `PerceptionApi.reach` lists the person's WHOLE carried tree
  (shut boxes and the packed pack included) so the binder can bind the nearest perceived
  thing and the verb can say why it cannot be touched; `canReach`/`reachableAmong` =
  member (not `around`) AND `Containable.reachRefusal(actor) === null`. The room stays
  top level + one level into OPEN things (a shut glass jar standing in the room keeps
  its contents out of the pool — literal D17).
- **D17-c** — The tier read is `PerceptionApi.tierOf` (`PerceptionLogic.tierOfImpl`),
  exposed so W4's `Carrying.tierOf` can replace it in one place. W3 interim: a thing
  loose in the carrier's contents (today's carrying) is `ready`; inside a non-`back`
  worn/held container → `ready`; inside a container in the slot named **`back`** →
  `packed`. A slot occupant that is not in the body's contents (an installed aug) is
  emitted first, `attached`. `reachRefusal('packed')` reads the actor's `back`
  occupants and is checked before the lid at the same holder.
- **D17-d** — A mid-chain anchor is read from outside by scope-walk's
  `candidatesHeldBy(anchor)` (occupants + `Container.getReachableContents()`, which is
  now one level into open things for ANY holder, a body included). Which things answer
  depends on the anchor only; the asker only names them.
- **D17-e** — The `canReach` validator asks the object's refusal FIRST (its words:
  *"X is shut."* / *"X is on your back — take it off first."*), then membership; a match
  that arrived through a detail or held-substance via on the room/vessel around the giver
  passes (`fill skin from sea`, `read plaque`) — needed because the 7 views that carried
  `mustNotBeShutAway` (`get`, `eat`, `drink`, `sip`, `fill`, `pour`, `read`) now carry
  `canReach`'s membership too.
- **D23-b** — `MqlContext.attention` is deleted with `pushDirect`'s gate; the `wary`
  brain names `peers:living` and keeps what `PerceptionApi.perceives(host, x,
  alertness)` admits.
- **D23-c** — `PerceptionApi.perceived(viewer, list, ordinal?)` takes the head ordinal,
  so *perceive, then pick the nth* cannot be done in the wrong order; the binder keeps
  its own index-aligned form (`perceivedOf` + `withOrdinal`, vias/tiers aligned).
  `resolveOne` applies an ordinal to the universal list (system semantics); every
  viewer surface that wants one thing calls `resolveMany` → `perceived` → first
  (subscriptions, the card source, `query`'s holder probe, the tip jar, the screen).
  MqlApi is unchanged: `resolveOne` + `resolveMany` (+ the pre-existing helpers).
- **D23-d** — Keyword matching already IS a method on the object called with the
  asker: `Stuff.perceivedKeywordsFor(viewer)` (the recognition face for a being, the
  thing's own `getKeywords(viewer)` otherwise). MQL calls it and holds no rule. Not
  renamed to `getKeywords(viewer)`: that name is the Named/Perceptible OWN face the
  method reads, and collapsing them would lose disguise. Detail ids likewise
  (`getDetailIds(…, viewer)`); `obviousExitsFor(viewer)` stays the room's own read.
- **D23-e** — The binder perceives inside `scopedMany` (every try, the world-read retry,
  `--strict`'s candidates); when the name's top tier was ALL unperceived it asks once
  more with perception as the `admits` pre-filter (so a covered `knife` cannot cut a held
  `hunting knife`). The cheap no-`requires:` path is first-try-with-anything-perceived.
- **D23-f** — `lint:perceived-surfaces` reached 0 by fixing every surface plus two rule
  corrections, no allowlist: a binder `return` is a sink only in a unit whose source is
  MQL (the affordance bookkeeping in `CommandLogic` walks containment and emits to
  nobody), and a call to a same-module function whose body perceives counts as
  perceiving (one hop). `BroadcastController`'s audience is a system-mode `online`
  roster (shown to nobody). `_scopedFormFor` keeps the universal list (its `:[n]` must
  index what everyone gets) behind a `perceives(source)` check.
- **D24-b** — Rule 2's person branch is **another body = `Attired` and not the
  viewer** (a corpse included — D24a needs its pockets covered); `isAnotherPerson`
  (agent + slotted) is unchanged and still names the weight rule. Hands: the
  `Carrying.handSlots()` occupants, else a slot that accepts a Wieldable. Worn:
  outermost = first in `Attired.coveringAt` for some leaf part (a layer that covers no
  part is uncovered); a slot accepting neither a wearable nor a wieldable (an implant)
  shows nothing. `covered`/`closes` are read from `Placing.getPlacementEntry` (the
  entries W1 already widened), so W5's pocket rows activate the rule with no code.
- **D24-c** — A worn container on another body follows D24 literally (shows when open,
  hides when shut); *packed* is a REACH tier, not a perception rule. The test's
  "packed pack's contents: no" stages the rucksack shut.
- **D24a-b** — The find is `resolveSearch(viewer, scope, depth, onBody)`; the record is
  the discovery realm with `BeliefPayload.foundOn` (the holder's identity path,
  overwritten by the latest search). `Vitals.searchRefusal(by)` is the body's: a
  non-agent (a `Corpse`) cannot resist, a conscious agent refuses `'resists'`. The
  witnesses' line: *"Mara goes through the dead man's pockets."*
- **D25-b** — The lens is the avatar's act: `Avatar.lensOn()` reads
  `AccessApi.heldExtents(this)` and memoizes (none held → stays off), `lensOff()`
  clears; there is no setter (nothing can hand a character a lens it does not hold, and
  `lint:controller-mutations` stays flat). Three controllers (bare `lens` reports,
  `lens on`, `lens off` as subcommands) keep `lint:multi-act` flat; `lens.yaml` is
  afforded by `AuthorMixin`'s `self` list. Rule 0 never applies to a player avatar or
  anything on one (`PlayerApi.isAvatarStuff` up the chain).

### Pockets, gear, inventory, the flip

- **D25-c (owner review, 2026-11-12)** — The lens lives on **`AuthorMixin`**, not `Avatar`: the lens is an author's tool, the verb was already afforded by `AuthorMixin`, and a character with no author shell (a future consumer-only avatar that opts out of the authoring and labor stack) should carry none of it. `_lensExtents`/`lensOn`/`lensOff`/`lensExtents` moved to `lib/shell/Author.ts`; perception's rule 0 and the three lens controllers narrow on `MixinApi.isAuthor`.
- **D26 — a pocket is a named region offered by the garment, never an object, and the
  garment holds nothing itself.** ⚠ *The second half is superseded by W9 (2026-11-13): the
  garment IS a `Container`, a pocket is a region of it, and the pocketed thing is its contents —
  see § W9, D-W9-1. The entry fields, the names, the fit and the words below stand.* `Garment` composes `PlacingMixin` only (class default
  `placements: []` — a garment with no pockets offers nothing); a pocketed thing lives in
  the **wearer's** contents with the pair `(garment, 'left pocket')`, exactly as the ham
  lives in the room with `(hook, 'from')` (`placeOn` :242–275). `Placing.placements`
  widens from `string[]` to entries `{member: <Placement document path>, name?,
  mouth?, volumeM3?, covered?, closes?}` (a bare string stays a one-member entry, so the
  shipped rows are untouched; `getPlaced(name)` and `canPlace(item, name)` key on the
  entry's `name`, defaulting to the member's word). One new Placement **document**,
  `/platform/placements/pocket` at `$C/platform/content/placements/pocket.yaml`
  (`encloses: true`, words *in* / *into*, prose *in your {{name}}*), beside the shipped
  `in`/`on`/`from` in that directory — the one path, used the same way everywhere.
  Defaults by garment kind are the **row's**, with **realistic mouths** (the drive
  relies on a key, a coin or a matchbox fitting a trouser pocket and a mug not):
  `trousers.yaml`: `left pocket` / `right pocket`, `{member: pocket, mouth: {width:
  0.12, height: 0.035}, volumeM3: 0.0006}` (a 9 cm mug's cross-section 0.09 × 0.09 fails
  the 3.5 cm mouth; a key 0.06 × 0.025 × 0.003, a coin, a matchbox 0.05 × 0.035 × 0.015
  pass); `coat.yaml`: `left pocket` / `right pocket` outer patch pockets `{mouth: {0.16,
  0.05}, volumeM3: 0.0015}`, one **`breast pocket`** `{mouth: {0.12, 0.03}, volumeM3:
  0.0004, closes: true}` (buttoned — drive 16's cork stays in it, and floats out of an
  open side pocket), and `inner pocket` `{covered: true, mouth: {0.14, 0.03}, volumeM3:
  0.0006}`; `extends:` carries them. ⚠ Drive 3 wears a coat: the drive stages
  `/trade/tailoring/thing/coat` with `testharness hand` (a coat is not in the starter
  outfit) before `wear coat`. **Fit per member:** `Placing.canPlace(item, name)`'s default
  body runs the member fit with the entry's mouth and volume (D4) — the owner's "fit is a
  `canPlace` refusal at the chokepoint" literally (`placeOn` :262).
  **Cover:** `covered: true` (an inner pocket) is covered always; an outer pocket is
  covered when its garment is not `outermostAt` its slot (D24 rule 2). **Closes:**
  `closes: true` (a buttoned or flapped pocket) is closed for the pressing rule (D5) and
  for D24 whenever nothing is being put in or taken out — the abstraction is that a
  fastened pocket is fastened; no dynamic flap state and no button verb (the abstraction
  law: it still costs the player the choice of pocket). `put cup in coat` → `putPlanFor`'s
  offers are the garment's pocket entries by name: one is taken, several ask (*left or
  right pocket?*). `inventory` lists a garment's pockets by `getPlaced(name)`. Persistence
  is the shipped placement pair on the item (`restorePlacement`); nothing new is
  captured.
- **D27 — the modular belt: things hang from a length; one worn-container class, rows
  for the rest.** A **belt** is a `Garment` row (tanning, leather) claiming `[waist]`
  with `placements: [from]` — no belt class; its hanging length is the wearer's waist
  (D4), its bearing from leather's strength. `put holster on belt` → `putPlanFor`'s
  `from` offer → *"you clip the holster to your belt"* (the `from` document's prose,
  worded per row); `get holster from belt` takes it off; `i belt` lists what hangs and
  the room in words (`roomFor`). The same row shape is the **bandolier** and the **chest
  harness / load-bearing vest** (`[torso]`, `from`), a **pack's straps and carabiners**
  (the `Pack` rows gain `placements: [from]`, length = their own strap), the **saddle**
  (a Slotted tack row claiming quadruped `back:1` **and** `placements: [from]` — the
  saddlebags hang from it), a **key ring** (smithing, `form: round`), a **pegboard** and a
  **tool rail** (generic-objects fixtures, `from`). `Pack` (`Wearable(Slottable(Vessel))`,
  shipped) is the class of every worn or hung container: satchel/haversack/rucksack/
  frame pack (claim `[back]` or `[torso]`), **belt pouch, bumbag, purse, canteen clip,
  saddlebag, pannier — rows that claim no body slot and hang**, and the sheath/scabbard/
  holster/quiver — a `Pack` row with **`shapedTo:`** (new `Container` field: a mixin name
  or a template path the container admits, refusing `'not-shaped-for'` otherwise), an
  authored `mouth` to the item and `form: rod`; **draw-fast derives** from `shapedTo`
  being set (D16) — a holster on the belt still draws faster than a pouch on the belt.
  A **sling/lanyard** is a `Pack` row with `form: flexible`, open, claiming `[hands]`
  (wrist): `tie tool to lanyard` moves the tool into it; a dropped tethered tool is
  `receive`d back into its sling (*it swings from your lanyard*). The **headlamp** is a
  `PortableLight` row claiming `[head]` (`PortableLight` composes `Wearable(Slottable(…))`
  from this build; its two shipped rows claim nothing and wear nothing). The **tarp**
  rides the shipped `cover` act (device): a cart row that can be covered answers `cover`
  by setting its top closed and opaque for `bounds()` and D24. Tack: `pack-saddle` (a
  Slotted row on `back:1` with `from` — two panniers hang), `pannier` (`Pack`), `halter`
  (Tieable, claims `collar`). A **mule** species row (`equus/asinus-mulus`, DraftAnimal
  class, `adultMass` 400) ships in `transport`. The client's drawing of the belt is the
  client slate's — no client work here.
- **D28 — `inventory` walks the whole tree by tier.** Default: *in hand* · *ready* (each
  container with its perceived contents) · *worn* · *packed* (each container as *N things,
  M kg*) · the burden line in words (held things × awkwardness, the mount line, the
  draft). Options (`$P/cmd/inventory/inventory.yaml`, one word): `--all`, `--flat`,
  `--held`, `--ready`, `--worn`, `--packed`, `--weight` (mass and volume per thing);
  `inventory <container>` lists it; `inventory <person>` lists what you perceive on them
  (D24). `i cart` lists a hitched cart (elsewhere); the burden line shows the draft. The
  card's `contents` read returns the same perceived tree.
- **D29 — the starter kit is pockets, and the lounge has cups.** Every aspiration outfit's
  trousers (`/stuff/thing/clothes/student-trousers`) gain two `placements:` pocket
  entries (D26's trouser mouths) and the tops one or two (the field jacket four); the
  Arrival Note coin is *granted* (D-W7a) and `receive`s into a pocket.
  The lounge's bar `props:` gain three `/trade/hospitality/thing/mug` (step 1).
  **(owner, 2026-11-11)** Outfits carry what the aspiration carries — `char-gen.yaml`
  `aspirations[].outfit` gains the bag rows (grain): healer → a belt + medic's pouch,
  teacher → a satchel, guardian → an empty modular belt; something-better, founder and
  seeker → pockets only. No outfit holds a rucksack or frame pack. **Katie's intake hands
  an Eternal U daypack** (a `Pack` row in `eternal-university`, the university's mark via
  `BrandedMixin`, smaller than an expedition pack): her provisioning dialogue's effect
  offers it through `Carrying.receive` as a *handed* thing (D-W7a); if the newcomer cannot
  take it, it is placed in the provisioned dorm room instead (never lost). The
  hands-full refusal names the hand contents, what did not fit and the next command
  using the actor's own pocket names (the `receive` refusal's wording, unit-tested). A
  wiki guide `carrying` (base-library `guide/`) ships in W7's docs pass.
- **D30 — a parked cart stays put.** Already true (a cart is a room object; logout drops
  nothing *from the body*). This build adds nothing but the drive step.
- **D31 — the flip is one wave, last, and short.** W0 ships `receive` behaving as today
  and caps the callers; W4/W5 port every caller (count → allowlist only); W7 turns on
  D11's veto, retires D12's pass, flips `held`, places every persisted loose inventory on
  first load (D32), and re-words `get`/`inventory`. ⚠ W7 wants **no sibling build
  mid-drive** (their drives assume today's `get`): the build agent checks
  `./tools/wt-status` and the open MRs before W7 and says so in the MR.
- **D32 — first-load placement is code on the restore hook, never a script.**
  `Creature.onRestored()` (the `Persistable` hook; `Voyaging`/`Ship` are the precedent)
  calls `Carrying.placeLoose()`: for every content where `!Carrying.isHonest(item)`,
  `receive(item)` (hands, then pockets/packs by the setting); what finds no place goes to
  the player's **residence** — the place of `ParcelApi.heldUnitOf(this)` (every player has
  a dorm room, residence.md) — with a scene line queued to the avatar (*your crate would
  not fit anywhere on you; it is in your room*); an NPC's overflow goes to the place it
  stands in with a `DiagnosticApi.record` naming the row (the author fixes the loadout).
  `installDefaultLoadout`, `Gus`'s `CARRIED`, `Costumed.wearGarments` and `props:` into
  a body all go through `receive`. Nothing is ever destroyed or left on the floor.
- **D33 — whatever is placed on, in or from a thing travels with it** (⚠ *W9: on or from — a thing IN a
  host is its contents and travels as contents; the host-follow is the sibling pair's, D-W9-8*) (owner,
  2026-11-11: the general rule, not a garment special case). In `ContainmentLogic.
  moveCore`, after the host's own `setContainer`: every item whose placement pair names
  the moved host (`getPlaced()` over the host's **old** environment) is moved into the
  host's new environment with its pair kept — a coat taken off, given away or hung in a
  wardrobe keeps its pocketed things; a carried tray brings its cups; a belt taken off
  brings its attachments. Recursive (a cup on a tray in a pocket), one cycle guard (a
  `visited` set by stuffId), the followers' own `canAddContainable` consulted (a body
  receiving a coat admits the coat's pocketed things as placed, D11; a chest that cannot
  fit the tray's cups refuses the tray — `fitRefusal` runs on the whole bring-along
  first, so a refusal moves nothing). The host-follow move is `ContainmentApi.move` on
  each follower (witnesses fire, custody follows), issued by `moveCore` itself.
- **D34 — the comms headset is a row.** `dm` already needs nothing in hand (the implant
  confers `AetherMixin`; `requiresVerbalESP` is the gate). A **headset** is an
  `AetherImplant`-class row (`generic-objects` `/stuff/thing/gear/headset`) with
  `targetSlot: head` instead of `cranial` — the same augment, worn not implanted — so a
  character without the implant (a guest, a species that refuses one) sends a thought
  with no phone in hand. No code; W6.
- **D35 — an awkward held load limits running.** The `run` mode gate (the mode-gate
  cascade in `LocomotionLogic.canTraverseExit`) refuses `'awkward-load'` naming the thing
  when any hand occupant's `longest > stature × CARRYING_DEFAULTS.RUN_AWKWARD` (1.0) or
  its awkwardness factor (D12) exceeds `RUN_AWKWARD_FACTOR` (1.5): you walk the pole.
  Sneak and walk are not gated. W4.
- **D36 — loose, clanking gear is noise.** `Carrying.gearNoise(): 0 | 1` — 1 when any
  held thing, or any thing hung `from` a worn host, is rigid and of a material that
  rings (`Integrity`'s ring reads the material; metal rings, leather and cloth do not) —
  a sword on a belt, a lantern in hand, a key ring; a thing in a pocket or inside a
  shut pouch is 0. `LocomotionLogic.emissionAt` lifts the mode's `noiseLevel` one band
  (`quiet → normal`, `normal → loud`) when it is 1, which is what `sneak`'s detection
  edge and stealth's `modeAttention` already read. W4.
- **D37 — a guest's borrowed things return where they came from.** `Avatar.onLinkdead`
  on a guest already destructs the body; before it does, `Carrying.returnBorrowed()`:
  every content that is a **chattel with an owner other than the guest** goes back to
  its owner's keeping through the shipped estate put-back (`Estate.ts:341`'s *stood up →
  the owner's hands or their place*); the guest's own outfit (cloned at `Login.ts:350`,
  titled to nobody) is destroyed with the body as today; a thing the guest found loose
  in a room (untitled) is dropped where the guest stands. No new record. W7.
- **D38 — riding in a cart is sitting in it** (owner, 2026-11-11: `sit in cart`, not
  `mount cart`). A cart's bed is a **posture-bearing slot** like a bench's or a log's
  (`docs/subsystems/posture.md`): the transport pack's `HaulageRig` and the kernel's
  `Handcart` compose `PosturedMixin` (if not already) and their rows declare a `bed` slot
  with `postures: [sit, lie]` and a `capacity` (a wagon four, a handcart one). The shipped
  `sit`/`lie` verbs take the target (`sit in cart`, `lie in cart`); the rider is seated in
  the cart's **contents**, fits by D4's `fitRefusal` at `canAddContainable` (its envelope
  by posture), and stays because a seated body is pressed in by its seat; the rider's
  weight joins the cart's draft (the contents walk already), and the cart's move carries
  its seated riders through the shipped slot-occupant traverse ripple. `stand` gets out.
  No `Mountable` on a cart; `mount`/`ride` stay the animals'. Entering a **coach** is the
  shipped `ExitableVessel` door (its `in` exit's clearance). W6 (rows; a class
  composition in the transport pack's own `src/` only if `Postured` is absent).
- **D39 — the coach's roof rack is an `on` surface.** `coach.yaml` gains `placements:
  [{member: on, name: roof rack}]`: open, exposed (rain reaches it, D24 sees it,
  zero-g drifts it off). A row. W6.

**Decided while building W4** (beyond D9–D18, D35, D36):

- **D10-b — the `CARRYING_DEFAULTS` numbers** (the open in § Risks): `ONE_HAND_FRACTION` 0.3
  (of the holder's carry capacity — a 70 kg human: 10.5 kg one-handed, 11 kg two),
  `TWO_HAND_LENGTH` 0.6 (of stature — a 1.75 m human's 1.05 m; the 1.2 m staff takes two),
  `AWKWARD_LENGTH` 0.5, `AWKWARD_BULK` 1.0, `RUN_AWKWARD` 1.0, `RUN_AWKWARD_FACTOR` 1.5. A
  27 kg, 1.0 m gnome needs both hands past 4 kg / 0.6 m (unit-tested). A body whose carry
  capacity reads 0 (no mass yet — a fixture) is not judged by weight.
- **D9-b — a carrier's hand takes any wieldable.** `Wieldable.fitsSlot` answers yes for any
  `Carrying.handSlots()` slot: the authored claim says where `wield` puts a thing, not which
  hands may close on it — the second hand by weight, a readied compass and a lead's end all
  need it. `LineEnd` composes `Wieldable(Slottable(…))` so a hand can hold it. A body whose plan
  names no hand parts (older fixtures, a beast before W6's `canid`) has `handSlots()` empty and
  every hands gate gives it all it has; `ready` in a fight falls back to the shipped switch.
- **D11-b — `receive` without a slot still lands loose at W4** (D31: the veto, the tier walk
  and `held` flip at W7). `canReceive` already resolves D11's order dry (a free hand, else
  the worn containers ready-then-packed by `fitRefusal`, else `hands-on-cart` /
  `cannot-grip` / `nowhere-to-carry` in words), so W7 swaps one line in `receive`.
- **D11-c — the port idiom** is `if (MixinApi.isCarrying(dest)) dest.receive(x); else
  ContainmentApi.move(x, dest);` at every site whose destination may or may not be a body; the
  lint learned `inCarrierElse` (a move in the `else`/false arm of an `isCarrying(<same dest
  text>)` test is not a body move). Where the destination is typed a body (Embody's `avatar`),
  `receive` is called directly — a controller's `if` on the giver counted as a second act
  (`lint:multi-act`). Every kernel row ported: **101 → 40**, all 40 pack rows (W5). Carrying's
  own moves are D11 `allow` rows; `releaseHeld`'s is `not-body` (the place the body stands in).
- **D13-b — "going under" is a transition read in `Vitals.reconcileConditions`.**
  Consciousness is derived on read, so there is no event: the reconcile now ends by reading
  consciousness (without reconciling again) and, on a fall from conscious (dying and
  sedation read unconscious), calls `releaseHeld()`. `_wasConscious` is runtime — a restored
  body that comes back under lets go on its first read. Severance passes the severed slots to
  `releaseHeld(slots)`; a non-carrier keeps the shipped loop. The room hears it (`toSelf` only
  for a Sensor).
- **D14-b — homes are forgotten lazily.** `homeOf` drops a home when either end has left the
  body, so `drop`/`give`/a sale need no hook. `put` into a container the putter carries sets
  it (`ContainmentLogic.putPlanFor`'s completion); `bringToHand` remembers where a thing came
  from when it had no home. Persisted as `HomesSlice` ends — `{kind:'chattel', chattelId}` or
  `{kind:'path', path, templatePath}` (the first index in the body's captured order, the
  Container slice's three skips; the template path guards a path that no longer resolves);
  restored in pass 4 (`hydrateSlice`, after contents and the estate), not `onRestored`.
- **D16-b — a homeless held thing stows LOOSE until the flip** (today's carrying — it is
  still on you); `hands-full` fires when the held thing's home will not take it back. W7 makes
  the homeless case refuse too. `ready` on a thing in the room the binder let through is
  **used where it stands** whether or not it is fixed (a tape on the floor) — `not-on-you`
  only for a thing in another body — until W7, when `get` means `receive`. A thing a hand
  cannot take (not `Wieldable`) is used where it is.
- **D16-c — `readies:` on an `objects` arg readies only a single bound thing**, so a default
  that binds every tool in reach readies none. The dispatcher's step is in
  `CommandGiver._executeOne` (every dispatch path runs it, after the validators), not
  `CommandLogic.resolveModel`'s tail (which runs before the validators, so a reach refusal
  would have come second). Views: measure/analyze `tool`, read, light/douse, pour `source`,
  fill/drink `target`, shape `instrument`, fit `tool`, cut `tools`.
- **D16-d — in a fight the act does not wait for the switch.** `ready` starts the guarded
  switch (`beginWeaponSwitch(item, {seconds})`) and the readied act runs on the thing where it
  is (it is reachable); the beats are the price. The completion (`performSwap`) is the
  carrier's `bringToHand`, so a non-weapon is held and never the instrument. Holder pricing
  before W5's `shapedTo`: a non-hand slot occupant (a sheath) or a `from` clip is the draw;
  loose, an open container or a homeless put-away is a reach; a shut `Sealable` adds the
  undoing. `isCarrying` joined `lint:combat-dynamics`' physics allowlist (hands are slots).
- **D18-b — leading is decided by the far end's hands.** `crossExit` leads the body at the
  far end of a held `TetherEnd` when that body is a handless carrier in the same place (a
  diver or climber on a line walks their own way); the pre-check is `exit.canTraverse(animal,
  defaultModeFor(animal))`, the refusal reads *"The mule won't follow you: …"*, and the
  follow is `traverseWithDefault`. `Rope.tieTo` leads only a body whose plan is known and has
  no hands; the rope goes into the animal's keeping (loose — ⚠ W6's halter row should offer a
  `from` to hang it from, or the flip's veto refuses it), the halter is any worn `Tieable`.
- **D18-c — hitch keeps its reason name `hands-on-cart`** (the plan's) for the hands the
  handles take; `need = min(handedness, handSlots)`, worded by `Carrying.refusalWords`'
  `hands-needed`. `Drivable.getDriveHands()` = a hauled host's `handedness`, else
  `driveHands` (new authorable field, default 2 — reins); `driveRefusal` gates the drive in
  `LocomotionLogic.canTraverseExit` after enablement.
- **D10-c — equip.** `Carrying.wieldSlots(item, claim)` widens a claim by the hand weight takes;
  `wieldRefusal` answers `too-heavy` / `hands-on-cart` / `hands-needed`. `EquipControllerBase`
  asks them (skip reasons `heavy`, `hands`; notes `too-heavy`, `hands-needed`); a full hand
  names what holds it (the `slot-occupied` note kept); equip-all takes up what is wielded
  after what is worn (the "claimed after both hands are freed" ordering).
- **D10-d — hands by MASS; weight only on the burden line** (owner, lens 1 — *mass versus
  weight is a lesson the game teaches by being right*). `Carrying.handsFor` judges the
  thing's **laden mass** — `LoadBearing.ladenMassOf(item)`: the thing and everything in it
  (a Vessel's transmission still applies), with no gravity in it — against the holder's
  capacity, so one hand / two / too heavy read the same at 9.81 and at 0 (inertia: it still
  takes effort to stop). Before, it read the item's OWN mass — a 2 kg pack holding 13 kg took
  one hand at any gravity — and weightless an OPEN pack's load drifts out of it (W1), so a
  full pack is a shut one. The burden line and the lift gate (`wouldExceedCeiling`) keep
  weight × `gravityNow / 9.81`. And what a body wears goes through a way after it by its
  **own cross-section** (`Exit.clearanceRefusal`, after the envelope): weightless or
  lengthwise a body passes a way its pack trails behind it in, but a pack bigger than the
  gap is refused by name (`pack` — *won't go through — `remove backpack`*), however held.
- **D35-c / D36-b** — `run`'s `awkwardLoad` gate (new `TraversalGate`) is a mode-name check
  (`run`) in `LocomotionLogic.awkwardGate`; `gearNoise` lifts `emissionAt`'s `noiseLevel` one
  band (`LOUDER`), clanking = rigid and `ringSound().rings` (else a `metal` material tag).
- **W4-e — the load gauge.** Slots before the loose pass; a held (hand-slot) load × its
  awkwardness; the total and the lift gate's prospective walk × `gravityNow / 9.81` of the
  enclosing place. `PerceptionApi.tierOf` is deleted (`Carrying.tierOf` is the read;
  `PerceptionLogic.tierOfImpl` asks the carrier, a non-carrier holder's things are `ready`).

**Decided while building W5** (beyond D15, D26–D28, D33):

- **D26-b — the class default is a static, and the field starts from it.**
  `PlacingMixin.defaultPlacements` (`[on]`) is what a host whose row names nothing offers;
  `Garment` and `Pack` say `[]`. The `placements` field initializes from it, so an empty
  list is honest (*offers nothing*), never silently `on`.
- **D26-c — the pocket's primary word is `into`, `in` its secondary.** `lint:placement-words`
  refuses two members sharing a primary, and `in` is `in`'s. The secondary pass is what
  makes `put key in coat` reach the pockets — and a pack with pockets keeps `in` for its
  main compartment while `put map in side pocket` names the pocket. Prose: *"You put the
  key in the left pocket of the coat."* (the prose gets `{{ name }}`).
- **D26-d — a region's name is a word its host answers to.** `Placing.namedRegions()` (the
  entries carrying a `name`), folded into `getKeywords` (the `Detailed` pattern), and a
  `via.region` facet in `scope-walk.candidateFor` (the `via.bulk` pattern, declaration-merged
  in `Placing.ts`). `put cup in inner pocket` binds the coat with `via.region`, and
  `putPlanFor(…, {region})` takes it. A bare `pocket` binds the first pocket of the nearest
  garment (the nearest-perceived rule) — it does not ask.
- **D26-e — several regions sharing a word refuse by NAME.** `PlacementChoice` /
  `PlaceRefusal` carry `regions` when the matched offers share their primary word;
  `PutController` asks *"Which — the left pocket or the right pocket of the coat?"*.
- **D26-f — homes can be pockets.** `setHome(item, host, region?)`, `homeRegionOf`, the
  `HomesSlice` row gains `region`; `stow` puts a thing back in its pocket; `bringToHand`
  remembers a pocket (or a clip) as where the thing came from.
- **D26-g — a body presses only its pockets.** `Container.reconcilePressing` on an agent
  considers pocketed things only — a pocket has walls and a bottom, and a top when its entry
  `closes`; what leaves goes to the PLACE (never loose on the body). `pressAfterArrival` asks
  a body when the arrival is placed. A hung thing is fastened, as before.
- **D26-h — the restore re-places after re-wearing.** `PersistableLogic.restoreState`'s
  placement pass moved after the slotted pass (a worn belt's length is its wearer's waist,
  so pouches re-hang on the belt as worn), and ensures the region's MEMBER path (a pair names
  `left pocket`, not a path). ⚠ W7: a placed thing whose host is an owner-persisted
  (estate) good has no `hostIndex` in the container slice and comes back unplaced — D32's
  restore hook must cover it before the veto.
- **D27-b — `Pack` composes `Placing` too** (default `[]`): the backpack row's straps are
  `placements: [from]`, so a canteen clipped to a strap is ready while the inside is packed.
- **D27-c — the worn length.** `Garment.hangingLengthM()` worn on a `Creature` = π × the
  bare envelope's width × (`SIZE_DEFAULTS.WAIST_FRACTION` 0.9 when a claimed slot is
  `waist`); off the body, its own longest side. A 27 kg / 1.0 m gnome's belt is ≈ 0.52 m, a
  250 kg / 2.6 m ogre's ≈ 0.98 m (unit-tested as "fewer pouches").
- **D27-d — `shapedTo` is a `fitRefusal` answer**, first and size-blind: `'not-shaped-for'`
  joins `FitRefusal` (`dims` is `null` for it), so the default veto, `putPlanFor`'s
  `wont-fit` and the receive walk all see it; a template path admits that row and every row
  under it, else a mixin name. Draw-fast: `holderSeconds` and `holderSecondsInto` read a
  shaped container as the draw; a pocket is a reach (+ the unfastening when it `closes`), a
  `from` clip the draw.
- **D11-d — the receive walk is `Carrying.carryPlaces()`**: worn pockets (regions whose member
  encloses), then containers hung from (or pocketed on) a worn host, then worn containers off
  the back, then the back. `canReceive` reads it; `receive` still lands loose (W7 swaps it).
  `isHonest` is the D11 walk.
- **D28-b — the inventory's shape.** Self (a carrier): *In hand* · *Ready* (each region of a
  worn host — *In your coat's left pocket*, *Hanging from your belt* —, each ready
  container with its perceived contents, and *Loose* until the flip) · *Worn* (slot
  occupants that are not containers) · *Packed* (each back container as *N things, M kg*;
  `--all` or `--packed` opens them) · the burden line in words off `getLoadRatio` (light ·
  a fair load · well laden · heavily burdened · more than you can bear; nothing under 5%).
  `--flat` walks every perceived thing; `--weight` adds `kg, L` per thing. A `Placing` host
  that is not a container (`i belt`, `i coat`) lists each region, a named one even empty,
  and *Room left:* in `roomFor`'s words for a hanging member. A non-carrier self and
  `look in`/`query --ledger` keep the shipped ledger. The card: a garment is a `Placing`
  host, so its `placed` field groups pocketed things per named region (headed by the name);
  the `contents` read was already perceived (W3) — no wire change.
- **D33-b — the host-follow is `moveCore` recursing on itself**, not `ContainmentApi.move`
  (which would clear the pair): followers are the things in the host's OLD environment whose
  pair names it; the whole bring-along (`bringAlong`, one cycle guard) is asked of the
  destination's `canAddContainable` first, each follower on its own (not cumulatively — a
  key in a pocket takes no room of the chest beyond the coat's); a creature placed on a
  host steps off (pair cleared, stays); a host moved to `null` drops what was on it where
  it stood. So there is no `ContainmentApi.move` site to allowlist in `lint:body-moves` —
  ⚠ W7's `_receiving` flag must admit the followers (a coat handed to a body brings its key).
- **W5-gate — `lint:controller-decisions`.** The tiered inventory's arithmetic went onto the
  model (`LoadBearing.burdenWords`, `Tangible.massAndBulkWords`, `Carrying.tallyWords`), and
  its emptiness tests read `length !== 0` (an emptiness test is not a threshold; the census
  counts `> 0` as one) — 614 held, no rise. ⚠ Superseded at W7 (W7-a): that was a dodge; the
  census rule was fixed instead and the code reads `> 0` again.
- **W5-port — the 40 pack rows** take the W4 idiom; `PrescribeController` calls
  `giver.receive` directly after a thrown guard (its view `requiresEmbodied`, and an `if`
  arm calling a second mutator on `giver` read as a multi-act). `lint:body-moves` **40 → 0**
  counted; the ceiling is 0, the roster is allowlist + not-body rows only.

**Decided while building W6** (beyond D27, D29, D34, D38, D39):

- **W6-a — `Pack` composes `Sealable`, and starts OPEN** (constructor `setOpen(true)`): D22's
  *a shut canvas pack does not keep dry* and the oilskin pouch need a pack that shuts, D24's
  flap needs it, drive 14 shuts a backpack. Nothing that never shut behaves differently; a
  row may author `open: false`.
- **W6-b — the tarp rides `close`/`open`, not `cover`.** The shipped `cover` is the fire's
  banking verb (`requires: BurnerMixin`) — a cart answering it would be a second protocol
  under one word. `Handcart` (kernel) and `HaulageRig` (transport `src/`) compose
  `Postured(Slotted(Sealable(…)))` (D38's `bed` seat and the cover), start open, and
  `canClose` only under a cover lying in them — `Haulable.coverFor()`: a thing whose shape
  is `sheet` and whose material is a textile (a shirt is cloth but not a sheet). A tarp
  drapes, so the overhang refusal is skipped. The `/trade/textiles/thing/tarpaulin` row is a
  `Good` with `shape: sheet` and no box (folded; its size derives). Rows: wagon bed 4, dray
  3, sledge 2, ore tram 1, handcart 1, travois 1 (`lie` only).
- **W6-c — D39's roof rack is NOT shipped.** `PlacingMixin` refuses composition with
  `ExitableMixin` by design (`Placing.__validateComposition__`: *"put a Fitting or a Chamber
  in its contents … or write the class"*). No drive step uses it; it wants its own class
  (an outside surface that travels with an Exitable host) — a follow-up, recorded for
  `/finalize`.
- **W6-d — the halter is a class, and leading reads it.** `/trade/tanning/thing/Halter` =
  `TieableMixin(Garment)` (a garment is not Tieable, and making every garment Tieable would
  make a saddle a halter). `Carrying.halter()` = the first worn Tieable off the hands.
  `Rope.tieTo` leads a body that is handless **or wears a halter**; `Mobile.ledAnimals` the
  same — so the `canid` dog (whose mouth is a hand) is led on its collar. Unit-tested
  (`Mobile.lead.test.ts`).
- **W6-e — the headset is a class.** No code reads `targetSlot` (the implant reaches the
  cranial bay by name in `installDefaultLoadout`) and the head slot accepts only Wearable:
  `/generic-objects/thing/Headset` = `WearableMixin(AetherImplant)`, row claims biped
  `[head]`. Augments confer from any slot (`collectAugmentConferralNames`).
- **W6-f — the shield is slung by `Shield.fitsSlot('back')`, not by its claim.** A claim is
  occupied WHOLE (`wieldSlots` seats every slot it names), so `[hand:left, back]` would take
  the back on every `wield`.
- **W6-g — `greatsword` 1.15 m / 3.2 kg, `longsword` 1.0 m / 1.4 kg** (not 1.6 / 1.1): at
  D10-b's `TWO_HAND_LENGTH` 0.6 a 1.6 m blade takes two hands for every shipped species
  (draconicus 2.0 m → 1.2 m), and a 1.1 m one two for a human (1.05 m). The rows were fixed,
  not the rule. Both claim one hand; the holder decides.
- **W6-h — the arms audit** (D10). Every arms row with a length now authors `shape: rod` and
  its blade/shaft box, or the length rule could never read it (a 1 kg sword derived to a
  5 cm cube):

  | row | claim before | claim after | why |
  |---|---|---|---|
  | hunting-bow | right | **both** | by use — one hand holds, one draws |
  | flintlock-musket | both | both | by use — stock and lock |
  | spear | both | both | by use — couched as a pike |
  | warhammer | both | **right** | its two were by weight; `handsFor` decides (a human takes both by its 1.1 m) |
  | sword, oak-waster, mace, flail, fire-poker, dagger, belt-knife | right | right | one-handed by use; a gnome takes two by length past 0.6 m |
  | leather-whip | right | right | flexible, no box |
  | longsword, greatsword, flintlock-pistol (new) | — | right | the holder decides |
- **W6-i — `flintlock-pistol`** (generic-objects arms, `Launcher`, 1.2 kg, 0.35 m): the
  holster's kind; drive 6 draws a pistol from it.
- **W6-j — `shapedTo` values.** The holster names the pistol row, the quiver the arrow row,
  the canteen clip `BulkableMixin`, the sheath and the scabbard `WieldableMixin` (the census
  refuses a folder path — `/stuff/thing/arms` is no row — so the mouth and the box decide a
  knife from a sword). `lint:census` now reads `shapedTo` (clause b) and a named placement
  entry's `member` (clause g); `lint:reachability` lists `shapedTo` as a citation.
- **W6-k — the bumbag claims `[waist]`** (its own strap) instead of hanging from a belt.
- **W6-l — oilskin** is `base-library`'s `/stuff/idea/material/textile/oilskin`, `extends:`
  linen (it IS oiled linen), `waterAbsorptionCapacity: 0` against the parent's 20 (a value,
  not "not applicable"), `wetStrength: 1`, tagged `oiled` (impermeable on purpose — `WetLaw.test`'s cloth check exempts it as it does the elastomer). `lint:material-kinds` (d) **6054 → 6067**: the
  one new row's 13 gaps are linen's own unauthored fields.
- **W6-m — sizes the drive needs:** the mug (earthenware, 0.35 kg, 9 × 9 × 10 cm — it must
  fail a trouser pocket); the generic backpack (canvas, 0.35 × 0.25 × 0.55 m — drive 9's
  crawlway refuses it); every pack row authors its box (its room).
- **W6-n — statures:** draft horse (`caballus-major`) 1.75 m, pit pony (`caballus-pumilus`)
  1.2 m, mule (`asinus-mulus`, new, 400 kg) 1.5 m. ⚠ The draft horse's derived girth is
  0.82 m, so the 0.8 m paddock gate refuses it bare; the mule's is 0.58 m and passes bare.
- **W6-o — places:** `newbie-wilds`' **Old Steading** (`/world/newbie-wilds/steading`,
  `CartesianZone`), reached `northwest` from `crossroads/treeline` (the spawn). `yard` —
  east the cottage through a 0.9 × 1.4 low door (no kind), south the barn through a 1 × 2
  doorway, north the paddock through a 0.8 × 2 gate, up the lookout by `ladder`, west the
  pond; `cottage` — east the charcoal pit by `crawlway`; `barn` — up the hayloft by `stair`
  with `turn: 1.6`; `pond` (`Pool`, 2.5 m, citing a one-node `Watercourse/steading`) — west
  the reed bank. All under the sky (the cottage, barn and hayloft are roofless ruins), so lit
  by day and dark at night. Props: barn — pegboard, tool rail, long crate; yard — the mule
  (cast), its halter, pack saddle and two panniers. `newbie-wilds` gained the water,
  transport and trade-tanning dependencies.
- **W6-p — Katie's daypack** is `DormWarren.let`'s (eternal-university): the residence
  let, then `handDaypack` clones `/world/terminus/eternal/duncan-hall/thing/daypack` and
  `receive`s it when `canReceive` is null, else moves it into the new room; once per tenant
  (a second let is `already-housed`). `ProvisionController` tells the newcomer in words.
  The daypack carries no brand: `Pack` is not `Branded` and the university has no brand row.
- **W6-q — the outfits.** healer → belt + medic's pouch, teacher → satchel, guardian → belt;
  the installer (`EmbodyController` / `Login`) receives and wears each Wearable with a
  claim, so the belt and the satchel are worn and **the medic's pouch lands loose** — the
  outfit list cannot say "hang this from that".

⚠ **For W7:**
- the medic's pouch (and any unclaimed `Pack` in an outfit) needs a hanging step — the
  receive walk or the installer must hang it `from` a worn host;
- `Rope.tieLead` still puts the rope LOOSE in the animal; the halter now offers `from` —
  place it there before the veto;
- **drive 18's "the panniers won't fit" cannot fire yet**: `Creature.wornBulk` reads only
  `back`/`torso` occupants (the quadruped's slot is `back:1`), counts no container hung
  from a worn host, and adds depth (trailing), not width, upright — a laden mule is as
  wide as itself (0.58 m) at the 0.8 m gate;
- the headlamp is `switch headlamp on` (a `PortableLight` burns nothing), not `light`;
- `close handcart` needs the tarpaulin IN it first; `sit in cart` binds through `sit`'s
  `in` preposition (not driven);
- pre-existing gate failures not W6's: `lint:controller-resolution` 83 > 80,
  `lint:graph-walks` 1 > 0 (`PerceptionLogic.reachOf`), `lint:test-content`
  (`LensController.test.ts` names `/world/…`) — all from W3/W4.


**Decided while building W7** (beyond D11–D13, D31, D32, D37, D-W7a):

- **W7-a — an emptiness test is not a threshold.** `lint:controller-decisions` stopped counting
  `.length`/`.size` against 0 (or 1 in the emptiness direction) — W5 had written `length !== 0`
  to slip under it. The rule was fixed (fixture-tested), the dodge removed, the ceiling re-pinned
  614 → 508 (the measured floor, not a burn-down).
- **W7-b — the gates fixed by fixing the code.** The tiered inventory's sorting is the carrier's
  (`Carrying.carriedTiers`), so InventoryController walks no `.getContents()`
  (`lint:controller-resolution` 83 → 80); the person's carried tree is a container read
  (`Container.getCarriedContents` — breadth-first, never into another body, sandbox-scoped), so
  `PerceptionLogic.reachOf` grows no frontier beside its one-room exits read (`lint:graph-walks`
  1 → 0, no RESIDUE entry); LensController.test uses `/test/lens/…` extents. No ceiling rose.
- **W7-c — what hangs widens the body.** A thing hung `from` a worn host rides flat against the
  flank, so it stands out by its THINNEST side (authored box, else what it packs to); hung things
  go either side, so their thicknesses add (`Creature.wornBulk().sideM`, the envelope's width =
  girth + sideM). A pannier pair (0.3 m each) widens the 0.58 m mule to 1.18 m — the steading's
  0.8 m paddock gate refuses it; two belt pouches add 0.12 m to a person. A refusal told ABOUT a
  mover rides the guard's `context.about` (third person), so the leader hears *"The pack mule
  won't follow you: its canvas panniers won't go through — take them off first."* A hung thing on
  your own body names `get <it> from <host>`, not `remove`.
- **W7-d — the hang rule.** A worn container that claims no slot of this body (a belt pouch, the
  medic's pouch, a holster) ARRIVING from off the body is received onto the first worn host that
  offers `from` with room, before hands or pockets; one already on the body (`get holster from
  belt`) is taken in hand. `receive(…, { for: 'wear' })` puts a garment on by its claim, and
  `{ slots }` pins several slots (an NPC's wielded kit). The char-gen installers are one
  `receiveGranted(…, { for: 'wear' })` per outfit row — the medic's pouch hangs from the belt
  listed before it. The lead rope hangs `from` the halter (decided before anything moves; a
  tieable with no `from` has the rope received, one with nowhere refuses `no-halter`).
- **W7-e — an owned host keeps its pairs across a restart** (D26-h's gap). A pair whose host is
  an owner-persisted good is captured as `hostChattelId`; an owned good in the owner's keeping
  placed on a host records `placedOn` on its estate entry; PersistableLogic's pass 6 re-places
  both after the estate and the owned re-wear.
- **W7-f — a hand holds any good.** The drive's first step is *`get` a mug — it goes to a hand*,
  and only six classes were wieldable: `Good` and `Vessel` compose `SlottableMixin` (applied once —
  over a base that already composes it the factory returns the base, since two layers would
  redeclare its `@Final` methods), and a carrier's HAND slot takes any slottable thing whatever its
  `accepts` (the grip decides — `handsFor`). Every other slot still asks its `accepts`. A garment in
  a hand is held, not worn (`Attired.wornStack` skips hands; `equip` takes it out of the hand
  first, and a bare `wear` dresses what is held).
- **W7-g — the veto and its admissions.** `Creature.canAddContainable(item, how?)` refuses
  `loose-on-body` unless the thing arrives PLACED (`how.placed`, passed by `placeOn` and by D33's
  followers — no flag needed for either), is an agent, or the body is admitting it
  (`Carrying.admitWhile`, gated `AnyOf(SelfOnly, FromModule(PersistableLogic#PersistableLogic))` —
  `receive`, `seatInSlot`, readying, the restore's `restoreItem`). Taking a placed thing off its
  host into the same body (`move(key, me)` with the key in my pocket) asks the veto too — it was a
  way to loose. ⭐ **A body whose plan is not known yet is not judged** (the D18-b precedent): it
  takes a thing as the pre-flip body did and the veto admits it — a fixture, a body mid-mint.
- **W7-h — `receive` is one resolution** (`resolveReceive`, which `canReceive` reports, so the dry
  run and the act cannot disagree): already in hand → nothing; the hang rule; a stack that meets
  its like (in a hand, a pocket or a ready container) merges and takes no hand; then `carry.order`
  between a free hand (or two, by `handsFor`) and the first carry place that fits (never itself or
  something inside it); else `too-heavy` / `hands-on-cart` / `cannot-grip` / `nowhere-to-carry`.
  The hands-full words are the tutorial: *"Your hands are full — the mug and the lantern — and the
  map won't fit in your pockets. Put something away (`put mug in left pocket`) or set it down
  (`drop lantern`)."*
- **W7-i — the idioms (D-W7a) as three methods.** `receiveOrSetDown(item, at?)` — made, inherited
  and served-to-you things (crafting output, yields, a catch, the pieces a cut or a tear leaves, a
  drink made for you, a store's paid-out goods, a stall given up): received, else set down on `at`
  or where the body stands, with a line, never refused after the inputs are spent (the bench
  argument is unused by the ported sites — they set down where you stand). `canReceive` before any
  write — `buy` (the counter and the consignment shelf ask before `settleSale`: *"…stays on the
  shelf until you have one free. Nothing is charged."*), `give` (*"… has nowhere to take it — their
  hands are full. You keep it."*), `put X in <person>`, reclaiming from a rack or shelf, a store
  withdrawal, untying a rope/line end/air bag, a tip jar. `receiveGranted(item, opts?)` (async) —
  loadouts, outfits, Gus, `props:` into a body, a minted key, a bank card, a travel card, the
  testharness hand, a claim ticket, a store receipt, and CASH the ledger has already moved
  (`dispenseCoin`/`moveCoins` — granted, not handed: the ledger post precedes the coins, so a
  pre-check belongs to the ledger, a follow-up): received, else the residence (a live room at the
  leased unit's extent, `ParcelApi.heldUnitOf`) with a line, else where the body stands — an NPC's
  overflow also `DiagnosticApi.record`ed. ⚠ The residence is found only when its room is live (no
  load-on-use stand-up from the kernel); otherwise the thing is set at the player's feet, said so.
- **W7-j — D32/D37.** `Creature.onRestored → placeLoose()` (each loose thing out of the body, then
  `receiveGranted`); `Carrying.returnBorrowed()` before a guest is reaped: a good titled to someone
  else to its owner's hands (else set down where they stand), anything untitled the guest held or
  pocketed dropped where it stands, what it wears reaped with it.
- **W7-k — `held` and `worn` after the flip.** LoadBearing: hand slots at `HELD_SURCHARGE` (×
  awkwardness), every other slot at 1.0, everything else on the body (placed) at the worn floor;
  pass (a)'s loose surcharge is gone. MQL `:worn` = a non-hand slot of a carrier; `:held` = a
  carrier's hand (a non-carrier keeps the old rule); `:carried` = on the holder and not worn (a
  hand, a pocket, hung) — so the card's `contents`/`worn` partition still covers everything.
  `ready` of a portable thing lying in the room refuses `pick-up` (*"You'd have to pick the tape up
  first (`get tape`)"*); a fixture is still used where it stands. A homeless held thing is stowed
  in the first carry place it fits, which becomes its home, else `hands-full`.

## ⭐⭐ Host placement

| what | host | what composing it claims — and why every host means it |
|---|---|---|
| `form`, `dimensions?`, `getDimensions`, `getVolumeM3`, `getPackedVolumeM3`, `foldPackingFactor` | `TangibleMixin` (on `Thing`, hence every Good, Vessel, Creature) | every tangible thing has a mass, so it has a volume and a shape; the default form is `block` and the dims derive — no host answers "no size". Not on `Stuff` (an Idea has no size); not on `Good` (a fixture and a body have sizes too) |
| `mouth?`, `bounds`, `getMouth`, `fitRefusal`, `closureLevel`, `reconcilePressing` | `ContainerMixin` | every container has sides and a way in — a chest, a bucket, a pocket, a cart, a **place** (its faces are exposure's). The veto is `canAddContainable`'s default body; `Creature` overrides it (D11). A `Placing` `on` member bounds nothing and is not a Container question |
| `canClose` overhang refusal | `SealableMixin` | a lid that will not shut on a pole is the lid's own refusal; a Sealable that is not a Container (a sealed bottle of bulk) answers ok |
| `clearance`, `clearanceRefusal`, `turn?` | `Exit` (lib base) | every way has a tightest gap; `turn` unset = unbounded. Not on `Boundary` (a door's size is one input) |
| `getCeilingHeight` fix | `Location` + `SphericalLocation` | a place under the sky has no ceiling; `ExitableVessel` keeps its interior |
| `gravityNow` memo | `AtmosphericMixin` | every atmospheric scope already resolves gravity asynchronously; the memo is the sync read of the same answer |
| `CarryingMixin` (`receive`, `ready`, `stow`, `releaseHeld`, `placeLoose`, `handSlots`, `freeHands`, `handsFor`, `tierOf`, `homes`, `carry.order`) | **`Creature`**, composed outside `Attired` and inside `LoadBearing` (it reads Slotted, BodyPlanSlots, Vitals, Container; LoadBearing reads it for awkwardness) | every creature answers *where does this go on me* — a person with hands, a dog with a mouth, a horse in its tack, a fish with *nowhere* (an honest refusal, not a "no" default: the mule and the pack-dog are first consumers). Not on `Actor`/`Agent` (a shade carries nothing); not on `LoadBearing` (the gauge is weight, not where). `Corpse` is a Thing: it does not receive |
| `canAddContainable` veto `'loose-on-body'` | `Creature` | the invariant is a body's; a corpse, a chest, a cart accept freely |
| `hands` field | `LocomotionMode` | every mode says what hands it takes; 0 is the honest default for walking |
| `BODY_PROFILE_HEIGHT` | const beside `BodyProfile` (`LocomotionMode.ts`) | a vocabulary's numbers live with the vocabulary |
| `envelope(profile)` | `Creature` | every body has a height and a girth; a mounted body adds its mount |
| `'ceiling-too-low'` on `stand` | `PosedMixin.acceptPosture` | the body's posture change is the body's refusal |
| `back` (cap 1), `waist` (cap 4) slots | the biped **plan row** | rows: the biped wears a pack and a belt; the quadruped has `back:1` already. No code |
| `canid` plan | a new plan row, `extends:` quadruped | the dog's mouth; the horse's plan is untouched |
| `Garment` + `PlacingMixin` (class default `placements: []`); `hangingLengthM` override while worn | `Garment` | every garment may offer pockets or a hanging length, and zero is the honest count (a shirt with no pockets offers no region and `put` refuses `no-such-placement` as any Placing host does; a belt offers `from`). **Not `Container`**: a garment holds nothing — the wearer does. Not on `Wearable`; not on `Good`. ⚠ **Superseded by W9** (owner ruling 2026-11-13: *an enclosing relation is containment*): `Garment` composes `ContainerMixin` with `hasInterior() === false`; a pocketed thing is the garment's contents (D-W9-1, D-W9-13) |
| `placements` entry widening (`name`, `mouth`, `volumeM3`, `covered`, `closes`) | `PlacingMixin` | every placing host may name its regions (a range's two plates, a coat's three pockets); a bare string entry is unchanged |
| `hangingLengthM`, `bearsKg`, `roomFor`, the member fit in `canPlace` | `PlacingMixin` | every placing host answers how long its hanging edge is and what it bears; a host with no `from` member never asks. One mechanism for belt, bandolier, harness, strap, saddle, ring, rail, pegboard |
| `tensileStrengthMPa` | `Material` row property | every material has a strength; unset = unbounded (a pegboard's authors need not care). Not on the belt row (the leather decides) |
| `hangs`, `fastens` | the `from` Placement document (and any pack's own hanging document) | a member's document says what the relation does; `on` fastens nothing, `in` encloses |
| `/platform/placements/pocket` | a Placement document row | the `in` family's vocabulary, one more member. ⚠ **Superseded by W9**: the document retires; a pocket entry cites `in`, and the garment is a `Container` (D-W9-2) |
| `shapedTo?` | `ContainerMixin` | any container may be shaped to one kind (a quiver, a knife block, a cup rack); unset = unshaped. Not on `Pack` only — a wall-mounted quiver is not worn |
| `PortableLight` → `Wearable(Slottable(LightSource(Switchable(Good))))` | `PortableLight` | a portable light may be worn or clipped; a row claims it or does not (the flare claims nothing). Not on `Lamp` (a hearth lantern is not worn) |
| `readies:` | `FieldDefinition` (`api/command.ts`) | one field in, three (`depth`, flags) out; read by the dispatcher only |
| `perceived(viewer, list)`, `perceivedHow` | `PerceptionApi` statics (forwarding to `PerceptionLogic`) | two statics on the Api whose job this is; the lint names the first |
| holder rules | `PerceptionLogic.perceivesImpl` | extend the one rule list (the task's instruction); no disclosure subsystem |
| `_lensExtents`, `lensExtents()` | `Avatar` (lib) | the lens is a player's, never an NPC's; `SandboxAvatar` inherits it (the test test-character) |
| `homes` capture | `Carrying.captureSlice` | the carrier persists what it knows, by index |
| settings `carry.order` | `Carrying` `static settings` | the per-character keyspace pattern (`Mobile.movement.defaultMode`) |
| `handedness` reads | `Hauler.handsOccupied` → `Carrying.freeHands` | the field exists on `Haulable`; this build gives it its first reader |
| leading | `Mobile.crossExit` conveyance region | beside the cart tow, same seam, same ordering |
| `CARRYING_DEFAULTS` | top-of-file const in `Carrying.ts` | the `LOAD_BEARING_DEFAULTS` / `Vitals` precedent — dials, not an Api |
| `canReceive`, `isHonest`, `gearNoise`, `returnBorrowed` | `CarryingMixin` | the same creature that receives answers whether it could, whether what it has is honest, what on it clanks, and what it gives back when a guest leaves |
| the host-follow (D33) | `ContainmentLogic.moveCore` | the one move chokepoint: what travels with a moved host is a property of moving, not of garments |
| `'awkward-load'` on `run` | the mode gate in `LocomotionLogic.canTraverseExit` | beside the haulage gates; the mode's own refusal |
| the noise lift | `LocomotionLogic.emissionAt` | the one reader of `bodyProfile`/`noiseLevel` already; it asks `Carrying.gearNoise` |
| the headset | an `AetherImplant` row with `targetSlot: head` | no code; the augment is the implant's |
| `Postured` + a `bed` slot (`postures: [sit, lie]`, `capacity`) | `HaulageRig` (transport `src/`) and `Handcart` | a cart's bed is a seat like a bench's; a sledge, dray and wagon all carry a seated rider honestly; the coach is an `ExitableVessel` already |
| `placements: [{member: on, name: roof rack}]` | `coach.yaml` | a row |

**The two tests, applied.** No guard re-narrows a host: `Creature.canAddContainable`
is the body's own rule about its own contents, and a Garment holds nothing (it is not a
Container, so it has no veto to narrow).
No honest "no" on most hosts: every `Tangible` has a size; every `Container` has
sides; every `Creature` answers `receive` (yes or a worded refusal, and the first
consumers include two animals); `turn` and `mouth` are optional fields whose unset
value means *unbounded* / *derived*, not *no*.

## Convention conformance

- `props:`/`cast:` for placement (D29's cups are `props:` on the bar row); no `container:`.
- Locations, not rooms: new drive places are `Location`/`Hall` rows; clearances are on
  their `exits:` entries or kind rows.
- Paths: platform rows at `/platform/<branch>/…` (Form, LocomotionMode); commons at
  `/stuff/…` (generic-objects' exit kinds, clothes, gear); trades at `/trade/<x>/thing/…`
  (tailoring's pockets, tanning's leather goods); `/system/transport/…` (mule, tack rows
  that are the transport's); classes mirror paths (`platform/idea/Form.ts` ↔
  `/platform/idea/Form`).
- Persistence per content: pockets/homes ride the body snapshot (`holder_snapshots`,
  the avatar's); gear rows are staged kinds; a parked cart in a `PersistentLocation`
  persists by the furnishing rule already; **no new collection** (`lint:schema`).
- Module scope declares; `gravityNow` resolves at `postRegister`; `CARRYING_DEFAULTS`
  is a const. Import boundary: no `fs`; pack `src/` imports the kernel by specifier only
  (the tack/mule rows need no code; `canid` is a row).
- Verbs on objects: `receive`/`ready`/`fitRefusal`/`clearanceRefusal` are methods;
  `PerceptionApi.perceived` is a pure query static (not `XApi.verb(host, …)`).
- `lint:object-verbs` 0; `lint:lib-statics` — add no lib statics (`Dimensions.ofForm` is
  a value-object constructor: check the ceiling before committing W1, name the caller
  audit if it must rise); `lint:closed-vocabularies` — forms are rows, no new enum
  (`BODY_PROFILE_HEIGHT` keys an existing one).
- **P3** refuse/skip/throw: every refusal is an `ActRefusal` with a reason the verb
  words; a programmatic bad move throws `ContainmentError`; an authored prop that does
  not fit an enclosed place records a diagnostic and is not placed; `setForm` throws on
  an unknown row; `Dimensions` throws on a non-positive side.
- **P4** no duck typing: packs read `Carrying` via `MixinApi.isCarrying`; the tarp rides
  `cover`'s existing protocol; no `?.()` on names nobody declares.
- **P5** the mixin decides: `Carrying`, `Container.fitRefusal`, `Exit.clearanceRefusal`,
  `Posed.acceptPosture` decide; controllers word.
- **P6** per content: above.
- **P7** load on use: a `form` is an identity ref resolved when read; a part's volume
  follows the line's `template` path; `lensExtents` resolves at `lens on`; no boot entry
  is added anywhere (the five Form rows are platform-pack rows, resident like
  LocomotionMode's).
- **P8** names: `Carrying` (what the creature does), `stoop`/`crawl` one word each,
  `lens` one word; **no new carrying classes** (`Pocket`/`Pouch`/`Sheath`/`WornLight`/
  `Belt` withdrawn) — the new classes are `Form` (an Idea row's class) and the three
  thin controllers `Stoop`/`Crawl`/`Lens`;
  `HELD_SURCHARGE` renames the loose dial at the flip; `Dimensions` not `Size`
  (`getSizeScale` exists on Location with another meaning).
- Gates this build must pass: `lint:family` in full, specifically `lint:instanceable`
  (new classes have rows; `/lib/` is never instanced), `lint:mixin-names` (`Carrying`
  added to `Mixins`), `lint:reachability` + `lint:command-views` + `lint:one-word`
  (stoop/crawl/lens conferred, categorized, one word), `lint:on-create` (no new
  `onCreate`), `lint:anatomy` (the canid plan), `lint:locations` (the drive places'
  edges), `lint:closed-vocabularies`, `lint:lib-statics`, `lint:object-verbs`,
  `lint:imports`, `lint:module-scope`, `lint:schema`, `lint:wizard-axis`,
  `lint:test-bootstrap`, `lint:drive-scripts`, plus the two new gates.

## Waves

Stage A is kernel (W0–W5), Stage B content and the flip (W6–W7). Each wave lands at
`test:near` + touched packs' vitest + `lint:family` green, one commit
`build(size-and-carrying W<n>): …`, and the plan updated.

### W0 — the receiving act and the two censuses (D11 stage 1, D23's gate)

- `$S/lib/embodiment/Carrying.ts`: `CarryingMixin` with `receive(item, opts)` resolving
  to **today's behavior** (`ContainmentApi.move(item, this)`; `slot:` → `seatInSlot`),
  `static _mixinName = 'CarryingMixin'`, `Mixins.Carrying`, `MixinApi.isCarrying`,
  `static settings` `carry.order`. Composed on `Creature` between `Attired` and
  `LoadBearing`. The veto is **not** installed.
- `packages/server/scripts/check-body-moves.ts` (`lint:body-moves`): AST census of
  `ContainmentApi.move(x, <dest>)` sites whose `<dest>`'s static type is assignable to
  `Creature`/`Agent`/`Avatar`/`Character` or is an identifier named `giver|actor|by|
  buyer|recipient|holder|maker|host` typed as such, plus the inherit-the-container
  pattern (`getContainer()` as the destination with no `isPlace` narrowing). Ceiling =
  today's count (≈75; the fixture test sees it FAIL on a planted site). Allowlist with
  reasons — **the same list as D11's**: `Carrying.ts`, `Slotted.seatInSlot`,
  `ContainmentLogic.placeOn`, `ContainmentLogic.moveCore`'s host-follow (D33),
  `PersistableLogic.restoreItem`, `ConditionLogic` death. **Every census row is tagged**
  in the script's roster (`made` · `handed` · `granted` · `inherit`, per requirements
  § Collisions *Shops…*): made = crafting/cooking/smelting output, harvest and tap
  yields, fell, butcher, a catch, the pieces a cut leaves; handed = buy, `give`,
  `serve`, trade, payment in goods, a claim ticket, a till's change; granted = the
  loadout, the Arrival Note, the bank card, a minted key, Katie's daypack; inherit = the
  `where = self.getContainer()` sites. The tag is what W4/W5's port reads to pick the
  idiom (D-W7a), and `--report` prints the roster by tag.
- `packages/server/scripts/check-perceived-surfaces.ts` (`lint:perceived-surfaces`):
  a **surface** is a function that (a) obtains a list of Stuff by `MqlApi.resolveOne|
  resolveMany`, `getContents|getDeepContents|getAllOccupants|wornStack|getPlaced`, and
  (b) binds it to a verb arg, prompts over it (`promptMqlObject|promptMqlMany`), or
  emits it to a viewer or the wire (`MessageApi.scene|toSelf`, `CardApi.open`,
  `onEnvelope`, `projectStuffInto`, a script `Value`). The census counts surfaces whose
  list does not pass through `PerceptionApi.perceived(` (or the subject-bound
  `perceives(`) between (a) and (b). Roots: `platform/idea/cmd/**`, `lib/command/**`,
  `platform/idea/api/CommandLogic.ts`, `lib/script/**`, `platform/idea/{CardRegistry,
  MqlSubscriptionRegistry}.ts`, every `read(stuff, viewer)` subscribable body under
  `lib/**`. System-mode callers (brains, logic singletons with `commandGiver: null`)
  are not surfaces — they emit to nobody — and are excluded by (b), never by an
  allowlist. Ceiling = today's count; the controller-liquidity fixture-test shape (a
  planted surface must FAIL).
- Acceptance: both gates in `lint:family --list`; `receive` round-trips in
  `Carrying.receive.test.ts` exactly as `move` did; nothing behaves differently.
- Commit: `build(size-and-carrying W0): the receiving act, behaving as today; two censuses cap the callers and the surfaces`.

**✅ Done (39d4ba23e).** `CarryingMixin` lives at `lib/slot/Carrying.ts` (`lib/embodiment/` does not exist — `lib/slot/` owns the body-side affordances), base-constrained on `Slotted` only because `Container` composes *outer* of it on `Creature`; `carry.order` is an `enum` setting. Both gates are syntax-only (a type-checked `ts.Program` costs ~95 s): `lint:body-moves` checks four heuristic rules against a hand-tagged roster keyed `file :: Class.method :: dest` (no line numbers; a stale or unrostered row fails), ceiling **101** = made 38 · handed 20 · granted 16 · inherit 27 (+4 allow, 13 not-body) — above the survey's ≈91 because of same-function duplicates and seven inherit sites the survey missed (`Mould.castInto` ×2/`mintRunner`, `ThrownLanding`, `Plant` seed-fall, `LineEnd.followLoad`, `Colony.mintDeparture`, `reembodyImpl`, `Thermal.setLump`); `get`/`untie`/reclaim are tagged *handed* (the refuse-and-move-nothing idiom). `lint:perceived-surfaces` ceiling **32** (14 controller units, 7 binder, 8 `lib/command`, `Expression.evaluate`, `Container`'s `contents` read, `handleQuery`); `PerceptionApi.perceived` does not exist yet, so W3 adds it. Surprise: stale `packages/types` dist broke `tsc` (rebuilt); the build-phase hook refuses `lint:family`, so the touched gates ran one by one.

### W1 — size (D1–D7)

- `$S/lib/spatial/Dimensions.ts`; `$S/platform/idea/Form.ts` + five rows at
  `$P/idea/Form/`; `Tangible` fields `form`/`dimensions?` + `getDimensions/getVolumeM3/
  getPackedVolumeM3/foldPackingFactor` (`Foldable` override); overrides on `Assembled`
  (Σ parts via `TemplateApi`), `Bulkable`, `Stackable`, `Creature`, `Rope`; `Buoyant.
  displacementWalk` → `getVolumeM3`; class default forms on `Garment`, `Line`, `Sack`,
  `Pack` (`flexible`) and `Sheet` (`sheet`) (`static defaultForm`), matching D1.
- `Container`: `mouth?` field, `bounds()`, `getMouth()`, `fitRefusal()`, `closureLevel()`
  (`Bulkable` override), `reconcilePressing()` (skips `fastens` members); `canAddContainable`
  default body asks `fitRefusal`; `Sealable.canClose` overhang; `putPlanFor` words
  `fitRefusal`/`canPlace` before moving (`ContainmentLogic.ts:170`'s pattern).
- `Placing`: the `placements` entry widening; `hangingLengthM()`, `bearsKg()`,
  `roomFor(name)`; `canPlace`'s default body gains the member fit (enclosing → mouth/
  volume/capacity; hanging → length/mass); `Dimensions.hangingWidthM()`; the `from`
  document gains `hangs: true`, `fastens: true`; `Material.tensileStrengthMPa` (+ values
  on the leather, hemp, canvas, steel and iron rows). The belt's **length** override on
  `Garment` lands in W5 with the garment work.
- `AtmosphericMixin.gravityNow()`; `setGravity` → `reconcilePressing` over the place's
  containers; `WaterPlace.immerseArrival` → `reconcilePressing` on the arrival;
  `Buoyant.ts:28` reads the memo.
- `Location.getCeilingHeight` null under open sky; `bounds()` on a place from
  `exposure()`; `Template.applyProps` enclosed-place diagnostic.
- `Exit`: `turn?` field (fieldMeta persistent/authorable, kind row or per site),
  `clearance()`, `clearanceRefusal(mover, mode)` (used by W2). Kind rows: generic-objects
  `/stuff/idea/exits/{crawlway,ladder}`; `stair` gains `turn`. No low-door kind.
- Tests: `Dimensions.test.ts` (sorted box, cross-section, the three rotations, the sofa
  vs the turn), `Tangible.volume.test.ts` (mass/density, assembly Σ, stack × count,
  flexible packed, folded), `Container.fit.test.ts` (the requirements' six-row table:
  shut chest refuses the pole; bucket takes a broom standing out; `on` overhangs; a
  roofed room refuses the mast; a yard lets it stand; a field takes a whale), `Sealable.
  overhang.test.ts`, `Container.pressing.test.ts` (cork up in water, cup off the table at
  zero g, a lid holds, **a thing hung `from` a hook stays at zero g**), `Placing.hanging.
  test.ts` (a rail takes hooks until its length is spent; the refusal names the rail; a
  heavy load against `bearsKg`; `roomFor` in words; an unset strength is unbounded),
  `Location.ceiling.test.ts`, `Template.props-too-big.test.ts`.
- Acceptance: the fit table passes; `look` and every existing drive are unchanged
  (no shipped row fails to fit — run `pnpm wire` on the touched packs' files and the
  boundary build's; a shipped prop that fails the enclosed-place check is a **finding**,
  resolved by sizing the row, never by widening the rule).
- Commit: `build(size-and-carrying W1): a thing has a size; a container bounds it on the sides it closes; pressed in, or it leaves`.

**✅ Done (dc645f614).** Size, fit, pressing, ceilings and clearances landed as planned, with fifteen build decisions recorded as D1-b…D8-b above (notably: Tangible's field is `shape`; a container's room is known only from an authored box, a vessel's capacity or a place's cube, so hollow shipped containers are never asked; fit tries all-sides-closed before reading a place's exposure; forms load on use via `ensureShape`). Finding: the generic clothes-line derived to a 19 cm block (two shirts) — authored 2.5 m; a static scan of every `props:` list found no enclosed place over-filled. ⚠ W2: `clearanceRefusal(mover, mode)` measures only the mover's fit box — add the envelope and the hand occupants; await `ensureShape()` at any new async seam that asks a size.

### W2 — bodies and openings (D8, D19–D22)

- `Creature.envelope(profile)`; `BODY_PROFILE_HEIGHT`; `LocomotionMode.hands`;
  `stoop`/`crawl` rows, controllers, views (`$P/cmd/movement/{stoop,crawl}.yaml`,
  `category: movement`, `scope: ["me:e:exits", …]` like `sneak`), controller seeds at
  `$P/idea/cmd/movement/{Stoop,Crawl}Controller.yaml`, **conferred by `MobileMixin.self`**;
  body plans: `locomotionModes` gain `stoop` and `crawl` on the biped, `crawl` only on
  `canid` (W6 — a dog crawls, it does not stoop), nothing on the quadruped.
- D35: the `run` gate's `'awkward-load'` refusal lands here with the mode gates (the
  `Carrying` read it needs is W4's `handsFor`/awkwardness; the gate ships in W4 if W2
  lands first — whichever wave is later carries it).
- `Exit.canTraverse` calls `clearanceRefusal` (after media, before haulage); the
  mode-gate cascade's rejection emission words it (locomotion.md § Rejection emission);
  `'hands-needed'` on the mode gate (climb 2); the crawl message narrates held things
  pushed ahead; the rider's *"you'd have to dismount"*; the led animal's and the cart's
  pass (D18's cart cross-section; the lead itself lands in W4).
- `Posed.acceptPosture('stand')` ceiling refusal. Swimmer `horizontal`; wading by
  stature (`WADE_FRACTION`); `immerseArrival` stops at `closureLevel() ≥ liquidTight`.
- Tests: `Creature.envelope.test.ts` (gnome, human, ogre; crouched/prone; mounted;
  zero-g narrowest), `Exit.clearance.test.ts` (whole face; a kind's opening; a hung
  hatch; the low door refuses walk and names `stoop`; the crawlway refuses stoop and
  names `crawl`; a pack on the back in a crawlway names the pack; the stair's turn
  refuses the sofa, the wide doorway passes it; a ladder wants two hands), `Posed.
  ceiling.test.ts`, `WaterPlace.keepsDry.test.ts` (oilskin pouch dry, canvas pack wet,
  wading by stature).
- Acceptance: every movement drive in `packages/wire` still passes (no shipped way is
  smaller than a walking body — the small-house's 2 m extent gives a 2 m face, above
  1.75; a finding otherwise).
- Commit: `build(size-and-carrying W2): bodies meet openings — stoop, crawl, the turn, the ladder's hands, the pond`.

**✅ Done (11d21e792).** Envelope, stoop/crawl, the clearance gate with its actionable refusals, the ladder's hands, the ceiling, the dry pouch and wading by stature landed; decisions D19-b…D22-c, D35-b above (notably: stoop/crawl are plan-listed modes; a way up or down is passed lengthwise; the ceiling read is `Creature.acceptPosture`; a liquid-tight holder keeps water out only shut; `WaterPlace.stateFor(body)` beside the dial's `stateNow`). Static census: no shipped way refuses a 1.75 m walking body (smallest face 2 m; doors 1×2; the 1×1 hatch only on an up/down way; ladder/crawlway kinds unused; a 2.0 m body passes a 2 m door exactly). ⚠ W4: held = hand-slot occupants only, so a removed pack lands loose and the crawl narration does not fire until `receive` puts it in a hand; `freeHands` must subtract a hitched cart's handedness; D35 is yours. ⚠ W6: quadrupeds author no stature (no mounted pair is refused — drive 18's *dismount*); the generic backpack has no material or box, so it widens no envelope (drive 9 needs its box); wading does not yet wet the parts below the water line.

### W3 — perceiving (D17, D23–D25)

- Remove the reach grammar: the list in § Grounding *Reach after controller
  liquidity* (types, parser, binder, schema, resolver, scope-walk, `PerceptionApi.reach/
  canReach` signatures, `Container.getReachableContents(rung)`, the 8 views' `depth:`,
  `refuseIfShutAway`, `mustNotBeShutAway` → folded into `canReach`'s wording, docs,
  and the four tests rewritten to the one rule). `reachRefusal` gains `'packed'`.
- The resolver made universal: `visibleInside`/`visibleInsideDeep` → contents for
  everyone; `pushDirect`'s `perceives` gate removed; the `visible` predicate's
  `perceives` clause removed; the head ordinal returned as `MqlManyResult.ordinal`
  instead of rewritten (`desugar.ts`); `mql.system-mode.test.ts` extended to pin that a
  player giver and a null giver get the same list for every seed, transform and
  predicate. `PerceptionApi.perceived`/`perceivedHow`; `perceivesImpl` rules 0–2;
  `visibleContentsOf` reduced to grouping. **The surfaces, each through `perceived`:**
  the binder (`walkScopes`, before cardinality; the ordinal after), `QueryController`,
  `FindController`, `Expression.ts`, `MqlSubscriptionRegistry.resolveByQuery` +
  `CardRegistry`'s query source, `LookController` (`observePlace`'s listing and
  `observeThing`'s holds), `InventoryController`, the `Container.contents` and
  `Attired.worn` reads, the inspection card's segments; client `CardBodies.tsx:1594`
  suppression removed (the card shows what the wire sends).
- `lens` verb (author category, `lens on|off`), `Avatar._lensExtents`; the `[builder]`
  label on `look`/`inventory`/`query`/`find`.
- D24a: `search <body>` on a dead or unconscious body records its covered items as found
  by the searcher (the discovery record gains the holder it was found on; rule 2 admits a
  find only while that holder still holds it); the conscious-target refusal; the start
  line to witnesses. Test `search.body.test.ts`: covered letter unseen → `search corpse`
  → found and takeable; a second viewer still unseen; letter moved to another holder →
  the find is inert; interrupted search finds nothing; a conscious target refuses.
- `lint:perceived-surfaces` ceiling → **0**.
- Tests: `perceives.holders.test.ts` (own things always; shut opaque box no; glass jar
  yes; another person's hand yes, outer coat yes, inner pocket no, outer open pocket's
  contents yes, packed pack's contents no; the lens inside/outside an extent), `mql.
  universal.test.ts` (**the resolver's answer to `them:I:letter` is the same list for
  the bearer, a stranger and system mode**; after `perceived`, the stranger's and a
  no-letter person's answers are identical; `query`, a script island and the binder
  agree), `binder.perceived.test.ts` (no *which one?* over a covered thing; `2nd knife`
  counts only perceived knives; a concealed trap named by the resolver reaches no
  surface), `reach.oneRule.test.ts` (hand · ready · packed · room; the lid and the pack
  refusals fire after binding).
- Acceptance: W3's unit tests above green; the controller-liquidity baseline drive still
  passes except the rows its own plan marks as reach-rung dependent (re-record those
  with the commit saying so); `lint:perceived-surfaces` at 0. (Drive steps 12–15 need
  W5's pockets and W6's rows and are W7's to run — § Acceptance-criteria coverage.)
- Commit: `build(size-and-carrying W3): MQL names things for everyone; the acts apply perception; one rule for reach; the builder lens`.

**✅ Done (d032d3edd).** The reach grammar is gone and reach is one rule (person tree in tier order, the room one level into open things; `canReach` = membership + the object's refusal, which grew `packed`; `mustNotBeShutAway` folded into the `canReach` validator). MQL is universal (raw `:i`/`:I`, no `#id`/`pushDirect`/`visible` perception, `attention` removed, the head ordinal on `MqlMany.ordinal`), and every surface passes `PerceptionApi.perceived` — `lint:perceived-surfaces` at **0** (two census-rule corrections, no allowlist). `perceives` rules 0–2, `visibleContentsOf` as a grouping, the body search, the `lens` verb and `[builder]` labels landed; decisions D17-b…D25-b above. Client `HereList` shows an agent's contents. Tests whose meaning changed are listed in the commit. ⚠ W4: replace `PerceptionApi.tierOf` with `Carrying.tierOf` (loose carried = `ready` is the interim) and keep the person-tree order in `reachOf`; the back slot's name is `back`. ⚠ W5: the pocket rows' `covered`/`closes` entries already drive perception; an outer pocket is covered when its garment is not outermost. ⚠ W7: the controller-liquidity wire step 4 still types `eat orange --top` (now an unknown flag — its `not ok` assertion holds; re-record it).

### W4 — hands, homes, readying, weight, leading; the kernel callers port (D9–D18 kernel side)

- `Carrying`: `handSlots`, `freeHands`, `handsFor`, grip refusals wording
  `Vitals.slotRefusalReason`; `tierOf`; `homes` + `captureSlice`/`onRestored`; `stow`,
  `ready`; `releaseHeld` wired to Vitals' unconscious/dying cascade and severance;
  `CARRYING_DEFAULTS`.
- `readies:` on `FieldDefinition` + schema; dispatcher call before the controller
  (`CommandLogic.resolveModel`'s tail); views: `measure`/`analyze` `tool`, `read`,
  `light`/`douse`, `pour`/`fill`/`drink` vessel, the crafting tool args (the W4 brief
  lists each view touched). Combat: `beginWeaponSwitch` generalized to any item, cost by
  shaped (`shapedTo`) vs other; `fight draw`/`fight switch` call `ready`.
- `LoadBearing`: `× g/9.81`; awkwardness on held slots; the pass-order fix (slots first)
  now, pass (a) retirement at W7. `Hauler.handsOccupied` → `freeHands`; `hitch` refusal;
  `Drivable` reads `handedness`.
- Leading in `Mobile.crossExit`; `Rope.tieTo` with a creature load resolves to its worn
  Tieable tack (the halter) or refuses `'no-halter'`; the free end `receive({slot:
  hand})`d by the tier, refusing `'hands-full'` (D18).
- `EquipControllerBase.canEquip` consults `Carrying.handsFor(item)` and a held shield:
  `wield` refuses `'hands-needed'` naming what is in the other hand (a shield, a lantern)
  when `handsFor` is 2 and only one hand is free; a shield wielded beside a two-hander
  refuses naming the two-hander; `equip` orders its steps so a two-hander is claimed
  after both hands are freed (D10, D16).
- D35 `'awkward-load'` on `run` (if W2 landed without it); D36 `Carrying.gearNoise` +
  the `emissionAt` lift (one band).
- **Port the 45 kernel callers** (the census list) to `receive`/`receive({slot})`;
  `lint:body-moves` ceiling falls to the pack count. Each port keeps today's outcome
  (the veto is still off) — this wave changes no behavior but the gauge's order,
  gravity, hands on hitch and the `readies:` draw.
- Tests: `Carrying.hands.test.ts` (two hands for the pole; a hurt hand; the gnome's
  threshold; hitched hands), `Carrying.ready.test.ts` (sheathe and draw; packed refusal;
  the bench in place; the combat beat from a holster vs a pocket), `Carrying.homes.test.ts`
  (put sets home; capture/restore by index), `LoadBearing.gravity.test.ts` (zero-g, Mars
  0.38, the water as shipped), `Carrying.release.test.ts` (unconscious drops the sword,
  keeps the belt), `Mobile.lead.test.ts` (the mule follows; its own refusal stops you).
- Commit: `build(size-and-carrying W4): hands, homes and readying; weight by the place's gravity; a held rope leads; the kernel callers receive`.

**✅ Done (0bbc7eccf).** `Carrying` has hands (`handSlots`/`freeHands` less a cart's handles/`handsFor`/`wieldSlots`/`wieldRefusal`), `tierOf` (`PerceptionApi.tierOf` deleted), homes (lazy, `put` sets them, `HomesSlice` by chattel id or contents path), `ready`/`stow`/`bringToHand`/`readySeconds`/`holderPhrase`, `canReceive`, `releaseHeld` (Vitals: going under, severance), `gearNoise`, `awkwardnessOf`, `refusalWords`, `CARRYING_DEFAULTS` (D10-b). `readies:` rides `FieldDefinition`/schema and is readied in `CommandGiver._executeOne` on eleven view args; the fight switch is any item priced by holder (new dials `combat.reach.seconds`/`combat.unfasten.seconds`); `LoadBearing` walks slots first, × awkwardness on held loads, × `gravityNow/9.81`; hitch/drive read hands; `crossExit` leads; `Rope.tieTo` leads a handless body by its halter; equip consults the body; D35/D36 landed. Every kernel caller ported — `lint:body-moves` **101 → 40** (all pack rows). Decisions D9-b…W4-e above (notably: `receive` still lands loose; a homeless held thing stows loose until the flip; a room thing is used where it stands; the act does not wait for a fight's switch; a hand takes any wieldable). `test:near` + the new suites green; full suite not run (code-complete runs it). ⚠ W5: port the 40 pack rows with the same idiom; `holderSeconds` wants `shapedTo` (a holster is the draw); pockets' placement pairs are already `ready` in `tierOf` (a placement on a non-body host). ⚠ W6: the halter row must be a worn `Tieable` and should offer a `from` for the lead rope (it lands loose in the animal today); `canid`'s mouth makes a dog's `handSlots` non-empty — check `Rope.tieTo`'s handless rule (a dog with a mouth-hand would take the end, not be led) and `crossExit`'s lead rule against it; `greatsword`/`longsword` audit reads `handsFor`. ⚠ W7: `receive` → the `canReceive` order (one line), the homeless-stow and room-`ready` relaxations end, `held` flips, pass (a) retires.

### W5 — pockets, worn containers, tiers, inventory; the pack callers port (D15, D26–D28)

- `Garment` + `PlacingMixin` (default `placements: []`) with the worn
  `hangingLengthM` override (the wearer's circumference at the slot, from D19's
  envelope); the `pocket` Placement document; `Container.shapedTo?` + its refusal;
  `PortableLight` composes `Wearable(Slottable(…))`; biped `back`/`waist` slots; `Pack`
  claim → `[back]` (the backpack row) and `placements: [from]` on the pack rows (straps);
  `putPlanFor` offers a garment's pockets by name and a belt's `from`; `Carrying.
  isHonest`, `tierOf` reading the pair; `receive`'s destination walk: a free hand, then
  pockets and hung/worn containers in tier order, then packed; `inventory <belt>` with
  the room line.
- **D33 — the host-follow in `moveCore`**: moving a `Placing` host brings every item
  placed on, in or from it into the host's new environment, pair kept, recursive with a
  cycle guard, the followers' fit checked first (nothing moves on a refusal); the D11
  veto exempts it; `lint:body-moves` allowlists it. Test `ContainmentLogic.hostFollow.
  test.ts`: remove coat → the key leaves with the coat (pair kept); drop coat → the key
  is in the room, still *in the left pocket*; give coat → the new wearer's contents hold
  the key, placed; a tray with cups into a chest too small for the cups → refused, the
  tray stays; a cup on a tray in a pocket (recursion); a cycle planted by a test → the
  guard trips.
- `InventoryController` rewritten with the option set; `inventory.yaml`; the card's
  `contents` read as the perceived tree (server side only — build-3's card renders what
  it gets).
- **Port the ≈30 pack callers** to `receive` (every touched pack's vitest green);
  `lint:body-moves` ceiling → the allowlist only.
- Tests: `Garment.pockets.test.ts` (the row's entries become offers; a coat's inner
  pocket covered; `put cup in coat` asks left or right, `put cup in inner pocket` takes;
  per-member fit and capacity; a buttoned pocket closes for pressing; the placement pair
  restores), `Placing.entries.test.ts` (a bare string entry unchanged; a named entry),
  `Garment.belt.test.ts` (a gnome's belt takes fewer pouches than an ogre's; `put holster
  on belt` then `get holster from belt`; a hung holster is ready and draws fast; the
  pouch's contents are ready; the belt overloaded refuses in words; the pouches stay on
  underwater), `Inventory.tiers.test.ts` (the default view; `--flat`; `--weight`; a
  container; a person; `i belt`'s room line), `Container.shapedTo.test.ts` (a holster
  row refuses a cup; draw fast).
- Commit: `build(size-and-carrying W5): pockets as regions of the garment, worn containers as rows, the tiered inventory; the pack callers receive`.

**✅ Done (2203bd637).** `Garment` and `Pack` compose `Placing` (class default `[]` through `PlacingMixin.defaultPlacements`); a worn garment's hanging length is its wearer (π × girth, × 0.9 at the waist); the `pocket` document (`into`/`in`); named regions are words their host answers to (`via.region`), so `put key in inner pocket` takes and `put cup in coat` asks by name; `Container.shapedTo` + `'not-shaped-for'`, a shaped holder is the draw; `PortableLight` wears; biped `back`/`waist`; the backpack on `[back]` with `from` straps; `Carrying.carryPlaces`/`isHonest`/pocket homes/`tallyWords`; a body presses its pockets (`closes` keeps the cork); D33's host-follow in `moveCore`; the tiered `inventory` with its seven options and `i belt`'s room line; the restore re-places after re-wearing. All 40 pack rows ported — `lint:body-moves` **40 → 0** counted (ceiling 0; roster is allow + not-body only). Decisions D26-b…W5-port above. Verified: server typecheck; `test:near` (1144 files / 11028 tests green except `check-controller-decisions`' ceiling, then fixed and re-run with the touched suites: 84 files / 738 tests); the 22 touched packs' typecheck + vitest and generic-objects' vitest green; the lint gates listed in the brief plus anatomy, multi-act, controller-decisions green individually. Full suite not run (code-complete runs it). ⚠ W6: pocket rows must use `member: /platform/placements/pocket` with a `name`; a pouch/holster row is a `Pack` (flexible — its hanging width is its packed matter, so give it a material; a `shapedTo` path admits that row and its subtree); the belt row claims `[waist]` with `placements: [from]`. ⚠ W7: `receive` → `carryPlaces`' first fit (one line); the flip's `_receiving` flag must admit D33's followers (moved by `moveCore` itself, not `ContainmentApi.move`); an estate-owned host's placed things lose their pair on restore (D26-h).

### W6 — gear rows, tack, kinds, places, the starter kit (Stage B content; D27, D29)

- Rows: tailoring `placements:` pocket entries on `shirt/trousers/coat/apron` and on
  generic-objects' `clothes/*` (student-trousers two, field-jacket four, white-coat two,
  greatcoat three with one inner…); tanning `/trade/tanning/thing/{belt,utility-belt,
  bandolier,chest-harness,vest}` (`Garment` rows with `placements: [from]`),
  `{belt-pouch,bumbag,purse,canteen-clip,holster,sheath,scabbard,quiver,saddlebags,
  pannier}` (`Pack` rows that hang, the shaped ones with `shapedTo` + `mouth`),
  `{satchel,haversack,rucksack,frame-pack}` (`Pack` rows that claim a slot, each with
  `placements: [from]` for its straps), `saddle` and `pack-saddle` (Slotted tack on
  `back:1` with `from`), `halter` (Tieable), `oilskin-pouch` (needs a material row
  `/stuff/idea/material/textile/oilskin`, `waterAbsorptionCapacity: 0`, in textiles);
  `tensileStrengthMPa` on the leather, hemp, canvas, iron and steel material rows;
  smithing `/trade/smithing/thing/{key-ring,headlamp}` (the ring `form: round` with
  `from`; the headlamp a `PortableLight` row, `slotClaims: {biped: [head]}`, with a
  `lantern-body` bill); generic-objects `/stuff/thing/fixture/{pegboard,tool-rail}`
  (`from` hosts); textiles `tarpaulin` (canvas, `Sheet`-class flexible cover) and the
  cart rows answering `cover`; cordage `/trade/cordage/thing/lanyard` (a `Pack` sling
  row); transport `/system/transport/agent/mule` + `/system/transport/idea/species/equus/
  asinus-mulus` + `travois` (`HaulageRig`, `draftFactor 0.25`, `handedness 2`);
  species-and-names `BodyPlan/canid` and the dog species' `_bodyPlanPath` → canid.
- Places for the drive (in `newbie-wilds`, beside the delve): a low-door room whose way
  authors its opening (`exits: north: {destination: …, opening: {width: 0.9, height:
  1.4}}` — **no kind**), a crawlway (`kind: /stuff/idea/exits/crawlway`), a turning stair
  (`stair` kind, `turn: 1.6`), a pond reach (water pack rows exist — `WaterPlaceMixin`), a
  narrow gate (`opening: {width: 0.8, height: 2}`), each lit by day and with the headlamp
  at night (R5); the lounge bar's three mugs; a general-store stock line for the belt
  pouch, satchel, oilskin pouch and headlamp (so a player can buy them).
- `char-gen.yaml` outfits gain their aspiration's bag rows (D29); the Eternal U daypack row and
  Katie's intake effect (D29).
- **The arms audit (D10)** over `generic-objects/content/stuff/thing/arms/*` (16 rows;
  three claim both hands today: `spear`, `flintlock-musket`, `warhammer`): each row's
  two-hand claim is kept only **by use** — `hunting-bow` gains the two-hand claim it
  lacks (drawing a bow), `flintlock-musket` keeps it, `spear` keeps it as a pike; the
  `warhammer`'s is *by weight* and is dropped (its 2.5 kg head decides against the holder);
  the audit's table goes in the commit. **Two new rows** for drive 7: `greatsword`
  (1.6 m, 3.2 kg — two hands by weight and length for a 70 kg body, one hand for the
  staged large body) and `longsword` (1.1 m, 1.4 kg — one hand for a human, two for a
  gnome). **The shield** (`shield.yaml`, claims `[hand:left]`) gains `back` in its claims
  so it may live slung (D16); the biped `back` slot is `accepts: SlottableMixin` (a pack
  is Wearable, a shield Wieldable — both Slottable; `fitsSlot` by claim decides). The
  drive's **large body is `homo/draconicus`** (125 kg, 2.0 m — the biggest shipped
  species) and its small one `homo/gnomus` (30 kg, 1.0 m), both staged by `testharness`.
- **Drive 11's crate**: a generic-objects row `/stuff/thing/gear/long-crate` — `form:
  block`, authored `dimensions: {width: 0.4, depth: 0.4, height: 2.2}`, `mass: 6`
  (within a human's one-hand grip by mass; two hands by length) — handed to the
  character by `testharness hand`; the turning stair's `turn: 1.6` refuses its 2.2 m, the
  wide doorway's 1 × 2 face passes its 0.4 × 0.4 cross-section.
- D34 the headset row (`generic-objects` `/stuff/thing/gear/headset`, `AetherImplant`
  class, `targetSlot: head`); D38 a posture-bearing `bed` slot on the `HaulageRig`/`Handcart`
  rows (`sit in cart`); D39 the coach's roof-rack placement entry.
- Tests: each pack's row test (`lint:instanceable` + the pack vitest); `lint:locations`
  on the new places; `lint:anatomy` on canid.
- Acceptance: `clone` of every new row succeeds in a wire smoke; `look` in each new
  place by day and by headlamp at night reads.
- Commit: `build(size-and-carrying W6): pockets on every garment, the leather goods, tack and the mule, the crawlway and the stair's turn, cups in the lounge`.

**✅ Done (34cc6119c).** Pockets on every garment row (tailoring four, generic-objects clothes eight); trade-tanning's 25 rows (belts and harnesses, hung pouches and shaped holders, slot bags, tack, the `Halter` class); oilskin, key ring, headlamp, lanyard, tarpaulin, pegboard, tool rail, long crate, headset (`Headset` class), longsword, greatsword, flintlock pistol; the mule (species + agent), the travois, statures; `BodyPlan/canid` and the dog on it; `Pack` Sealable; carts Postured + Sealable under a tarp; `Carrying.halter()` leading; the shield slung; the Old Steading in newbie-wilds; three mugs; the store's carrying line; the outfits; Katie's daypack. D39's roof rack not shipped (W6-c). Decisions W6-a…W6-q above. Verified: server typecheck; touched packs' typecheck + vitest (tanning, generic-objects, transport, terminus, eternal-university, smithing, cordage, textiles, tailoring, hospitality, ranching, mining, water); `test:near` (1147 files — 3 failures found and fixed: `WetLaw` oiled cloth, the newbie-wilds pack test's row count and its `/stuff` coverage stand-in; re-run green); every `lint:*` individually — green except `controller-resolution`, `graph-walks`, `test-content` (pre-existing from W3/W4, see ⚠). Full suite not run. ⚠ W7: see the W6 block's *For W7* list (the medic's pouch's hang, the lead's `from`, the panniers' width, the headlamp's `switch`).

### W7 — the flip (D11–D13, D31–D32)

- Pre-check and record in the plan: `./tools/wt-status`, the open MRs; no sibling
  build is mid-drive.
- `Creature.canAddContainable` veto on; `LoadBearing` pass (a) removed and
  `LOOSE_CARRY_SURCHARGE` → `HELD_SURCHARGE`; `held` predicate = hand slot; `GetController`
  → `receive` with the refusal in words (hands full and nothing fits); **D-W7a (owner,
  2026-11-11) — two idioms by counterparty:** a **made** thing (crafting/cooking/smelting
  output, harvest and tap yields, fell, butcher, a catch) goes through `receive` and, when
  nowhere fits, is **set down where it was made** — `ContainmentApi.move` onto the
  workbench (`on`, when the act ran at one) else into the actor's place — with the line,
  never a refusal after the inputs are spent; a **handed** thing (buy, `give`, trade,
  payment in goods) is pre-checked with `Carrying.canReceive(item)` **before any write,
  money included** (the retail/banking order: refusal, then the ledger), refusing in
  words and moving nothing; a **granted** thing (`installDefaultLoadout`, the Arrival
  Note, the bank card) uses `placeLoose`'s order with the residence overflow. A
  `receive` that meets a stack it can merge into takes no hand. W0 tags every census row
  made · handed · granted · inherit, so W4/W5's porting applies the right idiom per site.
  ⚠ **These idioms change behavior, and they land here, not in W4/W5**: until the flip
  every port keeps today's outcome; at W7 `buy`/`give`/`serve`/trade run `canReceive`
  before any write (a refusal leaves the purse and the shelf untouched), and a made thing
  with nowhere to go is set down with its line instead of landing loose. `Creature.onRestored
  → placeLoose` with the residence overflow and the message; NPC loadouts through
  `receive`; D37 the guest's borrowed things returned at `onLinkdead`; `lint:body-moves`
  ceiling → **0 outside the allowlist**; docs graduate (encumbrance.md's loose model
  section replaced; embodiment.md § *Hand slots are for activities, not storage*
  rewritten; spatial.md § `put`/`give` and § Placement (members with names, the
  host-follow); slot.md; mql.md; perception.md; locomotion.md; boundary.md's opening
  paragraph; new `docs/subsystems/carrying.md` and `size.md`; **the `carrying` wiki guide**
  in base-library `guide/` (hands, pockets, the tiers, readying, belts, what fits —
  linking `help`); `CLAUDE.md` one-line map entries are the sweep's).
- The drive (`packages/wire/tests/size-and-carrying.dirty.wire.test.ts`) and the walk
  (`e2e/tests/size-and-carrying-walk.spec.ts`); the soak file.
- Acceptance: the drive's **22** blocking steps pass; the suite once; every other wire
  file passes or its failure is a `get`-meaning change recorded in the commit.
- Commit: `build(size-and-carrying W7): nothing sits loose on a body — the flip`.

**✅ Done — code half (50f562ed4; pre-flip de3463905 · 09039a4d2 · 67d2820aa · 4e0bd57f4 · 75b62314c).** Pre-flip: the census rule fixed so an emptiness test is no threshold (614 → 508, the W5 dodge removed); `controller-resolution` 83 → 80 (`Carrying.carriedTiers`), `graph-walks` 1 → 0 (`Container.getCarriedContents`), `test-content` clean — no ceiling rose; what hangs widens the body (thinnest side, either flank — the laden mule refused at the 0.8 m paddock gate, the leader told *its canvas panniers won't go through*); the lead hangs from the halter, a no-slot pouch hangs from the worn belt (`receive`'s hang rule; outfits are `{ for: 'wear' }`), an owned host keeps its pairs across a restart (`hostChattelId`/`placedOn`, pass 6); a hand holds any good (`Good`/`Vessel` slottable once; a carrier's hand takes any slottable). The flip: the veto with its two admissions (arriving placed; `admitWhile`), `receive` as one resolution, the three D-W7a methods across every census site, `onRestored → placeLoose`, `returnBorrowed`, LoadBearing pass (a) retired (`HELD_SURCHARGE`), `held` = a hand everywhere (MQL `:worn`/`:held`/`:carried`, `wornStack`, equip), `get` refuses in words, `ready` refuses `pick-up` for a portable thing on the floor. Decisions W7-a…W7-k above. **Siblings at the flip** (`./tools/wt-status`, 2026-11-12): build-2 holds `build/controller-liquidity` (merged !561); build-3 `reqs/navigation` and build-4 `reqs/load-on-use` are in requirements — no sibling mid-drive. Verified: server typecheck; the 24 touched packs' typecheck; branch-wide `test:near` (1153 files / 11117 tests green); **every pack's vitest** (54, all green); **every `lint:*` individually (109, all green)**. Full suite not run (code-complete runs it). ⚠ For the drive pass: `get` is the receiving act (a hand, then a pocket or bag it fits; a no-slot pouch onto the belt) and a direct `ContainmentApi.move` onto a planned body throws `loose-on-body` — staged steps must `testharness hand` (granted: hand/pocket, else the residence when its room is live, else at the feet with a line); a body with no known plan is not judged; the residence overflow finds only a LIVE room; cash the ledger moved is granted, not pre-checked (a follow-up); `put X in <person>` is handing; Gus's vest has two pockets now; the docs graduation (carrying.md, size.md, encumbrance/embodiment/spatial/slot/mql/perception/locomotion/boundary) and the `carrying` wiki guide are the docs pass's.

### W8 — move just works; the body places what arrives; no synonym for move (owner review, 2026-11-12)

**Why.** Owner review of `lib/slot/Carrying.ts` (1,780 lines, 35 interface members): *"a camel or
hydra or blind man's elephant … something very unwieldy."* Then the constraint that decides the
shape (2026-11-12): *"if I'm a content author and I need to just move something into someone's
inventory, right now I can call `move(item, whoever)` and I don't really have to worry about
anything else. I don't want our calling conventions to have to change … a caller shouldn't have to
know every little thing is carried on the player to just put something new on them. If certain
interactions need specific UX then that belongs somewhere — maybe the command controllers … I don't
want content authors to have to memorize a rolodex of different interfaces."* And its corollary:
*"the one thing I don't want is for move to lie. If you `move(item, location)` and it doesn't end up
in location, move shouldn't be telling you it did."*

**The four rules.**

1. ⭐⭐ **`ContainmentApi.move(item, body)` is THE call, and it just works.** The destination decides
   where inside it the thing sits — as a `Placing` destination already resolves its environment and
   stamps the pair inside `move`. A body places an arrival honestly: a hand, else a pocket / a
   hook on the belt / a worn bag (by `carry.order`), else the pack on its back. Where inside is the
   destination's choice, as a Placing host's member is — not a lie; the item is on the body.
2. ⭐⭐ **`move` never lies.** When the body has no honest place for it — hands full and nothing it
   fits — `move` **throws** `ContainmentError` naming why (the body, the item, what the hands hold,
   what was tried), like every other programmatic fit violation. It never lands the thing at the
   feet or anywhere but the body. A non-carrying body (a fish, a canary) has no honest place for
   anything, so `move(item, fish)` throws: a fish's inside is a stomach, not a pocket (lens 3a — the
   fiction cannot betray itself; lens 2 — the author learns at the first call, not in play).
3. **UX lives where it is needed, and there is no synonym for `move`.** A caller that wants a
   graceful outcome asks ONE question first — `container.canReceive(item)`, **on every
   `Container`** (lens 2 + P2: every container genuinely answers *would this arrive in me* — a chest
   by its fit, a canary *nowhere to carry that*, a carrier by hand → pocket → pack; no caller narrows
   before asking) — and chooses explicitly with the two calls that exist: `move(item, body)`, else
   `move(item, <where it was made>)`. Owner: *"why do we need `deliver()`? Every time you invent a
   synonym for `move()` you're making it harder for everyone else in the game."* There is exactly one
   movement verb. The fallback lives on the **owner of the mint path** (the method that makes the
   thing), and so does any *you set it down* line — never on containment.
4. **The invariant is not the capability** (owner, earlier the same day). *Nothing sits loose on a
   body* is every `Creature`'s destination rule and fails closed; the hand/tier/ready/home
   capability composes only on the classes whose bodies carry.

**Decision (recorded): the "nowhere fits" rule.** Earlier drafts had `move(item, body)` fall through
to the body's feet with a line (today's `receiveGranted` overflow). The owner struck it: that is
`move` lying. The residence overflow keeps exactly one place — `Carrying.placeLoose()` on a
**restore**, which is the carrier's own explicit choice (`canReceive` → `move(item, this)`, else
`move(item, residence ?? here)` + the line), never `move`'s behavior. `move` bends "into this
container" only the way `placeOn` already does — the thing lands *on the destination* where the
destination says (a hand, a pocket's pair, a worn bag's inside), and nowhere else.

#### Grounding

- *"76 controllers call `refusalWords`"* was wrong: 63 are controllers' own `protected static
  refusalWords(plan)` (the shipped ActPlan pattern). The body's `refusalWords` has **9 caller files /
  12 sites** (`GetController` ×3, `EquipControllerBase:659`, `HeldGoodsControllerBase:92`,
  `HitchController:110`, `FightSwitchController:40`, `CommandGiver.ts:1855` — the `readies:`
  dispatcher, `CombatLogic.ts:4401`, `ConsignmentShelf.ts:438`). The dispatcher-side precedent for
  wording a model refusal is `lib/command/validators/canReach.ts:66-74`.
- **The chokepoint today** (`platform/idea/api/ContainmentLogic.ts`): public `move(item, to,
  placement?)` (:87) has two destination-shaped branches before `moveCore` — a `Placing` destination
  → `placeOn` (:98-105: into the host's environment, stamp the pair) and a placed thing moved into
  its own container → unplace (:110-118, with a `canAddContainable` ask when the container is a
  carrier). `moveCore` (:375) asks `canMove` / `canRemoveContainable` / `canAddContainable(item,
  {placed})` by `callHook` (:445-450), moves, then the host-follow (:438, :534) and `pressAfterArrival`.
  **The seam is a third destination-shaped branch in `move`: a body.**
- **The veto's loophole**: `Creature.canAddContainable` (`Creature.ts:706-711`) admits placed · agent ·
  `isAdmitting`, and `isAdmitting` is true whenever `isJudged()` is false — whenever the species row
  is not yet loaded (`SpeciesLogic.ts:66` is a registry read; `Organism.ensureSpecies` :275 is the
  load-on-use; `Creature.onCreate`/`onRestored` :725/:734, `Avatar.ts:844`, `DraftAnimal.ts:94` await
  it). The escape is the defect the drive kept hitting (steps 18, 21).
- **The admit paths** that must keep passing: host-follow `{ placed: true }` (:438/:450); `placeOn`
  pairs; a rider (`isAgent`); the restore (`PersistableLogic.restoreItem` :979/:994 wraps `move` in
  `admitWhile` — **only when `isCarrying(host)`**); `Slotted.seatInSlot` (:385-392, `admitWhile` the
  same way); death → corpse (a `Thing`, `ConditionLogic.ts:874`).
- **The receive family's callers** (non-test): `receiveOrSetDown` **57 files / 76 sites** — kernel
  `lib/` 21, `platform/thing/` 8, Logic 4 (`CraftingLogic:2738/5039` the exemplar), `cmd/` 2; packs
  41 sites across 22 packs (glass 5, tailoring 3, fishing 4, …). `receiveGranted` **13 files / 18 sites**
  (listed below). `canReceive` 10 files / 15. `receive` 18 files. The port idiom `isCarrying(x) ?
  x.receive(i) : ContainmentApi.move(i, x)` at every one of them.
- **Every class on the Creature branch**: `Actor = Combatant(Perception(Mobile(Engaged(Sensor(
  Creature)))))`; `Character = …Hauler(Caster(…(Actor)))`; `NPC = Props(Costumed(Behaved(Character)))`;
  `Avatar = Persistable(…Character)` → `PrimaryAvatar`, `SandboxAvatar`, `ShadeAvatar`; `Extra`, `Cast`
  (→ `Gus`, `Editor`, `TicketClerk`, `Pilot`, `Katie`/`Walter`/`Realtor`/`Tinker`), `Mercenary`; `Beast =
  Behaved(Actor)`; `lib/creature/KeptAnimal = …(Actor)` → `platform/agent/KeptAnimal`,
  `trade-ranching/WorkingAnimal`, `trade-fishing/Fish`; `DraftAnimal = Persistable(Mountable(Hauler(…)))`;
  `trade-ranching/Livestock = …(Creature)`. `Colony` is a `Thing`. Rows: Cast 102 · Extra 9 · Fish 6 ·
  WorkingAnimal 3 · DraftAnimal 3 · Livestock 2 · KeptAnimal 2 · Beast 2.
- **Body plans**: `biped` (hands; 9 wearable slots), `canid` (the mouth is a hand; 2), `quadruped` (no
  hands; 2 tack slots — `saddle`, `halter`, `pack-saddle`), `fowl`, `avian` (nothing). Species: mule,
  horses, hog, cat, wolf, sheep, cattle, goat on quadruped; the dog on canid; the canary on avian.
- Three mixins beneath Carrying ask it for hands (`Slotted.ts:444`, `Wieldable.ts:112`,
  `Attired.ts:629`); `Attired.handSites()` owns the part half. `readySeconds` prices from three
  `combat.*` dials and public holder facts. `ReachTier` ≡ `CarryTier`; the `'packed'` refusal type is
  declared twice. Two defects: `putPlanFor` renders a reason code (`said: refused.reason` →
  `PutController:259` `Mml.fromMarkup`); `Creature.onRestored` does not chain `super`.
- `lint:lib-statics` counts a `static` on a `lib/` class — the wording site is an instance method.
- `ContainmentError` (`api/containment.ts:79`) carries `message` + `cause` only.
- `lint:body-moves` (`scripts/check-body-moves.ts`, 567 lines; `lint-family.md:1396`) is the census of
  moves whose destination may be a body, kept so every site could be **ported to `receive`**.

#### ⭐⭐ The seam — `arrivalFor`, a destination-side hook the chokepoint asks

| piece | host | signature | what it does |
|---|---|---|---|
| **the hook** | `ContainerMixin` (`lib/spatial/Container.ts`), beside `canAddContainable` | `@hook arrivalFor(item: Stuff & Containable, how?: { placed?: boolean }): Arrival` where `Arrival = { kind: 'contents' } \| { kind: 'seat'; slots: string[] } \| { kind: 'pair'; host: Stuff & Placing; region: string } \| { kind: 'into'; container: Stuff & Container } \| { kind: 'refuse'; refusal: ArrivalRefusal }` | the default is `{ kind: 'contents' }` — every ordinary container takes an arrival into its contents, exactly as today. The tape measure (`canAddContainable` → `fitRefusal`) is unchanged and still runs in `moveCore` on whatever container the thing finally enters |
| **the dry read** | `ContainerMixin`, beside the hook | `canReceive(item: Stuff): ArrivalRefusal \| null` with `ArrivalRefusal = FitRefusal \| ActRefusal<'refused-by-container', { said: string }> \| ActRefusal<'nowhere-to-carry', { item: Stuff; held: Stuff[]; tried: Stuff[] }> \| ActRefusal<'too-heavy'> \| ActRefusal<'cannot-grip', { why }> \| ActRefusal<'hands-on-cart', { cart }>` — declared in `Container.ts` (Carrying's `ReceiveRefusal` is its carrier subset; `lib/spatial` cannot import `lib/slot`) | the default: `arrivalFor(item)` refused → that refusal; else `canAddContainable(item)` not ok → `refused-by-container { said }` (a `Store`'s own veto, a `Well`'s); else null. **Every container answers**; `Creature` and `Carrying` override `arrivalFor` only — `canReceive` reads it. No caller narrows `isCarrying` to ask |
| **the invariant** | `Creature` (`lib/creature/Creature.ts`) overrides | `arrivalFor(item, how)`: `how.placed` · `item.isAgent()` · `this.isSeating(item)` · `this.isAdmitting(item)` → `contents`; else `{ kind: 'refuse', refusal: { reason: 'nowhere-to-carry', facts: { item, held: [], tried: [] } } }`. **No plan escape**: `isJudged` is deleted | a body with no capability to carry has no honest place for a loose arrival. `admitWhile`/`isAdmitting` move here (gate unchanged: `AnyOf(SelfOnly, FromModule(PersistableLogic))`). `canAddContainable` on `Creature` reverts to the Container default (the tape measure) — the `loose-on-body` veto is replaced by the hook, which is asked first |
| **the seating mark** | `Slotted` (`lib/slot/Slotted.ts`) | `seatInSlot(item, slot)` (exists) and new `seatInSlots(item, slots)` (the `move` + `occupyAll` pair Carrying writes four times today) mark `_seating` for the move's duration (`try/finally`); `isSeating(item): boolean` | `Slotted` cannot import `Creature`; it marks, the body reads. A rack's mark is a no-op |
| **the capability** | `CarryingMixin` on the carrier classes, base constraint `MixinConstructor<Creature>` | overrides `arrivalFor`: the admissions → `super`; else D11's order (`resolveReceive`, verbatim): already in a hand → `contents`; a handless body handed its tack → `seat` (the claim); a hanging pouch → `pair(belt, from)`; a stack meeting its like → `into`/`contents` (merge); a free hand by `carry.order` → `seat`; the first carry place that fits → `pair` (a pocket) or `into` (a worn bag); else `refuse` (`too-heavy` · `cannot-grip` · `hands-on-cart` · `nowhere-to-carry {item, held, tried}`) | **one resolution, two readers**: `move` performs it and `Container.canReceive(item)` reports it dry, so the pre-check and the act cannot disagree. `Carrying` does not override `canReceive` |
| **the chokepoint** | `ContainmentLogic.move` (:87), a third branch | `if (to !== null && to.isAgent())`: `const a = callHook<Arrival>(to, 'arrivalFor', [item, { placed: false }])` → `contents` → `moveCore`; `seat` → `(to as Slotted).seatInSlots(item, a.slots)` (which re-enters `move` under the mark → `contents`); `pair` → `this.move(item, a.host, a.region)` (the existing `placeOn`: the body is the host's environment, the pair is stamped); `into` → `this.move(item, a.container)` (a worn bag's own tape measure); `refuse` → `throw new ContainmentError(words, { reason, facts })` | `ContainmentError` gains `reason?: string; facts?: unknown` (an existing class). The message is for the AUTHOR (*"`move`: the lantern has no place on Bob — hands hold the mug and the map; tried the coat's pockets, the satchel"*); the PLAYER's sentence is the controller's, from `canReceive` (below) |
| the unplace branch (:110-118) | `ContainmentLogic.move` | a placed thing moved into the body it already stands in asks `arrivalFor` like any arrival (a key out of a pocket goes to a hand), never a veto | the one behavior change on this branch: today it is refused; now it is placed. `get key from pocket` is `bringToHand` anyway |
| `MixinApi.isCarrying` | `api/mixin.ts:2103` | `obj is Creature & Carrying` | the 168 sites keep compiling |

**Who carries** (unchanged from the owner-agreed split):

| class | `Carrying` | why |
|---|---|---|
| `lib/character/Character` (→ every Avatar, NPC, Extra, Cast, Gus, Mercenary, the content Casts) | **yes** | a person: biped hands, pockets, belt, pack. `ShadeAvatar` inherits it as today (gated by `requiresEmbodied` elsewhere; the mortality sweep's) |
| `platform/agent/DraftAnimal` (mule, horses) | **yes** | no hands; a pack saddle with `from` — panniers hang (drive step 18) |
| `platform/agent/KeptAnimal` (dog, cat) | **yes** | the dog's mouth is a hand (`canid`); the cat answers `nowhere-to-carry` **by its plan**, not by a default |
| `trade-ranching/src/agent/WorkingAnimal` | **yes** (the pack composes the kernel mixin by specifier) | harness, pack saddle |
| `Beast`, `Livestock`, `Fish`, the abstract `lib/creature/KeptAnimal` rung, `Creature`, `Actor` | **no** | a wolf wears nothing; a hog wears a halter (seated through `equip` → `seatInSlots`) and is led by it (`Attired.wornStack().find(isTieable)`) but carries nothing; a fish has no slot that takes anything. `move(item, <any of these>)` **throws** `nowhere-to-carry` unless the arrival is placed / seated / an agent / admitted |

**What a non-carrying body answers, by lens.** `move(item, fish)` throws — no line, no feet. Lens 3a:
a fish has no pocket, and a thing "in" it would be in its stomach; lens 2: the author who staged it
learns at the call. A verb that can face one (`give`, `put X in <person>`) asks `canReceive` first —
**on the recipient as a `Container`, with no narrowing** — and the canary answers
`nowhere-to-carry` by `Creature.arrivalFor`; the controller words it from the one site (*"The canary
has nowhere to carry that"*), nothing moved.

**The fail-closed ordering** — every legitimate way onto a body:

| path | passes by | note |
|---|---|---|
| the restore (`restoreItem` :979/:994) | `host.admitWhile` — narrowed **`host instanceof Creature`** (today `isCarrying`; a hog or a fish restored with contents would otherwise throw) | before `onRestored` awaits `ensureSpecies` — needs no plan |
| `props:`/`cast:` into a body (`Template.ts:671`) | plain `move`; `Creature.onCreate` awaits `ensureSpecies` before `super.onCreate` (:725) and props mint after, so a carrier places them; a non-carrier or a full body **throws**, and the applier's existing catch records the diagnostic (as it does for a prop that does not fit a place, :660) and does not place | the loophole's one source of loose things on a fresh world |
| host-follow (D33), `placeOn` pairs, a rider | `placed` / `isAgent` | unchanged |
| `seatInSlot`/`seatInSlots` (equip, wear, a loadout, the carrier's own hands) | `isSeating` | the mark, under `try/finally` |
| a carrier's own merge into a held stack | `admitWhile` | unchanged in effect |
| death → corpse | a `Thing`'s rule | unchanged |
| a pre-flip loose inventory on a carrier | `Carrying.onRestored` (chains `super`) → `placeLoose()` — the one residence overflow, the carrier's explicit choice | `placesLooseOnRestore` moves to Carrying (Avatar's override is on a carrier) |
| loose contents on a restored non-carrier | admitted; `Creature.onRestored` records a diagnostic naming them (no such data exists — no migrations) | P3's "skip, say so" |
| a direct `move` with no species row loaded | **throws** `nowhere-to-carry` — no hands, no worn place, no escape | the loud failure P3 asks for; the drive at /finalize is the proof |

#### The callers — what reverts to plain `move`, what keeps `canReceive`

The receive family (`receive`, `receiveOrSetDown`, `receiveGranted`) is **deleted**; `canReceive`
stays. Every site reverts to `ContainmentApi.move(item, body)` unless it wants a graceful outcome:

| idiom | sites | becomes |
|---|---|---|
| **the port idiom** `isCarrying(x) ? x.receive(i) : move(i, x)` (every site below, plus the 18 `receive` files: `GetController:243/560`, `HeldGoodsControllerBase:104`, `ContainmentLogic:259`, `TipJar:85`, `LineEnd:125`, `Rope:625/669`, `Store:1005`, `Avatar:1410` (a `slot:` → `seatInSlot`), `arms.ts:64` (`slots` → `seatInSlots`), `EquipControllerBase:822` (`for: 'wear'` → `seatInSlots(claim)`), `DormWarren:225`, `AirBag:120`) | ~30 | **plain `move`**; the narrowing goes |
| **handed** — `canReceive` then the move, a write between (`GiveController:78/111`, `HeldGoodsControllerBase:91/104`, `ContainmentLogic.putPlanFor:208/259` (plan vs `onComplete`), `Rope:621/659`, `LineEnd:121`, `Store:1002`, `GetController:237/486`, `ConsignmentShelf:434` + `handOver`, `DormWarren:224`, `AirBag:116`) | 10 files / 15 | **`canReceive` + plain `move`** — unchanged shape, `receive` → `move`. The two phases are structural (an engagement, or money, between) — `receiveHanded(item, write)` with a callback was considered and rejected |
| **made** — `receiveOrSetDown(item, at?)`: a craft output, a yield, a catch, the pieces a cut leaves, a drink made for you | **73 sites in 68 minting methods** (the table below) | each wants the graceful outcome the requirements promise (*never refused after the inputs are spent*), written with the two calls that exist on the **owner of the mint path**: `if (maker.canReceive(made) === null) ContainmentApi.move(made, maker); else ContainmentApi.move(made, at ?? here)` and that owner's (or its controller's) *you set it down* line. **No `deliver`, no helper, no new name** (owner) |
| **granted** — `receiveGranted` (18 sites): loadouts `Login:352`, `EmbodyController:770`, `Character:227` (`{for:'wear'}`), `Gus:111` (`{slots}`) | 4 | `seatInSlots(garment, claim)` — *wear it* is a seating, said exactly |
| granted: a minted thing after a write — `BankingLogic:468/1948` (coins after the ledger post), `:2167` (a card), `Lock:235` (a key), `Store:883` (a paper), `HeldGoods:215` (a ticket), `tpa/ProcureCardController:35` (a card) | 7 | **`canReceive` before the write, then plain `move`** — the ledger's cash pre-check the plan deferred becomes mandatory (a thing minted after money moved must not throw); `BuyController`/`ProcureCard` word the refusal |
| granted: `Gus:123` (`prefer: 'pockets'`), `Template:671` (props), `TestHooks:676` (the harness `hand`), `DormWarren:240` | 4 | **plain `move`** (Gus's row can set `carry.order: pockets-first`; a harness `hand` that throws is the test's finding) |
| granted: `Estate:355` (an owned good re-placed on restore) | 1 | the restore path — `admitWhile` + `move`, as `restoreItem` |
| **restore** — `placeLoose` → `receiveGranted` per loose thing | 1 (Carrying's own) | `canReceive` → `move(item, this)`, else `move(item, residence ?? here)` + the line (the one overflow) |
| **unequip** — `settleReleased` (`UnequipControllerBase:311`) | 1 | deleted; the controller: `wieldy && giver.stow(target) === null`, else `giver.canReceive(target) === null ? move(target, giver) : move(target, here)` + its line |
| the `lint:body-moves` roster's `inherit`/`allow`/`not-body` rows | 44 | untouched — they were never body destinations |

**The made paths, grounded** (`grep '\.receiveOrSetDown('`, each site's enclosing method): the 73
sites sit in **68 distinct minting methods** — they do **not** collapse through shared paths. The
shared ones, where the fallback is written once and covers every act through it:

| path owner (method) | sites it covers | where the two-line fallback lives |
|---|---|---|
| `CraftingLogic.landOutput` (:2738) — every recipe's product; `consumeItemInputs` (:5039) — what an input gives back | every `craft`-resolved recipe in the game | once each, in the Logic; the *set down on the bench* line is the craft completion's |
| `Producing.mintTake` (`lib/husbandry/Producing.ts:1096`) — every tap yield; `Growing.growingPickPlan`/`landSwath` (:1125/:1291) — every harvest | every species' production, every harvest | once each, on the producing/growing mixin |
| `Mould.castInto` ×2 + `mintRunner` + `pressRelease` (4) | every cast | on `Mould` (one private fallback it calls four times) |
| `Trap.pullBy` ×3 (fishing), `Gather.crackOff` ×2 (glass), `CuttingTool.finishCut` ×2 (tailoring) | the traps, the gathers, the cuts | one private fallback per class |
| the `tear` family — `Book`, `Envelope`, `Sheet`, `Garment` (4 classes, one each) | a torn thing's halves | each class's own `tear` (no shared base; four lines each) |
| the `completeSplit` family — `Hive`, `Wheel`, `Block` (3 packs) | a split's second half | each class's own |
| the rest — 50 methods with one site each (`Burner.mintAshHeaps`, `Flued.takeSoot`, `Floor.sweepInto`, `Consumable.consume`, `Integrity.sufferImpact`, `ThrownLanding.settle`, `Line.mintEnd`, `Store.payOut`, `Thermal.setCrystals/setLump`, `Menu.orderPlanFor`, `BulkableLogic.loseReceiver`, `ConditionLogic.reembodyImpl`, `CloneController` ×2, `Plant` ×2, `Rope.cutOff`, `LineEnd.followLoad`, and 31 pack methods in 20 packs) | one act each | each on its owner — two calls and, where the act narrates, its line |

Three of the 73 were never *made*: `ConsignmentShelf.handOver` (:445) and `MarketStalls.giveUp`
(:363) are the second half of a **handed** act whose `canReceive` already ran — plain `move`; and
`Container.cleanupOnDestruct` (:695) evacuates a destroyed container's contents to its holder — a
place or a body, `canReceive` then `move`, with no line. The builder confirms each site against
the rule (*is the thing already pre-checked? is there a bench?*) as it ports; the count is the cost
of having one movement verb, and the owner chose it.

**`lint:body-moves` retires.** It was the census that found sites to port to `receive`; with `move`
honest there is nothing to port and nothing a gate could count — a direct `move` onto a body is
the way on, and a body with no place throws at run time. The script and its roster are deleted
(`lint:family` derives the roster; no list to edit); `lint-family.md:1396` gets its retirement row
(*retired W8, 2026-11-12: `move` is the receiving act*). `lint:perceived-surfaces` is untouched.

#### Host-placement — the rest of today's `Carrying` interface

| member | → | callers | new signature | why |
|---|---|---|---|---|
| `receive`, `receiveOrSetDown`, `receiveGranted`, `settleReleased`, `admitWhile`, `isAdmitting` | **gone / to `Creature`** | above | — | the arrival hook and `move` |
| `canReceive(item)` | **→ `Container`** | 10 files today; every handed and made site after | `canReceive(item: Stuff): ArrivalRefusal \| null` on `ContainerMixin` (the `opts` go) | every container answers *would this arrive in me*; the carrier's answer comes through its `arrivalFor` override, not a `canReceive` of its own |
| `handSlots`, `heldThings`, `wears` | **`Attired`** | 12 / 8 / 2 files | bodies verbatim; `wornStack`, `Slotted.fitsSlotSpec`, `Wieldable.fitsSlot` narrow `isAttired` | the body-side slot substrate's fact; three mixins beneath Carrying ask it today |
| `freeHands` | stays | 5 files | unchanged | the carrier's composite (hands ∧ empty ∧ `canGrip` − the cart's `getHandedness()`) |
| `handsFor`, `carryPlaces`, `resolveReceive` | private | 0 external | — | asked through `arrivalFor`/`canReceive`/`wieldPlanFor` |
| `wieldSlots` + `wieldRefusal` | fold | `EquipControllerBase` ×3 | `wieldPlanFor(item, claim): { ok: true; slots: string[] } \| ReadyRefusal` | one question in the `*PlanFor` shape |
| `tierOf` | stays | 10 files | unchanged; `perception.ts` imports `CarryTier` | the carrier's knowledge |
| `homeOf` + `homeRegionOf` | fold | 0 external | `homeOf(item): { host: HomeHost; region?: string } \| null` | one read |
| `setHome` | stays | `ContainmentLogic:274` | unchanged | D14 |
| `isHonest` | stays | 5 test files | unchanged | the invariant's walk |
| `ready`, `stow`, `releaseHeld` | stay | `CommandGiver:1853`, `FightSwitchController:38`, `CombatLogic:4398` / — / `Vitals:2658/3119` | unchanged (`releaseHeld`'s line stays: an event with no verb) | the carrier's acts |
| `bringToHand` | stays, returns facts | `GetController:255`, `CombatLogic:4246` | `bringToHand(item): ReadiedOutcome \| ReadyRefusal` | the sentence leaves with `putAwayPhrase`/`drawPhrase`/`holderPhrase` |
| `readySeconds` + two helpers | **→ combat** | 0 external | `CombatLogic.switchSecondsFor(actor, item)` (private module fn); `beginWeaponSwitch(target)` drops `{seconds}`; `beginSwitchImpl` drops `priced?` | the dials are `combat.*` |
| `inTheWay` (private) | public | combat | `handsToFree(item): Stuff[]` | the carrier's knowledge; combat asks |
| `awkwardnessOf` + four dials | **→ `LoadBearing`** | `LoadBearing:299`, `LocomotionLogic:340` | on the gauge; `awkwardGate` narrows `isLoadBearing` | D12's multiplier is the gauge's |
| `gearNoise` | stays | `LocomotionLogic:514` | unchanged | the body's read over its hands and belt |
| `placeLoose`, `returnBorrowed` | stay | `Carrying.onRestored` / `Avatar:1656` | unchanged | the carrier's explicit acts |
| `halter` | **delete** | `Rope:564/610`, `Mobile:1010` | `isAttired(animal) ? animal.wornStack().find(isTieable) ?? null : null` | one line over `wornStack`; now serves the haltered hog too |
| `carriedThings` | **delete** | two shopkeeping brains | `getContents().filter((x) => !wears(x))` | two public reads |
| `carriedTiers`, `tallyWords` | **→ `InventoryController`** privates | 1 each | `tiersOf`, `tallyWords` | a bucketing for one view |
| `holderPhrase` | → `FightSwitchController` | 1 | — | presentation |
| `refusalWords` (+ `nowhereWords`, `heldList`) | **→ `CommandController`** | 9 files | `public carryRefusalWords(giver: Stuff, r: CarryRefusal \| { ok: false; reason: 'nowhere-to-carry' }): string` — instance, exhaustive, `never` arm | the doctrine; the dispatcher clones the controller first; not a static (`lint:lib-statics`) |
| `putAwayPhrase`, `drawPhrase` | → `CommandController` | — | `public readiedWords(giver, out: ReadiedOutcome): { self; peer }` | beside the refusal words |
| `settings`, `captureSlice`/`hydrateSlice`, `CARRYING_DEFAULTS` (`ONE_HAND_FRACTION`, `TWO_HAND_LENGTH`), `onRestored` | stay | — | — | the carrier's |

**The `Carrying` surface after W8 — 14 members (from 35):** `freeHands` · `wieldPlanFor` ·
`handsToFree` · `tierOf` · `homeOf` · `setHome` · `isHonest` · `ready` · `bringToHand` · `stow` ·
`releaseHeld` · `gearNoise` · `placeLoose` · `returnBorrowed` — plus the `arrivalFor` override (a
hook, not interface) and `onRestored`. An author meets none of them: to stage a thing,
`move(item, body)`; to ask first, `container.canReceive(item)` — both on every container.

#### Q3 — retail, measured

`ForSale` returns worded lines (`SaleOutcome.line: Mml`, `ForSale.ts:48`): **3 implementers (one in
the `transport` pack: `HullBook`), 12 refusal sites over 6 reasons, 3 consuming controllers**. The
full reshape to facts is a cross-pack protocol change — **named debt** with that count. W8 does the
carrying half, additively: the refusal arm gains `facts?: { carry?: ReceiveRefusal }`;
`ConsignmentShelf.handOverRefusal` keeps the retail half of its line (*"… stays on the shelf. Nothing
is charged."*) and sets `facts.carry`; `BuyController` prefixes `this.carryRefusalWords`. The shelf
words no carrying sentence.

#### The sibling seams (W8g, or flagged)

Fixed: `ReachTier` → `CarryTier`; `ReadyRefusal`'s `'packed'` reuses `Containable`'s exported type;
`putPlanFor` carries `{ reason: 'refused-by-carrier', facts: { carry } }` and `PutController.refused`
words it (never `Mml.fromMarkup` of a reason code); `Creature.onRestored` chains `super`;
`CombatLogic.drawSidearm` returns `refusal?` not `words`, `FightDrawController` words;
`Creature.acceptPosture` → `poseRefusal` (collides with `Postured.acceptPosture`);
`EquipControllerBase:659` / `HitchController:110` word the refusal the body returned.

Flagged, not W8: readings in words stay (`burdenWords`, `roomFor`, `massAndBulkWords`);
`Sealable.canClose`'s built sentence; `reconcilePressing`'s narration (an event); `Exit.clearanceWords`
+ the three `LocomotionLogic` gates word `TraversalGuard.reason` (the guard contract; "hands needed"
is worded three times — a locomotion pass); one-implementer hooks `foldPackingFactor`,
`hangingLengthM`, `getStature`; `HiveBox.getVolumeM3()` (trade-apiculture) is now an **accidental
override** of `Tangible.getVolumeM3` — check before merge (B4); `bodyShows`/`uncovered` are one
body's exposure (a candidate `Attired.shows`); the ordinal arithmetic exists three times;
`Carrying.ts` could move to `lib/creature/` (≈100 imports — the sweep's).

#### Steps — independently landable, one commit each; `pnpm -C packages/server build` (tsc), `test:near`, the suites named, every touched pack's vitest, the gates the change moved

- **W8a — `move` just works.** `Container.arrivalFor` (default `contents`); `Arrival` type;
  `ContainmentError.reason/facts`; the body branch in `ContainmentLogic.move` (+ the unplace branch asks
  the hook); `Slotted.seatInSlots` + the seating mark + `isSeating`; `Creature.arrivalFor` (the
  invariant, fail-closed) + `admitWhile`/`isAdmitting` moved there, `canAddContainable` reverted to the
  tape measure, `isJudged` deleted; `Container.canReceive(item)` (the dry read; `ArrivalRefusal` declared in `Container.ts`);
  `Carrying.arrivalFor` (today's `resolveReceive`); `receive`/`receiveOrSetDown`/`receiveGranted`/
  `settleReleased`/Carrying's `canReceive` deleted; `Carrying` off
  `CreatureBase`, onto `Character`, `DraftAnimal`, `platform/agent/KeptAnimal`, `WorkingAnimal`, base
  constraint `MixinConstructor<Creature>`; `isCarrying` → `Creature & Carrying`; `restoreItem` narrows
  `instanceof Creature`; `Carrying.onRestored` → `placeLoose` (+ `placesLooseOnRestore`). **The caller
  sweep** per the table: ~30 port-idiom sites → `move`; 15 handed sites `receive` → `move` (and their `isCarrying` narrowing before `canReceive` goes);
  73 made sites → the two calls on their 68 owners (the table); 4 loadouts → `seatInSlots`; 7 minted-after-a-write → `canReceive` first; 4 → `move`;
  `Estate` → the restore path. **`lint:body-moves` retired** (script, roster, `package.json` line,
  `lint-family.md` row). Tests: `Carrying.receive.test` → `ContainmentLogic.arrival.test.ts` (*a mug
  moved onto a person lands in a hand; a second in the other; a key in a pocket; a fourth throws
  `nowhere-to-carry` naming the hands and the pockets tried; a key moved out of its pocket onto its
  owner goes to a hand*); `Creature.veto.test.ts` (*throws with no species row; passes seated, placed,
  agent, admitted; a hog restored with contents passes; `move(item, fish)` throws; a Beast, a Livestock,
  a Fish are not Carrying; a Character, a DraftAnimal, a KeptAnimal, a WorkingAnimal are*);
  `Carrying.flip.test`'s "made: set down with a line" → a `CraftingLogic.landOutput` case; "D32 restore places" unchanged;
  `Avatar.flip-restore.test` unchanged; `Template.props-too-big.test` gains *a prop into a fish is a
  diagnostic*. Gates: `lint:mixin-names`, `lint:duck-typing`, `lint:instanceable`, `lint:object-verbs` (0 — no
  Api static takes a host first; `canReceive` is a method on the container), `lint:imports`; packs: ranching, fishing, shopkeeping and the 22 made
  packs' vitest.
- **W8b — the hands are Attired's.** `handSlots`, `heldThings`, `wears` → `Attired`; `halter`,
  `carriedThings` deleted; `handsFor`, `carryPlaces` private; `homeRegionOf` folded;
  `wieldSlots`+`wieldRefusal` → `wieldPlanFor`. Tests: `Carrying.hands.test` cases 1 + the W7 block →
  `Attired.hands.test.ts`; `Mobile.lead.test` + `Rope.test` add the haltered hog.
- **W8c — awkwardness is the gauge's.**
- **W8d — the words leave the model.** `CommandController.carryRefusalWords`/`readiedWords`;
  `bringToHand` returns `ReadiedOutcome`; the seven prose members go; `CommandGiver._executeOne` clones
  the controller before `_readyInstruments` (the refusal path still destructs it, `:1820`); the 9
  callers + `FightDrawController` + `InventoryController`. Tests: the worded cases →
  `cmd/inventory/__tests__/GetController.carry-words.test.ts`. Gates: `lint:controller-decisions`,
  `lint:controller-mutations`, `lint:lib-statics`, `lint:completion-this` — no rise.
- **W8e — combat prices its own switch.** Test → `CombatLogic.switch-pricing.test.ts` (1.5 / 3 / 6 s).
- **W8f — `poseRefusal`** and the two type dedupes (B4: grep `packages/content`).
- **W8g — the sibling seams + retail's carry facts.** The fixed list; `SaleOutcome.facts.carry`.
- **W8h — the docs.** `carrying.md` rewritten around *`move` is the receiving act* (the Cast: the hook
  on `Container`, the invariant on `Creature`, the mark on `Slotted`, `Carrying` on four classes; the
  idiom table: plain `move` · `canReceive` + `move` (handed) · `canReceive` + `move`-or-`move`-here (made, on the mint path's owner) · `seatInSlots` (wear); § What a non-carrier
  answers; the one overflow on restore), `spatial.md` (`arrivalFor` beside `canAddContainable`; the
  Placing precedent; `move` never lies), `antipatterns.md` (the `move` row in the Api table: *a body is
  a destination that places what arrives*; `receive`/`receiveOrSetDown` gone), `slot.md`,
  `embodiment.md`, `encumbrance.md`, `combat.md`, `command-spec.md`, `retail.md`, `lint-family.md`
  (the retirement), `identity.md`/`vitals.md` (which rungs carry), and this plan's § Host placement rows.

Commit titles: `refactor(size-and-carrying W8a): move just works — the body places what arrives, or
move throws`, `… W8b: the hands are Attired's`, `… W8c: awkwardness is the gauge's`, `… W8d: the
carrying words leave the model`, `… W8e: combat prices its own switch`, `… W8f: poseRefusal`, `… W8g:
the sibling seams and a sale refusal's carry facts`, `docs(size-and-carrying W8h): carrying.md — move
is the receiving act`.

#### Acceptance

- **No behavior change for a carrier in play**: every assertion of the requirements' drive (runs
  12–13) holds; the drive and the browser walk re-run **once at /finalize**. Mid-wave: tsc,
  `test:near`, the suites named, every touched pack's vitest.
- **Behavior changes, intended and named**: a direct `move` onto a body with no honest place throws
  (never admitted, never lands elsewhere); `move(item, <non-carrier>)` throws; a key moved out of its
  pocket onto its owner goes to a hand.
- `Carrying`'s interface is the 15 members; `Carrying` composes on exactly `Character`, `DraftAnimal`,
  `platform/agent/KeptAnimal`, `WorkingAnimal`; `Creature.arrivalFor` has no plan escape; the
  `receive` family is gone (`grep -r "receiveOrSetDown\|receiveGranted\|\.receive(" packages/` finds
  only `Store.receive`/`Warehouse.receive`, which are the storage protocol's).
- **No new mixin, Api, class, registry or document kind.** `arrivalFor` is a hook on an existing
  mixin with **three** implementers (Container default, Creature, Carrying); `seatInSlots`/`isSeating`
  sit beside `seatInSlot`; `canReceive` is a method on an existing mixin; **no new `ContainmentApi`
  name**; `carryRefusalWords`/`readiedWords`
  are methods on an existing class; `Arrival`/`ReadiedOutcome` are types.
- **No ceiling rises**: `lint:lib-statics`, `lint:object-verbs`, `lint:controller-decisions`,
  `lint:controller-mutations`, `lint:perceived-surfaces` (0), `lint:duck-typing`, `lint:mixin-names`,
  `lint:instanceable`, `lint:imports`, `lint:module-scope`, `lint:completion-this`. `lint:body-moves`
  retired. The full family at code-complete and /finalize only.

#### Risks

- **A loose site becomes a throw.** A `move` the retired census tagged `inherit`/`allow` whose
  destination is a body at runtime was admitted silently when the row had not loaded; now it throws
  `nowhere-to-carry`. The caller sweep is the mitigation; the drive at /finalize the proof; the thrown
  message names the body, the item, the hands and what was tried, so the finding is one line.
- **Re-entrancy in `move`**: `seat` re-enters `move` under the seating mark; `pair` re-enters
  `placeOn`; `into` re-enters for the bag. Each re-entry is a different destination shape (contents ·
  environment · a plain container), so no cycle — the test pins a mug, a key, a pouch, a packed thing.
- **68 copies of two lines.** The made fallback is written on 68 mint-path owners; the risk is drift
  (one site forgetting the `canReceive`, which then throws at a full body after the inputs are
  spent). Mitigation: the rule is three greppable tokens (`canReceive` · `move(x, maker)` ·
  `move(x, here)`), and the drive's made steps (a craft, a harvest, a catch at full hands) pin the
  three biggest owners. Accepted by the owner as the cost of one movement verb.
- **The dispatcher order change** (W8d): the controller clone moves ahead of a refusing step; the
  refusal path destructs it as every early return does (`CommandGiver.ts:1820`).
- **The seating mark on a throw** inside `occupyAll` — `try/finally`, the shape `admitWhile` has.
- **`receiveOrSetDown` across 22 packs**: 73 sites rewritten by hand to the two calls (B4's content grep
  finds any left).
- **The minted-after-a-write sites** (7) gain a `canReceive` pre-check that did not exist — a full
  body buying a card is refused before the charge, which is the requirements' handed rule applied
  where the plan had deferred it.

#### The review questions for this wave

- **P1** — `arrivalFor` is the one new hook: three implementers, each a different answer (contents ·
  refuse · place), promoted at the third, not invented; `canReceive` is its dry read on the same
  mixin; **no new Api name** (the owner struck `deliver`); everything else is a method moved to the
  class that owns its fact. Searched: a
  destination-side placement seam (`placeOn` — the precedent reused), a shared refusal-wording helper
  (none), a hands read (`Attired.handSites`, reused), a seating entry (`seatInSlot`, pluralized).
- **P2** — `Container.arrivalFor` default is a no-op on every container (contents, as today);
  `Container.canReceive` default is the fit/veto read every container already has; `Creature` (every body): the rule is about what a body's contents may be — a fish means it;
  `Slotted`'s mark is a no-op on a rack; `Carrying` on the four carrier classes: hands or tack by plan;
  `Attired` (Creature, Corpse): hands by plan; `LoadBearing` (Creature); `CommandController` (every
  verb may ready or hand). No guard re-narrows a host; no plan escape remains.
- **P3** — `move` throws, never lies; a non-carrier throws; the restore admits and diagnoses; a prop
  that cannot be placed is a diagnostic; `putPlanFor`'s reason code and `onRestored`'s missing `super`
  are fixed; the seven minted-after-a-write sites pre-check.
- **P4** — `instanceof Creature` in `PersistableLogic` (a class); `MixinApi.isAttired`/`isLoadBearing`/
  `isCarrying` elsewhere; `callHook` for `arrivalFor` as for `canAddContainable`; `WorkingAnimal` composes
  the kernel mixin by specifier.
- **P5** — the body decides (the hook, `canReceive`, `ready`, `wieldPlanFor`); the controller words and
  buckets; `EquipControllerBase` no longer fabricates a refusal to word it.
- **P6** — unchanged: homes ride `captureSlice`; nothing new persists; no collection.
- **P7** — the plan is awaited where a body is made or restored, never searched; the hook needs no
  plan; `switchSecondsFor` reads dials at use.
- **P8** — `arrivalFor` (the destination answers *where does this arrive on me*, beside
  `canAddContainable`), `canReceive` (its dry read, the common word), `seatInSlots`, `wieldPlanFor`,
  `handsToFree`, `poseRefusal`, `carryRefusalWords`/`readiedWords`. No class renamed.

**✅ Done — W8 (659326d57 · 2b5601309 W8a · e5d38ba48 W8b · db8cee2da W8c · 6d2253c0b W8d · 0a105fd65 W8e · 6e26e10cd W8f · 7f9ba899a W8g · W8h the docs commit).** `ContainmentApi.move(item, body)` is the receiving act: `Container.arrivalFor` (three implementers — the default, `Creature`, `Carrying`) and `Container.canReceive` on every container; the body branch in `move` throws a worded `ContainmentError` when there is no honest place; `Creature.arrivalFor` fails closed (`isJudged` gone); `Carrying` on `Character`, `DraftAnimal`, `KeptAnimal`, `WorkingAnimal`; the `receive` family deleted; `lint:body-moves` retired. The sweep: ~30 port-idiom and 15 handed sites → `move` (`canReceive` first where a write sits between); the made sites → the two calls on their owners; 4 loadouts → `seatInSlots`. `Carrying`'s interface: **14** (`freeHands` · `tierOf` · `homeOf` · `setHome` · `isHonest` · `ready` · `handsToFree` · `stow` · `bringToHand` · `releaseHeld` · `wieldPlanFor` · `gearNoise` · `placeLoose` · `returnBorrowed`). W8-x1: `lint:on-create` back to **71**. W8-x2: forms recorded, not moved (below). Verified per sub-commit: server tsc (every pack's `src` included), `test:near`, the touched packs' vitest, the named gates; after the last: every pack's vitest and every `lint:*` individually (see the W8 report). The drive and the walk are /finalize's.

#### Decided while building W8

- **W8-a1 — the made fallback is written inline, on each mint path's owner, as the two calls**:
  `if (w.canReceive(x) === null) move(x, w); else move(x, (isContainable(w) ? w.getContainer() : null) ?? w)`.
  For a body that refuses, "here" is where it stands; for a non-body `w` that refuses (a full crate) the
  thing goes to the crate's own place — never refused after the inputs are spent, and `move` still throws
  if even that will not take it. The *you set it down* line is on the owners that narrate an act
  (crafting's `landOutput`, `Producing.mintTake`, `Growing` ×2, `Menu.orderPlanFor`, `unequip`); the
  mechanism sites with no actor (a breakage's residue, crystals, a destroyed container's evacuation,
  a thrown landing, ash, soot, a sweep) set down silently, the thing visible where it lands.
  Lens 2 (one verb, no rolodex) + the owner's ruling (no helper, no new name).
- **W8-a2 — `MarketStalls.giveUp` keeps the made form** (the plan listed it as handed, pre-checked):
  nothing pre-checks it — a stall given up hands back many goods with no `canReceive` before — so the
  two calls are what keep a full renter from a throw. `ConsignmentShelf.handOver` is plain `move`
  (its `handOverRefusal` ran first). `ConditionLogic.reembody` is plain `move` (an arriving body is an
  agent; every container admits it).
- **W8-a3 — the seven minted-after-a-write sites take the made form, not a pre-check before the
  write.** The thing does not exist before the write (coins dispensed after the ledger posts, a
  receipt's paper, a claim ticket, a key, a card), so a pre-check means minting before the ledger and
  destructing on refusal — a banking restructure. The requirement the plan names — *a thing minted after
  money moved must not throw* — holds: to you, else set down where you stand. The cash pre-check stays
  the follow-up W7 recorded. The card and Gus's carried gear go into a pocket by `stow` after they
  arrive (the retired `prefer: 'pockets'` — a keeper's card must not take a hand for good).
- **W8-a4 — outfits seat by claim, the rest move** (`Login`, `EmbodyController`, `Character.wearGarments`,
  `EquipControllerBase` out of the wardrobe): `seatInSlots(garment, claim)` when the garment claims slots
  on this body; a bag that claims none is `move`d and the body hangs it from the belt (D11's hang rule).
- **W8-a5 — `seatInSlots` rolls a failed claim back** (back where it came from; a fresh thing,
  nowhere) so a seating that throws leaves nothing loose behind.
- **W8-a6 — props into a body**: the applier asks `canReceive` of an agent host and, refused, records
  the diagnostic and does not place the prop (P3: skip, say so) — not a throw out of the clone.
- **W8-a7 — `Estate`'s keyed re-place admits through `Creature.admitWhile`** (the restore path, as
  `restoreItem`), any body, not only a carrier.
- **W8-a8 — `Creature.onRestored` has no `super` to chain** (no mixin under it defines one); the chain
  the plan meant is `Carrying.onRestored` → `super` (Persistable's → Creature's) → `placeLoose`.
- **W8-a9 — `Carrying.placeLoose` asks the body's own `arrivalFor`** (not `canReceive`): the same answer
  read dry, and it keeps the restore one idea with the arrival (`lint:mixin-clusters` read the overflow
  as a second cluster otherwise).
- **W8-a10 — the made test is the idiom, not a `landOutput` case**: the crafting fixture's maker is a
  bare `Idea` (no hands, no body), so a full-hands craft needs a new fixture; the flip test pins the
  two calls (`move` throws; the second call sets down) and the drive's made steps at /finalize pin
  `landOutput` itself.
- **W8-a11 — test fixtures that held things gain hands** (`carrying-fixture`'s `handsSpecies` /
  `withHands`) or the carrier mixin (`CarryingMixin(Creature)` fixtures); a bare `Thing` (no good a
  hand closes on) staged "on" a body is admitted by a spy on `isAdmitting`, as W7's restore tests did.
- **W8-x1 — the on-create audit, confirmed and retired.** The cause: `StuffApi.ensureConstituent`
  returned without awaiting a row load already in flight, so a clone minted while another body's load
  of its species was pending set `_speciesPath` on a cold row. It now awaits an in-flight load when the
  holder is a clone (its own path not loading) and still returns at once when the holder is a row
  loading (the deadlock case). `Creature.onCreate` deleted; `lint:on-create` 72 → **71**.
- **W8-x2 — forms stay on D1-c; recorded, not moved.** Three things stop a clean move onto the
  constituent applier: (1) `Tangible.shape` stores a leaf word (`rod`), not a path, and 25 content rows
  author it as a word; (2) the class default (`static defaultShape`, 7 classes) is cited by no row, so
  the applier has nothing to load — master's two answers are a field on every row (the default stated
  N times) or a boot line (the doctrine forbids it); (3) a loud cold `getShape` would fire on every
  Tangible not born through the applier — 31 `StuffApi.create` sites and the suite's `makeStuff`
  fixtures — and every `move` asks the tape measure, which reads the form. Authored shapes already load
  with their content (the applier awaits the async `setShape`). Moving forms is a birth-path build of
  its own.
- **W8-b1 — the hands tests stay in `Carrying.hands.test`** (not moved to an `Attired.hands.test.ts`):
  the cases read a carrier's grip beside the hands; the move to `Attired` is pinned by the narrowing
  changes (`wornStack`, `fitsSlotSpec`, `Wieldable.fitsSlot`, MQL `:worn`, the shelf's worn gate all
  read `isAttired`) and by the haltered-hog case in `Mobile.lead.test`. The grip is read through the
  public `wieldPlanFor` in tests (`handsOf`), since `handsFor` is private.
- **W8-d1 — the dispatcher clones the verb's controller only when there is something to word**
  (a refusal, or a readying that moved something), and destructs it at once — not "clone before
  `_readyInstruments`": the async-detached path clones its own controller later, and a clone for every
  dispatch to word nothing is waste. Same contract: the body decides, the controller words, the
  refusal path destructs what it cloned.
- **W8-d2 — a fight's switch landing narrates its own beat** (*You have the sword in hand* —
  `CombatLogic.performSwap`): the readying sentence is a verb's, and the switch completes on combat's
  tick with no verb in hand. Combat narrating its own event is the `releaseHeld` precedent.
- **W8-d3 — the both-hands decision moved to the body** (`nowhere-to-carry`'s `needsBoth` fact) and
  the hands-full branch reads "is there a second held thing" as an emptiness test — so the words moved
  into `CommandController` with `lint:controller-decisions` at 508 and `lint:controller-functions` at 63
  (the word helpers are private methods, not module functions).
- **W8-d4 — retail's carry facts landed in W8d with the words** (the shelf could no longer word a
  carrying sentence once `refusalWords` left the model): `SaleOutcome`'s refusal arm carries
  `facts.carry`, the shelf words only *stays on the shelf … Nothing is charged*, `buy` prefixes the
  carry words. `drawSidearm` → `refusal` and Equip's re-asked `wieldPlanFor` landed there too.
- **W8-e1 — `lint:combat-dynamics` allowlists `isPlacing` + `isSealable`** (an allowlist with a reason
  per the gate's own rule, not a ratchet): the switch's seconds read the holder the thing comes out of —
  a clip or a pocket region, a flap or a lid — which moved into `CombatLogic` with the `combat.*` dials.
- **W8-g1 — `put X in <person>` words a carrier refusal in the third person** (*Bob has nowhere to take
  the cup — their hands are full*), from `putPlanFor`'s new `refused-by-carrier { carry }` arm — never
  the reason code it used to render through `Mml.fromMarkup`. `carryRefusalWords` is second person (the
  giver's own body), so it is not the words for someone else's.

#### Owner rulings on the two questions (2026-11-12) — folded in

1. **No `ContainmentApi.deliver`.** *"Every time you invent a synonym for `move()` you're making it
   harder for everyone else in the game."* The made fallback is the two calls that exist, on the owner
   of the mint path; the made-path table above is the count (73 sites, 68 owners).
2. **`canReceive` lives on `Container`.** Every container answers; no caller narrows; `Creature`
   answers the invariant's refusal for a non-carrier through `arrivalFor`; `Carrying` overrides
   `arrivalFor` only.

#### W8i — a carrier routes (owner rulings, 2026-11-13) — amendment

**✅ Done — W8i (c261eb460 code · the W8i docs commit).** W8's body branch turned `move(item, body)` into `move(item, bag)`
(`arrivalFor` → `into` → `this.move(item, bag)`): the move to the body never happened and the body's
witnesses never fired — the lie. Four owner messages the same day, final form: *"I don't want people to
have to care what they're moving to determine which method to use. if it's a Carrying composer then use
the special routing and if it's not then just move the object. this shouldn't be on the caller — it
should be on move(). the only time you go around move() is when you need to go around the routing."*

- **`move` routes for a carrier.** `Arrival` loses `into` (every kind is IN the destination).
  `Carrying.arrivalFor` answers the routing's first choice (`resolveReceive(item, bags)`); a bag, or
  nothing, answers `refuse`, and `ContainmentLogic.move` hands a carrier's refusal to
  **`Carrying.routeArrival(item, refusal)`** (gated `FromModule(ContainmentLogic)`, `@internal`) — the
  onward move is issued THERE, by the carrier's arrival handling: where it goes on is decided first (no
  bag and nowhere to stand → `ContainmentError`, nothing moved); then a true move onto the body under
  `admitWhile` (the body's `onContainableAdded` fires), then a second true move into the bag, else to
  `getEnclosingPlace()` with the one line (*Your hands are full — you set the cup down.* / peers *Mara
  sets the cup down.*; worded per reason: too heavy, cannot grip, hands on the cart). A non-carrier
  throws as before.
- **The bypass: `Carrying.directMove(item, route?)`** → `ArrivalRefusal | null`, the routing made
  explicit in `Arrival`'s vocabulary (`CarryRoute`: `seat {slots}` · `pair {host, region}` ·
  `into {container}` · `carried` — on the body, else the first bag, `get`'s). No route = ON the body
  (`arrivalFor(item, { onBody: true })`). Never the floor.
- **`canReceive` deleted** from `Container` (interface + default). **Kept: none.** The `put X in
  <person>` plan reads the destination's own answer dry before the putter's release (module-private
  `arrivalRefusal` in `ContainmentLogic`, `onBody: true`) and moves with `directMove` at completion
  (a stale refusal there puts it back in the putter's hands) — the release gate is a write the plan
  must not make before it knows.
- **Counts.** Plain `move` where a fallback or pre-check was: **79** (70 two-line made fallbacks
  collapsed, the five owners that wrote their own *you set it down* line — `landOutput`,
  `Producing.mintTake`, `Growing` ×2, `Menu.orderPlanFor` — plus `unequip`, `returnBorrowed`, the
  forestry bole cut, the prescription slip). **`directMove`: 15 sites** — `get` ×2 (`carried`), `give`,
  `equip` out of the wardrobe (`carried`), shelf/rack reclaim, the shelf's `handOver` (consignment +
  stock), the store's unique-good withdrawal, the tip jar, `untie` ×3 (line end, rope, air bag), a lead
  tied onto a carrier, `props:` onto a body, the daypack, `put X in <person>`. **Could not order the
  goods first: 7**, plain (routed) `move` — the thing does not exist until after the write: coins moved
  by the ledger (`moveCoins`), coins dispensed (`dispenseCoin`), the issued card, a minted key, a store
  receipt, a claim ticket, the TPA card (nothing charged, but minted by the act).
- **The shelf reorders** (`ConsignmentShelf.handOver` → `settleSale` → `handBack` on a failed settle):
  goods first, then money; `Stock` splits one off the heap before the hand-over and puts a refused piece
  back on its heap; the buyer's stamp lands after the hand-over (on nothing if it merged into their
  like, whose title is theirs).

#### Decided while building W8i

- **W8i-1 — `seatInSlots` is not folded into `directMove`.** It is `Slotted`'s primitive (a rack, a
  battery bay, `put`'s slot route, the chokepoint's own `seat`), so routing body loadouts (`Login`,
  `EmbodyController`, `Character.wearGarments`, `Gus`, the implant, `arms`) through
  `directMove(item, { kind: 'seat' })` removes no entry point — and a loadout that cannot seat should
  throw loudly, which `seatInSlots` does and `directMove` (a refusal) would not. Lens 2.
- **W8i-2 — `get` uses `{ kind: 'carried' }`**, the routing short of the floor: picking a thing up
  that routes to the floor would set it down where it lay (or off a table onto the floor). A refused
  `get` puts back what its own release did — a slot re-seated. A FIXTURE is asked before it comes down
  (the body's own answer read dry, `arrivalFor(…, { onBody: true })`): re-hanging it after a refusal
  was a new controller mutation (`lint:controller-mutations` 137 → 138), and a fixture is a thing for
  the hands. `give` puts a refused thing back by `move(item, giver)` (routed to the hand it just left)
  rather than re-occupying slots in the controller (`lint:multi-act`, `lint:perceived-surfaces`).
- **W8i-8 — a recipient that is no body takes a handed thing plainly** (`give` to an `Agent` that is not
  a `Creature`): its own arrival answer read dry first — a non-carrying BODY refuses (*has nowhere to
  take it*), anything else is moved exactly.
- **W8i-9 — the shelf reads a terms ask BEFORE the hand-over** (a terms price reads the stock on hand),
  and a broke buyer at a heap is told the heap's one-piece price (the split piece merged back into it).
- **W8i-10 — the restore asks the body's own hook** (`placeLoose` → `arrivalFor`, as W8-a9), then a bag
  it carries, then the overflow; and `routeArrival` refuses to re-enter itself for one item (an arrival
  rule that ignored the admission would recurse — a test stub did).
- **W8i-7 — `directMove`'s `into` route asks the bag's tape measure only** (`fitRefusal`, as the
  routing's `placeTakes` does), not its optional veto (`lint:duck-typing` would rise by one); a bag that
  vetoes still throws from `move`.
- **W8i-3 — a handless body's unequipped tack is set down explicitly** (`unequip`): routed, a mule's
  halter would go straight back on (the tack rule).
- **W8i-4 — `pockets-first` keeps meaning pockets AND packs first**: the routing's first choice may be
  a bag over a free hand; `move` then lands it on the body and the body packs it (a true two-step).
- **W8i-5 — the made sites write `move(made, w)` even where `w` may be a non-carrier container** (a
  bench, a crate): exact there, as before W8. Grounded: no shipped made path mints onto a non-carrying
  BODY (a catch goes to the fisher, a lead hangs from the halter, tack is seated), so the non-carrier
  throw stays the invariant's fail-closed answer.
- **W8i-6 — `unequip`'s set-down line now comes from the routing**, so it precedes *You take off the
  coat* rather than following it.

**Still the owner's:** nothing in W8. Two notes for the sweep, not questions: `Carrying.ts` could move
to `lib/creature/` now that its base is `Creature` (≈100 imports); and the `ForSale` reshape to facts
(3 implementers, one in `transport`) is retail's build.

### W9 — what is IN a thing is its contents; pockets are regions of a container (owner ruling, 2026-11-13)

**Why.** The owner, reviewing the pocket model: *"if the apple is IN the desk it should absolutely be
contents of the desk, not the room — but I don't know if I'd argue that for every relation."* The rule
that falls out, and that this wave makes literal:

> ⭐⭐ **An enclosing relation is containment; a supporting or hanging relation is a pair.**

Shipped spatial already says so for `in`: `$C/platform/content/placements/in.yaml` is the one member that
`encloses`, and nothing offers it as a sibling placement on purpose — `put X in icebox` is plain
containment, region zero. `on` and `from` are the auxiliary sibling pair (spatial.md § The auxiliary-pair
model) and **stay** pairs: a mug on a desk is in the room's air, light and view; a holster hung from a
belt is worn on the outside. What this MR got wrong is **pockets**: D26 made a pocket an enclosing
placement member (`/platform/placements/pocket`, `encloses: true`) on a `Placing` garment, so a pocketed
key is `container = wearer` + pair `{coat, 'left pocket'}` — *in* modeled as a sibling. That one
inversion forced D33's host-follow for pocketed things, the owned-host pair restore pass (6), `CarryPlace
= Container | Placing`, the pocket fit inside `Placing.canPlace`, and the pocket branch of perception's
pair rule.

**The fix.** A garment with pockets is a **`Container` whose contents are partitioned by named region**
(`left pocket`, `breast pocket`, `inner pocket`), each region carrying its own `mouth`, `volumeM3`,
`covered`, `closes` — today's entry fields, unchanged. The key's container is the coat. `on`/`from` keep
D33 (a tray's cups, a belt's pouches). `move` is still the one call; a carrier still routes what arrives;
`directMove` is still the bypass; no new movement name; the mixin decides and the controller words.

#### Grounding

- **The pair today** (`lib/spatial/Containable.ts:319-338, :444-447, :463-473, :531-533`): `_placementHost`
  (instance ref, weak) + `_placementName`; `getPlacement()`; `getEnclosingScope()` returns the host when
  the member `encloses`, else the container; `_setPlacement` gated `FromContainmentApi`. **Nothing in the
  item-side pair requires the host to be a sibling** — the sibling claim lives in two places only: the
  persisted form (`ContentPlacement.hostIndex`, `lib/persistence/PersistenceSlice.ts:59-78`, written by
  `Container.captureSlice` `:684-697`) and `Placing.getPlaced` (`lib/spatial/Placing.ts:415-425`), which
  walks the host's **environment**.
- **The host side** (`Placing.ts`): `PlacementEntry { member, name?, mouth?, volumeM3?, covered?, closes? }`
  (`:76-83`); `getPlacementEntry` (`:347`), `namedRegions` (`:358`, folded into `getKeywords` `:371`),
  `placementOf` (`:388`), `setPlacements` (`:401`, awaits the member documents), `resolvePlacement` (`:433`),
  `canPlace` (`:472`: no-such-placement → `shut` for an enclosing member on a shut Sealable → the member
  fit), `memberFitRefusal` (`:499-541`: hanging length/strength; an enclosing region's mouth, depth
  `POCKET_STICK_OUT`, and volume over `getPlaced(name)`). Composition refusals (`:288`): a Placing host
  composes Containable; never Exitable. Class default `static defaultPlacements = [on]`; `Garment` and
  `Pack` say `[]`.
- **The chokepoint** (`platform/idea/api/ContainmentLogic.ts`): `move` (`:87`) → a `Placing` destination
  with a word, or with none when it is not a Container → `placeOn` (`:336-375`: into the host's
  **environment**, `moveCore(…, placed=true)`, stamp the pair, fire, restamp, press); the agent branch asks
  `arrivalFor` (`:116-140`); the same-container unplace (`:145-152`); `moveCore` (`:384`): the bring-along
  asked of the destination (`:437-441`), `canAddContainable(item, { placed })` (`:450`), the pair cleared
  when the container changes (`:479-487`), `pressAfterArrival` for a non-place container (`:514`), the
  host-follow (`:519-532`), custody. `directFollowers`/`bringAlong` (`:544-583`) look only in the host's
  environment. `putPlanFor` (`:180-290`): the binder's `via.region` → `named`; the slot rule; `PlacementOffers`;
  region zero's `arrivalRefusal` (`:598`); `setHome` on a `zero` route only (`:272-280`).
- **`Container`** (`lib/spatial/Container.ts`): `arrivalFor` default `contents` (`:473`); `canAddContainable`
  = `fitRefusal` (`:463`); `bounds`/`fitRefusal` (`:388-450`; unknown bounds ask nothing — a flexible thing
  with no authored box and no capacity has `interiorOf === null`); `reconcilePressing` (`:492-600`: a body
  presses only what is in a pocket, `:552-556`; a thing placed on a sibling inside a container is pressed by
  nothing, `:557-559`; the leaving thing's `dest` `:580`); `cleanupOnDestruct` evacuates to the outer
  (`:737`); the `contents` subscribable field (`:840-870`, `dependsOnFields: ['contents','placement']`);
  `getReachableContents` (`:1002`); `getLooseContents` filters things placed on a **sibling** in the list
  (`:1035-1051`); `static commandContributions.self` lists five inventory views (`:810-818`); `closedSidesOf`
  (`:1058`); `interiorOf` (`:1076`). `PlacementOffers` (`lib/spatial/PlacementOffers.ts:58-60`): region zero
  iff `isContainer(host) && !host.isAgent()`.
- **`Garment`** (`platform/thing/equipment/Garment.ts:103-109`): `PlacingMixin(Tearable(Labelled(Soilable(
  Wearable(Slottable(Assembled(Crafted(Durable(Constructed(Dyed(Good)))))))))))`; `defaultPlacements = []`;
  `hangingLengthM` while worn; `tear` moves the rags to `where` and destructs. `Good` is
  `Slottable(Faced(Integrity(MadeFrom(Chattel(Concealable(Thing))))))` — **not a Container**. `Pack`
  (`Pack.ts:46-60`) is `Placing(Wearable(Slottable(Sealable(Vessel))))` — a worn Container+Placing already.
  **37 rows name `Garment`; 20 author `placements:`; 14 author pockets (31 entries); 6 author `dimensions:`.**
- **The two `in`-as-sibling hosts.** `Chamber` (`platform/thing/Chamber.ts:47-67`) is
  `Atmospheric(Placing(Thing))` with `placements = [IN]` and `occupants() = getPlaced(IN)`; **one row**,
  `trade-carpentry/…/thing/drying-loft.yaml`; readers `DryController.ts:110-148` (`rack.resolvePlacement` →
  `move(target, rack, member)`), `dry.yaml:77-82` (`prepositions: [on, onto, from]`, `requires:
  [PlacingMixin]`), `api/containment.ts:202` (the docstring's `move(item, loft, Placements.IN)`),
  `Atmospheric.ts:767`, `Chambered.ts`; tests `Chamber.test`, `Seasoning.chamber.test`,
  `Thermal.heatwork.test`, `Chambered.test`, carpentry's `sawmill.test`. `in.yaml`'s comment *"nothing
  composes a host that OFFERS `in` today"* is already false.
- **Carrying** (`lib/slot/Carrying.ts`): `CarryPlace = {host: Placing; region} | {host: Container}` (`:134`);
  `carryPlaces` (`:1036-1072`: worn hosts' enclosing non-hanging regions → pockets; containers placed on
  worn hosts → hung; worn containers → ready/packed); `placeTakes` (`:1075`); `tierOf` (`:462-489`: a thing
  inside a worn container is `ready` or `packed` by the container's slot); `isHonest` (`:514`); `arrivalFor`
  → `pair` (`:590`); `directMove` `pair`/`into` (`:640-655`); `routeArrival` (`:674`); `stow`/`homeTakes`/
  `stowPlaceFor` (`:1219-1255`); `bringToHand` remembers a container before a pair (`:1286-1294`);
  `carriedAt` (`:1300`); `returnBorrowed` walks `getCarriedContents()` one level (`:858-889`).
- **Perception** (`platform/idea/api/PerceptionLogic.ts`): `holdersAdmit` (`:1160-1192`) walks
  `getEnclosingScope`; the covered/`closes` check is keyed on `placement.host === scope` (`:1176-1186`) and
  D24a's `foundOnBy(viewer, cur, wearer = scope.getContainer())`; `bodyShows` (`:1218-1234`); `resolveSearch`
  (`:1311-1342`); `visibleContentsOf` (`:1351-1385`) groups `target.getContents()` only.
  `SearchController.buildScope` (`:166-198`) for a named container is `target.getContents()`.
- **Persistence**: `captureSlice` (`Container.ts:642-699`): `hostIndex` by `ctx.indexOf(placed.host)`, else
  `hostChattelId` for an owned host; `PersistableLogic.restoreState` pass (3b) (`:822-840`, `idx ===
  undefined → continue`), pass (6) (`:896-924`, owned-host pairs + the estate's `placedOn`); `restoreItem`
  (`:968-1000`) moves a nested clone into its host plainly (a Creature admits). `Estate.captureSlice`
  (`lib/chattel/Estate.ts:256-277`) records `placedOn` only when `live.getContainer() === host`;
  `hydrateSlice` restores `inventory` goods into the owner (`:345-370`). A worn **Pack's** contents already
  persist as nested state inside the pack's own entry — the shape a pocketed key takes after this wave.
- **Readers of the pocket document**: `Placements.POCKET` (`Placement.ts:53`), `Garment.ts:32` (docstring),
  31 content entries in 14 rows, 11 test files (`api/__tests__/mql.universal`, `banking/issueCard.pocket`,
  `command/binder.perceived`, `retail/ConsignmentShelf.worn`, `slot/Carrying.flip`,
  `platform/Avatar.flip-restore`, `cmd/perception/search.body`, `equipment/Garment.pockets`,
  `api/ContainmentLogic.hostFollow`, `api/ContainmentLogic.arrival`, `cmd/inventory/Inventory.tiers`).
  `check-template-census.ts:1206` reads a region entry's `member` as a document path;
  `check-placement-words.ts` reads every `content/placements/` document.
- **The words**: `CommandController.ts:562-627` and `FightSwitchController.ts:76` word a region by
  `pair.host.namedRegions()`; `CombatLogic.outOf` (`:4430-4446`) prices a holder by the pair's member and
  entry — all pair-based, none sibling-based.

#### Decisions

- **D-W9-1 — the region mechanism is the shipped pair with `host = the container itself`.** A thing in a
  named region of its container has `container = coat` and `placement = { host: coat, name: 'left pocket'
  }`. The member document's `encloses` **is** the switch the owner's rule names: an entry whose member
  encloses is a region OF the container (the thing is its contents); one whose member does not (`on`,
  `from`) is the sibling pair exactly as today. `getPlacement()` for a pocketed key returns `{ host: coat,
  name: 'left pocket' }` — the same answer as before; what changed is `getContainer()`, which now answers
  `coat`. `getEnclosingScope()` answers `coat` either way (it already returned the host for an enclosing
  member), so every air, light and reach reader is unchanged. **No new field, no new mixin, no new
  document kind**: the honest expression of *in* was one bit away, and the bit already existed. Searched
  and rejected: a `region` field beside the pair on `Containable` (a second way to say one thing); a
  `regions:` list on `Container` apart from `placements:` (two lists for one vocabulary, and `namedRegions`
  / `via.region` / `getPlacementEntry` would need a second reader each); a pocket as an object (D26's
  refusal stands — the owner's *"not an object"*).
- **D-W9-2 — one list, two shapes, decided per entry.** `placements:` stays the one authored list of the
  ways a thing may sit on, in or from a host; `PlacementEntry` is unchanged. **A host whose list offers an
  enclosing member must compose `Container`** — `PlacingMixin.__validateComposition__` gains refusal 3 for a
  class default naming one (`Chamber`'s `[IN]`), and `setPlacements` (after the member documents load)
  throws `TypeError` for a row entry naming one on a non-Container host (the applier records it, P3). The
  rows' member path becomes **`/platform/placements/in`**: the enclosing member is `in`, the owner's word;
  `/platform/placements/pocket` and `Placements.POCKET` **retire** (D26-c's `into`-primary trick existed only
  to let a pack's region zero win `in`; see D-W9-9 for what a pack with a side pocket now asks).
- **D-W9-3 — `Container.hasInterior()`: does this container have an unnamed inside (region zero)?** Default
  `true` — every chest, bucket, cart, pack, place. **`Garment` answers `false`**: cloth has no inside of its
  own; its insides are the pockets its row names. Readers: `PlacementOffers` offers region zero iff
  `hasInterior()` (so a coat offers its pockets only, and a shirt with no pockets offers **nothing** —
  `put key in shirt` → `wrong-preposition { takes: [] }`, worded by `PutController` as today's *"you can't
  put anything in that"*); `fitRefusal` answers `no-room` (facts naming the container) when `!hasInterior()`,
  so a loose arrival into region zero is refused by the tape measure like any full container; the
  `InventoryController` holder test (D-W9-11). Not derived from `bounds()`: six garment rows author
  `dimensions:` for their own passage, and `interiorOf` would read 0.8 × a folded coat as a cavity.
- **D-W9-4 — the destination decides the region, through the hook it already has.** `ContainmentLogic.move`
  asks `arrivalFor` of **every `Container` destination given no word** (today: agents only — the generalization
  of W8 rule 1: *where inside is the destination's choice*). `Container.arrivalFor`'s default: `how.placed` or
  `hasInterior()` → `contents` (as today); else the first enclosing region whose `canPlace` admits the thing
  → `{ kind: 'pair', host: self, region }`; none → `{ kind: 'refuse', refusal: <the last region's FitRefusal,
  or no-room with no regions> }`. The chokepoint's `pair` arm is unchanged — `this.move(item, host, region)`
  — and now dispatches on the member (D-W9-5). A refused non-carrier throws `ContainmentError` as W8 made it
  (`move(mug, coat)` → *"the mug has no place in the coat — too big for its mouth"*; the author learns at the
  call, lens 2). `Carrying.arrivalFor`'s `pair` for a pocket is the same shape and needs no change.
- **D-W9-5 — the chokepoint's placing dispatch reads `encloses`.** In `move`: a `Placing` destination with a
  word resolves the key (`getPlacements().includes(word)` → the key; else `resolvePlacement(word)`); the
  key's member **encloses** → new module function **`placeIn(item, host, key)`** beside `placeOn`: `canPlace`
  veto → throw; `moveCore(item, host, false, undefined, false, key)`; `_setPlacement(host, key)`; the
  `placement` fire; the Thermal restamp (the deferred `pressAfterArrival` `moveCore` already issued reads the
  stamped pair a tick later). Not enclosing → `placeOn` as today. A `Placing` destination with no word that
  is not a Container → `placeOn` (unchanged). **A word on a plain Container** (`move(x, chamber,
  Placements.IN)` — the loft's callers) is accepted iff it is one of region zero's words (`in`'s
  prepositions) and lands in contents; any other word throws `offers no placement` (P3; today it is
  silently ignored). `moveCore` gains `region?: string`, passed to `canAddContainable(item, { placed, region
  })`: the Container default **skips the whole-container tape measure when a region is named** — the
  region's `canPlace` ran — so a map that fits a pack's side pocket is not refused by the main
  compartment's fullness. `moveCore` from === to (a key from the left pocket to the right): returns early;
  `placeIn` restamps — the `placeOn` precedent (*a mug from one desk to another*).
- **D-W9-6 — `getPlaced(name)` walks its own contents for an enclosing member** and its environment's for
  the rest (`Placing.ts:415`; the enclosing branch narrows `MixinApi.isContainer(this)`, guaranteed by
  refusal 3). `canPlace`, `memberFitRefusal`, `roomFor`, `namedRegions`, `getPlacementEntry`, `placementOf`,
  `resolvePlacement`, the MQL `via.region` facet, the `look` drill-in (`Placing.ts:254-264`,
  `LookController.ts:682-701`) and `InventoryController.regionLines` are **unchanged** — they read
  `getPlaced`. `Container.getLooseContents` additionally filters a thing whose pair's host **is this
  container** (it is listed under its region, never as loose), one clause beside the sibling filter.
- **D-W9-7 — persistence: a region of the container itself is a pair with no sibling host.**
  `ContentPlacement { placement: 'left pocket' }` with neither `hostIndex` nor `hostChattelId` means *a
  region of the container this slice belongs to*. `Container.captureSlice`: `placed.host === container` →
  `placement.placement = placed.name` only. Restore: `restoreItem` moves a nested clone **straight into its
  recorded region** (`move(clone, host, entry.placement.placement)` when the entry names a self-region and
  `isPlacing(host)`) — one move, no re-stamp; pass (3b) skips self-region entries (and a self-region entry
  whose host offers no such region, or whose member no longer encloses, is **logged and left where the
  arrival put it** — P3's skip, never a throw out of the restore). A pocketed key persists **inside the
  garment's own slice**, as a worn pack's contents do today — the body's snapshot carries the coat, the coat's
  state carries the key. `Estate.captureSlice`'s `placedOn` condition widens from `live.getContainer() === host`
  to *in the owner's keeping*: directly on the body, **or in a region of a thing on the body** (`pair.host ===
  live.getContainer()` and `ctx.indexOf(pair.host) >= 0`, or the host owned) — so an owned key in an unowned
  coat's pocket records `{ hostIndex: <the coat>, placement: 'left pocket' }` and pass (6) moves it from the
  owner (where `inventory` restores it) into the coat's region exactly as it moves a pouch onto a belt today.
  Nothing new is captured; `HomesSlice` is unchanged (a home's host may be the coat, with its region).
- **D-W9-8 — D33 retires for pockets by construction and stays for `on`/`from`.** A pocketed key is the
  coat's contents, so `directFollowers(coat, env)` finds nothing for it and `moveCore` carries it as it
  carries a satchel's contents — one move, no bring-along ask of the destination, no `placed` admission.
  The host-follow code is **unchanged**; its coat tests become contents assertions (below) and its tray/belt
  tests stay as the mechanism's.
- **D-W9-9 — words and offers.** `put key in coat` → `PlacementOffers(coat)`: no region zero, two pockets
  answering `in` → `preposition-ambiguous { regions }` → *"Which — the left pocket or the right pocket?"*
  (D26-e, unchanged); one pocket → taken; `put key in inner pocket` → the binder's `via.region` → `named` →
  `canPlace` → route `region` → `move(key, coat, 'inner pocket')` → `placeIn`. **`setHome` on a `region`
  route** whose host the putter carries (`by.tierOf(target) !== 'elsewhere'`) — D14's *putting is how a home
  is made* applied to a pocket, which the `zero`-only branch missed (a latent gap, closed here). `get key
  from pocket` is `directMove(key, { kind: 'carried' })` → `move(key, body)` → the container changes (coat →
  body), `moveCore` clears the pair, the body seats it (the arrival test's *a key out of its pocket goes to a
  hand* holds). ⚠ **A pack with a side pocket** (`{ member: in, name: side pocket }` on a `Pack` row —
  none shipped) now asks *"the inside or the side pocket?"* for `put map in pack`, where D26-c's `into`
  trick put it in the main silently. Honest and cheap (lens 3b); recorded, not worked around.
- **D-W9-10 — pressing per region.** `Container.reconcilePressing`: a thing whose pair's host **is this
  container** has a region's sides — a bottom and walls always, a top iff the entry `closes` (the buttoned
  breast pocket keeps the cork; the open side pocket lets it float) — and leaves **into the container's own
  surroundings**: `self.getContainer()`, or `self.getEnclosingPlace()` when that container is an agent (out
  of your pocket into the air of the place, never into your hand — today's *"out of a pocket it is gone from
  the body"*). The agent-only pocket clause (`:552-556`, D26-g) is deleted: a body no longer holds pocketed
  things, so a body presses nothing. `Container.closedSidesOf`/`closureLevel` are unchanged: a garment's
  region zero is never asked (no interior), and swimming wets its pockets (`closureLevel` `open`) as drive
  16 expects of a pack.
- **D-W9-11 — the carrier's reads.** `CarryPlace` narrows to `{ host: Stuff & Container; region?: string }`
  (a pocket's host is a Container now); `placeTakes` keeps its two arms (`canPlace(item, region)` through
  `isPlacing` · `fitRefusal`). `carryPlaces`' hung loop also walks **one level into each worn host's
  enclosing regions** for a container pocketed there (a purse in a coat pocket is a carry place, `ready`).
  `bringToHand` remembers the **pair before the container** (today container first — a key out of a pocket
  would get the coat as its home and lose its pocket). `returnBorrowed` walks into every **unowned worn
  container** recursively (a borrowed key in the guest's own trouser pocket must come out before the outfit
  is destroyed with the body). `tierOf`, `isHonest`, `homeOf`, `stow`, `homeTakes`, `carriedAt`,
  `directMove`, `routeArrival`, `resolveReceive`, `placeLoose` are unchanged — each reads the pair or walks
  up through containers, and a pocketed key walks key → coat → body. `InventoryController.tiersOf`: a
  **holder** is `isContainer && !isAgent && (hasInterior() || an enclosing region offered)` — a shirt is
  `worn`, a coat is `worn` and its pockets print under it through `regionLines`, a satchel is `ready` as
  today; the `regions` bucket keeps the sibling pairs (`from`). `SearchController.buildScope` for a body
  (`isAttired`) is its contents **plus each worn Container's contents** (one level; a corpse's coat pockets),
  so `resolveSearch`'s `covered` test (`bodyShows` → the pair's member encloses → not shown) and D24a's
  `foundOnBy(viewer, letter, coat.getContainer() === body)` hold unchanged.
- **D-W9-12 — `Chamber` is a Container, and the loft offers region zero.** `Chamber =
  Atmospheric(Container(Thing))` — the `Placing` layer, `placements = [IN]` and the `occupants()` override
  go (`Atmospheric.occupants()` defaults to a Container's contents). `DryController`: a rack that is a
  Container and not Placing takes `move(target, rack)`; `dry.yaml`'s `rack` arg `requires:
  [ContainerMixin|PlacingMixin]` and `prepositions: [on, onto, from, in, into]` (the `lint:placement-words`
  roster: `dry` accepts `in`). `api/containment.ts:202`'s docstring, `Chambered.ts`' and `Atmospheric.ts:767`'s
  comments follow. The loft row is unchanged (its `placements` was the class default). The owner's rule
  decides it: a board in a loft is in the loft's air **because it is in the loft** — the second shipped
  `in`-as-sibling, and leaving it would make `getPlaced(IN)` mean two things.
- **D-W9-13 — Garment composes `Container`: every garment, not a split.** The P2 question — *how many
  garments will ever hold anything?* — has the answer D26 gave for `Placing` on every garment: a pocket is
  the **row's** choice, sewn on by the tailor, and any garment may have one (lens 2: the ordinary case is a
  row edit, never a class change; a `PocketedGarment` would make *add a pocket to the hat* a kernel MR). 14
  of 37 rows have pockets today. The honest-empty default costs nothing visible: a pocketless garment
  offers no region (`PlacementOffers` empty), refuses region zero by `fitRefusal`, lists as `worn` not as a
  holder, and its card shows no `contents` section (`Cards.ts:182`: absent on an empty one). Composition:
  `PlacingMixin(ContainerMixin(Tearable(…)))` — Container inside Placing, the `Pack` order. What composing
  Container claims of every garment: `cleanupOnDestruct` (a torn coat's `tear` destruct spills its pocketed
  things where the coat was — right), the `contents` subscribable field (empty), `MixinApi.isOpenContainer`
  true for a worn coat (so `PerceptionApi.reach` walks one level into **your own** pockets — `get key`
  binds; a stranger's body is not an open container, so theirs are not walked), and Container's
  `commandContributions.self` (five inventory views) per worn garment — measured as a risk below.
- **D-W9-14 — what stays exactly as it was.** `Containable.getEnclosingScope`/`getEnclosingPlace`/
  `reachRefusal`; `Thermal`'s holder and air reads; `holdersAdmit` (the covered/`closes` check keys on
  `placement.host === scope`, true for a self-region); `bodyShows`; `CombatLogic.outOf`'s holder pricing
  (pocket = reach, `closes` = + unfasten); `CommandController`'s and `FightSwitchController`'s region words;
  `Carrying.arrivalFor`'s `pair`; `directMove`'s `pair`/`into`; the restore's `placeLoose`; the MQL facet;
  `lint:placement-words`' three invariants.

#### Host placement

| what | host | callers (counts) | signature / change | what composing it claims |
|---|---|---|---|---|
| `hasInterior()` | `ContainerMixin` (`lib/spatial/Container.ts`) | `PlacementOffers` (1), `fitRefusal` (1), `arrivalFor` default (1), `InventoryController.tiersOf` (1) | `hasInterior(): boolean` — default `true` | every container has an unnamed inside unless its class says its insides are named — a Garment says so; a chest, a bucket, a cart, a place, a pack, a loft mean `true` |
| `arrivalFor` default — the region choice | `ContainerMixin` | the chokepoint, now for every Container destination with no word | unchanged signature; body: `placed`/`hasInterior` → `contents`; else first fitting enclosing region → `pair { host: self, region }`; else `refuse` | the W8 hook's fourth behavior on the same implementer (the default); still three implementers |
| `canAddContainable(item, how)` | `ContainerMixin` | `moveCore` (1) | `how: { placed?: boolean; region?: string }` — the default skips the tape measure when `region` is named | a region's fit is the region's; the container's interior is not asked for a thing going into a pocket |
| `fitRefusal` no-interior arm | `ContainerMixin` | — | `!hasInterior()` → `{ reason: 'no-room', facts: { container, item, dims: null } }` | region zero of a thing with no inside has no room |
| `reconcilePressing` region sides + destination | `ContainerMixin` | — | self-region → `{ width: true, depth: true, height: entry.closes }`; dest `getContainer()` or the enclosing place past an agent; the agent-pocket clause deleted | pressing is the container's; a body presses nothing |
| `getLooseContents` self-region filter | `ContainerMixin` | — | one clause | a thing listed under its region is not loose |
| `captureSlice` self-host pair | `ContainerMixin` | — | `placed.host === container` → `{ placement }` | the slice records the pair it owns |
| `placeIn` | module function in `ContainmentLogic.ts`, beside `placeOn` | `move` (1) | `placeIn(item, host: Stuff & Container & Placing, key: string): void` | the one chokepoint; the enclosing twin of `placeOn` |
| `move` dispatch on `encloses`; the `arrivalFor` ask for every Container; region-zero words on a plain Container | `ContainmentLogic.move` | every `move` | — | the primitive decides; no caller changes |
| `moveCore(…, region?)` | `ContainmentLogic` | `placeIn` (1) | sixth parameter | — |
| `putPlanFor` `setHome` on a `region` route | `ContainmentLogic.putPlanFor` | — | the `zero` condition widened to `zero \| region` with a carried host | D14 for pockets |
| `getPlaced(name)` enclosing branch | `PlacingMixin` | every reader (unchanged) | walks `this.getContents()` when the member encloses | a region's contents are the host's |
| composition refusal 3; `setPlacements` row check | `PlacingMixin.__validateComposition__` / `setPlacements` | `Chamber` (class), 14 rows + any future row | throws `TypeError` | an enclosing member on a non-Container is unrepresentable, and says so |
| `Garment` composes `ContainerMixin`; `hasInterior() = false` | `platform/thing/equipment/Garment.ts` | 37 rows | `PlacingMixin(ContainerMixin(…))` | D-W9-13 |
| `Chamber = Atmospheric(Container(Thing))` | `platform/thing/Chamber.ts` | 1 row, 5 test files, `DryController`, `dry.yaml` | drops `Placing`, `placements`, `occupants()` | D-W9-12 |
| `restoreItem` into a recorded region; pass (3b) skips self-regions; `Estate` `placedOn` widened | `PersistableLogic` / `Estate.captureSlice` | — | — | D-W9-7 |
| `CarryPlace`, `carryPlaces` pocketed-container walk, `bringToHand` pair-first home, `returnBorrowed` recursive walk | `CarryingMixin` | internal | `CarryPlace = { host: Stuff & Container; region?: string }` | D-W9-11 |
| `tiersOf` holder test + worn regions | `InventoryController` (private statics) | 1 view | — | a bucketing for one view |
| `buildScope` worn walk | `SearchController` (private) | 1 verb | — | the verb gathers what the body wears; `resolveSearch` decides |
| `Placements.POCKET`, `/platform/placements/pocket` | **deleted** | 31 entries → `in`; 11 test files | — | one enclosing member |
| `in.yaml` | the platform placement document | — | prose names the region when there is one (`{% if name %}in the {{ name }} of {{ host }}{% else %}in {{ host }}{% endif %}`); the stale comment rewritten | — |

**The two tests, applied.** No guard re-narrows a host: `hasInterior()` is a container's statement about
its own inside, not a gate on who composes Container; refusal 3 refuses a composition, never a call. No
honest "no" on most hosts: `hasInterior()` is `true` everywhere but `Garment`, where it is a fact about
cloth; `Container` on `Garment` is the same shape D26 chose for `Placing` on `Garment` (the row names the
regions; zero is the honest count), and the four costs of an empty Container are enumerated in D-W9-13 and
driven to nothing visible.

#### Content

| rows | entries | change |
|---|---|---|
| `generic-objects/…/clothes/`: `blazer` 3 · `field-jacket` 4 · `greatcoat` 3 · `lab-hoodie` 1 · `student-shirt` 1 · `student-trousers` 2 · `tweed-jacket` 3 · `white-coat` 2 | 19 | `member: /platform/placements/pocket` → `member: /platform/placements/in`; `name`/`mouth`/`volumeM3`/`covered`/`closes` untouched |
| `trade-tailoring/…/thing/`: `apron` 1 · `coat` 4 · `shirt` 1 · `trousers` 2 | 8 | same |
| `trade-tanning/…/thing/vest` (2, `closes: true`) · `terminus/…/university-avenue/thing/vest` (Gus's, 2) | 4 | same |
| `platform/content/placements/pocket.yaml` | — | **deleted** |
| `platform/content/placements/in.yaml` | — | prose region-aware; comment: *the enclosing member — a host that offers it as a named region is a Container and what sits there is its contents (a coat's pockets); the loft is region zero* |
| `platform/content/platform/cmd/crafting/dry.yaml` | — | `rack.requires: [ContainerMixin\|PlacingMixin]`, `prepositions: [on, onto, from, in, into]` |
| `trade-carpentry/…/thing/drying-loft.yaml` | — | unchanged (comment: *a Container with its own air*) |

**31 entries in 14 rows; one document deleted; two views touched; `grep -rn "placements/pocket"
packages/` → 0 after W9b.** No `extends:` row carries a pocket entry of its own (the 14 are the leaves).

#### Steps — one commit each; `pnpm -C packages/server build`, `test:near`, the suites named, every touched pack's vitest, the gates the change moved

- **W9a — `in` is containment.** `Container.hasInterior`/`arrivalFor` default/`canAddContainable(region)`/
  `fitRefusal`/`reconcilePressing`/`getLooseContents`; `Placing.getPlaced` enclosing branch, refusal 3,
  `setPlacements` row check; `ContainmentLogic` `placeIn`, the dispatch, `moveCore(region)`, the `arrivalFor`
  ask for every Container, region-zero words on a plain Container, `putPlanFor`'s region home;
  `PlacementOffers` region-zero gate; `Containable` docstrings (*the host is a sibling for `on`/`from`, the
  container itself for `in`*); `Garment` composes `Container`, `hasInterior() false`. Both members still
  resident (the `pocket` document retires in W9b, so every row keeps working through this commit). Tests:
  `Garment.pockets.test` (7 cases re-asserted on `getContainer() === coat`; + *`put key in shirt` with no
  pockets offers nothing*; + *`move(mug, coat)` throws naming the mouth*; + *`look coat` lists the key once,
  under its pocket*); `ContainmentLogic.arrival.test` (`:44`, `:177` re-asserted); `ContainmentLogic.hostFollow.test`:
  the four coat cases → **no host-follow** (*remove coat: the key's container is the coat before and after,
  `directFollowers(coat, body)` is empty*; *drop coat: key in coat, coat in room, pair kept*; *give coat: the
  new wearer's contents hold the coat, the coat the key*; *a cup on a tray in a pocket: tray and cup are the
  coat's contents, the cup's pair names the tray*), the tray/belt cases kept; `Creature.veto.test` unchanged
  (`placed` admission stays for `from`/`on`). Gates: `lint:instanceable`, `lint:mixin-names` (no new mixin),
  `lint:duck-typing`, `lint:object-verbs` (0), `lint:imports`, `lint:module-scope`, `lint:template-census`.
- **W9b — the rows cite `in`; `pocket` retires.** 31 entries → `in`; `pocket.yaml` deleted;
  `Placements.POCKET` deleted; `in.yaml`; the 11 test files' citations; `Garment.ts:32` docstring; B4's
  grep (`packages/content` and `packages/server`) finds none. Gates: `lint:placement-words` (three members
  ship; `put` accepts `in`), `lint:template-census` (clause g: every `member` is a shipped document),
  `lint:command-views`.
- **W9c — a pocketed key persists in its coat.** `captureSlice` self-host pair; `restoreItem` into the
  recorded region; pass (3b) skips self-regions (logs a stale one); `Estate.captureSlice` widening + pass (6).
  Tests: `Garment.pockets.test` case 7 → *the coat's own slice carries the key; the region is restored with no
  sibling host*; `Avatar.flip-restore.test:144` (**the restart round-trip of a pocketed key** — re-asserted
  `k2.getContainer() === t2` and `k2.getPlacement()` names the pocket; the loose-inventory D32 case
  unchanged); new in `Avatar.flip-restore.test`: *an owned key in an unowned coat's pocket comes back in the
  same pocket (the estate's `placedOn` by the coat's index)*, and *an owned key in an owned coat's pocket
  (`hostChattelId`)*; `Estate` tests near. Gates: `lint:schema` untouched (no collection); `lint:pm`.
- **W9d — the carrier, the inventory, the search.** `CarryPlace`, `carryPlaces`, `bringToHand`,
  `returnBorrowed`; `InventoryController.tiersOf` + worn region lines; `SearchController.buildScope`. Tests:
  `Carrying.flip.test` (`:70`, `:119`, `:140`, `:167`, `:195` re-asserted; + *a readied key out of a pocket
  goes home to that pocket*; + *a guest's borrowed key in their own pocket goes back to its owner*);
  `Inventory.tiers.test` (*a coat with a pocketed key lists under worn with its pocket line; a pocketless
  shirt is worn, not a holder*); `search.body.test` (unchanged assertions, the scope now reaches the coat);
  `perceives.holders.test:163`, `PerceptionLogic.visibleContents.test:77` (*your own: the coat as worn, its
  key through the coat*), `issueCard.pocket.test`, `GetController.test` (`get key from pocket` → a hand),
  `mql.universal.test`/`binder.perceived.test`/`ConsignmentShelf.worn.test` re-asserted where they bind a
  pocketed thing. Gates: `lint:controller-decisions` (508, no rise — the holder test is a read),
  `lint:controller-mutations` (137), `lint:perceived-surfaces` (0 — `buildScope`'s list goes to
  `resolveSearch`, as today's does), `lint:controller-functions` (63), `lint:combat-dynamics`.
- **W9e — the loft is a Container.** `Chamber`, `DryController`, `dry.yaml`, `api/containment.ts` docstring,
  `Chambered.ts`/`Atmospheric.ts` comments. Tests: `Chamber.test`, `Seasoning.chamber.test`,
  `Thermal.heatwork.test`, `Chambered.test`, carpentry's `sawmill.test` (`move(board, loft, Placements.IN)`
  lands in contents; `occupants()` is contents). Gates: `lint:placement-words` (`dry` accepts `in`),
  `lint:instanceable`, carpentry's vitest.
- **W9f — the docs.** `spatial.md` (§ The auxiliary-pair model: the table gains *key in a coat's pocket →
  container = the coat, pair `{coat, left pocket}`* and *board in the loft → the loft, `null`*; *the host is a
  SIBLING* becomes *for `on` and `from` the host is a sibling; for an enclosing member the host is the
  container itself*; § Two composition refusals → three; § The `Placement` vocabulary: three ship, the named
  region example cites `in`; § `getPlaced`; § `canPlace`; § D33 scoped to pairs; § `ContentPlacement`),
  `carrying.md` (§ Cast's pockets row; § Pockets rewritten — *a pocket is a region of its garment, which is a
  Container; the key is the coat's contents*; § D33; § Tiers), `persistence.md` (the self-region record),
  `perception.md` (one line: the pocket rule reads the pair's host, which is the container), `textiles.md` if
  it names Garment's composition, `lint-family.md` (`placement-words`: three members), `thermal.md`'s
  two-questions note (unchanged in effect; one clause), and **this plan**: § Host placement's `Garment` row
  and `/platform/placements/pocket` row marked *superseded by W9*; D26 and D33 annotated; § Risks.

Commit titles: `refactor(size-and-carrying W9a): in is containment — a pocket is a region of its
garment, and the garment is a Container`, `content(size-and-carrying W9b): pocket entries cite in; the
pocket document retires`, `fix(size-and-carrying W9c): a pocketed key persists in its coat`,
`refactor(size-and-carrying W9d): the carrier, inventory and search read pockets as contents`,
`refactor(size-and-carrying W9e): the drying loft is a Container`, `docs(size-and-carrying W9f): spatial.md
— an enclosing relation is containment`.

#### Tests — moved, retired, added

| test | fate |
|---|---|
| `ContainmentLogic.hostFollow.test` coat cases ×4 | **rewritten** as contents assertions (D-W9-8): no bring-along, `directFollowers` empty; the belt and tray cases stay |
| `Garment.pockets.test` ×7 | re-asserted on the coat as container; **+3** (shirt offers nothing · `move` throws · `look` lists once) |
| `Avatar.flip-restore.test:144` | re-asserted (the round trip); **+2** owned-key cases |
| `ContainmentLogic.arrival.test:44,:177` · `Carrying.flip.test` ×5 · `Inventory.tiers.test` · `perceives.holders.test:163` · `visibleContents.test:77` · `issueCard.pocket.test` · `search.body.test` · `GetController.test` · `mql.universal` · `binder.perceived` · `ConsignmentShelf.worn` | cite `in`; assertions on `getContainer()` of a pocketed thing flip to the garment |
| `Carrying.flip.test` | **+2** (home is the pocket · a guest's pocketed borrowed thing returns) |
| `Chamber.test` · `Seasoning.chamber.test` · `Thermal.heatwork.test` · `Chambered.test` · `sawmill.test` | the loft's occupants are its contents; `getPlaced(IN)` assertions → `getContents()` |
| `Creature.veto.test` | unchanged |
| none retired outright | the host-follow suite shrinks to the pair cases; nothing else loses a case |

#### Acceptance

- **The drive's assertions hold unchanged** (`packages/wire/tests/size-and-carrying.dirty.wire.test.ts`,
  the 22 steps — 1–4, 6, 14–15, 19 and 21 exercise pockets: a key to a pocket, *"Which — left or right
  pocket?"*, the breast pocket's 6 s, the inner-pocket letter found by `search` and shown to nobody, the
  cork in the buttoned pocket at 0 g, the restored key in its pocket). Re-run **once at /finalize** with the
  browser walk; mid-wave, tsc + `test:near` + the suites named + the touched packs' vitest (tailoring,
  tanning, generic-objects, carpentry, terminus).
- **Behavior changes, intended and named**: a pocketed thing's `getContainer()` is its garment; `put key in
  shirt` (no pockets) is refused as *nothing to put it in*, not `no-such-placement`; `move(x, coat)` with
  no fitting pocket throws; `put map in pack` on a pack row that authors a side pocket asks; a readied key's
  home is its pocket; a word that names no region on a plain Container throws.
- **Structure**: `grep -rn "placements/pocket\|Placements.POCKET" packages/` → 0; `Garment` composes
  `ContainerMixin` and `hasInterior()` is `false`; `Chamber` composes no `PlacingMixin`;
  `directFollowers(coat, …)` is empty for every pocketed thing; `ContentPlacement` of a pocketed key has
  `placement` and no host field; the `Carrying` interface stays at **14**.
- **No new mixin, Api, class, hook, registry, collection or document kind.** `hasInterior` is a method on an
  existing mixin; `placeIn` a module function beside `placeOn`; refusal 3 a clause in an existing hook; one
  document **deleted**.
- **No ceiling rises**: `lint:controller-decisions` 508, `lint:controller-mutations` 137,
  `lint:controller-functions` 63, `lint:perceived-surfaces` 0, `lint:object-verbs` 0, `lint:lib-statics`,
  `lint:duck-typing`, `lint:mixin-names`, `lint:instanceable`, `lint:imports`, `lint:module-scope`,
  `lint:placement-words`, `lint:template-census`, `lint:command-views`, `lint:combat-dynamics`, `lint:pm`.
  The full family at code-complete and /finalize only.

#### Risks

- **Command contributions per worn garment.** `ContainerMixin.commandContributions.self` adds five views for
  every Container a bystander can reach; a dressed body wears 4–6 garments, and the `cleanupOnDestruct`
  comment records 80 signed-out bodies' clothes once held in one NPC's stack. Mitigation: W9a measures the
  recency stack after dressing (`CommandApi.applyContainmentDelta` count before/after); if it grows by the
  garment count, `Garment` overrides `static commandContributions` to the empty shape (the body affords
  those verbs already) — a one-line class fact, recorded in D-W9-13.
- **The restore ordering.** A nested clone moved straight into its recorded region (D-W9-7) depends on the
  region's `canPlace` passing with whatever is already restored into that region — the slice order is the
  capture order, so a region that fit at capture fits at restore; a stale record (the row lost the pocket)
  is logged and the thing lands by `arrivalFor`'s choice, never thrown. Pinned by `Garment.pockets.test` 7
  and the two owned-key cases.
- **`move`'s `arrivalFor` ask on every Container.** One virtual call per move; the default returns
  `contents` at once for every container with an interior. A test stub that overrides `arrivalFor` on a
  non-agent container now takes effect where it was ignored — the suite run finds any (W8i-10's shape).
- **Two members answering `in` on one host** (a pack with a side pocket) asks instead of choosing silently
  — D-W9-9; no shipped row does it.
- **`SearchController.buildScope`'s walk** is a raw `getContents` read in a controller; `lint:perceived-surfaces`
  counts a surface only where the list reaches a person unperceived, and this list goes to `resolveSearch`
  as today's does. If the gate rises by one, the walk becomes `resolveSearch`'s own (it already takes
  `onBody`): the model gathers what the body wears.
- **Chamber's five tests + carpentry.** `getPlaced(IN)` → `getContents()`; a test that moved a board with
  `move(board, loft, Placements.IN)` still lands it (region zero's word is accepted).
- **The dispatch's word resolution** on a `Container & Placing` host: a word that is both a sibling member's
  and region zero's (`in` on a desk-with-drawer that also offers an `in` region) resolves to the named
  region first (`getPlacements().includes`), then `resolvePlacement`, then region zero — the order
  `PlacementOffers.choose` already applies; pinned by a `ContainmentLogic` case.

#### The review questions for this wave

- **P1** — nothing new: the pair, `PlacementEntry`, `arrivalFor`, `canAddContainable`, `ContentPlacement`
  and the `in` document are all reused; `hasInterior` and `placeIn` are a method and a module function
  beside the ones they twin (`placeOn`); a document and a constant are **deleted**. Searched: a `region`
  field on `Containable`, a `regions:` list on `Container`, a pocket object — rejected in D-W9-1.
- **P2** — `hasInterior` is `true` on every container but `Garment` (cloth has no inside); `Container` on
  `Garment` is the row's choice to use, as `Placing` on `Garment` already is (14 of 37 rows), and an empty
  one costs nothing visible (D-W9-13, one measured risk); refusal 3 narrows a composition, not a host.
- **P3** — a self-region record with no such region is logged and the thing placed by the hook; a word
  naming no region on a plain Container throws (it was silently ignored); `move(x, coat)` with no fitting
  pocket throws naming the mouth; a shirt with no pockets offers nothing and `put` says so; `setPlacements`
  throws on an enclosing member over a non-Container and the applier records it.
- **P4** — `MixinApi.isContainer`/`isPlacing`/`isAttired` narrowing throughout; `Chamber` and `Garment` are
  kernel classes; no pack imports change (carpentry's loft row names a kernel class).
- **P5** — the container decides the region (`arrivalFor`, `canPlace`); `PutController`, `InventoryController`
  and `SearchController` word and bucket; `DryController` stops resolving a member for a Container rack.
- **P6** — nothing new persists; the pair rides the slice it always rode, now the garment's; staged/live is
  unchanged for every row; no collection.
- **P7** — the member document loads with its host (`setPlacements` awaits it) and the restore pass ensures
  it; no search, no boot entry (`check-boot-entries` 81 holds).
- **P8** — `hasInterior` (the common word for region zero), `placeIn` (twin of `placeOn`); `in` keeps its
  name and `pocket` loses one; no class renamed; `Chamber` keeps its name (it is still a compartment with
  its own air).

**Still the owner's:** nothing in W9 that the ruling did not decide. Two consequences surfaced for a veto,
not a question: (1) **the drying loft** becomes a Container (D-W9-12) — the same inversion, one row, five
tests; (2) **a pack with a named side pocket asks** *"the inside or the side pocket?"* where D26-c chose the
main silently (D-W9-9) — no shipped row has one.


**✅ Done — W9 (4326f7a23 W9a · fd29d2dcf W9b · 3b63f4daa W9c · e55dc0a7e W9d · dc11127dd W9e · W9f this docs commit).** An enclosing relation is containment: `Container.hasInterior()` (Garment `false`), `arrivalFor`'s region choice for every Container given no word, `canAddContainable(item, { placed, region })`, `placeIn` beside `placeOn`, refusal 3 and the `setPlacements` row check, `getPlaced` over its own contents, pressing per region; 31 pocket entries cite `in` and `pocket` is deleted; a pocketed key persists in its coat's slice (and an owned one in the estate, `placedOn` naming the coat); the carrier, `inventory` and `search` read pockets as contents; the drying loft is a Container. Verified per sub-commit: server `tsc`, `test:near` vs the previous commit, the touched packs' vitest + `tsc`, the gates the plan names (individually); after W9f every pack's vitest and every `lint:*` individually (see the W9 report). The drive and the walk are /finalize's.

#### Decided while building W9

- **W9-a — the readers that had to move with the flip went in W9a**, not W9c/W9d: once
  a pocketed key's container is the coat, every reader of "the body's contents" sees it
  gone at once, so W9a (to stay green) carried `PerceptionLogic.visibleContentsOf` (a
  self-region thing is listed under its region, never as *In it*), `InventoryController.
  tiersOf` (a worn garment's pockets print under *Ready* exactly as before; a holder is a
  container **with an inside** — the plan's "or an enclosing region offered" is dropped,
  since a coat-as-holder would print *coat: empty* beside its pocket line), `Carrying.
  carryPlaces` skipping a worn container with no inside, and test re-assertions across
  perception, binder, flip-restore and three pack tests. W9c/W9d kept the rest.
- **W9-b — four pack brains/tests read the body's contents for "what it carries"**
  (`trade-shopkeeping` stocks + consigns, `trade-farming` farms; the distilling and
  terminus tests) and now count what is in a pocket of what the body wears. Not in the
  plan's list; found by running those packs' vitest at W9a.
- **W9-c — `CarryPlace` keeps its sibling arm.** The plan narrowed it to
  `{ host: Container; region? }`; a hanging region's host (`hangHostFor` — a belt, a
  halter) need hold nothing, so the type is `{ host: Container; region? } | { host:
  Placing; region }`. `Carrying` stays at 14 interface members.
- **W9-d — the region's name reaches the prose and the drill-in.** `in.yaml`'s prose
  names the region only when the host names it (`PutController` passes `''` for region
  zero and a bare member, which are paths); `LookController` heads a named region's line
  *In its left pocket* — the shared member heading (*In it*) would have printed the same
  line for every pocket.
- **W9-e — three test fixtures offered an enclosing region on a host that holds nothing**
  (`PutController`'s compartment, `Containable`'s enclosing host, `perception.can-reach`'s
  compartment): they compose Container with no inside, as refusal 3 requires.
- **W9-f — the loft's air reaches what is in it.** `Moisture.exposureOf` /
  `exposedScopeOf` read a place's contents only; a stack is now the loft's contents, so
  both accept a **compartment with its own air** (Atmospheric, not Exitable) at exposure
  1 — what the loft's `in` placement gave it at the Placing default. A coach's cabin
  (Exitable) is still enclosed. Found by `Seasoning.chamber.test`.
- **W9-g — `DryController`**: a rack that is a Container and not Placing is checked by its
  tape measure (`fitRefusal`) and moved into (`move(target, rack)`), worded *in the loft*;
  `Chambered.applyChambers` requires a Containable Container.
- **W9-h — commandContributions per worn garment (the measured risk): no growth.** A
  wearer's recency stack goes 1 → 5 for four garments with or without `Container` on
  `Garment` (a bystander's 1 → 1): `Container`'s `self` bucket reaches only the item
  itself, and it contributes no `peers`/`environment`/`inventory`. No override.
- **W9-i — `lint:duck-typing` caught a probe** (`'placement' in entry`) that W9c's named
  gates did not run; fixed in W9d (474/474).
- **W9-j — `lint-family.md` has no `placement-words` entry** to update (the plan's W9f
  line assumed one); the roster is derived.

## Reachability wiring

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| stoop / crawl | `$P/cmd/movement/{stoop,crawl}.yaml`, category `movement` | `MobileMixin.self` (beside walk/sneak/run) | `$P/idea/LocomotionMode/{stoop,crawl}`; body plans' `locomotionModes` | the mode singleton is resolved by `LocomotionApi.modeOf` on first use (platform rows resident) | `scope: ["me:e:exits", …]`; the exit's `clearanceRefusal` words the mode that works |
| the builder lens | `$P/cmd/author/lens.yaml`, category `author` | `AuthorMixin.self` | none | `heldExtents` resolved at `lens on` | `values: [on, off]`, optional |
| readying an instrument | no new verb — `readies: true` on `measure`/`analyze`/`read`/`light`/`pour`/`fill`/the craft tools' tool args | the views already afford them | the holster row's `shapedTo` | the bound thing | `readies:` runs after binding, before the controller |
| pockets | `put <x> in <garment or pocket>` (shipped `put`) | `Garment`'s pocket offers via `putPlanFor` (Placing members) | `placements:` pocket entries on garment rows; the `pocket` Placement document | `Placing.setPlacements` `ensure`s the document when the row hydrates (as every placement does) | `canPlace(item, name)` → the member fit |
| the belt and every from-host | `put <x> on <belt>` / `get <x> from <belt>` / `i <belt>` (shipped `put`, `get`, `inventory`) | the host row's `placements: [from]` via `putPlanFor` | the belt/bandolier/harness/strap/saddle/ring/rail rows; `hangs`/`fastens` on the `from` document; `tensileStrengthMPa` on material rows | the `from` document is resident with every placement; the material is the row's | `canPlace(item, 'from')` → length + mass; `roomFor` words the rest |
| the builder lens, `query`, `find`, scripts, cards, `look`, `inventory` | shipped verbs | — | — | — | every surface's list passes `PerceptionApi.perceived(viewer, …)` before binding, prompting or showing; `lint:perceived-surfaces` holds it |
| `remove backpack` | shipped `remove` | `Wearable` | the `Pack` row claims `[back]` | — | — |
| tiered inventory | `inventory` + options | `requiresAnimate` (as today) | — | — | `inventory <person>` is gated by `perceived` |
| the mule and the lead | `tie <rope> to <halter>` (shipped `tie`) | `Tieable` on the halter row | halter, mule, saddlebags, panniers rows | the rope's anchor is the halter | `tie`'s load scope reaches the worn halter on a peer (perceived: outermost) |
| the tarp | shipped `cover` | the cart row's coverable answer | tarpaulin row | — | `cover`'s target scope |
| headlamp | shipped `wear` + `light` | `PortableLight` is Wearable + Switchable | the smithing row's `slotClaims` | — | — |
| crawlway / ladder / the low door / the stair's turn | — | — | two kind rows in generic-objects; `turn:` on `stair`; the low door is `opening:` on the drive place's own `exits:` entry | `applyExits` clones the kind and binds the per-site opening | — |
| the enclosed-place diagnostic | — | — | — | `Template.applyProps` at install | — |
| `lint:body-moves`, `lint:perceived-surfaces` | `pnpm -C packages/server lint:family` | derived roster | ceilings in the scripts | — | — |

Every verb above is conferred by a `commandContributions` static or a shipped view;
`lint:reachability` refuses a view in any other state.

## Acceptance-criteria coverage

| criterion | waves |
|---|---|
| nothing loose on a body after any act and after a restart | W0 (census), W4/W5 (ports), W7 (veto + `placeLoose`); drive 1, 21 |
| the nearest perceived thing wins; single-command pick up / ready / put away; every refusal names what works | W3 (one rule), W4 (`ready`, `stow`), W5 (`put` → home); drive 3–5 |
| a belt — or anything things hang from — holds attachments by its length, says the room in words, and a loadout is assembled with `put` and `get` | W1 (the hanging rule on `Placing`, `roomFor`, `bearsKg`), W5 (the worn length, `i belt`), W6 (the rows); drive 4 |
| low door, crawlway, ladder, stair's turn, pond behave by size and body, in actionable words | W1 (turn, fit), W2 (clearance, modes, hands, wet), W6 (places); drive 9–11, 16 |
| `inventory` by tier + the burden in words | W5, W7; drive 2, 18 |
| no verb shows/names/counts/asks about an unperceived thing; MQL names the same things for everyone | W3 (the resolver universal — `mql.universal.test.ts` pins player = system mode — and every binding/showing surface through `perceived`, the lint at 0), W5 (the pockets that cover), W7 (run over the wire); drive 12–15 |
| the builder lens inside held extents; plays plainly without | W3; drive 20 |
| every character restored carries exactly what it carried | W4 (homes by index), W7 (`placeLoose`); drive 21 |
| hands are scarce in a fight: a held light, a shield and a two-hander compete; two hands by use or by weight; nothing dropped for you | W4 (`handsFor`, `ready`/`stow`'s never-drop refusal, the shield as a hand in `EquipControllerBase`), W6 (the arms audit, `greatsword`/`longsword`, the shield's `back`); drive 7, 8 |
| a pack animal carries only in what it wears, as its body bears, led on a held rope that takes a hand | W4 (lead, hands), W6 (mule, tack); drive 18 |
| a hitched cart fills the hands it says, fits a way by size, parks with its load | W4 (handedness), W2 (cart clearance), D30; drive 18 |
| weight follows gravity and buoyancy; a thing leaves an open container when nothing presses it | W1 (pressing, `gravityNow`), W4 (burden × g); drive 16, 19 |
| the soak expedition's staged twin (food and water consumed on the body's clock lighten the pack) | W4 (burden), W5 (`inventory --weight`); drive 17 — the staged twin of the soak drive's one step |
| the R5 look: the new and changed places by day and by headlamp at night | W6 (the places, the headlamp row); drive 22 |

Every acceptance criterion and every drive step (1–22) is mapped above; the made/handed
idioms (drive 18's `cook`/`buy`/`give`) are W7's.

## Test & gate strategy

- **Unit** (per wave above): the fit table, the envelope, the clearance ladder, the
  holder rules, the one reach rule, hands/grip, homes round-trip, gravity, release,
  pockets as members and the host-follow, the inventory views, the two census gates' fixture tests.
- **Only the drive proves:** the first-load placement of a real pre-flip snapshot (step
  21 — the wire file stages a **fixture `holder_snapshots` record** with loose contents
  in its `ContainerSlice` and no `worn` entries for them, written through `testharness
  snapshot <character> --fixture size-and-carrying/pre-flip.json` before the restart,
  and reads the character back after it), the combat beat's narration (steps 6, 7), the
  browser's card (the walk).
- **The blocking drive** (`packages/wire/tests/size-and-carrying.dirty.wire.test.ts`,
  `DIRTY_REASON`: hands every step its gear and leaves it where the step left it) — the
  22 steps, each tagged `instant` · `short` · `staged` and `player` · `staged` **as
  tagged in the requirements**; the stager is the `testharness` wizard seated on the
  extents: it hands gear and the staged bodies (`testharness hand`, the draconicus and
  gnomus bodies for step 7), sets gravity (`testharness gravity 0`), knocks a character
  unconscious (`testharness afflict`), advances the clock (step 17), removes an item from
  a shut pack (step 14), stages the pre-flip snapshot (step 21). **Each checkpoint is
  made to fail once on purpose** (B2). Step 21 is the R4 restart; step 22 the R5 look.
- **The soak drive** (`size-and-carrying.soak.dirty.wire.test.ts`): the two-hour
  expedition at 12× — the pack's food and water consumed on the body's clock, the burden
  line falling. Its **staged twin** in the blocking drive is **step 17** (a wizard
  advances the clock four hours on an online body carrying food and water —
  `nourish`/`advanceWorldClock` — and what it ate and drank is gone from its pack, the
  burden line lighter). Named in the MR for the soak lane.
- **The walk** (`e2e/tests/size-and-carrying-walk.spec.ts`): pick up two things, open
  the inventory card and read the tiers, put one in a pocket, stoop through the low
  door, look at the other character — once, at code-complete (B3).
- **Gates:** `lint:family` every wave; `lint:body-moves` falls W4 → W5 → 0 at W7;
  `lint:perceived-surfaces` → 0 at W3. `pnpm test` at code-complete and at `/finalize`
  only; `test:near` + touched packs' vitest between.

## Risks & opens

- **Garment gains `Placing`** — a mixin added to a 29-row class; `static _mixinName`
  widening (slot.md's warning) and the `AssembledMixin` interplay (`Garment.ts:80`).
  Verify the TypeScript compile cost first. Placing's class default `placements` must be
  `[]` on Garment, or every shirt offers `on`. ⚠ `Placing`'s two composition refusals
  (spatial.md § *Two composition refusals*) must be checked against Garment's stack
  before W5.
- **Pocketed and hung things live in the wearer's contents, not the garment's** — so
  the host-follow is a rule of moving (D33, W5), the one place the "ham in the room"
  model costs something; `ContainmentLogic.hostFollow.test.ts` pins it. ⚠ *Superseded
  for pockets by W9: a pocketed thing is the garment's contents and follows as contents;
  only hung (`from`) and set-on (`on`) things are the wearer's, with the pair.*
- **A belt's strength number** is a new material property with no reader before this
  build; its values are grain (leather 20 MPa, hemp 60, canvas 30, iron 200, steel 400)
  and unset is unbounded, so no shipped row changes behavior.
- **Names are the asker's (owner, 2026-11-11, decided).** What a thing answers to is
  the object's own method, `getKeywords(viewer)`, which MQL calls with the asker — the
  object decides (a disguised person answers to the name you know them by), MQL holds no
  rule. A name is a belief the way `me` is a perspective; the resolver still returns the
  same objects for everyone.
- **`pushDirect`'s gate removal widens what a verb can bind in principle** — every
  surface filters, but a brain or logic singleton calling `MqlApi` in system mode already
  saw everything; nothing new is reachable by an actor, since the binder filters. The
  universal test and the lint are the proof, not an argument.
- **`gravityNow` before the first resolution** reads 9.81 — a zero-g room read in the
  first second after boot weighs things; acceptable, documented. If the exposure cache's
  rebuild hooks are not enough to re-resolve, resolve on `setGravity` and `onMoved` of the
  place only.
- **`Stackable.getMass()` is per-unit on two hosts and total on two** — this build reads
  each host as it is for volume; the normalization is a `/finalize` finding, not scope.
- **Shipped rows that stop fitting** (W1/W2 acceptance): an authored chest holding a
  pole, a prop too big for an enclosed room, a way narrower than a body. Each is a
  finding fixed on the row, listed in the wave's commit; never a widened rule.
- **The `cover` act's protocol** for the tarp: read `$P/cmd/device/cover.yaml` and its
  controller before W6; if `cover` is bulk-only (a pan), the cart answers the same
  protocol method — no second verb.
- **Combat's `WeaponSwitch` generalization** touches `CombatLogic`'s instrument
  suppression (:1787, :4148); a non-weapon drawn mid-fight must not become "the
  instrument". Keep the countdown, drop the weapon assumption only where `ready` enters.
- **Performance of `fitRefusal` at the chokepoint** — every move into a container runs
  three rotations and a capacity sum; the sum is O(contents). A restock into a crowded
  store is the worst case; measure in `pnpm bench` if a drive slows.
- **Sibling drives at W7** — build-3 (navigation) and build-4 (load-on-use) drives
  assume today's `get`; the flip wave is scheduled after they land or with their
  owners told (the MR says which).
- **Open (the build decides, records in the plan):** whether `put <x> in <garment>` with
  one pocket takes it silently or asks (the `putPlanFor` single-offer rule says takes);
  the exact `CARRYING_DEFAULTS` numbers (set so a human holds a 10 kg one-handed and a
  1.2 m staff two-handed; a gnome a 4 kg / 0.6 m).

## Deferred seams

- **Skill shortening a draw** → [combat-slate](../slates/builds/combat-slate.md) (open
  question added 2026-11-11): practice should show in `readySeconds`, but no quick-draw
  competence exists and the shipped switch is ungraded; the attach point is a factor on
  `Carrying.readySeconds`.

- **Folding** → [folding-slate](../slates/builds/folding-slate.md): `foldPackingFactor()`
  is the attach point; the crease model replaces the number.
- **Autocomplete** — no object autocomplete exists on either side; when build-3's
  navigation pane or a later client build adds one, it is a surface: its candidate list
  passes `PerceptionApi.perceived(viewer, …)` before a word is suggested, and
  `lint:perceived-surfaces` counts it (recorded on the client-knowledge slate).
- **The belt strip on the client** (each attachment drawn as wide as it takes) → the
  client slate; the server's `i belt` and `roomFor` words are the whole of this build.
- **Inspecting another player inside your extent** → access-slate § Inspection: rule 2
  of D24 is where a grant would enter.
- **The interior place inside a creature** → the bestiary.
- **Zero-g locomotion** → worlds-slate; this build only refuses to assume Earth.
- **The scale envelope** → db-performance-slate § 7 (capacity is physical here).
- **The bag of holding** → spellbook-slate (`transmissionFactor` stays the seam).
- **`Stackable.getMass()` convention** → a finalize finding / the narrowing slate.
- **Per-individual stature** (a child swims where an adult wades) → physiology, when it
  arrives; `Species.getStature()` is the read to override.

## Critical files

Read first: `docs/requirements/size-and-carrying-requirements.md`;
`docs/slates/builds/size-slate.md` § 8–9; `docs/subsystems/{spatial,slot,embodiment,
encumbrance,boundary,locomotion,perception,mql,construction,bulk,cordage,conveyance,
persistence}.md`; `docs/plans/controller-liquidity-plan.md` § Grounding *MQL and reach
today*, W2, W20 (on master after the merge, or in its sweep's subsystem docs).

Code: `$S/api/containment.ts`, `$S/platform/idea/api/ContainmentLogic.ts`,
`$S/lib/spatial/{Container,Containable,Sealable,Exposure,Line}.ts`,
`$S/lib/slot/{Slotted,Attired,Wieldable,Wearable,BodyPlanSlots,Haulable,Hauler,Foldable}.ts`,
`$S/lib/encumbrance/{LoadBearing,Buoyant}.ts`, `$S/lib/vitals/Vitals.ts` (grip,
severance, the consciousness cascade), `$S/lib/creature/Creature.ts`,
`$S/lib/material/{Tangible,Material,Integrity}.ts`, `$S/lib/craft/Assembled.ts`,
`$S/lib/biome/Atmospheric.ts`, `$S/lib/location/{Location,WaterPlace}.ts`,
`$S/lib/boundary/{Exit,Exitable,Boundary,Conduit}.ts`, `$S/lib/spatial/Mobile.ts`
(`crossExit`), `$S/platform/idea/LocomotionMode.ts`, `$S/platform/idea/api/
{LocomotionLogic,PerceptionLogic,MqlLogic,CommandLogic,PersistableLogic,CombatLogic}.ts`,
`$S/api/{perception,mql,command}.ts`, `$S/api/mql/{resolver,scope-walk,predicates,types}.ts`,
`$S/lib/command/{CommandGiver,CommandDefinition}.ts`, `$S/lib/command/validators/
{canReach,mustNotBeShutAway}.ts`, `$S/platform/idea/cmd/inventory/{Get,Give,Inventory,
EquipControllerBase,Drop}Controller.ts`, `$S/platform/idea/cmd/perception/
{Look,Query,Measure}Controller.ts`, `$S/lib/script/Expression.ts`,
`$S/platform/idea/{CardRegistry,MqlSubscriptionRegistry}.ts`,
`$S/platform/thing/equipment/{Garment,Pack,PortableLight}.ts`, `$S/platform/thing/
{Rope,LineEnd}.ts`, `$S/lib/character/Avatar.ts`, `$S/platform/agent/PrimaryAvatar.ts`,
`$S/lib/stuff/Template.ts` (`applyProps`), `$S/lib/combat/WeaponSwitch.ts`,
`packages/server/scripts/check-lib-statics.ts` (the census template),
`packages/client/src/components/cards/CardBodies.tsx`.

Content: `$C/species-and-names/content/stuff/idea/species/BodyPlan/{biped,quadruped}.yaml`,
`$P/idea/LocomotionMode/sneak.yaml`, `$P/thing/boundaries/*.yaml`,
`$C/generic-objects/content/stuff/idea/exits/stair.yaml`, `$C/generic-objects/content/
stuff/thing/gear/backpack.yaml`, `$C/trade-tailoring/content/trade/tailoring/thing/
{trousers,coat}.yaml`, `$C/transport/content/system/transport/{thing/wagon,agent/
draft-horse}.yaml`, `$S/config/char-gen.yaml`, `$C/saxonberg-lounge/content/world/
lounge/location/bar.yaml`, `$P/cmd/inventory/{put,get,inventory}.yaml`,
`$P/cmd/perception/measure.yaml`, `packages/wire/tests/controller-liquidity.dirty.wire.test.ts`
(the drive's shape), `e2e/tests/cordage-walk.spec.ts` (the walk's shape).

## Drive record

**The blocking drive** is `packages/wire/tests/size-and-carrying.dirty.wire.test.ts`
(the 22 steps, each tagged pace · actor as the requirements tag it; step 1's
full-hands newcomer split out as 1b; step 22 runs before the restart, 21).
**The soak drive** — for the soak lane — is
`packages/wire/tests/size-and-carrying.soak.dirty.wire.test.ts` (a game day at
12× in real time; not run here). Run against one world on `WIRE_PORT=2014`,
this worktree's DB dropped before every full run; ten full runs and targeted
`WIRE_REUSE` reruns of single steps, 2026-11-12.

**Final run (run 11, fresh DB, `8248f6996`):** all 22 steps ✓; 1b ✗ (pre-existing residence defect, below). `pnpm test:near` green after the last source fix (1181 files, 11422 tests); every lint gate touched run individually and green (`controller-decisions` 508/508, `body-moves` 0, `subcommand-words` 49/49, `duck-typing` 474/474, `perceived-surfaces` 0, `controller-resolution` 80/80, `controller-mutations` 137/137, reachability, census, multi-act, graph-walks, lib-statics, combat-dynamics, placement-words, command-views, one-word, instanceable, mixin-clusters).

| step | result | what it found (fixed unless marked) |
|---|---|---|
| boot | — | A fresh world would not boot: the mill floor's clone died `canAddContainable veto: no-room` — the tape measure asked a GROWING plant to pass a bed's mouth (hevea tub, coppice panel, silk-house bed). `8632e8432` |
| 1 | ✓ | Every `get` landed "in hand" ×4: a body is judged only when its species row is resident, and nothing loads `homo/sapiens` in a fresh world or after a restart (`e7e00bf81`, then `d133f3a18` — `Creature.onCreate` for beasts); with it loaded a mug went onto a FINGER — ring slots attach at the hand (`0c69a77ec`). |
| 1b | ✗ **pre-existing, not this build's** | Duncan Hall's SECOND let throws at `Location.addExit` ("non-cardinal direction 'unit-2' requires the destination to be in a different zone" — corridor and dorm room are members of ONE `DormWarren` frame, master's `crossesHoldingFrame`, `5f54d22e9`); every move-in theme logs the same failure for unit 1. The daypack hand-off no longer voids a let (`fea3fa41a`, `granted` fallback), but the second newcomer is never housed. For the residence owner. |
| 2 | ✓ | Region headings read "In your a plain student shirt's breast pocket" (`d133f3a18`). |
| 3 | ✓ | `put`'s target was `peers`: `put key in "coat pocket"` put the key in the lounge's coat-check rack (`aa69a3376`). A coat's four pockets ask "Which —" by name (D26-e). |
| 4 | ✓ | Readying was silent — the compass just appeared; now *"You put your arming sword in … and pull out your surveyor's brass compass from your leather belt pouch"* (`eb9498a87`). `get X from <a host on you>` could not reach your own belt (`aa69a3376`). A sword was "put away" in a trouser pocket — a pocket has a depth now (`382586085`). The hang rule (W7-d) hangs a pouch on RECEIPT, so `put … on belt` is exercised at the refusal ("no room from a leather belt"). |
| 5 | ✓ | (Driven with `measure strike with compass`: the default `reachable` tool binding readies nothing when it binds several.) |
| 6 | ✓ | Beats by `readySeconds` (eval): both hands full 6 s · a free hand 3 s · holster 1.5 s · key in the open pouch 3 s · in the buttoned breast pocket 6 s. In the fight the act runs on the compass where it is and the hands' words land with the switch — recorded, not asserted. |
| 7 | ✓ | `fight draw` said "no sidearm" for a sword in its belt scabbard (nothing is loose after the flip — `cf1ff059d`), then for any carry refusal (`eb9498a87`); with the right hand on the shield it tried to stow the shield though the left was free — a free hand beats an occupied claimed one (`382586085`); `wield` said "you don't have a greatsword" for the one in the scabbard — `mustBeInInventory` read only direct contents (`b9d3e8e21`). The full-hand words name both things and offer each to drop (`edb57b7b1`). Draconicus holds the greatsword one-handed beside the shield; the gnome's 4 kg shield already takes both its hands. |
| 8 | ✓ | The transport pack's twelve-foot setting pole had no box — one hand beside a lantern (`3f7c6442e`); "Your hands are full" was said with a hand open (`eb9498a87`). |
| 9 | ✓ | `remove backpack` left the pack LOOSE on the body (`eb9498a87`, `settleReleased`). |
| 10 | ✓ | The steading shipped the lookout way with no ladder in either room: `climb` was no verb (`24acb0859`). |
| 11 | ✓ | No chest in the commons authored a box (`3f7c6442e`: tool chest + barrel in the barn). |
| 12–13 | ✓ | `reachable` put the giver FIRST, so `i human`/`attack human` bound yourself (`aa69a3376`, giver last); `human` still asks "which?" offering yourself — the drive names people by their card's `#id`. The four probes on the covered letter answer exactly as for a person with none. |
| 14 | ✓ | Your own shut pack's contents read "something" (`edb57b7b1`); staging tool `testharness vanish` (`382586085`, renamed `b9d3e8e21`). |
| 15 | ✓ | A search FOUND the inner-pocket letter and nothing showed it (the pocket is its scope, not the body) and `get letter from <them>` could never reach into a body (`382586085`). |
| 16 | ✓ | The yard and reed bank were plain Locales: `swim` was no verb, and the reed bank stranded a swimmer (`fea3fa41a`). The pack's letter goes to pulp; the oilskin's comes out dry. |
| 17 | ✓ | Staged twin of the soak drive: the 4 h jump, then the meal out of the satchel; the ration count falls. |
| 18 | ✓ | A mule could not be tacked — handing a beast its tack now puts it on (`eb9498a87`); a tied lead stayed in the leader's hand slot as a phantom (`f50499b98`, the chokepoint vacates); a handcart had no size (`24acb0859`) and no steading way admitted wheels (`89085579f`), the `wheeled` mode was never loaded so NO hitched cart could be dragged anywhere (`82f122c13`), and a cart was fitted through a gate on its side (`8248f6996`). Handed to a full-handed person, a cup is refused before it moves. ⚠ A ration `put` in the handcart "seats with a click" — it took the cart's `bed` slot (a seat) — ✅ fixed `ace03e229` (`put` is offered a posture-bearing slot only for a `Posed` body). ⚠ The room's reach stops at the mule: its panniers are named through it (`put ration in mule:i:pannier`). |
| 19 | ✓ | A mug dropped at 0 g "hit the floor hard" — `fallOnto` read 9.81 (`d133f3a18`). "Still takes both hands" was not met — `handsFor` read the pack's OWN 2 kg, never what was in it (and weightless an open pack's load drifts out of it); D10-d judges the LADEN mass with no gravity in it. Re-driven alone (2026-11-12, cold world, port 2014): a shut canvas pack staged bigger than the crawlway (0.85 × 0.5 × 0.9 m) holding a mail hauberk and six rations (13 kg) — burden line empty at 0 g; `go east`/`crawl east` refused *"Your canvas backpack won't go through — `remove backpack`"* (the pack goes through after the body by its own cross-section, D10-d); a pocket refuses it; with a lantern held `get` refuses *"The canvas backpack takes both hands — you're holding the punched-tin lantern"*. |
| 20 | ✓ | The lens labeled a shut chest's contents "something [builder]" (`edb57b7b1`). No staged NPC owns the chest (a content chest in the stager's extent). |
| 21 | ✓ | Holdings compare as a SET (the restore reorders the worn list). The pre-flip record (`stageLooseSnapshot`) is placed: mug and bowl in hand, key in a pocket, the lantern off the body. ⚠ Its "would not fit anywhere on you" line is spoken during the restore, before the session attaches, and is lost — ✅ fixed `7cf954317` (a player's body places what it found loose at `enter`, the estate-touch shape). |
| 22 | ✓ | `switch` was no verb for a worn headlamp (`97588cd5c`, the Switchable protocol confers it). The pond is looked at from its shore. |

**Runs 3–5 died `JavaScript heap out of memory`** in a long clock jump, the log full
of keepers' `get 1 cola` refused once per CANDIDATE on every beat; a refused `get`
stops asking now (`51c08bc74`) and runs 6–10 peaked at ~0.8 GB. **The open findings, fixed after the drive (2026-11-12)** — each reproduced in an
isolated unit test that failed first; not yet re-driven:

- ✅ **The keepers' hands full** — `e143d028a`. Every card `issueCard` dealt took
  `receive`'s hands-first order, and a purchasing NPC never puts its house card away
  (the brains skip it), so one hand was gone for good: one good per beat, the second
  `get 1 cola` refused `nowhere-to-carry` every beat. A card is kept in a pocket now
  (`prefer: 'pockets'`, a hand only when no pocket takes it); the house card's
  idempotence reads the carried tree.
- ✅ **`shelf consign` and the brains' goods** — `da84ff4d4`. After the flip a body's
  contents are everything on it, worn included: consign moved a worn shirt onto the
  counter, `stocks` shelved the keeper's apron, `consigns` offered the hand's costume,
  and a dressed keeper was never idle. Consign takes what you CARRY and refuses `worn`
  (*take it off first*); the brains read `Carrying.carriedThings()`; `Carrying.wears`
  is the model read MQL's `:worn` uses. ⚠ The `not-held` line itself was not
  reproduced in isolation (a held crate binds through the real `shelf.yaml`) — the
  next drive confirms Wen Hartley's beat.
- ✅ **The mule's tack across a restart** — `b7b6b9216`. Cast is never a room's
  content, so everything a player put ON the re-minted mule was in no record at all.
  `DraftAnimal` keeps its own record (`PersistableMixin` + a `holder_snapshots`
  hydration source, the `Stockpile` shape; keyed by its row — cast is one-per-path).
- ✅ **The handcart's bed** — `ace03e229` (step 18 above).
- ✅ **The restore's lost line** — `7cf954317` (step 21 above).

**Staging tools built** (`e9c681a12`, `7cd98fb61`, `382586085`): `testharness
gravity <m/s²|clear>`, `testharness afflict <name> <condition> [stage]` (a toxin
condition dosed past its top band for an hour), `testharness species <name>
<species>`, `testharness vanish #<id>`, and `POST /auth/test-snapshot` +
`stageLooseSnapshot(handle, templates)` (the pre-flip record; the plan's
`--fixture` file is the template list, a route because a handle maps to its user
only in the backend).

**B2 — every checkpoint can fail.** `SC_B2=all` swaps each step's key expectation
for one nothing satisfies (`SC_B2=2,13` runs a list). `SC_B2=all` against the
run-11 world: 1, 1b, 4–12, 14, 15, 18–22 red at their own `B2 inverted at step N`
labels (6 and 21 by their inverted comparisons); 2, 3, 13, 16, 17 were reached
in a targeted `SC_B2=2,3,13,16,17` run on a fresh world (step 1 green, the five
red at their labels). Every checkpoint has gone red once.

**Reachability** (verb · affordance · data · load · arg gate), each driven:
stoop/crawl ✓ (step 9); the lens ✓ (20); pockets ✓ (3, 6, 12) — after `put`'s
target scope fix; belts ✓ (4, 10); readying ✓ (4–6) — the default tool binding
readies nothing when several tools are in reach (name the tool); the mule and the
lead ✓ (18) — the **affordance** link was missing (no way to tack a beast) and is
the `give` path now, and the **arg gate** stops at the animal (MQL names its
panniers); the tarp ✓ (18 — `close handcart` with the tarpaulin in it); the
headlamp ✓ (22) — the **verb** link was missing (`switch` conferred by nothing).


**Run 12 (2026-11-12, after the five post-drive fixes; fresh DB, `WIRE_PORT=2014`).**
All 22 steps ✓ but 21; 1b ✗ (the pre-existing residence defect, unchanged —
Katie's second let still throws at `Location.addExit`). Step 21 was tightened
to assert the restore's line (the wire `Session` now keeps what entering said,
`arrival()`) and to check the steading mule's tack across the restart. It
found two defects, each reproduced in a unit test that failed first:

- The line now reaches the player, but restored in the dark it read
  *"something would not fit anywhere on you"*: it is said once the thing is
  off the body, where the sight gate obscures it. Named with `bare` (no
  perception gate) — *"Your punched-tin lantern would not fit anywhere on
  you; it is at your feet."* `0ba536169`.
- The mule kept its tack across ONE restart and lost it across the second
  (`b7b6b9216` was half the fix): the first restore re-minted the saddle into
  the mule, and the derived title's rung 2 ("the hands it lands in") titled it
  to the mule as a player. A beast keeps no estate, so its next capture
  skipped the tack as somebody else's goods. Rung 2 titles only a body that
  keeps an estate, or an organization. `e8da0fdfe`.

**Run 13 (fresh DB, `e8da0fdfe`):** all steps ✓ but 1b (as above) and 21,
which read the mule in the dark after a night restart (*"someone ── Wearing:
something and something"*) — read by daylight now, `e4c7d55b8`; step 21 then
✓ across the world's second restart (the mule wears its saddle and halter,
its panniers in it). ⚠ The cold boot took past the harness's 420 s budget
once (`WIRE_BOOT_TIMEOUT=900000` used).

**The server log, the two open checks.** The keepers' `get` declines are one
per trip now, not one per candidate per beat: the hand fills both hands
(*"picks up a can of cola"* ×2), the third `get` is refused `nowhere-to-carry`
and stops, and the hand walks to the counter — run 13's pre-restart log has
Dez 3, Bram 3, Rufus 2, Marn 1 over the whole drive (`e143d028a` holds). No
`shelf consign` `not-held` anywhere, and no Wen Hartley decline at all
(`da84ff4d4` holds).

**Browser walk** (`e2e/tests/size-and-carrying-walk.spec.ts`, Chromium against
vite on 5173 → the run-13 world on 2014, `AUTH_MODE=test`,
`SAXONBERG_TEST_WORLD=1`): steps 1–3 at Dave's bar, 9 from the treeline to the
Old Steading's low door, 12–13 a second login looking at a first. It found:

- `get mug` at a back-bar of three takes every mug it names (`get`'s targets
  are plural): one to each hand, and the third refused as *"Your hands are
  full — the mug and the mug — and the mug won't fit in your pockets."* Two
  alike read *"both mugs"* now and the refused one *"another mug"*
  (`2bb35f8a1`). ⚠ That a bare `get mug` takes all three is the binder's
  `objects` cardinality, not this build's — recorded, not changed.
- `look` and `i` on a body grouped its other things as *"In it: an aether
  implant and a key"* (and the mule's panniers *"In it"*) — a body is not a
  box: *"Carrying:"* (`592a8fcba`). ⚠ Left as found: the self look still
  groups the implant under *Carrying* (the grouping pins an implant as carried)
  while `inventory` lists it *Worn*.
- Walk-side, not defects: `wear` is durative and silent until done (*"You put
  on a linen coat"*); a key handed to free hands goes to a hand (hands first,
  D11); the yard holds earlier walkers, so the second login names the first
  by the `#id` their link carries, as a click does (`i human` binds whichever
  human is first; `look human` asks which).

No pitch-dark rooms by day, the stoop refusal names its form, the inventory
tiers and the burden read in words, and the letter in the inner pocket shows
on neither `i #id` nor `look #id` (which show the coat over the shirt, never
the shirt under it). Final run, the world rebooted on `592a8fcba`: 3/3 ✓.
