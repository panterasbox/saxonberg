/**
 * InventoryController - List items in avatar's inventory
 *
 * Syntax:
 * - inventory - Show all items being carried
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../lib/command/models';
import { ContainmentApi } from '../../api/containment';

/**
 * Input model for inventory command (no parameters)
 */
export interface InventoryInput {}

/**
 * Output model for inventory command
 */
export interface InventoryOutput {
  text: string;
}

/**
 * InventoryController - Handles inventory listing
 */
export class InventoryController extends CommandController<InventoryInput, InventoryOutput> {
  execute(input: InventoryInput, context: CommandContext): CommandResult<InventoryOutput> {
    // Get inventory contents using MixinApi
    const contents = ContainmentApi.getContents(context.avatar);

    if (contents.length === 0) {
      return {
        success: true,
        output: {
          text: '\nYou are not carrying anything.\n',
        },
      };
    }

    // Build inventory list
    const lines = ['', 'You are carrying:'];

    for (const item of contents) {
      const itemName = this.getObjectName(item);
      lines.push(`  ${itemName}`);
    }

    lines.push('');

    return {
      success: true,
      output: {
        text: lines.join('\n'),
      },
    };
  }

  /**
   * Get object name (try multiple property names)
   */
  private getObjectName(obj: any): string {
    if (typeof obj.fullName === 'string') return obj.fullName;
    if (typeof obj.name === 'string') return obj.name;
    if (typeof obj.shortDescription === 'string') return obj.shortDescription;
    return 'Something';
  }
}
