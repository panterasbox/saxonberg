# Persistence

Saxonberg persistence runs on **two tracks**:

1. **`Persistable`** — auth/meta records (User, GoogleProfile). Plain
   MongoDB documents with explicit `save`/`delete`/`findById`/`find`. Not
   part of the `Stuff` hierarchy.
2. **Templates → Stuff** — every game-world object (rooms, doors, props,
   avatars, NPCs). Stored as templates in the `domain` collection, cloned
   into runtime `Stuff` instances by the clone/hydrate/save-template
   pipeline. Documented in [templates.md](./templates.md); not repeated
   here.

The dichotomy is intentional. Auth records have no game-filesystem path
or zone, no command surface, no proxy mediation — they're records, full
stop. Stuff has all of that, and the template pipeline carries the
machinery.

This doc covers the `Persistable` track and the cross-cutting machinery
(`PersistenceManager`, around-hooks, `Collections` enum) used by both.

## `Persistable`

```typescript
class User extends Persistable {
  static collectionName = 'users';
  static persistentFields = ['googleProfileId', 'playerIds'];

  googleProfileId: string = '';
  playerIds: string[] = [];
}

await user.save();
const found = await User.findById(id);
const matches = await User.find({ googleProfileId: 'xyz' });
```

Subclass contract:

- **`static collectionName: string`** — required. Throws if missing.
- **`static persistentFields?: string[]`** — class-local fields to copy
  to/from the document. Mixin-contributed fields are picked up
  automatically (see "Field aggregation" below).

Provided by the base class:

- `save()` — sets `updatedAt`, builds the doc via `toDocument()`,
  delegates to `PersistenceManager.save(collection, doc)`, sets `_id`
  on first save.
- `delete()` — throws if `_id` is missing; calls
  `PersistenceManager.delete(collection, _id)`. Does NOT call
  `destroy()` — `Persistable` is not a `Stuff` and has no destroy
  lifecycle.
- `findById(id)` / `find(query)` — static. Construct a fresh instance,
  populate via `fromDocument`. Return `null` / `[]` when nothing
  matches.
- `toDocument()` / `fromDocument()` — copy persistent fields plus
  `createdAt` / `updatedAt`. `_id` is included on `toDocument` only
  when present.
- `createdAt` / `updatedAt` — auto-managed. Set in constructor;
  `updatedAt` refreshed on every `save()`.

The current inhabitants of `Persistable` are `User` and `GoogleProfile`.
That's deliberate — anything in the game world goes through templates.

## Field Aggregation

`Persistable.getAllFields()` returns the union of:

1. The class's own `static persistentFields`.
2. Every `static persistentFields` declared by mixins in the prototype
   chain.

The walk is centralised in `MixinApi.getAllPersistentFields(constructor)`
— `Persistable` calls it automatically. A subclass MAY override
`static getAllPersistentFields()` for an escape hatch, but this is rare;
the default works for both auth records and Stuff (the `PersistentHydrator`
used by templates calls the same method).

This also means: a mixin author who adds a new persistent field declares
it once on the mixin, and every consumer (auth record, Stuff template)
gets it for free. No subclass changes required.

## `PersistenceManager`

`PersistenceManager.get()` returns the singleton. It owns:

- The MongoDB connection (`MongoClient`, `Db`).
- A `Collections` enum (`Users`, `GoogleProfiles`, `Domain`).
- `save` / `findById` / `find` / `delete` operations.
- A hook registry (around-save / around-delete chains).

The save and delete entry points dispatch through registered hooks for
that collection before the terminal MongoDB write. Hooks may transform
the doc, short-circuit, or wrap the operation. The terminal `next`
performs the upsert / delete.

```typescript
// Direct call (works regardless of hooks):
const id = await PersistenceManager.get().save(Collections.Users, doc);
await PersistenceManager.get().delete(Collections.Domain, id);
```

The dispatch keeps a `Set<string>` of currently-active
`(collection, operation)` slots. Re-entry into the same slot from inside
its own dispatch throws `HookReentryError`. Loud failure beats a silent
loop.

## Around-Save / Around-Delete Hooks

Hooks are middleware. Two mixins compose the capability onto an `Idea`
subclass:

```typescript
// AroundSaveHookMixin
async aroundSave(
  collection: string,
  doc: Record<string, unknown>,
  next: (doc: Record<string, unknown>) => Promise<string>
): Promise<string>;

// AroundDeleteHookMixin
async aroundDelete(
  collection: string,
  id: string,
  next: (id: string) => Promise<void>
): Promise<void>;
```

Default implementations are pass-through (`return next(doc)`). Subclasses
override.

