/**
 * StreamOffController — `stream off`: offline now (over {@link
 * StreamControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { StreamControllerBase, type StreamModel } from './StreamControllerBase';

export default class StreamOffController extends StreamControllerBase {
  execute(_model: StreamModel, context: CommandContext): void {
    const giver = this.host(context);
    if (!giver) return;
    return this.answer(context, giver.goOffline(), 'offline');
  }
}
