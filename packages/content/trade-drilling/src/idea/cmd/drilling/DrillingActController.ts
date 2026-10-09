/**
 * DrillingActController — the part every act at a derrick shares.
 *
 * ⭐ Three questions and nothing else: *which hole am I standing at*,
 * *is the ground mine to work*, and *has the rig caught up with the
 * clock*. Everything about hands, endurance, engagements and refusals is
 * `EngagedActController`'s, which is the third-consumer promotion this
 * trade is the fourth consumer of.
 *
 * ⚠⚠ **Two scars, both inherited from the mining acts, and both are
 * about the same thing: a controller is a CORPSE by the time its
 * engagement completes.**
 *
 *  1. **Never reach `this` inside `onComplete`.** A controller is one
 *     clone per execution, destructed in a `finally` the moment
 *     `execute` returns, and an engaged act completes long after that.
 *     A completion that calls back into the controller runs on a
 *     destroyed Stuff and the proxy answers with a silent no-op — the
 *     swing lands, the prose prints, and nothing happens. Every
 *     completion in this directory is a **module function** taking
 *     values resolved at dispatch.
 *  2. **Guard `commandGiver.isDestroyed()` at completion.** A player can
 *     log out mid-swing, at which point `Mml.actor(giver)` renders
 *     `undefined` and the scene composer throws an unhandled rejection
 *     that takes the process down. It did.
 */

import { EngagedActController, ACT_TOPIC } from '@saxonberg/server/mud/lib/command/EngagedActController';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { AccessApi } from '@saxonberg/server/mud/api/access';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import Wellhead from '../../../thing/Wellhead';

export { ACT_TOPIC };

/**
 * The two things every act at a rig has bound for it.
 *
 * ⚠ Both are `MqlOneResult`, never `Stuff` — a bound arg always is, and
 * eighteen shipped verbs once declined every command because somebody
 * forgot. `.stuff` is the body.
 */
export interface DrillingModel extends CommandModel {
  rig?: MqlOneResult;
  hole?: MqlOneResult;
}

export abstract class DrillingActController<
  M extends DrillingModel = DrillingModel,
> extends EngagedActController<M> {
  /** The room the actor is standing in, or `null`. */
  protected placeOf(giver: Stuff): (Stuff & Container) | null {
    const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    return room && MixinApi.isContainer(room) ? (room as Stuff & Container) : null;
  }

  /**
   * ⭐⭐ **The derrick, read off the MODEL** — bound by the view, never
   * hunted for in the room.
   *
   * ⚠ This was a `getContents().find(c => c instanceof Derrick)` and
   * `lint:instrument-args` refused it, correctly and with the better
   * answer attached: *the query is the MIXIN, never the class — a class
   * check finds one implementation and silently refuses every other.*
   * The views declare `rig` with `default: "reachable:[capability.derrick]"`,
   * so a second kind of rig any pack ships works with no file here
   * changed, and the capability tag on the row is CONSUMED rather than
   * decorative.
   */
  protected derrickOf(model: DrillingModel): Stuff | null {
    return (model.rig?.stuff ?? null) as Stuff | null;
  }

  /**
   * The hole, read off the model — bound by `default:
   * "reachable:[mixin.GroundPointMixin]"`, which is the only thing in
   * the realm that composes it.
   *
   * ⭐ Absent is MEANINGFUL and not a failure: no hole bound means there
   * is no hole here, which is the fork `bore` takes to site one. A
   * required arg would have made siting unreachable.
   *
   * ⚠ The rig is reconciled on the way out, which is what makes *weeks
   * pass while you are away* true without a global sweep: the clock
   * catches most of it and an act catches the rest.
   */
  protected async wellheadOf(model: DrillingModel): Promise<Wellhead | null> {
    const bound = (model.hole?.stuff ?? null) as Stuff | null;
    const hole = bound instanceof Wellhead ? bound : null;
    if (hole !== null) await hole.reconcileRig();
    return hole;
  }

  /**
   * ⚠ Is this ground the actor's to sink a hole in?
   *
   * Title, through `AccessApi.can` — which resolves the parcel registry
   * by longest prefix, so an unstaked site answers `null` and is DENIED.
   * That is the whole of why `stake` comes first in the drive: a bore is
   * capital sunk into ground, and sinking it into somebody else's is the
   * one thing the claims layer exists to stop.
   *
   * ⭐ **Labour is not title-gated and this is not labour-gating** — a
   * hired hand swings on their employer's claim all day. What is gated
   * is **siting**: committing a hole to a piece of ground. The farming
   * rule, applied to the act that is actually a property act.
   */
  protected async maySite(giver: Stuff, place: Stuff & Container): Promise<boolean> {
    // ⚠ The resource is the ROOM, not its path: `can` walks the zone
    // tree to the covering title and dispatches on the OWNER's kind, so
    // a staked site resolves to the player who staked it and an unstaked
    // one resolves to the town's committee — which the player is not in,
    // so it is denied, which is the refusal `stake` exists to lift.
    return (await AccessApi.can(giver, 'bore', place)) === true;
  }

  /** The refusal for an act with no derrick to do it at. */
  protected noDerrick(context: CommandContext): void {
    this.decline(
      context,
      Mml.compose`There is no rig here. A hole wants a derrick over it — a frame, a beam and a rope.`,
      'no-derrick',
    );
  }

  /** The refusal for an act that needs a hole and has none. */
  protected noHole(context: CommandContext): void {
    this.decline(
      context,
      Mml.compose`There is no hole here yet. \`bore\` sites one.`,
      'no-hole',
    );
  }
}
