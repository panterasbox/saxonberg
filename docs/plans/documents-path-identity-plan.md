# Documents — the path is the identity — implementation plan

Executes [documents-path-identity-requirements](../requirements/documents-path-identity-requirements.md)
(kind **refactor/sweep**, leads from the **kernel**). Three things become true
of the document store: a document's **path is its only name** (the four
flat-key kinds lose their second name; the store refuses two documents at one
path); every document carries **one catalogue-card shape** (`keys`, declared by
its kind, derived from its data, served by one index — the press archive is the
first reader); and the **metadata Idea families become documents** while the
referent Ideas (disciplines, spells, corporations, brands, governments) stay
Ideas that **load when something reaches them**, with nine boot entries gone.
The aroma library is rearranged so its folders are its tree. Seeded by
[documents-path-identity-slate](../slates/builds/documents-path-identity-slate.md);
the precursor is MR !541 (`a4fe4550a`), which did this for aromas and name banks.

## ⚠ Requirements problems (not reopened — for the owner before commit)

1. **The committed requirements file ends in a stray transcript fragment.**
   Lines 230–251 (from the `</content>` line through the `git add … &&
   git commit … && git push` line, with an `<invoke>` block and a Python
   heredoc between) are not product text; the document proper ends at the
   `In flight:` cross-reference on line 229. Delete the tail before this plan
   is committed. Nothing in the plan depends on it.
2. *"A word-to-document index already exists for command views"* — true as a
   product statement, but the engineering fact is `CommandLogic.preloadAll`
   (`platform/idea/api/CommandLogic.ts:752-776`) loading **every** command view
   at boot through `DocumentApi.listOfKind('command-view')`. It is a boot scan,
   not a lazy word index, so this plan does not model typed words on it; it
   models them on `SoulCatalogue`, which is already lazy (Grounding § 7).
3. *"recipe-by-cuisine needs equality"* — no shipped recipe carries a
   `cuisine` field. The mechanism is general; this plan declares keys only
   where a reader exists today (D1). Nothing is lost: adding a key is one line
   on the kind.
4. Two of the catalogues the acceptance criteria name as *not loaded at
   startup* — **placements** and **topics** — are read synchronously beneath
   two synchronous primitives (`ContainmentApi.move`, `Scene.send`). The plan
   meets the criterion (W4, D12–D13) but it is the build's riskiest wave and
   is isolated as such.

## Grounding

Verified this cycle by opening the files. Paths are under
`packages/server/src/mud/` unless they start with `packages/`.

### 1. The store

- `lib/document/StoredDocument.ts:36-42` — fields `path · owner · kind ·
  data`, all persistent. `findByPath` (:73) is `find({path})[0]`;
  `findByKind` (:80) is `find({kind})`; ⚠ **`findByPrefix` (:89-93) is
  `find({})` plus a JS `startsWith` filter — a full-collection scan on every
  prefix read**, including `callUp`'s `/home/<key>/` walk
  (`platform/idea/api/DocumentLogic.ts:765`) and `list`.
- `lib/document/DocumentKinds.ts` — `DocumentKindSpec {kind, naturalKey,
  contentDir, ext, onVanish}` (:37-50); 24 kinds; four carry a `naturalKey`:
  `emote:'verb'` (:58), `recipe:'recipeId'` (:67), `blueprint:'blueprintId'`
  (:69), `archetype:'archetypeId'` (:73). `FLAT_KEY_DOCUMENT_KINDS` (:381) has
  **no consumer**. The module imports nothing (the PM reads it lazily).
- Readers of the spec shape: `PackLogic.ts:25,208-210,901,1712`;
  `backend/PersistenceManager.ts:1466-1484` (`#createDocumentKindIndexes`:
  one `{kind:1, data.<nk>:1}` unique partial index per flat-key kind, called
  at :1574-1580 as the one derived loop outside `plannedIndexes()`);
  `lib/paths.ts:269` (`NON_TEMPLATE_DIRS` derives every yaml `contentDir`);
  `lib/persistence/ResetPolicy.ts:47,105` and `scripts/gen-schema.ts:146-149`
  (reset keeps `release` + every declared kind); `DocumentLogic.ts:21,531`.
  ⚠ `scripts/check-untitled-paths.ts:43` is a **hand copy** —
  `DOCUMENT_DIRS = ["emotes","recipes","blueprints","name-banks","releases"]`
  — already stale (no `aromas`).
- `packages/server/src/schema/documents.yaml` declares `{path:1}` (**not
  unique**, on purpose: *"a unique index that a live row violates fails at
  BOOT"*) and `{kind:1}`; its `purpose` lists seven kinds (stale). Indexes are
  **authored there and planned from there** (`PersistenceManager.plannedIndexes`,
  :1600); every index is attempted independently (:1537-1590) and a failure
  logs `index … NOT built` and continues.
- The write funnel: every `StoredDocument.save()` (`lib/persistence/Document.ts:256-263`)
  and every installer row (`PersistApi.save(collection, row)`,
  `PackLogic.ts:2529` region) goes through `PersistenceManager.save` (:622),
  whose `dispatchSave` runs the **per-collection `aroundSave` hook chain**
  (:859) loaded from `platform/idea/hooks/hooks.yaml`. One hook exists:
  `DomainHook` on `content` save/delete (`platform/idea/hooks/DomainHook.ts`),
  whose header says it is *"the real template write chokepoint"* precisely
  because the installer bypasses `TemplateApi.saveTemplate`. The same is true
  of `documents`: `DocumentLogic`'s eleven `doc.save()` sites (:158, :243,
  :311, :357, :412, :540, :571, :742, …) and the installer's `rowOf` are two
  writers with one chokepoint beneath them.
- `api/document.ts` surface: `read · list · listOfKind · save · delete ·
  saveRelease · saveToRegister · saveBerth · berthRollOf · saveAsBusiness ·
  pagesOf · callUp · freezeEdition · saveInstrument · saveMap · readMaps`.
  `readByKey` is gone (!541). No key query exists.
- Tests touch no Mongo: `src/test-bootstrap.ts` names none, and
  `platform/idea/api/__tests__/pack-harness.ts` stubs persistence
  (`stubPersist`, :128). Index shape is therefore provable only against a
  running world (the drive) — see § Test & gate strategy.

### 2. The installer

- `PackLogic.readDocumentKind` (:866-931): `walkFiles` **recurses**
  (:817-840, `yield* walkFiles`), `rel` keeps subdirectories, `key =
  /${contentDir}/${relKey}` (:897), `path = root + key` (:925). ⭐ **A
  subdirectory already becomes a path segment** — `aromas/smoke/peat-smoke.yaml`
  is stored at `/base-library/aromas/smoke/peat-smoke` today with no code
  change. The natural-key injection + basename check is :901-911.
- `documentStrategy` (:1711-1740): `dbKeyQuery` adopts by `{kind,
  data.<nk>}` **at any path** for a flat-key kind, else `{kind, path}`;
  `flatKeyOf` (:1735) feeds the install-set check.
- `flatKeyFailures` (:2919-2956): iterates the **install set only**, naming
  both `(packId, relFile)` claimants; a second claimant fails. `sync`
  (:3935-3950) with an explicit `packRoot` and no `packRoots` has an **empty
  sibling set** — a pack synced live from a directory is checked against
  nothing already installed.
- `invalidateDocumentKind` (:3536-3583): the per-kind go-live switch —
  `emote` drops a resident SoulCatalogue's cache; `recipe`/`archetype`
  re-warm a resident catalogue; `blueprint` invalidates; `name-bank` clears
  `NameBank`'s cache. `DocumentLogic.saveImpl` does **not** call it (only the
  command-view save has a go-live), so a CMS edit of any other kind reaches
  no cache.
- `DOCUMENT_VALIDATORS` (:171-179): `emote → Emote.fromData`, `recipe →
  Recipe.fromData`, `archetype → Archetype.fromData`, `command-view`.
  `GATED_DOCUMENT_KINDS` is empty (:164).
- `PackApi.sync(packId, packRoot?, packRoots?)` (`api/pack.ts:409-416`) is
  the live install an operator runs; the founder can reach it through `eval`.
  Packs are discovered from the deployment root's `@saxonberg/content-*`
  dependencies (`PackLogic.ts:783-801`); an explicit `packRoot` overrides
  discovery.

### 3. The press archive (first consumer of keys)

- `platform/idea/PressBoard.ts:131-142` `warm()` → `listOfKind('release')`
  → every release into a map; `recentWindow` (:83-101) sorts pins first and
  caps the window in JS. Booted as `producer` (`packages/content/platform/pack.yaml:60`)
  because `PressApi.recent()` is read **synchronously** at session entry
  (`lib/character/Avatar.ts:1067`) and by the `press` verb
  (`cmd/system/PressController.ts:115`).
- `platform/idea/api/PressLogic.ts:311-327` `archiveImpl`: full `listOfKind`,
  JS filter on realm (derived from the live publisher — **not stored**), kind
  and `before`, JS sort by `publishedAt` desc, slice; cursor = epoch-ms
  `before`; limit default 30, max 100. REST at `backend/PressRoutes.ts:66-103`.
  `callUpImpl` (`DocumentLogic.ts:753-770`) does the same scan again.
- `lib/press/Release.ts:93-115` `ReleaseData {releaseId, kind, headline, body,
  author, publishedAt (epoch-ms), expiresAt, pinned, retracted, visibility,
  source}`; `publishedByOwner` (:267-272) re-verifies the transport's
  guarantee on every read.

### 4. Aromas (the precedent, and the directory move)

- `lib/perception/Aroma.ts` — the value class over a document: `known`
  cache + `loading` map (:68-70); `resolve` sync-with-load-started +
  diagnostic on a missing document (:103-117); `ensure` async, follows
  `data.parent` (:119-131); `remember` (:138-148); `waitFor`/`loadRow`/
  `settling` (:188-214) so a cold read is waited out by `smell`/`taste`/
  `analyze` (`SmellController.ts:43`, `AromaReading.ts:88`, `Palate.ts:244`).
  `PATH_SHAPE` (:61) already accepts several segments after `/aromas`;
  `MAX_DEPTH = 8` (:63); `wordOf` is the last segment (:84).
- 132 aromas, **flat**, in `packages/content/base-library/content/aromas/`;
  43 roots, 89 children, **max depth 2**; every `parent:` is a base-library
  path; no other pack ships an aroma. Children: alcohol 3 · animal 11 (+ wet-wool,
  silk-reeling at depth 2) · blood 1 · earth 5 · fat 2 · flesh 4 · floral 1 ·
  fruit 3 (+ lemon, orange) · grain 4 · green 4 · hide 3 · lye 1 · milk 2 ·
  oil 3 (+ naphtha) · rancid 1 · rot 1 (decay) · smoke 9 · sour 5 · spice 1 ·
  sugar 2 (+ burnt-sugar) · sulfur 1 · sweat 1 · tannin 1 · tar 4 · wax 2 ·
  wood 2 (+ juniper, pine, turpentine) · yeast 1.
- Citations of `/base-library/aromas/`: **504 occurrences in 417 files** —
  `smells[].aroma` 336 (37 packs), `parent` 89, `burning[].aroma` 64,
  `odor.aroma` 5 (the platform DirtKind rows), `imparts[].type` 4,
  `charredImparts[].type` 3, `combustionImparts[].type` 3. Kernel literals:
  `lib/mortality/MortalArc.ts:65-67` (`blood`, `decay`),
  `lib/material/Freshness.ts:176` (`rot`), `scripts/check-aromas.ts:46-50`
  (`KERNEL_AROMAS`). Server tests name paths in `Aroma.test.ts`,
  `aroma-fixtures.ts`, `CraftingLogic.medium`/`blend-payload`,
  `malting-chain`, `BulkFreshness`, `DissolvedAromatics`, `Smell`, `Palate`;
  pack tests in `trade-cooking/roster`, `trade-hospitality/menu`,
  `trade-ceramics/BrickClamp`, `eternal-university/DormHouseplant`.
- `scripts/check-aromas.ts` (`lint:aromas`) already walks any depth under
  `aromas/` (:133-153), requires every segment to be a slug, resolves every
  `AROMA_FIELDS` path + `odor.aroma` + `parent`, checks dependency reach.
  `scripts/check-template-census.ts:1142-1145` clause (g)
  `DOCUMENT_PATH_FIELDS = { nameBanks: 'name-banks' }` — the one entry;
  `documentPaths()` (:1148-1164) walks recursively.

### 5. The four flat-key kinds and their readers

- **emote** (34 rows, `packages/content/expression/content/emotes/`,
  `/expression/emotes/<verb>`). `platform/idea/SoulCatalogue.ts` is **not
  booted** and **already lazy and async**: every method is async, `ensureCache`
  (:357-361) awaits `warmCache()` → `listOfKind('emote')`. Dispatch:
  `lib/command/CommandGiver.ts:1222-1236` — only when no affordance matched,
  `await SoulApi.resolve(verb)`. Author verbs `soul make/edit/disable/delete`
  write through (`mint` into `/expression/emotes`, :60,:284).
- **recipe** (195 rows, `/<root>/recipes/<id>`). `platform/idea/RecipeCatalogue.ts`
  booted `sync-read` (`pack.yaml:55`); `onCreate → warm()` (:102,:118); sync
  surface `getRecipe · findByKeyword · recipeFor(outputTemplate) ·
  allRecipes · knows`; `ensureCache` (:154) installs an empty map — **no lazy
  load**. `CraftingLogic.requireCatalogue()` (:219) is an async
  `StuffApi.singleton`; 36 `CraftingApi.*` production call sites are awaited.
  ⚠ **Sync readers with no seam, all resolving a recipe cited by RUNTIME
  state**: `lib/craft/BlendIdentity.ts:43-50` `recipeOf()` (from
  `Bulkable.getHeldKeywords` :726/:738 — the MQL scope walk
  `api/mql/scope-walk.ts:357`; `SmellModality.addInterior` :341;
  `Metabolic.ingest` :1518; `SipController.execute` :87) and
  `lib/thermal/ThermalDose.ts:735-750` `doseRecipeFor()` (reconcile-on-read
  from `getDoseSeconds`/`getScorchSeconds` :584/:589 and the `donenessAugmenter`
  :179-187). `recipeFor(outputTemplate)` has three callers, all under
  awaited `requireCatalogue` (`CraftingLogic.ts:4145, 4313, 5131`).
  Citations: `offeredRecipes:` (6 rows, `lib/commerce/Menu.ts:61`), brain
  config `lagerLeg.recipe` (`terminus/.../brewing/agent/hand.yaml:57`),
  pack TS `recipeRef` (`trade-chandlery/src/thing/DipPot.ts:78,108`); runtime
  `Crafted.getRecipe()` and `BulkPayload.recipeId`.
- **archetype** (21 rows, 13 packs). `ArchetypeCatalogue.ts` booted
  `sync-read` (`pack.yaml:56`). **One** production reader:
  `cmd/perception/SurveyController.ts:274-282` `roomArchetypes()` (sync,
  inside `async execute` :69). `Archetype.effectiveRows`
  (`lib/archetype/Archetype.ts:440-441`) also reads `allRecipes()`. No row
  cites an archetype; the 109 `archetype:` fields are `Cast` roles
  (`lib/npc/Cast.ts:85,164`) and stay untouched. The pack.yaml reason text
  (*"ArchetypeApi reads"*) is stale — that Api was retired (:15-17).
