/**
 * StrewController — `strew <rushes|sawdust>`: lay a carried absorbent over
 * the floor where you stand (cleanliness D15).
 *
 * ⭐ The floor decides (`FloorMixin.strew`): a floor that takes no soil —
 * open water, a sheet of ice — refuses. The strewing then drinks up what
 * is spilt on it (blood, grease), and the next sweep takes the lot.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

const TOPIC = 'act.deed';

interface StrewModel extends CommandModel {
  item?: MqlOneResult;
}

export default class StrewController extends CommandController<StrewModel> {
  async execute(model: StrewModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const item = model.item?.stuff ?? null;
    const room = context.location ?? null;
    const floor =
      room && MixinApi.isAdornable(room) ? (room.getFloor() as unknown as Stuff | null) : null;
    const decline = (line: ReturnType<typeof Mml.compose>, reason: string): void => {
      MessageApi.scene(giver).topic(TOPIC).toSelf(line).send();
      context.note({ kind: 'controller-rejected', reason });
    };
    if (!item) return decline(Mml.compose`Strew what?`, 'no-item');
    if (!floor || !MixinApi.isFloor(floor)) return decline(Mml.compose`There is no floor here to strew.`, 'no-floor');
    // ⭐ The act is the floor's (`strewWith`).
    const outcome = await floor.strewWith(item);
    if (!outcome.ok) {
      return outcome.reason === 'not-absorbent'
        ? decline(Mml.compose`${Mml.thing(item)} will not strew — it wants to be dry and loose and to soak things up, like rushes or sawdust.`, 'not-absorbent')
        : decline(Mml.compose`You could strew it, but it would only float away or slide about — this is no floor for strewing.`, 'floor-refuses');
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You strew ${outcome.name} over the floor.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} strews ${outcome.name} over the floor.`)
      .send();
  }
}
