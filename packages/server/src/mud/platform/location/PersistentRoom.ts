/**
 * PersistentRoom — ⭐ **the interior somebody furnishes**: a kept room, one
 * of many (a bathroom per unit, a dorm room per student, a Hinkley house's
 * rooms per lot). A `PersistentLocation` — the posting, the warren's
 * population, the record per holding — that is a {@link Room}: plumbed,
 * and roofed in its walls unless its row says otherwise.
 *
 * ⚠ It extends `PersistentLocation`, not `Room`, because the kept branch
 * carries substrate of its own; the room's construction rule is
 * the construction mixin's `roofOverWalls()`, shared rather than re-stated.
 */

import PersistentLocation from './PersistentLocation';
import { PlumbedMixin } from '../../lib/supply/Plumbed';
import type { RoofSpec } from '../../lib/spatial/Enclosed';

export default class PersistentRoom extends PlumbedMixin(PersistentLocation) {
  /** Roofed in its walls unless the row says otherwise ({@link Room}). */
  public override roofDefaults(): RoofSpec | null {
    return this.roofOverWalls();
  }
}
