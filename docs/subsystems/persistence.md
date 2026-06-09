# Persistence

Saxonberg persistence runs on **two tracks**, split by *what the thing
is*:

1. **`Document`** — plain MongoDB-backed records: auth/meta data
   (`User`, `GoogleProfile`) and CMS assets (`Template`). A standalone
   base (**NOT** in the Stuff hierarchy) that adds an explicit
   `save`/`delete`/`findById`/`find` CRUD surface over MongoDB.
   Construction is a plain `new T()` — no proxy wrap, no `StuffApi`
   registry membership, no security gate, no create/destroy lifecycle.
   A loaded `Document` is a plain object you read and drop. Documents
   are **value-like**: two `findById` calls for the same id return two
   distinct instances.
2. **Templates → Stuff** — every game-world object (rooms, doors, props,
   avatars, NPCs). Stored as `Template` records (themselves `Document`s)
   in the `domain` collection, **cloned** into runtime `Stuff` instances
   by the clone/hydrate/save-template pipeline. Documented in
   [templates.md](./templates.md); not repeated here. Stuff is
   **identity-like**: the registry guarantees one canonical live
   instance.

The split is the `Document`-vs-`Stuff` distinction: a `Document` *is*
persisted state (the row is the thing), while a `Stuff` is a live
world entity *hydrated from* a Document (data in, entity out) — a Stuff
is never itself a row. (This supersedes the former `Persistable extends
Idea` design, where every persisted record was a full Stuff; see the
[persistence-architecture slate](../slates/persistence-architecture-slate.md)
for the rationale. The deferred tail — un-Stuffing marshallers/hooks —
is *not* part of that change; they remain Idea-rooted Stuff for HMR.)

This doc covers the `Document` track and the cross-cutting machinery
(`PersistenceManager`, around-hooks, `Collections` enum) used by both.

## `Document`

`Document` lives at `lib/persistence/Document.ts` and is a **plain
class** — it does not extend `Idea`/`Stuff`. There is no proxy, no
registry membership, no security gate, and no lifecycle. It carries
only the CRUD + serialization surface (`save` / `delete` / `findById` /
`find` / `toDocument` / `fromDocument`), the `createdAt` / `updatedAt`
timestamps, and the static `collectionName` / `persistentFields`
contract.

