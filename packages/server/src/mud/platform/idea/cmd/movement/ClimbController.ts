/**
 * ClimbController — climb verb. Its refusals are worded by its mode row
 * (`refusals`, navigation-server D8): "This climb looks too hard for
 * you", "There's nothing to climb {dir}".
 */

import { LocomotionControllerBase } from './LocomotionControllerBase';
import type { CommandContext } from '../../../../api/command';

export default class ClimbController extends LocomotionControllerBase {
  protected modeName(_context: CommandContext): string {
    return 'climb';
  }
}
