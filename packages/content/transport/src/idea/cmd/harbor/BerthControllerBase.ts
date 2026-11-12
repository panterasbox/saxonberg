/**
 * BerthControllerBase — what the two `berth` controllers share
 * (controller-liquidity W7b): finding the book, the harbor it is kept for
 * and the ship by the words given, the keeper's gate, and the prose.
 *
 *   - `berth <ship> at <quay> [in <book>]` — {@link BerthAtController}
 *     (the fallthrough form): `Harbor.assignBy` applies the posted
 *     criteria and refuses any quay they would refuse, citing the
 *     criterion.
 *   - `berth roads <ship> [in <book>]` — {@link BerthRoadsController}:
 *     `Harbor.sendToRoads` takes back a berth given and not yet taken up.
 *
 * Afforded by the berth book (`HarborBook`, peers). Whoever does not hold
 * the seat on shift is refused before anything else — *you do not keep
 * this harbor*.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import HarborBook from '../../../thing/HarborBook';
import type Harbor from '../../Harbor';
import type Ship from '@saxonberg/server/mud/platform/idea/Ship';

export interface BerthModel extends CommandModel {
  ship: string;
  /** `at <quay>` — the fallthrough form's. */
  quay?: string;
  book?: MqlOneResult;
}

export abstract class BerthControllerBase extends CommandController<BerthModel> {
  /**
   * The harbor the book in front of you is kept for and the ship it knows
   * by the name given — or `null` after declining. ⭐ The seat, on shift,
   * is asked before anything is looked up.
   */
  protected async callFor(
    model: BerthModel,
    context: CommandContext,
  ): Promise<{ harbor: Harbor; ship: Ship; nowS: number } | null> {
    const giver = context.commandGiver;
    const found = model.book?.stuff ?? null;
    const book = found instanceof HarborBook ? found : null;
    if (book === null) {
      this.decline(context, 'There is no berth book here to give a berth from.', 'no-book');
      return null;
    }
    const harbor = await book.liveHarbor();
    if (harbor === null) {
      this.decline(context, 'Nobody keeps this book.', 'no-harbor');
      return null;
    }
    if (!harbor.keptBy(giver)) {
      this.decline(context, 'You do not keep this harbor.', 'not-keeper');
      return null;
    }
    const nowS = WorldClockApi.getNow().rawValue();
    const ship = await harbor.shipNamed(model.ship, nowS);
    if (ship === null) {
      this.decline(context, `The book knows no ship called '${model.ship}' — none in it, and none that hailed lately.`, 'no-such-ship');
      return null;
    }
    return { harbor, ship, nowS };
  }

  protected done(giver: CommandContext['commandGiver'], text: string): void {
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`${text}`)
      .toPeers(Mml.compose`${Mml.actor(giver)} writes in the berth book.`)
      .send();
  }

  protected decline(context: CommandContext, text: string, reason: string): void {
    MessageApi.scene(context.commandGiver).topic('shell.result').toSelf(Mml.compose`${text}`).send();
    context.note({ kind: 'controller-rejected', reason, detail: text });
  }
}
