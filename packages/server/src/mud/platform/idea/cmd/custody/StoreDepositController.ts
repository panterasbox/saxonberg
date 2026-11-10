/**
 * StoreDepositController — `store deposit <thing>` — leave a thing in the
 * store's keeping against a receipt (over {@link StoreControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { StoreControllerBase, TOPIC, type StoreModel } from './StoreControllerBase';

export default class StoreDepositController extends StoreControllerBase {
  async execute(model: StoreModel, context: CommandContext): Promise<void> {
    const store = this.storeFor(model, context);
    if (store === null) return;
    const giver = context.commandGiver as unknown as Stuff;
    const thing = (model.thing?.stuff ?? null) as Stuff | null;
    if (thing === null || !MixinApi.isContainable(thing)) {
      return this.refuse(context, TOPIC, 'You are not carrying that.', 'no-thing');
    }
    const name = thing.getPresentation();
    const out = await store.deposit(thing, giver);
    if (!out.ok) return this.refuse(context, TOPIC, out.line, out.reason);

    const r = out.receipt;
    const amount = r.unit === 'count' ? 'one lot' : `${StoreControllerBase.round1(out.amountKg)} kg`;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        out.paper !== undefined
          ? Mml.compose`You leave ${name} in the store's keeping. The keeper writes ${amount} into the book and hands you ${Mml.thing(out.paper)} — whoever presents it draws the goods. An allowance of ${r.terms.allowancePct}% for shrinkage, and ${r.terms.feeMinorPerKg} a kilogram to take it out.`
          : Mml.compose`You leave ${name} in the store's keeping. The book records ${amount} to ${r.depositor === r.bailee ? 'the house' : 'your name'} — an allowance of ${r.terms.allowancePct}% for shrinkage, and ${r.terms.feeMinorPerKg} a kilogram to take it out.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} leaves ${name} in the store's keeping, and it is written in the book.`)
      .send();
  }
}
