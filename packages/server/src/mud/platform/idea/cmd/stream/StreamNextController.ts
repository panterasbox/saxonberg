/**
 * StreamNextController — `stream next`: tick the current agenda item and
 * move to the next (over {@link StreamControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { StreamControllerBase, type StreamModel } from './StreamControllerBase';

export default class StreamNextController extends StreamControllerBase {
  execute(_model: StreamModel, context: CommandContext): void {
    const giver = this.host(context);
    if (!giver) return;
    return this.answer(context, giver.advanceStreamAgenda(), 'agenda: next');
  }
}
