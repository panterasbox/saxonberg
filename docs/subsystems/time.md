# Time — world clock, celestial, calendar

The game-time substrate: a single global time authority, the
scheduling primitives that ride it, real solar/lunar geometry, a
calendar, and the pedagogical verb/instrument surface on top. Three
layers, all under `lib/time/` plus the two Apis `api/worldclock.ts`
and `api/celestial.ts`.

Graduated from `docs/slates/world-clock-slate.md` (kept for the
forward-looking design surface — multi-region latitude, locale,
weather, NPC schedules, second celestial profiles, celestial→light
wiring).

---

## Layer 1 — Time axis (`WorldClockApi`, `api/worldclock.ts`)

The single global authority for "what time is it in the world." A
thin static Api facade over the `WorldClockRegistry` singleton (which
holds the clock state), decorated with `SecurityApi.decorateApiClass`.
Everything that needs game-time goes through `getNow()`.

### Own-thing model (D1)

Game time advances **only while the server is up**. It pauses at
shutdown and resumes from the persisted `elapsedGameTime` on the next
boot. There is no coupling to wall-clock time across downtime — a
crash or a week offline both just resume where the clock last
persisted. This is the deliberate choice over a real-clock-coupled
model (which would "catch up" elapsed real time on restart).

### Anchor math

`getNow()` is computed from an in-memory anchor `(anchorGameTimeS,
anchorRealMs)` and a `scale` — all held on the `WorldClockRegistry`
singleton; `WorldClockApi.getNow()` delegates to it:

```
now_s = anchorGameTimeS + ((realNowMs − anchorRealMs) / 1000) × scale
```

`setScale` / `pause` / `resume` **re-anchor** (capture the current
game-time into `anchorGameTimeS`, reset `anchorRealMs`) so there is
no time discontinuity. While paused, `getNow()` returns the frozen
`anchorGameTimeS`; `resume()` re-anchors real time without advancing
game time, so no time is gained or lost across a pause.

Every real-clock read goes through an injectable `nowMs()` on the
Registry (defaults to `Date.now`) so tests control time
deterministically — see *Test seams* below. It's `private nowMs`, not
`#nowMs`: the Registry is a Stuff host whose instance methods dispatch
through the call-security proxy, where `#`-private slots are
unreachable.

Default scale is **12×** (2 real hours = 1 game day), a module
constant `DEFAULT_SCALE`; the live value is clock state, persisted in
`WorldClockState`, mutated at runtime by `setScale()` (author `eval`
in v1 until an admin verb lands).

```ts
WorldClockApi.getNow(): Quantity<'s'>;   // game-seconds since epoch
WorldClockApi.getScale(): number;
WorldClockApi.setScale(scale: number): void;   // re-anchors; admin
WorldClockApi.pause(): void;
WorldClockApi.resume(): void;
WorldClockApi.isPaused(): boolean;
```

### Persistence — `WorldClockState` + lifecycle

`WorldClockState extends Document` (`lib/time/WorldClockState.ts`) — a
plain Mongo record (NOT Stuff), `collectionName = 'world_state'`,
persisting three scalars: `elapsedGameTimeS`, `scale`,
`lastShutdownRealMs`. It is meta/config, which is the `Document`
track's remit (D3).

**Singleton via `find({})`, not a fixed id.** Mongo's `ObjectId`
constructor rejects a human-readable `_id` like `'world-clock'`
(`findById`/`save` both throw on it), so `WorldClockState.loadOrSeed()`
finds the sole row via `find({})` and lets Mongo assign the `_id` on
first insert. A loaded instance carries its real ObjectId, so
subsequent saves upsert in place.

The **lifecycle is owned by the Api**, invoked from the backend layer:

- `WorldClockApi.boot()` — `loadOrSeed` → `restore` → start backstop →
  register system schedules. Called once as a sequencer step in
  `AppBootstrap.run()` (after `BootstrapManager.run()`, so any Stuff
  re-establishing a schedule in `postRegister` has a live clock).
  Fresh DB ⇒ zero clock at scale 12.
- `WorldClockApi.shutdown()` — pause + persist the snapshot. Called
  from `AppBootstrap.shutdown()` (the backend-layer teardown
  counterpart to `run()`), which `Server.stop()` invokes. Transport
  code (`services/Server.ts`) carries no game logic — it just calls
  `AppBootstrap.shutdown()`.

> **Why not BootstrapManager?** That manager clones Stuff from the
> manifest; the clock state is a `Document`, not a clonable template,
> so its restore can't live there. It's a sequencer step on
> `AppBootstrap` instead.

