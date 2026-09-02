/**
 * PourController — `pour X into Y`, `pour N unit M into Y`.
 *
 * Pours liquid from holder X (a vessel by name, or a material reached
 * by keyword / `:b`) into holder Y. The amount is the measure hint on
 * the source field (`pour 2 cups water` → 2 cups; `pour water:{99 cups}`
 * → strict 99 cups) or, absent one, the whole source clamped to Y's
 * headroom. Thin direction over `BulkableApi.transfer`, which owns the
 * material-compatibility check, the overflow clamp, and the
 * open-vessel drain-through cascade.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { BulkableApi } from '../../../../api/bulk';
import { MixinApi } from '../../../../api/mixin';
import { AdvancementApi } from '../../../../api/advancement';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

const TOPIC = 'act.deed';

interface PourModel extends CommandModel {
  source: MqlOneResult;
  target: MqlOneResult;
  /** `--amount 2cups` — how much to move. Absent ⇒ as much as fits. */
  amount?: string;
  /** `--exact` — take the full measure or none of it. */
  exact?: boolean;
}

export default class PourController extends CommandController<PourModel> {
  async execute(model: PourModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const source = model.source.stuff;
    const target = model.target.stuff;

    if (!source) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.source.raw}' to pour.`)
        .send();
      context.note({ kind: 'empty-result', field: 'source', query: model.source.raw });
      return;
    }
    if (!target) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' to pour into.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: model.target.raw });
      return;
    }

    const fromSlot = BulkableApi.slotFor(source, model.source.via?.bulk?.affordance);
    const toSlot = BulkableApi.slotFor(target, model.target.via?.bulk?.affordance);
    if (fromSlot === null) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's nothing to pour out of ${Mml.thing(source)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-holder',
        detail: 'source has no bulk slot',
      });
      return;
    }
    if (toSlot === null) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You can't pour anything into ${Mml.thing(target)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-holder',
        detail: 'target has no bulk slot',
      });
      return;
    }

    const amount = BulkableApi.amountFromOption(
      model.amount,
      { kind: 'all' },
      model.exact === true,
    );
    const result = BulkableApi.transfer(fromSlot, toSlot, amount);
    for (const note of result.notes) context.note(note);

    // The rack credit (fermentation W7/D9): drawing off a FINISHED
    // batch is the craft's timing act — credit `fermenting` at the
    // deed (the WaterController shape; no credit for an idle pour).
    if (result.applied > 0 && MixinApi.isFermenting(source)) {
      const phase = source.getFermentPhase();
      if (phase === 'finished' || phase === 'turned') {
        try {
          await AdvancementApi.recordDeed(giver, {
            discipline: 'fermenting',
            difficulty: 'easy',
            outcome: 'success',
          });
        } catch (err) {
          console.warn('PourController: recording the deed failed:', err);
        }
      }
    }

    // Drain-through: an open destination didn't retain the liquid.
    if (result.status === 'drained') {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`The liquid runs straight through ${Mml.thing(target)} and pools on the floor.`,
        )
        .toPeers(
          Mml.compose`${Mml.actor(giver)} pours liquid through ${Mml.thing(target)}; it pools on the floor.`,
        )
        .send();
      return;
    }

    if (result.applied <= 0) {
      // Distinguish material mismatch from strict over-pour from empty.
      const mismatch = result.notes.some(
        (n) => n.kind === 'target-declined' && n.reason === 'material-mismatch',
      );
      const rejected = result.notes.some(
        (n) => n.kind === 'quantity-clamped-rejected',
      );
      const line = mismatch
        ? Mml.compose`That won't mix with what's already in ${Mml.thing(target)}.`
        : rejected
          ? Mml.compose`That's more than will fit in ${Mml.thing(target)}.`
          : Mml.compose`There's nothing to pour.`;
      MessageApi.scene(giver).topic(TOPIC).toSelf(line).send();
      return;
    }

    // Success (possibly a lenient partial — the clamp note is already
    // forwarded; the prose stays the same).
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You pour from ${Mml.thing(source)} into ${Mml.thing(target)}.`)
      .toPeers(
        Mml.compose`${Mml.actor(giver)} pours from ${Mml.thing(source)} into ${Mml.thing(target)}.`,
      )
      .send();
  }
}
