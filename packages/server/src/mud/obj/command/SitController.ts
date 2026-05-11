/**
 * SitController — set actor.posture to Sit on a posture-bearing slot
 * of the target host. Atomicity (vacate any current posture-bearing
 * slot before occupying the new one) is centralized in
 * `PostureApi.transferPosture`.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import { PostureApi } from '../../api/posture';
import { Postures } from '../../lib/slot/Postured';

interface SitModel extends CommandModel {
  target: MqlOneResult;
}

export class SitController extends CommandController<SitModel> {
  execute(model: SitModel, context: CommandContext): CommandResult {
    return PostureApi.transferPosture({
      verb: 'sit',
      posture: Postures.Sit,
      target: model.target,
      context,
      successSelf: 'You sit down.',
      successPeers: '{name} sits down.',
    });
  }
}
