/**
 * LineFrameMixin — ⭐ **a river's LINE as a frame things are positioned
 * in** (river D2): the protocol a moving place, and later a ship, reads a
 * river through, without the kernel importing the water pack.
 *
 * The sea's frame is an `Expanse` (a chart, lat/lon); a river's is a line
 * (km from the mouth, m from river left). The water pack's `Watercourse`
 * composes this and forwards to its catalogue's compiled line; the
 * kernel asks only through these methods, found by `MixinApi.isLineFrame`
 * on the row the position names — the `WaterSourceMixin` shape one
 * subsystem over.
 *
 * Every method has a refusing default (no length, no elevation, nothing),
 * so a frame that answers nothing is honest rather than wrong.
 *
 * ⭐ It is a `Frame` (river review, W7): what a craft on a river asks of
 * it is what a craft at sea asks of its chart — plan a course, where am I
 * at a time, what did this watch bring. On a line a course is a PASSAGE
 * worked out stretch by stretch when it is set (`planPassage`), her
 * position is read off it, and the watch tells the stretches' changes,
 * throws her wake and comes to the passage's stop. She always knows where
 * she is (`reckons` is false).
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CourseRequest, Frame, FramePos, FrameSite, WatchReport } from './Frame';
import type { CourseRecord, HullNow } from './Voyaging';
import { TrajectoryBuilder, type Trajectory } from './Trajectory';
import type { Craft } from './Voyage';
import { AppApi } from '../../api/app';

/** Where on a river: km from the mouth, m from river left. */
export interface LinePositionRecord {
  course: string;
  km: number;
  across: number;
}

/** The climate levers a position on a line reads from its river. */
export interface LineClimateSite {
  latitude: number;
  continentality: number;
  climateOffsetK: number;
}

/** What a craft asks of a river before it sets a course on it (river D18, D28). */
export interface PassageRequest {
  direction: 'upstream' | 'downstream';
  /** A landing's place path to stop at, or `null` to go on to the end. */
  landing: string | null;
  /** Her speed through the water, m/s. */
  throughWaterMps: number;
  /**
   * ⭐ `slow`: through snag water she is held to the speed her people can
   * read the water at (never faster over the ground than the snags can be
   * seen) — and runs at her speed everywhere else.
   */
  slow?: boolean;
  /** Her hull: draft now (laden), beam and length, m. */
  draftM: number;
  beamM: number;
  lengthM: number;
}

/** Why a passage stops short of where it was going. */
export type PassageStopReason = 'landing' | 'aground' | 'holed' | 'snags' | 'stemmed' | 'falls' | 'mouth' | 'head';

/**
 * ⭐ A passage worked out stretch by stretch when the course was set (river
 * D18): where she will be when, and where — and why — she stops. A derived
 * value the craft keeps with its course, so her position is read off it
 * synchronously and survives a restart.
 */
export interface PassagePlan {
  course: string;
  /** Her across, m — the channel she keeps. */
  across: number;
  /** `[km, atS]` at every stretch boundary, in order from the start. */
  legs: Array<[number, number]>;
  /** Where she stops, and why; `null` only for a passage with no end. */
  stop: { km: number; atS: number; reason: PassageStopReason; words: string; landing?: string } | null;
}

