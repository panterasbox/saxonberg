/**
 * DropController — drop objects from inventory to location.
 *
 * Per item dropped, fires a Scene at `world.perception.inventory`
 * with self ("You drop X.") and peers ("<name>Alice</name> drops
 * X.") frames.
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../api/command';
import type { Stuff } from '../../lib/stuff/Stuff';
import { ContainmentApi } from '../../api/containment';
import { MessageApi } from '../../api/message';
import { DescribeApi } from '../../api/describe';
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';

export interface DropInput {
  target?: Stuff;
  targets?: Stuff[];
}

export class DropController extends CommandController<DropInput> {
  execute(input: DropInput, context: CommandContext): CommandResult {
    const targets: Stuff[] =
      input.targets || (input.target ? [input.target] : []);

    if (targets.length === 0) {
      return { success: false, summary: 'nothing to drop' };
    }

    let successCount = 0;
    const lastNames: string[] = [];
    for (const target of targets) {
      if (this.dropObject(target, context)) {
        successCount++;
        lastNames.push(DescribeApi.getDisplayName(target, 'something'));
      }
    }

    if (successCount === 0) {
      return { success: false, summary: 'nothing dropped' };
    }
    return { success: true, summary: lastNames.join(', ') };
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
