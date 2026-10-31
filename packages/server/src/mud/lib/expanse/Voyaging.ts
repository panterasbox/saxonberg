/**
 * VoyagingMixin — a craft that can hold a course across an expanse: a
 * ship (a `Structure`) or a boat.
 *
 * ## ⭐⭐ The voyage's whole state is THREE persisted fields
 *
 * the **fix** (`expansePosition` — where the craft was when the course was
 * set), the **course** (a bearing, a speed, and the node it was set for if
 * any) and **when** it was set (`courseSetAtS`). Everything else is
 * derived:
 *
 *     positionNow = fix + course × (now − courseSetAt) + Σ set × time-in-band
 *
 * — so a restart loses nothing, a craft under way with nobody aboard
 * still advances, and the engagement that beats once a watch
 * (`Voyage`) holds no state of its own. `getExpansePosition()` answers
 * the DERIVED position while a course is set: everyone who asks *where is
 * this craft* gets the truth without knowing there is a voyage.
 *
 * ## The plot — the other position
 *
 * `plot` is the navigator's reckoning (`Plot`): the last fix carried
 * along the courses steered, knowing nothing of the set. It diverges from
 * the truth exactly as far as the water moved you, and it is what
 * `locate` and `course` report. Fixes collapse it.
 *
 * ## ⭐⭐ One craft, either frame (river review, W7)
 *
 * The craft never branches on WHERE it is: it asks its `Frame` (the sea's
 * chart, an `Expanse`; a river's line, a `LineFrame`) to plan a course
 * (`steer`), where it puts her at a time (`whereAtS`), and what a watch
 * brought (`Voyage`). What drives her (`burnFor`), how she floats
 * (`hullNow`) and what a stop does to her (`onStop`) are hers, on either.
 * The navigator's plot is the one chart-only surface: on a line you always
 * know where you are (`Frame.reckons`).
 *
 * Composed on `Ship` (a `Structure`); needs `PositionedMixin` beneath it
 * (it overrides the position reads) and an engaged, persistable host above.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import { GeoPosition } from './GeoPosition';
import { Plot, type PlotRecord } from './Plot';
import type { Positioned } from './Positioned';
import type { Moving } from './Moving';
import type { LinePositionRecord } from './LineFrame';
import type { CourseRequest, CraftStop, FramePos, FrameStuff } from './Frame';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { AppApi } from '../../api/app';
import { MixinApi } from '../../api/mixin';
import { SchedulerApi, type StartResult } from '../../api/scheduler';
import { PersistableApi } from '../../api/persistable';
import { Expanse as ExpanseFrame } from './Expanse';
import { Voyage, VOYAGE_TYPE, type Craft } from './Voyage';

/** What a course is: a bearing steered at a speed, perhaps for a node. */
export interface CourseRecord {
  bearingDeg: number;
  speedKn: number;
  /** The node it was set for, or `null` for a bare bearing. */
  node: string | null;
  /**
   * ⭐ On a river's line (river D18): which way, the landing it was set
   * for, and the passage the river worked out when it was set.
   */
  line?: LineCourse | null;
}

/** A course on a river: which way, and the landing it was set for (its passage is her trajectory). */
export interface LineCourse {
  direction: 'upstream' | 'downstream';
  landing: string | null;
  /** Her speed through the water it was planned at, m/s. */
  throughWaterMps: number;
}

/** Her hull, as a frame reads it. */
export interface HullNow {
  draftM: number;
  beamM: number;
  lengthM: number;
}

