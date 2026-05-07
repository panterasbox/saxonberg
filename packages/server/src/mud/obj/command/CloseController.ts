/**
 * CloseController — close any Sealable the player can reach.
 *
 * Phase 7+: target is pre-resolved through MQL by the dispatcher;
 * the controller reads `model.target` directly.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { DescribeApi } from '../../api/describe';
import { Mml } from '../../api/mml';
import type { Stuff } from '../../lib/stuff/Stuff';

interface CloseModel extends CommandModel {
  target?: Stuff | null;
}

export class CloseController extends CommandController<CloseModel> {
  execute(model: CloseModel, context: CommandContext): CommandResult {
    const { commandGiver } = context;
    const target = model.target;
    if (target === undefined) {
      return { success: false, summary: 'close what?' };
    }
    if (target === null) {
      const raw = context.raw?.target ?? '';
      return {
        success: false,
        summary: `you don't see any '${raw}' here`,
      };
    }

    if (!MixinApi.isSealable(target)) {
      return { success: false, summary: "can't close that" };
    }

    if (!target.getIsOpen()) {
      return { success: false, summary: 'already closed' };
    }

    target.close();

    MessageApi.scene(commandGiver)
      .topic(MessageApi.Topics.world.narration.action)
      .toSelf(Mml.compose`You close ${Mml.object(target)}.`)
      .toPeers(Mml.compose`${Mml.name(commandGiver)} closes ${Mml.object(target)}.`)
      .send();

    return {
      success: true,
      summary: `closed ${DescribeApi.getDisplayName(target, 'it')}`,
    };
  }
}
