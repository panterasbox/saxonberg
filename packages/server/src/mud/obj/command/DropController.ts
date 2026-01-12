/**
 * DropController - Drop objects from inventory to location
 *
 * Syntax:
 * - drop <target>    - Drop a single object
 * - drop <targets...> - Drop multiple objects (all matching)
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../lib/command/models';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';

/**
 * Input model for drop command
 */
export interface DropInput {
  target?: Stuff;     // Single object
  targets?: Stuff[];  // Multiple objects
}

/**
 * Output model for drop command
 */
export interface DropOutput {
  text: string;
}

/**
 * DropController - Handles dropping objects
 */
export class DropController extends CommandController<DropInput, DropOutput> {
  execute(input: DropInput, context: CommandContext): CommandResult<DropOutput> {
    // Determine if single or multiple targets
    const targets: Stuff[] = input.targets || (input.target ? [input.target] : []);

    if (targets.length === 0) {
      return {
        success: false,
        error: 'Nothing to drop.',
      };
    }

    const results: string[] = [];
    let successCount = 0;

    for (const target of targets) {
      const result = this.dropObject(target, context);
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
   * Drop a single object
   */
  private dropObject(
    target: Stuff,
    context: CommandContext
  ): { success: boolean; message: string } {
    const targetName = this.getObjectName(target);

    // Check if object is in inventory
    const inventory = ContainmentApi.getContents(context.avatar);
    if (!inventory.some((item: any) => item.stuffId === target.stuffId)) {
      return {
        success: false,
        message: `You are not carrying ${targetName}.`,
      };
    }

    // Move object from avatar inventory to location
    if (!ContainmentApi.move(target, context.location)) {
      return {
        success: false,
        message: `Failed to drop ${targetName}.`,
      };
    }

    return {
      success: true,
      message: `You drop ${targetName}.`,
    };
  }

  /**
   * Get object name (try multiple property names)
   */
  private getObjectName(obj: any): string {
    if (typeof obj.fullName === 'string') return obj.fullName;
    if (typeof obj.name === 'string') return obj.name;
    if (typeof obj.shortDescription === 'string') return obj.shortDescription;
    return 'something';
  }
}
