/**
 * StreamSegmentController — `stream segment <title>`: the topic the
 * sidebar shows (over {@link StreamControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { StreamControllerBase, type StreamModel } from './StreamControllerBase';

export default class StreamSegmentController extends StreamControllerBase {
  execute(model: StreamModel, context: CommandContext): void {
    const giver = this.host(context);
    if (!giver) return;
    giver.nameTopic(model.title ?? null);
    return this.tell(context, `topic: ${model.title ?? '(none)'}`);
  }
}
