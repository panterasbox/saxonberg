/**
 * OdorousMixin — *this substance has a smell of its own.*
 *
 * A capability mixin on the `Radioactive` pattern: a material opts in through
 * a class that composes it, and a material with no smell (iron, glass, clean
 * water) holds no smell data at all.
 *
 * - `smells` is what it gives off cold: OU of one kilogram at 293 K in the
 *   open.
 * - `burning` is what burning it gives the AIR. What fire puts INTO food is
 *   `Material.combustionImparts`, a different thing in different units.
 *
 * ⛔ A word with no row fails here, at mint, go-live and restore: the setters
 * await each word's row, which is also what loads the words a material names
 * (load on use, by following the authored reference).
 */

import type { FieldMeta, MixinConstructor } from '../mixin';
import { Aroma, type OdorTag } from '../perception/Aroma';

export type { OdorTag };

export interface Odorous {
  getSmells(): readonly OdorTag[];
  setSmells(value: readonly OdorTag[]): Promise<void>;
  getBurning(): readonly OdorTag[];
  setBurning(value: readonly OdorTag[]): Promise<void>;
}

export function OdorousMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class OdorousMixin extends Base implements Odorous {
    static _mixinName = 'OdorousMixin';

    static fieldMeta: FieldMeta = {
      smells: { persistent: true, authorable: true },
      burning: { persistent: true, authorable: true },
    };

    public smells: OdorTag[] = [];
    public burning: OdorTag[] = [];

    public getSmells(): readonly OdorTag[] {
      return this.smells;
    }

    public async setSmells(value: readonly OdorTag[]): Promise<void> {
      this.smells = await Aroma.resolveOdorTags(value, 'Material.smells');
    }

    public getBurning(): readonly OdorTag[] {
      return this.burning;
    }

    public async setBurning(value: readonly OdorTag[]): Promise<void> {
      this.burning = await Aroma.resolveOdorTags(value, 'Material.burning');
    }
  };
}