export interface Voyaging {
  getCourse(): CourseRecord | null;
  getCourseSetAtS(): number;
  getSpeedKn(): number;
  /** Where she was when the course was set — or where she lies — as stored. */
  getFix(): FramePos | null;
  /** ⭐ Where her frame puts her at `tS` (seconds of game time). */
  whereAtS(tS: number): FramePos | null;
  /** ⭐ Set a course and get under way (or change it under way) — or the frame's refusal. */
  steer(req: CourseRequest): Promise<StartResult | { refused: string }>;
  /** Plan the same course on from where it puts her at `fromS` (a bare bearing's horizon). */
  extendCourse(fromS: number): Promise<boolean>;
  /** Stop where the craft is. */
  anchorHere(): Promise<void>;
  /** Re-anchor the voyage at `nowS` with a new course (or none). */
  rebase(course: CourseRecord | null, nowS: number): void;
  /**
   * Put the craft exactly at `pos`, no course (an arrival, a launch). With
   * `framePath`, into that frame — off the river's line and onto the sea's
   * chart at a mouth, or back in over the bar.
   */
  placeAt(pos: FramePos, nowS: number, framePath?: string): void;
  /** The voyage this craft is holding, if any. */
  currentVoyage(): Voyage | null;
  aboard(): Promise<Stuff[]>;
  watchRoom(): Promise<(Stuff & Container) | null>;
  gearAboard(): Promise<Stuff[]>;
  /** Her hull as it floats now. */
  hullNow(): HullNow;
  /** Burn what drives her over `km`; `false` when there is none left. */
  burnFor(km: number): Promise<boolean>;
  /** Her course has come to its stop: what happens to her there, in words. */
  onStop(stop: CraftStop): Promise<string>;
  /** Somebody went over her side into the water (river D30). */
  noteOverboard(who: Stuff): void;
  /** ⭐ Made fast at a landing by her own lines (harbors P5)? A boat never is. */
  isMoored(): boolean;
  /** ⭐ A landing is being used: if she lies made fast there, her way aboard is put back on it (harbors P4). */
  wireBerthAt(place: Stuff): Promise<void>;
  /** ⭐ May `who` take her helm — lay or end her course (harbors P12)? A boat answers anyone. */
  mayBeSteeredBy(who: Stuff): boolean;
  /** The navigator's reckoning, as a value (the chart's). */
  getPlot(): Plot | null;
  /** The reckoned position now (the chart's). */
  reckonedNow(): GeoPosition | null;
  /** How uncertain the reckoning is now, nautical miles. */
  reckoningUncertaintyNm(): number;
  /** A fix: the reckoning is corrected to `pos`, good to `nm`. */
  takeFix(pos: GeoPosition, nm: number): void;
  /** A latitude sight: the reckoning's LATITUDE is corrected, not its longitude. */
  takeLatitude(latDeg: number, nm: number): void;
}

