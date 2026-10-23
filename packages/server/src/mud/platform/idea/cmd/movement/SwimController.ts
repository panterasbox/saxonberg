/**
 * SwimController — swim verb. Verb-templated rejection prose for the
 * enablement / capability gates.
 */

import { LocomotionControllerBase, type LocomotionModel } from './LocomotionControllerBase';
import type { CommandContext } from '../../../../api/command';
import type { LocomotionMode } from '../../LocomotionMode';
import type { TraversalGuard } from '../../../../lib/boundary/Exit';
import type { CommandModel } from '../../../../api/command';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MixinApi } from '../../../../api/mixin';
import WaterSurface from '../../../thing/WaterSurface';

export default class SwimController extends LocomotionControllerBase {
  protected modeName(_context: CommandContext): string {
    return 'swim';
  }

  /**
   * ⭐ `swim` with no target — *swim here* (storage-and-ice D12): let go of
   * the floor and go into the water where you are. The floor decides: one
   * with open water drops you in, gently; one with none refuses. Beside a
   * water (a quay, a strand) it is the way in, which the shore names
   * (underwater review). With a target it is the shipped crossing.
   */
  override async execute(model: LocomotionModel & CommandModel, context: CommandContext): Promise<void> {
    // A way that was TYPED is the crossing even when it names no exit —
    // `swim north` at a bank with no north said "no open water here"
    // (the storage-and-ice drive); the crossing's refusal names the way.
    const typed = (model.target as { raw?: string } | null | undefined)?.raw?.trim() ?? '';
    if ((model.target && model.target.stuff !== null) || typed !== '') {
      // ⭐ Standing in the water, a stroke is pushing off (river drive, A3):
      // the bed lets you go into the water and the swim proceeds — not
      // "this water's too rough for you", which is what the swim gate says
      // of anybody the bed is holding.
      const giver = context.commandGiver as unknown as Stuff;
      const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;
      const floor = room !== null && MixinApi.isWaterPlace(room) && MixinApi.isAdornable(room) ? room.getFloor() : null;
      if (floor instanceof WaterSurface && floor.supports(giver) && floor.openWaterAreaM2() > 0) floor.giveWay(giver, true);
      return super.execute(model, context);
    }
    const giver = context.commandGiver as unknown as Stuff;
    const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    // ⭐ `dive` in the water is down (underwater review): the place picks
    // the way, the same as `descend`.
    // Off the ice at a hole, the water place lets go of you first.
    if (context.verb === 'dive' && room !== null && MixinApi.isWaterPlace(room)) {
      const way = await room.wayDown(giver);
      if (!('exit' in way)) return this.refuse(context, 'act.deed', way.line, way.reason);
      return this.crossPicked(giver, way.exit, context);
    }
    const floor = room ? (MixinApi.isAdornable(room) ? room.getFloor() : null) : null;
    if (!(floor instanceof WaterSurface) && room !== null && MixinApi.isShore(room) && !MixinApi.isWaterPlace(room)) {
      if (MixinApi.isFrameSited(room)) await room.frameSiteStood();
      const way = room.wayIntoWater();
      if ('refusal' in way) return this.refuse(context, 'act.deed', way.line, way.refusal);
      return this.crossPicked(giver as Stuff, way.exit, context);
    }
    if (!(floor instanceof WaterSurface)) {
      return this.refuse(context, 'act.deed', 'There is no open water here to swim in.', 'no-open-water');
    }
    const out = floor.goIn(giver);
    if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
  }

  protected override composeRejection(
    guard: TraversalGuard,
    mode: LocomotionMode,
    model: LocomotionModel,
  ): string {
    if (guard.gate === 'enablement') {
      return "You can't swim that way.";
    }
    if (guard.gate === 'capability') {
      return "This water's too rough for you.";
    }
    return super.composeRejection(guard, mode, model);
  }
}