**`boot()` / `shutdown()` are `SystemRoot`-gated**
(`@CallSecurity(SecurityPolicies.SystemRoot)`). They only ever run at
the empty-stack process boundary (`AppBootstrap.run` / the SIGTERM/
SIGINT shutdown handler), where the call-security caller is `null`.
Every in-world / `eval` / scheduled-callback / network context runs
under a frame with a non-null target, so all of them are denied —
nothing reachable from in-game can re-anchor the clock or freeze
world-time. (Precedent: `StuffApi.forceDestruct` gates a static the
same way.) `setScale` / `pause` / `resume` stay `Public` for now —
their gating is deferred to the eventual admin-command layer (and
`shutdown()` itself relies on `pause()` being callable from within
its own frame).

### Crash handling

Two tiers:

- **Graceful (SIGTERM/SIGINT)** — `shutdown()` writes a full snapshot
  before `process.exit(0)`. Zero loss; the world resumes exactly.
- **Ungraceful (crash, `kill -9`, `uncaughtException`→`exit(1)`, power
  loss)** — a **periodic real-time backstop** (`ScheduleApi.recurring`,
  `SNAPSHOT_INTERVAL_MS = 5 min`, real time so it ticks regardless of
  pause/scale) persists the snapshot. Recovery loses at most one
  interval: on reboot the clock **rewinds** to the last saved
  `elapsedGameTimeS` and resumes. Because of the own-thing model this
  is harmless — there's no external clock to desync against.

`lastShutdownRealMs` is recorded but **not used in the recovery math**
(downtime contributes zero game-time). It's advisory/debug only.
Known gap: `uncaughtException` / `unhandledRejection` exit without a
snapshot, so they always lose up to one backstop interval; a
best-effort handler write is the lever that would shrink it.

### Scheduling primitives

A deadline-ordered registry driven by a **single real-time
heartbeat**, built on `ScheduleApi` (so attribution / `runRoot`
plumbing is reused). All transient, in-memory only.

```ts
WorldClockApi.after(delay: Quantity<'s'> | string, cb, opts?): ClockHandle;
WorldClockApi.at(deadline: Quantity<'s'>, cb, opts?): ClockHandle;
WorldClockApi.every(interval, cb, opts? & { startAt?; runs? }): ClockHandle;
WorldClockApi.cancel(handle): void;
WorldClockApi.cancelByTag(tag, host?): number;
WorldClockApi.cancelByHost(host): number;
// calendar-aware (Layer 3):
WorldClockApi.onDate(date: CalendarDate | string, cb, opts? & { calendar? }): ClockHandle;
WorldClockApi.cron(pattern: CronPattern, cb, opts? & { calendar? }): ClockHandle;
```

- **`ClockHandle`** is a live view onto the schedule: `id`,
  `nextFireAt` (`null` once cancelled/expired), `fireCount`,
  `cancel()`.
- **String durations** (`'5 minutes'`, `'3 days'`) parse on the
  calendar-free convention: minute = 60 s, hour = 3600 s, day =
  86 400 s.
- **Arm-next-deadline, not fixed tick.** On each (re)arm, the earliest
  game-time deadline across live schedules is converted to a real-ms
  delay (`gameDelta / scale`) and a single `ScheduleApi.schedule`
  one-shot is armed. Pause disarms; `setScale`/`resume` re-arm against
  the new scale (higher scale fires sooner, pause defers indefinitely).
  Recurring schedules catch up by looping if the heartbeat was late, so
  cadence stays correct. A small `FIRE_EPSILON_S` absorbs float drift
  from accumulating fractional-second deadlines.
- **Host-scoped auto-cancel.** With `opts.host`, the schedule
  subscribes to `Events.StuffDestructed` (the same hook `SchedulerApi`
  uses) and cancels when the host destructs.

### Scheduling model: never persisted

**Schedules are pure runtime state. The clock never persists them.**
The pattern is **persist state, not schedules**: a Stuff that wants to
fire later stores its deadline as a persistent field and
re-establishes the schedule in `postRegister`, owning its own
missed-event semantics (fire-immediately / skip / log-and-reschedule).
This is what makes "deferred-not-skipped" work across downtime — on
crash-recovery the clock rewinds slightly, so a persisted deadline is
still in the future and re-arms (fired late, never silently dropped).
Hot-reload is free: clone-replace destructs the old clone (cancelling
its host schedules); the new clone re-establishes in `postRegister`.

