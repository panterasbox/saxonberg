# Audit: PROTECTED_LIFECYCLE.md

**Verdict: substantially drifted.** Accurate at the API surface
(`destruct`/`prepareDestroy`/FINAL `destroy`) but stale on every mechanism
behind it (sentinel-enforced constructors, decorator-enforced call security,
proxy wrapping, async create/clone, hydrator pipeline, `postRegister`,
shadow detach, around-hooks). Roughly 40% rewrite + 60% additions.

**Subsystem-doc question — Merge.** The "destruction-only" framing is too
narrow given how much of the lifecycle now lives in the same
`StuffApi.#registerAndInit` plumbing. Recommend folding into a single
**"Stuff Lifecycle"** doc covering `create`/`clone`/`createSync` →
sentinel-gated construction → proxy wrap → register → hydrate → `postRegister`
→ ... → `destruct` → `prepareDestroy` → shadow detach → `destroy` →
unregister. Around-hooks (`AroundSaveHookMixin`/`AroundDeleteHookMixin`)
belong in a sibling persistence-hooks doc, not this one — they're
PM-dispatch middleware, not Stuff lifecycle. The construction-sentinel and
call-security decorator details should cross-reference the security-framework
doc rather than be re-explained inline.

## 1. Accurate

- `StuffApi.create(factory)` and `StuffApi.clone(path)` are the canonical
  creation entry points; `clone` is production, `create` is the factory
  variant.
- `StuffApi.destruct(obj)` is the canonical destruction entry point;
  `Stuff.destroy()` is the FINAL implementation that always unregisters.
- `prepareDestroy()` is the subclass cleanup hook; subclasses override it
  and never override `destroy()`.
- The "registration happens in the API layer, not the constructor" principle
  still holds.
- The `Interactive` `prepareDestroy` shape in the example is still
  representative.

## 2. Drifted (old to new)

- "Direct `new` calls will work but object won't be tracked" (lines 17,
  254-258) is wrong. `Stuff` constructor now throws unless
  `Stuff.#expectingConstruction` is set by `StuffApi._beginConstruction()`
  (Stuff.ts:217-223). Direct `new` is no longer a "valid use case for
  testing" — there's a stack-walk-allowlisted test seam (`makeStuff` in
  `lib/security/__tests__/test-setup.ts`) instead.
- `destroy()` is no longer just "FINAL by convention." It now carries
  `@Final @Unshadowable @CallSecurity(SecurityPolicies.ApiOnly)` decorators
  (Stuff.ts:274-276); direct `obj.destroy()` throws `SecurityError`. The
  doc's "When the call-security framework lands" disclaimer is stale — it
  landed.
- `StuffApi.create` is now `async` and returns `Promise<T>` (stuff.ts:293) —
  every example showing `const x = StuffApi.create(...)` should be
  `await StuffApi.create(...)`. Same for `clone`.
- The "Construction and Registration Flow" section omits the synthetic
  constructor frame (`ExecutionContextApi.run` with `FrameKind.Constructor`)
  and Proxy wrapping (`ProxyApi.wrap`) that now bracket register + hydrate
  + postRegister.
- `destruct()` ordering is now spec-defined (stuff.ts:432-458):
  (1) `prepareDestroy` runs through the shadow chain,
  (2) privileged `ShadowApi._detachAllForHost`,
  (3) `destroy()`. The doc never mentions shadows.

## 3. Gone

- The "Why Not Make Constructors Private/Protected?" section (lines 204-258)
  is obsolete — the construction-sentinel mechanism *did* lock down
  constructors, with a different mechanism than the rejected options. The
  whole rationale is moot.
- `Persistent` / `PersistentBase` base classes appear in examples
  (lines 84, 122, 350) but the current base-class lineup is
  `Stuff → Idea → (User|Player|GoogleProfile|Location|Agent)` with
  `Persistable` as a mixin-like helper. There's no `Persistent` class.
- "Direct `new` for testing/special cases" (line 253) — gone; replaced by
  `_beginConstruction` allowlist + `makeStuff` test seam.
- The `_isDestroyed` field reference in the `destroy()` example uses raw
  access; current code uses `this.isDestroyed()` accessor (decorated
  `@Final @Unshadowable`).

## 4. Missing from doc

- **`PostRegistrationMixin`** (`lib/stuff/PostRegistration.ts`) — opt-in
  `postRegister(context?)` hook fired after registration. Replaces the old
  `'initialize' in obj` duck-typing check the doc still implies. Critical
  pairing for the "creation" half of the lifecycle.
- **`createSync`** (stuff.ts:331) — sync sister of `create()` for purely
  synchronous setup; throws if the class composes `PostRegistrationMixin`.
- **Hydrator pipeline** — `hydratorClass` resolution, `PersistentHydrator`,
  opt-in hydration. The doc treats "complex initialization" as "set fields
  in the factory" (lines 132-141), which is no longer how clone works.
- **Construction sentinel** (`#expectingConstruction`, `_beginConstruction`
  / `_endConstruction`, stack-walk allowlist) — the actual mechanism that
  enforces "only StuffApi may construct."
- **`AroundSaveHookMixin` / `AroundDeleteHookMixin`** (`lib/persistence/`) —
  middleware-style PM hooks. Lifecycle-adjacent; persistence-side analogue
  to the destruction hook.
- **Proxy wrapping** (`ProxyApi.wrap`) and **synthetic constructor frame**
  (`ExecutionContextApi.run` with `FrameKind.Constructor`) bracketing
  register + hydrate + postRegister.
- **Failure rollback**: if hydrate or postRegister throws, the object is
  unregistered before the error propagates (stuff.ts:395-398).
- **Shadow detach during destruct** (stuff.ts:441-458) — privileged
  `ShadowApi._detachAllForHost` between `prepareDestroy` and `destroy`.
- **`templatePath` stamping** at clone time and **`zone` stamping** via
  `ZoneApi.resolveZoneForPath` — both happen inside `clone()`'s lifecycle.

## 5. Salvage

- The high-level "API-Layer Creation + API-Layer Destruction" framing
  (section 16-77 minus the call-security disclaimer).
- The `prepareDestroy` semantics and "never override `destroy()`" rule.
- The `StuffApi.destruct(...)` → `prepareDestroy` → unregister sequence
  (with shadow-detach inserted).
- The "Real-World Impact" before/after framing (lines 322-342) is still
  conceptually true; classes don't manually register/unregister.
- The summary's two-line creation/destruction restatement (lines 396-411)
  survives almost verbatim.

## 6. Relevant files

- `packages/server/src/mud/lib/stuff/Stuff.ts`
- `packages/server/src/mud/lib/stuff/PostRegistration.ts`
- `packages/server/src/mud/api/stuff.ts`
- `packages/server/src/mud/lib/persistence/AroundDeleteHook.ts`
- `packages/server/src/mud/lib/persistence/AroundSaveHook.ts`
- `packages/server/src/mud/lib/security/__tests__/test-setup.ts`
  (the `makeStuff` allowlisted test seam)
- `packages/server/src/mud/api/__tests__/stuff.test.ts` (postRegister
  lifecycle tests)
