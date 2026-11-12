/**
 * StreamLiveController — `stream live` / `stream back`: the desktop on
 * the air, from Starting Soon or back from Away (over {@link
 * StreamControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { StreamControllerBase, type StreamModel } from './StreamControllerBase';

export default class StreamLiveController extends StreamControllerBase {
  execute(_model: StreamModel, context: CommandContext): void {
    const giver = this.host(context);
    if (!giver) return;
    return this.answer(context, giver.goLive(), 'live — the desktop is on air');
  }
}
