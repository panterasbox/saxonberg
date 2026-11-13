/**
 * PlayerNameController — `player name <name> [<surname>]` — set your
 * character's name (over {@link PlayerControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import type Avatar from '../../../../lib/character/Avatar';
import { PlayerControllerBase, type PlayerModel } from './PlayerControllerBase';

export default class PlayerNameController extends PlayerControllerBase {
  execute(model: PlayerModel, context: CommandContext): void {
    // requiresAvatar validator guarantees this cast.
    const avatar = context.commandGiver as Avatar;
    const name = model.name;
    const surname = model.surname;
    if (!name) {
      PlayerControllerBase.send(context, Mml.fromMarkup('\nname required\n'));
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

    PlayerControllerBase.send(
      context,
      Mml.compose`\nYour name is now ${avatar.getFullName()}.\n`,
      'act.deed.change'
    );
  }
}
