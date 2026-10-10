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
 * Composed on `Structure` and the transport pack's `Boat`; needs
 * `PositionedMixin` beneath it (it overrides `getExpansePosition`) and an
 * engaged, persistable host above.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import { GeoPosition } from './GeoPosition';
import { Plot, type PlotRecord } from './Plot';
import type { Positioned } from './Positioned';
import type Band from '../../platform/idea/Band';
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
}

export interface Voyaging {
  getCourse(): CourseRecord | null;
  getCourseSetAtS(): number;
  getSpeedKn(): number;
  /** The true position at `tS` (seconds of game time). */
  positionAtS(tS: number): GeoPosition | null;
  /** The reckoning, as a value. */
  getPlot(): Plot | null;
  /** The reckoned position now. */
  reckonedNow(): GeoPosition | null;
  /** How uncertain the reckoning is now, nautical miles. */
  reckoningUncertaintyNm(): number;
  /** A fix: the reckoning is corrected to `pos`, good to `nm`. */
  takeFix(pos: GeoPosition, nm: number): void;
  /** A latitude sight: the reckoning's LATITUDE is corrected, not its longitude. */
  takeLatitude(latDeg: number, nm: number): void;
  /** Re-anchor the voyage at `nowS` with a new course (or none). */
  rebase(course: CourseRecord | null, nowS: number): void;
  /** Put the craft exactly at `pos`, no course (an arrival, a launch). */
  placeAt(pos: GeoPosition, nowS: number): void;
  aboard(): Promise<Stuff[]>;
  watchRoom(): Promise<(Stuff & Container) | null>;
  gearAboard(): Promise<Stuff[]>;
  /** Set a course and get under way (or change course under way). */
  steer(course: CourseRecord): Promise<StartResult>;
  /** Stop where the craft is. */
  anchorHere(): Promise<void>;
  /** The voyage this craft is holding, if any. */
  currentVoyage(): Voyage | null;
  /** The live expanse this craft is on, or `null`. */
  liveExpanse(): Promise<ExpanseFrame | null>;
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
  TBase extends MixinConstructor<Stuff & Positioned>,
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

    /** The stored fix — where the course was set from. */
    private storedFix(): GeoPosition | null {
      return super.getExpansePosition();
    }

    /** ⭐ While under way the position is DERIVED; at anchor it is the fix. */
    getExpansePosition(): GeoPosition | null {
      return this.positionAtS(WorldClockApi.getNow().rawValue());
    }

    positionAtS(tS: number): GeoPosition | null {
      const fix = this.storedFix();
      const course = this.course;
      if (fix === null || course === null || tS <= this.courseSetAtS) return fix;
      const hours = (tS - this.courseSetAtS) / 3600;
      const nominal = course.speedKn * hours;
      const end = fix.destination(course.bearingDeg, nominal);
      const bands = this.liveBands();
      if (bands.length === 0) return end;

      // Split the undisplaced track at every boundary it meets; in each
      // piece the NARROWEST band containing it owns the set and the way.
      const cuts = new Set<number>([0, 1]);
      for (const b of bands) for (const c of b.crossings(fix, end)) cuts.add(c.t);
      const ts = [...cuts].sort((a, b) => a - b);
      let along = 0;
      let north = 0;
      let east = 0;
      for (let i = 0; i + 1 < ts.length; i++) {
        const t0 = ts[i]!;
        const t1 = ts[i + 1]!;
        const frac = t1 - t0;
        if (frac <= 0) continue;
        const mid = fix.lerp(end, (t0 + t1) / 2);
        const band = narrowest(bands, mid);
        along += nominal * frac * (band?.getCost().wayFactor ?? 1);
        const setKn = band?.getSetKn() ?? 0;
        if (band && setKn !== 0) {
          const dist = setKn * hours * frac;
          const dir = (band.getDirection() * Math.PI) / 180;
          north += dist * Math.cos(dir);
          east += dist * Math.sin(dir);
        }
      }
      return fix.destination(course.bearingDeg, along).displaced(north, east);
    }

