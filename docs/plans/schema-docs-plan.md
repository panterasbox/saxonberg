# Schema docs — implementation plan

Executes [schema-docs-requirements.md](../requirements/schema-docs-requirements.md)
(D1–D9). Six phases. Self-contained: a fresh-context agent who has read
the requirements plus [persistence.md](../subsystems/persistence.md) and
[help.md](../subsystems/help.md) can run this without the conversation
behind it.

## Grounding (facts established by investigation, 2026-08-31)

Verify each before relying on it; each was measured, not assumed.

1. **PM already reads an in-repo YAML manifest at boot.**
   `PersistenceManager.loadHooks()` → `defaultHookManifestPath()` resolves
   `dirname(fileURLToPath(import.meta.url))` + a relative path, then
   `readFileSync` + `YAML.parse`. `backend/` may import `fs`; the mudlib
   may not. This is the mechanism, already present.
2. **`SourceTreeApi` is the mudlib's sanctioned file fold and it can
   LIST**: `readResource` / `readYamlResource` / `readJsonResource` /
   `list(absolutePath): DirEntry[]`. `HelpCatalogue` already uses
   `readJsonResource(import.meta.url, "…/author-surface.json")`. So the
   help projector reads the schema directory directly — no intermediate
   generated artifact is needed, and none should be introduced.
3. **`createIndexes()` is 700 lines holding three kinds**: **82** static
   authored `createIndex` calls; **3** `ensureTextIndex` calls (which
   drop-and-recreate on shape change); and **2 derived loops** —
   `for (const stampCollection of STAMP_COLLECTIONS)` creating the
   `circleScope` partial index, and a loop over `DOCUMENT_KINDS`
   creating `{ kind: 1, data.<naturalKey>: 1 }` partial-unique per kind.
4. **Both policy tables are total `Record<Collections, …>`** with 48
   entries each. `RESET_DISPOSITIONS` carries `{ verb: 'wipe' } |
   { verb: 'keep', because } | { verb: 'wipe-except', … }`;
   `COLLECTION_POLICIES` carries `{ verb: 'stamp'|'shadow'|'pass'|'refuse' }`.
   `STAMP_COLLECTIONS` / `SHADOW_COLLECTIONS` are **derived** from
   `COLLECTION_POLICIES` by `.filter()`, already.
5. **11 production `Document` classes name their collection with a bare
   string**: `StoredDocument` "documents", `GoogleProfile`, `Blueprint`,
   `TwitchProfile`, `KickProfile`, `ParcelEvent` "parcel_events",
   `User`, `Channel`, `DescriptorBank`, `Group`, `PersistedRecord`
   "holder_snapshots". Three test-fixture classes (`boxes`, `widgets`,
   `test_wallets`) also do and must keep doing.
6. **`HelpCatalogue.rebuild(commandDefs, surface)`** dispatches to
   `projectCommands` / `projectApiSurface`, then escapes every body once
   through `Mml.compose`. `warm(opts?)` is the injectable seam.
   `HelpKind` and `HelpSource.subdivision` are closed unions in
   `@saxonberg/types`.
7. **Lint scripts are `scripts/check-*.ts`**, registered in
   `package.json` as `lint:<name>`, and **CI runs a list that is not the
   same as habit** — 16 gates in `.gitlab-ci.yml`'s lint job. A new gate
   is not wired until that file says so.

## Decisions

- **DEC-A — Author the docs by GENERATING them from the current tables
  first, then writing prose into them.** A one-shot bootstrap
  (`scripts/bootstrap-schema-docs.ts`, deleted at the end of Phase 1)
  reads today's `Collections`, `COLLECTION_POLICIES`,
  `RESET_DISPOSITIONS` and the static `createIndex` calls, and emits 48
  YAML files carrying the mechanical truth. **This is what makes
  acceptance criterion 6 achievable by construction rather than by
  careful transcription** — the machine-readable half is copied, not
  retyped, so only the prose can be wrong.
- **DEC-B — One shape, three readers.** `mud/lib/persistence/SchemaDoc.ts`
  holds the `SchemaDoc` interface and a `parse(raw, filename)` that
  throws on malformed input. PM, the generator and the help projector
  each read the directory but all parse through this. It is a value
  object in `lib/<subsystem>/` — the `Light` / `Quantity` category, no
  new module type.
- **DEC-C — The generated files carry a header** naming
  `pnpm gen:schema` and saying "do not edit". The TSDoc prose currently
  on 4 `Collections` entries round-trips: bootstrap lifts it into
  `purpose`, the generator emits it back as TSDoc.
- **DEC-D — Phase order is de-risking order.** The docs exist and are
  proven equivalent (1) before anything is generated from them (2)
  before the runtime reads them (3). Each phase is independently
  revertable and leaves a green tree.
