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
  - `StuffApi`: ID generation and object utilities
  - `MixinApi`: Mixin registration, querying, composition
  - `PersistApi`: CRUD operations, synchronization utilities

- **Standard Model** (`lib/`): Object-oriented class hierarchy
  ```
  Stuff (base with runtime ID)
    └── Idea (abstract base)
         ├── User (account with googleProfile, players)
         ├── Player (character with name, gender, persistent)
         ├── Interactive (runtime connection state)
         ├── GoogleProfile (OAuth data)
         ├── Location (future)
         └── Agent → Avatar (runtime player presence)
  ```

- **Game Objects** (`obj/`): Instantiable entities like Avatar

### Key Architectural Patterns

#### 1. Composition via Mixins
Uses higher-order functions for behavior composition:
```typescript
const PlayerBase = GenderedMixin(NamedMixin(Idea));
class Player extends PlayerBase { ... }
```

**Available Mixins**:
- `NamedMixin`: firstName, lastName, fullName
- `GenderedMixin`: pronouns (he/she/they/etc.)
- `ContainerMixin`: Inventory management (future)
- `ContainableMixin`: Environment reference (future)

#### 2. Runtime vs Persistent Objects
- **Runtime Objects**: Avatar, Interactive (exist only during active connection)
- **Persistent Objects**: User, Player, GoogleProfile (stored in MongoDB)
- **Synchronization**: Avatar ↔ Player via `syncToPlayer()` / `syncFromPlayer()`

#### 3. Bidirectional Links
Avatar and Interactive maintain mutual references:
```typescript
avatar.setInteractive(interactive);     // Avatar → Interactive
interactive.linkAvatar(avatar);          // Interactive → Avatar
```

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
   - Find/Create User
   - Find/Create Player
   - Create Interactive (stores socketId)
   - Create Avatar (runtime state)
   - Link Avatar ↔ Interactive
   - Send connection_established message
7. Client receives message, updates auth state
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
- `echo`: Simple echo for testing
- `ping`/`pong`: Heartbeat
- `error`: Error messages

### Persistence Flow

```
Game Object (Player) → save()
  ↓
PersistApi.save(collection, doc)
  ↓
ApplicationInstance.get() → Application
  ↓
Application.saveObject()
  ↓
Backend.saveDocument()
  ↓
PersistenceManager.save()
  ↓
MongoDB (insert/update)
```

**MongoDB Collections**:
- `users`: User accounts
- `players`: Player characters
- `google_profiles`: OAuth profile data

### Authentication Flow

1. Client initiates Google OAuth via `/auth/google`
2. Google redirects to `/auth/google/callback`
3. Passport strategy validates with Google
4. Backend.handleAuthenticationSuccess(profile)
5. Application.findOrCreateUserFromGoogle(profile)
   - Create/update User, GoogleProfile, Player
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

**Code Quality**:
- ESLint with TypeScript and React plugins
- Prettier for code formatting
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
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
SESSION_SECRET=...
```

#### Port Configuration
- Client dev server: `http://localhost:5173` (Vite default)
- Server: `http://localhost:3001`

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

1. **Separation of Concerns**: Backend (I/O) vs Application (logic) vs Mudlib (domain)
2. **Type Safety**: Full TypeScript throughout, no `any` without justification
3. **Mixin Composition**: Prefer mixins over deep inheritance hierarchies
4. **Interface Contracts**: Use interfaces to decouple layers
5. **Synchronization Pattern**: Explicit sync between runtime and persistent state
6. **Singleton Pattern**: PersistenceManager, ApplicationInstance (controlled global state)
7. **Factory Methods**: Static methods for object creation/retrieval
8. **Find-or-Create**: Common pattern for persistent objects

### Development Notes

- This is the Saxonberg 2.0 repository for building the next generation of the platform
- The Standard Model, mixin system, and Backend/Application separation are core architectural elements
- MongoDB persistence with runtime/persistent synchronization is a key pattern
- WebSocket-based real-time communication is central to the system
- Additional planning and design documents are available in the repository to guide development
