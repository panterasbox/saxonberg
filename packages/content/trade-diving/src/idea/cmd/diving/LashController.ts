/**
 * LashController — `lash <gear> to <load>` (underwater C5). The gear is a
 * line's end or an air bag; each decides what lashing it does.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import LineEnd from '../../../thing/LineEnd';
import AirBag from '../../../thing/AirBag';

interface LashModel extends CommandModel {
  gear: MqlOneResult;
  load: MqlOneResult;
}

export default class LashController extends CommandController<LashModel> {
  async execute(model: LashModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const gear = model.gear?.stuff ?? null;
    const load = model.load?.stuff ?? null;
    if (!(gear instanceof LineEnd) && !(gear instanceof AirBag)) {
      return this.refuse(context, 'act.deed', 'You can lash a line\'s end or an air bag, and nothing else.', 'not-lashable');
    }
    if (load === null) return this.refuse(context, 'act.deed', 'Lash it to what?', 'no-load');
    const out = gear.lashTo(giver, load);
    if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`${out.line}`)
      .toPeers(Mml.compose`${Mml.actor(giver)} lashes something to ${Mml.thing(load)}.`)
      .send();
  }
}
