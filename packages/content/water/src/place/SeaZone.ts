/**
 * SeaZone — the zone of ONE sea room (river D38): minted with it, reaped
 * with it, its own instance under the kind row `/system/water/place/sea`.
 * A zone never changes at runtime; a sea room is its zone's only place.
 */

import MintedZone from '@saxonberg/server/mud/platform/idea/place/MintedZone';
import { MovingZoneMixin } from '@saxonberg/server/mud/lib/zone/MovingZone';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';

export default class SeaZone extends MovingZoneMixin(MintedZone) {
  /** ⭐ The place IS the water within hail of her: the cell is the hail range. */
  public override getCellSize(): number {
    const place = this.getPlace();
    return place !== null && MixinApi.isMovingPlace(place) ? place.hailRangeM() : super.getCellSize();
  }
}
