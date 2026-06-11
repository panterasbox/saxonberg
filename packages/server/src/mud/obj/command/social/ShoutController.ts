/**
 * ShoutController — loud, multi-room acoustic speech.
 *
 * Delegates to `VocalMixin.shout(text, target?)` which fires a Scene at
 * `world.speech.shout` with a high `meta.acousticDb` (90) so the sound
 * walk propagates the frame further than `say`. With `--to <target>`,
 * the room still hears, but the target gets a target-frame ("Bobalu
 * shouts to you, ...").
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import type { MqlOneResult } from '../../../api/mql';
import { Mml } from '../../../api/mml';

interface ShoutModel extends CommandModel {
  message: string;
  /** From `shout.yaml`'s `--to <target>` option (type: object). */
  target?: MqlOneResult;
}

export default class ShoutController extends CommandController<ShoutModel> {
  execute(model: ShoutModel, context: CommandContext): void {
    const speaker = context.commandGiver;
    if (!MixinApi.isVocal(speaker)) {
      MessageApi.scene(speaker)
        .topic('world.speech.shout')
        .toSelf(Mml.compose`You cannot speak.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'VocalMixin' });
      return;
    }
    const target = model.target?.stuff ?? undefined;
    speaker.shout(model.message, target);
  }
}
