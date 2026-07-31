/**
 * WorldClockRegistry — singleton Idea holding world-clock state and
 * scheduling. Lives at `/obj/WorldClockRegistry`. The thin
 * `WorldClockApi` facade at `api/worldclock.ts` is the only legitimate
 * caller — every public method on this class carries
 * `@CallSecurity(FromModule('/api/worldclock#WorldClockApi'))` so
 * the security gate denies any other module's call. External code that
 * grabs the Registry instance via `StuffApi.findByTemplatePath` gets a
 * reference but `SecurityError` is thrown on any method call.
 *
 * State held here:
 *   - Anchor pair (`anchorGameTimeS`, `anchorRealMs`) + `scale` +
 *     `paused` — the math behind `getNow()` (D1 own-thing model).
 *   - Injectable real clock (`nowMs`) and test-mode flag.
 *   - `schedules` registry, the deadline-armed `heartbeat` handle, and
 *     the periodic `snapshotBackstop` handle.
 *
 * HMR-aware: reload of `api/worldclock.ts` only drops the cached
 * pointer in the Api; this Stuff's state survives. Reload of THIS file
 * re-clones the Registry (state resets, `postRegister` re-runs
 * idempotently) per HotReloadApi's pattern.
 *
 * Field privacy uses TypeScript `private` (not `#`) — instance methods
 * dispatch through the call-security proxy, and `#`-private slots
 * aren't reachable through the proxy receiver. The lock here comes
 * from the `@CallSecurity` decorator on every public method, plus the
 * Inter-Stuff Contract (only methods are external surface).
 */

import { SecurityApi } from '../api/security';
import { Idea } from '../lib/stuff/Idea';
import type { VetoResult } from '../lib/errors';
import type { EvictionContext } from '../lib/stuff/Stuff';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';
import type { Stuff } from '../lib/stuff/Stuff';
import { Quantity } from '../lib/quantity';
import type { Calendar, CalendarDate } from '../lib/time/Calendar';
import { DefaultCalendar } from '../lib/time/DefaultCalendar';
import { WorldClockState } from '../lib/time/WorldClockState';
import { ScheduleApi, type ScheduleHandle } from '../api/schedule';
import {
  ExecutionContextApi,
  OMNI_SCOPE,
} from '../api/execution-context';
import { EventApi, type Subscription } from '../api/event';
import { Events } from '../lib/events';
import type {
  ClockCallback,
  ClockHandle,
  CronPattern,
  ScheduleOpts,
  WorldClockSnapshot,
} from '../api/worldclock';
import { WorldClockApi } from '../api/worldclock';
import { WeatherApi } from '../api/weather';
import { FireApi } from '../api/fire';
import { WEATHER_DEFAULTS } from '../lib/weather/WeatherType';

/**
 * Gate every public Registry method to the Api facade, the
 * `WorldClockLogic` singleton (caller template path `/obj/api/worldclock`,
 * which actually forwards every call), OR an internal `this.foo()` call
 * from within the Registry itself. The proxy intercepts ALL method
 * dispatches (including `this`-calls inside method bodies), so a method
 * like `boot()` that delegates to `this.restore(...)` would otherwise
 * be denied — caller and target are both this Registry's proxy on
 * internal calls, which `SelfOnly` permits.
 */
const WorldClockApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/worldclock#WorldClockApi'),
  SecurityPolicies.FromTemplate('/obj/api/worldclock'),
  SecurityPolicies.SelfOnly,
);

const MS_PER_SECOND = 1000;

/** See `WorldClockApi`'s explanation — fractional second-drift tolerance. */
const FIRE_EPSILON_S = 1e-9;

const DURATION_UNITS: Record<string, number> = {
  second: 1,
  minute: 60,
  hour: 3600,
  day: 86_400,
};

interface Schedule {
  id: string;
  nextFireAtS: number | null; // null = cancelled / expired
  intervalS: number | null; // null = one-shot
  remainingRuns: number | null; // null = unbounded
  fireCount: number;
  cb: ClockCallback;
  host: Stuff | null;
  tag: string | null;
  hostSub: Subscription<unknown> | null;
  handle: ClockHandle;
  /**
   * Circle scope captured at registration. The heartbeat runs under an
   * omni maintenance root; a scoped schedule's callback is re-rooted
   * under its birth scope so circle-registered clock work stays
   * governed by the containment layers (the ScheduleApi precedent).
   * `null` for every field/system registration — no extra work.
   */
  birthScope: string | null;
}

