/**
 * Building — what a building ROW names: one {@link BuildingBase} per row
 * (a `Singleton` keyed by the row's path) — the cottage, the chandlery,
 * the light on Gannet Rock (paint review, 2026-11-02).
 *
 * Everything a building IS is the base's (`lib/structure/Building`): a
 * structure with a face and a condition. This twin adds only persistence,
 * and ⭐ only once it is SOLD (D7): a staged building writes no record and
 * comes back as its row authored it whenever the world restages; an owned
 * one keeps its coats and condition.
 */

import BuildingBase from '../../lib/structure/Building';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import { PersistableMixin } from '../../lib/persistence/Persistable';

export const BUILDING_CLASS_PATH = '/platform/idea/Building';

export default class Building extends PersistableMixin(SingletonMixin(BuildingBase)) {
  /** ⭐ The coats and condition are kept only once it is sold (D7). */
  public override persistsCoats(): boolean {
    return this.isTitleSold();
  }

  public override shouldPersist(): boolean {
    return super.shouldPersist() && this.isTitleSold();
  }
}
