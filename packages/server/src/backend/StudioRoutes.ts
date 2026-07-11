/**
 * StudioRoutes — the REST data surface for the CMS Studio (composition).
 *
 * Mirrors {@link CmsRoutes}: each route is 1:1 with a `StudioApi` op through
 * the {@link CmsSession} attribution bridge (which resolves the session
 * Avatar, plants the Root frame, and stamps the acting author). P1 exposes
 * these routes:
 *
 *   GET  /api/studio/describe?class=&context=  → StudioApi.describeClass
 *   GET  /api/studio/blueprints                → StudioApi.listBlueprints
 *   GET  /api/studio/blueprint?id=             → StudioApi.getBlueprint
 *   POST /api/studio/blueprint                 → StudioApi.publishBlueprint
 *                                                (CSRF-protected)
 *
 * The blueprint POST reuses the CMS double-submit CSRF token (shared
 * session): the client fetches `/api/cms/csrf` once and sends it in the
 * `X-CMS-CSRF` header, compared against `req.session.cmsCsrf`.
 *
 * **No authz lives here.** The route validates payload shape, calls the
 * bridge, and maps the typed errors `StudioApi` throws onto HTTP status
 * codes. All gating is `StudioLogic`'s (author-tier, from the
 * context-derived actor — the CMS anti-spoof property). Every route is
 * `requireAuth` this build (anon read-only deferred).
 */

import type { Express, Request, Response } from 'express';
import { StudioApi, StudioError } from '../mud/api/studio';
import type {
  CommitClassInput,
  CreateTemplateInput,
  PublishBlueprintInput,
  ScaffoldClassInput,
} from '../mud/api/studio';
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

/**
 * CMS double-submit CSRF check for a Studio POST: the `X-CMS-CSRF` header
 * must equal the (shared CMS) session token. On mismatch, sends a 403 and
 * returns false; the caller returns early.
 */
