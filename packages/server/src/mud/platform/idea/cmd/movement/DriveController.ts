/**
 * DriveController — drive verb (passthrough to a Drivable host).
 */

import { LocomotionControllerBase } from './LocomotionControllerBase';
import type { CommandContext } from '../../../../api/command';

export default class DriveController extends LocomotionControllerBase {
  protected modeName(_context: CommandContext): string {
    return 'drive';
  }
}
