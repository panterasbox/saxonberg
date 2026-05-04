# Audit: PERSISTENT_PATTERN.md

**Verdict: rewrite from scratch.** Wrong class name, wrong inheritance model,
missing Hydrator/around-hook subsystems, fictional features
(`persistenceHandlers`), and stale Avatar↔Player narrative. Salvageable content
amounts to four short rationale paragraphs.

## 1. Accurate

- The base class still exists and provides `save()`, `delete()`, `findById()`,
  `find()`, `toDocument()`, `fromDocument()`, with auto-managed
  `createdAt`/`updatedAt` and `_id` (`Persistable.ts:51-207`).
- Subclass contract still requires `static collectionName` and
  `static persistentFields` (`Persistable.ts:70`, throws if missing).
- Still aggregates fields via `MixinApi.getAllPersistentFields(constructor)`
  walking the prototype chain (`mixin.ts:158-168`).
- Mixins still declare `static persistentFields = [...]` (e.g., `Named.ts:81`,
  `Gendered.ts:37`).
- `delete()` no longer calls `destroy()` — but the doc actually shows that
  already-incorrect behavior; the current implementation just deletes the doc.

## 2. Drifted

- **Class name**: `Persistent` → `Persistable`. Every `extends Persistent` /
  `class Persistent` in the doc is wrong (`Persistable.ts:51`).
- **Scope narrowed**: `Persistable` is now explicitly **NOT** part of the
  Stuff hierarchy. It's for auth/meta records only (`User`, `GoogleProfile`).
  Game-world objects (rooms, avatars, NPCs) go through the
  **clone/hydrate/save-template pipeline** instead — a fundamentally
  different model the doc never mentions.
- **PersistentBase / mixin composition pattern**
  (`GenderedMixin(NamedMixin(PersistentBase))`) doesn't exist. There is no
  `PersistentBase`. Mixins compose onto `Stuff`, not `Persistable`. The
  `Player` example using mixin-on-Persistent is fictional in the current code.
- **`static getAllPersistentFields()` override** is no longer required on
  subclasses — `Persistable.getAllFields()` calls
  `MixinApi.getAllPersistentFields()` automatically
  (`Persistable.ts:94-102`); the manual override is just an optional escape
  hatch.
- **Avatar↔Player sync**: Player class no longer exists. Avatar is now
  self-contained under a "unified state model" — the template at
  `/avatar/<playerId>` carries every persistent field directly, no
  Player/CharacterSheet indirection (`Avatar.ts:1-11`).
  `syncToPlayer`/`syncFromPlayer`/`PersistApi` are gone (lingering comments
  in mixins are stale).

## 3. Gone

- `static persistenceHandlers = { fieldName: { to, from } }` — no such
  mechanism in `Persistable.ts`. The "Advanced: Custom Persistence Handlers"
  section is fiction.
- `Persistent` / `PersistentBase` names.
- Player class, `syncToPlayer`/`syncFromPlayer`, `PersistApi`.
- The `delete() → destroy()` chain.

## 4. Missing from doc

- **`Hydrator` interface** (`Hydrator.ts`) and **`PersistentHydrator`**
  (`PersistentHydrator.ts`) — the entire template-data → live-state mechanism
  for Stuff. `hydratorClass` is opt-in; absent → no hydration; standard impl
  is `'/lib/persistence/PersistentHydrator'`.
- **Bracket-assign-invokes-setters contract**: per-field invariants belong on
  setters; hydrator routes through them. Cross-field invariants → custom
  Hydrator subclass.
- **AroundSaveHookMixin / AroundDeleteHookMixin** middleware-style hooks
  composed onto `Idea` subclasses, registered via `hooks.yaml` manifest,
  dispatched by `PersistenceManager` with re-entry detection
  (`HookReentryError`).
- **`PersistenceManager.registerHook()` / `loadHooks()` / `Collections` enum
  / `dispatchSave`/`dispatchDelete` chain**.
- **The two-track persistence model**: `Persistable` (MongoDB records, no
  Stuff identity) vs. Stuff clone/hydrate/save-template pipeline (game-world
  objects). This dichotomy is the load-bearing fact a current reader needs.

## 5. Salvage

Almost nothing structural. The "Why static collectionName / Why explicit
persistentFields / Why not decorators / Why not auto-register" rationales
(sections under "Key Design Decisions") still describe the actual
`Persistable` design and could be lifted near-verbatim. The maskProp
breaking-change note (lines 410-433) is a `PropertiedMixin` topic, not
persistence — move it elsewhere or drop.

## 6. Relevant files

- `packages/server/src/mud/lib/stuff/Persistable.ts`
- `packages/server/src/mud/lib/stuff/Hydrator.ts`
- `packages/server/src/mud/lib/persistence/PersistentHydrator.ts`
- `packages/server/src/mud/lib/persistence/AroundSaveHook.ts`
- `packages/server/src/mud/lib/persistence/AroundDeleteHook.ts`
- `packages/server/src/backend/PersistenceManager.ts`
- `packages/server/src/mud/api/mixin.ts`
- `packages/server/src/mud/lib/identity/User.ts`
- `packages/server/src/mud/lib/identity/GoogleProfile.ts`
- `packages/server/src/mud/obj/Avatar.ts`
- `packages/server/src/mud/obj/hooks/DomainHook.ts`
- `packages/server/src/mud/obj/hooks/hooks.yaml` (if it exists at this path)
