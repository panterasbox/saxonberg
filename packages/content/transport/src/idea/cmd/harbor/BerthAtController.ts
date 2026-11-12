/**
 * BerthAtController — `berth <ship> at <quay> [in <book>]`: give a ship
 * her quay (over {@link BerthControllerBase}). The harbor applies its
 * posted criteria and refuses any quay they would refuse, citing the
 * criterion.
 *
 * ⭐ The roads are their own word now (`berth roads <ship>`,
 * controller-liquidity W7b): naming them where a quay goes is refused,
 * with the form that does it.
 */

import type { CommandContext } from '@saxonberg/server/mud/api/command';
import { BerthControllerBase, type BerthModel } from './BerthControllerBase';

export default class BerthAtController extends BerthControllerBase {
  async execute(model: BerthModel, context: CommandContext): Promise<void> {
    const call = await this.callFor(model, context);
    if (call === null) return;
    const { harbor, ship, nowS } = call;
    const quayName = model.quay ?? '';
    if (await harbor.isRoadsWord(quayName)) {
      return this.decline(
        context,
        `The roads are not a quay — to have her lie there, \`berth roads ${model.ship}\`.`,
        'roads-is-its-own-word',
      );
    }
    const quay = await harbor.quayNamed(quayName);
    if (quay === null) return this.decline(context, `'${quayName}' is not a quay this harbor keeps.`, 'no-such-quay');
    const refused = await harbor.assignBy(ship, quay, context.commandGiver, nowS);
    if (refused !== null) return this.decline(context, refused, 'berth-refused');
    return this.done(context.commandGiver, `You write ${ship.getName()} into the book for ${quayName} and signal her in.`);
  }
}
