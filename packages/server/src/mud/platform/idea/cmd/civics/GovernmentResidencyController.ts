/**
 * GovernmentResidencyController — `government residency` — the chain
 * over the giver's domicile (`GovernmentApi.residentOf`): where they are
 * a *resident*, as distinct from where they stand (over {@link
 * GovernmentControllerBase}).
 */

import type { CommandContext, CommandModel } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { GovernmentApi } from '../../../../api/government';
import { GovernmentControllerBase } from './GovernmentControllerBase';

export default class GovernmentResidencyController extends GovernmentControllerBase {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const domicile = GovernmentApi.domicileAddressOf(giver);
    if (!domicile) {
      this.send(
        context,
        Mml.fromMarkup(
          '\nYou have no domicile on record — nowhere yet counts you ' +
            'as a resident.\n',
        ),
      );
      context.note({
        kind: 'controller-rejected',
        reason: 'no-domicile',
        detail: 'No domicile on record.',
      });
      return;
    }
    const chain = GovernmentApi.residentOf(giver);
    const lines = [`Domiciled at ${Mml.escape(domicile).toString()}.`];
    if (chain.length === 0) {
      lines.push('No government claims your domicile.');
    } else {
      lines.push('You are a resident of, most local first:');
      for (const government of chain) {
        lines.push(`  ${Mml.escape(government.name).toString()}`);
      }
    }
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }
}