```typescript
class User extends Document {
  static collectionName = 'users';
  static persistentFields = ['googleProfileId', 'playerIds'];

  googleProfileId: string = '';
  playerIds: string[] = [];
}

const user = new User();
user.googleProfileId = '...';
await user.save();

const found = await User.findById(id);
const matches = await User.find({ googleProfileId: 'xyz' });
await user.delete(); // deletes the row — no registry/destruct cascade
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
  `PersistenceManager`. **No `StuffApi.destruct` cascade** — a Document
  is not registered, so there is no runtime instance to unregister.
- `findById(id)` / `find(query)` — static. Construct fresh instances
  via a plain `new this()` (loaded instances are plain objects, **not**
  registered or proxy-wrapped), populate via `fromDocument`. Return
  `null` / `[]` when nothing matches.
- `toDocument()` / `fromDocument()` — copy persistent fields plus
  `createdAt` / `updatedAt`. `_id` is included on `toDocument` only
  when present. For the rare marshalled field, resolution goes through
  an **injected resolver seam** (`setDocumentMarshallerResolver`, wired
  once in `AppBootstrap.run`) so the persistence core never imports
  `StuffApi`; marshallers themselves remain Idea-rooted Stuff.
- `createdAt` / `updatedAt` — auto-managed. Set in constructor;
  `updatedAt` refreshed on every `save()`.

Current inhabitants of `Document`: `User`, `GoogleProfile`, and
`Template`. The first two are auth/meta records; `Template` is a CMS
asset (the doc you clone game-world objects from — see
[templates.md](./templates.md)).

## Field Aggregation

`Document.getAllFields()` returns the union of:

1. The class's own `static persistentFields`.
2. Every `static persistentFields` declared by mixins in the prototype
   chain.

The walk is centralised in `MixinApi.getAllPersistentFields(constructor)`
— `Document` calls it automatically. It is constructor-static (no
instance/Stuff coupling), so the same walk serves the `Document` CRUD
path **and** the Stuff `PersistentHydrator` used by templates. A
subclass MAY override `static getAllPersistentFields()` for an escape
hatch, but this is rare.

This also means: a mixin author who adds a new persistent field declares
it once on the mixin, and every consumer (a `Document` record, a Stuff
template) gets it for free. No subclass changes required.

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
    template: /obj/hooks/DomainHook
  - collection: domain
    operation: delete
    template: /obj/hooks/DomainHook
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
for the rule it enforces. `DomainHook.aroundSave` also calls
`TemplateApi.validateSingletonContainerTarget` — the singleton-target
check for the `data.container` declarative-content field shipped with
the spawn substrate.

### Avatar persist-back uses the existing `Document.save` surface

`Avatar.save()` is a thin two-line shim:
`TemplateApi.snapshotToTemplate(this)` returns the mutated Template
(without committing); the caller invokes `tpl.save()`. The
underlying `Template.save` is the standard `Document.save` path
(through `PersistenceManager.save(Collections.Domain, doc)` —
fires `DomainHook` as usual). No new persistence-layer plumbing.
The snapshot mutation step lives upstream in
[`TemplateApi.snapshotToTemplate`](./templates.md#persist-back-snapshot--restore);
the per-call ordering invariant (sync prefix before first await)
lives there too. Restore-direction documented at the same anchor.

## Setter-Based Field Invariants

For both tracks, **per-field shape invariants belong on setters, not in
post-hydrate `normalize()` hooks**. `PersistentHydrator`'s two-phase
dispatch — Phase 1 prefers `set<Field>` methods (or bracket-assigns
through an accessor pair when no setter exists); Phase 2 calls
`apply<Field>` for instruction fields — fires the rule for free
during template hydration. Cross-field invariants — "if `isLocked`
is true, `lockKey` must reference a real key" — go in a custom
`Hydrator` subclass.

Full rule: [antipatterns.md § Per-Field Invariants](../antipatterns.md#per-field-invariants-belong-on-setters-not-in-normalize-hooks).

## Scalar-Default Rule

**Persistent fields default to scalars and arrays of scalars.** That
covers nearly everything Saxonberg persists: booleans, numbers,
strings, primitive tuples like `[x, y, z]`, keyword lists,
templatePath strings for Stuff cross-references. Mixins that carry
richer runtime types (value objects, structured composites)
**decompose** them into named scalar fields and reconstruct on
read; the runtime API stays strict on the value-object type.

Why: the hydrator's bracket-assign is dumb — it copies whatever
shape comes out of MongoDB straight into the field via a setter.
For a Light value object that means the setter would have to accept
both a runtime `Light` AND the raw `{intensity, color}` plain
object, smushing two jobs (validation + coercion) into one
signature with a union type. Splitting storage into scalar fields
keeps each setter validating one primitive shape independently
(intensity is a number ≥ 0, color is a string-or-null), and the
runtime API stays strict on the value class.

Canonical example — `AmbientLitMixin`:

```ts
class AmbientLitMixin {
  static persistentFields = ['ambientIntensity', 'ambientColorTemperature'];

