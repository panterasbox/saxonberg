/**
 * GetController — pick up objects from the location.
 *
 * Per item picked up, fires a Scene at `world.perception.inventory`
 * with self ("You pick up X.") and peers ("<name>Alice</name> picks
 * up X.") frames. Failure cases are reported via summary; the
 * auto-emitted MudlogApi entry surfaces them on the actor.
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../api/command';
import type { Stuff } from '../../lib/stuff/Stuff';
import { ContainmentApi } from '../../api/containment';
import { MessageApi } from '../../api/message';
import { DescribeApi } from '../../api/describe';
import { MixinApi } from '../../api/mixin';
import { Phrasebook } from '../../lib/Phrasebook';

export interface GetInput {
  target?: Stuff;
  targets?: Stuff[];
}

export class GetController extends CommandController<GetInput> {
  execute(input: GetInput, context: CommandContext): CommandResult {
    const targets: Stuff[] =
      input.targets || (input.target ? [input.target] : []);

    if (targets.length === 0) {
      return { success: false, summary: 'nothing to get' };
    }

    let successCount = 0;
    const lastNames: string[] = [];
    for (const target of targets) {
      if (this.pickUpObject(target, context)) {
        successCount++;
        lastNames.push(DescribeApi.getDisplayName(target, 'something'));
      }
    }

    if (successCount === 0) {
      return { success: false, summary: 'nothing picked up' };
    }
    return { success: true, summary: lastNames.join(', ') };
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
      .toSelf(Phrasebook.inventory.pickUpSelf(target))
      .toPeers(Phrasebook.inventory.pickUpPeers(giver, target))
      .send();

    return true;
  }
}
