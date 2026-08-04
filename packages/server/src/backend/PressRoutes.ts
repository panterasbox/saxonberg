/**
 * PressRoutes — the read-only REST data surface for the news-ticker
 * archive (the client pane's "load older" transport).
 *
 * One GET route, 1:1 with the `PressApi.archive` read:
 *
 *   GET /api/press/archive?before=&limit=&realm=&kind=
 *     → PressApi.archive({...}) → ReleaseRow[]   (400 on a bad realm/kind)
 *
 * Structural sibling of {@link HelpRoutes}: **read-only** — no CSRF, no
 * attribution bridge (there are no writes). The route is `requireAuth` (the
 * session-derived viewer is the anonymous floor for every authenticated
 * reader); it adds no authz surface beyond that. Releases are OOC-public, so
 * there is no per-viewer lensing — `PressApi.toRow` projects each row once.
 *
 * Paging/ordering/limit-clamping all live in `PressApi.archive` (the
 * Phase-1 logic); this route only parses + validates query params and projects
 * the returned `Release` Documents to their wire shape.
 */

import type { Express, Response } from "express";
import type { ReleaseRow } from "@saxonberg/types";
import { PressApi, type ArchiveQuery } from "../mud/api/press";
import {
  RELEASE_REALMS,
  RELEASE_KINDS,
  type ReleaseRealm,
  type ReleaseKind,
} from "../mud/lib/press/Release";
import { AuthMiddleware } from "../services/auth/AuthMiddleware";

const REALMS: ReadonlySet<string> = new Set(RELEASE_REALMS);
const KINDS: ReadonlySet<string> = new Set(RELEASE_KINDS);

/** Emit a uniform error body (the HelpRoutes precedent). */
function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({ error: "invalid", message });
}

export class PressRoutes {
  /**
   * Mount the release REST routes on the Express app. Call from
   * `Server.setupRoutes()` after session/passport middleware is live and
   * before the SPA catch-all so the `/api/press/*` routes match first.
   */
  public static setup(app: Express): void {
    const requireAuth = AuthMiddleware.requireAuthApi;

    app.get("/api/press/archive", requireAuth, async (req, res) => {
      const query: ArchiveQuery = {};

      const realm = req.query.realm;
      if (realm !== undefined) {
        const value = String(realm);
        if (!REALMS.has(value)) {
          sendError(res, 400, `unknown realm: ${value || "(empty)"}`);
          return;
        }
        query.realm = value as ReleaseRealm;
      }

      const kind = req.query.kind;
      if (kind !== undefined) {
        const value = String(kind);
        if (!KINDS.has(value)) {
          sendError(res, 400, `unknown kind: ${value || "(empty)"}`);
          return;
        }
        query.kind = value as ReleaseKind;
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

      const releases = await PressApi.archive(query);
      const rows: ReleaseRow[] = releases.map((b) => PressApi.toRow(b));
      res.json(rows);
    });

    console.info("PressRoutes: Routes configured");
  }
}
