# Metallurgy — implementation plan

Executes [metallurgy-requirements.md](../requirements/metallurgy-requirements.md).
**Kind:** feature. **Leads from:** content, with a small load-bearing
kernel footprint (a per-instance alloying fraction on metal stock, the
delivery fold, one recipe-output rule).

What is being built: the iron and steel rung of the metal chain at
Rejection. The deposit learns a lateral term so its distal fringe carries
iron where its heart carries copper; the fringe **outcrops** and is walked
to, staked, and hewn; the smelt derives *what* it made — a bloom, a steel
or a cast — from the charge and the heat, not from a recipe; a bloom is a
different thing from a bar and must be consolidated at an anvil, losing
slag; the carbon that decides all of this rides on the stock as a number
the way grade rides on the lump; material enters a weapon's delivery; the
arms rows are renamed and made makeable; the general store's iron shelf
is deleted; and an independent on the fringe keeps ore arriving when
nobody is logged in.

⚠ **Three things the requirements assumed are already true and are not**,
found by grounding (§ Grounding, ⚠⚠ items): `smelt` and `char` are
afforded by nothing and are unreachable in the live game; the smelting
furnace is not a `Container`, so `smelt` could never have charged it; and
the only anvil in the game is on an island nobody can walk to from
Rejection. W0 closes all three before anything is built on them.

---

## Grounding

Every fact below was verified by opening the file this cycle. Paths are
repo-relative; `mud/` means `packages/server/src/mud/`; `content/` means
`packages/content/`.

### The chain flattens at the ingot

