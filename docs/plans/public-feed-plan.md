# Public feed — implementation plan

Phase 2 for
[public-feed-requirements.md](../requirements/public-feed-requirements.md).
This plan says **how**; the requirements say what and why and are not
re-litigated here.

Four waves, strictly sequential — each is independently green, and the
first two are invisible to players, which is the point: the model
correction lands and settles before anything anonymous can read it.

| wave | what | visible to a player? |
|---|---|---|
| 1 | publisher + visibility on the model | no |
| 2 | the anonymous read path | no (no consumer yet) |
| 3 | the start-screen surface | **yes — the deliverable** |
| 4 | docs + slate reconciliation | no |

---

## 0. The three decisions the requirements left to the plan

### 0.1 Where effective visibility resolves — the logic, not the Document

`Bulletin` is documented as *"plain getters (the inter-Stuff methods-only
rule); no derivation math"*, and resolving effective visibility means
consulting the publisher table. Putting that on the Document would drag
the registry into a persistence class.

**So the clamp lives in `BulletinLogic`, module-private, and nothing
outside it ever sees an unresolved visibility.** The Api exposes a single
already-filtered read (`publicWindow`) rather than a public
`isPublic(bulletin)` predicate — no caller can hold the pieces and
combine them wrongly, because no caller ever holds the pieces.

```
effective(b) = max_restrictive( publisherOf(b).visibility, b.visibility ?? publisherOf(b).visibility )
```

With a two-value ordering (`public` < `members`), that is a `Math.max`
over an ordinal — total, no branches, and monotone in the direction the
invariant demands. A row claiming `public` under a `members` publisher
resolves to `members`; the reverse narrows as intended.

### 0.2 `publisher` is stamped by the logic, never author-supplied

`PublishRequest` gains **`visibility` only**. The publisher is derived
inside `BulletinLogic.publish`, exactly as `author` already is (the
gated-API actor-from-context rule). With one publisher the derivation is
the constant `'compact'`; when Wave 2's press build makes publishers
plural, the derivation becomes a real resolution from the acting
principal and **no call site changes**.

This also closes a spoofing hole before it exists: no request body can
ever name the mark it publishes under.

### 0.3 `visibility` is nullable, and `null` means inherit

`visibility: BulletinVisibility | null = null` on the Document. `null` is
the inherit sentinel; an explicit value is the narrowing override. The
alternative — `''` as a sentinel, following `author: string = ''` — was
rejected because it makes the type a lie and forces every read site to
re-validate. `ParcelRecord.allowance: unknown | null = null` is the
precedent for a nullable persistent field.

Legacy rows carry neither field. `PersistentHydrator` leaves absent
fields at their class defaults, so an existing row loads as
`publisher = 'compact'`, `visibility = null` → effective `public`. **This
is why AC 8 needs no migration script**, and it is also why the deploy
step in §5 is not optional.

---

## 1. Wave 1 — publisher and visibility on the model

### New

- **`lib/bulletin/Publisher.ts`** — the publisher registry. One concept,
  one module (the "Named value-object / vocabulary / registry" category):
  - `BulletinPublisher = 'compact'` + `BULLETIN_PUBLISHERS` (the
    validation array, matching the `BULLETIN_REALMS` shape);
  - `BulletinVisibility = 'public' | 'members'` +
    `BULLETIN_VISIBILITIES`;
  - `PublisherRecord = { key, displayName, visibility }` and the authored
    `PUBLISHERS: Record<BulletinPublisher, PublisherRecord>` — one row:
    `compact` / *"the Compact"* / `public`.

  Pure value construction at module scope, which the module-scope rule
  explicitly permits. Exports are types + constants only — no helper
  functions (the resolution lives in the logic per §0.1).

### Modified

- **`lib/bulletin/Bulletin.ts`** — two persistent fields with class
  defaults (`publisher = 'compact'`, `visibility = null`), their
  `fieldMeta` entries, and two plain getters. The file header's storage
  shape comment gains both. **`realm`'s doc comment is corrected** to say
  it is framing only and is consulted for neither authority nor
  visibility — the requirements' central model point, recorded where
  someone will actually read it.
