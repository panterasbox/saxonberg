/**
 * BleedController — `bleed [donor] into <vessel> [with <syringe>]` (blood
 * build D5; made durative in the clinical-medicine review). Draws a unit
 * of blood: spends the donor's volume + marrow reserve (via
 * `Vitals.drawBlood`) and fills the vessel with a labelled (or
 * unlabelled) blood unit. Refuses a donor who is unconscious, low on
 * volume, or low on the donation reserve. Credits `nursing standard`.
 *
 * ⭐ The draw is a LONG engaged `hands` step (`DRAW_DURATION_S`): the real
 * barrier to giving blood is not your volume, it is the TIME — you carve
 * out the act and sit there. All the gates run SYNCHRONOUSLY at dispatch;
 * the effect (drawBlood + fill + credit) lands at COMPLETION, so a
 * barge-in aborts the draw and no unit is taken. The not-engaged path
 * runs the effect immediately.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { ManualBuildStep } from '@saxonberg/server/mud/lib/craft/ManualBuildStep';
import { BLOOD_DEFAULTS } from '@saxonberg/server/mud/lib/vitals/Blood';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type Material from '@saxonberg/server/mud/lib/material/Material';

const TOPIC = 'act.deed';
const BLOOD_MATERIAL = '/stuff/idea/material/tissue/blood';

interface BleedModel extends CommandModel {
  donor?: MqlOneResult;
  vessel?: MqlOneResult;
}

export default class BleedController extends CommandController<BleedModel> {
  async execute(model: BleedModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.donor?.stuff as Stuff | undefined;
    const donor: Stuff = named ?? (giver as unknown as Stuff);
    const self = named === undefined;

    if (!MixinApi.isVitals(donor)) {
      return this.fail(context, 'There is no blood there to draw.', 'no-body');
    }
    const vessel = model.vessel?.stuff as Stuff | undefined;
    if (!vessel || !MixinApi.isBulkable(vessel)) {
      return this.fail(context, 'You need a vessel to draw into.', 'no-vessel');
    }
    if (donor.bloodType() === null) {
      return this.fail(context, 'That body has no blood to give.', 'no-blood');
    }
    if (donor.getConsciousness() !== 'conscious') {
      const who = self ? 'You are' : `${donor.getPresentation()} is`;
      return this.fail(context, `${who} not conscious to give blood.`, 'not-conscious');
    }
    const baseline = donor.getVitalBand('bloodVolume').baseline;
    const frac = baseline > 0 ? donor.getVitalSign('bloodVolume').rawValue() / baseline : 0;
    if (frac < BLOOD_DEFAULTS.DONOR_MIN_FRAC) {
      const who = self ? 'You have' : 'They have';
      return this.fail(context, `${who} too little blood to spare a unit.`, 'too-low');
    }
    const marrow =
      MixinApi.isReserved(donor)
        ? (donor.getReserve('marrow')?.current.rawValue() ?? 0)
        : 0;
    if (marrow < BLOOD_DEFAULTS.DONATION_MIN_MARROW) {
      const who = self ? 'You are' : 'They are';
      return this.fail(context, `${who} too wan to give — not long since the last time.`, 'wan');
    }

    const slot = BulkableApi.slotFor(vessel, undefined);
    if (!slot) {
      return this.fail(context, 'That will not hold blood.', 'no-slot');
    }
    const cap = slot.getCapacity();
    if (cap !== null && cap.rawValue() < BLOOD_DEFAULTS.UNIT_LITRES) {
      return this.fail(context, 'That vessel is too small for a unit.', 'too-small');
    }
    // Empty, or already the SAME labelled type (else you would mix).
    if (!slot.isEmpty()) {
      const held = slot.getPayload()?.blood;
      const donorType = donor.isBloodTyped() ? donor.bloodType() : null;
      if (!held || held.type !== donorType || !held.labelled || donorType === null) {
        return this.fail(
          context,
          'That vessel already holds blood of another kind.',
          'would-mix',
        );
      }
    }

    // The effect lands at COMPLETION — the draw is a durative act, and an
    // abort must take no blood. All the gates above ran at dispatch.
    const onComplete = (): void => {
      const unit = donor.drawBlood(BLOOD_DEFAULTS.UNIT_LITRES);
      const material = StuffApi.findByTemplatePath<Material>(BLOOD_MATERIAL);
      if (slot.isEmpty()) {
        if (material) slot.setMaterial(material);
        slot.setAmount(Quantity.of(BLOOD_DEFAULTS.UNIT_LITRES, 'L'));
        slot.setPayload({ blood: unit });
      } else {
        slot.setAmount(
          Quantity.of(slot.getAmount().rawValue() + BLOOD_DEFAULTS.UNIT_LITRES, 'L'),
        );
      }
      if (MixinApi.isAdvancing(giver)) {
        void giver.creditDeed({
          discipline: 'nursing',
          difficulty: 'standard',
          outcome: 'success',
        });
      }
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          self
            ? Mml.compose`You draw a unit of your own blood into ${Mml.thing(vessel)}.`
            : Mml.compose`You draw a unit of blood from ${Mml.thing(donor)} into ${Mml.thing(vessel)}.`,
        )
        .toPeers(
          Mml.compose`${Mml.actor(giver)} draws blood into ${Mml.thing(vessel)}.`,
        )
        .send();
    };

    if (!MixinApi.isEngaged(giver)) {
      onComplete();
      return;
    }
    const step = new ManualBuildStep({
      actor: giver,
      slots: ['hands'],
      durationMs: BLOOD_DEFAULTS.DRAW_DURATION_S * 1000,
      onComplete,
      onAbort: () => {},
    });
    const result = SchedulerApi.start(step);
    if (result.ok && (result.status === 'started' || result.status === 'replaced')) {
      context.note(result.note);
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          self
            ? Mml.compose`You settle in and begin drawing your own blood into ${Mml.thing(vessel)}. It will take a while.`
            : Mml.compose`You begin drawing blood from ${Mml.thing(donor)} into ${Mml.thing(vessel)}. It will take a while.`,
        )
        .toPeers(Mml.compose`${Mml.actor(giver)} begins drawing blood.`)
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

  private fail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: line });
  }
}
