# Architecture

This doc covers the cross-cutting architectural conventions that apply to
every subsystem in Saxonberg 2.0: how layers separate, how `Manager` vs
`Api` classes differ, how mixins are organized, and how the codebase is
laid out.

For specific subsystems, see [subsystems/](./subsystems/).
For coding antipatterns to avoid, see [antipatterns.md](./antipatterns.md).

## Three-Layer Architecture

```
┌─────────────────────────────────────────────────┐
│ Mudlib Objects (Avatars, Locations, NPCs, …)   │  ← packages/server/src/mud/{lib,obj,cmd}
│  ↓ (always go through)                          │
│ Api Layer (public, static utilities)            │  ← packages/server/src/mud/api/
│  ↓ (may delegate to)                            │
│ Managers (privileged singletons with state)     │  ← packages/server/src/backend/, services/
└─────────────────────────────────────────────────┘
```

The split is enforced at the call-security layer: Api classes are
decorated with `SecurityApi.decorateApiClass(XApi)` and all entry points
pass through that gate. Mudlib code MUST go through the Api layer to
reach managers; direct calls to managers from mudlib are blocked.

The server itself is structured as:

```
packages/server/src/
├── services/        Auth, WebSocket, module loader (services/loader)
├── backend/         Backend (I/O bridge), Application (game logic),
│                    PersistenceManager (singleton)
└── mud/             Mudlib
    ├── api/         ~22 static Api classes (the public surface)
    ├── cmd/         YAML command views (declarative)
    ├── config/      constants
    ├── lib/         Standard Model — Stuff hierarchy + mixins per subsystem
    └── obj/         Instantiable game objects (Avatar, Interactive, Login)
        ├── command/   CommandController implementations
        └── hooks/     persistence around-hooks
```

## Manager vs Api

The codebase uses two distinct class shapes for non-domain behavior. The
distinction is **how privileged the class is**, not how stateful.

### Manager — Privileged Singleton

A `Manager` owns state, performs business logic, and is reachable only
from privileged code (other managers, `Backend`, `Application`, the Api
layer). Typical shape:

```typescript
export class XyzManager {
  private static instance: XyzManager;
  private someState: Map<string, SomeType>;

  private constructor() {}

  static get(): XyzManager {
    if (!this.instance) this.instance = new XyzManager();
    return this.instance;
  }

  // business logic methods
}
```

Examples: `PersistenceManager`, `ConnectionManager`, `Backend`.

### Api — Public Static Utility

An `Api` class is the public-facing entry point that mudlib code uses.
It's a class of static methods, decorated by
`SecurityApi.decorateApiClass(XApi)`. Some Apis are pure delegators
(thin wrappers over a Manager); others own significant logic
(`StuffApi`, `MixinApi`, `MessageApi`).

```typescript
export class XyzApi {
  static getSomething(id: string): SomeType | undefined {
    return XyzManager.get().getSomething(id);
  }
}

SecurityApi.decorateApiClass(XyzApi);
```

Examples: `StuffApi`, `ConnectionApi`, `MixinApi`, `MessageApi`,
`ContainmentApi`, `MqlApi`, `MudlogApi`, `CommandApi`,
`CommandLineApi`, `ProxyApi`, `SecurityApi`, `ShadowApi`,
`ExecutionContextApi`, `ModuleApi`, `NavigationApi`, `PathPatternApi`,
`ScheduleApi`, `TemplateApi`, `ZoneApi`, `DescribeApi`, `MmlApi`,
`PlayerApi`, `PersistApi`-equivalent (no separate class today —
persistence helpers live on the relevant Apis directly).

### When to Create a New One

- **Manager** when you need a singleton with privileged state and
  business logic; access restricted to core infrastructure.
- **Api** when you need a public interface; stateless or
  safely-cacheable; mudlib should be able to call it.
- **Both** when you have privileged state/operations *and* need safe
  mudlib access — the Api wraps the Manager.

### Notes on the Pattern

- **Backend is I/O only**, not a database passthrough. `Backend.send`,
  `Backend.broadcast`, and `Backend.handle*` are the surface.
  Persistence calls go through `PersistenceManager.get()` directly from
  privileged code.
- **`StuffApi` does own state** (the `objectsById` registry). That's
  the documented exception — registry membership is a public concern.

