/**
 * UnwieldController — `unwield <held thing>`: the held reading (over
 * {@link UnequipControllerBase}).
 *
 * ⭐ ANYTHING in a hand is put up by it — a mug as much as a sword (the
 * view requires `SlottableMixin`, what a hand holds; size and carrying
 * finalize drive: the full-hands refusal named `unwield mug` and the view
 * refused a mug as no weapon). What is not in a hand is refused, never
 * taken off: a worn bag is `remove`'s.
 */

import { UnequipControllerBase, type UnequipModel } from './UnequipControllerBase';
import type { CommandContext } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

export default class UnwieldController extends UnequipControllerBase {
  override async execute(model: UnequipModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;
    if (target !== null && MixinApi.isCarrying(giver) && giver.tierOf(target) !== 'hand') {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(Mml.compose`You aren't holding ${Mml.thing(target)}.`)
        .send();
      context.note({ kind: 'controller-rejected', reason: 'not-held', detail: target.getPresentation() });
      return;
    }
    await super.execute(model, context);
  }

  protected override heldSpeak(): boolean {
    return true;
  }
}
