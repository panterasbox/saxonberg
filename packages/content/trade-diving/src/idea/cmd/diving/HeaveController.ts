/**
 * HeaveController — `heave <line> to <person>` (underwater C1). The line
 * decides — whether you hold it, whether they are within reach — and the
 * verb renders. The person is found here or in a place one obvious way
 * from here (the water below the quay): a thrown line crosses that gap.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import Lifeline from '../../../thing/Lifeline';

interface HeaveModel extends CommandModel {
  line: MqlOneResult;
  person: string;
}

export default class HeaveController extends CommandController<HeaveModel> {
  async execute(model: HeaveModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const line = model.line?.stuff ?? null;
    if (!(line instanceof Lifeline)) {
      return this.refuse(context, 'act.deed', 'That is not a line you can throw.', 'not-a-line');
    }
    const target = line.personWithinReach(giver, (model.person ?? '').trim().toLowerCase());
    if (target === null) {
      return this.refuse(context, 'act.deed', `You see no ${model.person} to throw it to.`, 'no-such-person');
    }
    const out = await line.heaveTo(giver, target);
    if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`${out.line}`)
      .toPeers(Mml.compose`${Mml.actor(giver)} heaves the end of a line to ${Mml.actor(target)}.`)
      .send();
  }
}
