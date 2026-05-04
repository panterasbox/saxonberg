# CMS Template Pattern

This document explains the CMS-based template system for creating game objects in Saxonberg.

## Overview

All game objects are created by "cloning" templates stored in a MongoDB collection called 'domain'. Templates define:
- The path to the template (e.g., `/avatar/player/abc`, `/home/bobalu/workroom`)
- The class to instantiate (e.g., `/obj/Avatar` relative to `/mud/`)
- Initialization data specific to that template

## Domain Collection Structure

Templates are stored in the `domain` collection:

```typescript
{
  _id: "some-mongo-id",
  path: "/avatar/player/abc",  // Unique template path
  class: "/obj/Avatar",         // Class path relative to /mud/
  data: {                       // Template-specific data
    playerId: "player-mongo-id" // For Avatar: reference to Player
  }
}
```

### Example Templates

**Avatar Template**:
```json
{
  "path": "/avatar/player/abc123",
  "class": "/obj/Avatar",
  "data": {
    "playerId": "507f1f77bcf86cd799439011"
  }
}
```

**Room Template** (future):
```json
{
  "path": "/home/bobalu/workroom",
  "class": "/obj/Room",
  "data": {
    "title": "Bob's Workroom",
    "description": "A cozy room filled with books and strange contraptions.",
    "exits": {
      "north": "/home/bobalu/kitchen",
      "south": "/common/hallway"
    }
  }
}
```

## Creating Objects

### 1. Clone from Template (Primary Method)

```typescript
// Clone an avatar
const avatar = await StuffApi.clone<Avatar>('/avatar/player/abc');
// avatar is fully initialized and registered

// Clone a room (future)
const room = await StuffApi.clone<Room>('/home/bobalu/workroom');
```

**What happens**:
1. Loads template from 'domain' collection by path
2. Validates class path (security check)
3. Dynamically imports the class module
4. Instantiates class with template.data
5. Calls async initialize() method if it exists
6. Registers object with StuffApi
7. Returns the instance

### 2. Direct Creation (Fallback/Testing)

For testing or special cases where templates don't exist yet:

```typescript
const avatar = StuffApi.create(() => new Avatar({ playerId: "..." }));
await avatar.initialize(); // Must call initialize manually
```

## Dynamic Class Loading

Classes are loaded automatically via dynamic imports - **no registration required**.

**How it works**:
```typescript
// Template says: class: "/obj/Avatar"
// StuffApi.clone() does:
const modulePath = "../obj/Avatar.js";  // Convert to relative path
const module = await import(modulePath); // Dynamic import
const Avatar = module.Avatar;           // Get exported class
const instance = new Avatar(templateData);
```

**Security validation**:
- Path must start with `/`
- No directory traversal (`..` not allowed)
- Must resolve under `/obj/` or `/lib/` (no other roots are accepted)
- Class name extracted from path must exist as named export

**Benefits**:
- ✅ No manual registration boilerplate
- ✅ Classes automatically available when added
- ✅ Secure (validated paths only)
- ✅ Simple (just export your class)

## Implementing Cloneable Classes

### Constructor Pattern

Classes accept template data in their constructor:

```typescript
export interface AvatarTemplateData {
  playerId: string;
}

export class Avatar extends AvatarBase {
  constructor(templateData: AvatarTemplateData | Record<string, unknown>) {
    super(); // Generates stuffId

    const data = templateData as AvatarTemplateData;
    this.playerId = data.playerId || '';
  }
}
```

### Async Initialization

If the class needs to load data from database or perform async setup:

```typescript
public async initialize(): Promise<void> {
  // Load Player from database
  const playerDoc = await PersistenceManager.get().findById(
    Collections.Players,
    this.playerId
  );

  // Initialize from loaded data
  const player = new Player();
  // ... populate player
  this.syncFromPlayer(player);
}
```

**Note**: StuffApi.clone() automatically calls initialize() if it exists.

## Template Data Design

### General Principles

1. **Store references, not copies**: Template stores playerId, not player data
2. **Player references User**: playerId → Player → userId (no need to store userId in template)
3. **Minimal data**: Only store what's needed to initialize the object
4. **Load related data in initialize()**: Async loading of referenced documents

### Avatar Example

**Template stores**:
```typescript
{
  playerId: "507f1f77bcf86cd799439011"
}
```

