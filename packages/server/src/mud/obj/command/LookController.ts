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
    const locationName = this.getObjectName(location);
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
    const targetName = this.getObjectName(target);
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

  /**
   * Get object name (try multiple property names)
   */
  private getObjectName(obj: any): string {
    if (typeof obj.fullName === 'string') return obj.fullName;
    if (typeof obj.name === 'string') return obj.name;
    if (typeof obj.shortDescription === 'string') return obj.shortDescription;
    return 'Something';
  }

  /**
   * Get object description (use getLong() if available, else longDescription)
   */
  private getObjectDescription(obj: any): string {
    // Try getLong() method (from VisibleMixin)
    if (typeof obj.getLong === 'function') {
      return obj.getLong();
    }

    // Fallback to longDescription property
    if (typeof obj.longDescription === 'string' && obj.longDescription) {
      return obj.longDescription;
    }

    // Default fallback
    return 'You see nothing special.';
  }
}
