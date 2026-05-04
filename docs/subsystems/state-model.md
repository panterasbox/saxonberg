# State Model

This doc describes the data model for game-world state: how
hydration, persistence, and identity fit together for `Stuff`. The
companion docs cover the mechanism:
[templates.md](./templates.md) for the clone pipeline,
[lifecycle.md](./lifecycle.md) for the create/destroy choreography,
[persistence.md](./persistence.md) for the auth-record track that
deliberately doesn't go through any of this.

## The Unified Model

**Hydration** = CMS template `data` → backing, at clone time.
**Persistence** = backing → CMS template `data`, at destroy/shutdown.
**Reset** = re-hydrate an existing backing back to template defaults.

(Persistence and reset are not implemented yet — see "Not yet implemented"
below.)

These are one mechanism with two directions. Both use
`MixinApi.getAllPersistentFields(backing.constructor)` as the single
source of truth for which fields round-trip. The standard
`PersistentHydrator` walks that list and copies between `data` and the
backing. Any future "persist" implementation will walk the same list in
the opposite direction.

### Shutdown-save IS inverse hydration

Every Stuff at a path serializes back to its own template doc. On
restart, the clone pipeline rehydrates. The template IS the save
state. There is no separate "save state" subsystem, and there will
never be one — the symmetry is the point.

## Two Categories of Stuff

- **Self-contained**: state lives at one path, in one doc. Hydrate ↔
  persist are perfectly symmetric over the same field set. Rooms,
  doors, props, most NPCs, **and avatars**. The standard
  `PersistentHydrator` handles them.

- **Reference-following** (rare): hydration traverses pointers to other
  Stuff first, then assembles state. The avatar was originally assumed
  to be one of these (with separate `Player` and `CharacterSheet`
  records); the unified model collapsed that complexity. Avatar is now
  self-contained.

