/**
 * TanningMixin — ⭐⭐ **a hide becomes leather by standing in something.**
 *
 * ## Why this is not maturation, and the argument matters
 *
 * The engine already ships a durative transform: `MaturingMixin` turns
 * wine into vinegar and flax into linen on a slow clock with no verb at
 * all. It was the obvious host and it is the wrong one, for one
 * structural reason.
 *
 * Maturation rides the **vessel** and converts the vessel's *interior
 * bulk material* — one batch, keyed to a slot, and the mixin throws
 * outright without `BulkableMixin` because *"the transform rides the
 * vessel's interior bulk slot."* Tanning is the other shape: **what
 * changes is each individual skin and what depletes is the liquor.** Six
 * hides in one pit are six separate pieces of state at six different
 * stages, and a seventh dropped in today is behind them. Expressing that
 * as a bulk conversion would mean pouring a hide, which is a sentence
 * that should not be writable.
 *
 * So the shipped mechanism with a different feedstock is
 * `WaterActivityMixin`'s: **an item's own state advancing against the
 * thing it is sitting in, reconciled on read.** `Provision`'s own comment
 * already predicted this one — *"the split is what lets a tannery dry a
 * skin without claiming it ferments."*
 *
 * ## ⭐ The pit is a CONDITION, not a machine
 *
 * The reconcile asks one question — *is my container a tanpit with liquor
 * covering me?* — and reads two numbers off it. It never narrows the host
 * set, which is what keeps this a condition read rather than a guard:
 * a hide on a shelf simply advances at zero.
 *
 *   - **strength** — bark per litre. Under-barked liquor is weak and slow.
 *   - **coverage** — litres per kilogram of hide. ⭐ A pit crammed with
 *     skins tans all of them badly, which is the real failure of a
 *     greedy tanner and needs no rule of its own: the hides divide the
 *     same water.
 *
 * Rate is `strength × coverage / FULL_DAYS` per game day. Cold stalls it
 * (a frozen pit does nothing), and there is deliberately **no Arrhenius
 * term**: a tanpit is not a kiln, the useful range is one season wide,
 * and a second temperature curve here would be a number nobody could
 * feel.
 *
 * ## ⚠ The two failures, and only one is your fault
 *
 *   - **Pulled early** — it comes out as rawhide at partial tannage:
 *     still rots, still wants the pit. Recoverable; put it back.
 *   - **Left too long** — the liquor keeps working into the grain and the
 *     skin goes brittle and hard. ⚠ Not recoverable, and this is the one
 *     the player causes by not paying attention. Vinegar's mechanism, and
 *     the retting pit's: the over-ret is the one failure in the whole
 *     chain you cannot undo.
 *
 * ⭐ Over-strong liquor does the same thing faster. A tanner who throws
 * in all his bark to save time gets a hard, cracked hide, which is why
 * the pit's read says *strong* and not *good*.
 *
 * ## What `look` says, and what it never says
 *
 * Words, never a number — the instrumentation doctrine, and the same
 * reason hefting a hive has no figure in it. *Barely touched* · *taking*
 * · *most of the way* · *ready* · *gone hard*. Competence resolves
 * DETAIL, never access: anybody can see a hide is in a pit.
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
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type Material from '@saxonberg/server/mud/lib/material/Material';

/** Seconds in a game day — the clock everything slow is denominated in. */
const SECONDS_PER_GAME_DAY = 24 * 60 * 60;

/** What a tanpit has to answer for the reconcile to read it. */
export interface TanLiquor {
  /** Bark per litre, normalized `[0, 1]`; `1` is a full charge. */
  strength: number;
  /** Litres of liquor standing over each kilogram of hide, raw. */
  litresPerKg: number;
  /** Liquor temperature in kelvin. */
  temperatureK: number;
}

/**
 * ⭐⭐ **Every dial in the trade, in one table, and they are
 * playtest-tuned rather than derived.**
 *
 * The real figures are months to a year in a bark pit, which is a
 * different game — a player cannot plan around a year. `FULL_DAYS` is
 * three game weeks at full strength and full coverage, which is long
 * enough that the pit is an investment and short enough that one session
 * can see a hide through if the clock is pushed.
 */
