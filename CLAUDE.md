# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Saxonberg 2.0 project - an immersive multiplayer role-playing educational platform. This repository will contain the new implementation, incorporating architectural concepts and lessons learned from previous development efforts.

## Development Commands

The project uses the following commands for development:

### Package Management
```bash
pnpm install          # Install all dependencies
pnpm install:all      # Monorepo-specific install
```

### Development
```bash
pnpm dev              # Run both client and server concurrently
pnpm dev:server       # Run server only (cd packages/server && pnpm dev)
pnpm dev:client       # Run client only (cd packages/client && pnpm dev)
```

### Building
```bash
pnpm build            # Build all packages (pnpm -r build)
```

### Server Development
```bash
cd packages/server
pnpm dev              # Development mode with tsx watch (tsx watch src/index.ts)
pnpm build            # TypeScript compilation (tsc -b)
pnpm start            # Production mode (node dist/index.js)
pnpm clean            # Clean build artifacts
```

### Client Development
```bash
cd packages/client
pnpm dev              # Start Vite dev server
pnpm build            # Build for production (tsc && vite build)
pnpm preview          # Preview production build
pnpm clean            # Clean build artifacts
```

### Code Quality
```bash
pnpm lint             # Run ESLint across all packages
pnpm format           # Format code with Prettier
```

### Testing
```bash
pnpm test             # Run all tests across all packages
cd packages/server && pnpm test  # Run server tests only
cd packages/client && pnpm test  # Run client tests only
```

**Test Framework**: Vitest

**Test Coverage Areas**:
- StuffApi: Class path validation (security), object creation lifecycle, registration
- PlayerApi: Avatar registry operations, lookups, edge cases
- Avatar: Template path construction, multiplexing support, Character inheritance
- Interactive: Character switching, multiplexing integration, lifecycle
- User: Persistent fields configuration, relationship verification
- Mixins: All mixins tested (Mortal, Container, Containable, Visible, Named, Gendered)
- Character: Abstract base class, mixin composition
- Integration tests for core flows (future)

### Documentation
```bash
pnpm docs:all         # Generate all API documentation
pnpm docs:client      # Generate client docs only
pnpm docs:server      # Generate server docs only
pnpm docs:types       # Generate types docs only
pnpm docs:clean       # Clean documentation directory
```

## Architecture Overview

### High-Level Architecture

The system follows a **client-server architecture** with three-layer server design:

1. **Services Layer** - Low-level concerns (WebSocket, Auth, HTTP)
2. **Backend/Application Layer** - Core game logic and state management
3. **Mudlib Layer** - Game object definitions and domain logic

```
Client (React) ←→ WebSocket ←→ Backend ←→ Application ←→ Mudlib
                      ↓                        ↓
                  Raw I/O              Game Logic/State
```

### Server Architecture Layers

#### Services Layer (`packages/server/src/services/`)
- **WebSocketService**: Manages WebSocket connections, authentication integration
- **AuthService**: Passport configuration, Google OAuth2 integration
- **Server**: Entry point that coordinates all services

#### Backend Layer (`packages/server/src/backend/`)
- **Backend**: Thin bridge layer between network I/O and Application
  - Manages raw WebSocket connections by `socketId`
  - Translates network events into Application method calls
  - Implements `IBackend` interface for Application callbacks
  - Delegates to PersistenceManager for database operations

- **Application**: Core MUD instance with all game logic
  - Manages game object state (User, Player, Avatar, Interactive)
  - Maps `socketId` to `Interactive` objects
  - Handles user connection/disconnection lifecycle
  - Processes game commands and messages
  - Intended to run within isolated-vm for security

- **PersistenceManager**: Singleton managing MongoDB CRUD operations
- **ApplicationInstance**: Singleton providing Application access to API layer

