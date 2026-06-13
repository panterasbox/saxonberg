# Application settings — requirements

App-wide, **application-managed** configuration gets a real home: a singleton
`AppSettings` `Document` in Mongo, seeded with code-defined defaults at
first boot, cached for synchronous reads, and edited in-app via a
developer-gated `config` verb. It retires `config/constants.ts` — whose
one constant, `DEFAULT_STARTING_LOCATION_PATH`, is now (post char-gen)
serving only the evacuation fallback, pointed at the wrong target, under
a stale variable name. This build splits the conflated concern cleanly
into two named, operator-editable settings and deletes the constants
file.

Seeded by [docs/slates/builds/game-config-slate.md]. Modeled directly on
the shipped [`WorldClockState`](../subsystems/time.md) singleton-state
`Document` (the `world_state` collection precedent). The fourth config
category alongside per-player `settings` (`EnvironmentMixin`),
per-Stuff `Propertied`, and server-persisted client-UI-state.

## What changed since the slate

The slate predates the char-gen merge (`7aa5b72e`). Two of its premises
have already shifted in the codebase, and the requirements reflect
reality, not the slate text:

1. **Spawn is already split out — and per-avatar.** Char-gen shipped
   `Avatar.startLocation` as an *instruction field* (the avatar's
   durable spawn **and recall** reference, seeded `/domain/lounge/warren`,
   applied by `Avatar.applyStartLocation` at clone time). So
   `DEFAULT_STARTING_LOCATION_PATH` no longer drives spawn at all — it is
   now read in exactly one place, the evacuation path.

2. **The evac default is settled by the code, toward the void.**
   `VoidLocation` (`/domain/void`) is a bootstrap-pinned singleton
   `Container` that *refuses destruct* and whose own docstring names its
   second role as the `HasInteractive` evac fallback for
   `Container.cleanupOnDestruct`. It is the *designed* evac target; the
   lobby is the accident of the old conflated constant. (The current
   `constants.ts` comment claims the opposite — "must stay the lobby" —
   and is misinformed; the void is the *more* reliable live container,
   since it cannot be destructed.)

## Goals

- A singleton `AppSettings` `Document` (own `app_settings` collection;
  `loadOrSeed()`; Mongo-assigned `_id`) whose persisted state is a single
  generic **`values` key/value bag** (`Record<string, string>`) — *not* a
  field per setting. The bag is an open namespace; adding a knob later
  never changes AppSettings's persisted shape.
- A **central key registry** (one exported file, mirroring `lib/paths.ts`)
  holding the known setting **key constants and their defaults** —
  consumers reference the constant, not a magic string, and each default
  is written once. ([[feedback_no_premature_registries]] — justified by
  the `lib/paths.ts` precedent + concrete cross-consumer duplication, not
  speculative.)
- The bag is **seeded at first boot from the registry** with the two v1
  knobs and their defaults: **`defaultStartLocation`**
  (`/domain/lounge/warren`) and **`evacuationFallback`** (`/domain/void`),
  so `config` shows them out of the box.
- **`AppApi`** as the public surface — the deliberate home for
  operator-invoked app operations (settings now; `shutdown()` / MOTD /
  maintenance later). Sync cached reads (`AppApi.setting`), async writes
  (`AppApi.setSetting`). The `AppSettings` Document is pure persistence
  behind it. **Runtime operations only** — no boot/seed methods on the Api.
- A cached read surface warmed once at boot by a **backend** bootstrap
  step (calling `AppSettings.loadOrSeed()`), so synchronous consumers (the
  evac path, which cannot `await`) read current values without I/O.
- A developer-gated `config` verb (over `AppApi.setSetting`): list keys +
  values, show one, set one (persists + refreshes the cache; auditable).
  No deploy needed to move the start location.
- **`defaultStartLocation`** is the single source for the *initial*
  `startLocation` stamped into every newly-minted avatar template. Both
  avatar-mint paths read it; the Avatar seed YAML's `startLocation`
  literal is retired.
