/**
 * OpenController — open any Sealable the player can reach.
 *
 * Phase 7+: target is pre-resolved through MQL by the dispatcher;
 * the controller reads `model.target.stuff` directly. The wrapper
 * also carries `raw` (player-typed text) for no-match messaging.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { MqlOne } from '../../api/mql';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { DescribeApi } from '../../api/describe';
import { Mml } from '../../api/mml';

interface OpenModel extends CommandModel {
  target?: MqlOne;
}

export class OpenController extends CommandController<OpenModel> {
  execute(model: OpenModel, context: CommandContext): CommandResult {
    const { commandGiver } = context;
    const target = model.target;
    if (target === undefined) {
      return { success: false, summary: 'open what?' };
    }
    if (target.stuff === null) {
      return {
        success: false,
        summary: `you don't see any '${target.raw}' here`,
      };
    }

    const stuff = target.stuff;
    if (!MixinApi.isSealable(stuff)) {
      return { success: false, summary: "can't open that" };
    }

    if (stuff.getIsOpen()) {
      return { success: false, summary: 'already open' };
    }

    stuff.open();

    MessageApi.scene(commandGiver)
      .topic(MessageApi.Topics.world.narration.action)
      .toSelf(Mml.compose`You open ${Mml.object(stuff)}.`)
      .toPeers(Mml.compose`${Mml.name(commandGiver)} opens ${Mml.object(stuff)}.`)
      .send();

    return {
      success: true,
      summary: `opened ${DescribeApi.getDisplayName(stuff, 'it')}`,
    };
  }
}
