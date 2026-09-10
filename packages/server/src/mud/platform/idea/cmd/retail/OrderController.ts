/**
 * OrderController — `order <cocktail> [with <brand>]`.
 *
 * The customer side. Resolves the order off the present `Menu`, then has the
 * fulfilling bartender (a present `MakerMixin` agent, resolved inside
 * `CraftingLogic`) make it — the maker is **never** off the wire (the giver
 * here is the patron). The drink is handed to the patron.
 */

import { CraftController } from '../crafting/CraftController';
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
import Tariff, { type ServiceKind } from '../../../thing/Tariff';
import { MqlApi } from '../../../../api/mql';
import { ConditionApi } from '../../../../api/condition';
import { TemplatePaths } from '../../../../lib/paths';
import { TRAUMA_BEHAVIOR } from '../../Condition';
import type { Trauma, AfflictionRecord } from '../../Condition';
import type { Vitals } from '../../../../lib/vitals/Vitals';

const TOPIC = 'act.deed';

interface OrderModel extends CommandModel {
  cocktail: string;
  brand?: string;
}

const SERVICE_TOPIC = 'act.service';
/** Half of `recovering`'s `atStage` — what a paid revival buys you. */
const HALF_RECOVERY_STAGE = 6;
/** What a grave looks like from the outside, for the burial arm. */
const GRAVE_KEYWORDS = /\bgrave\b|\bplot\b|\bcrypt\b|\bniche\b/i;