    reckonedNow(): GeoPosition | null {
      const plot = this.getPlot();
      if (plot === null) return this.storedFix();
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
     * Re-anchor: the fix becomes where the craft truly is now, the
     * reckoning is carried forward to now, and the course is replaced.
     * The ONE writer of the voyage triple; `Voyage` and the verbs call it.
     */
    rebase(course: CourseRecord | null, nowS: number): void {
      const truth = this.positionAtS(nowS);
      const reckoned = this.reckonedNow();
      const nm = this.reckoningUncertaintyNm();
      if (truth !== null) super.setExpansePosition(truth);
      if (reckoned !== null) {
        this.plot = { fix: reckoned.toJSON(), atS: nowS, nm };
      }
      this.course = course ? { ...course } : null;
      this.courseSetAtS = nowS;
    }

    /**
     * Put the craft exactly at `pos` with no course — an arrival snapping
     * to its node, a boat put over the side. The reckoning is corrected
     * too: you know where you are when you are somewhere.
     */
    placeAt(pos: GeoPosition, nowS: number): void {
      super.setExpansePosition(pos);
      this.course = null;
      this.courseSetAtS = nowS;
      this.plot = { fix: pos.toJSON(), atS: nowS, nm: 0 };
    }

    /**
     * Everyone aboard who can be told what the water is doing.
     *
     * @hook Invoked by `Voyage` on every beat. Default: nobody. A
     *   Structure answers the occupants of its member rooms; a boat its
     *   own contents.
     */
    async aboard(): Promise<Stuff[]> {
      return [];
    }

    /**
     * Where the watch is kept — the deck. A watch is MANNED when a living,
     * conscious body stands in it.
     *
     * @hook Invoked by `Voyage` on every beat. Default `null` (never
     *   manned). A Structure answers its entrance room; a boat itself.
     */
    async watchRoom(): Promise<(Stuff & Container) | null> {
      return null;
    }

    /**
     * The gear an unattended watch wears — the `Durable` goods exposed on
     * deck.
     *
     * @hook Invoked by `Voyage` on every beat. Default: none.
     */
    async gearAboard(): Promise<Stuff[]> {
      return [];
    }

    /**
     * ⭐ Set a course: the fix becomes where the craft truly is now, the
     * reckoning carries forward, the craft registers on its expanse, and a
     * voyage starts (replacing any it was already holding). Persisted at
     * once — a course is a fact that must survive a restart.
     */
    async steer(course: CourseRecord): Promise<StartResult> {
      const expanse = await this.liveExpanse();
      if (expanse === null) throw new Error('steer: the craft is on no expanse');
      await expanse.bands();
      const nowS = WorldClockApi.getNow().rawValue();
      this.endVoyage('replaced');
      this.rebase(course, nowS);
      expanse.register(this as unknown as Stuff & Positioned);
      const started = SchedulerApi.start(new Voyage(this as unknown as Craft));
      this.persistNow();
      return started;
    }

    /** Stop: the fix is where the craft truly is; the voyage ends `anchored`. */
    async anchorHere(): Promise<void> {
      const expanse = await this.liveExpanse();
      if (expanse) await expanse.bands();
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

    async liveExpanse(): Promise<ExpanseFrame | null> {
      const path = (this as unknown as Positioned).getExpanse();
      if (!path) return null;
      try {
        const s = await StuffApi.singleton<Stuff>(path);
        return s instanceof ExpanseFrame ? s : null;
      } catch {
        return null;
      }
    }

    /**
     * ⭐ Re-establish the voyage after a restart (maritime D6): the three
     * fields are back, so the voyage is too — the craft registers on its
     * expanse, and if a course was set the engagement starts again with
     * the position already wherever the clock has carried it.
     */
    async onRestored(): Promise<void> {
      const inner = (super.onRestored as unknown as (() => Promise<void>) | undefined);
      if (typeof inner === 'function') await inner.call(this);
      if (this.storedFix() === null) return;
      const expanse = await this.liveExpanse();
      if (expanse === null) return;
      // ⚠ Not `await expanse.bands()`: the expanse's own compile stands
      // its ships up, so a ship restored DURING that compile would wait
      // on the compile that is waiting on it. The first watch loads the
      // bands; the derived position reads them once they are there. Kick
      // the compile without waiting on it.
      void expanse.bands();
      expanse.register(this as unknown as Stuff & Positioned);
      if (this.course !== null && this.currentVoyage() === null) {
        SchedulerApi.start(new Voyage(this as unknown as Craft));
      }
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

    /** The bands of this craft's expanse, if it is resident and compiled. */
    private liveBands(): Band[] {
      const path = (this as unknown as Positioned).getExpanse();
      if (!path) return [];
      const e = StuffApi.findByTemplatePath<Stuff>(path);
      return e instanceof ExpanseFrame ? e.peekBands() : [];
    }
  };
}

function narrowest(bands: Band[], pos: GeoPosition): Band | null {
  let best: Band | null = null;
  for (const b of bands) {
    if (!b.contains(pos)) continue;
    if (best === null || b.area() < best.area()) best = b;
  }
  return best;
}
