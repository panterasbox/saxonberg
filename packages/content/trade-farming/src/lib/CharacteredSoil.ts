/**
 * CharacteredSoil — **ground whose reserves are sized by its area and its
 * seeded character** (field population D2, D14).
 *
 * Extracted from `Field` without a change in behavior, because a second
 * thing now needs exactly this: a field's PATCH is soil in its own right,
 * with its own area, its own sample of the ground and its own reserves.
 * Two composers in one pack is the pack's `lib/` (the kernel's rule: a
 * mixin is only ever inherited, so no branch folder is honest for it).
 *
 * What it carries, and nothing else:
 *
 *  - **`areaM2`** — the square metres of ground: the land draw and the
 *    rain catchment ({@link soilCatchmentAreaM2});
 *  - **`installSoilReserves(sample, depthFactor)`** — the four soil
 *    reserves a piece of ground of this area and this character calls
 *    for, idempotent (a restored ground keeps its history);
 *  - **`lastSample`** — the most recently resolved ground sample, a read
 *    cache for the sync paths that cannot resolve a locality themselves;
 *  - **`soilLeachRate()`** — sand leaks and clay holds, off that sample.
 *
 * ⭐ `depthFactor` is the one new term (D14): a part of a field whose
 * topsoil is a third as deep holds a third of the water per square metre
 * and dries first. Every whole field passes `1`, so every shipped field's
 * capacity is what it was.
 *
 * Requires a base that already composes `Soil` and `Reserved`, composed
 * at the call site (the `SoilMixin` precedent).
 */

