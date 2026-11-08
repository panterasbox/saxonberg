/**
 * TitleHoldingsController — bare `title`: what ground do I hold, and what
 * may I do on it.
 */

import { TitleBookControllerBase, type TitleBookModel } from './TitleBookControllerBase';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { LandUses } from '@saxonberg/server/mud/lib/parcel/LandUse';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';

const TOPIC = 'act.deed';

export default class TitleHoldingsController extends TitleBookControllerBase {
  async execute(_model: TitleBookModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const me = giver.getIdentityPath() ?? '';
    const held: string[] = [];

    // ⭐ What the giver HOLDS is asked of the title register, and the book
    // a lot belongs to of the place over it — never of every book.
    for (const extent of await ParcelApi.extentsHeldBy(
      async (owner) => owner.kind === 'player' && owner.templatePath === me,
    )) {
      {
        const record = await ParcelApi.coveringParcelOf(extent);
        if (!record || record.getExtent() !== extent) continue;
        const owner = record.getOwner();
        if (owner?.kind !== 'player' || owner.templatePath !== me) continue;
        const book = await this.bookCovering(extent);
        if (!book) continue;
        const where = book.getLabel();
        const use = ParcelApi.landUseOf(extent);
        const area = record.getArea();
        const size = area
          ? Quantity.of(area, 'm²').tag('lot')
          : 'an unmeasured piece of ground';
        const leaf = extent.slice(extent.lastIndexOf('/') + 1);
        held.push(
          `${leaf} (${where}) — ${size}, zoned ${use}: ` +
            `${LandUses.summaryOf(use)}.`,
        );
      }
    }

    if (held.length === 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You hold no ground. The city Registry keeps the plat book; Hinkley Hills has lots going.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'holds-nothing',
        detail: 'the actor holds no titled ground',
      });
      return;
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You hold:\n${held.join('\n')}`)
      .send();
  }
}
