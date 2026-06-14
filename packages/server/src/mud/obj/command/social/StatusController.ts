/**
 * StatusController — set the actor's activity-status line (the `status`
 * verb, one of `StatusMixin`'s three sources). `status watching the road`
 * sets it; bare `status` clears it back to the authored default.
 *
 * The status feeds the decoration slice of presentation
 * (`Stuff.getPresentation` / `RecognitionApi.describe`), so it shows up
 * wherever the actor is named.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';

interface StatusModel extends CommandModel {
  text?: string;
}

const TOPIC = 'system.shell.player';

export default class StatusController extends CommandController<StatusModel> {
  execute(model: StatusModel, context: CommandContext): void {
    const actor = context.commandGiver;
    if (!MixinApi.isStatus(actor)) {
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`You have no status to set.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'StatusMixin' });
      return;
    }

    const text = model.text ?? '';
    try {
      actor.setStatus(text);
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(Mml.compose`That status won't do: ${detail}`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'invalid-status',
        detail,
      });
      return;
    }

    const current = actor.getStatus();
    const body = current
      ? Mml.compose`Your status is now: ${current}`
      : Mml.compose`Status cleared.`;
    MessageApi.scene(actor).topic(TOPIC).toSelf(body).send();
  }
}
