/**
 * FrontRoutes — the front page's anonymous read (stream arrival D14).
 *
 *   GET /api/front[?watch=<program>&carrier=<twitch|youtube|kick>]   (⭐ ANONYMOUS)
 *     → { show?: ProgramListing }
 *
 * ⭐ **Anonymous by construction, as the press room is** (`PressRoutes`): it
 * reads no session, sets no cookie, and touches neither `req.user` nor any
 * cookie header. A route whose entire contract is *public, no credentials*
 * is harder to widen by accident than a flag on an authenticated one.
 *
 * ⭐ **A link can only ever select among programs' PROVEN feeds.** `watch`
 * is a program's short name (by pattern) and `carrier` one of three words;
 * the answer is that program when it has a feed on that carrier, else the
 * featured one (`stream.featuredProgram`), else no `show` at all — the page
 * then has no show band. Nothing a link supplies is ever a channel.
 *
 * ⚠ Its own route rather than a field on `/auth/status`, which sign-in
 * awaits (a slow world must never hold up a login). Any other query key is
 * a 400, as the press room refuses paging: a silently-ignored parameter is
 * the shape of a future accidental widening. A world that cannot answer is
 * `{}` and a logged reason — never a 500 the page would have to explain.
 */

import type { Express, Response } from "express";
import type { FrontResponse } from "@saxonberg/types";
import { PROGRAM_CARRIERS, type ProgramCarrier } from "@saxonberg/types";
import { StreamApi } from "../mud/api/stream";
import { PROGRAM_NAME_RE } from "../mud/lib/livestream/Program";

const ALLOWED_KEYS: ReadonlySet<string> = new Set(["watch", "carrier"]);
const CARRIERS: ReadonlySet<string> = new Set(PROGRAM_CARRIERS);

/** Emit a uniform error body (the PressRoutes precedent). */
function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({ error: "invalid", message });
}

export class FrontRoutes {
  /**
   * Mount the front-page route. Call from `Server.setupRoutes()` before the
   * SPA catch-all so `/api/front` matches first.
   */
  public static setup(app: Express): void {
    // ⭐ NO `requireAuth` — deliberately.
    app.get("/api/front", async (req, res) => {
      for (const key of Object.keys(req.query)) {
        if (!ALLOWED_KEYS.has(key)) {
          sendError(res, 400, `unknown query key: ${key}`);
          return;
        }
      }
      const rawWatch = typeof req.query.watch === "string" ? req.query.watch.trim().toLowerCase() : "";
      const rawCarrier = typeof req.query.carrier === "string" ? req.query.carrier.trim().toLowerCase() : "";
      if (rawCarrier !== "" && !CARRIERS.has(rawCarrier)) {
        sendError(res, 400, `unknown carrier: ${rawCarrier}`);
        return;
      }
      // A malformed name is not an error — it is a link naming nothing, so
      // the featured program answers.
      const watch = PROGRAM_NAME_RE.test(rawWatch) ? rawWatch : undefined;
      const carrier = rawCarrier !== "" ? (rawCarrier as ProgramCarrier) : undefined;
      let body: FrontResponse = {};
      try {
        const show = await StreamApi.frontListing(watch, carrier);
        if (show) body = { show };
      } catch (err) {
        console.warn("FrontRoutes: the front page's program could not be read; answering none:", err);
        body = {};
      }
      res.json(body);
    });

    console.info("FrontRoutes: Routes configured");
  }
}
