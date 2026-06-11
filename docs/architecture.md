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

## api/ vs lib/ — which layer owns this code?

When you're adding a method and trying to decide whether it goes on a
`lib/` class or in an `api/` static, the deciding question is **who has
authority over the answer**.

- **`lib/`** is for behavior whose answer is the host's to choose.
  Subclasses can override it; mixins compose into it; instance state
  changes it. The class or mixin is the authority over what the method
  means for that host.
- **`api/`** is for behavior with a single guaranteed answer. Same
  inputs, same outcome, same caller-visible semantics — every time,
  for every caller. The method body may branch on mixin presence or
  read instance state, but the *contract* doesn't vary by host
  identity.

The diagnostic: **"Could a subclass legitimately want to change what
this method does?"** If yes, it belongs in `lib/`. If no, it belongs
in `api/`. "Has to work the same way every time, with no override
seam" is what an Api guarantees; "has an override seam" is what a
`lib/` class offers.

### Orchestration lives one layer up from raw steps

The corollary that prevents `lib/` from drifting into Api territory:
when a method needs to *walk*, *compose*, or *retry* polymorphic
steps, the orchestration belongs in `api/` even though each
individual step belongs on a `lib/` class.

- **Raw step** = the polymorphic answer. Stays on the class or mixin
  that owns the contract (`Mobile.traverse`, `Zone.lookupField`,
  `Visible.getLongDescription`).
- **Orchestration** = code that calls raw steps, walks results, threads
  state across calls (`LocomotionApi.engageAround`,
  `ZoneApi.getEnclosingZone`, `ContainmentApi.move`).

The smell that flags an inverted layering: **a `lib/` method
`await import(...)`-ing into `api/` to take its next step.** The fix
is to pull the orchestration up into `api/` and have the `lib/` method
call the Api by static import (the Api can statically import the class
as a type-only reference).

Worked example — Zone field inheritance:
- Polymorphic step: `Zone.lookupField` reads own value, defers to
  `Zone.lookupAncestorField`. Subclasses (`RootedZone`) override the
  ancestor step to root the walk. **Lives in `lib/zone/Zone.ts`.**
- Orchestration: "find the nearest enclosing-zone template by walking
  `Template.ancestorPaths`, skip non-folders, singleton-resolve the
  hit." **Lives in `ZoneApi.getEnclosingZone(zone)`** — no
  polymorphism, pure plumbing through `Template` + `StuffApi`.

Before the split, `Zone.getEnclosingZone()` was on the class and had
to `await import(...)` `Template`, `StuffApi`, and `ZoneApi` from
inside the method body to break the load-time cycle. Pulling the
orchestration up to `ZoneApi` removed the dynamic imports from the
`lib/` side; the only remaining cycle-break (a `SpatialZone` lazy
lookup) lives in `api/zone.ts`, where it belongs.

### Three flavors of each layer

`lib/` and `api/` each cover three distinct shapes; the polymorphism
question above resolves cleanly only when you know which kind you're
adding.

`lib/` holds:
- **Mixins** — capability shapes (`Containable`, `Sensor`, `Posed`).
  Polymorphic by design.
- **Stuff classes** — role identity (`Avatar`, `Vessel`, `Location`,
  `Zone`). Overridable.
- **Value objects** — pure data + small per-instance math (`Light`,
  `Quantity`). Not Stuff. Lives in `lib/` because it's a domain
  primitive the Api layer consumes.

`api/` holds:
- **Pure utilities** — no Manager, just functions
  (`NavigationApi.parseDirection`, `MmlApi.escape`,
  `PathPatternApi.match`).
- **Manager wrappers** — gates to a privileged singleton
  (`PersistApi`-equivalent helpers behind `PersistenceManager`).
- **Stuff orchestration** — operates on Stuff, threads polymorphic
  steps (`StuffApi`, `ContainmentApi`, `LocomotionApi`, `ZoneApi`).
  This is where the orchestration-vs-step decision bites.

### Where types live — colocate with the author

A type's "author" is whoever defines what fields, methods, or
variants it has. Types live with their author, never in a separate
shared barrel.

