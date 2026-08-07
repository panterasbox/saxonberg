/**
 * BuyController — `buy <thing>`.
 *
 * The customer side of the general store. Resolves the good off the present
 * `Stock` counter OR a consignment listing on the `ConsignmentShelf`,
 * settles a presented `Charge` (card → cash), hands the good over, and
 * transfers ownership to the buyer:
 *
 *   - **stock good** — settle the full price to the store's Business
 *     account, remit the demo tax on it, and **stamp** the buyer (a fresh,
 *     author-owned shelf good changes hands).
 *   - **consignment listing** — settle the ask, **split** the remainder to
 *     the consignor's primary account (the store keeps the commission,
 *     which is its taxable revenue), and **transfer** the owner-stamp to the
 *     buyer. The store fronts no coin (a real buyer's coin funds both legs).
 *
 * Unlike the bar, a store hands nothing over unless payment clears. The
 * `Stock` is also the Attendant point (a closed counter refuses).
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import Stock from "../../Stock";
import ConsignmentShelf from "../../ConsignmentShelf";
import { ContainmentApi } from "../../../api/containment";
import { MixinApi } from "../../../api/mixin";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";
import { ChattelApi } from "../../../api/chattel";
import { Currency, BankingApi, Money } from "../../../api/banking";
import type { Charge, RemittanceSplit } from "../../../api/banking";
import { EmploymentApi } from "../../../api/employment";
import { AppApi } from "../../../api/app";
import { AppSettingKeys } from "../../../lib/config/AppSettings";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Containable } from "../../../lib/spatial/Containable";

const TOPIC = "act.deed";

interface BuyModel extends CommandModel {
  thing: string;
}

export default class BuyController extends CommandController<BuyModel> {
  async execute(model: BuyModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const stock = Stock.resolveIn(context);
    const shelf = ConsignmentShelf.resolveIn(context);
    if (!stock && !shelf) {
      this.reject(giver, context, Mml.compose`There's nothing to buy here.`, {
        kind: "empty-result",
        field: "thing",
        query: model.thing,
      });
      return;
    }

    // Attendant: a store with a counter refuses when it's closed.
    if (stock) {
      const key = giver.getTemplatePath();
      if (key && stock.requestAttention(key).status === "closed") {
        this.reject(
          giver,
          context,
          Mml.compose`There's no one behind the counter just now.`,
          { kind: "controller-rejected", reason: "unattended", detail: "closed" },
        );
        return;
      }
    }

    const stockItem = stock?.resolveBuy(model.thing) ?? null;
    const listItem = stockItem
      ? null
      : shelf?.resolveConsigned(model.thing) ?? null;
    if (!stockItem && !listItem) {
      this.reject(
        giver,
        context,
        Mml.compose`"${model.thing}" isn't for sale here.`,
        { kind: "controller-rejected", reason: "not-on-shelf", detail: model.thing },
      );
      return;
    }

    if (stockItem && stock) {
      await this.buyStock(stock, stockItem, giver, context, model);
    } else {
      await this.buyListing(shelf!, listItem!, stock, giver, context, model);
    }
  }

  /** Buy a fresh stock good — settle full, hand over, stamp the buyer. */
  private async buyStock(
    stock: Stock,
    item: Stuff & Containable,
    giver: Stuff,
    context: CommandContext,
    model: BuyModel,
  ): Promise<void> {
    const price = stock.priceFor(item.getTemplatePath() ?? "");
    if (price == null) {
      this.reject(giver, context, Mml.compose`${Mml.item(item)} isn't for sale.`, {
        kind: "controller-rejected",
        reason: "not-priced",
        detail: model.thing,
      });
      return;
    }
    const paid = await this.settleSale(
      stock.getTemplatePath(),
      price,
      [],
      price, // the whole price is the store's taxable revenue
      "a purchase",
    );
    if (!paid) {
      this.rejectBroke(giver, context, item, model);
      return;
    }
    this.handOver(item, giver);
    await ChattelApi.stamp(item, giver);
    this.announce(giver, item, paid);
  }

  /** Buy a consignment listing — settle the ask, split to the consignor,
   *  transfer the owner-stamp to the buyer. */
  private async buyListing(
    shelf: ConsignmentShelf,
    item: Stuff & Containable,
    stock: Stock | null,
    giver: Stuff,
    context: CommandContext,
    model: BuyModel,
  ): Promise<void> {
    const listing = MixinApi.isChattel(item)
      ? shelf.listingFor(item.getChattelId())
      : null;
    if (!listing) {
      this.reject(giver, context, Mml.compose`${Mml.item(item)} isn't for sale.`, {
        kind: "controller-rejected",
        reason: "no-listing",
        detail: model.thing,
      });
      return;
    }
    // Pay the authoritative current owner (the consignor — the stamp never
    // moved during consignment); refuse if they've since closed their account.
    // Only a `player` owner names a payable account; a good resolving to a
    // parcel/group owner falls back to the listing's recorded consignor.
    const owner = await ChattelApi.ownerOf(item);
    const consignorKey =
      owner?.kind === "player" ? owner.templatePath : listing.consignorKey;
    const consignorPrimary = await BankingApi.primaryAccountIdOf(consignorKey);
    if (!consignorPrimary) {
      this.reject(
        giver,
        context,
        Mml.compose`${Mml.item(item)} can't be sold right now.`,
        { kind: "controller-rejected", reason: "consignor-no-account", detail: model.thing },
      );
      return;
    }
    const ask = listing.askMinor;
    const commission = Math.round(ask * this.commissionRate());
    const remainder = ask - commission;
    const splits: RemittanceSplit[] =
      remainder > 0
        ? [
            {
              accountId: consignorPrimary,
              amount: Money.of(remainder, Currency.compact()),
              category: "consignment",
            },
          ]
        : [];
    const venuePath = stock?.getTemplatePath() ?? shelf.getTemplatePath();
    const paid = await this.settleSale(
      venuePath,
      ask,
      splits,
      commission, // only the commission is the store's taxable revenue
      "a purchase",
    );
    if (!paid) {
      this.rejectBroke(giver, context, item, model);
      return;
    }
    await ChattelApi.transfer(item, giver); // stamp → buyer
    this.handOver(item, giver); // custody → buyer
    if (MixinApi.isChattel(item)) shelf.removeListing(item.getChattelId());
    this.announce(giver, item, paid);
  }

  /**
   * Settle a sale to the store's Business account with optional splits, then
   * remit the demo tax on the store's taxable slice. Returns the scene tail,
   * or null when nothing clears (card then cash both fail / no account).
   */
  private async settleSale(
    venuePath: string | null,
    amount: number,
    splits: RemittanceSplit[],
    taxable: number,
    reason: string,
  ): Promise<string | null> {
    if (!venuePath) return null;
    const business = await EmploymentApi.ensureOperatorAt(venuePath);
    if (!business) return null;
    let account: string;
    try {
      // Custody is the business's authored banksAt (never a default).
      account = await EmploymentApi.operatingAccountOf(business);
    } catch {
      return null;
    }
    const charge: Charge = {
      amount: Money.of(amount, Currency.compact()),
      reason,
      presented: true,
      payeeAccountId: account,
      category: "sales",
      splits: splits.length > 0 ? splits : undefined,
    };
    let receipt;
    try {
      receipt = await BankingApi.settle(charge, { kind: "credential" });
    } catch {
      try {
        receipt = await BankingApi.settle(charge, { kind: "cash" });
      } catch {
        return null;
      }
    }
    if (taxable > 0) await BankingApi.remitDemoTax(account, Money.of(taxable, Currency.compact()));
    return receipt.corpoKey
      ? `(${Money.of(amount, Currency.compact()).render()}, ${receipt.corpoKey})`
      : `(${Money.of(amount, Currency.compact()).render()})`;
  }

  private commissionRate(): number {
    try {
      const raw = AppApi.setting(AppSettingKeys.retailConsignmentCommissionRate);
      const n = raw ? Number(raw) : NaN;
      return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.15;
    } catch {
      return 0.15;
    }
  }

  private handOver(item: Stuff & Containable, giver: Stuff): void {
    if (MixinApi.isContainer(giver)) {
      ContainmentApi.move(item, giver); // narrowed to Stuff & Container
    }
  }

  private announce(giver: Stuff, item: Stuff, paid: string): void {
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You buy ${Mml.item(item)}. ${paid}`)
      .toPeers(Mml.compose`${Mml.name(giver)} buys ${Mml.item(item)}.`)
      .send();
  }

  private rejectBroke(
    giver: Stuff,
    context: CommandContext,
    item: Stuff,
    model: BuyModel,
  ): void {
    this.reject(giver, context, Mml.compose`You can't cover ${Mml.item(item)} just now.`, {
      kind: "controller-rejected",
      reason: "insufficient-funds",
      detail: model.thing,
    });
  }

  private reject(
    giver: Stuff,
    context: CommandContext,
    line: ReturnType<typeof Mml.compose>,
    note: Parameters<CommandContext["note"]>[0],
  ): void {
    MessageApi.scene(giver).topic(TOPIC).toSelf(line).send();
    context.note(note);
  }
}
