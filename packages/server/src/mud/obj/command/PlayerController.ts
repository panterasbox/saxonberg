/**
 * PlayerController — manage player character settings.
 *
 * Subcommands: name, pronouns, show. Self-only Scenes at
 * `world.perception.look` carry confirmation prose; the auto-emit
 * surfaces the change to the actor independently.
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../api/command';
import type { Pronouns } from '@saxonberg/types';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { Avatar } from '../Avatar';

export interface PlayerInput {
  subcommand: string;
  name?: string;
  surname?: string;
  pronouns?: string;
}

export class PlayerController extends CommandController<PlayerInput> {
  execute(input: PlayerInput, context: CommandContext): CommandResult {
    const avatar = context.commandGiver;
    if (!(avatar instanceof Avatar)) {
      return {
        success: false,
        summary: 'only a player character can use the player command',
      };
    }

    switch (input.subcommand) {
      case 'name':
        return this.executeName(input, avatar, context);
      case 'pronouns':
        return this.executePronouns(input, avatar, context);
      case 'show':
        return this.executeShow(avatar, context);
      default:
        return {
          success: false,
          summary: `unknown subcommand: ${input.subcommand}`,
        };
    }
  }

  private executeName(
    input: PlayerInput,
    avatar: Avatar,
    context: CommandContext
  ): CommandResult {
    if (!input.name) {
      return { success: false, summary: 'name required' };
    }
    avatar.name = input.name;
    avatar.surname = input.surname || undefined;

    this.send(
      context,
      Mml.compose`\nYour name is now ${avatar.fullName}.\n`
    );
    return { success: true, summary: `name set to ${avatar.fullName}` };
  }

  private executePronouns(
    input: PlayerInput,
    avatar: Avatar,
    context: CommandContext
  ): CommandResult {
    if (!input.pronouns) {
      return { success: false, summary: 'pronouns required' };
    }

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
        summary: `invalid pronouns. valid: ${validPronouns.join(', ')}`,
      };
    }

    avatar.pronouns = pronounsLower as Pronouns;
    this.send(
      context,
      Mml.compose`\nYour pronouns are now ${avatar.pronouns}.\n`
    );
    return { success: true, summary: `pronouns set to ${avatar.pronouns}` };
  }

  private executeShow(avatar: Avatar, context: CommandContext): CommandResult {
    const body = Mml.fromMarkup(
      [
        '',
        'Player Character Settings:',
        '',
        `  Name:     ${avatar.fullName}`,
        `  Pronouns: ${avatar.pronouns}`,
        '',
      ].join('\n')
    );
    this.send(context, body);
    return {
      success: true,
      summary: `${avatar.fullName} (${avatar.pronouns})`,
    };
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(body)
      .send();
  }
}
