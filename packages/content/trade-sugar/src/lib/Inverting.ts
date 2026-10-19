/**
 * InvertingMixin — ⭐ cut cane spoils on a clock, and the spoiling is
 * GRADE (sugar D15).
 *
 * Once the cane is cut its sucrose starts turning to glucose and fructose
 * — invert sugar, which will not crystallise. So cane is milled the day it
 * is cut, and cane that waited gives a juice that grains less and drains
 * more molasses. Nothing here says "less sugar": the crop's grade falls as
 * it inverts, the crush grades the juice by its worst input, the copper
 * carries that grade, and the cone's drain set gives a poorer strike more
 * molasses (`DrainSetting.drainPerBand`). Less sugar, more molasses, by
 * derivation.
 *
 * Reconcile on read, the `Staling` shape: the inverted fraction advances
 * from the moment the crop exists at `rate(T)` per hour — about 2 % an
 * hour at a tropical 300 K, halving for every 10 K colder.
 */

import type { MixinConstructor, FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';

const SECONDS_PER_HOUR = 3_600;
/** Inverted fraction per hour at the reference temperature. */
const RATE_AT_REF = 0.02;
const REF_K = 300;
/** Kelvin colder that halves the rate. */
const HALVING_K = 10;

/** `look` reads how far the cut cane has turned. */
function invertingAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
  opts?: { filter?: readonly string[] },
): string {
  if (opts?.filter) return text;
  const duck = host as unknown as Partial<Inverts>;
  if (typeof duck.invertingWord !== 'function' || host.isDestroyed()) return text;
  const line = `It is ${duck.invertingWord()}.`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

export interface Inverts {
  /** Inverted fraction `0..1` — reconciles on read. */
  getInverted(): number;
  /** fresh-cut · turning · inverted — a word, never the number. */
  invertingWord(): string;
  /** Reconcile the inversion to now. */
  reconcileInversion(): void;
}

export function InvertingMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class InvertingMixin extends Base implements Inverts {
    static _mixinName: string = 'InvertingMixin';

    static fieldMeta: FieldMeta = {
      inverted: { persistent: true, runtimeState: true },
      invertStamp: { persistent: true, runtimeState: true },
      cutBand: { persistent: true, runtimeState: true },
    };

    static markupAugmenters: MarkupAugmenter[] = [invertingAugmenter];

    /** How much of the sucrose has turned, `0..1`. */
    public inverted = 0;
    /** Game-seconds of the last reconcile; `0` = not yet stamped. */
    public invertStamp = 0;
    /** The grade it was cut at — inversion lowers the grade from this. */
    public cutBand = '';

    public getInverted(): number {
      this.reconcileInversion();
      return this.inverted;
    }

    public invertingWord(): string {
      const f = this.getInverted();
      if (f < 0.1) return 'fresh-cut and running with juice';
      if (f < 0.25) return 'turning — a day off the stalk';
      return 'inverted, gone sour at the cut ends';
    }

    public reconcileInversion(): void {
      const self = this as unknown as Stuff;
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return;
      const now = WorldClockApi.getNow().rawValue();
      if (this.invertStamp === 0) {
        this.invertStamp = now;
        if (MixinApi.isGraded(self) && this.cutBand === '') this.cutBand = self.getGrade().getBand();
        return;
      }
      const elapsed = now - this.invertStamp;
      this.invertStamp = now;
      if (!(elapsed > 0) || this.inverted >= 1) return;
      // ⭐ Integrated over the cane's own temperature trajectory, not its
      // temperature now: a bundle that sat in the noon sun and was carried
      // into the shade turned at the noon rate while it was there.
      const rateAt = (k: number): number => RATE_AT_REF * Math.pow(0.5, (REF_K - k) / HALVING_K);
      const hours = MixinApi.isThermal(self)
        ? self
            .temperatureTrajectory(now - elapsed, now)
            .integrate((k) => rateAt(k), 8) / SECONDS_PER_HOUR
        : rateAt(REF_K) * (elapsed / SECONDS_PER_HOUR);
      // First order: what has not turned turns at the rate.
      this.inverted = 1 - (1 - this.inverted) * Math.exp(-hours);
      // ⭐ The grade falls as it turns: a band under a quarter, two under half.
      if (MixinApi.isGraded(self) && Grade.isBand(this.cutBand)) {
        const drop = this.inverted >= 0.5 ? 2 : this.inverted >= 0.25 ? 1 : 0;
        self.setGrade(Grade.fromOrdinal(Grade.of(this.cutBand).getOrdinal() - drop));
      }
    }
  };
}
