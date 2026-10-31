/**
 * CharterController — `charter [<ship>]`: hire a whole ship for a voyage
 * (harbors P23).
 *
 * Afforded by a charter book (`CharterBook`, peers). The controller finds
 * the ship by the book (`CharterBook.shipFor` — the ship it is aboard, or
 * the listed one the word names) and asks HER: `Ship.charterTo` decides
 * (already chartered, her own master aboard on shift) and writes the
 * record. The charter ends on its own as she berths at a kept quay.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import CharterBook from '../../../thing/CharterBook';

interface CharterModel extends CommandModel {
  ship?: string;
  book?: MqlOneResult;
}

const TOPIC = 'shell.result';

export default class CharterController extends CommandController<CharterModel> {
  async execute(model: CharterModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const found = model.book?.stuff ?? null;
    const book = found instanceof CharterBook ? found : null;
    if (book === null) return this.refuse(context, TOPIC, 'There is no charter book here.', 'no-book');
    const ship = await book.shipFor(model.ship ?? null);
    if (typeof ship === 'string') return this.refuse(context, TOPIC, ship, 'no-such-ship');
    const rate = book.rateFor(ship);
    const refused = await ship.charterTo(giver, rate, book.getPayTo());
    if (refused !== null) return this.refuse(context, TOPIC, refused, 'charter-refused');
    const name = ship.getPresentation();
    const terms = rate > 0 ? ` at ${rate} a day, paid at the harbor office when she next berths` : '';
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`You charter ${name}${terms}. Until she next berths her helm is yours.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} writes in the charter book.`)
      .send();
  }
}
