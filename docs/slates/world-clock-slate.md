# World clock slate (working doc)

Working slate for the world-time substrate — the global game-time
axis, the per-region celestial profiles that derive sky-state and
day/night/seasons from that axis, and the per-culture calendars
that decompose it into named year/month/day/etc.

**Status**: requirements gathered, three-layer model proposed,
several leans documented. The upstream zone-architecture question
("where exactly does the celestial profile live?") has resolved:
**the celestial profile lives on the SpatialZone and inherits via
template-tree ancestry, with FolderZones skipped during the walk**
(per the zone-architecture slate). Implementation otherwise
deferred to a focused build session.

See also:

- [docs/slates/zone-architecture-slate.md](./zone-architecture-slate.md)
  — celestial profile lives on the spatial zone (or wherever that
  slate lands), inherits via template-tree ancestry.
- [docs/subsystems/biome.md](../subsystems/biome.md) — biomes consume
  ambient-illuminance from the celestial layer once it lands;
  `SkyExposedBiome` is the seam for "the sun matters here."
- [docs/subsystems/activity.md](../subsystems/activity.md) — activity
  scheduler currently uses `Date.now()` directly (see
  `lib/activity/__tests__/`); the world clock is its first
  consumer-refactor target.
- [docs/subsystems/quantities.md](../subsystems/quantities.md) —
  game-time is `Quantity<'seconds'>` underneath, same pattern as
  Light's lux / Sound's dB / Material's kg.
- [docs/subsystems/spatial.md](../subsystems/spatial.md) — Zone
  (and `SpatialZone`) is where celestial profiles will hang once
  the zone-architecture slate settles.

---

## Principle

Three layers, deliberately independent so they can evolve at
different paces and combine cleanly:

1. **Time axis** — monotonic, no calendar baggage, no celestial
   interpretation. One global game-time advancing at a
   configurable scale relative to real time.
2. **Celestial profile** — per-region (zone-architecture
   pending). Defines day-length, year-length, axial tilt, sun/moon
   count. Derives sky state from the underlying time. The campus
   uses an Earth-like profile; a Wonderland / Narnia zone could
   use a 4-hour-day binary-star profile; both consult the same
   underlying time axis.
3. **Calendar** — per-culture (probably carried on actors' locale
   or zone). Decomposes a game-time into `{year, month, day,
   weekday, hour, min, sec}` with named months and weekdays.
   Multiple calendars can coexist on the same time axis;
   cross-calendar conversion is automatic because they all
   decompose the same underlying time.

This split lets a single fast-cycling physical day-night cycle
coexist with a slow-cycling academic semester later, and lets
cultures with exotic calendars coexist with the default Saxonberg
calendar without conflict. It also makes "different solar systems"
a per-region setting rather than a fork in the time substrate.

---

## Layer 1 — Time axis

### Scale

Confirmed requirement: **accelerated**. Game time runs faster than
real time so players see day-night arcs within a play session
regardless of when they log in.

Lean: scale is a **runtime-tunable setting** so we can dial it by
feel. Default starting candidate: **12×** (2 real hours = 1
game day; 1 real week = 12 game weeks; 1 real 30-day month = 1
game year exactly). Pace is relaxed enough that a casual session
sees a meaningful slice of the day arc without rushing through
it. Easily changed once playtesting tells us what feels right.

The substrate should make scale a first-class parameter from day
one — every consumer reads time through the substrate, so changing
scale is a config change, not a refactor.

### Relationship to the real clock — game time as its own thing

This was the central open question on the requirements pass.
Lean: **game time advances only while the server is up.** When the
server is down, game time pauses. When it starts back up, game
time resumes where it left off.

