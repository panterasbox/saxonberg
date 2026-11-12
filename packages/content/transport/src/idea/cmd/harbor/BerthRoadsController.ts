/**
 * BerthRoadsController — `berth roads <ship> [in <book>]`: have a ship lie
 * in the roads until the office calls her in (over {@link
 * BerthControllerBase}). A berth given and not yet taken up is taken back;
 * a ship made fast is never sent away.
 */

import type { CommandContext } from '@saxonberg/server/mud/api/command';
import { BerthControllerBase, type BerthModel } from './BerthControllerBase';

export default class BerthRoadsController extends BerthControllerBase {
  async execute(model: BerthModel, context: CommandContext): Promise<void> {
    const call = await this.callFor(model, context);
    if (call === null) return;
    const { harbor, ship, nowS } = call;
    const refused = await harbor.sendToRoads(ship, context.commandGiver, nowS);
    if (refused !== null) return this.decline(context, refused, 'roads-refused');
    return this.done(context.commandGiver, `You write ${ship.getName()} down for the roads and signal her to lie there.`);
  }
}
