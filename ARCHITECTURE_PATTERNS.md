# Architecture Patterns

This document defines the architectural patterns and conventions used in Saxonberg 2.0.

## Layer Separation

```
┌─────────────────────────────────────────┐
│ Mudlib Objects (Player, NPC, etc.)     │
│  ↓ (can access directly)                │
│ Mudlib Controllers (future)            │
│  ↓ (always go through)                  │
│ Api Layer (public interface)            │
│  ↓ (may delegate - privileged)          │
│ Managers (singletons with state)        │
└─────────────────────────────────────────┘
```

## Naming Conventions

### Manager (Privileged Singleton)
**Purpose**: Singleton with state and business logic
**Access**: Privileged - should only be accessed by core infrastructure (Application, Backend) and Api layer
**Examples**:
- `PersistenceManager` - MongoDB operations + connection state
- `ConnectionManager` - Interactive tracking + connection lifecycle
- `Backend` - WebSocket connections + I/O operations

**Pattern**:
```typescript
export class XyzManager {
  private static instance: XyzManager;
  private someState: Map<string, SomeType>;

  private constructor() {}

  static get(): XyzManager {
    if (!this.instance) {
      this.instance = new XyzManager();
    }
    return this.instance;
  }

  // Business logic methods
}
```

### Api (Public Static Utility)
**Purpose**: Stateless interface for mudlib code - delegates to Managers
**Access**: Public - safe for mudlib code to access
**Examples**:
- `StuffApi` - Object registry access (has state but acceptable)
- `ConnectionApi` - Connection queries (delegates to ConnectionManager)
- `MixinApi` - Mixin introspection (stateless)
- `PersistApi` - Persistence utilities (stateless)

**Pattern**:
```typescript
export class XyzApi {
  // Public read-only operations
  static getSomething(id: string): SomeType | undefined {
    return XyzManager.get().getSomething(id);
  }

  // Note: destructive operations NOT exposed
  // (createSomething, destroySomething stay in Manager)
}
```

### Controller (Future - Mudlib Level)
**Purpose**: Mudlib-level objects that can be accessed directly by mudlib without going through Api layer
**Access**: Direct access from mudlib
**Examples**: TBD in future phases

### Service (Reserved Term)
**Purpose**: Reserved for content developers to use in area support
**Usage**: Not used in core code - use Manager instead
**Note**: Currently used for network layer (WebSocketService) which predates this convention

## Call Security (Future)

When call security is implemented:
- **Managers** will be privileged - only accessible to core infrastructure and Api layer
- **Api layer** will be public - mudlib code must go through this layer
- **Controllers** will be directly accessible to mudlib

## Access Patterns

### ✅ Correct - Mudlib accesses through Api
```typescript
// In mudlib code
const interactive = ConnectionApi.getInteractive(socketId);
const count = ConnectionApi.getConnectionCount();
```

### ❌ Incorrect - Mudlib accesses Manager directly
```typescript
// In mudlib code - will be blocked by future call security
const interactive = ConnectionManager.get().getInteractive(socketId);
```

### ✅ Correct - Core infrastructure accesses Manager directly
```typescript
// In Application (privileged core infrastructure)
const interactive = ConnectionManager.get().createInteractive(...);
ConnectionManager.get().removeInteractive(socketId);

// Application uses PersistenceManager directly (not through Backend)
const userDoc = await PersistenceManager.get().findById(Collections.Users, userId);
const players = await PersistenceManager.get().find(Collections.Players, { userId });
```

### ✅ Correct - Api delegates to Manager
```typescript
// In ConnectionApi
export class ConnectionApi {
  static getInteractive(socketId: string): Interactive | undefined {
    return ConnectionManager.get().getInteractive(socketId);
  }
}
```

### ❌ Incorrect - Backend delegating to PersistenceManager
```typescript
// OLD - Backend should NOT be a passthrough for database operations
export class Backend implements IBackend {
  async saveDocument(collection: string, document: any): Promise<string> {
    return await PersistenceManager.get().save(collection, document);
  }
}
```

