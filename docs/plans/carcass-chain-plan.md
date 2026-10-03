# The carcass chain — implementation plan

Executes [carcass-chain-requirements.md](../requirements/carcass-chain-requirements.md).
**Kind:** content, with one reconciliation slice in the engine.
**Leads from:** content. Two new capability packs (`trade-tanning`,
`trade-chandlery`), rows in five shipped packs, and a short kernel slice
whose first consumer is the Hearts Delight flock in this same build.

What is being built: one slaughter instead of two (a kill that leaves
the realm's ordinary carcass, and the kitchen's `butcher` taking it
apart), species-declared yields that scale with size and condition, a
hide that rots on the shipped clock and tans in a pit against the bark
and water it is standing in, bark off a felled oak, one candle recipe
over two feedstocks, bone meal into the soil and a dog loaf out of the
oven, a flock in the valley, and three vacant seats at Wharfside.

---

## Grounding

Everything below was verified by opening the file this cycle. Paths are
repo-relative from `/home/bobalu/play/saxonberg/build-1`.

### The death path, and what a dead beast IS

- `packages/server/src/mud/api/condition.ts:275` — `ConditionApi.die(host, cause, spec?)`
  forwards to `ConditionLogic.die`. No visible gate on the Api static.
- `packages/server/src/mud/platform/idea/api/ConditionLogic.ts:304-420` —
  `dieImpl`. **For a body with no player identity, no corpse is minted.**
  The branch at ~line 400 is `host.setCauseOfDeath(cause); host.setLifecycleState('dead'); markDeceasedAt(nowS)`
  with the comment *"The body stays in the world as a corpse. Never
  `StuffApi.destruct` here."* The `/stuff/agent/Corpse` clone
  (`mintCorpseFrom`, line 588) runs only inside `divideBody` for a
  player. ⭐ So *"the same carcass every other death leaves"* for a beast
  is **the same object, dead** — it keeps its mass (derived from
  `Species.massAt(age)` via `Creature.getMass`, `lib/creature/Creature.ts:549-612`),
  its `flesh` reserve, its `herdId`/`headIndex`, its taps and its
  handling.
- `packages/server/src/mud/lib/mortality/Postmortem.ts` — `sinceDeath()`
  is public; composed on `Creature`. The kitchen's butcher reads it.
- `packages/content/generic-objects/content/stuff/agent/Corpse.yaml` —
  the player-corpse row (`class: /platform/agent/Corpse`, `lifecycleState: dead`).

### The two butcheries

- `packages/content/trade-ranching/src/idea/cmd/ranching/ButcherController.ts` —
  module-level `YIELDS` (stew-meat .42 · offal .12 · tallow .05 · hide .07
  · bone .12), `finish = clamp01(0.55 + (flesh − 30)/90)` on meat only,
  `instanceof Livestock` guard, `HerdRegistry.returnHead` + tally
  decrement **before** `StuffApi.destruct(animal)`, credits
  `STOCKMANSHIP` (exported from `HandleController.ts`). Docstring and the
  view's help both claim *"bone and horn"*; no horn row exists.
- `packages/content/trade-ranching/content/trade/ranching/cmd/ranching/butcher.yaml` —
  `verbs: [butcher]`, arg `requires: HandlingMixin` (the binder admits the
  sheepdog; the controller re-narrows — the exact tell).
- `packages/content/trade-ranching/content/trade/ranching/idea/cmd/ranching/ButcherController.yaml` — the controller row.
- `packages/content/trade-ranching/src/agent/Livestock.ts` —
  `ProducingMixin(HandledMixin(HandlingMixin(ChattelMixin(BrandedMixin(Creature)))))`;
  `commandContributions.peers` = return · butcher · breed · milk · shear ·
  gather; `bindToHerd(herdId, index)`; `getHerdId()` / `getHeadIndex()`.
  **Not `Named`** (`Creature` lost `NamedMixin` in the presentation build).
- `packages/content/trade-ranching/src/lib/Handled.ts` —
  `HandledMixin.workedOver(actor): HandleReport` (self · peers · prelude?
  · difficulty · discipline?) — the body of `handle` on the animal;
  `HandleController.ts` is resolve → send → credit. The precedent `slaughter` follows.
- `packages/content/trade-cooking/src/idea/cmd/crafting/ButcherController.ts` —
  extends `CraftController`; gate order today: not-a-carcass
  (`isOrganism && isDead`) → `SpeciesApi.preloadAnatomy` → sentient →
  blade (`bladed` construction) → `species.getButcheryYield()`; cuts
  `ageAtKill(sinceDeath)`; `GUT_FLORA`; `DISCIPLINE = 'butchery'`;
  `StuffApi.destruct(body)` at the end. ⚠ A **live** animal is refused
  as *"is not a carcass"* before anything about it is read.
- `packages/content/trade-cooking/content/trade/cooking/cmd/crafting/butcher.yaml` —
  `verbs: [butcher, dress]`; `body` arg `requires: any`; `blade` and
  `block` are declared args with MQL defaults.
- `packages/server/src/mud/platform/idea/species/Species.ts:44` —
  `ButcheryYield { cut: string; units: number }`; field `butcheryYield`
  (line 769, `authorable`); `getButcheryYield()` (975) has **one reader**,
  the cooking controller. `adultMass` (605) + `massAt(ageDays)` (1188).
  `feedingStyle` (751), `FEEDING_STYLES` (205), `FEEDER_KINDS` (219).
- Yield authors: six fish under `trade-fishing`, `species-and-names`'s
  `wolf.yaml` (3 stew-meat + 1 offal) and `hog.yaml` (6 + 2 prime-cut + 2
  offal), `trade-mining`'s pony (12 + 3). ⚠ The pony's 12 cuts × 0.4 kg
  is 4.8 kg off a 200 kg animal — the shipped counts are abstract, not
  mass-conserving. The five farm species under
  `packages/content/trade-ranching/content/stuff/idea/species/animalia/chordata/mammalia/…`
  (`bovidae/ovis/aries` 70 kg, `bovidae/bos/taurus` 550 kg,
  `suidae/sus/domesticus` 120 kg, `canidae/canis/familiaris` 20 kg with
  `feedingStyle: [bowl, ground, hand]`, and `gallus/domesticus`) author
  **no** `butcheryYield`.
- `packages/server/scripts/check-verb-collisions.ts` — `KNOWN_COLLISIONS`
  carries `butcher` and `dress`; the gate fails on a NEW collision and
  also when a listed collision is **healed and not deleted**. `slaughter`
  and `tan` are unclaimed. `hide` is the stealth verb; `feed` is the
  garden verb; `salt` is an alias on cooking's `cure.yaml`.

### The carcass products and their rows

- `packages/content/trade-ranching/content/trade/ranching/thing/hide.yaml` —
  `class: /platform/thing/Provision`, mass 25, **`_materialPath: /stuff/idea/material/organic/leather`**.
  The `leather` material (`base-library/…/organic/leather.yaml`) carries
  `tags: [organic, leather, hide, once-living, flexible]` — ⭐ **the
  `hide` tag is what the jerkin recipe matches**, which is literally why
  *"one recipe wants tanned leather and gets a raw skin"*.
- `…/thing/tallow.yaml` — "pail of fat", keywords `[fat, tallow, suet, pail]`,
  material `/stuff/idea/material/food/animal-fat` (tags
  `[food, fat, rendering, once-living]` — ⚠ `fat` is also the cooking
  MEDIUM tag, so raw suet can fry today). `…/thing/bone.yaml` (Provision,
  material `tissue/bone`, prose claims bone meal is phosphorus).
- `packages/content/trade-cooking/content/recipes/render-tallow.yaml` —
  slot `category: meat` ("trimmings"), `outputApplication: bulk` into
  `/trade/cooking/thing/tallow-crock` (a `CraftVessel`, `category: tallow-crock`),
  `outputMaterial: /trade/cooking/idea/material/tallow` (tags
  `[liquid, food, fat, cooking-fat, rendered]`, `smokePoint 478`).
- `packages/content/trade-tailoring/content/recipes/leather-jerkin.yaml` —
  slot `{category: hide, kind: item, count: 1, minGrade: fair}`,
  `toolCapabilities: [mending]`, `outputTemplate: /stuff/thing/armor/hide-jerkin`
  (a `Garment`, `constructionForm: hide`), `discipline: tailoring`.
- `packages/content/generic-objects/content/stuff/thing/items/offal.yaml` /
  `stew-meat.yaml` — Provisions; `offal` material `edibility: true`,
  spoils faster. `bone` material `edibility: false` → **a dog will not
  eat bone** (`Feeder.offerings()` / the `feeds` brain use `isEdible()`).
- `packages/content/trade-dyeing/content/trade/dyeing/idea/material/tannin.yaml` —
  a mordant, no producer. Untouched by this build.

### The item-side clocks (the tanpit decision rests here)

- `packages/server/src/mud/platform/thing/Provision.ts` —
  `Sampled(Crafted(Composed(Contaminable(WaterActivity(ThermalDose(Freshness(Thermal(Good))))))))`.
  Its own comment: *"WaterActivity beside Freshness, NOT folded into it …
  only one of them is true of a hide or a plank … the split is what lets
  a tannery dry a skin without claiming it ferments."*
