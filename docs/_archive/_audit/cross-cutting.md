# Audit: ARCHITECTURE_PATTERNS, IMPLEMENTATION_GUIDE, CONSISTENCY_REVIEW, ANTIPATTERNS

These four docs feed `docs/architecture.md` (cross-cutting) and
`docs/antipatterns.md` (lookup-style). Subsystem-specific content gets
migrated to subsystem docs.

---

## 1. ARCHITECTURE_PATTERNS.md

**Verdict: heavy rewrite.** Naming/layering principles still hold; many
concrete examples are stale; subsystem chunks should split out.

**Accurate**
- Manager vs Api distinction (privileged singleton vs static utility) —
  `ConnectionManager`/`ConnectionApi` and `PersistenceManager` still match
  the described pattern (`packages/server/src/backend/ConnectionManager.ts`,
  `mud/api/connection.ts`).
- Backend = I/O only (no DB delegation) — confirmed in `Backend.ts`.
- Class hierarchy `Stuff → Idea → ...`, `Stuff → Agent → Avatar` correct.
- `Mixins` constants pattern + new mixin checklist — matches
  `lib/mixin-types.ts`.
- CMS template clone flow + `prepareDestroy()` hook — matches `StuffApi`
  (`mud/api/stuff.ts:158, 441`).

**Drifted**
- Lines 369-371: `avatar.setInteractive()` / `interactive.linkAvatar()` —
  actual API is `addInteractive()` / `switchAvatar()` (Avatar.ts:95,
  Interactive.ts:76). The "legacy bidirectional link" example is gone.
- "Avatar lives in `/mud/obj/` not `/mud/lib/`" still true; but
  `firstName/lastName` are gone — `NamedMixin` now exposes `name`,
  `surname`, `nameSuffix`, `honorific`, `fullName` (per CLAUDE.md and
  recent commits).
- `Mixins` table at line 506 lists only `Named` and `Gendered` — registry
  now has 19 entries.
- Lines 387-392 manual `PersistenceManager.save({...player})` —
  `syncToPlayer()`/`syncFromPlayer()` no longer exist in code (no hits
  anywhere). The Avatar↔Player sync model has changed.

**Gone**
- `PersistApi` is referenced in mixin doc-comments only; no `PersistApi`
  class exists in `mud/api/`. The "PersistApi sync utilities" row in the
  responsibility matrix is stale.
- `setInteractive`/`linkAvatar` legacy API.
- `syncToPlayer`/`syncFromPlayer` methods.

**Subsystem-specific content (migrate)**
- Connection lifecycle / Avatar↔Interactive↔Player diagram (lines 309-376)
  → `state-model.md` or `lifecycle.md`.
- Protected destruction pattern (lines 250-307) → `lifecycle.md`.
- CMS template clone flow (lines 184-248) → `templates.md`.
- Synchronization (lines 378-392) → `persistence.md` (and rewrite — current
  API is gone).
- "Call Security (Future)" (lines 80-86) → `call-security.md`; it's now
  real (decorators, SecurityApi, ProxyApi, ShadowApi).

**Cross-cutting content (keep in `architecture.md`)**
- Manager vs Api naming, layer separation (lines 1-160), Responsibility
  Matrix, "When to create a new Manager vs Api" (lines 523-538), Key
  Principles (lines 452-460), Mixin Constants section.

---

## 2. IMPLEMENTATION_GUIDE.md

**Verdict: heavy rewrite.** The "feed PLAN.md" sections and phase order are
obsolete; the file tree needs to be regenerated; the conventions/gotchas
are worth preserving in `architecture.md`.

**Accurate**
- Server file structure tree (lines 121-214) is mostly accurate; subsystem
  layout under `mud/lib/` matches.
- Mixin naming conventions (drop `Mixin` from filename, colocated
  public-shape interface, generics for base constraints) — matches CLAUDE.md
  and code.
- Test colocation convention (lines 277-309) — confirmed:
  `lib/spatial/Container.test.ts`, etc., do exist alongside sources.
- "Common Gotchas" appendix matches current invariants
  (`ContainmentApi.move()`, `StuffApi.destruct()`,
  `DescribeApi.getDisplayName()`).

**Drifted**
- File tree lists `persist.ts` under `mud/api/` (line 151) — file does not
  exist. Actual extras: `connection.ts`, `path-pattern.ts`, `shadow.ts`,
  `proxy.ts`, `execution-context.ts`, `mudlog.ts`, `module.ts`,
  `navigation.ts`, `schedule.ts`, `security.ts`, `template.ts`, `zone.ts`.
