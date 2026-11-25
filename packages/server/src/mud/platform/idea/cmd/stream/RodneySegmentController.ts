/**
 * RodneySegmentController — `rodney segment <title>`: the topic the
 * sidebar shows (over {@link RodneyControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { RodneyControllerBase, type StreamModel } from './RodneyControllerBase';

export default class RodneySegmentController extends RodneyControllerBase {
  execute(model: StreamModel, context: CommandContext): void {
    const giver = this.host(context);
    if (!giver) return;
    giver.nameTopic(model.title ?? null);
    return this.tell(context, `topic: ${model.title ?? '(none)'}`);
  }
}
