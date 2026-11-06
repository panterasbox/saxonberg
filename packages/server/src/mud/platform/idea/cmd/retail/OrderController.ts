/**
 * OrderController — `order <phrase> [for <subject>] [with <brand>] [from
 * <board>] [off <menu>]`.
 *
 * ⭐⭐ **Input and output** (controllers-are-io D11). A board that prices the
 * order decides it: `Tariff.orderPlanFor` does the six services a venue
 * authors as rows, `CommerceMenu.orderPlanFor` has the bartender make a drink.
 * This file narrows the boards the view bound to the ones that take this word,
 * asks when two do, puts a quote's question to the customer, and words what
 * comes back.
 */

import { ManualBuildController } from '../crafting/ManualBuildController';
import { CommandApi, type CommandContext, type CommandModel } from '../../../../api/command';
import { BankingApi } from '../../../../api/banking';
import { GrammarApi } from '../../../../api/grammar';
import type { Fault } from '../../../../api/crafting';
import { Money } from '../../../../lib/banking/Money';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import type { MqlManyResult, MqlOneResult } from '../../../../api/mql';
import { CraftingDecline, type CraftingFailure } from '../../../../lib/craft/CraftingDecline';
import type {
  CoverOutcome,
  OrderBegin,
  OrderDone,
  OrderQuote,
  OrderReason,
  OrderRefusal,
} from '../../../../lib/commerce/PricedOffer';
import type { Stuff } from '../../../../lib/stuff/Stuff';

const TOPIC = 'act.deed';
const SERVICE_TOPIC = 'act.service';

type Composed = ReturnType<typeof Mml.compose>;

interface OrderModel extends CommandModel {
  /** The tariff boards — bound by the view, `from`-addressable. */
  counter?: MqlManyResult;
  /** The recipe menu — bound by the view, `off`-addressable. */
  menu?: MqlOneResult;
  cocktail: string;
  /** `for <subject>` — what a service acts on. */
  subject?: MqlOneResult;
  brand?: string;
}

