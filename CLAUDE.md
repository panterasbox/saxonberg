# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repo.

This file is the orientation doc + the load-bearing project rules.
Subsystem detail lives in `docs/`.

## Project Overview

Saxonberg 2.0 — an immersive multiplayer role-playing educational
platform. TypeScript across the stack within a `pnpm` monorepo
(`packages/server`, `packages/client`, `packages/types`). For the
product vision see [docs/vision.md](./docs/vision.md).

## Documentation Map

The `docs/` tree is the source of truth for architecture and subsystem
behavior. Read the relevant doc before editing in its area.

- [docs/architecture.md](./docs/architecture.md) — three-layer
  architecture, Manager vs Api, mixin organization, file structure
- [docs/antipatterns.md](./docs/antipatterns.md) — patterns to avoid,
  with the correct alternative for each (lookup-table style)
- [docs/vision.md](./docs/vision.md) — product vision
- [docs/roadmap.md](./docs/roadmap.md) — what's left to build
- Subsystem references in `docs/subsystems/`:
  - [templates.md](./docs/subsystems/templates.md) — clone pipeline,
    Hydrator, TemplateApi, folder/leaf invariant
  - [persistence.md](./docs/subsystems/persistence.md) — Persistable,
    PersistenceManager, around-save/delete hooks
  - [lifecycle.md](./docs/subsystems/lifecycle.md) — create/destroy
    choreography, construction sentinel, prepareDestroy
  - [state-model.md](./docs/subsystems/state-model.md) — what gets
    persisted, Avatar self-contained, Persistable in the Idea hierarchy
  - [messaging.md](./docs/subsystems/messaging.md) — MML, Scene
    composer, sensor routing, Phrasebook, MudlogApi
  - [call-security.md](./docs/subsystems/call-security.md) — proxy
    interception, decorators, policies, shadows, FrameKind
  - [properties.md](./docs/subsystems/properties.md) — PropertiedMixin,
    Property<T>, transient vs saved storage, access control patterns,
    masks (the unshadowable mixin's per-property override mechanism)
  - [commands.md](./docs/subsystems/commands.md) — client → server
    pipeline, YAML view + controller MVC, parse/match/resolve/validate/
    execute stages, discovery via commandProvider, auto-emit ok/notok
  - [mixins.md](./docs/subsystems/mixins.md) — class-factory mixins,
    `_mixinName` marker, `Mixins` registry, `MixinApi` predicates,
    composition order, persistence/command/security integration

## Development Commands

### Package Management

```bash
pnpm install          # install all dependencies
pnpm install:all      # monorepo-specific install
```

### Development

```bash
pnpm dev              # run client and server concurrently
pnpm dev:server       # server only (cd packages/server && pnpm dev)
pnpm dev:client       # client only (cd packages/client && pnpm dev)
```

### Build / Test / Quality

```bash
pnpm build            # pnpm -r build
pnpm test             # all tests (Vitest)
pnpm lint             # ESLint across all packages
pnpm format           # Prettier
```

Per-package commands live in `packages/server/` and `packages/client/`
(`pnpm dev`, `pnpm build`, `pnpm test`, `pnpm clean`, `pnpm preview`).

### Documentation

```bash
pnpm docs:all         # generate API documentation
pnpm docs:client / :server / :types
pnpm docs:clean
```

## Tech Stack

- **Server**: Node.js + Express, `ws` for WebSockets, MongoDB native
  driver, Passport (`passport-google-oauth20`), `tsx` for dev with
  watch.
- **Client**: React 18 + Vite, Zustand for state, styled-components.
- **Shared**: `@saxonberg/types` package.
- **Testing**: Vitest. Tests are colocated in `__tests__/` siblings.

## Environment Variables

Server requires `.env` in `packages/server/`:

```
MONGODB_URI=mongodb://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:2010/auth/google/callback
SESSION_SECRET=...
```

## Ports

- Client dev server: `http://localhost:5173` (Vite default)
- Server: `http://localhost:2010`

## TypeScript Configuration

`tsconfig.base.json` — Target ES2022, Module NodeNext, strict mode,
`experimentalDecorators` + `emitDecoratorMetadata`,
`noUncheckedIndexedAccess`.

## Code Style

From `.prettierrc.js`:

- 80 character line width
- 2 spaces for indentation
- Double quotes for strings
- Semicolons required
- Trailing commas (ES5 style)
- LF line endings

From `.eslintrc.js`:

- React import not required in JSX (React 17+)
- Unused variables warning (allow `_` prefix)
- TypeScript recommended rules

## Import Statement Style

**NEVER use `.js` extensions in import statements.** TypeScript with
`NodeNext` module resolution handles extensions automatically.

```typescript
// CORRECT
import { Stuff } from '../stuff/Stuff';
import { Location } from './Location';

// WRONG
import { Stuff } from '../stuff/Stuff.js';
import { Location } from './Location.js';
```

## File Naming Conventions

- **Mixin files**: `Propertied.ts`, `Detailed.ts`, `Visible.ts` (NO
  `Mixin` suffix in the filename). The exported function is still
  named `PropertiedMixin()`. The internal class name marker is still
  `_mixinName = 'PropertiedMixin'`. Test files match:
  `Propertied.test.ts`.
- **Mixin placement**: Mixins live in the `lib/<subsystem>/` folder
  that owns the concern they model. **DO NOT create a `lib/mixins/`
  folder** — "mixin" is an implementation technique, not a subsystem.
  If a new mixin doesn't fit an existing subsystem, propose a new
  subsystem folder for it. Shared mixin infrastructure (types, name
  registry) lives in `lib/mixin.ts`.
- **Class files**: match the class name (`Avatar.ts`, `Player.ts`,
  `Thing.ts`, `Location.ts`).
- **Api files**: lowercase with `.ts` (`stuff.ts`, `player.ts`,
  `mixin.ts`, `containment.ts`, `message.ts`).
- **Command YAML views**: in `mud/cmd/`, lowercase
  (`look.yaml`, `say.yaml`, `tell.yaml`).
- **Command controllers**: in `mud/obj/command/`, e.g.
  `LookController.ts`, `GoController.ts`.

## Member Privacy: `#` vs TypeScript Modifiers

Two privacy mechanisms with different threat-model semantics. They
are NOT interchangeable.

- **TypeScript modifiers** (`private`, `protected`, `public`) —
  compile-time only. The fields are public properties at runtime:
  reachable via bracket access, reflection, `JSON.stringify`, Proxy
  traps, subclasses that override-and-super.
- **ECMAScript hard-private** (`#name`) — runtime-enforced. Cannot be
  reached by bracket access, reflection, Proxy traps, subclasses, or
  replaced prototype methods. Lexically bound to the class body.

Convention is **layer-based**:

- **Mediator/trusted-surface code** — `packages/server/src/backend/`
  and `packages/server/src/mud/api/` — defaults to `#`. These layers
  mediate access for everything else and benefit from the stronger
  runtime guarantee. `#` ensures internal slots are invisible to a
  wrapping Proxy.
- **Domain code** — `packages/server/src/mud/lib/`, `mud/obj/`,
  `mud/cmd/` — defaults to TypeScript modifiers. Persistent fields
  must be public for the `Hydrator` to reflect into. Use `protected`
  for subclass extension points (`prepareDestroy()`-style hooks),
  `private` for class-internal helpers and caches.

**Special cases** where `#` is appropriate inside `lib/` or `obj/`:

1. A reentry guard or invariant-critical flag where a malicious
   subclass overriding a method could corrupt state.
2. An internal slot that must be deliberately shielded from the
   Proxy-based permissions framework.
3. A field whose only legitimate access is the class itself and where
   forcing tests to use a deliberate observation seam is the desired
   outcome.

Caches, helpers, and ordinary internal state do NOT qualify. When
introducing `#` in domain code, leave a one-line comment explaining
which case applies.

**Hard constraint**: persistent fields cannot be `#` — the `Hydrator`
reflects into them and `#` slots are unreachable from outside the
class body.

## Go Through the API Layer

Several recurring rules collapse into one principle: **never call into
internal mechanism directly when an Api method exists for the same
job**. The Api layer threads through the security gate; direct calls
bypass it. Common cases:

| Don't | Do |
|---|---|
| `obj.destroy()` | `StuffApi.destruct(obj)` |
| `new SomeStuff()` | `await StuffApi.create(() => new SomeStuff())` or `await StuffApi.clone(path)` |
| `item.setEnvironment(c); c.addContainable(item)` | `ContainmentApi.move(item, c)` |
| `typeof obj.getContents === 'function'` | `MixinApi.isContainer(obj)` (narrow) or `MixinApi.hasMixin(ctor, Mixins.Container)` (introspect) |
| `obj.fullName ?? obj.name ?? 'something'` | `DescribeApi.getDisplayName(obj, 'something')` |
| `creature.move(loc)` (raw containment) | `creature.travel(loc, 'walk')` (locomotion) |
| `avatar.gold = 100` (direct field assignment for dynamic state) | `avatar.setProp(Property.of<number>('gold'), 100)` (PropertiedMixin) |

Full list with examples: [docs/antipatterns.md](./docs/antipatterns.md).

Some specific reminders worth keeping in front of mind:

- **Destroy via `StuffApi.destruct(obj)`** — never override `destroy()`.
  Use the `prepareDestroy()` hook for cleanup. Enforced at runtime by
  `@CallSecurity(SecurityPolicies.ApiOnly)` + `@Final` + `@Unshadowable`.
- **`ContainmentApi.move()`** takes typed `Stuff & Containable` /
  `Stuff & Container` parameters and returns `void`. Programmatic
  contract violations throw; there are no boolean success flags.
  YAML-level validators handle user-input failures separately.
- **Per-field invariants belong on setters**, not in `normalize()`-style
  post-hydrate hooks. Hydration goes through setters via bracket-assign;
  cross-field invariants go in a custom `Hydrator` subclass.
- **`Mixins` registry constants** in `lib/mixin.ts` — use
  `Mixins.X` instead of string literals when calling
  `MixinApi.hasMixin()`.

## Authentication Flow (Brief)

Google OAuth2 via Passport. Sequence: `/auth/google` → Google →
`/auth/google/callback` → `Backend.handleAuthenticationSuccess` →
`Application.findOrCreateUserFromGoogle` (creates/updates
`GoogleProfile`, `User`, default Avatar template at `/obj/Avatar/<playerId>`)
→ session cookie → client redirected with `auth=success`. WebSocket
upgrade reuses the express-session middleware.

Full connection lifecycle (login flow, character selection,
multiplexing, disconnect): see
[docs/subsystems/state-model.md](./docs/subsystems/state-model.md) and
[docs/subsystems/lifecycle.md](./docs/subsystems/lifecycle.md).

## CORS / WebSocket Auth

- `Backend` configures CORS for the client origin in dev.
- WebSocket upgrade runs the same session middleware as HTTP. Validates
  `request.session.passport.user.id`; rejects unauthenticated
  connections immediately.

## MongoDB Collections

- `users` — auth records (`Persistable`)
- `google_profiles` — OAuth profile data (`Persistable`)
- `domain` — object templates for the CMS (Avatar, rooms, NPCs, …)

## Session Notes for Claude

- This is a TypeScript-strict codebase. `noUncheckedIndexedAccess` is
  on. Don't reach for `any` without justification.
- Use `MixinApi.isX(obj)` type predicates when narrowing — they thread
  the mixin's public interface into TypeScript's control-flow narrowing.
- Tests live next to the source under `__tests__/`. Vitest.
- New Apis end with `SecurityApi.decorateApiClass(XApi)`. The four
  bootstrap-special Apis (`ExecutionContextApi`, `ModuleApi`,
  `SecurityApi`, `ProxyApi`) deliberately don't self-decorate — see
  [docs/subsystems/call-security.md](./docs/subsystems/call-security.md).
- The `Mixins` constants object is the single source of truth for
  mixin names. Add new mixins there.
