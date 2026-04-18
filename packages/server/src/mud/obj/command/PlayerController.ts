/**
 * PlayerController - Manage player character settings
 *
 * Subcommands:
 * - player name <firstName> [lastName]  - Set character name
 * - player pronouns <pronouns>          - Set pronouns
 * - player show                          - Show current settings
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../lib/command/models';
import type { Pronouns } from '@saxonberg/types';

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
    switch (input.subcommand) {
      case 'name':
        return this.executeName(input, context);
      case 'pronouns':
        return this.executePronouns(input, context);
      case 'show':
        return this.executeShow(input, context);
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
  private executeName(input: PlayerInput, context: CommandContext): CommandResult<PlayerOutput> {
    if (!input.firstName) {
      return {
        success: false,
        error: 'First name is required.',
      };
    }

    // Update avatar name
    context.avatar.firstName = input.firstName;
    context.avatar.lastName = input.lastName || '';

    // Sync to Player and save
    context.avatar.syncToPlayer();
    if (context.avatar.player) {
      context.avatar.player.save();
    }

    const fullName = context.avatar.fullName;

    return {
      success: true,
      output: {
        text: `\nYour name is now ${fullName}.\n`,
      },
    };
  }

  /**
   * Set pronouns
   */
  private executePronouns(
    input: PlayerInput,
    context: CommandContext
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

    // Update avatar pronouns
    context.avatar.pronouns = pronouns;

    // Sync to Player and save
    context.avatar.syncToPlayer();
    if (context.avatar.player) {
      context.avatar.player.save();
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
  private executeShow(input: PlayerInput, context: CommandContext): CommandResult<PlayerOutput> {
    const avatar = context.avatar;

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
