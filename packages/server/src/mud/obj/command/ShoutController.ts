/**
 * ShoutController — loud, multi-room acoustic speech.
 *
 * Delegates to `VocalMixin.shout(text, target?)` which fires a Scene at
 * `world.speech.shout` with a high `meta.acousticDb` (90) so the sound
 * walk propagates the frame further than `say`. With `--to <target>`,
 * the room still hears, but the target gets a target-frame ("Bobalu
 * shouts to you, ...").
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  FieldValue,
} from '../../api/command';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { MqlApi } from '../../api/mql';
import { Mml } from '../../api/mml';
import type { Stuff } from '../../lib/stuff/Stuff';

interface ShoutModel extends CommandModel {
  message: string;
  target?: FieldValue;
}

export class ShoutController extends CommandController<ShoutModel> {
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
    const target = firstStuff(model.target);
    speaker.shout(model.message, target);
  }
}

function firstStuff(field: FieldValue | undefined): Stuff | undefined {
  if (!field) return undefined;
  const stuffs = MqlApi.extractStuffs(field);
  return stuffs && stuffs.length > 0 ? (stuffs[0] as Stuff) : undefined;
}