Persistence shape (proposed): store the triple
`(elapsedGameTime, scale, lastShutdownRealTime)`. On startup,
current game-time = `elapsedGameTime`; scale resumes
accumulating. `lastShutdownRealTime` is for admin/debug only ("the
server was down from real-Tuesday to real-Friday") and is not
load-bearing for the game-time math.

Reasoning (the key tradeoff):

- **Own-thing-not-derived-from-real-clock means scheduled events
  don't silently skip when the server is down.** A dragon
  scheduled to hatch at game-day-30 hatches when the server comes
  back up, not silently-past while the server was off. Critical
  for academic-calendar / scheduled-NPC reliability later.
- **Deterministic and easy to test.** "1 real hour of uptime = X
  game time, always" is unambiguous. The derived-from-real
  alternative has a `gameTime = epoch + (now - serverStart) ×
  scale` formula that's slippery once you ask "what's epoch?"
  across restarts.
- **The "world feels alive during downtime" appeal from the
  derived model is a lie either way** — no NPCs are actually
  making decisions during downtime. The question is whether the
  lie is "the world progressed (but didn't really)" or "the world
  paused (and resumed)." The latter is more honest and easier to
  reason about.
- **Different-time-of-day-per-player works in both models.** At
  12×, a 2-hour session covers a full game day regardless of
  which model. Every player sees every phase if they play long
  enough; the only difference is what phase they log in to.

Not signed off, but the leading proposal.

### Time as a Quantity

`GameTime` is `Quantity<'seconds'>` underneath — canonical seconds
since the Saxonberg epoch. Calendar decomposition is a separate
helper that takes a game-time and a Calendar.

Same pattern as Light's lux, Sound's dB, Material's kg. Friendly
tags ("morning" / "midnight") could layer via a tag table; not
critical for v1.

### `WorldClockApi` (sketch)

```ts
class WorldClockApi {
  // Core queries
  static getNow(): Quantity<'seconds'>;            // current game-time
  static getScale(): number;                       // current accel multiplier
  static setScale(scale: number): void;            // tune live (admin)

  // Pause / resume (admin / debug)
  static pause(): void;
  static resume(): void;
  static isPaused(): boolean;

  // Persistence (called at shutdown / startup)
  static snapshot(): { elapsedGameTime, scale, lastShutdownRealTime };
  static restore(snapshot): void;

  // ---- Scheduling primitives (transient, in-memory only) ----

  // One-time, relative
  static after(
    delay: Quantity<'seconds'> | string,           // '5 minutes', '3 days'
    callback: ScheduleCallback,
    opts?: ScheduleOpts
  ): ScheduleHandle;

  // One-time, absolute game-time
  static at(
    deadline: Quantity<'seconds'>,
    callback: ScheduleCallback,
    opts?: ScheduleOpts
  ): ScheduleHandle;

  // One-time, calendar date
  static onDate(
    date: CalendarDate | string,                   // {month:'Karmina',day:15} or '15 Karmina 1247'
    callback: ScheduleCallback,
    opts?: ScheduleOpts & { calendar?: Calendar }
  ): ScheduleHandle;

  // Repeating, fixed interval
  static every(
    interval: Quantity<'seconds'> | string,
    callback: ScheduleCallback,
    opts?: ScheduleOpts & { startAt?: Quantity<'seconds'>; runs?: number }
  ): ScheduleHandle;

  // Repeating, calendar pattern (cron-like, fantasy-calendar-aware)
  static cron(
    pattern: CronPattern,
    callback: ScheduleCallback,
    opts?: ScheduleOpts & { calendar?: Calendar }
  ): ScheduleHandle;

  // Cancellation
  static cancel(handle: ScheduleHandle): void;
  static cancelByTag(tag: string, host?: Stuff): number;
  static cancelByHost(host: Stuff): number;
}

type ScheduleCallback = (handle: ScheduleHandle) => void;

interface ScheduleOpts {
  host?: Stuff;          // auto-cancel on host destruct
  tag?: string;          // grouping for bulk cancel
}

interface ScheduleHandle {
  readonly id: string;
  readonly nextFireAt: Quantity<'seconds'> | null;  // null if cancelled / expired
  readonly fireCount: number;
  cancel(): void;
}

interface CronPattern {
  weekday?: number | string;   // 'Tuesday' or numeric
  monthday?: number;           // 1–28
  month?: number | string;     // 'Karmina' or numeric
  hour?: number;               // 0–23
  minute?: number;             // 0–59
}
```

Astronomical scheduling shortcuts (`atNextSunrise`, `atNextSunset`,
`atNextFullMoon`, ...) live on `CelestialApi` (Layer 2) — they need
the per-location celestial profile to compute the deadline.

The actual time-step and dispatch logic are implementation; the
API surface above is what consumers see.

### Scheduling model: transient, never persisted

**Schedules are pure in-memory runtime state. The clock never
persists them.** This is a deliberate choice, not a limitation —
it makes the substrate dramatically simpler and pushes "what
happens if the server was down" semantics down to the domain
objects that know what to do.

The pattern: **persist state, not schedules.** If you want
something to "fire later" and survive restart, store the deadline
as a persistent field on a Stuff, and re-establish the schedule
in that Stuff's `postRegister` hook. The Stuff owns both the
trigger condition and the registration logic.

Example: a dragon egg that hatches at a future game-time.

```ts
class DragonEgg extends Thing {
  protected _hatchAt: Quantity<'seconds'> | null = null;
  static persistentFields = ['_hatchAt'];

  postRegister() {
    super.postRegister();
    if (this._hatchAt === null) return;
    const now = WorldClockApi.getNow();
    if (this._hatchAt.lessThan(now)) {
      this.hatchNow();   // missed it — domain decides what that means
    } else {
      WorldClockApi.at(this._hatchAt, () => this.hatchNow(), { host: this });
    }
  }
}
```

Consequences and properties that fall out of this choice:

- **No persistence machinery in `WorldClockApi`.** No serializer
  for schedules, no marshaller for callbacks, no migration
  story when the schedule shape changes.
- **Callbacks are plain functions.** Closures, no
  serialization-friendly `{stuff, method, args}` indirection
  needed. (Authors are free to use that shape stylistically if
  they want.)
- **Lazy loading composes for free.** A Stuff that isn't loaded
  has no live schedules. When/if it loads, its `postRegister`
  sets up whatever it needs. No "wake up the dormant schedule"
  machinery; nothing to wake.
- **Hot reload story is trivial.** Clone-replace destructs the
  old clone, which cancels its host-scoped schedules; the new
  clone re-establishes on its own `postRegister`. Same code path
  as bootstrap.
- **"Missed event" semantics live on the object, not the
  substrate.** When a Stuff comes online and re-establishes,
  it can compare the persisted deadline to the current
  game-time and decide: fire immediately (the egg hatches),
  skip silently (the patrol no longer matters), log and
  schedule the next (the festival cleric notes a missed
  ritual and queues the next one), or anything else the
  domain wants. The clock doesn't have to guess.
- **No drift question at the substrate.** "What if the server was
  down across a fire-time?" reduces to "what does
  `postRegister` do when it sees a stale deadline?" — and that's
  the author's call per object.

Ad-hoc one-shots without a Stuff host (`WorldClockApi.after(...)`
called from a controller in response to a player action) are
**transient by design**. If the server restarts before the
deadline, the callback doesn't fire. Authors who want survival
make a Stuff that owns the deadline as state.

### Activity scheduler and `WorldClockApi`

`SchedulerApi` (Activity subsystem) becomes a consumer of
`WorldClockApi`. Activity runtime state is already runtime-only
per the Activity subsystem doc, so the transient-schedule model
matches what Activity already does. The refactor is mechanical:
swap `Date.now()` for `WorldClockApi.getNow()`, swap real-time
intervals for `WorldClockApi.after()`.

System-level recurring schedules (the kingdom-wide festival on
Karmina 15, the daily market reset) get registered in a
universe-level init hook that runs once at server startup. The
init hook is the "bootstrap mechanism" for system-scope
schedules; per-Stuff schedules use `postRegister`.

---

## Layer 2 — Celestial profile

Per-region. Lives on the SpatialZone (resolved via the
zone-architecture slate). Inherits via template-tree ancestry —
FolderZones in the path participate as inheritance nodes even
though they don't anchor a coordinate frame.

```ts
interface CelestialProfile {
  dayLengthSeconds: number;          // one full rotation
  yearLengthDays: number;            // days per orbit
  axialTiltDegrees: Quantity<'degrees'>;  // for seasons / solar declination
  suns: SunDef[];                    // 0..n suns
  moons: MoonDef[];                  // 0..n moons
  // Latitude is per-location/zone, not per-profile — locations within
  // a region share a profile but can differ in latitude.
}
```

Inheritance walks template-tree ancestry per the zone-architecture
slate's resolution rule (nearest SpatialZone wins for "which
zone"; for *field-value* resolution, walk ancestors including
FolderZones until a defined value is found). `/domain/narnia/`
(an FolderZone) declares its profile once; every SpatialZone
underneath inherits it. `/domain/saxonberg-campus` (a SpatialZone)
declares Earth-like; ditto.

