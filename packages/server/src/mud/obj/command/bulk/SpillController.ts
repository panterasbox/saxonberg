/**
 * SpillController — `spill X`.
 *
 * Empties holder X's bulk slot onto the floor: a thin direction over
 * `BulkableApi.transfer` with the floor's surface-bulk slot as the
 * destination and `{ kind: 'all' }` as the amount. The liquid pools as
 * the floor's surface bulk (a puddle). Unlike pour-into-an-open-vessel,
 * spill targets the floor directly regardless of closure.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import { BulkableApi } from '../../../api/bulk';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';

const TOPIC = 'world.narration.action';

interface SpillModel extends CommandModel {
  target: MqlOneResult;
}

export default class SpillController extends CommandController<SpillModel> {
  execute(model: SpillModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const target = model.target.stuff;

    if (!target) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' to spill.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: model.target.raw });
      return;
    }

    const fromSlot = BulkableApi.slotFor(target, model.target.via?.bulk?.affordance);
    if (fromSlot === null || fromSlot.isEmpty()) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.item(target)} is empty.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'nothing-to-spill',
        detail: 'source slot empty or absent',
      });
      return;
    }

    const floorSlot = BulkableApi.floorSurfaceNear(target);
    // No floor (defensive — the demo always has one): discard with a
    // note rather than retaining the matter.
    const result = BulkableApi.transfer(fromSlot, floorSlot, { kind: 'all' });
    for (const note of result.notes) context.note(note);

    if (result.applied <= 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Nothing spills out of ${Mml.item(target)}.`)
        .send();
      return;
    }

    const pooled = floorSlot !== null;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        pooled
          ? Mml.compose`You spill ${Mml.item(target)} out; a puddle pools on the floor.`
          : Mml.compose`You spill ${Mml.item(target)} out; the liquid splashes away.`,
      )
      .toPeers(
        Mml.compose`${Mml.name(giver)} spills ${Mml.item(target)} out onto the floor.`,
      )
      .send();
  }
}