export default class WorldClockRegistry extends Idea {

  /**
   * Residency veto - a load-bearing process-lifetime singleton is
   * never culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }
  /* ─── anchor state ─── */
  private anchorGameTimeS = 0;
  private anchorRealMs = 0;
  private scale = WorldClockApi.DEFAULT_SCALE;
  private paused = false;
  /** Injectable real clock — every real-clock read goes through this. */
  private nowMs: () => number = Date.now;
  /** Suppress live heartbeat; tests drive `onHeartbeat` manually. */
  private testMode = false;

  /* ─── scheduler state ─── */
  private schedules: Map<string, Schedule> = new Map();
  private heartbeat: ScheduleHandle | null = null;
  private snapshotBackstop: ScheduleHandle | null = null;

  /* ────────────── core queries / control ────────────── */

  @CallSecurity(WorldClockApiCallers)
  public getNow(): Quantity<'s'> {
    return Quantity.of(this.currentGameSeconds(), 's');
  }

  @CallSecurity(WorldClockApiCallers)
  public getScale(): number {
    return this.scale;
  }

  @CallSecurity(WorldClockApiCallers)
  public setScale(scale: number): void {
    if (typeof scale !== 'number' || !Number.isFinite(scale) || scale <= 0) {
      throw new TypeError(
        `WorldClockApi.setScale: scale must be a positive finite number, got ${String(scale)}`,
      );
    }
    this.reanchor();
    this.scale = scale;
    this.rearmHeartbeat();
  }

  @CallSecurity(WorldClockApiCallers)
  public pauseClock(): void {
    if (this.paused) return;
    this.reanchor();
    this.paused = true;
    this.disarmHeartbeat();
  }

  @CallSecurity(WorldClockApiCallers)
  public resumeClock(): void {
    if (!this.paused) return;
    // Resume from the frozen value exactly — re-anchor real time
    // without advancing game time (AC2).
    this.anchorRealMs = this.nowMs();
    this.paused = false;
    this.rearmHeartbeat();
  }

  @CallSecurity(WorldClockApiCallers)
  public isPaused(): boolean {
    return this.paused;
  }

  /* ─── persistence (own-thing model) ─── */

  @CallSecurity(WorldClockApiCallers)
  public snapshot(): WorldClockSnapshot {
    return {
      elapsedGameTimeS: this.currentGameSeconds(),
      scale: this.scale,
      lastShutdownRealMs: this.nowMs(),
    };
  }

  @CallSecurity(WorldClockApiCallers)
  public restore(snap: WorldClockSnapshot): void {
    this.anchorGameTimeS = snap.elapsedGameTimeS;
    this.anchorRealMs = this.nowMs();
    this.scale = snap.scale;
    this.paused = false;
    // Schedules are never persisted; they start empty on a fresh boot.
  }

  /**
   * Boot the clock: restore the persisted anchor (or seed a zero clock
   * on fresh DB), start the crash backstop, register system schedules.
   */
  @CallSecurity(WorldClockApiCallers)
  public async boot(): Promise<void> {
    const state = await WorldClockState.loadOrSeed();
    this.restore({
      elapsedGameTimeS: state.elapsedGameTimeS,
      scale: state.scale,
      lastShutdownRealMs: state.lastShutdownRealMs,
    });
    this.startSnapshotBackstop();
    this.registerSystemSchedules();
    console.info(
      `WorldClockApi: restored at ${state.elapsedGameTimeS}s ` +
        `(scale ${state.scale}x)`,
    );
  }

  @CallSecurity(WorldClockApiCallers)
  public async shutdown(): Promise<void> {
    this.pauseClock();
    await this.persist();
  }

  /* ─── scheduling primitives ─── */

  @CallSecurity(WorldClockApiCallers)
  public after(
    delay: Quantity<'s'> | string,
    cb: ClockCallback,
    opts?: ScheduleOpts,
  ): ClockHandle {
    const delayS = this.parseDelayToSeconds(delay);
    return this.makeSchedule({
      nextFireAtS: this.currentGameSeconds() + delayS,
      intervalS: null,
      remainingRuns: null,
      cb,
      opts,
    });
  }

