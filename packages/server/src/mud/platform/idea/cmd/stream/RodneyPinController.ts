/**
 * RodneyPinController — `rodney pin <panel>`: steer
 * the lower third (over {@link RodneyControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { RodneyControllerBase, type StreamModel } from './RodneyControllerBase';

export default class RodneyPinController extends RodneyControllerBase {
  execute(model: StreamModel, context: CommandContext): void {
    const giver = this.host(context);
    if (!giver) return;
    const panel = model.panel ?? null;
    return this.answer(
      context,
      giver.steerRotation('pin', panel),
      `rotation: pin${panel ? ` ${panel}` : ''}`,
    );
  }
}
