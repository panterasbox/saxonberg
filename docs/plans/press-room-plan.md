# Press room — implementation plan

Phase 2 for
[press-room-requirements.md](../requirements/press-room-requirements.md).
This plan says **how**; the requirements say what and why and are not
re-litigated here.

Five waves, strictly sequential. Each is independently green, and the
first three are invisible to players — the substrate lands and settles
before anything anonymous can read it.

| wave | what | visible? |
|---|---|---|
| 1 | the Communications Director office | roster only |
| 2 | the `Publisher` substrate + authority resolution | no |
| 3 | releases: publisher, visibility, realm-stamping, repost | no |
| 4 | the anonymous read path + the front-page setting | no (no consumer) |
| 5 | the start-screen press room | **yes — the deliverable** |
| 6 | docs + slate reconciliation | no |

---

## 0. The four decisions the requirements left to the plan

### 0.1 Authority is one function, and it answers one question

The dangerous shape is a helper that "picks the best publisher for this
caller" — it turns a refusal into a downgrade. **No such helper exists.**
The only entitlement function in the build is:

```
mayPublishAs(principal, publisherKey) -> boolean
```

It answers *may this principal publish as THIS publisher?* and nothing
else. `publishImpl` calls it **before** it mints or persists anything, and
an unentitled request throws — no partial write, no substitution.

Internally it is the `isCommitteeMember` shape:

```
1. resolve the Publisher from the catalogue          (unknown key -> false)
2. dispatch managedBy:
     {kind:'office'} -> CompactApi.holdsOffice(principal, office)
     {kind:'seat'}   -> GovernmentApi.holdsSeat(principal, government, seat)
   -> true short-circuits            (founder-default rides holdsOffice)
3. staff: PlayerApi.isAvatarStuff -> getPlayerId -> GroupApi.isMember
   -> true
4. otherwise false
```

Step 3's narrowing is not optional: `GroupApi.isMember` takes a
`playerId` **string**, and `isCommitteeMember` does exactly this dance
already. Absent `staff` skips step 3 entirely.

### 0.2 Where effective visibility resolves — the logic, not the Document

`Bulletin` is documented as *"plain getters; no derivation math"*, and
resolving effective visibility means consulting the catalogue. Putting
that on the Document drags a Stuff lookup into a persistence class.

So the clamp lives in `BulletinLogic`, module-private, and **nothing
outside it ever sees an unresolved visibility** — the Api exposes an
already-filtered read rather than a public predicate, so no caller can
hold the pieces and combine them wrongly.

```
effective(b) = max_restrictive( pub.visibility, b.visibility ?? pub.visibility )
```

With a two-value ordering (`public` < `members`) that is a max over an
ordinal — total, no branches, monotone in the direction the invariant
demands.

### 0.3 `visibility` is nullable; `realm` is stamped; the front page is a CSV

- `visibility: BulletinVisibility | null = null` — `null` is the inherit
  sentinel. The `''`-sentinel alternative (following `author: string = ''`)
  makes the type a lie; `ParcelRecord.allowance: unknown | null = null` is
  the nullable-persistent-field precedent.
- `realm` stays a stored, indexed field but leaves `PublishRequest` /
  `BulletinPatch`; `publishImpl` stamps it from the publisher record.
- ⚠ **`AppApi.setting()` returns `string`** — there is no array type. So
  `press.frontPage` is a **comma-separated publisher-key list**, trimmed
  and split in the logic, seeded `compact`. Unknown keys in the list are
  ignored rather than throwing: a typo must not take the front page down.

Legacy rows carry none of the new fields; `PersistentHydrator` leaves
absent fields at class defaults, so an existing row loads as
`publisher='compact'`, `visibility=null` → effective `public`. **That is
why AC 10 needs no migration script**, and why §7 is not optional.

### 0.4 The catalogue is warmed, and cold means empty — never open

`PublisherCatalogue` follows `GovernmentCatalogue`: one boot query, sync
reads, defensive copies, cold-state-empty, singleton destruct/evict
refusals.

