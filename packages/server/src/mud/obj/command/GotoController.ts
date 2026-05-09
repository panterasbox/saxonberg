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
  CommandResult,
} from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi, ContainmentError } from '../../api/containment';
import { autoLookOnArrival } from '../../lib/spatial/Mobile';
import { DescribeApi } from '../../api/describe';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';
import type { Stuff } from '../../lib/stuff/Stuff';

interface GotoModel extends CommandModel {
  target?: MqlOneResult;
  force?: boolean;
  look?: boolean;
}

export class GotoController extends CommandController<GotoModel> {
  async execute(model: GotoModel, context: CommandContext): Promise<CommandResult> {
    const giver = context.commandGiver;
    const target = model.target;
    if (!target || target.stuff === null) {
      return this.fail(context, 'no match for target');
    }
    const env = (target.stuff as unknown as {
      getEnvironment?: () => Stuff | null;
    }).getEnvironment?.();
    if (!env) {
      return this.fail(context, 'target has no location');
    }
    const dest = env as Stuff & Container;
    const destName = DescribeApi.getDisplayName(dest, '?');

    if (!MixinApi.isContainable(giver)) {
      return this.fail(context, 'cannot move yourself');
    }

    // 1. Polished path.
    if (MixinApi.isMobile(giver)) {
      try {
        giver.teleport(dest);
        return { success: true, summary: `arrived at ${destName}` };
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
      return this.fail(context, (err as Error).message);
    }
    if (model.look) {
      void autoLookOnArrival(giver).catch(() => {});
    }
    this.tell(context, `\narrived at ${destName} (fallback)\n`);
    return { success: true, summary: `arrived at ${destName}` };
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(context: CommandContext, summary: string): CommandResult {
    this.tell(context, `\n${summary}\n`);
    return { success: false, summary };
  }
}
