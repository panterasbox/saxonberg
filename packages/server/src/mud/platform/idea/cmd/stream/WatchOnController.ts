/**
 * WatchOnController — `watch <target> on <screen>`: put a stream up on a
 * SHARED screen for everyone who can see it (over {@link
 * WatchControllerBase}). The screen's own `mayDrive` decides who may.
 */

import type { CommandContext } from '../../../../api/command';
import { MixinApi } from '../../../../api/mixin';
import { WatchControllerBase, type WatchModel } from './WatchControllerBase';

export default class WatchOnController extends WatchControllerBase {
  async execute(model: WatchModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const host = this.clientOf(context);
    if (host === null) return;
    const screen = model.on?.stuff ?? null;
    if (!screen) {
      return this.fail(
        context,
        `You don't see any '${model.on?.raw ?? ''}' to watch on.`,
        'no-screen',
      );
    }
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
    return this.watchStream(model, context, host, screen);
  }
}