- Tree lists `Place.ts` under `lib/stuff/` — Place was collapsed into
  Location (recent commit `92761f6`). No `Place.ts` exists.
- `lib/stuff/` tree omits `Hydrator.ts`, `PostRegistration.ts`, `Shadow.ts`.
- `lib/spatial/` tree omits Cartesian/Spherical/Exit/Door/Sealable/Vessel/
  Zone family (Phase 7).
- Missing folder `lib/persistence/`, `lib/security/`.
- Missing `obj/Login.ts`, `obj/hooks/`, `obj/command/Go|Open|Close|Help|
  Ping|Player|Say|Tell` controllers.
- Most of the doc is "how to feed PLAN.md to coding mode" — that
  meta-process is no longer relevant.

**Gone**
- "Phase Implementation Order" sections 0-5 (lines 743-832) —
  already-completed phases described as future work.
- "Session N: Feed lines X-Y" feeding strategy.
- References to `Receptacle` class.

**Subsystem-specific content (migrate)**
- Error hierarchy + per-layer error handling (lines 437-540) → could go to
  `architecture.md` (cross-cutting) but currently uses outdated
  `ApplicationError`-style examples.
- Logging strategy / `MudlogApi` log categories (lines 542-563) → small
  enough to live in cross-cutting `architecture.md`.

**Cross-cutting content (keep in `architecture.md`)**
- File structure conventions (after correction).
- Naming conventions (files, mixins, interfaces, APIs).
- Code style guidelines (TS strict, no `any`, interface vs type,
  async/await, JSDoc).
- "Common Gotchas" appendix (the actually-useful, current part).

---

## 3. CONSISTENCY_REVIEW.md

**Verdict: delete (do not merge).** The doc self-identifies as a historical
snapshot. There is nothing worth pulling forward into `architecture.md`
that isn't said better elsewhere.

**Accurate**
- The header banner already declares it superseded.
- Some terminology entries (Three-Layer Object System, identifiers
  `stuffId`/`templateKey`, MVP definition) match code.

**Drifted**
- `CommandController<TModel extends CommandModel>` — actual signature is
  `CommandController<I = unknown, O = unknown>` (per CLAUDE.md and
  `lib/command/CommandController.ts`).
- "CommandGiver inconsistency" — already resolved (Mixins.CommandGiver in
  registry).
- Mixin filename convention (`NamedMixin.ts`) — doc still implies the old
  name; actual is `Named.ts`.

**Gone**
- All "must fix before coding" recommendations (Framework 8 expansion, etc.)
  refer to a planning state that no longer exists.
- References to `GlobbedMixin`, `Receptacle`.

---

## 4. ANTIPATTERNS.md

