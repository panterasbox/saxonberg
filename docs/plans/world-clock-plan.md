# World clock — implementation plan

Build plan for the world-time substrate on branch `world-clock` (off `master`). Graduates `docs/slates/world-clock-slate.md`; executes `docs/requirements/world-clock-requirements.md` (decisions D1–D8, 4-wave scope, module-placement table, the 10 acceptance criteria). **The requirements doc is the contract — read it in full before starting. Where it specifies a value or signature, that value wins over the slate** (unit is `'s'` not `'seconds'`; celestial year is 360 not 365.25; light integration is deferred).

All paths below are relative to `packages/server/src/mud/` unless prefixed with `packages/server/src/` (for `backend/`, `services/`) or repo-root `docs/`.

---

## 0. Overview and the conflict-free constraint

### 0.1 What ships

A three-layer time substrate plus a pedagogical verb/instrument surface:

- **Wave 1 — Time axis.** `WorldClockApi` (game-time queries, scale, pause/resume, snapshot/restore, transient scheduling primitives `after`/`at`/`every` + cancel family), `WorldClockState extends Document` for persistence, startup-restore / shutdown-snapshot / periodic-backstop wiring, and the Activity-scheduler refactor onto game-time (D5).
- **Wave 2 — Celestial.** `CelestialProfile` shape + `EARTH_LIKE` default, `CelestialApi` (sun position / day-night / season / moon, astronomical scheduling shortcuts), geography **constants** (lat/long; not settings — §2.5/R8), zone-inheritance profile resolution. **No ambient-light wiring (D6).**
- **Wave 3 — Calendar.** `Calendar` interface + `DefaultCalendar` (12×30 / 360-day / 7-day-week / 24h), calendar-aware scheduling `onDate`/`cron`.
- **Wave 4 — Pedagogical surface.** `Sundial`/`Sextant` instruments, `analyze time`, `analyze sky here`, `measure shadow`, `measure altitude <sun|moon>`.

### 0.2 Hard constraint — conflict-free with the `perception` branch (restate in the build)

A sibling build on `perception` churns these files. **This build must not edit any of them:**

```
lib/perception/*
lib/description/*
lib/message/*
lib/biome/SkyExposed.ts
config/quantity-tags.yaml
comms/emote command verbs (the perception branch's new comms verbs)
```

**Allowed shared-file touches are APPEND-ONLY and trivially mergeable:**

- `bootstrap.ts` — append a manifest entry (only if a bootstrapped Stuff is needed; see §1.6 — likely none).
- `cmd/analyze.yaml` — append two subcommands (`time`, `sky`).
- `cmd/measure.yaml` — append two subcommands (`shadow`, `altitude` for sun/moon — **see the naming collision in §4.4 / Risk R5**).

Confirmed-clear shared files this build may edit freely: `api/scheduler.ts`, `services/Server.ts` (`packages/server/src/services/Server.ts`), `lib/zone/*`. Everything else is **net-new**.

`lib/quantity.ts` is **not** on the contested list (only `config/quantity-tags.yaml` is). Adding the `'degrees'` unit there is allowed (§2.1).

**Topic strings** like `world.perception.measurement.measure-shadow` are free-form string literals passed to `MessageApi.scene(...).topic(...)` (verified: no topic registry validation; topics are free-form, see `api/message.ts:93` `topic(path: string)`). Using or coining such strings does **not** edit any `lib/perception/*` file and is allowed.

### 0.3 New subsystem directory

