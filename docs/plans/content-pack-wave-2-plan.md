# Content packs, wave 2 (2a + 2b) — implementation plan

**Feature branch:** `design/content-pack-wave-2` (build on it directly; it carries the requirements and this plan; push every turn).
**Requirements:** `docs/requirements/content-pack-wave-2-requirements.md` (closed scope; its **Build sequence** is normative — the eleven steps below are those eleven, in that order).
**Subsystem baseline:** `docs/subsystems/content-packs.md` (the !198 installer), plus `document-store.md`, `emotes.md`, `crafting.md`, `studio.md`, `command-routing.md`, `command-spec.md`, `wiki.md`, `app-settings.md`, `chat.md`, `forums.md`, `access.md`, `parcel.md`, `shell-alias.md`, `testing.md`.
**Slate anchors:** content-packs-slate A10/A11.5/A16.2/A17/A18.2/A21/A22/A24/A26/A27; content-pack-units Parts A–C.

This plan is self-contained: a fresh build agent who has read CLAUDE.md, the requirements, and the subsystem docs above can execute it top to bottom. Every step leaves the tree green (`pnpm build` type-clean, `pnpm test:near`, the lint family), is one or more commits, and is a legitimate stopping point (see **Stop protocol**). The requirements decide WHAT; where this plan decides HOW it says **planner's choice** so the reviewer can see the seam.

