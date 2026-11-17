/**
 * StoopController — the `stoop` verb (size and carrying D20): through an
 * exit bent low, under a lintel you are too tall to walk beneath. Lower
 * than a walk (`crouched`), a little slower, no quieter. The base handles
 * every gate; the way's clearance is asked in `Exit.canTraverse`.
 */

import { LocomotionControllerBase } from './LocomotionControllerBase';
import type { CommandContext } from '../../../../api/command';

export default class StoopController extends LocomotionControllerBase {
  protected modeName(_context: CommandContext): string {
    return 'stoop';
  }
}
