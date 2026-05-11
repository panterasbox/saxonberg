/**
 * WalkController — walk verb. Uses the base's default rejection prose
 * (walk has no enablement / capability gate; those branches never
 * fire for this mode).
 */

import { LocomotionControllerBase } from './LocomotionControllerBase';
import type { CommandContext } from '../../api/command';

export class WalkController extends LocomotionControllerBase {
  protected modeName(_context: CommandContext): string {
    return 'walk';
  }
}