export default class OrderController extends CraftController<OrderModel> {
  async execute(model: OrderModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // ⭐⭐ **The service branch.** A `Tariff` in the room prices things
    // that are DONE to what you already have — a repair, a revival, a
    // burial — which neither a `Menu` (recipes) nor a `Stock` counter
    // (items) can express. Before this no shipped priced key resolved to
    // anything but a recipe or a stock line, so the wreckage a fight
    // leaves could not become anybody's paid work.
    const tariff = Tariff.resolveIn(context);
    if (tariff) {
      // ⚠ The service key is the FIRST word and the subject is the rest.
      // `cocktail` is greedy (menu names are multi-word — "Old
      // fashioned"), and a greedy arg cannot be followed by a bare one,
      // so a separate `subject` arg is unparseable. Splitting here costs
      // nothing and keeps `order repair my sword` reading the way
      // somebody would say it.
      const raw = (model.cocktail ?? '').trim();
      const key = (raw.split(/\s+/)[0] ?? '').toLowerCase();
      const subjectRaw = raw.slice(key.length).trim();
      const kind = tariff.serviceFor(key);
      if (kind) return this.doService(tariff, key, kind, subjectRaw, context);
      // A tariff is present but this is not one of its services — fall
      // through to the menu path, so a venue can carry both.
    }

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
      const key = giver.getIdentityPath();
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

  /**
   * ⭐⭐ **Perform one priced service, then collect for it.**
   *
   * The orchestration lives here — in the kernel, keyed by a closed
   * vocabulary — precisely so a venue is rows. A clinic that could define
   * its own service kinds would need pack code, and then a second clinic
   * would need pack code too, which is the second-instance test failing.
   *
   * ⚠ **The customer is the one who asks.** `BankingLogic.settle` derives
   * the payer from execution context and takes no payer parameter, so a
   * service is BOUGHT (`order revive`) rather than billed to a bystander
   * mid-`treat`. That is a real constraint and the right one: letting a
   * player initiate a debit against another player is a consent question
   * far larger than a priced clinic.
   */
  private async doService(
    tariff: Tariff,
    key: string,
    kind: ServiceKind,
    subjectRaw: string,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver;
    // Stand the operator up first — the same lazy standup an order does,
    // so a cold venue's first customer finds a roster rather than a
    // decline.
    const venuePath = context.location?.getTemplatePath();
    if (venuePath) await EmploymentApi.ensureOperatorAt(venuePath);

    const done = await this.performService(kind, subjectRaw, context);
    if (!done.ok) {
      MessageApi.scene(giver)
        .topic(SERVICE_TOPIC)
        .toSelf(Mml.fromMarkup(Mml.escape(done.detail)))
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: done.reason,
        detail: done.detail,
      });
      return;
    }
    const collected = await tariff.collect(key, `a ${kind}`);
    const tail = collected.note ? ` ${collected.note}` : '';
    MessageApi.scene(giver)
      .topic(SERVICE_TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(`${done.detail}${tail}`)))
      .toPeers(Mml.compose`${Mml.actor(giver)} is seen to.`)
      .send();
  }

  /** Do the thing. Each arm is an existing capability, wired to a price. */
  private async performService(
    kind: ServiceKind,
    subjectRaw: string,
    context: CommandContext,
  ): Promise<
    { ok: true; detail: string } | { ok: false; reason: string; detail: string }
  > {
    const giver = context.commandGiver;
    switch (kind) {
      case 'repair': {
        const item = this.resolveSubject(subjectRaw, context);
        if (!item) {
          return {
            ok: false,
            reason: 'no-subject',
            detail: 'Name the thing you want mended.',
          };
        }
        const outcome = await CraftingApi.repair({ item });
        return outcome.ok
          ? { ok: true, detail: `${item.getPresentation()} is made good.` }
          : {
              ok: false,
              reason: outcome.reason ?? 'repair-failed',
              detail: outcome.detail ?? 'It cannot be mended here.',
            };
      }
      case 'treatment': {
        // ⭐ The clinic's product: the house treats what is wrong with
        // you. The customer and the patient are the SAME body, which is
        // the only shape the payer rule allows — `settle` bills the
        // acting principal, so a service is bought by whoever asks.
        //
        // What the house supplies is the thing the condition wants
        // (`resolution.by`) — that is what you are paying for. It is not
        // a cure-all: it resolves ONE condition, the worst it can reach,
        // exactly as a `treat` would.
        if (!MixinApi.isVitals(giver)) {
          return {
            ok: false,
            reason: 'not-a-body',
            detail: 'There is nothing here to treat.',
          };
        }
        const treated = this.treatWorst(giver);
        return treated
          ? { ok: true, detail: `They see to ${treated}.` }
          : {
              ok: false,
              reason: 'nothing-to-treat',
              detail: 'You are sound enough. They send you on your way.',
            };
      }
      case 'burial': {
        const body = this.resolveSubject(subjectRaw, context);
        if (!body || !MixinApi.isPostmortem(body)) {
          return {
            ok: false,
            reason: 'not-a-body',
            detail: 'Name the body to be laid to rest.',
          };
        }
        const grave = this.findGrave(context);
        if (!grave) {
          return {
            ok: false,
            reason: 'no-grave',
            detail: 'There is nowhere here to lay them.',
          };
        }
        const interred = body.interIn(grave);
        return interred
          ? { ok: true, detail: `${body.getPresentation()} is laid to rest.` }
          : {
              ok: false,
              reason: 'burial-refused',
              detail: 'They cannot be laid there.',
            };
      }
    }
  }

  /**
   * ⭐ Resolve ONE condition on this body — the worst the house can
   * actually do something about — by supplying what that condition
   * declares it wants. The clinic has the dressing, the water and the
   * hands; what you buy is that it has them.
   *
   * Returns a short phrase for the scene, or null when there is nothing
   * it can reach.
   */
  private treatWorst(body: Stuff & Vitals): string | null {
    const conditions = [...body.getConditions()];
    const traumas = conditions
      .filter((c): c is Trauma => c.kind === 'trauma')
      .filter((t) => !t.dressed && t.severity > 0)
      .filter((t) => TRAUMA_BEHAVIOR[t.type]?.resolution === 'dressing')
      .sort((a, b) => b.severity - a.severity);
    const worst = traumas[0];
    if (worst) {
      TRAUMA_BEHAVIOR[worst.type].resolve(body, worst);
      return `the ${worst.type}`;
    }
    // Then an illness — the load knock a competent hand is worth.
    const ill = conditions
      .filter((c): c is AfflictionRecord => c.kind === 'affliction')
      .filter((a) => (a.pathogenLoad ?? 0) > 0)
      .sort((a, b) => (b.pathogenLoad ?? 0) - (a.pathogenLoad ?? 0))[0];
    if (ill) {
      ill.pathogenLoad = Math.max(0, (ill.pathogenLoad ?? 0) * 0.4);
      if (ill.pathogenLoad <= 0.01) body.relieve(ill);
      return 'the fever';
    }
    return null;
  }

  /** Resolve what the service acts on, from the tail of the phrase. */
  private resolveSubject(raw: string, context: CommandContext): Stuff | null {
    if (!raw) return null;
    return (
      MqlApi.resolveMany(raw, {
        commandGiver: context.commandGiver,
        scope: 'reachable',
      }).stuff[0] ?? null
    );
  }

  /** The first grave-shaped container in the room. */
  private findGrave(context: CommandContext): (Stuff & Container) | null {
    const loc = context.location;
    if (!loc || !MixinApi.isContainer(loc)) return null;
    for (const s of (loc as Stuff & Container).getContents()) {
      const occ = s as unknown as Stuff;
      if (MixinApi.isContainer(occ) && GRAVE_KEYWORDS.test(occ.getPresentation())) {
        return occ as Stuff & Container;
      }
    }
    return null;
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
