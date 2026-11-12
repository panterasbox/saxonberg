/**
 * SpudController — `spud [with <bailer>]`: site a hole on your own ground.
 *
 * ⭐ Rung 5 of the remedy ladder (controller-liquidity W12, owner-accepted):
 * siting was `bore`'s other act, picked by whether a hole was there yet.
 * Siting mints a wellhead and takes a payroll's bank (not one act with a
 * stroke, so not rung 1); it is not a manner of boring (2); drilling has no
 * noun a player groups the two under (3); and the two forms had the same
 * syntax, differing only by world state (4). `spud` is the driller's own
 * word for starting a hole.
 *
 * ⭐ No rig argument: the rig is RAISED by spudding — a derrick cannot be
 * what affords raising a derrick (`Bailer.ts`). The bailer in your hands
 * is the instrument, and it plans the act (`Bailer.spudPlanFor`): the
 * title, the bank, the mint. This controller says it.
 */

import { Mml } from '@saxonberg/server/mud/api/mml';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { DrillingActController, type DrillingModel } from './DrillingActController';
import Bailer, { type SpudDone, type SpudRefusal } from '../../../thing/Bailer';

interface SpudModel extends DrillingModel {
  bailer?: MqlOneResult;
}

export default class SpudController extends DrillingActController<SpudModel> {
  public async execute(model: SpudModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const bound = model.bailer?.stuff ?? null;
    if (!(bound instanceof Bailer)) {
      this.decline(context, Mml.compose`You have nothing to start a hole with. A bailer goes on the rope first.`, 'no-bailer');
      return;
    }
    const plan = await bound.spudPlanFor(giver);
    if (!plan.ok) {
      this.decline(context, SpudController.refusalWords(plan), plan.reason);
      return;
    }
    await this.engageAct(context, plan, {
      beginSelf: () => Mml.compose`You pace out the ground.`,
      onRefused: (r) => SpudController.refusalWords(r),
      onDone: (f) => ({
        self: SpudController.doneWords(f),
        peers: Mml.compose`${Mml.actor(giver)} raises a rig over the ground.`,
      }),
    });
  }

  /** ⭐ Every refusal siting can give. */
  protected static refusalWords(r: SpudRefusal): ReturnType<typeof Mml.compose> {
    switch (r.reason) {
      case 'no-place':
        return Mml.compose`You are nowhere to sink anything.`;
      case 'no-claim':
        return Mml.compose`This ground has no name to put in a register.`;
      case 'untitled':
        return Mml.compose`This ground is not yours to sink a hole in. Stake it first — a bore is capital you cannot carry away.`;
      case 'no-identity':
        return Mml.compose`A hole wants an owner of record.`;
      case 'no-bank':
        return Mml.compose`Open an account first. A crew is paid from somewhere, and a hole is nothing but wages.`;
      case 'already-sited':
        return Mml.compose`There is a hole here already. \`bore\` works the beam on it.`;
      default: {
        const never: never = r.reason;
        return never;
      }
    }
  }

  protected static doneWords(f: SpudDone): ReturnType<typeof Mml.compose> {
    if (f.restored) {
      return Mml.compose`The rig goes back up over your old hole, and from here it is wages and time again.`;
    }
    return f.surveyed
      ? Mml.compose`Four legs of timber up and a beam across the top of them. The rig is over the structure you read, and from here it is wages and time.`
      : Mml.compose`Four legs of timber up and a beam across the top of them, over a spot you picked for reasons of your own. There is nothing under it that anybody has surveyed, which is a thing you will find out about slowly and expensively.`;
  }
}
