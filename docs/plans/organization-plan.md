# Organizations — implementation plan

Phase 2 for
[organization-requirements.md](../requirements/organization-requirements.md).
This plan says **how**; the requirements say what and why.

**Two refactors of shipped code plus a new substrate plus a new surface**,
which sets the whole shape: each refactor lands **behaviour-preserving
first**, proven by the existing suites, and only then does anything new
hang off it.

| wave | what | risk |
|---|---|---|
| 1 | `OrganizationMixin` — pure lift, no behaviour change | **highest** |
| 2 | the polymorphic appointing authority | high |
| 3 | nesting: `reportsTo` + org parentage | low |
| 4 | the appointment verb | medium |
| 5 | `PublisherMixin` + the two seeded organizations | medium |
| 6 | releases → the document tree; `bulletins` retires | **highest** |
| 7 | the anonymous read path + the front-page setting | medium |
| 8 | the start-screen press room | low |
| 9 | docs + slate reconciliation | — |

---

## 0. The five decisions the requirements left to the plan

### 0.1 Waves 1 and 6 are lifts, and their success criterion is "no test changed"

Both move shipped behaviour without altering it. **Each is done when the
existing suites pass with no edits to their assertions.** An assertion
that has to change is the signal that the lift became a redesign — stop
and reconsider rather than updating the test.

### 0.2 Authority is one function answering one question

```
holdsAuthority(principal, ref) -> boolean
```

Dispatch on the tag, nothing else: `entity` → templatePath match;
`office` → `CompactApi.holdsOffice`; `seat` → `GovernmentApi.holdsSeat`;
`committee` → `isAvatarStuff` → `getPlayerId` →
`CompactApi.isCommitteeMember`; `author` → `AccessApi.isAuthor`.

**No "which authority does this actor satisfy?" helper exists** — that
shape turns a refusal into a downgrade.

⚠ **Only `office` and `committee` carry the founder default.** `author` in
particular resolves to membership of an **empty-by-default `core` group**,
so an authority the founder cannot satisfy is one nobody can satisfy on a
fresh box. This is why the Compact press office uses `{kind:'committee'}`.

### 0.3 Appointment and exercise are different functions

```
holdsAuthority(principal, org.appointingAuthority)   // may APPOINT
mayPublishAs(principal, org)                         // may PUBLISH
```

**`mayPublishAs` never consults the appointing authority.** It is exactly
*does the principal hold a non-exited `Employment` in this org whose
`positionKey` is in `publishingPositions`* (empty ⇒ any position). It
reuses the quit/fired-suppression rule `holdsSeat` already implements —
**do not write a second exit-handling path**.

AC 8 is the explicit negative: a committee member holding no publishing
position is refused. Write that test first; it is the one that would catch
a reviewer "helpfully" re-adding the `||`.

### 0.4 Fail closed, everywhere

`holdsOffice`, `holdsSeat` and `isCommitteeMember` all fail closed with no
registry, and `mayPublishAs` must match: an unresolvable organization,
authority or cold catalogue **refuses**. The read path degrades the same
way — nothing resolves, so the press room serves an empty window rather
than an unfiltered one.

⚠ **The test trap:** in a unit test with no registry **everything denies**,
so a suite that forgets to construct one passes while testing nothing.
Every admit-case test must construct its registry and assert an **admit**.

### 0.5 Storage shapes

- `Employment.businessPath` → `organizationPath`. Because a Business *is*
  an organization and paths do not change, **no value changes** — only the
  field name; hydration reads either key.
- A release is `{path: '<feedPath>/<id>', owner: <publisher org path>,
  kind: 'release', data: {...}}`. **`realm` is not stored** — it derives
  from the publisher, so there is one source rather than a copy that can
  drift.
- ⚠ `press.frontPage` is a **comma-separated** organization-path list —
  `AppApi.setting()` returns `string`. Unknown entries are skipped **and
  logged once at boot**: a typo must not silently empty the front page.

---

## 1. Wave 1 — `OrganizationMixin` (the lift)

**New:** `lib/employment/Organization.ts` — `OrganizationMixin`, marker
`_mixinName='OrganizationMixin'`, holding `positions`, `rosterSlots`, the
holder transitions (`hire` / `endEmployment` / `ensureRostered` /
`beginShift` / `endShift` / `beginCover` / `endCover`) and the
`who-holds-P` / `what-does-A-hold` reads. Gating and participant contracts
move **verbatim**. Plus `Mixins.Organization`.

