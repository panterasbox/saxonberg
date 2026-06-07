/**
 * SayController — broadcast a message to everyone in the actor's
 * current location.
 *
 * Delegates to VocalMixin.say which fires a Scene at
 * `world.speech.say`. The controller's job is just composition-narrowing
 * and reporting the semantic outcome; prose lives in the mixin sugar.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../api/command';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';

interface SayModel extends CommandModel {
  message: string;
}

export class SayController extends CommandController<SayModel> {
  execute(model: SayModel, context: CommandContext): void {
    const speaker = context.commandGiver;
    if (!MixinApi.isVocal(speaker)) {
      MessageApi.scene(speaker)
        .topic('world.speech.say')
        .toSelf(Mml.compose`You cannot speak.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'VocalMixin' });
      return;
    }
    speaker.say(model.message);
    return;
  }
}
