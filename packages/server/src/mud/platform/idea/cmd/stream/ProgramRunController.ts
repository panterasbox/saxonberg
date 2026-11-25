/**
 * ProgramRunController — `program run <name>`: take the program's chair
 * (stream arrival D12). The pen and the one-chair rule are `StreamLogic`'s;
 * this parses and renders.
 */

import type { CommandContext } from '../../../../api/command';
import { StreamApi } from '../../../../api/stream';
import { ProgramControllerBase, type ProgramModel } from './ProgramControllerBase';

export default class ProgramRunController extends ProgramControllerBase {
  async execute(model: ProgramModel, context: CommandContext): Promise<void> {
    const answer = await StreamApi.runProgram(this.nameOf(model));
    if (!answer.ok) return this.refuse(context, answer);
    const p = answer.program;
    const carriers = p.feedCarriers().map((c) => this.carrierLabel(c));
    return this.tell(
      context,
      `Your stream runs '${p.getName()}' — "${p.getTitle()}". ` +
        (carriers.length > 0
          ? `Rodney shows its chat from ${carriers.join(', ')}.`
          : 'It has no channel yet, so Rodney shows no chat — `program channel <name> <carrier>` attaches one.'),
    );
  }
}
