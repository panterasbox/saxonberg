/**
 * CmsRoutes REST surface — supertest against a minimal Express app that
 * mirrors Server's auth middleware + `CmsRoutes.setup`.
 *
 * Proves the transport contract, not the gating internals (those are
 * `CmsLogic`'s, covered in cms.test.ts):
 *   - authenticated read → 200 (gate spied open — the bridge resolved an
 *     avatar and the route returned the listing)
 *   - unauthenticated → 401
 *   - write without CSRF → 403
 *   - write with a session that has NO loaded Avatar → the bridge yields
 *     actingActor=null → the gate fails closed → 403. The real
 *     transport-level proof: the acting principal comes from the bridge,
 *     not the request body, so a no-avatar session can't write.
 *   - write with a developer session → 200 + reloaded
 *
 * The CMS API takes no actor argument — the bridge stamps the resolved
 * session avatar, and CmsLogic derives it from context. These tests stub
 * the avatar resolution (User.findById + PlayerApi.findAvatarByPlayerId)
 * and spy the access gates (their logic is cms.test.ts's job); the source
 * go-live (HotReloadApi.reload) is spied. No Mongo, no live world.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { type Express } from 'express';
import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { CmsRoutes } from '../CmsRoutes';
import { User } from '../../mud/lib/identity/User';
import { PlayerApi } from '../../mud/api/player';
import { SourceTreeApi } from '../../mud/api/source-tree';
import { HotReloadApi } from '../../mud/api/hot-reload';
import { AccessApi } from '../../mud/api/access';
import { DiagnosticApi } from '../../mud/api/diagnostics';
import type Avatar from '../../mud/obj/Avatar';

/** Minimal app mirroring Server's auth middleware + CmsRoutes. */
function makeApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    session({ secret: 'test-secret', resave: false, saveUninitialized: false })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  passport.serializeUser((user, done) =>
    done(null, { id: (user as { id: string }).id })
  );
  passport.deserializeUser((obj, done) => done(null, obj as Express.User));

  // A test-only login route so the supertest agent can establish a real
  // Passport session (mirrors TestAuthRoutes — no DB, no OAuth).
  app.post('/test-login', (req, res) => {
    req.login({ id: 'u-1' } as Express.User, (err) => {
      if (err) {
        res.status(500).json({ error: 'login failed' });
        return;
      }
      res.json({ ok: true });
    });
  });

  CmsRoutes.setup(app);
  return app;
}

/** An avatar stub that satisfies the gates (non-null getPlayerId). */
function fakeAvatar(playerId: string): Avatar {
  return {
    getPlayerId: () => playerId,
    getCircleScope: () => null,
  } as unknown as Avatar;
}

