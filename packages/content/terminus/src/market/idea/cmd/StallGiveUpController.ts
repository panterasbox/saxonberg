/**
 * StallGiveUpController — `stall give-up`: pack your stall away; what was
 * on it comes back to you. The act is `MarketStalls.giveUp` (over
 * {@link StallControllerBase}); this tells its answer.
 */

import type { CommandContext } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StallControllerBase, TOPIC, type StallModel } from './StallControllerBase';

export default class StallGiveUpController extends StallControllerBase {
  async execute(model: StallModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const fixture = StallGiveUpController.fixtureOf(model);
    if (!fixture) return StallGiveUpController.fail(context, 'There is no market here.', 'no-market');
    const answer = await fixture.giveUp(giver);
    if (!answer.ok) return StallGiveUpController.fail(context, 'You hold no stall here.', 'no-stall');
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        answer.goodsTo === 'hands'
          ? Mml.compose`You pack the stall away; what was on it is in your hands.`
          : Mml.compose`You pack the stall away; what was on it is left on the square.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} packs a stall away.`)
      .send();
  }
}
