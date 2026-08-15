/**
 * EmoteRoutes — the read-only REST surface for the emote catalogue (the
 * client's reaction picker draws from this and nothing else).
 *
 *   GET /api/emotes  → { emotes: EmoteCatalogueEntry[] }
 *
 * Structural sibling of {@link HelpRoutes}: authored reference data,
 * global rather than per-viewer, read-only, `requireAuth`, no CSRF.
 *
 * ⭐⭐ **Why REST and not the connection payload.** It shipped on
 * `ConnectionEstablishedPayload` first, beside `topicCatalogue`. That is
 * the wrong home for something expected to grow: `Avatar.enter()` runs
 * on **reconnect** as well as fresh login, so a flaky connection
 * re-shipped the whole catalogue every time it dropped — onto a packet
 * that already carries the topic catalogue, the news window and the
 * frame backfill.
 *
 * The catalogue is authored, global, and changes only when an author
 * runs `soul make`. That is the textbook case for HTTP caching, so this
 * route carries a **strong ETag over the payload** and the client
 * fetches lazily, on the first reaction the player opens:
 *
 * | | bytes |
 * |---|---|
 * | reconnect | 0 |
 * | later session, unchanged catalogue | 0 (`304`) |
 * | player who never reacts | 0 |
 *
 * ⚠ `reactableTopics` deliberately STAYS on the connection payload. It
 * is four strings, it gates whether the `＋` affordance exists at all,
 * and a picker that had to fetch before it could decide whether to offer
 * anything would flash an affordance in and out.
 *
 * ⚠ The ETag is computed from the payload, not from a version counter:
 * `soul mint` / `edit` / `delete` write through to the cache, and a
 * counter would be a second thing to remember to bump. A hash cannot
 * drift from what it describes.
 */

import { createHash } from 'crypto';
import type { Express, Request, Response } from 'express';
import type { EmoteCatalogueEntry } from '@saxonberg/types';
import { SoulApi } from '../mud/api/soul';
import { AuthMiddleware } from '../services/auth/AuthMiddleware';

/** Strong ETag over the serialized catalogue. */
function etagFor(body: string): string {
  return `"${createHash('sha1').update(body).digest('base64')}"`;
}

export class EmoteRoutes {
  /**
   * Mount on the Express app. Call from `Server.setupRoutes()` beside
   * {@link HelpRoutes}, after session/passport middleware and before the
   * SPA catch-all.
   */
  public static setup(app: Express): void {
    const requireAuth = AuthMiddleware.requireAuthApi;

    app.get('/api/emotes', requireAuth, async (req: Request, res: Response) => {
      let emotes: EmoteCatalogueEntry[];
      try {
        emotes = await SoulApi.snapshot();
      } catch {
        /*
         * ⚠ 503, not an empty 200. An empty catalogue is a legitimate
         * answer (a world with no emotes authored yet) and the client
         * renders it honestly as "no picker" — so returning `[]` for a
         * FAILURE would make a broken catalogue indistinguishable from
         * an empty one, and the client would cache the lie.
         */
        res.status(503).json({ error: 'unavailable' });
        return;
      }

      const body = JSON.stringify({ emotes });
      const etag = etagFor(body);
      res.setHeader('ETag', etag);
      /*
       * `no-cache` means *revalidate*, not *do not store*: the browser
       * keeps the body and asks with `If-None-Match`, so an unchanged
       * catalogue costs one conditional request and zero payload. A
       * `max-age` would instead serve a stale catalogue for its duration
       * — and an author who mints an emote should see it next session,
       * not next hour.
       */
      res.setHeader('Cache-Control', 'private, no-cache');

      if (req.headers['if-none-match'] === etag) {
        res.status(304).end();
        return;
      }
      res.type('application/json').send(body);
    });

    console.info('EmoteRoutes: Routes configured');
  }
}
