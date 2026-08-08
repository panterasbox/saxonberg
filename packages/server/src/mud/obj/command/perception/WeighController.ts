/**
 * WeighController — handler for `weigh <target>`.
 *
 * Reads `target.getMass()` and emits a single self-frame with a
 * canonical kg readout. The mustBeTangible validator gates non-
 * Tangible targets at the command-frame layer.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';

interface WeighModel extends CommandModel {
  target?: MqlOneResult;
}

export default class WeighController extends CommandController<WeighModel> {
  execute(model: WeighModel, context: CommandContext): void {
    // Provenance: the instrument that afforded this verb, if any.
    const via = this.affordingSource(context);
    const giver = context.commandGiver;
    const target = model.target;
    if (!target || target.stuff === null) {
      const raw = target?.raw ?? '';
      MessageApi.scene(giver)
        .topic('sense.reading')
        .toSelf(Mml.compose`You don't see any '${raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: raw });
      return;
    }
    if (!MixinApi.isTangible(target.stuff as Stuff)) {
      const detail = `${target.stuff.getPresentation()} can't be weighed`;
      MessageApi.scene(giver)
        .topic('sense.reading')
        .toSelf(Mml.fromMarkup(detail))
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-tangible',
        detail,
      });
      return;
    }
    const mass = (target.stuff as Stuff & { getMass(): import('../../../lib/quantity').Quantity<'kg'> }).getMass();

    const body = Mml.compose`${Mml.thing(target.stuff)} weighs ${mass.formatMml(undefined, undefined, { channel: 'mass', via })}.\n`;

    MessageApi.scene(context.commandGiver)
      .topic('sense.reading')
      .toSelf(body)
      .send();

    return;
  }
}
