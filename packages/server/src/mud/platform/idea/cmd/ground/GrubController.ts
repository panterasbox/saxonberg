/**
 * GrubController — `grub`, **the heaviest work there is on ground**.
 *
 * Grubbing out is the real word and the real job: thorn, bramble, root and
 * stone off ground that has been left to itself. It is the gate on
 * planting — you can sow sour, wet ground and get a bad crop, which is a
 * lesson; you cannot sow a thicket.
 *
 * ⭐⭐ **What comes up is the GROUND's to say.** The cleared stone that
 * becomes the wall, and the marl out of a limy corner, are
 * `trade-farming`'s rows and this file must not know their names — so it
 * asks the host (`improvementSpoils`) and narrates whatever it is handed.
 * A turbary answers with heather or with nothing, and a yard with rubble,
 * on the same mechanism and with no edit here.
 */

import { GroundWorkController, GROUND_TOPIC, LABOUR_PER_ACT } from './GroundWorkController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { GroundReading } from './GroundWorkController';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

/** ⭐ The instrument is bound by the view, never hunted for here. */
interface GrubModel extends CommandModel {
  tool?: MqlOneResult;
}

export default class GrubController extends GroundWorkController {
  async execute(model: GrubModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const reading = await this.groundOf(giver);
    if (!reading) {
      this.decline(context, Mml.compose`There is nothing here to grub out.`, 'no-ground');
      return;
    }
    const tool = this.toolOf(model.tool?.stuff, 'digging');
    if (!tool) {
      this.decline(context, Mml.compose`Not with your bare hands. You want a spade.`, 'no-tool');
      return;
    }
    const { ground, bill } = reading;
    if (ground.progressOn('clearing', bill) >= 1) {
      this.decline(
        context,
        Mml.compose`There is nothing left on this ground to grub out.`,
        'already-clear',
      );
      return;
    }

    const required = bill.clearing + bill.stonePicking;
    this.engageAct(context, {
      // Steep ground is slower, and stone is slower still — but the KERNEL
      // does not know why: the host prices its own pace.
      durationMs: this.paceFor(ground, 'clearing', 4_000),
      cost: 6,
      beginSelf: Mml.compose`You set to with ${Mml.thing(tool)}, cutting into the thorn and levering out what is under it.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} sets to grubbing out the rough ground.`,
      onComplete: () => {
        void this.finish(context, reading, required);
      },
    });
  }

  private async finish(
    context: CommandContext,
    reading: GroundReading,
    required: number,
  ): Promise<void> {
    const giver = context.commandGiver;
    const { ground, bill } = reading;
    const after = ground.bankWork('clearing', LABOUR_PER_ACT, bill);
    const spoils = await ground.improvementSpoils('clearing');

    const done = after >= 1;
    const spoilLine =
      spoils.length === 0
        ? ''
        : ` You stack ${spoils.map((s) => s.getPresentation()).join(' and ')} at the headland.`;
    MessageApi.scene(giver)
      .topic(GROUND_TOPIC)
      .toSelf(
        done
          ? Mml.compose`The last of it comes out. ${ground.improvementPhrase(bill)}.${spoilLine}`
          : Mml.compose`Another swathe of it comes out; ${ground.improvementCause(bill) ?? 'there is more to do'}.${spoilLine}`,
      )
      .send();
    await this.credit(giver, required);
  }
}
