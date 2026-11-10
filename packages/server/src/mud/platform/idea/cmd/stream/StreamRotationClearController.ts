/**
 * StreamRotationClearController — `stream rotation clear`: steer
 * the lower third (over {@link StreamControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { StreamControllerBase, type StreamModel } from './StreamControllerBase';

export default class StreamRotationClearController extends StreamControllerBase {
  execute(model: StreamModel, context: CommandContext): void {
    const giver = this.host(context);
    if (!giver) return;
    const panel = model.panel ?? null;
    return this.answer(
      context,
      giver.steerRotation('clear', panel),
      `rotation: clear${panel ? ` ${panel}` : ''}`,
    );
  }
}
