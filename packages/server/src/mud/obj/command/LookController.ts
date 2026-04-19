/**
 * LookController - Examine surroundings or specific objects
 *
 * Syntax:
 * - look          - Examine current location
 * - look <target> - Examine specific object (MQL resolution)
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../api/command';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { DescribeApi } from '../../api/describe';
import type { Exit } from '../../lib/spatial/Exit';

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

    const lines: string[] = [
      '',
      `<location>${locationName}</location>`,
      '',
      description,
    ];

    if (MixinApi.isExitable(location)) {
      const exitsLine = this.formatExits(location.getObviousExits());
      if (exitsLine) {
        lines.push('');
        lines.push(exitsLine);
      }
    }

    lines.push('');

    return {
      success: true,
      output: { text: lines.join('\n') },
    };
  }

  /**
   * Look at specific target object
   */
  private lookAtTarget(target: Stuff, _context: CommandContext): CommandResult<LookOutput> {
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

  /**
   * Format the "Obvious exits" line. Each exit renders as its direction,
   * optionally followed by ` (<door name>, open|closed)` when it has a door.
   *
   * Returns `''` when there are no obvious exits — caller suppresses the
   * blank section in that case.
   */
  private formatExits(exits: Exit[]): string {
    if (exits.length === 0) return '';
    const parts = exits.map((exit) => {
      const dir = `<direction>${exit.direction}</direction>`;
      if (!exit.door) return dir;
      const state = exit.door.isOpen ? 'open' : 'closed';
      const doorName = DescribeApi.getDisplayName(exit.door, 'door');
      return `${dir} (${doorName}, ${state})`;
    });
    return `<exits>Obvious exits: ${parts.join(', ')}.</exits>`;
  }
}
