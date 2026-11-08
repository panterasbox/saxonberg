/**
 * ThrowToController — `throw <thing> to <someone>`: a toss meant to be caught
 * (underwater review). The THING decides what catching it means and how far it
 * carries (`Tossable.tossTo`); a thing that has no answer is thrown AT someone,
 * or handed over.
 */

import type { CommandContext } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { ThrowControllerBase, type ThrowModel } from './ThrowControllerBase';

interface ThrowToModel extends ThrowModel {
  recipient: string;
}

export default class ThrowToController extends ThrowControllerBase<ThrowToModel> {
  async execute(model: ThrowToModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const item = this.heldItem(model, context);
    if (!item) return;
    if (!MixinApi.isTossable(item)) {
      return this.fail(
        context,
        `You can throw ${item.getPresentation()} AT someone, or give it to them.`,
        'not-tossable',
      );
    }
    const out = await item.tossTo(giver, (model.recipient ?? '').trim());
    if (!out.ok) return this.fail(context, out.line, out.reason);
    const scene = MessageApi.scene(giver).topic('act.deed').toSelf(out.self);
    if (out.peers) scene.toPeers(out.peers);
    scene.send();
  }
}
