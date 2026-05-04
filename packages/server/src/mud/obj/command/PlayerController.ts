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
import { Phrasebook } from '../../lib/Phrasebook';
import { Avatar } from '../Avatar';

export interface PlayerInput {
  subcommand: string;
  firstName?: string;
  lastName?: string;
  pronouns?: string;
}

export class PlayerController extends CommandController<PlayerInput> {
  execute(input: PlayerInput, context: CommandContext): CommandResult {
    const avatar = context.commandGiver;
    if (!(avatar instanceof Avatar)) {
      return {
        success: false,
        summary: Phrasebook.player.notAPlayer(),
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
    if (!input.firstName) {
      return { success: false, summary: 'first name required' };
    }
    avatar.firstName = input.firstName;
    avatar.lastName = input.lastName || '';

    this.send(context, Phrasebook.player.nameSet(avatar));
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
        summary: Phrasebook.player.invalidPronouns(validPronouns),
      };
    }

    avatar.pronouns = pronounsLower as Pronouns;
    this.send(context, Phrasebook.player.pronounsSet(avatar.pronouns));
    return { success: true, summary: `pronouns set to ${avatar.pronouns}` };
  }

  private executeShow(avatar: Avatar, context: CommandContext): CommandResult {
    this.send(context, Phrasebook.player.settingsBlock(avatar));
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
