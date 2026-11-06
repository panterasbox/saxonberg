/**
 * BankOpenController — `bank open`: open an account at this branch
 * (recording the branch's corpo affiliation). Idempotent in the logic.
 */

import { BankControllerBase, TOPIC, type BankModel } from "./BankControllerBase";
import type { CommandContext } from "../../../../api/command";
import { BankingApi } from "../../../../api/banking";
import { CorpoApi } from "../../../../api/corpo";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Bank } from "../../../../lib/banking/Bank";

export default class BankOpenController extends BankControllerBase {
  protected async atBank(bank: Stuff & Bank, _model: BankModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    await BankingApi.openAccount(
      bank.getBank(),
      bank.getCorpoKey(),
      BankingApi.compactCurrency(),
    );
    const corpo = CorpoApi.getCorpo(bank.getCorpoKey());
    const house = corpo ? corpo.label : "the bank";
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You open an account with ${house}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} opens an account.`)
      .send();
  }
}
