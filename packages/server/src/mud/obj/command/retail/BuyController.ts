/**
 * BuyController — `buy <thing>`.
 *
 * The customer side of the general store. Resolves the good off the present
 * `Stock` counter, settles a presented `Charge` (card → cash) to the store's
 * Business account, remits the demo sales tax, hands the good over, and
 * **stamps the buyer as its owner** (the buy-that-stamps that makes the
 * chattel core visible). Unlike the bar — which floats an unpaid drink — a
 * store hands nothing over unless payment clears.
 *
 * The `Stock` fixture is also the Attendant service point (it composes
 * `AttendantMixin`): being served is gated on being attended (staffed
 * during hours; a `closed` counter refuses).
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import Stock from "../../../lib/retail/Stock";
import { ContainmentApi } from "../../../api/containment";
import { MixinApi } from "../../../api/mixin";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";
import { ChattelApi } from "../../../api/chattel";
import { BankingApi, Money } from "../../../api/banking";
import type { Charge } from "../../../api/banking";
import { EmploymentApi } from "../../../api/employment";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Container } from "../../../lib/spatial/Container";
import type { Containable } from "../../../lib/spatial/Containable";

const TOPIC = "world.narration.action";

interface BuyModel extends CommandModel {
  thing: string;
}

export default class BuyController extends CommandController<BuyModel> {
  async execute(model: BuyModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const stock = Stock.resolveIn(context);
    if (!stock) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's nothing to buy here.`)
        .send();
      context.note({ kind: "empty-result", field: "thing", query: model.thing });
      return;
    }

    // Attendant: the store runs the storefront-attention substrate. A
    // `closed` counter (unstaffed + close policy) refuses.
    const key = giver.getTemplatePath();
    if (key && stock.requestAttention(key).status === "closed") {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no one behind the counter just now.`)
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "unattended",
        detail: "no clerk on duty",
      });
      return;
    }

    const item = stock.resolveBuy(model.thing);
    if (!item) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`"${model.thing}" isn't for sale here.`)
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "not-on-shelf",
        detail: model.thing,
      });
      return;
    }

    const price = stock.priceFor(item.getTemplatePath() ?? "");
    if (price == null) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.item(item)} isn't for sale.`)
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "not-priced",
        detail: model.thing,
      });
      return;
    }

    // Settle FIRST — a store hands nothing over unless payment clears.
    const paid = await this.charge(stock, price, context);
    if (!paid) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You can't cover ${Mml.item(item)} just now.`)
        .send();
      context.note({
        kind: "controller-rejected",
        reason: "insufficient-funds",
        detail: model.thing,
      });
      return;
    }

    // Hand over (custody) — the move removes it from the shelf (the
    // decrement) — then stamp the buyer as its owner.
    if (MixinApi.isContainer(giver)) {
      ContainmentApi.move(
        item as Stuff & Containable,
        giver as unknown as Stuff & Container,
      );
    }
    await ChattelApi.stamp(item, giver);

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You buy ${Mml.item(item)}. ${paid}`)
      .toPeers(Mml.compose`${Mml.name(giver)} buys ${Mml.item(item)}.`)
      .send();
  }

  /**
   * Settle the good's price as a presented Charge to the store's Business
   * account, then remit the demo sales tax. Returns a short "you tap…" tail
   * for the scene, or null when nothing clears (card then cash both fail /
   * no account). The store's account is ensured lazily off its operating
   * Business (the `OrderController.charge` shape).
   */
  private async charge(
    stock: Stock,
    price: number,
    _context: CommandContext,
  ): Promise<string | null> {
    const venuePath = stock.getTemplatePath();
    if (!venuePath) return null;
    const business = await EmploymentApi.ensureOperatorAt(venuePath);
    const ownerPath = business?.getAccountPath() ?? venuePath;
    let venueAccount: string;
    try {
      venueAccount = await BankingApi.ensureVenueAccount(ownerPath, ownerPath, "");
    } catch {
      return null;
    }
    const charge: Charge = {
      amount: Money.of(price),
      reason: "a purchase",
      presented: true,
      payeeAccountId: venueAccount,
      category: "sales",
    };
    let receipt;
    try {
      receipt = await BankingApi.settle(charge, { kind: "credential" });
    } catch {
      try {
        receipt = await BankingApi.settle(charge, { kind: "cash" });
      } catch {
        return null; // no funds at all — the store won't front it
      }
    }
    await BankingApi.remitDemoTax(venueAccount, Money.of(price));
    return receipt.corpoKey
      ? `(${Money.of(price).render()}, ${receipt.corpoKey})`
      : `(${Money.of(price).render()})`;
  }
}
