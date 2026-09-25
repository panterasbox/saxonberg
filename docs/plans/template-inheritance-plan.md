# Template inheritance — implementation plan

Executes [template-inheritance-requirements](../requirements/template-inheritance-requirements.md).
**Kind:** feature, **kernel-led**; first consumer is **Dave's Bar**
(`packages/content/saxonberg-lounge/content/world/lounge/location/bar.yaml`)
plus the 45 costumed NPC rows. What is built: a row can name a parent
row (`extends:`), the four list-shaped designation fields gain entry
identity (`as`) and props gain `count`, biome hands its private parent
link to the unified one, exits are always clones of a kind row, the
code-minted objects gain rows, and a class-less row is what a
protowizard may now create. Scope is closed; nothing here reopens it.

Written 2026-09-25 against `origin/master` at `a5e7f4b87` (post-envelope).

---

## Grounding

Facts verified this cycle by opening files. The full survey with line
numbers is in the requirements-phase grounding; what follows is what
the decisions below rest on.

### The row and its readers

- `packages/server/src/mud/lib/stuff/Template.ts` — `abstract class Template
  extends Document`, `collectionName = Collections.Content`, persistent
  fields `path`, `class`, `hydratorClass?`, `data`. `_materialize(doc)`
  (`:82`) is the ONE place a stored doc becomes a `Template`; it picks
  `ZoneTemplate`/`LeafTemplate` by `ZoneApi.isFolderClass(doc.class)`
  and reflects fields via the protected `Document.fromDocument(doc)`.
  Query statics: `findByPath`, `findByPaths`, `findByClass` (a Mongo
  query on the raw `class` field), `findByPathInfix`, `findWhereDataHas`
  (a Mongo query on raw `data.<field>`), `findDescendants`, `loadById`,
  `ancestorPaths`.
- `packages/server/src/mud/lib/persistence/Document.ts:167` `toDocument()`
  and `:215` `fromDocument()` — both walk `getAllFields()` (the
  `fieldMeta` persistent set) and copy by name. Both are `protected`,
  so a subclass may override them. `save()` (`:256`) calls
  `toDocument()` then `PersistApi.save`.
- **66 non-test call sites read `tpl.class` / `tpl.hydratorClass`**
  (grep `\b(tpl|template|t|row|doc|existing)\.(class|hydratorClass)\b`
  over `packages/server/src` + `packages/content/*/src`, minus
  `__tests__`). By file: `CmsLogic` 8, `TemplateLogic` 6,
  `CatController` 5, `api/stuff.ts` 5, `ResidencyLogic` 4, `PackLogic` 4
  (reads YAML files, not `Template`), eight catalogues at 3 each,
  `DyestuffCatalogue` 3, `MvController`/`CpController` 2 each,
  `wiki/components/composition.ts` 2, `Staged.ts` 2, `CdController`,
  `ZoneLogic`, `SandboxLogic`, `ConditionCatalogue`, `AddressRegistry`,
  `AccessRegistry` 1 each.
- **They split into two populations.** Readers that want *what this row
  clones into* (the clone pipeline, every catalogue, zone resolution,
  the designation gates in `Staged.ts`, the wiki component): the
  **effective** value. Readers that want *what the author wrote*
  (`saveTemplate`'s delta baseline, `cp`/`mv`, the CMS read/write
  round-trip, `cat`): the **raw** value. Only the second population
  changes call shape (D1).
- **`findByClass` has 7 call sites**: `DisciplineCatalogue:150`,
  `HelpCatalogue:988`, `SpellCatalogue:149`, `OperationCatalogue:80`,
  `water/FisheryRegistry:353`, `water/WatercourseCatalogue:970`. A child
  inheriting its class is invisible to a raw query. `findWhereDataHas`
  has the same shape (the spawn sweep, `ResidencyLogic:438`).
- `packages/server/src/backend/PersistenceManager.ts:620` — a resident
  `content` cache answers a **bare by-path read with no `options`** from
  memory (`contentCacheEngaged` `:1098`); any save to `Content` drops the
  whole cache. A parent walk is therefore a memory hop; `findByClass` /
  `findByPathInfix` / `{extends: X}` queries go to Mongo.

### The clone pipeline and the hydrator

- `packages/server/src/mud/api/stuff.ts:465` `clone()` → `#cloneInner`:
  `Template.findByPath` → `#validateClassPath(template.class)` →
  resolve/import the class → singleton pre-flight on the identity path →
  `ZoneApi.resolveZoneForPath` → hydrator via
  `singleton(template.hydratorClass)` when present, else **no hydration**
  → construct under the sentinel → stamp zone + `templatePath` (+
  identity) → register → hydrate `{...template.data, ...dataOverlay}` →
  `postRegister(context)`. `opts.asIdentityPath` and `opts.dataOverlay`
  are the minted-identity channel (D17).
- `packages/server/src/mud/platform/idea/persistence/PersistentHydrator.ts:62`
  — Phase 1 property fields (`set<Field>` else bracket-assign, marshaller
  aware), Phase 2 instruction fields (`apply<Field>` **required**, throws
  when missing). Driven by `MixinApi.getAllPersistentFields` /
  `getAllInstructionFields`, both derived from `getAllFieldMeta(ctor)`
  (`api/mixin.ts:767`). A data key that no composed field declares is
  **discarded silently** — the failure invariant 6 of
  `check-instanceable-placement` exists for.
- `packages/server/src/mud/lib/mixin.ts:44` `FieldMetaEntry` — keys:
  `persistent`, `marshaller`, `instruction`, `stackIdentity`, `ref`,
  `lifetime`, `inverse`, `authorable`, `authorPicker`, `runtimeState`,
  `spoiler`, `spoilerName`. `packages/server/scripts/check-field-meta.ts:523`
  `KNOWN_PROPS` mirrors that list and refuses an unknown key; it also
  keeps a golden snapshot (`--snapshot-tags` / `--verify-tags`).
- `ZoneLogic.isFolderClass` (`platform/idea/api/ZoneLogic.ts:94`) loads
  the class through `StuffApi.loadClassByPath` and caches the answer, so
  materializing a row already loads its class.

### The designation lists

- `packages/server/src/mud/lib/stuff/Staged.ts` — `PropSpec = string |
  { template: string; onto: string }` (`:119`; `onto` is REQUIRED in the
  object form today). `StagedMixin` (`:164`, host `Stuff & Container`):
  `props`/`cast` instruction fields, `_propsStaged`/`_castStaged`
  once-flags (persistent, runtimeState). `stageList(specs, kind)` keys
  `placed: Map<path, inst>` by source path, **last wins**; `onto`
  resolves against `placed.get(onto)`; the Behaved gate runs before any
  clone; singleton entries go through `StuffApi.singleton`.
  `CostumedMixin` (`:359`, host `Stuff`): `costume` instruction field,
  `_costumeWorn`, `applyCostume(specs: string[])` — bare strings only;
  gates on `Mixins.Wearable` then delegates to
  `Character.wearGarments(paths)` (`lib/character/Character.ts:220`).
  Composed by `lib/npc/NPC.ts:37`.
- Other `applyProps` implementations: `lib/persistence/Persistable.ts:273`
  retains specs into `_bornWithProps: PropSpec[]` / `_bornWithCast:
  string[]` and replays them once via `seedBornWith`;
  `lib/husbandry/Cultivable.ts:431` calls `super.applyProps` then adopts.
- `lib/boundary/Adornable.ts:74` `AdornmentSpec = string | { template;
  slot? }`; `applyAdornments` (`:180`) rebuilds fixtures from the row on
  every hydrate (not once-guarded; idempotent by design).
- `lib/description/Detailed.ts:232` `details: { persistent: true,
  instruction: true, authorable: true }` — a map keyed by detail name.
- Instruction fields in the tree (10): `startLocation`, `warren`,
  `details`, `adornments`, `exits`, `container`, `props`, `cast`,
  `costume`, and the tpa pack's `routes`
  (`packages/content/tpa/src/lib/FastTravel.ts:207`).

### Exits

- `lib/boundary/Exitable.ts:449` `addBidirectionalExit` is `async`; it
  either binds a supplied `prebuiltForward`/`prebuiltBack` pair or
  `StuffApi.createSync(() => new Exit(opts))` twice (`:502-503`).
  `_applyExitSpec` (`:563`) clones `spec.kind` when present, else
  `createSync(new Exit(oneWayOpts))` (`:655`). `ExitInstruction` (`:194`)
  already carries `kind?`.
