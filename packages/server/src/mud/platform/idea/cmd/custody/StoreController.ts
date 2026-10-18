/**
 * StoreController — the `store` verb: dispatch-on-subcommand over a
 * store's book (storage-and-ice D6; one noun since the review, the
 * `BankController` precedent). Bare `store` lists your receipts here;
 * `store deposit <thing>` and `store withdraw [<n>] <good>` are the two
 * entries a keeper writes.
 *
 * ⚠ Dumb by design: it resolves the book the binder bound, hands the act to
 * the store — which owns the whole sequence (reconcile, the keeper, the
 * veto, absorb, the receipt; the payout rule, the fee, the hand-over) —
 * and renders what came back. Refusals are the store's, in its words.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Store } from '../../../../lib/storage/Store';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { GrammarApi } from '../../../../api/grammar';

const TOPIC = 'act.deed';

interface StoreModel extends CommandModel {
  subcommand?: string;
  book?: MqlOneResult;
  thing?: MqlOneResult;
  what?: string;
}

type StoreStuff = Stuff & Store;

export default class StoreController extends CommandController<StoreModel> {
  async execute(model: StoreModel, context: CommandContext): Promise<void> {
    const book = (model.book?.stuff ?? null) as Stuff | null;
    const store = book && MixinApi.isStoreBook(book) ? (book.getStore() as StoreStuff | null) : null;
    if (store === null) {
      return this.refuse(context, TOPIC, 'There is no book here to keep anything against.', 'no-book');
    }
    switch (model.subcommand) {
      case 'deposit':
        return this.deposit(store, model, context);
      case 'withdraw':
        return this.withdraw(store, model, context);
      default:
        return this.receipts(store, context);
    }
  }

  private async deposit(store: StoreStuff, model: StoreModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
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

  private async withdraw(store: StoreStuff, model: StoreModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const words = String(model.what ?? '').trim().split(/\s+/).filter((w) => w.length > 0);
    let units = 1;
    if (words.length > 1 && /^\d+$/.test(words[0] ?? '')) units = Number.parseInt(words.shift() as string, 10);
    const good = words.join(' ');
    if (!good) return this.refuse(context, TOPIC, 'Withdraw what?', 'no-good');

    const out = await store.withdraw(giver, good, units);
    if (!out.ok) return this.refuse(context, TOPIC, out.line, out.reason);

    const r = out.receipt;
    const count = out.goods.length === 1 ? out.goods[0]!.getPresentation() : `${GrammarApi.inWords(out.goods.length)} lots`;
    const fee = out.feeMinor > 0 ? ` You pay ${out.feeMinor} for the keeping.` : '';
    const settled =
      r.settledAtS !== undefined
        ? r.withinAllowance === false
          ? ` That settles the receipt — short by ${r.shortfallPct}%, beyond the allowance printed on it.`
          : ' That settles the receipt.'
        : '';
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`The keeper pays out ${count} against your receipt.${fee}${settled}`)
      .toPeers(Mml.compose`${Mml.actor(giver)} draws goods out of the store against a receipt.`)
      .send();
  }

  /** Your open receipts in this store — what the book owes you. */
  private async receipts(store: StoreStuff, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const mine = (await store.receiptsFor(giver.getIdentityPath() ?? '')).filter((r) => r.amountKg > 0);
    const line =
      mine.length === 0
        ? 'The book holds nothing in your name here.'
        : `The book holds in your name: ${mine
            .map((r) => `${r.what} — ${r.unit === 'count' ? 'one lot' : `${round1(r.amountKg)} kg`}`)
            .join('; ')}.`;
    MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`${line}`).send();
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