- **`api/bulletin.ts`** — `PublishRequest` and `BulletinPatch` gain
  optional `visibility`. Re-export the two new types alongside
  `BulletinRealm`/`BulletinKind`.
- **`obj/api/BulletinLogic.ts`** — `publishImpl` stamps `publisher` and
  accepts `visibility`; `editImpl` accepts `visibility` in the patch. Add
  the module-private `effectiveVisibilityImpl` from §0.1.
- **`cmd/system/bulletin.yaml`** + **`obj/command/system/BulletinController.ts`**
  — an optional `--visibility <public|members>` option on `post` and
  `edit`, validated against `BULLETIN_VISIBILITIES`. The narrowing has to
  be reachable from the verb or it is a field nobody can set.

### Order

`Publisher.ts` → `Bulletin.ts` → logic → Api → verb. Types first so each
step compiles.

### Tests

`lib/bulletin/__tests__/` — the clamp table (all four
publisher×post combinations, asserting the two that must narrow and the
one that must *not* widen), and a hydration test proving a row persisted
without either field loads as `compact`/`public` (AC 8).

### Risk — low, with one sharp edge

The clamp is four lines and fully table-testable. The sharp edge is
**AC 5 is a security property, not a feature**: if the ordering is
inverted the public route serves members-only posts to the world. The
test must assert the *failure* direction explicitly (`members` publisher
+ `public` post → `members`), not just that narrowing works.

---

## 2. Wave 2 — the anonymous read path

### New

- **`PublicBulletinRow`** in `packages/types/src/index.ts` — a **distinct
  interface, not a `Pick<BulletinRow>` and not an extension**. Structural
  sharing is exactly how a field leaks later; the requirements ask for
  widening to be a deliberate edit, and two independent declarations
  deliver that. Carries `bulletinId`, `publisher`, `realm`, `kind`,
  `headline`, `body`, `publishedAt`, `pinned`. **No `author`, no
  `expiresAt`** (an expiry is operational metadata, not front-page
  content).
- **`BulletinApi.publicWindow(limit?)`** → `Bulletin[]` and
  **`BulletinApi.toPublicRow(b)`** → `PublicBulletinRow`, both thin
  forwards to logic impls. `publicWindowImpl` = `board().recentWindow()`
  → filter by effective visibility → slice. One in-memory pass over an
  already-warm cache; `BulletinBoard` is untouched.
- **`GET /api/bulletins/public`** in `backend/BulletinRoutes.ts`.

### The route's contract, precisely

- **No `requireAuth`.** `AuthMiddleware.requireAuthApi` is applied
  per-route, never app-wide, so omitting it is sufficient — verified.
- **The handler reads no session.** It must not touch `req.user`,
  `req.session`, or any cookie. `express-session` still runs app-wide and
  will hand it an anonymous session; the handler ignores it.
- **`limit` only, clamped.** A non-numeric or absent `limit` falls back
  to the configured window length.
- **`before` is a 400, not an ignore.** AC 3, and the reason is stated in
  the requirements: "window, not archive" has to be enforced, because a
  silently-ignored cursor is the exact shape of a future accidental
  widening. The error body uses the existing `sendError` helper.
- Registered in `setup()` beside the archive route, before the SPA
  catch-all (already the case for the file as a whole).

### Order

Wire type → logic impls → Api forwards → route. The route lands last so
nothing is reachable before the filter it depends on exists.

### Tests

- `backend/__tests__/` — anonymous request (no cookie) gets `200` and
  rows; a `members`-narrowed post is **absent** from the public response
  and **present** in the authenticated archive (the same assertion pair,
  one test, which is what makes it meaningful); `before` → `400`.
- A projection test asserting `toPublicRow`'s exact key set — AC 4 says
  "asserted directly, so a future field addition cannot leak silently,"
  so this compares `Object.keys` against a frozen list rather than
  spot-checking `author === undefined`.

