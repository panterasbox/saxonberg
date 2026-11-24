/**
 * WhichRelationsController — `which ~` / `which ~ <thing>` (the which
 * build): the `~` words you can type, each with what it means. ⭐ Dumb: the
 * read lists them (`CommandApi.whichRelations`); the binder already found
 * and perceived the thing.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { CommandApi } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { Mml } from '../../../../api/mml';
import { MessageApi } from '../../../../api/message';
import { CardApi } from '../../../../api/card';
import type { WhichAnswer } from '@saxonberg/types';
import WhichController from './WhichController';

interface WhichRelationsModel extends CommandModel {
  thing?: MqlOneResult;
}

export default class WhichRelationsController extends CommandController<WhichRelationsModel> {
  /** The terminal reply for a `which ~` answer. */
  private static lines(a: WhichAnswer): string[] {
    const head = a.keeper ? `What ${WhichController.sourcePhrase(a.keeper)} keeps:` : 'The ~ words you can type:';
    const lines = [head];
    for (const r of a.relations ?? []) {
      const count = r.count === undefined ? '' : ` (${r.count} in the world)`;
      lines.push(`  ~${r.name} — ${r.meaning}${count}`);
    }
    return lines;
  }

  execute(model: WhichRelationsModel, context: CommandContext): void {
    const answer = CommandApi.whichRelations(context.commandGiver, model.thing?.stuff ?? undefined);
    if (!answer.ok) return this.refuse(context, answer);
    const prose = Mml.fromMarkup(WhichRelationsController.lines(answer.facts).join('\n'));
    MessageApi.scene(context.commandGiver).topic('shell.result').toSelf(prose).send();
    // The same one card, on the ~ words — a snapshot (no params): a friend
    // arriving is nothing this source hears.
    CardApi.open(context, 'which', {
      key: 'which',
      title: answer.facts.keeper ? `which ~ ${answer.facts.keeper.handle}` : 'which ~',
      prose,
      payload: { kind: 'which', answer: answer.facts },
    });
  }
}
