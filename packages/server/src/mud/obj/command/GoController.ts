/**
 * GoController — locomotion: dispatch-by-default-mode.
 *
 * Reads the actor's `movement.defaultMode` setting (default `'walk'`)
 * and runs the same pipeline as a literal mode verb. `go` is
 * deliberately dumb — it dispatches whatever the setting says,
 * regardless of the target exit's `allowedModes`. The exit's gate
 * surfaces a typed rejection (`gate: 'exitMode'`) when the resolved
 * mode isn't accepted.
 *
 * Since `LocomotionControllerBase` uses the same `target: MqlOneResult`
 * model shape as `go.yaml` already used (resolved by MQL via the
 * `canReach` validator), GoController needs NO adapter — it just
 * overrides `modeName()`. The ExitableVessel entry-exit fallback
 * (`go cabin` into a sibling vessel) lives in the base class and is
 * inherited cleanly.
 */

import { LocomotionControllerBase } from './LocomotionControllerBase';
import type { CommandContext } from '../../api/command';
import { resolveSetting } from '../../lib/shell/Environment';

export class GoController extends LocomotionControllerBase {
  protected modeName(context: CommandContext): string {
    return (
      resolveSetting<string>(context.commandGiver, 'movement.defaultMode') ??
      'walk'
    );
  }
}
