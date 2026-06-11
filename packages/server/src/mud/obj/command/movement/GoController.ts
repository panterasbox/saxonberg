/**
 * GoController — locomotion: dispatch-by-default-mode.
 *
 * Reads the actor's default mode via the
 * `LocomotionApi.defaultModeFor` chain (explicit setting → bodyplan
 * default → universe `'walk'`) and runs the same pipeline as a literal
 * mode verb. `go` is deliberately dumb — it dispatches whatever the
 * chain resolves to, regardless of the target exit's `media`. The
 * exit's gate surfaces a typed rejection (`gate: 'exitMode'`) when
 * the resolved mode isn't accepted.
 *
 * Since `LocomotionControllerBase` uses the same `target: MqlOneResult`
 * model shape as `go.yaml` already used (resolved by MQL via the
 * `canReach` validator), GoController needs NO adapter — it just
 * overrides `modeName()`. The ExitableVessel entry-exit fallback
 * (`go cabin` into a sibling vessel) lives in the base class and is
 * inherited cleanly.
 */

import { LocomotionControllerBase } from './LocomotionControllerBase';
import type { CommandContext } from '../../../api/command';
import { LocomotionApi } from '../../../api/locomotion';

export default class GoController extends LocomotionControllerBase {
  protected modeName(context: CommandContext): string {
    return LocomotionApi.defaultModeFor(context.commandGiver);
  }
}
