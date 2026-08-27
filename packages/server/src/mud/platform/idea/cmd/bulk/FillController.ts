/**
 * FillController — `fill X from Y`.
 *
 * Fills holder X's bulk slot to capacity from source Y, a thin
 * direction over `BulkableApi.transfer` (amount = X's remaining
 * headroom). The urn is an unbounded source, so refills never run dry.
 * Outcome rides the dispatch-response envelope; controllers return
 * void.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { BulkableApi, type TransferAmount } from '../../../../api/bulk';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

const TOPIC = 'act.deed';

interface FillModel extends CommandModel {
  target: MqlOneResult;
  source: MqlOneResult;
}

export default class FillController extends CommandController<FillModel> {
  execute(model: FillModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const target = model.target.stuff;
    const source = model.source.stuff;

    if (!target) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' to fill.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: model.target.raw });
      return;
    }
    if (!source) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.source.raw}' to fill from.`)
        .send();
      context.note({ kind: 'empty-result', field: 'source', query: model.source.raw });
      return;
    }

    const toSlot = BulkableApi.slotFor(target, model.target.via?.bulk?.affordance);
    if (toSlot === null) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You can't fill ${Mml.thing(target)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-holder',
        detail: 'target has no bulk slot',
      });
      return;
    }
    const fromSlot = BulkableApi.slotFor(source, model.source.via?.bulk?.affordance);
    if (fromSlot === null) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's nothing to fill from in ${Mml.thing(source)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-holder',
        detail: 'source has no bulk slot',
      });
      return;
    }

    const remaining = toSlot.remaining();
    const amount: TransferAmount = Number.isFinite(remaining)
      ? { kind: 'measure', litres: remaining, mode: 'lenient' }
      : { kind: 'all' };
    const result = BulkableApi.transfer(fromSlot, toSlot, amount);
    for (const note of result.notes) context.note(note);

    if (result.applied <= 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You can't fill ${Mml.thing(target)} from ${Mml.thing(source)}.`)
        .send();
      return;
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You fill ${Mml.thing(target)} from ${Mml.thing(source)}.`)
      .toPeers(
        Mml.compose`${Mml.actor(giver)} fills ${Mml.thing(target)} from ${Mml.thing(source)}.`,
      )
      .send();
  }
}
