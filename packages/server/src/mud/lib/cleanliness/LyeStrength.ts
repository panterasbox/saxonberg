/**
 * LyeStrength — **how strong a lye is**: the alkali dissolved in it, kg per
 * litre, and the words a person uses for it (potash D5).
 *
 * ⭐ It rides the LIQUOR, like {@link WaterHardness}: the lye hopper writes
 * it when the water has taken the alkali out of the ash (how much ash, how
 * many passes, how hard the water was), a pour carries it, a pot of it
 * boiled down concentrates it, and the soap kettle reads it as the batch's
 * input band. Nothing stores a "strength" anywhere else.
 *
 * ⭐⭐ The field is `dissolvedSolidsKgPerL` — **the same member, name and
 * unit the sugar build declares** for a boiled liquor's sucrose. A lye's
 * alkali and a cane juice's sugar are one quantity, so they are one field;
 * when sugar's declaration lands this one is deleted (one field, one owner)
 * and nothing that reads it changes.
 *
 * ⚠ A strength READ is honest only on a `lye`-tagged liquor
 * ({@link LyeStrength.isLye}): water carrying alkali the hopper has not
 * finished leaching is still water.
 *
 * The bands, in kg/L (dials, read at use): *water* below
 * `potash.lye.weakFromKgPerL`, *weak* below `potash.lye.soapFromKgPerL`,
 * *soap-strength* below `potash.lye.strongFromKgPerL`, *strong* above. The
 * folk instrument is the EGG (`analyze density`): it sinks in water, lies
 * on its side in a weak lye, shows a coin of shell in a soap lye and rides
 * high in a strong one.
 */
import type Material from '../material/Material';
import type { CompetenceBandName } from '../advancement/CompetenceBand';
import type { GradeBand } from '../craft/Grade';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';

declare module '../bulk/Bulkable' {
  interface BulkPayload {
    /**
     * Dissolved solids, kg per litre — a lye's alkali (potash), a juice's
     * sugar (sugar). Written by what dissolved them, carried by a pour.
     */
    dissolvedSolidsKgPerL?: number;
  }
}

/** The four words for a lye's strength. */
export type LyeBand = 'water' | 'weak' | 'soap-strength' | 'strong';

export class LyeStrength {
  constructor(public readonly kgPerL: number) {}

  /** Is this liquor a lye — the only thing a strength read is honest on? */
  public isLye(material: Material | null): boolean {
    return material !== null && material.hasTag('lye');
  }

  /** The band this strength falls in. */
  public band(): LyeBand {
    const k = this.kgPerL;
    if (!(k >= this.dial(AppSettingKeys.potashLyeWeakFromKgPerL, 0.005))) return 'water';
    if (k < this.dial(AppSettingKeys.potashLyeSoapFromKgPerL, 0.03)) return 'weak';
    if (k < this.dial(AppSettingKeys.potashLyeStrongFromKgPerL, 0.06)) return 'soap-strength';
    return 'strong';
  }

  /**
   * The grade the strength gives what is made from it — the hopper's, the
   * pot's, the cake's (AC 3: strength carries end to end).
   */
  public gradeBand(): GradeBand {
    switch (this.band()) {
      case 'water':
        return 'poor';
      case 'weak':
        return 'fair';
      case 'soap-strength':
        return 'fine';
      default:
        return 'exceptional';
    }
  }

  /**
   * ⭐ What the egg does in it, in words, at the resolution `band` buys —
   * never a number (AC 12). Below `competent` a reader tells three things
   * apart (it sinks · a coin of shell shows · it rides high); a competent
   * reader also tells the egg lying on the bottom from the egg standing on
   * its point, which is the difference between water and a weak lye.
   */
  public eggWords(band: CompetenceBandName): string {
    const fine = band !== 'untrained' && band !== 'novice';
    switch (this.band()) {
      case 'water':
        return 'The egg sinks and lies on its side on the bottom. There is nothing in this but water.';
      case 'weak':
        return fine
          ? 'The egg sinks, then stands up on its point and will not rise. A weak lye — it wants another pass through the ash.'
          : 'The egg sinks.';
      case 'soap-strength':
        return 'The egg comes up and a coin of shell shows above the surface. Soap strength.';
      default:
        return 'The egg rides high, a good third of it out of the lye. Strong lye — strong enough to boil down.';
    }
  }

  /**
   * What the hydrometer does in it — the same four bands in the glass's
   * terms, and a competent reader of the glass also says how far into a
   * band it sits. Still words: a lye's strength is a band you act on.
   */
  public glassWords(band: CompetenceBandName): string {
    const fine = band !== 'untrained' && band !== 'novice';
    switch (this.band()) {
      case 'water':
        return 'The glass sinks to the water mark. There is nothing in this but water.';
      case 'weak':
        return fine
          ? 'The glass rides a little above the water mark — a weak lye, nowhere near soap strength.'
          : 'The glass rides a little above the water mark. A weak lye.';
      case 'soap-strength':
        return 'The glass rides well up the stem. Soap strength.';
      default:
        return 'The glass rides high on its stem. Strong lye — strong enough to boil down.';
    }
  }

  private dial(key: string, fallback: number): number {
    try {
      const v = Number(AppApi.setting(key));
      return Number.isFinite(v) && v > 0 ? v : fallback;
    } catch {
      return fallback;
    }
  }
}
