/**
 * StreamEndController — `stream end`: the outro; the stream goes offline
 * when it finishes (over {@link StreamControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { StreamControllerBase, type StreamModel } from './StreamControllerBase';

export default class StreamEndController extends StreamControllerBase {
  execute(_model: StreamModel, context: CommandContext): void {
    const giver = this.host(context);
    if (!giver) return;
    return this.answer(context, giver.endStream(), 'ending — the outro is on; offline when it finishes');
  }
}
