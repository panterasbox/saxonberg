/**
 * WeighController — handler for `weigh <target>`.
 *
 * Reads `target.getMass()` and emits a single self-frame with a
 * canonical kg readout. The mustBeTangible validator gates non-
 * Tangible targets at the command-frame layer.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { DescribeApi } from '../../api/describe';

interface WeighModel extends CommandModel {
  target?: MqlOneResult;
}

export class WeighController extends CommandController<WeighModel> {
  execute(model: WeighModel, context: CommandContext): CommandResult {
    const target = model.target;
    if (!target || target.stuff === null) {
      return {
        success: false,
        summary: `you don't see any '${target?.raw ?? ''}' here`,
      };
    }
    if (!MixinApi.isTangible(target.stuff as Stuff)) {
      return {
        success: false,
        summary: `${DescribeApi.getDisplayName(target.stuff, 'that')} can't be weighed`,
      };
    }
    const mass = (target.stuff as Stuff & { getMass(): import('../../lib/quantity').Quantity<'kg'> }).getMass();

    const body = Mml.compose`${Mml.name(target.stuff)} weighs ${mass.formatMml()}.\n`;

    MessageApi.scene(context.commandGiver)
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(body)
      .send();

    return {
      success: true,
      summary: `${DescribeApi.getDisplayName(target.stuff, 'it')}: ${mass.format()}`,
    };
  }
}
