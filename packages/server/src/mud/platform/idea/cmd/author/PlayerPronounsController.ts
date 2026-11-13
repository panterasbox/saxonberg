/**
 * PlayerPronounsController — `player pronouns <pronouns>` — set the
 * pronouns the game's prose uses for you (over {@link
 * PlayerControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import type { Pronouns } from '@saxonberg/types';
import { Mml } from '../../../../api/mml';
import type Avatar from '../../../../lib/character/Avatar';
import { PlayerControllerBase, type PlayerModel } from './PlayerControllerBase';

export default class PlayerPronounsController extends PlayerControllerBase {
  execute(model: PlayerModel, context: CommandContext): void {
    // requiresAvatar validator guarantees this cast.
    const avatar = context.commandGiver as Avatar;
    const pronouns = model.pronouns;
    if (!pronouns) {
      PlayerControllerBase.send(context, Mml.fromMarkup('\npronouns required\n'));
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
      PlayerControllerBase.send(context, Mml.fromMarkup(`\n${detail}\n`));
      context.note({
        kind: 'controller-rejected',
        reason: 'invalid-pronouns',
        detail,
      });
      return;
    }

    avatar.setPronouns(pronounsLower as Pronouns);
    PlayerControllerBase.send(
      context,
      Mml.compose`\nYour pronouns are now ${avatar.getPronouns()}.\n`,
      'act.deed.change'
    );
  }
}
