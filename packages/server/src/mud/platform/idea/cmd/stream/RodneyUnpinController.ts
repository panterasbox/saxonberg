/**
 * RodneyUnpinController — `rodney unpin`: steer
 * the lower third (over {@link RodneyControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { RodneyControllerBase, type StreamModel } from './RodneyControllerBase';

export default class RodneyUnpinController extends RodneyControllerBase {
  execute(_model: StreamModel, context: CommandContext): void {
    const giver = this.host(context);
    if (!giver) return;
    return this.answer(context, giver.steerRotation('clear', null), 'lower third: rotating as authored');
  }
}
