/**
 * StreamBackController — `stream back`: clear standby, go live (over
 * {@link StreamControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { StreamControllerBase, type StreamModel } from './StreamControllerBase';

export default class StreamBackController extends StreamControllerBase {
  execute(_model: StreamModel, context: CommandContext): void {
    const state = this.resolveState();
    if (!state) {
      return this.fail(context, 'stream state unavailable', 'no-stream-state');
    }
    state.goLive();
    this.tell(context, `\nlive — standby cleared.\n`);
  }
}
