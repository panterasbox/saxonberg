/**
 * ClayController — `clay <loaf> with <clay>`: wet clay packed on the base
 * of a sugar loaf, whose water works down through it over days and washes
 * it white from the head (sugar W4). ⭐ The loaf decides (`SugarLoaf.clay`);
 * the kernel's percolation does the rest on read.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import SugarLoaf from '../../../thing/SugarLoaf';

const TOPIC = 'act.deed';

interface ClayModel extends CommandModel {
  loaf?: MqlOneResult;
  clay?: MqlOneResult;
}

export default class ClayController extends CommandController<ClayModel> {
  execute(model: ClayModel, context: CommandContext): void {
    const actor = context.commandGiver as unknown as Stuff;
    const loaf = model.loaf?.stuff ?? null;
    const clay = model.clay?.stuff ?? null;
    if (!(loaf instanceof SugarLoaf)) {
      return this.refuse(context, TOPIC, 'Only a sugar loaf is clayed.', 'not-a-loaf');
    }
    if (!clay) return this.refuse(context, TOPIC, 'Clay it with what? Wet clay.', 'no-clay');
    const out = loaf.clay(clay);
    if (!out.ok) return this.refuse(context, TOPIC, out.line, 'refused');
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.compose`${out.line}`)
      .toPeers(Mml.compose`${Mml.actor(actor)} packs clay on the base of a sugar loaf.`)
      .send();
  }
}
