# Help system (Wave 1) — implementation plan

Self-contained build plan for the help-system Wave 1 scope. A
fresh-context build agent that has read
[docs/requirements/help-requirements.md](../requirements/help-requirements.md)
and the load-bearing subsystem docs can execute this without the
conversation that produced it.

Scope contract: the requirements doc. Every scope decision is already
made there — this plan is the *how*. Do not re-open scope.

---

## Decisions for the user (flagged — confirm before build)

None are blocking under the constraints as written; each has a
recommended default. D1 and D3 are behavioral and want an explicit nod.

- **D1 — Catalogue/Api split: two-part, ungated catalogue + filter-in-facade.**
  `/obj/HelpCatalogue` is a singleton that warms + holds the topic maps,
  with *ungated* read methods — the `RecipeCatalogue`/`TopicCatalogue`
  precedent — plus a thin `HelpApi` facade (`api/help.ts`) that is the
  **single read chokepoint** and the home of the capability filter.
  Rationale: help reads are transparency-by-default, so a `FromModule`
  gate on the catalogue would be redundant noise; the only meaningful
  gate is the capability filter, and that lives once, in the facade. A
  third HMR logic singleton (`CorpoLogic` style) buys nothing here because
  the catalogue holds no per-request logic — just a warmed index. **If you
  want the gated `AccessRegistry`/`AccessApi` posture instead** (catalogue
  reads `FromModule('mud/api/help#HelpApi')`-gated), say so; it's a
  mechanical change to step 6.

- **D2 — Projector home: methods on `HelpCatalogue`, no new `lib/help/`
  folder.** The constraint pre-authorizes "value-objects/methods in a new
  `lib/help/` subsystem folder **and/or** the catalogue singleton."
  Recommendation: keep both projectors as private methods on
  `HelpCatalogue` and add no `lib/help/` folder (honors
  prefer-fewer-directories). The pure value-objects this needs (the
  `HelpKind`/`HelpRelationKind` vocabularies, the `HelpTopic` DTO) all
  belong in `@saxonberg/types`, not a server-side folder. Testability is
  preserved by making `warm()` accept injectable inputs (the parsed
  author-surface object + the command roster) so unit tests drive the
  projectors without disk or boot. This is within the sanctioned taxonomy
  — no new module category, no sign-off needed. Flagging it only because
  the requirements named `lib/help/` as a candidate; declining it. If
  you'd rather have a `lib/help/` home for the projection as a tested pure
  class, that is the one place a category judgment could go either way —
  but it risks reading as a free-floating-helper dodge of the Api pattern,
  so recommend against.

