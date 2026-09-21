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
 *
 * ⭐ **The wallet's active account is the principal you trade as.** The
 * receipt's routing account resolves to an owner key; when that key is a
 * live Business (a purchasing holder ran `wallet use house`), the good is
 * stamped to **the business**, and the charge is the business's `purchases`
 * line. A personal account stamps the buyer, exactly as before. No `--for`:
 * the wallet says whom you buy for.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import Stock from "../../../thing/Stock";
import ConsignmentShelf, { type ShelfStuff } from "../../../thing/ConsignmentShelf";
import { ContainmentApi } from "../../../../api/containment";
import { MixinApi } from "../../../../api/mixin";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { ChattelApi } from "../../../../api/chattel";
import { Currency, BankingApi, Money } from "../../../../api/banking";
import type { Charge, RemittanceSplit, SettlementReceipt } from "../../../../api/banking";
import { StuffApi } from "../../../../api/stuff";
import { EmploymentApi } from "../../../../api/employment";
import { AppApi } from "../../../../api/app";
import { AppSettingKeys } from "../../../../lib/config/AppSettings";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { Containable } from "../../../../lib/spatial/Containable";
import type { MqlOneResult } from '../../../../api/mql';

const TOPIC = "act.deed";

interface BuyModel extends CommandModel {
  /** Where you are buying from — bound by the view, `from`-addressable. */
  counter?: MqlOneResult;
  thing: string;
}

