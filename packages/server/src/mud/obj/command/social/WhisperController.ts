/**
 * WhisperController — quiet, short-reach acoustic speech.
 *
 * Delegates to `VocalMixin.whisper(text, target?)` which fires a Scene
 * at `speech.quiet` with a low `meta.acousticDb` (30) so the
 * sound walk drops the frame after a short reach. Whisper is implicitly
 * directed — `target` is required by `whisper.yaml`.
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

interface WhisperModel extends CommandModel {
  message: string;
  /** From `whisper.yaml`'s required `target` (type: object). */
  target: MqlOneResult;
}

export default class WhisperController extends CommandController<WhisperModel> {
  execute(model: WhisperModel, context: CommandContext): void {
    const speaker = context.commandGiver;
    if (!MixinApi.isVocal(speaker)) {
      MessageApi.scene(speaker)
        .topic('speech.quiet')
        .toSelf(Mml.compose`You cannot speak.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'VocalMixin' });
      return;
    }
    const target = model.target?.stuff ?? undefined;
    speaker.whisper(model.message, target);
  }
}
