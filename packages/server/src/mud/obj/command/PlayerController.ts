/**
 * PlayerController — manage player character settings.
 *
 * Subcommands: name, pronouns, show. Identity-change confirmations
 * (name, pronouns) fire at `world.identity.change`; the `show`
 * readout fires at `world.perception.look`. Auto-emit surfaces the
 * change to the actor independently.
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
    avatar.setName(input.name);
    if (input.surname !== undefined) {
      avatar.setSurname(input.surname || undefined);
    }

    this.send(
      context,
      Mml.compose`\nYour name is now ${avatar.getFullName()}.\n`,
      MessageApi.Topics.world.identity.change
    );
    return { success: true, summary: `name set to ${avatar.getFullName()}` };
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

    avatar.setPronouns(pronounsLower as Pronouns);
    this.send(
      context,
      Mml.compose`\nYour pronouns are now ${avatar.getPronouns()}.\n`,
      MessageApi.Topics.world.identity.change
    );
    return { success: true, summary: `pronouns set to ${avatar.getPronouns()}` };
  }

  private executeShow(avatar: Avatar, context: CommandContext): CommandResult {
    const body = Mml.fromMarkup(
      [
        '',
        'Player Character Settings:',
        '',
        `  Name:     ${avatar.getFullName()}`,
        `  Pronouns: ${avatar.getPronouns()}`,
        '',
      ].join('\n')
    );
    this.send(context, body);
    return {
      success: true,
      summary: `${avatar.getFullName()} (${avatar.getPronouns()})`,
    };
  }

  private send(
    context: CommandContext,
    body: Mml,
    topic: string = MessageApi.Topics.world.perception.look
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic(topic)
      .toSelf(body)
      .send();
  }
}