#### Mudlib Layer (`packages/server/src/mud/`)
- **API Layer** (`api/`): Static utility classes
  - `StuffApi`: Object registry, ID generation, template cloning with dynamic imports
  - `PlayerApi`: Avatar registry and player-specific lookups
  - `MixinApi`: Mixin registration, querying, composition
  - `PersistApi`: CRUD operations, synchronization utilities

- **Standard Model** (`lib/`): Object-oriented class hierarchy
  ```
  Stuff (base with runtime ID)
    └── Idea (abstract base)
         ├── User (account with googleProfile reference)
         ├── Player (character with name, gender, hp/maxHp, persistent)
         ├── Interactive (runtime connection state, character switching)
         ├── GoogleProfile (OAuth data)
         ├── Location (future)
         └── Agent (runtime-only base)
              └── Character (abstract sentient being)
                   └── Avatar (runtime player character)
  ```

- **Game Objects** (`obj/`): Instantiable entities like Avatar

### Key Architectural Patterns

#### 1. Composition via Mixins
Uses higher-order functions for behavior composition:
```typescript
const PlayerBase = GenderedMixin(NamedMixin(Idea));
class Player extends PlayerBase { ... }

const CharacterBase = VocalMixin(SensorMixin(MortalMixin(GenderedMixin(NamedMixin(Agent)))));
class Character extends CharacterBase { ... }
```

**Available Mixins**:
- `NamedMixin`: firstName, lastName, fullName (persistent)
- `GenderedMixin`: pronouns (he/she/they/etc.) (persistent)
- `MortalMixin`: hp, maxHp, isDead(), takeDamage(), heal() (persistent)
- `ContainerMixin`: inventory management (Set-based, complex persistence)
- `ContainableMixin`: environment reference (complex persistence)
- `VisibleMixin`: shortDescription, longDescription (persistent)
- `SensorMixin`: onMessage() - message receiving (stub for Phase 3)
- `VocalMixin`: say() - message sending (stub for Phase 3)

#### 2. Runtime vs Persistent Objects
- **Runtime Objects**: Avatar, Interactive (exist only during active connection)
- **Persistent Objects**: User, Player, GoogleProfile (stored in MongoDB)
- **Synchronization**: Avatar ↔ Player via `syncToPlayer()` / `syncFromPlayer()`

#### 3. Bidirectional Links & Multiplexing
Avatar and Interactive maintain mutual references with multiplexing support:
```typescript
// Modern API (multiplexing-aware)
avatar.addInteractive(interactive);      // Avatar → Set<Interactive>
interactive.switchAvatar(playerId);      // Interactive → Avatar

// Legacy API (backward compatibility)
avatar.setInteractive(interactive);      // Adds to Set
interactive.linkAvatar(avatar);          // Sets currentAvatar
```

**Multiplexing Features**:
- Multiple Interactives can connect to same Avatar (same user, multiple devices)
- Avatar tracks `Set<Interactive>` and broadcasts messages to all
- Interactive can switch between multiple Avatars (character selection)
- Auto-saves to Player when last connection drops

#### 4. Identifiers
- **Runtime IDs**: nanoid/base58-encoded UUID for in-memory Stuff objects
- **Persistent IDs**: MongoDB ObjectId for database documents

#### 5. Interface-Based Decoupling
`IBackend` interface allows Application to remain agnostic of Backend implementation:
```typescript
interface IBackend {
  sendMessageToSocket(socketId: string, message: unknown): void;
  saveDocument(...): Promise<string>;
  // etc.
}
```

#### 6. CMS Template Pattern
Objects are created by cloning templates stored in the `domain` MongoDB collection:

```typescript
// PRIMARY: Clone from CMS template
const avatar = await StuffApi.clone<Avatar>('/avatar/player/abc123');

// What happens:
// 1. Load template from 'domain' collection by path
// 2. Validate class path (security: must be /obj/ or /lib/, no ..)
// 3. Dynamic import: await import('../obj/Avatar.js')
// 4. Construct: new Avatar(template.data)
// 5. Initialize: await avatar.initialize() (if method exists)
// 6. Register: StuffApi.register(avatar)
// 7. Return fully initialized object

// FALLBACK: Direct creation (testing/special cases)
const obj = await StuffApi.create(() => new SomeClass());
```