  @CallSecurity(WorldClockApiCallers)
  public at(
    deadline: Quantity<'s'>,
    cb: ClockCallback,
    opts?: ScheduleOpts,
  ): ClockHandle {
    return this.makeSchedule({
      nextFireAtS: deadline.rawValue(),
      intervalS: null,
      remainingRuns: null,
      cb,
      opts,
    });
  }

  @CallSecurity(WorldClockApiCallers)
  public every(
    interval: Quantity<'s'> | string,
    cb: ClockCallback,
    opts?: ScheduleOpts & { startAt?: Quantity<'s'>; runs?: number },
  ): ClockHandle {
    const intervalS = this.parseDelayToSeconds(interval);
    if (intervalS <= 0) {
      throw new RangeError(
        `WorldClockApi.every: interval must be a positive game-time, got ${intervalS}s`,
      );
    }
    const startAtS =
      opts?.startAt?.rawValue() ?? this.currentGameSeconds() + intervalS;
    return this.makeSchedule({
      nextFireAtS: startAtS,
      intervalS,
      remainingRuns: opts?.runs ?? null,
      cb,
      opts,
    });
  }

  @CallSecurity(WorldClockApiCallers)
  public cancelByTag(tag: string, host?: Stuff): number {
    let count = 0;
    for (const s of [...this.schedules.values()]) {
      if (s.tag !== tag) continue;
      if (host && !this.sameHost(s.host, host)) continue;
      this.cancelInternal(s);
      count++;
    }
    return count;
  }

  @CallSecurity(WorldClockApiCallers)
  public cancelByHost(host: Stuff): number {
    let count = 0;
    for (const s of [...this.schedules.values()]) {
      if (!this.sameHost(s.host, host)) continue;
      this.cancelInternal(s);
      count++;
    }
    return count;
  }

  /* ─── calendar-aware scheduling ─── */

  @CallSecurity(WorldClockApiCallers)
  public onDate(
    date: CalendarDate | string,
    cb: ClockCallback,
    opts?: ScheduleOpts & { calendar?: Calendar },
  ): ClockHandle {
    const calendar = opts?.calendar ?? DefaultCalendar.singleton();
    const deadline =
      typeof date === 'string'
        ? calendar.parseDate(date)
        : calendar.compose(date);
    return this.at(deadline, cb, opts);
  }

  @CallSecurity(WorldClockApiCallers)
  public cron(
    pattern: CronPattern,
    cb: ClockCallback,
    opts?: ScheduleOpts & { calendar?: Calendar },
  ): ClockHandle {
    const calendar = opts?.calendar ?? DefaultCalendar.singleton();
    let cancelled = false;
    let inner: ClockHandle | null = null;
    let fireCount = 0;

    const wrapper: ClockHandle = {
      id: SecurityApi.uuid(),
      get nextFireAt(): Quantity<'s'> | null {
        return inner ? inner.nextFireAt : null;
      },
      get fireCount(): number {
        return fireCount;
      },
      cancel(): void {
        cancelled = true;
        if (inner) inner.cancel();
        inner = null;
      },
    };

    const arm = (fromT: number): void => {
      if (cancelled) return;
      const nextT = this.nextCronMatch(pattern, fromT, calendar);
      if (nextT === null) return;
      inner = this.at(
        Quantity.of(nextT, 's'),
        () => {
          fireCount++;
          cb(wrapper);
          if (!cancelled) arm(nextT);
        },
        opts,
      );
    };

    arm(this.currentGameSeconds());
    return wrapper;
  }

  /* ─── test seams ─── */

  @CallSecurity(WorldClockApiCallers)
  public _setNowProvider(fn: () => number): void {
    this.testMode = true;
    this.disarmHeartbeat();
    this.nowMs = fn;
  }

  @CallSecurity(WorldClockApiCallers)
  public _resetForTesting(): void {
    for (const s of [...this.schedules.values()]) {
      if (s.hostSub) {
        try {
          s.hostSub.unsubscribe();
        } catch {
          // ignore — test seam
        }
      }
    }
    this.schedules.clear();
    this.disarmHeartbeat();
    if (this.snapshotBackstop) {
      ScheduleApi.cancel(this.snapshotBackstop);
      this.snapshotBackstop = null;
    }
    this.testMode = true;
    this.nowMs = () => 0;
    this.anchorGameTimeS = 0;
    this.anchorRealMs = 0;
    this.scale = WorldClockApi.DEFAULT_SCALE;
    this.paused = false;
  }

