/**
 * StreamStartController — `stream start [in <duration>]`: Starting Soon,
 * optionally counting down (over {@link StreamControllerBase}).
 * `stream start in 10m` and `stream start 10m` read alike — `in` is the
 * duration's optional preposition on the view.
 */

import type { CommandContext } from '../../../../api/command';
import { StreamApi } from '../../../../api/stream';
import { StreamControllerBase, type StreamModel } from './StreamControllerBase';

export default class StreamStartController extends StreamControllerBase {
  execute(model: StreamModel, context: CommandContext): void {
    const giver = this.host(context);
    if (!giver) return;
    const word = model.duration;
    let atMs: number | null = null;
    if (word) {
      const ms = StreamApi.parseDuration(word);
      if (ms === null) {
        return this.fail(context, `can't parse duration '${word}' (try 10m, 1h, 90s)`, 'bad-duration');
      }
      atMs = Date.now() + ms;
    }
    const label = word ? `starting — in ${word}` : 'starting';
    return this.answer(context, giver.startStream(atMs), label);
  }
}