| Type describes... | Lives in |
|---|---|
| A mixin's public shape (`Containable`, `Sensor`, `Vocal`) | The mixin file in `lib/<subsystem>/` |
| A `lib/` class's surface or its value-object form (`LightBand`, `VisibilityDetail`, `VisionProfile`, `Unit`, `TagTableEntry`, `RecencyBucket`) | The class file in `lib/` |
| An Api's contract — inputs, outputs, options, accumulators (`CommandContext`, `StartResult`, `EmissionData`, `CreateBoundaryOptions`, `ShadowQuality`) | The Api file in `api/` |
| Cross-process wire format | `@saxonberg/types` |

No `types/` folder under `mud/`. The colocation rule keeps the contract
next to whoever can evolve it; a barrel would let any file scatter
new types anywhere and rot the authorship signal.

The recurring mistake to avoid: a type drifts to `api/` because
"the Api uses it first" — but the type describes a `lib/` concept
the Api just *consumes*. Move it back to where the concept is
authored, and `import type` it from the Api file.

### Dynamic imports as a cycle smell

`await import(...)` has two legitimate uses and one antipattern.

Legitimate:
1. **Loading authored content** — controller URLs, HMR module reloads,
   `StuffApi.loadClassByPath` resolving a template's `class:` field at
   runtime. These paths aren't in the static graph by design; the code
   they reach is content, not framework.
2. **Cycle-breaking at the `api/` layer** — when an Api orchestrator
   uses `instanceof X` against a `lib/` class that itself extends a
   class the Api references (`api/zone.ts` instanceof-checking
   `SpatialZone`, where `SpatialZone extends Zone` and `ZoneApi` is
   reachable from `Zone.lookupAncestorField`). Lazy-loading the
   subclass inside the method body is the correct fix; document the
   cycle with a comment so it isn't deleted later.

Antipattern:
3. **`lib/` dynamic-importing `api/` to take its next step.** This is
   inverted layering; the orchestration belongs above the polymorphic
   step. Fix by moving the orchestration up into the Api and calling
   the Api by static import from `lib/`.

When you find a `lib/` file with `await import('../../api/...')` inside
a method body, treat it as a refactor target, not an established
pattern.

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
`ContainmentApi`, `MqlApi`, `MqlSubscriptionApi`, `PromptApi`,
`MudlogApi`, `CommandApi`, `CommandLineApi`, `ProxyApi`,
`SecurityApi`, `ShadowApi`, `ExecutionContextApi`, `ModuleApi`,
`NavigationApi`, `PathPatternApi`, `ScheduleApi`, `SchedulerApi`,
`TemplateApi`, `ZoneApi`, `DescribeApi`, `MmlApi`, `PlayerApi`,
`PersistApi`-equivalent (no separate class today — persistence
helpers live on the relevant Apis directly).

`MqlSubscriptionApi` is the second wire channel alongside prose /
dispatch-response. Inbound `mql-subscribe` / `mql-unsubscribe`
messages route through `Application.processUserMessage` to the
substrate, which projects an MQL query's result + re-projects on
relevant state changes. Outbound envelopes ride the same
`MessageApi.sendEnvelope` path the dispatch-response framework uses.
See `docs/subsystems/mql-subscription.md`.

`PromptApi` is the third wire-side substrate. Server callers
`await` an interactive prompt (`choice` / `confirm` / `text` /
`mqlObject` / `mqlMany`); inbound `prompt-response` /
`prompt-cancel` messages route directly to the substrate (bypassing
the command bus); outbound envelopes ride the same
`MessageApi.sendEnvelope` channel as dispatch-response and
subscription deltas. Disconnect cleanup cancels MQL subscriptions
THEN prompts THEN removes the Interactive (so envelopes can
address the Interactive throughout the cancellation). See
`docs/subsystems/prompt.md`.

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
six top-level branches, each capturing a distinct role:

```
Stuff (base — runtime ID, FINAL destroy, construction sentinel)
  ├── Idea          incorporeal identity (Exit, Login, Zone, …)
  ├── Thing         portable physical item
  ├── Location      stationary place
  ├── Vessel        mobile place (Container + Containable)
  ├── Agent         sentient/active actor (Character → Avatar)
  └── Shadow        function-shadowing host — see call-security.md
```

