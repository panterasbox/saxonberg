# Antipatterns to Avoid

This document lists coding patterns that should be avoided in the Saxonberg
codebase, with the correct alternative for each.

## Duck Typing with Mixins

**ANTIPATTERN**: Checking for method existence using `typeof` instead of
using proper API layers.

For the full mixin framework — authoring conventions, the `Mixins`
registry, `MixinApi` predicates, composition order, and how mixins
integrate with persistence/commands/security — see
[subsystems/mixins.md](./subsystems/mixins.md).

### BAD (duck typing)

```typescript
// Checking if method exists
if (typeof obj.addContainable === 'function') {
  obj.addContainable(item);
}

// Checking if property exists
if (obj.environment) {
  const env = obj.environment;
}

// Multiple checks for mixin methods
if (typeof container.removeContainable === 'function') {
  container.removeContainable(item);
}
if (typeof target.setContainer === 'function') {
  target.setContainer(newContainer);
}
```

### GOOD (proper API layers)

```typescript
// PREFERRED: type-predicate narrowing when you need to call interface methods
if (MixinApi.isContainer(obj)) {
  obj.addContainable(item); // obj is narrowed to Stuff & Container
}

// Use MixinApi.hasMixin() for dynamic introspection (no narrowing needed)
if (MixinApi.hasMixin(obj.constructor, Mixins.Container)) {
  // e.g., iterating capabilities, reporting — not calling interface methods
}

// Use ContainmentApi for movement operations
ContainmentApi.move(sword, avatar);    // pick up (source inferred)
ContainmentApi.move(sword, location);  // drop (source inferred)

// Use ContainmentApi.getContents() for safe container access
const items = ContainmentApi.getContents(container);
```

### Narrowing predicates vs. `hasMixin()`

`MixinApi` exposes an `isX()` predicate for every registered mixin
(`isContainer`, `isContainable`, `isSensor`, `isVocal`, `isNamed`,
`isGendered`, `isVisible`, `isPerceptible`, `isDetailed`, `isPropertied`,
`isCommandGiver`, …). Each returns `obj is Stuff & <Interface>` and threads
the mixin's public interface into TypeScript's control-flow narrowing.

- **Use `MixinApi.isX(obj)`** when you want to check presence *and* call
  interface methods on the narrowed object. This is the dominant case.
- **Use `MixinApi.hasMixin(obj.constructor, Mixins.X)`** only when you're
  introspecting dynamically (e.g., walking a constructor's mixin chain,
  collecting persistent fields) and don't need to narrow `obj`.

### Why duck typing is bad

1. **Type safety**: no compile-time checking — typos and wrong method names
   fail at runtime.
2. **Unclear intent**: doesn't communicate WHICH mixin provides the
   functionality.
3. **Maintenance**: hard to track which mixins are actually required.
4. **Debugging**: failures are silent — `typeof` returns false instead of
   throwing.
5. **Testing**: hard to mock — tests must implement exact method signatures.
6. **Refactoring**: renaming mixin methods breaks code silently.

### Proper API benefits

1. **Explicit mixin checks**: `MixinApi.hasMixin(obj.constructor, Mixins.Container)`
   makes requirements clear.
2. **Centralized logic**: movement operations go through `ContainmentApi`.
3. **Consistent patterns**: same API across the entire codebase.
4. **Type safety**: API methods provide better type hints.
5. **Hook execution**: `ContainmentApi` ensures hooks run correctly.
6. **Testability**: easy to mock APIs for unit tests.

## Movement Hierarchy

There are three levels of movement abstraction. NEVER skip levels.

### Level 1: `traverse(exit, mode)` — high level (MobileMixin)

For creatures and vehicles crossing an Exit under a locomotion mode:

```typescript
avatar.traverse(exit, 'walk');     // explicit verb (run/climb/swim controllers)
vehicle.traverse(exit, 'drive');
```

`mode` is the verb the mover is using right now (`'walk'`, `'run'`,
`'climb'`, …) and is required at the API. Explicit-verb controllers
pass their own verb. The `go` command has no verb of its own — it
dispatches "whatever the mover's current mode is" by reading the
`movement.defaultMode` setting (declared on `MobileMixin`,
schema-defaulted to `'walk'`):

