/**
 * StallRentController — `stall rent` and bare `stall`: a counter of your
 * own on the square and a house that trades as you; a second rent opens
 * the stall you already hold. The act is `MarketStalls.let` (over
 * {@link StallControllerBase}); this tells its answer.
 */

import type { CommandContext } from '@saxonberg/server/mud/api/command';
import { BankingApi, Money } from '@saxonberg/server/mud/api/banking';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { StallLetAnswer } from '../../thing/MarketStalls';
import { StallControllerBase, TOPIC, type StallModel } from './StallControllerBase';

export default class StallRentController extends StallControllerBase {
  async execute(model: StallModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const fixture = StallRentController.fixtureOf(model);
    if (!fixture) {
      return StallRentController.fail(context, 'There is no market here to rent a stall in.', 'no-market');
    }
    const answer = await fixture.let(giver);
    if (!answer.ok) {
      return StallRentController.fail(context, StallRentController.refusalWords(answer), answer.reason);
    }
    const counter = answer.counter as unknown as Stuff;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        answer.fresh
          ? Mml.compose`You rent a stall on the square: ${Mml.thing(counter)} is yours to keep. Growers may leave goods on your terms; \`house price\` sets your ask, \`wallet use house\` buys for the stall, and your house banks with ${answer.bank}.`
          : Mml.compose`You open ${Mml.thing(counter)} — yours already.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} sets up a stall.`)
      .send();
    context.note({ kind: 'info', detail: `stall:${counter.getIdentityPath() ?? ''}:${answer.account}` } as never);
  }

  /** What a refused let is told as. */
  protected static refusalWords(answer: Extract<StallLetAnswer, { ok: false }>): string {
    switch (answer.reason) {
      case 'no-identity':
        return 'A stall needs a keeper of record.';
      case 'no-square':
        return "You're nowhere a stall can stand.";
      case 'no-bank':
        return 'Open an account first — a stall banks where its keeper does.';
      case 'square-full':
        return 'The square has no free pitch — every stall is let.';
      case 'cant-afford':
        return `A stall on the square is ${Money.of(answer.rentMinor, BankingApi.compactCurrency()).render()} — you haven't that.`;
      case 'no-market-account':
        return 'The market keeps no account to pay rent into.';
    }
  }
}