### Risk — the CORS assumption, and it is worth stating

App-wide CORS is `cors({ origin: CLIENT_URL || 'http://localhost:5173',
credentials: true })`. That covers both target cases: production is
same-origin (the server serves the client), and dev is 5173→2010 which
matches the default. **No CORS change is needed and none should be
made.** If the marketing site ever consumes this route, that widening is
its own decision — a single-origin `credentials: true` policy cannot
simply have an origin appended without thinking about the credentialed
routes it also governs.

Second, smaller: the public route is unauthenticated on an underpowered
box. Serving from the warm cache with no paging (§0, and the requirements'
decision) is the mitigation — the endpoint's worst case is one array
filter. No rate limiter is added; if one is ever needed it belongs in
front of the whole app, not on this route.

---

## 3. Wave 3 — the start screen

### New

- **`components/PublicFeed.tsx`** — self-contained. `StartScreen.tsx` is
  already 256 lines and its job is auth; the feed is a guest of it.
  - Fetches `${SERVER_URL}/api/bulletins/public` with
    **`credentials: 'omit'`** — explicit, because every other client
    fetch in the codebase uses `'include'` and a copied idiom would send
    cookies to a route defined as not reading them.
  - `AbortController` on unmount. **One attempt, no retry, no polling** —
    a start screen that keeps hammering a down server is the failure mode
    the requirements' graceful-degradation clause exists to prevent.
  - Three terminal states per the requirements: rows / empty line /
    render nothing. The error state renders `null`, never a message.
  - MML through `MmlRenderer` with **no-op `onCommandClick` and
    `onCommandPreview`**. See the risk below — this is the whole
    mitigation.

### Modified

- **`components/StartScreen.tsx`** — compose `<PublicFeed />` below the
  existing action panel. The feed's loading state must not be awaited or
  gated on: sign-in and Play-as-guest render on first paint regardless
  (AC 6).
- **`components/NewsTickerPane.tsx:242`** — the in-passing fix. The
  "Load older" fetch is relative (`/api/bulletins/archive?…`) and there is
  no Vite dev proxy (`vite.config.ts` has `server: { port: 5173 }` and
  nothing else), so in development it hits the Vite origin and fails.
  Change to `${SERVER_URL}/…` with `credentials: 'include'`, matching
  every other authenticated client fetch. Pre-existing bug, one line,
  same subsystem — AC 9.

### Order

`PublicFeed.tsx` standalone (renderable against a stubbed fetch) →
compose into `StartScreen` → the `NewsTickerPane` fix last, independent
of the rest.

### Risk — MML clickables on a pre-auth surface

**This is the wave's real risk.** `MmlRenderer` resolves identity tags
through `useStore.getState().stuffRegistry` and routes clicks to a
command bus. On the start screen the registry is empty and there is no
connection, so an authored `<exit>`, `<item>` or `<link href="mudcmd:…">`
in a bulletin body would render as a clickable that dispatches into
nothing.

**Mitigation: the no-op handler pair.** `onCommandClick` and
`onCommandPreview` are required props supplied by the parent, so passing
no-ops means the renderer computes a command string and hands it to a
function that discards it. Nothing reaches the bus, and the spans still
paint with correct theme treatment.

Two residuals, both accepted and both low:

1. Clickables *look* clickable but do nothing. Acceptable — operator
   bulletins are prose and formatting, not stuff-bound tags, and a
   visitor has no way to know what a hover should have done. If it ever
   grates, the fix is a styling prop on the renderer, not a parser
   change.
2. `flashGhost` is reachable from the renderer's copy affordance
   (`MmlRenderer.tsx:179`). It is a store call, safe with no connection;
   worst case the ghost line flashes on a screen that does not display
   it. No action.

**What this wave cannot be verified by:** the suite. AC 15 is a live
check, and it is the acceptance criterion this build most depends on —
green component tests over a stubbed fetch say nothing about whether an
anonymous browser hitting a real server sees a real post.

---

