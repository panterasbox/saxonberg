/**
 * OpenController — open any Sealable the player can reach.
 *
 * Scope is intentionally narrow: resolve `target` via MQL, verify it is a
 * Sealable, call `open()`, broadcast. The controller does NOT know about
 * exits or doors specifically — doors are just one kind of Sealable, and
 * they surface to MQL via `ExitableMixin.getExitDoors()` (see MqlApi).
 *
 * If the future introduces chests or trapdoors, they compose SealableMixin
 * and this controller handles them uniformly.
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../api/command';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { MqlApi } from '../../api/mql';
import { DescribeApi } from '../../api/describe';

export interface OpenInput {
  target: string;
}

export interface OpenOutput {
  text: string;
}

export class OpenController extends CommandController<OpenInput, OpenOutput> {
  execute(input: OpenInput, context: CommandContext): CommandResult<OpenOutput> {
    const { commandGiver, location } = context;
    const target = (input.target ?? '').trim();
    if (!target) return { success: false, error: 'Open what?' };

    const hit = MqlApi.resolve(target, { commandGiver, location });
    if (!hit) {
      return { success: false, error: `You don't see any ${target} here.` };
    }
    if (!MixinApi.isSealable(hit)) {
      return { success: false, error: "You can't open that." };
    }

    if (hit.isOpen) {
      return { success: false, error: "It's already open." };
    }

    hit.open();

    const targetName = DescribeApi.getDisplayName(hit, 'it');
    const moverName = DescribeApi.getDisplayName(commandGiver, 'Someone');
    MessageApi.messageContents(
      location,
      {
        type: 'output',
        payload: { text: `<name>${moverName}</name> opens the ${targetName}.` },
      },
      { exclude: commandGiver }
    );

    return { success: true, output: { text: `You open the ${targetName}.` } };
  }
}
