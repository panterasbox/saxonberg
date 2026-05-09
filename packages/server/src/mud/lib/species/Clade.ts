/**
 * Clade — taxonomic scope unit.
 *
 * `Clade` is the canonical first non-spatial Zone subclass: it inherits
 * the folder-of-templates contract from `Zone` (so Species templates
 * live under Clade folders, e.g. `/obj/species/animalia/.../sapiens`)
 * but does NOT inherit any spatial behavior. A Clade has no Set of
 * Locations, no `deriveExit`; its members are `Species`.
 *
 * Why bare-`Zone` and not `SpatialZone`: the race-slate-locked
 * decision is "Stuff.zone is the nearest spatial zone, not a generic
 * folder reference." Clades participate in the folder/leaf invariant
 * (they're in `FOLDER_CLASS_PATHS`) but are deliberately excluded from
 * `SPATIAL_ZONE_CLASS_PATHS` so a species member's `Stuff.zone` reads
 * `null` instead of pointing at its kingdom.
 *
 * v1 ships kingdom-rank Clades only (Animalia, Plantae, Fungi,
 * Constructa). Sub-clades, family ranks, and per-Clade defaults
 * (inheritable body plan) are deferred to follow-on builds.
 *
 * Singleton-by-templatePath: every `/obj/species/<kingdom>` template
 * resolves to the same instance via `StuffApi.singleton(path)`.
 */

import { Zone } from '../spatial/Zone';
import { SingletonMixin } from '../stuff/Singleton';
import type { Species } from './Species';

/** Taxonomic ranks the v1 build recognizes. */
export type CladeRank =
  | 'kingdom'
  | 'phylum'
  | 'class'
  | 'order'
  | 'family'
  | 'genus'
  | 'species';

export class Clade extends SingletonMixin(Zone) {
  /**
   * Taxonomic rank. v1 only seeds `'kingdom'`; sub-rank Clades land
   * with the family/order trees.
   */
  protected rank: CladeRank = 'kingdom';

  /**
   * Runtime-only members: Species singletons that name this Clade as
   * an ancestor in their template path. Populated as Species templates
   * load and call `addSpecies`. Not persisted (the template tree is
   * authoritative).
   */
  protected species: Set<Species> = new Set();

  static persistentFields = ['name', 'rank'];

  public getRank(): CladeRank { return this.rank; }
  public setRank(value: CladeRank): void { this.rank = value; }

  public getSpecies(): ReadonlySet<Species> { return this.species; }

  public addSpecies(s: Species): void { this.species.add(s); }

  public removeSpecies(s: Species): boolean {
    return this.species.delete(s);
  }

  /**
   * Refuse to destruct a Clade with live Species members. Drain the
   * member Species (destruct or relocate) first. Same shape as
   * `SpatialZone.prepareDestroy`.
   */
  protected override prepareDestroy(): void {
    if (this.species.size > 0) {
      throw new Error(
        `Clade.prepareDestroy: cannot destruct clade '${this.getName()}' with ` +
          `${this.species.size} live species member(s); destruct or relocate first.`
      );
    }
  }
}