### Test seams

Gated by `SecurityApi.assertTestOnly`:

- `_setNowProviderForTesting(fn)` — inject the real clock (AC1/AC2
  tests step it directly).
- `_resetForTesting()` — clear schedules + heartbeat, reset anchors/
  scale/paused, install a frozen test clock.
- `_advanceForTesting(realMs)` — advance the injected clock and
  synchronously drive `#onHeartbeat` until nothing is due, bypassing
  the real timer. In test mode the live arm is suppressed
  (`#rearmHeartbeat` no-ops) so `_advanceForTesting` is the *only*
  driver — no real `setTimeout` can double-fire.

### Activity integration (D5)

`SchedulerApi` (`api/scheduler.ts`) rides game-time. Completion
(`DurativeActivity.duration`) and emission cadence
(`ScheduledEmission.intervalMs`) are scheduled through
`WorldClockApi.after` / `every` rather than raw Node timers, so
**pausing the clock pauses in-flight activities and `scale` speeds
them up**. `Engagement.startedAt` is a game-time stamp.

Unit reconciliation: the existing `duration` / `intervalMs` /
`startedAt` fields stay **game-milliseconds** (converted `/1000` at
the `WorldClockApi` seconds boundary), preserving the 100-game-ms
duration floor and the wire-silent `completed-sync` path without
renaming public fields. The world clock runs each fire inside its own
`runRoot(WorldClockApi, 'heartbeat')`; the scheduler keeps its inner
`#runAtRoot(SchedulerApi, …)` wrap so the privileged
`_setEngagement` / `_clearEngagement` calls still pass `ApiOnly`.

---

## Layer 2 — Celestial (`api/celestial.ts`, `lib/time/CelestialProfile.ts`)

Real solar/lunar geometry plus the queries on top. Wave 2 ships the
**compute substrate only** — there is **no** wiring into ambient light
(D6); that waits until the `perception` branch merges.

### `CelestialProfile` + `EARTH_LIKE`

```ts
interface CelestialProfile {
  dayLengthSeconds: number;              // 86_400
  yearLengthDays: number;                // 360 (D7)
  axialTiltDegrees: Quantity<'degrees'>; // 23.5
  suns: SunDef[];                        // one
  moons: MoonDef[];                      // one, synodicPeriodDays 30
}
```

`EARTH_LIKE` is the universe default. The **360-day year** (not
365.25) reconciles seasons (90-day quarters) with the 360-day
`DefaultCalendar`. The moon's 30-day synodic period lands a full moon
once per calendar month. `'degrees'` is a unit in the `Quantity`
catalog (`lib/quantity.ts`), added for axial tilt / altitude /
azimuth; computed live, never persisted, so no tag table or
marshaller.

### `CelestialApi`

Async (profile resolution walks the async `Zone.lookupField`). The
high-level surface returns `Quantity`-packaged values; the
`── pure geometry ──` section is the pedagogical seam — stateless
static methods taking plain numbers and returning plain numbers so an
astronomy student can compare engine output to textbook formulas.

```ts
CelestialApi.profileFor(location): Promise<CelestialProfile>;
CelestialApi.isDayAt / sunAltitude / sunAzimuth / currentSeason(location, time?);
CelestialApi.nextSunrise / nextSunset(location, time?): Promise<Quantity<'s'>>;
CelestialApi.nextFullMoon(time?) / moonPhase(time?);
CelestialApi.moonAltitude / moonAzimuth(location, time?);
CelestialApi.atNextSunrise / atNextSunset / atNextFullMoon(...): ClockHandle;
// pure geometry: declinationDeg, hourAngleDeg, altitudeFor, azimuthFor,
//   solarAltitudeDeg, solarAzimuthDeg, isDay, sunriseHourAngleDeg,
//   sunrise/sunsetSecOfDay, nextSolarEvent, seasonFor, moonPhaseFor,
//   nextFullMoonFor, solarEclipticLongitudeDeg, moon{Declination,HourAngle,
//   Altitude,Azimuth}Deg
```

The geometry was originally a free-floating `solar.ts` module; per MR
review it was **folded into `CelestialApi`** as static methods (the
codebase rule: cross-cutting static helpers default to an Api class,
not a loose module). The two names colliding with the high-level
surface are the geometry-level `moonPhaseFor` / `nextFullMoonFor` (vs
the `Quantity`-returning `moonPhase` / `nextFullMoon`).

