/**
 * SwimVerticalControllerBase — `descend` and `ascend`, one controller each
 * (D16): ⭐ **up and down the water** (underwater D19).
 *
 * The verb is a sense, not a target: the place decides what down means.
 * Only a water affords it — beside one, the way in is `swim` (underwater
 * review: a dry bank has no up, and "down into it" was swim's act twice).
 *
 * The water place picks the way (`wayDown` / `wayUp`) and refuses in its
 * own words; the crossing takes the time the meters take
 * (`Exit.crossingRealS`), the same for `swim down` as for `descend`.
 */

import { LocomotionControllerBase, type LocomotionModel } from './LocomotionControllerBase';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MixinApi } from '../../../../api/mixin';

export abstract class SwimVerticalControllerBase extends LocomotionControllerBase {
  protected modeName(_context: CommandContext): string {
    return 'swim';
  }

  /** Which way this verb goes. */
  protected abstract goesUp(): boolean;

  override async execute(_model: LocomotionModel & CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    if (!MixinApi.isContainable(giver) || !MixinApi.isMobile(giver)) {
      return this.refuse(context, 'act.deed', "You can't move.", 'not-mobile');
    }
    const room = giver.getContainer();
    if (room === null || !MixinApi.isWaterPlace(room) || room.depthNow() <= 0) {
      return this.refuse(context, 'act.deed', 'You are not in the water.', 'not-in-water');
    }
    const way = this.goesUp() ? room.wayUp() : await room.wayDown(giver);
    if (!('exit' in way)) return this.refuse(context, 'act.deed', way.line, way.reason);
    return this.crossPicked(giver, way.exit, context);
  }
}
