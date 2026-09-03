# Cooking — implementation plan

**Input:** [cooking-requirements.md](../requirements/cooking-requirements.md)
(closed scope — 13 surface decisions, AC1–AC15; this plan is the HOW).
W0 is absorbed from the
[spoilage design pack](../slates/builds/spoilage-design-pack.md) **as
designed**; rationale lives in the
[cooking slate](../slates/builds/cooking-slate.md) (Parts 1–10). Read
alongside: [crafting.md](../subsystems/crafting.md),
[metabolism.md](../subsystems/metabolism.md),
[thermal.md](../subsystems/thermal.md), [bulk.md](../subsystems/bulk.md),
[fire.md](../subsystems/fire.md), [senses.md](../subsystems/senses.md),
[advancement.md](../subsystems/advancement.md),
[content-packs.md](../subsystems/content-packs.md).

**Build discipline:** one MR. Per wave: `pnpm test:near` + every touched
pack's own vitest + the full lint family. ONE full `pnpm test` before the
MR opens and one at `/finalize` — nothing in between. No migrations —
content edits + drop the DB. Stage by name; push every turn. Branch:
`build/cooking`.

⚠ **Post-OO-sweep vocabulary everywhere** (landed 2026-09-03):
`ThermalApi` is retired; the heat gate is
`MixinApi.isThermal(maker) ? maker.reachableHeatK() : 0` (verified live at
`CraftingLogic.ts:1344` and `:1529`). Verbs live ON objects. Every surface
below was verified against current source this cycle, not against docs.
Where a subsystem doc still speaks the pre-sweep shape, W3 fixes the doc.

---

## Grounding (facts verified this cycle — file refs current at plan time)

- **`WetMixin`** (`packages/server/src/mud/lib/wetness/Wet.ts`, 270
  lines) is the skeleton to copy: two persistent scalars
  (`_saturation` + `wetnessClockStamp`), reconcile-on-read with reentry
  guard, `dial()` over `AppSettingKeys` with seeded-literal fallbacks,
  `markupAugmenters` band line, `WorldClockApi.getNow()` null-when-idle.
  Composed universally at `lib/stuff/Thing.ts:52` (and `Agent.ts:24`).
  The two divergences the pack orders: **drop the far-past guard**
  (`Wet.ts:192` — food rots over the full absence) and **don't copy the
  linkdead freeze** (`Wet.ts:181` — an item has no Interactive).
