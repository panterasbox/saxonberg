/**
 * RodneyAwayController — `rodney away <reason> [<duration>]` or
 * `rodney away <duration>`: the Away scene, for a reason, counting down
 * (over {@link RodneyControllerBase}). The reason row and the duration
 * grammar are `StreamApi.interpretAway`'s; this words the answer.
 */

import type { CommandContext } from '../../../../api/command';
import { StreamApi } from '../../../../api/stream';
import { RodneyControllerBase, type StreamModel } from './RodneyControllerBase';

export default class RodneyAwayController extends RodneyControllerBase {
  async execute(model: StreamModel, context: CommandContext): Promise<void> {
    const giver = this.host(context);
    if (!giver) return;
    const reading = await StreamApi.interpretAway(model.reason ?? '', model.duration);
    if (!reading.ok) return this.fail(context, reading.detail, reading.refusal);
    const { reason, durationMs } = reading;
    const when =
      durationMs === null ? 'back shortly' : `back in ${StreamApi.formatDuration(durationMs)}`;
    return this.answer(context, giver.goStandby(reason, durationMs), `standby — ${reason.label}, ${when}`);
  }
}