import type { MixinConstructor, FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { Reserve } from '@saxonberg/server/mud/lib/reserve';
import type { Reserved } from '@saxonberg/server/mud/lib/reserve';
import {
  SOIL_MOISTURE_RESERVE_KEY,
  SOIL_NITROGEN_RESERVE_KEY,
  SOIL_ORGANIC_MATTER_RESERVE_KEY,
  SOIL_STRUCTURE_RESERVE_KEY,
  SOIL_RESERVE_THEME,
} from '@saxonberg/server/mud/lib/husbandry/Soil';
import type { Soil } from '@saxonberg/server/mud/lib/husbandry/Soil';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import GroundCharacter, {
  type GroundSample,
} from '@saxonberg/content-ground/src/idea/GroundCharacter';

/**
 * Litres of plant-available water one square metre of LOAM holds in its
 * root zone. Texture scales it (`GroundCharacter.waterHoldingFactor`).
 *
 * ⭐ Roughly right rather than invented: a loam holds about 150 mm of
 * available water per metre of depth, and a root zone is a few hundred
 * millimetres, so a square metre carries tens of litres. The number is
 * a real soil-physics figure and the derivation is one line, which is
 * what stops it being a balance dial pretending to be physics.
 */
const LITRES_PER_M2_LOAM = 45;

/**
 * Litres a square metre of standing crop transpires a game day — a full
 * sward's figure (0.3 kg/m² × 4 L/kg), because a field of wheat in leaf
 * drinks the ground about as hard as a full pasture does. A crop row's
 * `litresPerGameDay` is a single plant's and cannot be read per square
 * metre. Read by the field and by each of its patches.
 */
export const CROP_TRANSPIRATION_L_PER_M2_DAY = 1.2;

/** The public surface charactered ground offers. */
export interface CharacteredSoil {
  getAreaM2(): number;
  setAreaM2(value: number): void;
  /**
   * Install the soil reserves this ground's area and character call for;
   * `depthFactor` scales the water it holds (a thin part of a field).
   * Idempotent.
   */
  installSoilReserves(sample: GroundSample, depthFactor?: number): void;
}

export function CharacteredSoilMixin<
  TBase extends MixinConstructor<Stuff & Reserved & Soil>,
>(Base: TBase) {
  return class CharacteredSoilMixin extends Base implements CharacteredSoil {
    static _mixinName = 'CharacteredSoilMixin';

    static fieldMeta: FieldMeta = {
      areaM2: { persistent: true, authorable: true },
    };

    /** Square metres of ground. The land draw, and the rain catchment. */
    public areaM2 = 0;

    public getAreaM2(): number {
      return this.areaM2;
    }

    public setAreaM2(value: number): void {
      this.areaM2 = Math.max(0, value);
    }

    /**
     * The most recently resolved ground sample, or `null`. ⚠ Not
     * persisted and not authoritative — a read cache for the sync paths
     * (`soilLeachRate`, poaching, a patch's depth) that cannot resolve a
     * locality themselves. Everything that can resolve, resolves.
     */
    protected lastSample: GroundSample | null = null;

    /**
     * ⭐ **Sand leaks and clay holds** — the seeded character setting the
     * curve a derived reserve moves along.
     */
    public soilLeachRate(): number {
      const sample = this.lastSample;
      if (!sample) return super.soilLeachRate();
      return 0.0006 * GroundCharacter.leachFactor(sample.texture);
    }

    /** Every square metre of it catches rain. That is what ground is. */
    public soilCatchmentAreaM2(): number {
      return this.areaM2;
    }

    /**
     * Install the soil reserves this ground's **character and area** call
     * for — the multiplication D2 is about, made concrete.
     *
     * ⭐ **Capacity is derived, never authored.** A hectare of clay holds
     * more water than a hectare of sand, and both hold more than a garden
     * bed, and none of those three numbers is a balance dial: they are
     * `area × texture × the water a soil holds` — and, for a part of a
     * field, × how deep its topsoil runs against the field's own.
     *
     * Idempotent — a restored ground keeps the reserves its record
     * carried, because a reserve is *state* and re-installing would erase
     * the history the whole ledger exists to keep.
     */
    public installSoilReserves(sample: GroundSample, depthFactor = 1): void {
      const host = this as unknown as Stuff & Reserved;
      if (!host.hasReserve(SOIL_MOISTURE_RESERVE_KEY)) {
        const depth = Number.isFinite(depthFactor) && depthFactor > 0 ? depthFactor : 1;
        const litres =
          this.areaM2 *
          LITRES_PER_M2_LOAM *
          GroundCharacter.waterHoldingFactor(sample.texture) *
          depth;
        host.setReserve(
          new Reserve(
            SOIL_MOISTURE_RESERVE_KEY,
            Quantity.of(litres, 'L'),
            // ⭐ Half full at the moment it is plotted, and that is not a
            // kindness: ground you have just cut the sod off is neither
            // saturated nor a dust bowl, and the sky takes it from there.
            Quantity.of(litres / 2, 'L'),
            SOIL_RESERVE_THEME,
            null,
          ),
        );
      }
      if (!host.hasReserve(SOIL_ORGANIC_MATTER_RESERVE_KEY)) {
        host.setReserve(
          new Reserve(
            SOIL_ORGANIC_MATTER_RESERVE_KEY,
            Quantity.of(100, '%'),
            // ⭐ Rough ground that has never been worked carries a fair
            // amount, because nobody has been taking anything off it. The
            // first crops off newly-broken land really were the best ones,
            // and the disappointment that follows is the lesson.
            // (sugar D11) Volcanic ground says otherwise, on its sample.
            Quantity.of(sample.nativeOrganicPct ?? 40, '%'),
            SOIL_RESERVE_THEME,
            null,
          ),
        );
      }
      if (!host.hasReserve(SOIL_STRUCTURE_RESERVE_KEY)) {
        host.setReserve(
          new Reserve(
            SOIL_STRUCTURE_RESERVE_KEY,
            Quantity.of(100, '%'),
            // Undisturbed ground has good structure. What happens to it
            // afterwards is the holder's business.
            Quantity.of(85, '%'),
            SOIL_RESERVE_THEME,
            null,
          ),
        );
      }
      if (!host.hasReserve(SOIL_NITROGEN_RESERVE_KEY)) {
        host.setReserve(
          new Reserve(
            SOIL_NITROGEN_RESERVE_KEY,
            Quantity.of(100, '%'),
            // ⚠ Rough ground is not fertile ground. What is here is what
            // scrub and grass put back over the years nobody worked it,
            // and the whole nitrogen ledger is about what happens next.
            Quantity.of(sample.nativeNitrogenPct ?? 25, '%'),
            SOIL_RESERVE_THEME,
            null,
          ),
        );
      }
    }
  };
}