  // Stored scalars — accessor pairs validate primitive shape:
  protected set ambientIntensity(v: number) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
      throw new TypeError(/* … */);
    }
    this._ambientIntensity = v;
  }
  // ambientColorTemperature accepts numeric Kelvin or a tag string
  // (resolved through KELVIN_TAGS via Quantity.parse(s, 'K')).
  protected set ambientColorTemperature(v: number | string | null) {
    /* normalize to numeric Kelvin or null; throw on bad shape */
  }

  // Runtime API — strict on Quantity value objects, reconstructed
  // from the stored scalars on read:
  getAmbientFlux(): Quantity<'lumen'> {
    return Quantity.of(this._ambientIntensity, 'lumen');
  }
  setAmbientFlux(value: Quantity<'lumen'> | number | string): void { ... }

  getAmbientColorTemperature(): Quantity<'K'> | null { ... }
  setAmbientColorTemperature(value: Quantity<'K'> | string | null): void { ... }
}
```

Same shape for `LightSourceMixin` (`emittedIntensity`,
`emittedColorTemperature`) and for `Window`'s directional override
pair (`aToBOverride`, `bToAOverride` — the structured
`{aToB?, bToA?}` shape lives only at the runtime API layer).

For value-class fields like `Quantity<U>`, the typed setter shape
is achievable two ways: setter coercion (the AmbientLit pattern
above) OR a per-field Marshaller. The marshaller route keeps the
runtime setter strict on `Quantity<U>` and pushes shape coercion
to the persistence boundary — see § Marshaller Framework below
and [quantities.md § Persistence](./quantities.md#persistence).

When NOT to flatten: a small number of fields genuinely don't
decompose into named scalars — variable-key maps
(`Record<currency, amount>`), structured composites whose internal
structure IS the data, future composite types we can't anticipate.
That's what the Marshaller framework below is for.

Full rule + counter-examples:
[antipatterns.md § "Persistent Fields Default to Scalars; Marshallers Are the Escape Hatch"](../antipatterns.md#persistent-fields-default-to-scalars-marshallers-are-the-escape-hatch).

## Marshaller Framework

For the rare field whose storage shape genuinely doesn't decompose
into scalars, authors write a `Marshaller` (`lib/persistence/Marshaller.ts`):

```ts
abstract class Marshaller<TRuntime, TStored> extends Idea {
  abstract fromStored(stored: TStored): TRuntime;
  abstract toStored(runtime: TRuntime): TStored;
}
```

A Marshaller is an Idea-shaped Stuff (singleton-resolved by
templatePath, mirroring `PersistentHydrator`'s shape) so
content-author marshallers participate in `HotReloadApi` and can
hot-swap without restarting the server. Stateless by contract;
`fromStored` and `toStored` are pure functions of their input.

### Wire-up

The mixin declares `static fieldMarshallers` mapping the persistent
field name to the marshaller's templatePath:

```ts
class WalletMixin {
  static persistentFields = ['wallet'];
  static fieldMarshallers = {
    wallet: '/lib/persistence/MoneyBagMarshaller',
  };

