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
  :340 — every container, bodies excepted, D11) and worded at the verbs (`put`, `receive`)
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
  gate (D13) tests a body's envelope and each held thing's cross-section against the
  clearance, and each held rigid thing's `longest` against `turn`. Two kind rows ship
  (`crawlway` 0.6×0.6, `ladder`), and the shipped `stair` kind gains `turn: 2.2`. **A low
  door is not a kind** (owner review; requirements § Bodies and openings): it is one
  way's authored `opening:` on its `exits:` entry (the drive's low-door room authors
  `north: {destination: …, opening: {width: 0.9, height: 1.4}}`); a site that differs
  from its kind authors `opening:`/`turn:` the same way.

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
  item's Wieldable claim names two hand slots (a weapon's own say wins when larger);
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
  **The invariant:** `Creature.canAddContainable(item)` vetoes `'loose-on-body'` unless
  `this._receiving === item` (a TypeScript-`private` reentry flag set for the duration
  of `receive`/`seatInSlot`/`occupyAll`'s own move, of `placeOn` into a worn host, and of
  `restoreItem`); **off until the flip (W7)**, when W0's census must read 0 outside the
  allowlist (`Carrying`, `Slotted.seatInSlot`, `ContainmentLogic.placeOn`,
  `PersistableLogic.restoreItem`, `ConditionLogic` death → corpse, which is a `Thing`).
  `move()` is unchanged (slate § 8).