**Template Structure** (in `domain` collection):
```typescript
{
  path: "/avatar/player/abc123",  // Unique template identifier
  class: "/obj/Avatar",            // Class path (relative to /mud/)
  data: {                          // Template initialization data
    playerId: "507f1f77..."        // Passed to constructor
  }
}
```

**Avatar Template Convention**:
- Path pattern: `/avatar/player/<playerId>`
- Helper: `Avatar.getTemplatePath(playerId)` constructs path
- Created automatically when Player is created
- See `CMS_TEMPLATE_PATTERN.md` for full documentation

**Benefits**:
- No manual class registration (dynamic imports)
- Templates stored in database (CMS-ready)
- Secure path validation (prevents code injection)
- Async initialization supported
- Consistent object creation pattern

#### 7. Async Initialization Pattern
Objects with async setup use the `initialize()` method:

```typescript
class Avatar extends Agent {
  constructor(templateData: AvatarTemplateData) {
    super();
    this.playerId = templateData.playerId; // Sync setup
  }

  async initialize(): Promise<void> {
    // Async setup: load from database, etc.
    const player = await loadPlayer(this.playerId);
    this.syncFromPlayer(player);
  }
}
```

`StuffApi.create()` and `StuffApi.clone()` automatically call `initialize()` before registration.

#### 8. Protected Destruction Pattern
Objects override `prepareDestroy()` hook, NOT `destroy()`:

```typescript
class Avatar extends Character {
  protected prepareDestroy(): void {
    // Cleanup logic here - remove all connections
    for (const interactive of this.interactives) {
      interactive.currentAvatar = null;
    }
    this.interactives.clear();

    // Sync to Player before destroying
    if (this.player) {
      this.syncToPlayer();
      this.player.save();
    }
  }
}

// Usage
avatar.destroy(); // Calls prepareDestroy() → marks destroyed → unregisters
```

**Why**: `destroy()` is FINAL to guarantee `StuffApi.unregister()` always happens (prevents memory leaks).

### Connection Lifecycle

```
1. User authenticates via Google OAuth
2. Session cookie established
3. WebSocket connection initiated
4. Session middleware validates userId
5. Backend.handleWebSocketConnect(ws, userId, sessionId)
   - Generate socketId
   - Store WebSocket reference
   - Call Application.handleUserConnect()
6. Application.handleUserConnect(userId, sessionId, socketId)
   - Load User from database
   - Create Interactive with userId (runtime connection object)
   - Load all Players for userId via Interactive.loadAvailableAvatars()
     - Checks if Avatars already exist (reuse for multiplexing)
     - Creates new Avatars if needed via StuffApi.clone()
   - If single Player: auto-select via Interactive.switchAvatar(playerId)
   - If multiple Players: send character_select message
   - If no Players: create default Player (backward compatibility)
   - Send connection_established message
7. Client receives message, shows character select or enters game
8. Multiplexing: Additional connections from same user reuse existing Avatars
9. Disconnect: Interactive.destroy() removes from Avatar
   - Last disconnect triggers Avatar.syncToPlayer() and Player.save()
```

### Message Protocol

WebSocket messages use JSON format:
```typescript
interface WebSocketMessage {
  type: string;              // Message type identifier
  payload: Record<...>;      // Message data
}
```

**Standard Message Types**:
- `connection_established`: Auth success with user data
- `character_select`: Show character selection screen (multiple Players)
- `select_character`: Client selects a character (client → server)
- `avatar_switched`: Confirmation of character switch (server → client)
- `echo`: Simple echo for testing
- `ping`/`pong`: Heartbeat
- `error`: Error messages

### Persistence Flow

Application and privileged core infrastructure access PersistenceManager directly:

