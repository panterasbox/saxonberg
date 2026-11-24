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
import type { WhichAnswer } from '@saxonberg/types';
import WhichController from './WhichController';

interface WhichRelationsModel extends CommandModel {
  thing?: MqlOneResult;
}

/** The terminal reply for a `which ~` answer. */
function relationLines(a: WhichAnswer): string[] {
  const head = a.keeper ? `What ${WhichController.sourcePhrase(a.keeper)} keeps:` : 'The ~ words you can type:';
  const lines = [head];
  for (const r of a.relations ?? []) {
    const count = r.count === undefined ? '' : ` (${r.count} in the world)`;
    lines.push(`  ~${r.name} — ${r.meaning}${count}`);
  }
  return lines;
}

export default class WhichRelationsController extends CommandController<WhichRelationsModel> {
  execute(model: WhichRelationsModel, context: CommandContext): void {
    const answer = CommandApi.whichRelations(context.commandGiver, model.thing?.stuff ?? undefined);
    if (!answer.ok) return this.refuse(context, answer);
    MessageApi.scene(context.commandGiver).topic('shell.result').toSelf(Mml.fromMarkup(`\n${relationLines(answer.facts).join('\n')}\n`)).send();
  }
}
