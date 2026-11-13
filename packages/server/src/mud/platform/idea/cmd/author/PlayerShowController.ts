/**
 * PlayerShowController — `player show` — print your character's current
 * settings (over {@link PlayerControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import type Avatar from '../../../../lib/character/Avatar';
import { PlayerControllerBase, type PlayerModel } from './PlayerControllerBase';

export default class PlayerShowController extends PlayerControllerBase {
  execute(_model: PlayerModel, context: CommandContext): void {
    // requiresAvatar validator guarantees this cast.
    const avatar = context.commandGiver as Avatar;
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
    PlayerControllerBase.send(context, body);
  }
}
