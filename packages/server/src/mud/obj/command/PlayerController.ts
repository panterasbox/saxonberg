/**
 * PlayerController — manage player character settings.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { Pronouns } from '@saxonberg/types';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { Avatar } from '../Avatar';

interface PlayerModel extends CommandModel {
  name?: string;
  surname?: string;
  pronouns?: string;
}

export class PlayerController extends CommandController<PlayerModel> {
  execute(model: PlayerModel, context: CommandContext): CommandResult {
    const avatar = context.commandGiver;
    if (!(avatar instanceof Avatar)) {
      return {
        success: false,
        summary: 'only a player character can use the player command',
      };
    }

    switch (model.subcommand) {
      case 'name':
        return this.executeName(model, avatar, context);
      case 'pronouns':
        return this.executePronouns(model, avatar, context);
      case 'show':
        return this.executeShow(avatar, context);
      default:
        return {
          success: false,
          summary: `unknown subcommand: ${model.subcommand ?? '(none)'}`,
        };
    }
  }

  private executeName(
    model: PlayerModel,
    avatar: Avatar,
    context: CommandContext
  ): CommandResult {
    const name = model.name;
    const surname = model.surname;
    if (!name) {
      return { success: false, summary: 'name required' };
    }
    avatar.setName(name);
    if (surname !== undefined) {
      avatar.setSurname(surname || undefined);
    }

    this.send(
      context,
      Mml.compose`\nYour name is now ${avatar.getFullName()}.\n`,
      MessageApi.Topics.world.identity.change
    );
    return { success: true, summary: `name set to ${avatar.getFullName()}` };
  }

  private executePronouns(
    model: PlayerModel,
    avatar: Avatar,
    context: CommandContext
  ): CommandResult {
    const pronouns = model.pronouns;
    if (!pronouns) {
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

    const pronounsLower = pronouns.toLowerCase();
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