  @CallSecurity(WorldClockApiCallers)
  public _advanceForTesting(realMs: number): void {
    const target = this.nowMs() + realMs;
    this.nowMs = () => target;
    let guard = 0;
    for (;;) {
      if (this.paused) break;
      const now = this.currentGameSeconds();
      const deadline = now + FIRE_EPSILON_S;
      const anyDue = [...this.schedules.values()].some(
        (s) => s.nextFireAtS !== null && s.nextFireAtS <= deadline,
      );
      if (!anyDue) break;
      this.onHeartbeat();
      if (++guard > 1_000_000) {
        throw new Error(
          'WorldClockApi._advanceForTesting: heartbeat did not settle ' +
            '(runaway schedule?)',
        );
      }
    }
  }

  /* ────────────── internal helpers ────────────── */

  private currentGameSeconds(): number {
    if (this.paused) return this.anchorGameTimeS;
    const realDeltaMs = this.nowMs() - this.anchorRealMs;
    return (
      this.anchorGameTimeS + (realDeltaMs / MS_PER_SECOND) * this.scale
    );
  }

  private reanchor(): void {
    this.anchorGameTimeS = this.currentGameSeconds();
    this.anchorRealMs = this.nowMs();
  }

  private async persist(): Promise<void> {
    const snap = this.snapshot();
    const state = await WorldClockState.loadOrSeed();
    state.elapsedGameTimeS = snap.elapsedGameTimeS;
    state.scale = snap.scale;
    state.lastShutdownRealMs = snap.lastShutdownRealMs;
    await state.save();
  }

  private startSnapshotBackstop(): void {
    if (this.snapshotBackstop) return;
    this.snapshotBackstop = ScheduleApi.recurring(
      WorldClockApi.SNAPSHOT_INTERVAL_MS,
      () => {
        void this.persist().catch((err) => {
          console.error('WorldClockApi: backstop snapshot failed:', err);
        });
      },
      { propagateAttribution: false, mode: 'fixed-delay' },
    );
  }

  private registerSystemSchedules(): void {
    // Weather segment-boundary coupling (D4). At each segment boundary
    // weather fires a presence-gated restamp fan-out over occupied
    // SkyExposed rooms so thermal's cached ambient picks up the new
    // weather (cache invalidation, not a simulation tick — no weather
    // state is stored or advanced). The scheduler owns the handle;
    // weather holds nothing. Computing the first boundary forces the
    // WeatherLogic singleton into existence (the "weather configured"
    // signal), and the callback targets the stable WeatherApi.onBoundary
    // facade so it survives WeatherLogic HMR. `every` re-arms against
    // pause/scale internally; the boundary is recomputed from game-time
    // on every boot, never persisted.
    const nextBoundary = WeatherApi.nextBoundaryAfter(this.getNow());
    this.every(
      Quantity.of(WEATHER_DEFAULTS.SEGMENT_LENGTH_S, 's'),
      () => WeatherApi.onBoundary(),
      { startAt: nextBoundary, tag: 'weather:boundary' },
    );

    // Storm lightning strikes (Wave 2). A sub-segment recurring tick fires
    // the presence-gated strike fan-out: occupied SkyExposed `storm` scopes
    // roll `storm.strikeRate` and, on a hit, take an ambient strike routed
    // through ElectricityApi.conduct. Scheduler owns the handle; weather
    // holds nothing (no stored strike state) — the callback recomputes from
    // game-time. The interval is the `storm.strikeIntervalS` dial.
    const strikeInterval = WeatherApi.strikeIntervalSeconds();
    this.every(
      Quantity.of(strikeInterval, 's'),
      () => WeatherApi.onStormTick(),
      {
        startAt: Quantity.of(this.getNow().rawValue() + strikeInterval, 's'),
        tag: 'weather:strike',
      },
    );

    // Fire spread (the combustion driver). A presence-gated recurring tick
    // fires the fan-out over occupied scopes: each burning object drains its
    // fuel + radiates heat to co-located combustibles and through OPEN
    // boundaries (a closed door is a firebreak), igniting any that cross their
    // ignition point. An unwatched fire freezes (zero work in empty rooms).
    // Scheduler owns the handle; fire holds nothing (Burning state lives on
    // the objects). The interval is the `fire.tickIntervalSeconds` dial.
    const fireInterval = FireApi.fireTickIntervalSeconds();
    this.every(Quantity.of(fireInterval, 's'), () => FireApi.onFireTick(), {
      startAt: Quantity.of(this.getNow().rawValue() + fireInterval, 's'),
      tag: 'fire:tick',
    });
  }

