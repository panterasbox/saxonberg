/**
 * SutureController — `suture <patient> [with <kit>]` (D8). Closes the worst
 * exterior laceration/avulsion/puncture at/above the suture-min severity —
 * a smaller one wants a bandage, a foreign body wants extraction first.
 * A competent treater (in nursing or medicine) writes the return date to
 * the patient's calendar (D12); a novice writes nothing. Credits `nursing
 * standard`.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { HARM_DEFAULTS } from '@saxonberg/server/mud/platform/idea/Condition';
import type { Trauma } from '@saxonberg/server/mud/platform/idea/Condition';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const TOPIC = 'act.deed';
const SUTURABLE = new Set(['laceration', 'avulsion', 'puncture']);

interface SutureModel extends CommandModel {
  patient?: MqlOneResult;
}

export default class SutureController extends CommandController<SutureModel> {
  async execute(model: SutureModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.patient?.stuff as Stuff | undefined;
    const patient: Stuff = named ?? (giver as unknown as Stuff);
    const self = named === undefined;

    if (!MixinApi.isVitals(patient)) {
      return this.fail(context, 'There is nothing there to suture.', 'no-body');
    }
    const band = MixinApi.isAdvancing(giver)
      ? await giver.bestBandFor(['nursing', 'medicine'])
      : CompetenceBand.FLOOR;
    if (!CompetenceBand.atOrAbove(band, 'novice')) {
      return this.fail(
        context,
        'You do not know how to stitch a wound.',
        'unskilled',
      );
    }

    // A foreign body has to come out first — say so distinctly.
    const embedded = patient
      .getConditions()
      .some((c): c is Trauma => c.kind === 'trauma' && c.type === 'foreign-body');

    const wound = patient
      .getConditions()
      .filter(
        (c): c is Trauma =>
          c.kind === 'trauma' &&
          SUTURABLE.has(c.type) &&
          c.type !== 'foreign-body' &&
          c.sutured !== true &&
          c.severity >= HARM_DEFAULTS.SUTURE_MIN_SEVERITY,
      )
      .sort((a, b) => b.severity - a.severity)[0];

    if (!wound) {
      if (embedded) {
        return this.fail(
          context,
          'The thing has to come out first — you cannot stitch over it.',
          'foreign-body',
        );
      }
      const who = self ? 'You have' : 'They have';
      return this.fail(
        context,
        `${who} nothing that wants stitches — a bandage will do.`,
        'nothing-to-suture',
      );
    }

    const rank = CompetenceBand.rank(band);
    const efficacy = Math.min(1, 0.5 + 0.15 * rank);
    patient.applyTreatment(wound, {
      by: 'dressing',
      efficacy,
      treater: giver as unknown as Stuff,
    });
    wound.sutured = true;

    // ⭐ The return date — a competent hand's prognosis (D12). Written to
    // the patient's calendar at a bed's rate; a novice writes nothing.
    let wroteDate = false;
    if (
      CompetenceBand.atOrAbove(band, 'competent') &&
      MixinApi.isCalendarKeeping(patient)
    ) {
      const predictedS =
        (wound.severity - HARM_DEFAULTS.CLOT_SEVERITY) /
        HARM_DEFAULTS.SUTURED_HEAL_PER_SEC;
      const now = WorldClockApi.getNow().rawValue();
      patient.addCalendarEntry({
        label: 'Remove stitches',
        whenGameS: now + Math.max(0, predictedS),
        source: 'medicine',
      });
      wroteDate = true;
    }

    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: 'nursing',
        difficulty: 'standard',
        outcome: 'success',
      });
    }

    const who = self ? 'yourself' : patient.getPresentation();
    const tail = wroteDate
      ? ' The return date is on their calendar.'
      : '';
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(`You stitch the ${Mml.escape(wound.type)} on ${Mml.escape(who)} closed.${Mml.escape(tail)}`))
      .toPeers(Mml.compose`${Mml.actor(giver)} sutures ${self ? Mml.compose`themselves` : Mml.thing(patient)}.`)
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
