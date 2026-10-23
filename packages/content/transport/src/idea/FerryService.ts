/**
 * FerryService — ⭐ **a ferry that runs to a timetable** (river D45, W12):
 * the first mover whose trajectory is written as ROWS.
 *
 * The service is a moving thing (`MovingMixin` over a `Positioned` row on
 * the river's line, at the crossing): each game day its trajectory is
 * planned from the authored timetable — a boarding window before each
 * departure, the crossing, alongside at the far landing, the return — and
 * every one of those is a PHASE (D40), read by whoever needs it:
 *
 * - the crossing (`FerryExit`) lets a passenger board only in a boarding
 *   window at that landing, and otherwise says when the next boat goes;
 * - the ferryman's brain brings her to the departing landing for a run and
 *   takes her across at the departure time.
 *
 * Outside the timetable's hours (and out of its season) the service is
 * `on-call`: the bell rules, as it always has. A second timetabled ferry is
 * a second row — no code.
 *
 * The trajectory is the world's own (D43): re-derived from the rows and
 * the day, never persisted.
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { PositionedMixin } from '@saxonberg/server/mud/lib/expanse/Positioned';
import { MovingMixin } from '@saxonberg/server/mud/lib/expanse/Moving';
import { TrajectoryBuilder, type Trajectory } from '@saxonberg/server/mud/lib/expanse/Trajectory';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { FramePos } from '@saxonberg/server/mud/lib/expanse/Frame';

const DAY_S = 86_400;

/** The authored timetable. */
export interface FerryTimetable {
  /** Departures from the FIRST landing, `HH:MM`, in the order they run. */
  departs: string[];
  /** Minutes the crossing takes. */
  crossingMin: number;
  /** Minutes after arriving that she runs back from the far landing (0: she lies there). */
  returnAfterMin?: number;
  /** Minutes before a departure that boarding opens. */
  boardMin?: number;
  /** Days of the year (0–359) the timetable runs; outside them she is on call. */
  season?: { fromDay: number; toDay: number };
}

const PositionedService = MovingMixin(PositionedMixin(Idea));
type PositionedService = InstanceType<typeof PositionedService>;

export default class FerryService extends PositionedService {
  static fieldMeta: FieldMeta = {
    landings: { persistent: true, authorable: true },
    timetable: { persistent: true, authorable: true },
    crossingM: { persistent: true, authorable: true },
  };

  /** The two landings it runs between, by place path: the first is where the departures leave from. */
  protected landings: string[] = [];
  protected timetable: FerryTimetable | null = null;
  /** How far across the river the far landing is, m. */
  protected crossingM = 40;

  public getLandings(): string[] { return [...this.landings]; }
  public setLandings(v: string[] | null): void { this.landings = Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; }
  public getTimetable(): FerryTimetable | null { return this.timetable ? { ...this.timetable } : null; }
  public setTimetable(v: FerryTimetable | null): void { this.timetable = v ?? null; }
  public getCrossingM(): number { return this.crossingM; }
  public setCrossingM(v: number): void { this.crossingM = Math.max(1, Number(v) || 40); }

  /** The phase now: `on-call`, `boarding:<landing>`, `crossing`, `alongside:<landing>`. */
  public phaseNow(): string {
    this.planFor(this.nowS());
    return this.currentPhase() ?? 'on-call';
  }

  /** Is the timetable running now (anything but `on-call`)? */
  public isTimetabled(): boolean {
    return this.phaseNow() !== 'on-call';
  }

  /** Is the boarding window open at `landing` now? */
  public boardingAt(landing: string): boolean {
    return this.phaseNow() === `boarding:${landing}`;
  }

  /** When the next boat leaves `landing` today, game-seconds, or `null` (no more today). */
  public nextDepartureFrom(landing: string): number | null {
    const now = this.nowS();
    this.planFor(now);
    const next = this.getTrajectory()?.getMarks().find((m) => m.name === 'depart' && m.data?.from === landing && m.atS > now);
    return next?.atS ?? null;
  }

