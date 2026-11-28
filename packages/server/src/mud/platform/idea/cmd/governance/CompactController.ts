/**
 * CompactController — bare `compact`: which of your characters your
 * account takes part in the Compact through (front-page-sources D3).
 *
 * One controller for a pre-world `Login` and an embodied body alike: it
 * asks the Compact facade for the acting account's Compact character and
 * never asks what the giver is.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { CompactApi } from '../../../../api/compact';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { Refusal } from '../../../../lib/errors';

export default class CompactController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const compact = await CompactApi.compactCharacterOf(context.commandGiver);
    if (!compact) return this.refuse(context, new Refusal('compact-no-account', {}));
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      .toSelf(
        Mml.compose`\nYour Compact character is ${compact.name}. It shows your account's Make and Fund, casts your account's vote, and is the only one of your characters that may hold a Compact office. \`compact character <character>\` chooses another.\n`,
      )
      .payload({ compactPlayerId: compact.playerId })
      .send();
  }
}