**Cold-state-empty has a security consequence here that it does not have
for governments.** An empty catalogue means `mayPublishAs` cannot resolve
any publisher, so it must return **false**, not true — publishing is
refused until the catalogue warms. The read path degrades the same way:
no publishers resolve, so the press room serves an empty window rather
than an unfiltered one. **Fail closed on both sides**, matching
`holdsOffice`'s own fail-closed policy.

⚠ Inherited from the recipe: no auto-invalidate on template churn beyond
HMR re-clone, so a CMS edit to a Publisher template needs
`dest /obj/PublisherCatalogue`. Recorded in the doc, not solved here.

---

## 1. Wave 1 — the Communications Director

### Modified

- **`lib/governance/Office.ts`** — one entry on `OFFICE_APPARATUS`:
  `communications-director` / *Communications Director* / `executive` /
  `founder-established`. The apparatus is an authored code constant with
  no seeding, so this is genuinely a one-line addition.

### Tests

`lib/governance/__tests__/` — the office appears on the roster, resolves
to the founder default, and `holdsOffice` answers for it. Mostly a
regression net around the constant.

### Risk — trivial, with one review check

The only real risk is doctrinal drift, so it gets an explicit check rather
than a test: **AC 2 — no new `isFounder` call site.** After this wave,
`grep -rn "isFounder" src/mud` must still show only
`requiresFoundingAuthority` and `isCommitteeMember` as consumers. Put it
in the MR description.

---

## 2. Wave 2 — the `Publisher` substrate

### New

- **`obj/Publisher.ts`** — the pure-data leaf `Idea` read from
  `template.data`, never cloned live. The `obj/Government.ts` shape
  exactly (that is where it lives post-refactor, not `lib/civics/`).
  Fields per the requirements; every non-identity field a **durable
  string reference, never a live ref**.
- **`obj/PublisherCatalogue.ts`** — the boot-warmed singleton at
  `/obj/PublisherCatalogue`, manifest-registered, `GovernmentCatalogue`'s
  twin including its refusals and its §0.4 cold behavior.
- **`lib/bulletin/Publisher.ts`** — the vocabularies and value types the
  substrate speaks: `BulletinVisibility` + `BULLETIN_VISIBILITIES`,
  `PublisherAuthority` (the tagged `office`/`seat` union), and the record
  shape. **Types and constants only** — no helper functions (the
  resolution lives in the logic, §0.1).
- **`seeds/obj/Publisher/compact.yaml`** — the one seeded publisher:
  `compact`, the Compact, `ooc`, `public`, `managedBy:
  {kind: office, office: communications-director}`, no `staff`.
- **`seeds/obj/PublisherCatalogue.yaml`** — the singleton seed.

### Modified

- **`obj/api/BulletinLogic.ts`** — `mayPublishAsImpl` (§0.1) and
  `publisherOfImpl` (catalogue resolution). Nothing else yet; Wave 3 wires
  them into publish.

**Placement note:** the class and catalogue go in `obj/` because
`Publisher` is instanceable — `pnpm lint:instanceable` enforces that
nothing instances `/lib/`, and templates naming a `/lib/` class is exactly
what it fails on. The *vocabularies* stay in `lib/bulletin/`; no new
subsystem folder.

### Order

Vocabulary types → `Publisher` → catalogue → seeds → the two logic impls.

### Tests

- catalogue warm/cold, defensive copies, destruct/evict refusals (the
  `GovernmentCatalogue` suite as the template);
- **the entitlement matrix** — office-holder admitted; staff-group member
  with no office admitted (AC 5, the non-exclusivity that motivated the
  whole design); neither refused; unknown publisher key refused; **cold
  catalogue refuses** (§0.4);
- the `{kind:'seat'}` branch against a constructed government (AC 6).

### Risk — the wave's two sharp edges

**⚠ `holdsOffice` and `holdsSeat` both fail closed with no registry.** In
a unit test without an `OfficeRegistry`, every office check denies — so an
entitlement suite that forgets to construct one **passes while testing
nothing**. Every admit-case test must construct its registry and assert an
admit, not only a deny. This is the single most likely way this wave ships
green and broken.

**Refusal must be total.** AC 4 says a refusal writes nothing. The test
asserts the collection is unchanged after a refused publish, not merely
that the call threw.

---

## 3. Wave 3 — releases

