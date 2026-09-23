/**
 * ScrubController — ⭐ **wash your hands** (recovery build, D10).
 *
 * Clean hands treat a wound without infecting it; dirty hands seed sepsis
 * (D11). `scrub` at water resets the body's `washedAt` stamp to now, so its
 * cleanliness reads full again. Afforded by the same `WaterFixture` as
 * `rinse`/`wash`/`cool` — you learn it standing at a basin.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlManyResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Hygiene } from '../../../../lib/vitals/Hygiene';
import { BulkableApi } from '../../../../api/bulk';

const TOPIC = 'act.deed';

interface ScrubModel extends CommandModel {
  water?: MqlManyResult;
}

export default class ScrubController extends CommandController<ScrubModel> {
  async execute(model: ScrubModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    if (!MixinApi.isHygiene(giver)) {
      return this.fail(context, 'You have no hands to wash.', 'no-hands');
    }
    const water = this.findWater(model.water);
    if (water === null) {
      return this.fail(
        context,
        'There is no water here to scrub with.',
        'no-water',
      );
    }
    (giver as Stuff & Hygiene).scrub();
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You scrub your hands clean under the water.`)
      .toPeers(Mml.compose`${Mml.actor(context.commandGiver)} scrubs their hands clean.`)
      .send();
  }

  /** First reachable non-crafted vessel holding water (the `rinse` read). */
  private findWater(bound: MqlManyResult | undefined): Stuff | null {
    for (const c of bound?.stuff ?? []) {
      if (!MixinApi.isBulkable(c) || MixinApi.isCrafted(c)) continue;
      const slot = BulkableApi.slotFor(c, undefined);
      if (!slot || slot.isEmpty()) continue;
      const m = slot.getMaterial();
      if (m?.hasTag('water')) return c;
    }
    return null;
  }

  private fail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: line });
  }
}
