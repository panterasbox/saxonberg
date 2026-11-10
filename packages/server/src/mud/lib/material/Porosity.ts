/**
 * PorosityMixin — *it TAKES UP water.*
 *
 * How much water it holds, its strength wet as a share of dry, what a
 * soaked-through good of it leaves — and the wet law (`permeability`,
 * `wetProperty`) the wetness and electricity substrates read. Not on metals:
 * a metal holds no water.
 *
 * A capability of a material, named for the substance's physics, never for
 * a process that reads it (material-decomposition D1). A consumer narrows
 * with `MixinApi.hasPorosity(m)` and never on a material's kind.
 */

import { Quantity } from '../quantity';
import { QuantityMarshaller } from '../../platform/idea/persistence/QuantityMarshaller';
import type { FieldMeta, MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';

export interface Porosity {
  permeability(): number;
  wetProperty(dry: number, fluid: number, saturation: number): number;
  getWaterAbsorptionCapacity(): Quantity<'%'>;
  setWaterAbsorptionCapacity(value: Quantity<'%'>): void;
  getWetStrength(): number | null;
  setWetStrength(value: number | null): void;
  getSoddenTemplate(): string;
  setSoddenTemplate(value: string): void;
}

export function PorosityMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class PorosityMixin extends Base implements Porosity {
    static _mixinName = 'PorosityMixin';

    static fieldMeta: FieldMeta = {
      waterAbsorptionCapacity: { persistent: true, spoiler: 1, spoilerName: 0, marshaller: QuantityMarshaller.pathFor('%') },
      // ⭐ How a good of this fails in WATER (paper): its strength wet as a
      // share of dry, and what a soaked-through good of it leaves.
      wetStrength: { persistent: true, authorable: true },
      soddenTemplate: { persistent: true, authorable: true },
    };

    /**
     * Water **absorption capacity** — the real, tabulated material property
     * (ASTM D570 / ISO 62): the mass of water the material holds at
     * saturation, as a **percent of its dry mass** (`Quantity<'%'>`). Real
     * figures: wool ≈ 33 %, wood ≈ 28 % (fibre-saturation point), cotton ≈
     * 25 %, leather ≈ 15 %, ceramic ≈ 8 %, and metals / glass ≈ 0 (a surface
     * film only). Quantity-typed and strict on unit like the other measured
     * properties (`hardness`, `electricalConductivity`) — **not** a fake 0–1
     * index. The {@link ../wetness/Wet WetMixin} gauge reads it to derive the
     * dry rate from evaporation physics: at a fixed evaporation rate a
     * high-capacity material holds more water, so its saturation decays
     * slower (wet wool lingers; a wet blade sheds at once). `0 %` until
     * authored — the neutral fallback for a materialless object lives on the
     * gauge, not here.
     */
    private _waterAbsorptionCapacity: Quantity<'%'> = Quantity.of(0, '%');

    protected get waterAbsorptionCapacity(): Quantity<'%'> {
      return this._waterAbsorptionCapacity;
    }
    protected set waterAbsorptionCapacity(value: Quantity<'%'>) {
      if (!(value instanceof Quantity) || value.unit !== '%') {
        throw new TypeError(
          `Material.waterAbsorptionCapacity must be a Quantity<'%'>; got ${value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value}`
        );
      }
      this._waterAbsorptionCapacity = value;
    }

    /**
     * ⭐⭐ **The ONE wet law — how open this material's pores are to water**,
     * `[0, 1]`. Zero when it absorbs no more than
     * `wetness.impermeableBelowPct` (2 %) of its dry mass — rubber, glass,
     * oiled leather hold water on the surface, never in the pores; above
     * that, `min(1, wAC / textiles.clo.absorptionReference)` (40 %, where a
     * loft counts as fully flooded — wool 33, linen 20).
     *
     * Readers: cloth's clo, the icehouse's sawdust packing, rubber's contact
     * resistance. One law on the material, so wet wool, wet sawdust and a
     * wet glove can never disagree about what water does to a pore.
     */
    public permeability(): number {
      const wac = this._waterAbsorptionCapacity.rawValue();
      if (!(wac > wetDial(AppSettingKeys.wetnessImpermeableBelowPct, 2))) return 0;
      const reference = wetDial(AppSettingKeys.textilesCloAbsorptionReference, 40);
      if (!(reference > 0)) return 1;
      return Math.min(1, wac / reference);
    }

    /**
     * A property of this material, wet: `dry + saturation × permeability() ×
     * (fluid − dry)`. Thermal conductivity of a soaked loft is
     * `wetProperty(k_air, k_water, wetness)`; a dry material and an
     * impermeable one both answer `dry`.
     */
    public wetProperty(dry: number, fluid: number, saturation: number): number {
      const s = Number.isFinite(saturation) ? Math.max(0, Math.min(1, saturation)) : 0;
      return dry + s * this.permeability() * (fluid - dry);
    }

    /** Read water absorption capacity (`Quantity<'%'>` of dry mass). */
    public getWaterAbsorptionCapacity(): Quantity<'%'> {
      return this._waterAbsorptionCapacity;
    }
    /** Set water absorption capacity. Strict on `Quantity<'%'>`. */
    public setWaterAbsorptionCapacity(value: Quantity<'%'>): void {
      this.waterAbsorptionCapacity = value;
    }

    /**
     * ⭐ **How a good of this fails in water** (paper build): the share of its
     * dry strength it keeps when soaked, `[0, 1]`; `null` = water does not
     * break it (wood swells, cloth holds, iron rusts — those are other rules).
     * Paper and board keep about a tenth; a good of them soaked through gives
     * way (`Integrity`), leaving {@link getSoddenTemplate}.
     */
    protected wetStrength: number | null = null;
    public getWetStrength(): number | null {
      return this.wetStrength;
    }
    public setWetStrength(value: number | null): void {
      this.wetStrength = typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : null;
    }

    /** What a soaked-through good of this leaves (paper → a lump of pulp); `''` = nothing. */
    protected soddenTemplate = '';
    public getSoddenTemplate(): string {
      return this.soddenTemplate;
    }
    public setSoddenTemplate(value: string): void {
      this.soddenTemplate = typeof value === 'string' ? value.trim() : '';
    }
  };
}

/** Numeric AppSetting read for the wet law, falling back to the seeded literal. */
function wetDial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}
