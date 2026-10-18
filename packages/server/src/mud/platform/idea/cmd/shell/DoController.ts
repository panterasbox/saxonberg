/**
 * DoController — `do <name> [with <arg>]`: run a named script.
 *
 * The named twin of `script <body>`: it runs a session `def` the player
 * typed, or a script saved in their home's `scripts/` folder, binding the
 * first parameter from `with <arg>`. The script runs paced by the
 * coroutine (its engaged steps trickle out); this controller dispatches it
 * and declines when no script of that name exists.
 *
 * ⚠⚠ Ungated, and that is the point. This was `make`, behind crafting's
 * knowledge gate, so a script runner pretended to be a craft. A script is
 * just commands: each one still meets its own gates (a `cook` inside it is
 * refused exactly as a typed `cook` would be), so running it grants and
 * skips nothing. See docs/subsystems/scripting.md § Named scripts.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { ScriptApi } from '../../../../api/script';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

interface DoModel extends CommandModel {
  name: string;
  arg?: string;
}

export default class DoController extends CommandController<DoModel> {
  async execute(model: DoModel, context: CommandContext): Promise<void> {
    const name = (model.name ?? '').trim();
    const args = model.arg ? [model.arg] : [];
    const invoked = name !== '' && (await ScriptApi.invoke(name, args));
    if (!invoked) {
      MessageApi.scene(context.commandGiver)
        .topic('shell.result')
        .toSelf(
          Mml.compose`You have no script called '${name}'. Write one with \`def\`, or save it in your scripts folder.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'unknown-script',
        detail: name,
      });
    }
    // On success the script runs detached and paced; its own steps narrate.
  }
}
