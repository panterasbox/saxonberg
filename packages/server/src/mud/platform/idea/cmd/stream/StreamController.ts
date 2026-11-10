/**
 * StreamController — bare `stream`: where the stream is, and the controls
 * card (broadcast-ready D10; over {@link StreamControllerBase}). Every
 * other act is its own subcommand's controller.
 */

import type { CommandContext } from '../../../../api/command';
import { CardApi } from '../../../../api/card';
import { StreamApi } from '../../../../api/stream';
import { StreamControllerBase, type StreamModel } from './StreamControllerBase';

export default class StreamController extends StreamControllerBase {
  async execute(model: StreamModel, context: CommandContext): Promise<void> {
    // The view falls through here for a word no stanza names.
    if (model.rest) {
      return this.fail(context, `Unknown stream subcommand: ${model.rest}`, 'unknown-subcommand');
    }
    const giver = this.host(context);
    if (!giver) return;
    const show = giver.show();
    const reason = show.reason ? ` (${show.reason.label})` : '';
    this.tell(context, `stream: ${show.phase}${reason}`);
    // The picker's rows ride the card's state (the streamer's own).
    giver.loadControls({
      reasons: (await StreamApi.standbyReasons()).map((r) => ({
        ...r.toView(),
        defaultDurationMs: r.defaultDurationMs,
      })),
    });
    CardApi.open(context, 'stream');
  }
}
