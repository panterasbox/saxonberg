# Persistence

Saxonberg persistence runs on **two tracks**, both rooted in `Idea`:

1. **`Persistable`** — auth/meta records (`User`, `GoogleProfile`) and
   CMS assets (`Template`). An Idea-rooted base that adds an explicit
   `save`/`delete`/`findById`/`find` CRUD surface over MongoDB.
   Construction goes through `StuffApi.create(() => new T())` like any
   other Stuff; loaded instances register in `StuffApi` and live until
   `instance.delete()` (which cascades to `StuffApi.destruct`) or
   explicit `StuffApi.destruct(instance)`.
2. **Templates → Stuff** — every game-world object (rooms, doors, props,
   avatars, NPCs). Stored as `Template` records in the `domain`
   collection, cloned into runtime `Stuff` instances by the
   clone/hydrate/save-template pipeline. Documented in
   [templates.md](./templates.md); not repeated here.

The split is about *how state arrives*, not about hierarchy. Persistable
records are loaded as records and you read them via `findById`/`find`.
Game-world Stuff is cloned from a Template (which itself is a
Persistable record) and gets a Hydrator-driven setup pass. Both produce
fully-registered Stuff at the end.

This doc covers the `Persistable` track and the cross-cutting machinery
(`PersistenceManager`, around-hooks, `Collections` enum) used by both.

## `Persistable`

`Persistable` lives at `lib/persistence/Persistable.ts` and extends
`Idea`. It adds the CRUD surface; everything else (registry, proxy
wrap, security gate, `prepareDestroy`/`destroy` lifecycle) is inherited
from `Stuff`.

```typescript
class User extends Persistable {
  static collectionName = 'users';
  static persistentFields = ['googleProfileId', 'playerIds'];

  googleProfileId: string = '';
  playerIds: string[] = [];
}

const user = await StuffApi.create(() => new User());
user.googleProfileId = '...';
await user.save();

const found = await User.findById(id);
const matches = await User.find({ googleProfileId: 'xyz' });
await user.delete(); // cascades to StuffApi.destruct(user)
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
- `delete()` — throws if `_id` is missing; deletes via
  `PersistenceManager`, then calls `StuffApi.destruct(this)` to
  unregister the runtime instance. Subclasses that need to keep the
  instance alive past the DB delete (rare) override `delete()` with
  their own ordering.
- `findById(id)` / `find(query)` — static. Construct fresh instances
  via `StuffApi.create<T>(() => new this())` (so loaded instances are
  registered + proxy-wrapped just like a fresh `await StuffApi.create`),
  populate via `fromDocument`. Return `null` / `[]` when nothing
  matches.
- `toDocument()` / `fromDocument()` — copy persistent fields plus
  `createdAt` / `updatedAt`. `_id` is included on `toDocument` only
  when present.
- `createdAt` / `updatedAt` — auto-managed. Set in constructor;
  `updatedAt` refreshed on every `save()`.

Current inhabitants of `Persistable`: `User`, `GoogleProfile`, and
`Template`. The first two are auth/meta records; `Template` is a CMS
asset (the doc you clone game-world objects from — see
[templates.md](./templates.md)).

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

### Why does `Persistable.delete()` cascade to `StuffApi.destruct`?

Because Persistable instances are registered like any other Stuff —
leaving a live registered instance after its DB record is gone is a
footgun. The cascade is the safe default. Subclasses that want
different ordering override `delete()`.

### Why is `Persistable` an Idea?

Earlier designs kept `Persistable` outside the Stuff hierarchy —
"records" felt different from "game-world entities." That split forced
two parallel hierarchies, two persistence stories, and made it
genuinely awkward to explain why `User` wasn't an `Idea` like
everything else.

Folding `Persistable` into the Idea tree resolves all of that. The
cost is small: `User` carries a `stuffId` (useful — `StuffApi.findById`
is universal lookup), goes through the security gate (mediated like any
Stuff), and lives in the registry until `delete`/`destruct`. The win:
one hierarchy, one set of conventions, one mental model.

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
- [state-model.md](./state-model.md) — Persistable in the Idea
  hierarchy, Avatar self-contained model, why Player class is gone.
