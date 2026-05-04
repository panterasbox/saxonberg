# Phase 8: State Model — Final Design

> **Status**: design settled, implementation pending. Supersedes all prior
> drafts. This doc captures the final decisions from the design
> conversation and the concrete refactor steps. If you're a fresh agent
> picking this up, everything below is ground truth — don't re-litigate
> the architectural decisions without explicit user request.

## The unified model

**Hydration = CMS data → backing, at clone time.**
**Persistence = backing → CMS data, at destroy/shutdown.**
**Reset = re-hydrate an existing backing back to template defaults.** (Not
implemented this phase but API should leave room.)

Hydration and persistence are one mechanism with two directions. Both
use `MixinApi.getAllPersistentFields(backing.constructor)` as the
single source of truth for which fields round-trip. Default
implementations of each operation walk that list and copy between
`data` and the backing.

### Shutdown-save IS inverse hydration

Every Stuff at a path serializes back to its own doc. On restart, the
clone pipeline rehydrates. The template IS the save state. No
separate "save-state" subsystem.

### Two categories of Stuff

- **Self-contained**: state lives at one path, in one doc. Hydrate ↔
  Persist are perfectly symmetric over the same field set. Rooms,
  doors, props, most NPCs. Default `Hydrator` handles them.

- **Reference-following** (rare): hydration traverses pointers to
  other Stuff first, then assembles state. We thought Avatar was one
  of these. **It is not, under the final design.** The unified model
  collapsed that complexity.

## The final data model

### User is NOT a Stuff

User is **meta-game**, not game-world. It's auth-layer: identity,
authentication, session context. It doesn't live in a zone, doesn't
have a path, doesn't get cloned, doesn't hydrate, doesn't participate
in the Stuff filesystem.

User extends `Persistable` directly (not `Idea`, not `Stuff`). It's
the rare exception to "everything's a Stuff." Its natural key is
`googleProfileId`; it's looked up by `_id` or `googleProfileId`.

### User owns its list of characters

```ts
class User extends Persistable {
  static collectionName = 'users';
  static persistentFields = ['googleProfileId', 'playerIds'];
  googleProfileId = '';
  playerIds: string[] = [];
}
```

**This intentionally violates the general "avoid bidirectional arrays"
guideline** because the cost factors that guideline targets don't
apply: the list is bounded (a user owns ~1–10 characters), low-churn
(mutates only on character create/delete), and the authoritative
"which characters does this user own?" answer belongs on User.
Scanning the avatar collection for ownership would be semantically
backwards.

Character creation appends to `user.playerIds` and writes the avatar
template. Character deletion removes the id and deletes the template.
Two writes on rare events; not atomic, acceptable.

### Player class is deleted

`Player` was a join row with two fields (`userId`, `characterSheetId`).
Under the unified model it earns no keep — its state is entirely
pointers to other records. Its responsibilities dissolve into:

- User ownership lookup → `user.playerIds`
- Character state → Avatar's own template doc

**Note on naming**: even though the Player class is gone, the id is
still called `playerId`. It represents "one of a user's owned
character slots." That meaning survives the class's death. Paths use
`/avatar/<playerId>`.

### CharacterSheet class is deleted

`CharacterSheet` existed to hold persistent character state across
clones. Under the unified model, Avatar's own template doc at
`/avatar/<playerId>` holds that state directly. The sheet becomes
indirection for a problem the unified model already solves.

### Avatar is self-contained

Avatar's template doc carries all mixin-declared persistent state as
`data`. No pointers to Player, no pointers to Sheet. Default `Hydrator`
fully populates the avatar at clone time.

Template shape:

```js
{
  path: "/avatar/<playerId>",
  class: "/obj/Avatar",
  // no hydratorClass — default Hydrator suffices
  data: {
    firstName, lastName, pronouns,
    shortDescription, longDescription,
    // …every mixin-declared persistent field
  }
}
```

### AvatarHydrator is deleted

Default `Hydrator` handles it. Any post-hydrate wiring (service
registration, runtime user reference) happens in `Avatar.initialize`.

## The clone-context extension

Avatar needs its User reference **at init time**, not after — for
multiplexing, service registration, and any user-scoped setup in
`initialize`. Login loads the User first, then clones the avatar.

**Solution**: extend the clone pipeline to accept a generic context
parameter that gets threaded into `initialize`:

```ts
// StuffApi
static async clone<T extends Stuff>(
  path: string,
  context?: unknown
): Promise<T> { … }

// Stuff (or wherever initialize lives)
async initialize(context?: unknown): Promise<void> { … }
```

Objects that don't care ignore it. Objects that do declare a narrower
context type locally. Avatar:

```ts
interface AvatarInitContext {
  user?: User;
}

class Avatar extends Character {
  user?: User;  // runtime-only reference

  async initialize(context?: AvatarInitContext): Promise<void> {
    if (context?.user) this.user = context.user;
    PlayerApi.registerAvatar(this);
  }
}
```

Login calls:

```ts
const avatar = await StuffApi.clone<Avatar>(
  `/avatar/${playerId}`,
  { user }
);
```

**Critical property**: the user reference is set inside `initialize`,
synchronously-available for the rest of initialization (PlayerApi
registration, anything else). No window of "avatar without user."

