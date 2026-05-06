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

export class DropController extends CommandController {
  execute(model: CommandModel, context: CommandContext): CommandResult {
    const targets = collectTargets(model);

    if (targets.length === 0) {
      return { success: false, summary: 'nothing to drop' };
    }

    let successCount = 0;
    const droppedNames: string[] = [];
    for (const target of targets) {
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

function collectTargets(model: CommandModel): Stuff[] {
  const list = model.targets;
  return Array.isArray(list) ? (list as Stuff[]) : [];
}
