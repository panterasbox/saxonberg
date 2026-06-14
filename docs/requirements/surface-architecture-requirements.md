# Surface architecture — requirements

A cross-cutting refactor that makes the **public surface** of the engine
a single, enforced boundary. Today an `Api` carries identity three ways
an unsettled organizational layer shouldn't: it holds the logic, it
anchors the generated docs, and it's where types live. This build
relocates all three so the `Api` becomes what it actually is — a thin,
typed, secured forwarding shell — and makes one line do three jobs: the
Api/mixin **face** is simultaneously the **call boundary**
(call-security), the **visibility boundary** (generated docs), and the
**import boundary** (where types resolve). Seeded by
[docs/slates/tails/surface-architecture-slate.md](../slates/tails/surface-architecture-slate.md)
(eight resolved design threads). Done **in isolation on stable master**
— it touches `api/`, `lib/`, call-security, and the module taxonomy
game-wide, so it cannot share a tree with other active builds.

The governing invariant: **callable == visible == cared-about.** An
author can call exactly what they can see in the docs, and nothing else;
the call-security policy *is* the doc-visibility policy — with one
deliberate exception (the extension/override tier) handled by an explicit
marker.

## Goals

- **Api internals relocate to HMR singletons.** Every *convertible* Api
  (all of `api/` except the 6-Api excluded set below — currently ~45 of
  51) becomes a thin shell: its public static methods forward to a
  **stateless `Stuff` singleton** that holds the logic and *is*
  hot-reloadable. The Api retains only the typed public surface, the
  `SecurityApi.decorateApiClass` gate, and forwarding.
- **One new primitive: `StuffApi.singletonSync(path, factory)`** — sync,
  registry-keyed (`byTemplatePath`), HMR-aware (the factory resolves the
  current blueprint via the synchronous `HotReloadApi.getCurrentExport`,
  falling back to the statically-imported class). Fetching a logic
  singleton is synchronous; Api methods do not become `async` to reach
  their own logic.
- **Logic singletons are addressable and discoverable by path.** Each
  lives at `/obj/api/<feature>` (sibling of `/obj/command/<category>`),
  MQL-resolvable by path with no backing `Template` doc. The path is the
  stable handle; the stuffId is ephemeral (changes on every
  `dest`+recreate, which is also the reload mechanism).
- **Logic is callable only through its Api.** Each singleton's methods
  carry `@CallSecurity(FromModule('mud/api/<feature>#<Feature>Api'))`
  (set once at class level). Any other caller — content Stuff, another
  lib module, another Api — is denied at runtime.
- **Stateful Apis use the two-singleton shape.** Where an Api has state,
  the state stays in a **pinned** singleton and a **stateless logic
  singleton** sits between the Api statics and the state. `access`→
  `AccessRegistry` and `scheduler`→`SchedulerRegistry` re-point an
  existing gate to the new logic singleton; `soul`→`SoulCatalogue`
  **adds** a gate (it has none today). **`schedule` is a partial
  conversion**: its `runRoot`/`planRun` stay Api statics (gated to the
  `mud/api/` frame-mutator allowlist, which `obj/api/` logic singletons
  are deliberately *not* in), and its timers are already per-handle
  closures (no shared state to pin) — only the non-frame-mutating logic
  migrates. HMR-able logic and pinned state never share an object
  (reload == `dest` == state loss).
- **The author doc surface is a computed three-tier projection.** A
  projection over the TypeDoc `api-model.json` emits exactly: **consumer**
  (public Api statics + public Stuff/mixin *methods* + the transitive
  closure of their I/O types), **extension** (`@hook`-tagged
  framework-invoked override hooks, rendered with their override
  contract), and **internal** (`@internal`, hidden). Public *fields* and
  accessor pairs are excluded from the consumer tier (the inter-stuff
  "methods are the contract" rule as a doc filter).
- **Every concept is tiered.** A one-tag-per-concept pass marks each Api /
  mixin / Stuff class author-facing or `@internal`; every framework-
  invoked override hook across the codebase is tagged `@hook`.
