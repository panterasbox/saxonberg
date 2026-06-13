# App settings

Application-wide, operator-managed configuration: the values that are
*game-managed* (an operator changes them in-app and they persist) but are
*not* per-player, per-Stuff, secrets, or deploy-time infra. The fourth
config category, alongside per-player `settings`
([shell-environment.md](./shell-environment.md)), per-Stuff `Propertied`
([properties.md](./properties.md)), and server-persisted client-UI-state.

Source of truth for this subsystem. Built from
[app-settings-requirements.md](../requirements/app-settings-requirements.md)
/ [app-settings-plan.md](../plans/app-settings-plan.md).

## Shape

Three small pieces, modeled on the `WorldClockState` (Document) ↔
`WorldClockApi` (operations surface) split:

| Piece | File | Role |
|---|---|---|
| `AppSettings` | `lib/config/AppSettings.ts` | Singleton `Document` (`app_settings` collection). Pure persistence + the warmed cache. |
| key registry | `lib/config/keys.ts` | `AppSettingKeys` + `AppSettingDefaults` — the blessed keys and their defaults, declared once. |
| `AppApi` | `api/app.ts` | The runtime read/write surface (and the future home for app-level ops). |
| `config` verb | `cmd/system/config.yaml` + `obj/command/system/ConfigController.ts` | Developer-gated in-app editing. |

### Storage is an open key/value bag, not a field per setting

`AppSettings` persists a *single* field — `values: Record<string,string>`,
so `persistentFields = ['values']` and never grows. Adding a setting is a
registry entry plus a consumer; it never changes the Document's persisted
shape. The bag round-trips natively through Mongo (no marshaller).

The verb can set *any* key (open namespace). The registry indexes only the
keys the engine itself reads — exactly as `lib/paths.ts` indexes blessed
template paths while the engine still resolves arbitrary ones.
`lib/paths.ts`'s own docstring defers spawn/evacuation content-paths "to
app config" — i.e. to this registry.

### Keys and defaults live in one registry

```ts
// lib/config/keys.ts
export const AppSettingKeys = {
  defaultStartLocation: "defaultStartLocation",
  evacuationFallback: "evacuationFallback",
} as const;
export const AppSettingDefaults: Record<string, string> = {
  [AppSettingKeys.defaultStartLocation]: "/domain/lounge/warren",
  [AppSettingKeys.evacuationFallback]: "/domain/void",
};
```

Consumers reference the constant — `AppApi.setting(AppSettingKeys.x)` —
never a bare string (a typo is then a compile error). A default shared by
multiple consumers (`defaultStartLocation`, read at every avatar-mint
site) is written exactly once. The default string for each v1 knob appears
in exactly one place in the tree: this file.

## The `AppApi` surface — runtime operations only

```ts
AppApi.setting(key): string              // sync cached read; values[key] ?? default ?? ""
AppApi.settings(): Record<string,string> // registry keys ∪ bag keys, for the listing
AppApi.setSetting(key, value): Promise    // write + persist + refresh cache
```

- **Reads are synchronous** off the warmed cache — the evacuation path in
  `Container.cleanupOnDestruct` cannot `await`. `setting` falls back to the
  registry default for a key a pre-existing row predates.
- **Reads are ungated**: the internal consumers (evac, avatar-mint) are
  engine code, not developers. **`setSetting` is reached only through the
  developer-gated `config` verb**; the gate lives at the verb (its
  `requiresDeveloper` validator), not duplicated on the Api.
- **`setSetting` is self-refreshing**: the cache holds the very instance it
  mutates and saves, so there is no separate re-read.
- **No boot/seed/warm method.** `AppApi` is the home for app-level
  *operations* (settings now; `shutdown()`, MOTD, maintenance mode later —
  things an operator invokes). It is deliberately *not* `WorldClockApi`:
  the clock's `boot()` starts a running subsystem, whereas app settings
  have nothing to start, so their seed/warm is plain backend
  infrastructure (below).

> **Not the backend `Application`.** `AppApi` (`mud/api/app.ts`) is the
> in-engine domain surface. The backend `Application` class
> (`packages/server/src/backend/Application.ts`) is server / OAuth / signup
> orchestration a layer down. Adjacent names, different layers.

