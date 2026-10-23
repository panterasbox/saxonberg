/**
 * SeaRoom — ⭐⭐ **the water beside a ship stopped at sea** (river D30).
 *
 * The sea is not content in the room sense: nothing is ever inside the
 * Greywater, and a ship under way is alongside nothing. But a ship that has
 * STOPPED has water beside her that a boat can be put into and a swimmer
 * can be in — this room. It is budded by the `SeaWarren` only where a ship
 * has stopped, keyed by the hail cell she lies in (ships stopped within
 * hail of one another share it), and reaped when nothing is left in it.
 *
 * It is the sea's version of a river's reach patch, and follows the same
 * rule: a boat is a thing in a water room; a swimmer is in it; the ways are
 * worked out when they are taken — to the deck of a ship still lying here,
 * or refused in words when she has gone.
 *
 * Its position is on the chart (it is `Positioned`), so the weather, the
 * sea's lean and `locate` read it like a craft.
 */

import Location from '@saxonberg/server/mud/platform/location/Location';
import { WarrenMemberMixin } from '@saxonberg/server/mud/lib/location/WarrenMember';
import { ShoreMixin } from '@saxonberg/server/mud/lib/location/Shore';
import { SwimmableMixin } from '@saxonberg/server/mud/lib/locomotion/Swimmable';
import { WaterPlaceMixin } from '@saxonberg/server/mud/lib/location/WaterPlace';
import { PositionedMixin } from '@saxonberg/server/mud/lib/expanse/Positioned';
import { MovingMixin } from '@saxonberg/server/mud/lib/expanse/Moving';
import { MovingPlaceMixin } from '@saxonberg/server/mud/lib/location/MovingPlace';
import type { ColumnBand } from '@saxonberg/server/mud/lib/location/WaterColumn';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Exitable } from '@saxonberg/server/mud/lib/boundary/Exitable';
import { NavigationApi } from '@saxonberg/server/mud/api/navigation';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';

export const SeaRoomBase = MovingPlaceMixin(
  WaterPlaceMixin(SwimmableMixin(ShoreMixin(MovingMixin(PositionedMixin(WarrenMemberMixin(Location)))))),
);

export default class SeaRoom extends SeaRoomBase {
  /** A sea room is gone when it is empty: there is nothing durable to name. */
  public override getDurableHandle(): string | null {
    return null;
  }

  /** ⭐ It holds where she lies: a ship stopped holds, and so does her water. */
  public override isUnderWay(): boolean {
    return false;
  }

  /**
   * The column under the open sea is not this build's: the water beside a
   * ship is the surface and what floats on it.
   */
  public override bandsNow(): ColumnBand[] {
    return [];
  }

  /**
   * ⭐ The ship this water lies beside (D30): the craft whose reckoning a
   * swimmer or a boat here reads (`locate`). The first whose deck a way
   * from here still reaches.
   */
  public alongsideCraft(): Stuff | null {
    const self = this as unknown as Stuff & Exitable;
    for (const exit of self.getExits().values()) {
      const way = exit as unknown as { getWay?(): string; getTarget?(): string };
      if (way.getWay?.() !== 'deck') continue;
      const ship = NavigationApi.structureAtNow(way.getTarget?.() ?? '');
      if (ship && MixinApi.isVoyaging(ship) && ship.getCourse() === null) return ship;
    }
    return null;
  }

  public override getShort(): string {
    return 'In the sea';
  }

  public override getLong(): string {
    const self = this as unknown as Stuff & { getContents(): Stuff[] };
    const lines = ['You are in the open sea, the swell lifting and dropping you, the hull beside you going up and down like a wall.'];
    const others = self.getContents().filter((c) => c.isAgent?.()).length;
    if (others > 1) lines.push('You are near enough to the others in the water to call to them.');
    return lines.join(' ');
  }
}
