/**
 * Clade — taxonomic scope unit.
 *
 * `Clade` is the canonical first non-spatial Zone subclass: it inherits
 * the folder-of-templates contract from `Zone` (so Species templates
 * live under Clade folders, e.g. `/stuff/idea/species/animalia/.../sapiens`)
 * but does NOT inherit any spatial behavior. A Clade has no Set of
 * Locations, no `deriveExit`; its members are `Species`.
 *
 * Why bare-`Zone` and not `SpatialZone`: `Stuff.zone` is the nearest
 * spatial zone, not a generic folder reference. Clades participate
 * in the folder/leaf invariant
 * (`ZoneApi.isFolderClass('/platform/idea/species/Clade')` returns true via
 * `prototype instanceof Zone`) but `ZoneApi.isSpatialZoneClass`
 * returns false — so a species member's `Stuff.zone` reads `null`
 * instead of pointing at its kingdom.
 *
 * v1 ships kingdom-rank Clades only (Animalia, Plantae, Fungi,
 * Constructa). Sub-clades, family ranks, and per-Clade defaults
 * (inheritable body plan) are deferred to follow-on builds.
 *
 * Singleton-by-templatePath: every `/stuff/idea/species/<kingdom>` template
 * resolves to the same instance via `StuffApi.singleton(path)`.
 */

import { Zone } from '../../../lib/zone/Zone';
import { SingletonMixin } from '../../../lib/stuff/Singleton';
import type Species from './Species';
import type { VetoResult } from '../../../lib/errors';
import type { FieldMeta } from '../../../lib/mixin';

/** Taxonomic ranks the v1 build recognizes. */
export type CladeRank =
  | 'kingdom'
  | 'phylum'
  | 'class'
  | 'order'
  | 'family'
  | 'genus'
  | 'species';

// ⭐⭐ **NOT `PropertiedMixin`, and it was here until the base-class
// narrowing (2026-09-30).** `Propertied` is a per-INSTANCE bag of
// runtime state — a quest flag, a buff, a circle membership — and this
// class is a `Singleton`: one instance for the whole world, shared by
// every holder of the thing it describes. A prop set on `oak` would be
// a prop on every oak there has ever been, which is not a per-instance
// store; it is a global with extra steps.
//
// ⭐ The tell was already written down. `race.md:280-290` records that
// it was composed for *"per-material damage resistance as
// content-defined prop keys … accessors removed until combat lands"* —
// and when combat landed, materials-response shipped resistance as
// FIRST-CLASS FIELDS instead. The mixin outlived the design that asked
// for it by two builds.
//
// ⚠ Verified empty, not merely unauthored: every `setProp` / `getProp`
// / `initProp` / `maskProp` receiver in the tree is a person
// (`BankingLogic`), an actor (`Climbable`/`Flyable`/`Swimmable`), a
// slot occupant (`Drivable`) or `EventRegistry` itself. None is a
// reference singleton.
export default class Clade extends SingletonMixin(Zone) {
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

  static fieldMeta: FieldMeta = {
    name: { persistent: true },
    rank: { persistent: true },
  };

  public getRank(): CladeRank { return this.rank; }
  public setRank(value: CladeRank): void { this.rank = value; }

  public getSpecies(): ReadonlySet<Species> { return this.species; }

  public addSpecies(s: Species): void { this.species.add(s); }

  public removeSpecies(s: Species): boolean {
    return this.species.delete(s);
  }

  /**
   * Clades are bootstrap-pinned singletons. `SpeciesApi.isAnimate` /
   * `getKingdom` walk ancestor template paths via sync
   * `findByTemplatePath` and assume the clade singletons stay live —
   * destroying one mid-session would silently break every
   * `requiresAnimate`-gated verb. Refuse destruct unconditionally;
   * `forceDestruct` (admin-gated) is the escape hatch.
   */
  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        `clade '${this.getName()}' is a system singleton and cannot ` +
        `be destructed; use forceDestruct (admin-gated) if you really mean it`,
    };
  }
}
