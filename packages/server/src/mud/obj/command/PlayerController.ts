/**
 * PlayerController — manage player character settings.
 *
 * Cross-cutting concerns the framework handles, not us:
 *   - `requiresAvatar` validator (in player.yaml) gates the giver type.
 *   - Unknown-subcommand rejection is dispatcher-side — `assemble`
 *     returns `error: 'unknown-subcommand'` before the controller
 *     is ever cloned.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../api/command';
import type { Pronouns } from '@saxonberg/types';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import type { Avatar } from '../Avatar';

interface PlayerModel extends CommandModel {
  name?: string;
  surname?: string;
  pronouns?: string;
}

export class PlayerController extends CommandController<PlayerModel> {
  execute(model: PlayerModel, context: CommandContext): void {
    // requiresAvatar validator guarantees this cast.
    const avatar = context.commandGiver as Avatar;

    switch (model.subcommand) {
      case 'name':
        return this.executeName(model, avatar, context);
      case 'pronouns':
        return this.executePronouns(model, avatar, context);
      case 'show':
        return this.executeShow(avatar, context);
    }
  }

  private executeName(
    model: PlayerModel,
    avatar: Avatar,
    context: CommandContext
  ): void {
    const name = model.name;
    const surname = model.surname;
    if (!name) {
      this.send(context, Mml.fromMarkup('\nname required\n'));
      context.note({
        kind: 'controller-rejected',
        reason: 'name-required',
        detail: 'name required',
      });
      return;
    }
    avatar.setName(name);
    if (surname !== undefined) {
      avatar.setSurname(surname || undefined);
    }

    this.send(
      context,
      Mml.compose`\nYour name is now ${avatar.getFullName()}.\n`,
      'world.identity.change'
    );
    return;
  }

  private executePronouns(
    model: PlayerModel,
    avatar: Avatar,
    context: CommandContext
  ): void {
    const pronouns = model.pronouns;
    if (!pronouns) {
      this.send(context, Mml.fromMarkup('\npronouns required\n'));
      context.note({
        kind: 'controller-rejected',
        reason: 'pronouns-required',
        detail: 'pronouns required',
      });
      return;
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
      const detail = `invalid pronouns. valid: ${validPronouns.join(', ')}`;
      this.send(context, Mml.fromMarkup(`\n${detail}\n`));
      context.note({
        kind: 'controller-rejected',
        reason: 'invalid-pronouns',
        detail,
      });
      return;
    }

    avatar.setPronouns(pronounsLower as Pronouns);
    this.send(
      context,
      Mml.compose`\nYour pronouns are now ${avatar.getPronouns()}.\n`,
      'world.identity.change'
    );
    return;
  }

  private executeShow(avatar: Avatar, context: CommandContext): void {
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
    return;
  }

  private send(
    context: CommandContext,
    body: Mml,
    topic: string = 'system.shell.player'
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic(topic)
      .toSelf(body)
      .send();
  }
}
