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
import type { WaterEntryRefusal } from '../../../../lib/location/WaterEntry';
import { MixinApi } from '../../../../api/mixin';

export default class SwimController extends LocomotionControllerBase {
  protected modeName(_context: CommandContext): string {
    return 'swim';
  }

  /**
   * ⭐ `swim` with no target — *swim here* (storage-and-ice D12): get into
   * the water. The PLACE answers (`WaterEntry`, controller-liquidity W8):
   * off a pool's open surface you go in where you are; beside a water (a
   * quay, a strand) it is the way off the edge, which this crosses; on dry
   * ground, why not. With a target it is the shipped crossing.
   */
  override async execute(model: LocomotionModel & CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    // A way that was TYPED is the crossing even when it names no exit —
    // `swim north` at a bank with no north said "no open water here"
    // (the storage-and-ice drive); the crossing's refusal names the way.
    const typed = (model.target as { raw?: string } | null | undefined)?.raw?.trim() ?? '';
    if ((model.target && model.target.stuff !== null) || typed !== '') {
      // ⭐ Standing in the water, a stroke is pushing off (river drive, A3).
      if (room !== null && MixinApi.isWaterPlace(room)) room.pushOff(giver);
      return super.execute(model, context);
    }
    const way = room !== null && MixinApi.isWaterEntry(room)
      ? await room.wayIntoWater(giver)
      : ({ ok: false, reason: 'no-open-water' } as const);
    if (!way.ok) return this.refuse(context, 'act.deed', SwimController.noWayWords(way), way.reason);
    if (way.facts.exit !== null) return this.crossPicked(giver, way.facts.exit, context);
  }

  /** Why there is no way into the water, in words. */
  protected static noWayWords(r: WaterEntryRefusal): string {
    switch (r.reason) {
      case 'no-water':
        return 'There is no water here to go into.';
      case 'iced-over':
        return 'The water is iced over. The only way in is through a hole in the ice.';
      case 'no-open-water':
        return 'There is no open water here to swim in.';
      case 'already-in-water':
        return 'You are already in the water.';
      default: {
        const unworded: never = r;
        throw new Error(`SwimController: no words for ${String(unworded)}`);
      }
    }
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