export const TANNING = {
  /** Game days to full tannage in a strong, uncrowded pit. */
  FULL_DAYS: 21,
  /** Kilograms of bark that fully charges one litre of liquor. */
  BARK_KG_PER_LITRE: 0.05,
  /** Litres of liquor a kilogram of hide needs for full coverage. */
  LITRES_PER_KG: 4,
  /** Below this the liquor is frozen and nothing happens at all. */
  FROZEN_K: 275,
  /** Tannage past `1` at which the skin has lost a whole grade band. */
  OVERRUN_PER_BAND: 0.3,
  /** Liquor this many times full strength starts to harm the grain. */
  HARSH_STRENGTH: 2,
  /** What a tanned hide masses, as a share of the green skin. */
  LEATHER_MASS_SHARE: 0.45,
  /** Kilograms of bark one kilogram of hide consumes out of the pit. */
  BARK_PER_KG_HIDE: 1.2,
} as const;

/** The read a player gets — words, never a number. */
export type TanBand =
  | 'green'
  | 'barely'
  | 'taking'
  | 'nearly'
  | 'ready'
  | 'overdone';

export interface TanReport {
  band: TanBand;
  /** One sentence, in the world's voice. */
  line: string;
  /** Is it leather yet? */
  done: boolean;
}

const BAND_LINES: Record<TanBand, string> = {
  green:
    'It is a green skin: limp, heavy and starting to smell. Nothing has happened to it yet.',
  barely:
    'The liquor has barely touched it. Cut a corner and it would still be raw all the way through.',
  taking:
    'It is taking. The edges have gone pale and firm and the middle has not.',
  nearly:
    'Most of the way. A thumbnail still finds soft grain near the spine, and another week would see it right.',
  ready:
    'Tanned through — firm, even-coloured, and it has stopped being something that rots.',
  overdone:
    'It has had far too long. The grain has gone hard and dark and it cracks rather than folds. Nothing will bring it back.',
};

export interface Tanning {
  /** `[0, …]` — `1` is tanned through; past that it is spoiling. */
  getTannage(): number;
  /** Advance the hide against whatever it is standing in. */
  reconcileTanning(): void;
  /** What a player sees when they look at it. */
  tanReport(): TanReport;
  /** Has the transform run? */
  isTanned(): boolean;

  _tannage: number;
  _tanClockStamp: number;
  _tanWorst: number;
}

/** Append the tanning line to a hide's long description. */
function tanAugmenter(text: string, host: Stuff): string {
  if (host.isDestroyed()) return text;
  if (!MixinApi.hasMixin(host.constructor as never, 'TanningMixin' as never)) {
    return text;
  }
  const report = (host as unknown as Tanning).tanReport();
  return text && text.length > 0 ? `${text}\n\n${report.line}` : report.line;
}

