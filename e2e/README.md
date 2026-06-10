# E2E tests (Playwright)

Browser end-to-end tests for the Saxonberg client. The browser drives
the **client** (`:5173` in dev); the client talks to the **server**
(`:2010`). Authentication uses the **test-auth seam** rather than real
Google OAuth.

## Prerequisites

Playwright's `webServer` config boots the stack for you (the server in
`AUTH_MODE=test` + the client) and waits for it. So you only need:

1. **MongoDB** reachable — the server reads `MONGODB_URI` from
   `packages/server/.env` (the running app needs a DB, unlike the unit
   tests).
2. **Browsers** installed once: `pnpm --filter @saxonberg/e2e install:browsers`.

Locally an already-running stack is **reused** (`reuseExistingServer`),
so if you have `pnpm dev` up it'll be used as-is — but it must be in
`AUTH_MODE=test` (otherwise `/auth/test-login` 404s). If nothing's
running, Playwright starts a fresh test-mode server + client itself.

## Run

```bash
pnpm --filter @saxonberg/e2e test          # boots the stack, runs headless
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

## CI

Wired as the `e2e` stage in `.gitlab-ci.yml` (default branch only — it's
heavy). It runs in the official `mcr.microsoft.com/playwright` image
(browsers preinstalled), with a job-scoped `mongo:7` service as the DB.
`webServer` boots the test-mode server + client; the suite runs; trace +
HTML report upload as artifacts on failure. Everything is ephemeral —
`mongodb://mongo:27017` and the session secret guard nothing real, so no
secrets are involved (Param Store is only for the live instance).

Note: the CI run uses the **dev** client, so React StrictMode opens two
WebSocket connections — handled gracefully now (the avatar clone is
shared), but it logs a non-fatal `DestroyedObjectError` during the
duplicate connection's teardown. Tests stay green. Switching the e2e
client to a production build (`vite preview`) would avoid the
double-connect entirely — a follow-up.

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

Three specs, **passing** against a live stack: `auth.spec.ts` (login
screen for fresh visitors) and `smoke.spec.ts` (authenticated visitor
lands in the cockpit + a `look` command round-trips and renders the
spawn room). A smoke suite — it proves the harness and the critical
path, not broad feature coverage; grow from here.
