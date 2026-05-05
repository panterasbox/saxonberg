# Bootstrap & Seeding

This document covers the game-startup mechanics: seeding the
`domain` MongoDB collection with template documents from disk, and
cloning runtime instances from those templates when the server
starts.

## Scope

How `/mud/` game state initializes when the server starts. Excludes
`/backend/` and `/services/` infrastructure setup (those are unrelated
concerns and are left alone here).

## Two distinct concerns

| Concern | When it runs | Lifecycle |
|---|---|---|
| **Seeding** | Once per fresh DB (idempotent on re-run) | Inserts template documents into MongoDB `domain` collection from disk |
| **Bootstrap** | Every server start | Clones runtime instances from those templates, ordered by deps |

Sequenced (seeding before bootstrap) but distinct. Seeding answers "what
templates ship with the engine?" Bootstrap answers "which runtime
instances must exist for the game to function?"

## Server boot order

1. Connect to MongoDB
2. Framework Api decoration (existing)
3. **`SeederManager.run()`** — idempotent template insertion from disk
4. **`PersistenceManager.loadHooks()`** — clone hook templates and
   register them with the persistence pipeline. Runs AFTER seeding so
   the hook templates exist in `domain` when this clones them.
5. **`BootstrapManager.run()`** — clone runtime instances from
   manifest. Last because manifest entries may reference templates
   that were seeded in step 3.
6. HTTP / WebSocket listeners come up

---

## Seeding

### Layout

YAML files on disk are the **source of truth** for what templates ship
with the engine.

```
packages/server/seeds/
  obj/
    EventRegistry.yaml
    ModuleRegistry.yaml
    Avatar.yaml
  rooms/
    welcome.yaml
    plaza.yaml
```

The file path determines the template path: relative path from
`seeds/`, with extension dropped, becomes the template path.

| File | Template path |
|---|---|
| `seeds/obj/EventRegistry.yaml` | `/obj/EventRegistry` |
| `seeds/obj/ModuleRegistry.yaml` | `/obj/ModuleRegistry` |
| `seeds/rooms/welcome.yaml` | `/rooms/welcome` |

### Why YAML on disk

- Templates are visible in the repo, diffable, reviewable in PRs.
- Single source-of-truth for what ships with the engine — answer to
  "what objects exist out of the box?" is "look in `seeds/`."
- Easy to navigate / inspect without spinning up a Mongo client.
- Mods can ship YAML seed fragments via the same mechanism (when mods
  land).

### SeederManager

Internal-only Manager. Called from `main()` once per server start,
before `BootstrapManager`.

```ts
class SeederManager {
  static async run(): Promise<void> {
    for (const yamlFile of walkSeeds('packages/server/seeds')) {
      const path = yamlFile.toTemplatePath();    // '/obj/EventRegistry'
      const existing = await db.collection('domain').findOne({ path });
      if (existing) continue;                    // idempotent: skip if present
      const doc = parseYaml(yamlFile.read());
      await db.collection('domain').insertOne({ path, ...doc });
    }
  }
}
```

### Semantics

- **Insert-only by default.** Existing docs are left alone.
- **Idempotent.** Safe to re-run on every server start; no duplicate
  inserts.
- **No update / migration logic.** If a template needs schema changes,
  that's a separate migration story — out of scope for the seeder.
