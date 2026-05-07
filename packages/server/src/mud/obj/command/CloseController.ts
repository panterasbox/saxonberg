/**
 * CloseController — close any Sealable the player can reach.
 *
 * Phase 7+: target is pre-resolved through MQL by the dispatcher;
 * the controller reads `model.target.stuff` directly.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { DescribeApi } from '../../api/describe';
import { Mml } from '../../api/mml';

interface CloseModel extends CommandModel {
  target?: MqlOneResult;
}

export class CloseController extends CommandController<CloseModel> {
  execute(model: CloseModel, context: CommandContext): CommandResult {
    const { commandGiver } = context;
    const target = model.target;
    if (target === undefined) {
      return { success: false, summary: 'close what?' };
    }
    if (target.stuff === null) {
      return {
        success: false,
        summary: `you don't see any '${target.raw}' here`,
      };
    }

    const stuff = target.stuff;
    if (!MixinApi.isSealable(stuff)) {
      return { success: false, summary: "can't close that" };
    }

    if (!stuff.getIsOpen()) {
      return { success: false, summary: 'already closed' };
    }

    stuff.close();

    MessageApi.scene(commandGiver)
      .topic(MessageApi.Topics.world.narration.action)
      .toSelf(Mml.compose`You close ${Mml.object(stuff)}.`)
      .toPeers(Mml.compose`${Mml.name(commandGiver)} closes ${Mml.object(stuff)}.`)
      .send();

    return {
      success: true,
      summary: `closed ${DescribeApi.getDisplayName(stuff, 'it')}`,
    };
  }
}
