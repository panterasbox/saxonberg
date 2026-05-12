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
- [docs/ref-shapes.md](./docs/ref-shapes.md) — three reference shapes
  for fields pointing at other Stuff (Pattern A path-string for
  singletons, Pattern B live ref for within-session instances,
  Pattern C resolve-on-read for cross-scope singletons), the
  R2.1–R2.4 cleanup rules for live-ref fields, method-surface
  conventions, exemplars, antipatterns
- [docs/vision.md](./docs/vision.md) — product vision
- [docs/roadmap.md](./docs/roadmap.md) — what's left to build
- [docs/mql-grammar.md](./docs/mql-grammar.md) — MQL grammar
  reference for players / authors writing queries (seeds, chain
  operators, filters, pronouns, examples)
- Subsystem references in `docs/subsystems/`:
  - [templates.md](./docs/subsystems/templates.md) — clone pipeline,
    Hydrator, TemplateApi, folder/leaf invariant
  - [persistence.md](./docs/subsystems/persistence.md) — Persistable,
    PersistenceManager, around-save/delete hooks
  - [lifecycle.md](./docs/subsystems/lifecycle.md) — create/destroy
    choreography, construction sentinel, prepareDestroy
  - [state-model.md](./docs/subsystems/state-model.md) — what gets
    persisted, Avatar self-contained, Persistable in the Idea hierarchy
  - [connection.md](./docs/subsystems/connection.md) — login/logout
    flow, WebSocket upgrade, `Interactive`/`Login`/`Avatar` handoff,
    multiplexing, disconnect choreography
  - [messaging.md](./docs/subsystems/messaging.md) — MML, Scene
    composer, sensor routing, MudlogApi
  - [shell-environment.md](./docs/subsystems/shell-environment.md) —
    `EnvironmentMixin` settings keyspace, schema-on-mixin, lookup
    chain, `settings` / `var` commands, `resolveSetting` cross-host
    helper
  - [shell-alias.md](./docs/subsystems/shell-alias.md) — `AliasMixin`
    per-character verb aliases, lookup chain (defaults / persistent /
    session), tombstones, `ShellApi.expandAliases` algorithm with
    positional substitution + cycle guard, the `alias` player command
  - [prose.md](./docs/subsystems/prose.md) — `ProseApi` Liquid-based
    templating for authorable prose, Mml-aware output, default
    filters (Mml vocabulary, `GrammarApi`)
  - [call-security.md](./docs/subsystems/call-security.md) — proxy
    interception, decorators, policies, shadows, FrameKind
  - [properties.md](./docs/subsystems/properties.md) — PropertiedMixin,
    Property<T>, transient vs saved storage, access control patterns,
    masks (the unshadowable mixin's per-property override mechanism)
  - [command-routing.md](./docs/subsystems/command-routing.md) — YAML
    view + controller MVC, the per-giver recency stack, dispatch chain
    (shape vs bind, `pass: true`), validators, scope try-list,
    `updates_focus`, schema delivery via
    `system.commands.{added,removed,reset}`, frame attribution
  - [command-parsing.md](./docs/subsystems/command-parsing.md) —
    `CommandLineApi` tokenizer, `RawToken` classification, `format()`
    round-trip, the `msh` shell, parser pluggability via the
    `shell.parser` setting
  - [command-spec.md](./docs/subsystems/command-spec.md) — author
    guide for adding a verb: YAML field shape, controller
    conventions, validators, discovery wiring, the controller seed
    file
  - [mql.md](./docs/subsystems/mql.md) — MQL internals: pipeline
    (desugar / lex / parse / resolve), AST, scope-walk, predicates,
    pronoun memory, via augmentation, permission tiers, online
    provider seam, PathTrie
  - [mixins.md](./docs/subsystems/mixins.md) — class-factory mixins,
    `_mixinName` marker, `Mixins` registry, `MixinApi` predicates,
    composition order, persistence/command/security integration
  - [spatial.md](./docs/subsystems/spatial.md) — locations, zones
    (Cartesian/Spherical), vessels, coordinates, containment
    chokepoint, locomotion, direction vocabulary
  - [boundary.md](./docs/subsystems/boundary.md) — exits, doors,
    `Adornable` / `Adornment`, the `Boundary` substrate
    (`Boundary`, `BoundaryAnchor`, `Conduit` interfaces),
    `Window`, `ExitableVessel`. Everything that lives on the
    seams between containment scopes.
  - [light.md](./docs/subsystems/light.md) — Light value object,
    `LightApi` propagation walk (`lightAt`, `bandAt`,
    `perceivedBand`, `canSee`, `shadowsAt`), `AmbientLitMixin`,
    `LightSourceMixin`, the Boundary substrate (`Adornable`,
    `Adornment`, `Boundary`, `BoundaryAnchor`, `Conduit`
    interfaces), `Window`, the Door retrofit, per-viewer perception
  - [quantities.md](./docs/subsystems/quantities.md) —
    `Quantity<U>` substrate (Unit catalog, tag-table registry,
    same-unit math, parse/fromTag/Mml emission),
    `QuantityMarshaller` for persistence round-trip, the
    `static fieldMarshallers` and `initProp({ marshaller })`
    integration patterns. Cross-cutting substrate consumed by
    Light (lux/lumen/Kelvin), Material (kg/m³, g/mol), and
    Tangible (kg).
  - [perception.md](./docs/subsystems/perception.md) — viewer-aware-
    query pattern (`Stuff & Sensor` always explicit, never inferred
    from execution context), Shadow seam for per-viewer overrides
  - [collections.md](./docs/subsystems/collections.md) — canonical
    surfaces for collection-shaped mixins (Set / keyed Map / ordered
    list / property bag), mutator/predicate naming axes
  - [hot-reload.md](./docs/subsystems/hot-reload.md) — `HotReloadApi`
    state machine, `StuffApi.clone` integration, lifecycle events,
    controller dispatch (clone-per-execution), `reloadHookManifest`
  - [race.md](./docs/subsystems/race.md) — Material substrate
    (`TangibleMixin`, `MaterialApi`), Clade taxonomic scope,
    `BodyPlan` + `Species` templates, `OrganismMixin`, `SexedMixin`,
    `SpeciesApi` (kingdom resolution, lifecycle predicates,
    `isAnimate`), animacy gating at the command layer
  - [shell-workspace.md](./docs/subsystems/shell-workspace.md) —
    `WorkspaceMixin` cwd state (content + source trees),
    `workspace.tree` setting (`content` / `source` / `mirror`),
    `pickWorkspaceTree` helper, synthetic vars (`$PWD`, `$CPWD`,
    `$SPWD`, `$HOME`), read/write verb suite (`pwd`/`cd`/`ls`/
    `cat`/`grep`/`write`/`mkdir`/`rm`/`cp`/`mv`), `SourceTreeApi`
    sandboxed fs surface
  - [shell-author.md](./docs/subsystems/shell-author.md) —
    `AuthorMixin` lifecycle and code-execution verbs (`clone`,
    `reload`, `destruct`, `eval`, `teleport`), `EvalScript`
    Stuff-wrapped sandbox, `forceX` parallel-API force-bypass
    shape, eval singleton lifecycle, future `--save` / `--mixin` /
    `--extends`
  - [perceiver.md](./docs/subsystems/perceiver.md) —
    `PerceiverMixin` (look / scry / locate verbs on the actor),
    Sensor / Visible / Perceiver responsibility split,
    `ScryableMixin` capability seam in `lib/perception/`
  - [slot.md](./docs/subsystems/slot.md) — `Slotted` / `Slottable`
    substrate, three universe patterns (static / body-plan /
    dynamic), `accepts` + `fitsSlot`, capacity (incl.
    `UNBOUNDED_CAPACITY`), `SlotApi` reference, Detail-targeted
    resolution
  - [embodiment.md](./docs/subsystems/embodiment.md) —
    `Wearable` / `Wieldable` body-side affordances, per-body-plan
    `slotClaims`, multi-slot atomicity via `SlotApi.occupyAll`,
    wear/remove/wield/unwield verb suite
  - [posture.md](./docs/subsystems/posture.md) —
    `Postured` (host) + `Posed` (actor) + the `Postures` constants
    vocabulary, posture-bearing slot definition, floor adornments
    + per-Location authoring, sit/lie/stand/kneel verbs,
    atomicity invariant via `SlotApi.transferOccupancy`
  - [conveyance.md](./docs/subsystems/conveyance.md) —
    `Mountable` / `Drivable` / `SeatedDrivableMixin`, the
    `Mobile.traverse` conveyance ripple (depth-16 cycle guard),
    mount/dismount verbs, vehicle design space coverage
  - [locomotion.md](./docs/subsystems/locomotion.md) —
    `LocomotionMode` singletons (walk / climb / swim / fly / ride /
    drive / wheeled / sailed / aerial), `Climbable` / `Swimmable` /
    `Flyable` enablement mixins, `LocomotionApi` (mode resolution,
    eligibility cascade, engagement lifecycle, passthrough emission
    walk), per-mode verb controllers, `Exit.media`,
    `Mobile.engagedMode`, `Drivable.vehicularMode`,
    `BodyPlan.defaultLocomotionMode` chain

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

## Module Categories — DO NOT INVENT NEW ONES

Saxonberg has a fixed taxonomy of module types. Every TypeScript file
in `packages/server/src/mud/` falls into one of these. **If a new
file you're considering doesn't fit, STOP and discuss with the user
before creating it.** Cross-cutting helpers default to a new or
existing `Api` class — do not create free-floating helper modules.

| Category | Where | Filename | Purpose |
|---|---|---|---|
| Stuff class | `lib/<subsystem>/` or `obj/` | `PascalCase.ts` | Runtime classes extending Stuff/Idea/Thing/etc. |
| Mixin | `lib/<subsystem>/` | `PascalCase.ts` (no `Mixin` suffix) | Class-factory mixin; export `FooMixin`, marker `_mixinName = 'FooMixin'`. |
| Api | `api/` | lowercase `feature.ts` | Static utility class `FeatureApi`, ends with `SecurityApi.decorateApiClass(FeatureApi)`. The natural home for cross-cutting static helpers. |
| Controller | `obj/command/` | `PascalCaseController.ts` | Command controller (MVC pair with a YAML view in `mud/cmd/`). |
| Command YAML | `mud/cmd/` | lowercase `verb.yaml` | The view side of a command. |
| Hook | `obj/hooks/` | `PascalCaseHook.ts` | PM `aroundSave` / `aroundDelete` hooks. |

"Pure helper functions that don't need security" is NOT a reason to
dodge the Api pattern — Apis hold static utility methods perfectly
well, and the security decoration is cheap. Same for refactor splits:
extracting helpers into a new free-floating file is the same anti-
pattern as inventing one from scratch.

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

**Hard constraints**: two things rule out `#` regardless of which
layer the file lives in:

1. **Persistent fields** — the `Hydrator` reflects into them by name,
   and `#` slots aren't reachable from outside the class body. Use
   public (or TypeScript `private` if the persistence layer were
   refactored to use a friend-class hatch, which it isn't today).
2. **Mixin instance state on Stuff hosts** — every Stuff is wrapped
   in the call-security `Proxy`, and instance method dispatch goes
   through `method.apply(proxy, args)`. Inside the method, `this` is
   the proxy. `#`-private slots live on the raw target only, so any
   `this.#foo` access from a method called through the proxy throws
   `Cannot read private member from an object whose class did not
   declare it`. Use TypeScript `private` (with a `_` prefix when the
   field is part of a sealed-mutation surface a sibling Api needs to
   reach via cast). The seal comes from `@Final @Unshadowable` on
   the methods that own the field, NOT from `#`.

   **Static fields on Api classes are fine with `#`** — Api methods
   are static, so there's no instance proxy receiver in play.

The "domain code defaults to TypeScript modifiers" rule is a
consequence of (2) — even if `#` were tempting for a mixin's
internal cache, the proxy makes it unworkable.

## Inter-Stuff Contract: Methods Only

Privacy modifiers say what the *compiler* enforces. The **inter-stuff
contract** says what *external code* may use. The two are related but
not the same — even `public` fields are off-limits when the reader is
another `Stuff`.

The rule:

- **Methods are the contract surface between Stuff objects.** Other
  Stuff reads and writes via `obj.getFoo()` / `obj.setFoo(x)`, never
  `obj.foo`.
- **Fields and accessor pairs are host-internal.** Internal class
  code touches `this._foo` (or `this.foo` if the accessor lives on
  the same name) directly — that's not the contract.
- **Hydrator is the framework carve-out.** It reflects into persistent
  fields by name to populate them from storage. Nothing else
  outside the host's class body does the same.

### Why methods

The shadow framework dispatches **methods only**. Reading `obj.foo`
where `foo` is a field bypasses the proxy entirely; reading an
accessor pair runs the security gate but never finds a shadow because
accessors are filtered out of the intercept set; setters have no
proxy trap at all. Buffs, polymorph effects, hood/disguise shadows,
audit interceptors — none of them see field-shaped access. Methods
are the only stable extension point.

The corollary: when an invariant has to fire on every write, the
accessor pair (`get foo()` / `set foo()`) is still the right tool —
it's just not external surface. The public `setFoo()` method
delegates to the accessor; outside callers never see the accessor
form.

### What this means in practice

| Sense | Inside the class body | Other Stuff |
|---|---|---|
| Read | `this._foo` (or `this.foo` if accessor-shaped) | `other.getFoo()` |
| Write | `this._foo = v` (or `this.foo = v` to fire the accessor) | `other.setFoo(v)` |
| Persistence (Hydrator) | n/a | `instance['foo'] = stored` (framework carve-out) |

Test code is treated like other Stuff: tests that need to inspect
internals should reach for the host's public method surface, not
field/accessor access. When a test genuinely needs raw state, the
seam is `Stuff.RAW_TARGET` plus a comment explaining why.

For mixins that own collections (a `Set`, a keyed `Map`, an ordered
list), the canonical method surface — `addX` / `removeX` / `hasX` /
`getXs` and the variations — is documented in
[collections.md](./docs/subsystems/collections.md). Pick the shape
that fits the underlying storage and stick to its surface.

This is a graduated rule. The current codebase still has `obj.field`-
style call sites; migration is mechanical and lands as a separate
sweep. New code goes on the new pattern.

## Go Through the API Layer

Several recurring rules collapse into one principle: **never call into
internal mechanism directly when an Api method exists for the same
job**. The Api layer threads through the security gate; direct calls
bypass it. Common cases:

| Don't | Do |
|---|---|
| `obj.destroy()` | `StuffApi.destruct(obj)` |
| `new SomeStuff()` | `await StuffApi.create(() => new SomeStuff())` or `await StuffApi.clone(path)` |
| `item.setContainer(c); c.addContainable(item)` | `ContainmentApi.move(item, c)` |
| `typeof obj.getContents === 'function'` | `MixinApi.isContainer(obj)` (narrow) or `MixinApi.hasMixin(ctor, Mixins.Container)` (introspect) |
| `obj.fullName ?? obj.name ?? 'something'` | `DescribeApi.getDisplayName(obj, 'something')` |
| `creature.move(loc)` (raw containment) | `LocomotionApi.traverseWithDefault(actor, exit)` (default-mode dispatch via `defaultModeFor` chain) or `LocomotionApi.engageAround(actor, mode, exit, action)` (known mode + engagement bookkeeping) |
| `actor.setEngagedMode(mode); await actor.traverse(exit, …); if (transient) actor.setEngagedMode(null)` | `LocomotionApi.engageAround(actor, mode, exit, action)` — handles transient/persistent decision + error-path cleanup |
| `resolveSetting(actor, 'movement.defaultMode') ?? 'walk'` | `LocomotionApi.defaultModeFor(actor)` — three-tier chain: explicit setting → bodyplan default → universe 'walk' (the raw resolveSetting skips the bodyplan layer for NPCs) |
| `avatar.gold = 100` (direct field assignment for dynamic state) | `avatar.setProp(Property.of<number>('gold'), 100)` (PropertiedMixin) |
| `(stuff as unknown as { templatePath? }).templatePath` | `stuff.getTemplatePath()` (runtime stamp). For `Template` docs use `template.path` — the two are distinct. |
| `(stuff as { templatePath? }).templatePath = path` | `stuff.setTemplatePath(path)` (ApiOnly-gated, re-keys `byTemplatePath`). The slot is hard-private (`#templatePath`); bracket-writes are runtime no-ops. Clone-pipeline pre-register stamps use the caller-allowlisted `Stuff._stampTemplatePath` seam. |
| `(stuff as { zone? }).zone = z` | `stuff.setZone(z)` (gated by `FromSpatialZone` — only `SpatialZone` subclasses may call). Slot is hard-private (`#zone`); bracket-writes are runtime no-ops. Clone-pipeline pre-register stamps use the caller-allowlisted `Stuff._stampZone` seam. |
| `other.foo` / `other.foo = x` from another Stuff | `other.getFoo()` / `other.setFoo(x)` — see "Inter-Stuff Contract" above |

Full list with examples: [docs/antipatterns.md](./docs/antipatterns.md).

Some specific reminders worth keeping in front of mind:

- **Destroy via `StuffApi.destruct(obj)`** — never override `destroy()`.
  Use the `onDestruct()` witness for cleanup, `canDestruct()` to veto.
  Enforced at runtime by
  `@CallSecurity(SecurityPolicies.ApiOnly)` + `@Final` + `@Unshadowable`
  on `Stuff.destroy()`. `Stuff.onDestruct()` ships a no-op terminal
  so subclasses can `super.onDestruct()` without ceremony — see
  [antipatterns.md § Cast-Chain to `super`](./docs/antipatterns.md).
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
