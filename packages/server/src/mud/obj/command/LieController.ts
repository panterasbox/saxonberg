import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import { PostureApi } from '../../api/posture';
import { Postures } from '../../lib/slot/Postured';

interface LieModel extends CommandModel {
  target: MqlOneResult;
}

export class LieController extends CommandController<LieModel> {
  execute(model: LieModel, context: CommandContext): CommandResult {
    return PostureApi.transferPosture({
      verb: 'lie',
      posture: Postures.Lie,
      target: model.target,
      context,
      successSelf: 'You lie down.',
      successPeers: '{name} lies down.',
    });
  }
}
