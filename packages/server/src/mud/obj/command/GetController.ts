/**
 * GetController - Pick up objects from location
 *
 * Syntax:
 * - get <target>    - Pick up a single object
 * - get <targets...> - Pick up multiple objects (all matching)
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../lib/command/models';
import type { Stuff } from '../../lib/stuff/Stuff';
import { ContainmentApi } from '../../api/containment';
import { DescribeApi } from '../../api/describe';
import { MixinApi } from '../../api/mixin';

/**
 * Input model for get command
 */
export interface GetInput {
  target?: Stuff;     // Single object
  targets?: Stuff[];  // Multiple objects
}

/**
 * Output model for get command
 */
export interface GetOutput {
  text: string;
}

/**
 * GetController - Handles picking up objects
 */
export class GetController extends CommandController<GetInput, GetOutput> {
  execute(input: GetInput, context: CommandContext): CommandResult<GetOutput> {
    // Determine if single or multiple targets
    const targets: Stuff[] = input.targets || (input.target ? [input.target] : []);

    if (targets.length === 0) {
      return {
        success: false,
        error: 'Nothing to get.',
      };
    }

    const results: string[] = [];
    let successCount = 0;

    for (const target of targets) {
      const result = this.pickUpObject(target, context);
      if (result.success) {
        successCount++;
      }
      results.push(result.message);
    }

    // Build output
    const lines = ['', ...results, ''];

    return {
      success: successCount > 0,
      output: {
        text: lines.join('\n'),
      },
    };
  }

  /**
   * Pick up a single object
   */
  private pickUpObject(
    target: Stuff,
    context: CommandContext
  ): { success: boolean; message: string } {
    // Precondition: the mustBeContainable validator should have rejected
    // non-Containable targets before we get here. The narrow is a contract,
    // not a user-facing check — programmatic callers that bypass validation
    // own the exception.
    if (!MixinApi.isContainable(target)) {
      throw new Error(
        `GetController: target ${target.stuffId} is not Containable`
      );
    }

    const targetName = DescribeApi.getDisplayName(target, 'something');

    // Check if object is already in inventory
    const inventory = ContainmentApi.getContents(context.avatar);
    if (inventory.some((item) => item.stuffId === target.stuffId)) {
      return {
        success: false,
        message: `You are already carrying ${targetName}.`,
      };
    }

    // Check if object is in location
    const locationContents = ContainmentApi.getContents(context.location);
    if (!locationContents.some((item) => item.stuffId === target.stuffId)) {
      return {
        success: false,
        message: `${targetName} is not here.`,
      };
    }

    ContainmentApi.move(target, context.avatar);

    return {
      success: true,
      message: `You pick up ${targetName}.`,
    };
  }

}
