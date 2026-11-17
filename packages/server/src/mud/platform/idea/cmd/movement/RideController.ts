/**
 * RideController — ride verb (passthrough to a Mountable host).
 */

import { LocomotionControllerBase } from './LocomotionControllerBase';
import type { CommandContext } from '../../../../api/command';

export default class RideController extends LocomotionControllerBase {
  protected modeName(_context: CommandContext): string {
    return 'ride';
  }
}