**Modified:** `obj/Business.ts` composes it and keeps `banksAt`,
`operatingLocations`, the account path and trade;
`lib/employment/Employment.ts` field rename; `EmployedMixin`'s
participant contract retargets to `Mixins.Organization` keeping its
relational `where`; `EmploymentLogic` / `api/employment.ts` follow;
`GovernmentLogic.holdsSeatImpl` walks organization paths.

### Risk — **the highest-risk wave, tied with 6**

1. **A gate or participant contract silently weakened while moving.** The
   `_setEmploymentStatus` / `_upsertEmployment` / `_removeEmployment`
   contracts are relational (`FromMixin` + a `where` on the record key);
   moving the calling mixin changes what `FromMixin` names. **Diff the
   decorators line-by-line**, and keep a test asserting an outsider still
   cannot write an employment record.
2. **The `holdsSeat` quit/fired suppression lost** — an explicit exit
   suppresses the authored-roster path; an exit is never resurrected. It
   has a test; make sure the test still runs.
3. **A Dave's Bar conferral regression** — `getConferredMixinNames()`
   reads the `confers` of every *on-shift* Employment's Position; if shift
   state moves, conferral moves with it intact.

Mitigation is §0.1: no assertion in the existing suites may change.

---

## 2. Wave 2 — the appointing authority

**New:** `lib/employment/Authority.ts` — the `PrincipalRef` tagged union
and its five kinds (types and constants only; the resolver lives in the
logic). `holdsAuthorityImpl` in `EmploymentLogic`.

**Modified:** `appointingAuthority` replaces `proprietorPath` on the
organization; **reads of a legacy bare-string `proprietorPath` normalize
to `{kind:'entity', path}` on hydration**, so every existing seed keeps
working with no seed edits. `isProprietorOfImpl` dispatches through
`holdsAuthorityImpl`; the `entity` arm plus the `isAuthor` override
reproduce today's behaviour exactly.

**Tests:** the five-kind matrix; **AC 3 — staff follows the seat**:
reassign the office and assert who may appoint changes with **no
employment or roster record touched**; legacy normalization.

⚠ `office assign` is recorded broken in governance.md, so AC 3's
reassignment is driven through the registry directly, not the verb.

---

## 3. Wave 3 — nesting

`Position.reportsTo?` and an organization parent path, plus the reads that
walk them. Both optional with no existing consumer, so additive. **Cycle
guard on both walks** — a self-parenting org or a `reportsTo` loop is
refused at read.

---

## 4. Wave 4 — the appointment verb

A player-facing verb that fills a position, gated on
`holdsAuthority(giver, org.appointingAuthority)` and calling the existing
hire path. Without it **no position can ever be filled by a human**, which
is the same defect as the broken `office assign` — and every downstream
wave depends on a filled position.

Category and naming follow [command-spec.md](../subsystems/command-spec.md);
the authority check is a subcommand-level validator (the
`requiresFoundingAuthority` precedent), not an in-controller check.
Refusals ride the dispatch envelope.

**Tests:** the authority-holder appoints; a non-holder is refused; the
appointee's `Employment` is created with the right `organizationPath` and
`positionKey`.

---

## 5. Wave 5 — `PublisherMixin` and the seeded organizations

**New:** `lib/press/Publisher.ts` — `PublisherMixin` (`realm`,
`visibility`, `feedPath`, `publishingPositions`) plus `PressVisibility` +
its validation array; `Mixins.Publisher`. `obj/Organization.ts` — the
concrete instanceable class for organizations that are *not* businesses,
so templates have something to name. Seeds: **the Compact** (`ooc`,
`{kind:'committee', parcel:'/'}`, one position) and **the Office of the
Prime Minister** (`world`, `{kind:'office', office:'prime-minister'}`, two
positions with `reportsTo`). Both ship **unfilled**.
`mayPublishAsImpl` per §0.3.

**Tests:** the entitlement matrix — a publishing-position holder admitted;
a non-publishing position-holder refused; **a committee member with no
position refused (AC 8)**; an unrelated actor refused; unresolvable org
refused; cold catalogue refused.

⚠ **No `communications-director` Office is minted.** A reviewer working
from an earlier draft of this cycle may try to add one.

---

## 6. Wave 6 — releases move to the document tree

