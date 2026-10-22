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
 */

import type { MixinConstructor } from '../mixin';

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

export interface LineFrame {
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

export function LineFrameMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class LineFrameMixin extends Base implements LineFrame {
    static _mixinName: string = 'LineFrameMixin';

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
