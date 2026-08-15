/**
 * EmoteRoutes REST surface — supertest against a minimal Express app
 * mirroring Server's auth middleware + `EmoteRoutes.setup`.
 *
 * ⭐⭐ The load-bearing behaviour is the **ETag**, because that is the
 * whole reason the catalogue moved off `ConnectionEstablishedPayload`.
 * It shipped there first, beside `topicCatalogue`, and `Avatar.enter()`
 * runs on RECONNECT as well as fresh login — so a flaky connection
 * re-shipped the entire catalogue every drop, onto a packet already
 * carrying the topic catalogue, the news window and the frame backfill.
 * Here an unchanged catalogue costs a conditional request and no body.
 *
 * `SoulApi.snapshot` is stubbed; its projection is
 * `SoulCatalogue.snapshot.test.ts`'s job. These assert only the
 * transport.
 */

import '../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express, { type Express } from 'express';
import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { EmoteCatalogueEntry } from '@saxonberg/types';
import { EmoteRoutes } from '../EmoteRoutes';
import { SoulApi } from '../../mud/api/soul';

const NOD: EmoteCatalogueEntry = {
  verb: 'nod',
  emoji: '\u{1F642}',
  aliases: ['agree'],
  tags: [],
  slots: [],
};

function makeApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    session({ secret: 'test-secret', resave: false, saveUninitialized: false }),
  );
  app.use(passport.initialize());
  app.use(passport.session());
  passport.serializeUser((user, done) =>
    done(null, { id: (user as { id: string }).id }),
  );
  passport.deserializeUser((obj, done) => done(null, obj as Express.User));
  app.post('/test-login', (req, res) => {
    req.login({ id: 'u-1' } as Express.User, (err) => {
      if (err) {
        res.status(500).json({ error: 'login failed' });
        return;
      }
      res.json({ ok: true });
    });
  });
  EmoteRoutes.setup(app);
  return app;
}

let app: Express;
let agent: ReturnType<typeof request.agent>;

beforeEach(async () => {
  app = makeApp();
  agent = request.agent(app);
  await agent.post('/test-login').expect(200);
});
afterEach(() => vi.restoreAllMocks());

describe('GET /api/emotes', () => {
  it('serves the catalogue', async () => {
    vi.spyOn(SoulApi, 'snapshot').mockResolvedValue([NOD]);
    const res = await agent.get('/api/emotes').expect(200);
    expect(res.body.emotes).toEqual([NOD]);
  });

  it('refuses an unauthenticated read', async () => {
    vi.spyOn(SoulApi, 'snapshot').mockResolvedValue([NOD]);
    await request(app).get('/api/emotes').expect(401);
  });

  describe('⭐⭐ caching', () => {
    it('carries an ETag', async () => {
      vi.spyOn(SoulApi, 'snapshot').mockResolvedValue([NOD]);
      const res = await agent.get('/api/emotes').expect(200);
      expect(res.headers.etag).toBeTruthy();
    });

    it('answers 304 with NO body when the catalogue has not changed', async () => {
      vi.spyOn(SoulApi, 'snapshot').mockResolvedValue([NOD]);
      const first = await agent.get('/api/emotes').expect(200);
      const second = await agent
        .get('/api/emotes')
        .set('If-None-Match', first.headers.etag)
        .expect(304);
      // The point of the whole exercise: a returning client pays a
      // conditional request and no payload.
      expect(second.text).toBe('');
    });

    it('⭐ changes the ETag when the catalogue changes', async () => {
      const snap = vi.spyOn(SoulApi, 'snapshot').mockResolvedValue([NOD]);
      const first = await agent.get('/api/emotes').expect(200);

      snap.mockResolvedValue([NOD, { ...NOD, verb: 'wave', emoji: '\u{1F44B}' }]);
      const second = await agent
        .get('/api/emotes')
        .set('If-None-Match', first.headers.etag)
        .expect(200);

      // ⚠ Derived from the payload, not a version counter — a counter is
      // a second thing to remember to bump, and a hash cannot drift from
      // what it describes.
      expect(second.headers.etag).not.toBe(first.headers.etag);
      expect(second.body.emotes).toHaveLength(2);
    });

    it('revalidates rather than serving stale', async () => {
      vi.spyOn(SoulApi, 'snapshot').mockResolvedValue([NOD]);
      const res = await agent.get('/api/emotes').expect(200);
      // `no-cache` means REVALIDATE, not do-not-store. A `max-age` would
      // serve a stale catalogue for its duration, and an author who
      // mints an emote should see it next session rather than next hour.
      expect(res.headers['cache-control']).toContain('no-cache');
      expect(res.headers['cache-control']).not.toContain('max-age');
    });
  });

  it('⚠ 503s on failure rather than returning an empty catalogue', async () => {
    vi.spyOn(SoulApi, 'snapshot').mockRejectedValue(new Error('no catalogue'));
    await agent.get('/api/emotes').expect(503);
    // An empty catalogue is a LEGITIMATE answer — a world with nothing
    // authored — which the client renders as "no picker". Returning `[]`
    // for a failure would make the two indistinguishable, and the client
    // would cache the lie.
  });
});
