/**
 * Crossing — the University Avenue street segment Gus guards. A plain
 * `CartesianLocation` with one bespoke behaviour: a **dynamic `tower`
 * detail** that reads the terminal's `ClockTower` fixture live and
 * appends its `currentReading()` to the authored base description.
 *
 * The seed `details:` layer only carries static strings, so the
 * drift-reveal (looking across the avenue at the accurate civic clock)
 * needs a class seam: `getDetail('tower')` composes the static base with
 * the tower's live time. It is a cross-object *read* by templatePath (the
 * `getMarkupLong`-recompute pattern the watch/tower use), NOT cross-room
 * perception. Degrades gracefully — if the tower isn't stood up, the
 * static base string is returned unchanged.
 */

import CartesianLocation from '../lib/location/CartesianLocation';
import { StuffApi } from '../api/stuff';
import { MixinApi } from '../api/mixin';
import type { DetailId } from '../lib/description/Detailed';
import type { SenseChannel } from '../lib/description/Perceiver';

/** The terminal clock the `tower` detail reads across the avenue. */
const TOWER_PATH = '/domain/terminus/terminal/clock-tower';

export default class Crossing extends CartesianLocation {
  /**
   * Read the live civic time off the terminal `ClockTower` fixture, or
   * `null` when it isn't stood up / can't be read.
   */
  private readTowerReading(): string | null {
    const tower = StuffApi.findByTemplatePath(TOWER_PATH);
    if (!tower || !MixinApi.isTimekeeping(tower)) return null;
    const reading = tower.currentReading();
    return reading ? reading.format() : null;
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
    if (id !== 'tower' || senseOrParent !== undefined) return base;
    const reading = this.readTowerReading();
    if (!reading) return base;
    const live = `Across the avenue, the terminal clock tower reads ${reading}.`;
    return base ? `${base} ${live}` : live;
  }
}
