/**
 * ScriptController — `script <body>`.
 *
 * Runs a multi-statement script body over the real command bus. A thin
 * shell over `ScriptApi.run`: the interpreter parses the body and
 * dispatches each statement as the acting actor (derived from execution
 * context — the ambient command frame's giver, or the planted frame when
 * this command ran async).
 *
 * The verb exists to give the prompt-typed script surface a home that
 * routes through the normal command path (`_executeOne`), so it inherits
 * the `async:` spec field and the reserved `--async` / `--sync` flags
 * with no special-casing. Sync by default (no `async:` in the YAML);
 * `script --async <body>` detaches. The bare typed-script line (a
 * multi-statement line with no `script` prefix) is the unflaggable sync
 * sibling, handled inline in `executeCommand`.
 *
 * On success the body may run to completion (no suspension) or detach
 * into a paced background coroutine at its first `wait` / engaged step;
 * either way `ScriptApi.run` resolves and the pre-suspension notes ride
 * this command's single dispatch-response envelope.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { ScriptApi } from '../../../api/script';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';

interface ScriptModel extends CommandModel {
  body: string;
}

export default class ScriptController extends CommandController<ScriptModel> {
  async execute(model: ScriptModel, context: CommandContext): Promise<void> {
    const source = (model.body ?? '').trim();
    if (!source) {
      MessageApi.scene(context.commandGiver)
        .topic('shell.result')
        .toSelf(Mml.fromMarkup('\nUsage: script <statements>\n'))
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'empty-script',
        detail: 'no script body',
      });
      return;
    }
    await ScriptApi.run(source);
  }
}