Conventions that bind every step (from CLAUDE.md + the requirements' Constraints):

- All installer logic is module-private functions in `packages/server/src/mud/obj/api/PackLogic.ts`; public `PackLogic` methods carry `@CallSecurity(SecurityPolicies.FromModule('/api/pack#PackApi'))`; `PackApi` (`mud/api/pack.ts`) stays a thin decorated shell exporting the class + call-shape types. **No new Api classes** — `DocumentApi`, `SoulApi`, `CommandApi`, `AccessApi` grow methods; `PackApi` grows report fields only. No new module categories; `lib/document/DocumentKinds.ts` is a named-vocabulary module; `scripts/check-test-content.ts` is a script.
- Every DB write in `PackLogic` rides `PersistApi` (`lint:pm`). The catalogues and `WikiRegistry` write through their `Document.save()` (the same chokepoint one layer down) — that is the seeders' shape moved into the readers, not a new write path.
- The mudlib imports nothing outside `src/mud/` except the Api tier (`lint:imports`): `.md` and `.script` files are read by `PackLogic` (obj/api = the importing tier). No reader in `lib/`.
- Every test touching the wired runtime imports `test-bootstrap` first (`lint:test-bootstrap`). Installer tests use ugly fixture packs through `mud/obj/api/__tests__/pack-harness.ts`, never the real packs.
- Stage by name (`git add <path>`), never `add -A`. Every tree move is `git mv`. **ONE MR** for the whole build.
- Commit shape: `feat(pack): …` / `refactor(persistence): …` / `feat(document): …` / `feat(access): …` / `chore(lint): …` / `docs(pack): …`. A seeder retirement is **one commit** that deletes the seeder, its `AppBootstrap.run` call, its `config/*.yaml` (or seed dir), and adds the pack files — revertable as a unit.
- The full suite runs **once**, at step 11. `pnpm test:near` per step.

Two cross-cutting mechanics the plan relies on, stated once:

- **The kind-scoped `documents` reset policy.** `mud/lib/persistence/ResetPolicy.ts` has `[Collections.Documents]: { verb: 'wipe-except', keep: { kind: 'release' } }`. Every kind this wave installs into `documents` is pack-shipped world content and must survive the nightly reset, or the world loses its emotes at 04:00. Step 1 changes that row's `keep` to `{ kind: { $in: [RELEASE_DOCUMENT_KIND, ...DECLARED_DOCUMENT_KINDS] } }` (the `because` names the packs). ⚠ Not in the requirements text — it is a consequence of the collapse the requirements did not spell out; flagged in the summary.
- **The harness stub's query matching.** `pack-harness.ts`'s `PersistApi.find` stub matches `r[k] === v` on top-level keys. The natural-key adoption query is dotted (`{ kind: 'emote', 'data.verb': 'grin' }`). Step 1 teaches the stub dotted keys (a five-line `getPath(row, 'a.b')` in the filter) and adds `documentRows()` / `rowsOfKind(kind)` helpers. Every later test file depends on this.

---

## Step 1 — the `document` kind: `DocumentKinds` + indexes + the strategy factory; scripts first; **ScriptSeeder dies**

Commits: `feat(document): DocumentKinds vocabulary + kind-scoped indexes` · `feat(pack): the document contribution kind (documentStrategy(kind))` · `feat(pack): saxonberg-lounge pack (scripts); retire ScriptSeeder`.

### 1.1 `lib/document/DocumentKinds.ts` (new — named vocabulary; imports nothing)

```ts
/** What the installer does when a kind's file vanishes from its pack. */
export type DocumentVanishPolicy = 'delete' | 'archive' | 'keep';

export interface DocumentKindSpec {
  /** The `kind` string stored on the row. */
  kind: string;
  /**
   * Dotted field under `data` that is the natural key (`verb`,
   * `recipeId`, `key`, `blueprintId`), or null for a path-keyed kind.
   * Non-null ⇒ the installer adopts by `{kind, 'data.<naturalKey>'}` and
   * the flat-key check covers it; PersistenceManager creates
   * `{kind:1, 'data.<naturalKey>':1}` unique, partial on `kind`.
   */
  naturalKey: string | null;
  /** The pack subdir the kind's files live under (`emotes`). */
  contentDir: string;
  /** File extension the reader accepts. */
  ext: 'yaml' | 'script';
  onVanish: DocumentVanishPolicy;
}

export const DOCUMENT_KINDS = {
  script:         { kind: 'script',       naturalKey: null,          contentDir: 'scripts',    ext: 'script', onVanish: 'delete' },
  release:        { kind: 'release',      naturalKey: null,          contentDir: 'releases',   ext: 'yaml',   onVanish: 'delete' }, // press-owned; no pack ships one this wave
  emote:          { kind: 'emote',        naturalKey: 'verb',        contentDir: 'emotes',     ext: 'yaml',   onVanish: 'delete' },
  recipe:         { kind: 'recipe',       naturalKey: 'recipeId',    contentDir: 'recipes',    ext: 'yaml',   onVanish: 'delete' },
  'name-bank':    { kind: 'name-bank',    naturalKey: 'key',         contentDir: 'name-banks', ext: 'yaml',   onVanish: 'delete' },
  blueprint:      { kind: 'blueprint',    naturalKey: 'blueprintId', contentDir: 'blueprints', ext: 'yaml',   onVanish: 'delete' },
  'command-view': { kind: 'command-view', naturalKey: null,          contentDir: 'cmd',        ext: 'yaml',   onVanish: 'delete' },
} as const satisfies Record<string, DocumentKindSpec>;

export type DeclaredDocumentKind = keyof typeof DOCUMENT_KINDS;
export const DECLARED_DOCUMENT_KINDS = Object.keys(DOCUMENT_KINDS) as DeclaredDocumentKind[];
/** The kinds that carry a natural key (the flat-key kinds). */
export const FLAT_KEY_DOCUMENT_KINDS = DECLARED_DOCUMENT_KINDS.filter((k) => DOCUMENT_KINDS[k].naturalKey !== null);
```

`wiki` is deliberately absent (D1: not a document kind). `settings` and `subject` are absent too — they are contribution kinds with their own targets, not document kinds (D5/D6/D7); their strategies are hand-written in steps 4 and 10. The header comment states the graduation rule (A11.5: editing this file is a platform act) and that `requires.kinds:` is wave 3.

### 1.2 `PersistenceManager.createIndexes()` — kind-scoped indexes, lazy import

Inside `createIndexes()` after the two existing `documents` indexes:

```ts
// Declared document kinds: one {kind, data.<naturalKey>} unique per
// flat-key kind, partial on the kind so path-keyed kinds and free-form
// kinds never collide. Lazy import: the vocabulary is import-free today,
// but PM must never statically import mudlib models (the
// #migrateGroupOwners rule) — the cycle risk is structural, not current.
const { DOCUMENT_KINDS } = await import('../mud/lib/document/DocumentKinds');
for (const spec of Object.values(DOCUMENT_KINDS)) {
  if (spec.naturalKey === null) continue;
  await this.getCollection(Collections.Documents).createIndex(
    { kind: 1, [`data.${spec.naturalKey}`]: 1 },
    { unique: true, partialFilterExpression: { kind: spec.kind } },
  );
}
```

Also here: the `ResetPolicy.ts` `Documents` row change described above (import `DECLARED_DOCUMENT_KINDS` — `ResetPolicy` is mudlib, static import is fine).

### 1.3 `PackLogic` — the document strategy factory

- `KindName` widens: `'domain' | 'name-banks' | 'descriptor-banks' | 'document'` (later steps add `'settings' | 'subject' | 'wiki'`). Strategies for document kinds report `kind: 'document'` and carry `documentKind: DeclaredDocumentKind` so record baselines read `kind: 'document:emote'` (**planner's choice** — one `KindName` for the shared machinery, the document kind in the baseline's `kind` string so `pack diff` output names it).
- `KindStrategy<F>` gains three optional slots (all later steps use them):

```ts
  /** Reconcile policy (D5). Default 'three-way'. */
  policy?: 'three-way' | 'merge-missing' | 'cas';
  /** What a vanished file does to its row. Default 'delete'. */
  onVanish?: DocumentVanishPolicy;
  /**
   * Adoption query for an UNSTAMPED existing row — defaults to
   * `dbKeyQuery`. Flat-key document kinds override it with
   * `{kind, 'data.<naturalKey>': …}` so a migrated legacy row at a
   * provisional path is adopted in place by natural key (D3).
   */
  adoptQuery?(f: F): Record<string, unknown>;
```

  `computeKindPlan` uses `strategy.adoptQuery?.(f) ?? strategy.dbKeyQuery(f)` for the "existing unstamped row" lookup, and on `onVanish === 'keep'` emits `keep` (dropping the baseline) instead of `delete`; `'archive'` emits a new op `archive` (step 4 defines apply). `PackPlannedAction['op']` in `pack.ts` grows `'archive' | 'merge' | 'submit'` now (one type edit, not three).

- The file shape and the factory:

```ts
interface DocumentFile {
  /** Record key: `/<contentDir>/<rel-no-ext>` (`/emotes/grin`, `/scripts/daiquiri`). */
  key: string;
  /** The row path: `<root>` + key, except command-view (step 9). */
  path: string;
  data: Record<string, unknown>;
  relFile: string;
}

function documentStrategy(spec: DocumentKindSpec, root: string): KindStrategy<DocumentFile> {
  const nk = spec.naturalKey;
  return {
    kind: 'document',
    documentKind: spec.kind,
    collection: Collections.Documents,
    noun: `${spec.kind} document`,
    policy: 'three-way',
    onVanish: spec.onVanish,
    recordKeyOf: (f) => f.key,
    recordKeyOfRow: (r) => rowKeyOf(spec, root, r),        // strips `root` from r.path; command-view: identity
    dbKeyQuery: (f) => ({ kind: spec.kind, path: f.path }),
    adoptQuery: nk ? (f) => ({ kind: spec.kind, [`data.${nk}`]: f.data[nk] }) : undefined,
    rowOf: (f, packId) => ({ path: f.path, owner: root, kind: spec.kind, data: f.data, sourcePack: packId }),
    canonicalBody: (r) => canonical({ data: r.data ?? {} }),   // owner/path/kind/sourcePack are bookkeeping
    flatKeyOf: nk ? (f) => String(f.data[nk]) : undefined,
    exportBody: (r) => (spec.ext === 'script' ? r.data : (r.data as Record<string, unknown>)),
  };
}
```

  ⚠ `computeKindPlan` finds stamped rows with `find(collection, { sourcePack })` — for `documents` that returns EVERY kind the pack ships; add `...(strategy.stampedQuery?.() ?? {})` to the query and have the factory set `stampedQuery: () => ({ kind: spec.kind })`. Without this a pack shipping two document kinds sees each kind's rows as the other's "vanished" files.

- `readContent` gains one enumerated per-kind reader (never a glob): for each `spec` in `DOCUMENT_KINDS` with a `contentDir`, walk `content/<contentDir>/` for `*.<ext>`; `.yaml` parses to an object that becomes `data` (a flat-key kind whose file omits the natural key gets it from the basename; a file whose key ≠ basename fails at `read`); `.script` becomes `data: { source }` verbatim (the ScriptSeeder shape). `PackContent` gains `documents: Map<DeclaredDocumentKind, DocumentFile[]>`. `kindsOf(content, root)` appends one `documentStrategy(spec, root)` per kind present. `strategyForKey` learns the document keys by prefix from the same table. `flatKeyFailures` iterates document kinds too (they have `flatKeyOf`). ⚠ `name-banks` stays the OLD `nameBankStrategy` until step 3 — `DOCUMENT_KINDS['name-bank']` is declared now, but its reader is gated off (`if (spec.kind === 'name-bank') continue;` with a `// step 3` comment) so the two strategies never both claim `content/name-banks/`. ⚠ `cmd/` is gated off the same way until step 9, AND the domain-template walk under `content/domain/` must already skip any path segment named `cmd` (a view has no `class:` and would fail the walk) — do it now so step 9 is additive.
- **`pack.yaml` `root:`** (D2): `PackManifest.root: string` (optional in the file, defaults to `/<id>`; must start with `/`); `readManifest` validates it. Document paths = `root + key`. Owner = `root`.
- Go-live (D3): `reconcilePack`'s side-effect tail calls `invalidateDocumentKind(kind)` for each document kind with any change — a module-private switch that this step only knows `script` for (no catalogue; nothing to drop — `ScriptLogic` reads by path per call). Later steps add cases.
- `diff`/`resolve`: no change needed beyond `strategyForKey`; `--export` for a `.script` writes `data.source` as the file text (the `exportBody` special case above — `resolve` checks `spec.ext`).

### 1.4 The `saxonberg-lounge` pack (scripts only) — **ScriptSeeder dies**

1. Scaffold `packages/content/saxonberg-lounge/`: `package.json` (`@saxonberg/content-saxonberg-lounge`, private, type module), `pack.yaml`:
   ```yaml
   id: saxonberg-lounge
   version: 0.1.0
   root: /domain/lounge      # the ScriptSeeder path — adopt-in-place covers every dev DB
   description: The lounge — this wave only its three world scripts; rooms/NPCs are wave 4.
   dependsOn: [platform, corpo-goodkin, corpo-vionne]   # written now; the ids exist by step 6 (unknown deps are ignored in v1 — see orderByDependsOn)
   ```
   README noting what is deferred.
2. `git mv packages/server/src/mud/domain/lounge/scripts/{daiquiri,last-call,martini}.script packages/content/saxonberg-lounge/content/scripts/`. Rows land at `/domain/lounge/scripts/<name>`, `owner: /domain/lounge` — byte-identical to today's seeder, so an existing dev DB **adopts** the three rows in place.
3. `packages/server/package.json` deps: `"@saxonberg/content-saxonberg-lounge": "workspace:*"`; `pnpm install`.
4. Delete `backend/ScriptSeeder.ts`; drop its `run()` line in `AppBootstrap.run`; update the pack comment block.
5. Repoint `mud/lib/script/__tests__/demo-content.test.ts`: its `SCRIPTS_DIR` → the pack's `content/scripts/`; its "seeds idempotently" case becomes an installer-harness case (write the three sources into a fixture pack with `root: /domain/lounge`, install twice, assert one row each + all-zero second run). `ScriptLogic.resolveLimits`' `/domain/` tier is unchanged.

### Tests (step 1)

- `backend/__tests__/PersistenceManager.documentKinds.test.ts` — with a faked `db` (`collection().createIndex` spy): one unique partial index per flat-key kind, none for `script`/`release`/`command-view`; `ResetPolicy` `Documents.keep` lists every declared kind + `release`.
- `mud/obj/api/__tests__/PackLogic.document.test.ts` (harness, extended with dotted-key `find` + `documentRows()`): `writeDocumentFile(root, kind, name, data)` / `writeScriptFile(root, name, source)` fixture writers added to the harness; a fixture pack with `root: /x` and `scripts/a.script` → row `{path:'/x/scripts/a', owner:'/x', kind:'script', data:{source}}` stamped; **the full !198 matrix over the document strategy for `script` (path-keyed)** — the five cells, vanish×(clean/edited), pin, converge; second run all-zero; `root` omitted defaults to `/<id>`; a `root` without a leading slash fails at `read`; `--export` writes back the `.script` text.
- Existing `PackLogic.*.test.ts` stay green unchanged.

*Exit: one seeder retired; the document kind proven.*

---

## Step 2 — the collapse, part 1: emotes (D3, D4); **EmoteSeeder dies**

Commits: `refactor(persistence): migrate emotes into documents; drop the collection` · `feat(pack): expression pack; emote aliases → searchTerms; retire EmoteSeeder`.

### 2.1 The collapse migration (`PersistenceManager.connect()`, after `#migrateGroupOwners`, before `createIndexes()`)

One method for all three legacy collections (steps 2 and 3 each add a row to its table), pure decision core + I/O shell on the `#migrateDomainToContent` precedent:

```ts
/** The one-off collection → documents collapses. Table, not code, so step 3 is a row. */
static readonly COLLAPSES: ReadonlyArray<{ legacy: string; kind: string; naturalKey: string; strip: string[] }> = [
  { legacy: 'emotes',     kind: 'emote',     naturalKey: 'verb',     strip: ['aliases'] },   // step 2
  // step 3: { legacy: 'recipes', kind: 'recipe', naturalKey: 'recipeId', strip: [] },
  //         { legacy: 'name_banks', kind: 'name-bank', naturalKey: 'key', strip: [] },
];

/** Pure: which collapses apply, given the collection names present. */
static planCollapses(names: readonly string[]): string[]  // legacy names present

async #collapseLegacyCollections(db): Promise<number> {
  for (const c of COLLAPSES where planCollapses(names).includes(c.legacy)) {
    const rows = await db.collection(c.legacy).find({}).toArray();
    for (const row of rows) {
      const { _id, sourcePack, ...rest } = row;
      for (const s of c.strip) delete rest[s];
      const data = rest;                                  // the whole legacy row becomes `data`
      const doc = { _id, path: `/${c.legacy}/${String(row[c.naturalKey])}`, owner: '', kind: c.kind, data, ...(sourcePack ? { sourcePack } : {}) };
      await db.collection('documents').insertOne(doc);    // _id PRESERVED (the acceptance criterion)
    }
    await db.collection(c.legacy).drop();
    console.info(`PersistenceManager: collapsed '${c.legacy}' → documents {kind: '${c.kind}'} (${rows.length} row(s)); collection dropped (one-time migration)`);
  }
}
```

  Idempotent by construction: the legacy collection is gone after the first run; a missing collection is a no-op with no line. `sourcePack` is carried (the `name_banks` rows are already stamped by `species-and-names` — carrying the stamp makes step 3's re-point a plain three-way for them, not an adoption). A legacy `_id` colliding in `documents` cannot happen (distinct collections share the ObjectId space only by chance; guard with `insertOne` inside try/catch → on E11000 re-insert without `_id` and log the one row). Test seam: `runCollapseMigrationForTest(db)` on the `runGroupOwnerMigrationForTest` shape.

- `Collections.Emotes` **removed** from the enum; its `COLLECTION_POLICIES` row, `RESET_DISPOSITIONS` row, and the two `createIndexes` entries deleted (the compile is the totality test).

### 2.2 `Emote` becomes a value shape (`lib/social/Emote.ts`)

```ts
export class Emote {                   // no longer extends Document; no collectionName; no fieldMeta
  path = '';                            // the document's path (edit/delete address)
  verb = ''; grammar: EmoteGrammar = { slots: {}, template: '' }; echo: EmoteEcho = 'default';
  emoji?: string; tags: string[] = []; valence = 0;
  /** Catalogue lookup words only — never dispatched (D4). */
  searchTerms: string[] = [];
  static fromDocument(doc: StoredDocument): Emote;   // validates `data.verb` + `data.grammar.template`, lowercases verb/searchTerms
  toData(): Record<string, unknown>;                  // the inverse — what SoulLogic writes
}
```
  `aliases` is gone from the class. `EmoteSpec` (SoulCatalogue) drops `aliases`, gains `searchTerms?: string[]`. `mud/config/emotes.yaml`'s `aliases:` lists become each file's `searchTerms:`.

### 2.3 Readers and mint surfaces

- `SoulCatalogue` (`obj/SoulCatalogue.ts`): `warmCache` → `DocumentApi.listOfKind('emote')` → `Emote.fromDocument`; the cache maps **canonical verbs only**; a second map `bySearchTerm: Map<string, Set<string>>` (term → verbs) is built from `verb`, `tags`, and `searchTerms`. New `@CallSecurity(SoulApiCallers) search(term): Promise<Emote[]>`. `resolve(verb)` is canonical-only (the `;grin` acceptance criterion). `snapshot()` emits `searchTerms` instead of `aliases`. `mint` → `DocumentApi.save(EMOTE_MINT_BRANCH + '/' + verb, 'emote', record.toData())` with `const EMOTE_MINT_BRANCH = '/emotes'` (**planner's choice**: author-minted emotes land on the platform's own `/emotes/` branch — the same root the migration used — untitled ⇒ `ownerOf` yields the state, so `soul mint` stays a core-member act exactly as its `requiresCoreAccess` validator says; a pack that later ships that verb adopts it by natural key). `edit` → `DocumentApi.save(existing.path, 'emote', …)`. `delete` → **new** `DocumentApi.delete(path)` (see 2.4). `invalidateCache()` exists already — the strategy's go-live calls `SoulApi.invalidateCache()` when `emote` changed.
- `SoulController`: the `aliases` edit field becomes `searchTerms`; `soul show` prints `search terms:`; add `soul search <term>` subcommand (`cmd/social/soul.yaml`) → `SoulApi.search`. `SoulApi` (`api/soul.ts`) gains `search(term)`.
- `@saxonberg/types` `EmoteCatalogueEntry.aliases` → `searchTerms` (the picker's typeahead corpus); client: `grep -rn aliases packages/client/src` shows the emote picker/tests read the field — rename at those sites (the client's own `aliases` for `Detailed`/`Alias` are unrelated and untouched).
- `RenownLogic` (reads `emote.verb`/`emote.valence` via `SoulApi.all()`), `CommandGiver`, `Behaved`, `DialogueConversation`, `ReactController`, `EmoteRoutes` — unchanged (they use `resolve`/`all`/`snapshot`).
- Acceptance grep after this step: `grep -rn "aliases" packages/server/src --include='*.ts' | grep -i emote` → nothing; `grep -rn "aliases" packages/content/expression` → nothing.

### 2.4 `DocumentApi.delete(path)` (**planner's choice** — required by `SoulLogic.delete`; nothing else in the requirements deletes a document at runtime)

`api/document.ts`: `static delete(path: string): Promise<boolean>` → `DocumentLogic.delete` → `deleteImpl`: `gateMutation(actor, path)` (the same gate as `save`), then `StoredDocument.findByPath(path)?.delete()`; `ProvenanceApi.recordAuthoring({ path })` is NOT appended (a deletion is not authorship). Returns whether a row existed.

### 2.5 The `expression` pack — **EmoteSeeder dies**

1. Scaffold `packages/content/expression/` (`root: /expression`, `dependsOn: [platform]`).
2. Split `mud/config/emotes.yaml` (34 entries) into `content/emotes/<verb>.yaml`, one file each, `aliases:` → `searchTerms:`, everything else verbatim. Write it with a throwaway script in the scratchpad (never committed): parse the aggregate, `YAML.stringify` each entry minus `verb` (the basename is the key — keep `verb:` in the file too; the reader requires equality). Preserve the section comments as a `README.md` in the pack.
3. `git rm packages/server/src/mud/config/emotes.yaml`; delete `backend/EmoteSeeder.ts`; drop the `AppBootstrap` call; register the dep; `pnpm install`.
4. `invalidateDocumentKind('emote')` → `SoulApi.invalidateCache()`.
5. `mud/bootstrap.ts`'s SoulCatalogue entry comment: "warms from `documents {kind: emote}`".

### Tests (step 2)

- `backend/__tests__/PersistenceManager.collapse.test.ts` — `planCollapses` over name sets; faked `db`: rows copied with `_id` preserved, `aliases` stripped, `path: /emotes/<verb>`, `kind: emote`, `sourcePack` carried when present; `drop` called once; second invocation (collection absent) → zero calls, no log line (**two-boot idempotence at the migration layer**).
- `PackLogic.document.test.ts` grows the **flat-key matrix for `emote`**: the five cells; **adoption by natural key** — a pre-seeded row at `/emotes/grin` (the provisional path, unstamped) is adopted by a pack with `root: /expression` → same `_id`, `path: /expression/emotes/grin`, `owner: /expression`, stamped; two packs shipping `grin` → the second fails `flat-key` pre-write (extend `PackLogic.flatkey.test.ts` with one document case); a file whose `verb` ≠ basename fails at `read`.
- `mud/obj/__tests__/SoulCatalogue.test.ts` (existing — rewrite the fixture from `Emote.find` stubs to `DocumentApi.listOfKind` stubs): `resolve('grin')` null when `grin` is only a search term; `search('grin')` finds the emote; `snapshot()` has `searchTerms`, no `aliases`; `mint` calls `DocumentApi.save('/emotes/<verb>', 'emote', …)` (spy) and the cache indexes it; `delete` calls `DocumentApi.delete`.
- `mud/obj/api/__tests__/DocumentLogic.test.ts` (existing or new): `delete` refused by the gate for a stranger, admitted under self-home.
- `SoulController` tests: `soul search`, `soul edit x searchTerms "a,b"`.

*Exit: the flat-key exemplar ships.*

---

## Step 3 — the collapse, part 2: recipes + name banks; **RecipeSeeder dies**

Commits: `refactor(persistence): migrate recipes + name_banks into documents; drop the collections` · `refactor(pack): name-banks ride the document kind` · `feat(pack): generic-objects pack (recipes); retire RecipeSeeder`.

1. `COLLAPSES` gains the two rows from 2.1. `Collections.Recipes` and `Collections.NameBanks` removed from the enum with their policy / reset / index rows.
2. **`Recipe`** (`lib/craft/Recipe.ts`) → value shape: drop `extends Document`, `collectionName`; keep `fieldMeta` only if the wiki/spoiler machinery reads it off the class (it does — `spoiler: 1` on the level-1 fields; keep the static, it is metadata, not persistence — note this in the doc comment); add `path`, `static fromDocument(doc)`, `toData()`. `RecipeCatalogue.warm()` → `DocumentApi.listOfKind('recipe')`; add `invalidateCache(): void` (cache := null; `ensureCache` re-warms lazily — make `ensureCache` async-safe by having `getRecipe`/`findByKeyword`/`allRecipes`/`knows` call a sync `ensureCache` that leaves an empty map when unwarmed, exactly as today, and the go-live call `await catalogue.warm()` directly rather than relying on lazy re-warm — the read surface is sync). `CraftingLogic` reads recipes only through the catalogue (verify with `grep -n "Recipe\." CraftingLogic.ts`; it imports the type). `RecipeSeeder`'s `#validate` (non-empty `inputSlots`, string `outputTemplate`) moves into `Recipe.fromDocument` so a malformed pack file fails at `read`.
3. **`NameBank`** (`lib/species/NameBank.ts`) → value shape with the same `byKey`/`resolve`/`clearCache` statics; `byKey` first-load does one `DocumentApi.listOfKind('name-bank')` and fills the whole cache (banks are few). `Species.ts` unchanged.
4. `PackLogic`: delete `nameBankStrategy`, `NameBankFile`, `NameBankRow`, `PackContent.nameBanks`; un-gate `DOCUMENT_KINDS['name-bank']` in `readContent` (the same `content/name-banks/<key>.yaml` files, now read as `data: {given, surname, style?}` + `key` from the basename). The `species-and-names` pack needs **no file change**. On an existing dev DB the migration carried `sourcePack: species-and-names` and the record's old `/name-banks/<key>` baselines (kind `name-banks`) — the new strategy's record key is the same string `/name-banks/<key>`, but the baseline's `body` preimage changed shape (`{data:{…}}` vs `{given,surname,style}`), so the first three-way sees *file changed, DB changed, file == DB* → the **converged** cell: baseline rewritten, no write, no conflict. Assert this in the test. `result.nameBanks` in `PackReconcileResult` is retired (the boot line prints document counts per kind instead — add `documents: Record<string, number>` to the result; `AppBootstrap` prints `N document(s)`).
5. `generic-objects` pack: scaffold (`root: /generic-objects`, `dependsOn: [platform]`); split `mud/config/recipes.yaml` (11 entries) into `content/recipes/<recipeId>.yaml`; `git rm` the aggregate; delete `backend/RecipeSeeder.ts` + its bootstrap call; register the dep. `invalidateDocumentKind('recipe')` → `RecipeCatalogue.warm()` via `StuffApi.findByTemplatePath('/obj/RecipeCatalogue')`; `'name-bank'` → `NameBank.clearCache()` (the existing call moves under the switch; `resolve --take-pack` for a name-bank key routes through the same switch).
6. `mud/lib/craft/__tests__/Recipe.schema.test.ts` and `RecipeCatalogue` tests: fixtures become `StoredDocument`s / `DocumentApi.listOfKind` stubs.

### Tests (step 3)

- Collapse test grows recipes + name_banks rows (`_id` preserved; `sourcePack` carried).
- `PackLogic.document.test.ts`: name-bank pack against a store holding the migrated, stamped rows with an old-shape baseline → converged (no write, baseline body is now `{data:…}`); recipe flat-key matrix smoke (one cell — emote already proves the machine); a recipe file with empty `inputSlots` fails at `read`.
- `PackLogic.threeway.test.ts` / `flatkey.test.ts`: the existing name-bank cases are rewritten to expect `documents` rows (`rowsIn('documents')`, `kind: 'name-bank'`) — mechanical.
- `RecipeCatalogue.test.ts`: warm from documents; `invalidateCache` + `warm` picks up a new row.

*Exit: three seeders retired; the one-off collections gone.*

---

## Step 4 — the `platform` pack, part 1: settings + subjects (D6, D7); **AppSettingsSeeder and ChannelSeeder die**

Commits: `feat(pack): the settings kind (merge-missing)` · `feat(pack): platform pack — settings split by section; retire AppSettingsSeeder` · `feat(pack): the subject kind (archive-never-reap)` · `feat(pack): platform subjects Help/Global/Chat; retire ChannelSeeder`.

### 4.1 The `settings` strategy (module-private `settingsStrategy` in `PackLogic`)

- Reader: `content/settings/*.yaml`, each `{ settings: [{key, value}] }` (the `app-settings.yaml` shape verbatim); `SettingsFile { key: '/settings/<basename>', entries: {key: string}[] , relFile }`; the natural key check: a setting key claimed by two files (in any pack) is a `flat-key` failure (`flatKeyOf` cannot express a multi-key file — add an optional `flatKeysOf?(f): string[]` and make `flatKeyFailures` use `flatKeysOf ?? [flatKeyOf]`).
- `policy: 'merge-missing'`. **`computeKindPlan` branches on policy before the row loop** (**planner's choice**: one planner, a policy switch at the top — not a per-strategy `plan()` override, so the pin/record/diff plumbing stays shared): for merge-missing it loads the singleton (`PersistApi.find(Collections.AppSettings, {})`), and per file emits `{ op: 'merge', key, detail: <missing keys>, hash, body }` when any key is missing, else `{ op: 'keep', key }`; the baseline is the file body either way (so `pack diff` shows the pack's default vs the operator's value — `yours` for this kind renders the singleton's values for the file's keys). Vanish → `keep` (the value stays; the baseline drops). No conflict op is ever emitted for this policy.
- `applyKindPlan` `'merge'`: `PersistApi.save(Collections.AppSettings, { ...singleton, _id, values: {...values, ...missing} })` (`$set` by `_id`; insert when no singleton). Reported in `result.updated`? No — new result field `merged: string[]` (**planner's choice**, so the boot line and `pack status` say *merged*, not *updated*; `kept` carries the already-tuned files).
- Go-live: `AppSettings.warm()` after any merge (the cache is a full reload; `AppApi` unchanged).

### 4.2 Settings files

`packages/content/platform/` scaffold (`root: /platform`, `dependsOn: []`, README: "the seed of pack zero; installed by the ordinary installer this wave"). Split `mud/config/app-settings.yaml` (302 keys) by its `# ── <Section> ──` headings into `content/settings/<section>.yaml` (`banking.yaml`, `fasttravel.yaml`, `reactions.yaml`, …; keys before the first heading go to `core.yaml`); the per-key comments travel with their keys. Throwaway split script in the scratchpad; verify with a count (302 in, 302 out) and `pnpm lint:...` nothing (settings have no lint). `git rm` the aggregate; delete `backend/AppSettingsSeeder.ts` + its bootstrap call. `AppBootstrap`'s later `AppSettings.warm()` comment is rewritten ("the platform pack merged the defaults above").

### 4.3 The `subject` strategy (module-private `subjectStrategy`)

- Reader: `content/subjects/<name>.yaml` (the D6 shape); `SubjectFile { key: '/subjects/<basename>', name, description, audienceGroup?, board, channel, channelName, boardName, relFile }`; `flatKeysOf` = the effective names (subject title, derived channel name, derived board name).
- Target rows: `forum_subjects` (stamped `sourcePack` on the Subject row), with the channel/board reached through the subject's manifestations. `dbKeyQuery`/`stampedQuery`: `{ sourcePack }` over `Collections.ForumSubjects`; record key ↔ row via a `title` match on the file's `name`. `canonicalBody` = the file's rendered body (`{name, description, audience, board, channel, channelName, boardName}`); the DB side renders the same shape from the Subject + its manifestations (title, description, `groupRef` → the group's name, has-board, has-channel, names) so three-way compares like-for-like. `onVanish: 'archive'`.
- Apply (`insert`/`adopt`): resolve `audience.group` by name through `(await GroupApi.registry()).managed().findByName(name)` → `managed:<id>` (missing → a `reconcile` failure naming the group; wave 3 makes it `requires:`); mint through the catalogues:
  - **`SubjectCatalogue.installSubject(title, { description, groupRef | open })`** — **new**, gated `FromModule('/obj/api/PackLogic#PackLogic')`; the `ChannelSeeder` body moved in (owner `''`, `grain: 'venue'`, no backing group minted — the existing `makeSubject(owner: Stuff, …)` requires an owning Avatar and the installer has none; this is the "existing mint path" made ownerless, stated as a planner's choice).
  - channel: `ChannelCatalogue.attachChatToSubject(subject)` (existing, takes a subject, no owner) then `PersistApi.save(Collections.Channels, {_id, name: channelName})` if overridden;
  - board: `ForumsApi.createBoardOnSubject(subject, { description })` (existing); `boardName` override via `PersistApi.save(Collections.ForumBoards, {_id, name})`;
  - stamp: `PersistApi.save(Collections.ForumSubjects, { _id: subject._id, sourcePack })`.
  `update` (file changed, DB same): re-render — description/name overrides `$set` by `_id`; an organizer newly `true` is minted, newly `false` is archived. Adoption on an existing dev DB: `ChannelSeeder` rows (Subject `Help`/`Global`/`Chat`, each with an `open-chat` channel) are matched by **title** (`adoptQuery: { title }`) and stamped in place.
- `archive` op (vanish, or organizer switched off): `Subject.state = 'archived'`; `Channel` and `Board` gain `archived: boolean` fields (`fieldMeta` persistent; default false) — `ChannelCatalogue.warmCache`/`visibleChannels`/`resolveByName` and `ForumsLogic`'s board listing skip archived rows; entries stay. Never a delete.
- Go-live: `SubjectApi.invalidateCache()` / `ChannelCatalogue.warmCache()` (both exist) after any subject change.

### 4.4 Subject files — **ChannelSeeder dies**

`packages/content/platform/content/subjects/{help,global,chat}.yaml`:
```yaml
name: Help
description: Questions and answers for new players.
channel: true
```
(no `board`, no `audience` — open standalone, as today). `git rm mud/config/channels.yaml`; delete `backend/ChannelSeeder.ts` + its bootstrap call. The pack is registered in `server/package.json` at 4.2.

### Tests (step 4)

- `PackLogic.settings.test.ts` (harness gains an `app_settings` singleton fixture + `writeSettingsFile`): fresh store → one `merge` per file, singleton holds every key, record baselines each file; a tuned key (`reactions.threshold: "99"`) survives a changed pack default → `kept`, **no conflict**, value unchanged; a new key in a later file version merges; vanished file → `keep`, value stays, baseline dropped; two files claiming one key → `flat-key` failure; `AppSettings.warm` spy fires on merge only.
- `PackLogic.subject.test.ts` (harness + spies on `SubjectCatalogue.installSubject`, `ChannelCatalogue.attachChatToSubject`, `ForumsApi.createBoardOnSubject`, `GroupApi.registry`): à la carte minting (board only / channel only / both / neither); derived vs overridden names; `audience.group` resolves by name, missing group fails the pack pre-write; **archive-never-reap**: file vanishes → `Subject.state === 'archived'`, `Channel.archived === true`, rows and entries still present, result reports `archived`; effective-name collision across two packs fails `flat-key`; adoption of seeder-shaped rows by title (`_id` preserved).
- `ChannelCatalogue`/`SubjectCatalogue` tests: archived rows are invisible to `resolveByName`/`visibleChannels`; `installSubject` refused from a non-PackLogic caller (gate test on the `FromModule` precedent).
- Config verb test (`ConfigController.test.ts`) unchanged — it reads the singleton.

*Exit: five seeders retired; the proto-pack-zero exists.*

---

## Step 5 — the blueprint split (D10); **BlueprintSeeder dies**

Commit: `refactor(studio): BlueprintCatalogue.rebuild() + curated blueprints as platform documents; retire BlueprintSeeder`.

1. **`BlueprintCatalogue.rebuild()`** (`obj/BlueprintCatalogue.ts`, public, run from `postRegister` before `warm()`): `#deriveSkeleton` + `#reapOrphans` moved in verbatim (module-private functions in the catalogue file, the same bodies: `PersistenceManager.getCollection(Content).distinct('class')` is a **backend** import — illegal in `obj/`; replace with `TemplateApi.distinctClasses()` — **new** static on `api/template.ts` → `TemplateLogic` → `PersistApi.distinct(Collections.Content, 'class')` (add `distinct` to `PersistApi` if absent; it forwards to PM — one Api method, no new file). `Blueprint` **stays** a `Document` on `blueprints` (the derived cache). The orphan-reap log line keeps its exact `deleteMany` text.
2. **Curated overlay → documents.** `warm()` reads `Blueprint.find({})` (derived) AND `DocumentApi.listOfKind('blueprint')`; for each curated document: introspect `classPath` when present (the seeder's `#curatedOverlay` logic, moved in), compute the signature; if a derived row matches → **bless in place** (`$set` name/kind/parent/description/blessed/classPath via `bp.save()` — a cache write, idempotent because it only fires on an un-blessed or drifted row, exactly as today); if none matches → an in-memory curated `Blueprint` value (`Blueprint.fromDocument(doc)`, NOT saved to `blueprints` — the curated layer's source of truth is the document). `upsert` unchanged. Add `invalidateCache()` → `await this.warm()` (the go-live hook).
3. **`StudioLogic.publishBlueprint`** → `DocumentApi.save('/blueprints/' + blueprintId, 'blueprint', data)` where `data` is the curated shape (`blueprintId, name, kind, baseClass, mixinNames, classPath, parent, blessed, description`), then `catalogue.upsert(bp)`; the `ProvenanceApi.recordAuthoring` on the synthetic path is **dropped** (`DocumentApi.save` records provenance keyed on the document path — one ledger row, not two). `BlueprintWriteResult` unchanged. The `/blueprints/` mint branch is the same untitled-⇒-state convention as `/emotes/` (an author publishing must be a member of the state's group, which `isAuthor` already demands).
4. The `platform` pack: `content/blueprints/<blueprintId>.yaml` × 10 from `mud/config/blueprints.yaml` (entry minus nothing — `blueprintId` stays in the file); `git rm` the aggregate; delete `backend/BlueprintSeeder.ts` + its bootstrap call. `invalidateDocumentKind('blueprint')` → `BlueprintCatalogue.invalidateCache()`.
5. Existing dev DB: the 10 curated rows in `blueprints` already carry `blessed: true`; the documents insert fresh (no migration for blueprints — the requirements list three legacy collections, and `blueprints` stays); warm sees the blessed derived rows and does nothing to them. State this in the commit message.

### Tests (step 5)

- `mud/obj/__tests__/BlueprintCatalogue.test.ts`: `rebuild()` derives one concrete row per distinct class (`TemplateApi.distinctClasses` + `StuffApi.loadClassByPath` stubbed), dedupes on signature, skips a drifted id, reaps an unresolvable derived row and never a blessed one, logs the `deleteMany` line once; `warm()` blesses a derived row from a curated document by `classPath` (spy on `save`, fires once, not on the second warm); a pure-composition curated document is resolvable by id and signature without a `blueprints` row.
- `StudioLogic.test.ts`: `publishBlueprint` calls `DocumentApi.save('/blueprints/<id>', 'blueprint', …)` and `upsert`; denial for a non-author unchanged.
- `PackLogic.document.test.ts`: blueprint flat-key smoke (one cell).

*Exit: six seeders retired; 2a's seeder list is done.*

---

## Step 6 — `arcane-library` and the five `corpo-<key>` packs (template `git mv`s)

Commit: `feat(pack): arcane-library + corpo-{aevex,goodkin,hollis,veshko,vionne} packs`.

All six are the domain kind (template paths unchanged); the installer adopts existing rows in place. Every pack: `package.json`, `pack.yaml`, README, `server/package.json` dep line; `pnpm install` once at the end.

1. **arcane-library** (`root: /arcane-library`, `dependsOn: [platform]`): `git mv` the 12 files `mud/seeds/obj/magic/Spell/*.yaml` → `content/obj/magic/Spell/`, plus `mud/seeds/obj/magic/GlowlightOrb.yaml` and `SparkSource.yaml` → `content/obj/magic/`. Exactly 14 rows. `mud/seeds/obj/SpellCatalogue.yaml`, `obj/command/magic/SpellsController.yaml`, and `obj/items/primer-of-glowlight.yaml` **stay** (registry / controller / an item, not the library). `SpellCatalogue` warms from `/obj/magic/Spell/` rows in `content` regardless of who wrote them — no code change.
2. **corpo-<key>** × 5 (`id: corpo-aevex`, `root: /corpo/aevex`, `dependsOn: [platform]`, …): `git mv mud/seeds/obj/corpo/Corpo/<key>.yaml → packages/content/corpo-<key>/content/obj/corpo/Corpo/<key>.yaml`, and each Brand whose `data.owner` is that key: aevex ← `aevex-zero`; goodkin ← `goodkin-reserve`; hollis ← `hollis-cane`, `old-hollis`; veshko ← `volk`; vionne ← `vionne-noir`, `vionne-rouge`. ⚠ `Brand/crowsfoot-gin.yaml` has `owner: ""` (independent, "carried by no corpo") — it **stays in `seeds/`** with the two `demo/*-bottle.yaml` files (flagged in the summary: the requirements' "its Brand rows" leaves one ownerless brand behind; moving it into a corpo pack would misattribute it). The `mud/bootstrap.ts` `/corpo/<key>` Organization entries and `config/groups.yaml` board rows stay platform-seeded (D12).
3. Repoint the tests that read the moved files from disk: `mud/obj/__tests__/SpellCatalogue.test.ts` (`SPELL_SEEDS_DIR` → the pack), `mud/domain/lounge/__tests__/bar-content.test.ts` (`BRAND_DIR` → the union of the five packs' `Brand/` dirs, plus `seeds/obj/corpo/Brand/` for crowsfoot), `mud/seeds/__tests__/corpo-organizations.test.ts` (Corpo files → the packs). `scripts/check-blessed-bands.ts` walks `mud/seeds` — check whether it inspects magic rows (`grep -n magic`); if so, add `packages/content/*/content` to its roots. `lint:instanceable` auto-discovers the new roots.

### Tests (step 6)

- The repointed tests green; `pnpm lint:instanceable`; a `PackLogic.record.test.ts` case is unnecessary (the domain kind is already covered); the **drive** at step 11 proves the adoption on a dev DB (14 + 13 `adopted`, all-zero second boot).

---

## Step 7 — `DocumentLogic.gateMutation` → `ParcelApi` (D11)

Commit: `feat(access): AccessApi.canAtPath; the document store gates on parcel title`.

1. `api/access.ts`: `export type TreeAction = 'write-document' | 'write-template' | 'write-source';` (closed; the A22.1 vocabulary — only the first is wired); `public static async canAtPath(subject: Stuff | null, action: TreeAction, path: string): Promise<boolean>` → `asAuthorityQuery(() => logic().canAtPath(...))`; `AccessLogic.canAtPath` forwards to `AccessRegistry.canAtPath` (gated `AccessApiCallers` like `can`).
2. `obj/AccessRegistry.ts`:
   ```ts
   @CallSecurity(AccessApiCallers)
   public async canAtPath(subject: Stuff | null, _action: TreeAction, path: string): Promise<boolean> {
     if (subject === null) return false;
     const memberKey = this.memberKeyOf(subject);
     if (memberKey === null) return false;
     const owner = await ParcelApi.ownerOf(path);          // rung 1 title, rung 2 self-home, rung 3 the state
     return this.subjectIsOwnerMember(subject, memberKey, owner);   // the `can()` dispatch, verbatim
   }
   ```
   No zone step, no `core` literal — `ownerOf`'s rung 3 IS the state default.
3. `obj/api/DocumentLogic.ts`: `gateMutation` becomes
   ```ts
   if (actor !== null && isOwnHomePath(actor, path)) return null;
   if (!(await AccessApi.canAtPath(actor, 'write-document', path))) return "you don't have permission to write that document";
   return null;
   ```
   Delete the `ZoneApi` import and the `canMutateZone` / `can(…, null)` branches. The acceptance grep: `grep -n "resolveZoneForPath\|canMutateZone\|can(actor, \"write\", null)" DocumentLogic.ts` → nothing.

### Tests (step 7)

- `mud/obj/__tests__/AccessRegistry.canAtPath.test.ts` (stub `ParcelApi.ownerOf`, `ParcelApi.resolveOwnerRef`, `GroupApi.isMember`): a path under a parcel the actor's group holds → true; another group's parcel → false; `/home/<self>/x` → true via rung 2 (player owner identity match); untitled path → the state group's membership decides; null subject → false; NPC → false.
- `DocumentLogic.test.ts`: `save` admitted/refused per the three cases through the real `gateMutation` with `AccessApi.canAtPath` spied; the self-home short-circuit never calls `canAtPath`.
- `WikiRegistry`/`CmsLogic` document paths unaffected (they call `DocumentApi.save`; the CMS tests stubbing `AccessApi.can` for document writes must now stub `canAtPath` — grep `CmsLogic.test.ts` for `can`).

---

## Step 8 — `lint:test-content` + the four eternal fixture shrinks + the CLAUDE.md exclusion (D13)

Commits: `chore(lint): lint:test-content (warn-only, shrinking allowlist)` · `test: synthetic /test fixtures for the four kernel-tree eternal tests`.

1. `packages/server/scripts/check-test-content.ts` (the `check-test-bootstrap.ts` shape: walk + pure decision + modes): scan roots `packages/server/src`, `packages/server/scripts/__tests__`, `packages/client/src`; test files by the same `TEST_FILE_RE`; **skip** `packages/content/**` and `e2e/**`; offender = a file whose text matches `/\/domain\/[a-z]/`. Allowlist `packages/server/scripts/test-content-allowlist.txt` (one repo-relative path per line, sorted; generated once now from the current ~100 offenders — `grep -rl "/domain/" --include='*.test.ts'` minus `mud/domain/`). Rules: an offender **in** the list → counted, warned; an offender **not in** the list → error (exit 1, even in warn mode — "the list only shrinks"); a listed path that no longer offends (or no longer exists) → reported as *stale — remove it* and, **planner's choice**, also exit 1 (a stale entry is a shrink somebody forgot to record; the fix is deleting the line, which is the direction we want). `--lint` = CI mode (the above); default = full report. `package.json`: `"lint:test-content": "tsx scripts/check-test-content.ts --lint"`; add to the CI validate job beside `lint:test-bootstrap` (`.gitlab-ci.yml` — find the lint line and append).
2. Export the decision core `classify(files: {path, text}[], allow: string[]): { warned: string[]; newOffenders: string[]; stale: string[] }` and test it in `scripts/__tests__/check-test-content.test.ts` (four cases + "allowlist-only-shrinks": a new offender fails, a removed line passes, a stale line fails).
3. The four kernel-tree tests naming `/domain/eternal/**` — identified by `grep -rl "/domain/eternal" packages/server/src --include='*.test.ts' | grep -v mud/domain/`: `mud/lib/behavior/__tests__/crossing-ritual.test.ts`, `mud/obj/__tests__/crossing-objects.smoke.test.ts`, `mud/seeds/__tests__/room-archetypes.test.ts`, `mud/api/__tests__/command-migration.test.ts`. Each gets synthetic fixtures under `/test/**` ("ugly on purpose": `/test/ritual/threshold`, `/test/archetype/room-a`, …) built in-test with the harness the file already uses; where the test's *purpose* was to check the real eternal content (room-archetypes, command-migration's domain-cmd walk) the real-content half moves out — it is ring 2 by A26's discipline and the files it reads move in step 9 anyway — leaving the kernel assertion on the synthetic fixture. Remove the four lines from the allowlist.
4. CLAUDE.md: the full-suite `git status` grep becomes `grep -vE '^.. (docs/|CLAUDE\.md|.*\.md$|packages/content/)'` — an index-file edit, so **write it at the sweep (step 11)** and say so in the step-8 commit; `docs/testing.md` (not an index file) gets the same line now.

### Tests (step 8)

- `check-test-content.test.ts` as above; `pnpm lint:test-content` exits 0 with the count; the four files no longer match the regex.

*Exit: 2a complete.*

---

## Step 9 — the `command-view` kind on the strangler (D8)

Commits: `feat(command): store-first command views with disk fallback + the fallback counter` · `feat(document): the command-view code-naming gate` · `feat(pack): command views are platform content (git mv mud/cmd)`.

### 9.1 `CommandLogic` — store-first

- Two module-private mappers: `docPathOf(viewKey)` (`perception/look.yaml` → `/cmd/perception/look`; `domain/eternal/duncan-hall/cmd/provision.yaml` → `/domain/eternal/duncan-hall/cmd/provision`) and `viewKeyOf(docPath)` (the inverse). The `commands` Map stays keyed by the view key (the `commandContributions` string, the dispatcher's key) — the document path is the store's key only.
- `CommandDefinition.fromView(view: unknown, filePath: string)` — **new** static (`lib/command/CommandDefinition.ts`): `validateCommandView` + construct; `fromYaml` becomes parse-then-`fromView`. `filePath` for a store-served view is `join(MUD_ROOT, viewKey)` — it only labels errors and anchors relative validator refs (core views use absolute refs only; verified by grep).
- `preloadAll` (async): **first** `DocumentApi.listOfKind('command-view')` → for each, `commands.set(viewKeyOf(doc.path), CommandDefinition.fromView(doc.data, …))` (a malformed stored view is a `failed` entry, not a throw — the pack gate keeps them out); **then** the existing disk walks over `CMD_DIR` + `DOMAIN_DIR`, **skipping keys already in the map** and counting each disk hit into a module-level `diskServed: Set<string>`. Log once: `CommandApi: N command view(s) served from disk — not yet content: <keys>` (the keys listed; N=0 prints nothing). ⚠ `CMD_DIR` (`mud/cmd`) will not exist after 9.3 — the `readdirSync` failure is already caught and logs an error; change it to a silent skip when the dir is absent (the domain walk already is).
- `getCommand(viewKey)` stays **sync** and disk-fallback: a miss after preload reads disk (counted). `CommandApi.diskFallbacks(): string[]` — **new** static (forwards to the logic) — consumed by `PackController.executeStatus`, which prints `N command view(s) still served from disk: …` after the pack list (`pack status` surfaces the count; the `PackStatusReport` type is untouched — it is a `CommandApi` read at the controller).
- **The invalidation hook.** `CommandApi.invalidate(viewKey)` keeps its sync signature (drops the entry). New `CommandApi.reload(docPath): Promise<boolean>` → `CommandLogic.reload`: `invalidate(viewKeyOf(docPath))`, then `DocumentApi.read(docPath)` → `fromView` → `resolveCommandValidators` + `validateCommandEffects` → set; returns whether the store had it (else the next `getCommand` falls to disk). ⚠ The requirements name `CommandApi.invalidate(viewKey)` as the hook; `invalidate` is synchronous and cannot read the store, so the hook `DocumentLogic` and the go-live call is `reload`, which *begins* with `invalidate` — flagged in the summary as a naming deviation, not a behavioral one. `DocumentLogic.saveImpl`: after `doc.save()`, `if (kind === 'command-view') await CommandApi.reload(path)`. The document strategy's go-live: `invalidateDocumentKind('command-view')` → `CommandApi.reload(path)` per changed path (+ `invalidate` per deleted path).

### 9.2 The code-naming gate (`DocumentLogic`)

In `saveImpl`, before the write, for `kind === 'command-view'` only:
```ts
const existing = await StoredDocument.findByPath(path);
if (codeFieldsChanged(existing?.data, data) && !(await AccessApi.isWizard(actor))) {
  throw new Error("changing a command view's controller or validators names TypeScript — that is wizard code trust (see access.md)");
}
```
`codeFieldsChanged(prev, next)`: `controller` string inequality, or `validators` (top-level and per-subcommand — walk `subcommands.*.validators` and `args[].requires`/`options` `requires` the way `validateCommandEffects` walks them) as a **set** not a subset of the previous (the `TemplateLogic` brain rule's shape: adding a gate is a code act; removing one too — **planner's choice**: any change, not subset-only, because a validator is a gate and removing one widens dispatch). A new document (`existing === null`) whose `controller` is set → the same check against `{}` (a non-wizard cannot mint a verb pointing at a controller). Installer writes go through `PersistApi` directly and never see this — bootstrap-exempt like templates. Also here: `CommandApi.validateCommandView(data)` at save → a malformed view is refused at the chokepoint (the CMS path).

### 9.3 The pack move — **`mud/cmd` is gone**

1. Un-gate `DOCUMENT_KINDS['command-view']` in `readContent`: `content/cmd/**/<verb>.yaml` (recursive; **exclude** `cmd/__tests__/` and `command.schema.json` — the schema stays in the kernel: `git mv mud/cmd/command.schema.json mud/lib/command/command.schema.json` and repoint `commandSpecValidator()`; the `mud/cmd/__tests__/` files move to `mud/lib/command/__tests__/` with a `git mv` — they are kernel tests of the parser, not content), and `content/domain/**/cmd/<verb>.yaml`. Path = **the view key's document path** (no `root` join — the factory takes a `pathOf` override for this kind: `docPathOf` of the content-relative file). `data` = the parsed YAML; `CommandApi.validateCommandView(data)` runs in the reader (a malformed view fails the pack at `read` — the fold already exists; `PackLogic` is obj/api, allowed to import `CommandApi`).
2. `git mv packages/server/src/mud/cmd packages/content/platform/content/cmd` (195 files, 24 category dirs; the two kernel artifacts above are moved *first*, separately). Eternal's and terminus's `mud/domain/**/cmd/` views stay on disk (their packs are wave 4) — they are the expected fallback residue (7 keys today: duncan-hall ×3, university-avenue ×4).
3. Repoint every reader of `mud/cmd`: `scripts/check-arg-kinds.ts` `ROOTS` gains every `packages/content/*/content/cmd` (discover like `check-instanceable-placement.ts` does); `mud/lib/command/__tests__/CommandExamples.test.ts` `CMD_ROOT`, `mud/api/__tests__/controller-seeds.integrity.test.ts` `CMD_ROOT`, `mud/api/__tests__/sandbox.guests.test.ts` (the "gains no sandbox file" walk), `mud/api/__tests__/command-migration.test.ts` `CMD_DIR` → the platform pack's `content/cmd` (real-pack path; ⚠ these are ring-2-shaped and stay where they are this wave, flagged with the A32.2 scaffolding comment the newbie-wilds test carries). `HelpCatalogue` reads `CommandApi.allDefinitions()` — unchanged. `CmsLogic`'s source tree does not list `cmd/` (verified) — unchanged.
4. `AppBootstrap`: `CommandApi.preloadAll()` already runs after `PackApi.install()`; log line unchanged plus the disk count.

### Tests (step 9)

- `mud/obj/api/__tests__/CommandLogic.store.test.ts` (`DocumentApi.listOfKind`/`read` stubbed; a temp `CMD_DIR` is not injectable — test the map + counter): preload serves stored views and sets no disk count for them; a key absent from the store and present on disk counts; `reload(docPath)` replaces the cached definition (help text changes); `invalidate` then `getCommand` falls to disk and counts; `diskFallbacks()` lists keys.
- `DocumentLogic.commandView.test.ts`: non-wizard save changing `controller` refused; wizard admitted; non-wizard cosmetic (help text) admitted; validators set change refused for a non-wizard; malformed view refused; a `command-view` save calls `CommandApi.reload` (spy).
- `PackLogic.document.test.ts`: a fixture pack with `cmd/perception/look.yaml` → row at `/cmd/perception/look`, `data` = the view; a malformed view fails `read`; a `domain/x/y/cmd/z.yaml` in a fixture is a command-view, not a template (the domain walk skips `cmd`).
- `PackController.test.ts`: `status` prints the disk-fallback line.
- Drive (step 11): `help look` served from the store; CMS edit of `look.yaml`'s help → `help look` changes without restart; `pack status` shows 7 fallbacks.

*Exit: verbs are content; fallback count = the domain-local residue.*

---

## Step 10 — the `wiki` kind (D9) + `wiki-starter`; **WikiSeeder dies**

Commits: `feat(wiki): system-principal create/edit for the installer` · `feat(pack): the wiki kind (CAS submit); wiki-starter pack; retire WikiSeeder`.

### 10.1 `WikiRegistry` — the installer as `system`

⚠ As written, D9 cannot run: `createPage`/`editPage` are gated `FromModule('/obj/command/system/WikiController')`, and `satisfies()` returns **false for a null actor**, so a boot-time call throws `WikiDenied` before touching a page. **Planner's choice** (flagged in the summary): (a) the gate widens to `SecurityPolicies.AnyOf(WikiControllerOnly, SecurityPolicies.FromModule('/obj/api/PackLogic#PackLogic'))` on exactly `createPage` and `editPage`; (b) both take an extra `opts.asSystem?: boolean` that skips `assertMayEditNamespace`/`assertMayEdit` and stamps `'system'` (what `actorKey()` already returns for a null actor). Only the installer can reach the option because only the two callers pass the gate and `WikiController` never sets it; a comment on the option says so. `lint:gates` validates the new string.

### 10.2 The `wiki` strategy (module-private `wikiStrategy`, `policy: 'cas'`, `onVanish: 'keep'`)

- Reader: `content/wiki/<namespace>/<slug>.md`; split YAML frontmatter (`---\n…\n---\n`) with the `yaml` lib (PackLogic is the importing tier) into `{ title, subject?, tags?, related?, spoilerLevel?, aliases? }` + `body`; `WikiFile { key: '/wiki/<ns>/<slug>', namespace, slug, front, body, relFile }`; `flatKeysOf` = `[ '<ns>:<slug>' ]`.
- Record baseline: `PackRowBaseline` gains `rev?: number` (`pack.ts`); `canonicalBody` = `canonical({ front, body })`. `PackConflict.reason` gains `'wiki-cas'`.
- Plan (the `cas` branch of `computeKindPlan`): resolve the page via `WikiRegistry.resolve` (by slug OR alias — the seeder's rename-safe rule); absent → `{ op: 'submit', detail: 'create' }`; present and `fileHash === baseline.hash` → nothing; present, file changed → `{ op: 'submit', detail: 'edit', baseRev: baseline.rev }` — the CAS is decided at **apply** (the registry throws); a file whose baseline is missing (adoption of a seeder-made page) → `normalize` with `rev = page.rev`. Vanish → `keep` (baseline dropped, reported).
- Apply `'submit'`: `createPage({ namespace, slug, title, body, subject, tags, related, spoilerLevel, summary: 'installed by pack <id>' }, { asSystem: true })` → baseline `{hash, body, rev: 1}`; `editPage(page, body, { baseRev, summary, asSystem: true })` → baseline `rev = page.rev`; on `WikiConflict` → a `PackConflict { reason: 'wiki-cas', baselineHash, dbHash: hashOf(canonical({front: pageFront, body: page.body})), packHash }` in the record + the diagnostic (the message says `pack diff` shows both bodies). Frontmatter changes (`tags`, `related`, …) on an existing page are applied as field `$set`s beside the body edit through the same `editPage` call (extend it with an optional `fields` bag, applied under `asSystem` only — or, if that widens too much, leave metadata edits to the create only and say so; **planner's choice: the bag**).
- `diff` for a wiki key: `yours` = the live page `{front, body}` canonical; `theirs` = the file; `baseline` = the record. `resolve --take-pack` → `editPage(page, body, { baseRev: page.rev, asSystem })` (an edit over the current rev — the history keeps both), rebaseline; `--keep --pin` → pin; `--export` → write frontmatter + `page.body` to `<root>/content/wiki/<ns>/<slug>.md`.
- Go-live: none (`WikiRegistry` reads pages per request).
- `AppBootstrap`: the wiki strategy runs inside `PackApi.install()`, which is **before** `ParcelSeeder` today — `asSystem` bypasses the namespace protection walk, so the ordering the `WikiSeeder` comment worried about no longer matters; note it in the commit.

### 10.3 `wiki-starter` — **WikiSeeder dies**

`packages/content/wiki-starter/` (`root: /wiki`, `dependsOn: [platform]`); the 7 pages from `mud/config/wiki-pages.yaml` as `content/wiki/<ns>/<slug>.md` (frontmatter from the entry's fields, body verbatim — the file's markdown teaching note travels to the README); `git rm` the aggregate; delete `backend/WikiSeeder.ts` + its call. Existing dev DB: the 7 seeder-made pages exist with `rev ≥ 1` → the adoption bridge normalizes each baseline with the live `rev` (no edit submitted — the acceptance criterion's "second boot is a no-op").

### Tests (step 10)

- `PackLogic.wiki.test.ts` (harness + a stubbed `WikiRegistry` singleton via `StuffApi.findByTemplatePath` with in-memory pages: `resolve`, `createPage`, `editPage` implementing the rev check): absent → create at rev 1, baseline rev 1; unchanged file → nothing; changed file over an unchanged page → `editPage` with `baseRev` = baseline rev, new rev, baseline updated; changed file over a player-edited page (rev bumped) → `WikiConflict` → `wiki-cas` conflict recorded, page untouched, diagnostic once; `pack diff` returns all three bodies; `resolve --take-pack` edits over the current rev and clears; `--export` writes frontmatter + body; vanish → `kept`, page present; a seeder-shaped existing page adopts with `rev` in the baseline; a slug renamed to an alias resolves (no duplicate create).
- `WikiRegistry.test.ts`: `createPage` from a non-listed module refused (gate); `asSystem` stamps `system` and skips protection; the same option from `WikiController` is not exercised (assert the controller never passes it — a grep-style test on the controller source is acceptable here).

*Exit: 2b complete; seven seeders retired.*

---

## Step 11 — docs, the one full suite, the drive, the MR

Commit: `docs(pack): content packs wave 2 — subsystem docs` (+ the pre-merge sweep later per workflow.md).

- **Docs** (each the source of truth for its area; write the *shipped* shape): `content-packs.md` (the document kind + `DocumentKinds`, `root:`, the per-kind policy table — three-way / merge-missing / archive / cas — adoption by natural key, the collapse migration, the ten packs in the shipped list + Key files, the fallback counter); `document-store.md` (the closed kind vocabulary, `canAtPath` gate, `delete`, the command-view code gate, the kind-scoped indexes + reset policy); `emotes.md` (documents-backed, `searchTerms`, aliases dead, `soul search`); `crafting.md § recipes` (documents-backed, `generic-objects`); `studio.md § blueprints` (`rebuild()`, the curated document layer, `publishBlueprint` via `DocumentApi`); `command-spec.md` + `command-routing.md` (store-first, the view key ↔ document path, `reload`, the wizard gate on `controller:`/`validators:`, where views live now); `wiki.md` (the wiki kind, `asSystem`, CAS conflicts as pack conflicts); `app-settings.md` (the settings kind replaces the seeder section); `chat.md` + `forums.md` (the subject kind, `installSubject`, `archived`); `access.md` + `parcel.md` (`canAtPath`, the `TreeAction` vocabulary); `testing.md` (`lint:test-content`, the `packages/content/` exclusion). CLAUDE.md's collection list (`emotes`/`recipes`/`name_banks` gone; `documents` line grows the kinds), the lint-family entry for `lint:test-content`, the full-suite grep exclusion, and the "Command YAML views" naming paragraph (`mud/cmd/` → `packages/content/platform/content/cmd/`) are **sweep-time** index edits.
- Gates: `pnpm build`, `lint:gates`, `lint:instanceable`, `lint:imports`, `lint:module-scope`, `lint:pm`, `lint:test-bootstrap`, `lint:arg-kinds`, `lint:topics`, `lint:test-content` — all green.
- **One** full `pnpm test`.
- **Drive** (recorded on the MR, in this order): (1) boot against the dev DB — three collapse lines, adoption lines for every new pack, the disk-fallback line listing the 7 domain-local keys; (2) second boot — no migration line, every pack all-zero; (3) `pack status` as a `pack-installers` member lists **fourteen** packs; (4) `;grin` does not dispatch, `;wave` fires, `soul search grin` finds the emote; (5) `make martini` at Dave's Bar resolves the `generic-objects` recipe; (6) `help look` renders; edit `look.yaml`'s help through the CMS (as a wizard for the smoke, then as a non-wizard changing `controller:` → refused) → `help look` changes without a restart; (7) `wiki` opens a `wiki-starter` page; (8) `config` shows a platform-seeded key; `chat` lists Help/Global/Chat.
- Push; open the MR (workflow.md phase 3) with the acceptance table below filled in.

---

## Acceptance-criteria mapping

| Criterion (requirements doc) | Step | Test / verification |
|---|---|---|
| Fresh DB: fourteen packs installed + recorded; `documents` holds every emote/recipe/name-bank/blueprint/script/command-view row with kind/sourcePack/path; the three legacy collections absent | 1–6, 9, 10 | per-kind `PackLogic.*.test.ts` fresh-store cases; drive (1)(3) |
| Existing dev DB: one boot migrates + adopts by natural key (`_id` preserved) + drops, one loud line each; second boot no-op — migration, record, per-kind layers | 2, 3 | `PersistenceManager.collapse.test.ts` (two-run); `PackLogic.document.test.ts` adoption-by-natural-key + converged name-bank + second-run; drive (1)(2) |
| Per-kind three-way: `emote` + `script` full matrix; `settings` merge-missing (`kept`, no conflict); `subject` archive-never-reap; `wiki` CAS both branches with three bodies in `diff` | 1, 2, 4, 10 | `PackLogic.document.test.ts`, `PackLogic.settings.test.ts`, `PackLogic.subject.test.ts`, `PackLogic.wiki.test.ts` |
| Emotes: no `aliases` in server source/content; `;grin` does not dispatch; `soul search grin` finds it; `AliasMixin` works; `SoulLogic.mint` writes `documents {kind: emote}` | 2 | grep gate; `SoulCatalogue.test.ts`; existing `Alias.test.ts`; drive (4) |
| Command views: every `/cmd/**` from the store, fallback = domain-local residue listed; CMS edit of `look.yaml` help live without restart; non-wizard `controller:` change refused, wizard admitted | 9 | `CommandLogic.store.test.ts`, `DocumentLogic.commandView.test.ts`, `PackController.test.ts`; drive (6) |
| Document gate: no `resolveZoneForPath`/`canMutateZone`/`can(…, null)` in `gateMutation`; own-parcel admitted, other's refused, `/home/<self>` admitted via `canAtPath` | 7 | grep gate; `AccessRegistry.canAtPath.test.ts`; `DocumentLogic.test.ts` |
| Seven seeders + six `config/*.yaml` + `domain/lounge/scripts/` deleted; `AppBootstrap.run` calls none; `mud/cmd/` gone | 1–5, 9, 10 | `git ls-files` at step 11; `AppBootstrap.ts` diff |
| `lint:test-content` in CI warn-only; allowlist exists; four eternal tests clean; shrink-only check tested | 8 | `check-test-content.test.ts`; `.gitlab-ci.yml` diff |
| Lint family + one full suite green; `pnpm build` clean | 11 | CI + one `pnpm test` |
| Docs updated; CLAUDE.md at the sweep | 11 + sweep | doc diff |
| Drive list | 11 | recorded on the MR |

---

## Risks & ordering constraints

- **The reset policy.** Without the `Documents.keep` widening in step 1, every pack-installed document is wiped at the nightly reset and the packs re-insert them next boot as fresh `_id`s — the emote/recipe rows would "work" while silently losing any operator edit every night. The step-1 test locks it.
- **`stampedQuery` is load-bearing.** `computeKindPlan`'s `{ sourcePack }` query over `documents` must be kind-scoped or a pack shipping two document kinds deletes one kind as the other's vanished files. Step 1's test includes a two-kind fixture pack.
- **Migration before indexes, indexes before install.** The collapse runs inside `connect()` before `createIndexes()` (a legacy row with a duplicate natural key would otherwise fail the unique index at boot — the migration should `insertOne` inside try/catch and log a duplicate rather than abort); `createIndexes` runs before `PackApi.install` (so adoption's `$set` of `path` cannot create a duplicate silently).
- **Strategy order in `kindsOf`.** `name-banks` must be read by exactly one strategy at every commit (step 3 swaps them in one commit); `cmd/` must be excluded from the domain walk before step 9 un-gates the command-view reader (done in step 1).
- **Sync `getCommand` vs async store.** The store is consulted in `preloadAll`/`reload`, never in `getCommand`; a `getCommand` miss falls to disk and is counted. Do not make `getCommand` async — it has ~4 call sites and the dispatcher is sync there.
- **`WikiRegistry` gate widening** is the one place this build adds a second module to a controller-only gate; `asSystem` is reachable only through it. Keep the option out of `WikiController`.
- **Two-boot idempotence** is tested at three layers again (migration, record, per-kind) and driven once; a regression re-normalizes operator divergence every boot — still the worst failure this program can have.
- **Hash stability across the name-bank re-point**: the converged cell absorbs the preimage change; a test asserts no write and no conflict. Any other preimage change in this build is a new kind (no prior baselines).
- **`--export` for `.script`/`.md`** writes text, not YAML — `resolve` branches on the strategy's `ext`.
- **The corpo brand left behind** (`crowsfoot-gin`, `owner: ""`) and the two demo bottles stay in `seeds/`; a later pass decides their home.
- **`dependsOn` on packs that do not exist yet** (`saxonberg-lounge` names the corpos at step 1): `orderByDependsOn` ignores unknown ids in v1 — harmless until step 6 creates them; do not "fix" it by adding validation this wave.

## Context budget

| Step | Files touched (approx.) | Weight |
|---|---|---|
| 1 | ~12: DocumentKinds (new), PM, ResetPolicy, PackLogic, pack.ts, harness, 2 tests, pack scaffold ×4 files, 3 `git mv`, AppBootstrap, ScriptSeeder (del), demo-content test | **heavy** (the machinery) |
| 2 | ~16: PM (migration), Collections, ResetPolicy, Emote, SoulCatalogue, SoulLogic/soul.ts, SoulController + yaml, DocumentApi/Logic (`delete`), types, 1–2 client files, 34 new files + 1 del, EmoteSeeder (del), 4 tests | **heavy** |
| 3 | ~14: PM row, Collections, Recipe, RecipeCatalogue, NameBank, PackLogic (strategy delete), pack.ts, 11 new files, RecipeSeeder (del), 4 tests | medium |
| 4 | ~18: PackLogic (two strategies), pack.ts, AppSettings warm hook, SubjectCatalogue, ChannelCatalogue, Channel, Board, ForumsLogic listing, 2 seeders (del), ~15 settings files + 3 subject files, 3 tests | **heavy** |
| 5 | ~9: BlueprintCatalogue, TemplateApi/Logic + PersistApi (`distinct`), StudioLogic, BlueprintSeeder (del), 10 files, 3 tests | medium |
| 6 | ~40 `git mv`s + 6 scaffolds + 3 test repoints + package.json | light (mechanical) |
| 7 | ~6: access.ts, AccessLogic, AccessRegistry, DocumentLogic, 2 tests | light |
| 8 | ~8: script (new), allowlist (new), package.json, CI, 4 test edits, testing.md, 1 test | light–medium |
| 9 | ~15 code + **197 `git mv`s**: CommandLogic, command.ts, CommandDefinition, DocumentLogic, PackLogic, PackController, check-arg-kinds, 4 test repoints, 4 tests | **heaviest** — do the two kernel-artifact moves first, then the bulk `git mv` as its own commit before any code |
| 10 | ~10: WikiRegistry, PackLogic (strategy), pack.ts, 7 `.md` files, WikiSeeder (del), 2 tests | medium–heavy (CAS branch) |
| 11 | ~14 docs + drive | medium (reading, not writing) |

Pace: steps 1, 2, 4, 9 are the heavy ones; a stop after 3, 5, 6, or 8 is a clean handover point (each closes a seeder set or a kernel-only change).

## Stop protocol

If stopping before step 11, the MR description (or a `docs/plans/content-pack-wave-2-plan.md` § *Build status* block appended in the last commit — one or the other, not both) states:

1. **Done:** the step numbers completed, each with its exit line from the requirements' Build sequence, and the commit range.
2. **Not done:** the remaining step numbers verbatim from the sequence, with any partially-applied step called out as *reverted* (never leave a half-step in the tree — `git revert` the partial commit(s) or finish to the next green boundary).
3. **Seeders retired so far / still running** (the seven names, two columns) and **packs shipped so far** (of fourteen).
4. **Tests:** which `test:near` scopes ran green at the last boundary; whether the full suite ran (it should not have, unless step 11 was reached — say so).
5. **Drive:** which of the eight drive items were exercised, if any.
6. **Open flags:** the planner's-choice deviations from this plan's summary that the stopping agent shipped or did not reach (reset policy, `DocumentApi.delete`, `installSubject`, `CommandApi.reload`, `asSystem`), so the reviewer knows which decisions are already in the tree.

## Critical files for implementation

- `packages/server/src/mud/obj/api/PackLogic.ts` — the factory, the policy branches, the readers, the go-live switch (the bulk)
- `packages/server/src/mud/lib/document/DocumentKinds.ts` (new) — the closed vocabulary
- `packages/server/src/backend/PersistenceManager.ts` — kind-scoped indexes (lazy import), the collapse migration; `mud/lib/persistence/{Collections,ResetPolicy}.ts`
- `packages/server/src/mud/api/pack.ts` — `root`, `rev`, `wiki-cas`, the new ops/result fields
- `packages/server/src/mud/obj/api/DocumentLogic.ts` + `mud/api/document.ts` — the `canAtPath` gate, `delete`, the command-view code gate + reload hook
- `packages/server/src/mud/obj/api/CommandLogic.ts` + `mud/api/command.ts` + `mud/lib/command/CommandDefinition.ts` — store-first, `reload`, `diskFallbacks`, `fromView`
- `packages/server/src/mud/obj/{SoulCatalogue,RecipeCatalogue,BlueprintCatalogue,SubjectCatalogue,ChannelCatalogue,WikiRegistry,AccessRegistry}.ts` — the readers, `installSubject`, `asSystem`, `canAtPath`
- `packages/server/src/mud/lib/{social/Emote,craft/Recipe,species/NameBank,studio/Blueprint}.ts` — the value shapes
- `packages/server/src/mud/obj/api/__tests__/pack-harness.ts` — dotted-key `find`, the new fixture writers
- `packages/server/scripts/check-test-content.ts` (new) + `scripts/test-content-allowlist.txt` (new)
- `packages/content/{platform,expression,arcane-library,corpo-*,wiki-starter,generic-objects,saxonberg-lounge}/` — the ten packs; `packages/server/package.json` — their registration
