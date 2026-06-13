# App settings — implementation plan

Status: planning artifact. Authoritative scope is [`docs/requirements/app-settings-requirements.md`](../requirements/app-settings-requirements.md); design rationale is [`docs/slates/builds/game-config-slate.md`](../slates/builds/game-config-slate.md). This doc is the *how*. The *what* (surface decisions, non-goals, acceptance criteria) is settled — do not reopen it.

## 0. Branch / base — read this first

Work on the **`feature/game-config`** branch in the **`/home/bobalu/play/saxonberg/build-1`** worktree (already cut off up-to-date `master`; char-gen merged at `7aa5b72e`, the sequencing gate is cleared). All substrate files below are present in the working tree — no `git show` needed.

### Substrate facts (verified against the current tree)

- **`Document` base** (`lib/persistence/Document.ts`): subclass declares `static collectionName` + `static persistentFields`; round-trips named fields via `toDocument`/`fromDocument` (bracket read/write, with an optional per-field marshaller — **we use none**). `save()` upserts (assigns `_id` on first insert); `static find(query)` returns instances; construction is plain `new T()`. No Stuff/proxy/registry.
- **`WorldClockState`** (`lib/time/WorldClockState.ts`) is the exact precedent: `collectionName='world_state'`, `static async loadOrSeed()` does `const rows = await find({}); return rows[0] ?? new WorldClockState();`. Mongo assigns `_id` (no human-readable id). **We mirror this shape but with a single `values` bag field.**
- **`WorldClockApi`** (`api/worldclock.ts`) is the operations-Api-over-a-State-Document precedent: static class, `private constructor()`, `#`-private static cache slot, ends with `SecurityApi.decorateApiClass(WorldClockApi)`. Note its `boot()`/`shutdown()` are `SystemRoot`-gated — **`AppApi` deliberately has NO boot method** (decision 3); we mirror only the cache-holding + decoration pattern, not the lifecycle methods.
- **`lib/paths.ts`** is the central-constants-file pattern: a plain module exporting `as const` records, no class, no decoration. Its own docstring already defers spawn/evac content-paths "to app config" — i.e. to our registry. **Our registry mirrors this file's shape but lives in the subsystem dir, not at `lib/` root** (it is subsystem-typed surface, not cross-cutting infra).
- **`config/constants.ts`** holds **exactly one** export, `DEFAULT_STARTING_LOCATION_PATH = '/domain/eternal/duncan-hall/lobby'`. **Verified — nothing else.** (Confirms the requirement that the file can be deleted.) Note: the value is the *lobby*, and its docstring/comment claims it "must stay the lobby" for evac — this is the misinformed drift the requirements correct; the seed YAML literal `/domain/lounge/warren` is a *separate* value used for spawn.
- **`Container.cleanupOnDestruct`** (`lib/spatial/Container.ts:136`): imports `DEFAULT_STARTING_LOCATION_PATH` (line 39), pre-resolves it into a local named `voidFallback` (line 147 — the misnomer; it currently resolves the *lobby*) only on the `outer === null && snapshot.length > 0` branch, then `ContainmentApi.move(item, voidFallback)` for `HasInteractive` items. **This is the one production read of the constant.**
- **`VoidLocation`** (`lib/stuff/VoidLocation.ts`) at `/domain/void` is bootstrap-pinned (`bootstrap.ts:28` manifest entry `{ templatePath: '/domain/void' }`) and refuses destruct — the *designed* evac fallback. Its docstring still references `DEFAULT_STARTING_LOCATION_PATH`; that stale prose reference must be cleaned (it is one of the "no reference remains" targets).
- **The two mint sites** both spread `...seed.data` then overlay:
  - `EnrollController.commit` (`obj/command/charactergen/EnrollController.ts:~494`) — `const data = { ...seed.data, name, _speciesPath, pronouns, aspiration, bio, longDescription }`. The real char-gen path.
  - `Application.createDefaultAvatarTemplate` (`backend/Application.ts:381`, ~line 395) — `const data = { ...seed.data, name }`. The test/legacy + `provisionTestCharacter` path.
