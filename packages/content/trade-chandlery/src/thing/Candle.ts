/**
 * Candle — ⭐⭐ **one row, and what it is made of decides what it is.**
 *
 * ## What this replaces, and why it was wrong twice
 *
 * The shipped candle was `/stuff/thing/candle`, a plain `Lamp` with
 * **beeswax welded into three fields**: `shortDescription: beeswax
 * candle`, `_materialPath: …/beeswax`, and a long description that said
 * *a hand-dipped taper of pale wax* and *smelling of honey*. Its one
 * recipe lived in `trade-apiculture`, under `discipline: apiculture`,
 * with `outputMaterial` and `outputAppearance` welded on too.
 *
 * Two things follow from that, and both are wrong:
 *
 *   1. **A tallow candle was unauthorable.** Tallow candles are the
 *      ordinary kind — the cheap light the whole medieval world actually
 *      burned, and the reason a chandler is a trade at all. Shipping one
 *      meant a second recipe and a second row saying *greasy* instead of
 *      *pale*, for one act.
 *   2. **A beekeeper's Discipline was what made a candle.** Rendering
 *      mutton fat is not apiculture. That is the same first-consumer
 *      error as the leather jerkin squatting in `trade-smithing`:
 *      whoever shipped the first consumer kept the thing.
 *
 * ## ⭐ The descriptions DERIVE
 *
 * `getShortDescription` and `getLongDescription` are built from the
 * material, so there is one row and no welds. A pot of beeswax dips a
 * pale taper smelling of honey; a pot of tallow dips a greasy one
 * smelling of mutton. Nothing branches on a list of known fats — the
 * material's own `name` and `appearance` are what the sentences are made
 * of, so a third fat is a material row and no code.
 *
 * ## ⭐ And it SMELLS
 *
 * `its dipped fat`, which is the one thing a candle has that a lantern
 * does not: a tallow candle stinks, and it stank enough that it is why
 * beeswax was worth its price. The smell rides the material too —
 * it is simply what the dip's fat smells of, so a third
 * fat is a material row and no code here.
 */

import Lamp from '@saxonberg/server/mud/platform/thing/Lamp';
import { Aroma } from '@saxonberg/server/mud/lib/perception/Aroma';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';

export default class Candle extends Lamp {
  static fieldMeta: FieldMeta = {};

  /**
   * ⭐ *tallow candle* · *beeswax candle*. The material's own name, and
   * the authored stem is the fallback for a candle made of something
   * that has none.
   */
  override getShortDescription(): string {
    const name = this.materialName();
    const stem = super.getShortDescription();
    if (!name) return stem;
    // ⚠ Not `${name} ${stem}` blindly: a row authored as "tallow candle"
    // must not render "tallow tallow candle". The stem is the noun.
    return stem.toLowerCase().includes(name.toLowerCase())
      ? stem
      : `${name} ${stem}`;
  }

  /**
   * The appearance a candle of this fat has, plus what it smells of —
   * both off the material, both one sentence.
   */
  override getLongDescription(): string {
    const authored = super.getLongDescription();
    const material = MixinApi.isTangible(this) ? this.getMaterial() : null;
    if (!material) return authored;
    const look = material.getAppearance();
    const lines: string[] = [];
    if (look) {
      lines.push(
        `A hand-dipped taper of ${look}, with a linen wick down the middle of it.`,
      );
    }
    const smell = this.smellOfMaterial(material);
    if (smell) {
      lines.push(
        this.isLit()
          ? `Lit, it smells of ${smell}.`
          : `Close to, it smells of ${smell}.`,
      );
    }
    if (lines.length === 0) return authored;
    return authored && authored.length > 0
      ? `${authored}\n\n${lines.join(' ')}`
      : lines.join(' ');
  }

  /** The material's name, lowercased, or `''`. */
  private materialName(): string {
    if (!MixinApi.isTangible(this)) return '';
    return (this.getMaterial()?.getName() ?? '').toLowerCase();
  }

  /** The first thing the fat smells of, in a sentence's words, or `''`. */
  private smellOfMaterial(material: Material): string {
    if (!MixinApi.hasOdor(material)) return '';
    const aroma = material.getSmells()[0]?.aroma;
    return aroma ? Aroma.phraseOf(aroma) : '';
  }

  /**
   * ⭐⭐ Charge the fuel bed with the fat it was dipped in — the sibling
   * of a candle's smell, set by the same dip for
   * the same reason.
   *
   * A candle is a `Burner` whose fuel is ITSELF, and since the fire
   * build a burner's fuel is a BED (kilograms, by material) rather than
   * a `%` Reserve that could not say what the flame was burning. The row
   * ships a tallow bed because a candle off a counter is a tallow
   * candle; a dipped one replaces it with whatever was in the pot, so
   * what it is made of still decides what it is — and the flame
   * temperature a beeswax taper reaches is beeswax's 42 MJ/kg rather
   * than tallow's 38, which is one more reason beeswax was worth its
   * price.
   *
   * ⚠ Mass, not a fraction: the bed is the whole candle, because burning
   * one down is what consumes it. A candle minted with no material keeps
   * the row's default rather than ending up with an empty bed — an
   * unlightable light is the defect this build found twice.
   */
  public adoptMaterialFuel(): void {
    if (!MixinApi.isTangible(this)) return;
    const material = this.getMaterial();
    if (!material) return;
    const path = material.getTemplatePath();
    if (!path) return;
    const kg = this.getMass()?.rawValue() ?? 0;
    if (!(kg > 0)) return;
    this.fuelBed = { [path]: kg };
  }
}
