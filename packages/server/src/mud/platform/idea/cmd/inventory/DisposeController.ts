/**
 * DisposeController — `dispose <heap> [on <midden>]` (cleanliness D15,
 * D20): refuse goes on the midden, where it rots down for the field.
 *
 * ⭐ The heap BECOMES compost on the midden: its kilograms go into the
 * midden's heap as litres of compost — the same bulk `fill` takes a sack
 * of and `feed` works into a field. So what the house sweeps out and the
 * byre mucks out, the field takes back, by the shipped verbs.
 *
 * Only refuse (what its material says is `refuse` or `compost`); the
 * midden is a bulk holder in reach whose row IS one (`…/midden`).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import Midden from '../../../thing/Midden';

const TOPIC = 'act.deed';
interface DisposeModel extends CommandModel {
  heap?: MqlOneResult;
  midden?: MqlOneResult;
}

export default class DisposeController extends CommandController<DisposeModel> {
  async execute(model: DisposeModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const heap = model.heap?.stuff ?? null;
    const midden = model.midden?.stuff ?? null;
    const decline = (line: ReturnType<typeof Mml.compose>, reason: string): void => {
      MessageApi.scene(giver).topic(TOPIC).toSelf(line).send();
      context.note({ kind: 'controller-rejected', reason });
    };
    if (!heap) return decline(Mml.compose`Dispose of what?`, 'no-heap');
    if (!(midden instanceof Midden)) {
      return decline(Mml.compose`There is no midden here to throw it on.`, 'no-midden');
    }
    // ⭐ The act is the midden's: what it takes, how much, and the heap gone.
    const outcome = await midden.takeRefuse(heap);
    if (!outcome.ok) {
      return outcome.reason === 'not-refuse'
        ? decline(Mml.compose`${Mml.thing(heap)} is not rubbish.`, 'not-refuse')
        : decline(Mml.compose`${Mml.thing(midden)} is heaped as high as it will go.`, 'midden-full');
    }
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You throw ${outcome.name} on ${Mml.thing(midden)}. It will rot down for the field.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} throws a heap on ${Mml.thing(midden)}.`)
      .send();
  }
}
