/**
 * TanController — `tan <hide> [in <pit>]`, and ⭐⭐ **the verb is a
 * JUDGEMENT, not a transform.**
 *
 * ## What the act actually is
 *
 * Putting a skin in liquor takes a moment; tanning it takes three weeks.
 * So this verb does almost nothing: it puts the hide in the pit and the
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
 * ## ⭐ Both halves of the act are this one verb
 *
 * `tan <hide>` puts it in **or** takes it out when it is through, because
 * those are the same sentence in a tanner's mouth (*I'm tanning that
 * hide*) and because a second verb for *lift the finished skin out*
 * would be ceremony. ⚠ Plain `get hide from pit` also works and does the
 * same conversion — the controller is the courteous path, never the gate.
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
import { TANNING } from '../../../lib/Tanning';

const TOPIC = 'act.deed';

/** The Discipline tanning credits — minted by this pack. */
export const LEATHERWORK = 'leatherwork';

/** What a tanned skin becomes. */
const LEATHER = '/stuff/idea/material/organic/leather';

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

    // ⭐ Already through — this is the judgement half of the verb.
    if (hide.isTanned()) {
      return this.lift(hide, giver, context);
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
   * Take a finished skin out and make it leather. ⚠ The grade band falls
   * by whatever the pit cost it, which is where *left it too long* and
   * *threw in all the bark* both land.
   */
  private async lift(
    hide: Stuff & Hide,
    giver: Stuff,
    context: CommandContext,
  ): Promise<void> {
    const pit = MixinApi.isContainable(hide) ? hide.getContainer() : null;
    const became = await hide.becomeLeather(LEATHER);
    if (!became) {
      this.decline(
        context,
        Mml.compose`${Mml.thing(hide)} is not through yet.`,
        'not-through',
      );
      return;
    }

    // The pit pays for it in bark.
    if (pit instanceof Tanpit && MixinApi.isTangible(hide)) {
      pit.consumeBark(hide.getMass().rawValue() * TANNING.BARK_PER_KG_HIDE);
    }
    if (MixinApi.isContainable(hide) && MixinApi.isContainer(giver)) {
      ContainmentApi.move(hide, giver);
    }

    const bands = hide.tanPenaltyBands();
    const line =
      bands > 0
        ? Mml.compose`You lift ${Mml.thing(hide)} out. It is leather, and it is harder and darker than it should be — you left it too long, or the liquor was too strong.`
        : Mml.compose`You lift ${Mml.thing(hide)} out, heavy with liquor, and rack it to drain. It is leather.`;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(line)
      .toPeers(
        Mml.compose`${Mml.actor(giver)} lifts a tanned skin out and racks it.`,
      )
      .send();

    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: LEATHERWORK,
        // ⭐ Judging it out is the skilled half. Putting it in is `easy`.
        difficulty: 'standard',
        outcome: bands > 0 ? 'partial' : 'success',
      });
    }
    // ⚠ No note on the success path, deliberately: the envelope's note
    // kinds are a closed vocabulary and none of them means "it worked" —
    // the SCENE is the outcome. A `controller-succeeded` kind invented
    // here would be a new entry in a kernel union for one pack's benefit.
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