Each branch lives in `lib/stuff/` and registers itself with `Stuff` at
module load via `Stuff._registerTopLevelBranch(BranchClass)`. The
registration is gated by a URL allowlist on `Stuff` — only those six
files may register, so the branch set can't be silently extended from
a subclass or a third-party file.

`Stuff`'s constructor walks the prototype chain at instance-creation
time and throws if no registered branch is found. Class-time work is
done once per class (cached); the per-instance cost is a single
WeakSet lookup. The error message lists the six branches and
points readers here.

> **Not a branch: `Document`.** Plain MongoDB-backed records (`User`,
> `GoogleProfile`, `Template`) extend `Document` (`lib/persistence/`),
> which is **not** in the Stuff hierarchy at all — no proxy, no
> registry, no lifecycle. A `Document` is value-like persisted state; a
> `Stuff` is an identity-like live entity *hydrated from* a Document.
> See [persistence.md](./subsystems/persistence.md).

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
- **Persisted records are NOT a branch.** Auth/CMS records (`User`,
  `GoogleProfile`, `Template`) are plain `Document`s, outside the Stuff
  hierarchy entirely — they only need to persist, not to participate in
  the world's method/event/shadow/perception machinery, so they don't
  pay the proxy/registry/lifecycle cost. (An earlier design made them a
  `Persistable extends Idea` branch; that's been retired — see
  [persistence.md](./subsystems/persistence.md).)

### What each branch composes

| Branch | Composition | Notes |
|---|---|---|
| `Idea` | `Stuff` | No spatial mixin. Default for incorporeal entities. |
| `Thing` | `ContainableMixin(Stuff)` | "I live somewhere." |
| `Location` | `ContainerMixin(Stuff)` | "I'm a place." Subclasses (`CartesianLocation`, `SphericalLocation`, …) layer on coordinate / Visible / Exitable mixins. |
| `Vessel` | `ContainerMixin(ContainableMixin(Stuff))` | Both Container AND Containable. `ExitableVessel` etc. layer on navigation. |
| `Agent` | `Stuff` | Subclasses (Character → Avatar) layer on Mobile / Container / Containable / Sensor / Vocal / etc. |
| `Shadow` | `Stuff` (abstract) | Framework-internal — not in-world Stuff. See [call-security.md](./subsystems/call-security.md). |

