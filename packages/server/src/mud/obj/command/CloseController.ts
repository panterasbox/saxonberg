/**
 * CloseController — close any Sealable the player can reach.
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../api/command';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { MqlApi } from '../../api/mql';
import { DescribeApi } from '../../api/describe';
import { Mml } from '../../api/mml';

export interface CloseInput {
  target: string;
}

export class CloseController extends CommandController<CloseInput> {
  execute(input: CloseInput, context: CommandContext): CommandResult {
    const { commandGiver, location } = context;
    const target = (input.target ?? '').trim();
    if (!target) return { success: false, summary: 'close what?' };

    const hit = MqlApi.resolve(target, { commandGiver, location });
    if (!hit) {
      return {
        success: false,
        summary: `you don't see any ${target} here`,
      };
    }
    if (!MixinApi.isSealable(hit)) {
      return { success: false, summary: "can't close that" };
    }

    if (!hit.isOpen) {
      return { success: false, summary: 'already closed' };
    }

    hit.close();

    MessageApi.scene(commandGiver)
      .topic(MessageApi.Topics.world.narration.movement)
      .toSelf(Mml.compose`You close ${Mml.object(hit)}.`)
      .toPeers(Mml.compose`${Mml.name(commandGiver)} closes ${Mml.object(hit)}.`)
      .send();

    return {
      success: true,
      summary: `closed ${DescribeApi.getDisplayName(hit, 'it')}`,
    };
  }
}
