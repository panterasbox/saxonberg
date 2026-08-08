/**
 * SipController — `sip X`.
 *
 * Consumes a fixed small amount ({@link SIP_LITRES}) from holder X's
 * bulk slot (X by name or material keyword). Like `drink` but bounded,
 * so the holder isn't emptied. A thin direction over
 * `BulkableApi.transfer` with a `null` discard sink; the consumed
 * `{ material, amount }` rides the actor's `ingest` seam (v1 no-op).
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import { BulkableApi } from '../../../api/bulk';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';

const TOPIC = 'act.deed';

/** A single sip, in litres (~two tablespoons). */
const SIP_LITRES = 0.03;

interface SipModel extends CommandModel {
  target: MqlOneResult;
}

export default class SipController extends CommandController<SipModel> {
  execute(model: SipModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const target = model.target.stuff;

    if (!target) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' to sip.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: model.target.raw });
      return;
    }

    const fromSlot = BulkableApi.slotFor(target, model.target.via?.bulk?.affordance);
    if (fromSlot === null || fromSlot.isEmpty()) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's nothing to sip in ${Mml.item(target)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'nothing-to-sip',
        detail: 'source slot empty or absent',
      });
      return;
    }

    const material = fromSlot.getMaterial();
    const payload = fromSlot.getPayload();
    const result = BulkableApi.transfer(fromSlot, null, {
      kind: 'measure',
      litres: SIP_LITRES,
      mode: 'lenient',
    });
    for (const note of result.notes) context.note(note);

    if (result.applied <= 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's nothing to sip in ${Mml.item(target)}.`)
        .send();
      return;
    }

    BulkableApi.ingest(giver, material, result.applied, payload);

    const appearance =
      payload?.appearance ?? (material?.getAppearance() || 'it');
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You take a sip of the ${appearance}.`)
      .toPeers(Mml.compose`${Mml.name(giver)} sips from ${Mml.item(target)}.`)
      .send();
  }
}