```
Privileged Code (Application, Backend, etc.)
  ↓
PersistenceManager.save(collection, document)
  ↓
MongoDB (insert/update)

Privileged Code
  ↓
PersistenceManager.find(collection, query)
  ↓
MongoDB (query)
```

**Design Principle**: Backend handles I/O only (WebSocket messaging), NOT database operations. Application and other privileged core infrastructure access PersistenceManager directly. This avoids unnecessary delegation and keeps Backend focused on its single responsibility.

**MongoDB Collections**:
- `users`: User accounts
- `players`: Player characters
- `google_profiles`: OAuth profile data
- `domain`: Object templates for CMS (Avatar, Room, etc.)

### Authentication Flow

1. Client initiates Google OAuth via `/auth/google`
2. Google redirects to `/auth/google/callback`
3. Passport strategy validates with Google
4. Backend.handleAuthenticationSuccess(profile)
5. Application.findOrCreateUserFromGoogle(profile)
   - Create/update GoogleProfile (OAuth data)
   - Create/update User (links to GoogleProfile)
   - Create default Player for new User
   - Create Avatar template in 'domain' collection at `/avatar/player/<playerId>`
   - Return userId
6. Passport serializes `{ id: userId }` into session
7. Client redirects with `auth=success` parameter
8. Client persists auth state in localStorage

**Session Management**:
- HttpOnly cookies for security
- express-session with configurable store (MemoryStore in dev)
- 24-hour expiration by default
- WebSocket uses same session middleware

### Technology Stack

**Monorepo Management**:
- pnpm workspaces (`pnpm-workspace.yaml`)
- TypeScript across all packages
- Shared base config: `tsconfig.base.json`

**Server**:
- Node.js with Express
- WebSocket via `ws` library
- MongoDB with native driver
- Passport.js with Google OAuth2 strategy
- isolated-vm for sandboxed game state (future)
- tsx for development with watch mode

**Client**:
- React 18 with hooks
- Vite for build tooling
- Zustand for state management
- styled-components for CSS-in-JS
- TypeScript

**Shared**:
- @saxonberg/types package for shared types

**Code Quality & Testing**:
- ESLint with TypeScript and React plugins
- Prettier for code formatting
- Vitest for unit testing
- Husky for git hooks (if configured)

### TypeScript Configuration

Base configuration (`tsconfig.base.json`):
- Target: ES2022
- Module: NodeNext
- Strict mode enabled
- Decorators: experimentalDecorators + emitDecoratorMetadata
- noUncheckedIndexedAccess for safety

### Important Implementation Details

#### Environment Variables
Server requires `.env` file in `packages/server/`:
```
MONGODB_URI=mongodb://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:2010/auth/google/callback
SESSION_SECRET=...
```

#### Port Configuration
- Client dev server: `http://localhost:5173` (Vite default)
- Server: `http://localhost:2010`

#### CORS Configuration
Backend configures CORS for development to allow client origin.

#### WebSocket Authentication
- Session middleware runs on upgrade request
- Validates `request.session.passport.user.id`
- Rejects unauthenticated connections immediately

### Future Extensibility

The architecture anticipates:
- **isolated-vm integration**: Run Application/Mudlib in sandbox
- **Command parsing**: Text-based CLI command system
- **Room/location system**: Spatial game world
- **AI-powered NPCs**: Faculty, staff, students
- **Learning platform integration**: Adaptive educational content
- **Modding framework**: User-created content and mechanics
- **Call security framework**: Proxy-based modification validation

### Code Style Guidelines

**From .prettierrc.js**:
- 80 character line width
- 2 spaces for indentation
- Double quotes for strings
- Semicolons required
- Trailing commas (ES5 style)
- LF line endings

**From .eslintrc.js**:
- React import not required in JSX (React 17+)
- Unused variables warning (allow _ prefix)
- TypeScript recommended rules
- React and React Hooks recommended rules

### Critical Architectural Principles