v1 ships one profile: realistic Earth-like (one sun, one moon,
23.5° axial tilt, 365.25-day year, 24-hour day) used as the
default. Future profiles (4-hour days, binary stars, no moons,
multiple moons) plug in without retrofit because the consumer code
asks "is it day at this location?" and the profile answers.

### Consumer surface

```ts
class CelestialApi {
  static profileFor(location: Stuff): CelestialProfile;
  static isDayAt(location: Stuff, time?: Quantity<'seconds'>): boolean;
  static sunAltitude(location: Stuff, time?: Quantity<'seconds'>): Quantity<'degrees'>;
  static sunAzimuth(location: Stuff, time?: Quantity<'seconds'>): Quantity<'degrees'>;
  static currentSeason(location: Stuff, time?: Quantity<'seconds'>): Season;
  // ... more as consumers ask
}
```

The substrate carries enough information to compute these from
first principles (solar declination from `axialTilt` and day-of-
year; altitude/azimuth from declination and latitude). Pedagogical
seam: a physics or astronomy student can compare engine output to
textbook formulas and they should match.

### "Different solar systems"

Stated requirement: "it would be interesting to have different
day/night cycles and different seasons (different solar systems?)."

Handled by per-region celestial profiles. The campus uses Earth-
like. Narnia's `/domain/narnia/` declares a different profile.
Fey realm declares yet another. Same underlying time axis; each
profile derives its own sky state.