- `lib/boundary/Exit.ts:105` `ExitOptions`; `:654` `bind(opts)` is
  `@CallSecurity(ByPartyRoom) @Final @Unshadowable`, delta-aware, and
  **throws when already bound**. `ByPartyRoom` = `FromMixin(Exitable)`
  with a `where` that reads `args[0].source` / `.destination`. `Exit`
  composes no `PostRegistrationMixin` (so `createSync` works today).
  `fieldMeta` declares `messageIn`/`messageOut`/`media`/... persistent —
  what a kind row hydrates.
- `lib/boundary/DeferredDestinationExit.ts:56` — abstract, constructor
  takes `{direction, source, destinationTemplatePath}` and forwards to
  `Exit`'s ctor as `destinationPath`; subclasses implement
  `computeDestination()`. Six concrete subclasses, all in packs, all
  taking constructor args: `FloorStairExit(source, floor)`,
  `DormDoor(corridor, key, dir)` (eternal-university);
  `UpstairsExit(corridor, warren, nodeId, corridorTemplate)`,
  `FrontDoorExit(corridor, warren, key, dir, entryRow)`,
  `LotGateExit(circulation, warren, key, dir, entryRow)`,
  `KeyedDoorExit(from, to, dir, warren, {oneWay})` (residence).
- `lib/boundary/ExitableVessel.ts:189` `getEntryExit()` and `:213`
  `getOrSynthesizeOutExit()` are **sync**, cached per environment,
  invalidated in `onMoved` (`:109`). `getExit('out')` (`:73`) is the
  sync consumer; `LocomotionControllerBase.ts:119` is the only external
  `getEntryExit` caller (async). `ExitableVessel` composes
  `DoorBearing(Exitable(Adornable(Vessel)))` — no `PostRegistration`.
- Content: 194 authored `exits:` entries, 3 name a `kind:`. Three kind
  rows exist: `/stuff/idea/exits/archway`, `/stuff/idea/exits/stair`
  (generic-objects) and `/world/terminus/delight-road/exits/delight-ford`
  (terminus). `stair.yaml` = `class: /platform/idea/Exit` + `media`,
  `wheelPassable`, `messageOut`, `messageIn`.

### `StuffApi.create` / `createSync` — the 38 production sites

`ConnectionManager:66` (Interactive) · `Application:290` (Login) ·
`CheckController:109` (Ticket) · `PartyLogic:219,:348` (Party) ·
`ScriptLogic:62` (EvalScript) · `BoundaryLogic:59` (factory param),
`:104-105` (two `BoundaryAnchor`s, sync) · `MagicLogic:1715`
(`UnboundedReceptacle`, sync) · `SandboxLogic:206` (CircleFloor
**fallback** after a failed clone), `:210` (return `SandboxCrossingExit`,
sync inside an async fn), `:345` (WireBody) · `StudioLogic:1221`
(class-default introspection throwaway) · `WeatherLogic:1036`
(LightningStrike) · `ConditionLogic:673` (Shade) ·
`PersistableLogic:1343` (shadow follower from a `describeFork` factory) ·
`platform/thing/sandbox/SandboxCrossing.ts:154` (sync, inside `onMoved`)
· `Exitable` ×3 · `ExitableVessel` ×2 (sync) · `BuildingWarren` ×5,
`DormWarren` ×5, `HoldingWarren` ×2, `PlatWarren` ×2 (all inside `async`
methods; `createSync` chosen for no reason that survives).
**Genuinely sync: four** — `ExitableVessel` ×2, `SandboxCrossing.onMoved`,
`BoundaryLogic.installBoundary`. `Boundary` (`lib/boundary/Boundary.ts:48`)
extends `Thing` and composes no `PostRegistration`; no production site
constructs a `Door`/`Window` with `new`. `Shade` (`platform/agent/Shade.ts:62`)
and `WireBody` take `(playerId, species)` constructor args because
species must land before `postRegister`'s loadout — exactly what
`dataOverlay` + hydration Phase 1 already do.

### The three `lib/` residents

`lib/boundary/BoundaryAnchor.ts` (`AdornmentMixin(Thing)`, has a
`static is()` guard and `_isBoundaryAnchor` marker),
`lib/sandbox/SandboxCrossingExit.ts` (`extends Exit`, two directions via
`setCrossingDirection`/`setCrossing`), `lib/weather/LightningStrike.ts`
(`Energized(Audible(Visible(Thing)))`, empty body). `architecture.md:144`
names them as the *instanced but never stamped* carve-out.

### Access, authoring doors

- `platform/idea/api/TemplateLogic.ts:60` `saveTemplate(path, classPath,
  data, hydratorClassPath?)` → `enforceCodeFieldGate` (`:148`): no Avatar
  author → allow; wizard → allow; else violations for `class` ≠
  `existing.class`, `hydratorClass` ≠ `existing.hydratorClass`, brain
  multiset not a subset; D4 folder-scaffold carve-out. Error text quoted
  in the requirements. `validateFolderLeafSave` (`:225`) requires string
  `path` AND `class`.
- `lib/stuff/CodeNamingFields.ts:29` `FIELDS = ['class','hydratorClass','behaviors[].brain']`.
- `saveTemplate` callers (9, all kernel): `WriteController:161`,
  `CpController:76`, `MvController:79`, `MkdirController:62`,
  `SubdivideController:89`, `CmsLogic:605`, `StudioLogic:859`, plus the
  doc comment in `PersistentHydrator` and tests.
