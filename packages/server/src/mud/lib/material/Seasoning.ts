/**
 * SeasoningMixin — converted wood (and a bar of soap) READ as it dries: green,
 * drying, seasoned (assembly D2, AC 19).
 *
 * ⭐⭐ **A reading, not a clock** (ceramics review, 2026-10-28). The water
 * is the host's `MoistureMixin` — the one model of a solid giving its
 * water to the air, which food, hides, turf and green clay already ran on.
 * Seasoning had a second one (its own fraction on the maturation clock, a
 * flat rain penalty, a damage band for heat), and the two disagreed where a
 * player could see it: a ham in a damp shed took water back and a board
 * beside it only stalled; a pot checked for drying too FAST and a board for
 * drying too HOT. Now there is one law, and this is wood's words for it.
 *
 * - **Seasoned** is an absolute moisture: most of the way from green to
 *   what air at wood's saturation holds
 *   ({@link SATURATION_RH_PCT}). Air wetter than that
 *   cannot season wood — a damp shed seasons nothing — and a seasoned board
 *   left in it takes the water back.
 * - **The rate** is the species' — `Material.seasoningDays` (oak a year,
 *   pine half), handed to the water model as its drying rate.
 * - **Rain sets it back** and **too fast checks it** — both the water
 *   model's, for every drying solid; a board stands drying up to
 *   {@link WOOD_CHECKS_AT} times harder than good air. A checked board
 *   grades no better than fair.
 * - **Vacuous** on a material with `seasoningDays 0`: it is neither green
 *   nor seasoned, and every read answers as though the mixin were absent.
 *
 * ⭐ **A merge takes the greener** (`takeFromAbsorbed`): weakest-link
 * doctrine applied to time. A dry stack poured onto a green one loses its
 * lead.
 * - **A checked board grades no better than fair** — Integrity's
 *   making-fault ceiling (`check`), the one table (B98).
 * - ⚠ **Not wood's form.** Quarter-sawn, the wide face and cupping are how
 *   wood was CUT; they are `Timber`'s (a bar of soap seasons too).
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { MixinApi } from '../../api/mixin';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import type { Stuff } from '../stuff/Stuff';
import type Material from './Material';
import { Moisture, type Moist } from './Moisture';
import { Evaporation } from './Evaporation';
import type { MarkupAugmenter } from '../../api/mml';

/**
 * ⭐ Good drying air — what a material's `seasoningDays` is quoted against:
 * a dry, breezy, mild day, on a rack. Kernel constant.
 */
const GOOD_AIR = new Evaporation(55, 2, 290);

/**
 * The relative humidity (%) of air at wood's SATURATION — what *seasoned*
 * is measured against. Seasoned is having dried `wood.seasonedThreshold`
 * of the way from green to what this air holds, so wetter air than this
 * can never season it.
 */
const SATURATION_RH_PCT = 85;

/**
 * How many times harder than good drying air a board stands being dried
 * before it checks — a kiln run carelessly hot. ⭐ Relative to the
 * species' OWN rate: a wood that seasons in months is not judged by the
 * clay's yardstick, which is measured in days.
 */
const WOOD_CHECKS_AT = 4;

export interface Seasoning {
  /** 0 green → 1 seasoned. Reconciles first. `0` for a non-seasoning material. */
  getSeasonedFraction(): number;
  /** Seasoned enough to work without warping (≥ `wood.seasonedThreshold`). */
  isSeasoned(): boolean;
  /** Would warp if worked now. Always false for a material that does not season. */
  isGreen(): boolean;
  /** Set the seasoned fraction directly (a mint, a test, a sale of dry stock). */
  setSeasonedFraction(f: number): void;
  /**
   * @hook The line `look` reads for how far it has dried — neutral words
   * by default (*green · drying · seasoned*); a composer says what IT looks
   * like doing it (a board's end grain, a soap bar's harshness).
   */
  seasonPhrase(fraction: number): string;
  /** @hook How it was made, read off its form — `''` by default. */
  seasonGrainLine(): string;
  /**
   * @hook Has it MOVED as it dried — a flat-sawn board's face gone hollow
   * (wood's word: cupped)? `false` by default: a bar of soap does not cup.
   * The CUT that decides it is the composer's (`Timber`'s quarter-sawn and
   * wide face); the drying is this mixin's.
   */
  isCupped(): boolean;
}

function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/**
 * The seasoning line, in words — the no-gauge rule. ⭐ The WORDS are the
 * composer's ({@link Seasoning.seasonPhrase}, {@link Seasoning.seasonGrainLine}):
 * the mixin speaks for *a solid drying in air*, and a board or a bar of
 * soap says what it looks like doing it.
 */
function seasoningAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!MixinApi.isSeasoning(host)) return text;
  const days = MixinApi.isTangible(host)
    ? (host.getMaterial()?.getSeasoningDays() ?? 0)
    : 0;
  if (days <= 0) return text;
  const line = host.seasonPhrase(host.getSeasonedFraction());
  const grain = host.seasonGrainLine();
  const both = grain ? `${grain} ${line}` : line;
  return text && text.length > 0 ? `${text}\n\n${both}` : both;
}

