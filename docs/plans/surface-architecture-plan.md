# Surface Architecture — Implementation Plan

A phased, behavior-preserving refactor making the engine's public surface a single enforced boundary. Every convertible `Api` becomes a thin forwarding shell over a stateless, HMR-able `Stuff` logic singleton gated to its Api; the author doc surface becomes a computed three-tier projection; and a lint family enforces what types and call-security can't. Phases run **P0 infra → DP definition-placement (api→lib; co-equal, interleaved) → P1 pilot → P2 tooling → P3 sweep → Docs → Verification**.

Plans against [../requirements/surface-architecture-requirements.md](../requirements/surface-architecture-requirements.md). All paths are absolute from repo root `/home/bobalu/play/saxonberg/master`; server source root is `packages/server/src/mud/`.

> **Reconcile-before-build flags — RESOLVED with the build owner.** The planning pass found six places the code diverges from the requirements; the load-bearing four are now decided and the requirements doc is updated to match:
> - **`mixin` → 6th exclusion** (re-entrant bootstrap cycle). The excluded set is now 6; `mixin` is removed from Wave D.
> - **`schedule` → partial conversion**: `runRoot`/`planRun` stay Api statics (frame-mutator allowlist); only non-frame-mutating logic migrates; timers are per-handle closures (no state to pin).
> - **`soul` → gate added** (SoulCatalogue has none today), not re-pointed.
> - **Lint #2 → CI assertion** via the doc-projection script, not a typed ESLint rule.
> The other two (intra-singleton self-call gate; the non-Api-first export naming) are resolved inside the recipe below.

## Verified ground truth (what the code actually supports)

1. **`singletonSync` can stamp the path.** `Stuff._stampTemplatePath`'s caller allowlist (`Stuff.ts` `#stampGateAllowlist`) already permits `/\/mud\/api\/stuff\.(ts|js)$/`. Since `singletonSync` lives on `StuffApi` in `api/stuff.ts`, it may call `_stampTemplatePath` with **no allowlist edit**.
2. **`createSync` exists and is synchronous** (`api/stuff.ts:529`): sentinel-flip → `ProxyApi.wrap` → `register`. It throws if the class composes `PostRegistrationMixin` — logic singletons must **not** compose it (statelessness is load-bearing).
3. **`getCurrentExport(absPath, exportName)` is sync** (Map lookup; `api/hot-reload.ts`, used un-awaited at `api/stuff.ts:283`).
4. **`byTemplatePath` is the registry; `destruct` unregisters via `#updateIndexes`** (`api/stuff.ts`). A `dest` on a path-stamped singleton empties its bucket; the next `singletonSync` re-creates.
5. **MQL resolves `/obj/api/*` from the live `byTemplatePath` index** with no Template doc.
6. **Static-Api-caller → instance-singleton-callee gate works.** `resolveCallerPath` branch 2b (`SecurityPolicies.ts:107-111`) returns `ModuleApi.lookup(callerClass)` for a function caller; `decorateApiClass`'s wrapper runs the body with target = the Api class. A singleton method gated `FromModule('mud/api/foo#FooApi')` sees the Api class as caller and allows; anything else denies.
7. **Class-level default policy works on a Stuff.** `resolveCallPolicy` (`api/security.ts:203-224`) falls back to a class-default-policy walk — one class-level gate covers every instance method. (Resolves slate Open Question 4.)
8. **The sealed-subdir lint already exists** for `api/mql/` and `api/mml/` in `.eslintrc.js` via `no-restricted-imports`. P2 generalizes it; it is not net-new.

### Requirement-vs-code discrepancies (flag before build)

- **`SoulCatalogue` is NOT prior art for the gate.** `obj/SoulCatalogue.ts` carries **zero** `@CallSecurity`. Only `obj/AccessRegistry.ts` actually carries `FromModule('mud/api/access#AccessApi')`. The `soul` conversion must *add* the gate, not "re-point an existing" one — more work than the requirements imply.
- **`<feature>` → `<Feature>Api` is not always mechanical.** Seven Api files export a non-Api class *first* (`containment.ts`→`ContainmentError`, `message.ts`→`Scene`, `mml.ts`→`Mml`, `prose.ts`→`Prose`, `prompt.ts`→`PromptCancelledError`, `source-tree.ts`→`SourceTreeSandboxError`, `template.ts`→`TemplateError`). The transform must read the *Api* class (the one passed to `decorateApiClass`), not the first class. `message`'s primary export is `Scene` (instantiable) — handle carefully (Wave D).

