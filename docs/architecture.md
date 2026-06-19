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
- **Named value-object / vocabulary / registry modules** — the
  sanctioned home for a substrate primitive that isn't an instanceable
  `Stuff` but is still *the concept the module exists for*: a value
  class (`Light`, `Quantity`, `Reserve`), an enum-like vocabulary plus
  its validation array, or a platform-wide registry (`lib/mixin.ts`'s
  `Mixins`, `lib/paths.ts`'s `TemplatePaths`). This is the fourth
  category named so that an orphan type/constant has a home other than
  the forbidden `types.ts` / `constants.ts` reflex — see
  "One concept per module" below.

`api/` holds:
- **Pure utilities** — no Manager, just functions
  (`NavigationApi.parseDirection`, `MmlApi.escape`,
  `PathPatternApi.match`).
- **Manager wrappers** — gates to a privileged singleton
  (`PersistApi`, the call-security chokepoint over `PersistenceManager`).
- **Stuff orchestration** — operates on Stuff, threads polymorphic
  steps (`StuffApi`, `ContainmentApi`, `LocomotionApi`, `ZoneApi`).
  This is where the orchestration-vs-step decision bites.

> **`api/` is functions + the types they speak — nothing instanceable.**
> An `api/` file exports its static `FooApi` class and the call-shape
> types its signatures use, and nothing else. Value/builder classes,
> collections, and error classes that once lived in `api/` are `lib/`'s
> domain, concept-colocated, re-exported (value re-export) from the
> face so callers still reach them through the Api: `Scene` →
> `lib/message/Scene.ts`, `Mml` → `lib/message/Mml.ts`, `Prose` →
> `lib/prose/Prose.ts`, `PathTrie` → `lib/collections/PathTrie.ts`, and
> the error classes (`ContainmentError`, `PromptCancelledError`,
> `SourceTreeSandboxError`, `TemplateError`) to their concept's `lib/`
> module. Domain-concept *types* are likewise *defined* in `lib/` with
> their concept and re-exported type-only from the face; only pure
> call-shapes with no domain home (the `ScheduleHandle` precedent) are
> defined in the api file.

### The Api ↔ logic-singleton split

An `Api` carries identity three ways an unsettled organizational layer
shouldn't — it holds the logic, it anchors the generated docs, and it's
where types live. The surface-architecture refactor relocates all three
so the `Api` becomes what it actually is: a **thin, typed, secured
forwarding shell**. Each convertible Api's public statics forward to a
stateless `Stuff` **logic singleton** that holds the implementation:

```
FooApi (api/foo.ts)              static forwarders + decorateApiClass + types
   ↓  StuffApi.singletonSync('/obj/api/foo', factory)
FooLogic (obj/api/FooLogic.ts)   the logic — a stateless Stuff, @internal,
                                 instance methods gated to FooApi, HMR-able
```

The logic singleton is a `Stuff` (a runtime class, so `obj/api/`),
extends `Idea`, composes **no** `PostRegistrationMixin` (statelessness
is load-bearing — `dest` is the reload invalidator), is marked
`@internal` *on the class declaration*, and gates each public method
`@CallSecurity(FromModule('mud/api/<feature>#<Feature>Api'))`. Protected
internal logic that used to crowd the Api's TypeDoc surface now lives
here, off the documented surface. See
[hot-reload.md § Api logic singletons](./subsystems/hot-reload.md#api-logic-singletons-objapifeature)
for the HMR mechanics and
[call-security.md § The api↔logic-singleton recipe](./subsystems/call-security.md#the-apilogic-singleton-recipe)
for the gating recipe (per-method gate, self-call gotcha, the `ApiOnly`
widening). A handful of bootstrap-cycle and bootstrap-special Apis stay
static classes (documented in call-security.md).

### One concept per module — definition site vs import site

A module exists to define exactly one **named concept**; the filename is
that concept's name; the concept is the primary export. Every other
export is a supporting member of that one concept — the types its surface
speaks, the constants it's parameterized by. A type or constant is never
itself the reason a module exists (unless the concept *is* a value object
/ registry — then the module is named for it). `types.ts`,
`constants.ts`, and barrel `index.ts` are forbidden by construction on
the consumed surface.

This separates two questions that the old "where does this type live?"
debate conflated:

- **Definition site** is dependency-driven — a type may be *defined* on a
  cycle-breaking dependency leaf, wherever the runtime graph forces it.
- **Import site** is the *face*: any author-facing type is re-exported
  (type-only — erased, no runtime edge, can't cycle) from *every* Api or
  mixin whose signature speaks it. "Look where you'd use it" always
  finds it; you never have to out-guess a canonical home.

Constants are the asymmetry: a re-exported constant is a runtime value
(a real `api → definition` edge that *can* cycle), so **constants are
placed, not re-exported**. See [antipatterns.md](./antipatterns.md) for
the `<Concept><Role>` naming rule that lets you guess a type's face from
a bare name.

### Export discipline & the sanctioned-exception registry

The surface is now normalized: **every module exports classes and types
only** — the one concept it defines (a class) plus the types and
constants its surface speaks. **There are no free-floating exported
helper functions.** A would-be helper folds into the owning `Api` (as a
static method), the owning class, or a value-object — never a loose
`export function`. This is what makes the whole surface discoverable and
what feeds the `help`/doc system: *callable == visible == cared-about*.

Three kinds of exported function are **recognized categories**, not
exceptions — they're how those categories are spelled:

1. **Mixin factories** — `export function FooMixin(Base)` in
   `lib/<subsystem>/`. The mixin module category (the `Mixin` name suffix
   is the marker the lint keys on).
2. **Decorators** — the factories in `lib/security/decorators.ts`
   (`CallSecurity`, `Unshadowable`, `Final`, `Shadowing`,
   `ShadowSecurity`) and `lib/security/RequiresActive.ts`. A decorator is
   a function by nature; these two files are the decorator homes.
3. **Sealed-subdir pipeline internals** — `api/mql/**` and `api/mml/**`
   are an Api's private impl package: only the parent face (`api/mql.ts`
   / `api/mml.ts`) may import them (a separate `no-restricted-imports`
   rule enforces the seal), so inside the seal they're ordinary modules
   that export functions freely.

Beyond those, a genuine **ad-hoc exception** must be marked **at its
site** with `eslint-disable-next-line no-restricted-syntax -- <reason>`.
The disable comments *are* the registry — grep
`no-restricted-syntax` under `src/mud/{api,lib}` to enumerate the live
set. Two kinds are recognized:

- **Test-only white-box exports** — a function exported solely so a
  white-box unit test can exercise an internal stage. Today:
  `api/prompt.ts#buildPromptContext`,
  `api/command.ts#validatePhaseEffect`/`collectPhaseEffects`,
  `api/mql-subscription.ts#resolveFieldSet`/`collectSubscribableFields`/`projectFocus`,
  `lib/command/parsers/msh.ts#detectEmotePrefix`/`stripEmotePrefix`,
  `lib/description/Visible.ts#senseStripAugmenter`.
- **DI injection seams** — a backend→mudlib wiring slot a free function
  fills at boot. Today: `lib/connection/HasInteractive.ts#setClientStateUpdatePush`.

**Enforcement.** Two ESLint rules (`.eslintrc.js`): `api/*.ts` bans
exported functions / function-consts; `lib/**/*.ts` bans the same,
exempting `*Mixin` factories by name and the two decorator files by
path. Both opt out only via an `eslint-disable` + justification. (The
gate-string resolver and the sealed-subdir rule round out the
[lint family](#cross-references).)

**The ask-first rule.** Introducing a *new* exception — anything that
needs a fresh `eslint-disable no-restricted-syntax`, or a file that
doesn't fit the [module taxonomy](#) — is a drift risk by definition.
**Do not add one autonomously: surface it to the user and get explicit
sign-off first**, then record it here with its reason. The lint failing
on a new exported helper is the tripwire that forces this conversation.

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

> **Definition vs import, restated for types.** The table above is the
> *definition* site (the author's module). The *import* site for any
> author-facing type is the **face** — re-exported type-only from every
> Api/mixin that speaks it (see "One concept per module" above). Where a
> dependency cycle forces a type's definition off its conceptual home,
> it still re-exports from the face, so consumers never chase it.

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
`TemplateApi`, `ZoneApi`, `MmlApi`, `PlayerApi`,
`PersistApi` (the gated chokepoint over `PersistenceManager`,
`lint:pm`-locked — see [persistence.md](./subsystems/persistence.md)),
`RenownApi`, `ForumsApi`, `SubjectApi` (the latter two each forwarding
to a `ForumsLogic` / `SubjectLogic` logic singleton; see
[forums.md](./subsystems/forums.md)).

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
  ├── Agent         runtime active object (Creature → Character → Avatar)
  └── Shadow        function-shadowing host — see call-security.md
```

Under `Agent` the hierarchy splits **body** from **agent**:
`Agent → Creature → Character → Avatar`. `Creature` (`lib/creature/`)
is the body layer — a living physical thing that can break, with or
without agency: it carries `OrganismMixin` + `VitalsMixin` +
`ReservedMixin` + `MetabolicMixin` (intake/chemistry driver, outer of
vitals/reserve) + `RespirationMixin` (the air-exchange / `spo2` death
driver, outer of metabolism) + `ThermalMixin` + `ThermalRegulationMixin`
(the heat-exchange substrate + Option-C body driver, outer of
respiration/metabolism; drives `coreTemperature`) + `LoadBearingMixin`
(the encumbrance gauge, outermost) + `DisguisableMixin` (creature
masking, outer of `Visible`) + the anatomy-slot / posture / description /
containment mixins. `Character`
extends it with the **agency** mixins (commands, perception, speech,
movement, engagement) + the social-identity mixins (`PersonaMixin`,
`GenderedMixin`) + the per-viewer concerns (`BeliefStoreMixin`,
`StatusMixin`). The split exists because **vitals are
body-state, not agent-state** (a corpse / sessile animal is a body with
reduced agency) — see [vitals.md](./subsystems/vitals.md). The identity
line is sex (body, `SexedMixin` on Creature) vs. gender/persona (social,
on Character). `Creature` is concrete, so a bare non-agent body (a frog,
a corpse) is valid.

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

Persisted records (`User`, `GoogleProfile`, `TwitchProfile`, `Template`,
and the forums-build records `Subject` / `Board` / `Entry` / `Vote` /
`ForumEvent`) are **not** Stuff — they extend the standalone `Document`
base (`lib/persistence/`), loaded via `findById` / `find` rather than the
template/clone/hydrate pipeline, with none of the proxy/registry/
lifecycle machinery. See
[subsystems/persistence.md](./subsystems/persistence.md). The forums
build also adds two singleton registries — `SubjectCatalogue` (the
Subject-layer index) and `ForumSubscriptionRegistry` (the `forum_events`
document-change observer) — and the `ForumsUpdate` `AetherHosted`
implant carrying `ForumsMixin`; see [forums.md](./subsystems/forums.md).

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
| `lib/command/` | `CommandGiverMixin` | `executeCommand`, `getAvailableCommands`, `getAffordances` |
| `lib/stuff/` | `PropertiedMixin` | controlled dynamic property bag, persistent |
| `lib/stuff/` | `PostRegistrationMixin` | opt-in `postRegister(context?)` lifecycle hook |
| `lib/persistence/` | `AroundSaveHookMixin` | middleware-style PM save hook |
| `lib/persistence/` | `AroundDeleteHookMixin` | middleware-style PM delete hook |
| `lib/connection/` | `HasInteractiveMixin` | "this Stuff has connected `Interactive`s" — `add`/`remove`/`getInteractives`/`isConnected`/`isLinkdead`. Composed by `Avatar` (multiplexing) and `Login` (singleton). |
| `lib/activity/` | `EngagedMixin` | actor-side engagement slot map (`body`/`hands`/`attention`/`voice`); runtime-only. `_setEngagement` / `_clearEngagement` are ApiOnly-gated; only `SchedulerApi` may mutate. Composed by `Character`. Provides the `cancel` verb and `stop` default alias. |
| `lib/biome/` | `AtmosphericMixin` | biome ref + atmospheric overrides (temperature/pressure/humidity/gravity/atmosphere) at room or per-Detail scope. Composed by `Location` and `Vessel`. See [biome.md](./subsystems/biome.md). |
| `lib/biome/` | `SkyExposedMixin` | trait stamp for biomes whose Locations look out on the open sky. Composed by `SkyExposedBiome`. |
| `lib/address/` | `AddressableMixin` | optional `_address` declaration (Pattern-A path string) placing a host in the addressing namespace; sparse, `null`-default. Read by the `AddressApi` resolve-walk; not a ref-resolver (resolution is the Api's job). Composed by `Location`. See [address.md](./subsystems/address.md). |
| `lib/perception/` | `SmellSourceMixin` | "this Stuff emits an odor"; `getEmittedConcentration()` (ppm `Quantity`) + `getOdorIdentity()` (string). Composed by smelly Thing templates (candle, garlic, etc.) and fixture-side Adornments. See [senses.md](./subsystems/senses.md). |
| `lib/perception/` | `SoundSourceMixin` | "this Stuff emits sound"; `getEmittedAmplitude()` (dB `Quantity`) + `getSoundCharacter()` (string). Composed by noisy Thing templates and fixture-side Adornments. |
| `lib/augmentation/` | `AugmentMixin` | "this Stuff is an installable augment"; declares `confers(): readonly string[]` listing mixin names activated when installed. Wave 1 vocabulary surfaces `_augmentGated` / `_grantsModalities` on the mixins themselves. See [augmentation.md](./subsystems/augmentation.md). |
| `lib/augmentation/` | `AetherHostedMixin` | the *update* side of the aether hosting relation: a `getHost`/`setHost` back-ref + the must-be-hosted invariant, composed around an `Idea` (the incorporeal capability base). Co-composed with a capability mixin on an update class (`CommsUpdate`, `TravelCredentialUpdate`). See [augmentation.md](./subsystems/augmentation.md). |
| `lib/message/` | `AetherMixin` | **attunement** + the aether **host**: perceive the Aether (contributes the `verbal-esp` / `emotive-esp` modalities to `PerceptionApi.sensorium`) and host capability *update* `Idea`s (`getHostedUpdates` + sealed `hostUpdate`/`unhostUpdate` chokepoints). Augment-gated (`_augmentGated = true`); conferred by the `AetherImplant` **or** intrinsically by `Species.innateMixins`. No longer carries transmission — that moved to `CommsMixin`. See [augmentation.md](./subsystems/augmentation.md). |
| `lib/comms/` | `CommsMixin` | the comms transmission capability (the `dm`/`reply`/`broadcast`/`chat` verb family + DM cohort state), composed on a hosted update (`CommsUpdate`). `tell` sends on behalf of its host (the operator) via `getHost()`. See [comms.md](./subsystems/comms.md). |
| `lib/vitals/` | `VitalsMixin` | body-state: vital-sign `Quantity` fields, per-species survivable-band lookup, derived `getConditionBand` / `getConsciousness` (computed, never stored), the anatomy resolver, the active-condition collection, and the death/consciousness seams. Requires `OrganismMixin`. Composed by `Creature`. See [vitals.md](./subsystems/vitals.md). |
| `lib/reserve.ts` | `ReservedMixin` | a keyed collection of `Reserve` capacity axes (decomposed-scalar persistence). Biological reserves (endurance/satiation/hydration) + the authored-thematic seam (mana is content). Composed by `Creature`. See [reserve.md](./subsystems/reserve.md). |
| `lib/encumbrance/` | `LoadBearingMixin` | the carry-weight gauge (first vitals driver): derived-on-read `getBorneBurden` (weighted walk over contents + slot occupants with `Vessel.transmissionFactor` + slot-derived placement coupling) / `getCarryCapacity` (body mass × physiology margins) / `getLoadRatio` / `wouldExceedCeiling` / `drainForTraversal`. Requires `Container + Slotted + Tangible + Reserved + Vitals`. Composed outermost by `Creature`. See [encumbrance.md](./subsystems/encumbrance.md). |
| `lib/belief/` | `BeliefStoreMixin` | per-viewer identity memory: a realm-namespaced (`recognition` / `identification` / `regard`) keyed bag of `BeliefRecord`s, dumb CRUD, keyed by referent `templatePath`. The in-memory working set behind `RecognitionApi.describe` (naming) and `RegardApi`/`RegardLogic` (per-viewer attitude scalar); backed by `BeliefDocument` rows (`api/belief.ts`). Composed by `Character`. See [belief.md](./subsystems/belief.md). |
| `lib/status/` | `StatusMixin` | settable activity-status line feeding the presentation decoration ("Gus, the crossing guard, watching the empty road"); verb / runtime-setter / static-authored-default sources, only the default persists. Composed by `Character`. See [belief.md](./subsystems/belief.md). |
| `lib/disguise/` | `DisguisableMixin` / `DisguiseBearingMixin` | creature masking. `DisguisableMixin` (on `Creature`) resolves a viewer-blind `getDisguise()` over worn `DisguiseBearing` garments + a transient imposed slot; `Stuff.getPresentation()` defers to it. `DisguiseBearingMixin` (on a `Garment` → `DisguiseGarment`) carries the `{ appearsAs, covers, masksIdentity }` descriptor. See [belief.md](./subsystems/belief.md). |
| `lib/identification/` | `IdentifiableMixin` | the type axis: an item whose true type (`identifiedName`) is hidden behind its unidentified appearance until a viewer identifies it. Composed by `IdentifiableThing`; the `IdentifyScroll` carries the `identify` verb. See [belief.md](./subsystems/belief.md). |
| `lib/metabolism/` | `MetabolicMixin` | the intake-and-chemistry driver (first condition-driver): the digestion buffer + real `ingest`, the lazy reconcile-on-read over `WorldClock` game-time (absorption / mass-scaled basal drain / coupled recovery / toxin clearance), the cascade spawning `floorEffect` conditions + the death seam, the presence-freeze clock, and the toxin-burden + alcohol/BAC system. Drives `Vitals`/`Reserved`/`Posed`; composed inner of `LoadBearing`, outer of those three, by `Creature`. No Api. See [metabolism.md](./subsystems/metabolism.md). |
| `lib/metabolism/` | `NutritionLabelMixin` | opt-in consumable affordance: appends an edible `Material`'s inspectable nutrition profile to the host's long description via the `markupAugmenter` seam. Composed by content onto labelled consumables (not every Stuff). See [metabolism.md](./subsystems/metabolism.md). |
| `lib/respiration/` | `RespirationMixin` | the air-exchange driver and the first concrete engagement producer: an event-triggered bounded `RespirationDrain`/`RespirationRecovery` `SustainedEngagement` that drives `Vitals.spo2` past the consciousness floor to the anoxia death seam when the surrounding medium is unbreathable (drowning / vacuum), then recovers on return to air. Reads `BodyPlan.breathableMedia` (water-breather inversion) + the biome `breathable` column; W2 taps a worn `AirTank` `Bulkable`. Composed outer of `Metabolic` by `Creature`. No Api. See [respiration.md](./subsystems/respiration.md). |
| `lib/thermal/` | `ThermalMixin` | the generic heat-exchange capability: lazy Newton's-cooling-on-read (mirrors `Metabolic`) with a **sync** `getTemperature()` via a cached ambient refreshed at re-stamp events (`onMoved` / ambient-shift fan-out / seal toggle / bulk transfer); τ = R·C from `Tangible` mass × `Material` specific heat + the medium/wall conductivity series; a sealed `Sealable` host → vacuum barrier. Composed by any Tangible+Containable Stuff (`Receptacle`/`Flask`/`Campfire`) and by `Creature` (corpse algor mortis). No Api. See [thermal.md](./subsystems/thermal.md). |
| `lib/thermal/` | `ThermalRegulationMixin` | the Option-C body driver: overrides `getVitalSign` (sync, cached effective ambient) to **drive** `coreTemperature` — pin at setpoint within the thermoneutral band, else spend satiation (cold) / hydration (hot, wet-bulb-capped) to defend it, fail into passive `Thermal` drift; endo/ecto split (`BodyPlan.thermalStrategy`) + Q10; the hypothermia/hyperthermia/torpor cascade → death seam. Composed over `ThermalMixin`/`Metabolic`, inner of `LoadBearing`, by `Creature`. No Api. See [thermal.md](./subsystems/thermal.md). |
| `lib/forums/` | `ForumsMixin` | the forums transmission capability (post / reply / vote / subscribe verb family), composed on a hosted update (`ForumsUpdate`). Born-with: the `ForumsUpdate` is an `AetherHosted` implant conferring this mixin, granted at intake. Acts on behalf of its host via `getHost()`. See [forums.md](./subsystems/forums.md). |
| `lib/forums/` | `SubjectSubscriberMixin` | per-Avatar forum-subscription storage: the keyed set of subscribed `Subject`s feeding the `ForumSubscriptionRegistry` fan-out. Composed by `Avatar`. See [forums.md](./subsystems/forums.md). |

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
| `obj.fullName ?? obj.name ?? 'something'` | `obj.getPresentation()` |
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
