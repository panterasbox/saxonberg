/**
 * FlyController — fly verb. Its refusals are worded by its mode row
 * (`refusals`, navigation-server D8).
 */

import { LocomotionControllerBase } from './LocomotionControllerBase';
import type { CommandContext } from '../../../../api/command';

export default class FlyController extends LocomotionControllerBase {
  protected modeName(_context: CommandContext): string {
    return 'fly';
  }
}
