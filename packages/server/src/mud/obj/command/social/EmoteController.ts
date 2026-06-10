/**
 * EmoteController — free-form `emote <text>` ONLY. Catalog emotes
 * (`wave iffy`, `:wave iffy`, `;wave iffy`) dispatch inline from
 * `CommandGiver._runChain`'s unknown-verb branch — they have no
 * controller, no YAML, and no synthesized model.
 *
 * Calls `speaker.emoteFree(text)`; SoulMixin handles rendering +
 * Scene composition + send. Same in-room shape as `VocalMixin.say`.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';

interface EmoteModel extends CommandModel {
  body: string;
}

export default class EmoteController extends CommandController<EmoteModel> {
  execute(model: EmoteModel, context: CommandContext): void {
    const speaker = context.commandGiver;
    if (!MixinApi.isSoul(speaker)) {
      MessageApi.scene(speaker)
        .topic('world.expression.emote')
        .toSelf(Mml.compose`You cannot express that.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'SoulMixin' });
      return;
    }
    speaker.emoteFree(model.body);
  }
}
