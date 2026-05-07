/**
 * DropController — drop objects from inventory to location.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { Stuff } from '../../lib/stuff/Stuff';
import { ContainmentApi } from '../../api/containment';
import { MessageApi } from '../../api/message';
import { DescribeApi } from '../../api/describe';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';

interface DropModel extends CommandModel {
  // drop.yaml marks `targets` required (matcher rejects on missing
  // input) but the dispatcher passes empty arrays through on
  // unresolved input — controller produces the player-facing error.
  targets: Stuff[];
}

export class DropController extends CommandController<DropModel> {
  execute(model: DropModel, context: CommandContext): CommandResult {
    if (model.targets.length === 0) {
      const raw = context.raw?.targets ?? '';
      return {
        success: false,
        summary: `you don't have any '${raw}' to drop`,
      };
    }
    let successCount = 0;
    const droppedNames: string[] = [];
    for (const target of model.targets) {
      if (this.dropObject(target, context)) {
        successCount++;
        droppedNames.push(DescribeApi.getDisplayName(target, 'something'));
      }
    }

    if (successCount === 0) {
      return { success: false, summary: 'nothing dropped' };
    }
    return { success: true, summary: droppedNames.join(', ') };
  }

  private dropObject(target: Stuff, context: CommandContext): boolean {
    if (!MixinApi.isContainable(target)) {
      throw new Error(
        `DropController: target ${target.stuffId} is not Containable`
      );
    }
    const giver = context.commandGiver;
    if (!MixinApi.isContainer(giver)) {
      throw new Error(
        `DropController: commandGiver ${giver.stuffId} is not a Container`
      );
    }

    const inventory = ContainmentApi.getContents(giver);
    if (!inventory.some((item) => item.stuffId === target.stuffId)) {
      return false;
    }
    ContainmentApi.move(target, context.location);

    MessageApi.scene(giver)
      .topic(MessageApi.Topics.world.perception.inventory)
      .toSelf(Mml.compose`You drop ${Mml.item(target)}.`)
      .toPeers(Mml.compose`${Mml.name(giver)} drops ${Mml.item(target)}.`)
      .send();

    return true;
  }
}
