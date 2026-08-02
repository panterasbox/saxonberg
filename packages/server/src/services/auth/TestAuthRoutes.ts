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
 *   2. `Backend.handleTestAuthentication` independently refuses unless
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
import type { Backend } from '../../backend/Backend';

const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;

export class TestAuthRoutes {
  /**
   * Mount the test-login route. Call only from the `AUTH_MODE === 'test'`
   * branch in `Server`.
   *
   * @param app - Express application
   * @param backend - Backend, owns the gated `handleTestAuthentication`
   */
  public static setup(app: Express, backend: Backend): void {
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

      void backend.handleTestAuthentication(
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

    /**
     * Test-only cash faucet. **Separate from `/auth/test-login` on
     * purpose, and called AFTER the browser is in-world**: at provision
     * time the avatar is a database row, not a live object, so an
     * `issueCash` there has nothing to hand coins to. That is not a
     * detail worth papering over with a retry — the money has to land on
     * the same live avatar the player is driving.
     *
     * An economy verb (`title buy`) cannot be driven past its funds
     * check by a character with no money, so without this the sale can
     * only ever be observed REFUSING. Uses the shipped `issueCash`
     * faucet, so the coins are real (denominated, massed,
     * encumbrance-bearing) and the ledger stays conserved.
     *
     * Fails LOUDLY (500) rather than warning: a silent no-op here reads
     * downstream as "the sale refused", which is a false negative in the
     * exact test that exists to prove it does not.
     */
    app.post('/auth/test-fund', (req: Request, res: Response) => {
      if (TEST_AUTH_TOKEN && req.get('x-test-auth') !== TEST_AUTH_TOKEN) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }
      const userId = (
        req.session as { passport?: { user?: { id?: string } } } | undefined
      )?.passport?.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'not authenticated' });
        return;
      }
      const body = req.body as { fundsMinor?: unknown } | undefined;
      const fundsMinor =
        typeof body?.fundsMinor === 'number' && body.fundsMinor > 0
          ? body.fundsMinor
          : 0;
      if (fundsMinor === 0) {
        res.status(400).json({ error: 'fundsMinor must be a positive number' });
        return;
      }
      void backend
        .handleTestFunding(userId, fundsMinor)
        .then(() => res.json({ funded: fundsMinor }))
        .catch((err: unknown) => {
          console.error('TestAuthRoutes: test-fund failed:', err);
          res.status(500).json({ error: String(err) });
        });
    });

    console.warn(
      'TestAuthRoutes: ⚠  /auth/test-login is MOUNTED (test auth). Never in production.'
    );
  }
}