function csrfOk(req: Request, res: Response): boolean {
  const header = req.get('X-CMS-CSRF');
  const expected = req.session.cmsCsrf;
  if (!expected || !header || header !== expected) {
    res.status(403).json({ code: 'denied', message: 'csrf' });
    return false;
  }
  return true;
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

    // ---- mixin inspector (read) -----------------------------------
    app.get('/api/studio/mixin', requireAuth, async (req, res) => {
      const name = typeof req.query.name === 'string' ? req.query.name : '';
      if (!name) {
        res.status(400).json({ code: 'invalid', message: 'missing name' });
        return;
      }
      try {
        const out = await CmsSession.runAsSessionPlayer(
          req,
          'studio.describeMixin',
          () => StudioApi.describeMixin(name)
        );
        res.json(out);
      } catch (e) {
        sendStudioError(res, e);
      }
    });

    // ---- blueprint catalogue reads --------------------------------
    app.get('/api/studio/blueprints', requireAuth, async (req, res) => {
      try {
        const out = await CmsSession.runAsSessionPlayer(
          req,
          'studio.listBlueprints',
          () => StudioApi.listBlueprints()
        );
        res.json(out);
      } catch (e) {
        sendStudioError(res, e);
      }
    });

    app.get('/api/studio/blueprint', requireAuth, async (req, res) => {
      const id = typeof req.query.id === 'string' ? req.query.id : '';
      if (!id) {
        res.status(400).json({ code: 'invalid', message: 'missing id' });
        return;
      }
      try {
        const out = await CmsSession.runAsSessionPlayer(
          req,
          'studio.getBlueprint',
          () => StudioApi.getBlueprint(id)
        );
        res.json(out);
      } catch (e) {
        sendStudioError(res, e);
      }
    });

    // ---- blueprint publish (CSRF-protected) -----------------------
    app.post('/api/studio/blueprint', requireAuth, async (req, res) => {
      if (!csrfOk(req, res)) return;
      const body = req.body as Partial<PublishBlueprintInput> | undefined;
      if (
        !body ||
        typeof body.name !== 'string' ||
        typeof body.baseClass !== 'string'
      ) {
        res
          .status(400)
          .json({ code: 'invalid', message: 'name and baseClass required' });
        return;
      }
      const input: PublishBlueprintInput = {
        name: body.name,
        baseClass: body.baseClass,
        kind: body.kind === 'concrete' ? 'concrete' : 'composition',
        mixinNames: Array.isArray(body.mixinNames)
          ? body.mixinNames.filter((m): m is string => typeof m === 'string')
          : [],
        ...(typeof body.classPath === 'string'
          ? { classPath: body.classPath }
          : {}),
        ...(typeof body.parent === 'string' ? { parent: body.parent } : {}),
        ...(typeof body.blessed === 'boolean'
          ? { blessed: body.blessed }
          : {}),
        ...(typeof body.description === 'string'
          ? { description: body.description }
          : {}),
      };
      try {
        const out = await CmsSession.runAsSessionPlayer(
          req,
          'studio.publishBlueprint',
          () => StudioApi.publishBlueprint(input)
        );
        res.json(out);
      } catch (e) {
        sendStudioError(res, e);
      }
    });

    // ---- composition palette (read) -------------------------------
    app.get('/api/studio/mixins', requireAuth, async (req, res) => {
      try {
        const out = await CmsSession.runAsSessionPlayer(
          req,
          'studio.listMixins',
          () => StudioApi.listMixins()
        );
        res.json(out);
      } catch (e) {
        sendStudioError(res, e);
      }
    });

    // ---- scaffold a new backing class (CSRF-protected) ------------
    app.post('/api/studio/scaffold', requireAuth, async (req, res) => {
      if (!csrfOk(req, res)) return;
      const body = req.body as Partial<ScaffoldClassInput> | undefined;
      if (
        !body ||
        typeof body.name !== 'string' ||
        typeof body.baseClass !== 'string'
      ) {
        res
          .status(400)
          .json({ code: 'invalid', message: 'name and baseClass required' });
        return;
      }
      const input: ScaffoldClassInput = {
        name: body.name,
        baseClass: body.baseClass,
        mixinNames: Array.isArray(body.mixinNames)
          ? body.mixinNames.filter((m): m is string => typeof m === 'string')
          : [],
      };
      try {
        const out = await CmsSession.runAsSessionPlayer(
          req,
          'studio.scaffoldClass',
          () => StudioApi.scaffoldClass(input)
        );
        res.json(out);
      } catch (e) {
        sendStudioError(res, e);
      }
    });

    // ---- create a NEW content template (CSRF-protected) -----------
    app.post('/api/studio/template', requireAuth, async (req, res) => {
      if (!csrfOk(req, res)) return;
      const body = req.body as Partial<CreateTemplateInput> | undefined;
      if (
        !body ||
        typeof body.path !== 'string' ||
        typeof body.classPath !== 'string' ||
        typeof body.data !== 'object' ||
        body.data === null ||
        Array.isArray(body.data)
      ) {
        res.status(400).json({
          code: 'invalid',
          message: 'path, classPath, and a data object are required',
        });
        return;
      }
      const input: CreateTemplateInput = {
        path: body.path,
        classPath: body.classPath,
        data: body.data as Record<string, unknown>,
      };
      try {
        const out = await CmsSession.runAsSessionPlayer(
          req,
          'studio.createTemplate',
          () => StudioApi.createTemplate(input)
        );
        res.json(out);
      } catch (e) {
        sendStudioError(res, e);
      }
    });

    // ---- commit a scaffolded class to source (CSRF-protected) -----
    app.post('/api/studio/commit', requireAuth, async (req, res) => {
      if (!csrfOk(req, res)) return;
      const body = req.body as Partial<CommitClassInput> | undefined;
      if (
        !body ||
        typeof body.targetPath !== 'string' ||
        typeof body.source !== 'string'
      ) {
        res
          .status(400)
          .json({ code: 'invalid', message: 'targetPath and source required' });
        return;
      }
      const input: CommitClassInput = {
        targetPath: body.targetPath,
        source: body.source,
      };
      try {
        const out = await CmsSession.runAsSessionPlayer(
          req,
          'studio.commitClass',
          () => StudioApi.commitClass(input)
        );
        res.json(out);
      } catch (e) {
        sendStudioError(res, e);
      }
    });

    console.info('StudioRoutes: Routes configured');
  }
}
