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
- [docs/deployment.md](./docs/deployment.md) — deployment & infra:
  single Lightsail box + Caddy/Let's Encrypt + Mongo Atlas, GitLab CI
  (validate + Pages; deploy at standup), config via SSM Parameter Store
  (deploy-time materialization, local stays `.env`), cost model, the
  AWS cleanup record, and the one-time standup runbook
- [docs/workflow.md](./docs/workflow.md) — feature-cycle process:
  slate → requirements → plan → build → MR iteration → pre-merge
  sweep → merge. Defines the artifact taxonomy
  (slate/requirements/plan/subsystem), their lifetimes, and the
  retirement rules at sweep time. Skills under `.claude/skills/`
  (`/requirements`, `/mr-iterate`, `/finalize`) are thin entry
  points to phases of this loop.
- [docs/mql-grammar.md](./docs/mql-grammar.md) — MQL grammar
  reference for players / authors writing queries (seeds, chain
  operators, filters, pronouns, examples)
- Subsystem references in `docs/subsystems/`. Each doc is the source
  of truth for its area — read it before editing.
  - [templates.md](./docs/subsystems/templates.md) — clone pipeline, Hydrator, TemplateApi, folder/leaf invariant
  - [persistence.md](./docs/subsystems/persistence.md) — `Document` base vs Templates→Stuff, PersistenceManager, around-save/delete hooks, collections
  - [lifecycle.md](./docs/subsystems/lifecycle.md) — create/destroy choreography, construction sentinel, onDestruct
  - [state-model.md](./docs/subsystems/state-model.md) — what gets persisted; Avatar self-contained, Document track for auth/meta
  - [connection.md](./docs/subsystems/connection.md) — login/logout, WebSocket upgrade, Interactive/Login/Avatar handoff, multiplexing
  - [char-gen.md](./docs/subsystems/char-gen.md) — new-player intake: roster-vs-char-gen branch, `enroll` as a field-keyed draft state machine, Login-as-CommandGiver+Sensor accumulator, commit/spawn atomicity, server-owns-draft/client-owns-layout, species dossier + NameBank + PersonaMixin, cockpit phases
  - [client-shell.md](./docs/subsystems/client-shell.md) — the *client* front-door subsystem: the in-world frame primitives (ConnectionIndicator/AccountMenu/Portrait, shared-not-wrapped), the plain-UI start screen + data-shaped provider list, the anonymous-guest path (`/auth/guest` ephemeral principal vs Avatar `isGuest`; `Login.mintRandomGuestAvatar` randomized mint-on-Enter, reaped on disconnect, persists nothing), `HasInteractiveMixin.getPortraitUrl()` resolve-on-read, and the three-state connection-loss machine (backoff/input-gating/ReconnectBanner)
  - [messaging.md](./docs/subsystems/messaging.md) — MML, Scene composer, sensor routing, MarkupAugmenter, Vocal/Aether/Soul capability split
  - [message-rendering.md](./docs/subsystems/message-rendering.md) — end-to-end rendering: server MML extensions + client parseMml/MmlRenderer + theme/overlay cascade
  - [media.md](./docs/subsystems/media.md) — non-text renderable content: `Visible.illustration` key field → MQL projection → client `mediaUrl()`/`MEDIA_BASE_URL`; `MediaAsset` provenance Document; model-driven gpt-image-1 generation pipeline (Potter house style, S3); char-gen species portraits; deferred external embeds (Twitch/video)
  - [topics.md](./docs/subsystems/topics.md) — `Topic` template docs, TopicCatalogue singleton, three-tier resolution, session-establish wire push
  - [emotes.md](./docs/subsystems/emotes.md) — SoulMixin on every Character, Emote Document + EmoteGrammar, SoulCatalogue + SoulApi, three dispatch paths
  - [grouping.md](./docs/subsystems/grouping.md) — GroupApi facade over three GroupProvider impls (managed/MQL/contacts), GroupRef typed strings
  - [comms.md](./docs/subsystems/comms.md) — two-transport speech substrate: acoustic VocalMixin (say/whisper/shout + `--to`, acousticDb) vs implant AetherMixin (dm/tell), verb surface, ties to messaging/chat
  - [chat.md](./docs/subsystems/chat.md) — Channel Document with groupRef, three kinds, ChannelCatalogue, chat.yaml subcommand fallthrough
  - [contacts.md](./docs/subsystems/contacts.md) — ContactsMixin on Avatar, per-Avatar named lists, durable identifiers only, owner-only privacy
  - [shell-environment.md](./docs/subsystems/shell-environment.md) — EnvironmentMixin settings keyspace, schema-on-mixin, lookup chain, `settings`/`var`
  - [shell-alias.md](./docs/subsystems/shell-alias.md) — AliasMixin per-character verb aliases, lookup chain, ShellApi.expandAliases, `alias` verb
  - [prose.md](./docs/subsystems/prose.md) — ProseApi Liquid-based templating, Mml-aware output, default filters
  - [call-security.md](./docs/subsystems/call-security.md) — proxy interception, decorators, policies, shadows, FrameKind, FromController narrow-entry
  - [access.md](./docs/subsystems/access.md) — AccessApi thin facade over AccessRegistry; four predicates, Zone.ownerGroup/accessGroups, narrow-entry pattern
  - [properties.md](./docs/subsystems/properties.md) — PropertiedMixin, Property<T>, transient vs saved storage, access control, masks
  - [command-routing.md](./docs/subsystems/command-routing.md) — YAML view + controller MVC, per-giver recency stack, dispatch chain, validators, phase-effects, affordance attribution (`getAffordances`/`commandSource` — what afforded each verb)
  - [command-parsing.md](./docs/subsystems/command-parsing.md) — CommandLineApi tokenizer, RawToken classes, `format()` round-trip, `msh` shell, parser pluggability
  - [command-spec.md](./docs/subsystems/command-spec.md) — author guide for adding a verb: YAML shape, controller conventions, validators, discovery wiring
  - [mql.md](./docs/subsystems/mql.md) — MQL internals: pipeline, AST, scope-walk, predicates, pronoun memory, online provider seam, PathTrie
  - [mql-subscription.md](./docs/subsystems/mql-subscription.md) — live MQL subscription substrate: per-Interactive registry, wire shapes, dep index, batched re-resolve, diffing
  - [inspection-pane.md](./docs/subsystems/inspection-pane.md) — right-column cockpit pane: two MQL subscriptions, unified breadcrumb, cardinality-polymorphic body
  - [prompt.md](./docs/subsystems/prompt.md) — PromptApi (choice/confirm/text/mqlObject/mqlMany), per-Interactive resolver map, cardinality policy
  - [mixins.md](./docs/subsystems/mixins.md) — class-factory mixins, `_mixinName` marker, Mixins registry, MixinApi predicates, composition order
  - [zone.md](./docs/subsystems/zone.md) — Zone hierarchy roots (Zone/SpatialZone/FolderZone) in lib/zone/, ZoneApi.resolveZoneForPath, field inheritance
  - [spatial.md](./docs/subsystems/spatial.md) — the containment/movement substrate in lib/spatial/ (Container/Containable/Mobile/Surfaced/Sealable): containment chokepoint, surface placement, locomotion, vessels (geometry moved to location.md)
  - [location.md](./docs/subsystems/location.md) — the lib/location/ subsystem: room/coordinate/zone geometry (Location/CartesianLocation/SphericalLocation, coordinate mixins, CartesianZone/SphericalZone, ZoneApi resolution) + the Warren elastic-graph (MultiLocation) substrate (host-as-runtime-role + migration; bud/merge; live-ref hub exits) + the lounge content in domain/lounge/ (LoungeWarren/Lounge/Bar/LoungeMixin), the `startLocation` spawn instruction + `StuffApi.singletonOrClone`, save-delegation recall
  - [boundary.md](./docs/subsystems/boundary.md) — exits, doors, Adornable/Adornment, Boundary substrate, Window, ExitableVessel
  - [bulk.md](./docs/subsystems/bulk.md) — continuous matter as a holder attribute (BulkableMixin interior/surface slots, closure scale, BulkableApi.transfer + drain-through, via.bulk + `:b` + material-keyword + `:{N unit}` measure grammar, Floor surface-bulk, fill/pour/spill/drink/sip, Creature.ingest seam)
  - [light.md](./docs/subsystems/light.md) — Light value object, VisionModality.signalAt, AmbientLitMixin, LightSourceMixin, per-viewer perception
  - [augmentation.md](./docs/subsystems/augmentation.md) — augment-confers-mixin substrate: AugmentMixin.confers(), getActiveMixins/isActive, @RequiresActive
  - [senses.md](./docs/subsystems/senses.md) — multi-sense perception substrate: SenseChannel vocabulary, Modality singletons, PerceptionApi
  - [quantities.md](./docs/subsystems/quantities.md) — Quantity<U> substrate (Unit catalog, parse/Mml emission), QuantityMarshaller, fieldMarshallers integration
  - [perception.md](./docs/subsystems/perception.md) — viewer-aware-query pattern (`Stuff & Sensor` always explicit), Shadow seam for per-viewer overrides
  - [belief.md](./docs/subsystems/belief.md) — per-viewer identity memory: the `BeliefStoreMixin` keyed bag (recognition + identification realms, `templatePath`-keyed, flag-vs-value payload) + the `RecognitionApi.describe` compose seam (viewer-aware naming, perception-gated, the central viewer-aware `Mml` ref hook) + recognition triggers (`introduce` + repeat-perception via `learnIdentity`) + `Disguisable`/`getDisguise` (creature masking, `getPresentation` deferral) + viewer-relative targeting / name-leak gate + `StatusMixin` decoration + the thin identification type axis (`IdentifiableMixin`, scroll-carried `identify`) + lazily-hydrated `beliefs`-collection persistence
  - [collections.md](./docs/subsystems/collections.md) — canonical surfaces for collection-shaped mixins (Set/keyed Map/ordered list/property bag), naming axes
  - [hot-reload.md](./docs/subsystems/hot-reload.md) — HotReloadApi state machine, StuffApi.clone integration, lifecycle events, controller dispatch
  - [race.md](./docs/subsystems/race.md) — Material substrate, Clade taxonomic scope, BodyPlan + Species templates, OrganismMixin, SexedMixin, animacy gating
  - [vitals.md](./docs/subsystems/vitals.md) — body-state substrate (no stored health scalar): the `Agent→Creature→Character` body/agency split, `VitalsMixin` (vital-sign Quantity fields, per-species `vitalProfile`, derived `getConditionBand`/`getConsciousness`), `BodyPlan` typed anatomy + tissue composition + slot↔part relations, the two-kind condition type system, death/consciousness seams. Models only — drivers/content/verbs deferred
  - [reserve.md](./docs/subsystems/reserve.md) — generalized `Reserve` capacity-axis substrate (`lib/reserve.ts`, top-level, next to quantity): `ReservedMixin`, decomposed-scalar persistence, biological reserves (endurance/satiation/hydration) + the authored-thematic seam (mana is content, never an engine word)
  - [encumbrance.md](./docs/subsystems/encumbrance.md) — the carry-weight gauge + consequences (first vitals driver): `LoadBearingMixin` (derived-on-read `getBorneBurden`/`getCarryCapacity`/`getLoadRatio`), the weighted tree-walk over both stores with `Vessel.transmissionFactor` + slot-derived placement coupling, `BodyPlan.baseMass` mass-seeding, `Vessel` reconception (container-object at any scale; `Adornable` narrowed to `ExitableVessel`), the consequence ladder (lift gate in `GetController`, locomotion veto + traversal drain at the `LocomotionApi` seam — move substrate stays agnostic), recovery deferred to metabolism
  - [shell-workspace.md](./docs/subsystems/shell-workspace.md) — WorkspaceMixin cwd state, workspace.tree setting, synthetic vars, read/write verb suite, SourceTreeApi
  - [shell-author.md](./docs/subsystems/shell-author.md) — AuthorMixin lifecycle and code-execution verbs (clone/reload/destruct/eval/teleport), EvalScript sandbox, forceX shape
  - [perceiver.md](./docs/subsystems/perceiver.md) — PerceiverMixin (look/scry/locate verbs on the actor), Sensor/Visible/Perceiver split, ScryableMixin
  - [slot.md](./docs/subsystems/slot.md) — Slotted/Slottable substrate, three universe patterns, accepts + fitsSlot, capacity, SlotApi
  - [embodiment.md](./docs/subsystems/embodiment.md) — Wearable/Wieldable body-side affordances, per-body-plan slotClaims, multi-slot atomicity
  - [posture.md](./docs/subsystems/posture.md) — Postured (host) + Posed (actor) + Postures vocabulary, posture-bearing slot, sit/lie/stand/kneel
  - [conveyance.md](./docs/subsystems/conveyance.md) — Mountable/Drivable/SeatedDrivableMixin, Mobile.traverse conveyance ripple, mount/dismount, vehicle design space
  - [locomotion.md](./docs/subsystems/locomotion.md) — LocomotionMode singletons, Climbable/Swimmable/Flyable enablement, LocomotionApi, per-mode verb controllers
  - [glob.md](./docs/subsystems/glob.md) — fungible stacks: GlobbableMixin (quantity), GlobbableApi (split/merge/applyQuantity), MQL quantity surface
  - [response-envelope.md](./docs/subsystems/response-envelope.md) — DispatchResponseEnvelope wire frame, 16 Note kinds, Status auto-escalation, CommandContext accumulator
  - [activity.md](./docs/subsystems/activity.md) — engagement framework: SchedulerApi, EngagedMixin on Character, four engagement slots, AbortReason vocabulary
  - [biome.md](./docs/subsystems/biome.md) — atmospheric substrate: Biome extends Idea, AtmosphericMixin, outward-walking chain resolver, SkyExposedMixin, six instruments
  - [time.md](./docs/subsystems/time.md) — game-time substrate: WorldClockApi, SchedulerApi riding game-time, CelestialApi, DefaultCalendar
  - [app-settings.md](./docs/subsystems/app-settings.md) — application-managed config: AppSettings singleton Document (`app_settings`, open `values` bag) + the `AppSettingKeys` key vocabulary, values seeded from `mud/config/app-settings.yaml` by a backend `AppSettingsSeeder` (no code defaults), AppApi runtime surface (sync cached reads, no boot method), `AppSettings.warm` at boot, the developer-gated `config` verb; the `defaultStartLocation` + `evacuationFallback` knobs that retired `config/constants.ts`

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

