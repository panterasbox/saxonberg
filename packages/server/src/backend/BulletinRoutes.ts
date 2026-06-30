/**
 * BulletinRoutes — the read-only REST data surface for the news-ticker
 * archive (the client pane's "load older" transport).
 *
 * One GET route, 1:1 with the `BulletinApi.archive` read:
 *
 *   GET /api/bulletins/archive?before=&limit=&realm=&kind=
 *     → BulletinApi.archive({...}) → BulletinRow[]   (400 on a bad realm/kind)
 *
 * Structural sibling of {@link HelpRoutes}: **read-only** — no CSRF, no
 * attribution bridge (there are no writes). The route is `requireAuth` (the
 * session-derived viewer is the anonymous floor for every authenticated
 * reader); it adds no authz surface beyond that. Bulletins are OOC-public, so
 * there is no per-viewer lensing — `BulletinApi.toRow` projects each row once.
 *
 * Paging/ordering/limit-clamping all live in `BulletinApi.archive` (the
 * Phase-1 logic); this route only parses + validates query params and projects
 * the returned `Bulletin` Documents to their wire shape.
 */

import type { Express, Response } from "express";
import type { BulletinRow } from "@saxonberg/types";
import { BulletinApi, type ArchiveQuery } from "../mud/api/bulletin";
import {
  BULLETIN_REALMS,
  BULLETIN_KINDS,
  type BulletinRealm,
  type BulletinKind,
} from "../mud/lib/bulletin/Bulletin";
import { AuthMiddleware } from "../services/auth/AuthMiddleware";

const REALMS: ReadonlySet<string> = new Set(BULLETIN_REALMS);
const KINDS: ReadonlySet<string> = new Set(BULLETIN_KINDS);

/** Emit a uniform error body (the HelpRoutes precedent). */
function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({ error: "invalid", message });
}

export class BulletinRoutes {
  /**
   * Mount the bulletin REST routes on the Express app. Call from
   * `Server.setupRoutes()` after session/passport middleware is live and
   * before the SPA catch-all so the `/api/bulletins/*` routes match first.
   */
  public static setup(app: Express): void {
    const requireAuth = AuthMiddleware.requireAuthApi;

    app.get("/api/bulletins/archive", requireAuth, async (req, res) => {
      const query: ArchiveQuery = {};

      const realm = req.query.realm;
      if (realm !== undefined) {
        const value = String(realm);
        if (!REALMS.has(value)) {
          sendError(res, 400, `unknown realm: ${value || "(empty)"}`);
          return;
        }
        query.realm = value as BulletinRealm;
      }

      const kind = req.query.kind;
      if (kind !== undefined) {
        const value = String(kind);
        if (!KINDS.has(value)) {
          sendError(res, 400, `unknown kind: ${value || "(empty)"}`);
          return;
        }
        query.kind = value as BulletinKind;
      }

      // `before` (epoch-ms cursor) + `limit` (page size); both forwarded as
      // numbers when present. The archive clamps `limit` to its own bounds.
      const before = Number(req.query.before);
      if (req.query.before !== undefined && Number.isFinite(before)) {
        query.before = before;
      }
      const limit = Number(req.query.limit);
      if (req.query.limit !== undefined && Number.isFinite(limit)) {
        query.limit = limit;
      }

      const bulletins = await BulletinApi.archive(query);
      const rows: BulletinRow[] = bulletins.map((b) => BulletinApi.toRow(b));
      res.json(rows);
    });

    console.info("BulletinRoutes: Routes configured");
  }
}
