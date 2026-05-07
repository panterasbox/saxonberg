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
  CommandResult,
} from '../../api/command';
import { MixinApi } from '../../api/mixin';

interface SayModel extends CommandModel {
  message: string;
}

export class SayController extends CommandController<SayModel> {
  execute(model: SayModel, context: CommandContext): CommandResult {
    const speaker = context.commandGiver;
    if (!MixinApi.isVocal(speaker)) {
      return { success: false, summary: 'You cannot speak.' };
    }
    speaker.say(model.message);
    return { success: true };
  }
}
