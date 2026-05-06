# Templates

Game-world objects in Saxonberg are not constructed directly. They are
**cloned** from templates stored in the MongoDB `domain` collection. The
clone pipeline owns construction, hydration, registration, zone resolution,
proxy wrapping, and a post-registration hook — the same plumbing every
game-world object goes through.

This is one of two persistence tracks. Auth/meta records (User,
GoogleProfile) extend `Persistable` and live as plain MongoDB documents;
those are covered in [persistence.md](./persistence.md). Templates cover
everything in the game world.

## The Template Class

Templates are modelled as a `Persistable` subclass — like `User` and
`GoogleProfile`, a Template is a record, not a game-world entity. The
class lives at `lib/stuff/Template.ts`:

```typescript
class Template extends Persistable {
  static collectionName = 'domain';
  static persistentFields = ['path', 'class', 'hydratorClass', 'data'];

  path: string = '';
  class: string = '';
  hydratorClass?: string;
  data: Record<string, unknown> = {};

  static findByPath(path: string): Promise<Template | null>;
  static findDescendants(basePath: string): Promise<Template[]>;
  static ancestorPaths(path: string): string[];
}
```

CRUD goes through the inherited `Persistable` surface
(`save`/`delete`/`findById`/`find`) plus the helpers above. See
[persistence.md](./persistence.md) for the `Persistable` contract.

- `path` is the canonical identifier — clones happen by path. Folder/leaf
  invariants (below) constrain paths.
- `class` names the runtime backing class to instantiate. Resolved by
  dynamic import; validated against an allow-list (below).
- `hydratorClass` is opt-in. **When absent, no hydrator runs and `data` is
  ignored.** Templates that want generic mixin-field copy must explicitly
  set `hydratorClass: '/lib/persistence/PersistentHydrator'` (the standard
  implementation). Custom hydrators are also class paths under `/lib/`.
- `data` is pure hydration payload — never carries class paths itself.

The two class fields are independent. A single hydrator can serve many
backing classes (a `CreatureHydrator` for both `Guard` and `GuardDog`).
A single backing class can be paired with many hydrators (different
domain-specific hydrators per template family).

## Class Path Validation

`StuffApi.#validateClassPath(classPath)` gates every dynamic import:

- Must start with `/`
- Must NOT contain `..` (no directory traversal)
- Must start with one of the allowed prefixes: `/obj/` or `/lib/`

Class names are the last path segment (e.g., `/obj/Avatar` →
`Avatar`); the import succeeds only if a named export with that name
exists in the resolved module. Anything else throws.

## The Clone Pipeline

`StuffApi.clone<T>(templatePath, context?): Promise<T>` runs:

1. **Load template** by path from `Collections.Domain`. Throws if missing.
2. **Validate `class` path**, dynamic-import the module, fish out the
   constructor by name.
3. **Resolve zone** via `ZoneApi.resolveZoneForPath(templatePath)` — walks
   ancestor paths nearest-first, returns the Zone clone of the first
   ancestor whose template names a Zone class. Returns `null` when the
   template is itself a Zone, or when no ancestor is a Zone. Stamped onto
   the instance before hydrate so anything that reads `this.zone` during
   hydrate sees the right value.
4. **Resolve `hydratorClass`** if present. Same dynamic-import +
   class-path validation as the backing class. Returns a stateless
   `Hydrator` instance.
5. **Construct** the backing under the construction sentinel:
   ```typescript
   Stuff._beginConstruction();
   try { obj = new ClassConstructor(); }
   finally { Stuff._endConstruction(); }
   ```
   The sentinel is a runtime gate — every Stuff constructor throws unless
   the sentinel is set. This is what enforces "only StuffApi may
   construct Stuff." See [lifecycle.md](./lifecycle.md) for details.
6. **Stamp `templatePath`** onto the instance so identity-keyed security
   policies (`FromTemplate`) can match against it.
7. **Wrap in a Proxy** via `ProxyApi.wrap(raw)`. Every consumer that
   resolves the object by `stuffId` thereafter sees the proxy, not the
   raw instance — the security gate is then in the call path for those
   callers.
8. **Register** the proxy in `StuffApi`'s `objectsById` map.
9. **Hydrate**: if `hydratorClass` was named, run
   `await hydrator.hydrate(proxy, template.data ?? {})` inside a synthetic
   constructor frame (`ExecutionContextApi.run` with
   `FrameKind.Constructor`).
10. **postRegister**: if the backing composes `PostRegistrationMixin`,
    `await proxy.postRegister(context)` — same synthetic frame.

If hydrate or `postRegister` throws, the object is unregistered before the
error propagates. Half-initialised objects never linger in the registry.

