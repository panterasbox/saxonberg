# Antipatterns to Avoid

This document lists coding patterns that should be avoided in the Saxonberg
codebase, with the correct alternative for each.

## Duck Typing with Mixins

**ANTIPATTERN**: Checking for method existence using `typeof` instead of
using proper API layers.

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
if (typeof target.setEnvironment === 'function') {
  target.setEnvironment(newContainer);
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

### Level 1: `travel()` — high level (MobileMixin)

For creatures and vehicles with modes of locomotion:

```typescript
avatar.travel(targetLocation, 'walk');  // walk
avatar.travel(targetLocation, 'run');   // run
vehicle.travel(targetLocation, 'drive'); // drive
```

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
`item.getEnvironment()`, so you only need to specify the destination.

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

### Level 3: `setEnvironment()` / `addContainable()` — low level (NEVER call directly)

Only called by `ContainmentApi.move()`:

```typescript
// NEVER do this
const currentContainer = item.getEnvironment();
if (currentContainer) {
  currentContainer.removeContainable(item);
}
newContainer.addContainable(item);
item.setEnvironment(newContainer);

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
const currentContainer = item.getEnvironment();
if (typeof currentContainer?.removeContainable === 'function') {
  currentContainer.removeContainable(item);
}
if (typeof newContainer.addContainable === 'function') {
  newContainer.addContainable(item);
}
if (typeof item.setEnvironment === 'function') {
  item.setEnvironment(newContainer);
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
- **Locomotion** (walk, run, fly): use `travel()` from `MobileMixin`
- **Container access** (get contents): use `ContainmentApi.getContents()`
- **Narrow and call**: use `MixinApi.isX(obj)` type predicates
- **Introspection only**: use `MixinApi.hasMixin(ctor, Mixins.X)`
- **Display text** (names/descriptions): use `DescribeApi.getDisplayName()`

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

## Summary

- Never call `setEnvironment()` or `addContainable()` directly — always
  use `ContainmentApi.move()`.
- Use the correct abstraction level: `travel()` for creatures/vehicles,
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
