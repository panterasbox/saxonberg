/**
 * ClearController — the `clear` verb. Empties the player's terminal
 * scrollback (the classic shell `clear`).
 *
 * Terminal scrollback is pure client-view state, but the verb still
 * rides the command bus like every other command: discoverable in
 * `help`, echoed in the command bar, dispatched through the normal
 * pipeline. The controller emits a single signal frame on
 * `shell.control` whose body is empty — an empty body renders
 * no scrollback line (the client's frame buffer skips bodyless
 * frames), so the frame is invisible except to the client's topic
 * handler, which empties the buffer.
 *
 * Sequencing is deliberate: the dispatcher fires the `> clear` input
 * echo at start-of-dispatch, BEFORE this controller runs, so the clear
 * signal arrives after it and wipes the echo too — leaving a genuinely
 * clean screen rather than a lone `> clear` line.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';

export default class ClearController extends CommandController {
  execute(_model: CommandModel, ctx: CommandContext): void {
    MessageApi.scene(ctx.commandGiver)
      .topic('shell.control')
      .tags(['control:clear'])
      .toSelf(Mml.compose``)
      .send();
  }
}
