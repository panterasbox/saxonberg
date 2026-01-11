# Object Creation and Lifecycle Pattern

This document explains the creation and lifecycle patterns used in Saxonberg to ensure objects are properly tracked and cleaned up.

## The Problem

Game objects require critical housekeeping at both creation and destruction:

**On Creation**: Must register with StuffApi for tracking
**On Destruction**: Must unregister from StuffApi for garbage collection

If developers forget either step, the system breaks:
- Forgot registration → Object not tracked, can't be found via StuffApi
- Forgot unregistration → Memory leak, objects never collected

## The Solution: API-Layer Creation + Protected Destruction

### Factory Pattern for Creation

**Pattern**: Registration happens in StuffApi.create(), not in constructors.

```typescript
// StuffApi.create() - Ensures registration
export class StuffApi {
  public static create<T extends Stuff>(factory: () => T): T {
    const obj = factory();
    this.register(obj);  // ALWAYS happens
    return obj;
  }
}

// Usage - Pass a factory function
const user = StuffApi.create(() => new User());
const player = StuffApi.create(() => new Player('Alice', 'Smith', Pronouns.She));
const avatar = StuffApi.create(() => new Avatar(userId, playerId));
```

**Benefits**:
- ✅ Registration happens in ONE place (StuffApi)
- ✅ Can't override or bypass registration logic
- ✅ Clear API for object creation
- ✅ Constructors stay simple (just field initialization)

### Protected Destruction

```typescript
// Stuff.destroy() - FINAL
public destroy(): void {
  if (this._isDestroyed) return;

  // Step 1: Subclass cleanup
  this.prepareDestroy();

  // Step 2: Mark destroyed
  this._isDestroyed = true;

  // Step 3: Critical housekeeping - ALWAYS happens
  StuffApi.unregister(this);
}

// Hook for subclasses
protected prepareDestroy(): void {
  // Override this for cleanup
}
```

## Developer Experience

### Simple Classes

```typescript
// Define the class
class User extends Persistent {
  googleProfileId: string = '';
  playerIds: string[] = [];

  constructor() {
    super(); // Just generates stuffId
  }
}

// Create instances using StuffApi
const user = StuffApi.create(() => new User());
// user is automatically registered and tracked
```

### Classes with Constructor Parameters

```typescript
// Define the class
class Avatar extends Agent {
  userId: string;
  playerId: string;

  constructor(userId: string, playerId: string) {
    super(); // Just generates stuffId
    this.userId = userId;
    this.playerId = playerId;
  }
}

// Create instances using StuffApi
const avatar = StuffApi.create(() => new Avatar(userId, playerId));
// avatar is automatically registered
```

### Classes with Complex Initialization

```typescript
// Define the class
class Player extends PersistentBase {
  constructor(firstName?: string, lastName?: string, pronouns?: Pronouns) {
    super();
    if (firstName) this.firstName = firstName;
    if (lastName) this.lastName = lastName;
    if (pronouns) this.pronouns = pronouns;
  }
}

// Create instances using StuffApi with initialization
const player = StuffApi.create(() => {
  const p = new Player();
  p._id = playerDoc._id;
  p.userId = playerDoc.userId;
  p.firstName = playerDoc.firstName;
  p.lastName = playerDoc.lastName;
  p.pronouns = playerDoc.pronouns;
  return p;
});
// player is automatically registered after full initialization
```

### Classes with Complex Cleanup

```typescript
// If you need cleanup logic:
class Interactive extends Idea {
  protected prepareDestroy(): void {
    // Runs before unregistration
    if (this.avatar) {
      this.unlinkAvatar();
    }
  }
}
```

## Construction and Registration Flow

Understanding how object creation works:

```typescript
class Player extends PersistentBase {
  userId: string = '';  // Field initializer
  firstName: string;    // From mixin

  constructor() {
    super();
  }
}

// Create using StuffApi
const player = StuffApi.create(() => new Player());
```

**What happens**:

1. **Field initializers run** (all classes in hierarchy)
   - `userId = ''` ← executes
   - `firstName = ''` ← from mixin, executes
   - `stuffId` not yet set

2. **Stuff.constructor() runs**
   - Generates `stuffId` using nanoid()
   - That's it! No registration in constructor

3. **Subclass constructor body runs**
   - Just `super()` call (empty body)

4. **Factory function returns**
   - Object is fully constructed

5. **StuffApi.create() registers the object**
   - Calls `StuffApi.register(obj)` → **ALWAYS happens**
   - Adds to objectsById registry
   - Adds to specialized registries (e.g., avatarsByPlayerId)

**Key Point**: Registration happens AFTER construction completes, in the API layer.

## Why Not Make Constructors Private/Protected?

We considered several alternatives:

