# Saxonberg v2: Domain-Agnostic MUD Gamification Platform - DETAILED PLAN

## Project Vision

Build a **domain-agnostic MUD gamification platform** that can plug into any business vertical (education, retail, utilities, insurance, etc.) to gamify their processes and data. The MUD engine itself will be completely business-domain neutral, with domain-specific features loaded via mods.

## Build Approach

- **Fresh start**: Build new code from scratch, using legacy projects as architectural reference only
- **Feature parity goal**: Reach combined feature parity with saxonberg + panterasbot legacy projects
- **Domain agnostic**: Core MUD engine has zero business logic; all domain features via mods
- **Excludes**: Twitch integration, GitLab integration (from panterasbot legacy)

---

# Key Architectural Insights

These are fundamental design decisions that permeate the entire system. Understanding these concepts is essential for working with the codebase.

## Object Creation & Lifecycle (Critical)

### Three-Layer Object System

The system uses three distinct but related concepts:

**1. Blueprint** = JavaScript class/prototype (the code)
- Example: `Foo` class exported from `/bog/leg`
- This is the actual TypeScript/JavaScript code defining object behavior
- Stored on disk as `.ts` files (compiled to `.js` for runtime)
- Loaded into memory via module imports (Node.js resolves extension)

**2. Template** = JSON document in MongoDB CMS (the configuration)
- Example: Template key `/home/bobalu/workroom` in CMS collection
- Contains:
  - Reference to blueprint (module path + export name)
  - Initialization data (properties, state, etc.)
  - Conforms to JSON schema (e.g., `RoomTemplate.schema.json`)
- Stored in MongoDB collection
- Different schemas for different types (RoomTemplate, ItemTemplate, WeaponTemplate, etc.)

**3. Clone** = Runtime instance in memory (the actual object)
- Example: Specific instance of `Foo` with stuffId `aB3xK9mN2pQ5`
- Created by: loading template → loading blueprint → instantiating with `new Blueprint(template)`
- Lives in Application's `objectsById` map
- Has unique `stuffId` for runtime tracking

### Template Structure (CMS Documents)

**CMS = MongoDB Collection** containing template documents.

**Template Document Example**:
```json
{
  "_id": "/home/bobalu/workroom",
  "blueprint": "/bog/leg#Foo",
  "properties": {
    "name": "Bobalu's Workshop",
    "description": "A cluttered workspace filled with tools and half-finished projects.",
    "exits": {
      "north": "/home/bobalu/hallway"
    }
  },
  "metadata": {
    "author": "bobalu",
    "created": "2025-01-10T12:00:00Z",
    "schema": "RoomTemplate.schema.json"
  }
}
```

**Template Schemas by Type**:
- `RoomTemplate.schema.json` - For locations/rooms
- `ItemTemplate.schema.json` - For portable items
- `WeaponTemplate.schema.json` - For weapons (extends ItemTemplate)
- `NPCTemplate.schema.json` - For non-player characters
- `ContainerTemplate.schema.json` - For containers (chests, bags, etc.)

**Template Key = Primary identifier** for referencing object types:
- Example: `/home/bobalu/workroom`
- Used in code to spawn objects: `await StuffApi.clone('/home/bobalu/workroom')`

### Blueprint Reference Notation

**We use URI-like notation** for referencing module exports, inspired by URI/URN standards:

**Syntax**:
```
[package]:[path]#[export]

package: @scope/name | core (optional - allows overrides when omitted)
path: /module/path (NO file extensions - .ts/.js resolved at runtime)
export: ExportName | default (inferred if # is missing)
```

**Examples**:
```typescript
// Core (explicit - bypasses overrides)
"core:/mud/obj/items/Weapon#Weapon"

// Core (implicit - allows future mod/mod overrides)
"/mud/obj/items/Weapon#Weapon"

// Mod (explicit package - Phase 11+)
"@saxonberg-mods/narnia:/rooms/NarniaRoom#NarniaRoom"

// Default export (shorthand)
"@saxonberg-mods/narnia:/items/Wardrobe"  // Infers #default

// Another mod
"@community/custom-mod:/commands/CustomCommand#CustomCommand"
```

**Rules**:
1. **NO file extensions** - Never use `.ts`, `.js`, `.mjs`, etc. Node.js module resolution handles this
2. **Package is optional** - Omitting package allows override chain (mods → mods → core)
3. **Use `core:` to bypass overrides** - Explicitly request core implementation
4. **`#` separates export name** - Standard URI fragment for named exports
5. **`:` separates package from path** - URI-like namespace separation
6. **Missing `#` infers `#default`** - Convenient shorthand for default exports

**Template Examples**:
```json
{
  "_id": "/areas/town/square",
  "blueprint": "core:/mud/lib/location/Room#Room",
  "properties": { "name": "Town Square", ... }
}

{
  "_id": "/items/basic_sword",
  "blueprint": "/mud/obj/items/Weapon",  // Allows override, infers #default
  "properties": { "damage": 10, ... }
}

{
  "_id": "/narnia/wardrobe",
  "blueprint": "@saxonberg-mods/narnia:/items/MagicalWardrobe#Wardrobe",
  "properties": { "destination": "/narnia/lamppost", ... }
}
```

**Future: Mod Override System** (Phase 11+)

When mods are implemented, blueprint resolution will check:
1. Active mods (priority based on load order or configuration)
2. Core (fallback)

Using `core:` prefix bypasses this chain and always uses core implementation. This allows templates to work both with and without mods active.

### Clone vs Load/Reload (Critical Distinction)

**Clone** = Create a new instance from a template
```typescript
// 1. Look up template in CMS
const template = await CMS.getTemplate('/home/bobalu/workroom');

// 2. Parse blueprint reference
// Examples:
//   "core:/bog/leg#Foo" → ["core", "/bog/leg", "Foo"]
//   "/bog/leg#Foo" → [null, "/bog/leg", "Foo"] (allows override)
//   "/bog/leg" → [null, "/bog/leg", "default"] (allows override + default)
const [pkg, path, exportName] = parseBlueprint(template.blueprint);

// 3. Resolve package + path to actual module
const modulePath = BlueprintResolver.resolve(pkg, path);

// 4. Load module (cached if already loaded)
const module = await import(modulePath);

// 5. Get exported class
const Blueprint = module[exportName];

// 6. Instantiate with template data
const clone = new Blueprint(template);

// clone.stuffId = "aB3xK9mN2pQ5" (new unique ID)
```

**Load** = Initially load a JavaScript module from disk
```typescript
// First time: Import module from disk (Node.js resolves .js/.ts)
const module = await import('packages/server/src/bog/leg');
const Foo = module.Foo;  // Get exported class
// Now the blueprint is ready for cloning
```

**Reload** = Hot-swap a JavaScript module to update blueprint
```typescript
// Developer edited /bog/leg, reload without restarting server
await HotReloadApi.reload('core:/bog/leg');
// All FUTURE clones use the new code
// Existing clones optionally updated
```

### The Complete Flow

1. **Developer writes** JavaScript class (blueprint)
   ```typescript
   // packages/server/src/bog/leg.ts
   export class Foo extends Room {
     // ... class definition
   }
   ```

2. **CMS template created** in MongoDB
   ```json
   {
     "_id": "/home/bobalu/workroom",
     "blueprint": "/bog/leg#Foo",
     "properties": { "name": "Bobalu's Workshop", ... }
   }
   ```

3. **Runtime: Clone** creates instance
   ```typescript
   const room = await StuffApi.clone('/home/bobalu/workroom');
   // Loads template → Resolves blueprint → Imports module → Instantiates Foo → Returns clone
   ```

4. **Each clone** gets unique `stuffId` for runtime tracking
   ```typescript
   room.stuffId // "aB3xK9mN2pQ5"
   room.templateKey // "/home/bobalu/workroom"
   ```

5. **Developer edits** blueprint (JavaScript class), saves file
   ```typescript
   // Modified packages/server/src/bog/leg.ts with new behavior
   ```

6. **Hot-reload** updates blueprint in memory
   ```typescript
   await HotReloadApi.reload('core:/bog/leg');
   // Module cache cleared, re-imported
   ```

7. **Future clones** automatically use new code
   ```typescript
   const newRoom = await StuffApi.clone('/home/bobalu/workroom');
   // Uses reloaded Foo class with new behavior
   ```

### Key Identifiers

**Template Key** (CMS primary key):
- Example: `/home/bobalu/workroom`
- References a template document in MongoDB
- Used to spawn objects

**stuffId** (Runtime instance identifier):
- Example: `aB3xK9mN2pQ5`
- Unique ID for each clone in memory
- Generated on instantiation via shortuuid

**Blueprint Reference** (Package + path + export):
- Examples:
  - `core:/bog/leg#Foo` (core, named export)
  - `/bog/leg#Foo` (allows override, named export)
  - `/bog/leg` (allows override, default export shorthand)
  - `@saxonberg-mods/narnia:/rooms/NarniaRoom` (mod, default export)
- References a JavaScript class
- Used by templates to specify which class to instantiate

### Garbage Collection Design

**Strong References** (keep objects alive):
```typescript
Application.objectsById: Map<string, Stuff>  // Strong ref - prevents GC
```

**Weak References** (allow GC when no longer needed):
```typescript
Cache.lookupTable: WeakMap<Stuff, CachedData>  // Doesn't prevent GC
Index.secondaryIndex: Map<string, WeakRef<Stuff>>  // Allows GC
```

**Bidirectional References** (use clear/set patterns):
```typescript
// BAD: Circular strong references prevent GC
avatar.interactive = interactive;  // Strong ref
interactive.avatar = avatar;  // Strong ref - LEAK!

// GOOD: Clear/set pattern with cleanup
avatar.setInteractive(interactive);  // Handles both sides
avatar.clearInteractive();  // Cleanup on destroy
```

**Memory Leak Prevention**:
- Clear all references in `destroy()`
- Use WeakMap for caches
- Use WeakRef for secondary indexes
- Clear event listeners on destroy
- Clear timers on destroy
- Check `isDestroyed()` before access

See **Framework 3** for complete object lifecycle documentation.

## Initialization in Constructors

**Initialization happens in the constructor** - this is preferred and expected:

```typescript
class Weapon extends Thing {
  public damage: number = 0;

  constructor(template: StuffTemplate) {
    super(template);  // Must call super first

    // Initialize from template properties
    this.damage = template.properties.damage ?? 0;

    // Auto-registration happens in Stuff base constructor
    // stuffId already generated by this point
  }
}
```

**Constructor responsibilities**:
1. Call `super(template)` (generates stuffId, registers with Application)
2. Initialize properties from template
3. Apply any setup logic
4. Object is immediately ready to use after construction

**No separate "init" method needed** - everything happens in constructor.

## Character, Avatar, and NPC Architecture

### The Class Hierarchy

```
Stuff (base for all game objects)
  └─ Agent (mobile entities with Container + Containable)
       └─ Character (abstract - sentient beings with identity + communication)
            ├─ Avatar (PC runtime - multiplexing, persistence, player link)
            └─ Custom NPCs (Waiter, Merchant, Guard - custom AI/behavior)
                 └─ Can extend each other (Waiter extends Merchant)
```

**Character is an abstract runtime class** - no MongoDB collection for Character.

### Character (Abstract Base)

**Purpose**: Unify common features of PCs and NPCs in TypeScript.

**Provides**:
- Identity mixins: Named, Gendered
- Communication mixins: Sensor, Vocal
- Stat fields: xp, level, hp, maxHp (shared structure, different usage)
- Common methods: fullName, isPC(), isNPC(), isPersistent()

**Important**: While PCs and NPCs share stat fields (xp, level, hp, maxHp), their **progression logic is completely different**:
- **PCs**: Active progression systems - gain XP from activities, level up, persistent across sessions, skill trees
- **NPCs**: Static/scripted values - usually fixed level from template, no XP gain, respawn at full HP, level might scale to player

**Character is runtime-only**:
- Not a MongoDB collection
- Just a TypeScript class for code organization
- Enforces consistency in code, not database

### Persistence Strategy

**Player Characters** (Avatar):
- Runtime: Avatar extends Character
- Persistent: Player document embeds all Character data
- Player document includes: Character fields + Player metadata (userId, created, lastPlayed)
- Sync: Avatar.syncToPlayer() / syncFromPlayer() (auto-collects fields from mixins via Framework 2)
- Always persists

**Non-Player Characters** (custom classes):
- Runtime: Custom class extends Character (e.g., Waiter extends Character)
- Persistent: Optional NPC document embeds all Character data (rarely used)
- NPC document includes: Character fields + NPC metadata (templateKey, spawnLocation)
- Most NPCs DON'T persist - respawned from templates on restart
- Only persist specific NPCs with unique state (quest progress, merchant inventory)

### Why No Character Collection?

**Option 1 (Rejected)**: Separate Character collection
```
Player → Character ← Avatar
  ↓         ↓         ↓
MongoDB  MongoDB  Runtime
```
**Problems**: Extra collection, extra lookups, overkill for NPCs

**Option 2 (Chosen)**: Character embedded in Player/NPC
```
Player (embeds Character data) → Avatar
  ↓                               ↓
MongoDB                       Runtime

NPC (embeds Character data) → Waiter
  ↓                            ↓
MongoDB (optional)         Runtime
```
**Benefits**: Simple persistence, single document load, flexible per-NPC

### Avatar (PC-Specific Features)

**Extends Character with**:
- `player: Player` - link to persistent data
- `interactives: Set<Interactive>` - multiplexing (multiple connections)
- Connection methods: addInteractive, removeInteractive, isConnected, isLinkdead
- sendMessage - broadcast to all connected clients
- Sync methods: syncToPlayer, syncFromPlayer
- Factory: Avatar.createFromPlayer(player)

**Avatar does NOT have**:
- NPC-specific features (AI, patrol, dialogue, spawn logic)
- Generic "character" creation (always created from Player)

### Custom NPC Classes (NPC-Specific Features)

**Examples**:
```typescript
class Waiter extends Character {
  restaurant: Location;
  orders: Map<Avatar, string[]>;

  takeOrder(customer: Avatar, items: string[]): void { ... }
  deliverOrder(customer: Avatar): void { ... }
}

class Merchant extends Character {
  priceMultiplier: number;
  merchandise: Thing[];

  listWares(): string[] { ... }
  buyItem(buyer: Avatar, itemName: string): void { ... }
}

class Guard extends Character {
  patrolRoute: Location[];
  aggressionLevel: number;

  patrol(): void { ... }
  challenge(suspect: Avatar): void { ... }
  arrest(criminal: Avatar): void { ... }
}
```

**Custom NPCs do NOT have**:
- Interactive connections (no player controlling them)
- Player link
- Sync methods (unless they opt in with NPC document)

### Identity Model Summary

**User** (persistent, Idea):
- Account-level data (credentials, PII, preferences)
- Never appears in-world
- Has many Players

**Player** (persistent, Idea):
- Embeds all Character data (firstName, lastName, pronouns, xp, level, hp, etc.)
- Plus Player metadata (userId, created, lastPlayed, playTime)
- Pure persistence - no runtime methods
- Syncs with Avatar

**NPC** (persistent, Idea - optional):
- Embeds all Character data (same fields as Player)
- Plus NPC metadata (templateKey, spawnLocation, respawnDelay)
- Rarely used - most NPCs spawned from templates
- Syncs with custom NPC classes if they opt in

**Interactive** (runtime, Idea):
- Connection/session data (socketId, sessionId, userId)
- currentAvatar: which character they're controlling
- availableAvatars: all PCs this user can control
- Methods: switchAvatar, send, destroy
- Multiplexing: multiple Interactives can connect to same Avatar

**Character** (runtime, abstract class):
- Agent + Named + Gendered + Sensor + Vocal mixins
- Common features for PCs and NPCs
- Abstract isPersistent() method
- No MongoDB collection

**Avatar** (runtime, extends Character):
- Runtime representation of PC
- Links to Player for persistence
- Supports multiplexing (multiple Interactives)
- Always persists (via Player document)

**Custom NPCs** (runtime, extend Character):
- Custom behavior per NPC type (Waiter, Merchant, Guard)
- Created from templates (StuffApi.clone)
- Usually don't persist (respawned on restart)
- Can optionally persist with NPC document

### Connection Multiplexing

**Multiple Interactives → Same Avatar**:
```typescript
// User connects from laptop
interactive1.switchAvatar(playerId);
avatar.interactives.size === 1;

// Same user connects from phone
interactive2.switchAvatar(playerId);  // Same playerId!
avatar.interactives.size === 2;  // Multiplexing!

// Command executed once, both see output
avatar.sendMessage({ type: 'output', payload: { text: 'You gain XP' } });
// → Both laptop and phone receive message
```

**Character Switching (su-style)**:
```typescript
// User controlling Character A
interactive.currentAvatar === avatarA;

// Switch to Character B
interactive.switchAvatar(playerIdB);

// Now controlling Character B
interactive.currentAvatar === avatarB;
avatarA.interactives.size === 0;  // Disconnected from A
avatarB.interactives.size === 1;  // Connected to B
```

### Relationships

| Relationship | Description |
|-------------|-------------|
| User 1:N Player | One account, multiple characters |
| Player 1:1 Avatar | When logged in (Avatar created from Player) |
| Avatar 1:N Interactive | Multiplexing (multiple connections) |
| Interactive N:1 Avatar | Can switch between Avatars (su-style) |
| Interactive 1:1 User | Each connection belongs to one account |
| Template 1:N NPC clones | Many NPCs from one template |

---

# System Architecture & Component Relationships

## The Complete System Stack

Understanding how all the pieces fit together is crucial. The overall system consists of five layers:

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 5: Integration Layer (Domain-Specific Adapters)      │
│  ─────────────────────────────────────────────────────────  │
│  • study.com adapter (education domain)                     │
│  • safeway.com adapter (retail domain)                      │
│  • sunnyvale.gov adapter (municipal services domain)        │
│                                                              │
│  Maps external business events → game events                │
│  Examples: Course completion → Skill XP gain                │
│            Product purchase → Item acquisition              │
│            Service usage → Quest progress                   │
└─────────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: Modding Layer (Custom Extensions)                 │
│  ─────────────────────────────────────────────────────────  │
│  • TypeScript code for custom content                       │
│  • Mod system for extending game mechanics                  │
│  • Custom commands, objects, behaviors                      │
│  • Scriptable event handlers                                │
│  • Content packs and capability extensions                  │
└─────────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Content Management System (CMS)                   │
│  ─────────────────────────────────────────────────────────  │
│  • Visual tools for creating/editing game content           │
│  • WYSIWYG area builders                                    │
│  • Quest/dialogue editors                                   │
│  • Asset management                                         │
└─────────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Game Content (Built-in, part of the product)      │
│  ─────────────────────────────────────────────────────────  │
│  • Skills system (domain-agnostic progression mechanics)    │
│  • Guild system (organizational affiliations)               │
│  • Race system (character types/abilities)                  │
│  • Areas/locations (actual game world geography)            │
│  • NPCs, quests, items (game content)                       │
│                                                              │
│  These are PART OF the MUD, not mods!                    │
│  They use domain-agnostic mechanics with themeable flavor   │
└─────────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Game Driver (Core MUD Engine)                     │
│  ─────────────────────────────────────────────────────────  │
│  ★ THIS IS WHAT PHASES 0-10 BUILD ★                         │
│                                                              │
│  • Standard Model (Stuff → Idea/Agent/Thing/Location)       │
│  • Command System (parsing, discovery, execution)           │
│  • Persistence Layer (MongoDB integration)                  │
│  • Object Lifecycle (create, clone, destroy, GC)            │
│  • Message Protocol (WebSocket communication)               │
│  • Event System (pub/sub)                                   │
│  • Mixin Framework (composition)                            │
│  • API Layer (utilities)                                    │
│  • Authentication/Sessions                                  │
│  • Module Hot-Reloading                                     │
└─────────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### Layer 1: Game Driver (Our Focus for Phases 0-10)

The **Game Driver** is the low-level engine that makes everything work. It knows NOTHING about skills, guilds, races, or any game content. It only knows about:

- **Objects**: Creating, tracking, destroying, persisting them
- **Commands**: Parsing user input, discovering available commands, executing them
- **Communication**: WebSocket protocol, message routing, pub/sub events
- **Containment**: Objects can contain other objects (inventory, location)
- **Movement**: Objects can move between containers
- **Properties**: Objects have dynamic properties and state
- **Persistence**: Objects save/load from database
- **Security**: Authentication, session management, access control

Think of this as the "operating system" of the MUD. It provides the primitives that everything else builds on.

### Layer 2: Game Content (Built-in Features)

The **Game Content** layer includes all the actual game mechanics and content that ship with the product:

- **Skills System**: Characters can learn skills, gain XP, level up. The mechanics are domain-agnostic (XP, levels, prerequisites) but the skill names/descriptions are themeable.
- **Guild System**: Characters can join organizations, earn ranks, access guild facilities. The mechanics are domain-agnostic (membership, hierarchy, permissions) but guild themes vary.
- **Race System**: Character types with different abilities. The mechanics are domain-agnostic (stat modifiers, special abilities) but race flavor varies.
- **Areas**: The actual game world - rooms, buildings, landscapes, NPCs, quests, items.

**Critical Point**: These are NOT mods. These are core features of the MUD that ship with it. They're "domain-agnostic" in the sense that they use generic mechanics (XP, membership, stats) rather than hardcoded business logic, but they ARE game content.

### Layer 3: Content Management System (Future)

The **CMS** provides visual tools for non-programmers to create and edit game content:

- Drag-and-drop room builders
- Quest editors with branching dialogue trees
- Item/NPC templates with form-based editing
- Asset uploads (images, sounds, etc.)

This layer generates YAML templates and TypeScript code that Layer 2 consumes.

### Layer 4: Modding Layer (Future)

The **Modding Layer** allows power users to extend the game with custom content and capabilities:

**Content Mods** (templates only):
- Areas, rooms, NPCs, items
- No custom code - pure data/configuration

**Capability Mods** (code + templates):
- Custom command definitions
- Custom object types (new blueprints)
- Event handlers and triggers
- Scripted behaviors

**Full Mods** (both):
- Complete game extensions (e.g., Narnia mod with custom rooms AND magic wardrobe class)

This layer uses the mod API to load custom code into the game at runtime. All mod code runs within isolated-vm for security (see Framework 12: Code Isolation & Sandboxing).

### Layer 5: Integration Layer (Domain-Specific)

The **Integration Layer** is where domain specificity lives. This layer connects external business systems to the MUD:

**Education Example (study.com integration)**:
```typescript
// External event: User completes a calculus course
ExternalSystem.onCourseComplete(courseId: "CALC101") →
  IntegrationAdapter.mapToGameEvent() →
    GameEvent.gainSkillXP(skillId: "mathematics", xp: 100)
```

**Retail Example (safeway.com integration)**:
```typescript
// External event: User purchases organic produce
ExternalSystem.onPurchase(category: "organic_produce") →
  IntegrationAdapter.mapToGameEvent() →
    GameEvent.acquireItem(itemId: "organic_carrots") +
    GameEvent.advanceQuest(questId: "healthy_eating")
```

**Municipal Example (sunnyvale.gov integration)**:
```typescript
// External event: Resident pays utility bill on time
ExternalSystem.onBillPayment(status: "on_time") →
  IntegrationAdapter.mapToGameEvent() →
    GameEvent.earnAchievement(achievementId: "responsible_citizen") +
    GameEvent.addGuildReputation(guildId: "city_council", amount: 10)
```

The integration adapters are separate packages (e.g., `@saxonberg/integration-education`, `@saxonberg/integration-retail`) that customer implementations install and configure.

## Data Flow Example: Education Platform

1. **External System**: Student completes "Introduction to Python" course on study.com
2. **Integration Adapter**: Receives webhook, maps to game event
3. **Game Content**: Skills system processes XP gain for "programming" skill
4. **Game Driver**: Persists skill XP change, triggers level-up event if threshold met
5. **Game Content**: Level-up grants new ability "Debug Code"
6. **Game Driver**: Notifies user via message protocol
7. **Client**: Displays "You have gained a level in Programming! New ability: Debug Code"

## Scope of This Plan

**Phases 0-10 build Layer 1 (Game Driver)**.

Future phases will add:
- **Phase 11+**: Layer 2 (Game Content) - skills, guilds, races, areas
- **Phase 15+**: Layer 3 (CMS) - visual content creation tools
- **Phase 18+**: Layer 4 (Modding Layer) - mod API and mod system
- **Phase 20+**: Layer 5 (Integration) - domain-specific adapters

By the end of Phase 10, we'll have a working MUD engine that can:
- Authenticate users
- Create/persist characters
- Navigate between locations
- Execute commands
- Communicate with other players

But it won't have skills, guilds, or external integrations yet - those come in later phases as we build upward through the stack.

---

# General Guidelines (Apply to ALL Phases)

These principles should be followed throughout the entire build:

## Architectural Principles

1. **Domain Agnosticism (Layered)**: The system achieves domain agnosticism through layering:
   - **Game Driver (Phases 0-10)**: Completely domain-agnostic. No knowledge of skills, guilds, or business logic. Only provides primitives (objects, commands, persistence, messaging).
   - **Game Content (Phase 11+)**: Domain-agnostic mechanics with themeable flavor. Skills, guilds, and races use generic progression systems (XP, membership, stats) without hardcoded business processes.
   - **Integration Layer (Phase 20+)**: Fully domain-specific. Adapters map external business events (course completion, purchases, service usage) to generic game events (XP gain, item acquisition, quest progress).

   **Key Insight**: The MUD includes game content (skills, guilds, areas) as built-in features, but the business integration happens through adapters that are separate from the core product.

2. **Layer Separation**: Maintain strict separation between:
   - Services Layer (WebSocket, Auth, HTTP)
   - Backend Layer (network I/O, session management)
   - Application Layer (game state, object management)
   - Mudlib Layer (game objects, commands, APIs)
   - Mod Layer (custom extensions and content)

3. **Composition Over Inheritance**: Prefer mixins for adding functionality rather than deep class hierarchies.

4. **Interface-Based Contracts**: Use TypeScript interfaces to define contracts between layers (IBackend, ICommand, etc.)

5. **Singleton Pattern**: Use singletons for global system services (Application, Backend, PersistenceManager). Use static APIs for stateless utilities (StuffApi, MessageApi, EventApi).

6. **Separation of Concerns**: Each singleton has a clear, focused responsibility:
   - **Application**: Game state coordination (connections, message routing)
   - **Backend**: I/O layer (WebSocket, external services)
   - **StuffApi**: Object management (registry, creation, lookup)
   - **PersistenceManager**: Database operations (CRUD, connections)

7. **Synchronization Pattern**: Maintain clear separation between runtime objects (Avatar, Interactive) and persistent objects (Player, User)

## Code Quality Standards

1. **TypeScript Strict Mode**: All code in strict mode with no `any` without justification
2. **ESLint**: Enforce consistent code style across all packages
3. **No Circular Dependencies**: Use interfaces and forward declarations to break circular imports
4. **Comprehensive JSDoc**: All public APIs must have JSDoc comments
5. **Type Safety**: Leverage TypeScript's type system fully; avoid type assertions unless necessary

## Testing Strategy

1. **Test Infrastructure**: Set up testing framework (Jest) in Phase 0
2. **Unit Tests**: Write unit tests for all API modules and utility functions
3. **Integration Tests**: Test WebSocket communication, command processing, persistence
4. **E2E Tests**: Test full user flows (auth → connect → command → navigate)

## Documentation Standards

1. **TypeDoc**: Generate API documentation automatically from code
2. **Architecture Docs**: Maintain architecture documentation in markdown
3. **CLAUDE.md**: Update CLAUDE.md as architecture evolves
4. **Framework Guides**: Document each framework's design and usage patterns
5. **Mod Guides**: Document mod development patterns and APIs

## Monorepo Structure

```
saxonberg/
├── pnpm-workspace.yaml
├── package.json (root with workspace scripts)
├── tsconfig.base.json
├── .eslintrc.js
├── .gitignore
├── packages/
│   ├── types/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts
│   ├── server/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts (entry point)
│   │       ├── services/      # Services Layer
│   │       │   ├── Server.ts
│   │       │   ├── websocket/
│   │       │   └── auth/
│   │       ├── backend/       # Backend/Application Layer
│   │       │   ├── Backend.ts
│   │       │   ├── Application.ts
│   │       │   ├── IBackend.ts
│   │       │   ├── PersistenceManager.ts
│   │       │   └── ApplicationInstance.ts
│   │       ├── mud/           # Mudlib Layer
│   │       │   ├── api/       # API Layer
│   │       │   ├── lib/       # Standard Model, mixins, frameworks
│   │       │   │   ├── stuff/
│   │       │   │   ├── identity/
│   │       │   │   ├── location/
│   │       │   │   ├── command/
│   │       │   │   └── message/
│   │       │   └── obj/       # Instantiable objects
│   │       └── mods/       # Domain mod system
│   └── client/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── components/
│           ├── services/
│           └── store/
└── docs/                      # Generated documentation
```

## Singleton Architecture & Separation of Concerns

### Design Philosophy

**One game server = One Application = One Backend**. The panterasbot multi-backend/multi-application design was unnecessary complexity that led to poor design decisions. We use explicit singletons with clear responsibilities.

### Core Singletons

**Application** (Game State Coordinator)
```typescript
class Application {
  private static instance: Application;
  private backend: Backend;
  private interactivesBySocketId: Map<string, Interactive>;
  private startingRoom: Location;

  static get(): Application {
    if (!this.instance) {
      this.instance = new Application();
    }
    return this.instance;
  }

  // Game coordination only
  handleUserConnect(userId: string, sessionId: string, socketId: string): void { ... }
  handleUserDisconnect(socketId: string): void { ... }
  processUserMessage(socketId: string, message: any): void { ... }
}
```
**Responsibilities:**
- User connection lifecycle
- Message routing between client and game
- Interactive tracking (connections)
- Initial game state (starting room)
- NOT: Object registry, persistence, I/O

**Backend** (I/O Layer)
```typescript
class Backend {
  private static instance: Backend;
  private wss: WebSocket.Server;

  static get(): Backend {
    if (!this.instance) {
      this.instance = new Backend();
    }
    return this.instance;
  }

  // I/O operations only
  sendMessageToSocket(socketId: string, message: any): void { ... }
  handleWebSocketConnect(ws: WebSocket, userId: string, sessionId: string): void { ... }
}
```
**Responsibilities:**
- WebSocket server management
- Message serialization/deserialization
- Network I/O
- NOT: Game logic, object management

**PersistenceManager** (Database Layer)
```typescript
class PersistenceManager {
  private static instance: PersistenceManager;
  private db: Db;

  static get(): PersistenceManager {
    if (!this.instance) {
      this.instance = new PersistenceManager();
    }
    return this.instance;
  }

  // Database operations only
  async save(collection: string, doc: any): Promise<void> { ... }
  async findById(collection: string, id: string): Promise<any> { ... }
  async find(collection: string, query: any): Promise<any[]> { ... }
}
```
**Responsibilities:**
- MongoDB connection management
- CRUD operations
- Connection pooling
- NOT: Game logic, object tracking

### Static API Classes (Stateless Utilities)

**StuffApi** (Object Management)
```typescript
class StuffApi {
  // Object registry (static = effectively singleton)
  private static objectsById: Map<string, Stuff> = new Map();
  private static avatarsByPlayerId: Map<string, Avatar> = new Map();
  private static destroyedObjects: WeakMap<Stuff, DestroyedObjectMetadata> = new WeakMap();

  // Object lifecycle
  static register(object: Stuff): void {
    this.objectsById.set(object.stuffId, object);
    if (object instanceof Avatar) {
      this.avatarsByPlayerId.set(object.player._id, object);
    }
  }

  static unregister(object: Stuff): void {
    this.objectsById.delete(object.stuffId);
    if (object instanceof Avatar) {
      this.avatarsByPlayerId.delete(object.player._id);
    }

    // Track for debugging
    this.destroyedObjects.set(object, {
      stuffId: object.stuffId,
      destroyedAt: new Date()
    });
  }

  // Object lookup
  static findById(stuffId: string): Stuff | undefined {
    const obj = this.objectsById.get(stuffId);
    if (obj?.isDestroyed()) {
      this.objectsById.delete(stuffId);
      return undefined;
    }
    return obj;
  }

  static findAvatarByPlayerId(playerId: string): Avatar | undefined {
    return this.avatarsByPlayerId.get(playerId);
  }

  // Object creation
  static generateId(): string { /* shortuuid */ }
  static async clone(templateKey: string): Promise<Stuff> { /* load & instantiate */ }
}
```
**Responsibilities:**
- Object registry (objectsById, avatarsByPlayerId)
- Object creation (clone, generateId)
- Object lookup (findById, findAvatarByPlayerId)
- Destroyed object tracking
- NOT: Game coordination, I/O, persistence

**Other Static APIs:**
- `MessageApi`: Message sending utilities
- `EventApi`: Pub/sub event system
- `PersistApi`: Persistence utilities (auto-sync)
- `GrammarApi`, `StringApi`, etc.: Pure utility functions

### Why This Separation?

**Prevents bloat:**
- Application doesn't become a dumping ground
- Each singleton has 10-20 methods, not 100+
- Clear ownership of functionality

**Easy to find things:**
- "Where's object tracking?" → StuffApi
- "Where's WebSocket?" → Backend
- "Where's connection lifecycle?" → Application
- "Where's database?" → PersistenceManager

**Clear dependencies:**
```typescript
Application → Backend (for I/O)
Application → StuffApi (for object lookup)
StuffApi → PersistenceManager (for loading templates)
Backend → Application (for game events)
```

**No indirection:**
```typescript
// Clean - direct singleton access
Application.get().handleUserConnect(...)
Backend.get().sendMessageToSocket(...)
StuffApi.findById(stuffId)
PersistenceManager.get().save(...)

// NOT: ApplicationInstance.get().backend (extra wrapper)
```

### Object Registration Pattern

**Automatic registration in constructor:**
```typescript
class Stuff {
  stuffId: string;

  constructor() {
    this.stuffId = StuffApi.generateId();
    StuffApi.register(this); // Auto-register
  }

  destroy(): void {
    StuffApi.unregister(this); // Auto-unregister
    // ... cleanup
  }
}
```

**Usage:**
```typescript
// Creating objects
const avatar = new Avatar(player);
// Already registered by constructor

// Finding objects
const avatar = StuffApi.findAvatarByPlayerId(playerId);
const object = StuffApi.findById(stuffId);

// Application coordinates, doesn't track objects
Application.get().handleUserConnect(userId, sessionId, socketId);
```

### Responsibility Matrix

| Concern | Owner | Why |
|---------|-------|-----|
| Object registry (objectsById) | StuffApi | Already manages object creation |
| Avatar lookup (avatarsByPlayerId) | StuffApi | Specialized object query |
| Destroyed tracking | StuffApi | Object lifecycle |
| Connection tracking (interactivesBySocketId) | Application | Game coordination |
| Starting room | Application | Game state |
| WebSocket server | Backend | I/O |
| MongoDB connection | PersistenceManager | Database |
| Message routing | Application | Game coordination |
| Network I/O | Backend | I/O layer |

### Anti-Patterns to Avoid

❌ **Don't**: Put object registry in Application
```typescript
class Application {
  objectsById: Map<string, Stuff>; // NO - Application bloat
}
```

✅ **Do**: Put in StuffApi (already manages objects)
```typescript
class StuffApi {
  private static objectsById: Map<string, Stuff>; // YES - logical home
}
```

❌ **Don't**: Use wrapper singletons
```typescript
ApplicationInstance.get().backend // NO - indirection
```

✅ **Do**: Direct singleton access
```typescript
Application.get().backend // YES - direct
Backend.get() // YES - also direct
```

❌ **Don't**: Mix concerns
```typescript
class Application {
  sendWebSocketMessage() { ... } // NO - that's Backend's job
}
```

✅ **Do**: Delegate to correct singleton
```typescript
class Application {
  processUserMessage(socketId, message) {
    // ... game logic ...
    Backend.get().sendMessageToSocket(socketId, response);
  }
}
```

## Environment Configuration

Required environment variables for all deployments:
- `MONGODB_URI`: MongoDB connection string
- `GOOGLE_CLIENT_ID`: OAuth client ID
- `GOOGLE_CLIENT_SECRET`: OAuth client secret
- `GOOGLE_CALLBACK_URL`: OAuth callback URL
- `SESSION_SECRET`: Session encryption secret
- `NODE_ENV`: development | production
- `PORT`: Server port (default: 3005)
- `CLIENT_URL`: Client URL for CORS
- `AWS_REGION`: AWS region (default: us-west-2) - for staging/production only

**Configuration Sources** (in order of precedence):
1. **Local development**: `.env` file (not committed to git)
2. **Staging/Production**: AWS Parameter Store (`/saxonberg/{NODE_ENV}/`) + AWS Secrets Manager
3. **Fallback**: AWS Parameter Store (`/saxonberg/default/`)

See "AWS Infrastructure & Deployment" section below for details on AWS-based configuration management.

## Technology Stack

- **Language**: TypeScript (strict mode)
- **Package Manager**: pnpm with workspaces
- **Server**: Node.js, Express, WebSocket (ws library)
- **Database**: MongoDB (native driver)
- **Client**: React, Zustand, styled-components, Vite
- **Authentication**: Google OAuth2, Passport.js, express-session
- **Code Isolation**: isolated-vm (V8 sandboxing for untrusted code)
- **Testing**: Jest, React Testing Library
- **Documentation**: TypeDoc
- **Code Quality**: ESLint, Husky
- **Deployment**: Docker, AWS CodeDeploy, GitLab CI/CD
- **Infrastructure**: AWS (EC2, S3, Parameter Store, Secrets Manager)
- **Future**: CloudWatch, Auto Scaling, CloudFront

---

# AWS Infrastructure & Deployment

This section documents the AWS services and deployment infrastructure. The setup from panterasbot legacy can be revived/updated for this project.

## AWS Services Used

### 1. AWS Systems Manager (SSM) Parameter Store

**Purpose**: Store non-sensitive configuration parameters with hierarchical organization and environment-based overrides.

**Parameter Structure**:
```
/saxonberg/default/          # Default parameters (fallback)
  ├── secret_id         # Points to Secrets Manager secret
  ├── mongodb_uri       # Default MongoDB connection
  ├── client_url        # Default client URL
  └── ... other configs

/saxonberg/development/      # Development-specific overrides
  ├── mongodb_uri       # Dev MongoDB connection
  └── ... dev configs

/saxonberg/production/       # Production-specific overrides
  ├── mongodb_uri       # Prod MongoDB connection
  └── ... prod configs
```

**Parameter Resolution**:
- First check environment-specific path (`/saxonberg/{NODE_ENV}/`)
- Fall back to default path (`/saxonberg/default/`)
- This allows environment-specific overrides while maintaining sensible defaults

### 2. AWS Secrets Manager

**Purpose**: Store sensitive credentials (API keys, session secrets, OAuth credentials).

**Structure**:
```json
{
  "GOOGLE_CLIENT_ID": "...",
  "GOOGLE_CLIENT_SECRET": "...",
  "SESSION_SECRET": "...",
  "NPM_TOKEN": "...",
  "OTHER_SECRETS": "..."
}
```

**Access Pattern**:
1. Get `secret_id` parameter from Parameter Store
2. Use `secret_id` to fetch secret bundle from Secrets Manager
3. Parse JSON and inject into environment

### 3. AWS CodeDeploy

**Purpose**: Automated deployment to EC2 instances with health checks and rollback capability.

**Deployment Process**:
1. **ApplicationStop**: Stop existing Docker container
2. **BeforeInstall**: Pull new Docker image from GitLab registry
3. **ApplicationStart**: Start new Docker container with environment config
4. **ValidateService**: Health check via HTTP endpoint

**Configuration Files**:
- `appspec.yml`: Defines deployment lifecycle hooks
- `aws/create_deployment.json`: CodeDeploy deployment configuration
- `aws/s3_push.json`: S3 artifact upload configuration

### 4. AWS S3

**Purpose**:
- Store deployment artifacts (zipped application bundles)
- Potentially store static assets in future (images, audio, etc.)

**Bucket Structure**:
```
panterasbox-artifacts/  (or saxonberg-artifacts/)
  ├── saxonberg-{commit-sha}.zip
  └── ... other versions
```

### 5. AWS EC2

**Purpose**: Host the application in Docker containers.

**Setup** (from legacy):
- Docker installed on EC2 instance
- CodeDeploy agent running
- AWS credentials mounted at `/var/aws/etc/saxonberg` (bind mount into container)
- Application logs at `/var/log/docker/saxonberg.log`

## Deployment Scripts

All scripts are located in the `aws/` directory and referenced by `appspec.yml`.

### stop_container.sh
```bash
#!/bin/bash
# Stop and remove existing container
# Clean up unused Docker resources
```

### pull_image.sh
```bash
#!/bin/bash
# Pull latest Docker image from registry
# Uses %TAG% placeholder replaced by CI/CD
```

### start_container.sh
```bash
#!/bin/bash
# Run new container with:
# - Port mapping (3005:3005)
# - AWS credentials bind mount
# - Container name
# - Log streaming to file
```

### validate_container.sh
```bash
#!/bin/bash
# Health check via curl to localhost:3005
# Returns exit code 0 on success
# Triggers rollback on failure
```

## CI/CD Pipeline (GitLab CI)

The deployment pipeline consists of three stages:

### Stage 1: Build
1. Build Docker image with multi-stage build
2. Tag with commit SHA and 'latest'
3. Push to GitLab Container Registry

### Stage 2: Production EC2 Deployment
1. Replace `%TAG%` placeholders in AWS scripts with commit SHA
2. Push deployment bundle to S3
3. Create CodeDeploy deployment
4. CodeDeploy executes lifecycle hooks on EC2

### Stage 3: Documentation (Optional)
1. Generate TypeDoc documentation
2. Deploy to GitLab Pages

## AWS SDK Integration

### Server-Side Module: `util/aws.ts`

**Note**: Legacy code uses AWS SDK v2. Consider migrating to AWS SDK v3 (modular packages).

```typescript
// Legacy (AWS SDK v2)
import * as AWS from "aws-sdk";
const ssm = new AWS.SSM();
const secretsManager = new AWS.SecretsManager();
const s3 = new AWS.S3();

// Modern (AWS SDK v3) - recommend for new implementation
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { S3Client } from "@aws-sdk/client-s3";
```

**Key Functions**:

```typescript
// Get single parameter with environment fallback
getParameter(name: string): Promise<string | undefined>
  // Checks: /saxonberg/{NODE_ENV}/name → /saxonberg/default/name

// Get all parameters for current environment
getParameters(): Promise<{ [key: string]: string }>
  // Merges default + environment-specific parameters

// Get secrets bundle from Secrets Manager
getSecrets(): Promise<{ [key: string]: string }>
  // Gets secret_id from Parameter Store
  // Fetches JSON secret bundle
  // Parses and returns key-value map

// S3 utilities
getS3Uri(bucket: string, key: string): string
  // Returns: s3://bucket/key

getS3Url(bucket: string, key: string): string
  // Returns: https://bucket.s3.region.amazonaws.com/key
```

## Environment Variable Setup

The application should load config in this order:
1. **Local .env file** (development only, not committed)
2. **SSM Parameter Store** (all environments)
3. **Secrets Manager** (sensitive values)

Example initialization:
```typescript
// server/src/index.ts
import { getParameters, getSecrets } from './util/aws';

async function loadConfig() {
  if (process.env.NODE_ENV !== 'local') {
    // Load from AWS
    const params = await getParameters();
    const secrets = await getSecrets();

    // Merge into process.env
    Object.assign(process.env, params, secrets);
  }
}

await loadConfig();
// Now start server with process.env fully populated
```

## Docker Configuration

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Build application
COPY . .
RUN pnpm build

EXPOSE 3005

CMD ["pnpm", "start"]
```

### Docker Run Command (from start_container.sh)
```bash
docker run -d \
  -p 3005:3005 \
  --mount type=bind,src=/var/aws/etc/saxonberg,dst=/root/.aws \
  --name saxonberg \
  registry.gitlab.com/panterasbox/saxonberg:${TAG}

docker logs -f saxonberg >> /var/log/docker/saxonberg.log 2>&1 &
```

## Security Considerations

1. **IAM Roles**: EC2 instance should have IAM role with policies for:
   - SSM Parameter Store read access (`/saxonberg/*`)
   - Secrets Manager read access (specific secret ARN)
   - S3 read access (artifacts bucket)
   - CodeDeploy integration

2. **Secrets Rotation**: Use Secrets Manager rotation for long-term credentials

3. **Parameter Store Encryption**: Consider using SecureString parameters with KMS

4. **Container Security**:
   - Non-root user in container
   - Read-only filesystem where possible
   - Network policies/security groups

## Migration Notes from Legacy

### Changes Needed:
1. **AWS SDK v2 → v3**: Migrate to modular SDK packages for smaller bundle size
2. **Parameter Paths**: Update from `/panterasbot/` to `/saxonberg/`
3. **Port**: Change from 2050 to 3005 (or keep configurable)
4. **S3 Bucket**: Create new bucket or reuse (decision needed)
5. **CodeDeploy Application**: Create new application or reuse
6. **Docker Registry**: Confirm GitLab registry location
7. **EC2 Instance**: Provision new instance or repurpose existing

### AWS CLI Commands for Setup:

```bash
# Create Parameter Store parameters
aws ssm put-parameter \
  --name /saxonberg/default/secret_id \
  --value "saxonberg-secrets" \
  --type String

aws ssm put-parameter \
  --name /saxonberg/default/mongodb_uri \
  --value "mongodb://localhost:27017/saxonberg" \
  --type String

# Create Secrets Manager secret
aws secretsmanager create-secret \
  --name saxonberg-secrets \
  --secret-string '{"GOOGLE_CLIENT_ID":"...","GOOGLE_CLIENT_SECRET":"...","SESSION_SECRET":"..."}'

# Create S3 bucket
aws s3 mb s3://saxonberg-artifacts --region us-west-2

# Create CodeDeploy application
aws deploy create-application \
  --application-name saxonberg \
  --compute-platform Server
```

## Development vs Production

**Local Development**:
- Use `.env` file only
- No AWS services required
- MongoDB running locally or via Docker

**Staging/Production**:
- AWS Parameter Store for config
- AWS Secrets Manager for credentials
- CodeDeploy for automated deployment
- EC2 instances running Docker containers
- CloudWatch for logs (future enhancement)

## Future Enhancements

Consider adding in later phases:
- **CloudWatch Logs**: Centralized log aggregation
- **Application Load Balancer**: Multi-instance deployment
- **Auto Scaling**: Scale based on user load
- **CloudFront**: CDN for client assets
- **RDS**: Managed MongoDB alternative (DocumentDB)
- **ElastiCache**: Redis for session store/caching
- **CloudFormation/Terraform**: Infrastructure as Code

---

# Support Frameworks (Foundational Systems)

These are the core frameworks that features are built on top of. We'll define requirements for each framework iteratively as we need them.

**Note on Framework Ordering**: Frameworks are ordered by build dependency - the order in which they must be implemented, not conceptual grouping.

## Framework 1: Markup Language (Accessible Message Formatting)

### Purpose
Define a custom markup language for all game messages to ensure accessibility and consistent formatting across all output.

### Design Philosophy

**Core Principle**: Every message that passes between client and server MUST have a string representation containing markup. This ensures:
- Screen reader accessibility
- Consistent styling across clients
- Separation of content from presentation
- Future extensibility (web, mobile, terminal clients)

**Markup Types**:
1. **Formal (Formatting) Tags**: Visual and structural formatting (`<bold>`, `<italic>`, `<color>`, `<output>`, `<prompt>`)
2. **Semantic (Abstract) Tags**: Content meaning (`<name>`, `<object>`, `<location>`, `<speech>`, `<tell>`)

### Requirements (Phase 1-3: MVP Basics)

**MVP Tag Set** (minimal for initial implementation):
```typescript
// Formal (formatting) tags - structural/visual
<output type="speech|tell|system|error|command">...</output>
<prompt>...</prompt>
<bold>...</bold>                // Optional in MVP
<italic>...</italic>            // Optional in MVP

// Semantic (abstract) tags - content meaning
<name>Alice</name>              // Character/NPC names
<object>sword</object>          // In-game objects
<location>The Void</location>   // Location names
<speech>Hello!</speech>         // Spoken text
<tell>Private message</tell>    // Direct messages
```

**Example Messages**:
```typescript
// Say command output
"<name>Alice</name> says, <speech>'Hello, everyone!'</speech>"

// Tell command output
"<name>Bob</name> tells you, <tell>'How are you?'</tell>"

// Look command output
`<output type="system">
<location>The Void</location>

You find yourself in a featureless void...

Also here: <name>Alice</name>, <name>Bob</name>
</output>`

// Error message
"<output type="error">You don't see '<object>sword</object>' here.</output>"
```

**Parsing & Rendering**:
```typescript
// Server-side: MessageApi wraps content in markup
class MessageApi {
  static formatSpeech(speaker: string, message: string): string {
    return `<name>${speaker}</name> says, <speech>'${escape(message)}'</speech>`;
  }

  static formatTell(sender: string, message: string): string {
    return `<name>${sender}</name> tells you, <tell>'${escape(message)}'</tell>`;
  }

  static formatError(message: string): string {
    return `<output type="error">${message}</output>`;
  }
}

// Client-side: Renderer converts markup to styled components
class MarkupRenderer {
  render(markup: string): React.ReactNode {
    // Parse markup tags
    // Convert to styled React components
    // Apply colors, fonts, accessibility attributes
  }
}
```

**Escaping Rules**:
- User input MUST be escaped before inclusion in markup
- Tag delimiters: `<` becomes `&lt;`, `>` becomes `&gt;`
- Quotes: `'` becomes `&apos;`, `"` becomes `&quot;`
- Ampersands: `&` becomes `&amp;`

**Accessibility Requirements**:
- All semantic tags have aria-label equivalents
- Screen readers announce context (name, object type, etc.)
- Color is never the only indicator (always paired with semantic tags)

### Requirements (Phase 5+: Extended Formatting)

**Additional Semantic (Abstract) Tags**:
```typescript
<command>look</command>          // Command text
<direction>north</direction>     // Exit directions
<item>rusty sword</item>         // Inventory items
<exit>wooden door</exit>         // Exits and doors
<npc>merchant</npc>              // NPCs
<player>Alice</player>           // Player characters
<quantity>5</quantity>           // Quantities
```

**Additional Formal (Formatting) Tags**:
```typescript
<color value="#ff0000">...</color>
<size value="large|small">...</size>
<link href="...">...</link>      // Clickable elements
<image src="..."/>               // Inline images (Phase 7+)
```

**Rich Content Blocks**:
```typescript
<panel title="Inventory">
  <item>rusty sword</item>
  <item>health potion (5)</item>
</panel>

<table>
  <row>
    <cell>Stat</cell>
    <cell>Value</cell>
  </row>
  <row>
    <cell>Health</cell>
    <cell>100</cell>
  </row>
</table>
```

### Requirements (Phase 9+: Advanced Features)

**Dynamic Content**:
```typescript
<progress value="75" max="100"/>
<meter value="50" min="0" max="100"/>
<countdown seconds="30"/>
```

**Interactive Elements**:
```typescript
<button action="get sword">Take Sword</button>
<form>
  <input name="amount" type="number"/>
  <submit action="transfer"/>
</form>
```

**Client-Specific Hints**:
```typescript
<client-hint type="mobile">
  <abbreviated>N, S, E, W</abbreviated>
  <full>North, South, East, West</full>
</client-hint>
```

### Markup API (MarkupApi)

**Server-Side Utilities**:
```typescript
class MarkupApi {
  // Wrapping utilities
  static wrap(tag: string, content: string, attrs?: Record<string, string>): string;
  static wrapName(name: string): string;
  static wrapObject(objectName: string): string;
  static wrapSpeech(text: string): string;

  // Escaping utilities
  static escape(text: string): string;
  static unescape(text: string): string;

  // Parsing utilities
  static parse(markup: string): MarkupNode[];
  static stripTags(markup: string): string;  // For plain text (logging, etc.)

  // Validation
  static validate(markup: string): ValidationResult;
}
```

**Client-Side Renderer**:
```typescript
class MarkupRenderer {
  render(markup: string): React.ReactNode;
  registerCustomTag(tag: string, renderer: TagRenderer): void;
  setTheme(theme: MarkupTheme): void;
}

interface MarkupTheme {
  colors: {
    name: string;
    object: string;
    speech: string;
    tell: string;
    error: string;
    system: string;
  };
  fonts: {
    body: string;
    speech: string;
    code: string;
  };
}
```

### Testing Strategy

**Unit Tests**:
- Tag parsing (nested tags, attributes, self-closing)
- Escaping/unescaping (special characters, edge cases)
- Markup validation (unclosed tags, invalid nesting)

**Integration Tests**:
- Server sends marked-up messages
- Client renders correctly
- Screen reader announces semantic tags
- Color contrast meets WCAG standards

**Examples for Testing**:
```typescript
// Nested tags
"<name><bold>Alice</bold></name> says, <speech>'Hello!'</speech>"

// Attributes
"<color value=\"#ff0000\">Red text</color>"

// Self-closing
"<image src=\"/images/sword.png\"/>"

// Escaping
"Alice says, <speech>'I have &lt;5&gt; potions &amp; 3 swords'</speech>"
```

### Future Considerations

**Extensibility**:
- Plugin-defined custom tags (e.g., `<edu:course>`, `<retail:product>`)
- Domain-specific semantic tags loaded from plugins
- Theme system for different clients/accessibility needs

**Performance**:
- Markup parsing cached on client
- Lazy rendering for long message buffers
- Streaming markup for real-time updates

**Alternative Formats**:
- JSON representation for machine parsing
- Plain text fallback for logs
- LaTeX/Markdown conversion for external tools

---

## Framework 2: Message Protocol (Client-Server Communication)

### Purpose
Define how client and server communicate over WebSocket using Markup Language for all output.

### Requirements (Phase 1)

**Message Format**
```typescript
interface WebSocketMessage {
  type: string;           // Message type identifier
  payload: any;           // Message-specific data
  id?: string;            // Optional message ID for request/response pairing
  error?: string;         // Optional error message
}
```

**Message Types** (Initial)
- `connection_established`: Server → Client (auth status, user info)
- `echo`: Bidirectional test message
- `ping`: Client → Server (heartbeat)
- `pong`: Server → Client (heartbeat response)
- `error`: Server → Client (error notification)
- `command`: Client → Server (user command input)
- `output`: Server → Client (command response/game output)

**Message Routing Rules**
- All messages are JSON-encoded
- Server validates message format before processing
- Invalid messages return `error` type response
- Client handlers registered by message type

**Future Extensions**
- XML-based rich content in payload (Phase 5+)
- Topic-based routing for pub/sub (Phase 5+)
- Message queuing and batching (Phase 9)

---

## Framework 3: Persistence Framework

### Purpose
Define how game objects are saved to and loaded from MongoDB with automatic field collection from mixins, reducing boilerplate and preventing bugs.

### Design Philosophy

**Problem**: Manual sync methods are error-prone:
- Add new field → easy to forget to sync it → silent data loss
- Mixin adds field → must update all classes using that mixin
- Complex types need transformation (Stuff → stuffId, Location → templateKey)
- Repetitive boilerplate for every persistent class

**Solution**: Hybrid approach combining auto-collection from mixins with explicit handlers for complex types.

### Common Use Cases

1. **PC Disconnect/Reconnect** (Very Frequent): Auto-sync all fields
2. **Add New Stat** (Rare but Critical): Just add to field list, auto-syncs
3. **Mixin Adds Field** (Rare): Mixin declares once, all users get it automatically
4. **Complex Types** (Always): Explicit handlers for references, arrays, Maps
5. **Transient Fields** (Common): Simply don't add to persistent fields list

### Core Architecture

**Three Components**:
1. **Mixins declare their fields**: Each mixin lists its persistent fields
2. **Classes declare their fields**: Each class lists its own persistent fields
3. **Complex type handlers**: Explicit to/from transformations

**Auto-collection**: Fields from all mixins + class combined automatically

### Requirements (Phase 1-2)

**PersistenceManager** (Singleton)
- MongoDB connection management
- CRUD operations: `save()`, `findById()`, `find()`, `delete()`
- Collection management
- Error handling and retry logic
- Connection pooling (Phase 9)

**Persistable Pattern**
```typescript
interface Persistable {
  _id?: string;                    // MongoDB ObjectId
  save(): Promise<void>;           // Save to database
  static findById(id: string): Promise<T | null>;
  static find(query: object): Promise<T[]>;
  delete(): Promise<void>;         // Delete from database
}
```

**Collections**
- `users`: User accounts
- `players`: Player characters (embeds Character data)
- `google_profiles`: OAuth data
- `npcs`: NPC state (optional, rarely used)
- Future collections as needed

**Runtime vs Persistent Objects**
- **Runtime Objects**: Avatar, Interactive, custom NPCs (exist only in memory)
- **Persistent Objects**: User, Player, GoogleProfile, NPC (saved to MongoDB)
- **Synchronization Pattern**: Runtime objects sync TO/FROM persistent objects automatically

### Mixin Field Declaration

**Mixins declare their persistent fields**:
```typescript
class NamedMixin {
  firstName: string = '';
  lastName: string = '';

  // Declare which fields should persist
  static persistentFields = ['firstName', 'lastName'];
}

class GenderedMixin {
  pronouns: Pronouns = Pronouns.They;

  static persistentFields = ['pronouns'];
}

// Any class using these mixins automatically gets their fields in sync
```

**Collecting mixin fields** (in MixinApi):
```typescript
class MixinApi {
  /**
   * Get all persistent fields from mixins applied to a class.
   * Walks the prototype chain collecting fields from all mixins.
   */
  static getMixinFields(constructor: any): string[] {
    const mixins = this.queryMixins(constructor);
    const fields: string[] = [];

    for (const mixin of mixins) {
      if (mixin.persistentFields) {
        fields.push(...mixin.persistentFields);
      }
    }

    return fields;
  }
}
```

### Class Field Declaration

**Classes declare their own fields + handlers for complex types**:
```typescript
class Avatar extends Character {
  player: Player;

  // Simple fields (primitives, enums)
  static persistentFields = ['xp', 'level', 'hp', 'maxHp'];

  // Complex type handlers (references, collections)
  static persistenceHandlers = {
    // Location reference: Runtime Location → templateKey
    location: {
      to: (location: Location | null) => location?.templateKey || null,
      from: async (key: string | null) =>
        key ? await StuffApi.clone(key) : null
    },

    // Inventory array: Runtime Thing[] → serialized data
    inventory: {
      to: (items: Thing[]) => items.map(item => ({
        stuffId: item.stuffId,
        templateKey: item.templateKey,
        modifications: item.getPersistentModifications?.() || {}
      })),
      from: async (data: any[]) => {
        const items = await Promise.all(
          data.map(d => StuffApi.clone(d.templateKey))
        );
        // Restore IDs and modifications
        items.forEach((item, i) => {
          item.stuffId = data[i].stuffId;
          item.applyModifications?.(data[i].modifications);
        });
        return items;
      }
    }
  };

  /**
   * Collect all persistent fields from mixins + self.
   */
  static getAllPersistentFields(): string[] {
    const mixinFields = MixinApi.getMixinFields(this);
    const ownFields = this.persistentFields || [];
    return [...mixinFields, ...ownFields];
  }
}
```

### PersistApi (Auto-Sync Utility)

**Automatic synchronization using field declarations**:
```typescript
class PersistApi {
  /**
   * Sync from runtime to persistent (save).
   * Auto-collects simple fields from mixins + class.
   * Applies complex type handlers.
   */
  static syncTo(source: any, target: any): void {
    const constructor = source.constructor;

    // 1. Auto-sync simple fields from mixins + class
    const simpleFields = constructor.getAllPersistentFields?.() || [];

    for (const field of simpleFields) {
      if (field in source && field in target) {
        target[field] = source[field];
      }
    }

    // 2. Apply complex type handlers
    const handlers = constructor.persistenceHandlers || {};

    for (const [field, handler] of Object.entries(handlers)) {
      if (handler.to && field in source) {
        target[field] = handler.to(source[field]);
      }
    }
  }

  /**
   * Sync from persistent to runtime (load).
   * Auto-collects simple fields from mixins + class.
   * Applies complex type handlers (may be async).
   */
  static async syncFrom(source: any, target: any): Promise<void> {
    const constructor = target.constructor;

    // 1. Auto-sync simple fields
    const simpleFields = constructor.getAllPersistentFields?.() || [];

    for (const field of simpleFields) {
      if (field in source && field in target) {
        target[field] = source[field];
      }
    }

    // 2. Apply complex type handlers (may be async)
    const handlers = constructor.persistenceHandlers || {};

    for (const [field, handler] of Object.entries(handlers)) {
      if (handler.from && field in source) {
        target[field] = await handler.from(source[field]);
      }
    }
  }

  /**
   * Legacy manual sync (deprecated - prefer auto-sync).
   */
  static syncToPersistable(source: any, target: any, properties: string[]): void {
    for (const prop of properties) {
      if (prop in source && prop in target) {
        target[prop] = source[prop];
      }
    }
  }

  /**
   * Legacy manual sync (deprecated - prefer auto-sync).
   */
  static syncFromPersistable(source: any, target: any, properties: string[]): void {
    for (const prop of properties) {
      if (prop in source && prop in target) {
        target[prop] = source[prop];
      }
    }
  }
}
```

### Usage Examples

**Avatar sync implementation**:
```typescript
class Avatar extends Character {
  player: Player;

  static persistentFields = ['xp', 'level', 'hp', 'maxHp'];
  static persistenceHandlers = { /* location, inventory */ };

  /**
   * Save runtime state to Player document.
   * All mixin fields + own fields + complex types synced automatically.
   */
  syncToPlayer(): void {
    PersistApi.syncTo(this, this.player);
    this.player.lastPlayed = new Date();
  }

  /**
   * Load Player document to runtime state.
   */
  async syncFromPlayer(): Promise<void> {
    await PersistApi.syncFrom(this.player, this);
  }

  static getAllPersistentFields(): string[] {
    const mixinFields = MixinApi.getMixinFields(this);
    const ownFields = this.persistentFields || [];
    return [...mixinFields, ...ownFields];
  }
}
```

**Custom NPC with optional persistence**:
```typescript
class Merchant extends Character {
  npc: NPC | null = null;

  // Merchant-specific fields
  static persistentFields = ['priceMultiplier', 'reputation', 'gold'];

  // Merchant inventory (complex type)
  static persistenceHandlers = {
    merchandise: {
      to: (items: Thing[]) => items.map(i => ({
        templateKey: i.templateKey,
        price: i.price
      })),
      from: async (data: any[]) =>
        Promise.all(data.map(d => StuffApi.clone(d.templateKey)))
    }
  };

  isPersistent(): boolean {
    return this.npc !== null; // Only persist if NPC document exists
  }

  syncToNPC(): void {
    if (!this.npc) return;
    PersistApi.syncTo(this, this.npc);
  }

  async syncFromNPC(): Promise<void> {
    if (!this.npc) return;
    await PersistApi.syncFrom(this.npc, this);
  }

  static getAllPersistentFields(): string[] {
    const mixinFields = MixinApi.getMixinFields(this);
    const ownFields = this.persistentFields || [];
    return [...mixinFields, ...ownFields];
  }
}
```

### Developer Experience

**Adding a simple field** (low effort, low risk):
```typescript
// 1. Add field to class
stamina: number = 100;

// 2. Add to persistentFields list
static persistentFields = ['xp', 'level', 'hp', 'maxHp', 'stamina'];

// Done! Auto-syncs now. Can't forget because it's in one place.
```

**Adding a complex field** (explicit handler required):
```typescript
// 1. Add field to class
equipment: Map<Slot, Item> = new Map();

// 2. Add persistence handler
static persistenceHandlers = {
  equipment: {
    to: (eq: Map<Slot, Item>) =>
      Array.from(eq.entries()).map(([slot, item]) => ({
        slot,
        itemId: item.stuffId
      })),
    from: async (data: any[]) => {
      const map = new Map();
      for (const {slot, itemId} of data) {
        const item = await Application.findObjectById(itemId);
        if (item) map.set(slot, item);
      }
      return map;
    }
  }
};

// Done! TypeScript ensures handler exists for complex types.
```

**Mixin contributes automatically** (zero effort for users):
```typescript
// Mixin declares once
class NamedMixin {
  static persistentFields = ['firstName', 'lastName'];
}

// All classes using mixin get automatic sync
class Avatar extends NamedMixin(...) {
  // firstName/lastName auto-sync without any code here
}

class CustomNPC extends NamedMixin(...) {
  // firstName/lastName also auto-sync here
}
```

**Transient fields** (don't add to list):
```typescript
class Avatar extends Character {
  // Persistent
  static persistentFields = ['xp', 'level', 'hp'];

  // Transient (not in persistentFields = not synced)
  temporaryBuff: Buff | null = null;
  currentTarget: Avatar | null = null;
  combatState: CombatState | null = null;
}
```

### Error Prevention

**What this prevents**:
1. ✅ **Forgot to sync new field**: Can't happen - if in persistentFields, auto-syncs
2. ✅ **Mixin field not synced**: Can't happen - mixin declares once, all users get it
3. ✅ **Shallow copy bugs**: Complex handlers prevent (Location → templateKey, not reference)
4. ✅ **Stale references**: Handlers reconstruct objects from IDs/keys
5. ✅ **Inconsistent sync**: Same logic used everywhere via PersistApi

**What developers must remember**:
1. Add field to persistentFields list (or it won't sync)
2. Complex types need handlers (TypeScript can help enforce this)
3. Call syncToPlayer() / syncFromPlayer() at appropriate times

### Testing Strategy

**Unit tests for auto-collection**:
```typescript
describe('PersistApi.syncTo', () => {
  it('syncs mixin fields automatically', () => {
    const avatar = new Avatar(player);
    avatar.firstName = 'Alice';
    avatar.lastName = 'Smith';
    avatar.xp = 1000;

    PersistApi.syncTo(avatar, player);

    expect(player.firstName).toBe('Alice'); // From NamedMixin
    expect(player.lastName).toBe('Smith');   // From NamedMixin
    expect(player.xp).toBe(1000);            // From Avatar
  });

  it('applies complex type handlers', async () => {
    const avatar = new Avatar(player);
    const location = await StuffApi.clone('/zones/town/square');
    avatar.location = location;

    PersistApi.syncTo(avatar, player);

    expect(player.location).toBe('/zones/town/square'); // Transformed to key
  });
});
```

### Performance Considerations

**Overhead**:
- Field collection: O(n) where n = total fields (done once per class)
- Sync operation: O(f) where f = number of fields (typically 10-20)
- Complex handlers: Depends on complexity (cloning objects, async lookups)

**Optimizations**:
- Cache getAllPersistentFields() result per class
- Lazy-load complex objects (only when accessed)
- Batch async operations in handlers (Promise.all)

### Future Enhancements (Phase 11+)

**Potential additions**:
- Dirty tracking (only sync changed fields)
- Schema validation (ensure Player document has all required fields)
- Migration support (handle schema changes)
- Compression (large inventory/equipment arrays)
- Partial sync (only specific fields)
- Transactional sync (rollback on error)

### Persisting Thing Objects (Advanced Complexity)

**Context**: While most persistence examples focus on Characters (PCs and NPCs), the persistence framework will also be used for Thing objects with significant frequency. This introduces additional complexity layers.

**Use Case - Object Storage**:
```typescript
// Player stores a weapon in a chest, logs off
// Weapon has variable properties (enchantments, durability, owner history)
// When player retrieves weapon later, all state must be preserved

const sword = await StuffApi.clone('/items/weapons/iron_sword');
sword.enchantment = 'fire';
sword.durability = 75;
sword.ownerHistory = ['Alice', 'Bob'];

// Store in chest
chest.addToInventory(sword);

// Later... must persist:
// - Sword's template reference (/items/weapons/iron_sword)
// - Sword's runtime modifications (enchantment, durability, ownerHistory)
// - Sword's mixin state (Named, Containable, Visible, etc.)
// - Sword's shadows (if any behavior modifications exist)
// - Shadow mixins (if shadows themselves have mixins)
```

**Complexity Chain**:

1. **Inherited Mixins**: Thing may extend multiple mixins (ContainableMixin, VisibleMixin, DetailedMixin)
   - Each mixin declares persistentFields
   - MixinApi.getMixinFields() collects from entire chain
   - Auto-sync handles this automatically

2. **Shadows**: Runtime behavior modifications via shadow stack
   - Shadows are code (functions) not data - cannot persist directly
   - Shadow state (closures, captured variables) may need persistence
   - Solution approaches:
     - **Reconstruct on load**: Template declares "this Thing always has X shadow"
     - **Shadow metadata**: Persist shadow identifier + shadow state separately
     - **Exclude from persistence**: Shadows are ephemeral, reapplied on spawn

3. **Shadow Mixins**: Shadows themselves may have mixins
   - Shadow code may reference mixin properties
   - If shadow state persists, must track which mixins shadow depends on
   - Reconstruction must apply mixins before applying shadows

4. **Variable Properties**: Thing has template-defined properties + runtime modifications
   - Template: Base stats (damage: 10, durability: 100)
   - Runtime: Modified stats (damage: 15, durability: 75)
   - Must persist delta (what changed) or full state (easier)

**Design Implications**:

```typescript
// Thing persistence handlers must account for:
class IronSword extends Thing {
  // Simple fields from template
  static persistentFields = ['durability', 'enchantment', 'ownerHistory'];

  // Complex type handlers
  static persistenceHandlers = {
    // If sword is in container, persist container reference
    environment: {
      to: (env: Location | Thing | null) => env?.stuffId || null,
      from: async (stuffId: string | null) =>
        stuffId ? await Application.findObjectById(stuffId) : null
    },

    // Shadows: Store identifiers + state (if stateful)
    shadows: {
      to: (shadowMap: Map<string, Shadow[]>) => {
        const result: any = {};
        for (const [methodName, shadows] of shadowMap.entries()) {
          result[methodName] = shadows.map(shadow => ({
            identifier: shadow.identifier, // e.g., 'fire_damage_shadow'
            state: shadow.getPersistentState?.() || null
          }));
        }
        return result;
      },
      from: async (data: any) => {
        const shadowMap = new Map();
        for (const [methodName, shadowList] of Object.entries(data)) {
          const shadows = await Promise.all(
            shadowList.map(async (s: any) => {
              // Reconstruct shadow from identifier
              const shadow = await ShadowRegistry.create(s.identifier);
              shadow.restoreState?.(s.state);
              return shadow;
            })
          );
          shadowMap.set(methodName, shadows);
        }
        return shadowMap;
      }
    }
  };
}
```

**Current Design Status**:
This complexity is **acknowledged but not yet fully specified**. The auto-sync persistence framework (Framework 2) handles mixins and simple fields elegantly. Shadow persistence and variable property deltas are areas requiring further design work in later phases.

**Phase Timing**:
- **Phase 2**: Basic Thing persistence (template reference + simple properties)
- **Phase 4**: Shadow system introduced (ephemeral, no persistence)
- **Phase 8**: Template system mature, variable properties formalized
- **Phase 9+**: Advanced shadow persistence (if needed), property delta tracking

**Trade-offs**:
- **Full state persistence**: Simple to implement, large documents, no reconstruction complexity
- **Delta persistence**: Complex to implement, small documents, must track changes carefully
- **Hybrid approach**: Persist full state for critical items (player equipment), deltas for common items (arrows, potions)

**Note**: Most Thing objects (consumables, common loot) are **ephemeral** and don't need persistence - they respawn from templates. Only player-owned items with unique state (modified equipment, quest items) require persistence.

---

## Framework 4: Object Lifecycle & Tracking Framework

### Purpose
Define how game objects are created, tracked, cloned, destroyed, and garbage collected predictably. This framework integrates with the MongoDB CMS to provide a template-driven object instantiation system.

### Core Concepts (See "Key Architectural Insights" for details)

**Three-Layer System**:
- **Blueprint**: JavaScript class/prototype (e.g., `Foo` class from `core:/bog/leg#Foo`)
- **Template**: MongoDB document specifying blueprint + initialization data (e.g., `/home/bobalu/workroom`)
- **Clone**: Runtime instance of blueprint initialized with template data (e.g., stuffId `aB3xK9mN2pQ5`)

**Key Identifiers**:
- **Template Key**: MongoDB document `_id` (e.g., `/home/bobalu/workroom`)
- **stuffId**: Runtime instance identifier (e.g., `aB3xK9mN2pQ5`)
- **Blueprint Reference**: Package + path + export (e.g., `core:/bog/leg#Foo` or `/bog/leg` for override + default)

**Operations**:
- **Clone**: Create new instance from template → `await StuffApi.clone(templateKey)`
- **Load**: Import JavaScript module → `await import(modulePath)`
- **Reload**: Hot-swap JavaScript module → `await HotReloadApi.reload(modulePath)`

### Object Lifecycle Stages

```
1. BLUEPRINT CREATION (Phase 2+)
   ↓
   Developer writes TypeScript class → Exports from module → Blueprint ready

2. TEMPLATE CREATION (Phase 8+)
   ↓
   MongoDB document created → Specifies blueprint reference + properties → Template ready

3. INSTANTIATION (Clone from Template)
   ↓
   Read Template from MongoDB → Parse blueprint reference → Load module → Get export →
   new Blueprint(template) → Generate stuffId → Register Clone

4. INITIALIZATION (Constructor)
   ↓
   Generate stuffId → Set Properties from Template → Apply Mixins → Register with Application

5. ACTIVE RUNTIME
   ↓
   Methods Called → State Changes → Events Dispatched → Interactions

6. DESTRUCTION
   ↓
   Mark Destroyed → Emit Events → Remove from Containers → Unregister → GC Eligible

7. GARBAGE COLLECTION
   ↓
   No Strong References → WeakRefs Cleared → Memory Reclaimed
```

### Requirements (Phase 2)

**Runtime ID Generation**
- Use shortuuid (base58, URL-friendly)
- `StuffApi.generateId()` creates unique IDs
- All Stuff instances get runtime `stuffId` on construction
- IDs are globally unique across all object types
- IDs are NOT persistent (new ID on each instantiation)

**Object Registration & Tracking**
```typescript
// Application maintains strong references to active objects
class Application {
  private objectsById: Map<string, Stuff> = new Map();
  private objectsByType: Map<string, Set<string>> = new Map(); // className → Set<stuffId>

  // Automatic registration in Stuff constructor
  registerObject(object: Stuff): void {
    this.objectsById.set(object.stuffId, object);

    const className = object.constructor.name;
    if (!this.objectsByType.has(className)) {
      this.objectsByType.set(className, new Set());
    }
    this.objectsByType.get(className)!.add(object.stuffId);
  }

  // Find by instance ID
  findObjectById(id: string): Stuff | undefined {
    return this.objectsById.get(id);
  }

  // Query by JavaScript class name
  findObjectsByType(className: string): Stuff[] {
    const ids = this.objectsByType.get(className);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.objectsById.get(id))
      .filter((obj): obj is Stuff => obj !== undefined);
  }

  // Enumerate all objects
  getAllObjects(): Stuff[] {
    return Array.from(this.objectsById.values());
  }
}
```

**Template-Driven Object Creation** (Phase 8+)
```typescript
// Template Document Structure (MongoDB)
interface StuffTemplate {
  _id: string;                   // Template key: /home/bobalu/workroom
  blueprint: string;             // Blueprint reference: core:/bog/leg#Foo
  properties: Record<string, any>; // Initialization data
  metadata: {
    author: string;
    created: Date;
    modified: Date;
    schema: string;              // e.g., "RoomTemplate.schema.json"
  };
}

// Clone from template (create new instance)
class StuffApi {
  static async clone(templateKey: string): Promise<Stuff> {
    // 1. Look up template in MongoDB CMS collection
    const template = await CMS.getTemplate(templateKey);

    // 2. Parse blueprint reference
    // Examples:
    //   "core:/bog/leg#Foo" → ["core", "/bog/leg", "Foo"]
    //   "/bog/leg#Foo" → [null, "/bog/leg", "Foo"] (allows override)
    //   "/bog/leg" → [null, "/bog/leg", "default"]
    const [pkg, path, exportName] = this.parseBlueprint(template.blueprint);

    // 3. Resolve to actual module path
    const modulePath = await BlueprintResolver.resolve(pkg, path);

    // 4. Load JavaScript module (cached if already loaded)
    const module = await ModuleRegistry.load(modulePath);

    // 5. Get exported class via reflection
    const Blueprint = module[exportName];

    if (!Blueprint) {
      throw new Error(`Export "${exportName}" not found in module "${modulePath}"`);
    }

    // 6. Instantiate with template data (constructor handles registration)
    const clone = new Blueprint(template);

    // 7. Emit clone event
    EventApi.dispatch(WellKnownEvents.ObjectCloned, {
      templateKey,
      stuffId: clone.stuffId,
      blueprint: template.blueprint
    });

    return clone;
  }

  // Parse blueprint reference notation
  private static parseBlueprint(blueprintRef: string): [string | null, string, string] {
    // Examples:
    //   "core:/bog/leg#Foo" → ["core", "/bog/leg", "Foo"]
    //   "@pkg/name:/path#Exp" → ["@pkg/name", "/path", "Exp"]
    //   "/bog/leg#Foo" → [null, "/bog/leg", "Foo"] (allows override)
    //   "/bog/leg" → [null, "/bog/leg", "default"] (allows override + default)

    if (blueprintRef.includes(':/')) {
      // Explicit package: "core:/path#Export" or "@scope/name:/path#Export"
      const [pkg, rest] = blueprintRef.split(':/');
      const [path, exportName = 'default'] = rest.split('#');
      return [pkg, path, exportName];
    } else {
      // Implicit package (allows override): "/path#Export"
      const [path, exportName = 'default'] = blueprintRef.split('#');
      return [null, path, exportName];
    }
  }

  // Convenience: clone from existing clone (uses same template)
  static cloneFrom(clone: Stuff): Promise<Stuff> {
    return this.clone(clone.templateKey);
  }
}

// Blueprint resolution (handles package → module path mapping)
class BlueprintResolver {
  static async resolve(pkg: string | null, path: string): Promise<string> {
    // Explicit package
    if (pkg !== null) {
      if (pkg === 'core') {
        // Core package maps to server src
        return `packages/server/src/mud${path}`;
      } else {
        // Mod package (e.g., "@saxonberg-mods/narnia")
        // Resolve from node_modules or custom mod paths
        return `node_modules/${pkg}/dist${path}`;
      }
    }

    // Implicit package - check override chain (Phase 11+)
    // For now (Phase 2-10), default to core
    return `packages/server/src/mud${path}`;

    // Future: Check active mods → core
    // for (const mod of this.activeMods) {
    //   const modulePath = await this.tryResolve(mod.package, path);
    //   if (modulePath) return modulePath;
    // }
    // return this.resolve('core', path); // Fallback to core
  }
}
```

**Object Initialization (Constructor Pattern)**
```typescript
class Stuff {
  public readonly stuffId: string;
  public readonly templateKey: string;
  private _destroyed: boolean = false;

  constructor(template: StuffTemplate) {
    // 1. Generate unique runtime ID
    this.stuffId = StuffApi.generateId();

    // 2. Store template key for later cloning
    this.templateKey = template._id;

    // 3. Initialize properties from template
    this.initializeFromTemplate(template);

    // 4. Register with Application (automatic)
    ApplicationInstance.get().registerObject(this);

    // 5. Emit creation event
    EventApi.dispatch(WellKnownEvents.ObjectCreated, {
      stuffId: this.stuffId,
      templateKey: this.templateKey
    });
  }

  protected initializeFromTemplate(template: StuffTemplate): void {
    // Subclasses override to initialize specific properties
    // Example: this.name = template.properties.name;
  }
}

// Example subclass
class Weapon extends Thing {
  public damage: number = 0;
  public damageType: string = "physical";

  protected initializeFromTemplate(template: StuffTemplate): void {
    super.initializeFromTemplate(template);
    this.damage = template.properties.damage ?? 0;
    this.damageType = template.properties.damageType ?? "physical";
  }
}
```

**Object Destruction**
```typescript
class Stuff {
  destroy(): void {
    // 1. Check if already destroyed (idempotent)
    if (this._destroyed) return;

    // 2. Emit beforeDestroy event
    EventApi.dispatch(WellKnownEvents.BeforeObjectDestroy, {
      stuffId: this.stuffId
    });

    // 3. Remove from all containers (if Containable)
    if (this.environment) {
      this.environment.removeFromInventory(this);
    }

    // 4. Destroy all contained objects (if Container)
    if (this.inventory) {
      for (const item of this.inventory) {
        item.destroy();
      }
    }

    // 5. Clear all bidirectional references
    this.clearAllReferences();

    // 6. Unregister from Application
    ApplicationInstance.get().unregisterObject(this);

    // 7. Mark as destroyed
    this._destroyed = true;

    // 8. Emit afterDestroy event
    EventApi.dispatch(WellKnownEvents.AfterObjectDestroy, {
      stuffId: this.stuffId
    });

    // 9. Clear all event listeners
    this.clearEventListeners();
  }

  isDestroyed(): boolean {
    return this._destroyed;
  }

  protected assertNotDestroyed(): void {
    if (this._destroyed) {
      throw new Error(`Cannot access destroyed object: ${this.stuffId}`);
    }
  }

  // All public methods should check
  public someMethod(): void {
    this.assertNotDestroyed();
    // ... method implementation
  }
}
```

**Garbage Collection & Memory Management**

**Critical Understanding**: JavaScript's GC only collects objects when there are NO strong references to them. Our `objectsById` Map holds strong references, so objects must be **explicitly removed** to become GC-eligible.

**The Explicit Cleanup Pattern**:
```typescript
class Application {
  private objectsById: Map<string, Stuff> = new Map();  // Strong refs - prevents GC
  private destroyedObjects: WeakMap<Stuff, DestroyedObjectMetadata> = new WeakMap();  // Weak refs - allows GC

  registerObject(object: Stuff): void {
    // Add to strong reference map - object stays in memory
    this.objectsById.set(object.stuffId, object);
  }

  unregisterObject(object: Stuff): void {
    // CRITICAL: Must explicitly remove from Map for GC to work
    this.objectsById.delete(object.stuffId);

    // Add to destroyed objects WeakMap (for debugging/graceful degradation)
    this.destroyedObjects.set(object, {
      stuffId: object.stuffId,
      templateKey: object.templateKey,
      destroyedAt: new Date(),
      destroyedBy: this.getCurrentStackTrace()
    });

    // Now object is GC-eligible if no other strong references exist
  }

  // Safe lookup that handles destroyed objects gracefully
  findObjectById(id: string): Stuff | undefined {
    const obj = this.objectsById.get(id);

    if (!obj) return undefined;

    // Extra safety: check if marked destroyed but still in map
    if (obj.isDestroyed()) {
      console.warn(`Found destroyed object in objectsById: ${id}`);
      this.objectsById.delete(id);  // Clean up
      return undefined;
    }

    return obj;
  }

  // Check if object was recently destroyed (for debugging)
  wasDestroyed(object: Stuff): boolean {
    return this.destroyedObjects.has(object);
  }

  getDestroyedObjectInfo(object: Stuff): DestroyedObjectMetadata | undefined {
    return this.destroyedObjects.get(object);
  }
}

interface DestroyedObjectMetadata {
  stuffId: string;
  templateKey: string;
  destroyedAt: Date;
  destroyedBy: string;  // Stack trace
}
```

**GC Lifecycle**:
```
1. Object created → Added to objectsById (strong ref) → Stays in memory
2. Object.destroy() called → unregisterObject() → Removed from objectsById
3. If no other strong refs exist → GC eligible
4. GC runs → Object collected → Memory reclaimed
5. WeakMap entry automatically cleared by GC
```

**Strong vs Weak References**:
```typescript
// STRONG references (prevent GC)
class Application {
  private objectsById: Map<string, Stuff>;  // Keeps objects alive
}

class Avatar {
  private inventory: Set<Thing>;  // Keeps items alive
}

// WEAK references (allow GC)
class Application {
  private destroyedObjects: WeakMap<Stuff, Metadata>;  // Doesn't prevent GC
}

class ObjectCache {
  private cache: WeakMap<Stuff, CachedData>;  // Doesn't prevent GC
}

class ObjectIndex {
  private index: Map<string, WeakRef<Stuff>>;  // WeakRef allows GC

  get(id: string): Stuff | undefined {
    const ref = this.index.get(id);
    const obj = ref?.deref();  // May return undefined if GC'd

    if (!obj) {
      // Object was garbage collected, clean up index
      this.index.delete(id);
    }

    return obj;
  }
}
```

**GC-Safe Patterns**:
```typescript
// BAD: Circular reference prevents GC
class Avatar {
  public interactive: Interactive;  // Strong ref
}
class Interactive {
  public avatar: Avatar;  // Strong ref - CIRCULAR!
}

// GOOD: Bidirectional with clear/set pattern
class Avatar {
  private _interactive: Interactive | null = null;

  setInteractive(interactive: Interactive): void {
    // Clear old reference
    if (this._interactive) {
      this._interactive.avatar = null;
    }

    // Set new reference
    this._interactive = interactive;
    if (interactive) {
      interactive.avatar = this;
    }
  }

  clearInteractive(): void {
    if (this._interactive) {
      this._interactive.avatar = null;
      this._interactive = null;
    }
  }
}

class Interactive {
  public avatar: Avatar | null = null;

  destroy(): void {
    // Clear bidirectional link
    if (this.avatar) {
      this.avatar.clearInteractive();
    }
    super.destroy();
  }
}
```

**Memory Leak Prevention**:
```typescript
class Application {
  // Diagnostic tool
  checkForLeaks(): LeakReport {
    const report: LeakReport = {
      orphanedObjects: [],
      destroyedButReferenced: [],
      circularReferences: [],
      suspiciousRetentions: []
    };

    // Check for objects marked destroyed but still registered
    for (const [id, obj] of this.objectsById) {
      if (obj.isDestroyed()) {
        report.destroyedButReferenced.push({ id, obj });
      }
    }

    // Check for orphaned objects (not in any container, not persistent)
    for (const obj of this.getAllObjects()) {
      if (!obj.environment && !obj.isPersistent && !obj.isDestroyed()) {
        report.orphanedObjects.push(obj);
      }
    }

    // Additional checks...

    return report;
  }

  // Force cleanup of destroyed objects
  gcCleanup(): number {
    let cleaned = 0;

    for (const [id, obj] of this.objectsById) {
      if (obj.isDestroyed()) {
        this.objectsById.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}
```

**Object References Best Practices**:
1. **Parent-Child**: Parent holds strong ref, child holds weak ref or null
2. **Bidirectional**: Use clear/set patterns, clean up in destroy()
3. **Caches**: Always use WeakMap for caches
4. **Indexes**: Use WeakRef for secondary indexes
5. **Event Listeners**: Clear all listeners in destroy()
6. **Timers**: Clear all timers in destroy()

### Module Reloading (Blueprint Updates)

**Reload vs Clone**:
```typescript
// Reload updates the blueprint (JavaScript module)
class HotReloadApi {
  static async reloadBlueprint(modulePath: string): Promise<void> {
    // 1. Hot-swap JavaScript module from disk
    await this.reload(modulePath);

    // 2. Find all templates using this module
    const templates = await CMS.findTemplatesByBlueprint(modulePath);

    // 3. Optionally update existing clones (dangerous)
    for (const templateKey of templates) {
      const clones = Application.findClonesByTemplate(templateKey);
      for (const clone of clones) {
        await this.updateClone(clone);
      }
    }
  }

  private static async updateClone(oldClone: Stuff): Promise<void> {
    // 1. Get current state
    const state = oldClone.exportState();

    // 2. Create new clone with reloaded blueprint
    const newClone = await StuffApi.clone(oldClone.templateKey);

    // 3. Restore state
    newClone.importState(state);

    // 4. Swap references (complex, requires coordination)
    Application.swapObjectReferences(oldClone.stuffId, newClone.stuffId);

    // 5. Destroy old clone
    oldClone.destroy();
  }
}
```

### Phase 8+ Integration

When CMS is implemented:
- All object creation goes through `StuffApi.clone(templateKey)`
- CMS provides MongoDB collection of templates with JSON schemas
- Visual editing of template properties
- Blueprint changes can hot-reload into running game
- Version control for templates
- Template inheritance/composition

---

## Framework 12: Module Hot-Reloading System

### Purpose
Enable manual reloading of game code (blueprints) without restarting the server. This allows developers to update JavaScript modules via CLI commands and have changes take effect for future instantiations.

### Core Concept

**Reload Does NOT Affect Existing Instances**:
- **Reloading a blueprint updates the module in memory** (clears require.cache, re-imports)
- **Existing clones keep their old prototype** - they continue using old behavior
- **New clones use the new prototype** - future instantiations get updated behavior
- **This is intentional**: Predictable, safe, no mid-operation state corruption

**Example**:
```
1. Sword blueprint exists: /items/weapons/sword.js
2. 5 sword instances exist in the game world (clones)
3. Developer edits sword.js (changes damage formula)
4. Admin runs: reload /items/weapons/sword
5. Module reloaded in memory ✓
6. Existing 5 swords STILL use old damage formula ✓
7. New sword clones will use new damage formula ✓
8. Admin can optionally destroy/recreate specific swords manually
```

**What Gets Reloaded**:
- JavaScript modules (blueprints - the code that defines object behavior)
- Command controllers and definitions
- Non-core API modules
- Module cache cleared, re-imported from disk

**What Does NOT Get Reloaded**:
- Core framework (Backend, Application, persistence layer)
- Existing clones in memory (keep old prototype)
- MongoDB template documents (persist unchanged)

**Reload Trigger**:
- **Manual CLI command only** (`reload <module>`)
- **NO automatic file watching** (too implicit, potentially disruptive)

### Requirements (Phase 9+)

**Module Registry**
```typescript
interface ModuleMetadata {
  path: string;                           // File path
  exports: any;                           // Exported classes/functions
  dependencies: Set<string>;              // Modules this depends on
  dependents: Set<string>;                // Modules that depend on this
  loaded: Date;                           // When loaded
  reloadCount: number;                    // How many times reloaded
  templateReferences: Set<string>;        // Template keys using this module
}

class ModuleRegistry {
  private modules: Map<string, ModuleMetadata> = new Map();

  // Track a loaded module
  track(modulePath: string, exports: any, dependencies: string[]): void {
    const metadata: ModuleMetadata = {
      path: modulePath,
      exports,
      dependencies: new Set(dependencies),
      dependents: new Set(),
      loaded: new Date(),
      reloadCount: 0,
      templateReferences: new Set()
    };

    // Update dependents
    for (const dep of dependencies) {
      const depMetadata = this.modules.get(dep);
      if (depMetadata) {
        depMetadata.dependents.add(modulePath);
      }
    }

    this.modules.set(modulePath, metadata);
  }

  // Get module metadata
  getModule(modulePath: string): ModuleMetadata | undefined {
    return this.modules.get(modulePath);
  }

  // Find modules that depend on a given module
  getDependents(modulePath: string): string[] {
    const metadata = this.modules.get(modulePath);
    return metadata ? Array.from(metadata.dependents) : [];
  }

  // Find templates that use a module
  getTemplateReferences(modulePath: string): string[] {
    const metadata = this.modules.get(modulePath);
    return metadata ? Array.from(metadata.templateReferences) : [];
  }
}
```

**Hot-Reload Mechanism**
```typescript
interface ReloadResult {
  success: boolean;
  modulePath: string;
  dependentsReloaded: string[];
  errors: string[];
  existingCloneCount: number;  // How many clones still use old prototype
}

class HotReloadApi {
  /**
   * Reload a JavaScript module from disk.
   *
   * IMPORTANT: This does NOT update existing instances - they keep old prototype.
   * Only future clones will use the reloaded code.
   */
  static async reload(modulePath: string): Promise<ReloadResult> {
    const result: ReloadResult = {
      success: false,
      modulePath,
      dependentsReloaded: [],
      errors: [],
      existingCloneCount: 0
    };

    try {
      // 1. Get module metadata
      const metadata = ModuleRegistry.getModule(modulePath);
      if (!metadata) {
        throw new Error(`Module not tracked: ${modulePath}`);
      }

      // 2. Count existing clones (for informational purposes only)
      const templateRefs = ModuleRegistry.getTemplateReferences(modulePath);
      for (const templateKey of templateRefs) {
        const clones = Application.findClonesByTemplate(templateKey);
        result.existingCloneCount += clones.length;
      }

      // 3. Identify dependent modules
      const dependents = ModuleRegistry.getDependents(modulePath);

      // 4. Unload in reverse dependency order
      for (const dep of dependents.reverse()) {
        delete require.cache[require.resolve(dep)];
      }

      // 5. Clear this module from cache
      delete require.cache[require.resolve(modulePath)];

      // 6. Re-import module
      const newExports = await import(modulePath);

      // 7. Update module registry
      ModuleRegistry.track(modulePath, newExports, metadata.dependencies);

      // 8. Reload dependent modules
      for (const dep of dependents) {
        const depResult = await this.reload(dep);
        result.dependentsReloaded.push(dep);

        if (!depResult.success) {
          result.errors.push(...depResult.errors);
        }
      }

      result.success = true;

      // 9. Emit event
      EventApi.dispatch(WellKnownEvents.ModuleReload, {
        modulePath,
        success: true,
        dependentsReloaded: result.dependentsReloaded,
        existingCloneCount: result.existingCloneCount
      });

    } catch (error) {
      result.errors.push(error.message);
      EventApi.dispatch(WellKnownEvents.ModuleReload, {
        modulePath,
        success: false,
        errors: result.errors
      });
    }

    return result;
  }

  /**
   * Destroy and recreate a specific clone from its template.
   * Used when admin wants to apply reloaded blueprint to specific instance.
   */
  static async recreateClone(stuffId: string): Promise<string | null> {
    const clone = Application.findObjectById(stuffId);
    if (!clone) {
      throw new Error(`Clone not found: ${stuffId}`);
    }

    // Get template key
    const templateKey = clone.templateKey;
    if (!templateKey) {
      throw new Error(`Clone ${stuffId} has no template key`);
    }

    // Store location/container info
    const environment = clone.getEnvironment?.();
    const container = environment as any;

    // Destroy old clone
    clone.destroy();

    // Create new clone from template (uses reloaded module)
    const newClone = await StuffApi.clone(templateKey);

    // Restore location
    if (container && newClone.setEnvironment) {
      container.addToInventory?.(newClone);
    }

    return newClone.stuffId;
  }
}
```

**Command Hot-Reload**
```typescript
// Reload command definitions without disconnecting users
class CommandApi {
  static async reloadCommand(commandName: string): Promise<void> {
    // 1. Find command definition (YAML + Controller)
    const commandPath = `/commands/${commandName}`;
    const definition = await FileApi.readYAML(`${commandPath}.yaml`);

    // 2. Reload controller module (no extension - Node.js resolves)
    const controllerPath = `${commandPath}Controller`;
    await HotReloadApi.reload(controllerPath);

    // 3. Parse new CommandDefinition
    const newCommand = CommandDefinition.fromYAML(definition);

    // 4. Replace in registry (new invocations use new definition)
    CommandRegistry.register(commandName, newCommand);

    // 5. Active commands continue with old definition (no interruption)
    // Future invocations get new definition
  }
}
```

**Safe Reload Constraints**

**Cannot hot-reload** (require server restart):
- Backend, Application core
- PersistenceManager, ApplicationInstance
- Core framework classes (IBackend, EventApi, etc.)
- WebSocket/HTTP server configuration
- Database connection

**Can hot-reload**:
- Game object classes (Stuff, Agent, Thing, Location, etc.)
- Command controllers and definitions
- API modules (most - except core framework)
- CMS blueprints
- Utility functions

**Preserve state during reload**:
- Instance properties should be exported/imported
- Bidirectional references must be maintained
- Container relationships preserved
- Event subscriptions re-established

**Graceful degradation**:
- If reload fails, revert to old version
- Don't crash active instances
- Log errors clearly
- Allow retry

**Reload Triggers (Manual Only)**

**CLI Command** (primary method):
```typescript
class ReloadCommand extends CommandController {
  async execute(fields: any, options: any, context: CommandContext): Promise<void> {
    // Require admin privileges
    if (!context.avatar.isAdmin) {
      return context.avatar.send("Permission denied: admin required");
    }

    const modulePath = fields.module;
    const result = await HotReloadApi.reload(modulePath);

    if (result.success) {
      let message = `✓ Reloaded ${modulePath}`;

      if (result.dependentsReloaded.length > 0) {
        message += `\n  Dependents: ${result.dependentsReloaded.join(', ')}`;
      }

      if (result.existingCloneCount > 0) {
        message += `\n  Note: ${result.existingCloneCount} existing clones still use old code`;
        message += `\n  Use 'recreate <stuffId>' to update specific instances`;
      }

      context.avatar.send(message);
    } else {
      context.avatar.send(`✗ Failed to reload: ${result.errors.join(', ')}`);
    }
  }
}

// Usage:
// > reload /items/weapons/sword
// ✓ Reloaded /items/weapons/sword
//   Note: 5 existing clones still use old code
//   Use 'recreate <stuffId>' to update specific instances
```

**Recreate Command** (update specific instance):
```typescript
class RecreateCommand extends CommandController {
  async execute(fields: any, options: any, context: CommandContext): Promise<void> {
    if (!context.avatar.isAdmin) {
      return context.avatar.send("Permission denied: admin required");
    }

    const stuffId = fields.stuffId;
    const newStuffId = await HotReloadApi.recreateClone(stuffId);

    if (newStuffId) {
      context.avatar.send(`✓ Recreated ${stuffId} → ${newStuffId} (now using latest code)`);
    }
  }
}

// Usage:
// > recreate aB3xK9mN2pQ5
// ✓ Recreated aB3xK9mN2pQ5 → pQ5K9mN2xB3a (now using latest code)
```

**HTTP API Endpoint** (optional):
```typescript
router.post('/admin/reload', requireAdmin, async (req, res) => {
  const { modulePath } = req.body;
  const result = await HotReloadApi.reload(modulePath);
  res.json(result);
});
```

**No Automatic Triggers**:
- ❌ No file system watching (too implicit)
- ❌ No auto-reload on template changes (let admin decide)
- ❌ No reload on startup (modules load normally)
- ✅ Manual CLI commands only (explicit, intentional)

**Testing Hot-Reload**
```typescript
class HotReloadApi {
  // Test if a module can be safely reloaded
  static testReload(modulePath: string): ReloadTestResult {
    const result: ReloadTestResult = {
      canReload: true,
      warnings: [],
      errors: []
    };

    // 1. Check if module is tracked
    const metadata = ModuleRegistry.getModule(modulePath);
    if (!metadata) {
      result.canReload = false;
      result.errors.push('Module not tracked');
      return result;
    }

    // 2. Check for circular dependencies
    const circular = this.detectCircularDependencies(modulePath);
    if (circular.length > 0) {
      result.warnings.push(`Circular dependencies: ${circular.join(', ')}`);
    }

    // 3. Check for state preservation issues
    const templateKeys = Array.from(metadata.templateReferences);
    if (templateKeys.length > 0) {
      const clones = Application.findClonesByTemplate(templateKeys[0]);
      if (clones.length > 0 && !clones[0].exportState) {
        result.warnings.push('No exportState method - state will be lost');
      }
    }

    // 4. Check for core framework modules
    if (this.isCoreFramework(modulePath)) {
      result.canReload = false;
      result.errors.push('Cannot reload core framework module');
    }

    return result;
  }

  private static isCoreFramework(modulePath: string): boolean {
    const coreModules = [
      'backend/Backend',
      'backend/Application',
      'backend/PersistenceManager',
      'backend/ApplicationInstance'
    ];

    return coreModules.some(core => modulePath.includes(core));
  }
}
```

**Reload Events**
```typescript
// Subscribe to reload events for logging/monitoring
EventApi.subscribe(WellKnownEvents.ModuleReload, (event) => {
  MudlogApi.info('hot-reload', `Module reloaded: ${event.modulePath}`);
  MudlogApi.info('hot-reload', `Success: ${event.success}`);
  MudlogApi.info('hot-reload', `Dependents reloaded: ${event.dependentsReloaded.length}`);
  MudlogApi.info('hot-reload', `Existing clones: ${event.existingCloneCount} (still use old code)`);

  if (event.errors?.length > 0) {
    MudlogApi.error('hot-reload', 'Reload errors:', event.errors);
  }
});
```

### Integration with Object Lifecycle (Framework 3)

Hot-reloading integrates with object lifecycle:

1. **Clone** (Framework 3): Uses the current loaded module from ModuleRegistry
2. **Reload** (Framework 9): Updates the module in ModuleRegistry, clears require.cache
3. **Future clones**: Use the newly reloaded module automatically
4. **Existing clones**: Keep old prototype (manual recreate if needed)

**Behavior Summary**:
```
Time | Action                    | Module in Memory | Clone A | Clone B
-----|---------------------------|------------------|---------|--------
T0   | Initial state             | Sword v1         | -       | -
T1   | Clone from template       | Sword v1         | v1      | -
T2   | Edit sword.js (on disk)   | Sword v1         | v1      | -
T3   | reload /items/weapons/sword| Sword v2         | v1      | -
T4   | Clone from template       | Sword v2         | v1      | v2
T5   | recreate Clone A          | Sword v2         | v2      | v2
```

**Key Points**:
- **No automatic instance updates** - existing clones unaffected by reload
- **No server restart needed** - rapid iteration for future clones
- **Templates unchanged** - only the JavaScript code is reloaded
- **Manual migration** - admin decides which instances to recreate
- **Predictable behavior** - no mid-operation state corruption

---

## Framework 6: Call Security & Execution Framework

### Purpose
Provide a unified interception mechanism that handles:
1. **Call stack tracking** across async boundaries (required for security)
2. **Security checks** to prevent unauthorized method calls
3. **Destroyed object checks** to prevent access to destroyed objects
4. **Function shadowing** (LPMUD-style) for runtime behavior modification
5. **Logging, profiling, debugging** hooks (optional)

This framework ensures that sensitive operations like `avatar.addXp()` can't be called by unauthorized code, while also preventing common bugs like accessing destroyed objects.

### Core Architecture

The framework uses **AsyncLocalStorage** (Node.js built-in) to maintain execution context across async boundaries, combined with a **decorator pattern** for explicit method interception.

### Requirements (Phase 2-3)

**ExecutionContext** (AsyncLocalStorage-based):
```typescript
import { AsyncLocalStorage } from 'async_hooks';

interface CallFrame {
  caller: Stuff | null;      // Who called this method
  target: Stuff;             // What object is being called
  method: string;            // Method name
  timestamp: number;         // When the call happened
  metadata?: any;            // Optional debug data
}

class CallStack {
  frames: CallFrame[] = [];

  push(frame: CallFrame): void {
    this.frames.push(frame);
  }

  pop(): void {
    this.frames.pop();
  }

  peek(): CallFrame | undefined {
    return this.frames[this.frames.length - 1];
  }

  getFrames(): CallFrame[] {
    return [...this.frames];  // Defensive copy
  }
}

class ExecutionContext {
  private static als = new AsyncLocalStorage<CallStack>();

  /**
   * Execute a function with call stack tracking.
   * Automatically preserves context across async/await boundaries.
   */
  static run<T>(caller: Stuff | null, target: Stuff, method: string, fn: () => T): T {
    const stack = this.als.getStore() || new CallStack();

    stack.push({
      caller,
      target,
      method,
      timestamp: Date.now()
    });

    return this.als.run(stack, () => {
      try {
        return fn();
      } finally {
        stack.pop();
      }
    });
  }

  /**
   * Get the immediate caller from the call stack.
   * Returns null if called from system context (no caller).
   */
  static getCaller(): Stuff | null {
    const frame = this.als.getStore()?.peek();
    return frame?.caller || null;
  }

  /**
   * Get the complete call stack for debugging/logging.
   */
  static getCallStack(): CallFrame[] {
    return this.als.getStore()?.getFrames() || [];
  }

  /**
   * Get the target of the current method call.
   */
  static getCurrentTarget(): Stuff | null {
    return this.als.getStore()?.peek()?.target || null;
  }
}
```

**Security Policies**:
```typescript
interface SecurityPolicy {
  allows(caller: Stuff | null, target: Stuff, method: string): boolean;
}

class SecurityPolicies {
  /**
   * Only the object itself can call this method.
   * Example: private operations
   */
  static SelfOnly: SecurityPolicy = {
    allows: (caller, target) => caller === target
  };

  /**
   * Only the controlling Interactive can call this method.
   * Example: avatar.setPassword() - only the player's connection can change it
   */
  static OwnerOnly: SecurityPolicy = {
    allows: (caller, target) => {
      if (target instanceof Avatar && caller instanceof Interactive) {
        return target.interactive === caller;
      }
      return false;
    }
  };

  /**
   * Only system or admin users can call this method.
   * Example: avatar.addXp() - only system/admin can grant XP
   */
  static AdminOrSystem: SecurityPolicy = {
    allows: (caller, target) => {
      // Null caller = system context (always allowed)
      if (caller === null) return true;

      // Check if caller is a GameSystem instance
      if (caller instanceof GameSystem) return true;

      // Check if caller is an admin Avatar
      if (caller instanceof Avatar && caller.isAdmin()) return true;

      return false;
    }
  };

  /**
   * Anyone can call this method.
   * Example: getName(), getDescription() - public read operations
   */
  static Public: SecurityPolicy = {
    allows: () => true
  };

  /**
   * Create a custom security policy with predicate function.
   */
  static Custom(predicate: (caller: Stuff | null, target: Stuff, method: string) => boolean): SecurityPolicy {
    return { allows: predicate };
  }
}
```

**Shadow System** (LPMUD-style function shadowing):
```typescript
interface Shadow {
  /**
   * Execute shadow logic.
   * @param target - The object being called
   * @param args - The method arguments
   * @param next - Call this to continue to next shadow or original method
   * @returns The result of the method call
   */
  execute(target: any, args: any[], next: (...args: any[]) => any): any;
}

// Internal shadow storage in Stuff base class (PRIVATE - do not access directly)
class Stuff {
  /** @internal - Do not access directly. Use ShadowApi instead. */
  private _shadows?: Map<string, Shadow[]>;

  /**
   * @internal - Privileged operation. Use ShadowApi.add() instead.
   * Direct access to this method should be restricted to ShadowApi only.
   */
  private _addShadowInternal(methodName: string, shadow: Shadow): void {
    if (!this._shadows) {
      this._shadows = new Map();
    }
    if (!this._shadows.has(methodName)) {
      this._shadows.set(methodName, []);
    }
    this._shadows.get(methodName)!.push(shadow);
  }

  /**
   * @internal - Privileged operation. Use ShadowApi.remove() instead.
   */
  private _removeShadowInternal(methodName: string, shadow: Shadow): void {
    const shadows = this._shadows?.get(methodName);
    if (shadows) {
      const index = shadows.indexOf(shadow);
      if (index !== -1) {
        shadows.splice(index, 1);
      }
    }
  }

  /**
   * @internal - Privileged operation. Use ShadowApi.clear() instead.
   */
  private _clearShadowsInternal(methodName: string): void {
    this._shadows?.delete(methodName);
  }

  /**
   * @internal - Used by @Secured decorator to execute shadow stack.
   */
  _getShadowsInternal(methodName: string): Shadow[] {
    return this._shadows?.get(methodName) || [];
  }
}

/**
 * Public API for shadow manipulation.
 * All shadow operations MUST go through this API.
 */
class ShadowApi {
  /**
   * Add a shadow to a method on a target object.
   *
   * Security: Validates caller has permission to shadow this method.
   * Logging: Records who added shadow and when.
   *
   * @param target - The object to shadow
   * @param methodName - The method name to shadow
   * @param shadow - The shadow implementation
   */
  static add(target: Stuff, methodName: string, shadow: Shadow): void {
    // Security check: Who is adding this shadow?
    const caller = ExecutionContext.getCaller();

    // Policy: Can this caller add shadows to this target?
    if (!this.canAddShadow(caller, target, methodName)) {
      throw new SecurityError(
        `${caller?.constructor.name} is not authorized to shadow ${target.constructor.name}.${methodName}`
      );
    }

    // Validation: Method exists and is shadowable
    if (!(methodName in target)) {
      throw new Error(`Method ${methodName} does not exist on ${target.constructor.name}`);
    }

    if (!this.isShadowable(target, methodName)) {
      throw new Error(`Method ${methodName} on ${target.constructor.name} cannot be shadowed`);
    }

    // Logging: Record shadow addition for debugging
    MudlogApi.debug('shadow', `Added shadow to ${target.constructor.name}.${methodName} by ${caller?.constructor.name}`);

    // Delegate to internal method (privileged operation)
    (target as any)._addShadowInternal(methodName, shadow);

    // Dispatch event (for monitoring/debugging)
    EventApi.dispatch(WellKnownEvents.ShadowAdded, {
      target,
      methodName,
      shadow,
      caller
    });
  }

  /**
   * Remove a specific shadow from a method.
   *
   * Security: Validates caller has permission to remove this shadow.
   */
  static remove(target: Stuff, methodName: string, shadow: Shadow): void {
    const caller = ExecutionContext.getCaller();

    if (!this.canRemoveShadow(caller, target, methodName, shadow)) {
      throw new SecurityError(
        `${caller?.constructor.name} is not authorized to remove shadow from ${target.constructor.name}.${methodName}`
      );
    }

    MudlogApi.debug('shadow', `Removed shadow from ${target.constructor.name}.${methodName} by ${caller?.constructor.name}`);

    (target as any)._removeShadowInternal(methodName, shadow);

    EventApi.dispatch(WellKnownEvents.ShadowRemoved, {
      target,
      methodName,
      shadow,
      caller
    });
  }

  /**
   * Remove all shadows from a method.
   *
   * Security: Requires elevated privileges (admin or system).
   */
  static clear(target: Stuff, methodName: string): void {
    const caller = ExecutionContext.getCaller();

    if (!this.canClearShadows(caller, target, methodName)) {
      throw new SecurityError(
        `${caller?.constructor.name} is not authorized to clear shadows from ${target.constructor.name}.${methodName}`
      );
    }

    MudlogApi.debug('shadow', `Cleared all shadows from ${target.constructor.name}.${methodName} by ${caller?.constructor.name}`);

    (target as any)._clearShadowsInternal(methodName);

    EventApi.dispatch(WellKnownEvents.ShadowsCleared, {
      target,
      methodName,
      caller
    });
  }

  /**
   * Get all shadows for a method (read-only, for introspection).
   * Returns a copy to prevent direct manipulation.
   */
  static getShadows(target: Stuff, methodName: string): ReadonlyArray<Shadow> {
    return [...(target as any)._getShadowsInternal(methodName)];
  }

  /**
   * Check if a method can be shadowed.
   * Some methods (like destroy(), constructor, etc.) should not be shadowable.
   */
  private static isShadowable(target: Stuff, methodName: string): boolean {
    // Blacklist of methods that cannot be shadowed
    const unshadowableMethods = new Set([
      'constructor',
      'destroy',
      '_addShadowInternal',
      '_removeShadowInternal',
      '_clearShadowsInternal',
      '_getShadowsInternal'
    ]);

    return !unshadowableMethods.has(methodName);
  }

  /**
   * Check if caller can add a shadow to target.method.
   *
   * Default policy: Only system, admin, or the object itself can add shadows.
   * Can be customized per-method or per-class.
   */
  private static canAddShadow(caller: Stuff | null, target: Stuff, methodName: string): boolean {
    // System calls (no caller) always allowed
    if (!caller) return true;

    // Object can shadow its own methods
    if (caller === target) return true;

    // Admin check (if avatar has admin flag)
    if ('isAdmin' in caller && (caller as any).isAdmin === true) return true;

    // Check method-specific shadow policy (if defined)
    const policy = (target as any).getShadowPolicy?.(methodName);
    if (policy) {
      return policy(caller, target);
    }

    // Default: Deny (must be explicitly allowed)
    return false;
  }

  /**
   * Check if caller can remove a shadow from target.method.
   *
   * Default policy: Same as add (system, admin, or self).
   */
  private static canRemoveShadow(
    caller: Stuff | null,
    target: Stuff,
    methodName: string,
    shadow: Shadow
  ): boolean {
    // Use same policy as add
    return this.canAddShadow(caller, target, methodName);
  }

  /**
   * Check if caller can clear all shadows from target.method.
   *
   * More restrictive: Only system or admin.
   */
  private static canClearShadows(caller: Stuff | null, target: Stuff, methodName: string): boolean {
    if (!caller) return true;  // System
    if ('isAdmin' in caller && (caller as any).isAdmin === true) return true;
    return false;  // Nobody else (not even self)
  }
}

/**
 * Execute a shadow stack, calling each shadow in order.
 * Shadows can:
 * - Modify arguments before passing to next()
 * - Skip calling next() to completely replace behavior
 * - Wrap next() in try/catch for error handling
 * - Return modified results
 */
function executeShadowStack(
  shadows: Shadow[],
  target: any,
  args: any[],
  original: Function
): any {
  let index = 0;

  const next = (...nextArgs: any[]) => {
    // Use modified args if provided, otherwise use original
    const effectiveArgs = nextArgs.length > 0 ? nextArgs : args;

    if (index >= shadows.length) {
      // End of shadow stack - call original implementation
      return original.apply(target, effectiveArgs);
    }

    // Call next shadow in stack
    return shadows[index++].execute(target, effectiveArgs, next);
  };

  return next();
}
```

**@Secured Decorator** (unified interception):
```typescript
/**
 * Unified decorator that handles:
 * 1. Destroyed object checks
 * 2. Security policy enforcement
 * 3. Call stack tracking
 * 4. Shadow execution
 *
 * Usage:
 *   @Secured() - Just destroyed check + stack tracking
 *   @Secured(SecurityPolicies.AdminOrSystem) - Require admin/system caller
 *   @Secured(SecurityPolicies.Custom((caller, target) => ...)) - Custom logic
 */
function Secured(policy?: SecurityPolicy) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function(...args: any[]) {
      // STEP 1: Check if object has been destroyed
      if (this.isDestroyed()) {
        throw new DestroyedObjectError(
          `Cannot call ${this.constructor.name}.${propertyKey} on destroyed object (stuffId: ${this.stuffId})`
        );
      }

      // STEP 2: Check security policy (if provided)
      if (policy) {
        const caller = ExecutionContext.getCaller();

        if (!policy.allows(caller, this, propertyKey)) {
          throw new SecurityError(
            `${caller?.constructor.name || 'System'} denied access to ${this.constructor.name}.${propertyKey}`
          );
        }
      }

      // STEP 3: Execute with stack tracking + shadow support
      return ExecutionContext.run(ExecutionContext.getCaller(), this, propertyKey, () => {
        // Use internal method (privileged access for @Secured decorator)
        const shadows = (this as any)._getShadowsInternal(propertyKey);

        if (shadows && shadows.length > 0) {
          // Execute shadow stack
          return executeShadowStack(shadows, this, args, originalMethod);
        }

        // No shadows - call original method directly
        return originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}
```

**Error Types**:
```typescript
class DestroyedObjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DestroyedObjectError';
  }
}

class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}
```

### Usage Examples

**Basic secured method**:
```typescript
class Avatar extends Agent {
  private xp: number = 0;

  @Secured(SecurityPolicies.AdminOrSystem)
  addXp(amount: number): void {
    this.xp += amount;

    if (this.xp >= this.getNextLevelThreshold()) {
      this.levelUp();
    }
  }

  @Secured() // Just destroyed check + stack tracking, no security
  getName(): string {
    return this.name;
  }

  @Secured(SecurityPolicies.OwnerOnly)
  setPassword(newPassword: string): void {
    // Only the controlling Interactive can change password
    this.password = hashPassword(newPassword);
  }
}
```

**Custom security policy**:
```typescript
class Door extends Thing {
  private locked: boolean = false;
  private keyId: string | null = null;

  @Secured(SecurityPolicies.Custom((caller, target: Door) => {
    // Can unlock if:
    // 1. Not locked, OR
    // 2. Caller has the key
    if (!target.locked) return true;

    if (caller instanceof Avatar) {
      const key = caller.inventory.find(item => item.stuffId === target.keyId);
      return key !== null;
    }

    return false;
  }))
  unlock(): void {
    this.locked = false;
  }
}
```

**Function shadowing examples**:
```typescript
const avatar = new Avatar();

// Example 1: Add logging shadow
const loggingShadow: Shadow = {
  execute(target, [amount], next) {
    console.log(`Before addXp: current=${target.xp}, adding=${amount}`);
    const result = next(amount);  // Call original or next shadow
    console.log(`After addXp: new=${target.xp}`);
    return result;
  }
};
ShadowApi.add(avatar, 'addXp', loggingShadow);  // ← Use ShadowApi, not direct

// Example 2: Add validation shadow (executes first due to stack order)
const validationShadow: Shadow = {
  execute(target, [amount], next) {
    if (amount < 0) {
      throw new Error("Cannot add negative XP");
    }
    if (amount > 10000) {
      throw new Error("XP amount too large");
    }
    return next(amount);  // Continue to next shadow
  }
};
ShadowApi.add(avatar, 'addXp', validationShadow);

// Example 3: Completely replace behavior (don't call next)
const doubleXpShadow: Shadow = {
  execute(target, [amount], next) {
    // Buff: Double XP! Don't call next() - completely override
    target.xp += amount * 2;
    return;
  }
};
ShadowApi.add(avatar, 'addXp', doubleXpShadow);

// Remove a shadow
ShadowApi.remove(avatar, 'addXp', doubleXpShadow);

// Clear all shadows for a method (requires admin/system privileges)
ShadowApi.clear(avatar, 'addXp');

// Introspect shadows (read-only)
const shadows = ShadowApi.getShadows(avatar, 'addXp');
console.log(`${shadows.length} shadows on addXp`);
```

**Why route through ShadowApi**:
- **Security**: Validates caller has permission to shadow methods
- **Auditing**: Logs all shadow additions/removals for debugging
- **Validation**: Ensures method exists and is shadowable (blacklist: destroy, constructor, etc.)
- **Events**: Dispatches WellKnownEvents for monitoring
- **Control**: Prevents unauthorized shadow manipulation
- **API discipline**: Single entry point enforces consistent behavior
- **Privileged operations**: Direct access to _shadows is internal-only

**Execution flow with shadows**:
```
User calls: avatar.addXp(100)
  ↓
@Secured decorator runs:
  1. Check if avatar is destroyed ✓
  2. Check security (AdminOrSystem) ✓
  3. ExecutionContext.run() starts ✓
  ↓
Shadow stack executes (last-added first):
  doubleXpShadow: Completely replaces (doesn't call next)
    → Sets avatar.xp += 200
    → Returns
  (validationShadow and loggingShadow never execute)
  ↓
Result: avatar.xp increased by 200 instead of 100
```

**Use cases for shadows**:
- **Temporary buffs/debuffs**: Double XP, movement speed, damage modifiers
- **Debugging**: Log all calls to specific methods on specific instances
- **Testing**: Mock behavior of specific object instances
- **Event hooks**: Trigger events before/after method execution
- **Validation**: Add runtime validation without modifying original code
- **Transformation**: Modify arguments or return values

### Developer Experience

**ESLint Rule** (optional, Phase 3+):
```javascript
// Enforce @Secured on all public methods
{
  "rules": {
    "require-secured-decorator": {
      "public-methods": true,
      "exclude-patterns": ["^_", "^constructor$"]
    }
  }
}
```

**Internal/private methods don't need @Secured**:
```typescript
class Avatar extends Agent {
  @Secured(SecurityPolicies.AdminOrSystem)
  public addXp(amount: number): void {
    this.xp += amount;
    this.checkLevelUp();  // Internal call - no decorator needed
  }

  // Private method - no @Secured needed (can't be called externally)
  private checkLevelUp(): void {
    if (this.xp >= this.getNextLevelThreshold()) {
      this.levelUp();
    }
  }
}
```

**Debugging utilities**:
```typescript
class ExecutionContext {
  /**
   * Print current call stack (for debugging).
   */
  static dumpCallStack(): void {
    const frames = this.getCallStack();
    console.log('Call Stack:');
    frames.forEach((frame, i) => {
      console.log(
        `  ${i}: ${frame.caller?.constructor.name || 'System'} → ` +
        `${frame.target.constructor.name}.${frame.method}()`
      );
    });
  }

  /**
   * Check if caller matches expected type (for assertions).
   */
  static assertCaller(expectedType: any): void {
    const caller = this.getCaller();
    if (!(caller instanceof expectedType)) {
      throw new SecurityError(
        `Expected caller to be ${expectedType.name}, got ${caller?.constructor.name || 'null'}`
      );
    }
  }
}

// Usage in sensitive methods
@Secured()
dangerousOperation(): void {
  ExecutionContext.assertCaller(AdminAvatar);
  // ... proceed with operation
}
```

### Performance Considerations

**Overhead**:
- AsyncLocalStorage: ~1-2% overhead per secured call (negligible)
- Decorator checks: ~0.5% overhead (destroyed + security)
- Shadow execution: O(n) where n = number of shadows (typically 0-3)

**Optimization strategies**:
- Only use @Secured on methods that need it (public APIs)
- Skip decorator on hot paths (internal/private methods)
- Shadow stacks are per-instance (most instances have no shadows)
- ExecutionContext uses shallow copies (not deep clones)

**Memory**:
- CallStack size: O(depth) - typically 10-50 frames
- Shadow storage: Per-instance Map (only allocated if shadows exist)
- WeakMap for destroyed objects doesn't prevent GC

### Integration with Other Frameworks

**With Framework 3 (Object Lifecycle)**:
- `destroy()` automatically checks `isDestroyed()` via @Secured
- Destroyed objects throw on any method access
- destroyedObjects WeakMap provides debug info

**With Framework 7 (Event System)**:
- Events can be dispatched during method execution
- ExecutionContext available to event handlers
- Shadow system can dispatch events before/after calls

**With Framework 10 (Command Framework)**:
- Commands execute in ExecutionContext with avatar as caller
- Command security policies leverage this framework
- Command shadows can intercept command execution

### Implementation Phases

**Phase 2**: Core infrastructure
- ExecutionContext + AsyncLocalStorage
- @Secured decorator (basic)
- DestroyedObjectError checks
- SecurityPolicies (SelfOnly, Public, AdminOrSystem)

**Phase 3**: Security + Shadows
- Full security policy system
- Custom policy support
- Shadow system implementation
- Integration with command framework

**Phase 4+**: Advanced features
- ESLint rules for @Secured enforcement
- Performance profiling hooks
- Transaction support (rollback on error)
- Audit logging for security violations

### Future Stretch Goals

**Transaction support** (Phase 10+):
```typescript
@Secured()
@Transactional
transferItem(item: Thing, target: Avatar): void {
  this.removeFromInventory(item);  // If this fails...
  target.addToInventory(item);     // ...this rolls back
}
```

**Permission system** (Phase 11+):
```typescript
@Secured(SecurityPolicies.RequirePermission('admin.grant_xp'))
addXp(amount: number): void {
  // Check if caller has 'admin.grant_xp' permission
}
```

---

## Framework 5: Mixin Framework

### Purpose
Enable flexible composition of behaviors without deep inheritance.

### Requirements (Phase 2)

**Mixin Architecture**
- Higher-order function pattern: `Mixin<T extends Constructor<Base>>(base: T)`
- Returns new class extending base with added functionality
- TypeScript interface for type safety

**Mixin Registration**
```typescript
// Symbol-based metadata for tracking
const MIXINS_METADATA = Symbol('mixins');

// Register mixin on class prototype
MixinApi.registerMixin(target, mixinType);
```

**Mixin Detection**
```typescript
MixinApi.isMixin(constructor, MixinType): boolean
MixinApi.hasMixin(instance, MixinType): boolean
MixinApi.queryMixins(instance): MixinType[]
```

**Mixin Composition**
```typescript
// Compose multiple mixins
const ComposedClass = Mixin1(Mixin2(Mixin3(BaseClass)));

// Or use compose utility
const ComposedClass = MixinApi.compose(Mixin1, Mixin2, Mixin3)(BaseClass);
```

**Mixin Constraints**
```typescript
// Decorator to enforce mixin dependencies
@RequiresMixins([ContainerMixin, VisibleMixin])
someMethod() { ... }
```

**Creating New Mixins**
```typescript
function MyMixin<T extends Constructor<Base>>(base: T) {
  class Mixed extends base {
    // Add properties and methods
  }

  MixinApi.registerMixin(Mixed.prototype, Mixins.MyMixin);
  return Mixed;
}
```

**Core Mixins** (Built incrementally)
- Phase 2: Container, Containable, Named, Gendered, Visible
- Phase 4: Sensor, Vocal, CommandGiver
- Phase 6: Exitable, Detailed, Propertied
- Phase 8+: Templatized, domain-specific mixins

---

## Framework 7: API Layer Architecture

### Purpose
Organize utility APIs and define how they access core systems.

### Requirements (Phase 1 design, Phase 3+ implementation)

**Design Philosophy: Pure Static Classes**

We use **pure static classes** (no instantiation, all methods static) for APIs because:
1. **Simplicity**: No boilerplate, no singleton getters, no indirection
2. **Clarity**: `StringApi.unquote(text)` is clear and direct
3. **Stability**: APIs are infrastructure - they should be stable enough that hot-reload isn't necessary
4. **Testing**: Easy to mock with `jest.spyOn(StringApi, 'unquote')`

APIs should be **stable infrastructure**. If you're changing APIs constantly, something's wrong with your abstraction. Focus hot-reload effort on commands, game objects, and templates instead.

**API Organization**
- All APIs are static classes (no instantiation)
- APIs grouped by concern: Stuff, Message, Event, Grammar, String, etc.
- Single import point: `import { Api } from '@/mud/api'`

**API Access Patterns**
```typescript
// Pure utility APIs (no external dependencies)
class StringApi {
  static unquote(str: string): string { ... }
  static escape(str: string): string { ... }
}

// Usage
const text = StringApi.unquote(input);

// APIs that coordinate with singletons
class MessageApi {
  static messageOne(sensor: Sensor, text: string): void {
    const message = { type: "output", payload: { text } };
    sensor.onMessage(message);
  }

  static messageContainer(container: Container, text: string, exclude: Sensor[] = []): void {
    const contents = container.getContents() as Sensor[];
    contents
      .filter(sensor => !exclude.includes(sensor))
      .forEach(sensor => this.messageOne(sensor, text));
  }
}

// APIs that need persistence access
class PersistApi {
  static async save(collection: string, doc: any, id?: string): Promise<void> {
    return PersistenceManager.get().save(collection, doc, id);
  }

  static async findById(collection: string, id: string): Promise<any> {
    return PersistenceManager.get().findById(collection, id);
  }
}
```

**API Categories**
1. **Object APIs**: StuffApi (object management, registry)
2. **Message APIs**: MessageApi (messaging system)
3. **Event APIs**: EventApi (pub/sub system)
4. **String APIs**: StringApi, GrammarApi (text manipulation)
5. **Persistence APIs**: PersistApi (sync utilities)
6. **Utility APIs**: TimeApi, ArrayApi, AssertApi
7. **System APIs**: FileApi, ModuleApi, CallstackApi, MudlogApi
8. **Query APIs**: MqlApi (MUD Query Language)

**Hot-Reload Strategy**

APIs are **NOT designed for hot-reload** because:
- Most APIs are pure functions (StringApi, GrammarApi) - rarely change
- Stateful APIs (StuffApi with object registry, EventApi with subscribers) - difficult to migrate state
- Restarting server is fast (~1 second with tsx watch mode)

**Focus hot-reload on** (see Framework 9):
- Command definitions (YAML + Controllers) - change frequently
- Game object templates (YAML) - content creators iterate
- Domain-specific game logic

If you need to reload an API during development, restart the server. If you're changing APIs so often that this is painful, you probably need better abstractions.

**Testing Strategy**

```typescript
// Mock static methods with jest.spyOn
describe('SomeFeature', () => {
  it('uses StringApi correctly', () => {
    const spy = jest.spyOn(StringApi, 'unquote').mockReturnValue('mocked');

    // Test code that uses StringApi
    expect(spy).toHaveBeenCalledWith('"quoted"');

    spy.mockRestore();
  });
});

// Or use manual mocks in __mocks__/
// __mocks__/@/mud/api/string.ts
export class StringApi {
  static unquote = jest.fn();
  static escape = jest.fn();
}
```

**Adding New APIs**
1. Create static class in `mud/api/[category]/`
2. All methods must be static
3. Document with JSDoc (params, return, examples)
4. Export from category index
5. Add to main Api aggregator
6. Write unit tests (>80% coverage)
7. Update this list of API categories if creating new category

---

## Framework 8: MQL (MUD Query Language)

### Purpose
Define a query language for resolving game objects from CLI input strings at runtime.

MQL is the **bridge between user input and game objects**. When a user types "get pink flower" or "look at door.handle", MQL resolves those strings to actual game object references. It's used extensively by the command framework (field type: `object`) and needs to be fast since nearly every command uses it.

### Requirements (Phase 4 foundation, Phase 8+ extensions)

### Design Philosophy

**Start Simple, Build Foundation for Complex**:
- MVP: Resolve simple queries ("flower", "sword", "merchant")
- Phase 8+: Context navigation ("here:x.east:flower")
- Phase 9+: Complex queries ("all red items in chest", "items worth > 100")
- Always: Keep it performant (< 1ms for simple queries, < 10ms for complex)

**Context-Aware Resolution**:
- Queries resolve relative to context (avatar's location, inventory, etc.)
- Explicit context overrides ("me:sword" vs "here:sword")
- Scope navigation ("x.north:room:chest:items")

**Progressive Specificity**:
- Start broad, narrow down ("flower" vs "pink flower" vs "the second pink flower")
- Handle ambiguity gracefully ("Which flower did you mean?")

### Basic Query Syntax (Phase 4)

**Simple Object Reference** (MVP):
```
<identifier>

Examples:
"flower"          → Find object named/keyworded "flower" in current context
"pink flower"     → Find object matching both "pink" and "flower"
"door"            → Find door in current location
"sword"           → Find sword in inventory or location (search order defined)
```

**Resolution Algorithm** (Phase 4):
1. **Tokenize**: Split query into keywords ("pink flower" → ["pink", "flower"])
2. **Search contexts** (in order):
   - Avatar inventory
   - Current location contents
   - Current location itself
   - Adjacent locations (if configured)
3. **Match objects**: Object matches if all keywords match name or keywords
4. **Rank results**: Prefer exact name match > partial match > keyword match
5. **Return first** or **prompt for disambiguation** if multiple matches

**Keyword Matching**:
```typescript
// Objects have keywords for flexible matching
class Thing extends Stuff {
  name: string = "pink rose";
  keywords: string[] = ["flower", "plant", "rose"];

  // User can type any of these to match:
  // "rose" ✓
  // "flower" ✓
  // "pink flower" ✓
  // "pink rose" ✓ (exact name, highest rank)
  // "plant" ✓
}
```

**Ordinal Disambiguation** (Phase 4):
```
first <identifier>
second <identifier>
third <identifier>

Examples:
"first flower"    → First matching flower
"second sword"    → Second matching sword
"third apple"     → Third apple
```

**Note on Numeric Ordinals**:
We deliberately do NOT support `"3 apple"` syntax because it's ambiguous:
- `"3 apple"` could mean "third apple" (ordinal) or "3 apples" (quantity)
- Use `"third apple"` for ordinal selection
- Use `"3 apples"` for quantity selection (see Multi-Object Selection section below)

### Object Globbing (Globbable Property) - Phase 5+

**What Globbing Actually Means**:

**Globbing** is a memory optimization and UX improvement where **IDENTICAL objects** (same blueprint) are represented by a **single clone** that maintains a **count** of how many logical items it represents.

**CRITICAL: Globbing Uses Clone COUNT, Not Multiple Clones!**

❌ **WRONG MODEL**: 10 arrows = 10 separate clones in memory
```
Container: [arrow1, arrow2, arrow3, ..., arrow10]  ← 10 objects
```

✅ **CORRECT MODEL**: 10 arrows = 1 clone with count=10
```
Container: [arrowClone]  ← 1 object with count=10
arrowClone.count = 10    ← GlobbedMixin maintains state
```

**Key Implementation Details**:
- **GlobbedMixin maintains count** as state on the clone itself
- **At most 2 clones** of same blueprint in same container (during unglob/glob operations)
- **Usually just 1 clone** representing multiple logical items
- **Unglobbing creates new clone** and adjusts counts
- **Globbing merges counts** and destroys one clone

**Key Distinction**:
- **Globbing** = Single clone with count (memory optimization, same blueprint only)
- **Multi-object selection** = MQL queries that return multiple clones (can be different blueprints)

---

## Clear Example 1: Globbing (Wood Arrows)

**Scenario**: Player has 10 identical wood arrows from same blueprint.

**WITHOUT Globbing** (memory inefficient):
```
Inventory contains: (10 separate clones in memory)
- WoodArrow clone (stuffId: a1)
- WoodArrow clone (stuffId: a2)
- WoodArrow clone (stuffId: a3)
... (7 more clones)
- WoodArrow clone (stuffId: a10)

Player sees: 10 separate lines in inventory listing
```

**WITH Globbing** (memory efficient):
```
Inventory contains: (1 clone with count state)
- WoodArrow clone (stuffId: a1, count: 10) ← GlobbedMixin maintains count

Player sees when looking at inventory:
"wood arrows (10)"   ← Single line, single clone with count=10
```

**Operations**:

**Use 1 arrow** (no split needed - just decrement count):
```
Player types: "shoot wood arrow at target"
→ arrow.count decremented from 10 to 9
→ Arrow used/destroyed in combat logic
→ Inventory now shows: "wood arrows (9)"
→ Still just 1 clone in memory (count=9)
```

**Drop 3 arrows** (requires unglobbing - split the stack):
```
Player types: "drop 3 wood arrows"

Before:
- Inventory: 1 WoodArrow clone (stuffId: a1, count: 9)
- Room: (empty)

Unglob Operation:
1. Create new WoodArrow clone (stuffId: a2, count: 3)  ← Clone from template
2. Adjust original: a1.count = 9 - 3 = 6
3. Transfer a2 to room

After:
- Inventory: 1 WoodArrow clone (stuffId: a1, count: 6)
- Room: 1 WoodArrow clone (stuffId: a2, count: 3)

Player sees:
- Inventory: "wood arrows (6)"
- Room: "wood arrows (3)"

Total clones in game: 2 (not 10!)
```

**Pick up arrows** (requires globbing - merge the stacks):
```
Player types: "get 3 wood arrows" (from room)

Before:
- Inventory: 1 WoodArrow clone (stuffId: a1, count: 6)
- Room: 1 WoodArrow clone (stuffId: a2, count: 3)

Get Operation (taking all 3):
1. Transfer a2 from room to inventory
2. Glob operation triggered (both clones same blueprint in same container)
3. Merge: a1.count = 6 + 3 = 9
4. Destroy a2

After:
- Inventory: 1 WoodArrow clone (stuffId: a1, count: 9)
- Room: (empty)

Player sees:
- Inventory: "wood arrows (9)"

Total clones in game: 1
```

**Key Points**:
- ✅ **GlobbedMixin maintains count** on the clone itself
- ✅ **At most 2 clones** of same blueprint in same container (during unglob/glob operations)
- ✅ **Usually just 1 clone** representing multiple logical items
- ✅ **Memory optimization**: 100 arrows = 1 clone with count=100, not 100 clones
- ✅ **UX improvement**: Single line display instead of spam

**When Are There 2 Clones?**
```
Scenario 1: Unglobbing in progress
- Before: Container has 1 WoodArrow clone (count=10)
- During unglob(3): Creates 2nd clone (count=3), adjusts 1st clone (count=7)
- After transfer: 1st clone stays in source, 2nd clone moves to destination

Scenario 2: New clone arriving before glob
- Container has 1 WoodArrow clone (count=5)
- New WoodArrow clone arrives (count=3)
- Container.addToInventory() triggers globWith()
- Result: 1 WoodArrow clone (count=8), 2nd clone destroyed

Scenario 3: Steady state
- Container has 1 WoodArrow clone (count=8)
- No operations happening
- This is the normal state: 1 clone
```

---

## Clear Example 2: Multi-Object Selection (Equipment Set)

**Scenario**: Player has a full equipment set - all DIFFERENT blueprints.

```
Inventory contains:
- IronSword (blueprint: /items/weapons/iron_sword.js, stuffId: s1)
- WoodenShield (blueprint: /items/armor/wooden_shield.js, stuffId: sh1)
- LeatherHelmet (blueprint: /items/armor/leather_helmet.js, stuffId: h1)
- IronBoots (blueprint: /items/armor/iron_boots.js, stuffId: b1)

Player sees when looking at inventory:
"an iron sword"
"a wooden shield"
"a leather helmet"
"iron boots"

← Four separate lines (different blueprints, NEVER glob)

Player types: "drop all equipment"
→ MQL resolves "all equipment" (multi-object selection)
→ Finds: [IronSword, WoodenShield, LeatherHelmet, IronBoots]
→ Transfers all 4 to room
→ Inventory now empty
```

**Why this doesn't glob**: Each item is UNIQUE (different blueprint, different properties). Not interchangeable. Displayed individually.

---

## The Ambiguity Problem (Mixed Globs)

**Scenario**: Player has wood arrows AND silver arrows (different blueprints).

```
Inventory contains: (2 clones total)
- WoodArrow clone (stuffId: w1, count: 5, blueprint: wood_arrow.js)
- SilverArrow clone (stuffId: s1, count: 3, blueprint: silver_arrow.js)

Player sees:
"wood arrows (5)"
"silver arrows (3)"

← Two separate lines (different blueprints = separate clones, never merge)

Player types: "shoot 3 arrows"   ← AMBIGUOUS!

PROBLEM: Which arrows?
- Wood arrows? Silver arrows? Mix of both?
- Search order (take wood first)? Ask for clarification?
```

**Resolution Options**:

**Option A: Require Specificity** (RECOMMENDED for Phase 5)
```
Player: "shoot 3 arrows"
System: "Which arrows? (1) wood arrows (5) (2) silver arrows (3)"
Player: "1"
System: Uses 3 wood arrows
```

**Option B: Search Order** (Could be Phase 8)
```
Player: "shoot 3 arrows"
System: Takes from first glob in search order (wood arrows)
→ Uses 3 wood arrows
→ Inventory: "wood arrows (2)", "silver arrows (3)"
```

**Option C: Explicit Only** (SAFEST for MVP)
```
Player: "shoot 3 arrows"
System: "You have wood arrows and silver arrows. Please specify which type."
Player: "shoot 3 wood arrows"
System: Uses 3 wood arrows ✓
```

**Recommendation**: Start with **Option C** (explicit only) for Phase 5. It's safest and clearest. Add Option A (disambiguation prompt) in Phase 8 if needed.

---

## The Consistency Problem (Forgotten Globbable)

**Scenario**: Someone creates iron_arrow blueprint but forgets to make it Globbable.

```
Inventory contains: (4 clones total - should be 2!)
- WoodArrow clone (stuffId: w1, count: 5, Globbable: true)
- IronArrow clone (stuffId: i1, Globbable: false)
- IronArrow clone (stuffId: i2, Globbable: false)
- IronArrow clone (stuffId: i3, Globbable: false)

Player sees:
"wood arrows (5)"       ← Globbed (nice, 1 clone)
"an iron arrow"         ← Three separate lines (UGLY, inconsistent, 3 clones)
"an iron arrow"
"an iron arrow"
```

**PROBLEM**:
- Inconsistent display breaks player expectations (all arrows should behave the same)
- Memory waste (3 clones instead of 1 clone with count=3)
- All arrows should behave the same way

**Solution Options**:

**Option 1: Make Globbable a Blueprint/Template Property** (RECOMMENDED)
```yaml
# wood_arrow.yaml template
name: "wood arrow"
type: Projectile
globbable: true    # ← Defined in template, can't forget

# iron_arrow.yaml template
name: "iron arrow"
type: Projectile
globbable: true    # ← Must be set explicitly
```

**Option 2: Category-Based Auto-Globbing**
```typescript
// Auto-glob based on item category
class Thing {
  get isGlobbable(): boolean {
    return this.category === 'consumable' ||
           this.category === 'ammo' ||
           this.category === 'crafting_material';
  }
}
```

**Option 3: Linter Warning**
```
WARNING: iron_arrow.js is similar to wood_arrow.js but lacks Globbable mixin.
Consider making all arrow types consistently Globbable.
```

**Recommendation**: Use **Option 1** (template property) for Phase 5. It's explicit, discoverable, and hard to forget.

---

## When to Make Objects Globbable

**Globbable** (should auto-merge):
- ✅ **Ammunition**: Arrows, bullets, throwing knives (identical, used one at a time)
- ✅ **Consumables**: Health potions, mana potions (identical, stackable)
- ✅ **Crafting materials**: Wood planks, iron ore (identical, bulk items)

**NOT Globbable** (should stay separate):
- ❌ **Weapons**: Swords, bows, daggers (unique or semi-unique, not interchangeable)
- ❌ **Armor**: Helmets, shields, boots (unique or semi-unique)
- ❌ **Quest items**: Magic amulets, keys, letters (usually unique)
- ❌ **Books**: Different titles (each book is unique content)
- ❌ **Containers**: Backpacks, chests (usually unique or semi-unique)

**Special Cases** (needs separate design):
- 💰 **Money/Currency**: Special enough to warrant its own system (not just GlobbedMixin)

**Rule of Thumb**: If you'd expect to see "some X (count)" in your inventory, make it Globbable. If you'd expect to see each one listed individually, don't.

---

## Implementation (Phase 5)

**Template Definition** (YAML):
```yaml
# wood_arrow.yaml
name: "wood arrow"
keywords: ["arrow", "projectile"]
type: Projectile
damage: 5
globbable: true    # ← Makes all wood arrows glob together

# iron_sword.yaml
name: "iron sword"
keywords: ["sword", "weapon", "blade"]
type: Weapon
damage: 15
globbable: false   # ← Each sword displayed individually (default)
```

**Thing Base Class** (checks template property):
```typescript
class Thing extends Stuff {
  // Check if this object should glob with others
  get isGlobbable(): boolean {
    return this.template?.globbable === true;
  }

  // Blueprint key for globbing (must match to glob together)
  get blueprintKey(): string {
    return this.templateKey || this.constructor.name;
  }
}
```

**GlobbedMixin** (maintains count state on Thing):
```typescript
/**
 * Mixin for things that can stack together (arrows, potions, crafting materials).
 * Maintains a count of how many logical items this clone represents.
 *
 * Note: Money/currency is a special case with its own system (not using this mixin).
 */
function GlobbedMixin<T extends Constructor<Thing>>(base: T) {
  class Globbed extends base {
    // How many logical items this clone represents
    count: number = 1;

    // Check if can glob with another thing
    canGlobWith(other: Thing): boolean {
      if (!this.isGlobbable || !other.isGlobbable) return false;
      if (this === other) return false;

      // Must be same blueprint
      return this.blueprintKey === other.blueprintKey;
    }

    // Merge other into this, destroy other
    globWith(other: Globbed): void {
      if (!this.canGlobWith(other)) {
        throw new Error(`Cannot glob ${this.name} with ${other.name}`);
      }

      this.count += other.count;
      other.destroy();

      MudlogApi.debug('glob', `Globbed: ${other.count} merged into ${this.stuffId}, new count: ${this.count}`);
    }

    // Split some quantity into new clone
    async unglob(quantity: number): Promise<Globbed> {
      if (quantity <= 0) {
        throw new Error(`Invalid unglob quantity: ${quantity}`);
      }

      if (quantity >= this.count) {
        throw new Error(`Cannot unglob ${quantity} from count of ${this.count}`);
      }

      // Create new clone from same template
      const newClone = await StuffApi.clone(this.templateKey) as Globbed;
      newClone.count = quantity;

      // Reduce this clone's count
      this.count -= quantity;

      MudlogApi.debug('glob', `Unglobbed: ${quantity} split from ${this.stuffId} (${this.count} remaining) into ${newClone.stuffId}`);

      return newClone;
    }

    // Override display methods
    get shortDescription(): string {
      if (this.count === 1) {
        return super.shortDescription;
      }

      // Pluralize for display
      const plural = GrammarApi.pluralize(this.name);
      return `${plural} (${this.count})`;
    }
  }

  MixinApi.registerMixin(Globbed.prototype, Mixins.Globbed);
  return Globbed;
}

// Persistent fields for GlobbedMixin
GlobbedMixin.persistentFields = ['count'];
```

**Container Glob Management** (automatic globbing):
```typescript
class Container extends ContainerMixin(Stuff) {
  // Auto-glob when globbable object added
  addToInventory(thing: Thing): void {
    super.addToInventory(thing);

    if (!thing.isGlobbable) return;  // Skip non-globbable

    // Find existing clone of same blueprint
    const existing = this.findGlobbableMatch(thing);

    if (existing && existing !== thing) {
      // Glob into existing clone
      (existing as any).globWith(thing);
      // thing is now destroyed, only existing remains
    }
  }

  // Find existing clone that can glob with this thing
  private findGlobbableMatch(thing: Thing): Thing | null {
    for (const item of this.getContents()) {
      if (item.isGlobbable && item !== thing) {
        if ((item as any).canGlobWith(thing)) {
          return item;
        }
      }
    }
    return null;
  }

  // Get contents for display (globs shown with count)
  getContentsDisplay(): string[] {
    return this.getContents().map(item => item.shortDescription);
  }
}
```

**Using Globs in Commands**:
```typescript
class GetCommand extends CommandController {
  async execute(fields: any, options: any, context: CommandContext): Promise<void> {
    const quantity = fields.quantity || 1;  // "get 3 arrows" or "get arrow"
    const target = fields.target;           // "arrows"

    // MQL resolves to single arrow clone (which may have count > 1)
    const arrowClone = await MqlApi.resolve(target, context);

    if (!arrowClone) {
      return context.avatar.send(`You don't see any ${target}.`);
    }

    const location = context.avatar.getEnvironment();

    if (arrowClone.isGlobbable && arrowClone.count > quantity) {
      // Unglob: split into two clones
      const split = await (arrowClone as any).unglob(quantity);

      // Transfer the split portion
      location.removeFromInventory(split);
      context.avatar.addToInventory(split);  // Auto-globs if player has matching arrows

      context.avatar.send(`You pick up ${split.shortDescription}.`);
    } else {
      // Take entire clone (all items)
      location.removeFromInventory(arrowClone);
      context.avatar.addToInventory(arrowClone);  // Auto-globs if player has matching arrows

      context.avatar.send(`You pick up ${arrowClone.shortDescription}.`);
    }
  }
}
```

**Display Behavior** (simple - shortDescription handles count):
```typescript
// Inventory command shows all items (globs display with count automatically)
class InventoryController extends CommandController {
  execute(model: CommandModel, context: CommandContext): CommandResult {
    const items = context.avatar.getContents();

    if (items.length === 0) {
      return {
        success: true,
        output: { text: "You aren't carrying anything." }
      };
    }

    const lines: string[] = ["You are carrying:"];

    // Each item's shortDescription includes count if globbed
    for (const item of items) {
      lines.push(`  ${item.shortDescription}`);
      // Globbed: "  wood arrows (10)"
      // Individual: "  an iron sword"
    }

    return {
      success: true,
      output: { text: lines.join("\n") }
    };
  }
}

// Look command shows items in room (globs display with count automatically)
class LookController extends CommandController {
  private describeContents(location: Location): string {
    const items = location.getContents();

    if (items.length === 0) {
      return "";
    }

    const lines: string[] = ["You see:"];

    for (const item of items) {
      lines.push(`  ${item.shortDescription}`);
      // Globbed: "  wood arrows (5)"
      // Individual: "  a wooden chest"
    }

    return lines.join("\n");
  }
}
```

**Globbing Rules** (automatic, based on template property):
- ✅ Same blueprint (same `templateKey`) → glob together
- ✅ `globbable: true` in template → participates in globbing
- ✅ Same container → globs
- ❌ Different blueprints → separate globs (wood_arrow vs silver_arrow)
- ❌ Different containers → separate globs (room vs inventory)
- ❌ `globbable: false` or not set → never globs (display individually)

**Important**: Globbing is **NOT MVP**. It's a Phase 5 optimization for better UX. Phase 4 can work fine without it - just display all objects individually.

---

### Multi-Object Selection & Quantities (Phase 4)

**What This Actually Is**:

**Multi-object selection** is an MQL feature that lets users operate on multiple objects at once, regardless of whether they're identical or not.

**Quantity vs Ordinal Disambiguation**:
```
"third apple"     → Ordinal selection (the 3rd apple in search order)
"3 apples"        → Quantity selection (exactly 3 apple objects)
"all apples"      → Collection selection (every apple matching "apples")
```

**Quantity Syntax** (Phase 4):
```
<number> <identifier>

Examples:
"5 arrows"        → Exactly 5 objects matching "arrows"
"10 potions"      → 10 potion objects
"2 red flowers"   → 2 flowers matching "red flower"
```

**Collection Syntax** (Phase 4):
```
all <identifier>

Examples:
"all flowers"     → Every object matching "flowers" (could be red, blue, pink)
"all arrows"      → Every arrow (could be different types if they share keyword)
"all red items"   → Every item matching "red"
```

**Critical Distinction**:
- `"all arrows"` when you have red arrows AND blue arrows → **multi-object selection** (different blueprints)
- `"3 arrows"` means "3 instances of arrows" → could come from a glob if they're identical, or just 3 separate objects
- `"red and blue arrows"` or `"all types of arrows"` → NL territory, don't design for MVP

**MQL Resolution**:
```typescript
// Quantity selection
MqlApi.resolveMany("arrows", context, { limit: 5 })
// Returns up to 5 arrow objects (any blueprints matching "arrows")

// Collection selection
MqlApi.resolveMany("arrows", context, { limit: Infinity })
// Returns ALL arrow objects matching "arrows" keyword

// Mixed blueprints example:
// Room has 3 red arrows (blueprint: arrow_red) + 2 blue arrows (blueprint: arrow_blue)
MqlApi.resolveMany("arrows", context, { limit: 4 })
// Returns: [RedArrow, RedArrow, RedArrow, BlueArrow]
// (Takes in search order, doesn't care about blueprint differences)
```

**Command Handling**:
```typescript
class GetController extends CommandController {
  execute(model: CommandModel, context: CommandContext): CommandResult {
    const targets = model.fields.targets;  // Could be single object or array

    if (Array.isArray(targets)) {
      // Multi-object handling
      const descriptions = targets.map(t => t.name).join(", ");

      for (const target of targets) {
        this.pickUp(target, context);
      }

      return {
        success: true,
        output: { text: `You take ${targets.length} items: ${descriptions}` }
      };
    } else {
      // Single object
      this.pickUp(targets, context);
      return {
        success: true,
        output: { text: `You take ${targets.name}.` }
      };
    }
  }
}
```

**User Experience Examples**:
```
Room: 5 identical wood arrows (WITH globbing)
- Memory: 1 WoodArrow clone (count=5)
- Display: "wood arrows (5)"
- "get 3 arrows" → Unglobs into 2 clones: room gets 1 clone (count=2), player gets 1 clone (count=3)

Room: 5 identical wood arrows (WITHOUT globbing)
- Memory: 5 separate WoodArrow clones
- Display: 5 separate lines "a wood arrow"
- "get 3 arrows" → Takes 3 of the 5 clones, 2 remain in room

Room: 3 red arrows + 2 blue arrows (WITH globbing, different blueprints)
- Memory: 2 clones (RedArrow count=3, BlueArrow count=2)
- Display: "red arrows (3)" and "blue arrows (2)"
- "get 3 arrows" → AMBIGUOUS (red? blue? mix?)
  - Option C (MVP): "You have red arrows and blue arrows. Please specify which type."
  - Option A (Phase 8): Prompt: "Which arrows? (1) red arrows (3) (2) blue arrows (2)"
- "get all arrows" → Takes both clones (all 5 arrows)
- "get red arrows" → Takes RedArrow clone (count=3)
- "get 2 red arrows" → Unglobs RedArrow into 2 clones (takes count=2, leaves count=1)

Important:
- "get 3 arrows" is UNAMBIGUOUS when only one type present
- "all arrows" works across different blueprints (multi-object selection)
- "red and blue arrows" is NL TERRITORY (don't handle in MVP)
```

**YAML Field Configuration**:
```yaml
verbs: [get, take]
syntax:
  - pattern: "<targets...>"
    description: "Take one or more objects"
    fields:
      targets:
        type: object
        required: true
        multiple: true     # ← Enables multi-object selection
        validators: [canReach, canCarry]

# Usage:
"get flower"          → single object
"get 5 arrows"        → array of 5 arrow objects
"get all flowers"     → array of all flower objects (any blueprint)
```

**Error Handling**:
```
"get 5 arrows" (only 3 available)
→ "You can only find 3 arrows here."
→ Takes 3 arrows (partial success)

"get all dragons" (no dragons present)
→ "You don't see any dragons here."
→ Takes nothing (failure)
```

**Money/Currency - Special Case** (Future Design):

**IMPORTANT**: Money/currency is different enough from regular globbed items that it may need its own completely separate system. Don't assume it uses GlobbedMixin.

**Possible approaches** (to be designed later):
1. Virtual currency (number property): `avatar.gold = 1250`
2. Object-based with custom behavior (not just GlobbedMixin)
3. Hybrid system (virtual for most operations, objects for physical representation)

**We're not there yet** - currency needs its own design phase when we get to it.

**Implementation Phases**:
- **Phase 4**: Basic quantity syntax (`5 arrows`) - MVP
- **Phase 4**: Basic collection syntax (`all flowers`) - MVP
- **Phase 5**: GlobbedMixin (for arrows, potions, consumables) - post-MVP optimization
- **Phase 5+**: Money/currency system (separate design, not covered here)
- **Phase 8+**: Advanced MQL filters (`all red flowers where value > 10`)

### Contextual Query Syntax (Phase 8)

**Context Prefix**:
```
<context>:<identifier>

Examples:
"me:sword"              → Sword in avatar's inventory (explicit)
"here:flower"           → Flower in current location (explicit)
"here:chest"            → Chest in current location
"chest:items"           → Items inside chest
```

**Context Navigation**:
```
<path>:<identifier>

Path segments:
- x.<direction>    Navigate via exit (x.north, x.east, x.up)
- <object>         Navigate into object
- me               Avatar's inventory
- here             Current location

Examples:
"x.east:flower"           → Flower in room to the east
"x.north:chest:key"       → Key inside chest in north room
"here:x.up:fountain"      → Fountain in room above
"me:backpack:rope"        → Rope inside backpack in inventory
```

**Scope Navigation Examples**:
```typescript
// User is in "Town Square"
"flower"                  // → Flower in Town Square
"x.east:flower"           // → Flower in "East Market" (one room east)
"x.east:vendor"           // → Vendor NPC in "East Market"
"x.east:vendor:wares"     // → Items vendor is selling

// User has backpack in inventory
"backpack"                // → The backpack object itself
"backpack:rope"           // → Rope inside backpack
"me:backpack:rope"        // → Same, explicit context
```

### Complex Query Syntax (Phase 9+)

**Collection Queries** (Future):
```
all <identifier>
all <identifier> where <condition>

Examples:
"all flowers"                      → All flowers in context
"all items in chest"               → All items in chest
"all red items"                    → All items with keyword "red"
"all items where value > 100"      → Items worth more than 100 gold
"all NPCs where level < me.level"  → NPCs weaker than player
```

**Property Queries** (Future):
```
<identifier> where <property> <operator> <value>

Examples:
"sword where damage > 50"          → Swords with high damage
"potion where effect = healing"    → Healing potions only
"NPC where faction = ally"         → Allied NPCs
```

**Aggregate Queries** (Future):
```
count <identifier>
sum <identifier>.<property>

Examples:
"count all gold coins"             → How many gold coins
"sum all items.value"              → Total value of all items
```

### BNF Grammar (Phase 4 - Basic)

```bnf
<query>          ::= <simple-query> | <ordinal-query>

<simple-query>   ::= <identifier>
<identifier>     ::= <keyword> | <keyword> <identifier>
<keyword>        ::= [a-zA-Z0-9_-]+

<ordinal-query>  ::= <ordinal> <identifier>
<ordinal>        ::= "first" | "second" | "third"

<quantity-query> ::= <number> <identifier>
<glob-query>     ::= "all" <identifier>
<number>         ::= [0-9]+
```

### BNF Grammar (Phase 8 - Contextual)

```bnf
<query>          ::= <contextual-query> | <simple-query>

<contextual-query> ::= <context> ":" <identifier>
<context>        ::= <context-name> | <path>

<context-name>   ::= "me" | "here"

<path>           ::= <segment> | <segment> ":" <path>
<segment>        ::= <context-name> | <exit> | <identifier>
<exit>           ::= "x." <direction>
<direction>      ::= "north" | "south" | "east" | "west" | "up" | "down" | "northeast" | "northwest" | "southeast" | "southwest"
```

### BNF Grammar (Phase 9+ - Complex)

```bnf
<query>          ::= <collection-query> | <property-query> | <contextual-query>

<collection-query> ::= "all" <identifier> (<where-clause>)?
<property-query>   ::= <identifier> <where-clause>

<where-clause>   ::= "where" <condition>
<condition>      ::= <property> <operator> <value>
<property>       ::= <identifier> | <identifier> "." <property>
<operator>       ::= "=" | "!=" | "<" | ">" | "<=" | ">=" | "contains"
<value>          ::= <string> | <number> | <identifier>

<string>         ::= '"' [^"]* '"'
```

### Implementation (MqlApi)

```typescript
class MqlApi {
  /**
   * Resolve a query string to game object(s)
   *
   * @param query - MQL query string ("pink flower", "x.east:chest", etc.)
   * @param context - Resolution context (avatar, location)
   * @returns Resolved object(s) or null if not found
   */
  static resolve(query: string, context: MqlContext): Stuff | null {
    // Phase 4: Simple resolution
    // Phase 8: Add context navigation
    // Phase 9: Add collection/property queries
  }

  /**
   * Resolve to multiple objects (for collection queries)
   */
  static resolveMany(query: string, context: MqlContext): Stuff[] {
    // Future: "all flowers", "all items where value > 100"
  }

  /**
   * Parse query into structured AST
   */
  static parse(query: string): MqlAst {
    // Tokenize and parse according to BNF grammar
  }

  /**
   * Execute parsed AST against context
   */
  static execute(ast: MqlAst, context: MqlContext): Stuff | Stuff[] | null {
    // Walk AST and resolve references
  }
}

interface MqlContext {
  avatar: Avatar;           // Who is querying
  location: Location;       // Where they are
  inventory: Thing[];       // What they have
  searchOrder?: string[];   // Custom search order (default: inventory, location, adjacent)
}

interface MqlAst {
  type: 'simple' | 'contextual' | 'collection' | 'property';
  identifier?: string[];    // Keywords
  context?: MqlContextNode; // Context path
  ordinal?: number;         // "first", "second", etc.
  condition?: MqlCondition; // "where" clause
}
```

### Resolution Examples

**Phase 4 - Simple Queries**:
```typescript
// User in room with "pink flower" and "red flower"
MqlApi.resolve("flower", context)
// → Ambiguous! Prompt user: "Which flower? (1) pink flower (2) red flower"

MqlApi.resolve("pink flower", context)
// → Returns pink flower object (unambiguous)

MqlApi.resolve("first flower", context)
// → Returns pink flower (first in search order)

MqlApi.resolve("second flower", context)
// → Returns red flower (second in search order)

// User has "iron sword" in inventory, "steel sword" in room
MqlApi.resolve("sword", context)
// → Returns iron sword (inventory searched first)

MqlApi.resolve("here:sword", context)
// → Returns steel sword (explicit context override)
```

**Phase 8 - Contextual Queries**:
```typescript
// User in Town Square, East Market has "apple cart"
MqlApi.resolve("x.east:cart", context)
// → Navigate east exit, find cart in East Market

MqlApi.resolve("x.east:cart:apples", context)
// → Navigate east, find cart, return apples inside cart

// User has backpack with rope inside
MqlApi.resolve("backpack:rope", context)
// → Find backpack in inventory, return rope inside it

MqlApi.resolve("me:backpack:rope", context)
// → Explicit: search avatar inventory, find backpack, return rope
```

**Phase 9+ - Complex Queries**:
```typescript
// Get all flowers in location
MqlApi.resolveMany("all flowers", context)
// → Returns array of all flower objects

// Get all valuable items
MqlApi.resolveMany("all items where value > 100", context)
// → Returns items worth more than 100 gold

// Count gold coins
const coins = MqlApi.resolveMany("all gold coins", context);
const count = coins.length;
```

### Integration with Command Framework

Commands use MQL to resolve object fields:

```yaml
verbs: [get, take]
syntax:
  - pattern: "<target>"
    fields:
      target:
        type: object         # ← Uses MqlApi.resolve()
        required: true
        validators: [canReach, canCarry]
```

```typescript
// CommandApi.resolveFields() calls MqlApi
class CommandApi {
  static resolveFields(rawModel: any, definition: CommandDefinition, context: CommandContext): CommandModel {
    const resolved = { ...rawModel };

    for (const [fieldName, fieldDef] of Object.entries(definition.fields)) {
      if (fieldDef.type === 'object') {
        // Use MQL to resolve string → object
        const query = rawModel[fieldName];
        resolved[fieldName] = MqlApi.resolve(query, {
          avatar: context.avatar,
          location: context.location,
          inventory: context.avatar.inventory
        });

        if (!resolved[fieldName]) {
          throw new CommandError(`You don't see any "${query}" here`);
        }
      }
    }

    return resolved as CommandModel;
  }
}
```

### Performance Considerations

**Simple Queries** (Phase 4):
- Target: < 1ms for typical queries
- Linear search acceptable for small contexts (<100 objects)
- Exact name match short-circuits (O(1) if name map exists)

**Contextual Queries** (Phase 8):
- Target: < 5ms including navigation
- Navigation is cheap (follow references, not searches)
- Cache resolved contexts (e.g., "x.east" → Room object)

**Complex Queries** (Phase 9+):
- Target: < 10ms for filtered collections
- Use indexes for property queries (value, level, etc.)
- Consider query result caching for expensive queries
- Limit collection size (max 1000 results?)

**Optimization Strategies**:
```typescript
class MqlApi {
  // Cache parsed ASTs
  private static astCache = new Map<string, MqlAst>();

  // Cache keyword indexes per location
  private static keywordIndex = new WeakMap<Location, Map<string, Stuff[]>>();

  static resolve(query: string, context: MqlContext): Stuff | null {
    // Check cache
    let ast = this.astCache.get(query);
    if (!ast) {
      ast = this.parse(query);
      this.astCache.set(query, ast);
    }

    // Use keyword index for fast lookup
    if (ast.type === 'simple') {
      const index = this.getOrBuildIndex(context.location);
      const candidates = index.get(ast.identifier[0]) || [];
      // Filter and rank
    }

    return this.execute(ast, context);
  }
}
```

### Error Handling

**Not Found**:
```
Query: "dragon"
Result: null
Error: "You don't see any dragon here"
```

**Ambiguous**:
```
Query: "flower" (multiple matches)
Result: null
Prompt: "Which flower did you mean? (1) pink flower (2) red flower (3) blue flower"

// User can then specify:
"first flower"  or  "1 flower"  or  "pink flower"
```

**Invalid Context**:
```
Query: "x.north:chest"  (no north exit exists)
Error: "There's no exit to the north"

Query: "x.east:sword"  (east room has no sword)
Error: "You don't see any sword to the east"
```

**Invalid Syntax** (Phase 8+):
```
Query: "x.north:"  (incomplete path)
Error: "Invalid query syntax"

Query: "all items where value"  (incomplete condition)
Error: "Invalid where clause: expected operator"
```

### Future Extensions

**Variable References** (Phase 10+):
```
$inventory          → Player's inventory
$location.items     → All items in location
$target             → Last referenced object
```

**Functions** (Phase 10+):
```
closest(enemy)      → Nearest enemy
strongest(weapon)   → Highest damage weapon
random(flower)      → Random flower
```

**Logical Operators** (Phase 10+):
```
all items where (value > 100 and rarity = rare)
all NPCs where (faction = ally or faction = neutral)
```

### Testing Strategy

```typescript
describe('MqlApi', () => {
  describe('Phase 4 - Simple Queries', () => {
    it('resolves exact name match', () => {
      const flower = new Thing("pink flower");
      context.location.addToInventory(flower);

      const result = MqlApi.resolve("pink flower", context);
      expect(result).toBe(flower);
    });

    it('resolves keyword match', () => {
      const flower = new Thing("pink rose");
      flower.keywords = ["flower", "plant"];
      context.location.addToInventory(flower);

      const result = MqlApi.resolve("flower", context);
      expect(result).toBe(flower);
    });

    it('handles ambiguity', () => {
      const flower1 = new Thing("pink flower");
      const flower2 = new Thing("red flower");
      context.location.addToInventory(flower1, flower2);

      const result = MqlApi.resolve("flower", context);
      expect(result).toBeNull();
      // Should prompt user for disambiguation
    });

    it('resolves ordinal', () => {
      const flower1 = new Thing("pink flower");
      const flower2 = new Thing("red flower");
      context.location.addToInventory(flower1, flower2);

      const result = MqlApi.resolve("second flower", context);
      expect(result).toBe(flower2);
    });
  });

  describe('Phase 8 - Contextual Queries', () => {
    it('resolves context navigation', () => {
      const eastRoom = new Location("East Market");
      const cart = new Thing("apple cart");
      eastRoom.addToInventory(cart);

      context.location.addExit("east", eastRoom);

      const result = MqlApi.resolve("x.east:cart", context);
      expect(result).toBe(cart);
    });
  });
});
```

### Implementation Checklist

**Phase 4 - Simple Queries** (MVP):
- [ ] MqlApi.parse() - tokenize and parse simple queries
- [ ] MqlApi.resolve() - resolve single object against context
- [ ] **MqlApi.resolveMany()** - resolve multiple objects (for multi-object selection)
- [ ] Keyword matching (name + keywords)
- [ ] Search order (inventory → location → adjacent)
- [ ] Ordinal disambiguation (first, second, third) - NO numeric ordinals
- [ ] **Quantity syntax** (`5 arrows` → array of 5 arrow objects, any matching blueprints)
- [ ] **Collection syntax** (`all flowers` → array of all matching objects, any blueprints)
- [ ] Integration with CommandApi (resolve `type: object` fields)
- [ ] Unit tests (>80% coverage)

**Phase 8 - Contextual Queries**:
- [ ] Context prefixes (me:, here:)
- [ ] Exit navigation (x.north, x.east)
- [ ] Nested object navigation (chest:items)
- [ ] Path parsing and resolution
- [ ] Update BNF grammar
- [ ] Performance optimization (caching, indexes)

**Phase 9+ - Complex Queries** (Advanced MQL):
- [ ] **Filtered collection queries** (all <identifier> where <condition>)
- [ ] Property queries (where value > 100, where rarity = rare)
- [ ] Aggregate functions (count, sum)
- [ ] Logical operators (and, or, not)
- [ ] Full BNF grammar implementation
- [ ] Note: This is about query complexity, not object globbing (which is Phase 5)
- [ ] Query optimizer
- [ ] Property indexes

---

## Framework 9: Event System

### Purpose
Enable pub/sub communication between game systems without tight coupling through a type-safe, performant event bus.

### Design Philosophy

**Decoupling**: Systems should react to events without knowing who dispatched them. Events are the **only** mechanism for cross-system notifications.

**Type Safety**: Symbol-based event keys prevent collisions. TypeScript interfaces define payload contracts.

**Performance**: Synchronous dispatch by default. Async handlers opt-in for I/O operations.

**Resilience**: Handler errors don't crash dispatch. Failed handlers logged and skipped.

### Requirements (Phase 3: MVP)

**EventApi Interface** (Complete)
```typescript
class EventApi {
  // Core subscription methods
  static subscribe(event: symbol, handler: EventHandler): Subscription;
  static unsubscribe(subscription: Subscription): void;
  static once(event: symbol, handler: EventHandler): Subscription;

  // Dispatch methods
  static dispatch(event: symbol, payload?: any): void;
  static dispatchAsync(event: symbol, payload?: any): Promise<void>;

  // Error handling
  static setErrorHandler(handler: GlobalErrorHandler): void;
  static getErrorHandler(): GlobalErrorHandler | null;

  // Subscription management
  static getAllSubscriptions(event?: symbol): Subscription[];
  static clearAllSubscriptions(event?: symbol): void;
  static getSubscriptionCount(event: symbol): number;

  // Debugging
  static enableDebugMode(): void;
  static disableDebugMode(): void;
  static getEventHistory(limit?: number): EventHistoryEntry[];
}

// Handler types
type EventHandler = (payload: any) => void;
type AsyncEventHandler = (payload: any) => Promise<void>;
type GlobalErrorHandler = (error: Error, event: symbol, handler: EventHandler) => void;

// Subscription interface
interface Subscription {
  event: symbol;
  handler: EventHandler;
  once: boolean;
  unsubscribe(): void;
}

// Event history for debugging
interface EventHistoryEntry {
  event: symbol;
  payload: any;
  timestamp: number;
  handlerCount: number;
  errors: Error[];
}
```

**Event Architecture**
```typescript
// Symbol-based event keys (prevents collisions, enables namespacing)
const EVENT_CONNECT = Symbol('event:connect');
const EVENT_USER_LOGIN = Symbol('event:user:login');
const EVENT_AVATAR_MOVE = Symbol('event:avatar:move');

// Event subscription (returns Subscription for cleanup)
const subscription = EventApi.subscribe(EVENT_CONNECT, (payload) => {
  console.log(`User ${payload.userId} connected`);
});

// One-time subscription (auto-unsubscribes after first dispatch)
EventApi.once(EVENT_USER_LOGIN, (payload) => {
  console.log('First login!');
});

// Event dispatch (synchronous by default)
EventApi.dispatch(EVENT_CONNECT, { userId, socketId, sessionId });

// Async dispatch (waits for all async handlers)
await EventApi.dispatchAsync(EVENT_AVATAR_MOVE, { avatar, from, to });

// Manual unsubscribe
subscription.unsubscribe();
```

**Well-Known Events**
```typescript
// Enum for discoverability and documentation
enum WellKnownEvents {
  // Connection lifecycle
  Connect = Symbol('event:connect'),
  Disconnect = Symbol('event:disconnect'),

  // Authentication
  Login = Symbol('event:login'),
  Logout = Symbol('event:logout'),
  AuthError = Symbol('event:auth:error'),

  // Avatar lifecycle
  AvatarCreate = Symbol('event:avatar:create'),
  AvatarDestroy = Symbol('event:avatar:destroy'),
  AvatarMove = Symbol('event:avatar:move'),

  // Communication
  MessageSent = Symbol('event:message:sent'),
  MessageReceived = Symbol('event:message:received'),
  CommandExecuted = Symbol('event:command:executed'),

  // Object lifecycle
  ObjectCreate = Symbol('event:object:create'),
  ObjectDestroy = Symbol('event:object:destroy'),
  ObjectMove = Symbol('event:object:move'),

  // System events
  ServerStart = Symbol('event:server:start'),
  ServerShutdown = Symbol('event:server:shutdown'),
  ModuleReload = Symbol('event:module:reload'),
}
```

**Event Payload Typing** (TypeScript interfaces for type safety)
```typescript
interface ConnectEventPayload {
  userId: string;
  socketId: string;
  sessionId: string;
  timestamp: number;
}

interface AvatarMoveEventPayload {
  avatar: Avatar;
  from: Location | null;
  to: Location;
  direction?: string;
}

interface MessageSentEventPayload {
  speaker: Avatar;
  message: string;
  location: Location;
  messageType: 'speech' | 'tell' | 'emote';
}

interface CommandExecutedEventPayload {
  avatar: Avatar;
  commandText: string;
  commandName: string;
  success: boolean;
  error?: string;
}
```

**Subscription Lifecycle Management**
```typescript
// Manual subscription cleanup
class MyClass {
  private subscriptions: Subscription[] = [];

  constructor() {
    // Store subscriptions for cleanup
    this.subscriptions.push(
      EventApi.subscribe(WellKnownEvents.Connect, this.onConnect.bind(this)),
      EventApi.subscribe(WellKnownEvents.Disconnect, this.onDisconnect.bind(this))
    );
  }

  destroy(): void {
    // Unsubscribe all when object destroyed
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }

  private onConnect(payload: ConnectEventPayload): void {
    // Handle connection
  }

  private onDisconnect(payload: any): void {
    // Handle disconnection
  }
}

// Automatic cleanup with once()
EventApi.once(WellKnownEvents.ServerStart, () => {
  console.log('Server started - runs only once');
  // Auto-unsubscribes after dispatch
});
```

**Error Handling Patterns**
```typescript
// Global error handler (set once at Application startup)
EventApi.setErrorHandler((error, event, handler) => {
  MudlogApi.error('events', `Error in event ${event.toString()}: ${error.message}`);
  MudlogApi.error('events', `Handler: ${handler.toString()}`);
  MudlogApi.error('events', error.stack);

  // Don't crash - just log and continue
  // Other handlers will still execute
});

// Try-catch in individual handlers (optional)
EventApi.subscribe(WellKnownEvents.MessageSent, (payload) => {
  try {
    // Risky operation
    AchievementSystem.checkChatAchievements(payload.speaker);
  } catch (error) {
    // Handle error locally
    console.error('Achievement check failed:', error);
  }
});

// Async handler error handling
EventApi.subscribe(WellKnownEvents.AvatarMove, async (payload) => {
  try {
    await SomeAsyncOperation(payload.avatar);
  } catch (error) {
    // Async errors caught by EventApi
    MudlogApi.error('events', 'Async operation failed', error);
  }
});
```

**Memory Management** (Prevent memory leaks)
```typescript
// ANTI-PATTERN: Subscriptions without cleanup
class BadClass {
  constructor() {
    EventApi.subscribe(WellKnownEvents.Connect, () => {
      // This leaks! Subscription never unsubscribed
      // BadClass instances can't be garbage collected
    });
  }
}

// GOOD PATTERN: Store and clean up subscriptions
class GoodClass {
  private subscriptions: Subscription[] = [];

  constructor() {
    this.subscriptions.push(
      EventApi.subscribe(WellKnownEvents.Connect, this.onConnect.bind(this))
    );
  }

  destroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }

  private onConnect(payload: any): void { ... }
}

// BEST PATTERN: Use once() for one-time handlers
EventApi.once(WellKnownEvents.ServerStart, () => {
  // Auto-unsubscribes - no leak
});
```

**Integration Examples**

**Example 1: Command dispatches event**
```typescript
class SayController extends CommandController<SayModel> {
  execute(model: SayModel, context: CommandContext): CommandResult {
    const avatar = context.avatar;
    const location = context.location;
    const message = model.fields.message;

    // Send message to room
    MessageApi.messageContainer(location, `${avatar.fullName} says, '${message}'`, [avatar]);

    // Dispatch event for other systems
    EventApi.dispatch(WellKnownEvents.MessageSent, {
      speaker: avatar,
      message,
      location,
      messageType: 'speech'
    });

    return { success: true };
  }
}
```

**Example 2: Achievement system listens for events**
```typescript
class AchievementSystem {
  static initialize(): void {
    // Listen for chat messages
    EventApi.subscribe(WellKnownEvents.MessageSent, (payload) => {
      this.checkChatAchievements(payload.speaker);
    });

    // Listen for movement
    EventApi.subscribe(WellKnownEvents.AvatarMove, (payload) => {
      this.checkExplorationAchievements(payload.avatar);
    });

    // Listen for commands
    EventApi.subscribe(WellKnownEvents.CommandExecuted, (payload) => {
      this.checkCommandAchievements(payload.avatar, payload.commandName);
    });
  }

  private static checkChatAchievements(avatar: Avatar): void {
    // Check if avatar unlocked chat achievements
    // Award achievements if criteria met
  }

  // ... more achievement checks
}
```

**Example 3: Logging system subscribes to all events**
```typescript
class ActivityLogger {
  static initialize(): void {
    // Log all avatar movements
    EventApi.subscribe(WellKnownEvents.AvatarMove, (payload) => {
      MudlogApi.info('activity', `${payload.avatar.fullName} moved to ${payload.to.name}`);
    });

    // Log all messages
    EventApi.subscribe(WellKnownEvents.MessageSent, (payload) => {
      MudlogApi.info('chat', `${payload.speaker.fullName}: ${payload.message}`);
    });

    // Log all commands
    EventApi.subscribe(WellKnownEvents.CommandExecuted, (payload) => {
      MudlogApi.info('commands', `${payload.avatar.fullName}: ${payload.commandText}`);
    });
  }
}
```

**Example 4: Plugin extends event system**
```typescript
// Education plugin adds custom events
enum EducationEvents {
  CourseEnrolled = Symbol('event:edu:course:enrolled'),
  CourseCompleted = Symbol('event:edu:course:completed'),
  QuizStarted = Symbol('event:edu:quiz:started'),
  QuizCompleted = Symbol('event:edu:quiz:completed'),
}

// Plugin subscribes to core events
class EducationPlugin {
  initialize(): void {
    // React to avatar creation
    EventApi.subscribe(WellKnownEvents.AvatarCreate, (payload) => {
      this.initializeStudentProfile(payload.avatar);
    });

    // Award XP for chat participation
    EventApi.subscribe(WellKnownEvents.MessageSent, (payload) => {
      this.awardChatXP(payload.speaker);
    });
  }

  // Plugin dispatches custom events
  enrollInCourse(avatar: Avatar, courseId: string): void {
    // ... enrollment logic ...

    EventApi.dispatch(EducationEvents.CourseEnrolled, {
      avatar,
      courseId,
      timestamp: Date.now()
    });
  }
}
```

### Requirements (Phase 9+: Advanced Features)

**Async Event Handlers**
```typescript
// dispatchAsync waits for all async handlers
await EventApi.dispatchAsync(WellKnownEvents.AvatarMove, payload);

// Async handler
EventApi.subscribe(WellKnownEvents.AvatarMove, async (payload) => {
  await database.logMovement(payload.avatar, payload.to);
});
```

**Event Priorities**
```typescript
// High priority handlers execute first
EventApi.subscribe(WellKnownEvents.MessageSent, handler, { priority: 100 });

// Low priority handlers execute last
EventApi.subscribe(WellKnownEvents.MessageSent, handler, { priority: -100 });

// Default priority is 0
```

**Event Cancellation**
```typescript
// Handler can cancel event (prevents subsequent handlers)
EventApi.subscribe(WellKnownEvents.AvatarMove, (payload) => {
  if (payload.to.isBlocked) {
    payload.cancel = true;  // Cancels event
    return;
  }
});

// Check if event was cancelled
const cancelled = EventApi.dispatch(WellKnownEvents.AvatarMove, payload);
if (cancelled) {
  // Event was cancelled by a handler
}
```

**Event Filtering**
```typescript
// Subscribe with filter predicate
EventApi.subscribe(WellKnownEvents.MessageSent, handler, {
  filter: (payload) => payload.messageType === 'speech'
});

// Only receives events matching filter
```

### Testing Strategy

**Unit Tests**
```typescript
describe('EventApi', () => {
  beforeEach(() => {
    EventApi.clearAllSubscriptions();
  });

  test('subscribe and dispatch', () => {
    const handler = jest.fn();
    EventApi.subscribe(WellKnownEvents.Connect, handler);
    EventApi.dispatch(WellKnownEvents.Connect, { userId: '123' });
    expect(handler).toHaveBeenCalledWith({ userId: '123' });
  });

  test('once unsubscribes after first dispatch', () => {
    const handler = jest.fn();
    EventApi.once(WellKnownEvents.Connect, handler);
    EventApi.dispatch(WellKnownEvents.Connect, {});
    EventApi.dispatch(WellKnownEvents.Connect, {});
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('error in handler does not crash dispatch', () => {
    const handler1 = jest.fn(() => { throw new Error('boom'); });
    const handler2 = jest.fn();
    EventApi.subscribe(WellKnownEvents.Connect, handler1);
    EventApi.subscribe(WellKnownEvents.Connect, handler2);
    EventApi.dispatch(WellKnownEvents.Connect, {});
    expect(handler2).toHaveBeenCalled();  // handler2 still executed
  });

  test('unsubscribe removes handler', () => {
    const handler = jest.fn();
    const sub = EventApi.subscribe(WellKnownEvents.Connect, handler);
    sub.unsubscribe();
    EventApi.dispatch(WellKnownEvents.Connect, {});
    expect(handler).not.toHaveBeenCalled();
  });
});
```

**Integration Tests**
```typescript
describe('Event System Integration', () => {
  test('command execution dispatches event', () => {
    const handler = jest.fn();
    EventApi.subscribe(WellKnownEvents.CommandExecuted, handler);

    const context = createTestContext();
    const controller = new SayController();
    controller.execute({ verb: 'say', fields: { message: 'hi' } }, context);

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ commandName: 'say' })
    );
  });
});
```

### Performance Considerations

**Synchronous Dispatch** (default):
- Handlers execute in order of subscription
- Fast for simple handlers (no I/O)
- Use for most game logic events

**Async Dispatch** (opt-in):
- Waits for all async handlers to complete
- Slower but necessary for I/O (database writes, API calls)
- Use sparingly (connection events, persistence)

**Handler Count**:
- Keep handler count per event < 20 for performance
- If many handlers needed, consider event aggregation

**Memory**:
- Each subscription uses ~100 bytes
- 10,000 subscriptions = ~1MB (negligible)
- Memory leaks from forgotten unsubscribes are the real risk

---

## Framework 10: Command Framework

### Purpose
Define how commands are parsed, validated, and executed using an MVC-like pattern for CLI interaction.

The command framework is the **basic unit of execution** - everything users do goes through commands. It's designed to support future extensibility: web forms that compose commands, natural language processing, scripting languages, and command piping.

### Design Philosophy

**MVC Pattern for CLI**:
- **YAML CommandDefinition** = "View" - Defines how raw command string maps onto structured model
- **Command Model** = "Model" - Parsed, validated data structure passed to controller
- **CommandController** = "Controller" - Executes business logic, outputs result model

**Parser Style**:
- **UNIX-like parsing** (bash/zsh inspired) - Tokenization, quoting, escaping, options
- **PowerShell-inspired piping** (future) - Commands take model in, output model for next command

**Command is the Foundation**:
- All user interactions go through commands (even if abstracted by web forms or NL processing)
- Commands are the primitive - everything else composes on top
- Future: web forms → generate command models, NL processing → parse to commands, scripting → sequence commands

### Requirements (Phase 4)

### 1. Command Definition (YAML-based "View")

The CommandDefinition is like a view template - it defines the "shape" of the command and how to map user input onto a structured model.

```yaml
# Basic command
verbs: [say, ']
description: "Speak to others in your current location"
syntax:
  - pattern: "<message...>"
    description: "Say something to everyone in the room"
    fields:
      message:
        type: string
        required: true
        remaining: true  # Consumes all remaining tokens

# Complex command with options and subcommands
verbs: [look, l]
description: "Examine your surroundings or an object"
syntax:
  - pattern: ""
    description: "Look at current location"

  - pattern: "<target>"
    description: "Look at specific target"
    fields:
      target:
        type: object           # Resolved via MqlApi.resolve()
        required: true
        validators: [mustBeVisible]

  - pattern: "at <target> [detail]"
    description: "Look at specific detail on target"
    fields:
      target:
        type: object
        required: true
      detail:
        type: string
        required: false
    options:
      verbose:
        short: v
        long: verbose
        description: "Show detailed information"
        type: boolean

# Subcommand example (essential for MVP)
verbs: [player, me]
description: "Manage your player character settings"
subcommands:
  name:
    description: "Set your character name"
    pattern: "<firstName> [lastName]"
    fields:
      firstName:
        type: string
        required: true
        validators: [validName, noSpecialChars]
      lastName:
        type: string
        required: false
        validators: [validName, noSpecialChars]

  pronouns:
    description: "Set your pronouns"
    pattern: "<pronouns>"
    fields:
      pronouns:
        type: string
        required: true
        validators: [validPronouns]
    # Examples: "player pronouns they/them", "player pronouns she/her"

  avatar:
    description: "Set your avatar image"
    pattern: "<url>"
    fields:
      url:
        type: string
        required: true
        validators: [validUrl, isImage]

  show:
    description: "Show your current player settings"
    pattern: ""
    # No fields, just displays current settings

# Another subcommand example
verbs: [config]
description: "Configure system settings"
subcommands:
  set:
    pattern: "<key> <value>"
    fields:
      key:
        type: string
        validators: [validConfigKey]
      value:
        type: string
  get:
    pattern: "<key>"
    fields:
      key:
        type: string
  list:
    pattern: ""
```

**Why Subcommands are MVP-Critical**:
- Essential for user-facing commands like `player` (character management)
- Group related operations under single verb (better UX than separate commands)
- Foundation for complex command structures
- Not hard to implement - just routing logic after verb parsing

**Subcommand Parsing**:
```
User types: "player name Alice Wonderland"
           ↓
Tokens: ["player", "name", "Alice", "Wonderland"]
           ↓
Verb: "player"
Subcommand: "name"
Args: ["Alice", "Wonderland"]
           ↓
Match subcommand pattern: "<firstName> [lastName]"
           ↓
Model: { subcommand: "name", fields: { firstName: "Alice", lastName: "Wonderland" } }
           ↓
Execute: PlayerController.executeName(model, context)
```

**Subcommand Implementation**:
```typescript
interface PlayerModel extends CommandModel {
  verb: 'player';
  subcommand: 'name' | 'pronouns' | 'avatar' | 'show';
  fields: {
    firstName?: string;
    lastName?: string;
    pronouns?: string;
    avatar?: string;
  };
}

class PlayerController extends CommandController {
  execute(model: PlayerModel, context: CommandContext): CommandResult {
    // Route to subcommand handler
    switch (model.subcommand) {
      case 'name':
        return this.executeName(model, context);
      case 'pronouns':
        return this.executePronouns(model, context);
      case 'avatar':
        return this.executeAvatar(model, context);
      case 'show':
        return this.executeShow(model, context);
      default:
        return { success: false, error: `Unknown subcommand: ${model.subcommand}` };
    }
  }

  private executeName(model: PlayerModel, context: CommandContext): CommandResult {
    const { firstName, lastName } = model.fields;

    context.avatar.firstName = firstName!;
    context.avatar.lastName = lastName || '';
    context.avatar.syncToPlayer();
    context.avatar.player.save();

    return {
      success: true,
      output: { text: `Your name is now ${context.avatar.fullName}` }
    };
  }

  private executePronouns(model: PlayerModel, context: CommandContext): CommandResult {
    const pronouns = model.fields.pronouns!;

    // Parse pronouns (e.g., "they/them" → Pronouns.THEY)
    const pronounEnum = this.parsePronouns(pronouns);
    context.avatar.setPronouns(pronounEnum);
    context.avatar.syncToPlayer();
    context.avatar.player.save();

    return {
      success: true,
      output: { text: `Your pronouns are now ${pronouns}` }
    };
  }

  // ... other subcommand handlers
}
```

**Field Types**:
- `string`: Text (default)
- `number`: Integer or float
- `boolean`: true/false
- `object`: Resolved via MqlApi (finds in-game objects)
- `array`: Multiple values
- Custom types extensible

**Field Properties**:
- `required`: Must be provided
- `remaining`: Consumes all remaining tokens (like `<message...>`)
- `default`: Default value if not provided
- `validators`: Array of validator names
- `transform`: Transform function name

### 2. Command Parsing Flow (String → Model)

```
User Input (raw string)
    ↓
[CommandLineApi.tokenize()]  ← bash/zsh style: quotes, escapes, whitespace
    ↓
Tokens: ["look", "at", "door", "handle"]
    ↓
[CommandApi.matchVerb()]     ← Find CommandDefinition by verb
    ↓
CommandDefinition matched
    ↓
[CommandApi.matchSyntax()]   ← Match pattern, extract fields
    ↓
Raw Model: { target: "door", detail: "handle" }
    ↓
[CommandApi.resolveFields()] ← Resolve objects, transform types
    ↓
Resolved Model: { target: DoorObject, detail: "handle" }
    ↓
[CommandApi.validate()]      ← Run validators
    ↓
Validated Model (CommandModel)
    ↓
[CommandController.execute(model, context)]
    ↓
Result Model (CommandResult)
```

### 3. Command Model (Structured Data)

The **Command Model** is the parsed, validated representation of user input.

**Base Interface** (extended by command-specific models):
```typescript
interface CommandModel {
  verb: string;                    // Matched verb
  fields: Record<string, any>;     // Parsed field values
  options: Record<string, any>;    // Parsed options (-v, --verbose, etc.)
  subcommand?: string;             // Subcommand if any
  raw: string;                     // Original command string (for debugging)
}
```

**Command-Specific Models** (strongly typed):
```typescript
interface SayModel extends CommandModel {
  verb: 'say';
  fields: {
    message: string;
  };
}

interface GetModel extends CommandModel {
  verb: 'get' | 'take';
  fields: {
    targets: Thing | Thing[];  // MQL resolved
  };
}

interface PlayerModel extends CommandModel {
  verb: 'player';
  subcommand: 'name' | 'pronouns' | 'avatar' | 'show';
  fields: {
    // Subcommand-specific fields
    firstName?: string;
    lastName?: string;
    pronouns?: string;
    avatar?: string;
  };
}
```

// Example for "look at door --verbose"
{
  verb: "look",
  fields: {
    target: DoorObject,            // Resolved object reference
  },
  options: {
    verbose: true                  // Parsed boolean
  },
  raw: "look at door --verbose"
}
```

### 4. Validation System

Validators ensure command models are valid before execution.

**Validator Types**:

1. **Field-level validators** - Operate on individual fields
```typescript
// Shared common validators
const CommonValidators = {
  required: (value: any, field: string) => {
    if (value == null) return `${field} is required`;
  },

  mustBeVisible: (obj: Stuff, field: string, context: CommandContext) => {
    if (!context.avatar.canSee(obj)) {
      return `You don't see any ${obj.name} here`;
    }
  },

  mustBeNumber: (value: any, field: string) => {
    if (typeof value !== 'number') return `${field} must be a number`;
  }
};

// Custom validators (defined per command)
const LockCommandValidators = {
  mustBeLockable: (obj: Stuff, field: string) => {
    if (!obj.hasProperty('lockable')) {
      return `You can't lock that`;
    }
  }
};
```

2. **Multi-field validators** - Operate on multiple fields
```typescript
const MultiFieldValidators = {
  targetInReach: (model: CommandModel, context: CommandContext) => {
    const { target, tool } = model.fields;
    const distance = context.avatar.distanceTo(target);
    const reach = tool?.reach || 1;

    if (distance > reach) {
      return `The ${target.name} is too far away`;
    }
  }
};
```

3. **Model-level validators** - Operate on entire command model
```typescript
const ModelValidators = {
  validateGiveCommand: (model: CommandModel, context: CommandContext) => {
    const { item, recipient } = model.fields;

    // Multiple related validations
    if (!context.avatar.hasItem(item)) {
      return `You don't have ${item.name}`;
    }
    if (!recipient.canReceive(item)) {
      return `${recipient.name} can't accept ${item.name}`;
    }
    if (item.isCursed && item.isEquipped) {
      return `The ${item.name} is stuck to you!`;
    }
  }
};
```

**Validation Configuration in YAML**:
```yaml
verbs: [lock]
syntax:
  - pattern: "<target>"
    fields:
      target:
        type: object
        validators:
          - mustBeVisible      # Field-level
          - mustBeLockable     # Field-level custom
    modelValidators:
      - targetInReach          # Multi-field
      - hasRequiredKey         # Model-level
```

**Error Strings**:
- Validators can produce error strings (optional - user doesn't feel strongly)
- Error strings can be defined in YAML (even more optional - user feels less strongly)
- Default: validators return error string or undefined
- Alternative: validators throw ValidationError with custom message

### 5. Command Controller (Execution Logic)

CommandControllers execute business logic and produce results.

**Controller Lifecycle**:

By default, controllers are **ephemeral** (clone per execution):
```typescript
abstract class CommandController<TModel extends CommandModel = CommandModel> {
  // New instance created for each command execution
  // Destroyed after execution completes

  /**
   * Execute command with command-specific model type.
   * Each command should define its own model interface (e.g., SayModel, GetModel).
   */
  abstract execute(model: TModel, context: CommandContext): CommandResult;
}

// Usage
const controller = new SayController();  // Fresh instance
const result = controller.execute(sayModel, context);  // sayModel: SayModel
// controller is now eligible for GC
```

But lifecycle is **configurable** per command:
```yaml
verbs: [say]
controllerLifecycle: ephemeral  # Default: new instance per execution

verbs: [score]
controllerLifecycle: static     # Singleton: reuse same instance

verbs: [edit]
controllerLifecycle: persistent # Long-lived: survives across multiple invocations
```

**Why different lifecycles?**:
- **Ephemeral** (default): Clean slate, no state leakage, simplest to reason about
- **Static**: Performance (avoid allocation), truly stateless operations
- **Persistent**: Modal commands (editor, builder mode), maintain context between invocations

**Controller Interface**:
```typescript
abstract class CommandController<TModel extends CommandModel = CommandModel> {
  /**
   * Execute command logic
   *
   * @param model - Command-specific model (e.g., SayModel, GetModel)
   * @param context - Execution context (who, where, when)
   * @returns Result model (for piping or display)
   */
  abstract execute(model: TModel, context: CommandContext): CommandResult;

  /**
   * Optional: cleanup when persistent controller is destroyed
   */
  destroy?(): void;
}

interface CommandContext {
  avatar: Avatar;              // Who executed command
  interactive: Interactive;    // Their connection
  location: Location;          // Where they are
  commandText: string;         // Raw input (for debugging)
  executionId: string;         // Unique execution ID (for logging)
}

interface CommandResult {
  success: boolean;            // Did command succeed?
  output?: CommandOutput;      // What to display to user
  model?: Record<string, any>; // Structured output (for piping)
  error?: string;              // Error message if failed
}
```

**Example Controllers**:

```typescript
// Define command-specific model
interface SayModel extends CommandModel {
  verb: 'say';
  fields: {
    message: string;
  };
}

// Simple ephemeral controller with typed model
class SayController extends CommandController {
  execute(model: SayModel, context: CommandContext): CommandResult {
    const message = model.fields.message;

    // Message others
    MessageApi.messageContainer(
      context.location,
      `${context.avatar.fullName} says, '${message}'`,
      [context.avatar]
    );

    // Message self
    MessageApi.messageOne(
      context.avatar,
      `You say, '${message}'`
    );

    return {
      success: true,
      output: { text: `You say, '${message}'` },
      model: { speaker: context.avatar.id, message }  // For piping
    };
  }
}

// Persistent controller with state
class EditorController extends CommandController {
  private buffer: string[] = [];
  private currentLine: number = 0;

  execute(model: CommandModel, context: CommandContext): CommandResult {
    const subcommand = model.subcommand;

    switch (subcommand) {
      case 'append':
        this.buffer.push(model.fields.text);
        return { success: true, output: { text: 'Line added' } };

      case 'show':
        return {
          success: true,
          output: { text: this.buffer.join('\n') }
        };

      case 'quit':
        // Clean up persistent controller
        this.destroy();
        return { success: true, output: { text: 'Editor closed' } };
    }
  }

  destroy(): void {
    // Save unsaved changes, release resources
    this.buffer = [];
  }
}
```

### 6. Model Piping (PowerShell-Inspired, Future)

Commands output structured models that can be piped to other commands.

**Not required for MVP**, but architecture must support it:

```typescript
// Each controller outputs model
class LookController extends CommandController {
  execute(model: CommandModel, context: CommandContext): CommandResult {
    const target = model.fields.target || context.location;

    return {
      success: true,
      output: { text: target.longDescription },
      model: {
        object: target,
        type: 'description',
        properties: target.getVisibleProperties()
      }
    };
  }
}

// Another controller consumes model
class FilterController extends CommandController {
  execute(model: CommandModel, context: CommandContext): CommandResult {
    const inputModel = model.inputModel;  // From previous command in pipe
    const filterKey = model.fields.key;

    // Filter properties from previous command's output
    const filtered = inputModel.properties.filter(p =>
      p.name.includes(filterKey)
    );

    return {
      success: true,
      output: { text: filtered.map(p => p.name).join('\n') },
      model: { properties: filtered }
    };
  }
}

// Future usage: look at door | filter lock
// 1. LookController outputs model with door properties
// 2. FilterController receives that model as inputModel
// 3. FilterController filters and outputs filtered model
```

**Piping Infrastructure** (Phase 9+):
```typescript
class CommandPipeline {
  execute(commands: CommandModel[], context: CommandContext): CommandResult {
    let previousResult: CommandResult | null = null;

    for (const commandModel of commands) {
      // Inject previous result as inputModel
      if (previousResult) {
        commandModel.inputModel = previousResult.model;
      }

      // Execute command
      const controller = this.getController(commandModel);
      previousResult = controller.execute(commandModel, context);

      // Stop on error
      if (!previousResult.success) break;
    }

    return previousResult;
  }
}
```

### 7. Command Discovery

Commands can come from 4 sources (in precedence order):
1. **Inventory**: Commands from items carried (e.g., "read book")
2. **Environment**: Commands from current location (e.g., "ring bell")
3. **Self**: Commands from avatar itself (e.g., "say", "look")
4. **Colocated**: Commands from other entities in location (e.g., "talk to merchant")

```typescript
class CommandGiverMixin {
  getAvailableCommands(): CommandDefinition[] {
    // Override in subclasses to provide commands
  }

  executeCommand(text: string, context: CommandContext): CommandResult {
    // 1. Parse command text → model
    // 2. Find matching CommandDefinition
    // 3. Validate model
    // 4. Get controller, execute
    // 5. Return result
  }
}
```

### 8. Future Extensibility

The command framework is designed to support future features **without breaking changes**:

**Web Forms** (Phase 10+):
- Form fields map to command model fields
- Form submission generates CommandModel directly (skip parsing)
- Execute CommandController with generated model
- Display result in UI

```typescript
// Web form for "give" command
<Form onSubmit={(values) => {
  const model: CommandModel = {
    verb: 'give',
    fields: {
      item: values.selectedItem,
      recipient: values.selectedPlayer
    },
    options: {},
    raw: `give ${values.selectedItem} to ${values.selectedPlayer}`
  };

  // Execute with generated model
  const result = executeCommand(model, context);
  displayResult(result);
}} />
```

**Natural Language Processing** (Phase 10+):
- NL input → LLM/parser → CommandModel
- "Can you hand me that sword?" → `give sword to Alice`
- Execute CommandController with parsed model

```typescript
class NLProcessor {
  async parse(nlInput: string, context: CommandContext): Promise<CommandModel> {
    // Use LLM or rule-based parser
    const intent = await this.detectIntent(nlInput);  // "give"
    const entities = await this.extractEntities(nlInput);  // sword, Alice

    return {
      verb: intent,
      fields: {
        item: this.resolveObject(entities.item, context),
        recipient: this.resolveObject(entities.recipient, context)
      },
      options: {},
      raw: nlInput
    };
  }
}
```

**Scripting Language** (Phase 10+):
- Script defines sequence of commands
- Variables pass data between commands
- Control flow (if/else, loops)

```javascript
// Future scripting example
let door = look(target: "door");
if (door.isLocked) {
  let key = search(target: "drawer");
  unlock(target: door, tool: key);
}
open(target: door);
go(direction: "north");
```

### 8. Command Aliases (Essential Usability)

**Why Aliases Matter**:
- **Usability**: Reduces typing for common actions
- **Personalization**: Users create shortcuts that match their play style
- **Efficiency**: Power users can move faster
- **Not that hard**: Mostly string replacement before parsing

**Not strictly MVP**, but essential enough that it should come early (Phase 4-5).

**Alias Types**:

1. **Simple Substitution**:
```
Alias: "n" → "go north"
User types: "n"
Expands to: "go north"
Executes: GoController with direction="north"
```

2. **Command Sequences** (Macros):
```
Alias: "gtfo" → "go west; go west; go north"
User types: "gtfo"
Expands to: ["go west", "go west", "go north"]
Executes: 3 separate commands in sequence
```

3. **Parameterized Aliases**:
```
Alias: "gn" → "go north"
Alias: "gs" → "go south"
Alias: "ge" → "go east"
Alias: "gw" → "go west"

# Or more general:
Alias: "g $1" → "go $1"
User types: "g north"
Expands to: "go north"
```

4. **Contextual Aliases**:
```
# Global aliases (always available)
"l" → "look"
"i" → "inventory"
"n" → "go north"

# Domain-specific aliases (only in certain contexts)
# In combat:
"a" → "attack $target"
"f" → "flee"

# In build mode:
"d" → "dig north"
"c" → "create room"
```

**Alias Configuration**:

**User Aliases** (stored in Player):
```typescript
class Player extends Idea {
  aliases: Map<string, string> = new Map([
    ['n', 'go north'],
    ['s', 'go south'],
    ['l', 'look'],
    ['i', 'inventory'],
    ['gtfo', 'go west; go west; go north'],
  ]);

  addAlias(shortcut: string, expansion: string): void {
    this.aliases.set(shortcut, expansion);
  }

  removeAlias(shortcut: string): void {
    this.aliases.delete(shortcut);
  }

  getAlias(shortcut: string): string | undefined {
    return this.aliases.get(shortcut);
  }
}
```

**System Aliases** (default, everyone gets these):
```typescript
class AliasRegistry {
  private static systemAliases = new Map<string, string>([
    ['l', 'look'],
    ['i', 'inventory'],
    ['n', 'go north'],
    ['s', 'go south'],
    ['e', 'go east'],
    ['w', 'go west'],
    ['u', 'go up'],
    ['d', 'go down'],
  ]);

  static resolve(input: string, player: Player): string {
    // Check user aliases first (override system)
    const userAlias = player.getAlias(input);
    if (userAlias) return userAlias;

    // Fall back to system aliases
    const systemAlias = this.systemAliases.get(input);
    if (systemAlias) return systemAlias;

    // No alias, return original
    return input;
  }
}
```

**Alias Expansion Flow**:
```
User types: "n"
    ↓
[AliasRegistry.resolve()] → Check player aliases, then system aliases
    ↓
Expands to: "go north"
    ↓
[CommandLineApi.tokenize()] → Continue normal command processing
    ↓
Execute command
```

**Sequence Expansion** (Macros):
```
User types: "gtfo"
    ↓
[AliasRegistry.resolve()] → "go west; go west; go north"
    ↓
[CommandApi.splitSequence()] → Split on ';'
    ↓
Commands: ["go west", "go west", "go north"]
    ↓
Execute each command in sequence
    ↓
Stop on first error (or continue, configurable)
```

**Managing Aliases** (via "alias" command):
```yaml
verbs: [alias]
description: "Manage command aliases"
subcommands:
  set:
    pattern: "<shortcut> <expansion...>"
    description: "Create or update an alias"
    fields:
      shortcut:
        type: string
        required: true
        validators: [notReservedWord]
      expansion:
        type: string
        required: true
        remaining: true

  remove:
    pattern: "<shortcut>"
    description: "Remove an alias"
    fields:
      shortcut:
        type: string
        required: true

  list:
    pattern: ""
    description: "Show all your aliases"

# Usage:
"alias set n go north"           → Creates alias "n" → "go north"
"alias set gtfo go west; go west; go north" → Creates macro
"alias remove n"                 → Removes "n" alias
"alias list"                     → Shows all aliases
```

**Implementation**:
```typescript
class AliasController extends CommandController {
  execute(model: CommandModel, context: CommandContext): CommandResult {
    switch (model.subcommand) {
      case 'set':
        return this.executeSet(model, context);
      case 'remove':
        return this.executeRemove(model, context);
      case 'list':
        return this.executeList(model, context);
    }
  }

  private executeSet(model: CommandModel, context: CommandContext): CommandResult {
    const { shortcut, expansion } = model.fields;

    // Validate not overriding critical commands
    if (['quit', 'help', 'alias'].includes(shortcut)) {
      return {
        success: false,
        error: `Cannot alias reserved command: ${shortcut}`
      };
    }

    // Add alias
    context.avatar.player.addAlias(shortcut, expansion);
    context.avatar.player.save();

    return {
      success: true,
      output: { text: `Alias created: ${shortcut} → ${expansion}` }
    };
  }

  private executeList(model: CommandModel, context: CommandContext): CommandResult {
    const aliases = Array.from(context.avatar.player.aliases.entries());

    if (aliases.length === 0) {
      return {
        success: true,
        output: { text: "You have no custom aliases." }
      };
    }

    const lines = aliases.map(([k, v]) => `${k} → ${v}`);
    return {
      success: true,
      output: { text: `Your aliases:\n${lines.join('\n')}` }
    };
  }
}
```

**Conflict Resolution**:
- User aliases override system aliases
- Aliases cannot override critical commands (quit, help, alias)
- Alias expansion happens before command parsing
- Circular aliases detected and rejected

**Circular Alias Detection**:
```typescript
class AliasRegistry {
  static resolve(input: string, player: Player, depth: number = 0): string {
    // Prevent infinite recursion
    if (depth > 10) {
      throw new Error("Circular alias detected");
    }

    const userAlias = player.getAlias(input);
    if (userAlias) {
      // Recursively resolve in case alias points to another alias
      return this.resolve(userAlias, player, depth + 1);
    }

    const systemAlias = this.systemAliases.get(input);
    if (systemAlias) {
      return this.resolve(systemAlias, player, depth + 1);
    }

    return input;
  }
}
```

**Future Extensions**:
- **Parameterized aliases**: `"g $1" → "go $1"` (Phase 8)
- **Conditional aliases**: Only active in certain contexts (Phase 8)
- **Shared aliases**: Guild/party shares alias sets (Phase 9)
- **Alias marketplace**: Download popular alias sets (Phase 10)

### 9. Implementation Checklist

**Phase 4 - Core Framework (MVP)**:
- [ ] CommandDefinition class (parse YAML)
- [ ] CommandLineApi (tokenize, parse quotes/escapes)
- [ ] CommandApi (match verb, extract fields, resolve objects)
- [ ] CommandController abstract class (ephemeral lifecycle)
- [ ] **Subcommands** (routing, parsing, YAML structure)
- [ ] **MQL integration** (resolve `type: object` fields via MqlApi)
- [ ] **Multi-object selection** (quantity: `5 arrows`, collection: `all flowers`)
- [ ] Validation system (field-level, multi-field, model-level)
- [ ] Common validators (mustBeVisible, canReach, etc.)
- [ ] Command discovery (4 sources: inventory, environment, self, colocated)
- [ ] CommandGiverMixin
- [ ] Basic commands (say, look, help, player with subcommands)

**Phase 5 - Aliases, Globbing & Usability**:
- [ ] **AliasRegistry** (system aliases + user aliases)
- [ ] **Alias resolution** (expand before parsing)
- [ ] **Alias command** (set, remove, list subcommands)
- [ ] **Sequence macros** (semicolon-separated commands)
- [ ] Circular alias detection
- [ ] **Globbable mixin** (auto-merge/unmerge identical objects - optimization, not critical)
- [ ] **GlobGroup** (tracks globbed objects per container)
- [ ] Display logic for globs ("some arrows (5)")
- [ ] **Money/currency special cases** (virtual currency recommended)

**Phase 8 - Advanced Features**:
- [ ] Controller lifecycle configuration (ephemeral, static, persistent)
- [ ] Persistent controllers (editor, builder mode)
- [ ] Advanced MQL filters (`all red items where value > 10`)
- [ ] Parameterized aliases (`g $1` → `go $1`)
- [ ] Contextual aliases (combat-only, build-mode-only)

**Phase 9+ - Extensibility**:
- [ ] Model piping infrastructure
- [ ] CommandPipeline executor
- [ ] Web form integration
- [ ] NL processing integration
- [ ] Scripting language

### 10. Adding New Commands

**Step-by-step**:

1. **Define Model Interface** (`commands/models.ts`):
```typescript
export interface SayModel extends CommandModel {
  verb: 'say';
  fields: {
    message: string;
  };
}
```

2. **Define YAML** (`commands/say.yaml`):
```yaml
verbs: [say, ']
description: "Speak to others in your current location"
syntax:
  - pattern: "<message...>"
    fields:
      message:
        type: string
        required: true
        remaining: true
```

3. **Create Controller** (`commands/SayController.ts`):
```typescript
import { SayModel } from './models';

export class SayController extends CommandController<SayModel> {
  execute(model: SayModel, context: CommandContext): CommandResult {
    const message = model.fields.message;  // Strongly typed!

    // Implementation...
    MessageApi.messageContainer(
      context.location,
      `${context.avatar.fullName} says, '${message}'`,
      [context.avatar]
    );

    return {
      success: true,
      output: { text: `You say, '${message}'` }
    };
  }
}
```

4. **Register Command**:
```typescript
// Avatar or Location
class Avatar extends Character {
  getAvailableCommands(): CommandDefinition[] {
    return [
      CommandDefinition.load('commands/say.yaml'),
      // ... other commands
    ];
  }
}
```

5. **Write Tests**:
```typescript
describe('SayController', () => {
  it('broadcasts message to location', () => {
    // Test implementation
  });
});
```

---

## Framework 11: Interactive Prompt Stack

### Purpose
Enable interactive command completion and complex multi-step user interactions through a prompt stack system, providing a consistent UX for filling in missing command fields, confirmations, and other interactive scenarios.

### Design Philosophy

**Why Prompt Stack Matters**:
- **Better UX**: Instead of rejecting incomplete commands, guide users to complete them interactively
- **Complex Workflows**: Support multi-step operations (e.g., crafting, trading, character creation)
- **Consistent Patterns**: Standard prompt types ([Y/n], multiple choice, text input) work the same everywhere
- **Stateful**: Server maintains prompt stack per user, survives disconnects

**Example Flow**:
```
User: "give sword"                    ← Incomplete command (missing recipient)
System: "To whom? (player name)"      ← Server pushes prompt onto stack
User: "Alice"                         ← User responds to prompt
System: "You give the iron sword to Alice."  ← Prompt resolved, popped off stack

User: "craft legendary sword"         ← Complex command
System: "This will consume: 5 steel ingots, 1 dragon scale. Continue? [Y/n]"
User: "y"
System: "Choose enchantment: (1) Fire (2) Ice (3) Lightning"
User: "1"
System: "Crafting will take 10 seconds. Confirm? [Y/n]"
User: "y"
System: "You begin crafting a legendary sword..."
```

### Requirements (Phase 5+)

### 1. Prompt Stack Architecture

**Server-Side State** (per Interactive):
```typescript
interface Prompt {
  id: string;                          // Unique prompt ID
  type: PromptType;                    // Type of prompt (text, yesno, choice, etc.)
  message: string;                     // Prompt message to display
  options?: PromptOption[];            // Options for choice prompts
  validator?: (input: string) => boolean | string;  // Validation function
  callback: (response: string) => void | Promise<void>;  // Callback when answered
  context?: any;                       // Additional context data
  createdAt: Date;                     // When prompt was created
}

enum PromptType {
  TEXT = 'text',              // Free text input
  YESNO = 'yesno',            // [Y/n] confirmation
  CHOICE = 'choice',          // Multiple choice (1, 2, 3, ...)
  NUMBER = 'number',          // Numeric input
  PASSWORD = 'password',      // Hidden input (not MVP)
  OBJECT = 'object',          // MQL object selection
}

interface PromptOption {
  label: string;              // Display text
  value: string;              // Value returned when selected
  description?: string;       // Optional longer description
}

class Interactive extends Idea {
  private promptStack: Prompt[] = [];

  // Push new prompt onto stack
  pushPrompt(prompt: Prompt): void {
    this.promptStack.push(prompt);
    this.sendPromptToClient(prompt);
  }

  // Pop top prompt off stack
  popPrompt(): Prompt | undefined {
    return this.promptStack.pop();
  }

  // Get current active prompt
  getCurrentPrompt(): Prompt | undefined {
    return this.promptStack[this.promptStack.length - 1];
  }

  // Get stack depth (for UI)
  getPromptDepth(): number {
    return this.promptStack.length;
  }

  // Handle user input
  async handleInput(input: string): Promise<void> {
    const currentPrompt = this.getCurrentPrompt();

    if (currentPrompt) {
      // We're in a prompt - handle prompt response
      await this.handlePromptResponse(currentPrompt, input);
    } else {
      // No active prompt - handle as normal command
      await this.handleCommand(input);
    }
  }

  private async handlePromptResponse(prompt: Prompt, input: string): Promise<void> {
    // Validate input
    if (prompt.validator) {
      const validation = prompt.validator(input);
      if (validation !== true) {
        this.send({
          type: 'error',
          payload: { text: typeof validation === 'string' ? validation : 'Invalid input' }
        });
        return;  // Don't pop prompt, let user try again
      }
    }

    // Pop prompt off stack
    this.popPrompt();

    // Execute callback
    await prompt.callback(input);

    // If there's another prompt on stack, send it to client
    const nextPrompt = this.getCurrentPrompt();
    if (nextPrompt) {
      this.sendPromptToClient(nextPrompt);
    } else {
      // No more prompts - back to normal command mode
      this.sendPromptClear();
    }
  }

  private sendPromptToClient(prompt: Prompt): void {
    this.send({
      type: 'prompt',
      payload: {
        id: prompt.id,
        type: prompt.type,
        message: prompt.message,
        options: prompt.options,
        stackDepth: this.promptStack.length
      }
    });
  }

  private sendPromptClear(): void {
    this.send({
      type: 'prompt_clear',
      payload: {}
    });
  }
}
```

### 2. Standard Prompt Patterns

**Yes/No Confirmation**:
```typescript
class PromptApi {
  static async confirm(
    interactive: Interactive,
    message: string,
    defaultValue: boolean = false
  ): Promise<boolean> {
    return new Promise((resolve) => {
      interactive.pushPrompt({
        id: StuffApi.generateId(),
        type: PromptType.YESNO,
        message: `${message} [${defaultValue ? 'Y/n' : 'y/N'}]`,
        validator: (input: string) => {
          const normalized = input.toLowerCase().trim();
          return normalized === 'y' || normalized === 'yes' ||
                 normalized === 'n' || normalized === 'no' ||
                 normalized === '';
        },
        callback: (response: string) => {
          const normalized = response.toLowerCase().trim();
          if (normalized === '' || normalized === 'y' || normalized === 'yes') {
            resolve(defaultValue ? true : false);
          } else {
            resolve(normalized === 'y' || normalized === 'yes');
          }
        },
        createdAt: new Date()
      });
    });
  }
}

// Usage in command:
class DropController extends CommandController {
  async execute(model: CommandModel, context: CommandContext): Promise<CommandResult> {
    const item = model.fields.item;

    if (item.isImportant) {
      const confirmed = await PromptApi.confirm(
        context.interactive,
        `Are you sure you want to drop ${item.name}? This is an important item.`
      );

      if (!confirmed) {
        return { success: false, output: { text: 'Cancelled.' } };
      }
    }

    // Drop the item
    context.avatar.removeFromInventory(item);
    context.location.addToInventory(item);

    return { success: true, output: { text: `You drop ${item.name}.` } };
  }
}
```

**Multiple Choice**:
```typescript
class PromptApi {
  static async choice<T extends string>(
    interactive: Interactive,
    message: string,
    options: { label: string; value: T; description?: string }[]
  ): Promise<T> {
    return new Promise((resolve) => {
      interactive.pushPrompt({
        id: StuffApi.generateId(),
        type: PromptType.CHOICE,
        message,
        options,
        validator: (input: string) => {
          const num = parseInt(input, 10);
          return num >= 1 && num <= options.length;
        },
        callback: (response: string) => {
          const index = parseInt(response, 10) - 1;
          resolve(options[index].value);
        },
        createdAt: new Date()
      });
    });
  }
}

// Usage:
class CraftController extends CommandController {
  async execute(model: CommandModel, context: CommandContext): Promise<CommandResult> {
    const enchantment = await PromptApi.choice(context.interactive,
      'Choose enchantment:',
      [
        { label: 'Fire', value: 'fire', description: '+10 fire damage' },
        { label: 'Ice', value: 'ice', description: '+10 ice damage' },
        { label: 'Lightning', value: 'lightning', description: '+10 lightning damage' }
      ]
    );

    // Continue with chosen enchantment
    return { success: true, output: { text: `You enchant with ${enchantment}.` } };
  }
}
```

**Text Input**:
```typescript
class PromptApi {
  static async text(
    interactive: Interactive,
    message: string,
    validator?: (input: string) => boolean | string
  ): Promise<string> {
    return new Promise((resolve) => {
      interactive.pushPrompt({
        id: StuffApi.generateId(),
        type: PromptType.TEXT,
        message,
        validator,
        callback: (response: string) => {
          resolve(response);
        },
        createdAt: new Date()
      });
    });
  }
}

// Usage:
class PlayerController extends CommandController {
  async executeName(model: CommandModel, context: CommandContext): Promise<CommandResult> {
    const firstName = await PromptApi.text(
      context.interactive,
      'Enter your first name:',
      (input) => {
        if (input.length < 2) return 'Name must be at least 2 characters';
        if (!/^[a-zA-Z]+$/.test(input)) return 'Name must contain only letters';
        return true;
      }
    );

    const lastName = await PromptApi.text(
      context.interactive,
      'Enter your last name (optional):',
      (input) => {
        if (input === '') return true;  // Optional
        if (!/^[a-zA-Z]+$/.test(input)) return 'Name must contain only letters';
        return true;
      }
    );

    context.avatar.firstName = firstName;
    context.avatar.lastName = lastName;
    context.avatar.syncToPlayer();
    await context.avatar.player.save();

    return {
      success: true,
      output: { text: `Your name is now ${context.avatar.fullName}` }
    };
  }
}
```

**Object Selection** (MQL):
```typescript
class PromptApi {
  static async selectObject(
    interactive: Interactive,
    message: string,
    candidates: Stuff[]
  ): Promise<Stuff> {
    return new Promise((resolve) => {
      const options = candidates.map((obj, index) => ({
        label: obj.name,
        value: index.toString(),
        description: obj.shortDescription
      }));

      interactive.pushPrompt({
        id: StuffApi.generateId(),
        type: PromptType.CHOICE,
        message,
        options,
        callback: (response: string) => {
          const index = parseInt(response, 10) - 1;
          resolve(candidates[index]);
        },
        createdAt: new Date()
      });
    });
  }
}

// Usage when MQL query is ambiguous:
class GetController extends CommandController {
  async execute(model: CommandModel, context: CommandContext): Promise<CommandResult> {
    let target = model.fields.target;

    // If target is ambiguous (MQL returned multiple matches)
    if (Array.isArray(target)) {
      target = await PromptApi.selectObject(
        context.interactive,
        'Which one?',
        target
      );
    }

    // Continue with resolved target
    // ...
  }
}
```

### 3. Interactive Command Completion

**Detect Missing Fields**:
```typescript
class CommandApi {
  static async executeWithPrompts(
    commandModel: CommandModel,
    definition: CommandDefinition,
    context: CommandContext
  ): Promise<CommandResult> {
    // Check for missing required fields
    const missingFields = this.getMissingFields(commandModel, definition);

    // Prompt for each missing field
    for (const fieldName of missingFields) {
      const fieldDef = definition.fields[fieldName];
      const value = await this.promptForField(fieldName, fieldDef, context);
      commandModel.fields[fieldName] = value;
    }

    // Now execute command with complete model
    const controller = this.getController(definition);
    return await controller.execute(commandModel, context);
  }

  private static async promptForField(
    fieldName: string,
    fieldDef: FieldDefinition,
    context: CommandContext
  ): Promise<any> {
    switch (fieldDef.type) {
      case 'text':
      case 'string':
        return await PromptApi.text(
          context.interactive,
          `Enter ${fieldName}:`,
          fieldDef.validator
        );

      case 'number':
        return await PromptApi.text(
          context.interactive,
          `Enter ${fieldName} (number):`,
          (input) => !isNaN(Number(input)) || 'Must be a number'
        );

      case 'object':
        const query = await PromptApi.text(
          context.interactive,
          `Which ${fieldName}?`
        );
        return await MqlApi.resolve(query, context);

      case 'boolean':
        return await PromptApi.confirm(
          context.interactive,
          `${fieldName}?`
        );

      default:
        return await PromptApi.text(context.interactive, `Enter ${fieldName}:`);
    }
  }
}

// Usage:
User: "give sword"         ← Missing recipient
System: "To whom? (player name)"
User: "Alice"
System: Executes give command with { item: sword, recipient: Alice }
```

### 4. Client-Side UX

**Prompt State Indicator**:
```typescript
interface PromptState {
  active: boolean;              // Is there an active prompt?
  type: PromptType;             // What kind of prompt
  message: string;              // Prompt message
  options?: PromptOption[];     // Options for choice prompts
  stackDepth: number;           // How many prompts are stacked
}

// Client component
function CommandBar({ promptState }: { promptState: PromptState }) {
  if (promptState.active) {
    return (
      <div className="command-bar prompt-mode">
        <div className="prompt-indicator">
          <PromptIcon type={promptState.type} />
          {promptState.stackDepth > 1 && (
            <span className="stack-depth">({promptState.stackDepth} prompts)</span>
          )}
        </div>
        <div className="prompt-message">{promptState.message}</div>
        {promptState.options && (
          <div className="prompt-options">
            {promptState.options.map((opt, i) => (
              <div key={i} className="option">
                ({i + 1}) {opt.label}
                {opt.description && <span className="desc"> - {opt.description}</span>}
              </div>
            ))}
          </div>
        )}
        <input
          type="text"
          placeholder={getPlaceholder(promptState.type)}
          className="prompt-input"
        />
      </div>
    );
  }

  // Normal command mode
  return (
    <div className="command-bar command-mode">
      <span className="prompt-symbol">&gt;</span>
      <input
        type="text"
        placeholder="Enter command..."
        className="command-input"
      />
    </div>
  );
}
```

**Visual Indicators**:
- **Normal mode**: Green prompt `>` or `$`
- **Prompt mode**: Yellow/blue indicator with icon (question mark, list, etc.)
- **Stack depth**: Show `(3 prompts)` if multiple prompts waiting
- **Options display**: Show numbered options for choice prompts
- **Different input styling**: Prompt input vs command input

**Keyboard Navigation** (Phase 8+):
- **Ctrl+C**: Cancel current prompt (pop off stack)
- **Ctrl+D**: Clear entire prompt stack (back to command mode)
- **Up/Down arrows**: Navigate prompt history (not command history when in prompt mode)

### 5. Persistence

**Save Prompt Stack on Disconnect**:
```typescript
class Interactive extends Idea {
  // Serialize prompt stack for reconnect
  serializePromptStack(): any {
    return this.promptStack.map(p => ({
      id: p.id,
      type: p.type,
      message: p.message,
      options: p.options,
      // Note: callbacks can't be serialized - need to store enough context to recreate
      contextData: p.context
    }));
  }

  // Restore prompt stack on reconnect
  restorePromptStack(serialized: any[]): void {
    // This is complex - may need to replay the command that created the prompts
    // Or store enough context to recreate the prompt callbacks
    // Phase 8+ feature
  }
}
```

### 6. Error Handling

**Timeout** (optional, Phase 8+):
```typescript
interface Prompt {
  // ...
  timeout?: number;         // Milliseconds until prompt auto-cancels
  onTimeout?: () => void;   // Callback on timeout
}

// Auto-cancel prompts after 5 minutes
setTimeout(() => {
  if (interactive.getCurrentPrompt()?.id === promptId) {
    interactive.popPrompt();
    interactive.send({
      type: 'output',
      payload: { text: 'Prompt timed out.' }
    });
  }
}, 5 * 60 * 1000);
```

**Stack Overflow Protection**:
```typescript
class Interactive extends Idea {
  private static MAX_STACK_DEPTH = 10;

  pushPrompt(prompt: Prompt): void {
    if (this.promptStack.length >= Interactive.MAX_STACK_DEPTH) {
      throw new Error('Prompt stack overflow - too many nested prompts');
    }
    // ...
  }
}
```

### 7. Implementation Phases

**Phase 5 - Basic Interactive Prompts**:
- [ ] Prompt interface and PromptType enum
- [ ] Interactive.promptStack and push/pop methods
- [ ] PromptApi.confirm() (yes/no prompts)
- [ ] PromptApi.choice() (multiple choice)
- [ ] PromptApi.text() (text input)
- [ ] Client prompt mode UI
- [ ] Message protocol for prompts (`prompt`, `prompt_clear`)

**Phase 6 - Interactive Command Completion**:
- [ ] CommandApi.executeWithPrompts()
- [ ] Detect missing required fields
- [ ] Auto-prompt for missing fields
- [ ] PromptApi.selectObject() for ambiguous MQL results

**Phase 8 - Advanced Prompt Features**:
- [ ] Prompt timeout support
- [ ] Stack persistence (survive disconnect)
- [ ] Keyboard shortcuts (Ctrl+C cancel, Ctrl+D clear)
- [ ] Prompt history navigation

---

## Framework 13: Code Isolation & Sandboxing (isolated-vm)

### Purpose
Protect the game engine from crashes, infinite loops, memory exhaustion, and malicious code - whether from bugs in core code, mods from untrusted sources, or intentional attacks.

**Critical for v1.0** - Required before production deployment to ensure stability and security.

### The Problem

Without sandboxing, any code running in the game can:
- **Crash the entire server** (uncaught exceptions, segfaults)
- **Freeze the game** (infinite loops, blocking operations)
- **Exhaust memory** (memory leaks, large allocations)
- **Access sensitive data** (file system, environment variables, database credentials)
- **Make network requests** (exfiltrate data, DDoS attacks)
- **Affect other players** (one user's bad code impacts everyone)

This is especially dangerous for:
- **Mods from untrusted sources** - community mods, third-party developers
- **User-submitted scripts** - if we allow in-game scripting (future)
- **Core game bugs** - even our own code can have bugs

### The Solution: isolated-vm

**isolated-vm** is a Node.js library that creates secure V8 isolates:
- Each isolate is a separate V8 instance with its own heap
- Complete memory isolation (can't access main process memory)
- CPU and memory limits enforced
- Timeout protection (kill runaway code)
- No access to Node.js APIs by default (no `require`, `fs`, `process`, etc.)

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Main Process (Trusted)                                 │
│  ─────────────────────────────────────────────────────  │
│  • Application (game state coordinator)                 │
│  • Backend (WebSocket, sessions, auth)                  │
│  • PersistenceManager (MongoDB access)                  │
│  • Core Framework APIs                                  │
│                                                          │
│  Full Node.js access, no limits                         │
└─────────────────────────────────────────────────────────┘
                           ↕
          (Controlled bridge via Reference/ExternalCopy)
                           ↕
┌─────────────────────────────────────────────────────────┐
│  Isolated Context (Sandboxed)                           │
│  ─────────────────────────────────────────────────────  │
│  • Blueprint code (custom object classes)               │
│  • Command controllers                                  │
│  • Event handlers                                       │
│  • Mod code (especially untrusted mods)                 │
│                                                          │
│  Restrictions:                                          │
│  • No Node.js APIs (no require, fs, process, etc.)      │
│  • CPU time limit (e.g., 1000ms per execution)          │
│  • Memory limit (e.g., 128MB per isolate)               │
│  • Can only call whitelisted APIs via bridge            │
└─────────────────────────────────────────────────────────┘
```

### What Runs Where

**Main Process (Trusted, No Limits)**:
- Application core (Backend, Application, PersistenceManager)
- Framework infrastructure (ExecutionContext, StuffApi, EventApi)
- System operations (MongoDB queries, WebSocket management)
- Authentication and session management
- Core Standard Model (Stuff, Idea, Agent, Character base classes)

**Isolated Context (Sandboxed, Restricted)**:
- Blueprint code loaded from disk or mods
- Custom NPC classes (Waiter, Merchant, Guard)
- Custom item classes (MagicalWardrobe, EnchantedSword)
- Command controllers (custom command logic)
- Event handlers (custom event responses)
- Mod code (especially from untrusted sources)

### Implementation (Phase 9-10)

**Sandbox Manager**:
```typescript
import ivm from 'isolated-vm';

interface SandboxOptions {
  memoryLimitMB: number;      // Default: 128MB
  timeoutMs: number;           // Default: 1000ms per execution
  enableInspector: boolean;    // Default: false (true for debugging)
}

class SandboxManager {
  private isolate: ivm.Isolate;
  private context: ivm.Context;

  constructor(options: SandboxOptions = {}) {
    // Create isolated V8 instance
    this.isolate = new ivm.Isolate({
      memoryLimit: options.memoryLimitMB || 128,
      inspector: options.enableInspector || false
    });

    // Create execution context within isolate
    this.context = this.isolate.createContextSync();

    // Inject safe global APIs
    this.injectSafeGlobals();
  }

  /**
   * Inject whitelisted APIs into sandbox.
   * These are the ONLY APIs sandboxed code can call.
   */
  private injectSafeGlobals(): void {
    const global = this.context.global;

    // Basic JavaScript globals (safe)
    global.setSync('Object', ivm.Reference.fromSync(Object));
    global.setSync('Array', ivm.Reference.fromSync(Array));
    global.setSync('String', ivm.Reference.fromSync(String));
    global.setSync('Number', ivm.Reference.fromSync(Number));
    global.setSync('Boolean', ivm.Reference.fromSync(Boolean));
    global.setSync('Date', ivm.Reference.fromSync(Date));
    global.setSync('Math', ivm.Reference.fromSync(Math));
    global.setSync('JSON', ivm.Reference.fromSync(JSON));

    // Whitelisted game APIs (controlled bridge)
    global.setSync('StuffApi', this.createBridgedApi(StuffApi));
    global.setSync('MessageApi', this.createBridgedApi(MessageApi));
    global.setSync('EventApi', this.createBridgedApi(EventApi));
    // ... other safe APIs

    // NO access to:
    // - require (can't load arbitrary modules)
    // - process (can't access env vars, exit, etc.)
    // - fs (can't read/write files)
    // - child_process (can't spawn processes)
    // - network APIs (can't make HTTP requests)
  }

  /**
   * Create a bridged API that sandboxed code can call.
   * Methods execute in main process with proper security checks.
   */
  private createBridgedApi(api: any): ivm.Reference {
    const bridged: any = {};

    // Only expose specific methods
    const allowedMethods = this.getAllowedMethods(api);

    for (const method of allowedMethods) {
      bridged[method] = (...args: any[]) => {
        // Copy args from sandbox to main process
        const copiedArgs = args.map(arg => new ivm.ExternalCopy(arg).copyInto());

        // Execute in main process (with security checks)
        const result = api[method](...copiedArgs);

        // Copy result back to sandbox
        return new ivm.ExternalCopy(result).copyInto({ release: true });
      };
    }

    return new ivm.Reference(bridged);
  }

  /**
   * Load and compile module code in sandbox.
   */
  async loadModule(modulePath: string, code: string): Promise<void> {
    const script = await this.isolate.compileScript(code);
    await script.run(this.context, { timeout: 5000 }); // 5s compile timeout
  }

  /**
   * Execute a function in sandbox with timeout and memory limits.
   */
  async execute<T>(
    functionName: string,
    args: any[],
    timeoutMs?: number
  ): Promise<T> {
    const timeout = timeoutMs || 1000;

    try {
      // Get function reference from sandbox
      const fn = await this.context.global.get(functionName);

      // Copy args into sandbox
      const sandboxArgs = args.map(arg =>
        new ivm.ExternalCopy(arg).copyInto({ release: true })
      );

      // Execute with timeout
      const result = await fn.apply(undefined, sandboxArgs, { timeout });

      // Copy result back to main process
      return new ivm.ExternalCopy(result).copyInto();
    } catch (error) {
      if (error.message.includes('Script execution timed out')) {
        throw new SandboxTimeoutError(`Execution exceeded ${timeout}ms`);
      }
      throw new SandboxExecutionError(error.message);
    }
  }

  /**
   * Clean up isolate (important for preventing memory leaks).
   */
  dispose(): void {
    this.context.release();
    this.isolate.dispose();
  }
}
```

**Blueprint Loading in Sandbox**:
```typescript
class BlueprintLoader {
  private sandboxes: Map<string, SandboxManager> = new Map();

  /**
   * Load blueprint code into sandbox.
   * Core blueprints can run in main process (trusted).
   * Mod blueprints MUST run in sandbox (untrusted).
   */
  async loadBlueprint(blueprintRef: string): Promise<any> {
    const [pkg, path, exportName] = parseBlueprint(blueprintRef);

    // Core code can run in main process (trusted)
    if (pkg === 'core') {
      const module = await import(`packages/server/src/mud${path}`);
      return module[exportName];
    }

    // Mod code MUST run in sandbox (untrusted)
    const sandbox = this.getOrCreateSandbox(pkg);
    const code = await this.loadModuleCode(pkg, path);

    await sandbox.loadModule(path, code);
    return this.createSandboxedBlueprint(sandbox, exportName);
  }

  /**
   * Create a proxy that executes blueprint methods in sandbox.
   */
  private createSandboxedBlueprint(
    sandbox: SandboxManager,
    className: string
  ): any {
    return new Proxy({}, {
      construct(target, args) {
        // Constructor runs in sandbox
        return sandbox.execute(`new ${className}`, args);
      },

      get(target, method) {
        // Methods run in sandbox
        return (...args: any[]) => {
          return sandbox.execute(`${className}.${method}`, args);
        };
      }
    });
  }

  private getOrCreateSandbox(pkg: string): SandboxManager {
    if (!this.sandboxes.has(pkg)) {
      this.sandboxes.set(pkg, new SandboxManager({
        memoryLimitMB: 128,
        timeoutMs: 1000,
        enableInspector: process.env.NODE_ENV === 'development'
      }));
    }
    return this.sandboxes.get(pkg)!;
  }
}
```

**Command Execution in Sandbox**:
```typescript
class CommandController {
  @Secured()
  async execute(fields: any, options: any, context: CommandContext): Promise<void> {
    // If this command controller is from a mod, execute in sandbox
    if (this.isFromMod()) {
      const sandbox = SandboxManager.getSandbox(this.getModPackage());

      try {
        await sandbox.execute('CommandController.execute', [fields, options, context], 2000);
      } catch (error) {
        if (error instanceof SandboxTimeoutError) {
          context.avatar.sendMessage('Command timed out (took too long)');
        } else {
          context.avatar.sendMessage('Command execution failed');
          MudlogApi.error('Command sandbox error', error);
        }
      }
    } else {
      // Core command - execute normally in main process
      await this.executeImpl(fields, options, context);
    }
  }
}
```

### Resource Limits

**Per-Isolate Limits** (configurable):
```typescript
{
  memoryLimitMB: 128,        // Max heap size per mod/package
  timeoutMs: 1000,           // Max execution time per call
  snapshotBlobMs: 5000,      // Max time to compile/load code
  enableInspector: false     // Chrome DevTools debugging (dev only)
}
```

**Global Limits** (server-wide):
```typescript
{
  maxIsolates: 50,           // Max concurrent sandboxes
  maxTotalMemoryMB: 2048,    // Max total sandbox memory
  isolatePoolSize: 10        // Pre-warmed isolates for performance
}
```

**Enforcement**:
- Isolate automatically killed if exceeds memory limit
- Execution interrupted if exceeds timeout
- Error thrown to caller (doesn't crash server)
- Metrics logged for monitoring

### Security Model

**Threat Model**:
1. **Malicious mod** - intentionally tries to crash server or steal data
2. **Buggy mod** - infinite loop, memory leak, uncaught exception
3. **Compromised mod** - legitimate mod updated with malicious code
4. **Core bug** - bug in our own code causes crash

**Defense Layers**:
1. **Isolation** - Can't access main process memory or globals
2. **API Whitelist** - Can only call explicitly exposed APIs
3. **Resource Limits** - CPU and memory caps prevent exhaustion
4. **Timeout Protection** - Runaway code automatically killed
5. **Error Containment** - Exceptions in sandbox don't crash server

**What Sandboxed Code CANNOT Do**:
- Access file system (`fs` module unavailable)
- Make network requests (`http`, `https` unavailable)
- Access environment variables (`process.env` unavailable)
- Spawn child processes (`child_process` unavailable)
- Load arbitrary modules (`require` unavailable)
- Access MongoDB directly (must go through whitelisted PersistApi)
- Crash the main process (isolated memory space)
- Block other players (timeout enforcement)

**What Sandboxed Code CAN Do**:
- Define custom object classes (blueprints)
- Implement command logic
- Handle events
- Call whitelisted APIs (StuffApi, MessageApi, etc.)
- Use standard JavaScript (Object, Array, Math, JSON, etc.)
- Manage internal state (within memory limits)

### Performance Considerations

**Overhead**:
- Isolate creation: ~50-100ms (amortize with pooling)
- Per-call overhead: ~1-5ms (negligible)
- Memory overhead: ~10-20MB per isolate base + code size

**Optimization Strategies**:
- **Isolate pooling**: Pre-warm isolates, reuse for multiple mods
- **Snapshot blobs**: Pre-compile commonly used code
- **Lazy loading**: Only create isolates for active mods
- **Batch operations**: Execute multiple calls in single context switch
- **Trust levels**: Core code runs in main process (no sandbox overhead)

### Development Experience

**Debugging Sandboxed Code**:
```typescript
// Enable Chrome DevTools inspector
const sandbox = new SandboxManager({ enableInspector: true });

// Connect Chrome DevTools to isolated-vm debugger
// chrome://inspect -> Configure -> localhost:9229
```

**Error Reporting**:
- Stack traces preserved across sandbox boundary
- Source maps supported for TypeScript
- Errors include sandbox context (which mod, which method)

**Testing**:
- Mods can be tested in sandbox during development
- Integration tests run actual sandboxed code
- Performance tests measure overhead

### Implementation Phases

**Phase 9** (MVP v1.0 requirement):
- Install isolated-vm dependency
- Implement SandboxManager class
- Bridge core APIs (StuffApi, MessageApi, EventApi)
- Load mod blueprints in sandbox
- Basic resource limits (memory, timeout)

**Phase 10** (Hardening):
- Isolate pooling for performance
- Snapshot blobs for common code
- Enhanced monitoring and metrics
- Security audit of bridged APIs
- Documentation for mod developers

**Phase 11+** (Advanced):
- Fine-grained permissions per mod
- Mod reputation/trust system
- Automatic resource scaling
- Hot-reload in sandbox

### Monitoring & Observability

**Metrics to Track**:
```typescript
{
  isolate_count: 15,                    // Active isolates
  isolate_memory_mb: 450,               // Total sandbox memory
  execution_time_avg_ms: 12,            // Avg execution time
  execution_time_p99_ms: 150,           // 99th percentile
  timeout_count: 3,                     // Executions that timed out
  error_count: 7,                       // Sandbox errors
  mod_execution_count: {
    'narnia': 1250,                     // Executions per mod
    'starwars': 890
  }
}
```

**Alerting**:
- Alert if timeout rate > 1%
- Alert if memory usage > 80% of limit
- Alert if error rate > 5%
- Alert if any mod consistently hits limits

### Alternative: VM2 vs isolated-vm

**Why isolated-vm over vm2**:
- **True isolation**: Separate V8 instance, not just a context
- **Memory limits**: Hard limits enforced by V8
- **Better performance**: Native C++ bindings, minimal overhead
- **Active development**: Maintained by Laverdet (isolated-vm author)
- **Production ready**: Used by companies running untrusted code

**vm2 issues**:
- Same V8 instance (can affect main process)
- Harder to enforce resource limits
- More escape vulnerabilities historically

### When to Use Sandbox

**Always Sandbox**:
- ✅ Mod code (from any source)
- ✅ User-submitted scripts (if feature added)
- ✅ Community-contributed blueprints

**Optional Sandbox** (trust-based):
- ⚠️ Core game code (trusted, but sandbox helps catch bugs)
- ⚠️ Verified mods (from known developers, but still recommended)

**Never Sandbox** (performance-critical):
- ❌ Application core (Backend, Application)
- ❌ Framework infrastructure (ExecutionContext, APIs)
- ❌ Persistence layer (MongoDB operations)

### Documentation for Mod Developers

Mod developers need to know:
1. Their code runs in isolated-vm (limited APIs)
2. Available APIs (StuffApi, MessageApi, etc.)
3. Resource limits (1000ms timeout, 128MB memory)
4. No Node.js APIs (no `require`, `fs`, `process`)
5. How to test mods locally in sandbox
6. How to handle errors gracefully

---

# Client Architecture

## Overview

The client is a React-based web application providing a MUD terminal interface. For MVP, it's intentionally minimal - just enough to send commands and display output. The architecture is designed to grow from this simple foundation into a richer experience.

## MVP Requirements (Phase 0-3)

**Core Components**:
1. **Terminal**: Scrollable output console displaying server messages
2. **CommandBar**: Text input for entering commands
3. **WebSocket Connection**: Persistent connection to server

**That's it for MVP.** No fancy UI, no graphics, no complexity. Just a functional terminal.

### Terminal Component

**Purpose**: Display all output from the server (messages, descriptions, combat, etc.)

```typescript
interface TerminalMessage {
  id: string;
  text: string;
  type: 'output' | 'speech' | 'tell' | 'system' | 'error';
  timestamp: Date;
}

function Terminal({ messages }: { messages: TerminalMessage[] }) {
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={terminalRef} className="terminal">
      {messages.map(msg => (
        <div key={msg.id} className={`message message-${msg.type}`}>
          {msg.text}
        </div>
      ))}
    </div>
  );
}
```

**Features** (Phase 0-3):
- Display text messages
- Different styling for message types (speech, tells, system, errors)
- Auto-scroll to bottom
- Basic monospace font

**Future** (Phase 6+):
- "Scroll to bottom" button when scrolled up
- Message filtering by type
- Timestamps (toggle)
- Copy to clipboard
- Search/filter

### CommandBar Component

**Purpose**: Input field for sending commands to server

```typescript
interface CommandBarProps {
  onSend: (command: string) => void;
  promptState?: PromptState;  // Phase 5+
}

function CommandBar({ onSend, promptState }: CommandBarProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const handleSubmit = () => {
    if (input.trim() === '') return;

    onSend(input);
    setHistory([...history, input]);
    setInput('');
    setHistoryIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'ArrowUp') {
      // Navigate command history up
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      // Navigate command history down
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  return (
    <div className="command-bar">
      <span className="prompt-symbol">&gt;</span>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter command..."
        autoFocus
      />
    </div>
  );
}
```

**Features** (Phase 0-4):
- Text input field
- Submit on Enter
- Command history (up/down arrows)
- Auto-focus

**Future** (Phase 5+):
- Prompt mode UI (see Framework 11)
- Tab completion
- Command hints/suggestions
- Multi-line input mode

### WebSocket Service

**Purpose**: Manage persistent connection to server

```typescript
class WebSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, (payload: any) => void> = new Map();

  connect(url: string): void {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Auto-reconnect after 3 seconds
      setTimeout(() => this.connect(url), 3000);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  on(type: string, handler: (payload: any) => void): void {
    this.messageHandlers.set(type, handler);
  }

  private handleMessage(message: any): void {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message.payload);
    }
  }
}
```

**Features** (Phase 1):
- Connect to WebSocket server
- Send/receive JSON messages
- Auto-reconnect on disconnect
- Message routing by type

### State Management (Zustand)

**Purpose**: Manage client-side state (messages, connection status, etc.)

```typescript
interface AppState {
  // Connection
  isConnected: boolean;
  setConnected: (connected: boolean) => void;

  // Messages
  messages: TerminalMessage[];
  addMessage: (message: TerminalMessage) => void;

  // User info
  userId?: string;
  userName?: string;
  setUser: (userId: string, userName: string) => void;

  // Prompt state (Phase 5+)
  promptState?: PromptState;
  setPromptState: (state: PromptState | undefined) => void;
}

const useAppStore = create<AppState>((set) => ({
  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),

  messages: [],
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message]
    })),

  setUser: (userId, userName) => set({ userId, userName }),

  promptState: undefined,
  setPromptState: (state) => set({ promptState: state }),
}));
```

## Phase 5+ Enhancements (Interactive Prompts)

When Framework 11 (Interactive Prompt Stack) is implemented, the client needs to handle prompt mode.

### Prompt Mode UI

**Visual Changes**:
```
Normal Mode:
┌──────────────────────────────────────┐
│ > [command input field___________]   │
└──────────────────────────────────────┘

Prompt Mode (Yes/No):
┌──────────────────────────────────────┐
│ ? Are you sure? [Y/n]                │
│ > [y/n input__________________]      │
└──────────────────────────────────────┘

Prompt Mode (Choice):
┌──────────────────────────────────────┐
│ ? Choose enchantment:                │
│   (1) Fire - +10 fire damage         │
│   (2) Ice - +10 ice damage           │
│   (3) Lightning - +10 lightning      │
│ > [1-3 input__________________]      │
└──────────────────────────────────────┘

Prompt Mode (Stacked):
┌──────────────────────────────────────┐
│ ? Choose enchantment: (2 prompts)   │
│   (1) Fire                           │
│   (2) Ice                            │
│   (3) Lightning                      │
│ > [1-3 input__________________]      │
└──────────────────────────────────────┘
```

### Updated CommandBar with Prompt Mode

```typescript
function CommandBar({ onSend, promptState }: CommandBarProps) {
  if (promptState?.active) {
    return (
      <div className="command-bar prompt-mode">
        {/* Show stack depth if > 1 */}
        <div className="prompt-header">
          <span className="prompt-icon">?</span>
          <span className="prompt-message">{promptState.message}</span>
          {promptState.stackDepth > 1 && (
            <span className="stack-depth">({promptState.stackDepth} prompts)</span>
          )}
        </div>

        {/* Show options for choice prompts */}
        {promptState.options && (
          <div className="prompt-options">
            {promptState.options.map((opt, i) => (
              <div key={i} className="option">
                <span className="option-num">({i + 1})</span>
                <span className="option-label">{opt.label}</span>
                {opt.description && (
                  <span className="option-desc"> - {opt.description}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Input field */}
        <div className="prompt-input-wrapper">
          <span className="prompt-symbol">&gt;</span>
          <input
            type="text"
            placeholder={getPromptPlaceholder(promptState.type)}
            className="prompt-input"
          />
        </div>
      </div>
    );
  }

  // Normal command mode (same as before)
  return <div className="command-bar">...</div>;
}

function getPromptPlaceholder(type: PromptType): string {
  switch (type) {
    case PromptType.YESNO: return 'y/n';
    case PromptType.CHOICE: return 'Enter number';
    case PromptType.NUMBER: return 'Enter number';
    case PromptType.TEXT: return 'Enter text';
    default: return 'Enter response';
  }
}
```

### Message Protocol Extensions

**Prompt Messages** (Phase 5):
```typescript
// Server → Client: Push new prompt
{
  type: 'prompt',
  payload: {
    id: 'prompt-abc123',
    type: 'choice',
    message: 'Choose enchantment:',
    options: [
      { label: 'Fire', value: 'fire', description: '+10 fire damage' },
      { label: 'Ice', value: 'ice', description: '+10 ice damage' }
    ],
    stackDepth: 2
  }
}

// Server → Client: Clear prompt mode (back to command mode)
{
  type: 'prompt_clear',
  payload: {}
}

// Client → Server: Respond to prompt (same as command)
{
  type: 'command',
  payload: { text: '1' }  // Or 'y', 'some text', etc.
}
```

## Future Enhancements (Post-MVP)

### Phase 6-8
- Split-pane layout (output + sidebar for inventory/stats)
- Tabbed terminal (multiple channels)
- Rich text formatting (colors, bold, italics)
- Clickable object links (click name to target)
- Mini-map
- Sound effects

### Phase 9+
- Web forms for complex commands (crafting UI, character sheet)
- Graphical elements (avatar images, room illustrations)
- Mobile responsive layout
- Accessibility features (screen reader, keyboard nav)
- Theming system

---

# Development Phases

## MVP Milestones

The project is organized around these core milestones:
1. **Phase 0**: Project skeleton (builds and runs, no features)
2. **Phase 1-2**: Sign in with character creation + persistence
3. **Phase 3**: Basic location with single starting room
4. **Phase 4**: Command parsing system (UNIX-like foundation)
5. **Phase 5**: Basic communications (say + tells)

**MVP COMPLETE** after Phase 5 - users can log in and talk to each other!

---

## Phase 0: Project Skeleton (IRONCLAD)

### Goal
Create a working project structure with NO features - just the skeleton that builds and runs.

### Absolute Requirements

**Monorepo Structure**
```
saxonberg/
├── pnpm-workspace.yaml
├── package.json (root)
├── tsconfig.base.json
├── .gitignore
├── .eslintrc.js
├── packages/
│   ├── types/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts (empty export)
│   ├── server/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .env.example
│   │   └── src/
│   │       └── index.ts (minimal Express server)
│   └── client/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx (React entry)
│           └── App.tsx (Hello World component)
```

**Root Files**

`pnpm-workspace.yaml`:
```yaml
packages:
  - "packages/*"
```

`package.json` (root):
```json
{
  "name": "saxonberg",
  "private": true,
  "scripts": {
    "install": "pnpm install",
    "build": "pnpm -r build",
    "lint": "eslint . --ext .ts,.tsx --cache",
    "dev:server": "pnpm --filter @saxonberg/server dev",
    "dev:client": "pnpm --filter @saxonberg/client dev",
    "dev": "concurrently \"pnpm dev:server\" \"pnpm dev:client\""
  },
  "devDependencies": {
    "@typescript-eslint/eslint-mod": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "concurrently": "^9.0.0",
    "eslint": "^8.57.0",
    "eslint-mod-react": "^7.34.0",
    "eslint-mod-react-hooks": "^4.6.0",
    "typescript": "^5.4.0"
  }
}
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "noUncheckedIndexedAccess": true
  }
}
```

`.eslintrc.js`:
```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  mods: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'mod:@typescript-eslint/recommended',
    'mod:react/recommended',
    'mod:react-hooks/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true }
  },
  settings: {
    react: { version: 'detect' }
  },
  env: {
    browser: true,
    node: true,
    es2021: true
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
  },
  ignorePatterns: ['node_modules/', 'dist/', 'build/', '*.log']
};
```

`.gitignore`:
```
node_modules/
dist/
build/
.env
.env.local
*.log
.DS_Store
coverage/
.turbo/
.next/
out/
```

**Types Package**

`packages/types/package.json`:
```json
{
  "name": "@saxonberg/types",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

`packages/types/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"]
}
```

`packages/types/src/index.ts`:
```typescript
// Empty for now - types will be added in Phase 1+
export {};
```

**Server Package**

`packages/server/package.json`:
```json
{
  "name": "@saxonberg/server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@saxonberg/types": "workspace:*",
    "express": "^4.19.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.4.0"
  }
}
```

`packages/server/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../types" }
  ]
}
```

`packages/server/.env.example`:
```
PORT=3005
NODE_ENV=development
```

`packages/server/src/index.ts`:
```typescript
import express from "express";

const app = express();
const PORT = process.env.PORT || 3005;

app.get("/", (req, res) => {
  res.send("Hello from server");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

**Client Package**

`packages/client/package.json`:
```json
{
  "name": "@saxonberg/client",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@saxonberg/types": "workspace:*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/mod-react": "^4.3.0",
    "typescript": "^5.4.0",
    "vite": "^5.0.0"
  }
}
```

`packages/client/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../types" }
  ]
}
```

`packages/client/vite.config.ts`:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/mod-react";

export default defineConfig({
  mods: [react()],
  server: {
    port: 5173,
  },
});
```

`packages/client/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Saxonberg</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`packages/client/src/main.tsx`:
```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`packages/client/src/App.tsx`:
```typescript
import React from "react";

function App() {
  return <div>Hello from client</div>;
}

export default App;
```

### Verification (Phase 0 MUST PASS)

1. ✅ `pnpm install` completes without errors
2. ✅ `pnpm build` compiles all TypeScript successfully
3. ✅ `pnpm lint` runs without errors
4. ✅ `pnpm dev:server` starts Express on localhost:3005
5. ✅ Navigate to http://localhost:3005 shows "Hello from server"
6. ✅ `pnpm dev:client` starts Vite on localhost:5173
7. ✅ Navigate to http://localhost:5173 shows "Hello from client"
8. ✅ `pnpm dev` runs both server and client concurrently
9. ✅ All packages can import from `@saxonberg/types` without errors
10. ✅ TypeScript strict mode catches type errors in test code
11. ✅ No features exist - just "Hello World" endpoints

**Phase 0 is complete when**: The skeleton builds, runs, and has NO features - just "Hello World" endpoints proving the build system works.

---

## Phase 1: Core Infrastructure

### Goal
Set up auth, sessions, WebSocket, MongoDB, and define Message Protocol.

### Features to Implement

**Message Protocol Implementation** (Framework 1)
- Define WebSocketMessage interface in `@saxonberg/types`
- Implement message validation
- Implement client and server message handlers
- Test basic message round-trip

**Google OAuth Authentication**
- Install dependencies: `passport`, `passport-google-oauth20`, `express-session`, `cookie-parser`
- Create `PassportConfig` class in `services/auth/PassportConfig.ts`
- Create `AuthRoutes` class in `services/auth/AuthRoutes.ts`
- Create `AuthMiddleware` class in `services/auth/AuthMiddleware.ts`
- Routes: `/auth/google`, `/auth/google/callback`, `/auth/status`, `/auth/logout`
- Session serialization/deserialization

**Session Management**
- express-session with MemoryStore
- HttpOnly cookies (secure: false in dev, true in prod)
- sameSite: 'lax'
- Session duration: 24 hours
- Session middleware for WebSocket upgrades

**MongoDB & Persistence Framework** (Framework 2)
- Install: `mongodb`
- Create `PersistenceManager` singleton in `backend/PersistenceManager.ts`
- Methods: `connect()`, `disconnect()`, `save()`, `findById()`, `find()`, `delete()`
- Collections enum: Users, Players, GoogleProfiles
- Error handling for all database operations
- Connection string from `MONGODB_URI` env var

**WebSocket Communication**
- Install: `ws`, `@types/ws`
- Create `WebSocketService` in `services/websocket/WebSocketService.ts`
- Session validation during upgrade
- Connection lifecycle: connect, message, close, error
- Message protocol (JSON): `{ type, payload }`

**Backend/Application Architecture** (Singletons with clear separation)
- Create `IBackend` interface in `backend/IBackend.ts`
- Create `Backend` class in `backend/Backend.ts` (singleton)
  - Manages WebSocket connections
  - I/O operations only (sendMessageToSocket, etc.)
  - Implements IBackend for Application callbacks
- Create `Application` class in `backend/Application.ts` (singleton)
  - Game state coordinator
  - Tracks interactivesBySocketId
  - Connection lifecycle (handleUserConnect, handleUserDisconnect)
  - Message routing (processUserMessage)
  - Does NOT track objects (that's StuffApi's job)

**Object Management** (StuffApi owns object registry)
- Create `Stuff` base class in `mud/lib/stuff/Stuff.ts`
  - Auto-registers on construction via StuffApi.register(this)
  - Auto-unregisters on destroy via StuffApi.unregister(this)
- Create `Idea` abstract class in `mud/lib/stuff/Idea.ts`
- Create `StuffApi` in `mud/api/stuff.ts` (static class)
  - `generateId()` using shortuuid
  - Object registry: `objectsById: Map<string, Stuff>`
  - Avatar registry: `avatarsByPlayerId: Map<string, Avatar>`
  - Destroyed tracking: `destroyedObjects: WeakMap<Stuff, DestroyedObjectMetadata>`
  - Lookup methods: `findById()`, `findAvatarByPlayerId()`
  - Registration: `register()`, `unregister()`

**Server Class**
- Create `Server` class in `services/Server.ts`
- Coordinates all services
- Middleware setup
- Error handling (uncaughtException, unhandledRejection, SIGTERM)
- Graceful shutdown

**Client Updates**
- Install: `zustand`, `styled-components`
- Create basic store structure
- Create WebSocket service (client-side)
- Update App.tsx with connection status

### File Structure After Phase 1

```
packages/server/src/
├── index.ts
├── services/
│   ├── Server.ts
│   ├── auth/
│   │   ├── PassportConfig.ts
│   │   ├── AuthRoutes.ts
│   │   └── AuthMiddleware.ts
│   └── websocket/
│       └── WebSocketService.ts
├── backend/
│   ├── IBackend.ts
│   ├── Backend.ts
│   ├── Application.ts
│   ├── ApplicationInstance.ts
│   └── PersistenceManager.ts
└── mud/
    ├── api/
    │   └── stuff.ts
    └── lib/
        └── stuff/
            ├── Stuff.ts
            └── Idea.ts

packages/client/src/
├── main.tsx
├── App.tsx
├── services/
│   └── websocket.ts
└── store/
    └── index.ts
```

### Detailed Implementation Notes

**PassportConfig.ts**:
```typescript
class PassportConfig {
  constructor(private backend: Backend) {}

  configure(): void {
    // Serialize: store { id: userId } in session
    passport.serializeUser((user: any, done) => {
      done(null, { id: user.id });
    });

    // Deserialize: retrieve { id: userId } from session
    passport.deserializeUser((obj: any, done) => {
      done(null, obj);
    });

    // Google Strategy
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    }, async (accessToken, refreshToken, profile, done) => {
      // Delegate to Backend
      await this.backend.handleAuthenticationSuccess(profile, done);
    }));
  }
}
```

**WebSocketService.ts**:
```typescript
class WebSocketService {
  private wss: WebSocket.Server | null = null;

  initialize(server: http.Server, sessionMiddleware: RequestHandler): WebSocket.Server {
    this.wss = new WebSocket.Server({
      noServer: true,
      clientTracking: true,
      maxPayload: 50 * 1024 * 1024 // 50MB
    });

    // Handle upgrade with session middleware
    server.on('upgrade', (request, socket, head) => {
      sessionMiddleware(request as any, {} as any, () => {
        this.handleConnection(request, socket, head);
      });
    });

    return this.wss;
  }

  private handleConnection(request: IncomingMessage, socket: Socket, head: Buffer): void {
    const session = (request as any).session;
    const userId = session?.passport?.user?.id;

    if (!userId) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    this.wss!.handleUpgrade(request, socket, head, (ws) => {
      const sessionId = session.id;
      this.backend.handleWebSocketConnect(ws, userId, sessionId);
    });
  }
}
```

### Verification

1. ✅ User can navigate to http://localhost:5173
2. ✅ Client shows "Not connected" status
3. ✅ User clicks "Login with Google" (if button exists)
4. ✅ OAuth flow redirects to Google and back
5. ✅ Session cookie is set with HttpOnly flag
6. ✅ WebSocket connection attempt is made
7. ✅ Session is validated during WebSocket upgrade
8. ✅ Connection establishes if authenticated
9. ✅ Client shows "Connected" status
10. ✅ `ping` message sent from client receives `pong` response
11. ✅ MongoDB connection is established
12. ✅ Can save and retrieve documents from MongoDB
13. ✅ Logout clears session and closes WebSocket

---

## Phase 2: Identity Models & Object Lifecycle

### Goal
Build User/Player/GoogleProfile/Interactive/Character/Avatar models and implement connection lifecycle with multiplexing support.

### Dependencies
- Phase 1 must be complete (auth, persistence, WebSocket)
- Mixin Framework must be defined (Framework 5)
- Object Lifecycle Framework must be defined (Framework 3)

### Features to Implement

**Mixin Framework** (Framework 5)
- Create `MixinApi` in `mud/api/mixin.ts`
- Symbol-based metadata
- Mixin registration, detection, querying
- Mixin composition utilities
- @RequiresMixins decorator

**Core Mixins**
- `NamedMixin` in `mud/lib/stuff/Named.ts`
  - firstName, lastName, fullName
- `GenderedMixin` in `mud/lib/stuff/Gendered.ts`
  - Pronouns enum, setPronouns, getPronouns
- `ContainerMixin` in `mud/lib/stuff/Container.ts`
  - inventory, addToInventory, removeFromInventory
- `ContainableMixin` in `mud/lib/stuff/Containable.ts`
  - environment, setEnvironment, getEnvironment
- `VisibleMixin` in `mud/lib/stuff/Visible.ts`
  - shortDescription, longDescription
- `SensorMixin` in `mud/lib/message/Sensor.ts` (Phase 3, included here for Character)
  - onMessage, interceptMessage
- `VocalMixin` in `mud/lib/message/Vocal.ts` (Phase 3, included here for Character)
  - say, tell, sayTo

**Extended Standard Model**
- `Agent` class in `mud/lib/stuff/Agent.ts`
  - Extends Stuff
  - Applies Container + Containable mixins
  - Base for mobile entities

- `Character` class in `mud/lib/stuff/Character.ts` (abstract)
  - Extends: NamedMixin(GenderedMixin(SensorMixin(VocalMixin(Agent))))
  - Abstract base for all sentient beings (PCs and NPCs)
  - Properties: firstName, lastName, pronouns, xp, level, hp, maxHp
  - Methods: fullName getter, isPC(), isNPC(), isPersistent() (abstract)
  - **Runtime-only class** - no MongoDB collection
  - Enforces common structure for PCs and NPCs in TypeScript
  - **Note**: PCs and NPCs have very different progression logic despite sharing stat fields
    - PCs: Active progression (gain XP → level up → skill trees, persistent)
    - NPCs: Static/scripted values (fixed level, no XP gain, respawn at full HP)

**Persistent Identity Models**
- `User` in `mud/lib/identity/User.ts` (extends Idea)
  - Properties: userId, email, players (Set<string>), googleProfile
  - Account-level data (credentials, PII, preferences)
  - **Never appears in-world** - pure account management
  - Persistence methods: save, findByUserId, findById
  - Methods: addPlayer, removePlayer, setGoogleProfile

- `GoogleProfile` in `mud/lib/identity/GoogleProfile.ts` (extends Idea)
  - Properties: googleId, displayName, emails, photos, rawProfile, user
  - OAuth data from Google
  - Persistence methods: save, findByGoogleId
  - Methods: setUser, getPrimaryPhotoUrl

- `Player` in `mud/lib/identity/Player.ts` (extends NamedMixin(GenderedMixin(Idea)))
  - **Embeds all Character data** (firstName, lastName, pronouns, xp, level, hp, maxHp, location, inventory)
  - **Plus Player metadata** (userId, created, lastPlayed, playTime)
  - Properties: userId (link to User), Character fields, metadata
  - **Pure persistence** - no runtime state or methods like "attack()"
  - Persistence methods: save, findByUserId, findById
  - Methods: setUser, updateFromGoogleProfile

- `NPC` in `mud/lib/identity/NPC.ts` (extends NamedMixin(GenderedMixin(Idea))) - **Optional**
  - **Embeds all Character data** (same fields as Player)
  - **Plus NPC metadata** (templateKey, spawnLocation, respawnDelay, lastSpawned)
  - **Rarely used** - most NPCs don't persist (spawned from templates)
  - Only persist NPCs with unique state (quest progress, custom inventory)
  - Persistence methods: save, findById, findByTemplateKey

**Runtime Models**
- `Interactive` in `mud/lib/identity/Interactive.ts` (extends Idea)
  - Runtime only, never persisted
  - Properties:
    - socketId, sessionId, userId (from auth)
    - currentAvatar: Avatar | null (which character they're controlling)
    - availableAvatars: Map<string, Avatar> (playerId → Avatar)
  - Methods:
    - switchAvatar(playerId) - su-style character switching
    - loadAvailableAvatars() - load all PCs for this user
    - send(message) - send to client
    - destroy() - disconnect cleanup

- `Avatar` in `mud/obj/Avatar.ts` (extends Character)
  - Runtime representation of player character
  - Properties:
    - player: Player (required - syncs here)
    - interactives: Set<Interactive> (multiple connections - multiplexing)
    - All Character fields (firstName, lastName, pronouns, xp, level, hp, etc.)
  - Methods:
    - isConnected() - check if any Interactive connected
    - isLinkdead() - PC with no connections
    - addInteractive(interactive) - add connection
    - removeInteractive(interactive) - remove connection
    - sendMessage(message) - send to all connected Interactives
    - syncToPlayer() - save runtime state to Player document
    - syncFromPlayer() - load Player document to runtime state
    - createFromPlayer(player) - factory method
  - isPersistent() returns true (always persists via Player)

**PersistApi** (Framework 2 - Hybrid Auto-Sync)
- Create `PersistApi` in `mud/api/persist.ts`
- Auto-sync methods: `syncTo(source, target)`, `syncFrom(source, target)`
- Collects fields from mixins automatically via `MixinApi.getMixinFields()`
- Applies complex type handlers for references, collections
- Legacy manual methods (deprecated): syncToPersistable, syncFromPersistable

**Mixin Field Declaration**
- Each mixin declares `static persistentFields = [...]`
- NamedMixin: `['firstName', 'lastName']`
- GenderedMixin: `['pronouns']`
- Automatically collected by PersistApi for all classes using these mixins

**Avatar Field Declaration**
- Declare `static persistentFields = ['xp', 'level', 'hp', 'maxHp']`
- Declare `static persistenceHandlers = { location: {...}, inventory: {...} }`
- Implement `getAllPersistentFields()` to combine mixin + own fields

**Connection Lifecycle** (with multiplexing support)
- Update `Application.handleUserConnect(userId, sessionId, socketId)`
  - Create Interactive with socketId, sessionId, userId
  - Load all available Avatars for this user's Players
    - For each Player: check if Avatar already exists (another connection might have it loaded)
    - If Avatar doesn't exist, create from Player (Avatar.createFromPlayer)
    - Store in interactive.availableAvatars
  - If user has only one Player, auto-select it via interactive.switchAvatar(playerId)
  - If multiple Players, send character select screen
  - Send connection_established message

- Character Selection Flow (new for Phase 2)
  - Client sends "select_character" message with playerId
  - interactive.switchAvatar(playerId)
    - Removes Interactive from old Avatar (if any)
    - Adds Interactive to new Avatar
    - Sends avatar_switched confirmation
    - Sends current location description (look)

- Multiplexing Flow (same user, multiple connections)
  - User connects from laptop (Interactive1)
  - User connects from phone (Interactive2)
  - Both Interactives select same playerId
  - Same Avatar now has 2 Interactives
  - Commands executed once, both see output (avatar.sendMessage broadcasts)

- Update `Application.handleUserDisconnect(socketId)`
  - Find Interactive by socketId
  - interactive.destroy()
    - Removes Interactive from currentAvatar
    - If Avatar has no more connections (not connected):
      - avatar.syncToPlayer() - save runtime state to Player
      - player.save() - persist to MongoDB
      - Optionally: schedule Avatar destruction after timeout (linkdead cleanup)
    - Clean up availableAvatars references
  - Remove Interactive from Application tracking

**Backend.handleAuthenticationSuccess** update
- Create/update GoogleProfile from OAuth profile
- Create/update User linked to GoogleProfile
- Return userId for session

**Application Tracking Updates**
- `avatarsByPlayerId: Map<string, Avatar>` - track PCs for reuse
- `interactivesBySocketId: Map<string, Interactive>` - track connections
- Methods:
  - findAvatarByPlayerId(playerId) - check if Avatar already loaded
  - registerAvatar(avatar) - register in both objectsById and avatarsByPlayerId

### File Structure After Phase 2

```
packages/server/src/mud/
├── api/
│   ├── stuff.ts
│   ├── mixin.ts
│   └── persist.ts
├── lib/
│   ├── stuff/
│   │   ├── Stuff.ts
│   │   ├── Idea.ts
│   │   ├── Agent.ts
│   │   ├── Character.ts (abstract - PC/NPC base)
│   │   ├── Named.ts
│   │   ├── Gendered.ts
│   │   ├── Container.ts
│   │   ├── Containable.ts
│   │   └── Visible.ts
│   ├── message/ (Phase 3, but mixins needed for Character)
│   │   ├── Sensor.ts
│   │   └── Vocal.ts
│   └── identity/
│       ├── User.ts
│       ├── GoogleProfile.ts
│       ├── Player.ts (embeds Character data)
│       ├── NPC.ts (optional - embeds Character data)
│       └── Interactive.ts
└── obj/
    └── Avatar.ts (extends Character)
```

### Detailed Implementation Notes

**Character (abstract base class)**:
```typescript
abstract class Character extends NamedMixin(GenderedMixin(SensorMixin(VocalMixin(Agent)))) {
  // Identity (from mixins)
  firstName: string = '';
  lastName: string = '';
  pronouns: Pronouns = Pronouns.They;

  // Stat fields (shared structure, but VERY different usage between PCs and NPCs)
  xp: number = 0;        // PCs: Gain from activities, drive level-ups
                         // NPCs: Usually 0, not used (static level from template)

  level: number = 1;     // PCs: Progress through levels via XP
                         // NPCs: Fixed at template value, or scaled to player level

  hp: number = 100;      // PCs: Damage persists, heals over time
  maxHp: number = 100;   // NPCs: Usually respawn at full HP, might scale

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim() || 'Someone';
  }

  abstract isPersistent(): boolean;

  isPC(): boolean {
    return this instanceof Avatar;
  }

  isNPC(): boolean {
    return !this.isPC();
  }
}
```

**Player Document Structure** (embeds Character data):
```typescript
class Player extends NamedMixin(GenderedMixin(Idea)) {
  _id: string;                     // MongoDB document ID (Player ID)
  userId: string;                  // Link to User account

  // ===== CHARACTER DATA (embedded) =====
  firstName: string;
  lastName: string;
  pronouns: Pronouns;
  xp: number;
  level: number;
  hp: number;
  maxHp: number;
  location: string;                // Template key or coordinates
  inventory: string[];             // Template keys or stuffIds

  // ===== PLAYER METADATA =====
  created: Date;
  lastPlayed: Date;
  playTime: number;                // Total seconds played

  async save(): Promise<void> { /* MongoDB */ }
  static async findById(id: string): Promise<Player | null>
  static async findByUserId(userId: string): Promise<Player[]>
}
```

**Avatar (extends Character)**:
```typescript
class Avatar extends Character {
  player: Player;                           // Required - syncs here
  interactives: Set<Interactive> = new Set();  // Multiple connections

  constructor(player: Player) {
    super();
    this.player = player;
  }

  isPersistent(): boolean {
    return true;
  }

  isConnected(): boolean {
    return this.interactives.size > 0;
  }

  isLinkdead(): boolean {
    return !this.isConnected();
  }

  addInteractive(interactive: Interactive): void {
    this.interactives.add(interactive);
    interactive.currentAvatar = this;
  }

  removeInteractive(interactive: Interactive): void {
    this.interactives.delete(interactive);

    if (interactive.currentAvatar === this) {
      interactive.currentAvatar = null;
    }

    if (!this.isConnected()) {
      this.syncToPlayer();
      this.player.save();
    }
  }

  sendMessage(message: any): void {
    this.interactives.forEach(interactive => {
      interactive.send(message);
    });
  }

  // Declare persistent fields (simple types auto-sync)
  static persistentFields = ['xp', 'level', 'hp', 'maxHp'];

  // Complex type handlers
  static persistenceHandlers = {
    location: {
      to: (location: Location | null) => location?.templateKey || null,
      from: async (key: string | null) =>
        key ? await StuffApi.clone(key) : null
    },
    inventory: {
      to: (items: Thing[]) => items.map(item => ({
        stuffId: item.stuffId,
        templateKey: item.templateKey
      })),
      from: async (data: any[]) => {
        const items = await Promise.all(
          data.map(d => StuffApi.clone(d.templateKey))
        );
        items.forEach((item, i) => {
          item.stuffId = data[i].stuffId;
        });
        return items;
      }
    }
  };

  syncToPlayer(): void {
    // Auto-sync all fields from mixins + own fields + complex types
    PersistApi.syncTo(this, this.player);
    this.player.lastPlayed = new Date();
  }

  async syncFromPlayer(): Promise<void> {
    // Auto-sync all fields from mixins + own fields + complex types
    await PersistApi.syncFrom(this.player, this);
  }

  static getAllPersistentFields(): string[] {
    // Collect from NamedMixin, GenderedMixin, etc. + own fields
    const mixinFields = MixinApi.getMixinFields(this);
    const ownFields = this.persistentFields || [];
    return [...mixinFields, ...ownFields];
  }

  static async createFromPlayer(player: Player): Promise<Avatar> {
    const avatar = new Avatar(player);
    avatar.syncFromPlayer();

    ApplicationInstance.get().registerAvatar(avatar);
    return avatar;
  }
}
```

**Interactive (connection management)**:
```typescript
class Interactive extends Idea {
  socketId: string;
  sessionId: string;
  userId: string;

  currentAvatar: Avatar | null = null;
  availableAvatars: Map<string, Avatar> = new Map();  // playerId → Avatar

  async switchAvatar(playerId: string): Promise<void> {
    const newAvatar = this.availableAvatars.get(playerId);

    if (!newAvatar) {
      throw new Error(`Avatar not available: ${playerId}`);
    }

    // Remove from old avatar
    if (this.currentAvatar) {
      this.currentAvatar.removeInteractive(this);
    }

    // Add to new avatar
    newAvatar.addInteractive(this);

    // Send confirmation
    this.send({
      type: 'avatar_switched',
      payload: {
        playerId: newAvatar.player._id,
        name: newAvatar.fullName
      }
    });
  }

  async loadAvailableAvatars(): Promise<void> {
    const user = await User.findByUserId(this.userId);
    if (!user) throw new Error('User not found');

    for (const playerId of user.players) {
      const player = await Player.findById(playerId);
      if (!player) continue;

      // Check if Avatar already exists (another Interactive might have it)
      let avatar = ApplicationInstance.get().findAvatarByPlayerId(playerId);

      if (!avatar) {
        avatar = await Avatar.createFromPlayer(player);
      }

      this.availableAvatars.set(playerId, avatar);
    }
  }

  send(message: any): void {
    const app = ApplicationInstance.get();
    app.backend.sendMessageToSocket(this.socketId, message);
  }

  destroy(): void {
    if (this.currentAvatar) {
      this.currentAvatar.removeInteractive(this);
    }

    // Check if any other Interactives are using our available Avatars
    for (const [playerId, avatar] of this.availableAvatars) {
      if (!avatar.isConnected()) {
        avatar.syncToPlayer();
        avatar.player.save();
      }
    }

    super.destroy();
  }
}
```

**Application.handleUserConnect** (updated):
```typescript
async handleUserConnect(userId: string, sessionId: string, socketId: string) {
  // Create Interactive
  const interactive = new Interactive();
  interactive.userId = userId;
  interactive.sessionId = sessionId;
  interactive.socketId = socketId;

  // Load all available Avatars for this user
  await interactive.loadAvailableAvatars();

  // Auto-select if only one Player
  if (interactive.availableAvatars.size === 1) {
    const [playerId] = interactive.availableAvatars.keys();
    await interactive.switchAvatar(playerId);
  } else {
    // Send character select screen
    this.sendCharacterSelectScreen(interactive);
  }

  // Register Interactive
  this.interactivesBySocketId.set(socketId, interactive);
}
```

### Verification

**Basic Connection:**
1. ✅ User logs in with Google OAuth
2. ✅ User, GoogleProfile, and Player are created automatically
3. ✅ Interactive created with userId, sessionId, socketId
4. ✅ Interactive loads all available Avatars for user's Players
5. ✅ If one Player, auto-select it; if multiple, show character select
6. ✅ Avatar is created from Player and spawned (no location yet)
7. ✅ Avatar.addInteractive(interactive) links connection
8. ✅ connection_established message sent to client
9. ✅ Client displays user name from Avatar

**Persistence:**
10. ✅ User disconnects
11. ✅ Avatar.removeInteractive(interactive) called
12. ✅ Avatar.syncToPlayer() copies runtime state to Player
13. ✅ Player.save() persists to MongoDB
14. ✅ Interactive destroyed
15. ✅ Avatar kept in memory (or destroyed after timeout)
16. ✅ User reconnects
17. ✅ Player loaded from MongoDB
18. ✅ Avatar reused if still in memory, or created fresh
19. ✅ Avatar.syncFromPlayer() restores state
20. ✅ User's name, pronouns, xp, hp persist across sessions

**Multiplexing (same character, multiple connections):**
21. ✅ User connects from laptop (Interactive1)
22. ✅ User connects from phone (Interactive2)
23. ✅ Both select same Player
24. ✅ Same Avatar has interactives.size === 2
25. ✅ Command executed once, both connections see output
26. ✅ Disconnect laptop, phone stays connected
27. ✅ Avatar still connected (interactives.size === 1)
28. ✅ Disconnect phone, Avatar saves and becomes linkdead
29. ✅ Avatar.isLinkdead() returns true

**Character Switching (future Phase, verify architecture supports it):**
30. ✅ User has multiple Players
31. ✅ Character select screen shown on connect
32. ✅ User selects Player A, controls Avatar A
33. ✅ User calls switchAvatar(playerIdB)
34. ✅ Avatar A removes Interactive
35. ✅ Avatar B adds Interactive
36. ✅ User now controlling Avatar B

**Multiple Users:**
37. ✅ Multiple users can connect simultaneously
38. ✅ Each user has their own Interactive(s) and Avatar(s)
39. ✅ Avatars interact with each other in shared Locations

---

## Phase 3: Starting Room & Basic Look

### Goal
Create a single starting Location where all players spawn. Implement basic "look" command.

### Dependencies
- Phase 2 must be complete (Avatar, Player, mixins)
- Location class needs Container + Visible mixins

### Features to Implement

**Location Class**
- `Location` in `mud/lib/location/Location.ts`
- Extends: ContainerMixin(VisibleMixin(Stuff))
- Properties: name, shortDescription, longDescription
- Methods: getContents() returns all Avatars in location

**Starting Room Creation**
- Hardcoded Location instance created in Application
- name: "The Void" (or "Starting Chamber")
- shortDescription: "A blank space"
- longDescription: "You find yourself in a featureless void..."

**Avatar Updates**
- Avatar now has location property (from Containable mixin)
- Application.handleUserConnect: after Avatar creation, moveToLocation(startingRoom)
- startingRoom.addToInventory(avatar)
- avatar.setEnvironment(startingRoom)

**Basic Look Command** (stub)
- Create `LookCommand` controller in `mud/lib/command/commands/LookCommand.ts`
- For now: simple hardcoded execution
- Returns location name, description, list of other characters

**Client Terminal (minimal)**
- Create `Terminal` component in `client/src/components/Terminal.tsx`
- Display message buffer (array of strings)
- Create `CommandBar` component in `client/src/components/CommandBar.tsx`
- Input field + send button
- Send "look" command on connect

**Message Handling**
- Application sends "output" type messages to client
- Client appends output messages to Terminal buffer
- Terminal auto-scrolls to bottom

### File Structure After Phase 3

```
packages/server/src/mud/
├── lib/
│   ├── location/
│   │   └── Location.ts
│   └── command/
│       └── commands/
│           └── LookCommand.ts

packages/client/src/components/
├── Terminal.tsx
└── CommandBar.tsx
```

### Detailed Implementation Notes

**Application starting room**:
```typescript
class Application {
  private startingRoom: Location;

  constructor(backend: IBackend) {
    this.backend = backend;
    this.startingRoom = new Location();
    this.startingRoom.name = "The Void";
    this.startingRoom.shortDescription = "A blank space";
    this.startingRoom.longDescription = "You find yourself in a featureless void...";
  }

  async handleUserConnect(userId: string, sessionId: string, socketId: string) {
    // ... create Avatar ...

    // Move to starting room
    this.startingRoom.addToInventory(avatar);
    avatar.setEnvironment(this.startingRoom);

    // Send look automatically
    this.sendLookDescription(avatar, socketId);
  }

  private sendLookDescription(avatar: Avatar, socketId: string): void {
    const location = avatar.getEnvironment() as Location;
    const others = location.getContents()
      .filter(c => c !== avatar)
      .map(c => (c as Avatar).fullName)
      .join(", ");

    const message = {
      type: "output",
      payload: {
        text: [
          location.name,
          location.longDescription,
          others ? `Also here: ${others}` : ""
        ].filter(Boolean).join("\n\n")
      }
    };

    this.backend.sendMessageToSocket(socketId, message);
  }
}
```

**LookCommand (stub)**:
```typescript
class LookCommand {
  execute(context: CommandContext): void {
    const avatar = context.avatar;
    const location = avatar.getEnvironment() as Location;

    // Build description
    const others = location.getContents()
      .filter(c => c !== avatar)
      .map(c => (c as Avatar).fullName)
      .join(", ");

    const output = [
      location.name,
      location.longDescription,
      others ? `Also here: ${others}` : ""
    ].filter(Boolean).join("\n\n");

    // Send to client
    const message = {
      type: "output",
      payload: { text: output }
    };

    context.interactive.send(message); // Or via Backend
  }
}
```

### Verification

1. ✅ User logs in and Avatar spawns in starting room
2. ✅ Client automatically displays location description
3. ✅ Location name shown: "The Void"
4. ✅ Location description shown
5. ✅ User types "look" in CommandBar
6. ✅ Same location description appears again
7. ✅ Second user logs in
8. ✅ First user sees "Also here: [Second User Name]"
9. ✅ Second user sees "Also here: [First User Name]"
10. ✅ User disconnects and reconnects, still in starting room
11. ✅ Multiple users in room all see each other

---

## Phase 4: Command Framework

### Goal
Build the complete UNIX-like command parsing system.

### Dependencies
- Phase 3 complete (Location, basic communication established)
- Command Framework design (Framework 10)

### Features to Implement

**CommandDefinition** (YAML-based)
- Create `CommandDefinition` class in `mud/lib/command/CommandDefinition.ts`
- Parse YAML structure
- Fields: boolean, number, string, object(s)
- Options: short (-o) and long (--option)
- **Subcommands** (routing, parsing - REQUIRED FOR MVP)
- Validation rules (field-level, multi-field, model-level)
- Syntax patterns with multiple variants

**Command Line Parsing**
- Create `CommandLineApi` in `mud/api/command.ts`
- Tokenization with quote handling
- Escape sequence support
- Multi-argument parsing
- Option extraction (-o --option)

**CommandController**
- Create `CommandController` abstract class in `mud/lib/command/CommandController.ts`
- Methods: execute(fields, options, context)
- Context includes: avatar, interactive, location, commandText

**CommandGiverMixin**
- Create `CommandGiverMixin` in `mud/lib/command/CommandGiverMixin.ts`
- Methods: getAvailableCommands(), executeCommand(text, context)
- Apply to Avatar

**Command Sources**
- Enum: Inventory, Environment, Self, Colocated
- Command discovery searches sources in precedence order

**MQL Integration** (CRITICAL - objects are core to commands)
- Integrate MqlApi.resolve() for `type: object` fields
- Integrate MqlApi.resolveMany() for `type: object, multiple: true` fields
- Ordinal disambiguation (first, second, third)
- **Basic quantity syntax**: `"5 arrows"` → array of up to 5 objects matching "arrows"
- **Basic collection syntax**: `"all flowers"` → array of all objects matching "flowers"
- Error handling for ambiguous/not-found queries
- Note: Objects may or may not be globbed (Globbable mixin Phase 5), MQL doesn't care

**Validation System**
- Field-level validators (mustBeVisible, canReach, mustBeNumber, etc.)
- Multi-field validators (targetInReach, bothHandsFree, etc.)
- Model-level validators (complex business rules)
- Common validators library
- Custom validators per command
- Validation error messages

**CommandShell**
- Create `CommandShell` class in `mud/lib/command/CommandShell.ts`
- Execution context management
- Error handling
- Help text generation

**Basic Commands** (MVP set)
- **PingCommand**: Returns "pong"
- **LookCommand**: Enhanced with CommandDefinition
- **HelpCommand**: Lists available commands, shows command syntax
- **PlayerCommand**: Subcommands for name, pronouns, avatar, show (REQUIRED FOR MVP)
- **GetCommand**: Take objects (demonstrates multi-object selection: "get 5 arrows", "get all flowers")
- **DropCommand**: Drop objects (demonstrates multi-object selection)
- **InventoryCommand**: Show what you're carrying

**Application Command Processing**
- `Application.processUserMessage` updated
- Extract command text from "command" type message
- Parse with CommandLineApi
- Match verb to CommandDefinition
- Validate fields
- Execute CommandController
- Send result back as "output" message

**Client Updates**
- CommandBar sends "command" type messages
- Command history (up/down arrows)
- Multiline mode toggle

### File Structure After Phase 4

```
packages/server/src/mud/
├── api/
│   └── command.ts (CommandLineApi)
├── lib/
│   └── command/
│       ├── CommandController.ts
│       ├── CommandDefinition.ts
│       ├── CommandGiverMixin.ts
│       ├── CommandShell.ts
│       └── commands/
│           ├── PingCommand.ts
│           ├── LookCommand.ts (enhanced)
│           └── HelpCommand.ts
```

### Detailed Implementation Notes

**CommandDefinition YAML example**:
```yaml
verbs: [look, l]
description: "Examine your surroundings or an object"
syntax:
  - pattern: ""
    description: "Look at current location"
  - pattern: "<target>"
    description: "Look at specific target"
    fields:
      target:
        type: string
        required: true
```

**CommandLineApi.parse()**:
```typescript
class CommandLineApi {
  static parse(input: string): ParsedCommand {
    // Tokenize with quote handling
    const tokens = this.tokenize(input);

    // First token is verb
    const verb = tokens[0];
    const args = tokens.slice(1);

    // Extract options
    const { options, remaining } = this.extractOptions(args);

    return { verb, args: remaining, options };
  }

  private static tokenize(input: string): string[] {
    // Handle single/double quotes
    // Handle escape sequences
    // Return array of tokens
  }

  private static extractOptions(tokens: string[]): { options: Map<string, any>, remaining: string[] } {
    // Extract -o and --option flags
    // Return options map and remaining args
  }
}
```

**Application.processUserMessage()**:
```typescript
processUserMessage(socketId: string, messageData: unknown): void {
  const message = messageData as WebSocketMessage;

  if (message.type === "command") {
    const commandText = message.payload.text;
    const interactive = this.interactivesBySocketId.get(socketId);

    if (!interactive) return;

    const avatar = interactive.avatar;
    const context: CommandContext = {
      avatar,
      interactive,
      location: avatar.getEnvironment() as Location,
      commandText
    };

    try {
      // Parse command
      const parsed = CommandLineApi.parse(commandText);

      // Find command (from avatar's available commands)
      const command = avatar.getAvailableCommands()
        .find(cmd => cmd.verbs.includes(parsed.verb));

      if (!command) {
        this.sendError(socketId, `Unknown command: ${parsed.verb}`);
        return;
      }

      // Execute
      const result = command.execute(parsed.args, parsed.options, context);

      // Send result
      this.backend.sendMessageToSocket(socketId, {
        type: "output",
        payload: { text: result }
      });
    } catch (error) {
      this.sendError(socketId, error.message);
    }
  }
}
```

### Verification

1. ✅ User types "ping" → receives "pong"
2. ✅ User types "look" → sees location description
3. ✅ User types "help" → sees list of available commands
4. ✅ User types "help look" → sees look command syntax
5. ✅ User types invalid command → sees error message
6. ✅ User types command with wrong syntax → sees error + usage
7. ✅ User types 'say "hello world"' → quotes parsed correctly
8. ✅ User types 'look --verbose' → option extracted
9. ✅ Up arrow recalls previous command
10. ✅ Down arrow moves forward in history
11. ✅ Multiline mode allows editing long commands

---

## Phase 5: Communications (MVP MILESTONE 4)

### Goal
Enable users to communicate via "say" (room-wide) and "tell" (direct messages).

### Dependencies
- Phase 4 complete (Command Framework)
- Need Sensor and Vocal mixins

### Features to Implement

**Sensor Mixin**
- Create `Sensor` mixin in `mud/lib/message/Sensor.ts`
- Methods: onMessage(message), interceptMessage(message)
- Applied to Avatar

**Vocal Mixin**
- Create `Vocal` mixin in `mud/lib/message/Vocal.ts`
- Methods: say(text), tell(target, text)
- Applied to Avatar

**MessageApi** (basic)
- Create `MessageApi` in `mud/api/message.ts`
- messageContainer(container, message, exclude?)
- messageAll(sensors, message)
- messageOne(sensor, message)

**Say Command**
- Create `SayCommand` in `mud/lib/command/commands/SayCommand.ts`
- Syntax: `say <message...>`
- Broadcasts to all Avatars in location
- Format: "Name says, 'message'"
- Speaker sees: "You say, 'message'"

**Tell Command**
- Create `TellCommand` in `mud/lib/command/commands/TellCommand.ts`
- Syntax: `tell <target> <message...>`
- Finds target Avatar by name
- Sends private message
- Format: "Name tells you, 'message'"
- Sender sees: "You tell Name, 'message'"
- Error if target not found

**Client Message Display**
- Update Terminal to handle different message types
- speech: Normal color
- tell: Different color (italics?)
- system: Different color (gray?)
- Auto-scroll to bottom
- "Scroll to bottom" button when scrolled up

### File Structure After Phase 5

```
packages/server/src/mud/
├── api/
│   └── message.ts
├── lib/
│   ├── message/
│   │   ├── Sensor.ts (mixin)
│   │   └── Vocal.ts (mixin)
│   └── command/
│       └── commands/
│           ├── SayCommand.ts
│           └── TellCommand.ts
```

### Detailed Implementation Notes

**SayCommand.execute()**:
```typescript
execute(fields: any, options: any, context: CommandContext): void {
  const avatar = context.avatar;
  const location = context.location;
  const message = fields.message;

  // Message to others
  const othersText = `${avatar.fullName} says, '${message}'`;
  MessageApi.messageContainer(location, othersText, [avatar]);

  // Message to self
  const selfText = `You say, '${message}'`;
  MessageApi.messageOne(avatar, selfText);
}
```

**TellCommand.execute()**:
```typescript
execute(fields: any, options: any, context: CommandContext): void {
  const avatar = context.avatar;
  const targetName = fields.target;
  const message = fields.message;

  // Find target by name
  const target = this.findAvatarByName(targetName);

  if (!target) {
    MessageApi.messageOne(avatar, `No one named '${targetName}' is here.`);
    return;
  }

  // Message to target
  const targetText = `${avatar.fullName} tells you, '${message}'`;
  MessageApi.messageOne(target, targetText);

  // Message to self
  const selfText = `You tell ${target.fullName}, '${message}'`;
  MessageApi.messageOne(avatar, selfText);
}
```

**MessageApi.messageContainer()**:
```typescript
class MessageApi {
  static messageContainer(container: Container, text: string, exclude: Sensor[] = []): void {
    const contents = container.getContents() as Sensor[];

    contents
      .filter(sensor => !exclude.includes(sensor))
      .forEach(sensor => {
        this.messageOne(sensor, text);
      });
  }

  static messageOne(sensor: Sensor, text: string): void {
    const message = {
      type: "output",
      payload: {
        text,
        messageType: "speech" // or "tell", "system"
      }
    };

    sensor.onMessage(message);
  }
}
```

**Avatar.onMessage()** (from Sensor mixin):
```typescript
onMessage(message: any): void {
  // Avatar forwards message to Interactive
  if (this.interactive) {
    this.interactive.send(message);
  }
}
```

**Interactive.send()**:
```typescript
send(message: any): void {
  // Get Application reference
  const app = ApplicationInstance.get();

  // Send via Backend
  app.backend.sendMessageToSocket(this.socketId, message);
}
```

### Verification

1. ✅ User types `say hello` → message appears in Terminal
2. ✅ Other users in room see "Alice says, 'hello'"
3. ✅ Speaker sees "You say, 'hello'"
4. ✅ User types `tell Bob hi` → Bob receives private message
5. ✅ Bob sees "Alice tells you, 'hi'"
6. ✅ Alice sees "You tell Bob, 'hi'"
7. ✅ User types `tell Nobody test` → error "No one named 'Nobody' is here"
8. ✅ Multiple users can say simultaneously
9. ✅ Multiple users can tell simultaneously
10. ✅ Terminal scrolls properly with many messages
11. ✅ Scroll-to-bottom button appears when scrolled up
12. ✅ Different message types have different styling

**🎉 MVP COMPLETE!** Users can log in and talk to each other!

---

## Phase 6: Extended Object Model & Mixins

### Goal
Complete the Standard Model hierarchy and remaining mixins.

### Features to Implement

**Thing Class**
- `Thing` in `mud/lib/stuff/Thing.ts`
- Extends: ContainableMixin(VisibleMixin(Stuff))
- Base for portable inanimate objects

**DetailedMixin**
- `DetailedMixin` in `mud/lib/stuff/Detailed.ts`
- Hierarchical detail system
- Methods: addDetail(path, description), getDetail(path), removeDetail(path)
- Supports nested details (e.g., "door.handle.lock")

**PropertiedMixin**

**Source**: Brought over from panterasbot (originally designed in LPC, API has held up well over time).

**Purpose**: Provide a controlled API for dynamic runtime properties that don't have first-class support in the code. **DO NOT** let objects just add properties willy-nilly - they MUST use PropertiedMixin.

**Core Principle**: Objects should NOT add arbitrary properties via direct assignment (`obj.foo = bar`). All dynamic properties MUST go through the PropertiedMixin API for security, introspection, and persistence control.

**API** (proven design, use more or less verbatim):

```typescript
// Property type wrapper
export class Property<T extends PropValue = PropValue> extends String {}

// Supported property value types
export type PropValue =
  | object
  | string
  | number
  | boolean
  | (object | string | number | boolean)[]
  | null;

// Property operations
export const PropOperations = {
  Configure: "configure",  // Change property configuration
  Set: "set",              // Set property value
  Get: "get",              // Get property value
  Remove: "remove",        // Remove property
  Mask: "mask",            // Add access mask (security)
  Unmask: "unmask"         // Remove access mask
} as const;

export type PropOperation = typeof PropOperations[keyof typeof PropOperations];

// Access control function
export type PropMask<T extends PropValue> = (
  prop: Property<T>,
  op: PropOperation,
  special: any
) => boolean;

// Property configuration options
export interface PropOptions<T extends PropValue> {
  transient: boolean;      // true = memory only, false = persists to DB
  checkAccess: PropMask<T>; // Access control function
}

// PropertiedMixin interface
export interface Propertied {
  // Read-only view of all properties (saved + transient)
  props: Readonly<Record<string, PropValue>>;

  // Initialize a new property with options
  initProp<T extends PropValue>(
    prop: Property<T>,
    options?: Partial<PropOptions<T>>
  ): boolean;

  // Change property configuration (transient/saved, access control)
  configureProp<T extends PropValue>(
    prop: Property<T>,
    options: Partial<PropOptions<T>>
  ): boolean;

  // Set property value (auto-initializes if doesn't exist)
  setProp<T extends PropValue>(prop: Property<T>, value: T): boolean;

  // Get property value (null if doesn't exist or access denied)
  getProp<T extends PropValue>(prop: Property<T>): T | null;

  // Remove property
  removeProp<T extends PropValue>(prop: Property<T>): boolean;

  // Add access mask (for fine-grained security)
  maskProp<T extends PropValue>(
    prop: Property<T>,
    mask: PropMask<T>
  ): boolean;

  // Remove access mask
  unmaskProp<T extends PropValue>(prop: Property<T>, owner: any): boolean;

  // Check if property exists and get its options
  checkProp<T extends PropValue>(prop: Property<T>): PropOptions<T> | null;

  // Get all property names
  getAllPropNames(): Property<PropValue>[];

  // Generate unique property name (useful for anonymous properties)
  generateUniquePropName<T extends PropValue>(seed?: string): Property<T>;

  // Default access control (override in subclasses)
  defaultPropAccess(
    property: Property<PropValue>,
    op: PropOperation,
    special: any
  ): boolean;
}
```

**Usage Examples**:

```typescript
// Basic usage
const avatar = new Avatar();

// Set a simple property (auto-initializes as transient)
avatar.setProp("quest_started", true);
avatar.getProp("quest_started"); // true

// Initialize with explicit options
avatar.initProp("gold", {
  transient: false,  // Persists to database
  checkAccess: (prop, op, special) => {
    // Only owner can modify gold
    if (op === PropOperations.Set && special !== avatar) {
      return false;
    }
    return true;
  }
});
avatar.setProp("gold", 100);

// Generate unique anonymous property
const buffProp = avatar.generateUniquePropName("buff");  // "buff.abc123xyz"
avatar.setProp(buffProp, { strength: 10, duration: 60 });

// Get all properties
const allProps = avatar.getAllPropNames();  // ["quest_started", "gold", "buff.abc123xyz"]

// Remove property
avatar.removeProp("quest_started");

// Change property from transient to saved
avatar.configureProp("temp_flag", { transient: false });
```

**Use Cases**:

1. **Emergent Properties**: Properties that emerge during gameplay
   - Quest flags that weren't planned: `avatar.setProp("met_mysterious_stranger", true)`
   - Temporary buffs/debuffs: `avatar.setProp("poisoned", { damage: 5, duration: 30 })`

2. **Flexible Flags**: Simple flags without warranting first-class fields
   - `location.setProp("visited", true)`
   - `npc.setProp("angered_by_player", true)`

3. **Variable Item Properties**: Items with dynamic properties
   - `sword.setProp("enchantment", "fire")`
   - `sword.setProp("durability", 75)`

4. **Extension Points**: Allow plugins to add properties
   - Education plugin: `avatar.setProp("edu.course_progress", { math: 80, science: 60 })`
   - Guild plugin: `avatar.setProp("guild.rank", "captain")`

**Design Principles**:

- ✅ **Controlled access**: Can't just do `obj.foo = bar` - must go through API
- ✅ **Type-safe**: Property<T> wrapper ensures type checking
- ✅ **Security**: Access control via PropMask functions
- ✅ **Persistence**: Explicit transient vs saved distinction
- ✅ **Introspection**: Can enumerate all properties
- ❌ **NOT for first-class properties**: If it's core to the object, make it a real field

**Implementation Details**:

```typescript
function PropertiedMixin<T extends Constructor<Templatized>>(Base: T) {
  abstract class BasePropertied extends Base implements Propertied {
    // Persistent properties (saved to MongoDB)
    abstract savedProps?: Record<string, PropValue>;

    // Transient properties (memory only)
    transientProps: Record<string, PropValue> = {};

    // Property configuration
    propOptions: Record<string, PropOptions<PropValue>> = {};

    // Read-only view combining saved + transient
    get props(): Readonly<Record<string, PropValue>> {
      return { ...this.savedProps, ...this.transientProps };
    }

    // ... method implementations (see panterasbot/server/src/mud/lib/Propertied.ts)
  }

  return BasePropertied;
}
```

**Persistence**:

- `savedProps` field included in persistence handlers (Framework 2)
- `transientProps` never persisted (lost on server restart)
- `propOptions` reconstructed on load (transient always defaults to true)

**CartesianLocation**
- `CartesianLocation` in `mud/lib/location/CartesianLocation.ts`
- Extends Location
- Properties: x, y coordinates
- Grid-based positioning

**Object Tests**
- Unit tests for all classes
- Mixin composition tests
- Property system tests

### Verification

1. ✅ Can create Thing objects
2. ✅ Things can be contained by Agents/Locations
3. ✅ Details can be added and retrieved
4. ✅ Nested details work (look at door.handle)
5. ✅ PropertiedMixin works correctly:
   - Can setProp/getProp with type safety
   - Transient vs saved properties work correctly
   - Access control via PropMask functions
   - generateUniquePropName creates unique IDs
   - Saved properties persist across restarts
   - Direct property assignment is NOT allowed (must use API)
6. ✅ CartesianLocation positions objects on grid
7. ✅ All object tests pass

---

## Phase 7: Navigation & Exits

### Goal
Enable movement between locations via exits and doors.

### Features to Implement

**ExitableMixin**
- `ExitableMixin` in `mud/lib/location/Exitable.ts`
- Exit management by direction
- Exit properties: hidden, blocked, muffled, noFollow
- Methods: addExit, removeExit, getExit, getObviousExits

**Exit Class**
- `Exit` in `mud/lib/location/Exit.ts`
- Properties: direction, destination, properties, messages
- Methods: canTraverse, traverse

**Door Class**
- `Door` in `mud/lib/location/Door.ts`
- States: open, closed, locked
- Methods: open, close, lock, unlock

**MultiLocation**
- `MultiLocation` in `mud/lib/location/MultiLocation.ts`
- Multiple entrance points
- Entrance routing (entrance ID → Location)

**Receptacle**
- `Receptacle` in `mud/lib/stuff/Receptacle.ts`
- Extends: ContainerMixin(ContainableMixin(VisibleMixin(DetailedMixin(Thing))))
- Default exit direction: "out"

**Navigation Commands**
- **GoCommand**: `go <direction>` or `<direction>`
- **EnterCommand**: `enter <object>`
- **ExitCommand**: `exit`
- **OpenCommand**: `open <door>`
- **CloseCommand**: `close <door>`

**Look Enhancements**
- Show obvious exits
- Show exit descriptions
- Hierarchical detail lookups

**Movement Messages**
- "X arrives from the north" in destination
- "X leaves to the south" in origin
- Custom entry/exit messages

### Verification

1. ✅ Can create multiple connected locations
2. ✅ `go north` moves between locations
3. ✅ Other players see arrival/departure messages
4. ✅ Doors can be opened/closed
5. ✅ Closed doors block movement
6. ✅ `look` shows available exits
7. ✅ Hidden exits don't appear in obvious list
8. ✅ Blocked exits show error
9. ✅ `enter fountain` enters Receptacle
10. ✅ `exit` leaves Receptacle

---

## Phase 8: Advanced API Layer

### Goal
Implement all utility APIs for game features.

### Features to Implement

**GrammarApi**
- Pronoun conjugation (subject, object, possessive)
- Verb agreement (is/are based on pronoun)
- Grammar-aware string building

**StringApi**
- Quote matching and unquoting
- Escape sequence handling
- String builders

**EventApi** (Framework 7)
- Event subscription/dispatch
- Well-known events
- Event payload typing

**TimeApi**
- Duration formatting (human-readable)
- Timestamp utilities

**MqlApi**
- "me" query (resolve to caller)
- "here" query (resolve to location)
- Extensible query system

**ArrayApi**
- Collection utilities

**ObjectApi**
- Object cloning
- Deep merging
- Type introspection

**CallstackApi**
- Execution context tracking

**FileApi**
- File reading
- YAML parsing

**ModuleApi**
- Dynamic module loading

**MudlogApi**
- Structured logging

**AssertApi**
- Validation helpers

### Verification

1. ✅ All APIs can be imported and used
2. ✅ GrammarApi conjugates correctly
3. ✅ EventApi dispatches events
4. ✅ MqlApi resolves queries
5. ✅ All APIs have unit tests

---

## Phase 9: Templates, Mods & Code Sandboxing

### Goal
Enable domain-specific customization via YAML templates and mod system, with isolated-vm sandboxing for security and stability.

### Features to Implement

**Template System**
- StuffTemplate base class
- DomainTemplate organization
- YAML template definitions
- TemplateApi (loading, parsing, instantiation)
- Templatized mixin

**Mod Architecture**
- Mod base class with lifecycle
- Mod registration and loading
- Domain configuration
- Mod dependency management
- Three mod types: Content Mods (templates only), Capability Mods (code only), Full Mods (both)

**Code Sandboxing** (Framework 12 - Critical for v1.0)
- Install isolated-vm dependency
- Implement SandboxManager class
- Bridge core APIs (StuffApi, MessageApi, EventApi) to sandbox
- Load mod blueprints in sandbox
- Resource limits (memory: 128MB, timeout: 1000ms per execution)
- Blueprint loading strategy (core = trusted main process, mods = sandboxed)
- Error handling and timeout protection
- Basic monitoring (execution time, timeout count, error count)

**Guest System**
- Guest account generation
- Random surname assignment

**GraphQL API**
- Type-GraphQL integration
- Schema generation
- Resolvers

**MudlogApi Complete**
- Full logging system

**Example Mods** (run in sandbox)
- Education mod stub (Content Mod)
- Retail mod stub (Capability Mod)

**Documentation**
- Mod development guide (including sandbox limitations)
- Template authoring guide
- Complete API documentation (TypeDoc)
- Sandbox API reference (whitelisted APIs for mods)

### Verification

**Template System:**
1. ✅ Templates load from YAML
2. ✅ Objects instantiate from templates

**Mod System:**
3. ✅ Mod loads and adds commands
4. ✅ Example mods work

**Sandboxing (Critical):**
5. ✅ isolated-vm installed and working
6. ✅ Mod blueprint loaded in sandbox
7. ✅ Sandboxed blueprint can instantiate objects
8. ✅ Sandboxed code can call whitelisted APIs (StuffApi, MessageApi)
9. ✅ Sandboxed code CANNOT access Node.js APIs (require, fs, process)
10. ✅ Timeout kills infinite loop (doesn't crash server)
11. ✅ Memory limit enforced (sandbox killed if exceeded)
12. ✅ Exception in sandbox doesn't crash main process
13. ✅ Core blueprints run in main process (no sandbox overhead)
14. ✅ Mod blueprints run in sandbox (isolated)

**Other Features:**
15. ✅ GraphQL queries work
16. ✅ Documentation is complete

---

## Phase 10: Testing, Sandbox Hardening & Polish

### Goal
Comprehensive testing, sandbox security hardening, performance optimization, and production readiness.

### Features to Implement

**Testing**
- Jest configuration complete
- Unit tests for all APIs (>80% coverage)
- Integration tests for commands
- E2E tests for user flows
- Performance tests
- **Sandbox security tests** (exploit attempts, resource exhaustion, API escape)

**Sandbox Hardening** (Framework 12 - Production Requirements)
- Isolate pooling for performance (pre-warm 10 isolates)
- Snapshot blobs for common code (reduce load time)
- Enhanced monitoring and metrics (CloudWatch integration)
  - Execution time per mod
  - Timeout rate per mod
  - Memory usage per mod
  - Error rate per mod
- Security audit of bridged APIs (ensure no escape routes)
- Fine-grained API permissions (whitelist per mod)
- Sandbox escape testing (attempt to access Node.js APIs, file system, etc.)
- Documentation for mod developers (sandbox limitations, available APIs)
- Error reporting improvements (better stack traces from sandbox)

**Error Handling**
- Comprehensive error messages
- Error recovery strategies
- Client error boundaries
- Sandbox error handling (graceful degradation when mod fails)

**Performance**
- MongoDB connection pooling
- Message batching
- Memory leak fixes
- Load testing
- **Sandbox overhead benchmarks** (ensure <5ms per call)
- **Isolate memory optimization** (cleanup unused isolates)

**Admin Tools**
- Admin commands
- User management
- Object inspection
- Debug mode
- **Sandbox monitoring dashboard** (view active isolates, resource usage)
- **Mod management commands** (enable/disable mods, reload mods)

**Documentation**
- Complete architecture docs
- Deployment guide (reference AWS Infrastructure section)
- Update CLAUDE.md
- **Sandbox security model documentation**
- **Mod development guide** (with sandbox constraints)

**Deployment Readiness**
- Docker image builds successfully
- AWS infrastructure setup (CodeDeploy, Parameter Store, Secrets Manager)
- CI/CD pipeline configured
- Health check endpoints functional
- **Sandbox resource limits tuned for production** (based on load testing)

### Verification

**General:**
1. ✅ Test coverage >80%
2. ✅ No memory leaks
3. ✅ Performance benchmarks met
4. ✅ Documentation complete
5. ✅ Admin tools functional
6. ✅ Docker image builds and runs
7. ✅ AWS infrastructure documented and ready for setup
8. ✅ CI/CD pipeline configuration ready

**Sandbox Security (Critical for v1.0):**
9. ✅ Isolate pooling working (10 pre-warmed isolates)
10. ✅ Snapshot blobs reduce load time by >50%
11. ✅ Monitoring dashboards show sandbox metrics
12. ✅ Security audit passed (no API escape routes)
13. ✅ Sandbox escape tests all fail (can't access Node.js APIs)
14. ✅ Resource limits prevent DOS (infinite loop test)
15. ✅ Memory limits prevent exhaustion (large allocation test)
16. ✅ Malicious mod can't crash server (exception handling test)
17. ✅ Malicious mod can't access file system (fs test)
18. ✅ Malicious mod can't make network requests (http test)
19. ✅ Sandbox overhead <5ms per call (performance test)
20. ✅ Multiple mods can run concurrently without interference
21. ✅ Mod developer documentation complete with examples

---

# Success Criteria

## MVP Success (End of Phase 5)
1. ✅ Users can sign in with Google OAuth
2. ✅ Character creation is automatic
3. ✅ Players spawn in starting room
4. ✅ Players can use commands (look, say, tell)
5. ✅ Players can communicate
6. ✅ State persists across sessions

## Full Project Success (End of Phase 10 - v1.0 Production Ready)
1. ✅ All 10 phases complete
2. ✅ Core MUD engine domain-agnostic
3. ✅ Mod system works (Content, Capability, and Full mods)
4. ✅ Templates create objects from blueprints
5. ✅ **Code sandboxing operational** (isolated-vm protecting against crashes/exploits)
6. ✅ **Sandbox security verified** (escape tests, resource limits, monitoring)
7. ✅ Test coverage >80%
8. ✅ Documentation complete
9. ✅ Multiple users interact smoothly
10. ✅ Mods swappable
11. ✅ **Production deployment ready** (Docker, AWS, CI/CD)

**v1.0 Critical Requirements (Cannot ship without)**:
- ✅ Code sandboxing (Framework 12) - prevents crashes, infinite loops, memory exhaustion
- ✅ Sandbox security audit passed - no escape routes, all exploit tests fail
- ✅ Resource limits enforced - CPU timeout, memory limits working
- ✅ Monitoring operational - track sandbox metrics, alert on issues

---

# Feeding PLAN.md into Coding Mode

This document is comprehensive (~10,500+ lines) and cannot be loaded entirely in a single context window. Here's the recommended strategy for feeding it into coding sessions.

## Strategy: Phase-by-Phase Implementation

Break the work into separate coding sessions, feeding only the relevant sections per phase.

### Session Template Structure

Each coding session should include:
1. **General Guidelines** (always included)
2. **Relevant Frameworks** (only frameworks needed for that phase)
3. **Current Phase Requirements** (the specific phase being implemented)
4. **File Structure Reference** (from that phase)
5. **Verification Checklist** (from that phase)

## Recommended Session Breakdown

### Session 0: Project Skeleton (Phase 0)
**Feed:**
- General Guidelines (lines 1-300)
- Framework 2: Message Protocol (basic understanding)
- Framework 3: Persistence (basic understanding)
- Phase 0: Project Skeleton (complete section)

**Goal:** Create ironclad skeleton that builds and runs with "Hello World" endpoints.

**Token estimate:** ~3,000-4,000 tokens

---

### Session 1: Core Infrastructure (Phase 1)
**Feed:**
- General Guidelines (reference back if needed)
- Framework 2: Message Protocol (full section)
- Framework 3: Persistence (full section)
- Framework 4: Object Lifecycle (basic understanding)
- Phase 1: Core Infrastructure (complete section)

**Goal:** Auth, sessions, WebSocket, MongoDB, Backend/Application architecture.

**Token estimate:** ~5,000-6,000 tokens

---

### Session 2: Identity Models (Phase 2)
**Feed:**
- Framework 5: Mixin (full section)
- Framework 4: Object Lifecycle (full section)
- Framework 3: Persistence (reference back for sync patterns)
- Phase 2: Identity Models (complete section)

**Goal:** User/Player/GoogleProfile/Interactive/Avatar models, connection lifecycle.

**Token estimate:** ~5,000-6,000 tokens

---

### Session 3: Locations & Basic Look (Phase 3)
**Feed:**
- Framework 5: Mixin (reference for Container/Visible mixins)
- Framework 9: Event System (full section)
- Phase 3: Starting Room (complete section)

**Goal:** Location class, starting room, basic look command, event system setup.

**Token estimate:** ~4,000-5,000 tokens

---

### Session 4: Command Framework (Phase 4)
**Feed:**
- Framework 10: Command (full section - this is ~1,500 lines!)
- Framework 8: MQL (full section)
- Framework 7: API Layer (basic understanding)
- Phase 4: Command Framework (complete section)

**Goal:** Complete command parsing, validation, discovery, and execution system.

**Token estimate:** ~7,000-8,000 tokens (largest session)
**Note:** May need to split into 2 sub-sessions:
  - Session 4a: Core command framework
  - Session 4b: MQL integration and multi-object commands

---

### Session 5: Communications (Phase 5 - MVP Complete!)
**Feed:**
- Framework 1: Markup Language (full section)
- Framework 9: Event System (reference)
- Phase 5: Communications (complete section)

**Goal:** Say/tell commands, Sensor/Vocal mixins, MessageApi, markup rendering.

**Token estimate:** ~4,000-5,000 tokens

**🎉 MVP COMPLETE after this session!**

---

### Session 6: Extended Object Model (Phase 6)
**Feed:**
- Framework 5: Mixin (reference)
- Phase 6: Extended Object Model & Mixins (complete section)

**Goal:** Thing, DetailedMixin, PropertiedMixin, CartesianLocation.

**Token estimate:** ~3,000-4,000 tokens

---

### Session 7: Navigation (Phase 7)
**Feed:**
- Framework 5: Mixin (reference for ExitableMixin)
- Phase 7: Navigation & Exits (complete section)

**Goal:** ExitableMixin, Exit, Door, MultiLocation, Receptacle, navigation commands.

**Token estimate:** ~4,000-5,000 tokens

---

### Session 8: Advanced APIs (Phase 8)
**Feed:**
- Framework 7: API Layer (full section)
- Framework 8: MQL (reference for MqlApi completion)
- Phase 8: Advanced API Layer (complete section)

**Goal:** Complete all utility APIs (GrammarApi, StringApi, TimeApi, etc.).

**Token estimate:** ~3,000-4,000 tokens

---

### Session 9: Templates & Mods (Phase 9)
**Feed:**
- Framework 4: Object Lifecycle (reference for cloning)
- Framework 12: Hot-Reload (full section)
- Phase 9: Templates & Mod System (complete section)

**Goal:** Template system, mod architecture, domain plugins.

**Token estimate:** ~5,000-6,000 tokens

---

### Session 10: Production Readiness (Phase 10)
**Feed:**
- Framework 13: Sandboxing (full section)
- Framework 6: Call Security (full section)
- Framework 11: Prompt Stack (full section)
- Phase 10: Testing & Polish (complete section)

**Goal:** Testing, performance, admin tools, documentation, deployment.

**Token estimate:** ~6,000-7,000 tokens

---

## Alternative Strategy: By System (Not Recommended)

You could also break down by system instead of phase, but this has disadvantages:

**System-Based Sessions:**
- Session A: Identity & Auth (Frameworks 2, 3, 4, Phase 1-2)
- Session B: Object Model (Framework 4, 5, Phase 6)
- Session C: Commands (Framework 10, Phase 4)
- Session D: Communication (Framework 1, 9, Phase 5)
- Session E: Navigation (Phase 7)
- Session F: Templates & Mods (Phase 9)
- Session G: Production (Phase 10)

**Disadvantages:**
- Loses clear phase progression
- Harder to track dependencies
- Less clear "done" milestones

**Advantages:**
- Logical grouping by concern
- Good for parallel development (multiple devs)

## Tips for Effective Coding Sessions

1. **Start Each Session with Context**: Always begin with "We're implementing Phase X of the Saxonberg v2 project. Here's the relevant plan section..."

2. **Reference Previous Work**: When starting a new phase, briefly reference what was built in previous phases to establish continuity.

3. **Verify Before Moving On**: Complete the verification checklist for each phase before moving to the next.

4. **Keep IMPLEMENTATION_GUIDE.md Handy**: Refer to IMPLEMENTATION_GUIDE.md for file structure conventions, testing approach, and error handling patterns.

5. **Update CLAUDE.md After Each Phase**: Document architectural decisions and gotchas as they're discovered.

6. **Use Todo Lists**: Create a todo list at the start of each phase, mark items complete as you go.

7. **Test Incrementally**: Don't wait until phase end to test - verify features as you build them.

8. **Commit Frequently**: Commit after each major feature within a phase (use conventional commits).

## Handling Framework References

When a phase needs a framework that was defined earlier:

**Option 1: Quick Reference**
- Just provide framework name and key API signatures
- Example: "Use EventApi.dispatch() to emit events - see Framework 9 for details"

**Option 2: Inline Reminder**
- Copy just the relevant section of the framework
- Example: Copy EventApi.subscribe() signature when implementing Phase 5

**Option 3: Re-feed Framework**
- If the framework is critical and complex, re-feed its full section
- Example: Re-feed Framework 10 (Command) when implementing advanced commands in Phase 8

## Document Sections Quick Reference

| Section | Line Range (approx) | Token Estimate | When to Feed |
|---------|---------------------|----------------|--------------|
| General Guidelines | 1-1477 | ~3,500 | Every session |
| Framework 1: Markup | 1481-1708 | ~1,500 | Phase 5+ |
| Framework 2: Message | 1710-1751 | ~400 | Phase 1, 5 |
| Framework 3: Persistence | 1753-2350 | ~1,500 | Phase 1, 2 |
| Framework 4: Object Lifecycle | 2352-2934 | ~1,500 | Phase 2, 9 |
| Framework 5: Mixin | 4191-4252 | ~500 | Phase 2, 6, 7 |
| Framework 6: Call Security | 3392-4189 | ~2,000 | Phase 10 |
| Framework 7: API Layer | 4255-4370 | ~400 | Phase 8 |
| Framework 8: MQL | 4373-5650 | ~3,000 | Phase 4, 8 |
| Framework 9: Event System | 5653-6168 | ~1,500 | Phase 3, 5 |
| Framework 10: Command | 6170-7282 | ~3,000 | Phase 4 |
| Framework 11: Prompt Stack | 7284-7873 | ~1,500 | Phase 10 |
| Framework 12: Hot-Reload | 2937-3389 | ~1,200 | Phase 9 |
| Framework 13: Sandboxing | 7877-8416 | ~1,500 | Phase 10 |
| Phase 0: Skeleton | 8418-8599 | ~1,500 | Session 0 |
| Phase 1: Infrastructure | 8601-8888 | ~2,000 | Session 1 |
| Phase 2: Identity | 8890-9184 | ~2,000 | Session 2 |
| Phase 3: Locations | 9186-9301 | ~1,000 | Session 3 |
| Phase 4: Commands | 9303-9654 | ~2,500 | Session 4 |
| Phase 5: Communications | 9656-9858 | ~1,500 | Session 5 |
| Phase 6: Extended Model | 9860-9943 | ~800 | Session 6 |
| Phase 7: Navigation | 9945-10088 | ~1,200 | Session 7 |
| Phase 8: APIs | 10090-10184 | ~800 | Session 8 |
| Phase 9: Templates | 10186-10337 | ~1,200 | Session 9 |
| Phase 10: Production | 10339-10961 | ~2,000 | Session 10 |

**Total document:** ~10,500 lines, ~32,000 tokens (exceeds single context window)

---

# Next Steps

Ready to start Phase 0: Create the ironclad project skeleton!