## Inventory: the 51 Apis, partitioned

**Excluded — immutable this build (6):** `security`, `module`, `proxy`, `execution-context` (bootstrap-special), `stuff` (the bootstrap; `singletonSync` lives on it), **`mixin`** (re-entrant bootstrap cycle — see Wave D; decided).

**Stateful — two-singleton shape (4):** `access` (state in `AccessRegistry`, gate exists), `soul` (state in `SoulCatalogue`, **gate must be added**), `scheduler` (state in `SchedulerRegistry`), `schedule` (state = live Node timers; see P3.4 — likely a *partial* conversion).

**Convertible (the remaining ~42):** everything else. `hot-reload`, `mudlog`, and other framework-internal Apis are convertible but should likely be tagged `@internal` rather than given an author surface (P2.2).

**Blast-radius ordering (non-test importer counts, measured):**

```
 0  array, quantity(*5 real)
 1  material, mudlog, soul
 2  belief, glob, prompt, prose
 3  boundary, celestial, command-line, grammar, group, recognition, schedule, scheduler
 4  app, chat, connection, shell
 5  locomotion, navigation, posture, worldclock
 6  zone
 7  bulk, slot
 9  event, template
10  biome, player, species
11  source-tree
13  mql-subscription
14  access, perception
35  containment
75  mql
103 message
107 mml
158 mixin
173 command
```

Sweep ascending; `mixin`, `command`, `mml`, `message`, `mql`, `containment` land **last**.

---

## Phase 0 — Infra: `StuffApi.singletonSync` (zero Apis touched)

### Step 0.1 — Add `StuffApi.singletonSync(path, factory)`
**File:** `packages/server/src/mud/api/stuff.ts`. New `public static` method, sibling to `singleton`/`createSync`:
```ts
public static singletonSync<T extends Stuff>(path: string, factory: () => T): T {
  const bucket = this.#indexes.byTemplatePath.exact(path);
  if (bucket.length === 1) return bucket[0] as T;
  if (bucket.length > 1) throw /* multi-instance violation, mirror singleton() */;
  const raw = this.createSync(factory);     // sentinel + wrap + register (byId only)
  Stuff._stampTemplatePath(raw, path);       // re-key into byTemplatePath
  StuffApi._reindexTemplatePath(raw, null, path);
  return raw;
}
```
`createSync` registers into `byId` (no path yet); we then stamp + `_reindexTemplatePath` (`api/stuff.ts:856`) to insert into `byTemplatePath`, mirroring how `setTemplatePath` re-keys. Confirm the `PostRegistrationMixin` guard in `createSync` does not fire. Wrapped by the existing `decorateApiClass(StuffApi)`; tag `@internal`.

**Riskiest detail:** stamp-vs-index ordering. **Alternative considered & rejected:** add a `path?` param to `createSync` to stamp pre-register — touches a load-bearing primitive; post-hoc re-index is additive and contained.

### Step 0.2 — The factory pattern (contract for every conversion)
```ts
() => {
  const Cls = HotReloadApi.getCurrentExport(LOGIC_CLASS_FILE, "FooLogic") ?? FooLogic;
  return new Cls();
}
```
`LOGIC_CLASS_FILE` = the logic *class module's* absolute fs path (`fileURLToPath(new URL('../obj/api/FooLogic', import.meta.url))`). The `getCurrentExport` check is **load-bearing** — a bare `new FooLogic()` rebuilds the stale class after reload. Note: the class-module path (for `getCurrentExport`) and the `/obj/api/<feature>` stamp path (for addressing) are **distinct**; keep both in every conversion.