## Seeding + warming is a backend bootstrap concern

The cache is held on the `AppSettings` Document (a `private static`
singleton slot). It is seeded and warmed by **`AppBootstrap.run`**, which
`await`s `AppSettings.loadOrSeed()` once at startup — after the manifest
pins `/domain/void` (the seeded `evacuationFallback` target) and before the
clock boots. `loadOrSeed` finds the sole row (`find({})`) or, on an empty
collection, seeds the bag **from the registry** and saves it, so a fresh DB
has exactly one `app_settings` row. It is idempotent (an existing row is
reused, not re-inserted).

This lives in `AppBootstrap`, not `SeederManager`: `SeederManager` seeds
*domain templates from disk*, whereas `app_settings` is a Document-track
meta row seeded from code — the same reason the clock's warm step lives in
`AppBootstrap`. Reading a setting before the warm step throws loudly
(`AppSettings.getCached`) rather than returning a silent `undefined`.

## The `config` verb

Single-token `config`, in the `system` command category, gated by the
`/lib/command/validators/requiresDeveloper` validator (the `eval`/`reload`
precedent — operator/TS-escape tier):

```
config                                       list every setting + current value
config defaultStartLocation                  show one
config defaultStartLocation /domain/lounge   set one (persist + refresh cache)
```

Two optional positional args (`key`, `value`); not subcommands. `value` is
a single token (a setting value is a path/scalar) — not greedy, because a
greedy arg is treated as required and a required arg cannot follow the
optional `key`. The listing shows every registry key at its current-or-
default value plus any ad-hoc keys, flagging ad-hoc ones with `*`. Setting
a key not in the registry succeeds and round-trips (open namespace) and
earns a soft prose note — prose only, status stays `ok` (the write
succeeded; it is **not** a `controller-rejected` envelope note).

## The two v1 settings and their consumers

| Key | Default | Read by |
|---|---|---|
| `defaultStartLocation` | `/domain/lounge/warren` | The three avatar-mint sites stamp it into a new avatar's `startLocation` at clone time: `EnrollController.commit`, `Application.createDefaultAvatarTemplate`, `Login.mintRandomGuestAvatar`. |
| `evacuationFallback` | `/domain/void` | `Container.cleanupOnDestruct` — where an orphaned `HasInteractive` evacuates when its container destructs with no outer. |

`defaultStartLocation` supplies only the *initial* value of each avatar's
per-character `Avatar.startLocation` field (the durable spawn/recall home,
individually mutable thereafter). The Avatar seed YAML no longer carries a
`startLocation` literal — all three mint sites inject from app config, so
an operator can move the new-player spawn in-app without a deploy.

`evacuationFallback` defaults to the void deliberately: `VoidLocation` is
the bootstrap-pinned, destruct-refusing singleton built to be the evac
fallback — a more reliable live Container than any ordinary room. This
replaced the retired `config/constants.ts` constant, which conflated the
spawn default with the evac fallback and pointed evac at the (destructible)
lobby.

## Adding a setting

1. Add a key + default to `lib/config/keys.ts`.
2. Read it where it's consumed: `AppApi.setting(AppSettingKeys.yourKey)`.

That's it — no change to `AppSettings`' persisted shape, no new Api. The
next fresh-DB boot seeds it; existing rows fall back to the registry
default until set. A setting nobody reads is inert, so the consumer is the
real work; the registry entry is its trivial tail.

## Boundaries — what is *not* app settings

- **Per-player** preferences → `EnvironmentMixin` `settings`
  ([shell-environment.md](./shell-environment.md)).
- **Per-Stuff** state → `Propertied` ([properties.md](./properties.md)).
- **Client-UI-state** persisted server-side → its own (TBD) substrate.
- **Secrets / deployment / infra** (Mongo URI, OAuth, ports) → `.env` /
  SSM Parameter Store ([deployment.md](../deployment.md)).
- **Module-internal code constants** → colocated in their owning module.

## Deferred

A richer typed schema (per-setting value types, validation, migration — à
la `SettingsSchemaEntry`); more app-wide knobs (MOTD, world feature flags,
the lounge distribution dials); and the further `AppApi` operations
(`shutdown()` etc.). All land with their own builds; v1 is the two
start-location knobs and the read/write/verb surface.