```typescript
const mode = resolveSetting<string>(mover, 'movement.defaultMode') ?? 'walk';
await mover.traverse(exit, mode);
```

There is no destination-based variant — callers that have a Location
in hand resolve it to an Exit (typically by direction) and pass that.

**When to use**: player/NPC movement commands, AI pathfinding.

### Level 2: `ContainmentApi.move()` — mid level (the correct layer)

For ANY containable object movement with hooks:

```typescript
// Pick up item (automatically removes from current location)
ContainmentApi.move(sword, avatar);

// Drop item (automatically removes from avatar's inventory)
ContainmentApi.move(sword, location);

// Move player to new room
ContainmentApi.move(avatar, newRoom);
```

**When to use**: inventory commands (get, drop), object manipulation,
teleportation.

`move()` automatically determines the current container from
`item.getContainer()`, so you only need to specify the destination.

**Contract**:
- Parameters are typed `Stuff & Containable` (item) and `Stuff & Container`
  (to). Callers must narrow first — typically with
  `MixinApi.isContainable(x)` / `MixinApi.isContainer(y)`.
- Returns `void`. Programmatic contract violations (e.g., passing an item
  that isn't containable at runtime) throw; there are no boolean "success"
  flags.
- **User-input validation is separate**: YAML command definitions declare
  validators like `mustBeContainable` that run before the controller. The
  runtime narrowing inside a controller is a contract assertion for
  programmatic-bypass callers, not a user-facing check — they are NOT
  redundant.

### Level 3: `setContainer()` / `addContainable()` — low level (NEVER call directly)

Only called by `ContainmentApi.move()`:

```typescript
// NEVER do this
const currentContainer = item.getContainer();
if (currentContainer) {
  currentContainer.removeContainable(item);
}
newContainer.addContainable(item);
item.setContainer(newContainer);

// ALWAYS use this instead
ContainmentApi.move(item, newContainer);
```

**When to use**: never. Only `ContainmentApi` should call these methods.

## Available API Methods

### MixinApi (mixin-agnostic utilities)

```typescript
// Type-predicate narrowing — preferred when calling interface methods
if (MixinApi.isContainer(obj)) { /* obj: Stuff & Container */ }

// Dynamic introspection (no narrowing)
if (MixinApi.hasMixin(obj.constructor, Mixins.Container)) { … }

// Persistent field aggregation (walks the prototype chain)
const fields = MixinApi.getAllPersistentFields(obj.constructor);
```

### ContainmentApi (movement & containment)

```typescript
// Move object to a container (the correct way)
// Automatically removes from current location.
ContainmentApi.move(item, toContainer);

// Check if item is in container
const isInside = ContainmentApi.isContainedIn(item, container);

// Get the container holding an item
const container = ContainmentApi.getContainer(item);

// Get contents from a container (safe, returns [] if not a container)
const contents = ContainmentApi.getContents(container);
```

## Migration Pattern

When you encounter duck typing in existing code:

```typescript
// OLD CODE (duck typing)
const currentContainer = item.getContainer();
if (typeof currentContainer?.removeContainable === 'function') {
  currentContainer.removeContainable(item);
}
if (typeof newContainer.addContainable === 'function') {
  newContainer.addContainable(item);
}
if (typeof item.setContainer === 'function') {
  item.setContainer(newContainer);
}

// NEW CODE (proper API layer)
ContainmentApi.move(item, newContainer);
```

For mixin checks:

```typescript
// OLD CODE (duck typing)
if (typeof obj.getContents === 'function') {
  const items = obj.getContents();
}

// NEW CODE (narrow + call)
if (MixinApi.isContainer(obj)) {
  const items = obj.getContents();
}

// OR (safe convenience helper)
const items = ContainmentApi.getContents(obj); // [] if not a container
```

## Display Names — Use DescribeApi

Ad-hoc `getObjectName()` helpers that duck-type through `fullName` /
`name` / `shortDescription` are **not allowed**. The display-name fallback
chain is centralized in `DescribeApi`:

```typescript
// CORRECT — single source of truth for human-readable names
const name = DescribeApi.getDisplayName(obj, 'something');

// NOT ALLOWED — ad-hoc fallback chains in controllers/API code
function getObjectName(obj: any): string {
  if (typeof obj.fullName === 'string') return obj.fullName;
  if (typeof obj.name === 'string') return obj.name;
  if (typeof obj.shortDescription === 'string') return obj.shortDescription;
  return 'something';
}
```

`DescribeApi.getDisplayName()` uses `MixinApi.isNamed()` / `isVisible()`
internally (not duck typing) and falls back in this order:

1. `NamedMixin.fullName`
2. A plain `name` string (Location and similar carry this directly)
3. `VisibleMixin.shortDescription`
4. Caller-supplied fallback

This is the seed of a broader presentation layer. Any future
description/short/long/article/list-formatting helpers belong in
`DescribeApi`, not sprinkled across controllers.

### Rule of thumb

- **Movement operations** (pick up, drop, teleport): use `ContainmentApi.move()`
- **Locomotion** (walk, run, fly): use `traverse(exit, mode)` from `MobileMixin`
- **Container access** (get contents): use `ContainmentApi.getContents()`
- **Narrow and call**: use `MixinApi.isX(obj)` type predicates
- **Introspection only**: use `MixinApi.hasMixin(ctor, Mixins.X)`
- **Display text** (names/descriptions): use `DescribeApi.getDisplayName()`

## Persistent Fields Default to Scalars; Marshallers Are the Escape Hatch

**THE RULE**: persistent fields default to scalars and arrays of
scalars (numbers, strings, booleans, null, primitive tuples,
templatePath strings for Stuff cross-references, keyword lists).
Mixins that carry richer runtime types decompose them into named
scalar fields and reconstruct on read. The hydrator's bracket-assign
stays dumb; setters validate one primitive shape each.

For the rare case where a field genuinely doesn't decompose
(variable-key maps, structured composites whose internal
substructure is the data), authors write a `Marshaller` (an Idea-
shaped Stuff at `lib/persistence/Marshaller.ts`) that owns the
runtime↔stored conversion. The mixin declares
`static fieldMarshallers = { fieldName: marshallerTemplatePath }`
and the persistence framework applies it transparently around the
bracket-assign.

### BAD (object-shaped storage with a union setter)

```typescript
class AmbientLitMixin {
  static persistentFields = ['ambientLight'];
  // The setter accepts BOTH a runtime Light AND the raw doc shape
  // because the hydrator's bracket-assign drops a plain object in.
  setAmbientLight(value: Light | LightDataShape): void {
    this._ambientLight = Light.from(value);   // does double duty:
                                              // validation + coercion
  }
}
```

Two complaints. Setter is doing two jobs. Runtime callers can pass
nonsense (a raw object) and the setter swallows it. Storage is an
opaque blob in MongoDB.

### GOOD (scalar-flat persistence, strict setter)

```typescript
class AmbientLitMixin {
  static persistentFields = ['ambientIntensity', 'ambientColor'];

  protected _ambientIntensity = 0;
  protected _ambientColor: ColorTag | null = null;

  // Each scalar accessor pair validates ONE shape:
  protected set ambientIntensity(v: number) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
      throw new TypeError('ambientIntensity must be a non-negative finite number');
    }
    this._ambientIntensity = v;
  }
  protected set ambientColor(v: ColorTag | null) {
    if (v !== null && typeof v !== 'string') {
      throw new TypeError('ambientColor must be string or null');
    }
    this._ambientColor = v;
  }

  // Runtime API takes ONLY the value object:
  getAmbientLight(): Light {
    if (this._ambientIntensity === 0 && this._ambientColor === null) {
      return Light.ZERO;
    }
    return Light.of(this._ambientIntensity, this._ambientColor);
  }
  setAmbientLight(value: Light): void {
    if (!(value instanceof Light)) throw new TypeError('expected Light');
    this._ambientIntensity = value.intensity;
    this._ambientColor = value.color;
  }
}
```

Storage is two scalars. Each setter validates one primitive shape.
The runtime API is strict on the value class.

### GOOD (escape hatch — Marshaller for genuinely composite fields)

When the storage shape genuinely doesn't decompose — variable-key
maps, structured composites — a Marshaller takes over the
runtime↔stored conversion:

```typescript
class MoneyBagMarshaller extends Marshaller<MoneyBag, Record<string, number>> {
  public static readonly templatePath = '/lib/persistence/MoneyBagMarshaller';
  fromStored(raw: Record<string, number>): MoneyBag { return MoneyBag.of(raw); }
  toStored(mb: MoneyBag): Record<string, number> { return mb.toRecord(); }
}

class WalletMixin {
  static persistentFields = ['wallet'];
  static fieldMarshallers = { wallet: MoneyBagMarshaller.templatePath };

  // Setter is STRICT — the marshaller has already produced a MoneyBag
  // by the time the bracket-assign hits this setter on hydrate.
  setWallet(value: MoneyBag): void {
    if (!(value instanceof MoneyBag)) throw new TypeError('expected MoneyBag');
    this._wallet = value;
  }
}
```

`PersistentHydrator.hydrate` and `Persistable.toDocument` /
`fromDocument` look up the marshaller via
`MixinApi.getAllFieldMarshallers(constructor)` and apply
`fromStored` / `toStored` around the bracket-assign / bracket-read.

### Don't reach for a marshaller as a first move

Most fields decompose. A `{ aToB?, bToA? }` overrides object becomes
two scalar fields named `aToBOverride: number | null` and
`bToAOverride: number | null`; the runtime API can still expose
`getDirectionalOverrides()` returning the structured shape, but
storage is two named scalars. Marshallers exist for the cases where
the structured shape IS the data — variable keys, dynamic
composition — and decomposition would lose information.

## Per-Field Invariants Belong on Setters, Not in `normalize()` Hooks

**ANTIPATTERN**: A `#normalize()` private method called after hydration to
fix up shapes — coerce a boolean, lowercase a string, dedupe a list — is
re-implementing what setters already do, except in a place where the
language can't enforce it. Templates can be loaded by paths the original
author never anticipated; `Hydrator` subclasses can change; tests can
construct objects in ways that skip the hook. Setters can't be skipped.

### BAD (post-hydrate fixup)

```typescript
export class Door extends DoorBase {
  constructor(data?: Record<string, unknown>) {
    super();
    if (data) {
      // Manual hydration in the constructor.
      const fields = MixinApi.getAllPersistentFields(this.constructor);
      const target = this as unknown as Record<string, unknown>;
      for (const field of fields) {
        if (field in data) target[field] = data[field];
      }
      this.#normalize();
    }
  }

  public async initialize(): Promise<void> {
    // …and again here, after the clone-time hydrator runs.
    this.#normalize();
  }

  #normalize(): void {
    // Lowercase / trim / dedupe keywords, coerce isOpen to boolean.
    const kw = super.getKeywords();
    if (kw.length > 0) {
      this.setKeywords([]);
      for (const k of kw) this.addKeyword(k);
    }
    this.isOpen = this.isOpen === true;
  }
}
```

The mixin's bulk `setKeywords()` ran a different code path than the
incremental `addKeyword()`. Mixed templates (some pre-normalized, some
not) silently diverge. The `isOpen === true` coercion silently absorbs
malformed templates instead of failing loudly.

### GOOD (setter-enforced invariant)

```typescript
// SealableMixin
get isOpen(): boolean { return this._isOpen; }
set isOpen(value: boolean) {
  if (typeof value !== 'boolean') {
    throw new TypeError(`isOpen must be a boolean, got ${typeof value}`);
  }
  this._isOpen = value;
}

// PerceptibleMixin
get keywords(): string[] { return this._keywords; }
set keywords(value: string[]) {
  if (!Array.isArray(value)) throw new TypeError('keywords must be string[]');
  this._keywords = [];
  for (const k of value) this.addKeyword(k);
}
addKeyword(k: string): void {
  const norm = k.trim().toLowerCase();
  if (norm && !this._keywords.includes(norm)) this._keywords.push(norm);
}
```

`Hydrator`'s `target[field] = data[field]` goes through these setters
because bracket-assign invokes them. One normalization path, exercised
both by templates and by incremental callers (`door.addKeyword('oak')`).
A malformed template (`isOpen: 1`) fails loudly at hydrate time. The
class's `#normalize()` and constructor data blob both go away.

### When a `Hydrator` subclass IS the right answer

Setter-on-field handles per-field shape invariants. Cross-field rules
("if `isLocked` is true, `lockKey` must reference a real key") cannot
live on a single setter — that's the real use case for a `Hydrator`
subclass with overridden `hydrate()`.

## Use props, not direct field assignment

**ANTIPATTERN**: Stuffing dynamic, instance-specific state onto a
`Stuff` via direct property assignment.

### BAD (direct assignment)

```typescript
avatar.questStarted = true;
avatar.gold = 100;
avatar.activeBuffs = [...];
location.occupancy = location.occupancy + 1;
```

The new "fields" exist as untyped, runtime-only public properties.
They are invisible to access control, mask transformation, the
persistence pipeline, and `getAllPropNames()` enumeration. Any code
holding a reference can read or overwrite them; nothing audits the
mutations; saving/loading doesn't round-trip them. A `for…in` over a
Stuff sees them, but only by luck of being enumerable.

### GOOD (PropertiedMixin API)

```typescript
avatar.setProp(Property.of<boolean>('quest_started'), true);

avatar.initProp(Property.of<number>('gold'), {
  transient: false,                         // saved across reload
  checkAccess: (_p, op) =>
    op !== PropOperations.Set ||             // only owner can write
    ExecutionContextApi.getCaller() === avatar,
});
avatar.setProp(Property.of<number>('gold'), 100);
```

Now: `gold` round-trips through the persistence pipeline (saved
because `savedProps` is on `PropertiedMixin.persistentFields`); writes
go through `checkAccess`; the property is enumerable via
`getAllPropNames`; introspectable via `checkProp`.

### When a class field IS the right answer

Structural state — what a `Door` *is* — stays a class field
(`isOpen`, `lockKey`, `keywords`). Persistent fields a class needs at
all times, with shape that's part of the type, are still declared as
fields and listed in `static persistentFields`.

Props handle the dynamic, per-instance, possibly-protected,
possibly-transient state on top of that — quest flags, capabilities,
counters, configuration overrides, anonymous buff slots.

Full subsystem doc: [subsystems/properties.md](./subsystems/properties.md).

## Reaching Into Another Stuff's Fields or Accessors

**ANTIPATTERN**: Reading or writing a field or accessor pair on
another `Stuff` from outside its owning class.

### BAD (direct field/accessor access)

```typescript
// `direction` is a public field on Exit.
const dir = exit.direction;
exit.direction = 'north';

// `door` is an accessor pair on Exit (invariant maintenance).
exit.door = newDoor;

// `name` is a field on something composing NamedMixin.
if (avatar.name === 'Alice') { ... }
```

The fields/accessors exist — they'll work — but they bypass the
inter-stuff contract layer. Specifically:

- **Shadows can't intercept them.** The shadow framework dispatches
  on methods only; field reads are never mediated, accessor reads
  are filtered out of the intercept set, and there is no `set`-trap
  on the proxy at all. Buffs, polymorph effects, hood/disguise
  shadows, etc. silently miss any read or write that goes through a
  field or accessor.
- **They couple call sites to the host's storage shape.** Renaming
  the field, splitting it into multiple, lazifying it behind a
  promise, or threading an invariant through a setter all become
  changes to every caller.

### GOOD (methods are the contract surface)

```typescript
const dir = exit.getDirection();
exit.setDirection('north');

exit.setDoor(newDoor);

if (avatar.getName() === 'Alice') { ... }
```

Methods are what shadows hook, what call-security policies gate, and
what the host gets to refactor freely behind. Fields and accessor
pairs stay host-internal — accessors are still the right tool for
invariant maintenance (e.g., `Door.attachedTo` bookkeeping on the
`door` accessor), but the public method delegates to them rather
than exposing them to other Stuff.

The Hydrator is a deliberate framework carve-out: it reflects
directly into persistent fields so it can populate them from
storage, including firing accessor setters when an invariant lives
there. Anything else outside the host's own class body should go
through methods.

See [subsystems/call-security.md § Authoring shape](./subsystems/call-security.md#authoring-shape--explicit-declaration-declares-the-surface)
for why shadows only see methods.

## Cloning Singletons — use `StuffApi.singleton(path)`

**ANTIPATTERN**: Calling `StuffApi.clone(path)` or
`StuffApi.findByTemplatePath(path)` on a class that should be a
singleton-by-path.

### BAD

```typescript
// Risk: a second clone() throws if the class composes
// SingletonMixin, or silently produces a duplicate if it doesn't.
const narnia = await StuffApi.clone<CartesianZone>('/narnia');

// Risk: pre-empts the cache-or-clone semantics, fails when the
// instance hasn't been cloned yet.
const narnia = StuffApi.findByTemplatePath<CartesianZone>('/narnia');
```

### GOOD

```typescript
// Get-or-create against the singleton index. Works whether the
// instance is loaded yet or not.
const narnia = await StuffApi.singleton<CartesianZone>('/narnia');
```

`SingletonMixin` is the enforcement layer that makes bare `clone()`
on a singleton class throw. `singleton()` is the convenient surface
that respects the contract automatically.

## Reaching Into Raw Alias Storage

**ANTIPATTERN**: Mutating `aliases` / `aliasesSession` directly,
manually writing tombstone nulls, or calling `ShellApi.expandAliases`
from a controller.

The `setAlias` / `removeAlias` mutators on `AliasMixin` are
`@Unshadowable`, validate body shape and name shape at set-time, and
correctly handle tombstones for default-suppression. Bracket access
on the raw stores bypasses every guarantee.

### BAD

```typescript
// Manual store mutation — skips validation, skips shadow-resistance,
// skips the tombstone semantics removeAlias provides.
avatar.aliases['l'] = 'look';
delete avatar.aliasesSession['foo'];
avatar.aliases['s'] = null; // hand-rolled tombstone
```

### GOOD

```typescript
avatar.setAlias('l', 'look', { actor: avatar });
avatar.setAlias('foo', 'bar', { lifetime: 'session', actor: avatar });
avatar.removeAlias('s', avatar); // tombstones a default automatically
```

`ShellApi.expandAliases` is a substrate-pipeline helper invoked by
`CommandGiverMixin.executeCommand`. Controllers should not call it —
they receive the post-expansion `CommandContext.aliasExpansion`
record when they need to know an alias fired.

See [subsystems/shell-alias.md](./subsystems/shell-alias.md) for
the full design.

## Pre-Asserted Casts Around Type Predicates

When a runtime predicate (`MixinApi.isX(...)`) is about to verify a
shape, **don't pre-assert that shape with `as unknown as Stuff & X`
before the check** — the cast tells the type system the answer
that the predicate is supposed to provide, which (a) lies if the
predicate fails and (b) makes the predicate's narrowing redundant.
The right shape is: cast to plain `Stuff` once (sound — `this`
inside a mixin's method IS `Stuff` via the mixin chain), then let
the predicate narrow.

### BAD (pre-asserted then verified)

```ts
// Asserts `Stuff & Adornable` BEFORE the predicate runs. If the
// predicate returns false the cast is a lie; if it returns true
// the cast is redundant. Either way the predicate's narrowing
// flows nowhere.
const here = this as unknown as Stuff & Adornable;
const there = other as unknown as Stuff & Adornable;
if (
  MixinApi.isAdornable(here as unknown as Stuff) &&
  MixinApi.isAdornable(there as unknown as Stuff)
) {
  BoundaryApi.attachExistingBoundary({ boundary, hostA: here, hostB: there });
}
```

### GOOD (cast to plain Stuff, predicate narrows)

```ts
const thisStuff = this as unknown as Stuff;
const otherStuff = other as unknown as Stuff;
if (MixinApi.isAdornable(thisStuff) && MixinApi.isAdornable(otherStuff)) {
  // After the predicate, both are narrowed to `Stuff & Adornable`.
  BoundaryApi.attachExistingBoundary({
    boundary,
    hostA: thisStuff,
    hostB: otherStuff,
  });
}
```

### Why

`MixinApi.isX(obj): obj is Stuff & X` is a TypeScript type
predicate — it carries narrowing semantics. After the check,
TypeScript treats the variable as `Stuff & X` *without any cast
on your part*. If you've already cast the variable to `Stuff & X`
ahead of the check, the narrowing has nowhere to go and the cast
is acting as a hand-asserted truth claim instead of a verified
one. If something later changes (a renamed mixin, a refactored
predicate) the cast persists and silently lies.

The minimum cast is the one that gets you to a type the predicate
accepts (`Stuff`), and then the predicate does the rest.

## Redundant Casts After a Predicate Already Narrowed

Sister antipattern. After a `MixinApi.isX(obj)` predicate fires
and the type system has narrowed `obj` to `Stuff & X`, **don't
re-cast** to access the X surface. The narrowed type is the
narrowed type; further casts add noise and re-introduce the
pattern above.

### BAD (cast after narrowing)

```ts
if (!MixinApi.isContainable(target)) return;
// `target` is already `Stuff & Containable` here — the cast is
// redundant noise.
const env = (target as unknown as Stuff & Containable).getContainer();
```

### GOOD (use the narrowed type)

```ts
if (!MixinApi.isContainable(target)) return;
const env = target.getContainer();
```

### Use the predicate-shaped check, not `hasMixin(constructor, name)`

`MixinApi.hasMixin(obj.constructor, Mixins.X)` is the right primitive
for *constructor-level introspection* (iterating mixins, dynamic
checks at template-load time). It is NOT a type predicate — it
doesn't narrow. Reach for `MixinApi.isX(obj)` whenever you want a
narrowed instance after the check, e.g. to access `X`'s methods on
the narrowed value without further casts.

## `instanceof`, virtual methods, and cast-by-invariant — pick the honest one

These three answer different questions, and the smell happens when
you reach for the wrong one:

- **Mixin predicate (`MixinApi.isX(obj)`)** — for "is this Stuff
  capable of X?" Use whenever a mixin defines the capability and
  the caller wants the narrowed surface.
- **Virtual method on the base class** — for *behavioural*
  questions that genuinely make sense across every subclass. Good:
  `Zone.hasDerivedAdjacency(): boolean` (every zone can answer
  "do I synthesize exits from adjacency?"). Bad:
  `Zone.getCellSize(): number | null` returning `null` on
  non-Cartesian zones — `cellSize` doesn't conceptually exist on
  a SphericalZone, so lifting it to the base pollutes the
  abstraction with a value-shaped null that's "weird, not just
  absent."
- **`instanceof Class`** — for "what TYPE are you?" Genuinely
  useful when the *only* honest answer requires the subclass's
  specific surface and there's no behavioural reframing that's
  natural. Rare in this codebase, but real.
- **Cast-by-invariant** — when an external invariant guarantees
  the relationship (e.g. `CartesianZone.addLocation` rejects
  non-Cartesian locations, so a `CartesianLocation`'s zone is
  always a `CartesianZone`). Document the invariant; use a
  type-only cast `getZone() as CartesianZone | null`; let the
  optional-call short-circuit handle transient state.

The wrong move is to lift a subclass-specific *value* onto the
base just to avoid `instanceof`. If the base method's docstring
needs to say "returns null on most subclasses," the abstraction is
wrong. Either it's a behavioural question (then the method
returns `false`/`null` for "I don't do that," which is fine), or
it's a value extraction (then leave it on the subclass and reach
through the invariant from the caller).

For "is this Stuff capable of X?" use `MixinApi.isX(obj)`.
For behavioural polymorphism, use a virtual method whose default
answer is meaningful on every subclass.
For cartesian-only-on-the-cartesian-side cases, lean on the
invariant and cast — don't pollute the base.

## Cast-Chain to `super` for an Optional Inherited Method

When a mixin or subclass overrides a hook that the parent type
doesn't statically declare, calling `super.hook()` is a TypeScript
error — even though it'd be safe at runtime if the prototype
chain happens to have it. The instinctive workaround is the
cast-and-optional-call dance:

### BAD (cast through `(...) | undefined`)

```typescript
public override onDestruct(): void {
  doMyCleanup();
  // The cast lies about the static surface, then `?.call(this)`
  // re-introduces the runtime guard that the cast just suppressed.
  (super.onDestruct as (() => void) | undefined)?.call(this);
}
```

Two things are wrong: the cast hides the missing declaration
instead of fixing it, and reaching for `.call(this)` instead of
`super.onDestruct()` is a tell that the static type was the
problem all along.

### GOOD (declare a no-op terminal on the root)

Put a no-op implementation on the root class so the chain has a
guaranteed terminal callee. Now every layer can `super.X()`
without ceremony:

```typescript
// Stuff.ts
public onDestruct(): void {}
```

```typescript
// Subclass / mixin
public override onDestruct(): void {
  doMyCleanup();
  super.onDestruct();
}
```

The runtime call-shape doesn't change (any layer that wants to
participate still defines the method); the static surface now
matches what the cast was lying about.

