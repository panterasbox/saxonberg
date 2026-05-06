/**
 * GetController — pick up objects from the location.
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

interface GetModel extends CommandModel {
  // Non-optional: get.yaml marks `targets` required + multiple, so
  // the matcher rejects on missing input and resolveAndValidate fails
  // the command if MQL produces zero hits. Controllers see at least
  // one Stuff.
  targets: Stuff[];
}

export class GetController extends CommandController<GetModel> {
  execute(model: GetModel, context: CommandContext): CommandResult {
    let successCount = 0;
    const pickedNames: string[] = [];
    for (const target of model.targets) {
      if (this.pickUpObject(target, context)) {
        successCount++;
        pickedNames.push(DescribeApi.getDisplayName(target, 'something'));
      }
    }

    if (successCount === 0) {
      return { success: false, summary: 'nothing picked up' };
    }
    return { success: true, summary: pickedNames.join(', ') };
  }

  private pickUpObject(target: Stuff, context: CommandContext): boolean {
    if (!MixinApi.isContainable(target)) {
      throw new Error(
        `GetController: target ${target.stuffId} is not Containable`
      );
    }
    const giver = context.commandGiver;
    if (!MixinApi.isContainer(giver)) {
      throw new Error(
        `GetController: commandGiver ${giver.stuffId} is not a Container`
      );
    }

    const inventory = ContainmentApi.getContents(giver);
    if (inventory.some((item) => item.stuffId === target.stuffId)) {
      return false;
    }
    const locationContents = ContainmentApi.getContents(context.location);
    if (!locationContents.some((item) => item.stuffId === target.stuffId)) {
      return false;
    }
    ContainmentApi.move(target, giver);

    MessageApi.scene(giver)
      .topic(MessageApi.Topics.world.perception.inventory)
      .toSelf(Mml.compose`You pick up ${Mml.item(target)}.`)
      .toPeers(Mml.compose`${Mml.name(giver)} picks up ${Mml.item(target)}.`)
      .send();

    return true;
  }
}