A hook is a regular `Idea`-rooted Stuff. It's instantiated via the CMS
template pattern (`StuffApi.clone()`) at boot, and registered against PM
slots via a YAML manifest:

```yaml
# obj/hooks/hooks.yaml
hooks:
  - collection: domain
    operation: save
    template: /system/hooks/domain-folder-leaf
  - collection: domain
    operation: delete
    template: /system/hooks/domain-folder-leaf
```

`PersistenceManager.loadHooks(yamlPath?)` reads the manifest, clones
each named template, narrows with `MixinApi.isAroundSaveHook` /
`isAroundDeleteHook`, and registers a forwarding closure with
`PM.registerHook(collection, operation, fn)`.

Multiple hooks may register against the same slot — they execute in
registration order, each receiving `next` to invoke the rest of the
chain (terminating in the actual MongoDB write).

The canonical hook today is `DomainHook` (`obj/hooks/DomainHook.ts`),
which composes both around-save and around-delete and enforces the
folder/leaf invariant on the `domain` collection. See
[templates.md § TemplateApi & the Folder/Leaf Invariant](./templates.md#templateapi--the-folderleaf-invariant)
for the rule it enforces.

## Setter-Based Field Invariants

For both tracks, **per-field shape invariants belong on setters, not in
post-hydrate `normalize()` hooks**. The hydrator path
(`target[field] = data[field]`) invokes setters, so the rule fires for
free during template hydration. Cross-field invariants — "if `isLocked`
is true, `lockKey` must reference a real key" — go in a custom
`Hydrator` subclass.

Full rule: [antipatterns.md § Per-Field Invariants](../antipatterns.md#per-field-invariants-belong-on-setters-not-in-normalize-hooks).

## Design Decisions

### Why static `collectionName`?

Each class declares its own collection name to:

- Avoid passing collection names to methods (error-prone).
- Make collection names discoverable from the class definition.
- Enable type-safe CRUD without per-call configuration.

### Why explicit `persistentFields`?

While we could scan all properties, explicit declaration:

- Excludes computed/runtime properties from persistence.
- Documents the persistence contract at the class boundary.
- Prevents accidental data leaks (a field added later isn't silently
  persisted).
- Is the lookup mechanism the standard `PersistentHydrator` uses to
  decide which keys to copy from `data`.

### Why not decorators?

A decorator-based approach was considered. The base-class approach was
chosen for:

- No build configuration overhead.
- Simpler debugging (standard inheritance chain).
- Works cleanly under TypeScript strict mode without
  `experimentalDecorators` quirks for this surface.

(The codebase DOES use decorators elsewhere — `@Final`, `@CallSecurity`,
etc. for the security framework. Persistence didn't need that machinery.)

### Why does `Persistable.delete()` not call `destroy()`?

Because `Persistable` isn't a `Stuff`. There's no registry to remove
from, no `prepareDestroy` hook, no shadow chain to detach. The doc just
goes away. Stuff destruction is its own thing — see
[lifecycle.md](./lifecycle.md).

### Why isn't `Persistable` part of the Stuff hierarchy?

Auth records carry no game identity, no zone, no command surface, no
proxy mediation, no template path. Mixing them into Stuff would force
dead machinery onto every `User` and break the cleanly bounded threat
model of "Stuff goes through the security gate; meta records don't."

The two tracks share field aggregation (`MixinApi.getAllPersistentFields`)
and the same `PersistenceManager`, which is enough cohesion. They differ
on construction, identity, and lifecycle, which is enough separation.

## Collections

Defined in `backend/PersistenceManager.ts`:

```typescript
enum Collections {
  Users = 'users',
  GoogleProfiles = 'google_profiles',
  Domain = 'domain',
}
```

`Domain` is the templates collection. Indexes are created on connect:

- `google_profiles.googleId` — unique
- `google_profiles.email` — non-unique
- `users.googleProfileId` — non-unique

Index creation is best-effort (logs and continues on failure).

## Cross-References

- [templates.md](./templates.md) — the other persistence track:
  clone/hydrate/save-template pipeline for game-world objects, including
  `TemplateApi.saveTemplate` and the folder/leaf-invariant `DomainHook`
  that rides on the around-hook mechanism above.
- [lifecycle.md](./lifecycle.md) — Stuff create/destroy lifecycle. Why
  `Persistable.delete` doesn't call `destroy`.
- [antipatterns.md § Per-Field Invariants](../antipatterns.md#per-field-invariants-belong-on-setters-not-in-normalize-hooks)
  — setter contract that hydration rides on.
- [state-model.md](./state-model.md) — User-not-Stuff design rationale,
  Avatar self-contained model, why Player class is gone.
