/**
 * IceBlock — a piece of ice you can carry: a squared block cut from a
 * sheet or set in an ice pan, or a lump a pail froze into. ⭐ Both the
 * `ice-block` and the `ice-lump` rows name this class — a lump is ice, so
 * it claims no temper, melts through the shipped plateau like any
 * `Casting`, and (from W2) pools in a store by its grade.
 *
 * `iceQuality` is the grade the trade sold by: **black** (clear, hard,
 * frozen under bare sky), **snow-ice** (frozen under snow, white and
 * soft), or **cloudy** (pan ice — the DEFAULT, because a block that was
 * not cut from a sheet set in a pan or a pail, and the freeze needs no
 * hook to say so). The cut stamps the patch's grade (storage-and-ice D17).
 */

import type { FieldMeta } from '../../lib/mixin';
import Casting from './Casting';

/** The grade natural ice was sold by. Closed: the trade's three words. */
export type IceQuality = 'black' | 'snow-ice' | 'cloudy';

/** The three grades, in the order the trade priced them. */
export const ICE_QUALITIES: readonly IceQuality[] = ['black', 'snow-ice', 'cloudy'];

export default class IceBlock extends Casting {
  static fieldMeta: FieldMeta = {
    iceQuality: { persistent: true, authorable: true },
  };

  public iceQuality: IceQuality = 'cloudy';

  /** The grade this ice was cut or set at. */
  public getIceQuality(): IceQuality {
    return this.iceQuality;
  }

  /** Stamp the grade (a cut stamps its patch's). Unknown words read cloudy. */
  public setIceQuality(quality: IceQuality): void {
    this.iceQuality = ICE_QUALITIES.includes(quality) ? quality : 'cloudy';
  }
}
