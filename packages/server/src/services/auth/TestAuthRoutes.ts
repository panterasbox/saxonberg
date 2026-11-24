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
import { TestHooks, type TestLinkedAccounts } from '../../backend/TestHooks';
import { AuthRoutes } from './AuthRoutes';

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
            committees?: unknown;
            offices?: unknown;
            streamer?: unknown;
            linked?: unknown;
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
      // Opt-in wizard axis — authoring TypeScript (eval, a .ts write), and
      // nothing else: it confers NO title (wizard-axis D13).
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

      // ⭐ Authority is a SEAT: the committees over these extents
      // (`<extent>[:owner]`) and these offices (wizard-axis D13).
      const committees = body?.committees;
      const offices = body?.offices;
      const isStrings = (v: unknown, rooted: boolean): boolean =>
        Array.isArray(v) &&
        v.every((x) => typeof x === 'string' && (!rooted || x.startsWith('/')));
      if (committees !== undefined && !isStrings(committees, true)) {
        res.status(400).json({
          error: 'committees must be an array of /-rooted extents (`:owner` to own)',
        });
        return;
      }
      if (offices !== undefined && !isStrings(offices, false)) {
        res.status(400).json({ error: 'offices must be an array of office keys' });
        return;
      }

      // ⭐ Synthetic linked carrier accounts (stream arrival A-12).
      const linkedRaw = (body?.linked ?? {}) as Record<string, unknown>;
      const linked: TestLinkedAccounts = {};
      for (const k of ['twitch', 'kick', 'youtube'] as const) {
        const v = linkedRaw[k];
        if (typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v)) linked[k] = v;
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
            res.json({
              isAuthenticated: true,
              user: { id: user.id },
              ...(user.playerId ? { playerId: user.playerId } : {}),
            });
          });
        },
        withCharacter,
        startLocation,
        wizard,
        (parcels as string[] | undefined) ?? [],
        (committees as string[] | undefined) ?? [],
        (offices as string[] | undefined) ?? [],
        // ⭐ A broadcaster (stream arrival A2): a program named for the
        // handle, created and run by the character — typed, not granted.
        body?.streamer === true,
        linked
      );
    });

    // ⭐ The sign-in RETURN (stream arrival D8): a real navigation back to the
    // client, the way a provider's callback lands — signed in as
    // `test-login` signs in, then the SAME `AuthRoutes.finishSignIn`. The
    // browser walk routes `/auth/<provider>` here with a 302, so the page
    // really leaves and really comes back. No seam that `fetch`es can test
    // that the client resumes from its own tab storage. A navigation sends
    // no header, so a configured token rides the query.
    app.get('/auth/test-return', (req: Request, res: Response) => {
      if (TEST_AUTH_TOKEN && req.query.token !== TEST_AUTH_TOKEN) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }
      const handle = typeof req.query.handle === 'string' ? req.query.handle : 'default';
      const provider = req.query.provider;
      if (provider !== 'google' && provider !== 'twitch' && provider !== 'kick') {
        res.status(400).json({ error: 'provider must be google, twitch or kick' });
        return;
      }
      const withCharacter = req.query.character === '1';
      void TestHooks.authenticate(
        application,
        handle,
        (err, user) => {
          if (err || !user) {
            console.error('TestAuthRoutes: test-return failed:', err);
            res.status(500).json({ error: 'test-return failed' });
            return;
          }
          req.login(user, (loginErr) => {
            if (loginErr) {
              console.error('TestAuthRoutes: req.login failed:', loginErr);
              res.status(500).json({ error: 'session establishment failed' });
              return;
            }
            AuthRoutes.finishSignIn(res, provider);
          });
        },
        withCharacter
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

    // ⭐ A ship staged: `{ship: '/row/path' | '<kind>/<serial>',
    // at?: {node} | {frame, cite}, hull?: band, bilgeL?: L, sleptDays?: n,
    // settling?: true}` —
    // put lying where and as the drive needs her, never sailed there.
    app.post('/auth/test-ship', (req: Request, res: Response) => {
      if (TEST_AUTH_TOKEN && req.get('x-test-auth') !== TEST_AUTH_TOKEN) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }
      const body = req.body as
        | { ship?: unknown; at?: unknown; hull?: unknown; bilgeL?: unknown; sleptDays?: unknown; settling?: unknown }
        | undefined;
      const ship = body?.ship;
      const at = body?.at as { node?: unknown; frame?: unknown; cite?: unknown } | undefined;
      const place =
        at && typeof at.node === 'string'
          ? { node: at.node }
          : at && typeof at.frame === 'string' && typeof at.cite === 'string'
            ? { frame: at.frame, cite: at.cite }
            : null;
      const spec: Parameters<typeof TestHooks.stageShip>[1] = {};
      if (place !== null) spec.at = place;
      if (typeof body?.hull === 'string') spec.hull = body.hull;
      if (typeof body?.bilgeL === 'number') spec.bilgeL = body.bilgeL;
      if (typeof body?.sleptDays === 'number') spec.sleptDays = body.sleptDays;
      if (body?.settling === true) spec.settling = true;
      const badAt = at !== undefined && place === null;
      // An empty spec stands her up where she lies, with her rooms.
      if (typeof ship !== 'string' || ship === '' || badAt) {
        res.status(400).json({
          error:
            "test-ship wants {ship: '/row/path', at?: {node: '/path'} | {frame: '/path', cite: '…'}, " +
            'hull?: band, bilgeL?: litres, sleptDays?: days, settling?: true} — none of them stands her up where she lies',
        });
        return;
      }
      void TestHooks.stageShip(ship, spec)
        .then((report) => res.json(report))
        .catch((err: unknown) => {
          console.error('TestAuthRoutes: test-ship failed:', err);
          res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
        });
    });

    // ⭐ A test character fed and watered (the meals between a drive's
    // checkpoints) — a route for the clock's reason: a parcel-bound `eval`
    // may not read the biome the body's reconcile reads.
    app.post('/auth/test-nourish', (req: Request, res: Response) => {
      if (TEST_AUTH_TOKEN && req.get('x-test-auth') !== TEST_AUTH_TOKEN) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }
      const handle = (req.body as { handle?: unknown } | undefined)?.handle;
      if (typeof handle !== 'string' || handle === '') {
        res.status(400).json({ error: 'handle must be a string' });
        return;
      }
      try {
        res.json(TestHooks.nourishCharacter(handle));
      } catch (err) {
        console.error('TestAuthRoutes: test-nourish failed:', err);
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      }
    });

    // ⭐ Staging (water-supply): one authored mutator on one Stuff, by
    // path — the state a drive cannot reach by playing (an aquifer drawn
    // low, an outfall loaded). A parcel-bound `eval` may not reach a
    // realm-level Idea, which is right; this is the harness's door.
    app.post('/auth/test-stage', (req: Request, res: Response) => {
      if (TEST_AUTH_TOKEN && req.get('x-test-auth') !== TEST_AUTH_TOKEN) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }
      const body = req.body as { path?: unknown; method?: unknown; args?: unknown } | undefined;
      if (typeof body?.path !== 'string' || typeof body.method !== 'string') {
        res.status(400).json({ error: 'test-stage wants {path, method, args?: []}' });
        return;
      }
      const args = body.args === undefined ? [] : body.args;
      if (!Array.isArray(args)) {
        res.status(400).json({ error: 'args, when given, must be an array' });
        return;
      }
      TestHooks.stage(body.path, body.method, args)
        .then((report) => res.json(report))
        .catch((err: unknown) => {
          console.error('TestAuthRoutes: test-stage failed:', err);
          res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
        });
    });

    // ⭐ Purge what wire runs left (test-world-lifecycle D4): the wire
    // runner calls it when a run starts (a crashed run's leftovers) and
    // before it stops the world. Inside the world, because a kept world's
    // caches (bodies, the group cache, balances, the roster) would re-write
    // a delete made underneath them.
    app.post('/auth/test-purge', (req: Request, res: Response) => {
      if (TEST_AUTH_TOKEN && req.get('x-test-auth') !== TEST_AUTH_TOKEN) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }
      TestHooks.purgeLitter()
        .then((report) => res.json(report))
        .catch((err: unknown) => {
          console.error('TestAuthRoutes: test-purge failed:', err);
          res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
        });
    });

    // ⭐ Stage an outage (failure-model D8): the next N record reads or
    // writes fail as a lost connection would.
    app.post('/auth/test-datastore-fail', (req: Request, res: Response) => {
      if (TEST_AUTH_TOKEN && req.get('x-test-auth') !== TEST_AUTH_TOKEN) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }
      const calls = (req.body as { calls?: unknown } | undefined)?.calls ?? 1;
      if (typeof calls !== 'number' || !Number.isInteger(calls) || calls < 0) {
        res.status(400).json({ error: 'calls must be a whole number' });
        return;
      }
      try {
        res.json(TestHooks.failDatastore(calls));
      } catch (err) {
        console.error('TestAuthRoutes: test-datastore-fail failed:', err);
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      }
    });

    // ⭐ Refuse a character's saves, and save a batch (persistence-model D10).
    app.post('/auth/test-save-fail', (req: Request, res: Response) => {
      if (TEST_AUTH_TOKEN && req.get('x-test-auth') !== TEST_AUTH_TOKEN) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }
      const body = (req.body ?? {}) as { name?: unknown; on?: unknown };
      if (typeof body.name !== 'string' || typeof body.on !== 'boolean') {
        res.status(400).json({ error: 'name (a string) and on (a boolean) are required' });
        return;
      }
      TestHooks.failSavesOf(body.name, body.on)
        .then((r) => res.json(r))
        .catch((err: unknown) => {
          console.error('TestAuthRoutes: test-save-fail failed:', err);
          res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
        });
    });
    app.post('/auth/test-save', (req: Request, res: Response) => {
      if (TEST_AUTH_TOKEN && req.get('x-test-auth') !== TEST_AUTH_TOKEN) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }
      const names = (req.body as { names?: unknown } | undefined)?.names;
      if (!Array.isArray(names) || !names.every((n) => typeof n === 'string')) {
        res.status(400).json({ error: 'names must be a list of names' });
        return;
      }
      TestHooks.saveBatch(names as string[])
        .then((r) => res.json(r))
        .catch((err: unknown) => {
          console.error('TestAuthRoutes: test-save failed:', err);
          res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
        });
    });

    // ⭐ Force a bad row past its validator (failure-model D6) — what the
    // drive needs to see a content error reach the player and its keeper.
    app.post('/auth/test-force-document', (req: Request, res: Response) => {
      if (TEST_AUTH_TOKEN && req.get('x-test-auth') !== TEST_AUTH_TOKEN) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }
      const body = req.body as { path?: unknown; kind?: unknown; data?: unknown } | undefined;
      if (typeof body?.path !== 'string' || typeof body.kind !== 'string' || typeof body.data !== 'object' || body.data === null) {
        res.status(400).json({ error: 'test-force-document wants {path, kind, data: {}}' });
        return;
      }
      TestHooks.forceDocument(body.path, body.kind, body.data as Record<string, unknown>)
        .then((report) => res.json(report))
        .catch((err: unknown) => {
          console.error('TestAuthRoutes: test-force-document failed:', err);
          res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
        });
    });

    // ⭐ A test character arrives as a newcomer does — the Arrival Note's
    // coin in hand (a walk's real cash, where `reserve override` is only
    // ledger money the till rightly refuses to pay out).
    app.post('/auth/test-arrive', (req: Request, res: Response) => {
      if (TEST_AUTH_TOKEN && req.get('x-test-auth') !== TEST_AUTH_TOKEN) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }
      const handle = (req.body as { handle?: unknown } | undefined)?.handle;
      if (typeof handle !== 'string' || handle === '') {
        res.status(400).json({ error: 'handle must be a string' });
        return;
      }
      TestHooks.arriveCharacter(handle)
        .then((result) => res.json(result))
        .catch((err: unknown) => {
          console.error('TestAuthRoutes: test-arrive failed:', err);
          res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
        });
    });

    // ⭐ A test character handed a thing (a drive's setup: a winter coat to
    // wear, an ore to smelt) — by name, not dropped from the founder's hands.
    app.post('/auth/test-hand', (req: Request, res: Response) => {
      if (TEST_AUTH_TOKEN && req.get('x-test-auth') !== TEST_AUTH_TOKEN) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }
      const body = req.body as { handle?: unknown; template?: unknown; data?: unknown } | undefined;
      if (typeof body?.handle !== 'string' || body.handle === '' || typeof body.template !== 'string') {
        res.status(400).json({ error: 'handle and template must be strings' });
        return;
      }
      const data = body.data;
      if (data !== undefined && (typeof data !== 'object' || data === null || Array.isArray(data))) {
        res.status(400).json({ error: 'data, when given, must be an object' });
        return;
      }
      TestHooks.handCharacter(body.handle, body.template, data as Record<string, unknown> | undefined)
        .then((id) => res.json({ id }))
        .catch((err: unknown) => {
          console.error('TestAuthRoutes: test-hand failed:', err);
          res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
        });
    });

    console.warn(
      'TestAuthRoutes: ⚠  /auth/test-login, /auth/test-clock, /auth/test-weather, ' +
        '/auth/test-ship, /auth/test-stage, /auth/test-nourish, /auth/test-arrive and /auth/test-hand are MOUNTED (test seams). Never in production.'
    );
  }
}