### Modified

- **`lib/bulletin/Bulletin.ts`** — three persistent fields with class
  defaults (`publisher = 'compact'`, `visibility = null`, `source = ''`),
  their `fieldMeta` entries, plain getters. `BulletinKind` gains `repost`;
  `BULLETIN_KINDS` gains the entry. The header's storage-shape comment
  gains all three, and **`realm`'s comment is corrected** to say it is
  stamped from the publisher and carries framing only.
- **`api/bulletin.ts`** — `PublishRequest` gains required `publisher` and
  optional `visibility` / `source`; **`realm` is removed** from both
  `PublishRequest` and `BulletinPatch`.
- **`obj/api/BulletinLogic.ts`** — `publishImpl` calls `mayPublishAsImpl`
  first (§0.1), then stamps `publisher` + `realm` and accepts
  `visibility`/`source`; `editImpl` accepts `visibility`/`source`;
  `effectiveVisibilityImpl` (§0.2).
- **`cmd/system/bulletin.yaml`** + **`obj/command/system/BulletinController.ts`**
  — `--as <publisher>` (defaulting to `compact`), `--visibility`,
  `--source`; **the `realm` option is removed**. Refusals ride the
  dispatch envelope (`ctx.note`), never an exception to the player.

### Order

`Bulletin.ts` → logic → Api → verb.

### Tests

The clamp table (all publisher × release visibility combinations,
asserting the two that narrow **and the one that must not widen**); realm
stamping is caller-proof; the `repost`/`source` round-trip; hydration of a
row persisted without the new fields.

### Risk

**AC 8 is a security property, not a feature** — an inverted ordering
serves members-only releases to the world. The test must assert the
failure direction (`members` publisher + `public` release → `members`)
explicitly.

---

## 4. Wave 4 — the anonymous read path

### New

- **`PressReleaseRow`** in `packages/types/src/index.ts` — a **standalone
  interface, not `Pick<BulletinRow>` and not an extension**. Structural
  sharing is how a field leaks later; two independent declarations make
  widening a deliberate edit. Carries `bulletinId`, `publisher`,
  `publisherLabel`, `realm`, `kind`, `source`, `headline`, `body`,
  `publishedAt`, `pinned`. **No `author`, no `expiresAt`** — an expiry is
  operational metadata, not press-room content. `publisherLabel` ships the
  catalogue's `displayName` so an anonymous client needs no publisher
  table.
- **`BulletinApi.pressRoom(limit?)`** and
  **`BulletinApi.toPressReleaseRow(b)`**, thin forwards.
  `pressRoomImpl` = warm window → filter to publishers in
  `press.frontPage` → filter by effective visibility → slice. One
  in-memory pass; `BulletinBoard` untouched.
- **`press.frontPage`** in `lib/config/AppSettings.ts` + the
  `config/app-settings.yaml` seed (§0.3).
- **`GET /api/press/releases`** in `backend/BulletinRoutes.ts`.

**Two independent filters, deliberately.** Front-page membership is
*placement*; visibility is *permission*. A publisher can be public and
off the front page (a municipal press office), and a listed publisher can
still have a members-only release. Collapsing them would make placement
imply permission, which is the bug that reintroduces the whole
`realm`-carrying-three-jobs problem.

### The route's contract

- **No `requireAuth`.** `AuthMiddleware.requireAuthApi` is per-route,
  never app-wide, so omitting it suffices — verified.
- **The handler reads no session** — not `req.user`, not `req.session`, no
  cookie. `express-session` still runs app-wide and hands it an anonymous
  session; the handler ignores it.
- **`limit` only, clamped**; absent or non-numeric falls back to the
  configured window length.
- **`before` → 400**, not an ignore (AC 13). A silently-ignored cursor is
  the exact shape of a future accidental widening.
- Registered beside the archive route, before the SPA catch-all.

**On the namespace:** the subsystem is `bulletin`, the product surface is
the press room, and the public contract takes the product name. The file
header records the split so it reads as deliberate rather than as drift.

### Tests

