/**
 * TendController — ⭐ `tend <patient>` / `nurse <patient>` (recovery D8).
 *
 * Sitting with a wounded body speeds its recovery: it starts a
 * `TendingEngagement` on YOUR attention (one patient at a time), and while
 * you hold it the patient's `convalescenceFactor` reads your nursing band
 * as a bonus. Walk away, cancel, or take a second patient and the link
 * drops — the bonus with it, on the very next read.
 *
 * ⚠ A carer tends someone ELSE; you cannot nurse yourself back to health
 * by sitting with yourself. And there must be something to tend — a wound
 * or an illness — or the offer is declined with the reason.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import { CompetenceBand } from '../../../../lib/advancement/CompetenceBand';
import { SchedulerApi } from '../../../../api/scheduler';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { TendingEngagement } from '../../../../lib/vitals/TendingEngagement';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Vitals } from '../../../../lib/vitals/Vitals';
import type { Engaged } from '../../../../lib/activity/Engaged';

const TOPIC = 'act.deed';
const NURSING = 'nursing';

interface TendModel extends CommandModel {
  patient?: MqlOneResult;
}

export default class TendController extends CommandController<TendModel> {
  async execute(model: TendModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const target = model.patient?.stuff as Stuff | undefined;

    if (!target) {
      return this.fail(context, 'Tend whom? Name someone.', 'no-target');
    }
    if (target === giver) {
      return this.fail(
        context,
        'You cannot nurse yourself — tending is something you do for someone else.',
        'self-tend',
      );
    }
    if (!MixinApi.isVitals(target)) {
      return this.fail(context, 'There is nothing there to tend.', 'no-body');
    }
    // Something to tend: a wound or an illness.
    const hurt = (target as Stuff & Vitals)
      .getConditions()
      .some((c) => c.kind === 'trauma' || c.kind === 'affliction');
    if (!hurt) {
      return this.fail(
        context,
        `${target.getPresentation()} has nothing that sitting with them would help.`,
        'nothing-to-tend',
      );
    }
    if (!MixinApi.isEngaged(giver)) {
      return this.fail(context, 'You cannot sit with anyone.', 'not-engaged');
    }

    const band = MixinApi.isAdvancing(giver)
      ? await giver.competenceBandFor(NURSING)
      : CompetenceBand.FLOOR;

    const result = SchedulerApi.start(
      new TendingEngagement(
        giver as unknown as Stuff & Engaged,
        target as Stuff & Vitals,
        band,
      ),
    );
    if (!result.ok) {
      return this.fail(
        context,
        'Your attention is on something else.',
        'engagement-conflict',
      );
    }

    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You settle in beside ${Mml.thing(target)} to tend them.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(context.commandGiver)} settles in to tend ${Mml.thing(target)}.`,
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