- **blueprint** (9 curated rows, `/platform/blueprints/<id>`).
  `BlueprintCatalogue.ts` booted `producer` (`pack.yaml:57`); `onCreate` runs
  `rebuild()` (reads the `blueprints` collection, `TemplateApi.distinctClasses()`,
  **loads every class module**, writes derived rows) then `warm()`. Every
  reader is `StudioLogic.requireCatalogue()` (:1342-1347, async) over REST
  (`backend/StudioRoutes.ts:127,145,189`). No row cites a blueprint.

### 6. The metadata families (→ documents)

| family | class (`platform/idea/`) | rows · roots | cited by | readers | sync with no seam? |
|---|---|---|---|---|---|
| `DirtKind` | `DirtKind.ts:69`, `extends Idea`; `DIRT_KIND_ROOT` :163; `setOdor` awaits `Aroma.ensure` | 11 — platform 10 at `/platform/idea/DirtKind/<key>`, ⚠ trade-mining 1 at `/trade/mining/idea/DirtKind/dust` | bare keys: recipe `soils[].kind` (8 rows); ~25 TS literals (`soil('grease')` — `StokeController:138`, `FireLogic:607`, `Vitals:3744`, `Freshness:1173`, `Exerting:252`, `Floor.ts:119,892,946`, `ButcherController:123`, `Tanning.ts:168`, …); persisted in `deposits` keys + `stains[].kind` | **no catalogue**; `Soilable.dirtKind(kind)` (`lib/cleanliness/Soilable.ts:564-569`) = `findByTemplatePath(ROOT+key)` else `Aroma.loadRow` | yes — every Soilable method; already served by the loadRow/`settling` shape. ⚠ **Latent defect:** `dust` can never resolve (wrong root); four sites soil with it |
| `Form` | `Form.ts:18`; `lib/craft/FormSpec.ts` `FormWord` | 19 — ceramics 15, glass 2, dairying 1, hearts-delight 1, all under lowercase `idea/form/` on **non-platform** roots; keys repeat (`brick` ×2) and contain spaces (`plant pot`) | `forms:` **full paths** on 4 instrument rows (17 entries); potter brain config `forms: [mug, …]` (words) | `FormingMixin.formWords()` (`lib/craft/Forming.ts:170-180`) awaits `StuffApi.singleton` per path | no — all async (`ShapeController.execute`) |
| `HelpConcept` | `HelpConcept.ts:35` | 17 — seven trades at `/trade/<x>/idea/HelpConcept/<key>` | `seeAlso:` bare keys (34, cross-pack) | `HelpCatalogue.loadConceptTopics` (:1080-1124) `findByClass` on first `HelpApi.ready()` (async); not booted | no |
| `Placement` | `Placement.ts:60`, `SingletonMixin(Idea)` | 3 — platform `on · in · from` | `placements:` bare names on 14 rows; code defaults `Placing.ts:252` `['on']`, `thing/Chamber.ts:52` `['in']`, `PlacementOffers.ts:53` `'in'`; literal `move(…, 'on')` at `HeatController:176`, `PaperMould:51`, `PulpVat:107`; persisted per item (`ContentPlacement`) | `PlacementCatalogue` booted `sync-read` (`pack.yaml:79`); every read via `ContainmentLogic.placement(name)` (:133-138) | ⚠⚠ **yes, beneath a sync primitive**: `ContainmentApi.move` is sync (`api/containment.ts:148-154`) → `placeOn` (:177-209) → `resolvePlacement`/`canPlace`; `Containable.getEnclosingScope` (:417); `PlacementOffers` ctor; MQL `placed` projection |
| `PumpMechanism` | `PumpMechanism.ts:27`, `SingletonMixin(Idea)` | 2 — platform `suction · force` | `mechanism:` **full paths** on 4 rows | `PumpingMixin.mechanismRow()` (`lib/pump/Pumping.ts:182-193`) awaits `singleton` | no |
| `Operation` | `Operation.ts:66` | 5 — trade-medicine | none in content; typed `operate <who> for <key>` | `OperationCatalogue` lazy, not booted; one reader `OperateController.ts:70-73` (async) | no |
| `Topic` | `Topic.ts:27`; rows carry **undeclared** facet keys (`communicative`, `address`, …) parsed by the catalogue | 38 — platform at `/platform/idea/Topic/<dotted.key>` | none in content; ~1217 code emitters `.topic('<dotted>')` | `TopicCatalogue` booted `sync-read` (`pack.yaml:54`); `pruneRetiredRoots` (:241-259) **deletes Content rows at load** | ⚠⚠ **yes, beneath a sync primitive**: `MessageLogic.isCommunicative` (:118-123) from `lib/message/Sensor.ts:62` on receive; `feedsFor` (:127-142) from `Avatar.sendMessage` :1446/:1501; `Scene.send()` is sync (`lib/message/Scene.ts:242`) |
| `Joint` | `Joint.ts:83` | 21 — platform 14, carpentry 1, coopering 3, plumbing 2, tailoring 1 | bill `joints[].method` bare keys (~50 in 43 rows); `Rope.ts:98` `KNOTS` literals; persisted `JointState.method` | `JointCatalogue` lazy, not booted; async readers await `jointCatalogue()` (`CraftingLogic.ts:4715`); `Assembled.jointRow` (`lib/craft/Assembled.ts:417-428`) uses sync `peek` (starts a warm when cold, defaults meanwhile) | partly — `peek` already degrades honestly |
| `CombatFormation` | `CombatFormation.ts:82`, `SingletonMixin(Idea)`; `DEFAULT_POLICY` :99 | 4 — platform | none in content; Party persists `formationPath` (`Party.ts:86,108`, `PartyRecord.ts:32`, `AccountabilityEvent.ts:281`); path built from the typed word at `PartyLogic.ts:575` | `CombatLogic.resolvePolicyFor` (:1394-1405) sync `findByTemplatePath` else `DEFAULT_POLICY`; `warmFormationsImpl` (:4497) awaits at `initiateImpl`; `setFormationImpl` awaits | yes, with a fallback already; `assignRoleImpl` on a cold formation answers `unknown-role` |

Common to all nine: no subclass, no `extends:`, nothing targets a member by
MQL or shadow, no runtime write (the Topic prune aside). Boot lines:
`pack.yaml:54` (Topic) and `:79` (Placement); Operation/Joint/Help are not
booted anywhere.

### 7. The Ideas that stay Ideas

| family | class | rows · roots | cited by | catalogue warm | sync readers with no seam |
|---|---|---|---|---|---|
| `Discipline` | `Discipline.ts:78`, pure data | 99 — platform 42, arcana 18, base-library 1, water 1, **37 trade packs** (five roots) | **bare keys everywhere**: `discipline:` 442 lines/439 files, dossier `competence:` 190, `fulfills:` 37, `specializes:`/`synergizes:` edges; transcript rows store bare keys; the only path form is `FisheryRegistry.ts:93` | `DisciplineCatalogue.onCreate → Template.findByClass` (:126,:161); booted `pack.yaml:62`; cache `key → descriptor` | `Advancement.withConditioning()` (:170-175) reads `allDisciplines()` for rows with a `stock` (2 rows) → `competenceDigestCached` (:716) → `Login.rosterFigures` :527, `Olfactory.rankIn` :236, `Palate.bandIn` :328, `Fractionating.bandFor` :225, `FisheryRegistry.readForViewer` :334, `Waters.bandOf` :130, `OpenWorking.bandOf` :219, `Growing.conditionAugmenter` :993, `Field.fieldLines` :788, `Tract.bandOf` :1468; `Employed.fulfils()` (:123-148, async two frames up). The catalogue is also the **command source** for conferred verbs (`Advancement.ts:435-459`) |
| `Spell` | `magic/Spell.ts:147`, pure data | 22 — all `/stuff/idea/magic/Spell/<id>` (arcane-library) | **full paths**: `carriedSpellPath` 13, `teachesSpellPath` 2; runtime `Memorized.spellPath` | `SpellCatalogue.onCreate → findByClass` (:132,:160), validates every row (`CastingProfiles`, `MagicEffects`, grid); booted `pack.yaml:67`; caches by path + `byName` (:73,:84) | `Arcane.getArcaneFootprint` (:205-209) on the item; `MagicLogic.requiresMark` (:349); `Caster.refreshCastingAffordance` (:207) uses the catalogue as the command source from `Avatar.armSession` :988. `cast <word>` → `getSpellNamed` (`MagicLogic.ts:431,713`); `spells` → `allSpells` (:1039) |
| `Corpo`/`Brand` | `corpo/Corpo.ts:52`, `corpo/Brand.ts:58` | 6 / 11 under `/stuff/idea/corpo/{Corpo,Brand}/` | **bare keys**: `_brandKey` 12, `corpoKey` 1, Brand `owner` 11, `rivals` 6, Brand `government` 1 | `CorpoCatalogue.onCreate → findDescendants ×2` (:162-172); booted `pack.yaml:65` | `Branded.getBrand/getCorpo` (`lib/corpo/Branded.ts:80,85`) → MQL projection (:96-104), `brandMarkAugmenter` (:121-136), `Attired.impressionClauses` :335, `Flag.colorsOf` :20 → `Ship.flagAugmenter` :2385; `CraftingLogic.resolveBrandKey` (:844) scans `listBrands()` for `craft … with <brand>` (async one frame up) |
| `Government` | `Government.ts:104` | 5 — platform 2, world-seed 3 | **bare keys**: Locality `_governmentKey` 5, ShipRegister `government` 1, Brand `government` 1, ship `flag` 4 | `GovernmentCatalogue.onCreate → findDescendants` over two roots (:123-125); booted `pack.yaml:66` | `Branded.brandMarkAugmenter` :128, `Ship.flagAugmenter` :2386; `GovernmentLogic.chainForAddress` (:47-60) is sync beneath the async `Locality.resolveTreasury` :456 and the `government` verb. `requiresGovernor` reads offices, not governments. `listGovernments` has no caller |

The one load-on-use precedent for these Ideas already exists:
`packages/content/water/src/idea/FisheryRegistry.ts:314` does
`await StuffApi.singleton<Discipline>(path)` then `row.getKey()`.

### 8. Load-on-use machinery and gates

- `StuffApi.singleton(path)` (`api/stuff.ts:831-910`): cache-or-clone,
  coalesces concurrent first loads; `findByTemplatePath` (:1624) is the sync
  index read. `TemplateApplier.ts:163-165`: a field whose `fieldMeta.ref` is
  `'identity:constituent'` is loaded with its holder through
  `StuffApi.ensureConstituent`. `SingletonMixin` (`Mixins.Singleton`) makes a
  bare `clone()` throw.
- `BootstrapManager.ts:186` runs `await StuffApi.singleton(path)` per boot
  entry (the hook is `onCreate`, not `postRegister` — the pack.yaml wording
  is stale). The platform boot list is `packages/content/platform/pack.yaml:47-89`.
- `scripts/check-boot-entries.ts:66` `BOOT_ENTRY_CEILING = 85` — **at the
  ceiling** (platform 46, terminus 33, hearthworks 2, hollow-mere 2,
  base-library 1, lounge 1). `scripts/check-template-scans.ts:72-93`
  ALLOWLIST names every catalogue above with its count and reason;
  `TEMPLATE_SCAN_CEILING` is the list's total and may only fall.
  `check-boundary-roles.ts:73` `COMMONS_CEILING = 27` counts Placement,
  PlacementCatalogue, CombatFormation and the catalogues.
  `check-instanceable-placement.ts:323` `ORPHAN_DATA_KEY_CEILING = 306`
  includes ~161 Topic facet keys.
- Row lints that locate these families by directory: `check-placement-words.ts:93`
  (`/idea/Placement/`), `check-topic-keys.ts:71,227-233` (`TOPIC_SEEDS` from
  the platform Topic dir), `check-bills.ts:171-177,271-290` (Joint rows by
  class; `method` must name one), `check-capabilities.ts:159`
  (`/idea/Joint/` instruments), `check-template-census.ts:305-310` (`forms`
  as template paths), `:193-200` (`mechanism`), `:1051-1057`
  (`carriedSpellPath`, `teachesSpellPath`, `treasury`, `departments`, `seats`
  listed as unread path fields).
- `lint:family --list`: 101 gates (roster in `packages/server/package.json`).
- The wire tier: `packages/wire/src/runner/boot.ts` (`WIRE_PORT`,
  `bootOwnedWorld`, `WIRE_BOOT_TIMEOUT`); a restart from inside a test is the
  `restartWorld()` precedent at `packages/wire/tests/sugar.soak.dirty.wire.test.ts:404-421`
  (preflight with `PREFLIGHT_GRACE_MS=60000`, then `bootOwnedWorld()`);
  `Session.open(handle, {parcels, committees, offices})` stages authority.
  Browser-walk precedent: `e2e/tests/paint-walk.spec.ts`.
- Collision: `origin/reqs/material-decomposition` (build-1) W0 is pushed
  (`fc5fcfb04`): it splits `OdorousMixin` into `Odor`/`Combustion`, edits
  `check-aromas.ts:177`, and its D4 codemod rewrites `class:` on all 386
  material rows — the same files whose `smells:`/`burning:` lines the aroma
  move rewrites. It touches no `DocumentKinds`, `PackLogic`, census clause
  (g), PM index or boot-list line. Cleanser stays on the material base there
  (its W0 message reverses the Detergency plan), which changes nothing here:
  Cleanser is out of this build.

## ⭐⭐ New substrate

Each row cites the slate's reuse ledger or says *genuinely new*.

| new | kind | ledger row | note |
|---|---|---|---|
| `DocumentKindSpec.keys` + `DocumentKindSpec.words` (replacing `naturalKey`) | two fields on the existing spec | row 1 (*a document kind*) | declarations, not substrate; `naturalKey` and `FLAT_KEY_DOCUMENT_KINDS` are deleted |
| `StoredDocument.keys` | one persistent field | row 9 (*index creation*) generalized | the catalogue card; derived, never authored |
| `platform/idea/hooks/DocumentHook.ts` | PM `aroundSave` hook on `documents` | **genuinely new as an instance** — the hook mixin and the `hooks.yaml` slot exist (`DomainHook` is the one implementer today) | the single chokepoint both writers share (Grounding § 1); a second implementer of a shipped hook, not a new hook kind |
| `DocumentApi.findByKey` (+ `StoredDocument.findByKey`, `DocumentLogic` impl) | one method on the existing Api | row 2 (*read by path*) generalized | not new substrate |
| `lib/document/DocumentCache.ts` | value object (the "named value-object / registry" category) | row 3 (*a value class over a document*) — the pattern extracted FROM `Aroma`, not a class every family extends | nine consumers plus Aroma and Recipe; the promote-at-the-third-consumer rule is met three times over. Also the go-live registry: `invalidateDocumentKind` calls one static instead of growing a switch |
| nine document kinds: `dirt · form · help-concept · placement · pump-mechanism · operation · topic · joint · formation` | `DOCUMENT_KINDS` entries + `DOCUMENT_VALIDATORS` | row 1 | each with a value class in the `lib/` folder that owns the concern (table in D6) |
| `scripts/check-typed-words.ts` (`lint:typed-words`) | lint script | rows 6–7 (the aroma lint is the precedent for a per-kind citation gate) | the derived roster picks it up; see D4 |

