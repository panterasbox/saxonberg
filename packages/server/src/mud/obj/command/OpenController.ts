/**
 * OpenController — open any Sealable the player can reach.
 *
 * Fires a Scene at `world.narration.movement` (the closest topic for
 * "physical interaction with the room state") with self ("You open
 * the door.") and peers ("<name>Alice</name> opens the door.")
 * frames.
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../api/command';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { MqlApi } from '../../api/mql';
import { DescribeApi } from '../../api/describe';
import { Mml } from '../../api/mml';

export interface OpenInput {
  target: string;
}

export class OpenController extends CommandController<OpenInput> {
  execute(input: OpenInput, context: CommandContext): CommandResult {
    const { commandGiver, location } = context;
    const target = (input.target ?? '').trim();
    if (!target) return { success: false, summary: 'open what?' };

    const hit = MqlApi.resolve(target, { commandGiver, location });
    if (!hit) {
      return {
        success: false,
        summary: `you don't see any ${target} here`,
      };
    }
    if (!MixinApi.isSealable(hit)) {
      return { success: false, summary: "can't open that" };
    }

    if (hit.isOpen) {
      return { success: false, summary: 'already open' };
    }

    hit.open();

    MessageApi.scene(commandGiver)
      .topic(MessageApi.Topics.world.narration.movement)
      .toSelf(Mml.compose`You open ${Mml.object(hit)}.`)
      .toPeers(Mml.compose`${Mml.name(commandGiver)} opens ${Mml.object(hit)}.`)
      .send();

    return {
      success: true,
      summary: `opened ${DescribeApi.getDisplayName(hit, 'it')}`,
    };
  }
}