- **Author-facing types ride their face.** Public types are re-exported
  (type-only) from the Api/mixin whose method signature speaks them — from
  *every* face that uses them, since type re-exports are weightless
  (erased, no runtime edge). Constants are *placed*, not re-exported
  (runtime edges can cycle). Exported author-surface types are named
  `<Concept><Role>`; generic names (`Options`, `Result`, `Spec`) are
  disallowed on that surface.
- **Api export purity & definition placement (a first-class workstream,
  not a byproduct of the singleton migration).** An `api/` file exports
  **only its static `FooApi` class plus types — never an instanceable
  class.** The eight non-Api classes currently in `api/` relocate to
  `lib/`, concept-colocated, each re-exported from its face so callers
  still reach it through the Api: the value/builder classes `Scene`
  (message), `Mml` (mml), `Prose` (prose); the `PathTrie<T>` collection
  (path-pattern); and the four error classes `ContainmentError`,
  `PromptCancelledError`, `SourceTreeSandboxError`, `TemplateError`.
  Domain-concept **types** are likewise *defined* in `lib/` with their
  concept and re-exported (type-only) from the face; only pure-Api-surface
  shapes — option/result/handle types with no domain home (the
  `ScheduleHandle` precedent) — are *defined* in the api file. The audit
  is per-Api: for each, move any non-Api class and any domain-type
  definition to `lib/`, leaving the Api a static-class + surface-types +
  re-export face.
- **The lint family enforces what types and call-security can't.** Three
  checks gate CI: (1) an ESLint rule — every `FromModule(...)` string
  resolves to a real module; (2) a **CI assertion driven by the
  doc-projection script** (which already walks signatures) — every public
  face re-exports the types in its own signatures (typed-AST as an ESLint
  rule proved too fragile); (3) an ESLint rule — sealed-subdir isolation,
  only `api/<x>.ts` may import from `api/<x>/**`.
- **The module taxonomy gains its missing category.** `architecture.md`
  names the fourth `lib/` shape — the named value-object / vocabulary /
  registry module — and states the one-concept-per-module rule and the
  definition-site-vs-import-site distinction. The conventions land across
  the doc set per the slate's doc-landing map.

## Non-goals

- **The Api reorg (split / merge / rename).** Apis are converted *as they
  stand*. Re-dividing the Api layer is a separate, later activity the
  refactor *enables* (by making boundaries soft) but does not perform.
  Convert-as-is, reorganize-never (this build). [slate Thread 8]
- **Converting the excluded set (6).** The four bootstrap-special Apis
  (`security`, `module`, `proxy`, `execution-context` — they *are* the
  framework), `stuff` itself (the bootstrap; `singletonSync` lives on it;
  can't be a Stuff of itself), and **`mixin`** (`MixinApi` sits in the
  proxy/`register` hot path — converting it forms a re-entrant bootstrap
  cycle `singletonSync`→`register`→`MixinApi.assertComposable`) stay as
  static classes.
- **The doc-surface *consumer* UI.** This build produces the three-tier
  projection + the model it reads; the in-game `help api` browser / web
  view that *renders* it belongs to the [help](../slates/builds/help-slate.md)
  and [authoring-intelligence](../slates/builds/authoring-intelligence-slate.md)
  builds.
- **Persistence / durability changes.** No change to what persists; the
  logic singletons are stateless by construction.
- **Renaming `api/mql/types.ts`.** Decided: it stays as sealed-internal
  scaffolding (only `api/mql.ts` imports it; consumer types re-exported
  from the parent). The no-`types.ts` rule applies past the seal, not
  behind it.

## Surface decisions

The slate's eight threads, as the agreed contract.

### Singleton mechanics
Logic singletons are **stateless**, created via `singletonSync` and cached
in the `byTemplatePath` registry. Reload is the `dest` command:
`destruct` unregisters the singleton, the next callsite re-creates it via
the factory, which resolves the current blueprint through the synchronous
`getCurrentExport`. No automatic invalidation routing is built. The
factory's blueprint check (not a bare `new`) is load-bearing — it's what
makes "dest → next call is fresh" pick up an edit.

