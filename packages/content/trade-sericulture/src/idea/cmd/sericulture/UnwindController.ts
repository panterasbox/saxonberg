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
 * refuse in their own words), the controller engages the hands for the
 * plan's duration, and at completion the cocoons do the work and name the
 * Discipline to credit — the same split as the kernel's worked acts
 * (`WorkedActController`), whose `land()` is the shape of the one below.
 */

import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tool';
import type { WorkPlan } from '@saxonberg/server/mud/lib/ground/Workable';
import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import Cocoons from '../../../thing/Cocoons';

const WORK_TOPIC = 'act.deed';

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
    const prognosis = await target.planUnwind(giver, tool, count);
    if (prognosis.kind === 'refusal') {
      // The cocoons' own sentence, untouched.
      this.declineStep(context, Mml.fromMarkup(prognosis.prose), prognosis.reason);
      return;
    }
    const plan: WorkPlan = prognosis;
    this.engageStep(context, {
      durationMs: plan.durationMs,
      effortW: 150,
      beginSelf: Mml.fromMarkup(plan.beginSelf),
      ...(plan.beginPeers ? { beginPeers: Mml.fromMarkup(plan.beginPeers) } : {}),
      onComplete: () => {
        // ⚠⚠ A MODULE function — the controller is destructed by now.
        void land(context, target, tool, plan);
      },
    });
  }
}

/**
 * The reeling landed: let the cocoons do the work, narrate what they say,
 * and credit the Discipline THEY named. ⚠ The actor may have logged out
 * mid-reel; the work still lands, only the telling needs a listener.
 */
async function land(
  context: CommandContext,
  cocoons: Cocoons,
  tool: (Stuff & Tooled) | null,
  plan: WorkPlan,
): Promise<void> {
  const giver = context.commandGiver;
  const result = await cocoons.completeUnwind(giver, tool, plan.token);
  if (giver.isDestroyed()) return;
  const scene = MessageApi.scene(giver).topic(WORK_TOPIC).toSelf(Mml.fromMarkup(result.self));
  if (result.peers) scene.toPeers(Mml.fromMarkup(result.peers));
  scene.send();
  const credit = result.credit;
  if (credit && MixinApi.isAdvancing(giver)) {
    await giver.creditDeed({
      discipline: credit.discipline,
      difficulty: credit.difficulty,
      outcome: 'success',
    });
  }
}
