/**
 * ClockTower — the accurate civic sibling of the drifting `Watch`. A
 * fixture on the terminal exterior whose face reads game-time straight
 * off `WorldClockApi`, so it *cannot* drift: no `setTo`/`setAt`/`rate`,
 * no mainspring, no lid. It is the fixed point the pocket watch disagrees
 * with — `look tower` shows true time, the watch shows a few minutes off.
 *
 * Composition: `Timekeeping` over a `Thing` (its `Visible`/`Tangible`
 * come from `Thing`). Home is `obj/` — it is a seeded fixture, not a
 * `Location`.
 */

import Thing from '../lib/stuff/Thing';
import { TimekeepingMixin } from '../lib/time/Timekeeping';
import { Time } from '../lib/time/Time';
import { DefaultCalendar } from '../lib/time/DefaultCalendar';
import { StuffApi } from '../api/stuff';
import { WorldClockApi } from '../api/worldclock';
import { TemplatePaths } from '../lib/paths';

const ClockTowerBase = TimekeepingMixin(Thing);

export default class ClockTower extends ClockTowerBase {
  /**
   * True civic time — the minute-of-day of the world clock. Null only
   * when no world clock is running (a bare test harness); in a live
   * world it is effectively never null and never drifts.
   */
  override currentReading(): Time | null {
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
      return null;
    }
    const date = DefaultCalendar.singleton().decompose(WorldClockApi.getNow());
    return Time.ofHourMinute(date.hour, date.minute);
  }

  /**
   * Dynamic long description — recomputed each look. Renders the live
   * civic time on the tower face.
   */
  override getLong(): string {
    const reading = this.currentReading();
    const base = super.getLong();
    if (reading === null) {
      return base;
    }
    return `${base} The tower clock reads ${reading.format()}.`;
  }
}
