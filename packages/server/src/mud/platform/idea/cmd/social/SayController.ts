/**
 * SayController — broadcast a message to everyone in the actor's
 * current location.
 *
 * Delegates to VocalMixin.say which fires a Scene at
 * `speech.vocal`. With the `--to <target>` option, the message is
 * publicly directed — the room still hears, but the target is marked
 * with a target-frame ("Bobalu says to you, ...").
 *
 * Composition-narrowing + outcome reporting; prose lives in the mixin sugar.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import type { MqlOneResult } from '../../../../api/mql';
import { Mml } from '../../../../api/mml';

interface SayModel extends CommandModel {
  message: string;
  /** From `say.yaml`'s `--to <target>` option (type: object). */
  target?: MqlOneResult;
}

export default class SayController extends CommandController<SayModel> {
  execute(model: SayModel, context: CommandContext): void {
    const speaker = context.commandGiver;
    if (!MixinApi.isVocal(speaker)) {
      MessageApi.scene(speaker)
        .topic('speech.vocal')
        .toSelf(Mml.compose`You cannot speak.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'VocalMixin' });
      return;
    }
    const target = model.target?.stuff ?? undefined;
    speaker.say(model.message, target);
  }
}