  /** The departure from `landing` that has most recently come, at or before now, or `null`. */
  public lastDepartureFrom(landing: string): number | null {
    const now = this.nowS();
    this.planFor(now);
    const due = (this.getTrajectory()?.getMarks() ?? []).filter((m) => m.name === 'depart' && m.data?.from === landing && m.atS <= now);
    return due.length > 0 ? due[due.length - 1]!.atS : null;
  }

  /** `HH:MM` for a game-second — how a timetable is read. */
  public clockWords(atS: number): string {
    const s = ((atS % DAY_S) + DAY_S) % DAY_S;
    return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
  }

  /** Where she is is read off today's trajectory — planned first, if it is not yet. */
  public override getLinePosition(): ReturnType<PositionedService['getLinePosition']> {
    if (!this._planning) this.planFor(this.nowS());
    return super.getLinePosition();
  }

  /** Planning reads where the crossing is; it must not re-enter the plan (runtime). */
  private _planning = false;

  /** Plan the day `nowS` falls in, if its trajectory is not already that day's. */
  private planFor(nowS: number): void {
    const dayStart = Math.floor(nowS / DAY_S) * DAY_S;
    const t = this.getTrajectory();
    if (t !== null && t.startsAtS() === dayStart) return;
    this._planning = true;
    try {
      this.setTrajectory(this.planDay(dayStart));
    } finally {
      this._planning = false;
    }
  }

  /**
   * ⭐ The day's trajectory from the rows: on call until the first boarding
   * window; then for each departure a boarding window, the crossing, and
   * alongside at the far landing — and the run back, if there is one; on
   * call again after the last arrival. Out of season, on call all day.
   */
  private planDay(dayStart: number): Trajectory {
    const line = this.getLine() ?? '';
    const here = this.getLinePosition();
    const near = this.landings[0] ?? '';
    const far = this.landings[1] ?? '';
    const at = (across: number): FramePos => ({
      frame: 'line',
      at: { course: here?.course ?? '', km: here?.km ?? 0, across },
    });
    const b = new TrajectoryBuilder(line, at(0), dayStart).mark({ name: 'phase', phase: 'on-call' });
    const tt = this.timetable;
    const day = Math.floor(dayStart / DAY_S) % 360;
    const inSeason = tt !== null && (tt.season === undefined || (day >= tt.season.fromDay && day <= tt.season.toDay));
    if (!tt || !inSeason || near === '' || far === '') return b.build();
    const crossS = Math.max(60, tt.crossingMin * 60);
    const boardS = Math.max(60, (tt.boardMin ?? 10) * 60);
    const backS = Math.max(0, (tt.returnAfterMin ?? 0) * 60);
    let lastArrival = dayStart;
    const run = (from: string, to: string, departS: number, toAcross: number): void => {
      if (departS - boardS < b.now().atS) return;
      b.hold(departS - boardS).mark({ name: 'phase', phase: `boarding:${from}` });
      b.hold(departS).mark({ name: 'depart', phase: 'crossing', data: { from, to } });
      b.glide(at(toAcross), departS + crossS).mark({ name: 'arrive', phase: `alongside:${to}`, data: { at: to } });
      lastArrival = departS + crossS;
    };
    for (const hhmm of tt.departs) {
      const [h, m] = hhmm.split(':').map((x) => Number(x));
      if (!Number.isFinite(h) || !Number.isFinite(m)) continue;
      const departS = dayStart + h! * 3600 + m! * 60;
      run(near, far, departS, this.crossingM);
      if (backS > 0) run(far, near, departS + crossS + backS, 0);
    }
    b.hold(lastArrival + 60).mark({ name: 'phase', phase: 'on-call', atS: lastArrival + 60 });
    return b.build();
  }

  private nowS(): number {
    try {
      return WorldClockApi.getNow().rawValue();
    } catch {
      return 0;
    }
  }
}
