# Stuff Lifecycle

Every game-world object in Saxonberg is a `Stuff`. Stuff has a tightly
specified lifecycle that no class is allowed to bypass:

```
construct → wrap (Proxy) → register → hydrate → postRegister →
            (live) →
destruct → canDestruct (veto) → onDestruct (cleanup) →
           shadow detach → destroy → unregister
```

The whole sequence runs inside `StuffApi`. Subclasses participate via
three narrow extension points: `postRegister(context?)` for setup,
`canDestruct(): VetoResult` for refusing destruction, and
`onDestruct()` for cleanup. Everything else is locked down.

`forceDestruct(target)` is the admin-gated bypass: it invokes the
`canDestruct` witness identically (so observers / audit hooks see the
call) but ignores the veto. v1 the gate is an always-deny stub —
the seam is in place, real permission-aware enforcement lands when
the permission framework does. See
[call-security.md](./call-security.md#admin-only-and-the-force-bypass-shape).

This doc covers the lifecycle mechanics. The clone-side hydration
detail (templates, `Hydrator`, `hydratorClass`) lives in
[templates.md](./templates.md). The decorator and security mechanism
that makes the locks enforceable live in
[call-security.md](./call-security.md).

## Construction Sentinel

`Stuff` constructors **throw on direct `new`**. The base `constructor()`
body checks a static sentinel:

```typescript
constructor() {
  if (!Stuff.#expectingConstruction) {
    throw new Error(
      `Direct 'new' on a Stuff subclass is not allowed. ` +
      `Use StuffApi.create(() => new YourClass()) or StuffApi.clone(path).`
    );
  }
  Stuff.#expectingConstruction = false;
  this.stuffId = nanoid();
}
```

`StuffApi`'s creation paths flip the sentinel immediately around `new`:

```typescript
Stuff._beginConstruction();
let raw: T;
try { raw = factory(); }
finally { Stuff._endConstruction(); }
```

The sentinel must be set with no intervening `await` — otherwise a
parallel call could observe it set and bypass the gate. The pattern is
"flip → construct → flip back" inside a single synchronous scope.

`_beginConstruction` / `_endConstruction` are themselves protected by a
**stack-walk allowlist** (`Stuff.#assertConstructionGateAllowed`):

| Allowed file pattern | Why |
|---|---|
| `/mud/api/` | StuffApi's create / clone / createSync |
| `/mud/lib/security/__tests__/test-setup.(ts\|js)` | the `makeStuff` test helper |
| `*.test.(ts\|js)` | direct test usage |

Anything else throws. Cached per-URL after first check, so the runtime
cost is one stack walk per file ever.

## Creation Paths

Three ways to make a Stuff. All go through `StuffApi`. All flip the
sentinel, wrap in a Proxy, register, and (for the async paths) run the
synthetic constructor frame.

### `StuffApi.clone<T>(templatePath, context?): Promise<T>`

The production path. Loads a template from `Collections.Domain`,
dynamic-imports the backing class, optionally hydrates from
`template.data`, awaits `postRegister`. Full pipeline documented in
[templates.md § The Clone Pipeline](./templates.md#the-clone-pipeline).

### `StuffApi.create<T>(factory, context?): Promise<T>`

Caller-supplied factory; no template lookup; no hydration step. Same
register + `postRegister` tail as `clone`. Used for runtime-only
objects whose construction needs explicit arguments and don't
round-trip through the CMS pattern. `Interactive` is the canonical
example (`socketId`, `sessionId`, `user` flow through the closure):

```typescript
const interactive = await StuffApi.create(
  () => new Interactive(socketId, sessionId),
  { user }
);
```

### `StuffApi.createSync<T>(factory): T`

Sync sister of `create`. Same sentinel-flip + Proxy wrap + register
guarantees, no hydrate, no `postRegister` await. **Throws if the
constructed Stuff composes `PostRegistrationMixin`** — silently skipping
`postRegister` would yield a half-initialised object, so the throw
forces such classes onto the async `create()` path.

Used inside sync helpers where awaiting would force the caller (and its
callers) to become async too. `Exitable.addBidirectionalExit`'s
`new Exit(...)` calls are the typical trigger.

### `StuffApi.singleton<T>(templatePath, context?): Promise<T>`

The "one-and-only-one instance per path" lookup. Returns the existing
instance from the `byTemplatePath` index when present; otherwise
delegates to `clone()`. Pairs with `SingletonMixin` (a marker mixin
in `lib/stuff/Singleton.ts`) for enforcement: `clone()` itself does
a pre-flight `byTemplatePath` check on classes composing
`SingletonMixin` and throws on the second clone attempt. `singleton()`
is the convenient surface that respects the contract automatically;
shared-state Stuff (the starting room, the EventRegistry) should
use it instead of `clone()`.

## What Registration Actually Does

`StuffApi.register(proxy)` adds the proxy to `objectsById:
Map<string, Stuff>`. After registration, anyone with the `stuffId` can
resolve the object via `StuffApi.findById(id)`.

It also stamps the secondary `byTemplatePath: Map<string, Set<Stuff>>`
index when the proxy carries a templatePath, so subsequent
`findByTemplatePath(path)` and `singleton(path)` lookups find it.
`unregister(proxy)` (driven by `Stuff.destroy`) removes the entry
from both indexes and deletes the bucket when its size hits zero —
that empty-bucket cleanup is what the `singleton()` pre-flight
relies on, so the destroy path must run before the next clone of a
singleton template.

Registration happens **before** hydrate and `postRegister`. The
ordering is load-bearing: a hydrator might resolve the in-flight object
by id (e.g., a self-referencing exit), and that lookup must succeed.

If hydrate or `postRegister` throws, the object is unregistered before
the error propagates. Half-initialised objects never linger in the
registry.

## Synthetic Constructor Frame

Hydrate and `postRegister` run inside a synthetic frame planted by
`ExecutionContextApi.run`:

```typescript
await ExecutionContextApi.run(
  StuffApi,        // caller
  proxy,           // target
  'constructor',   // method
  { kind: FrameKind.Constructor },
  async () => {
    if (hydrate) await hydrate(proxy);
    if (MixinApi.isPostRegistration(proxy)) {
      await proxy.postRegister(context);
    }
  }
);
```

Anything those steps invoke sees `caller = StuffApi` and
`target = <new instance>`. Inner `this.foo()` calls then appear as
self-calls — the natural reading of construction-time
self-initialisation. Without the frame, those calls would have
`caller = null` and policies like `SelfOnly` would behave inconsistently.

`FrameKind.Constructor` is the typed marker. See
[call-security.md](./call-security.md) for the broader
`FrameKind` taxonomy.

## What `Stuff` Provides

Every `Stuff` carries:

- **`stuffId: string`** (readonly) — runtime ID, generated by `nanoid()`
  in the base constructor.
- **`templatePath: string | null`** — clone path, or `null` for
  `create`/`createSync`. Stamped by `StuffApi.clone()`. Identity-keyed
  security policies (notably `FromTemplate`) match against this.
- **`zone: Zone | null`** — universal subdivision. Stamped at clone
  time by `ZoneApi.resolveZoneForPath` from the template path. NOT
  back-filled by `ContainmentApi.move`: zone identity follows
  whichever template spawned the item, not whichever container it
  currently sits in.
- **`isDestroyed(): boolean`** — `@Final @Unshadowable`. Reads a
  private `_isDestroyed` flag.
- **`canDestruct?(): VetoResult`** — optional Witness hook. Subclasses
  declare it to refuse destruction (`{ ok: false, reason }`); the
  default absence is treated as `{ ok: true }`. Bypassable via
  `StuffApi.forceDestruct` (admin-gated).
- **`onDestruct?(): void`** — optional Witness hook. Cleanup runs
  while the target is still live (mirror of how the retired
  `prepareDestroy()` ran before `destroy()`).
- **`destroy(): void`** — `@Final @Unshadowable @CallSecurity(ApiOnly)`.
  The body is FINAL; the call is privileged.

## Destruction

Destroy via `StuffApi.destruct(obj)`. The Api-layer entry point runs:

```typescript
public static destruct(object: Stuff): void {
  StuffApi.#destructCore(object, /* force */ false);
}

@CallSecurity(SecurityPolicies.AdminOnly)
public static forceDestruct(object: Stuff): void {
  StuffApi.#destructCore(object, /* force */ true);
}

static #destructCore(object: Stuff, force: boolean): void {
  // 1. canDestruct witness (refusal seam). Force still INVOKES the
  //    hook so observers / audit fire identically — only the
  //    assertion is skipped.
  const veto = callHook(object, 'canDestruct');
  if (!force) assertVetoOk(veto, 'canDestruct');

  // 2. onDestruct witness (cleanup). Runs while the target is still
  //    live — the proxy's destroyed-object guard fires only after
  //    `_isDestroyed` is set in step 4.
  callHook(object, 'onDestruct');

  // 3. Privileged shadow detach (bypasses @ShadowSecurity per spec —
  //    destruction is non-negotiable)
  ShadowApi._detachAllForHost(object);

  // 4. destroy() runs straight to the original body
  object.destroy();
}
```

And `Stuff.destroy()`:

```typescript
@Final
@Unshadowable
@CallSecurity(SecurityPolicies.ApiOnly)
public destroy(): void {
  if (this._isDestroyed) return;     // double-destroy guard
  this._isDestroyed = true;
  StuffApi.unregister(this);         // critical housekeeping
}
```

Order is rigid:

1. **`canDestruct()`** (optional Witness on the target). Vetoing
   shapes the same `VetoResult` discipline as `canMove` /
   `canEnter`; absence = `{ ok: true }`. `forceDestruct` skips
   only the assertion, not the invocation.
2. **`onDestruct()`** (optional Witness on the target). Cleanup
   hook — runs while the target is still live so it can touch
   `this` through the proxy. Replaces the retired
   `prepareDestroy()` hook.
3. **Privileged shadow detach** removes every shadow from the host.
   Bypasses `@ShadowSecurity({ detach })` because host destruction
   is unconditional.
4. **`destroy()`** runs. By the time the body executes, the host is
   shadow-free, so the call goes straight to the original body — no
   shadow can intercept and skip the unregister.

Direct `obj.destroy()` from outside `mud/api/` throws `SecurityError`
(via `@CallSecurity(ApiOnly)`). Subclass `destroy()` overrides throw
`FinalViolationError` at import time (via `@Final`'s loader-hook
validation). Shadows attempting to attach to `destroy()` throw
`ShadowError` (via `@Unshadowable`). Together these guarantee that
`StuffApi.unregister()` always runs — essential for GC.

## Why `onDestruct()` and `canDestruct()` are the Override Points

`destroy()` carries critical housekeeping that the system depends on:
mark the object destroyed, unregister from the global map. If a
subclass overrode `destroy()` and forgot to call `super.destroy()`,
the registry would leak forever.

Making `destroy()` `@Final` means the language refuses to compile the
override. Making it `@Unshadowable` means a runtime shadow can't
intercept it. Making it `@CallSecurity(ApiOnly)` means non-Api code
can't even call it directly — they have to go through
`StuffApi.destruct()`, which guarantees the full sequence
(canDestruct → onDestruct → shadow-detach → destroy).

`canDestruct()` and `onDestruct()` are the safe extension points.
Both are optional Witness hooks on the target — declare only the
ones a class actually needs. Both run before any of the housekeeping
in step 4, so they can touch `this` through the proxy.

```typescript
class Avatar extends AvatarBase {
  // Cleanup only — no refusal reason for an avatar.
  public onDestruct(): void {
    PlayerApi.unregisterAvatar(this);
    this.interactives.clear();
  }
}

class SpatialZone extends Zone {
  // Refusal — drain locations before destruct.
  public canDestruct(): VetoResult {
    if (this.locations.size > 0) {
      return {
        ok: false,
        reason: `cannot destruct zone '${this.getName()}' with `
              + `${this.locations.size} live location(s); `
              + `destruct locations first`,
      };
    }
    return { ok: true };
  }
}
```

Mixin-side overrides chain via `super.onDestruct?.call(this)` — the
hook is optional, so the chain bottoms out cleanly at any class
that doesn't declare one. Don't call `super` unless an ancestor
mixin actually defines `onDestruct`.

## Failure Rollback

If hydrate or `postRegister` throws during creation:

```typescript
try {
  await ExecutionContextApi.run(/* ... */, async () => {
    if (hydrate) await hydrate(proxy);
    if (MixinApi.isPostRegistration(proxy)) {
      await proxy.postRegister(context);
    }
  });
} catch (error) {
  this.unregister(proxy);   // <-- rollback
  throw error;
}
```

The proxy is unregistered before the error bubbles up. Half-initialised
objects don't linger.

`createSync` short-circuits **before** registering when the class
composes `PostRegistrationMixin` — there's nothing to roll back because
the object never made it into the registry.

## The `makeStuff` Test Seam

Tests sometimes need to construct a `Stuff` without the full clone
pipeline. Direct `new` is blocked, so there's a single sanctioned
helper at `mud/lib/security/__tests__/test-setup.ts` (`makeStuff`).
Its file URL is on the construction-sentinel allowlist. Use it for
test setup; do NOT replicate its code elsewhere — that would just
re-open the bypass the sentinel exists to close.

## Open Design — Idle Eviction

Today, lifecycle is fully manual: every `Stuff` lives in `StuffApi`'s
registry until something explicitly calls `StuffApi.destruct(obj)`. For
long-running processes — especially after the Persistable refactor,
where loaded `User`s, `Template`s, and `GoogleProfile`s now register
and stay alive — this can grow the registry indefinitely.

We want a mechanism by which Stuff can clean themselves up if they
haven't been accessed in a while. Open questions before this can be
designed:

- **Triggering.** TTL on `Stuff` (per-instance), per-class default,
  global LRU on the registry, or hooks into proxy access?
- **Granularity.** Opt-in via mixin or opt-out via decorator? Some
  Stuff (game-world objects loaded into a live zone) should never
  expire; some (admin loaded a User to look at) should.
- **Ordering vs `onDestruct`.** Idle eviction needs to fire the
  same cleanup path as explicit destruct, including shadow detach.
- **Visibility.** Destroyed objects look the same to consumers
  whether destruct was explicit or auto. Does "destroyed" need a
  sub-reason for debugging?

Deferred — needs design discussion before implementing. See also
[roadmap.md](../roadmap.md).

## Cross-References

- [templates.md](./templates.md) — clone pipeline, `Hydrator`,
  `PostRegistrationMixin`, the context bag, `TemplateApi`, the
  folder/leaf invariant
- [persistence.md](./persistence.md) — `Persistable` track (auth/meta
  records do NOT have this lifecycle), around-save/delete hooks
- [call-security.md](./call-security.md) — `@Final`, `@Unshadowable`,
  `@CallSecurity(ApiOnly)` decorators; `ProxyApi.wrap`;
  `ExecutionContextApi.run`; `FrameKind`; how `destroy()` is locked
  down at runtime
- [state-model.md](./state-model.md) — what gets persisted across the
  lifecycle; Avatar's "self-contained" design