export function TanningMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class TanningMixin extends Base implements Tanning {
    static _mixinName = 'TanningMixin';

    /**
     * ⚠ The refusal names what a hide needs beneath it and why. Tanning
     * writes a GRADE BAND (`Crafted`) onto a skin whose MATERIAL changes
     * (`Tangible`) and which rots until it does not (`Freshness`) — so a
     * host missing any of them would tan into something with no grade, no
     * new material, or an eternal green skin.
     */
    static _mixinRefusal =
      'TanningMixin needs TangibleMixin (the material changes), ' +
      'CraftedMixin (the pit writes a grade band the tailor reads) and ' +
      'FreshnessMixin (a green hide rots until it is leather).';

    static markupAugmenters: MarkupAugmenter[] = [tanAugmenter];

    static fieldMeta: FieldMeta = {
      _tannage: { persistent: true, authorable: true },
      _tanClockStamp: { persistent: true },
      _tanWorst: { persistent: true },
    };

    /** `0` is a green skin — the sparse default, so nothing is stored. */
    public _tannage = 0;
    /** Game-seconds of the last reconcile; `0` = never in a pit. */
    public _tanClockStamp = 0;
    /**
     * ⭐ The worst liquor this skin ever stood in, `[0, 1]` of a grade
     * band's worth of damage. **A hide remembers**, the way a fleece
     * remembers the worst stretch of the year the sheep lived through:
     * feeding it up afterwards does not heal a break, and neither does a
     * week in gentler liquor repair burnt grain.
     */
    public _tanWorst = 0;

    /** Reentry guard — a reconcile must never recurse through a read. */
    private _reconcilingTan = false;

    public getTannage(): number {
      this.reconcileTanning();
      return this._tannage;
    }

    public isTanned(): boolean {
      return this.getTannage() >= 1;
    }

    /**
     * ⭐ The liquor this hide is standing in, or `null`.
     *
     * A **condition read**, never a host narrowing: it asks the container
     * a question and takes `null` for an answer. A hide on a shelf, in a
     * cart or in somebody's arms advances at zero and needs no guard
     * anywhere to say so.
     */
    protected liquorOver(): TanLiquor | null {
      const self = this as unknown as Stuff;
      if (!MixinApi.isContainable(self)) return null;
      const pit = self.getContainer();
      if (!pit || pit.isDestroyed()) return null;
      const asPit = pit as unknown as {
        tanLiquorFor?(hideKg: number): TanLiquor | null;
      };
      if (typeof asPit.tanLiquorFor !== 'function') return null;
      const kg = MixinApi.isTangible(self) ? self.getMass().rawValue() : 0;
      return asPit.tanLiquorFor(kg);
    }

    public reconcileTanning(): void {
      if (this._reconcilingTan) return;
      const nowS = WorldClockApi.getNow().rawValue();
      if (!Number.isFinite(nowS) || nowS <= 0) return;

      const liquor = this.liquorOver();
      if (!liquor) {
        // Out of the pit: the clock stops where it stopped. ⚠ The stamp is
        // CLEARED rather than carried, so a hide pulled out on Monday and
        // put back on Friday does not silently collect the four days it
        // spent on a shelf.
        this._tanClockStamp = 0;
        return;
      }

      const last = this._tanClockStamp;
      this._tanClockStamp = nowS;
      if (last <= 0 || nowS <= last) return;
      if (liquor.temperatureK < TANNING.FROZEN_K) return;
      if (this._tannage >= 1 + TANNING.OVERRUN_PER_BAND * 4) return;

      const days = (nowS - last) / SECONDS_PER_GAME_DAY;
      const strength = clamp01(liquor.strength);
      const coverage = clamp01(liquor.litresPerKg / TANNING.LITRES_PER_KG);
      if (strength <= 0 || coverage <= 0) return;

      this._reconcilingTan = true;
      try {
        this._tannage += (strength * coverage * days) / TANNING.FULL_DAYS;
        // ⭐ Harsh liquor is remembered, not applied: the damage lands on
        // the grade band when the hide comes out, which is when a grade
        // band is a thing a hide has.
        if (liquor.strength > TANNING.HARSH_STRENGTH) {
          this._tanWorst = Math.max(this._tanWorst, 1);
        }
      } finally {
        this._reconcilingTan = false;
      }
    }

    public tanReport(): TanReport {
      const t = this.getTannage();
      const band: TanBand =
        t <= 0
          ? 'green'
          : t >= 1 + TANNING.OVERRUN_PER_BAND
            ? 'overdone'
            : t >= 1
              ? 'ready'
              : t >= 0.75
                ? 'nearly'
                : t >= 0.25
                  ? 'taking'
                  : 'barely';
      return { band, line: BAND_LINES[band], done: t >= 1 };
    }

    /**
     * ⭐⭐ **Become leather.** Called by `get`-ing the hide out of the pit
     * (or by `tan` on a hide that is already through), and it is the only
     * place the material changes.
     *
     * ⚠ Returns `false` and changes nothing when the hide is not through:
     * a skin pulled early stays a green skin at partial tannage, which is
     * the honest outcome and is recoverable by putting it back.
     *
     * The mass falls to `LEATHER_MASS_SHARE` — water and flesh leave, and
     * a 25 kg green hide is about 11 kg of leather, which is roughly true.
     */
    public async becomeLeather(leatherMaterialPath: string): Promise<boolean> {
      if (!this.isTanned()) return false;
      const self = this as unknown as Stuff;
      if (!MixinApi.isTangible(self)) return false;
      const material = await StuffApi.singleton<Material>(
        leatherMaterialPath,
      );
      const green = self.getMass().rawValue();
      self.setMaterial(material);
      self.setMass(
        Quantity.of(
          Math.round(green * TANNING.LEATHER_MASS_SHARE * 100) / 100,
          'kg',
        ),
      );
      return true;
    }

    /**
     * How many grade bands the pit cost this skin — the overrun it sat
     * through plus any harsh liquor it remembers.
     */
    public tanPenaltyBands(): number {
      const over = Math.max(0, this.getTannage() - 1);
      return Math.floor(over / TANNING.OVERRUN_PER_BAND) + this._tanWorst;
    }
  };
}

function clamp01(v: number): number {
  return !Number.isFinite(v) || v < 0 ? 0 : v > 1 ? 1 : v;
}