Players crossing between realms experience the celestial
difference naturally — they exit one wardrobe in Earth-like
afternoon and emerge in Narnia at twilight under a different sun.

---

## Layer 3 — Calendar

Per-culture. The **default Saxonberg calendar** is fantasy-named
but Earth-shaped — familiar dimensions (months, weeks, days,
hours) with values picked for mathability over realism.

Different cultures can have wildly different structures (13
months, 10-day weeks, 30-hour days). Cross-calendar conversion is
automatic — they all decompose the same underlying time axis,
same way Gregorian and Hebrew calendars on Earth both decompose
the same UTC.

### The default Saxonberg calendar — concrete spec

- **360 days/year** (12 months × 30 days)
- **4 seasons** of 90 days each (3 months per season)
- **7-day weeks**
- **24-hour days**
- **No leap years** — year is a clean integer

The 30-day-month choice trades the perfect week/month alignment
of a 28-day-month calendar for richer modular arithmetic and
more calendar-flavor texture:

- **Weekday-of-date drifts.** Month 1 starts on Oneday; month 2
  starts on Threeday (30 mod 7 = 2-day shift); month 3 starts
  on Fiveday; etc. Each new year starts 3 weekdays off from
  the previous (360 mod 7 = 3). A character's birthday lands
  on a different weekday every year — flavor that mirrors how
  real birthdays feel.
- **Math is genuinely interesting.** "When's the next time my
  birthday falls on Sevenday?" is a real modular-arithmetic
  problem. Cycle length for weekday-of-date recurrence is 7
  years. Cron-pattern authors and minmaxers have to think
  about cycle alignment instead of getting it for free.
- **360 has rich factorization.** Divisors include 1, 2, 3, 4,
  5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36, 40, 45, 60, 72,
  90, 120, 180. Picks up 5 and 9 (which 336 lacks). The one
  thing it loses is 7 (and 7's multiples) — which is exactly
  the drift property above.

**Newbie-friendly variant.** Areas aimed at grade-school
students or new players can ship their own culture-specific
calendar — a clean 28-day-month / 336-day-year shape with
perfect week/month alignment — as a separate `Calendar`
instance. The multi-calendar substrate handles this naturally
(same underlying time axis, different decomposition). The
default Saxonberg calendar is deliberately the harder one.

Month roster — 10 names carried over from the user's prior game
(origin unidentified; possibly homebrew or from a smaller MUD;
Tolkien-adjacent echoes in Arienle / Lorien); 2 names provisional
(`Heliune`, `Brendarn`) matching the existing eclectic aesthetic:

| # | Season | Name |
|---|---|---|
| 1 | Spring | Arienle |
| 2 | Spring | Teliminus |
| 3 | Spring | Lorien |
| 4 | Summer | Ysaril |
| 5 | Summer | Karmina |
| 6 | Summer | Heliune |
| 7 | Fall | Brendarn |
| 8 | Fall | Ingot |
| 9 | Fall | Alystos |
| 10 | Winter | Gettrellyn |
| 11 | Winter | Rozgayn |
| 12 | Winter | Blayhrr |

Provisional names are place-holders in the same sense as the
carried-over ones — swap freely if they don't feel right.

Weekday names: ordinal placeholders shipping until a proper
naming pass — `Oneday`, `Twoday`, `Threeday`, `Fourday`,
`Fiveday`, `Sixday`, `Sevenday`. Week starts on Oneday by
convention.

```ts
interface Calendar {
  // decomposition
  decompose(gameTime: Quantity<'seconds'>): CalendarDate;
  // composition (for parsing user input, authoring)
  compose(date: CalendarDate): Quantity<'seconds'>;
  // string formatting / parsing
  formatDate(gameTime: Quantity<'seconds'>, format?: string): string;
  parseDate(input: string, format?: string): Quantity<'seconds'>;
  // metadata
  monthNames: string[];
  weekdayNames: string[];
  hoursPerDay: number;
  daysPerMonth: number[];
  daysPerWeek: number;
}
```

### Multiple calendars coexist

v1 ships:

- `SaxonbergCalendar` — the default. Earth-shaped, fantasy-named
  months and weekdays (TBD authoring).
- (Future) `DwarfClanCalendar`, `FeyCalendar`, `OrcCalendar`,
  etc. — different shapes; coexist on the same time axis.

Cross-calendar conversion is `Calendar.convert(time, fromCal,
toCal)` underneath; for casual use the convention is "ask the
relevant calendar to decompose the underlying time," not "convert
between calendars."

### "Just like any other kind of localization"

The user framed multi-calendar support as "any other kind of
localization just for fantasy realms." The slate honors that: a
character's locale (or their current zone's default) picks the
Calendar used for rendering dates. The underlying time axis is
shared; only the rendering layer cares which calendar is in use.

