/**
 * RodneyNextController — `rodney next`: tick the current agenda item and
 * move to the next (over {@link RodneyControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { RodneyControllerBase, type StreamModel } from './RodneyControllerBase';

export default class RodneyNextController extends RodneyControllerBase {
  execute(_model: StreamModel, context: CommandContext): void {
    const giver = this.host(context);
    if (!giver) return;
    return this.answer(context, giver.advanceStreamAgenda(), 'agenda: next');
  }
}
