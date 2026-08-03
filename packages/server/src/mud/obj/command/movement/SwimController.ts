/**
 * SwimController — swim verb. Verb-templated rejection prose for the
 * enablement / capability gates.
 */

import { LocomotionControllerBase, type LocomotionModel } from './LocomotionControllerBase';
import type { CommandContext } from '../../../api/command';
import type { LocomotionMode } from '../../LocomotionMode';
import type { TraversalGuard } from '../../../lib/boundary/Exit';

export default class SwimController extends LocomotionControllerBase {
  protected modeName(_context: CommandContext): string {
    return 'swim';
  }

  protected override composeRejection(
    guard: TraversalGuard,
    mode: LocomotionMode,
    model: LocomotionModel,
  ): string {
    if (guard.gate === 'enablement') {
      return "There's no water to swim in.";
    }
    if (guard.gate === 'capability') {
      return "This water's too rough for you.";
    }
    return super.composeRejection(guard, mode, model);
  }
}
