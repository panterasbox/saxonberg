# Persistent Pattern - Generic CRUD Operations

This document explains the `Persistent` base class pattern that eliminates boilerplate CRUD code from persistent objects.

## The Problem

Before the `Persistent` base class, every persistent object had to implement identical CRUD methods:

```typescript
// OLD - 120+ lines of boilerplate per class
export class User extends Idea {
  _id?: string;
  googleProfileId: string = '';
  playerIds: string[] = [];
  createdAt: Date;
  updatedAt: Date;

  static persistentFields = ['googleProfileId', 'playerIds', 'createdAt', 'updatedAt'];

  constructor() {
    super();
    this.createdAt = new Date();
    this.updatedAt = new Date();
    StuffApi.register(this);
  }

  // Boilerplate CRUD methods (identical in every persistent class)
  public async save(): Promise<void> {
    this.updatedAt = new Date();
    // Convert to document
    const doc = {
      _id: this._id,
      googleProfileId: this.googleProfileId,
      playerIds: this.playerIds,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
    const savedId = await PersistenceManager.get().save('users', doc);
    if (!this._id) this._id = savedId;
  }

  public async delete(): Promise<void> {
    if (!this._id) throw new Error('Cannot delete unsaved object');
    await PersistenceManager.get().delete('users', this._id);
    this.destroy();
  }

  public static async findById(id: string): Promise<User | null> {
    const doc = await PersistenceManager.get().findById('users', id);
    if (!doc) return null;
    // Manually create instance and populate
    const instance = new User();
    instance._id = doc._id;
    instance.googleProfileId = doc.googleProfileId;
    instance.playerIds = doc.playerIds;
    instance.createdAt = doc.createdAt;
    instance.updatedAt = doc.updatedAt;
    return instance;
  }

  public static async find(query: Record<string, unknown>): Promise<User[]> {
    const docs = await PersistenceManager.get().find('users', query);
    return docs.map(doc => {
      const instance = new User();
      // Manually populate each field...
      return instance;
    });
  }

  public destroy(): void {
    StuffApi.unregister(this);
    super.destroy();
  }
}
```

**Problems**:
- ❌ Identical code in User, Player, GoogleProfile, etc.
- ❌ Easy to forget fields when converting to/from documents
- ❌ Manual timestamp management
- ❌ Manual field population in findById/find
- ❌ 80+ lines of boilerplate per class

## The Solution: Persistent Base Class

```typescript
// NEW - 40 lines, zero boilerplate
export class User extends Persistent {
  static collectionName = 'users';
  static persistentFields = ['googleProfileId', 'playerIds'];

  googleProfileId: string = '';
  playerIds: string[] = [];

  constructor() {
    super();
    StuffApi.register(this);
  }
}

// Usage is the same:
await user.save();
await user.delete();
const found = await User.findById(id);
const results = await User.find({ googleProfileId: 'xyz' });
```

**Benefits**:
- ✅ CRUD operations inherited from `Persistent`
- ✅ Automatic field collection (via `persistentFields` + mixins)
- ✅ Automatic timestamp management
- ✅ Automatic document conversion
- ✅ 66% less code per class
- ✅ Consistent behavior across all persistent objects

## How It Works

### Class Declaration

Every persistent class must declare:

```typescript
class MyPersistentClass extends Persistent {
  // 1. Collection name (REQUIRED)
  static collectionName = 'my_collection';

  // 2. Persistent fields (REQUIRED - only class fields, not mixin fields)
  static persistentFields = ['myField', 'anotherField'];

  // 3. Properties
  myField: string = '';
  anotherField: number = 0;

  // 4. Constructor
  constructor() {
    super(); // Initializes timestamps
    StuffApi.register(this);
  }
}
```

### Inherited Methods

`Persistent` provides these methods automatically:

#### Instance Methods

**save()** - Save to database
```typescript
await myObject.save();
// - Updates updatedAt timestamp
// - Converts to document using toDocument()
// - Saves via PersistenceManager
// - Sets _id if new object
```

