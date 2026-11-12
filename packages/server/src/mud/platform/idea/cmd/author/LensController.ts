/**
 * LensController — bare `lens`: say whether the builder lens is on, and
 * over which extents (size-and-carrying D25). `lens on` / `lens off` are
 * their own controllers (one act each); the lens itself is the avatar's
 * (`Avatar.lensOn` / `lensOff`), a memo of `AccessApi.heldExtents` —
 * never a wizard check.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { PlayerApi } from '../../../../api/player';
import { Mml } from '../../../../api/mml';
import { GrammarApi } from '../../../../api/grammar';

export default class LensController extends CommandController<CommandModel> {
  execute(_model: CommandModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const held = PlayerApi.isAvatarStuff(giver) ? giver.lensExtents() : null;
    MessageApi.scene(giver)
      .topic('shell.result')
      .toSelf(
        held === null
          ? Mml.compose`The builder lens is off. \`lens on\` shows your own content as its builder.`
          : Mml.compose`The builder lens is on over ${GrammarApi.joinList([...held])}.`,
      )
      .send();
  }
}