- **Declination** `δ = tilt · sin(2π · dayOfYear / yearLength)`;
  altitude/azimuth from `δ`, latitude, hour angle by the standard
  formulas. Conventions: dayIndex 0 = vernal equinox = Arienle 1; hour
  angle 0 at noon, positive west; azimuth from north, clockwise.
- **Sunrise/sunset** via `cos(H0) = −tan(lat)·tan(δ)`, with explicit
  polar-day / polar-night guards.
- **First-order lunar model** (honest but simplified): the moon is a
  point on the ecliptic whose longitude leads the sun's by `360°·phase`
  (full moon opposite the sun, riding high at local midnight). Ignores
  the 5° lunar inclination and orbital eccentricity — first order, not
  an ephemeris — so `measure altitude moon` is a *real* reading, not a
  fake.
- **Profile resolution** walks the zone-inheritance surface
  (`zone.lookupField<CelestialProfile>('celestialProfile')`) with
  `EARTH_LIKE` as the universe fallback. No per-zone authoring is
  required for v1; the override path is supported but unexercised until
  a second profile lands. `Zone.readField` tolerates a missing
  property (returns null → fallback), so no `celestialProfile` field
  declaration was needed on `Zone`/`SpatialZone`.

### Geography config — module constants, NOT settings (R8)

`CAMPUS_LATITUDE = 42`, `CAMPUS_LONGITUDE = 0`, `scale`'s default, and
`SNAPSHOT_INTERVAL_MS` are **module constants**, not EnvironmentMixin
settings. `resolveSetting` resolves defaults by walking the host's own
prototype chain (no global registry), and the clock consumes its
config where no carrying host exists — at startup (before any player)
and inside `CelestialApi` with a `Location` host whose chain doesn't
include `Avatar`. A `world.*` setting would resolve to `undefined`
there and silently fall through — a dead, misleading setting. The
future home for genuine world-level settings is a universe/world
singleton host queried directly; not minted this cycle. (This corrects
the slate/requirements D2/Q4 framing — same values, a mechanism that
actually resolves.)

---

## Layer 3 — Calendar (`lib/time/Calendar.ts`, `DefaultCalendar.ts`)

`Calendar` is the seam between raw game-seconds and a human-readable
date; `compose` is the basis for `onDate`/`cron`. The substrate
supports multiple calendars on one axis (cross-calendar conversion =
ask the target calendar to decompose the shared time); v1 ships only
`DefaultCalendar`, and locale selection is stubbed to the universe
default.

**`DefaultCalendar`** — 360 days/year = 12 months × 30 days; 4 seasons
× 90 days; 7-day weeks; 24-hour days; **no leap years**. Epoch:
`t = 0` ⇒ `{year 1, Arienle 1, Oneday, 00:00:00}`.

- Months: Arienle, Teliminus, Lorien, Ysaril, Karmina, Heliune,
  Brendarn, Ingot, Alystos, Gettrellyn, Rozgayn, Blayhrr.
- Weekdays: Oneday … Sevenday.
- `decompose` / `compose` round-trip exactly. **Weekday drifts** (30
  mod 7 = 2 ⇒ Teliminus 1 is Threeday; 360 mod 7 = 3 ⇒ the new year
  shifts 3) — a feature, asserted by tests.
- `formatDate` (token string, default `'{weekday}, {day} {month} {year}
  {hh}:{mm}'`) / `parseDate` (inverse of the default shape) round-trip.

**`cron`** computes the next absolute game-time matching a partial
pattern (`weekday`/`monthday`/`month`/`hour`/`minute`, names resolved
against the calendar rosters) and self-reschedules: each fire
recomputes the next match and re-arms, so irregular calendar cadences
stay correct. The returned handle survives the reschedules. System-
scope recurring schedules (festival / market reset) register from the
`AppBootstrap` boot step (`registerSystemSchedules`, empty in v1)
rather than a `bootstrap.ts` manifest entry.

---

## Wave 4 — Pedagogical surface

Two audiences, one engine: casual prose by default, physics/astronomy-
grade values on the analytical path.

| Verb | Controller | Instrument | Reveals |
|---|---|---|---|
| `analyze time` | `AnalyzeTimeController` | — | game-time, scale, calendar date |
| `analyze sky [here]` | `AnalyzeSkyController` | — | day/night, season, sun altitude/azimuth, moon phase, next full moon |
| `measure shadow` | `MeasureShadowController` | `Sundial` | solar elevation / azimuth |
| `measure altitude <sun\|moon>` | `MeasureAltitudeController` | `Sextant` | angular altitude / azimuth |

