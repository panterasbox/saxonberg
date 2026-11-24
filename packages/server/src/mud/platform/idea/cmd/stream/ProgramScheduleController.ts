/**
 * ProgramScheduleController — `program schedule <name> <line…>`: one free
 * line saying when the next show is; `--clear` removes it (stream arrival
 * D10, D11).
 */

import type { CommandContext } from '../../../../api/command';
import { StreamApi } from '../../../../api/stream';
import { ProgramControllerBase, type ProgramModel } from './ProgramControllerBase';

export default class ProgramScheduleController extends ProgramControllerBase {
  async execute(model: ProgramModel, context: CommandContext): Promise<void> {
    // `--clear` says no next show; the line is otherwise the schedule.
    const schedule = model.clear ? '' : (model.line ?? '').trim();
    const answer = await StreamApi.amendProgram(this.nameOf(model), { schedule });
    if (!answer.ok) return this.refuse(context, answer);
    const said = answer.program.getSchedule();
    return this.tell(
      context,
      said ? `'${answer.program.getName()}' — next show: ${said}` : `'${answer.program.getName()}' says no next show.`,
    );
  }
}
