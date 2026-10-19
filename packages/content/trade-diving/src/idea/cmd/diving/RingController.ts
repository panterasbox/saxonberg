/**
 * RingController — `ring <bell>` (underwater C5). The bell sounds itself;
 * the verb only checks it is a bell.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import SignalBell from '../../../thing/SignalBell';

interface RingModel extends CommandModel {
  bell: MqlOneResult;
}

export default class RingController extends CommandController<RingModel> {
  async execute(model: RingModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const bell = model.bell?.stuff ?? null;
    if (!(bell instanceof SignalBell)) {
      return this.refuse(context, 'act.deed', 'That is not a bell you can ring.', 'not-a-bell');
    }
    bell.ring(giver);
  }
}
