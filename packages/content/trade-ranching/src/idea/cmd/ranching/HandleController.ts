/**
 * HandleController — `handle <animal>`, and ⭐⭐ **precision costs an
 * act** (D24).
 *
 * ⭐⭐ **The controller is machinery; the ANIMAL owns the act.** What
 * working a beast does to it and tells you lives on
 * `HandledMixin.workedOver` — see `../../../lib/Handled` for the whole
 * argument, the rail-slam hazard and the flesh score. This file resolves
 * the target, sends the scene the animal composed, and credits the deed.
 *
 * ⚠ It stayed a controller rather than becoming two: `lint:verb-collisions`
 * refuses a second view claiming `handle`, correctly, and a
 * `typeof target.colonyReading === 'function'` branch here would have been
 * the guard that tells you the host is wrong.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { RANCHING_TOPIC } from './DraftController';
import type { HandleReport } from '../../../lib/Handled';
import type Livestock from '../../../agent/Livestock';

/** The Discipline handling stock credits. */
export const STOCKMANSHIP = 'stockmanship';

interface HandleModel extends CommandModel {
  target?: MqlOneResult;
}

/** What the controller needs of any handled thing. */
type Handleable = Livestock & { workedOver(actor: unknown): HandleReport };

export default class HandleController extends CommandController<HandleModel> {
  async execute(model: HandleModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target?.stuff as Handleable | undefined;
    if (
      !target ||
      typeof target.getHandling !== 'function' ||
      typeof target.workedOver !== 'function'
    ) {
      this.decline(context, Mml.compose`That is not an animal you can work with.`, 'not-handleable');
      return;
    }

    const report = target.workedOver(giver);

    // The beat BEFORE the handling, when there was one — a separate
    // event, so a separate send.
    if (report.prelude) {
      MessageApi.scene(giver)
        .topic(RANCHING_TOPIC)
        .toSelf(report.prelude.self)
        .toPeers(report.prelude.peers)
        .send();
    }

    MessageApi.scene(giver)
      .topic(RANCHING_TOPIC)
      .toSelf(report.self)
      .toPeers(report.peers)
      .send();

    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: report.discipline ?? STOCKMANSHIP,
        difficulty: report.difficulty,
        outcome: 'success',
      });
    }
  }

  protected decline(
    context: CommandContext,
    prose: ReturnType<typeof Mml.compose>,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver).topic(RANCHING_TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}
