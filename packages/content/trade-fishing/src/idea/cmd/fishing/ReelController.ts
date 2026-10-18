/**
 * ReelController — `reel`, and ⭐ ONE verb for two instruments.
 *
 * With nothing bound (or a target that does not reel), it is the fishing
 * act it always was: acts on the actor's live `fishing` engagement; with no
 * line out, or nothing on it, it says so.
 *
 * Bound to a target that answers the {@link Reelable} shape — a stack of
 * stifled cocoons — it winds a thread off it. The TARGET plans the reeling
 * (or refuses, in its own words), the controller engages the hands for the
 * plan's duration, and at completion the target does the work and names
 * the Discipline to credit. Controller dumb, subject authoritative: the
 * same split as the kernel's worked acts (`WorkedActController`), whose
 * `land()` is the shape of the one below.
 *
 * ⚠ Re-based on `ManualBuildController` for `engageStep` /
 * `bestInstrument`; the fishing branch is unchanged (AC 19).
 */

import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { WorkPlan } from '@saxonberg/server/mud/lib/ground/Workable';
import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { FISHING_TOPIC } from './FishingController';
import { FishingEngagement, FISHING_TYPE } from '../../../lib/FishingEngagement';
import type { Reelable } from '../../../lib/Reelable';

const WORK_TOPIC = 'act.deed';

interface ReelModel extends CommandModel {
  target?: MqlOneResult;
  tool?: MqlManyResult;
  count?: number;
}

export default class ReelController extends ManualBuildController<ReelModel> {
  async execute(model: ReelModel, context: CommandContext): Promise<void> {
    const subject = reelableOf(model.target?.stuff ?? null);
    if (subject) {
      await this.reelSubject(subject, model, context);
      return;
    }
    await this.reelLine(context);
  }

  /** ⭐ The second instrument: wind a thread off whatever answers the shape. */
  private async reelSubject(
    subject: Reelable,
    model: ReelModel,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver;
    const tool = this.bestInstrument(model.tool, 'reeling');
    const count = typeof model.count === 'number' && Number.isFinite(model.count) ? model.count : null;
    const prognosis = await subject.planReel(giver, tool, count);
    if (prognosis.kind === 'refusal') {
      // The subject's own sentence, untouched.
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
        void land(context, subject, tool, plan);
      },
    });
  }

  /** The fishing act, exactly as before. */
  private async reelLine(context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const live = MixinApi.isEngaged(giver) ? giver.getEngagementByType(FISHING_TYPE) : undefined;
    if (!(live instanceof FishingEngagement)) {
      this.refuse(context, FISHING_TOPIC, 'You have no line out.', 'no-line');
      return;
    }
    if (!live.isFighting()) {
      // ⭐ A lure is worked, not waited on: reeling with nothing on the
      // line is how a spoon fishes at all (B8).
      if (live.work()) {
        MessageApi.scene(giver)
          .topic(FISHING_TOPIC)
          .toSelf(Mml.compose`You work the lure back through the water, a turn at a time.`)
          .toPeers(Mml.compose`${Mml.actor(giver)} works the line back in, a turn at a time.`)
          .send();
        return;
      }
      MessageApi.scene(giver).topic(FISHING_TOPIC).toSelf(Mml.compose`You take in a little line. Nothing is on it.`).send();
      return;
    }
    const event = await live.reel();
    if (event) live.narrate(event);
    else MessageApi.scene(giver).topic(FISHING_TOPIC).toSelf(Mml.compose`You gain a little line. ${live.lineWords()}`).send();
  }
}

/**
 * Does this answer the reel shape? The `SplitController.splittableOf`
 * idiom: a marker plus both halves, so a thing that merely HAS a method
 * called `planReel` is not taken for one.
 */
function reelableOf(stuff: Stuff | null): Reelable | null {
  if (!stuff) return null;
  const s = stuff as unknown as Partial<Reelable>;
  if (s.reelable !== true) return null;
  if (typeof s.planReel !== 'function' || typeof s.completeReel !== 'function') return null;
  return s as Reelable;
}

/**
 * The reeling landed: let the subject do the work, narrate what it says,
 * and credit the Discipline IT named. `WorkedActController.land`, here
 * because the controller is fishing's. ⚠ The actor may have logged out
 * mid-reel; the work still lands, only the telling needs a listener.
 */
async function land(
  context: CommandContext,
  subject: Reelable,
  tool: (Stuff & Tooled) | null,
  plan: WorkPlan,
): Promise<void> {
  const giver = context.commandGiver;
  const result = await subject.completeReel(giver, tool, plan.token);
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
