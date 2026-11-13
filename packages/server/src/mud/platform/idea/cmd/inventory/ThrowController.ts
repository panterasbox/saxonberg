/**
 * ThrowController — `throw <thing>`: a ballistic relocation. The thing leaves
 * your hands and lands on the floor. No fight, no gate.
 */

import type { CommandContext } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { ContainmentApi } from '../../../../api/containment';
import { ThrowControllerBase, type ThrowModel } from './ThrowControllerBase';

export default class ThrowController extends ThrowControllerBase<ThrowModel> {
  async execute(model: ThrowModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const item = this.heldItem(model, context);
    if (!item) return;
    const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    if (room === null || !MixinApi.isContainer(room)) {
      return this.fail(context, "There's nowhere to throw it.", 'no-room');
    }
    if (!this.letGo(item, context)) return;
    ContainmentApi.move(item as never, room as never);
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`You hurl ${Mml.thing(item)} away.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} hurls ${Mml.thing(item)} away.`)
      .send();
  }
}