**The second lift, and behaviour-preserving in the same sense as Wave 1.**

- A release becomes a `StoredDocument` (§0.5). `document-store.md` gains
  the `release` kind.
- ⚠ **The write transport.** `DocumentApi.save` gates on self-home /
  covering zone / slice-walk, which admits the *parcel owner* — not the
  comms director. So the press path writes through a **narrow named
  transport** that stamps the publisher organization as owner, with
  `mayPublishAs` as the authoritative check (the `PersistableApi`
  write-as-owner precedent). **This seam is an ownership bypass by
  construction**: it is gated to one calling module and **takes the
  publisher it just authorized, never a caller-supplied owner**.
- The warm board becomes a cache **over the tree**, keeping its existing
  window semantics (pins-first, recency, retract/expiry filtering, pin
  cap). The live fan, the archive read and the connect-time window all
  read it and are otherwise unchanged.
- `Bulletin`, the `bulletins` collection and its `Collections` entry are
  **deleted**. The rename lands with them: `BulletinApi`→`PressApi`, the
  `bulletin` verb→`press`, and the wire types follow.
- **No data migration script** — the deploy step re-posts what should
  survive (§8).

### Risk — **tied for highest**

1. ⚠⚠ **The named transport is an ownership bypass.** If its gate is
   loose, the entire document-store ownership story is broken — not just
   for releases. Gate it to one module, take no owner parameter, and test
   that a direct call from anywhere else throws.
2. **The window semantics are easy to lose** in the move from a warm
   collection cache to a tree read. Pin cap, expiry, retraction and window
   length all have existing behaviour; §0.1 applies.
3. **`kind: 'release'` documents must not become writable through the
   ordinary `DocumentApi.save` path** by a player who happens to own the
   covering branch — the publishing check has to be the only way in.

---

## 7. Wave 7 — the anonymous read path

`PressReleaseRow` in `@saxonberg/types` — a **standalone interface**, not
a `Pick<>` and not an extension; structural sharing is how a field leaks
later. **No `author`, no `expiresAt`.**

`PressApi.pressRoom(limit?)` = warm window → **filter to publishers in
`press.frontPage`** → **filter by effective visibility** → slice. Two
independent filters (placement vs permission), each separately tested.

The clamp, module-private in the logic:
`effective(r) = max_restrictive(pub.visibility, r.visibility ?? pub.visibility)`
— a max over a two-value ordinal, total and monotone. **Nothing outside
the logic sees an unresolved visibility**: the Api exposes an
already-filtered read, not a predicate.

`GET /api/press/releases`: **no `requireAuth`** (`requireAuthApi` is
per-route, never app-wide — verified); the handler touches no session,
cookie or `req.user`; `limit` clamped; **`before` → 400**, because a
silently-ignored cursor is the shape of a future accidental widening.

**Risk — the CORS assumption.** App-wide CORS is single-origin with
`credentials: true`, already covering same-origin production and 5173→2010
dev. **No CORS change is needed and none should be made** — a single-origin
credentialed policy cannot have an origin appended without reasoning about
the credentialed routes it also governs.

---

## 8. Wave 8 — the start screen

`components/PressRoom.tsx`, self-contained. Fetches with
**`credentials: 'omit'`** — explicit, because every other client fetch uses
`'include'` and a copied idiom would send cookies to a route defined as not
reading them. `AbortController` on unmount; **one attempt, no retry, no
polling**. Three terminal states: rows / an honest empty line / render
`null` — a visitor never sees an error string or a hanging spinner. The
feed is never awaited: sign-in and guest controls paint first regardless.

MML through `MmlRenderer` with **no-op `onCommandClick` /
`onCommandPreview`** — both are required props, so no-ops mean the renderer
computes a command string and hands it to a function that discards it.
Nothing reaches the bus on a surface with no connection. Residuals
accepted: clickables look clickable but do nothing, and `flashGhost` is a
safe store call.

Plus the in-passing fix: the ticker pane's relative `/api/…` fetch with no
Vite proxy, which fails in dev.

**What this wave cannot be verified by:** the suite. AC 33 is a live check.

---

## 9. Wave 9 — docs and slates

