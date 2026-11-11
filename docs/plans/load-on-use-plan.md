# Load on use, round two — implementation plan

Executes [load-on-use-requirements.md](../requirements/load-on-use-requirements.md).
**Kind:** refactor/sweep. **Lead:** kernel. Nine rosters stop standing up at
boot — materials, biomes (bar the root), conditions, the address index, and the
five material-adjacent families (cleansers, maturation profiles, fraction
schedules, fabrics, dyestuffs). The five families become **documents** over
`DocumentCatalogue` (the !560 recipe, verbatim); materials, biomes and
conditions **stay Ideas** and load when reached; the address index builds on
first use. Every read that reaches one of them cold fails naming the path.
Nothing a player does changes. Seeding slates: [scan-sweep](../slates/builds/scan-sweep-slate.md)
§ Reuse ledger, [documents-path-identity](../slates/builds/documents-path-identity-slate.md).

⭐ **The plan's center is the reader census** (§ Grounding, per family): every
synchronous reader that is NOT the template applier, and the mechanism that
makes its row resident before it runs. The applier already loads what a row
cites (`identity:constituent`); the boot lines survived only for the readers
below.

---

## ✅ Owner decisions (2026-11-11) — these override the Risks text below

All six Risks calls went the plan's recommended way:

1. **Biome keeps no catalogue** (Risks 1) — `BiomeCatalogue` is deleted in W7.
2. **Materials load per row** (Risks 2) — by constituent, relation, act and
   restore door; the roster warms only for the three roster reads. No
   first-reach warm of all rows.
3. **Fabrics are cited by path** (Risks 6) — the 19 garment rows and the
   fixtures change (D5 as written).
4. **`lint:census` (f) narrows** (Risks 3) — a constituent cycle is refused
   only when it leaves the Material family; fix the gate's prose with it.
5. **`COMMONS_CEILING` rises to the audited number** (Risks 4) — write the
   caller audit in the gate's comment, as !560 did.
