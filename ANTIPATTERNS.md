# Antipatterns to Avoid

This document lists coding patterns that should be avoided in the Saxonberg codebase.

## Duck Typing with Mixins

**ANTIPATTERN**: Checking for method existence using `typeof` instead of using proper API layers

### ❌ BAD (Duck Typing)

```typescript
// Checking if method exists
if (typeof obj.addToInventory === 'function') {
  obj.addToInventory(item);
}

// Checking if property exists
if (obj.environment) {
  const env = obj.environment;
}

// Multiple checks for mixin methods
if (typeof container.removeFromInventory === 'function') {
  container.removeFromInventory(item);
}
if (typeof target.setEnvironment === 'function') {
  target.setEnvironment(newContainer);
}
```

### ✅ GOOD (Proper API Layers)

```typescript
// PREFERRED: Type-predicate narrowing when you need to call interface methods
if (MixinApi.isContainer(obj)) {
  obj.addToInventory(item); // obj is narrowed to Stuff & Container
}

// Use MixinApi.hasMixin() for dynamic introspection (no narrowing needed)
if (MixinApi.hasMixin(obj.constructor, Mixins.Container)) {
  // e.g., iterating capabilities, reporting — not calling interface methods
}

// Use ContainmentApi for movement operations
ContainmentApi.move(sword, avatar);    // pick up (source inferred)
ContainmentApi.move(sword, location);  // drop (source inferred)

// Use MixinApi.getContents() for safe container access
const items = MixinApi.getContents(container);
```

### Narrowing Predicates vs. `hasMixin()`

`MixinApi` exposes a `isX()` predicate for every registered mixin
(`isContainer`, `isContainable`, `isSensor`, `isVocal`, `isNamed`,
`isGendered`, `isVisible`, `isPerceptible`, `isDetailed`, `isPropertied`,
`isCommandGiver`). Each returns `obj is Stuff & <Interface>` and threads
the mixin's public interface into TypeScript's control-flow narrowing.

- **Use `MixinApi.isX(obj)`** when you want to check presence *and* call
  interface methods on the narrowed object. This is the dominant case.
- **Use `MixinApi.hasMixin(obj.constructor, Mixins.X)`** only when you're
  introspecting dynamically (e.g., walking a constructor's mixin chain,
  collecting persistent fields) and don't need to narrow `obj`.

### Why Duck Typing is Bad

1. **Type Safety**: No compile-time checking - typos and wrong method names fail at runtime
2. **Unclear Intent**: Doesn't communicate WHICH mixin provides the functionality
3. **Maintenance**: Hard to track which mixins are actually required
4. **Debugging**: Failures are silent - `typeof` returns false instead of throwing
5. **Testing**: Hard to mock - tests must implement exact method signatures
6. **Refactoring**: Renaming mixin methods breaks code silently

### Proper API Benefits

1. **Explicit Mixin Checks**: `MixinApi.hasMixin(obj, Mixins.Container)` makes requirements clear
2. **Centralized Logic**: Movement operations go through ContainmentApi
3. **Consistent Patterns**: Same API across entire codebase
4. **Type Safety**: API methods provide better type hints
5. **Error Handling**: Returns false/empty arrays instead of throwing
6. **Testability**: Easy to mock APIs for unit tests
7. **Hook Execution**: ContainmentApi ensures hooks run correctly

## Movement Hierarchy

There are three levels of movement abstraction. NEVER skip levels:

### Level 1: travel() - High Level (MobileMixin)

For creatures and vehicles with modes of locomotion:

```typescript
avatar.travel(targetLocation, 'walk');  // Walk
avatar.travel(targetLocation, 'run');   // Run
vehicle.travel(targetLocation, 'drive'); // Drive
```

**When to use**: Player/NPC movement commands, AI pathfinding

### Level 2: ContainmentApi.move() - Mid Level (THE CORRECT LAYER)

For ANY containable object movement with hooks:

```typescript
// Pick up item (automatically removes from current location)
ContainmentApi.move(sword, avatar);

// Drop item (automatically removes from avatar's inventory)
ContainmentApi.move(sword, location);

// Move player to new room
ContainmentApi.move(avatar, newRoom);
```

**When to use**: Inventory commands (get, drop), object manipulation, teleportation