`lib/time/` is a **new subsystem dir** (per the lib-is-organized-by-subsystem rule). Domain types and the `Document` live here, **each colocated with its implementation file — no `types.ts` barrel** (the codebase doesn't bucket types; see §1.2). The two Apis live in `api/` per the api-isolation rule and **declare + export their own public handle/option types in-file** (precedent: `ScheduleApi`/`ScheduleHandle` in `api/schedule.ts`), so consumers import them straight from the Api (per CLAUDE.md "go through the Api layer").

### 0.4 Full file manifest (mapped to the requirements module-placement table)

| Wave | Path | New/Modify | Exports / change |
|---|---|---|---|
| 1 | `lib/quantity.ts` | **Modify** (append) | add `'degrees'` to `Unit` union (~line 60) + `degrees: ARITHMETIC_OPS` to `unitOps` (~line 126) |
| 1 | `lib/time/WorldClockState.ts` | New | `class WorldClockState extends Document` |
| 1 | `api/worldclock.ts` | New | `class WorldClockApi` **+ its public surface types declared in-file** (`ClockCallback`, `ScheduleOpts`, `ClockHandle`, `WorldClockSnapshot`, `CronPattern`) — same as `ScheduleApi` declaring `ScheduleHandle` in `api/schedule.ts`. No separate `types.ts`. |
| 1 | `api/scheduler.ts` | **Modify** (clear) | game-time refactor (D5) |
| 1 | `packages/server/src/backend/AppBootstrap.ts` | **Modify** (clear) | startup restore step |
| 1 | `packages/server/src/services/Server.ts` | **Modify** (clear) | shutdown snapshot step |
| 1 | `lib/time/__tests__/WorldClockApi.test.ts` | New | |
| 1 | `lib/time/__tests__/WorldClockApi.scheduling.test.ts` | New | |
| 1 | `lib/time/__tests__/WorldClockState.persistence.test.ts` | New | |
| 1 | `lib/activity/__tests__/*` | **Modify** (clear) | game-time seam |
| 2 | `lib/time/CelestialProfile.ts` | New | `CelestialProfile`, `SunDef`, `MoonDef`, `Season`, `EARTH_LIKE` |
| 2 | `lib/time/solar.ts` | New | pure solar math helpers (declination/altitude/azimuth/season) |
| 2 | `api/celestial.ts` | New | `class CelestialApi` |
| 2 | `lib/zone/Zone.ts` *or* `lib/zone/SpatialZone.ts` | **Modify** (clear, additive only) | declare `celestialProfile` field surface **only if needed** (§2.4) |
| 2 | (geography/scale = module constants in `CelestialApi`/`WorldClockApi`, §2.5) | — | **NOT settings** — no settings-host edit; `Avatar.ts` untouched |
| 2 | `lib/time/__tests__/CelestialApi.test.ts` | New | |
| 2 | `lib/time/__tests__/solar.test.ts` | New | |
| 3 | `lib/time/Calendar.ts` | New | `Calendar`, `CalendarDate` |
| 3 | `lib/time/DefaultCalendar.ts` | New | `class DefaultCalendar implements Calendar` + month/weekday rosters |
| 3 | `api/worldclock.ts` | **Modify** | add `onDate`/`cron` |
| 3 | `lib/time/__tests__/DefaultCalendar.test.ts` | New | |
| 3 | `lib/time/__tests__/WorldClockApi.calendar.test.ts` | New | |
| 4 | `obj/instrument/Sundial.ts` | New | `class Sundial extends Thing` |
| 4 | `obj/instrument/Sextant.ts` | New | |
| 4 | `cmd/measure.yaml` | **Modify** (append) | `shadow`, `altitude` subcommands |
| 4 | `cmd/analyze.yaml` | **Modify** (append) | `time`, `sky` subcommands |
| 4 | `obj/command/AnalyzeTimeController.ts` | New | |
| 4 | `obj/command/AnalyzeSkyController.ts` | New | |
| 4 | `obj/command/MeasureShadowController.ts` | New | |
| 4 | `obj/command/__tests__/*` | New | controller tests |

---

## Wave 1 — Time axis (`feat(time): world clock axis + scheduler primitives + persistence + activity refactor`)

### 1.1 `lib/quantity.ts` — add `'degrees'` (also serves Wave 2)

`'degrees'` is not in the `Unit` union today (verified). Recommendation: **add it now in Wave 1** so both the celestial API and any angular `Quantity` work without a second edit, and so the union churn happens once.

- In `Unit` (the union ends ~line 60 with `'m/s²'`): add a new line `// Angle | 'degrees'`.
- In `unitOps` (~line 126): add `degrees: ARITHMETIC_OPS,`.

No tag table, no marshaller needed for v1 (celestial values are computed live, never persisted). `Quantity.of(value, 'degrees')` then works, with `.rawValue()`, `.add`, `.subtract`, `.scale`, `.lessThan`, `.greaterThan`, `.toJSON` (verified at `lib/quantity.ts:650/702/707/714/725/738/796`).

### 1.2 `WorldClockApi`'s public surface types — declared in `api/worldclock.ts`

**Do not create a `lib/time/types.ts` barrel.** This codebase colocates types with their owning module; the Api owns its own handle/options/callback types (precedent: `ScheduleApi` declares `ScheduleHandle` in `api/schedule.ts:53`, not a side file). Declare these at the top of `api/worldclock.ts` and `export` them from there — consumers (`CelestialApi`, the activity refactor, `AppBootstrap`, `Server`) import them straight from `api/worldclock`. None of them are needed by any `lib/time/` domain file, so there's no lib→api import pressure pulling them downward.

The domain types that genuinely belong in `lib/time/` stay colocated with their implementation (NOT in a barrel): `CelestialProfile`/`SunDef`/`MoonDef`/`Season`/`EARTH_LIKE` in `lib/time/CelestialProfile.ts` (§2.1), `Calendar`/`CalendarDate` in `lib/time/Calendar.ts` (§3.1).

```ts
// at the top of api/worldclock.ts
import type { Quantity } from '../lib/quantity';
import type { Stuff } from '../lib/stuff/Stuff';

export type ClockCallback = (handle: ClockHandle) => void;

export interface ScheduleOpts { host?: Stuff; tag?: string; }

export interface ClockHandle {
  readonly id: string;
  readonly nextFireAt: Quantity<'s'> | null; // null if cancelled/expired
  readonly fireCount: number;
  cancel(): void;
}

export interface WorldClockSnapshot {
  elapsedGameTimeS: number;
  scale: number;
  lastShutdownRealMs: number;
}

// Wave 3 (declared now, consumed then):
export interface CronPattern {
  weekday?: number | string;
  monthday?: number;
  month?: number | string;
  hour?: number;
  minute?: number;
}
```

### 1.3 `api/worldclock.ts` — `WorldClockApi`

Static Api, module-private state, `SecurityApi.decorateApiClass(WorldClockApi)` at end (precedent: `ScheduleApi` `api/schedule.ts:205`, `SchedulerApi` `api/scheduler.ts:877`). Static `#`-private slots permitted on Apis (CLAUDE.md). Drives its single heartbeat through `ScheduleApi` (so attribution/`runRoot` plumbing is reused — `ScheduleApi.recurring` already wraps `ExecutionContextApi.runRoot`, `api/schedule.ts:69–83`).

#### 1.3.1 Internal time-anchor state and anchor math

```ts
static #anchorGameTimeS = 0;        // game-seconds at the last (re)anchor
static #anchorRealMs = WorldClockApi.#nowMs();  // real ms at the last (re)anchor
static #scale = 12;                 // default constant per D2/§2.5; overwritten by restore()
static #paused = false;
```

> **Real-clock reads:** every `Date.now()` shown in the snippets below is illustrative — the implementation must call **`WorldClockApi.#nowMs()`** (the injectable test clock, §1.3.7) at every real-clock read, or the deterministic test seam won't control time. Do not hard-code `Date.now()` in `getNow`/`#reanchor`/`resume`/`snapshot`/the heartbeat.

`getNow()` while running:
```
now_s = anchorGameTimeS + ((Date.now() - anchorRealMs) / 1000) * scale
```
Return `Quantity.of(now_s, 's')`.

While paused: `getNow()` returns `Quantity.of(anchorGameTimeS, 's')` (frozen).

**Re-anchor helper** `#reanchor()`: capture `cur = currentGameSeconds()` (compute the formula above, or return frozen value if paused), then set `anchorGameTimeS = cur; anchorRealMs = Date.now()`. Call `#reanchor()` at the **start** of `setScale`, `pause`, and `resume` so no time discontinuity occurs (AC1, AC2):

- `setScale(scale)`: `#reanchor(); #scale = scale; #rearmHeartbeat();` (admin only — gate however other admin Api methods gate; see Risk R3).
- `pause()`: if already paused return; `#reanchor(); #paused = true; #disarmHeartbeat();`
- `resume()`: if not paused return; `#anchorRealMs = Date.now(); #paused = false; #rearmHeartbeat();` (do **not** advance anchorGameTimeS — frozen value resumes exactly; AC2).
- `isPaused()`, `getScale()`: trivial getters.

#### 1.3.2 The single-heartbeat game-time scheduler

State:
```ts
interface Schedule {
  id: string;
  nextFireAtS: number | null;        // null = cancelled/expired
  intervalS: number | null;          // null = one-shot
  remainingRuns: number | null;      // null = unbounded; for every({runs})
  fireCount: number;
  cb: ClockCallback;
  host: Stuff | null;
  tag: string | null;
  hostSub: Subscription<unknown> | null;
  handle: ClockHandle;
}
static #schedules: Map<string, Schedule> = new Map();
static #heartbeat: ScheduleHandle | null = null;  // ScheduleApi handle
```

**Design choice: arm-next-deadline, not fixed tick.** Justification: pause/scale must re-arm cleanly and game-time is sparse (a schedule days out should not wake the process every 100 ms for game-days). On each (re)arm, compute the **earliest** `nextFireAtS` across all live schedules, convert the game-time delay to a **real-ms** delay, and arm a single `ScheduleApi.schedule(realMs, …, {propagateAttribution:false})` one-shot:

```
gameDeltaS = earliestNextFireAtS - currentGameSeconds()
realMs     = max(0, (gameDeltaS / scale) * 1000)
```

On heartbeat fire (`#onHeartbeat`):
1. `const now = currentGameSeconds();`
2. Collect every schedule with `nextFireAtS !== null && nextFireAtS <= now`, sorted ascending by `nextFireAtS` (deterministic order).
3. For each due schedule: `s.fireCount++;` invoke `s.cb(s.handle)` inside try/catch (a throw is logged, does not kill the heartbeat — mirror `SchedulerApi`'s watchdog discipline). Then:
   - one-shot (`intervalS === null`): mark `nextFireAtS = null`, clear host sub, delete from map.
   - recurring: if `remainingRuns !== null` decrement; if it hits 0, expire (as one-shot). Else advance `nextFireAtS += intervalS` (fixed-rate in game-time; if it's still `<= now` after one step because the heartbeat was late, **catch up by looping** so cadence stays correct).
4. `#rearmHeartbeat()` — recompute earliest and re-arm (or disarm if none / paused).

**Paused ⇒ no heartbeat armed** (`#disarmHeartbeat()` cancels the `ScheduleApi` handle and nulls it). On `resume`/`setScale`, `#rearmHeartbeat()` recomputes the real-ms delay against the (new) scale, so a higher scale fires sooner and pause indefinitely defers (AC2, AC6).

`#rearmHeartbeat()`: cancel existing `#heartbeat` if any; if paused or no live schedule, return; else arm a fresh `ScheduleApi.schedule(realMs, () => ExecutionContextApi.runRoot(WorldClockApi,'heartbeat',#onHeartbeat), {propagateAttribution:false})`. (Re-arming each fire keeps "arm-next-deadline" exact; we never rely on `setInterval` cadence for game-time correctness.)

#### 1.3.3 String-duration parsing

`#parseDelayToSeconds(d: Quantity<'s'> | string): number`:
- If `Quantity`, return `d.rawValue()`.
- If string, parse calendar-free game-time conventions: regex `^\s*(\d+(?:\.\d+)?)\s*(second|minute|hour|day)s?\s*$` → `second=1, minute=60, hour=3600, day=86400`. Throw on no match. (Per requirements: minute=60 s, hour=3600 s, day=86 400 s — calendar-free; `onDate`/calendar units are Wave 3.)

#### 1.3.4 Public scheduling surface

```ts
static after(delay, cb, opts?): ClockHandle  // nextFireAtS = now + parse(delay); one-shot
static at(deadline: Quantity<'s'>, cb, opts?): ClockHandle  // nextFireAtS = deadline.rawValue(); one-shot; if <= now, fire on next heartbeat tick (still arm at realMs=0 → fires deferred-not-skipped, AC4)
static every(interval, cb, opts?: ScheduleOpts & { startAt?: Quantity<'s'>; runs?: number }): ClockHandle
    // nextFireAtS = startAt?.rawValue() ?? now + parse(interval); intervalS = parse(interval); remainingRuns = runs ?? null
static cancel(handle): void                  // delegate to handle.cancel()
static cancelByTag(tag, host?): number       // count cancelled; if host given, AND on host identity
static cancelByHost(host): number
```

Each create builds a `Schedule`, registers host-destruct subscription if `opts.host` (§1.3.5), inserts into `#schedules`, calls `#rearmHeartbeat()`, returns the `ClockHandle`.

**`ClockHandle` implementation** (live view onto the `Schedule`):
```ts
const handle: ClockHandle = {
  id,
  get nextFireAt() { return s.nextFireAtS === null ? null : Quantity.of(s.nextFireAtS, 's'); },
  get fireCount() { return s.fireCount; },
  cancel() { WorldClockApi.#cancelInternal(s); },
};
s.handle = handle;
```
`#cancelInternal(s)`: if already removed, no-op (idempotent); set `nextFireAtS = null`; unsubscribe host sub; delete from map; `#rearmHeartbeat()`.

#### 1.3.5 Host-scoped auto-cancel (reuse the `SchedulerApi` pattern)

When `opts.host` present, subscribe exactly as `SchedulerApi.#register` does (`api/scheduler.ts:504–522`): `EventApi.on<{ stuffId: string }>(Events.StuffDestructed, payload => { if (payload.stuffId !== host.stuffId) return; runRoot then #cancelInternal(s); })`. Store the `Subscription` on `s.hostSub`; unsubscribe in `#cancelInternal`. Cite this in the subsystem doc as "same hook `SchedulerApi` uses."

#### 1.3.6 Snapshot / restore (own-thing model, D1)

```ts
static snapshot(): WorldClockSnapshot {
  return { elapsedGameTimeS: currentGameSeconds(), scale: #scale, lastShutdownRealMs: Date.now() };
}
static restore(snap: WorldClockSnapshot): void {
  #anchorGameTimeS = snap.elapsedGameTimeS;
  #anchorRealMs = Date.now();
  #scale = snap.scale;
  #paused = false;
  // schedules are never persisted; start empty
}
```

`snapshot()` reads `currentGameSeconds()` (the frozen value if paused) — that is the elapsed game-time to persist (AC3).

#### 1.3.7 Test seam (acceptance tests depend on it)

Tests must advance game-time deterministically without real waits. Provide an injectable real-clock + manual advance, gated by `SecurityApi.assertTestOnly` (precedent: `SchedulerApi._clearAllForTesting`, `api/scheduler.ts:845–846`):

```ts
static #nowMs: () => number = Date.now;            // injectable real clock

static _setNowProviderForTesting(fn: () => number): void {
  SecurityApi.assertTestOnly('_setNowProviderForTesting');
  WorldClockApi.#nowMs = fn;
}
static _resetForTesting(): void {
  SecurityApi.assertTestOnly('_resetForTesting');
  // clear schedules + heartbeat, reset anchors/scale/paused, restore #nowMs = Date.now
}
/** Advance the (test) real clock by realMs and synchronously run every schedule
 *  now due — bypasses ScheduleApi's setTimeout so no wall-clock wait. */
static _advanceForTesting(realMs: number): void {
  SecurityApi.assertTestOnly('_advanceForTesting');
  // bump the injected clock, then call #onHeartbeat() in a loop until no schedule is due
}
```

Internally, **all real-clock reads (`Date.now()`) must go through `#nowMs()`** so `_setNowProviderForTesting` controls them. **Test-mode arm suppression:** when a test clock is installed (`#nowMs !== Date.now`), `#rearmHeartbeat()` must **skip arming the live `ScheduleApi.schedule` timer** — otherwise a real `setTimeout` can fire `#onHeartbeat` out from under `_advanceForTesting` and double-fire schedules. In test mode `_advanceForTesting` is the *only* driver of `#onHeartbeat`; in production the real arm is the only driver. (Track this with a `#testMode` flag set by `_setNowProviderForTesting`/`_resetForTesting`.) This single seam serves both the world-clock tests and the activity tests (§1.7).

### 1.4 `lib/time/WorldClockState.ts` — persistence

```ts
import { Document } from '../persistence/Document';

export class WorldClockState extends Document {
  static collectionName = 'world_state';
  static persistentFields = ['elapsedGameTimeS', 'scale', 'lastShutdownRealMs'];
  static readonly FIXED_ID = 'world-clock';

  elapsedGameTimeS = 0;
  scale = 12;            // default per D2
  lastShutdownRealMs = 0;
}
```

Pattern matches `lib/identity/User.ts` exactly (plain fields + `persistentFields`). All three fields are plain numbers — **no marshaller** (so no `setDocumentMarshallerResolver` dependency for this Document). Persisted via the `Document` base (`save()` → `PersistenceManager`, `findById` — `lib/persistence/Document.ts:242/288`).

**Fixed id load-or-seed helper** (place on `WorldClockState` as a static, or inline in `AppBootstrap`):
```ts
static async loadOrSeed(): Promise<WorldClockState> {
  const existing = await WorldClockState.findById(WorldClockState.FIXED_ID);
  if (existing) return existing;
  const fresh = new WorldClockState();
  fresh._id = WorldClockState.FIXED_ID;   // pin the id so subsequent saves upsert this row
  fresh.scale = 12;                        // the default scale constant (§2.5)
  return fresh;                            // not yet saved; first save() at shutdown writes it
}
```
Confirm `PersistenceManager.save` upserts on a caller-supplied `_id` (it reads `doc._id` from `toDocument`, `lib/persistence/Document.ts:169`). If it cannot accept a string `_id`, fall back to `find({})` on the collection and treat first row as the singleton (Risk R2).

### 1.5 Lifecycle wiring

**Startup restore — `packages/server/src/backend/AppBootstrap.ts`**, append a step at the end of `run()` **after `await BootstrapManager.run();`** (`AppBootstrap.ts:112`):
```ts
const clockState = await WorldClockState.loadOrSeed();
WorldClockApi.restore({
  elapsedGameTimeS: clockState.elapsedGameTimeS,
  scale: clockState.scale,                 // defaults to the constant 12 on a fresh seed (§2.5)
  lastShutdownRealMs: clockState.lastShutdownRealMs,
});
```
Fresh DB ⇒ `loadOrSeed` returns a zero clock (scale `12`) ⇒ restore anchors at 0 (AC3). This step is append-only and trivially mergeable. (No `resolveSetting` here — there is no settings host at bootstrap; scale's default is the constant per §2.5/R8.)

**Shutdown snapshot — `packages/server/src/services/Server.ts` `stop()`** (currently has **no** persistence hook — `services/Server.ts:170–193`). Inside the `try`, before/after closing connections, add:
```ts
try {
  const snap = WorldClockApi.snapshot();
  const state = await WorldClockState.loadOrSeed();
  state.elapsedGameTimeS = snap.elapsedGameTimeS;
  state.scale = snap.scale;
  state.lastShutdownRealMs = snap.lastShutdownRealMs;
  await state.save();
} catch (err) {
  console.error('Server: world-clock snapshot on shutdown failed:', err);
}
```
`SIGTERM`/`SIGINT` handlers already `await this.stop()` before `process.exit(0)` (`services/Server.ts:200–211`), so the snapshot runs on graceful exit. `uncaughtException`/`unhandledRejection` go straight to `process.exit(1)` with no `stop()` — the backstop (§1.6) covers that.

**Crash backstop — periodic snapshot.** Reuse the autosave timer mechanism (`obj/Avatar.ts:372–390`): `ScheduleApi.recurring(intervalMs, fn, { propagateAttribution: false, mode: 'fixed-delay' })`. The interval is a **module constant** `WorldClockApi.SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000` (not a setting — no resolvable host at boot, per §2.5/R8). Start it once at boot via `WorldClockApi.startSnapshotBackstop()` called from the `AppBootstrap` restore step. Each fire: `void (async () => { const s = await WorldClockState.loadOrSeed(); …; await s.save(); })().catch(log)` — fire-and-forget like Avatar autosave. Ungraceful exit loses at most one interval.

### 1.6 Bootstrap manifest

No new bootstrapped Stuff is required for Wave 1 — `WorldClockState` is a `Document`, the Apis are static, and the instruments (Wave 4) are cloned on demand. **Do not append to `bootstrap.ts` unless Wave 3's system-scope schedules (festival/market reset) need a universe-init Stuff** — and even then prefer registering those schedules from the `AppBootstrap` restore step rather than a manifest entry (keeps `bootstrap.ts` untouched). Decide in Wave 3 (§3.4). Default: `bootstrap.ts` stays unedited.

### 1.7 Activity refactor (D5) — `api/scheduler.ts` + `lib/activity/__tests__/*`

Move `SchedulerApi` from `Date.now()` + Node timers onto `WorldClockApi` game-time. **Unit reconciliation:** the existing `DurativeActivity.duration` / `ScheduledEmission.intervalMs` / `Engagement.startedAt` fields are **milliseconds** (`api/scheduler.ts:84,114,130` + `DURATION_FLOOR_MS = 100` at line 188). To minimize churn and keep the existing field names/semantics, **keep these fields as game-time milliseconds** and convert at the `WorldClockApi` boundary (which works in seconds). I.e. "game-ms" for durations, "game-seconds" for the clock — one conversion factor (`/1000`) at each call site. This preserves the 100 ms floor semantics (now 100 game-ms) without renaming the public `duration` field (AC6).

Concrete changes:

1. **`startedAt`** — stamp from game-time. The framework stamps it at registration today via the activity's own constructor (`startedAt: Date.now()`). Change the **emission elapsed** computation (`api/scheduler.ts:751`) from `Date.now() - e.startedAt` to:
   ```ts
   const elapsedMs = WorldClockApi.getNow().rawValue() * 1000 - e.startedAt;
   ```
   and require activities to stamp `startedAt = WorldClockApi.getNow().rawValue() * 1000` (game-ms). Update the test fixtures accordingly (§ below).

2. **Completion timer** (`#register`, `api/scheduler.ts:544–554`): replace the `setTimeout(…, e.duration)` with:
   ```ts
   const h = WorldClockApi.after(
     Quantity.of(e.duration / 1000, 's'),
     () => { const live = …; if (live && isDurativeActivity(live)) #completeFromTimer(live); },
     /* no host opt here — destruction handled by existing #hostSubscriptions */
   );
   ```
   Store the `ClockHandle` in `#completionTimers` (change the map's value type from `setTimeout` handle to `ClockHandle`); `#clearTimersAndSubs` calls `h.cancel()` instead of `clearTimeout`.

3. **Emission timers** (`#register`, `api/scheduler.ts:530–541`): replace `setInterval(…, em.intervalMs)` with:
   ```ts
   const h = WorldClockApi.every(
     Quantity.of(em.intervalMs / 1000, 's'),
     () => #fireEmission(e, em),
   );
   ```
   Store `ClockHandle[]` in `#emissionTimers`; `#clearTimersAndSubs` and `_clearAllForTesting` call `h.cancel()` instead of `clearInterval`.

   Note: the existing code wraps timer fires in `#runAtRoot` (`runRoot` with `SchedulerApi` as target) so `ApiOnly`-gated mutators pass. `WorldClockApi`'s heartbeat already runs callbacks inside its own `runRoot(WorldClockApi,'heartbeat',…)`; **keep the inner `#runAtRoot(SchedulerApi,…)` wrap** inside the callback so the synthetic root target is `SchedulerApi` (the privileged `_setEngagement`/`_clearEngagement` calls check for that target, `api/scheduler.ts:563–565`). I.e. the callback passed to `WorldClockApi.after/every` itself calls `SchedulerApi.#runAtRoot('completion'|'emission', …)`.

4. **100 ms floor + completed-sync** (`api/scheduler.ts:376–386`): unchanged in shape — `engagement.duration < DURATION_FLOOR_MS` still compares game-ms to 100 game-ms. Sub-100-game-ms completes synchronously and wire-silent exactly as today. Because durations now ride game-time, pause defers and higher scale accelerates completion (a 3-game-second swing at 12× completes in ~250 ms real — AC6).

5. **Tests** — `lib/activity/__tests__/SchedulerApi.test.ts`, `SchedulerApi.hostDestruction.test.ts`, `Engaged.test.ts`:
   - Replace fixture `startedAt = Date.now()` (`SchedulerApi.test.ts:102,153,774`; `hostDestruction.test.ts:70,105`; `Engaged.test.ts:33`) with `WorldClockApi.getNow().rawValue() * 1000`.
   - Replace `vi.useFakeTimers()` + `vi.advanceTimersByTime(ms)` (`SchedulerApi.test.ts:213,372,474,493,503,…`) with the game-time seam: in `beforeEach` call `WorldClockApi._resetForTesting()` and set scale to 1 (so game-ms ≈ advance-ms for arithmetic parity); advance via `WorldClockApi._advanceForTesting(realMs)`. Because completion/emission now route through `WorldClockApi`, advancing the world clock fires them. Keep `SchedulerApi._clearAllForTesting()` in `afterEach`.
   - The 999 ms / 1 ms boundary tests (`SchedulerApi.test.ts:493–495`) become 999 game-ms / 1 game-ms boundary advances — same assertions.

`api/scheduler.ts` is confirmed conflict-clear, so this refactor is safe on the branch.

### 1.8 Wave 1 tests (acceptance §AC1–6)

- `lib/time/__tests__/WorldClockApi.test.ts` — AC1 (advance at scale; `setScale` no discontinuity), AC2 (pause freezes, resume continues, no time lost), using `_setNowProviderForTesting` to step the injected real clock.
- `lib/time/__tests__/WorldClockApi.scheduling.test.ts` — AC5 (`after`/`at`/`every` fire at right game-times; `cancel`/`cancelByTag`/`cancelByHost`; host-destruct auto-cancel via emitting `Events.StuffDestructed`; `nextFireAt`/`fireCount` accurate) + AC4 (`at` whose deadline is already past fires on next advance — deferred-not-skipped).
- `lib/time/__tests__/WorldClockState.persistence.test.ts` — AC3 (snapshot→save→loadOrSeed→restore round-trips `elapsedGameTimeS`; fresh DB seeds zero). Use the real `Document`/`PersistenceManager` test harness (same as `User`/other Document tests) or a mocked `PersistenceManager`.

**Wave 1 ends at a clean commit:** `feat(time): world-clock axis, scheduling primitives, persistence + activity refactor`.

---

## Wave 2 — Celestial profile (`feat(time): celestial profile + CelestialApi (no light wiring)`)

### 2.1 `lib/time/CelestialProfile.ts`

```ts
import { Quantity } from '../quantity';

export interface SunDef { /* v1: identity only; name?: string */ }
export interface MoonDef { synodicPeriodDays: number; } // EARTH_LIKE: 30

export interface CelestialProfile {
  dayLengthSeconds: number;              // 86_400
  yearLengthDays: number;                // 360 (D7)
  axialTiltDegrees: Quantity<'degrees'>; // 23.5
  suns: SunDef[];                        // length 1
  moons: MoonDef[];                      // length 1, synodicPeriodDays 30
}

export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export const EARTH_LIKE: CelestialProfile = {
  dayLengthSeconds: 86_400,
  yearLengthDays: 360,
  axialTiltDegrees: Quantity.of(23.5, 'degrees'),
  suns: [{}],
  moons: [{ synodicPeriodDays: 30 }],
};
```

### 2.2 `lib/time/solar.ts` — pure math (the pedagogical seam, testable in isolation)

All angles in **radians internally**, degrees at the API boundary. Formulas (give them verbatim so engine and tests agree):

Let `D = dayLengthSeconds`, `Y = yearLengthDays`, `tilt = axialTiltDegrees`, `lat = latitudeDegrees`.

- **Day-of-year & time-of-day** from game-time seconds `t`:
  ```
  dayIndex   = floor(t / D) mod Y            // 0-based, 0 = vernal equinox = Arienle 1
  secOfDay   = t mod D
  ```
- **Solar declination** (per requirements):
  ```
  δ = tilt * sin( 2π * dayIndex / Y )        // degrees; sin arg in radians
  ```
  (δ = 0 at dayIndex 0 (equinox), +tilt at summer solstice dayIndex Y/4, 0 at autumn equinox Y/2, −tilt at winter solstice 3Y/4.)
- **Hour angle** (noon = 0, +west):
  ```
  H = ( secOfDay / D ) * 360 - 180           // degrees, −180..+180
  ```
- **Solar altitude** (standard formula):
  ```
  sin(alt) = sin(lat)·sin(δ) + cos(lat)·cos(δ)·cos(H)
  altitude = asin( clamp(sin(alt), -1, 1) )
  ```
- **Solar azimuth** (standard; measured from north, clockwise):
  ```
  cos(Az) = ( sin(δ) - sin(lat)·sin(alt) ) / ( cos(lat)·cos(alt) )
  Az = acos(clamp(cos(Az),-1,1));  if H > 0 then Az = 360 - Az
  ```
- **Day/night:** `isDay = altitude > 0`.
- **Sunrise/sunset** (hour angle at altitude 0): `cos(H0) = -tan(lat)·tan(δ)`.
  - If `cos(H0) < -1` → polar day (sun never sets); `> 1` → polar night. Handle both (at 42°N with tilt 23.5° neither occurs, but tests should assert the guard).
  - `H0 = acos(clamp(...))` degrees → sunrise at `secOfDay = D*(180 - H0)/360`, sunset at `D*(180 + H0)/360`.
- **Season from day-of-year** (vernal equinox = day 0 = Arienle 1, per D7 season N = months 3N−2…3N, 90-day seasons):
  ```
  spring: 0    ≤ dayIndex < Y/4
  summer: Y/4  ≤ dayIndex < Y/2
  fall:   Y/2  ≤ dayIndex < 3Y/4
  winter: 3Y/4 ≤ dayIndex < Y
  ```
- **Moon phase / next full moon** (synodic 30 days): treat `t=0` as a reference new moon (document this anchor; a flavor offset is non-load-bearing).
  ```
  synodicSeconds = synodicPeriodDays * D
  phase = (t mod synodicSeconds) / synodicSeconds   // 0=new, 0.5=full
  nextFullMoon(t): next t' > t with phase(t') = 0.5
                 = t + ((0.5 - phase + 1) mod 1) * synodicSeconds   (if result == t, add synodicSeconds)
  ```

Export pure functions taking `(profile, latitudeDegrees, t)` returning plain numbers (degrees / seconds / boolean / Season). `solar.test.ts` checks these against textbook values directly.

### 2.3 `api/celestial.ts` — `CelestialApi`

Static Api, `SecurityApi.decorateApiClass(CelestialApi)`. Wraps `solar.ts`, resolves the profile + latitude, and returns `Quantity<'degrees'>` / `Quantity<'s'>`.

```ts
static profileFor(location: Stuff): CelestialProfile           // §2.4
static isDayAt(location, time?): boolean
static sunAltitude(location, time?): Quantity<'degrees'>
static sunAzimuth(location, time?): Quantity<'degrees'>
static currentSeason(location, time?): Season
static nextSunrise(location, time?): Quantity<'s'>
static nextSunset(location, time?): Quantity<'s'>
static nextFullMoon(time?): Quantity<'s'>
static atNextSunrise(location, cb, opts?): ClockHandle  // WorldClockApi.at(nextSunrise(...))
static atNextSunset(location, cb, opts?): ClockHandle
static atNextFullMoon(cb, opts?): ClockHandle
```

`time` defaults to `WorldClockApi.getNow()`. `nextSunrise`/`nextSunset` compute the sunrise/sunset `secOfDay` for the current day; if already past, advance to the next day. The `atNext*` shortcuts compute the deadline `Quantity<'s'>` and hand it to `WorldClockApi.at(deadline, cb, opts)` (compose, don't reimplement — AC7).

**Latitude resolution:** `CelestialApi.CAMPUS_LATITUDE` / `CAMPUS_LONGITUDE` module constants (`42` / `0`) — **not** a `resolveSetting` read (see §2.5 / R8: the setting can't resolve with a `Location` host). Single campus value for v1; per-location latitude is future work.

### 2.4 Profile resolution via zone inheritance

`profileFor(location)`:
```
zone = <nearest spatial zone for location>        // via ZoneApi (see below)
profile = zone ? await zone.lookupField<CelestialProfile>('celestialProfile') : null
return profile ?? EARTH_LIKE                        // universe fallback constant
```
Use the existing zone surface: `Zone.lookupField` / `lookupAncestorField` (`lib/zone/Zone.ts:80,112`) which walk enclosing zones via `ZoneApi.getEnclosingZone` (`api/zone.ts:133`); `Zone.ts:69` documents exactly this `lookupField<CelestialProfile>('celestialProfile')` intent. FolderZones participate per `ZoneApi.isFolderClass` (`api/zone.ts:81`).

**Resolving the zone from a `Stuff` location:** `SpatialZone` back-references are via `Location.getZone()` (verified `lib/zone/SpatialZone.ts:55`). Get the location's zone through the public `Stuff.zone` / `getZone()` surface (the nearest spatial zone reference stamped on Stuff, per `Zone.ts:24–27`). If `lookupField` is async (it is — returns `Promise`), **`profileFor` and every `CelestialApi` query become async** (return `Promise<…>`). Confirm and propagate the `async` up to the controllers (they already `await` Api calls — `MeasureHumidityController` is `async execute`).

**Field declaration (additive, only if needed):** if `lookupField`'s getter-or-property read (`Zone.ts:124–135` `readField`) can't resolve `celestialProfile` without a declared field/getter, add a `protected celestialProfile?: CelestialProfile` + `getCelestialProfile()` **additively** to `lib/zone/Zone.ts` or `lib/zone/SpatialZone.ts` (both conflict-clear). For v1 **no per-zone authoring is required** — the `EARTH_LIKE` fallback covers the whole campus; the override path is supported but unexercised until a second profile lands. Recommendation: ship without the field declaration if `readField` tolerates a missing property (it returns `null` → fallback fires); add the declaration only if a Wave-2 test wants to exercise a per-zone override.

### 2.5 Geography + scale config — module constants for v1, NOT EnvironmentMixin settings (Risk R8)

**The EnvironmentMixin settings mechanism cannot serve these — verified.** `resolveSetting(host, key)` resolves a default by walking the **host's own prototype chain** (`collectSchema`, `lib/shell/Environment.ts:148–195`); there is **no global settings registry**. The clock consumes its config where no carrying host exists: at startup (`AppBootstrap`, before any player) and inside `CelestialApi` with a **`Location`** host whose chain does not include `Avatar`. A `world.time.scale` / `world.geography.*` setting declared on `Avatar` would resolve to `undefined` in exactly those contexts and silently fall through to the inline default — a dead, misleading setting. (`world.autosave.interval` works only because `Avatar` reads its **own** setting, `resolveSetting(this)`.)

For v1 these are **module constants**, not settings (values identical to the requirements; only the mechanism is corrected to one that resolves):

- **`scale`** — runtime source of truth is `WorldClockApi`'s state, persisted in `WorldClockState`; default constant `12`; changed at runtime by `setScale()`. **No `world.time.scale` EnvironmentMixin setting.** Live tuning in v1 is via an author `eval` (`eval WorldClockApi.setScale(8)`) until an admin verb lands; this preserves the "dial it by feel" intent without a dead setting.
- **`CAMPUS_LATITUDE = 42`, `CAMPUS_LONGITUDE = 0`** — module constants in `CelestialApi` (single campus, v1). Promote to a per-zone latitude field (the slate's per-location latitude) or a real universe-host setting when a second region lands.
- **`snapshot.interval`** — constant `5 * 60 * 1000` ms in `WorldClockApi` (read at backstop start; no host available).

Net effect: **this build touches no settings host** (`Avatar.ts` stays unedited). The future home for genuine world-level settings is a universe/world singleton host that the clock/celestial APIs query directly — not minted this cycle (see R8). This corrects requirements D2/Q4, which framed these as `world.*` settings; the requirements doc is being updated to match.

### 2.6 Wave 2 tests (AC7)

- `lib/time/__tests__/solar.test.ts` — pure-math: equinox (dayIndex 0 and Y/2) gives δ≈0 and ~12 h day-length at 42°N; summer solstice (Y/4) gives δ≈+23.5° and a long day; winter solstice short day; altitude/azimuth at noon match `90° − |lat − δ|` for the meridian-crossing sun; sample a full 360-day sweep against the closed-form formulas within tolerance (e.g. altitude within 0.5°). Polar-day/night guards at extreme latitudes.
- `lib/time/__tests__/CelestialApi.test.ts` — `isDayAt`/`currentSeason` across the year; `nextSunrise`/`nextSunset`/`nextFullMoon` return future game-times; `atNextSunrise`/`atNextSunset`/`atNextFullMoon` fire at them (drive via the Wave-1 `_advanceForTesting` seam); `profileFor` returns `EARTH_LIKE` fallback when no zone override.

**Wave 2 commit:** `feat(time): celestial profile + CelestialApi (compute only, no light wiring)`.

---

## Wave 3 — Calendar (`feat(time): DefaultCalendar + onDate/cron scheduling`)

### 3.1 `lib/time/Calendar.ts`

```ts
import type { Quantity } from '../quantity';

export interface CalendarDate {
  year: number; month: number; day: number;     // month/day 1-based
  weekday: number;                                // 0-based, 0 = Oneday
  hour: number; minute: number; second: number;
}

export interface Calendar {
  decompose(t: Quantity<'s'>): CalendarDate;
  compose(date: CalendarDate): Quantity<'s'>;
  formatDate(t: Quantity<'s'>, format?: string): string;
  parseDate(input: string, format?: string): Quantity<'s'>;
  monthNames: string[];
  weekdayNames: string[];
  hoursPerDay: number;     // 24
  daysPerMonth: number[];  // [30 ×12]
  daysPerWeek: number;     // 7
}
```

### 3.2 `lib/time/DefaultCalendar.ts`

Constants:
```ts
monthNames = ['Arienle','Teliminus','Lorien','Ysaril','Karmina','Heliune',
              'Brendarn','Ingot','Alystos','Gettrellyn','Rozgayn','Blayhrr'];
weekdayNames = ['Oneday','Twoday','Threeday','Fourday','Fiveday','Sixday','Sevenday'];
hoursPerDay = 24; daysPerMonth = Array(12).fill(30); daysPerWeek = 7;
SECONDS_PER_DAY = 86_400; DAYS_PER_YEAR = 360;
```

**Epoch (D1/requirements):** `t = 0` ⇒ `{ year:1, month:1 (Arienle), day:1, weekday:0 (Oneday), 00:00:00 }`.

**`decompose(t)`** (let `s = t.rawValue()`):
```
totalDays = floor(s / 86400);  secOfDay = s mod 86400
hour = floor(secOfDay/3600); minute = floor((secOfDay%3600)/60); second = secOfDay%60
year  = floor(totalDays / 360) + 1
doy   = totalDays mod 360                 // 0-based day-of-year
month = floor(doy / 30) + 1               // 1..12
day   = (doy mod 30) + 1                  // 1..30
weekday = totalDays mod 7                 // 0 = Oneday  (t=0 → Oneday)
```

**`compose(date)`** (inverse; `compose` is authoritative for `onDate`/`cron`):
```
totalDays = (year-1)*360 + (month-1)*30 + (day-1)
s = totalDays*86400 + hour*3600 + minute*60 + second
return Quantity.of(s, 's')
```
`decompose∘compose` round-trips exactly (no leap years) — assert (AC8). `compose` ignores the input `weekday` (derived), or asserts it matches.

**Weekday drift** (AC8): month 2 (Teliminus) day 1 has `totalDays = 30`, `30 mod 7 = 2` ⇒ weekday 2 = **Threeday**. Year 2 day 1 has `totalDays = 360`, `360 mod 7 = 3` ⇒ weekday shifts 3. Tests assert both.

**`formatDate(t, format?)`** — minimal token format string, default `'{weekday}, {day} {month} {year} {hh}:{mm}'` → e.g. `"Oneday, 1 Arienle 1 00:00"`. Tokens: `{year}`, `{month}` (name), `{monthNum}`, `{day}`, `{weekday}` (name), `{hh}`/`{mm}`/`{ss}` (zero-padded). Keep the token set minimal.

**`parseDate(input, format?)`** — inverse of the default format only (v1): parse `"<day> <MonthName> <year> [hh:mm[:ss]]"` → build `CalendarDate` → `compose`. `formatDate∘parseDate` round-trips for the default format (AC8). Throw on unparseable input.

### 3.3 `onDate` / `cron` on `WorldClockApi` (add in Wave 3)

```ts
static onDate(date: CalendarDate | string, cb, opts?: ScheduleOpts & { calendar?: Calendar }): ClockHandle
static cron(pattern: CronPattern, cb, opts?: ScheduleOpts & { calendar?: Calendar }): ClockHandle
```

- `onDate`: resolve `calendar` (default `DefaultCalendar` singleton — locale stubbed to universe default per requirements). If `date` is a string, `calendar.parseDate(date)`; if a `CalendarDate`, `calendar.compose(date)`. The result is an absolute `Quantity<'s'>` deadline ⇒ delegate to `at(deadline, cb, opts)`.
- `cron`: compute the **next** absolute game-time matching the partial pattern (`weekday`/`monthday`/`month`/`hour`/`minute`), then register a recurring fire that, on each fire, recomputes the next matching deadline and re-arms (a self-rescheduling one-shot, so irregular calendar cadences stay correct). Implement `#nextCronMatch(pattern, fromT, calendar)`: starting at `fromT`, step forward (decompose, test the constrained fields, advance by the smallest unit that can change a failing field) until a match; convert back via `compose`. Keep it simple — minute-granularity scan with day/month skipping is acceptable for v1.

Resolve `weekday`/`month` string names against `calendar.weekdayNames`/`monthNames`.

### 3.4 System-scope schedules (festival / market reset)

Per requirements, register universe-level recurring schedules in a startup init hook. Prefer doing this from the `AppBootstrap` restore step (call e.g. `WorldClockApi.registerSystemSchedules()` after `restore`) **rather than adding a `bootstrap.ts` manifest entry** — keeps `bootstrap.ts` untouched (§1.6). For v1 this may be empty/stubbed; the mechanism is what's specified. If a concrete festival is wanted, register a `cron({ month:'Karmina', monthday:15, hour:0, minute:0 }, …)`.

### 3.5 Wave 3 tests (AC8)

- `lib/time/__tests__/DefaultCalendar.test.ts` — `decompose∘compose` round-trip for arbitrary `t`; epoch `t=0` ⇒ Oneday/Arienle 1/year 1; weekday drift (Teliminus 1 = Threeday; new-year +3 shift); `formatDate`/`parseDate` round-trip.
- `lib/time/__tests__/WorldClockApi.calendar.test.ts` — `onDate` fires on the right game-time (compose then advance via `_advanceForTesting`); `cron` fires on matching dates and re-arms for the next match.

**Wave 3 commit:** `feat(time): DefaultCalendar + onDate/cron`.

---

## Wave 4 — Pedagogical surface (`feat(time): time/sky instruments + analyze/measure verbs`)

### 4.1 Controller + instrument pattern (precedent)

Controllers extend `CommandController<Model>` with `async execute(model, ctx)`; validate instrument in hand (`MixinApi.isContainer(giver)` → `ContainmentApi.getContents` → `inv.some(i => i instanceof <Instrument>)`); resolve scope (`giver.getContainer?.()`); read via the Api; format `Quantity` with `.formatMml()`/`.tag()`; emit via `MessageApi.scene(giver).topic(...).toSelf(body).send()`; on failure `ctx.note({ kind:'controller-rejected', … })` + a `toSelf` hint. Pattern copied verbatim from `obj/command/MeasureHumidityController.ts` and `MeasureGravityController.ts`. Instruments are `extends Thing` with `static commandContributions: CommandContributions = { self:[], inventory:['<yaml>'], environment:[], peers:[] }` (precedent `obj/instrument/Hygrometer.ts`).

**Topic strings** (free-form; no perception-file edit): reuse the `world.perception.measurement.*` family already in the codebase, coining new leaves:
`world.perception.measurement.measure-shadow`, `…measure-altitude` (already exists for barometric — see §4.4), `…analyze-time`, `…analyze-sky`.

### 4.2 `analyze time` → `AnalyzeTimeController`

Append to `cmd/analyze.yaml` (append-only):
```yaml
  time:
    description: "Report game-time, scale, and the current date in your calendar"
    controller: AnalyzeTimeController
    args:
      - { name: detail, type: string, required: false }
```
Controller: `const now = WorldClockApi.getNow();` `const scale = WorldClockApi.getScale();` `const date = DefaultCalendar.singleton().formatDate(now);` → casual prose + analytical line (game-seconds, scale, calendar date). No instrument required (analyze verbs are introspective). Two-audience rendering: casual prose default, raw values on the analytical line.

### 4.3 `analyze sky here` → `AnalyzeSkyController`

Append to `cmd/analyze.yaml`:
```yaml
  sky:
    description: "Full celestial state for a location"
    controller: AnalyzeSkyController
    args:
      - { name: location, type: object, required: false, default: "here", scope: ["reachable"],
          validators: [/lib/command/validators/mustBeContainer] }
```
Controller resolves the location (default `here`), then `await CelestialApi.sunAltitude/sunAzimuth/isDayAt/currentSeason(location)` + `nextFullMoon()` → composite readout (day/night + season + sun altitude/azimuth in degrees + moon phase). Casual + analytical.

### 4.4 `measure shadow` + `measure altitude <sun|moon>`

Append to `cmd/measure.yaml`:
```yaml
  shadow:
    description: "Read solar elevation/azimuth from your shadow (needs a sundial)"
    controller: MeasureShadowController
    args:
      - { name: detail, type: string, required: false }
```
**Naming collision (Risk R5) — DECIDED: route by argument.** `measure altitude` already exists in `cmd/measure.yaml` (barometric altitude via `MeasureAltitudeController`). The requirements want `measure altitude <sun|moon>` (angular). **Ratified approach:** keep the single `altitude` subcommand and route by argument inside `MeasureAltitudeController` — if the first arg is `sun`/`moon`, delegate to the celestial logic (validate a `Sextant` in hand → `await CelestialApi.sunAltitude/sunAzimuth`); otherwise the existing barometric path. Editing `MeasureAltitudeController.ts` is allowed (net code, not contested). No second `altitude` YAML key, no new verb, **no separate `MeasureSunMoonAltitudeController`** — the celestial branch lives inline in `MeasureAltitudeController` (or a helper it delegates to).

`MeasureShadowController`: validate `Sundial` in hand → `await CelestialApi.sunAltitude/sunAzimuth(scope)` → format degrees.

### 4.5 Instruments

`obj/instrument/Sundial.ts`, `Sextant.ts` — each `extends Thing` with `commandContributions` pointing at `measure.yaml`. Optionally seed instances via the seed system (check `seeds/` for the instrument-seeding precedent) so they exist in-world; not required for tests.

### 4.6 Wave 4 tests (AC9)

`obj/command/__tests__/AnalyzeTimeController.test.ts`, `AnalyzeSkyController.test.ts`, `MeasureShadowController.test.ts`, and the celestial branch of `MeasureAltitudeController` (sun/moon arg, per §4.4) — follow the existing controller-test harness (e.g. `MeasureHumidityController` tests if present): assert the no-instrument rejection path, the success readout (casual + analytical), correct topic, and correct Api delegation (mock `CelestialApi`/`WorldClockApi` or drive them via the Wave-1 seam).

**Wave 4 commit:** `feat(time): time/sky instruments + analyze/measure verbs`.

---

## Final step (every wave, mandatory at end of build) — conflict-freedom gate (AC10)

**Drive the gate off the documented contested-file list (§0.2), not the live git diff.** (`perception` is ~16 commits ahead of `master`, so `git diff master..perception` *does* list its churn — but branch topology can shift, and the §0.2 list is the authoritative contract either way.) Run the diff as a belt-and-suspenders check:

```bash
# Files this build changed:
git diff --name-only master | sort > /tmp/wc_changed

# Files the sibling churns:
git diff --name-only master..perception | sort         # may be empty in this snapshot

# Intersection MUST be empty except the append-only allow-list:
#   bootstrap.ts  (only if a manifest entry was unavoidable)
#   cmd/analyze.yaml, cmd/measure.yaml
```

Then **manually verify** that none of `git diff --name-only master` touches any path in the §0.2 contested list (`lib/perception/*`, `lib/description/*`, `lib/message/*`, `lib/biome/SkyExposed.ts`, `config/quantity-tags.yaml`, comms/emote verbs). The only acceptable shared edits are the append-only `cmd/analyze.yaml`, `cmd/measure.yaml`, and (if used) `bootstrap.ts`. Confirm `api/scheduler.ts`, `services/Server.ts`, `lib/zone/*`, `lib/quantity.ts` edits are present and that none are on the contested list. This gate must pass before each wave's commit and especially before the final commit (AC10).

---

## Open risks / decisions for the builder

- **R1 — `CelestialApi` is async.** `Zone.lookupField` is `async` (`lib/zone/Zone.ts:80`), so `profileFor` and all celestial queries must return `Promise`. Controllers already `await` Api calls, so this is fine. **Recommendation:** make the whole `CelestialApi` surface async and propagate `await` up. If a sync surface is later wanted, cache the resolved profile per-zone.

- **R2 — Fixed-id Document upsert.** Confirm `PersistenceManager.save` upserts on a caller-supplied string `_id` (`lib/persistence/Document.ts:169` writes `doc._id`). **Recommendation:** pin `_id = 'world-clock'` in `loadOrSeed`; if Mongo rejects a non-ObjectId string `_id`, fall back to `WorldClockState.find({})[0]` as the singleton and let Mongo assign the `_id`. Decide by reading `backend/PersistenceManager.ts:257–328`.

- **R3 — Admin gating of `setScale`/`pause`/`resume`.** Requirements call these "admin." No specific gate is mandated. **Recommendation:** leave them ungated at the Api (the substrate level), and gate at the eventual admin-command layer (out of scope this cycle); `SecurityApi.decorateApiClass` plus the test-only seams (`assertTestOnly`) are sufficient for v1. Note this explicitly so the builder doesn't invent an auth check.

- **R4 — Settings host. SUPERSEDED by R8.** (Originally proposed co-locating `world.*` on `Avatar`'s `static settings`. That doesn't resolve in the clock's consumption contexts — see R8 — so the clock config is module constants instead, and no settings host is touched.)

- **R5 — `measure altitude` collision. RESOLVED (route by argument).** Route inside the existing `altitude` subcommand: `MeasureAltitudeController` delegates to celestial logic when arg ∈ {sun, moon}, else the barometric path. No new verb, no duplicate YAML key, no separate `MeasureSunMoonAltitudeController` subcommand registration. See §4.4.

- **R6 — Activity duration unit.** Existing `duration`/`intervalMs`/`startedAt` are **milliseconds**. **Recommendation (in plan):** keep them as game-**ms**, convert `/1000` at the `WorldClockApi` (seconds) boundary, preserving the 100 ms floor and all field names. Do not rename `duration`. This is the lowest-churn reconciliation; confirm no consumer reads `duration` as seconds.

- **R7 — Moon-phase epoch.** `t=0` chosen as reference new moon (so full moon at synodic/2). This is a documentation choice with no load-bearing flavor value; **recommendation:** state it in `solar.ts` and the test, keep it.

- **R8 — World-level config can't be EnvironmentMixin settings (RESOLVED → constants).** `resolveSetting` resolves defaults by walking the **host's own prototype chain** (`collectSchema`, `lib/shell/Environment.ts:148–195`) — no global registry. The clock reads its config at startup (no host) and via `CelestialApi(location)` (a `Location` host that doesn't carry an `Avatar`-declared schema), so a `world.*` setting on `Avatar` resolves to `undefined` there. **Decision (§2.5):** `scale` (default 12; live source = persisted `WorldClockState`; mutate via `setScale()`), `CAMPUS_LATITUDE`/`CAMPUS_LONGITUDE` (42/0), and `SNAPSHOT_INTERVAL_MS` are **module constants**, not settings. `Avatar.ts` is not touched. Diverges from requirements D2/Q4 framing (settings → constants; same values); requirements updated. Future: a real universe/world settings host carrying `world.*` and queried directly — out of scope this cycle (don't mint one now per the "no premature registries / substrate has no content hooks" conventions).

### Critical files for implementation
- `packages/server/src/mud/api/worldclock.ts` (new — the time authority + heartbeat scheduler)
- `packages/server/src/mud/api/scheduler.ts` (modify — D5 game-time refactor; the hardest existing-code change)
- `packages/server/src/mud/lib/time/WorldClockState.ts` (new) + `packages/server/src/backend/AppBootstrap.ts` & `packages/server/src/services/Server.ts` (modify — persistence lifecycle)
- `packages/server/src/mud/lib/time/solar.ts` + `packages/server/src/mud/api/celestial.ts` (new — celestial math + queries)
- `packages/server/src/mud/lib/time/DefaultCalendar.ts` (new — calendar compose/decompose, basis for onDate/cron)
