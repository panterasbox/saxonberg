/**
 * GotoController — authorial relocation. `goto <target>` moves the
 * avatar to where `<target>` is; `--subject <obj>` moves that object
 * there instead.
 *
 * ⭐ **Why `--subject` lives here** (TPA reform P13). Object relocation
 * used to be `teleport --target`, which made one verb mean two
 * unrelated things depending on who typed it — and, worse, put
 * authorial tooling inside a verb the `tpa` capability pack now owns.
 * Authorial tooling must not evaporate when a content pack is absent,
 * so the relocation body moved to `goto`, which was already in the
 * author category and already did this focus walk. `teleport` is now
 * purely diegetic: a ride, or a spell.
 *
 * Orchestration shape: try `Mobile.teleport` first (the polished
 * path with announcements + auto-look); on Mobile-level veto, fall
 * back to `ContainmentApi.move` (or `forceMove` with `-f`). The
 * `-l` flag re-fires `autoSenseOnArrival` on the raw-move fallback
 * path so the avatar still sees where they landed when the polished
 * path was bypassed.
 *
 * No pathfinding — the slate's stated non-goal. `goto X` plants the
 * avatar in `X`'s location directly.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';
import { ContainmentApi, ContainmentError } from '../../../../api/containment';
import { AccessApi } from '../../../../api/access';
import type { Container } from '../../../../lib/spatial/Container';
import type { Containable } from '../../../../lib/spatial/Containable';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { VetoResult } from '../../../../lib/errors';

interface GotoModel extends CommandModel {
  target?: MqlOneResult;
  subject?: MqlOneResult;
  force?: boolean;
  look?: boolean;
}

export default class GotoController extends CommandController<GotoModel> {
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
    const dest = GotoController._resolveDestinationContainer(target.stuff);
    if (!dest) {
      return this.fail(context, 'no-location', 'target has no location');
    }

    // `--subject` relocates something else; without it the actor moves.
    const subject: Stuff = model.subject?.stuff ?? giver;
    if (subject !== giver) return this.relocate(model, context, subject, dest);

    const destName = dest.getPresentation();

    if (!MixinApi.isContainable(giver)) {
      return this.fail(context, 'cannot-move', 'cannot move yourself');
    }

    const action = model.force ? 'force-goto' : 'goto';
    if (!(await AccessApi.can(giver, action, dest))) {
      return this.fail(
        context,
        'access-denied',
        "you don't have permission to go there",
      );
    }

    // D14 — the wizard path refuses too. An honest wizard path IS the
    // point of the fix: the raw fallback below would move the rider and
    // leave the horse exactly as the defect did, and `--force` is not an
    // exemption from physics the author can see. Unhitch or dismount.
    if (MixinApi.isMobile(giver)) {
      const blocked = giver.teleportBlockedBy();
      if (blocked) {
        return this.fail(
          context,
          'attached',
          `attached to ${blocked} — unhitch or dismount first`,
        );
      }
    }

    // 1. Polished path.
    if (MixinApi.isMobile(giver)) {
      try {
        giver.teleport(dest);
        return;
      } catch (err) {
        if (this.isSandboxBoundaryDenial(err)) {
          return this.failWireDestination(context);
        }
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
      if (this.isSandboxBoundaryDenial(err)) {
        return this.failWireDestination(context);
      }
      return this.fail(context, 'move-failed', (err as Error).message);
    }
    if (model.look && MixinApi.isMobile(giver)) {
      // Fire-and-forget; same swallow rationale as in `Mobile.teleport`
      // — an auto-sense failure shouldn't cancel an already-completed move.
      void giver.autoSenseOnArrival().catch(() => {});
    }
    this.tell(context, `\narrived at ${destName} (fallback)\n`);
    return;
  }

  /**
   * Move something OTHER than the actor — the authorial relocation that
   * used to be `teleport --target`. Access-gated on the subject (not the
   * destination): moving a thing is an authority over the thing.
   */
  private async relocate(
    model: GotoModel,
    context: CommandContext,
    subject: Stuff,
    dest: Stuff & Container,
  ): Promise<void> {
    const giver = context.commandGiver;
    if (!MixinApi.isContainable(subject)) {
      return this.fail(context, 'not-containable', "that can't be relocated");
    }
    const action = model.force ? 'force-teleport' : 'teleport';
    if (!(await AccessApi.can(giver, action, subject))) {
      return this.fail(
        context,
        'access-denied',
        "you don't have permission to relocate that",
      );
    }

    const veto = callTeleportHook(subject, dest);
    if (!model.force && veto && !veto.ok) {
      return this.fail(context, 'vetoed', `canTeleport veto: ${veto.reason}`);
    }

    if (MixinApi.isMobile(subject)) {
      const blocked = subject.teleportBlockedBy();
      if (blocked) {
        return this.fail(
          context,
          'attached',
          `${subject.getPresentation()} is attached to ${blocked} — ` +
            `unhitch or dismount it first`,
        );
      }
    }

    const subjectName = subject.getPresentation();
    const destName = dest.getPresentation();

    if (MixinApi.isMobile(subject)) {
      try {
        subject.teleport(dest);
        this.tell(context, `\nrelocated ${subjectName} to ${destName}\n`);
        return;
      } catch (err) {
        if (this.isSandboxBoundaryDenial(err)) {
          return this.failWireDestination(context);
        }
        if (!(err instanceof ContainmentError)) throw err;
        // Mobile-level veto: fall through to the raw move.
      }
    }

    try {
      const op = model.force ? ContainmentApi.forceMove : ContainmentApi.move;
      op(subject, dest);
    } catch (err) {
      if (this.isSandboxBoundaryDenial(err)) {
        return this.failWireDestination(context);
      }
      return this.fail(context, 'move-failed', (err as Error).message);
    }
    this.tell(context, `\nrelocated ${subjectName} to ${destName}\n`);
  }

  /**
   * Decision L2 (sandbox): direct placement into a circle is denied by
   * the boundary itself — the move dispatches on the circle-scoped
   * destination from a field command context, and Layer 4 refuses. No
   * bespoke guard exists; only this prose is ours: catch the denial and
   * point at the door instead of surfacing a raw SecurityError.
   */
  private isSandboxBoundaryDenial(err: unknown): boolean {
    return (
      err instanceof Error && err.message.startsWith('sandbox boundary denied')
    );
  }

  private failWireDestination(context: CommandContext): void {
    return this.fail(
      context,
      'move-failed',
      'that place is on the wire — no real body can be placed inside a ' +
        'circle. Enter through its wardrobe.'
    );
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
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

  /**
   * Focus-resolution rule: Container → as-is; Containable-only → its
   * environment; neither → null. Static so it stays unit-testable
   * without a free-floating export.
   *
   * ⓘ `goto <a room>` therefore lands you IN the room rather than in
   * whatever contains it — which is what "move to that target's
   * location" means when the target IS a location. Non-Container
   * targets resolve exactly as before.
   */
  static _resolveDestinationContainer(
    focused: Stuff,
  ): (Stuff & Container) | null {
    // ⚠ **You go TO a fixture, never INTO it.** Found by driving: a TPA
    // terminal became a `Container` when it grew a battery bay (a part
    // inside a machine has to physically be somewhere), and `goto
    // terminal` promptly put the author *inside the brass pillar* —
    // where `put cell in terminal` then could not see it, because the
    // terminal was the actor's container rather than a peer.
    //
    // `isFixedInPlace` is the right discriminator and is already the
    // one `get` leans on for exactly this class of object (the wall TV,
    // the terminal's pillar): a thing bolted down is scenery you
    // approach. A room stays a room, and a wardrobe you can carry off
    // is still somewhere you can climb into.
    const bolted =
      MixinApi.isContainable(focused) && focused.isFixedInPlace();
    if (MixinApi.isContainer(focused) && !bolted) return focused;
    if (MixinApi.isContainable(focused)) {
      const env = focused.getContainer();
      if (env && MixinApi.isContainer(env)) return env;
    }
    return MixinApi.isContainer(focused) ? focused : null;
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
