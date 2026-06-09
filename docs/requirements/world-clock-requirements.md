# World clock — requirements (one build cycle)

Formal, closed scope for the world-time substrate build. Graduates
[docs/slates/world-clock-slate.md](../slates/world-clock-slate.md).
The slate stays as the open-ended design surface; this doc is what
**this build ships**.

## Build context

- **Branch**: `world-clock`, based on `master`.
- **Hard constraint — conflict-free with the social/group build.**
  A sibling build (emotes / comms / grouping / recognition /
  social-graph) runs on the `perception` branch and churns
  `lib/perception/*`, `lib/description/*`, `lib/message/*`,
  `lib/biome/SkyExposed.ts`, `config/quantity-tags.yaml`, and the
  comms/emote command verbs. **This build does not touch any of
  those files.** Everything here is net-new or in dirs the sibling
  doesn't edit (`api/scheduler.ts`, `services/Server.ts`,
  `bootstrap.ts` are all clear; additions to `bootstrap.ts` /
  `cmd/analyze.yaml` are append-only and trivially mergeable).

## Scope decisions (ratified)

These were the open leans in the slate; they are now decided. The
two marked **⚠ confirm** are load-bearing enough that the user
should redline them before planning.

| # | Decision | Choice |
|---|---|---|
| D1 | Time/real-clock relationship | **Own-thing.** Game time advances only while the server is up; pauses at shutdown; resumes from `elapsedGameTime` on restart. Scheduled events are deferred-not-skipped across downtime. |
| D2 | Default scale | **12×** (2 real hours = 1 game day). Default is a **module constant**; the live value is clock state (persisted in `WorldClockState`), changed at runtime via `setScale()` (author `eval` in v1; admin verb later). **Not** an EnvironmentMixin setting — `resolveSetting` can't resolve a `world.*` setting at startup or with a `Location` host (no global schema registry; see plan §2.5/R8). |
| D3 | Clock-state persistence home | **`Document` track, not Stuff.** `WorldClockState extends Document` in a `world_state` collection. There is no automatic Stuff persistence (`Avatar.save()` is the only persist-back path in the codebase), and clock state is meta/config, not a game entity. |
| D4 | Time unit | **`Quantity<'s'>`** — the `'s'`/`'ms'` units already exist (`lib/quantity.ts:45`). No new unit. Friendly tags (`morning`/`midnight`) **deferred** (would touch `config/quantity-tags.yaml`, a sibling-contested file; not needed for v1). |
| D5 ⚠ confirm | Activity time-base | **Activities move onto the game-time axis.** `SchedulerApi` reads `WorldClockApi.getNow()` (not `Date.now()`), and its completion/emission timers are driven by the world clock rather than raw Node timers. **Consequence: pausing the clock pauses in-flight activities; `scale` speeds them up** (a 3 game-second swing at 12× completes in ~250 ms real). This is the coherent single-time-authority design; the alternative (read game-time but fire on real timers) desyncs on pause. If activity *feel* later needs decoupling, that's a separate per-activity time-base knob — out of scope here. |
| D6 ⚠ confirm | Celestial → light wiring | **Deferred this cycle.** Wave 2 ships the celestial *compute* substrate (day/night, sun position, season, moon phase) as a queryable API. It does **not** wire sun position into `lib/perception/AmbientLit.ts` / `lib/biome/SkyExposed.ts` — those are sibling-contested. Ambient-light derivation becomes a follow-up once the perception branch merges. |
| D7 | Celestial year vs calendar year | **Reconciled to 360 days.** The Earth-like celestial profile uses a **360-day orbital year** (not the slate's 365.25) so seasons align cleanly with the 360-day DefaultCalendar (season N = months 3N−2…3N). Axial tilt 23.5°, 24-hour rotation (86 400 game-seconds), one sun, one moon. |
| D8 | Handle naming | The world-clock schedule handle is **`ClockHandle`** (distinct from the existing `ScheduleApi.ScheduleHandle = {id}`, which is real-time). |

---

## Layer 1 — Time axis (Wave 1)

### `WorldClockApi` (new, `api/worldclock.ts`)

Static Api, module-private state, `SecurityApi.decorateApiClass`.
Justified as substrate: a single global time authority consumed
everywhere (precedent: `ScheduleApi`, `SchedulerApi`,
`PerceptionApi`). Static `#`-private slots are permitted on Api
classes.

**Core queries / control**

```ts
static getNow(): Quantity<'s'>;     // current game-time (s since epoch)
static getScale(): number;
static setScale(scale: number): void;   // re-anchors; admin
static pause(): void;
static resume(): void;
static isPaused(): boolean;
```

`getNow()` while running is computed from an in-memory anchor
`(anchorGameTimeS, anchorRealMs)`:
`now = anchorGameTimeS + (realNowMs − anchorRealMs)/1000 × scale`.
`setScale` / `pause` / `resume` re-anchor (capture current `getNow()`
into `anchorGameTimeS`, reset `anchorRealMs`). Pause freezes by
clearing the real anchor; `getNow()` returns the frozen value.

**Persistence (own-thing model)**

```ts
static snapshot(): WorldClockSnapshot;   // { elapsedGameTimeS, scale, lastShutdownRealMs }
static restore(snap: WorldClockSnapshot): void;
```

- `WorldClockState extends Document`, `static collectionName =
  'world_state'`, `static persistentFields = ['elapsedGameTimeS',
  'scale', 'lastShutdownRealMs']`, fixed id (`'world-clock'`).
- **Startup restore**: `AppBootstrap.run()` gains a step (after
  `BootstrapManager.run()`) that loads the `WorldClockState`
  singleton (or seeds a fresh one) and calls
  `WorldClockApi.restore(...)`, which sets `anchorGameTimeS =
  elapsedGameTimeS` and anchors to current real time.
- **Shutdown snapshot**: `Server.stop()` gains a step (it currently
  has **no** persistence hook) that calls `WorldClockApi.snapshot()`
  and writes the `WorldClockState`. `lastShutdownRealMs = Date.now()`
  is admin/debug only, not load-bearing for the math.
- **Crash backstop**: a periodic `ScheduleApi.recurring`
  (attribution off, fixed-delay; interval = a module constant
  `SNAPSHOT_INTERVAL_MS = 5 min`, not a setting — no resolvable host
  at boot) writes the snapshot so an ungraceful exit loses at most
  one interval. (`uncaughtException` / `unhandledRejection` go
  straight to `process.exit(1)` with no graceful stop — the backstop
  covers that.)

### Scheduling primitives (transient, in-memory only)

```ts
static after(delay: Quantity<'s'> | string, cb: ClockCallback, opts?: ScheduleOpts): ClockHandle;
static at(deadline: Quantity<'s'>, cb: ClockCallback, opts?: ScheduleOpts): ClockHandle;
static every(interval: Quantity<'s'> | string, cb: ClockCallback,
             opts?: ScheduleOpts & { startAt?: Quantity<'s'>; runs?: number }): ClockHandle;
static cancel(handle: ClockHandle): void;
static cancelByTag(tag: string, host?: Stuff): number;
static cancelByHost(host: Stuff): number;

type ClockCallback = (handle: ClockHandle) => void;
interface ScheduleOpts { host?: Stuff; tag?: string; }
interface ClockHandle {
  readonly id: string;
  readonly nextFireAt: Quantity<'s'> | null;  // null if cancelled/expired
  readonly fireCount: number;
  cancel(): void;
}
```

- **String durations** (`'5 minutes'`, `'3 days'`) parse into
  `Quantity<'s'>` via the game-time conventions (calendar-free:
  minute = 60 s, hour = 3600 s, day = 86 400 s).
- **One real-time heartbeat** drives the whole game-time scheduler:
  `WorldClockApi` keeps a deadline-ordered registry and a single
  `ScheduleApi.recurring`/`setTimeout`-armed tick that, on each fire,
  advances game-time and runs every schedule whose `nextFireAt ≤
  getNow()`. Paused ⇒ no advancement, nothing fires. Re-anchoring on
  `setScale` re-arms the next real-time wake. (Exact tick vs.
  next-deadline-arm is the planner's call; the contract is "fires in
  game-time, respects pause/scale.")
- **`onDate` / `cron` are Wave 3** (need the calendar). Astronomical
  shortcuts are Wave 2 (need the profile).

### Scheduling model: never persisted

**Schedules are pure runtime state. The clock never persists them.**
Pattern: **persist state, not schedules.** A Stuff that wants to fire
later stores the deadline as a persistent field and re-establishes
the schedule in `postRegister`; it owns the missed-event semantics
(fire-immediately / skip / log-and-reschedule). Ad-hoc one-shots from
a controller are transient by design — lost on restart unless a Stuff
owns the deadline. Document this pattern (with the dragon-egg example)
in the subsystem doc at sweep.

- Host-scoped schedules auto-cancel when the host destructs
  (`opts.host` → subscribe `Events.StuffDestructed`, same hook
  `SchedulerApi` already uses).
- Hot-reload story is free: clone-replace destructs the old clone
  (cancels its host schedules); the new clone re-establishes in
  `postRegister`.

### Activity scheduler refactor (per D5)

- `SchedulerApi` (`api/scheduler.ts`) reads game-time via
  `WorldClockApi.getNow()` in place of `Date.now()` (`:751` and the
  test setups). `Engagement.startedAt` becomes a game-time value.
- Completion (`DurativeActivity.duration`) and emission cadence
  (`ScheduledEmission`) are scheduled through the world clock
  (`after` / `every`) rather than raw `setTimeout` / `setInterval`,
  so pause/scale apply uniformly. Durations are interpreted as
  **game-time**.
- Keep the existing 100 ms duration floor + wire-silent
  `completed-sync` behavior (measured in game-time now). Keep
  host-destruction cancellation.
- Update `lib/activity/__tests__/*` to drive game-time via a test
  seam on `WorldClockApi` (settable now / manual tick) instead of
  `Date.now()`.

---

## Layer 2 — Celestial profile (Wave 2)

### Shape + Earth-like default (`lib/time/`)

```ts
interface CelestialProfile {
  dayLengthSeconds: number;             // one rotation; Earth-like = 86_400
  yearLengthDays: number;               // orbit; Earth-like = 360 (per D7)
  axialTiltDegrees: Quantity<'degrees'>;// 23.5
  suns: SunDef[];                       // Earth-like: 1
  moons: MoonDef[];                     // Earth-like: 1, synodic period 30 days
}
```

- `degrees` unit: if not already in the `Unit` union, add it (it's
  in net-new territory; `axialTilt`/altitude/azimuth all want it).
  Confirm during planning; fall back to plain `number` degrees if a
  new unit is heavier than warranted.
- v1 ships **one** profile, `EARTH_LIKE`, as a constant in
  `CelestialApi`. Moon synodic period = **30 days** (one calendar
  month) so a full moon lands once per month — clean flavor, still
  real math.

### `CelestialApi` (new, `api/celestial.ts`)

```ts
static profileFor(location: Stuff): CelestialProfile;
static isDayAt(location: Stuff, time?: Quantity<'s'>): boolean;     // sunAltitude > 0
static sunAltitude(location: Stuff, time?: Quantity<'s'>): Quantity<'degrees'>;
static sunAzimuth(location: Stuff, time?: Quantity<'s'>): Quantity<'degrees'>;
static currentSeason(location: Stuff, time?: Quantity<'s'>): Season;
static nextSunrise(location: Stuff, time?: Quantity<'s'>): Quantity<'s'>;
static nextSunset(location: Stuff, time?: Quantity<'s'>): Quantity<'s'>;
static nextFullMoon(time?: Quantity<'s'>): Quantity<'s'>;
// astronomical scheduling shortcuts — compute deadline, hand to WorldClockApi.at()
static atNextSunrise(location: Stuff, cb: ClockCallback, opts?: ScheduleOpts): ClockHandle;
static atNextSunset(location: Stuff, cb: ClockCallback, opts?: ScheduleOpts): ClockHandle;
static atNextFullMoon(cb: ClockCallback, opts?: ScheduleOpts): ClockHandle;
```

- **Profile resolution** uses the existing zone inheritance surface:
  `zone.lookupField<CelestialProfile>('celestialProfile')` walking
  enclosing `SpatialZone` → ancestors (FolderZones participate per
  `ZoneApi.getEnclosingZone`), with the `EARTH_LIKE` constant as the
  universe fallback. **No per-zone authoring is required for v1** —
  the constant default covers the whole campus; the per-zone override
  path is supported but only exercised when a second profile (Narnia,
  fey realm) lands. (This avoids editing `SpatialZone` itself; if a
  `celestialProfile` field declaration is needed for the lookup to
  resolve, add it additively to the `Zone`/`SpatialZone` field
  surface — `lib/zone/` is not sibling-contested.)
- **Solar geometry is real** (the pedagogical seam): declination
  `δ = axialTilt × sin(2π · dayOfYear / yearLength)`; altitude/azimuth
  from `δ`, latitude, and hour angle by the standard formulas. An
  astronomy student comparing engine output to textbook values must
  get a match. Latitude/longitude from the constants below.
- `Season` = `spring | summer | fall | winter`, from day-of-year
  quarter (spring at vernal equinox = day 0 = Arienle 1).

### Geography config — module constants (not settings)

- `CAMPUS_LATITUDE` = **42** (°N), `CAMPUS_LONGITUDE` = **0** (°E) —
  module constants in `CelestialApi`, **not** EnvironmentMixin
  settings. `CelestialApi` reads them with a `Location` host, and
  `resolveSetting` only resolves defaults on the host's *own*
  prototype chain (no global registry) — so a `world.geography.*`
  setting would be a dead, unresolvable value (plan §2.5/R8).
  Latitude is per-location-capable in principle but a single campus
  constant for v1; promote to a per-zone field or a real
  universe-host setting when a second region lands.

---

## Layer 3 — Calendar (Wave 3)

### `Calendar` interface + `DefaultCalendar` default (`lib/time/`)

```ts
interface Calendar {
  decompose(t: Quantity<'s'>): CalendarDate;     // time → {year,month,day,weekday,hour,min,sec}
  compose(date: CalendarDate): Quantity<'s'>;     // date → time (authoring / parse)
  formatDate(t: Quantity<'s'>, format?: string): string;
  parseDate(input: string, format?: string): Quantity<'s'>;
  monthNames: string[];
  weekdayNames: string[];
  hoursPerDay: number;     // 24
  daysPerMonth: number[];  // [30 × 12]
  daysPerWeek: number;     // 7
}
```

**DefaultCalendar — concrete spec (from slate):**

- 360 days/year = 12 months × 30 days; 4 seasons × 90 days; 7-day
  weeks; 24-hour days; **no leap years**.
- Weekday-of-date drifts (30 mod 7 = 2; 360 mod 7 = 3) — this is a
  feature, not a bug; tests assert the drift.
- **Months** (in order): Arienle, Teliminus, Lorien, Ysaril,
  Karmina, Heliune, Brendarn, Ingot, Alystos, Gettrellyn, Rozgayn,
  Blayhrr. (`Heliune`, `Brendarn` provisional — swappable.)
- **Weekdays**: Oneday … Sevenday (ordinal placeholders; week starts
  Oneday).
- **Epoch**: game-time `t = 0` ⇒ `{year:1, month:Arienle, day:1,
  weekday:Oneday, 00:00:00}`. A flavor year-offset (the slate's
  "1247") is a calendar constant, not load-bearing.
- `decompose`/`compose` round-trip exactly; `compose` is the basis
  for `WorldClockApi.onDate` and `cron`.

### Calendar-aware scheduling on `WorldClockApi`

```ts
static onDate(date: CalendarDate | string, cb: ClockCallback,
              opts?: ScheduleOpts & { calendar?: Calendar }): ClockHandle;
static cron(pattern: CronPattern, cb: ClockCallback,
            opts?: ScheduleOpts & { calendar?: Calendar }): ClockHandle;

interface CronPattern { weekday?: number|string; monthday?: number;
                        month?: number|string; hour?: number; minute?: number; }
```

Both translate calendar patterns → absolute game-time deadlines via
the calendar's `compose`, then ride the Wave-1 `at`/`every`
machinery. System-scope recurring schedules (festival, daily market
reset) register in a universe-level init hook at startup.

### Multi-calendar / locale (v1 minimum)

- Substrate supports multiple `Calendar` instances on one time axis
  (cross-calendar conversion is "ask the target calendar to
  decompose the shared time"). v1 **ships only `DefaultCalendar`**.
- Locale selection (`actor.getLocale().calendar` → zone default →
  universe default) is **stubbed to the universe default** for v1;
  the full locale subsystem is future work.

---

## Wave 4 — Pedagogical surface

### Instruments (`obj/instrument/`, precedent: `Thermometer`)

| Instrument | Verb | Reveals |
|---|---|---|
| `Sundial` | `measure shadow` | solar elevation / azimuth here |
| `Sextant` | `measure altitude <sun\|moon>` | real angular measurement |

- `measure shadow` / `measure altitude` are **new subcommands** added
  to `cmd/measure.yaml` (append-only) with controllers in
  `obj/command/` (precedent: `MeasureHumidityController` — validate
  instrument in hand → resolve scope → read via `CelestialApi` →
  format `Quantity` → `MessageApi.scene(...).toSelf(...).send()`).
- (The `Hourglass` + `flip` interval-timer was cut — it added no
  substrate coverage the other instruments + `analyze time` don't
  already exercise.)

### `analyze` verbs

- `analyze time` — game-time, scale, active calendar(s) (date in
  viewer's calendar). New subcommand in `cmd/analyze.yaml` +
  `AnalyzeTimeController`.
- `analyze sky here` — full celestial state for the location (sun
  altitude/azimuth, season, moon phase, day/night). New subcommand +
  `AnalyzeSkyController`.
- Two audiences, one engine (slate/biome precedent): casual prose by
  default, physics/astronomy-grade values on the analyze path.

---

## Module placement

| Artifact | Category | Path |
|---|---|---|
| `WorldClockApi` | Api | `api/worldclock.ts` |
| `CelestialApi` | Api | `api/celestial.ts` |
| `WorldClockState` | Document | `lib/time/WorldClockState.ts` |
| `Calendar` iface, `DefaultCalendar`, `CalendarDate` | domain | `lib/time/` |
| `CelestialProfile`, `EARTH_LIKE`, `SunDef`/`MoonDef`, `Season` | domain | `lib/time/` |
| `ClockHandle`/`ScheduleOpts`/`CronPattern` types | domain | colocated with `WorldClockApi`'s public surface (re-exported via the Api per the `api/` isolation rule) |
| `Sundial`/`Sextant` | Stuff | `obj/instrument/` |
| `Analyze{Time,Sky}Controller`, `Measure{Shadow,Altitude}Controller` | Controller | `obj/command/` |
| `measure`/`analyze` subcommand views | Command YAML | `cmd/measure.yaml`, `cmd/analyze.yaml` (append) |
| `scale` / `CAMPUS_LATITUDE` / `CAMPUS_LONGITUDE` / `SNAPSHOT_INTERVAL_MS` | module constants | on `WorldClockApi` / `CelestialApi` (NOT settings — see D2 / plan §2.5) |

`lib/time/` is a **new subsystem dir** (per the lib/-is-organized-
by-subsystem rule). No `lib/mixins/`-style dumping; no free-floating
helper modules (cross-cutting helpers live on the two Apis).

---

## Out of scope (this cycle)

- **Celestial → ambient-light wiring** (D6) — deferred until
  perception merges.
- **Friendly time tags** in `config/quantity-tags.yaml` (D4) —
  sibling-contested; not needed.
- Academic calendar; weather; NPC schedules/routines; per-actor
  locale subsystem; region/longitude time zones; second celestial
  profile (Narnia/fey); starfields/eclipses/comets; calendar
  authoring UI. (All per the slate's "does NOT cover" + future
  waves.)

---

## Acceptance criteria

1. **Advance**: with `scale = 12`, `getNow()` advances 12 game-seconds
   per real second; `setScale` re-anchors without time discontinuity.
2. **Pause/resume**: `pause()` freezes `getNow()`; `resume()`
   continues from the frozen value; no time is gained/lost across a
   pause.
3. **Persistence**: snapshot at `Server.stop()` then restore at next
   `AppBootstrap.run()` yields continuous game-time
   (`elapsedGameTimeS` preserved); a fresh DB seeds a zero clock.
4. **Deferred-not-skipped**: a `WorldClockApi.at(deadline)` whose
   host persists the deadline and re-establishes in `postRegister`
   fires (or runs its missed-event branch) after a downtime gap that
   spans the deadline — it is not silently skipped.
5. **Scheduling**: `after`/`at`/`every` fire at the right game-times;
   `cancel`/`cancelByTag`/`cancelByHost` stop them; host destruct
   auto-cancels host-scoped schedules; `ClockHandle.nextFireAt`/
   `fireCount` are accurate.
6. **Activity (D5)**: an in-flight activity's completion is delayed
   by `pause()` and accelerated by higher `scale`; sub-100 ms
   (game-time) completes synchronously and wire-silent; existing
   activity tests pass against the game-time seam.
7. **Celestial**: `isDayAt`/`sunAltitude`/`sunAzimuth`/`currentSeason`
   for the Earth-like profile at 42°N match standard solar-position
   formulas within tolerance across a full 360-day year (equinox/
   solstice day-lengths correct); `nextSunrise`/`nextSunset`/
   `nextFullMoon` return correct future game-times;
   `atNextSunrise` etc. fire at them.
8. **Calendar**: `decompose`∘`compose` round-trips for arbitrary
   times; weekday drift holds (month 2 starts Threeday; new year
   shifts 3 weekdays); `formatDate`/`parseDate` round-trip;
   `onDate`/`cron` fire on the right calendar dates.
9. **Verbs/instruments**: `analyze time`, `analyze sky here`,
   `measure shadow`, `measure altitude sun` produce correct casual +
   analytical output.
10. **Conflict-freedom**: `git diff --name-only master` shows no file
    that `master..perception` also modifies (other than append-only
    `bootstrap.ts` / `cmd/*.yaml`).

## Build order (waves; commit per wave)

1. **Wave 1** — `WorldClockApi` (queries/control/persistence/
   scheduling primitives) + `WorldClockState` Document + startup/
   shutdown/backstop hooks + Activity refactor.
2. **Wave 2** — `CelestialProfile` + `EARTH_LIKE` + `CelestialApi`
   (queries + astronomical scheduling shortcuts) + geography
   constants + zone-resolution wiring. **No light integration.**
3. **Wave 3** — `Calendar` + `DefaultCalendar` + `onDate`/`cron`.
4. **Wave 4** — instruments + `analyze time`/`analyze sky here` +
   `measure shadow`/`measure altitude`.
