/**
 * TeleportController — relocate `<target>` to `<destination>`.
 *
 * Orchestration shape (not a single API call): always tries the
 * polished `Mobile.teleport` path first when target is Mobile;
 * falls back to raw `ContainmentApi.move` (or `forceMove` with `-f`)
 * if the polished path vetoes. Pre-check fires `canTeleport` on the
 * target itself; force still invokes the witness but skips the
 * assertion so observers see every call uniformly.
 *
 * Destination resolution: the yaml defaults `destination` to
 * `$focus`, so a bare `teleport <thing>` lands the target where the
 * player is currently focused. The resolved focus is then routed
 * through {@link _resolveDestinationContainer}:
 *
 *   - Container (room, chest, vessel interior, avatar inventory) →
 *     used as-is. Target lands inside.
 *   - Containable-only (a non-container item like a sword) → walks
 *     up to the item's environment. Target lands "next to" the
 *     focused thing.
 *   - Neither → error. The verb refuses with a clear message; the
 *     player picks an explicit `to <where>` instead.
 *
 * The Container-wins precedence handles Avatars and Vessels (both
 * Container + Containable) the way admins typically want: focus on
 * bob, teleport sword → into bob's inventory; focus on wagon,
 * teleport crate → into the wagon's interior. The override case
 * ("put it next to bob, not in him") uses the explicit
 * `to <here>` preposition.
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
import { AccessApi } from '../../api/access';
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
  async execute(model: TeleportModel, context: CommandContext): Promise<void> {
    const target = model.target;
    if (!target || target.stuff === null) {
      return this.fail(context, `no match for ${target?.raw ?? '?'}`);
    }
    const tgt = target.stuff as Stuff & Containable;
    const giver = context.commandGiver;
    const action = model.force ? 'force-teleport' : 'teleport';
    if (!(await AccessApi.can(giver, action, tgt))) {
      return this.fail(
        context,
        "you don't have permission to teleport that",
        'access-denied',
      );
    }

    // The yaml defaults destination to `$focus`. If the player has
    // never focused, `$focus` resolves to `"here"` (the current
    // location) — so model.destination.stuff is populated either
    // way. Falling back to context.location is a safety net for
    // hosts without Focused (NPCs scripted-invoking teleport, say).
    const focused =
      (model.destination?.stuff as Stuff | null | undefined) ??
      context.location;
    if (!focused) return this.fail(context, 'no destination');

    const dest = TeleportController._resolveDestinationContainer(focused);
    if (!dest) {
      return this.fail(
        context,
        `${DescribeApi.getDisplayName(focused)} is not a container ` +
          `and has no environment to land in; use \`to <somewhere>\``,
      );
    }

    // 1. Verb-level pre-check. Force still fires the witness so
    // observers / audit hooks see every teleport invocation; only
    // the assertion is skipped.
    const veto = callTeleportHook(tgt, dest);
    if (!model.force && veto && !veto.ok) {
      return this.fail(context, `canTeleport veto: ${veto.reason}`);
    }

    const targetName = DescribeApi.getDisplayName(tgt);
    const destName = DescribeApi.getDisplayName(dest);

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
        return;
      } catch (err) {
        if (!(err instanceof ContainmentError)) throw err;
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
    return;
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('system.shell.author')
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string = 'unspecified',
  ): void {
    this.tell(context, `\n${detail}\n`);
    context.note({ kind: 'controller-rejected', reason, detail });
    return;
  }

  /**
   * Apply the focus-resolution rule:
   *
   *   - Container (room, chest, vessel interior, avatar inventory) →
   *     return as-is. Container-wins precedence; Avatars and Vessels
   *     (Container + Containable) fall in here, the way admins
   *     typically want.
   *   - Containable-only (a non-container item) → walk up to its
   *     environment. The focused thing becomes a "point at" reference
   *     and the target lands in the same room.
   *   - Neither → null. Caller surfaces a clear error.
   *
   * Static so the rule is unit-testable as
   * `TeleportController._resolveDestinationContainer(...)` without
   * a free-floating module export.
   */
  static _resolveDestinationContainer(
    focused: Stuff,
  ): (Stuff & Container) | null {
    if (MixinApi.isContainer(focused)) {
      return focused;
    }
    if (MixinApi.isContainable(focused)) {
      const env = focused.getContainer();
      if (env && MixinApi.isContainer(env)) {
        return env;
      }
    }
    return null;
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