### Addressing
`/obj/api/<feature>` path convention; MQL resolves it via the runtime
`byTemplatePath` index (no `Template` doc needed). Address and `dest` by
path everywhere; never cache the stuffId.

### Leakage protection
Protection is at the **call**, not the import: export freely, gate with
`FromModule(its Api)`. Stronger than import-hiding (runtime,
unbypassable, `@Final @Unshadowable`, survives HMR by matching the
stamped module URL). Only `Stuff` instance methods and Api statics are
gateable; plain `lib` functions are not — which is *why* protection-
needing internal logic must be Stuff-shaped (the singleton). A static Api
is a valid *caller* identity (`resolveCallerPath` branch 2b; the
`decorateApiClass` wrapper plants the Api class as the frame target).

### Two-singleton shape (stateful Apis)
Api statics → stateless logic singleton (HMR, `/obj/api/<feature>`) →
pinned stateful singleton (state survives reload). Inserting the logic
layer **re-points the stateful singleton's `FromModule` gate** from the
Api to the logic singleton (`FromTemplate('/obj/api/<feature>')` or its
class module).

### Three doc tiers
internal (`@internal`) / extension (`@hook`) / consumer (public,
unmarked). The tier is derivable from the call-security policy
**everywhere except** override hooks, which are public, ungated, and
**ungateable** (a subclass's `super.onDestruct()` is author code calling
the hook, so a `FromModule(framework)` gate would deny the legitimate
super-chain). Hence the **`@hook` TSDoc tag** — the one human-placed
marker. The extension tier documents the override contract: who invokes
it, when, whether to `super`-chain, veto-vs-witness, return meaning.

### Type placement & import predictability
One concept per module; types/constants are supporting members of a
concept, never a module's reason to exist (no `types.ts` / `constants.ts`
/ barrel on the consumed surface). Definition site is dependency-driven
(may be a cycle-breaking leaf); import site is the face, via type-only
re-export from every face that uses the type. Shared internal (lib-to-lib)
types live with the upstream owner.

### Api export purity & definition placement
`api/` is **static functions + the types they take and return** — nothing
instanceable. Instanceable classes (value/builder classes, collections,
error classes) are `lib/`'s domain; they relocate there, concept-
colocated, and the Api re-exports them from the face (error/value classes
are *value* re-exports — cycle-safe because they follow the normal
`api`→`lib` direction). Type *definitions* default to `lib/` with their
concept; the Api defines only its own call-shapes. This is the
definition-placement half of the refactor (slate Threads 4/5), run as a
per-Api audit alongside the singleton conversion.

### Sealed subdirs
`api/mql/`, `api/mml/`, parser guts are each Api's private
implementation package — internal shape is don't-care, enforced by the
import-boundary lint. Consumer types re-exported from the parent.

### Migration shape
Blanket (every convertible Api, uniform extensibility seam), scriptable
(uniform transform), behavior-preserving, batched by ascending blast
radius. Api boundaries are provisional; the only hard coupling is the
`FromModule` string + `/obj/api/` path, contained by Api↔singleton 1:1 +
a derived constant + the resolves-to-real-module lint.

## Constraints

- **Behavior-preserving.** Each Api's conversion keeps its existing tests
  green; no behavior change is in scope. The full suite, `tsc --noEmit`,
  and `eslint` are clean at the end.
- **One new primitive only.** `StuffApi.singletonSync` is the sole new
  engine method. No new Api, no registry singleton, no watcher — reuses
  `createSync`, `getCurrentExport`, `byTemplatePath`, `_stampTemplatePath`
  (all verified present on master). [feedback: no-new-apis-default,
  no-premature-registries]
- **Inter-stuff contract.** The consumer doc tier is methods-only;
  honors "methods are the contract" — public fields/accessors excluded.
  [CLAUDE.md Inter-Stuff Contract]
- **Privacy rules.** Logic-singleton instance state (if any transient
  caches) uses TS `private`, not `#` (proxy-wrapped host); Api static
  internal slots may use `#`. [CLAUDE.md Member Privacy]
