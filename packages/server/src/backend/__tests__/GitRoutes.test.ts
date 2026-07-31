/**
 * GitRoutes REST surface — supertest against a minimal Express app that
 * mirrors Server's auth middleware + `GitRoutes.setup`.
 *
 * Proves the transport contract, not the gating internals (those are
 * `GitLogic`'s, covered in GitLogic.test.ts):
 *   - authenticated read → 200, bound 1:1 to the `GitApi` op via the bridge
 *   - unauthenticated → 401
 *   - write without CSRF → 403
 *   - a thrown `GitError` maps to the right HTTP status
 *   - no authz lives in the route (the bridge stamps the session avatar;
 *     `GitApi` derives the actor from context)
 *
 * `GitApi` is mocked (its gating is GitLogic.test.ts's job); the avatar
 * resolution (User.findById + PlayerApi.findAvatarByPlayerId) is stubbed.
 * No Mongo, no git binary, no live world.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { type Express } from 'express';
import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { GitRoutes } from '../GitRoutes';
import { GitApi, GitError } from '../../mud/api/git';
import { User } from '../../mud/lib/identity/User';
import { PlayerApi } from '../../mud/api/player';
import type Avatar from '../../mud/obj/Avatar';

/** Minimal app mirroring Server's auth middleware + GitRoutes. */
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

  app.post('/test-login', (req, res) => {
    req.login({ id: 'u-1' } as Express.User, (err) => {
      if (err) {
        res.status(500).json({ error: 'login failed' });
        return;
      }
      res.json({ ok: true });
    });
  });

  GitRoutes.setup(app);
  return app;
}

function fakeAvatar(playerId: string): Avatar {
  return {
    getPlayerId: () => playerId,
    getCircleScope: () => null,
  } as unknown as Avatar;
}

/** Stub the bridge's avatar resolution so runAsSessionPlayer has an actor. */
function stubSessionAvatar(): void {
  const user = new User();
  user.playerIds = ['p-1'];
  vi.spyOn(User, 'findById').mockResolvedValue(user);
  vi.spyOn(PlayerApi, 'findAvatarByPlayerId').mockReturnValue(fakeAvatar('p-1'));
}

describe('GitRoutes', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('authenticated status read binds to GitApi.status', async () => {
    stubSessionAvatar();
    const spy = vi.spyOn(GitApi, 'status').mockResolvedValue({
      branch: 'authoring',
      tracking: 'origin/authoring',
      ahead: 0,
      behind: 0,
      diverged: false,
      files: [],
      warnings: [],
    });

    const agent = request.agent(makeApp());
    await agent.post('/test-login').expect(200);
    const res = await agent.get('/api/git/status');
    expect(res.status).toBe(200);
    expect(res.body.branch).toBe('authoring');
    expect(spy).toHaveBeenCalled();
  });

  it('log passes the parsed limit + path to GitApi.log', async () => {
    stubSessionAvatar();
    const spy = vi.spyOn(GitApi, 'log').mockResolvedValue([]);
    const agent = request.agent(makeApp());
    await agent.post('/test-login').expect(200);
    await agent.get('/api/git/log?limit=5&path=docs').expect(200);
    expect(spy).toHaveBeenCalledWith({ limit: 5, pathArg: 'docs' });
  });

  it('unauthenticated read returns 401', async () => {
    const res = await request(makeApp()).get('/api/git/status');
    expect(res.status).toBe(401);
  });

  it('publish without a CSRF token returns 403', async () => {
    const agent = request.agent(makeApp());
    await agent.post('/test-login').expect(200);
    const res = await agent.post('/api/git/publish').send({ message: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('csrf');
  });

  it('revert without a CSRF token returns 403', async () => {
    const agent = request.agent(makeApp());
    await agent.post('/test-login').expect(200);
    const res = await agent.post('/api/git/revert').send({ sha: 'abc' });
    expect(res.status).toBe(403);
  });

  it('publish with CSRF binds to GitApi.publish', async () => {
    stubSessionAvatar();
    const spy = vi.spyOn(GitApi, 'publish').mockResolvedValue({
      committed: true,
      sha: 'abcdef12',
      committedPaths: ['packages/server/src/mud/lib/lounge/Bar.ts'],
      skippedPaths: [],
      pushed: true,
      branch: 'authoring',
      detail: 'ok',
    });
    const agent = request.agent(makeApp());
    await agent.post('/test-login').expect(200);
    const csrf = await agent.get('/api/git/csrf');
    const token = csrf.body.token as string;
    const res = await agent
      .post('/api/git/publish')
      .set('X-CMS-CSRF', token)
      .send({ message: 'fix bar' });
    expect(res.status).toBe(200);
    expect(res.body.committed).toBe(true);
    expect(spy).toHaveBeenCalledWith('fix bar');
  });

  it('maps a GitError(denied) to 403', async () => {
    stubSessionAvatar();
    vi.spyOn(GitApi, 'status').mockRejectedValue(
      new GitError('denied', 'you must be a wizard')
    );
    const agent = request.agent(makeApp());
    await agent.post('/test-login').expect(200);
    const res = await agent.get('/api/git/status');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('denied');
  });

  it('maps a GitError(not-a-repo) to 404 and (conflict) to 409', async () => {
    stubSessionAvatar();
    vi.spyOn(GitApi, 'status').mockRejectedValue(
      new GitError('not-a-repo', 'not a git working tree')
    );
    const agent = request.agent(makeApp());
    await agent.post('/test-login').expect(200);
    expect((await agent.get('/api/git/status')).status).toBe(404);

    const csrf = await agent.get('/api/git/csrf');
    const token = csrf.body.token as string;
    vi.spyOn(GitApi, 'revert').mockRejectedValue(
      new GitError('conflict', 'revert conflicts')
    );
    const res = await agent
      .post('/api/git/revert')
      .set('X-CMS-CSRF', token)
      .send({ sha: 'abcdef1' });
    expect(res.status).toBe(409);
  });
});
