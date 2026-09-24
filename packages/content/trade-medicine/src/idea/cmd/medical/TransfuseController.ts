/**
 * TransfuseController — `transfuse <patient> from <vessel> [using <syringe>]`
 * (blood build D5; made durative in the clinical-medicine review). Reads
 * the vessel: blood → the unit; salt-water → a saline expander; else
 * refused. A spoiled unit is refused. ⭐ The judgement: a competent giver
 * who can SEE a mismatch (patient typed AND unit labelled AND
 * incompatible) refuses to give it — competence buys JUDGEMENT, never a
 * better transfusion. Credits `nursing standard`.
 *
 * ⭐ The give is a SHORT interruptible engaged `hands` step
 * (`TRANSFUSE_DURATION_S`): the field-medic-under-fire tension — you are
 * exposed while you give, and a barge-in aborts it (the unit is NOT given;
 * the slot keeps its contents). Every gate runs SYNCHRONOUSLY at dispatch;
 * the effect lands at completion. The not-engaged path runs it at once.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { ManualBuildStep } from '@saxonberg/server/mud/lib/craft/ManualBuildStep';
import { Freshness } from '@saxonberg/server/mud/lib/material/Freshness';
import { BloodType } from '@saxonberg/server/mud/lib/vitals/BloodType';
import type { BloodTypeLabel } from '@saxonberg/server/mud/lib/vitals/BloodType';
import { BLOOD_DEFAULTS } from '@saxonberg/server/mud/lib/vitals/Blood';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const TOPIC = 'act.deed';
const SALINE_MATERIAL = '/stuff/idea/material/bulk/salt-water';

interface TransfuseModel extends CommandModel {
  patient?: MqlOneResult;
  vessel?: MqlOneResult;
}

export default class TransfuseController extends CommandController<TransfuseModel> {
  async execute(model: TransfuseModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.patient?.stuff as Stuff | undefined;
    const patient: Stuff = named ?? (giver as unknown as Stuff);
    const self = named === undefined;

    if (!MixinApi.isVitals(patient) || patient.bloodType() === null) {
      return this.fail(context, 'There is nothing there to transfuse.', 'no-body');
    }
    const vessel = model.vessel?.stuff as Stuff | undefined;
    if (!vessel || !MixinApi.isBulkable(vessel)) {
      return this.fail(context, 'You need a vessel to transfuse from.', 'no-vessel');
    }
    const slot = BulkableApi.slotFor(vessel, undefined);
    if (!slot || slot.isEmpty()) {
      return this.fail(context, 'That vessel is empty.', 'empty');
    }
    const litres = Math.min(BLOOD_DEFAULTS.UNIT_LITRES, slot.getAmount().rawValue());

    const materialPath = slot.getMaterial()?.getTemplatePath() ?? '';
    const unit = slot.getPayload()?.blood;

    // Saline — the untyped volume floor. The effect is deferred to the step.
    if (materialPath === SALINE_MATERIAL) {
      return this.runOrEngage(context, giver, () => {
        patient.receiveBlood({ litres, blood: null, expander: true });
        slot.setAmount(Quantity.of(slot.getAmount().rawValue() - litres, 'L'));
        void this.credit(giver);
        this.narrate(context, self, patient, 0, true);
      });
    }

    if (!unit) {
      return this.fail(
        context,
        'That is not blood, and not saline — it will not transfuse.',
        'not-blood',
      );
    }

    // Spoiled blood is refused (contamination is the blood-slate's).
    const band = Freshness.bandFor(new Freshness(slot).load());
    if (band === 'spoiled' || band === 'rotten') {
      return this.fail(context, 'That unit has spoiled — you cannot give it.', 'spoiled');
    }

    // ⭐ The judgement: a competent giver who can SEE a mismatch refuses.
    const giverBand = MixinApi.isAdvancing(giver)
      ? await giver.bestBandFor(['nursing', 'medicine'])
      : CompetenceBand.FLOOR;
    const patientTyped = patient.isBloodTyped();
    if (
      unit.labelled &&
      patientTyped &&
      CompetenceBand.atOrAbove(giverBand, 'competent')
    ) {
      const patientSpecies = MixinApi.isOrganism(patient)
        ? (patient.getSpecies()?.getTemplatePath() ?? '')
        : '';
      const donor = new BloodType(unit.speciesPath, unit.type as BloodTypeLabel);
      const me = new BloodType(patientSpecies, patient.bloodType() as BloodTypeLabel);
      if (donor.mismatchFor(me) > 0) {
        return this.fail(
          context,
          'You know that will not match — you would only harm them.',
          'known-mismatch',
        );
      }
    }

    // Gates passed. The give lands at completion; a barge-in gives nothing.
    return this.runOrEngage(context, giver, () => {
      const result = patient.receiveBlood({
        litres,
        blood: { speciesPath: unit.speciesPath, type: unit.type },
      });
      slot.setAmount(Quantity.of(slot.getAmount().rawValue() - litres, 'L'));
      void this.credit(giver);
      this.narrate(context, self, patient, result.reaction, false);
    });
  }

  /**
   * Run `effect` now if the giver is not engaged, else start a SHORT
   * interruptible `hands` step that applies it at completion and narrates
   * the "you begin" beat.
   */
  private runOrEngage(
    context: CommandContext,
    giver: Stuff,
    effect: () => void,
  ): void {
    if (!MixinApi.isEngaged(giver)) {
      effect();
      return;
    }
    const step = new ManualBuildStep({
      actor: giver,
      slots: ['hands'],
      durationMs: BLOOD_DEFAULTS.TRANSFUSE_DURATION_S * 1000,
      onComplete: effect,
      onAbort: () => {},
    });
    const result = SchedulerApi.start(step);
    if (result.ok && (result.status === 'started' || result.status === 'replaced')) {
      context.note(result.note);
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You begin the transfusion. Hold steady.`)
        .toPeers(Mml.compose`${Mml.actor(giver)} begins a transfusion.`)
        .send();
      return;
    }
    if (result.ok && result.status === 'completed-sync') return;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`Your hands are busy just now.`)
      .send();
    context.note({ kind: 'controller-rejected', reason: 'engagement-conflict', detail: 'busy' });
  }

  private async credit(giver: Stuff): Promise<void> {
    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: 'nursing',
        difficulty: 'standard',
        outcome: 'success',
      });
    }
  }

  private narrate(
    context: CommandContext,
    self: boolean,
    patient: Stuff,
    reaction: number,
    saline: boolean,
  ): void {
    const giver = context.commandGiver;
    const who = self ? 'yourself' : patient.getPresentation();
    const line =
      reaction > 0
        ? `You transfuse ${who} — but the blood does not match, and their body turns against it.`
        : saline
          ? `You run saline into ${who}. Their volume comes up, though it carries no cells.`
          : `You transfuse ${who}. Their volume comes back up.`;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .toPeers(Mml.compose`${Mml.actor(giver)} transfuses ${self ? Mml.compose`themselves` : Mml.thing(patient)}.`)
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
