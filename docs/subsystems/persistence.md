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

### Avatar persist-back uses the existing `Persistable.save` surface

`Avatar.save()` is a thin two-line shim:
`TemplateApi.snapshotToTemplate(this)` returns the mutated Template
(without committing); the caller invokes `tpl.save()`. The
underlying `Template.save` is the standard `Persistable.save` path
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

`Persistable.save` / `findById` / `find` pre-resolve any registered
field marshallers (`preloadFieldMarshallers` / the static
counterpart used by `findById`/`find`) before the sync
`toDocument` / `fromDocument` walk. Pre-warming the singleton
cache lets the sync `findByTemplatePath` lookup inside those
methods always hit a populated cache. The async barrier sits in
the already-async `save`/`findById`/`find` boundary; `toDocument`
/ `fromDocument` keep their sync contract.

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
- [antipatterns.md § Persistent Fields Default to Scalars](../antipatterns.md#persistent-fields-default-to-scalars-marshallers-are-the-escape-hatch)
  — full statement of the scalar-default rule and the marshaller
  escape hatch, with BAD/GOOD examples.
- [state-model.md](./state-model.md) — Persistable in the Idea
  hierarchy, Avatar self-contained model, why Player class is gone.
- [light.md](./light.md) — first major user of the scalar-default
  rule; `AmbientLitMixin` / `LightSourceMixin` / `Window`
  decompose Light value objects into scalar fields.
- [quantities.md](./quantities.md) — first production user of the
  Marshaller framework. `QuantityMarshaller` round-trips
  `Quantity<U>` through `{value, unit}` JSON; PropertiedMixin's
  per-prop marshaller binding (`savedPropMarshallers`) lets host
  Stuff store rich Quantity props without a per-class declaration.
