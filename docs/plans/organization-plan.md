# Organizations — implementation plan

Phase 2 for
[organization-requirements.md](../requirements/organization-requirements.md).
This plan says **how**; the requirements say what and why and are not
re-litigated here.

**This is a refactor of shipped code plus a new consumer**, which sets the
whole shape: the factoring lands **behaviour-preserving first**, proven by
the existing suites, and only then does anything new hang off it.

| wave | what | risk |
|---|---|---|
| 1 | `OrganizationMixin` — pure lift, no behaviour change | **highest** |
| 2 | the polymorphic appointing authority | high |
| 3 | nesting: `reportsTo` + org parentage | low |
| 4 | `PublisherMixin` + the two seeded organizations | medium |
| 5 | releases: publisher, visibility, realm-stamping, repost | medium |
| 6 | the anonymous read path + the front-page setting | medium |
| 7 | the start-screen press room | low |
| 8 | docs + slate reconciliation | — |

---

## 0. The five decisions the requirements left to the plan

### 0.1 Wave 1 is a lift, and its success criterion is "no test changed"

The factoring moves `positions`, `rosterSlots` and the holder transitions
from `BusinessMixin` down into `OrganizationMixin`, which `BusinessMixin`
then composes. **`Business` keeps its entire public surface**; every
existing caller, seed and template is untouched.

> **The wave is done when the existing employment, Dave's Bar, civics and
> Terminus suites pass with no edits to their assertions.**

An assertion that has to change is the signal that the lift became a
redesign — stop and reconsider rather than updating the test.

### 0.2 Authority is one function answering one question

```
holdsAuthority(principal, ref) -> boolean
```

Dispatch on the tag, nothing else:

```
entity    -> principal.getTemplatePath() === ref.path
office    -> CompactApi.holdsOffice(principal, ref.office)
seat      -> GovernmentApi.holdsSeat(principal, ref.government, ref.seat)
committee -> isAvatarStuff -> getPlayerId -> CompactApi.isCommitteeMember
author    -> AccessApi.isAuthor(principal)
```

**No "which authority does this actor satisfy?" helper exists** — that
shape turns a refusal into a downgrade. The only question is *does this
principal satisfy THIS ref?*

The `entity` arm reproduces today's `isProprietorOfImpl` exactly,
including its `AccessApi.isAuthor` operator override, so Wave 2 is also
behaviour-preserving for every existing Business.

### 0.3 Publishing authority, and where the clamp lives

```
mayPublishAs(principal, org) =
     holdsAuthority(principal, org.appointingAuthority)
  || holdsPublishingPosition(principal, org)
```

`holdsPublishingPosition` = the principal has a non-exited `Employment`
whose `organizationPath` is this org and whose `positionKey` is in
`publishingPositions` (empty ⇒ any position). It reuses the
quit/fired-suppression rule `holdsSeat` already implements — **do not
write a second exit-handling path**; extract the shared predicate if the
generalization makes that natural, otherwise call through.

Effective visibility resolves in `BulletinLogic`, module-private:

```
effective(b) = max_restrictive( pub.visibility, b.visibility ?? pub.visibility )
```

A max over a two-value ordinal (`public` < `members`) — total, no
branches, monotone in the direction the invariant demands. **Nothing
outside the logic ever sees an unresolved visibility**: the Api exposes an
already-filtered read, not a predicate, so no caller can hold the pieces
and combine them wrongly.

### 0.4 Fail closed on both sides

`holdsOffice`, `holdsSeat` and `isCommitteeMember` all fail closed with no
registry. `mayPublishAs` must do the same: an unresolvable organization,
an unresolvable authority, or a cold catalogue **refuses**. The read path
degrades the same way — nothing resolves, so the press room serves an
empty window rather than an unfiltered one.

⚠ This is also the wave-2/4 test trap: in a unit test with no registry
**everything denies**, so a suite that forgets to construct one passes
while testing nothing. Every admit-case test must construct its registry
and assert an **admit**.

### 0.5 Storage shapes

- `Employment.businessPath` → `organizationPath`. Legacy rows carry the
  old key; the hydration path reads either and writes the new one.
  Because a Business *is* an organization and paths do not change, **no
  value changes** — only the field name.
