/**
 * Seed — a discrete `Thing` naming the plant template it grows into.
 *
 * Bought at a store, or set by a flowering plant; consumed by `plant`,
 * which mints `growsIntoPath` into the pot's slot. It carries **no
 * inherited variation** — a seed grows into its parent's species, full
 * stop. Genetics (a `Genome`, cross-pollination, segregating lines) is
 * farming-slate work, and it is what makes `Globbable` seed *lots*
 * meaningful; until then a seed is **discrete, never a stack**, matching
 * the general store's stated convention that its goods are all discrete
 * Things so each carries a chattel stamp on buy.
 *
 * See [docs/subsystems/husbandry.md].
 */

import Thing from "../../lib/stuff/Thing";
import { DetailedMixin } from "../../lib/description/Detailed";
import { PlantableMixin } from "../../lib/husbandry/Plantable";
import type { FieldMeta } from "../../lib/mixin";

// ⭐ `PlantableMixin` carries `growsIntoPath` and the plantable
// capability. A seed is the first plantable thing, not the definition of
// one — a cutting / tuber / bulb composes the same mixin rather than
// extending this class. See lib/husbandry/Plantable.ts.
const SeedBase = PlantableMixin(DetailedMixin(Thing));

export default class Seed extends SeedBase {
  static fieldMeta: FieldMeta = {
    _speciesPath: { persistent: true, authorable: true, authorPicker: 'Species' },
  };

  /**
   * The species this seed belongs to — its own description's business,
   * distinct from the plant template it grows into.
   */
  public _speciesPath: string | null = null;

  public getSpeciesPath(): string | null {
    return this._speciesPath;
  }

  public setSpeciesPath(value: string | null): void {
    this._speciesPath = value;
  }
}
