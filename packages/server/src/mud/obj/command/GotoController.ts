/**
 * GotoController — relocate the avatar to `<target>`'s location.
 *
 * Orchestration shape: try `Mobile.teleport` first (the polished
 * path with announcements + auto-look); on Mobile-level veto, fall
 * back to `ContainmentApi.move` (or `forceMove` with `-f`). The
 * `-l` flag re-fires `autoLookOnArrival` on the raw-move fallback
 * path so the avatar still sees where they landed when the polished
 * path was bypassed.
 *
 * No pathfinding — the slate's stated non-goal. `goto X` plants the
 * avatar in `X`'s location directly.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi, ContainmentError } from '../../api/containment';
import { DescribeApi } from '../../api/describe';
import type { Containable } from '../../lib/spatial/Containable';
import type { Stuff } from '../../lib/stuff/Stuff';

interface GotoModel extends CommandModel {
  target?: MqlOneResult;
  force?: boolean;
  look?: boolean;
}

export class GotoController extends CommandController<GotoModel> {
  async execute(model: GotoModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target;
    if (!target || target.stuff === null) {
      return this.fail(
        context,
        'unknown-target',
        `no match for ${target?.raw ?? '?'}`,
      );
    }
    const targetStuff = target.stuff;
    if (!MixinApi.isContainable(targetStuff)) {
      return this.fail(context, 'no-location', 'target has no location');
    }
    const dest = targetStuff.getContainer();
    if (!dest) {
      return this.fail(context, 'no-location', 'target has no location');
    }
    const destName = DescribeApi.getDisplayName(dest);

    if (!MixinApi.isContainable(giver)) {
      return this.fail(context, 'cannot-move', 'cannot move yourself');
    }

    // 1. Polished path.
    if (MixinApi.isMobile(giver)) {
      try {
        giver.teleport(dest);
        return;
      } catch (err) {
        if (!(err instanceof ContainmentError)) throw err;
      }
    }

    // 2. Raw fallback.
    try {
      const op = model.force
        ? ContainmentApi.forceMove
        : ContainmentApi.move;
      op(giver as Stuff & Containable, dest);
    } catch (err) {
      return this.fail(context, 'move-failed', (err as Error).message);
    }
    if (model.look && MixinApi.isMobile(giver)) {
      // Fire-and-forget; same swallow rationale as in `Mobile.teleport`
      // — an auto-look failure shouldn't cancel an already-completed move.
      void giver.autoLookOnArrival().catch(() => {});
    }
    this.tell(context, `\narrived at ${destName} (fallback)\n`);
    return;
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('system.shell.movement')
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(
    context: CommandContext,
    reason: string,
    detail: string,
  ): void {
    this.tell(context, `\n${detail}\n`);
    context.note({ kind: 'controller-rejected', reason, detail });
    return;
  }
}