  private parseDelayToSeconds(d: Quantity<'s'> | string): number {
    if (typeof d !== 'string') return d.rawValue();
    const m = /^\s*(\d+(?:\.\d+)?)\s*(second|minute|hour|day)s?\s*$/.exec(d);
    if (!m) {
      throw new Error(
        `WorldClockApi: cannot parse duration '${d}' ` +
          `(expected e.g. '5 minutes', '3 days')`,
      );
    }
    const value = Number(m[1]);
    const unit = DURATION_UNITS[m[2] as string];
    if (unit === undefined) {
      throw new Error(`WorldClockApi: unknown duration unit in '${d}'`);
    }
    return value * unit;
  }

  private sameHost(a: Stuff | null, b: Stuff | null): boolean {
    if (!a || !b) return false;
    return a.stuffId === b.stuffId;
  }

  private makeSchedule(spec: {
    nextFireAtS: number;
    intervalS: number | null;
    remainingRuns: number | null;
    cb: ClockCallback;
    opts?: ScheduleOpts;
  }): ClockHandle {
    const id = SecurityApi.uuid();
    const registrantScope = ExecutionContextApi.getCircleScope();
    const s: Schedule = {
      id,
      nextFireAtS: spec.nextFireAtS,
      intervalS: spec.intervalS,
      remainingRuns: spec.remainingRuns,
      fireCount: 0,
      cb: spec.cb,
      host: spec.opts?.host ?? null,
      tag: spec.opts?.tag ?? null,
      hostSub: null,
      handle: null as unknown as ClockHandle,
      birthScope:
        registrantScope === OMNI_SCOPE ? null : registrantScope,
    };
    s.handle = {
      id,
      get nextFireAt(): Quantity<'s'> | null {
        return s.nextFireAtS === null ? null : Quantity.of(s.nextFireAtS, 's');
      },
      get fireCount(): number {
        return s.fireCount;
      },
      cancel: (): void => {
        this.cancelInternal(s);
      },
    };

    if (s.host) {
      const hostId = s.host.stuffId;
      s.hostSub = EventApi.on<{ stuffId: string }>(
        Events.StuffDestructed,
        (payload) => {
          if (payload.stuffId !== hostId) return;
          ExecutionContextApi.runRoot(
            WorldClockApi,
            'hostDestroyed',
            () => {
              this.cancelInternal(s);
            },
            { circleScope: OMNI_SCOPE },
          );
        },
      ) as unknown as Subscription<unknown>;
    }

    this.schedules.set(id, s);
    this.rearmHeartbeat();
    return s.handle;
  }

  private cancelInternal(s: Schedule): void {
    if (!this.schedules.has(s.id)) return;
    s.nextFireAtS = null;
    if (s.hostSub) {
      try {
        s.hostSub.unsubscribe();
      } catch (err) {
        console.error(
          `WorldClockApi: host-destruction unsubscribe threw for schedule '${s.id}'`,
          err,
        );
      }
      s.hostSub = null;
    }
    this.schedules.delete(s.id);
    this.rearmHeartbeat();
  }

  private earliestDeadline(): number | null {
    let earliest: number | null = null;
    for (const s of this.schedules.values()) {
      if (s.nextFireAtS === null) continue;
      if (earliest === null || s.nextFireAtS < earliest) {
        earliest = s.nextFireAtS;
      }
    }
    return earliest;
  }

  private disarmHeartbeat(): void {
    if (this.heartbeat) {
      ScheduleApi.cancel(this.heartbeat);
      this.heartbeat = null;
    }
  }

  private rearmHeartbeat(): void {
    this.disarmHeartbeat();
    if (this.paused) return;
    if (this.testMode) return;
    const earliest = this.earliestDeadline();
    if (earliest === null) return;
    const gameDeltaS = earliest - this.currentGameSeconds();
    const realMs = Math.max(0, (gameDeltaS / this.scale) * MS_PER_SECOND);
    this.heartbeat = ScheduleApi.schedule(
      realMs,
      () => {
        ExecutionContextApi.runRoot(
          WorldClockApi,
          'heartbeat',
          () => {
            this.onHeartbeat();
          },
          { circleScope: OMNI_SCOPE },
        );
      },
      { propagateAttribution: false },
    );
  }