describe('CmsRoutes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('authenticated read returns 200', async () => {
    // Bridge resolves an actor; source reads are developer-gated, so spy
    // the gate open (its logic is cms.test.ts's job).
    const user = new User();
    user.playerIds = ['p-1'];
    vi.spyOn(User, 'findById').mockResolvedValue(user);
    vi.spyOn(PlayerApi, 'findAvatarByPlayerId').mockReturnValue(
      fakeAvatar('p-1')
    );
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);

    const agent = request.agent(makeApp());
    await agent.post('/test-login').expect(200);

    // Read a known source directory root (the sandbox root listing).
    const res = await agent.get('/api/cms/tree?backend=source&path=/');
    expect(res.status).toBe(200);
    expect(res.body.backend).toBe('source');
    expect(Array.isArray(res.body.entries)).toBe(true);
  });

  it('authenticated diagnostics read binds to DiagnosticApi.list', async () => {
    const user = new User();
    user.playerIds = ['p-1'];
    vi.spyOn(User, 'findById').mockResolvedValue(user);
    vi.spyOn(PlayerApi, 'findAvatarByPlayerId').mockReturnValue(
      fakeAvatar('p-1')
    );
    const list = vi
      .spyOn(DiagnosticApi, 'list')
      .mockResolvedValue([
        {
          source: 'runtime',
          severity: 'error',
          channel: 'zone.lounge',
          path: '/obj/lounge/Bar',
          author: null,
          versionId: null,
          code: null,
          line: 12,
          col: null,
          message: 'brain threw',
          stack: null,
          ts: 1,
          expiresAt: new Date(),
        },
      ]);

    const agent = request.agent(makeApp());
    await agent.post('/test-login').expect(200);

    const res = await agent.get(
      '/api/cms/diagnostics?channel=zone.lounge&mine=true&limit=5'
    );
    expect(res.status).toBe(200);
    expect(res.body.diagnostics).toHaveLength(1);
    expect(res.body.diagnostics[0].message).toBe('brain threw');
    // The route parses the query onto the filter and passes NO actor
    // (author resolves server-side via the bridge + mine flag).
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({
        channels: ['zone.lounge'],
        mine: true,
        limit: 5,
      })
    );
  });

  it('unauthenticated diagnostics request returns 401', async () => {
    const res = await request(makeApp()).get('/api/cms/diagnostics');
    expect(res.status).toBe(401);
  });

  it('unauthenticated request returns 401', async () => {
    const res = await request(makeApp()).get(
      '/api/cms/tree?backend=source&path=/'
    );
    expect(res.status).toBe(401);
  });

  it('write without a CSRF token returns 403', async () => {
    const agent = request.agent(makeApp());
    await agent.post('/test-login').expect(200);

    const res = await agent
      .post('/api/cms/write')
      .send({ backend: 'source', path: '/server/src/foo.ts', body: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('csrf');
  });

  it('non-developer write (no loaded Avatar) is denied 403', async () => {
    // No Avatar loaded → bridge yields actor=null → AccessApi fails
    // closed → CmsError('denied') → 403. The SAME gated op as the
    // developer path, denied — no parallel authz.
    const user = new User();
    user.playerIds = ['p-1'];
    vi.spyOn(User, 'findById').mockResolvedValue(user);
    vi.spyOn(PlayerApi, 'findAvatarByPlayerId').mockReturnValue(undefined);

    const agent = request.agent(makeApp());
    await agent.post('/test-login').expect(200);
    const csrf = await agent.get('/api/cms/csrf');
    const token = csrf.body.token as string;

    const res = await agent
      .post('/api/cms/write')
      .set('X-CMS-CSRF', token)
      .send({ backend: 'source', path: '/server/src/foo.ts', body: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('denied');
  });

  it('developer write returns 200 and reloads', async () => {
    // The bridge resolves a developer avatar; spy the source write gate
    // open (its logic is cms.test.ts's job).
    const user = new User();
    user.playerIds = ['p-1'];
    vi.spyOn(User, 'findById').mockResolvedValue(user);
    vi.spyOn(PlayerApi, 'findAvatarByPlayerId').mockReturnValue(
      fakeAvatar('p-1')
    );
    vi.spyOn(AccessApi, 'isWizard').mockResolvedValue(true);
    vi.spyOn(AccessApi, 'can').mockResolvedValue(true);
    vi.spyOn(AccessApi, 'resolveSourceFolderZone').mockResolvedValue(null);

    // The CMS source backend is rooted at the mudlib, so write to a real
    // temp file under mud/ and use a mud-relative source path; spy the
    // go-live reload.
    const sandbox = SourceTreeApi.getSandboxRoot();
    const relDir = 'cms-routes-test';
    const absDir = path.join(sandbox, 'server', 'src', 'mud', relDir);
    fs.mkdirSync(absDir, { recursive: true });
    const fileName = `r-${Date.now()}.txt`;
    const absFile = path.join(absDir, fileName);
    const cmsPath = `/${relDir}/${fileName}`;

    const reloadSpy = vi
      .spyOn(HotReloadApi, 'reload')
      .mockResolvedValue(undefined as never);

    try {
      const agent = request.agent(makeApp());
      await agent.post('/test-login').expect(200);
      const csrf = await agent.get('/api/cms/csrf');
      const token = csrf.body.token as string;

      const res = await agent
        .post('/api/cms/write')
        .set('X-CMS-CSRF', token)
        .send({ backend: 'source', path: cmsPath, body: 'hello cms' });

      expect(res.status).toBe(200);
      expect(res.body.reloaded).toBe(true);
      expect(reloadSpy).toHaveBeenCalledWith(absFile);
      expect(fs.readFileSync(absFile, 'utf8')).toBe('hello cms');
    } finally {
      fs.rmSync(absDir, { recursive: true, force: true });
    }
  });
});
