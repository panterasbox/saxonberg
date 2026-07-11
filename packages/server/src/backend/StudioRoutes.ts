/**
 * StudioRoutes — the REST data surface for the CMS Studio (composition).
 *
 * Mirrors {@link CmsRoutes}: each route is 1:1 with a `StudioApi` op through
 * the {@link CmsSession} attribution bridge (which resolves the session
 * Avatar, plants the Root frame, and stamps the acting author). P1 exposes
 * one read:
 *
 *   GET /api/studio/describe?class=&context=   → StudioApi.describeClass
 *
 * **No authz lives here.** The route validates payload shape, calls the
 * bridge, and maps the typed errors `StudioApi` throws onto HTTP status
 * codes. All gating is `StudioLogic`'s (author-tier, from the
 * context-derived actor — the CMS anti-spoof property). Every route is
 * `requireAuth` this build (anon read-only deferred).
 */

import type { Express, Response } from 'express';
import { StudioApi, StudioError } from '../mud/api/studio';
import { AuthMiddleware } from '../services/auth/AuthMiddleware';
import { CmsSession } from './CmsSession';

/**
 * Map a thrown error onto an HTTP status + uniform `StudioErrorBody`.
 *   - `StudioError` → 403 (denied) / 404 (not-found) / 400 (invalid)
 *   - anything else → 500 (internal)
 */
function sendStudioError(res: Response, e: unknown): void {
  if (e instanceof StudioError) {
    const status =
      e.code === 'denied' ? 403 : e.code === 'not-found' ? 404 : 400;
    res.status(status).json({ code: e.code, message: e.message });
    return;
  }
  console.error('StudioRoutes: unexpected error:', e);
  res.status(500).json({ code: 'internal', message: 'internal server error' });
}

export class StudioRoutes {
  /**
   * Mount the Studio REST routes on the Express app. Call from
   * `Server.setupRoutes()` next to `CmsRoutes.setup(app)` — after
   * session/passport middleware is live and before the SPA catch-all.
   */
  public static setup(app: Express): void {
    const requireAuth = AuthMiddleware.requireAuthApi;

    app.get('/api/studio/describe', requireAuth, async (req, res) => {
      const classPath = typeof req.query.class === 'string' ? req.query.class : '';
      if (!classPath) {
        res.status(400).json({ code: 'invalid', message: 'missing class' });
        return;
      }
      const context =
        typeof req.query.context === 'string' ? req.query.context : undefined;
      try {
        const out = await CmsSession.runAsSessionPlayer(
          req,
          'studio.describeClass',
          () => StudioApi.describeClass(classPath, context)
        );
        res.json(out);
      } catch (e) {
        sendStudioError(res, e);
      }
    });

    console.info('StudioRoutes: Routes configured');
  }
}
