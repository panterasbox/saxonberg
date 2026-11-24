/**
 * ReserveRetireController — `reserve retire <amount> from <target>
 * "<reason>"` — the Governor's recorded retirement: money withdrawn from a
 * named target's account back to the reserve, the reason on the ledger row,
 * the officer as the actor from context. The override's exact inverse
 * (test-world-lifecycle D10): the money supply falls by the amount, the
 * dashboard prints retirements on the record as their own line, and the
 * holder is told. Never partial — an amount the account cannot cover is
 * refused by the bank and nothing posts.
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { BankingApi, Money } from "../../../../api/banking";
import { MessageApi } from "../../../../api/message";
import { PlayerApi } from "../../../../api/player";
import { Mml } from "../../../../api/mml";
import { Refusal } from "../../../../lib/errors";

const TOPIC = "act.deed";


interface ReserveRetireModel extends CommandModel {
  amount?: string;
  from?: string;
  target?: string;
  reason?: string;
}

export default class ReserveRetireController extends BankingControllerBase<ReserveRetireModel> {
  async execute(model: ReserveRetireModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const minor = Number(model.amount);
    if (!Number.isInteger(minor)) {
      return this.refuse(context, new Refusal("reserve-bad-amount", { amount: model.amount ?? "" }));
    }
    // `from` is the view's own word (type: enum) — the binder held it.
    const reason = (model.reason ?? "").trim().replace(/^["']|["']$/g, "");
    if (!reason) return this.refuse(context, new Refusal("reserve-no-reason"));
    const target = ReserveRetireController.resolvePayee(model.target ?? "");
    if (!target) {
      return this.refuse(context, new Refusal("reserve-no-target", { target: model.target ?? "" }));
    }
    const account = await BankingApi.primaryAccountIdOf(target.key);
    if (!account) return this.refuse(context, new Refusal("reserve-no-account", { target: target.label }));
    const money = Money.of(minor, BankingApi.compactCurrency());
    try {
      await BankingApi.retire(account, money, reason);
    } catch (err) {
      if (err instanceof Refusal) return this.refuse(context, err);
      throw err;
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`The reserve retires ${money.render()} from ${target.label}'s account on your order — "${reason}" — and the record says so.`,
      )
      .send();
    // The holder is told, when a person is present to hear it; the
    // statement carries the row either way.
    const holder = PlayerApi.findAvatarByName(model.target ?? "");
    if (holder && holder !== giver) {
      MessageApi.scene(holder)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`The reserve has retired ${money.render()} from your account on the Governor's order: "${reason}".`,
        )
        .send();
    }
  }
}
