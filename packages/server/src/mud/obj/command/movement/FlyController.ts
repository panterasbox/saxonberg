/**
 * FlyController — fly verb. Verb-templated rejection prose for
 * enablement / capability gates.
 */

import { LocomotionControllerBase, type LocomotionModel } from './LocomotionControllerBase';
import type { CommandContext } from '../../../api/command';
import type { LocomotionMode } from '../../../lib/locomotion/LocomotionMode';
import type { TraversalGuard } from '../../../lib/boundary/Exit';

export default class FlyController extends LocomotionControllerBase {
  protected modeName(_context: CommandContext): string {
    return 'fly';
  }

  protected override composeRejection(
    guard: TraversalGuard,
    mode: LocomotionMode,
    model: LocomotionModel,
  ): string {
    if (guard.gate === 'enablement') {
      return "There's no room to fly here.";
    }
    if (guard.gate === 'capability') {
      return "The wind's too strong for you to fly.";
    }
    return super.composeRejection(guard, mode, model);
  }
}