### ✅ Correct - Backend focuses on I/O only
```typescript
// NEW - Backend handles WebSocket I/O, not database
export class Backend implements IBackend {
  sendMessageToSocket(socketId: string, message: unknown): void {
    const ws = this.socketsBySocketId.get(socketId);
    ws.send(JSON.stringify(message));
  }
  // No database methods - privileged code uses PersistenceManager directly
}
```

## Responsibility Matrix

| Component | Responsibility | Has State | Access Level |
|-----------|---------------|-----------|--------------|
| **PersistenceManager** | MongoDB operations | Yes (connection) | Privileged |
| **ConnectionManager** | Interactive tracking | Yes (connections map) | Privileged |
| **Backend** | WebSocket I/O only | Yes (socket connections) | Privileged |
| **Application** | Game coordination | No (delegates to managers) | Privileged |
| **StuffApi** | Object registry | Yes (objects map) | Public |
| **ConnectionApi** | Connection queries | No (delegates to Manager) | Public |
| **MixinApi** | Mixin introspection | No | Public |
| **PersistApi** | Persistence sync | No | Public |

## Avatar and Interactive Separation

**Key Principle**: Interactive handles connection state, Avatar handles player game state.

### Class Hierarchy

```
Stuff (base with stuffId, auto-unregister on destroy)
  └── Idea (abstract base)
       ├── User, Player, GoogleProfile (persistent)
       ├── Interactive (runtime connection)
       └── Agent (abstract - runtime active objects)
            └── Avatar (runtime player presence)
```

**Note**: Avatar extends Agent (not Idea directly) because:
- Agent represents runtime active presences
- Idea can be either persistent OR runtime
- Agent is explicitly runtime-only

**Location**: Avatar lives in `/mud/obj/` (not `/mud/lib/`) because it's an instantiable game object.

### Developer Experience: Object Creation and Lifecycle

Objects are created through StuffApi.create() and destroyed using the protected hook pattern.

#### CMS Template Creation Pattern

**Primary Method**: Use `StuffApi.clone()` to create objects from templates in the 'domain' collection.

**Pattern**: Objects are cloned from templates that define class + initialization data.

See [CMS_TEMPLATE_PATTERN.md](./CMS_TEMPLATE_PATTERN.md) for complete documentation.

```typescript
// ✅ PRIMARY METHOD - Clone from template in 'domain' collection
const avatar = await StuffApi.clone<Avatar>('/avatar/player/abc');
const room = await StuffApi.clone<Room>('/home/bobalu/workroom');

// ✅ FALLBACK - Direct creation with template data (for testing/special cases)
const avatar = StuffApi.create(() => new Avatar({ playerId: "..." }));
await avatar.initialize(); // Must call initialize manually

// ❌ NOT TRACKED - Direct new without registration (avoid in production)
const user = new User(); // Won't be tracked by StuffApi
```

**Constructors accept template data**:
```typescript
interface AvatarTemplateData {
  playerId: string;
}

class Avatar extends Agent {
  playerId: string = '';

  constructor(templateData: AvatarTemplateData) {
    super(); // Generates stuffId
    this.playerId = templateData.playerId;
  }

  async initialize(): Promise<void> {
    // Load Player and sync
    const player = await loadPlayer(this.playerId);
    this.syncFromPlayer(player);
  }
}
```

**The clone flow**:
```typescript
const avatar = await StuffApi.clone<Avatar>('/avatar/player/abc');

// What happens:
// 1. Load template from 'domain' collection
// 2. Validate class path (security check)
// 3. Dynamic import: await import('../obj/Avatar.js')
// 4. Extract Avatar constructor from module
// 5. new Avatar(template.data) - all field initializers run
// 6. Call avatar.initialize() - loads Player, syncs
// 7. StuffApi.register(avatar) → ALWAYS happens
// 8. Return avatar
```

**Benefits**:
- ✅ Templates in database (CMS integration ready)
- ✅ Registration in ONE place (StuffApi.clone)
- ✅ Async initialization supported (initialize method)
- ✅ Constructors accept template data (consistent pattern)
- ✅ Dynamic imports (no registration boilerplate)
- ✅ Secure path validation (prevents code injection)

#### Protected Destruction Pattern

