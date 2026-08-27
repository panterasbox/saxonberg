/**
 * CraftedDrink — the output form of a cocktail craft: a glass that holds the
 * drink and carries the maker's mark.
 *
 * `CraftedMixin(BulkableMixin(DetailedMixin(Thing)))` — Bulkable (it holds
 * the mixed liquid, which `drink`/`sip` route to metabolism) + Crafted (the
 * per-instance maker/grade/recipe stamp). Authored empty as a recipe's
 * `outputTemplate`; `CraftingLogic` clones it, fills the bulk slot with the
 * cocktail Material, and stamps it.
 *
 * `getLong()` appends the Dwarf-Fortress quality verdict (band-word + prose
 * + maker) — never a number.
 */

import Thing from '../../lib/stuff/Thing';
import { BulkableMixin } from '../../lib/bulk/Bulkable';
import { DetailedMixin } from '../../lib/description/Detailed';
import { CraftedMixin, type Crafted } from '../../lib/craft/Crafted';

const CraftedDrinkBase = CraftedMixin(BulkableMixin(DetailedMixin(Thing)));

export default class CraftedDrink extends CraftedDrinkBase {
  /** Append the quality verdict to the description (cast — see CraftedMixin). */
  override getLong(): string {
    const base = super.getLong();
    const verdict = (this as unknown as Crafted).renderVerdict();
    return `${base} ${verdict}`;
  }
}
