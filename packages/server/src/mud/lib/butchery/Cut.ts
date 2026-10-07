/**
 * CutMixin — a piece of meat that knows which muscles it is.
 *
 * ⭐⭐⭐ **A cut CLAIMS tissues, and everything about it derives from the
 * claim.** A porterhouse is a tenderloin and a strip loin, so `tissues`
 * is two entries and nothing special-cases it. Its texture is the
 * share-weighted mean of its muscles' `work`; its mass is the summed
 * share of those muscles times the carcass's own mass. ⚠ **Neither is
 * authorable**, which is the point: an author cannot ship a tender shank
 * or a two-kilo hen.
 *
 * ⭐⭐ **This is also what makes a cut's mass right across species
 * without authoring a number twice.** The same `shoulder` row off a 78 kg
 * ewe and a 700 kg ox weighs what each animal's shoulder weighs, because
 * the share is the body plan's and the mass is the animal's.
 *
 * **Why on its own class and not on `Provision`.** A loaf claims no
 * muscles. A `tissues` field on `Provision` would be a claim about bread,
 * and every reader would guard on "is this meat" — the wrong-host tell.
 *
 * ⚠ The twin is `platform/thing/Cut`, composing on `Provision`, so a cut
 * inherits Freshness, WaterActivity, Contaminable, ThermalDose, Crafted,
 * Composed and Sampled — everything meat already needed, and nothing new
 * on any other host.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Difficulty } from '../advancement/ActSignature';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import type Species from '../../platform/idea/species/Species';
import { Texture, type TextureBand } from './Texture';

/** How deep into a carcass a cut needs the tools to go (D6). */
export const CUT_DEPTHS = ['boneless', 'bone-in', 'chop'] as const;
export type CutDepth = (typeof CUT_DEPTHS)[number];

/** The narrowed surface `MixinApi.isCut` threads into a call site. */
export interface Cut {
  getTissues(): readonly string[];
  getCutting(): CutDepth;
  getDifficulty(): Difficulty;
  getSpeciesPath(): string | null;
  setSpeciesPath(path: string | null): void;
  isDamaged(): boolean;
  setDamaged(damaged: boolean): void;
  /** Share-weighted mean of the claimed muscles' `work`, or `null`. */
  getToughness(): number | null;
  /** The band that toughness reads as, or `null` when there is no muscle. */
  textureBand(): TextureBand | null;
}

export function CutMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class CutMixin extends Base {
    static _mixinName: string = 'CutMixin';
    static fieldMeta: FieldMeta = {
      tissues: { persistent: true, authorable: true, ref: 'identity' },
      cutting: { persistent: true, authorable: true },
      difficulty: { persistent: true, authorable: true },
      _speciesPath: { persistent: true, ref: 'identity' },
      damaged: { persistent: true },
    };

    /**
     * The tissue materials this cut takes off the carcass. ⭐ Two entries
     * is a porterhouse; one is a shoulder; none is a hide.
     */
    public tissues: string[] = [];

    /** How deep the tools must reach to take it. */
    public cutting: CutDepth = 'boneless';

    /** The hand it takes to get the joint rather than trim. */
    public difficulty: Difficulty = 'standard';

    /** What animal it is OF — stamped at the mint, never authored. */
    public _speciesPath: string | null = null;

    /** Set at the mint when a wound sat on a part this cut came from. */
    public damaged: boolean = false;

    public getTissues(): readonly string[] {
      return this.tissues;
    }

    public getCutting(): CutDepth {
      return this.cutting;
    }

    public getDifficulty(): Difficulty {
      return this.difficulty;
    }

    public getSpeciesPath(): string | null {
      return this._speciesPath;
    }

    /**
     * ⭐ Stamped at the mint by whoever cut it off the carcass. A method
     * rather than a field write because the butcher is another `Stuff`:
     * the shadow framework dispatches methods only, so
     * `(cut as unknown as {_speciesPath})._speciesPath = p` was both a
     * contract break and invisible to every interceptor.
     */
    public setSpeciesPath(path: string | null): void {
      this._speciesPath = path;
    }

    public isDamaged(): boolean {
      return this.damaged;
    }

    /** Noun on the setter, predicate on the getter — the boolean convention. */
    public setDamaged(damaged: boolean): void {
      this.damaged = damaged;
    }

    /**
     * ⭐⭐ **The share-weighted mean of this cut's muscles' `work`** —
     * derive-on-read, cached nowhere.
     *
     * Weights come from the stamped species' `resolvedTissues()`, so a
     * porterhouse weights its strip against its tenderloin by how much of
     * each the animal actually carries. ⚠ With no species stamped the
     * weights are equal — honest for a test fixture and for a cut whose
     * provenance was lost, and it still gets the band right.
     *
     * `null` when nothing claimed is a `Muscle`: a bone heap and a hide
     * have no texture, and answering `0` would make them read as the most
     * tender things in the game.
     */
    public getToughness(): number | null {
      const species = this.resolveSpecies();
      let weighted = 0;
      let weight = 0;
      let flat = 0;
      let count = 0;
      for (const path of this.tissues) {
        const material = StuffApi.findByTemplatePath(path);
        if (!material || !MixinApi.isMuscle(material)) continue;
        const work = material.getWork();
        flat += work;
        count += 1;
        const share = species?.tissueShareOf(path) ?? 0;
        if (share > 0) {
          weighted += work * share;
          weight += share;
        }
      }
      if (count === 0) return null;
      return weight > 0 ? weighted / weight : flat / count;
    }

    public textureBand(): TextureBand | null {
      const work = this.getToughness();
      return work === null ? null : new Texture(work).band();
    }

    /** The stamped species, or `null`. */
    private resolveSpecies(): Species | null {
      if (!this._speciesPath) return null;
      return StuffApi.findByTemplatePath<Species>(this._speciesPath) ?? null;
    }
  };
}
