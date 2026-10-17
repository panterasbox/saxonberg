/**
 * WithdrawController — `withdraw [<n>] <good> [from <book>]`
 * (storage-and-ice D6).
 *
 * ⚠ Dumb by design: it parses what was said (`3 ice` → 3 units of
 * `ice`), calls `store.withdraw(giver, good, n)` — the store owns the
 * keeper, the payout rule, the fee and the hand-over — and renders what
 * came back.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { GrammarApi } from '../../../../api/grammar';

const TOPIC = 'act.deed';

interface WithdrawModel extends CommandModel {
  what: string;
  book?: MqlOneResult;
}

export default class WithdrawController extends CommandController<WithdrawModel> {
  async execute(model: WithdrawModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const book = (model.book?.stuff ?? null) as Stuff | null;
    const store = book && MixinApi.isStoreBook(book) ? book.getStore() : null;
    if (store === null) {
      return this.refuse(context, TOPIC, 'There is no book here to draw anything against.', 'no-book');
    }
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
}
