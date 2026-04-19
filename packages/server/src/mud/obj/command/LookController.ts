/**
 * LookController - Examine surroundings or specific objects
 *
 * Syntax:
 * - look          - Examine current location
 * - look <target> - Examine specific object (MQL resolution)
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../lib/command/models';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { DescribeApi } from '../../api/describe';

/**
 * Input model for look command
 */
export interface LookInput {
  target?: Stuff; // Optional target object (resolved via MQL)
}

/**
 * Output model for look command
 */
export interface LookOutput {
  text: string;
}

/**
 * LookController - Handles looking at location or objects
 */
export class LookController extends CommandController<LookInput, LookOutput> {
  execute(input: LookInput, context: CommandContext): CommandResult<LookOutput> {
    if (input.target) {
      // Look at specific target
      return this.lookAtTarget(input.target, context);
    } else {
      // Look at current location
      return this.lookAtLocation(context);
    }
  }

  /**
   * Look at current location
   */
  private lookAtLocation(context: CommandContext): CommandResult<LookOutput> {
    const location = context.location;

    // Get location name and description
    const locationName = DescribeApi.getDisplayName(location, 'Something');
    const description = this.getObjectDescription(location);

    // Format output with MML tags
    const text = [
      '',
      `<location>${locationName}</location>`,
      '',
      description,
      '',
    ].join('\n');

    return {
      success: true,
      output: { text },
    };
  }

  /**
   * Look at specific target object
   */
  private lookAtTarget(target: Stuff, context: CommandContext): CommandResult<LookOutput> {
    const targetName = DescribeApi.getDisplayName(target, 'Something');
    const description = this.getObjectDescription(target);

    const text = [
      '',
      `<name>${targetName}</name>`,
      '',
      description,
      '',
    ].join('\n');

    return {
      success: true,
      output: { text },
    };
  }

  private getObjectDescription(obj: Stuff): string {
    if (MixinApi.isVisible(obj)) return obj.getLong();
    return 'You see nothing special.';
  }
}
