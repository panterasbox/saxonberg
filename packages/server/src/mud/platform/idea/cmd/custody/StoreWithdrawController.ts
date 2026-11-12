/**
 * StoreWithdrawController — `store withdraw [<n>] <good>` — draw goods out
 * against a receipt (over {@link StoreControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { GrammarApi } from '../../../../api/grammar';
import { StoreControllerBase, TOPIC, type StoreModel } from './StoreControllerBase';

export default class StoreWithdrawController extends StoreControllerBase {
  async execute(model: StoreModel, context: CommandContext): Promise<void> {
    const store = this.storeFor(model, context);
    if (store === null) return;
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
}
