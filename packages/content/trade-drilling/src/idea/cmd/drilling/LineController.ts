/**
 * LineController — `line`, and it is the one act in the trade that buys
 * nothing except **the ability to keep going.**
 *
 * ⭐ Which is why it is interesting. A liner produces no goods, raises no
 * rate and improves no reading; it stops the hole caving in and it stops
 * the water above coming down into what you are trying to lift. Every
 * player who has got this far wanted to skip it and the ground simply
 * will not let them — and the refusal came with the remedy in it, so
 * nobody is stuck, only delayed and poorer.
 *
 * ⚠⚠ **It is leather and wood, not rubber.** A pre-industrial pump's
 * packing was leather and its casing was wood, and the drilling design
 * spent a while believing a seal had to be vulcanized before somebody
 * checked. The loop from drilling to rubber survives as a loop of
 * DEGREE — a rubber-packed liner is better — and not of dependency.
 */

import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import {
  DrillingActController,
  ACT_TOPIC,
  type DrillingModel,
} from './DrillingActController';
import type Wellhead from '../../../thing/Wellhead';

/** ⚠ A bound arg is an `MqlOneResult`, never a `Stuff`. */
interface LineModel extends DrillingModel {
  liner?: MqlOneResult;
}

/** The keyword a length of lining answers to. ⚠ Never `casing`. */
const LINER_WORD = 'liner';

const MINING = 'mining';
const LINE_MS = 45_000;
const LINE_COST = 11;

export default class LineController extends DrillingActController<LineModel> {
  public async execute(
    model: LineModel,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const place = this.placeOf(giver);
    if (!place) {
      this.decline(context, Mml.compose`You are nowhere to line anything.`, 'no-place');
      return;
    }
    if (this.derrickOf(model) === null) {
      this.noDerrick(context);
      return;
    }
    const hole = await this.wellheadOf(model);
    if (hole === null) {
      this.noHole(context);
      return;
    }
    if (hole.getDepthM() <= hole.getLinedToM()) {
      this.inform(
        context,
        Mml.compose`The hole is lined as far as it goes. Cut deeper first.`,
      );
      return;
    }

    const liner = (model.liner?.stuff ?? null) as Stuff | null;
    if (liner === null) {
      this.decline(
        context,
        Mml.compose`You have nothing to line it with. A length of tube — \`make liner\` takes two of timber.`,
        'no-liner',
      );
      return;
    }

    const toDepth = hole.getDepthM();
    this.engageAct(context, {
      durationMs: LINE_MS,
      cost: LINE_COST,
      beginSelf: Mml.compose`You start running tube down the hole.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} starts running tube down the hole.`,
      // ⚠⚠ A module function taking values. See the base's header.
      onComplete: () => {
        void completeLine(context, hole, liner, toDepth);
      },
    });
  }
}

/** The lining, landed. ⚠ Runs long after the controller is a corpse. */
async function completeLine(
  context: CommandContext,
  hole: Wellhead,
  liner: Stuff,
  toDepth: number,
): Promise<void> {
  if (context.commandGiver.isDestroyed()) return;
  const giver = context.commandGiver as unknown as Stuff;
  // ⚠ Re-check: the hole may have been deepened by the crew while the
  // tube was going down, which is fine — line to what it is now.
  const depth = Math.max(toDepth, hole.getLinedToM());
  hole.setLinedToM(depth);
  // The tube is in the ground and is not coming back.
  await StuffApi.destruct(liner);

  MessageApi.scene(giver)
    .topic(ACT_TOPIC)
    .toSelf(
      Mml.compose`The tube goes down and stays down. ${String(Math.round(depth))} m of the hole will hold now, and the water above it has nowhere to come in.`,
    )
    .toPeers(Mml.compose`${Mml.actor(giver)} lines the hole.`)
    .send();

  if (MixinApi.isAdvancing(giver)) {
    await giver.creditDeed({
      discipline: MINING,
      difficulty: 'standard',
      outcome: 'success',
    });
  }
  void LINER_WORD;
}