export function SeasoningMixin<TBase extends MixinConstructor<Stuff & Moist>>(Base: TBase) {
  return class SeasoningMixin extends Base implements Seasoning {
    static _mixinName: string = 'SeasoningMixin';
    static markupAugmenters: MarkupAugmenter[] = [seasoningAugmenter];
    static fieldMeta: FieldMeta = {
      // ⭐ A SEED, not a stored value: how seasoned a minted piece arrives
      // (a stave, a sawn board), written into the water state once.
      seasonedFraction: { authorable: true, seed: true },
    };

    public seasonPhrase(fraction: number): string {
      return fraction >= 0.95
        ? 'It is fully seasoned.'
        : this.isSeasoned()
          ? 'It is seasoned.'
          : fraction >= 0.15
            ? 'It is still drying.'
            : 'It is green.';
    }

    public seasonGrainLine(): string {
      return '';
    }

    public isCupped(): boolean {
      return false;
    }

    private seasoningDaysOf(): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isTangible(self)) return 0;
      const m = self.getMaterial() as Material | null;
      return m ? m.getSeasoningDays() : 0;
    }

    /** The moisture `fraction` of the way from green to seasoned. */
    private moistureSeasonedTo(fraction: number): number {
      const sat = Moisture.equilibriumMoisture(SATURATION_RH_PCT);
      return 1 - Math.max(0, Math.min(1, fraction)) * (1 - sat);
    }

    /**
     * ⭐ How fast this dries in GOOD air, as the fraction of its gap to that
     * air closed per game-hour — from `seasoningDays`, the days it takes
     * there to reach the `wood.seasonedThreshold` mark. Derived, never
     * tabulated: the moisture approaches the air's equilibrium
     * exponentially, so the mark is reached at `k·t = −ln((m* − eq) ÷ (1 − eq))`.
     */
    private goodAirPerHour(): number | undefined {
      const days = this.seasoningDaysOf();
      if (!(days > 0)) return undefined;
      const at = Math.min(0.99, Math.max(0.01, dial(AppSettingKeys.woodSeasonedThreshold, 0.8)));
      const eq = Moisture.equilibriumMoisture(GOOD_AIR.humidityPct);
      const mark = this.moistureSeasonedTo(at);
      if (!(mark > eq)) return undefined;
      return -Math.log((mark - eq) / (1 - eq)) / (days * 24);
    }

    /** The species' rate, as the base the water model scales by the air. */
    /** @hook A board's seasoning speaks for its water (its own augmenter). */
    public waterPhrase(): string | null {
      return null;
    }

    public dryingRatePerHour(): number | undefined {
      const good = this.goodAirPerHour();
      const air = GOOD_AIR.evaporationFactor();
      return good !== undefined && air > 0 ? good / air : undefined;
    }

    public seedSeasonedFraction(value: number): void {
      if (typeof value !== 'number' || !Number.isFinite(value)) return;
      this.setSeasonedFraction(value);
    }

    getSeasonedFraction(): number {
      if (this.seasoningDaysOf() <= 0) return 0;
      const m = (this as unknown as Moist).getMoisture();
      const sat = Moisture.equilibriumMoisture(SATURATION_RH_PCT);
      return Math.max(0, Math.min(1, (1 - m) / (1 - sat)));
    }

    isSeasoned(): boolean {
      if (this.seasoningDaysOf() <= 0) return false;
      return this.getSeasonedFraction() >= dial(AppSettingKeys.woodSeasonedThreshold, 0.8);
    }

    isGreen(): boolean {
      if (this.seasoningDaysOf() <= 0) return false;
      return !this.isSeasoned();
    }

    /** Written as moisture: `f` of the way from green to seasoned. */
    setSeasonedFraction(f: number): void {
      const water = this as unknown as Moist;
      water.setWaterState({
        moisture: this.moistureSeasonedTo(Number(f) || 0),
        solute: water.getSolute(),
      });
    }

    /**
     * Scaled so the water model's one rule (`dryness/hour × risk` past
     * `cure.crackRate`) fires when this air dries it {@link WOOD_CHECKS_AT}
     * times faster than good drying air would
     * ({@link goodAirPerHour}).
     */
    public dryingCrackRisk(): number {
      const goodPerHour = this.goodAirPerHour();
      if (goodPerHour === undefined || !(goodPerHour > 0)) return 0;
      return dial(AppSettingKeys.cureCrackRate, 0.05) / (WOOD_CHECKS_AT * goodPerHour);
    }

    /**
     * ⭐ A merge takes the greener — weakest-link, applied to time. Read off
     * the absorbed stack BEFORE it is destructed (the Stackable seam).
     */
    takeFromAbsorbed(absorbed: Stuff): void {
      if (MixinApi.isSeasoning(absorbed)) {
        const theirs = absorbed.getSeasonedFraction();
        if (theirs < this.getSeasonedFraction()) this.setSeasonedFraction(theirs);
      }
      const base = (Base.prototype as unknown as { takeFromAbsorbed?: (a: Stuff) => void }).takeFromAbsorbed;
      if (base) base.call(this, absorbed);
    }
  };
}