- **D12 — the loose-carry model retires at the flip.** `LoadBearing.getBorneBurden`
  drops pass (a) (contents at 1.25); every content of a Creature is a slot occupant, so
  the walk is slots only — hand slots at `LOOSE_CARRY_SURCHARGE` (renamed
  `HELD_SURCHARGE`), worn at 1.0, with **awkwardness** for held loads: `× (1 +
  AWKWARD_LENGTH × max(0, longest/stature − 1) + AWKWARD_BULK × volume/bodyVolume)`.
  `held` predicate = occupies a hand slot; `carried` = inside a worn container; `worn`
  unchanged. `Hauler.handsOccupied()` → `Carrying.freeHands() < handedness`.
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
  its home if it still fits, else refuse `hands-full`), then `seatInSlot(item, hand)` and
  the scene line (*you sheathe your sword and pull out your compass*); packed → refuse
  naming the pack (*take it off first*); elsewhere but reachable and fixed in place (a
  bench) → ok (used where it stands); elsewhere otherwise → `not-on-you`. **The
  dispatcher** calls `giver.ready(bound)` for any object arg declaring `readies: true`
  (a `FieldDefinition` field; `measure.tool`, `analyze.tool`, `read`, `light`,
  `pour`/`fill`'s vessel, the crafting tools) before the controller runs and renders the
  refusal; the controller is dumb. In a live combat session `ready` runs through
  `Combatant.beginWeaponSwitch`'s countdown generalized to any item: `combat.draw.
  seconds` from a shaped container (`shapedTo` set — a holster, a sheath) at the ready tier, `combat.switch.seconds`
  from anything else; `fight draw`/`fight switch` become callers of `ready`.
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

### Bodies and openings

- **D19 — the envelope.** `Creature.envelope(profile: BodyProfile): BoundaryOpening`:
  height = `stature × BODY_PROFILE_HEIGHT[profile]` (`upright 1.0 · crouched 0.6 ·
  prone 0.35 · horizontal 0.35 · varied 1.0`, a const beside `BodyProfile` in
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
  thing is the belief store's word, not a hiding — flagged in § Risks for the owner's
  eye). The head ordinal (`2nd knife`) stops being rewritten to an index inside the
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
  rule **and** open — an inner pocket under a coat fails at the coat; (3) the existing
  concealment/discovery/light rules. A cart under a tarp is a shut, opaque holder (D30).
  `isAnotherPerson` is the person test. `Attired.outermostAt` exists.
- **D25 — the builder lens is a verb and a memo, never a wizard check.** `lens on` resolves
  `AccessApi.heldExtents(giver)` once and stores it on the avatar (`Avatar._lensExtents:
  string[] | null`, runtime; re-resolved by `lens on` and cleared by `lens off`/logout);
  `lens` alone reports. `perceives` rule 0: viewer's `lensExtents()` non-null and the
  target's enclosing place's template path starts with one of them → perceived.
  `PerceptionApi.perceivedHow(viewer, target): 'plain' | 'builder' | null` lets a surface
  label a line `[builder]`; `look`, `inventory`, `query`, `find` label. Another player's
  body is never inside your extent for this rule (rule 2's person test runs first on a
  person; the lens applies to content, not people — Non-goals).

### Pockets, gear, inventory, the flip

- **D26 — a pocket is a named region offered by the garment, never an object, and the
  garment holds nothing itself.** `Garment` composes `PlacingMixin` only (class default
  `placements: []` — a garment with no pockets offers nothing); a pocketed thing lives in
  the **wearer's** contents with the pair `(garment, 'left pocket')`, exactly as the ham
  lives in the room with `(hook, 'from')` (`placeOn` :242–275). `Placing.placements`
  widens from `string[]` to entries `{member: <Placement document path>, name?,
  mouth?, volumeM3?, covered?, closes?}` (a bare string stays a one-member entry, so the
  shipped rows are untouched; `getPlaced(name)` and `canPlace(item, name)` key on the
  entry's `name`, defaulting to the member's word). One new Placement **document**,
  `/platform/idea/placement/pocket` (`encloses: true`, words *in* / *into*, prose *in
  your {{name}}*), beside `in`/`on`/`from`. Defaults by garment kind are the **row's**
  (`trousers.yaml`: two entries `{member: pocket, name: left pocket}` / `right pocket`
  with `volumeM3: 0.0008`, `mouth: {width: 0.12, height: 0.03}`; `coat.yaml`: two outer
  patch pockets + `{member: pocket, name: inner pocket, covered: true, volumeM3: 0.0004}`;
  `extends:` carries them). **Fit per member:** `Placing.canPlace(item, name)`'s default
  body asks `Container.fitRefusal(item, member)` with the member's mouth and volume — the
  owner's "fit is a `canPlace` refusal at the chokepoint" literally (`placeOn` :262).
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
  trousers (`/stuff/thing/clothes/student-trousers`) gains `pockets:` (two patch) and the
  tops one or two (the field jacket four); the Arrival Note coin `receive`s into a pocket.
  The lounge's bar `props:` gain three `/trade/hospitality/thing/mug` (step 1).
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
  calls `Carrying.placeLoose()`: for every content that is not a slot occupant,
  `receive(item)` (hands, then pockets/packs by the setting); what finds no place goes to
  the player's **residence** — the place of `ParcelApi.heldUnitOf(this)` (every player has
  a dorm room, residence.md) — with a scene line queued to the avatar (*your crate would
  not fit anywhere on you; it is in your room*); an NPC's overflow goes to the place it
  stands in with a `DiagnosticApi.record` naming the row (the author fixes the loadout).
  `installDefaultLoadout`, `Gus`'s `CARRIED`, `Costumed.wearGarments` and `props:` into
  a body all go through `receive`. Nothing is ever destroyed or left on the floor.

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
| `Garment` + `PlacingMixin` (class default `placements: []`); `hangingLengthM` override while worn | `Garment` | every garment may offer pockets or a hanging length, and zero is the honest count (a shirt with no pockets offers no region and `put` refuses `no-such-placement` as any Placing host does; a belt offers `from`). **Not `Container`**: a garment holds nothing — the wearer does. Not on `Wearable`; not on `Good` |
| `placements` entry widening (`name`, `mouth`, `volumeM3`, `covered`, `closes`) | `PlacingMixin` | every placing host may name its regions (a range's two plates, a coat's three pockets); a bare string entry is unchanged |
| `hangingLengthM`, `bearsKg`, `roomFor`, the member fit in `canPlace` | `PlacingMixin` | every placing host answers how long its hanging edge is and what it bears; a host with no `from` member never asks. One mechanism for belt, bandolier, harness, strap, saddle, ring, rail, pegboard |
| `tensileStrengthMPa` | `Material` row property | every material has a strength; unset = unbounded (a pegboard's authors need not care). Not on the belt row (the leather decides) |
| `hangs`, `fastens` | the `from` Placement document (and any pack's own hanging document) | a member's document says what the relation does; `on` fastens nothing, `in` encloses |
| `/platform/placements/pocket` | a Placement document row | the `in` family's vocabulary, one more member |
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

**The two tests, applied.** No guard re-narrows a host: `Garment.canAddContainable`
and `Creature.canAddContainable` are each host's own rule about its own contents.
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
  `lens` one word; no new class names at all after owner review;
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
  reasons: `Carrying.ts`, `Slotted.seatInSlot`, `PersistableLogic.restoreItem`,
  `ConditionLogic` death.
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

### W1 — size (D1–D7)

- `$S/lib/spatial/Dimensions.ts`; `$S/platform/idea/Form.ts` + five rows at
  `$P/idea/Form/`; `Tangible` fields `form`/`dimensions?` + `getDimensions/getVolumeM3/
  getPackedVolumeM3/foldPackingFactor` (`Foldable` override); overrides on `Assembled`
  (Σ parts via `TemplateApi`), `Bulkable`, `Stackable`, `Creature`, `Rope`; `Buoyant.
  displacementWalk` → `getVolumeM3`; class default forms on `Garment`, `Line`, `Sack`,
  `Sheet` (`static defaultForm`).
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

### W2 — bodies and openings (D8, D19–D22)

- `Creature.envelope(profile)`; `BODY_PROFILE_HEIGHT`; `LocomotionMode.hands`;
  `stoop`/`crawl` rows, controllers, views (`$P/cmd/movement/{stoop,crawl}.yaml`,
  `category: movement`, `scope: ["me:e:exits", …]` like `sneak`), controller seeds at
  `$P/idea/cmd/movement/{Stoop,Crawl}Controller.yaml`, **conferred by `MobileMixin.self`**;
  body plans: `locomotionModes` gain `stoop`/`crawl` on the biped and `canid` (W6), not
  the quadruped.
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
- Acceptance: the controller-liquidity baseline drive still passes except the rows its
  own plan marks as reach-rung dependent (re-record those with the commit saying so);
  drive steps 11–13 pass over the wire.
- Commit: `build(size-and-carrying W3): MQL names things for everyone; the acts apply perception; one rule for reach; the builder lens`.

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
- Leading in `Mobile.crossExit`; `Rope.tieTo` on a worn Tieable tack row anchors there
  (a halter), the end `receive`d by the tier.
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
- `char-gen.yaml` outfits unchanged (pockets arrive through the trousers rows).
- Tests: each pack's row test (`lint:instanceable` + the pack vitest); `lint:locations`
  on the new places; `lint:anatomy` on canid.
- Acceptance: `clone` of every new row succeeds in a wire smoke; `look` in each new
  place by day and by headlamp at night reads.
- Commit: `build(size-and-carrying W6): pockets on every garment, the leather goods, tack and the mule, the crawlway and the stair's turn, cups in the lounge`.

### W7 — the flip (D11–D13, D31–D32)

- Pre-check and record in the plan: `./tools/wt-status`, the open MRs; no sibling
  build is mid-drive.
- `Creature.canAddContainable` veto on; `LoadBearing` pass (a) removed and
  `LOOSE_CARRY_SURCHARGE` → `HELD_SURCHARGE`; `held` predicate = hand slot; `GetController`
  → `receive` with the refusal in words (hands full and nothing fits); `give`/buying/
  crafting output refuse in words when the recipient has nowhere; `Creature.onRestored
  → placeLoose` with the residence overflow and the message; NPC loadouts through
  `receive`; `lint:body-moves` ceiling → **0 outside the allowlist**; docs graduate
  (encumbrance.md's loose model section replaced; embodiment.md § *Hand slots are for
  activities, not storage* rewritten; spatial.md § `put`/`give`; slot.md; mql.md;
  perception.md; locomotion.md; boundary.md's opening paragraph; new
  `docs/subsystems/carrying.md` and `size.md`; `CLAUDE.md` one-line map entries are the
  sweep's).
- The drive (`packages/wire/tests/size-and-carrying.dirty.wire.test.ts`) and the walk
  (`e2e/tests/size-and-carrying-walk.spec.ts`); the soak file.
- Acceptance: the drive's 20 blocking steps pass; the suite once; every other wire file
  passes or its failure is a `get`-meaning change recorded in the commit.
- Commit: `build(size-and-carrying W7): nothing sits loose on a body — the flip`.

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
| nothing loose on a body after any act and after a restart | W0 (census), W4/W5 (ports), W7 (veto + `placeLoose`); drive 1, 19 |
| the nearest perceived thing wins; single-command pick up / ready / put away; every refusal names what works | W3 (one rule), W4 (`ready`, `stow`), W5 (`put` → home); drive 3–5 |
| a belt — or anything things hang from — holds attachments by its length, says the room in words, and a loadout is assembled with `put` and `get` | W1 (the hanging rule on `Placing`, `roomFor`, `bearsKg`), W5 (the worn length, `i belt`), W6 (the rows); drive 4 |
| low door, crawlway, ladder, stair's turn, pond behave by size and body, in actionable words | W1 (turn, fit), W2 (clearance, modes, hands, wet), W6 (places); drive 7–10, 15 |
| `inventory` by tier + the burden in words | W5, W7; drive 2, 16 |
| no verb shows/names/counts/asks about an unperceived thing; MQL names the same things for everyone | W3 — the resolver universal (`mql.universal.test.ts` pins player = system mode), every binding/showing surface through `perceived` (the lint at 0); drive 11–13 |
| the builder lens inside held extents; plays plainly without | W3; drive 18 |
| every character restored carries exactly what it carried | W4 (homes by index), W7 (`placeLoose`); drive 19 |
| a pack animal carries only in what it wears, as its body bears, led on a held rope that takes a hand | W4 (lead, hands), W6 (mule, tack); drive 16 |
| a hitched cart fills the hands it says, fits a way by size, parks with its load | W4 (handedness), W2 (cart clearance), D30; drive 16 |
| weight follows gravity and buoyancy; a thing leaves an open container when nothing presses it | W1 (pressing, `gravityNow`), W4 (burden × g); drive 15, 17 |

Nothing in the requirements is unmapped.

## Test & gate strategy

- **Unit** (per wave above): the fit table, the envelope, the clearance ladder, the
  holder rules, the one reach rule, hands/grip, homes round-trip, gravity, release,
  pockets mint/restore, the inventory views, the two census gates' fixture tests.
- **Only the drive proves:** the first-load placement of a real pre-flip snapshot (step
  19 restores a character captured before W7 — the wire file stages one with the
  pre-flip `get` in W0's world and reads it back after), the combat beat's narration
  (step 6), the browser's card (the walk).
- **The blocking drive** (`packages/wire/tests/size-and-carrying.dirty.wire.test.ts`,
  `DIRTY_REASON`: hands every step its gear and leaves it where the step left it) — every
  step tagged `instant` or `short` or `staged` as the requirements list them (1–5, 7–13,
  15–20 `instant`/`short`; 4, 6, 10, 13, 14, 17, 18, 19 `staged` — the stager is the
  `testharness` wizard seated on the extents: it sets gravity (`testharness gravity 0`),
  knocks a character unconscious (`testharness afflict`), stages a pre-flip snapshot,
  removes an item from a shut pack). **Each checkpoint is made to fail once on purpose**
  (B2). Step 19 is the R4 restart.
- **The soak drive** (`size-and-carrying.soak.dirty.wire.test.ts`): the two-hour
  expedition at 12× — the pack's food and water consumed on the body's clock, the burden
  line falling. Its **staged twin** in the blocking drive is step 16 (the packed pack's
  weight read, a wizard advancing hunger by `nourish`/`advanceWorldClock` four hours,
  the burden line lower). Named in the MR for the soak lane.
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
  **whatever is placed on, in or from a thing travels with it** (owner, 2026-11-11: the
  general rule, not a garment special case). It lives at the one move chokepoint
  (`ContainmentApi.move` → `moveCore`): moving a `Placing` host moves every item whose
  pair host it is into the host's new environment, pair kept — a coat taken off, given
  away or hung in a wardrobe keeps its pocketed things; a carried tray brings its cups;
  a belt taken off brings its attachments. Recursive (a cup on a tray in a pocket), with
  one cycle guard. Listed here because it is the one
  place the "ham in the room" model costs something; the W5 test `Garment.pockets.test.ts`
  pins *remove coat → the cup leaves with the coat*, and *drop coat → the cup is in the
  coat's room, still "in the left pocket"*.
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
- **The MQL filter at `MqlLogic`** changes answers for every verb that binds a covered
  thing today (none should — the card and `look` already hid pockets); the
  controller-liquidity baseline will say.
- **Sibling drives at W7** — build-3 (navigation) and build-4 (load-on-use) drives
  assume today's `get`; the flip wave is scheduled after they land or with their
  owners told (the MR says which).
- **Open (the build decides, records in the plan):** whether `put <x> in <garment>` with
  one pocket takes it silently or asks (the `putPlanFor` single-offer rule says takes);
  the exact `CARRYING_DEFAULTS` numbers (set so a human holds a 10 kg one-handed and a
  1.2 m staff two-handed; a gnome a 4 kg / 0.6 m).

## Deferred seams

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

*(appended at build time)*
