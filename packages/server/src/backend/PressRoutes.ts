/**
 * PressRoutes — the read-only REST data surface for the press.
 *
 * **Two routes, and the difference between them is the whole point:**
 *
 *   GET /api/press/archive?before=&limit=&realm=&kind=   (requireAuth)
 *     → PressApi.archive({...}) → ReleaseRow[]
 *
 *   GET /api/press/releases?limit=                       (⭐ ANONYMOUS)
 *     → PressApi.pressRoom(limit) → PublicReleaseRow[]
 *
 * ⭐ **The public read is its own route rather than a flag on the
 * archive.** A route whose entire contract is *"public, anonymous, no
 * credentials"* is much harder to widen by accident than a boolean on a
 * route that also serves authenticated readers. It reads no session, sets
 * no cookie, and touches neither `req.user` nor any cookie header.
 *
 * ⚠ It **serves the window and rejects paging** (`before` → 400). A
 * silently-ignored cursor is the shape of a future accidental widening —
 * somebody adds paging to the archive-shaped handler and the public one
 * inherits it. A press room is not an archive.
 *
 * ⚠ **`requireAuthApi` is per-route, never app-wide** (verified against
 * `Server.setupRoutes`), so mounting an unauthenticated route here does
 * not need — and must not get — any middleware change.
 *
 * ⚠ **No CORS change is needed and none should be made.** The app-wide
 * policy is single-origin with `credentials: true`, already covering
 * same-origin production and 5173→2010 dev. A single-origin credentialed
 * policy cannot have an origin appended without reasoning about the
 * credentialed routes it also governs.
 *
 * Structural sibling of {@link HelpRoutes}: **read-only** — no CSRF, no
 * attribution bridge (there are no writes). Ordering, filtering and
 * limit-clamping all live in the Api; these handlers only parse and
 * validate query params.
 */

import type { Express, Response } from "express";
import type { ReleaseRow, PublicReleaseRow } from "@saxonberg/types";
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

    // ⭐ The anonymous press room. NO `requireAuth` — deliberately, and
    // the handler below touches no session, no cookie and no `req.user`.
    app.get("/api/press/releases", (req, res) => {
      // ⚠ Paging is REFUSED rather than ignored. Ignoring it would make a
      // future `before=` on this route silently start working the day
      // somebody wires one up.
      if (req.query.before !== undefined) {
        sendError(
          res,
          400,
          "the press room serves the current window; it does not page",
        );
        return;
      }

      const raw = Number(req.query.limit);
      const limit =
        req.query.limit !== undefined && Number.isFinite(raw)
          ? raw
          : undefined;
      const rows: PublicReleaseRow[] = PressApi.pressRoom(limit);
      res.json(rows);
    });

    console.info("PressRoutes: Routes configured");
  }
}
