/**
 * TanController — `tan <hide> [in <pit>]`, and ⭐⭐ **the verb is a
 * JUDGEMENT, not a transform.**
 *
 * ## What the act actually is
 *
 * Putting a skin in liquor takes a moment; tanning it takes three weeks.
 * So this verb does almost nothing: it lays the hide in the pit and the
 * hide's own clock does the work, reconciled on read against the liquor
 * it is standing in. `dry`'s twin — *put the thing where the conditions
 * are and come back* — and for the same reason: an engagement would hold
 * the hands for weeks, and a durative act you cannot walk away from is
 * not a trade, it is a cutscene.
 *
 * ⭐ **The decision is WHEN TO PULL IT**, and that is where the skill
 * lives. Typing `tan` a second time on a hide already in the pit is how
 * you check it; `get hide from pit` is how you commit. Too early and it
 * is thin; too late and the bark has eaten into the grain and nothing
 * brings it back.
 *
 * ## ⭐ The lift is the hide's (controllers-are-io D10)
 *
 * This verb lays in, and only lays in. Coming out is the hide's own rule on
 * leaving the pit (`TanningMixin.onLiftedFrom`), so no verb has to remember it.
 *
 * ## What it credits
 *
 * `leatherwork`, which this pack mints. Putting a skin down is `easy`;
 * **judging it out is `standard`**, and that asymmetry is the whole
 * pedagogy of the trade in one line.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import type {
  MqlManyResult,
  MqlOneResult,
} from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import Tanpit from '../../../thing/Tanpit';
import type Hide from '../../../thing/Hide';
import { LEATHERWORK, TAN_SOILS } from '../../../lib/Tanning';

const TOPIC = 'act.deed';

interface TanModel extends CommandModel {
  hide: MqlOneResult;
  pit?: MqlManyResult;
}

export default class TanController extends CommandController<TanModel> {
  async execute(model: TanModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const hide = model.hide?.stuff as (Stuff & Hide) | null;

    if (!hide) {
      this.decline(
        context,
        Mml.compose`You don't see any '${model.hide?.raw ?? ''}' to tan.`,
        'no-hide',
      );
      return;
    }

    const pit = this.findPit(model.pit, hide);
    if (!pit) {
      this.decline(
        context,
        Mml.compose`You would need a tanpit for that.`,
        'no-pit',
      );
      return;
    }

    // ⭐ Already in THIS pit: the second `tan` is how you check on it, and
    // the report is the answer. No act, no deed, no refusal — looking at
    // your own work is not a failure.
    if (
      MixinApi.isContainable(hide) &&
      hide.getContainer() === (pit as unknown as Stuff)
    ) {
      const report = hide.tanReport();
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You turn ${Mml.thing(hide)} over in the liquor. ${report.line}`,
        )
        .send();
      return;
    }

    // Through, and out of the pit: it has been lifted, and there is nothing
    // left in it for a pit to do.
    if (hide.isTanned()) {
      this.decline(context, Mml.compose`${Mml.thing(hide)} is already tanned.`, 'already-tanned');
      return;
    }

    if (pit.liquorLitres() <= 0) {
      this.decline(
        context,
        Mml.compose`${Mml.thing(pit)} is empty. ${pit.pitReport().line}`,
        'pit-dry',
      );
      return;
    }

    if (!MixinApi.isContainable(hide)) {
      this.decline(
        context,
        Mml.compose`${Mml.thing(hide)} will not go in.`,
        'not-containable',
      );
      return;
    }
    ContainmentApi.move(hide, pit as never);

    // ⚠ Reconcile immediately so the clock stamp is NOW rather than the
    // next time somebody happens to look. Without it a hide dropped in and
    // ignored for a month would start its clock at the first read, and a
    // month of liquor would be free.
    hide.reconcileTanning();
    // ⭐ (cleanliness D6) The stench trade: a raw skin's fat and the bate's
    // dung on the hands and the apron.
    if (MixinApi.isHygienic(giver)) giver.soilFrom(TAN_SOILS);

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You slide ${Mml.thing(hide)} down into ${Mml.thing(pit)} and weight it under. ${pit.pitReport().line}`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} lays a skin into ${Mml.thing(pit)}.`,
      )
      .send();

    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: LEATHERWORK,
        difficulty: 'easy',
        outcome: 'success',
      });
    }
  }

  /**
   * The pit — a NARROWING over what the binder bound, never a search.
   * `tan.yaml` declares `pit` with an MQL default over reachable
   * containers; the type check here is the narrowing.
   */
  private findPit(
    bound: MqlManyResult | undefined,
    hide: Stuff,
  ): Tanpit | null {
    for (const candidate of bound?.stuff ?? []) {
      if (candidate instanceof Tanpit) return candidate;
    }
    // ⭐ Falling back to the pit the hide is already in means `tan hide`
    // with no `in <pit>` reads as *check on it*, which is what a tanner
    // means nine times out of ten.
    if (MixinApi.isContainable(hide)) {
      const where = hide.getContainer();
      if (where instanceof Tanpit) return where;
    }
    return null;
  }

  private decline(
    context: CommandContext,
    line: ReturnType<typeof Mml.compose>,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(line).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}