### When this fits

The pattern works for hooks that are **universal to the root
class's purpose** — every Stuff *can* be destructed, so an empty
terminal `onDestruct` belongs on Stuff. It does NOT mean every
hook should land on the root: a hook that only makes sense for a
narrow capability belongs on the mixin's interface, and consumers
narrow with `MixinApi.isX(obj)` before calling. The question is
whether the root class is the natural terminal point for the
chain — destruction is, "can-this-fly" isn't.

Optional-method dispatchers in API code (the
`typeof fn === 'function'` pattern in `StuffApi.destruct`,
`ContainmentApi`, etc.) keep working — they were always defending
against shadows / dynamic composition, not against missing
prototype links.


- Use the correct abstraction level: `traverse()` for creatures/vehicles,
  `ContainmentApi.move()` for all other object movement, low-level
  containment methods only from inside `ContainmentApi`.
- Never duck-type mixins, even for display. Display-name lookup lives in
  `DescribeApi.getDisplayName()`; mixin presence checks use
  `MixinApi.isX()` predicates (preferred) or `MixinApi.hasMixin()`
  (introspection only).
- Per-field invariants go on setters. Cross-field invariants go in a
  `Hydrator` subclass.
- Dynamic, per-instance state goes through `PropertiedMixin`'s
  `setProp` / `getProp` / `initProp`, never via direct field
  assignment.
