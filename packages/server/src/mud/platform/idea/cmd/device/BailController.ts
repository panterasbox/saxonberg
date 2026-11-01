/**
 * BailController — `bail`: ⭐ fill a bucket, lift it, tip it (harbors P21,
 * B5).
 *
 * ⭐⭐ **One verb behind one protocol** ({@link Bailable}). The verb was the
 * drilling pack's, for one target — the bailer down a bore — until a boat
 * taking water wanted the same act. The view binds what is to be bailed
 * (`requires: [BailableMixin]`) and the controller narrows by that mixin;
 * what one spell IS — how long, what it costs, what it moves and where —
 * is the target's own answer, and every refusal is the target's sentence.
 * The controller knows nothing about bores or bilges.
 *
 * A spell is an engaged act on the hands: the target's `planBail` (no side
 * effects), then `completeBail` at completion.
 */

import { EngagedActController } from '../../../../lib/command/EngagedActController';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Bailable, BailRequest } from '../../../../lib/pump/Bailable';

/** ⚠ A bound arg is an `MqlOneResult`, never a `Stuff`. */
interface BailModel extends CommandModel {
  target?: MqlOneResult;
  tool?: MqlOneResult;
  vessel?: MqlOneResult;
}

type Composed = ReturnType<typeof Mml.compose>;

/**
 * ⚠ A MODULE function, not a method: an engagement completes after the
 * controller has been destructed in its dispatch `finally` (the
 * `WorkedActController` scar). The giver may have gone, too.
 */
async function land(giver: Stuff, target: Stuff & Bailable, req: BailRequest, token: unknown): Promise<void> {
  if (giver.isDestroyed() || target.isDestroyed()) return;
  await target.completeBail(giver, req, token);
}

export default class BailController extends EngagedActController<BailModel> {
  async execute(model: BailModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const target = (model.target?.stuff ?? null) as Stuff | null;
    if (target === null || !MixinApi.isBailable(target)) {
      this.decline(context, Mml.compose`There is nothing here to bail.`, 'nothing-to-bail');
      return;
    }
    const vessel = (model.vessel?.stuff ?? null) as Stuff | null;
    if (vessel !== null && !MixinApi.isBulkable(vessel)) {
      this.decline(context, Mml.compose`You cannot pour anything into that.`, 'not-a-vessel');
      return;
    }
    const req: BailRequest = { vessel, tool: (model.tool?.stuff ?? null) as Stuff | null };
    const plan = await target.planBail(giver, req);
    if (plan.kind === 'refusal') {
      this.decline(context, plan.line as Composed, plan.reason);
      return;
    }
    this.engageAct(context, {
      durationMs: plan.durationMs,
      cost: plan.cost,
      beginSelf: plan.beginSelf as Composed,
      ...(plan.beginPeers ? { beginPeers: plan.beginPeers as Composed } : {}),
      onComplete: () => {
        void land(giver, target, req, plan.token).catch((err) =>
          console.error('BailController: the spell did not land:', err),
        );
      },
    });
  }
}
