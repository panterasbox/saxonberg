/**
 * CommitteeControllerBase — what the `committee` subcommands share
 * (controller-liquidity W7a, D13: one controller per subcommand over a
 * base per noun): the read surface of the committee concept (the meta
 * layer: the group holding title over a subdivision IS its committee).
 * Filed under `system`, NEVER `civics` — the jargon standard's layer
 * split (civics is the fiction's category).
 *
 *   - bare / `committee show [<path>]` — `CommitteeShowController`: the
 *     committee over the giver's location (or the given path): group,
 *     subdivision, members, channel-if-minted.
 *   - `committee channel` — `CommitteeChannelController`: ensure + show
 *     the committee's chat channel (idempotent; the one mutation, its
 *     actor derived from execution context inside the Api).
 *
 * Holds the queried path and the shell words.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

export const TOPIC = 'shell.result';

export interface CommitteeModel extends CommandModel {
  /** Optional explicit content path to ask about. */
  path?: string;
}

export abstract class CommitteeControllerBase extends CommandController<CommitteeModel> {
  /** The queried content path: an explicit arg, else where the giver stands. */
  protected static queryPath(model: CommitteeModel, context: CommandContext): string {
    const explicit = (model.path ?? '').trim();
    if (explicit.length > 0) return explicit;
    return (
      context.location?.getTemplatePath() ??
      context.commandGiver.getIdentityPath() ??
      ''
    );
  }

  protected static send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }

  protected static fail(context: CommandContext, detail: string, reason: string): void {
    CommitteeControllerBase.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
