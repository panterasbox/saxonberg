/**
 * OperateController — `operate <patient> with <kit>` (trade-medicine).
 *
 * A rupture is a bleed into a cavity nobody can reach — `treat` refuses it
 * and names surgery. This is surgery: it closes the wound through the ONE
 * body primitive (`Vitals.applyTreatment` → the rupture's `resolve`
 * arrests the cavity bleed and begins the knit). Unlike a splint, surgery
 * is GATED: the patient must be lying still, and the surgeon must actually
 * know how (`competent` in medicine or better) — a rupture is the one
 * wound where a clumsy hand does harm, so an untrained one is refused by
 * name.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Postures } from '@saxonberg/server/mud/lib/slot/Postured';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Vitals } from '@saxonberg/server/mud/lib/vitals/Vitals';
import type { Trauma } from '@saxonberg/server/mud/platform/idea/Condition';
import type { Difficulty, Outcome } from '@saxonberg/server/mud/lib/advancement/ActSignature';

const TOPIC = 'act.deed';
const MEDICINE = 'medicine';

interface OperateModel extends CommandModel {
  patient?: MqlOneResult;
  kit?: MqlOneResult;
}

const efficacyFor = (band: string): number =>
  0.4 + 0.15 * CompetenceBand.rank(band as never);

export default class OperateController extends CommandController<OperateModel> {
  async execute(model: OperateModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.patient?.stuff as Stuff | undefined;
    const target: Stuff = named ?? (giver as unknown as Stuff);
    const self = named === undefined;

    if (!MixinApi.isVitals(target)) {
      return this.fail(context, 'There is nothing there to operate on.', 'no-body');
    }
    if (!model.kit?.stuff) {
      return this.fail(
        context,
        "You need a surgeon's kit to operate.",
        'no-kit',
      );
    }
    // The patient must be lying still.
    if (
      !MixinApi.isPosed(target) ||
      (target as unknown as { getPosture(): string }).getPosture() !== Postures.Lie
    ) {
      const who = self ? 'You are' : `${target.getPresentation()} is`;
      return this.fail(
        context,
        `${who} not lying still — you cannot operate on a body that is up.`,
        'not-lying',
      );
    }

    // The surgeon must know how.
    const band = MixinApi.isAdvancing(giver)
      ? await giver.competenceBandFor(MEDICINE)
      : CompetenceBand.FLOOR;
    if (!CompetenceBand.atOrAbove(band as never, 'competent' as never)) {
      return this.fail(
        context,
        'You do not know how. Surgery is not something to attempt untrained.',
        'unskilled',
      );
    }

    const body = target as Stuff & Vitals;
    const rupture = body
      .getConditions()
      .filter(
        (c): c is Trauma =>
          c.kind === 'trauma' &&
          c.type === 'rupture' &&
          c.dressed !== true &&
          c.severity > 0,
      )
      .sort((a, b) => b.severity - a.severity)[0];
    if (!rupture) {
      const who = self ? 'You have' : 'They have';
      return this.fail(
        context,
        `${who} nothing that surgery would help.`,
        'nothing-to-operate',
      );
    }

    body.applyTreatment(rupture, {
      by: 'surgery',
      efficacy: efficacyFor(band),
      treater: giver as unknown as Stuff,
    });

    if (MixinApi.isAdvancing(giver)) {
      const difficulty: Difficulty = 'formidable';
      const outcome: Outcome =
        CompetenceBand.rank(band) >= 3 ? 'success' : 'partial';
      await giver.creditDeed({ discipline: MEDICINE, difficulty, outcome });
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        self
          ? Mml.compose`You open, close, and mend the tear within. The bleeding stops.`
          : Mml.compose`You operate on ${Mml.thing(target)}, closing the tear within. The bleeding stops.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} operates on ${self ? Mml.compose`themselves` : Mml.thing(target)}.`,
      )
      .send();
  }

  private fail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: line });
  }
}
