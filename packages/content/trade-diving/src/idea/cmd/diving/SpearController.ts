/**
 * SpearController — `spear [fish]` (underwater C5). The spear that
 * afforded the verb thrusts; the water decides what, if anything, it
 * takes.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import Spear from '../../../thing/Spear';

interface SpearModel extends CommandModel {
  quarry?: string;
}

export default class SpearController extends CommandController<SpearModel> {
  async execute(_model: SpearModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const spear = context.commandSource;
    if (!(spear instanceof Spear)) {
      return this.refuse(context, 'act.deed', 'You need a fish spear in your hand.', 'no-spear');
    }
    const out = await spear.thrust(giver);
    if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`${out.line}`)
      .toPeers(Mml.compose`${Mml.actor(giver)} thrusts a spear into the water and draws it back.`)
      .send();
  }
}