### Selection / locale

Tentative: the calendar used for rendering comes from
`actor.getLocale().calendar` (or similar). Falls back to the zone's
default, falls back to the universe default. Same lookup-chain
shape as other player-locale concerns (number formatting, MML
rendering). Locale subsystem itself is future work; v1 just picks
the universe default.

---

## Date math — what to expose at the casual surface

Common operations stay on the time axis (calendar-free) for
unambiguity:

- "What time is it now?" — `WorldClockApi.getNow()`
- "How long ago was X?" — subtraction on Quantity<seconds>
- "How long until Y?" — subtraction
- "In X game-hours" — addition
- "Is it after sunset right now?" — boolean from `CelestialApi`

Calendar decomposition is **one-way for most callers** (time →
date). Going the other way (date → time) requires the source
calendar named explicitly and is for authoring or parsing user
input.

Day-of-week / month-name / season queries route through the
relevant calendar / celestial profile.

What we **deliberately don't expose** at the casual surface:

- Leap-year arithmetic (the library handles it; consumers don't
  see leap years unless they explicitly ask for "is this a leap
  year").
- Cross-calendar conversion math (it works, but is `Calendar.
  convert(t, fromCal, toCal)`, not something you'd want in a hot
  path).
- Astronomical sunrise computation (available via
  `CelestialApi.nextSunrise(location, time)`, but most callers
  ask "is it day?" not "what's the sun's altitude in degrees?").
- Time-zone offsets within a celestial profile (defer to a future
  region-with-longitude slate if Saxonberg ever needs them).
- DST (fantasy world, no DST).

The split between "common, intuitive" and "available but not in
your face" is what keeps both players and devs from getting
confused. The pedagogical hook is *opt-in* — you reach for the
real math when you want it, not by accident.

---

## Pedagogical seam

The celestial profile is the natural home for the educational
hook. An astronomy student introspecting the campus can pull real
solar mechanics math (declination, equation of time, etc.) and
verify against textbook formulas.

Day-to-day gameplay stays at "is it day, is it night, is it
warm?" Instruments / verbs opt in to the real math:

| Instrument | Verb | Reveals |
|---|---|---|
| `Sundial` | `measure shadow here` | Solar elevation / azimuth |
| `Sextant` | `measure altitude of sun/moon` | Real angular measurement |
| `Hourglass` | `flip hourglass` | Game-time elapse |
| `Calendar` | `consult calendar` | Today's date in viewer's calendar |
| `analyze sky here` | (verb) | Full celestial state for the location |
| `analyze time` | (verb) | Game-time, scale, all active calendars |

The `analyze` verb pattern is established by sound-slate and
biome-slate — one verb, two audiences (casual prose default;
physics/astronomy-grade when invoked).

Same engine, different rendering paths. Cheap to implement; high
pedagogical surface. Connects directly to astronomy / earth-
sciences / physics curricula.

---

## Open questions

1. **Where exactly does the celestial profile live?** *Resolved*
   via the zone-architecture slate: lives on the SpatialZone,
   inherits via template-tree ancestry, FolderZones participate as
   inheritance nodes (no spatial grid of their own but can carry
   field defaults).

2. **Actual scale value.** Lean 12×. Worth playtesting once a
   visible day-night UI exists; could end up at 8× or 24×.
   Tunable.

3. **Time as its own thing vs derived from real clock.** Lean own
   thing (see reasoning in Layer 1). Not yet signed off.

4. **Latitude / longitude on the campus.** *Resolved (content
   decision)*: campus at **42°N, 0°E** — temperate latitude
   chosen for strong seasonal day-length variation (long summer
   days, short winter nights, meaningful solar declination
   effects); kept on the prime meridian to share a geographic
   axis with the eventual 0/0 anchor (temple / shrine / TBD
   content). Ships as `world.geography.campusLatitude = 42` and
   `world.geography.campusLongitude = 0`. Easily changed later.
   The 0/0 equator-meridian crossroads is reserved for future
   content but the substrate doesn't require anything specific
   to live there.

5. **Subscription / scheduled-event API.** *Resolved* — full
   surface sketched on `WorldClockApi`
   (`after` / `at` / `onDate` / `every` / `cron`) plus
   astronomical shortcuts on `CelestialApi`. Schedules are
   transient (never persisted); state lives on Stuff, which
   re-establishes via `postRegister`. See "Scheduling model"
   under Layer 1.

6. **Pause / freeze.** Admin command to pause the world clock?
   Lean yes for debugging / testing. Schema: setting toggle that
   `WorldClockApi.pause()` reads.

7. **Time zones / longitude variation.** Defer. Saxonberg is one
   campus + one celestial region for now. Adding regional offsets
   later is a field on the celestial profile.

8. **Academic calendar.** Out of scope for this slate. Separate
   future slate for academic calendar / class schedule / exam
   dates. Couples to learning platform integration. The
   substrate from this slate (time axis + calendars-as-
   decompositions) handles it cleanly when it lands; the
   academic calendar is just another Calendar (or set of them)
   with its own decomposition rules.

9. **"Day" units in calendars.** Some calendars might define a
   "day" as a celestial day-night cycle; others as a fixed 24
   hours. Lean: calendar's "day" is its own configurable unit
   (`hoursPerDay × secondsPerHour`); astronomical day-night is
   the celestial profile's concern, not the calendar's. They can
   match or not.

10. **Default Saxonberg calendar — naming.** Structural spec
    settled (12 × 30, 360 days/year, 4 seasons × 90 days, 7-day
    weeks with drift). Month names: 10 carried over (Arienle,
    Teliminus, Lorien, Ysaril, Karmina, Ingot, Alystos,
    Gettrellyn, Rozgayn, Blayhrr) + 2 provisional (Heliune for
    late summer, Brendarn for early fall) — swappable at any
    future naming pass. Weekday names: ordinal placeholders
    shipping (`Oneday`–`Sevenday`); proper naming pass deferred.
    Newbie-friendly 28-day-month variant calendar reserved as
    future content. Doesn't block substrate work.

11. **Time-axis epoch.** What's t=0 in game-time? Some named
    historical moment in Saxonberg lore. TBD; doesn't affect
    substrate.

12. **Pedagogical-seam locale.** Same cross-cutting concern as
    biome / sound slates — a per-player setting that toggles
    casual-prose vs real-units default rendering. Best addressed
    in a single cross-cutting slate, not here.

13. **NPC schedule reliability across server restarts.** Falls out
    of the "own thing" persistence model — scheduled NPC routines
    don't silently skip during downtime. Worth explicit testing
    when NPC behavior layer lands.

---

## Build order

User intent (this conversation): substrate first; consumers
follow.

**Wave 1** — time axis substrate + raw scheduling primitives.

- `WorldClockApi` with `getNow()`, `getScale()`, `setScale()`,
  `pause()` / `resume()`, `snapshot()` / `restore()`.
- Persistence shape: `(elapsedGameTime, scale,
  lastShutdownRealTime)`.
- Scheduling primitives that don't need calendar/celestial:
  `after`, `at`, `every`, plus `cancel` / `cancelByTag` /
  `cancelByHost`. Transient in-memory only; no schedule
  persistence in the substrate.
- Refactor Activity scheduler to consume `WorldClockApi` instead
  of `Date.now()` directly. Activity's `startedAt` and duration
  math read through the substrate.

**Wave 2** — celestial profile + Earth-like default.

- `CelestialProfile` shape + the Earth-like default.
- Per-zone resolution chain (depends on zone-architecture slate
  resolution).
- `CelestialApi.isDayAt`, `sunAltitude`, `sunAzimuth`,
  `currentSeason`.
- Astronomical scheduling shortcuts on `CelestialApi`:
  `atNextSunrise`, `atNextSunset`, `atNextFullMoon` (and small
  v1 set). Built on the Wave 1 scheduling primitives —
  compute the deadline from the profile, hand to
  `WorldClockApi.at()`.
- LightApi consumes the profile for sky-exposed locations to
  compute ambient illuminance from sun position. (Wires into
  biome-slate's `SkyExposedBiome`.)

**Wave 3** — calendar.

- `Calendar` interface + `SaxonbergCalendar` default.
- `decompose` / `compose` / `formatDate` / `parseDate`.
- Calendar-aware scheduling on `WorldClockApi`: `onDate`,
  `cron`. Built on the Wave 1 primitives + the calendar's
  compose method to translate calendar patterns into absolute
  deadlines.
- `analyze time` verb.

**Wave 4** — pedagogical surface.

- `Sundial` / `Sextant` / `Hourglass` instruments.
- `analyze sky here` verb.

**Adjacent / future**:

- Academic calendar (separate slate).
- Multi-zone / multi-time-zone support (extension to celestial
  profile).
- Custom celestial profiles for other realms (Narnia, fey
  realm, etc. — comes in with content).
- Weather subsystem consuming the celestial profile.
- Locale subsystem for per-actor calendar selection.

---

## What this slate does NOT cover

- **Academic calendar** — class schedules, exam dates, semester
  pacing. Separate future slate; couples to learning platform
  integration. The substrate here supports it cleanly when it
  lands.
- **Weather** — its own subsystem. Will consume the celestial
  profile.
- **NPC schedules / routines** — depends on this substrate but
  is its own work (NPC behavior layer is broader).
- **Region-with-longitude / time zones** — defer until Saxonberg
  needs them.
- **Authoring tooling for calendars** — UI for cultures to
  define their own. Defer.
- **Real-time astronomy simulation beyond sun/moon basics** —
  starfields, constellations, eclipses, comets. Future
  extensions to celestial profile when content asks.

---

## Once shaped into formal requirements

- `WorldClockApi` surface (queries + scheduling primitives) +
  persistence shape for clock state +
  `(elapsedGameTime, scale, lastShutdownRealTime)` triple.
  Schedules themselves are NOT persisted.
- `ScheduleHandle` / `ScheduleOpts` / `CronPattern` shapes.
- Host-scoped auto-cancel on destruct; `cancelByTag` /
  `cancelByHost` bulk operations.
- Documentation of the state-owns-deadline pattern (Stuff
  carries the deadline as a persistent field, re-establishes
  the schedule in `postRegister`).
- Activity scheduler refactor to consume `WorldClockApi`.
- `CelestialApi.atNextSunrise` / `atNextSunset` /
  `atNextFullMoon` astronomical scheduling shortcuts.
- Calendar-aware scheduling: `WorldClockApi.onDate` / `cron`
  with `CronPattern` interpretation.
- `CelestialProfile` field shape + Earth-like default values
  + per-zone resolution chain.
- `CelestialApi` surface (`isDayAt`, `sunAltitude`,
  `sunAzimuth`, `currentSeason`, `nextSunrise`).
- `Calendar` interface + `SaxonbergCalendar` (with month / weekday
  names authored).
- `analyze time` and `analyze sky here` verb shapes.
- `Sundial` / `Sextant` / `Hourglass` instrument templates.
- Universe-default settings: `world.geography.campusLatitude`
  (= 42), `world.geography.campusLongitude` (= 0),
  `world.time.scale`, `world.time.epoch`.
- Tests gating: game-time advances at scale during uptime;
  pauses at shutdown; resumes correctly on restore; scheduled
  events deferred-not-skipped across downtime gap; calendar
  decompose/compose round-trips; cross-calendar conversion
  matches; celestial computations match textbook math for the
  Earth-like profile.

Future-wave items (academic calendar, multi-zone time zones,
custom celestial profiles, weather, locale-driven calendar
selection) wait for their own slates.
