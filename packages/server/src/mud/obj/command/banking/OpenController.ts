/**
 * OpenController — `open` (an account at the present bank).
 *
 * The onboarding interaction: opening an account at a branch records a
 * standing corpo affiliation (the bank's `corpoKey`). The owner is the
 * context-derived author (never off the wire); idempotent — opening again
 * here just names the existing account.
 */

import { BankController } from "./BankController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { BankingApi } from "../../../api/banking";
import { CorpoApi } from "../../../api/corpo";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";

const TOPIC = "world.narration.action";

export default class OpenController extends BankController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const bank = this.resolveBank(context);
    if (!bank) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's nowhere to open an account here.`)
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "no-bank-here",
        detail: "open",
      });
      return;
    }

    await BankingApi.openAccount(bank.getBankPath(), bank.getCorpoKey());
    const corpo = CorpoApi.getCorpo(bank.getCorpoKey());
    const house = corpo ? corpo.label : "the bank";
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You open an account with ${house}.`)
      .toPeers(Mml.compose`${Mml.name(giver)} opens an account.`)
      .send();
  }
}
