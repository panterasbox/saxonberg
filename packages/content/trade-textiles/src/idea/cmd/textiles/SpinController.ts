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
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import TextileWork, { type SpinBegin, type SpinDone, type TextileRefusal } from '../../../lib/TextileWork';

type Composed = ReturnType<typeof Mml.compose>;

interface SpinModel extends CommandModel {
  wheel?: MqlManyResult;
  stock: MqlOneResult;
  count?: number;
}

/**
 * ⭐ The draw, the ceiling, the yield and the mint are the stock's
 * (`TextileWork.spinPlan` — controller-liquidity W11); this controller
 * picks the best wheel bound and words the plan.
 */
export default class SpinController extends ManualBuildController<SpinModel> {
  async execute(model: SpinModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const stock = model.stock?.stuff ?? null;
    if (!stock) {
      this.declineStep(context, Mml.compose`Spin what?`, 'no-stock');
      return;
    }
    const plan = await new TextileWork(giver, this.bestInstrument(model.wheel, 'spinning')).spinPlan(stock, {
      count: model.count,
    });
    if (!plan.ok) {
      this.declineStep(context, SpinController.refusalWords(plan, stock), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: (b: SpinBegin) =>
        b.overreach
          ? Mml.compose`You draw ${Mml.thing(b.stock)} out finer than you have any business doing, and feel the thread thin under your fingers.`
          : Mml.compose`You set ${Mml.thing(b.stock)} to the spindle and begin drawing.`,
      beginPeers: () => Mml.compose`${Mml.actor(giver)} settles in to spin.`,
      onRefused: (r: TextileRefusal) => SpinController.refusalWords(r, stock),
      onDone: (f: SpinDone) => SpinController.doneWords(giver, f),
    });
  }

  protected static refusalWords(r: TextileRefusal, stock: Stuff): Composed {
    switch (r.reason) {
      case 'not-spinnable':
        return Mml.compose`${Mml.thing(stock)} is not something you can draw a thread from.`;
      case 'too-little':
        return Mml.compose`There is not enough there to fill a spindle.`;
      case 'not-made':
        return Mml.compose`The thread will not take. You stop before you waste the line.`;
      default:
        return Mml.compose`You cannot spin that.`;
    }
  }

  protected static doneWords(
    giver: Stuff,
    f: SpinDone,
  ): { self: Composed; peers?: Composed } | null {
    switch (f.kind) {
      case 'gone':
        return null;
      case 'parted':
        return {
          self: Mml.compose`It parts, and parts again, and what is left on the spindle is not worth winding off. The line is gone.`,
        };
      case 'yarn':
        return {
          self: f.overreach
            ? Mml.compose`You wind off ${String(f.units)} of yarn at ${String(f.count)}s. Less than there should be — the rest is on the floor in pieces.`
            : Mml.compose`You wind off ${String(f.units)} of yarn at ${String(f.count)}s.`,
          peers: Mml.compose`${Mml.actor(giver)} winds off a length of yarn.`,
        };
      default: {
        const never: never = f;
        return never;
      }
    }
  }
}
