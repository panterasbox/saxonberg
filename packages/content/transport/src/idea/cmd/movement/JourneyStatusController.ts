/**
 * JourneyStatusController — bare `journey`: where you are on the trip, how
 * far is left, and roughly how long (over {@link JourneyControllerBase}).
 */

import type { CommandContext } from '@saxonberg/server/mud/api/command';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Engaged } from '@saxonberg/server/mud/lib/activity/Engaged';
import { Journey, JOURNEY_TYPE } from '../../../lib/journey/Journey';
import { JourneyControllerBase, type JourneyModel } from './JourneyControllerBase';

export default class JourneyStatusController extends JourneyControllerBase {
  async execute(_model: JourneyModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isEngaged(giver)) {
      return this.fail(context, 'you cannot take a journey', 'not-engageable');
    }
    return this.report(giver as Stuff & Engaged, context);
  }

  /**
   * Bare `journey`. **Position is free** — the vehicle is really in the
   * room, so anybody can see where it is. The ETA is computed from the
   * plan that remains, and is honestly an estimate: competence tightens
   * the window a teamster is shown, and never shortens the trip.
   */
  private async report(
    driver: Stuff & Engaged,
    context: CommandContext,
  ): Promise<void> {
    const live = driver.getEngagementBySlot('hands');
    if (!live || live.type !== JOURNEY_TYPE) {
      return this.fail(context, 'you are not on a journey', 'no-journey');
    }
    const journey = live as Journey;
    const legs = journey.legsRemaining();
    if (legs === 0) {
      this.tell(driver, 'You are at the end of the road.');
      return;
    }
    const minutes = await journey.estimateRemainingGameMinutes();
    const scale = WorldClockApi.getScale();
    const realMinutes = scale > 0 ? minutes / scale : minutes;
    this.tell(
      driver,
      `You are at ${JourneyStatusController.leafOf(journey.currentNode())}, ${legs} ` +
        `${legs === 1 ? 'leg' : 'legs'} from the end — roughly ` +
        `${Math.max(1, Math.round(minutes))} minutes of road left ` +
        `(about ${Math.max(1, Math.round(realMinutes))} by the clock on the wall).`,
    );
  }
}
