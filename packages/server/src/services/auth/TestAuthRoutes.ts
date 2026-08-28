/**
 * TestAuthRoutes — TEST-ONLY authentication bypass.
 *
 * Mounts `POST /auth/test-login`, which establishes a real Passport
 * session for a deterministic synthetic user, skipping Google OAuth.
 * This is the seam that lets browser E2E tests (Playwright) get past
 * the login screen without automating a real Google flow.
 *
 * SAFETY — this is an auth bypass, so it is defended in depth:
 *   1. It is mounted ONLY when `AUTH_MODE === 'test'` (see `Server`).
 *   2. `TestHooks.authenticate` independently refuses unless
 *      `AUTH_MODE === 'test'`.
 *   3. `Server` throws on boot if `AUTH_MODE === 'test'` while
 *      `NODE_ENV === 'production'`.
 *   4. If `TEST_AUTH_TOKEN` is set, requests must present it in the
 *      `X-Test-Auth` header.
 * Production never sets `AUTH_MODE`, so this route does not exist there.
 *
 * The endpoint reaches the SAME session state as the real OAuth path
 * (`session.passport.user = { id }`, set via `req.login`), so
 * `/auth/status`, `req.isAuthenticated()`, and the WebSocket upgrade's
 * `session.passport.user.id` check all work with no other changes.
 */

import type { Express, Request, Response } from 'express';
import type { Application } from '../../backend/Application';
import { TestHooks } from '../../backend/TestHooks';

const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;

export class TestAuthRoutes {
  /**
   * Mount the test-login route. Call only from the `AUTH_MODE === 'test'`
   * branch in `Server`.
   *
   * @param app - Express application
   * @param application - the Application the gated `TestHooks.authenticate` mints into
   */
  public static setup(app: Express, application: Application): void {
    app.post('/auth/test-login', (req: Request, res: Response) => {
      if (TEST_AUTH_TOKEN && req.get('x-test-auth') !== TEST_AUTH_TOKEN) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }

      const body = req.body as
        | {
            handle?: unknown;
            withCharacter?: unknown;
            startLocation?: unknown;
            wizard?: unknown;
          }
        | undefined;
      const handle = String(body?.handle ?? 'default');
      // Opt-in: provision a ready-to-play character so in-world E2E
      // tests skip char-gen. Char-gen specs omit it (0 chars → intake).
      const withCharacter = body?.withCharacter === true;
      // Optional spawn override (e.g. a stable singleton room) so
      // co-location E2E tests bypass the elastic lounge Warren. Ignored
      // unless `withCharacter` provisions a fresh avatar.
      const startLocation =
        typeof body?.startLocation === 'string'
          ? body.startLocation
          : undefined;
      // Opt-in wizard conferral for wizard-path E2E (clone/eval/goto).
      const wizard = body?.wizard === true;

      void TestHooks.authenticate(
        application,
        handle,
        (err, user) => {
          if (err || !user) {
            console.error('TestAuthRoutes: test-login failed:', err);
            res.status(500).json({ error: 'test-login failed' });
            return;
          }
          // Establish the real Passport session (sets
          // session.passport.user = { id }), then return status.
          req.login(user, (loginErr) => {
            if (loginErr) {
              console.error('TestAuthRoutes: req.login failed:', loginErr);
              res.status(500).json({ error: 'session establishment failed' });
              return;
            }
            res.json({ isAuthenticated: true, user: { id: user.id } });
          });
        },
        withCharacter,
        startLocation,
        wizard
      );
    });

    console.warn(
      'TestAuthRoutes: ⚠  /auth/test-login is MOUNTED (test auth). Never in production.'
    );
  }
}