- **Avatar seed YAML** (`seeds/obj/Avatar/seed.yaml:40`) carries `startLocation: /domain/lounge/warren` with a long comment block (lines 27–39) explaining the spawn-vs-evac split and explicitly referencing `DEFAULT_STARTING_LOCATION_PATH`. Both the literal **and** the stale comment go.
- **The verb precedent** is `SettingsController` (`obj/command/shell/SettingsController.ts`) + `settings.yaml` — list/get/set with `MessageApi.scene(...).topic(...).toSelf(Mml.fromMarkup(...)).send()` for prose and `context.note({ kind: 'controller-rejected', ... })` for failures. The developer gate is the `requiresDeveloper` validator (`lib/command/validators/requiresDeveloper.ts`, an async-preload validator wired in YAML via `validators: [/lib/command/validators/requiresDeveloper]`, exactly as `eval.yaml`/`reload.yaml` do). `AccessApi.isDeveloper(subject)` is `async` and returns boolean.
- **Note kinds** (`packages/types/src/index.ts`): there is **no generic `info`/`notice` Note kind**. The soft "not a known setting" message is therefore **player-facing prose** (a scene line), *not* an escalating Note — using `controller-rejected` would wrongly mark the command `declined`, but the set **succeeds**. Keep status `ok`; emit the note as prose only.
- **Command category `system`** exists (`mud/cmd/system/` + `mud/obj/command/system/`), already holds operator/diagnostic verbs (`ping`, `clear`, `cancel`, `prompt`, `help`). **`config` lands here — no new category.**
- **Test harness**: `WorldClockState.persistence.test.ts` stubs `PersistenceManager.get()` with `vi.spyOn(pm, 'save'|'find')` (the `Document.test.ts` fakes pattern), no real Mongo. **Our Document/Api unit tests reuse this exact stub shape.**

## 1. Architecture decisions (within the settled constraints)

### 1.1 Cache holder — the `AppSettings` Document's own static singleton slot

The requirements name this "planner's call" with the Document static slot as "the obvious home." **Decision: hold the cache on `AppSettings` as a `private static` slot** (`AppSettings._cached: AppSettings | null`), not on `AppApi`.

Rationale:
- The cache *is* the loaded singleton row — it belongs with the persistence object that produced it, exactly as `WorldClockApi` caches its Registry pointer but the *state* lives on the Registry. Keeping the row on the Document keeps `AppApi` a thin read/write façade with no persistence state of its own.
- `loadOrSeed()` is already on the Document and is the only thing that can produce/seed the row; having it populate the same-class static slot it serves reads from is the minimal seam. The bootstrap step calls `loadOrSeed()` once; `AppApi.setting()` reads `AppSettings._cached`.

Mechanics (all on `AppSettings`):
- `private static _cached: AppSettings | null = null;`
- `static async loadOrSeed(): Promise<AppSettings>` — `find({})`; if a row exists, use it; else `new AppSettings()` with `values` seeded from `AppSettingDefaults` and `await instance.save()` so the seeded row is persisted (the fresh-DB seed must land in Mongo, unlike `WorldClockState` which defers its first save — here the acceptance criterion is "seeds exactly one `app_settings` row"). Set `_cached = instance` and return it.
- `static getCached(): AppSettings` — returns `_cached`, throws a clear "not warmed — boot ordering bug" error if null (the unwarmed-cache constraint surfaces loudly, never silently undefined).
- `getValue(key): string | undefined` / `setValue(key, val): void` — instance method surface over the `values` bag (host-internal accessor pair fires no events; v1 needs none). `getValues(): Record<string,string>` returns a snapshot copy for listing.
- A test-only reset seam `static _resetForTesting()` clearing `_cached` (guarded by `SecurityApi.assertTestOnly`), mirroring `WorldClockApi._resetForTesting`.

**Why not the Api:** the requirements' invariant is "no boot/seed/warm method hangs off `AppApi`." Caching on the Document keeps that line clean — the only thing on `AppApi` is sync read / async write / list, all *runtime operations*.

### 1.2 `setSetting` cache-freshness mechanism

`AppApi.setSetting(key, val)`:
1. `const row = AppSettings.getCached();` (already the live singleton instance).
2. `row.setValue(key, val);` (mutates the in-memory bag — same instance the cache holds, so the cache is fresh by construction; no re-load needed).
3. `await row.save();` (persists; `row` already has its `_id`, so this upserts in place).

Because the cache holds the very instance being mutated and saved, "refresh the cache" is automatic — there is no separate re-read. A subsequent `AppApi.setting(key)` reads `row.getValue(key)` and sees the new value with no restart. This satisfies the "writes + persists + refreshes cache; subsequent read reflects new value" acceptance criterion with the minimum moving parts.

