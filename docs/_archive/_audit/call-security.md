# Audit: CALL_SECURITY.md (~100KB source)

**Verdict: heavy rewrite with substantial salvage.**

Roughly:
- ~50% **implementation reference, accurate** (Six Pillars overview, conceptual
  model, identity model, Final, most of Tier 3 shadow spec) — keep with minor
  edits to drop "we will build" language
- ~25% **design rationale worth keeping but trimming**
  (responsibility-on-stack essay, hybrid-vs-decorator-vs-proxy debate,
  callDown vs phase-decorators table) — the historical "why" is genuinely
  useful; trim aspirational framing
- ~25% **speculative/aspirational/stale, cut**: Tier phasing as a work plan,
  deferred Avatar-aware policies with worked examples, ESLint rule, audit-log
  JSON format, `_isApi` flag debate (long since resolved), Tier 1–5 roadmap,
  Open Questions resolved long ago

## 1. Accurate (still match)

- Six Pillars framing (ExecutionContext, destroyed-object guard, policy
  enforcement, function shadowing, audit, privileged-surface mediation)
- "Conceptual Model" — caller / target / method tuple, `null` caller =
  Backend→Application boundary
- ExecutionContext built on `AsyncLocalStorage`; `getCaller`,
  `getCurrentTarget`, `getCallStack`, `dumpCallStack`, `assertCaller` all
  present and named exactly as documented
- Caller Identity Model (3a) — module URL captured by import machinery,
  `path#exportName` form, `WeakMap<Class, ModuleId>`, fail-closed semantics,
  no constructor-name fallback
- Built-in policies that ARE shipped: `Public`, `SystemRoot`, `SelfOnly`,
  `ApiOnly`, `FromTemplate`, `FromModule`, `Custom`, `AllOf`/`AnyOf`/`Not` —
  names and shapes match
- Decorator catalogue: `@CallSecurity`, `@Unshadowable`, `@Final`,
  `@Shadowing`, `@ShadowSecurity` — all 5 implemented with the documented
  polymorphic behavior
- `@Final` section (~150 lines): purpose, enforcement at class-load via
  loader hook, `FinalViolationError`, validation algorithm, multi-level
  inheritance — matches `ModuleApi.#validateNoFinalOverrides` and `errors.ts`
- Tier 3 Shadow spec (sections 3.1–3.12) — class shape, WeakMap reference
  discipline, attach/detach/clear, dispatch ordering, `callDown`/`callBypass`,
  lifecycle ordering on destruct, "shadows-as-Stuff" persistence story —
  all match `ShadowApi` and `Shadow` implementation closely
- Errors: `SecurityError`, `DestroyedObjectError`, `ShadowError`,
  `FinalViolationError` — all four exist with documented payload fields

## 2. Drifted

- **Interception architecture**: Doc says "decorator + Proxy hybrid" with
  implication that decorators wrap descriptors directly. Reality is a richer
  **interceptor pipeline**: `ProxyApi` owns the proxy + wrapper cache +
  `PASSTHROUGH_KEYS` + `RAW_TARGET` symbol; `SecurityApi.installInterceptor()`
  registers a `#securityGate` interceptor via
  `ProxyApi.registerInterceptor()`. The pipeline (`Interceptor`,
  `InterceptionContext`, `next()`) is a real first-class extension point not
  described in the doc.
- **Static-method Api wrapping**: doc handwaves "synthesize a frame at the
  Api boundary." Reality: `SecurityApi.decorateApiClass(cls)` and
  `_wrapStaticDescriptor` walk every own static, install a wrapper that calls
  `resolveStaticCallPolicy` and `ExecutionContextApi.run`. Each Api file ends
  with an explicit `SecurityApi.decorateApiClass(XApi)` call.
- **Audit log**: doc shows `{ kind: 'security_deny', … }` and
  `{ kind: 'shadow_attached', … }` structured entries. Implementation:
  nothing. No structured audit anywhere in `security.ts` / `shadow.ts`.
  Pillar 5 ("Audit / logging") is essentially unimplemented; `MudlogApi`
  exists but isn't wired to security.
- **Constructor frame shape**: doc says
  `{ caller: StuffApi, target: <new instance>, method: 'constructor' }`.
  Reality uses a typed `FrameKind.Constructor` planted by
  `StuffApi.#registerAndInit` (the doc never mentions `FrameKind` at all).
- **Frame-mutator authorization**: not in doc. `ExecutionContextApi`
  enforces a `_frameMutatorAllowlist` of file-URL regexes for `run` /
  `runRoot` / `tagCurrentFrame` / `updateCurrentFrameMetadata`. This is a
  load-bearing trust boundary the doc doesn't describe.
- **Test seams**: not in doc. `SecurityApi.assertTestOnly(op)` walks
  `Error.stack` for `.test.{ts,js}` frames and is required at the top of
  every `_*ForTest` method on every Api class.
