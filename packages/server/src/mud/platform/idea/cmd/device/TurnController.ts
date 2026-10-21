/**
 * TurnController — `turn <thing>` / `turn back <thing>`: work a screw or a
 * handle by turning it (ceramics D25).
 *
 * ⭐ Dumb: the THING turns ({@link Turnable}) and says what that did — a
 * screw press bears down on the mould on its bed, and a charge with green
 * strength comes free. A thing that does not turn is told so here, and
 * nothing else is decided.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Turnable } from '../../../../lib/craft/Turnable';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

const TOPIC = 'act.deed';

interface TurnModel extends CommandModel {
  target?: MqlOneResult;
  subcommand?: string;
}

/** Does `x` turn? A module-private narrowing, by shape. */
function asTurnable(x: Stuff): (Stuff & Turnable) | null {
  return typeof (x as unknown as Partial<Turnable>).turnBy === 'function'
    ? (x as Stuff & Turnable)
    : null;
}

export default class TurnController extends CommandController<TurnModel> {
  async execute(model: TurnModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;
    if (target === null) {
      this.declineTurn(context, Mml.compose`Turn what? There is nothing like that here.`, 'no-target');
      return;
    }
    const turnable = asTurnable(target);
    if (turnable === null) {
      this.declineTurn(context, Mml.compose`There is nothing to turn on ${Mml.thing(target)}.`, 'not-turnable');
      return;
    }
    const back = (model.subcommand ?? '').trim().toLowerCase() === 'back';
    const out = await turnable.turnBy(giver, back);
    if (!out.ok) {
      this.declineTurn(context, out.line, out.reason);
      return;
    }
    const scene = MessageApi.scene(giver).topic(TOPIC).toSelf(out.line);
    if (out.peers) scene.toPeers(out.peers);
    scene.send();
  }

  private declineTurn(context: CommandContext, line: ReturnType<typeof Mml.compose>, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(line).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}
