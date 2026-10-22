/**
 * SeaZone — the zone of ONE sea room (river D38): minted with it, reaped
 * with it, its own instance under the kind row `/system/water/location/sea`.
 * A zone never changes at runtime; a sea room is its zone's only place.
 */

import CartesianZone from '@saxonberg/server/mud/platform/idea/location/CartesianZone';
import { MovingZoneMixin } from '@saxonberg/server/mud/lib/zone/MovingZone';

export default class SeaZone extends MovingZoneMixin(CartesianZone) {
  /** ⭐ The room IS the water within hail of her: the cell is the hail range. */
  public override getCellSize(): number {
    const place = this.getPlace() as unknown as { hailRangeM?(): number } | null;
    return place?.hailRangeM?.() ?? super.getCellSize();
  }
}
