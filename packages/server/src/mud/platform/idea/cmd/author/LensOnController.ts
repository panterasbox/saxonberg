/**
 * LensOnController — `lens on`: look through the builder lens over the
 * extents you hold (size-and-carrying D25). The act is the avatar's
 * (`AuthorMixin.lensOn` reads `AccessApi.heldExtents` — title, never the wizard
 * axis); this words what it says.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { GrammarApi } from '../../../../api/grammar';

export default class LensOnController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const scene = MessageApi.scene(giver).topic('shell.result');
    if (!MixinApi.isAuthor(giver)) {
      scene.toSelf(Mml.compose`Only an author can look through the builder lens.`).send();
      context.note({ kind: 'controller-rejected', reason: 'not-an-author', detail: 'lens' });
      return;
    }
    const extents = await giver.lensOn();
    if (extents.length === 0) {
      scene.toSelf(Mml.compose`You hold no extent, so the builder lens has nothing to show.`).send();
      context.note({ kind: 'controller-rejected', reason: 'no-extents', detail: 'lens' });
      return;
    }
    scene
      .toSelf(
        Mml.compose`The builder lens is on over ${GrammarApi.joinList([...extents])}. What only a builder would see is marked [builder].`,
      )
      .send();
  }
}
