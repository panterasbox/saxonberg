/**
 * OrderController — `order <cocktail> [with <brand>]`.
 *
 * The customer side. Resolves the order off the present `Menu`, then has the
 * fulfilling bartender (a present on-shift `fulfills` holder, resolved inside
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
import { EmploymentApi } from '../../../../api/employment';
import { ConditionApi } from '../../../../api/condition';
import { SchedulerApi } from '../../../../api/scheduler';
import { ManualBuildStep } from '../../../../lib/craft/ManualBuildStep';
import { BLOOD_DEFAULTS } from '../../../../lib/vitals/Blood';
import type { Attendant } from '../../../../lib/attendant/Attendant';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import Tariff, { type ServiceKind } from '../../../thing/Tariff';
import { MqlApi, type MqlOneResult } from '../../../../api/mql';

const TOPIC = 'act.deed';

interface OrderModel extends CommandModel {
  /** The tariff board — bound by the view, `from`-addressable. */
  counter?: MqlOneResult;
  /** The recipe menu — bound by the view, `off`-addressable. */
  menu?: MqlOneResult;
  cocktail: string;
  brand?: string;
}

const SERVICE_TOPIC = 'act.service';
/** What a grave looks like from the outside, for the burial arm. */
const GRAVE_KEYWORDS = /\bgrave\b|\bplot\b|\bcrypt\b|\bniche\b/i;

/**
 * ⭐ The resolution tokens a fully-stocked clinic can supply (D5) — a
 * bandage, a splint, a surgeon's kit, water, a fire. `rest` (a bruise
 * wants time) is deliberately absent: the house cannot sell you time.
 */
const CLINIC_SUPPLIES = new Set([
  'dressing',
  'setting',
  'surgery',
  'fluid',
  'warmth',
  'rinsing',
]);
/** A staffed clinic treats competently — a middling-to-good article. */
const CLINIC_EFFICACY = 0.7;

export default class OrderController extends CraftController<OrderModel> {
  async execute(model: OrderModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // ⭐⭐ **The service branch.** A `Tariff` in the room prices things
    // that are DONE to what you already have — a repair, a revival, a
    // burial — which neither a `Menu` (recipes) nor a `Stock` counter
    // (items) can express. Before this no shipped priced key resolved to
    // anything but a recipe or a stock line, so the wreckage a fight
    // leaves could not become anybody's paid work.
    // ⭐ Bound by the view, not hunted for here.
    // ⭐ Bound by the view, not hunted for here.
    // ⚠ The service key is the FIRST word and the subject is the rest.
    // `cocktail` is greedy (menu names are multi-word — "Old fashioned"),
    // and a greedy arg cannot be followed by a bare one, so a separate
    // `subject` arg is unparseable. Splitting here costs nothing and keeps
    // `order repair my sword` reading the way somebody would say it.
    const raw = (model.cocktail ?? '').trim();
    const key = (raw.split(/\s+/)[0] ?? '').toLowerCase();
    const subjectRaw = raw.slice(key.length).trim();
    let tariff = (model.counter?.stuff ?? null) as Tariff | null;
    let kind: ServiceKind | null = tariff ? tariff.serviceFor(key) : null;
    // ⭐ Two houses in one room (blood build D6): the view binds ONE
    // reachable Tariff; if it does not price this key, scan every reachable
    // Tariff for one that does before falling through to the menu. This is
    // what lets the practice's slate and the blood window's board share the
    // ward.
    if (!kind && key) {
      for (const t of this.reachableTariffs(context)) {
        const k = t.serviceFor(key);
        if (k) {
          tariff = t;
          kind = k;
          break;
        }
      }
    }
    if (tariff && kind) {
      return this.doService(tariff, key, kind, subjectRaw, context);
    }

    const menu = (model.menu?.stuff ?? null) as Menu | null;
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
    // its `fulfills` seat — a cold venue's first customer must find the roster
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
    // The drink purchase: if the menu prices this recipe, the venue takes
    // payment through the one settle-a-sale path (credential → cash; the
    // bar remits the demo tax). Unpriced recipes are served free
    // (backward-compatible). A failed settlement still serves the drink
    // (the bar eats it / runs a tab later).
    const price = menu.priceFor(recipeId);
    const venuePath = context.location?.getTemplatePath() ?? null;
    const paid =
      price != null
        ? await EmploymentApi.settleSale(venuePath, price, price, 'a drink')
        : null;

    const tail = paid ? ` ${paid.tail}` : '';
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

    // ⭐ A transfusion costs the patient the SAME game-time whether they do
    // it themselves (`transfuse`, a 45s engaged step) or pay the window —
    // the blood runs in at the same rate, so paying must not buy out of the
    // body-time. It is durative on the CUSTOMER (it is their body), and the
    // take + fee land at completion; a barge-in gives and charges nothing.
    if (kind === 'transfusion') {
      return this.doTransfusionService(tariff, key, context);
    }

    const done = await this.performService(tariff, kind, subjectRaw, context);
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

  /**
   * ⭐ The blood window's product (blood build D6), made durative (the
   * time-as-expense pass): the house transfuses the customer from its own
   * bank over `TRANSFUSE_DURATION_S`, engaging the CUSTOMER (it is their
   * body — customer and patient are the same, the payer rule's only legal
   * shape). The bank owns the act (the shelf + the ABO system); we check a
   * match up front (so a no-match refuses at once, not after the wait),
   * resolve who issued it (the custody deed), run the step, then take +
   * give + collect at completion. A barge-in gives and charges nothing.
   */
  private async doTransfusionService(
    tariff: Tariff,
    key: string,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isDonationBank(tariff)) {
      return this.serviceFail(context, 'This house keeps no blood bank.', 'no-bank');
    }
    if (!MixinApi.isVitals(giver)) {
      return this.serviceFail(context, 'There is nothing here to transfuse.', 'not-a-body');
    }
    // Up-front refusal: do not make a patient sit for 45s to be told no.
    if (!tariff.hasCompatibleUnitFor(giver as unknown as Stuff)) {
      return this.serviceFail(context, 'Nothing on the shelf will match you.', 'no-compatible-unit');
    }
    const issuer = this.resolveWindowIssuer(tariff, context);
    const effect = async (): Promise<void> => {
      const outcome = await tariff.transfuseInto(giver as unknown as Stuff, issuer);
      if (!outcome) {
        // The last match went while they waited — honest, and unbilled.
        return this.serviceFail(context, 'Nothing on the shelf will match you.', 'no-compatible-unit');
      }
      const collected = await tariff.collect(key, 'a transfusion');
      const tail = collected.note ? ` ${collected.note}` : '';
      const line =
        outcome.reaction > 0
          ? 'The transfusion runs — but it does not match, and your body turns against it.'
          : 'The transfusion runs; your colour comes back.';
      MessageApi.scene(giver)
        .topic(SERVICE_TOPIC)
        .toSelf(Mml.fromMarkup(Mml.escape(`${line}${tail}`)))
        .toPeers(Mml.compose`${Mml.actor(giver)} is seen to.`)
        .send();
    };

    // Not an engageable body (a bare test/NPC body) → run it at once.
    if (!MixinApi.isEngaged(giver)) {
      await effect();
      return;
    }
    const step = new ManualBuildStep({
      actor: giver,
      slots: ['hands'],
      durationMs: BLOOD_DEFAULTS.TRANSFUSE_DURATION_S * 1000,
      onComplete: () => {
        void effect();
      },
      onAbort: () => {},
    });
    const result = SchedulerApi.start(step);
    if (result.ok && (result.status === 'started' || result.status === 'replaced')) {
      context.note(result.note);
      MessageApi.scene(giver)
        .topic(SERVICE_TOPIC)
        .toSelf(Mml.compose`You settle in; the line goes in and the unit begins to run. Hold still.`)
        .toPeers(Mml.compose`${Mml.actor(giver)} settles in for a transfusion.`)
        .send();
      return;
    }
    if (result.ok && result.status === 'completed-sync') return;
    MessageApi.scene(giver)
      .topic(SERVICE_TOPIC)
      .toSelf(Mml.compose`You cannot sit for it just now.`)
      .send();
    context.note({ kind: 'controller-rejected', reason: 'engagement-conflict', detail: 'busy' });
  }

