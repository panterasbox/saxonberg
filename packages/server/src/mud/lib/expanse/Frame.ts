/**
 * Frame — ⭐ **what a craft is positioned in, and the one protocol it talks
 * to** (river review, W7). Two frames ship: the sea's CHART (`Expanse` —
 * lat/lon, a course is a bearing, bands set her about, she can be lost)
 * and a river's LINE (`LineFrameMixin` — km from the mouth, a course is a
 * direction worked out stretch by stretch as a passage, she always knows
 * where she is).
 *
 * The craft (`Voyaging`) never branches on which it is in: it asks its
 * frame to plan a course — which comes back as a TRAJECTORY she follows
 * (W10, W11), so where she is at a time is read off that, never off the
 * frame — and what a watch brought: what changed, how far she came, and
 * the stop if one has come.
 * What drives her (`burnFor`), how she floats (`hullNow`) and what a stop
 * does to her (`onStop`) are the craft's, on either frame.
 *
 * ⭐ The one deliberately chart-only surface is the navigator's PLOT
 * (`Voyaging.reckonedNow`, fixes): on a line you always know where you
 * are, so there is nothing to reckon — `Frame.reckons()` says which.
 */

import type { Stuff } from '../stuff/Stuff';
import type { GeoPosition } from './GeoPosition';
import type { LinePositionRecord } from './LineFrame';
import type { CourseRecord, HullNow } from './Voyaging';
import type { Craft } from './Voyage';
import type { Trajectory } from './Trajectory';

/** Where a craft is, in the frame it is in. */
export type FramePos =
  | { frame: 'chart'; at: GeoPosition }
  | { frame: 'line'; at: LinePositionRecord };

/**
 * What a course is asked for, in either frame: a speed through the water,
 * and where to — a node or a landing (`toward`), a bearing on the chart, a
 * direction on a line. Each frame reads the parts it has words for.
 */
export interface CourseRequest {
  speedKn: number;
  /** A node (chart) or a landing (line) by path, or `null` for none. */
  toward?: string | null;
  /** On the chart: the bearing to steer. */
  bearingDeg?: number;
  /** On a line: which way. */
  direction?: 'upstream' | 'downstream';
  /** On a line: through snag water, no faster than the water can be read. */
  slow?: boolean;
}

/** Why a course has come to an end, and where she lies. */
export interface CraftStop {
  /** `arrived` (a node), `landing`, `aground`, `holed`, `snags`, `stemmed`, `falls`, `mouth`, `head`. */
  reason: string;
  words: string;
  at: FramePos;
  /** The landing she came in at, when she did. */
  landing?: string;
}

/** What one watch brought. */
export interface WatchReport {
  /** What changed, in order, in words. */
  told: string[];
  /** How far she came since the last watch, km. */
  distanceKm: number;
  /** The end of her course, when it has come. */
  stop: CraftStop | null;
}

/** The geography at a position on a frame (river D44) — what a moving zone answers. */
export interface FrameSite {
  elevation: number | null;
  address: string | null;
  latitude: number | null;
  continentality: number | null;
  climateOffsetK: number | null;
}

export interface Frame {
  /** The frame's row path — what a position names. */
  getTemplatePath(): string | null;
  /** Can a craft in this frame be out of her reckoning? (The chart yes; a line never.) */
  reckons(): boolean;
  /** How long a watch is here, game seconds. */
  watchIntervalS(): number;
  /** Have what positions read loaded (the chart's bands); a line has nothing to load. */
  ready(): Promise<void>;
  /**
   * A craft in this frame is loaded or under way: the frame takes note of
   * it (the chart keeps the craft it can be seen among). Never awaits a
   * compile — a ship restored during her sea's compile would wait on it.
   */
  adopt(craft: Craft): void;
  /**
   * ⭐ Turn a request into a course from where she is now, and the
   * TRAJECTORY she will follow on it (W10, W11) — or the frame's refusal,
   * in its words. The trajectory carries everything the frame knows at the
   * moment the course is set: where she will be when, and the stop (a
   * landing, the ground, a node raised) as a mark.
   */
  planCourse(
    craft: Craft,
    req: CourseRequest,
    hull: HullNow,
    nowS: number,
  ): Promise<{ course: CourseRecord; trajectory: Trajectory } | { refused: string }>;
  /** ⭐ The geography at a position on this frame (D44): elevation, address, climate. */
  siteAt(pos: FramePos): FrameSite | null;
  /** ⭐ One watch, `fromS` to `toS`: what changed, how far she came, and the stop if it has come. */
  watchCraft(craft: Craft, fromS: number, toS: number): Promise<WatchReport>;
}

/** A frame, by shape — what `Voyaging.peekFrame` narrows a resident row to. */
export type FrameStuff = Stuff & Frame;