### Step 0.3 — Unit tests
**File (new):** `packages/server/src/mud/api/__tests__/singleton-sync.test.ts`. Cover (acceptance #1): lazy create; cache hit (`===`); `dest`→recreate-fresh after `HotReloadApi.reload` (assert behavior change); `byTemplatePath` keying via `findByPathGlob('/obj/api/*')`; multi-instance guard throw.

**Sequencing:** P0 blocks everything; nothing else starts until 0.3 is green and the full suite + `tsc --noEmit` stay green with zero Apis converted.

---

## Phase DP — Definition placement (api → lib)

The other half of the refactor (slate Threads 4/5), co-equal with the
singleton migration: **`api/` is static functions + the types they take
and return — nothing instanceable.** Eight non-Api classes currently in
`api/` relocate to `lib/`, concept-colocated, each re-exported from its
face (so callers reach it through the Api). Type *definitions* default to
`lib/` with their concept; the Api defines only its own call-shapes
(option/result/handle types — the `ScheduleHandle` precedent).

### The eight classes (measured) and their target homes

| Class (current) | Kind | Target `lib/` home (concept) | Re-export from face | Notes |
|---|---|---|---|---|
| `Scene` (`api/message.ts`) | value/builder | `lib/message/Scene.ts` | value | high blast radius (MessageApi has 103 importers; `Scene` itself widely used) |
| `Mml` (`api/mml.ts`) | value/builder | `lib/message/Mml.ts` (or `lib/markup/`) | value | high blast radius (107) |
| `Prose` (`api/prose.ts`) | value/builder | `lib/prose/Prose.ts` | value | |
| `PathTrie<T>` (`api/path-pattern.ts`) | collection | `lib/collections/PathTrie.ts` | value | used by `StuffApi.byTemplatePath`, MQL |
| `ContainmentError` (`api/containment.ts`) | error | `lib/spatial/` | value (`instanceof`) | |
| `PromptCancelledError` (`api/prompt.ts`) | error | `lib/prompt/` | value | |
| `SourceTreeSandboxError` (`api/source-tree.ts`) | error | `lib/shell/` (source-tree) | value | |
| `TemplateError` (`api/template.ts`) | error | `lib/stuff/` (Template) | value | |

Exact concept dir confirmed by the implementation agent. **Re-exports here are *value* re-exports** (callers need the class for `new`/`instanceof`), not type-only — cycle-safe because they follow the normal `api`→`lib` runtime direction (lib already imports Apis; the Api importing a lib class is the standard direction).

### Step DP.1 — Relocate the four shared value/data classes early
`Scene`, `Mml`, `Prose`, `PathTrie` are **independent of the singleton conversion** and have the widest blast radius. Move each (file move + update all import sites to the new `lib/` path or the Api's value re-export) in its **own commit, before** converting its (central, Wave-D) Api. This decouples the high-fanout class move from the riskier singleton conversion of `message`/`mml`/`prose`. Each move: relocate the class, leave a value re-export in the api file, repoint importers, suite green.

### Step DP.2 — Per-Api definition audit (folded into the conversion recipe)
For **every** Api converted in P1/P3, as part of its recipe: relocate its error class (if any) to its concept's `lib/` module, and move any **domain-concept type definition** out of the api file into `lib/` with its concept (re-export type-only from the face). Leave the api file with: the static Api class, its own call-shape types, and re-exports. Verify: no `api/<x>.ts` retains an `export class` other than `<X>Api` (the grep check below).

### Verification (acceptance: api export purity)
`grep -rnE "^export (default )?(abstract )?class " packages/server/src/mud/api/*.ts | grep -viE "class [A-Za-z]+Api\b"` returns **empty** at the end of the build (excludes test files). Behavior unchanged (the relocations are moves + re-exports, not rewrites).

## Phase 1 — Pilot (prove the recipe twice)

### Canonical 0-guts recipe — `material` then `navigation`
`material` first (1 importer; has module-private free fns `everyMaterial`/`expandInto`/`isMaterial` — realistic), then `navigation` (5 importers, pure table — trivial).

**Step P1.1 — Logic singleton class.** New `packages/server/src/mud/obj/api/MaterialLogic.ts`. Placement: the class is a `Stuff` (runtime class → `obj/`); new `obj/api/` dir mirrors the `/obj/api/` address. Extends `Idea`; **no** `PostRegistrationMixin`. Class-level `@CallSecurity(FromModule(MATERIAL_API_MODULE_ID))` (covers all instance methods). The `FromModule` string comes from a **constant** (`const MATERIAL_API_MODULE_ID = 'mud/api/material#MaterialApi'`), one edit site per rename (slate Thread 8 mitigation). Tag `@internal`. Former public statics → instance methods; module-private helpers stay free functions in the file (not the gated surface). Transient caches (none expected) use TS `private`, never `#`.

**Step P1.2 — Convert the Api to a forwarding shell.** `api/material.ts`:
```ts
const LOGIC_PATH = '/obj/api/material';
const LOGIC_CLASS_FILE = fileURLToPath(new URL('../obj/api/MaterialLogic', import.meta.url));
function logic(): MaterialLogic {
  return StuffApi.singletonSync(LOGIC_PATH, () =>
    new (HotReloadApi.getCurrentExport(LOGIC_CLASS_FILE, 'MaterialLogic') ?? MaterialLogic)());
}
export class MaterialApi {
  public static materialOf(s: Stuff, k?: string): Material | null { return logic().materialOf(s, k); }
  // one-line forwarder per former static, byte-identical signatures
}
export type { MaterialComposition };                 // face's own type, kept
SecurityApi.decorateApiClass(MaterialApi);
```
Api keeps only: typed surface, `decorateApiClass`, forwarding, type re-exports. Signatures byte-identical (behavior-preserving).

**Plus the definition audit (Step DP.2, every conversion):** relocate any non-Api class (error class) and any domain-concept type *definition* from this api file to `lib/` with its concept, re-export from the face. The api file ends with only `<X>Api` + its own call-shape types + re-exports. (For `material`: nothing to relocate — it's the clean case; for `prompt`/`containment`/`template`/`source-tree`: move the error class.)

**Step P1.3 — Tag author-facing.** `MaterialApi` stays unmarked (consumer tier).

**Step P1.4 — Acceptance (material).** `pnpm --filter @saxonberg/server test material` green; **deny test** (acceptance #3): fetch the singleton via `findByTemplatePath('/obj/api/material')`, call a method from a non-Api frame → expect `SecurityError` (mirror AccessRegistry deny test); `tsc`/`eslint` clean.

**Step P1.5 — Repeat on `navigation`.** Same recipe. `CardinalDirection` re-exports type-only from the face; `DIRECTION_OFFSETS`/`_ALIASES`/`_INVERSES` **constants stay in the logic file** (constants are placed, not re-exported).

### Step P1.6 — Private-guts variant: `locomotion`
~630 LOC, 20 statics, 5 `static #` helpers, 1 module const.

**The critical discovery (riskiest in the build):** class-level `FromModule(own Api)` **breaks intra-singleton `this.x()` calls** — the inner call's caller is the singleton, not the Api, so the gate **denies** it. **Resolutions (this sets the pattern for all guts conversions):**
1. **`AnyOf(FromModule(own Api), SelfOnly)`** — allow the Api and self-calls (`SelfOnly` = `caller === target`, passes for `this.x()`). Verify against `SelfOnlyPolicy` (`SecurityPolicies.ts:64-67`).
2. **Stateless private helpers → module-private free functions** in the logic file (un-gated but off-class, so un-callable from outside), taking data as params.

**Decision baked into the recipe:** stateless helpers (locomotion's are all stateless) → free functions; fall back to `AnyOf(FromModule, SelfOnly)` only for a helper that must be an instance method needing `this`. This is the single most important non-obvious rule for the sweep.

`async` methods stay async instance methods; forwarder is `static async traverseWithDefault(...) { return logic().traverseWithDefault(...); }` (async because the *method* is async, not to fetch the singleton). Author types `EmissionData`/`BodyProfile`/`GroundContact`/`NoiseLevel`/`Enablement`/`TraversalGuard` re-export type-only from `LocomotionApi`.

### Step P1.7 — HMR demo on locomotion (acceptance #4)
Documented manual run: `pnpm dev:server` → confirm `walk west` → edit a `LocomotionLogic` method body → in-game `dest /obj/api/locomotion` → movement verb shows new behavior. Capture in `hot-reload.md`.

**De-risk gate:** confirm locomotion/conveyance subsystems are quiet (they are — isolated build).

**P1 exit:** material + navigation + locomotion converted; tests + deny test green; HMR demonstrated; `tsc`/`eslint` clean; both recipe variants (0-guts, guts) locked and scriptable.

---

## Phase 2 — Tooling (pilot as real input)

### Step P2.1 — `@hook` TSDoc tag mechanism
Add `@hook` to recognized block tags in `packages/server/typedoc.json` (so TypeDoc preserves it in `api-model.json` `comment.blockTags` and doesn't warn). No decorator. Establish a mini-template for the override-contract body (who invokes, when, super-chain, veto-vs-witness, return meaning).

### Step P2.2 — Codebase `@hook` tagging pass (acceptance #6)
Scope (measured: 41 files mention onDestruct/canDestruct/postRegister; 16 mention `apply<Field>`; plus `obj/hooks/`, Avatar.save/onLinkdead). Tag every framework-invoked override hook: `Stuff.onDestruct()`/`canDestruct()` + overrides; `postRegister` + overrides; `apply<Field>` appliers; `obj/hooks/DomainHook.ts` `aroundSave`/`aroundDelete`; `Avatar.save()`, `onLinkdead`. One-tag-per-hook, comment-only (behavior-neutral). Verify: a grep/check that known hook names carry `@hook` + the projection lands them in the extension tier.

### Step P2.3 — Three-tier doc projection over `api-model.json`
**File (new):** `packages/server/scripts/project-author-surface.ts` (a build script). Reads `packages/server/docs/api/api-model.json`, emits `author-surface.json` for the `help api` browser. Rules:
- **internal:** TypeDoc already drops `@internal` (`excludeInternal: true`) — logic singletons won't appear; projection drops any stragglers.
- **extension:** comment has `@hook` → extension tier with the contract body.
- **consumer:** public, unmarked: (1) public static Api methods; (2) public **methods** of author-facing Stuff/mixin — **fields/accessor-kind reflections excluded** (methods-are-the-contract filter); (3) the **transitive closure** of I/O types from signatures in (1)/(2)/extension — walk param/return `ReferenceType`s, pull targets wherever they live.
Add `pnpm docs:project` after `docs:server`. Unit-test the projection on a small fixture model.

### Step P2.4 — The three lints (acceptance #7)
**File:** `.eslintrc.js` (+ `packages/server/eslint-rules/` for custom rules).
1. **`FromModule`-resolves** — AST rule over `FromModule('...')` / `FromController` string args (+ derived `*_MODULE_ID` consts): parse `path#export`, assert the file exists under `src/mud/` and the export exists. (Slate Thread 8 mitigation #3.)
2. **Every-face-re-exports-its-signature-types — DECIDED: a projection-driven CI assertion, not an ESLint rule.** The P2.3 doc-projection script already walks every face's signatures; have it emit a report (faces missing a re-export of a type they speak) that a CI step fails on. More robust than a typed-AST ESLint rule (`parserOptions.project` is slow/fragile). The requirements acceptance criterion is updated to match.
3. **Sealed-subdir isolation** — **generalize the existing** `no-restricted-imports` rule (currently mql/mml): only `api/<x>.ts` may import `api/<x>/**`. Extending the enumeration is sufficient (only mql/mml have subdirs today); a path-deriving custom rule is optional polish.

**Sequencing (critical):** lints #1 and #2 must be **`warn` during the sweep**, flipped to **`error` (CI-gating) at the end of P3** when every Api carries its gate — else every intermediate commit reds CI. Lint #3 stays `error` (already is).

---

## Phase 3 — Blanket sweep (~42 Apis, behavior-preserving, batched)

### Step P3.1 — Script the 0-guts transform
A ts-morph **codemod** (run-once): per Api, read the class passed to `decorateApiClass`; move each public-static body to a generated `obj/api/<Feature>Logic.ts` instance method, leave a forwarder; add the path constant, class-file path, factory, `logic()` helper, class-level gate constant, `@internal` on the logic class; preserve type re-exports. Handles ~80% of 0-guts Apis; hand-finish the rest. **Must read the *Api* class, not the first-exported class** (the seven non-Api-first files). Guts Apis hand-converted via the P1.6 pattern.

### Step P3.2 — Batch by ascending blast radius (tests green per Api)
- **Wave A (0–3):** array, quantity, mudlog(or `@internal`), belief, glob, prompt, prose, boundary, celestial, command-line, grammar, group, recognition.
- **Wave B (4–7):** app, chat, connection, shell, posture, worldclock, zone, bulk, slot. *(navigation✔/locomotion✔/material✔ pilot.)*
- **Wave C (9–14):** event, template, biome, player, species, source-tree, mql-subscription, perception.
- **Wave D (central, last):** containment, mql, message, mml, command. *(mixin excluded — see below.)*

**Wave D special cases:**
- `mql`/`mml` have **sealed subdirs** — only the *parent facade's* statics migrate to the logic singleton; the subdir stays the private impl package (lint #3). Do **not** move the subdir into the logic singleton.
- `message` exports `Scene` (instantiable, primary) + `MessageApi` — **only `MessageApi`'s statics convert**; `Scene` stays.
- `command` extremely central; isolated commits, full suite each.
- **`mixin` — EXCLUDED (decided, 6th exclusion).** Converting it forms a re-entrant bootstrap cycle: `singletonSync`→`createSync`→`register`→`MixinApi.assertComposable`→`MixinApi.x()`→re-entrant `singletonSync` (no in-flight coalescing in the sync path). It stays a static class like the other framework-infra Apis. Removed from this wave.

### Step P3.3 — Per-Api discipline
One commit per Api: new `obj/api/<X>Logic.ts` + shell + type re-exports + **the DP.2 definition audit** (relocate the api file's error class + domain-type definitions to `lib/`) + deny test; existing tests + `tsc` green before commit. No signature changes, no split/merge/rename (Non-goal). End-state per file: the api purity grep (Phase DP) is empty.

### Step P3.4 — Stateful Apis: two-singleton shape
Insert the stateless logic singleton **between** the Api statics and the existing pinned state singleton; **re-point** the pinned singleton's gate to the logic singleton.
- **`access`:** new `obj/api/AccessLogic.ts` (`/obj/api/access`); move `AccessApi`'s orchestration (`#lookupRegistry`/fallback, `playerIdOfQuick`) into it; `AccessApi` → forwarder. `AccessLogic` reaches `AccessRegistry`. Re-point `AccessRegistry`'s gate from `FromModule('mud/api/access#AccessApi')` to `FromModule('mud/obj/api/AccessLogic#AccessLogic')` (or `FromTemplate('/obj/api/access')`); update its doc comment.
- **`soul`:** new `obj/api/SoulLogic.ts`; **ADD** a gate to `SoulCatalogue` (none today) → `FromModule(...SoulLogic)`. Extra work vs requirements.
- **`scheduler`:** new `obj/api/SchedulerLogic.ts`; re-point `SchedulerRegistry`'s existing gate. The activity-class HMR registry stays on the pinned Registry; only orchestration migrates.
- **`schedule` (PARTIAL — decided):** timers are **per-handle closures**, not shared state — no separate pinned state singleton needed. `planRun`'s `ExecutionContextApi.runRoot` is gated to the `mud/api/` frame-mutator allowlist; `obj/api/ScheduleLogic` is **not** in it. **Decision: keep `runRoot`/`planRun` on the Api static** (legitimate framework-boundary code in `mud/api/`); migrate only the non-frame-mutating logic. The `obj/api/` allowlist is deliberately *not* widened (keeps the frame-mutator surface tight).

**General two-singleton gate note:** `obj/api/<X>Logic.ts` is **not** under `mud/api/`, so `ApiOnly` (`FromModule('mud/api/**')`) does **not** cover it. Audit each stateful conversion for `ApiOnly`-gated downstream calls; re-point or add the logic path to the relevant allowlist (the frame-mutator allowlist is one instance).

---

## Phase Docs — landing map (acceptance #8)

- **`docs/architecture.md`:** 4th lib category (named value-object/vocabulary/registry); one-concept-per-module rule; definition-site-vs-import-site; the `obj/api/<Feature>Logic.ts` + `/obj/api/<feature>` convention.
- **`docs/antipatterns.md`:** ban `types.ts`/`constants.ts`/barrels on the consumed surface; ban generic exported type names (`<Concept><Role>` required); "protect the call, not the import."
- **`docs/subsystems/call-security.md`:** the api↔singleton recipe (verified chain); the intra-singleton self-call gotcha + `AnyOf(FromModule, SelfOnly)`/free-function fix; override hooks are ungateable (super-chain) → `@hook`, not policy.
- **`docs/subsystems/hot-reload.md`:** `singletonSync` + `/obj/api/<feature>` + the locomotion HMR demo.
- **`CLAUDE.md`:** revise "cross-cutting helpers default to an Api class" → "the Api is the dev-facing surface; protection-needing internal logic is Stuff-shaped"; state callable==visible==cared-about; add `obj/api/<X>Logic.ts` to the Module Categories table + the `@hook`/`@internal` tiering.
- **doc-gen/`help` config:** document the three-tier projection + override-contract rendering; wire `pnpm docs:project`.

---

## Phase Verification — acceptance → check map

| Acceptance criterion | Check |
|---|---|
| `singletonSync` + unit tests | P0.3; `pnpm test singleton-sync` |
| Every convertible Api a thin shell; stateful two-singleton w/ re-pointed gates | grep each `api/<x>.ts` imports `<X>Logic` + `singletonSync(LOGIC_PATH,…)`; Registry gates point at Logic classes |
| Non-Api caller denied | per-Api deny test |
| Api export purity (no instanceable class in api/; 8 classes relocated to lib) | Phase DP grep returns empty; the 8 classes resolve under `lib/`; suite green |
| HMR demonstrated on locomotion | P1.7 documented run in hot-reload.md |
| TypeDoc shows only public statics; logic `@internal` | `pnpm docs:server`, inspect `api-model.json` |
| 3-tier projection; every hook `@hook` in extension w/ contract | P2.3 test + run; P2.2 completeness grep |
| Author types importable type-only from every face; no generic names | lint #2 / projection report + grep |
| Three lints authored, CI green | P2.4; flip to `error` end of P3 |
| Docs updated | Phase Docs checklist |
| Suite, `tsc`, `eslint` clean | `pnpm test && pnpm -r build && pnpm lint` |

## Critical files
- `packages/server/src/mud/api/stuff.ts` — host of `singletonSync`; `createSync`/`byTemplatePath`/`_reindexTemplatePath`
- `packages/server/src/mud/lib/security/SecurityPolicies.ts` — `FromModule`/`SelfOnly`/`resolveCallerPath` (the leakage-protection behavior)
- `packages/server/src/mud/lib/stuff/Stuff.ts` — `_stampTemplatePath` seam + allowlist; the `#`-vs-private host rule
- `packages/server/src/mud/obj/AccessRegistry.ts` — true two-singleton + class-gate prior art
- `.eslintrc.js` — existing sealed-subdir rule to generalize; home of the three lints

## Top risks / trade-offs (for the build owner)
1. **Intra-singleton self-call denial** under class-level `FromModule(own Api)` — biggest correctness trap; resolved via free-function helpers or `AnyOf(FromModule, SelfOnly)`. Bake into the recipe before the sweep.
2. **`mixin` re-entrant bootstrap cycle → RESOLVED: 6th exclusion** (decided; requirements updated).
3. **`schedule` `runRoot` vs frame-mutator allowlist → RESOLVED: partial conversion** (runRoot stays Api-static; allowlist not widened; requirements updated).
4. **`SoulCatalogue` has no existing gate** → `soul` *adds* one (requirements wording updated). Active build-note, not a blocker.
5. **Lint sequencing (active):** the gate ESLint rule + the face-re-export CI assertion must be warn-only during the sweep, flipped to error at the end.
6. **Lint #2 → RESOLVED: a projection-driven CI assertion**, not an ESLint rule (decided; requirements updated).
7. **Intra-singleton self-call denial (active recipe rule):** stateless private helpers become free functions; instance helpers needing `this` use `AnyOf(FromModule, SelfOnly)`.
