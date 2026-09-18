/**
 * StalingMixin — **bread goes stale, and staling is not spoilage.**
 *
 * ⭐⭐⭐ The two clocks point OPPOSITE WAYS, and that is the whole design.
 *
 * Spoilage is microbial: warm and wet is where things grow, so the
 * shipped freshness gauge runs faster as it gets hotter and pauses at
 * freezing. Staling is not alive at all. It is **retrogradation** — the
 * starch that gelatinised in the oven slowly re-crystallising — and the
 * rate peaks a few degrees above freezing, falls away as it warms, and
 * stops when actually frozen.
 *
 * So:
 *
 * | where you put the loaf | spoils | stales |
 * |---|---|---|
 * | the bread box (293 K) | slowly | slowly |
 * | the cold larder (277 K) | hardly at all | **fastest** |
 * | frozen (270 K) | stopped | **stopped** |
 * | the oven (330 K+) | killed | **reversed** |
 *
 * ⭐ Which produces the one piece of real kitchen knowledge this whole
 * subsystem exists to make discoverable: **the icebox is the worst place
 * for bread.** It keeps it from going mouldy by making it go hard
 * faster, and most people get that exactly backwards. Nobody is told
 * this; two loaves in two rooms overnight say it.
 *
 * And the reversal is the other half: heat un-crystallises the starch,
 * so a stale loaf put back in the oven **comes back** — not all the way
 * (`refreshFloor`), because each pass loses a little, and you can only
 * do it so many times before what you have is a rusk.
 *
 * ## Why this lives in the pack and not the kernel
 *
 * One composer: `Loaf`. The kernel test for substrate is *composers with
 * no common pack ancestor*, and there is one composer in one pack. When
 * cooked rice and a boiled potato want retrogradation — and they should,
 * because it is the same chemistry — that is the third-pack signal to
 * promote this to `lib/material/`. Not before.
 *
 * ⚠ **No far-past guard and no linkdead freeze**, for `Freshness`'s
 * reason exactly: it is the entire point that bread stales while you are
 * away. A guard here would mean a loaf left over a weekend came back
 * fresh.
 *
 * ⚠ The rate is read at a SINGLE SAMPLE per reconcile rather than
 * integrated (the `ThermalDose` treatment). That is honest here and not
 * there: staling runs over hours to days, and a loaf's thermal time
 * constant is minutes, so by the time any of this matters the loaf is at
 * room temperature. The rectangle rule is exact at that ratio.
 */

import type {
  MixinConstructor,
  FieldMeta,
} from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';

/** The player-facing staling band. */
export type StalingBand = 'fresh' | 'firm' | 'stale' | 'hard';

const SECONDS_PER_HOUR = 3600;

/**
 * ⭐ Phrases chosen to share **no word** with `FRESHNESS_PHRASE`, and a
 * test asserts it. A loaf that is going hard and a loaf that is going
 * off must never read alike, because the two clocks point opposite ways
 * and a player who conflates them will store bread in exactly the wrong
 * place.
 */
const STALING_PHRASE: Record<Exclude<StalingBand, 'fresh'>, string> = {
  firm: 'The crumb has tightened a little.',
  stale: 'It has gone dry and close-grained; the crust is leathery.',
  hard: 'It is hard all the way through. You could knock on it.',
};

/** You see it and you touch it; you do not smell staling. */
const STALING_CHANNELS: readonly string[] = ['vision', 'touch'];

function stalingAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
  opts?: { filter?: readonly string[] },
): string {
  if (opts?.filter && !opts.filter.some((c) => STALING_CHANNELS.includes(c))) {
    return text;
  }
  const duck = host as unknown as Partial<Stales>;
  if (typeof duck.getStalingBand !== 'function') return text;
  if (host.isDestroyed()) return text;
  const band = duck.getStalingBand();
  if (band === 'fresh') return text;
  const line = STALING_PHRASE[band];
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

/** The staling capability surface. */
export interface Stales {
  /** Staleness `[0, 1]` — reconciles on read. */
  getStaleness(): number;
  /** Current banded staleness (presentation, never a number). */
  getStalingBand(): StalingBand;
  /** Reconcile the elapsed staling (sync). */
  reconcileStaling(): void;
  /** Set it outright — the mint, and the test seam. */
  setStaleness(value: number): void;

  // Public so the Hydrator can reflect into them.
  _staleness: number;
  stalingClockStamp: number;
  /** Authored per row: the five numbers that shape the curve. */
  kPeakPerHour: number;
  peakK: number;
  sigmaK: number;
  frozenK: number;
  refreshK: number;
  refreshPerHour: number;
  refreshFloor: number;
}

export function StalingMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class StalingMixin extends Base implements Stales {
    static _mixinName: string = 'StalingMixin';

    static fieldMeta: FieldMeta = {
      _staleness: { persistent: true },
      stalingClockStamp: { persistent: true },
      kPeakPerHour: { persistent: true, authorable: true },
      peakK: { persistent: true, authorable: true },
      sigmaK: { persistent: true, authorable: true },
      frozenK: { persistent: true, authorable: true },
      refreshK: { persistent: true, authorable: true },
      refreshPerHour: { persistent: true, authorable: true },
      refreshFloor: { persistent: true, authorable: true },
    };

    static markupAugmenters: MarkupAugmenter[] = [stalingAugmenter];

    /** 0 = straight out of the oven, 1 = a brick. */
    public _staleness = 0;
    public stalingClockStamp = 0;

    /**
     * ⭐ The five numbers are AUTHORED FIELDS with class defaults, not
     * kernel dials. Staling is this pack's axis and a rye loaf may stale
     * differently from a white one — that is a content decision, and a
     * global knob would deny it.
     */
    public kPeakPerHour = 0.02;
    /** Where retrogradation is fastest — a few degrees above freezing. */
    public peakK = 277;
    /** How sharply the rate falls away from the peak. */
    public sigmaK = 12;
    /** At or below this the water is ice and the starch cannot move. */
    public frozenK = 273;
    /** At or above this, heat un-crystallises the starch. */
    public refreshK = 330;
    /** How fast it comes back in the oven. */
    public refreshPerHour = 1.2;
    /** ⭐ How far back it comes — never all the way. */
    public refreshFloor = 0.2;

    private _reconcilingStaling = false;

    public getStaleness(): number {
      if (!this._reconcilingStaling) this.reconcileStaling();
      return clamp01(this._staleness);
    }

    public getStalingBand(): StalingBand {
      const s = this.getStaleness();
      if (s >= 0.8) return 'hard';
      if (s >= 0.5) return 'stale';
      if (s >= 0.25) return 'firm';
      return 'fresh';
    }

    public setStaleness(value: number): void {
      if (!Number.isFinite(value)) return;
      this._staleness = clamp01(value);
      const nowS = stalingNow();
      if (nowS !== null) this.stalingClockStamp = nowS;
    }

    /**
     * ⚠ No far-past guard and no linkdead freeze. Bread stales while you
     * are away, and that is the point rather than an oversight.
     */
    public reconcileStaling(): void {
      if (this._reconcilingStaling) return;
      const nowS = stalingNow();
      if (nowS === null) return;
      if (this.stalingClockStamp === 0) {
        this.stalingClockStamp = nowS;
        return;
      }
      const elapsed = nowS - this.stalingClockStamp;
      if (elapsed <= 0) {
        this.stalingClockStamp = nowS;
        return;
      }
      this._reconcilingStaling = true;
      try {
        const self = this as unknown as Stuff;
        const tempK = MixinApi.isThermal(self)
          ? self.getTemperature().rawValue()
          : 293;
        const hours = elapsed / SECONDS_PER_HOUR;

        if (tempK >= this.refreshK) {
          // ⭐ REVERSAL. Heat un-crystallises the starch, so the loaf
          // comes back — but only to the floor, because each pass loses
          // a little and enough passes leave you with a rusk.
          const back = this._staleness - this.refreshPerHour * hours;
          this._staleness = clamp01(Math.max(this.refreshFloor, back));
        } else if (tempK <= this.frozenK) {
          // Frozen: the water is ice and the starch cannot move at all.
          // A thawed loaf resumes where it left off — freezing is a
          // pause, never a reset.
        } else {
          this._staleness = clamp01(
            this._staleness + this.rateAt(tempK) * hours,
          );
        }
        this.stalingClockStamp = nowS;
      } finally {
        this._reconcilingStaling = false;
      }
    }

    /**
     * ⭐ The curve: a Gaussian peaking just above freezing. Room
     * temperature (293 K) runs at about a sixth of the peak rate, which
     * is why the cold larder is the worst place for a loaf and the
     * counter is a better one.
     */
    private rateAt(tempK: number): number {
      if (tempK <= this.frozenK) return 0;
      const sigma = this.sigmaK > 0 ? this.sigmaK : 1;
      const z = (tempK - this.peakK) / sigma;
      return this.kPeakPerHour * Math.exp(-(z * z));
    }
  };
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Game-seconds now, or null when no world clock (pre-boot / tests). */
function stalingNow(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    return null;
  }
  return WorldClockApi.getNow().rawValue();
}
