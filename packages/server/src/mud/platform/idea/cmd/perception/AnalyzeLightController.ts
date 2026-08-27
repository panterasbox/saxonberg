/**
 * AnalyzeLightController — handler for `analyze light [<location>]`.
 *
 * Renders the multi-line scene prose: aggregate lux + per-source
 * attribution + color temperature when set. The Avatar grants
 * `analyze` on its `self` bucket so the verb is always available
 * (pedagogical surface, no instrument required).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { PerceptionApi } from '../../../../api/perception';
import { Light } from '../../../../lib/perception/Light';
import { Mml } from '../../../../api/mml';
import { Quantity } from '../../../../lib/quantity';
import { StuffApi } from '../../../../api/stuff';

interface AnalyzeLightModel extends CommandModel {
  location?: MqlOneResult;
}

export default class AnalyzeLightController extends CommandController<AnalyzeLightModel> {
  execute(model: AnalyzeLightModel, context: CommandContext): void {
    // Provenance: the instrument that afforded this verb, if any.
    const via = this.affordingSource(context);
    const giver = context.commandGiver;
    const target = model.location;
    if (!target || target.stuff === null) {
      const raw = target?.raw ?? '';
      MessageApi.scene(giver)
        .topic('sense.reading')
        .toSelf(Mml.compose`You don't see any '${raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'location', query: raw });
      return;
    }
    if (!MixinApi.isContainer(target.stuff)) {
      const detail = `${target.stuff.getPresentation()} isn't a place`;
      MessageApi.scene(giver)
        .topic('sense.reading')
        .toSelf(Mml.fromMarkup(detail))
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-place',
        detail,
      });
      return;
    }
    const loc = target.stuff as Stuff & Container;
    const vision = PerceptionApi.modalityByName('vision');
    const light = (vision.signalAt(loc) as Light | null) ?? Light.ZERO;

    const lines: Mml[] = [];
    lines.push(Mml.compose`Light analysis at ${Mml.location(loc)}:`);
    lines.push(Mml.compose`  total: ${light.intensity.formatMml(undefined, undefined, { channel: 'light', via })}`);
    if (light.colorTemperature) {
      lines.push(
        Mml.compose`  color temperature: ${light.colorTemperature.formatMml(undefined, undefined, { channel: 'light', via })}`
      );
    }
    if (light.sources.length === 0) {
      lines.push(Mml.compose`  contributing sources: none`);
    } else {
      lines.push(Mml.compose`  contributing sources:`);
      for (const s of light.sources) {
        const src = StuffApi.findById(s.stuffId);
        const sourceName = src
          ? Mml.thing(src as Stuff)
          : Mml.fromMarkup(`<unknown>${s.stuffId}</unknown>`);
        const flux = Quantity.of(s.flux, 'lumen');
        if (s.colorTemperature !== null) {
          const colorTempQ = Quantity.of(s.colorTemperature, 'K');
          lines.push(
            Mml.compose`    - ${sourceName}: ${flux.formatMml(undefined, undefined, { channel: 'light', via })} @ ${colorTempQ.formatMml(undefined, undefined, { channel: 'light', via })}`
          );
        } else {
          lines.push(
            Mml.compose`    - ${sourceName}: ${flux.formatMml(undefined, undefined, { channel: 'light', via })}`
          );
        }
      }
    }

    let body = Mml.compose`\n`;
    for (const line of lines) {
      body = Mml.compose`${body}${line}\n`;
    }

    MessageApi.scene(context.commandGiver)
      .topic('sense.reading')
      .toSelf(body)
      .send();

    return;
  }
}
