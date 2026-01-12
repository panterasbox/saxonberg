/**
 * TellController - Send private message to another player
 *
 * Syntax:
 * - tell <target> <message>   - Send private message
 * - whisper <target> <message> - Alias for tell
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../lib/command/models';
import { MessageApi } from '../../api/MessageApi';
import { PlayerApi } from '../../api/player';
import type { Avatar } from '../Avatar';

/**
 * Input model for tell command
 */
export interface TellInput {
  target: string; // Target name (text - we search manually)
  message: string;
}

/**
 * Output model for tell command
 */
export interface TellOutput {
  text: string;
}

/**
 * TellController - Handles private messaging between players
 */
export class TellController extends CommandController<TellInput, TellOutput> {
  execute(input: TellInput, context: CommandContext): CommandResult<TellOutput> {
    const avatar = context.avatar;
    const targetName = input.target;
    const message = input.message;

    // Find target avatar by name (search location first, then all online avatars)
    const target = this.findAvatarByName(targetName, context);

    if (!target) {
      return {
        success: false,
        output: {
          text: `No one named '${targetName}' is available to receive tells.`,
        },
      };
    }

    // Send to target (with MML formatting)
    const targetMessage = {
      type: 'output',
      payload: {
        text: `<name>${avatar.fullName}</name> tells you, <speech>"${message}"</speech>`,
        messageType: 'tell',
      },
    };
    target.onMessage(targetMessage);

    // Confirmation to sender
    return {
      success: true,
      output: {
        text: `You tell <name>${target.fullName}</name>, <speech>"${message}"</speech>`,
      },
    };
  }

  /**
   * Find avatar by name (search location first, then all online avatars)
   *
   * @param name - Name to search for
   * @param context - Command context
   * @returns Avatar if found, null otherwise
   */
  private findAvatarByName(name: string, context: CommandContext): Avatar | null {
    const nameLower = name.toLowerCase();

    // 1. Check current location first (prioritize people in same room)
    const location = context.location;
    const sensors = MessageApi.getSensors(location);
    for (const sensor of sensors) {
      const fullName = (sensor as any).fullName || '';
      if (fullName.toLowerCase() === nameLower) {
        return sensor as Avatar;
      }
    }

    // 2. Check all online avatars (for tells to people in other rooms)
    const allAvatars = PlayerApi.getAllAvatars();
    for (const avatar of allAvatars) {
      const fullName = avatar.fullName || '';
      if (fullName.toLowerCase() === nameLower) {
        return avatar;
      }
    }

    return null;
  }
}
