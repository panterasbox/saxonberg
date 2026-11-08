/**
 * EquipSetsController — `equip sets`: the wardrobe roster (over
 * {@link EquipControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { EquipControllerBase, type EquipModel } from './EquipControllerBase';

export default class EquipSetsController extends EquipControllerBase {
  override async execute(_model: EquipModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isWardrobe(giver)) {
      MessageApi.scene(giver)
        .topic(EquipControllerBase.TOPIC)
        .toSelf(Mml.compose`You keep no sets.`)
        .send();
      return;
    }
    const names = giver.getWardrobeNames();
    MessageApi.scene(giver)
      .topic(EquipControllerBase.TOPIC)
      .toSelf(
        names.length === 0
          ? Mml.compose`You have no saved sets.`
          : Mml.compose`Your sets: ${names.join(', ')}.`,
      )
      .send();
  }
}
