/**
 * CloseController — close any Sealable the player can reach.
 *
 * Symmetric to OpenController: resolve `target` via MQL, verify Sealable,
 * call `close()`, broadcast. No knowledge of exits or doors — it just asks
 * the Sealable to close.
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../api/command';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { MqlApi } from '../../api/mql';
import { DescribeApi } from '../../api/describe';

export interface CloseInput {
  target: string;
}

export interface CloseOutput {
  text: string;
}

export class CloseController extends CommandController<CloseInput, CloseOutput> {
  execute(input: CloseInput, context: CommandContext): CommandResult<CloseOutput> {
    const { commandGiver, location } = context;
    const target = (input.target ?? '').trim();
    if (!target) return { success: false, error: 'Close what?' };

    const hit = MqlApi.resolve(target, { commandGiver, location });
    if (!hit) {
      return { success: false, error: `You don't see any ${target} here.` };
    }
    if (!MixinApi.isSealable(hit)) {
      return { success: false, error: "You can't close that." };
    }

    if (!hit.isOpen) {
      return { success: false, error: "It's already closed." };
    }

    hit.close();

    const targetName = DescribeApi.getDisplayName(hit, 'it');
    const moverName = DescribeApi.getDisplayName(commandGiver, 'Someone');
    MessageApi.messageContents(
      location,
      {
        type: 'output',
        payload: { text: `<name>${moverName}</name> closes the ${targetName}.` },
      },
      { exclude: commandGiver }
    );

    return { success: true, output: { text: `You close the ${targetName}.` } };
  }
}
