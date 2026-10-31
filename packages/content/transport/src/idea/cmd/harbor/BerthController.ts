/**
 * BerthController — `berth <ship> at <quay>` / `berth <ship> roads`: the
 * harbormaster's call (harbors A2, P8, P11).
 *
 * Afforded by the berth book (`HarborBook`, peers). The controller only
 * finds the book, the ship and the quay by the words given and asks the
 * harbor: `Harbor.assignBy` applies the posted criteria and refuses any
 * quay they would refuse, citing the criterion; `Harbor.sendToRoads`
 * takes back a berth given and not yet taken up. Whoever does not hold the
 * seat on shift is refused before anything else — *you do not keep this
 * harbor*.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import HarborBook from '../../../thing/HarborBook';

interface BerthModel extends CommandModel {
  ship: string;
  quay: string;
  book?: MqlOneResult;
}

export default class BerthController extends CommandController<BerthModel> {
  async execute(model: BerthModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const found = model.book?.stuff ?? null;
    const book = found instanceof HarborBook ? found : null;
    if (book === null) return this.decline(context, 'There is no berth book here to give a berth from.', 'no-book');
    const harbor = await book.liveHarbor();
    if (harbor === null) return this.decline(context, 'Nobody keeps this book.', 'no-harbor');
    // ⭐ The seat, on shift — before anything is looked up (P11).
    if (!harbor.keptBy(giver)) return this.decline(context, 'You do not keep this harbor.', 'not-keeper');
    const nowS = WorldClockApi.getNow().rawValue();
    const ship = await harbor.shipNamed(model.ship, nowS);
    if (ship === null) {
      return this.decline(context, `The book knows no ship called '${model.ship}' — none in it, and none that hailed lately.`, 'no-such-ship');
    }
    const name = ship.getName();
    if (await harbor.isRoadsWord(model.quay)) {
      const refused = await harbor.sendToRoads(ship, giver, nowS);
      if (refused !== null) return this.decline(context, refused, 'roads-refused');
      return this.done(giver, `You write ${name} down for the roads and signal her to lie there.`);
    }
    const quay = await harbor.quayNamed(model.quay);
    if (quay === null) return this.decline(context, `'${model.quay}' is not a quay this harbor keeps.`, 'no-such-quay');
    const refused = await harbor.assignBy(ship, quay, giver, nowS);
    if (refused !== null) return this.decline(context, refused, 'berth-refused');
    return this.done(giver, `You write ${name} into the book for ${model.quay} and signal her in.`);
  }

  private done(giver: CommandContext['commandGiver'], text: string): void {
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`${text}`)
      .toPeers(Mml.compose`${Mml.actor(giver)} writes in the berth book.`)
      .send();
  }

  private decline(context: CommandContext, text: string, reason: string): void {
    MessageApi.scene(context.commandGiver).topic('shell.result').toSelf(Mml.compose`${text}`).send();
    context.note({ kind: 'controller-rejected', reason, detail: text });
  }
}
