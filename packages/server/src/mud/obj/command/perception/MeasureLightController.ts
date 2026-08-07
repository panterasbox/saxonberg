/**
 * MeasureLightController — handler for `measure light [<location>]`.
 *
 * Reads `vision.signalAt(loc).intensity` (a
 * `Quantity<'lux'>`) and emits a single self-frame at
 * `world.perception.measurement.measure-light` with a canonical
 * readout. Photometer hosts the verb on its `inventory` bucket — the
 * player gains `measure light` while carrying one.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { PerceptionApi } from '../../../api/perception';
import { Light } from '../../../lib/perception/Light';
import { Mml } from '../../../api/mml';

interface MeasureLightModel extends CommandModel {
  location?: MqlOneResult;
}

export default class MeasureLightController extends CommandController<MeasureLightModel> {
  execute(model: MeasureLightModel, context: CommandContext): void {
    // Provenance: the instrument that afforded this verb, if any.
    const via = this.affordingSource(context);
    const giver = context.commandGiver;
    const target = model.location;
    if (!target || target.stuff === null) {
      const raw = target?.raw ?? '';
      MessageApi.scene(giver)
        .topic('world.perception.measurement.measure-light')
        .toSelf(Mml.compose`You don't see any '${raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'location', query: raw });
      return;
    }
    if (!MixinApi.isContainer(target.stuff)) {
      const detail = `${target.stuff.getPresentation()} isn't a place`;
      MessageApi.scene(giver)
        .topic('world.perception.measurement.measure-light')
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
    const intensity = light.intensity;

    const body = Mml.compose`light at ${Mml.location(loc)}: ${intensity.formatMml(undefined, undefined, { channel: 'light', via })}\n`;

    MessageApi.scene(context.commandGiver)
      .topic('world.perception.measurement.measure-light')
      .toSelf(body)
      .send();

    return;
  }
}
