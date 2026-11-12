/**
 * DrainController — `drain [<vessel>]`.
 *
 * ⭐⭐⭐ The act that inverts a hazard. Firedamp is the one thing in this
 * trade that can be taken rather than merely survived, and taking it is
 * both the remedy (the heading becomes workable) and the product (a
 * charge of burnable gas, which is what a town's supply is made of).
 *
 * ⚠ Every refusal here is somebody else's answer, not this controller's:
 * whether gas stands in this working is the GROUND's, and whether a
 * vessel will hold it is the VESSEL's — a gas's required closure derives
 * from its boiling point.
 *
 * ⭐ I/O over {@link Working.drainPlanFor} (controller-liquidity W9): every
 * refusal is decided BEFORE the pump starts (survey C20 — they came after
 * thirty seconds of pumping), and read again as it lands.
 */

import { MiningActController } from './MiningActController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { DrainDone, DrainRefusal } from '../../../lib/Working';

type Composed = ReturnType<typeof Mml.compose>;

interface DrainModel extends CommandModel {
  vessel?: MqlOneResult;
}

export default class DrainController extends MiningActController<DrainModel> {
  async execute(model: DrainModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const working = this.workingOf(giver);
    if (!working) {
      DrainController.decline(context, Mml.compose`There is nothing here to drain.`, 'not-a-working');
      return;
    }
    // ⚠ `.stuff` is the right read: a bladder is never a door, so
    // `effectiveTarget` (a direction standing for a door) has nothing to add.
    const vessel = model.vessel?.stuff ?? null;
    const plan = await working.drainPlanFor(giver, vessel);
    if (!plan.ok) {
      DrainController.decline(context, DrainController.refusalWords(plan), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: () => Mml.compose`You set the pipe into the face and work the pump.`,
      beginPeers: () => Mml.compose`${Mml.actor(giver)} starts drawing off the face.`,
      onRefused: (r) => DrainController.refusalWords(r),
      onDone: (d) => DrainController.doneWords(d, giver, vessel),
    });
  }

  /** ⭐ Every reason, and each names what lifts it (D4). */
  protected static refusalWords(r: DrainRefusal): Composed {
    const reason: DrainRefusal['reason'] = r.reason;
    switch (reason) {
      case 'no-gas':
        return Mml.compose`There is nothing standing in the air here to draw off.`;
      case 'no-vessel':
        return Mml.compose`You have nothing that would hold it.`;
      case 'not-sealed':
        return Mml.compose`It will not stay in that — gas wants a sealed vessel, shut.`;
      case 'no-room':
        return Mml.compose`There is no room left in it.`;
      default: {
        const never: never = reason;
        return never;
      }
    }
  }

  protected static doneWords(d: DrainDone, giver: Stuff, vessel: Stuff | null): { self: Composed; peers: Composed } | null {
    if (d.kind === 'gone' || vessel === null) return null;
    return {
      self: Mml.compose`The pump sucks and ${Mml.thing(vessel)} swells. The air in here is better for it.`,
      peers: Mml.compose`${Mml.actor(giver)} draws a charge of ${d.material} off the face.`,
    };
  }
}
