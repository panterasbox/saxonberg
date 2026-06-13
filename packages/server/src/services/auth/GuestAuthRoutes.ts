/**
 * GuestAuthRoutes — anonymous "play as guest" entry.
 *
 * Mounts `POST /auth/guest`, which establishes an *anonymous* Passport
 * session — a session with no persisted account behind it. It reaches
 * the same session state as the real OAuth and test-login paths
 * (`session.passport.user = { id }`, set via `req.login`), so the
 * WebSocket upgrade's `session.passport.user.id` check works unchanged;
 * the principal id simply carries the `anon:` prefix
 * (`User.ANONYMOUS_PREFIX`) so the connect path recognizes it and builds
 * an ephemeral User instead of a Mongo lookup.
 *
 * Two axes, deliberately separate: this route is the *authentication*
 * side (anonymous vs authed). The *character* being a guest
 * (`Avatar.isGuest`, throwaway/never-persisted) is decided later in
 * `Login.enter` when an anonymous session mints its avatar. Today the
 * policy maps anonymous → guest; that mapping lives in `Login`, not here.
 *
 * Unlike the test-login bypass, this is a PRODUCTION path (mounted
 * unconditionally). The single admission decision is `mayMintGuest` —
 * the one gate to flip if anonymous guests are abused (e.g. require an
 * authed session, or hang rate-limiting / per-IP / captcha off it).
 */

import type { Express, Request, Response } from "express";
import { nanoid } from "nanoid";
import { User } from "../../mud/lib/identity/User";

export class GuestAuthRoutes {
  /**
   * The single mint-a-guest policy gate. Today: admit anonymously.
   * Flip this (or add rate-limit / per-IP / captcha checks) to demote
   * guest play to post-sign-in without touching anything else.
   */
  public static mayMintGuest(_req: Request): boolean {
    return true;
  }

  public static setup(app: Express): void {
    app.post("/auth/guest", (req: Request, res: Response) => {
      if (!GuestAuthRoutes.mayMintGuest(req)) {
        res.status(403).json({ error: "guest play unavailable" });
        return;
      }
      const principal = { id: `${User.ANONYMOUS_PREFIX}${nanoid()}` };
      req.login(principal as Express.User, (err) => {
        if (err) {
          console.error("GuestAuthRoutes: req.login failed:", err);
          res.status(500).json({ error: "session establishment failed" });
          return;
        }
        res.json({ isAuthenticated: true, isGuest: true });
      });
    });
  }
}
