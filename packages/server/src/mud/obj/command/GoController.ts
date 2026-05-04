/**
 * GoController — locomotion: traverse a named exit or enter a sibling vessel.
 *
 * Stage 7a: shape-only update. Mover.traverse / announceArrival /
 * announceDeparture handle prose in Stage 9; the controller just
 * narrows + dispatches and returns the semantic outcome.
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../api/command';
import { MixinApi } from '../../api/mixin';
import { DescribeApi } from '../../api/describe';
import { MqlApi } from '../../api/mql';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Containable } from '../../lib/spatial/Containable';
import type { Mobile } from '../../lib/spatial/Mobile';
import type { Exit } from '../../lib/spatial/Exit';
import { ExitableVessel } from '../../lib/spatial/ExitableVessel';

export interface GoInput {
  target?: string;
}

export class GoController extends CommandController<GoInput> {
  execute(input: GoInput, context: CommandContext): CommandResult {
    const { location } = context;

    const target = input.target?.trim().toLowerCase();
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

  private traverse(
    exit: Exit,
    mover: Stuff & Containable & Mobile
  ): CommandResult {
    const guard = exit.canTraverse(mover);
    if (!guard.ok) {
      return {
        success: false,
        summary: guard.reason ?? "can't go that way",
      };
    }

    mover.traverse(exit);

    const destName = DescribeApi.getDisplayName(exit.destination, 'somewhere new');
    return { success: true, summary: `to ${destName}` };
  }
}