`employment.md` (the org/business split, what moved, the five authority
kinds, nesting, the appointment verb, ⚠ **the independence of employment
from money movement** as a standing constraint); `press.md` (renamed from
`bulletin.md` — the press-release form, `PublisherMixin`,
appointment-vs-exercise, tree storage and the write transport, the clamp,
derived `realm`, `repost`, the route, the front-page setting, the start
screen); `document-store.md` (the `release` kind and the named transport);
`governance.md` / `civics.md` (seats point at positions; ⚠ correct
civics.md's stale `lib/civics/Government.ts` → `obj/Government.ts`);
`mixins.md`; `gazette-slate.md` (**Wave 1 struck and replaced**);
`press-slate.md` (a newspaper is an organization that trades and
publishes).

⚠ **`CLAUDE.md`'s doc-map lines are NOT touched here** — index files are
swept, not raced. The `bulletin.md`→`press.md` map entry lands at finalize.

---

## 10. The deploy step

⚠ Two things converge and are handled as one act: the `bulletins`
collection retires with no migration script, **and** everything surviving
becomes publicly readable. Before exposing the route: read the old
collection, decide row by row what should survive and be public, and
**re-post those as releases**. At staff-feed volume this is minutes, and it
folds the migration into the content review the visibility change requires
anyway. It belongs in the MR description.

---

## 11. Cross-cutting risk register

| risk | wave | severity | mitigation |
|---|---|---|---|
| the named write transport is a loose ownership bypass | 6 | **highest** | one calling module, no owner parameter, a test that a direct call throws |
| a gate or participant contract weakened while moving | 1 | **highest** | §0.1; diff decorators line-by-line; an outsider-cannot-write test |
| window semantics lost in the tree move | 6 | **high** | §0.1 — existing ticker assertions unedited |
| the `holdsSeat` quit/fired suppression lost | 1 | **high** | its existing test must still run unedited |
| Dave's Bar conferral regression | 1 | **high** | existing suite unedited |
| the appointing authority regains a publish route | 5 | **high** | AC 8, written as the first test of the wave |
| fail-closed suites that test nothing | 2, 5 | **high** | every admit case constructs its registry and asserts an admit |
| visibility ordering inverted → members-only served publicly | 7 | **high** | the clamp table asserts the non-widening direction |
| surviving content made public without review | 6/deploy | **high** | §10, a deploy gate rather than a hope |
| the public projection gains a field and leaks it | 7 | **high** | standalone `PressReleaseRow`; frozen key set |
| employment coupled to money movement, killing under-the-table | 1, 9 | **high** | AC 11; written into employment.md as a constraint |
| a release written through ordinary `DocumentApi.save` | 6 | medium | the publishing check is the only way in; tested |
| placement collapsed into permission | 7 | medium | two independent filters, separately tested |
| a front-page typo empties the page silently | 7 | medium | skipped **and logged at boot** |
| a new `isFounder` call site creeps in | any | medium | AC 7, a grep check in the MR |
| `reportsTo` / parent cycles | 3 | medium | cycle guard at read |
| a reviewer re-adds a `communications-director` Office | 5, 9 | low | stated in requirements, repeated in the docs wave |

## 12. Test strategy

Colocated `__tests__/`, Vitest, per AC 27.

- **The regression net is the real Waves 1 and 6 suite** — existing
  employment, Dave's Bar, civics, Terminus and ticker tests, unedited.
- **Authority** — the five-kind matrix; staff-follows-the-seat; legacy
  normalization.
- **Appointment** — holder appoints, non-holder refused, the `Employment`
  written correctly.
- **Publishing** — the entitlement matrix including **AC 8's explicit
  negative**; the clamp table; realm derivation; repost; refusal writes
  nothing.
- **Storage** — the release document's shape; the transport's gate refuses
  outside callers; the collection has no reader or writer left.
- **Route** — anonymous access; unlisted-publisher and members-narrowed
  exclusion paired with archive-inclusion; `before` → 400; frozen key set.
- **Client** — `PressRoom` over a stubbed fetch in three states.
- ⭐ **The cold-box walk (AC 25)** — empty `core`, founder appoints
  themselves, publishes, anonymous route serves it. One test, whole chain.
  Both breaks this build fixed were invisible to tests that passed in
  isolation.
- **Live, and it is the one that counts** — AC 33.

## 13. Definition of done

`pnpm lint`, `pnpm lint:imports`, `pnpm lint:module-scope`,
`pnpm lint:gates`, `pnpm lint:instanceable`, `pnpm build`, `pnpm test` all
pass; the 33 acceptance criteria are checkable; the AC 7 grep and §10 are
in the MR description.
