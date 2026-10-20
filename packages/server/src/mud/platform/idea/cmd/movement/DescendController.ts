/**
 * DescendController — `descend` (`dive`) and `ascend` (`surface`):
 * ⭐ **up and down the water** (underwater D19).
 *
 * The verb is a sense, not a target: the place decides what down means.
 * Only a water affords it — beside one, the way in is `swim` (underwater
 * review: a dry bank has no up, and "down into it" was swim's act twice).
 *
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
import { BiomeApi } from '../../../../api/biome';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { SchedulerApi } from '../../../../api/scheduler';
import { WorldClockApi } from '../../../../api/worldclock';
import { ManualBuildStep } from '../../../../lib/craft/ManualBuildStep';


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
      return this.refuse(context, 'act.deed', 'You are not in the water.', 'not-in-water');
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
    // ⭐ At the top of the water there is no further up (found by the
    // drive): the basin's own `up` is the quay WALL, and `ascend` tried to
    // swim it. Out of the water is `climb`, by something you can climb.
    if (up && room.surfacePlace() === (room as unknown as Stuff)) {
      return this.refuse(context, 'act.deed', 'You are already at the surface.', 'at-surface');
    }
    const exit = room.getExit(up ? 'up' : 'down');
    if (!exit) {
      return up
        ? this.refuse(context, 'act.deed', 'You are already at the surface.', 'at-surface')
        : this.refuse(context, 'act.deed', 'The water is no deeper here.', 'no-deeper');
    }
    return this.swim(giver, exit, up, context);
  }

  /**
   * ⭐ The swim between two depths takes TIME (underwater review): the
   * meters over the body's own vertical speed, in real seconds, while
   * breath burns. It occupies your hands (you are stroking), lands at
   * completion, and `stop` — or blacking out on the way — leaves you
   * where you were. A step with no meters in it is just the crossing.
   */
  private async swim(giver: Stuff, exit: Exit, up: boolean, context: CommandContext): Promise<void> {
    const dest = await exit.resolveDestination();
    const fromM = BiomeApi.mediumFor(giver).depthM;
    const toM = MixinApi.isWaterPlace(dest) ? dest.mediumFor(giver).depthM : fromM;
    const meters = Math.abs(toM - fromM);
    const realS = MixinApi.isRespiration(giver) ? await giver.verticalSwimSeconds(meters, up) : 0;
    // Weight refuses the way up before you spend the breath on it.
    const here = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    if (up && here !== null && MixinApi.isWaterPlace(here)) {
      const veto = here.canRise(giver);
      if (!veto.ok) return this.refuse(context, 'act.deed', veto.reason, 'too-heavy');
    }
    if (!(realS > 0) || !MixinApi.isEngaged(giver)) return this.crossPicked(giver, exit, context);
    const scale = WorldClockApi.getScale();
    const step = new ManualBuildStep({
      actor: giver,
      slots: ['hands'],
      durationMs: realS * 1000 * (Number.isFinite(scale) && scale > 0 ? scale : 1),
      onComplete: () => {
        // Out cold on the way: you got no further.
        if (MixinApi.isVitals(giver) && giver.getConsciousness() !== 'conscious') return;
        void this.crossPicked(giver, exit, context);
      },
    });
    const started = SchedulerApi.start(step);
    if (!started.ok) {
      return this.refuse(context, 'act.deed', 'You are busy with your hands.', 'engagement-conflict');
    }
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(up ? Mml.compose`You kick for the light above.` : Mml.compose`You swim down.`)
      .toPeers(up ? Mml.compose`${Mml.actor(giver)} kicks upward.` : Mml.compose`${Mml.actor(giver)} swims down into the water.`)
      .send();
  }
}
