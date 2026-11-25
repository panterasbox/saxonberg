/**
 * ProgramRetitleController — `program retitle <name> <title…>`: the owner's
 * pen changes the title (stream arrival D11).
 */

import type { CommandContext } from '../../../../api/command';
import { StreamApi } from '../../../../api/stream';
import { ProgramControllerBase, type ProgramModel } from './ProgramControllerBase';

export default class ProgramRetitleController extends ProgramControllerBase {
  async execute(model: ProgramModel, context: CommandContext): Promise<void> {
    const answer = await StreamApi.amendProgram(this.nameOf(model), { title: model.title ?? '' });
    if (!answer.ok) return this.refuse(context, answer);
    return this.tell(context, `'${answer.program.getName()}' is titled "${answer.program.getTitle()}".`);
  }
}
