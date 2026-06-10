/**
 * PlayController — the `play <playerId>` verb, available only to a
 * `Login` in the character-select phase. Hands off to the chosen
 * character (validates ownership, transfers the Interactive, starts the
 * avatar's session, destructs Login). The selection logic lives on
 * `Login.playCharacter`; this is the thin command surface over it.
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../api/command';
import type Login from '../Login';

interface PlayModel extends CommandModel {
  playerId?: string;
}

export default class PlayController extends CommandController<PlayModel> {
  async execute(model: PlayModel, context: CommandContext): Promise<void> {
    const login = context.commandGiver as unknown as Login;
    const playerId = (model.playerId ?? '').trim();
    if (!playerId) {
      context.note({
        kind: 'controller-rejected',
        reason: 'play-needs-id',
        detail: 'Usage: play <playerId>',
      });
      return;
    }
    const ok = await login.playCharacter(playerId);
    if (!ok) {
      context.note({
        kind: 'controller-rejected',
        reason: 'unknown-character',
        detail: playerId,
      });
    }
  }
}
