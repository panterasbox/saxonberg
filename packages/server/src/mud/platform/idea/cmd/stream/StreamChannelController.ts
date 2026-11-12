/**
 * StreamChannelController — `stream channel <service> [<handle>]`: name
 * your chat channel on a service, or clear it (over {@link
 * StreamControllerBase}). The service is the view's `values:` list.
 */

import type { CommandContext } from '../../../../api/command';
import { StreamApi } from '../../../../api/stream';
import type { BroadcastService } from '../../../../lib/livestream/Broadcast';
import { StreamControllerBase, type StreamModel } from './StreamControllerBase';

export default class StreamChannelController extends StreamControllerBase {
  async execute(model: StreamModel, context: CommandContext): Promise<void> {
    const giver = this.host(context);
    if (!giver) return;
    const service = (model.service ?? '').toLowerCase() as BroadcastService;
    giver.nameChannel(service, model.handle ?? null);
    const playerId = giver.getPlayerId();
    if (playerId) await StreamApi.refreshOverlayReading(playerId);
    return this.tell(context, model.handle ? `${service}: ${model.handle}` : `${service}: cleared`);
  }
}