Persisted records (`User`, `GoogleProfile`, `Template`) are **not**
Stuff — they extend the standalone `Document` base
(`lib/persistence/`), loaded via `findById` / `find` rather than the
template/clone/hydrate pipeline, with none of the proxy/registry/
lifecycle machinery. See
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
| `lib/spatial/` | `ContainableMixin` | environment reference, plus the auxiliary `restingOn` pointer for on-surface placement |
| `lib/spatial/` | `SurfacedMixin` | "things rest on this" host-side marker; lazy `getResting()` walk; `userFacingDetail` MQL bridge; `canRest()` per-host gate. Requires Containable. |
| `lib/spatial/` | `MobileMixin` | `travel()` between locations (requires Containable) |
| `lib/spatial/` | `ExitableMixin` | exit map host; `addExit`, `getObviousExits`, etc. |
| `lib/location/` | `CartesianCoordinatesMixin` | `[x,y,z]` position carrier |
| `lib/location/` | `SphericalCoordinatesMixin` | `{rho,theta,phi,radius}` position carrier |
| `lib/location/` | `WarrenMemberMixin` | optional member-side back-ref to a `Warren` (the MultiLocation elastic-graph coordinator); Pattern-B live ref, Warren-owned. See [location.md](./subsystems/location.md). |
| `domain/lounge/` | `LoungeMixin` | lounge-room behavior (self-register, population witnesses, over-capacity re-seat); requires `WarrenMemberMixin`. A content mixin under `/domain/lounge/`, not the generic substrate. |
| `lib/spatial/` | `SealableMixin` | open/closed state (doors) |
| `lib/spatial/` | `DoorBearingMixin` | adds `door: Door \| null` for hosts whose exits are synthesized rather than authored (`ExitableVessel`). Constrained to `Stuff & Exitable`. |
| `lib/stuff/` | `SingletonMixin` | class-level uniqueness — refuses a second `clone()` for the same templatePath. Composed by `CartesianZone` / `SphericalZone`. |
| `lib/stuff/` | `PopulatesMixin` | declarative content-spawn for Container hosts; `populates:` instruction field lists templatePaths to clone (non-singletons) or singleton-resolve into self. Phase 2 applier. |
| `lib/message/` | `SensorMixin` | `handleMessage(frame)` notification hook |
| `lib/message/` | `VocalMixin` | `say(text)` with scope inference |
| `lib/command/` | `CommandGiverMixin` | `executeCommand`, `getAvailableCommands` |
| `lib/stuff/` | `PropertiedMixin` | controlled dynamic property bag, persistent |
| `lib/stuff/` | `PostRegistrationMixin` | opt-in `postRegister(context?)` lifecycle hook |
| `lib/persistence/` | `AroundSaveHookMixin` | middleware-style PM save hook |
| `lib/persistence/` | `AroundDeleteHookMixin` | middleware-style PM delete hook |
| `lib/connection/` | `HasInteractiveMixin` | "this Stuff has connected `Interactive`s" — `add`/`remove`/`getInteractives`/`isConnected`/`isLinkdead`. Composed by `Avatar` (multiplexing) and `Login` (singleton). |
| `lib/activity/` | `EngagedMixin` | actor-side engagement slot map (`body`/`hands`/`attention`/`voice`); runtime-only. `_setEngagement` / `_clearEngagement` are ApiOnly-gated; only `SchedulerApi` may mutate. Composed by `Character`. Provides the `cancel` verb and `stop` default alias. |
| `lib/biome/` | `AtmosphericMixin` | biome ref + atmospheric overrides (temperature/pressure/humidity/gravity/atmosphere) at room or per-Detail scope. Composed by `Location` and `Vessel`. See [biome.md](./subsystems/biome.md). |
| `lib/biome/` | `SkyExposedMixin` | trait stamp for biomes whose Locations look out on the open sky. Composed by `SkyExposedBiome`. |
| `lib/perception/` | `SmellSourceMixin` | "this Stuff emits an odor"; `getEmittedConcentration()` (ppm `Quantity`) + `getOdorIdentity()` (string). Composed by smelly Thing templates (candle, garlic, etc.) and fixture-side Adornments. See [senses.md](./subsystems/senses.md). |
| `lib/perception/` | `SoundSourceMixin` | "this Stuff emits sound"; `getEmittedAmplitude()` (dB `Quantity`) + `getSoundCharacter()` (string). Composed by noisy Thing templates and fixture-side Adornments. |
| `lib/augmentation/` | `AugmentMixin` | "this Stuff is an installable augment"; declares `confers(): readonly string[]` listing mixin names activated when installed. Wave 1 vocabulary surfaces `_augmentGated` / `_grantsModalities` on the mixins themselves. See [augmentation.md](./subsystems/augmentation.md). |
| `lib/message/` | `AetherMixin` | "this Stuff can transmit and receive over the Aether (non-acoustic comm network)". Augment-gated (`_augmentGated = true`); inert until `AetherImplant` confers it. Grants the `dm` verb (`tell`/`whisper` aliases) and contributes the `verbal-esp` / `emotive-esp` modalities to `PerceptionApi.sensorium`. |

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

- **Command YAML views**: `perception/look.yaml`, `social/say.yaml`,
  in `mud/cmd/<category>/` (grouped into category subdirs). Loaded
  recursively by `CommandApi`.

- **Command controllers**: in `mud/obj/command/<category>/`, e.g.
  `perception/LookController.ts`, `movement/GoController.ts`.

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
  - [persistence.md](./subsystems/persistence.md) — the `Document` base
    (plain records, not Stuff) vs Templates→Stuff,
    PersistenceManager, around-hooks
  - [lifecycle.md](./subsystems/lifecycle.md) — create/destroy
    choreography, construction sentinel, prepareDestroy
  - [state-model.md](./subsystems/state-model.md) — what gets
    persisted, Avatar self-contained, the `Document` track for records
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
