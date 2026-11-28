/**
 * CompactCharacterController — `compact character <character>`: choose
 * which of your characters your account takes part in the Compact through
 * (front-page-sources D3–D6).
 *
 * Names one of your own characters by the one naming rule (the Compact's
 * `ownCharacterNamed`), then calls the one narrow entry; every rule — which
 * characters are yours, the lock while seated or with a vote open, keeping
 * every live body of the account in agreement — is the Compact's
 * (`CompactApi.designateCompactCharacter`). The answer carries
 * `{ compactPlayerId }` so the character-select screen moves its figures
 * with no second read.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { CompactApi } from '../../../../api/compact';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { Refusal } from '../../../../lib/errors';

interface CompactCharacterModel extends CommandModel {
  character?: string;
}

export default class CompactCharacterController extends CommandController<CompactCharacterModel> {
  async execute(model: CompactCharacterModel, context: CommandContext): Promise<void> {
    const words = model.character ?? '';
    const named = await CompactApi.ownCharacterNamed(context.commandGiver, words);
    if (named === null) return this.refuse(context, new Refusal('compact-no-account', {}));
    const playerId = await this.named(context, named, 'character of yours', words);
    if (playerId === null) return;
    const answer = await CompactApi.designateCompactCharacter(context.commandGiver, playerId);
    if (answer instanceof Refusal) return this.refuse(context, answer);
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      .toSelf(
        Mml.compose`\n${answer.name} is your Compact character now: your account's Make and Fund are shown there, and its vote is cast there.\n`,
      )
      .payload({ compactPlayerId: answer.playerId })
      .send();
  }
}