**The slate's reuse ledger, row by row:** (1) *a document kind* — nine new
entries, D6; (2) *read by path* — kept as the only identity read; `findByKey`
is the finder beside it, D4; (3) *a value class over a document* — the
pattern extracted into `DocumentCache`, with `Aroma` as its first delegating
consumer, D7/W2; (4) *a word → document index* (`CommandLogic`'s verb
resolution) — **accounted for and not generalized**: it is a boot preload of
every view (§ Requirements problems 2), so the typed-word index generalizes
`SoulCatalogue`'s lazy `ensureCache` instead, D9; (5) *lazy dictionary*
(ruling 1, `ReadingCatalogue`) — the shape of every surviving catalogue, D9;
(6) *document-path citation check* (census clause (g)) — extended with every
converted field, D15; (7) *aroma citation check* — the precedent for the
folder rule and for `lint:typed-words`, D3/D14; (8) *boot-entry ratchet* —
85 → 76, W1/W4/W5; (9) *index creation* — the PM's derived loop replaced by
two authored indexes in `documents.yaml`, D2.

**Not new, and deliberately so:** no new mixin; no new Api or logic
singleton; no new Mongo collection; no new module category; no free exported
helper; no `boot:` entry anywhere (nine are removed). The catalogues that
survive (`SoulCatalogue`, `RecipeCatalogue`, `ArchetypeCatalogue`,
`BlueprintCatalogue`, `HelpCatalogue`, `TopicCatalogue`, `DisciplineCatalogue`,
`SpellCatalogue`, `CorpoCatalogue`) are the existing singletons, each kept
only for the job it still has (D9). `GovernmentCatalogue`, `OperationCatalogue`,
`PlacementCatalogue` and `JointCatalogue` are deleted. One typed error class,
**`DocumentNotResidentError`**, joins `lib/errors.ts` (the existing home for
the kernel's typed errors): the by-construction rule's tripwire (D7) — an
engine defect named by path, never shown to a player.

## Plan-level decisions

**D1 — The kind declares its keys; the hook derives them.**
`DocumentKindSpec` gains `keys?: Record<string, (doc: {path; data}) => KeyValue | undefined>`
(`KeyValue = string | number | boolean | Array<string|number>`) and
`words?: (doc) => string[]` (the typed words, D3). `naturalKey` is deleted.
`StoredDocument.keys: Record<string, KeyValue>` is a persistent field,
**written only by `DocumentHook.aroundSave`** on the `documents` collection:
it looks the kind up, derives every declared key, writes `doc.keys`, and
refuses (throws) a write whose `kind` is not in the vocabulary or whose
`path` is empty — the store's one invariant, enforced at the one place both
writers pass. Declared this build, each with the reader that needs it:
`release → {publishedAt, pinned}` (the press, D5); `recipe → {output}`
(`recipeFor`, Grounding § 5); every typed-word kind → `word` (D3). Nothing
else, by rule 3 of § Requirements problems. A key written separately would
be the two-copies defect; a key no reader uses is a declaration to delete.

**D2 — One index: `{kind: 1, 'keys.$**': 1}` (compound wildcard), and
`{path: 1}` unique.** Both authored in `schema/documents.yaml` and planned
from it; the PM's derived natural-key loop (`#createDocumentKindIndexes`,
`runDocumentKindIndexesForTest`, the `attempt('documents (declared kinds)')`
call) is **deleted** — the store's indexes become authored facts like every
other collection's. Why the wildcard over the `[{k, v}]` attribute pattern:
the first consumer is an **order** (newest first), and a sort on a multikey
array value (`keys.v`) orders by the array's extreme element, not the
matched attribute's value, so the moment a release carries a second key the
press reads in the wrong order; a wildcard index keys each path natively and
`sort({'keys.publishedAt': -1})` is a real index order. It also stores the
card as authored (`keys: {publishedAt: …}`), with no transform on the way in
or out, and the kind prefix lets the install word check and the press query
be equality-on-kind first. Query shape (every `findByKey` emits it):
`{kind, 'keys.<k>': <eq | {$gte,$lte}>, [path: {$gte: prefix, $lt: prefix+'￿'}]}` with an
optional `sort({'keys.<k>': ±1})` and `limit`; an ordered read with no bound
passes an open range (`{$gte: MinKey}`-shaped) so the sort predicate is on
the indexed field. **Verification is part of W0's acceptance**: against the
worktree's Atlas database (Mongo 8.0.37), `explain()` on the press shape must
show an IXSCAN over the wildcard index for both the equality and the ordered
read; if it does not, the **named fallback** is one derived partial index per
declared `(kind, key)` — `{kind:1, 'keys.<k>':1}` partial on kind — which is
the loop being deleted, minus `unique`. The build records which shipped in the
drive record. `findByPrefix` becomes the path range above (served by the
unique path index) — the full-collection scan goes. ⚠ A worktree database
booted before this wave holds the non-unique `path_1`; `createIndex` on a
different option set throws, the PM logs *NOT built* and continues. The rule
is drop-and-boot (no migrations; dev databases are mine to drop), and W0's
acceptance says so.