API reference is generated from TSDoc comments by TypeDoc. Scope is
**server-only** for now (the engine surface content authoring touches);
client + `@saxonberg/types` are platform-level and not yet wired in.

```bash
pnpm docs                # generate server API docs (alias for docs:server)
pnpm docs:server         # TypeDoc over packages/server -> HTML + JSON
pnpm docs:clean          # remove generated output
```

Config lives in `packages/server/typedoc.json`. It documents
**module -> exports -> public + protected members**, excluding private,
`#`-hard-private, and `@internal`-tagged symbols. Two artifacts land in
`packages/server/docs/api/` (gitignored, regenerated on demand):

- `html/` — the browsable static site (the eventual pre-auth web view).
- `api-model.json` — the canonical machine-readable model. The in-game
  `help api` browser (`HelpController`) is scaffolded to consume this.

TypeDoc's `validation` block doubles as the doc-content audit: it warns
on undocumented exports and broken `{@link}`s. Warnings are not
build-breaking today.

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
| Controller | `obj/command/<category>/` | `PascalCaseController.ts` | Command controller (MVC pair with a YAML view in `mud/cmd/<category>/`). |
| Command YAML | `mud/cmd/<category>/` | lowercase `verb.yaml` | The view side of a command. |
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
- **Command YAML views**: in `mud/cmd/<category>/`, lowercase
  (`perception/look.yaml`, `social/say.yaml`). Categories: perception,
  social, movement, posture, inventory, boundary, shell, author,
  system, charactergen.
