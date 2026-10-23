/**
 * Trajectory — ⭐⭐ **what a moving thing WILL do, as a value** (river D39,
 * W9). Ships, river patches, a timetabled ferry, one day a floe or a fair:
 * anything whose position is a variable moves along one of these.
 *
 * - **Legs** — from a position to a position, over a span of game time, in
 *   one frame: a `glide` (straight along the frame: km on a line, the
 *   great-circle lerp on a chart), a `hold` (stationary), or a `jump`
 *   (there, discontinuously, at the leg's end — a portal, a ghost ship in
 *   fog). Consecutive legs may be in DIFFERENT frames: leaving a river at
 *   its mouth is a leg ending on the line and the next starting on the
 *   chart.
 * - **Marks** — named moments: words to tell, and the PHASE they set
 *   (D40). A phase is state, not flavor: the floe's strength or the fair
 *   being open IS the phase the mover reads.
 *
 * Position at any time is interpolation — synchronous, derived, and
 * restart-proof. It is a plain record underneath, so a trajectory that
 * somebody chose or touched persists with its mover (D43); one that is the
 * world's own is re-derived by whoever plans it.
 *
 * ⭐ Fast and slow are the same object: a riffle run is many short legs,
 * a spring breakup a few long ones with phases. Nothing here knows a rate.
 */

import { GeoPosition, type GeoPositionRecord } from './GeoPosition';
import type { FramePos } from './Frame';
import type { LinePositionRecord } from './LineFrame';

/** How a leg gets from its start to its end. */
export type LegKind = 'glide' | 'hold' | 'jump';

/** A position as stored: the chart's as a plain record. */
export type FramePosRecord =
  | { frame: 'chart'; at: GeoPositionRecord }
  | { frame: 'line'; at: LinePositionRecord };

/** One leg, as stored. */
export interface LegRecord {
  /** The frame's row path (the sea's expanse, a river's watercourse). */
  framePath: string;
  from: FramePosRecord;
  to: FramePosRecord;
  t0: number;
  t1: number;
  kind: LegKind;
}

/** A named moment on a trajectory, as stored. */
export interface MarkRecord {
  atS: number;
  /** What kind of moment (`stop`, `phase`, `arrived`, `boarding`…). */
  name: string;
  /** What is told when it comes, if anything. */
  words?: string;
  /** The phase it puts the mover in (D40), if any. */
  phase?: string;
  /** Anything the planner needs back at the mark (a stop's reason, a landing). */
  data?: Record<string, string>;
}

export interface TrajectoryRecord {
  legs: LegRecord[];
  marks: MarkRecord[];
}

/** Where a trajectory puts its mover at a time. */
export interface TrajectoryAt {
  framePath: string;
  pos: FramePos;
}

function toRecord(pos: FramePos): FramePosRecord {
  return pos.frame === 'chart'
    ? { frame: 'chart', at: pos.at.toJSON() }
    : { frame: 'line', at: { course: pos.at.course, km: pos.at.km, across: pos.at.across } };
}

function fromRecord(rec: FramePosRecord): FramePos {
  return rec.frame === 'chart'
    ? { frame: 'chart', at: new GeoPosition(rec.at) }
    : { frame: 'line', at: { ...rec.at } };
}

function lerp(a: FramePosRecord, b: FramePosRecord, f: number): FramePos {
  if (a.frame === 'chart' && b.frame === 'chart') {
    return { frame: 'chart', at: new GeoPosition(a.at).lerp(new GeoPosition(b.at), f) };
  }
  if (a.frame === 'line' && b.frame === 'line') {
    return {
      frame: 'line',
      at: { course: b.at.course, km: a.at.km + (b.at.km - a.at.km) * f, across: a.at.across + (b.at.across - a.at.across) * f },
    };
  }
  // A leg never spans two kinds of frame; read the nearer end.
  return fromRecord(f < 1 ? a : b);
}

export class Trajectory {
  private readonly legs: LegRecord[];
  private readonly marks: MarkRecord[];

  constructor(record: TrajectoryRecord) {
    this.legs = [...record.legs].sort((x, y) => x.t0 - y.t0);
    this.marks = [...record.marks].sort((x, y) => x.atS - y.atS);
  }

  toJSON(): TrajectoryRecord {
    return { legs: this.legs.map((l) => ({ ...l })), marks: this.marks.map((m) => ({ ...m })) };
  }

  getLegs(): readonly LegRecord[] {
    return this.legs;
  }

  getMarks(): readonly MarkRecord[] {
    return this.marks;
  }

  /** When it begins, game-seconds. */
  startsAtS(): number {
    return this.legs[0]?.t0 ?? this.marks[0]?.atS ?? 0;
  }

  /** When its last leg ends, game-seconds. */
  endsAtS(): number {
    const lastLeg = this.legs[this.legs.length - 1]?.t1 ?? Number.NEGATIVE_INFINITY;
    const lastMark = this.marks[this.marks.length - 1]?.atS ?? Number.NEGATIVE_INFINITY;
    return Math.max(lastLeg, lastMark);
  }

