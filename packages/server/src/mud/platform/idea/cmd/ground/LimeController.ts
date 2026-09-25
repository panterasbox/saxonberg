/**
 * LimeController — `lime`, the one amendment that is genuinely one-way.
 *
 * ⭐ **pH is the soil property that is both invisible and decisive.** Sour
 * ground looks exactly like sweet ground and grows a visibly poor crop; the
 * fix is dear, slow to undo and entirely wasted if the ground did not need
 * it. That is why `measure acidity` exists, and this is what you do about
 * the answer.
 *
 * ⭐⭐ **It runs on a material TAG, not on a row**, and that is what makes
 * it a choice rather than a rule. Anything whose material carries `liming`
 * answers: **marl**, dug out of a limy field with `grub`, needs no kiln, no
 * fuel and no other trade — and **quicklime** off a limekiln is faster and
 * more aggressive and costs the fuel somebody else wanted. Marl is slow and
 * free; quicklime is fast and burnt. Neither dominates, and this file names
 * neither.
 */

import { GroundWorkController, GROUND_TOPIC, LABOUR_PER_ACT } from './GroundWorkController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { GroundReading } from './GroundWorkController';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';

/**
 * The material tag a liming agent carries. ⭐ An open vocabulary, like every
 * material tag: marl and quicklime both answer it, and a pack that ships a
 * third sweetener needs no edit here. The VIEW's default asks for it
 * (`[material.liming]`); this only confirms what the binder handed back.
 */
const LIMING_TAG = 'liming';

/** ⭐ The sweetener is bound by the view, never hunted for here. */
interface LimeModel extends CommandModel {
  agent?: MqlOneResult;
}

export default class LimeController extends GroundWorkController {
  async execute(model: LimeModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const reading = await this.groundOf(giver);
    if (!reading) {
      this.decline(context, Mml.compose`There is nothing here to lime.`, 'no-ground');
      return;
    }
    const { ground, bill } = reading;
    if (ground.progressOn('liming', bill) >= 1) {
      this.decline(
        context,
        bill.liming <= 0
          ? Mml.compose`This ground is sweet enough already. Lime would be money in a ditch.`
          : Mml.compose`This ground has had all the lime it wants.`,
        'already-limed',
      );
      return;
    }
    const agent = this.limingAgent(model.agent?.stuff);
    if (!agent) {
      this.decline(
        context,
        Mml.compose`You have nothing to spread. Marl, off a limy field, is what most people use.`,
        'no-agent',
      );
      return;
    }

    this.engageAct(context, {
      durationMs: this.paceFor(ground, 'liming', 4_000),
      cost: 4,
      beginSelf: Mml.compose`You break up ${Mml.thing(agent)} and cast it out across the ground.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} spreads something pale across the ground, handful by handful.`,
      onComplete: () => {
        void this.finish(context, reading, agent);
      },
    });
  }

  private async finish(
    context: CommandContext,
    reading: GroundReading,
    agent: Stuff,
  ): Promise<void> {
    const giver = context.commandGiver;
    const { ground, bill } = reading;
    // The material is consumed by the spreading, whatever it was.
    StuffApi.destruct(agent);
    const after = ground.bankWork('liming', LABOUR_PER_ACT, bill);
    MessageApi.scene(giver)
      .topic(GROUND_TOPIC)
      .toSelf(
        after >= 1
          ? Mml.compose`That is the last of what this ground wanted. ${ground.improvementPhrase(bill)}.`
          : Mml.compose`It goes on white and weathers in. There is more owing before the sourness is out of it.`,
      )
      .send();
    await this.credit(giver, bill.liming);
  }

  /**
   * The bound thing, if it is actually made of something that limes.
   *
   * ⚠ It used to walk the giver's contents itself, which meant no player
   * could ever say WHICH sack — and the walk is exactly what
   * `lint:instrument-args` exists to keep at zero. The view's
   * `[material.liming]` default does the finding now.
   */
  private limingAgent(bound: Stuff | null | undefined): Stuff | null {
    if (!bound) return null;
    if (!MixinApi.isTangible(bound)) return null;
    return bound.hasMaterialTag(LIMING_TAG) ? bound : null;
  }
}
