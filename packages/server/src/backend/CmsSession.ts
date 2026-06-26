/**
 * CmsSession — the run-as-session-player attribution bridge for the
 * REST CMS surface.
 *
 * Lives in `backend/` because only `backend/**` may push call frames
 * (the `_frameMutatorAllowlist`), exactly like `Backend`'s WS entry
 * points. It is transport plumbing, not an Api class — but to stay
 * inside export discipline it is modeled as a class with one static
 * method (no free-floating export), mirroring how `Backend` /
 * `Application` expose behavior.
 *
 * The bridge does two things, both mandatory for the REST handlers:
 *
 *   1. Resolve THE acting Avatar for the session (the session carries a
 *      *userId*; a `User` owns `playerIds[]`; the in-world Avatar is the
 *      already-loaded clone at `/obj/Avatar/<playerId>`). This Avatar is
 *      threaded as the `subject` into `AccessApi`, so the same gating
 *      that guards the in-world `write` verb guards REST writes — no
 *      parallel authz. When no in-world Avatar is loaded for the session
 *      (a CMS tab with no game tab in-world), the actor is `null` and
 *      writes fail closed (`AccessApi` denies a null subject) — the
 *      correct behavior: you must be in-world to author.
 *
 *   2. Run the op inside `ExecutionContextApi.runRoot` so every
 *      downstream `@CallSecurity` gate resolves against a well-defined
 *      Root frame, and any event fired during the op (e.g. during
 *      `restoreFromTemplate`) carries provenance — the same mechanism
 *      `Backend.processUserMessage` relies on for WS and `ScheduleApi`
 *      relies on for deferred work.
 */

import type { Request } from 'express';
import { ExecutionContextApi } from '../mud/api/execution-context';
import { PlayerApi } from '../mud/api/player';
import { User } from '../mud/lib/identity/User';
import type Avatar from '../mud/obj/Avatar';
import { Backend } from './Backend';

export class CmsSession {
  private constructor() {}

  /**
   * Resolve the session's acting Avatar and run `fn(actor)` inside a
   * `runRoot` frame. Returns whatever `fn` returns.
   *
   * @param req - the Express request (carries the authenticated session)
   * @param method - a label for the synthetic Root frame (e.g. `cms.write`)
   * @param fn - the work, handed the resolved Avatar (or `null`)
   */
  public static async runAsSessionPlayer<T>(
    req: Request,
    method: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const actor = await CmsSession.resolveSessionAvatar(req);
    return ExecutionContextApi.runRoot(Backend, method, () => {
      // Stamp the acting Avatar onto frame metadata (NOT the frame target,
      // which stays `Backend`, so downstream @CallSecurity gates are
      // unchanged). The CMS API takes NO `actor` argument — it resolves the
      // acting principal from this stamp via `getActingAuthor`, for BOTH
      // access gating AND provenance attribution. That's the anti-spoof
      // guarantee: a caller can't substitute a privileged Avatar; the only
      // channel is this backend-only stamp. A REST boundary plants a
      // caller=null root with no command-giver, so it must stamp
      // explicitly. Null actor (no in-world avatar) → no tag → every gate
      // fails closed. Gated to backend/ + framework callers; CmsSession
      // qualifies.
      if (actor) ExecutionContextApi.tagActingAuthor(actor);
      return fn();
    });
  }

  /**
   * Map the session principal's userId to the session's loaded
   * developer Avatar.
   *
   * v1 resolution (multiplexing aside): a session has at most one
   * in-world Avatar loaded. Load the `User`, then pick the first of its
   * `playerIds` that has a *registered* (already in-world) Avatar — the
   * clone the game tab's session loaded. Returns `null` when the session
   * is unauthenticated, the user is gone, or no Avatar is currently
   * loaded for any of the user's slots.
   */
  private static async resolveSessionAvatar(
    req: Request
  ): Promise<Avatar | null> {
    const userId =
      (req.session as { passport?: { user?: { id?: string } } }).passport?.user
        ?.id ?? null;
    if (!userId) return null;

    // Anonymous (guest) principals have no persisted account and no
    // developer slot — they can never author. Resolve to null.
    if (userId.startsWith(User.ANONYMOUS_PREFIX)) return null;

    const user = await User.findById(userId);
    if (!user) return null;

    for (const playerId of user.playerIds) {
      const avatar = PlayerApi.findAvatarByPlayerId(playerId);
      if (avatar) return avatar;
    }
    return null;
  }
}
