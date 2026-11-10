/**
 * DrillingActController — the part every act at a derrick shares.
 *
 * ⭐ Two questions and nothing else: *which hole am I standing at* and
 * *is there a rig over it*. Whether the ground is the actor's to site a
 * hole in is the bailer's question now (`Bailer.spudPlanFor`), and
 * whether the rig has caught up with the clock is the hole's. Everything about hands, endurance, engagements and refusals is
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
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
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
  /**
   * ⭐⭐ **The derrick, read off the MODEL** — bound by the view, never
   * hunted for in the room.
   *
   * ⚠ This was a `getContents().find(c => c instanceof Derrick)` and
   * `lint:controller-resolution` refused it, correctly and with the better
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
   * ⭐ Absent is a refusal with the remedy in it — `spud` sites a hole
   * (controller-liquidity W12; it was `bore`'s other act until then).
   * The rig is reconciled by the hole's own act plans, which is what
   * makes *weeks pass while you are away* true without a global sweep.
   */
  protected wellheadOf(model: DrillingModel): Wellhead | null {
    const bound = (model.hole?.stuff ?? null) as Stuff | null;
    return bound instanceof Wellhead ? bound : null;
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
      Mml.compose`There is no hole here yet. \`spud\` sites one.`,
      'no-hole',
    );
  }
}