- `platform/idea/cmd/shell/CpController.ts:76` / `MvController.ts:79`
  copy `tpl.class`/`tpl.data`/`tpl.hydratorClass`; both content branches
  are wizard-gated. `RmController` deletes via `tpl.delete()` (`:109`),
  recursing descendants with `-r`. `WriteController` (`:100-175`) is the
  in-world create door: `--class` (default `DEFAULT_CONTENT_CLASS`),
  `--hydrator` (default the standard one, `''` omits); view at
  `packages/content/platform/content/platform/cmd/shell/write.yaml`.
  `CmsLogic._writeContent` (`:567`) refuses to create (*"creating
  templates is out of scope"*) and round-trips `existing.class` /
  `existing.hydratorClass`. `CmsLogic.read` (`:405`) returns
  `templateMeta: { class, hydratorClass }`.
- `platform/idea/hooks/DomainHook.ts` → `validateReservedPath`,
  `validateFolderLeafSave`, `validateSingletonContainerTarget` on save;
  `validateFolderLeafDelete(id)` on delete — fires at the PM chokepoint
  for **every** writer, `PackLogic` included.

### Biome

- `lib/biome/Biome.ts:48` `_extendsBiomePath: string | null`, persistent
  (`:115`); `getExtendsBiome()` resolves via `StuffApi.findByTemplatePath`
  (sync registry read); `setExtendsBiome()` has zero production callers;
  `getExtendsBiomePath()` has one — `walkBiomeAncestry` in
  `platform/idea/api/BiomeLogic.ts:678` (visited-Set + depth cap
  `BIOME_ANCESTRY_DEPTH_CAP = 32` at `:150`, returns `{value, biomePath}`).
  `Biome extends Idea`; `Idea extends Stuff` with no
  `PostRegistrationMixin`.
- 16 test files assign `_extendsBiomePath` directly; 10 content rows carry
  it (base-library ×8, trade-forestry ×1, rejection ×1).
- ⚠ **Generic data inheritance would break biome provenance**: if a child
  biome's clone merged `_defaultTemperature` in from its parent, the
  per-read walk would find the value on the child and `trace atmosphere`
  would name the wrong ancestor (AC7). Biome's fields must therefore opt
  out of clone-time merging (D3).

### Pack reconcile

- `platform/idea/api/PackLogic.ts:903` `readContent` requires a string
  `class` on every template file (`:936`). `DomainFile` / `DomainRow`
  (`:1505`) carry `class`, `hydratorClass?`, `data`. `domainStrategy`
  (`:1520`): `canonicalBody = canonical({class, hydratorClass, data})`,
  `exportBody` the same three keys — `JSON.stringify` drops `undefined`,
  so adding an absent key changes no existing hash. `assertClassesResolve`
  (`:1160`) resolves every `class`/`hydratorClass` and refuses a class
  another pack ships without a `dependsOn` line. `orderByDependsOn`
  (`:703`), `SAXONBERG_PACKS` filter applied after ordering (`:758`).
  A vanished file plans `op: 'delete'` when clean, else a
  `deleted-vs-edited` conflict (`:2455-2495`); `applyKindPlan` deletes
  through `PersistApi.delete` (`:2619`), which fires `DomainHook`.
- `saxonberg-lounge` depends on `trade-hospitality` and `generic-objects`;
  every pack carrying `costume:` rows (hearthworks, hearts-delight,
  newbie-wilds, rejection, saxonberg-lounge, terminus, trade-haulage)
  depends on `generic-objects`, which owns `/stuff/thing/clothes/*`.
  `eternal-university` depends on `generic-objects` and `residence`;
  `residence` depends only on `platform`.

### Lint gates

- 56 in the derived roster. `lint:instanceable` =
  `scripts/check-instanceable-placement.ts` (invariants 5/6/7 at
  `:288-350`: 5 flags a hydrator with no data, 6 flags data with no
  hydrator — **every child row is this shape** — 7 applies the
  `<root>/<branch>/` pattern only to a row naming `class:` so a child
  **skips it silently**). `lint:census` = `scripts/check-template-census.ts`
  (clause (b) censuses path-valued DATA fields including
  `_extendsBiomePath`; `extends` is top-level). `lint:field-meta`
  refuses an unknown `fieldMeta` key. `lint:lib-statics` ratchets
  **public static methods on non-Api classes** at ceiling 337 — a new
  public static on `Template` (a `lib/` class) breaches it.
- **15 scripts select rows by `raw.class`** (`check-conditions`,
  `check-kept-animals`, `check-doneness`, `check-blessed-bands`,
  `check-dossiers`, `check-controller-rows`, `check-envelope`,
  `check-ground`, `check-inert-weapon`, `check-identity`,
  `check-light-sources`, `check-perishable`, `check-openings`,
  `check-spell-cost`, `check-instanceable-placement`), each with its own
  local YAML reader. A class-less child row is **skipped silently by all
  of them** — the exact failure shape invariant 7 has. `scripts/pack-roots.ts`
  is the shared reader module (`packSources`, `classFileOf`,
  `composesMixin`, …) and exports free functions (scripts are outside the
  mudlib export discipline).
- `check-identity` rules: 1 proper name on an `Extra`; 2 register/rung
  drift; 3 a `Cast` row cloned twice; 4 a **sentient** `Extra` answering
  to nobody (needs `institution`); 5 a dossier on an `Extra`; 6 a
  name-shaped key on an organism whose class cannot hold it, narrowed to
  rows with `_speciesPath` or a brain.

### Content facts the exemplars rest on

- Hospitality bar row (`trade-hospitality/content/trade/hospitality/location/bar.yaml`):
  `class: /platform/location/SingletonCartesianLocation`, 21 props (six
  `stool` lines, eight `onto` entries), `name: a bar`, `description:`,
  `keywords`, `coords`. Dave's Bar row: `class: /world/lounge/location/Bar`
  (a **kernel** class, `mud/world/lounge/location/Bar.ts:52`, composing
  `Singleton(Staged(CartesianCoordinates(Exitable(Detailed(Visible(Perceptible(Location)))))))`
  — no `Named`), 25 props differing from the parent's 21 by the tablet
  plus four additions, `details`, `exits`, `adornments`, `cast` ×5.
- Glass rack: 64 lines over 10 distinct paths; `GlassRack =
  Staged(Container(Detailed(Thing)))`. Ten `crate-of-*` rows, each 12
  identical `lime`-style entries; `Crate = Circulating(Staged(Container(Detailed(Thing))))`.
  `crate.yaml` carries `keywords: [crate, box, empty]`.
- Costumes: 45 rows; entries `student-shirt` 45, `student-trousers` 45,
  `canvas-shoes` 43, `field-jacket` 11, `blazer` 8, `tweed-jacket` 3,
  `white-coat` 1, `leather-boots` 2, `hide-jerkin` 2.
- Mara's restock brain (`lib/behavior/restocks.ts:240`, `:424`) finds
  fixtures by `getContents().find(c => c.getTemplatePath() === path)`
  and counts glasses by class/keyword — it reads template paths of
  **clones**, which a `count`-minted clone carries unchanged.
- `/platform/location/sandbox/CircleFloor` row exists (platform pack);
  no row exists for Shade, Ticket, Party, WireBody, LightningStrike,
  BoundaryAnchor, UnboundedReceptacle or SandboxCrossingExit.

---

## Plan-level decisions

### D1 — Where the chain resolves: `Template` materializes EFFECTIVE, keeps RAW, saves RAW

**Question.** 66 readers assume `tpl.class` is stated on the row. A
child states neither `class` nor `hydratorClass`.

**Choice.** `Template._materialize` resolves the parent chain, so
`tpl.class`, `tpl.hydratorClass` and `tpl.data` are the **effective**
values on every materialized instance, and every existing reader that
wants "what this row clones into" is correct unchanged. The raw row
survives beside them:

```ts
// lib/stuff/Template.ts
static fieldMeta = { path, extends, class, hydratorClass, data };  // the STORED shape
path: string;
extends?: string;                       // the parent's path, or absent
readonly class: string;                 // EFFECTIVE (materialize writes it)
readonly hydratorClass?: string;        // EFFECTIVE
readonly data: Record<string, unknown>; // EFFECTIVE (merged, D2)
own: { class?: string; hydratorClass?: string; data: Record<string, unknown> }; // RAW, what the author wrote
chain: readonly string[];               // parent paths, nearest first; [] when parentless
```

- `fromDocument(doc)` (overridden) copies the stored fields into `own`
  and `extends`; `_materialize` then walks `extends` (D2) and writes the
  three effective fields. `toDocument()` (overridden) emits `path`,
  `extends`, and `own.*` under the stored names — **a save never writes
  an effective value**, so `saveTemplate`, `cp`, `mv`, the CMS and
  `pack --export` cannot flatten a child. `class`/`hydratorClass`/`data`
  are typed `readonly` so a stray writer is a compile error.
- **Raw readers change call shape, and they are exactly the authoring
  surfaces:** `TemplateLogic.saveTemplate` + `enforceCodeFieldGate`
  (baseline = `existing.own.*`, so a protowizard editing a class-less
  child is not refused for "changing" a class it never stated),
  `CpController`, `MvController`, `CmsLogic.read` (`templateMeta` gains
  `extends`, returns `own.*`) and `CmsLogic._writeContent`,
  `CatController` (prints the raw row plus `class` annotated with which
  ancestor supplied it). Everything else reads effective and does not
  change.
- **The two raw-field queries are unioned, not rewritten.**
  `findByClass(X)` = the raw `{class: X}` hits ∪ every row carrying
  `extends` (one `{extends: {$exists: true}}` query, materialized, kept
  when its effective `class === X`). `findWhereDataHas(f)` gets the same
  union on effective `data`. Both are boot-time warms; the extra query
  is cheap and the cache's by-path limit does not matter because the
  chain walk inside materialize is by-path. Documented on both statics.
- Cycle guard and depth cap live in the walk: `_materialize(doc, seen)`
  passes `seen` through a `protected static _findByPath(path, seen)`;
  a revisit throws naming the chain; depth cap 32 (the biome constant's
  value). A parent that does not exist throws naming child and parent —
  **never** a silent parentless materialize.
- Zone/leaf dispatch (`ZoneTemplate` vs `LeafTemplate`) uses the
  effective class; `isFolderClass` already loads the class, which is
  what D2 needs anyway.

**Why not resolve at the readers.** Sixty-six sites, and the two
populations are not distinguishable by grep; the raw population is the
five authoring surfaces, which are the ones that *must* change anyway.

### D2 — The merge algebra, declared per field on `fieldMeta`

A new `FieldMetaEntry` key: `inherit?: 'replace' | 'by-key' | 'by-entry' | 'never'`
(default `'replace'`). The field's owner says how it merges; `Template`
has no list of field names, so a pack field (`routes`) and biome's
fields declare their own rule with no kernel edit.

| rule | meaning | declared on |
|---|---|---|
| `replace` (default) | child's value wins whole; absent → parent's; a stated `null` IS null | every field not below |
| `by-key` | object merged by key, child wins per key | `details` (`Detailed`) |
| `by-entry` | list merged by entry identity (below) | `props`, `cast` (`Staged`), `costume` (`Costumed`), `adornments` (`Adornable`) |
| `never` | the parent's value is not copied; only what the child states | `exits` (`Exitable`), `routes` (tpa `FastTravel`), every `Biome` field (D3) |

**Entry identity** for `by-entry`: an entry's key is `as` when the object
form carries it, else `template`, else the bare string. Merged list =
the parent's entries in order, an entry whose key matches a child entry
**replaced in place** (further parent duplicates of that key dropped),
then the child's new keys appended in order. Parent duplicates the
child does not name are **preserved** — six same-path stool lines stay
six until somebody writes `count`. `onto` ordering is preserved because
in-place substitution keeps the parent's position.

**Where it runs.** `Template._materialize`, after the parent is
materialized, on the effective class's `MixinApi.getAllFieldMeta(ctor)`
(the class is loaded already for `isFolderClass`; a parentless row loads
nothing extra and merges nothing). The merge is a **private instance
method** on `Template` (`#inherit(parent, meta)`), not a static —
`lint:lib-statics` counts public statics and the ceiling is 337.

`hydratorClass`: absent on the child → the parent's. (A YAML `null` is
read as absent by `PackLogic.readContent` today and stays so; "unset the
hydrator" is not a case this build needs.) `class`: the child's when
stated, else the parent's. `dataOverlay` in `clone()` is spread over the
effective data, unchanged.

`check-field-meta.ts` `KNOWN_PROPS` gains `inherit`; `STRING_PROPS`
gains it; the golden tags are re-snapshotted in the same commit.

### D3 — Biome: the field moves, the resolver does not, provenance survives

- `Biome.fieldMeta` drops `_extendsBiomePath`; **every remaining Biome
  field declares `inherit: 'never'`** — biome resolves per read by its
  own walk, so nothing may be merged at clone time or the walk finds the
  value on the child and reports the wrong ancestor (grounding). This is
  the honest form of *"biome keeps its own semantics because it keeps
  its own resolver."*
- The live instance's parent link: `Biome` composes
  `PostRegistrationMixin` and in `postRegister` reads its own row
  (`Template.findByPath(this.getTemplatePath())`, a cache hit) and caches
  `tpl.extends` into a transient slot `_parentPath: string | null`.
  `getExtendsBiomePath()` returns the **override** when set, else the
  cached row link — *set wins, otherwise the row wins*. `setExtendsBiome`
  writes the override (the test seam; still zero production callers).
  `walkBiomeAncestry` and `trace atmosphere` are untouched.
- Not chosen: stamping `extends` onto every `Stuff` beside
  `templatePath`. One consumer reads it; a stamp on the base would claim
  it for every object in the game.
- Rows: the 10 rows move `data._extendsBiomePath: X` to top-level
  `extends: X`. **Drop the dev DB and reseed** (a renamed persistent key;
  no migrations, by rule). Tests: the 16 files replace the direct
  assignment with `setExtendsBiome(parent)` (live-ref form) or, where
  only a path is at hand, the override setter's path form
  `setExtendsBiomePath(path)` — one new public method on `Biome`, not a
  test-only seam. `check-template-census` clause (b) drops
  `_extendsBiomePath` from its list.

### D4 — The entry shape: `as` on all four lists, `count` on props only

```ts
// lib/stuff/Staged.ts
export type PropSpec = string | { template: string; as?: string; onto?: string; count?: number };
export type CastSpec = string | { template: string; as?: string };
export type CostumeSpec = CastSpec;
// lib/boundary/Adornable.ts
export type AdornmentSpec = string | { template: string; as?: string; slot?: string };
```

- `stageList` keys `placed` by **both** `as ?? path` and `path`, so
  `onto` may name either. `count: N` mints N clones (each placed; the
  last is what `onto` resolves to — documented); `count > 1` on a
  `Singleton`-composing class throws; `count` on `cast` throws (*"a count
  is a props feature"*). Duplicate `as` within one list throws at hydrate.
- `applyCast` / `applyCostume` accept the object form and read
  `template`; `applyCostume` maps entries to paths before
  `Character.wearGarments(paths)` (unchanged). `applyAdornments` reads
  `template` as it does today.
- `Persistable._bornWithProps: PropSpec[]` / `_bornWithCast: CastSpec[]`
  widen; `Cultivable.applyProps` is unchanged (super call).
- The once-guards are untouched and are what makes merging safe (the
  slate's finding); AC9 is proved by the drive, not by new code.

### D5 — `saveTemplate` takes a spec

```ts
export interface TemplateSpec { class?: string; hydratorClass?: string; extends?: string; data: Record<string, unknown> }
TemplateApi.saveTemplate(path: string, spec: TemplateSpec): Promise<string>
```

Four optional-ish fields make the positional form
`(path, null, data, undefined, parent)` unreadable. Nine kernel callers
plus tests migrate mechanically. Validation at save (in
`TemplateLogic.saveTemplate`, before the gate): `class` or `extends`
present; the parent exists; the chain resolves to a class with no cycle
within depth; `hydratorClass`, when stated, names a row (unchanged).

### D6 — The gate: `extends` is not a code-naming field

`CodeNamingFields.FIELDS` is unchanged and its doc comment gains the
reasoning: the three fields resolve to executable code; `extends`
resolves to a row that passed this gate, one hop further out than
`props[]` — the transitive set, not the direct set. Consequences the
build must state in `access.md`:

- a class-less row (`extends` + `data`) passes the delta rule with no
  new clause — there is no code-naming field present to introduce;
- a protowizard **retargeting** `extends` is a content edit (the new
  parent is a vetted row too); AC13 is about *naming* code, and the old
  refusal fires unchanged on `--class`, `--hydrator` and `behaviors[].brain`
  (the brain baseline stays `existing.own.data`, so a child that
  restates a brain — even the parent's — is refused for a protowizard,
  exactly as today);
- `cp`/`mv`: the content branches refuse a non-wizard only when
  `tpl.own.class !== undefined`; the copy carries `extends` and `own.*`
  (never the effective values).

### D7 — Deleting a parent is refused at the hook, and planned as a conflict by packs

- `TemplateApi.findExtenders(path)` → `TemplateLogic` (an Api static,
  not a `Template` static — the lib-statics ceiling) queries
  `{extends: path}`. `TemplateLogic.validateFolderLeafDelete(id)` (fired
  by `DomainHook.aroundDelete` for **every** writer: `rm`, `mv`, the
  CMS, `PackLogic`) gains the refusal: *"cannot delete `<path>`; it is
  extended by `<a>`, `<b>` — delete or re-parent them first."*
- `PackLogic.computeKindPlan`: before planning `op: 'delete'` for a
  vanished domain file, check extenders; when any exist plan
  `op: 'conflict'` with a new reason `'deleted-vs-extended'` naming them
  in the conflict's `detail`, the row untouched, one diagnostic — the
  three-way model's *never block* rule, with the hook as the belt.
- `content.yaml` (schema doc) gains the `extends` field description and
  a `{ extends: 1 }` index; `pnpm gen:schema`; `lint:schema` agrees.

### D8 — Cross-pack parents fail the boot at reconcile

`PackLogic.readContent` accepts a file with `class` **or** `extends`
(neither → throw naming the file). `DomainFile`/`DomainRow`/
`canonicalBody`/`exportBody` carry `extends` (absent hashes as today).
A new `assertParentsResolve(rp, set)` beside `assertClassesResolve`:
every `extends` must name a row this pack ships or a row shipped by a
pack in the install set that this pack **`dependsOn`** (same rule as
classes; the error names the parent, its pack and the missing
`package.json` line). A parent in a `SAXONBERG_PACKS`-filtered-out pack
is therefore a thrown error, not a dangling link (AC10). Packs reconcile
in topo order, so the parent row is in the DB before the child's rows
are written; a pack row may not extend an unshipped DB row.

### D9 — Exits: a default kind, one install path, and a rebind seam

- **`/platform/idea/exits/passage`** — the default kind row (platform
  pack, `class: /platform/idea/Exit`, no messages: a bare passage). A
  `TemplatePaths.defaultExitKind` constant in `lib/paths.ts`.
  `ExitInstruction.kind` defaults to it; `_applyExitSpec` and
  `addBidirectionalExit` always clone; the `createSync(new Exit)` fallback
  and the `prebuiltForward`/`prebuiltBack` pair are deleted
  (`addBidirectionalExit` takes `kind?: string` in its options).
- **`Exitable.installExit<E extends Exit>(kind: string, opts: ExitOptions, configure?: (e: E) => void): Promise<E>`**
  — clone the kind, run `configure` (subclass state that used to be
  constructor args), `bind(opts)` (the room is the caller, so
  `ByPartyRoom` passes), `addExit`. The one path every kernel and pack
  minting site uses; a verb on the object, never an `ExitApi`.
- **`Exit.rebind(opts)`** — same gate and decorators as `bind`; resets
  the edge fields and binds again. Exists for an exit whose **source or
  destination moves with its host** (a vessel's `in`/`out`). Documented
  as that seam and nothing else.
- **The four sync sites.** `ExitableVessel` composes
  `PostRegistrationMixin`, clones `/platform/idea/exits/vessel-in` and
  `/platform/idea/exits/vessel-out` once in `postRegister`, binds them
  when an environment exists and **rebinds in `onMoved`** (sync); the
  door attach/detach choreography is unchanged; `getEntryExit` /
  `getExit('out')` return the held exits. `SandboxCrossing.onMoved`
  already fires `void to.addExit(exit)`; it becomes
  `void to.installExit('/platform/idea/exits/sandbox-crossing', opts, e => { e.setCrossingDirection('enter'); e.setCrossing(this) })`
  with `this.passage` assigned in the continuation — a fresh clone per
  placement, which is what the class doc already says happens.
  `SandboxLogic.ensureCircle`'s return passage clones
  `/platform/idea/exits/sandbox-return` (async site). `Boundary` composes
  `PostRegistrationMixin` and pre-mints its two anchors from
  `/platform/thing/BoundaryAnchor` in `postRegister`;
  `installBoundary` wires the pre-minted pair synchronously and its
  "already has anchors" check becomes *already adorned*
  (`anchor.getAdornedTo() !== null`). No production site `createSync`s a
  `Boundary`, so the `PostRegistration` throw cannot fire.
- **DDE subclasses** get a no-arg constructor; what the constructor took
  (floor, unit key, warren ref, entry row, node id, corridor template)
  moves to one typed set-once method per class (`configureFloor(n)`,
  `configureUnit(key)`, …) that `installExit`'s `configure` callback
  calls. The warrens' 14 sites become `await room.installExit(kind, opts, configure)`.

### D10 — Which kind rows, where

| row | pack | class | notes |
|---|---|---|---|
| `/platform/idea/exits/passage` | platform | `/platform/idea/Exit` | the default; no prose |
| `/platform/idea/exits/vessel-in` · `vessel-out` | platform | `/platform/idea/Exit` | the `{{ mover }} enters/leaves the <thing>…</thing>` lines, authored |
| `/platform/idea/exits/sandbox-crossing` · `sandbox-return` | platform | `/platform/idea/SandboxCrossingExit` | prose off `SandboxCrossing.ts:154`; the return's `destinationPath: '/'` stays a bind option |
| `/system/residence/idea/exits/upstairs` · `front-door` · `lot-gate` · `keyed-door` | residence | the pack's four DDE/Exit subclasses | prose authored fresh (today they have none) |
| `/world/terminus/eternal/duncan-hall/idea/exits/dorm-door` · `floor-stair` | eternal-university | `DormDoor` / `FloorStairExit` | drive D reads their departure/arrival lines |
| the warrens' plain `down`/`out`/`south` legs | — | — | `/stuff/idea/exits/stair` for `down` in DormWarren/BuildingWarren (both packs depend on generic-objects); the default passage for `out`/`south` |

Kernel-required kinds are the platform's because the engine's own
fallback may not depend on an optional pack. `residence` does NOT depend
on generic-objects and ships its own stair-shaped rows rather than
gaining the dependency (a system pack stays dependency-light).

### D11 — The create → clone sweep, and the six that stay

Rows added (platform pack, path mirrors class per convention):
`/platform/agent/Shade`, `/platform/agent/sandbox/WireBody`,
`/platform/thing/Ticket`, `/platform/thing/LightningStrike`,
`/platform/thing/BoundaryAnchor`, `/platform/thing/UnboundedReceptacle`,
`/platform/idea/Party`, plus the exit kinds above. The four twins:
`platform/thing/BoundaryAnchor.ts`, `platform/thing/LightningStrike.ts`,
`platform/idea/SandboxCrossingExit.ts` extend their `lib/` base with an
empty body (the seven-twins convention; the lib class keeps
`BoundaryAnchor.is` and every import). `Shade` and `WireBody` lose their
constructor args: `playerId` rides the clone `context`, species rides
`dataOverlay: { _speciesPath }` (hydration Phase 1 lands before
`postRegister`, which is the ordering the ctor existed for);
`ConditionLogic.mintShadeFrom` and `SandboxLogic.enter` clone with
`asIdentityPath` as `Avatar` does. `Party` clones `/platform/idea/Party`
with `asIdentityPath: '/platform/idea/party/<uuid>'` (the minted-identity
doctrine; `setTemplatePath` on a fresh `create` retires). `Ticket`
clones and keeps its post-clone patches (`pointPath`, `number`); its
keywords move to the row. `LightningStrike` clones, sets voltage, is
destructed as today. `UnboundedReceptacle` clones (the async caller).
`SandboxLogic`'s `create(new CircleFloor())` fallback is **deleted** — a
missing row is a boot fault, not a case.

**The six that remain, enumerated** (`scripts/check-create-sites.ts`,
`lint:create-sites`, an allowlist of `file#function`, ceiling 6):

| site | why (requirements' two shapes) |
|---|---|
| `backend/ConnectionManager.ts` Interactive | connection layer — per-socket, no world identity |
| `backend/Application.ts` Login | connection layer |
| `BoundaryLogic.create(factory)` | the framework seam — takes a factory |
| `PersistableLogic` shadow follower | the framework seam — a `describeFork` factory; a Shadow rides another object and is never template-backed |
| `StudioLogic.readClassDefault` | introspection of a **class**, not an object; there is no row to clone by construction |
| `ScriptLogic` eval scratch | a per-jurisdiction author scratch, backed by nothing, gone at restart |

⚠ The last two are the loosest fit to the requirements' wording; see
Risks & opens.

### D12 — Lint gates read the EFFECTIVE row through one shared reader

`scripts/pack-roots.ts` gains `templateRows()` (path → `{file, pack, raw}`)
and `effectiveRow(path, rows)` → `{class, hydratorClass, data, chain}`
or a structured error (missing parent / cycle / depth / no class at the
root). The script-side merge is **shallow** (child key wins; lists
replace) and says so — a gate that reasons about list *entries* reads
`raw`. The 15 class-selecting gates migrate from their local readers to
it and select on `effective.class`; `check-instanceable-placement`
re-aims 5 (a child whose stated `hydratorClass` equals its parent's
effective one is the redundant line; a parentless hydrator with no data
still is), 6 (data with no *effective* hydrator) and 7 (`hasClass` =
effective), and adds **11**: a row with neither `class` nor `extends`, or
whose `extends` does not resolve. `check-template-census` adds clause
**(d)**: every top-level `extends` resolves to a shipped row, no cycle,
depth ≤ 32.

### D13 — The two ratchets

- `lint:census` clause **(e)**: pure-repeat entries — the same path
  twice in one `by-entry` list with no `as` — counted across the tree;
  ceiling = the count at W2's end (201 today, ~90 after the rack, the
  crates, the stools and the ward). May fall, never rise.
- `lint:create-sites` (D11): ceiling 6.

The hydrator-line count is not ratcheted — under inheritance the
redundant line is a *rule* (invariant 5), not a count.

### D14 — Dave's Bar, the costumes, the exemplars

- Hospitality bar: the `house-tablet` entry gains `as: tablet`; stools
  become `{ template: …/stool, count: 6 }`. Dave's Bar: `extends:
  /trade/hospitality/location/bar`, keeps `class`, `coords`, its
  descriptions, `details`, `exits`, `adornments`, `cast`; `props` becomes
  `works-board`, `receiving-bench`, `{ template: /world/lounge/thing/house-tablet, onto: /trade/hospitality/thing/back-bar, as: tablet }`,
  `bar-counter`, `bar-menu`. ⚠ The parent carries `name: a bar` and
  `description:`; `Bar` composes neither `Named` nor a `description`
  field, so both are discarded by the Hydrator exactly as they are on
  the parent — the build verifies with `look` that the presentation is
  unchanged rather than assuming.
- Glass rack: 10 `{ template, count }` lines. Crates: each `crate-of-*`
  gets `extends: /trade/farming/thing/crate` and `props: [{ template: …, count: 12 }]`;
  each states its own `keywords` (the *empty* keyword is the bug the
  requirements name). `can-of-cola` and its siblings `extends:
  /trade/bottling/thing/can`, stating only what differs (`open: false`,
  fill, census, container, descriptions). Ward: 4 repeats → `count`.
- Costumes: **one** parent row, `/stuff/agent/costume/student`
  (generic-objects, the clothes' owner, which every costume pack already
  depends on): `class: /platform/agent/Extra`, `register: indefinite`,
  `shortDescription: a student`, `keywords: [student]`, `costume:
  [{template: student-shirt, as: shirt}, {template: student-trousers, as: trousers}, {template: canvas-shoes, as: shoes}]`,
  no species, no brains, no dossier. Every dressed row `extends` it and
  states its own `class` (Cast/Extra), species, name and the rest; the
  four "+one" shapes append one `costume:` line in their own row
  (*"from a row that appends one line"* — drive step 13); the sentry and
  the duelist write `costume: [{ template: /stuff/thing/armor/leather-boots, as: shoes }, { template: /stuff/thing/armor/hide-jerkin }]`.
  The six bundles are six resulting shapes, not six rows — five
  intermediate rows nothing would ever clone are not authored (Risks:
  the user may prefer them).

### D15 — Zone lookup and row parenting: one family, documented, not unified

`zone.md` and `location.md` gain the family pointer; `templates.md` gains
the precedence: a zone field (`lookupField`) answers *what is true
everywhere inside here* at **read** time; a parent answers *what this
thing is like* at **clone** time; when both would supply a value the
clone-time value is on the instance and the zone walk is never
consulted — the exemplar rows demonstrate one mechanism at a time.

---

## Host placement

| new thing | host | what composing it claims | narrowing guard needed? |
|---|---|---|---|
| `extends`, `own`, `chain`, effective `class`/`hydratorClass`/`data` | `Template` (`lib/stuff`, a `Document`) | every row may have a parent; claims nothing about any `Stuff` | none |
| `inherit` axis | `FieldMetaEntry` (`lib/mixin.ts`) | every field merges by replacement unless it says otherwise; the owner of a field owns its rule | none — a declaration, not a guard |
| `by-entry` | `Staged.props`/`cast`, `Costumed.costume`, `Adornable.adornments` | these four lists have entry identity | none |
| `by-key` | `Detailed.details` | a map merges by key | none |
| `never` | `Exitable.exits`, tpa `FastTravel.routes`, every `Biome` field | neighbours are not inherited; biome resolves per read | none |
| `_parentPath` slot + `PostRegistrationMixin` | `Biome` only | the live biome knows its row's parent; nothing else reads a parent at runtime | none (NOT a `Stuff` stamp — one consumer) |
| `as`, `count`, optional `onto` | the entry types in `Staged.ts` / `Adornable.ts` | `count` is accepted by `applyProps` alone; the other appliers refuse it | none |
| `installExit(kind, opts, configure?)` | `ExitableMixin` | every room installs kind-cloned exits; `new Exit` retires from every site | none |
| `rebind(opts)` | `lib/boundary/Exit` | any exit may be rebound by a room party to the new edge; the seam for an exit that moves with its host | none |
| `PostRegistrationMixin` | `ExitableVessel`, `Boundary` (→ `Door`, `Window` inherit) | the vessel pre-mints its two exits; every boundary pre-mints two anchors; `createSync` of either would throw — verified no site does | none |
| `configure*` set-once methods, no-arg ctors | the 6 DDE subclasses; `Shade`, `WireBody` | what the ctor took now arrives after clone; the class is honest about being cloneable | none |
| concrete twins | `platform/thing/BoundaryAnchor`, `platform/thing/LightningStrike`, `platform/idea/SandboxCrossingExit` | the row names the twin; the lib class stays substrate | none |
| `TemplateSpec`, `findExtenders`, the delete refusal, `'deleted-vs-extended'` | `TemplateApi`/`TemplateLogic`, `PackLogic` | — | none |
| `templateRows` / `effectiveRow` | `scripts/pack-roots.ts` | the gates share one reader | none |

The test from the project's rules: no new mixin re-narrows a host set.
The one temptation — a `Stuff`-level parent stamp — was refused for
exactly that reason.

---

## Convention conformance

Checked at plan time against the current tree.

- **`props:` / `cast:` / `costume:`** — the three designations; invariant
  10 refuses `populates:`. New entries use the object form with `as`.
- **Locations, not rooms** — `Bar`, the corridors, the circle floor are
  `Location`s; nothing here names a room.
- **The five namespace axes / `<root>/<branch>/`** — every new row:
  `/platform/{idea,thing,agent}/…` (exit kinds under `idea/exits/`,
  the commons' existing shape), `/system/residence/idea/exits/…`,
  `/world/terminus/eternal/duncan-hall/idea/exits/…`,
  `/stuff/agent/costume/student`. Backing-class path mirrors template
  path for the seven object rows.
- **Module scope declares; lifecycles initialize** — `TemplatePaths`
  gains a constant (pure value); the `lint:create-sites` allowlist is a
  const in the script; no module-scope statements.
- **Import boundary (`lint:imports`)** — `Template.ts` already imports
  `api/persist`, `api/zone`; it adds a lazy `api/stuff` import for
  `loadClassByPath` (same pattern as its `ZoneTemplate` lazy import).
  Packs import the kernel by specifier only (`installExit` is reached
  through the room instance; no new kernel export needed).
- **Verbs on objects** — `installExit` on the room, `rebind` on the exit,
  `configure*` on the subclass; no `XApi.verb(host, …)`. `lint:object-verbs`
  stays at zero.
- **No new module category, no free helper, no new `eslint-disable`** —
  the merge is an instance method on `Template`; the effective reader
  lives in the existing `scripts/pack-roots.ts`; the new script
  `check-create-sites.ts` is a lint script like its 55 siblings.
- **`Mixins` registry** — no new kernel mixin. `PostRegistration` is
  existing.
- **`#` vs TS modifiers** — `Template` is `lib/` domain code: TS
  modifiers; `#inherit` is a private *method* (no proxy in play on a
  `Document`), which is fine.
- **Gates this build must satisfy:** the whole derived family —
  `pnpm -C packages/server lint:family` — with `lint:instanceable`,
  `lint:census`, `lint:field-meta`, `lint:lib-statics`, `lint:schema`,
  `lint:identity`, `lint:dossiers`, `lint:imports`, `lint:module-scope`,
  `lint:mixin-names`, `lint:object-verbs`, `lint:locations` and the new
  `lint:create-sites` the ones this build's changes touch directly.
  Never a subset in CI or in the plan.

---

## Waves

Each wave lands green on `pnpm test:near` + every touched pack's vitest
+ `pnpm -C packages/server lint:family`, and ends at one commit. Docs
that state a changed claim are edited in the wave that changes it
(`templates.md`, `ref-shapes.md`, `access.md`, `content-packs.md`,
`boundary.md`, `biome.md`, `architecture.md`, `antipatterns.md`,
`lint-family.md`, `bulk.md`, `furnishing.md`, `zone.md`, `location.md`,
`persistence.md § Props and cast`); the slate corrections wait for the
sweep.

### W0 — `extends` on the row (kernel, no content)

**Goal.** A row may name a parent; the clone pipeline and every catalogue
see the effective row; the authoring surfaces see the raw one; the
delete refusal and the class-less create work. No shipped row uses it
yet, so nothing observable changes.

**Decisions.** D1, D2 (the axis and the merge; only `replace` is
exercised until W2/W3 declare the others), D5, D6, D7 (the hook half),
D15 (docs).

**Files.**
- `lib/stuff/Template.ts` — `extends`, `own`, `chain`, the overridden
  `fromDocument`/`toDocument`, the chain walk with cycle/depth, `#inherit`,
  the `findByClass`/`findWhereDataHas` unions, `readonly` effective fields.
- `lib/mixin.ts` — `inherit` on `FieldMetaEntry`; `scripts/check-field-meta.ts`
  `KNOWN_PROPS`/`STRING_PROPS` + re-snapshot.
- `api/template.ts` + `platform/idea/api/TemplateLogic.ts` —
  `TemplateSpec`, `saveTemplate(path, spec)`, save-time chain validation,
  `enforceCodeFieldGate(spec, existing)` on `own.*`,
  `validateFolderLeafSave` accepting class-or-extends and dispatching on
  the effective class, `findExtenders`, the delete refusal inside
  `validateFolderLeafDelete`.
- `lib/stuff/CodeNamingFields.ts` — doc comment only (D6).
- The nine `saveTemplate` callers; `CpController`/`MvController` (raw
  copy + the class-less relaxation); `CmsLogic.read`/`_writeContent`
  (raw round-trip, `templateMeta.extends`); `CatController` (raw + the
  annotated effective class); `WriteController` + `write.yaml`
  (`--extends <path>`; when given, `--class`/`--hydrator` default to
  *absent*, and `_validateAgainstClassSchema` runs on the effective class).
- `packages/server/src/schema/content.yaml` (+ `pnpm gen:schema`).
- Tests: `lib/stuff/__tests__/Template.extends.test.ts` (raw/effective,
  merge of every rule on a synthetic class, cycle, depth, missing parent,
  save round-trip never flattens, `findByClass` union);
  `TemplateLogic.codeGate.test.ts` (a class-less row passes for a
  protowizard; `--class` still refused; retargeting `extends` passes;
  a restated brain refused); `TemplateLogic.transitiveClosure.test.ts`
  (+ `extends`); a delete-refusal test; `CpController` relaxation test.

**Acceptance.** A protowizard fixture creates
`extends: /trade/bottling/thing/can` with data and clones it (AC1, AC13);
`saveTemplate` of a child then `findByPath` returns the effective row
and the stored doc is raw; deleting an extended row throws naming the
extenders (AC12, hook half). `lint:family` green (no child rows shipped,
so the gates are untouched by content).

**Commit.** `build(template-inheritance W0): extends on the row — effective in memory, raw on disk`

### W1 — Packs and gates

**Goal.** A pack may ship child rows; a missing or cross-pack parent
stops the boot; every lint gate sees the effective row.

**Decisions.** D7 (the pack half), D8, D12, D13 (the census scaffolding;
ceilings set in W2/W4).

**Files.** `PackLogic.ts` (`readContent`, `DomainFile`/`DomainRow`,
`domainStrategy`, `assertParentsResolve`, `'deleted-vs-extended'`,
`PackConflict.reason` vocabulary); `scripts/pack-roots.ts`
(`templateRows`, `effectiveRow`); the 15 class-selecting scripts;
`check-instanceable-placement.ts` (5/6/7 re-aimed, 11 added);
`check-template-census.ts` (clause (d); `_extendsBiomePath` stays in (b)
until W3). Tests beside `PackLogic`'s existing suite: a child row in a
test pack installs; a parent in a filtered-out pack throws naming it; a
vanished parent with extenders plans a conflict; `--export` of a child
writes `extends` and no class. A gate test for `effectiveRow`.

**Acceptance.** AC10; AC12 (pack half). `lint:family` green with a
test-only child row exercising invariants 5/6/7/11.

**Commit.** `build(template-inheritance W1): packs ship children; the gates read the effective row`

### W2 — Entry identity and counts, and the rows that only need counts

**Goal.** `as` on the four lists, `count` on props, the by-entry merge
live; the rack, the crates, the stools and the ward stop repeating.

**Decisions.** D4, D2 (`by-entry`, `by-key`, `never` declared on their
owners), D13 (the pure-repeat ceiling set here).

**Files.** `lib/stuff/Staged.ts` (types, `stageList`, `applyCast`,
`applyCostume`), `lib/boundary/Adornable.ts`, `lib/description/Detailed.ts`
(`inherit: 'by-key'`), `lib/boundary/Exitable.ts` (`inherit: 'never'`),
`packages/content/tpa/src/lib/FastTravel.ts` (`routes: never`),
`lib/persistence/Persistable.ts` (types). Content: `glass-rack.yaml`
(10 lines), the ten `crate-of-*.yaml` (`count: 12`; `extends: crate`
waits for W6 so this wave is count-only and independently observable),
hospitality `bar.yaml` (stools `count: 6`, tablet `as: tablet`),
`infirmary/ward.yaml`. `check-template-census.ts` clause (e) with its
ceiling. `templates.md § Instruction appliers` + `persistence.md § Props and cast`.

**Tests.** `Staged.count.test.ts` (N clones, singleton refusal, `onto`
against an `as`, duplicate `as` throws, `count` on cast throws, the
once-guard still holds under a merged list); a `Template` merge test for
by-entry substitution/append/duplicate-preservation; the costume object
form.

**Acceptance.** AC3 (the rack's 64 from 10 — Mara's beat is W6's), AC4
(a crate of limes: 12 from one line; the par sheet and pricing untouched
— the crate row's `censusKey`/`regionTarget`/`container` are unchanged),
AC9's mechanism.

**Commit.** `build(template-inheritance W2): count and as — the rack, the crates, the stools`

### W3 — Biome hands over the field

**Decisions.** D3. **Files.** `lib/biome/Biome.ts`, the 10 rows, the 16
tests, `check-template-census.ts` clause (b) list, `biome.md`, the wiki
spoiler snapshot (`wiki-spoiler-fields.snapshot.test.ts.snap` names the
field). **Drop the dev DB and reseed.**

**Acceptance.** AC7 — `trace atmosphere` indoors and out reports the same
values and provenance; `biome.chainWalk.test.ts` and the weather suites
green with the override seam.

**Commit.** `build(template-inheritance W3): biome reads the unified parent link`

### W4 — Exits are content; the create→clone sweep (kernel)

**Decisions.** D9, D10 (platform rows), D11, D13 (`lint:create-sites`).

**Files.** `lib/boundary/Exit.ts` (`rebind`), `Exitable.ts` (`installExit`,
default kind, `prebuilt*` gone), `ExitableVessel.ts` (`PostRegistration`,
pre-mint, rebind), `Boundary.ts` + `BoundaryLogic.ts` (pre-minted anchors),
`platform/thing/sandbox/SandboxCrossing.ts`, `SandboxLogic.ts`,
`WeatherLogic.ts`, `ConditionLogic.ts`, `CheckController.ts`,
`PartyLogic.ts`, `MagicLogic.ts`, `Shade.ts`, `WireBody.ts`, `Ticket.ts`,
the three twins, `lib/paths.ts`, `scripts/check-create-sites.ts` +
`package.json` `lint:create-sites`. Platform pack rows: the five exit
kinds and the seven object rows. `boundary.md` (the reversed sentence),
`architecture.md` (the carve-out dissolves), `antipatterns.md` (*clone
the row, then patch*), `lint-family.md`.

**Tests.** Exit kind default applied when `kind` absent (a room's
`exits:` with no kind clones `passage`); bidirectional pairs from a kind;
vessel `in`/`out` rebind across two moves with a door; anchors pre-minted
and wired once; shade/wire-body clone with identity + species overlay
(the existing mortality/sandbox suites are the regression net); strike
still conducts; ticket still reclaims; the create-sites gate's own test.

**Acceptance.** AC6 (kernel half: an authored kind row's prose appears
on a new exit); AC8; AC11 (the allowlist IS the enumeration); the vessel
`out` exit still works (drive step 17).

**Commit.** `build(template-inheritance W4): every exit is a clone; the six create sites that remain`

### W5 — Exit kinds in the packs

**Decisions.** D9 (DDE configure), D10 (pack rows).

**Files.** residence: `BuildingWarren.ts`, `HoldingWarren.ts`,
`PlatWarren.ts`, `UpstairsExit.ts`, `FrontDoorExit.ts`, `LotGateExit.ts`,
`KeyedDoorExit.ts` + four rows; eternal-university: `DormWarren.ts`,
`FloorStairExit.ts`, `DormDoor.ts` + two rows. Each pack's own vitest.

**Acceptance.** AC6 (drive D: rent a room, take the stairs, read the
authored lines; edit the stair row, publish, build a new floor, the new
prose appears).

**Commit.** `build(template-inheritance W5): the warrens' exits are rows`

### W6 — The exemplars: Dave's Bar, the bottling line, the crates, the costumes

**Decisions.** D14. **Files.** lounge `bar.yaml`; hospitality `bar.yaml`
(already `as`-keyed from W2); `can.yaml` siblings; the ten crate rows
(`extends`); `/stuff/agent/costume/student` + the 45 rows across seven
packs; `bulk.md` and `furnishing.md` notes; the cast-archetype sentence
in `identity.md`/`behavior.md` (*expansion vs parenting*).

**Acceptance.** AC2, AC3 (Mara's beat counts twelve coupes), AC5, AC9
(drive H: reboot and walk the four places).

**Commit.** `build(template-inheritance W6): Dave's Bar in five lines; forty-five costumes from one`

### W7 — Drive, record, MR

Run the requirements doc's drive A–H live in a browser (not the wire
suite), append the drive record below, `pnpm test` once, open the MR.
The slate corrections (cms-slate, cast-archetype-slate,
scoped-authoring-slate, content-pack-units, spawn-distribution-slate,
authoring-intelligence-slate) are the sweep's.

---

## Reachability wiring

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| a class-less row | `write -c --extends <path>` (`write.yaml` gains the option) | the workspace (`WorkspaceMixin`), unchanged | the child row | `Template._materialize` on every read | `AccessApi.can(write)` on the path; the delta rule on `own.*` |
| `count` / `as` | none (data) | `StagedMixin` / `CostumedMixin` / `AdornableMixin` appliers | the entry object | hydrate Phase 2 | the `count`-on-cast and duplicate-`as` throws |
| biome parent | `trace atmosphere` (exists) | `Biome.postRegister` reads the row | top-level `extends` on the 10 rows | `BiomeCatalogue` warms by clone → `postRegister` runs | — |
| exit kinds | `go` (exists) | `Exitable.installExit`; `ExitInstruction.kind` default | the kind rows in the platform/residence/university packs | the default is a constant; a missing `passage` row throws at the first exit — loud | `bind`'s `ByPartyRoom` |
| the seven object rows | existing verbs (`check`, `cast`, `party`, dying) | the clone sites | platform pack rows | the platform pack installs first | — |
| delete refusal | `rm`, `mv`, `pack sync` | `DomainHook.aroundDelete` | `{extends}` index | — | — |
| cross-pack parent | `pack sync` / boot | `assertParentsResolve` | manifests' `dependsOn` | reconcile | — |

Each link fails closed and silent if missed; the plan names them so the
build checks each once.

---

## Acceptance-criteria coverage

| AC | wave(s) | proof |
|---|---|---|
| 1 protowizard creates a class-less row and clones it; a class is still refused | W0 | codeGate test + drive A |
| 2 Dave's Bar in ~five lines, own tablet, four additions, nothing doubled | W6 | drive B5, B7, B8 |
| 3 rack: 64 from 10; Mara counts correctly | W2 (rack), W6 (Mara) | drive B6, B9 |
| 4 crate: 12 from one line; bought/priced/stocked as before | W2 (count), W6 (`extends`) | drive C |
| 5 forty-five NPCs from the bundles; one pair of shoes each | W6 | drive C2 |
| 6 exit prose from a row; editing it changes new exits | W4 (kernel), W5 (the warrens) | drive D |
| 7 `trace atmosphere` unchanged, values and provenance | W3 | drive E |
| 8 strike, shade, ticket read from rows and still work | W4 | drive F |
| 9 nothing doubled after a reboot | W2 (mechanism), W6 | drive H |
| 10 a parent in an uninstalled pack stops the boot, naming it | W1 | drive G23 |
| 11 every object born from a row; exceptions enumerated | W4 | `lint:create-sites` |
| 12 deleting an extended row refused, naming dependents | W0 (hook), W1 (pack) | drive G22 |
| 13 a protowizard cannot choose/change/redirect a class | W0 | codeGate test + drive A3 |

Every criterion maps. No scope gap found; the one place the plan reads
the requirements narrowly is D14's single costume parent (below).

---

## Test & gate strategy

- **Unit** (`test:near` per wave): the merge algebra on synthetic classes
  under `/test/**` (never shipped content — `lint:test-content`); the
  raw/effective split and the save round-trip; the gate ladder on a
  class-less row; `count`/`as`/`onto`; the biome override seam; exit
  kind defaults, `rebind`, pre-minted anchors; the pack reconcile cases;
  each new/changed lint script's own test beside it.
- **Only the drive can prove:** Mara's count, the `look` rendering of
  Dave's Bar and the dressed NPCs, the authored stair prose after a
  publish, `trace atmosphere` provenance, nothing doubled after a
  reboot. The wire drive is not this drive.
- **Gates:** the whole family every wave. `lint:field-meta` re-snapshot
  in W0; `lint:schema` after `gen:schema` in W0; `lint:lib-statics` must
  not rise (no new public statics on `Template`); `lint:create-sites`
  from W4.
- `pnpm test` runs exactly twice: before the MR opens (W7) and at
  `/finalize`. Never between waves, never in the background.

---

## Risks & opens

1. **The consumer written when the input was small.** Named by the
   requirements; three concrete instances here: (a) `Persistable` hosts
   (every `FurnishableRoom`) that already hold a record never re-seed
   their props — a row edit to a parent's list does not reach them, and
   this is the documented non-goal; the drive's ward check must be
   against a fresh DB. (b) Any reader that took "one instance per
   template path in this container" for granted: `stageList`'s own
   `placed` map (fixed by `as`), and `restocks.ts` (verified to count
   clones by path, so `count` is invisible to it). (c) `findByClass` /
   `findWhereDataHas` (unioned in D1). The build should grep for
   `.find(c => c.getTemplatePath() === ` once and read each hit.
2. **Gates that skip a class-less row silently** — the 15 scripts (D12)
   and any test fixture that reads `raw.class`. W1 migrates all 15; a
   gate the grep missed shows up as a *passing* gate, which is the
   dangerous kind. The reviewer should ask which gates were touched.
3. **The hospitality parent's field vocabulary** (`name`, `description`)
   is not the child's (`shortDescription`, `longDescription`); both
   parent keys are discarded by the Hydrator today and would be on the
   child. Verify by `look`, then consider (in W6) bringing the parent
   onto the same vocabulary since it is now a parent people read.
4. **`Boundary` gaining `PostRegistration`** makes any future
   `createSync(new Door())` throw. None exists; the create-sites gate
   will name one if it appears.
5. **The two loosest of the six surviving `create` sites** —
   `StudioLogic.readClassDefault` (introspection) and the eval scratch
   — fit the requirements' *two shapes* only by reading "framework
   seam" generously. The alternative for the scratch is a
   `/platform/idea/EvalScript` row cloned with a minted identity, which
   is honest and cheap; the Studio read genuinely has no row. **User's
   eye.**
6. **One costume parent vs six.** AC5 says *"from six bundles"*; D14
   ships one parent and lets each "+one" row append a line, because five
   intermediate rows would exist for nothing to clone. If the user
   wants the six as rows, they are `/stuff/agent/costume/{student-jacketed,…}`
   each `extends: student` + one line — twenty minutes. **User's eye.**
7. **A costume parent that is an `Extra` with no species.** Rule 4 of
   `lint:identity` keys sentience on species; the row is deliberately
   bodiless so it fields nobody and answers to nobody. If the gate
   reads sentience off the class instead, the fix is the gate's
   narrowing (rule 6 already narrows on species), not an `institution`
   on a mannequin. Verified at W6, not assumed.
8. **`saveTemplate`'s signature** touches every test that calls it. The
   change is mechanical; the number is not small.
9. **Go-live fan-out is a non-goal and now has a blast radius** — a
   parent's edit re-hydrates the parent's own live clones only. The
   build must not "fix" this; it is on the legibility slate with the
   reverse dependent index.
10. **The DB drop** (W3's renamed biome key, and W6's costume rows
    changing `_costumeWorn` hosts): drop and reseed per project rule; the
    drive runs on a fresh DB.

Nothing above reopens the requirements. Items 5, 6 and 7 are the ones
to look at before the build starts.

---

## Deferred seams

Clean attach points; the design lives on the slate named, never here.

- **Reverse dependent index / visible go-live no-op** —
  `TemplateApi.findExtenders` is the read that a fan-out would iterate;
  `legibility-slate` (open item) with the money-integrity seam.
- **Effective-value / source inspector, the CMS room and zone editors,
  Studio `extends` authoring** — `Template.chain` + `own` are the data
  the widget renders; `cms-slate` (its two false premises corrected at
  the sweep), `authoring-intelligence-slate` (dangling-ref diagnostics,
  cycle warnings, completion).
- **Base-class narrowing and the 42 cohorts** — the next build; a
  cohort's parent row is where its class will be stated once.
- **Vessel-category retirement** — `bulk.md` note only.
- **Manifest-level parent validation** — `content-pack-units` (the
  reconcile unit now has a cross-row dependency; `assertParentsResolve`
  is its interim home).
- **Reset cadence on the entry** — the entry object has room for
  `resetCadence` beside `as`/`count`; `templates.md`'s note stays.
- **Biome organization** — untouched rows, untouched resolver.
- **Contents grouping, the `sense` verb** — legibility Parts C and D.

---

## Critical files

Read first, in this order:

1. `docs/requirements/template-inheritance-requirements.md`
2. `packages/server/src/mud/lib/stuff/Template.ts` and
   `packages/server/src/mud/lib/persistence/Document.ts` (`toDocument`/`fromDocument`)
3. `packages/server/src/mud/api/stuff.ts` (`clone`, `#cloneInner`)
4. `packages/server/src/mud/lib/stuff/Staged.ts`;
   `packages/server/src/mud/lib/persistence/Persistable.ts:195-300`
5. `packages/server/src/mud/platform/idea/api/TemplateLogic.ts`;
   `packages/server/src/mud/api/template.ts`;
   `packages/server/src/mud/platform/idea/hooks/DomainHook.ts`
6. `packages/server/src/mud/platform/idea/api/PackLogic.ts:900-1000,1150-1240,1495-1560,2340-2500`
7. `packages/server/src/mud/lib/boundary/Exit.ts:105-190,640-720`;
   `Exitable.ts:440-660`; `ExitableVessel.ts`; `DeferredDestinationExit.ts`;
   `Boundary.ts`; `platform/idea/api/BoundaryLogic.ts`
8. `packages/server/src/mud/lib/biome/Biome.ts`;
   `platform/idea/api/BiomeLogic.ts:660-740`
9. `packages/server/scripts/pack-roots.ts`,
   `check-instanceable-placement.ts`, `check-template-census.ts`,
   `check-field-meta.ts`, `check-identity.ts`
10. `packages/server/src/mud/lib/mixin.ts:44-175`
11. The content: lounge `bar.yaml`, hospitality `bar.yaml`,
    `glass-rack.yaml`, `can.yaml`/`can-of-cola.yaml`,
    `crate.yaml`/`crate-of-limes.yaml`, `mara.yaml`, `stair.yaml`
12. `docs/subsystems/templates.md`, `docs/ref-shapes.md`,
    `docs/subsystems/access.md § The code-trust lockdown`,
    `docs/subsystems/content-packs.md`, `docs/subsystems/boundary.md § Exit-kind templates`,
    `docs/subsystems/biome.md`, `docs/lint-family.md`

---

## Drive record

*(appended at build time — the output of running the requirements doc's
drive A–H against the running game in a browser, and what it found)*
