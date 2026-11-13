/**
 * StreamTokenController — `stream token [--control]`: issue (or rotate)
 * the overlay token, or the Stream Deck's, shown once (over {@link
 * StreamControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { StreamApi } from '../../../../api/stream';
import { StreamControllerBase, type StreamModel } from './StreamControllerBase';

export default class StreamTokenController extends StreamControllerBase {
  async execute(model: StreamModel, context: CommandContext): Promise<void> {
    const giver = this.host(context);
    if (!giver) return;
    const scope = model.control === true ? 'control' : 'overlay';
    const token = await StreamApi.issueToken(giver, scope);
    const use = scope === 'control' ? "pblive's SAXONBERG_CONTROL_TOKEN" : 'your overlay URL: ?broadcast=<token>';
    // Shown once; never stored in clear and never put on a frame's tags.
    return this.tell(
      context,
      `${scope} token (shown once — any earlier one no longer works):\n${token}\nUse it as ${use}`,
    );
  }
}
