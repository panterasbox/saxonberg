/**
 * Turbary — ⭐⭐ **a peat bank, and the one RGO in this game that carries an
 * irreversible choice with no dominant option.**
 *
 * Peat is ground that is nearly all organic matter, with a finite depth.
 *
 *  - **Cutting** removes depth. Turves come off the bank and the bank gets
 *    shallower, and nothing puts it back: the ten centimetres a bog makes in
 *    a century is not a game-time quantity.
 *  - ⭐⭐ **Draining** oxidises and subsides it. You lose the fuel and gain
 *    **the best arable ground there is** — which is what the fens are. So the
 *    choice is *the fuel or the field, and not both*, and neither answer is
 *    wrong.
 *
 * ⚠⚠ **And whoever drains upslope destroys a neighbour's turbary without ever
 * entering their land.** That externality is real in the fiction and **absent
 * from the mechanism** in this build: nothing in the shipped watershed couples
 * a ditch in one room to the water table of another, so the bank is drained by
 * ditching the bank itself, which anybody standing on it may do (labour is not
 * title-gated — the farming rule). ⭐ The honest ship is the externality
 * *without* the remedy, **said out loud**, and the remedy owed to the
 * watershed's rights records where an appropriation can already be contested.
 * ⚠ Papering it over with a refusal would invent a criterion nobody chose.
 *
 * ## Why it is a class and the stone pit is not
 *
 * `PersistableMixin(ImprovableMixin(OpenWorkingMixin(SingletonCartesianLocation)))`
 * — the pit's composition plus **improvement**, and that is the entire
 * difference. Composing `ImprovableMixin` claims *this ground can be cleared,
 * drained and limed, and it reverts*, which is honest on a moss: clearing is
 * the scrub and the heather, draining is the lesson, and liming is real
 * because peat is acid. ⚠ It is deliberately **not** on `OpenWorking`:
 * ditching a stone pit would have no consequence in this build, and a verb
 * that does nothing is the antipattern a gate exists for.
 *
 * ⭐ No guard anywhere re-narrows the host set, which is the test.
 */

import SingletonCartesianLocation from '@saxonberg/server/mud/platform/location/SingletonCartesianLocation';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import {
  ImprovableMixin,
  type ImprovementCost,
  type ImprovementJob,
} from '@saxonberg/server/mud/lib/ground/Improvable';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { OpenWorkingMixin } from '../lib/OpenWorking';

/**
 * Metres of peat a fully drained moss loses per game-day, at full drainage.
 *
 * ⭐ Slow, and it has to be: a real drained fen subsides a centimetre or two a
 * year for decades. At the shipped scale a game day is two real hours, so
 * 0.004 m/day is a metre of peat in about 250 game days of maintained drains —
 * a season's work destroying a generation's fuel, which is the right shape for
 * the lesson and is exactly what happened to the fens.
 */
const SUBSIDE_M_PER_GAME_DAY = 0.004;

const SECONDS_PER_GAME_DAY = 86_400;

const TurbaryBase = PersistableMixin(
  ImprovableMixin(OpenWorkingMixin(SingletonCartesianLocation)),
);

export default class Turbary extends TurbaryBase {
  static fieldMeta: FieldMeta = {
    subsidenceM: { persistent: true, authorable: true },
    subsidenceStamp: { persistent: true },
  };

  /**
   * Metres of peat that have oxidised away because the drains work.
   *
   * ⭐ Separate from `floorDepthM`, and the separation is the point:
   * `floorDepthM` is what somebody **cut**, and this is what **went** while
   * nobody was here. A bank can be shallow because it was worked or shallow
   * because it was drained, and a player walking onto one should be able to
   * tell the difference by asking which happened.
   *
   * ⚠ Authorable, so a venue can ship a half-subsided moss — the same
   * affordance that lets it ship a played-out working.
   */
  public subsidenceM = 0;

  /** Game-seconds stamp of the last subsidence reconcile; `0` = never. */
  public subsidenceStamp = 0;

  /** Reentry guard — the reconcile must never recurse through a read. */
  private _subsiding = false;

  /**
   * How much peat is left, in metres: what the column says minus what was cut
   * minus what oxidised. ⭐ Reconciles on read, so a bank nobody has looked at
   * for a real week has still been subsiding all that time.
   */
  public async peatRemainingM(): Promise<number> {
    this.reconcileSubsidence();
    const faces = await this.exposedBands();
    const peat = faces.reduce(
      (m, f) => m + Math.max(0, f.topZ - f.toZ),
      0,
    );
    return Math.max(0, peat - this.getFloorDepthM() - this.subsidenceM);
  }

