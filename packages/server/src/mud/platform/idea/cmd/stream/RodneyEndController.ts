/**
 * RodneyEndController — `rodney end`: the outro; the stream goes offline
 * when it finishes (over {@link RodneyControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { RodneyControllerBase, type StreamModel } from './RodneyControllerBase';

export default class RodneyEndController extends RodneyControllerBase {
  execute(_model: StreamModel, context: CommandContext): void {
    const giver = this.host(context);
    if (!giver) return;
    return this.answer(context, giver.endStream(), 'ending — the outro is on; offline when it finishes');
  }
}
