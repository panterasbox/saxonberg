# Butchery & animal products — implementation plan

Executes [butchery-requirements.md](../requirements/butchery-requirements.md).
**Kind:** feature. **Leads from:** kernel — first consumers are
`trade-cooking`'s `butcher` and `trade-ranching`'s three livestock species
(ewe · cow · sow), all shipped by the carcass chain on this same branch.

What is being built: tissue masses on a body plan become **shares of body
mass** that sum to 1; muscles become **named tissue Materials** carrying
the one property a cut's texture derives from (`work`); a cut is a row
that **claims** tissues, so its mass and its toughness are derived and an
author cannot lie about either; `butcher` grows a second form
(`butcher <body> for <cut>`), a tool gate (knife · saw · cleaver + block),
a skill gate that yields trim where a joint was asked for, and a carcass
that **reduces** rather than vanishing; the kitchen's one-shot craft reads
the cut's texture against the recipe's method and moves the dish's grade;
a wound on a part damages the cut off that part; and gut, blood and fat
become goods — casing, sausage, black pudding, lard beside suet.

⚠ **This plan lands on `reqs/second-tier` (MR !334), already under
review.** The carcass chain's waves are `W0–W9` plus post-review commits.
These waves are numbered **W20–W27** and assume every carcass-chain
commit is present — in particular that `Corpse` is a `Thing`
(`platform/thing/Corpse.ts`, row `/stuff/thing/Corpse`).

---

## Grounding

Verified by opening files on 2026-10-05, at `d256c4f9f`.

### The mass model today

- `packages/server/src/mud/platform/idea/species/BodyPlan.ts` —
  `interface TissueComposition { tissuePath: string; mass: number }`
  (l.73–78, "Mass in kg"); `interface BodyPart { key, parent, tissues,
  governs?, serves?, severable?, innervatedBy?, suppliedBy? }` (l.97–161).
  `setBodyParts` (l.450–510) validates keys, parent edges, `governs`
  against `VITAL_SIGNS ∪ BODY_CAPACITIES`, `serves` against
  `BODY_CAPACITIES`, slot→part refs; **it does not read `mass` at all.**
  `partArea(partKey)` (l.596–603) sums `t.mass` and returns
  `mass^(2/3)`.
- ⚠ **`partArea` HAS callers — two, both inside `BodyPlan`**:
  `getPartSurfaceFraction` (l.566–579, normalises across exterior parts)
  and `interiorChildrenOf` (l.609–614, sorts organs largest-first). The
  requirements' *"no callers"* premise is wrong but harmless: both
  readers are **ratio-only** (one normalises, one orders), so any
  rescaling of every part by the same factor leaves both unchanged.
  Their readers: `lib/slot/Attired.ts:647,661,686,709` and
  `lib/slot/Wearable.ts:464` (surface fraction), `ConditionLogic.ts:1263`
  (the depth ladder).
- The two other readers of `tissues` read **only `tissuePath`**:
  `ConditionLogic.partHasBoneTissue` (l.164) and
  `primaryTissueMaterial` (l.173, *"v1: type-decision only"* — returns the
  FIRST resolvable tissue material; every shipped part lists bone first).
- `lib/vitals/Vitals.ts:1911` `getParts()` overlays `bodyPartDeltas`
  (`{missing?}`) on `plan.getBodyParts()` — the anatomy resolver. It
  carries **no tissue override**, and `Species.ts` has no anatomy field
  at all (`rg -i "tissue|anatomy|override"` → nothing).
- `lib/creature/Creature.ts` — `bodyMassIndex()` (l.501) is
  `getMass()/stature²`; `withBodyComposition` (l.579) adds reserve deltas
  to the frame; `seedMassFromBodyPlan` (l.600) reads
  `species.massAt(ageDays)` first (`Species.adultMass`, l.667) then the
  plan's `baseMass`. **None reads a part mass.**
- **Six body-plan rows**, all authoring absolute kg:
  `species-and-names/content/stuff/idea/species/BodyPlan/{quadruped,biped,sessile}.yaml`,
  `trade-fishing/.../BodyPlan/{fish,crustacean}.yaml`,
  `trade-mining/.../BodyPlan/avian.yaml`. The quadruped's torso is
  bone 6 · muscle 10 · flesh 12 kg (total body ≈ 50 kg) and is named by
  sheep (`adultMass: 70`), cattle (`adultMass: 550`), the pig, the hog,
  dogs, cats and horses. ⚠ The chicken (`gallus/domesticus`) names
  **`biped`**, not `avian`.
- **Test fixtures author tissue masses in 33 files, ~95 sites** —
  `rg -c tissuePath packages -g '*.test.ts'`; the heaviest are
  `lib/vitals/__tests__/Vitals.sever.test.ts` (11),
  `ConditionLogic.interior.test.ts` (6), `Vitals.anatomy.test.ts` (6),
  `Slotted.covering.test.ts` (6), `ConditionLogic.limp-coverage.test.ts`
  (5). The rename is a sweep.

### Species, yields, dressing

- `platform/idea/species/Species.ts` — `ButcheryYield { cut, units,
  fraction?, conditioned? }` (l.58–84); `DressedLine { cut, units,
  kgEach|null }` (l.87); `finishFactor(fleshPct)` (l.108, module
  function); `butcheryYield` field (l.831, `fieldMeta` persistent +
  authorable l.962); `setButcheryYield` (l.1047) throws `RangeError` on a
  `fraction` outside `(0,1]`; `dressOut({liveKg, fleshPct})` (l.1089)
  — `kg = liveKg × fraction × finish`, drops a line under 0.05 kg, counted
  lines pass through with `kgEach: null`. **Sync; reads nothing about the
  cut row.**
- The five livestock tables
  (`trade-ranching/content/stuff/idea/species/animalia/.../{ovis/aries,bos/taurus,suidae/sus/domesticus,gallus/domesticus,canidae/canis/familiaris}.yaml`):
  ewe/cow/sow author `/stuff/thing/items/stew-meat ×12` + offal + suet +
  hide + bone with fractions; the hen is counted (`stew-meat ×2, offal
  ×1`); the dog's yield is **empty** (authored refusal). The taurus row's
  own comment: *"The missing third is blood and gut contents, which stay
  unmodelled."*
- `species-and-names/.../species/hog.yaml` (the `hanging-carcass`'s
  species) is **counted**: `stew-meat ×6, prime-cut ×2, offal ×2`.
- `trade-fishing/content/stuff/idea/species/carp.yaml` etc.: counted
  `/trade/fishing/thing/fillet ×2, roe ×1, offal ×1` — the precedent for
  a pack-owned cut row, and the path that must keep working (AC13).

### The butcher, the corpse, the trauma

- `trade-cooking/src/idea/cmd/crafting/ButcherController.ts` — refusals
  in order: not organism → unresolvable species (after
  `SpeciesApi.preloadAnatomy`) → sentient → named-and-alive → no blade →
  empty yield → alive. Band read once (`competenceBandFor('butchery')`,
  `skill = rank/rank('expert')`, `mess = 1 − skill`). Mint loop
  (l.255–320): `units = max(1, round(line.units × (0.5+0.5·skill)))`,
  `kgEach` rescaled, `ageAtKill`, `transferContaminationTo(cut)`,
  `spillGut(cut, mess)` (three `GUT_FLORA` at `max(0.15, mess)`),
  `ContainmentApi.move(cut, here)`; then the block and the blade are
  spilled on; `creditDeed`; **`StuffApi.destruct(body)`**. `findBlade`
  narrows the bound `blade` arg to `getConstructionForm() === 'bladed'`;
  `findBlock` to `isContaminable && isPlacing`. `ButcherModel` is
  exported. `body instanceof Corpse` for `getConditionAtDeath()`.
- `trade-cooking/content/trade/cooking/cmd/crafting/butcher.yaml` — args
  `body` (object, `requires: any`), `blade` (objects, default
  `reachable:[mixin.ConstructedMixin]`), `block` (objects, default
  `reachable:[mixin.PlacingMixin and mixin.ContaminableMixin]`). No
  `for`, no tools, no vessel.
- `platform/thing/Corpse.ts` — `PostmortemMixin(ConcealableMixin(
  ContaminableMixin(ContainerMixin(ThermalMixin(VitalsMixin(
  ReservedMixin(AttiredMixin(BodyPlanSlotsMixin(SlottedMixin(
  OrganismMixin(PropertiedMixin(Thing))))))))))))`; one own field
  `conditionAtDeath`. **No `PersistableMixin`** — every per-instance
  field on a corpse is RAM-only, which is right for a thing that is
  destroyed when it is used up.
- The death mint (`ConditionLogic.mintCorpseFrom`, l.689–800) clones
  `/stuff/thing/Corpse` with a `dataOverlay` (species, cause, mass,
  `bornAt`, `conditionAtDeath`, keywords) and **pours the material
  slices** — `MATERIAL_FORK_SLICES = ['Vitals','Trauma','CauseOfDeath',
  'Anatomy']` (`Vitals.ts:144`) — so **the wound map rides onto the
  corpse**: `corpse.getConditions()` filtered to `kind === 'trauma'`
  yields `Trauma { site: 'body.*', severity, type, … }`
  (`platform/idea/Condition.ts:162`).
- `ConditionApi.inflict(target, spec)` (`api/condition.ts:250`) takes a
  `site` + `energy`; the carcass drive already kills through a wizard
  `eval` (`ConditionApi.die`) at `carcass-chain.dirty.wire.test.ts:948`.

### Materials

- `lib/material/Material.ts` fields: `toughness` / `hardness` are the
  **mechanical-response** axis (MPa / MJ·m⁻³, `materials-response.md:38`,
  read by `edge`/`point`/`blunt`) — **not** reusable as meat texture;
  `tags` (open), `nutrients`, `nutrientAmounts` (mg/serving, read by
  `NutritionLabel`/`BlendLabel`/`Maturing`), `composition:
  CompositionEntry[] { materialPath, fraction }` (read by
  `NutritionLabel.ts:119`, `CraftingLogic` ×3, `MaterialLogic` ×2,
  `Ore`, `Loaf`, `SmeltController`), `edibility`, `waterActivity`,
  `spoilActivationEnergy`, `tastes`.
