/**
 * PlayerControllerBase — what the `player` subcommands share
 * (controller-liquidity W7a, D13: one controller per subcommand over a
 * base per noun): the model and the shell words. `player name` is
 * `PlayerNameController`, `player pronouns` is
 * `PlayerPronounsController`, `player show` is `PlayerShowController`.
 *
 * Cross-cutting concerns the framework handles, not us:
 *   - `requiresAvatar` validator (in player.yaml) gates the giver type.
 *   - Unknown-subcommand rejection is dispatcher-side — `assemble`
 *     returns `error: 'unknown-subcommand'` before the controller
 *     is ever cloned.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import type { Mml } from '../../../../api/mml';

export interface PlayerModel extends CommandModel {
  name?: string;
  surname?: string;
  pronouns?: string;
}

export abstract class PlayerControllerBase extends CommandController<PlayerModel> {
  protected static send(
    context: CommandContext,
    body: Mml,
    topic: string = 'shell.result'
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic(topic)
      .toSelf(body)
      .send();
  }
}
