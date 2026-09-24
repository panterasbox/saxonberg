/**
 * Crossing — the University Avenue street segment Gus guards. A
 * {@link Street} with one bespoke behaviour: a **dynamic `tower`
 * detail** that reports the accurate civic time on the terminal clock
 * tower across the avenue.
 *
 * ⭐ It is a `Street` rather than a plain location because its row
 * declares `publicLighting:` — the avenue association pays for this
 * one, which is what the drive stands on to prove a funded street goes
 * dark when the town cannot pay.
 *
 * The tower itself is prose (there is no `ClockTower` Stuff) — its face
 * only ever reads world-time, so the detail reads `WorldClockApi`
 * directly (formatted via `DefaultCalendar`) and appends it to the
 * authored static base. The reveal is the drift: Gus's pocket watch runs
 * a touch slow, so it disagrees with this honest civic hour. Degrades
 * gracefully — if no world clock is running / the time can't be read, the
 * static base string is returned unchanged.
 */

import Street from './Street';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { DefaultCalendar } from '../../lib/time/DefaultCalendar';
import { Time } from '../../lib/time/Time';
import { TemplatePaths } from '../../lib/paths';
import type { DetailId } from '../../lib/description/Detailed';
import type { SenseChannel } from '../../lib/description/Perceiver';

export default class Crossing extends Street {
  /**
   * The accurate civic time on the tower face — world-time-of-day
   * formatted `HH:MM`, or `null` when no world clock is running (a bare
   * test harness).
   */
  private readTowerReading(): string | null {
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
      return null;
    }
    const date = DefaultCalendar.singleton().decompose(WorldClockApi.getNow());
    return Time.ofHourMinute(date.hour, date.minute).format();
  }

  /**
   * Augment the `tower` detail with the live civic clock reading on a
   * plain vision look. All other details (and non-vision senses) fall
   * straight through to the authored static strings.
   */
  override getDetail(
    id: DetailId,
    senseOrParent?: SenseChannel | DetailId,
    parent?: DetailId,
  ): string | null {
    const base = super.getDetail(id, senseOrParent as SenseChannel, parent);
    // ⚠⚠ `'vision'`, not `undefined`. `look tower` routes through
    // `getDetailFor(viewer, id)`, which defaults `sense` to `'vision'` —
    // so this guard returned the static text EVERY TIME and the live
    // clock reading has never rendered since the day it shipped. Found
    // by the envelope drive, whose street-lamp detail was written from
    // this file and inherited the bug.
    const visual = senseOrParent === undefined || senseOrParent === 'vision';
    if (id !== 'tower' || !visual) return base;
    const reading = this.readTowerReading();
    if (!reading) return base;
    const live = `Across the avenue, the terminal clock tower reads ${reading}.`;
    return base ? `${base} ${live}` : live;
  }
}
