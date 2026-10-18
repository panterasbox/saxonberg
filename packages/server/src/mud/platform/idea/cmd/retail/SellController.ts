/**
 * SellController — `sell <thing> [to <counter>]`.
 *
 * ⚠ Dumb by design: the counter owns the act (`Stock.buyFrom`) — which
 * lines the house buys, the attendance, the title, the room, the bid and
 * the payment — and returns its refusal in its own words. This file binds
 * the two things, hands them over, and says what happened.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlOneResult } from "../../../../api/mql";
import { MessageApi } from "../../../../api/message";
import { MixinApi } from "../../../../api/mixin";
import { BankingApi, Money } from "../../../../api/banking";
import { Mml } from "../../../../api/mml";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import Stock from "../../../../lib/retail/Stock";

const TOPIC = "act.deed";

interface SellModel extends CommandModel {
  thing: MqlOneResult;
  counter?: MqlOneResult;
}

export default class SellController extends CommandController<SellModel> {
  async execute(model: SellModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const counter = model.counter?.stuff ?? null;
    const item = model.thing?.stuff ?? null;
    if (!(counter instanceof Stock)) {
      return this.refuse(context, TOPIC, "Nobody here buys anything.", "no-buyer");
    }
    if (item === null || !MixinApi.isContainable(item)) {
      return this.refuse(context, TOPIC, "You have nothing like that to sell.", "nothing-to-sell");
    }
    const what = item.getPresentation();
    const out = await counter.buyFrom(giver, item);
    if (!out.ok) {
      return this.refuse(context, TOPIC, out.line, out.reason);
    }
    const paid = Money.of(out.paidMinor, BankingApi.compactCurrency()).render();
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        out.intoStore
          ? Mml.compose`You sell ${Mml.text(what)} to the house for ${paid}; it goes onto the stack.`
          : Mml.compose`You sell ${Mml.text(what)} to the house for ${paid}.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} sells ${Mml.text(what)} across ${Mml.thing(counter as unknown as Stuff)}.`)
      .send();
  }
}