- **`ThermalMixin`** (`lib/thermal/Thermal.ts`): stamped-K + clock-stamp
  + cached ambient (`lastAmbientK`), sync `getTemperature()`. NOT on
  `Thing` by default. Food-item classes today: `Prop` = bare `Thing`
  (`platform/thing/Prop.ts` — stew-meat, root-vegetables, ration-stock
  rows), `Provision` = `Crafted(Detailed(Thing))` — **neither is
  Thermal** (AC3's "composed where it was missing").
- **`Material`** (`lib/material/Material.ts`): `boilingPoint` /
  `meltingPoint` Quantity<'K'> fields with fieldMeta + accessor pattern
  (lines 385–441) — `smokePoint` mirrors these. `toxicity: ToxinTag[]`
  at :489. No spoilage constants, no `waterActivity` — both new.
- **The ingest rung** (`lib/metabolism/Metabolic.ts:997`):
  `payload?.toxicity ?? material.getToxicity()` — per-instance shadow
  confirmed live. `ToxinTag = { type, amount }` (:62). `vomit()` +
  involuntary cascade at :895–:905. Ptomaine Condition seed:
  `packages/content/platform/content/platform/idea/Condition/metabolism/ptomaine.yaml`
  (bands 2/6/12, `clearanceRate` — AC14's calibration target); the one
  shipped ptomaine food: `base-library .../food/spoiled-ration.yaml`
  (authored dose 700).
- **`BulkPayload`** (`lib/bulk/Bulkable.ts:109`): `name / nutrients /
  nutrientAmounts / toxicity / edible / tags?` — no freshness fields
  yet. `BulkableLogic.transfer` (:298–:313): payload identity rides into
  an **empty** destination only; "blend merging is out of scope" —
  the mass-weighted load blend lands exactly there.
- **Craft-resolve** (`platform/idea/api/CraftingLogic.ts`, 1774 lines):
  - `craftImpl` (:1288–1473): gather → slots → tools → heat gate
    (:1344) → grade → **output form fork** (:1393): `bulk` claims via
    `claimGlass` (kind-match on `category`, `no-glass` decline);
    `tangible`/`edible` still **clone** (:1405) — the exact line the
    dinnerware unification rewrites.
  - `applyEdibleOutput` (:798–835): authored `outputMaterial` → fill,
    **no payload written** (so the authored row's own toxicity governs);
    derived → `GENERIC_COOKED_MATERIAL`
    (`/platform/idea/material/cooked`) + `deriveBlendPayload` (:564),
    which **sums input toxin doses** (alcohol honestly carried — the
    kill must be selective, P4).
  - By-hand: `matchBuild` (:914 — heat gate `requiresHeatK ≤ heatedToK`,
    most-heat-demanding wins) → `mintVessel` (:1178 — fills the
    **supplied** vessel; requires it Bulkable + Crafted).
  - `PoolGlass` duck-type (:186) — the kernel never names `CraftVessel`.
- **`CraftVessel`** (`platform/thing/CraftVessel.ts`):
  `Crafted(Thermal(Bulkable(Container(Detailed(Thing)))))`; `soiled` gated
  by `SoiledWriters` (CraftingLogic + **the two Hydrator arms — the
  logged-out-lockout lesson in the comment at :64; `Dish` inherits this
  gate and its `lint:gates` cover**); `wash()`, `isClaimable()`,
  `category` on `BulkableMixin` = the vessel kind.
- **`Dish`** (`platform/thing/Dish.ts`):
  `Crafted(NutritionLabel(Bulkable(Detailed(Thing))))` — a parallel
  implementation; no `soiled`, no Thermal, no Container, no wash. The
  plated-dish row: `generic-objects/content/stuff/thing/items/plated-dish.yaml`.
- **`CookPot`** (`trade-hearth-cooking/src/thing/CookPot.ts`):
  `Crafted(ManualBuild(Tool(Durable(Detailed(Thing)))))` — **not
  Bulkable** (P5's fork), capability `pot`, `commandContributions` list
  the pack's `cook`/`plate` views by pack-relative path (rename
  dependents).
- **Recipe** (`lib/craft/Recipe.ts`): `fromData` validation throws at
  read; fields incl. `requiresHeatK`, `outputApplication`,
  `outputPortionL`, `outputMaterial`. No `medium`. Wet recipes have **no
  water slot** today (`hearty-stew.yaml`: roots + meat only —
  requirements: they gain one).
- **Eat / taste**: `EatController`
  (`platform/idea/cmd/bulk/EatController.ts`, 88 lines) — discrete-item
  path, passes NO payload to `ingestSolid`; `DrinkController` passes the
  slot payload. `TasteController` = 12-line shim over
  `SingleSenseControllerBase`, which renders **channel-filtered markup
  augmenters** + `getDetail(dotted, channel)` — the seam both the
  freshness smell-band and the taste slice ride (P7).
- **Competence, sync**: `lib/advancement/Advancement.ts:233`
  `competenceDigestCached()` — the sync cached read the taste augmenter
  needs (`competenceBandFor` is async).
- **The rename surface**: `grep -rl hearth-cooking packages/ docs/`
  verified this cycle — the full checklist is § W1.1 below. `dist/` is
  gitignored (clean it before the zero-grep). The **deployment
  manifest** = root `package.json` (`@saxonberg/content-trade-hearth-cooking`
  at :31) — a dependent the requirements' 49-file count does not name.
- **Enabling data verified shipped**: olive Material
  (`trade-farming/.../idea/material/olive.yaml`) + cherry/orange/grape;
  `strainer`/`juicer` tool rows (trade-hospitality; colander in
  generic-objects); water Material tags `[liquid, water, beverage,
  drinkable]` (the medium tag); `belt-knife` smithing recipe.

---

## Plan-level decisions

### P0 — Rename FIRST, dinnerware second

Both touch the pack; order is deliberate: **W1.1 (rename) runs before any
other W1 work**, on the green W0 baseline. Reasons: (1) every later W1/W2
edit (recipes, rows, controllers, tests) is then written once, against
the final paths — renaming after would re-touch the whole build's own
diff and reintroduce the water-build failure mode mid-cycle; (2) the
rename's verification (grep-zero + lints + four kernel suites + three
sibling pack suites) is only meaningful on a tree with no other changes
in flight; (3) W0 is kernel-only and touches nothing the rename moves,
so it lands first unimpeded. The dinnerware unification (W1.4) then edits
kernel `Dish`/`CraftingLogic` + the renamed pack in place.

### P1 — Freshness storage: universal mixin + payload fields, both sparse

`FreshnessMixin` in **`lib/material/`** (AC1), composed into `ThingBase`
(`lib/stuff/Thing.ts`) beside `WetMixin` — universal capability. Sparse
storage = the Wet shape: two persistent fields defaulting to
`0` (`_microbialLoad`, `freshnessClockStamp`); a host whose Material
tabulates no spoilage constant never advances past zero, and zero-default
persistent fields serialize nothing meaningful (the toxin-burden
pattern the requirements name). For bulk, `BulkPayload` gains optional
`freshness?: { load: number; stamp: number }` — absent on inert blends;
transfers carry it; a transfer into a non-empty freshness-bearing slot
blends load **mass(volume)-weighted** (the one edit inside
`BulkableLogic.transfer`'s apply step). The payload gauge reconciles
through its **holder** (the vessel is the Thermal host; the reconcile
math is a shared static so item-gauge and payload-gauge read identically
— pack open-Q2 answered by construction).

### P2 — The Material constants: `Ea` + `waterActivity` + `smokePoint`

Three new tabulated `Material` fields, mirroring `boilingPoint`'s
field/fieldMeta/accessor pattern:

- `spoilActivationEnergy` (Quantity, J/mol) — the Arrhenius constant;
  **absent/0 ⇒ the host is inert** (universal-and-inert, pack fork 2).
- `waterActivity` (0–1 scalar) — the material's own a_w. The `f_aw`
  threshold below which μ→0 is a kernel dial
  (`freshness.awFloor`, ~0.60 default), not per-material. This settles
  pack open-Q1: v1 reads authored a_w off the Material, NOT off
  `WetMixin` saturation (a conversion is deferred; noted in the doc).
- `smokePoint` (Quantity<'K'>) — the fat method's cap (AC8).

Rate: `μ_max · f_T(T) · f_aw`, logistic toward K, per the pack Part 2.
`μ_max`, reference temp, band thresholds, and the load→dose curve are
`AppSettingKeys` dials with seeded-literal fallbacks (the `dial()`
idiom). Numeric calibration is a playtest fact, not a plan decision —
but `Ea`/a_w/smoke-point values are **sourced, not invented** (the
ISCED-code precedent; the slate's smoke points are flagged
from-knowledge).

### P3 — The `medium` gate: a tagged slot + an effective-heat cap

`Recipe.medium?: 'water' | 'fat'` (absent = none), validated in
`fromData` (bad word throws — with a negative test proving the throw).
Semantics, both paths:

- **Presence**: the recipe must have (and match) an input
  slot/contribution whose Material carries the medium tag (`water` tag
  ships on water; fat Materials author `fat`). Absence declines through
  the existing `insufficient-input` shape with the slot's category as
  detail — no new reason word. **Consequence executed in W1.2: wet
  recipes gain a water bulk slot** (`hearty-stew`, later `boiled-roots`
  etc.).
- **The cap**: effective heat = `min(reachableHeatK, capK(mediumMaterial))`
  where `capK` = `boilingPoint` for `water` medium (syrup's elevation
  rides its own row's boilingPoint), `smokePoint` for `fat`. The heat
  gate compares `requiresHeatK` against the *effective* heat — so a wet
  recipe demanding 450 K declines `insufficient-heat` at a roaring
  forge (AC7: water cannot brown), and the by-hand `matchBuild` clamps
  `heatedToK` the same way per-recipe (pre-resolve the banked medium's
  Material in the async caller; `matchBuild` stays sync).

### P4 — The toxin-kill is selective; the load-reset is a fresh payload

Two different facts, both written in the output-apply step:

- **Load reset (the kill step)**: when effective heat ≥ the kill dial
  (`freshness.killK`, ~333 K), the output payload's `freshness` is
  `{ load: ~0, stamp: now }` — and the *rate afterward* comes from the
  **output Material's own constants** (the cooked blend base
  `/platform/idea/material/cooked` gets a fast `Ea`) — the requirements'
  load-vs-rate split. Below the kill (a lazy warm-through): inputs'
  loads blend mass-weighted, no reset.
- **Toxin kill (AC9)**: `ToxinTag` gains optional `labileAtK?: number`.
  `deriveBlendPayload`'s callers drop doses whose `labileAtK` is set and
  ≤ effective heat. Alcohol authors none and honestly survives the pot;
  the ptomaine already accumulated in spoiled inputs authors none
  either — **cooking spoiled food does not un-poison it** (honest
  microbiology: the kill stops growth; it does not destroy formed
  toxin). The AC9 test uses a synthetic labile-toxin fixture material
  (kernel tests never name shipped content).

### P5 — Dinnerware: subclass `Dish`, claim in the edible branch, pot as last resort

1. `Dish extends CraftVessel` keeping only the food face
   (`NutritionLabelMixin` + verdict `getLong`) — soiled/wash/Thermal/
   Container/claimable inherited; the `SoiledWriters` hydrator arms come
   free. ⚠ TS mixin-narrowing hazard: farming-plan's Provision lesson (a
   nested generic mixin drops an inner surface statically) — budget for
   an `interface Dish extends …` merge if the NutritionLabel or Crafted
   surface narrows.
2. `craftImpl`'s edible branch **claims instead of clones**: the same
   `claimGlass` walk over the gathered pool, kind from
   `outputVesselKind` (the recipe's output row's `category`: stew →
   `bowl`, roast → `plate`).
3. **Pot as last resort — and `CookPot` becomes a `CraftVessel`**
   (revised 2026-09-03; supersedes "gain `BulkableMixin`"). No
   claimable dish ⇒ the meal lands in the cook vessel: for
   craft-resolve the matched `pot`, for by-hand the build vessel
   itself. A bare `BulkableMixin` bolt-on buys a *slot* but not the
   *loop* — and pot-as-last-resort only works if the pot is a
   first-class member of the same vessel pool as the dishes. So:

   ```
   CookPot = ManualBuild(Tool(Durable(CraftVessel)))
           // CraftVessel = Crafted(Thermal(Bulkable(Container(Detailed(Thing)))))
   ```

   Every strand is one a pot genuinely wants: **Bulkable** holds the
   stew · **Container** holds what you dropped in · **Thermal** gives
   the pot a temperature, ⭐ *which is S1's entire seam* — the tending
   wave then arrives with its host already shaped · **soiled/wash**
   because you wash a pot, and serving from it must soil it or the
   fallback cannot participate in the loop · **category** (`pot`) as
   the vessel kind. `mintVessel`'s Bulkable+Crafted requirement admits
   it as its own destination for free. `no-dish` never blocks dinner;
   the bar's hard `no-glass` stays hard (asymmetry untouched).

   ⚠ **The slate's "`CookPot` is not `Bulkable`" is not contradicted**
   — that statement was about the *medium read* (a build banks
   transient contributions, so the medium comes from slots/contributions
   per P3), not about whether a pot may hold dinner. Both are true.

   ⚠ **Guard, and its test.** A Crafted Bulkable is a pool/bulk-source
   candidate (`collectCandidate` :314). Kind-matching on `category`
   already stops a pot being claimed as a *drink glass* (a recipe
   wanting `coupe` never matches `pot`), and the gather walk already
   refuses to descend into `Crafted` containers — *"the olive in a
   served martini is not the next martini's garnish"* (:390–:397), so
   nothing steals ingredients out of the pot. What is **not** yet
   excluded is the pot's *contents* being drawn as a bulk input —
   "stock into soup", the dish-as-ingredient case the slate puts out of
   scope for v1. Needs a deliberate negative test proving it does not
   happen yet.
4. **No clone-per-meal path remains** (AC10) — the `:1405` clone is
   reached only by `tangible` after this.

### P6 — Cutlery: a small kernel utensil-kind vocabulary; `eat` reads, never gates

Utensil rows ride `CraftVessel` (soiled/wash/kind/par for free; the
interior slot simply unused — "serviceware without contents"). The
kernel needs to know *which kinds are utensils* to claim one at `eat`:
a small enumerated vocabulary module (`lib/bulk/` beside the vessel-kind
doc home — the "named vocabulary" module category):
`UTENSIL_KINDS = ['spoon', 'fork', 'table-knife']`. `EatController`
claims the first clean reachable utensil, soils it, narrates it
("…with a horn spoon"); none reachable ⇒ bare-handed, same success,
different scene line (AC11a — proven both ways). Never a gate, never a
grade effect.

### P7 — Taste + smell ride channel-filtered augmenters; competence reads the cached digest

- **Smell/look band** (AC1): a freshness `markupAugmenter` (the
  `wetnessAugmenter` pattern) — band words in prose, never a number;
  filtered to the `look`/`smell` channels.
- **Taste** (AC11): a `taste`-channel augmenter on the Bulkable food
  face projecting the **composition** (payload parts / the build's
  banked contributions — both exist today) through the taster's
  `cooking` competence band via `competenceDigestCached()` (sync;
  cold cache reads as the floor band — honest: an unexercised palate).
  Novice → dominant tastes only (the authored five-taste descriptors on
  Materials, salt→salty); competent → named ingredients; master →
  grade/stock reads. Derived, never authored per dish. Zero controller
  edits if the augmenter filter carries it (verify at build; fallback:
  a `senseDetail` branch in `SingleSenseControllerBase` consulting a
  host hook — still one seam).

### P8 — The ingest reach: fold the spoilage dose where the payload is read

The load→ptomaine mapping is a **curve, not a step** (pack open-Q3): a
shared static `spoilageDose(load): ToxinTag | null` beside the mixin,
driven by dials. Two folds:

- **Bulk** (drink/eat-from-vessel): the slot read reconciles the
  payload gauge; the ingest call folds the derived dose into the
  payload's effective toxicity.
- **Discrete** (`EatController`): the target's mixin gauge → a transient
  payload passed to `ingestSolid` (the signature already takes one).

Downstream is untouched: pool → burden → banded `food-poisoning` →
vomit window all ship (AC4).

---

## W0 — the spoilage core (kernel + data; no pack files touched)

### W0.1 — `FreshnessMixin` + Material constants
- **Files**: new `lib/material/Freshness.ts` (mixin, ~150 lines off
  `Wet.ts` — far-past guard dropped, no linkdead branch);
  `lib/material/Material.ts` (P2's three fields);
  `lib/config/AppSettings.ts` (the dial keys); `api/mixin.ts`
  (`isFresh` predicate); `lib/stuff/Thing.ts` (compose into ThingBase);
  `lib/mixin.ts` registry if names are enumerated there (verify).
- **Tests**: `lib/material/__tests__/Freshness.test.ts`
  (test-bootstrap; `_setNowProviderForTesting`-style clock control per
  the Growing/Wet harnesses): the three regimes — cold slows, frozen
  pauses (f_T→~0), hot kills — the a_w shelf-stable floor, the
  runs-over-absence gap (NO far-past drop — assert a 3-day gap
  integrates), zero-load inertness on a constant-less material (AC1,
  AC2).

### W0.2 — Temperature on the food classes
- **Files**: `platform/thing/Prop.ts`, `platform/thing/Provision.ts`
  gain `ThermalMixin` (AC3). Check compile fallout (both are widely
  row-referenced; Thermal is lazy — no behavior cost until read).
- **Test**: extend W0.1 suite — a Prop-shaped fixture in a cold vs warm
  ambient spoils at different rates through the real Thermal read.

### W0.3 — The payload gauge + the transfer blend
- **Files**: `lib/bulk/Bulkable.ts` (`BulkPayload.freshness?`),
  `platform/idea/api/BulkableLogic.ts` (transfer carries freshness;
  mass-weighted blend into a non-empty destination — the
  pour-to-reset exploit test is the point).
- **Tests**: `lib/bulk/__tests__/BulkPayload.test.ts` +
  `BulkVerbs.test.ts` extensions: decant spoiling payload → fresh vessel
  → load travels; mix half-spoiled into fresh → weighted blend.

### W0.4 — The ingest reach + the poisoning drive-through
- **Files**: `platform/idea/cmd/bulk/EatController.ts`,
  `DrinkController.ts` (or the `BulkableLogic.ingest` fold — pick the
  narrowest at build), the `spoilageDose` static beside the mixin.
- **Test** (AC4): synthetic spoiled item → `eat` → digestion pool →
  burden → banded `food-poisoning` fires, `vomit` in the window dumps
  the un-absorbed dose. Kernel-only fixtures.

### W0.5 — Persistence round-trip + the band read
- **Files**: fieldMeta only (already in W0.1); freshness augmenter
  (look/smell band) in `Freshness.ts`.
- **Tests** (AC5): capture → gap → materialize integrates at the stored
  rate (the fridge-pack ordering caveat: atmosphere before contents —
  assert the reconcile reads the *stored* thermal state, not post-restore
  room ambient for the gap). Band words appear on `getLong` via the
  augmenter; dry/fresh objects say nothing.

### W0.6 — The data pass: constants on the shipped edible roster
- **Files**: the ~70 `edibility: true` Material rows across
  base-library / trade-farming / generic-objects etc. gain
  `spoilActivationEnergy` + `waterActivity` where perishable (meat fast,
  roots slow, salt/sugar/honey below the floor, spirits inert);
  `/platform/idea/material/cooked` gets the fast cooked-blend rate
  (the leftovers hazard). Values sourced.
- **Gate**: `pnpm lint:instanceable` + `lint:census` stay green (data
  keys ride `data:`; no class changes). `pnpm test:near` + full lint
  family close the wave.

---

## W1 — the trade

### W1.1 — The rename: `/trade/hearth-cooking` → `/trade/cooking` (its own commits)

Naming (confirm — open question 1): pack dir + id **`trade-cooking`**,
package **`@saxonberg/content-trade-cooking`**, root **`/trade/cooking`**,
group **`cooking`**, title claim
`{ extent: /trade/cooking, holder: { group: cooking } }`.

**Order of operations:**
1. `git mv packages/content/trade-hearth-cooking packages/content/trade-cooking`;
   inside it `git mv content/trade/hearth-cooking content/trade/cooking`
   and `content/trade/hearth-cooking.yaml → content/trade/cooking.yaml`
   (the zone must cover the directory that shares its name —
   `lint:locations` check 3 is the tripwire).
2. **Prove the gates fire**: run the lint family + the four kernel test
   files + the three sibling pack suites *before* editing a single
   dependent. Record what fails (`lint:locations` on the
   FurnishableRoom roster path, `lint:census`/`lint:instanceable` on
   dangling template refs, `lint:gates` if any FromModule names move,
   the pack-list tests). Anything on the checklist that did NOT fail
   gets a grep-only verification step — that's the water-build lesson
   operationalized.
3. Discharge the checklist file by file (below), then
   `rm -rf packages/server/dist` and prove
   `grep -rn "hearth-cooking" packages/ --exclude-dir=node_modules -l`
   returns **nothing** (AC6; pnpm-lock regenerates via `pnpm install`
   for the package-name change).

**The dependents checklist** (every file verified by grep this cycle):

*In-pack (moves + internal refs):* `pack.yaml` (id/root/description/
group/title), `package.json` (name), `README.md`, all `content/**` rows
(the zone; `simple-syrup.yaml`'s `outputTemplate:
/trade/…/thing/syrup-bottle`; the cmd views + controller-ref YAMLs;
material/thing rows), `src/thing/CookPot.ts` (doc-comment path + the
`HEARTH` view-path list), `src/idea/cmd/crafting/*` + both `__tests__`.

*Sibling packs:* `trade-smithing/`: `README.md`,
`content/recipes/cook-pot.yaml` (`outputTemplate`), `package.json`
(dependency), `src/.../knowledge-ladder.test.ts` (comment).
`trade-hospitality/`: `package.json`, `src/__tests__/menu.test.ts`
(five path refs). `hearthworks/`: `pack.yaml`, `package.json`,
`content/.../cookhouse.yaml` (`props:` cook-pot path).
`generic-objects/`: `content/stuff/thing/vessel/urn.yaml`
(`interiorMaterial: /trade/…/idea/material/coffee`). `hinkley-hills/`:
`lots/kitchen.yaml` (comment).

*Kernel:* `platform/thing/CraftVessel.ts` (comment),
`platform/__tests__/room-archetypes.test.ts` (kitchen bundle path),
`platform/idea/api/__tests__/PackLogic.discover.test.ts` (three lists),
`world/__tests__/libations-annexes.test.ts` (ANNEXES + two path
asserts), `world/hearthworks/__tests__/hearthworks-venues.integration.test.ts`
(RECIPE_DIRS + comment), `packages/server/scripts/check-location-classes.ts`
(FurnishableRoom roster path).

*Repo root:* `package.json` (the deployment manifest — the dependency
line), `pnpm-lock.yaml` (via install).

*Docs (current-state surfaces):* `content-packs.md` (pack table rows
1001–1016, path list :1145, prose), `crafting.md` (:342, :376–379,
:589, :710–736), `command-spec.md` (:143), `behavior.md` (:196 example).
Historical narrative (slates/README build history, content-packs wave
chronicle) records the old name as history — **leave it** (open
question 7).

**Close the wave**: full lint family green; `trade-cooking`,
`trade-smithing`, `trade-hospitality`, `hearthworks` vitest suites
green; `pnpm test:near` over the kernel test edits.

### W1.2 — `medium` + `smokePoint` + the fat Materials
- **Files**: `lib/craft/Recipe.ts` (field, validation + negative test),
  `lib/material/Material.ts` (`smokePoint`),
  `platform/idea/api/CraftingLogic.ts` (effective-heat cap in
  `craftImpl` + `matchBuild`; medium-slot presence),
  `trade-cooking/content/trade/cooking/idea/material/tallow.yaml` +
  `olive-oil.yaml` (real smoke points, `fat` nutrient + tag, edibility),
  `hearty-stew.yaml` (+ water slot, `medium: water`).
- **Tests** (AC7, AC8): kernel — wet recipe declines `insufficient-heat`
  when `requiresHeatK` > medium cap despite an 800 K fire; fat medium
  carries past 373; medium-absent declines diegetically; `fromData`
  throws on a bad medium word. Pack — hearty-stew still resolves at the
  cookhouse (water in reach — verify the venue stocks a water source;
  add the barrel row if not).

### W1.3 — The toxin-kill write
- **Files**: `lib/metabolism/Metabolic.ts` (`ToxinTag.labileAtK?`),
  `CraftingLogic.ts` (`applyEdibleOutput` + `mintVessel`: drop labile
  doses at effective heat; write the freshness reset per P4).
- **Test** (AC9): synthetic raw-toxic labile material → cook →
  payload toxicity clean; alcohol-tagged input survives; sub-kill
  warm-through resets nothing.

### W1.4 — The dinnerware unification (P5)
- **Files**: `platform/thing/Dish.ts` (extends CraftVessel),
  `CraftingLogic.ts` (edible claims; pot-as-last-resort ladder),
  `trade-cooking/src/thing/CookPot.ts` (+ BulkableMixin),
  `generic-objects` rows: `plated-dish.yaml` gains `category: plate`
  (or is renamed `plate.yaml` — decide at build against row-ref
  fallout), new `bowl.yaml` / `mug.yaml` / `platter.yaml`; recipe
  output rows declare their kind (stew → bowl…).
- **Tests** (AC10): the full loop claim → soil → wash → reclaim on a
  Dish; the campfire-no-crockery drive-through minting into the pot;
  a soiled dish is never claimed; grep/test proof no edible clone path
  remains; **the hydrator-arm regression** (wash a dish, snapshot,
  restore — the CraftVessel `:64` lockout lesson, now covering Dish).
- Run the hearthworks integration suite — it exercises fine-roast
  end-to-end and will catch the claim change's venue implications
  (the cookhouse must stock dishes: add to its rows/par).

### W1.5 — Cutlery (P6)
- **Files**: new `lib/bulk/` utensil-kind vocabulary module (name it
  with the vessel-kind doc), `EatController.ts` (claim + soil +
  narrate / bare-handed), utensil rows (horn spoon in generic-objects
  commons; table-knife + fork as trade-smithing recipes + output rows —
  extent per open question 5).
- **Tests** (AC11a): both scene readings, act succeeds both ways;
  utensil soils and washes at the basin.

### W1.6 — The taste slice (P7)
- **Files**: the taste/smell augmenters (`lib/material/Freshness.ts` +
  the composition projection — likely on the Bulkable/NutritionLabel
  food face), Material sensory descriptors (small authored vocabulary
  on the five basic tastes where relevant).
- **Tests** (AC11): same dish, novice vs competent fixture → different
  readings; a build (banked contributions) tastes as its composition;
  no per-dish authored flavour string anywhere.

---

## W2 — the recipe roster (content only)

Nine recipes in `trade-cooking/content/recipes/`, spanning the grid
(slate Part 5 — trivial→hard per method; formidable stays empty):

| recipe | method/medium | heat | notes |
|---|---|---|---|
| boiled-roots | wet | 373 | the floor; water slot |
| stewed-orchard-fruit | wet | 373 | farming's cherry/orange/grape |
| clear-broth | wet | 373 | + `strainer` kind |
| roasted-roots | dry | 430 | the Maillard pair with boiled |
| hearth-roast | dry | 450 | fair meat under fine-roast |
| render-tallow | wet→fat bootstrap | 373 | stew-meat in, `outputMaterial: tallow`, crock row |
| press-olive-oil | no heat | — | `juicer` kind, olive in, oil bottle row |
| pan-fried-roots | fat | ~440 | `medium: fat` |
| crisp-fried-cutlet | fat | ~455 | the smoke-point margin lesson |

Plus: tallow-crock + oil-bottle output rows (vessel kinds), pantry
stock rows to feed them, the kitchen bundle + cookhouse par refreshed
(dishes, utensils, a strainer/juicer, the water source), house-par
lines for dinnerware.

**Test** (AC12): every recipe resolves in a pack test (the menu.test /
knowledge-gate harness pattern — materialize the venue, cook all nine);
the three-media root-vegetable spine asserted distinct (different
output kinds/appearance). `lint:census` + `lint:instanceable` prove
every new path resolves.

---

## W3 — the drive and the record

- **W3.1 The live drive** (AC13): boot, buy meat at the general store →
  `look`/`smell` the clock → cook at the cookhouse (claim a bowl, eat
  with a spoon) → leave leftovers out over game-days → band walk →
  eat → `food-poisoning` → vomit window. Plus the campfire leg: pot,
  packed inputs, no crockery, eat from the pot bare-handed. Defects
  found are FIXED in-wave, not noted.
- **W3.2 Ptomaine calibration** (AC14): review bands (2/6/12) +
  `clearanceRate: 0.02` + the new `spoilageDose` curve against routine
  exposure; adjust the Condition seed/dials with the user.
- **W3.3 Docs**: new `docs/subsystems/spoilage.md` (the gauge, the
  honest microbiology, the storage pattern, the payload rules, the
  ingest reach) + the method vocabulary into `crafting.md` (medium/cap,
  the dinnerware pool's edible customer, utensils) — split per open
  question 6. Update `metabolism.md` (labileAtK, the freshness rung),
  `bulk.md` (freshness on the payload; utensil kinds), `thermal.md`
  (food hosts). **Fix any pre-sweep (`ThermalApi`-era) phrasing found
  in touched docs.** CLAUDE.md map one-liners are sweep territory —
  leave to `/finalize`.
- **W3.4 Finalize runway** (AC15): retire/reduce the slate per sweep
  rules (Parts 4.5/S-bill and the deferred-wave material extract back
  to slates), `pnpm test` full run green, MR.

---

## Acceptance-criteria coverage

| AC | Where |
|---|---|
| 1 | W0.1/W0.5 (mixin, reconcile, no far-past guard, sparse) |
| 2 | W0.1 + W0.6 (rate law, three regimes, floor) |
| 3 | W0.2 (Prop/Provision Thermal) |
| 4 | W0.4 (spoiled → eat → burden → condition) |
| 5 | W0.5 (round-trip at stored rate) |
| 6 | W1.1 (rename + checklist + grep-zero) |
| 7 | W1.2 (medium decline + cap test) |
| 8 | W1.2 (smokePoint + tallow/olive-oil end-to-end) |
| 9 | W1.3 (raw-toxic → cooked-safe) |
| 10 | W1.4 (claim loop + pot-as-last-resort tests) |
| 11 | W1.6 (competence-filtered composition) |
| 11a | W1.5 (utensil both-ways test) |
| 12 | W2 (nine recipes resolve; the spine) |
| 13–15 | W3.1–W3.4 |

## Risks & opens

- **Riskiest step: W1.1.** The failure mode is a dependent nobody
  greps — hence the fire-the-gates-first step and the two dependents
  the pack's own count misses (root `package.json`, the historical-doc
  decision).
- **`Dish extends CraftVessel` static-surface narrowing** (the
  Provision/TS lesson) — budgeted, verified by compile + the label
  tests.
- **Augmenter capability for taste** — if the channel filter can't
  carry an async-free competence read cleanly, the fallback seam is
  named (P7) and stays one edit.
- **`CookPot` + Bulkable** interaction with `collectCandidate` (:314 —
  a Crafted Bulkable is treated as a glass/pool candidate): the pot
  must not be claimed as a drink vessel or gathered as an input; the
  gather walk needs a guard (tool-first ordering already excludes tools
  — verify, test).
- **Deferred factoring, named not built: a `BulkableVessel` base.**
  Bulk-plus-containment currently exists *only* inside `CraftVessel`,
  bundled with craft concerns (`soiled`, `technique`, `iceKg`). Every
  consumer today is craft-shaped, so no base is factored — the
  `ExitableVessel` precedent (*deferred until a consumer needs a
  concrete class*). When a non-craft holder appears — a rain barrel, a
  well, a bucket — factor the base **out of `CraftVessel`** rather than
  duplicating the composition.
- **Venue stock gaps** (water slot at the cookhouse, dishes in reach)
  surface in the hearthworks suite and the drive — expected, in-scope.

## Open questions — ALL RESOLVED 2026-09-03

1. ✅ **Pack naming confirmed**: `trade-cooking` dir/id +
   `@saxonberg/content-trade-cooking` + group `cooking` + root
   `/trade/cooking`.
2. ✅ **`ToxinTag.labileAtK` confirmed** as the selective-kill carrier
   (not a flag on the Condition seed): the lability of a toxin is a
   fact about the *substance*, so it rides the tag the food authors.
3. ✅ **RESOLVED with the user 2026-09-03** — `CookPot extends
   CraftVessel` (not a `BulkableMixin` bolt-on): the pot joins the same
   vessel pool as the dishes, and picks up `Thermal` that S1 needs
   anyway. See P5.3 for the composition and the pool-candidate guard.
   *(Remaining build-time judgement: whether `Durable`/`Tool` compose
   cleanly over `CraftVessel`'s deeper stack — the same TS
   mixin-narrowing hazard already budgeted for `Dish`.)*
4. ✅ **Utensil-kind vocabulary confirmed** as a small enumerated
   kernel module (not a row-authored flag) — `eat` must know which
   kinds are utensils to claim one, and an enumerated vocabulary makes
   adding a kind a visible diff (the `lint:locations` roster
   precedent).
5. ⭐ **Cutlery extent — DECIDED: rows for all three, plus ONE
   trade-smithing recipe (the table knife).** `belt-knife` is a shipped
   smithing recipe, so a table knife is a near-copy rather than a
   roster expansion — and it gives the smith a real answer to the
   demand cutlery creates (slate Part 6: one dinner table wakes three
   making trades). The fork stays a row this build (a second near-copy
   buys little); the wood/horn **spoon is a row only** — its maker is
   the ⭐carver, a roster gap nobody has built. ⚠ Reverse this if
   touching `trade-smithing`'s roster during the rename wave feels like
   one pack too many; the loop works with rows alone.
6. ✅ **Doc split DECIDED: `spoilage.md` separate; the method
   vocabulary into `crafting.md`.** Spoilage is *substrate other builds
   inherit* — disease inherits its growth term, the fridge and the
   victualler both depend on it — so it earns its own subsystem doc and
   its own map entry. Cooking's methods are a **branch of the crafting
   subsystem**, and `crafting.md` already documents the branches
   (bar/smithing/cooking); a separate `cooking.md` would split one
   subsystem's contract across two files.
7. ✅ **Historical lines DECIDED: leave them.** Build chronicles record
   what happened; the pack *was* called `trade-hearth-cooking` when
   those waves shipped, and rewriting them would make the record lie
   about the past to tidy the present. Only **current-state** surfaces
   (the pack table, path lists, live prose) get renamed — the
   distinction the W1.1 checklist already draws.