- `Bulletin` gains `publisher` (an organization templatePath, defaulting
  to the Compact's), `visibility: BulletinVisibility | null = null`
  (`null` = inherit), and `source: string = ''`. `realm` stays stored and
  indexed but leaves the write request.
- ⚠ `press.frontPage` is a **comma-separated** organization-path list —
  `AppApi.setting()` returns `string`, there is no array type. Unknown
  entries are ignored rather than throwing: a typo must not take the front
  page down.

---

## 1. Wave 1 — `OrganizationMixin` (the lift)

### New

- **`lib/employment/Organization.ts`** — `OrganizationMixin`, marker
  `_mixinName='OrganizationMixin'`. Holds `positions`, `rosterSlots`, the
  holder transitions (`hire` / `endEmployment` / `ensureRostered` /
  `beginShift` / `endShift` / `beginCover` / `endCover`), and the
  `who-holds-P` / `what-does-A-hold` reads. Gating and participant
  contracts move **verbatim** with the methods.
- `Mixins.Organization` in `lib/mixin.ts`.

### Modified

- **`obj/Business.ts`** — `BusinessMixin` composes `OrganizationMixin`;
  keeps `banksAt`, `operatingLocations`, the account path and trade.
  `BusinessEntity`'s composition chain gains one layer.
- **`lib/employment/Employment.ts`** — `businessPath` → `organizationPath`
  (§0.5).
- **`lib/employment/EmployedMixin`** — the participant contract's
  `FromMixin(Mixins.Business)` becomes `Mixins.Organization`, keeping the
  relational `where`.
- **`obj/api/EmploymentLogic.ts`**, **`api/employment.ts`** — parameter and
  method names follow the counterparty; the business index and
  `businessAt` stay Business-specific.
- **`obj/api/GovernmentLogic.ts`** — `holdsSeatImpl` walks employments
  against organization paths. No semantic change.

### Order

Mixin extracted with methods moved wholesale → `Business` composes it →
`Employment` field rename → the contract and logic follow.

### Risk — **the highest-risk wave in the build**

Three failure modes, in descending likelihood:

1. **A gate or participant contract is silently weakened while moving.**
   The `_setEmploymentStatus` / `_upsertEmployment` / `_removeEmployment`
   contracts are relational (`FromMixin` + a `where` on the record key).
   Moving the calling mixin changes what `FromMixin` names. **Diff the
   decorators line-by-line**, and keep a test that asserts an outsider
   still cannot write an employment record.
2. **The `holdsSeat` exit rule is lost.** An explicit quit/fired record
   *suppresses* the authored-roster path — an exit is never resurrected.
   That rule lives in `holdsSeatImpl` and is easy to drop while
   generalizing. It has a test; make sure the test still runs.
3. **A conferral regression at Dave's Bar.** `getConferredMixinNames()`
   reads the `confers` of every **on-shift** Employment's Position. If
   shift state moves, conferral must move with it intact.

**Mitigation is the §0.1 rule**: no assertion in the existing suites may
change. That is a stronger check than any new test written for this wave.

---

## 2. Wave 2 — the appointing authority

### New

- **`lib/employment/Authority.ts`** — the `PrincipalRef` tagged union and
  its five kinds. Types and constants only; the resolver lives in the
  logic (export discipline).
- `holdsAuthorityImpl` in `EmploymentLogic` (§0.2).

### Modified

- **`obj/Business.ts` / `OrganizationMixin`** — `appointingAuthority`
  replaces `proprietorPath` as the authority field. **Reads of a legacy
  bare-string `proprietorPath` normalize to `{kind:'entity', path}` on
  hydration**, so every existing seed and stored Business keeps working
  with no seed edits.
- **`isProprietorOfImpl`** — dispatches through `holdsAuthorityImpl`; the
  `entity` arm plus the `isAuthor` override reproduce today's behaviour
  exactly.

### Tests

The five-kind matrix, each admitting and refusing; **AC 3 — staff follows
the seat**: with an `{kind:'office'}` authority, reassign the office and
assert who may act changes with **no employment or roster record
touched**; the legacy `proprietorPath` normalization.

### Risk

**Fail-closed suites that test nothing** (§0.4) — every admit case
constructs its registry. And `office assign` is recorded broken in
governance.md, so AC 3's reassignment must be driven through the registry
directly rather than the verb.

---

## 3. Wave 3 — nesting

`Position.reportsTo?: string` and an organization's parent path, plus the
reads that walk them. Both are optional fields with no existing consumer,
so this is additive and low-risk. Cycle guard on both walks — a
self-parenting org or a `reportsTo` loop must be refused at read, not
looped on.

---

## 4. Wave 4 — `PublisherMixin` and the seeded organizations

### New

- **`lib/bulletin/Publisher.ts`** — `PublisherMixin` (`realm`,
  `visibility`, `publishingPositions`) plus `BulletinVisibility` +
  `BULLETIN_VISIBILITIES`. `Mixins.Publisher` in the registry.
- **`obj/Organization.ts`** — the concrete instanceable class for
  organizations that are *not* businesses, so templates have something to
  name (`pnpm lint:instanceable`: nothing instances `/lib/`).
- Seeds: **the Compact** (`ooc`, `{kind:'author'}`, no positions) and
  **the Office of the Prime Minister** (`world`,
  `{kind:'office', office:'prime-minister'}`, `communications-director`
  and `press-secretary` reporting to it).
- `mayPublishAsImpl` in `BulletinLogic` (§0.3).

### Tests

The publishing entitlement matrix: authority-holder admitted; a
publishing-position holder who is **not** the authority admitted (AC 10 —
the non-exclusivity the whole design exists for); a non-publishing
position-holder refused; an unrelated actor refused; an unresolvable org
refused; a cold catalogue refused.

### Risk

**No `communications-director` Office is minted** — a reviewer expecting
one from the earlier draft may add it. The requirements say why it is a
position; the doc wave says it again.

---

## 5. Wave 5 — releases

`Bulletin` gains `publisher` / `visibility` / `source` with class defaults
and getters; `BulletinKind` gains `repost`. `publishImpl` calls
`mayPublishAs` **before minting or persisting anything**, then stamps
`publisher` + `realm`. `realm` is removed from `PublishRequest` and
`BulletinPatch`; the verb gains `--as` / `--visibility` / `--source` and
loses `--realm`. Refusals ride the dispatch envelope (`ctx.note`), never
an exception to the player.

**Tests:** the clamp table asserting **the non-widening direction**
(`members` publisher + `public` release → `members`); realm stamping is
caller-proof; the repost round-trip; legacy-row hydration; and **a refusal
writes nothing** — assert the collection is unchanged, not merely that the
call threw.

---

## 6. Wave 6 — the anonymous read path

`PressReleaseRow` in `@saxonberg/types` — a **standalone interface**, not
a `Pick<BulletinRow>` and not an extension; structural sharing is how a
field leaks later. Carries the publisher path and label, `realm`, `kind`,
`source`, `headline`, `body`, `publishedAt`, `pinned`. **No `author`, no
`expiresAt`.**

`BulletinApi.pressRoom(limit?)` = warm window → **filter to publishers in
`press.frontPage`** → **filter by effective visibility** → slice. Two
independent filters (placement vs permission), each separately tested.

`GET /api/press/releases` in `backend/BulletinRoutes.ts`: **no
`requireAuth`** (`requireAuthApi` is per-route, never app-wide — verified);
the handler touches no session, cookie or `req.user`; `limit` clamped;
**`before` → 400**, because a silently-ignored cursor is the shape of a
future accidental widening.

**Risk — the CORS assumption.** App-wide CORS is single-origin with
`credentials: true`, which already covers same-origin production and
5173→2010 dev. **No CORS change is needed and none should be made** — a
single-origin credentialed policy cannot have an origin appended without
reasoning about the credentialed routes it also governs.

---

## 7. Wave 7 — the start screen

`components/PressRoom.tsx`, self-contained (`StartScreen.tsx` is already
256 lines and its job is auth). Fetches with **`credentials: 'omit'`** —
explicit, because every other client fetch uses `'include'` and a copied
idiom would send cookies to a route defined as not reading them.
`AbortController` on unmount; **one attempt, no retry, no polling**. Three
terminal states: rows / an honest empty line / render `null` — a visitor
never sees an error string or a spinner that never resolves. The feed is
never awaited: sign-in and guest controls paint first regardless.

MML through `MmlRenderer` with **no-op `onCommandClick` /
`onCommandPreview`** — both are required props, so no-ops mean the
renderer computes a command string and hands it to a function that
discards it. Nothing reaches the bus on a surface with no connection.
Residuals accepted: clickables look clickable but do nothing, and
`flashGhost` (`MmlRenderer.tsx:179`) is a safe store call.

Plus the in-passing fix: **`NewsTickerPane.tsx:242`** uses a relative
fetch and `vite.config.ts` has no proxy, so "Load older" fails in dev.

**What this wave cannot be verified by:** the suite. AC 28 is a live check
and it is the criterion this build most depends on.

---

## 8. Wave 8 — docs and slates

- **`employment.md`** — the organization/business split and the table of
  what moved; the appointing authority and its five kinds; nesting; and
  ⚠ **the independence of employment from money movement**, written as a
  standing constraint so it is not "helpfully" coupled later.
- **`bulletin.md`** — the press-room framing, `PublisherMixin`, the
  entitlement model, the clamp, derived `realm`, the `repost` kind, the
  route, the front-page setting, the two independent filters, the
  start-screen surface, and a header note that the stored row is still a
  `Bulletin`.
- **`governance.md` / `civics.md`** — seats point at positions on
  organizations; the press office as the Office substrate's second wired
  authority consumer, gating a publisher rather than a verb (so the
  generic `requiresOffice` validator stays deferred). ⚠ Correct civics.md's
  stale `lib/civics/Government.ts` → `obj/Government.ts` while it is open.
- **`mixins.md`** — the two new mixins and the composition order.
- **`gazette-slate.md`** — Wave 0 shipped; **Wave 1 struck and replaced**
  with reasons carried over. **`press-slate.md`** — a newspaper is an
  organization that trades and publishes; *"who is the editor in chief?"*
  is the same read as *"who is the comms director?"*, and that is what
  makes press↔government interaction automatable.

⚠ **`CLAUDE.md`'s doc-map lines are NOT touched here** — index files are
swept, not raced. They land at finalize.

---

## 9. The deploy gate

⚠ **Existing bulletins become world-readable the moment Wave 6's route is
live**, because they inherit the Compact publisher and public visibility.
Intended, but a one-way door on content nobody wrote for an anonymous
audience. Before exposing the route: read the `bulletins` collection,
review every non-retracted row, retract or narrow anything that should not
be public — especially any `world`-realm row, since the old model assumed
`world` was auth-only. **Then** deploy. A runbook step; it belongs in the
MR description.

---

## 10. Cross-cutting risk register

| risk | wave | severity | mitigation |
|---|---|---|---|
| a gate or participant contract weakened while moving | 1 | **highest** | §0.1 no-assertion-changed rule; diff decorators line-by-line; an outsider-cannot-write test |
| the `holdsSeat` quit/fired suppression lost | 1 | **high** | its existing test must still run and pass unedited |
| Dave's Bar conferral regression | 1 | **high** | the on-shift `confers` read moves with shift state; existing suite unedited |
| fail-closed suites that test nothing | 2, 4 | **high** | every admit case constructs its registry and asserts an admit |
| entitlement too lenient → anyone speaks for the state | 4 | **high** | the matrix tests refusal; a refusal writes nothing |
| visibility ordering inverted → members-only served publicly | 5 | **high** | the clamp table asserts the non-widening direction |
| legacy rows made public without review | 6/deploy | **high** | §9, a deploy gate rather than a hope |
| the public projection gains a field and leaks it | 6 | **high** | standalone `PressReleaseRow`; frozen key set |
| employment coupled to money movement, killing under-the-table | 1, 8 | **high** | AC 9 asserts a transfer needs no employment record; written into employment.md as a constraint |
| placement collapsed into permission | 6 | medium | two independent filters, separately tested |
| a new `isFounder` call site creeps in | any | medium | AC 6, a grep check in the MR description |
| `reportsTo` / parent cycles | 3 | medium | cycle guard at read |
| a reviewer re-adds a `communications-director` Office | 4, 8 | low | stated in requirements and repeated in the docs wave |
| MML clickables dead on the start screen | 7 | low | no-op handler pair |

## 11. Test strategy

Colocated `__tests__/`, Vitest, per AC 22.

- **The regression net is the real Wave 1 suite** — existing employment,
  Dave's Bar, civics and Terminus tests, unedited.
- **Authority** — the five-kind matrix; staff-follows-the-seat; legacy
  `proprietorPath` normalization.
- **Publishing** — the entitlement matrix including the position-only
  admit; the clamp table; realm stamping; repost; refusal writes nothing.
- **Route** — anonymous access; unlisted-publisher and members-narrowed
  exclusion paired with archive-inclusion; `before` → 400; frozen key set.
- **Client** — `PressRoom` over a stubbed fetch in three states;
  `StartScreen` renders auth controls with the press room failing.
- **Live, and it is the one that counts** — AC 28.

## 12. Definition of done

`pnpm lint`, `pnpm lint:imports`, `pnpm lint:module-scope`,
`pnpm lint:gates`, `pnpm lint:instanceable`, `pnpm build`, `pnpm test` all
pass; the 28 acceptance criteria are checkable; the AC 6 grep and §9 are
in the MR description.
