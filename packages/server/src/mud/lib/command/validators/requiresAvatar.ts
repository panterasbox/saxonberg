/**
 * requiresAvatar — verb-level precondition. Rejects the command
 * when the giver isn't an Avatar (player character).
 *
 * Tagged on verbs whose semantics target player-character state —
 * the `player` verb's name / pronouns / show subcommands. NPCs and
 * other Characters fail this check.
 */

import type { CommandValidator } from '../../../api/command';
import { Avatar } from '../../../obj/Avatar';

const validator: CommandValidator = (context) => {
  if (context.commandGiver instanceof Avatar) return undefined;
  return `this character is not a player character`;
};

export default validator;