- Singleton-by-path templates resolve via `StuffApi.singleton(path)`,
  not `clone()` or `findByTemplatePath()`.
- Alias state goes through `setAlias` / `removeAlias`, never via
  bracket access on `aliases` / `aliasesSession`. `ShellApi.expandAliases`
  is a pipeline helper, not a controller-facing API.
- Don't pre-assert a mixin shape with `as unknown as Stuff & X`
  before a `MixinApi.isX(...)` predicate verifies it. Cast to plain
  `Stuff` once, let the predicate narrow. Don't re-cast to access
  `X`'s surface after narrowing — the narrowed type IS the type.
- Match the question to the tool: mixin predicates for "capable of
  X?", virtual methods for behavioural polymorphism whose default
  answer is meaningful on every subclass, cast-by-invariant for
  subclass-specific values whose existence is guaranteed by an
  external relationship, `instanceof` only as a last resort. Don't
  lift a subclass-only *value* onto the base just to avoid
  `instanceof` — that's pollution-by-null.
- Persistent fields default to scalars and arrays of scalars.
  Decompose value-object runtime types into named scalar fields;
  the getter reconstructs. For the rare field that genuinely
  doesn't decompose (variable-key maps, structured composites),
  declare a `Marshaller` and register it in `static fieldMarshallers`
  on the mixin. Strict setters always.
- Don't cast `super.hook` to `(... | undefined)?.call(this)` to
  chain an optionally-inherited method. Declare a no-op terminal
  on the root class (the way `Stuff.onDestruct` does for the
  destruction chain) so `super.hook()` type-checks at every
  layer. Pattern only fits hooks universal to the root's purpose.
