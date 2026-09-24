/**
 * TransfuseController — `transfuse <patient> from <vessel> [using <syringe>]`
 * (blood build D5). Reads the vessel: blood → the unit; salt-water → a
 * saline expander; else refused. A spoiled unit is refused. ⭐ The
 * judgement: a competent giver who can SEE a mismatch (patient typed AND
 * unit labelled AND incompatible) refuses to give it — competence buys
 * JUDGEMENT, never a better transfusion. Credits `nursing standard`.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
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

    // Saline — the untyped volume floor.
    if (materialPath === SALINE_MATERIAL) {
      patient.receiveBlood({ litres, blood: null, expander: true });
      slot.setAmount(Quantity.of(slot.getAmount().rawValue() - litres, 'L'));
      await this.credit(giver);
      return this.narrate(context, self, patient, 0, true);
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

    const result = patient.receiveBlood({
      litres,
      blood: { speciesPath: unit.speciesPath, type: unit.type },
    });
    slot.setAmount(Quantity.of(slot.getAmount().rawValue() - litres, 'L'));
    await this.credit(giver);
    return this.narrate(context, self, patient, result.reaction, false);
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