  /**
   * ⚠⚠ **Integrate the subsidence over elapsed game-time, with NO far-past
   * guard.** The family clock's guard is for the inhabited body alone; land
   * changes over the whole absence, which is the entire point — a moss you
   * drained and left for a real month has gone, and that is how the choice
   * becomes irreversible rather than reversible-by-logging-out.
   */
  public reconcileSubsidence(): void {
    if (this._subsiding) return;
    const nowS = nowSeconds();
    if (nowS === null) return;
    if (this.subsidenceStamp === 0) {
      this.subsidenceStamp = nowS;
      return;
    }
    const elapsed = nowS - this.subsidenceStamp;
    if (elapsed <= 0) {
      this.subsidenceStamp = nowS;
      return;
    }
    this._subsiding = true;
    try {
      const days = elapsed / SECONDS_PER_GAME_DAY;
      const bill = this.bill();
      // ⭐ It only happens as fast as the DRAINS work. An unditched moss is
      // waterlogged and anaerobic, which is the whole reason the peat is
      // there — so progress on `draining` IS the rate.
      //
      // ⭐⭐ **And both quantities move over the same window**, in opposite
      // directions: the peat oxidises while the drains silt up. Reading only
      // the END of the window credits an abandoned moss with **zero**
      // subsidence for a month in which its drains were working; reading only
      // the START credits it with a month of full-rate oxidation through drains
      // that had stopped working. Neither is true, so this integrates the
      // TRAPEZOID — which is exact for a linear decay, costs one extra read,
      // and gets the honest answer: *some of it went.*
      //
      // ⚠ `improvementWork` is read raw for the start value, deliberately:
      // `progressOn` reconciles the reversion first, and the reversion is
      // precisely the thing being integrated against.
      const required = bill.draining;
      const startDrained =
        required > 0
          ? Math.min(1, (this.improvementWork['draining'] ?? 0) / required)
          : 1;
      const endDrained = this.progressOn('draining', bill);
      const drained = (startDrained + endDrained) / 2;
      if (drained > 0) {
        this.subsidenceM += SUBSIDE_M_PER_GAME_DAY * drained * days;
      }
      this.subsidenceStamp = nowS;
    } finally {
      this._subsiding = false;
    }
  }

  /**
   * ⭐⭐ **What this ground owes — the kernel's improvement hook.**
   *
   * A `Field` answers this out of farming's seeded `GroundCharacter`. A moss
   * answers it out of **itself**, and it can, because a bog's bill is not a
   * mystery: there is scrub on it, the water has nowhere to go, and it is
   * sour. That asymmetry is exactly why the hook exists — the kernel's
   * `grub`/`ditch`/`lime` never learn what a `GroundCharacter` is.
   */
  public override async improvementBill(): Promise<ImprovementCost | null> {
    return this.bill();
  }

  /**
   * The bill, synchronously — the same numbers, for the reconcile that cannot
   * await.
   *
   * ⚠ Authored as constants rather than derived from the peat depth, and
   * deliberately: a deeper moss is not *harder to ditch*, it is *worth more
   * when you do*. Tying the bill to the depth would have made the richest
   * bank the most expensive to destroy, which inverts the choice.
   */
  private bill(): ImprovementCost {
    // Scrub on a moss is heather and birch scrub — real work, not much of it.
    const clearing = 1.5;
    // ⭐ The lesson, and it is dear: draining a bog is the heaviest drainage
    // job there is, because the whole ground is water.
    const draining = 6;
    // Peat is acid — pH 4 and under. It genuinely wants lime.
    const liming = 3.2;
    return {
      clearing,
      stonePicking: 0,
      draining,
      liming,
      terracing: 0,
      total: clearing + draining + liming,
    };
  }

  /**
   * ⚠ A moss is slow to ditch and there is nothing to pick out of it.
   *
   * @hook — see `Improvable.improvementPace`.
   */
  public override improvementPace(job: ImprovementJob): number {
    return job === 'draining' ? 1.6 : 1;
  }
}

/** Game-seconds now, or `null` when no world clock (pre-boot / tests). */
function nowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return null;
  return WorldClockApi.getNow().rawValue();
}