1. **Separation of Concerns**: Backend (I/O only) vs Application (logic) vs Mudlib (domain)
   - Backend does NOT delegate to PersistenceManager - privileged code accesses it directly
   - Application uses PersistenceManager directly for database operations

2. **Type Safety**: Full TypeScript throughout, no `any` without justification

3. **Mixin Composition**: Prefer mixins over deep inheritance hierarchies

4. **Interface Contracts**: Use interfaces to decouple layers (e.g., IBackend)

5. **Synchronization Pattern**: Explicit sync between runtime and persistent state
   - Avatar ↔ Player via syncToPlayer() / syncFromPlayer()

6. **Template-Based Creation**: Objects cloned from CMS templates via StuffApi.clone()
   - No manual class registration (dynamic imports with security validation)
   - Templates stored in `domain` collection
   - Async initialization supported via initialize() method

7. **Singleton Pattern**: PersistenceManager, ConnectionManager (controlled global state)
   - StuffApi, PlayerApi, MixinApi are static utility classes

8. **Protected Hooks**: Use prepareDestroy() hook, never override destroy()
   - Guarantees proper cleanup and unregistration

9. **Find-or-Create**: Common pattern for persistent objects

10. **Unidirectional Relationships**: Avoid bidirectional arrays
    - Player has userId (reference to User)
    - User does NOT have playerIds array
    - Query when needed: find(Collections.Players, { userId })

### Key Reference Documents

For detailed architectural patterns and implementation guidelines, see:

- **`ARCHITECTURE_PATTERNS.md`** - Manager vs Api naming, layer separation, avatar/interactive architecture, object lifecycle patterns
- **`CMS_TEMPLATE_PATTERN.md`** - Complete documentation of template-based object creation system
- **`PLAN.md`** - Overall project roadmap and phase planning
- **`PHASE_1_FEED.md`** - Phase 1 implementation details (authentication, persistence, WebSocket)
- **`CONSISTENCY_REVIEW.md`** - Architecture consistency checks and validation
- **`IMPLEMENTATION_GUIDE.md`** - Practical implementation patterns and examples

### Implementation Status

**✅ Phase 0: Foundation** (Complete)
- Project structure, TypeScript configuration
- Basic build and test infrastructure

**✅ Phase 1: Authentication & Persistence** (Complete)
- Google OAuth2 integration
- MongoDB persistence with PersistenceManager
- WebSocket service with session validation
- User, Player, GoogleProfile models
- Basic connection lifecycle

**✅ Phase 2: Identity Models & Object Lifecycle** (Complete)
- **Mixins**: Mortal, Container, Containable, Visible, Sensor (stub), Vocal (stub)
- **Character Class**: Abstract base for sentient beings (Named + Gendered + Mortal + Sensor + Vocal)
- **Avatar**: Extends Character, multiplexing support (Set<Interactive>)
- **Interactive**: Character switching support, availableAvatars map
- **PersistApi**: Auto-sync utilities (syncTo/syncFrom with mixin field collection)
- **Multiplexing**: Multiple connections to same Avatar
- **Character Selection**: switchAvatar() for users with multiple Players
- **Test Coverage**: 188 tests passing (56 new mixin/Character tests, 73 updated Avatar/Interactive tests)

**🚧 Phase 3: Messaging & Communication** (Next)
- Command parsing and execution
- Message routing and broadcasting
- Room/location system
- Sensor/Vocal mixin implementations

### Development Notes

- This is the Saxonberg 2.0 repository for building the next generation of the platform
- The Standard Model, mixin system, and Backend/Application separation are core architectural elements
- MongoDB persistence with runtime/persistent synchronization is a key pattern
- WebSocket-based real-time communication is central to the system
- Template-based object creation via CMS (domain collection) is the standard pattern
- Dynamic imports with security validation eliminate manual class registration
- Always use prepareDestroy() hook instead of overriding destroy()
- Avoid bidirectional array relationships (query instead)
- **Phase 2 Complete**: All core mixins, Character class, multiplexing, and character switching are fully implemented and tested
