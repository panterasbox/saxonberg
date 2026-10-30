/**
 * TestAuthRoutes — the TEST-ONLY route surface.
 *
 * Mounts `POST /auth/test-login`, which establishes a real Passport
 * session for a deterministic synthetic user, skipping Google OAuth —
 * and ⭐ `POST /auth/test-clock`, which moves world-time.
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
 * The login endpoint reaches the SAME session state as the real OAuth
 * path (`session.passport.user = { id }`, set via `req.login`), so
 * `/auth/status`, `req.isAuthenticated()`, and the WebSocket upgrade's
 * `session.passport.user.id` check all work with no other changes.
 *
 * ⭐⭐ **Why the clock is a ROUTE and not a verb.** A game day is about
 * two real hours, so a seasonal system is unobservable to any test that
 * finishes. The taps build first reached for the `eval` sandbox, which
 * was a category error twice over: it dressed scaffolding as an in-world
 * authoring act, and it could not work anyway — an `eval` always runs
 * inside a sandbox boundary (a quarantined circle, or a parcel-bound
 * jurisdiction) and a GLOBAL clock jump is the one thing a bounded
 * context must not be allowed to do. ⛔ Nothing in the game moves the
 * realm's clock. The harness does, from outside the fiction, here.
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
            parcels?: unknown;
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
      // ⭐ Title to stage in: `eval --parcel <it>` as its holder could
      // (TestHooks.#grantParcels — a transfer, not a bypass).
      const parcels = body?.parcels;
      if (
        parcels !== undefined &&
        !(
          Array.isArray(parcels) &&
          parcels.every((p) => typeof p === 'string' && p.startsWith('/'))
        )
      ) {
        res
          .status(400)
          .json({ error: 'parcels must be an array of /-rooted paths' });
        return;
      }

      void TestHooks.authenticate(
        application,
        handle,
        (err, user) => {
          if (err || !user) {
            console.error('TestAuthRoutes: test-login failed:', err);
            // The message, not a bare 500 — a wrong parcel names the right one.
            res.status(500).json({
              error:
                err instanceof Error
                  ? `test-login failed: ${err.message}`
                  : 'test-login failed',
            });
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
        wizard,
        (parcels as string[] | undefined) ?? []
      );
    });

    // ⭐ The clock. Same mount gate, same token check, and
    // `TestHooks.advanceClock` refuses independently on `AUTH_MODE`
    // while `WorldClockApi.advance` refuses independently on
    // `@TestOnly` — three questions, three gates.
    app.post('/auth/test-clock', (req: Request, res: Response) => {
      if (TEST_AUTH_TOKEN && req.get('x-test-auth') !== TEST_AUTH_TOKEN) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }
      const body = req.body as
        | { advance?: unknown; soak?: unknown }
        | undefined;
      const advance = body?.advance;
      // No `advance` is a pure READ, which is what a drive uses to
      // assert the jump landed.
      if (advance === undefined) {
        try {
          res.json({ now: TestHooks.clockNow() });
        } catch (err) {
          console.error('TestAuthRoutes: test-clock read failed:', err);
          res.status(500).json({ error: String(err) });
        }
        return;
      }
      if (typeof advance !== 'string') {
        res.status(400).json({ error: 'advance must be a duration string' });
        return;
      }
      // ⛔ `soak: true` is sent only by the wire harness under `pnpm
      // wire:soak`; without it a jump past one game day is refused as a
      // span step (TestHarnessApi.advanceClock, the one place).
      void TestHooks.advanceClock(advance, { soak: body?.soak === true })
        .then((moved) => res.json(moved))
        .catch((err: unknown) => {
          // ⚠ The MESSAGE goes back, not a bare 500. A refusal here is
          // `@TestOnly`'s, the span rule's, or the clock's own (a paused
          // clock, a duration it cannot parse), and each says exactly what is
          // wrong — losing that is how the eval route stayed
          // undiagnosed for three review rounds.
          console.error('TestAuthRoutes: test-clock failed:', err);
          res
            .status(500)
            .json({ error: err instanceof Error ? err.message : String(err) });
        });
    });

    // ⭐ The weather pin. `type` present → pin; absent or null → unpin.
    // `scope` is a place's or a Locality's template path; the pin lands
    // on the covering Locality (TestHarnessApi.pinWeather).
    app.post('/auth/test-weather', (req: Request, res: Response) => {
      if (TEST_AUTH_TOKEN && req.get('x-test-auth') !== TEST_AUTH_TOKEN) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }
      const body = req.body as
        | { scope?: unknown; type?: unknown; mode?: unknown }
        | undefined;
      const scope = body?.scope;
      const type = body?.type ?? null;
      const mode = body?.mode ?? 'frozen';
      if (
        typeof scope !== 'string' ||
        (type !== null && typeof type !== 'string') ||
        (mode !== 'frozen' && mode !== 'alive')
      ) {
        res.status(400).json({
          error:
            "test-weather wants {scope: '/path', type?: kind | null, mode?: 'frozen' | 'alive'}",
        });
        return;
      }
      void TestHooks.pinWeather(scope, type, mode)
        .then((report) => res.json(report))
        .catch((err: unknown) => {
          console.error('TestAuthRoutes: test-weather failed:', err);
          res
            .status(500)
            .json({ error: err instanceof Error ? err.message : String(err) });
        });
    });

    console.warn(
      'TestAuthRoutes: ⚠  /auth/test-login, /auth/test-clock and ' +
        '/auth/test-weather are MOUNTED (test seams). Never in production.'
    );
  }
}
