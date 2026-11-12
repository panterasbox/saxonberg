/**
 * TitleListController — `title list`: the lots on offer, at the counter
 * that keeps them.
 */

import { TitleBookControllerBase, type TitleBookModel } from './TitleBookControllerBase';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import { BankingApi } from '@saxonberg/server/mud/api/banking';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Money } from '@saxonberg/server/mud/lib/banking/Money';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';

const TOPIC = 'act.deed';

export default class TitleListController extends TitleBookControllerBase {
  async execute(model: TitleBookModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const desk = this.deskOf(model, context, 'list');
    if (!desk) return;

    const lines: string[] = [];
    for (const book of await this.booksAt(desk)) {
      const price = Money.of(book.getPriceMinor(), BankingApi.compactCurrency());
      const area = Quantity.of(book.getAreaM2(), 'm²');
      const use = book.getLandUse();
      lines.push(`${book.getLabel()}:`);
      for (const extent of await book.lotExtents()) {
        const leaf = extent.slice(extent.lastIndexOf('/') + 1);
        lines.push(
          (await book.isSold(extent))
            ? `  ${leaf} — sold.`
            : `  ${leaf} — ${area.tag('lot')}, zoned ${use}, ${price.render()}.`,
        );
      }
    }

    if (lines.length === 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`The plat book is empty. Nothing is for sale.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'nothing-for-sale',
        detail: 'no PlatBook offers any lots',
      });
      return;
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`The plat book:\n${lines.join('\n')}`)
      .send();
  }
}