## Backend → mudlib import discipline

Backend is the privileged layer; mudlib is the upper layer. Imports
flow upward (mudlib → Api → Manager). Backend code that reaches
into `mud/` for shape or data inverts the layering and should be
held to a tiered standard:

1. **`mud/api/*` — always free game.** Apis are the engineered
   handshake; backend Managers naturally call into them. Importing
   `StuffApi`, `EventApi`, `ExecutionContextApi`, etc. is the
   intended pattern.

2. **`mud/lib/*` types via `import type` — fine.** Shape information
   only; no runtime dependency. `import type { Stuff, User,
   Interactive, CommandContext }` from backend is normal — these
   are framework primitives, not gameplay. Runtime `import { ... }`
   of a `mud/lib/` value is a smell unless it's a cross-cutting
   framework primitive (`CallSecurity`, `SecurityPolicies`).

3. **`mud/lib/*` runtime values that are mudlib data or
   configuration — invert it.** When a manager needs a list, table,
   or manifest authored in mudlib (so lower-level developers can
   edit it), the *type* belongs to the manager (the consumer); the
   *data* belongs in mudlib and imports the type back. Mudlib →
   backend for the type, never backend → mudlib for the type.

   `BootstrapManager` + `mud/bootstrap.ts` is the worked example:
   `BootstrapEntry` is exported from `BootstrapManager`;
   `mud/bootstrap.ts` imports it and declares the manifest array
   against it. Backend doesn't reach into mudlib for the shape;
   mudlib doesn't have a competing definition.

4. **`mud/obj/*` classes — tech debt.** `instanceof Avatar`,
   `Avatar.getTemplatePath()` from `Application` couples backend to
   gameplay. Pragmatic for now (the network → gameplay bridge has
   to land somewhere) but flag and migrate to mixin predicates
   (`MixinApi.isHasInteractive`) and Api lookups when the surface
   stabilises.

For load-time cycle breakage, `await import(...)` inside a method
body (see `PersistenceManager.dispatchSave` and friends) is the
established escape hatch — keeps the static graph clean while the
runtime call still resolves.

## Class Hierarchy

### Top-level branches

Every concrete `Stuff` subclass MUST extend through exactly one of
seven top-level branches, each capturing a distinct role:

```
Stuff (base — runtime ID, FINAL destroy, construction sentinel)
  ├── Idea          incorporeal identity (Exit, Login, Zone, …)
  ├── Thing         portable physical item
  ├── Location      stationary place
  ├── Vessel        mobile place (Container + Containable)
  ├── Agent         sentient/active actor (Character → Avatar)
  ├── Persistable   MongoDB-backed record (User, GoogleProfile, Template)
  └── Shadow        function-shadowing host — see call-security.md
```

Each branch lives in `lib/stuff/` (except `Persistable`, which lives
in `lib/persistence/`) and registers itself with `Stuff` at module
load via `Stuff._registerTopLevelBranch(BranchClass)`. The
registration is gated by a URL allowlist on `Stuff` — only those
seven files may register, so the branch set can't be silently
extended from a subclass or a third-party file.

`Stuff`'s constructor walks the prototype chain at instance-creation
time and throws if no registered branch is found. Class-time work is
done once per class (cached); the per-instance cost is a single
WeakSet lookup. The error message lists the seven branches and
points readers here.

### Why the invariant

- **Roles, not capabilities.** Class identity (`instanceof`) is for
  role checks (`instanceof Avatar`, `instanceof Vessel`); capability
  checks (`is this place-like / item-like / navigable?`) go through
  `MixinApi.isContainer` / `isContainable` / `isExitable`. The seven
  branches give every role a clean `instanceof` that doesn't lie.
