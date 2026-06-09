/**
 * SayController — broadcast a message to everyone in the actor's
 * current location.
 *
 * Delegates to VocalMixin.say which fires a Scene at
 * `world.speech.say`. With the `--to <target>` option, the message is
 * publicly directed — the room still hears, but the target is marked
 * with a target-frame ("Bobalu says to you, ...").
 *
 * Composition-narrowing + outcome reporting; prose lives in the mixin sugar.
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

interface SayModel extends CommandModel {
  message: string;
  target?: FieldValue;
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
    const target = firstStuff(model.target);
    speaker.say(model.message, target);
    return;
  }
}

function firstStuff(field: FieldValue | undefined): Stuff | undefined {
  if (!field) return undefined;
  const stuffs = MqlApi.extractStuffs(field);
  return stuffs && stuffs.length > 0 ? (stuffs[0] as Stuff) : undefined;
}
