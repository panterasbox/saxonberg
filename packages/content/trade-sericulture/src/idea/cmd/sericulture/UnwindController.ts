/**
 * UnwindController — `unwind <cocoons> [with <reel>] [--count N]`: reel
 * silk off stifled cocoons into a skein.
 *
 * ⭐ Sericulture's own act (controllers-are-io D19). It rode fishing's
 * `reel` behind a duck-typed `Reelable` shape until then — one view, two
 * instruments, and a cross-pack dependency for a word. Now the reel is
 * fishing's and this is silk's.
 *
 * Controller dumb, subject authoritative: the COCOONS plan the reeling (or
 * refuse, with a reason), this controller words it and engages the hands
 * for the plan's duration, and at completion the cocoons do the work and
 * name the Discipline to credit — the same split as the kernel's worked
 * acts (`WorkedActController`), whose `landing` is the shape of the one
 * below.
 */

import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { WorkPlan } from '@saxonberg/server/mud/lib/ground/Workable';
import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import Cocoons, { type UnwindBegin, type UnwindDone, type UnwindRefusal } from '../../../thing/Cocoons';

interface UnwindModel extends CommandModel {
  cocoons: MqlOneResult;
  tool?: MqlManyResult;
  count?: number;
}

export default class UnwindController extends ManualBuildController<UnwindModel> {
  async execute(model: UnwindModel, context: CommandContext): Promise<void> {
    const target = model.cocoons?.stuff ?? null;
    // ⭐ Narrowed by the pack's own CLASS, never a shape: the view's
    // `requires:` is the kind the binder can check (a stack), and only
    // cocoons have a thread to wind off.
    if (!(target instanceof Cocoons)) {
      this.declineStep(
        context,
        target
          ? Mml.compose`There is no thread to wind off ${Mml.thing(target)}.`
          : Mml.compose`Unwind what? Name a stack of stifled cocoons.`,
        'not-cocoons',
      );
      return;
    }
    const giver = context.commandGiver;
    const tool = this.bestInstrument(model.tool, 'reeling');
    const count =
      typeof model.count === 'number' && Number.isFinite(model.count) ? model.count : null;
    const plan = await target.planUnwind(giver, tool, count);
    if (!plan.ok) {
      this.declineStep(context, refusalWords(plan), plan.reason);
      return;
    }
    await this.engagePlan(context, landing(giver, plan), {
      beginSelf: (b) =>
        Mml.compose`You drop a handful of cocoons into the hot water, find the ends with a twig, and gather ${String(b.count)} of them into one thread.`,
      beginPeers: () => Mml.compose`Somebody bends over a basin, reeling silk off cocoons.`,
      onRefused: refusalWords,
      onDone: (d) => ({
        self: Mml.compose`You wind off a skein of raw silk. ${d.skein ? d.skein.threadLine() : ''} You fish the pupae out of the water.`,
        peers: Mml.compose`Somebody lifts a skein of raw silk off the reel.`,
      }),
    });
  }
}

/** ⭐ The words for a refused reeling — every reason, exhaustively. */
function refusalWords(out: UnwindRefusal): ReturnType<typeof Mml.compose> {
  switch (out.reason) {
    case 'pierced':
      return Mml.compose`There is nothing to reel off a pierced cocoon — the thread is cut. It will spin.`;
    case 'not-stifled':
      return Mml.compose`The moths are still alive in them. Stifle them first, or they will break the thread as you reel.`;
    case 'too-few':
      // ⭐ The refusal says what lifts it (the browser walk bought ten and
      // was told only "not enough").
      return Mml.compose`There are not enough cocoons there to keep a thread going — a reeling takes about forty.`;
    case 'no-reel':
      return Mml.compose`You want a reel to wind the thread onto.`;
    case 'no-heat':
      return Mml.compose`They want hot water to loosen the gum, and there is no fire here.`;
    default: {
      const never: never = out;
      return never;
    }
  }
}

/**
 * The plan, with the credit THE COCOONS named landed on the reeler.
 * ⚠ The actor may have logged out mid-reel; the work still lands, only the
 * telling and the crediting need a listener.
 */
function landing(
  giver: Stuff,
  plan: WorkPlan<UnwindBegin, UnwindDone, UnwindRefusal>,
): WorkPlan<UnwindBegin, UnwindDone, UnwindRefusal> {
  return {
    ...plan,
    onComplete: async () => {
      const out = await plan.onComplete();
      if (!out.ok || giver.isDestroyed()) return out;
      const credit = out.facts.credit;
      if (credit && MixinApi.isAdvancing(giver)) {
        await giver.creditDeed({
          discipline: credit.discipline,
          difficulty: credit.difficulty,
          outcome: 'success',
        });
      }
      return out;
    },
  };
}
