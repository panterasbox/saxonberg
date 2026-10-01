/**
 * SpliceController — `splice [<line>]`, the lineman's repair.
 *
 * Splices the feeder node the bound `LineAccess` sits on back together; if
 * nothing upstream is still cut and the source is up, its node and downstream
 * relight the same second.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import LineAccess from '../../../thing/LineAccess';

const TOPIC = 'act.deed';

interface SpliceModel extends CommandModel {
  /** The line access point, resolved by the binder off the view's arg. */
  line?: MqlOneResult;
}

export default class SpliceController extends CommandController<SpliceModel> {
  execute(model: SpliceModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const bound = model.line?.stuff ?? null;
    const pole = bound instanceof LineAccess ? bound : null;
    if (!pole) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There is no line here to splice.`)
        .send();
      context.note({ kind: 'controller-rejected', reason: 'no-line', detail: 'no-line' });
      return;
    }
    if (!pole.isCut()) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`The line here is not cut.`)
        .send();
      context.note({ kind: 'controller-rejected', reason: 'not-cut', detail: 'not-cut' });
      return;
    }
    pole.splice();
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You splice the line back together.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} splices the line back together.`)
      .send();
  }
}
