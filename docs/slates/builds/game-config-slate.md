# Game config slate (working doc)

> **Status: design sketch.** A single, game-managed home for app-wide
> configuration — a singleton `GameConfig` `Document` in Mongo, seeded with
> defaults at first boot, edited in-game via a `config` verb. It **retires
> `config/constants.ts`** by splitting its one conflated constant
> (`DEFAULT_STARTING_LOCATION_PATH`, which today serves *both* the spawn
> default and the evacuation fallback through two different, undocumented
> mechanisms) into two clearly-named settings. Infra-only constants are not
> its remit — those belong in `.env` / Parameter Store. Modeled directly on
> the shipped `WorldClockState` Document.

Working slate for **app-wide game configuration** — the values that are
*game-managed* (an operator can change them in-game and they persist) but are
*not* per-player, per-Stuff, or secrets. Today there is exactly one such value
and it lives in a code file (`config/constants.ts`) where it can't be changed
without a deploy, conflates two concerns, and carries a comment that
contradicts the code. This slate gives that class of value a real home.

The load-bearing decisions:

1. **App config is a singleton `Document`, not a code file.** A `GameConfig`
   `Document` (plain Mongo JSON, no Stuff overhead — the persistence-rethink
   track) in its own collection, exactly the shape of the shipped
   [`WorldClockState`](../../../packages/server/src/mud/lib/time/WorldClockState.ts):
   one row, `loadOrSeed()`, Mongo-assigned `_id`. It is **meta/config**, which
   is the `Document` track's explicit remit.

2. **Split the conflated constant into two named settings.**
   `DEFAULT_STARTING_LOCATION_PATH` is read in exactly one place — the
   evacuation path (`Container.cleanupOnDestruct`, `lib/spatial/Container.ts:150`)
   — *and* is hand-mirrored into the seed avatar's spawn field by a "keep in
   sync" comment. So one constant silently does two jobs, and its own comment
   even names the wrong evac target (`/domain/void`). Replace it with
   **`defaultStartLocation`** (the post-char-gen, no-saved-location spawn — and
   *only* that) and **`evacuationFallback`** (orphaned-occupant destination when
   a container destructs or a room fails to load).

3. **Cached read surface; sync consumers must not await.** The evac path runs
   inside `cleanupOnDestruct` and reads synchronously. So `GameConfig` is
   **loaded once at boot and cached in memory**; reads are sync from cache; an
   edit saves the row *and* refreshes the cache. (The `WorldClockApi`
   cached-snapshot pattern.) The access surface stays minimal — a cached
   accessor, not a sprawling Api.

4. **A developer-gated `config` verb edits it in-game.** View / get / set,
   `AccessApi`-gated (developer/admin), changes persist + refresh the cache and
   are auditable. No deploy needed to move the start location.

5. **`config/constants.ts` is deleted.** Its one value migrates into the
   `Document`. Going forward there is **no central constants file**:
   game-managed values → `GameConfig`; **infra-only** values (Mongo URI, OAuth,
   ports) → `.env` / Parameter Store (already there); truly module-internal
   constants → colocated in their owning module, never a central dumping file.

6. **This is a *fourth* config category.** Distinct from per-player `settings`
   (`EnvironmentMixin`), per-Stuff `Propertied`, and server-persisted
   client-UI-state. App-wide game config is its own thing —
   see [[feedback_settings_vs_propertied_vs_client_state]].

See also:

- [`WorldClockState`](../../../packages/server/src/mud/lib/time/WorldClockState.ts)
  / [docs/subsystems/time.md](../../subsystems/time.md) — **the precedent**: a
  singleton app-wide state `Document` in Mongo (`world_state`), seeded at boot,
  cached behind `WorldClockApi`. `GameConfig` is the same shape for config.
- [docs/slates/persistence-architecture-slate.md](../tails/persistence-architecture-slate.md)
  — the `Document` base (plain JSON, no Stuff) this rides.
- [docs/subsystems/shell-environment.md](../../subsystems/shell-environment.md) —
  per-player `settings` (the *contrast*: `GameConfig` is app-wide, not
  per-character).
- [docs/subsystems/access.md](../../subsystems/access.md) — the `config` verb's
  gate (`AccessApi.isDeveloper` / `isAuthor`).
- [docs/deployment.md](../../deployment.md) — where *infra* config lives
  (SSM Parameter Store / `.env`); `GameConfig` is the in-game half, Parameter
  Store the out-of-game half.
- The **lounge build** (multilocation-lounge requirements/plan) — its
  `defaultStartLocation` eventually lives here; until this lands, the lounge
  uses the seed avatar's `startLocation` field as the interim mechanism.

