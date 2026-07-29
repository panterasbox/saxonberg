# Crafting branches & the repair economy — implementation plan

This plan drives **one build cycle** and is executed by a **fresh-context build
agent** per [docs/workflow.md](../workflow.md) § Requirements → plan. Read
[docs/requirements/crafting-branches-requirements.md](../requirements/crafting-branches-requirements.md)
in full before starting — its Surface decisions are settled answers this plan
implements, not reopens. Subsystem grounding: [crafting.md](../subsystems/crafting.md),
[thermal.md](../subsystems/thermal.md), [fire.md](../subsystems/fire.md),
[materials-response.md](../subsystems/materials-response.md),
[combat.md](../subsystems/combat.md), [metabolism.md](../subsystems/metabolism.md),
[scripting.md](../subsystems/scripting.md), [advancement.md](../subsystems/advancement.md),
[activity.md](../subsystems/activity.md), [app-settings.md](../subsystems/app-settings.md),
[retail.md](../subsystems/retail.md), [employment.md](../subsystems/employment.md).

All paths below are relative to `packages/server/src/mud/` unless prefixed.

## Grounding (facts established by reading the real source)

- **The craft skeleton** (`obj/api/CraftingLogic.ts`): `craftImpl` = resolve
  recipe → `resolveMaker(makerMode)` (context-derived, never wire) →
  `gatherMatter(location)` → per-slot `pickCandidate` (category tag + minGrade +
  no-double-claim) → tool match by `hasCapability` → weakest-link
  `Grade.deriveAtFixedControl` floored at `baseGrade` → `StuffApi.clone(outputTemplate)`
  → **`applyBulkOutput`** (seam #1) → assert `isCrafted` + `stamp` →
  **`consumeBulkInputs`** (seam #2, strict `BulkableApi.transfer` + conservation
  throw) → tool `.wear()`. All sub-logic is module-private functions. Declines
  are data (`CraftOutcome`), breaches throw.
- **The gather walk is room-only.** `gatherMatter(location)` iterates
  `location.getContents()` (surface-resting items already have
  `container = room`). **Maker inventory is NOT gathered today**, despite the
  requirements/doc describing the walk as "room + surfaces + maker inventory"
  (see Findings F1). `ManualBuildController.findBuildVessel` *does* check held
  then room.
- **The heat seam** (`ThermalApi.reachableHeatFor(position)` →
  `ThermalLogic.reachableHeatForImpl`): hottest lit+fuelled `Furnace` in
  `position.getContainer()`'s contents; 0 when nothing hot. Built, tested,
  consumed by no recipe — exactly as advertised (D9).
- **Physics half already shipped**: `FurnaceMixin.heatContents` +
  `MeltableMixin` + `ThermalLogic`'s freeze path (clones
  `/obj/Casting`, stamps material + mass + short description —
  `ThermalLogic.ts:197–225` is the exemplar for stamping a material onto a
  cloned Tangible). `/obj/Forge`, `/obj/Oven`, `/obj/Kiln`, `/obj/Campfire`,
  `/obj/Ingot` (Meltable+Thermal Thing, **no GradedMixin**), `/obj/Casting`
  all exist; the Hearthworks smithy seed populates `/obj/Forge` + an iron
  ingot (`seeds/domain/hearthworks/`).
- **Equipment does not compose `CraftedMixin`.** `Weapon`/`Armor` compose
  `GradedMixin(DurableMixin(ConstructedMixin(…)))`; `ToolItem` composes
  `ToolMixin(DurableMixin(…))` with **no grade at all**. `craftImpl` throws on
  a non-Crafted output — so today's equipment templates **cannot be recipe
  outputs** without a composition change (Findings F2).
- **Live combat ignores weapon quality.** Strike energy is
  `energyFor(poiseBand) × energyScale` (`CombatLogic.ts:1846`); the weapon
  contributes channel + narration `materialKey` only. Weapon material ×
  grade × condition fold exists **only** on the `analyze` preview
  (`MaterialLogic.previewBandImpl` → `gradeConditionScale`). Armor condition
  *is* live (`ConditionLogic.layerOf` reads `getCondition()` into the covering
  stack). Routine wear does not exist: weapons wear only via the `'wear'` hook
  consequence (rust-monster), armor never (Findings F3).
- **The knowledge ladder** (`lib/script/RecipeKnowledge.ts`): claim key
  `recipe-known:`, deed key `recipe-made:`, derived on read from
  `ChronicleApi.recordOnce` rows. Claim minted by `MenuController` on reading
  a menu; deed minted in `ScriptLogic.captureManualBuild` (the same act that
  transcribes the recipe-script — `StrainController` calls it at
  engaged-completion with the recorded `commandSources`). `MakeController`
  gates on `canMake`. **Watch = claim does not exist yet** (Findings F4).
- **ManualBuild substrate is general but bulk-shaped**: `BuildContribution`
  is `{category, measureL, gradeBand}`; `matchBuild` is exact-cover, no
  leftovers; `ManualBuildStep` is a generic hands-slot `DurativeActivity`
  with effect-at-completion. Not bar-coupled beyond the contribution shape.
- **`MakerMixin` is augment-gated by employment**: `Crafter` composes it, but
  `isMaker` is active only while an on-shift Position `confers: [MakerMixin]`
  (see `seeds/domain/lounge/business.yaml`). A venue maker NPC **requires** a
  Business + roster seed or `order` finds no maker (Findings F5).
