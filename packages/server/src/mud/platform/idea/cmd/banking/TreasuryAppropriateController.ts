/**
 * TreasuryAppropriateController — `treasury appropriate <amount> to
 * <target>` — an `appropriation` leg, treasury → the payee's primary.
 * The Minister's act, and it names its destination; the supply does not
 * move when the Treasury spends, and the floor refuses a spend the
 * account cannot cover (over {@link BankingControllerBase}).
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { BankingApi, Money } from "../../../../api/banking";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";

const TOPIC = "act.deed";

interface TreasuryAppropriateModel extends CommandModel {
  amount?: string;
  to?: string;
  target?: string;
}

export default class TreasuryAppropriateController extends BankingControllerBase<TreasuryAppropriateModel> {
  async execute(model: TreasuryAppropriateModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const minor = Number(model.amount);
    if (!Number.isInteger(minor) || minor <= 0) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`Appropriate how much?`).send();
      context.note({ kind: "controller-rejected", reason: "bad-amount", detail: model.amount ?? "" });
      return;
    }
    if ((model.to ?? "").toLowerCase() !== "to") {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Usage: \`treasury appropriate <amount> to <target>\`.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "bad-syntax", detail: model.to ?? "" });
      return;
    }
    const target = TreasuryAppropriateController.resolvePayee(model.target ?? "");
    if (!target) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`No business or member answers to "${model.target ?? ""}".`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-target", detail: model.target ?? "" });
      return;
    }
    const money = Money.of(minor, BankingApi.compactCurrency());
    try {
      await BankingApi.appropriate(target.key, money, `appropriation to ${target.label}`);
    } catch (err) {
      const why = err instanceof Error ? err.message : String(err);
      const short = /holds less than/.test(why);
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          short
            ? Mml.compose`The Treasury does not hold ${money.render()}; an appropriation cannot go below the floor.`
            : Mml.compose`${target.label} has no account to receive into.`,
        )
        .send();
      context.note({
        kind: "controller-rejected",
        reason: short ? "insufficient-funds" : "no-account",
        detail: target.key,
      });
      return;
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`The Treasury appropriates ${money.render()} to ${target.label}. The supply is unchanged.`)
      .send();
  }
}
