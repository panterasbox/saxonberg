/**
 * OpticsMixin — *light passes THROUGH it.*
 *
 * Its light absorption (Beer–Lambert): what a pane of it lets through.
 *
 * A capability of a material, named for the substance's physics, never for
 * a process that reads it (material-decomposition D1). A consumer narrows
 * with `MixinApi.hasOptics(m)` and never on a material's kind.
 */

import { Quantity } from '../quantity';
import { QuantityMarshaller } from '../../platform/idea/persistence/QuantityMarshaller';
import type { FieldMeta, MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

export interface Optics {
  getLightAbsorption(): Quantity<'1/m'> | null;
  setLightAbsorption(value: Quantity<'1/m'> | null): void;
}

export function OpticsMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class OpticsMixin extends Base implements Optics {
    static _mixinName = 'OpticsMixin';

    static fieldMeta: FieldMeta = {
      lightAbsorption: { persistent: true, marshaller: QuantityMarshaller.pathFor('1/m') },
    };

    /**
     * Melting point (`K`) — the solid↔liquid transition temperature (iron
     * 1811, wax ≈ 330, water 273). the host's `reconcilePhase` holds
     * temperature at this plateau while `latentHeatOfFusion` is absorbed,
     * then flows the mass to a `Bulkable` liquid. `0` = does not melt in the
     * modelled range.
     */
    // ⭐ Light through matter (rubber build): Beer–Lambert's α in 1/m. A
    // layer of thickness t passes e^(−α·t). ABSENT means opaque — the honest
    // default for every row that is not glass, water or ice.
    private _lightAbsorption: Quantity<'1/m'> | null = null;
    protected get lightAbsorption(): Quantity<'1/m'> | null {
      return this._lightAbsorption;
    }
    protected set lightAbsorption(value: Quantity<'1/m'> | null) {
      if (value !== null && !(value instanceof Quantity && value.unit === '1/m')) {
        throw new TypeError(
          `Material.lightAbsorption must be a Quantity<'1/m'>; got ${value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value}`
        );
      }
      this._lightAbsorption = value;
    }

    /**
     * Read the light absorption coefficient (Beer–Lambert α, 1/m), or
     * `null` — opaque. A layer `t` thick passes `e^(−α·t)`.
     */
    public getLightAbsorption(): Quantity<'1/m'> | null {
      return this._lightAbsorption;
    }
    /** Set light absorption. Strict on `Quantity<'1/m'>`; `null` = opaque. */
    public setLightAbsorption(value: Quantity<'1/m'> | null): void {
      this.lightAbsorption = value;
    }
  };
}
