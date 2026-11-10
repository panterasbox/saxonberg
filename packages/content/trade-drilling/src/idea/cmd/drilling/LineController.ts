/**
 * LineController — `line [with <liner>]`, the one act in the trade that
 * buys nothing except **the ability to keep going.**
 *
 * ⭐ A liner produces no goods, raises no rate and improves no reading; it
 * stops the hole caving in and stops the water above coming down into what
 * you are trying to lift. `bore` refuses to go deeper until it is done, and
 * the refusal names the remedy — nobody is stuck, only delayed and poorer.
 *
 * ⚠⚠ It is leather and wood, not rubber: a pre-industrial casing was wood.
 *
 * The hole plans the act (`Wellhead.linePlan`, which asks `canLine` — a
 * length of well liner, never whatever was first in your pack, C8).
 */

import { Mml } from '@saxonberg/server/mud/api/mml';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { DrillingActController, type DrillingModel } from './DrillingActController';
import type { LineDone, LineRefusal } from '../../../thing/Wellhead';

/** ⚠ A bound arg is an `MqlOneResult`, never a `Stuff`. */
interface LineModel extends DrillingModel {
  liner?: MqlOneResult;
}

export default class LineController extends DrillingActController<LineModel> {
  public async execute(model: LineModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    if (this.derrickOf(model) === null) {
      this.noDerrick(context);
      return;
    }
    const hole = this.wellheadOf(model);
    if (hole === null) {
      this.noHole(context);
      return;
    }
    const plan = await hole.linePlan(giver, (model.liner?.stuff ?? null) as Stuff | null);
    if (!plan.ok) {
      // ⭐ A hole already lined to its depth is information, not a mistake.
      if (plan.reason === 'lined-to-depth') {
        this.inform(context, LineController.refusalWords(plan));
        return;
      }
      this.decline(context, LineController.refusalWords(plan), plan.reason);
      return;
    }
    await this.engageAct(context, plan, {
      beginSelf: () => Mml.compose`You start running tube down the hole.`,
      beginPeers: () => Mml.compose`${Mml.actor(giver)} starts running tube down the hole.`,
      onRefused: (r) => LineController.refusalWords(r),
      onDone: (f) => LineController.doneWords(giver, f),
    });
  }

  /** ⭐ Every refusal the hole can give the tube. */
  protected static refusalWords(r: LineRefusal): ReturnType<typeof Mml.compose> {
    switch (r.reason) {
      case 'lined-to-depth':
        return Mml.compose`The hole is lined as far as it goes. Cut deeper first.`;
      case 'no-liner':
        return Mml.compose`You have nothing to line it with. A length of tube — \`carve liner\` takes two of timber.`;
      case 'not-a-liner':
        return Mml.compose`That will not line a hole. A length of well liner will — \`carve liner\` takes two of timber.`;
      default: {
        const never: never = r.reason;
        return never;
      }
    }
  }

  protected static doneWords(giver: Stuff, f: LineDone) {
    return {
      self: Mml.compose`The tube goes down and stays down. ${String(Math.round(f.linedToM))} m of the hole will hold now, and the water above it has nowhere to come in.`,
      peers: Mml.compose`${Mml.actor(giver)} lines the hole.`,
    };
  }
}
