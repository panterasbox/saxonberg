/**
 * WriteOnController — `write <words> on <thing>` (underwater review): the
 * world's verb for putting words on a thing. The surface decides
 * (`Marked.writeOn`); the verb renders. (The shell's authoring verb is
 * `edit` — `WriteController` — since this review.)
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

interface WriteOnModel extends CommandModel {
  words: string;
  surface: MqlOneResult;
}

export default class WriteOnController extends CommandController<WriteOnModel> {
  async execute(model: WriteOnModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const surface = model.surface?.stuff ?? null;
    if (surface === null) {
      const named = model.surface?.raw;
      return this.refuse(context, 'act.deed', named ? `You see no ${named} to write on.` : 'Write on what?', 'no-surface');
    }
    if (!MixinApi.isMarked(surface)) {
      return this.refuse(context, 'act.deed', `There is nowhere to write on ${surface.getPresentation()}.`, 'no-room');
    }
    const out = surface.writeOn(giver, model.words ?? '');
    if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`${out.line}`)
      .toPeers(Mml.compose`${Mml.actor(giver)} writes something on ${Mml.thing(surface)}.`)
      .send();
  }
}
