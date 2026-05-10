/**
 * AnalyzeLightController — handler for `analyze light [<location>]`.
 *
 * Renders the multi-line scene prose: aggregate lux + per-source
 * attribution + color temperature when set. The Avatar grants
 * `analyze` on its `self` bucket so the verb is always available
 * (pedagogical surface, no instrument required).
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
import { Quantity } from '../../lib/quantity';
import { DescribeApi } from '../../api/describe';
import { StuffApi } from '../../api/stuff';

interface AnalyzeLightModel extends CommandModel {
  location?: MqlOneResult;
}

export class AnalyzeLightController extends CommandController<AnalyzeLightModel> {
  execute(model: AnalyzeLightModel, context: CommandContext): CommandResult {
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

    const lines: Mml[] = [];
    lines.push(Mml.compose`Light analysis at ${Mml.location(loc)}:`);
    lines.push(Mml.compose`  total: ${light.intensity.formatMml()}`);
    if (light.color) {
      lines.push(Mml.compose`  color temperature: ${light.color.formatMml()}`);
    }
    if (light.sources.length === 0) {
      lines.push(Mml.compose`  contributing sources: none`);
    } else {
      lines.push(Mml.compose`  contributing sources:`);
      for (const s of light.sources) {
        const src = StuffApi.findById(s.stuffId);
        const sourceName = src
          ? Mml.name(src as Stuff)
          : Mml.fromMarkup(`<unknown>${s.stuffId}</unknown>`);
        const flux = Quantity.of(s.flux, 'lumen');
        if (s.colorK !== null) {
          const colorQ = Quantity.of(s.colorK, 'K');
          lines.push(
            Mml.compose`    - ${sourceName}: ${flux.formatMml()} @ ${colorQ.formatMml()}`
          );
        } else {
          lines.push(
            Mml.compose`    - ${sourceName}: ${flux.formatMml()}`
          );
        }
      }
    }

    let body = Mml.compose`\n`;
    for (const line of lines) {
      body = Mml.compose`${body}${line}\n`;
    }

    MessageApi.scene(context.commandGiver)
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(body)
      .send();

    return {
      success: true,
      summary: `analyzed light at ${DescribeApi.getDisplayName(loc, 'somewhere')}`,
    };
  }
}
