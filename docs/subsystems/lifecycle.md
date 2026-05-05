# Stuff Lifecycle

Every game-world object in Saxonberg is a `Stuff`. Stuff has a tightly
specified lifecycle that no class is allowed to bypass:

```
construct → wrap (Proxy) → register → hydrate → postRegister →
            (live) →
destruct → prepareDestroy → shadow detach → destroy → unregister
```

The whole sequence runs inside `StuffApi`. Subclasses participate via
two narrow extension points: `postRegister(context?)` for setup, and
`prepareDestroy()` for cleanup. Everything else is locked down.

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

## What Registration Actually Does

`StuffApi.register(proxy)` adds the proxy to `objectsById:
Map<string, Stuff>`. After registration, anyone with the `stuffId` can
resolve the object via `StuffApi.findById(id)`.

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
- **`prepareDestroy(): void`** — `protected`. Default no-op. Subclass
  override hook.
- **`destroy(): void`** — `@Final @Unshadowable @CallSecurity(ApiOnly)`.
  The body is FINAL; the call is privileged.

## Destruction

Destroy via `StuffApi.destruct(obj)`. The Api-layer entry point runs:

```typescript
public static destruct(object: Stuff): void {
  // 1. prepareDestroy through the proxy (shadow chain observes it)
  const prep = (object as { prepareDestroy?: () => void }).prepareDestroy;
  if (typeof prep === 'function') prep.call(object);

  // 2. Privileged shadow detach (bypasses @ShadowSecurity per spec —
  //    destruction is non-negotiable)
  ShadowApi._detachAllForHost(object);

  // 3. destroy() runs straight to the original body
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
  this.prepareDestroy();             // safety net — also called by destruct
  this._isDestroyed = true;
  StuffApi.unregister(this);         // critical housekeeping
}
```

Order is rigid:

1. **`prepareDestroy()`** through any installed shadow chain. Shadows
   may wrap, observe, or replace cleanup logic.
2. **Privileged shadow detach** removes every shadow from the host.
   Bypasses `@ShadowSecurity({ detach })` because host destruction is
   unconditional.
3. **`destroy()`** runs. By the time the body executes, the host is
   shadow-free, so the call goes straight to the original body — no
   shadow can intercept and skip the unregister.

Direct `obj.destroy()` from outside `mud/api/` throws `SecurityError`
(via `@CallSecurity(ApiOnly)`). Subclass `destroy()` overrides throw
`FinalViolationError` at import time (via `@Final`'s loader-hook
validation). Shadows attempting to attach to `destroy()` throw
`ShadowError` (via `@Unshadowable`). Together these guarantee that
`StuffApi.unregister()` always runs — essential for GC.

## Why `prepareDestroy()` is the Override Point

`destroy()` carries critical housekeeping that the system depends on:
mark the object destroyed, unregister from the global map. If a
subclass overrode `destroy()` and forgot to call `super.destroy()`,
the registry would leak forever.

Making `destroy()` `@Final` means the language refuses to compile the
override. Making it `@Unshadowable` means a runtime shadow can't
intercept it. Making it `@CallSecurity(ApiOnly)` means non-Api code
can't even call it directly — they have to go through `StuffApi.destruct()`,
which guarantees the full sequence (prepareDestroy → shadow-detach → destroy).

`prepareDestroy()` is the safe extension point. It runs before any of
the housekeeping and can do anything a subclass needs:

```typescript
class Avatar extends AvatarBase {
  protected override prepareDestroy(): void {
    PlayerApi.unregisterAvatar(this);
    this.interactives.clear();
  }
}
```

Don't call `super.prepareDestroy()` unless the parent actually needs
it (the base default is a no-op).

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
- **Ordering vs `prepareDestroy`.** Idle eviction needs to fire the
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