- `packages/server/src/mud/lib/material/WaterActivity.ts` — per-instance
  `moisture`/`solute`; `a_w = a_w(material) · moisture · (1 − solute)`;
  the passive arm reconciles the ITEM against its environment
  (`BiomeApi.localHumidityFor`, a support's `airExposure`). ⭐ This is the
  shipped shape for *an item whose state advances against the thing it is
  sitting in*.
- `packages/server/src/mud/lib/material/Freshness.ts` — composed on
  `Provision` only; `lint:perishable` (`scripts/check-perishable.ts`)
  fails any row whose material tabulates `spoilActivationEnergy` but
  whose class does not reach `FreshnessMixin`. No exemption list.
- `packages/content/trade-cooking/src/idea/cmd/crafting/DryController.ts` —
  `dry` makes nothing; it puts the cut where the air is and narrates a
  prospect; refusal names the property (*"a hide … qualif[ies] the day
  somebody ships one"*). `PreserveController.ts` — `cure`/`smoke` resolve
  ONE fixed `recipeId()` through `CraftingApi.craft`; `cure.yaml` claims
  `[cure, salt]` with `requires: any`. `salt-cure.yaml` slot is
  `category: meat`, output `/trade/cooking/thing/treated-cut`,
  `cure: { solute: 0.55 }`. `smoke-cure.yaml` has `cure: { moisture: 0.55 }`.
- `packages/server/src/mud/platform/idea/api/CraftingLogic.ts:1570-1600` —
  the tangible arm carries the inputs' microbial load and applies
  `recipe.getCure()` to the output's water state.

### Maturation — why it is NOT the tanpit's host

- `packages/server/src/mud/lib/maturation/Maturing.ts:421-429` —
  `__validateComposition__` **throws** without `BulkableMixin`; the
  transform is `setBulkMaterial('interior', product)` (line 851). One
  batch state per vessel, keyed to the interior material path.
- `packages/server/src/mud/lib/maturation/MaturationProfile.ts:47-59` —
  `MaturationMechanism` closed: `microbial | photochemical | chemical | evaporative`;
  `chemical` has **zero rows** (14 microbial, 1 photochemical, 3
  evaporative) and no analogue of `requiresStrain`.
- `docs/subsystems/maturation.md:300-309` names the gap by itself:
  *"The gap: ripening a DISCRETE thing. A wheel is a Crafted Thing, and
  `MaturingMixin` requires a Bulkable interior — months in a cave has no
  mechanism."*
- `packages/content/trade-textiles/src/thing/RettingPit.ts` — a 65-line
  `Vat` subclass; `retting.yaml` matches the MATERIAL's `retting` tag;
  flax enters as bulk (`flax-bale.yaml` is a `GradedReceptacle`).
- `packages/server/src/mud/platform/thing/Vat.ts` —
  `VesselKind(Maturing(Crafted(Sealable(Thermal(Bulkable(Good))))))`;
  **not a Container**. `packages/server/src/mud/platform/thing/CraftVessel.ts` —
  `Contaminable(Serviceable(VesselKind(Crafted(Thermal(Bulkable(Container(Good)))))))`
  — **both a Container and Bulkable**, exported under
  `@saxonberg/server/mud/platform/thing/*`. `Container.ts` has no
  size/mass acceptance rule (grep `canAccept|acceptsContainable|fits`
  returns nothing), so a 25 kg hide goes into a vessel.
- `packages/server/src/mud/lib/bulk/Bulkable.ts:134` — `BulkPayload` is a
  declaration-mergeable interface (`lib/vitals/Blood.ts:41` and
  `lib/material/Contaminable.ts:204` merge fields onto it), but the
  transfer seam's domain branches are explicit steps in `BulkableLogic`
  and `bulk.md` says a fourth domain is *"the moment to generalize"*.

### Crafting facts the candle and the salt depend on

- `packages/server/src/mud/platform/idea/api/CraftingLogic.ts:1442-1530`
  `applyTangibleOutput`: material = authored `outputMaterial`, else the
  **primary matched ITEM's**; a bulk-only tangible (the loaf) **throws
  unless `outputMaterial` is authored**. Mass = Σ item kg, or Σ litres ×
  density for bulk-only.
- `…CraftingLogic.ts:2256` and `:2885` — a `recipeRef` resolves
  `catalogue.findByKeyword(ref) ?? catalogue.getRecipe(ref)`;
  `packages/server/src/mud/platform/idea/RecipeCatalogue.ts` exposes
  `getRecipe`, `findByKeyword` (one), `allRecipes()`.
- `resolveMaker` (CraftingLogic ~2300) passes
  `recipe.getDiscipline() || undefined`; `Employed.isFulfilling(undefined)`
  (`lib/employment/Employed.ts:426-451`) passes **any on-shift seat
  holder**. ⭐ An undisciplined recipe is orderable at any counter.
- `packages/server/src/mud/platform/idea/cmd/crafting/CraftController.ts:46-73`
  `requireDeed` — a catalogue recipe declines `not-learned` until
  `CraftingApi.canMake` (a lived deed, or a seeded dossier a player can
  never hold). `crafting.md:1108-1160`: a recipe with **no `discipline`
  or no `difficulty` is ungated**. `MakeController.ts:60` calls it.
- `packages/content/trade-apiculture/content/recipes/candle.yaml` —
  `discipline: apiculture`, `difficulty: easy`, item slot `category: wax`,
  `outputMaterial: beeswax`, `outputAppearance`. ⚠ **`grep candle packages/wire/tests/` is empty** —
  no drive has ever made one, and with the gate above a player cannot.
  `trade-apiculture/src/__tests__/recipes.test.ts:117-125` asserts the row.
- `packages/content/trade-apiculture/content/trade/apiculture/thing/beeswax-cake.yaml` —
  an ITEM (`/platform/thing/Thing`, 0.15 kg, material beeswax); the
  crush's `outputResidue`. Tallow is BULK in a crock. ⭐ The two
  feedstocks have different shapes.
- `packages/content/generic-objects/content/stuff/thing/candle.yaml` —
  `class: /platform/thing/Lamp`, three beeswax welds, `lit: false`
  (`lint:light-sources` clause g), `fuel` reserve, 12 lm / 1900 K. Named
  by exactly one row: the apiculture recipe.
  ⚠ The task's note about a separate `/platform/thing/Candle` class is
  **stale**: `grep -rn "class Candle" packages/server/src` finds only
  three test-local fixtures, and `docs/subsystems/light.md:916-918`
  records it *"retired unrowed"*. Nothing to delete.
- `packages/server/src/mud/lib/description/Visible.ts:325-332` —
  `getShortDescription()` renders `GrammarApi.phrase(this.shortDescription, this.register)`;
  no templating from material. `Material.appearance` (`getAppearance()`)
  is read by bulk contents, `Floor`, `EatController`, `BlendIdentity`.
- `packages/server/src/mud/lib/perception/SmellSource.ts:38-43` —
  `SmellSourceMixin`: `odorIdentity` + `emittedConcentration`; the
  platform ships a `smell` verb (`platform/cmd/perception/smell.yaml`).
- Milling: `packages/content/trade-milling/content/trade/milling/thing/quern.yaml`
  is a `GristMill` (`ComminutingMixin`) with a FIXED `productMaterial`
  (wheat-flour) and `capabilities: [millstone]`. It cannot grind bone; a
  recipe with `toolCapabilities: [millstone]` can be ground beside it.
  `crush-comb.yaml` proves an item-only input fills a bulk output at
  `outputPortionL`.

### Forestry

- `packages/content/trade-forestry/src/idea/cmd/forestry/FellController.ts` —
  `dropStandard(giver, room, woodMaterialPath, seedPath)` mints one
  `Bole`, `LOGS_PER_STANDARD = 4` logs, a seed; `stamp()` every good to
  the feller; `capture(stand)` + `capture(giver)`. The planted-tree path
  reads the stand's mix entry first, else the `Plant`'s own fields.
- `packages/content/trade-forestry/src/lib/Stand.ts:102-117` —
  `StandSpecies { speciesPath, name, woodMaterialPath, seedPath, standing, capacity, incrementPerYear }`;
  `setMix` (275-281) copies the known keys. The mix is authored per Wood
  row: `packages/content/rejection/…/hanging-wood/oak-clearing.yaml`
  (oak: 12/14, `seedPath: /trade/forestry/thing/seed/acorn`; ash). The
  oak species row (`trade-forestry/content/stuff/idea/species/…/quercus/robur.yaml`)
  carries no felling facts; they live on the mix entry.
- `…/thing/timber.yaml` and `log.yaml` — `Good` / `Firewood` rows with
  material restamped at the mint. No bark material anywhere
  (`trade-medicine`'s `willow-bark` is a drug, not tanbark).

### Feeding, soil, pets

- `packages/server/src/mud/platform/idea/cmd/bulk/FeedController.ts` —
  `feed <bed> [with <source>]`: source must carry the `compost` tag,
  credits the ground's **nitrogen** at `POINTS_PER_LITRE = 10`.
  `lib/husbandry/Soil.ts:175-190` has the organic-matter "work in"
  face beside it. Reserves: moisture · nitrogen · organicMatter ·
  structure — no phosphorus.
- `packages/server/src/mud/lib/behavior/feeds.ts` — eats from a `Feeder`
  of its species' kind, or off the **ground** when `feedsBy('ground')`;
  below `steady` only when every person present is known
  (*"it waits until you step back"*); must not read metabolism before
  finding food.
- `packages/content/trade-ranching/content/trade/ranching/agent/farm-dog.yaml` —
  `class: /trade/ranching/agent/WorkingAnimal` (= `HandledMixin(KeptAnimal)`,
  so `Named`, `Bonded`, `Behaved` with `herds`/`follows`/`feeds`/`homes`).
  ⚠ **Cast by nobody** (`grep -rn "trade/ranching/agent/farm-dog" packages/content`
  returns nothing). No authored `KeptAnimal` row anywhere has a `name:`.
  `NamedMixin.fieldMeta.name` is `persistent, authorable`.
- `packages/server/src/mud/platform/idea/cmd/social/NameController.ts:61-110` —
  naming needs `Bonded.hasChosen(actor)` (bond + followed home);
  `pets.wire.test.ts:133` asserts `name` **refuses** a cat that never
  followed — a drive cannot name an animal cheaply.
- `packages/server/src/mud/lib/husbandry/Producing.ts:489-500, 995` —
  `seedState` starts every tap at `standing: 0`; `DraftController.ts`
  seeds flesh and handling from `HeadSeed`, never taps. ⚠ A freshly
  drafted ewe carries no wool until game time passes.

### The world

- Heart's Delight (`packages/content/hearts-delight/`, README forbids
  code): `location/farmstead-yard.yaml` (prose already says *"Hens"* and
  *"a slate with prices"*; `props: [farm-shelf]`, `cast: [farmer]`),
  `idea/farm-business.yaml` (position `farmer`, `fulfills: [cooking]`,
  `call: rota`, operates the yard + upper bench), `agent/farmer.yaml`
  (Odell Quist, `archetype: farmer`, dossier). Title claims under
  `/world/terminus/hearts-delight`, `landUse: agricultural`.
- Wharfside (`packages/content/terminus/content/world/terminus/wharfside/`):
  `bank.yaml`, the dyehouse (zone row + `dyehouse/{idea/outfit,agent/dyer,location/floor,thing/counter}`),
  the mill, `thing/city-outfall.yaml`, `thing/river-edge.yaml` (a water
  `Shore`). `terminus/pack.yaml:84` claims
  `/world/terminus/wharfside … landUse: industrial`; `:106-107` boot the
  dyehouse floor + outfit as producers (the premises rule: a trade's
  venue rows live with the locality and so do their boot entries). The
  salt house is at `estuary/salt-house.yaml` (reachable from the lower
  towpath). A water source row is `trade-brewing/…/standpipe.yaml`
  (`class: /platform/thing/WaterFixture`).
- The bakery: `terminus/…/market/bakery.yaml` + `thing/bread-counter.yaml`
  (a `Stock` with `stockLines` + `prices` — *"two prices chalked on the wall"*).
- Employment: `Position.requires` is closed to `{gigs, discipline, band}`;
  bands are `untrained · novice · competent · proficient · expert`
  (`lib/advancement/CompetenceBand.ts:23-37`); openings derive from
  `headcount − holders`; `lint:openings` arm 3 requires an advertising
  house to be a `boot:` producer of its own pack; the tailor's outfit
  (`mayfield-row/tailor/idea/outfit.yaml:30-33`) is the exemplar
  (`headcount: 2`, `requires: {discipline: tailoring, band: competent}`).
- Disciplines are rows at `<root>/idea/Discipline/<key>.yaml`
  (`trade-ranching/…/Discipline/stockmanship.yaml`, `trade-baking/…/baking.yaml`);
  `leatherwork` is on the unminted roster (`trade-roster-slate.md:161`, 0723).
- Packs: a capability pack is `package.json` (deps are the pack graph) +
  `pack.yaml` (`id`, `root`, `requires.title`, `boot`) + `src/` + `content/`
  + `vitest.config.ts` + `tsconfig.json`; `trade-apiculture` is the
  closest shape (src with `lib/`, `thing/`, `idea/cmd/`, `__tests__/`).
  The server's `exports` map admits `./mud/lib/*`, `./mud/api/*`,
  `./mud/platform/{thing,idea,agent,location}/*`. The deployment manifest
  is `packages/server/package.json`'s `@saxonberg/content-*` lines.
- The drive tier: `packages/wire/tests/<feature>.dirty.wire.test.ts`;
  harness exports `Session`, `declareFile`, `uniqueHandle`, `expectOk`,
  `expectRefused`, `expectNote`, `advanceWorldClock`, `worldClockNow`,
  `isOwnedTestWorld` (`packages/wire/src/harness/`). The taps drive is
  the newest precedent and the first that walks a season.

---

## Plan-level decisions

**D1 — The carcass is the dead animal itself; `slaughter` is a kill.**
`slaughter <animal>` calls `ConditionApi.die(animal, 'slaughtered')`
and nothing else lethal. The kernel's non-player branch leaves the same
`Livestock` object in the room, dead, on the postmortem clock — which
is exactly what a fight or starvation leaves, so AC2 is met by
construction. The kitchen's `butcher` already accepts any dead
`Organism` and destructs it. **Order of operations:** kill first, write
the book second. A failed book write leaves a dead head still marked
`drafted` — recoverable, and no animal is lost; the reverse order
(write, then a failing kill) would leave a live animal out of the book.
The book write moves ONTO the animal as `Livestock.leaveBook(note)`
(it owns `herdId`/`headIndex`, exactly as it owns `bindToHerd`), and the
controller is resolve → refuse → die → leaveBook → scene → credit.

**D2 — The yield shape: a fraction line beside the count line.**
`ButcheryYield` becomes `{ cut; units; fraction?; conditioned? }`.
A line with no `fraction` is the shipped count shape (fish, wolf, hog,
pony — no row changes). A line with `fraction` yields
`liveKg × fraction × finish` kilograms, where `finish` is the shipped
`clamp01(0.55 + (flesh − 30)/90)` when `conditioned` is true (the
default) and `1` when false (hide, bone — a thin cow still has a whole
hide); `units` is then **how many pieces it is cut into**, each
`kg/units`. The arithmetic lives on `Species` as
`dressOut({ liveKg, fleshPct }): DressedLine[]` (the species' answer;
`massAt` is the precedent), and the kitchen's controller applies the
skill multiplier and the floor-of-one as it does today. Reasoning: the
product requirement is *size and condition pay off, for every species*;
a count cannot express a 70 kg ewe against a 550 kg cow, and a
mass-shaped single object (the stockyard's 231 kg "cut") is unusable by
a kitchen whose recipes take `count: 2`. Twelve pieces of 19 kg off a cow
is a primal; twelve of 2.4 kg off a ewe is a joint.

**D3 — Suet is not tallow, and raw fat does not fry.**
`/trade/ranching/thing/tallow.yaml` is renamed `suet.yaml`
("lump of suet", keywords `[suet, fat, leaf, kidney]` — never `tallow`).
The commons `animal-fat` material drops the `fat` tag (the cooking
MEDIUM tag) and gains `suet`; `render-tallow.yaml`'s slot becomes
`category: suet`. Nothing else matches `rendering`/`suet`
(`grep -rn "category: fat\|medium: fat" packages/content` → two
frying recipes, which read the rendered tallow's own `fat` tag).

**D4 — The tanpit: the HIDE reconciles against the pit it is in.**
See Host placement. Candidate (c). Maturation is not used; no
`MaturationProfile` field is added.

**D5 — Bark is a felling fact on the stand's mix entry.**
`StandSpecies.barkPath?: string | null`, authored beside `seedPath`
on the Wood row — *what a felled one is made of, drops, and sheds*. The
oak entry at `oak-clearing.yaml` authors `/trade/forestry/thing/bark`;
ash, birch and maple do not. `dropStandard` mints
`BARK_BUNDLES_PER_STANDARD = 4` bundles whose mass sums to
`BARK_FRACTION_OF_BOLE = 0.08` of the bole (≈ 13 kg each — carryable).
The planted-tree path reads the stand entry (else no bark), as it reads
`woodMaterialPath` today. Rejected: a `Species` field (a kernel edit for
one trade's fact, and the shipped pattern already keeps the wood and the
seed on the mix entry — promoting all three to `Species` is forestry's
own open design, deferred); a material tag on the wood (a tag cannot
name a row to mint).

**D6 — One candle: a bulk dip, material derived, no Discipline.**
The candle recipe takes a **bulk** slot (`category: candle-stock`,
`measureL: 0.12`, `requiresHeatK: 340` — above both melting points),
`outputApplication: tangible`, `outputMaterial: ''`, **no `discipline`
and no `difficulty`** (ungated — the requirements' own finding, and the
only way a player can make one at all; see Grounding). Beeswax and
tallow each gain the `candle-stock` tag (two material rows). The wax
cake becomes bulk through a second recipe, `melt-wax` (item `beeswax`
→ bulk beeswax into a `dip-pot`, `requiresHeatK: 335`); tallow is
already bulk from the render. The candle row moves from generic-objects
to `/trade/chandlery/thing/candle` naming the pack's `Candle` class
(`extends Lamp`), whose `getShortDescription()` / `getLongDescription()`
derive from the material (`<material> candle`; *"a hand-dipped taper of
<appearance>, a linen wick down the middle of it"*) and which composes
`SmellSourceMixin` with `odorIdentity` = the material's name. The two
materials' `appearance` strings carry the smell in prose (*"smelling
faintly of mutton"* / *"smelling of honey"*). Kernel slice: the
tangible arm derives its material from the **primary bulk input** when
`outputMaterial` is empty and no item matched (today it throws; a loaf
keeps authoring its material because bread is not dough). The
apiculture recipe and its row test are deleted.

**D7 — Two packs, scaffolded from `trade-apiculture`.**
`trade-tanning` (root `/trade/tanning`; src `lib/Tanning.ts`,
`thing/Hide.ts`, `thing/Tanpit.ts`, `idea/cmd/tanning/TanController.ts`)
and `trade-chandlery` (root `/trade/chandlery`; src `thing/Candle.ts`).
Each: `pack.yaml` with the forestry-shaped title claim
(`{ extent: /trade/<x>, holder: { organization: /compact/trade } }`),
`package.json` depending on `@saxonberg/server`, `-platform`,
`-base-library`, `-generic-objects` (tanning also `-trade-cooking` for
nothing at the class level — omit; the salt recipe is rows). Both are
added to `packages/server/package.json` (the deployment manifest), then
`pnpm install`. The hide ROW stays ranching's and names tanning's CLASS
(the fleece precedent, `trade-ranching/pack.yaml` describes it), so
`trade-ranching/package.json` gains `@saxonberg/content-trade-tanning`.

**D8 — The named refusal is a decision in both verbs, before the data.**
Order in `slaughter` and in the kitchen's `butcher` on a LIVE target:
sentient → **named** (`MixinApi.isNamed(t) && t.getName() !== ''` —
*"That is <Name>. You named it, and it is not meat."*) → species
yield empty (*"That is not something you slaughter/butcher."*) →
(butcher only) alive with a yield (*"It is alive. If you mean to kill it,
say so."*). `Livestock` is not `Named`, so a head of stock never trips
it; a `KeptAnimal` is. For the drive, Heart's Delight authors Quist's old
dog **with a name** (`name: Moss`, via `extends:` of the ranching row)
and casts the ranching row unnamed — AC4 and AC5 need two animals.

**D9 — Retiring the two collision lines.** W1 deletes the ranching
`butcher.yaml` and the `butcher:` line together; W2 drops `dress` from
cooking's view and the `dress:` line together. Each wave heals one
collision and deletes its row in the same commit, which is the gate's
own rule.

**D10 — Bone meal is a ground BULK, made beside a millstone, worked in
as organic matter.** `trade-farming` ships the `bone-meal` material
(`/stuff/idea/material/bulk/bone-meal`, tags
`[granular, solid, compost, feed, bone-meal, slow-amendment]`) and the
`bone-meal` recipe (item `category: bone` ×1 → bulk 4 L into an empty
`sack`-kind vessel, `toolCapabilities: [millstone]`, no discipline).
`FeedController` gains one branch: a source tagged `slow-amendment`
credits the ground's **organicMatter** through `Soil`'s work-in face
instead of nitrogen (*"a slow amendment by the act that works muck
in"* — honest, and no fifth reserve). The dog loaf
(`trade-baking`: `dog-bread` recipe — bran 0.5 L · offal ×1 · bone-meal
0.2 L · `cooking-fat` 0.1 L, oven heat, `discipline: baking`,
`difficulty: easy`; `dog-loaf` Provision row; `dog-bread` material,
edible, tags `[food, bread, feed]`) takes bone meal as bulk, so one step
serves both buyers.

**D11 — The flock is a row, the killing place is prose and a block.**
`hearts-delight/thing/flock-book.yaml` (`class: /trade/ranching/thing/Herdbook`,
`herdId: delight-flock`, species `ovis/aries`, `tally: 12`,
`holderRef: organization:/world/terminus/hearts-delight/idea/farm-business`,
`homeExtent: /world/terminus/hearts-delight`), on the yard's `props:`
with a `boot:` entry (the book files on `onCreate`). The yard gains
cooking's butcher block as a prop and a sentence. The hearts-delight
`package.json` gains `-trade-ranching` and `-trade-cooking`.

**D12 — Three premises, three vacant seats, no new Cast.** Under
`terminus/content/world/terminus/wharfside/`: `tannery/`
(yard with two tanpits, a `WaterFixture` leat, a consignment shelf;
outfit with `tanner` seat, `headcount: 1`, `requires: {discipline:
leatherwork, band: novice}`), `knackers-yard/` (yard with a butcher
block, a cook pot, a hearth, a tallow crock, a haulage works-board — the
knacker COLLECTS by posting a haulage job, the shipped shape at the oil
works; outfit with `knacker` seat, `requires: {discipline: butchery,
band: novice}`), `chandlery/` (shop with a hearth, a dip-pot, a counter
`Stock`; outfit with `chandler` seat and **no requirement**). Each
zone row + floor + outfit as the dyehouse is; floors and outfits are
`boot:` producers in `terminus/pack.yaml` (`lint:openings` arm 3). Exits
from `/world/terminus/wharfside/bank`. All under the existing industrial
parcel; no new title. The drive takes the chandler's seat (AC12).

**D13 — `leatherwork` is minted by the tanning pack**
(`/trade/tanning/idea/Discipline/leatherwork.yaml`, skill, iscedf 0723,
`synergizes: [textiles, tailoring]`). `tan` credits it; the jerkin stays
`tailoring`.

**D14 — A dead animal answers no ranching verb.** `handle`, `return`,
`breed` (ranching controllers) and the kernel `TapActController`
(`milk`/`shear`/`gather`) refuse an `Organism` that `isDead()` in words.
This is the price of D1 and the plan pays it explicitly.

**D15 — The tanning numbers are constants on the mixin**, not a
profile row: one consumer, and a 1:1 row with a catalogue to warm would
be the "separate butchery Idea" the species doc already refused.

---

## ⭐⭐ Host placement

| what | host | what composing it claims about every other composer |
|---|---|---|
| `TanningMixin` (`/trade/tanning/lib/Tanning`) — `tannage` 0..1, `tanStamp`, `_tanWorst`, reconcile-on-read | **`/trade/tanning/thing/Hide` only** | Nothing: the class has no other composer. ⚠ NOT `Provision` (would claim every food tans), NOT `Good`. The reconcile asks *"is my container a Tanpit with liquor covering me?"* — a condition read on the environment, never a narrowing of a host set, so no guard is needed anywhere. |
| `Hide` class = `Tanning(Crafted(WaterActivity(Freshness(Thermal(Good)))))` | pack class, named by ranching's row | Freshness needs Thermal beneath it (the gauge reads host temperature); Crafted carries the grade band the pit writes and the jerkin's `minGrade` reads; WaterActivity is salting (`solute`) and is what AC6 rides. **Not** `Provision`: a hide is not food, so ThermalDose, Composed, Sampled, Contaminable and the edible surface are claims it must not make. `lint:perishable` is satisfied because the new `rawhide` material rots and the class reaches `FreshnessMixin`. |
| `Tanpit extends CraftVessel` (`/trade/tanning/thing/Tanpit`) — `category: 'tanpit'`, 400 L, `liquidTight`, open; `liquorStrength()`, `covers(hide)`, `consumeBark(kg)`; `getLong()` reads the liquor in words | pack class | Claims a pit is a Container (hides and bark go IN it), Bulkable (water), Thermal (the liquor is as cold as the yard), Crafted/VesselKind/Serviceable/Contaminable (washable — tipping a pit is honest). Rejected `Vat`: composes `MaturingMixin` (a false claim of a batch over plain water) and is not a Container. The `tan` affordance static lives here (content affords the verb). |
| `ButcheryYield.fraction?` / `.conditioned?` + `Species.dressOut()` | `Species` (kernel data Idea) | Additive and optional: every shipped count row is byte-identical in behaviour. `dressOut` is read by the kitchen's controller, so `lint:unconsumed-seams` does not rise. |
| `StandSpecies.barkPath?` | the Wood row's `mix` entry (`trade-forestry/src/lib/Stand.ts`) | A stand fact beside `seedPath`; claims nothing about `Species`. |
| `Candle extends Lamp` + `SmellSourceMixin` (`/trade/chandlery/thing/Candle`) | pack class, one row | Claims only that a candle smells of what it is made of. Lamp's `lit`/fuel/light stay authored on the row. |
| `Livestock.leaveBook(note)` | `Livestock` | The book binding was already its field; the method is the inter-Stuff contract over it. |
| the named refusal | **no field** — reads kernel `NamedMixin` on whatever bound | `KeptAnimal` composes `Named`; `Livestock` does not; people are caught by `sentient` first. |
| `slow-amendment` branch | `platform/idea/cmd/bulk/FeedController.ts` + a material TAG | A universal rule about matter, keyed on the material; no host narrows. |
| dead-target refusal | `TapActController` (kernel) + three ranching controllers | *"An Organism that is dead gives nothing"* is true of every host; a hive is not an Organism and passes through. |
| tangible-from-bulk material derivation | `CraftingLogic.applyTangibleOutput` | *"A tangible made only of bulk is made of its primary bulk unless the recipe says otherwise"* — universally true; the loaf still authors bread. |
| `PreserveController.recipeFor(target)` | `trade-cooking`'s controller base | Among recipes sharing the subclass's cure axis (`solute` for `cure`), prefer the one whose item slot the named target's material satisfies; default unchanged. Cooking learns no tanning word; the tanning pack ships `salt-hide.yaml` with `cure: { solute: 0.55 }`, slot `category: rawhide`, output the hide row. |

### The tanpit decision, in full (D4)

The shipped mechanism with a different feedstock is **not** maturation;
it is `WaterActivityMixin` — an item's own state advancing against the
thing it is sitting in, read lazily, with no far-past guard. Tanning is
per-hide state (two hides put in a week apart are at different
tannage), driven by a condition the pit holds (bark in water, enough of
it to cover). The four candidates:

- **(a) hides as bulk, retting verbatim** — rejected. Bulk has no
  identity; a hide is a discrete, graded, marked, carried thing, and
  *"pour a hide into the pit"* is a sentence the fiction cannot say.
- **(b) extend maturation to convert contained items** — rejected.
  Maturation is one batch per vessel keyed to the interior material;
  what changes here is each item, and what depletes is the liquor. It
  would also be the cheese-wheel generalization built for the wrong
  first consumer (a hide is not ripening — the liquor acts on it).
- **(c) the hide reconciles on read; the pit is the condition** —
  chosen. `Provision.ts` and `DryController.ts` both already name the
  hide as this shape's next host.
- **(d) a durative engagement** — rejected; weeks, and it holds the hands.

The mechanism, as the mixin will implement it (dials in one `TANNING`
table at the top of the file, labelled playtest-tuned):

- `strength = min(1, barkKg / (litres × BARK_KG_PER_L_FULL))` with
  `BARK_KG_PER_L_FULL = 0.05` (a 400 L pit is full-strength at 20 kg —
  two bundles); `coverage = min(1, litres / (hideKg × FLOAT_L_PER_KG))`
  with `FLOAT_L_PER_KG = 4`; the rate is
  `strength × coverage / TAN_DAYS_AT_FULL` per game day,
  `TAN_DAYS_AT_FULL = 21`; frozen liquor (`< 275 K`) stalls. No
  Arrhenius term — the player's dials are bark, water, hides per pit and
  time, and nothing else is worth a number.
- Over-strength (`barkKg/litres > 2 × full`) writes `_tanWorst` down
  (the maturation worst-stretch shape); past `tannage 1.0` an unpulled
  hide keeps accruing and loses a band per `OVERRUN_PER_BAND = 0.3`
  (*"an over-tanned one cracks"*). At `tannage ≥ 1` the material swaps
  `rawhide → leather`, mass × `LEATHER_YIELD = 0.45`, the band written
  to the Crafted face, and the pit `consumeBark(hideKg × BARK_KG_PER_HIDE_KG)`
  (`= 1.2`, destructing bundles). A hide pulled early stays `rawhide` at
  partial tannage: it still rots (`Freshness` reads the rawhide material)
  and `look` says which — *"the liquor was thin for it"* when its
  recorded coverage/strength floor was low, else *"it has not been in
  long enough"*.
- `tan <hide> [in <pit>]` is `dry`'s twin: it puts the hide in the pit,
  refuses in words (no bark · no water · not a hide · already leather ·
  pit too full to cover it), narrates the prospect (*"a fortnight, if
  the liquor holds"*), and credits `leatherwork` at standard difficulty.
  `put hide in pit` also tans it — the clock is the hide's, not the
  verb's. `get hide from pit` is the judgement, shipped.
- The reagent gate (engineering question 2): **none on
  `MaturationProfile`**, because maturation is not the host. The gate is
  intrinsic — no bark, strength 0, nothing happens, and `look pit` says
  *"clear water, and nothing in it to tan with"*. Recorded for whoever
  first uses the `chemical` arm (soap's lye): `requiresReagent` would be
  that arm's missing half, and this build did not need it.

---

## Convention conformance

Checked at plan time against the current tree:

- `props:` / `cast:` on every room row (the yard uses both already).
- Locations: `SingletonCartesianLocation` for every new room, inside a
  `CartesianZone` sub-zone row per premises (the dyehouse shape). No
  `FurnishableRoom`.
- Paths: controllers at `<root>/idea/cmd/<category>/<Name>Controller.ts`
  with a row beside them (`lint:controller-rows`); views at
  `<root>/cmd/<category>/<verb>.yaml`. New categories: `tanning` (the
  trade's own step, per the CLAUDE.md verb rule); `slaughter` goes in
  ranching's existing `ranching` category.
- Module scope declares; pack `src/` imports the kernel by specifier
  only (`@saxonberg/server/mud/...`); no pack imports another pack's
  class — ranching's row names tanning's class by PATH.
- Verbs on objects: `Livestock.leaveBook`, `Hide.reconcileTanning` /
  `tanReport()`, `Tanpit.liquorStrength()` / `covers()` / `consumeBark()`,
  `Species.dressOut()`. No `XApi.verb(host, …)`, no free helpers, no new
  module category, no new `eslint-disable`.
- Pack mixin: `static _mixinName = 'TanningMixin'` + `static _mixinRefusal`;
  the name is nameable in `requires:` (federated registry);
  `lint:mixin-names` refuses a duplicate.
- Rows author `mass` + `_materialPath` (`lint:mass`), a `Lamp` row
  authors `lit:` (`lint:light-sources`), no `\"`-opened scalars
  (`lint:authored-prose`), every path-valued field resolves
  (`lint:census`), no `class:` naming `/lib/` (`lint:instanceable`), new
  roots claimed (`lint:untitled`).
- Gates this build must pass, by wave, named in § Test & gate strategy.
  The full family runs at every wave: `pnpm -C packages/server lint:family`.

---

## Waves

Each wave ends at one commit, lands independently, and runs
`pnpm test:near` + every touched pack's own `vitest run` + `lint:family`.

### W0 — The reconciliation slice (kernel)

Goal: the four engine facts every later wave stands on.

1. `packages/server/src/mud/platform/idea/species/Species.ts` —
   `ButcheryYield` gains `fraction?: number` and `conditioned?: boolean`;
   `setButcheryYield` validates (`fraction ∈ (0,1]`, `units ≥ 1`);
   `dressOut({ liveKg, fleshPct }): { cut; units; kgEach }[]` (count
   lines → `kgEach: 0`, meaning "the row's own mass"). Docstring: the two
   shapes and why both exist.
2. `packages/server/src/mud/platform/idea/api/CraftingLogic.ts`
   `applyTangibleOutput` — when `!primary` and `authoredMaterial` is
   empty, take `matched[0]?.material`; throw only when that is null too.
3. `packages/server/src/mud/platform/idea/cmd/inventory/TapActController.ts`
   — after the target narrows to `Producing`, refuse an `Organism` that
   `isDead()`: *"There is no taking anything off a dead animal."*,
   reason `target-dead`.
4. `packages/server/src/mud/platform/idea/cmd/bulk/FeedController.ts` —
   a source whose material carries `slow-amendment` credits
   `organicMatter` via the `Soil` work-in face (read
   `lib/husbandry/Soil.ts:175-190` for the method; do not add a reserve);
   `compost` behaviour unchanged. Help text gains one sentence.
5. Tests: `Species.dressOut` (count line untouched; fraction × finish;
   `conditioned: false` ignores flesh) in `platform/idea/species/__tests__/`;
   tangible-from-bulk in `CraftingLogic`'s tests (a recipe with one bulk
   slot and no `outputMaterial` mints the bulk's material, mass = L ×
   density); TapAct dead refusal; FeedController slow-amendment.

Acceptance: `lint:family` green; `unconsumed-seams` ≤ 19.
Commit: `build(carcass W0): the reconciliation slice — yield shape, bulk-made tangibles, a dead animal gives nothing, bone into the soil`.

### W1 — Ranching: one slaughter

Files under `packages/content/trade-ranching/`:

- `src/idea/cmd/ranching/SlaughterController.ts` (new) — resolve target
  (`model.target?.stuff`); refusals in D8 order; `await ConditionApi.die(animal, 'slaughtered')`;
  if the body is a `Livestock` with a herd, `await animal.leaveBook('slaughtered')`;
  scene (*"It is quick. <It> goes down where it stood."* / peers);
  credit `STOCKMANSHIP`, difficulty `standard`. Export nothing but the class.
- `content/trade/ranching/cmd/ranching/slaughter.yaml` (new) —
  `verbs: [slaughter]`, validators animate/conscious/embodied, `target`
  `required`, `scope: [reachable]`, `requires: HandlingMixin` (the set
  of animals you can put hands on — the dog must BIND so the refusal can
  be said). Help text states: no ceremony; it leaves a carcass; `butcher`
  it with a blade.
- `content/trade/ranching/idea/cmd/ranching/SlaughterController.yaml` (new) — `class:` + `data: {}`.
- **Delete** `src/idea/cmd/ranching/ButcherController.ts`,
  `content/trade/ranching/cmd/ranching/butcher.yaml`,
  `content/trade/ranching/idea/cmd/ranching/ButcherController.yaml`.
- `src/agent/Livestock.ts` — `commandContributions.peers`: replace
  `butcher.yaml` with `slaughter.yaml`; add `leaveBook(note: string): Promise<void>`
  (returnHead + tally − 1 through `StuffApi.singleton<HerdRegistry>(HERD_REGISTRY_PATH)`;
  a no-op when `herdId` is empty).
- Dead guards (D14): `HandleController.ts`, `ReturnController.ts`,
  `BreedController.ts` — refuse `MixinApi.isOrganism(t) && t.isDead()`
  in words before anything else.
- Species rows (`content/stuff/idea/species/…`): `ovis/aries` — stew-meat
  `{fraction: .40, units: 12}`, offal `{.10, 2}`, suet `{.04, 1}`, hide
  `{.08, 1, conditioned: false}`, bone `{.12, 2, conditioned: false}`;
  `bos/taurus` — .42/12 · .12/3 · .05/2 · .07/1 · .12/4; `sus/domesticus`
  — .50/12 · .12/3 · suet .08/2 · hide .06/1 · bone .10/2;
  `gallus/domesticus` — stew-meat `{units: 2}`, offal `{units: 1}` (count
  shape; no hide); `canis/familiaris` — **none**, with a comment saying
  the absence is the refusal.
- `content/trade/ranching/thing/tallow.yaml` → `suet.yaml` (D3);
  `base-library/…/material/food/animal-fat.yaml` tags (D3);
  `trade-cooking/content/recipes/render-tallow.yaml` slot `category: suet`.
- `packages/server/scripts/check-verb-collisions.ts` — delete the `butcher:` line.
- `pack.yaml` — `boot:` sync-read entries for the five farm species
  (the apiculture lesson: `ProducingMixin.taps()` resolves the species
  synchronously). Verify first whether `DraftController` already
  preloads; add the entries regardless — a pack declares its own rows'
  warmth.
- Tests: rewrite `src/__tests__/carcass-rows.test.ts` to walk the five
  species rows' `butcheryYield[].cut` (every path a shipped row, none a
  material); `slaughter.test.ts` — kill first/book second ordering (a
  stubbed failing `leaveBook` leaves a dead, still-drafted head), the
  named refusal, the no-yield refusal, the dog binding; dead guards.

Acceptance: `lint:verb-collisions` green with the line gone;
`lint:controller-rows`; `lint:census`; pack suite green.
Commit: `build(carcass W1): slaughter is a kill — the carcass is the join, the stockyard's butcher retired`.

### W2 — Cooking: `butcher` reconciled

Files under `packages/content/trade-cooking/`:

- `src/idea/cmd/crafting/ButcherController.ts` — reorder for a live
  target (D8); `species.dressOut({ liveKg: body.getMass(), fleshPct })`
  where `fleshPct = body.getReserve('flesh')?.current ?? 55`; for a
  fraction line mint `units` clones each `setMass(kgEach × (0.5 + 0.5 skill))`;
  count lines unchanged. Keep `ageAtKill`, `spillGut`, the block, the
  destruct. Delete the *"today the only one is a fish"* comment if the
  Contaminable carry now reaches stock.
- `content/trade/cooking/cmd/crafting/butcher.yaml` — `verbs: [butcher]`;
  help: *"A live animal is slaughtered, not butchered."*
- `src/idea/cmd/crafting/PreserveController.ts` — `recipeFor(target)`
  (Host placement table); `CureController` names its axis `solute`.
- `packages/server/scripts/check-verb-collisions.ts` — delete the `dress:` line.
- Tests: `butchery.test.ts` — a live named animal, a live unyielding
  animal, a live yielding animal; a 70 kg dead ewe yields twelve joints
  summing to ≈ 0.40 × 70 × finish; a cow yields more than a ewe (AC3);
  `PreserveController` picks a target-matching salt recipe when one
  exists and the default otherwise.

Acceptance: `lint:verb-collisions` green; pack suite green.
Commit: `build(carcass W2): butcher takes the animal's own yield, and dress is nobody's`.

### W3 — `trade-tanning`

- Scaffold `packages/content/trade-tanning/` from `trade-apiculture`
  (package.json name `@saxonberg/content-trade-tanning`, pack.yaml
  `root: /trade/tanning` + title claim, vitest.config.ts, tsconfig.json,
  README one paragraph). Add to `packages/server/package.json`;
  `pnpm install`.
- `base-library/content/stuff/idea/material/organic/rawhide.yaml` (new) —
  tags `[organic, skin, rawhide, once-living]` (⚠ **not** `hide`),
  `spoilActivationEnergy: 70000`, `waterActivity: 0.98`, density 1000,
  `biologicalSource: null`. Edit `leather.yaml`'s comment to say the
  pit makes it.
- `src/lib/Tanning.ts`, `src/thing/Hide.ts`, `src/thing/Tanpit.ts` (D4,
  Host placement). `Tanpit.commandContributions` affords
  `trade/tanning/cmd/tanning/tan.yaml` to `environment` + `peers`.
- `src/idea/cmd/tanning/TanController.ts` + row + `content/trade/tanning/cmd/tanning/tan.yaml`
  (`verbs: [tan]`; `hide` arg `requires: TanningMixin`; `pit` arg
  `prepositions: [in]`, `default: "reachable:[mixin.BulkableMixin and mixin.ContainerMixin]"`,
  `requires: [ContainerMixin]`; the controller narrows to `Tanpit` —
  `lint:instrument-args` holds).
- Rows: `content/trade/tanning/thing/tanpit.yaml` (`class: /trade/tanning/thing/Tanpit`,
  mass 60, `fixedInPlace: true`, prose), `content/trade/tanning/idea/Discipline/leatherwork.yaml`
  (D13), `content/recipes/salt-hide.yaml` (slot `category: rawhide`,
  salt 0.2 L, `cure: { solute: 0.55 }`, `outputTemplate: /trade/ranching/thing/hide`,
  `keywords: [salt-hide]`, no discipline).
- `trade-ranching/content/trade/ranching/thing/hide.yaml` —
  `class: /trade/tanning/thing/Hide`, `_materialPath: …/organic/rawhide`,
  prose unchanged (it already says the week and the salt);
  `trade-ranching/package.json` + `-trade-tanning`.
- Tests (`src/__tests__/`): the clock (a hide in a full-strength pit at
  21 days is leather at `fine`+; thin liquor at 21 days is rawhide and
  the report says "thin"; frozen stalls; an over-run hide drops bands;
  bark is consumed); the refusals; `salt-hide` lowers `a_w` so the
  Freshness growth rate falls below the untreated hide's; the row/class
  walk (every `class:` resolves; the hide row reaches `FreshnessMixin`
  — `lint:perishable` will say so too).

Acceptance: `lint:instanceable`, `lint:perishable`, `lint:mixin-names`,
`lint:untitled`, `lint:instrument-args`, `lint:controller-rows`, pack suite.
Commit: `build(carcass W3): trade-tanning — the hide tans against the pit it stands in`.

### W4 — Forestry: bark

- `trade-forestry/src/lib/Stand.ts` — `barkPath?: string | null` on
  `StandSpecies`; `setMix` copies it.
- `src/idea/cmd/forestry/FellController.ts` — `dropStandard` takes
  `barkPath`, mints `BARK_BUNDLES_PER_STANDARD = 4` bundles of
  `boleKg × BARK_FRACTION_OF_BOLE / 4` kg each, stamped and placed; the
  scene names the bark when there is any. `fellPlantedTree` passes
  `entry?.barkPath ?? null`.
- Rows: `content/trade/forestry/thing/bark.yaml` (`Good`, "bundle of
  bark", keywords `[bark, tanbark, bundle]`, material oak-bark, mass 13);
  `content/stuff/idea/material/organic/oak-bark.yaml` (tags
  `[organic, bark, tanbark, once-living]`, `biologicalSource` the oak).
  `rejection/…/hanging-wood/oak-clearing.yaml` oak entry gains
  `barkPath: /trade/forestry/thing/bark`. ⚠ The forestry pack is moving
  in a sibling build — rebase onto master before this wave and keep the
  diff to these four files.
- Tests: an oak felling drops four bundles and an ash felling drops none
  (AC9); the mass sum.

Acceptance: `lint:census` (the new path resolves), `lint:mass`, forestry suite.
Commit: `build(carcass W4): an oak gives its bark`.

### W5 — `trade-chandlery`

- Scaffold as W3. Add to the server manifest; `pnpm install`.
- `src/thing/Candle.ts` (D6). Row `content/trade/chandlery/thing/candle.yaml`
  (the generic-objects row moved: same `lit: false`, fuel reserve, 12 lm,
  1900 K; `shortDescription: candle` as the fallback stem; material
  authored tallow as the default a hand-cloned one reads as).
  `content/trade/chandlery/thing/dip-pot.yaml` (`CraftVessel`,
  `category: dip-pot`, 2 L, ceramic).
- Recipes: `content/recipes/candle.yaml` and `melt-wax.yaml` (D6).
- Tag edits: `base-library/…/organic/beeswax.yaml` tags += `candle-stock`,
  appearance += *", smelling of honey"*; `trade-cooking/…/material/tallow.yaml`
  tags += `candle-stock`, appearance += *", smelling faintly of mutton"*.
- Delete `generic-objects/content/stuff/thing/candle.yaml`,
  `trade-apiculture/content/recipes/candle.yaml`, and the `the candle`
  block in `trade-apiculture/src/__tests__/recipes.test.ts`; fix the
  apiculture README's claim.
- ⚠ Read `packages/server/src/mud/platform/idea/cmd/crafting/MakeController.ts`
  in full first: confirm a catalogue recipe with no script runs through
  `CraftingApi.craft`, and how `with <brand>` steers the bulk pick (the
  rail rule takes the cheapest `candle-stock` in reach otherwise). If
  `make` cannot steer, the drive keeps one feedstock in reach at a time.
- Tests: one row, two materials — `craft` with a tallow crock in reach
  mints a candle of tallow whose short description is *"tallow candle"*
  and whose odor is tallow; with a wax pot, beeswax; the recipe is
  ungated (`canMake` true for a fresh body); `melt-wax` fills a dip-pot.

Acceptance: `lint:light-sources` (the moved row), `lint:census`
(nothing names the old path), `lint:descriptors`, apiculture + chandlery suites.
Commit: `build(carcass W5): trade-chandlery — one dip, two fats`.

### W6 — Bone and the dog loaf

- `trade-farming`: `content/stuff/idea/material/bulk/bone-meal.yaml`,
  `content/recipes/bone-meal.yaml` (D10). ⚠ `trade-farming` has **no
  `content/recipes/` directory today** (verified: `archetypes/ stuff/ trade/`)
  — create it; recipes are the `recipe` document kind the installer
  reads from `content/recipes/` in every pack that has one, and nothing
  in a manifest enumerates it. `bone` (`tissue/bone`) carries the `bone`
  tag (`tags: [tissue, animal, bone, mineral, skeletal]`).
- `trade-baking`: `content/stuff/idea/material/food/dog-bread.yaml`,
  `content/trade/baking/thing/dog-loaf.yaml` (Provision),
  `content/recipes/dog-bread.yaml` (D10).
- `terminus/…/market/thing/bread-counter.yaml` — a `stockLines` line
  and a `prices` entry for the dog loaf, priced under the lean loaf.
- ⚠ Read `trade-baking/src/idea/cmd/baking/BakeController.ts`: if `bake`
  is deed-gated for a player, the drive `order`s the dog loaf at the
  counter (the baker's seat fulfils `baking`; the drive's step 18 says
  "bake" and the plan records which route ran).
- Tests: the two recipes resolve, their slots name shipped tags, the
  dog loaf is edible; `feed <field> with <bone-meal sack>` credits
  organicMatter and not nitrogen (W0's branch, exercised against the
  real material).

Acceptance: `lint:census`, `lint:perishable` (dog-bread on a Provision), packs' suites.
Commit: `build(carcass W6): bone goes to the field and the dog gets a loaf`.

### W7 — The world: the valley and the city's edge

- Heart's Delight (`packages/content/hearts-delight/`): `thing/flock-book.yaml`
  (D11); `agent/moss.yaml` (`class: /trade/ranching/agent/WorkingAnimal`,
  `extends: /trade/ranching/agent/farm-dog`, `name: Moss`, a sentence of
  its own); `location/farmstead-yard.yaml` — `props:` += flock-book,
  `/trade/cooking/thing/butcher-block` (confirm the row path under
  `trade-cooking/content/trade/cooking/thing/`); `cast:` +=
  `/trade/ranching/agent/farm-dog`, `agent/moss`; prose: a line for the
  flock on the bench, the block and the hook by the barn door.
  `pack.yaml` `boot:` += the flock book (producer: files the flock).
  `package.json` deps += ranching, cooking.
- Terminus (`packages/content/terminus/content/world/terminus/wharfside/`):
  `tannery.yaml`, `tannery/{location/yard,idea/outfit,thing/leat,thing/shelf}.yaml`;
  `knackers-yard.yaml`, `knackers-yard/{location/yard,idea/outfit}.yaml`
  (props: butcher block, `/trade/cooking/thing/cook-pot` or the shipped
  pot row, a hearth, a tallow crock, `/trade/haulage/thing/works-board`);
  `chandlery.yaml`, `chandlery/{location/shop,idea/outfit,thing/counter}.yaml`
  (props: hearth, dip-pot, a `Stock` counter with a candle price).
  `bank.yaml` gains the three exits. `pack.yaml` `boot:` += the three
  floors and three outfits (producers, with reasons). Light: each room
  lit by spill from the bank or by its hearth — author no ambient.
  Businesses: `appointingAuthority: { kind: office, office: minister-of-trade }`
  (the oil works' shape), `banksAt: goodkin`, `operatingLocations` the
  floor + the counter/shelf, one position each with `headcount: 1` and
  D12's `requires`, **no `rosterSlots`**.
  `terminus/package.json` deps += `-trade-tanning`, `-trade-chandlery`, `-trade-cooking` if absent.
- Tests: the terminus/hearts-delight row tests that exist (if any) extend
  to the new rows; otherwise rely on the gates.

Acceptance: `lint:openings` (three advertised houses are boot producers;
`requires` vocabulary; disciplines resolve — `leatherwork` exists from
W3), `lint:dossiers` (no new Cast), `lint:light-sources`, `lint:census`,
`lint:kept-animals` (Moss's species authors both dials), `lint:mass`,
`lint:menu-staff` (no new menu with a disciplined recipe).
Commit: `build(carcass W7): the valley raises a flock; three vacant seats at Wharfside`.

### W8 — The drive, the suite, the MR

- `packages/wire/tests/carcass-chain.dirty.wire.test.ts` — the
  requirements' twenty steps as checkpoints, one `it` per step, each
  able to FAIL (assert the envelope: notes, reasons, the words). Dirty
  because it slaughters persisted stock and fells a persisted oak.
  `declareFile` packs: ranching, cooking, tanning, chandlery, forestry,
  farming, baking, textiles, tailoring, apiculture, generic-objects,
  base-library, hearts-delight, rejection, terminus. Clock jumps via
  `advanceWorldClock` under `isOwnedTestWorld()`: ~120 game days after
  the draft (wool), ~25 game days after `tan`, ~8 game days for the
  green hide left to rot (AC6's first half, on a second hide).
- `grep -ln "butcher" packages/wire/tests/*.ts` and update any drive
  that typed `butcher` at a live head (farmstead, taps, cooking).
- Run it (`WIRE_BOOT=1 WIRE_PORT=<this worktree's port> …`), fix what it
  finds, append the record to § Drive record, then `pnpm test` once,
  push, open the MR.

Commit: `drive(carcass): <what driving found>`.

---

## Reachability wiring

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| `slaughter` | `trade/ranching/cmd/ranching/slaughter.yaml` | `Livestock.commandContributions.peers` (a head in the room) | controller row `…/idea/cmd/ranching/SlaughterController.yaml`; species `butcheryYield` rows | farm species resident (ranching `boot:` sync-read) | `requires: HandlingMixin` — stock AND the dog bind; the refusal is spoken |
| `butcher` (reconciled) | cooking's view, `verbs: [butcher]` | a `bladed` construction in reach (unchanged) | species rows; `Species.dressOut` | `preloadAnatomy` in the controller (unchanged) | `body: requires: any` (unchanged) |
| `tan` | `trade/tanning/cmd/tanning/tan.yaml` | `Tanpit.commandContributions` (environment + peers) | `TanController.yaml` row; `tanpit.yaml`; `rawhide` material; hide row's class | the tannery yard is a `boot:` producer; the `Tanpit` composes nothing that needs warming | `hide: requires: TanningMixin` (federated pack name); `pit` declared with an MQL default |
| salting a hide | cooking's `cure`/`salt` (unchanged) | born-with | `salt-hide.yaml` recipe + `PreserveController.recipeFor` | `RecipeCatalogue` warms on create | `requires: any` (unchanged) |
| the candle | platform `make` (and `order` at the chandler's counter) | `make` is unafforded-by-content (born-with); verify in `MakeController` | `candle.yaml` + `melt-wax.yaml` recipes; `candle-stock` tags; the row | catalogue warm | none — and **no deed gate** (D6) |
| bark | forestry `fell` (unchanged) | the stand (unchanged) | `barkPath` on the oak's mix entry; `bark.yaml`; `oak-bark` material | the clearing is already live content | none |
| bone to soil | platform `feed` (unchanged) | born-with | `bone-meal` material tag `compost` + `slow-amendment`; the recipe | — | `source: mustHaveBulkSlot` (a sack) |
| the dog loaf | `bake` / `order` | the oven / the baker's seat | recipe + rows + counter price | the bakery is live content | — |
| the flock | `draft` (unchanged) | `Herdbook.commandContributions` | `flock-book.yaml` | hearts-delight `boot:` producer | — |
| the seats | `apply` (unchanged) | `LookController` prints openings | three outfits with `headcount` | terminus `boot:` producers | `requires` closed vocabulary |
| the dog eats | none (the `feeds` brain) | `BehavedMixin` on `WorkingAnimal` | species `feedingStyle` includes `ground` | the yard is live | — |

Each of these fails closed and silent; the drive is what proves them.

---

## Acceptance-criteria coverage

| AC | waves |
|---|---|
| 1 alive → worn jerkin | W1 (slaughter) · W2 (butcher) · W3 (salt, tan → leather with the `hide` tag) · shipped tailor at Mayfield Row · W8 proves it |
| 2 same act, same object, same skill, same clock | W1 + W2 (D1; the dead `Livestock` is the carcass; `sinceDeath` unchanged) |
| 3 condition and species pay off | W0 (`dressOut`) · W1 (rows) · W2 (consumer) |
| 4 `butcher` a farm dog refused, the world's view | W1 (no yield on `canis`) · W2 (live-target order) · W7 (the unnamed collie cast) |
| 5 a named animal refused differently | W1 + W2 (D8) · W7 (Moss) |
| 6 green hide rots in a week; salted travels | W3 (`rawhide` perishable on a Freshness host; `salt-hide`) |
| 7 two candles, same command, look/smell different, both light | W5 (+ W0's derivation) |
| 8 the fleece spins and weaves | W7 (the flock) · shipped `shear` → `TextileStock` · shipped textiles |
| 9 oak gives bark, birch does not | W4 |
| 10 the dog eats a baked loaf with no verb | W6 (edible loaf) · W7 (dog, `ground` feeding) · shipped `feeds` |
| 11 nothing a carcass produces has nowhere to go; no false claim | W1 (horn claim deleted with the controller) · W3 (hide) · W6 (bone, offal) · W2 (meat) · D3 (suet → render) |
| 12 three jobs vacant, visible, takeable | W7 · W8 takes the chandler's |
| 13 `dress` means nothing twice | W2 |
| 14 a dead animal refuses the six live-animal verbs, in words | W0 (the kernel tap guard) · W1 (the three ranching guards, D14) |

No criterion is unmapped.

---

## Test & gate strategy

- **Unit, per wave**: listed inside each wave. New pack suites run under
  the shared `callSecPlugin` vitest config; kernel changes get tests
  beside the file. Every test touching the wired runtime imports
  `@saxonberg/server/test-bootstrap` (`lint:test-bootstrap`).
- **Only the drive can prove**: the five reachability links per
  capability; that `make candle` is reachable for a player; that the
  dog eats after the player leaves; that the flock book files on first
  visit; that the three openings print on `look`.
- **Gates by wave** (all of `lint:family` runs every wave; these are the
  ones that will actually move): W0 `lint:unconsumed-seams`,
  `lint:gates`; W1 `lint:verb-collisions`, `lint:controller-rows`,
  `lint:census`; W2 `lint:verb-collisions`; W3 `lint:instanceable`,
  `lint:perishable`, `lint:mixin-names`, `lint:untitled`,
  `lint:instrument-args`, `lint:imports`; W4 `lint:census`, `lint:mass`;
  W5 `lint:light-sources`, `lint:descriptors`, `lint:census`; W6
  `lint:perishable`, `lint:census`; W7 `lint:openings`, `lint:dossiers`,
  `lint:kept-animals`, `lint:light-sources`, `lint:menu-staff`; W8
  `lint:drive-scripts` (zero one-off scripts).
- `pnpm test` runs **twice**: before the MR opens (end of W8) and at
  `/finalize`. Everything between is `test:near` + pack suites + lints.
  Never in the background.

---

## Risks & opens

Things the build decides in order (requirements → this plan →
design-lenses → CLAUDE.md → nearest pattern), recorded here so the
fresh agent knows they are foreseen:

1. **`make` and the catalogue.** `MakeController` is documented as a
   recipe-SCRIPT runner; apiculture's README says `make` crushes comb,
   so a catalogue path exists — but confirm before W5, and confirm how
   the bulk pick is steered. Fallback: one feedstock in reach per candle
   in the drive.
2. **`bake` for a player.** If deed-gated, step 18 runs as `order dog
   loaf` and the record says so. Not a scope change: the requirement is
   that the loaf is baked in the bakery and priced on the slate.
3. **Wool on a fresh draft is zero.** The drive jumps ~120 game days
   between `draft` and `shear`. Seeding a `continuous` tap's standing
   from the head's age at draft is the honest fix and is ranching's own
   follow-on, not this build's.
4. **A dead sheep still carries `herdId`.** D14's guards close the verbs;
   `draft` cannot re-issue the head because `leaveBook` wrote
   `slaughtered`. If the book write failed, the head stays `drafted` and
   the carcass is butcherable — recorded as the honest failure state.
5. **The far-past guard and a 120-day jump.** Cast are unowned bodies
   and guarded; the drafted ewe is `Livestock` and is NOT guarded once
   stamped. Draft, then jump, then act within one session — the taps
   drive survived a month this way.
6. **Hide class move changes what `cook`/`eat` see.** A hide is no
   longer a `Provision`; anything that enumerated Provisions for food
   (menus, `isEdibleMatter`) loses a thing that was never food. Expected
   and correct.
7. **Rebase hazard on forestry.** W4 touches four forestry files while a
   sibling build works the pack; merge master before W4.
8. **The knacker's "bring him" step.** A 70 kg carcass cannot be carried;
   the yard's works-board is how a knacker collects (a haulage job). The
   drive proves AC2 on a fought-over animal where it fell and visits the
   yard for AC12. If the user wants collection driven end to end, that
   is logistics' drive, not this one.
9. **`candle-stock` on tallow makes every tallow crock a candle source.**
   Intended: the chandler buys the same tallow the kitchen fries in.
10. **`check-mass` ceiling.** Every new Tangible row authors `mass` and
    `_materialPath`; the ceiling must not rise.
11. ⚠ **User question, not for the build to guess:** whether the three
    Wharfside seats should require `band: novice` in a Discipline a new
    player cannot yet hold (tanner, knacker) — the plan ships them that
    way because *"a seat names a Discipline"* is the requirements' own
    sentence, and the chandler's seat is the one the drive takes. If the
    user wants all three takeable on day one, drop `requires` to
    `{ gigs: 0 }` — a row edit, no code.

---

## Deferred seams

Each leaves as a slate line, never as a plan section:

- **A corpse does not remember it was named.** `mintCorpseFrom` carries
  no name stamp, so butchering a dead pet's body is not refused.
  → `pets-slate` (the named body).
- **Tap standing at draft** (risk 3). → `ranching-slate`.
- **The pit's liquor as the dyer's tannin.** `tannin.yaml` still has no
  producer; a `pour pit into vat` as a mordant source is one recipe
  away. → `dyeing`'s slate / `rendering-slate`.
- **`requiresReagent` on the `chemical` maturation arm** — the first
  `chemical` consumer (soap's lye) decides. → `rendering-slate § 9`.
- **Promote `woodMaterialPath` / `seedPath` / `barkPath` onto `Species`.**
  → `forestry-slate`.
- **Horn, glue, gelatin, kibble, soap, droving, the shambles, the
  tanpit's effluent** — already assigned by the requirements to
  `rendering-slate`, `zoning-slate`, logistics.
- **The knacker as a collection round** (a standing haulage posting).
  → `logistics-slate`.
- **The `BulkPayload` tannin field** — if a third liquor consumer wants
  concentration rather than coverage, that is the generalization point
  `bulk.md` names. → `bulk`'s notes.

---

## Critical files

Read these first, in this order:

1. `/home/bobalu/play/saxonberg/build-1/docs/requirements/carcass-chain-requirements.md`
2. `/home/bobalu/play/saxonberg/build-1/CLAUDE.md`
3. `/home/bobalu/play/saxonberg/build-1/packages/server/src/mud/platform/idea/api/ConditionLogic.ts` (lines 304–420: the non-player death branch)
4. `/home/bobalu/play/saxonberg/build-1/packages/content/trade-ranching/src/idea/cmd/ranching/ButcherController.ts` (to delete) and `HandleController.ts` + `src/lib/Handled.ts` (the precedent)
5. `/home/bobalu/play/saxonberg/build-1/packages/content/trade-ranching/src/agent/Livestock.ts`, `src/idea/HerdRegistry.ts`, `src/thing/Herdbook.ts`
6. `/home/bobalu/play/saxonberg/build-1/packages/content/trade-cooking/src/idea/cmd/crafting/ButcherController.ts`, `PreserveController.ts`, `DryController.ts`
7. `/home/bobalu/play/saxonberg/build-1/packages/server/src/mud/platform/idea/species/Species.ts` (lines 36–60, 740–800, 1176–1200)
8. `/home/bobalu/play/saxonberg/build-1/packages/server/src/mud/platform/thing/Provision.ts`, `CraftVessel.ts`, `Lamp.ts`
9. `/home/bobalu/play/saxonberg/build-1/packages/server/src/mud/lib/material/WaterActivity.ts` and `Freshness.ts` (the item-side clock shape)
10. `/home/bobalu/play/saxonberg/build-1/packages/server/src/mud/platform/idea/api/CraftingLogic.ts` (lines 1442–1530, 1560–1600, 2250–2260)
11. `/home/bobalu/play/saxonberg/build-1/packages/server/src/mud/platform/idea/cmd/crafting/MakeController.ts` and `CraftController.ts`
12. `/home/bobalu/play/saxonberg/build-1/packages/content/trade-forestry/src/idea/cmd/forestry/FellController.ts`, `src/lib/Stand.ts`
13. `/home/bobalu/play/saxonberg/build-1/packages/content/trade-apiculture/` (the scaffold to copy; `pack.yaml`, `package.json`, `vitest.config.ts`, `src/`)
14. `/home/bobalu/play/saxonberg/build-1/packages/content/terminus/content/world/terminus/wharfside/dyehouse/` and `goods-yards/oilworks/` (the premises pattern) + `terminus/pack.yaml`
15. `/home/bobalu/play/saxonberg/build-1/packages/content/hearts-delight/` (all of it; it is small)
16. `/home/bobalu/play/saxonberg/build-1/packages/server/scripts/check-verb-collisions.ts`
17. `/home/bobalu/play/saxonberg/build-1/packages/wire/tests/taps.dirty.wire.test.ts` and `packages/wire/src/harness/index.ts`
18. `/home/bobalu/play/saxonberg/build-1/docs/subsystems/ranching.md`, `maturation.md` (§ Generalization notes), `spoilage.md` (§ The water state), `content-packs.md` (§ The capability rung, § The boot union), `employment.md` (§ The opening)

Docs the sweep will touch: `ranching.md` (slaughter, the carcass, D14),
`crafting.md` (tangible-from-bulk), `forestry.md` (bark), `spoilage.md`
(the hide as the second WaterActivity host), `light.md` (the candle's
home), a new `docs/subsystems/tanning.md`, `content-packs.md`'s pack
count, and the `CLAUDE.md` verb-category line (`tanning`: `tan`;
`ranching` gains `slaughter`). `rendering-slate` and `textiles-slate`
get their stale lines corrected.

---

## Drive record

*(appended at build time, not at plan time — the output of running
`packages/wire/tests/carcass-chain.dirty.wire.test.ts` against the
running game: the command, the count, and what each failure was.
Precedent: `farming-plan.md § Checkpoint A`.)*
