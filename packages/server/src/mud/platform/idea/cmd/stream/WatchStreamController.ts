/**
 * WatchStreamController — `watch <target>`: put a stream in your own focal
 * embed (over {@link WatchControllerBase}). One of two shapes of the
 * stream form; `watch <target> on <screen>` is {@link WatchOnController}.
 */

import type { CommandContext } from '../../../../api/command';
import { WatchControllerBase, type WatchModel } from './WatchControllerBase';

export default class WatchStreamController extends WatchControllerBase {
  async execute(model: WatchModel, context: CommandContext): Promise<void> {
    const host = this.clientOf(context);
    if (host === null) return;
    return this.watchStream(model, context, host, null);
  }
}
