/**
 * ShoreController — `shore [<timber>]`.
 *
 * Two things happen, and the second is the design:
 *
 *  1. a timber set you are carrying is **stood in the working**, where
 *    `Working.supportHere` will count it, condition-weighted, from then
 *    on;
 *  2. ⭐ **the cell is promoted from Provisional to Held.**
 *
 * > **Shoring is this mine's provisioning act.**
 *
 * Provisional ground was never a member — it is the commons you are
 * cutting into, and it reverts because you never secured it. Shoring is
 * literally what admits a cell to the holding, which is why *"a carved
 * working persists if and only if it is shored"* needs no separate
 * bookkeeping: the act that makes the ground safe is the act that writes
 * the record.
 *
 * ⚠ No deed gate. Setting timber is labour.
 */

import { MiningActController } from './MiningActController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { ShoreDone } from '../../../lib/Working';

type Composed = ReturnType<typeof Mml.compose>;

interface ShoreModel extends CommandModel {
  timber?: MqlOneResult;
}

export default class ShoreController extends MiningActController<ShoreModel> {
  async execute(model: ShoreModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const working = this.workingOf(giver);
    if (!working) {
      ShoreController.decline(context, Mml.compose`There is nothing here to shore.`, 'not-a-working');
      return;
    }
    // ⭐ I/O over `Working.shorePlanFor` (controller-liquidity W9): standing
    // the set, securing the working (the warren keeps its own member, the
    // holder keyed by identity — D11), and what the back does after.
    const plan = working.shorePlanFor(giver, model.timber?.stuff ?? null);
    if (!plan.ok) {
      ShoreController.decline(
        context,
        Mml.compose`You have no timber to set. Buy a set at the provisioning shed.`,
        plan.reason,
      );
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: (b) => Mml.compose`You wrestle ${Mml.thing(b.set)} into place under the back.`,
      beginPeers: () => Mml.compose`${Mml.actor(giver)} starts setting timber.`,
      onRefused: (r) => r,
      onDone: (d) => ShoreController.doneWords(d, giver),
    });
  }

  protected static doneWords(d: ShoreDone, giver: Stuff): { self: Composed; peers?: Composed } | null {
    const peers = Mml.compose`${Mml.actor(giver)} sets timber under the back.`;
    switch (d.kind) {
      case 'gone':
        return null;
      case 'secured':
        return { self: Mml.compose`The timber takes the weight. This working is yours now — it will still be here when you come back.`, peers };
      case 'sound':
        return { self: Mml.compose`The timber takes the weight, and the back goes quiet.`, peers };
      case 'not-enough':
        return { self: Mml.compose`The timber takes some of the weight. It is not enough yet.`, peers };
      default: {
        const never: never = d;
        return never;
      }
    }
  }
}
