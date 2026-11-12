/**
 * StandController — `stand [on <thing>]`: one act, getting to your feet
 * (controller-liquidity W7c). Bare, it rises out of whatever you were
 * sitting, lying or kneeling on; named, it climbs up onto a chair or a
 * table that takes a standing body.
 *
 * ⭐ The host decides what standing on it is (`acceptPosture`): an
 * ordinary host takes you at rest; a floor where standing IS a slot you
 * hold — a water surface, an ice sheet (storage-and-ice D12) — answers
 * `held` when it already bears you (only the posture changes) and `rest`
 * when standing means getting back up ONTO it from the water (its
 * `canOccupy` says whether it bears you; its `occupy` ends the swim). The
 * controller words the answer. ⚠ The posture change itself stays here:
 * `transferPosture` is gated to the posture verbs.
 *
 * Validation surface (from `posture/stand.yaml`):
 *   - requiresAnimate, requiresPosed (verb-level)
 *   - `requires: [VisibleMixin, PosturedMixin]` (target-level — only with arg)
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { Postures, type PostureAnswer, type PostureRefusal } from '../../../../lib/slot/Postured';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import Place from '../../../../lib/stuff/Place';
import { Creature } from '../../../../lib/creature/Creature';

interface StandModel extends CommandModel {
  target?: MqlOneResult;
}

export default class StandController extends CommandController<StandModel> {
  async execute(model: StandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isPosed(giver)) {
      throw new Error(`StandController: requiresPosed validator should have caught ${giver.stuffId}`);
    }
    // ⭐ Under a ceiling lower than you, you cannot stand (size and carrying
    // D21) — wherever you would stand on. The body asks; nothing changes.
    const low = giver instanceof Creature ? giver.acceptPosture(Postures.Stand) : null;
    if (low !== null) {
      return this.refuse(context, 'act.deed', 'The ceiling is too low to stand up here.', low.reason);
    }

    // The host stood on: the named one, else a floor where standing is a
    // slot you hold. Ordinary ground is the free posture — no host.
    const named = model.target?.stuff ?? null;
    const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    const floor = room && MixinApi.isAdornable(room) ? room.getFloor() : null;
    const slotFloor =
      floor && MixinApi.isFloor(floor) && floor.supportIsSlotted() && MixinApi.isPostured(floor) &&
      MixinApi.isSlottable(giver) ? floor : null;
    const host: Stuff | null = named ?? slotFloor;

    if (host === null) {
      // ⭐ Nowhere to stand (mid-water): the place says why.
      const why = room instanceof Place ? room.groundRefusal() : null;
      if (why !== null) return this.refuse(context, 'act.deed', why, 'no-ground');
      giver.vacatePostureBearingSlots();
      giver.setPosture(Postures.Stand);
      return StandController.sayStood(giver);
    }
    if (!MixinApi.isPostured(host) || !MixinApi.isSlottable(giver)) {
      throw new Error(`StandController: requires: PosturedMixin / a slottable body expected for ${host.stuffId}`);
    }

    const answer: PostureAnswer = await host.acceptPosture(giver, Postures.Stand);
    if (!answer.ok) return this.refuse(context, 'act.deed', StandController.refusal(answer), answer.reason);
    if (answer.facts.as === 'held') {
      giver.setPosture(Postures.Stand);
      return StandController.sayStood(giver);
    }
    if (answer.facts.as === 'float') {
      return this.refuse(context, 'act.deed', 'There is nothing there to stand on.', 'cannot-stand');
    }
    const result = giver.transferPosture(host, Postures.Stand, 'stand');
    if (!result.ok) {
      MessageApi.scene(giver).topic('act.deed').toSelf(Mml.compose`${result.summary}`).send();
      context.note({ kind: 'controller-rejected', reason: result.reason, detail: result.summary });
      return;
    }
    if (named === null) {
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.compose`You haul yourself out and stand on ${Mml.thing(host)}, streaming water.`)
        .toPeers(Mml.compose`${Mml.actor(giver)} hauls out of the water and stands up, streaming.`)
        .send();
      return;
    }
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`You stand on ${Mml.thing(host)}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} stands on ${Mml.thing(host)}.`)
      .send();
  }

  protected static sayStood(giver: Stuff): void {
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`You stand up.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} stands up.`)
      .send();
  }

  /** Why the host would not take you standing, in words. */
  protected static refusal(r: PostureRefusal): string {
    switch (r.reason) {
      case 'not-a-swimmer':
      case 'not-at-surface':
      case 'cannot-float':
      case 'too-heavy':
        return 'There is nothing there to stand on.';
      default: {
        const unworded: never = r;
        throw new Error(`StandController: no words for ${String(unworded)}`);
      }
    }
  }
}