  /** A refused service: the scene line + the matching rejected note. */
  private serviceFail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(SERVICE_TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: line });
  }

  /** Do the thing. Each arm is an existing capability, wired to a price. */
  private async performService(
    tariff: Tariff,
    kind: Exclude<ServiceKind, 'transfusion'>,
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
        const treated = ConditionApi.treatWorstResolvable(
          giver,
          CLINIC_SUPPLIES,
          CLINIC_EFFICACY,
        );
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

  /** Every priced Tariff the giver can reach — the two-houses scan (D6). */
  private reachableTariffs(context: CommandContext): Tariff[] {
    const giver = context.commandGiver;
    // ⚠ The seed is `reachable:` — a bare `[class.Tariff]` is a filter with
    // no set to filter and throws "cannot start a chain" (found by the live
    // drive; the two-houses scan had never been exercised by one).
    const found = MqlApi.resolveMany('reachable:[class.Tariff]', {
      commandGiver: giver,
      scope: 'reachable',
    }).stuff;
    return found.filter((s) => MixinApi.isPricedOffer(s)) as unknown as Tariff[];
  }

  /**
   * The on-shift person who runs this window, for the custody deed (D16).
   * Best-effort: the fixture's operating Business, an employee of it
   * present in the room. Null → the recipient's deed stands alone (an
   * institutional issue; a Business keeps no chronicle).
   */
  private resolveWindowIssuer(
    tariff: Tariff,
    context: CommandContext,
  ): Stuff | null {
    const self = tariff as unknown as Stuff;
    const path = self.getIdentityPath() ?? self.getTemplatePath();
    const business = path ? EmploymentApi.businessAt(path) : null;
    const orgPath = business?.getTemplatePath();
    const loc = context.location;
    if (!orgPath || !loc || !MixinApi.isContainer(loc)) return null;
    const ids = new Set(EmploymentApi.employeesOf(orgPath));
    for (const s of (loc as Stuff & Container).getContents()) {
      const occ = s as unknown as Stuff;
      const id = occ.getIdentityPath();
      if (id && ids.has(id)) return occ;
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
}
