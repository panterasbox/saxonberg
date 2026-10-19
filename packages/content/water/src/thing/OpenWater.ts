/**
 * OpenWater — ⭐ **the floor of a band in mid-water: nothing** (underwater
 * D8).
 *
 * A band of a column is a place you are IN, not one you stand in: there
 * is water under you all the way to the bed. It is still a FLOOR — the
 * support protocol is what every posture verb asks, so `sit` and `lie`
 * refuse here in physics words rather than failing to find the ground —
 * and it answers that protocol the way open water does: it bears nobody,
 * standing would be a slot you hold, and none of it is solid.
 *
 * ⚠ Never `noDefaultFloor` on a band. That flag is the void's: a room
 * with no floor at all fails the binder generically (*"there is no
 * ground"*), and a diver mid-water is owed the reason.
 */

import FloorBase from '@saxonberg/server/mud/platform/thing/Floor';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Slottable } from '@saxonberg/server/mud/lib/slot/Slottable';

/** The posture-bearing slot a floor offers. */
const GROUND_SLOT = 'ground:1';

export default class OpenWater extends FloorBase {
  /** Nothing under you but water: it bears nothing at all. */
  public override bears(_loadKg: number): boolean {
    return false;
  }

  public override supportIsSlotted(): boolean {
    return true;
  }

  public override openWaterAreaM2(): number {
    return 1;
  }

  public override canOccupy(candidate: Stuff & Slottable, slot: string): boolean {
    if (slot === GROUND_SLOT) return false;
    return super.canOccupy(candidate, slot);
  }

  public override canOccupyReason(candidate: Stuff & Slottable, slot: string): string | null {
    if (slot === GROUND_SLOT) return 'There is nothing under you but water.';
    return super.canOccupyReason(candidate, slot);
  }

  /** You are already in the water: there is nothing to give way. */
  public override giveWay(_occupant: Stuff, _deliberate = false): boolean {
    return false;
  }

  public override reconcileSupport(): void {
    /* nobody is held up here to let go of */
  }
}
