/**
 * WatchHorizonController — `watch horizon`: take up a watch on the horizon,
 * or say you already keep one (over {@link WatchControllerBase}). Any
 * perceiver may — the hired lookout's brain types it too.
 */

import type { CommandContext } from '../../../../api/command';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { SchedulerApi } from '../../../../api/scheduler';
import { HorizonWatch, HORIZON_WATCH_TYPE } from '../../../../lib/perception/HorizonWatch';
import { WatchControllerBase, type WatchModel } from './WatchControllerBase';

export default class WatchHorizonController extends WatchControllerBase {
  async execute(_model: WatchModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isEngaged(giver)) {
      return this.fail(context, 'You cannot keep a watch.', 'not-engaged');
    }
    if (giver.getEngagementByType(HORIZON_WATCH_TYPE)) {
      return this.send(context, Mml.fromMarkup('\nYou are already keeping a watch.\n'));
    }
    const started = SchedulerApi.start(new HorizonWatch(giver));
    if (!started.ok) {
      return this.fail(
        context,
        'Your attention is taken up — you cannot keep a watch as well.',
        'engagement-conflict',
      );
    }
    this.send(context, Mml.fromMarkup('\nYou settle to watching the horizon.\n'));
  }
}
