/**
 * ReserveOverrideController — `reserve override <amount> to <target>
 * "<reason>"` — the emergency override: a mint into a named target's
 * account, the reason on the ledger row, the officer as the actor from
 * context. The dashboard prints overrides outstanding as its own line;
 * the faucet lint allowlists exactly this act (over {@link
 * BankingControllerBase}).
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { BankingApi, Money } from "../../../../api/banking";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";

const TOPIC = "act.deed";

interface ReserveOverrideModel extends CommandModel {
  amount?: string;
  to?: string;
  target?: string;
  reason?: string;
}

export default class ReserveOverrideController extends BankingControllerBase<ReserveOverrideModel> {
  async execute(model: ReserveOverrideModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const minor = Number(model.amount);
    if (!Number.isInteger(minor) || minor <= 0) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`Override how much?`).send();
      context.note({ kind: "controller-rejected", reason: "bad-amount", detail: model.amount ?? "" });
      return;
    }
    if ((model.to ?? "").toLowerCase() !== "to") {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Usage: \`reserve override <amount> to <target> "<reason>"\`.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "bad-syntax", detail: model.to ?? "" });
      return;
    }
    const reason = (model.reason ?? "").trim().replace(/^["']|["']$/g, "");
    if (!reason) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`An override goes on the record with a reason. Give one.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-reason", detail: "" });
      return;
    }
    const target = ReserveOverrideController.resolvePayee(model.target ?? "");
    if (!target) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`No business or member answers to "${model.target ?? ""}".`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-target", detail: model.target ?? "" });
      return;
    }
    const account = await BankingApi.primaryAccountIdOf(target.key);
    if (!account) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${target.label} has no account to receive into.`)
        .send();
      context.note({ kind: "controller-rejected", reason: "no-account", detail: target.key });
      return;
    }
    const money = Money.of(minor, BankingApi.compactCurrency());
    await BankingApi.override(account, money, reason);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`The reserve mints ${money.render()} into ${target.label}'s account on your override — "${reason}" — and the record says so.`,
      )
      .send();
  }
}