**delete()** - Delete from database
```typescript
await myObject.delete();
// - Checks for _id (throws if unsaved)
// - Deletes via PersistenceManager
// - Calls destroy() to clean up
```

#### Static Methods

**findById(id)** - Find by MongoDB _id
```typescript
const user = await User.findById('507f1f77bcf86cd799439011');
// - Queries PersistenceManager
// - Creates instance
// - Populates via fromDocument()
// - Returns null if not found
```

**find(query)** - Find by query
```typescript
const users = await User.find({ googleProfileId: 'xyz' });
// - Queries PersistenceManager
// - Creates instances for all results
// - Populates via fromDocument()
// - Returns empty array if none found
```

### Document Conversion

`Persistent` handles conversion to/from MongoDB documents:

**toDocument()** - Object → MongoDB document
```typescript
protected toDocument(): Record<string, any> {
  // 1. Include _id if present
  // 2. Include all fields from persistentFields
  // 3. Include all fields from mixins (via getAllFields())
  // 4. Include timestamps
  return { _id, ...fields, createdAt, updatedAt };
}
```

**fromDocument(doc)** - MongoDB document → Object
```typescript
protected fromDocument(doc: Record<string, any>): void {
  // 1. Load _id
  // 2. Load all fields from persistentFields
  // 3. Load all fields from mixins (via getAllFields())
  // 4. Load timestamps
}
```

### Mixin Integration

For classes with mixins (like Player), `Persistent` automatically collects mixin fields:

```typescript
const PlayerBase = GenderedMixin(NamedMixin(PersistentBase));

class Player extends PlayerBase {
  static collectionName = 'players';
  static persistentFields = ['userId']; // Only class field

  userId: string = '';

  // Mixin fields (firstName, lastName, pronouns) are auto-collected
  static getAllPersistentFields(): string[] {
    return MixinApi.getAllPersistentFields(this);
    // Returns: ['firstName', 'lastName', 'pronouns', 'userId']
  }
}
```

### Timestamps

`Persistent` manages timestamps automatically:

- **createdAt**: Set in constructor, never changes
- **updatedAt**: Set in constructor, updated on every save()

Both are automatically included in save/load operations (even if not in `persistentFields`).

## Before/After Comparison

### User Class

**Before**: 119 lines
```typescript
export class User extends Idea {
  _id?: string;
  googleProfileId: string = '';
  playerIds: string[] = [];
  createdAt: Date;
  updatedAt: Date;

  static persistentFields = ['googleProfileId', 'playerIds', 'createdAt', 'updatedAt'];

  constructor() {
    super();
    this.createdAt = new Date();
    this.updatedAt = new Date();
    StuffApi.register(this);
  }

  public async save(): Promise<void> { /* 10 lines */ }
  public async delete(): Promise<void> { /* 5 lines */ }
  public static async findById(id: string): Promise<User | null> { /* 15 lines */ }
  public static async find(query: Record<string, unknown>): Promise<User[]> { /* 15 lines */ }
  public destroy(): void { /* 3 lines */ }
  public toString(): string { /* 1 line */ }
}
```

**After**: 36 lines (70% reduction)
```typescript
export class User extends Persistent {
  static collectionName = 'users';
  static persistentFields = ['googleProfileId', 'playerIds'];

  googleProfileId: string = '';
  playerIds: string[] = [];

  constructor() {
    super();
    StuffApi.register(this);
  }
}
```

### Player Class

**Before**: 132 lines
**After**: 56 lines (58% reduction)

### GoogleProfile Class

**Before**: 165 lines
**After**: 87 lines (47% reduction, includes custom findByGoogleId method)

## Adding New Persistent Classes

To create a new persistent class:

1. Extend `Persistent` (or `PersistentBase` if using mixins)
2. Declare `static collectionName`
3. Declare `static persistentFields` (class fields only)
4. Add properties
5. Add constructor that calls `super()` and registers