### Option 1: Private constructors with static create()
```typescript
class User extends Persistent {
  private constructor() { ... }

  static create(): User {
    const user = new User();
    StuffApi.register(user);
    return user;
  }
}
```
**Rejected because**:
- ❌ Boilerplate in every class (every class needs create())
- ❌ Doesn't scale (different constructor signatures)
- ❌ Breaks inheritance (subclasses can't call super())

### Option 2: Protected constructors (force API usage)
```typescript
class User extends Persistent {
  protected constructor() { ... }
}
```
**Rejected because**:
- ❌ Can't enforce it (subclasses can still instantiate)
- ❌ No "friend class" in TypeScript (StuffApi can't access)
- ❌ Awkward for inheritance chains

### What We Chose: Public constructors + API convention

```typescript
// Normal constructors (familiar pattern)
class User extends Persistent {
  constructor() { super(); }
}

// Creation through API layer (documented convention)
const user = StuffApi.create(() => new User());
```

**Benefits**:
- ✅ Normal constructors (familiar OOP)
- ✅ Works with inheritance and mixins
- ✅ No per-class boilerplate
- ✅ Registration in ONE place (StuffApi)
- ✅ Clear API convention (StuffApi.create)
- ✅ Still allows direct `new` for testing/special cases

**Trade-off**: Can't prevent direct `new` calls, but:
- Documented convention is clear
- Direct `new` has valid use cases (testing, temporary objects)
- Runtime tracking via StuffApi catches unregistered objects

## Comparison with Other Patterns

### Factory Pattern
```typescript
// Factory Pattern
const user = User.create(data);

// Our Pattern
const user = new User();
```
✅ Ours: Normal OOP
❌ Factory: Extra method every class

### Decorator Pattern
```typescript
// Decorator Pattern (if TS decorators worked well)
@Registered
class User extends Persistent { }

// Our Pattern
class User extends Persistent {
  constructor() { super(); }
}
```
✅ Ours: Works today, no build config
❌ Decorator: Experimental, build complexity

### Proxy Pattern
```typescript
// Proxy Pattern
const user = makeStuff(new User());

// Our Pattern
const user = new User();
```
✅ Ours: Direct construction
❌ Proxy: Wrapper required, complex

## Benefits Summary

**For Developers**:
- ✅ No manual `StuffApi.register(this)` calls
- ✅ No manual `StuffApi.unregister(this)` calls
- ✅ Can't forget critical housekeeping
- ✅ Normal constructor pattern
- ✅ Clear extension points

**For the System**:
- ✅ All objects properly registered
- ✅ All objects properly unregistered
- ✅ No memory leaks from forgotten cleanup
- ✅ Consistent behavior across all objects
- ✅ Object tracking guaranteed to work

**For Maintainability**:
- ✅ Single place for housekeeping logic (Stuff.ts)
- ✅ Impossible to break by accident
- ✅ Easy to add new housekeeping steps (just update Stuff)
- ✅ Self-documenting (FINAL pattern)

## Real-World Impact

### Before (Manual Registration)
- User.ts: Manual registration (7 lines boilerplate)
- Player.ts: Manual registration (7 lines boilerplate)
- GoogleProfile.ts: Manual registration (7 lines boilerplate)
- Avatar.ts: Manual registration (7 lines boilerplate)
- Interactive.ts: Manual registration (7 lines boilerplate)

**Total**: 35 lines of boilerplate across 5 classes

**Risk**: If any of the 5 classes forgets registration/unregistration, system breaks

### After (Automatic Registration)
- User.ts: `super()` (auto-registers)
- Player.ts: `super()` (auto-registers)
- GoogleProfile.ts: `super()` (auto-registers)
- Avatar.ts: `super()` (auto-registers)
- Interactive.ts: `super()` (auto-registers)

**Total**: 0 lines of boilerplate

**Risk**: Zero - impossible to forget

## Adding New Classes

To create a new Stuff-based class:

```typescript
// Simple class
class Location extends Persistent {
  static collectionName = 'locations';
  static persistentFields = ['name'];

  name: string = '';

  constructor() {
    super(); // That's it! Auto-registers.
  }
}

// Class with parameters
class Item extends Persistent {
  static collectionName = 'items';
  static persistentFields = ['name', 'weight'];

  name: string = '';
  weight: number = 0;

  constructor(name: string, weight: number) {
    super(); // Auto-registers
    this.name = name;
    this.weight = weight;
  }
}

// Class with cleanup
class Connection extends Idea {
  socket: WebSocket;

  constructor(socket: WebSocket) {
    super(); // Auto-registers
    this.socket = socket;
  }

  protected prepareDestroy(): void {
    // Cleanup before unregistration
    this.socket.close();
  }
}
```

## Summary

The creation and lifecycle pattern ensures objects are properly tracked and cleaned up:

**Creation Pattern**: API-layer factory (StuffApi.create)
**Destruction Pattern**: Protected hook (prepareDestroy)

**Benefits**:
1. Registration happens in ONE place (StuffApi.create)
2. Can't override or bypass registration logic
3. Impossible to forget unregistration (automatic in destroy())
4. No boilerplate in subclasses
5. Clear extension point for cleanup (prepareDestroy)
6. Normal OOP constructors (no forced factory pattern)

**Developer Experience**:
- Create: `StuffApi.create(() => new MyClass())`
- Cleanup: Override `prepareDestroy()` if needed
- Destroy: Just call `destroy()` - unregistration is automatic
