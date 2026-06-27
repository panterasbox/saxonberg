/**
 * MintController — `mint <amount>` (developer-gated central-bank operator).
 *
 * The faucet that covers the bar's red: mints subsidy (a logged, visible,
 * accountable `mint`/`subsidy`) into the present venue's account. The
 * operator surface for the deficit-as-target P&L — every subsidy is a logged
 * mint by construction.
 */

import { BankController } from "./BankController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { BankingApi, Money } from "../../../api/banking";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";

const TOPIC = "world.narration.action";

interface MintModel extends CommandModel {
  amount: string;
}

export default class MintController extends BankController<MintModel> {
  async execute(model: MintModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const minor = Number(model.amount);
    if (!Number.isInteger(minor) || minor <= 0) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`Mint how much?`).send();
      context.note({ kind: "controller-rejected", reason: "bad-amount", detail: model.amount });
      return;
    }
    const venuePath = context.location?.getTemplatePath() ?? "";
    const account = await BankingApi.primaryAccountIdOf(venuePath);
    if (!account) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no account here to float.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-venue-account", detail: "mint" });
      return;
    }
    await BankingApi.mint(account, Money.of(minor), "operator subsidy", "subsidy");
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`The reserve mints ${Money.of(minor).render()} of subsidy into the house account.`)
      .send();
  }
}