- `content/trade-smelting/src/idea/cmd/smelting/SmeltController.ts` —
  `COPPER` and `INGOT_ROW` are module constants (`:47–48`); the heat gate
  reads copper's own melting point; `runCharge` sums
  `each × count × lump.metalFractionOf(COPPER)`, destructs the ore and
  `fuel.slice(0, CHARCOAL_PER_RUN)` (`CHARCOAL_PER_RUN = 2` — extra
  baskets are left in the furnace, so today's charge has no *ratio*),
  clones `INGOT_ROW` via `pour()` which calls `setMass` and nothing else,
  and `void bar;`. `SMELT_MS = 4 * 60 * 60 * 1000` **game ms** — four game
  hours, against `HEW_MS = 9000`, `DRIVE_MS = 40000`, `HAMMER_MS = 5000`
  (`HammerController.ts:22`). At `WorldClockApi.DEFAULT_SCALE = 12`
  (`mud/api/worldclock.ts:108`) that is **twenty real minutes** per run.
- ⚠⚠ **`smelt` is afforded by nothing.** The one record of verb
  affordances is `static commandContributions` (`docs/subsystems/command-routing.md:378`,
  *"Nothing else"*). `grep -rn 'cmd/smelting/smelt' packages --include='*.ts'`
  finds only the view's own controller; no class or mixin names
  `trade/smelting/cmd/smelting/smelt.yaml`. The same is true of
  `trade/fuel/cmd/fuel/char.yaml` — `content/trade-fuel/src/thing/CharcoalPit.ts`
  carries no `commandContributions`. The metal-chain wire test
  (`packages/wire/tests/metal-chain.dirty.wire.test.ts:145–170`) recorded
  both verbs as `unknown-verb` and explained it as *"the trade verbs come
  off the trade's instruments"*; no instrument affords them either.
- ⚠⚠ **The smelting furnace is not a container.** `SmeltController`
  requires `MixinApi.isFurnace(c) && MixinApi.isContainer(c)`;
  `content/trade-smelting/content/trade/smelting/thing/furnace.yaml` is
  `class: /platform/thing/Forge`, and `mud/platform/thing/Forge.ts` is
  `FurnaceMixin(LightSourceMixin(ReservedMixin(ThermalMixin(Thing))))` —
  no `ContainerMixin`. Even afforded, `smelt` would decline
  *"There is no furnace here to charge."* (`CharcoalPit` composes
  `FurnaceMixin(ContainerMixin(…))`, the shape a chargeable furnace needs.)
- `content/trade-smelting/src/__tests__/smelt.test.ts` never dispatches
  the controller: it asserts `Ore.metalFractionOf` arithmetic, the
  faucet scan and bronze's composition. The controller has no test.
- `mud/platform/thing/Ingot.ts` — `ManualBuildMixin(MeltableMixin(ThermalMixin(Thing)))`,
  no per-instance quality field. `mud/platform/thing/Casting.ts` —
  `MeltableMixin(ThermalMixin(Thing))`, *"the generic, material-agnostic
  sibling of `Ingot`"*; `/stuff/thing/Casting` is the off-spec mint's
  row (`WORKED_LUMP_TEMPLATE`).
- `mud/lib/fire/Furnace.ts:154` `getHeldTemperatureK() = burnTemperatureK × (bellowsActive ? bellowsMultiplier : 1)`;
  `:216 heatContents()` heats **Meltables in the furnace's own container
  (the room)**, not things inside the furnace — so a product poured into
  the furnace container is not re-melted, and a pig set down on the
  floor beside a lit bellows furnace is. Verbs: `ignite`/`douse`/`pump`/
  `heat`/`boil` are afforded by `FurnaceMixin` (`:105–117`).

### Ore's per-lump grade is the shape carbon copies

- `content/trade-mining/src/thing/Ore.ts` — `protected grade: number = 0`,
  `fieldMeta` `{persistent, authorable, spoiler: 1, spoilerName: 0}`,
  clamped in `setGrade`; `metalFractionOf(metalPath) = composition.fraction × grade`;
  `onMerged` mass-weights from figures stashed in `canMergeWith`
  (the absorbed stack is destructed before the hook fires); `onSplit`
  carries grade and gangue. Deliberately not `GradedMixin`.
- `mud/lib/stuff/Stackable.ts:203` `canMergeWith` refuses unless
  `getTemplatePath()` is equal — so an iron-ore row and the copper-ore
  row never pool.
- `content/rejection/content/world/rejection/thing/copper-ore.yaml` —
  `class: /trade/mining/thing/Ore`, `_materialPath: mineral/malachite`,
  `gangueMaterialPath: mineral/quartz`, `grade: 0`, `mass: 1.4`.

### The deposit has no lateral term — verified, and the fringe computed

- `content/trade-mining/src/idea/Deposit.ts` (579 lines). `sampleAt(at, seed)`:
  `hostAt(z)` / `waterAt(z)` → `isInLode(at)` + **`bandAt(z)` takes only
  `z`** → `clamp01(mean + spread·(2r−1)) × depletionScaleAt(at)` → pin →
  blended hardness. `isInLode` is the only lateral test (perpendicular
  distance ≤ thickness/2, |along strike| ≤ `strikeExtent`, |down dip| ≤
  `dipExtent`); outside ⇒ barren. **Nothing bounds `z ≤ 0`**: a cell
  above the collar that satisfies the plane test reads as ore, which a
  surface working's `up` face would sample. `GroundSample` carries no
  pin/computed marker. Types: `StratumBand, GradeBand, Lode,
  DepletionBand, FeaturePin, DepositFeatures, GroundSample, SurfaceReading`.
  Module-private helpers: `strikeVector`, `dipVector`, `normalOf`,
  `pointKey`, `hashString`, `clamp01`, `hardnessOf`.
- `content/rejection/content/world/rejection/idea/deposit/ferrow.yaml` —
  lode `through [0,0,-20] strike 41 dip 62 thickness 12 strikeExtent 180
  dipExtent 90 gangue quartz`; zones malachite→−45 @0.07/0.05,
  chalcopyrite→−400 @0.11/0.04; depletion box `[-60,-60,-30]…[60,60,0]`
  scale 0.55; pin `-30,-10,-10`.
- ⭐ **The fringe, computed against that row with the file's own math**
  (`strike 41°` ⇒ strike vector `(0.656, 0.755, 0)`; the surface trace
  is the line `y = 16.2 + 1.15x`). Cells are 10 m; `along` is metres
  along strike from `through`; the depletion box is `x,y ∈ [−60,60]`:

  | cell (x,y,z) | perp m | along m | in lode | depleted |
  |---|---|---|---|---|
  | (0,0,0) pithead yard | 9.4 | 0 | no (trace 10.6 m off) | yes |
  | (−1,−1,−1) timbered drift | 3.8 | −14 | yes | yes |
  | (0,2,0) | 2.2 | 15 | yes | yes |
  | (2,4,0) | 0.5 | 43 | yes | yes |
  | (4,6,0) | 1.3 | 72 | yes | **yes** (y = 60 is the box edge) |
  | **(5,7,0)** | 2.2 | 86 | yes | **no** |
  | (6,9,0) | 2.8 | 107 | yes | no |
  | **(9,11,0)** | 5.6 | 142 | yes | no |
  | (−7,−6,0) | 2.5 | −91 | yes | no |

  So the lode reaches daylight along its whole strike, the old men's
  box ends at 60 m, and open ground in the lode at the surface begins at
  about 75 m along strike in both directions. A staked block is
  `BLOCK_HALF = 3` cells each way (`StakeController.ts:35`), and
  `MineWarren.claimFor(cell)` tests only the **centre** cell against
  existing blocks — so two claims whose centres are ≥ 4 cells apart on
  one axis coexist.
- Minerals that exist: `content/base-library/content/stuff/idea/material/mineral/{malachite,chalcopyrite,quartz}.yaml`
  (+ farming's marl). Malachite tags `["mineral","carbonate","ore","copper","oxide-zone","green"]`,
  hardness 200, composition `{copper 0.5748}`. **No iron mineral exists.**
  No material row authors `appearance:` except potting-soil, glass, down
  (`Material.appearance` is a free-prose phrase, `Material.ts:150–163`).

### Material rows, and where material bites

- `element/iron.yaml` 350/120, melting 1811 K, tags incl. `ferrous`;
  `alloy/steel.yaml` **600/200 (the reference magnitudes)**, composition
  iron 0.998 / carbon 0.002, tags `["alloy","metal","ferrous","magnetic"]`,
  ⚠ **no `meltingPoint`** — `MeltableMixin.getMeltingPointK()` reads 0
  ⇒ a steel thing never melts; `alloy/bronze.yaml` 250/90; `element/tin.yaml`
  30/40; ⚠ `element/copper.yaml` and `element/carbon.yaml` author **no
  hardness/toughness**; ⚠ `wood/oak.yaml` (the oak waster's material)
  authors **neither** either; `organic/leather.yaml` 20/10.
- `mud/platform/idea/api/MaterialLogic.ts:307` `materialHeight(material, channel)`:
  **`if (!material) return 0`** (before the floor); else
  `floor + (1 − floor) × ratio` with `ratio` = `hn` (edge) / `tn` (blunt)
  / mean (point), each `clamp(x / ref, 0, scaleMax)`; dials
  `response.material.{hardnessRef 600, toughnessRef 200, scaleMax 1.5, heightFloor 0.6}`
  (`content/platform/content/settings/response.yaml`). So **steel lends
  exactly 1.0 on every channel**, iron 0.83 (edge) / 0.84 (blunt), bronze
  0.77, a material with no toughness 0.6 (blunt), and a material that is
  `null` lends **zero**.
- `MaterialLogic.ts:480 previewBandImpl` — the weapon-delivery branch
  **already multiplies by `materialHeight`** (`:506`); so `analyze
  response` folds material for weapons today and the fight does not.
- `mud/platform/idea/api/CombatLogic.ts:2236 instrumentDeliveryScale(weapon, channel)`
  — one caller (`:2439`): `gradeConditionScale × keennessDeliveryFactor
  (edge/point, Keen) → min(…, craftingBrokenDeliveryFloor)`. Docblock:
  *"Material height stays analyze-only — a deliberate asymmetry"*.
  `MaterialApi` (`mud/api/material.ts`) exposes `gradeConditionScale`,
  `attenuate`, `previewBand` — **not** `materialHeight`.
- `packages/server/scripts/check-combat-dynamics.ts` locks the
  `MixinApi.is*` predicates `CombatLogic` may hold to a physics allowlist
  (`isConstructed`, `isDurable`, `isGraded`, `isKeen`, …); **`isTangible`
  is not on it.**
- The gym: `packages/server/vitest.gym.config.ts` + `GYM_TESTS`
  (`combat-gym`, `waster-spar`, the shipped-species snapshot). All
  shipped gym weapons are steel (`scripts/__tests__/combat-gym.test.ts`
  constructs `Weapon` + `Material` fixtures); `waster-spar.test.ts:252–343`
  asserts the waster's blows are contusions (never bleeders) and that
  wounds exist — which a 0.6 blunt height on oak (no toughness authored)
  puts at risk.

### The crafting spine

- By-hand ladder: `heat` (platform, afforded by `FurnaceMixin`) →
  `hammer` → `quench` (`content/trade-smithing/src/idea/cmd/crafting/`).
  `HammerController` gates on a build vessel with a material + `striking`
  + `anvil` + `getHeatedToK() > 0`; engaged at the anvil's pace; at
  completion `build.bankWorkpiece()` (idempotent per build — the
  once-rule is on `mud/lib/craft/ManualBuild.ts:bankWorkpiece`, which
  banks `tags: material.getTags()`, `materialPath`, and grade `fair`
  unless Graded) and wears the striker.
- `QuenchController` declines an **empty build** (`empty-build`) and
  otherwise calls `CraftingApi.mintFromBuild`. `mud/platform/idea/api/CraftingLogic.ts:1322 matchBuild`
  — heat gate ≤ latched heat, exact slot coverage by material **tags**
  (`buildSatisfies`), no leftovers, **the most heat-demanding satisfied
  recipe wins**, ties by catalogue order. `:1509` the maker is
  `liveMaker.getIdentityPath() ?? req.makerPath` (the controllers'
  `getTemplatePath()` `makerPath` is a dead fallback).
- `:1570 mintWorkpiece` — reads `workpiece.getMaterial()` + mass, clones
  the recipe's `outputTemplate`, `output.setMaterial(material)`, stamps,
  **then** destructs the workpiece; off-spec clones `/stuff/thing/Casting`.
  `:1108 applyTangibleOutput` (the one-shot path) does
  `output.setMaterial(primary.material)` + summed mass. **Neither reads
  `recipe.getOutputMaterial()`** for a tangible output (the field exists,
  `mud/lib/craft/Recipe.ts:174/211`, used by the edible/bulk paths).
- `:335 isItemCandidate` (the one-shot gather): Tangible with a
  material, not a tool, not crafted-non-food, not a container, not
  bulkable, not an organism, not a maker. An `Ingot` and any `Thing`
  composing only Thermal/Meltable/ManualBuild qualify; matching is by
  the material's tags against `slot.category`.
- Recipes: `Document` kind `recipe`, one file per recipe at
  `<pack>/content/recipes/<recipeId>.yaml`. Five smithing recipes
  (`fire-poker 700 · cook-pot 800 · smiths-hammer 800 · table-knife 1300
  · belt-knife 1400`) all take `{category: ferrous, count: 1}` +
  `[striking, anvil]`; mining's twelve tool recipes
  (`content/trade-mining/content/recipes/`, e.g. `tongs.yaml`
  `category: ferrous`, `[striking, anvil]`) likewise. `content/trade-smelting/content/recipes/`
  has `smelt-copper` (the findable rung) and `cast-bar`
  (`category: metal` → copper-ingot).
- `Grade.deriveAtFixedControl` weakest link; `applyControlFloor(:1536)`;
  `_control` inert (out of scope).
- `content/trade-smithing/src/thing/Anvil.ts` affords `hammer`, `quench`,
  `forge`, `repair`, `salvage` (`environment` + `peers`). ⚠⚠ **The only
  anvil in the game is `content/hearthworks/…/location/smithy.yaml`**,
  and the Hearthworks zone has **no inbound exit from any other pack**
  (grep of `world/hearthworks/location` outside its own pack: two
  `pack.yaml` descriptions only) and **no TPA node**
  (`content/tpa/content/system/tpa/` holds `teleport-authority.yaml`,
  `travel-card.yaml` and two verbs; `TravelNode` rows exist only at
  Terminus' arrival terminal and two newbie-wilds rooms). Rejection has
  no anvil; its smelter props are `furnace`, `tongs`, `slag`.
  Consequently mining's own `[striking, anvil]` tool recipes have never
  been makeable where the mine is.
- `trade-smithing/package.json` depends on generic-objects, platform,
  trade-cooking, server, types — **not** trade-smelting.
  `trade-smelting` depends on base-library, generic-objects, platform,
  trade-fuel, trade-mining. `rejection` ships no `src/`.
- `content/trade-smithing/content/trade/smithing/thing/iron-ingot.yaml`
  ("cold iron ingot", `Ingot`, iron, 0.5 kg) and `spare-ingot.yaml` are
  Hearthworks' two free props (**kept**). `content/terminus/content/world/terminus/general-store/thing/iron-ingot.yaml`
  is the shelf row; `counter.yaml:32` stocks it at `par: 3` and `:129`
  prices it at 5.

### The arms and armor templates

- `content/generic-objects/content/stuff/thing/arms/` — `belt-knife`,
  `fire-poker`, `leather-whip`, `oak-waster`, `steel-{dagger,flail,mace,shield,spear,sword,warhammer}`;
  `armor/` — `bronze-breastplate`, `hide-jerkin`, `leather-boots`,
  `mail-hauberk`, `padded-gambeson`, `steel-breastplate`. Nine rows
  hardcode `_materialPath: alloy/steel` (seven `steel-*` arms,
  `steel-breastplate`, `mail-hauberk`); `belt-knife`/`fire-poker` carry
  none. `steel-shield` is `class: /platform/thing/equipment/Shield`.
- References: `content/newbie-wilds/content/world/newbie-wilds/crossroads/hollow.yaml:50–58`
  props `steel-dagger ×2, steel-spear, steel-sword, steel-shield,
  leather-whip`; `treeline.yaml:55,60` props `steel-dagger ×2`. The
  `props:` syntax carries **no per-prop data override** (`check-template-census.ts`
  walks plain entries and `{template, onto}`), so a prop of a row with
  no `_materialPath` is a weapon with **no material** — which after the
  delivery fold delivers zero.

### Title, identity, the register

- `content/trade-mining/src/idea/cmd/mining/StakeController.ts:100` passes
  `{ kind: 'player', templatePath: giver.getTemplatePath() ?? '' }` to
  `ParcelApi.subdivide`. ⚠⚠ Every player Avatar shares one template path
  (`docs/antipatterns.md:4257`). The kernel's own sites key players by
  **identity path** into the same field — `TitleController.ts:306/373`
  (`buyer = giver.getIdentityPath()`), `TransferController.ts:147`,
  `ChattelLogic.ts:200` (`host.getIdentityPath() === owner.templatePath`),
  `EmploymentLogic.ts:536` (`buysForImpl`: `who = getIdentityPath()`) —
  so `ParcelOwner.templatePath` (`mud/lib/parcel/ParcelRecord.ts:58`) is,
  by the kernel's own convention, an identity path. Grep of
  `kind: 'player'` across `packages/content/**/*.ts` finds **only** the
  stake site. No lint gate covers the shape; `lint:identity` is the
  `Cast`/`Extra` rung gate. `check-drive-scripts.ts` is the precedent
  for a self-enrolling zero-ratchet gate.
- `content/rejection/content/world/rejection/idea/ferrow-warren.yaml` —
  `claimBlocks` holds one seeded block (`claims/1`, `[-4,-4,-3]…[0,0,-1]`)
  with **no title behind it** (rejection's `pack.yaml requires.title`
  grants only the town and the road) — so `stake` refuses it with
  *"already in the register"* (`ownerOf` null). The register is what has
  been staked, not an allowlist; `mineExtent: /world/rejection/ferrow`.
- `HewController.ts` has **no title gate**; `ownerFor` stamps the lump to
  the business the hewer is on shift for (`EmploymentApi.businessAt(working path)`),
  else the actor. `delves` (`content/trade-mining/src/behavior/delves.ts`)
  requires `buysFor()` to return an outfit (`if (!outfit) return;`) and
  consigns as the house (`wallet use house` → `ConsignController.ts:129`
  keys the listing on the principal's identity path and requires a
  primary account). `buysFor` admits a roster position with
  `purchases: true` (`Position.ts:73`, exemplar
  `content/trade-tailoring/content/trade/tailoring/idea/tailor-shop.yaml:19`)
  or the business's proprietor. A Business stands up lazily off
  `operatingLocations` with a `banksAt` account.

### The mine's shape, rooms, air

- `content/rejection/content/world/rejection/location.yaml` — the pithead
  zone, plain `CartesianZone`, `cellSize: 10.0`, inherits `deposit:` from
  `/world/rejection` (`rejection.yaml`, `address: terminus/rejection`).
  Surface rooms at z = 0: pithead-yard (0,0), claims-office (0,1; exits
  `south` only), assay-shed (1,0), provisioning (−1,0), the-dry (−1,1),
  fuel-yard (1,1), smelter (2,1), adit (0,−1). The yard's `southwest` exit
  crosses into the kestrel-road zone.
- `content/trade-mining/src/location/AuthoredWorking.ts` —
  `WorkingMixin(SingletonCartesianLocation)`; the four underground
  authored rooms use it with `oreRow:`. `WorkingMixin`
  (`content/trade-mining/src/lib/Working.ts`) affords the five acts on
  `self`/`inventory`; `facesOf()` samples six neighbours, `FACE_LUMPS = 8`;
  `getTier()` is `spine` with no warren; `drive` declines *"cut and
  finished"* with no warren; `airAt()` walks exits ≤ 12 steps to a room
  that `breathes()` (`Working.ts` module function: a declared
  `getVentilated()` — nothing implements it — or an exit into another
  zone). A surface working three exits from the yard reads air 0.75.
- `content/rejection/content/world/rejection/agent/hewer.yaml` — an
  `Extra` on the co-op roster (`idea/coop-business.yaml`), brain
  `/trade/mining/behavior/delves` `cadence:90s`, config
  `{home: timbered-drift, shelf: assay-counter, ask: 9, batch: 3}`.
  `thing/assay-counter.yaml` is a `ConsignmentShelf`, `listingCapOverride: 24`.
- `content/trade-fuel/content/trade/fuel/thing/charcoal.yaml` — a
  `Provision`, `mass: 8`; `char` runs `BURN_MS = 3 days` game time; the
  collier has only an `idles` brain — **nothing produces charcoal
  unattended.**

### Surveying

- `content/trade-mining/src/idea/cmd/perception/SurveyChannelController.ts`
  — `ERROR_DEG` 25/15/8/4/2, `SOLVE_FROM` ∞/∞/3/3/2, `depositAt(place)`
  via `zone.lookupField('deposit')` + get-or-create. `MeasureStrikeController`
  hardcodes *"The ground here is stained green"* when `staining > 0.5`.
  `AnalyzeGroundController` projects the character's DISCOVERY beliefs
  into a `SurveyFrame` (`packages/types/src/…:1226` — `deposit, points,
  solved, note`) rendered by `packages/client/src/components/cards/CardBodies.tsx:1133 SurveyBody`.
  Nothing today names the **mineral** at the standing cell.

### The wire harness

- `packages/wire/src/harness/` — `Session.open(handle, {startLocation})`
  (a birth setting, not a teleport), `cmd()` → `{notes, said()}`,
  `prose()`, `queryOne()`, `awaitActivity(engagementIdOf(r), timeoutMs)`,
  `declareFile({file, packs, dirtyReason})`. No compressed-clock boot
  group exists (`farming.dirty.wire.test.ts:10–24`). The crafting drive
  awaits `heat`/`hammer` engagements with a 240 s timeout.

---

## Plan-level decisions

### D1 — The fringe outcrops; you walk to it

**Q1.** The lode's plane crosses `z = 0` along its whole 360 m strike
(the table above); the deposit resolves above ground already (`deposit:`
on the parent zone); the requirements' drive says *walk out along
strike*; and historically the distal, weathered iron of a copper lode
is exactly the gossan you find at the surface. An underground answer
would be nine `drive` engagements through barren rock with no survey
that says where to go — labour with no decision in it. Lens 1 also
prefers the surface: *iron is the metal you can get without the co-op*
is only true if you can get to it without the co-op's adit.

So the fringe is **four new surface rooms in the pithead zone**
(§ W1): a hillside connector, the old men's shallow pits (inside the
depletion box — green, thin, picked over), and **two `AuthoredWorking`
rooms** at cells `(5,7,0)` and `(9,11,0)` with `oreRow: /world/rejection/thing/iron-ore`
— the near one the independent's claim (block 2 in the register), the
far one open ground for the player to stake. Both centres are ≥ 4
cells apart, so `claimFor` admits the second stake. A surface working
affords `hew` and declines `drive` (*"cut and finished"* — you do not
drive a heading in the open air), which is right.

`stake` still happens **at the claims office**, naming the block by its
centre cell (`stake 9,11,0`); the drive walks back for it.

### D2 — Lateral zonation is a window on `GradeBand` plus a halo on `Lode`

**Q2.** Two optional numbers, both defaulting to today's behaviour:

- `GradeBand` gains `alongFrom?: number` / `alongTo?: number` — metres of
  **|distance along strike| from `through`**; absent = unbounded.
  `bandAt(z, along)` returns the first band whose depth *and* window
  admit the cell. The heart of the body is `alongTo: 75`; the fringe is
  `alongFrom: 75`; both ends of the strike are fringe (a body is lean at
  both ends, and the SW end gives a second venue-free iron ground for
  free).
- `Lode` gains `halo?: number` — metres beyond the plane's thickness and
  extents in which the cell still carries the band's mineral, at a grade
  tapering linearly to zero across the halo. This is the requirements'
  *ground outside the lode is no longer uniformly barren*, and it makes
  prospecting forgiving in the honest way (disseminated mineralization in
  the wall rock) rather than by widening the lode.

Why this generalizes without a second mechanism: tin at depth is a
band with a deeper `toZ` (the existing axis); copper at the heart and
iron distal are windows on the new axis; a mineral that is deep *and*
distal is both. `sampleAt` also gains the one guard the surface needs:
**`z > 0` is air and reads barren** — the ground stops at the collar.
With `halo` and the windows absent, `Deposit.test.ts` is byte-identical.

### D3 — Carbon is `AlloyedMixin`, on metal STOCK only

**Q3.** A kernel mixin `mud/lib/material/Alloyed.ts` (`AlloyedMixin`,
`Mixins.Alloyed`, `MixinApi.isAlloyed`) carrying **`alloying: CompositionEntry[]`**
— the minor constituents dissolved in *this* piece, in the same
`{materialPath, fraction}` vocabulary `Material.composition` speaks —
plus `temper` (D14). Surface: `getAlloying()`, `setAlloying()`,
`fractionOf(materialPath)`, `setFractionOf(materialPath, fraction)`,
`getEffectiveComposition()` (the material's kind composition scaled by
`1 − Σ alloying`, plus the alloying entries). Carbon is
`fractionOf('/stuff/idea/material/element/carbon')`; the substrate is
named for what it is, not for its first consumer, and tin in bronze
(Stage C) is the same field.

Hosts: **`Ingot`** and **`Casting`** (kernel) and the pack's **`Bloom`**
(D5). Not `Weapon`, not `Garment`, not `Thing`: the requirements put the
number on *metal stock*, and the blade's metal is its **Material row**
(D4), which the stock's band chose. What composing on `Ingot` claims of
every ingot — a copper one included — is *"how this piece's minor
constituents came out"*, which is true and empty by default; no reader
needs to re-narrow the host set (the hammer refusal reads the number,
`analyze chemistry` prints it, the furnace writes it). See § Host
placement.

### D4 — The band is a Material row; the number is the instance's

Three ferrous products, each naming its own material so that names,
hardness, tags and melting points stay **data**:

| product | row | class | material |
|---|---|---|---|
| bloom | `/trade/smelting/thing/iron-bloom` | `/trade/smelting/thing/Bloom` | `alloy/bloom-iron` (new) |
| wrought bar | `/trade/smithing/thing/iron-ingot` (exists; re-described) | `Ingot` | `element/iron` |
| steel bar | `/trade/smelting/thing/steel-ingot` | `Ingot` | `alloy/steel` |
| cast pig | `/trade/smelting/thing/cast-iron-pig` | `Ingot` | `alloy/cast-iron` (new) |

The furnace decides the row from the carbon it computed; the instance
carries the exact figure. `materialHeight`, the covering fold, `repair`,
`salvage`, recipe matching — every existing reader keeps reading the
Material and learns nothing new. The alternative (one `element/iron`
material and a kernel that derives *"steel"* from a number) puts a
content word in the kernel; the alternative the requirements rejected
(three rows and no number) has nowhere to put how well you hit the band.

The bloom's own material is what keeps *"a bloom is not a bar"* honest
at the data level: `bloom-iron` is tagged `bloom` and **not `forgeable`**
(D7), so no arms recipe can take a bloom and the one-shot gather never
picks one; the consolidate recipe takes `category: bloom` and nothing
else does.

### D5 — The charge decides the product; the constants are Fe–C facts

**Q4.** `smelt` stays one verb that selects nothing. The run consumes
**everything in the furnace** — every ore lot and every basket (today it
consumes exactly two baskets and strands the rest, which is why no ratio
exists) — and derives:

1. **The dominant metal** — over every `metal`-tagged entry of every
   lot's material composition, `argmax Σ(mass × grade × fraction)`.
   Chalcopyrite (copper 0.35, iron 0.30) yields copper; goethite yields
   iron; a barren charge yields slag as today.
2. **The heat gate** — a non-`ferrous` metal: `held ≥ meltingPoint`
   (today's rule, byte-identical for copper). A `ferrous` metal:
   `held ≥ T_REDUCE = 1470 K` else decline *"too cold — the ore will not
   reduce; work the bellows"* (the fuel-technology rung).
3. **Carbon**, for a ferrous charge, from the fuel ratio
   `r = charcoal kg / ore kg` (or `/ stock kg` on a carburize):
   - ore, solid state: `C = clamp(C_BLOOM + K_ORE × r, C_BLOOM, C_ORE_MAX)`
     with `C_BLOOM = 0.0005`, `C_ORE_MAX = 0.03` — the natural-steel
     continuum a bloomery over-charged with charcoal really runs;
   - stock, solid state: `C = min(C_in + Δ_CARBURIZE, C_STOCK_MAX)`,
     `Δ_CARBURIZE = 0.006`, `C_STOCK_MAX = 0.021` (austenite's limit) —
     diffusion, so the ratio only has to clear the minimum;
   - **liquid iff `held ≥ T_melt(C) = max(1420, 1811 − 9093 × C)`** —
     carbon lowers the melting point, linearly to the eutectic — and a
     liquid charge takes carbon to `C_SAT = 0.04`.
4. **The band → the product row**: liquid → `cast-iron-pig`; from ore,
   solid → `iron-bloom`; from stock, solid and `C ≥ 0.002` → `steel-ingot`
   (a wrought bar carburized once always crosses into the band).
   Non-ferrous → the row whose `_materialPath` is the metal.
5. **The row is discovered, never listed**: `Template.findDescendants('/trade/smelting/thing')`
   (a kernel model a pack may import — `content/transport/src/idea/LaneCatalogue.ts:376`
   is the precedent) filtered to rows whose `class` reaches `Ingot`/`Bloom`
   and whose `_materialPath` is the wanted material. An author adds tin by
   authoring `tin-ingot.yaml`; no code.

The furnace's authored `bellowsMultiplier` moves from `1.5` (2130 K —
melts pure iron and makes every bellows run a cast) to **`1.12`
(1590 K)**: above `T_REDUCE`, below pure iron's 1811 K, above the
eutectic, so a modest charge with the bellows reduces solid (a bloom), a
heavy one carburizes past 2.4 % and *runs* (a cast), and no charge
without the bellows reduces at all. Copper is unaffected either way.
Mass: a bloom weighs `metal × (1 + BLOOM_SLAG = 0.3)` and records
`slagFraction`; the rest of the charge is slag as today; a pig weighs
the metal.

The exact `K_ORE` is the build's to tune so that the acceptance table in
W3 holds in **baskets and lumps** — the units a player counts.

### D6 — `SMELT_MS` becomes two game minutes

Four game hours is twenty real minutes at the default clock and out of
family with every other engaged act (seconds). `SMELT_MS = 120_000`
game ms (ten real seconds). The prose keeps *"settle in to hold it at
heat"*. ⚠ Flagged in § Risks for the user: a pace constant is content's
to set, but this one was authored as a claim about bloomeries.

### D7 — `forgeable` is the stock tag; every anvil recipe asks for it

`element/iron`, `alloy/steel` **and `element/copper`** gain the tag
`forgeable` (all three are hot-workable — copper was the first metal
anyone forged); `cast-iron` and `bloom-iron` do not. Every recipe whose
tools are `[striking, anvil]` changes its stock slot to
`category: forgeable`: smithing's five (today `ferrous`), the nine new
arms recipes, and mining's nine anvil recipes — six authored `ferrous`
(`billhook`, `felling-axe`, `pinch-bar`, `shovel`, `sledge`, `tongs`)
and three authored `metal` (`assay-kit`, `miners-dial`, `pick-head`),
the latter chosen so Stage A's copper could make an instrument. `metal`
would admit a pig and a bloom (both are honestly metal); `ferrous` would
admit a pig; `forgeable` admits exactly what an anvil can work. One tag,
one rule: **an anvil recipe takes `forgeable` stock.** `metal` stays on
every metal for `repair`/`salvage`'s domain reads.

⚠ The one widening this causes, stated plainly: smithing's five recipes
now accept copper stock as well as iron and steel, so a copper belt
knife or cook pot is forgeable at an anvil. That is honest (the
Chalcolithic did it), the material height prices it (×0.7), and it is
the first thing Stage A's copper can become besides an instrument.
Flagged in § Risks.

The refusal that names what cast iron is lives in the two verbs that
would otherwise try (`hammer`, `forge` — W4); with the tag absent from
the material, the kernel's gather never picks a pig, and a pig never
silently becomes a pick head.

### D8 — A tangible recipe's authored `outputMaterial` wins; alloying flows

`mintWorkpiece` and `applyTangibleOutput` honour `recipe.getOutputMaterial()`
when it is non-empty (resolved as a Material singleton) and flow the
primary stock's material otherwise, exactly as today. Both copy the
primary stock's `alloying` onto the output when both are Alloyed. The
consolidate recipe authors `outputMaterial: /stuff/idea/material/element/iron`
so a `bloom-iron` bloom mints an `element/iron` bar carrying its carbon;
the arms recipes author none, so a sword takes the bar's steel or iron.
An off-spec quench of a steel bar mints a `Casting` that keeps its
carbon.

### D9 — Consolidation is the bloom's own act, fired by the once-rule

**Q5.** `Bloom.consolidate(): number` — reduces its own mass by
`slagFraction`, clones `/trade/smelting/thing/slag` of that mass beside
itself, zeroes `slagFraction`, returns the kilograms squeezed out;
idempotent by construction. `HammerController` calls it **only when
`bankWorkpiece()` returned `true`** — the first bank of a build — and
narrates the loss; every later `hammer` banks nothing and squeezes
nothing. The invariant *"hammering twice cannot double the metal"* is
untouched, and its dual *"hammering twice cannot halve it"* rides the
same line. The controller duck-types `consolidate` (the shape-not-mixin
rule the water pack's `analyze water` uses), so `trade-smithing` gains
no dependency on `trade-smelting`.

### D10 — Material height enters delivery through the preview's own formula

**Q6.** `MaterialApi.materialHeight(material, channel)` is exposed (it is
the formula `previewBandImpl` already folds for weapons) and
`instrumentDeliveryScale` multiplies by `materialHeight(weapon.getMaterial(), channel)`
after the grade × condition scalar and before the broken floor. The
preview and the fight then agree by construction — the asymmetry the
docblocks name is retired in `CombatLogic.ts`, `MaterialLogic.ts`,
`combat.md`, `crafting.md`, `materials-response.md`.

The numeric blast radius, priced: **steel is the reference, so every
steel weapon's height is 1.0 and its energies are byte-identical** —
which is the whole shipped gym roster. What moves is every non-steel
implement: iron ×0.83, bronze ×0.77, copper (once authored) ≈ ×0.7,
oak (blunt, once its toughness is authored) ≈ ×0.7, leather (edge)
≈ ×0.61, and a `null` material ×0 — hence D11. The gym is run before
and after, and its per-matchup shifts are reported with the MR (W5).

### D11 — The arms rows are renamed and keep a *default* material

The nine rows rename (`steel-sword` → `sword`, …, `steel-breastplate` →
`breastplate`; `mail-hauberk` keeps its name; `bronze-breastplate`
stays exactly as it is, unmakeable, on the `leather-jerkin` precedent)
and the newbie-wilds props follow. ⚠ **They keep `_materialPath: alloy/steel`
as the default for a clone nobody forged.** The requirements say
*"drop their hardcoded `_materialPath`"*, and the intent — the blade is
made of the metal you made, and the row does not lie — is met either
way, because both mint paths **override** the material from the stock
unconditionally. Dropping it would make every prop weapon in the newbie
wilds a weapon with no material, which after D10 delivers **zero**; the
`belt-knife` precedent works only because nothing props a belt knife.
Flagged in § Risks as the one place this plan deliberately reads a
requirements clause by its intent rather than its letter.

### D12 — The fringe producer is a one-man outfit

The independent is an `Extra` (`a hewer on the fringe`, register
indefinite) on the roster of **his own `Business`**
(`/world/rejection/idea/fringe-outfit`, one position `hewer` with
`purchases: true`, wage 0, `banksAt: goodkin`, `operatingLocations:
[the near fringe]`) running the shipped `delves` brain unchanged. On
shift, `hew` stamps his ore to his outfit; `buysFor()` returns it;
`wallet use house` + `consign` list the ore as the outfit at the assay
counter, which lazily has an account. A sole trader is an independent —
the fiction and the title agree — and the brain needs no branch for him.
His block is `claims/2` in `claimBlocks`, untitled like `claims/1`, so
`stake` refuses it and admits the far fringe.

### D13 — The bloomery has its own hammer: an anvil at Rejection

The only anvil is on an island. A bloomery without a consolidation
hammer is historically wrong (the string-hearth stood beside the
furnace), and the requirements' economics — *metal exists where it is
made* — is served, not undermined, by the smelter having the one station
its own product needs. Rejection's smelter room props
`/trade/smithing/thing/anvil` and `/stuff/thing/gear/smiths-hammer`;
`rejection/package.json` adds `trade-smithing` and `generic-objects`.
Emergent reachability then makes every `[striking, anvil]` recipe —
mining's own twelve, and the arms — makeable at Rejection for the first
time. Hearthworks stays the teaching venue with its two free ingots.

### D14 — `quench` on an un-worked hot piece is heat treatment

An Alloyed workpiece with an **empty build and a latched heat** (`heat`
then `quench`, no `hammer`) takes the treatment path instead of
declining `empty-build`: below the steel band, nothing happens and the
scene says so; in the band, the piece records `temper: 'hardened'`
(reported by `analyze chemistry`; annealed back to `none` by the next
`heat`, which is what heating past the critical temperature does); cast
iron **cracks** — the pig is replaced by two half-mass pigs. ⚠ `temper`
has no mechanical consumer in this build (a bar never fights and a blade
is not Alloyed); it is information, like a Discipline's `iscedf`, and it
is flagged in § Risks and § Deferred seams.

### D15 — The survey names the mineral you are standing on

`analyze ground` adds one line, `ground`, to the `SurveyFrame`: the
sample at the standing cell — its colour word for everyone (the
mineral's `appearance`), its **name** at `competent` and above (the
same `SOLVE_FROM` band that makes three points a plane), and a
lean/fair/rich word from the grade. `measure strike`'s hardcoded
*"stained green"* becomes the mineral's `appearance`. Malachite authors
`appearance: verdigris-green`, goethite `rust-brown`. The room prose says
rust; the instrument says goethite; neither lies.

### D16 — `smelt` and `char` get an affording class each; `smelt` gets a container

`content/trade-smelting/src/thing/SmeltingFurnace.ts` —
`ContainerMixin(Forge)` with `commandContributions: { peers: ['trade/smelting/cmd/smelting/smelt.yaml'] }`;
`furnace.yaml` names it. `CharcoalPit` gains
`commandContributions: { peers: ['trade/fuel/cmd/fuel/char.yaml'] }`. The
kernel `Forge` cannot name a trade's view (the pack boundary), which is
why the smelting furnace is a pack class — the `Anvil` shape.

### D17 — The identity fix ships with a zero-ratchet gate

`StakeController.ts:100` → `giver.getIdentityPath() ?? ''`. A new
`packages/server/scripts/check-person-keys.ts` (`lint:person-keys`,
self-enrolling) fails on the literal shape
`kind: ['"]player['"]\s*,\s*templatePath:\s*[^}]*getTemplatePath\(` in
any `src/` under the kernel or a pack, ceiling 0 — the `check-drive-scripts`
precedent: the one offender is fixed in the same commit, so there is no
backlog. The gate is deliberately narrow (a literal, not a classifier —
`docs/lint-family.md:47` on how a census lies) and its docblock names
the broader disease and the antipattern entry.

### D18 — Nine arms recipes on a ladder with no ties

`matchBuild` breaks ties by catalogue order, so single-stock recipes need
distinct heats **within each stock count** (exact coverage means `count`
already separates them). The ladder, all `[striking, anvil]`,
`category: forgeable`, `minGrade: fair`, `discipline: smithing`:

| count | recipe | K | difficulty |
|---|---|---|---|
| 1 | dagger | 1450 | standard |
| 1 | spear | 1500 | standard |
| 2 | flail | 1250 | standard |
| 2 | warhammer | 1300 | standard |
| 2 | mace | 1350 | standard |
| 2 | sword | 1450 | hard |
| 3 | mail-hauberk | 1100 | hard |
| 3 | shield | 1200 | standard |
| 4 | breastplate | 1350 | hard |
| 1 (`category: bloom`) | consolidate-bloom | 1100 | standard |

Shipped single-stock anvil heats are smithing's 700/800/800/1300/1400
and mining's `pinch-bar` 1100, `tongs` 1200, `pick-head` 1200; the two
new ones sit above belt-knife. ⚠ Two ties pre-exist and the retag does
not create them: `cook-pot`/`smiths-hammer` at 800 (separated only by
`minGrade`), and `tongs`/`pick-head` at 1200 (an iron bar already
satisfied both `ferrous` and `metal`). Mining's two-slot `[stock, wood]`
recipes also tie among themselves (`assay-kit`/`miners-dial`/`shovel`
at 1100; `billhook`/`sledge` at 1200). Recorded, not this build's.

### D19 — No new Discipline; credit by outcome

`smelt` credits `smelting`: bloom `standard/success`, steel
`hard/success`, cast `standard/partial` (metal, not the metal you
meant), slag `standard/failure` as today. Consolidation credits
`smithing` through the recipe's `discipline`. Finding the fringe
credits `geology` through the survey verbs as today.

### D20 — The iron shelf is deleted, row and all

`counter.yaml` loses the `stockLines` entry and the `prices` key;
`general-store/thing/iron-ingot.yaml` is deleted (a dangling `prices`
key fails `lint:census`). Hearthworks' two props stay.

---

## ⭐⭐ Host placement

| what | host | what composing it claims of everything else on that host | why not the alternatives |
|---|---|---|---|
| `alloying` (+ `temper`) — `AlloyedMixin` | **`Ingot`** (kernel), **`Casting`** (kernel), **`Bloom`** (trade-smelting) | *"this piece can say how its minor constituents came out."* True of a copper ingot (empty), true of a frozen pool (it keeps what was dissolved), true of a bloom. No reader narrows it further: the furnace writes it, `hammer` reads a threshold, `analyze` prints it. | Not `Thing`/`Tangible` — the *Freshness off every Thing* shape; a rock does not alloy. Not `Weapon`/`Garment` — their metal is a Material row and the fold reads that; carbon on a blade would need `applyTangibleOutput` to guard `isAlloyed(output)` on every mint and would claim a linen shirt can alloy. Not a per-instance `composition` override — it collides with `Material.composition`'s meaning and every reader that walks it. |
| `slagFraction` | **`Bloom`** (pack class) | *"a bloom has slag in it that working squeezes out."* True of every bloom and of nothing else. | Not on `Alloyed` — a steel bar has no slag; a field there would need a guard *"is this a bloom?"* — the wrong-host tell. |
| `Bloom` class | `content/trade-smelting/src/thing/Bloom.ts` = `AlloyedMixin(ManualBuildMixin(MeltableMixin(ThermalMixin(Thing))))` + `consolidate()`; row `/trade/smelting/thing/iron-bloom` | It is a build vessel (so `heat`/`hammer`/`quench` reach it), it melts (it is iron), it alloys. | Not `extends Ingot` — *a bloom is not a bar* is the requirements' own rule, and the class would say it is. Not `Provision` (slag's class today — a pre-existing oddity, left alone). |
| `SmeltingFurnace` | `content/trade-smelting/src/thing/SmeltingFurnace.ts` = `ContainerMixin(Forge)`; row `furnace.yaml` | *"a furnace you charge, that affords `smelt`."* | Not a `commandContributions` edit on kernel `Forge` — a kernel static naming a trade view crosses the pack boundary; the Hearthworks forge must not smelt. |
| `alongFrom`/`alongTo` | **`GradeBand`** (a plain type in `Deposit.ts`) | a band has a lateral window as it has a depth. | Not a second zones list; not a field on `Lode` (one lode, many bands). |
| `halo` | **`Lode`** | a lode has a disseminated margin as it has a thickness. | Not on the band — the halo is the plane's, not the mineral's. |
| the `z > 0` guard | `Deposit.sampleAt` | the ground stops at the collar — a fact about every deposit. | Not in `Working.facesOf` — a hand-authored mine at the surface would still see ore in the sky. |
| `ground` line | `SurveyFrame` (types) + `AnalyzeGroundController` | one more thing the card projects from what the character can see. | Not a new card, not a new verb. |
| `commandContributions` for `char` | **`CharcoalPit`** (trade-fuel) | the clamp affords its own act — the `Anvil`/`FurnaceMixin` shape. | Not on `FurnaceMixin` (kernel naming a pack view). |
| cast-iron refusal | **`HammerController`** + **`ForgeController`** (trade-smithing verbs) reading `fractionOf(carbon)` | *afford statically, decline diegetically* — the anvil keeps affording `hammer`. | Not the kernel gather (D7 keeps the pig out by tag, silently and correctly); not a mixin guard. |
| the fringe outfit + its hand | content rows only (`rejection`) | a Business is a sole trader too. | Not a new brain, not a co-op position. |
| `person-keys` gate | `packages/server/scripts/check-person-keys.ts` | the derived family runs it. | Not an ESLint rule (the family's stated reason: ESLint 8 legacy config). |

⭐ The test from the project's rules: **no guard in this plan re-narrows
a host set.** `HammerController`'s carbon check narrows *stock the verb
is already holding*, not the mixin's host set; `applyTangibleOutput`'s
`isAlloyed(output)` is local narrowing on an output it is already
stamping.

---

## Convention conformance

Checked at plan time against the tree, not recalled:

- **`props:` / `cast:`** — the four new rooms use `props:` for fixtures
  and `cast:` for the independent (`hewer.yaml` precedent); no
  `populates:`.
- **Locations, not rooms** — the four new rooms are
  `SingletonCartesianLocation`s / `AuthoredWorking`s in the pithead
  `CartesianZone`, with `coords` (`lint:locations`: every location
  plots). No `FurnishableRoom`.
- **`<root>/<branch>/`** — `Bloom` and `SmeltingFurnace` at
  `/trade/smelting/thing/<Name>` with class files at
  `trade-smelting/src/thing/<Name>.ts` (the mirror); rows under
  `/trade/smelting/thing/`; minerals and alloys under
  `/stuff/idea/material/{mineral,alloy}/` in `base-library`; iron ore
  under `/world/rejection/thing/`; the fringe outfit under
  `/world/rejection/idea/`; recipes at `<pack>/content/recipes/`.
- **Module scope declares; lifecycles initialize** — the smelt's product
  discovery runs at dispatch (`Template.findDescendants`), never at
  module scope; no roster to warm.
- **Import boundary** — packs import the kernel only by specifier
  (`@saxonberg/server/mud/lib/material/Alloyed`,
  `@saxonberg/server/mud/platform/thing/Forge`,
  `@saxonberg/server/mud/lib/stuff/Template`); `trade-smithing` gains
  no dependency on `trade-smelting` (duck-typed `consolidate`).
  `rejection` stays `src/`-less and adds two `package.json` deps.
- **Verbs on objects** — `Bloom.consolidate()`, `Alloyed.setFractionOf()`;
  no `XApi.verb(host, …)`.
- **No new module category, no free helper, no new `eslint-disable`.**
  The one new script is a `lint:*` gate (an existing category).
- **A pack may not add a field to a kernel class** — `alloying` is a
  kernel mixin field because the fact (*how this metal came out*) is
  about something the kernel already models (`Ingot`, `Casting`);
  `slagFraction` is on the pack's own class.
- **Materials are a closed vocabulary** — the four new material rows are
  base-library content, sum-to-one compositions, reality-seeded
  (`formula`, `molarMass`).
- **Reference Ideas inert at boot** — `Deposit` resolves by
  get-or-create (unchanged); `Material` rows warm through
  `MaterialCatalogue.warm()` by template-path infix (any root); recipes
  install as `recipe` documents.
- **A verb lives with the pack whose content affords it** — no new
  verbs; `smelt` (smelting), `char` (fuel), `hammer`/`quench`/`forge`
  (smithing), `hew`/`stake` (mining), `analyze`/`measure` stanzas
  (platform, controllers in the trade) all stay where they are.

**Lint gates this build must pass** (the family is derived; these are
the ones this build *touches*): `lint:census` (new rows, renamed rows,
the deleted shelf row, `composition[].materialPath` on the new minerals,
**and the gate is extended to walk `alloying[].materialPath`**),
`lint:instanceable` (two new instanceable pack classes in `thing/`),
`lint:locations`, `lint:field-meta` (`Alloyed`, `Bloom`),
`lint:descriptors` (the new `appearance:` words must not collide with a
descriptor bank — if `green`/`rust` collide, use the compound words in
D15), `lint:verb-collisions` (no new verbs), `lint:inert-weapon` (nine
renamed rows keep their forms and default material),
`lint:combat-dynamics` (**allowlist gains `isTangible`**, physics),
`lint:perishable` (the new materials author no `spoilActivationEnergy`),
`lint:identity` (the independent is an `Extra`, no proper name, register
indefinite, answers to his outfit), `lint:module-scope`, `lint:imports`,
`lint:object-verbs`, `lint:test-bootstrap`, `lint:drive-scripts` (the
drive is a wire file), `lint:unconsumed-seams` (`temper` is on a `lib/`
mixin, outside its census; verify), and the new `lint:person-keys`.

---

## Waves

Each wave lands independently, ends at a commit, and updates this plan.
Mid-build verification is `pnpm test:near` + each touched pack's
`pnpm test` + `pnpm -C packages/server lint:family`; `pnpm test` runs
once before the MR and once at `/finalize`; `pnpm test:gym` runs in W5.

### W0 — the ground is clear (reachability, the defect, the anvil)

**Goal.** Nothing built on `smelt` can be driven until `smelt` exists.
Close the three inherited defects and the one live bug.

**Decisions.** D6, D12 (the outfit's mechanism is exercised here only
through the existing hewer), D13, D16, D17.

**Files.**
- new `content/trade-smelting/src/thing/SmeltingFurnace.ts`
  (`ContainerMixin(Forge)`, `commandContributions.peers = [smelt.yaml]`);
  `content/trade-smelting/content/trade/smelting/thing/furnace.yaml`
  `class:` → `/trade/smelting/thing/SmeltingFurnace`.
- `content/trade-fuel/src/thing/CharcoalPit.ts` — `commandContributions.peers = [char.yaml]`.
- `content/trade-smelting/src/idea/cmd/smelting/SmeltController.ts` —
  `SMELT_MS = 120_000`; the run consumes every basket (`fuel`, not
  `fuel.slice(0, 2)`); nothing else yet.
- `content/trade-mining/src/idea/cmd/mining/StakeController.ts:100` —
  `getIdentityPath()`.
- new `packages/server/scripts/check-person-keys.ts` +
  `packages/server/package.json` `"lint:person-keys"`; a fixture test
  `scripts/__tests__/check-person-keys.test.ts` (the
  `check-combat-dynamics.test.ts` shape) proving the literal matches the
  old stake line and not the kernel's `templatePath: buyer` sites.
- `content/rejection/content/world/rejection/location/smelter.yaml` —
  props `+ /trade/smithing/thing/anvil`, `+ /stuff/thing/gear/smiths-hammer`;
  `content/rejection/package.json` — `+ @saxonberg/content-trade-smithing`,
  `+ @saxonberg/content-generic-objects`; ⚠ `pnpm install` after (a pack
  dependency edit needs it).
- `docs/antipatterns.md § Keying a PERSON` — one line naming the gate.

**Acceptance.**
- A new controller test in `content/trade-smelting/src/__tests__/`
  dispatches `SmeltController` through `CommandApi.createCommandContext`
  against a lit `SmeltingFurnace` (the `branch-fixtures.makeLitForge`
  shape) holding three malachite lumps and three baskets: it mints one
  copper ingot of `Σ mass × grade × 0.5748` kg, slag for the rest, and
  **all three baskets are consumed**.
- `smelt` and `char` appear in `affordances` for a character standing in
  the smelter / fuel yard (a test through `CommandApi` affordance
  resolution, or the wire drive's first checkpoints).
- `lint:person-keys` reports `0 (ceiling 0)`; the stake test in
  `title.test.ts` gains a case: two avatars sharing one template path
  stake two blocks and `ownerOf` tells them apart.
- `pnpm -C packages/content/trade-smelting test`, `…/trade-fuel`,
  `…/trade-mining`, `lint:family` green.

**Commit.** `build(metallurgy W0): smelt and char afforded, the furnace a container, the anvil at the bloomery, the stake keyed on identity`

> ### ✅ W0 — done
>
> All four inherited defects closed as planned; no premise turned out
> wrong. Notes for whoever reviews this:
>
> - **The dead-verb finding is confirmed at the class level, not just by
>   grep.** `SmeltController.test.ts` is the smelt's first test ever, and
>   two of its cases exist only to pin the reachability: the furnace
>   is now `isFurnace && isContainer` (the shipped bare `Forge` was not,
>   so the controller's own guard could never have passed) and
>   `SmeltingFurnace.commandContributions` names `smelt.yaml`.
> - **The identity fix has a runtime regression test, not only the gate.**
>   `title.test.ts` stands two avatars up sharing ONE `templatePath` —
>   the premise every existing fixture quietly avoids — stakes two blocks
>   and asserts the recorded owners differ. Verified load-bearing by
>   reverting the one line: 2 of its 6 cases fail, then pass again.
> - ⚠ **`lint:person-keys` matches ONE written literal, in both key
>   orders, comments stripped.** Its unit test pins the boundary in both
>   directions (the stake line as it was actually written, prettier's
>   80-column wrap of it, and the kernel's identity-keyed owner writes
>   which must NOT match).
> - ⚠ **`CHARCOAL_PER_RUN` became `CHARCOAL_MINIMUM`.** The old name
>   described metering; the run now consumes the whole furnace, and the
>   constant is only the floor the decline reads.
> - ⚠ **A stale `@saxonberg/types` build makes `pnpm -C packages/server
>   build` report four errors in `CommandLogic`/`CommandGiver` that are
>   not real.** `pnpm -C packages/types build` first, and they go. Cost
>   ten minutes; recorded so it does not cost them again.
> - `pnpm install` was run after the `rejection` dependency edit, as the
>   wave said. `lint:family`: **all 40 gates pass**, `lint:person-keys`
>   among them (it self-enrolled off `package.json`, no roster edit).
>   trade-smelting 17, trade-fuel 13, trade-mining 129, trade-smithing 20.

### W1 — the deposit answers laterally, and the fringe is a place

**Goal.** Iron comes out of the ground at Rejection, and the ground
tells the truth about where.

**Decisions.** D1, D2, D12, D15.

**Files.**
- `content/trade-mining/src/idea/Deposit.ts` — `GradeBand.alongFrom/alongTo`,
  `Lode.halo`, `bandAt(z, along)` (keep the one-arg form for callers),
  `alongStrike(at)` (module-private, from `strikeVector`), the halo
  taper in `sampleAt`, the `z > 0` barren guard; docblocks.
- `content/trade-mining/src/idea/__tests__/Deposit.test.ts` — the
  window switches mineral along strike at one depth; the halo tapers to
  zero and is barren at `halo = 0`; a cell above the collar is barren;
  the shipped cases unchanged.
- `content/trade-mining/src/idea/cmd/perception/MeasureStrikeController.ts`
  — the staining phrase from the sampled mineral's `appearance`;
  `AnalyzeGroundController.ts` — the `ground` line (D15);
  `packages/types/src/…` `SurveyFrame.ground?: string`;
  `packages/client/src/components/cards/CardBodies.tsx SurveyBody` — one
  line; `survey.test.ts` — the line is present, and the mineral's name
  appears only at `competent`+.
- base-library: new `mineral/goethite.yaml` (FeO(OH), 88.85 g/mol, iron
  0.6285, hardness ~450, toughness ~10, tags
  `["mineral","oxide","hydroxide","ore","iron","oxide-zone"]`,
  `appearance: rust-brown`), new `mineral/siderite.yaml` (FeCO₃,
  115.85 g/mol, iron 0.4820, tags incl. `below-water-table`);
  `mineral/malachite.yaml` `+ appearance: verdigris-green`.
- rejection: `idea/deposit/ferrow.yaml` — zones become the four-band
  table of D2 (`alongTo: 75` on the two copper bands, `alongFrom: 75` on
  goethite →−45 @0.12/0.05 and siderite →−400 @0.10/0.04), `lode.halo: 15`,
  the two stale pin comments corrected to `-30,-10,-10`;
  new `thing/iron-ore.yaml` (`Ore`, goethite, quartz gangue, `grade: 0`,
  `mass: 1.4`, rust prose); four new rooms under `location/`:
  `hillside.yaml` (0,2,0), `old-workings.yaml` (2,4,0), `fringe-claim.yaml`
  (5,7,0; `AuthoredWorking`, `oreRow: iron-ore`, `cast: [independent]`),
  `far-fringe.yaml` (9,11,0; `AuthoredWorking`, `oreRow: iron-ore`);
  `claims-office.yaml` `+ north → hillside`; exits chain
  office ⇄ hillside ⇄ old-workings ⇄ fringe-claim ⇄ far-fringe with
  `edgeMinutes`; new `agent/independent.yaml` (`Extra`, `delves`
  `{home: fringe-claim, shelf: assay-counter, ask: 6, batch: 3}`, props
  pick + glowcap-jar); new `idea/fringe-outfit.yaml` (D12);
  `idea/ferrow-warren.yaml` `claimBlocks` `+ claims/2` centred (5,7,0).
- `content/trade-mining/src/__tests__/exemplar.test.ts` (reads
  Rejection's rows) — extend if it enumerates rooms.

**Acceptance.**
- `Deposit.sampleAt` at metres `(50,70,0)` with the Ferrow row and any
  seed returns goethite with grade > 0 and `depletion` unapplied; at
  `(−10,−10,−10)` malachite; at `(50,70,10)` barren.
- A test standing an `AuthoredWorking` at cell `(5,7,0)` in a zone
  naming the Ferrow row: `facesOf()` reports no `up` seam, at least one
  seam, and `hew` mints `/world/rejection/thing/iron-ore` with the
  sampled grade; two lumps pool mass-weighted.
- `stake 5,7,0` refuses `already-claimed`; `stake 9,11,0` succeeds and
  `ownerOf(claims/3)` is the staker's identity path.
- The independent's beat, driven once in a test (the `delves.bounded.test.ts`
  shape): ore appears on the assay counter listed to the fringe outfit.
- `lint:census`, `lint:locations`, `lint:descriptors`, `lint:identity`
  green.

**Commit.** `build(metallurgy W1): the deposit zones along strike, the fringe outcrops, an independent works it`

> ### ✅ W1 — done
>
> The geometry in the plan's Grounding table was re-derived against the
> shipped row and is exact: (5,7,0) is the first undepleted iron cell at
> along = 86 m, (9,11,0) is open ground at 142 m, and the four existing
> underground workings all sit at |along| < 30 m, so the co-op still
> mines copper. Notes:
>
> - **`lodeProximity()` is how the halo landed**, and it is the same
>   three dot products `isInLode` already makes, read as a magnitude
>   instead of a yes/no. The three tests are along ORTHOGONAL axes (the
>   plane's normal, its strike, its dip), so the amount by which a cell
>   fails them is a genuine Euclidean distance. No new geometry.
> - **`bandAt(z, along)` filters, then applies the shipped depth rule
>   unchanged.** With no windows authored the filter is the identity, so
>   the fifteen existing `Deposit.test.ts` cases did not move — asserted,
>   not assumed.
> - ⭐ **`solvesGround(band)` is derived from `SOLVE_FROM`, not
>   re-listed.** The first draft enumerated the naming bands and got the
>   vocabulary wrong (there is no `master` band); making it a predicate
>   over the existing table made "the same band that solves a plane names
>   the rock" literally true instead of a comment claiming it.
> - ⚠ **`SurveyFrame.ground` is OPTIONAL**, because the frame is shared:
>   `analyze soil` renders through it and has no mineral underfoot. A
>   required field would have made the other subsystem invent an answer.
> - ⚠ **New test file `src/__tests__/fringe.test.ts` reads the SHIPPED
>   Ferrow row on purpose.** `Deposit.test.ts` proves the mechanism on a
>   synthetic fixture and would pass identically while Rejection's own
>   `alongFrom` was a typo; the geometry is the fragile part. Ten cases:
>   both axes, symmetry, every room on the lode, iron outside the
>   depletion box and copper inside it, every room above the water table,
>   nothing ore in the sky, and the claim geometry.
> - Both collar-guard tests verified load-bearing by removing the guard:
>   2 fail, then pass again.
> - Corrected the stale pin comment in `hush-mouth.yaml` (`-30,20,-30`
>   → `-30,-10,-10`) and the stale *"two blocks"* comment in
>   `ferrow-warren.yaml`, which now has two.
>
> ⚠⚠ **A finding for review, not a defect this build introduces.**
> `MineWarren.claimFor` tests only the block's CENTRE cell against
> existing blocks, so the far fringe's block (centre 4 cells away)
> overlaps the independent's by three cells on each axis. That is how
> `stake` has always worked and there was only ever one block to notice
> it with. It is arguably *correct* — overlapping claims are what a claim
> dispute IS, historically, and a register that records both is the
> honest model of one — but it is now visible, and tightening it would
> refuse the drive's stake without moving the rooms past the lode's
> 180 m strike extent. Recorded in `fringe.test.ts` at the assertion.
>
> Deposit 20, mining pack 145 (14 files), `lint:family` all 40 green,
> client `tsc --noEmit` clean.

### W2 — carbon on the metal (kernel)

**Goal.** A bar knows what it is.

**Decisions.** D3, D4 (the material rows), D7 (the tags), D8, D10's
prerequisite (the mechanical numbers).

**Files.**
- new `mud/lib/material/Alloyed.ts` (`AlloyedMixin`; `fieldMeta`
  `alloying {persistent, authorable, spoiler: 1, spoilerName: 0}`,
  `temper {persistent, runtimeState}`); `mud/lib/mixin.ts` `Mixins.Alloyed`;
  `mud/api/mixin.ts` `isAlloyed`; `mud/platform/thing/Ingot.ts` and
  `Casting.ts` compose it (outermost, after `ManualBuild`/`Meltable`).
- `mud/platform/idea/api/CraftingLogic.ts` — `mintWorkpiece` +
  `applyTangibleOutput`: honour `outputMaterial`, flow `alloying` (D8).
- `mud/lib/craft/ManualBuild.ts` — no change (the bank reads the
  material's tags; `bloom-iron`'s tags do the work).
- `mud/platform/idea/cmd/perception/AnalyzeChemistryController.ts` —
  when the target is Alloyed, print `alloying` and the effective
  composition and `temper`.
- `mud/platform/idea/cmd/crafting/HeatController.ts` — an Alloyed target
  with `temper !== 'none'` is annealed at completion.
- `packages/server/scripts/check-template-census.ts` — walk
  `alloying[].materialPath`.
- base-library: new `alloy/cast-iron.yaml` (iron 0.96 / carbon 0.04;
  hardness ~700, toughness ~15; melting 1420 K, fusion ~240 kJ/kg; tags
  `["alloy","metal","ferrous","magnetic","brittle"]` — no `forgeable`);
  new `alloy/bloom-iron.yaml` (iron 0.75 / quartz 0.25 — a composite
  filed beside the ferrous alloys because that is where they live;
  hardness ~250, toughness ~40; melting 1811 K; tags
  `["metal","ferrous","bloom","spongy"]` — no `forgeable`);
  `alloy/steel.yaml` `+ meltingPoint: 1723`, `+ latentHeatOfFusion: 270000`,
  `+ forgeable`; `element/iron.yaml` `+ forgeable`;
  `element/copper.yaml` `+ hardness: 150, toughness: 110`;
  `element/carbon.yaml` `+ hardness: 50, toughness: 5`;
  `wood/oak.yaml` `+ hardness: 40, toughness: 60` (with the comment that
  the waster bench reads it).
- `content/trade-smelting/src/__tests__/smelt.test.ts` — untouched in
  W2; the faucet scan is extended to iron in W4, the wave that deletes
  the shelf (extending it here would fail until then).

**Acceptance.**
- `Alloyed.test.ts`: `setFractionOf` clamps and removes at 0;
  `getEffectiveComposition()` sums to 1 for steel with carbon 0.008
  over iron; an un-set instance reads the material's kind composition.
- `CraftingLogic` tests: a tangible recipe with `outputMaterial` mints
  that material; one without flows the stock's; `alloying` flows onto an
  Alloyed output and is absent on a non-Alloyed one; the off-spec
  `Casting` keeps carbon.
- `lint:field-meta`, `lint:census` (with the new walk), `lint:perishable`
  green; `test:near` green.

**Commit.** `build(metallurgy W2): AlloyedMixin on metal stock, the ferrous material rows, forgeable, outputMaterial honoured`

> ### ✅ W2 — done, and it re-planned W4
>
> The mixin, the rows and the two kernel mint rules all landed as
> written. One thing the plan did not foresee, found by writing the test:
>
> ⚠⚠ **D9 was caught in a pincer, and consolidation moves to the
> hammer.** Two shipped kernel rules meet badly on any recipe whose
> output is meant to be STOCK for the next recipe:
>
> - `mintWorkpiece` **requires** its output to compose `CraftedMixin`
>   (`CraftingLogic.ts:1642`) — it stamps a maker's mark on it;
> - `isItemCandidate` **excludes** a Crafted non-food from the one-shot
>   `forge` gather (`:337`) — a made form is not raw matter.
>
> So a `consolidate-bloom` recipe outputting a plain `Ingot` throws at
> mint time, and one outputting a Crafted bar mints fine and then cannot
> be `forge`d into anything. Verified both directions in the test before
> deciding. **W4 therefore drops the `consolidate-bloom` recipe and makes
> consolidation a transform at the `hammer`**: the first `bankWorkpiece()`
> of a `Bloom` squeezes the slag out, destructs the bloom and leaves the
> bar in its place, carbon and all.
>
> ⭐ That is the *better* answer on the merits, not just the available
> one. A bloom is consolidated by HAMMERING; the quench has nothing to do
> with it, and quenching a bloom would be actively wrong. The plan put it
> on `quench` because that is where mints happen — an engine-shaped
> reason. The ladder reads cleaner too: `smelt → heat, hammer → bar →
> heat, hammer, quench → blade`, and the player learns that a bloom needs
> beating before it is stock.
>
> **D8 stays** — the tangible path not reading `recipe.outputMaterial`
> while the edible and bulk paths did was a latent inconsistency worth
> closing on its own, and it is what will carry a casting rung. Its first
> *shipped* tangible consumer moved out of this build with D9;
> `lint:unconsumed-seams` does not reach it (checked, green).
>
> Other notes:
>
> - ⭐ **`getEffectiveComposition()` does NOT invent a host entry.** Iron's
>   row is `composition: []` because it is an element, so a carburized
>   iron bar reports `carbon 0.006` and nothing else. Writing
>   `iron 0.994` would be authoring the entry the row deliberately omits.
>   Pinned in `Alloyed.test.ts`.
> - ⭐ **`setFractionOf(path, 0)` REMOVES**, so a bar carburized and melted
>   back down is indistinguishable from one that never was.
> - ⚠ **Steel had no `meltingPoint` at all**, so `MeltableMixin` read 0
>   and a steel thing could never melt — the phase change was
>   one-directional for the metal the game is mostly made of. 1723 K now,
>   below pure iron's 1811 K, which is the same carbon fact the ladder
>   turns on.
> - ⚠ **Copper and oak authored NO hardness or toughness**, and carbon
>   neither. All three are authored here, before W5 makes an unauthored
>   material a material that delivers at the floor. Oak is the WASTER's
>   material and `waster-spar` asserts its blows still bruise.
> - `HeatController` anneals a hardened piece and narrates it — heating
>   past the critical temperature is what annealing IS, and it is why a
>   smith quenches last.
> - `lint:census` walks `alloying[].materialPath`. Two gates caught the
>   new test file (`lint:test-bootstrap`, `lint:test-content` — a kernel
>   test may not name `/world/<locality>`); both fixed, all 40 green.
>
> Alloyed 9, tangible-material 5, smithing 20, mining 145.

### W3 — the bloomery

**Goal.** The same ore charged two ways gives two different metals, and
a player can say why before they tap.

**Decisions.** D4 (the product rows), D5, D19.

**Files.**
- new `content/trade-smelting/src/thing/Bloom.ts` (D3/D9 shape;
  `slagFraction` field; `consolidate()`); new rows
  `content/trade-smelting/content/trade/smelting/thing/{iron-bloom,steel-ingot,cast-iron-pig}.yaml`
  (bloom: *"a spongy, slag-shot mass, not a bar"*; pig: *"hard, grey,
  brittle — for casting, not forging"*).
- `SmeltController.ts` — the rewrite of D5: charge classification
  (ore XOR alloyed stock; mixed → decline `mixed-charge`), dominant
  metal, the ferrous/non-ferrous heat gate, the carbon model with named
  constants (`T_REDUCE`, `T_FE`, `T_EUTECTIC`, `K_MELT`, `C_BLOOM`,
  `K_ORE`, `C_ORE_MAX`, `Δ_CARBURIZE`, `C_STOCK_MAX`, `C_SAT`,
  `BLOOM_SLAG`), the product-row discovery, the three tap scenes
  (bloom / steel / cast, each naming the carbon and, for the cast, that
  it ran *easier*), `creditDeed` by outcome.
- `furnace.yaml` — `bellowsMultiplier: 1.12` with the reasoning comment
  replacing the *"Stage C"* one.
- recipes (findable rungs only, `outputTemplate` the product row,
  `requiresHeatK` 1470/1590): `bloomery-iron.yaml` (hard),
  `carburize-steel.yaml` (hard), `cast-pig-iron.yaml` (hard) — the
  `smelt-copper` shape; `cast-bar.yaml` unchanged.
- `smelt.test.ts` — the controller cases below.

**Acceptance** (controller tests, iron-ore lumps 1.4 kg at grade 0.12,
baskets 8 kg, the `SmeltingFurnace` fixture):
- 3 lumps + 2 baskets, bellows on → **one `iron-bloom`**, `bloom-iron`
  material, carbon in `[0.0005, 0.002)`, mass = metal × 1.3, slag for the
  rest; `slagFraction ≈ 0.23`.
- 3 lumps + 4 baskets, bellows on → **one `cast-iron-pig`**, carbon 0.04,
  mass = metal.
- 3 lumps + 2 baskets, bellows off → declines `too-cold` naming the
  bellows.
- 1 wrought bar (0.5 kg iron, carbon 0) + 2 baskets, bellows on → **one
  `steel-ingot`**, carbon ≈ 0.006, mass 0.5; a second run on that bar →
  carbon ≈ 0.012; five runs → capped 0.021, still steel.
- 3 malachite lumps + 3 baskets, bellows off → the W0 copper case,
  unchanged.
- A bar and ore together → `mixed-charge`.
- Everything in the furnace is consumed; nothing is left.

**Commit.** `build(metallurgy W3): the bloomery — the charge decides bloom, steel or cast`

> ### ✅ W3 — done, with the carbon model re-derived
>
> ⚠⚠ **The plan's carbon model does not separate the regimes, and was
> replaced.** `C = C_BLOOM + K_ORE × r` over the raw fuel-to-ore ratio
> cannot put a two-basket charge and a four-basket charge on opposite
> sides of the melting threshold: at 1590 K the threshold is
> `C ≥ 0.0243`, and a straight line through both points needs a 12×
> change in carbon for a 2× change in ratio. (The plan said `K_ORE` was
> the build's to tune; the SHAPE turned out to be the problem, not the
> constant.)
>
> ⭐⭐ **The replacement is more physical, not just better-fitting:**
> carbon dissolves from the fuel that is left OVER once reduction has
> taken its share.
>
> ```
> surplus = max(0, fuelKg/oreKg − R_STOICH)     R_STOICH = 3.7
> C       = min(C_ORE_MAX, C_BLOOM + K_ORE × surplus)   K_ORE = 0.0075
> liquid  ⟺ heldK ≥ T_melt(C) = max(1420, 1811 − K_MELT·C)
> ```
>
> A straight ratio makes every extra basket equally dangerous, which is
> neither true nor interesting; an excess makes lean and slightly-rich
> both safe and then has a point past which it runs away from you. What
> it produces at Rejection's furnace (1.4 kg lumps, 8 kg baskets,
> bellows 1590 K):
>
> | charge | carbon | T_melt | result |
> |---|---|---|---|
> | 3 lumps, 2 baskets | 0.13 % | 1799 K | a bloom |
> | 3 lumps, 3 baskets | 1.56 % | 1669 K | a bloom — **natural steel** |
> | 3 lumps, 4 baskets | 4.3 % | 1539 K | it RAN: a cast pig |
> | bellows off | — | — | 1420 K, will not reduce |
>
> ⭐⭐ **The middle row is new and nobody designed it.** A bloom off a
> slightly rich charge carries enough carbon to beat straight into steel
> without ever being carburized — which is how most pre-modern steel was
> actually made. It falls out of the same two lines the other rows do, so
> `Bloom.consolidate()` now picks its bar row by the carbon band
> (`≥ 0.2 % → steel-ingot`, else `iron-ingot`). That is a deviation from
> D4's table and it is the arithmetic's, not mine.
>
> Other notes:
>
> - ⚠ **A carburizing charge loses no mass.** Nothing is being separated
>   out of a bar and a trace of carbon is going in. The first draft ran
>   stock through the same `Σ mass × fraction` the ore path uses and quietly
>   shaved 0.2 % off every steel bar (steel's composition is iron 0.998).
> - ⚠⚠ **The tap became async-deep and the existing test drain was too
>   short.** `completeStep` drains one macrotask, which was enough while
>   the run was arithmetic; the tap now DISCOVERS its product row
>   (`Template.findDescendants` — a store read), so a single drain lands
>   between the destruct and the clone and the furnace reads EMPTY. A run
>   that worked would have reported "no bar". The test has a `tap()`
>   helper; **any completion that needs a store read has this shape.**
> - ⚠ **A pack cannot import `backend/PersistenceManager`** (outside the
>   server's exports map, and `lint:imports` holds the boundary), so the
>   test seeds the content collection through `PersistApi.find`.
> - The bellows went 1.5 → 1.12 and the shipped assertion that it
>   *exceeds* iron's 1811 K was inverted. That assertion was pinning the
>   bug: at 2130 K every ferrous run pours and the bloom — the thing the
>   whole rung is about — is unreachable. It is now four assertions
>   naming the four facts that pin 1590 K.
> - `smelt` declines a **ferrous** charge with different prose from a
>   non-ferrous one, because it is different physics: iron does not want
>   to be melted, it wants to be reduced.
> - The product row is discovered by `_materialPath`, asserted by taking
>   a row AWAY: a material with no row fails loudly rather than eating
>   the charge.
> - `trade-smelting` gains a dependency on `trade-smithing` (the wrought
>   bar's row is smithing's). No cycle — smithing does not depend on
>   smelting, which is the direction D9's duck-typing protects.
>
> smelting pack 24 (14 of them the controller's), `lint:family` all 40.

### W4 — the anvil: consolidation, refusal, the arms, the shelf

**Goal.** A bloom is not a bar; cast iron cannot be forged; a player can
make a sword and eight more; no shelf sells metal from nowhere.

**Decisions.** D7 (the recipes), D9, D11, D14, D18, D20.

**Files.**
- `HammerController.ts` — the cast refusal before engaging
  (`fractionOf(carbon) ≥ 0.021` or material tagged `brittle` →
  `unforgeable`, prose naming cast iron); after a `true` bank, the
  duck-typed `consolidate()` and the mass-loss scene.
  ⚠⚠ **Re-planned at W2** (see the W2 note): `consolidate()` does the
  whole transform — squeeze the slag out, clone the bar, carry the
  carbon, destruct the bloom — and there is **no `consolidate-bloom`
  recipe and no quench step**, because `mintWorkpiece` requires a
  `Crafted` output and `isItemCandidate` excludes a Crafted non-food
  from the `forge` gather. A bloom is consolidated by hammering; the
  quench never had anything to do with it.
  `ForgeController.ts` — the same refusal on the `with` steer or when
  the only reachable ferrous stock is cast. `QuenchController.ts` — the
  treatment path (D14).
- the nine arms recipes (D18); the five shipped smithing recipes and
  mining's nine `[striking, anvil]` recipes (D7 names them; `pick`,
  `pick-haft`, `timber-set` are not anvil recipes and stay) →
  `category: forgeable` on the stock slot only (wood slots untouched).
- `content/trade-smithing/content/trade/smithing/thing/iron-ingot.yaml`
  — re-described as *the wrought bar* (Hearthworks still props it).
- generic-objects: rename the nine rows (`git mv`), keep
  `_materialPath: alloy/steel` with the D11 comment, prose no longer
  says *"of good steel"* where a forged one might not be;
  `content/newbie-wilds/…/{hollow,treeline}.yaml` props follow.
  `content/hearthworks/…/thing/smithy-menu.yaml` unchanged.
- terminus: `counter.yaml` two lines; delete
  `general-store/thing/iron-ingot.yaml`; the counter's header comment
  (*"the store sells inputs"*) corrected.
- `smelt.test.ts` faucet scan → iron.

**Acceptance.**
- `smithing-manual.test.ts`: `heat`/`hammer` on an `iron-bloom` **leaves
  a bar** — `/trade/smithing/thing/iron-ingot` of `element/iron`, mass
  down by `slagFraction`, the bloom's carbon carried, a slag lump on the
  floor and the bloom gone; a second `hammer` on that bar is ordinary
  forming and squeezes nothing. ⚠ No quench step and no recipe (the W2
  re-plan).
- `hammer` on a `cast-iron-pig` declines `unforgeable` and the prose
  names cast iron; `forge dagger with pig` likewise; `forge dagger` with
  only a pig in reach likewise.
- `quench` on a heated, un-hammered wrought bar → scene only; steel bar
  → `temper: hardened`, and a following `heat` anneals it; pig → two
  half-mass pigs.
- `knowledge-ladder.test.ts` unchanged; a new test walks every
  `[striking, anvil]` recipe in the installed catalogue, groups them by
  their exact slot signature (categories × counts), and asserts the
  **new** rows introduce no tie — the pre-existing ties D18 names are
  listed in the test as the known set, so the check is a ratchet, not
  an amnesty.
- The faucet scan: no shipped row stocks or props an `Ingot` of iron or
  steel outside `/world/hearthworks/` and `/trade/smithing/` (the
  Hearthworks props) — the general store is clean.
- `lint:census`, `lint:inert-weapon`, `lint:verb-collisions` green.

**Commit.** `build(metallurgy W4): consolidation loses slag, cast refuses, nine arms on the ladder, the iron shelf deleted`

> ### ✅ W4 — done
>
> Consolidation landed as the W2 re-plan says: a transform at the
> `hammer`, fired by the first `bankWorkpiece()`, no recipe and no quench
> step. Three things the plan did not foresee:
>
> ⚠⚠ **`Shield` composed `GradedMixin` but not `CraftedMixin`**, so the
> shield recipe threw at mint (`mintWorkpiece` stamps a mark and requires
> it). `Crafted` composes `Graded`, so the fix is a one-word swap and the
> grade surface is unchanged — the shield gains the maker's mark it
> always should have had. `Weapon` and `Garment` already composed it; the
> shield was the odd one out among the three things a smith makes, for no
> reason anybody had recorded. **Same class of finding as the D9 pincer**,
> and both came from making something actually makeable.
>
> ⚠⚠ **The arms rows' NAMES said steel, and the mint does not rewrite
> prose.** D11 keeps the default `_materialPath` (a material-less prop
> delivers zero after W5), but keeping *"steel dagger"* on a row an iron
> bar can mint is the two-copies-of-one-sentence failure: the card would
> say iron and the room would say steel. So the nine rows now name their
> SHAPE — `dagger`, `arming sword`, `faced shield`, `mail hauberk`,
> `breastplate` — and the metal is the instance's, reported by the card
> and by `analyze weapon`. That is what *"a blade names its own metal
> honestly"* actually requires; D11's letter (drop the path) would not
> have achieved it and this does.
>
> ⚠ **`pick-head` moving to `forgeable` broke a shipped assertion** in
> `archetype-and-ladder.test.ts` that the chain closes through a `metal`
> slot. The intent survives and the word changed; `pick` itself is
> ASSEMBLED rather than forged, so it keeps `metal` and is right to.
>
> Other notes:
>
> - ⭐ **The tie check found no new tie**, and the two that exist
>   (`pick-head`/`tongs` @1200, `assay-kit`/`miners-dial` @1100) both
>   pre-date the retag — an iron bar satisfied `ferrous` and `metal`
>   alike before there was a third word. `anvil-ladder.test.ts` holds
>   them as a ratchet. ⚠ The plan listed `shovel` in the 1100 tie set; it
>   is not one — its slot signature differs by `minGrade`.
> - `forge` names cast iron when the gather comes up empty AND there is a
>   pig in reach. The gather correctly cannot see one (no `forgeable`
>   tag), but *"there is no stock"* teaches nothing when a grey bar is
>   sitting right there.
> - The iron shelf is deleted, row and all, and the faucet scan is
>   generalised: `stockedFrom(/iron|steel/)` is green. ⭐ Hearthworks' two
>   props stay and are not a faucet — bounded, authored, never restocked.
> - `trade-smithing` gains a **dev**-dependency on `trade-smelting` for
>   the `Bloom` fixture only; the runtime duck-typing is untouched, so
>   the pack still ships with no dependency on the smelting trade.
>
> smithing 34, mining 145, smelting 25, generic-objects 26, terminus 109;
> `lint:family` all 40.

### W5 — material in a blow

**Goal.** Two blades forged from different metal perform differently
in a fight.

**Decisions.** D10.

**Files.** `mud/api/material.ts` `+ materialHeight`; `MaterialLogic.ts`
forwarder + the docblock; `CombatLogic.ts:2236` the fold + the docblock;
`packages/server/scripts/check-combat-dynamics.ts` allowlist
`+ isTangible` (with the reason); `docs/subsystems/{combat,crafting,materials-response}.md`
retire the asymmetry sentences.

**Acceptance.**
- A `CombatLogic` unit test: the same swing with a steel and an iron
  blade of equal grade/condition delivers energies in the ratio
  `materialHeight(iron)/materialHeight(steel)` on edge; a steel blade's
  energy is byte-identical to before the fold (assert against the
  pre-change number, recorded in the test).
- `pnpm test:gym` run **before** the fold (on the W4 commit) and
  **after**; both reports attached to the MR. Acceptance: every steel
  matchup identical; `waster-spar`'s assertions hold (oak's toughness is
  authored in W2 for exactly this); any shift in a mixed-material
  matchup is listed with its factor. If the whip's edge lash or the
  waster's bruise falls below the wound threshold at the reference
  energy, the knob is `response.material.heightFloor`, and that is a
  finding for the MR, not a code change.
- `lint:combat-dynamics` green.

**Commit.** `build(metallurgy W5): material height enters delivery — the preview and the fight agree`

> ### ✅ W5 — done, and the gym is UNCHANGED
>
> The fold is three lines. The cost was entirely in proving it moved
> nothing, and it moved nothing.
>
> **The gym, run either side of the fold** (the fold was temporarily
> disabled for the before-run, then restored):
>
> | | before | after |
> |---|---|---|
> | `combat-gym` | 1 failed, 11 passed | 1 failed, 11 passed |
> | `waster-spar` | **3 passed** | **3 passed** |
> | `species-mass.bench` | 2 failed | 2 failed |
> | total | 3 failed, 32 passed | 3 failed, 32 passed |
>
> ⚠⚠ **All three failures are PRE-EXISTING on `origin/master`** — the gym
> is red there and has been. Established rather than assumed: the
> material rows were reverted to `origin/master` and the gym re-run,
> producing byte-identical failures. They are:
>
> - `combat-gym` *"a feint beats a low-competence turtle"* — in a
>   describe block named **"the parry seam is dead
>   (rock-paper-scissors)"**, so it is a known-broken area asserting its
>   own brokenness and now disagreeing about the shape of it.
> - `species-mass.bench` ×2 — every shipped species reads back at the
>   DEFAULT 70 kg / 1.78 m, which is the bench not resolving species
>   content at all rather than a value having moved.
>
> **Neither is this build's, and both should be on the MR.** `test:gym`
> is not in `pnpm test` and has its own CI job, which is how a red bench
> stays red without anybody tripping over it.
>
> ⭐ **`waster-spar` passes**, which was the plan's named numeric risk.
> Oak's toughness was authored in W2 for exactly this; without it the
> waster would have delivered at the 0.6 floor on blunt and its blows
> might have fallen under the wound threshold. It did not, so the
> `heightFloor` dial was not touched.
>
> Other notes:
>
> - ⭐ **`check-combat-dynamics` needed NO allowlist edit.** The plan
>   expected to add `isTangible`; it is already there (line 97). The
>   build-time check the plan asked for, answered: leave the allowlist
>   alone.
> - The new `material-delivery.test.ts` pins the reference (steel is
>   exactly 1.0 on every channel — the assertion that makes the change
>   safe), the ratio (iron/steel ≈ 0.833 on an edge), the ladder
>   (steel > iron > bronze > copper), the zero for a `null` material,
>   and ⚠ cast iron's honest shape: a **finer edge than steel** and far
>   worse everywhere else, which is what brittleness looks like in two
>   numbers.
> - The last case is structural rather than numeric, and deliberately:
>   the asymmetry was never really *"combat ignores material"* — it was
>   TWO FORMULAS allowed to disagree, one of which was what the player
>   was shown. So the check is that the engine CALLS the method rather
>   than re-deriving a height of its own.
> - The asymmetry sentence is retired from `combat.md`,
>   `crafting.md` and `materials-response.md`, each replaced with what
>   is true now and why it changed.
>
> ### ⚠⚠ W5 follow-up — a null material is NEUTRAL in delivery
>
> The first landing of the fold scaled by `materialHeight(null) === 0`
> and **two shipped combat tests went red**: `CombatLogic.hooks` (a
> hook-bearing room never hears `blood:`) and `CombatLogic.test` (the
> spear/dagger reach tier). Both fixtures build a blade with
> `weaponForm: 'bladed'` and no `weaponMaterial` — so the weapon
> delivered nothing at all and nobody bled.
>
> ⭐⭐ **The same number means two different things on the two sides of a
> blow.** On the covering side a null material is *no covering*, and no
> covering protects nothing — zero is exactly right and is what the
> function has always returned. On the delivery side the weapon is
> PRESENT; what is missing is our knowledge of what it is made of.
> Scaling by zero there lets one unauthored content field silently
> delete combat, which is the worst failure shape there is.
>
> So `instrumentDeliveryScale` **guards the null** and leaves the scale
> neutral, rather than `materialHeight` changing for its original
> caller. That also makes the fold's blast radius the smallest honest
> one: every weapon nobody authored a material for behaves exactly as it
> did before, because before the fold material was ignored entirely.
>
> ⚠ **D11's justification shifts and D11 still stands.** The arms rows
> keep a default `_materialPath` not because a material-less prop would
> deliver zero (it no longer would) but because a row should say what it
> is made of — and W4's rename means the rows now name their SHAPE and
> let the instance's metal speak, which is the honest version of the
> same requirement.

### W6 — the drive, and the docs

**Goal.** The requirements' fifteen steps, run against the running game
as a wire file, and the subsystem docs told what changed.

**Files.** new `packages/wire/tests/metallurgy.dirty.wire.test.ts`
(`packs: ['trade-mining','trade-fuel','trade-smelting','trade-smithing','generic-objects','base-library','rejection','terminus']`;
dirty: it stakes ground, cuts it, and burns fuel); `docs/subsystems/mining.md`
(the lateral term, the fringe, the outfit), `crafting.md` (consolidation,
the treatment path, `outputMaterial`, `forgeable`), `materials-response.md`
(`AlloyedMixin`, the fold), `combat.md`, `content-packs.md` one line
(`SmeltingFurnace`), the three trade packs' `README.md` and `pack.yaml`
descriptions, `docs/lint-family.md` (`lint:person-keys`); this plan's
§ Drive record.

**The drive, mapped to the world** (one session born at the pithead;
`awaitActivity` on every engaged act).

Mechanics the script depends on, settled here so the build does not
rediscover them:
- **Funding.** `measure` is afforded by the instrument (`SurveyInstrument`
  contributes `measure.yaml`; `analyze` is innate on `Avatar`). The
  compass is 60 at provisioning. Fund the character the way
  `work.dirty.wire.test.ts:139–149` does: a `Session.open('founder')`
  runs `reserve issue`, drops coin, the miner picks it up. The file is
  dirty for that reason too.
- **Vessel selection.** Bare `heat`/`hammer`/`quench` take the **first**
  build vessel among the giver's contents then the room's
  (`ManualBuildController.findBuildVessel`), and `hammer <name>`'s arg
  requires `DurableMixin`, which no stock composes — so the drive uses
  the bare verbs and holds **one** piece of stock at a time, leaving the
  rest inside the furnace (a furnace's contents are not room contents)
  or in another room.
- **Charcoal.** Propped baskets in the fuel yard (a bounded prop, like
  the Hearthworks ingots), with the room comment saying why; `char`'s
  three-day burn is not drivable.

1. `look outcrop`; buy the compass; `measure strike` at the yard.
2. `north` (claims office), `north` (hillside), `northeast` ×3 to the
   far fringe; `look` — rust.
3. `measure strike`; `analyze ground` — the `ground` line names goethite
   (the character is seeded `competent` in geology, or the line reads
   *rust-brown, lean*).
4. Walk back; `stake 9,11,0` at the office — ok; `stake 5,7,0` —
   `already-claimed`.
5. Walk out; `hew` ×3; `look` — one lot, quantity 3, grade the ground's.
6. Walk to the smelter; `put ore in furnace`, `put charcoal in furnace`
   ×2 (charcoal: two baskets charred at the clamp in an earlier leg, or
   propped in the fuel yard for the drive — decide at build; a prop is
   the honest short cut and is bounded), `ignite furnace`, `pump furnace`,
   `smelt`; await.
7. `get bloom`; `look bloom`; `analyze chemistry bloom` — carbon low.
8. Hew three more (or a second lot), four baskets, `pump`, `smelt` —
   `get pig`; `analyze chemistry pig` — carbon 0.04; the scene said it
   ran.
9. `heat bloom`, `hammer bloom` (mass drops, slag on the floor),
   `quench bloom` → an iron bar.
10. `heat bar`, `hammer bar`, `quench bar` at 1450 K with a second bar
    (the sword takes two: hew, smelt, consolidate twice — or the drive
    forges a **dagger** with one bar and names the sword as the
    two-stock case in a unit test; ⚠ choose the dagger for the drive
    and say so) → the deed; `forge dagger` now ok where it declined.
11. `analyze weapon dagger`, `analyze response dagger` — iron.
12. `put bar in furnace`, two baskets, `pump`, `smelt` → steel bar;
    forge a second dagger; `analyze response` — better; `analyze
    chemistry` — the carbon.
13. `heat`/`quench` a wrought bar (nothing), the steel bar (hardened),
    the pig (cracks).
14. A second session born at the general store: `buy ingot` → no such
    good.
15. The independent: the wire test waits one `delves` cadence (90 s)
    and queries the assay counter's listings for iron ore consigned by
    the fringe outfit.

**Commit.** `drive(metallurgy): <what driving found>` then the docs as
part of the same or a following commit; push; open the MR with the two
gym reports.

---

## Reachability wiring

Every link fails closed and silent. For each new capability:

| capability | verb | affordance | data | boot |
|---|---|---|---|---|
| charge and tap a furnace | `smelt` (exists) | **new** `SmeltingFurnace.commandContributions.peers` (W0) | `furnace.yaml class:` → `SmeltingFurnace`; product rows under `/trade/smelting/thing/` | none — rows are read as templates at dispatch; materials warm by infix |
| char a clamp | `char` (exists) | **new** `CharcoalPit.commandContributions.peers` (W0) | `clamp.yaml` (exists) | none |
| hew iron at the fringe | `hew` (exists) | `WorkingMixin` on `AuthoredWorking` (exists) | the two fringe rooms with `oreRow`, `iron-ore.yaml`, the Ferrow zones + `halo`, goethite/siderite rows | `Deposit` get-or-create (exists); `MaterialCatalogue.warm` (exists) |
| stake the far fringe | `stake` (exists) | `ClaimsRegister` in the office (exists) | `claimBlocks` block 2; the office's `north` exit | none |
| read the fringe | `measure strike` / `analyze ground` (exist) | the surveying instrument (exists) | `appearance:` on the minerals; `SurveyFrame.ground` in types + client | none |
| consolidate a bloom | `heat`/`hammer`/`quench` (exist) | `FurnaceMixin` (heat) + **`Anvil` propped at Rejection** (W0) | `consolidate-bloom.yaml`; `bloom` tag on `bloom-iron`; `iron-ingot.yaml` (smithing) | `RecipeCatalogue` installs `content/recipes/` documents (exists) |
| refuse cast | `hammer`/`forge` (exist) | `Anvil` (exists) | `brittle` tag; no `forgeable` on `cast-iron` | none |
| forge the arms | `forge` + the by-hand three (exist) | `Anvil` | nine recipes; renamed rows; `forgeable` on iron/steel | `RecipeCatalogue` |
| carburize | `smelt` | `SmeltingFurnace` | `steel-ingot.yaml`; `steel.yaml meltingPoint` | none |
| heat-treat | `quench` (exists) | `Anvil` (quench is afforded by the anvil today) | `temper` field | none |
| iron on a quiet night | — | `BehavedMixin` on the `Extra` (exists) | `independent.yaml` `behaviors:`; `fringe-outfit.yaml` roster + `operatingLocations`; `cast:` on `fringe-claim.yaml` | the Business stands up lazily off `operatingLocations` (exists); `cast:` clones at room standup (exists) |
| no metal from nowhere | `buy` (exists) | — | the shelf row and lines removed | — |
| material in a blow | `attack`/`fight` (exist) | — | copper/carbon/oak mechanics authored | none |
| the identity gate | — | — | — | `lint:family` derives the roster from `package.json` |

⚠ Two links that would have failed silently and are now named: the
`AuthoredWorking` rooms are **`cast:`/`props:` + `commandContributions`
on the class** — a row's `commandContributions:` is dead; and the new
recipes' `outputTemplate` paths must resolve (`lint:census`) — a typo
mints nothing at quench time.

---

## Acceptance-criteria coverage

| requirements criterion | wave(s) |
|---|---|
| A player who has never spoken to the co-op can hold an iron bar they made (staked, hewed, hauled, smelted) | W0 (smelt exists; anvil at Rejection), W1 (fringe, stake), W3 (bloom), W4 (consolidate → bar); drive steps 4–9 |
| The ground tells the truth: outcrop and fringe give different minerals from the same verbs; two players at one cell read the same rock | W1 (`bandAt` window, `ground` line, seeded not drawn — `Deposit.test.ts` determinism case unchanged) |
| The same ore charged two ways gives two different metals, and a player can say why before they tap | W3 (ratio × heat → bloom/cast; the scene names the carbon and the melting point) |
| A bloom cannot be used as a bar; consolidation visibly costs mass | W2 (`bloom-iron` not `forgeable`), W4 (`consolidate()` on the first bank) |
| Cast iron cannot be forged, and the refusal says what it is | W4 (`hammer`/`forge` `unforgeable` prose) |
| Two blades of different metal perform differently in a fight | W5 |
| No shelf anywhere sells metal with no provenance | W4 (shelf deleted; faucet scan extended to iron) |
| A player can make a sword and eight more | W4 (nine recipes), W0 (an anvil where the bars are) |
| A blade names its own metal honestly | W2/W4 (`outputMaterial` empty on arms → the stock's material flows; `analyze weapon` reads it) |
| The realm still produces iron when nobody is logged in | W1 (the independent + his outfit); drive step 15 |
| The balance benches are run and the shift accounted for | W5 (two gym reports in the MR) |

Drive steps not covered by a criterion but required by the script: step
13 (quench all three) → W4 D14; step 14 (the store) → W4.

**Scope gap surfaced:** none unmapped. Two places the plan reads the
requirements by intent (D6 the run's length; D11 the default material)
are flagged in § Risks.

---

## Test & gate strategy

- **Unit** (per package, `test:near` in the loop): `Deposit.test.ts`
  (window, halo, collar), `Alloyed.test.ts`, `CraftingLogic` mint cases,
  `SmeltController` regime cases (the first controller tests the smelt
  has), `smithing-manual.test.ts` consolidation + refusal + treatment,
  the count-ladder tie check, `title.test.ts` the two-avatar stake,
  `check-person-keys.test.ts`, the affordance presence of `smelt`/`char`.
- **Gym** (`pnpm test:gym`, W5 only): before and after the fold; the two
  reports are MR artefacts.
- **Wire** (`pnpm wire`, W6): the drive file; it is the only proof of
  steps 4, 9, 12 and 15 end to end.
- **Full suite**: once before the MR, once at `/finalize`. Not between.
- **Gates**: `pnpm -C packages/server lint:family` after every wave; the
  ones this build touches are listed under § Convention conformance.
- What only the drive can prove: that the verbs are *reachable* in a
  booted world (W0's whole point), that the independent's beat lists ore
  (a roster + lazy business + `wallet use house` + consign chain no unit
  test crosses), that the card renders the `ground` line.

---

## Risks & opens

**For the user's eye (decisions the plan makes that the requirements did
not, in order of consequence):**

1. **D11 — the arms rows keep a default `_materialPath`.** The
   requirements say drop it; the plan keeps it because a prop of a
   material-less weapon delivers zero after D10 and the newbie wilds
   prop five of them. If the user wants the letter, the alternative is
   newbie-wilds-local materialized rows for its five props (duplicate
   rows, drift) or a `materialHeight(null)` fallback (a lie the other
   way).
2. **D13 — an anvil and hammer at Rejection's smelter.** Not in the
   requirements' placement table. Without it the chain's consolidation
   step has nowhere to happen that a character can reach from the mine.
3. **D6 — `SMELT_MS` four game hours → two game minutes.** A pace
   constant, but it was authored as a claim.
4. **D14 — `temper: hardened` has no mechanical consumer.** The drive's
   step 13 asks for it to be observable; the plan makes it a recorded
   fact `analyze` reports, not a number the fold reads. If that is too
   thin, the honest larger version is the crafting skill/treatment wave,
   not this build.
5. **D5's `bellowsMultiplier` 1.5 → 1.12** on Rejection's furnace, and
   the run consuming every basket. Both change the shipped copper
   smelt's inputs (not its yield).
6. **D2's numbers** (`alongFrom: 75`, `halo: 15`, goethite 0.12) are
   authored for the drive's geometry; a different fringe distance moves
   the rooms.
7. **D7 widens smithing's five recipes to copper stock** (the
   `forgeable` tag on copper). Honest and priced by D10, but it is a
   behaviour change to shipped content that the requirements did not
   name. The alternative is two tags (`forgeable` + a second
   iron-only one), which is a second vocabulary for one fact.

**Numeric risk.** W5's gym may show a mixed-material matchup crossing a
wound threshold (the whip's lash at ×0.61, the waster at ≈×0.7). The
plan's position: report it; the knob is the `heightFloor` dial; do not
retune material rows to rescue a bench.

**Build-time checks the plan cannot settle from here:**
- `lint:descriptors` against the two new `appearance:` phrases.
- Whether `lint:unconsumed-seams` reacts to `temper` (its census is
  `platform/idea/**` data Ideas; a `lib/` mixin field should be outside
  it — verify). `lint:untitled` (`scripts/check-untitled-paths.ts`)
  checks every shipped path under a title root has a `requires.title`
  claim as a prefix: the new rows all sit under `/world/rejection`,
  `/trade/smelting`, `/trade/smithing` and `/stuff/idea/material`, which
  are claimed already; `claims/2` is a parcel extent, not a shipped
  path, and is outside its walk.
- The drive's charcoal: a propped basket rack in the fuel yard (bounded,
  like the Hearthworks ingots) versus charring in the drive (`BURN_MS`
  is three game days — 6 real hours; not drivable). Prop it, and say so
  in the room's comment. ⚠ This means charcoal on a quiet night is still
  nobody's; the collier has no producer brain. Recorded under Deferred.
- `check-combat-dynamics`' allowlist edit: confirm `isTangible` is not
  already reachable through `isConstructed` typing; if `Weapon`'s
  `getMaterial` is reachable on `Stuff & Constructed` without the
  predicate, prefer that and leave the allowlist alone.

**Things the build should stop and ask about rather than guess:** none
identified. Every fork above has a default and a flag.

**Findings outside scope, recorded:** the maker's-mark fallback
`makerPath` in `QuenchController`/`PlateController`/`StrainController`/`RepairController`/`SewController`
is `getTemplatePath()`; the kernel prefers the live identity path so it
is a dead fallback today, and `CraftedMixin.resolveMakerName` resolves
the mark with `findByTemplatePath`, which cannot resolve an identity
path. `cook-pot` and `smiths-hammer` tie at 800 K. Slag is a
`Provision`. `cast-bar.yaml` (`category: metal`, tools `[gripping]`)
names `copper-ingot` as its output whatever metal was poured, so after
this build a molten pig cast through it would mint a "copper ingot" of
cast-iron material — the pre-existing fixed-output shape, now visible;
the same product-row discovery D5 gives `smelt` is the fix, when a
consumer needs it.

---

## Deferred seams

Clean attach points, each with the slate it leaves as:

- **Tin, bronze, the bronze breastplate** — a deeper `toZ` band on the
  Ferrow row (`alongTo` for the heart, the existing depth axis for the
  granite contact), a `cassiterite.yaml`, `tin-ingot.yaml` discovered by
  the same product scan, an `alloy` regime in `smelt` (two metals in one
  liquid charge → `AlloyedMixin.setFractionOf(tin, …)` on a bronze
  ingot). → `metal-chain-slate.md` § *The deposit is zoned* (Stage C).
- **Sulfides and roasting** — chalcopyrite/siderite below the water
  table are authored and unreachable. → metal-chain Stage B.
- **Heat treatment as mechanics** — `temper` onto made things and into
  `materialHeight`; the crafting stamp seam `materials-response.md`
  already names. → the crafting skill wave (`crafting.md` § Deferred).
- **Charcoal on a quiet night** — a `chars` producer brain for the
  collier over `char`'s three-day burn. → `metal-chain-slate.md` § *Fuel
  is the trade*.
- **Title for an NPC's outfit** — `claims/2` is in the register without
  a parcel record; a `requires.title` holder shape for a Business. →
  `mining-slate.md` § residual opens.
- **Carbon on the blade** — `AlloyedMixin` on `Weapon`/`Garment` and
  the flow in both mint paths, when something reads it. → the crafting
  stamp seam.
- **A compressed-clock wire boot group** — the growth arcs and any
  multi-hour engagement. → `docs/testing.md` records the ceiling.
- **The maker's-mark identity resolution** — `resolveMakerName` by
  identity path; the four `getTemplatePath()` fallbacks. →
  `docs/antipatterns.md § Keying a PERSON` (a follow-up sweep).
- **High-grading as an offence**, the shaft/pump/commons → Stage B, as
  the requirements say.

---

## Critical files

Read first, in this order:

1. `docs/requirements/metallurgy-requirements.md`
2. `docs/subsystems/mining.md`, `crafting.md` (§ The manual build, § The
   lifecycle), `materials-response.md`, `combat.md` (§ The exchange),
   `command-routing.md` (§ ONE record of verb affordances)
3. `packages/content/trade-smelting/src/idea/cmd/smelting/SmeltController.ts`
4. `packages/content/trade-mining/src/idea/Deposit.ts` and
   `packages/content/rejection/content/world/rejection/idea/deposit/ferrow.yaml`
5. `packages/content/trade-mining/src/lib/Working.ts`,
   `src/location/AuthoredWorking.ts`, `src/idea/cmd/mining/{HewController,StakeController}.ts`,
   `src/idea/MineWarren.ts`, `src/behavior/delves.ts`
6. `packages/server/src/mud/lib/craft/ManualBuild.ts`,
   `packages/server/src/mud/platform/idea/api/CraftingLogic.ts`
   (`matchBuild`, `mintWorkpiece`, `applyTangibleOutput`, `isItemCandidate`)
7. `packages/content/trade-smithing/src/idea/cmd/crafting/{HammerController,QuenchController,ForgeController}.ts`,
   `src/thing/Anvil.ts`, `content/recipes/*.yaml`
8. `packages/server/src/mud/platform/thing/{Ingot,Casting,Forge}.ts`,
   `packages/server/src/mud/lib/fire/Furnace.ts`,
   `packages/server/src/mud/lib/thermal/Meltable.ts`,
   `packages/content/trade-fuel/src/thing/CharcoalPit.ts`
9. `packages/server/src/mud/platform/idea/api/MaterialLogic.ts`
   (`materialHeight`, `previewBandImpl`),
   `packages/server/src/mud/platform/idea/api/CombatLogic.ts:2236`,
   `packages/server/scripts/check-combat-dynamics.ts`,
   `packages/server/vitest.gym.config.ts`
10. `packages/content/base-library/content/stuff/idea/material/{element/iron,element/copper,element/carbon,alloy/steel,alloy/bronze,mineral/malachite,wood/oak}.yaml`
11. `packages/content/generic-objects/content/stuff/thing/{arms,armor}/*.yaml`,
    `packages/content/newbie-wilds/content/world/newbie-wilds/crossroads/{hollow,treeline}.yaml`,
    `packages/content/terminus/content/world/terminus/general-store/counter.yaml`
12. `packages/content/rejection/content/world/rejection/**` (the rooms,
    the warren, the businesses, the hewer)
13. `packages/content/trade-mining/src/idea/cmd/perception/{SurveyChannelController,MeasureStrikeController,AnalyzeGroundController}.ts`,
    `packages/types/src/` (`SurveyFrame`),
    `packages/client/src/components/cards/CardBodies.tsx` (`SurveyBody`)
14. `packages/server/scripts/{check-drive-scripts,check-template-census}.ts`,
    `docs/lint-family.md`, `docs/antipatterns.md § Keying a PERSON`
15. `packages/wire/tests/{metal-chain.dirty,crafting.dirty}.wire.test.ts`,
    `packages/wire/src/harness/index.ts`, `docs/testing.md § Two tiers`

---

## Drive record

**Run 2026-09-15 against a booted server** (`saxonberg_build1`, the
worktree's own DB), as `packages/wire/tests/metallurgy.dirty.wire.test.ts`.
Final: **13 passed, 0 failed.** The shipped `metal-chain.dirty` drive
(7) and the whole clean wire suite (43) pass alongside it.

⭐ **Boot was clean.** Seven renamed rows and one deleted row reconciled
with **zero** `FAILED at step` / `owned by pack` lines, which was the
main content risk of the W4 renames.

### ⚠⚠ What the drive found, and it is the third dead verb

**`stake` had never worked in a booted world either.**

```
> stake 9,11,0
The register names no diggings.
```

`StakeController` resolved the `MineWarren` with a bare
`StuffApi.findByTemplatePath`. A `MineWarren` is a **reference Idea and
nothing warms a roster of them**, so on a fresh process that reads null
forever — and the claims layer, the whole pedagogical payload of the
parcel subsystem, answered *"the register names no diggings"* to every
claim anybody has ever attempted. 145 unit tests did not notice, because
a unit test stands the warren up itself.

⭐ **Three sites of one bug is a pattern, not an oversight.**
`SurveyChannelController.depositAt` had already patched exactly this for
`Deposit`, and `Working.resolveDeposit` for its own — both with a
get-or-create and both with a comment saying why. `StakeController` now
has the same. **A reference Idea that nothing instantiates at boot must
be resolved by its reader**, and this is the fourth recorded instance.

⚠ **And the drive nearly missed it.** The first draft's "already claimed"
assertion matched `/already|register|claim/i`, and *"The register names
no diggings"* contains the word **register** — so the refusal test passed
green against a completely different failure. It only surfaced because
the SUCCESS case next to it could not be fudged. The match is narrow now,
with a comment saying why.

Two smaller drive findings, both the test's own fault and both fixed:
the general store's room is `shop-floor`, not `shop` (a bad
`startLocation` answers **500** from `/auth/test-login`, which reads like
an auth problem and is not); and `buy ingot` answers *"ingot isn't for
sale here"* with a typographic apostrophe, so a `don't`-style pattern
does not match it.

### The checkpoints that passed, and what each one proves

| checkpoint | proves |
|---|---|
| four rooms north-east out of the claims office | the fringe is a WALK — no adit, cage, lamp or permit |
| `look` reads rust and **not** green | lateral zonation arrived as prose, not as a number |
| `stake 5,7,0` refuses, `stake 9,11,0` takes | first come is the rule, and the register is real |
| `hew` at the far fringe is about ore or the pick | the face is iron-bearing, never barren |
| `analyze ground` names what is underfoot | D15, through the card's own frame |
| **`smelt` is not `unknown-verb`** | ⭐⭐ the dead verb is alive — the build's whole premise |
| the furnace is a container you can charge | the `as never` cast no longer hides a hole |
| the anvil is in the smelter | a bloom has somewhere to be consolidated |
| **`char` is not `unknown-verb`** | the second dead verb is alive |
| charcoal is in the fuel yard | the rung is not blocked on a three-day burn |
| `buy ingot` — *"isn't for sale here"* | the faucet is shut, from the player's side |

⚠ The shipped `metal-chain.dirty` assertion that `smelt` is an
`unknown-verb` at the fuel yard was **inverted**: it used to pass for the
wrong reason (the verb was afforded by nothing anywhere). The fuel yard
is one passable exit from the smelter, which is exactly the reach `peers`
has, so the verb now arrives, finds the charcoal CLAMP — a Furnace and a
Container like any chargeable furnace — and declines for a reason about
what a clamp is: a heap kept deliberately starving of air. Better than
*"I don't understand 'smelt'"*, and the rule doing its job.
