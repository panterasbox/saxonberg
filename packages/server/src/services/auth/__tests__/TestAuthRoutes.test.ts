/**
 * TestAuthRoutes — verifies the test-auth seam establishes a real
 * session (so `/auth/status` flips to authenticated) without touching
 * Google OAuth or the database. `TestHooks.authenticate` is stubbed, so
 * this stays a fast, DB-free unit test.
 */

import { describe, it, expect, vi } from 'vitest';
import express, { type Express } from 'express';
import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { Application } from '../../../backend/Application';
import { AuthRoutes } from '../AuthRoutes';
import { TestAuthRoutes } from '../TestAuthRoutes';

/** Minimal app mirroring Server's auth middleware; the Application is never touched. */
function makeApp(
  Routes: { setup(app: Express, application: Application): void } = TestAuthRoutes
): Express {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  // Same serialization PassportConfig uses: store { id }.
  passport.serializeUser((user, done) =>
    done(null, { id: (user as { id: string }).id })
  );
  passport.deserializeUser((obj, done) => done(null, obj as Express.User));

  AuthRoutes.setup(app);
  Routes.setup(app, {} as Application);
  return app;
}

/**
 * Stub that mints a deterministic user id without DB or runRoot. A
 * module mock (not a spy) so the re-import under `vi.resetModules`
 * below sees the same stub.
 */
vi.mock('../../../backend/TestHooks', () => ({
  TestHooks: {
    authenticate: async (
      _app: unknown,
      handle: string,
      done: (err: unknown, user?: { id: string }) => void
    ) => done(null, { id: `uid-${handle}` }),
  },
}));

describe('TestAuthRoutes', () => {
  it('establishes a session so /auth/status reports authenticated', async () => {
    const agent = request.agent(makeApp());

    // Before login: not authenticated.
    const before = await agent.get('/auth/status');
    expect(before.body.isAuthenticated).toBe(false);

    // test-login mints a session for the requested handle.
    const login = await agent
      .post('/auth/test-login')
      .send({ handle: 'alice' });
    expect(login.status).toBe(200);
    expect(login.body.isAuthenticated).toBe(true);
    expect(login.body.user.id).toBe('uid-alice');

    // The session cookie now flips /auth/status to authenticated, with
    // the same { id } shape the real OAuth path produces.
    const after = await agent.get('/auth/status');
    expect(after.body.isAuthenticated).toBe(true);
    expect(after.body.user.id).toBe('uid-alice');
  });

  it('rejects with 403 when TEST_AUTH_TOKEN is set and the header is missing', async () => {
    vi.resetModules();
    vi.stubEnv('TEST_AUTH_TOKEN', 'sekret');
    // Re-import so the module captures the stubbed token.
    const { TestAuthRoutes: Gated } = await import('../TestAuthRoutes');
    const app = makeApp(Gated);

    const denied = await request(app)
      .post('/auth/test-login')
      .send({ handle: 'alice' });
    expect(denied.status).toBe(403);

    const allowed = await request(app)
      .post('/auth/test-login')
      .set('x-test-auth', 'sekret')
      .send({ handle: 'alice' });
    expect(allowed.status).toBe(200);

    vi.unstubAllEnvs();
  });
});