export default class BuyController extends CommandController<BuyModel> {
  async execute(model: BuyModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    // ⭐ Bound by the view (`buy.yaml` § counter), not hunted for here.
    // One counter can be both the house's shelf and a brokerage, so the
    // single resolved object is narrowed into the two roles it plays.
    const counter = model.counter?.stuff ?? null;
    const stock = counter instanceof Stock ? counter : null;
    const shelf =
      counter && MixinApi.isConsignmentShelf(counter)
        ? (counter as ShelfStuff)
        : null;
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
      const key = giver.getIdentityPath();
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

    // One counter can be both the house's shelf and a brokerage (`Stock`
    // composes the shelf): a good that carries a live listing is a
    // consignment wherever it sits, never a priced stock line.
    const candidate = stock?.resolveBuy(model.thing) ?? null;
    const listed =
      candidate && shelf && MixinApi.isChattel(candidate)
        ? shelf.listingFor(candidate.getChattelId()) !== null
        : false;
    const stockItem = candidate && !listed ? candidate : null;
    const listItem = listed
      ? candidate
      : stockItem
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
      this.reject(giver, context, Mml.compose`${Mml.thing(item)} isn't for sale.`, {
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
    const owner = await this.buyerOf(giver, paid.receipt);
    if (MixinApi.isChattel(item)) await item.stampChattel(owner);
    this.announce(giver, item, paid.tail, owner);
  }

  /**
   * Whom the purchase is for: the live Business whose operating account
   * the receipt routed from, else the giver. Cash always buys personally.
   */
  private async buyerOf(giver: Stuff, receipt: SettlementReceipt): Promise<Stuff> {
    if (receipt.method !== "credential" || !receipt.accountId) return giver;
    const ownerKey = await BankingApi.ownerKeyOf(receipt.accountId);
    if (!ownerKey || ownerKey === giver.getIdentityPath()) return giver;
    const live = StuffApi.findByTemplatePath(ownerKey);
    return live && MixinApi.isBusiness(live) ? live : giver;
  }

  /** Buy a consignment listing — settle the ask, split to the consignor,
   *  transfer the owner-stamp to the buyer. */
  private async buyListing(
    shelf: ShelfStuff,
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
      this.reject(giver, context, Mml.compose`${Mml.thing(item)} isn't for sale.`, {
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
    const owner = MixinApi.isChattel(item)
      ? await item.chattelOwner()
      : null;
    const consignorKey =
      owner?.kind === "player" || owner?.kind === "organization"
        ? owner.templatePath
        : listing.consignorKey;
    const consignorPrimary = await BankingApi.primaryAccountIdOf(consignorKey);
    if (!consignorPrimary) {
      this.reject(
        giver,
        context,
        Mml.compose`${Mml.thing(item)} can't be sold right now.`,
        { kind: "controller-rejected", reason: "consignor-no-account", detail: model.thing },
      );
      return;
    }
    const venuePath = stock?.getTemplatePath() ?? shelf.getTemplatePath();
    let paid: { tail: string; receipt: SettlementReceipt } | null;
    if (listing.basis === "terms" && stock) {
      // ⭐ Rung 0 — supplier terms (economic bootstrap D11): the buyer pays
      // the SHOP'S ask in full (the shop's sale, its taxable revenue); the
      // shop then pays the supplier what it is owed — a second, conserving
      // post, kind `payment`, category `terms` (the shop's P&L reads it as
      // cogs, the supplier's as sales; the ladder's rung-1 gate counts it).
      // Two posts, one command — the `remitDemoTax` precedent.
      const ask = stock.priceFor(item.getTemplatePath() ?? "") ?? listing.askMinor;
      paid = await this.settleSale(venuePath, ask, [], ask, "a purchase");
      if (!paid) {
        this.rejectBroke(giver, context, item, model);
        return;
      }
      await this.settleTerms(venuePath, consignorPrimary, listing.askMinor, item);
    } else {
      const ask = listing.askMinor;
      const commission = Math.round(ask * this.commissionRate());
      const remainder = ask - commission;
      const splits: RemittanceSplit[] =
        remainder > 0
          ? [
              {
                accountId: consignorPrimary,
                amount: Money.of(remainder, BankingApi.compactCurrency()),
                category: "consignment",
              },
            ]
          : [];
      paid = await this.settleSale(
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
    }
    const buyer = await this.buyerOf(giver, paid.receipt);
    if (MixinApi.isChattel(item)) {
      await item.transferChattel(buyer); // stamp → buyer (or their house)
    }
    this.handOver(item, giver); // custody → buyer
    if (MixinApi.isChattel(item)) shelf.removeListing(item.getChattelId());
    this.announce(giver, item, paid.tail, buyer);
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
  ): Promise<{ tail: string; receipt: SettlementReceipt } | null> {
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
      amount: Money.of(amount, BankingApi.compactCurrency()),
      reason,
      presented: true,
      payeeAccountId: account,
      category: "sales",
      splits: splits.length > 0 ? splits : undefined,
    };
    let receipt: SettlementReceipt;
    try {
      receipt = await BankingApi.settle(charge, { kind: "credential" });
    } catch {
      try {
        receipt = await BankingApi.settle(charge, { kind: "cash" });
      } catch {
        return null;
      }
    }
    if (taxable > 0) await BankingApi.remitDemoTax(account, Money.of(taxable, BankingApi.compactCurrency()));
    const tail = receipt.corpoKey
      ? `(${Money.of(amount, BankingApi.compactCurrency()).render()}, ${receipt.corpoKey})`
      : `(${Money.of(amount, BankingApi.compactCurrency()).render()})`;
    return { tail, receipt };
  }

  /**
   * The shop pays its supplier for a terms good that just sold: one
   * `payment` leg, the shop's account → the supplier's primary, category
   * `terms` (economic bootstrap D11). Posted as the SHOP (the house is the
   * payer — the buyer's transaction already cleared), so it rides the
   * house's own balance and the floor; a shop that cannot cover what it
   * owes keeps the debt on its book (`house book` lists it) rather than
   * failing the sale that funds it.
   */
  private async settleTerms(
    venuePath: string | null,
    supplierAccountId: string,
    owedMinor: number,
    item: Stuff,
  ): Promise<void> {
    if (!venuePath || owedMinor <= 0) return;
    const business = await EmploymentApi.ensureOperatorAt(venuePath);
    if (!business) return;
    try {
      const account = await EmploymentApi.operatingAccountOf(business);
      await BankingApi.payTerms(
        account,
        supplierAccountId,
        Money.of(owedMinor, BankingApi.compactCurrency()),
        `terms: ${item.getPresentation()}`,
      );
    } catch (err) {
      console.warn(
        `BuyController: the house could not pay its supplier's terms — ${String(err instanceof Error ? err.message : err)}`,
      );
    }
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

  private announce(giver: Stuff, item: Stuff, paid: string, owner: Stuff): void {
    const forHouse = owner === giver ? "" : ` for ${owner.getPresentation()}`;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You buy ${Mml.thing(item)}${forHouse}. ${paid}`)
      .toPeers(Mml.compose`${Mml.actor(giver)} buys ${Mml.thing(item)}${forHouse}.`)
      .send();
  }

  private rejectBroke(
    giver: Stuff,
    context: CommandContext,
    item: Stuff,
    model: BuyModel,
  ): void {
    this.reject(giver, context, Mml.compose`You can't cover ${item.getPresentation()} just now.`, {
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