  private onHeartbeat(): void {
    if (this.paused) return;
    const now = this.currentGameSeconds();
    const deadline = now + FIRE_EPSILON_S;
    const due = [...this.schedules.values()]
      .filter((s) => s.nextFireAtS !== null && s.nextFireAtS <= deadline)
      .sort((a, b) => (a.nextFireAtS as number) - (b.nextFireAtS as number));

    for (const s of due) {
      if (this.schedules.get(s.id) !== s || s.nextFireAtS === null) {
        continue;
      }
      if (s.intervalS === null) {
        s.fireCount++;
        this.invoke(s);
        if (this.schedules.get(s.id) === s) {
          this.cancelInternal(s);
        }
      } else {
        do {
          s.fireCount++;
          this.invoke(s);
          if (this.schedules.get(s.id) !== s) break;
          if (s.remainingRuns !== null) {
            s.remainingRuns--;
            if (s.remainingRuns <= 0) {
              this.cancelInternal(s);
              break;
            }
          }
          s.nextFireAtS = (s.nextFireAtS as number) + s.intervalS;
        } while (
          s.nextFireAtS !== null &&
          s.nextFireAtS <= deadline &&
          this.schedules.get(s.id) === s
        );
      }
    }

    this.rearmHeartbeat();
  }

  private invoke(s: Schedule): void {
    try {
      if (s.birthScope !== null) {
        // Circle-registered schedule: re-root the callback under its
        // birth scope so the heartbeat's omni root never launders a
        // circle continuation into system context.
        ExecutionContextApi.runRoot(
          WorldClockApi,
          'fire',
          () => s.cb(s.handle),
          { circleScope: s.birthScope },
        );
        return;
      }
      s.cb(s.handle);
    } catch (err) {
      console.error(
        `WorldClockApi: schedule '${s.id}' callback threw (continuing)`,
        err,
      );
    }
  }

  /**
   * Cancel every schedule registered from `scope`'s circle context —
   * the reap seam for circle sessions. Returns the cancel count.
   */
  public cancelAllForScope(scope: string): number {
    const doomed = [...this.schedules.values()].filter(
      (s) => s.birthScope === scope,
    );
    for (const s of doomed) this.cancelInternal(s);
    return doomed.length;
  }

  private nextCronMatch(
    pattern: CronPattern,
    fromT: number,
    calendar: Calendar,
  ): number | null {
    const weekday = this.resolveName(pattern.weekday, calendar.weekdayNames);
    const month = this.resolveName(pattern.month, calendar.monthNames, 1);
    const secondsPerDay = calendar.hoursPerDay * 3600;

    let t = Math.floor(fromT / 60) * 60 + 60;
    const limit = 2 * 366 * 24 * 60;
    for (let i = 0; i < limit; i++) {
      const d = calendar.decompose(Quantity.of(t, 's'));
      const dayStart = t - (d.hour * 3600 + d.minute * 60 + d.second);
      if (month !== undefined && d.month !== month) {
        const daysThisMonth = calendar.daysPerMonth[d.month - 1] ?? 30;
        const monthStart = dayStart - (d.day - 1) * secondsPerDay;
        t = monthStart + daysThisMonth * secondsPerDay;
        continue;
      }
      if (pattern.monthday !== undefined && d.day !== pattern.monthday) {
        t = dayStart + secondsPerDay;
        continue;
      }
      if (weekday !== undefined && d.weekday !== weekday) {
        t = dayStart + secondsPerDay;
        continue;
      }
      if (pattern.hour !== undefined && d.hour !== pattern.hour) {
        t = dayStart + (d.hour + 1) * 3600;
        continue;
      }
      if (pattern.minute !== undefined && d.minute !== pattern.minute) {
        t += 60;
        continue;
      }
      return t;
    }
    return null;
  }

  private resolveName(
    value: number | string | undefined,
    names: string[],
    base = 0,
  ): number | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'number') return value;
    const idx = names.findIndex(
      (n) => n.toLowerCase() === value.toLowerCase(),
    );
    if (idx < 0) {
      throw new Error(`WorldClockApi.cron: unknown name '${value}'`);
    }
    return idx + base;
  }
}

