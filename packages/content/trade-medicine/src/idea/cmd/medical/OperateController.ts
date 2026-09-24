/**
 * OperateController — `operate <patient> [for <operation>] [with <kit>]`
 * (clinical-medicine D7). `operate` deepened into a durative, blood-costing,
 * interruptible act over the kernel `Operation` catalogue.
 *
 * Picks the named operation or the most urgent applicable one; gates on
 * posture, competence, the kit's capability, and anaesthesia (a `required`
 * op refuses a conscious patient; an `advised` one proceeds worse). Debits
 * half the blood cost at the cut and starts an `OperationEngagement`; the
 * patient keeps bleeding for the duration (the race). At completion it
 * debits the rest and applies the resolution; interrupted, it leaves the
 * wound open and worse. A competent op writes the follow-up date (D12).
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Postures } from '@saxonberg/server/mud/lib/slot/Postured';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import { HARM_DEFAULTS } from '@saxonberg/server/mud/platform/idea/Condition';
import {
  OperationEngagement,
  OperationPatientHold,
} from '@saxonberg/server/mud/lib/vitals/OperationEngagement';
import type OperationCatalogue from '@saxonberg/server/mud/platform/idea/OperationCatalogue';
import type { OperationDescriptor } from '@saxonberg/server/mud/platform/idea/Operation';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Vitals } from '@saxonberg/server/mud/lib/vitals/Vitals';
import type { Trauma } from '@saxonberg/server/mud/platform/idea/Condition';
import type { Engaged } from '@saxonberg/server/mud/lib/activity/Engaged';

const TOPIC = 'act.deed';

interface OperateModel extends CommandModel {
  patient?: MqlOneResult;
  for?: string;
  kit?: MqlOneResult;
}

/** The wound (or part, for amputation) an operation targets on a body. */
interface Match {
  op: OperationDescriptor;
  wound?: Trauma;
  partKey?: string;
}

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
      return this.fail(context, "You need a surgeon's kit to operate.", 'no-kit');
    }
    const catalogue = StuffApi.findByTemplatePath<OperationCatalogue>(
      TemplatePaths.operationCatalogue,
    );
    const ops = catalogue?.allOperations() ?? [];
    const body = target as Stuff & Vitals;

    // Pick the operation: named, else the most urgent applicable.
    const wanted = (model.for ?? '').trim();
    const matches = this.matchesFor(body, ops).filter(
      (m) => !wanted || m.op.key === wanted,
    );
    if (wanted && !ops.some((o) => o.key === wanted)) {
      return this.fail(context, `There is no such operation as "${wanted}".`, 'no-such-op');
    }
    const match = matches[0];
    if (!match) {
      const who = self ? 'You have' : 'They have';
      return this.fail(context, `${who} nothing that operation would help.`, 'nothing-to-operate');
    }
    const op = match.op;

    // Posture — the patient must be lying still.
    if (
      !MixinApi.isPosed(target) ||
      (target as unknown as { getPosture(): string }).getPosture() !== Postures.Lie
    ) {
      const who = self ? 'You are' : `${target.getPresentation()} is`;
      return this.fail(context, `${who} not lying still.`, 'not-lying');
    }
    // Competence.
    const band = MixinApi.isAdvancing(giver)
      ? await giver.competenceBandFor('medicine')
      : CompetenceBand.FLOOR;
    if (!CompetenceBand.atOrAbove(band, op.competence.band)) {
      return this.fail(
        context,
        `You do not have the skill for ${op.label} — it wants ${op.competence.band} medicine.`,
        'unskilled',
      );
    }
    // The kit must offer the operation's capability.
    const kit = model.kit.stuff as Stuff;
    const caps = MixinApi.isTool(kit) ? kit.getCapabilities() : [];
    if (!caps.includes(op.instrument)) {
      return this.fail(context, `That kit cannot perform ${op.label}.`, 'wrong-kit');
    }
    // Anaesthesia.
    const conscious = body.getConsciousness() === 'conscious';
    if (op.anaesthesia === 'required' && conscious) {
      return this.fail(
        context,
        'Not without anaesthesia — they would not lie still for that.',
        'needs-anaesthesia',
      );
    }

    // Compute the durative act.
    const rank = CompetenceBand.rank(band);
    const severity = match.wound?.severity ?? 3;
    const analgesia = body.analgesiaRelief() > 0;
    const competenceScale = 1 + 0.25 * rank;
    const durationS =
      (op.baseDurationS * (1 + (0.5 * severity) / 3)) /
      competenceScale *
      (conscious ? HARM_DEFAULTS.CONSCIOUS_DURATION_SCALE : 1) *
      (analgesia ? 0.8 : 1);
    const efficacy =
      (0.4 + 0.15 * rank) * (conscious ? HARM_DEFAULTS.CONSCIOUS_EFFICACY_SCALE : 1);

    // The cut: debit half the blood cost now; the rest at completion.
    const bvNow = body.getVitalSign('bloodVolume').rawValue();
    body.setVitalSign(
      'bloodVolume',
      Quantity.of(Math.max(0, bvNow - op.bloodCostL * 0.5), 'L'),
    );

    const debitRest = (): void => {
      const bv = body.getVitalSign('bloodVolume').rawValue();
      body.setVitalSign('bloodVolume', Quantity.of(Math.max(0, bv - op.bloodCostL * 0.5), 'L'));
    };

    const onComplete = (): void => {
      if (MixinApi.isOrganism(target) && target.getLifecycleState() === 'dead') return;
      debitRest();
      if (op.resolution === 'severance' && match.partKey) {
        // Take the part; relieve the wounds seated on the severed subtree.
        for (const c of [...body.getConditions()]) {
          if (c.kind === 'trauma' && c.site.startsWith(match.partKey)) {
            body.relieve(c);
          }
        }
        body.severPart(match.partKey);
      } else if (match.wound) {
        body.applyTreatment(match.wound, {
          by: 'surgery',
          efficacy,
          treater: giver as unknown as Stuff,
        });
        // The follow-up date — a competent hand's prognosis (D12).
        if (
          CompetenceBand.atOrAbove(band, 'competent') &&
          MixinApi.isCalendarKeeping(target)
        ) {
          const now = WorldClockApi.getNow().rawValue();
          const predictedS =
            (match.wound.severity) / HARM_DEFAULTS.DRESSED_HEAL_PER_SEC;
          target.addCalendarEntry({
            label: `Follow-up: ${op.label}`,
            whenGameS: now + Math.max(0, predictedS),
            source: 'medicine',
          });
        }
      }
      if (MixinApi.isAdvancing(giver)) {
        void giver.creditDeed({ discipline: 'medicine', difficulty: 'formidable', outcome: 'success' });
      }
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You finish the ${op.label}.`)
        .send();
    };

    const onAbort = (): void => {
      debitRest();
      if (match.wound) {
        match.wound.severity += HARM_DEFAULTS.OPERATION_ABORT_WORSEN;
        match.wound.openSince = WorldClockApi.getNow().rawValue();
        match.wound.careQuality = undefined;
        match.wound.dressed = false;
      }
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`The operation is interrupted — the wound is left open, worse than before.`)
        .send();
    };

    if (!MixinApi.isEngaged(giver)) {
      onComplete();
      return;
    }
    const engagement = new OperationEngagement({
      surgeon: giver as unknown as Stuff & Engaged,
      durationMs: Math.max(100, durationS * 1000),
      onComplete,
      onAbort,
    });
    const result = SchedulerApi.start(engagement);
    if (result.ok && (result.status === 'started' || result.status === 'replaced')) {
      context.note(result.note);
      // Hold the patient still (a conscious one may thrash free).
      if (MixinApi.isEngaged(target) && target !== (giver as unknown as Stuff)) {
        SchedulerApi.start(
          new OperationPatientHold({
            patient: target as unknown as Stuff & Engaged,
            cancelable: conscious,
            onAbort: () => {},
          }),
        );
      }
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          conscious
            ? Mml.compose`You begin the ${op.label}. Awake, ${self ? Mml.compose`you` : Mml.thing(target)} flinch at the cut.`
            : Mml.compose`You begin the ${op.label}.`,
        )
        .toPeers(Mml.compose`${Mml.actor(giver)} begins an operation.`)
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

  /** Every operation applicable to this body, most-urgent (worst wound) first. */
  private matchesFor(body: Stuff & Vitals, ops: OperationDescriptor[]): Match[] {
    const traumas = body
      .getConditions()
      .filter((c): c is Trauma => c.kind === 'trauma' && c.severity > 0);
    const out: Match[] = [];
    for (const op of ops) {
      const a = op.addresses;
      if (a.flag === 'unsalvageable') {
        // Scan severable parts with an active wound.
        const parts = new Set(traumas.map((t) => t.site));
        for (const site of parts) {
          if (body.isPartUnsalvageable(site)) {
            out.push({ op, partKey: site });
          }
        }
        continue;
      }
      for (const t of traumas) {
        if (a.flag === 'foreign-body' && t.type !== 'foreign-body') continue;
        if (a.traumaTypes && !a.traumaTypes.includes(t.type)) continue;
        if (a.minSeverity !== undefined && t.severity < a.minSeverity) continue;
        if (a.bleeding === true && t.bleeding !== true) continue;
        if (t.dressed === true && t.type !== 'foreign-body') continue;
        out.push({ op, wound: t });
      }
    }
    // Most urgent first — by the target wound's severity.
    return out.sort(
      (x, y) => (y.wound?.severity ?? 5) - (x.wound?.severity ?? 5),
    );
  }

  private fail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: line });
  }
}
