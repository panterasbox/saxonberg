/**
 * SayController — broadcast a message to everyone in the room.
 *
 * Delegates to VocalMixin.say which fires a Scene at
 * `world.speech.say`. The controller's job is just composition-narrowing
 * and reporting the semantic outcome; prose lives in the mixin sugar.
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../api/command';
import { MixinApi } from '../../api/mixin';

export interface SayInput {
  message: string;
}

export class SayController extends CommandController<SayInput> {
  execute(input: SayInput, context: CommandContext): CommandResult {
    const speaker = context.commandGiver;
    if (!MixinApi.isVocal(speaker)) {
      return { success: false, summary: 'You cannot speak.' };
    }
    speaker.say(input.message);
    return { success: true };
  }
}
