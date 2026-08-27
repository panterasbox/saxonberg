/**
 * RunController — the `run` verb, the fast/careless end of the care↔speed
 * axis. Moves through an exit committed to the `run` mode (faster, loud).
 * The base handles every gate; run needs no enablement / capability branch
 * (any ground mover can run), so the default rejection prose applies.
 * Running's detection penalty (it lowers traverse-time perception, so a
 * runner springs a trap a walk would step around) lands automatically via
 * the mode-attention modifier `HazardMixin.resolveTraversal` reads.
 */

import { LocomotionControllerBase } from './LocomotionControllerBase';
import type { CommandContext } from '../../../../api/command';

export default class RunController extends LocomotionControllerBase {
  protected modeName(_context: CommandContext): string {
    return 'run';
  }
}
