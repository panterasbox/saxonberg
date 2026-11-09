/**
 * MixtureMixin — *it is a MIXTURE.*
 *
 * Chemical identity, exclusive with element and compound: weight-fraction
 * references to its constituents, and the elemental composition, element test
 * and water share it derives.
 *
 * A capability of a material, named for the substance's physics, never for
 * a process that reads it (material-decomposition D1). A consumer narrows
 * with `MixinApi.hasMixture(m)` and never on a material's kind.
 */

import type { FieldMeta, MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { StuffApi } from '../../api/stuff';
import type { MaterialComposition } from '../../api/material';
// eslint-disable-next-line no-restricted-imports -- the F4 material face: a material's composition()/containsElement() forward into the material logic singleton exactly as the api/material facade does (the Combustible/Energized precedent)
import { MaterialLogic } from '../../platform/idea/api/MaterialLogic';

export interface CompositionEntry {
  materialPath: string;
  fraction: number;
}

export interface Mixture {
  getComposition(): readonly CompositionEntry[];
  waterShare(): number;
  setComposition(value: CompositionEntry[]): void;
  elementalComposition(): MaterialComposition;
  containsElement(elementSymbol: string): boolean;
}

/** A mixture reads one fact of the core: whether a material is tagged water. */
type MixtureHost = Stuff & { hasTag(tag: string): boolean };

export function MixtureMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class MixtureMixin extends Base implements Mixture {
    static _mixinName = 'MixtureMixin';

    static fieldMeta: FieldMeta = {
      composition: { persistent: true },
    };

    /**
     * Constituent breakdown for mixtures / alloys / composite materials.
     * Pure elements have an empty list. Each entry's `materialPath`
     * resolves lazily through `StuffApi.findByTemplatePath` at query
     * time; same shape as `_speciesPath` / `_materialPath` cross-refs.
     */
    protected composition: CompositionEntry[] = [];

    public getComposition(): readonly CompositionEntry[] { return this.composition; }
    /**
     * The share of this material, by mass, that is water: all of it for
     * water itself, else what its composition names as water (a slip is
     * 0.45). What slakes a plastic mass (`Compounding.workVerb`).
     */
    public waterShare(): number {
      if ((this as unknown as MixtureHost).hasTag('water')) return 1;
      let share = 0;
      for (const e of this.composition) {
        if (StuffApi.findByTemplatePath<MixtureHost>(e.materialPath)?.hasTag('water')) share += e.fraction;
      }
      return Math.min(1, share);
    }
    public setComposition(value: CompositionEntry[]): void {
      this.composition = value;
    }

    // ------- the composition face (F4) — forwards into MaterialLogic -------

    /**
     * This material's recursive ELEMENTAL composition (leaf-element
     * weight fractions; cycle-guarded).
     */
    public elementalComposition(): MaterialComposition {
      return materialLogic().compositionOf(this as unknown as never);
    }

    /** Does this material contain `elementSymbol` anywhere in its
     * recursive composition? */
    public containsElement(elementSymbol: string): boolean {
      return materialLogic().containsElement(this as unknown as never, elementSymbol);
    }
  };
}

/** Resolve the HMR-able MaterialLogic singleton (the substrate reads). */
function materialLogic(): MaterialLogic {
  return StuffApi.singletonSync(
    '/platform/idea/api/material',
    () => new MaterialLogic(),
  );
}
