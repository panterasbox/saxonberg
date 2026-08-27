/**
 * Dish — the edible output form: a plated serving whose bulk slot holds
 * the authored food Material (`CraftingLogic.applyEdibleOutput` fills it
 * at the recipe's portion), stamped with the maker's mark. The
 * `CraftedDrink` shape generalized to food: Bulkable routes `eat`/`drink`
 * through metabolism, {@link NutritionLabelMixin} renders the honest
 * macros, and `getLong()` appends the quality verdict — a felt, diegetic
 * difference, never a stat buff.
 */

import Thing from '../../lib/stuff/Thing';
import { BulkableMixin } from '../../lib/bulk/Bulkable';
import { DetailedMixin } from '../../lib/description/Detailed';
import { NutritionLabelMixin } from '../../lib/metabolism/NutritionLabel';
import { CraftedMixin, type Crafted } from '../../lib/craft/Crafted';

const DishBase = CraftedMixin(
  NutritionLabelMixin(BulkableMixin(DetailedMixin(Thing))),
);

export default class Dish extends DishBase {
  /** Append the quality verdict to the description (cast — see CraftedMixin). */
  override getLong(): string {
    const base = super.getLong();
    const verdict = (this as unknown as Crafted).renderVerdict();
    return `${base} ${verdict}`;
  }
}
