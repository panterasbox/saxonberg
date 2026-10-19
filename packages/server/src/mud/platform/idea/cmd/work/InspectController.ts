/**
 * InspectController — `inspect <works>` (underwater D17). The works say
 * what is seen; the contract records that the inspector looked.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Inspectable } from '../../../../lib/employment/Inspectable';
import { MessageApi } from '../../../../api/message';
import { ContractApi } from '../../../../api/contract';
import { Mml } from '../../../../api/mml';

interface InspectModel extends CommandModel {
  target: MqlOneResult;
}

/** Does `s` speak the inspection protocol? */
function isInspectable(s: Stuff | null): s is Stuff & Inspectable {
  return s !== null &&
    typeof (s as unknown as { inspectionReport?: unknown }).inspectionReport === 'function' &&
    typeof (s as unknown as { inspectedWorks?: unknown }).inspectedWorks === 'function';
}

export default class InspectController extends CommandController<InspectModel> {
  async execute(model: InspectModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;
    if (!isInspectable(target)) {
      return this.refuse(
        context, 'act.deed',
        target ? `There is nothing about ${target.getPresentation()} to inspect.` : 'Inspect what?',
        'not-inspectable',
      );
    }
    const report = await target.inspectionReport(giver);
    const works = target.inspectedWorks();
    const done = await ContractApi.recordInspection(works.getIdentityPath() ?? '', works.getTemplatePath() ?? null);
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(report)
      .toPeers(Mml.compose`${Mml.actor(giver)} goes over ${Mml.thing(target)} closely.`)
      .send();
    if (done > 0) {
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.compose`That is the inspection done. The job can be completed at the board.`)
        .send();
    }
  }
}
