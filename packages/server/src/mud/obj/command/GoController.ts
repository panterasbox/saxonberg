/**
 * GoController — locomotion: traverse a named exit or enter a sibling vessel.
 *
 * Phase 7+: the dispatcher pre-resolves `target` through MQL with
 * scope inherited from the player. When the match arrived through an
 * Exit (direction or door alias), the resolver stamps
 * `ctx.via.target.exit`; the controller traverses that exit directly.
 * Otherwise the resolved Stuff itself is consulted — an
 * `ExitableVessel` synthesizes its entry exit so the player can
 * enter sibling vessels naturally.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import { MixinApi } from '../../api/mixin';
import { DescribeApi } from '../../api/describe';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Containable } from '../../lib/spatial/Containable';
import type { Mobile } from '../../lib/spatial/Mobile';
import type { Exit } from '../../lib/spatial/Exit';
import { ExitableVessel } from '../../lib/spatial/ExitableVessel';
import { resolveSetting } from '../../lib/shell/Environment';

interface GoModel extends CommandModel {
  target?: Stuff;
}

export class GoController extends CommandController<GoModel> {
  async execute(
    model: GoModel,
    context: CommandContext
  ): Promise<CommandResult> {
    const target = model.target;
    if (!target) {
      return { success: false, summary: 'go where?' };
    }

    const mover = context.commandGiver;
    if (!MixinApi.isContainable(mover) || !MixinApi.isMobile(mover)) {
      return { success: false, summary: "can't move" };
    }

    const exit = context.via?.target?.exit;
    if (exit) return this.traverse(exit, mover);

    if (target instanceof ExitableVessel) {
      const entry = target.getEntryExit();
      if (entry) return this.traverse(entry, mover);
    }

    return { success: false, summary: "can't go that way" };
  }

  private async traverse(
    exit: Exit,
    mover: Stuff & Containable & Mobile
  ): Promise<CommandResult> {
    const guard = exit.canTraverse(mover);
    if (!guard.ok) {
      return {
        success: false,
        summary: guard.reason ?? "can't go that way",
      };
    }

    // `go` carries no verb of its own — it dispatches under the
    // mover's `movement.defaultMode` setting (declared on
    // MobileMixin; defaults to 'walk' via the schema fallback for
    // movers without EnvironmentMixin). Explicit verbs (`run`,
    // `climb`, …) get their own controllers and pass the verb
    // directly to `traverse`.
    const mode =
      resolveSetting<string>(mover, 'movement.defaultMode') ?? 'walk';
    await mover.traverse(exit, mode);

    const destName = DescribeApi.getDisplayName(exit.getDestination(), 'somewhere new');
    return { success: true, summary: `to ${destName}` };
  }
}