- **Bypass-marker mechanism for `callDown`/`callBypass`**: doc describes
  "ALS bypass marker the proxy honours." Reality matches but uses
  `ShadowApi._consumeBypass()` consumed atomically in
  `SecurityApi.#securityGate` — the late-binding `ShadowApiLike` interface
  and module-load registration via `_registerShadowApi` are non-trivial real
  plumbing the doc skips.

## 3. Gone (described features that don't exist)

- **`Admin`, `ByCommandGiver`, `ByActingAvatar`, `ByResponsibleAvatar`
  policies**: doc explicitly defers (good) but still has long worked examples
  + rule-of-thumb tables for them. Code has none.
- **`getActingAvatar()` / `getResponsibleAvatar()`**: deferred. Code only has
  `getCurrentCommandGiver()`.
- **`@UnshadowableClass`**: doc mentions both `@Unshadowable` and
  `@UnshadowableClass`. Reality: only `@Unshadowable` (polymorphic, takes
  class form too). Class form goes through `_markClassUnshadowable` — same
  decorator, same name.
- **ESLint rule `require-secured-decorator`**: doc lists; nothing in repo.
- **Tiered phasing language ("Tier 1, Tier 2, …")**: useful only as
  historical context. Everything from Tier 1–4 is built; it reads as
  planning when it should read as architecture-of-shipped-system.
- **Set-trap absence claim**: doc says "no `set` trap in v1" — that's still
  true, worth keeping.

## 4. Missing from doc (in code, undocumented)

- **`ProxyApi` as the extension point**, with `Interceptor` /
  `InterceptionContext` / `registerInterceptor` / `RAW_TARGET` /
  `PASSTHROUGH_KEYS` / wrapper-cache (mock-spy passthrough). This is now a
  separately-documentable subsystem the doc doesn't mention.
- **`FrameKind` taxonomy** (`Root`, `Constructor`, `Command`) and
  `tagCurrentFrame` / `findFrame` — the typed-frame mechanism replaced
  ad-hoc metadata sniffing.
- **`runRoot` vs `run`** — the explicit "boundary planter" distinction.
- **Frame-mutator allowlist** as the trust boundary protecting frame pushes.
- **`_consumeBypass` / `_withDispatch` / `_invokeOnShadow`** late-binding
  scheme between `SecurityApi` and `ShadowApi` — the bootstrap-cycle
  avoidance is real and load-bearing.
- **`updateCurrentFrameMetadata` + `causingCommandId` +
  `getCurrentCommandContext`** — command-attribution mechanism that touches
  `ScheduleApi` (re-planted causingCommandId on Root frames for delayed
  callbacks). Not in doc.
- **`assertTestOnly` test-seam framework** — universal pattern across every
  Api class.
- **Why each Api file deliberately does NOT decorate itself**
  (ExecutionContextApi, ModuleApi, SecurityApi, ProxyApi) — the
  bootstrap-cycle reasoning is documented in code comments but not in
  CALL_SECURITY.md.

## 5. Salvage

- Conceptual Model + caller/target/method diagram + null-caller story —
  keep verbatim
- "Responsibility on the call stack" essay (lines 86–152) — excellent design
  rationale, keep
- Caller Identity Model (3a) — accurate description of what shipped
- The `@Final` section (~160 lines) is still right end-to-end
- The Tier 3 Shadow spec (sections 3.1–3.12) — about 750 lines, mostly
  accurate; trim "Tier 3 — coming" framing and a few pre-implementation
  hedges
- "Privileged Surfaces" table for `Stuff.destroy` etc. — mechanism still right
- "Hydrator — not an exception" subsection — the principle still holds

## 6. Major additions needed

- A section on **`ProxyApi` as the interceptor pipeline**
- **`FrameKind` + frame-tagging machinery**
- **Frame-mutator allowlist + `assertTestOnly` test seams**
- **Late-binding shape between `SecurityApi`/`ShadowApi`**
- **Command-attribution (`causingCommandId`, `updateCurrentFrameMetadata`)**
- **Per-Api `decorateApiClass(XApi)` self-registration pattern**
- **Bootstrap-cycle avoidance pattern** (why ExecutionContextApi/ModuleApi/
  SecurityApi/ProxyApi don't decorate themselves)

## 7. Relevant files

- `packages/server/src/mud/api/security.ts`
- `packages/server/src/mud/api/proxy.ts`
- `packages/server/src/mud/api/execution-context.ts`
- `packages/server/src/mud/api/shadow.ts`
- `packages/server/src/mud/lib/security/SecurityPolicies.ts`
- `packages/server/src/mud/lib/security/decorators.ts`
- `packages/server/src/mud/lib/security/errors.ts`
- `packages/server/src/mud/lib/stuff/Shadow.ts`
- `packages/server/src/mud/api/module.ts` (Final validation)