Order is load-bearing. **Register fires before hydrate** so that anything
resolving the in-flight object by `stuffId` during hydrate or
`postRegister` (e.g., a self-referencing exit hydrator) finds it.

## The Hydrator Contract

`Hydrator` (`lib/stuff/Hydrator.ts`) is a one-method interface:

```typescript
interface Hydrator {
  hydrate(backing: Stuff, data: Record<string, unknown>): Promise<void>;
}
```

Hydrators are stateless. One instance hydrates many backings. They
don't mirror-compose the backing's mixin chain — they introspect the
backing directly. That's why a single hydrator class can serve multiple
backing classes.

The standard `PersistentHydrator` (`lib/persistence/PersistentHydrator.ts`)
walks `MixinApi.getAllPersistentFields(backing.constructor)` and
bracket-assigns matching keys from `data`:

```typescript
for (const field of fields) {
  if (field in data) target[field] = data[field];
}
```

**Bracket-assign IS the contract surface.** It invokes setters when
present. So if a field has a shape invariant ("must be boolean",
"lowercase / trim / dedupe"), put the rule on the setter and hydration
routes through it for free. Don't add `normalize()`-style post-hydrate
fixups for per-field rules — see
[antipatterns.md § Per-Field Invariants](../antipatterns.md#per-field-invariants-belong-on-setters-not-in-normalize-hooks).

Cross-field invariants ("if `isLocked` is true, `lockKey` must reference
a real key") can't live on a single setter — that's the legitimate use
case for a custom `Hydrator` subclass. Override `hydrate()`; call
`super.hydrate()` first if you want the default field-copy too.

The constant `PersistentHydrator.templatePath` is the single source of
truth for the standard hydrator's path; use it at call sites instead of
duplicating the literal:

```typescript
TemplateApi.saveTemplate(path, classPath, data, PersistentHydrator.templatePath);
```

## The Context Bag

`StuffApi.clone(path, context?)` accepts an opaque `context` bag that
gets threaded through to `postRegister`. It exists to carry runtime
setup that cannot come from the template — typically references to other
runtime objects.

The canonical example is Avatar:

```typescript
// Avatar.ts
export interface AvatarInitContext {
  user?: User;
  playerId?: string;
}

class Avatar extends AvatarBase {
  override async postRegister(context?: unknown): Promise<void> {
    const ctx = context as AvatarInitContext | undefined;
    this.user = ctx?.user;
    // ...
  }
}

// Application.ts
const avatar = await StuffApi.clone<Avatar>(
  Avatar.getTemplatePath(playerId),
  { user, playerId }
);
```

Subclasses narrow the context to a concrete type locally. The clone path
itself stays generic — no type parameter on `StuffApi.clone`.

## PostRegistrationMixin

`PostRegistrationMixin` (`lib/stuff/PostRegistration.ts`) is the opt-in
post-registration hook. Spring `@PostConstruct` semantics:
`postRegister(context?)` runs **after** registration, so any resolver
that walks the registry sees the in-flight instance.

Composition is the marker. The clone pipeline checks
`MixinApi.isPostRegistration(proxy)` and only awaits the hook when the
backing composes the mixin. The default implementation is a no-op;
subclasses override.

This replaced the older `'initialize' in obj && typeof init === 'function'`
duck-typing check that used to live in `StuffApi`.

## TemplateApi & the Folder/Leaf Invariant

`TemplateApi.saveTemplate(path, classPath, data, hydratorClassPath?)` is
the typed convenience wrapper for writing a template:

```typescript
await TemplateApi.saveTemplate(
  '/narnia/castle/foyer',
  '/lib/spatial/CartesianLocation',
  { /* persistent fields */ },
  PersistentHydrator.templatePath
);
```

It looks up an existing `_id` for upsert semantics and delegates to
`PersistenceManager.save(Collections.Domain, doc)`.

The **folder/leaf invariant** (Phase 7 Decision 12) constrains the
`domain` collection paths:

- **Folders** = Zone templates (`/lib/spatial/CartesianZone`,
  `/lib/spatial/SphericalZone` — see `ZONE_CLASS_PATHS` in
  `api/zone.ts`). May have descendant templates.
- **Leaves** = any non-Zone template. Must NOT have descendant templates.

The rule is enforced by `DomainHook` (`obj/hooks/DomainHook.ts`), which
composes `AroundSaveHookMixin` and `AroundDeleteHookMixin` and registers
against `Collections.Domain`. The hook calls
`TemplateApi.validateFolderLeafSave` / `validateFolderLeafDelete`, which
reject:

1. Path doesn't start with `/`.
2. Doc shape isn't a template (missing `path` or `class`).
3. Leaf save with existing children.
4. Save under a non-Zone ancestor — "Ancestor `A` is a leaf template,
   not a zone folder."
5. Delete of a Zone with surviving descendants.

The validation fires at the PM chokepoint, so calling
`PM.save(Collections.Domain, doc)` directly is equivalent to
`TemplateApi.saveTemplate` — both go through the hook.

`hydratorClass` is orthogonal to zonehood. Zone classification uses the
runtime `class` field only.

## Avatar Template Convention

```typescript
class Avatar {
  static readonly TEMPLATE_PATH_PREFIX = '/obj/Avatar/';

  static getTemplatePath(playerId: string): string {
    return `${this.TEMPLATE_PATH_PREFIX}${playerId}`;
  }
}
```

Avatar templates are stored at `/obj/Avatar/<playerId>` and created
automatically when a Player is added to a User. Cloning happens at user
connect (see `Application.handleUserConnect`).

## `create` and `createSync` (Sister APIs)

`StuffApi.clone()` is the production path. Two sister APIs cover cases
where templates aren't right:

- **`StuffApi.create(factory, context?)` (async)** — caller-supplied
  factory, no template lookup, no hydration step. Same register +
  `postRegister` tail. Used for runtime-only objects whose construction
  needs explicit arguments and don't round-trip through the CMS pattern.
  `Interactive` is the canonical example: `socketId`, `sessionId`, `user`
  all flow through the closure, not a template.

- **`StuffApi.createSync(factory)` (sync)** — same sentinel-flip + Proxy
  wrap + register guarantees as `create`, but no hydrate step and no
  `postRegister` await. **Throws if the constructed Stuff composes
  `PostRegistrationMixin`** — silently skipping `postRegister` would
  yield a half-initialised object. Used inside sync helpers where
  awaiting would force the caller (and its callers) to become async too;
  `Exitable.addBidirectionalExit`'s `new Exit(...)` calls are the typical
  trigger.

Reach for `create()` whenever async hydration or post-registration
matters; `createSync()` is the narrow-use sister.

## `singleton(path)` and the Clone Pre-Flight

`StuffApi.singleton<T>(templatePath, context?)` returns the existing
instance for a path when one is already loaded; otherwise it routes
through `clone()`. The lookup hits the `byTemplatePath: Map<string,
Set<Stuff>>` index that `register` / `unregister` keep up to date —
see [lifecycle.md](./lifecycle.md#what-registration-actually-does).
A non-empty bucket with more than one entry throws (the caller mixed
`clone()` and `singleton()` on a class that does NOT compose
`SingletonMixin`).

`SingletonMixin` (`lib/stuff/Singleton.ts`) is a marker mixin (no
public surface; see
[mixins.md § Marker mixins](./mixins.md#marker-mixins-empty-public-surface)).
Composing it opts a class into a clone-time pre-flight: `clone()`
checks `byTemplatePath` first and throws if any instance already
exists for that path. The pre-flight depends on `unregister`'s
empty-bucket cleanup running before the next clone — which it does,
because `Stuff.destroy()` synchronously calls `unregister`.

Use `singleton()` for shared-state Stuff (the starting room, the
EventRegistry, well-known service objects); use `clone()` for
per-instance Stuff (avatars, items, NPCs) that should multiply.

## Failure Modes

- Template not found → `Error("Template not found: ${path}")`
- Class path validation fails → `Error("Class path must…")`
- Dynamic import fails → `Error("Failed to import class…")`
- Class name not exported by module → `Error("Class … not found in module…")`
- Hydrator path invalid / import fails → analogous "Failed to import
  hydrator…" / "Hydrator … not found…"
- Hydrate or `postRegister` throws → object is unregistered, then the
  original error propagates
- `createSync` on a `PostRegistrationMixin` class → throws before
  registration

## Cross-References

- [lifecycle.md](./lifecycle.md) — full create → register → hydrate →
  postRegister → destroy lifecycle, construction sentinel, prepareDestroy
  hook
- [persistence.md](./persistence.md) — `Persistable`, around-save/delete
  hooks (the mechanism `DomainHook` rides on)
- [call-security.md](./call-security.md) — `ProxyApi.wrap`,
  `ExecutionContextApi.run`, `FrameKind.Constructor`,
  `SecurityApi.decorateApiClass`
- [state-model.md](./state-model.md) — why game-world objects use
  templates and Avatar's "self-contained" design
- [antipatterns.md § Per-Field Invariants](../antipatterns.md#per-field-invariants-belong-on-setters-not-in-normalize-hooks)
  — setter contract for hydration
