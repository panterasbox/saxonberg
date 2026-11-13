/**
 * WalletShowController — bare `wallet` — shows the active account and the
 * paper with your name on it (over {@link BankingControllerBase}).
 */

import { BankingControllerBase } from "./BankingControllerBase";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { BankingApi } from "../../../../api/banking";
import { MessageApi } from "../../../../api/message";
import { ContractApi } from "../../../../api/contract";
import { MixinApi } from "../../../../api/mixin";
import { Mml } from "../../../../api/mml";
import { StuffApi } from '../../../../api/stuff';

const TOPIC = "act.deed";

export default class WalletShowController extends BankingControllerBase<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    // ⭐ The paper with your name on it (economic bootstrap D10): the
    // Arrival Note, a loan, an unclaimed claim — every open instrument the
    // wallet's owner issues or holds, listed beside the balance whether or
    // not they carry an implant. The paper itself is in their papers.
    const instruments = await ContractApi.instrumentsOf(giver.getIdentityPath() ?? "");
    const paper = instruments.map((l) => l.words);
    const credential = BankingApi.activeCredential();
    if (!credential) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          paper.length
            ? Mml.compose`You have no payment implant. ${paper.join(" ")}`
            : Mml.compose`You have no payment implant.`,
        )
        .send();
      context.note({ kind: "controller-rejected", reason: "no-credential", detail: "wallet" });
      return;
    }
    const active = credential.getActiveAccount();
    const corpo = active ? await BankingApi.corpoKeyOf(active) : null;
    const ownerKey = active ? await BankingApi.ownerKeyOf(active) : null;
    const house =
      ownerKey && ownerKey !== giver.getIdentityPath()
        ? businessNamed(ownerKey)
        : null;
    const head = !active
      ? "Your wallet has no active account yet."
      : house
        ? `Your wallet is set to the house account of ${house}.`
        : `Your wallet is set to your ${corpo ?? "bank"} account.`;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(paper.length ? Mml.compose`${head} ${paper.join(" ")}` : Mml.compose`${head}`)
      .send();
  }
}

/** The live business at `ownerKey`, by its presentation — inlined from
 *  `BankingControllerBase` when that static's only caller turned out to
 *  be this file. */
function businessNamed(ownerKey: string): string | null {
  const live = StuffApi.findByTemplatePath(ownerKey);
  return live && MixinApi.isBusiness(live) ? live.getPresentation() : null;
}
