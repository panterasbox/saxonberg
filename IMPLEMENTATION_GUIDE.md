# Saxonberg v2: Implementation Guide

**Companion to**: PLAN.md
**Purpose**: Practical guidance on HOW to implement what PLAN.md defines
**Status**: Draft - iterate before coding mode

---

## Table of Contents

1. [How to Feed PLAN.md into Coding Mode](#how-to-feed-planmd-into-coding-mode)
2. [File Structure Conventions](#file-structure-conventions)
3. [Testing Approach](#testing-approach)
4. [Error Handling Patterns](#error-handling-patterns)
5. [Code Style Guidelines](#code-style-guidelines)
6. [Development Workflow](#development-workflow)
7. [Phase Implementation Order](#phase-implementation-order)

---

## How to Feed PLAN.md into Coding Mode

PLAN.md is 10,272 lines - too large to feed as a single context. Use this phased approach:

### Strategy: Phase-by-Phase with Framework References

**Session 1: Foundation**
```
Feed:
- General Guidelines (line 726-1145)
- All Frameworks (line 1478-7877)
- System Architecture (line 535-725)

Purpose: Establish architectural understanding before any coding
```

**Session 2: Phase 0 (Skeleton)**
```
Feed:
- Phase 0 complete section (line 8040-8400)
- Framework 1 (Message Protocol) - reference
- Framework 2 (Markup Language) - reference

Purpose: Create ironclad project skeleton
Output: Buildable, runnable skeleton with no features
```

**Session 3: Phase 1 (Infrastructure)**
```
Feed:
- Phase 1 complete section (line 8401-8607)
- Framework 2 (Persistence) - reference
- Framework 8 (Event System) - reference

Purpose: Auth, sessions, WebSocket, MongoDB
Output: Users can connect and authenticate
```

**Session 4: Phase 2 (Identity)**
```
Feed:
- Phase 2 complete section (line 8608-9139)
- Framework 2 (Persistence) - auto-sync details
- Framework 3 (Object Lifecycle) - reference
- Framework 5 (Mixin) - reference

Purpose: User/Player/Avatar models, connection lifecycle
Output: Character creation, persistence across sessions
```

**Session 5: Phase 3 (Starting Room)**
```
Feed:
- Phase 3 complete section (line 9140-9296)
- Framework 4 (Object Lifecycle) - clone operations

Purpose: Single location, basic look command
Output: Players spawn in starting room, can look around
```

**Session 6: Phase 4 (Commands)**
```
Feed:
- Phase 4 complete section (line 9297-9511)
- Framework 10 (Command Framework) - FULL (it's large ~2000 lines)
- Framework 9 (MQL) - reference

Purpose: UNIX-like command parsing system
Output: Command framework works, subcommands, MQL integration
```

**Session 7: Phase 5 (Communications) - MVP COMPLETE**
```
Feed:
- Phase 5 complete section (line 9512-9689)
- Framework 8 (Event System) - reference

Purpose: Say and tell commands
Output: MVP COMPLETE - users can talk to each other
```

**Sessions 8+: Post-MVP Phases**
Continue phase-by-phase for Phases 6-10.

### Tips for Feeding

1. **Always include framework references** - Don't make AI guess implementation details
2. **Include verification checklists** - From each phase
3. **Reference previous phases** - "As built in Phase N..."
4. **Keep context manageable** - If a framework is huge (Command Framework), feed it in its entirety when needed
5. **Use explicit phase boundaries** - "Now we're moving to Phase 3"

---

## File Structure Conventions

### Where Files Go

**Server Structure** (`packages/server/src/`):

```
src/
├── index.ts                    # Entry point
├── services/                   # Services Layer (WebSocket, Auth, HTTP)
│   ├── Server.ts               # Main server orchestrator
│   ├── auth/
│   │   ├── PassportConfig.ts   # OAuth configuration
│   │   ├── AuthRoutes.ts       # Auth endpoints
│   │   └── AuthMiddleware.ts   # Session validation
│   └── websocket/
│       └── WebSocketService.ts # WebSocket management
│
├── backend/                    # Backend/Application Layer
│   ├── Backend.ts              # IBackend implementation
│   ├── IBackend.ts             # Backend interface
│   ├── Application.ts          # Game state coordinator
│   ├── ApplicationInstance.ts  # Singleton accessor
│   └── PersistenceManager.ts   # MongoDB connection/ops
│
├── mud/                        # Mudlib Layer (game logic)
│   ├── api/                    # API Layer (utility functions)
│   │   ├── stuff.ts            # StuffApi — registry, clone(), destruct()
│   │   ├── mixin.ts            # MixinApi — hasMixin() + isX() predicates
│   │   ├── describe.ts         # DescribeApi — getDisplayName()
│   │   ├── containment.ts      # ContainmentApi — move()
│   │   ├── message.ts          # MessageApi — sensor routing
│   │   ├── mql.ts              # MqlApi — object resolution
│   │   ├── command.ts          # CommandApi — YAML cache & verb lookup
│   │   ├── command-line.ts     # CommandLineApi — parser (boolean opts)
│   │   ├── persist.ts          # PersistApi — sync/serialize
│   │   └── player.ts           # PlayerApi — avatar registry
│   │
│   ├── lib/                    # Standard Model & Frameworks
│   │   ├── mixin-types.ts      # MixinConstructor<T>, Mixins registry
│   │   │
│   │   ├── stuff/              # Base object machinery
│   │   │   ├── Stuff.ts        # Base class
│   │   │   ├── Idea.ts         # Abstract base
│   │   │   ├── Agent.ts        # Runtime-only base
│   │   │   ├── Thing.ts        # Portable item base
│   │   │   ├── Location.ts     # Rooms/spaces
│   │   │   ├── Place.ts        # Place helpers
│   │   │   ├── Persistable.ts  # Persistable mixin/base
│   │   │   └── Propertied.ts   # PropertiedMixin + interface
│   │   │
│   │   ├── character/          # Identity mixins + Character
│   │   │   ├── Character.ts
│   │   │   ├── Named.ts        # NamedMixin + Named interface
│   │   │   └── Gendered.ts     # GenderedMixin + Gendered interface
│   │   │
│   │   ├── description/        # Appearance and detail
│   │   │   ├── Visible.ts      # VisibleMixin + Visible interface
│   │   │   ├── Perceptible.ts  # PerceptibleMixin + Perceptible interface
│   │   │   └── Detailed.ts     # DetailedMixin + Detailed interface
│   │   │
│   │   ├── spatial/            # Containment, movement, space
│   │   │   ├── Container.ts    # ContainerMixin + Container interface
│   │   │   ├── Containable.ts  # ContainableMixin + Containable interface
│   │   │   ├── Mobile.ts       # MobileMixin (requires Containable base)
│   │   │   └── Vessel.ts       # Vehicle/container hybrids
│   │   │
│   │   ├── identity/           # Persistent identity models
│   │   │   ├── User.ts
│   │   │   ├── Player.ts
│   │   │   ├── CharacterSheet.ts
│   │   │   └── GoogleProfile.ts
│   │   │
│   │   ├── message/            # Messaging
│   │   │   ├── Sensor.ts       # SensorMixin + Sensor interface
│   │   │   └── Vocal.ts        # VocalMixin + Vocal interface
│   │   │
│   │   └── command/            # Command framework
│   │       ├── CommandDefinition.ts
│   │       ├── CommandController.ts  # CommandController<I,O>
│   │       ├── CommandGiver.ts       # CommandGiverMixin + CommandGiver interface
│   │       ├── ICommandProvider.ts
│   │       ├── models.ts
│   │       └── validators.ts         # mustBeVisible, mustBeContainable, …
│   │
│   ├── cmd/                    # YAML command views (look.yaml, get.yaml, …)
│   └── obj/                    # Instantiable game objects
│       ├── Avatar.ts           # Player avatar (extends Character)
│       ├── Interactive.ts      # Connection-state object
│       └── command/            # Concrete controllers
│           ├── GetController.ts
│           ├── DropController.ts
│           ├── LookController.ts
│           ├── InventoryController.ts
│           ├── SayController.ts
│           └── TellController.ts
│
└── plugins/                    # Domain plugin system (Phase 9+)
    └── PluginBase.ts
```

**Client Structure** (`packages/client/src/`):

```
src/
├── main.tsx                    # React entry point
├── App.tsx                     # Root component
│
├── components/                 # React components
│   ├── Terminal.tsx            # Message display
│   ├── CommandBar.tsx          # Input field
│   ├── ConnectionStatus.tsx    # Connection indicator
│   └── PromptStack.tsx         # Prompt mode UI (Phase 5+)
│
├── services/                   # Client services
│   ├── websocket.ts            # WebSocket client
│   ├── messageParser.ts        # Markup → React elements
│   └── commandHistory.ts       # Up/down arrow history
│
└── store/                      # State management (Zustand)
    ├── index.ts                # Main store
    ├── connectionSlice.ts      # Connection state
    ├── messagesSlice.ts        # Message buffer
    └── promptSlice.ts          # Prompt stack state
```

**Types Structure** (`packages/types/src/`):

```
src/
├── index.ts                    # Main export
├── messages.ts                 # WebSocket message types
├── models.ts                   # Shared data models
└── enums.ts                    # Shared enums
```

### Naming Conventions

**Files**:
- PascalCase for classes: `CommandController.ts`, `StuffApi.ts`
- camelCase for utilities: `websocket.ts`, `messageParser.ts`
- kebab-case for multi-word utilities: `command-history.ts`

**Mixins**:
- Function name always suffixed with `Mixin`: `NamedMixin`, `ContainerMixin`
- File name DROPS the `Mixin` suffix: `Named.ts` exports `NamedMixin`, `Container.ts` exports `ContainerMixin`, etc.
- Each mixin file also exports a **public-shape interface** with the same name as the mixin (`Named`, `Container`, `Vocal`, …). These interfaces live beside the implementation — never in a central type barrel (memory: "Colocate mixin interfaces").
- **Base-class constraints go in the generic**, not in a comment. If a mixin requires another mixin, encode it as `<TBase extends MixinConstructor<Stuff & OtherMixin>>` so composition errors surface at compile time (memory: "Enforce mixin composition constraints").

**Interfaces**:
- Prefix with `I` for contracts: `IBackend`, `ICommand`
- No prefix for data models: `CommandModel`, `UserData`

**APIs**:
- Suffix with `Api`: `StuffApi`, `MessageApi`
- All static classes (no instantiation)

---

## Testing Approach

### Test Organization

Unit tests are **colocated** with the source they cover — `Container.test.ts`
lives next to `Container.ts` in `lib/spatial/`, `describe.test.ts` lives next
to `describe.ts` in `api/`, and so on. Do NOT relocate tests into a
centralized `__tests__/` tree.

```
packages/server/src/mud/
├── api/
│   ├── describe.ts
│   ├── describe.test.ts            # Colocated
│   ├── mixin.ts
│   ├── mixin.test.ts
│   ├── message.ts
│   ├── message.test.ts
│   ├── containment.ts
│   └── containment.test.ts
├── lib/
│   ├── spatial/
│   │   ├── Container.ts
│   │   ├── Container.test.ts       # Colocated
│   │   ├── Containable.ts
│   │   └── Containable.test.ts
│   ├── stuff/
│   │   ├── Location.ts
│   │   ├── Location.test.ts
│   │   ├── Propertied.ts
│   │   └── Propertied.test.ts
│   └── …
└── obj/
    └── command/
        └── …                      # Future: colocated controller tests
```

Integration and e2e suites (when needed) still live in
`packages/server/src/__tests__/`; colocation is a unit-test convention only.

### Testing Strategy by Phase

**Phase 0 (Skeleton)**:
- ✅ Build succeeds
- ✅ Linter passes
- ✅ Server starts without errors
- ✅ Client starts without errors
- ✅ "Hello World" endpoints respond

**Phase 1 (Infrastructure)**:
- Unit: PersistenceManager CRUD operations
- Unit: WebSocket message validation
- Integration: OAuth flow end-to-end
- Integration: Session persistence
- Integration: WebSocket upgrade with session

**Phase 2 (Identity)**:
- Unit: User/Player/GoogleProfile models
- Unit: Avatar sync methods
- Unit: Mixin composition
- Integration: User creation flow
- Integration: Avatar spawn/despawn
- E2E: User logs in, avatar created, reconnects, avatar restored

**Phase 3 (Starting Room)**:
- Unit: Location class
- Unit: Container inventory management
- Integration: Avatar move to location
- E2E: User logs in, sees starting room description

**Phase 4 (Commands)**:
- Unit: CommandLineApi tokenization
- Unit: CommandDefinition parsing
- Unit: Individual command controllers
- Integration: Command discovery
- Integration: Command execution pipeline
- E2E: User types command, sees response

**Phase 5 (Communications) - MVP**:
- Unit: MessageApi methods
- Unit: SayController, TellController
- Integration: Message routing
- E2E: User says message, other users see it
- E2E: User tells another user, only they see it

### Test Patterns

**Unit Test Example**:
```typescript
describe('StuffApi', () => {
  describe('generateId', () => {
    it('generates unique IDs', () => {
      const id1 = StuffApi.generateId();
      const id2 = StuffApi.generateId();
      expect(id1).not.toBe(id2);
    });

    it('generates URL-safe IDs', () => {
      const id = StuffApi.generateId();
      expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });
});
```

**Integration Test Example**:
```typescript
describe('Authentication Flow', () => {
  let server: Server;
  let testUser: { userId: string, session: any };

  beforeAll(async () => {
    server = new Server();
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('creates user on first Google OAuth login', async () => {
    const profile = createMockGoogleProfile();
    const result = await server.authenticateUser(profile);

    expect(result.userId).toBeDefined();
    expect(result.user.email).toBe(profile.emails[0].value);
  });
});
```

**E2E Test Example**:
```typescript
describe('User Communication Flow', () => {
  it('allows users to say messages to each other', async () => {
    // Arrange: Two users connected
    const alice = await connectUser('alice@example.com');
    const bob = await connectUser('bob@example.com');

    // Act: Alice says something
    await alice.sendCommand('say Hello Bob!');

    // Assert: Bob sees the message
    const bobMessages = await bob.getMessages();
    expect(bobMessages).toContainEqual(
      expect.objectContaining({
        type: 'output',
        payload: expect.objectContaining({
          text: expect.stringContaining('Alice says')
        })
      })
    );
  });
});
```

### Coverage Goals

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: All critical paths (auth, persistence, commands)
- **E2E Tests**: All MVP user flows (Phase 5 milestone)

---

## Error Handling Patterns

### Error Hierarchy

```typescript
// Base error class
class GameError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Specific error types
class AuthenticationError extends GameError {
  constructor(message: string, details?: any) {
    super(message, 'AUTH_ERROR', details);
  }
}

class PersistenceError extends GameError {
  constructor(message: string, details?: any) {
    super(message, 'PERSIST_ERROR', details);
  }
}

class CommandError extends GameError {
  constructor(message: string, details?: any) {
    super(message, 'COMMAND_ERROR', details);
  }
}

class ValidationError extends GameError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
  }
}
```

### Error Handling by Layer

**Services Layer**:
```typescript
// Log and respond to client
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  MudlogApi.error('http', err.message, { stack: err.stack });

  if (err instanceof GameError) {
    res.status(400).json({ error: err.message, code: err.code });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Backend Layer**:
```typescript
// Catch and log, send error message to client
try {
  await application.processUserMessage(socketId, message);
} catch (err) {
  MudlogApi.error('backend', `Error processing message: ${err.message}`);
  backend.sendMessageToSocket(socketId, {
    type: 'error',
    payload: { text: 'An error occurred processing your command.' }
  });
}
```

**Application Layer**:
```typescript
// Validate and throw specific errors
async handleUserConnect(userId: string, sessionId: string, socketId: string) {
  if (!userId) {
    throw new AuthenticationError('User ID is required');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AuthenticationError('User not found');
  }

  // ... proceed with connection
}
```

**Command Layer**:
```typescript
// Return error in CommandResult
execute(model: SayModel, context: CommandContext): CommandResult {
  if (!model.fields.message) {
    return {
      success: false,
      error: 'Message is required'
    };
  }

  // ... execute command
}
```

### Logging Strategy

**Use MudlogApi consistently**:
```typescript
// Levels: debug, info, warn, error
MudlogApi.debug('persistence', 'Saved player', { playerId });
MudlogApi.info('auth', 'User logged in', { userId });
MudlogApi.warn('command', 'Invalid command syntax', { command });
MudlogApi.error('backend', 'Connection failed', { error });
```

**Log Categories** (first argument):
- `auth` - Authentication/authorization
- `persistence` - Database operations
- `websocket` - WebSocket events
- `command` - Command execution
- `http` - HTTP requests
- `backend` - Backend operations
- `application` - Application state
- `events` - Event system
- `hot-reload` - Module reloading

---

## Code Style Guidelines

### TypeScript Strict Mode

**Always enabled**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### No `any` Without Justification

```typescript
// ❌ Bad
function process(data: any) { ... }

// ✅ Good
function process(data: unknown) {
  // Type guard
  if (typeof data === 'string') {
    // ... use as string
  }
}

// ✅ Acceptable (with comment)
function legacyIntegration(data: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  // Legacy API returns untyped data, validation happens downstream
}
```

### Interface vs Type

**Use `interface` for:**
- Object shapes that can be extended
- Class contracts
- Data models

**Use `type` for:**
- Union types
- Mapped types
- Type aliases

```typescript
// ✅ Interface for object shape
interface CommandModel {
  verb: string;
  fields: Record<string, unknown>;
}

// ✅ Type for union
type PropValue = string | number | boolean | object | null;

// ✅ Type for mapped type
type ReadonlyProps<T> = {
  readonly [K in keyof T]: T[K];
};
```

### Async/Await Over Promises

```typescript
// ❌ Avoid
function loadUser(id: string) {
  return UserModel.findById(id)
    .then(user => {
      return user.getData();
    })
    .catch(err => {
      console.error(err);
      throw err;
    });
}

// ✅ Prefer
async function loadUser(id: string) {
  try {
    const user = await UserModel.findById(id);
    return user.getData();
  } catch (err) {
    MudlogApi.error('persistence', 'Failed to load user', { id, err });
    throw err;
  }
}
```

### JSDoc for Public APIs

```typescript
/**
 * Clone a game object from its template.
 *
 * @param path - Template path (e.g., "/items/sword", "/avatar/player/<playerId>")
 * @returns New instance of the object with unique stuffId, typed to T
 * @throws {PersistenceError} If template not found in CMS
 */
static async clone<T extends Stuff = Stuff>(path: string): Promise<T> {
  // ...
}
```

---

## Development Workflow

### Branch Strategy

**Main Branches**:
- `main` - Production-ready code
- `develop` - Integration branch for features

**Feature Branches**:
- `phase/0-skeleton` - Phase 0 implementation
- `phase/1-infrastructure` - Phase 1 implementation
- `phase/2-identity` - Phase 2 implementation
- etc.

**Convention**: Create branch per phase, merge to `develop`, then to `main` at milestones.

### Commit Messages

**Format**: `<type>(<scope>): <subject>`

**Types**:
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `docs` - Documentation
- `test` - Test additions/fixes
- `chore` - Build process, dependencies

**Examples**:
```
feat(auth): implement Google OAuth flow
fix(persistence): handle null savedProps correctly
refactor(mixins): simplify NamedMixin composition
docs(framework): expand Event System documentation
test(commands): add SayController unit tests
chore(deps): update TypeScript to 5.4.5
```

### Pre-Commit Hooks

**Husky + Lint-Staged** (configured in Phase 0):
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

**Runs on commit**:
1. ESLint with auto-fix
2. Prettier formatting
3. TypeScript type check
4. Unit tests (optional, can be slow)

### Development Loop

1. **Start Phase**: Read PLAN.md section + relevant frameworks
2. **Write Tests**: TDD when appropriate (unit tests first)
3. **Implement**: Follow file structure conventions
4. **Verify**: Run phase verification checklist
5. **Commit**: Follow commit message format
6. **Document**: Update IMPLEMENTATION_GUIDE.md with learnings

---

## Phase Implementation Order

### Phase 0: Skeleton (1-2 days)
**Goal**: Buildable, runnable, NO features

**Steps**:
1. Create monorepo structure (pnpm workspace)
2. Configure TypeScript (tsconfig.base.json)
3. Configure ESLint + Prettier
4. Create Hello World server (Express)
5. Create Hello World client (React)
6. Verify build, lint, format all pass

**Verification**: 12 checkboxes in PLAN.md Phase 0

---

### Phase 1: Core Infrastructure (3-5 days)
**Goal**: Auth, sessions, WebSocket, MongoDB

**Steps**:
1. Install dependencies (passport, ws, mongodb)
2. Implement PersistenceManager
3. Implement WebSocket service
4. Implement Google OAuth
5. Create Backend/Application skeleton
6. Wire everything together in Server class

**Verification**: 13 checkboxes in PLAN.md Phase 1

---

### Phase 2: Identity Models (3-5 days)
**Goal**: User/Player/Avatar models, connection lifecycle

**Steps**:
1. Implement Mixin framework
2. Create base mixins (Named, Gendered, Container, etc.)
3. Implement User, Player, GoogleProfile, Interactive, Avatar
4. Implement connection lifecycle (connect/disconnect)
5. Implement sync methods (syncToPlayer/syncFromPlayer)
6. Test persistence across reconnects

**Verification**: 15 checkboxes in PLAN.md Phase 2

---

### Phase 3: Starting Room (2-3 days)
**Goal**: Single location, basic look command

**Steps**:
1. Implement Location class
2. Create hardcoded starting room
3. Implement basic LookCommand (stub)
4. Update Application to spawn avatars in room
5. Test multiple users see each other

**Verification**: 11 checkboxes in PLAN.md Phase 3

---

### Phase 4: Command Framework (5-7 days)
**Goal**: UNIX-like command parsing system

**Steps**:
1. Implement CommandDefinition (YAML parsing)
2. Implement CommandLineApi (tokenization, parsing)
3. Implement CommandController base class
4. Implement MQL basic resolution
5. Implement subcommands
6. Implement command discovery
7. Create basic commands (ping, look, help, player)

**Verification**: Multiple checklists in PLAN.md Phase 4 + Framework 10

---

### Phase 5: Communications (3-4 days) - **MVP COMPLETE**
**Goal**: Say and tell commands

**Steps**:
1. Implement Sensor + Vocal mixins
2. Implement MessageApi
3. Implement SayCommand
4. Implement TellCommand
5. Update client Terminal to display different message types

**Verification**: 12 checkboxes in PLAN.md Phase 5

**🎉 MVP MILESTONE**: Users can log in and talk to each other!

---

### Phases 6-10: Post-MVP (TBD)
Follow same pattern for remaining phases.

---

## Next Steps

1. **Review this guide** - Iterate on any unclear sections
2. **Create checklists** - Convert each phase into actionable checklist
3. **Set up project** - Run Phase 0 (skeleton)
4. **Start Phase 1** - Feed PLAN.md Session 1 + Session 3 into coding mode

---

## Questions to Resolve

*Add questions that come up during implementation planning*

1. **MongoDB hosting**: Local development? MongoDB Atlas for production?
2. **Environment variables**: .env management? AWS Parameter Store?
3. **Testing framework**: Jest + ts-jest confirmed?
4. **CI/CD**: GitHub Actions? GitLab CI? (AWS CodePipeline in PLAN.md)
5. **Client hosting**: Separate deploy? Same container?

---

## Appendix: Common Gotchas

### TypeScript

- ❌ Don't use `require()` - Use `import`/`export` (ES modules)
- ❌ Don't use `any` without justification
- ❌ Don't disable strict null checks
- ✅ Use unknown for truly unknown types
- ✅ Use type guards for narrowing

### Mixins

- ❌ Don't apply mixins in wrong order (order matters!)
- ✅ Apply from base to specific: Named(Gendered(Container(Base)))
- ✅ Register all mixins with MixinApi (add an entry to `Mixins` in `lib/mixin-types.ts` and the matching `MixinApi.isX()` predicate in `api/mixin.ts`)
- ✅ Encode required base composition in the generic (`<TBase extends MixinConstructor<Stuff & OtherMixin>>`), not in comments
- ✅ Export a public-shape interface alongside the mixin function — never in a central barrel

### Narrowing and Display

- ✅ `MixinApi.isX(obj)` to narrow and call interface methods
- ✅ `MixinApi.hasMixin(ctor, Mixins.X)` only for dynamic introspection
- ✅ `DescribeApi.getDisplayName(obj, fallback)` for human-readable names
- ❌ Don't reintroduce ad-hoc `getObjectName()` duck-typing helpers

### Movement and Destruction

- ✅ `ContainmentApi.move(item, to)` for all object movement. Parameters are `Stuff & Containable` / `Stuff & Container`; narrow with `MixinApi.isX()` first. Returns `void`; throws on programmatic contract violations.
- ✅ `StuffApi.destruct(obj)` to destroy — never call `destroy()` directly, never override it.
- ✅ Override `prepareDestroy()` for subclass cleanup.

### Persistence

- ❌ Don't forget to sync runtime → persistent before saving
- ❌ Don't persist transient state (Interactive, runtime buffs)
- ✅ Use PersistApi.syncTo/syncFrom for automatic field collection
- ✅ Declare persistentFields on all mixins
- ⚠️ `PropertiedMixin.maskProp()` now requires an explicit `Stuff` owner — see PERSISTENT_PATTERN.md.

### WebSocket

- ❌ Don't forget to validate session during upgrade
- ❌ Don't send messages before connection established
- ✅ Always check socket.readyState before sending
- ✅ Handle disconnect gracefully (destroy Interactive + Avatar)

---

*End of Implementation Guide - v1.0 Draft*
