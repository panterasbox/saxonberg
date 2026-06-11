/**
 * ClimbController — climb verb. Verb-templated rejection prose:
 * climbs that fail at capability read "this climb looks too hard for
 * you"; missing-Climbable reads "there's nothing to climb {direction}".
 */

import { LocomotionControllerBase, type LocomotionModel } from './LocomotionControllerBase';
import type { CommandContext } from '../../../api/command';
import type { LocomotionMode } from '../../../lib/locomotion/LocomotionMode';
import type { TraversalGuard } from '../../../lib/boundary/Exit';

export default class ClimbController extends LocomotionControllerBase {
  protected modeName(_context: CommandContext): string {
    return 'climb';
  }

  protected override composeRejection(
    guard: TraversalGuard,
    mode: LocomotionMode,
    model: LocomotionModel,
  ): string {
    if (guard.gate === 'enablement') {
      const direction = model.target?.via?.exit?.getDirection() ?? 'that way';
      return `There's nothing to climb ${direction}.`;
    }
    if (guard.gate === 'capability') {
      return 'This climb looks too hard for you.';
    }
    return super.composeRejection(guard, mode, model);
  }
}