Reference-following Stuff — if any survive — gets a custom `Hydrator`
subclass. See [templates.md § The Hydrator Contract](./templates.md#the-hydrator-contract)
for that escape hatch.

## The Data Model

### User is NOT a Stuff

User is **meta-game**, not game-world. It's auth-layer: identity,
authentication, session context. It doesn't live in a zone, doesn't
have a path, doesn't get cloned, doesn't hydrate, doesn't participate
in the Stuff filesystem.

User extends `Persistable` directly (not `Idea`, not `Stuff`). It's
the rare exception to "everything's a Stuff." Looked up by `_id` or
`googleProfileId`. See [persistence.md](./persistence.md) for the
`Persistable` track in detail.

### User owns its list of characters

```typescript
class User extends Persistable {
  static collectionName = 'users';
  static persistentFields = ['googleProfileId', 'playerIds'];
  googleProfileId: string = '';
  playerIds: string[] = [];
}
```

This intentionally violates the general "avoid bidirectional arrays"
guideline, because the cost factors that guideline targets don't apply:

- The list is **bounded** (a user owns ~1–10 characters).
- It's **low-churn** (mutates only on character create/delete).
- The authoritative answer to "which characters does this user own?"
  belongs on User. Scanning the avatar collection for ownership would
  be semantically backwards.

Character creation appends to `user.playerIds` and writes the avatar
template. Character deletion removes the id and deletes the template.
Two writes on rare events; not atomic, acceptable.

### No Player class

`Player` was a join row with two fields (`userId`, `characterSheetId`).
Under the unified model it earned no keep — its state was entirely
pointers to other records. Its responsibilities dissolve into:

- "Which characters does this user own?" → `user.playerIds`
- Character state → Avatar's own template doc

The id is **still called `playerId`**. It represents "one of a user's
owned character slots" — that meaning survives the class's death.
Paths use `/avatar/<playerId>`.

### No CharacterSheet class

`CharacterSheet` existed to hold persistent character state across
clones. Under the unified model, Avatar's own template doc at
`/avatar/<playerId>` holds that state directly. The sheet would be
indirection for a problem the unified model already solves.

### Avatar is self-contained

Avatar's template doc carries every mixin-declared persistent field as
`data`. No pointers to Player, no pointers to Sheet. The standard
`PersistentHydrator` fully populates the avatar at clone time:

```js
{
  path: "/avatar/<playerId>",
  class: "/obj/Avatar",
  hydratorClass: "/lib/persistence/PersistentHydrator",
  data: {
    name, surname, honorific, nameSuffix, alternateNames, fullName,
    pronouns,
    shortDescription, longDescription,
    keywords,
    // …every mixin-declared persistent field
  }
}
```

Runtime-only pointers (`user`, `interactives`) are NOT in
`persistentFields`. They're stamped from the clone context (`user`) or
established as connections come and go (`interactives`).

## The Clone Pipeline (Brief)

Full pipeline is in [templates.md § The Clone Pipeline](./templates.md#the-clone-pipeline).
The state-relevant ordering:

1. Construct (sentinel-gated).
2. Stamp `zone` (from `ZoneApi.resolveZoneForPath`).
3. Stamp `templatePath`.
4. Wrap in Proxy.
5. **Register** in `StuffApi.objectsById`.
6. **Hydrate** if `hydratorClass` is named — `target[field] = data[field]`
   for every key in `MixinApi.getAllPersistentFields(constructor)`.
7. **`postRegister(context)`** if the backing composes
   `PostRegistrationMixin`.

Register-before-hydrate is load-bearing: the in-flight object must be
resolvable by `stuffId` so that hydrators with self-references find it.

If hydrate or `postRegister` throws, the object is unregistered before
the error propagates.

## The Context Bag

`StuffApi.clone(path, context?)` accepts an opaque `context` bag for
runtime-only state that can't come from the template — typically
references to other runtime objects.

Avatar is the canonical example:

```typescript
// Avatar.ts
export interface AvatarInitContext {
  user?: User;
  playerId?: string;
}

class Avatar extends AvatarBase {
  user?: User;        // runtime-only, set in postRegister
  playerId: string = '';

  override async postRegister(context?: AvatarInitContext): Promise<void> {
    if (context?.user) this.user = context.user;
    if (context?.playerId) this.playerId = context.playerId;
    if (this.playerId) PlayerApi.registerAvatar(this);
  }
}

// Login flow:
const avatar = await StuffApi.clone<Avatar>(
  Avatar.getTemplatePath(playerId),
  { user, playerId }
);
```

`avatar.user` is re-established every login from the context. It is
NOT in `persistentFields` — User isn't part of Avatar's persistent
state (ownership lives on `User.playerIds`).

The context is `unknown` at the API surface. Subclasses narrow it to
their concrete type locally rather than threading a generic through
`StuffApi.clone`.

## Paths and Collections

Single `domain` collection, path-namespaced:

- `/avatar/<playerId>` — user-owned character templates + save state
- `/domain/...` — content (rooms, doors, props, NPCs)
- `/system/...` — system fixtures (e.g. hooks at `/system/hooks/...`)

Folder/leaf invariant on `domain`: Zone templates may have descendants;
non-Zone templates may not. Enforced by `DomainHook` against the PM
chokepoint. See [templates.md § TemplateApi & the Folder/Leaf Invariant](./templates.md#templateapi--the-folderleaf-invariant).

`users` and `google_profiles` stay as their own collections — they're
not Stuff.

## Stamped-on-Stuff Fields

Every Stuff carries:

- **`stuffId: string`** — runtime ID, generated in the base
  constructor.
- **`templatePath: string | null`** — the clone path, or `null` for
  `create`/`createSync`. Used by identity-keyed security policies
  (`FromTemplate`).
- **`zone: Zone | null`** — universal subdivision. Stamped at clone
  time from the nearest-ancestor Zone template, or on first placement
  via `ContainmentApi.move()`. Runtime-only for now: Zone references
  are not auto-persisted (mirrors how `inventory`/`environment` work —
  the authoritative source for zone membership is the `domain`
  template path at clone time).

These are stamped by `StuffApi.clone`, not declared on subclasses. They
exist on every Stuff regardless of mixins.

## Things the Model MUST NOT Regress

- **Multiplexing**: multiple Interactives can connect to the same
  Avatar.
- **Character selection**: multi-character flow is structurally
  supported via `user.playerIds`.
- **PlayerApi registration**: still happens, just from `postRegister`
  now (`PlayerApi.registerAvatar(this)`).
- **Avatar destroy/cleanup**: still unregisters with `PlayerApi`, still
  drops all `interactives`.
- **Auth flow**: Google OAuth → User/GoogleProfile find-or-create
  unchanged. The only diff is "Player creation" → "Avatar template
  creation".
- **Hydrator opt-in**: `hydratorClass` is opt-in. Templates that omit
  it skip hydration entirely.

## Not Yet Implemented

- **Persist direction** (shutdown-save, world serialization). The
  unified model anticipates it — every Stuff at a path serializes back
  to its own doc using the same `getAllPersistentFields` walk in
  reverse — but it's not built yet. Today, persistent state is set
  once at clone time and lost when the runtime exits. This is fine for
  the current MVP scope (worlds rebuild on restart from templates) and
  problematic for any "save my game" semantics.
- **Reset** — re-hydrate an existing backing back to template
  defaults. Not built; the unified model leaves room.
- **`/state/`** as a separate path namespace from `/domain/` — implement
  if/when the distinction becomes load-bearing (probably alongside
  persist).

## Cross-References

- [templates.md](./templates.md) — clone pipeline, `Hydrator` contract,
  `PostRegistrationMixin`, `TemplateApi`, folder/leaf invariant
- [lifecycle.md](./lifecycle.md) — construction sentinel, ProxyApi
  wrap, synthetic constructor frame, destruct → prepareDestroy →
  shadow detach → destroy → unregister
- [persistence.md](./persistence.md) — the `Persistable` track for
  auth/meta records (User, GoogleProfile); around-save/delete hooks
- [call-security.md](./call-security.md) — `templatePath` stamping
  feeds `FromTemplate` policies; `Stuff.destroy` decorator stack
- [antipatterns.md § Per-Field Invariants](../antipatterns.md#per-field-invariants-belong-on-setters-not-in-normalize-hooks)
  — setter-based invariants that hydration rides on
