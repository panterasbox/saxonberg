/**
 * SeaZone — the zone of ONE sea room (river D38): minted with it, reaped
 * with it, its own instance under the kind row `/system/water/location/sea`.
 * A zone never changes at runtime; a sea room is its zone's only place.
 */

import CartesianZone from '@saxonberg/server/mud/platform/idea/location/CartesianZone';
import { MovingZoneMixin } from '@saxonberg/server/mud/lib/zone/MovingZone';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';

export default class SeaZone extends MovingZoneMixin(CartesianZone) {
  /** ⭐ The place IS the water within hail of her: the cell is the hail range. */
  public override getCellSize(): number {
    const place = this.getPlace();
    return place !== null && MixinApi.isMovingPlace(place) ? place.hailRangeM() : super.getCellSize();
  }
}
