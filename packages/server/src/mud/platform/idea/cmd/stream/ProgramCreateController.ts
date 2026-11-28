/**
 * ProgramCreateController — `program create <name> [--owner <path>]
 * [--title <title>]`: file a new program (stream arrival D10, D11).
 */

import type { CommandContext } from '../../../../api/command';
import { StreamApi } from '../../../../api/stream';
import { ProgramControllerBase, type ProgramModel } from './ProgramControllerBase';

export default class ProgramCreateController extends ProgramControllerBase {
  async execute(model: ProgramModel, context: CommandContext): Promise<void> {
    const name = this.nameOf(model);
    const opts: { title?: string; owner?: string } = {};
    if (model.title) opts.title = model.title;
    if (model.owner) opts.owner = model.owner;
    const answer = await StreamApi.createProgram(name, opts);
    if (!answer.ok) return this.refuse(context, answer);
    const p = answer.program;
    return this.tell(
      context,
      `Filed the program '${p.getName()}' — "${p.getTitle()}", owned by ${p.getOwnerName() || p.getOwner()}. ` +
        `Attach your channels with \`program channel ${p.getName()} <twitch|youtube|kick>\`.`,
    );
  }
}
