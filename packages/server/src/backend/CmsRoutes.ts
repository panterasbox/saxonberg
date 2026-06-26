/**
 * CmsRoutes — the REST data surface for the CMS editor.
 *
 * Five routes, each 1:1 with a `CmsApi` op through the
 * {@link CmsSession} attribution bridge:
 *
 *   GET  /api/cms/tree?backend=&path=   → CmsApi.listTree
 *   GET  /api/cms/read?backend=&path=   → CmsApi.read
 *   GET  /api/cms/stat?backend=&path=   → CmsApi.stat
 *   POST /api/cms/write                 → CmsApi.write   (CSRF-protected)
 *   GET  /api/cms/csrf                  → mint a double-submit token
 *
 * **No authz lives here.** The route validates payload shape, calls the
 * bridge (which resolves the session Avatar + plants the Root frame),
 * and maps the typed errors `CmsApi` throws onto HTTP status codes. All
 * gating is `CmsLogic`'s, mirrored verbatim from `WriteController` — the
 * REST layer adds no new authz surface.
 *
 * Every route is `requireAuth` this build (anon read-only is deferred —
 * see docs/subsystems/cms.md). Writes additionally require a CSRF
 * double-submit token: the client fetches `/api/cms/csrf` once, then
 * sends the token back in the `X-CMS-CSRF` header on every write, where
 * it is compared against `req.session.cmsCsrf`.
 */

import type { Express, Request, Response } from 'express';
import type { CmsBackend, CmsWriteRequest } from '@saxonberg/types';
import { CmsApi, CmsError } from '../mud/api/cms';
import { SourceTreeSandboxError } from '../mud/api/source-tree';
import { SecurityApi } from '../mud/api/security';
import { AuthMiddleware } from '../services/auth/AuthMiddleware';
import { CmsSession } from './CmsSession';

// Augment express-session so `req.session.cmsCsrf` is a typed slot
// rather than a cast. Co-located with its only consumer.
declare module 'express-session' {
  interface SessionData {
    /** The CMS write CSRF double-submit token (minted at /api/cms/csrf). */
    cmsCsrf?: string;
  }
}

/**
 * Map a thrown error onto an HTTP status + uniform `CmsErrorBody`.
 *   - `CmsError`              → 403 (denied) / 404 (not-found) / 400 (invalid)
 *   - `SourceTreeSandboxError` → 400 (sandbox escape)
 *   - anything else            → 500 (internal)
 */
function sendCmsError(res: Response, e: unknown): void {
  if (e instanceof CmsError) {
    const status =
      e.code === 'denied' ? 403 : e.code === 'not-found' ? 404 : 400;
    res.status(status).json({ error: e.code, message: e.message });
    return;
  }
  if (e instanceof SourceTreeSandboxError) {
    res.status(400).json({ error: 'sandbox', message: e.message });
    return;
  }
  console.error('CmsRoutes: unexpected error:', e);
  res
    .status(500)
    .json({ error: 'internal', message: 'internal server error' });
}

/** Narrow a raw query value to a valid backend, or null. */
function parseBackend(value: unknown): CmsBackend | null {
  return value === 'content' || value === 'source' ? value : null;
}

export class CmsRoutes {
  /**
   * Mount the CMS REST routes on the Express app. Call from
   * `Server.setupRoutes()` after session/passport middleware is live and
   * before the SPA catch-all, so these match first.
   */
  public static setup(app: Express): void {
    const requireAuth = AuthMiddleware.requireAuthApi;

    // ---- CSRF token mint ------------------------------------------
    app.get('/api/cms/csrf', requireAuth, (req: Request, res: Response) => {
      const token = SecurityApi.uuid();
      req.session.cmsCsrf = token;
      res.json({ token });
    });

    // ---- reads ----------------------------------------------------
    app.get('/api/cms/tree', requireAuth, async (req, res) => {
      const backend = parseBackend(req.query.backend);
      if (!backend) {
        res.status(400).json({ error: 'invalid', message: 'bad backend' });
        return;
      }
      const path = String(req.query.path ?? '/');
      try {
        const out = await CmsSession.runAsSessionPlayer(req, 'cms.listTree', () =>
          CmsApi.listTree(backend, path)
        );
        res.json(out);
      } catch (e) {
        sendCmsError(res, e);
      }
    });

    app.get('/api/cms/read', requireAuth, async (req, res) => {
      const backend = parseBackend(req.query.backend);
      if (!backend) {
        res.status(400).json({ error: 'invalid', message: 'bad backend' });
        return;
      }
      const path = String(req.query.path ?? '/');
      try {
        const out = await CmsSession.runAsSessionPlayer(req, 'cms.read', () =>
          CmsApi.read(backend, path)
        );
        res.json(out);
      } catch (e) {
        sendCmsError(res, e);
      }
    });

    app.get('/api/cms/stat', requireAuth, async (req, res) => {
      const backend = parseBackend(req.query.backend);
      if (!backend) {
        res.status(400).json({ error: 'invalid', message: 'bad backend' });
        return;
      }
      const path = String(req.query.path ?? '/');
      try {
        const out = await CmsSession.runAsSessionPlayer(req, 'cms.stat', () =>
          CmsApi.stat(backend, path)
        );
        res.json(out);
      } catch (e) {
        sendCmsError(res, e);
      }
    });

    // ---- write (CSRF-protected) -----------------------------------
    app.post('/api/cms/write', requireAuth, async (req, res) => {
      // CSRF double-submit: header must match the session token.
      const header = req.get('X-CMS-CSRF');
      const expected = req.session.cmsCsrf;
      if (!expected || !header || header !== expected) {
        res.status(403).json({ error: 'denied', message: 'csrf' });
        return;
      }

      const body = req.body as Partial<CmsWriteRequest> | undefined;
      const backend = parseBackend(body?.backend);
      if (!backend || typeof body?.path !== 'string') {
        res.status(400).json({ error: 'invalid', message: 'bad write request' });
        return;
      }
      const { path } = body;
      const content = typeof body.body === 'string' ? body.body : '';
      try {
        const out = await CmsSession.runAsSessionPlayer(req, 'cms.write', () =>
          CmsApi.write(backend, path, content)
        );
        res.json(out);
      } catch (e) {
        sendCmsError(res, e);
      }
    });

    console.info('CmsRoutes: Routes configured');
  }
}
