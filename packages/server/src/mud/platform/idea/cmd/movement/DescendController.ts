/**
 * DescendController — `descend` (`dive`, `jump`) and `ascend` (`surface`):
 * ⭐ **up and down the water** (underwater D19).
 *
 * The verb is a sense, not a target: the place decides what down means.
 *
 *  - **Beside the water** (a shore that is not itself a water): down is
 *    into the water — the way out of here whose far side IS a water place.
 *  - **In a water** (the surface, or a band of its column): down is the
 *    column's `down`, swum; up is its `up`. A water with no column has no
 *    down; the surface has no up.
 *  - **On the ice or the bank of a hole**: you let go of what is holding
 *    you up first, and go in.
 *
 * Every refusal is the place's or the crossing's, in its own words; the
 * controller only picks the way and the mode.
 */

import { LocomotionControllerBase, type LocomotionModel } from './LocomotionControllerBase';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type Exit from '../../../../lib/boundary/Exit';
import { MixinApi } from '../../../../api/mixin';
import { StuffApi } from '../../../../api/stuff';
import { LocomotionApi } from '../../../../api/locomotion';

export default class DescendController extends LocomotionControllerBase {
  protected modeName(_context: CommandContext): string {
    return 'swim';
  }

  /** `ascend` / `surface` go up; everything else goes down. */
  private goesUp(context: CommandContext): boolean {
    return context.verb === 'ascend' || context.verb === 'surface';
  }

  override async execute(_model: LocomotionModel & CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    if (!MixinApi.isContainable(giver) || !MixinApi.isMobile(giver)) {
      return this.refuse(context, 'act.deed', "You can't move.", 'not-mobile');
    }
    const room = giver.getContainer();
    if (room === null || !MixinApi.isExitable(room)) {
      return this.refuse(context, 'act.deed', 'There is no water here.', 'no-water');
    }
    const up = this.goesUp(context);

    if (!MixinApi.isWaterPlace(room)) {
      if (up) return this.refuse(context, 'act.deed', 'You are not in the water.', 'not-in-water');
      const into = this.wayIntoWater(room as unknown as Stuff & { getExits(): Map<string, Exit> });
      if (into === null) return this.refuse(context, 'act.deed', 'There is no water here to go into.', 'no-water');
      return this.cross(giver, into, context);
    }

    if (!up) {
      // On the ice, or held up at the edge: let go and go in first.
      const floor = MixinApi.isAdornable(room) ? room.getFloor() : null;
      if (floor !== null && MixinApi.isFloor(floor) && floor.supportIsSlotted() && floor.supports(giver)) {
        if (!(floor.openWaterAreaM2() > 0)) {
          return this.refuse(context, 'act.deed', 'There is no open water here to go down into.', 'no-open-water');
        }
        floor.giveWay(giver, true);
      }
      await room.ensureColumnExits();
    }
    const exit = room.getExit(up ? 'up' : 'down');
    if (!exit) {
      return up
        ? this.refuse(context, 'act.deed', 'You are already at the surface.', 'at-surface')
        : this.refuse(context, 'act.deed', 'The water is no deeper here.', 'no-deeper');
    }
    return this.cross(giver, exit, context);
  }

  /** The way out of a shore whose far side is a water place, if it has one. */
  private wayIntoWater(room: Stuff & { getExits(): Map<string, Exit> }): Exit | null {
    for (const [, exit] of room.getExits()) {
      const path = exit.getDestinationTemplatePath?.() ?? null;
      const dest = path ? StuffApi.findByTemplatePath<Stuff>(path) : undefined;
      if (dest && MixinApi.isWaterPlace(dest)) return exit;
    }
    return null;
  }

  private async cross(giver: Stuff, exit: Exit, context: CommandContext): Promise<void> {
    if (!MixinApi.isMobile(giver)) return;
    await LocomotionApi.preloadActorAnatomy(giver);
    const mode = await LocomotionApi.loadMode('swim');
    const guard = await giver.traverse(exit, mode.getName());
    if (!guard.ok) this.emitRejection(guard, mode, {} as LocomotionModel, context);
  }
}