Anonymous request (no cookie) → `200` with rows; a release from an
**unlisted publisher** absent from the press room and present in the
authenticated archive; a `members`-narrowed release likewise; `before` →
`400`; `Object.keys(toPressReleaseRow(...))` against a **frozen list**
(AC 14 — spot-checking `author === undefined` would not catch an
addition).

### Risk — the CORS assumption, stated so it is not quietly broken

App-wide CORS is `cors({ origin: CLIENT_URL || 'http://localhost:5173',
credentials: true })`, which covers both targets: production is
same-origin, dev is 5173→2010 matching the default. **No CORS change is
needed and none should be made.** If the marketing site ever consumes
this, that widening is its own decision — a single-origin
`credentials: true` policy cannot have an origin appended without
reasoning about the credentialed routes it also governs.

---

## 5. Wave 5 — the start screen

### New

- **`components/PressRoom.tsx`** — self-contained; `StartScreen.tsx` is
  already 256 lines and its job is auth.
  - Fetches `${SERVER_URL}/api/press/releases` with
    **`credentials: 'omit'`** — explicit, because every other client fetch
    uses `'include'` and a copied idiom would send cookies to a route
    defined as not reading them.
  - `AbortController` on unmount. **One attempt, no retry, no polling.**
  - Three terminal states: rows / an honest empty line / render `null`.
    The error state renders nothing — a visitor never sees an error string
    or a spinner that never resolves.
  - Rows show `publisherLabel`, and `source` for a `repost`.
  - MML through `MmlRenderer` with **no-op `onCommandClick` /
    `onCommandPreview`** — see the risk.

### Modified

- **`components/StartScreen.tsx`** — compose `<PressRoom />` below the
  action panel. Its loading state is never awaited or gated on: sign-in
  and Play-as-guest render on first paint regardless (AC 15).
- **`components/NewsTickerPane.tsx:242`** — the in-passing fix. "Load
  older" fetches relative and `vite.config.ts` has no proxy
  (`server: { port: 5173 }` and nothing else), so in dev it hits the Vite
  origin and fails. Use `${SERVER_URL}/…` with `credentials: 'include'`
  (AC 17).

### Risk — MML clickables on a pre-auth surface

`MmlRenderer` resolves identity tags through
`useStore.getState().stuffRegistry` and routes clicks to a command bus. On
the start screen the registry is empty and there is no connection, so an
authored `<exit>`, `<item>` or `<link href="mudcmd:…">` in a release body
would render as a clickable that dispatches into nothing.

**Mitigation: the no-op handler pair.** Both are required props supplied
by the parent, so no-ops mean the renderer computes a command string and
hands it to a function that discards it. Nothing reaches the bus; spans
still paint with correct theme treatment.

Two residuals, accepted: clickables *look* clickable but do nothing
(press releases are prose, not stuff-bound tags; the fix if it ever
grates is a styling prop, not a parser change); and `flashGhost` is
reachable from the copy affordance (`MmlRenderer.tsx:179`) — a store call,
safe with no connection.

**What this wave cannot be verified by:** the suite. AC 24 is a live
check and it is the criterion this build most depends on.

---

## 6. Wave 6 — docs and slate reconciliation

Not a cleanup wave. The doctrine is the most durable thing this cycle
produces, and leaving a superseded state-newsroom design in the backlog is
how it comes back.

- **`docs/subsystems/bulletin.md`** — expanded (it owns this subsystem).
  The press-room framing and the press-release form; the `Publisher`
  substrate, its catalogue and the invalidation caveat; the authority
  model and why it routes through a group; the visibility clamp and the
  narrow-never-widen invariant; `realm` stamped rather than supplied; the
  `repost` kind; the route, the front-page setting, and the two
  independent filters; the start-screen surface. A **header note** records
  that the stored row is still a `Bulletin` in the `bulletins` collection
  and that a rename is deferred to its own migration.
- **`docs/subsystems/governance.md`** — the Communications Director on the
  apparatus table; the press office recorded as the substrate's **second
  wired authority consumer**, noting it gates a **publisher, not a verb**,
  so the generic `requiresOffice` validator stays deferred to its own
  trigger.
- **`docs/subsystems/grouping.md`** — publishing authority added as a
  consumer of the facade, and the deferral noted: **the staff roster does
  not follow the seat on handover.**
