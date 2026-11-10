/**
 * StreamAwayController — `stream away <duration>`: enter standby; the
 * standby overlay counts down to `now + duration` (over {@link
 * StreamControllerBase}).
 *
 * The duration is the view's (`type: duration`, bound in milliseconds):
 * `15m`, `1h`, `1h30m`, `90s`, `2 hours`. A bare number is refused by the
 * view — a duration names its unit (controller-liquidity D1a / W7b).
 */

import type { CommandContext } from '../../../../api/command';
import { StreamControllerBase, type StreamModel } from './StreamControllerBase';

export default class StreamAwayController extends StreamControllerBase {
  execute(model: StreamModel, context: CommandContext): void {
    const ms = model.duration ?? 0;
    if (!(ms > 0)) {
      return this.fail(
        context,
        `standby needs a time to come back by (try 15m, 1h, 1h30m, 90s)`,
        'bad-duration',
      );
    }
    const state = this.resolveState();
    if (!state) {
      return this.fail(context, 'stream state unavailable', 'no-stream-state');
    }
    state.setAway(Date.now() + ms);
    this.tell(
      context,
      `\nstandby — back in ${StreamAwayController.formatMs(ms)}.\n`,
    );
  }

  /** Compact human label for a millisecond span (e.g. `1h 30m`). */
  protected static formatMs(ms: number): string {
    const totalSec = Math.round(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const min = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (min > 0) parts.push(`${min}m`);
    if (s > 0 && h === 0) parts.push(`${s}s`);
    return parts.length > 0 ? parts.join(' ') : '0s';
  }
}
