/**
 * WaterColumnMixin — ⭐ **this Idea grows the water under a deep water**
 * (underwater D5).
 *
 * A water place deeper than you can stand in has a column under it: lit,
 * dark and the bed, budded on first traversal. The kernel knows a water
 * place is deep (`WaterPlace.bandsNow()`); it does not know how a column
 * is built — the water pack's `ColumnWarren` does, and must not be
 * imported. This is the seam between them, the `WaterSource` shape one
 * subsystem over: the kernel declares the capability, the pack's
 * singleton implements it, and a water place finds it by path
 * (`TemplatePaths.waterColumn`).
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';

/**
 * One band of a column, top to bottom. ⭐ The dark repeats in deep water
 * (underwater review): `dark`, then `dark-2`, `dark-3`… — one about every
 * atmosphere, to a cap, so a deep water has places to STOP on the way
 * without becoming a hundred rooms. The meters between them are paid in
 * the swim, not in rooms.
 */
export type ColumnBand = 'lit' | 'dark' | `dark-${number}` | 'bed';

/** The band KINDS, surface downward — what a band's row is. */
export const COLUMN_BANDS: readonly ColumnBand[] = ['lit', 'dark', 'bed'];

/** Public shape added by WaterColumnMixin. */
export interface WaterColumn {
  /**
   * Give `surface` its way down (the `down` exit into the first band),
   * when it has a column and no way down yet.
   */
  ensureColumnExits(surface: Stuff & Container): Promise<void>;
  /** The band `band` of `surface`'s column, budded if need be; null when it has none. */
  bandOf(surface: Stuff & Container, band: ColumnBand): Promise<(Stuff & Container) | null>;
}

export function WaterColumnMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class WaterColumnMixin extends Base implements WaterColumn {
    static _mixinName: string = 'WaterColumnMixin';

    /** @hook Override on the composing Idea. Default: no column. */
    public async ensureColumnExits(surface: Stuff & Container): Promise<void> {
      void surface;
    }

    /** @hook Override on the composing Idea. Default: no column. */
    public async bandOf(
      surface: Stuff & Container,
      band: ColumnBand,
    ): Promise<(Stuff & Container) | null> {
      void surface;
      void band;
      return null;
    }
  };
}