---

## Principle

1. **One home for game-managed app config** — a Mongo `Document`, not a code
   constant, not scattered.
2. **Name the concern.** One value per concern; no constant silently serving
   two masters.
3. **Editable in-game, persisted, audited** — change config without a deploy.
4. **Game config ≠ infra config.** Game-managed → the `Document`; secrets /
   deployment knobs → `.env` / Parameter Store.
5. **Cached for sync reads** — loaded at boot, refreshed on edit.

---

## The model

### `GameConfig` — the singleton Document

```ts
export class GameConfig extends Document {
  static collectionName = 'game_config';
  static persistentFields = ['defaultStartLocation', 'evacuationFallback'];

  defaultStartLocation = '/domain/eternal/duncan-hall/lobby'; // seed default
  evacuationFallback   = '/domain/void';                       // seed default

  static async loadOrSeed(): Promise<GameConfig> { /* find({})[0] ?? new + save */ }
}
```

One row in `game_config`, found via `find({})` (Mongo assigns `_id`), seeded
with code-defined defaults on first boot — exactly the `WorldClockState`
shape. The defaults are the *initial* values, not a runtime fallback; once
seeded, the row is the source of truth and the verb edits it.

### The two v1 settings (the whole reason this exists now)

| Setting | Meaning | Today | After |
|---|---|---|---|
| **`defaultStartLocation`** | Where a brand-new avatar with no saved start location spawns — basically only first login after char-gen. **Nothing else.** | Hand-mirrored into `seeds/obj/Avatar/seed.yaml` per a "keep in sync" comment | Read at avatar creation (char-gen) / first spawn; evolves with the new-player flow (lounge → onboarding → dorm) by an in-game edit, no deploy |
| **`evacuationFallback`** | Where an orphaned `HasInteractive` goes when its container destructs or a room fails to load. A *separate* concern. | `Container.cleanupOnDestruct` reads `DEFAULT_STARTING_LOCATION_PATH` (the lobby) — while the comment claims `/domain/void`. Drift to untangle. | A deliberate, named setting (default `/domain/void` — the container-of-last-resort, per `VoidLocation`'s intent) |

### Access surface (cached)

Loaded at boot into a cached singleton; **sync reads from cache** (the evac
path can't await). An edit writes the row and refreshes the cache. The surface
is deliberately thin — a cached accessor (`GameConfig.current()` /
`GameConfig.get('defaultStartLocation')`), not a broad Api. Whether a tiny
`GameConfigApi` is warranted or static accessors on the `Document` suffice is a
requirements call; default to the minimal shape (`WorldClockApi` is the
heavier precedent only because the clock has real behavior — config is just
read/write).

### The `config` verb

A single-token verb, `AccessApi`-gated (developer/admin):

```
config                          → list all settings + current values
config defaultStartLocation     → show one
config defaultStartLocation /domain/lounge/warren   → set + persist + refresh cache
```

Set validates the key against the known field set, persists the row, refreshes
the cache, and is auditable. No new-key invention from the verb in v1 — the
field set is the `persistentFields` list (adding a setting is a code edit, as
with any `Document` field).

### Retiring `config/constants.ts`

- `Container.cleanupOnDestruct` (`Container.ts:150`) → reads
  `GameConfig.current().evacuationFallback` (cached).
- The seed-avatar spawn mirror → `defaultStartLocation` is read at avatar
  creation / first-spawn (the char-gen integration point).
- Delete `config/constants.ts` (it holds nothing else). Untangle the
  comment-vs-code drift in the same pass — `evacuationFallback` is the
  *deliberate* evac target.

---

## The boundary — what is and isn't `GameConfig`

| Goes in `GameConfig` (Mongo, in-game verb) | Does **not** |
|---|---|
| App-wide, game-managed, operator-editable knobs: `defaultStartLocation`, `evacuationFallback`; future: MOTD, world-level feature flags, global toggles | **Per-player** settings → `EnvironmentMixin` / `settings` |
| | **Per-Stuff** state → `Propertied` |
| | **Client-UI-state** persisted server-side → its own (TBD) substrate |
| | **Secrets / deployment** (Mongo URI, OAuth, ports) → `.env` / Parameter Store |
| | **Module-internal** code constants → colocated in their module, not a central file |

The test for "does this belong in `GameConfig`": *is it app-wide, game-managed,
and would an operator reasonably change it in a running game without a deploy?*
If it's infra/secret → Parameter Store. If it's a code implementation detail →
inline in its module. If it's per-player/per-Stuff → those substrates.

---

## Worked scenario — moving the start location as onboarding evolves

The new-player flow lands the lounge, then later the campus arrival sequence.
Each shift is an **in-game edit**, no deploy:

```
> config defaultStartLocation /domain/lounge/warren
defaultStartLocation: /domain/eternal/duncan-hall/lobby → /domain/lounge/warren
(persisted; new avatars now spawn into the lounge)
```

Today that same change is a code edit to a constant + a hand-sync of the seed
YAML + a redeploy. After this slate it's one audited verb call.

---

## Open questions

1. **Access surface** — a tiny `GameConfigApi` vs. static cached accessors on
   the `Document`. *Lean: minimal — static `current()` + a cached load at boot;
   promote to an Api only if a cross-cutting need appears.* ([[feedback_no_new_apis_default]])
2. **Seeding mechanism** — a `BootstrapManager` step (like the clock) that
   `loadOrSeed`s and warms the cache, vs. lazy load-on-first-read. *Lean:
   bootstrap step, so the cache is warm before any sync consumer (evac) runs.*
3. **`evacuationFallback` default** — `/domain/void` (the container-of-last-
   resort, matching `VoidLocation`'s stated intent) vs. the lobby (what the
   code does today). *Lean: the void — it's the honest "nowhere safe left"
   target; the lobby was an accident of the conflated constant.*
4. **char-gen integration** — `defaultStartLocation` is read at avatar
   creation; that's char-gen's commit path. **Sequence after char-gen merges**
   to avoid touching its branch; until then the lounge uses the seed
   `startLocation` field directly. (This slate does not block the lounge.)
5. **Scope of v1 migration** — at least the start-location pair. The **lounge
   distribution knobs** (`budThreshold`/`mergeWatermark`/`reapGraceMs`, incl. the
   flatten-to-one-room `N=∞/M=0` config) are a **known early follow-on** — they
   genuinely want live tuning (the elastic-lounge UX is unproven, so we'll adjust
   from observed behavior without deploys). The lounge ships them as code constants
   first; GameConfig becomes their home when it lands. Migrate other constants only
   when they actually want runtime tuning, not preemptively.
   ([[feedback_no_premature_registries]])
6. **The `config` verb's gate** — `isDeveloper` (TS-escape tier) vs. `isAuthor`
   (content tier). *Lean: `isDeveloper` — app config is operator-level, above
   content authoring.*

---

## Build order

**Wave 1 — the doc + the verb + retire the constant.** `GameConfig` `Document`
(+ `game_config` collection) with the two settings; the bootstrap `loadOrSeed`
+ cache warm; the cached accessor; the `config` verb (developer-gated, list /
get / set, persist + refresh); migrate `Container.cleanupOnDestruct` →
`evacuationFallback`; wire `defaultStartLocation` into the avatar-spawn path;
**delete `config/constants.ts`**. **Sequence after char-gen merges** (it
touches the spawn path).

**Wave 2+ — more app-wide knobs as they arise.** MOTD, world-level feature
flags, global toggles — each a new `persistentFields` entry + a verb-visible
setting. No new substrate; just rows in the same doc.

---

## What this slate does NOT cover

- **Per-player settings** (`EnvironmentMixin` / `settings`), **`Propertied`**
  state, **client-UI-state** — different substrates.
- **Secrets / deployment / infra config** — `.env` / SSM Parameter Store
  ([deployment.md](../../deployment.md)).
- **The lounge build** — separate; it uses the seed `startLocation` field as
  the interim spawn mechanism. This slate is the eventual home for that
  default, not a dependency of the lounge.
- **A general typed-config schema / migration framework** — v1 is a flat doc of
  named fields, same as `WorldClockState`. Schema evolution = adding a
  `persistentFields` entry with a default.

---

## Once shaped into requirements

- The `GameConfig` `Document` (`game_config` collection; `loadOrSeed`; seeded
  defaults) with `defaultStartLocation` + `evacuationFallback`.
- The cached accessor + boot-time warm.
- The developer-gated `config` verb (list / get / set; persist + refresh;
  audit).
- Migration: `Container.cleanupOnDestruct` → `evacuationFallback`; the
  avatar-spawn path → `defaultStartLocation`; **delete `config/constants.ts`**;
  untangle the void-vs-lobby evac drift.
- Tests: a fresh DB seeds the row with defaults; `config <key> <value>` persists
  + refreshes the cache + an orphaned occupant evacuates to the *new*
  `evacuationFallback`; a non-developer can't edit; no reference to
  `config/constants.ts` remains.