`avatar.user` is a runtime-only pointer. It's re-established every
login via the context stamp. It's NOT in `persistentFields` — User
isn't part of Avatar's persistent state (ownership lives on
User.playerIds, not on Avatar).

## Paths and collections

Single collection, path-namespaced:

- `/avatar/<playerId>` — user-owned character templates + save state
- `/domain/...` — content (rooms, doors, props, NPCs)
- `/state/...` — runtime-save-only docs, if any

`users`, `google_profiles` stay as their own collections (they're not
Stuff).

Paths that need query performance get their doc-level fields indexed
(e.g., `path` always, maybe `class` for class-scoped queries). No
denormalized `ownerUserId` on avatar docs — ownership lookup goes
through `user.playerIds`.

## Refactor steps

Order matters — steps build on each other.

### 1. Clone pipeline accepts context

- `src/mud/api/stuff.ts` — `clone<T>(path, context?)` signature.
  Thread `context` into the `initialize(context)` call.
- `src/mud/lib/stuff/Stuff.ts` — if there's an `initialize` base
  signature, extend it to accept `context?: unknown`.

### 2. User becomes pure Persistable

- `src/mud/lib/identity/User.ts` — extend `Persistable` directly.
  Remove any `Idea`/`Stuff` inheritance. Add `playerIds: string[]`
  to `persistentFields` and the class. Keep `googleProfileId`.
- Update any code that treated User as a Stuff (register/unregister
  calls, zone references). There shouldn't be much; User was barely
  used as a Stuff.

### 3. Delete Player

- Delete `src/mud/lib/identity/Player.ts`.
- Delete `players` collection usage.
- `src/backend/Application.ts` — `createDefaultPlayer` becomes
  `createDefaultAvatarTemplate`: writes the avatar template with full
  data and appends the id to `user.playerIds`.

### 4. Delete CharacterSheet

- Delete `src/mud/lib/identity/CharacterSheet.ts`.
- Delete `character_sheets` collection usage.
- Character state moves into avatar template `data` at creation time.

### 5. Delete AvatarHydrator

- Delete `src/mud/obj/AvatarHydrator.ts`.
- `src/backend/Application.ts` — `createAvatarTemplate` stops writing
  `hydratorClass` in the doc (default Hydrator is used).

### 6. Avatar shed its pointer fields

- `src/mud/obj/Avatar.ts` — remove `playerId`, `userId`, `player`,
  `sheet` fields. Add `user?: User` runtime-only reference.
- `persistentFields`: empty at the Avatar level (all mixin fields
  come from `Character` mixins). Or just `[]` to be explicit.
- `initialize(context?: AvatarInitContext)` stamps `this.user` and
  registers with PlayerApi.
- `prepareDestroy` unchanged conceptually; remove sheet-save logic
  since there's no sheet (persist-back lives at the pipeline level
  later; out of scope for this refactor unless we want to nail it
  down now).

### 7. Login uses user.playerIds

- `src/mud/obj/Login.ts` — read `user.playerIds` instead of querying
  Players. Pass `{ user }` as context to `StuffApi.clone`.
- `src/mud/obj/Interactive.ts` — any avatar-loading code follows the
  same pattern; pass user context through to clone.

### 8. Tests

- Delete Player, CharacterSheet tests.
- Update Avatar tests (no more playerId/userId direct fields; user
  comes from init context).
- Update Application tests (user creation flow doesn't make Player).
- Update Login/Interactive tests (avatar list from user.playerIds).
- Add: clone-with-context test (context threads into initialize).

## What's NOT in this refactor

- **Persist direction** (shutdown-save, world serialization): additive
  follow-on. The unified model anticipates it but doesn't require
  implementing it now.
- **Invariant enforcement in mixin setters**: separate sweep. Leave
  normalize-at-initialize hooks alone for this refactor.
- **Door dual ctor**: cosmetic. Leave it.
- **Reset operation**: not needed yet.

## Files likely touched

- `src/mud/lib/identity/User.ts` — change base class, add playerIds
- `src/mud/lib/identity/Player.ts` — **delete**
- `src/mud/lib/identity/CharacterSheet.ts` — **delete**
- `src/mud/obj/Avatar.ts` — remove pointer fields, add user ref,
  restructure initialize
- `src/mud/obj/AvatarHydrator.ts` — **delete**
- `src/mud/api/stuff.ts` — clone gains context param
- `src/mud/lib/stuff/Stuff.ts` — initialize gains context param
- `src/mud/obj/Login.ts` — use user.playerIds + clone context
- `src/mud/obj/Interactive.ts` — avatar-load path
- `src/backend/Application.ts` — user/avatar creation flow
- Various test files

## Things the refactor MUST NOT regress

- Multiplexing: multiple Interactives per Avatar still works.
- Character selection: multi-character flow (for future) remains
  structurally supported via `user.playerIds`.
- PlayerApi registration: still happens, just from `initialize` now.
- Avatar destroy/cleanup: still unregisters, still removes
  interactives.
- Auth flow: Google OAuth → User/GoogleProfile find-or-create
  unchanged except Player creation → Avatar template creation.

## Open questions explicitly deferred

- Persist direction implementation — later phase.
- Invariant-in-setters sweep — later phase.
- `/state/` vs `/domain/` path conventions — implement when the
  distinction becomes load-bearing (probably when persist ships).
