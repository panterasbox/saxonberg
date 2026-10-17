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
import type Material from '../../../../lib/material/Material';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';
import { Quantity } from '../../../../lib/quantity';

const TOPIC = 'act.deed';
/** The compost a heap rots down into. */
const COMPOST = '/stuff/idea/material/bulk/compost';
/** Litres of compost per kilogram of heap (it settles). */
const LITRES_PER_KG = 1.5;

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
    const m = MixinApi.isTangible(heap) ? heap.getMaterial() : null;
    if (!m || !(m.hasTag('refuse') || m.hasTag('compost'))) {
      return decline(Mml.compose`${Mml.thing(heap)} is not rubbish.`, 'not-refuse');
    }
    if (
      midden === null ||
      !MixinApi.isBulkable(midden) ||
      !(midden.getTemplatePath() ?? '').endsWith('/midden')
    ) {
      return decline(Mml.compose`There is no midden here to throw it on.`, 'no-midden');
    }
    const kg = MixinApi.isTangible(heap) ? heap.getMass().rawValue() : 1;
    const held = midden.getBulkAmount('interior').rawValue();
    const cap = midden.getBulkCapacity('interior')?.rawValue() ?? Infinity;
    const litres = Math.min(kg * LITRES_PER_KG, Math.max(0, cap - held));
    if (!(litres > 0)) return decline(Mml.compose`${Mml.thing(midden)} is heaped as high as it will go.`, 'midden-full');
    const compost = StuffApi.findByTemplatePath<Material>(COMPOST);
    if (compost) midden.setBulkMaterial('interior', compost);
    midden.setBulkAmount('interior', Quantity.of(held + litres, 'L'));
    const name = heap.getPresentation();
    await StuffApi.destruct(heap);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You throw ${name} on ${Mml.thing(midden)}. It will rot down for the field.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} throws a heap on ${Mml.thing(midden)}.`)
      .send();
  }
}
