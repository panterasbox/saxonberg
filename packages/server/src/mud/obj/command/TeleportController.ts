/**
 * TeleportController — relocate `<target>` to `<destination>`.
 *
 * Orchestration shape (not a single API call): always tries the
 * polished `Mobile.teleport` path first when target is Mobile;
 * falls back to raw `ContainmentApi.move` (or `forceMove` with `-f`)
 * if the polished path vetoes. Pre-check fires `canTeleport` on the
 * target itself; force still invokes the witness but skips the
 * assertion so observers see every call uniformly.
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
import { DescribeApi } from '../../api/describe';
import type { Container } from '../../lib/spatial/Container';
import type { Containable } from '../../lib/spatial/Containable';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { VetoResult } from '../../lib/errors';

interface TeleportModel extends CommandModel {
  target?: MqlOneResult;
  destination?: MqlOneResult;
  force?: boolean;
}

export class TeleportController extends CommandController<TeleportModel> {
  execute(model: TeleportModel, context: CommandContext): CommandResult {
    const target = model.target;
    if (!target || target.stuff === null) {
      return this.fail(context, `no match for target`);
    }
    const tgt = target.stuff as Stuff & Containable;
    const dest = (model.destination?.stuff ??
      context.location) as Stuff & Container;
    if (!dest) return this.fail(context, 'no destination');

    // 1. Verb-level pre-check. Force still fires the witness so
    // observers / audit hooks see every teleport invocation; only
    // the assertion is skipped.
    const veto = callTeleportHook(tgt, dest);
    if (!model.force && veto && !veto.ok) {
      return this.fail(context, `canTeleport veto: ${veto.reason}`);
    }

    const targetName = DescribeApi.getDisplayName(tgt, '?');
    const destName = DescribeApi.getDisplayName(dest, '?');

    // 2. Polished path: Mobile.teleport handles announcements +
    // auto-look. Try this first regardless of force; force only
    // changes the fallback flavor.
    if (MixinApi.isMobile(tgt)) {
      try {
        tgt.teleport(dest);
        this.tell(
          context,
          `\nteleported ${targetName} to ${destName}\n`,
        );
        return { success: true, summary: `${targetName} → ${destName}` };
      } catch (err) {
        if (!isVetoError(err)) throw err;
        // Mobile-level veto: fall through to the move-op fallback.
      }
    }

    // 3. Fallback: raw containment move (or forceMove with -f).
    try {
      const op = model.force
        ? ContainmentApi.forceMove
        : ContainmentApi.move;
      op(tgt, dest);
    } catch (err) {
      return this.fail(context, (err as Error).message);
    }
    this.tell(
      context,
      `\nrelocated ${targetName} to ${destName} (fallback path)\n`,
    );
    return { success: true, summary: `${targetName} → ${destName}` };
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(MessageApi.Topics.system.shell.author)
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(context: CommandContext, summary: string): CommandResult {
    this.tell(context, `\n${summary}\n`);
    return { success: false, summary };
  }
}

/** Optional witness — fire if present, return undefined otherwise. */
function callTeleportHook(
  target: Stuff,
  destination: Stuff,
): VetoResult | undefined {
  const fn = (target as unknown as Record<string, unknown>)['canTeleport'];
  if (typeof fn !== 'function') return undefined;
  return (fn as (d: Stuff) => VetoResult).call(target, destination);
}

function isVetoError(err: unknown): boolean {
  return err instanceof ContainmentError;
}