- **`docs/slates/builds/gazette-slate.md`** — Wave 0 shipped; **Wave 1
  struck and replaced** with reasons carried over so the reversal is
  legible; Wave 2 left pointing at press-slate.
- **`docs/slates/builds/press-slate.md`** — the overlap table from the
  requirements, so the press build starts from the shared substrate
  instead of re-deriving it; editorship as a committee appointment — the
  third `managedBy` kind.

⚠ **`CLAUDE.md`'s doc-map line is NOT touched here** — index files are
swept, not raced (the worktree rules). It lands at finalize.

Slate *retention* is a finalize-phase call per `docs/workflow.md`.

---

## 7. The deploy gate

⚠ **Existing bulletins become world-readable the moment Wave 4's route is
live**, because they inherit `compact`/`public` and `compact` is on the
front page. Intended, but a one-way door on content nobody wrote with an
anonymous audience in mind.

Before exposing the route on the live box:

1. Read the `bulletins` collection; review every non-retracted row.
2. Retract or narrow (`--visibility members`) anything that should not be
   public — in particular any `world`-realm row, since the old model
   assumed `world` was auth-only.
3. Only then deploy.

A runbook step, not a code path. It belongs in the MR description.

---

## 8. Cross-cutting risk register

| risk | wave | severity | mitigation |
|---|---|---|---|
| entitlement suite silently vacuous — `holdsOffice`/`holdsSeat` fail closed with no registry | 2 | **high** | every admit-case test constructs its registry and asserts an **admit** |
| entitlement too lenient → anyone speaks for the state | 2 | **high** | the matrix tests refusal, and asserts a refusal **writes nothing** |
| cold catalogue fails open → unfiltered press room | 2 | **high** | §0.4, fail closed on both publish and read; tested cold |
| visibility ordering inverted → members-only served publicly | 3 | **high** | the clamp table asserts the non-widening direction |
| legacy rows made public without review | 4/deploy | **high** | §7, a deploy gate rather than a hope |
| the public projection gains a field later and leaks it | 4 | **high** | `PressReleaseRow` standalone; frozen key set |
| placement collapsed into permission | 4 | medium | two independent filters, each separately tested |
| `before` silently ignored → paging widens later | 4 | medium | 400, tested |
| CORS quietly widened for the marketing site | 4 | medium | out of scope; the credentialed-routes reason recorded |
| new `isFounder` call site creeps in | 1–3 | medium | AC 2, a grep check in the MR description |
| MML clickables dead on the start screen | 5 | low | no-op handler pair; residuals accepted |
| the press room blocks or breaks the auth controls | 5 | medium | fire-and-forget, no await, error → `null`; AC 15 tests all three states |
| doctrine reversal lost, herald design resurfaces | 6 | medium | Wave 1 struck **in the slate itself**, with reasons |
| staff roster does not follow the seat on handover | — | **known gap** | deferred and documented in grouping.md; not felt by this build's single-publisher use case |

## 9. Test strategy

Colocated `__tests__/`, Vitest, per AC 18.

- **Governance** — the new office on the roster, founder-default,
  `holdsOffice`.
- **Publisher** — catalogue warm/cold/refusals; the entitlement matrix
  (office-holder, staff-only, neither, unknown key, cold catalogue); the
  seat branch against a constructed government.
- **Releases** — the clamp table; realm stamping; repost round-trip;
  legacy-row hydration.
- **Route** — anonymous access; unlisted-publisher and members-narrowed
  exclusion with archive-inclusion as the paired half; `before` → 400; the
  frozen key set.
- **Client** — `PressRoom` over a stubbed fetch in three states;
  `StartScreen` renders auth controls with the press room failing.
- **Live, and it is the one that counts** — AC 24: a signed-out browser
  against a running server, reading a real release; then the empty and
  server-down states. Green units genuinely do not imply a working front
  door.

## 10. Definition of done

`pnpm lint`, `pnpm lint:imports`, `pnpm lint:module-scope`,
`pnpm lint:gates`, `pnpm lint:instanceable`, `pnpm build`, `pnpm test` all
pass; the 24 acceptance criteria are checkable; the AC 2 grep and §7 are
in the MR description.
