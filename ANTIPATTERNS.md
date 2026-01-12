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
// Use MixinApi.hasMixin() for explicit mixin checks
if (MixinApi.hasMixin(obj.constructor, Mixins.Container)) {
  obj.addToInventory(item);
}

// Use ContainmentApi for movement operations
ContainmentApi.move(sword, location, avatar); // pick up
ContainmentApi.move(sword, avatar, location); // drop

// Use MixinApi.getContents() for safe container access
const items = MixinApi.getContents(container);
```

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

## Exceptions

There are valid use cases for checking properties that are NOT antipatterns:

### Display Name/Description Fallbacks

```typescript
// ✅ OK - Graceful degradation for display purposes
function getObjectName(obj: any): string {
  if (typeof obj.fullName === 'string') return obj.fullName;
  if (typeof obj.name === 'string') return obj.name;
  if (typeof obj.shortDescription === 'string') return obj.shortDescription;
  return 'something';
}
```

This is acceptable because:
- It's a display-only helper, not game logic
- Falls back gracefully through multiple properties
- Doesn't assume mixin presence affects behavior
- Used for user-facing text, not system operations

### Rule of Thumb

- **Movement Operations** (pick up, drop, teleport): Use ContainmentApi.move() ✅
- **Locomotion** (walk, run, fly): Use travel() from MobileMixin ✅
- **Container Access** (get contents): Use MixinApi.getContents() ✅
- **Mixin Checks** (does X have Y mixin?): Use MixinApi.hasMixin() ✅
- **Display Text** (getting names/descriptions): Fallback pattern OK ✅

## Summary

**Never call `setEnvironment()` or `addToInventory()` directly - always use `ContainmentApi.move()`.**

**Use the correct abstraction level:**
- `travel()` for creatures/vehicles (high level)
- `ContainmentApi.move()` for all other object movement (mid level)
- `setEnvironment()/addToInventory()` only called by ContainmentApi (low level)

**Duck typing is only acceptable for display-only fallback patterns where the code gracefully degrades if properties don't exist.**
