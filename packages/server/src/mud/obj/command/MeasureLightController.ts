/**
 * MeasureLightController — handler for `measure light [<location>]`.
 *
 * Reads `LightApi.lightAt(loc).intensity` (a `Quantity<'lux'>`) and
 * emits a single self-frame at `world.perception.look` with a
 * canonical readout. Photometer hosts the verb on its `inventory`
 * bucket — the player gains `measure light` while carrying one.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { LightApi } from '../../api/light';
import { Mml } from '../../api/mml';
import { DescribeApi } from '../../api/describe';

interface MeasureLightModel extends CommandModel {
  location?: MqlOneResult;
}

export class MeasureLightController extends CommandController<MeasureLightModel> {
  execute(model: MeasureLightModel, context: CommandContext): CommandResult {
    const target = model.location;
    if (!target || target.stuff === null) {
      return {
        success: false,
        summary: `you don't see any '${target?.raw ?? ''}' here`,
      };
    }
    if (!MixinApi.isContainer(target.stuff)) {
      return {
        success: false,
        summary: `${DescribeApi.getDisplayName(target.stuff, 'that')} isn't a place`,
      };
    }
    const loc = target.stuff as Stuff & Container;
    const light = LightApi.lightAt(loc);
    const intensity = light.intensity;

    const body = Mml.compose`light at ${Mml.location(loc)}: ${intensity.formatMml()}\n`;

    MessageApi.scene(context.commandGiver)
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(body)
      .send();

    return {
      success: true,
      summary: `measured ${intensity.format()}`,
    };
  }
}
