/**
 * OdorMixin — *this substance has a smell of its own.*
 *
 * A material capability (material-decomposition D1): a material with no
 * smell (iron, glass, clean water) holds no smell data at all.
 *
 * - `smells` is what it gives off cold: OU of one kilogram at 293 K in the
 *   open.
 * - What burning it gives the air is `CombustionMixin.burning` — the smell of
 *   a thing burning is a fact of its combustion (decomposition D8).
 *
 * ⛔ A word with no row fails here, at mint, go-live and restore: the setter
 * awaits each word's row, which is also what loads the words a material names
 * (load on use, by following the authored reference).
 */

import type { FieldMeta, MixinConstructor } from '../mixin';
import { Aroma, type OdorTag } from '../perception/Aroma';

export type { OdorTag };

export interface Odor {
  getSmells(): readonly OdorTag[];
  setSmells(value: readonly OdorTag[]): Promise<void>;
}

export function OdorMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class OdorMixin extends Base implements Odor {
    static _mixinName = 'OdorMixin';

    static fieldMeta: FieldMeta = {
      smells: { persistent: true, authorable: true },
    };

    public smells: OdorTag[] = [];

    public getSmells(): readonly OdorTag[] {
      return this.smells;
    }

    public async setSmells(value: readonly OdorTag[]): Promise<void> {
      this.smells = await Aroma.resolveOdorTags(value, 'Material.smells');
    }
  };
}
