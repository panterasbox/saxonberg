/**
 * SeverController — `sever [<line>]`, the lineman's cut.
 *
 * Severs the feeder node the bound `LineAccess` sits on; its node and the whole
 * compiled downstream set go dark the same second (`isServingNow` is live). Not
 * `cut` — that verb is tailoring's (`lint:verb-collisions`).
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import LineAccess from '../../../thing/LineAccess';

const TOPIC = 'act.deed';

interface SeverModel extends CommandModel {
  /** The line access point, resolved by the binder off the view's arg. */
  line?: MqlOneResult;
}

export default class SeverController extends CommandController<SeverModel> {
  execute(model: SeverModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const bound = model.line?.stuff ?? null;
    const pole = bound instanceof LineAccess ? bound : null;
    if (!pole) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There is no line here to sever.`)
        .send();
      context.note({ kind: 'controller-rejected', reason: 'no-line', detail: 'no-line' });
      return;
    }
    if (pole.isCut()) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`The line here is already cut.`)
        .send();
      context.note({ kind: 'controller-rejected', reason: 'already-cut', detail: 'already-cut' });
      return;
    }
    pole.sever();
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You sever the line. The lamps down the way go dark.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} severs the line, and the lamps down the way go dark.`)
      .send();
  }
}