  // Setter is STRICT on the runtime type — by the time the
  // hydrator's bracket-assign fires, the marshaller's
  // `fromStored` has already produced a runtime MoneyBag.
  setWallet(value: MoneyBag): void {
    if (!(value instanceof MoneyBag)) throw new TypeError(/* … */);
    this._wallet = value;
  }
}
```

`MixinApi.getAllFieldMarshallers(constructor)` walks the prototype
chain (same shape as `getAllPersistentFields`) collecting the maps,
with subclass declarations winning over base for the same field
key.

### Resolution

`PersistentHydrator.hydrate` resolves marshallers via
`StuffApi.singleton(path)` — lazy. The async path mirrors how
`StuffApi.clone` resolves `hydratorClass`: returns the cached
instance if registered, or clones from the seeded template on first
need. No bootstrap manifest entry is required for marshallers; they
self-organize when first used.

`Document.save` / `findById` / `find` pre-resolve any registered
field marshallers (`preloadFieldMarshallers` instance method /
exported `preloadFieldMarshallersFor` static counterpart used by
`findById`/`find` and by `Template._materialize`) before the sync
`toDocument` / `fromDocument` walk. Pre-warming the singleton
cache lets the sync `findByTemplatePath` lookup inside those
methods always hit a populated cache. The async barrier sits in
the already-async `save`/`findById`/`find` boundary; `toDocument`
/ `fromDocument` keep their sync contract.

`TemplateApi.snapshotToTemplate` uses the same lazy-create pattern
on the save path: rather than throwing when a field's marshaller
isn't yet live, it calls `await StuffApi.singleton(mPath)` to
clone the marshaller on demand. The first save touching a unit
instantiates that unit's marshaller; subsequent saves hit the live
ref in the byTemplatePath index. This avoids requiring a
bootstrap manifest entry per marshaller while keeping `toStored`
calls themselves sync.

In production, the marshaller's CMS template is seeded into the
`domain` collection by `SeederManager` at boot; the first save /
hydrate that needs it triggers `singleton(path)` to clone the
template. In tests there's no Mongo to clone from, so tests
register marshallers in-memory before use — see
`lib/persistence/__tests__/quantity-marshaller-test-helpers.ts`
for the v1 quantity-marshaller install helper, or
`registerMarshallerForTest` in
`lib/security/__tests__/test-setup.ts` for the lower-level
primitive.

### `QuantityMarshaller` — the production user

The first real production marshaller, shipping alongside the
[Quantity substrate](./quantities.md). Round-trips
`Quantity<U>` value objects through the storage shape
`{ value, unit }`, with `fromStored` liberally accepting numeric
/ string / JSON shapes for authoring ergonomics.

One class, parameterized by target unit at the instance level
(`unit` is a persistent field on the marshaller itself). Each unit
gets its own templatePath — call
`QuantityMarshaller.pathFor(unit)` rather than hardcoding the
encoded form (composite units encode `'/'` → `'-per-'`).

```ts
class Material extends ... {
  static persistentFields = [..., 'density', 'molarMass'];
  static fieldMarshallers = {
    density:   QuantityMarshaller.pathFor('kg/m³'),
    molarMass: QuantityMarshaller.pathFor('g/mol'),
  };
  // Strict accessor pair on Quantity<U>; the marshaller
  // absorbed coercion at the persistence boundary.
}
```

Today's adopters: `Material.density` (kg/m³),
`Material.molarMass` (g/mol), and `TangibleMixin.mass` (kg).

### Marshalled props — `PropertiedMixin`

PropertiedMixin's `savedProps` is a heterogeneous record with
runtime-only keys, so the per-field-marshaller pattern doesn't fit
directly. Instead, PropertiedMixin grows a sibling persistent
field, `savedPropMarshallers: Record<string, string>`, that maps
prop name → marshaller templatePath. The binding lands via
`initProp`:

```ts
const mass = Property.of<Quantity<'kg'>>('mass');
avatar.initProp(mass, {
  transient: false,
  marshaller: QuantityMarshaller.pathFor('kg'),
});
avatar.setProp(mass, Quantity.of(5, 'kg'));
avatar.getProp(mass);  // → Quantity.of(5, 'kg')
```

`setProp` applies `marshaller.toStored` before writing to
`savedProps`; `getProp` applies `marshaller.fromStored` on read.
Storage carries the canonical `{value, unit}` shape; runtime callers
see the strict `Quantity<U>` instance. The binding persists alongside
the value, so reload-after-restart re-applies it without
redeclaration.

`removeProp` clears both the value and the marshaller binding.
`configureProp`'s transient↔persistent flip routes through
`fromStored` / `toStored` as appropriate so values move across the
boundary correctly.

### Don't reach for it as a first move

For fields whose runtime shape is a primitive or a primitive tuple,
flatten — the scalar-default rule above. The marshaller framework
is for the rare field whose storage shape genuinely doesn't
decompose: variable-key maps (`Record<currency, amount>`) or
specialized value objects with a canonical wire shape
(`Quantity<U>`'s `{value, unit}`). Most fields decompose; flatten
them.

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

### Why is `Document` NOT a Stuff?

An earlier design (`Persistable extends Idea`) folded every persisted
record into the Stuff hierarchy, to avoid "two parallel hierarchies."
But that made the *rare* case (a live world entity) the default and
forced the *common* case (plain document data — auth records, and soon
dialogue trees, loot tables, lesson content) to pay proxy + registry +
security-gate + lifecycle overhead it never uses. Most of what a
platform persists is plain data with no game-entity behavior.

The fix isn't to make everything Stuff, nor to duplicate the
persistence machinery — it's to **extract** the shared field-mapping
machinery (`MixinApi.getAllPersistentFields` and friends are already
constructor-static and neutral) and let *both* a plain `Document` base
and the Stuff `Hydrator` consume it. One persistence story, two object
models. A `Document` is value-like persisted state; a `Stuff` is an
identity-like live entity hydrated from a Document. `Document` losing
the per-object security gate is correct — document access control binds
at the Api/collection/lease layer, not per-object. (An audit confirmed
nothing relied on `User`/`GoogleProfile`/`Template` being Stuff.)

The one Stuff-coupling that remains is marshallers + hooks +
`PersistentHydrator`, which stay Idea-rooted *for HMR only* (they're
stateless strategy objects hot-swapped via the clone pipeline).
Un-Stuffing them — re-homing them as path-resolved code modules — is a
deferred, separate change; `Document` reaches them through the injected
resolver seam in the meantime.

## Collections

Defined in `backend/PersistenceManager.ts`:

```typescript
enum Collections {
  Users = 'users',
  GoogleProfiles = 'google_profiles',
  Domain = 'domain',
  Emotes = 'emotes',
  Groups = 'groups',
  Channels = 'channels',
}
```

`Domain` is the templates collection. The three social-cluster
collections (`emotes`, `groups`, `channels`) hold `Document`
subclasses (`Emote`, `Group`, `Channel`) — see the corresponding
subsystem docs.

Indexes are created on connect:

- `google_profiles.googleId` — unique
- `google_profiles.email` — non-unique
- `users.googleProfileId` — non-unique
- `domain.path` — unique
- `emotes.verb` — unique
- `emotes.aliases` — non-unique
- `groups.owner` — non-unique
- `groups.memberIds` — non-unique
- `channels.name` — unique
- `channels.memberIds` — non-unique (powers "channels I'm in" lookups)
- `channels.kind` — non-unique

Index creation is best-effort (logs and continues on failure).

## Cross-References

- [templates.md](./templates.md) — the other persistence track:
  clone/hydrate/save-template pipeline for game-world objects, including
  `TemplateApi.saveTemplate` and the folder/leaf-invariant `DomainHook`
  that rides on the around-hook mechanism above.
- [lifecycle.md](./lifecycle.md) — Stuff create/destroy lifecycle
  (applies to the cloned Stuff a Template produces, not to the
  `Document` itself).
- [antipatterns.md § Per-Field Invariants](../antipatterns.md#per-field-invariants-belong-on-setters-not-in-normalize-hooks)
  — setter contract that hydration rides on.
- [antipatterns.md § Persistent Fields Default to Scalars](../antipatterns.md#persistent-fields-default-to-scalars-marshallers-are-the-escape-hatch)
  — full statement of the scalar-default rule and the marshaller
  escape hatch, with BAD/GOOD examples.
- [state-model.md](./state-model.md) — the `Document` track, Avatar
  self-contained model, why Player class is gone.
- [light.md](./light.md) — first major user of the scalar-default
  rule; `AmbientLitMixin` / `LightSourceMixin` / `Window`
  decompose Light value objects into scalar fields.
- [quantities.md](./quantities.md) — first production user of the
  Marshaller framework. `QuantityMarshaller` round-trips
  `Quantity<U>` through `{value, unit}` JSON; PropertiedMixin's
  per-prop marshaller binding (`savedPropMarshallers`) lets host
  Stuff store rich Quantity props without a per-class declaration.