- **D3 — `help search` corpus & the legacy controller.** Requirements:
  search matches `summary`+`body`; typeahead matches
  `title`+`keywords`+`kind`. The current `HelpController.showSearchResults`
  searches the live per-giver command set. Recommendation: re-point all
  four verb forms at the index via `HelpApi` (the giver's
  affordance-filtered command list is no longer the search corpus — the
  index is). Confirm you want index-wide search (a player can
  search-discover a command they can't currently invoke). Given the
  "rulebook / transparency-by-default" thesis this is intended, but it is
  a visible behavior change from today's affordance-scoped search.

- **D4 — REST auth posture.** Recommendation: mirror CMS — every help
  route is `requireAuth` this cycle (the public pre-auth face is an
  explicit Wave 3 non-goal). The capability tier derives from the session
  and is the anonymous **floor** (pass-through) for every authenticated
  viewer. Confirm; the alternative (anon-readable now) pulls Wave 3
  forward and is out of scope.

- **D5 — `composes` relation fidelity.** A mixin's `composes` edges are
  derived **best-effort** from the type names appearing in its
  conferred-method signatures that are themselves mixins (e.g. `Container`
  → `Containable`). This is approximate; a richer source (the augmentation
  `confers()` graph, explicit base-chain) is deferred. The acceptance test
  only asserts that `Container` carries `confers`/`composes`/`consumed-by`
  *kinds*, which this satisfies. Confirm the approximation is acceptable
  for Wave 1.

---

## Architecture at a glance — the seam map

```
 BUILD TIME (pnpm docs):
   TypeDoc → api-model.json
     → project-author-surface.ts  [ENRICHED here]
       → author-surface.json   { consumer[], extension[], types[] }
         consumer[] now carries: signature, summary, params?, returns?,
                                 examples?, signatureTypes[]

 BOOT TIME (/obj/HelpCatalogue.warm() at postRegister):
   commands projector  ← CommandApi.allDefinitions()  (NEW Api method)
   api projector       ← author-surface.json (graceful-degrade if absent)
                         + Mixins registry (complete roster)
     → Map<id, HelpTopic> + category index + typeahead/keyword index

 READ TIME:
   help verb (HelpController) ─┐
   HelpRoutes (REST GETs) ─────┤→ HelpApi  [capability filter chokepoint]
                                   → HelpCatalogue (ungated reads)
```

## DTOs — add to `@saxonberg/types` (`packages/types/src/index.ts`)

Place alongside `TopicDescriptor` / the `Cms*` block, following their
JSDoc-and-shape conventions. `body` is an **MML markup string** (the
repo's established `body: string // MML markup` convention — there is no
nominal `MmlString` type; it is a documented `string`).

```ts
export type HelpKind = 'command' | 'api' | 'mixin' | 'type';

export type HelpRelationKind =
  | 'method-of' | 'confers' | 'composes'
  | 'requires' | 'consumed-by' | 'see-also';

/** One typed edge between topics, denormalized for one-fetch render. */
export interface HelpRelation {
  kind: HelpRelationKind;
  targetId: string;
  targetTitle: string;
}

/** Provenance: which subdivision/source a topic was harvested from. */
export interface HelpSource {
  subdivision: 'commands' | 'api';
  /** command → primary verb; api/mixin/type → qualified `module#Face.member`. */
  ref: string;
}

/** The single uniform shape the index/search/REST/verb all traffic in. */
export interface HelpTopic {
  id: string;            // 'command.look' | 'api.ContainmentApi.move' | 'mixin.Container' | 'type.Grade'
  kind: HelpKind;
  title: string;
  summary: string;       // one line; '' when none
  keywords: string[];    // typeahead corpus: verbs/aliases, member name, mixin concept, kind
  body: string;          // MML markup string (the rulebook entry)
  relations: HelpRelation[];
  spoiler: boolean;      // capability flag; false at the floor this cycle
  source: HelpSource;
}

/** Light index entry — instant pane render + client-local typeahead. */
export interface HelpIndexEntry {
  id: string; kind: HelpKind; title: string; summary: string; keywords: string[];
}

export interface HelpCategory { kind: HelpKind; title: string; count: number; }

