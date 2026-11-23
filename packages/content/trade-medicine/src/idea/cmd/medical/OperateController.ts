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
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { HARM_DEFAULTS } from '@saxonberg/server/mud/platform/idea/Condition';
import { OperationEngagement } from '@saxonberg/server/mud/lib/vitals/OperationEngagement';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Vitals } from '@saxonberg/server/mud/lib/vitals/Vitals';
import type { Trauma } from '@saxonberg/server/mud/platform/idea/Condition';
import type { Engaged } from '@saxonberg/server/mud/lib/activity/Engaged';
import { ConditionApi } from '@saxonberg/server/mud/api/condition';
import type { Difficulty } from '@saxonberg/server/mud/lib/advancement/ActSignature';

const TOPIC = 'act.deed';

interface OperateModel extends CommandModel {
  patient?: MqlOneResult;
  for?: string;
  kit?: MqlOneResult;
}

export default class OperateController extends CommandController<OperateModel> {
  async execute(model: OperateModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.patient?.stuff as Stuff | undefined;
    const target: Stuff = named ?? (giver as unknown as Stuff);
    const self = named === undefined;

    if (!MixinApi.isVitals(target)) return this.refuse(context, { ok: false, reason: '/trade/medicine/reasons/no-body' });
    if (!model.kit?.stuff) return this.refuse(context, { ok: false, reason: '/trade/medicine/reasons/no-kit' });
    // ⭐ The operation dictionary loads on first use (scan-sweep ruling 1):
    // one indexed read of the kind — nothing boots it.
    const ops = await ConditionApi.operations().all();
    const body = target as Stuff & Vitals;
    const kit = model.kit.stuff as Stuff;
    const band = MixinApi.isAdvancing(giver)
      ? await giver.competenceBandFor('medicine')
      : CompetenceBand.FLOOR;
    // ⭐⭐ The body decides (organism-biology D8, W7): which operation, on
    // which wound or part, and every refusal — this controller words none.
    const answer = body.operable(model.for ?? null, ops, {
      band,
      capabilities: MixinApi.isTool(kit) ? kit.getCapabilities() : [],
      self,
    });
    if (!answer.ok) return this.refuse(context, answer);
    const match = answer;
    const op = match.op;
    const conscious = body.getConsciousness() === 'conscious';

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
        const partKey = match.partKey;
        // Take the part; relieve the wounds seated on the severed subtree.
        for (const c of [...body.getConditions()]) {
          if (c.kind === 'trauma' && c.site.startsWith(partKey)) {
            body.relieve(c);
          }
        }
        // ⭐ Through the one sever (D7): the part on the ground, as a thing.
        void ConditionApi.sever(body, partKey, op.key).catch((err: unknown) => {
          // @quiet the part is already off the body (the sever's delta is synchronous); only its thing is missing.
          console.error(`operate: the ${op.label} did not take ${partKey}`, err);
        });
        // ⭐ A part taken from a healthy body leaves a wound where it was
        // (D8): a castration is an open cut, with what an open cut costs.
        if (op.addresses.part) {
          const stump = partKey.includes('.') ? partKey.slice(0, partKey.lastIndexOf('.')) : partKey;
          const cut: Trauma = { kind: 'trauma', type: 'laceration', site: stump, severity: 1, bleeding: true };
          const by = (giver as unknown as Stuff).getIdentityPath();
          if (by) cut.inflictedBy = by;
          body.afflict(cut);
        }
      } else if (match.wound) {
        // ⭐ The kit's clean tier (cleanliness D14): held in a flame it is
        // sterile; only washed, it seeds the wound.
        body.applyTreatment(match.wound, {
          by: 'surgery',
          efficacy,
          treater: giver as unknown as Stuff,
          ...(MixinApi.isSoilable(kit) ? { instrumentTier: kit.cleanTier() } : {}),
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
        void giver.creditDeed({ discipline: 'medicine', difficulty: op.difficulty as Difficulty, outcome: 'success' });
      }
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You finish the ${op.label}.`)
        .send();
    };

    const onAbort = (): void => {
      debitRest();
      if (match.wound) body.leaveWoundOpen(match.wound, HARM_DEFAULTS.OPERATION_ABORT_WORSEN);
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`The operation is interrupted — the wound is left open, worse than before.`)
        .send();
    };

    if (!MixinApi.isEngaged(giver)) {
      onComplete();
      return;
    }
    // ⭐ The operation holds the patient still itself (a conscious one may
    // thrash free, which ends it — C38), and frees them when it finishes.
    const engagement = new OperationEngagement({
      surgeon: giver as unknown as Stuff & Engaged,
      durationMs: Math.max(100, durationS * 1000),
      onComplete,
      onAbort,
      patient: MixinApi.isEngaged(target) ? (target as unknown as Stuff & Engaged) : null,
      patientCancelable: conscious,
    });
    const result = SchedulerApi.start(engagement);
    if (result.ok && (result.status === 'started' || result.status === 'replaced')) {
      context.note(result.note);
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          conscious
            ? Mml.compose`You begin the ${op.label}. Awake, ${self ? Mml.compose`you flinch` : Mml.compose`${Mml.thing(target)} flinches`} at the cut.`
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
}