## 4. Wave 4 — docs and slate reconciliation

Not a cleanup wave. The doctrine change is the most durable thing this
cycle produces, and leaving a superseded state-newsroom design sitting in
the backlog is how it comes back.

- **`docs/subsystems/bulletin.md`** — expanded (never a new doc; it owns
  this subsystem). New material: the publisher axis and why `publisher`
  is stamped not supplied; the visibility rule, the clamp, and the
  narrow-never-widen invariant; the public route, its anonymous contract,
  and why it has no paging; the start-screen surface; and the correction
  that `realm` carries framing **only**. The § *Non-goals (v1)* line
  *"a diegetic in-world gazette can ride later as a consumer"* is
  rewritten — under the new doctrine there is no state gazette to ride.
- **`docs/slates/builds/gazette-slate.md`** — Wave 0 marked shipped;
  **Wave 1 struck and replaced** by the aggregator doctrine, with the
  three reasons from the requirements carried over so the reversal is
  legible to whoever reads it next; Wave 2 left pointing at press-slate.
  The § *Open questions* answered by this cycle are resolved in place.
- **`docs/slates/builds/press-slate.md`** — a short recorded delta: the
  state aggregates and never publishes; `publisher` and visibility
  already exist when the press build starts, so `/feed/<publisher>/`
  is an extension rather than a migration.

Slate *retention* (keep vs retire) is a finalize-phase call per
`docs/workflow.md`, not this plan's.

---

## 5. The deploy step that is not optional

⚠ **Existing bulletins become world-readable the moment Wave 2's route is
live**, because they inherit `compact`/`public` (§0.3). That is the
intended semantics, but it is a one-way door on content nobody wrote with
an anonymous audience in mind.

Before the public route is exposed on the live box:

1. Read the `bulletins` collection and review every non-retracted row.
2. Retract or narrow (`--visibility members`) anything that should not be
   public — in particular any `world`-realm row, since the old model
   assumed `world` was auth-only.
3. Only then deploy.

This is a runbook step, not a code path, and it belongs in the MR
description.

---

## 6. Cross-cutting risk register

| risk | wave | severity | mitigation |
|---|---|---|---|
| visibility ordering inverted → members-only posts served publicly | 1 | **high** | the clamp table asserts the non-widening direction explicitly, not just narrowing |
| the public projection gains a field later and leaks it | 2 | **high** | `PublicBulletinRow` is a standalone interface; the projection test compares a frozen key set |
| legacy rows made public without review | 2/deploy | **high** | §5, and it is a deploy gate rather than a hope |
| `before` silently ignored → paging widens later | 2 | medium | 400, tested |
| CORS quietly widened to serve the marketing site | 2 | medium | explicitly out of scope; the credentialed-routes reason is recorded above |
| MML clickables dead on the start screen | 3 | low | no-op handler pair; residuals accepted above |
| feed fetch blocks or breaks the auth controls | 3 | medium | fire-and-forget, no await, error → `null`; AC 6 tests all three states |
| doctrine reversal lost, herald design resurfaces | 4 | medium | Wave 1 struck in the slate itself with reasons, not just in a retired requirements doc |

## 7. Test strategy

Colocated `__tests__/`, Vitest, per AC 10.

- **Unit, server** — the clamp table (Wave 1); legacy-row hydration
  defaults; `toPublicRow` key set.
- **Route** — anonymous access; the members-excluded/archive-included
  pair; `before` → 400.
- **Client** — `PublicFeed` over a stubbed fetch in its three states;
  `StartScreen` renders auth controls with the feed failing.
- **Live, and it is the one that counts** — AC 15: a signed-out browser
  against a running server, reading a real post; then the empty and
  server-down states. Green units here genuinely do not imply a working
  front door.

## 8. Definition of done

`pnpm lint`, `pnpm lint:imports`, `pnpm lint:module-scope`,
`pnpm lint:gates`, `pnpm build`, `pnpm test` all pass; the 15 acceptance
criteria in the requirements are checkable; §5 is in the MR description.