- **DEC-E — The text indexes stay PM's problem.** `ensureTextIndex`'s
  drop-and-recreate-on-conflict logic is behaviour, not data. The doc
  declares `text: true` and the keys; PM keeps the recovery path.

## Phase 1 — The shape, and 48 authored docs

### Files
- `src/mud/lib/persistence/SchemaDoc.ts` — `interface SchemaDoc`
  (`collection`, `owner`, `subsystem`, `summary`, `purpose`,
  `invariants?`, `sandbox`, `reset`, `indexes?`) + `SchemaDoc.parse`.
  Throws `SchemaDocError` naming the file and the field.
- `scripts/bootstrap-schema-docs.ts` — **one-shot**, deleted at the end
  of this phase. Reads the three current tables + parses the static
  `createIndex` calls out of `createIndexes()` by AST, emits
  `src/schema/<collection>.yaml`.
- `src/schema/*.yaml` — 48 files. Bootstrap fills the mechanical fields;
  **a human writes `summary`, `purpose`, `invariants`, and every index's
  `why`.** ⚠ This is the bulk of the build's real work: 44 collections
  have no prose anywhere today.

### Prose sources to mine (do not invent what already exists)
- `RESET_DISPOSITIONS`' `because:` strings → `reset.because` verbatim.
- The 4 TSDoc blocks in `Collections.ts` → `purpose`.
- CLAUDE.md's 28-line collection list → `summary` seeds.
- Each collection's owning subsystem doc → `purpose` + `invariants`.

### Tests (`src/mud/lib/persistence/__tests__/SchemaDoc.test.ts`)
- Parses a well-formed doc; every field lands.
- Rejects: missing `collection`, `summary` empty, unknown `sandbox`
  verb, `reset: keep` with no `because`, an index with no `why`.
- Every shipped doc under `src/schema/` parses (a loop over the real
  directory — the cheapest possible guard against a typo).

## Phase 2 — The generator, and the generated tables

### Files
- `scripts/gen-schema.ts` — reads `src/schema/*.yaml` (sorted by
  filename for determinism), emits:
  - `src/mud/lib/persistence/Collections.ts` — the enum + TSDoc from
    `purpose`.
  - `src/mud/lib/persistence/ResetPolicy.ts` — `RESET_DISPOSITIONS`.
  - the `COLLECTION_POLICIES` table. ⚠ It currently lives **inside**
    `backend/PersistenceManager.ts`; extract it to
    `src/mud/lib/persistence/CollectionPolicy.ts` and re-export, so a
    generated file is never a hand-edited file.
- `package.json` — `"gen:schema": "tsx scripts/gen-schema.ts"`.

### The equivalence proof (the phase's real deliverable)
Generate, then `git diff` the three tables. **The diff must be
whitespace and ordering only.** Any semantic difference is a bug in
Phase 1's bootstrap, not a thing to hand-fix in the output.

### Tests
- `gen:schema` twice in a row produces identical bytes.
- A doc with an unknown `sandbox` verb fails generation loudly.

## Phase 3 — PM loads the docs; indexes become data

### Files
- `backend/PersistenceManager.ts`:
  - `loadSchemaDocs()` — `readdirSync` over `src/schema/`, parse each
    through `SchemaDoc.parse`, hold as `Map<collection, SchemaDoc>`.
    Called from `connect()` **before** `createIndexes()`.
  - ⚠ **A collection in `Collections` with no doc throws**, naming it
    (requirements D1). A doc naming an unknown collection throws too.
  - `createIndexes()` collapses to: for each doc, for each `indexes[]`
    entry, `createIndex(keys, options)` — or `ensureTextIndex` when
    `text: true` — **plus the two derived loops kept as loops** (§3 of
    Grounding).
  - ⭐ `STAMP_COLLECTIONS` / `SHADOW_COLLECTIONS` now derive from the
    generated `COLLECTION_POLICIES`, which derives from the docs — so
    declaring `sandbox: stamp` in a doc is what gives that collection
    its `circleScope` index. No new list.

### The safety check (acceptance criterion 6)
- `scripts/dump-indexes.ts` — connects, `listIndexes()` for all 48,
  prints a sorted normalized dump.
- **Run it on master before Phase 3, and on the branch after. Diff must
  be empty.** Capture both dumps in the MR. This is the check that makes
  D4 safe; without it the phase is a story.

### Tests (`backend/__tests__/PersistenceManager.schema.test.ts`)
- A missing doc for a known collection throws at load, naming it.
- A doc for an unknown collection throws.
- The index driver issues the exact `createIndex` calls a fixture doc
  declares (fake collection, assert the calls).

## Phase 4 — The gate, and the 11 bypasses