- Subclass precedent: `lib/material/Radioactive.ts` →
  `RadioactiveMaterial extends RadioactiveMixin(Material)` at
  `/platform/idea/material/RadioactiveMaterial`; `ConsumableMaterial`
  (`platform/idea/material/ConsumableMaterial.ts`, *no extra fields —
  taxonomy*); arcana's `PotionMaterial extends PotableMixin(ArcaneMixin(
  IdentifiableMixin(ConsumableMaterial)))`. `MaterialCatalogue.warm()`
  (`platform/idea/MaterialCatalogue.ts:62`) selects every row under an
  `/idea/material/` infix whose class `prototype instanceof Material` —
  **self-warming at boot (l.54), never an allowlist.**
- ⚠ `ConsumableMaterial.ts:12–14` states the fixed-vocabulary doctrine:
  *"ribeye and sirloin are NOT [different rows] (that's `Grade` + prose
  on the instance)."* The requirements' first surface decision overrides
  it **on the doctrine's own test** — muscles differ in a substrate-read
  property (`work`). The sentence is updated at the sweep; it is not a
  reopen.
- Tissue rows in `base-library/content/stuff/idea/material/tissue/`:
  `bone`, `flesh`, `muscle`, `blood`, `fruit-flesh`, `plant-tissue`.
  `muscle.yaml` tags `[tissue, animal, muscle, organic, living, edible]`,
  `spoilActivationEnergy: 80000`, `waterActivity: 0.99`.
  `blood.yaml` is the transfusion material — `edibility: false`, tags
  `[tissue, blood, liquid, organic]`, `ruinedByFreezing: true`.
- ⚠⚠ **`/stuff/idea/material/tissue/muscle` is a LEAF.** The folder/leaf
  invariant (`templates.md § TemplateApi & the Folder/Leaf Invariant`,
  rule 3: *leaf save with existing children* rejected at the PM
  chokepoint) makes the requirements' `tissue/muscle/<name>` path
  **unsaveable**. A sibling folder with no row at it is fine (rule 4 only
  fires on an existing leaf ancestor).
- Fat: `trade-ranching/content/stuff/idea/material/food/animal-fat.yaml`
  (raw, tags `[food, suet, rendering, once-living]`, deliberately NOT
  `fat`); `trade-cooking/content/trade/cooking/idea/material/tallow.yaml`
  (rendered, carries `fat` + `cooking-fat`). `render-tallow` matches
  `category: suet`.
- Products: `generic-objects/content/stuff/thing/items/stew-meat.yaml`
  (Provision, material `/stuff/idea/material/food/stew-meat` — tags
  `[food, meat, raw]`, name "stew meat"); `.../items/offal.yaml`;
  `.../items/prime-cut.yaml` (FINE-grade stew-meat — the hog's);
  `trade-ranching/content/trade/ranching/thing/{suet,hide,bone}.yaml`
  (hide names **tanning's** class `/trade/tanning/thing/Hide` — the
  producer-owns-the-row / consumer-owns-the-class precedent;
  `trade-ranching/package.json` depends on `content-trade-tanning`);
  `trade-cooking/content/trade/cooking/thing/treated-cut.yaml`;
  `.../thing/meat-hook.yaml` (a `Fitting`, `placements: [from]`, affords
  nothing — correct, leave it); `.../agent/hanging-carcass.yaml` — ⚠
  path says `agent/`, class is `/platform/thing/Corpse`, species
  `/stuff/idea/species/hog`, **no mass stamped** (fine: the hog is
  counted). `lint:instanceable` invariant 7 only checks that *a* branch
  segment is present, so the misfiled row passes today.
- Who stocks meat: `terminus/content/world/terminus/general-store/counter.yaml`
  (stock lines + a price map; carries the clasp knife at 6) and the
  hearthworks business (`hearthworks/.../idea/business.yaml:106`,
  `category: stew-meat`). No row anywhere is a saw or a cleaver
  (`rg -il "cleaver|\bsaw\b"` → only `householders-kit.yaml` prose).

### Tools and gates

- `lib/material/Construction.ts` — forms are a closed weapon vocabulary
  (`bladed · pointed · hafted · flail · whip · blunted`) + registered
  fabrics. There is no `toothed`/`saw` form and adding one would be a
  **kernel list edit**, which a pack may never need.
- `lib/craft/ToolCapability.ts` — *"the vocabulary is OPEN… a pack that
  ships a still names `still` on both sides and nothing in the kernel
  changes."* `Tooled.hasCapability(cap)` (l.111); `MixinApi.isTool`
  (`api/mixin.ts:1774`). `trade-cooking/src/thing/KitchenTool.ts` =
  `ContaminableMixin(Tool)`; rows `kitchen-sieve` (`capabilities:
  [strainer]`) and `fruit-press` (`[juicer]`). **This is the saw's and
  the cleaver's shape.**
- Instrument-arg precedent (`lint:instrument-args`): `tan.yaml`'s `pit`,
  `grind.yaml`'s `stones`, `dip.yaml`'s `pot` — an `objects` arg with an
  MQL `default: "reachable:[mixin.X]"` and `requires: [X]`; the
  controller narrows, never searches.
- `lib/advancement/CompetenceBand.ts` — `untrained · novice · competent ·
  proficient · expert`; `Competence.seedRunFor(band)` (l.221) maps a band
  to the `DIFFICULTIES` rung it can seed — the gate `CraftingLogic`'s
  `canMake` uses (l.252–258).

### The one-shot craft (where the cooking law hooks)

- `CookController` (`trade-cooking/src/idea/cmd/crafting/CookController.ts`)
  → `requireDeed` → `CraftingApi.craft({ recipeRef, makerMode: 'self' })`.
  `cook.yaml` declares **one arg, `dish: string`** — no target.
  `cure.yaml` declares `target` (object, `requires: any`) and
  `PreserveController` passes it as `CraftRequest.target` (*"preferred
  for any item slot it satisfies"*, `api/crafting.ts:55–65`).
- `CraftingLogic.craftImpl` (l.2309–2530): matches item slots (the
  matched `MatchedItemInput` carries the **live `stuff`**), tools by
  capability, the medium by tag with `mediumCapK` (water → boiling point,
  fat → smoke point), the heat gate, then
  `grade = Grade.deriveAtFixedControl(grades)` → `max(baseGrade)` →
  `applyControlFloor(…)` (l.2461–2465) → output. **The law hooks after
  l.2465 with the cut still alive**, reading `recipe.getMedium()`
  (`'water'|'fat'|null`), `recipe.getHoldS()` (never 0 — unauthored reads
  `thermal.dose.defaultHoldS` = 1200 s, `Recipe.ts:537`) and
  `getRequiresHeatK()`. No recipe field is added. ⭐ **The requirements'
  "no recipe schema change" claim is TRUE.**
- The grade is visible: a minted dish is `Crafted` and
  `Crafted.renderVerdict()` (`lib/craft/Crafted.ts:160`) puts *"It looks
  fair: …"* into `look`. Drive steps 8–10 read that line.
- Recipes (`trade-cooking/content/recipes/`): `hearty-stew` has
  `medium: water`, `requiresHeatK: 373`, **no `holdS`** (→ 1200 s);
  `hearth-roast` 450 K dry, `fine-roast` 500 K dry (`minGrade: fine`),
  `seared-cut` 500 K / `holdS: 10`; `render-tallow` (`category: suet`);
  `salt-cure` (`cure: {solute: 0.55}`, `outputApplication: tangible`).
  `trade-baking/content/recipes/dog-loaf.yaml` takes `category: offal`
  ×1 + `bone-meal` + `bran` + `cooking-fat`.
- The tangible transform (`applyTangibleOutput`, l.1479–1560): an
  authored `outputMaterial` wins, else the primary item's material flows;
  mass is summed over inputs; pathogen loads and water state ride onto
  the output (l.1640–1660) — so **a casing made from a dirty gut stays
  dirty, and a sausage stuffed into it inherits the load.** Nothing new
  is needed for AC9's "dirtiest thing you have handled".

### Volumes

- `lib/husbandry/Producing.ts:797–823` `pourTake` — the shipped way to
  put N litres of a material somewhere: clone
  `/platform/thing/UnboundedReceptacle`, `setBulkMaterial('interior',
  material)`, `BulkableApi.transfer(from, to, {kind:'measure', litres,
  mode:'lenient'})`, destruct the source; the surplus is **spilled**, and
  the bound vessel decides what is kept (*"bring a pail"*). Three Api
  calls a pack controller may make; no new Api.

### `look` seams

- A derived line on `look` is a class/mixin `static markupAugmenters`
  (`MarkupAugmenter = (text, host, viewer, opts) => string`,
  `api/mml.ts:130`): `Freshness.ts:163 freshnessAugmenter` (band word,
  never a number; silent when fresh), `ThermalDose.ts:166
  donenessAugmenter`. Texture and the reduced carcass follow this shape.

### Drive geography

- The carcass drive starts at `YARD =
  '/world/terminus/hearts-delight/location/farmstead-yard'`, drafts with
  `draft 3`, kills with `slaughter head`, buys its knife at the general
  store. **Hearts Delight keeps a flock only.** Cattle exist in
  `eternal-university/content/world/terminus/eternal/campus-farm/thing/herdbook.yaml`
  (`speciesPath: …/bos/taurus`). Drive step 11's cow is drafted there.
- Wire tests live at `packages/wire/tests/*.wire.test.ts`; the carcass
  drive is `.dirty.` (it spends a persisted flock) and runs with
  `WIRE_BOOT=1 WIRE_PORT=2014` on build-1.

### Gates (roster derived — `pnpm -C packages/server lint:family --list`)

In play: `lint:instanceable` (inv. 7 branch segment, inv. 11 class/extends,
**inv. 12 orphan `data:` keys** — a new YAML key must be a declared
field, ceiling 393 may not rise, inv. 13 no `hydratorClass`),
`lint:mass` (every Tangible row states `mass` or `_materialPath`),
`lint:perishable` (a perishable material's row must be a Freshness
class), `lint:pathogens`, `lint:descriptors` (descriptor banks ∩ material
names/keywords/appearance = ∅ — new material names are checked),
`lint:field-meta`, `lint:mixin-names` (a kernel mixin must be in
`Mixins`), `lint:instrument-args`, `lint:unconsumed-seams` (a declared
field nobody reads raises a ceiling), `lint:imports`, `lint:module-scope`,
`lint:object-verbs`, `lint:lib-statics`, `lint:verb-collisions`,
`lint:test-content`, `lint:drive-scripts`. Plus the one this build adds
(D1).

---

## Plan-level decisions

Numbered to the caller's nine questions, then the ones planning found.

### D1 — `TissueComposition.mass` → `share`; the invariant lives in two places; `partArea` keeps its law

- **Field.** `TissueComposition { tissuePath: string; share: number }` —
  *"share of the whole body's mass this tissue of this part carries,
  (0, 1]; the shares of every tissue of every part sum to 1 across the
  plan."* No `mass` remains; a `mass` key on a tissue is a typo and
  `setBodyParts` **throws** on it by name (the `governs`-typo precedent:
  a throw at registration, not an inert part).
- **Setter invariant (per field, on the setter).** `setBodyParts`
  validates each `share` is finite and in `(0, 1]`. It does **not**
  enforce the sum: test fixtures author one-part and two-part bodies on
  purpose, and the resolver normalises (below), so a partial body is
  honest at the engine level.
- **Content invariant (the gate).** New gate `lint:anatomy`
  (`packages/server/scripts/check-anatomy.ts`), five clauses, all over
  shipped rows: **(a)** every `BodyPlan` row's shares sum to `1 ± 1e-3`;
  (b)–(e) below under D2, D4. Runs in `lint:family` by being named
  `lint:*` — nothing to enumerate. Plus one unit test that loads each of
  the six shipped plan rows and asserts the sum — the gate's twin for the
  suite.
- **Reads normalise.** Every share read goes through the resolver
  (`Species.resolvedTissues()`, D2), which divides by the plan's total,
  so a fixture summing to 0.3 still reads as proportions. Shipped rows
  sum to 1 and the division is identity.
- **`partArea`** becomes `(Σ share)^(2/3)` — Meeh's law over a
  proportion. Both readers are ratio-only (grounding), so every shipped
  behaviour — the hand's 2.7 % of a biped, liver-before-heart on the depth
  ladder — is unchanged. The docstring's *"there is no authored `area`
  field"* paragraph stands.
- **Conversion.** The six rows are converted by hand: each tissue's
  `share = mass / Σ(all masses on the plan)`, rounded to 4 places, then
  the largest tissue absorbs the rounding residue so the sum is exactly 1.
  The 33 fixture files are converted by a **scratch script, not
  committed** (`/tmp/claude-…/scratchpad/normalise-fixtures.ts`): within
  each `tissues: [...]` literal, rename `mass` → `share` and divide by
  that literal's own total. Ratios inside each fixture are preserved, so
  every assertion about ordering or fraction holds. ⚠ A fixture that
  authors a single part with one tissue converts to `share: 1`.
- **Migration shape.** None. Rows are content; a world booted on the
  old rows is dropped (`pnpm --filter @saxonberg/server reset:db`) —
  NO MIGRATIONS EVER. The plan records that the build-1 dev DB must be
  dropped at W20.

### D2 — Species overrides are absolute body-share TARGETS per tissue material; the resolver renormalises

- **Field.** `Species.tissueShares: Record<string, number>` — *"the share
  of this species' whole body that each named tissue material makes up;
  overrides the body plan's figure for that material and rescales the
  rest proportionally."* `fieldMeta: { persistent: true, authorable:
  true }`. Setter: each key a path string, each value finite in `(0, 1)`,
  `Σ < 1`; throws otherwise (`setButcheryYield`'s shape).
- **Why targets, not a part-by-part restatement.** A stockman knows *a
  pig is a third fat and dresses out at half*; nobody knows the belly's
  fat share. Restating a part's tissue list would also break the
  sum-to-1 invariant unless the author rebalanced every other part by
  hand. A target per material keeps the invariant **by construction**:
  for each targeted material `m` with plan total `s_m` and target `t_m`,
  every tissue of `m` is scaled by `t_m / s_m`; every untargeted tissue
  is scaled by `(1 − Σt) / (1 − Σs)`. The topology never moves.
- **Resolver.** `Species.resolvedTissues(): ResolvedTissue[]` where
  `ResolvedTissue { partKey: string; tissuePath: string; share: number }`
  — walks `getBodyPlan().getBodyParts()`, normalises by the plan total
  (D1), applies the targets. Memoised per species instance and
  invalidated by `setTissueShares` / plan HMR (the Species is a
  `Singleton`; a `private resolvedTissuesCache: ResolvedTissue[] | null`
  — ordinary internal state, TypeScript `private`, not `#`). Convenience:
  `Species.tissueShareOf(tissuePath): number` (summed over parts) and
  `Species.partsCarrying(tissuePath): string[]`.
- **Not reused:** the `bodyPartDeltas` resolver on `Vitals` is a
  per-INSTANCE delta (`missing`) over structure; a species override is
  per-KIND and belongs on the kind. Pulling species data through an
  instance mixin would have every corpse and every living beast carry a
  copy of a fact about its species. `getParts()` is untouched.
- **Gate clauses.** `lint:anatomy` **(b)** every `tissueShares` key names
  a tissue present on that species' body plan (a target for a tissue the
  plan lacks fails closed and silent — the beast would simply have none
  of it) and resolves to a Material row.
- **`partArea` stays plan-level** (raw shares) — the surface fraction and
  the depth ladder read the plan, not the species. A pig's fatter belly
  changing its surface fraction is a nicety nobody reads; recorded as a
  deferred seam, not done.

### D3 — A muscle is a `Material` subclass carrying ONE new number; fat is `composition`

- **Class.** `lib/butchery/Muscle.ts` exports `MuscleMixin` (`_mixinName
  = 'MuscleMixin'`, registered in `Mixins` as `Muscle`;
  `MixinApi.isMuscle(obj): obj is Stuff & Muscle`) with one field,
  `work: number` — *"how hard this muscle worked in life, 0..1; the
  collagen it carries and therefore what cooking it wants."*
  `fieldMeta: { persistent: true, authorable: true }`; setter clamps
  nothing and throws outside `[0, 1]`. The instanceable twin is
  `platform/idea/material/Muscle.ts`: `export default class Muscle
  extends MuscleMixin(Material) {}` — the `RadioactiveMaterial` pattern
  exactly. `MaterialCatalogue.warm()` already admits it (class extends
  `Material`, path under `/idea/material/`).
- **Why a subclass and not a field on `Material`.** A `work` field on
  `Material` would be a claim that granite worked; every reader would
  guard on a `muscle` tag, which is the wrong-host tell. Precedent cuts
  the other way too: `spoilActivationEnergy` et al. sit on the base
  because *every* food has them; `work` is true of exactly one tissue
  kind.
- **Why not `toughness`.** `Material.toughness` is the mechanical-
  response axis (MJ·m⁻³) read by the `blunt` channel; reusing it would
  make a shank harder to bruise than a loin in a fight. Different fact,
  different field.
- **Fat is `composition`.** Intramuscular fat is
  `composition: [{ materialPath: /stuff/idea/material/food/animal-fat,
  fraction: 0.x }]` on the muscle row — an existing field with existing
  readers, and `NutritionLabel`/`BlendLabel` already derive a blend's
  fat from it, so a belly reads fattier than a loin on the label for
  free.
- **Path.** `/stuff/idea/material/tissue/muscles/<name>` (a sibling
  folder, because `tissue/muscle` is a leaf — grounding). The generic
  `tissue/muscle` row is **kept** for the biped, fish, crustacean and
  avian plans and for the organs (`heart`). Base-library ships the
  muscles (commons: a loin is a fact about animals).
- **Roster and `work`** (the quadruped's eight, authored in
  `base-library/content/stuff/idea/material/tissue/muscles/`):
  `shank 0.95 · neck 0.85 · shoulder 0.80 · leg 0.60 · belly 0.50 ·
  rib 0.35 · loin 0.25 · tenderloin 0.05`. Each row: `class:
  /platform/idea/material/Muscle`, `keywords` = its name only, tags
  `[tissue, animal, muscle, organic, living, edible, food, meat, raw]`
  (⭐ `meat` so every shipped `category: meat` slot matches a cut;
  `raw` for the spoilage seam), `tastes: [umami]`, `spoilActivationEnergy:
  80000`, `waterActivity: 0.99`, `density: 1060`, `nutrients: [protein,
  water]`, `nutrientAmounts: { protein: 26000 }`, and `composition`
  naming `animal-fat` at `0.05` (loin/tenderloin/leg/shank), `0.12`
  (shoulder/neck/rib), `0.30` (belly). `lint:descriptors` will say if a
  name collides with a descriptor bank; `rib`, `leg`, `neck` are the
  likely collisions and the fix is the keyword list, never the bank.
- **The quadruped plan names them.** `quadruped.yaml` tissue lists
  become: torso `bone · neck · rib · loin · tenderloin · belly ·
  animal-fat · flesh`; each front leg `bone · shoulder · shank · flesh`;
  each rear leg `bone · leg · shank · flesh`; head and organs unchanged
  (`flesh`/`muscle`/`bone`). `flesh` stays as skin + connective
  remainder; `/stuff/idea/material/food/animal-fat` becomes a **tissue**
  on torso and legs so the fat line can claim it (D4). ⚠ Bone stays
  FIRST in every list — `primaryTissueMaterial` returns the first
  resolvable tissue and `partHasBoneTissue` reads tags, so trauma's two
  readers are untouched. Shares in W21's table sum to 1.
- **Biped, fish, crustacean, avian keep generic `muscle`.** Nobody
  butchers a biped (D14) and the chicken names the biped plan; poultry
  cuts are a deferred seam (the hen stays on trim + offal, as today).

### D4 — A cut CLAIMS tissues on its own class; toughness and mass derive on read; `fraction` derives when a claim exists

- **Class.** `lib/butchery/Cut.ts` exports `CutMixin` (`Mixins.Cut`,
  `MixinApi.isCut`) with:
  - `tissues: string[]` — identity refs (`fieldMeta: { persistent: true,
    authorable: true, ref: 'identity' }` per `ref-shapes.md`) — *"the
    tissue materials this cut takes off the carcass; a porterhouse is two
    entries."*
  - `cutting: 'boneless' | 'bone-in' | 'chop'` — the depth the cut needs
    (D6); default `boneless`.
  - `difficulty: Difficulty` (`easy|standard|hard`, the recipe ladder's
    vocabulary) — the hand it takes to get the joint rather than trim
    (D5); default `standard`.
  - `_speciesPath: string | null` — **stamped at mint** by the butcher
    (identity ref; what the meat is OF); `damaged: boolean` — stamped at
    mint when a trauma sits on a part this cut's tissues occupy (D9).
  - Methods: `getTissues()`, `getCutting()`, `getDifficulty()`,
    `getSpecies()`, `isDamaged()`, and the two derived reads —
    `getToughness(): number | null` (share-weighted mean of the claimed
    muscles' `work`, weights from `species.resolvedTissues()`; equal
    weights when no species is stamped; `null` when no claimed tissue is
    a `Muscle` — a bone heap has no texture) and
    `textureBand(): 'tender' | 'middling' | 'tough' | null` via the
    `Texture` value object (D7).
  - `static markupAugmenters = [textureAugmenter]` — appends one band
    sentence to `look` (*"It is a working muscle: close-grained, with the
    sinew of a joint that carried the animal."* / *"…soft and
    fine-grained; it will not forgive a long cook."*), silent on `null`,
    plus *"It is torn through where the beast was wounded."* when
    damaged. Band words, never a number.
- **Instanceable twin:** `platform/thing/Cut.ts` — `export default class
  Cut extends CutMixin(Provision) {}`. Row class
  `/platform/thing/Cut`. Composing on `Provision` inherits Freshness,
  WaterActivity, Contaminable, ThermalDose, Crafted, Composed, Sampled —
  everything a cut already needed and nothing new on any other host.
- **Mass derives.** For a yield line whose cut row claims tissues,
  `fraction` is **derived** = `Σ species.tissueShareOf(t)` over the
  claim, and `dressOut` multiplies by `finish` as today. A line whose cut
  claims nothing (hide, offal, blood) keeps an authored `fraction`.
  `lint:anatomy` **(c)**: a yield line naming a claiming cut must not
  author `fraction` (two sources of one number); **(d)** every claimed
  tissue path resolves to a Material row; **(e)** every tissue a species'
  yield claims appears on that species' body plan (else the cut can never
  come off — fails closed and silent otherwise).
- **`units` stays authored** — how many pieces the mass arrives in (a
  loin is two loins). A muscle present on two parts (the shoulder, on
  both forelegs) is taken from both at once; *abstract to what a player
  can act on*.
- **Where the derivation runs.** `Species.dressOut` grows a third
  argument: `dressOut({ liveKg, fleshPct, claims })` where `claims:
  ReadonlyMap<cutPath, readonly string[]>` is supplied by the caller
  (the butcher reads it off one cloned exemplar per line — see W23) and
  stays **sync** and **pure over its arguments**. `DressedLine` gains
  `tissues: readonly string[]` so the butcher can mark the carcass.
  Cached nowhere: derive-on-read, each `butcher`.
- **Rejected:** a `tissues:` field on `Provision` (a loaf claims no
  muscles — wrong host); a `Cut` Idea row kind parallel to the Provision
  row (two rows per cut, in 1:1, for no gain — the `butcheryYield`-on-
  Species reasoning); reading the cut row's raw `template.data` from the
  controller (the `applyContainer` antipattern).

### D5 — Two forms of one verb; the carcass reduces on two lists; `look` names what remains

- **View.** `butcher.yaml` gains `cut` (`type: string`, `required:
  false`, `prepositions: [for]`) — a WORD, matched by the controller
  against each yield line's cut row keywords, because a cut name is a
  thing a player asks for, not a thing in reach. Plus the two instrument
  args of D6 and the vessel of D10.
- **Default form** (`butcher <body>`): every yield line the tools allow,
  in order; muscle lines the tools do not allow are **left on the
  carcass** and named in the refusal sentence; non-muscle lines (offal,
  hide, suet/lard, bone, blood, gut) come off with a knife.
- **Named form** (`butcher <body> for <cut>`): one line; refused in words
  when the word matches no line of this species (*"There is no such cut
  on a sheep."*), when its tissues are already taken (*"The loin is
  already off it."*), or when the tools fall short (D6).
- **State on `Corpse`** — two RAM-only fields: `takenTissues: string[]`
  (tissue material paths a claiming cut has removed) and `takenLines:
  string[]` (cut template paths of non-claiming lines already taken).
  Both `fieldMeta: { persistent: true }` for shape honesty; `Corpse`
  composes no `PersistableMixin`, so a reduced carcass does not survive a
  restart — **stated, and right**: a half-butchered body on a hook is
  not a thing a restart owes anyone. Methods `markTissuesTaken(paths)`,
  `markLineTaken(path)`, `hasTissue(path)`, `hasLine(path)`,
  `getTakenTissues()`, `getTakenLines()`.
- **Destruction.** The body is destructed only when **every** line of
  the species' yield is taken (claims and non-claims). Until then it
  stays, and `look body` says what is left: `Corpse` gets
  `static markupAugmenters = [carcassAugmenter]` — silent on a whole
  body; on a reduced one, *"The ribs, the loin and the belly are still on
  it; the shoulders and the legs are gone."* built from the species'
  yield lines minus the taken lists, in the cut rows' own stems.
- ⚠ A `Corpse` with no yield (a person, the dog) is untouched by all of
  this — the refusals fire before any of it is read.

### D6 — Depth is a tool CAPABILITY read, declared as an argument; three words on the cut row

- **Vocabulary.** `cutting: boneless | bone-in | chop` on the cut row
  (D4). `boneless` needs an edge (the shipped `bladed` gate);
  `bone-in` needs a tool with capability `saw`; `chop` needs a tool
  with capability `cleaver` **and** a block in reach (the shipped `block`
  arg — the cleaver without a block is a refusal that teaches).
- **Rows** (`trade-cooking/content/trade/cooking/thing/`): `meat-saw.yaml`
  (`class: /trade/cooking/thing/KitchenTool`, `capabilities: [saw]`,
  `_materialPath: /stuff/idea/material/alloy/steel`, `mass: 0.9`) and
  `cleaver.yaml` (`KitchenTool`, `capabilities: [cleaver]`, `mass: 1.1`).
  `KitchenTool = ContaminableMixin(Tool)` so both remember what they cut
  (spilled on like the knife). The open capability vocabulary means
  **no kernel edit**; a second pack's band saw authors `saw` and answers.
- **View.** `butcher.yaml` gains `tools` (`type: objects`, `required:
  false`, `prepositions: [with, using]`, `default:
  "reachable:[mixin.ToolMixin]"`, `scope: ["reachable"]`, `requires:
  [ToolMixin]`) — the `grind.yaml`/`tan.yaml` shape; the controller
  reads `hasCapability('saw')` / `('cleaver')` across the bound set.
  ⚠ `blade` keeps `[with, using]` too; the binder hands both args the
  same reachable set and each narrows its own way (an edge is a
  construction, a saw is a capability) — a knife that is also a Tool
  would answer both, which is fine.
- **Not `toolCapabilities` on a recipe.** Butchering is not a recipe
  and the carcass is not an input slot; the recipe vocabulary stays the
  kitchen's. The same WORDS (`saw`) are used on both sides of the game so
  a later recipe can require one.
- **Where the tools live.** Stocked at the general store (`counter.yaml`
  lines + prices: saw 14, cleaver 9 — above the knife's 6) and placed in
  the hearthworks cookhouse (`props:` on `cookhouse.yaml`), beside the
  block, so the trade is learnable where it is practised.

### D7 — The cooking law moves the dish's GRADE, one band, inside `craftImpl`; no recipe change

- **Value object.** `lib/butchery/Texture.ts` — a named vocabulary +
  pure statics (the `Grade`/`ToolCapability` precedent):
  `TEXTURE_BANDS = ['tender','middling','tough']`;
  `Texture.bandOf(toughness)` (`< 0.35` tender, `≥ 0.60` tough, else
  middling); `Texture.methodOf({ medium, holdS })` → `'long-moist'`
  when `medium === 'water'` and `holdS ≥ LONG_HOLD_S` (3600),
  `'fast-dry'` when `medium === null` and `holdS < LONG_HOLD_S`, else
  `'other'`; `Texture.fit(band, method)` → `+1` (tough × long-moist,
  tender × fast-dry), `−1` (tough × fast-dry, tender × long-moist), `0`
  otherwise. Constants are statics on the class, documented; not
  `AppSettings` dials (no author has asked to tune them; `dont-escalate-
  dials-to-kernel`).
- **Hook.** `CraftingLogic.craftImpl`, immediately after
  `applyControlFloor` (l.2465): `grade = applyMethodFit(grade, recipe,
  matchedItems)` — a module function beside `applyControlFloor`: for
  each `MatchedItemInput` whose `stuff` `MixinApi.isCut` with a non-null
  `textureBand()`, sum `Texture.fit(...)`; clamp to `[−1, +1]`; move the
  grade by that many bands (`Grade.fromOrdinal`, floored at `poor`,
  capped at `exceptional`). ⚠ Applied **before** output so the dish's
  `Crafted` stamp carries it and `renderVerdict` shows it.
- **What varies: the output grade.** Not a different `outputTemplate`
  (the stew is still a stew), not appearance only (unreadable by the
  retail price index). Grade is the one axis every downstream reader —
  `minGrade`, the price list, `look`'s verdict — already consumes.
- **Content.** `hearty-stew.yaml` authors `holdS: 7200` (a stew is a
  long cook; today it silently reads the 1200 s default, which would
  make it "short"). `hearth-roast`/`fine-roast` stay dry at the 1200 s
  default (fast-dry). `seared-cut` is fast-dry at 10 s. ⭐ No schema
  change; two numbers already in the vocabulary.
- **`cook` gains a target.** `cook.yaml` adds `target` (`type: object`,
  `required: false`, `prepositions: [from, using]`, `scope:
  "reachable"`, `requires: any`, `canReach`) and `CookController` passes
  `model.target?.stuff` as `CraftRequest.target` — the `cure.yaml` /
  `PreserveController` shape verbatim. `cook stew from shoulder` is how
  drive steps 8–10 pick the cut.

### D8 — Gut, casing, sausage, pudding, lard: rows and recipes, and the contamination model already says the rest

- **Gut.** Material `/stuff/idea/material/food/gut` (base-library,
  `ConsumableMaterial`, tags `[food, gut, offal, raw]`,
  `spoilActivationEnergy: 92000`, `waterActivity: 0.99`, edible); row
  `/trade/cooking/thing/gut` (`class: /platform/thing/Cut`, claims
  nothing, `cutting: boneless`, `difficulty: easy`); a yield line on
  ewe/cow/sow (`units: 1, fraction: 0.03`). ⭐ At mint the butcher
  contaminates the gut at **full severity regardless of band**
  (`contaminate(key, 1)` for each `GUT_FLORA`): the gut IS the source,
  and skill decides what reaches the meat, not what is in the gut.
- **Casing.** Recipe `scrape-casing.yaml` (`trade-cooking/content/recipes/`):
  inputs `gut` (item, `category: gut`, `minGrade: poor`) + `salt`
  (`measureL: 0.1`) + `water` (`measureL: 0.5`); `toolCapabilities: []`;
  `outputApplication: tangible`; `outputTemplate:
  /trade/cooking/thing/casing`; `outputMaterial:
  /trade/cooking/idea/material/casing` (tags `[casing]`, not `meat`);
  `cure: { solute: 0.5 }`; no heat. The tangible transform carries the
  gut's pathogen loads onto the casing (grounding) and salt suspends but
  does not kill — **the dirtiest thing you have handled**, by the
  shipped arithmetic.
- **Sausage.** Recipe `sausage.yaml`: `casing` (item, `category:
  casing`) + `meat` (item, `category: trim`, `count: 2`) + `fat` (item,
  `category: rendering`, `count: 1` — matches suet AND leaf fat) + salt
  (`measureL: 0.05`); `outputApplication: tangible`; `outputTemplate:
  /trade/cooking/thing/sausage` (Provision, `mass: 0.5`);
  `outputMaterial: /trade/cooking/idea/material/sausage`
  (`ConsumableMaterial`, tags `[food, meat, sausage, raw]`,
  `waterActivity: 0.97`, `spoilActivationEnergy: 80000`); `cure: {
  solute: 0.3 }`; `difficulty: standard`, `discipline: cooking`. Every
  input's load rides the output. The dog loaf keeps its `offal` line —
  gut is `offal`-tagged too, so the loaf can also eat gut, but sausage
  wants casing + trim and never offal: the two do not compete for the
  pluck.
- **Black pudding.** Recipe `black-pudding.yaml`: `blood` (bulk,
  `category: blood`, `measureL: 0.5`) + `fat` (item, `category:
  rendering`, `count: 1`) + `bran` (bulk, `category: bran`,
  `measureL: 0.2`); `medium: water`; `requiresHeatK: 373`; `maxHeatK:
  373`; `holdS: 3600`; `toolCapabilities: [pot]`; `outputApplication:
  tangible`; `outputTemplate: /trade/cooking/thing/black-pudding`;
  `outputMaterial: /trade/cooking/idea/material/black-pudding`
  (`ConsumableMaterial`, edible, tags `[food, meat, pudding]`).
  ⚠ `tissue/blood.yaml` gets the tag `blood` already; it stays
  `edibility: false` (it is the transfusion material and a bulk slot
  matches by tag, not edibility — `isEdibleMatter` gates crafted
  **items** only, grounding). The pudding's own material is the edible
  one.
- **Trim.** `/stuff/thing/items/stew-meat` keeps its path (two shipped
  references) and becomes trim in every word: `shortDescription: parcel
  of trim`, keywords `+trim`; material `food/stew-meat` → `name: trim`,
  keywords `+trim`, tags `+trim` (keeps `meat`). `prime-cut` is left as
  the hog's counted fine line.
- **Lard beside suet.** Material `/stuff/idea/material/food/leaf-fat`
  (trade-ranching, raw pig fat, tags `[food, leaf-fat, rendering,
  once-living]`); row `/trade/ranching/thing/leaf-fat` (Provision, claims
  `[animal-fat]`); the sow's fat line names it, the ewe's and cow's keep
  `suet`. Recipe `render-lard.yaml` (`category: leaf-fat`) →
  `outputTemplate: /trade/cooking/thing/tallow-crock` (the same crock),
  `outputMaterial: /trade/cooking/idea/material/lard` (tags `[fat,
  cooking-fat]` — **not `tallow`**, so the chandler's dip, which matches
  `tallow`, refuses it: that is the "different uses" of AC11, by the
  shipped tag arithmetic). `analyze`/`look` tell them apart by material
  name and appearance.

### D9 — A wound damages the cut off its part, read off the Trauma slice the corpse already carries

- At mint, for each claiming line: `wounded = corpse.getConditions()
  .filter(c => c.kind === 'trauma')` → the set of `site`s; for each
  claimed tissue, `species.partsCarrying(tissue)`; if any part carrying
  a claimed tissue is a trauma site (or a descendant of one — a torso
  wound reaches the loin), **one unit per wounded part** is stamped
  `damaged: true` and its grade set to `poor`; the rest come off clean.
  Mass is untouched (a torn shoulder weighs what a shoulder weighs).
  `look` says so through the texture augmenter's damaged line.
- Nothing new on `Corpse` or `Vitals`; `forkSlice_Trauma` already pours
  the wound map. Consequence stays at the limb for the living (the
  requirements' non-goal); this reads the record after death only.

### D10 — Blood is a VOLUME yield line, poured into a bound vessel at the butchering

- `ButcheryYield` gains `yieldShape?: 'item' | 'volume'` (absent =
  `item`). For `volume`, `cut` names a **Material** path, `units` is
  ignored, `fraction` is the share of live mass; `dressOut` returns the
  line with `litres = kg / (density/1000)` on a new `DressedLine.litres
  | null`. `setButcheryYield` validates a `volume` line authors a
  `fraction`.
- `butcher.yaml` gains `vessel` (`objects`, `required: false`,
  `prepositions: [into, in]`, `default: "reachable:[mixin.BulkableMixin]"`,
  `requires: [BulkableMixin]`). The controller pours with the
  `pourTake` three-call shape (clone `/platform/thing/UnboundedReceptacle`,
  `setBulkMaterial`, `BulkableApi.transfer(... 'lenient')`, destruct) —
  three existing Api calls, no new Api, no kernel change beyond the
  `Species` field. No vessel ⇒ the blood is on the floor and the scene
  says so (the milk rule — *bring a pail*).
- The ewe/cow/sow author `{ cut: /stuff/idea/material/tissue/blood,
  yieldShape: volume, fraction: 0.04 }`. A 70 kg ewe gives ~2.6 L; a
  bullock ~20 L and the pail decides.

### D11 — The hand decides joint-or-trim by the shipped difficulty ladder; a skilled hand's cut is `fine`

- For each claiming line: `run = Competence.seedRunFor(band)`; the joint
  comes off when `DIFFICULTIES.indexOf(cut.difficulty) ≤
  DIFFICULTIES.indexOf(run.difficulty)`; otherwise the same mass comes
  off as **trim** (`/stuff/thing/items/stew-meat` units, `kgEach` from
  the same derived mass) and the carcass still loses the tissues. The
  scene says which joints became trim and why (*"The loin wants a steadier
  hand than yours; it comes off as trim."*). Cut rows author
  `difficulty`: trim/gut/offal `easy`; shoulder/leg/neck/belly/shank/rib
  `standard`; loin/tenderloin `hard`.
- Grade of a joint: `proficient`/`expert` → `fine`, else the row's
  default `fair` — so a skilled butcher's loin reaches `fine-roast`
  (`minGrade: fine`) and an unskilled one's does not; the hog's
  `prime-cut` had hard-coded that spread. The `units × (0.5+0.5·skill)`
  waste multiplier is **retired** for claiming lines (mass is now the
  animal's; what skill decides is joint vs trim) and kept for counted
  lines (the fish, the hen), byte-identical.

### D12 — `Species.meatName`, and the stem a cut is minted with

- `Species.meatName: string` (`fieldMeta: { persistent: true, authorable:
  true }`, default `''`): *"what the meat of this animal is called —
  mutton, beef, pork."* Falls back to `commonNames[0]`. Three rows
  author it. The butcher mints each cut with `dataOverlay: {
  shortDescription: \`${cutStem} of ${meatName}\`, _speciesPath }` — the
  corpse mint's own shape (*"body of a ewe"*). A player can tell which
  animal a joint came from (AC1), and the row's own stem stays the
  template's default for a cut cloned by anything else.

### D13 — `hanging-carcass` moves to `thing/`

The row's class is `/platform/thing/Corpse`; its path says `agent/`.
Move `trade-cooking/content/trade/cooking/agent/hanging-carcass.yaml` →
`.../thing/hanging-carcass.yaml` (template path
`/trade/cooking/thing/hanging-carcass`) and repoint the two referrers
(`rg -n "agent/hanging-carcass|/trade/cooking/agent/" packages/content`).
Its species stays `/stuff/idea/species/hog` (counted yields, no mass
stamped — honest for a dressed carcass on a hook). The `agent/` directory
is removed when empty.

---

## ⭐⭐ Host placement

| new thing | host | what composing it claims about everything else on that host |
|---|---|---|
| `TissueComposition.share` (renamed) | `BodyPlan.bodyParts[].tissues[]` — the plan flyweight | Every body plan states proportions, not kilograms. True of all six; the sessile plan has no parts and claims nothing. |
| `Species.tissueShares`, `resolvedTissues()`, `tissueShareOf`, `partsCarrying`, `meatName` | `Species` (the kind) | Every species *may* restate a tissue's body share and name its meat; the default (`{}` / `''`) is the plan's figure and the common name. A plant species with a sessile plan resolves to `[]`. Nothing is claimed about any instance. |
| `MuscleMixin.work` | `platform/idea/material/Muscle` only (a `Material` subclass) | Only a muscle worked. Granite, flesh, bone and blood carry no `work`; no reader guards on a tag. |
| `CutMixin` (`tissues`, `cutting`, `difficulty`, `_speciesPath`, `damaged`, `getToughness`, `textureBand`, texture augmenter) | `platform/thing/Cut extends CutMixin(Provision)` only | Only a cut claims tissues. A loaf, a lime and the fillet (a plain `Provision`) claim nothing and are untouched. The fillet row is **not** moved onto `Cut` — fish stay counted (AC13). |
| `Corpse.takenTissues`, `takenLines`, the carcass augmenter | `platform/thing/Corpse` | Every corpse can be reduced. A person's corpse has an empty yield so the lists stay empty and the augmenter is silent — no guard, the data is the answer. |
| `ButcheryYield.yieldShape`, `DressedLine.tissues/litres`, `dressOut(…, claims)` | `Species` (already the yield's host) | A yield line may be a volume. Fish lines are untouched (absent = item). |
| `Texture` value object | `lib/butchery/Texture.ts` | A vocabulary with no host; read by `Cut` and by `CraftingLogic.applyMethodFit`. |
| `applyMethodFit` | module function in `platform/idea/api/CraftingLogic.ts` beside `applyControlFloor` | Every one-shot craft asks its item inputs for a texture; every non-cut input answers nothing and the grade is unmoved. Not a new Api, not a helper module. |
| `KitchenTool` rows `meat-saw`, `cleaver` | `trade-cooking`'s shipped `KitchenTool` | Nothing new composes; two rows with two capability words. |
| `lib/butchery/` | new `lib/<subsystem>/` folder (Muscle, Cut, Texture) | A new subsystem folder, which `CLAUDE.md § File Naming` explicitly invites when a mixin fits no existing one; **not** a new module category. Its doc is `docs/subsystems/butchery.md` at the sweep. |

⭐ **The test, applied.** No new field needs a guard that re-narrows its
host: `work` reads only on `Muscle`, `tissues` only on `Cut`,
`takenTissues` only where a yield exists, `tissueShares` only through a
species that has a plan. The one place a reader checks a class is the
butcher's `body instanceof Corpse` for `getConditionAtDeath()`, which
the carcass chain already shipped.

**What is deliberately NOT placed:** nothing on `Thing`, `Good`,
`Provision`, `Material`, `Vitals`, `Creature` or `Tool`.

---

## Convention conformance

Checked at plan time against the current tree:

- **`props:` / `cast:`** — the cookhouse's saw and cleaver land in
  `props:` (`populates:` is retired; `lint:instanceable` inv. 10).
- **Locations** — no new rooms; the drive uses shipped `CartesianLocation`
  rows (`farmstead-yard`, the campus farm, the cookhouse).
- **`<root>/<branch>/` path pattern** — muscles at
  `/stuff/idea/material/tissue/muscles/<name>` (commons, `idea`
  branch); cuts, gut, casing, sausage, pudding, saw, cleaver at
  `/trade/cooking/thing/…`; leaf-fat at `/trade/ranching/thing/…`; cooking
  materials at `/trade/cooking/idea/material/…`; the kernel classes at
  `/platform/thing/Cut`, `/platform/idea/material/Muscle`; the two
  mixins and the value object under `lib/butchery/`. Controllers stay at
  `/trade/cooking/idea/cmd/crafting/`, views at `/trade/cooking/cmd/crafting/`.
- **Module scope declares** — `TEXTURE_BANDS` and the `Texture` statics
  are declarations; `lint:module-scope` passes.
- **Import boundary** — `lib/butchery/Cut.ts` imports `Provision`? No:
  the mixin is a class factory over a generic base and imports only
  `lib/` (Material via `StuffApi.findByTemplatePath`, `Texture`,
  `MixinApi`); the concrete `Cut` in `platform/thing/` imports
  `Provision`. `CraftingLogic` already imports `platform/thing/Scrap`
  (l.67) so a `platform/idea/api` → `lib/butchery` import is ordinary.
  The pack controller imports the kernel only by package specifier.
- **Verbs on objects** — `corpse.markTissuesTaken(...)`,
  `cut.getToughness()`, `species.resolvedTissues()`; no `XApi.verb(host)`
  (`lint:object-verbs` census stays 0).
- **No new Api, logic singleton, free helper, Mongo collection,
  `eslint-disable`, module category.** The two mixins + one value object
  are recognised categories; `lint:lib-statics` is a ratchet over `lib/`
  statics — `Texture`'s statics are a value-object vocabulary (the
  `Grade` precedent) and the count is checked before commit.
- **`Mixins` registry** — `Muscle: 'MuscleMixin'`, `Cut: 'CutMixin'`
  added (`lint:mixin-names`); refusal phrases in `MixinRefusals` only if
  a view ever `requires:` them — none does in this build.
- **Kernel mixin names widen to `string`** — `static _mixinName: string
  = 'CutMixin'` (`mixin-name-static-must-widen`).
- **Gates this build must satisfy** — the whole derived roster
  (`lint:family`), with these the ones most likely to speak:
  `lint:instanceable` (inv. 12 — every new YAML key has a declared
  field; inv. 7 for the moved row), `lint:mass` (every new Tangible row
  states `mass` or `_materialPath`), `lint:perishable` (every new
  Provision/Cut row's material is a Freshness class — `Cut extends
  Provision` passes), `lint:pathogens`, `lint:descriptors` (muscle
  names vs descriptor banks), `lint:field-meta`, `lint:mixin-names`,
  `lint:instrument-args`, `lint:unconsumed-seams` (every new field has
  a reader in the same wave), `lint:anatomy` (new, D1), `lint:imports`,
  `lint:verb-collisions` (no new verb), `lint:test-bootstrap`.

---

## Waves

Every wave is independently landable and ends at a commit. `pnpm test:near`
+ every touched pack's own vitest + `pnpm -C packages/server lint:family`
before each commit; the full suite runs **once**, at W27.

### W20 — The share model (kernel + the six plan rows + the fixtures)

**Goal.** Tissue mass becomes a share; the sum invariant is gated;
`partArea` keeps its law. **Decisions:** D1.

**Files.**
- `packages/server/src/mud/platform/idea/species/BodyPlan.ts` —
  `TissueComposition.share`; `setBodyParts` validates `share` finite in
  `(0,1]` and throws on a `mass` key by name; `partArea` over shares;
  docstrings (the `baseMass` comment that says *"mirrors
  `TissueComposition.mass`"* is rewritten).
- `packages/server/scripts/check-anatomy.ts` — new gate, clause (a) now
  (clauses b–e arrive with their fields in W21/W22 and are stubbed as
  named functions returning no findings until then); `package.json`
  script `lint:anatomy`.
- `packages/server/src/mud/platform/idea/species/__tests__/BodyPlan.shares.test.ts`
  — the six shipped rows sum to 1; `setBodyParts` refuses `mass` and a
  share of 10; `partArea` ordering is unchanged for the biped's organs.
- The six `BodyPlan/*.yaml` rows (grounding), converted by hand to
  four-place shares that sum to exactly 1.
- The 33 fixture files (grounding list), converted by the scratch
  normaliser; `pnpm test:near` over `lib/vitals`, `lib/slot`,
  `lib/concealment`, `lib/combat`, `platform/idea/api`, `scripts/__tests__`
  must be green.
- `docs/subsystems/vitals.md § Anatomy + tissue` — the tissue bullet
  rewritten for shares (the doc is permanent; this is the one place a
  wave edits a subsystem doc before the sweep, because the doc's current
  sentence is now false).

**Acceptance.** `lint:anatomy` green on the six rows; a seventh row
summing to 0.9 fails it with the sum in the message; every test that
asserted liver-before-heart still passes; `rg "mass:" packages/content
--glob 'BodyPlan/*.yaml'` is empty. Dev DB dropped and rebooted once.

**Commit.** `build(butchery W20): tissue mass is a SHARE of the body —
the sum invariant gated, partArea unchanged in law`

### W21 — Muscles are Materials; the species owns its shares (kernel + base-library + quadruped)

**Goal.** Named muscle materials with `work`; the quadruped names them;
the species can restate a tissue's body share. **Decisions:** D2, D3,
D12.

**Files.**
- `packages/server/src/mud/lib/butchery/Muscle.ts` (`MuscleMixin`),
  `packages/server/src/mud/platform/idea/material/Muscle.ts` (the twin);
  `lib/mixin.ts` `Mixins.Muscle`; `api/mixin.ts` `isMuscle`.
- `Species.ts` — `tissueShares` + setter, `meatName` + accessors,
  `resolvedTissues()`, `tissueShareOf`, `partsCarrying`, the memo and
  its invalidation; `fieldMeta` entries.
- `base-library/content/stuff/idea/material/tissue/muscles/{shank,neck,shoulder,leg,belly,rib,loin,tenderloin}.yaml`.
- `species-and-names/.../BodyPlan/quadruped.yaml` — tissue lists per
  D3, shares summing to 1. The table the build authors (shares of body):
  torso bone .11 · neck .05 · rib .07 · loin .07 · tenderloin .015 ·
  belly .07 · animal-fat .06 · flesh .14; head bone .016 · flesh .04;
  each foreleg bone .02 · shoulder .05 · shank .015 · flesh .015; each
  hind leg bone .024 · leg .06 · shank .02 · flesh .015; heart .002 ·
  lungs .01 · brain .003 · spine .006 + .005 · liver .012 — the build
  balances the residue onto torso `flesh`.
- `check-anatomy.ts` clause (b).
- Tests: `lib/butchery/__tests__/Muscle.test.ts` (`work` range);
  `platform/idea/species/__tests__/Species.tissueShares.test.ts` — a
  target of `animal-fat: 0.30` on a plan whose fat is 0.06 scales fat
  ×5 and every other tissue by `(0.70/0.94)`, and the resolved sum is 1
  to 1e-9; a target naming a tissue the plan lacks is refused by the
  gate test over a synthetic row.
- `MaterialCatalogue` needs no change — assert in a test that a `Muscle`
  row is warmed (the reference-Ideas-inert trap, pre-empted).

**Acceptance.** `look`-free wave: the catalogue reports eight muscles
resident after boot; `lint:descriptors` passes (rename a keyword if it
collides); `lint:anatomy` (a)+(b) green.

**Commit.** `build(butchery W21): a muscle is a Material that WORKED —
eight named on the quadruped; the species restates a tissue's share`

### W22 — The cut claims; the carcass reduces; the yield can be a volume (kernel)

**Goal.** Everything the butcher will read exists and is tested in
isolation. **Decisions:** D4, D5 (state + augmenter), D9 (the read),
D10 (the yield shape), D7 (the texture read only).

**Files.**
- `lib/butchery/Cut.ts` (`CutMixin` + `textureAugmenter`),
  `lib/butchery/Texture.ts`, `platform/thing/Cut.ts`; `Mixins.Cut`,
  `MixinApi.isCut`.
- `Species.ts` — `ButcheryYield.yieldShape`, `DressedLine.tissues` +
  `litres`, `dressOut({liveKg, fleshPct, claims})`, `setButcheryYield`'s
  volume validation.
- `platform/thing/Corpse.ts` — `takenTissues`, `takenLines`, the six
  methods, and `carcassAugmenter`. ⚠ The augmenter must NAME the cuts
  still on the body, and a cut row is a Thing template — not resident,
  so `findByTemplatePath` finds nothing, and reading its raw
  `template.data` from a `look` is the `applyContainer` antipattern. So
  the yield LINE carries the word: `ButcheryYield.stem?: string`
  (*"loin"*, *"shoulders"*), authored beside `units`; absent ⇒ the cut
  path's last segment. The augmenter reads
  `getSpecies()?.getButcheryYield()` minus the two taken lists and
  renders the stems — no template resolution, no clone.
- `check-anatomy.ts` clauses (c), (d), (e).
- Tests: `lib/butchery/__tests__/Cut.toughness.test.ts` (a porterhouse
  over loin .25 + tenderloin .05 with shares .07/.015 reads .21 →
  `tender`; a shoulder reads `tough`; a bone heap reads `null`);
  `Species.dressOut.test.ts` (derived fraction = Σ shares × finish; a
  volume line returns litres; a claiming line with authored `fraction`
  is a gate finding); `Corpse.reduce.test.ts` (mark, has, augmenter text
  on whole vs reduced).

**Acceptance.** `lint:unconsumed-seams` does not rise (every new field
has a reader in this wave — the augmenters and `dressOut`); `lint:anatomy`
all five clauses green on shipped content (no cut rows yet, so (c)–(e)
are vacuous here and real in W24 — **stated**).

**Commit.** `build(butchery W22): a cut CLAIMS tissues — toughness and
mass derive; the carcass remembers what is gone; a yield can be a volume`

### W23 — `butcher`, two forms (trade-cooking)

**Goal.** The verb, the tools, the skill gate, the reduction, the blood
pour, the damaged cut, the gut. **Decisions:** D5, D6, D9, D10, D11,
D12, D13.

**Files.**
- `trade-cooking/content/trade/cooking/cmd/crafting/butcher.yaml` — args
  `cut`, `tools`, `vessel`; help text rewritten for the two forms and the
  three tools (*"A knife takes the boneless cuts and the offal. A saw
  takes a joint off the bone. A cleaver and a block take chops."*).
- `trade-cooking/src/idea/cmd/crafting/ButcherController.ts` — rewrite
  of the mint loop around `dressOut(…, claims)`:
  1. refusals as today, then resolve the yield;
  2. **exemplar read**: for each line, `StuffApi.clone(line.cut)` once;
     if `isCut`, read `getTissues()/getCutting()/getDifficulty()` into
     `claims`; the exemplar is unit 1 if the line is taken, destructed
     if not;
  3. `cut` word → the one line (D5) or all lines;
  4. per line: tool gate (D6) → skip-and-name or proceed; already-taken
     gate; skill gate (D11) → joint or trim; mint units with
     `dataOverlay` (D12), `setMass`, `ageAtKill`, contamination transfer,
     `spillGut` (gut at severity 1), damaged stamp (D9), place;
  5. volume lines → pour (D10);
  6. `corpse.markTissuesTaken / markLineTaken`; destruct only when every
     line is taken; scene lines name what came off, what became trim and
     why, what stayed and which tool it wants;
  7. block/blade/tools spilled on; `creditDeed`.
- Rows: `thing/{loin,tenderloin,rib,shoulder,leg,shank,neck,belly,chop}.yaml`
  (`class: /platform/thing/Cut`, `_materialPath` the muscle, `tissues`,
  `cutting`, `difficulty`, `mass` a nominal default the mint overwrites,
  keywords; `chop` claims `[loin, rib]` with `cutting: chop`),
  `thing/gut.yaml`, `thing/meat-saw.yaml`, `thing/cleaver.yaml`;
  `hanging-carcass.yaml` moved (D13); `generic-objects/.../stew-meat.yaml`
  + `base-library/.../food/stew-meat.yaml` → trim (D8);
  `base-library/.../food/gut.yaml`.
- `hearthworks/.../location/cookhouse.yaml` `props:` += saw, cleaver.
- `terminus/.../general-store/counter.yaml` — stock lines + prices for
  the saw and the cleaver.
- Tests (`trade-cooking/src/__tests__/butcher.*.test.ts`, the pack's
  vitest): knife-only leaves bone-in lines and says `saw`; `for loin`
  by an `untrained` hand yields trim and says why; a second `butcher`
  on the same body refuses the taken loin; the body is destructed only
  when every line is gone; a trauma at `body.leg.frontLeft` damages one
  shoulder; gut is contaminated at 1.0 whatever the band; a volume line
  with no vessel yields nothing kept and says so.

**Acceptance.** Drive steps 3–7 and 12 pass on the wire file's first
draft (W27 runs them); `lint:instrument-args` passes (three declared
args, no search); `lint:instanceable` inv. 7 passes for the moved row.

**Commit.** `build(butchery W23): butcher <body> [for <cut>] — tools gate
the depth, the hand decides joint or trim, the carcass reduces`

### W24 — The animals (trade-ranching)

**Goal.** The ewe, the cow and the sow yield named joints with
species-true shares. **Decisions:** D2, D4, D8, D10, D12.

**Files.**
- `.../ovis/aries.yaml`, `.../bos/taurus.yaml`, `.../suidae/sus/domesticus.yaml`
  — `butcheryYield` rewritten: claiming lines (`/trade/cooking/thing/
  {shoulder,leg,loin,rib,neck,belly,shank,tenderloin}` with `units` and
  `stem`, no `fraction`), the fat line (`suet` for ewe/cow,
  `/trade/ranching/thing/leaf-fat` for the sow — claiming
  `[animal-fat]`), `offal`, `hide`, `bone`, `gut`, the blood volume line;
  `tissueShares` (sow: `animal-fat: 0.30`, `belly: 0.10`; cow: `leg:
  0.14`; ewe: none — the plan's figure is a sheep's); `meatName`
  (mutton · beef · pork). The ewe's "which joints are worth naming"
  leaves out `tenderloin` (a sheep's is a mouthful); the cow names all
  eight; the sow names `shoulder, loin, belly, leg, rib` and the rest is
  trim.
- `trade-ranching/content/trade/ranching/thing/leaf-fat.yaml`;
  `trade-ranching/content/stuff/idea/material/food/leaf-fat.yaml`.
- `trade-ranching/package.json` — `"@saxonberg/content-trade-cooking":
  "workspace:*"` (the tanning precedent: the producer's rows name the
  consumer's class).
- `trade-ranching/src/__tests__/yields.test.ts` — each species' claimed
  tissues exist on the quadruped (gate clause (e) in the suite); a 550 kg
  cow's shoulder outweighs a 70 kg ewe's by the mass ratio × the shares
  (AC12 as arithmetic); the sow's fat line is leaf-fat and the ewe's is
  suet.

**Acceptance.** `lint:anatomy` (c)–(e) now non-vacuous and green; the
hen and the dog rows untouched; `trade-fishing`'s species untouched.

**Commit.** `build(butchery W24): the ewe, the cow and the sow yield
JOINTS — shares the species' own, blood in the pail, lard beside suet`

### W25 — The cooking law (kernel + trade-cooking)

**Goal.** Long moist heat rewards a tough cut; fast dry heat rewards a
tender one; `cook` can be told which cut. **Decisions:** D7, D8 (lard
render).

**Files.**
- `platform/idea/api/CraftingLogic.ts` — `applyMethodFit` + its call
  after `applyControlFloor` in `craftImpl`.
- `trade-cooking/content/trade/cooking/cmd/crafting/cook.yaml` — `target`
  arg; `CookController.ts` passes it.
- `trade-cooking/content/recipes/hearty-stew.yaml` — `holdS: 7200`;
  `render-lard.yaml`; `trade-cooking/content/trade/cooking/idea/material/lard.yaml`.
- Tests: `platform/idea/api/__tests__/CraftingLogic.methodFit.test.ts`
  (a `tough` cut through `hearty-stew` lands one band above the same cut
  through `hearth-roast`; a `tender` cut the reverse; a non-cut input is
  unmoved; two cuts of opposite texture net to zero); `trade-cooking`
  roster test asserts `hearty-stew.getAuthoredHoldS() > 0`.

**Acceptance.** Drive steps 8–10 observable through `look`'s *"It looks
…"* verdict; `pnpm test:near` over `platform/idea/api` green; no recipe
schema file touched (`lib/craft/Recipe.ts` unchanged — assert by diff).

**Commit.** `build(butchery W25): the cooking law — a tough cut wants
long moist heat and a tender one fast dry heat, read as one band of
grade`

### W26 — Nose to tail: casing, sausage, pudding, the shop (trade-cooking + terminus)

**Goal.** AC9–AC11, AC15. **Decisions:** D8.

**Files.**
- Recipes `scrape-casing.yaml`, `sausage.yaml`, `black-pudding.yaml`;
  rows `thing/{casing,sausage,black-pudding}.yaml`; materials
  `idea/material/{casing,sausage,black-pudding}.yaml`.
- `terminus/.../general-store/counter.yaml` — stock lines + prices for
  `/trade/cooking/thing/loin` (12) and `/stuff/thing/items/stew-meat`
  (3) — prime above trim (step 15). ⚠ If `rg -n stew-meat counter.yaml`
  shows the store already prices trim, keep that number and add the
  joint above it.
- Tests (`trade-cooking` vitest): a gut contaminated at 1.0 scraped into
  a casing keeps its loads; a sausage from that casing carries them; a
  pudding needs blood in a reachable vessel and refuses without
  (`insufficient-input: blood`); the sausage recipe does **not** match
  `offal` (the dog loaf's line is safe).

**Acceptance.** Drive steps 13–16; `lint:perishable` + `lint:pathogens`
green on the new rows.

**Commit.** `build(butchery W26): gut → casing → sausage, blood →
pudding, a joint priced above trim`

### W27 — The drive, the docs, the suite, the MR

**Goal.** Run the requirements' drive as a wire file; graduate the
knowledge; prove the tree once.

**Files.**
- `packages/wire/tests/butchery.dirty.wire.test.ts` (dirty: it drafts and
  kills out of two persisted herdbooks and buys the store's saw).
  ⛔ **RETIRED at the pre-merge sweep — it was MERGED into
  `carcass-chain.dirty.wire.test.ts`.** The two files could not both run:
  the wire suite boots one world for every file, dirty last in
  alphabetical order, so this one went first and the carcass drive ran
  into its leavings — two ewes down in one yard, every shared noun
  ambiguous, seven checkpoints red on a branch with nothing able to say
  so. ⭐ The fix is the one this build argues for: ONE BODY, taken apart
  in stages (AC6). Its three unique claims — the saw, the nameable cuts,
  the legible law — survive as checkpoints 7 and 7b there, with its
  regressions at the foot. Sixteen
  checkpoints mapping the drive 1:1, each **able to fail** (a body must
  exist before `look body` is asserted; a refusal must name `saw`). The
  cow is drafted at the campus farm
  (`/world/terminus/eternal/campus-farm/...` — the build reads the
  herdbook row for the yard's location). The wound (step 12) is driven
  through a wizard `eval` of `ConditionApi.inflict(t, { mechanism:
  'edge', site: 'body.leg.frontLeft', energy: 6 })` then
  `ConditionApi.die(t, 'wire: butchery 12')` — the carcass drive's own
  seam. Regression checkpoints for AC13: `butcher` a carp from the
  fishing drive's water yields a fillet; `cook dog-loaf` still bakes;
  `tan` and `grind` still answer.
- `docs/subsystems/butchery.md` — new: the share model, muscles,
  cuts, the two forms, the tool and skill gates, the law, the products,
  `lint:anatomy`. One-line pointer added to `CLAUDE.md`'s map **by the
  sweep, not this wave** (index files are swept, not raced).
- `docs/subsystems/spoilage.md § Hosts` table += `Cut` (a `Provision`),
  `MeatSaw`/`Cleaver` are `KitchenTool` (already listed);
  `crafting.md` gains the `applyMethodFit` paragraph beside
  `applyControlFloor`; `ConsumableMaterial.ts` header sentence corrected
  (grounding); `mortality.md § The corpse` += the reduction;
  `vitals.md` already edited in W20; `race.md § Material` += the
  `Muscle` subclass.
- Plan `§ Drive record` appended with the run output; MR !334
  description updated (this build's scope added under its own heading).
- `pnpm test` once, here, before the MR description is updated — and
  the number cited.

**Commit.** `drive(butchery): sixteen checkpoints through the socket —
and what they found` then `docs(butchery): the subsystem doc; vitals,
spoilage, crafting, mortality updated`.

---

## Reachability wiring

Each link fails closed and silent; each is named.

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| `butcher <body> for <cut>` | `butcher` (exists; `verbs: [butcher]`) | `ButcherBlock.commandContributions` (shipped) — the block is where you learn it; a knife in a field still works (controller more permissive than affordance, the `wash` rule) | cut rows (W23) + yield lines naming them (W24) + `stem` on the line | species warmed by `preloadAnatomy` (shipped); cut rows are cloned, never looked up; muscles warmed by `MaterialCatalogue` (asserted W21) | `cut` is a string — no mixin gate; matched against the species' lines, refused in words |
| tool depth | same verb | same | `meat-saw`/`cleaver` rows with `capabilities`; stocked (store) and placed (cookhouse) | rows are Thing templates — cloned by `props:`/stock reset, nothing to warm | `tools` arg `requires: [ToolMixin]`, default `reachable:[mixin.ToolMixin]`; `block` arg shipped |
| blood pour | same verb | same | the species' `volume` line; `tissue/blood` material (shipped) | material warmed by the catalogue | `vessel` arg `requires: [BulkableMixin]`, optional — absent ⇒ spilled and said |
| reduced carcass in `look` | `look` (shipped) | n/a | `Corpse.takenTissues/takenLines` + `ButcheryYield.stem` | `markupAugmenters` is a class static read by `Visible` (shipped) | none |
| texture in `look` | `look` | n/a | `Muscle.work` + `Cut.tissues` + `_speciesPath` stamp | as above | none |
| the cooking law | `cook <dish> [from <cut>]` | `CookPot`/kitchen affordance (shipped) | `medium`/`holdS` on recipes (`hearty-stew` edited) | `RecipeCatalogue` (shipped) | `target` arg `requires: any` + `canReach` (the `cure` shape) |
| casing / sausage / pudding | `cook scrape-casing` · `cook sausage` · `cook black-pudding` | kitchen (shipped) | three recipes (the `recipes` document kind the pack already installs) + rows + materials | `RecipeCatalogue` + `MaterialCatalogue` | the knowledge gate `requireDeed` → `CraftingApi.canMake` (shipped; `difficulty: standard` so a competent hand can) |
| lard vs suet | `butcher` + `cook render-lard` | as above | `leaf-fat` row/material (ranching), `render-lard` + `lard` material (cooking) | catalogues | `category: leaf-fat` vs `suet` — tags, no gate |
| damaged cut | `butcher` | as above | the Trauma slice (shipped mint) | n/a | none |
| `lint:anatomy` | n/a | n/a | the six plan rows, the species overrides and yields | runs by name in `lint:family` | n/a |

---

## Acceptance-criteria coverage

| AC | satisfied by |
|---|---|
| 1 differently named joints; the animal is readable | W21 (muscles), W23 (cut rows, `meatName` stem at mint), W24 (per-species lines) |
| 2 two cuts read differently, about texture | W22 (`textureAugmenter`), W23 (stamp) |
| 3 same cut, two methods, two outcomes, texture predicts | W25 |
| 4 a player predicts without a table | W25 + the help text in W23 (the law in one sentence) |
| 5 knife-only told, in words, what wants a saw | W23 |
| 6 partial breakdown, leave, return | W22 (state), W23 (destruct only when empty) |
| 7 unskilled → trim; skilled → joint | W23 (D11) |
| 8 wound → damaged cut from that part | W22 (read), W23 (stamp), W27 (driven) |
| 9 sausage from gut, trim, fat; nothing conjured | W23 (gut line, trim), W24 (gut on species), W26 |
| 10 black pudding from blood | W22 (volume line), W23 (pour), W24 (line), W26 |
| 11 lard and suet distinguishable, different uses | W24 (leaf-fat), W25 (`render-lard` → `lard`, not `tallow`) |
| 12 a bullock's joint heavier, no number authored twice | W20–W22 (shares × live mass), W24 (test), W27 (driven) |
| 13 nothing stops working: fish, loaf, hide, bone | W20 (fixtures), W24 (fish/hen/dog untouched), W27 (regression checkpoints) |

Drive step 15 (a joint costs more than trim) and 16 (fat reads
differently) are W26 and W24/W25 respectively. **No AC is unmapped.**

---

## Test & gate strategy

- **Unit (per wave, `pnpm test:near` + the pack's vitest):** the share
  setter and gate (W20); the species resolver arithmetic (W21);
  toughness, dressOut, corpse reduction (W22); the controller's seven
  branches (W23); the species tables (W24); `applyMethodFit` (W25); the
  casing/sausage/pudding chain and the dog-loaf non-collision (W26).
- **Only the drive proves:** that `look` says texture in words a player
  reads (AC2), that the refusal names the saw (AC5), that a dish's
  verdict line moves (AC3), that a bullock's joint reads heavy (AC12),
  and the four regressions (AC13). The wire file is the drive and lands
  in the suite (`lint:drive-scripts` holds `drive-*.ts` at zero).
- **Gates:** the derived roster, every commit. `lint:anatomy` is the one
  added. `lint:unconsumed-seams` is watched at W22 (new fields) and
  `lint:lib-statics` at W22 (`Texture`).
- **`pnpm test` runs once**, at W27, before the MR description is
  updated; the `/finalize` sweep runs it again. Nothing in between
  (`full-suite-once-at-finalize`).

---

## Risks & opens

1. ⚠⚠ **The fixture sweep (W20) is the build's riskiest hour.** 33 files;
   any fixture that asserts an absolute mass (not a ratio) breaks. The
   normaliser preserves ratios; the build greps `expect(.*mass` near
   `tissues` before running it, and fixes by hand what it finds.
2. ⚠ **`lint:descriptors`** may reject `rib`, `leg`, `neck` as material
   keywords if a descriptor bank uses the word. Fix the keyword list on
   the muscle row (`keywords: [loin-muscle]`), never the bank.
3. ⚠ **The knowledge gate.** `requireDeed` → `canMake` refuses a recipe
   above the maker's seeded band (`seedRunFor`). The drive runs as a
   wizard and the carcass drive already cooks, so the precedent holds;
   if `cook sausage` refuses a fresh character, that is the shipped
   progression UI, not a defect — the drive asserts the refusal names the
   recipe.
4. ⚠ **`cook` with a `target`** prefers the named cut for *any item slot
   it satisfies*; a stew with a `meat` slot takes the shoulder. If a
   second shipped recipe has two item slots a cut could fill, the
   preference lands on the first — acceptable and stated.
5. ⚠ **Blood with no vessel** is lost on the floor. The drive brings a
   pail (bought or borrowed from the yard); the first run will say if the
   yard has none, and the fix is a `props:` row, not code.
6. **`Species.resolvedTissues` memo** must invalidate on plan HMR; the
   build ties it to `setTissueShares` and to the plan singleton's
   identity (compare `getBodyPlan()` by reference each read — a cheap
   check, no listener).
7. **The campus farm's cattle** — drafting there needs the yard's
   location path and a herdbook in reach; the build reads
   `campus-farm/thing/herdbook.yaml` and its location row before writing
   the checkpoint. If `draft` is afforded only by the flock book class at
   Hearts Delight, the cow checkpoint is driven through the hanging
   carcass instead (a hog, counted) and **AC11's cow half is reported as
   not driven** — surfaced, never silently passed.
8. **Stop and ask only for:** a `lint:lib-statics` ceiling breach that
   cannot be absorbed by folding `Texture`'s statics onto `Cut` (the
   compliant path exists and the build takes it), or a descriptor-bank
   collision whose only fix is renaming a shipped bank.

---

## Deferred seams

Each leaves as a slate line, not a plan section.

- **Poultry cuts** — the biped plan names no muscles; the hen stays on
  trim + offal. → `butchery-tail-slate` (new): *name the biped's muscles
  or move gallus to `avian` and name those.*
- **Species-adjusted `partArea`** — surface fraction and the depth ladder
  read plan shares; a fatter species' belly is not a bigger target. →
  `butchery-tail-slate`.
- **Dry-aging on the hook** (`hanging-carcass`, `meat-hook` with
  `airExposure: 1`) — the carcass reduces and hangs; nothing yet rewards
  the wait. → `butchery-tail-slate` (named by the requirements).
- **Trimming as its own verb** → same slate (named by the requirements).
- **Meat inspection / the shambles ordinance** → the governance limb
  (requirements lens 7); the contamination band is the measurement.
- **A named dead pet's body is butcherable** — the shipped seam
  (`ButcherController`'s `isAlive()` guard on the name check) is
  unchanged by this build. → `pets-slate`.
- **`Material.toughness` vs `Muscle.work`** — two axes that a bite
  (`blunt` on flesh) could one day relate. → `materials-response-slate`.
- **`ConsumableMaterial`'s fixed-vocabulary sentence** — corrected at the
  sweep; the doctrine survives with its test sharpened (*rows differ when
  a substrate-read property differs*).

---

## Critical files

Read first, in this order:

1. `docs/requirements/butchery-requirements.md`
2. `packages/server/src/mud/platform/idea/species/BodyPlan.ts` (all)
3. `packages/server/src/mud/platform/idea/species/Species.ts` l.40–112,
   820–900, 917–965, 1030–1130, 1320–1332
4. `packages/content/species-and-names/content/stuff/idea/species/BodyPlan/quadruped.yaml`
5. `packages/content/trade-cooking/src/idea/cmd/crafting/ButcherController.ts`
   + `packages/content/trade-cooking/content/trade/cooking/cmd/crafting/butcher.yaml`
6. `packages/server/src/mud/platform/thing/Corpse.ts`,
   `packages/server/src/mud/platform/thing/Provision.ts`
7. `packages/server/src/mud/lib/material/Radioactive.ts` (the subclass
   pattern), `packages/server/src/mud/lib/material/Freshness.ts` l.155–190
   (the augmenter pattern), `packages/server/src/mud/lib/craft/Grade.ts`
8. `packages/server/src/mud/platform/idea/api/CraftingLogic.ts`
   l.2309–2470 (`craftImpl`), l.2050–2065 (`applyControlFloor`),
   l.1479–1560 (the tangible transform)
9. `packages/server/src/mud/lib/husbandry/Producing.ts` l.797–823
   (`pourTake`)
10. `packages/content/trade-ranching/content/stuff/idea/species/animalia/chordata/mammalia/artiodactyla/{bovidae/ovis/aries,bovidae/bos/taurus,suidae/sus/domesticus}.yaml`
11. `packages/content/trade-cooking/content/recipes/{hearty-stew,hearth-roast,render-tallow,salt-cure}.yaml`,
    `packages/content/trade-baking/content/recipes/dog-loaf.yaml`
12. `packages/wire/tests/carcass-chain.dirty.wire.test.ts` (the drive
    precedent — `Session`, `say`, `ensureDaylight`, the `eval` seam)
13. `packages/server/scripts/check-instanceable-placement.ts` (inv. 12),
    `check-perishable.ts`, `check-mass.ts` (the gate shape to copy for
    `check-anatomy.ts`)
14. `docs/subsystems/{vitals,spoilage,crafting,mortality,templates}.md`
    — the sections cited in Grounding

---

## Drive record

*(appended at build time)*

---

## ⭐⭐ Re-planned in place (user, during plan review): hens now, and cattle at Hearts Delight

Two scope items the plan had deferred. Both got **cheaper and better**
than the deferral assumed, because the tree already held most of it.

### D14 — The hen is on the HUMAN body plan, and that is the real defect

⚠⚠ `gallus/domesticus.yaml` names `_bodyPlanPath:
/stuff/idea/species/BodyPlan/biped`. So a chicken currently has
`body.arm.left.hand`, `body.torso.liver`, `body.torso.spine.upper` and
`.lower` — **and no wings.** "Poultry stays on trim" was never the
problem; the hen is wearing a person's anatomy.

⭐ `avian.yaml` already exists and is well built (`body.wing.left/right`
with `serves: [locomotion]`, heart and lungs `governs`), its row path is
already the commons path, and **its own docstring pre-authorises the
move**: *"a later build that gives the skeleton a permanent home moves the
file and edits one title claim, with no path changes and nothing to
migrate."* It lives in `trade-mining` because the canary needed it.

⭐⭐ **And W20 is what makes it reusable.** `avian`'s masses are
canary-sized (4 g of torso bone); as **shares** one plan serves a 20 g
canary and a 2 kg hen, with mass coming from the species. A concrete
payoff for the share model that the plan had not claimed.

**Decision:** move `avian`'s file to the species commons
(`species-and-names`, beside `biped`/`quadruped`/`sessile`), editing the
one title claim its docstring names. Path unchanged, nothing migrates.

### D15 — White meat vs dark meat IS the work law, and it needs no new field

⭐⭐⭐ **The best teaching case in the build, and we were about to ship
without it.** A chicken's breast is pale because it never flies; a duck's
is dark because it does. That is `work` → fibre type → colour → cooking
method, and it is the one instance of this law every player has already
seen in a kitchen.

⚠ It forces a question D3 did not answer: can two species' same-named
muscle differ in `work`? A chicken's and a canary's breast must.

**Rejected:** a `Species` tissue-*substitution* map (identity swapping is
not share overriding, and it is a new mechanism for one case).

**Decided — a second avian plan, because the two birds genuinely have
different bodies.** `avian` stays the **flying** bird (canary now, duck or
goose later): red breast, high work. A new **`fowl`** plan is the
flightless domestic bird: **white breast (low work), dark thigh and
drumstick (high work)**, wings that do not `serve: [locomotion]`, no
hands. The hen names `fowl`.

⭐ So the law is expressed **structurally**: the plan that can fly has a
red breast and the plan that cannot has a white one. No new field, no new
mechanism, and the fixed-vocabulary doctrine is satisfied on its own test
— white and red fibre differ in myoglobin, macros and cooking response,
which is *"kinds that differ in substrate-read properties."*

**Hen cuts** (W24): breast (white, low work), thigh, drumstick, wing,
plus the shipped offal. ⚠ A hen is a **counted** line — `kgEach: null`,
the row's authored mass stands — which `dressOut` already handles.

### D16 — Cattle at Hearts Delight: a working ox pair on the flats

⚠ The flock book argues against cattle **on the bench**, in its own prose:
*"Thin dry ground is sheep country… a dairy cow asks you twice a game day;
a flock asks for lambing and shearing, twice a year, hard."* Dropping a
dairy herd on the upper bench would contradict authored reasoning the soil
rows produced — so the siting needs an argument, not just a row.

⭐ **`trade-ranching/content/trade/ranching/agent/ox.yaml` already
exists**: a 700 kg `Livestock` of `bos/taurus`, handling 0.8, *"a deep red
ox with a yoke-worn patch across the shoulders"*, whose docstring says
draught power **is** body mass and that it eats whether or not it works.

**Decided:** a **pair of working oxen on the flats**, filed as a second
`Herdbook` row owned by the same farm business, with the plough as the
reason they are there. ⭐⭐ **The beef is what happens when an ox is
done working** — which is how pre-modern beef actually happened, feeds
lens 4's *kill young or old* choice directly, and means the farm does not
need a beef herd to put a bullock on the block.

⭐⭐⭐ **And the ox is the muscle model's best authored gift.** Its
*"yoke-worn patch across the shoulders"* was written before any of this:
the hardest-worked muscle in the game is on the animal whose shoulder the
prose already describes as worn. So its shoulder is the toughest cut in
the world and its loin — which does nothing — is the prize. Nobody
authored that; the ox row did.

This closes the plan's own open item (*"no cattle at Hearts Delight, drive
step 11 borrows the campus farm"*): the cow half of the drive now runs on
the valley farm, so **AC1 and AC12 are fully driveable locally** and
nothing is reported as un-driven.

### Wave changes

- **W21** also moves `avian` to the commons and adds the **`fowl`** plan
  (white breast / dark leg), and points the hen at it. ⚠ Its acceptance
  gains: *a hen has wings and no hands.*
- **W24** also authors the hen's cuts and the **ox pair's herdbook row**
  at Hearts Delight (flats, plough, same farm business).
- **W27**'s drive gains: butcher a hen → **a white breast and dark
  legs**, and the reason stated in words; and the ox's shoulder reads as
  the toughest thing in the valley.
- The deferred "poultry → butchery tail" entry is **struck**.

### Still deferred, with destinations

- **Feathers and down** (a hen's other product) → the butchery tail; the
  plausible sinks are bedding and fletching, and neither is checked yet.
- **Duck or goose** as the flying-bird foil that makes the white/dark
  contrast visible on one table → the same tail. The `avian` plan is ready
  for it, which is the point of keeping the two plans apart.

### D17 — Fish: already done, and the law generalises without a special case

Asked during plan review: *"what about fish, do we have to talk about
cleaning fish or is that already done?"*

**Already done, and it is the precedent the land chain should have
copied.** `trade-fishing`'s species author real per-species cuts
(`/trade/fishing/thing/fillet`, `roe`, plus the shipped `offal`), so
`butcher <fish>` has given named products since the fishing build. The
land chain was the outlier, not fish.

⭐ **And fish already spoil faster, honestly**: `food/fish-flesh` carries
`spoilActivationEnergy: 60000` against `tissue/flesh`'s `80000`, so the
shipped Arrhenius clock makes a fillet go off sooner than mutton with
nothing special-cased.

⭐⭐ **The work law covers fish with no fish branch.** Fish muscle is
almost entirely white fast-twitch in myomeres, with very little
connective tissue, and fish collagen gelatinizes at a far lower
temperature — which is *why* a fillet cooks in minutes and flakes where a
shoulder braises for hours. So fish sit at the **tender end of the same
scale** the ox's worked shoulder anchors at the tough end. One law, two
ends, and the contrast is the clearest demonstration of it available.

⚠ **The one real gap:** `BodyPlan/fish.yaml`'s torso names generic
`/stuff/idea/material/tissue/muscle` — the same material cattle name. If
generic muscle carries a single `work`, a trout and a bullock have
identical muscle and the contrast collapses. **Decided:** the fish plan
names a new `tissue/muscles/fish` (white, the lowest `work` in the game);
the `fillet` row keeps its `food/fish-flesh` material, exactly as a
mammal cut keeps a food material while its `tissues[]` claim muscles. The
two layers stay the same two layers.

**Not modelled, deliberately:** *cleaning* (gutting and scaling) as an act
distinct from filleting. Gutting promptly really does slow spoilage — but
by the fidelity rule this plan already adopted, **a second verb for it
earns nothing a player would care about**, and the tool-gated depth model
already says a fish needs nothing beyond a knife. → the butchery tail, if
a fishmonger ever wants it.

⚠ **W20 must convert the `fish` and `crustacean` plans too** — their
masses are absolute like every other plan's (fish torso muscle 0.5 kg).
With `fowl` added, that is **seven** shipped plans, not six. And AC13
(*fish still fillet*) holds **by construction** of D4: `fraction` derives
only where a muscle claim exists and stays authored otherwise, so fish
keep their authored units and masses untouched.

### D18 — Blood spills silently when nobody brought a vessel

The fork the requirements left unnamed, decided by the user in plan
review: `butcher` does **not** refuse or warn for want of a vessel. The
blood line is simply lost when no vessel is present.

⭐ It is the more diegetic answer — blood on the floor is what actually
happens — and it makes the black pudding **something you only get if you
came prepared**, which is a choice rather than a chore. ⚠ Deliberately
*unlike* the milk rule's refusal: milk is a tap on a living animal you
can come back to, and a carcass is a one-time event, so a refusal there
would be a nag about something already irreversible.

---

## Wave notes (build time)

### ✅ W20 — DONE (`90218313d`)

Tissue mass is a `share`; `setBodyParts` refuses a `mass` key **by name**;
`partArea` is `(Σ share)^(2/3)`; new gate `lint:anatomy` clause (a)
(64 gates → 65, nothing enumerated); `vitals.md` § Anatomy rewritten; dev
DB dropped.

⚠⚠ **D1's conversion rule was WRONG and is re-planned in place.** It said
divide by each `tissues: [...]` literal's own total — but the dominant
fixture shape is ONE TISSUE PER PART, so that makes every part `share: 1`
and destroys the ratios **between** parts, which is exactly what
`partArea` and `getPartSurfaceFraction` read.
`ConditionLogic.limp-coverage`'s 3 : 8 : 0.8 would have become 1 : 1 : 1,
silently. The rule is **one uniform divisor per file**: a single scale
factor preserves every ratio — within a part, between parts, and between
two plans in one file — and the resolver normalises per plan anyway.

⚠ A hazard I made: the first sweep's regex matched only single-quoted
paths, so a second pass over the double-quoted ones recomputed each file's
divisor from the REMAINING sites — two divisors in one file. Reverted all
32 fixtures, one clean pass, 90 sites. Verified the 8/3 ratio is still
2.667.

⚠ `sessile` has no tissues at all, which D1 did not anticipate: clause (a)
exempts an EMPTY plan (a plant has nothing to weigh) and not a partial
one.

### ✅ W21 + W22a — DONE (`7115033a4`), and they land TOGETHER

`MuscleMixin` + eleven rows + `CutMixin` + `Texture` +
`Species.resolvedTissues()`; `avian` moved to the commons; the new `fowl`
plan; the hen repointed off `biped`.

⭐ The quadruped's muscle shares total **exactly 0.400**, reproducing the
`fraction: 0.40` the sheep's yield table had authored by hand — the
derivation agreeing with the hand-authored number is the best evidence
the share model is right.

**Three gates moved my hand, all correctly:**
1. `lint:instanceable` — rows copied `chemistry: null` and
   `longDescription` from `flesh`; neither is a `Material` field. Keys
   dropped, no ceiling raised.
2. `lint:lib-statics` — `Texture`'s four statics would have grown a
   fall-only ceiling. It is a **constructed value object** now, zero
   statics, which is the `Light`/`Quantity` shape anyway.
3. ⚠⚠ `lint:unconsumed-seams` — **`Species.tissueShares` is DEFERRED to
   the wave whose butcher reads it.** An authored field whose only reader
   is a derived method in its own file is a seam one wave early, and the
   gate excludes tests from the consumer walk (correctly). **That is the
   third time today** this rule has moved my hand — `getDecayStage` had
   no reader for its whole life, `partArea`'s callers I mis-grepped, now
   this. The written-and-tested override sits in the scratchpad
   (`deferred-tissueShares.test.ts.txt`) for **W24**, and clause (b) is a
   named stub so the clause list stays the gate's contract.

⚠ **This is why W21 and W22a are one commit**: the field and its reader
ship together or the gate is lying to the next person.

⭐ My test caught a real resolver defect the plan's D2 formula had: a
target naming a tissue the plan lacks was not inert — it **shrank the
whole animal by the target's size** (fat 0.06 → 0.048, the body summing to
0.8), silently breaking sum-to-1. Unresolvable targets are skipped
entirely now, and that fix travels with the deferred field.

### Remaining

W22b (`dressOut` claims + carcass reduction + volume yield) · W23
(`butcher` two forms) · W24 (the species: cuts, the hen's, the ox pair at
Hearts Delight, and `tissueShares` with its reader) · W25 (the cooking
law) · W26 (casing/sausage/pudding) · W27 (drive, docs, the one full
suite).

## Drive record

`packages/wire/tests/butchery.dirty.wire.test.ts`, five runs against
four worlds. ⚠ **This record is historical**: the file was merged into
`carcass-chain.dirty.wire.test.ts` at the sweep, so the invocation below
no longer resolves — run the carcass drive instead. The 8/8 it reports
was true of this file ALONE, which turned out to be the whole problem.

```
pnpm --filter @saxonberg/server reset:db
WIRE_BOOT=1 WIRE_PORT=2014 WIRE_FRAME_TIMEOUT=90000 \
  pnpm -C packages/wire exec vitest run tests/butchery.dirty.wire.test.ts
→ Tests 8 passed (8)   exit=0
```

### ⭐⭐ Green through the socket

| # | checkpoint | |
|---|---|---|
| 1 | the yard has a flock book and a block | ✓ |
| 2 | ⭐⭐ `draft` takes a head out and `slaughter` leaves a **body** | ✓ |
| 3 | ⚠⚠ a knife-only butchering **names the saw** — the refusal is the UI | ✓ |
| 4 | ⭐⭐⭐ and the **carcass is still there**, joints on it | ✓ |
| 5 | ⭐⭐ several named goods on the ground, not one generic lump | ✓ |
| 6 | ⭐⭐⭐ **a cut says what it wants in the pot, in words with no number** | ✓ |
| 7 | the flock book still reads and the tally fell | ✓ |
| 8 | ⭐⭐⭐ `butcher` refuses a person, and the world says why | ✓ |

⭐⭐⭐ **Checkpoint 6 is the build.** A cut off a real carcass, looked at
through a real socket, reads as *grain · sinew · coarse · firm · will not
be hurried* — a texture, with no figure anywhere in it. That is the law
being legible, which is the one thing no unit test can tell you.

⭐⭐⭐ **And checkpoint 8 is better in the world's words than in mine:**
*"You put the knife away. Whatever else a human is now, it was somebody —
and there is no cut of meat on this earth worth the road that starts
here."*

### ⚠ What the drive found — five runs, and it earned its keep twice over

1. ⚠⚠⚠ **`details` is a persistent `Map`, and a Map does not survive a
   JSON round trip.** A restored `Detailed` host comes back with a plain
   object, so `getDetailIds` throws *"details.keys is not a function"* and
   `getDetailEntries` sails past its `details.size === 0` guard (an
   object's `.size` is `undefined`, which is not `0`) and throws
   *"details is not iterable"*. ⚠ The thrower is in the **resolve path**,
   so ONE restored thing in a room breaks `look` and every argument
   resolution for everybody in it — which is why run 4 could not get past
   checkpoint 1 on a freshly dropped database.
   ⭐⭐ **The carcass chain had already recorded this as pre-existing and
   not chased it** (`Tootie "sense" → controller-error(details is not
   iterable)`). It stopped being somebody else's problem when it blocked
   this build's exit criterion. Normalised in `detailRoot()` — the one
   door every reader goes through — idempotent and in place. ⚠ The deeper
   fix is a **marshaller** for the field so the Map round-trips instead
   of being rebuilt on first read; that is a persistence change with its
   own blast radius and it is a deferred seam, not something to smuggle
   into a butchery build.
2. ⚠⚠ **`analyze sky` is broken by the same defect**, which is how it was
   found: the drive's `ensureDaylight` asked the sky and got *"Couldn't
   resolve 'tool' (resolve): details.keys is not a function"*.
3. ⚠⚠⚠ **The carcass drive's `ensureDaylight` was STILL vacuous**, one
   level below the vacuity it had already fixed. It asked *is it not
   night*; in a dark room `analyze sky` refuses, the answer matches
   neither word, `night` reads false, and the helper returns **swearing it
   is day**. Seven checkpoints then failed as a cascade off one unlit
   room. ⭐ Fixed twice: first by demanding the word `daylight` (positive
   evidence), then by asking the **room** instead of the sky — because
   what this file needs is to be able to SEE, not to know the hour, and
   *"pitch dark"* is the failure it actually guards against.
4. ⚠ **`butcher` lays the cuts on the FLOOR**, not in your hands — the
   carcass drive's finding 7, which my first checkpoint had forgotten and
   asserted against `inventory`.
5. ⚠ **A bare `look` renders the room to the CARD** and returns empty
   prose — the textiles build's recorded finding — so the replacement
   checkpoint asserted nothing at all until it probed cuts **by name**.
6. ⚠ **Asserting on the shape of prose rather than its subject**, again:
   the person-refusal pattern was `/cannot|can't|not/` and the world's
   actual sentence contains none of them.

### ⚠ Not driven, with reasons

- **The cow half.** The valley has an ox pair now, but droving is still
  not expressible, so a 700 kg ox cannot reach a block. AC12's arithmetic
  is proven in `trade-ranching`'s suite off the shares — a better proof
  than one weighing, since it shows no number is authored twice.
- **The sausage end to end.** `scrape-casing` → `sausage` is a
  three-input craft; the drive's hand has the gut but not grain and a
  second fat in one session. The recipes' slots and the casing's load are
  pinned in `trade-cooking`'s suite.
- **The cooking law's outcome through a dish.** `look`'s verdict on a
  stewed shoulder needs a pot, a fire and a vegetable; the law itself is
  pinned on both halves (classification and fit) in the kernel suite.

### ⭐ The dirty reason is a question for a trade

**Nothing in the valley sells a saw.** The general store three miles away
stocks one, but the farm that keeps the sheep has no way to take a joint
off the bone without a trip to town — either a real constraint worth
keeping or a missing line on a farmstead's shelf. A finding for
`ranching-slate`.