- **`Menu`** (`domain/lounge/Menu.ts`) is `PricedOfferMixin(DetailedMixin(Thing))`
  with a **static** `commandContributions` list of the bar's verbs and a
  static `resolveIn`. `OrderController` is already venue-generic (resolves any
  Menu, prices via `priceFor`, settles, optional Attendant). Static
  contributions mean venue-specific verb sets need subclasses (Findings F6).
- **Materials** live in `packages/content/base-library/content/lib/material/`
  (pack rows, e.g. `element/iron.yaml` with tags `["metal","ferrous",…]`,
  `food/trail-ration.yaml`); recipes in `config/recipes.yaml` (Documents via
  `RecipeSeeder`); Disciplines in `seeds/lib/advancement/Discipline/`
  (`mixology.yaml` is the shape); dials in `lib/config/AppSettings.ts`
  (`AppSettingKeys`) + `config/app-settings.yaml`, read from lib mixins via
  `AppApi.setting` with literal fallbacks (the `Combustible` `dial()` pattern).
- **Chattel + salvage plumbing exists**: `Thing` composes `ChattelMixin`;
  `onDestruct` releases `_chattelId` unconditionally — `StuffApi.destruct` is
  the whole chattel-release story for consumed/salvaged goods.
  `MaterialLogic.computeComposition` flattens a Material's composition to leaf
  weight fractions. `SealableMixin` has `isOpen()`; `MixinApi.isSealable`
  narrows.
- **Advancement**: `AdvancementApi.recordDeed(owner, {discipline, difficulty,
  outcome})`; `Difficulty` = `trivial|easy|standard|hard|formidable`; no
  crafting act records anything today (bar included).
- **Regression surface** (must pass unmodified):
  `obj/api/__tests__/CraftingLogic.test.ts`,
  `obj/api/__tests__/CraftingLogic.buildmint.test.ts`,
  `obj/command/crafting/__tests__/manual-build.test.ts`,
  `mud/__tests__/craft-served-path.test.ts`,
  `lib/script/__tests__/RecipeKnowledge.test.ts`,
  `domain/hearthworks/__tests__/hearthworks.integration.test.ts`,
  `domain/terminus/__tests__/general-store-*.test.ts`.

## Findings — things the requirements didn't anticipate

- **F1 — the gather walk's real shape differs from the doc.** Code gathers
  room contents only; the requirements describe "(room + surfaces + maker
  inventory)" as shipped. This build adds maker inventory *and* open
  containers to `gatherMatter`. Note: adding maker inventory is a
  (desirable) behavior change at the bar too — a bottle in the bartender's
  hand becomes eligible. The bar tests don't stock maker inventory, so parity
  holds, but call it out in the MR.
- **F2 — equipment can't be a craft output today.** `craftImpl` asserts
  `isCrafted(output)`; `Weapon`/`Armor`/`ToolItem` don't compose
  `CraftedMixin`. Fixed in Phase 2 by swapping `GradedMixin` →
  `CraftedMixin` in the equipment bases (CraftedMixin *extends* GradedMixin,
  so the persisted `gradeBand` and the whole grade surface are unchanged;
  `maker`/`recipe`/`craftedAt` default empty on store-bought gear).
- **F3 — "wear it down in combat" requires new wear producers.** No routine
  combat wear exists, and live strike energy ignores weapon
  grade/condition. Phase 2 adds per-landed-strike weapon wear +
  per-attenuated-blow armor wear (Law 2: on use), and a **bounded**
  instrument-delivery scale (`gradeConditionScale` × keenness factor,
  broken-floored) folded into `commitInflict`'s energy. Material *height* is
  deliberately left analyze-only (a combat-balance question out of scope);
  document the asymmetry.
- **F4 — watch = claim is new work**, not a shipped rung: only reading a menu
  mints the claim today. Phase 4 adds witness-claims at craft-resolve.
- **F5 — the Business wiring is effectively load-bearing.** The requirements
  say Business wiring is "welcome if free... not a gate", but `order` resolves
  the maker via the augment-gated `MakerMixin`, so a venue with no
  Business/roster has no active maker. The Hearthworks gets a minimal
  Business seed (positions confer `MakerMixin`, 24/7 roster) — the cheapest
  correct path, precedent verbatim.
- **F6 — `Menu.commandContributions` is static per class.** One shared class
  would make the bar menu afford `forge`. Resolution in DECISION G below.
- **F7 — `makerMode: 'fulfilling-bartender'`** is the historical name for
  "present active maker". Reused unchanged for the smithy/kitchen (renaming
  is wire-shape churn for zero behavior); note in docs.
- **F8 — `Ingot` is ungraded.** Discrete inputs without `GradedMixin` default
  to `fair` in grade derivation (the `deriveAtFixedControl` fallback made
  explicit per-slot). Graded ingot stock is a content option later, not
  needed now.

## Decisions

- **DECISION A — schema growth is additive, one Document.**
  `RecipeInputSlot` becomes `{slot, category, minGrade, kind?: 'bulk'|'item',
  measureL?, count?}` — `kind` absent/`'bulk'` + `measureL` present ⇒ the
  bar's slot, byte-identical; `kind:'item'` + `count` ⇒ a discrete/glob slot.
  `Recipe` gains `requiresHeatK?: number` (0/absent = no gate),
  `outputApplication?: 'bulk'|'tangible'|'edible'` (absent = `'bulk'`),
  `outputPortionL?: number` (edible portion), `difficulty?: Difficulty` and
  `discipline?: string` (the authored ladder placement the `ActSignature`
  records; **absent ⇒ no advancement row**, so bar rows stay untouched and
  unrecorded exactly as today). All new fields join `persistentFields`;
  existing YAML parses unchanged (schema round-trip test).
