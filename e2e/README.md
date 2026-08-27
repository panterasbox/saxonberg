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

## Cleanup — the suite removes what it mints

Every test mints its **own** avatar (see *How auth works*), which is
what makes the suite parallel-safe. `global-teardown.ts` removes them
again, so a run leaves the world as it found it.

Two passes, because a crashed run never reaches its teardown:

1. **This run's handles** — `mintSession` records each one to
   `.auth/minted-handles.log` as it mints. Exact, and safe when two
   people run the suite at once.
2. **A stale sweep** — any `e2e-` character older than two hours,
   collecting orphans from runs that were killed.

The deletion itself lives in
`packages/server/scripts/purge-test-characters.ts`, **not** in a backend
route: `docs/antipatterns.md § A test-only capability added to the
BACKEND` ends its ladder with *put it in the harness, not in three
layers of production code*. The harness decides *when*; the server
script owns *how*, because the collection vocabulary and the
`users`↔`google_profiles` join are its schema. `e2e/` gains no database
dependency.

Run it by hand when a world needs clearing:

```bash
cd packages/server
npx tsx scripts/purge-test-characters.ts --dry-run --all   # look first
npx tsx scripts/purge-test-characters.ts --all
```

⚠ **A character is only purgeable if its handle starts `e2e-` AND its
email ends `@e2e.local`.** Both are needed because of `founder`: the
config points `FOUNDER_GOOGLE_EMAIL` at `founder@e2e.local` to give one
session real in-world authority, so it carries the synthetic email but
not the handle. Anything failing either rule is refused out loud, even
when named explicitly.

⚠ Teardown never fails a run. A cleanup that turned a green suite red
because Mongo blinked would be worse than the litter.

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
(ephemeral in CI) + the fixed seed set. A freshly-created test avatar
spawns in the lounge Warren (`startLocation: /world/lounge/idea/warren`), so
single-avatar specs assert on that room's stable identity label ("the
lounge"), not its flavor prose.

**Lounge churn & the spawn override.** The lounge is an *elastic Warren*
that buds new rooms under occupant pressure. Against a **fresh** Mongo
(CI's ephemeral `mongo:7`) this is harmless. Against a **persistent**
local DB, however, linkdead avatars from earlier runs pile up and bud the
lounge into a sprawling graph that no exit-walk can reliably cross — so a
naïve "walk to a shared room" co-location strategy is flaky there. Two
mitigations:

- **The test-auth spawn override** (the durable fix). `POST
  /auth/test-login` accepts an optional `startLocation` (a template path)
  that pins where the provisioned avatar spawns — see
  `TestAuthRoutes` → `Application.provisionTestCharacter`. Tests that need
  a *known* or *shared* room use it to bypass the Warren entirely:
  `multiplayer.spec.ts` pins both avatars to Dave's Bar (a stable
  singleton, `/world/lounge/location/bar`) so they spawn already co-located, and
  `commands.spec.ts`'s movement test pins to the bar then walks `south`
  to the lounge. These specs are therefore immune to lounge churn.
- **Resetting locally.** Most specs are single-avatar or client-only and
  don't care about churn. If you do hit a churn-sensitive failure on a
  hammered local DB, restart the server (a boot reseeds the world and
  drops the budded satellites).

## Status

Eleven specs, **passing** against a live stack — a fresh-Mongo run is a
clean sweep. Coverage:

- `auth.spec.ts` / `guest.spec.ts` — the login screen for fresh visitors
  and the anonymous play-as-guest path.
- `smoke.spec.ts` — authenticated visitor lands in the cockpit; a `look`
  round-trips and renders the spawn room.
- `chargen.spec.ts` — the full new-player creation flow → spawn.
- `commands.spec.ts` — `say` / `smile` / `inventory` / movement / parse
  errors.
- `comms.spec.ts` — `whisper` (self-loop), `shout`, freeform `emote`.
- `selfview.spec.ts` — the `score` / `standing` / `chronicle` / `traits`
  self-views over the standing/chronicle/trait substrates.
- `help.spec.ts` — the `help` rulebook index + `help <verb>` topics.
- `cockpit.spec.ts` — input-clear-on-submit + command-history walking.
- `views.spec.ts` — the Views-menu layout switch (`layout` verb), its
  ghost-line preview, and the tab-strip filter drawer.
- `tabs.spec.ts` — the create/rename/delete tab lifecycle.
- `panes.spec.ts` / `inspect.spec.ts` — the Settings pane, the Who's
  Online pane, and the Inspection pane (current-room paint + Inspect ↔
  Who's Online toggle).
- `social.spec.ts` — the Social/Notifications pane + its ghost-line
  command previews.
- `multiplayer.spec.ts` — a spoken line crossing two independent sessions
  in one room (co-located via the spawn override).

Note for local iteration: the dev server runs under `tsx` watch, so
editing any file under `packages/server/src/**` (including `*.test.ts`)
reloads it — **don't edit server source while an E2E run is in flight**,
or in-flight tests will see a mid-run disconnect. The first spec right
after a cold boot can also be slow (world bootstrap still settling); the
configured retry absorbs that as a one-off "flaky", not a failure.
