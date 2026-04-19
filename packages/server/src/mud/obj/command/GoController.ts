/**
 * GoController — locomotion: traverse a named exit or enter a sibling vessel.
 *
 * Resolution order on the avatar's current location (`context.location`):
 *   1. As an exit name. `location.getExit(target)` covers the explicit map
 *      (named cardinals, semantic labels, vessel-synthesized `'out'`) and
 *      zone-derived cartesian exits.
 *   2. As an object keyword. Hand `target` to `MqlApi.resolve()` — same path
 *      as any other object-targeting command. If the resolved object is an
 *      `ExitableVessel`, enter it via `getEntryExit()`.
 *   3. Otherwise → "You can't go that way."
 *
 * Direction aliases (`n` → `north`, etc.) are intentionally NOT handled here.
 * Verb-level aliasing will be a separate subsystem. Likewise, multi-match
 * "which one do you mean?" disambiguation will be a command-framework
 * concern shared by every MQL-using controller — NOT local to this one.
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

export interface GoOutput {
  text: string;
}

export class GoController extends CommandController<GoInput, GoOutput> {
  execute(input: GoInput, context: CommandContext): CommandResult<GoOutput> {
    const { location } = context;

    const target = input.target?.trim().toLowerCase();
    if (!target) {
      return { success: false, error: 'Go where?' };
    }

    // Locomotion requires a Containable + Mobile mover. Narrow the giver up
    // front so the traversal path is type-safe and we reject disembodied /
    // non-mobile givers cleanly.
    const mover = context.commandGiver;
    if (!MixinApi.isContainable(mover) || !MixinApi.isMobile(mover)) {
      return { success: false, error: "You can't move." };
    }

    if (!MixinApi.isExitable(location)) {
      return { success: false, error: "You can't go anywhere from here." };
    }

    const namedExit = location.getExit(target);
    if (namedExit) {
      return this.#traverse(namedExit, mover);
    }

    const resolved = MqlApi.resolve(target, {
      commandGiver: context.commandGiver,
      location,
      searchOrder: ['location'],
    });
    if (resolved instanceof ExitableVessel) {
      const entry = resolved.getEntryExit();
      if (entry) return this.#traverse(entry, mover);
    }

    return { success: false, error: "You can't go that way." };
  }

  #traverse(
    exit: Exit,
    mover: Stuff & Containable & Mobile
  ): CommandResult<GoOutput> {
    const guard = exit.canTraverse(mover);
    if (!guard.ok) {
      return { success: false, error: guard.reason ?? "You can't go that way." };
    }

    mover.traverse(exit);

    const destName = DescribeApi.getDisplayName(exit.destination, 'somewhere new');
    return {
      success: true,
      output: { text: `<location>${destName}</location>` },
    };
  }
}
