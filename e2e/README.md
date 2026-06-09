# E2E tests (Playwright)

Browser end-to-end tests for the Saxonberg client. The browser drives
the **client** (`:5173` in dev); the client talks to the **server**
(`:2010`). Authentication uses the **test-auth seam** rather than real
Google OAuth.

## Prerequisites

1. **MongoDB** reachable (the running app needs it, unlike the unit tests).
2. **Server** running with the test-auth seam enabled:
   ```bash
   AUTH_MODE=test MONGODB_URI=... pnpm dev:server
   ```
   (Optionally set `TEST_AUTH_TOKEN` and pass the same value to the
   tests via the env below.)
3. **Client** running: `pnpm dev:client`.
4. **Browsers** installed once: `pnpm --filter @saxonberg/e2e install:browsers`.

## Run

```bash
pnpm --filter @saxonberg/e2e test          # headless
pnpm --filter @saxonberg/e2e test:headed   # watch it drive a browser
pnpm --filter @saxonberg/e2e test:ui       # interactive UI mode
pnpm --filter @saxonberg/e2e report        # open the last HTML report
```

Env overrides: `E2E_CLIENT_URL` (default `http://localhost:5173`),
`E2E_SERVER_URL` (default `http://localhost:2010`), `TEST_AUTH_TOKEN`.

## How auth works

`global-setup.ts` does `POST {server}/auth/test-login` once, capturing
the `:2010` session cookie into `.auth/default.json`, which the config
loads as the default `storageState`. Every test then starts already
logged in. The un-authenticated path (`tests/auth.spec.ts`) overrides
that with an empty storageState to visit as a fresh visitor.

The seam is server-side and gated on `AUTH_MODE=test` (see
`packages/server/src/services/auth/TestAuthRoutes.ts`); production never
sets that flag, so the route doesn't exist there.

## CI (planned)

A separate `e2e` CI stage will: start a `mongo` service, boot the
server (with `AUTH_MODE=test`) + client + a seeded world, run Playwright
in the official `mcr.microsoft.com/playwright` image, and upload the
trace + HTML report as artifacts on failure. Kept out of the fast
`validate` stage. See `docs/deployment.md`.

## Deterministic world

E2E runs against a deterministic world by construction: a fresh Mongo
(ephemeral in CI) + the fixed seed set + the Avatar seed's pinned
`container: /domain/eternal/duncan-hall/lobby` means a freshly-created
test avatar always spawns in the seeded Duncan Hall lobby. The
round-trip test asserts on that room's stable identity label, not its
flavor prose. (Follow-up, best done against a live stack so it can be
verified green: a dedicated, test-owned spawn room + a test-mode
`container` override, to fully insulate E2E from campus content churn.)

## Status

`smoke.spec.ts` (cockpit loads + `look` round-trip) and `auth.spec.ts`
(login screen for fresh visitors) are live. They parse and are
discovered by `playwright test --list`, but have **not yet been run
green** — that needs the full stack (Mongo + server in test mode +
client) and installed browsers. First green run is the next step when a
stack is available.