### 1.3 Bootstrap placement — `AppBootstrap.run`, immediately after `BootstrapManager.run()` and **before** `WorldClockApi.boot()`

The requirements name "AppBootstrap (alongside the clock at `AppBootstrap.ts:137`) or SeederManager — planner's call." **Decision: a step in `AppBootstrap.run`, not `SeederManager`.**

Rationale:
- `SeederManager.run()` seeds *templates from disk into the `domain` collection* (the Stuff/CMS track). `app_settings` is a `Document`-track meta collection seeded *from the code registry*, not from a YAML seed file — it is not a domain-template seed and does not belong in `SeederManager`. This mirrors why `WorldClockApi.boot()` "can't live inside BootstrapManager" (per that step's own comment): Document-track state is not a clonable template.
- `AppBootstrap` is the explicit sequencer for exactly these cross-manager Document-track warm steps. The clock's seed/warm sits there for the same reason; app settings is its sibling.

**Ordering (critical — must precede any consumer that could evac):**
- Place the step **after `BootstrapManager.run()`** (which pins `/domain/void` into the runtime registry — the evac fallback `Container.cleanupOnDestruct` resolves) and **after `await SeederManager.run()`** (PM connected, collections live).
- Place it **before `WorldClockApi.boot()`**, or at minimum before anything that could trigger a destruct/evac. In practice no destruct runs during boot, but the invariant is "warm before any synchronous consumer," and `AppApi.setting(evacuationFallback)` is read on the *first* destruct after boot. The safe, self-documenting placement is the line just before `await WorldClockApi.boot();` (so both Document-track warm steps cluster at the end of the sequence). Concretely:

  ```ts
  await BootstrapManager.run();

  // App settings — seed the app_settings bag from the code registry on a
  // fresh DB and warm the synchronous read cache before any consumer
  // (the evac path in Container.cleanupOnDestruct cannot await). A
  // Document-track sibling of the clock's warm step; not a domain-template
  // seed, so it lives here, not in SeederManager/BootstrapManager.
  await AppSettings.loadOrSeed();

  await WorldClockApi.boot();
  ```

  Note this `await`s the Document static directly (no Api involvement) — honoring "no boot/seed method on `AppApi`."

### 1.4 Module placement / categories (no new category)

| New file | Category | Path |
|---|---|---|
| `AppSettings` Document | Stuff-track? No — **Document class** in `lib/<subsystem>/` | `packages/server/src/mud/lib/config/AppSettings.ts` |
| Key registry | **constants module** (the `lib/paths.ts` pattern), colocated in subsystem dir | `packages/server/src/mud/lib/config/keys.ts` |
| `AppApi` | **Api** (`api/`, lowercase, decorated) | `packages/server/src/mud/api/app.ts` |
| `config` view | **Command YAML** in existing `system` category | `packages/server/src/mud/cmd/system/config.yaml` |
| `ConfigController` | **Controller** in existing `system` category | `packages/server/src/mud/obj/command/system/ConfigController.ts` |
| Subsystem doc | doc | `docs/subsystems/app-settings.md` |

The `lib/config/` folder is **new but it is a subsystem folder, not a new module *category*** (the taxonomy categorizes by *kind* — Document classes live in `lib/<subsystem>/` just like Stuff classes and mixins do; `WorldClockState` lives in `lib/time/`). `lib/config/` is the home for this concern. The retired `config/` (at `mud/config/`, YAML-and-constants dumping ground) is distinct and gets one fewer file; we do **not** revive it.

> **Note for the build agent — `lib/config/` vs `mud/config/`.** These are different directories: `packages/server/src/mud/lib/config/` (new, TS subsystem) and `packages/server/src/mud/config/` (existing, holds content YAMLs + the dying `constants.ts`). Do not conflate them. The registry is the subsystem's typed surface, *not* a revived generic constants dump.

## 2. Workstream A — persistence: the Document + key registry

Independently reviewable; no consumer touches yet.

### A1. Create `lib/config/keys.ts` — the central registry

The `lib/paths.ts`-shaped constants module (plain exports, no class, no decoration):

```ts
export const AppSettingKeys = {
  defaultStartLocation: "defaultStartLocation",
  evacuationFallback: "evacuationFallback",
} as const;

export type AppSettingKey = (typeof AppSettingKeys)[keyof typeof AppSettingKeys];

export const AppSettingDefaults: Record<string, string> = {
  [AppSettingKeys.defaultStartLocation]: "/domain/lounge/warren",
  [AppSettingKeys.evacuationFallback]: "/domain/void",
};
```

- The two default *strings* (`/domain/lounge/warren`, `/domain/void`) appear **exactly once in the tree** here — the acceptance "default string appears exactly once" target. Do not re-literal them in the Document, the Api, the mint sites, or `Container`.
- Docstring: note this is the AppSettings subsystem's typed key surface (blessed keys), that storage stays an open bag, and that `lib/paths.ts` defers spawn/evac content-paths here.

### A2. Create `lib/config/AppSettings.ts` — the Document

`extends Document`, `collectionName='app_settings'`, `persistentFields=['values']`. One persistent field forever: `values: Record<string, string> = {}`. Implement per §1.1: `loadOrSeed()` (seed from `AppSettingDefaults` on empty collection + `save()` + cache; else load row + cache), `getCached()`, `getValue`/`setValue`/`getValues`, `_resetForTesting()`. Docstring mirrors `WorldClockState`'s (singleton row via `find({})`, Mongo `_id`), and explicitly states: persisted shape is the single open `values` bag — adding a knob never changes this file.

> **Note — `values` is an unmarshalled plain field.** `Document.toDocument`/`fromDocument` bracket-read/write it as a plain JSON object; `Record<string,string>` round-trips natively through Mongo with no marshaller. Do **not** add a `fieldMarshallers` entry.

> **Caution — seed must persist on fresh DB.** Unlike `WorldClockState` (which returns an unsaved zero instance), the acceptance criterion is "seeds exactly **one** `app_settings` row." So `loadOrSeed()` must `await save()` the freshly-seeded instance. Guard idempotency by `find({})` first (the SeederManager-style "row exists → leave alone"), so a second boot does not insert a duplicate.

## 3. Workstream B — the read/write surface: `AppApi`

### B1. Create `api/app.ts` — `AppApi`

Static class, `private constructor()`, ends with `SecurityApi.decorateApiClass(AppApi)`. **Runtime operations only** — no boot/seed/warm method. Three methods:

- `static setting(key: string): string` — sync. `const row = AppSettings.getCached(); return row.getValue(key) ?? AppSettingDefaults[key] ?? "";` The `?? AppSettingDefaults[key]` is the registry-default safety net for a key absent from a pre-existing persisted row (acceptance criterion). **Ungated** — internal engine consumers (evac, mint) call it; no security policy decorator.
- `static settings(): Record<string, string>` — registry keys ∪ bag keys, each resolved to current-or-default, for the `config` listing. Build from `{ ...AppSettingDefaults, ...row.getValues() }` so every blessed key shows even if unset, and ad-hoc keys show too.
- `static async setSetting(key: string, value: string): Promise<void>` — per §1.2 (mutate cached row + `await row.save()`). The mutation surface the verb calls. **Gating lives at the verb, not here** — but add a defensive note in the docstring that this is reached only via the developer-gated `config` verb.

### B2. Security decoration specifics

- `AppApi` ends with `SecurityApi.decorateApiClass(AppApi)` like every Api (CLAUDE.md hard rule). The four bootstrap-special Apis self-decorate-exempt; `AppApi` is **not** one of them — it decorates normally.
- **No per-method `@CallSecurity` policy.** Reads are ungated by design (decision 2a: internal consumers are engine code). `setSetting` is ungated *at the Api* because the developer gate is the verb's `requiresDeveloper` validator (decision 6); duplicating a gate on the Api would be redundant and would also block the verb's own preload path. This matches the requirements' "developer-gating lives at the verb, not duplicated here."
- Static cache slot on `AppSettings` is `private static` TS-modifier (it's a *Document*, `lib/` layer → TS modifiers, not `#`; and a static field could be `#` safely but TS-private matches the domain-layer default and the `_resetForTesting` observation seam). `AppApi` has no instance state; its only state (`AppSettings._cached`) lives on the Document.

> **Layering note for the doc:** `AppApi` (`mud/api/app.ts`) is distinct from the backend `Application.ts` (server/OAuth orchestration, a layer down). The subsystem doc must call this out (per decision 2a) so a future reader doesn't conflate the two.

## 4. Workstream C — bootstrap wiring

### C1. Edit `backend/AppBootstrap.ts`

- Add `import { AppSettings } from '../mud/lib/config/AppSettings';`.
- Insert `await AppSettings.loadOrSeed();` between `await BootstrapManager.run();` and `await WorldClockApi.boot();` with the explanatory comment from §1.3.
- Extend the `run()` JSDoc sequence list with a step ("Seed + warm app settings from the code registry — Document-track, precedes any sync consumer").
- **No shutdown counterpart** — app settings have nothing to flush (every `setSetting` already persisted). Leave `AppBootstrap.shutdown()` untouched.

## 5. Workstream D — the `config` verb

### D1. Create `cmd/system/config.yaml`

Single-token verb, two **optional positional** args (the `teleport.yaml`/`eval.yaml` `required: false` shape, **not** subcommands — `config <key> <value>` is positional, not a `set` subcommand):

```yaml
verbs: [config]
controller: system/ConfigController
description: "View or set application settings (developer-gated)"
validators:
  - /lib/command/validators/requiresDeveloper
args:
  - name: key
    type: string
    required: false
  - name: value
    type: string
    required: false
    greedy: true
```

- The `requiresDeveloper` validator is the gate (async preload → `AccessApi.isDeveloper`); no controller-side access code needed. This is the `eval.yaml`/`reload.yaml` precedent verbatim.
- `value` is `greedy: true` so a path-with-spaces (unlikely but safe) or any token sequence is captured whole.

### D2. Create `obj/command/system/ConfigController.ts`

Model `{ key?: string; value?: string }`. Dispatch on arg presence (mirror `SettingsController`'s `send`/scene pattern, topic e.g. `system.app.config`):

- **No key** → list: `AppApi.settings()`, render `key = value` lines (registry keys first, then extra bag keys), each line marking whether it's a registry key or ad-hoc. Status `ok`.
- **key, no value** → show one: print `key = AppApi.setting(key)`. (Open namespace — even an unregistered key resolves to its bag value or empty; show what's there.)
- **key + value** → set:
  1. `await AppApi.setSetting(key, value)`.
  2. Emit success prose: `\n{key} set to {value}.\n`.
  3. **Soft unknown-key note:** if `AppSettingDefaults[key]` is undefined (i.e. not a blessed key), append a prose line `(note: "{key}" is not a known setting — it was still saved)`. This is **prose only** — do **not** call `context.note({ kind: 'controller-rejected' })` (that would mark the command `declined`; the write *succeeded*). Status stays `ok`. There is no generic `info` Note kind to use (verified), so the soft signal is a scene line, exactly satisfying "surfaces a soft note … still writes … hard rejection not required."

> **Build-agent caution — `config` is async.** `setSetting` is `async`; the controller's `execute` must `await` it. `EnrollController.commit` is async and dispatched, so async controller bodies are supported — follow that precedent (do **not** copy `SettingsController`'s sync-set assumption).

## 6. Workstream E — consumer migration (the two integrations + the constant deletion)

### E1. Edit `lib/spatial/Container.ts` — evac migration

- Remove `import { DEFAULT_STARTING_LOCATION_PATH } from '../../config/constants';` (line 39); add `import { AppApi } from '../../api/app';` and `import { AppSettingKeys } from '../config/keys';`.
- In `cleanupOnDestruct`, replace the pre-resolved local:
  ```ts
  const evacuationFallback =
    outer === null && snapshot.length > 0
      ? StuffApi.findByTemplatePath<Stuff & Container>(
          AppApi.setting(AppSettingKeys.evacuationFallback)
        ) ?? null
      : null;
  ```
  Rename the misnamed `voidFallback` → `evacuationFallback` at both its declaration and its use (line ~157). `AppApi.setting` is sync + cached — honors the no-`await` constraint.
- **Default flips lobby → `/domain/void`** purely via the registry default (the constant's old lobby value is gone). Verified correct: `/domain/void` is the bootstrap-pinned, destruct-refusing evac singleton.

> **Caution — `Container.ts` is `lib/` importing `api/`.** Confirm there's no load-time cycle: `api/app.ts` imports `lib/config/AppSettings` + `lib/config/keys` + `api/security`; it does **not** import `lib/spatial`. `Container` already imports `api/` modules (`ContainmentApi`, `MixinApi`, `StuffApi`), so `api/app` is the same shape — no new cycle. If a cycle surfaces, the established fix is a type-only import + lazy access, but it should not arise.

### E2. Edit the two mint sites — inject `defaultStartLocation`

Both build `data` by spreading `...seed.data` then overlaying; add one overlay line that overrides the (now-removed) seed literal:

- `obj/command/charactergen/EnrollController.ts` (~line 494, the `const data` object): add `startLocation: AppApi.setting(AppSettingKeys.defaultStartLocation),` to the overlay. **This is the only change to char-gen's just-merged commit path — one line, no restructuring.**
- `backend/Application.ts` `createDefaultAvatarTemplate` (~line 395, the `const data` object): add the same line.
- Add the imports (`AppApi`, `AppSettingKeys`) to both files.

> **Backend layer note:** `Application.ts` is `packages/server/src/backend/`. Importing `mud/api/app` and `mud/lib/config/keys` from backend is fine — backend already imports `WorldClockApi`, `CommandApi`, etc. from `mud/`.

### E3. Edit `seeds/obj/Avatar/seed.yaml` — remove the literal

- Delete `startLocation: /domain/lounge/warren` (line 40) **and** its preceding comment block (lines 27–39, the spawn-vs-evac explanation that references `DEFAULT_STARTING_LOCATION_PATH`). Replace with a one-line comment noting `startLocation` is now stamped at mint time from `AppApi.setting(AppSettingKeys.defaultStartLocation)`.

> **Risk — direct-seed-clone with no spawn.** After removal, anything that clones `/obj/Avatar/seed` *directly* (not through the two injecting mint paths) gets an Avatar with no `startLocation`, hence no spawn target. **Verify before removing:** grep for clones of `SEED_TEMPLATE_PATH` / `/obj/Avatar/seed` outside the two mint sites. If a direct-clone path exists (tests, `provisionTestCharacter` if it bypasses `createDefaultAvatarTemplate`), it must either route through a mint site or stamp `startLocation` itself. The requirements assert "the bare seed template is only ever forked through these two injecting paths" — confirm that assertion holds; if it doesn't, flag it rather than silently shipping a spawn-less seed.

### E4. Delete `mud/config/constants.ts`

- Remove the file. After E1 there is no production importer.
- Clean the stale prose reference in `lib/stuff/VoidLocation.ts:8` (the docstring mentions `DEFAULT_STARTING_LOCATION_PATH`) — reword to reference the `evacuationFallback` app setting.
- Update the test `domain/lounge/__tests__/seed-repoint.test.ts` (it imports `DEFAULT_STARTING_LOCATION_PATH` and asserts `seed.data.startLocation` + the constant value). This test's premises are obsoleted by this build: the seed no longer carries `startLocation`, the constant is gone. **Rewrite or retire it** — see §11.2.

> **Acceptance gate:** after E1–E4, `grep -rn "config/constants\|DEFAULT_STARTING_LOCATION_PATH" packages/server/src` must return **zero** hits (including tests and docstrings). This is an explicit acceptance criterion; make it a build-completion check.

## 7. Workstream F — docs

### F1. Create `docs/subsystems/app-settings.md`

Document: the `AppSettings` Document (`app_settings`, single `values` bag, `loadOrSeed`); the registry (`keys.ts`, blessed keys + defaults, open namespace); `AppApi` (sync cached `setting`, `settings`, async `setSetting`; runtime-ops-only, the app-ops home for future `shutdown`/MOTD); the cache-holder decision (Document static slot) + `setSetting`'s self-refreshing mechanism; the boot seed/warm step in `AppBootstrap` and its ordering; the `config` verb (developer-gated, list/show/set, soft unknown-key note); the two v1 knobs and their consumers; **the layer distinction from backend `Application.ts`** (decision 2a); the deferred tails (more knobs, typed schema, lounge dials — all Wave 2+).

### F2. Edit `CLAUDE.md`

Add `app_settings — application-managed config singleton (Document)` to the **MongoDB Collections** list (currently `users`/`google_profiles`/`domain`; `world_state` is also unlisted there — add `app_settings`, optionally `world_state` too, but `app_settings` is the required one). Optionally add a one-line subsystem-doc map entry for `app-settings.md`.

## 8. Test plan (acceptance-criterion → test)

Tests are colocated `__tests__/` siblings, Vitest. Persistence unit tests stub `PersistenceManager.get()` via `vi.spyOn(pm, 'save'|'find')` (the `WorldClockState.persistence.test.ts` pattern — no real Mongo).

| # | Acceptance criterion | Test file | Unit/Integration | Case |
|---|---|---|---|---|
| 1 | Fresh DB seeds exactly one `app_settings` row from the registry; `setting()` returns sync after `loadOrSeed()` | `lib/config/__tests__/AppSettings.test.ts` | Unit (stubbed PM) | `find` returns `[]` → `loadOrSeed` saves one row whose `values` == `AppSettingDefaults`; cache warmed; `AppApi.setting(defaultStartLocation)` returns `/domain/lounge/warren` synchronously |
| 2 | Idempotent re-seed | same | Unit | `find` returns an existing row → `loadOrSeed` does **not** save again; uses the existing row |
| 3 | Registry-default fallback for a key absent from a pre-existing row | `api/__tests__/app.test.ts` | Unit | cache holds a row whose `values` lacks `evacuationFallback` → `AppApi.setting(evacuationFallback)` returns `/domain/void` (default), not undefined |
| 4 | Verb list / show / set + cache refresh without restart | `obj/command/system/__tests__/ConfigController.test.ts` | Integration (CommandApi.createCommandContext) | `config` lists registry keys at defaults; `config defaultStartLocation` shows one; `config defaultStartLocation /x` sets, persists (PM.save called), and an immediate `AppApi.setting` reflects `/x` |
| 5 | Unregistered key round-trips + soft note | same | Integration | `config someKnob hi` succeeds (status `ok`), `AppApi.setting('someKnob')==='hi'`, scene output contains the "not a known setting" prose, **no `controller-rejected` note** |
| 6 | `isDeveloper` allow + reject | `obj/command/system/__tests__/ConfigController.test.ts` (or a validator-level test) | Integration | dispatch as non-developer → `validator-failed`/rejected, no write; as developer → succeeds. (Mirror `requiresDeveloper`'s existing test approach; stub `AccessApi.isDeveloper`.) |
| 7 | Evac to **current** fallback; changing it changes next destruct | `lib/spatial/__tests__/Container.destruct.test.ts` (extend) | Integration | destruct a container with an orphaned `HasInteractive`, no outer → occupant lands at `/domain/void`; then `setSetting(evacuationFallback, /domain/other)` → next destruct evacuates to `/domain/other` |
| 8 | New avatar spawns at current `defaultStartLocation`; changing it moves next spawn; legacy path sources same value | char-gen mint test (extend existing `EnrollController` suite) + a `createDefaultAvatarTemplate` test | Integration | minted template's `data.startLocation === AppApi.setting(defaultStartLocation)`; after `setSetting`, the *next* mint uses the new value |
| 9 | No `config/constants.ts` / `DEFAULT_STARTING_LOCATION_PATH` references; file deleted; seed YAML literal gone | a static guard test or the build-completion grep | Unit/CI | grep returns zero; `seeds/obj/Avatar/seed.yaml` has no `startLocation` |

Notes:
- **#1–#3 are unit** (stubbed PM, no dispatch). **#4–#8 are integration** (command dispatch and/or mint flow). #9 is a tree-grep guard (can live as a tiny vitest that fails if the strings reappear, or be a sweep-time check).
- For #6, the cleanest is to assert at the **validator** layer (the `requiresDeveloper` preload) plus one end-to-end dispatch, reusing the access-test stubbing already in `api/__tests__/access.test.ts`.
- The `config`-set tests must stub PM.save (so no real Mongo) and pre-warm `AppSettings._cached` via `loadOrSeed()` against the stub, then `AppSettings._resetForTesting()` in `afterEach`.

## 9. Risks / sequencing notes

- **Evac default flip blast radius (lobby → void).** The live behavioral change: orphaned `HasInteractive` occupants now evacuate to `/domain/void` instead of the lobby. This is the *designed* target (void refuses destruct; lobby could itself be destructed). Existing `Container.destruct.test.ts` likely asserts the lobby — it **must be updated** to assert `/domain/void` (#7). Flag any other test asserting the lobby as evac target.
- **Touching char-gen's just-merged commit path.** Keep E2 to a single overlay line in `EnrollController.commit`; do not restructure draft/commit. The `longDescription` overlay already in that object is the template for "spread then override" — add `startLocation` the same way.
- **Avatar seed YAML removal + direct-clone paths.** Per E3's caution: confirm no path clones the bare seed without going through a mint site. If `provisionTestCharacter` or any test fixture clones `/obj/Avatar/seed` directly, it would now lack a spawn — route it through `createDefaultAvatarTemplate` (already injects) or have it stamp `startLocation`. **This is the highest-risk item; verify the grep before deleting the literal.**
- **Boot ordering.** `AppSettings.loadOrSeed()` must run after PM connect + `BootstrapManager.run()` (void pinned) and before any evac. Placed just before `WorldClockApi.boot()` (§1.3). An unwarmed cache must throw loudly (`getCached()` guard), never return undefined — a silent undefined would make the evac path resolve `findByTemplatePath(undefined)`.
- **Seed must persist (not defer).** Unlike `WorldClockState`, `loadOrSeed()` saves on fresh DB (acceptance: "seeds exactly one row"). Guard against double-insert via the `find({})`-first check.
- **`config` controller async.** `setSetting` is async; ensure the controller body awaits and that the controller base supports `async execute` (it does — `EnrollController.commit` precedent). Don't copy `SettingsController`'s sync-set assumption.
- **Soft note ≠ rejection.** The unknown-key message must not escalate status to `declined`. There is no `info` Note kind; use prose only. Easy to get wrong by reflexively reaching for `controller-rejected`.

## 10. Complete file manifest

**Created (6):**
- `packages/server/src/mud/lib/config/keys.ts` — registry (constants module)
- `packages/server/src/mud/lib/config/AppSettings.ts` — Document class
- `packages/server/src/mud/api/app.ts` — `AppApi` (Api, decorated)
- `packages/server/src/mud/cmd/system/config.yaml` — command view
- `packages/server/src/mud/obj/command/system/ConfigController.ts` — controller
- `docs/subsystems/app-settings.md` — subsystem doc

**Created — tests (≥4):**
- `packages/server/src/mud/lib/config/__tests__/AppSettings.test.ts`
- `packages/server/src/mud/api/__tests__/app.test.ts`
- `packages/server/src/mud/obj/command/system/__tests__/ConfigController.test.ts`
- (extend) `EnrollController` / `createDefaultAvatarTemplate` mint tests

**Modified (8):**
- `packages/server/src/backend/AppBootstrap.ts` — add `loadOrSeed` step
- `packages/server/src/mud/lib/spatial/Container.ts` — evac migration + rename
- `packages/server/src/mud/obj/command/charactergen/EnrollController.ts` — one overlay line
- `packages/server/src/backend/Application.ts` — one overlay line
- `packages/server/src/mud/seeds/obj/Avatar/seed.yaml` — remove literal + comment
- `packages/server/src/mud/lib/stuff/VoidLocation.ts` — clean stale docstring ref
- `packages/server/src/mud/lib/spatial/__tests__/Container.destruct.test.ts` — assert `/domain/void`
- `CLAUDE.md` — add `app_settings` to collections list

**Modified or retired — test:**
- `packages/server/src/mud/domain/lounge/__tests__/seed-repoint.test.ts` — premises obsoleted (no seed `startLocation`, no constant); rewrite to assert the new mint-time injection, or retire.

**Deleted (1):**
- `packages/server/src/mud/config/constants.ts`

## 11. Open ambiguities / under-specification flags (none reopen settled scope)

1. **Direct-seed-clone spawn gap (§E3 / §9).** The requirements *assert* the bare Avatar seed is only forked through the two injecting mint paths. **This must be verified, not trusted** — if any test/fixture/`provisionTestCharacter` path clones `/obj/Avatar/seed` directly, removing the YAML literal leaves it spawn-less. Build agent: grep `SEED_TEMPLATE_PATH` usages before deleting line 40.
2. **`seed-repoint.test.ts` fate.** That test exists specifically to assert the *old* spawn-vs-evac split (seed `startLocation` == warren, constant == lobby, the two differ). This build collapses that premise (no seed literal, no constant). It cannot survive unchanged. Decision needed at build time: rewrite to assert the new model (mint-time injection + `evacuationFallback` default `/domain/void`) or retire it. **Flagging because deleting a constant the test imports will break the build until this is resolved.**
3. **Soft-note channel.** Requirements say "soft note" but the envelope has no `info`/`notice` Note kind. Resolved here as **player-facing prose, status `ok`** (§D2). If a future generic info-note kind lands, migrate; not in scope now.
4. **`config` value with spaces / empty.** `value` is `greedy`. An empty-string set (`config key ""`) — v1 stores the given string verbatim (no validation, per non-goals); acceptable. No path-resolution validation (explicitly out of scope).

These are mechanism choices within the settled surface; each has a chosen default and is called out so the build agent resolves #1 and #2 explicitly rather than discovering them mid-build.