export interface LineFrame extends Frame {
  /** The river's key — the `course` of every position on it. */
  courseKey(): string;
  /** How long the river is, km (0 for a still water). */
  lengthKm(): number;
  /** The water surface's elevation at a km, m, or `null` when not compiled yet. */
  elevationAtKm(km: number): number | null;
  /** The address of the locality whose ground drains to a km, or `null`. */
  localityAddressAt(km: number): string | null;
  /** The climate levers at a km, or `null`. */
  climateSiteAt(km: number): LineClimateSite | null;
  /** The words for the river at a position, for whoever is in it. */
  describeAt(pos: LinePositionRecord): string[];
  /**
   * ⭐ What on the river is in sight from `place` (river D26) — whoever is
   * in the water, up to the next bend or as far as height carries on a
   * straight reach. Pull, never push: the horizon watch asks.
   */
  sightablesNear(place: unknown, eyeHeightM: number): unknown[];
  /**
   * ⭐ Plan a craft's passage from `from` (river D18, D28): the passage, or
   * the river's refusal in its own words — a beam the river is too narrow
   * for, a bend too tight for her length, the falls.
   */
  planPassage(from: LinePositionRecord, req: PassageRequest, nowS: number): Promise<PassagePlan | { refused: string }>;
  /** The landing place within `withinM` of a position, by path, or `null`. */
  landingNear(pos: LinePositionRecord, withinM: number): string | null;
  /** A landing on this river, by name or keyword, as a path and a km. */
  landingNamed(word: string): { path: string; km: number; name: string } | null;
  /** What changed in the water between two km, in words, in order. */
  changesAlong(fromKm: number, toKm: number): string[];
  /** How deep the water is at a position now, m, or `null`. */
  depthAt(pos: LinePositionRecord, nowS: number): Promise<number | null>;
  /**
   * ⭐ A craft passing at `speedMps` raises a wake (river D29): whatever
   * small boat lies within hail of `pos` and has less freeboard than the
   * wave is swamped. Pull, never push: the ship's beat asks.
   */
  wakeAt(pos: LinePositionRecord, speedMps: number): Promise<void>;
  /** The sea and the node a ship comes out onto at this river's mouth, or `null`. */
  mouthOnSea(): { expanse: string; node: string } | null;
  /**
   * ⭐ Where a kedge is down within hail of `pos` (river D28): the km of a
   * boat held by its killick, which a capstan can haul a grounded ship to.
   */
  kedgeNear(pos: LinePositionRecord): number | null;
}

