/**
 * SpinController — `spin`, the chain's **bottleneck**, and ⭐ the
 * decision is the **yarn count**.
 *
 * The count is hanks to the pound, so higher is finer. It is the real
 * unit rather than a "fineness" abstraction because without it *how
 * fine* is a vibe and the decision stops being one.
 *
 * ## ⭐⭐ What competence buys: how far you can push before it breaks
 *
 * A master draws a finer, evener thread from the same line. A novice
 * reaching past their band does not get a worse yarn — **they get less
 * yarn**, because the thread parts and the stock is gone. The flax is
 * unchanged either way: competence buys the TOP OF THE RANGE, never
 * more yarn from the same sheaf.
 *
 * ## ⭐⭐ It holds `hands` and leaves `voice` FREE
 *
 * The `search` precedent, and the most valuable single decision in the
 * pack. Spinning is the bottleneck, so players will do it a great deal,
 * and a verb repeated thirty times is tedium — but spinning was
 * historically the SOCIAL act, done in company, talking. Leaving the
 * voice slot open turns the build's largest tedium risk into its best
 * social surface, and it costs exactly one slot decision.
 *
 * ## ⚠ The ladder moves the RATE, never the decision
 *
 * A wheel is three times a spindle and unlocks nothing; a jenny, a
 * frame and a mill are higher rates still. A modern mill operator picks
 * a yarn count exactly as a spinner with a spindle does.
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';

const TOPIC = 'act.deed';
const YARN_ROW = '/trade/textiles/thing/yarn';

interface SpinModel extends CommandModel {
  stock: MqlOneResult;
  count?: number;
}

export default class SpinController extends ManualBuildController<SpinModel> {
  /** ⭐ A dial, not a constant — the bench asserts against it. */
  static readonly BASE_MS_KEY = 'textiles.spin.baseMs';
  /**
   * ⚠⚠ The bottleneck, and it is a LESSON rather than a tuning
   * accident: spinning is roughly six times weaving's labour per unit
   * of cloth, which is why one weaver kept several spinners busy and
   * why mechanising spinning first was both so profitable and so
   * socially disruptive. Do not "balance" this down.
   */
  static readonly BASE_MS = 90 * 60 * 1000;
  /** Units of line one act draws. */
  static readonly CHARGE_KEY = 'textiles.spin.chargeUnits';
  static readonly CHARGE = 2;
  /** The count an untrained hand can reach. */
  static readonly BASE_COUNT_KEY = 'textiles.spin.baseCount';
  static readonly BASE_COUNT = 10;
  /** How much further each competence band reaches. */
  static readonly COUNT_PER_BAND_KEY = 'textiles.spin.countPerBand';
  static readonly COUNT_PER_BAND = 8;

  async execute(model: SpinModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const stock = model.stock?.stuff ?? null;
    if (!stock || !MixinApi.isGlobbable(stock)) {
      this.declineStep(context, Mml.compose`Spin what?`, 'no-stock');
      return;
    }
    if (!isSpinnable(stock)) {
      this.declineStep(
        context,
        Mml.compose`${Mml.thing(stock)} is not something you can draw a thread from.`,
        'not-spinnable',
      );
      return;
    }
    const charge = dial(SpinController.CHARGE_KEY, SpinController.CHARGE);
    if (stock.getQuantity() < charge) {
      this.declineStep(
        context,
        Mml.compose`There is not enough there to fill a spindle.`,
        'too-little',
      );
      return;
    }

    const band = await competenceOf(giver);
    const ceiling =
      dial(SpinController.BASE_COUNT_KEY, SpinController.BASE_COUNT) +
      CompetenceBand.rank(band) *
        dial(SpinController.COUNT_PER_BAND_KEY, SpinController.COUNT_PER_BAND);
    const wanted = Math.max(
      1,
      Math.round(model.count ?? dial(SpinController.BASE_COUNT_KEY, SpinController.BASE_COUNT)),
    );

    // ⭐⭐ Overreaching does NOT refuse and does NOT make bad yarn. It
    // makes LESS yarn: the thread parts, and what parted is gone. That
    // is the shape of every competence answer in this build — competence
    // buys the top of the range, never more stock.
    const overreach = Math.max(0, wanted - ceiling);
    const yieldUnits = Math.max(
      0,
      Math.round(charge * Math.max(0, 1 - overreach / Math.max(1, ceiling))),
    );

    const instrument = this.findCapability(giver, 'spinning');
    const durationMs = this.paceMs(
      dial(SpinController.BASE_MS_KEY, SpinController.BASE_MS),
      instrument as Stuff | null,
      ['spinning'],
    );

    this.engageStep(context, {
      durationMs,
      beginSelf:
        overreach > 0
          ? Mml.compose`You draw ${Mml.thing(stock)} out finer than you have any business doing, and feel the thread thin under your fingers.`
          : Mml.compose`You set ${Mml.thing(stock)} to the spindle and begin drawing.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} settles in to spin.`,
      onComplete: () => {
        void finish(context, stock, charge, wanted, yieldUnits, overreach);
      },
    });
  }
}