### Files
- `scripts/check-schema-docs.ts` — the six assertions of requirements
  D6. Resolution is **AST-based, file-scoped** for the `collectionName`
  check ⚠ (the `lint:topics` lesson: a tree-wide name table silently
  resolves a name against an unrelated file).
- `package.json` — `"lint:schema": "tsx scripts/check-schema-docs.ts --lint"`.
- **`.gitlab-ci.yml`** — add to the lint job. ⚠ Read the file and
  confirm; the libations build shipped two CI-failing gates because the
  local lint list was habit rather than derived from CI.
- The 11 classes in Grounding §5 → `Collections.X`. Mechanical.

### Tests (`scripts/__tests__/check-schema-docs.test.ts`)
Each of the six assertions gets a fixture that **violates** it and an
assertion that the check fails. A gate with no failing fixture is a gate
nobody has proved.

## Phase 5 — The help projector

### Files
- `packages/types/src/index.ts` — `HelpKind` gains `'collection'`;
  `HelpSource.subdivision` gains `'persistence'`.
- `src/mud/platform/idea/HelpCatalogue.ts`:
  - `warm(opts?)` gains `schema?: SchemaDoc[] | null` (same injectable
    convention as `surface`: `undefined` → read from disk, `null` →
    degrade, array → use).
  - `loadSchemaDocsFromDisk()` — `SourceTreeApi.list` +
    `readYamlResource`, mirroring `loadAuthorSurfaceFromDisk`, degrading
    to `null` with a one-shot warning.
  - `projectCollections(docs)` — one topic per doc. Id
    `collection.<name>`; body composed from `purpose`, `invariants`,
    **fields harvested from the owner class's `fieldMeta`**, indexes
    with their `why`, and both policies **in plain words**.
  - `deriveRelations` gains a `see-also` edge from a collection topic to
    the owner class's `api`/`mixin` topic when one exists.
- `HelpController` / `HelpRoutes` — a new `HelpKind` flows through the
  existing kind listing; check the category descriptor list.

### ⚠ The field harvest
`fieldMeta` is a static on the class. The projector needs the class
**object**, not its name — resolve via the existing class-source table
(`StuffApi.resolveClassFile` is for Stuff; a `Document` subclass is not
Stuff). Establish how before writing the projector; if there is no
resolver, the honest fallback is that the doc's `owner` is a *string* in
the topic and the field list is deferred — **say so rather than
inventing a registry.**

### Tests
- Projector unit tests over injected docs (no disk).
- `HelpKind` round-trips through the REST DTOs.
- ⭐ **Driven live over a real socket** (acceptance criterion 7): boot,
  connect, `help bank_ledger`, read the frame. A component test proves
  rendering, never wiring.

## Phase 6 — Documentation + sweep

- `docs/subsystems/persistence.md` — a § for the schema docs: what they
  are, what generates what, the three readers, and ⚠ the rule that the
  generated files are never hand-edited.
- `docs/subsystems/help.md` — the third projector + the new kind.
- `CLAUDE.md` — the MongoDB Collections list: **decide and record**
  whether it stays (28 of 48, one line each, always in context) or is
  replaced by a pointer at `src/schema/`. ⚠ Do not silently grow it to
  48 lines; that map has been re-compressed once already.
- `docs/architecture.md` — `SchemaDoc` in the value-object row; the two
  new scripts in the lint/codegen family.
- Retire the requirements; keep the persistence-architecture slate
  (Wave 3 is untouched) and strike its Wave 4 as built.

## Deferred seams (clean attach points, not stubs)

- **Per-field prose.** `fieldMeta` gaining a `description` is the
  obvious next move; the projector's field harvest would render it with
  no schema-doc change.
- **Mongo-side JSON Schema validators.** The docs describe; enforcing
  document shape at write time is a separate build with a real
  migration question attached.
- **The `world_state` / `app_settings` singletons** are collections of
  one row; their docs will read oddly and that is honest.

## Critical files for implementation

| file | why |
|---|---|
| `backend/PersistenceManager.ts` | `loadHooks` (the mechanism), `createIndexes` (700 lines, the biggest single change), `COLLECTION_POLICIES` (extracted in Phase 2) |
| `mud/lib/persistence/Collections.ts` | becomes generated |
| `mud/lib/persistence/ResetPolicy.ts` | becomes generated; source of migrating prose |
| `mud/platform/idea/HelpCatalogue.ts` | `rebuild` / `warm` — the projector seam |
| `mud/api/source-tree.ts` | `list` + `readYamlResource` — the mudlib's only legal read |
| `packages/types/src/index.ts` | two closed unions gain a member |
| `.gitlab-ci.yml` | the gate is not wired until this says so |