- **`evacuationFallback`** (default `/domain/void`) replaces
  `DEFAULT_STARTING_LOCATION_PATH` in `Container.cleanupOnDestruct`; the
  lobby→void drift and the stale `voidFallback` variable name are
  untangled in the same pass.
- `config/constants.ts` is **deleted** — it holds nothing else.

## Non-goals

- **More app-wide knobs (MOTD, world feature flags, global toggles).**
  Wave 2+; each is one registry entry (key + default) plus the consumer
  that reads it — never a change to AppSettings' persisted shape. v1 is
  exactly the two start-location knobs.
- **The lounge distribution knobs** (`budThreshold` / `mergeWatermark` /
  `reapGraceMs`, the flatten-to-one-room config). A known early
  follow-on per the slate; they ship as lounge code constants and move
  here when they actually want live tuning. Not v1.
  ([[feedback_no_premature_registries]])
- **Speculative `AppApi` methods.** `AppApi` is the home for app-level
  operations (decision 2a), but v1 builds **only** the settings surface
  (`setting`/`settings`/`setSetting`/`boot`). No empty `shutdown()` /
  maintenance-mode / MOTD stubs — those land with their own builds.
  ([[feedback_no_premature_registries]], [[feedback_documented_means_build]])
- **A typed-config schema / per-setting validation / migration
  framework.** The registry holds key + default **only** — no per-setting
  value types, validators, or migrations. Storage stays an open
  string→string bag; the verb sets any key. A richer schema mechanism
  (typed values, validation — à la `EnvironmentMixin`'s `SettingsSchemaEntry`)
  is deferred until the knob count justifies it.
  ([[feedback_no_premature_registries]])
- **Per-player / per-Stuff / client-UI-state / secrets-and-infra
  config.** Those are `EnvironmentMixin` `settings`, `Propertied`, the
  TBD client-state substrate, and `.env` / SSM Parameter Store
  respectively. ([[feedback_settings_vs_propertied_vs_client_state]])
- **Re-homing the avatar's per-character recall semantics.**
  `Avatar.startLocation` stays the per-character spawn/recall field;
  AppSettings only supplies its *initial* value at mint time.

## Surface decisions

### 1. Two settings in v1 — both `defaultStartLocation` and `evacuationFallback`

The slate's full v1. Even though char-gen already gave spawn a per-avatar
home, `defaultStartLocation` earns its place: it makes the new-player
spawn point operator-editable in-app (the slate's worked scenario —
move spawn as onboarding evolves, no deploy), and gives AppSettings a
genuine second knob rather than a one-row curiosity. `evacuationFallback`
is the direct migration of the surviving constant.

| Knob | Meaning | Seed default |
|---|---|---|
| `defaultStartLocation` | The initial `startLocation` stamped into a brand-new avatar template at mint. Nothing else. | `/domain/lounge/warren` |
| `evacuationFallback` | Where an orphaned `HasInteractive` goes when its container destructs with no outer. | `/domain/void` |

### 2. Config is a key/value bag, not a field per setting

App config is a **key/value namespace**, not a fixed typed schema. The
`Document` base is a *typed-persistence* model (named fields round-trip
via `persistentFields`); `WorldClockState` lists three fields because it
genuinely has a fixed three-scalar schema. Config does not — modeling it
as a field per setting would put a hand-maintained central list of every
knob in one file, which is a per-consumer concern leaking into AppSettings.

So AppSettings borrows `WorldClockState`'s **singleton-row plumbing** but
not its field shape:

- `AppSettings extends Document`, `collectionName = 'app_settings'`,
  `persistentFields = ['values']` — **one** persistent field, forever, a
  `Record<string, string>` bag. That list never grows; adding a knob
  touches the key registry (below), never this persisted shape.
- `static loadOrSeed()` finds the sole row via `find({})` (Mongo assigns
  `_id`) or, on an empty collection, returns a fresh instance whose
  `values` is **seeded** from the registry (see decision 3).
- The `AppSettings` Document is **pure persistence** (`loadOrSeed` + the
  cached singleton); the public read/write surface is `AppApi` (decision
  2a). A backend bootstrap step warms the cache (decision 3); `AppApi`
  serves reads from it.

### 2a. `AppApi` is the public surface — settings now, app-ops home later

App config is read/written through an `AppApi`, not static accessors on the
Document. A single-purpose Api would normally be over-reach
([[feedback_no_new_apis_default]]), but `AppApi` is the deliberate home for
**operator-invoked application operations** — settings lookup is its first
responsibility, with lifecycle (`shutdown()`), MOTD broadcast, maintenance
mode, etc. arriving as the engine grows. That foreseen multi-operation
surface clears the bar. (It mirrors `WorldClockApi` as the *operations Api
over a State Document* — but **not** in owning a boot step: the clock's
`boot()` starts a running subsystem; app settings have no behavior to start,
so their seed/warm is plain backend infrastructure, see decision 3.)

`AppApi` carries **runtime operations only** — nothing about startup or
seeding. v1 builds only the settings methods — no speculative stubs:

- `AppApi.setting(key): string` — sync read from the cached singleton,
  resolving `values[key] ?? AppSettingDefaults[key]`. **Ungated** — the
  internal consumers (the sync evac path, the avatar-mint paths) are engine
  code, not developers.
- `AppApi.settings(): Record<string, string>` — registry keys ∪ keys
  present in the bag, for the `config` listing.
- `AppApi.setSetting(key, value): Promise<void>` — write + persist +
  refresh the cache. The mutation surface the `config` verb calls;
  developer-gating lives at the verb, not duplicated here.

`AppApi` lives in `mud/api/` and ends with `SecurityApi.decorateApiClass`
like every Api. (Note: distinct from the backend `Application.ts`, which is
server/OAuth orchestration a layer down — the subsystem doc should call out
the distinction.) Reads stay synchronous from the cache the backend warms
at boot, satisfying the evac path's no-`await` constraint.

### 2b. Central key registry — keys + defaults in one file

The *storage* is an open bag, but the *known keys* are not scattered as
magic strings across consumers. A single file exports the key constants
and their defaults, mirroring [`lib/paths.ts`](../../packages/server/src/mud/lib/paths.ts)
(the platform template-path index) — whose own docstring already defers
spawn/evacuation content-paths to "app config," i.e. to this registry.
Shape (planner may tune the exact form):

```ts
export const AppSettingKeys = {
  defaultStartLocation: "defaultStartLocation",
  evacuationFallback: "evacuationFallback",
} as const;
export const AppSettingDefaults: Record<string, string> = {
  [AppSettingKeys.defaultStartLocation]: "/domain/lounge/warren",
  [AppSettingKeys.evacuationFallback]: "/domain/void",
};
```

Consumers reference the constant —
`AppApi.setting(AppSettingKeys.evacuationFallback)` — never a bare
string, so a key is declared once and a typo is a compile error. A
default shared by multiple consumers (e.g. `defaultStartLocation`, read
at two mint sites) is written exactly once. `AppApi.setting(key)`
resolves `values[key] ?? AppSettingDefaults[key]`, so the registry
default is the safety net when the persisted row predates a newly-added
key — no consumer-side `?? default` needed.

This is **not** a return to a typed field per setting. The Document's
persisted shape stays the single open `values` bag, so adding a setting
**never changes AppSettings' persistence** — it is one registry line plus
the consumer that reads it (and a consumer is mandatory anyway: an unread
setting is inert). The bag stays open at the verb (arbitrary keys can be
set); the registry indexes the *blessed* keys, exactly as `TemplatePaths`
indexes blessed paths while the engine still resolves arbitrary ones. The
registry is the AppSettings subsystem's typed surface — **not** a revived
generic constants dump (the role `config/constants.ts` played and this
build deletes); it lives with the subsystem (`lib/config/`), not as a
catch-all.

App settings are the **app-scoped sibling** of per-player `settings`
([shell-environment.md](../subsystems/shell-environment.md)): same
key/value shape, one global scope instead of per-character (which is why
they can't literally reuse `settings` — those live on the Avatar and
resolve through the player's lookup chain). The per-player system
decentralizes its schema across mixins; app settings centralize theirs in
the registry — the right call here because the consumers aren't on one
prototype chain to walk.

### 3. Seed + warm at first boot — a **backend** bootstrap step, not an Api method

Seeding the collection and warming the cache are **backend** concerns
(automatic startup infrastructure), not runtime operations — so they live
in the boot sequence, not on `AppApi`. The mechanism is a `static
AppSettings.loadOrSeed()` on the Document (persistence); a backend
bootstrap step *invokes* it once at startup.

**Seed.** On an empty `app_settings` collection, `loadOrSeed()` writes a
row whose `values` bag is pre-populated **from the registry**
(`AppSettingDefaults`, decision 2), not a second hand-kept literal — the
defaults are written in exactly one place and the seed is just a copy.
This makes the knobs visible in `config` and editable out of the box; it
does **not** close the bag (the verb can still set unregistered keys).

**Warm.** The same step loads the (now-guaranteed) row into the in-memory
cache `AppApi.setting()` reads, so the cache is hot before any synchronous
consumer (the evac path) runs. The cache is held wherever is natural (the
`AppSettings` Document's own static singleton slot is the obvious home —
planner's call); the invariant is that **no boot/seed/warm method hangs
off `AppApi`**.

**Placement.** A backend bootstrap step (`AppBootstrap`, alongside the
clock at `AppBootstrap.ts:137`, or `SeederManager` — planner's call)
`await`s `AppSettings.loadOrSeed()`. This is the parallel to the clock's
boot in *timing*, but deliberately **not** in shape: the clock exposes
`WorldClockApi.boot()` because booting starts a running subsystem; app
settings have nothing to start, so seeding stays plain backend infra and
the Api stays operations-only.

### 4. `evacuationFallback` default is `/domain/void` (fixes the drift)

Verified correct against the code: `VoidLocation` is the bootstrap-pinned,
destruct-refusing singleton built for exactly this fallback role.
`Container.cleanupOnDestruct` (`Container.ts:136`) switches from
`DEFAULT_STARTING_LOCATION_PATH` to
`AppApi.setting(AppSettingKeys.evacuationFallback)` (sync, cached). The pre-resolved local currently misnamed `voidFallback`
(it resolves the *lobby* today) is renamed to match what it now actually
holds — the resolved `evacuationFallback` container.

### 5. `defaultStartLocation` integration — both mint paths inject; seed literal retired

The new-avatar initial `startLocation` is sourced from
`AppApi.setting(AppSettingKeys.defaultStartLocation)` at both
template-mint sites,
each of which builds `data` by spreading `...seed.data` then overlaying
fields:

- `EnrollController.commit` (`EnrollController.ts:~494`) — the real
  char-gen path.
- `Application.createDefaultAvatarTemplate` (`Application.ts:381`) — the
  test/legacy signup + `provisionTestCharacter` path.

Each adds `startLocation: AppApi.setting(AppSettingKeys.defaultStartLocation)`
to the overlay (overriding the spread seed value). The Avatar **seed YAML's**
`startLocation` literal is **removed** — AppSettings is the single source
for the initial value, and the bare seed template is only ever forked
through these two injecting paths. The per-avatar `Avatar.startLocation`
field is untouched as a concept: it remains the durable, individually
mutable spawn/recall home; AppSettings only sets its starting value.

This is the only change to char-gen's just-merged commit path — a single
overlay line at the mint site, no restructuring of the draft/commit
machinery.

### 6. The `config` verb — developer-gated, list / get / set

A single-token verb (`config`), gated by `AccessApi.isDeveloper` (the
operator / TS-escape tier, above content authoring — app config is
operator-level). Shape:

```
config                                      → list set keys + current values
config defaultStartLocation                 → show one
config defaultStartLocation /domain/lounge/warren  → set + persist + refresh cache
```

Set writes the key into the `values` bag, persists the row, refreshes the
static cache, and is auditable. `config` with no args lists the **union of
the registry keys** (`AppSettingKeys`, each showing its current-or-default
value) **and any extra keys** present in the bag — so every blessed knob
is discoverable even before it's been set, and ad-hoc keys are visible
too. The namespace stays **open**: the verb accepts setting any key (the
registry indexes blessed keys, it doesn't gate the verb). v1 stores the
value as the given string; deep value validation (e.g. that a path
resolves) is out of scope. A set to a key not in the registry should emit
a soft "not a known setting" note (it still writes — open namespace) so a
typo is visible rather than silently inert; hard rejection is not
required.

### 7. `config/constants.ts` is deleted

Its sole export migrates into the `Document`. Going forward there is no
central constants file: application-managed values → `AppSettings`; infra/secrets
→ `.env` / Parameter Store; module-internal constants → colocated in
their owning module. No reference to `config/constants.ts` remains in the
tree.

## Constraints

- **Synchronous reads only from cache.** `Container.cleanupOnDestruct`
  runs synchronously and must not `await`; all current-value reads go
  through the sync, cached `AppApi.setting(key)`. An unwarmed cache is a
  boot ordering bug — the backend seed/warm step (`AppSettings.loadOrSeed`)
  must precede any consumer.
- **One Api, no runtime registry singleton.** `AppApi` is the surface
  (justified as the app-ops home, decision 2a) — not a second Api, and
  not padded with speculative methods. The central key registry is a plain
  *constants module* (the `lib/paths.ts` pattern), **not** a runtime
  registry Stuff. ([[feedback_no_new_apis_default]], [[feedback_no_premature_registries]])
- **Document track, not Stuff.** `AppSettings` is meta/config — plain
  Mongo JSON via the `Document` base, no Stuff/Template overhead. See
  [persistence.md](../subsystems/persistence.md).
- **No per-field setters to invariant-guard.** The bag is generic and v1
  does no value validation. If a future knob needs validation it belongs
  at the consumer's read (or a verb-level check at set time), never a
  post-hydration `normalize`. ([[feedback_field_invariants_on_setters]])
- **Module placement.** `AppSettings.ts` and the key registry live in a
  `lib/<subsystem>/` folder for the concern (candidate: `lib/config/`),
  not at `lib/` root and not a revived `config/`
  ([[feedback_respect_lib_subsystem_categorization]]). (The registry is
  the subsystem's own typed surface, not a generic constants dump —
  unlike `lib/paths.ts`, which is cross-cutting infra at `lib/` root.)
  The `config` verb is a YAML view + controller pair in an existing
  command category (candidate: `system`) — planner's placement call. No
  new module category. ([[feedback_no_api_for_content]] does not apply —
  this is substrate, not content.)
- **Minimal touch to char-gen.** The integration is one overlay line at
  each of the two mint sites; do not restructure the enroll/commit flow.
- **Naming.** Settings use the bare conceptual names already chosen
  (`defaultStartLocation`, `evacuationFallback`). No `Saxonberg`-branded
  identifiers. ([[feedback_no_saxonberg_in_codebase]])

## Acceptance criteria

- A fresh database boots and seeds exactly one `app_settings` row whose
  `values` bag is populated **from the registry** (the two known knobs at
  their defaults); `AppApi.setting(key)` returns synchronously after the
  backend boot step runs `AppSettings.loadOrSeed()`.
- The setting keys and their defaults are declared in **one** registry
  file; both mint-site consumers and the evac path reference the exported
  key constant (no bare key literal), and the `defaultStartLocation`
  default string appears exactly once in the tree.
- `config` with no args lists every registry key (with its current-or-
  default value) plus any extra keys set in the bag; `config <key>` shows
  one; `config <key> <value>` writes the key, persists, refreshes the
  cache, and a subsequent read reflects the new value without a restart.
- Setting a key not in the registry (`config someKnob x`) succeeds and
  round-trips (open namespace) and surfaces a soft "not a known setting"
  note.
- `AppApi.setting(key)` for a registry key absent from a (pre-existing)
  persisted row falls back to the registry default rather than returning
  undefined.
- A non-developer running `config` (or its set form) is rejected by the
  `isDeveloper` gate; a developer succeeds.
- After a container destructs with an orphaned `HasInteractive` occupant
  and no outer, the occupant evacuates to the **current**
  `evacuationFallback` (default `/domain/void`); changing
  `evacuationFallback` via the verb changes the destination for the next
  destruct.
- A brand-new avatar (via `EnrollController.commit`) spawns at the
  current `defaultStartLocation`; changing it via the verb changes where
  the *next* new avatar spawns. The test/legacy mint path
  (`createDefaultAvatarTemplate`) sources the same value.
- No reference to `config/constants.ts` or `DEFAULT_STARTING_LOCATION_PATH`
  remains anywhere in the tree; the file is deleted; the Avatar seed
  YAML no longer carries a `startLocation` literal.
- Tests cover: fresh-DB seeding of the bag from the registry; the
  registry-default fallback for a key absent from the row; verb get/set
  (incl. an unregistered key) + cache refresh; the isDeveloper gate (allow
  + reject); evac-to-current-fallback; new-avatar spawn-at-current-default.
- A subsystem doc for the config substrate exists (e.g.
  `docs/subsystems/app-settings.md` or a section in an existing config
  doc), and the CLAUDE.md MongoDB-collections list gains `app_settings`.

## Cross-references

- **Seeding slate**: [docs/slates/builds/game-config-slate.md](../slates/builds/game-config-slate.md)
- **The precedent**: [`WorldClockState`](../../packages/server/src/mud/lib/time/WorldClockState.ts)
  (Document) + `WorldClockApi` (surface, `boot()`/`shutdown()`) /
  [docs/subsystems/time.md](../subsystems/time.md) — the exact
  State-Document-behind-an-operations-Api split `AppSettings`/`AppApi`
  mirror; seeded + boot-warmed at `AppBootstrap.ts:137`.
- [persistence.md](../subsystems/persistence.md) — the `Document` base.
- [`lib/paths.ts`](../../packages/server/src/mud/lib/paths.ts) — the
  template-path index; the central-constants-file pattern the key registry
  mirrors (and which already defers spawn/evac content-paths to app config).
- [shell-environment.md](../subsystems/shell-environment.md) — the
  per-player `settings` system: the key/value precedent AppSettings is the
  app-scoped sibling of (`SettingsSchemaEntry` is the richer schema we're
  deferring).
- [char-gen.md](../subsystems/char-gen.md) — the avatar-mint / commit path
  `defaultStartLocation` injects into; `Avatar.startLocation` instruction
  field.
- [location.md](../subsystems/location.md) — the `startLocation` spawn
  instruction, Warren resolution, the lounge target.
- [access.md](../subsystems/access.md) — `AccessApi.isDeveloper`, the
  `config` verb's gate.
- [docs/deployment.md](../deployment.md) — the *infra* config half (`.env`
  / SSM Parameter Store); AppSettings is the in-app half.
- Memory: [[project_app_settings]], [[feedback_settings_vs_propertied_vs_client_state]],
  [[feedback_no_new_apis_default]], [[feedback_no_premature_registries]].
