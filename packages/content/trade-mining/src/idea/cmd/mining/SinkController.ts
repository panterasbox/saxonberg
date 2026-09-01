/**
 * SinkController — `sink`, the downward half of the vertical pair.
 *
 * ⭐ The oxide cap runs deep enough that Stage A has real vertical extent
 * **without a shaft**: a winze is cut, not hoisted, and it is CLIMBED
 * rather than walked. What does not ship is the cage — a called,
 * capacity-limited lift is the shaft's, and an adit needs none.
 *
 * Everything else is `drive` pointed down, which is what it is in the
 * ground too.
 */

import { WinzeController } from './WinzeController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';

export default class SinkController extends WinzeController {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    await this.driveIn(context, 'down');
  }
}
