/**
 * SupplyController — `supply` (developer-gated money-supply + reconciliation).
 *
 * The minimal operator reporting consumer: the headline money supply (Σ
 * mints − Σ drains) and the conservation audit (top-down supply vs bottom-up
 * Σ balances + Σ circulating coin). Dogfoods the deficit and validates
 * conservation.
 */

import { BankController } from "./BankController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { BankingApi, Money } from "../../../api/banking";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";

const TOPIC = "world.narration.action";

export default class SupplyController extends BankController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const r = BankingApi.reconcile();
    const body =
      `Money supply: ${Money.of(r.supply).render()}\n` +
      `  in accounts:  ${Money.of(r.accountTotal).render()}\n` +
      `  in circulation: ${Money.of(r.circulatingCoin).render()}\n` +
      `  cash in existence: ${Money.of(r.cashInExistence).render()}\n` +
      `  reconciliation: ${r.balanced ? "balanced ✓" : "OUT OF BALANCE ✗"}`;
    MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`${body}`).send();
  }
}