export default class OrderController extends ManualBuildController<OrderModel> {
  async execute(model: OrderModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    // ⭐ Ordering is asking aloud — a voice the medium carries (D29 seam 5).
    if (MixinApi.isVocal(giver)) {
      const voice = giver.canVocalize();
      if (!voice.ok) return this.refuse(context, 'act.deed', voice.line, voice.reason);
    }

    const phrase = (model.cocktail ?? '').trim();
    const key = (phrase.split(/\s+/)[0] ?? '').toLowerCase();

    // ⭐ Two houses in one room (blood build D6): every reachable board was
    // bound, and those that take this word are the candidates. One is simply
    // it. Two is a real question, the view's own policy shape: a name, and
    // more of them than the slot takes.
    const taking = (model.counter?.stuff ?? []).filter(
      (b) => MixinApi.isPricedOffer(b) && b.offersOrder(key),
    );
    const picked = await CommandApi.applyCardinalityPolicy(
      { type: 'object', onExcess: 'prompt' },
      taking,
      'counter',
      context,
      { raw: key },
    );
    if (picked === null) return;
    const board = picked[0] ?? model.menu?.stuff ?? null;
    if (!board || !MixinApi.isPricedOffer(board)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's nowhere to order from here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'cocktail', query: model.cocktail });
      return;
    }

    const plan = await board.orderPlanFor({
      by: giver,
      phrase,
      key,
      subject: model.subject?.stuff ?? null,
      ...(model.brand ? { brand: model.brand } : {}),
      location: context.location ?? null,
    });
    if (!plan.ok) {
      // A quote already named, and then they cannot pay it.
      if (plan.facts.quote) OrderController.sayQuote(giver, plan.facts.quote);
      MessageApi.scene(giver)
        .topic(OrderController.topicOf(plan))
        .toSelf(OrderController.refusalWords(plan))
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: plan.reason,
        detail: plan.facts.craft?.detail ?? plan.reason,
      });
      return;
    }

    // ⭐ A price is named before any money moves, and the customer says yes.
    // No interactive (a script, an NPC) fails CLOSED: money is never taken on
    // a question nobody was asked, and the refusal says so.
    const begun = plan.facts;
    if (begun.kind === 'repair' || begun.kind === 'wash') {
      OrderController.sayQuote(giver, begun);
      const total = money(begun.total);
      const asker = context.requireInteractive(`a yes to pay ${total}`);
      if (!asker) {
        OrderController.serviceSay(giver, 'Nobody was there to say yes.');
        context.note({
          kind: 'controller-rejected',
          reason: 'needs-input',
          detail: 'Nobody was there to say yes.',
        });
        return;
      }
      const question =
        begun.kind === 'repair' ? `Have it done for ${total}?` : `Have it washed for ${total}?`;
      const yes = await asker.promptConfirm(question, 'no').catch(() => false);
      if (!yes) {
        const no =
          begun.kind === 'repair'
            ? 'You keep your coin, and it stays as it is.'
            : 'You keep your coin, and your washing.';
        OrderController.serviceSay(giver, no);
        context.note({ kind: 'controller-rejected', reason: 'declined', detail: no });
        return;
      }
    }

    await this.engagePlan(context, plan, {
      beginSelf: (f) => OrderController.beginSelf(f),
      beginPeers: (f) => OrderController.beginPeers(f, giver),
      onRefused: (r) => OrderController.refusalWords(r),
      onDone: (f) => OrderController.doneWords(f, giver),
    });
  }

  private static serviceSay(giver: Stuff, line: string): void {
    MessageApi.scene(giver).topic(SERVICE_TOPIC).toSelf(OrderController.escaped(line)).send();
  }

  private static escaped(line: string): Composed {
    return Mml.fromMarkup(Mml.escape(line));
  }

  /** A drink's refusal is the deed's topic; a service's, the service's. */
  private static topicOf(r: OrderRefusal): string {
    const drinks = r.facts.stage === 'make' || r.reason === 'unattended' || r.reason === 'not-on-menu';
    return drinks ? TOPIC : SERVICE_TOPIC;
  }

  /** "Bet looks it over. The head is worn — 5 zorkmids. …" */
  private static sayQuote(giver: Stuff, q: OrderQuote): void {
    if (q.kind === 'wash') {
      OrderController.serviceSay(giver, `${q.who} turns it over. ${q.said} That'll be ${money(q.total)}.`);
      return;
    }
    // "The head is worn — 5 zorkmids." — the price inside the sentence.
    const priced = q.mendable.map((f, i) => {
      const said = faultSentence(f);
      const price = q.prices[i] ?? null;
      return price !== null ? `${said.replace(/\.$/, '')} — ${money(price)}.` : said;
    });
    const unmended = q.faults.filter((f) => !f.mendable).map((f) => faultSentence(f));
    const lot = q.total > 0 ? ` ${GrammarApi.cap(money(q.total))} for the lot.` : '';
    OrderController.serviceSay(
      giver,
      `${q.who} looks it over. ${[...priced, ...unmended].join(' ')}${lot}`,
    );
  }

  private static beginSelf(f: OrderBegin): Composed {
    switch (f.kind) {
      case 'transfusion':
        return OrderController.escaped('You settle in; the line goes in and the unit begins to run. Hold still.');
      case 'bath':
        return OrderController.escaped(`${f.who} fills a tub from the copper, steaming, and leaves you to it.`);
      default:
        return Mml.compose``;
    }
  }

  private static beginPeers(f: OrderBegin, giver: Stuff): Composed | null {
    switch (f.kind) {
      case 'transfusion':
        return Mml.compose`${Mml.actor(giver)} settles in for a transfusion.`;
      case 'bath':
        return Mml.compose`${Mml.actor(giver)} gets into a hot tub.`;
      default:
        return null;
    }
  }

  private static refusalWords(r: OrderRefusal): Composed {
    const f = r.facts;
    if (f.craft) return OrderController.craftWords(f.craft, f.stage);
    const reason = r.reason as OrderReason;
    const line = OrderController.refusalLine(reason, r);
    return OrderController.escaped(line);
  }

  private static craftWords(failure: CraftingFailure, stage: OrderRefusal['facts']['stage']): Composed {
    if (stage === 'look') return OrderController.escaped('It cannot be mended here.');
    if (stage === 'mend') return OrderController.escaped('It cannot be mended here after all.');
    return Mml.compose`${CraftingDecline.messageFor(failure)}`;
  }

  private static refusalLine(reason: OrderReason, r: OrderRefusal): string {
    const f = r.facts;
    switch (reason) {
      case 'not-offered':
      case 'not-on-menu':
        return `"${f.phrase ?? ''}" isn't on the menu.`;
      case 'unattended':
        return "There's no one tending the bar just now.";
      case 'no-bank':
        return 'This house keeps no blood bank.';
      case 'not-a-body':
        return f.phrase === 'burial'
          ? 'Name the body to be laid to rest.'
          : f.phrase === 'transfusion'
            ? 'There is nothing here to transfuse.'
            : f.phrase === 'bath'
              ? 'There is nobody here to bathe.'
              : 'There is nothing here to treat.';
      case 'no-compatible-unit':
        return 'Nothing on the shelf will match you.';
      case 'nothing-to-treat':
        return 'You are sound enough. They send you on your way.';
      case 'no-grave':
        return 'There is nowhere here to lay them.';
      case 'burial-refused':
        return 'They cannot be laid there.';
      case 'no-subject':
        return f.phrase === 'wash' ? 'Name what you want washed.' : 'Name the thing you want mended.';
      case 'no-hand':
      case 'cannot-pay':
        return f.line ?? '';
      case 'nothing-mendable':
        return `${f.who ?? 'They'} looks it over. ${(f.faults ?? []).map((x) => faultSentence(x)).join(' ')}`;
      case 'nothing-to-repair':
        return `${f.who ?? 'They'} looks it over. There is nothing wrong with it.`;
      case 'no-tub':
        return f.phrase === 'none' ? 'There is nothing here to draw a bath in.' : 'The tub will not hold water.';
      case 'not-hot':
        return 'The water is not hot yet.';
      default: {
        const unworded: never = reason;
        throw new Error(`OrderController: no words for '${String(unworded)}'`);
      }
    }
  }

  private static doneWords(f: OrderDone, giver: Stuff): { self: Composed; peers: Composed } {
    const seen = Mml.compose`${Mml.actor(giver)} is seen to.`;
    const say = (line: string): Composed => OrderController.escaped(`${line}${f.tail}`);
    switch (f.kind) {
      case 'drink':
        return {
          self: Mml.compose`${Mml.thing(f.drink)} is set down in front of you.${f.tail}`,
          peers: Mml.compose`${Mml.actor(giver)} is served ${Mml.thing(f.drink)}.`,
        };
      case 'treatment':
        return { self: say(`They see to ${f.treated}.`), peers: seen };
      case 'burial':
        return { self: say(`${f.body} is laid to rest.`), peers: seen };
      case 'repair':
        return {
          self: say(
            f.short
              ? `${f.who} mends ${f.item} as well as they can — serviceable, not what it was.`
              : `${f.who} mends ${f.item}; it is sound.`,
          ),
          peers: seen,
        };
      case 'wash': {
        const back =
          f.ruined.length === 0
            ? `${f.who} brings ${f.what} back ${f.band === 'clean' ? 'clean' : `still ${f.band}`}, wet from the line.`
            : `${f.who} brings ${f.what} back ${f.ruined.join(' and ')}. "I'm sorry — the house will make it good."`;
        const cover = f.cover ? coverWords(f.cover) : '';
        return { self: OrderController.escaped(`${back}${f.tail}${cover ? ` ${cover}` : ''}`), peers: seen };
      }
      case 'transfusion':
        return {
          self: say(
            f.reacted
              ? 'The transfusion runs — but it does not match, and your body turns against it.'
              : 'The transfusion runs; your color comes back.',
          ),
          peers: seen,
        };
      case 'bath':
        return {
          self: say('You climb out pink and scrubbed.'),
          peers: Mml.compose`${Mml.actor(giver)} climbs out of the tub.`,
        };
      default: {
        const unworded: never = f;
        throw new Error(`OrderController: no words for ${String(unworded)}`);
      }
    }
  }
}

/** The house's cover for a ruined thing, in words (`Tariff.payCover`). */
function coverWords(cover: CoverOutcome): string {
  if (!cover.paid && cover.reason === 'no-cover') return '';
  return cover.paid
    ? `The house pays you ${money(cover.amount)} for it.`
    : cover.reason === 'self-dealing'
      ? 'The house does not pay its own people for their own washing.'
      : cover.reason === 'no-account'
        ? `The house owes you ${money(cover.amount)} — you have no account to be paid into.`
        : cover.reason === 'no-house'
          ? 'The house owes you for it, and says so.'
          : `The house owes you ${money(cover.amount)}, and has not got it.`;
}

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
    case 'cracked':
      return f.mendable ? `${the} is cracked; it wants riveting.` : `${the} is cracked, and riveting it wants ${cureFor(f)}.`;
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

/** A sum of money, as the house would say it. */
function money(minor: number): string {
  return Money.of(minor, BankingApi.compactCurrency()).render();
}
