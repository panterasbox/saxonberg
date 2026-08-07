/**
 * UnhideController — `unhide` / `reveal`: leave the hidden state deliberately.
 *
 * The counterpart to `hide` — clears `HidingMixin.hiding`, so the actor's
 * `getConcealment()` falls back to its authored (usually `obvious`) band and
 * they are plainly present to every observer again. Idempotent: `unhide`
 * with nothing to reveal is a quiet no-op line.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';

const TOPIC = 'sense.survey';

export default class UnhideController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const actor: Stuff = context.commandGiver;

    if (!MixinApi.isHiding(actor) || !actor.isHiding()) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`You're not hidden.`)
        .send();
      return;
    }

    actor.breakHide();
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.compose`You step back into the open.`)
      .send();
  }
}
