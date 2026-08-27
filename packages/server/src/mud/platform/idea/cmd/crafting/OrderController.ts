/**
 * OrderController — `order <cocktail> [with <brand>]`.
 *
 * The customer side. Resolves the order off the present `Menu`, then has the
 * fulfilling bartender (a present `MakerMixin` agent, resolved inside
 * `CraftingLogic`) make it — the maker is **never** off the wire (the giver
 * here is the patron). The drink is handed to the patron.
 */

import { CraftController } from './CraftController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { CraftingApi } from '../../../../api/crafting';
import { ContainmentApi } from '../../../../api/containment';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import Menu from '../../../../lib/commerce/Menu';
import { BankingApi, Money } from '../../../../api/banking';
import type { Charge } from '../../../../api/banking';
import { EmploymentApi } from '../../../../api/employment';
import type { Attendant } from '../../../../lib/attendant/Attendant';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import { Currency } from "../../../../lib/banking/Currency";

const TOPIC = 'act.deed';

interface OrderModel extends CommandModel {
  cocktail: string;
  brand?: string;
}

export default class OrderController extends CraftController<OrderModel> {
  async execute(model: OrderModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const menu = Menu.resolveIn(context);
    if (!menu) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's nowhere to order from here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'cocktail', query: model.cocktail });
      return;
    }

    // Attendant: the bar runs the storefront-attention substrate. Being served
    // is gated on being attended — for the bar's scrum / zero-wait config this
    // is instant (the bartender gets to you), so behaviorally a no-op, but it
    // earns the lease (no idle hogging) and makes the bar run the same
    // subsystem the bank and ticket office do. A `closed` point (unstaffed +
    // close policy) refuses; the bar is self-service, so it won't.
    const point = this.resolveAttendantPoint(context);
    if (point) {
      const key = giver.getTemplatePath();
      if (key && point.requestAttention(key).status === 'closed') {
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`There's no one tending the bar just now.`)
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: 'unattended',
          detail: 'no one tending the bar',
        });
        return;
      }
    }

    const recipeId = await menu.resolveOrder(model.cocktail);
    if (!recipeId) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`"${model.cocktail}" isn't on the menu.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-on-menu',
        detail: model.cocktail,
      });
      return;
    }

    // Stand the venue's operator up BEFORE resolving the maker: the
    // Business is derived + stood up lazily (no standup hook), and its
    // on-shift conferral is what makes the present crafter an active
    // `MakerMixin` — a cold venue's first customer must find the roster
    // already on shift, not a no-maker decline.
    const venuePathForMaker = context.location?.getTemplatePath();
    if (venuePathForMaker) {
      await EmploymentApi.ensureOperatorAt(venuePathForMaker);
    }

    const outcome = await CraftingApi.craft({
      recipeRef: recipeId,
      makerMode: 'fulfilling-bartender',
      brand: model.brand,
    });
    if (!outcome.ok) {
      this.declineToScene(giver, outcome, context);
      return;
    }

    const drink = outcome.output;
    if (MixinApi.isContainable(drink) && MixinApi.isContainer(giver)) {
      ContainmentApi.move(drink, giver);
    }
    // The drink purchase: if the menu prices this recipe, settle a presented
    // Charge from the patron's credential (the bar prices it; silent pay from
    // the active account — the time-respect valve) and the bar remits demo
    // tax. Unpriced recipes are served free (backward-compatible). A failed
    // settlement still serves the drink (the bar eats it / runs a tab later).
    const price = menu.priceFor(recipeId);
    const paid = price != null ? await this.charge(menu, price, context) : null;

    const tail = paid ? ` ${paid}` : '';
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`${Mml.thing(drink)} is set down in front of you.${tail}`)
      .toPeers(Mml.compose`${Mml.actor(giver)} is served ${Mml.thing(drink)}.`)
      .send();
  }

  /** The Attendant service point present in the room, if the venue runs one. */
  private resolveAttendantPoint(
    context: CommandContext,
  ): (Stuff & Attendant) | null {
    const loc = context.location;
    if (!loc || !MixinApi.isContainer(loc)) return null;
    for (const s of (loc as Stuff & Container).getContents()) {
      if (MixinApi.isAttendant(s)) return s as Stuff & Attendant;
    }
    return null;
  }

  /**
   * Settle the drink's price as a presented Charge to the venue's account,
   * then remit the demo sales tax from it. Returns a short "you tap…" tail
   * for the scene, or null when there's no credential / venue account
   * (served free / on the house). The venue account is ensured lazily.
   */
  private async charge(
    menu: Menu,
    price: number,
    context: CommandContext
  ): Promise<string | null> {
    const venuePath = context.location?.getTemplatePath();
    if (!venuePath) return null;
    // Income keys on the Business account (the same account shift wages are
    // paid from), so the P&L reflects both sides. `ensureOperatorAt` stands the
    // venue's Business up lazily (derived from its `operatingLocations`) on
    // this first order; falls back to the venue path when none operates here.
    const business = await EmploymentApi.ensureOperatorAt(venuePath);
    if (!business) return null; // no operator → served on the house
    let venueAccount: string;
    try {
      // Custody is the business's authored banksAt (never a default).
      venueAccount = await EmploymentApi.operatingAccountOf(business);
    } catch {
      return null; // no authored bank → the venue can't take payment
    }
    const charge: Charge = {
      amount: Money.of(price, Currency.compact()),
      reason: 'a drink',
      presented: true,
      payeeAccountId: venueAccount,
      category: 'sales',
    };
    // Share-of-flow compensation rides the revenue settle as remittance
    // splits (the consignment-split primitive, nameable on an employment
    // arrangement). Empty for all shipped content — no authored Position
    // carries the basis — so this is byte-identical today.
    if (business) {
      const splits = await EmploymentApi.flowSplitsFor(business, price);
      if (splits.length > 0) charge.splits = splits;
    }
    // Try credential first, then cash (D12) — a coin-holder pays with coin
    // (banked on-ledger via the cash bridge to the venue account), and the
    // float stays the last resort (no funds at all). Both remit the demo tax.
    let receipt;
    try {
      receipt = await BankingApi.settle(charge, { kind: 'credential' });
    } catch {
      try {
        receipt = await BankingApi.settle(charge, { kind: 'cash' });
      } catch {
        return null; // no funds at all — the bar floats it
      }
    }
    await BankingApi.remitDemoTax(venueAccount, Money.of(price, Currency.compact()));
    return receipt.corpoKey
      ? `(${Money.of(price, Currency.compact()).render()}, ${receipt.corpoKey})`
      : `(${Money.of(price, Currency.compact()).render()})`;
  }
}
