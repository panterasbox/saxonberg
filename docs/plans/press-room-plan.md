# Press room — implementation plan

Phase 2 for
[press-room-requirements.md](../requirements/press-room-requirements.md).
This plan says **how**; the requirements say what and why and are not
re-litigated here.

Four waves, strictly sequential — each independently green, and the first
two are invisible to players, which is the point: the model correction
lands and settles before anything anonymous can read it.

| wave | what | visible to a player? |
|---|---|---|
| 1 | the publisher registry: entitlement, realm, visibility | no |
| 2 | the anonymous read path | no (no consumer yet) |
| 3 | the start-screen press room | **yes — the deliverable** |
| 4 | docs + slate reconciliation | no |

---

## 0. The four decisions the requirements left to the plan

### 0.1 The publisher registry is data; the resolution is logic

`lib/bulletin/Publisher.ts` holds an authored record per publisher —
`{ key, displayName, realm, visibility, authority }` — where `authority`
is a **tag**, not a function:

```
compact   → { realm: 'ooc',   visibility: 'public', authority: { kind: 'author' } }
executive → { realm: 'world', visibility: 'public',
              authority: { kind: 'office', office: 'prime-minister' } }
```

Keeping authority as a tag is what lets the registry stay types +
constants (the export-discipline rule — no free-floating helper
functions) while `BulletinLogic` owns the dispatch: `author` →
`AccessApi.isAuthor`, `office` → `CompactApi.holdsOffice`. A third
authority kind later (a committee appointment, per the requirements'
note on editorship) is one tag and one branch.

### 0.2 Where effective visibility resolves — the logic, not the Document

`Bulletin` is documented as *"plain getters; no derivation math"*, and
resolving effective visibility means consulting the registry. Putting
that on the Document drags the registry into a persistence class.

**So the clamp lives in `BulletinLogic`, module-private, and nothing
outside it ever sees an unresolved visibility.** The Api exposes a single
already-filtered read rather than a public `isPublic(b)` predicate — no
caller can hold the pieces and combine them wrongly, because no caller
ever holds the pieces.

```
effective(b) = max_restrictive( publisherOf(b).visibility,
                                b.visibility ?? publisherOf(b).visibility )
```

With a two-value ordering (`public` < `members`) that is a max over an
ordinal — total, no branches, monotone in the direction the invariant
demands. A row claiming `public` under a `members` publisher resolves to
`members`; the reverse narrows as intended.

### 0.3 `visibility` is nullable; `realm` is stamped

`visibility: BulletinVisibility | null = null` on the Document — `null` is
the inherit sentinel, an explicit value is the narrowing override. The
`''`-sentinel alternative (following `author: string = ''`) was rejected
because it makes the type a lie and forces every read site to
re-validate; `ParcelRecord.allowance: unknown | null = null` is the
nullable-persistent-field precedent.

`realm` stays a stored field but leaves `PublishRequest` /
`BulletinPatch`: `publishImpl` stamps it from the publisher record. Its
existing index, archive filters and client chip are all unaffected — only
the write path narrows.

Legacy rows carry none of the new fields. `PersistentHydrator` leaves
absent fields at their class defaults, so an existing row loads as
`publisher = 'compact'`, `visibility = null` → effective `public`, and its
already-stored `realm` is untouched. **This is why AC 11 needs no
migration script**, and why the deploy gate in §5 is not optional.

### 0.4 Refusal is total, and it is the whole security property

AC 6 says an unentitled publish "never falls back to a publisher the
caller *is* entitled to." Concretely: `publishImpl` resolves entitlement
**before** it mints or persists anything, and an unentitled request
throws — no partial write, no downgrade, no silent substitution.

The dangerous shape is a helper that "picks the best publisher for this
caller," so **no such helper exists**. The only entitlement function in
the build answers `may this principal publish as THIS publisher?` and
returns a boolean.

---

## 1. Wave 1 — the publisher registry

### New

