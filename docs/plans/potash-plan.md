# Potash — implementation plan

Executes [potash-requirements.md](../requirements/potash-requirements.md)
(**kind: feature · leads from: CONTENT** — rows on shipped mechanisms, with
kernel corrections each naming a shipped consumer). The build makes a
burner's ash **sized and strengthened by the wood** (the grate, the clamp
and a new ash pit on one rule), gives `fell` a fourth yield (**brash**),
derives **lye strength** in the hopper (ash, passes, hardness) and reads
it with an **egg** on the shipped `density` channel, corrects the misnamed
`soda-from-lye` into **lye → black salts** in an iron pot that is a mould,
fires black salts to **pearl ash** by a `fire` recipe, re-tags the glass
batch's slots (`flux` / `stabilizer`), gives the soap kettle **slaking**
and **causticizing** for a direct hard-soap route, and stands up the
**Hanging Wood ashery**, the glasshouse's and the chandlery's **buying
lines**, and the **ash-man's round**. Everything else is a row, a tag or a
deletion. A new capability pack, `trade-potash` at `/trade/potash`, carries
the trade; `trade-fuel` keeps ownership of ash itself.

Branch `reqs/potash` (worktree `build-2`), cut off `origin/master` after
the cleanliness merge (!380). ⚠ Vocabulary, from the slate: *wood ash* and
*the ash tree*, never bare *ash* in prose or keywords that could bind the
tree.

---

## Grounding

Verified by opening files on 2026-10-19. Where this corrects a premise in
the requirements or the task brief, it says so inline.

### The burner's ash (the grate rule)

