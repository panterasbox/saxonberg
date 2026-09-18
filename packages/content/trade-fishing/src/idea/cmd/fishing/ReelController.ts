/**
 * ReelController — `reel`: take line in. Acts on the actor's live
 * `fishing` engagement; with no line out, or nothing on it, it says so.
 */

import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { FishingController, FISHING_TOPIC } from './FishingController';
import { FishingEngagement, FISHING_TYPE } from '../../../lib/FishingEngagement';

export default class ReelController extends FishingController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const live = MixinApi.isEngaged(giver) ? giver.getEngagementByType(FISHING_TYPE) : undefined;
    if (!(live instanceof FishingEngagement)) {
      this.decline(context, 'You have no line out.', 'no-line');
      return;
    }
    if (!live.isFighting()) {
      MessageApi.scene(giver).topic(FISHING_TOPIC).toSelf(Mml.compose`You take in a little line. Nothing is on it.`).send();
      return;
    }
    const event = await live.reel();
    if (event) live.narrate(event);
    else MessageApi.scene(giver).topic(FISHING_TOPIC).toSelf(Mml.compose`You gain a little line. The rod is still bent.`).send();
  }
}