`measure altitude` routes by argument: `sun`/`moon` → the celestial
(sextant) branch; anything else → the existing barometric-altitude
path. Instruments are `Thing`s carrying the verb via
`commandContributions.inventory`. Topic strings reuse the free-form
`world.perception.measurement.*` family (no perception-file edit).

---

## Module placement

| Artifact | Category | Path |
|---|---|---|
| `WorldClockApi` (+ `ClockHandle` / `ScheduleOpts` / `CronPattern` / `WorldClockSnapshot`) | Api | `api/worldclock.ts` |
| `WorldClockRegistry` | Stuff (singleton `Idea`) | `obj/WorldClockRegistry.ts` |
| `CelestialApi` (+ folded geometry) | Api | `api/celestial.ts` |
| `WorldClockState` | Document | `lib/time/WorldClockState.ts` |
| `Calendar` / `CalendarDate` | domain | `lib/time/Calendar.ts` |
| `DefaultCalendar` | domain | `lib/time/DefaultCalendar.ts` |
| `CelestialProfile` / `EARTH_LIKE` / `SunDef` / `MoonDef` / `Season` | domain | `lib/time/CelestialProfile.ts` |
| `Sundial` / `Sextant` | Stuff | `obj/instrument/` |
| `Analyze{Time,Sky}Controller`, `Measure{Shadow,Altitude}Controller` | Controller | `obj/command/` |
| `analyze` / `measure` subcommands | Command YAML | `cmd/analyze.yaml`, `cmd/measure.yaml` |
| `scale` default / `CAMPUS_LATITUDE` / `CAMPUS_LONGITUDE` / `SNAPSHOT_INTERVAL_MS` | module constants | on the two Apis (NOT settings) |

The `WorldClockApi` ↔ `WorldClockRegistry` split exists for HMR
survival: the Api is a thin facade holding only a cached `#registryRef`,
while the anchor, scale, schedules, and `heartbeat: ScheduleHandle`
live on the singleton Registry so they survive a reload of the Api
file.

`'degrees'` was added to the `Unit` union + `unitOps` in
`lib/quantity.ts`.

---

## Cross-references

- [activity.md](./activity.md) — `SchedulerApi` / `EngagedMixin`; D5
  moves its completion/emission cadence onto this clock.
- [quantities.md](./quantities.md) — `Quantity<U>`; `'s'` and
  `'degrees'` units.
- [persistence.md](./persistence.md) / [state-model.md](./state-model.md)
  — the `Document` track `WorldClockState` rides.
- [zone.md](./zone.md) — `Zone.lookupField` profile-inheritance walk.
- [call-security.md](./call-security.md) — `SystemRoot` gating on
  `boot`/`shutdown`; static-Api `@CallSecurity`.
- [bootstrap.md](./bootstrap.md) — `AppBootstrap` boot/shutdown
  sequencing.
- `docs/slates/world-clock-slate.md` — the open design surface for the
  deferred waves below.

## Future work (in the slate)

Celestial → ambient-light wiring (deferred until `perception` merges);
friendly time tags (`morning`/`midnight`) in
`config/quantity-tags.yaml`; per-zone / per-region latitude and
longitude time zones; per-actor locale subsystem; a second celestial
profile (Narnia / fey realm); weather; academic calendar; NPC
schedules / routines; admin verbs for `setScale`/`pause`/`resume`; a
best-effort crash snapshot on `uncaughtException`.

## Design → implementation notes (load-bearing shifts)

- **World config is module constants, not settings (R8).** The slate/
  requirements framed `scale` / geography as `world.*` settings;
  `resolveSetting` can't resolve those in the clock's consumption
  contexts, so they're constants. `Avatar.ts` is untouched.
- **Celestial year reconciled to 360 days (D7)** — aligns seasons with
  the calendar; the slate's 365.25 was dropped.
- **Fixed-string id won't upsert** — Mongo rejects `ObjectId('world-clock')`,
  so the singleton is a `find({})` row, not a pinned `_id`.
- **Lifecycle ownership moved to the backend layer** (MR review):
  `WorldClockApi.boot()` / `shutdown()` called from `AppBootstrap`, not
  inlined into `AppBootstrap.run`'s tail or `Server.ts`.
- **`solar.ts` folded into `CelestialApi`** (MR review) — a static-only
  function module isn't a value-object class; it belongs on the Api.
- **`boot`/`shutdown` `SystemRoot`-gated** (MR review) — they were
  public; now only the empty-stack process boundary can call them.
