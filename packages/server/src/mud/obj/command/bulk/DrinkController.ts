/**
 * DrinkController — `drink X`.
 *
 * Consumes the whole of holder X's bulk slot (X reached by name or by
 * material keyword, e.g. `drink coffee`). A thin direction over
 * `BulkableApi.transfer` with a `null` discard sink. The consumed
 * `{ material, amount }` is handed to the actor's `ingest` seam, whose
 * v1 default is a no-op.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import { BulkableApi } from '../../../api/bulk';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';

const TOPIC = 'world.narration.action';

interface DrinkModel extends CommandModel {
  target: MqlOneResult;
}

export default class DrinkController extends CommandController<DrinkModel> {
  execute(model: DrinkModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const target = model.target.stuff;

    if (!target) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' to drink.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: model.target.raw });
      return;
    }

    const fromSlot = BulkableApi.slotFor(target, model.target.via?.bulk?.affordance);
    if (fromSlot === null || fromSlot.isEmpty()) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's nothing to drink in ${Mml.item(target)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'nothing-to-drink',
        detail: 'source slot empty or absent',
      });
      return;
    }

    // Capture the material BEFORE the transfer empties (and clears) the
    // slot, for the ingest hand-off and the prose.
    const material = fromSlot.getMaterial();
    const result = BulkableApi.transfer(fromSlot, null, { kind: 'all' });
    for (const note of result.notes) context.note(note);

    if (result.applied <= 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's nothing to drink in ${Mml.item(target)}.`)
        .send();
      return;
    }

    BulkableApi.ingest(giver, material, result.applied);

    const appearance = material?.getAppearance() || 'it';
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You drink the ${appearance}.`)
      .toPeers(Mml.compose`${Mml.name(giver)} drinks from ${Mml.item(target)}.`)
      .send();
  }
}
