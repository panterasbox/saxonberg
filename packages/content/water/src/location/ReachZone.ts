/**
 * ReachZone — ⭐ **the zone of one place on a river's line** (river D38).
 *
 * A reach patch and a stop each get their own: minted with the place,
 * reaped with it, its identity fixed for the place's life, its geography
 * (elevation, the address of the ground that drains there, the climate)
 * read off the place's position on the line each time it is asked. The
 * kind rows (`reach/patch`, `reach/stop`) stand empty as the path
 * resolver's answer for their directories; every instance is minted from
 * them.
 */

import CartesianZone from '@saxonberg/server/mud/platform/idea/location/CartesianZone';
import { MovingZoneMixin } from '@saxonberg/server/mud/lib/zone/MovingZone';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';

export default class ReachZone extends MovingZoneMixin(CartesianZone) {
  /**
   * ⭐ The room IS the water within hail: the cell is the place's hail
   * range, so the ranged band ladder and the light read the right size.
   */
  public override getCellSize(): number {
    const place = this.getPlace();
    return place !== null && MixinApi.isMovingPlace(place) ? place.hailRangeM() : super.getCellSize();
  }
}