async function finish(
  context: CommandContext,
  stock: Stuff & { getQuantity(): number; setQuantity(n: number): void },
  charge: number,
  count: number,
  yieldUnits: number,
  overreach: number,
): Promise<void> {
  const giver = context.commandGiver;
  // ⚠⚠ A module function — the controller is destructed by now.
  const watching = !giver.isDestroyed();
  // The stock is consumed WHETHER OR NOT the thread held. That is the
  // waste, and it is the whole of the failure mode.
  const left = Math.max(0, stock.getQuantity() - charge);
  if (left === 0) StuffApi.destruct(stock);
  else stock.setQuantity(left);

  if (yieldUnits <= 0) {
    if (watching) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`It parts, and parts again, and what is left on the spindle is not worth winding off. The line is gone.`,
        )
        .send();
    }
    return;
  }

  try {
    const yarn = await StuffApi.clone<Stuff>(YARN_ROW);
    if (MixinApi.isGlobbable(yarn)) yarn.setQuantity(yieldUnits);
    // ⭐ The band still comes from the STOCK, not from the spinner: the
    // flax is what the flax is, and no amount of skill lengthens a
    // staple.
    if (MixinApi.isGraded(yarn) && MixinApi.isGraded(stock)) {
      yarn.setGrade(Grade.of(bandOf(stock)));
    }
    const asStock = yarn as unknown as { setYarnCount?(n: number): void };
    asStock.setYarnCount?.(count);
    if (MixinApi.isContainable(yarn) && MixinApi.isContainer(giver)) {
      ContainmentApi.move(
        yarn as Stuff & Containable,
        giver as Stuff & Container,
      );
    }
    if (!watching) return;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        overreach > 0
          ? Mml.compose`You wind off ${String(yieldUnits)} of yarn at ${String(count)}s. Less than there should be — the rest is on the floor in pieces.`
          : Mml.compose`You wind off ${String(yieldUnits)} of yarn at ${String(count)}s.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} winds off a length of yarn.`)
      .send();
  } catch (err) {
    console.warn('SpinController: could not mint yarn:', err);
  }
}

/**
 * The band a source carries, or the neutral middle.
 *
 * ⚠⚠ **Validated, because `Grade.of` THROWS on anything else** — and a
 * live drive found what that costs. A `Graded` host whose `gradeBand`
 * is somehow unset reads back `undefined`; `Grade.of(undefined)` raises
 * a `RangeError`; the raise lands inside the try/catch that wraps the
 * whole mint, so the fibre was already consumed, nothing was made, and
 * the actor was told nothing at all. A spinner watched her line vanish
 * eight times in a row with no message and no error a player could see.
 *
 * Carrying a grade is a NICETY; making the thing is the point. So a
 * band that cannot be read falls back to the middle rather than taking
 * the product down with it.
 */
function bandOf(source: Stuff): string {
  const raw = MixinApi.isGraded(source) ? source.getGradeBand() : '';
  return Grade.isBand(raw) ? raw : 'fair';
}

/** Line and tow both spin; shive and cloth do not. */
function isSpinnable(stock: Stuff): boolean {
  const path = stock.getTemplatePath() ?? '';
  return path.endsWith('/line') || path.endsWith('/tow');
}

async function competenceOf(giver: Stuff): Promise<CompetenceBandName> {
  const asActor = giver as unknown as {
    competenceBandFor?(key: string): Promise<CompetenceBandName>;
  };
  if (typeof asActor.competenceBandFor !== 'function') return 'untrained';
  try {
    return await asActor.competenceBandFor('textiles');
  } catch {
    return 'untrained';
  }
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
