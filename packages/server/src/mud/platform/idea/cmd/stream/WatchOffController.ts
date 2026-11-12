/**
 * WatchOffController — `watch off [on <screen>]`: stand down a kept watch,
 * darken a shared screen, or clear your own focal embed (over {@link
 * WatchControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { SchedulerApi } from '../../../../api/scheduler';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { HORIZON_WATCH_TYPE } from '../../../../lib/perception/HorizonWatch';
import {
  WATCH_KEY,
  WatchControllerBase,
  type WatchHost,
  type WatchModel,
} from './WatchControllerBase';

export default class WatchOffController extends WatchControllerBase {
  async execute(model: WatchModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!model.on && this.standDown(giver)) {
      return this.send(context, Mml.fromMarkup('\nYou stand down from your watch.\n'));
    }
    const host = this.clientOf(context);
    if (host === null) return;
    const screen = model.on?.stuff ?? null;
    if (screen) {
      if (!MixinApi.isDisplay(screen)) {
        return this.fail(context, "that isn't a screen.", 'not-display');
      }
      if (!(await screen.mayDrive(giver))) {
        return this.fail(
          context,
          `you can't drive ${screen.getPresentation()} — whoever holds the remote can.`,
          'not-driver',
        );
      }
      screen.clear();
      return this.send(
        context,
        Mml.fromMarkup(`\nYou switch ${screen.getPresentation()} off.\n`),
      );
    }
    return this.clear(host, context);
  }

  /** End a horizon watch the giver keeps; `false` when there is none. */
  private standDown(giver: Stuff): boolean {
    if (!MixinApi.isEngaged(giver)) return false;
    const w = giver.getEngagementByType(HORIZON_WATCH_TYPE);
    if (!w) return false;
    SchedulerApi.cancel(w, 'cancelled');
    return true;
  }

  private clear(host: WatchHost, context: CommandContext): void {
    host.setClientState(WATCH_KEY, null);
    host.pushClientStateUpdate(WATCH_KEY, null);
    this.send(context, Mml.fromMarkup('\nCleared the focal embed.\n'));
  }
}
