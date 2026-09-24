/**
 * PrescribeController — `prescribe <patient> <active> [<doses>]` (D9). A
 * doctor's power (`competent` in medicine). Resolves the active to a
 * warmed drug Condition, clones a prescription slip stamped for the
 * patient, and hands it over. Credits `medicine easy`.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { TemplatePathPrefixes } from '@saxonberg/server/mud/lib/paths';
import type Condition from '@saxonberg/server/mud/platform/idea/Condition';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Prescription } from '@saxonberg/server/mud/lib/vitals/Prescription';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';

const TOPIC = 'act.deed';
const PRESCRIPTION = '/trade/medicine/thing/prescription';

interface PrescribeModel extends CommandModel {
  patient?: MqlOneResult;
  active?: string;
  doses?: number;
}

export default class PrescribeController extends CommandController<PrescribeModel> {
  async execute(model: PrescribeModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const patient = model.patient?.stuff as Stuff | undefined;
    if (!patient || !MixinApi.isVitals(patient)) {
      return this.fail(context, 'There is no patient there to prescribe for.', 'no-body');
    }
    const active = (model.active ?? '').trim();
    if (!active) {
      return this.fail(context, 'Prescribe what?', 'no-active');
    }
    const band = MixinApi.isAdvancing(giver)
      ? await giver.competenceBandFor('medicine')
      : CompetenceBand.FLOOR;
    if (!CompetenceBand.atOrAbove(band, 'competent')) {
      return this.fail(
        context,
        'Prescribing is a doctor’s power — you are not licensed.',
        'unlicensed',
      );
    }
    // The active must resolve to a warmed drug Condition.
    const row = StuffApi.findByTemplatePath<Condition>(
      TemplatePathPrefixes.metabolismCondition + active,
    );
    if (!row || row.getToxinBehavior() === null) {
      return this.fail(context, `There is no such remedy as "${active}".`, 'no-such-remedy');
    }

    const doses = Math.max(1, Math.floor(model.doses ?? 1));
    const slip = await StuffApi.clone<Stuff & Prescription>(PRESCRIPTION);
    slip.stampPrescription({
      patientIdentityPath: patient.getIdentityPath() ?? patient.getTemplatePath() ?? '',
      active,
      doses,
      prescriberIdentityPath:
        (giver as Stuff).getIdentityPath?.() ?? (giver as Stuff).getTemplatePath?.() ?? '',
      writtenAtS: WorldClockApi.getNow().rawValue(),
    });
    ContainmentApi.move(
      slip as unknown as Stuff & Containable,
      giver as unknown as Stuff & Container,
    );

    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: 'medicine',
        difficulty: 'easy',
        outcome: 'success',
      });
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.fromMarkup(
          `You write ${Mml.escape(patient.getPresentation())} a prescription for ${Mml.escape(active)} (${doses}).`,
        ),
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
