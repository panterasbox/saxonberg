/**
 * DitchController — `ditch`, and ⭐ **you do not change the soil, you
 * change where the water goes.**
 *
 * That distinction is the whole reason draining is a job rather than a soil
 * amendment. Texture is fixed because it is the earth; what you can alter
 * is the route the water takes off it, by cutting an open ditch at the
 * headland and, in time, laying drains under it.
 *
 * ⚠ And it is genuinely dearer in heavy ground, because it is: a ditch in
 * sand is an afternoon and a ditch in clay is a week. The host's bill
 * multiplies the wetness by the fineness, so the two things that make
 * ground hard to drain compound the way they compound in life.
 *
 * ⭐⭐ **This is the act the extraction build promoted the mixin for.**
 * Draining a turbary oxidises and subsides the peat: you lose the fuel and
 * gain the best arable ground there is — a choice with no dominant option,
 * on exactly the same verb that drains a field.
 */

import { GroundWorkController, GROUND_TOPIC, LABOUR_PER_ACT } from './GroundWorkController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { GroundReading } from './GroundWorkController';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

/** ⭐ The instrument is bound by the view, never hunted for here. */
interface DitchModel extends CommandModel {
  tool?: MqlOneResult;
}

export default class DitchController extends GroundWorkController {
  async execute(model: DitchModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const reading = await this.groundOf(giver);
    if (!reading) {
      this.decline(context, Mml.compose`There is nothing here to drain.`, 'no-ground');
      return;
    }
    const tool = this.toolOf(model.tool?.stuff, 'digging');
    if (!tool) {
      this.decline(context, Mml.compose`You would want a spade for that.`, 'no-tool');
      return;
    }
    const { ground, bill } = reading;
    if (ground.progressOn('draining', bill) >= 1) {
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
      durationMs: this.paceFor(ground, 'draining', 5_000),
      cost: 5,
      beginSelf: Mml.compose`You open a line along the fall of the ground with ${Mml.thing(tool)}, throwing the spoil to the high side.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} starts cutting a ditch along the fall of the ground.`,
      onComplete: () => {
        void this.finish(context, reading);
      },
    });
  }

  private async finish(context: CommandContext, reading: GroundReading): Promise<void> {
    const giver = context.commandGiver;
    const { ground, bill } = reading;
    const after = ground.bankWork('draining', LABOUR_PER_ACT, bill);
    await ground.improvementSpoils('draining');
    MessageApi.scene(giver)
      .topic(GROUND_TOPIC)
      .toSelf(
        after >= 1
          ? Mml.compose`The line runs clean to the bottom and the water follows it. ${ground.improvementPhrase(bill)}.`
          : Mml.compose`Another length of it is open. It will take more before the wet corner dries.`,
      )
      .send();
    await this.credit(giver, bill.draining);
  }
}