- **Vessel as its own branch.** A vessel is a *mobile place* — both
  Container (it holds passengers/cargo) and Containable (it lives
  somewhere). Putting it under `Thing` would say "vessels are items"
  (false — you can't pocket a ship); putting it under `Location`
  would say "locations don't move" (false for vessels). It's its own
  role.
- **Persistable as its own branch.** Auth/CMS records are Stuff in
  every framework respect (registered, proxy-wrapped, destructed)
  but they're not in-world. Keeping them as a sibling branch rather
  than a sub-tree of Idea matches that distinction and leaves room
  to revisit later if the mental model converges.

### What each branch composes

| Branch | Composition | Notes |
|---|---|---|
| `Idea` | `Stuff` | No spatial mixin. Default for incorporeal entities. |
| `Thing` | `ContainableMixin(Stuff)` | "I live somewhere." |
| `Location` | `ContainerMixin(Stuff)` | "I'm a place." Subclasses (`CartesianLocation`, `SphericalLocation`, …) layer on coordinate / Visible / Exitable mixins. |
| `Vessel` | `ContainerMixin(ContainableMixin(Stuff))` | Both Container AND Containable. `ExitableVessel` etc. layer on navigation. |
| `Agent` | `Stuff` | Subclasses (Character → Avatar) layer on Mobile / Container / Containable / Sensor / Vocal / etc. |
| `Persistable` | `Stuff` | Adds `save` / `delete` / `findById` / `find`. Records (User, GoogleProfile, Template) extend Persistable. |
| `Shadow` | `Stuff` (abstract) | Framework-internal — not in-world Stuff. See [call-security.md](./subsystems/call-security.md). |

`Persistable` sits on `Stuff` directly (sibling of the in-world
branches). Records under it are loaded via `findById` / `find` rather
than the template/clone/hydrate pipeline; otherwise they're Stuff
like anything else. See
[subsystems/persistence.md](./subsystems/persistence.md).

## Mixin Organization

Mixins are higher-order functions that extend a base class with new
fields and methods. The Saxonberg convention is strict about where
they live and how they're declared.

The full subsystem doc is [subsystems/mixins.md](./subsystems/mixins.md)
— infrastructure (`MixinConstructor`, `Mixins` registry, `MixinApi`),
authoring conventions, composition rules, and cross-cutting
integration. The summary below covers the layout rules every
contributor needs to know.

### Subsystem-Folder Layout

Mixins live in the `lib/<subsystem>/` folder that owns the concern they
model, alongside any related classes. **There is NO `lib/mixins/`
folder** — that grouping is explicitly prohibited. "Mixin" is an
implementation technique, not a subsystem. If a new mixin doesn't fit
an existing subsystem folder, propose a new subsystem folder for it
rather than grouping by mixin-ness.

Shared mixin infrastructure (`MixinConstructor` type, `Mixins` name
registry) lives in `lib/mixin.ts`.

### Available Mixins

| Folder | Mixin | Purpose |
|---|---|---|
| `lib/character/` | `GenderedMixin` | pronouns (he/she/they/etc.), persistent |
| `lib/description/` | `NamedMixin` | proper names — `name`, `surname`, `nameSuffix`, `honorific`, `alternateNames`, `fullName`, persistent |
| `lib/description/` | `VisibleMixin` | shortDescription, longDescription; provides `look` command |
| `lib/description/` | `PerceptibleMixin` | MQL keyword management, persistent |
| `lib/description/` | `DetailedMixin` | hierarchical detail management, persistent |
| `lib/spatial/` | `ContainerMixin` | inventory; provides `inventory`/`get`/`drop` |
| `lib/spatial/` | `ContainableMixin` | environment reference |
| `lib/spatial/` | `MobileMixin` | `travel()` between locations (requires Containable) |
| `lib/spatial/` | `ExitableMixin` | exit map host; `addExit`, `getObviousExits`, etc. |
| `lib/spatial/` | `CartesianCoordinatesMixin` | `[x,y,z]` position carrier |
| `lib/spatial/` | `SphericalCoordinatesMixin` | `{rho,theta,phi,radius}` position carrier |
| `lib/spatial/` | `SealableMixin` | open/closed state (doors) |
| `lib/spatial/` | `DoorBearingMixin` | adds `door: Door \| null` for hosts whose exits are synthesized rather than authored (`ExitableVessel`). Constrained to `Stuff & Exitable`. |
| `lib/stuff/` | `SingletonMixin` | class-level uniqueness — refuses a second `clone()` for the same templatePath. Composed by `CartesianZone` / `SphericalZone`. |
| `lib/message/` | `SensorMixin` | `handleMessage(frame)` notification hook |
| `lib/message/` | `VocalMixin` | `say(text)` with scope inference |
| `lib/command/` | `CommandGiverMixin` | `executeCommand`, `getAvailableCommands` |
| `lib/stuff/` | `PropertiedMixin` | controlled dynamic property bag, persistent |
| `lib/stuff/` | `PostRegistrationMixin` | opt-in `postRegister(context?)` lifecycle hook |
| `lib/persistence/` | `AroundSaveHookMixin` | middleware-style PM save hook |
| `lib/persistence/` | `AroundDeleteHookMixin` | middleware-style PM delete hook |
| `lib/connection/` | `HasInteractiveMixin` | "this Stuff has connected `Interactive`s" — `add`/`remove`/`getInteractives`/`isConnected`/`isLinkdead`. Composed by `Avatar` (multiplexing) and `Login` (singleton). |

### Mixin Composition Constraints

Where a mixin only makes sense on top of another, encode it in the
generic bound rather than in a comment. Example:

```typescript
// MobileMixin requires a Containable base — compile error otherwise.
export function MobileMixin<TBase extends MixinConstructor<Stuff & Containable>>(
  Base: TBase
) { /* ... */ }
```

When a constraint is intentionally relaxed (e.g., `CommandGiverMixin`
isn't bound to Container/Containable so loose objects can still expose
commands), leave a comment explaining why.

### Public-Shape Interfaces Colocated With Mixins

Every mixin file exports an interface with the same name as the mixin
(e.g., `Container`, `Containable`, `Sensor`, `Vocal`, `CommandGiver`)
describing the public surface the mixin adds. These interfaces are
what `MixinApi.isX()` narrows to — they MUST live next to the mixin
implementation, never in a central type barrel.

### `Mixins` Registry

`lib/mixin.ts` lists every registered mixin by name. Always use
`Mixins.X` constants instead of string literals when calling
`MixinApi.hasMixin()`:

```typescript
// CORRECT
if (MixinApi.hasMixin(ctor, Mixins.Container)) { /* ... */ }

// WRONG — string literal, breaks under refactor
if (MixinApi.hasMixin(ctor, 'ContainerMixin')) { /* ... */ }
```

For narrowing-and-calling, prefer the type predicate:

```typescript
if (MixinApi.isContainer(obj)) {
  obj.addContainable(item); // obj: Stuff & Container
}
```

See [antipatterns.md § Duck Typing with Mixins](./antipatterns.md#duck-typing-with-mixins)
for the full rule.

## File Naming Conventions

- **Mixin files**: `Propertied.ts`, `Detailed.ts`, `Visible.ts` (NO
  "Mixin" suffix in the filename). The exported function is still
  named `PropertiedMixin()`. The internal class-name marker is still
  `_mixinName = 'PropertiedMixin'`.
  Test files: `Propertied.test.ts`, `Detailed.test.ts`.

- **Class files**: match the class name. `Avatar.ts`, `Player.ts`,
  `Thing.ts`, `Location.ts`.

- **Api files**: lowercase with `.ts`. `stuff.ts`, `player.ts`,
  `mixin.ts`, `containment.ts`, `message.ts`, …

- **Command YAML views**: `lookatself.yaml`, `say.yaml`, `tell.yaml`,
  in `mud/cmd/`. Loaded lazily by `CommandApi`.

- **Command controllers**: in `mud/obj/command/`, e.g.
  `LookController.ts`, `GoController.ts`.

## Member Privacy: `#` vs TypeScript Modifiers

Two privacy mechanisms with different threat-model semantics:

- **TypeScript modifiers** (`private`, `protected`, `public`) —
  compile-time only. Fields are public properties at runtime:
  reachable via bracket access, reflection, `JSON.stringify`, Proxy
  traps, subclasses that override-and-super.
- **ECMAScript hard-private** (`#name`) — runtime-enforced. Cannot be
  reached by bracket access, reflection, Proxy traps, subclasses, or
  replaced prototype methods. Lexically bound to the class body.

Convention is **layer-based**:

- **Mediator/trusted-surface code** —
  `packages/server/src/backend/` and `packages/server/src/mud/api/`
  — defaults to `#` for private members. These layers wrap and
  mediate access for everything else, and `#` ensures internal slots
  are invisible to the wrapping Proxy.
- **Domain code** — `packages/server/src/mud/lib/`,
  `packages/server/src/mud/obj/`, `packages/server/src/mud/cmd/` —
  defaults to TypeScript modifiers. Domain code carries persistent
  fields that the `Hydrator` reflects into; those fields MUST be
  public. Use `protected` for subclass extension points (e.g.
  `prepareDestroy()`-style hooks), `private` for class-internal
  helpers and caches.

**Special cases** where `#` is appropriate inside `lib/` or `obj/`:

1. A reentry guard or invariant-critical flag where a malicious
   subclass overriding a method could corrupt state.
2. An internal slot that must be deliberately shielded from the
   call-security framework (the trusted method body bypasses
   mediation when touching its own state).
3. A field whose only legitimate access is the class itself, where
   forcing tests to use a deliberate observation seam is the desired
   outcome.

Caches, helpers, and ordinary internal state do NOT qualify. When
introducing `#` in domain code, leave a one-line comment explaining
which case applies.

**Hard constraint**: persistent fields (anything in `persistentFields`
or contributed by a mixin's persistent field set) cannot be `#` — the
`Hydrator` reflects into them and `#` slots are unreachable from
outside the class body.

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

**Import style**: NEVER use `.js` extensions in import statements.
TypeScript's `NodeNext` module resolution handles extensions
automatically. Use extension-free imports for all `.ts`/`.tsx` files:

```typescript
// CORRECT
import { Stuff } from '../stuff/Stuff';
import { Location } from './Location';

// WRONG
import { Stuff } from '../stuff/Stuff.js';
import { Location } from './Location.js';
```

## "Go Through the API Layer"

Several recurring rules collapse into one principle: **never call into
internal mechanism directly when an Api method exists for the same
job**. The Api layer threads through the security gate; direct calls
bypass it.

| Don't | Do |
|---|---|
| `obj.destroy()` | `StuffApi.destruct(obj)` |
| `new SomeStuff()` | `await StuffApi.create(() => new SomeStuff())` or `await StuffApi.clone(path)` |
| `item.setContainer(c); c.addContainable(item)` | `ContainmentApi.move(item, c)` |
| `typeof obj.getContents === 'function'` | `MixinApi.isContainer(obj)` (narrow) or `MixinApi.hasMixin(ctor, Mixins.Container)` (introspect) |
| `obj.fullName ?? obj.name ?? 'something'` | `DescribeApi.getDisplayName(obj, 'something')` |
| `creature.move(loc)` (raw containment) | `creature.travel(loc, 'walk')` (locomotion) |

See [antipatterns.md](./antipatterns.md) for the full rule with examples.

## Phase Numbering Note

If you're reading the older planning docs and wondering where Phases
5 and 6 went: they got **absorbed**, not skipped. Phase 5
(Communications) shipped as part of Phase 3 messaging plus the
say/tell controllers in `mud/cmd/` and `mud/obj/command/`. Phase 6
(Extended Object Model) shipped as `Thing.ts`, `Detailed.ts`,
`Propertied.ts`, `CartesianLocation.ts` in `lib/stuff/` and
`lib/spatial/`. Implementation status now lives in
[roadmap.md](./roadmap.md).

## Cross-References

- **Subsystem docs** (the load-bearing details):
  - [templates.md](./subsystems/templates.md) — clone pipeline,
    Hydrator, TemplateApi, folder/leaf invariant
  - [persistence.md](./subsystems/persistence.md) — Persistable,
    PersistenceManager, around-hooks
  - [lifecycle.md](./subsystems/lifecycle.md) — create/destroy
    choreography, construction sentinel, prepareDestroy
  - [state-model.md](./subsystems/state-model.md) — what gets
    persisted, Avatar self-contained, Persistable in the Idea hierarchy
  - [messaging.md](./subsystems/messaging.md) — MML, Scene composer,
    sensor routing, movement-message defaults
  - [shell-environment.md](./subsystems/shell-environment.md) —
    `EnvironmentMixin` settings keyspace, schema-on-mixin, `settings`
    / `var` commands, `resolveSetting` cross-host helper
  - [call-security.md](./subsystems/call-security.md) — proxy
    interception, decorators, policies, shadows
  - [mixins.md](./subsystems/mixins.md) — class-factory mixins,
    infrastructure, authoring conventions, integration with
    persistence / commands / security
- [antipatterns.md](./antipatterns.md) — patterns to avoid with the
  correct alternative for each
- [roadmap.md](./roadmap.md) — what's left to build
- [vision.md](./vision.md) — product vision (less load-bearing
  technically)
