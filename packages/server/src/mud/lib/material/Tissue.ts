/**
 * TissueMixin — *it came from a LIVING thing.*
 *
 * The species and tissue it came from — physically universal under plant and
 * animal, a data gap where unauthored.
 *
 * A capability of a material, named for the substance's physics, never for
 * a process that reads it (material-decomposition D1). A consumer narrows
 * with `MixinApi.hasTissue(m)` and never on a material's kind.
 */

import type { FieldMeta, MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

/**
 * Link from a biological Material to the Species it came from, plus
 * the kind of tissue (`'wood'`, `'flesh'`, `'leaf'`, `'fruit'`, …).
 * Bidirectional with `Species._defaultMaterialPath` — the species
 * points at its default Material, the material points back at the
 * species. Both directions are authored.
 */
export interface BiologicalSource {
  speciesPath: string;
  tissueType: string;
}

export interface Tissue {
  getBiologicalSource(): BiologicalSource | null;
  setBiologicalSource(value: BiologicalSource | null): void;
}

export function TissueMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class TissueMixin extends Base implements Tissue {
    static _mixinName = 'TissueMixin';

    static fieldMeta: FieldMeta = {
      biologicalSource: { persistent: true },
    };

    /**
     * Source-species link for biological materials. `null` for non-
     * biological materials and for biological materials where the source
     * species isn't modeled. The species side carries
     * `_defaultMaterialPath` pointing back here — the link is
     * bidirectional per slate.
     */
    protected biologicalSource: BiologicalSource | null = null;

    public getBiologicalSource(): BiologicalSource | null {
      return this.biologicalSource;
    }
    public setBiologicalSource(value: BiologicalSource | null): void {
      this.biologicalSource = value;
    }
  };
}
