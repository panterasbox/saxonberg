/**
 * StandController — slot-less posture flip per § 12 asymmetry.
 * Vacates any current posture-bearing slot and sets posture to Stand.
 * With an argument (`stand <X>`), occupies a slot on X accepting the
 * Stand posture (e.g., standing on a chair or table) via
 * the actor's own `transferPosture` (the OO sweep).
 *
 * Validation surface (from `cmd/stand.yaml`):
 *   - requiresAnimate, requiresPosed (verb-level)
 *   - `requires: [VisibleMixin, PosturedMixin]` (target-level — only with arg)
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { Postures } from '../../../../lib/slot/Postured';
import type { Stuff } from '../../../../lib/stuff/Stuff';

interface StandModel extends CommandModel {
  target?: MqlOneResult;
}

export default class StandController extends CommandController<StandModel> {
  execute(model: StandModel, context: CommandContext): void {
    const giver = context.commandGiver;
    if (!MixinApi.isPosed(giver)) {
      throw new Error(
        `StandController: requiresPosed validator should have caught ${giver.stuffId}`
      );
    }

    // With-arg form: stand ON something (chair, table, …).
    const target = model.target?.stuff;
    if (target) {
      if (!MixinApi.isPostured(target)) {
        throw new Error(
          `StandController: requires: PosturedMixin should have caught ${target.stuffId}`
        );
      }
      if (!MixinApi.isSlottable(giver)) {
        throw new Error(
          `StandController: requiresSlottable expected — actor cannot occupy a slot`
        );
      }
      const result = giver.transferPosture(target,
        Postures.Stand,
        'stand'
      );
      if (!result.ok) {
        MessageApi.scene(giver)
          .topic('act.deed')
          .toSelf(Mml.compose`${result.summary}`)
          .send();
        context.note({
          kind: 'controller-rejected',
          reason: result.reason,
          detail: result.summary,
        });
        return;
      }
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.compose`You stand on ${Mml.thing(target)}.`)
        .toPeers(
          Mml.compose`${Mml.actor(giver)} stands on ${Mml.thing(target)}.`
        )
        .send();
      return;
    }

    // ⭐ On a floor where standing IS a slot you hold — a water surface,
    // an ice sheet (storage-and-ice D12) — bare `stand` from the water is
    // getting back up ONTO it, and the floor decides whether it bears you.
    const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    const floor = (room as unknown as { getFloor?(): unknown } | null)?.getFloor?.() as Stuff | null;
    if (
      floor &&
      MixinApi.isFloor(floor) &&
      floor.supportIsSlotted() &&
      MixinApi.isPostured(floor) &&
      MixinApi.isSlottable(giver)
    ) {
      if (floor.supports(giver)) {
        giver.setPosture(Postures.Stand);
        MessageApi.scene(giver)
          .topic('act.deed')
          .toSelf(Mml.compose`You stand up.`)
          .toPeers(Mml.compose`${Mml.actor(giver)} stands up.`)
          .send();
        return;
      }
      const result = giver.transferPosture(floor, Postures.Stand, 'stand');
      if (!result.ok) {
        MessageApi.scene(giver).topic('act.deed').toSelf(Mml.compose`${result.summary}`).send();
        context.note({ kind: 'controller-rejected', reason: result.reason, detail: result.summary });
        return;
      }
      // Out of the water: no longer swimming.
      if (MixinApi.isMobile(giver)) giver.setEngagedMode(null);
      MessageApi.scene(giver)
        .topic('act.deed')
        .toSelf(Mml.compose`You haul yourself out and stand on ${Mml.thing(floor)}, streaming water.`)
        .toPeers(Mml.compose`${Mml.actor(giver)} hauls out of the water and stands up, streaming.`)
        .send();
      return;
    }

    // Slot-less form: just vacate any current posture-bearing slot.
    giver.vacatePostureBearingSlots();
    giver.setPosture(Postures.Stand);
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(Mml.compose`You stand up.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} stands up.`)
      .send();
    return;
  }
}