**D3 — A typed word is a declared key, unique at install.** A kind whose
documents a player names by a word declares `words` (emote: the path leaf;
recipe: the leaf; placement: `data.prepositions`; operation, help-concept,
topic, formation: the leaf). The hook stores them in `keys.word`. The
installer's `flatKeyFailures` stays for the non-document flat kinds
(descriptor banks, subjects, settings — out of scope) and gains a
document-kind arm `wordFailures(packs)`: for every typed-word kind, each word
is claimed once across the **install set**, **and** once against the
**store** — `findByKey(kind, 'word', {eq})` for a row whose `sourcePack` is
not in the install set (the `sync`-from-a-directory case, Grounding § 2) —
and a second claimant fails the claiming pack naming the kind, the word and
**both** claimants (`(packId, relFile)` from the set, or `(sourcePack, path)`
from the store). Never first-wins, never silent. The in-memory word index
(D9) is built from `listOfKind` on first use, so it never needs to be unique
itself. ⚠ Not typed-word kinds: `form` (the word is resolved against the
instrument's own `forms:` list, so two wheels may each have a `brick`),
`joint` (resolved against the bill's `method` or the rope's knot list),
`aroma`, `dirt`, `pump-mechanism`, `archetype`, `blueprint`, the records,
`command-view` (which has `lint:verb-collisions`). A new gate
`lint:typed-words` runs the same check over the shipped packs before merge.

**D4 — `DocumentApi.findByKey(kind, key, q)`.** `q: {eq?, min?, max?,
prefix?, order?: 'asc'|'desc', limit?}`; returns `StoredDocument[]`; a read,
ungated like `read`. The only query surface added; `list`/`listOfKind` stay.
Not `find` — the store has one identity and this is a finder over a card.

**D5 — The press reads newest first by key.** `archiveImpl` → `findByKey('release',
'publishedAt', {max: before, order: 'desc', limit})`, then the existing
realm/kind/retracted/`publishedByOwner` filter over the **page** (realm is
derived from the live publisher and cannot be a key); `callUpImpl` → the same
ordered read over a bounded page instead of a full scan; `PressBoard.warm` →
two bounded reads (`pinned` eq true; newest `tickerWindow`) instead of the
whole kind. `PressBoard`'s `producer` boot entry **stays**: `PressApi.recent()`
is read synchronously at session entry (`Avatar.ts:1067`); the window is now
two indexed reads, which is the tiering slate's sequencing item 1 done.

**D6 — The nine families become documents, each the aroma recipe.** For
each: a `DOCUMENT_KINDS` entry (`onVanish: 'delete'`, `ext: 'yaml'`), a
`DOCUMENT_VALIDATORS` entry (`<Value>.fromData(data, path)`), a value class
in `lib/` composing a `DocumentCache`, rows moved to `content/<contentDir>/`
with `class:` dropped and `data:` lifted (the file IS the data, as aromas
are), every citation a path, the Idea class deleted, and the go-live through
`DocumentCache.invalidate(kind, changed, deleted)`.

| family | kind · contentDir | value class (new home) | path citations the build writes | typed word |
|---|---|---|---|---|
| DirtKind | `dirt` · `dirt` | `lib/cleanliness/DirtKind.ts` (the descriptor + `setsAbove`, moved from `platform/idea`) | 8 recipe `soils[].kind`; ~25 kernel/pack TS literals (`DirtKinds.GREASE = '/platform/dirt/grease'`-style constants on the value class, so a literal is one place); `Floor.ABSORBED_KINDS`; `deposits` keys and `stains[].kind` persist the **path** (`depositKey(site, kind)` must use a separator a path cannot contain — check it) | none |
| Form | `form` · `forms` | `lib/craft/FormSpec.ts` gains `Form` (loads a `FormWord` from a document) | 17 `forms:` entries (new paths); potter brain `forms:` words unchanged | resolved against the holder's list — no install check |
| HelpConcept | `help-concept` · `concepts` | `lib/help/HelpConcept.ts` (new folder `lib/help/` — the help subsystem has no `lib/` home today; `HelpCatalogue` keeps its harvest) | 34 `seeAlso:` → paths | yes (`help <word>`) |
| Placement | `placement` · `placements` | `lib/spatial/Placement.ts` (beside `Placing`/`PlacementOffers`; ⚠ the `Placement` *type* in `lib/combat/AimResolution.ts` is a different module and stays) | 14 `placements:` rows → paths; the three code defaults and three `move(…, 'on')` literals → `Placement.ON/IN/FROM` path constants; `ContentPlacement` persists the path | yes (`put X on|in|from Y`, `dry`) |
| PumpMechanism | `pump-mechanism` · `pump-mechanisms` | `lib/pump/PumpMechanism.ts` | 4 `mechanism:` → new paths | none |
| Operation | `operation` · `operations` | `lib/vitals/Operation.ts` (the medic substrate's folder; `OperationCatalogue` goes — its one reader lists the kind) | none | yes (`operate … for <word>`) |
| Topic | `topic` · `topics` | `lib/message/Topic.ts` (the descriptor + facets the catalogue parses today, validated in `fromData`) | none (code emitters stay dotted keys) | yes (the dotted key; `validatePackTopics` moves onto the kind's files; `pruneRetiredRoots`' runtime delete goes) |
| Joint | `joint` · `joints` | `lib/craft/Joint.ts` (beside `Assembled`) | ~50 bill `joints[].method` → paths; `Rope.KNOTS` literals → paths; `JointState.method` persists the path | none |
| CombatFormation | `formation` · `formations` | `lib/combat/Formation.ts` (`policy()` + `DEFAULT_POLICY`) | `DEFAULT_FORMATION_PATH` → `/platform/formations/default`; Party/PartyRecord/AccountabilityEvent persist the new path | yes (`party adopt <word>`) |

**D7 — ⭐⭐ A cited document (or Idea) is resident whenever the thing that
cites it is resident — true by construction, so a synchronous read always
finds it.** (Owner, 2026-11-09: *"you're responsible for loading objects into
the game when they're needed; you can't just say 'they're not loaded yet'
and give up."*) Nobody above the model — not a controller, not a pack author
— ever warms anything. Four mechanisms carry the rule, each chosen per
family in D6/D12/D13 and in the waves:

1. **Authored citations** load through the field's **async setter**, which
   the applier awaits in both clone and restore mode
   (`TemplateApplier.ts:196`; `PersistableLogic.ts:836-845` runs the same
   applier with `mode: 'restore'`) — `await X.ensure(path)` inside
   `set<Field>`, the `smells`/`Aroma.ensure` precedent — or through
   `ref: 'identity:constituent'` for an Idea (D10). A row is not live until
   what it cites is.
2. **Runtime state that cites a document** — `deposits`/`stains` (dirt),
   `ContentPlacement`, `JointState.method`, `formationPath`,
   `BulkPayload.recipe`, `Crafted.recipe`, a thermal dose recipe, a
   character's transcript disciplines — is **restored through the same awaited
   setters** (`materialize` is async), so a restored host is live only when
   its citations are. `ContentPlacement` is restored by `PersistableLogic`'s
   own placement pass (`Containable.ts:98`), which awaits `Placement.ensure`
   per restored item. Nothing "starts a load and reads cold."
3. **A runtime write** of such state happens in an act that already holds
   the document (a word was resolved to a document to make the write; a
   payload is copied from a resident payload; a craft had its recipe in
   hand), so the written path is resident by induction. The setter asserts
   it synchronously (`require`, below).
4. **A class's own built-in citations** load **with that class's content**,
   in the host's own `onCreate`/registration path — never a `boot:` entry:
   `PlacingMixin.onCreate` ensures every path in its `placements` (the
   `['on']` default included); `ContainerMixin.onCreate` ensures
   `Placement.IN` (every container has an inside — `PlacementOffers`
   already says so); `Chamber` likewise; `SoilableMixin.onCreate` ensures the
   kernel's dirt vocabulary (`/platform/dirt/*`, one prefix read, cached for
   the process — the ~25 kernel literals are all platform kinds; a pack
   soiling with its own kind, `trade-mining`'s `dust`, awaits
   `DirtKind.ensure` in its own async act, which is content it owns);
   `Party.onCreate` ensures its formation (the default one included);
   `Rope.onCreate` ensures its `KNOTS`; `AdvancementMixin.onCreate` warms the
   discipline dictionary and stands up the stock-bearing disciplines
   (D11); `FreshnessMixin.onCreate` and the corpse's arc ensure `rot`,
   `decay`, `blood` (the kernel aroma literals, W6). ⭐ The one place this
   is **engine machinery rather than a host**: message topics (D13).

Every value class exposes `ensure(path)` (async), **`require(path)`** (sync;
returns the value or throws **`DocumentNotResidentError`**, a typed internal
error naming the path and the kind — an engine defect, loud for us, never a
player-facing refusal and never a skip), `byWord`/`all` where a dictionary is
needed, `remember` for fixtures, and the static `invalidate` go-live. There is
**no nullable `resolve`** on the new classes. Every sync reader named in the
Grounding (`BlendIdentity.recipeOf`, `ThermalDose.doseRecipeFor`,
`Soilable.dirtKind`, `Assembled.jointRow`, `CombatLogic.resolvePolicyFor`,
`Containable.getEnclosingScope`, `ContainmentLogic.placeOn`, the MQL
`placed` projection, the discipline digest) calls `require`. A **missing
document** (a path no pack ships) fails at the setter — the row or the
restore refuses, naming the path — and `lint:census` (g) / `lint:aromas`
catch it before merge. `Aroma` keeps its !541 surface (`resolve` +
`settling`): the nose is the engine waiting out a load it started itself
inside the verb, with no caller involvement — the D13 clause — and its kernel
literals move onto their hosts' `onCreate` in W6.

**How the build proves the by-construction claim** — a test per mechanism,
then the drive: (1) per family, *clone a row citing a path → `require` succeeds
immediately after the clone, before any read*; (2) per runtime field, *materialize
a snapshot carrying a path → `require` succeeds immediately after
`materialize`*; (3) per host default, *stand the host up → its built-in paths
are resident*; (4) the negative, *`require` on a path nothing loaded throws
`DocumentNotResidentError` naming it*; (5) the drive on a fresh world and
after the restart, with the server log grepped for `DocumentNotResident` —
it must be empty — and the drive's first `put`, `fit`, `party adopt`,
`smell` of a soiled shirt and `competence` deliberately being the **first**
such reads of the boot.

**D8 — The four flat-key kinds: the leaf is the word.** `Emote.fromData`,
`Recipe.fromData`, `Archetype.fromData` and the blueprint read take the word
from the path leaf; `verb`/`recipeId`/`archetypeId`/`blueprintId` leave the
files (the installer's basename injection and mismatch check go with the
key). `SoulCatalogue` keys its cache by the leaf and changes nothing else (it
is already lazy, D9). `RecipeCatalogue` keeps its word and output indexes and
becomes lazy; `Recipe` composes a `DocumentCache` so the sync readers resolve
by **path**: `BulkPayload.recipeId` → `recipe` (a path), `Crafted.recipe` a
path, `offeredRecipes:`/`recipeRef`/`lagerLeg.recipe` paths. `ArchetypeCatalogue`
and `BlueprintCatalogue` become lazy (`ensureCache` awaits the warm, the
SoulCatalogue shape); `SurveyController` awaits the singleton it already
resolves; `StudioLogic.requireCatalogue` already awaits. ⚠ `BlueprintCatalogue.rebuild()`
(every class module loaded, rows written) moves from boot to the **first
studio request** — a seconds-long first request, recorded in the drive. The
`blueprints` collection's status as a cache stays the tiering slate's.

**D9 — Which catalogues survive, and as what.** A catalogue stays only as a
**lazy dictionary** (scan-sweep ruling 1) for a word a player types or a
roster a verb lists, warmed on its first async use and never booted:
`SoulCatalogue` (verb), `RecipeCatalogue` (word, output), `ArchetypeCatalogue`
(the `survey` roster), `BlueprintCatalogue` (the studio roster),
`HelpCatalogue` (`help <word>` — unchanged shape), `TopicCatalogue` (the
dotted key; now over `Topic` documents, with the dispatch queue of D13),
`SpellCatalogue` (word → path, and `spells`), `CorpoCatalogue`
(`craft … with <brand>` word), `DisciplineCatalogue` (key → path, and the
conditioning roster — D11). Deleted: `OperationCatalogue` (its one reader
lists the kind through `Operation.all()`), `GovernmentCatalogue` (no word, no
roster reader), **`PlacementCatalogue`** (the word is resolved against the
host's own `placements`, D12), **`JointCatalogue`** (every caller takes
`Joint.require`/`Joint.ensure` on a path the bill or the rope already names;
`peek`'s cold default is exactly what D7 forbids). Every surviving catalogue
drops its `boot:` line, warms in `ensureCache` on first use, and keeps
`canEvict`/`canDestruct` refusals.
`lint:template-scans` entries for the document-backed ones go (they read
documents now); `Spell`/`Discipline`/`Corpo` keep one `findByClass`/
`findDescendants` each with the reason `LAZY_DICT`.

**D10 — The Ideas that stay Ideas load as live Ideas.** `Discipline`, `Spell`,
`Corpo`, `Brand`, `Government` compose `SingletonMixin`, veto eviction (a
vocabulary once read stays read — the catalogues' own rule), and their
catalogues' `build*Descriptor` coercion moves onto the Idea's **setters**
(per-field invariants belong on setters) with cross-field checks in
`onCreate` (`SpellCatalogue`'s effect/grid validation becomes `Spell.onCreate`,
so an invalid spell **throws at stand-up** and `cast` refuses it by name
instead of the row being silently dropped at warm). A reader that has the
**path** reaches the Idea with `await StuffApi.singleton(path)` (async) or
`StuffApi.findByTemplatePath(path)` (sync — resident because its holder
loaded it). Authored path citations get `ref: 'identity:constituent'` so the
applier stands the Idea up with its holder: `Arcane.carriedSpellPath`,
`Spellbook.teachesSpellPath`; and the bare-key citations of the three small
families become paths with the same ref: `Branded._brandKey` → `brand`
(12 rows), `BankMixin.corpoKey` → `corpo` (1), Brand `owner` (11) and
`rivals` (6) → paths, `Locality._governmentKey` → `government` (5),
`ShipRegister.government` (1), Brand `government` (1), ship `flag` (4) →
government paths. The sync readers (`Branded.getBrand/getCorpo`,
`Flag.colorsOf`, `GovernmentLogic.chainForAddress`, `Arcane.getArcaneFootprint`)
then read a resident Idea by path. `TemplatePathPrefixes.corpo/brand/government`
and `TemplatePathRosters.government` go with the scans.

**D11 — Discipline keeps bare keys and a lazy dictionary; this is the one
exception and it is named.** 700+ bare-key citations across five roots
(Grounding § 7) make path citation a sweep of its own, and the keys are the
vocabulary the new document kinds themselves cite (`aroma.discipline`,
`form.discipline`, `operation.competence`). So `DisciplineCatalogue` stays as
the lazy `key → path` dictionary (one `findByClass` on first use), standing a
`Discipline` up (`singleton(path)`) when something reaches one and reading
`getStock()`/`getConferrals()`/`getSpecializes()` **off the live Idea**. The
sync digest (`competenceDigestCached` and its ten callers) is per character:
`Advancement` loads, at `restore`/`armSession` (async), every discipline its
transcript cites plus the dictionary's **stock-bearing** entries (the
dictionary keeps `{key, path, hasStock}` per row — the one roster fact
`withConditioning` needs, so no live-Idea scan), after which every sync read
is a `findByTemplatePath` that **must** find the Idea — a miss throws
`DocumentNotResidentError` (D7); there is no cold digest. The dictionary
itself is warmed in `AdvancementMixin.onCreate` (D7 mechanism 4), so a
character is live only when its disciplines are. ✅ **Accepted by the owner
(2026-11-09):** a discipline key is a flat namespace across five roots today;
*"if we end up needing custom disciplines we'll namespace shit. it should
already be hierarchical even though probably its mostly flat right now. but
we want a deep skill tree in the game."* So: keys stay bare, the dictionary
stays, and **namespacing arrives when a custom discipline needs it** (the
tree is the intended shape; `specializes:` edges already exist). The slate
keeps the finding as the attach point, not as a defect.

**D12 — Placement: the host that offers a way of sitting loads it; the
word is resolved against the host.** `ContainmentApi.move` is synchronous
and stays so (the one movement primitive, ~200 callers). No controller
warms anything. A placement document is resident by construction through
D7's mechanisms: a `placements:` field's **async setter** awaits
`Placement.ensure` per path (authored rows and restores alike);
`PlacingMixin.onCreate` ensures its `placements` so the `['on']` default is
covered; `ContainerMixin.onCreate` and `Chamber` ensure `Placement.IN`
(every container's inside — `PlacementOffers` defaults to it today); the
`PersistableLogic` placement pass awaits `Placement.ensure` for each restored
item's `ContentPlacement`. A typed word (`put X on Y`) is resolved **against
the host's own `placements`** — `wordsFor`/`resolvePlacement` read the host's
documents' `prepositions` — exactly as a form word is resolved against a
wheel's `forms:`; so there is **no global placement dictionary** and
`PlacementCatalogue` is **deleted**, not kept lazy. The three code literals
(`HeatController:176`, `PaperMould:51`, `PulpVat:107`) become
`Placement.ON` and are resident because the host they place onto is a
Placing host. `ContainmentLogic.placeOn`, `Containable.getEnclosingScope`,
`PlacementOffers`, `Placing.canPlace`/`wordsFor`/`resolvePlacement` and the
MQL `placed` projection call `Placement.require(path)`: a miss is
`DocumentNotResidentError` (an engine defect — loud for us), never a refusal
and never the open-scope default. `lint:placement-words` keeps its two rules
(every member lists a preposition; no two members share a primary word) over
the documents, and `placement` stays a typed-word kind for the install check
(D3) for the same reason that lint exists.

**D13 — Topic: the engine-machinery exception, and why it is one.** A
topic is **named by code** (`.topic('combat.hit')`, ~1217 sites) and cited by
no holder, so no host can carry its load under D7's mechanisms 1–4 — there
is no row whose setter could await it and no class whose content it is. The
message pipeline is engine machinery (true whether anyone plays), which is
the class of thing scan-sweep lets stay engine-wired (wardens, not content).
So the engine loads it **transparently, with no caller involvement and no
message lost**: `Scene.send()` stays synchronous for its caller; internally,
while the topic dictionary (`TopicCatalogue` over `Topic` documents) is
cold, dispatch is **queued in order** behind the one warm the first scene
starts (`TopicCatalogue.warming(): Promise | null`), and every queued scene
dispatches, in order, when it resolves — no frame is ever classified cold and
no frame is dropped. `Avatar.buildWelcomePayload` (async) awaits the same
warm before sending the client its snapshot. Any `isCommunicative`/`feedsFor`
read that still finds the dictionary cold (a frame that bypassed `Scene.send`)
throws `DocumentNotResidentError`. A `.topic()` key with no document keeps
the catalogue's third tier (a derived descriptor + a diagnostic), with
`lint:topics` holding the authored vocabulary total before merge. ⭐ **Flagged
for the owner** as the one engine-wired load in this build: not a `boot:`
entry (nothing is read at boot; the first scene of the process pays one
indexed read of 38 documents), but the loader is the pipeline, not a host.
✅ **Owner, 2026-11-09: the queue.** (*"queue is fine."*) The boot-time
`await Topic.warm()` in `BootstrapManager` was the alternative and is not
taken; if the queue proves awkward in tests, re-plan W4 in place and say so
in the MR rather than switching silently.

**D14 — The aroma folder is the tree.** A child aroma lives in its parent's
directory (`aromas/smoke/peat-smoke.yaml`); its parent is the aroma document
at the containing directory's path (`/base-library/aromas/smoke`). `Aroma.ensure`
derives `parent` as `data.parent ?? parentFromPath(path)` where
`parentFromPath` is the path one segment up **if that path is itself an
aroma document** (a root at `/…/aromas/<word>` has none); an explicit
`parent:` is permitted only when it names a path **outside the document's own
pack**, and `lint:aromas` refuses an explicit parent that equals (or
contradicts) the folder parent — two copies of one fact. The move: 89 files
into 27 directories (max depth 2; roots stay flat), every `parent:` line
removed, and every citation rewritten by a one-off mapping (old path → new
path, 89 entries) over the 417 citing files, the four kernel literals
(`MortalArc.ts:65-67`, `Freshness.ts:176`, `check-aromas.ts:46-50`) and the
test fixtures. Collisions are only visual (`earth/peat` vs `smoke/peat-smoke`;
`green/straw` vs `smoke/straw-smoke`) — distinct paths.

**D15 — The lints follow the rows.** `check-template-census` clause (g)
`DOCUMENT_PATH_FIELDS` gains every converted citation field (`soils[].kind →
dirt`, `forms → forms`, `placements → placements`, `mechanism →
pump-mechanisms`, `joints[].method → joints`, `seeAlso → concepts`,
`offeredRecipes → recipes`, `recipe → recipes`) and drops `forms`/`mechanism`
from the template-path clauses; `carriedSpellPath`, `teachesSpellPath`,
`brand`, `corpo`, `owner`, `rivals`, `government`, `flag` are read by clause
(b) as template paths (they name Ideas). `check-placement-words` walks
`content/*/content/placements/`; `check-topic-keys` reads `TOPIC_SEEDS` from
`content/platform/content/topics/`; `check-bills` indexes Joint documents and
checks `method` as a path; `check-capabilities:159` follows; `check-untitled-paths`
derives `DOCUMENT_DIRS` from `DOCUMENT_KINDS`; `check-aromas` gains the folder
rule (D14); `check-boot-entries` ceiling 85 → **76**; `check-template-scans`
allowlist loses the document-backed catalogues and `GovernmentCatalogue`;
`check-boundary-roles` `COMMONS_CEILING` falls by the classes deleted;
`check-instanceable-placement` `ORPHAN_DATA_KEY_CEILING` falls by the Topic
facet keys that leave the template tree; `scripts/__fixtures__/field-meta-golden.json`
is regenerated; `schema/documents.yaml` carries the new indexes and a
`purpose` that names the populations; `lint:schema` must agree.
`lint:typed-words` is added (D3).

**D16 — The CMS edit reaches the cache.** *(Built at W7 — the doc sweep found
it missing: `DocumentLogic` save/delete now drop the path from the kind's
`DocumentCache` and re-warm topics; a catalogue's own re-warm stays the
installer's.)* `DocumentLogic.saveImpl`/`deleteImpl`
call the kind's go-live (`DocumentCache.invalidate(kind, [path])` and the
surviving catalogue's drop) — the same hook the installer calls — so an edited
dirt kind or joint reads on the next use without a restart, as command views
already do.

**D17 — Drive mechanics.** The blocking drive is
`packages/wire/tests/documents-path-identity.dirty.wire.test.ts` (WIRE_PORT
2019, `WIRE_BOOT_TIMEOUT=840000`); the restart (step 20) is the sugar
`restartWorld()` precedent; the two fixture packs of step 19 are written by
the test into a temp directory and installed through the founder's
`eval` → `PackApi.sync('<id>', '<tmp root>')` (Grounding § 2), so no test pack
ships in `packages/content`. Dirty because step 19 installs packs the world
does not remove and step 18 publishes releases.

**D18 — Row relocation is a scripted codemod the build runs, not a file it
commits.** For each family: read every `<root>/idea/<Family>/*.yaml`, drop
`class:`, lift `data:` to the top level, write to
`content/<contentDir>/<same relative leaf>.yaml` under the same pack, delete
the source, then rewrite citations from the (old key → new path) map. The
plan lists the map's shape; the build keeps the script in its shell history,
and the wave's acceptance is the census lint, not the script.

## ⭐⭐ Host placement

| new field / class / composition | host | what composing it claims about every other composer | honest-default test |
|---|---|---|---|
| `StoredDocument.keys` | `StoredDocument` (every document) | every document has a catalogue card; most cards are **empty** `{}` — but the card is the store's uniform shape the owner asked for, derived and never authored, and an empty card costs one field and nothing in the index (the wildcard indexes only present keys). No guard anywhere narrows the host set | passes — "has a card" is true of every document; "has a key" is per kind, declared |
| `DocumentKindSpec.keys` / `words` | the kind spec | a kind may declare keys; most declare none. Declarations, not behavior | n/a |
| `DocumentHook` | the `documents` collection's save slot | every document write derives its card; nothing is skipped | n/a |
| `SingletonMixin` + eviction veto on `Discipline`, `Spell`, `Corpo`, `Brand`, `Government` | those five Idea classes | one live instance per row, kept resident once read — true of every row of every one of them (they are reference vocabulary, like `Material`) | passes — every row answers yes |
| `ref: 'identity:constituent'` on `carriedSpellPath`, `teachesSpellPath`, `brand`, `corpo`, Brand `owner`/`rivals`, `government`, `flag`, ShipRegister `government` | the fields that already exist on `Arcane`, `Spellbook`, `Branded`, `BankMixin`, `Brand`, `Locality`, `Ship`, `ShipRegister` | the holder loads the Idea it names — true wherever the field is set; a holder with the field unset loads nothing | passes |
| `Placing.placements` as paths | `PlacingMixin` (existing field) | no change of host; the value's shape changes | n/a |
| `Placement.ON/IN/FROM` path constants | the `Placement` value class | the kernel's own three ways of sitting are named in one place | n/a |
| value classes `DirtKind`, `Form`, `HelpConcept`, `Placement`, `PumpMechanism`, `Operation`, `Topic`, `Joint`, `Formation` | `lib/<owning subsystem>/` — substrate only ever read, never instanced as Stuff (the `/lib/` invariant holds: no template row names one) | nothing composes them; they are read | n/a |
| `DocumentCache<T>` | a `private static readonly` on each value class (composition, not inheritance — a static cache inherited by subclasses is shared, which is the trap) | each family owns its memory of what it has read | n/a |
| an awaited `ensure` in `onCreate` (D7 mechanism 4) | `PlacingMixin` (its `placements`), `ContainerMixin` + `Chamber` (`Placement.IN`), `SoilableMixin` (the kernel's dirt kinds), `Party` (its formation), `Rope` (its knots), `AdvancementMixin` (the discipline dictionary + the stock-bearing disciplines), `FreshnessMixin` (`rot`), the corpse arc (`blood`, `decay`) | a host is live only when its own built-in vocabulary is — one awaited cache hit per host after the first; no guard narrows any of these sets | passes on each: every container has an inside; every placing host offers a way of sitting; every soilable thing can take the kernel's dirt; every party has a formation; every rope ties the kernel's knots; every character has the conditioning stocks; everything that rots smells of rot. ⚠ `ContainerMixin` is the widest host in the game — the claim is exactly `PlacementOffers`' existing default, made resident |

Nothing in this build puts a field on `Thing`, `Idea`, `Stuff`, `Location`
or any base class. The `Freshness off every Thing` shape does not arise: the
only base-wide field is on `StoredDocument`, which is a record, not a world
object.

## Convention conformance

Checked at plan time against the current tree:

- **`props:`/`cast:`** — untouched; no place changes. **Locations, not rooms**
  — no new place. **`<root>/<branch>/` path pattern** — documents sit at
  `<pack root>/<contentDir>/<leaf>` (the aroma precedent), never under a
  `<branch>/` segment; the Idea rows that stay keep their `<root>/idea/<Class>/`
  paths.
- **Module scope declares; lifecycles initialize** — the `DOCUMENT_KINDS`
  table gains function values (`keys`, `words`), which are declarations, not
  executable statements; every `DocumentCache` is a `static readonly` value
  construction; warms happen in `ensureCache`/`onCreate`/first use. `lint:module-scope`.
- **Import boundary** — `DocumentHook` imports only mudlib; `DocumentKinds`
  keeps importing nothing (the derivations are pure); value classes import
  `DocumentApi`/`DiagnosticApi` as `Aroma` does. `lint:imports`.
- **Module categories** — one hook (an existing category, `platform/idea/hooks/`),
  one value object in `lib/document/`, nine value classes in existing or
  new `lib/<subsystem>/` folders (`lib/help/` is the one new folder, a
  subsystem that has none; it is not a new category), one lint script. No
  Api, no logic singleton, no free exported helper. `lint:lib-statics`,
  `lint:mixin-files`, `lint:instanceable` (no template names a `/lib/` module;
  the deleted Idea classes leave no row behind — the census catches a
  straggler).
- **Verbs on objects** — no `XApi.verb(host, …)`; `findByKey` is a store read,
  not a verb on a world object. `lint:object-verbs`.
- **Persistence per content (P6)** — nothing new persists per class; the
  documents are installed content (`onVanish: 'delete'`); the runtime fields
  that change shape (`recipe`, `ContentPlacement`, `JointState.method`,
  `formationPath`, `deposits`) were already persisted and now hold paths.
  Identity keys survive a restart because they are paths.
- **P3 refuse / skip / throw** — the hook throws on an unknown kind; the
  installer refuses a second word claimant naming both; a missing document
  **refuses at the setter** (the row or the restore fails naming the path);
  a sync read that finds a document not resident is an engine defect and
  throws `DocumentNotResidentError` (D7) — never a player refusal, never a
  skip, never a default; the press query has no silent fallback (an
  unindexed sort is a logged *NOT built* at boot and an `explain` in W0).
- **P4 no duck typing** — a pack reads a document through `DocumentApi` and
  a value class the kernel exports; `trade-medicine` reads `Operation.all()`
  instead of `StuffApi.singleton(TemplatePaths.operationCatalogue)`;
  `FisheryRegistry` keeps `StuffApi.singleton<Discipline>`. `lint:duck-typing`.
- **P5 the mixin decides** — `Placing`/`Containable` decide placement from
  the value class; controllers only await the warm (D12) and bind the word.
- **P7 load on use** — nine boot entries removed, none added; every load
  follows an authored reference (a path on a row, a constituent ref) or a
  typed word through a lazy dictionary (ruling 1); the two template scans
  that remain are lazy dictionaries with reasons. `lint:boot-entries`,
  `lint:template-scans`.
- **P8 names** — classes named for what they are (`Formation`, not
  `CombatFormation`, since a formation is a party's and a fight's; `DirtKind`
  keeps its name — a dirt *kind* is what the rows are); kind strings are
  nouns (`dirt`, `joint`, `topic`); `findByKey` reads as a finder, not an
  identity. American English throughout (`color`, `catalog` is NOT used — the
  shipped `*Catalogue` identifiers are kept, not renamed piecemeal).
- **Gates this build must pass** (all of `lint:family`, naming the ones it
  changes): `lint:aromas`, `lint:census`, `lint:boot-entries`,
  `lint:template-scans`, `lint:placement-words`, `lint:topics`, `lint:bills`,
  `lint:capabilities`, `lint:untitled`, `lint:schema`, `lint:boundary-roles`,
  `lint:instanceable`, `lint:field-meta`, `lint:closed-vocabularies` (prose
  cites Placement), `lint:whole-table` (the press no longer hands back its
  table), `lint:test-bootstrap`, and the new `lint:typed-words`.

## Waves

Each wave lands green on `pnpm test:near` + every touched pack's vitest +
`pnpm -C packages/server lint:family`, and ends at one commit. The riskiest
pieces — the two sync-primitive families (W4) and the disciplines (W5b) —
are isolated so a wrong premise re-plans one wave in place.

### W0 — the catalogue card: keys, the one index, the path is unique (D1, D2, D4)

> ✅ **Done (build).** What changed from the plan, and why:
> - **No `DocumentHook` (D1 re-planned).** `AppBootstrap` runs
>   `PackApi.install()` *before* `loadHooks()` — the hook is a template the
>   installer installs — so a hook can never see an installer row and is not
>   the chokepoint. The card is derived by one static,
>   `StoredDocument.cardOf(kind, path, data)`, called by the two writers that
>   exist: `StoredDocument.save()` (every `DocumentLogic` write) and the
>   installer's `rowOf`. One derivation, two call sites, no hook, no
>   `hooks.yaml` entry, no row template. (P1: one fewer new substrate.)
> - **An undeclared kind gets an empty card, not a throw.** Runtime code
>   files kinds outside `DOCUMENT_KINDS` (`venue-eighty-six` from the
>   enforces brain, CMS saves of arbitrary kinds); the store stays
>   kind-agnostic and only the pack-installable vocabulary is closed. An
>   empty path still throws.
> - **The word from the leaf moved into W0** (from W1): with `naturalKey`
>   gone the installer no longer injects `data.verb`, so `Emote/Recipe/
>   Archetype.fromData(data, path)` and `Blueprint.curatedDataOf` read the
>   word from the path's leaf now (validators get the path). `Emote.toData`
>   and `Recipe.toData` stop writing the id. The content files still carry
>   their key lines (ignored); W1 strips them.
> - **`findByKey` / the prefix range live in `DocumentLogic`, not on
>   `StoredDocument`** — `lint:lib-statics` (ceiling 340) refuses new public
>   statics on a lib class nobody but the logic calls; `StoredDocument` keeps
>   three statics (`findByPath`, `findByKind`, `cardOf` — `findByPrefix`
>   went into the logic as `documentsUnder`).
> - **Test fakes**: the in-memory `pm.find` fakes matched equality only; a
>   shared test-only matcher `lib/document/__tests__/document-query.ts`
>   (`matchesDocumentQuery`, `applyFindOptions`) answers ranges, `$or`,
>   dotted keys and sort/limit. Fakes are pointed at it as they meet the new
>   queries.
> - The installer's install-set word check rides the existing
>   `flatKeysOf` (fed by `spec.words`); W1 adds the store claimant.
> - The `explain` check of D2 is deferred to the drive (it needs a booted
>   world); recorded in the drive record.

Goal: every document carries a derived `keys` card, one index serves every
key, the path is unique, prefix reads use the path index.

- `lib/document/DocumentKinds.ts`: `naturalKey` → `keys?`/`words?` on the
  spec; the four flat kinds keep working for one wave by declaring
  `words: leaf` (their key fields are still in the files until W1); delete
  `FLAT_KEY_DOCUMENT_KINDS`; `release` declares `{publishedAt, pinned}`.
- `lib/document/StoredDocument.ts`: `keys` field + `fieldMeta`; `findByPrefix`
  → the path range query; `findByKey(kind, key, q)`.
- `platform/idea/hooks/DocumentHook.ts` + `hooks.yaml` entry on `documents`
  save; derives `keys` from the spec, throws on an undeclared kind or empty
  path. Row template `packages/content/platform/content/platform/idea/hooks/DocumentHook.yaml`
  mirroring `DomainHook`'s.
- `api/document.ts` + `DocumentLogic.ts`: `findByKey`.
- `backend/PersistenceManager.ts`: delete `#createDocumentKindIndexes`,
  `#indexTarget`, `runDocumentKindIndexesForTest`, the `attempt('documents
  (declared kinds)')`; `schema/documents.yaml`: `{path:1}` **unique**,
  `{kind:1, 'keys.$**':1}`, keep `{kind:1}`; purpose text. `pnpm gen:schema`.
- `PackLogic.ts`: `documentStrategy.dbKeyQuery` is `{kind, path}` for every
  kind (the adopt-by-key-at-any-path rule goes); `rowOf` leaves `keys` to the
  hook.
- Tests: `lib/document/__tests__/DocumentKinds.keys.test.ts` (derivation per
  declared kind), `platform/idea/hooks/__tests__/DocumentHook.test.ts`
  (card written; unknown kind throws), `StoredDocument.findByKey` query shape
  (the query object, not Mongo), `PersistenceManager.documentKinds.test.ts`
  retired, `gen-schema.test.ts` updated.
- **Acceptance**: drop the worktree database, boot; the PM boot line reports
  0 `NOT built`; `explain()` against the worktree's Atlas database (the
  `mongosh` one-liner recorded in the plan's drive record) shows IXSCAN on
  the wildcard index for `{kind:'release','keys.publishedAt':{$lte: now}}`
  sorted desc — or the fallback of D2 is adopted and recorded. Commit:
  `build(documents W0): the catalogue card — keys, one index, the path is unique`.

### W1 — the four flat-key kinds are named by their path (D3, D8, D9)

Goal: no kind carries a second name; typed words are unique at install;
recipe/archetype/blueprint load on use.

- `DocumentKinds.ts`: `emote`, `recipe`, `archetype` declare `words: leaf`;
  `recipe` declares `keys: {output}`. `PackLogic.ts:901-911` injection and
  mismatch check deleted; `wordFailures` added beside `flatKeyFailures`
  (install set + store, D3); `sync` runs it with the explicit root's set.
- `Emote.fromData`/`Recipe.fromData`/`Archetype.fromData` take `(data, path)`;
  the 34 + 195 + 21 + 9 files lose their key lines (a sed per kind; the
  basename already equals the key in every file).
- `lib/document/DocumentCache.ts` is **extracted here** from `Aroma`
  (`known`/`loading`/`ensure`/`remember`/`forgetAll`, plus **`require`**
  (sync, throws `DocumentNotResidentError`), `byWord`/`all`/`warm` and the
  static `invalidate(kind, changed, deleted)` registry; `Aroma` alone keeps
  its shipped `resolve`/`waitFor`/`loadRow`/`settling` on its own class, over
  the shared cache — D7); `Aroma` delegates to it with its public surface
  unchanged (every Aroma test passes untouched). `DocumentNotResidentError`
  lands in `lib/errors.ts`.
- `SoulCatalogue`: cache by leaf (no other change). `RecipeCatalogue`:
  `ensureCache` awaits `warm()`; `Recipe` composes a `DocumentCache`; `getRecipe(path)`;
  `BlendIdentity.recipeOf`/`ThermalDose.doseRecipeFor` → `Recipe.require(path)`
  (D7 — resident by construction: the Bulkable slot / `Crafted.recipe` /
  thermal-dose setters await `Recipe.ensure` at restore, and a runtime
  `setPayload` or craft mint writes a path the act already resolved, asserted
  by `require` in the setter); `BulkPayload.recipeId` → `recipe` path,
  `Crafted.recipe` path, `offeredRecipes:` (6 rows), `hand.yaml:57`,
  `DipPot.ts:78,108` paths; `Menu.getOfferedRecipeIds` → paths.
  `ArchetypeCatalogue`, `BlueprintCatalogue`: lazy `ensureCache`;
  `SurveyController` awaits the singleton. Boot entries −3
  (`RecipeCatalogue`, `ArchetypeCatalogue`, `BlueprintCatalogue`);
  `BOOT_ENTRY_CEILING` 85 → 82. `invalidateDocumentKind` cases updated.
- `scripts/check-typed-words.ts` + `package.json` `lint:typed-words`;
  `check-untitled-paths.ts` `DOCUMENT_DIRS` derived.
- Tests: `PackLogic.flatkey.test.ts` → `PackLogic.words.test.ts` (install set;
  store claimant via the harness's `documentRows`); `PackLogic.threeway/record`
  updated; `RecipeCatalogue.lazy.test.ts`; the D7 proof tests for recipes
  (a materialized vessel holding a blend has its recipe resident before any
  `getHeldKeywords`; a thermal item likewise; `require` on an unloaded path
  throws by name);
  `ArchetypeCatalogue.test.ts`, `BlueprintCatalogue.test.ts` for the lazy warm.
- Commit: `build(documents W1): emote, recipe, archetype, blueprint are named by their path`.

> ✅ **W1 done (build).** What changed from the plan, and why:
> - ⚠ **Runtime recipe references keep the recipe's WORD (D8 narrowed).**
>   `BulkPayload.recipeId`, `Crafted.recipe` and the thermal dose name the
>   recipe by its word — the path's leaf, which the install check (D3) keeps
>   unique — rather than by path. *Authored* citations name paths
>   (`offeredRecipes:` on the six menus, the brewing hand's `lagerLeg.recipe`,
>   `DipPot`'s two literals), and `RecipeCatalogue.findByKeyword` /
>   `getRecipeAt` resolve a path. Why: the word is not a second stored name
>   (it is derived from the path), a player types it, and converting every
>   runtime field to a path was ~170 production + ~300 test references for no
>   behavior a player could see. Lens 2 (authors cite paths) is met; flagged
>   for the owner in the MR.
> - **Residency (D7) for recipes is the dictionary, not a per-path cache.**
>   `Recipe.dictionary()` (sync; `DocumentNotResidentError` if the lazy
>   `RecipeCatalogue` is not resident) is what `BlendIdentity`, `ThermalDose`
>   and `Archetype.effectiveRows` read; `Recipe.loadDictionary()` is what the
>   restore doors return for the applier to await — `Crafted.setRecipe` (now
>   returns the load), and two new restore setters on `Bulkable`,
>   `setInteriorPayload` / `setSurfacePayload`. `ArchetypeCatalogue.onCreate`
>   loads the recipe dictionary first (an industry archetype derives from it).
>   The recipe and archetype catalogues' `ensureCache` throw instead of
>   reading as empty; ⚠ `BlueprintCatalogue` keeps its empty cold read (the
>   studio's resolve surface answers null), corrected at W7.
> - The three boot lines went (85 → 82). Lazy = reached only through
>   `StuffApi.singleton`, whose `onCreate` warms (`survey` now awaits it).
> - `DocumentCache` + `DocumentNotResidentError` landed; `Aroma` keeps its own
>   parent-walking `ensure` and stores into the shared cache. The go-live
>   calls `DocumentCache.invalidate(kind, paths)` for every kind.
> - `wordFailures` is `storeWordFailures` (one `$in` read per kind) beside the
>   install-set check, run by both `install` and `sync`. `lint:typed-words`
>   added (proved red on a planted twin). `check-untitled-paths` derives its
>   dirs; census (g) gains `offeredRecipes`.
> - Found and fixed on the way: `trade-dairying`'s row fixture still read
>   `smells[].word` (a !541 leftover); `trade-mining`'s archetype test asserted
>   the cold "authored residue" floor D7 forbids — it now asserts the throw.

### W2 — the press reads by key (D5)

- `PressLogic.archiveImpl`, `DocumentLogic.callUpImpl`, `PressBoard.warm` →
  `findByKey` (D5). `check-whole-table` sees no `.find/.filter` after a
  whole read in the press any more.
- Tests: `PressLogic.archive.test.ts` asserts the query shape (`max: before`,
  `order: desc`, `limit`) and the page filter; `PressBoard` window test over
  the two bounded reads.
- Commit: `build(documents W2): the press reads newest first by key`.

> ✅ **W2 done (build).** `archiveImpl` is one ordered `findByKey` on
> `publishedAt` (`max: before − 1`, `order: desc`, `limit × 4` over-fetch —
> realm/kind/retraction filter the page); `loadImpl` reads `keys.releaseId`
> (a third release key, added for that reader); `callUp` searches the newest
> 200 by word; `PressBoard.warm` is two bounded reads (`pinned` eq true, the
> newest window ×4). No `listOfKind('release')` remains in the press. Test
> fakes use the shared `findDocuments` (cards derived for hand-inserted rows).

### W3a — path-cited families → documents: DirtKind, PumpMechanism, Joint, Form (D6, D7, D15)

No typed word, no sync-primitive hazard. Per family, the D6 recipe, the
D18 codemod and the D7 mechanisms: `lib/cleanliness/DirtKind.ts` (path
constants for the ~25 kernel literals; `SoilableMixin.onCreate` ensures the
kernel's dirt kinds; `deposits`/`stains` restore through an awaited setter;
`soil()` and `dirtKind()` use `require`; the four `dust` sites in
`trade-mining`/`trade-quarrying`/`trade-textiles` await `DirtKind.ensure`
in their own async acts — the `dust` defect closes because
`/trade/mining/dirt/dust` is a path a pack owns), `lib/pump/PumpMechanism.ts`
(`mechanism` setter awaits `ensure`; `mechanismRow` → `require`),
`lib/craft/Joint.ts` (`JointCatalogue` deleted; the bill's `joints` setter
and `JointState.method`'s setter await `Joint.ensure`; `Rope.onCreate`
ensures `KNOTS`; `Assembled.jointRow` → `require`), `lib/craft/FormSpec.ts`
`Form` (`forms` setter awaits `ensure`; `formWords` → `require`). Delete the
four Idea classes. Lints: census (g) fields, `check-bills`,
`check-capabilities`, boundary-roles ceiling, field-meta golden. Tests: the
surveyed test files per family (`Soilable`, `Wash`, `Pumping`, `PumpReading`,
`Assembled*`, `CraftingLogic.assembly/fit/mend`, `Rope*`, `ShapeController`,
`shape.test.ts`, `blowpipe-forms`) move to document fixtures
(`DocumentCache.remember`), plus the D7 proof tests for each family:
clone-then-`require`, materialize-then-`require`, host-default-then-`require`,
and the negative `DocumentNotResidentError`. Commit:
`build(documents W3a): dirt, pump mechanisms, joints and forms are documents`.

> **W3a progress (build).** Done so far — pump mechanisms (`f77215657`),
> forms (`b81f29b25`), joints (this step). Decisions on the way:
> - The value-class door is named **`need(path)`**, not `require` —
>   `lint:imports` reads a `require(` declaration as a dynamic require.
>   `DocumentCache.need` / `<Family>.need` throw `DocumentNotResidentError`.
> - A reusable row-move codemod (lift `data`, drop `class`, write under
>   `content/<dir>/`, rewrite every citation of the old template path) ran
>   per family; it lives in the build's shell, per D18.
> - Census clause (g) gains `SHARED_FIELD_NAMES` — a field name another
>   family uses for a WORD (`mechanism: microbial` on a maturation profile,
>   a potter brain's `forms: [mug]`) is checked only where it holds a path.
> - **Joints:** `JointCatalogue` and the Idea class are deleted; bills name
>   `method: <root>/joints/<key>`; `AssembledMixin.setBill` validates and
>   assigns synchronously and RETURNS the joints' load (the applier awaits
>   it — tests that never await still see the bill), plus a `setJoints`
>   restore door; `jointRow` is `Joint.need` (no defaults). Rope ensures its
>   knot in the act that ties it (`Joint.ensure(KNOT_ROOT + word)`) — knots
>   are only read asynchronously, so no `onCreate` is needed. `check-bills`
>   indexes joint documents (an optional parameter for its tests);
>   `check-capabilities` reads `/content/joints/`. Test fixture
>   `lib/craft/__tests__/joint-fixtures.ts` (`rememberShippedJoints`,
>   `rememberJoint`).

### W3b — typed-word families with async readers → documents: Operation, HelpConcept, CombatFormation (D3, D6)

`lib/vitals/Operation.ts` + `Operation.all()` (`OperationCatalogue` deleted;
`OperateController` reads the kind); `lib/help/HelpConcept.ts` + `seeAlso`
paths (`HelpCatalogue.loadConceptTopics` reads `listOfKind('help-concept')`);
`lib/combat/Formation.ts` + `DEFAULT_FORMATION_PATH`; `Party.onCreate` and
`formationPath`'s awaited setter ensure the party's formation (so
`PartyLogic.setFormationImpl` resolves the word with `Formation.byWord` and
writes a resident path; a restore awaits it); `CombatLogic.resolvePolicyFor`
→ `Formation.require(party.formationPath)` for a party, and `DEFAULT_POLICY`
**only** for a combatant with no party (the no-formation case, not a cold
case); `assignRoleImpl` reads a resident formation and can no longer answer
`unknown-role` for coldness; `warmFormationsImpl` goes (nothing to warm —
every party is resident with its formation). Three typed-word kinds declare
`words`. Delete the three Idea classes. Tests per the survey plus the D7
proof tests.
Commit: `build(documents W3b): operations, help concepts and formations are documents`.

> **W3a dirt + W3b (build).**
> - **Dirt** (`lib/cleanliness/DirtKind.ts`, `DirtKinds` path constants):
>   a dirt is named by path everywhere — deposits, stains, a recipe's
>   `soils[].kind` (SoilSpec now refuses a bare word), the ~50 kernel/pack
>   literals. `SoilableMixin.onCreate` awaits `DirtKind.ensureKernel()` (one
>   prefix read; a no-op when every kernel kind is resident); `setDeposits` /
>   `setStains` are restore doors — the persisted field formerly named
>   `setDeposits` (the SET deposits) is renamed `fixedDeposits` to free the
>   applier's `set<Field>` name. A pack's own kind (`/trade/mining/dirt/dust`)
>   is loaded by the act that lands it (`WorkedActController`, `hew`,
>   `scutch`). Prose speaks a dirt's word (`DirtKind.wordOf`) — the cleanliness
>   reading and `sweep`. A tap's apron splash is only a dirt the kernel ships
>   (`DirtKind.has`). The `dust` latent defect closes.
> - **Operations** (`lib/vitals/Operation.ts`): `Operation.all()` is the lazy
>   dictionary `operate` reads; `OperationCatalogue` deleted.
> - **Help concepts**: no value class (P1) — `HelpCatalogue` is the one reader
>   and reads `listOfKind('help-concept')`; a concept's word is its leaf;
>   `seeAlso` cites paths (census (g)).
> - **Formations** (`lib/combat/Formation.ts`): `DEFAULT_FORMATION_PATH` is
>   `/platform/formations/default`; a party that never chose fights by
>   `DEFAULT_POLICY` (no `Party.onCreate` — the on-create ratchet), a chosen
>   one is loaded by its setter (`setFormationPath` asserts `need`),
>   `materializeParty` loads a restored party's, `party adopt <word>` resolves
>   through `Formation.pathOfWord` (resident-first, then `keys.word`);
>   `resolvePolicyFor` returns `DEFAULT_POLICY` only for a combatant with NO
>   party, else `Formation.need` — `warmFormationsImpl` is gone.
>   `DocumentCache.byWord` now returns `{path, value}` and answers from a
>   resident leaf first (a word is unique at install).
> - **Test bootstrap** keeps the kernel's `dirt` and `formations` documents
>   resident (`rememberKernelDocuments`), standing in for the installer the
>   way `registerSources` does — a suite has no store, and every Soilable
>   host and party loads its share in `onCreate`.
> - The row-move codemod now dumps multi-line strings as `|` blocks (the
>   concept bodies had been flattened to escaped scalars; re-dumped).

### ⚠ W4 — the two families beneath synchronous primitives: Placement and Topic (D12, D13)

Isolated on purpose; if the premise fails, this wave is re-planned alone.

- **Placement** (D12): `lib/spatial/Placement.ts` (`ON/IN/FROM`, `ensure`,
  `require`, `wordsOf`); `PlacementCatalogue` **deleted** with its boot line;
  `Placing.setPlacements` becomes async and awaits `Placement.ensure` per
  path; `PlacingMixin.onCreate`, `ContainerMixin.onCreate` and `Chamber`
  ensure their built-in placements; the `PersistableLogic` placement pass
  awaits `Placement.ensure` per restored `ContentPlacement`;
  `ContainmentLogic.placeOn`, `Containable.getEnclosingScope`,
  `PlacementOffers`, `Placing.canPlace/wordsFor/resolvePlacement` and the MQL
  `placed` projection call `require`; the word is resolved against the host's
  own documents; 14 rows + 3 code defaults + 3 literals → paths;
  `ContentPlacement` persists the path; `check-placement-words` follows the
  rows. ⚠ `ContainerMixin.onCreate` gaining an `await` is the widest change (✅ owner, 2026-11-09: *"generally content enters the game room by room so this makes some sense"* — measure and record, no further sign-off needed)
  in the build — the build measures boot time before and after (one cache
  hit per container after the first).
- **Topic** (D13): `lib/message/Topic.ts`; `TopicCatalogue` over `Topic`
  documents, lazy, boot line removed, `pruneRetiredRoots` deleted,
  `validatePackTopics` over the kind's files; `Scene.send()` queues dispatch
  in order behind `TopicCatalogue.warming()` while cold and flushes the queue
  when it resolves; `Avatar.buildWelcomePayload` awaits the same warm;
  `isCommunicative`/`feedsFor` throw `DocumentNotResidentError` on a cold read
  (unreachable through `Scene.send`); `check-topic-keys` `TOPIC_SEEDS` from
  `content/platform/content/topics/`; `ORPHAN_DATA_KEY_CEILING` lowered.
- Boot entries −2 (`PlacementCatalogue`, `TopicCatalogue`) → ceiling 80.
- Tests: `PutController`, `Dry`, `Containable`, `Chamber`, `Seasoning.chamber`,
  `perception.can-reach` on document fixtures; the D7 proof tests for
  placement (a Placing host, a Container and a restored placed item are
  resident with their placements before any read; `require` on an unloaded
  path throws by name); `TopicCatalogue*` tests over documents; a
  `Scene.queue.test.ts` (three scenes sent on a cold fixture arrive in order,
  all classified correctly, none lost; a scene sent after the warm is
  delivered synchronously as today).
- Commit: `build(documents W4): placements and topics are documents, resident by construction`.

> ✅ **W4 done (build).**
> - **Placements** (`lib/spatial/Placement.ts`, `ON`/`IN`/`FROM` paths,
>   `ensureKernel`, `getPrimaryWord`): `PlacementCatalogue` and the
>   `ContainmentApi.placement*` statics are deleted. `Place.onCreate` loads
>   the kernel placements (not `ContainerMixin`/`PlacingMixin` — one host
>   keeps `lint:on-create` from rising); `PlacingMixin.setPlacements`
>   returns the load; the persistence restore pass ensures. Rows'
>   `placements:` cite paths.
> - **Topics** (`lib/message/Topic.ts` replaces `TopicCatalogue`): `warm`,
>   `warming`, `install`, `invalidate`, `descriptor`, `snapshot`. D13's queue
>   is `Scene.send`'s ordered `QUEUED` list, drained in order when the warm
>   lands; `MessageApi.topicsWarming()` lets the avatar's welcome await it.
>   The installer calls `Topic.invalidate()` on a topic change;
>   `validatePackTopics` reads topic documents. The test bootstrap installs
>   the shipped topics.

### W5a — the Ideas that stay Ideas, by path: Spell, Corpo/Brand, Government (D9, D10)

`SingletonMixin` + eviction veto on the four classes; descriptor coercion onto
setters/`onCreate`; `carriedSpellPath`/`teachesSpellPath` →
`ref: 'identity:constituent'`; `_brandKey → brand`, `corpoKey → corpo`, Brand
`owner`/`rivals`, `_governmentKey → government`, `flag`, ShipRegister/Brand
`government` → paths with the constituent ref (23 content sites +
`authorPicker` on `brand`); sync readers by `findByTemplatePath(path)`;
`SpellCatalogue` → lazy word dictionary (`byName`, `spells` roster);
`CorpoCatalogue` → lazy brand-word dictionary; `GovernmentCatalogue` deleted,
`GovernmentLogic` reads by path; `TemplatePathPrefixes`/`Rosters` entries
removed; `check-template-scans` allowlist updated (Spell 1, Corpo 1 as
`LAZY_DICT`; Government 0); census clause (b) reads the new path fields.
Boot entries −3 → ceiling 77. Tests per the survey (`SpellCatalogue`,
`MagicLogic`, `Caster.*`, `CastController`, `StudyController`, `library.test`,
`CorpoCatalogue`, `CorpoLogic`, `Branded`, `Creature.branded`,
`livestock-branded`, `GovernmentCatalogue` → deleted, `GovernmentLogic*`,
`Locality.government`, `Ship.register`, `Authority`). Commit:
`build(documents W5a): spells, corporations, brands and governments load when something reaches them`.

> ✅ **W5a done (build).** Narrowed from the plan, recorded (lens 2 — the
> requirement is *load on reach*, not *cite by path*): bare keys stay, the
> three catalogues stay as lazy dictionaries (`GovernmentCatalogue` kept),
> no constituent refs. `CorpoApi.ready()`, `GovernmentApi.ready()`,
> `MagicApi.ready()` stand them up; their logic's `catalogue()` throws
> `DocumentNotResidentError` when cold. Residency by construction:
> `_brandKey` → `brand` so `Branded.setBrand` can return the brand load
> (plus the government's when the brand names a polity);
> `Locality.setGovernmentKey`, `ShipRegister.setGovernment`,
> `Arcane.setCarriedSpellPath`, `Spellbook.setTeachesSpellPath` return
> theirs; `Avatar.enter` awaits `MagicApi.ready()` for a caster. Boot
> entries −3 → 77.

### ⚠ W5b — disciplines load when a character reaches them (D11)

`SingletonMixin` + veto on `Discipline`; coercion onto setters;
`DisciplineCatalogue` → the lazy `key → {path, hasStock}` dictionary (one
`findByClass` on first use, `LAZY_DICT`), standing Ideas up on reach;
`AdvancementMixin.onCreate` warms the dictionary and stands up the
stock-bearing disciplines (D7 §4); the transcript's restore runs through an
awaited setter that stands up every discipline it cites, and a conferral at
runtime has the discipline in hand; `withConditioning` and the digest read
resident Ideas with `findByTemplatePath` and throw `DocumentNotResidentError`
on a miss (no cold digest); `Employed.fulfils` reads `getSpecializes()` off a
resident Idea (a position's `fulfills:` setter awaits the stand-up, so a
business is live only when its disciplines are); `refreshConferrals` keeps
the catalogue as command source. Boot entry −1 → ceiling **76**. Tests:
`DisciplineCatalogue`, `Discipline`, `Advancement.conditioning/conferral`,
`isFulfilling.specializes`, plus the D7 proof tests (a materialized character
has its transcript's disciplines and the stock-bearing ones resident before
any digest; a business with `fulfills:` has them resident after clone).
Commit:
`build(documents W5b): disciplines load when a character reaches them`.

> ✅ **W5b done (build).** Narrowed like W5a, recorded: the dictionary keeps
> the descriptors it already reads in its one `findByClass` (stock,
> conferrals, specializes), so no per-discipline Idea is stood up — the
> data is the same and the stand-up would be one live Stuff per discipline
> for nothing. Never booted (boot entries 76; `check-template-scans` lists
> it `LAZY_DICT`). The reach: `Advancement`'s async readers
> (`bandsForImpl`, `conferredVerbsImpl`, `competenceBandFor`,
> `refreshConferrals`) load it first, so the sync digest — which only has
> rows after `bandsForImpl` ran — and `withConditioning` read a resident
> dictionary; the craft act loads it before a discipline-carrying
> `isFulfilling` walk. Cold reads throw (`DisciplineCatalogue.ensureCache`,
> `catalogue()`, `Employed.fulfils`). `refreshConferrals` now skips a host
> with no command stack explicitly (it used to by accident, through the
> cold early return). Fixture: `lib/advancement/__tests__/discipline-fixtures.ts`
> (`rememberDisciplines`). Also fixed: `GovernmentLogic.flagship` built its
> localities before their government dictionary stood (an unhandled
> rejection from W5a's setter load).

### W5c — one readiness routine for every Api (owner, at review)

> ✅ **W5c done (build).** The owner, reading the MR: *"what's readying all
> these APIs — we should have some standard initialization routine that
> all Apis go through instead of these individual hooks."* Every per-Api
> door (`CorpoApi.ready`, `GovernmentApi.ready`, `MagicApi.ready`,
> `HelpApi.ready` — the last one already on master — `Recipe.loadDictionary`,
> Advancement's `loadDisciplines`) was a one-line wrapper around
> `StuffApi.singleton(path)`. Now:
> - **An Api declares what its reads stand on:** `static readonly needs =
>   [TemplatePaths.corpoCatalogue]` (Corpo, Government, Magic, Help).
> - **The Api gate does the rest, for every Api:** `decorateApiClass`
>   makes each ASYNC static await its Api's `needs` before forwarding (a
>   late-bound loader registered in `installFrameworkWiring`, the ShadowApi
>   pattern — `security.ts` cannot import `StuffApi`). A sync static is
>   untouched: it cannot wait.
> - **One door for the sync reach:** `StuffApi.ready(...needs)` takes an
>   Api (its `needs`) or a path. Setters return it; acts await it.
> - **Never at boot** — still load on reach; this only unifies how.
> - ⚠ `needs` is per Api, so it is coarse: `MagicApi.relocationCost` (async)
>   now loads the spell dictionary though it reads no spell — one load, on
>   reach. Caster reaches MagicLogic directly (not through the Api), so the
>   three casting impls call the door themselves.
> - Topics stay their own mechanism (D13's queue is not a singleton).
> - `HelpApi.ready` used to swallow a failed load (`.catch(() => null)`);
>   the door refuses loudly. Test: `lib/security/__tests__/ApiNeeds.test.ts`.

### W5d — the catalogues come back (owner, at review)

> ✅ **W5d done (build).** ⚠⚠ **D6 was wrong, and the build made it worse.**
> D6 put each family's lookups on its value class as statics backed by a
> `DocumentCache`; when `lint:lib-statics` went over at W1, the build tagged
> those classes `@internal` — the lint's escape for *no author calls this*,
> taken without the caller audit it requires (DirtKind, Operation and
> Aroma had pack-author callers; every family is global vocabulary). Then
> it deleted the catalogue singletons, and `COMMONS_CEILING` falling
> 27 → 23 was reported as progress. The owner: *"this is why we have
> singletons that actually serve this stuff … structure and
> discoverability — but you axed that stuff."* Now:
> - **One catalogue singleton per family** at `/platform/idea/<X>Catalogue`
>   (commons), **reached through its domain Api**: `CraftingApi.joints()` /
>   `.forms()` / `.recipes()`, `ContainmentApi.placements()`,
>   `MaterialApi.dirtKinds()`, `PartyApi.formations()`,
>   `ConditionApi.operations()`, `BulkableApi.pumpMechanisms()`,
>   `MessageApi.topics()`, `PerceptionApi.aromas()` (master's `Aroma` statics
>   were the template copied — folded too).
> - `lib/document/DocumentCatalogue` is the substrate the per-path families
>   extend (instance doors; the per-kind memory a hard-private static slot so
>   a re-stood catalogue reads the same memory); a family's parse is the
>   catalogue's `parse`, which the installer validates through. Topic and
>   Aroma are Ideas of their own shape (a warmed vocabulary; a parent walk).
> - Value classes keep only what the thing IS: no statics, no `@internal`.
>   Path constants are exported objects (`Placements`, `DirtKinds`,
>   `DEFAULT_FORMATION_POLICY`, `AROMA_PATH_SHAPE`).
> - `DocumentCache` deleted. The go-live (installer, CMS save) forgets
>   through `DocumentApi.catalogueFor(kind)`, which reads the `catalogue:`
>   path each kind declares in `DocumentKinds` — never by importing every
>   domain Api into the document store.
> - ⚠ Import cycles found on the way: a catalogue module must stay light —
>   it reaches `DocumentApi`/`DiagnosticApi` by a deferred `import()` in its
>   async paths, because an Api serving it may sit on `Visible`'s import path.
> - Gates: 58 `@internal` lib statics gone (267 → 209 counted separately);
>   public lib statics unchanged at 340; `COMMONS_CEILING` 23 → 30 with the
>   caller audit in the constant's comment; every other gate unchanged.

### W6 — the aroma library in directories (D14)

Late and mechanical so a rebase onto material decomposition is a re-run of
the mapping, not a merge by hand. `Aroma.ensure` folder-parent derivation;
`lint:aromas` folder rule + `KERNEL_AROMAS` paths; the 89 moves (git mv), the
89 `parent:` removals, the 417-file citation rewrite (the mapping is `old →
new` for the 89 children; a depth-2 child's new path is
`/base-library/aromas/<grandparent>/<parent>/<child>`), the four kernel
literals, the test fixtures. The kernel's own aroma citations become
resident with their hosts (D7 §4): `FreshnessMixin.onCreate` awaits
`Aroma.ensure(ROT_AROMA)` and the corpse's arc (`MortalArc`/`Corpse.onCreate`)
awaits `blood` and `decay`, so `Freshness.rotNote()` and `decayNote()` read a
resident aroma; the nose's `settling()` wait stays for the loads it starts
itself. `docs/subsystems/senses.md` § aromas updated. Tests: folder-parent
derivation; the lint's folder rule (an explicit `parent:` equal to the folder
parent is refused; a cross-pack one is allowed); a fresh `FreshnessMixin`
host and a fresh corpse have their aromas resident before any read. Commit:
`build(documents W6): the aroma folders are the tree`.

> ✅ **W6 done (build).** Rebased first: master merged in (`8e85150f4` —
> material decomposition and broadcast-ready; ceilings combined, boot 75,
> duck 533; the broadcast build's three document kinds take no
> `naturalKey`). Then the mapping: 89 children moved by `git mv` into
> their parents' folders (9 at depth 2 — `decay` now lives at
> `rot/decay`), every `parent:` line removed, 243 citing files rewritten
> by a boundary-aware `old → new` replace (kernel literals in
> `MortalArc` and `check-aromas`'s `KERNEL_AROMAS` included).
> `Aroma.ensure` takes `data.parent ?? Aroma.folderParentOf(path)`;
> `lint:aromas` gains the folder rule (a directory must itself be an aroma;
> a same-pack `parent:` is refused — move the file; a `parent:` beside a
> parent folder is refused). ⚠ Decided, not as planned: **no
> `FreshnessMixin.onCreate` / corpse-arc ensure.** The kernel's aromas are
> cited as notes (`{aroma, ou}`) and only the nose reads the aroma itself,
> and it already loads on read and waits (`Aroma.settling`) — so an
> `onCreate` on every provision would be an async per host for a shared
> cache, against the `lint:on-create` ratchet, buying nothing a reader
> lacks (P7: load on use is already true).

### W7 — the drive and the walk

`packages/wire/tests/documents-path-identity.dirty.wire.test.ts` and
`e2e/tests/documents-path-identity-walk.spec.ts` (D17); subsystem docs
(`document-store.md` — the card, `findByKey`, the index, the kinds table;
`content-packs.md` — `words`, the store claimant; `senses.md`; `topics.md`;
`spatial.md` § Placement; `assembly.md`; `cleanliness.md`; `press.md`;
`advancement.md`; `magic.md`; `corpo.md`; `civics.md`); the MR opens READY at
code-complete and the drive runs beside review. Commit:
`drive(documents): the path-identity drive and walk`.

## Reachability wiring

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| find by key (press) | `press` (existing), REST `/api/press/archive` | none new | `release.keys.publishedAt/pinned` derived by the hook | the index planned from `documents.yaml` at boot; a `NOT built` line is the failure | `before` numeric, `limit` ≤ 100 (existing) |
| typed-word uniqueness | `pack sync` / boot | `requiresPackInstaller` (existing) | `keys.word` on every typed-word document | the install set + the store query | n/a |
| emote by word | any unmatched verb (`smile`) | `CommandGiver._runChain` → `SoulApi.resolve` (existing) | `/expression/emotes/<verb>` | `SoulCatalogue.ensureCache` on first use (existing) | n/a |
| recipe by word | `carve`, `make`, menu `order` | the station's `offeredRecipes:` paths / the bench | recipe documents + `keys.word/output` | `RecipeCatalogue.ensureCache` awaited by `requireCatalogue`; a payload restore starts `Recipe.resolve` | `recipeId` arg → word (existing) |
| `survey` archetypes | `survey` | existing | archetype documents | `ArchetypeCatalogue` awaited in `execute` | n/a |
| `shape <form>` | `shape` | the instrument's `forms:` paths | form documents | `FormingMixin.formWords` awaits `Form.ensure` per path | word matched against the holder's list (existing) |
| `put X on Y` | `put`, `dry` | `PlacingMixin` (existing) | placement documents; `placements:` paths | the host's `placements` setter and `PlacingMixin`/`ContainerMixin.onCreate` (D7 §4); the restore pass awaits `ContentPlacement`; `require` at the read | `prepositions:` on the view (existing, `lint:placement-words`) |
| `pump` ceiling | `pump` | existing | pump-mechanism documents; `mechanism:` paths | `PumpingMixin.mechanismRow` awaits `PumpMechanism.ensure` | n/a |
| `operate … for <word>` | `operate` (trade-medicine) | existing | operation documents | `Operation.all()` at the verb | word matched against the kind (existing) |
| `fit` with a joint | `fit`, `tie` | the bill's `method` paths; `Rope.KNOTS` paths | joint documents | the bill's `joints` setter awaits `Joint.ensure`; `JointState.method` restores through its setter; `Rope.onCreate` ensures its knots; `Assembled.jointRow` → `Joint.require` | n/a |
| `party adopt <word>` | `party adopt`, `party assign` | existing | formation documents | `Formation.byWord` at the verb; `warmFormationsImpl` at initiate | word shape regex (existing) |
| `help <concept>` | `help` | existing | help-concept documents; `seeAlso` paths | `HelpApi.ready()` (existing) | n/a |
| message topics | every scene | n/a | topic documents | the pipeline's own queued warm (D13, the engine-machinery exception); login awaits the same warm | `lint:topics` totality |
| `cast <word>` | `cast`, `spells` (arcana) | `Caster.refreshCastingAffordance` (existing) | Spell rows (Ideas) | `SpellCatalogue` lazy dictionary → `singleton(path)`; a wand's `carriedSpellPath` is a constituent | word → path (existing) |
| `competence` | `competence` | existing | Discipline rows (Ideas) | the character's `Advancement` loads its disciplines at arm; the dictionary on first use | n/a |
| `government` | `government` | existing | Government rows (Ideas) | the Locality's `government` constituent | n/a |
| branded `look` | `look` | `Branded` (existing) | Brand/Corpo rows | the good's `brand` constituent | n/a |
| `smell` depth | `smell`, `taste`, `analyze` | existing | aroma documents in folders | `Aroma.ensure` through the setters (existing) + folder parent | n/a |
| install a twin aroma / refuse a twin emote | `eval PackApi.sync(id, root)` (drive) | founder's `eval` | the fixture packs | the installer | n/a |

Each link that is **new** this build is in the *load* column; every other
column is the shipped wiring the survey verified.

## Acceptance-criteria coverage

| requirements AC | wave(s) |
|---|---|
| a fresh world boots with every pack; every drive step reads as written before and after a restart | W7 (steps 0, 20); every wave's own acceptance; ⭐ the **D7 proof** — per-mechanism tests in W3–W6 and a server log with no `DocumentNotResident` on the fresh boot or after the restart |
| no document shares its path with another | W0 (unique `{path}`; `dbKeyQuery` by path) |
| every citation names a path a pack ships; a misspelled one is caught before merge | W1, W3a/b, W4, W5a (citations), D15 lints (`lint:census` (g)/(b), `lint:aromas`, `lint:bills`) |
| two packs ship the same name under their own roots and both are found; two packs claiming one typed word are refused, naming both | W1 (`wordFailures`, `lint:typed-words`), drive step 19 |
| any kind found by a declared key by equality, range and order; the press newest first | W0 (`findByKey`, the index), W2 (the press), drive step 18 |
| none of the converted families can be found or targeted by MQL as a thing | W3a/b, W4 — the Idea classes are deleted; the census refuses a straggler row |
| no catalogue of the thirteen named families is loaded at startup; each is there when reached | W1 (−3), W4 (−2), W5a (−3), W5b (−1), plus Operation/Joint/Help never booted; `lint:boot-entries` ceiling 76 |
| an aroma's folder determines its parent; the nose's depth is unchanged on shipped content | W6; drive step 1 |

Nothing unmapped. The non-goals (the five material-adjacent families,
Material/Biome/Condition/Address, `MATURATION_MECHANISMS`, the two meanings
of *archetype*, `release`'s vanish policy, the `blueprints` collection) are
untouched and their slates named in § Deferred seams.

## Test & gate strategy

**Unit** (per wave, `test:near` + touched packs): the derivation and hook
(W0); the install word check against set and store (W1); `DocumentCache`
(`ensure`/`require`/`byWord`/`invalidate`) and the press query shape (W1/W2);
each value class's `fromData` refusals (W3–W5); **the D7 proof tests per
mechanism per family** — clone-then-`require`, materialize-then-`require`,
host-default-then-`require`, and the negative `DocumentNotResidentError` —
(W3–W5); the ordered scene queue (W4); `Aroma` folder-parent derivation,
the lint's folder rule, and the kernel aroma literals resident with
`FreshnessMixin`/the corpse arc (W6). ⚠ Index selection, the unique
path index and boot-order effects **cannot be unit-tested** (tests touch no
Mongo); they are W0's `explain` check and the drive.

**Lint**: `pnpm -C packages/server lint:family` every wave; the gates named
in § Convention conformance; ceilings move only down (`BOOT_ENTRY_CEILING`
85 → 76 across W1/W4/W5; `TEMPLATE_SCAN_CEILING`, `COMMONS_CEILING`,
`ORPHAN_DATA_KEY_CEILING` as computed at each wave).

**The blocking drive** — every step `instant` and asserted as a `player`
unless tagged; no span steps, so no soak drive and no staged twins owed:

| step | pace | assertion | where |
|---|---|---|---|
| 0 | staged | drop + boot; the boot log has no `index … NOT built`, every pack `installed`; `explain` of the press shape recorded | wire boot + `WIRE_SERVER_LOG` |
| 1 | instant | tannery yard `smell` names the yard's words; a trained tanner (staged competence through the harness's conferral seam) reads a deeper word, and that word's path lies **under** the shallower one's folder | player |
| 2 | instant | a sweat-soaked shirt (staged `soil` through `eval`) — another's `smell` names stale sweat | player |
| 3 | instant | `smile`, `agree` | player |
| 4 | instant | `carve <word>` at a bench | player |
| 5 | instant | `survey` in a bedroom lists met and unmet archetypes | player |
| 6 | instant | `enroll` suggests a name | player (char-gen flow) |
| 7 | instant | `help <concept>` | player |
| 8 | instant | `shape mug` at a wheel | player |
| 9 | instant | `put X on <shelf>`; `look` shows it there — the **first** `put` of the boot is this one, on purpose | player |
| 10 | instant | `pump` on a hill reports its ceiling in words | player |
| 11 | staged | a wound staged by `eval`; `operate … for <word>` | staged |
| 12 | instant | `fit` two parts with a bill naming a joint path | player |
| 13 | instant | `party adopt vanguard`, `party assign <role> <who>` | player |
| 14 | instant | `cast <known spell>` — and the boot log carries no `SpellCatalogue` line before this step | player |
| 15 | instant | `competence` lists disciplines by name | player |
| 16 | instant | `government` in a locality | player |
| 17 | instant | `look` at a branded good shows the brand | player |
| 18 | short | publish two releases a game hour apart (clock jump of one hour between); `press` lists the later first; REST `/api/press/archive` the same | player + REST |
| 19 | staged | `eval PackApi.sync('twin-aromas', <tmp>)` installs; both `smoke`s read; `eval PackApi.sync('twin-emote', <tmp>)` is refused naming `expression` and `twin-emote` | staged |
| 20 | instant | `restartWorld()`; steps 1, 3, 5, 14, 18 re-read the same | player |

**B2 before trusting green**: each checkpoint is made to fail once (a wrong
word, a missing path) and the failure named in the drive record.

**The browser walk** `e2e/tests/documents-path-identity-walk.spec.ts`: a
person types `smell`, `smile`, `shape mug`, `put … on …`, `help <concept>`,
`government`, and reads the press ticker — the forms parse and the cards
render in words. Runs once at code-complete beside the drive.

`pnpm test` runs exactly twice: before the MR and at `/finalize`.

## Risks & opens

1. **The wildcard index may not serve the ordered read** on the deployed
   planner. Bounded by W0's `explain` check and D2's named fallback; the
   build decides at W0 and records it. Not a stop.
2. **The by-construction claim has a coverage edge**: a runtime write that
   sets a document-citing field from a path **not** obtained by resolving a
   document (a literal the survey missed, a pack's own kind soiled without
   its `ensure`) throws `DocumentNotResidentError` at the setter. Intentional
   and loud, but a throw in a brain or a scheduler path surfaces in the drive
   as a dead act. Before committing W3a/W4 the build greps every
   `ContainmentApi.move(` with a third argument, every `soil`/`soilFrom`
   literal, every `formationPath`/`method`/`recipe` writer, and lists them in
   the wave's acceptance as covered by mechanism 3 or 4.
3. **The ordered scene queue** (D13) changes timing for the first scenes of
   a process only; a unit test asserting synchronous delivery of the first
   scene in a cold fixture must pre-warm (`Topic.remember`) — the
   fixture-warm shape every modality test already uses. If the queue proves
   awkward, the named alternative is `BootstrapManager` awaiting
   `TopicCatalogue.warm()` before the first session can connect — not a
   `boot:` entry but still engine wiring. ✅ The owner chose the queue
   (2026-11-09); switching needs a re-plan line in the MR.
4. **`BlueprintCatalogue.rebuild()` at first studio use** — a seconds-long
   first request, and class modules loading under a request rather than at
   boot. If the studio's first request times out in the walk, the honest
   answer is the tiering slate's (the `blueprints` cache should not persist),
   not a boot entry.
5. **An awaited `ensure` in `ContainerMixin.onCreate`** is one more awaited
   promise on the widest host in the game. After the first container it is a
   resolved cache hit, but the build measures a cold boot before and after W4
   and records the delta; a measurable regression means the IN placement
   should be ensured by `PlacementOffers`' first construction instead, which
   is still the host's own path.
6. **Material decomposition** rewrites the same material files W6 touches.
   W6 is last and scripted so a rebase is a re-run; if build-1 merges first,
   `check-aromas.ts:177` already has their `Odor`/`Combustion` split and the
   folder rule lands beside it.
7. **A worktree database that predates W0** holds the non-unique `path_1`
   and the four natural-key uniques; the unique path index fails to build
   and is logged. Drop and boot (no migrations). The four stale uniques are
   harmless and vanish with the drop.
8. **`depositKey(site, kind)`** — a dirt path contains `/`; the key's
   separator must not. Checked in W3a before the persist shape changes.
9. **Build-time stops** — none expected. A new module category, a new
   `eslint-disable`, a new collection: none is needed; the compliant path
   exists for every piece above.

## Deferred seams

Clean attach points, each with the slate it leaves as:

- **The five material-adjacent families** (Cleanser, MaturationProfile,
  FractionSchedule, Fabric, Dyestuff) — the D6 recipe applies unchanged once
  material decomposition merges; `documents-path-identity-slate` stays
  **PARTIAL** for them, and the slate's § 4 table is the to-do.
- **Discipline keys as a flat namespace across five roots** — accepted by
  the owner (D11): namespace when a custom discipline needs it; the tree is
  the intended shape. The slate keeps the finding as the attach point
  (`DisciplineCatalogue`'s dictionary already maps key → path), not as a
  defect.
- **`release` → `onVanish: 'keep'`, `descriptor-bank` as a kind, the
  `blueprints` collection cache** — `document-store-tiering-slate` items 2–3
  and the audit; the press index (item 1) is done here.
- **Material / Biome / Condition / AddressRegistry load on use** —
  `scan-sweep-slate` Part 2.
- **`PressBoard`'s `producer` boot entry** — stays because `PressApi.recent()`
  is read synchronously at session entry; its window is two indexed reads
  now. Making session entry await the window is a `connection.md` question,
  not this build's; note it on the scan-sweep slate's booted-wardens list.
- **The two meanings of "archetype"** — recorded in the seeding slate; not
  touched.
- **Keys beyond this build's three declarations** (`recipe.cuisine` and
  friends) — one line on the kind when a reader arrives; no slate needed.

## Critical files

Read first, in this order:

1. `docs/requirements/documents-path-identity-requirements.md` (minus its
   stray tail) and `docs/slates/builds/documents-path-identity-slate.md`.
2. `packages/server/src/mud/lib/document/DocumentKinds.ts`,
   `lib/document/StoredDocument.ts`, `api/document.ts`,
   `platform/idea/api/DocumentLogic.ts`, `platform/idea/hooks/DomainHook.ts`
   + `hooks.yaml`, `backend/PersistenceManager.ts:1421-1600`,
   `src/schema/documents.yaml`.
3. `platform/idea/api/PackLogic.ts:160-215, 860-931, 1700-1760, 2900-2960,
   3530-3590, 3935-3950`.
4. `lib/perception/Aroma.ts` (the pattern), `platform/idea/SoulCatalogue.ts`
   (the lazy catalogue shape), `platform/idea/RecipeCatalogue.ts`,
   `lib/craft/BlendIdentity.ts`, `lib/thermal/ThermalDose.ts:720-750`.
5. `platform/idea/PressBoard.ts`, `platform/idea/api/PressLogic.ts:300-330`,
   `lib/press/Release.ts`.
6. The nine family classes under `platform/idea/` and their readers named in
   Grounding § 6; `lib/spatial/Placing.ts`, `platform/idea/api/ContainmentLogic.ts:82-209`,
   `lib/message/Scene.ts:236-300`, `platform/idea/api/MessageLogic.ts:110-145`.
7. `lib/advancement/Advancement.ts:140-240, 420-560, 700-730`,
   `platform/idea/SpellCatalogue.ts`, `lib/magic/Arcane.ts:170-240`,
   `lib/corpo/Branded.ts`, `platform/idea/api/GovernmentLogic.ts:40-130`.
8. `packages/server/scripts/check-template-census.ts:1130-1200`,
   `check-aromas.ts`, `check-boot-entries.ts`, `check-template-scans.ts`,
   `check-placement-words.ts`, `check-topic-keys.ts`, `check-bills.ts:160-300`,
   `check-untitled-paths.ts:38-50`.
9. `packages/wire/tests/sugar.soak.dirty.wire.test.ts:400-421`
   (`restartWorld`), `packages/wire/tests/agent-coordination.dirty.wire.test.ts`
   (the harness shape), `e2e/tests/paint-walk.spec.ts`.
10. `docs/subsystems/document-store.md`, `content-packs.md` § The boot union,
    `senses.md` § One smell, `docs/lint-family.md` § boot-entries,
    `docs/antipatterns.md` § Searching (or Booting) for What a Reference
    Should Name, § A Stuff whose only job is to hold a record.

## Drive record

`packages/wire/tests/documents-path-identity.dirty.wire.test.ts`, WIRE_PORT
2019, each run against a freshly dropped `saxonberg_build4` (step 0). **Soak
drive: none** (nothing here depends on the clock).

| run | result | what it found |
|---|---|---|
| 1 (2026-11-10, before W5c) | 14/20 | ⭐ **`press` with no headline was refused by its own view** — the fallthrough form's `headline` was `required: true`, though the controller and the help both say bare `press` reads the ticker (a master defect; fixed: `required: false`). The drive's own staging: the lobby read **pitch dark** at night (steps 0, 4 → the drive moves to daylight first); deposits staged by dirt WORD where W3a keys them by PATH (step 2 → staged by path; the smell drive had the same stale staging, fixed too); a cast before the study ended (14). |
| 2 (after W5c) | 19/20 | Step 14 only: the retry matched "occupied" where the refusal says "committed". |
| 3 | 19/20 | Same; fixed. Step 14 re-run alone: ✅. Restart step 20 ✅ in runs 2 and 3. |

⭐ **B2 — each checkpoint can fail:** run 1 turned steps 0, 2, 4, 14 and 18
red for real reasons, and step 20 (the restart) was red with 18; each
checkpoint asserts the sentence, never only "not refused".

**Adapted from the requirements** (recorded in the file header and the MR):
step 6 asserts arrival (the name suggestion rides a structured frame the
harness does not surface); step 10 asserts the depth in words (by design the
pump never names its ceiling — `pump.md`); step 11 asserts `operate` resolves
the operation by name (no route stages a wound); step 12 asserts `fit` meets
no missing joint (`fit` names no joint; the bill does) — ⚠ weak, a follow-up;
step 19 is unit-proved (no route installs a pack into a running world:
`PackLogic.flatkey` / `PackLogic.topics`).

**The walk** (`e2e/tests/documents-path-identity-walk.spec.ts`, real Chromium
against the real client): ✅ first run (16.5 s) — smell at the tannery,
`smile`/`agree`, `help extraction`, `government`, `party form`/`adopt
vanguard`/`disband`, `competence`, `survey` in the dorm. ⚠ Recipe note for
a worktree port: the server needs `CLIENT_URL=http://localhost:<client port>`
(CORS allows only that origin, default 5173), else the client shows the
sign-in page with a valid test session.

**Ceilings as landed:** boot entries 75 (85 at plan; −1 is master's), duck
probes 533, `lint:family` 102 gates green.
