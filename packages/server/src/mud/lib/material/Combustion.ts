/**
 * CombustionMixin — *it BURNS.*
 *
 * What a fire reads off a fuel: the heat it gives, the temperature it lights
 * at, what share of the air its vapour flashes at, what it puts into food
 * worked over it and into the room, the ash it leaves and how alkaline that
 * ash is, the smoke point of a fat — and `burning`, what burning it gives the
 * air (moved here from `Odor`: the smell of a thing burning is a fact of its
 * combustion).
 *
 * A capability of a material, named for the substance's physics, never for
 * a process that reads it (material-decomposition D1). A consumer narrows
 * with `MixinApi.hasCombustion(m)` and never on a material's kind.
 */

import { Quantity } from '../quantity';
import { QuantityMarshaller } from '../../platform/idea/persistence/QuantityMarshaller';
import { DissolvedAromatics } from '../metabolism/DissolvedAromatics';
import type { AromaTag } from '../metabolism/DissolvedAromatics';
import { type OdorTag } from '../perception/Aroma';
import type { FieldMeta, MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { PerceptionApi } from '../../api/perception';

export interface Combustion {
  getCombustionImparts(): readonly AromaTag[];
  setCombustionImparts(value: AromaTag[]): Promise<void>;
  getCombustionProducts(): readonly { material: string; litresPerKg: number }[];
  setCombustionProducts(value: { material: string; litresPerKg: number }[]): void;
  getFlammableLimit(): number;
  setFlammableLimit(value: number): void;
  getAshFraction(): number;
  setAshFraction(value: number): void;
  getAlkaliShare(): number;
  setAlkaliShare(value: number): void;
  getAutoignitionTemperature(): Quantity<'K'>;
  setAutoignitionTemperature(value: Quantity<'K'>): void;
  getHeatOfCombustion(): Quantity<'MJ/kg'>;
  setHeatOfCombustion(value: Quantity<'MJ/kg'>): void;
  getSmokePoint(): Quantity<'K'>;
  setSmokePoint(value: Quantity<'K'>): void;
  getBurning(): readonly OdorTag[];
  setBurning(value: readonly OdorTag[]): Promise<void>;
}

export function CombustionMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class CombustionMixin extends Base implements Combustion {
    static _mixinName = 'CombustionMixin';

    static fieldMeta: FieldMeta = {
      autoignitionTemperature: { persistent: true, spoiler: 1, spoilerName: 0, marshaller: QuantityMarshaller.pathFor('K') },
      heatOfCombustion: { persistent: true, spoiler: 1, spoilerName: 0, marshaller: QuantityMarshaller.pathFor('MJ/kg') },
      smokePoint: { persistent: true, spoiler: 1, spoilerName: 0, marshaller: QuantityMarshaller.pathFor('K') },
      combustionImparts: { persistent: true, spoiler: 1, spoilerName: 0 },
      // ⭐ (cleanliness D22, D24) What burning it gives off, what share of the
      // air it flashes at, how fast it evaporates and into what, what ash it
      // leaves — measured facts, collapsed like their siblings.
      combustionProducts: { persistent: true, spoiler: 1, spoilerName: 0 },
      flammableLimit: { persistent: true, spoiler: 1, spoilerName: 0 },
      ashFraction: { persistent: true, spoiler: 1, spoilerName: 0 },
      alkaliShare: { persistent: true, spoiler: 1, spoilerName: 0 },
      // What burning it gives the AIR (decomposition D8; was `Odorous`). What
      // fire puts INTO food is `combustionImparts`, a different thing in
      // different units.
      burning: { persistent: true, authorable: true },
    };

    public burning: OdorTag[] = [];

    public getBurning(): readonly OdorTag[] {
      return this.burning;
    }

    public async setBurning(value: readonly OdorTag[]): Promise<void> {
      this.burning = await PerceptionApi.aromas().resolveOdorTags(value, 'Material.burning');
    }

    // ---------- Fire / phase-change — real thermal properties ----------
    // Each is a real, tabulated `Quantity` (strict on unit, `0`-default
    // until authored — the `electricalConductivity`/`hardness` precedent).
    // `autoignitionTemperature` + `heatOfCombustion` feed the combustion
    // driver (`FireApi`); `meltingPoint`/`latentHeatOfFusion` +
    // `boilingPoint`/`latentHeatOfVaporization` feed the phase-change layer
    // (the host's `reconcilePhase`). Zero means "does not participate" (an
    // unauthored material never ignites, never melts).

    /**
     * Autoignition temperature (`K`) — the temperature at which the material
     * spontaneously ignites in air with no external spark. Paper ≈ 506 K,
     * wood ≈ 570 K. The combustion driver reads it: an object whose
     * temperature crosses this point (raised by the latent heat of any water
     * it holds) catches fire. `0` = non-flammable (never crosses).
     */
    private _autoignitionTemperature: Quantity<'K'> = Quantity.of(0, 'K');

    protected get autoignitionTemperature(): Quantity<'K'> {
      return this._autoignitionTemperature;
    }
    protected set autoignitionTemperature(value: Quantity<'K'>) {
      if (!(value instanceof Quantity) || value.unit !== 'K') {
        throw new TypeError(
          `Material.autoignitionTemperature must be a Quantity<'K'>; got ${value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value}`
        );
      }
      this._autoignitionTemperature = value;
    }

    /**
     * Heat of combustion (`MJ/kg`) — the energy released burning a kilogram
     * of the material (wood ≈ 16, charcoal ≈ 30, wax ≈ 42). The combustion
     * driver derives the fuel `Reserve`'s energy from it: burning a unit of
     * fuel deposits `heatOfCombustion × mass-burnt` joules back into the fire
     * and its surroundings. `0` = no fuel value.
     */
    private _heatOfCombustion: Quantity<'MJ/kg'> = Quantity.of(0, 'MJ/kg');

    protected get heatOfCombustion(): Quantity<'MJ/kg'> {
      return this._heatOfCombustion;
    }
    protected set heatOfCombustion(value: Quantity<'MJ/kg'>) {
      if (!(value instanceof Quantity) || value.unit !== 'MJ/kg') {
        throw new TypeError(
          `Material.heatOfCombustion must be a Quantity<'MJ/kg'>; got ${value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value}`
        );
      }
      this._heatOfCombustion = value;
    }

    /**
     * ⭐ **Smoke point** (`K`) — the temperature at which a fat breaks down
     * and starts smoking, and therefore the ceiling a fat cooking medium can
     * carry heat to. Tallow ≈ 480, olive oil ≈ 463, butter ≈ 450. `0` = not
     * a cooking fat.
     *
     * The dry-side twin of {@link boilingPoint}: water pins a wet method at
     * 373 K no matter how hard the fire roars, and a fat pins a fried one
     * here. That one pair of tabulated numbers is why boiling cannot brown
     * and frying can — no method table, no `canBrown` flag.
     */
    private _smokePoint: Quantity<'K'> = Quantity.of(0, 'K');

    protected get smokePoint(): Quantity<'K'> {
      return this._smokePoint;
    }
    protected set smokePoint(value: Quantity<'K'>) {
      if (!(value instanceof Quantity) || value.unit !== 'K') {
        throw new TypeError(
          `Material.smokePoint must be a Quantity<'K'>; got ${value instanceof Quantity ? `Quantity<'${value.unit}'>` : typeof value}`
        );
      }
      this._smokePoint = value;
    }

    /**
     * ⭐⭐ **What BURNING this puts into whatever is worked over its fire**
     * — aroma compounds, mg/L, the same units a recipe's `imparts` uses.
     *
     * Peat authors `smoke: 30` and nothing else does. That one line is the
     * whole of peated malt: the smoke in the barley comes from the FUEL
     * now, not from a second recipe row that said *peated* in its name.
     *
     * ⭐ Why this is the honest home. The two kiln recipes were identical
     * except that one declared `imparts: [{smoke, 30}]` and took a turf as
     * an item slot — so the fuel was an INPUT to the recipe, which made
     * *the same recipe over a different fire* inexpressible, and made a
     * sodden turf's own moisture invisible (an item slot cannot see it).
     * Moving the fact onto the material deletes a recipe and makes the
     * fuel bed answer for itself.
     */
    protected combustionImparts: AromaTag[] = [];

    /**
     * ⭐ What BURNING this gives off into the room, beyond the fire's own CO₂
     * and smoke (cleanliness D22) — litres of a gas per kilogram burnt.
     * Sulfur burns to SULFUR DIOXIDE, which is why a lump of it on a brazier
     * in a shut room bleaches wool and chokes whoever is in there. `[]` for
     * nearly everything: wood and coal give off what the fire already does.
     */
    protected combustionProducts: { material: string; litresPerKg: number }[] = [];

    /**
     * ⭐ The share of the air (a volume fraction) at which this, suspended in
     * the air, FLASHES on a spark — its own lower flammable limit
     * (cleanliness D22). `0` = the global dial (`fire.flammable.ignitesAt`).
     * Mill dust and naphtha vapour author theirs: a dusty mill explodes.
     */
    protected flammableLimit = 0;

    /**
     * ⭐ The share of a solid fuel's burnt mass left as ASH in the grate
     * (cleanliness D24) — oak ≈ 1 %. What a hearth leaves for the sweep, and
     * the first input of lye. `0` for a fuel that leaves none.
     */
    protected ashFraction = 0;

    /**
     * ⭐ The share of that ash which is ALKALI — the potassium salts a lye
     * leaches out of it (potash D1). Beech and elm strong, pine weak, bark
     * and twigs richer than heartwood. `0` = unauthored, so coal, charcoal
     * and stone claim nothing. The burner's raked heap is the mass-weighted
     * mix of what burned.
     */
    protected alkaliShare = 0;
    /** What burning this puts into what is worked over its fire (mg/L). */
    public getCombustionImparts(): readonly AromaTag[] {
      return this.combustionImparts;
    }
    public async setCombustionImparts(value: AromaTag[]): Promise<void> {
      this.combustionImparts = await validateCombustionImparts(value);
    }
    /** What burning this gives off into the room (litres per kg burnt). */
    public getCombustionProducts(): readonly { material: string; litresPerKg: number }[] {
      return this.combustionProducts;
    }
    public setCombustionProducts(value: { material: string; litresPerKg: number }[]): void {
      this.combustionProducts = (Array.isArray(value) ? value : []).filter(
        (p) => p && typeof p.material === 'string' && p.material.length > 0 && p.litresPerKg > 0,
      );
    }
    /** Its own flash point as a share of the air, or `0` (the global dial). */
    public getFlammableLimit(): number {
      return this.flammableLimit;
    }
    public setFlammableLimit(value: number): void {
      this.flammableLimit = Number.isFinite(value) && value > 0 ? value : 0;
    }
    /** The share of a burnt fuel's mass left as ash. */
    public getAshFraction(): number {
      return this.ashFraction;
    }
    public setAshFraction(value: number): void {
      this.ashFraction = Number.isFinite(value) && value > 0 ? Math.min(1, value) : 0;
    }
    /** The share of this material's ash that is alkali (potash D1). */
    public getAlkaliShare(): number {
      return this.alkaliShare;
    }
    public setAlkaliShare(value: number): void {
      this.alkaliShare = Number.isFinite(value) && value > 0 ? Math.min(1, value) : 0;
    }

    /** Read autoignition temperature (`Quantity<'K'>`; `0` = non-flammable). */
    public getAutoignitionTemperature(): Quantity<'K'> {
      return this._autoignitionTemperature;
    }
    /** Set autoignition temperature. Strict on `Quantity<'K'>`. */
    public setAutoignitionTemperature(value: Quantity<'K'>): void {
      this.autoignitionTemperature = value;
    }

    /** Read heat of combustion (`Quantity<'MJ/kg'>`; `0` = no fuel value). */
    public getHeatOfCombustion(): Quantity<'MJ/kg'> {
      return this._heatOfCombustion;
    }
    /** Set heat of combustion. Strict on `Quantity<'MJ/kg'>`. */
    public setHeatOfCombustion(value: Quantity<'MJ/kg'>): void {
      this.heatOfCombustion = value;
    }

    /** Read smoke point (`Quantity<'K'>`; `0` = not a cooking fat). */
    public getSmokePoint(): Quantity<'K'> {
      return this._smokePoint;
    }
    /** Set smoke point. Strict on `Quantity<'K'>`. */
    public setSmokePoint(value: Quantity<'K'>): void {
      this.smokePoint = value;
    }
  };
}

/**
 * Validate an authored `combustionImparts` block. ⚠ A misspelt aroma
 * word must fail at READ: a fuel that quietly imparted nothing would
 * still kiln the barley and the malt would just be unpeated, which is
 * the silent-wrong-answer shape the `imparts` validator exists for.
 */
async function validateCombustionImparts(value: AromaTag[]): Promise<AromaTag[]> {
  if (!Array.isArray(value)) {
    throw new TypeError(
      `Material.combustionImparts must be a list of { type, amount }`,
    );
  }
  const out: AromaTag[] = [];
  for (const [i, tag] of value.entries()) {
    if (!DissolvedAromatics.isAromaPath(tag?.type)) {
      throw new TypeError(
        `Material.combustionImparts[${i}]: '${tag?.type}' is not an aroma path`,
      );
    }
    if (!(tag.amount > 0)) {
      throw new TypeError(
        `Material.combustionImparts[${i}] ('${tag.type}') needs a ` +
          `positive amount (mg/L)`,
      );
    }
    await PerceptionApi.aromas().ensure(tag.type);
    out.push({ type: tag.type, amount: tag.amount });
  }
  return out;
}