// ── REST request/response DTOs ──────────────────────────────────────
export interface HelpIndexResult { entries: HelpIndexEntry[]; categories: HelpCategory[]; }
export interface HelpKindListResult { kind: HelpKind; topics: HelpIndexEntry[]; }
export interface HelpTopicResult { topic: HelpTopic; }
export interface HelpSearchGroup { kind: HelpKind; hits: HelpIndexEntry[]; }
export interface HelpSearchResult { query: string; groups: HelpSearchGroup[]; }
export interface HelpErrorBody { error: 'not-found' | 'invalid'; message: string; }
```

The capability-tier (viewer) shape stays **server-internal** this cycle (a
`{ tier: 'anonymous' }` placeholder in `HelpApi`) — it is not yet a wire
DTO; the spoiler slate owns its real shape.

---

## Implementation steps (ordered, independently reviewable)

### Step 1 — Enrich the author-surface projection (the riskiest logic)

**File (modify):** `packages/server/scripts/project-author-surface.ts`
**Test (modify):** `packages/server/scripts/__tests__/project-author-surface.test.ts`

**1a. Extend `ConsumerMember`** with the enriched fields:
```ts
export interface ConsumerMember {
  kind: "api-static" | "stuff-method";
  module: string; face: string; name: string; qualified: string;
  signature: string;          // rendered readable signature
  summary: string;            // first-paragraph TSDoc, '' when absent
  params?: { name: string; text: string }[];   // @param
  returns?: string;           // @returns
  examples?: string[];        // @example blocks (verbatim)
  signatureTypes: string[];   // named project-types in params+return (relation join key)
}
```
Keep `AuthorSurface`/`ProjectionResult` otherwise unchanged;
`projectAuthorSurface` stays **pure, no IO**.

**1b. Write the signature renderer** — a pure `renderSignature(member: Refl): string`
that walks the TypeDoc `TdType` JSON. This is the high-risk new logic.
Handle:
- `intrinsic` (`string`, `number`, `boolean`, `void`, `unknown`) → name verbatim;
- `reference` → `name` + (if `typeArguments`) `<A, B>` recursively → **generics**;
- `union` (`types[]`) → `A | B | C`; `intersection` → `A & B` (e.g. `Stuff & Containable`);
- `array` (`elementType`) → `T[]`;
- `reflection`/`literal`/`tuple`/fallback → a safe `string`/`object`/literal rendering;
- **parameter flags:** optional → `name?: T`; rest → `...name: T[]`; default-value params render as optional;
- assemble `name(p1: T1, p2?: T2, ...rest: R[]): Ret` from the member's first `signatures[0]`.

The renderer reuses the existing `collectTypeRefs` traversal shape for
structural coverage. Reflections with no signature (shouldn't reach
consumer tier — methods-only) render `name`.

**1c. Extract TSDoc** from `member.signatures[].comment` (and
`member.comment`): `summary` = the joined `summaryText`/non-tag content
first paragraph; `@param`/`@returns`/`@example` from `blockTags` (reuse
the `hookContract` pattern that already reads `blockTags`). All optional;
absence → `''`/omit (the "degrades to signature-only" rule — never drop a
member for thin TSDoc).

**1d. Emit `signatureTypes`** per member: resolve the member's
`signatureTypeRefs` ids through `byId` to type **names** (the named
project-types only), so the runtime API projector can derive
`requires`/`consumed-by`/`composes` without re-reading `api-model.json`.

**Tests (extend the fixture model):** Build a small synthetic `Refl`
project covering, at minimum, the acceptance trio plus:
- a **generic** signature (`Property<T>` / `Quantity<U>` return);
- a **union** param (`A | B`);
- an **optional** param (`name?: string`) and a **rest** param (`...args: number[]`);
- an **intersection** param (`Stuff & Container`) — proves the mixin-composition join works;
- a member with full `@param`/`@returns`/`@example` and one with **no TSDoc** (asserts `summary===''`, signature still present).
Assert exact rendered `signature` strings and the populated
`summary`/`params`/`returns`/`examples`/`signatureTypes`.

> Maps to acceptance: *"`project-author-surface.ts` is extended to carry a
> rendered signature string + TSDoc summary per consumer member; a unit
> test asserts the enriched fields on a fixture model (incl. a generic, a
> union, and an optional/rest param signature)."*

### Step 2 — Add the global command roster accessor

**Files (modify):** `packages/server/src/mud/api/command.ts`,
`packages/server/src/mud/obj/api/CommandLogic.ts`

The commands projector needs **every** loaded `CommandDefinition`, not
the per-giver affordance set. `CommandLogic` already holds a module-level
`commands: Map<string, CommandDefinition>` populated by `preloadAll`
(which runs in `AppBootstrap.run` *before* `BootstrapManager.run`, hence
before `HelpCatalogue.postRegister`). Surface it through the Api layer
(never reach the map directly):
- `CommandLogic.allDefinitions(): CommandDefinition[]` → `[...commands.values()]`, gated `@CallSecurity(CommandApiCallers)` like its siblings.
- `CommandApi.allDefinitions(): CommandDefinition[]` → forwards to `logic().allDefinitions()`.

**Test:** assert `CommandApi.allDefinitions()` returns the loaded roster
after a preload (or a unit test seeding the cache), and that it includes a
known verb (e.g. `look`).

### Step 3 — DTOs in `@saxonberg/types`

**File (modify):** `packages/types/src/index.ts` — add the block from the
**DTOs** section above. No logic; this unblocks both server and the
(future) client. Build `@saxonberg/types` so server picks up the types.

### Step 4 — `HelpCatalogue` singleton + the two projectors

**File (new):** `packages/server/src/mud/obj/HelpCatalogue.ts`
**Test (new):** `packages/server/src/mud/obj/__tests__/HelpCatalogue.test.ts`

Shape it on `RecipeCatalogue`/`TopicCatalogue`:
`export default class HelpCatalogue extends PostRegistrationMixin(Idea)`,
`canDestruct()` singleton-refusal, `postRegister()` → `warm()`.

**State:**
```ts
private topics: Map<string, HelpTopic> | null = null;   // null = not warmed
private byKind: Map<HelpKind, string[]> = new Map();
private typeahead: Map<string, Set<string>> = new Map(); // token → topic ids
private warnedMissingSurface = false;                    // one-warning guard
```

**`warm(opts?)` — injectable for tests:**
```ts
public async warm(opts?: {
  commandDefs?: CommandDefinition[];
  surface?: AuthorSurface | null;   // undefined → load from disk; null → simulate absent
}): Promise<void>
```
- `commandDefs` defaults to `CommandApi.allDefinitions()`.
- `surface` defaults to `loadAuthorSurfaceFromDisk()` (Step 4c).
- Calls `rebuild(commandDefs, surface)` (pure-ish, no IO) which fills the maps. Tests call `warm({ commandDefs, surface })` with fixtures — no disk, no boot.

**Read surface (ungated, the chokepoint is `HelpApi`):**
`getTopic(id): HelpTopic | null`, `indexSlice(): HelpIndexEntry[]`,
`categories(): HelpCategory[]`, `listByKind(kind): HelpIndexEntry[]`,
`search(q): HelpSearchGroup[]`, `typeaheadMatch(q): HelpIndexEntry[]`,
`findCommandTopic(verb): HelpTopic | null`, `findApiTopic(target): HelpTopic | null`
(resolves by exact id, by `Type.member`, or by bare `Type`/`Mixin` name).
Plus `reproject()`/`invalidate()` for HMR (best-effort; mirror
`TopicCatalogue.invalidateCache`).

**4a. Commands projector** — `private projectCommands(defs): HelpTopic[]`:
For each `CommandDefinition`: one `HelpTopic`
`{ kind:'command', id:'command.<primaryVerb>' }`. `title` = primary verb;
`summary` = `def.description`; `keywords` = `[...def.verbs, 'command']`;
**`body` = the MML-wrapped `def.getHelpText()`** (preserves
verb/aliases/syntax/options/subcommands/examples verbatim — the single
source already assembled). `relations` = `[]` (commands are flat this
wave; `see-also` to related verbs deferred).
`source = { subdivision:'commands', ref: primaryVerb }`. `spoiler=false`.

**4b. API projector** — `private projectApiSurface(surface | null): HelpTopic[]`.
**Complete-roster algorithm:**
1. **Mixins first (drives completeness):** iterate the entire `Mixins`
   registry (import `Mixins` from `lib/mixin`). For each value
   `'<Concept>Mixin'`, derive `concept = stripMixinSuffix(value)` and emit
   `{ kind:'mixin', id:'mixin.<Concept>' }`. Enrich from `surface` when a
   consumer face matches `concept` (the mixin's interface, e.g.
   `Container`): `summary` from that face's best member summary or a
   face-level summary if present; conferred methods = all
   `surface.consumer` entries with `face === concept`. When no match →
   **degrade to a bare topic** (title + `'(no authored documentation)'`
   body, empty conferred set). This is the *centerpiece* tier: richest
   body (capability meaning + conferred-method list rendered from each
   member's `signature`+`summary`).
2. **Api faces:** group `surface.consumer` `kind==='api-static'` by
   `face`. Emit `{ kind:'api', id:'api.<Face>' }` (grouped landing listing
   its members) **and** one member topic per static
   `{ kind:'api', id:'api.<Face>.<member>' }` carrying the rendered
   `signature`, `summary`, and `@param`/`@returns`/`@example` body.
   `help api ContainmentApi.move` resolves the member topic.
3. **Types:** for each `surface.types` entry not already classified as
   `api` or `mixin`, emit a lighter `{ kind:'type', id:'type.<Name>' }`
   (signature/summary if the type itself is a documented value-object;
   else name + module). Real topics, lighter treatment.

**Classification (`api` vs `mixin` vs `type`):** a face/type name is
`mixin` iff `'<Name>Mixin'` ∈ `Mixins` registry values; `api` iff it ends
in `Api` and lives under `mud/api/` (the `isApiClass` rule, already in the
projection — mirror it); else `type`. This is the explicit cross-ref the
requirements call for.

**4c. Graceful degrade** — `loadAuthorSurfaceFromDisk(): AuthorSurface | null`:
`readFileSync` of `author-surface.json` (resolved via
`fileURLToPath(new URL('../../../docs/api/author-surface.json', import.meta.url))`
from `obj/`; the build agent must confirm the dev-tsx `src/` path resolves
and adjust the relative depth if the dist layout differs — the file is the
gitignored artifact `packages/server/docs/api/author-surface.json`). On
`ENOENT`/parse failure: return `null`. In `rebuild`, `surface === null` →
**command topics still built; api/mixin/type empty; log exactly one boot
warning** (guard with `warnedMissingSurface`): `"HelpCatalogue:
author-surface.json absent — api/mixin/type topics unavailable (run \`pnpm
docs\`). Command topics unaffected."`

**4d. Typed relations** (`private deriveRelations(...)`, built during projection):
- `method-of`: every member topic → its parent face/mixin/type topic.
- `confers`: each `mixin` topic → its conferred member topics (the `face===concept` members).
- `requires`: each `api`/member topic → the `type`/`mixin` topics named in its `signatureTypes`.
- `consumed-by`: the inverse of `requires` (build a name→consumers index over all members' `signatureTypes`). `Container` → consumed-by `ContainmentApi` etc.
- `composes`: each `mixin` topic → mixin topics among its conferred methods' `signatureTypes` (D5 best-effort; `Container` → `Containable`).
- `see-also`: catch-all — remaining same-module/same-concept siblings (e.g. an `api` face ↔ the `mixin` sharing its concern; types in the same module).
Every relation denormalizes `targetTitle`. **Relations are derived, never
hand-authored.**

**Indexes:** `byKind` (kind → ids, sorted by title); `typeahead`
tokenizes `title`+`keywords`+`kind` per topic; `search` scans
`summary`+`body`. Both resolve across **both** subdivisions via the
uniform fields.

**Tests (`HelpCatalogue.test.ts`):** drive `warm({ commandDefs, surface })`
with a fixture command roster + a fixture `AuthorSurface`:
- a command topic's `body` equals the source `def.getHelpText()` (MML-wrapped);
- **every** `Mixins` registry value has a `mixin.<Concept>` topic present (complete roster) — iterate `Object.values(Mixins)`;
- the `Container` mixin topic carries `confers` (its methods), `composes` (→ Containable), and `consumed-by` (→ ContainmentApi) relation kinds;
- `findApiTopic('ContainmentApi.move')` body contains the rendered signature + summary (not the old placeholder);
- a search term that hits **both** a command and an api/mixin topic returns both;
- typeahead matches `title`+`keywords`+`kind`;
- **degrade:** `warm({ commandDefs, surface: null })` → command topics present, api/mixin/type empty, exactly one warning logged (spy `console.warn`).

> Maps to acceptance criteria: warm-from-both-projectors / complete roster
> / Container relations / `help api` real content / cross-subdivision
> search+typeahead / degrade path.

### Step 5 — Register the singleton at boot

**File (modify):** `packages/server/src/mud/bootstrap.ts` — append
`{ templatePath: '/obj/HelpCatalogue' }` to `bootstrapManifest` (no
`dependsOn`; command preload and the seeders already ran earlier in
`AppBootstrap.run`, before `BootstrapManager.run`). Add the explanatory
comment block in the manifest house-style (warms in `postRegister`; reads
through `HelpApi`).
**File (modify):** `packages/server/src/mud/lib/paths.ts` — add
`helpCatalogue: "/obj/HelpCatalogue"` under "Singleton catalogues."
**Seed:** add the `{ class: /obj/HelpCatalogue, data: {} }` seed wherever
the sibling catalogue seeds live (mirror `RecipeCatalogue`'s seed entry —
the build agent locates the existing catalogue seed file). No
`AppBootstrap.run` edit is needed — `postRegister` warms it.

### Step 6 — `HelpApi` facade + capability-filter chokepoint

**File (new):** `packages/server/src/mud/api/help.ts`
**Test (new):** `packages/server/src/mud/api/__tests__/help.test.ts`

Thin forwarding shell over `HelpCatalogue` (resolved sync via
`StuffApi.findByTemplatePath(TemplatePaths.helpCatalogue)`, the
`CorpoLogic.catalogue()` accessor pattern; `null` before warm → empty
results). **Every public read routes through one private `applyFilter`** —
the single capability chokepoint:

```ts
type HelpViewer = { tier: 'anonymous' };   // floor placeholder; spoiler slate owns the real shape

export class HelpApi {
  static index(viewer?: HelpViewer): HelpIndexResult;     // entries + categories
  static listKind(kind: HelpKind, viewer?: HelpViewer): HelpKindListResult;
  static fullTopic(id: string, viewer?: HelpViewer): HelpTopic | null;
  static search(q: string, viewer?: HelpViewer): HelpSearchResult;   // grouped by kind
  static typeahead(q: string, viewer?: HelpViewer): HelpIndexEntry[];
  static commandTopic(verb: string, viewer?: HelpViewer): HelpTopic | null;
  static apiTopic(target: string, viewer?: HelpViewer): HelpTopic | null;
}
SecurityApi.decorateApiClass(HelpApi);
```
- `applyFilter(topics, viewer)` is the **only** place gating happens. At
  the anonymous floor it is **identity** (no-op pass — nothing withheld),
  but it is shaped to drop `topic.spoiler && !viewerCanSeeSpoilers(viewer)`
  once a ceiling exists. Every list/single read passes through it; the
  catalogue itself never filters.
- Statics are public/ungated (the `CorpoApi` forwarding-shell pattern);
  the catalogue is ungated (D1).

**Tests:**
- the floor withholds nothing: seed the catalogue with a synthetic `spoiler:true` topic; assert every `HelpApi` read still returns it;
- the filter is the **single chokepoint**: a unit test of `applyFilter` asserting identity at the floor and that supplying a (test-only) ceiling drops a spoiler topic — proving one-place gating;
- forwarding correctness for each method against a warmed fixture catalogue.

> Maps to acceptance: *"The capability filter runs on every read and is a
> verified no-op pass at the anonymous floor (… nothing is withheld … the
> filter is the single chokepoint)."*

### Step 7 — REST help data API

**File (new):** `packages/server/src/backend/HelpRoutes.ts` (structural
sibling of `CmsRoutes`, read-only — **no CSRF, no `CmsSession`
attribution bridge**).
**File (modify):** `packages/server/src/services/Server.ts` — add
`HelpRoutes.setup(this.app)` in `setupRoutes()` (alongside
`CmsRoutes.setup`, before the SPA catch-all).
**Test (new):** `packages/server/src/backend/__tests__/HelpRoutes.test.ts`
(the `TestAuthRoutes`/CMS route-test harness pattern — mount on an Express
app, hit endpoints).

Routes (all `requireAuth = AuthMiddleware.requireAuthApi`, session-aware
viewer = floor; forward through `HelpApi`, never the catalogue):
```
GET /api/help/index               → HelpApi.index()      → HelpIndexResult
GET /api/help/kind?kind=<k>       → HelpApi.listKind(k)  → HelpKindListResult   (400 on bad kind)
GET /api/help/topic?id=<id>       → HelpApi.fullTopic(id)→ HelpTopicResult       (404 on miss)
GET /api/help/search?q=<q>        → HelpApi.search(q)    → HelpSearchResult (groups by kind)
```
A `sendHelpError(res, e)` maps misses → 404, bad params → 400 (the
`sendCmsError` shape, minus sandbox/CSRF). Validate `kind` against the
`HelpKind` set; missing/blank `id`/`q` → 400.

**Tests:** assert each endpoint's response shape against the
`@saxonberg/types` DTO
(`HelpIndexResult`/`HelpKindListResult`/`HelpTopicResult`/`HelpSearchResult`),
that search results are grouped by `kind`, and the 404/400 paths.

> Maps to acceptance: *"The REST help endpoints return: the light index
> slice, a per-kind topic list, a single full topic by id, and search
> results grouped by kind; tests cover each endpoint's response shape
> against the `@saxonberg/types` DTO."*

### Step 8 — Re-point the `help` verb at the index

**File (modify):** `packages/server/src/mud/cmd/system/help.yaml`
**File (modify):** `packages/server/src/mud/obj/command/system/HelpController.ts`
**Test (new):** `packages/server/src/mud/obj/command/system/__tests__/HelpController.test.ts`

**8a. Grammar polish (the `chat.yaml` `fallthrough` precedent):** add
`fallthrough: true` plus a top-level optional positional so a bare
`help <verb>` binds without the `verb` subcommand word. `fallthrough: true`
*requires both* top-level `args:` and `subcommands:` (enforced by
`CommandDefinition`):
```yaml
fallthrough: true
args:
  - name: topic        # bare `help look` → topic='look'
    type: string
    required: false
subcommands:
  verb:  { ... }       # legacy `help verb <name>` — KEEP working
  api:   { ... }       # unchanged
  search:{ ... }       # unchanged
```
Name the top-level positional `topic` to avoid colliding with the `api`
subcommand's `target` field.

**8b. Controller** — render every form off the index through `HelpApi`, on
the existing `system.shell.help` topic, emitting each topic's MML `body`
(+ relations as navigable MML links):
- no subcommand, no `topic` → **landing/index**: `HelpApi.index()` → MML list of categories + counts (+ a hint line).
- no subcommand, `topic` set → `HelpApi.commandTopic(topic)`; render `body`; miss → "unknown command" + `controller-rejected` note.
- `verb [name]` (legacy) → name → `commandTopic(name)`; no name → landing. **Still works.**
- `api [target]` → `target` → `HelpApi.apiTopic(target)` render `body` (real signature+summary); no target → api-kind landing (`listKind('api')`/`'mixin'`/`'type'`).
- `search <q>` → `HelpApi.search(q)`; render **grouped by kind**.
Drop the placeholder `showApiHelp` "not yet indexed" branch entirely. Keep
`tell()` on `system.shell.help`.

**Tests:** assert bare `help`, `help look`, `help api ContainmentApi.move`,
`help search <q>` all render off the index (mock/seed `HelpApi`/catalogue),
and that legacy `help verb look` still resolves. Assert the `api` form
renders a real signature+summary, not the placeholder.

> Maps to acceptance: *"Bare `help`, `help <verb>`, `help api <target>`,
> and `help search <q>` all render off the index through
> `system.shell.help`; the legacy `help verb <name>` form still works."*

### Step 9 — Subsystem doc

**File (new):** `docs/subsystems/help.md` — describe: the uniform
`HelpTopic` schema; the boot-warmed index + the one-projector-per-subdivision
harvest seam (commands + api); the enriched `author-surface.json` pipeline
and the signature renderer; the complete-mixin-roster guarantee; typed
relations and where each edge derives from; the REST contract; the
capability-floor seam (single chokepoint, shaped for a ceiling); graceful
degrade; and the **shaped-not-wired** world→model bridge (topic ids +
`mixin` relations designed so the later inspection→help cross-link is a
clean add). Reconcile the help-slate's absorbed Wave 1 content; preserve
its surviving waves. (Per `docs/workflow.md`, the doc is written at build
time and finalized at sweep.)

> Maps to acceptance: the final `docs/subsystems/help.md` criterion.

---

## File manifest

**New**
- `packages/server/src/mud/obj/HelpCatalogue.ts`
- `packages/server/src/mud/obj/__tests__/HelpCatalogue.test.ts`
- `packages/server/src/mud/api/help.ts`
- `packages/server/src/mud/api/__tests__/help.test.ts`
- `packages/server/src/backend/HelpRoutes.ts`
- `packages/server/src/backend/__tests__/HelpRoutes.test.ts`
- `packages/server/src/mud/obj/command/system/__tests__/HelpController.test.ts`
- The `/obj/HelpCatalogue` seed (`{ class: /obj/HelpCatalogue, data: {} }`) in the existing catalogue-seed file
- `docs/subsystems/help.md`

**Modified**
- `packages/server/scripts/project-author-surface.ts` (enrich `ConsumerMember`; signature renderer; TSDoc extraction; `signatureTypes`)
- `packages/server/scripts/__tests__/project-author-surface.test.ts` (renderer + enrichment fixtures)
- `packages/types/src/index.ts` (Help DTO block)
- `packages/server/src/mud/api/command.ts` + `packages/server/src/mud/obj/api/CommandLogic.ts` (`allDefinitions()`)
- `packages/server/src/mud/bootstrap.ts` (manifest entry)
- `packages/server/src/mud/lib/paths.ts` (`helpCatalogue` path)
- `packages/server/src/services/Server.ts` (`HelpRoutes.setup`)
- `packages/server/src/mud/cmd/system/help.yaml` (`fallthrough` + top-level positional)
- `packages/server/src/mud/obj/command/system/HelpController.ts` (re-point at index)

**No new module category, no new ESLint exception, no `lib/help/` folder**
(D2). All new files map to sanctioned categories: Stuff singleton
(`HelpCatalogue`), Api facade (`api/help.ts`), backend route class
(`HelpRoutes`), command YAML/controller, build-script (free functions are
fine in `scripts/`), DTOs in `@saxonberg/types`.

## Test plan ↔ acceptance criteria

| Acceptance criterion | Covering test(s) |
|---|---|
| Uniform `HelpTopic` in `@saxonberg/types`, sole shape | DTOs compile + consumed in every layer's tests |
| Enriched projection: signature + summary, generic/union/optional/rest | `project-author-surface.test.ts` (Step 1) |
| Both projectors at boot; command body == `getHelpText()`; every `Mixins` entry → mixin topic | `HelpCatalogue.test.ts` (Step 4) |
| Mixin topic carries `confers`/`composes`/`consumed-by` (Container) | `HelpCatalogue.test.ts` |
| `help api ContainmentApi.move` real signature+summary | `HelpCatalogue.test.ts` + `HelpController.test.ts` |
| REST: index slice / per-kind / single topic / search grouped-by-kind, shapes vs DTO | `HelpRoutes.test.ts` (Step 7) |
| Search (`summary`+`body`) + typeahead (`title`+`keywords`+`kind`) across both subdivisions | `HelpCatalogue.test.ts` |
| Capability filter on every read; no-op at floor; single chokepoint | `help.test.ts` (Step 6) |
| Degrade: surface absent → commands present, api/mixin/type empty, one warning | `HelpCatalogue.test.ts` |
| Bare/`<verb>`/`api`/`search` + legacy `verb <name>` via `system.shell.help` | `HelpController.test.ts` (Step 8) |
| `docs/subsystems/help.md` exists, slate reconciled | doc review at sweep (Step 9) |

## Build sequencing notes

Steps 1–3 are independent and land first (they unblock everything:
enriched artifact, command roster accessor, DTOs). Steps 4→6→7/8 are
linear (catalogue → facade → REST + verb). Run `pnpm docs` (→
`docs:project`) once before manual end-to-end so `author-surface.json`
exists; all unit tests inject fixtures and never depend on the real
artifact. Wiring `docs:project` into the server build/deploy so production
always has the artifact is a **noted follow-on ops item, not built here**
(per the requirements' degrade decision).