- **Command controllers**: in `mud/obj/command/<category>/`, e.g.
  `perception/LookController.ts`, `movement/GoController.ts`.

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
| `ContainmentApi.move(item, room); item._setRestingOn(desk)` (manual on-surface placement) | `ContainmentApi.placeOn(item, desk)` — single primitive; resolves the surface's environment, runs `canRest`, moves, restamps `restingOn`. `_setRestingOn` is `FromContainmentApi`-gated; direct calls throw. |
| `typeof obj.getContents === 'function'` | `MixinApi.isContainer(obj)` (narrow) or `MixinApi.hasMixin(ctor, Mixins.Container)` (introspect) |
| `obj.fullName ?? obj.name ?? 'something'` | `obj.getPresentation()` |
| `creature.move(loc)` (raw containment) | `LocomotionApi.traverseWithDefault(actor, exit)` (default-mode dispatch via `defaultModeFor` chain) or `LocomotionApi.engageAround(actor, mode, exit, action)` (known mode + engagement bookkeeping) |
| `actor.setEngagedMode(mode); await actor.traverse(exit, …); if (transient) actor.setEngagedMode(null)` | `LocomotionApi.engageAround(actor, mode, exit, action)` — handles transient/persistent decision + error-path cleanup |
| `resolveSetting(actor, 'movement.defaultMode') ?? 'walk'` | `LocomotionApi.defaultModeFor(actor)` — three-tier chain: explicit setting → bodyplan default → universe 'walk' (the raw resolveSetting skips the bodyplan layer for NPCs) |
| `avatar.gold = 100` (direct field assignment for dynamic state) | `avatar.setProp(Property.of<number>('gold'), 100)` (PropertiedMixin) |
| `(stuff as unknown as { templatePath? }).templatePath` | `stuff.getTemplatePath()` (runtime stamp). For `Template` docs use `template.path` — the two are distinct. |
| `(stuff as { templatePath? }).templatePath = path` | `stuff.setTemplatePath(path)` (ApiOnly-gated, re-keys `byTemplatePath`). The slot is hard-private (`#templatePath`); bracket-writes are runtime no-ops. Clone-pipeline pre-register stamps use the caller-allowlisted `Stuff._stampTemplatePath` seam. |
| `(stuff as { zone? }).zone = z` | `stuff.setZone(z)` (gated by `FromSpatialZone` — only `SpatialZone` subclasses may call). Slot is hard-private (`#zone`); bracket-writes are runtime no-ops. Clone-pipeline pre-register stamps use the caller-allowlisted `Stuff._stampZone` seam. |
| `other.foo` / `other.foo = x` from another Stuff | `other.getFoo()` / `other.setFoo(x)` — see "Inter-Stuff Contract" above |
| `return { success: false, summary: 'foo' }` from a controller | `ctx.note({ kind: 'controller-rejected', reason: 'foo-reason', detail: 'foo' })` + `MessageApi.scene(...).toSelf(...).send()` — controllers return `void`; outcome rides the dispatch-response envelope. See [response-envelope.md](./docs/subsystems/response-envelope.md). |
| `new CommandContext({ ... })` / `createCommandContext({ ... })` | `CommandApi.createCommandContext({ ... })` — tests + dispatcher use the same factory; the constructor + accumulator state are not external surface |
| `door.setIsOpen(true)` / `door.getIsOpen()` | `door.setOpen(true)` / `door.isOpen()` — boolean fields use the noun form on field/setter/YAML, predicate form on the getter |
| `ZoneApi.resolveZoneField(zone, 'foo')` | `zone.lookupField<T>('foo')` — the inheritance walk is an instance method on Zone so subclasses can override `lookupAncestorField` for barrier behavior |
| `setInterval(fn, ms)` / `setTimeout(fn, ms)` from domain or Api code | `ScheduleApi.recurring(ms, fn, opts?)` / `ScheduleApi.schedule(ms, fn, opts?)` — wraps the callback in `ExecutionContextApi.runRoot` so composed frames have a well-defined Root + propagated `causingCommandId` attribution; returns a `ScheduleHandle` cancellable via `ScheduleApi.cancel(handle)`. Bare Node timers skip the execution-context layer and leak raw handles. |
| `(stuff as any).save?.()` to round-trip arbitrary Stuff to its template | `Avatar.save()` is the only v1 consumer (`if (stuff instanceof Avatar) await stuff.save()`). The substrate (`TemplateApi.snapshotToTemplate` / `restoreFromTemplate`) is general but only Avatar exercises it in v1. No general persist-back mixin yet. |
| Reading `template.data.container` from a verb to decide where a clone lands | Let `applyContainer` do it — the Hydrator's Phase 2 self-places the instance during the clone cascade. Verbs `clone` post-clone and treat hydration-self-placement as Layer 3 in the precedence chain (`--into` → `--here` → self-placement → giver fallback). See `obj/command/author/CloneController.ts`. |
| `await GroupApi.isMember(playerId, ref)` inside a controller to gate a staff verb | `await AccessApi.can(giver, action, resource)` — slice walk over `Zone.ownerGroup` / `accessGroups` with `'core'` fallback. See [access.md](./docs/subsystems/access.md). |
| Hard-coded "is this player an admin?" check | `await AccessApi.can(giver, action, resource)` (resource-targeted), or `AccessApi.canMutateZone(giver, zone)` for Zone-Template targets, `AccessApi.isAuthor(giver)` for MQL pre-gates, `AccessApi.isDeveloper(giver)` for the orthogonal TS-escape axis (eval, reload, source-tree writes). |
| Reaching `AccessRegistry` directly via `StuffApi.findByTemplatePath('/obj/AccessRegistry')` and calling its methods | `AccessApi` — the Registry's public methods carry `@CallSecurity(FromModule('mud/api/access#AccessApi'))` and throw on any other caller. The facade is the only legitimate path. |

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
  post-hydrate hooks. `PersistentHydrator`'s **two-phase dispatch**
  prefers a `set<Field>` method (Phase 1) and falls back to
  bracket-assign through any accessor pair on the prototype.
  Instruction fields use the `apply<Field>` Phase 2 dispatch.
  Cross-field invariants go in a custom `Hydrator` subclass — see
  [templates.md § The Hydrator Contract](./docs/subsystems/templates.md#the-hydrator-contract).
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

- `users` — auth records (`Document`)
- `google_profiles` — OAuth profile data (`Document`)
- `domain` — object templates for the CMS (Avatar, rooms, NPCs, …)
- `app_settings` — application-managed config singleton (`Document`)
- `world_state` — world-clock state singleton (`Document`)
- `beliefs` — per-viewer identity-memory working set (`BeliefDocument`, one doc per `{viewerId, realm, referent}`)

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
