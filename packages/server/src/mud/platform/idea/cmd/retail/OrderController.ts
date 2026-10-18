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
import { CraftingApi, NOBODY_TO_WORK, type Fault } from '../../../../api/crafting';
import { BankingApi } from '../../../../api/banking';
import { GrammarApi } from '../../../../api/grammar';
import { Money } from '../../../../lib/banking/Money';
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
import Tariff, { type ServiceKind, type QuoteRequestLine } from '../../../thing/Tariff';
import { MqlApi, type MqlOneResult } from '../../../../api/mql';
import { CompetenceBand } from '../../../../lib/advancement/CompetenceBand';
import { WashPolicy } from '../../../../lib/cleanliness/WashPolicy';
import { TemplatePaths } from '../../../../lib/paths';
import { StuffApi } from '../../../../api/stuff';
import { BulkableApi } from '../../../../api/bulk';
import Garment from '../../../thing/equipment/Garment';
import type CleanserCatalogue from '../../CleanserCatalogue';
import type { WashCleanser } from '../../../../lib/cleanliness/Soilable';

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
    // ⭐ A bath is durative on the CUSTOMER, as a transfusion is: the
    // water runs at its own rate, and paying does not buy out of the time.
    if (kind === 'bath') {
      return this.doBathService(tariff, key, context);
    }

    const done = await this.performService(tariff, key, kind, subjectRaw, context);
    if (done.ok && done.declined) {
      MessageApi.scene(giver)
        .topic(SERVICE_TOPIC)
        .toSelf(Mml.fromMarkup(Mml.escape(done.detail)))
        .send();
      context.note({ kind: 'controller-rejected', reason: 'declined', detail: done.detail });
      return;
    }
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
    // ⭐ ONE settlement for every arm (repair P1): a computed charge (a
    // quote by diagnosis) when the arm made one, else the row's price.
    const collected =
      done.charge !== undefined
        ? await tariff.collectMinor(done.charge, `a ${kind}`)
        : await tariff.collect(key, `a ${kind}`);
    // ⭐ The hand is paid by the seat's basis (repair D12): a piece-rate
    // seat is paid for this piece, out of the house the fee just went to;
    // a time-wage seat is paid by the shift and is not paid twice.
    if (collected.paid && done.hand) await OrderController.payPiecework(tariff, done.hand);
    const tail = collected.note ? ` ${collected.note}` : '';
    MessageApi.scene(giver)
      .topic(SERVICE_TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(`${done.detail}${tail}`)))
      .toPeers(Mml.compose`${Mml.actor(giver)} is seen to.`)
      .send();
    if (done.after) await done.after();
  }

  /** Pay a piece-rate hand for one piece, out of the offer's house. */
  private static async payPiecework(tariff: Tariff, hand: Stuff): Promise<void> {
    const house = await tariff.house();
    const key = hand.getIdentityPath();
    if (!house || !key || !MixinApi.isEmployed(hand)) return;
    const housePath = house.getOrganizationPath();
    const job = hand
      .getActiveEmployments()
      .find((e) => e.organizationPath === housePath);
    if (!job || house.getPosition(job.positionKey)?.basis() !== 'per-settlement') return;
    try {
      await EmploymentApi.settlePiecework(house, key, 1);
    } catch (err) {
      console.warn('OrderController: piecework not paid:', err);
    }
  }

  /**
   * ⭐ ONE durative service (cleanliness D26): the customer's body is
   * engaged for `durationMs` — a transfusion, a bath — and `effect` lands
   * at completion. A barge-in gives and charges nothing. A body that cannot
   * be engaged (a bare test body) runs it at once.
   */
  private runDurativeService(
    context: CommandContext,
    durationMs: number,
    begin: { self: string; peers: string },
    effect: () => Promise<void>,
  ): void {
    const giver = context.commandGiver;
    if (!MixinApi.isEngaged(giver)) {
      void effect();
      return;
    }
    const step = new ManualBuildStep({
      actor: giver,
      slots: ['hands'],
      durationMs,
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
        .toSelf(Mml.fromMarkup(Mml.escape(begin.self)))
        .toPeers(Mml.fromMarkup(Mml.escape(begin.peers)))
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
      return OrderController.serviceFail(context, 'This house keeps no blood bank.', 'no-bank');
    }
    if (!MixinApi.isVitals(giver)) {
      return OrderController.serviceFail(context, 'There is nothing here to transfuse.', 'not-a-body');
    }
    // Up-front refusal: do not make a patient sit for 45s to be told no.
    if (!tariff.hasCompatibleUnitFor(giver as unknown as Stuff)) {
      return OrderController.serviceFail(context, 'Nothing on the shelf will match you.', 'no-compatible-unit');
    }
    const issuer = this.resolveWindowIssuer(tariff, context);
    const effect = async (): Promise<void> => {
      const outcome = await tariff.transfuseInto(giver as unknown as Stuff, issuer);
      if (!outcome) {
        // The last match went while they waited — honest, and unbilled.
        return OrderController.serviceFail(context, 'Nothing on the shelf will match you.', 'no-compatible-unit');
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

    this.runDurativeService(
      context,
      BLOOD_DEFAULTS.TRANSFUSE_DURATION_S * 1000,
      {
        self: 'You settle in; the line goes in and the unit begins to run. Hold still.',
        peers: `${giver.getPresentation()} settles in for a transfusion.`,
      },
      effect,
    );
  }

  /** A refused service: the scene line + the matching rejected note. */
  private static serviceFail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(SERVICE_TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: line });
  }

  /** Do the thing. Each arm is an existing capability, wired to a price. */
  private async performService(
    tariff: Tariff,
    key: string,
    kind: Exclude<ServiceKind, 'transfusion' | 'bath'>,
    subjectRaw: string,
    context: CommandContext,
  ): Promise<ServiceResult> {
    const giver = context.commandGiver;
    switch (kind) {
      case 'wash':
        return this.washService(tariff, key, subjectRaw, context);
      case 'repair':
        return this.repairService(tariff, subjectRaw, context);
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

  /**
   * ⭐⭐ The paid mend is somebody's WORK (repair D12): the on-shift hand
   * looks it over, names each fault and its price BEFORE any money is
   * taken, the customer says yes or no, and the hand mends it at THEIR
   * band — their name on the mend, their wage for the piece. Nobody on
   * shift is a refusal in words, never a free repair; a quote the customer
   * cannot pay is refused before the work, not done on the house.
   */
  private async repairService(
    tariff: Tariff,
    subjectRaw: string,
    context: CommandContext,
  ): Promise<ServiceResult> {
    const giver = context.commandGiver;
    const item = this.resolveSubject(subjectRaw, context);
    if (!item) {
      return { ok: false, reason: 'no-subject', detail: 'Name the thing you want mended.' };
    }
    const hand = await CraftingApi.fulfillingHand(giver, tariff);
    if (!hand) return { ok: false, reason: 'no-hand', detail: NOBODY_TO_WORK };
    const look = await CraftingApi.diagnose({ item, hand });
    if (!look.ok) {
      return { ok: false, reason: look.reason, detail: 'It cannot be mended here.' };
    }
    const who = hand.getPresentation() ?? 'They';
    const mendable = look.faults.filter((f) => f.mendable);
    const said = look.faults.map((f) => faultSentence(f));
    if (mendable.length === 0) {
      const body = said.length > 0 ? said.join(' ') : 'There is nothing wrong with it.';
      return {
        ok: false,
        reason: said.length > 0 ? 'nothing-mendable' : 'nothing-to-repair',
        detail: `${who} looks it over. ${body}`,
      };
    }
    const quote = tariff.quoteFor(mendable.map(quoteLine));
    // "The head is worn — 5 zorkmids." — the price inside the sentence.
    const priced = quote.lines.map((l, i) => {
      const said = faultSentence(mendable[i]!);
      return l.price !== null ? `${said.replace(/\.$/, '')} — ${money(l.price)}.` : said;
    });
    const unmended = look.faults.filter((f) => !f.mendable).map((f) => faultSentence(f));
    const lot = quote.total > 0 ? ` ${GrammarApi.cap(money(quote.total))} for the lot.` : '';
    MessageApi.scene(giver)
      .topic(SERVICE_TOPIC)
      .toSelf(
        Mml.fromMarkup(
          Mml.escape(`${who} looks it over. ${[...priced, ...unmended].join(' ')}${lot}`),
        ),
      )
      .send();
    if (!tariff.canSettle(quote.total)) {
      return { ok: false, reason: 'cannot-pay', detail: "You haven't the money for that." };
    }
    // No interactive (a scripted caller) answers no: money is never taken
    // on a question nobody was asked.
    const yes = context.interactive
      ? await context.interactive
          .promptConfirm(`Have it done for ${money(quote.total)}?`, 'no')
          .catch(() => false)
      : false;
    if (!yes) return { ok: true, declined: true, detail: 'You keep your coin, and it stays as it is.' };
    const outcome = await CraftingApi.repair({ item, hand });
    if (!outcome.ok) {
      return { ok: false, reason: outcome.reason, detail: 'It cannot be mended here after all.' };
    }
    const short = outcome.mended.some((o) => o.result === 'short');
    return {
      ok: true,
      detail: short
        ? `${who} mends ${item.getPresentation()} as well as they can — serviceable, not what it was.`
        : `${who} mends ${item.getPresentation()}; it is sound.`,
      charge: quote.total,
      hand,
    };
  }

  /**
   * ⭐ The laundress (cleanliness D26): the hand reads the garment at her
   * band, names a price, and — on a yes — washes it HER way, in the water
   * in the room with the house's soap. What she does decides what it does
   * to the cloth; when it comes back ruined, the house pays its posted
   * cover (never to one of its own).
   */
  private async washService(
    tariff: Tariff,
    key: string,
    subjectRaw: string,
    context: CommandContext,
  ): Promise<ServiceResult> {
    const giver = context.commandGiver;
    const item = this.resolveSubject(subjectRaw, context);
    if (!item || !(item instanceof Garment)) {
      return { ok: false, reason: 'no-subject', detail: 'Name what you want washed.' };
    }
    const hand = await CraftingApi.fulfillingHand(giver, tariff, tariff.disciplineFor(key));
    if (!hand) return { ok: false, reason: 'no-hand', detail: NOBODY_TO_WORK };
    const band = MixinApi.isAdvancing(hand)
      ? await hand.competenceBandFor('textiles')
      : CompetenceBand.FLOOR;
    const policy = new WashPolicy(band);
    const look = item.describeForLaundress(policy);
    const method = policy.methodFor(look.subject);
    const lines = [{ key, label: 'wash', qty: Math.max(1, look.kinds.length) }];
    if (method.waterK >= 333) lines.push({ key: 'hot-wash', label: 'hot', qty: 1 });
    const quote = tariff.quoteFor(lines);
    const who = hand.getPresentation() ?? 'They';
    MessageApi.scene(giver)
      .topic(SERVICE_TOPIC)
      .toSelf(
        Mml.fromMarkup(
          Mml.escape(`${who} turns it over. ${look.said} That'll be ${money(quote.total)}.`),
        ),
      )
      .send();
    if (!tariff.canSettle(quote.total)) {
      return { ok: false, reason: 'cannot-pay', detail: "You haven't the money for that." };
    }
    const yes = context.interactive
      ? await context.interactive
          .promptConfirm(`Have it washed for ${money(quote.total)}?`, 'no')
          .catch(() => false)
      : false;
    if (!yes) return { ok: true, declined: true, detail: 'You keep your coin, and your washing.' };

    // ⭐ The inputs are the HAND's reach (repair's rule): the water in the
    // room (its hardness), the house's soap — or lye, if that is what she
    // reaches for and there is any.
    const cleansers = await this.houseCleansers(context, method.reachesFor);
    const outcome = item.washSite(
      {
        waterK: method.waterK,
        hardnessDgh: this.roomHardness(context),
        cleansers,
        effort: method.effort,
        coWashed: [item],
      },
      '',
    );
    const ruined = outcome.damage.filter((d) => RUIN.has(d));
    const what = item.getPresentation();
    if (ruined.length === 0) {
      return {
        ok: true,
        detail: `${who} brings ${what} back ${outcome.band === 'clean' ? 'clean' : `still ${outcome.band}`}, wet from the line.`,
        charge: quote.total,
        hand,
      };
    }
    // The deed is the hand's (AC 19): a ruined thing is on whoever ruined it.
    if (MixinApi.isPersona(hand)) {
      await hand
        .recordDeed({
          kind: 'deed',
          text: `ruined ${what} in the wash (${ruined.join(', ')}) for ${giver.getPresentation()}`,
          tags: ['ruined', 'wash'],
        })
        .catch(() => {});
    }
    const cover = tariff.priceFor('cover') ?? 0;
    return {
      ok: true,
      detail: `${who} brings ${what} back ${ruined.join(' and ')}. "I'm sorry — the house will make it good."`,
      charge: quote.total,
      hand,
      after: async () => this.payCover(tariff, giver, cover, what, context),
    };
  }

  /** The house pays the customer its posted cover for a ruined thing. */
  private async payCover(
    tariff: Tariff,
    customer: Stuff,
    cover: number,
    what: string,
    context: CommandContext,
  ): Promise<void> {
    if (!(cover > 0)) return;
    const house = await tariff.house();
    const account = await tariff.houseAccount();
    const payeeKey = customer.getIdentityPath() ?? '';
    let line: string;
    if (!house || !account || !payeeKey) {
      line = 'The house owes you for it, and says so.';
    } else {
      const paid = await BankingApi.indemnify({
        houseAccountId: account,
        housePath: house.getOrganizationPath(),
        payeeKey,
        amount: Money.of(cover, BankingApi.compactCurrency()),
        memo: `cover: ${what}`,
      }).catch(() => ({ ok: false as const, reason: 'no-persistence' as const }));
      line = paid.ok
        ? `The house pays you ${money(cover)} for it.`
        : paid.reason === 'self-dealing'
          ? 'The house does not pay its own people for their own washing.'
          : paid.reason === 'no-account'
            ? `The house owes you ${money(cover)} — you have no account to be paid into.`
            : `The house owes you ${money(cover)}, and has not got it.`;
    }
    MessageApi.scene(context.commandGiver)
      .topic(SERVICE_TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
  }

  /**
   * ⭐ The bathhouse (cleanliness D28): the attendant on shift fills a tub
   * from the hot copper, and the customer bathes in it — durative on the
   * customer's body, the fee taken at completion.
   */
  private async doBathService(
    tariff: Tariff,
    key: string,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver;
    const hand = await CraftingApi.fulfillingHand(giver, tariff, tariff.disciplineFor(key));
    if (!hand) return OrderController.serviceFail(context, NOBODY_TO_WORK, 'no-hand');
    if (!MixinApi.isAttired(giver)) {
      return OrderController.serviceFail(context, 'There is nobody here to bathe.', 'not-a-body');
    }
    const copper = this.roomVessel(context, 'copper');
    const tub = this.roomVessel(context, 'tub');
    if (!copper || !tub) {
      return OrderController.serviceFail(context, 'There is nothing here to draw a bath in.', 'no-tub');
    }
    const hot = BulkableApi.slotFor(copper, undefined);
    if (!hot || hot.isEmpty() || (hot.getTemperatureK() ?? 0) < 310) {
      return OrderController.serviceFail(context, 'The water is not hot yet.', 'not-hot');
    }
    const price = tariff.priceFor(key) ?? 0;
    if (!tariff.canSettle(price)) {
      return OrderController.serviceFail(context, "You haven't the money for that.", 'cannot-pay');
    }
    const bath = BulkableApi.slotFor(tub, undefined);
    if (!bath) return OrderController.serviceFail(context, 'The tub will not hold water.', 'no-tub');
    BulkableApi.transfer(hot, bath, { kind: 'measure', litres: 80, mode: 'lenient' });
    const cleansers = await this.houseCleansers(context, 'soap');
    // Just drawn from the copper: the bath is at the copper's heat.
    const waterK = hot.getTemperatureK() ?? 310;
    const who = hand.getPresentation() ?? 'The attendant';
    // ⚠ Read now: the effect lands after the controller is destructed.
    const hardnessDgh = this.roomHardness(context);
    this.runDurativeService(
      context,
      12000,
      {
        self: `${who} fills a tub from the copper, steaming, and leaves you to it.`,
        peers: `${giver.getPresentation()} gets into a hot tub.`,
      },
      async () => {
        if (giver.isDestroyed() || !MixinApi.isHygienic(giver)) return;
        giver.bathe(
          { waterK, hardnessDgh, cleansers, effort: 2 },
          120,
        );
        const collected = await tariff.collect(key, 'a bath');
        if (collected.paid) await OrderController.payPiecework(tariff, hand);
        const tail = collected.note ? ` ${collected.note}` : '';
        MessageApi.scene(giver)
          .topic(SERVICE_TOPIC)
          .toSelf(Mml.fromMarkup(Mml.escape(`You climb out pink and scrubbed.${tail}`)))
          .toPeers(Mml.compose`${Mml.actor(giver)} climbs out of the tub.`)
          .send();
      },
    );
  }

  /** A bulk vessel in the room that answers to `keyword` (the copper, a tub). */
  private roomVessel(context: CommandContext, keyword: string): Stuff | null {
    const loc = context.location;
    if (!loc || !MixinApi.isContainer(loc)) return null;
    for (const s of (loc as Stuff & Container).getContents()) {
      const c = s as unknown as Stuff;
      if (MixinApi.isBulkable(c) && MixinApi.isPerceptible(c) && c.hasKeyword(keyword)) return c;
    }
    return null;
  }

  /** The hardness of the water the room's trough or copper holds. */
  private roomHardness(context: CommandContext): number {
    const loc = context.location;
    if (!loc || !MixinApi.isContainer(loc)) return 8;
    for (const s of (loc as Stuff & Container).getContents()) {
      const c = s as unknown as Stuff;
      if (!MixinApi.isBulkable(c)) continue;
      const slot = BulkableApi.slotFor(c, undefined);
      if (!slot || slot.isEmpty() || !slot.getMaterial()?.hasTag('water')) continue;
      return slot.getHardnessDgh() ?? 8;
    }
    return 8;
  }

  /**
   * The house's cleanser in the room (the soap at par on a shelf, a flask
   * of lye) — what the hand reaches for, or soap when there is none of it,
   * or nothing (a water wash).
   */
  private async houseCleansers(
    context: CommandContext,
    reachesFor: 'lye' | 'soap',
  ): Promise<WashCleanser[]> {
    const loc = context.location;
    if (!loc || !MixinApi.isContainer(loc)) return [];
    const catalogue = await StuffApi.singleton<CleanserCatalogue>(TemplatePaths.cleanserCatalogue);
    const want = reachesFor === 'lye' ? 'alkali-strong' : 'surfactant';
    let soap: WashCleanser | null = null;
    for (const s of (loc as Stuff & Container).getContents()) {
      const c = s as unknown as Stuff;
      const m = MixinApi.isTangible(c) ? c.getMaterial() : null;
      if (!m) continue;
      const row = await catalogue.byTagsWarmed(m.getTags());
      if (!row) continue;
      const found = { row, materialPath: m.getTemplatePath() ?? null, source: c };
      if (row.action === want) return [found];
      if (row.action === 'surfactant' && soap === null) soap = found;
    }
    return soap ? [soap] : [];
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

/** What a service arm reports to the one settlement in `doService`. */
type ServiceResult =
  | {
      ok: true;
      detail: string;
      /** A computed charge (minor units) — else the row's price. */
      charge?: number;
      /** The hand who did the work, paid by their seat's basis. */
      hand?: Stuff;
      /** The customer said no: nothing done, nothing charged. */
      declined?: boolean;
      /** What happens after the fee is taken (the house's cover). */
      after?: () => Promise<void>;
    }
  | { ok: false; reason: string; detail: string };

/** A fault as a hand would say it, and what it would cost to put right. */
function faultSentence(f: Fault): string {
  const the = f.part ? `The ${f.named}` : 'It';
  const short = f.mendable && f.result === 'short' ? ' — serviceable is the best I can do' : '';
  switch (f.kind) {
    case 'worn':
      if (!f.mendable) return `${the} is worn, and wants ${cureFor(f)}.`;
      return `${the} is worn${short}.`;
    case 'failed':
      if (!f.mendable) {
        return f.reason === 'part-failed'
          ? f.named.startsWith('something about')
            ? `There is ${f.named} that wants replacing.`
            : `${the} has failed — it wants a new one fitted.`
          : `${the} has failed, and re-making it wants ${cureFor(f)}.`;
      }
      return `${the} has failed; it wants re-forging${short}.`;
    case 'slack':
      return f.mendable ? `${the} has gone slack.` : `${the} has gone slack, and wants ${cureFor(f)}.`;
    case 'spent':
      return f.mendable ? 'It has given all it had; it wants re-firing.' : `It has given all it had, and re-firing wants ${cureFor(f)}.`;
  }
}

/** What would cure a fault this hand cannot mend here. */
function cureFor(f: Fault): string {
  switch (f.reason) {
    case 'insufficient-heat':
      return 'a fire hotter than any here';
    case 'missing-tool':
      return f.detail === 'cutting' ? 'an edge to work it' : f.detail === 'mending' ? 'a mending kit' : `a ${f.detail ?? 'tool'}`;
    case 'insufficient-input':
      return `${f.detail ?? 'stock'} to mend it with`;
    case 'not-skilled':
      return 'a surer hand';
    default:
      return 'more than can be done here';
  }
}

/** The priced line a mendable fault is quoted under (repair D12). */
function quoteLine(f: Fault): QuoteRequestLine {
  const key =
    f.action === 'reforged' ? 'reforge' : f.action === 'tightened' ? 'tighten' : f.action === 'refired' ? 'refire' : 'repair';
  return { key, label: f.named, qty: 1 };
}

/** A sum of money, as the house would say it. */
function money(minor: number): string {
  return Money.of(minor, BankingApi.compactCurrency()).render();
}

/** Damage words that are a RUINED garment (a fade is only wear). */
const RUIN = new Set(['felted', 'shrunk', 'rotted', 'burnt', 'bled']);