**Critical**: `Stuff.destroy()` is FINAL - never override it. Use `prepareDestroy()` hook instead.

**Why**: The destroy() method performs critical housekeeping for garbage collection:
1. Calls prepareDestroy() for cleanup
2. Marks object as destroyed
3. Unregisters from StuffApi (ESSENTIAL for GC)

If subclasses could override destroy(), they might forget step 3, causing memory leaks.

```typescript
// ✅ CORRECT - Override prepareDestroy() for cleanup
class Avatar extends Agent {
  protected prepareDestroy(): void {
    // Your cleanup logic here
    if (this.interactive) {
      this.unlinkInteractive();
    }
    // NO super.prepareDestroy() needed unless parent has logic
  }
}

// ❌ WRONG - Never override destroy()
class Avatar extends Agent {
  public destroy(): void {  // DON'T DO THIS
    this.unlinkInteractive();
    super.destroy(); // Even with super.destroy(), don't override
  }
}
```

**The destruction flow**:
```typescript
avatar.destroy(); // Public API

// Inside Stuff.destroy() (FINAL):
// 1. Check if already destroyed → return early
// 2. Call this.prepareDestroy() → Avatar cleanup runs
// 3. Set _isDestroyed = true
// 4. Call StuffApi.unregister(this) → ALWAYS happens
```

**Registration is still manual** (in constructor) to ensure full object initialization:

```typescript
constructor() {
  super();
  this.myProperty = 'value';
  StuffApi.register(this); // Register after full construction
}
```

**Benefits**:
- ✅ Impossible to forget unregistration
- ✅ Destruction order always correct (cleanup → mark → unregister)
- ✅ Protected against double-destroy
- ✅ Clear extension point (prepareDestroy)

### Architecture
```
WebSocket Connection
    ↓
Interactive (connection state)
    - socketId, sessionId
    - connectedAt
    - avatar reference
    ↕ (bidirectional link)
Avatar (player game state)
    - userId, playerId
    - player reference (persistent)
    - firstName, lastName, pronouns (from mixins)
    - interactive reference
    ↕ (sync methods)
Player (persistent in MongoDB)
    - _id, userId
    - firstName, lastName, pronouns
    - createdAt, updatedAt
```

### Responsibilities

**Interactive** (Connection State):
- Track WebSocket connection (socketId, sessionId)
- Connection lifecycle (connectedAt, destroy)
- Link to Avatar

**Avatar** (Runtime Player Presence):
- Hold user/player identity (userId, playerId)
- Runtime game state (firstName, lastName, pronouns via mixins)
- Sync with persistent Player (syncToPlayer, syncFromPlayer)
- Link to Interactive

**Player** (Persistent):
- MongoDB document in 'players' collection
- Permanent character data
- Saved/loaded via PersistenceManager

### Connection Lifecycle

```typescript
// 1. User authenticates, WebSocket connects
Backend.handleWebSocketConnect(ws, userId, sessionId);

// 2. Create Interactive (connection only)
const interactive = ConnectionManager.get().createInteractive(socketId, sessionId);

// 3. Load Player from database
const playerDoc = await PersistenceManager.get().findById(Collections.Players, playerId);
const player = new Player();
// ... populate player from playerDoc

// 4. Create Avatar (runtime presence)
const avatar = new Avatar(userId, playerId);

// 5. Sync Avatar from Player
avatar.syncFromPlayer(player);

// 6. Link Avatar ↔ Interactive (bidirectional)
avatar.setInteractive(interactive);
interactive.linkAvatar(avatar);

// 7. Avatar is now in the game world
// Interactive tracks the connection
// Avatar tracks the player state
// Player is the persistent data
```

### Synchronization

```typescript
// Modify avatar during gameplay
avatar.firstName = "NewName";

// Sync changes to persistent Player
avatar.syncToPlayer(); // Copies mixin fields to player

// Save Player to database
await PersistenceManager.get().save(Collections.Players, {
  _id: player._id,
  ...player,
});
```

## Examples from Phase 1

### ConnectionManager + ConnectionApi Refactor

