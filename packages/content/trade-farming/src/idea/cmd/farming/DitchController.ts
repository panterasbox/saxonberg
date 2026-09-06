/**
 * DitchController — `ditch`, and ⭐ **you do not change the soil, you
 * change where the water goes** (D66).
 *
 * That distinction is the whole reason draining is a job rather than a
 * soil amendment. Texture is fixed because it is the earth (D65); what
 * you can alter is the route the water takes off it, by cutting an open
 * ditch at the headland and, in time, laying drains under it.
 *
 * ⚠ And it is genuinely dearer in heavy ground, because it is: a ditch in
 * sand is an afternoon and a ditch in clay is a week. `improvementCost`
 * multiplies the wetness by the fineness, so the two things that make
 * ground hard to drain compound the way they compound in life.
 */

import { FieldWorkController, FIELD_TOPIC, LABOUR_PER_ACT } from './FieldWorkController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';

export default class DitchController extends FieldWorkController {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const reading = await this.fieldOf(giver);
    if (!reading) {
      this.decline(context, Mml.compose`There is no field here to drain.`, 'no-field');
      return;
    }
    const tool = this.toolOf(giver, 'digging');
    if (!tool) {
      this.decline(context, Mml.compose`You would want a spade for that.`, 'no-tool');
      return;
    }
    const { field, bill } = reading;
    if (field.progressOn('draining', bill) >= 1) {
      this.decline(
        context,
        bill.draining <= 0
          ? Mml.compose`This ground sheds its own water. It wants no ditch.`
          : Mml.compose`The water is already off this ground as fast as it will go.`,
        'already-drained',
      );
      return;
    }

    this.engageAct(context, {
      durationMs: 5_000,
      cost: 5,
      beginSelf: Mml.compose`You open a line along the fall of the ground with ${Mml.thing(tool)}, throwing the spoil to the high side.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} starts cutting a ditch along the fall of the ground.`,
      onComplete: () => {
        void this.finish(context, reading);
      },
    });
  }

  private async finish(
    context: CommandContext,
    reading: NonNullable<Awaited<ReturnType<FieldWorkController['fieldOf']>>>,
  ): Promise<void> {
    const giver = context.commandGiver;
    const { field, bill } = reading;
    const after = field.bankWork('draining', LABOUR_PER_ACT, bill);
    MessageApi.scene(giver)
      .topic(FIELD_TOPIC)
      .toSelf(
        after >= 1
          ? Mml.compose`The line runs clean to the bottom and the water follows it. ${field.improvementPhrase(bill)}.`
          : Mml.compose`Another length of it is open. It will take more before the wet corner dries.`,
      )
      .send();
    await this.credit(giver, bill.draining);
  }
}
