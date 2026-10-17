/**
 * DepositController — `deposit <thing> [in <book>]` (storage-and-ice D6).
 *
 * ⚠ Dumb by design: it resolves the book and the thing the binder bound,
 * calls `store.deposit(thing, giver)` — the store owns the whole sequence
 * (reconcile, the keeper, the veto, absorb, the receipt) — and renders
 * what came back. Refusals are the store's, in the store's words.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

const TOPIC = 'act.deed';

interface DepositModel extends CommandModel {
  thing: MqlOneResult;
  book?: MqlOneResult;
}

export default class DepositController extends CommandController<DepositModel> {
  async execute(model: DepositModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const book = (model.book?.stuff ?? null) as Stuff | null;
    const store = book && MixinApi.isStoreBook(book) ? book.getStore() : null;
    if (store === null) {
      return this.refuse(context, TOPIC, 'There is no book here to deposit anything against.', 'no-book');
    }
    const thing = (model.thing?.stuff ?? null) as Stuff | null;
    if (thing === null || !MixinApi.isContainable(thing)) {
      return this.refuse(context, TOPIC, 'You are not carrying that.', 'no-thing');
    }
    const name = thing.getPresentation();
    const out = await store.deposit(thing, giver);
    if (!out.ok) return this.refuse(context, TOPIC, out.line, out.reason);

    const r = out.receipt;
    const amount = r.unit === 'count' ? 'one lot' : `${round1(out.amountKg)} kg`;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You leave ${name} in the store's keeping. The book records ${amount} to ${r.depositor === r.bailee ? 'the house' : 'your name'} — an allowance of ${r.terms.allowancePct}% for shrinkage, and ${r.terms.feeMinorPerKg} a kilogram to take it out.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} leaves ${name} in the store's keeping, and it is written in the book.`)
      .send();
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