- **Type re-exports are type-only** (`export type {...}`) so they stay
  erased/cycle-free; constants are placed, not re-exported.
- **Excluded set is immutable this build** (bootstrap-special four +
  `stuff`). The bootstrap-special four also already don't self-decorate.
- **No entanglement with the Api reorg.** Any temptation to split/merge/
  rename an Api during conversion is out of scope.
- **De-risk before the sweep.** The uniform transform is proven on the
  pilot sequence — `material` (or `navigation`) warm-up to fix the
  canonical 0-guts recipe, then `locomotion` for the private-guts variant
  — before the blanket pass. Confirm the locomotion/conveyance subsystems
  are quiet before the pilot touches them.

## Acceptance criteria

- `StuffApi.singletonSync(path, factory)` exists with unit tests covering:
  lazy create, cache hit, `dest`→recreate-fresh-via-`getCurrentExport`,
  `byTemplatePath` keying.
- Every convertible Api (all of `api/` except the six excluded) is a thin
  forwarding shell over a logic singleton at `/obj/api/<feature>`. Stateful
  Apis use the two-singleton shape: `access`/`scheduler` re-point their
  gate to the logic singleton, `soul` gains one; `schedule` converts
  partially (`runRoot`/`planRun` remain Api statics).
- **No `api/` file exports an instanceable class** (grep-checkable). The
  eight listed classes (`Scene`, `Mml`, `Prose`, `PathTrie`, and the four
  error classes) live in `lib/` concept-colocated, re-exported from their
  faces; their import sites are updated; behavior unchanged. Domain-concept
  types are defined in `lib/`, not the api file.
- A non-Api caller invoking any logic singleton's method is denied at
  runtime (covered by test).
- HMR is demonstrated end-to-end on `locomotion`: editing a logic method,
  `dest`-ing the singleton, and observing new behavior via the movement
  verbs (documented verification).
- TypeDoc output for any converted Api shows only its public statics (the
  relocated guts no longer appear); the logic singletons are `@internal`.
- The three-tier doc projection runs over `api-model.json` and emits
  consumer / extension / internal correctly; every framework-invoked
  override hook in the codebase carries `@hook` and lands in the extension
  tier with its override contract.
- Author-facing types are importable (type-only) from every face that
  uses them; no generic-named exported types remain on the author
  surface.
- The three checks gate CI green: two ESLint rules (`FromModule`-resolves,
  sealed-subdir-isolation) and one projection-driven CI assertion
  (every-face-re-exports-its-types).
- Docs updated per the landing map: `architecture.md` (4th lib category +
  one-concept rule + definition-vs-import-site), `antipatterns.md`
  (ban `types.ts`/`constants.ts`/barrels + generic exported type names;
  protect-the-call), `call-security.md` (the api↔singleton recipe +
  ungateable-hook note), `hot-reload.md` (`singletonSync` + `/obj/api/`
  convention), doc-gen/`help` config (the three-tier projection), and
  CLAUDE.md (revise "cross-cutting helpers default to an Api class";
  state callable==visible==cared-about).
- Full test suite, `tsc --noEmit`, and `eslint` clean.

## Cross-references

- **Seeding slate:** [surface-architecture-slate](../slates/tails/surface-architecture-slate.md)
- **Subsystem docs:** [call-security.md](../subsystems/call-security.md),
  [hot-reload.md](../subsystems/hot-reload.md),
  [mixins.md](../subsystems/mixins.md),
  [app-settings.md](../subsystems/app-settings.md) (the state-extraction
  precedent), [mql.md](../subsystems/mql.md) (path resolution)
- **Architecture:** [architecture.md](../architecture.md),
  [antipatterns.md](../antipatterns.md)
- **Doc generation:** `packages/server/typedoc.json`, `api-model.json`,
  the scaffolded `HelpController` (`help api`)
- **Feedback rules (memory):** no-new-apis-default, no-premature-registries,
  colocate-types / no-types.ts-barrels, substrate-no-content-hooks
