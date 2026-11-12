/**
 * WalletBeneficiaryController — `wallet beneficiary <player>` — who the
 * estate passes to instead of the Compact if the member is gone past the long clock (economic
 * bootstrap D17); `none` clears it. A name the member knows, resolved
 * to a durable identity; a beneficiary who is themselves dormant when
 * the day comes is skipped and the state holds it unclaimed
 * (over {@link BankingControllerBase}).
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { PlayerApi } from "../../../../api/player";
import { Mml } from "../../../../api/mml";

const TOPIC = "act.deed";

interface WalletBeneficiaryModel extends CommandModel {
  player?: string;
}

export default class WalletBeneficiaryController extends BankingControllerBase<WalletBeneficiaryModel> {
  async execute(model: WalletBeneficiaryModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!PlayerApi.isAvatarStuff(giver)) {
      context.note({ kind: "controller-rejected", reason: "not-a-member", detail: "beneficiary" });
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`Only a member has an estate to leave.`).send();
      return;
    }
    const want = (model.player ?? "").trim();
    if (!want || want.toLowerCase() === "none") {
      giver.setBeneficiary("");
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`Your estate passes to the Compact, held unclaimed for your return.`).send();
      return;
    }
    const who = PlayerApi.findAvatarByName(want);
    const key = who?.getIdentityPath() ?? "";
    if (!who || !key || key === giver.getIdentityPath()) {
      context.note({ kind: "controller-rejected", reason: "no-such-member", detail: want });
      MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`No member by that name is here to name — a beneficiary must be someone you can point at.`).send();
      return;
    }
    giver.setBeneficiary(key);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`If you are gone past the long clock, your estate passes to ${Mml.actor(who)} — unless they are gone too, in which case the Compact holds it for you.`)
      .send();
    this.creditFinance(giver);
  }
}
