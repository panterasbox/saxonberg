/**
 * PlayerController - Manage player character settings
 *
 * Subcommands:
 * - player name <firstName> [lastName]  - Set character name
 * - player pronouns <pronouns>          - Set pronouns
 * - player show                          - Show current settings
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../api/command';
import type { Pronouns } from '@saxonberg/types';
import { Avatar } from '../Avatar';

/**
 * Input model for player command
 */
export interface PlayerInput {
  subcommand: string;
  firstName?: string;
  lastName?: string;
  pronouns?: string;
}

/**
 * Output model for player command
 */
export interface PlayerOutput {
  text: string;
}

/**
 * PlayerController - Handles player settings management
 */
export class PlayerController extends CommandController<PlayerInput, PlayerOutput> {
  execute(input: PlayerInput, context: CommandContext): CommandResult<PlayerOutput> {
    // The `player` command only makes sense for a player-character Avatar —
    // it writes the CharacterSheet. Narrow here so every subcommand gets an
    // Avatar without casting, and non-Avatar givers (e.g. a future NPC)
    // get a clean error rather than a type crash.
    const avatar = context.commandGiver;
    if (!(avatar instanceof Avatar)) {
      return { success: false, error: 'Only a player character can use the player command.' };
    }

    switch (input.subcommand) {
      case 'name':
        return this.executeName(input, avatar);
      case 'pronouns':
        return this.executePronouns(input, avatar);
      case 'show':
        return this.executeShow(avatar);
      default:
        return {
          success: false,
          error: `Unknown subcommand: ${input.subcommand}`,
        };
    }
  }

  /**
   * Set character name
   */
  private executeName(input: PlayerInput, avatar: Avatar): CommandResult<PlayerOutput> {
    if (!input.firstName) {
      return {
        success: false,
        error: 'First name is required.',
      };
    }

    avatar.firstName = input.firstName;
    avatar.lastName = input.lastName || '';

    if (avatar.sheet) {
      avatar.sheet.syncFrom(avatar);
      avatar.sheet.save();
    }

    return {
      success: true,
      output: {
        text: `\nYour name is now ${avatar.fullName}.\n`,
      },
    };
  }

  /**
   * Set pronouns
   */
  private executePronouns(
    input: PlayerInput,
    avatar: Avatar
  ): CommandResult<PlayerOutput> {
    if (!input.pronouns) {
      return {
        success: false,
        error: 'Pronouns are required.',
      };
    }

    // Validate pronouns
    const validPronouns: string[] = [
      'he/him',
      'she/her',
      'they/them',
      'ze/zir',
      'xe/xem',
      'other',
    ];

    const pronounsLower = input.pronouns.toLowerCase();

    if (!validPronouns.includes(pronounsLower)) {
      return {
        success: false,
        error: `Invalid pronouns. Valid options: ${validPronouns.join(', ')}`,
      };
    }

    const pronouns = pronounsLower as Pronouns;

    avatar.pronouns = pronouns;

    if (avatar.sheet) {
      avatar.sheet.syncFrom(avatar);
      avatar.sheet.save();
    }

    return {
      success: true,
      output: {
        text: `\nYour pronouns are now ${pronouns}.\n`,
      },
    };
  }

  /**
   * Show current player settings
   */
  private executeShow(avatar: Avatar): CommandResult<PlayerOutput> {
    const lines = [
      '',
      'Player Character Settings:',
      '',
      `  Name:     ${avatar.fullName}`,
      `  Pronouns: ${avatar.pronouns}`,
      '',
    ];

    return {
      success: true,
      output: {
        text: lines.join('\n'),
      },
    };
  }
}
