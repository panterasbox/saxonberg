# Hot Module Reload

Saxonberg expects running code to be edited and reloaded against a
live server, in the LP-MUD tradition. New clones of a reloaded
blueprint pick up the new behavior; existing instances keep the
prototype chain they were constructed against; old blueprints fall
out of the registry and become GC-only when their last instance is
gone.

The mechanism is a small piece of infrastructure (`HotReloadApi`)
plus a single integration point (`StuffApi.clone` consults it). Every
HMR-correctness story in the codebase flows from those two facts.

## Why this works in Saxonberg

The codebase is already free of `instanceof` checks for class
identity. Mixin detection goes through `_mixinName` markers via
`MixinApi.isX(obj)` / `MixinApi.hasMixin(ctor, Mixins.Foo)`; templates
clone by path; command controllers register by verb; hooks register
by name. Everything that has to survive a class swap is already
looked up by name. The HMR subsystem must not regress this property —
no new code path may introduce identity-based class checks.

## Surface

`HotReloadApi` lives at `packages/server/src/mud/api/hot-reload.ts`.

```ts
class HotReloadApi {
  // Mutators
  static reload(path: string): Promise<void>;     // load → swap registry
  static rollback(path: string): void;            // swap current ↔ previous
  static unload(path: string): void;              // clear + freeze

  // Introspection
  static getCurrent(path: string): Function | null;
  static getCurrentExport(path: string, exportName: string): Function | null;
  static getPrevious(path: string): Function | null;
  static getRegisteredPaths(): string[];
  static isFrozen(path: string): boolean;

  // Targeted invalidation
  static reloadHookManifest(): Promise<void>;
}
```

The path argument is always an absolute filesystem path — the same
shape `StuffApi.clone` resolves a `/obj/Avatar`-style class path to.

## State machine

Three states per path. The registry holds at most two blueprints;
anything older falls out on the next successful reload.

| State | `current` | `previous` | `clone(path)` | `rollback(path)` |
|---|---|---|---|---|
| Empty | — | — | lazy-`reload()` (or throw if frozen) | throws "nothing to roll back to" |
| V1 | v1 | null | uses v1 | throws "nothing to roll back to" |
| V2 | latest | one prior | uses latest | swaps current ↔ previous |

Transitions:

- `reload(path)` from Empty → V1 on success; stays Empty on failure.
- `reload(path)` from V1/V2 → V2 on success; the prior `previous` (if
  any) drops out of the registry and becomes GC-only. Failure leaves
  the registry untouched.
- `rollback(path)` from V2 swaps current ↔ previous; still V2.
- `unload(path)` from any state → Empty + frozen.

### Empty has two flavors

`StuffApi.clone` distinguishes "never seen" from "explicitly
unloaded" via `#frozenPaths`:

- **Never seen:** `clone` calls `reload(path)` lazily and self-warms.
- **Frozen (post-`unload`):** `clone` throws "no blueprint at path"
  until the next `reload` repopulates and clears the frozen flag.

## Reload mechanism

`reload(path)` reads the source bytes, computes a `versionId` (sha256
truncated to 16 hex chars), then dynamic-imports the module with a
cache-busting query: `import(\`${url}?hmr=${counter++}\`)`. Each
query string produces a fresh module evaluation; the source transform
re-runs and `ModuleApi.stamp` registers the new class objects under
fresh `ModuleId` entries.

Concurrent `reload(path)` calls share one in-flight promise — the
second caller waits for the first instead of starting a parallel
import.

## Integration

### `StuffApi.clone` (the only HMR-aware site)

`clone()` consults `HotReloadApi.getCurrentExport(absPath, className)`
before falling back to a bare dynamic import. Frozen paths throw "no
blueprint at path." This means **every Stuff that flows through
`clone()` automatically picks up HMR**, including:

- Hooks (cloned by `PersistenceManager.loadHooks` from `hooks.yaml`).
- Command controllers (cloned by `CommandGiver.executeController`
  from the `/obj/command/*` Templates seeded under `mud/seeds/`).