- `packages/server/src/mud/lib/fire/Burner.ts` — `ashKg` (persistent
  runtime state, `fieldMeta` line 385), accrued in `consumeFuel` (line
  1031: `ashKg += mass × fraction × material.getAshFraction()`, per
  material in the bed). `rakeGrate(raker)` (line 401) → `takeAsh()`
  zeroes the bed, soils the raker's hands, and when `kg > 0.01` clones
  **ONE** `cleanliness.ashTemplate` (default `/trade/fuel/thing/wood-ash`),
  `recordMadeFrom([self])` (so it is the hearth owner's), `setMass(kg)`,
  moves it into the raker (or the room). `ashChoke()` (line 439) reads the
  `fire.ash.*` dials. ⚠ There is no alkali/strength state on the burner;
  the raked heap is one object of whatever mass.
- `packages/server/src/mud/lib/material/Material.ts` — `ashFraction`
  (line 852; `fieldMeta` line 1059, `persistent, spoiler: 1`),
  `getAshFraction`/`setAshFraction` (line 1192). No `alkaliShare` exists.
  `cleanser` (line 845, `ref: 'identity:constituent'`) is how a material
  names what it washes as. `corrosiveTo` + `corrodeOnContact(by, {site})`
  (line 1550) is the caustic contact harm; its production callers are
  `ThrowController`, `MagicLogic` and the chandlery `Hopper` (below) — NOT
  `GetController` (the brief's "handling quicklime barehanded harms" has no
  shipped `get` hook; see D14).
- Wood rows: `packages/content/base-library/content/stuff/idea/material/wood/{oak,ash,beech,elm,birch,hazel,maple,willow,yew}.yaml`
  author `ashFraction: 0.01`; `pine.yaml` `0.005`. None carries an alkali
  figure. `beech.yaml` is the shape (tags `[wood, mixture, organic,
  flammable, once-living]`). ⭐ Material rows support `extends:`
  (`material/organic/rubber-scorched.yaml` extends `organic/rubber`).
- The ash rows: `packages/content/trade-fuel/content/trade/fuel/thing/wood-ash.yaml`
  (`/platform/thing/Provision`, mass 0.6, `gradeBand: poor`, material
  `/stuff/idea/material/organic/ash`) and `…/thing/ash.yaml` (the clamp's
  "drift of pale ash", same class, same material, mass 0.6). The material
  `packages/content/trade-fuel/content/stuff/idea/material/organic/ash.yaml`
  carries tags `[organic, mineral, residue, potash, once-living]`. ⚠ A
  Provision hangs a freshness clock, a cure state and a pathogen population
  on a heap of ash (the cordwood row's own header records the same mistake
  for a stick).
- Settings: `fire.ash.chokeStartShare/chokeFullShare/chokedDraught` in
  `packages/content/platform/content/settings/fire.yaml` (line 144+);
  keys in `packages/server/src/mud/lib/config/AppSettings.ts`
  (`fireAshChokeStartShare` line 1798, `cleanlinessAshTemplate` line 2367).
  A pack ships its own dials under `content/settings/<x>.yaml`
  (`trade-glass/content/settings/glass.yaml`).
- The sweep: `packages/content/platform/content/platform/cmd/inventory/sweep.yaml`
  (target `requires: any`, tool default on `capability.sweeping`) →
  `platform/idea/cmd/inventory/SweepController.ts` → `Burner.rakeGrate`.
  `stoke.yaml` (`fuel` arg `requires: TangibleMixin`; `burner` default
  `reachable:[mixin.BurnerMixin]`) lays fuel in the **bed** and destructs
  the item (`Burner.ts` line ~1000); `ignite.yaml` target `requires:
  CombustibleMixin|BurnerMixin`. ⚠ **Correction to the requirements'
  wording:** a Burner's fuel is laid with `stoke`, never `put` — `put X in
  <burner>` is only meaningful for a `Container` burner (an Oven) and puts
  the wood in the *chamber*, where it is heated, not burnt as bed fuel. The
  ash pit's lay-in is `stoke pit with brash` (see D2).
- Burner-family compositions (`packages/server/src/mud/platform/thing/`):
  `Forge extends Firebox` (bare); `Brazier = SpaceHeating(Placing(Firebox))`;
  `Campfire = SpaceHeating(Postured(Slotted(Placing(Firebox))))`;
  `Hearth = Flued(SpaceHeating(Placing(Firebox)))`;
  `Oven = Flued(Container(Placing(Firebox)))`. The generic kiln row is
  `packages/content/generic-objects/content/stuff/thing/Kiln.yaml`
  (`/platform/thing/Oven`, 1200 K, `maxBurnPowerW 25000`,
  `fuelCapacityKg 60`, carries `unreachable: exemplar` although the
  glasshouse props it). `lint:light-sources` clauses (g) `lit:` and (h)
  power + fuel path apply to any new burner row
  (`packages/server/scripts/check-light-sources.ts` lines 671–735).

### The clamp

- `packages/content/trade-fuel/src/idea/cmd/fuel/CharController.ts` —
  `openClamp` (module function): `outcome = pit.outcomeFor()`; for `ash`
  the count is **1** and the row is `pit.getAshTemplate()`
  (`/trade/fuel/thing/ash`, fixed mass 0.6). The charge is every
  `cordwood`-keyword item in the pit; each is destructed after. Credits
  `colliery`.
- `packages/content/trade-fuel/src/thing/CharcoalPit.ts` —
  `ContainerMixin(Firebox)`, affords `trade/fuel/cmd/fuel/char.yaml` from
  its own `commandContributions` (environment + peers); `outcomeFor`,
  `yieldFor`, three template fields. `clamp.yaml` row: `maxBurnPowerW
  2000`, `fuelCapacityKg 4000`, `draught 0.45`.

### The hopper, the soap, the misnamed profile

- `packages/content/trade-chandlery/src/thing/Hopper.ts` —
  `ContainerMixin(Vat)`; overrides `matchProfile(material)`: only water
  matches, only while a `potash`-tagged item is in it, and **every ash
  item is destructed** (`StuffApi.destruct`) when the match fires; returns
  the `lye-leach` profile. `afterPouredOutBy` — bare-handed draw of a
  `caustic` liquor splashes the face (`corrodeOnContact(by, {site:
  'body.head'})`) unless `outermostAt(hand) !== null`.
- `…/content/trade/chandlery/idea/maturation/lye-leach.yaml` — `chemical`,
  `inputCategory: lye-leach` (never matched by tag — the hopper returns it
  by key), `ratePerDay 2`, product `/trade/chandlery/idea/material/lye`.
  `lye.yaml` material: tags `[liquid, caustic, alkali, lye]`,
  `corrosiveTo [protein, tissue]`, `cleanser: /platform/idea/Cleanser/lye`.
  **No strength anywhere** — not on the profile, not on the payload.
- `…/src/thing/SoapKettle.ts` — `MaturingMixin(CraftVessel)`; `CraftVessel`
  composes `ContainerMixin` (so `put <item> in kettle` works). Its
  `soapTransform` (fat+lye → `soap-paste`; soft-soap+salt → `hard-soap-curd`)
  rides `classifyForeignPour` → `'transform'` (any phase) and
  `applyForeignPour` → `rekeyBatch`. `saponification.yaml` (`chemical`,
  `soap-paste` → `soft-soap`, glycerin lees). `hard-soap-curd.yaml`
  drain-sets to `hard-soap` (`drainSetting`) in the `soap-frame` (a mould).
- ⚠⚠ `packages/content/trade-fuel/content/trade/fuel/idea/maturation/soda-from-lye.yaml`
  — `evaporative`, `inputCategory: lye`, `happyK 290` (air-dried),
  `productFraction 0.1`, product `/stuff/idea/material/bulk/washing-soda`.
  **Never driven** (no `soda` step in `packages/wire/tests/cleanliness.dirty.wire.test.ts`).
  The washing-soda material (`trade-fuel/…/material/bulk/washing-soda.yaml`,
  tags `[solid, mineral, alkali-mild, washing-soda]`, `cleanser:
  /platform/idea/Cleanser/washing-soda` with `softens: true`) and the bag
  row (`…/thing/washing-soda.yaml`) are sold at the general store
  (`terminus/…/general-store/counter.yaml`) — the stocked line already
  exists.
- Cleanser rows: `packages/content/platform/content/platform/idea/Cleanser/{lye,washing-soda,stale-urine,…}.yaml`;
  a cleanser is loaded by the material's `cleanser:` path, never by a
  catalogue (cleanliness B50) — so a pack may ship one under its own root.
- The chandlery venue: `packages/content/terminus/content/world/terminus/wharfside/chandlery/{location/floor.yaml,thing/counter.yaml,idea/outfit.yaml}`
  — a `PersistentLocale` propping `/stuff/thing/Hearth`, the hopper, the
  kettle, the frame, a rack; a `/trade/shopkeeping/thing/Stock` counter
  with `stockLines` (wood-ash `par: 4`, price **1**) and NO `buys:` line;
  the outfit is a Business with one seat anyone can take (`purchases:
  true`), `banksAt: goodkin`.

### Maturation's `evaporative`, moulds, the set

- `packages/server/src/mud/lib/maturation/Maturing.ts` —
  `reconcileEvaporativeWindow` (line ~1313): `f` advances by
  `profile.getRatePerDay() × Evaporation.evaporationFactor(…)` per segment
  — ⚠ **independent of the batch's volume and of its product fraction**
  (the reference volume `startL` is only used to size the shrink and the
  rain setback); at `f ≥ 1` it `ensureInteriorMaterial(product)` and sets
  the amount to `startL × profile.getProductFraction()`. `getGravity()`
  (line 828) = `1 + remainingSugar × k` (a lye reads 1.000). `matchProfile`
  is the one `@hook` (line 1471). `classifyForeignPour` (line 1240) only
  returns `'transform'` for an ACTIVE batch unless a host overrides it (the
  kettle does). `setGrade` while idle records `batchInputBand`;
  `applyBatchGrade` is weakest-link over worst stretch, input band,
  maturity and scald. `ensureInteriorMaterial` (line 1163) swaps the bulk
  material and **keeps the payload** (`Bulkable.ts` line 883 clears it only
  on empty).
- `MaturationProfile.ts` — the field list (lines 210–372); `productFraction`
  is a profile-level constant.
- The set site: `packages/server/src/mud/lib/thermal/Thermal.ts`
  `reconcileBulkPhase` (line 1313): a liquid-holding vessel whose bulk
  material is below its melting point **solidifies** — `castInto` on a
  `Mould` host (line 1391, `stampMaterial: !mat.hasTag('liquid')`), else a
  `Material.getCastTemplate()` clone dropped beside it. So a batch that
  finishes as a `solid`-tagged material at room temperature sets on the
  next thermal reconcile — which is how the shipped soda profile would
  have produced a cast lump beside the pan, had it ever run.
- `packages/server/src/mud/lib/mould/Mould.ts` — `castTemplateFor`,
  `castInto(pool: SetPool {material, massKg, payload, stampMaterial})`,
  the mould's grade → the cast's grade; composer precedent
  `packages/content/trade-dairying/src/thing/Hoop.ts` =
  `PlacingMixin(MouldMixin(DurableMixin(CraftVessel)))`; the ingot mould
  row `trade-smelting/…/thing/ingot-mould.yaml` (`castTemplate`,
  `reusable`, `discipline`).
- Shipped evaporative rows: `trade-quarrying/…/maturation/brine.yaml`,
  `trade-forestry/…/maturation/{maple-sap,birch-sap}.yaml`, and the
  soda row above. The `brine-pan.yaml` header records that an OPEN vessel
  lets a poured liquid run through (the closure ladder) — the hopper and
  kettle rows work because they author `open`/closure honestly.

### The glass batch and the tags

- `packages/content/trade-glass/content/recipes/glass-batch.yaml` and
  `glass-batch-amber.yaml` — slots `sand: silica ×2`, `flux: potash`,
  `lime: alkali`; `requiresHeatK 1400`, `massYield 0.72`, output
  `/trade/glass/thing/melt`.
- ⚠⚠ **The `flux` tag is already taken, by the METAL chain.**
  `base-library/…/material/rock/limestone.yaml` tags `[rock, sedimentary,
  carbonate, flux]`; `trade-smelting/src/idea/cmd/smelting/SmeltController.ts:962`
  reads `item.hasMaterialTag('flux')` for the smelt's flux;
  `trade-quarrying/content/recipes/burn-lime.yaml` slots its charge as
  `category: flux`; `trade-quarrying/src/__tests__/OpenWorking.test.ts:75`
  pins the tag list. Tagging potash `flux` as the requirements say would
  let potash satisfy `burn-lime` and the smelt, and limestone satisfy the
  glass batch's flux slot. **STOP-AND-ASK #1** (Risks).
- `quicklime.yaml` (`base-library/…/material/caustic/`) tags `[mineral,
  caustic, alkali, liming]`, `corrosiveTo [tissue, leather, textile,
  once-living]`; the lump row `trade-quarrying/…/thing/quicklime.yaml`
  (`/trade/quarrying/thing/Lump` = `StackableMixin(Good)`, mass 4.5).
- The firing carry: `packages/server/src/mud/platform/idea/cmd/device/FireController.ts`
  lines 470–580 — `mergedCharge` collects each consumed `Composition`
  input's alloying; the non-mould branch clones the output, sets mass
  `consumed × massYield`, and `setAlloying([...own, ...mergedCharge])`.
  ⚠ The carried fractions are **not rescaled by the yield** (a constituent
  that all stays in a lighter output should concentrate), and **no grade
  rides from the charge onto the output** — the only grade write is the
  rubber cure's (`stampCure`, line 406). The glass melt's grade is
  therefore not derived from its inputs today.
- `MixinApi.isComposition` (`api/mixin.ts:1520`), `isMould` (1590),
  `isBurner` (1679), `isGraded` (1939). `lib/material/Composition.ts` —
  `alloying: {materialPath, fraction}[]`, `fractionOf`, `setAlloying`
  (sums a repeated material). `platform/thing/Casting` =
  `CompositionMixin(MeltableMixin(ThermalMixin(Good)))` — no `Crafted`, so
  no grade.

### The density reading and the egg

- `packages/content/platform/content/platform/idea/reading/density.yaml` —
  `subjectRequires [BulkableMixin]`, `discipline: chemistry`, `instrument:
  hydrometry`, `eyeCeiling: untrained`, **no `handTool`**.
  `platform/idea/reading/DensityReading.ts` implements only `measure`
  (prints `gravity.toFixed(3)` — a figure); the base `analyze` refuses
  naming the route. `generic-objects/…/thing/instrument/hydrometer.yaml`
  is a `/platform/thing/Tool` with `capabilities: [hydrometry]` (ungraded →
  ceiling `proficient`).
- `packages/server/src/mud/lib/instrument/Reading.ts` — `runAnalyze`
  (line 400): the eye band = `lower(bandOf(actor), held ? ceilingOf(held)
  : eyeCeiling)` where `held = narrow(tools, this.handTool)`; `narrow`
  (line 986) requires `getCapabilities()` — i.e. a **`Tooled`** host
  (`lib/craft/Tooled.ts`). `ceilingOf` maps a tool's grade × condition to a
  band (`CEILING_STEPS`, line 236: `poor` → `competent`, `fair` →
  `proficient`). `analyze.yaml`'s `tool` arg defaults to
  `reachable:[mixin.ToolMixin]`. `measure` wears the instrument;
  `analyze` does not. ⚠ The hen's egg
  (`trade-ranching/…/thing/egg.yaml`) is a `Provision`, not `Tooled`, so
  it cannot be a `handTool` without composing `ToolMixin` onto food (D7).
- `scripts/check-capabilities.ts` counts a reading row's `instrument:` /
  `handTool:` / `bench:` as consumers (line 150), so a new `flotation`
  capability is consumed the day the row names it.

### Water hardness and the sources

- `packages/server/src/mud/lib/cleanliness/WaterHardness.ts` — the
  **declaration-merge precedent** onto `BulkPayload` (`hardnessDgh?`), a
  value class with instance methods and no statics (`lint:lib-statics`
  clean). The blend on a pour is a hard-coded block in
  `platform/idea/api/BulkableLogic.ts` lines 579–590 (volume-weighted,
  non-empty destination only); `SourceSlot.ts:124` carries a source's
  hardness into a draw; `Bulkable.ts:302` reads it; `WaterSource.ts:36`
  (`WaterDraw.hardnessDgh`).
- Rows: the Kestrel `world-seed/…/Watercourse/kestrel.yaml` `water.hardnessDgh:
  12`; Cold Fell 5; `generic-objects/…/fixture/trough.yaml` is a
  `/platform/thing/WaterFixture` with its own `hardnessDgh: 3` and
  `interiorMaterial` water — the shape for a **rain butt** (D5). ⚠ No rain
  butt / cistern row exists anywhere (the Duncan Hall `cistern.yaml` is a
  location).

### `fell` and brash

- `packages/content/trade-forestry/src/idea/cmd/forestry/FellController.ts`
  — `dropStandard(giver, room, woodMaterialPath, seedPath, barkPath)` (line
  ~300): bole (`BOLE_M3 0.9` × density → ~650 kg for beech), 4 logs, bark
  as **4 bundles of `boleKg × 0.08 / 4`** (≈13 kg) when the stand entry
  authors `barkPath`, the seed. `takeLength` prints *"a knotted butt and a
  heap of brash"* and destructs the bole — **brash is prose only**.
- `trade-forestry/src/lib/Stand.ts` — `StandSpecies {speciesPath, name,
  woodMaterialPath, seedPath, barkPath?, standing, capacity,
  incrementPerYear}` (line 100); `setMix` normalizes `barkPath`.
  Rows: `rejection/…/hanging-wood/{oak-clearing,ride}.yaml` carry `mix:`
  with `barkPath: /trade/forestry/thing/bark`. ⚠ **Hanging Wood has no
  beech and no pine** (oak + ash on the clearing; the ride's mix is the
  same family) — the drive's steps 3–4 need a strong and a weak wood
  (D16). The bark row `trade-forestry/…/thing/bark.yaml` is a
  `/platform/thing/Good` with its own material `organic/oak-bark`.
- `cordwood.yaml` is a `/platform/thing/Crop` (hazel, 3.2 kg, `gradeBand:
  fair`); the clamp's `isCordwood` matches the keyword.

### Buying counters

- `packages/server/src/mud/lib/retail/Stock.ts` — `StockLine.buys?`
  (line 104); `bidFor` (line 282) = `floor(ask / (1 + retail.termsMargin
  0.25))`, **`null` when the bid rounds to 0** → `buyFrom` refuses
  `not-priced`; `buyFrom` (line 485): the line must `buys`, somebody
  attending, the good the seller's own (chattel owner of kind
  `player`/`organization` must equal the seller), a `from.store` line's
  store must have room, the seller needs an account, the house pays
  `BankingApi.payTerms(houseAccount → sellerAccount)`, then
  `transferChattel(business)` and the good goes into the store or onto the
  counter. `SellController` is dumb. The one shipped `buys` line is the
  icehouse's (`hollow-mere/…/icehouse/thing/counter.yaml`, price 6 → bid 4).
  ⚠ The chandlery's wood-ash at price 1 bids 0 — unsellable as priced.
- `scripts/check-counters.ts` ceilings **kernel** counter classes at 4;
  a `Stock` row in content is unaffected.

### The tinker's round (the ash-man's template)

- `packages/content/terminus/content/world/terminus/wharfside/tinker/idea/round.yaml`
  — a `Business` of one (`call: rota`), five `rosterSlots` each with a
  `station:` and a two-hour window; the roster tick relocates the assignee
  to the slot's station (employment.md lines 682–737). No boot entry.
  `agent/tinker.yaml` is a `/world/terminus/wharfside/agent/Tinker`
  (`CastMixin(StagedMixin(NPC))`, exists only for `props:`) with a
  `stokes` brain. `src/wharfside/agent/Tinker.ts`.
- Brains: kernel `lib/behavior/{cellars,restocks,stokes,…}.ts`; pack brains
  under `packages/content/<pack>/src/behavior/` (`trade-shopkeeping`'s
  `stocks.ts` and `consigns.ts` are the shape: `label`, `kind`, `summary`,
  `claims`, `urgency()`, `act()`, every step a literal verb through
  `forceCommand`). `cellars.ts` teleports to a counter room
  (`hand.teleport`, line 330); `stocks.ts` walks authored `ways`.
- Terminus hearths a round could call at (`/stuff/thing/Hearth`, `Oven`,
  `brazier`, `stove` props): the general store shop floor, the market
  bakery (Oven), the Hearthworks cookhouse (Oven) and cellar (brazier),
  the goods-yards yard (brazier), the rubber works (stove), the lower
  towpath (stove), the infirmary ward, the chandlery itself.

### The venues

- `rejection/content/world/terminus/rejection/hanging-wood/glasshouse.yaml`
  — a `Locale` propping `/stuff/thing/Kiln`, the blowpipe, the marver,
  four charcoal, two quicklime and **two `/trade/fuel/thing/ash`** (the
  clamp's failure row — the "clamp-ash stock"); cast the glassblower
  (`agent/glassblower.yaml`, `idles`); `idea/glasshouse-business.yaml`
  (one seat, `operatingLocations: [glasshouse]`, no counter).
- `location/fuel-yard.yaml` props the clamp, the panel, cordwood ×8, coal
  ×4; `agent/collier.yaml`; `idea/fuel-yard-business.yaml`.
- `rejection/pack.yaml` titles `/world/terminus/rejection/hanging-wood`
  (`agricultural`, group `rejection`); `rejection/package.json` depends on
  trade-fuel, trade-glass, trade-quarrying, trade-forestry (not chandlery).
  `terminus/package.json` depends on trade-chandlery and trade-fuel.

### Pack creation

- `packages/content/trade-glass/{pack.yaml,package.json,tsconfig.json,vitest.config.ts,README.md}`
  is the template: `root: /trade/glass`, `requires.title` extent
  `/trade/glass` held by `/compact/trade`; workspace deps; the
  `callSecPlugin` vitest config. Discovery is the root `package.json`'s
  `@saxonberg/content-*` dependency list (lines 5–68) — **a new pack must
  be added there**, and `pnpm install` run (`pnpm-workspace.yaml` globs
  `packages/content/*`). `PackLogic.discover.test.ts` asserts the count
  (content-packs.md line 1245) — it moves to 63.
- A pack's `src/` holds branches (`thing/`, `idea/cmd/`), `behavior/`,
  `lib/`; it imports the kernel by `@saxonberg/server/mud/…` specifier
  only. Discipline rows are discovered by the `/idea/Discipline/` infix
  under any root (`DisciplineCatalogue.ts:155`); reading rows by
  `/idea/reading/`; maturation profiles by key.

### The wire drive

- `packages/wire/tests/*.wire.test.ts`; harness exports in
  `packages/wire/src/harness/index.ts` (`Session`, `declareFile`,
  `expectOk`, `advanceWorldClock`, `engagementIdOf`, …).
  `cleanliness.dirty.wire.test.ts` and `glass.dirty.wire.test.ts` are the
  shape (`DIRTY_REASON`, `declareFile({packs})`, `refusedFor`,
  `verbUnderstood`, `settle`). Port for this worktree: `WIRE_PORT=2013`.

### What does NOT exist (so the build does not go looking)

No alkali share on any material · no strength state on a burner or a
heap · no lye strength on `BulkPayload` · no spent ash · no brash object ·
no egg instrument · no rain butt · no potash, black-salts or pearl-ash
material or good · no `stabilizer` tag · no `slaked-lime`/`caustic-lye`
material · no buying line at the chandlery or the glasshouse · no ash-man ·
no `/trade/potash` pack · no per-batch product fraction in maturation ·
no grade carry through `fire`.

---

## Plan-level decisions

Numbered so the build and the sweep can cite them. Where the requirements
left a fork, the lens that chose is named.

- **D1 — Ash is a `Composition` good, and `trade-fuel` owns the class.**
  A new instanceable `packages/content/trade-fuel/src/thing/Ash.ts`
  (`/trade/fuel/thing/Ash`) = `CompositionMixin(CraftedMixin(Good))`. Its
  strength is `fractionOf(POTASH)` where `POTASH` is the commons material
  `/stuff/idea/material/mineral/potash` (D9); its band is the Crafted
  `gradeBand`, written from the fraction at mint
  (`Ash.gradeFromStrength()`), and the look line reads the band in the
  heap's own words (a `markupAugmenter` on `Ash`: *pale and sharp* ·
  *grey* · *grey and gritty*). `wood-ash.yaml` and `ash.yaml` retarget
  `class: /trade/fuel/thing/Ash` (off `Provision` — a heap of ash has no
  freshness, cure or pathogens). Mass-weighting: the burner accrues
  `ashAlkaliKg` beside `ashKg`; the raked heap's fraction is
  `ashAlkaliKg / ashKg`. *Why fuel and not potash:* the kernel Burner and
  the clamp both mint it, and both are upstream of the potash trade.
- **D2 — The ash pit is a row over the kernel `Forge` twin... no: a
  pack class, because no kernel twin is honest.** `Forge` is the bare
  `Firebox` chain but is a forge by name and docstring; every other twin
  adds a flue, a seat or room heating an open pit does not have. So
  `/trade/potash/thing/AshPit extends Firebox` (one line, no overrides,
  no new mixin) with a row `/trade/potash/thing/ash-pit` (`maxBurnPowerW
  300000`, `fuelCapacityKg 2000`, `lit: false`, `burnTemperatureK 900`,
  `emittedIntensity`, `draught 1.0`). The act is the Burner's: `stoke pit
  with brash` / `stoke pit with cordwood` (the bed), `ignite pit`,
  `draught wide`, `sweep pit`. ⚠ The requirements wrote `put` for the
  lay-in; the Burner's lay-in verb is `stoke` (Grounding) — recorded, not
  reshaped: no new verb either way. Not a `CharcoalPit` row: that would
  afford `char` and `burn` at the ashery, which the requirements rejected
  as the wrong word.
- **D3 — The clamp's ash is minted by the same rule.** `openClamp`'s ash
  branch mints `Σ(charge mass × material.ashFraction)` kilograms with
  alkali `Σ(charge mass × ashFraction × alkaliShare)`, in heaps of the
  unit size (D4), instead of one 0.6 kg drift; brands and charcoal are
  untouched. The `/trade/fuel/thing/ash` row keeps its prose.
- **D4 — A heap has a unit mass.** `rakeGrate` (and D3) mint
  `ceil(kg / unit)` heaps, the last one the remainder, `unit =
  fire.ash.heapKg` (new dial, default 0.6 — the shipped row mass). A
  counter prices per heap, and a tonne of oak becomes seventeen heaps you
  can count — the tonne-to-kilo lesson made visible. A hearth's daily
  0.1 kg is one small heap.
- **D5 — Lye strength is a kernel payload field with a value object.**
  `packages/server/src/mud/lib/cleanliness/LyeStrength.ts` — the
  `WaterHardness` twin: `declare module '../bulk/Bulkable' { interface
  BulkPayload { alkaliGPerL?: number } }`, class `LyeStrength(gPerL)` with
  `band()` (*water · weak · soap-strength · strong*, thresholds as
  `potash.lye.*` dials), `gradeBand()`, `gravity()` (`1 + gPerL × 9e-4`),
  `words(band: CompetenceBandName)` (the egg's three words at ≤ novice,
  five at competent). The pour blends it by volume in `BulkableLogic`
  beside hardness, refactored into one private `blendScalar(field)` on the
  logic singleton so the third such field is a one-liner. *Why kernel:* the
  hopper, the pot, the reading and the kettle all read it, and they are
  three packs; substrate with no common pack ancestor goes to the kernel.
- **D6 — The hopper derives it, leaves spent ash, and takes passes.**
  `Hopper.matchProfile` (trade-chandlery): for water OR lye poured onto
  `potash`-tagged contents — alkali kg = Σ(heap mass × fractionOf(POTASH),
  0.1 for a non-Composition heap); each heap becomes a
  `/trade/fuel/thing/spent-ash` of 0.9 × its mass (material
  `organic/spent-ash`: `[mineral, residue, liming, once-living]`, no
  `potash`); the payload's `alkaliGPerL` += `alkaliKg × 1000 / litres ×
  (1 − potash.lye.hardnessWastePerDgh × hardnessDgh)`; the hopper's
  own grade is set to the strength's band (so the pour carries it, by the
  shipped `carryBatchIdentity`). Returns `lye-leach` either way (a pass
  re-leaches for half a day). The read side (`LyeStrength`) answers only
  when the bulk material carries `lye`, so water-with-pending-alkali reads
  as water until the leach finishes. ⚠ Order is the hopper's shipped
  one: ash in, then pour.
- **D7 — The egg is the eye rung's hand tool, and it is a kept test
  egg.** `density.yaml` gains `handTool: flotation`; `DensityReading`
  implements `analyze` (with the egg in reach: the lye's `words(band)`;
  water: *the egg sinks*; no egg: the base refusal naming the route) and
  `measure` words a `lye`-tagged subject instead of printing a figure (AC
  12). The egg is `/trade/potash/thing/test-egg`, a `/platform/thing/Tool`
  (`capabilities: [flotation]`, `gradeBand: poor` → ceiling `competent`),
  propped at the ashery and the chandlery. ⚠ The hen's egg stays food
  (Grounding); *any fresh egg floats* is a deferred seam.
- **D8 — The boil is per-batch.** Kernel `Maturing` gains one `@hook`
  `batchProductFraction(profile): number` (default the profile's) used by
  the evaporative window and the finish, and the window's rate is scaled by
  the **fill factor** `clamp(interiorCapacity / startL, 1, 4)` — a pan a
  third full dries three times as fast per fraction, a full pan exactly as
  before (brine and sap unchanged at full). The iron pot overrides the hook
  from `LyeStrength`: cake litres = `(alkaliKg / purity) / density(black
  salts)`, so yield follows strength and a weak lye boiled for the same
  potash is a fuller pot for longer — time, and therefore the hearth's
  fuel, follow. ⚠ At EQUAL VOLUME a weak and a strong lye take nearly the
  same time (the water is the same); the drive compares equal potash
  (Risks).
- **D9 — Materials: potash in the commons, black salts the trade's.**
  `base-library/…/material/mineral/potash.yaml` (`/stuff/idea/material/mineral/potash`:
  potassium carbonate — tags `[solid, mineral, alkali, potash, <flux-tag>]`,
  density 2400, mp 1164 K, `cleanser: /trade/potash/idea/Cleanser/potash`)
  is the composition key the kernel Burner stamps AND the pearl ash's
  material. `/trade/potash/idea/material/black-salts.yaml` (crude, tags
  `[solid, mineral, alkali, potash, black-salts, <flux-tag>]`, same
  cleanser). Goods: `/trade/potash/thing/black-salts` (the cake,
  `castTemplate` of the pot) and `/trade/potash/thing/pearl-ash`, both over
  `/trade/fuel/thing/Ash` (D1 — pearl ash is ash), authoring `alloying`
  0.65 / 0.85 of `potash` as the row default.
- **D10 — `soda-from-lye` is deleted, not renamed.** The row leaves
  `trade-fuel`; `/trade/potash/idea/maturation/lye-boil.yaml` replaces it
  (`evaporative`, `inputCategory: lye`, `happyK 370`, `stallBelowK 273`,
  `damageAboveK 420`, `ratePerDay 6`, product black-salts, `productFraction
  0.05` as the reference the pot overrides). The washing-soda material's
  header stops claiming it is boiled from lye; the general store's bag
  stays a stocked line (AC 11).
- **D11 — The iron pot is a mould that matures.**
  `/trade/potash/src/thing/IronPot.ts` =
  `MouldMixin(DurableMixin(MaturingMixin(CraftVessel)))` (the Hoop's
  order with Maturing inside Durable), row `/trade/potash/thing/iron-pot`
  (`castTemplate: /trade/potash/thing/black-salts`, `reusable: true`,
  `discipline: ashery`, cast iron, `interiorCapacity 40`). It overrides
  `batchProductFraction` (D8) and `castInto` (super, then `setAlloying`
  on the cake from the black-salts purity and the cake's grade from its
  own — the mould already does the grade). The black-salts material is
  `solid`, so `Thermal.reconcileBulkPhase` sets the cake IN the pot at the
  first read after the finish — *pot ash*, by the shipped set site. The
  pot stands ON the ashery hearth (`Placing`), the SoapKettle precedent.
- **D12 — Pearl ash is a `fire` recipe, and the firing carry is
  corrected twice.** `/trade/potash/content/recipes/calcine.yaml`
  (`category: black-salts`, count 1, `requiresHeatK 900`, `massYield
  0.8`, output pearl-ash, `discipline: ashery`). Kernel `FireController`:
  (a) carried fractions are divided by `massYield` (capped at 1) — what
  stays in a lighter output concentrates (the glass melt's iron reads
  ~1/0.72 stronger; its tests re-pin); (b) when the output `isGraded`, its
  grade is the **weakest** of the Graded inputs (`Grade.weakest`), the
  same rule a craft and a batch already follow. Consumers: pearl ash, the
  glass melt (AC 3's "glass grade" — verify `/trade/glass/thing/melt`'s
  class composes `Crafted`; if not, compose it in W4), burnt lime.
- **D13 — Tags: `stabilizer` is new; the flux word waits on
  STOP-AND-ASK #1.** `quicklime.yaml` gains `stabilizer`; both glass batch
  rows' lime slot becomes `category: stabilizer`. The flux slot and the
  potash family's tag are written per the user's answer (W4 is blocked on
  it, nothing else is). `alkali` stays on lye, washing soda, potash — the
  cleansing family — and glass stops reading it. Wood ash keeps the flux
  tag too: forest glass IS ash glass (lens 1), and the grade carry (D12b)
  is what makes pearl ash the better batch.
- **D14 — Slaking and causticizing live in the soap kettle; no new
  class, no new verb.** `SoapKettle.matchProfile(water)`: when a
  `caustic`+`liming` lump is in the kettle, destruct it, `depositHeat`
  the slaking heat (`1.1 MJ/kg` as a `potash.lime.slakingJPerKg` dial),
  rekey the interior to `/trade/chandlery/idea/material/milk-of-lime`
  (tags `[liquid, caustic, alkali, slaked-lime]`, `corrosiveTo [tissue]`)
  with no batch, and — the acting author (`ExecutionContextApi.
  getActingAuthor()`, the `stampBatchMark` precedent) bare-handed —
  `quicklime.corrodeOnContact(actor, {site: hand})` (the hopper's
  glove test). `soapTransform` gains lye + slaked-lime (either order) →
  `/trade/chandlery/idea/material/caustic-lye` (tags `[liquid, caustic,
  alkali, lye, caustic-lye]`, cleanser lye) and fat + caustic-lye →
  `hard-soap-paste` → profile `saponification-caustic` (chemical, product
  `hard-soap-curd`, glycerin lees) → the frame sets it to hard soap by the
  shipped drain. The salting-out route is untouched. ⚠ Order: lime in,
  then water (the hopper's constraint; a `put` after the fill does not
  re-match — Deferred).
- **D15 — Potash softens by a Cleanser row the pack ships.**
  `/trade/potash/idea/Cleanser/potash.yaml` (`agent: potash`, `action:
  alkali-mild`, `softens: true`, `consumesPerWash 0.02`), named by the
  potash and black-salts materials' `cleanser:`.
- **D16 — The venues are rows; Hanging Wood gains two woods.** The
  ashery is one `Locale` off the ride
  (`rejection/…/hanging-wood/ashery.yaml`: the pit, a `/stuff/thing/Hearth`,
  the iron pot on it, a `/trade/chandlery/thing/hopper`, a
  `/trade/potash/thing/rain-butt` (a `WaterFixture` of water at
  `hardnessDgh 1`), a second `/stuff/thing/Kiln`, the test egg, two
  `lye-flask`s, a pail, four cordwood), cast `agent/ash-burner.yaml`
  (`idles`), business `idea/ashery-business.yaml` (one seat anyone can
  take, `purchases: true`, `banksAt: goodkin`). The ride's `mix:` gains
  `beech` and `pine` (species rows added under the forestry commons if
  absent — beech's material already names `fagus/sylvatica`). The
  glasshouse's two `/trade/fuel/thing/ash` props become `wood-ash`, and it
  gains `thing/counter.yaml` (a `Stock`, `serverPositionKeys:
  [glassblower]`) buying `pearl-ash` (price 20) and `black-salts` (12).
  River water for the drive: a pail from the Kestrel at the road (verify a
  draw exists on `kestrel-road`; else the village well's trough).
- **D17 — The chandlery buys, at prices that bid.** `counter.yaml`:
  wood-ash → price 3, `buys: true`; new lines `black-salts` (12, `buys`)
  and `pearl-ash` (20, `buys`), each `par: 0` if the shape admits it
  (verify against `Stock.lineFor`/`lint:shopfronts`; else `par: 1`). The
  ash-man is a Business of one at the chandlery
  (`terminus/…/wharfside/chandlery/idea/ash-round.yaml`, `call: rota`,
  stations: general store → bakery → cookhouse → goods-yards yard →
  chandlery floor, two hours each), cast `agent/ash-man.yaml` with a pack
  brain `/trade/potash/src/behavior/ashes.ts` (`claims: ['hands']`):
  at a stop, for each Burner with ash past `potash.round.minKg`,
  `forceCommand('sweep <kw>')`; for each heap in hand not the house's,
  resolve `chattelOwner()`, pay the owner's account the chandlery's bid ×
  `potash.round.ownerShare` by `BankingApi.payTerms` from the round's
  operating account and `transferChattel(business)` (no account to pay →
  the heap is taken and the brain says so); at the chandlery,
  `forceCommand('sell <heap>')` per heap. ⚠ The drive states the day's
  take and names it a supplement or a living (AC 9).
- **D18 — Brash is a felling fact, bark stays a species fact.**
  `dropStandard` always drops brash: `BRASH_BUNDLES_PER_STANDARD 6` of
  `boleKg × BRASH_FRACTION_OF_BOLE 0.2 / 6` (≈22 kg for beech), row
  `/trade/forestry/thing/brash` (a `Good`), material = the stand entry's
  new optional `brashMaterialPath ?? woodMaterialPath`. Base-library ships
  `wood/<species>-brash.yaml` rows `extends:` the wood with `ashFraction`
  ×3 and `alkaliShare` ×1.3 for oak, ash, beech, pine, hazel; the ride and
  the clearing name them. A coppice cut (`harvest`) is unchanged.
- **D19 — One Discipline, `ashery`, for the recipe.**
  `/trade/potash/idea/Discipline/ashery.yaml` (ISCED-F 0711), credited by
  the calcine firing; the egg read stays `chemistry`'s; the burn is not
  credited (a Burner credits nobody). No band gates anything.
- **D20 — Freight is by hand in the drive.** The valley road is walked
  (or the carter is hired — logistics is shipped); the wire file carries
  the cake by hand between the two sessions' locations. No lane, no
  river.

---

## ⭐⭐ Host placement

Every new field, mixin and class — which host, and what composing it
claims about everything already on that host. *The test: a guard that
re-narrows the host set means the host is wrong.*

| what | host | claims about the host's other composers | why not elsewhere |
|---|---|---|---|
| `alkaliShare` (number, authorable, spoiler 1) | `Material` (kernel) beside `ashFraction` | every material may say what share of its ash is alkali; 0 = unauthored, so coal, charcoal and stone claim nothing | not on the wood good (the Burner reads the material of the bed, not the item) |
| `ashAlkaliKg` (runtime state) | `BurnerMixin`, beside `ashKg` | every fire that leaves ash leaves ash of SOME strength — true of a lamp (0) and a forge alike | a Firebox-only field would need a guard in `consumeFuel`, which runs on the mixin |
| `heapKg` unit + heap loop | `BurnerMixin.rakeGrate` | a raked grate yields countable heaps on every burner | — |
| `Ash` class (`Composition(Crafted(Good))`) | `/trade/fuel/thing/Ash` — pack class | nothing: new leaf | `Provision` claims rot; `Casting` claims melting; the kernel has no Crafted+Composition twin and does not need one for a trade's residue |
| `alkaliGPerL` payload field | `BulkPayload` via declaration merge in `lib/cleanliness/LyeStrength.ts` | any liquor may carry an alkali concentration; a read is only honest on a `lye`-tagged material and `LyeStrength` says so | a pack cannot teach the pour to blend a field |
| `blendScalar(field)` | `BulkableLogic` (private) | hardness and alkali blend by the same rule | — |
| strength derivation, spent ash, passes | `Hopper` (trade-chandlery) overrides | the hopper is already "its own chemistry" (`matchProfile`) | a kernel rule in `Maturing.matchProfile` would claim leaching of every vat |
| `batchProductFraction` hook + fill factor | `MaturingMixin` | every evaporative batch may size its own product; the default is the profile's, so brine and sap are byte-for-byte at a full pan | — |
| `IronPot` (`Mould(Durable(Maturing(CraftVessel)))`) | `/trade/potash/thing/IronPot` | new leaf; the overrides are the pot's own chemistry | the SoapKettle is the chandlery's and not a mould; the kernel `Mould` twin does not mature |
| slaking, causticizing, direct hard soap | `SoapKettle` (trade-chandlery) | the kettle already owns "its chemistry" (`soapTransform`) | a slaking tub would be a second `ContainerMixin(Vat)` twin for one act |
| `analyze` + worded `measure` on lye | `DensityReading` | the channel words what cannot honestly be a figure to a player | — |
| `handTool: flotation` | the density ROW | — | — |
| `AshPit extends Firebox` | `/trade/potash/thing/AshPit` | new leaf, no overrides | every kernel twin adds a flue, a seat or room heat (D2) |
| grade carry + yield rescale | `FireController` (the one charge→output path) | every firing concentrates what it keeps and grades by its worst input — true of lime, glass, rubber, pearl ash | — |
| brash yield, `brashMaterialPath?` | `FellController.dropStandard` + `StandSpecies` | every felling leaves brash; the entry may say what it is made of | — |
| `stabilizer`, the potash family tag, `slaked-lime`, `caustic-lye`, `black-salts` tags | material rows | tags are role membership; a slot asking a family tag IS "any member" | — |
| `ashes` brain | `/trade/potash/src/behavior/ashes.ts` | runs on any NPC a row names | kernel commons would claim every realm wants an ash-man |

⛔ **Not placed, deliberately:** nothing on `Thing`, `Good`, `Vat` or
`CraftVessel`; no `Freshness`/`Provision` on ash; no `ToolMixin` on food
(the hen's egg); no new kernel class; no new Api, logic singleton, free
helper, collection or module category.

---

## Convention conformance

- **Module categories** — new files are: pack Stuff classes
  (`trade-fuel/src/thing/Ash.ts`, `trade-potash/src/thing/{AshPit,IronPot}.ts`),
  one pack brain (`trade-potash/src/behavior/ashes.ts`), one kernel
  value-object (`lib/cleanliness/LyeStrength.ts` — the `WaterHardness`
  category), tests. No Api, no logic singleton, no free helper, no
  `lib/` statics (`LyeStrength` is instance methods; the band thresholds
  are dials read at use).
- **Roots** — `/trade/potash/<branch>/…` for the trade's rows,
  `/trade/fuel/thing/Ash` for the residue, `/stuff/idea/material/…` for
  commons materials, `/trade/chandlery/idea/material/…` for the kettle's
  liquors, `/world/terminus/rejection/hanging-wood/…` and
  `/world/terminus/wharfside/chandlery/…` for the venues. Backing-class
  paths mirror template paths.
- **`props:` / `cast:`**, never `populates:`; no `container:` on any row
  (`lint:instanceable` 13 refuses `hydratorClass:` and `container:`).
- **Locations** — `Locale` for the ashery (outdoor, sky-lit by its biome);
  no `Room`.
- **Verbs on objects** — `Burner.rakeGrate`, `Hopper.matchProfile`,
  `SoapKettle.soapTransform`, `IronPot.batchProductFraction`; controllers
  untouched except `FireController` (the carry) and `CharController`
  (the mint). No `XApi.verb(host, …)`; `lint:object-verbs` stays 0.
- **No new verb** — every act is shipped (`fell`, `stoke`, `ignite`,
  `draught`, `sweep`, `put`, `pour`, `fill`, `analyze`, `measure`, `fire`,
  `sell`, `get`).
- **Import boundary** — pack code imports `@saxonberg/server/mud/…`
  specifiers only; `FromModule` gates absolute. `lint:imports`.
- **No migrations, no new collections** — a wood-ash row changing class is
  a template change; a warm dev DB is dropped and rebooted.
- **Settings** — new dials ship in `trade-potash/content/settings/potash.yaml`
  (`potash.lye.*`, `potash.lime.slakingJPerKg`, `potash.round.*`) and
  `fire.ash.heapKg` in the platform's `fire.yaml` (with its `AppSettingKeys`
  entry).

**Lint gates especially at risk** (the roster is derived; run
`pnpm -C packages/server lint:family`): `lint:instanceable` (two new pack
classes, their rows, `/lib/` never instanced), `lint:lib-statics`
(ceiling; `LyeStrength` must carry no static), `lint:object-verbs` (0),
`lint:reachability` (the ash pit's verbs are the Burner's; the pit
contributes nothing itself), `lint:light-sources` (g)/(h) (the pit row:
`lit:`, power, capacity), `lint:capabilities` (`flotation` declared by the
egg, consumed by the density row), `lint:counters` (unchanged — rows),
`lint:shopfronts` (the three new buying lines), `lint:mass` (every new
row states mass), `lint:perishable` (ash leaving `Provision` must not be
a perishable material), `lint:closed-vocabularies` (no kernel list grows —
`MATURATION_MECHANISMS` untouched), `lint:mixin-names` (no kernel mixin
added), `lint:untitled` (the pack's `requires.title`), `lint:boot-entries`
(none added), `lint:drive-scripts` (the drive is a wire file),
`lint:dossiers` (two new Cast rows), `lint:schema` (no collection),
`lint:test-bootstrap`, `lint:authored-prose`, `lint:person-keys`
(the brain keys the hearth owner on `getIdentityPath`).

---

## Waves

Each wave lands independently, ends at a commit, and is driven by
`pnpm test:near` + the touched packs' own vitest + `lint:family`. The full
suite runs once before the MR and once at `/finalize`.

### W0 — ash sized and strengthened: the grate, the clamp, the `Ash` class

**Files**
- `packages/server/src/mud/lib/material/Material.ts` — `alkaliShare`
  field + `fieldMeta` (`persistent, authorable, spoiler 1`) + get/set
  beside `ashFraction`.
- `packages/server/src/mud/lib/fire/Burner.ts` — `ashAlkaliKg`
  (`fieldMeta` runtime state); `consumeFuel` accrues `mass × fraction ×
  ashFraction × alkaliShare`; `takeAsh()` returns `{kg, alkaliKg}` (keep
  the kg-returning signature for callers: add `takeAshDetailed()` or
  widen the return — pick one and update `SweepController`'s read);
  `rakeGrate` mints `ceil(kg/unit)` heaps, each `setMass`, and when
  `MixinApi.isComposition(heap)` `setAlloying([{materialPath: POTASH,
  fraction: alkaliKg/kg}])`; `POTASH = '/stuff/idea/material/mineral/potash'`
  as a module `const` (declares, does not execute).
- `packages/content/platform/content/settings/fire.yaml` +
  `lib/config/AppSettings.ts` — `fire.ash.heapKg` (0.6).
- `packages/content/base-library/content/stuff/idea/material/mineral/potash.yaml`
  — the commons material (D9; the `cleanser:` pointer lands in W4 — leave
  it `''` here, or ship the Cleanser row in this wave under the pack; the
  pack skeleton is W2, so W0 ships potash with no cleanser and W4 fills
  it).
- Wood rows (10) + `organic/oak-bark.yaml`: `alkaliShare` (beech 0.18,
  elm 0.17, oak 0.15, ash 0.15, maple 0.15, hazel 0.14, birch 0.12,
  willow 0.12, yew 0.10, pine 0.08; oak bark 0.20). Grain, with a
  comment: an author's numbers.
- `packages/content/trade-fuel/src/thing/Ash.ts` — the class (D1) with
  `gradeFromStrength()` and the look augmenter; `wood-ash.yaml`,
  `ash.yaml` → `class: /trade/fuel/thing/Ash`, keep mass 0.6, author
  `alloying: [{materialPath: /stuff/idea/material/mineral/potash, fraction: 0.12}]`
  as the row default; new `spent-ash.yaml` row + `material/organic/spent-ash.yaml`.
- `packages/content/trade-fuel/src/idea/cmd/fuel/CharController.ts` —
  the ash branch mints by mass and alkali (D3).
- Tests: `lib/fire/__tests__/Burner.worked.test.ts` (accrual of alkali,
  heap count, fraction on the heap); `trade-fuel/src/__tests__/burn.test.ts`
  (the clamp's ash sized to the charge); `trade-fuel/src/__tests__/Ash.test.ts`
  (band words, no digit).

**Acceptance** — a 1000 kg beech burn in a test burner (10 kg of ash) rakes 17 heaps whose
fractions read 0.18; a pine burn's heap reads `poor` and *grey and
gritty*; the clamp at draught 0.8 over 8 cordwood yields `8 × 3.2 × 0.01`
kg of ash in heaps; `lint:family` green; `pnpm test:near`.

**Commit** — `build(potash W0): ash sized and strengthened by the wood — the grate, the clamp, the Ash class`

### W1 — brash, the felling's fourth yield

**Files**
- `packages/content/trade-forestry/src/lib/Stand.ts` — `brashMaterialPath?`
  on `StandSpecies`, normalized in `setMix`.
- `…/src/idea/cmd/forestry/FellController.ts` — `BRASH_BUNDLES_PER_STANDARD`,
  `BRASH_FRACTION_OF_BOLE`, `BRASH_PATH`; `dropStandard` mints the
  bundles with `setMaterial(brash ?? wood)` and sizes them off the bole;
  `fellPlantedTree` likewise for a mature standard. The *"heap of brash"*
  line at the last length stays prose (that brash fell with the crown).
- `…/content/trade/forestry/thing/brash.yaml` (`/platform/thing/Good`,
  keywords `[brash, bundle, faggot, twigs, lop]`, ~20 kg typical).
- `base-library/…/material/wood/{oak,ash,beech,pine,hazel}-brash.yaml`
  (`extends:` the wood; `ashFraction` ×3, `alkaliShare` ×1.3, keywords).
- `rejection/…/hanging-wood/{oak-clearing,ride}.yaml` — `brashMaterialPath`
  per entry; the ride's mix gains `beech` (12/14) and `pine` (8/10) with
  species rows (`…/fagus/sylvatica.yaml`, `…/pinus/sylvestris.yaml`)
  added under `trade-forestry/content/stuff/idea/species/plantae/…` only
  if `grep -rl "fagus/sylvatica\|pinus/sylvestris" packages/content/*/content/stuff/idea/species`
  finds none.
- Tests: `trade-forestry/src/__tests__/fell.test.ts` (brash count, mass,
  material; a species with no `brashMaterialPath` drops brash of its own
  wood); `wood-vocabulary.test.ts` learns the brash rows.

**Acceptance** — `fell beech` on the ride drops the bole, four logs, bark
(if authored), seed and six bundles of beech brash whose material's
`ashFraction` is 0.03.

**Commit** — `build(potash W1): brash — the felling's fourth yield, richest in ash per kilo`

### W2 — the pack, the leach, and the egg

**Files**
- `packages/content/trade-potash/{pack.yaml,package.json,tsconfig.json,vitest.config.ts,README.md}`
  (the trade-glass template; `root: /trade/potash`; `requires.title`
  extent `/trade/potash` held by `/compact/trade`; deps: server, types,
  platform, base-library, generic-objects, trade-fuel, trade-chandlery,
  trade-quarrying); root `package.json` gains
  `@saxonberg/content-trade-potash`; `pnpm install`;
  `PackLogic.discover.test.ts` count → 63.
- `packages/server/src/mud/lib/cleanliness/LyeStrength.ts` (D5) +
  `__tests__/LyeStrength.test.ts`.
- `platform/idea/api/BulkableLogic.ts` — `blendScalar('hardnessDgh')`,
  `blendScalar('alkaliGPerL')` replacing the inline hardness block;
  `BulkPayload.test.ts` covers both.
- `trade-chandlery/src/thing/Hopper.ts` — D6; `lye-leach.yaml` header
  updated; `trade-chandlery/src/__tests__/soap.test.ts` gains the leach
  cases (strength from mass and litres; a second pass raises it; hard
  water lowers it; spent ash left; the hopper's grade band).
- `platform/content/platform/idea/reading/density.yaml` (`handTool:
  flotation`) and `platform/idea/reading/DensityReading.ts` (D7) +
  `__tests__/DensityReading.test.ts` (words, no digit on lye; the figure
  still prints on a must).
- `trade-potash/content/trade/potash/thing/{test-egg,rain-butt,lye-flask?}.yaml`
  (the flask is the chandlery's — reuse `/trade/chandlery/thing/lye-flask`),
  `trade-potash/content/settings/potash.yaml` (`potash.lye.weakBelowGPerL
  15`, `soapAtGPerL 30`, `strongAtGPerL 60`, `hardnessWastePerDgh 0.04`).

**Acceptance** — in the chandlery test: 3 kg of 0.15 ash in 20 L of
1 °dH water gives ~22 g/L (*weak*); a second 3 kg pass ~45 g/L
(*soap-strength*); the same at 12 °dH ~12 g/L; `analyze density hopper`
with the egg in reach prints the band's words and no digit; the pack
boots under `SAXONBERG_PACKS` with the roster.

**Commit** — `build(potash W2): the trade-potash pack; lye strength derived in the hopper and read with an egg`

### W3 — the boil: lye → black salts in an iron pot

**Files**
- `lib/maturation/Maturing.ts` — `batchProductFraction(profile)` hook;
  the fill factor in `reconcileEvaporativeWindow`; `Maturing.test.ts`
  evaporative cases (a full pan unchanged; a third-full pan three times
  as fast; an overridden fraction sizes the finish).
- `trade-potash/src/thing/IronPot.ts` (D11) + `__tests__/IronPot.test.ts`
  (a 30 L lye at 60 g/L sets a cake of ~2.8 kg IN the pot, graded as the
  lye; the cake's alloying is the black-salts purity).
- `trade-potash/content/trade/potash/{idea/maturation/lye-boil.yaml,idea/material/black-salts.yaml,thing/black-salts.yaml,thing/iron-pot.yaml}`.
- **Delete** `trade-fuel/content/trade/fuel/idea/maturation/soda-from-lye.yaml`;
  edit the washing-soda material header; keep the bag.
- Docs touched in-wave: none (the sweep's).

**Acceptance** — the pot on a lit hearth with strong lye finishes in the
test's advanced hours and `getContents()` holds a `black-salts` cake; the
same volume of weak lye finishes in the same time with a cake a third the
mass; `grep -r soda-from-lye packages/ docs/` is empty but for history.

**Commit** — `build(potash W3): lye → black salts in an iron pot; soda-from-lye retired`

### W4 — pearl ash by fire; flux and stabilizer; the grade carry

⚠ **Blocked on STOP-AND-ASK #1 for the flux word only.** Everything else
in this wave is unblocked.

**Files**
- `platform/idea/cmd/device/FireController.ts` — D12 (a)+(b);
  `FireController.test.ts` (fraction concentrates by `1/massYield`; the
  output's grade is the weakest input's; an ungraded output is untouched).
  Re-pin any glass colour assertion that moved
  (`trade-glass/src/__tests__/*`).
- `trade-potash/content/recipes/calcine.yaml`;
  `trade-potash/content/trade/potash/{thing/pearl-ash.yaml,idea/Discipline/ashery.yaml,idea/Cleanser/potash.yaml}`;
  the potash material's `cleanser:` filled; black-salts material tags.
- `trade-glass/content/recipes/glass-batch{,-amber}.yaml` — lime slot →
  `stabilizer`; flux slot per the answer. `base-library/…/caustic/quicklime.yaml`
  gains `stabilizer`. Verify `trade-glass/src/thing/Melt.ts` composes
  `Crafted`; compose it if not.
- `glass.md`/`mining.md` one-line notes are the sweep's.

**Acceptance** — a cake fired in a test `Oven` at 900 K yields pearl ash
at 0.8 mass with potash fraction 0.81 and the cake's grade; a glass batch
of pearl ash + quicklime fires; a flask of lye in the kiln fires no
recipe; `lint:capabilities`, `lint:closed-vocabularies` green.

**Commit** — `build(potash W4): pearl ash by fire; flux and stabilizer on the glass batch; a firing carries its charge's grade`

### W5 — lime: slaking, causticizing, hard soap direct

**Files**
- `trade-chandlery/src/thing/SoapKettle.ts` — D14; `soap.test.ts`:
  quicklime in water heats the kettle and leaves milk of lime; a bare hand
  is corroded, a gloved one not; lye + milk of lime → caustic lye; tallow +
  caustic lye → hard-soap paste → curd in an hour at the boil → the frame
  sets hard soap; tallow + plain lye still → soft soap → salt → curd.
- `trade-chandlery/content/trade/chandlery/idea/material/{milk-of-lime,caustic-lye,hard-soap-paste}.yaml`,
  `idea/maturation/saponification-caustic.yaml`.
- `trade-potash/content/settings/potash.yaml` — `potash.lime.slakingJPerKg`
  (or the chandlery's own settings file if the dial is the kettle's —
  put it where the reader is: the kettle is chandlery's, so
  `trade-chandlery/content/settings/chandlery.yaml`).

**Acceptance** — both soap routes end in a bar in the frame; the direct
route's bar is graded by the lye's band.

**Commit** — `build(potash W5): slaking and causticizing in the soap kettle; hard soap direct`

### W6 — the venues: the ashery, the buying lines, the ash-man's round

**Files**
- `trade-potash/src/thing/AshPit.ts` + `content/trade/potash/thing/ash-pit.yaml`
  (D2), `agent`-less; `rejection/…/hanging-wood/ashery.yaml`,
  `agent/ash-burner.yaml`, `idea/ashery-business.yaml`, the ride's exit;
  `glasshouse.yaml` props → wood-ash, `glasshouse/thing/counter.yaml`,
  `glasshouse-business.yaml` `operatingLocations` + the counter;
  `rejection/package.json` + `pack.yaml` deps on trade-potash (and
  trade-chandlery for the hopper row).
- `terminus/…/wharfside/chandlery/thing/counter.yaml` (D17 prices and
  `buys`), `chandlery/idea/ash-round.yaml`, `chandlery/agent/ash-man.yaml`,
  `terminus/package.json` dep on trade-potash; the chandlery floor props
  a test egg.
- `trade-potash/src/behavior/ashes.ts` (D17) + `__tests__/ashes.test.ts`
  (one beat at a hearth stop sweeps and pays; one beat at the counter
  sells; a hearth with no owner account is taken and logged).
- `potash.yaml` settings: `potash.round.minKg 0.05`, `ownerShare 0.5`.

**Acceptance** — a booted world (`pnpm dev:server` on this worktree's
port) shows the ashery reachable from the ride with every prop present
(`look` reads no *something*); `sell wood ash` at the chandlery is
accepted at the bid; the glasshouse counter says it buys pearl ash;
`lint:shopfronts`, `lint:dossiers`, `lint:light-sources` green.

**Commit** — `build(potash W6): the Hanging Wood ashery, the glasshouse and chandlery buying lines, the ash-man's round`

### W7 — the drive, and what it finds

**Files** — `packages/wire/tests/potash.dirty.wire.test.ts`
(`DIRTY_REASON`: fells the Hanging Wood's standards, burns and sweeps
the ashery's pit and the fuel yard's clamp, consumes the ashery's lime and
the chandlery's fat, sells into the chandlery and glasshouse counters,
and moves the world clock); fixes it forces; the plan's **Drive record**
appended with the output and count. Docs: a new
`docs/subsystems/potash.md` (the chain, the strength model, the egg, the
boil arithmetic, the round's arithmetic) and one-paragraph updates to
`cleanliness.md` (the grate, the hopper, soap's second route),
`fire.md` (ash strength + heaps), `mining.md` § the clamp, `forestry.md`
(brash), `maturation.md` (per-batch product fraction + fill factor),
`instrumentation.md` (the density eye rung), `glass.md` (the slots, the
grade carry), `retail.md` (two more buying lines) — the CLAUDE.md map line
is the sweep's.

**Commit** — `drive(potash): <what driving found>` then
`build(potash W7): fixes from the drive; the potash subsystem doc`.

---

## Reachability wiring

The five links per capability — verb · affordance · data · boot · arg
gate — each fails closed and silent.

| capability | verb | affordance (who lists the view) | data | boot | arg gate |
|---|---|---|---|---|---|
| lay and light the pit | `stoke`, `ignite`, `draught`, `cover` | `BurnerMixin.commandContributions` (environment + peers) — the `AshPit` row inherits it; the pit must NOT redeclare a static (a class static shadows the mixin's list) | `ash-pit.yaml` with power, capacity, `lit: false` | none (a room prop) | `stoke.fuel requires TangibleMixin` (brash, cordwood are Goods with a material whose `heatOfCombustion > 0`); `burner requires BurnerMixin` |
| rake the pit / a hearth | `sweep` | `SweepingTool` + the platform view's `requires: any` target; `SweepController` narrows `isBurner` | the heap rows, `fire.ash.heapKg` | — | none beyond the target |
| char with the draught open | `char` | `CharcoalPit.commandContributions` (shipped) | `clamp.yaml` | — | `clamp requires BurnerMixin` + `[class.CharcoalPit]` |
| fell for brash | `fell` | `StandMixin` from `inventory` (shipped) | stand `mix:` entries, brash rows, species rows | — | axe on `capability.felling` |
| leach | `put`, `pour`, `fill` | platform inventory/bulk views | the hopper row; `lye-leach` by key; `spent-ash` row | the profile roster warms by key (`MaturationProfileRef.byKey`) — verify a pack root's profile resolves (forestry's sap rows prove it) | `pour` target Bulkable |
| read strength | `analyze density`, `measure density` | the Avatar's (readings are global); `ReadingCatalogue` by `/idea/reading/` infix | `density.yaml` `handTool: flotation`; the `test-egg` row `capabilities: [flotation]`; the hydrometer | lazy warm + `onCreate` | `subjectRequires [BulkableMixin]`; `tool requires [ToolMixin]` (the egg IS a Tool) |
| boil | `put pot on hearth`, `pour lye into pot` | platform | `iron-pot.yaml` (`placements`/Placing on the Hearth row), `lye-boil` | — | `Placing.canPlace` on the hearth |
| the cake | `get cake from pot` | `Mould.getContents` (a plain `get` reaches into an open mould) | `black-salts.yaml` | — | — |
| calcine | `fire kiln` | `BurnerMixin` peers (shipped) | `calcine.yaml`; the kiln row propped at the ashery | the recipe catalogue (shipped loader over `content/recipes/`) | the charge in the chamber matches `category: black-salts` by material tag |
| glass batch | `fire kiln` | shipped | retagged slots; pearl-ash/potash tags; quicklime `stabilizer` | — | tag match |
| slake / causticize / hard soap | `put lime in kettle`, `pour water`, `pour lye`, `pour tallow`, `pour kettle into frame` | platform | the three materials, the caustic profile | — | `CraftVessel` is a Container (`put`); `classifyForeignPour` override |
| sell ash / potash / pearl ash | `sell` | the Avatar's (`retail/sell.yaml`) | the three `buys` lines with prices whose bid > 0 | the Business must be operable (`EmploymentApi.ensureOperatorAt`) — a seat on shift, or the self-service policy | `counter` default resolves a `Stock` in reach; the seller must own the good (the drive sweeps a hearth the player holds) |
| the round | — | the roster tick relocates the ash-man to each `station:`; the `ashes` brain acts on `candidate` | `ash-round.yaml`, `ash-man.yaml` (`behaviors: [{brain: /trade/potash/behavior/ashes}]`) | none (load on use, the tinker's precedent); ⚠ a brain on an unspawned NPC never fires — the stations spawn him | the brain's own `forceCommand`s are gated as typed lines |
| wash with potash | `wash … with potash` | shipped | `Cleanser/potash` named by the material's `cleanser:` | — | — |

⚠ Two things to check by hand in W6, not by test: that `AshPit` inherits
the Burner's `commandContributions` (no static on the class), and that
the ashery `Locale` is on the ride's exit graph (`lint:location-graph`).

---

## Acceptance-criteria coverage

| AC | where it is met | how the drive shows it |
|---|---|---|
| 1 pearl ash to the glasshouse, no new verb | W0–W4, W6; every act shipped | steps 1–11 |
| 2 ash mass follows what burned (pit, grate, clamp) | W0 (`consumeFuel`, D3, D4) | steps 3, 5 |
| 3 strength follows the wood and carries | W0 (Composition + band), W2 (hopper grade), W3 (pot grade → cake), W4 (fire carry), W5 (soap input band) | steps 3–4, 7, 9–12 |
| 4 lye responds to ash, passes, hardness; egg reads words | W2 | steps 6–8 |
| 5 weak lye costs more fuel and time | W3 (fill factor + per-batch fraction) | step 9, recorded per cake |
| 6 boiled lye yields potash, never soda | W3 (D10) | step 9 |
| 7 hard soap direct, salting-out still works | W5 | step 12 |
| 8 lye refused in the lime slot; potash/pearl ash fill flux | W4 | step 11 |
| 9 chandlery buys; the round; living or supplement | W6 + the drive's record | steps 13–14 |
| 10 brash is a by-product and burns | W1, W0 | steps 1–2 |
| 11 washing soda stocked; potash softens | W3 (the bag stays), W4 (Cleanser) | step 15 |
| 12 no number for strength or grade | W0 (band words), W2 (worded reading), W3/W4 (grade words) | step 16, asserted on every strength line |

---

## Test & gate strategy

- Per wave: `pnpm test:near`, the touched packs' `pnpm -C
  packages/content/<pack> test`, `pnpm -C packages/server lint:family`.
- Unit coverage lives beside the code (listed per wave). Every strength
  assertion in a test matches words and `not.toMatch(/\d/)` on the player
  line.
- The wire drive (W7) is the exit criterion: `WIRE_BOOT=1 WIRE_PORT=2013
  npx vitest run tests/potash.dirty.wire.test.ts` from `packages/wire`,
  with the drive's sixteen steps as checkpoints that each assert the verb
  was UNDERSTOOD and a STATE CHANGED; a checkpoint that cannot fail is a
  defect. Clock moves by `advanceWorldClock`.
- `pnpm test` runs exactly twice: before the MR opens and at `/finalize`.
  Never in the background.
- A browser walk of the ashery and the chandlery after the wire drive is
  green (the live-drive rule); its findings go in the Drive record.

---

## Risks & opens

### STOP-AND-ASK

1. **The `flux` tag is the metal chain's.** Requirements: *"potash, pearl
   ash (and later soda) carry `flux`"*; code: limestone carries `flux`,
   the smelt reads it, `burn-lime` slots it. One tag cannot serve both
   recipes (a slot matches one category). Options: **(a)** potash family
   carries `flux` as written; limestone's smelting role is renamed
   `smelting-flux` (`SmeltController.ts:962`, `OpenWorking.test.ts:75`,
   `limestone.yaml`, mining.md) and `burn-lime`'s slot becomes
   `carbonate` (what a lime kiln actually burns — right regardless);
   **(b)** keep `flux` on limestone and give the glass family `glass-flux`
   (the requirements' word changes). Recommendation: **(a)** — `flux`
   unqualified is the glassmaker's word and the smelter already names the
   melt it serves; and (b) would make `burn-lime` keep a slot called
   `flux` that lime is the stabilizer of. W4's two lines wait on this;
   nothing else does.
2. **AC 5's wording vs the physics.** At equal VOLUME a weak lye boils in
   about the same time as a strong one (the water is the same); the true
   cost is per kilogram of potash. D8 makes the pot honest (yield by
   strength, time by volume) and the drive compares equal potash (20 L
   strong vs 60 L weak), which is 3× the hours and the wood. If the owner
   wants equal volumes to differ visibly, that is a different (and false)
   model — say so.

### Requirements-vs-code disagreements recorded, not reshaped

- *"`put` cordwood and brash in"* — the Burner's lay-in is `stoke`
  (Grounding). The drive types `stoke pit with brash`.
- *"the egg"* — a kept test egg (a `Tool`), not the hen's egg (D7).
- *"a hearth's swept ash sells at the chandlery"* — only ash from a hearth
  the seller holds title over (the fresh-title rule). The drive clones a
  stove into the player's own room (wizard `clone`) and sweeps that;
  sweeping the general store's hearth is the taking case and `sell`
  refuses *not yours* — which is correct and worth a checkpoint.
- The washing-soda profile's deletion removes nothing a player could reach
  (never driven; no counter stocked its output).

### Risks

- `Stock` `par: 0` for a buys-only line may be refused by the loader or
  `lint:shopfronts`; fall back to `par: 1` (a faucet of one cake — note
  it) or `from: { store }` with a stockpile row in the chandlery.
- `buyFrom`'s ownership gate for a house hand selling the house's own
  good (the ash-man after `transferChattel(business)`): if refused, the
  round trades on the ash-man's own account instead (he is a sole trader;
  pay owners from his account, sell as himself) — the tinker's shape.
- Paying an organization- or group-held hearth's owner needs that owner
  to have a bank account (`BankingApi.primaryAccountIdOf`); the Compact's
  committees may not. The brain takes-and-logs when none exists; the
  drive records which stops paid.
- `BURNER_DEFAULTS.MAX_REASONABLE_GAP_SEC` may cap a 12-hour clock jump so
  the pit does not burn down in one jump; advance in slices.
- A Material row's `extends:` across packs (`<species>-brash` extends the
  wood) — proven within base-library; the brash rows are base-library's
  too, so no cross-pack extend.
- The `calcine` recipe's output row names `/trade/fuel/thing/Ash` from a
  potash row — fine (rejection names other trades' classes), but
  `classFileOf` must resolve `/trade/fuel/thing/Ash` into trade-fuel's
  `src/` — it does by longest prefix.
- The glass melt's grade (D12b) presumes `Melt` is `Graded`; if composing
  `Crafted` onto it disturbs `Tinted`'s reads, land the carry and leave
  the melt ungraded with a note (AC 3's "glass grade" then rides the
  composition only — flag it in the MR).
- Species rows for beech and pine may already exist elsewhere; W1 greps
  before adding.
- Two Cast rows need dossiers (`lint:dossiers`): archetype `collier`-like
  for the ash-burner? Use `archetype: collier` for the burner and
  `archetype: carter` (if it exists) or `labourer` for the ash-man — check
  the archetype roster in W6.

---

## Deferred seams

Each names its destination; a slate that does not exist is the line that
opens it.

- **Rain spoils open ash; the roofed ash-house** → `potash-slate` § 2
  (the weather hook on a heap: `Wet` on `Ash` leaching alkali by rain).
- **Big ash — burnt ground, the derived ash layer, foraging** →
  `potash-slate` § 7 (unchanged).
- **Spent ash as a soil amendment** → `soil-slate` (soil's potassium
  reserve); the `liming` tag is already on the row for the day `lime`
  reads it.
- **The kelp burn (soda), natron, Leblanc** → `potash-slate` § 8 /
  `underwater-slate` § 13.
- **Any fresh egg floats** (the hen's egg as a hand tool without making
  food a `Tool`) → `instrumentation-slate` (a `handTool` that is a
  capability a non-Tool may offer).
- **A solid put into a filled vat re-matching the profile** (lime after
  the water; ash after the water) → `bulkable-slate` (an
  `onContainableAdded` re-match on Maturing hosts).
- **Person-to-person purchase** (the ash-man pays a hearth owner outside
  any verb) → `retail-slate` (a `buy <thing> from <person>` or the
  contract board as the player route).
- **The evaporative rate as a true area × deficit flux** (the fill factor
  is a bounded stand-in) → `maturation` follow-on in `bulkable-slate`.
- **Smoke as a nuisance; leave to burn on another's wood** →
  `governance` slates (a criterion and an appeal).
- **River freight for potash** → `river-slate`.
- **Ash glazes; the dye vat's alkali; bucking; saltpetre** → pottery,
  dye, cleanliness (laundry), a powder epoch — as the requirements list.
- **The ash-man walking between stops when watched** → the tinker's own
  deferred seam (employment).
- **A per-kilogram price on a counter** (a heap is priced per heap) →
  `retail-slate` (the chandlery counter's own recorded limit).

---

## Critical files

Kernel
- `packages/server/src/mud/lib/material/Material.ts` — `alkaliShare`
- `packages/server/src/mud/lib/fire/Burner.ts` — `ashAlkaliKg`, heaps, alloying
- `packages/server/src/mud/lib/cleanliness/LyeStrength.ts` — new
- `packages/server/src/mud/platform/idea/api/BulkableLogic.ts` — `blendScalar`
- `packages/server/src/mud/lib/maturation/Maturing.ts` — `batchProductFraction`, fill factor
- `packages/server/src/mud/platform/idea/reading/DensityReading.ts` — eye rung, worded lye
- `packages/server/src/mud/platform/idea/cmd/device/FireController.ts` — yield rescale, grade carry
- `packages/server/src/mud/lib/config/AppSettings.ts` + `packages/content/platform/content/settings/fire.yaml` — `fire.ash.heapKg`
- `packages/content/platform/content/platform/idea/reading/density.yaml`

Packs
- `packages/content/trade-fuel/src/thing/Ash.ts`; `…/thing/{wood-ash,ash,spent-ash}.yaml`; `…/material/organic/spent-ash.yaml`; `src/idea/cmd/fuel/CharController.ts`; `soda-from-lye.yaml` (deleted)
- `packages/content/base-library/content/stuff/idea/material/{mineral/potash.yaml, wood/*.yaml, wood/*-brash.yaml, organic/oak-bark.yaml, caustic/quicklime.yaml}`
- `packages/content/trade-forestry/src/{lib/Stand.ts, idea/cmd/forestry/FellController.ts}`; `…/thing/brash.yaml`
- `packages/content/trade-chandlery/src/thing/{Hopper,SoapKettle}.ts`; `…/idea/material/{milk-of-lime,caustic-lye,hard-soap-paste}.yaml`; `…/idea/maturation/saponification-caustic.yaml`
- `packages/content/trade-potash/**` — new pack: `src/thing/{AshPit,IronPot}.ts`, `src/behavior/ashes.ts`, `content/trade/potash/{thing/*,idea/*}`, `content/recipes/calcine.yaml`, `content/settings/potash.yaml`
- `packages/content/trade-glass/content/recipes/glass-batch{,-amber}.yaml`; `trade-glass/src/thing/Melt.ts` (verify Graded)
- `packages/content/rejection/content/world/terminus/rejection/hanging-wood/{ashery,glasshouse,ride,oak-clearing}.yaml`, `…/agent/ash-burner.yaml`, `…/idea/ashery-business.yaml`, `…/hanging-wood/glasshouse/thing/counter.yaml`; `rejection/{package.json,pack.yaml}`
- `packages/content/terminus/content/world/terminus/wharfside/chandlery/{thing/counter.yaml,idea/ash-round.yaml,agent/ash-man.yaml,location/floor.yaml}`; `terminus/package.json`
- root `package.json` (the deployment manifest)

Drive
- `packages/wire/tests/potash.dirty.wire.test.ts`

Docs (W7 + sweep)
- `docs/subsystems/potash.md` (new); `cleanliness.md`, `fire.md`,
  `mining.md`, `forestry.md`, `maturation.md`, `instrumentation.md`,
  `glass.md`, `retail.md`, `content-packs.md` (pack count), `CLAUDE.md`
  map line (sweep only)

---

## Drive record

