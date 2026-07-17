/**
 * SneakController — the `sneak` verb, the careful/quiet end of the
 * care↔speed axis. Moves through an exit committed to the `sneak` mode
 * (slower, crouched, quiet). The base handles every gate; sneak needs no
 * enablement / capability branch (any ground mover can sneak), so the
 * default rejection prose applies. Sneaking's detection edge (it raises
 * traverse-time perception over a concealed trap) lands automatically via
 * the mode-attention modifier `HazardMixin.resolveTraversal` reads.
 */

import { LocomotionControllerBase } from './LocomotionControllerBase';
import type { CommandContext } from '../../../api/command';

export default class SneakController extends LocomotionControllerBase {
  protected modeName(_context: CommandContext): string {
    return 'sneak';
  }
}
