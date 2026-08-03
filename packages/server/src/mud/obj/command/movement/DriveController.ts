/**
 * DriveController — drive verb (passthrough to a Drivable host).
 */

import { LocomotionControllerBase, type LocomotionModel } from './LocomotionControllerBase';
import type { CommandContext } from '../../../api/command';
import type { LocomotionMode } from '../../LocomotionMode';
import type { TraversalGuard } from '../../../lib/boundary/Exit';

export default class DriveController extends LocomotionControllerBase {
  protected modeName(_context: CommandContext): string {
    return 'drive';
  }

  protected override composeRejection(
    guard: TraversalGuard,
    mode: LocomotionMode,
    model: LocomotionModel,
  ): string {
    if (guard.gate === 'noConveyance') {
      return "You're not driving anything.";
    }
    return super.composeRejection(guard, mode, model);
  }
}