- **DECISION B — three seams, one dispatch.** `applyTangibleOutput` (flow the
  *primary* matched item-slot's `Material` + the summed consumed item mass
  onto the cloned output — the `ThermalLogic` casting-stamp surface;
  mass-conserving), `consumeItemInputs` (discrete: `StuffApi.destruct` each
  matched item — chattel released by the shipped `onDestruct`; globs:
  strict quantity debit; asserts mirror `consumeBulkInputs`), and
  `applyEdibleOutput` (fill the output's bulk slot with the recipe's authored
  food `Material` at `outputPortionL`; assert the material is edible). All
  module-private in `CraftingLogic`; `craftImpl` dispatches on
  `outputApplication` at steps 8/10 only — the skeleton is untouched.
- **DECISION C — the heat gate sits between tool-match and grade-derive.**
  `recipe.requiresHeatK > 0 && ThermalApi.reachableHeatFor(maker) <
  requiresHeatK` ⇒ decline `{reason: 'insufficient-heat', detail:
  '<K needed>'}` (new `CraftDeclineReason`), rendered diegetically ("the
  forge is cold" / "there's no fire here"). This is the D9 close; update the
  stale "consumed by NO recipe" comments in `api/thermal.ts` +
  `ThermalLogic.ts` when it lands.
- **DECISION D — the gather walk grows two rungs.** `gatherMatter` gains
  (1) the maker's own inventory and (2) one-level descent into room
  containers that are `MixinApi.isSealable` **and** `isOpen()` (a
  non-sealable open basket counts as always-open only if it's a `Container`
  whose contents are already reachable — v1 rule: descend into
  `Container`-composed room occupants iff not Sealable-closed). Closed or
  locked never feeds a craft. Item candidates partition alongside
  bottles/tools: discrete `Tangible`s with a Material (grade = `Graded` band
  or `fair`), globs by quantity.
- **DECISION E — keenness is a `lib/material/` axis: `Keen.ts` /
  `KeenMixin`.** Justification: it is the *working-surface* wear axis of a
  physical object — the exact sibling of `DurableMixin`'s structural axis,
  which lives in `lib/material/` ("a made thing has a material, a form, a
  condition"). Not `lib/craft/` (sharpening is maintenance of matter, not a
  crafting capability), and **not** a field on `DurableMixin` (most durables
  have no edge; two axes, two cadences — collapsing them is the named
  antipattern in the requirements). Surface: persisted `keenness: number`
  (0..1, accessor-clamped), `getKeenness()/setKeenness()`,
  `getKeennessBand()` → `keen ≥ 0.85 / serviceable ≥ 0.55 / dulled ≥ 0.25 /
  blunted`, `dull(amount?)` (dial default), `hone()` (restore to 1),
  `keennessDeliveryFactor()` = `lerp(crafting.keenness.deliveryFloor, 1,
  keenness)`. Registered as `Mixins.Keen` + `MixinApi.isKeen`. Composed on
  `Weapon` only this build (blades only; seasoning/tuning is the named
  unbuilt seam); reads are inert for non-edge forms.
- **DECISION F — combat coupling is one bounded seam.** A module-private
  `instrumentDeliveryScale(weapon, channel)` in `CombatLogic`:
  `gradeConditionScale(grade, condition)` (the shipped `MaterialLogic`
  scalar, re-exposed via `MaterialApi`) × (`keennessDeliveryFactor()` iff
  `channel ∈ {edge, point}` and `isKeen`) × (broken ⇒ clamp to
  `crafting.brokenDeliveryFloor`). Folded into `commitInflict`'s
  `energyScale` for weapon strikes. On a **landed** weapon strike:
  `weapon.wear(crafting.wear.weaponPerStrike)` and, for edge/point,
  `weapon.dull(crafting.keenness.wearPerUse)`. In `ConditionLogic`, each
  covering layer that attenuated a mechanical blow wears
  `crafting.wear.armorPerBlow`. All dials modest; defaults chosen so
  existing combat tests stay in-band (verify, tune if a test asserts exact
  energies).
- **DECISION G — one generic `Menu` base + per-venue subclasses for
  affordances.** Promote the venue-neutral machinery to
  `lib/commerce/Menu.ts` (offer list, `resolveOrder`, `resolveIn`, priced
  offer — **no** `commandContributions`). `domain/lounge/Menu.ts` **stays at
  its path** as `class Menu extends CommerceMenu` carrying exactly the bar's
  current contributions — the lounge seed's `class: /domain/lounge/Menu` and
  bar parity are untouched. New `domain/hearthworks/SmithyMenu.ts`
  (contributes `menu`/`order`/`forge`/`heat`/`hammer`/`quench`/`repair`/
  `salvage`/`make`) and `domain/hearthworks/KitchenMenu.ts` (contributes
  `menu`/`order`/`cook`/`pour`(=`add`)/`stir`/`heat`/`plate`/`make`).
  Controllers (`MenuController`, `OrderController`) re-import the lib base
  for their `instanceof`/`resolveIn` checks.
- **DECISION H — verb spellings** (within the required shape).
  One-shots: `forge <item> [with <metal>]`, `cook <item>`. Smithing steps:
  `heat [<workpiece>]` (engaged; requires reachable heat > 0; banks the
  workpiece's item-contribution + records the reached K), `hammer
  [<workpiece>]` (engaged; requires a held/reachable `striking` tool + a
  reachable `anvil` capability; records the forming work), `quench
  [<workpiece>]` (terminal mint; reverse-match → clone output / generic
  worked lump). Cooking steps: `add <ingredient> [into <pot>]` (the existing
  `pour`/`add` verb grows a discrete-ingredient branch when the vessel is a
  pot — consumes the item at completion, banks an item-contribution),
  `stir` (existing verb, works on any build vessel), `heat [<pot>]` (same
  HeatController; records reached K on the pot's build), `plate [<pot>] into
  <dish>` (terminal mint, mirror of `strain`). Maintenance:
  `sharpen <blade>`, `repair <item>`, `salvage <item>` — standalone diegetic
  acts per the requirements' sieve; any future introspective growth is
  subcommand-dispatched.
- **DECISION I — manual-buffer growth.** `BuildContribution` gains
  `kind?: 'bulk'|'item'` (absent = `'bulk'`) and `count?: number`;
  `ManualBuildMixin` gains `heatedToK: number` (runtime-only) +
  `noteHeat(k)` (max-latching) + reset in `clearBuild`. `matchBuild` gains:
  a recipe with `requiresHeatK > heatedToK` never matches; item slots match
  item contributions by category/count/grade; the exact-cover/no-leftover
  rule is preserved. `BuildMintRequest` gains `workpiece?: Stuff` (the
  smithing mint consumes it) — `glass` stays the bulk/edible destination.
  Generic mints per vessel: bulk contributions → the shipped generic mixed
  drink (unchanged); item-metal contributions → a generic worked lump
  (clone `/obj/Casting`, flow the workpiece's material/mass — recipeId `''`);
  edible contributions → generic `pot-luck` fill into the supplied dish.
- **DECISION J — evidence + witness claims live in one resolve tail.** A
  module-private `recordCraftEvidence(maker, recipe, location)` in
  `CraftingLogic`, called from both `craftImpl` and `mintFromBuildImpl`
  success paths **when a recipe matched and it authors `discipline`**:
  (1) `AdvancementApi.recordDeed(maker, {discipline, difficulty ?? 'easy',
  outcome: 'success'})`; (2) for every *other* present agent in the maker's
  location with a durable identity, `RecipeKnowledge.noteKnown(...)` — watch
  = claim, idempotent. Generic mints (no recipe) record nothing (no
  referent). Bar rows author no discipline ⇒ bar behavior byte-identical.
- **DECISION K — repair is deficit-priced reverse-craft in
  `CraftingLogic`.** `CraftingApi.repair({itemRef})` → `repairImpl`:
  resolve item (held/reachable, `isDurable`); deficit `d = 1 − condition`;
  domain by material tags — `metal` ⇒ gate on `reachableHeatFor(maker) ≥
  crafting.repair.metalHeatK`; else (leather/textile/organic) ⇒ require a
  reachable `mending` tool. Material cost mass = `item mass × d ×
  crafting.repair.costFactor`, doubled when `isBroken()`
  (`crafting.repair.brokenFactor`, default 2); consumed from reachable
  same-category stock (ingots for metal, scrap/hide glob or a sacrificial
  same-tag item for soft goods) via the Phase 1 item-candidate machinery +
  `consumeItemInputs`-style debits (partial-mass debit from a glob;
  a discrete donor is consumed whole only if its mass ≤ 2× the need —
  else decline `insufficient-input`). On success `setCondition(1)` —
  ceiling-free. Declines are data (`no-maker`/`missing-tool`/
  `insufficient-heat`/`insufficient-input`); the whetstone is *not* a repair
  tool. Repair does not touch keenness; sharpen does not touch condition.
- **DECISION L — salvage is one generic lossy operation.**
  `CraftingApi.salvage({itemRef})` → `salvageImpl`: reject creatures/
  non-Tangibles and build-vessels-in-use; flatten the item's Material
  composition (`MaterialLogic.computeComposition`, exposed through a
  `MaterialApi` read); for each constituent ≥ a dust floor: yield mass =
  `item mass × fraction × crafting.salvageRate`; material tagged `metal` ⇒
  clone `/obj/Casting` stamped with that material + mass (re-meltable,
  re-usable as repair stock); otherwise ⇒ a `scrap` glob (new
  `/obj/Scrap` Globbable Thing, material-stamped, quantity by mass). Assert
  `Σ output mass ≤ input mass × rate + ε` (throw on breach). Then
  `StuffApi.destruct(item)` — provenance, grade, and chattel id die with the
  form (the shipped release path). Outputs land in the actor's location
  (the controller's job).
- **DECISION M — broken is capability loss.** `DurableMixin.isBroken()` =
  `condition ≤ AppApi.setting('crafting.brokenThreshold')` (literal fallback
  0.1, the `Combustible` dial pattern). `ToolMixin.hasCapability` returns
  `false` when the host `isDurable && isBroken` (checked via `MixinApi` on
  `this` — the two mixins compose at use sites). No new state machine;
  weapons/armor ride DECISION F's delivery floor + the shipped
  condition-scaled attenuation; `analyze weapon`/`analyze response` grow a
  one-line broken/keenness band rendering (bands only; raw values stay
  analyze-only).
- **DECISION N — venue content rides existing patterns wholesale.** The
  smithy room gains an anvil (`ToolItem`, `anvil` capability, mass ~60 kg —
  a fixture by encumbrance, not by flag), a smith's hammer (`striking`), a
  workbench `Surface`, ingot stock, a `SmithyMenu`, and a smith `Crafter`
  NPC. A new `cookhouse` room joins the Hearthworks `CartesianZone` (a
  hearth — `/obj/Oven`-class furnace at ~500 K, a `CookPot`, ingredient
  stock in an **openable chest** — the open-container acceptance path — a
  `KitchenMenu`, a cook `Crafter`). One `seeds/domain/hearthworks/business.yaml`
  (positions `smith`/`cook`, `confers: [MakerMixin]`, 24/7 roster — F5).
  Tool capabilities vocabulary grows: `striking`, `anvil`, `whetstone`,
  `mending`, `pot`.
- **DECISION O — the seed roster and its ladder** (authored data, all
  backed by shipped readers):

  | recipeId | branch | difficulty | requiresHeatK | tools | output |
  |---|---|---|---|---|---|
  | `fire-poker` | smithing | trivial | 700 | striking, anvil | `/obj/tools/fire-poker` (hafted Weapon-class rod) |
  | `cook-pot` | smithing | easy | 800 | striking, anvil | `/obj/CookPot` template |
  | `smiths-hammer` | smithing | standard | 800 | striking, anvil | `/obj/tools/smiths-hammer` (`ToolItem`, `striking`) — the tools-make-tools loop |
  | `belt-knife` | smithing | standard | 1300 (bellows) | striking, anvil | `/obj/arms/belt-knife` (bladed `Weapon`, material flows from the chosen ingot) |
  | `leather-jerkin` | smithing (bench) | hard | — | mending | `/obj/armor/hide-jerkin` (`Armor`, hide form) |
  | `toasted-ration` | cooking | trivial | 450 | — | plated dish, `food/toasted-ration` |
  | `root-mash` | cooking | easy | 373 | pot | dish, `food/root-mash` |
  | `hearty-stew` | cooking | standard | 373 | pot | dish, `food/hearty-stew` (ration-tier + veg + meat) |
  | `fine-roast` | cooking | hard | 500 | pot | dish, `food/fine-roast` (minGrade `fine` inputs — the grade-spread meal) |

  New food Materials (base-library pack): `root-vegetable`, `stew-meat`
  (inputs) and `toasted-ration`, `root-mash`, `hearty-stew`, `fine-roast`,
  `pot-luck` (outputs, honest macros). The whetstone (granite `ToolItem` +
  `AudibleMixin`, `whetstone` capability) and iron ingots and a sewing kit
  (`mending`) join the general store's goods; verify exact `requiresHeatK`
  numbers against the Forge seed's burn temperature × bellows multiplier at
  build time (knife must *require* the bellows; poker must not).
- **DECISION P — dials** (`AppSettingKeys` + `config/app-settings.yaml`):
  `crafting.brokenThreshold` (0.1), `crafting.salvageRate` (0.5),
  `crafting.repair.costFactor` (0.6), `crafting.repair.brokenFactor` (2),
  `crafting.repair.metalHeatK` (900), `crafting.wear.weaponPerStrike`
  (0.004), `crafting.wear.armorPerBlow` (0.004),
  `crafting.keenness.wearPerUse` (0.08), `crafting.keenness.deliveryFloor`
  (0.7), `crafting.keenness.sharpenDurationMs` (12000),
  `crafting.brokenDeliveryFloor` (0.35).

---

## Phase 1 — Recipe schema growth, the three seams, the heat gate, the gather walk

Pure engine; testable with fixture recipes, zero content.

**Files**
- `lib/craft/Recipe.ts` — DECISION A fields + accessors
  (`getRequiresHeatK()`, `getOutputApplication()`, `getOutputPortionL()`,
  `getDifficulty()`, `getDiscipline()`; slot helpers `isItemSlot(slot)`).
- `lib/craft/ToolCapability.ts` — vocabulary += `striking`, `anvil`,
  `whetstone`, `mending`, `pot`.
- `api/crafting.ts` — `CraftDeclineReason` += `'insufficient-heat'`.
- `obj/api/CraftingLogic.ts` — `gatherMatter` (maker inventory +
  open-container descent, item/glob candidates per DECISION D);
  `pickItemCandidate` (category tag, count, grade-or-fair);
  the heat gate (DECISION C); `applyTangibleOutput` / `applyEdibleOutput` /
  `consumeItemInputs` (DECISION B); dispatch on `outputApplication` in
  `craftImpl` steps 8/10.
- `config/recipes.yaml` — **untouched** (bar rows byte-identical; new rows
  arrive Phase 3).

**Order of work.** Schema + accessors → seeder round-trip test → gather-walk
growth → item matching → heat gate → the two output seams + item consume →
dispatch.

**Verification.**
- New `lib/craft/__tests__/Recipe.schema.test.ts` — old YAML rows parse to
  identical field values; new fields parse; absent fields default (the
  schema round-trip acceptance).
- New `obj/api/__tests__/CraftingLogic.branches.test.ts` — a fixture
  tangible recipe (ingot → knife): material flows from the chosen ingot,
  mass conserved, ingot destructed, chattel released; heat gate declines
  cold / passes hot (grep-verifiable `reachableHeatFor` consumption — D9
  closed); an edible fixture recipe fills the dish with the authored
  material at portion; discrete-count and glob debits assert conservation
  (breach throws); an **open** chest in the room feeds a craft, the same
  chest **closed** declines `insufficient-input`; a bottle in the maker's
  inventory is now gathered.
- Bar parity: `CraftingLogic.test.ts` + `craft-served-path.test.ts` pass
  unmodified.

**Risk.** Loosening `measureL` to optional ripples through `pickCandidate`/
`matchBuild` — guard every bulk read behind the kind discriminator so the
bar path never sees an undefined measure.

## Phase 2 — Crafted gear is real gear: composition, combat wear, broken

**Files**
- `lib/equipment/Weapon.ts`, `lib/equipment/Armor.ts` — `GradedMixin` →
  `CraftedMixin` in the base stack (F2; grade surface + persisted
  `gradeBand` unchanged).
- `lib/craft/ToolItem.ts` — base becomes
  `CraftedMixin(ToolMixin(DurableMixin(DetailedMixin(Thing))))`.
- `lib/material/Durable.ts` — `isBroken()` (DECISION M, `AppApi` dial read
  with literal fallback).
- `lib/craft/Tooled.ts` — `hasCapability` broken gate.
- `obj/api/CombatLogic.ts` — `instrumentDeliveryScale` (condition/grade +
  broken floor; keenness joins Phase 5) folded into `commitInflict`; landed
  weapon strikes wear the weapon.
- `obj/api/ConditionLogic.ts` — attenuating covering layers wear.
- `api/material.ts` — expose the `gradeConditionScale` read (a static
  forwarding to `MaterialLogic`) so `CombatLogic` doesn't duplicate the
  formula.
- `lib/config/AppSettings.ts` + `config/app-settings.yaml` —
  `crafting.brokenThreshold`, `crafting.wear.*`, `crafting.brokenDeliveryFloor`.
- `obj/command/combat/AnalyzeWeaponController.ts`,
  `obj/command/perception/AnalyzeResponseController.ts` — render the broken
  state (band prose).

**Verification.**
- New `lib/material/__tests__/Durable.broken.test.ts` — threshold dial,
  `isBroken`, `hasCapability` false when broken, true again after
  `setCondition` (repair reverses it).
- New `obj/api/__tests__/CombatLogic.gearwear.test.ts` — a landed strike
  drops the weapon's condition; the struck defender's armor wears; a
  near-zero-condition weapon's delivered energy is floored down; a broken
  shaker fails `craftImpl`'s tool match (`missing-tool`).
- Existing combat + crafting + store tests green (the clasp-knife seed
  hydrates under the new `Weapon` base — its `gradeBand: fair` rides
  `CraftedMixin`'s inner `GradedMixin` unchanged).

**Risk.** Any combat test asserting exact energies will feel the delivery
scale — defaults are neutral at grade `fair`/condition 1 (`gradeConditionScale`
≈ 0.925 at fair; if a test breaks, set the fold to normalize at fair/pristine
= 1.0 by dividing by the fair-pristine scalar — decide at build, note in the
MR).

## Phase 3 — One-shot verbs, menus, venues, the seeded roster

**Files**
- `lib/commerce/Menu.ts` (new base) + `domain/lounge/Menu.ts` (bar subclass
  at the same template path — DECISION G); import updates in
  `obj/command/crafting/MenuController.ts` / `OrderController.ts`.
- `mud/cmd/crafting/forge.yaml`, `cook.yaml` +
  `obj/command/crafting/ForgeController.ts`, `CookController.ts` — resolve
  the present menu's offer (or a bare recipe ref), **deed-gate on
  `RecipeKnowledge.canMake`** (the `MakeController` gate verbatim; decline
  "you haven't learned to forge it — work it by hand first"), then
  `CraftingApi.craft({recipeRef, makerMode: 'self', brand})`, move the
  output to the giver, render declines via the `CraftController` base.
- `domain/hearthworks/SmithyMenu.ts`, `KitchenMenu.ts` (contributions per
  DECISION G; `repair`/`salvage`/step-verb YAMLs referenced here land in
  Phases 4/6 — stage the contribution lists per phase so `lint:gates`
  stays green).
- `lib/craft/Whetstone.ts` — `AudibleMixin(ToolItem)` subclass, `whetstone`
  capability default (sharpen contribution added Phase 5).
- `obj/CookPot.ts` — `CraftedMixin(ManualBuildMixin(ToolMixin(DurableMixin(
  DetailedMixin(Thing)))))`, capability `['pot']`.
- `obj/Dish.ts` — `CraftedMixin(NutritionLabelMixin(BulkableMixin(
  DetailedMixin(Thing))))` — the edible output form (the `CraftedDrink`
  shape, generalized; `getLong` appends the verdict).
- Output/goods templates: `seeds/obj/arms/belt-knife.yaml`,
  `seeds/obj/tools/{fire-poker,smiths-hammer}.yaml`,
  `seeds/obj/food/plated-dish.yaml` (the `Dish`), reuse
  `seeds/obj/armor/hide-jerkin.yaml` as the jerkin output template.
- Venue seeds: `seeds/domain/hearthworks/{anvil,workbench,smithy-menu,
  smith-hammer,ingot-rack…}.yaml`, `seeds/domain/hearthworks/cookhouse.yaml`
  (new room, coords next to the smithy) + `{hearth,cook-pot,kitchen-menu,
  pantry-chest,root-vegetables,stew-meat}.yaml`, `npc/{smith,cook}.yaml`
  (`Crafter`), `business.yaml` (DECISION N / F5); `smithy.yaml` `populates:`
  grows.
- Materials: `packages/content/base-library/content/lib/material/food/
  {root-vegetable,stew-meat,toasted-ration,root-mash,hearty-stew,fine-roast,
  pot-luck}.yaml` (+ pack version bump per `content-packs.md`).
- `config/recipes.yaml` — the nine DECISION-O rows appended (bar rows
  untouched).
- Discipline seeds: `seeds/lib/advancement/Discipline/smithing.yaml`
  (iscedf `0715`), `cooking.yaml` (iscedf `1013`) — the `mixology.yaml`
  shape.
- Store stock: `seeds/domain/terminus/general-store/goods/{whetstone,
  iron-ingot,sewing-kit}.yaml` + counter stock/pricing per the rations
  pattern.

**Verification.**
- New `domain/hearthworks/__tests__/hearthworks-venues.integration.test.ts`
  — venue standup: menus resolve + afford the right verb sets; `order
  belt-knife` at a lit+bellowsed forge succeeds via the on-shift smith and
  the knife's `analyze weapon` profile derives from the chosen ingot's
  material; cold forge ⇒ diegetic decline; `order` a stew at the cookhouse;
  the pantry chest feeds the craft open and refuses closed; `eat` routes the
  stew's macros through `ingest` and the `NutritionLabel` renders.
- `forge` with no deed declines (deed minted directly via
  `RecipeKnowledge.noteMade` in the test to prove the gate, ahead of
  Phase 4's earned path).
- Bar + store + hearthworks regression suites green.

## Phase 4 — The by-hand paths, the generalized ladder, advancement evidence

**Files**
- `lib/craft/ManualBuild.ts` — DECISION I buffer growth.
- `api/crafting.ts` — `BuildMintRequest.workpiece?`.
- `obj/api/CraftingLogic.ts` — `matchBuild` growth (heat ceiling + item
  contributions), `mintFromBuildImpl` dispatch (tangible mint clones the
  recipe output / generic worked lump, consumes the workpiece; edible mint
  fills the supplied dish / generic pot-luck), `recordCraftEvidence`
  (DECISION J) called from both success paths.
- `obj/Ingot.ts` — + `ManualBuildMixin` (the workpiece **is** the buffer).
- `mud/cmd/crafting/{heat,hammer,quench,plate}.yaml` +
  `obj/command/crafting/{Heat,Hammer,Quench,Plate}Controller.ts` —
  `ManualBuildController` subclasses (engaged steps, effect-at-completion,
  `recordCommand` for capture); `Quench`/`Plate` replicate
  `StrainController`'s capture tail (`ScriptApi.captureManualBuild` — the
  deed + transcript are the same act, unchanged).
- `obj/command/crafting/PourController.ts` — the discrete-ingredient `add`
  branch for pot vessels (consume item at completion, bank
  `{kind:'item', category, count:1, gradeBand}`).
- `domain/hearthworks/{SmithyMenu,KitchenMenu}.ts` — step-verb
  contributions go live.

**Verification.**
- New `obj/command/crafting/__tests__/smithing-manual.test.ts` — heat (banks
  + latches K, declines with no fire) → hammer (declines without
  hammer/anvil) → quench mints the recipe-matched knife (material flowed,
  workpiece consumed); an off-spec build (no hammer recipe match / heat too
  low) mints the generic worked lump with `recipeId ''`; barge-in mid-step
  leaves the buffer partial.
- New `obj/command/crafting/__tests__/cooking-manual.test.ts` — add/stir/
  heat/plate mints the stew; off-spec mints pot-luck; conservation
  (ingredients consumed at add-time).
- New `obj/command/crafting/__tests__/knowledge-ladder.test.ts` — **the
  wiki-parity test**: a character with zero chronicle rows completes the
  smithing by-hand path start to finish; `forge` declines before, works
  after the one verified by-hand performance; a *watching* bystander gains
  the claim but `forge` still declines for them; `order` works for everyone
  throughout; same shape asserted for cooking.
- Advancement: craft-resolve appends Transcript rows against
  `smithing`/`cooking` with the recipe's authored difficulty (assert via
  `AdvancementApi.entriesFor`); bar crafts append nothing (parity).
- `CraftingLogic.buildmint.test.ts` + `manual-build.test.ts` unmodified and
  green (bulk contributions default `kind:'bulk'`).

## Phase 5 — Keenness + `sharpen`

**Files**
- `lib/material/Keen.ts` (DECISION E) + `lib/mixin.ts` (`Mixins.Keen`) +
  `api/mixin.ts` (`isKeen`).
- `lib/equipment/Weapon.ts` — + `KeenMixin`.
- `obj/api/CombatLogic.ts` — keenness factor joins
  `instrumentDeliveryScale`; landed edge/point strikes `dull()`.
- `mud/cmd/crafting/sharpen.yaml` +
  `obj/command/crafting/SharpenController.ts` — resolve a held/reachable
  bladed/pointed `isKeen` target + a carried un-broken `whetstone` tool;
  engage a hands-slot step (`ManualBuildStep` reused with its generic
  options; duration `crafting.keenness.sharpenDurationMs`); at start,
  `whetstone.emit({db, character: 'rasp of stone on steel'})` (the
  `AudibleMixin` push — the room hears the ritual); at completion `hone()` +
  `whetstone.wear()`; interruptible, restores nothing on abort.
- `lib/craft/Whetstone.ts` — `commandContributions.inventory:
  ['crafting/sharpen.yaml']` (the carried-affordance source).
- `obj/command/combat/AnalyzeWeaponController.ts` +
  `perception/AnalyzeResponseController.ts` — keenness band line (bands
  only; raw on analyze).
- Dials: `crafting.keenness.*`.

**Verification.**
- New `lib/material/__tests__/Keen.test.ts` — clamps, bands, dull/hone,
  delivery factor lerp.
- New `obj/command/crafting/__tests__/sharpen.test.ts` — gates (no
  whetstone / broken whetstone / non-edged target decline), Audible frame
  emitted, hone at completion, whetstone condition drops, abort restores
  nothing.
- `CombatLogic.gearwear.test.ts` extended — a dulled blade delivers
  measurably less on edge; sharpen restores; **the two axes are
  independent** (a dulled-but-sound blade needs no repair; a nicked blade's
  condition is untouched by sharpening) — both observable via `analyze`.

## Phase 6 — Repair + salvage

**Files**
- `api/crafting.ts` — `RepairRequest`/`RepairOutcome`,
  `SalvageRequest`/`SalvageOutcome` (discriminated unions, declines-as-data),
  `CraftingApi.repair` / `CraftingApi.salvage`.
- `obj/api/CraftingLogic.ts` — `repairImpl` (DECISION K), `salvageImpl`
  (DECISION L), both module-private, gated methods forwarding.
- `api/material.ts` — expose the flattened-composition read.
- `obj/Scrap.ts` + `seeds/obj/Scrap.yaml` — the Globbable scrap stack.
- `mud/cmd/crafting/{repair,salvage}.yaml` +
  `obj/command/crafting/{Repair,Salvage}Controller.ts` (outputs to the
  room; diegetic decline rendering via `CraftController`).
- `domain/hearthworks/SmithyMenu.ts` — repair/salvage contributions live.
- Dials: `crafting.salvageRate`, `crafting.repair.*`.

**Verification.**
- New `obj/api/__tests__/CraftingLogic.repair.test.ts` — deficit math
  (cost ∝ 1−condition), metal requires forge heat (cold ⇒
  `insufficient-heat`), soft goods require `mending`, broken doubles the
  material term, repair restores toward full with no ceiling, restored
  condition immediately moves `hasCapability` / the covering-stack read /
  the delivery scale (the F3 wear producers reversed).
- New `obj/api/__tests__/CraftingLogic.salvage.test.ts` — **conservation**:
  Σ output mass ≤ input mass × rate (assert the throw on a rigged breach);
  metal → castings, organics → scrap globs; grade/provenance gone; chattel
  id released (`ChattelApi.ownerOf` empty after); salvaging the forged
  knife yields less iron than the ingot that made it (the acceptance
  loop's last leg).

## Phase 7 — Acceptance sweep + documentation

- **End-to-end acceptance run** (extend
  `domain/hearthworks/__tests__/hearthworks-venues.integration.test.ts` or a
  new `mud/__tests__/crafting-lifecycle.acceptance.test.ts`): light forge →
  `forge knife` (declined cold, succeeds hot) → `analyze weapon` reads the
  ingot's material → combat wears condition + dulls keenness → `sharpen`
  restores keenness only → `repair` restores condition only → `salvage`
  yields less metal. Full-suite green, `pnpm lint`, `pnpm lint:gates`,
  `pnpm lint:module-scope`.
- **Docs** (the truth changed):
  - `docs/subsystems/crafting.md` — new sections: the three branches + the
    output-application dispatch; the recipe schema growth; the heat gate;
    the generalized knowledge ladder (read/watch = claim, perform = deed,
    order ungated); the manual paths per branch; keenness vs condition (two
    axes, two cadences); repair/salvage lifecycle; the venue pattern +
    Business note (F5); the gather walk's real shape (F1 corrected).
  - `docs/subsystems/fire.md` § D9 — marked **consumed** (link the gate
    site); `docs/subsystems/thermal.md` + the stale "consumed by NO recipe"
    comments in `api/thermal.ts` / `obj/api/ThermalLogic.ts` updated.
  - `docs/subsystems/combat.md` + `materials-response.md` — the
    wear-on-use producers + the bounded instrument-delivery scale (and the
    deliberate material-height asymmetry, F3).
  - `docs/launch-worklist.md` — strike item 1 (crafting branches + repair
    lifecycle), noting tailoring stays deferred per the requirements.
  - `docs/subsystems/app-settings.md` key vocabulary — the `crafting.*`
    dials.
- Retirement of this plan + the requirements doc happens at `/finalize`,
  not here.

## Deferred seams (attach points, not stubs — extract to slates at sweep)

Skill-as-control (`deriveAtFixedControl._control`, defect/scatter — the
declared next wave; every Transcript row from this build already counts);
assembly recipes; tailoring branch (the jerkin recipe + `mending` capability
are its attach points); batching; workshop lockers; DIY stock-pricing;
skill-scaled salvage yield; working-surface maintenance beyond edges
(seasoning/tuning — `KeenMixin` is deliberately edge-only); environmental
decay; recipe-spread vectors beyond watching.

## Critical files

- `obj/api/CraftingLogic.ts` — the seams, gather walk, heat gate, mint
  dispatch, repair/salvage, evidence tail (every phase touches it).
- `lib/craft/Recipe.ts` — the one-Document schema growth everything else
  keys on.
- `api/crafting.ts` — the call shapes (decline reasons, mint request,
  repair/salvage surfaces).
- `obj/api/CombatLogic.ts` — wear-on-use + the keenness/condition delivery
  fold (`commitInflict`).
- `config/recipes.yaml` — the byte-compat regression surface and the
  authored difficulty ladder.