/** A dial, or its fallback. */
function numSetting(key: string, fallback: number): number {
  try {
    const n = Number(AppApi.setting(key));
    return Number.isFinite(n) && n > 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

export function LineFrameMixin<TBase extends MixinConstructor<{ getTemplatePath(): string | null }>>(Base: TBase) {
  // The base supplies `getTemplatePath` (every Stuff has one); a mixin's `implements` cannot see it.
  return class LineFrameMixin extends Base implements Omit<LineFrame, 'getTemplatePath'> {
    static _mixinName: string = 'LineFrameMixin';

    /* ─────────────── the frame a craft is in (river review, W7) ─────────────── */

    reckons(): boolean {
      return false;
    }

    /** ⭐ A reach goes by in minutes: the watch is short (river D18). */
    watchIntervalS(): number {
      return numSetting('river.watchGameMinutes', 10) * 60;
    }

    async ready(): Promise<void> {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    adopt(_craft: Craft): void {
      return;
    }

    /**
     * ⭐ A course on a river is its passage (river D18, D28): which way,
     * perhaps for a landing, worked out from where she is now — or the
     * river's refusal in its own words.
     */
    async planCourse(
      craft: Craft,
      req: CourseRequest,
      hull: HullNow,
      nowS: number,
    ): Promise<{ course: CourseRecord; trajectory: Trajectory } | { refused: string }> {
      const here = craft.whereAtS(nowS);
      const path = (this as unknown as { getTemplatePath(): string | null }).getTemplatePath();
      if (here === null || here.frame !== 'line' || !path) return { refused: 'There is no river under her to set a course along.' };
      if (req.direction === undefined) return { refused: 'Upstream, or downstream?' };
      const throughWaterMps = (Math.max(0, req.speedKn) * 1852) / 3600;
      const landing = req.toward ?? null;
      const plan = await this.planPassage(
        here.at,
        { direction: req.direction, landing, throughWaterMps, ...(req.slow ? { slow: true } : {}), ...hull },
        nowS,
      );
      if ('refused' in plan) return plan;
      // ⭐ The passage IS her trajectory (W10): a glide per stretch, at the
      // channel she keeps, and the stop as a mark.
      const at = (km: number): FramePos => ({ frame: 'line', at: { course: plan.course, km, across: plan.across } });
      const legs = plan.legs;
      const b = new TrajectoryBuilder(path, at(legs[0]?.[0] ?? here.at.km), legs[0]?.[1] ?? nowS);
      for (const [km, atS] of legs.slice(1)) b.glide(at(km), atS);
      if (plan.stop !== null) {
        if (plan.stop.atS > b.now().atS) b.glide(at(plan.stop.km), plan.stop.atS);
        b.mark({
          name: 'stop',
          atS: plan.stop.atS,
          words: plan.stop.words,
          data: { reason: plan.stop.reason, ...(plan.stop.landing ? { landing: plan.stop.landing } : {}) },
        });
      }
      return {
        course: { bearingDeg: 0, speedKn: Math.max(0, req.speedKn), node: null, line: { direction: req.direction, landing, throughWaterMps } },
        trajectory: b.build(),
      };
    }

    /**
     * ⭐ One watch on a river (river D18, D29): what changed in the water
     * between where she was and where she is, the wake she throws at the
     * speed she is making over the ground, and her passage's stop when it
     * has come — a landing, the ground, a snag, the falls, the sea.
     */
    async watchCraft(craft: Craft, fromS: number, toS: number): Promise<WatchReport> {
      const prev = craft.whereAtS(fromS);
      const pos = craft.whereAtS(toS);
      if (prev?.frame !== 'line' || pos?.frame !== 'line') return { told: [], distanceKm: 0, stop: null };
      const told = this.changesAlong(prev.at.km, pos.at.km);
      const distanceKm = Math.abs(pos.at.km - prev.at.km);
      await this.wakeAt(pos.at, (distanceKm * 1000) / Math.max(1, toS - fromS)).catch(() => undefined);
      const traj = craft.getTrajectory();
      const mark = traj?.marksBetween(fromS, toS).find((m) => m.name === 'stop') ?? null;
      if (mark === null) return { told, distanceKm, stop: null };
      const there = traj!.at(mark.atS)?.pos ?? pos;
      return {
        told,
        distanceKm,
        stop: {
          reason: mark.data?.reason ?? 'stop',
          words: mark.words ?? '',
          at: there,
          ...(mark.data?.landing ? { landing: mark.data.landing } : {}),
        },
      };
    }

    /** ⭐ The river's geography at a km (D44): the water's elevation, the ground that drains to it, its climate. */
    siteAt(pos: FramePos): FrameSite | null {
      if (pos.frame !== 'line') return null;
      const site = this.climateSiteAt(pos.at.km);
      return {
        elevation: this.elevationAtKm(pos.at.km),
        address: this.localityAddressAt(pos.at.km),
        latitude: site?.latitude ?? null,
        continentality: site?.continentality ?? null,
        climateOffsetK: site?.climateOffsetK ?? null,
      };
    }

    /** @hook Override on the river: a place's citation, in its grammar. Default: nowhere. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    siteOf(_cite: string): FramePos | null {
      return null;
    }

    /** @hook Override on the river: a bank's way into the water. Default: nothing. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onSiteStood(_place: Stuff): Promise<void> {
      return;
    }

    /* ─────────────────────── the river's own hooks ─────────────────────── */

    /** @hook Override on the river. Default: none. */
    courseKey(): string {
      return '';
    }

    /** @hook Override on the river. Default: no length. */
    lengthKm(): number {
      return 0;
    }

    /** @hook Override on the river. Default: not known. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    elevationAtKm(_km: number): number | null {
      return null;
    }

    /** @hook Override on the river. Default: no locality. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    localityAddressAt(_km: number): string | null {
      return null;
    }

    /** @hook Override on the river. Default: no site. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    climateSiteAt(_km: number): LineClimateSite | null {
      return null;
    }

    /** @hook Override on the river. Default: nothing to say. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    describeAt(_pos: LinePositionRecord): string[] {
      return [];
    }

    /** @hook Override on the river. Default: nothing in sight. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sightablesNear(_place: unknown, _eyeHeightM: number): unknown[] {
      return [];
    }

    /** @hook Override on the river. Default: no passage on a still water. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async planPassage(_from: LinePositionRecord, _req: PassageRequest, _nowS: number): Promise<PassagePlan | { refused: string }> {
      return { refused: 'This water goes nowhere.' };
    }

    /** @hook Override on the river. Default: no landings. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    landingNear(_pos: LinePositionRecord, _withinM: number): string | null {
      return null;
    }

    /** @hook Override on the river. Default: no landings. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    landingNamed(_word: string): { path: string; km: number; name: string } | null {
      return null;
    }

    /** @hook Override on the river. Default: nothing changes. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    changesAlong(_fromKm: number, _toKm: number): string[] {
      return [];
    }

    /** @hook Override on the river. Default: not known. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async depthAt(_pos: LinePositionRecord, _nowS: number): Promise<number | null> {
      return null;
    }

    /** @hook Override on the river. Default: no small craft to swamp. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async wakeAt(_pos: LinePositionRecord, _speedMps: number): Promise<void> {
      return;
    }

    /** @hook Override on the river. Default: nothing to haul on. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    kedgeNear(_pos: LinePositionRecord): number | null {
      return null;
    }

    /** @hook Override on the river. Default: no sea at the end of it. */
    mouthOnSea(): { expanse: string; node: string } | null {
      return null;
    }
  };
}
