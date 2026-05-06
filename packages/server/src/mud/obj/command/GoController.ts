/**
 * GoController — locomotion: traverse a named exit or enter a sibling vessel.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import { MixinApi } from '../../api/mixin';
import { DescribeApi } from '../../api/describe';
import { MqlApi } from '../../api/mql';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Containable } from '../../lib/spatial/Containable';
import type { Mobile } from '../../lib/spatial/Mobile';
import type { Exit } from '../../lib/spatial/Exit';
import { ExitableVessel } from '../../lib/spatial/ExitableVessel';
import { resolveSetting } from '../../lib/shell/Environment';

interface GoModel extends CommandModel {
  target?: string;
}

export class GoController extends CommandController<GoModel> {
  async execute(
    model: GoModel,
    context: CommandContext
  ): Promise<CommandResult> {
    const { location } = context;

    const rawTarget = model.target;
    const target = rawTarget?.trim().toLowerCase();
    if (!target) {
      return { success: false, summary: 'go where?' };
    }

    const mover = context.commandGiver;
    if (!MixinApi.isContainable(mover) || !MixinApi.isMobile(mover)) {
      return { success: false, summary: "can't move" };
    }

    if (!MixinApi.isExitable(location)) {
      return { success: false, summary: "can't go anywhere from here" };
    }

    const namedExit = location.getExit(target);
    if (namedExit) {
      return this.traverse(namedExit, mover);
    }

    const resolved = MqlApi.resolve(target, {
      commandGiver: context.commandGiver,
      location,
      searchOrder: ['location'],
    });
    if (resolved instanceof ExitableVessel) {
      const entry = resolved.getEntryExit();
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