```typescript
// Simple persistent class
export class Location extends Persistent {
  static collectionName = 'locations';
  static persistentFields = ['name', 'description', 'exits'];

  name: string = '';
  description: string = '';
  exits: string[] = [];

  constructor() {
    super();
    StuffApi.register(this);
  }

  // Custom methods if needed
  public addExit(exit: string): void {
    this.exits.push(exit);
  }
}

// With mixins
const RoomBase = DescribedMixin(NamedMixin(PersistentBase));

export class Room extends RoomBase {
  static collectionName = 'rooms';
  static persistentFields = ['areaId', 'coordinates'];

  areaId: string = '';
  coordinates: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };

  constructor() {
    super();
    StuffApi.register(this);
  }

  static getAllPersistentFields(): string[] {
    return MixinApi.getAllPersistentFields(this);
  }
}
```

## Key Design Decisions

### Why Not Decorators?

We considered using TypeScript decorators for persistence, but chose the base class approach because:
- ✅ Simpler - no build configuration needed
- ✅ More explicit - inheritance is clear
- ✅ Better TypeScript support - decorators have issues with strict mode
- ✅ Easier to debug - standard inheritance chain

### Why Static collectionName?

Each class declares its collection name to:
- Avoid passing collection names to methods (error-prone)
- Make collection names discoverable via class definition
- Enable type-safe CRUD operations

### Why Separate persistentFields?

While we could scan all properties, we require explicit declaration because:
- Not all properties should persist (e.g., computed properties)
- Explicit is better than implicit
- Prevents accidental data leaks
- Documents the persistence contract

### Why Not Auto-Register?

Registration is still manual (in constructor) to:
- Ensure full object initialization before registration
- Allow subclasses to initialize their fields first
- Prevent registration of partially-constructed objects

## Advanced: Custom Persistence Handlers

For complex types (references, nested objects), you can define handlers:

```typescript
export class Room extends Persistent {
  static collectionName = 'rooms';
  static persistentFields = ['areaId', 'inventoryIds'];

  areaId: string = '';
  inventory: Item[] = []; // Complex type

  // Handler for complex field
  static persistenceHandlers = {
    inventory: {
      // Convert Item[] to string[] for storage
      to: (items: Item[]) => items.map(item => item._id),
      // Convert string[] to Item[] on load
      from: async (ids: string[]) => {
        return await Promise.all(ids.map(id => Item.findById(id)));
      }
    }
  };

  // In persistentFields, use 'inventoryIds' not 'inventory'
  static persistentFields = ['areaId', 'inventoryIds'];
}
```

## Related: PropertiedMixin.maskProp() — Breaking Change

`PropertiedMixin` exposes a controlled property bag whose slots can be
"masked" (shadowed with a computed value). The mask signature changed:

```typescript
// BEFORE — owner was optional; defaulted to the mask function itself.
obj.maskProp('hp', () => computed, /* owner? */);

// AFTER — owner is REQUIRED and typed `Stuff`.
obj.maskProp('hp', () => computed, this /* must be a Stuff */);
```

**Why**: The mask owner is how the engine answers "who gets to remove
this mask?" Making it a function was never meaningful — ownership is a
Stuff identity, not a closure. Once the call-security framework lands,
`owner` will default to the nearest `Stuff` on the call stack and this
parameter will become implicit again.

**Migration**: every existing `maskProp()` call must now pass an owning
`Stuff`. `unmaskProp(prop, owner)` only removes masks belonging to that
owner (returns `false` if none match) — a caller cannot remove another
owner's mask by accident. This is a compile-time breaking change for
`maskProp()`: the type system will flag every call site.

## Testing

The `Persistent` base class is tested via the concrete implementations (User, Player, GoogleProfile). All CRUD operations work as expected.

## Summary

**The Persistent Pattern**:
- ✅ Eliminates 60-70% of boilerplate code
- ✅ Consistent CRUD behavior across all persistent objects
- ✅ Automatic field collection (including mixins)
- ✅ Automatic timestamp management
- ✅ Type-safe static methods
- ✅ Easy to extend with custom methods
- ✅ Simple to add new persistent classes

**Developer Experience**:
- Just declare `collectionName` and `persistentFields`
- Get save/delete/findById/find for free
- Focus on domain logic, not persistence plumbing
