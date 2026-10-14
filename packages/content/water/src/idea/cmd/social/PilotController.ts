/**
 * PilotController — `pilot [<pilot>]`: pay a pilot, and come away knowing
 * what they know of the water (maritime D17).
 *
 * The fee is paid in coin, into the pilot's own hands (the cash method —
 * the payer is whoever is acting, so the PLAYER runs this verb). Then the
 * pilot's knowledge is written into your map as `told` claims signed with
 * their identity. Nothing is checked against the water: a pilot who is
 * wrong is wrong in your map too.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MqlApi } from '@saxonberg/server/mud/api/mql';
import { BankingApi, Money } from '@saxonberg/server/mud/api/banking';
import type { Charge } from '@saxonberg/server/mud/lib/banking/Charge';
import Pilot from '../../../agent/Pilot';

interface PilotModel extends CommandModel {
  pilot?: MqlOneResult;
}

export default class PilotController extends CommandController<PilotModel> {
  async execute(model: PilotModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const bound = model.pilot?.stuff ?? MqlApi.resolveOne('reachable:[class.Pilot]', {
      commandGiver: giver,
      scope: 'reachable',
    }).stuff;
    if (!(bound instanceof Pilot)) {
      return this.decline(context, 'There is no pilot here to ask.', 'no-pilot');
    }
    const pilot = bound;
    const fee = pilot.getFee();
    if (fee > 0) {
      const charge: Charge = {
        amount: Money.of(fee, BankingApi.compactCurrency()),
        reason: "a pilot's fee",
        presented: true,
        payeeAccountId: '',
        payeeContainer: pilot as never,
      };
      try {
        await BankingApi.settle(charge, { kind: 'cash' });
      } catch {
        return this.decline(
          context,
          `${pilot.getPresentation()} wants ${Money.of(fee, BankingApi.compactCurrency()).render()} for what they know, and you haven't the coin.`,
          'cannot-pay',
        );
      }
    }
    const n = await pilot.writeClaimsFor(giver, { by: pilot.getIdentityPath() ?? pilot.getTemplatePath() ?? '' });
    MessageApi.scene(giver)
      .topic('speech.vocal')
      .toSelf(
        n > 0
          ? Mml.compose`${Mml.actor(pilot)} takes your coin and tells you the water — where it runs, where it doesn't, and what it does when the wind is against it. You can \`map\` it now.`
          : Mml.compose`${Mml.actor(pilot)} shrugs: there is nothing to tell you about this water that you don't know.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} pays ${Mml.actor(pilot)} for a word about the water.`)
      .send();
  }

  private decline(context: CommandContext, text: string, reason: string): void {
    MessageApi.scene(context.commandGiver).topic('shell.result').toSelf(Mml.fromMarkup(text)).send();
    context.note({ kind: 'controller-rejected', reason, detail: text });
  }
}