**Verdict: light rewrite.** Fix the one `success =` example, optionally add
a Setter-Invariants summary at the top (it's currently buried at the end).
Otherwise good.

**Accurate**
- Duck-typing-with-mixins section, `MixinApi.isX()` predicates,
  `ContainmentApi.move()` contract (typed params, `void` return, throws),
  three-level movement hierarchy (`travel()` / `move()` / `setEnvironment`),
  `DescribeApi.getDisplayName()` fallback chain, "per-field invariants
  belong on setters" all match the code and the live memory entries.
- `MixinApi.getContents()` exists; `ContainmentApi.isContainedIn`/
  `getContainer`/`getContents` exist.

**Drifted**
- One stale line: `const success = ContainmentApi.move(item, toContainer);`
  (line ~177) — `move()` now returns `void`. The doc's own contract section
  (line ~123) already says so, so it's an internal inconsistency.

**Gone**
- Nothing major.

**Subsystem-specific content**
- None — every section is a true cross-cutting "don't do this" rule.

---

## OVERLAP MAP

| Topic | Best treatment |
|---|---|
| Manager vs Api naming + layer separation | ARCHITECTURE_PATTERNS (only doc that covers it) |
| CMS template clone flow | CLAUDE.md (most current); ARCHITECTURE_PATTERNS duplicates it more verbosely |
| `prepareDestroy()` / never override `destroy()` | CLAUDE.md (canonical); ARCHITECTURE_PATTERNS duplicates with extra rationale; IMPLEMENTATION_GUIDE gotcha lists it |
| Mixin constants / naming / colocation rules | CLAUDE.md (canonical); IMPLEMENTATION_GUIDE restates conventions; ARCHITECTURE_PATTERNS lists `Mixins` snippet |
| Duck-typing / `MixinApi.isX` / `ContainmentApi.move()` / `DescribeApi.getDisplayName()` | ANTIPATTERNS (canonical); CLAUDE.md and IMPLEMENTATION_GUIDE both link or restate |
| Avatar↔Interactive↔Player sync | ARCHITECTURE_PATTERNS (only doc, but stale — needs rewrite using current API) |
| File-structure conventions | IMPLEMENTATION_GUIDE only (needs regeneration) |
| Per-field invariants on setters | ANTIPATTERNS (canonical) + memory entry |

## Already in CLAUDE.md (don't duplicate in a separate doc)

- Connection lifecycle (steps 1-9), messaging architecture flow, MML tags,
  command framework MVC pipeline, mixin subsystem catalog, `Mixins` registry
  policy, member-privacy `#` vs TS-modifier convention, persistent-field
  constraints, hydrator-bracket-assign exception for setter invariants,
  template + `hydratorClass` opt-in semantics, Phase 7 zone/exit summary,
  tech stack, env vars, ports, code style, `// @ts-` extension rule, file
  naming.

## Patterns in code that NONE of the four docs document

These all live in `mud/api/` and have non-trivial conventions worth a real
subsystem doc:

- **`security.ts` (SecurityApi) + `lib/security/decorators.ts`** —
  `@CallSecurity`, `@Unshadowable`, `@Final`, `@ShadowSecurity`,
  `decorateApiClass()`. Bootstrap-cycle avoidance for self-decoration.
- **`proxy.ts` (ProxyApi)** — `RAW_TARGET`, interceptor pipeline,
  `wrap()`/`unwrap()`. Foundation of call-security mediation.
- **`shadow.ts` (ShadowApi)** — `attach()`/`detach()` shadow stacks,
  `_callDown`, `Shadow` class in `lib/stuff/Shadow.ts`. Late-binding handle
  pattern with SecurityApi (avoids circular import).
- **`execution-context.ts` (ExecutionContextApi)** —
  call-stack/frame-tagging/`runRoot`, `getCurrentCommandContext()`,
  `getCurrentCausingCommandId()`. Underpins per-command tracing.
- **`module.ts` (ModuleApi)** — first-stamp-wins class-to-URL identity for
  security; `@Final` validation runs from inside `stamp()`.
- **`mudlog.ts` (MudlogApi)** — overloaded
  `trace/debug/info/warn/error/fatal` that take MML, with optional
  category. IMPLEMENTATION_GUIDE describes a much simpler old API.
- **`schedule.ts` (ScheduleApi)** — `schedule()`, `recurring()`, `cancel()`
  with `ScheduleHandle`.
- **`navigation.ts` (NavigationApi)** — `normalizeDirection`,
  `invertDirection`, `directionOffset`, `cardinalDirections()`. Used by
  Exit/Zone code.
- **`path-pattern.ts` (PathPatternApi)** — limited glob (`*`/`**`), regex
  compile cache; *not* a full glob library.
- **`template.ts` (TemplateApi)** — `saveTemplate()`, folder/leaf invariant
  validators, ancestor-path walking. Live: hooks via `obj/hooks/DomainHook.ts`
  + `hooks.yaml`.
- **`zone.ts` (ZoneApi)** — `ZONE_CLASS_PATHS` whitelist,
  `resolveZoneForPath` ancestor walk, clone cache.
- **`obj/Login.ts`** — per-login `Idea` orchestrating entry; ephemeral
  lifetime; not in any doc.
- **`obj/hooks/DomainHook.ts` + `hooks.yaml`** — `AroundSaveHook`/
  `AroundDeleteHook` mixin pattern wired to `Collections.Domain`. The
  `AroundSaveHookMixin`/`AroundDeleteHookMixin`/`PostRegistrationMixin`
  triad in the registry isn't mentioned in any doc.
- **`lib/persistence/PersistentHydrator.ts`** — the canonical `hydratorClass`
  referenced by templates; CLAUDE.md describes the contract but the file's
  existence/conventions are undocumented.
- **`services/loader/`** (`loader-hook.ts`, `transform.ts`,
  `vite-plugin.ts`) — module-loader instrumentation, almost certainly the
  mechanism backing `ModuleApi.stamp()`. Undocumented.
