/**
 * ProgramChannelController — `program channel <name> <carrier> [<channel>]
 * [--clear]`: attach your OWN channel on a carrier, read from your linked
 * account, or remove the feed (stream arrival D13). The carrier is the
 * view's `values:` list.
 */

import type { CommandContext } from '../../../../api/command';
import { StreamApi } from '../../../../api/stream';
import type { BroadcastService } from '../../../../lib/livestream/Broadcast';
import { ProgramControllerBase, type ProgramModel } from './ProgramControllerBase';

export default class ProgramChannelController extends ProgramControllerBase {
  async execute(model: ProgramModel, context: CommandContext): Promise<void> {
    const name = this.nameOf(model);
    // The view's `values:` list — already one of the three words.
    const carrier = (model.carrier ?? '') as BroadcastService;
    const label = this.carrierLabel(carrier);
    if (model.clear) {
      const cleared = await StreamApi.detachFeed(name, carrier);
      if (!cleared.ok) return this.refuse(context, cleared);
      return this.tell(context, `'${name}' is no longer carried on ${label}.`);
    }
    const answer = await StreamApi.attachFeed(name, carrier, model.channel);
    if (!answer.ok) return this.refuse(context, answer);
    const feed = answer.program.feedOn(carrier);
    return this.tell(
      context,
      `'${name}' is carried on ${label}: ${feed?.channel ?? '?'} — proved by your linked account.`,
    );
  }
}