- Hydrators (cloned by `clone()` itself from the `hydratorClass`
  field of the backing's Template — see Hydrators below).
- Anything else templated, including avatars, locations, ideas.

The fallback from `clone` to a bare dynamic import only fires when
the registry is Empty for a path — i.e., the path was statically
imported by something else first. After the first lazy `reload()` it
flows through the HMR registry.

### Hydrators

Hydrators are templated `Idea` Stuff. Unlike controllers, they are
stateless by contract (`Hydrator.ts` documents this), so the clone
pipeline resolves them via `StuffApi.singleton` — one cached
instance per hydrator class, reused across every backing it hydrates:

```ts
const hydrator = template.hydratorClass
  ? await StuffApi.singleton<Hydrator & Stuff>(template.hydratorClass)
  : null;
// ... construct backing ...
if (hydrator) await hydrator.hydrate(backing, data);
```

The first clone needing a particular hydrator lazy-clones it through
the (HMR-aware) `StuffApi.clone` path; subsequent clones find the
instance in the `byTemplatePath` index and reuse it.

**HMR for hydrators.** A reloaded hydrator class produces a new
blueprint in the registry, but the cached singleton instance is still
pinned to the old class. To pick up new behavior, destruct the cached
instance — the next clone that needs it will lazy-re-create through
`singleton(path) → clone(path) → HMR-aware class lookup`:

```ts
await HotReloadApi.reload('/abs/.../PersistentHydrator.ts');
const stale = StuffApi.findByTemplatePath('/lib/persistence/PersistentHydrator');
if (stale) StuffApi.destruct(stale);
```

No dedicated helper — the byTemplatePath index is the registry.

**Cycle detection.** `clone()` keeps an `#inFlightClonePaths` set:
on entry it adds the templatePath, removes in `finally`, and throws
`circular template dependency` if the same path is already in
flight. This catches a hydrator template that (transitively)
references itself before the recursion stack-overflows. Hydrators are
the only realistic cycle vector in v1; the guard is at the clone()
level so any future template-resolution cycle (mod system, custom
loaders) gets the same treatment.

### Command dispatch

`CommandGiver.executeController` clones a fresh controller per
execution, runs it, and destructs in `finally`:

```ts
const controller = await StuffApi.clone(`/obj/command/${command.controller}`);
try {
  return await controller.execute(fields, context);
} finally {
  StuffApi.destruct(controller);
}
```

Per-execution clone is the right semantic for stateless dispatchers —
it sidesteps state-leak between commands and gives HMR for free
(every clone goes through the override path). The destruct keeps
`StuffApi`'s indexes from accumulating one stuck controller per
command.

### Hooks

Hook instances are persistent — `PM.loadHooks` clones them once at
boot and registers them in `PM.saveHooks` / `PM.deleteHooks` arrays.
Reloading a hook source file leaves the cached instance pinned to
its old class; the in-place fix is `HotReloadApi.reloadHookManifest()`,
which calls `pm.clearHooks() + pm.loadHooks()` to rebuild the chain
against the current HMR blueprints.

### `ModuleApi`

Untouched. The existing source transform stamps reloaded class
objects normally via the cache-busted `?hmr=N` query. `ModuleApi`'s
WeakMap is keyed by class object, so each reload's distinct class
objects each get their own `ModuleId` entry; nothing collides.

## Lifecycle events

Four well-known events declared in `lib/events.ts`, all sharing the
`ReloadEvent` payload and all `emittableBy(HotReloadApi)`:

```ts
Events.ModuleReloaded     // 'module.reloaded'      — successful reload
Events.ModuleRolledBack   // 'module.rolledBack'    — rollback() succeeded
Events.ModuleUnloaded     // 'module.unloaded'      — unload(), incl. no-op-from-Empty
Events.ModuleReloadFailed // 'module.reloadFailed'  — reload threw

interface ReloadEvent {
  path: string;
  versionId: string | null;          // null on Unloaded
  previousVersionId: string | null;  // null when there was no prior
  exports: string[];                 // class export names; empty on Unloaded / Failed
  error?: { message: string; stack?: string };  // Failed only
}
```

`unload` from Empty is a no-op-with-event: subscribers see the intent
even when the registry was already empty.

`HotReloadApi` doesn't keep its own audit log. Anything that wants a
ledger (admin UI, mod-system observers, future code-audit collection)
subscribes via `EventApi.on(Events.Module*, listener)`.

## Failure handling

| Failure | What happens | Event |
|---|---|---|
| `path` doesn't exist / unreadable | `reload` throws, registry unchanged | `ModuleReloadFailed` |
| Compile error in new module | `reload` throws, registry unchanged | `ModuleReloadFailed` |
| Top-level execution error | `reload` throws, registry unchanged | `ModuleReloadFailed` |
| `@Final` violation in reloaded class | `reload` throws (caught from `ModuleApi.stamp`), registry unchanged | `ModuleReloadFailed` |
| Constructor throw on later clone | `clone` throws to its caller; registry stays on the new (broken) version. Caller may `rollback` and retry | (none — reload itself succeeded) |
| `rollback` from Empty / V1 | throws | (none) |
| `unload` from Empty | no-op, but emits intent | `ModuleUnloaded` |

## Memory growth across many reloads

Each successful reload creates new class objects under fresh
`?hmr=N` URLs. Old class objects are reachable from existing
instances via their prototype chain and from `ModuleApi`'s WeakMap.
They go away when both go away. In long dev sessions with frequent
reloads, accumulated stale class bindings grow until those refs are
released. Bounded in practice; not a v1 concern. If it ever becomes
one, the fix is bookkeeping the per-path `ModuleId` set so older
entries can be deliberately released.

## Path normalization

Linux-only. The registry keys absolute paths verbatim, no
case-folding. Two callers passing `/foo/Bar` and `/foo/bar` on
case-insensitive filesystems would produce duplicate entries.
Defer until a real cross-platform issue surfaces.

## Identity-check non-regression

`hot-reload.ts` does not use `instanceof` against any registered
class. A static test in `hot-reload.test.ts` reads the source bytes
and asserts zero `instanceof` tokens (after stripping comments and
strings). If you find yourself wanting `instanceof` for error
narrowing, prefer duck-typing:

```ts
err && typeof err === 'object' && 'message' in err
```

— survives across reloads where each new module evaluation produces
fresh constructor identities.

## What's intentionally out of scope

- **Apis are not reloadable.** Direct ESM imports bind callers to a
  specific class object; reloading an Api file does not update those
  bindings. Treat Api changes as a server-restart concern.
- **State preservation across reload.** Existing instances keep
  their old prototype chain. No state migration to a new blueprint.
- **CLI / HTTP / in-game command surfaces.** No user-facing trigger
  in v1. Tests drive the API directly.
- **Persistent audit log.** Subscribers to `Events.Module*` keep
  their own ledger if they want one.

The registry is path-agnostic — it works for any absolute path, not
only paths under `packages/server/src/mud/...`. A future mod system
shipping code under `mods/<modname>/...` works without changes.