**Before** (Application doing too much):
```typescript
class Application {
  private interactivesBySocketId: Map<string, Interactive>;

  handleUserConnect() {
    const interactive = new Interactive(...);
    this.interactivesBySocketId.set(socketId, interactive);
  }

  // Redundant delegation methods
  getInteractive(socketId) { return this.interactivesBySocketId.get(socketId); }
  getConnectionCount() { return this.interactivesBySocketId.size; }
}
```

**After** (Clean separation):
```typescript
// Manager (privileged)
class ConnectionManager {
  private interactivesBySocketId: Map<string, Interactive>;

  createInteractive(...): Interactive { ... }
  removeInteractive(socketId: string): boolean { ... }
  getInteractive(socketId: string): Interactive | undefined { ... }
}

// Api (public)
class ConnectionApi {
  static getInteractive(socketId: string): Interactive | undefined {
    return ConnectionManager.get().getInteractive(socketId);
  }
  // Note: create/remove NOT exposed - privileged operations
}

// Application (coordinator) - NO delegation methods
class Application {
  handleUserConnect() {
    const interactive = ConnectionManager.get().createInteractive(...);
    // rest of logic
  }
  // Application no longer has getInteractive/getConnectionCount
  // Use ConnectionApi directly instead
}

// Server stats endpoint uses Api directly
app.get('/stats', (req, res) => {
  res.json({
    connections: ConnectionApi.getConnectionCount(), // Uses Api, not Application
    objects: StuffApi.getObjectCount(),
  });
});
```

## Key Principles

1. **Manager = State + Business Logic** (privileged)
2. **Api = Public Interface** (safe, read-only operations)
3. **Separation of Concerns** (each class has one clear responsibility)
4. **Explicit Privilege** (mudlib must use Api, not Manager directly)
5. **No Unnecessary Delegation** (privileged code accesses Managers directly)
6. **Backend = I/O Only** (WebSocket operations, not database passthrough)
7. **Future-Proof** (ready for call security framework)

## Player API

Player-specific operations are in `PlayerApi`, separate from `StuffApi`:

```typescript
import { PlayerApi } from './mud/api/player.js';

// Find avatar by playerId
const avatar = PlayerApi.findAvatarByPlayerId(playerId);

// Get all active avatars
const avatars = PlayerApi.getAllAvatars();

// Get avatar count
const count = PlayerApi.getAvatarCount();
```

**Why separate from StuffApi?**
- Domain-specific functionality (not general object management)
- Specialized index (avatarsByPlayerId)
- Keeps StuffApi focused on general object registry

**Registration**:
- `PlayerApi.registerAvatar()` called in `Avatar.initialize()`
- `PlayerApi.unregisterAvatar()` called in `Avatar.prepareDestroy()`

## Mixin Constants

Always use the `Mixins` constants object when checking for mixins:

```typescript
import { MixinApi, Mixins } from './mud/api/mixin.js';

// ✅ Correct - Use constants
if (MixinApi.hasMixin(Player, Mixins.Named)) {
  console.log('Player has NamedMixin');
}

// ❌ Incorrect - Don't use string literals
if (MixinApi.hasMixin(Player, 'NamedMixin')) {
  // Prone to typos and refactoring errors
}
```

**Available Mixins**:
- `Mixins.Named` - Provides firstName, lastName, fullName
- `Mixins.Gendered` - Provides pronouns

**Adding New Mixins**:
1. Create the mixin function (e.g., `ContainerMixin`)
2. Ensure returned class is named to match the constant (e.g., `class ContainerMixin extends Base`)
3. Add to `Mixins` constants in `mixins/types.ts`:
   ```typescript
   export const Mixins = {
     Named: 'NamedMixin',
     Gendered: 'GenderedMixin',
     Container: 'ContainerMixin', // Add new mixin
   } as const;
   ```

## When to Create a New Manager vs Api

**Create a Manager when**:
- You need a singleton with state
- You have business logic that modifies state
- Access should be restricted to core infrastructure

**Create an Api when**:
- You need a public interface for mudlib code
- Operations are read-only or safe queries
- You're wrapping a Manager for mudlib access

**Create both when**:
- You have privileged state/operations (Manager)
- AND you need safe mudlib access (Api wraps Manager)
