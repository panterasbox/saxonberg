/**
 * HelpRoutes — the read-only REST data surface for the help system (the
 * future client help card's transport).
 *
 * Four GET routes, each 1:1 with a `HelpApi` read:
 *
 *   GET /api/help/index           → HelpApi.index()      → HelpIndexResult
 *   GET /api/help/kind?kind=<k>   → HelpApi.listKind(k)  → HelpKindListResult  (400 bad kind)
 *   GET /api/help/topic?id=<id>   → HelpApi.fullTopic(id)→ HelpTopicResult      (404 miss)
 *   GET /api/help/search?q=<q>    → HelpApi.search(q)    → HelpSearchResult
 *
 * Structural sibling of {@link CmsRoutes}, but **read-only** — no CSRF, no
 * `CmsSession` attribution bridge (there are no writes). Every route is
 * `requireAuth` this build (the public pre-auth face is a Wave 3 non-goal);
 * the session-derived viewer is the **anonymous floor** (pass-through) for
 * every authenticated reader. All gating that exists is the capability
 * filter inside `HelpApi`; the route adds no authz surface.
 */

import type { Express, Response } from "express";
import type { HelpErrorBody, HelpKind } from "@saxonberg/types";
import { HelpApi } from "../mud/api/help";
import { AuthMiddleware } from "../services/auth/AuthMiddleware";

const HELP_KINDS: ReadonlySet<string> = new Set([
  "command",
  "api",
  "mixin",
  "type",
]);

/** Emit a uniform {@link HelpErrorBody}. */
function sendError(
  res: Response,
  status: number,
  error: HelpErrorBody["error"],
  message: string
): void {
  res.status(status).json({ error, message } satisfies HelpErrorBody);
}

export class HelpRoutes {
  /**
   * Mount the help REST routes on the Express app. Call from
   * `Server.setupRoutes()` after session/passport middleware is live and
   * before the SPA catch-all so the `/api/help/*` routes match first.
   */
  public static setup(app: Express): void {
    const requireAuth = AuthMiddleware.requireAuthApi;

    app.get("/api/help/index", requireAuth, (_req, res) => {
      res.json(HelpApi.index());
    });

    app.get("/api/help/kind", requireAuth, (req, res) => {
      const kind = String(req.query.kind ?? "");
      if (!HELP_KINDS.has(kind)) {
        sendError(res, 400, "invalid", `unknown kind: ${kind || "(missing)"}`);
        return;
      }
      res.json(HelpApi.listKind(kind as HelpKind));
    });

    app.get("/api/help/topic", requireAuth, (req, res) => {
      const id = String(req.query.id ?? "").trim();
      if (id.length === 0) {
        sendError(res, 400, "invalid", "missing topic id");
        return;
      }
      const topic = HelpApi.fullTopic(id);
      if (!topic) {
        sendError(res, 404, "not-found", `no help topic: ${id}`);
        return;
      }
      res.json({ topic });
    });

    app.get("/api/help/search", requireAuth, (req, res) => {
      const q = String(req.query.q ?? "").trim();
      if (q.length === 0) {
        sendError(res, 400, "invalid", "missing query");
        return;
      }
      res.json(HelpApi.search(q));
    });

    console.info("HelpRoutes: Routes configured");
  }
}
