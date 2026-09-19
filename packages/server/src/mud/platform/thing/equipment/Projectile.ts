/**
 * Projectile — ammunition: an arrow, a bolt, a musket ball.
 *
 * ⭐ **A stackable, because that is what ammunition IS.** You do not carry
 * one arrow; you carry a score of them and you count down. The
 * `Coin = StackableMixin(Thing)` shape, exactly — one row, one quantity,
 * and `shoot` spends one.
 *
 * ⚠ It is deliberately NOT a `Weapon`. An arrow in your hand is not a
 * weapon you fight with; it is a consumable the launcher uses, and
 * `lint:inert-weapon` would rightly object to a `Weapon` row with no
 * melee delivery.
 *
 * ⭐⭐ **`calibre` is the one field this class adds**, and it is what makes
 * the whole tech curve work. `DeliveryProfile` derives `penetration` from
 * energy over cross-section, so an author writes the diameter of the
 * thing — a physical fact they would write anyway — and armour answers
 * the pressure. Nobody maintains an "armour-piercing" number by hand.
 */

import Thing from '../../../lib/stuff/Thing';
import { StackableMixin } from '../../../lib/stuff/Stackable';
import { Quantity } from '../../../lib/quantity';
import type { FieldMeta } from '../../../lib/mixin';

const ProjectileBase = StackableMixin(Thing);

export default class Projectile extends ProjectileBase {
  static fieldMeta: FieldMeta = {
    calibre: { persistent: true, authorable: true },
  };

  /**
   * The diameter of the face that meets the target (m). Read by
   * `DeliveryProfile.derive` as `calibreM` — see the class doc.
   */
  public calibre: Quantity<'m'> = Quantity.of(0, 'm');

  public getCalibre(): Quantity<'m'> {
    return this.calibre;
  }
}
