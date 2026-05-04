# Audit: PHASE_8_STATE_MODEL.md

**Verdict: heavy rewrite with salvage.** Data-model decisions landed and read
accurately; pipeline mechanics (hook name, hydrator opt-in, ordering) drifted;
the doc is silent on the construction sentinel, Proxy wrapping, call-security,
Shadow subsystem, zone stamping, and `templatePath` — all major Phase-8-era
subsystems that belong in a state-model reference. Keep the model/justification
prose; replace the entire "clone-context extension" and "refactor steps"
sections with current pipeline reality.

## 1. Accurate

- Unified hydration↔persistence model with `MixinApi.getAllPersistentFields`
  as single source of truth (conceptual framing intact).
- Self-contained vs reference-following dichotomy.
- User is NOT a Stuff — extends `Persistable` directly;
  `static persistentFields = ['googleProfileId', 'playerIds']`.
- `User.playerIds: string[]` ownership list (intentional bidirectional-array
  exception).
- `Player` and `CharacterSheet` classes deleted — neither file exists in
  `lib/identity/` (only `User.ts`, `GoogleProfile.ts`).
- `AvatarHydrator` deleted — `obj/` contains only `Avatar.ts`,
  `Interactive.ts`, `Login.ts`.
- Avatar self-contained; `user?: User` is runtime-only, not in
  persistentFields.
- Clone pipeline accepts a `context` parameter threaded through to init.
- Login uses `user.playerIds`; `Interactive.loadAvailableAvatars` iterates
  `this.user.playerIds`.
- Path conventions `/avatar/<playerId>` and `/domain/...`.

## 2. Drifted

- **`initialize(context?)` → `postRegister(context?)`**. The doc's named hook
  does not exist. Real hook lives in `lib/stuff/PostRegistration.ts` as
  `PostRegistrationMixin` with `postRegister(context?)`. Avatar composes it
  (`const AvatarBase = PostRegistrationMixin(Character)`) and overrides
  `postRegister`. The pipeline calls it via `MixinApi.isPostRegistration(proxy)`
  check in `StuffApi.#registerAndInit`.
- **`AvatarInitContext` shape**: doc shows `{ user?: User }`; actual is
  `{ user?: User; playerId?: string }` (`obj/Avatar.ts:28`).
- **Hydrator opt-in semantics**: doc implies "default Hydrator handles it"
  if `hydratorClass` is omitted. Actual: when `hydratorClass` is absent,
  **no hydrator runs at all and `data` is ignored**. Templates wanting field
  copy must opt in with `hydratorClass: '/lib/persistence/PersistentHydrator'`.
- **Pipeline ordering**: doc orders `register → initialize`. Actual order:
  construct → stamp zone → stamp `templatePath` → register (wrapped in Proxy
  via `ProxyApi.wrap`) → hydrate → `postRegister`, all inside an
  `ExecutionContextApi.run` synthetic constructor frame.
- **Refactor step 6** ("`persistentFields: []` at Avatar level"): Avatar
  instead carries runtime fields `playerId`, `interactives`, `user`; no
  `persistentFields` declaration at Avatar level (inherited mixin fields only).

## 3. Gone

- `Avatar.initialize()` — replaced by `postRegister`.
- `Stuff.initialize()` base method — never landed; the hook lives in a
  dedicated mixin (`PostRegistrationMixin`), not on Stuff.
- The phrasing "default Hydrator suffices / no hydratorClass needed" — opt-in
  inverted.

## 4. Missing from doc

- **Construction sentinel system** (`Stuff._beginConstruction` /
  `_endConstruction`, `#expectingConstruction`, stack-walk allowlist) —
  every Stuff must go through `StuffApi`; raw `new` throws.
- **`templatePath` field on Stuff** — stamped by `StuffApi.clone` for
  identity-keyed security policies (`FromTemplate`).
- **`zone` field stamped pre-init** via `ZoneApi.resolveZoneForPath`.
- **Proxy wrapping** of every Stuff via `ProxyApi.wrap` before registry
  insertion.
- **`StuffApi.createSync`** — sync sister to `create`, throws if class
  composes `PostRegistrationMixin`.
- **Call-security framework integration**: `@Final`, `@Unshadowable`,
  `@CallSecurity(ApiOnly)` on `destroy()`/`isDestroyed()`; `StuffApi.destruct`
  is now enforced (not just convention).
- **Shadow subsystem** — `Shadow` class (top-level Stuff branch alongside
  Idea/Agent), `ShadowApi` with `attach`/`detach`/`callDown`/`callBypass`,
  dispatch via AsyncLocalStorage. Lifecycle: privileged shadow detach happens
  in `StuffApi.destruct` between `prepareDestroy` and `destroy`.
- **Synthetic constructor frame** (`ExecutionContextApi.run` with
  `FrameKind.Constructor`) wrapping hydrate + postRegister.
- **Failure-path unregister** on hydrate/postRegister throw.
- **`Hydrator` interface** in `lib/stuff/Hydrator.ts` and standard
  `PersistentHydrator` in `lib/persistence/`.

## 5. Salvage

- §"The unified model" / "Shutdown-save IS inverse hydration" — conceptual
  framing still valid.
- §"User is NOT a Stuff" + §"User owns its list of characters" +
  bidirectional-array justification — accurate and well-argued.
- §"Player class is deleted" / "CharacterSheet class is deleted" / "Avatar is
  self-contained" — valid as historical rationale; trim "design pending"
  framing.
- Path/collection conventions block.
- "Things the refactor MUST NOT regress" list is still a useful invariant
  statement.

## 6. Relevant files

- `packages/server/src/mud/lib/stuff/Stuff.ts`
- `packages/server/src/mud/lib/stuff/Shadow.ts`
- `packages/server/src/mud/lib/stuff/PostRegistration.ts`
- `packages/server/src/mud/lib/stuff/Hydrator.ts`
- `packages/server/src/mud/lib/persistence/PersistentHydrator.ts`
- `packages/server/src/mud/api/stuff.ts`
- `packages/server/src/mud/api/shadow.ts`
- `packages/server/src/mud/lib/identity/User.ts`
- `packages/server/src/mud/obj/Avatar.ts`
- `packages/server/src/mud/obj/Interactive.ts`
