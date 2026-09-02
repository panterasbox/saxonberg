/**
 * RaiseController — `raise`, the upward half of the vertical pair.
 *
 * ⭐ The cheap direction: the broken rock falls to you instead of being
 * lifted, and a raise that meets a level above it **holes the workings
 * through** — which is the cheapest ventilation there is, and the reason
 * air is a function of topology rather than of a fan you buy.
 */

import { WinzeController } from './WinzeController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';

export default class RaiseController extends WinzeController {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    await this.driveIn(context, 'up');
  }
}