**Not**:
```typescript
{
  playerId: "...",
  userId: "...",        // ❌ Redundant (Player has userId)
  firstName: "...",     // ❌ Wrong layer (comes from Player)
  lastName: "..."       // ❌ Wrong layer (comes from Player)
}
```

**Why**: Player is the source of truth. Avatar syncs from Player during initialize().

## Creation Flow for Avatar

1. **Template Creation** (automatic when Player is created):
   ```typescript
   // In Application.findOrCreateUserFromGoogle() - when creating new Player:
   const playerId = await PersistenceManager.get().save(Collections.Players, newPlayer);

   // Create avatar template
   const avatarTemplate = {
     path: Avatar.getTemplatePath(playerId), // "/avatar/player/<playerId>"
     class: '/obj/Avatar',
     data: { playerId },
   };
   await PersistenceManager.get().save(Collections.Domain, avatarTemplate);
   ```

2. **Clone Avatar** (on user connect):
   ```typescript
   // In Application.handleUserConnect():
   const avatarPath = Avatar.getTemplatePath(playerDoc._id);
   const avatar = await StuffApi.clone<Avatar>(avatarPath);
   // avatar.initialize() was called automatically
   // avatar is synced from Player
   // avatar is registered with StuffApi
   ```

3. **Use Avatar**:
   ```typescript
   // Multiplexing-aware API (preferred):
   avatar.addInteractive(interactive);      // Avatar tracks Set<Interactive>
   interactive.switchAvatar(avatar.playerId); // Interactive points at current Avatar
   // Avatar is now active in game world and will broadcast onMessage() to
   // every connected Interactive.
   ```

   The legacy single-link helpers (`setInteractive()` / `linkAvatar()`)
   still work for backward compatibility but funnel through the same
   `Set<Interactive>` — prefer the multiplexing API in new code.

## Avatar Template Path Convention

Avatar templates follow a consistent path structure:
- **Pattern**: `/avatar/player/<playerId>`
- **Constant**: `Avatar.TEMPLATE_PATH_PREFIX = '/avatar/player/'`
- **Helper**: `Avatar.getTemplatePath(playerId)` constructs the full path

**Example**:
```typescript
const playerId = "507f1f77bcf86cd799439011";
const path = Avatar.getTemplatePath(playerId);
// Returns: "/avatar/player/507f1f77bcf86cd799439011"
```

## Future: Room/Location Templates

When locations are implemented, they'll work the same way:

```typescript
// Template in domain collection
{
  path: "/home/bobalu/workroom",
  class: "/obj/Room",
  data: {
    title: "Bob's Workroom",
    description: "...",
    exits: { north: "/home/bobalu/kitchen" }
  }
}

// Clone room
const room = await StuffApi.clone<Room>('/home/bobalu/workroom');
```

## Presentation Defaults

Cloned objects inherit the project's standard presentation layer
(`DescribeApi.getDisplayName()`) automatically — no per-template code is
needed for names. If a template composes `NamedMixin` or `VisibleMixin`,
those fields are picked up by `DescribeApi` at render time. See
[ANTIPATTERNS.md](./ANTIPATTERNS.md#display-names--use-describeapi) for
the rule against ad-hoc name-fallback helpers.

## Benefits of Template Pattern

1. **Separation of Concerns**: Template data is separate from code
2. **CMS Integration**: Templates can be edited by world builders
3. **Consistent Creation**: All objects created through same pattern
4. **Lazy Loading**: Objects created only when needed
5. **Reference Integrity**: Templates store IDs, not duplicate data
6. **Async-Safe**: initialize() handles database loading properly

## Current Status

**Implemented**:
- ✅ Domain collection enum
- ✅ DomainTemplate interface
- ✅ StuffApi.clone() with dynamic imports
- ✅ Class path validation (security)
- ✅ Avatar accepts template data
- ✅ Avatar.initialize() loads Player and syncs
- ✅ Automatic class loading (no registration needed)

**In Use**:
- ✅ Avatar templates automatically created when Player is created
- ✅ Application.handleUserConnect() uses StuffApi.clone() to create avatars
- ✅ Avatar.getTemplatePath() helper for consistent path construction

**Future**:
- Multiple domain collections (e.g., 'domain', 'admin', 'user_content')
- Template validation
- Template versioning
- Bulk template loading
- Room/Location templates
- NPC templates
- Item templates
- Template editor/CMS UI