function numSetting(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    const n = Number(raw);
    return raw !== '' && Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

export function VoyagingMixin<
  TBase extends MixinConstructor<Stuff & Positioned & Moving>,
>(Base: TBase) {
  return class VoyagingMixin extends Base implements Voyaging {
    static _mixinName: string = 'VoyagingMixin';

    static fieldMeta: FieldMeta = {
      course: { persistent: true },
      courseSetAtS: { persistent: true },
      plot: { persistent: true },
      speedKn: { persistent: true, authorable: true },
    };

    protected course: CourseRecord | null = null;
    protected courseSetAtS = 0;
    protected plot: PlotRecord | null = null;
    /** Way through the water under sail or oar, knots. */
    protected speedKn = 5;

    getCourse(): CourseRecord | null { return this.course ? { ...this.course } : null; }
    setCourse(v: CourseRecord | null): void { this.course = v ?? null; }

    getCourseSetAtS(): number { return this.courseSetAtS; }
    setCourseSetAtS(v: number): void { this.courseSetAtS = Number(v) || 0; }

    getSpeedKn(): number { return this.speedKn; }
    setSpeedKn(v: number): void { this.speedKn = Math.max(0, Number(v) || 0); }

    getPlot(): Plot | null { return this.plot ? new Plot(this.plot) : null; }
    setPlot(v: PlotRecord | null): void { this.plot = v ?? null; }

    /** The stored half of the position — Positioned's own record. */
    getFix(): FramePos | null {
      const line = super.getLinePosition();
      if (line !== null) return { frame: 'line', at: line };
      const chart = super.getExpansePosition();
      return chart === null ? null : { frame: 'chart', at: chart };
    }

    /** ⭐ Under way the position is read off her trajectory (W10, W11); at rest it is the fix. */
    whereAtS(tS: number): FramePos | null {
      return (this as unknown as Moving).trajectoryAt(tS)?.pos ?? this.getFix();
    }

    private nowS(): number | null {
      try {
        return WorldClockApi.getNow().rawValue();
      } catch {
        return null;
      }
    }

    getExpansePosition(): GeoPosition | null {
      const now = this.nowS();
      const w = now === null ? this.getFix() : this.whereAtS(now);
      return w?.frame === 'chart' ? w.at : null;
    }

    getLinePosition(): LinePositionRecord | null {
      const now = this.nowS();
      const w = now === null ? this.getFix() : this.whereAtS(now);
      return w?.frame === 'line' ? { ...w.at } : null;
    }

    reckonedNow(): GeoPosition | null {
      const fix = this.getFix();
      if (fix?.frame !== 'chart') return null;
      const plot = this.getPlot();
      if (plot === null) return fix.at;
      const course = this.course;
      return plot.reckonedAt(
        WorldClockApi.getNow().rawValue(),
        course?.bearingDeg ?? null,
        course?.speedKn ?? 0,
      );
    }

    reckoningUncertaintyNm(): number {
      const plot = this.getPlot();
      if (plot === null) return 0;
      return plot.uncertaintyAt(
        WorldClockApi.getNow().rawValue(),
        this.course !== null,
        numSetting('expanse.reckoningGrowthNmPerHour', 0.5),
      );
    }

    takeFix(pos: GeoPosition, nm: number): void {
      this.plot = { fix: pos.toJSON(), atS: WorldClockApi.getNow().rawValue(), nm };
    }

    takeLatitude(latDeg: number, nm: number): void {
      const now = this.reckonedNow();
      if (now === null) return;
      const was = this.reckoningUncertaintyNm();
      this.plot = {
        fix: new GeoPosition(latDeg, now.lonDeg).toJSON(),
        atS: WorldClockApi.getNow().rawValue(),
        // Latitude is mended; longitude keeps what it had. The bracket
        // cannot shrink below the error that remains east-west.
        nm: Math.max(nm, was),
      };
    }

    /**
     * Re-anchor: the fix becomes where the craft truly is now (and on the
     * chart the reckoning is carried forward to now), and the course is
     * replaced. The ONE writer of the voyage triple; `Voyage` and the verbs
     * call it.
     */
    rebase(course: CourseRecord | null, nowS: number): void {
      const here = this.whereAtS(nowS);
      if (here?.frame === 'line') {
        (this as unknown as Positioned).placeOnLine((this as unknown as Positioned).getLine(), here.at);
      } else if (here?.frame === 'chart') {
        const reckoned = this.reckonedNow();
        const nm = this.reckoningUncertaintyNm();
        super.setExpansePosition(here.at);
        if (reckoned !== null) this.plot = { fix: reckoned.toJSON(), atS: nowS, nm };
      }
      this.course = course ? { ...course } : null;
      this.courseSetAtS = nowS;
      if (course === null) (this as unknown as Moving).setTrajectory(null, true);
    }

    placeAt(pos: FramePos, nowS: number, framePath?: string): void {
      const p = this as unknown as Positioned;
      if (pos.frame === 'chart') {
        if (framePath !== undefined) {
          p.placeOnLine(null, null);
          p.setExpanse(framePath);
        }
        super.setExpansePosition(pos.at);
        // You know where you are when you are somewhere.
        this.plot = { fix: pos.at.toJSON(), atS: nowS, nm: 0 };
      } else {
        if (framePath !== undefined) {
          super.setExpansePosition(null);
          p.setExpanse(null);
          this.plot = null;
        }
        p.placeOnLine(framePath ?? p.getLine(), pos.at);
      }
      this.course = null;
      this.courseSetAtS = nowS;
      (this as unknown as Moving).setTrajectory(null, true);
    }

    /**
     * Everyone aboard who can be told what the water is doing.
     *
     * @hook Invoked by `Voyage` on every beat. Default: nobody. A
     *   Structure answers the occupants of its member places.
     */
    async aboard(): Promise<Stuff[]> {
      return [];
    }

    /** Whoever is aboard is who a moving ship tells (Moving's audience). */
    async audience(): Promise<Stuff[]> {
      return this.aboard();
    }

    /**
     * Where the watch is kept — the deck. A watch is MANNED when a living,
     * conscious body stands in it.
     *
     * @hook Invoked by the frame's watch. Default `null` (never manned). A
     *   Structure answers its entrance room.
     */
    async watchRoom(): Promise<(Stuff & Container) | null> {
      return null;
    }

    /**
     * The gear an unattended watch wears — the `Durable` goods exposed on
     * deck.
     *
     * @hook Invoked by the frame's watch. Default: none.
     */
    async gearAboard(): Promise<Stuff[]> {
      return [];
    }

    /**
     * ⭐ Set a course: her frame plans it from where she truly is now (or
     * refuses it in its own words), the fix moves to now, and a voyage
     * starts (replacing any she was holding). Persisted at once — a course
     * is a fact that must survive a restart.
     */
    async steer(req: CourseRequest): Promise<StartResult | { refused: string }> {
      const frame = await (this as unknown as Positioned).liveFrame();
      if (frame === null) return { refused: 'There is no water under her to set a course on.' };
      await frame.ready();
      const nowS = WorldClockApi.getNow().rawValue();
      const planned = await frame.planCourse(this as unknown as Craft, req, this.hullNow(), nowS);
      if ('refused' in planned) return planned;
      this.endVoyage('replaced');
      this.rebase(planned.course, nowS);
      // ⭐ A course somebody set is touched (D43): it persists with her.
      (this as unknown as Moving).setTrajectory(planned.trajectory, true);
      const started = SchedulerApi.start(new Voyage(this as unknown as Craft));
      this.persistNow();
      return started;
    }

    /**
     * ⭐ Her course is running past what was planned of it (a bare
     * bearing's horizon, W11): plan the same course on from where it puts
     * her at `fromS` (its end), and keep the voyage she is holding.
     */
    async extendCourse(fromS: number): Promise<boolean> {
      const nowS = fromS;
      const course = this.course;
      const frame = await (this as unknown as Positioned).liveFrame();
      if (course === null || frame === null) return false;
      await frame.ready();
      const planned = await frame.planCourse(
        this as unknown as Craft,
        {
          speedKn: course.speedKn,
          bearingDeg: course.bearingDeg,
          toward: course.node ?? course.line?.landing ?? null,
          ...(course.line ? { direction: course.line.direction } : {}),
        },
        this.hullNow(),
        nowS,
      );
      if ('refused' in planned) return false;
      this.rebase(planned.course, nowS);
      (this as unknown as Moving).setTrajectory(planned.trajectory, true);
      this.persistNow();
      return true;
    }

    /** Stop: the fix is where the craft truly is; the voyage ends `anchored`. */
    async anchorHere(): Promise<void> {
      await (await (this as unknown as Positioned).liveFrame())?.ready();
      this.rebase(null, WorldClockApi.getNow().rawValue());
      this.endVoyage('anchored');
      this.persistNow();
    }

    currentVoyage(): Voyage | null {
      const self = this as unknown as Stuff;
      if (!MixinApi.isEngaged(self)) return null;
      const v = self.getEngagements().find((e) => e.type === VOYAGE_TYPE);
      return (v as Voyage | undefined) ?? null;
    }

    /**
     * Her hull as it floats now.
     *
     * @hook A ship answers her own, laden. Default: a small boat's.
     */
    hullNow(): HullNow {
      return { draftM: 0.3, beamM: 1.5, lengthM: 5 };
    }

    /**
     * Burn what drives her over `km` — at sea or on a river.
     *
     * @hook A steamer burns cordwood from her bunker. Default: nothing to
     *   burn (sail, oar), always enough.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async burnFor(_km: number): Promise<boolean> {
      return true;
    }

    /**
     * ⭐ Her course has come to its stop (D28, D29; an arrival at a node):
     * what happens to her there, in words for whoever is aboard. She is
     * already placed where it says.
     *
     * @hook A ship marks herself aground or holed, or comes out onto the
     *   sea at a river's mouth. Default: the frame's own words.
     */
    async onStop(stop: CraftStop): Promise<string> {
      return stop.words;
    }

    /**
     * Somebody went over her side — the deck's way into the water says so.
     * @hook A ship keeps who is in the water off her, and her `course`
     *   waits for them (river D30). Default: nobody is kept.
     */
    noteOverboard(who: Stuff): void {
      void who;
    }

    /**
     * Made fast at a landing by her own lines.
     * @hook A ship answers whether she is moored (harbors P5). Default: never.
     */
    isMoored(): boolean {
      return false;
    }

    /**
     * A landing is being used for the first time (`FrameSited`): if she lies
     * made fast there, her way aboard goes back on it.
     * @hook A ship re-wires her berth (harbors P4). Default: nothing.
     */
    async wireBerthAt(place: Stuff): Promise<void> {
      void place;
    }

    /**
     * ⭐ May `who` take her helm — lay her course, or let go her anchor
     * (harbors P12)? Asked by `course` and `anchor` before anything moves.
     * @hook A ship answers her master and her charterer only. Default:
     *   anyone — whoever sits in a boat sails her.
     */
    mayBeSteeredBy(who: Stuff): boolean {
      void who;
      return true;
    }

    /**
     * ⭐ Re-establish the voyage when she LOADS (maritime D6; since the
     * 2026-10-14 review nothing loads her at boot — her zone or her frame
     * does, when somebody comes aboard or within sight): the three fields
     * are back, so the voyage is too — if a course was set the engagement
     * starts again with the position already wherever the clock has
     * carried it, and a first watch reconciles the time away.
     */
    async onRestored(): Promise<void> {
      const inner = (super.onRestored as unknown as (() => Promise<void>) | undefined);
      if (typeof inner === 'function') await inner.call(this);
      if (this.getFix() === null) return;
      const frame = await (this as unknown as Positioned).liveFrame();
      if (frame === null) return;
      // ⚠ Never awaited: the sea's own compile stands its ships up, so a
      // ship restored DURING that compile would wait on the compile that is
      // waiting on it. The first watch loads what positions read.
      if (this.course === null || this.currentVoyage() !== null) {
        void frame.ready();
        return;
      }
      frame.adopt(this as unknown as Craft);
      const voyage = new Voyage(this as unknown as Craft);
      SchedulerApi.start(voyage);
      // ⭐ Nothing kept her loaded while nobody was aboard or in sight, so
      // the time she was away is worked out NOW: one watch at load records
      // the arrival, the stop and the wear.
      void voyage.watch();
    }

    private endVoyage(reason: 'anchored' | 'replaced'): void {
      const v = this.currentVoyage();
      if (v !== null) SchedulerApi.cancel(v, reason);
    }

    private persistNow(): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isPersistable(self)) return;
      void PersistableApi.capture(self).catch((err) =>
        console.warn('Voyaging: capture failed:', err),
      );
    }
  };
}
