/**
 * StoreReceiptsController — bare `store` and `store receipts` — your open
 * receipts in this store, what the book owes you (over {@link
 * StoreControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { StoreControllerBase, TOPIC, type StoreModel } from './StoreControllerBase';

export default class StoreReceiptsController extends StoreControllerBase {
  async execute(model: StoreModel, context: CommandContext): Promise<void> {
    const store = this.storeFor(model, context);
    if (store === null) return;
    const giver = context.commandGiver as unknown as Stuff;
    const mine = (await store.receiptsFor(giver.getIdentityPath() ?? '')).filter((r) => r.amountKg > 0);
    const line =
      mine.length === 0
        ? 'The book holds nothing in your name here.'
        : `The book holds in your name: ${mine
            .map((r) => `${r.what} — ${r.unit === 'count' ? 'one lot' : `${StoreControllerBase.round1(r.amountKg)} kg`}`)
            .join('; ')}.`;
    MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`${line}`).send();
  }
}