6. **The constants become CONTENT** (Risks 12, revised by the owner
   2026-11-11) — no `constituentPaths` declaration, no `onCreate` hooks, no
   new step in cloning (*"I hate any new hooks being added to cloning … it's
   already complicated enough"*). A material a class hard-codes becomes an
   authored row field declared `identity:constituent`, so the existing
   applier loads it; rows sharing a class share it through an `extends:`
   parent. Lens 2 agrees: an author can make a copper that boils something
   else. `ON_CREATE_CEILING` must not rise.

⚠ **Build order (Risks 5):** land **W7 before W6** (and W2 before W4) so the
`lint:on-create` count never rises between commits — W7's deleted
`BiomeCatalogue` hook pays for W6's two mixin hooks.

## Grounding

Verified 2026-11-11 at `eb24ec989` (`reqs/load-on-use`). Paths are under
`packages/server/src/mud/` unless they start with `packages/`.

### The machinery this build reuses (shipped in !560 and !362)

- **`lib/document/DocumentCatalogue<T>`** — abstract `Idea`; `kind`, `parse(data, path)`,
  `afterRead(value)`; doors `ensure` (async, coalesced) · `need` (sync, throws
  `DocumentNotResidentError`) · `peek` · `has` · `remember` · `resident()` ·
  `all()` (`DocumentApi.listOfKind`) · `under(prefix)` · `byWord` · `forget`.
  Memory is a hard-private static slot per kind. Reaches `DocumentApi` only by
  deferred `import()`. Nine subclasses at `platform/idea/<X>Catalogue.ts`
  (`JointCatalogue` is the exemplar: `static boundaryRole = 'commons'`, a
  module-private `describe()` validator); each reached through its Api by
  `StuffApi.singletonSync(path, () => new XCatalogue())` (`api/crafting.ts:548`).
- **`DocumentKinds`** (`lib/document/DocumentKinds.ts`) — the closed kind
  vocabulary; an entry carries `kind`, `contentDir`, `ext`, `onVanish`, and
  optionally `catalogue:` (how the go-live finds it — `DocumentApi.catalogueFor(kind)`,
  `api/document.ts:185`), `keys:` (the derived card) and `words:` (`leafWord`).
  A pack's document path is `<pack root>/<contentDir>/<file>` (`scripts/check-template-census.ts:1147-1162`).
- **The installer validates through the catalogue**: `DOCUMENT_VALIDATORS` in
  `platform/idea/api/PackLogic.ts:181-195` (`dirt: (d, p) => void MaterialApi.dirtKinds().parse(d, p)`).
- **`DocumentNotResidentError(kind, path)`** — `lib/errors.ts:86-97`; message
  says *"an engine defect, not a missing document"*.
- **Readiness** — `static readonly needs` on an Api (`api/magic.ts:78`,
  `api/government.ts:69`, `api/corpo.ts:56`, `api/help.ts:67`); the security
  wrapper awaits the needs before every **async** static (`api/security.ts:637-650`);
  the loader is `StuffApi.ready(...needs)` (`src/backend/BootstrapManager.ts:122`),
  which is `Promise.all(paths.map(singleton))` (`api/stuff.ts:825-832`). A sync
  static cannot wait; its caller awaits `StuffApi.ready(FooApi)` first.
- **The lazy-dictionary Idea precedent** — `platform/idea/GovernmentCatalogue.ts`:
  never booted, `onCreate` warms a cache from the template rows, every sync
  read calls `ensureCache()` which throws `DocumentNotResidentError('government', <catalogue path>)`
  when cold; `KERNEL_CONTENT_ROWS` in `src/test-bootstrap.ts:72-110` lists the
  lazy dictionaries so a harness's fake store answers the clone.
- **Constituent loading** — a field declared `ref: 'identity:constituent'`
  (`lib/mixin.ts:148-152`) makes `TemplateApplier.apply` phase 1
  (`platform/idea/TemplateApplier.ts:160-167`) await `StuffApi.ensureConstituent(path)`
  (`api/stuff.ts:946-970`) for every path before the setter — on mint, go-live
  and restore. `ensureConstituent` walks `extends:` ancestors first, returns
  without awaiting an in-flight load, and **never throws** (warns on a missing
  row). Declared today on: `Tangible._materialPath` + `_detailMaterialPaths`,
  `Bulkable` (two slot fields), `Atmospheric._biomePath`, `Material.cleanser`
  (`lib/material/Material.ts:286`), `Radioactivity`, `Cut`, `Organism`,
  `Species._bodyPlanPath/_parentCladePath/_defaultMaterialPath`, `Seed`,
  `Well`, and four pack fields (ranching, sericulture ×3). `lint:census`
  clause (f) checks every declared constituent resolves and that the graph
  is acyclic; clause (g) checks `DOCUMENT_PATH_FIELDS`
  (`scripts/check-template-census.ts:1130-1145`: nameBanks, offeredRecipes,
  mechanism, forms, seeAlso, placements).
- **The D7 "shape 4" precedent** — `SoilableMixin.onCreate` awaits
  `MaterialApi.dirtKinds().ensureKernel()` (`lib/cleanliness/Soilable.ts:364-367`;
  `platform/idea/DirtCatalogue.ts:95-108`), and its restore setters
  `setDeposits`/`setStains` return their loads. `DirtCatalogue.afterRead`
  ensures a dirt's aroma (`:81-83`).
- **Fixtures** — `rememberKernelDocuments()` (`src/test-bootstrap.ts:169-190`)
  reads the platform pack's `dirt/`, `formations/`, `placements/`, `topics/`
  from disk and `remember`s them.

### The nine, as they stand

| family | catalogue (boot line) | rows | roster readers today |
|---|---|---|---|
| Material | `platform/idea/MaterialCatalogue.ts` — `onCreate → warm()`: `Template.findByPathInfix('/idea/material/')` + class-extends-`lib/material/Material` filter, `StuffApi.singleton` per row. Boot: `packages/content/platform/pack.yaml:70` (`sync-read`). `LocationGraphRegistry`'s entry (`:73`) declares `dependsOn: [MaterialCatalogue]` — **stale**: `LocationGraphRegistry.ts` reads no material (grep: three hits, all prose). | 389 across 36 packs | `MaterialApi.all/findByTag/findByElement` (`api/material.ts:169-189`, via `MaterialLogic`); 109 raw `StuffApi.findByTemplatePath<Material>` sites in 50 files (§ Material census) |
| Biome | `platform/idea/BiomeCatalogue.ts` — same shape over `/idea/biome/` + extends-`lib/biome/Biome`, with `DiagnosticApi` reports on failure. Boot: `platform/pack.yaml:71`. The root `/stuff/idea/biome/universe` boots from `base-library/pack.yaml:13` — **stays**. | 13 across 4 packs | **none**: no code enumerates biomes (grep `BiomeCatalogue`, `findByPathGlob<Biome>`, `idea/biome/**` outside the catalogue → 0). `BiomeApi.findByPath` → `findBiomeByPath` → `findByTemplatePath` (`platform/idea/api/BiomeLogic.ts:721-723`); `rootBiome()` throws when cold (`:727-740`). Every other read is `(host as Atmospheric).getBiome()` (`lib/biome/Atmospheric.ts:692-695`), a constituent, and the chain walks parents by `extends:` (which `ensureConstituent` loads first). 18 reader lines in 11 files, all on hosts. |
| Condition | `platform/idea/ConditionCatalogue.ts` — `warm()` over `Template.findDescendants('/platform/idea/Condition/')` (`TemplatePathPrefixes.condition`, `lib/paths.ts:227`), leaf rows only, keeps `paths` and serves `roster()`. Boot: `platform/pack.yaml:72`, `dependsOn: [MaterialCatalogue]` (signs name tissue materials). | 41, platform only | `roster()` ×3 (`lib/vitals/Vitals.ts:587` differential; `packages/content/trade-medicine/src/idea/reading/PatientReading.ts:260,283`); 25 sync `findByTemplatePath<Condition>` sites in 13 files (§ Condition census) |
| Address index | `platform/idea/AddressRegistry.ts` — `onCreate → rebuildIndex()`: clones every Locality row under `TemplatePathRosters.locality` and inserts into a `PathTrie` + a `byName` map. Boot: `platform/pack.yaml:68` (`producer`). `AddressLogic` reaches it through `lookupRegistry()` (`platform/idea/api/AddressLogic.ts:111-116`) and **every read falls open on a cold registry** (`lookupRegistry()?.coveringLocalityOf(...) ?? null`, `:143-258`). `Locality.onCreate` self-registers (`platform/idea/Locality.ts:625-628`); the registry's own rebuild covers never-reached localities. | 24 localities, 4 packs | 33 files call the async statics (`resolveLocalityFor`/`resolveFor`/`traceResolveFor`/`localityOwnTreasuryAccountId`); **5 sync callers** (§ Address census) |
| Cleanser | no catalogue: `platform/idea/Cleanser.ts` is a leaf Idea (`CLEANSER_ACTIONS`, `CleanserDescriptor`, `descriptor()` validating-not-throwing). Named by the MATERIAL: `Material.cleanser` (`identity:constituent`, `lib/material/Material.ts:286, 369-384`), `getCleanser()` → `findByTemplatePath<Cleanser>(path)?.descriptor()`. No boot line. | 16 (15 platform at `/platform/idea/Cleanser/<key>`, 1 at `/trade/potash/idea/Cleanser/potash`); 17 material rows cite one | 2 sync sites, both `material.getCleanser()`: `platform/idea/cmd/crafting/WashController.ts:263`, `platform/thing/Tariff.ts:362` |
| Maturation profile | `platform/idea/MaturationProfileCatalogue.ts` (boot `platform/pack.yaml:58`); the class is `lib/maturation/MaturationProfile.ts` (803 lines: `SingletonMixin(Idea)`, ~30 authored fields, `rateAt`/`transformFor`-style computation, and three statics over a live glob `/**/idea/maturation/**` — `byKey` with a `foundAt` memo, `cultureForStrain`, `forMaterial` (TAG match: `material.hasTag(inputCategory)`)); `platform/idea/maturation/MaturationProfile.ts` is the 11-line instanceable twin every row names. | 37 across 12 packs, every row has `key:` | `Maturing.ts` (`MaturationProfileRef.byKey(this.maturationProfileKey)` ×8, `forMaterial` via the `@hook matchProfile` `:1513`, `cultureForStrain` `:1581`); `Ripening.ts:185,232,292`; `packages/content/trade-textiles/src/lib/Finishing.ts:132,158`. All inside **sync reconcile-on-read** (`reconcileFerment`, `reconcileRipening`, `rekeyBatch`, `startRipening`). The vessel persists the profile's **key** (`maturationProfileKey`, `ripeningProfileKey`, `finishingProfileKey`; `runtimeState`). |
| Fraction schedule | `platform/idea/FractionScheduleCatalogue.ts` (boot `:59`); class `lib/fractionation/FractionSchedule.ts` (`key`, `inputCategory`, `separation`, `fractions[]`, `productMaterial`, `residueMaterial`, …; statics `byKey`/`forMaterial` over `/**/idea/fractionation/**`); twin `platform/idea/fractionation/FractionSchedule.ts`. `lint:fraction-schedules` reads the rows. | 10 across 4 packs | `Fractionating.ts` — `forMaterial` in `startCharge` (`:364-369`, sync, called from `reconcileRun`), `byKey(this.runScheduleKey)` ×8 (`:318,326,597,603,675,703,777`). Persists `runScheduleKey` (`runtimeState`). |
| Fabric | `platform/idea/FabricCatalogue.ts` — **already lazy**: no boot line; `Constructed.setConstructionForm` (`lib/material/Constructed.ts:41,58-72`) awaits `StuffApi.singleton('/platform/idea/FabricCatalogue')` on an unknown form word, whose `warm()` stands up every `/idea/fabric/` row and pushes `toSpec()` into `Construction`'s module-private `FABRICS` map (`Construction.registerFabric/fabric/fabricKeys/clearFabrics`, `lib/material/Construction.ts:404-500`, all `@internal`). `Fabric.onCreate` also self-registers (`platform/idea/material/Fabric.ts:157`). Rows: `/stuff/idea/fabric/{woven,knit,felted}`, `/trade/textiles/idea/fabric/{sackcloth,fine-woven}`. | 5; 19 garment rows cite a fabric **word** (`constructionForm: woven` ×15, `knit` ×2, `felted`, `sackcloth`) beside kernel words (`plate`, `mail`, `hide`, `bladed`…) | `Construction.isForm`/`of` from `Constructed.getConstruction`, `lib/craft/Assembled.ts:416-418` (a bill line's form), `platform/idea/api/ConditionLogic.ts:1280` (the covering stack) — all sync, all keyed by the stored word |
| Dyestuff | pack-owned: `packages/content/trade-dyeing/src/idea/{Dyestuff,DyestuffCatalogue}.ts` (`key`, `materialPath`, `chemistry`, `shades[]`, `shadeFor(mordant)`; statics `forMaterial(path)`/`all()` over `/**/idea/dyestuff/*`). No boot line, and **nothing reaches the catalogue** (grep → only `lint:template-scans`' allowlist); it is a dead warm. `trade-dyeing` ships `content/trade/dyeing/idea/dyestuff-catalogue.yaml`. | 4 rows (`woad`, `weld`, `madder`, `kermes`), each naming its material | `DyeController.ts:108` (async `execute`, `Dyestuff.forMaterial(material path)`), `:249` (a sync candidate filter) |

### Material census — the non-applier readers

`StuffApi.findByTemplatePath<Material>(` — **109 non-test sites in 50 files**
(by file: Burner 8, CraftingLogic 7, Thermal 6, Mould 5, Maturing 5,
Tangible 4, ConditionLogic 3, BlendLabel 3, Fractionating 3, Bulkable 3,
SmeltController 3, then 2 or 1 each in 39 files including the sync doors
`lib/material/Tangible.ts:346-364`, `lib/bulk/SourceSlot.ts:78-80`,
`lib/ground/Floor.ts:644-651`). Classified by where the path comes from:

| class | sites | what the path is | mechanism |
|---|---|---|---|
| **(a)** the host's own field, already `identity:constituent` | 10 | `Tangible._materialPath`/`_detailMaterialPaths` (`:356,364,388,392`), `Bulkable.interiorMaterial`/`surfaceMaterial` (`:1103,1288`), `Maturing.startBatch:898`, `Fractionating.startCharge:367`, `Comminuting.productFor:276` (the fed charge), `Well.liftInto:258` | the applier; the read becomes loud on a non-empty cold path |
| **(a\*)** the host's own authored field, **not yet declared** | 7 | `Steepable.steepsInto` (`SteepController:81`), `Composition.makeup` (`MaterialLogic:312`, `Integrity:421`, quarrying `Clay:138`), `Compounding.productMaterial` (`CraftingLogic:2763`), `Comminuting.productMaterial/residueMaterial/products[].product` (`:429`), `Atmospheric.enclosure[].material` (`:1335`) | declare `ref: 'identity:constituent'` on each (W8a); `lint:census` (f) then resolves them |
| **(b)** a relation on a **Material capability mixin** | 15 | `Mixture.composition[].materialPath` (`MaterialLogic:1066`, smelting `:648,681`), `Kinetic.kinetics` rung outcomes / pool-set `becomes` / `volatiles[].material` (`Thermal:1779`, `Mould:662`, fuel `Gasometer:41`, `Condenser:55`), `Kinetic.drainSetting` (`Mould:718,982,1020`), `Fusion.chillsTo[].becomes` (`Mould:1046`), `Solution.concentratesTo/purifiedByBoiling/crystallizesTo{product,residue}/filteredTo` (`Thermal:2519,2540,2843,2868`, `Bulkable:1430`); `Radioactivity._decayProductPath` (`:113`) is **already** a constituent | declare `identity:constituent` on each field (W8a, D2) — the related row loads with the material. ⚠ `kinetics` ladders may cycle (freeze ↔ melt); see Risks 3 |
| **(b)** a relation on **another Idea row** | 17 | `MaturationProfile.productMaterial/turnedMaterial/leesMaterial/transforms` (`Maturing:632,1181,1520`, `Ripening:255`, textiles `Finishing:171`), `FractionSchedule.productMaterial/residueMaterial` (`Fractionating:435,464`), `Species._defaultMaterialPath` (`:1550`, already constituent), `Species.production[].yieldRow` (`Producing:1152`), `BodyPlan.bodyParts[].tissues[].tissuePath` (`ConditionLogic:169,181`), `Effect.bulkMaterial` (`MagicLogic:1738`), the ground pack's `Deposit.fluids[].fluid`/`gas.material`/lode·stratigraphy·gangue paths (drilling `Wellhead:690,719`, mining `Working:813`, `SurveyReading:165`, `Deposit:1205`, and `Pumping:294,417` through `Wellhead.standingMaterial`) | profiles/schedules: the document catalogue's `afterRead` (W4); Species/BodyPlan/Effect/Deposit: declare `identity:constituent` on the field in its own class (pack fields in the pack's `fieldMeta`) |
| **(c1)** a **code constant** or AppSettings dial | 13 | `PipeRun` `WATER_PATH` (`:261,280`), `Midden` `COMPOST` (`:51`, async), `WaterFixture` plain/fouled water (`:568`, async), `WeatherLogic` `stormPuddleFreshWaterMaterialPath` (`:1389`), `Atmospheric` `enclosureDefaultMaterial` (`:1335` fallback), farming `Field` `TEXTURE_MATERIALS` (`:423`), sugar `Copper` `RAW_LIQUOR`/`SKIMMINGS` (`:101,160`), `SugarLoaf` `MOLASSES` (`:141`), dairying `Churn` `CHURNED_CREAM` (`:70`), potash `IronPot` `BLACK_SALTS` (`:119`, async), fishing `LayController` `WATER` (`:64`, async), medicine `BleedController` `BLOOD_MATERIAL` (`:101`), chandlery `SoapKettle` `MILK_OF_LIME` (`:119`), smelting `SmeltController` product (`:821`, async, an attribute match) | async sites: the act awaits `MaterialApi.materials().ensure(path)`; sync sites (8): D7 shape 4 — the class that names the constant loads it when it stands (see D2' and Risks 12 for the two ways to write that) |
| **(c2)** a **runtime field a prior act wrote**, read back later | 43 | bulk payload `makeup[].materialPath` (`TasteModality:42`, `SmellModality:312`, `BlendLabel:83,126,211`, `Metabolic:1601`, `Palate:311`), `madeFrom` (`Maturing:1563`, dairying `Wheel:61`), atmosphere `Concentrate.type` (`AtmosphereReading:145`, `FireLogic:670`, `Garment:342`, `Respiration:756`, `Floor:521`, `Burner:1038`), coats/paint (`Faced.materialAt:310` ×10, `SurveyController:198`, `Sheet:299`, `Rag:77`, `Paint.materialAt:176` ×5), `Assembled.parts/joints` (`Assembled.materialAt:413` ×7, `CraftingLogic:4083,4762,5065,5211`, `ConditionLogic:1286`, `Burner:549`), `Burner.fuelBed` (`:779,900,916,932,981,1393`), `BuildContribution.materialPath` (`CraftingLogic:1418,2917`, painting `PaintPot:123`), `Floor.strewn` (`:114`), `Floor.underfootMaterialPath` (`:649`), `Thermal.kineticRecord.origin` (`:1481`), a water `draw.materialPath` (`ElectricityLogic:237`, `SourceSlot:80`), `WashSpec.cleansers[].materialPath` (`Garment:285`) | **resident by induction** while the process lives (D7 shape 3 — the act that wrote the path held the row); **the restore door** after a restart: the field's restoring setter (`setBulkPayload`, `setCoats`, `setParts`/`setJoints`, `setFuelBed`, `setStrewn`, `setKineticRecord`, `setContents` on the atmosphere…) returns `ensure` for every path it carries, awaited by the applier in restore mode (the `Soilable.setDeposits` shape); `underfootMaterialPath` is stamped inside the already-async `resolveUnderfoot` (`Floor:676-715`) and ensures there; a water `draw` is the water pack's reach's own field (its `Shore` read, a constituent of the reach) |
| **(mix)** | 2 | `Pumping:294,417` — whichever `standingMaterial()` answers: `Well.standing` (a), `Wellhead` → Deposit (b), `BilgeWell`/`Boat` → `WATER_PATH` (c1) | by the implementer's own class |
| **(d)** a roster read | **0** of the 109; **3** elsewhere | `lib/wiki/components/materials.ts:46` (`MaterialApi.all()`, a sync static render), carpentry `PatternStock.ts:57` (`findByTag('metal')`, sync), `MaterialLogic.everyMaterial:921` (the glob all three delegate to); `findByElement` has **no production caller** | `MaterialApi.materials()` (`roster()`, `byTag`) after the page's / the act's async parent awaits `StuffApi.ready(TemplatePaths.materialCatalogue)`; `findByElement` deleted |

Totals: a 10 · a\* 7 · b 32 (+2 already declared) · c1 13 · c2 43 · mix 2 =
109. ⭐ The largest class is **c2 — runtime fields read back after a
restart** — so the material wave is mostly a *restore-door* sweep over the
setters of eight runtime fields, not an act sweep.

**Setters take instances, not paths.** `Tangible.setMaterial(material, detailKey?)`
(`lib/material/Tangible.ts:398`, the only writer of `_materialPath`) and
`Bulkable.setBulkMaterial(aff, material)` (`lib/bulk/Bulkable.ts:1106`) take
a live `Material`; a caller already holds the row. Production call sites:
`setMaterial` 64 (19 in sync functions), `setBulkMaterial` 36 (25 sync — the
Thermal phase family `:2385-2877`, `Maturing.reconcileFerment/ensureInteriorMaterial/rekeyBatch`,
`Fractionating.beginRun/spendRun`, `Bulkable.debitBulk`, `BulkableLogic.transfer`),
`rekeyBatch` 4 (all sync); tests 515 sites in ~300 files, 7 more in wire
eval strings. ⭐ **Therefore the D7 "setter returns its load" door is the
wrong tool for materials**: the sync reconcile chains cannot await, and a
return-type change ripples through 626 sites for no load that the lookup
door cannot do better. The load point is the **lookup** (the 109 sites) and
the **relation/act** that produced the path (D2 below). Setter signatures do
not change in this build.

Other material-path setters (out of scope unless the census puts their
reader in (b)/(c)): `Plant.setStandardMaterialPath`, `Combustible.setCharMaterialPath`
(`lib/fire/Combustible.ts:244`), `Ore.setGangueMaterialPath` (trade-mining),
`Species.setDefaultMaterial`. Direct `_materialPath =` writes in two
constructors (`platform/thing/Bottle.ts:48`, `packages/content/arcana/src/thing/Potion.ts:35`).

### Biome census

`setBiome` has **0 production callers** (47 in tests). The 18 reader lines:
`BiomeLogic.ts` ×5 (the chain walk `:655`, `findBiomeByPath`, `rootBiome`,
`:1558`), `BiomeCatalogue.ts` ×3 (deleted with it), `Atmospheric.ts` ×2
(`getBiome`), `Biome.ts` ×1 (the parent read), `AltitudeReading`,
`SoundModality`, `TraceAtmosphereController`, `Soil.ts`, and the water pack's
`StorageNode`/`ControlStructure`/`Conduit` — every one `host.getBiome()` on a
host whose `_biomePath` the applier loaded. The parent chain: `Biome._parentPath`
is read from the row at `onCreate` (`lib/biome/Biome.ts:83-91`) and resolved
by `BiomeApi.findByPath` — the ancestor rows are live because
`ensureConstituent` walks `extends:` first (`api/stuff.ts:957-959`). The
root is booted and `rootBiome()` already throws cold.

### Condition census

Readers resolve a path they hold: the body's own affliction records
(`c.templatePath` — `Vitals.ts:450,584,602,613,950,1464,1479,1494,1860,2508,2598`;
`PatientReading.ts:245`; the medical controllers `Dose:132`, `Cool:109`,
`Warm:110`, `Prescribe:64`; `AssessController:190`), a toxin/pathogen KEY
turned into a path by prefix (`Metabolic.resolveToxinBehavior` `:1110`,
`Contaminable.behaviorOf` `:247` — a **static** on a provision's mixin), a
spell effect's `conditionPath` (`lib/magic/Effect.ts:84,471-479`,
`MagicLogic.ts:1577`), the kernel's own `TemplatePaths.*Condition` constants
(`lib/paths.ts:144-186`: metabolism ×5, mortality, circulation ×2, thermal ×3,
respiration ×5), and the three `roster()` reads. The write is
`VitalsMixin.afflict({templatePath})` (`Vitals.ts:3507`, sync, returns
`boolean`, **consumed** by `ConditionLogic.ts:1405,1477,1546,1591`): 26
production callers, 23 of them sync (metabolism/respiration/thermal ticks under
the scheduler, `ConditionLogic.inflict*`, `MagicLogic`, `CombatLogic`), 117
in tests. Every condition is read or written **on a body** (`VitalsMixin`) or
**on a provision** (`ContaminableMixin`); nothing else reaches one.

### Address census

Sync statics (`coveringLocalityOf`, `coverageChainOf`, `findByAddress`,
`resolvePlace`, `findLocalityByName`, `findByPath`, `isStreetLitTonight`)
have **5 external callers**: `platform/idea/cmd/work/JobControllerBase.ts:119`
(`place()`, sync, called from an async controller), `packages/content/trade-haulage/src/idea/cmd/haulage/ShipController.ts:103`
(`resolvePlace`, in an async `execute`), `lib/description/Perceiver.ts:251`
(`coverageChainOf` right after an awaited `AddressApi.resolveFor`),
`platform/idea/api/GovernmentLogic.ts:56` (`chainForAddress`, a sync helper
under `GovernmentLogic`'s async methods), `lib/perception/PublicLighting.ts:160`
(`isStreetLitTonight(this._lightingLocalityPath, path)` in sync
`isPubliclyLitNow`; `_lightingLocalityPath` is written at the host's
`onCreate` from an awaited resolve, `:130`, and the read is
`findByTemplatePath<Locality>` on the registry side, `AddressLogic.ts:268`).
`AddressLogic.resolveAddressString` and the async statics are the other 33
files' path and are all awaitable.

### Conventions checked this cycle

- `props:`/`cast:` designation is current; `container:` is refused by
  `lint:instanceable` (CLAUDE.md table). No row this build touches authors
  either.
- `Location`/`SphericalLocation`, not rooms — no place changes here.
- The five namespace axes: a pack's documents live under its own root
  (`/trade/dyeing/dyestuffs/madder`), the platform's under `/platform/…`,
  base-library's under `/stuff/…`.
- Module scope declares; the only module-scope statements added are Api
  decoration tails (none new — no new Api).
- `lint:imports`: catalogue modules reach `DocumentApi`/`DiagnosticApi` only
  by deferred `import()` (the `DocumentCatalogue` base already does; a
  subclass's `afterRead` must too). `DocumentLogic` imports no domain Api.
- Verbs on objects: no new verb; no `XApi.verb(host, …)`.
- `lint:lib-statics` ceiling 340; `lint:boundary-roles` `COMMONS_CEILING = 30`
  (must equal the count exactly); `lint:boot-entries` `BOOT_ENTRY_CEILING = 75`;
  `lint:on-create` `ON_CREATE_CEILING = 80` (limb 2, a roster warm, "is fine"
  but still counts); `lint:template-scans` allowlists the eight catalogue
  files by name (`scripts/check-template-scans.ts:78-91`); `lint:duck-typing`
  `DUCK_PROBE_CEILING = 532`, `UNDEFINED_PROBE_CEILING = 0`;
  `lint:whole-table` is a zero ratchet on `.find/.filter/[0]` after a
  whole-collection read at the call site.
- The `.build-phase` hook: `pnpm test` and `lint:family` only at
  code-complete and `/finalize`; per wave `tsc`, `test:near`, the touched
  packs' vitest, and the gates the wave moved.

---

## ⭐⭐ New substrate

Every item cites its row in the scan-sweep slate's § Reuse ledger.

| new thing | kind | ledger row | note |
|---|---|---|---|
| `platform/idea/CleanserCatalogue.ts` | `DocumentCatalogue<CleanserDescriptor>` | row 1 (one subclass per family) | kind `cleanser`; `parse` = today's `Cleanser.descriptor()` made throwing |
| `platform/idea/MaturationProfileCatalogue.ts` | rewritten as `DocumentCatalogue<MaturationProfile>` (same file name, new base) | row 1 | kind `maturation-profile`; `afterRead` ensures `productMaterial`/`turnedMaterial`/`leesMaterial` (D3) |
| `platform/idea/FractionScheduleCatalogue.ts` | rewritten as `DocumentCatalogue<FractionSchedule>` | row 1 | kind `fraction-schedule`; `afterRead` ensures `productMaterial`/`residueMaterial`/each span's `material` |
| `platform/idea/FabricCatalogue.ts` | rewritten as `DocumentCatalogue<FabricSpec>` | row 1 | kind `fabric`; `parse` = today's `Construction.registerFabric` validation |
| `packages/content/trade-dyeing/src/idea/DyestuffCatalogue.ts` | rewritten as `DocumentCatalogue<Dyestuff>` | row 1 (pack-owned, as the requirements place it) | kind `dyestuff`; the card key `material` serves `forMaterial` (D7) |
| five `DocumentKinds` entries | `cleanser` · `maturation-profile` · `fraction-schedule` · `fabric` · `dyestuff` | row 2 | each with `catalogue:`; `dyestuff` also `keys: { material }` |
| `lib/cleanliness/Cleanser.ts` (value: `CleanserDescriptor`, `CLEANSER_ACTIONS`, `CleanserDamage`) | value class/vocabulary moved out of the deleted Idea | row 3 | no statics |
| `lib/maturation/MaturationProfile.ts` (rewritten) | value class — the ~30 fields as readonly data + `rateAt`/`transformFor`/`getOffGas`… as instance computation | row 3 | the three statics and `CLASS_PATH`/`foundAt` deleted; `lint:lib-statics` falls |
| `lib/fractionation/FractionSchedule.ts` (rewritten) | value class — spans, `separation`, `residueShare`, the span arithmetic | row 3 | statics deleted |
| `packages/content/trade-dyeing/src/lib/Dyestuff.ts` | value class (`ShadeAvatar`, `shadeFor`) | row 3 | a pack `lib/` for pack-only substrate (CLAUDE.md § Instanceable lives in platform) |
| `MaterialApi.materials()` · `.cleansers()` · `.fabrics()`; `BulkableApi.maturationProfiles()` · `.fractionSchedules()`; `ConditionApi.conditions()` | catalogue accessors on existing Apis (`singletonSync`, the `dirtKinds()`/`pumpMechanisms()` shape) | row 6 (an Api's reads declared) + the !560 rule *a family's lookups live on a catalogue singleton reached through its domain Api* | the dyestuff catalogue has no Api door: a pack cannot own an Api; `DyeController` reaches it by its own class and `DocumentApi.catalogueFor('dyestuff')` finds it for the go-live |
| `MaterialCatalogue` / `ConditionCatalogue` doors (`ensure` · `need` · `peek` · `roster`) | methods on the two surviving Idea catalogues | row 5 (lazy dictionary + `StuffApi.ready`) and row 9 (the material warm generalized) | ⚠ deliberately **no shared base**: two implementers, not three (P1 — promote at the third) |
| `AddressApi.needs` · `ConditionApi.needs` (+ `GovernmentApi.needs` gains the address registry) | `static readonly needs` | row 6 | `MaterialApi` declares **no** `needs` (D2: a roster warm on every async material call would re-boot the roster through the back door) |
| `DOCUMENT_PATH_FIELDS` += `cleanser: 'cleansers'`, `constructionForm: 'fabrics'` | lint extension | row 7 | path-shaped values only (`constructionForm` also holds kernel words) |
| persisted fields `maturationProfilePath`, `ripeningProfilePath`, `runSchedulePath`, `finishingProfilePath` | rename of the four `…Key` runtime-state fields | row 4 (a cited thing resident whenever its citer is — the restore door) | setters return `ensure(path)`; no migration (dev DBs are dropped) |
| restore-door setters on eight runtime fields (`setBulkPayload`, `setCoats`, `setParts`/`setJoints`, `setFuelBed`, `setStrewn`, `setKineticRecord`, the atmosphere contents, `setMadeFrom`) | return type `void` → `Promise<void>` | row 4 | the c2 class of the material census; each with a call-site census (W8b) |
| c1 constants → authored row fields (`identity:constituent`) | new authorable fields on the classes that hard-coded a material | row 4 (a cited thing resident whenever its citer is — the applier's constituent load) | no new mechanism |
| `onCreate` readiness on `VitalsMixin`, `ContaminableMixin`, `MaturingMixin`, `RipeningMixin`, `FractionatingMixin`, textiles `FinishingMixin` | one awaited line each | row 4, mechanism 4 (`Soilable.onCreate` precedent) | `lint:on-create` arithmetic in Risks 5 |

**Genuinely new: nothing.** Searched: `lib/document/`, every `*Catalogue.ts`,
`DocumentKinds`, the four `needs` declarations, `test-bootstrap.ts`.
**Retired:** `BiomeCatalogue` (+ its yaml row and `lint:template-scans`
entry), `platform/idea/Cleanser.ts`, `platform/idea/material/Fabric.ts`,
`platform/idea/maturation/MaturationProfile.ts`, `platform/idea/fractionation/FractionSchedule.ts`,
`packages/content/trade-dyeing/src/idea/Dyestuff.ts`, `Construction.registerFabric/fabric/fabricKeys/clearFabrics`
+ the `FABRICS` map, `MaterialProfile.foundAt`, six boot lines, one `dependsOn`.

---

## Plan-level decisions

**D1 — Two shapes, by the Idea-or-document test.** The five families are
documents (owner, 2026-11-08: metadata nothing writes, acts on, or chains
through). Material, Biome, Condition stay Ideas (query links, class-varying
behavior). Both shapes share one rule: *cold means loud* — a sync read that
misses throws `DocumentNotResidentError(kind, path)`, never `null`, except
where `null` is the honest "there is nothing here" (an empty path). The error's
message loses the word *document* ("not a missing row") so an Idea kind reads
right; the class is not renamed (the !560 call sites stand).

**D2 — Materials load by three doors, and the setters keep their shape.**
(a) a holder's own material: the applier (unchanged); (b) a relation on a
Material row to another material: `identity:constituent` on that field, so
the related row loads with its citer (the census table names each field);
where two materials cite each other (a melt/freeze twin pair) the pair is
declared `identity:constituent` on **one** side only — the side a sync reconcile
reads first — and `lint:census` (f)'s acyclicity holds; (c) a runtime-chosen
path: the async act awaits `MaterialApi.materials().ensure(path)` (a recipe's
output materials are ensured by the recipe dictionary's own read; a smelt
product by `SmeltController`; the kernel's `TemplatePaths` materials by the
act that names them); (d) the roster: `MaterialApi.materials()` after
`StuffApi.ready(TemplatePaths.materialCatalogue)`. The sync lookup is one door
— `MaterialApi.materials().need(path)` throws cold, `.peek(path)` for a
read that may honestly miss — and the 109 raw `findByTemplatePath<Material>`
sites go through it. `Tangible.getMaterial()` answers `null` only for an
empty path. ⚠ **Not chosen:** returning a load from `setMaterial` — the
setter takes an instance, and 44 production callers are sync reconciles.

**D2′ — The c2 class is a restore-door sweep; the c1 class is a class-level
citation.** A runtime field that holds material paths (the bulk payload's
makeup, a face's coats, an assembly's parts and joints, a burner's fuel bed,
a floor's strewn layer, a thermal kinetic record, an atmosphere's contents)
is resident by induction while the process lives — the act that wrote it
held the row — and cold after a restart. So the **restoring setter** of each
such field returns `ensure` for every path it carries, the applier awaits it
in restore mode, and the sync reader finds it (documents D7 shape 2; the
`Soilable.setDeposits` precedent). The eight code constants read in sync
functions (`PipeRun`'s water, `Copper`'s liquor and skimmings, `SugarLoaf`'s
molasses, `Churn`'s cream, `SoapKettle`'s milk of lime, `Field`'s texture
map, `WeatherLogic`'s puddle water, `Atmospheric`'s enclosure default) are a
class's own built-in citation — D7 shape 4 — loaded when the class stands:
✅ **owner, 2026-11-11: as CONTENT** — each constant becomes an authored row
field declared `identity:constituent`, which the applier already loads
before the setter runs; rows sharing a class share it via an `extends:`
parent. No `onCreate`, no declaration, nothing new in cloning.

**D3 — The vat and the still match by tag, over a lazy index.** The
`inputCategory` tag match (`forMaterial`) is the recipe-slot `category`
convention and a `@hook matchProfile` override point (the lye hopper); flipping
it so every must names its profile would edit ~40 material rows and change the
hook's meaning. Per the slate's ruling (*attribute matches … or stay lazy
indexes, decided per match*): the whole kind is read once per process in the
vessel mixin's `onCreate` (D7 shape 4 — `BulkableApi.maturationProfiles().ensureAll()`,
the `DirtCatalogue.ensureKernel` shape over `all()`), and the match runs over
`resident()`. `byKey` is replaced by the vessel storing the profile's **path**
(`maturationProfilePath` etc.), read with `need(path)`, restored through a
setter that returns `ensure(path)`. `cultureForStrain` (one caller, the pitch
check) becomes `BulkableApi.maturationProfiles().cultureForStrain(strain)`
over `resident()`. The `key:` line leaves every profile/schedule row: the leaf
is the key (documents D8). A profile's/schedule's product materials are
ensured in `afterRead` (door (b) of D2).

**D4 — Cleansers stay named by the material.** `Material.setCleanser(path)`
returns `MaterialApi.cleansers().ensure(path)` (the applier awaits it);
`getCleanser()` → `need(path)`; the field's `ref: 'identity:constituent'`
is dropped (it is a document now, and clause (f) resolves against rows) and
`cleanser` joins `DOCUMENT_PATH_FIELDS` (clause (g)). The 17 citing material
rows change their path from `/platform/idea/Cleanser/<k>` to
`/platform/cleansers/<k>` (`/trade/potash/cleansers/potash`).

**D5 — Fabrics are cited by path; kernel forms stay words.** The requirements
say *cited by path* and the AC wants a misspelled citation caught before
merge. `constructionForm` keeps one vocabulary: a kernel word (`plate`,
`bladed`, …) or a fabric document path (`/stuff/fabrics/woven`,
`/trade/textiles/fabrics/sackcloth`). `Construction.isForm(s)` = kernel word
∨ `MaterialApi.fabrics().peek(s) !== null`; `Construction.of(path)` reads the
spec through `need`; `Constructed.setConstructionForm(value)` returns
`MaterialApi.fabrics().ensure(value)` for a path value (it is already async
and already loads on an unknown word — the one-roster warm goes). Prose that
prints a form uses the leaf (`wordOf`, the `DirtCatalogue` shape). 19 garment
rows change `woven` → the path (B4 sweep). ⚠ A word that is neither a kernel
form nor a path throws at hydration, as today.

**D6 — Dyestuffs are found by the card, not by a kernel field.** The
alternative — `Material.dyestuff:` on the madder/weld/woad/kermes rows, the
cleanser shape — would put a one-pack field on a kernel class that 385 of 389
rows answer "no" to (P2). The `dyestuff` kind declares `keys: { material }`
(derived from the document's `material:`), and `DyeController` (async) calls
`DyestuffCatalogue.forMaterial(path)` = `findByKey('dyestuff', 'material', {eq: path})`
(the press's `findByKey` precedent), which `remember`s the hit; the sync
candidate filter at `:249` reads `residentForMaterial(path)` after the act
ensured the pack's dyestuffs once (`under('/trade/dyeing/dyestuffs')`).

**D7 — Conditions load with the first body.** Every condition is read or
written on a `VitalsMixin` host or a `ContaminableMixin` host, through sync
seams that cannot wait (scheduler ticks, `inflict`). D7 shape 4: both mixins'
`onCreate` await `StuffApi.ready(TemplatePaths.conditionCatalogue)`; the
catalogue's `onCreate → warm()` stands the 41 rows up once per process.
`ConditionApi.needs = [conditionCatalogue]` covers its async statics;
`afflict` and every sync `findByTemplatePath<Condition>` go through
`ConditionApi.conditions().need(path)` (throws cold). The roster is small and
kernel-only today; a pack condition under its own root joins by the same
`/idea/Condition/` infix the material warm uses (the prefix roster widens to an
infix scan, the `MaterialCatalogue.warm` shape, so a pack's row needs no line).

**D8 — Biomes need no catalogue.** Nothing enumerates biomes; every read is a
host's constituent, parents load by `extends:`, the root stays booted and
already throws cold. `BiomeCatalogue` is deleted. `Atmospheric.getBiome()`
throws on a non-empty cold path. Its diagnostic (a biome row whose class does
not load) is `lint:census` (f)'s job at build time; at runtime the loud read
names the path.

**D9 — The address index stands up on first use.** `AddressApi.needs = [addressRegistry]`;
`GovernmentApi.needs` gains it (its `chainForAddress` is sync under async
statics). The five sync callers: `JobControllerBase.place` and `ShipController`
await `StuffApi.ready(AddressApi)` before `resolvePlace`; `Perceiver` and
`PublicLighting` already follow an awaited resolve; `GovernmentLogic` is
covered by `needs`. `AddressLogic.lookupRegistry()` stops falling open: a cold
registry throws `DocumentNotResidentError('address-index', TemplatePaths.addressRegistry)`.
`Locality.onCreate`'s self-registration stays (it is a no-op into no registry
and the rebuild covers it). No derivation redesign (non-goal).

**D10 — No new Api, no new mixin, no shared Idea-catalogue base.** Two Idea
catalogues gain the same four doors by hand; a third consumer promotes them.

**D11 — Fixtures stand the lazy dictionaries in.** `KERNEL_CONTENT_ROWS` gains
`/platform/idea/MaterialCatalogue`, `/platform/idea/ConditionCatalogue`,
`/platform/idea/AddressRegistry` (a harness's fake store answers the clone);
`rememberKernelDocuments` gains `cleansers`. A test that needs a material
resident stands it up as it does today (`makeStuff` with a stamped path) —
the sync door finds a live instance whoever made it. A test that needs a
profile/schedule/fabric/dyestuff uses `remember(path, parse(data, path))` from
the shipped file, never a spy on a static (there are none left).

**D12 — Waves land smallest-and-purest first**: the five document families
(each a copy of the !560 recipe), then address, then condition, then biome,
then material in two halves. Every wave removes its own boot line and moves
its own gates.

---

## ⭐⭐ Host placement

| field / behavior | host | what composing it claims | everyone on that host answers yes? |
|---|---|---|---|
| `onCreate` → `StuffApi.ready(conditionCatalogue)` | `VitalsMixin` | every body can take a condition | yes — a body with vitals is exactly what a condition lands on |
| `onCreate` → `StuffApi.ready(conditionCatalogue)` | `ContaminableMixin` | every contaminable provision may carry a pathogen whose behavior is a condition row | yes — that is the mixin's whole meaning |
| `onCreate` → `maturationProfiles().ensureAll()` | `MaturingMixin`, `RipeningMixin`, trade-textiles `FinishingMixin` | every such vessel matches a profile by its charge's tag | yes — a vessel composes Maturing to run a profile |
| `onCreate` → `fractionSchedules().ensureAll()` | `FractionatingMixin` | every still matches a schedule | yes |
| `maturationProfilePath` (was `…Key`) | `MaturingMixin` (same host as today) | — | unchanged host |
| `ripeningProfilePath`, `finishingProfilePath`, `runSchedulePath` | `RipeningMixin`, `FinishingMixin`, `FractionatingMixin` | — | unchanged hosts |
| `cleanser` (now a document path) | `Material` (unchanged, cleanliness B50) | a material may be what you wash with | unchanged — 17 of 389 say yes, and the owner placed it there; not reopened |
| `constructionForm` (now word-or-path) | `ConstructedMixin` (unchanged) | — | unchanged |
| `needs` | `AddressApi`, `ConditionApi`, `GovernmentApi` | every async static of that Api stands on the index/roster | yes for Address and Government (every read resolves a locality); yes for Condition (`treatWorstResolvable`, `die`, `embodyForSession`, `reembody` all read condition rows) |
| no `needs` | `MaterialApi` | — | **no**, deliberately: `MaterialApi` carries the whole materials-response surface; `needs` would warm 389 rows on the first `inflict` |
| the catalogue doors | `MaterialCatalogue`, `ConditionCatalogue` | — | the two Idea families that keep a roster reader |
| nothing | `Biome`, `Thing`, `Location`, `Stuff` | — | no base class gains a field or a hook |

Guard test: no guard re-narrows any host above. Honest-default test: no
field is added whose default answers "no" on most of its host's composers.

---

## Convention conformance

- **P3 refuse/skip/throw:** every cold read throws `DocumentNotResidentError`
  naming kind and path; `ensureConstituent` keeps warning on a missing row
  (the row is the content bug `lint:census` catches), and the first read
  throws. `peek` is used only where "not mine to read" is honest (a bill line
  with no form; `Floor.getMaterial` with no underfoot path).
- **P4 no duck typing:** `DyeController` imports its own pack's catalogue
  class; the kernel never names `dyestuff`; `GovernmentLogic` reaches the
  address index through `AddressApi`. No `?.()` probe is added
  (`UNDEFINED_PROBE_CEILING = 0` holds; `DUCK_PROBE_CEILING` may fall by the
  `h.setMaterial?.` probe in `CraftingLogic.ts:4517` if the wave touches it).
- **P5 the mixin decides:** `isForm`/`of`, `getCleanser`, `matchProfile`,
  `afflict` keep their decisions on the model; controllers only await the
  readiness door before calling.
- **P6 persistence per content:** no row changes staged/live. The four renamed
  runtime-state fields persist on the vessel as before (`runtimeState`).
- **P7 load on use:** six boot lines and one `dependsOn` go; nothing new boots;
  no template-table scan is added (`lint:template-scans` entries fall by
  four: MaturationProfile, FractionSchedule, Fabric, Dyestuff catalogues no
  longer scan; Biome's entry goes with the file; Material/Condition/Address
  keep theirs with the LAZY_DICT reason).
- **P8 names:** no class is named for a mixin's word; the catalogues keep the
  `<Family>Catalogue` names of the nine precedents; the kinds are the
  hyphenated family words (`maturation-profile`, `fraction-schedule`,
  matching `pump-mechanism`, `help-concept`).
- **Lint gates this build must pass** (run per wave for the ones it moves,
  `lint:family` at code-complete): `lint:boot-entries` (ceiling 75 → 69),
  `lint:template-scans`, `lint:census` (clauses f, g), `lint:lib-statics`
  (falls), `lint:boundary-roles` (`COMMONS_CEILING` 30 → 33 with the caller
  audit in W4; see § Risks), `lint:on-create` (net ≤ 0; see W0),
  `lint:instanceable` (no row may name a deleted class), `lint:field-meta`,
  `lint:fraction-schedules` and the maturation row gate (follow the rows to
  the new dirs — D15 precedent), `lint:duck-typing`, `lint:whole-table`,
  `lint:imports`, `lint:module-scope`, `lint:test-bootstrap`,
  `lint:test-content`, `lint:typed-words` (no new typed word), `lint:schema`
  (no collection change), `lint:get-or-create` (no `has` before `ensure`).

---

## Waves

Every wave: typecheck (`pnpm -C packages/server tsc --noEmit`), `pnpm test:near`,
each touched pack's own vitest, the gates it moved; ends at one commit.
Review-round changes between waves follow the same rule. `pnpm test` runs at
code-complete (W9) and at `/finalize` only.

### W0 — the doors (kernel substrate, no family moves yet)

✅ **Done.** Doors `ensure`/`need`/`peek`/`roster` + a coalesced
`ensureRoster()` (the `DirtCatalogue.ensureKernel` shape) on both
catalogues; `MaterialApi.materials()`/`ConditionApi.conditions()` are
`findByTemplatePath ?? throw` while the catalogue is still booted.
`COMMONS_CEILING` 30 → 32 with the audit. ⭐ **Build decision (D13):** when a
family's boot line goes (W6, W8b), its catalogue drops `onCreate` and its
yaml row and becomes a `singletonSync` singleton like every
`DocumentCatalogue`; the roster readers await `ensureRoster()`. Reason:
`singletonSync` refuses a class with an `onCreate`, and a catalogue that
must be cloned from a row before a sync `need` can be asked is a boot
dependency in disguise — every test that hand-builds a material would
need the catalogue stood up first. `need`/`peek` read live Stuff, so the
catalogue holds no state they depend on. Consequence: `ConditionApi.needs`
is not declared (a `needs` entry is `StuffApi.ready` → a clone, which a
factory singleton never runs); every body's `onCreate` awaits
`ensureRoster()` instead, which covers the async statics that act on a body.
`lint:on-create` falls by two more than planned.

Goal: every later wave has its error, its fixtures and its gate arithmetic.

- `lib/errors.ts`: `DocumentNotResidentError` message → *"… (an engine
  defect, not a missing row)"*. No rename.
- `platform/idea/MaterialCatalogue.ts`, `ConditionCatalogue.ts`: add
  `ensure(path): Promise<T>` (resident → at once; else `StuffApi.ensureConstituent`
  then `need`), `need(path): T` (`findByTemplatePath` ?? throw
  `DocumentNotResidentError('material' | 'condition', path)`), `peek(path)`,
  `roster()` (Condition has it; Material: the live rows under the infix — a
  `findByPathGlob` over live Stuff, not the table; throws cold when the
  catalogue has not warmed, the `GovernmentCatalogue.ensureCache` shape).
  `warm()` stays and stays the `onCreate`. `static boundaryRole = 'commons'`
  on both (audit: `smell`/`taste`/`analyze` and `look` at yourself read them
  inside a circle).
- `api/material.ts`: `materials()`, `api/condition.ts`: `conditions()` —
  `StuffApi.findByTemplatePath(path)` ?? throw (NOT `singletonSync` with a
  factory: that would register an instance whose `onCreate` never ran, and
  `StuffApi.ready` would then find the bucket full and skip the warm).
  `ConditionApi.needs = [TemplatePaths.conditionCatalogue]`.
- `src/test-bootstrap.ts`: D11's `KERNEL_CONTENT_ROWS` additions.
- Gates: `lint:boundary-roles` `COMMONS_CEILING` 30 → 31 if `MaterialCatalogue`
  was not already commons (check: the file carries no `boundaryRole` today —
  it was listed in `api/security.ts`'s old table? grep at build time); the
  on-create ceiling is untouched (both hooks exist).
- Acceptance: unit tests for the four doors on each catalogue (cold → throws
  naming the path; warm → resident; `ensure` coalesces); `test:near`.
- Commit: `refactor(load-on-use): W0 — the sync doors on the material and condition catalogues`.

### W1 — cleansers become documents

- `DocumentKinds`: `cleanser: { kind: 'cleanser', catalogue: '/platform/idea/CleanserCatalogue', contentDir: 'cleansers', ext: 'yaml', onVanish: 'delete' }`.
- `lib/cleanliness/Cleanser.ts`: `CLEANSER_ACTIONS`, `CleanserAction`,
  `CleanserDamage`, `CleanserDescriptor` (moved from `platform/idea/Cleanser.ts`).
- `platform/idea/CleanserCatalogue.ts` extends `DocumentCatalogue<CleanserDescriptor>`;
  `parse` = today's `descriptor()` body, throwing (`cleanser '<path>': <why>`).
- `api/material.ts`: `cleansers()` (`singletonSync`, the `dirtKinds()` line);
  `PackLogic.DOCUMENT_VALIDATORS.cleanser`.
- `lib/material/Material.ts`: `setCleanser(path): Promise<void>` returns
  `MaterialApi.cleansers().ensure(path)` (`''` → resolved); `getCleanser()` →
  `need(path)`; drop `ref: 'identity:constituent'` on `cleanser` (keep
  `persistent`, `authorable`).
- Rows: `packages/content/platform/content/platform/idea/Cleanser/*.yaml`
  (15) → `packages/content/platform/content/cleansers/<key>.yaml` (data only,
  no `class:`, no `key:` — the leaf is the key); `trade-potash` likewise to
  `content/cleansers/potash.yaml`. The 17 citing material rows: `cleanser:
  /platform/cleansers/<key>` (potash's: `/trade/potash/cleansers/potash`).
- Delete `platform/idea/Cleanser.ts` and its tests' Idea construction (tests
  `remember` the shipped file through `rememberKernelDocuments`, which gains
  `cleansers`).
- `scripts/check-template-census.ts`: `DOCUMENT_PATH_FIELDS.cleanser = 'cleansers'`.
- Readers (2): `WashController.ts:263`, `Tariff.ts:362` — unchanged calls,
  now resident by construction.
- Setter census: `setCleanser` — production callers: the applier only (grep
  at build; any other caller awaits or `void …catch`es).
- Gates: `lint:census` (g) green on the 17 citations; `lint:instanceable`
  (no row names `/platform/idea/Cleanser`); `lint:boundary-roles` +1
  (`CleanserCatalogue`, commons — `wash` inside a circle).
- Drive steps 9 (wash) exercised at W9.
- Commit: `refactor(load-on-use): W1 — cleansers are documents named by path`.

### W2 — fabrics become documents

- `DocumentKinds.fabric` (`contentDir: 'fabrics'`, `catalogue: '/platform/idea/FabricCatalogue'`).
- `FabricCatalogue` rewritten over `DocumentCatalogue<FabricSpec>`; `parse`
  = `Construction.registerFabric`'s validation (kebab leaf, not a kernel form,
  `layerBand` 0..4 integer, `loft`/`weaveDensity`/`drape` 0..1, `stretch ≥ 0`),
  `key` = the leaf.
- `lib/material/Construction.ts`: delete `registerFabric`, `fabric`,
  `fabricKeys`, `clearFabrics`, `FABRICS`; `isForm(s)` = kernel ∨
  `MaterialApi.fabrics().peek(s) !== null`; `isFabricForm(s)` = the latter;
  `of(s)` reads the spec via `need` for a path; `getLayerDepth` unchanged in
  shape (reads the spec). ⚠ `Construction` is in `lib/`; it reaches
  `MaterialApi` by a direct import (`lib/` → `api/` value imports exist today,
  e.g. `Soilable.ts`), never a barrel.
- `lib/material/Constructed.ts`: `setConstructionForm(value)` — a path value
  → `await MaterialApi.fabrics().ensure(value)`; a word → kernel check; else
  throw as today. Delete `FABRIC_CATALOGUE_PATH` and the one-roster warm.
- `api/material.ts`: `fabrics()`; `PackLogic` validator.
- Rows: `/stuff/idea/fabric/{woven,knit,felted}` → `packages/content/base-library/content/fabrics/*.yaml`;
  `/trade/textiles/idea/fabric/{sackcloth,fine-woven}` → `packages/content/trade-textiles/content/fabrics/*.yaml`.
  The 19 garment rows: `constructionForm: /stuff/fabrics/woven` etc. (B4:
  grep `constructionForm:` across `packages/content` and every test fixture
  that writes `woven`). Delete `FabricCatalogue.yaml`,
  `platform/idea/material/Fabric.ts`.
- `DOCUMENT_PATH_FIELDS.constructionForm = 'fabrics'` (path-shaped values
  only — the census already treats `forms` that way).
- Readers: `Constructed.getConstruction`, `Assembled.ts:416-418` (a bill line's
  form: `Assembled.setBill` already returns its load — extend it to ensure a
  line's fabric path), `ConditionLogic.ts:1280` (a covering stack read on a
  worn garment — resident by the garment's own setter).
- Gates: `lint:lib-statics` falls (four `Construction` statics gone);
  `lint:census` (g); `lint:boundary-roles` +1; `lint:on-create` −2
  (`FabricCatalogue.onCreate`, `Fabric.onCreate`).
- Commit: `refactor(load-on-use): W2 — fabrics are documents cited by path`.

### W3 — dyestuffs become documents (pack-owned)

- `DocumentKinds.dyestuff` (`contentDir: 'dyestuffs'`, `catalogue: '/trade/dyeing/idea/DyestuffCatalogue'`,
  `keys: { material: (d) => d.material }`) — declared by the platform, as every
  pack's kind is.
- `packages/content/trade-dyeing/src/lib/Dyestuff.ts`: value class (`chemistry`,
  `shades`, `shadeFor`, `material`); `src/idea/DyestuffCatalogue.ts` rewritten
  over `DocumentCatalogue<Dyestuff>` with `parse` (today's `setShades`/`setChemistry`
  validation), `forMaterial(path): Promise<Dyestuff | null>` (`findByKey`,
  one hit, `remember`), `residentForMaterial(path): Dyestuff | null`
  (over `resident()`), `ensurePack()` (`under('/trade/dyeing/dyestuffs')`,
  once).
- `DyeController.ts:108` → `await catalogue.forMaterial(path)`; `:249` → the
  act calls `ensurePack()` first, then `residentForMaterial`.
- Rows: `content/trade/dyeing/idea/dyestuff/*.yaml` → `content/dyestuffs/*.yaml`
  (`materialPath` → `material`, no `key:`); delete `dyestuff-catalogue.yaml`
  and `src/idea/Dyestuff.ts`.
- `PackLogic` validator: a pack class cannot be imported by the kernel —
  the validator entry is `(d, p) => void DocumentApi.catalogueFor('dyestuff')?.parse(d, p)`
  — ⚠ check `ServesDocuments` exposes `parse`; if not, widen the interface
  by that one method (it is on every `DocumentCatalogue`).
- Gates: `lint:template-scans` −1; `lint:lib-statics` (pack statics gone);
  `lint:boundary-roles` +1 (`dye` inside a circle).
- Commit: `refactor(load-on-use): W3 — dyestuffs are documents found by their material`.

### W4 — maturation profiles and fraction schedules become documents

The two are one shape; land them in one wave.

- `DocumentKinds`: `'maturation-profile'` (`contentDir: 'maturation-profiles'`,
  `catalogue: '/platform/idea/MaturationProfileCatalogue'`), `'fraction-schedule'`
  (`contentDir: 'fraction-schedules'`, `catalogue: '/platform/idea/FractionScheduleCatalogue'`).
- `lib/maturation/MaturationProfile.ts` → a value class: constructor from
  validated data + path; every `getX()` kept as a method (the 8+3+2 reader
  sites keep their calls); `rateAt`, `transformFor`, `getOffGas` and the
  rest of the computation unchanged; **delete** `all`/`byKey`/`cultureForStrain`/`forMaterial`/`foundAt`/`CLASS_PATH`,
  the `SingletonMixin(Idea)` base, `canEvict`, `fieldMeta`. The setters'
  validation (`requireFiniteK` etc.) becomes the catalogue's `parse`.
- `lib/fractionation/FractionSchedule.ts` likewise (`FractionSpec`,
  `Separation`, `residueShare` arithmetic kept; statics deleted).
- `MaturationProfileCatalogue` / `FractionScheduleCatalogue` rewritten over
  `DocumentCatalogue<T>`: `parse`, `afterRead` (ensure `productMaterial`,
  `turnedMaterial`, `leesMaterial` / `productMaterial`, `residueMaterial`, each
  span's `material` through `MaterialApi.materials().ensure` — door (b)),
  `ensureAll()` (the `ensureKernel` shape over `all()`, once per process),
  `forMaterial(material)` (over `resident()`, the tag match with the
  two-matches warning), `cultureForStrain(strain)`.
- `api/bulkable.ts`: `maturationProfiles()`, `fractionSchedules()` (the
  `pumpMechanisms()` line). `PackLogic` validators.
- `lib/maturation/Maturing.ts`: `onCreate` awaits `ensureAll()`;
  `maturationProfileKey` → `maturationProfilePath` (`fieldMeta` + the
  interface's `getMaturationProfileKey` → `getMaturationProfilePath`);
  `setMaturationProfilePath(p)` returns `ensure(p)` (restore door);
  `matchProfile` → `BulkableApi.maturationProfiles().forMaterial(material)`;
  the 8 `byKey` reads → `need(this.maturationProfilePath)` (an empty path →
  `null`, as today); `cultureKillKFor` → the catalogue. `rekeyBatch` stays
  sync (the profile is resident by `onCreate`).
- `lib/maturation/Ripening.ts`, `packages/content/trade-textiles/src/lib/Finishing.ts`:
  the same four edits. `lib/fractionation/Fractionating.ts`: `onCreate`,
  `runScheduleKey` → `runSchedulePath` + setter, `startCharge` →
  `fractionSchedules().forMaterial`, the 8 `byKey` reads → `need`.
- Overriders of `matchProfile` (grep `matchProfile(` in `packages/content`:
  the chandlery hopper) return a resident profile by path (`need`).
- Rows: every `idea/maturation/*.yaml` (37, 12 packs) → `content/maturation-profiles/<key>.yaml`;
  `idea/fractionation/*.yaml` (10, 4 packs) → `content/fraction-schedules/<key>.yaml`;
  `class:` and `key:` lines removed. Delete the two `platform/idea/…` twins
  and the two catalogue yaml rows. `scripts/check-fraction-schedules.ts` and
  whichever gate reads maturation rows: read `content/<dir>/` instead of the
  `idea/` subtree (D15 — the lints follow the rows).
- Setter census (the only setters whose return type changes in this build):
  `setMaturationProfilePath`, `setRipeningProfilePath`, `setFinishingProfilePath`,
  `setRunSchedulePath` — new names, so every call site is new: the applier
  (awaits) and any test that sets the key directly (grep `ProfileKey =` /
  `ScheduleKey =` in `__tests__`: rewrite to the path and `await` the setter).
  Wire eval strings: grep `ScheduleKey|ProfileKey` in `packages/wire`.
- Gates: `lint:boot-entries` 75 → 73; `lint:template-scans` −2;
  `lint:lib-statics` falls by ~10; `lint:on-create` −2 catalogues +4 hosts
  (Maturing, Ripening, Fractionating, Finishing) = +2 — **offset within the
  build** by W2's −2 and W7's −1; order the ceiling edit so it never rises
  (land W2 before W4, as planned); `lint:boundary-roles` +2 (the vat's
  `taste`/`analyze` and the still's `pour` inside a circle; `MaturationProfileCatalogue`
  was already commons, so net +1); `lint:whole-table` (the match is a
  catalogue method, not a call-site `.filter`).
- Drive steps 7 and 8 at W9; the soak S1 unchanged.
- Commit: `refactor(load-on-use): W4 — the vat's profile and the still's schedule are documents`.

### W5 — the address index builds on first use

- `api/address.ts`: `static readonly needs = [TemplatePaths.addressRegistry]`;
  `api/government.ts`: `needs` += `addressRegistry`.
- `AddressLogic.lookupRegistry()`: a cold registry throws
  `DocumentNotResidentError('address-index', REGISTRY_PATH)` from every read
  door; `registerLocality`/`deregisterLocality` keep the no-op (a locality
  cloned before the index exists is picked up by the rebuild).
- The five sync callers: `JobControllerBase.place` → the two controllers that
  call it `await StuffApi.ready(AddressApi)` first (or `place` becomes async —
  pick the smaller diff); `ShipController.ts:103` → `await StuffApi.ready(AddressApi)`;
  `Perceiver`, `PublicLighting`, `GovernmentLogic`: no change (audit comment
  at each site naming why).
- `packages/content/platform/pack.yaml:68` removed; `KERNEL_CONTENT_ROWS`
  entry (W0) makes the harness clone it.
- `AddressRegistry` keeps `onCreate → rebuildIndex()`; `lint:template-scans`
  reason → LAZY_DICT.
- Gates: `lint:boot-entries` → 72.
- Drive step 5 at W9 (the first `government` builds the index; `look` in a
  lit street at night reads `isStreetLitTonight` after the room's own resolve).
- Commit: `refactor(load-on-use): W5 — the address index builds on the first address question`.

### W6 — conditions load with the first body

- `ConditionCatalogue.warm()`: `Template.findByPathInfix('/idea/Condition/')`
  + class-extends-`Condition` (the material shape; a pack's own condition
  class qualifies). `TemplatePathPrefixes.condition` stays for the kernel's
  toxin/pathogen key → path rule.
- `VitalsMixin.onCreate`, `ContaminableMixin.onCreate`: `await StuffApi.ready(TemplatePaths.conditionCatalogue)`
  (after `super.onCreate`). ⚠ `Vitals` may not have an `onCreate` today
  (grep found none) — adding one is limb 2 of `lint:on-create`.
- The 25 sync `findByTemplatePath<Condition>` sites → `ConditionApi.conditions().need(path)`
  (`Vitals.ts` ×11, `PatientReading` ×1, `Dose/Cool/Warm/Prescribe/Assess`
  ×5, `Metabolic:1110`, `Contaminable:247`, `MagicLogic:1577`, `Effect.ts`);
  the three `roster()` reads → `conditions().roster()`. `afflict` checks
  `need(condition.templatePath)` before recording (throws cold: a body
  afflicted with a row nothing loaded is the engine defect D7 names).
- `packages/content/platform/pack.yaml:72` removed.
- Gates: `lint:boot-entries` → 71; `lint:on-create` +2 (offset: see W4);
  `lint:lib-statics` unchanged.
- Tests: suites that hand-construct a `Condition` keep doing so (a live
  instance is what `need` finds); suites that never stood one up and relied on
  `null` → `continue` now see the throw — the census of those is this wave's
  acceptance (`pnpm test:near` over `lib/vitals`, `lib/metabolism`,
  `lib/respiration`, `lib/thermal`, `platform/idea/api/__tests__/ConditionLogic*`,
  `MagicLogic*`, the medical controllers, trade-medicine).
- Drive step 6 at W9.
- Commit: `refactor(load-on-use): W6 — conditions load with the first body`.

### W7 — biomes load with their place

- `Atmospheric.getBiome()`: non-empty `_biomePath` and no live row → throw
  `DocumentNotResidentError('biome', path)`.
- Delete `platform/idea/BiomeCatalogue.ts`, its test, its yaml row
  (`packages/content/platform/content/platform/idea/BiomeCatalogue.yaml` —
  verify the path), `packages/content/platform/pack.yaml:71`, the
  `lint:template-scans` entry, and the `DiagnosticApi` channel
  `biome.unresolved` if nothing else files it.
- `base-library/pack.yaml:13` (the root) **stays**; its reason gains *"the
  one biome nothing cites (load-on-use round two)"*.
- Gates: `lint:boot-entries` → 70; `lint:on-create` −1; `lint:template-scans` −1.
- Tests: `BiomeCatalogue.test.ts` deleted; the chain-walk suites set biomes
  by instance (47 sites) and are unaffected.
- Drive steps 1–2 at W9.
- Commit: `refactor(load-on-use): W7 — a biome loads with its place; the catalogue goes`.

### W8a — materials: the sync door and the relations

- The census table (§ Grounding) is the wave's checklist: every one of the
  109 sites is ticked off as it lands.
- **The door** (all 109): `findByTemplatePath<Material>(p) ?? null` →
  `MaterialApi.materials().need(p)` where `p` is non-empty, `peek` only
  where a miss is honest (name each `peek` with a one-line reason — the
  wrappers `Faced.materialAt`, `Paint.materialAt`, `Assembled.materialAt`,
  `CraftingLogic.materialAtPath` are four edits covering 26 sites).
  `Tangible.getMaterial` (`:346-364`), `SourceSlot.getMaterial` (`:78`),
  `Floor.getMaterial` (`:644-651`).
- **(a\*)** — 5 fields gain `ref: 'identity:constituent'` (`Steepable.steepsInto`,
  `Composition.makeup`, `Compounding.productMaterial`, `Comminuting`'s three,
  `Atmospheric.enclosure`); `lint:census` (f) now resolves them on every row
  (fix any dangling citation it finds — content bugs, not exemptions).
- **(b)** — the Material capability fields (`Mixture.composition`,
  `Kinetic.kinetics` + `drainSetting`, `Fusion.chillsTo`, `Solution`'s four)
  and the other-Idea fields (`Species.production[].yieldRow`,
  `BodyPlan.…tissuePath`, `Effect.bulkMaterial`, the ground pack's `Deposit`
  paths) gain `identity:constituent` in their own classes; the
  profile/schedule paths are W4's `afterRead`. Run `lint:census` (f) after
  each declaration — a **cycle** among material rows is Risks 3's decision
  point, not a thing to code around.
- **(d)** — `MaterialCatalogue.roster()`/`byTag(tag)`; `MaterialApi.all/findByTag`
  forward to them (and declare nothing in `needs`); `findByElement` deleted
  (no caller); the wiki page and `PatternStock.metalNamed` await
  `StuffApi.ready(TemplatePaths.materialCatalogue)` in their async parent;
  `MaterialLogic.everyMaterial` retired.
- Gates: `lint:duck-typing` may fall; `lint:lib-statics` falls (`findByElement`);
  `lint:whole-table` (the filters are catalogue methods); `lint:census` (f).
- Acceptance: a unit test per door; the a/a\*/b/d rows of the table done;
  `test:near` over `lib/material`, `lib/bulk`, `lib/thermal`, `lib/mould`,
  `lib/maturation`, `MaterialLogic`, `ConditionLogic`, trade-smelting,
  trade-fuel, trade-drilling, trade-mining, ground.
- Commit: `refactor(load-on-use): W8a — a material is read through one door, and its relations load with it`.

### W8b — materials: the acts, and the boot line goes

- **(c2) the restore doors** — the restoring setter of each runtime field
  that carries material paths returns `ensure` for every path and the applier
  awaits it in restore mode: `Bulkable.setBulkPayload` (makeup, `madeFrom`),
  `Faced.setCoats` / `Paint`'s makeup, `Assembled.setParts` + `setJoints`
  (extend the existing load-returning setters to the `material`/`glue`
  paths), `Burner.setFuelBed`, `Floor.setStrewn`, `Thermal.setKineticRecord`,
  `Atmospheric`'s contents setter (`Concentrate.type`), `Crafted.setMadeFrom`,
  the build charge's `BuildContribution` list, `Garment`'s wash spec if it
  persists. ⭐ **Setter census as acceptance:** for every setter whose return
  type changes, every call site (production, tests, wire eval strings) is
  listed and awaited or `void …catch`ed — the !560 lesson; the agent-census
  of `setMaterial`/`setBulkMaterial` shows the fixture shape to expect
  (sync `makeStuff` callbacks).
- **(c1) the constants** — async sites await `ensure` in the act
  (`Midden.takeRefuse`, `WaterFixture.settleBulk`, `IronPot.setCake`,
  `LayController`, `SmeltController.runIntoCrucible`, `BleedController`'s
  closure's async parent); sync sites read a ROW FIELD instead of the
  constant (D2′, owner 2026-11-11 — content, not code):
  - **per-kind content** — `PipeRun`'s water, sugar `Copper`'s liquor and
    skimmings, `SugarLoaf`'s molasses, dairying `Churn`'s cream,
    chandlery `SoapKettle`'s milk of lime: each becomes an authorable
    field in `fieldMeta` with `ref: 'identity:constituent'`, its value
    authored on the class's rows (or on one parent row they `extends:`),
    and the code reads the field. The class keeps NO default path — a row
    that omits the field is refused by `lint:census` (the citation lint
    already covers constituent fields), never silently given molasses.
  - **`WeatherLogic`'s puddle water** — the read sits in the weather
    tick's async parent: await the load there; no field.
  - **the two engine-wide defaults** — `Location`'s enclosure default
    (`Atmospheric`) and farming `Field`'s soil-texture map. Decide each
    at the wave by looking, in this order: (1) does the reader have an
    async parent that can await? then await; (2) is there a root row
    every holder already `extends:`? then a constituent field there;
    (3) else STOP and ask — do not add an `onCreate`, a boot line or a
    clone-pipeline step. Record which in the wave note.
  - Every row touched gains the field; grep `packages/content` for each
    class's rows before the commit (review question B4).
- **(c) the mints** — `CraftingLogic` mint paths hold a live `Material`
  already (`setMaterial(instance)`); the recipe's output materials are
  ensured when the recipe dictionary reads the row (`RecipeCatalogue`,
  the `afterRead` shape), so every mint finds them; `MagicLogic.execConjure`
  via `Effect.bulkMaterial` (W8a's (b)).
- `packages/content/platform/pack.yaml:70` removed; `:73`'s `dependsOn:
  [/platform/idea/MaterialCatalogue]` removed (stale).
- `MaterialCatalogue` keeps `warm()` on `onCreate` as the roster read's
  lazy dictionary; `lint:template-scans` reason → LAZY_DICT.
- Gates: `lint:boot-entries` → 69.
- Acceptance: a fresh boot's log names no material roster; `pnpm test:near`
  across `lib/material`, `lib/bulk`, `lib/thermal`, `lib/fire`, `lib/mould`,
  `platform/idea/api/__tests__/CraftingLogic*`, every trade pack in the (c)
  list; the drive's steps 1, 3, 4.
- Commit: `refactor(load-on-use): W8b — materials load by the act that names them; the roster leaves the boot`.

### W9 — the drive, the walk, the docs

- `packages/wire/tests/load-on-use.dirty.wire.test.ts` (WIRE_PORT 2019):
  the blocking drive's 13 steps against a dropped DB, with the staged twins
  named in § Test & gate strategy; step 0 asserts the boot log; step 12
  restarts via `restartWorld()` (the !560 drive's helper).
- `e2e/tests/load-on-use-walk.spec.ts`: steps 1–6, 9–11 in a browser.
- Docs: `document-store.md` (the kinds table +5, § Resident by construction
  — the two Idea catalogues' doors, D17–D2x index), `race.md` (materials load
  by three doors), `biome.md` (no catalogue), `harm.md` (conditions load with
  the body), `address.md` (first use), `maturation.md`/`fractionation.md`
  (documents, the path on the vessel), `cleanliness.md`, `textiles.md`
  (fabric by path), `content-packs.md` (the boot union shrinks; a pack ships
  a cleanser/profile/schedule/fabric/dyestuff under `content/<dir>/`),
  `lint-family.md` (the moved ceilings), `scan-sweep-slate.md` § What remains
  (the row crossed off), `documents-path-identity-slate.md`.
- `pnpm test` (code-complete), `lint:family`, open the MR.
- Commit: `docs(load-on-use): W9 — drive record, the walk, subsystem docs`.

---

## Reachability wiring

No new capability; the five links for each family's **load**:

| family | verb (exists) | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| cleanser | `wash` | the material in hand | `cleansers/<key>.yaml` | `Material.setCleanser` → `ensure` (applier awaits) | `lint:census` (g) `cleanser` |
| fabric | `look`, `fit` | the garment | `fabrics/<key>.yaml` | `Constructed.setConstructionForm` → `ensure`; `Assembled.setBill` for a line | `lint:census` (g) `constructionForm` |
| dyestuff | `dye` | the bath's material | `dyestuffs/<key>.yaml` + card `material` | `DyestuffCatalogue.forMaterial` in the act | the kind's `keys` |
| profile / schedule | `pour`, `taste`, `analyze`, `cut` | the vessel | `maturation-profiles/`, `fraction-schedules/` | the vessel's `onCreate` (`ensureAll`); the path setter on restore | `lint:fraction-schedules` + the maturation gate over the new dirs |
| address | `government`, `look` | the place | the 24 Locality rows | `AddressApi.needs` / `ready` | — |
| condition | `look` at yourself, `assess` | the body | `/…/idea/Condition/` rows | `VitalsMixin`/`ContaminableMixin.onCreate` | `lint:conditions` |
| biome | `look` | the place | `/…/idea/biome/` rows | the applier (`_biomePath` constituent) + `extends:` | `lint:census` (f), `lint:biome` |
| material | `smell`, `taste`, `analyze`, `measure` | the thing | `/…/idea/material/` rows | the applier; relations as constituents; the act's `ensure` | `lint:census` (f) |

---

## Acceptance-criteria coverage

| AC | waves |
|---|---|
| boots without the six rosters / index; every drive step reads before and after restart | W4–W8b remove the lines; W9 proves it (steps 0, 12) |
| no player-visible read differs from master | every reader keeps its call shape; W9's drive compares against today's text |
| five families are documents, not MQL-findable | W1–W4 (the Idea classes deleted; `lint:instanceable`) |
| a pack ships a new member with no boot line | W1–W4 (documents under `content/<dir>/`), W6 (infix warm), W7 (constituent), W8b (constituent/act) — verified by the drive's pack rows (potash's cleanser, textiles' sackcloth, dyeing's rows, distilling's schedules) |
| every citation names a shipped path; a misspelling fails before merge | `lint:census` (f) for rows, (g) for the two document fields; the kinds' `parse` at install |
| a cold read fails naming the path | W0's doors, W5–W8a's throws; unit tests per door |

---

## Test & gate strategy

- **Unit:** each catalogue's `parse` (malformed → throws naming the path),
  the four doors on the two Idea catalogues, `Atmospheric.getBiome` cold
  → throws, `afflict` cold → throws, `AddressLogic` cold → throws, the
  profile/schedule arithmetic unchanged against the existing suites
  (`lib/maturation/__tests__`, `lib/fractionation/__tests__`, dairy, whiskey,
  textiles).
- **Blocking drive** (wire, WIRE_PORT 2019), pace per step from the
  requirements: 0 *instant·staged* (the boot log — assert no `MaterialCatalogue:`
  / `ConditionCatalogue:` / `MaturationProfileCatalogue:` / `FractionScheduleCatalogue:`
  / `BiomeCatalogue:` lines and no `AddressRegistry` clone before the first
  address question); 1 `look` at the start; 2 outdoor by day, then
  **staged twin** = the `clock` system verb to night, `look`; 3 `smell`/`taste`
  a thing whose material nothing touched (a stocked loaf); 4 `analyze`/`measure`;
  5 `government` in Hearts Delight and Terminus; 6 a sting at the apiary or a
  dosed toxin, `look` at yourself in the ward; 7 **staged** = wizard `clone`
  the Veshko still's charge and `pour` it in, then `cut`; 8 **staged twin of
  S1** = a vat filled by `pour`, aged by the dairy drive's wizard seam (the
  `eval` on the vessel that sets its maturation clock stamp back — the build
  verifies the exact seam the dairy/whiskey drives used and names it in the
  drive record); 9 `wash` at the bathhouse; 10 `look` at a garment at the
  tailor's; 11 `dye` a hank; 12 restart — the harness CAN restart a world — `restartWorld()` in `packages/wire/tests/documents-path-identity.dirty.wire.test.ts` (a SIGTERM so the shutdown capture lands, then a re-boot against the same DB); reuse it; then re-assert steps 1, 3, 5, 6, 10.
- **Soak drive:** S1 (a vat ripening over game weeks) — the soak lane,
  `assembly.soak` precedent; proved by arithmetic in the maturation suites here.
- **B2:** every checkpoint made to fail once (a misspelled cleanser path, a
  cold biome, an unloaded schedule).
- **Gates per wave** as listed; `lint:family` + `pnpm test` at W9 and at
  `/finalize`.

---

## Risks & opens

1. **The owner should decide: Biome keeps no catalogue (D8).** The brief's
   "lazy dictionary + `ready`" shape has no reader for biomes — the plan
   deletes `BiomeCatalogue` rather than keep a dictionary nothing reads. If the
   owner wants the roster enumerable (a future `analyze` listing), keep the
   class as a lazy dictionary with no boot line — a one-wave difference.
2. **Materials: the lazy-dictionary shape vs per-row loading (D2).** The
   requirements say *a thing made of a material* loads it; the brief names the
   W5a/b shape. The plan does both: per-row by constituent/relation/act, and
   the roster only for roster reads. If the owner prefers *the first material
   reached warms the roster* (one 389-row warm on the first `look`), W8a/W8b
   collapse to: `TangibleMixin.onCreate` → `ready(materialCatalogue)` and the
   sync door — a smaller build with a slower first room. Say which.
3. **Cycles among material relations under `lint:census` (f).**
   `Kinetic.kinetics` rung outcomes and `Fusion.chillsTo` can cite each other
   (water freezes to ice, ice melts to water); the gate's clause (f) requires
   the constituent graph to be acyclic, on the reasoning that *a cycle is a
   load that waits on itself* — which `ensureConstituent` does not do (the
   pending guard, `api/stuff.ts:949-950, 961-962`: an in-flight load is
   returned without awaiting). So the gate's prose is stricter than the
   runtime. **Owner's call, raised before W8a:** (i) narrow clause (f) to
   cycles that leave the `Material` family (a Material ↔ Material cycle is
   safe by construction — fix the gate's prose, CLAUDE.md § lint family), or
   (ii) declare one side of each twin pair and accept that the other
   direction loads on its first sync read's parent act. The plan recommends
   (i): it is the honest statement of what the code does, and (ii) leaves a
   melt that happens inside a reconcile with no act above it.
4. **`COMMONS_CEILING` rises 30 → 33** (Cleanser, Fabric, Dyestuff catalogues
   +1 each; MaturationProfile already commons; FractionSchedule +1; Material
   +1 if not already; Biome's −1 if its entry was the catalogue). Caller audit
   for each: `wash`, `look`/`fit`, `dye`, `pour`/`cut`, `smell`/`taste` — every
   one a player verb inside a circle, the role's definition. The exact number
   is settled at W0/W1 by running the gate.
5. **`ON_CREATE_CEILING` must not rise.** Net across the build without
   the c1 constants: −5 (Biome/Fabric/Dyestuff/MaturationProfile/FractionSchedule
   catalogues) −1 (`Fabric`) +4 (Maturing, Ripening, Fractionating,
   Finishing) +2 (Vitals, Contaminable) = 0. The seven c1 hooks (Risks 12)
   would push it to +7 — which is the argument for the declaration. Land W2
   before W4 and W7 before W6 so the running count never rises; the ceiling
   only moves down.
6. **The fabric citation changes meaning for authors** (`woven` → a path) —
   19 rows and every test fixture that writes `constructionForm: 'woven'`.
   If the owner would rather keep the word (resolved by `byWord`), D5 flips
   to the typed-word shape (`words: leafWord`, no `(g)` entry) and no row
   changes; the AC's "cited by path" is then met only for the document's own
   identity. Flag at review of W2.
7. **Sync reconcile writers** (Thermal phase change, `Combustible.burnOut`,
   `Mould.clearPool`, `Bulkable.debitBulk`) read a related material during a
   getter. Their path is a (b) relation; if the census finds one that is a
   runtime constant with no citer (water from a puddle), it is a (c) in the
   scheduler's async parent — never a boot line.
8. **The size build (build-1)** adds density reads (`material.getDensity()` on
   a holder's own material — door (a)); **controller liquidity (build-2)**
   rewrites controllers including `WashController`/`DyeController`. Whichever
   merges second carries the merge; the catalogue accessors are additive, the
   row moves are the conflict surface (`packages/content/**/idea/{Cleanser,fabric,dyestuff,maturation,fractionation}/`).
9. **The restart step** — resolved: the harness CAN restart a world — `restartWorld()` in `packages/wire/tests/documents-path-identity.dirty.wire.test.ts` (a SIGTERM so the shutdown capture lands, then a re-boot against the same DB); reuse it.
10. **`ServesDocuments` may not expose `parse`** (W3's validator). One
    interface method, on every catalogue already.
11. **`check-on-create`'s loading predicate** may count `ready(...)` in an
    `onCreate` as limb 3 (state loading, ceiling 32) rather than limb 2;
    check at W4 and phrase the hook as the roster warm it is.
12. ✅ **DECIDED (owner, 2026-11-11): content.** The constants become
    constituent row fields (decision 6; W8b (c1)). The text below is the
    superseded analysis. — **The eight sync code constants (c1) — hooks or a declaration?** D2′
    writes an `onCreate` per class (seven new hooks, which with W4's and
    W6's six put the build at **+13 −6 = +7** on `ON_CREATE_CEILING = 80`
    unless the audit shows the catalogues' hooks it removes were counted
    too). The alternative is one generalization: `static constituentPaths`
    on a class, ensured by the clone pipeline beside the row's constituent
    fields (`TemplateApplier.apply` already walks `fieldMeta`; this adds one
    class-level read), checked by `lint:census` like a field. It is new
    substrate — the kind the build must ask about, not invent (CLAUDE.md
    § Module Categories; P1). **Recommendation: the declaration** — it
    says what the hook would do, once, and it is what `Place.onCreate`
    loading the kernel's placements and `Soilable.onCreate` loading the
    kernel's dirt kinds already are in prose. Decide before W8b.
13. **The restore-door setter census is the build's largest mechanical
    surface** — eight runtime fields' setters change return type; the
    `setMaterial`/`setBulkMaterial` census (626 sites, 75 % in sync fixture
    helpers) is the shape to expect for `setBulkPayload` in particular. A
    dropped promise is an unhandled rejection that ends the process; the
    wave's acceptance lists every call site.

---

## Deferred seams

- **Deriving a locality from its address with no index** → stays on
  `scan-sweep-slate.md` § Open questions (non-goal).
- **Where singleton-ness lives** → `scan-sweep-slate.md` § What remains.
- **A shared Idea-catalogue base** (the four doors) — promote at the third
  consumer; noted on `documents-path-identity-slate.md`.
- **Materials as a per-row-only family with no roster warm at all** (retire
  `MaterialCatalogue.warm` once the wiki listing and `findByElement` read the
  document store's cards instead of live rows) → a line on the
  documents-path-identity slate.

---

## Critical files

Read first, in this order:

1. `docs/subsystems/document-store.md` § Idea or document, § Resident by construction, § History
2. `packages/server/src/mud/lib/document/DocumentCatalogue.ts`, `DocumentKinds.ts`
3. `packages/server/src/mud/platform/idea/JointCatalogue.ts`, `DirtCatalogue.ts`, `GovernmentCatalogue.ts`
4. `packages/server/src/mud/api/stuff.ts` (`ready` :813-832, `ensureConstituent` :925-970, `singletonSync` :1114)
5. `packages/server/src/mud/platform/idea/TemplateApplier.ts` :135-185
6. `packages/server/src/mud/api/security.ts` :630-660, :990-1006; `src/backend/BootstrapManager.ts` :122
7. the eight catalogue files and `Cleanser.ts` listed in § Grounding
8. `lib/maturation/{MaturationProfile,Maturing,Ripening}.ts`, `lib/fractionation/{FractionSchedule,Fractionating}.ts`, `packages/content/trade-textiles/src/lib/Finishing.ts`
9. `lib/material/{Material,Tangible,Construction,Constructed}.ts`, `lib/bulk/{Bulkable,SourceSlot}.ts`, `lib/ground/Floor.ts`
10. `lib/vitals/Vitals.ts` (afflict :3507, the differential :578-615), `lib/material/Contaminable.ts` :240-252, `lib/metabolism/Metabolic.ts` :1105-1115
11. `platform/idea/api/{AddressLogic,BiomeLogic,GovernmentLogic}.ts`, `lib/perception/PublicLighting.ts` :110-165
12. `packages/server/scripts/check-{boot-entries,template-scans,template-census,boundary-roles,on-create,lib-statics}.ts`
13. `packages/server/src/test-bootstrap.ts` :60-190
14. `packages/content/platform/pack.yaml` :55-76, `packages/content/base-library/pack.yaml` :1-14

---

## Drive record

*(appended at build time)*
