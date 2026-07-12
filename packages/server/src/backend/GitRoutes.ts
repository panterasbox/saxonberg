/**
 * GitRoutes — the REST data surface for the CMS git panel.
 *
 * A sibling of {@link CmsRoutes} (the git ops don't fit CmsRoutes's
 * `backend/path/body` shape), but the same contract: each route is 1:1
 * with a `GitApi` op through the {@link CmsSession} attribution bridge
 * (which resolves the session Avatar, plants the Root frame, and stamps
 * the acting author). The routes:
 *
 *   GET  /api/git/status          → GitApi.status
 *   GET  /api/git/diff?path=      → GitApi.diff
 *   GET  /api/git/log?limit=      → GitApi.log
 *   GET  /api/git/csrf            → mint a double-submit token
 *   POST /api/git/publish         → GitApi.publish  (CSRF-protected)
 *   POST /api/git/revert          → GitApi.revert   (CSRF-protected)
 *
 * **No authz lives here.** The route validates payload shape, calls the
 * bridge, and maps the typed `GitError` codes onto HTTP status. All gating
 * is `GitLogic`'s (wizard-tier + the per-path source-write gate, from the
 * context-derived actor). A `null` (unattributable) actor fails every gate
 * closed. Every route is `requireAuth`; writes reuse the CMS double-submit
 * CSRF token (shared session — the client fetches `/api/git/csrf` and
 * sends it in `X-CMS-CSRF`, compared against `req.session.cmsCsrf`).
 */

import type { Express, Request, Response } from 'express';
import { GitApi, GitError } from '../mud/api/git';
import { SecurityApi } from '../mud/api/security';
import { AuthMiddleware } from '../services/auth/AuthMiddleware';
import { CmsSession } from './CmsSession';

/**
 * Map a thrown error onto an HTTP status + uniform `GitErrorBody`.
 *   - `GitError` → 403 (denied) / 404 (not-a-repo) / 409
 *     (conflict, push-rejected) / 400 (bad-ref, nothing-to-do)
 *   - anything else → 500 (internal)
 */
function sendGitError(res: Response, e: unknown): void {
  if (e instanceof GitError) {
    const status =
      e.code === 'denied'
        ? 403
        : e.code === 'not-a-repo'
          ? 404
          : e.code === 'conflict' || e.code === 'push-rejected'
            ? 409
            : 400;
    res.status(status).json({ error: e.code, message: e.message });
    return;
  }
  console.error('GitRoutes: unexpected error:', e);
  res.status(500).json({ error: 'internal', message: 'internal server error' });
}

/**
 * CMS double-submit CSRF check for a git POST: the `X-CMS-CSRF` header
 * must equal the (shared CMS) session token. On mismatch, sends a 403 and
 * returns false; the caller returns early.
 */
function csrfOk(req: Request, res: Response): boolean {
  const header = req.get('X-CMS-CSRF');
  const expected = req.session.cmsCsrf;
  if (!expected || !header || header !== expected) {
    res.status(403).json({ error: 'denied', message: 'csrf' });
    return false;
  }
  return true;
}

export class GitRoutes {
  /**
   * Mount the git REST routes on the Express app. Call from
   * `Server.setupRoutes()` next to `CmsRoutes.setup(app)` — after
   * session/passport middleware is live and before the SPA catch-all.
   */
  public static setup(app: Express): void {
    const requireAuth = AuthMiddleware.requireAuthApi;

    // ---- CSRF token mint (reuses the CMS slot) --------------------
    app.get('/api/git/csrf', requireAuth, (req: Request, res: Response) => {
      const token = SecurityApi.uuid();
      req.session.cmsCsrf = token;
      res.json({ token });
    });

    // ---- reads ----------------------------------------------------
    app.get('/api/git/status', requireAuth, async (req, res) => {
      try {
        const out = await CmsSession.runAsSessionPlayer(req, 'git.status', () =>
          GitApi.status()
        );
        res.json(out);
      } catch (e) {
        sendGitError(res, e);
      }
    });

    app.get('/api/git/diff', requireAuth, async (req, res) => {
      const pathArg =
        typeof req.query.path === 'string' && req.query.path.length > 0
          ? req.query.path
          : undefined;
      try {
        const out = await CmsSession.runAsSessionPlayer(req, 'git.diff', () =>
          GitApi.diff(pathArg)
        );
        res.json(out);
      } catch (e) {
        sendGitError(res, e);
      }
    });

    app.get('/api/git/log', requireAuth, async (req, res) => {
      const limit =
        typeof req.query.limit === 'string' && req.query.limit.length > 0
          ? Number(req.query.limit)
          : undefined;
      const pathArg =
        typeof req.query.path === 'string' && req.query.path.length > 0
          ? req.query.path
          : undefined;
      try {
        const out = await CmsSession.runAsSessionPlayer(req, 'git.log', () =>
          GitApi.log({
            ...(limit != null && !Number.isNaN(limit) ? { limit } : {}),
            ...(pathArg ? { pathArg } : {}),
          })
        );
        res.json(out);
      } catch (e) {
        sendGitError(res, e);
      }
    });

    // ---- publish (CSRF-protected) ---------------------------------
    app.post('/api/git/publish', requireAuth, async (req, res) => {
      if (!csrfOk(req, res)) return;
      const body = req.body as { message?: unknown } | undefined;
      if (typeof body?.message !== 'string' || body.message.trim().length === 0) {
        res
          .status(400)
          .json({ error: 'invalid', message: 'a commit message is required' });
        return;
      }
      const message = body.message;
      try {
        const out = await CmsSession.runAsSessionPlayer(req, 'git.publish', () =>
          GitApi.publish(message)
        );
        res.json(out);
      } catch (e) {
        sendGitError(res, e);
      }
    });

    // ---- revert (CSRF-protected) ----------------------------------
    app.post('/api/git/revert', requireAuth, async (req, res) => {
      if (!csrfOk(req, res)) return;
      const body = req.body as { sha?: unknown } | undefined;
      if (typeof body?.sha !== 'string' || body.sha.trim().length === 0) {
        res.status(400).json({ error: 'invalid', message: 'a commit sha is required' });
        return;
      }
      const sha = body.sha;
      try {
        const out = await CmsSession.runAsSessionPlayer(req, 'git.revert', () =>
          GitApi.revert(sha)
        );
        res.json(out);
      } catch (e) {
        sendGitError(res, e);
      }
    });

    console.info('GitRoutes: Routes configured');
  }
}