- **`lib/bulletin/Publisher.ts`** — one concept, one module (the "Named
  value-object / vocabulary / registry" category):
  - `BulletinPublisher = 'compact' | 'executive'` + `BULLETIN_PUBLISHERS`
    (the validation array, matching the `BULLETIN_REALMS` shape);
  - `BulletinVisibility = 'public' | 'members'` + `BULLETIN_VISIBILITIES`;
  - `PublisherAuthority` — the tagged union from §0.1;
  - `PublisherRecord` and the authored
    `PUBLISHERS: Record<BulletinPublisher, PublisherRecord>`.

  Pure value construction at module scope, which the module-scope rule
  explicitly permits. Exports are types + constants only.

### Modified

- **`lib/bulletin/Bulletin.ts`** — three persistent fields with class
  defaults (`publisher = 'compact'`, `visibility = null`, `source = ''`),
  their `fieldMeta` entries, and plain getters. `BulletinKind` gains
  `repost`; `BULLETIN_KINDS` gains the entry. The header's storage-shape
  comment gains all three, and **`realm`'s comment is corrected** to say
  it is stamped from the publisher and carries framing only — the
  requirements' central model point, recorded where someone will read it.
- **`api/bulletin.ts`** — `PublishRequest` gains required `publisher` and
  optional `visibility` / `source`; **`realm` is removed** from both
  `PublishRequest` and `BulletinPatch`. Re-export the new types.
- **`obj/api/BulletinLogic.ts`** — the entitlement check (§0.1, §0.4);
  `publishImpl` stamps `publisher` + `realm` and accepts
  `visibility`/`source`; `editImpl` accepts `visibility`/`source`; the
  module-private `effectiveVisibilityImpl` from §0.2.
- **`cmd/system/bulletin.yaml`** + **`obj/command/system/BulletinController.ts`**
  — `--as <publisher>` (defaulting to `compact`), `--visibility
  <public|members>`, `--source <text>`; **the `realm` option is removed**.
  Each validated against its vocabulary. Refusals ride the dispatch
  envelope (`ctx.note`), not an exception to the player.

### Order

`Publisher.ts` → `Bulletin.ts` → logic → Api → verb. Types first so each
step compiles.

### Tests

`lib/bulletin/__tests__/` and `obj/api/__tests__/`:

- the clamp table — all publisher×release visibility combinations,
  asserting the two that narrow **and the one that must not widen**;
- the entitlement matrix — author→`compact` allowed, author→`executive`
  refused, office-holder→`executive` allowed, and **a refusal writes
  nothing** (assert the collection is unchanged, not just that it threw);
- realm stamping — a caller cannot influence it;
- hydration — a row persisted without the new fields loads as
  `compact`/`public` (AC 11).

### Risk — the two high-severity ones both live here

**AC 5 and AC 6 are security properties, not features.** An inverted
visibility ordering serves members-only releases to the world; a lenient
entitlement check lets an author speak as the Prime Minister. Both tests
must assert the **failure** direction explicitly, not merely that the
happy path works.

Secondary: **`CompactApi.holdsOffice` fails closed** by design — a
missing `OfficeRegistry` means "we cannot prove this player holds
office", so it returns `false` (governance.md). In a unit test with no
registry, `executive` entitlement is therefore always denied. That is
correct behavior and the tests must **construct the registry** rather
than work around it, or the entitlement suite silently tests nothing.

---

## 2. Wave 2 — the anonymous read path

### New

- **`PressReleaseRow`** in `packages/types/src/index.ts` — a **standalone
  interface, not `Pick<BulletinRow>` and not an extension**. Structural
  sharing is exactly how a field leaks later; two independent
  declarations make widening a deliberate edit. Carries `bulletinId`,
  `publisher`, `publisherLabel`, `realm`, `kind`, `source`, `headline`,
  `body`, `publishedAt`, `pinned`. **No `author`, no `expiresAt`** — an
  expiry is operational metadata, not press-room content.
  `publisherLabel` ships the registry's `displayName` so an anonymous
  client needs no publisher table of its own.
- **`BulletinApi.pressRoom(limit?)`** → `Bulletin[]` and
  **`BulletinApi.toPressReleaseRow(b)`**, thin forwards to logic impls.
  `pressRoomImpl` = `board().recentWindow()` → filter by effective
  visibility → slice. One in-memory pass over an already-warm cache;
  `BulletinBoard` is untouched.
- **`GET /api/press/releases`** in `backend/BulletinRoutes.ts`.

**On the route namespace:** the subsystem is `bulletin`, the product
surface is the press room, and the public contract takes the product
name. `BulletinRoutes` mounts both; the file header records the split so
the mismatch reads as deliberate rather than as drift.

### The route's contract, precisely

- **No `requireAuth`.** `AuthMiddleware.requireAuthApi` is applied
  per-route, never app-wide, so omitting it suffices — verified.
- **The handler reads no session** — not `req.user`, not `req.session`,
  no cookie. `express-session` still runs app-wide and hands it an
  anonymous session; the handler ignores it.
- **`limit` only, clamped.** Non-numeric or absent falls back to the
  configured window length.
- **`before` is a 400, not an ignore** (AC 3). A silently-ignored cursor
  is the exact shape of a future accidental widening. Uses the existing
  `sendError` helper.
- Registered beside the archive route, before the SPA catch-all.

### Order

Wire type → logic impls → Api forwards → route. The route lands last so
nothing is reachable before the filter it depends on exists.

### Tests

- `backend/__tests__/` — anonymous request (no cookie) → `200` with rows;
  a `members`-narrowed release **absent** from the press room and
  **present** in the authenticated archive (one test asserting both
  halves, which is what makes it meaningful); `before` → `400`.
- A projection test comparing `Object.keys(toPressReleaseRow(...))`
  against a **frozen list** — AC 4 requires that a future field addition
  cannot leak silently, which spot-checking `author === undefined` would
  not catch.

### Risk — the CORS assumption, stated so it is not quietly broken

App-wide CORS is `cors({ origin: CLIENT_URL || 'http://localhost:5173',
credentials: true })`. That covers both target cases: production is
same-origin (the server serves the client), dev is 5173→2010 which
matches the default. **No CORS change is needed and none should be
made.** If the marketing site ever consumes this route, that widening is
its own decision — a single-origin `credentials: true` policy cannot have
an origin appended without reasoning about the credentialed routes it
also governs.

Smaller: the route is unauthenticated on an underpowered box. Serving the
warm window with no paging is the mitigation — worst case is one array
filter. No rate limiter; if one is ever needed it belongs in front of the
whole app, not on this route.

---

## 3. Wave 3 — the start screen

### New

- **`components/PressRoom.tsx`** — self-contained. `StartScreen.tsx` is
  already 256 lines and its job is auth; the press room is a guest of it.
  - Fetches `${SERVER_URL}/api/press/releases` with
    **`credentials: 'omit'`** — explicit, because every other client
    fetch uses `'include'` and a copied idiom would send cookies to a
    route defined as not reading them.
  - `AbortController` on unmount. **One attempt, no retry, no polling** —
    a start screen hammering a down server is the failure mode the
    graceful-degradation clause exists to prevent.
  - Three terminal states: rows / an honest empty line / render `null`.
    The error state renders nothing — an anonymous visitor never sees an
    error string or a spinner that never resolves.
  - Rows show `publisherLabel` and, for `repost`, the `source` line.
  - MML through `MmlRenderer` with **no-op `onCommandClick` and
    `onCommandPreview`**. See the risk below — this is the mitigation.

### Modified

- **`components/StartScreen.tsx`** — compose `<PressRoom />` below the
  action panel. Its loading state must not be awaited or gated on:
  sign-in and Play-as-guest render on first paint regardless (AC 9).
- **`components/NewsTickerPane.tsx:242`** — the in-passing fix. "Load
  older" fetches relative (`/api/bulletins/archive?…`) and
  `vite.config.ts` has no proxy (`server: { port: 5173 }` and nothing
  else), so in development it hits the Vite origin and fails. Use
  `${SERVER_URL}/…` with `credentials: 'include'`, matching every other
  authenticated client fetch. Pre-existing, one line — AC 12.

### Order

`PressRoom.tsx` standalone against a stubbed fetch → compose into
`StartScreen` → the `NewsTickerPane` fix, independent of the rest.

### Risk — MML clickables on a pre-auth surface

**The wave's real risk.** `MmlRenderer` resolves identity tags through
`useStore.getState().stuffRegistry` and routes clicks to a command bus.
On the start screen the registry is empty and there is no connection, so
an authored `<exit>`, `<item>` or `<link href="mudcmd:…">` in a release
body would render as a clickable that dispatches into nothing.

**Mitigation: the no-op handler pair.** `onCommandClick` and
`onCommandPreview` are required props supplied by the parent, so no-ops
mean the renderer computes a command string and hands it to a function
that discards it. Nothing reaches the bus; spans still paint with correct
theme treatment.

Two residuals, both accepted:

1. Clickables *look* clickable but do nothing. Acceptable — press
   releases are prose and formatting, not stuff-bound tags, and a visitor
   cannot know what a hover should have done. If it grates, the fix is a
   styling prop on the renderer, not a parser change.
2. `flashGhost` is reachable from the renderer's copy affordance
   (`MmlRenderer.tsx:179`) — a store call, safe with no connection. Worst
   case the ghost line flashes on a screen that does not display it. No
   action.

**What this wave cannot be verified by:** the suite. AC 19 is a live
check and it is the criterion this build most depends on — green
component tests over a stubbed fetch say nothing about whether an
anonymous browser hitting a real server sees a real release.

---

## 4. Wave 4 — docs and slate reconciliation

Not a cleanup wave. The doctrine is the most durable thing this cycle
produces, and leaving a superseded state-newsroom design in the backlog
is how it comes back.

- **`docs/subsystems/bulletin.md`** — expanded (never a new doc; it owns
  this subsystem). New material: the press-room framing and the
  press-release form; the publisher registry, its two entries and the
  entitlement dispatch; the visibility clamp and the narrow-never-widen
  invariant; `realm` stamped rather than supplied; the `repost` kind and
  its `source` line; the public route, its anonymous contract and why it
  has no paging; the start-screen surface. The § *Non-goals (v1)* line
  *"a diegetic in-world gazette can ride later as a consumer"* is
  rewritten — under the new doctrine there is no state gazette to ride.
- **`docs/subsystems/governance.md`** — the Executive publisher recorded
  as the Office substrate's **second wired authority consumer**, in the
  § *Deferred* entry that currently reads "Authority consumption beyond
  the Governor". Note that it gates a **publisher**, not a verb, so the
  generic `requiresOffice` validator stays deferred to its own trigger.
- **`docs/slates/builds/gazette-slate.md`** — Wave 0 marked shipped;
  **Wave 1 struck and replaced** by the press-release doctrine with its
  three reasons carried over, so the reversal is legible to whoever reads
  it next; Wave 2 left pointing at press-slate; the § *Open questions*
  this cycle answered resolved in place.
- **`docs/slates/builds/press-slate.md`** — a recorded delta: the state
  issues press releases and never reports; `publisher`, entitlement and
  visibility already exist when the press build starts, so
  `/feed/<publisher>/` is an extension rather than a migration; and
  **editorship as a committee appointment** — the third appointment
  mechanism, alongside Office seats and `Government.seats` positions.

Slate *retention* (keep vs retire) is a finalize-phase call per
`docs/workflow.md`, not this plan's.

---

## 5. The deploy gate

⚠ **Existing bulletins become world-readable the moment Wave 2's route is
live**, because they inherit `compact`/`public` (§0.3). That is the
intended semantics, but it is a one-way door on content nobody wrote with
an anonymous audience in mind.

Before the route is exposed on the live box:

1. Read the `bulletins` collection and review every non-retracted row.
2. Retract or narrow (`--visibility members`) anything that should not be
   public — in particular any `world`-realm row, since the old model
   assumed `world` was auth-only.
3. Only then deploy.

A runbook step, not a code path. It belongs in the MR description.

---

## 6. Cross-cutting risk register

| risk | wave | severity | mitigation |
|---|---|---|---|
| visibility ordering inverted → members-only releases served publicly | 1 | **high** | the clamp table asserts the non-widening direction explicitly |
| entitlement too lenient → an author speaks as the Prime Minister | 1 | **high** | the entitlement matrix tests refusal, and asserts a refusal writes nothing |
| entitlement suite silently vacuous — `holdsOffice` fails closed with no registry | 1 | medium | tests construct the `OfficeRegistry` rather than working around it |
| legacy rows made public without review | 2/deploy | **high** | §5, a deploy gate rather than a hope |
| the public projection gains a field later and leaks it | 2 | **high** | `PressReleaseRow` is standalone; the test compares a frozen key set |
| `before` silently ignored → paging widens later | 2 | medium | 400, tested |
| CORS quietly widened for the marketing site | 2 | medium | out of scope; the credentialed-routes reason recorded above |
| MML clickables dead on the start screen | 3 | low | no-op handler pair; residuals accepted |
| the press room blocks or breaks the auth controls | 3 | medium | fire-and-forget, no await, error → `null`; AC 9 tests all three states |
| doctrine reversal lost, herald design resurfaces | 4 | medium | Wave 1 struck **in the slate itself**, with reasons — not only in a retired requirements doc |

## 7. Test strategy

Colocated `__tests__/`, Vitest, per AC 13.

- **Unit, server** — the clamp table; the entitlement matrix (with a real
  registry); realm stamping; legacy-row hydration defaults; the
  `toPressReleaseRow` key set.
- **Route** — anonymous access; the members-excluded / archive-included
  pair; `before` → 400.
- **Client** — `PressRoom` over a stubbed fetch in its three states;
  `StartScreen` renders auth controls with the press room failing.
- **Live, and it is the one that counts** — AC 19: a signed-out browser
  against a running server, reading a real release; then the empty and
  server-down states. Green units genuinely do not imply a working front
  door.

## 8. Definition of done

`pnpm lint`, `pnpm lint:imports`, `pnpm lint:module-scope`,
`pnpm lint:gates`, `pnpm build`, `pnpm test` all pass; the 19 acceptance
criteria are checkable; §5 is in the MR description.
