/**
 * BankDepositController — `bank deposit <coins>`: a coin stack across the
 * counter into the giver's account.
 */

import { BankControllerBase, TOPIC, type BankModel } from "./BankControllerBase";
import type { CommandContext } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { MixinApi } from "../../../../api/mixin";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Bank } from "../../../../lib/banking/Bank";

export default class BankDepositController extends BankControllerBase {
  protected async atBank(bank: Stuff & Bank, model: BankModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const coins = model.coins?.stuff;
    if (!coins || !MixinApi.isStackable(coins)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't have any '${model.coins?.raw ?? ""}' to deposit.`)
        .send();
      context.note({ kind: "empty-result", field: "coins", query: model.coins?.raw ?? "" });
      return;
    }
    // ⚠⚠ Read the stack's NAME AS TEXT before banking it. `deposit()`
    // CONSUMES the stack, and `Mml.thing()` holds the Stuff and resolves
    // it at RENDER time — so by the time the scene renders, it is naming
    // a destructed object, its presentation comes back undefined, and
    // MML's `escape()` throws "Cannot read properties of undefined
    // (reading 'replace')". The player saw `controller-error` on a
    // deposit that had ALREADY MOVED THEIR MONEY — the worst shape this
    // failure could take, and there was no other way to bank coin.
    //
    // A plain string is the right carrier here: a clickable ref to a
    // Stuff that no longer exists is worth nothing anyway. Found by
    // driving the world; the unit suite banks without rendering.
    const deposited = coins.getPresentation();
    try {
      await bank.deposit(coins);
    } catch (err) {
      return this.declineScene(context, "deposit-failed", err, "coins");
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You deposit ${deposited}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} makes a deposit.`)
      .send();
  }
}
