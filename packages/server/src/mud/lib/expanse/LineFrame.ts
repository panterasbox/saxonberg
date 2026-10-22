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

export interface LineFrame {
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
}

export function LineFrameMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class LineFrameMixin extends Base implements LineFrame {
    static _mixinName: string = 'LineFrameMixin';

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
  };
}
