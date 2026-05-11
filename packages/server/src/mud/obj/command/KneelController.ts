import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import { PostureApi } from '../../api/posture';
import { Postures } from '../../lib/slot/Postured';

interface KneelModel extends CommandModel {
  target: MqlOneResult;
}

export class KneelController extends CommandController<KneelModel> {
  execute(model: KneelModel, context: CommandContext): CommandResult {
    return PostureApi.transferPosture({
      verb: 'kneel',
      posture: Postures.Kneel,
      target: model.target,
      context,
      successSelf: 'You kneel down.',
      successPeers: '{name} kneels down.',
    });
  }
}
