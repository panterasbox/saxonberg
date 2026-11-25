/**
 * ProgramController — bare `program`: the program your stream runs, or how
 * to make one (stream arrival A1).
 */

import type { CommandContext } from '../../../../api/command';
import { MixinApi } from '../../../../api/mixin';
import { StreamApi } from '../../../../api/stream';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { ProgramControllerBase, type ProgramModel } from './ProgramControllerBase';

export default class ProgramController extends ProgramControllerBase {
  async execute(_model: ProgramModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as Stuff;
    const path = MixinApi.isBroadcastHost(giver) ? giver.getStreamProgram() : null;
    const name = path ? path.slice(path.lastIndexOf('/') + 1) : null;
    const listing = name ? await StreamApi.programListing(name) : null;
    if (!listing) {
      return this.tell(
        context,
        'Your stream runs no program. `program create <name>` files one; `program run <name>` puts you in its chair.',
      );
    }
    return this.tell(context, `Your stream runs:\n${this.describe(listing)}`);
  }
}