  /**
   * ⭐ Where it puts its mover at `tS`: before the first leg, at its start;
   * after the last, at its end; inside a leg, interpolated by its kind.
   */
  at(tS: number): TrajectoryAt | null {
    const legs = this.legs;
    if (legs.length === 0) return null;
    const first = legs[0]!;
    if (tS <= first.t0) return { framePath: first.framePath, pos: fromRecord(first.from) };
    for (const leg of legs) {
      if (tS > leg.t1) continue;
      if (tS < leg.t0) return { framePath: leg.framePath, pos: fromRecord(leg.from) };
      if (leg.kind === 'hold') return { framePath: leg.framePath, pos: fromRecord(leg.from) };
      if (leg.kind === 'jump') {
        return { framePath: leg.framePath, pos: fromRecord(tS >= leg.t1 ? leg.to : leg.from) };
      }
      const f = leg.t1 > leg.t0 ? (tS - leg.t0) / (leg.t1 - leg.t0) : 1;
      return { framePath: leg.framePath, pos: lerp(leg.from, leg.to, f) };
    }
    const last = legs[legs.length - 1]!;
    return { framePath: last.framePath, pos: fromRecord(last.to) };
  }

  /** The next leg boundary or mark strictly after `tS`, or `null` when none remains. */
  nextEventAfter(tS: number): number | null {
    let next = Number.POSITIVE_INFINITY;
    for (const l of this.legs) {
      if (l.t0 > tS) next = Math.min(next, l.t0);
      if (l.t1 > tS) next = Math.min(next, l.t1);
    }
    for (const m of this.marks) if (m.atS > tS) next = Math.min(next, m.atS);
    return Number.isFinite(next) ? next : null;
  }

  /** The marks in `(fromS, toS]`, in order — what a watch over that span passed. */
  marksBetween(fromS: number, toS: number): MarkRecord[] {
    return this.marks.filter((m) => m.atS > fromS && m.atS <= toS);
  }

  /** The phase the last phase-setting mark at or before `tS` put it in, or `null`. */
  phaseAt(tS: number): string | null {
    let phase: string | null = null;
    for (const m of this.marks) {
      if (m.atS > tS) break;
      if (m.phase !== undefined) phase = m.phase;
    }
    return phase;
  }

  /** The same trajectory, cut off at `tS` (a re-plan replaces what follows). */
  until(tS: number): Trajectory {
    const legs: LegRecord[] = [];
    for (const l of this.legs) {
      if (l.t0 >= tS) break;
      if (l.t1 <= tS) {
        legs.push({ ...l });
        continue;
      }
      const here = this.at(tS);
      legs.push({ ...l, t1: tS, to: here ? toRecord(here.pos) : l.to });
    }
    return new Trajectory({ legs, marks: this.marks.filter((m) => m.atS <= tS) });
  }
}

/** Builds a trajectory leg by leg from where its mover is: `new TrajectoryBuilder(frame, pos, t0)`. */
export class TrajectoryBuilder {
  private legs: LegRecord[] = [];
  private marks: MarkRecord[] = [];

  constructor(
    private framePath: string,
    private pos: FramePos,
    private t: number,
  ) {}

  /** Straight along the frame to `to`, arriving at `atS`. */
  glide(to: FramePos, atS: number): this {
    return this.leg('glide', to, atS);
  }

  /** Stay where it is until `atS`. */
  hold(untilS: number): this {
    return this.leg('hold', this.pos, untilS);
  }

  /** Be at `to` at `atS`, discontinuously — in `framePath` if it changes frame. */
  jump(to: FramePos, atS: number, framePath?: string): this {
    if (framePath !== undefined) this.framePath = framePath;
    return this.leg('jump', to, atS);
  }

  /** Change frame here, at the same moment (a river's mouth onto the sea's chart). */
  into(framePath: string, pos: FramePos): this {
    this.framePath = framePath;
    this.pos = pos;
    return this;
  }

  /** A named moment at `atS` (default: where the builder has got to). */
  mark(mark: Omit<MarkRecord, 'atS'> & { atS?: number }): this {
    this.marks.push({ ...mark, atS: mark.atS ?? this.t });
    return this;
  }

  /** Where the builder has got to, and when. */
  now(): { framePath: string; pos: FramePos; atS: number } {
    return { framePath: this.framePath, pos: this.pos, atS: this.t };
  }

  build(): Trajectory {
    return new Trajectory({ legs: this.legs, marks: this.marks });
  }

  private leg(kind: LegKind, to: FramePos, atS: number): this {
    const t1 = Math.max(this.t, atS);
    this.legs.push({ framePath: this.framePath, from: toRecord(this.pos), to: toRecord(to), t0: this.t, t1, kind });
    this.pos = to;
    this.t = t1;
    return this;
  }
}
