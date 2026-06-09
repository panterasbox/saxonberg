/**
 * WhisperController — quiet, short-reach acoustic speech.
 *
 * Delegates to `VocalMixin.whisper(text, target?)` which fires a Scene
 * at `world.speech.whisper` with a low `meta.acousticDb` (30) so the
 * sound walk drops the frame after a short reach. Whisper is implicitly
 * directed — players usually whisper TO someone — but the YAML keeps
 * the target optional.
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

interface WhisperModel extends CommandModel {
  message: string;
  target?: FieldValue;
}

export class WhisperController extends CommandController<WhisperModel> {
  execute(model: WhisperModel, context: CommandContext): void {
    const speaker = context.commandGiver;
    if (!MixinApi.isVocal(speaker)) {
      MessageApi.scene(speaker)
        .topic('world.speech.whisper')
        .toSelf(Mml.compose`You cannot speak.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'VocalMixin' });
      return;
    }
    const target = firstStuff(model.target);
    speaker.whisper(model.message, target);
  }
}

function firstStuff(field: FieldValue | undefined): Stuff | undefined {
  if (!field) return undefined;
  const stuffs = MqlApi.extractStuffs(field);
  return stuffs && stuffs.length > 0 ? (stuffs[0] as Stuff) : undefined;
}