- **No deletion.** If a YAML is removed from disk, the corresponding
  doc stays in Mongo (orphaned templates are a developer cleanup
  task, not the seeder's problem).
- **Dev workflow** for "I changed the seed YAML and want it to take
  effect": delete the doc in Mongo manually, restart server.

A future migration story (versioned seeds, automatic schema upgrades)
is acknowledged as a real future need but explicitly NOT part of the
initial seeder design.

---

## Bootstrap

### BootstrapManager

Internal-only Manager. Called from `main()` after `SeederManager` and
after framework Apis are decorated. Reads a typed manifest array,
topologically sorts, instantiates each entry.

```ts
class BootstrapManager {
  static async run(manifest = bootstrapManifest): Promise<void> {
    const sorted = topologicalSort(manifest);
    for (const entry of sorted) {
      const clone = await StuffApi.clone(entry.templatePath);
      // PostRegistration fires per existing Stuff lifecycle (sync)
      if (entry.awaitInit) {
        await entry.awaitInit(clone);
      }
    }
  }
}
```

`StuffApi.clone(templatePath, context?)` is the clone primitive — it
loads the Template by path, dynamic-imports the backing class, runs
the optional Hydrator, and awaits any `postRegister`. The clone
always lives at its template path; there's no separate "destination"
concept (each bootstrapped singleton's identity IS its template
path).

Failure modes throw and prevent server start:
- Cycles in `dependsOn` graph
- Missing `dependsOn` references
- Clone failure (template doesn't exist, etc.)
- `awaitInit` rejection

### BootstrapEntry shape

```ts
interface BootstrapEntry {
  /**
   * Path of the template to clone — the identifier in the `domain`
   * collection AND the runtime location of the resulting clone.
   * E.g., `/obj/EventRegistry`.
   */
  templatePath: string;

  /** Other entries' templatePaths that must complete before this one. */
  dependsOn?: string[];

  /** Optional async init beyond PostRegistration's sync surface. */
  awaitInit?: (clone: Stuff) => Promise<void>;
}
```

The shape is intentionally minimal. Most entries will have just
`templatePath`. `dependsOn` for ordering; `awaitInit` only for entries
that need async setup.

### Engine manifest

The manifest data lives in `mud/bootstrap.ts` so lower-level
developers can edit and review it as things come and go from
service. The `BootstrapEntry` type itself is owned by
`BootstrapManager` (the consumer); the mudlib file imports the type
back from the backend rather than declaring it locally — backend
stays the privileged layer and doesn't reach into mudlib for shape
information. TypeScript (not YAML) for:
- Type checking on `templatePath` references via the
  `BootstrapEntry` type.
- Refactor-safety — rename a template path, find-references works.
- Inline `awaitInit` functions (no need for a registry of named
  init callbacks).

```ts
// mud/bootstrap.ts
import type { BootstrapEntry } from '../backend/BootstrapManager';
import type { WorldRoot } from './obj/WorldRoot';

export const bootstrapManifest: BootstrapEntry[] = [
  { templatePath: '/obj/EventRegistry' },

  {
    templatePath: '/obj/ModuleRegistry',
    dependsOn: ['/obj/EventRegistry'],
  },

  {
    templatePath: '/obj/CommandRegistry',
    dependsOn: ['/obj/EventRegistry'],
  },

  {
    templatePath: '/obj/WorldRoot',
    dependsOn: ['/obj/EventRegistry'],
    awaitInit: async (root) => {
      await (root as WorldRoot).loadStartingZones();
    },
  },
];
```

### Why no phases

Earlier design considered explicit phases (`PreEngine`, `Engine`,
`PreWorld`, `World`, `PostWorld`). Dropped because dep-ordering covers
every case we could imagine. Phases would only earn their keep if
dep-ordering had loops you needed to break with a coarse "everything
in phase A before anything in phase B" rule — we don't have that.

### Why no `BootstrappableMixin`

Earlier design considered a mixin that templates compose to declare
"I auto-spawn at startup." Dropped because:
- Templates are templates; specializing them via a mixin just to mark
  them as bootstrap-eligible is unnecessary indirection.
- The bootstrap manifest is the single source of truth for "what gets
  spawned" — easier to read one list than to crawl all templates
  looking for the marker.
- Mods append to the same manifest array; no special mod-specific
  mechanism needed.

### PostRegistration cooperates

Bootstrap orchestrates *what gets created and when*. PostRegistration
handles *how each instance initializes itself* — existing mechanism,
unchanged. For most entries, PostRegistration is enough. `awaitInit`
on the BootstrapEntry is only for entries needing async setup beyond
PostRegistration's sync surface.

The decision to put async setup on the bootstrap entry (not on a new
PostRegistration variant) avoids changing PostRegistration's contract
and keeps the async-init concern visible at the bootstrap manifest
level where the orchestration decisions live.

### Convention: template path = backing class module path

For singleton system Ideas (one template per class), the template path
matches the module path:

| Backing class | Template path |
|---|---|
| `mud/obj/EventRegistry.ts` | `/obj/EventRegistry` |
| `mud/obj/ModuleRegistry.ts` | `/obj/ModuleRegistry` |
| `mud/obj/CommandRegistry.ts` | `/obj/CommandRegistry` |

This aligns the on-disk seed location with the runtime template
path. Avatar is the existing exception
(per-user dynamic template paths) and remains so.

### Mod extensibility (future)

When mods land:
- A mod's manifest exports its own `BootstrapEntry[]`.
- Mod loader appends those entries to `bootstrapManifest` before
  `BootstrapManager.run()` is called (or supports re-run for
  late-loaded mods, if applicable).
- Same data shape, no special mod-specific bootstrap mechanism.
- Mod-supplied seed YAMLs are loaded by the SeederManager from the
  mod's seed directory the same way engine seeds are loaded from
  `packages/server/seeds/`.

This is acknowledged as future work; not part of the initial
implementation.

---

## Registry pattern (referenced by both this doc and events.md)

### Definition

A **Registry** is:

- A long-lived **singleton Idea** (lives at a well-known template path).
- Holds a **named collection of declarations** (not Stuff instances).
- Exposes **lookup-by-name** + enumeration.
- **Gates per-entry access** through Propertied `checkAccess`.
- Composes `Persistable + Propertied` (and whatever else the entries
  need).
- Is **bootstrapped at engine startup** — every Registry has a
  BootstrapEntry.

### Distinct from

| Word | Means |
|---|---|
| **Registry** | Singleton Idea; named collection of declarations; gated lookup |
| **Manager** | Subsystem-internal coordinator over a class of things (`PersistenceManager`, `SeederManager`, `BootstrapManager`) |
| **Api** | Security-gated public surface for callers (`EventApi`, `StuffApi`) |
| **Container** | Holds Stuff instances; participates in containment / movement |
| **Mixin** | Composition unit that adds methods / fields to classes |

Corollaries:

- A Registry is **NOT** a Container. It doesn't "contain" its entries
  in the spatial / containment sense; entries aren't necessarily Stuff.
- A Registry's entries can themselves *point at* other Stuff (e.g.,
  CommandRegistry entries point at controller classes), but the
  Registry itself owns only the declarations.
- A Registry is queryable by name and enumerable. Its surface is "look
  up by key" + "list all keys" + the per-entry `checkAccess` gate.

### Initial Registries

| Registry | Holds | Lives in |
|---|---|---|
| `EventRegistry` | Well-known events + emit/subscribe permissions | `/obj/EventRegistry` |
| `ModuleRegistry` | Module info for hot-reload (future) | `/obj/ModuleRegistry` |
| `CommandRegistry` | Command name → controller mapping (existing in some form; consider formalizing) | `/obj/CommandRegistry` |

Future candidates: `AchievementRegistry`, `DamageTypeRegistry`,
`FactionRegistry`, `RecipeRegistry`, `PromptTypeRegistry`,
`MqlResolverRegistry`. None of these are on the immediate roadmap.

### `Mixins` constants object

The existing `Mixins` constant object in `lib/mixin.ts` is
informally called a "registry" today but doesn't fit the formal pattern
above (it's a constants object, not an Idea, not Propertied, not
bootstrapped). Either rename to avoid confusion (e.g., `MixinNames`)
or upgrade to a proper Registry. Probably the former — upgrading just
to fit a label is over-engineering for a pure constants object.

---

## What we explicitly decided NOT to do

- **`BootstrappableMixin`.** Templates are templates; bootstrap is a
  list. No need to specialize.
- **Phases.** Dep-ordering covers all required ordering.
- **Engine vs world manifest split.** Single mechanism. Mods append to
  the same array.
- **`BootstrapApi` as a security-gated public surface.** It's a
  Manager, internal-only. Called from `main()` and (eventually) from
  hot-reload's mod-load path. No external callers.
- **Auto-update of seeded templates** when YAML changes. Out of scope;
  delete-and-reseed for dev, future migration story for production.
- **Hot-reload re-running bootstrap.** Hot-reload is a separate
  subsystem with its own re-init story when it lands. Conflating the
  two added complexity for no clear benefit.
- **YAML for the engine bootstrap manifest.** TS gives types,
  refactor-safety, and inline `awaitInit` functions; YAML would force
  a named-callback registry indirection. Mods can use either
  (data-only YAML for sandboxed mods; TS for trusted in-process mods).

---

## Implementation order suggestion

1. **`SeederManager` + initial seed YAMLs** for the engine's existing
   templates (Avatar, anything else currently inserted via
   ad-hoc startup code).
2. **`BootstrapManager` + initial manifest** with no entries yet —
   wire it into `main()` boot sequence.
3. **First bootstrap entry: `EventRegistry`** — the events subsystem
   needs this. See [events.md](./events.md).
4. **Subsequent registries** as their subsystems land
   (`ModuleRegistry` with hot-reload, `CommandRegistry` if formalized,
   etc.).
5. **Mod extensibility** is a future phase, deferred until the modding
   subsystem itself lands.

---

## Cross-references

- [events.md](./events.md) — the EventRegistry is the first Registry
  that needs this bootstrap mechanism. The events subsystem and this
  one are tightly coupled in scope but designed independently.
- [templates.md](./templates.md) — TemplateApi.clone is the underlying
  mechanism BootstrapManager uses for each entry.
- [lifecycle.md](./lifecycle.md) — PostRegistration is what each
  bootstrapped instance uses for its own per-instance setup.
- [persistence.md](./persistence.md) — Registries compose Persistable;
  their declarations may persist across server restarts (depending on
  the registry's semantics).