**Note**: `move()` automatically determines the current container from `item.getEnvironment()`, so you only need to specify the destination.

**Contract**:
- Parameters are typed `Stuff & Containable` (item) and `Stuff & Container` (to).
  Callers must narrow first — typically with `MixinApi.isContainable(x)` /
  `MixinApi.isContainer(y)`.
- Returns `void`. Programmatic contract violations (e.g., passing an item that
  isn't containable at runtime) throw; there are no boolean "success" flags.
- **User-input validation is separate**: YAML command definitions declare
  validators like `mustBeContainable` that run before the controller. The
  runtime narrowing inside a controller is a contract assertion for
  programmatic bypass callers, not a user-facing check — they are NOT
  redundant.

### Level 3: setEnvironment() / addToInventory() - Low Level (NEVER CALL DIRECTLY)

Only called by `ContainmentApi.move()`:

```typescript
// ❌ NEVER DO THIS
const currentContainer = item.getEnvironment();
if (currentContainer) {
  currentContainer.removeFromInventory(item);
}
newContainer.addToInventory(item);
item.setEnvironment(newContainer);

// ✅ ALWAYS USE THIS INSTEAD
ContainmentApi.move(item, newContainer);
```

**When to use**: NEVER. Only ContainmentApi should call these methods.

## Available API Methods

### MixinApi (Mixin-Agnostic Utilities)

```typescript
// Check if object has a specific mixin
if (MixinApi.hasMixin(obj.constructor, Mixins.Container)) { }

// Get contents (safe, returns empty array if not a container)
const items = MixinApi.getContents(container);

// Get all persistent fields from mixins
const fields = MixinApi.getMixinFields(constructor);
```

### ContainmentApi (Movement & Containment)

```typescript
// Move object to a container (THE CORRECT WAY)
// Automatically removes from current location (determined from item's environment)
const success = ContainmentApi.move(item, toContainer);

// Check if item is in container
const isInside = ContainmentApi.isContainedIn(item, container);

// Get the container holding an item
const container = ContainmentApi.getContainer(item);

// Get contents from a container (safe, returns empty array if not a container)
const contents = ContainmentApi.getContents(container);
```

## Migration Pattern

When you encounter duck typing in existing code:

```typescript
// OLD CODE (duck typing)
const currentContainer = item.getEnvironment();
if (typeof currentContainer?.removeFromInventory === 'function') {
  currentContainer.removeFromInventory(item);
}
if (typeof newContainer.addToInventory === 'function') {
  newContainer.addToInventory(item);
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

// NEW CODE (explicit check)
if (MixinApi.hasMixin(obj.constructor, Mixins.Container)) {
  const items = obj.getContents();
}

// OR (safe convenience helper)
const items = MixinApi.getContents(obj); // Returns [] if not a container
```

## Display Names — Use DescribeApi

Ad-hoc `getObjectName()` helpers that duck-type through `fullName` /
`name` / `shortDescription` are **no longer allowed**. The display-name
fallback chain is centralized in `DescribeApi`:

```typescript
// ✅ CORRECT - Single source of truth for human-readable names
const name = DescribeApi.getDisplayName(obj, 'something');

// ❌ NOT ALLOWED - Ad-hoc fallback chains in controllers/API code
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

### Rule of Thumb

- **Movement Operations** (pick up, drop, teleport): Use ContainmentApi.move() ✅
- **Locomotion** (walk, run, fly): Use travel() from MobileMixin ✅
- **Container Access** (get contents): Use MixinApi.getContents() ✅
- **Narrow and call**: Use MixinApi.isX(obj) type predicates ✅
- **Introspection only**: Use MixinApi.hasMixin(ctor, Mixins.X) ✅
- **Display Text** (getting names/descriptions): Use DescribeApi ✅

## Summary

**Never call `setEnvironment()` or `addToInventory()` directly - always use `ContainmentApi.move()`.**

**Use the correct abstraction level:**
- `travel()` for creatures/vehicles (high level)
- `ContainmentApi.move()` for all other object movement (mid level)
- `setEnvironment()/addToInventory()` only called by ContainmentApi (low level)

**Never duck-type mixins, even for display.** Display-name lookup lives in
`DescribeApi.getDisplayName()`; mixin presence checks use `MixinApi.isX()`
predicates (preferred) or `MixinApi.hasMixin()` (for introspection only).
