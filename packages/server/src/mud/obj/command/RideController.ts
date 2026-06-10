/**
 * RideController — ride verb (passthrough to a Mountable host).
 */

import { LocomotionControllerBase, type LocomotionModel } from './LocomotionControllerBase';
import type { CommandContext } from '../../api/command';
import type { LocomotionMode } from '../../lib/locomotion/LocomotionMode';
import type { TraversalGuard } from '../../lib/boundary/Exit';

export default class RideController extends LocomotionControllerBase {
  protected modeName(_context: CommandContext): string {
    return 'ride';
  }

  protected override composeRejection(
    guard: TraversalGuard,
    mode: LocomotionMode,
    model: LocomotionModel,
  ): string {
    if (guard.gate === 'noConveyance') {
      return "You're not mounted.";
    }
    return super.composeRejection(guard, mode, model);
  }
}
