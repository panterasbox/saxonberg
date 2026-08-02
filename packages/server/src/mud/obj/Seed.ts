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

import Thing from "../lib/stuff/Thing";
import { DetailedMixin } from "../lib/description/Detailed";
import type { FieldMeta } from "../lib/mixin";

const SeedBase = DetailedMixin(Thing);

export default class Seed extends SeedBase {
  static fieldMeta: FieldMeta = {
    growsIntoPath: { persistent: true },
    _speciesPath: { persistent: true },
  };

  /**
   * The `/obj/plant/…` template this seed mints when planted.
   *
   * @authorable ref:Template
   */
  public growsIntoPath: string | null = null;

  /**
   * The species this seed belongs to — its own description's business,
   * distinct from the plant template it grows into.
   *
   * @authorable ref:Species
   */
  public _speciesPath: string | null = null;

  public getGrowsIntoPath(): string | null {
    return this.growsIntoPath;
  }

  public setGrowsIntoPath(value: string | null): void {
    this.growsIntoPath = value;
  }

  public getSpeciesPath(): string | null {
    return this._speciesPath;
  }

  public setSpeciesPath(value: string | null): void {
    this._speciesPath = value;
  }
}
