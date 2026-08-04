# Organizations — requirements

**The org chart, factored out of Business — and the press room as its
first consumer.**

Three coupled halves: a substrate that answers *"who holds position P in
organization O?"* uniformly across governments, businesses and publishers;
a **storage correction** that moves press releases out of a system
collection and into the owned document tree where locally-scoped content
belongs; and the **press room** — press releases publicly readable on the
start screen — which proves both by using them.

The immediate practical need is small: **announcements reaching people who
land on mud.panterasbox.com**, none of which is visible today (the live
fan needs an Avatar, the initial window rides the post-auth connection
payload, the archive route is `requireAuth`, the pane is a post-login
tab). The substrate is not sized to that need — it is sized to the
industries design, because the same question has to be answerable of a
newspaper and a ministry before press and government can interact at all.

Seeded by [gazette-slate](../slates/builds/gazette-slate.md) (Wave 0;
**its Wave 1 is superseded here**) and
[press-slate](../slates/builds/press-slate.md). Grows
[employment.md](../subsystems/employment.md),
[document-store.md](../subsystems/document-store.md), and the bulletin
subsystem doc (renamed — see below).

## The three governing decisions

### 1. Business models the economy; an organization models the chart

> **Business models participation in the economy. An organization models
> the chart. Business currently carries both, and that is the
> conflation.**

The shipped code already strains at it:

- **`Government.departments` are Business templatePaths.** Terminus must
  stand up a *Business* just to have a Registry with a Magistrate seat. A
  registry does not trade; it is a Business because that is where
  positions live.
- **`Corpo` cannot answer who runs it** — sector, ethos, rivals, no chart.
- **Personal staff has nowhere to live at all**, which is what surfaced
  this: a Communications Director is *not* an office. Offices head
  institutions and are prescribed by law; a comms director is the
  principal's personal staff, serves at pleasure, and is prescribed by
  nothing.

So an **organization** is an identity with **positions**, **holders**, and
an **appointing authority**, answering *who holds position P in
organization O?* and its inverse *what does actor A hold, anywhere?*
`BusinessMixin` composes `OrganizationMixin`; trade stays on Business.

**The seat/staff line, now expressible:**

| | prescribed by law? | is |
|---|---|---|
| Compact **Office** | yes | `OFFICE_APPARATUS` |
| government **seat** | yes | a `Government.seats` entry **pointing at** a position |
| **personal staff** | **no — serves at pleasure** | **a position nobody points at** |

⭐ **The difference is whether a constitutional document points at the
position. Same substrate; the pointer is the law.** So **no
`communications-director` Office is minted** — an earlier draft of this
cycle proposed one, and that was the error that produced this substrate.

### 2. The appointing authority appoints. The position acts.

> **The committee fills a position; the position gates who can publish.**

```
mayPublishAs(principal, org) = holdsPublishingPosition(principal, org)
```

Full stop. **The appointing authority is not an alternate route to the
power** — its power is to *fill* the position, not to exercise it. A
President has no press-secretary powers; they appoint a press secretary.

An earlier draft had `holdsAuthority(...) OR holdsPublishingPosition(...)`,
which collapsed two different powers into one.

⭐ **This strengthens the founder doctrine rather than straining it.** The
founder's specialness lives entirely at the *appointment* step — the
pool-of-one backstop inside `isCommitteeMember` lets them fill the
position — and publishing is earned the way anyone earns it, by holding
the position. **Nothing in the publish path consults the founder at all.**

Its honest consequence: **an organization with no comms director publishes
nothing**, and the founder's first act is to appoint one (possibly
themselves). That is correct behaviour, and it is the gazette slate's own
*"a locality with no gazette is a fact about that locality."*

### 3. Releases live in the document tree, not a system collection

The sort rule, from
[legal-code-slate](../slates/builds/legal-code-slate.md): *collections cut
across jurisdictions and are queried by system; the tree is place / owner
/ division of labor — **would you query it across all jurisdictions?***

Press releases fail that test cleanly. **You read a publisher's feed.**
Nobody queries releases globally — even the front page reads a short
enumerated list of publishers, each by prefix. They are owner-scoped
content with a place: a municipality's press releases are the
municipality's.

> **So a release is a `StoredDocument` (`kind: 'release'`) under a feed
> path its publisher declares — and the `bulletins` collection retires.**

press-slate said this all along (`/feed/<publisher>/` in the document
tree); the shipped `bulletins` collection predates the rule and was kept
by inertia.

⚠ **The collection retiring means the *name* retires with it.** A `Bulletin`
class and a `bulletin` verb standing over a store that no longer exists is
exactly the half-migration that misleads the next reader, so the rename is
in scope, not deferred: `BulletinApi`→`PressApi`, the `bulletin`
verb→`press`, `bulletin.md`→`press.md`.

## Goals

**The substrate**

- `OrganizationMixin` carries positions, holders and an appointing
  authority; `BusinessMixin` composes it.
- `who holds P in O?` / `what does A hold?` are single uniform reads,
  identical for a ministry, a shop and a paper.
- The appointing authority is polymorphic, so a Compact officer, a parcel
  committee, a government seat-holder, an operator or an ordinary person
  can all be one:

  | kind | resolves through | founder passes? |
  |---|---|---|
  | `entity` | templatePath match — today's `proprietorPath` | no |
  | `office` | `CompactApi.holdsOffice` | **yes — founder default** |
  | `seat` | `GovernmentApi.holdsSeat` | no |
  | `committee` | `CompactApi.isCommitteeMember` | **yes — pool-of-one backstop** |
  | `author` | `AccessApi.isAuthor` | **no — see the cold-box trace** |

- ⭐ **Staff follows the seat**: because the authority *is* the office, a
  handover moves it with no roster migration.
- **Positions and organizations both nest** — `Position.reportsTo` and an
  organization parent. "Press Secretary reports to the Communications
  Director" becomes mechanism.
- **One holder relation.** `Employment`'s counterparty generalizes from a
  Business to an organization; wage and shifts stay optional, a volunteer
  is a wage-0 employee. Already how `Government.seats` resolve.
- **An appointment verb** — a player-facing surface, gated on holding the
  organization's appointing authority, that fills a position.

**Storage**

- Releases are `StoredDocument`s under a publisher-declared feed path;
  the `bulletins` collection, its class and its name retire.
- The in-world ticker, the archive read and the connect-time window all
  read the tree; their behaviour is unchanged.

**The press room**

- `PublisherMixin` on an organization — realm, default visibility, feed
  path, and which positions may publish.
- A visitor who has never signed in can read it: a plain unauthenticated
  HTTP read on the start screen, MML rendered, **degrading deliberately**
  when empty or unreachable.
- **Visibility is declared by the publisher**, narrowable per release,
  **never widenable**. **`realm` derives from the publisher.** **Reposting
  is a release kind** with a `source` line.
- **Which publishers the pre-login surface shows is configuration**, so a
  municipal press office is readable, local, and nowhere near the app's
  front door.

## Non-goals

- **No new Office.** The Communications Director is a position.
- **No Corpo migration** — the obvious next consumer, not this build.
- **No municipal press office seeded.** The `{kind:'seat'}` branch is
  built and unit-tested; the first one authors itself as content.
- **No consent model.** A volunteer is a wage-0 employee.
- ⚠ **No coupling between employment records and money movement** — a
  non-goal that must be actively defended, see Constraints.
- **No affordance rework.** `AuthorMixin` is already on every Avatar via
  `ShelledCharacter`; only the *validator* changes.
- **No press-build surface**: no subscription, push, byline, credibility
  track record, paywall.
- **No generic `requiresOffice` validator** — its trigger is the second
  office-gated verb.
- **No docket, no annotation layer, no Saxonberg** (also blocked:
  `ParcelRecord.allowance` is an inert seam, the allowance cascade is
  unbuilt).
- **No permalinks, `og:` tags, RSS or email. No CORS work, no
  panterasbox.com consumer** — the surface is the start screen.
- **No data migration script.** See the deploy step: at staff-feed volume,
  re-posting what should survive folds the migration and the mandatory
  content review into one act.

## Surface decisions

### `OrganizationMixin`, composed — not a standalone entity

One entity wears its hats: a press office is an organization; a shop is an
organization that also trades. Matches the codebase idiom
(`BusinessEntity extends BusinessMixin(PostRegistrationMixin(Idea))`) and
avoids a hop on every read. **Accepted cost:** an organization and its
commercial face can never be separately owned; no consumer wants that.

**What moves:** `positions`, `rosterSlots`, the holder transitions, and
`proprietorPath`→the appointing authority. **What stays on Business:**
`banksAt`, wage settlement, tips, `operatingLocations`, the room→business
index, the P&L account. **`Position.wageRate` stays on `Position`** —
compensation attaches to the *position*, which is what makes the roster's
`{positionKey, assignee}` shape right rather than incidental.

⭐ **Existing content keeps working untouched**: `Business` composes the
mixin and templatePaths do not change, so `Government.departments`,
`Government.seats` and `holdsSeat` resolve against the Terminus Registry
exactly as today.

### The appointing authority replaces `proprietorPath`

`proprietorPath` is a templatePath — a *specific entity* — so authority
under it can never be handed off, the same defect the check-the-office
doctrine exists to prevent. It becomes the `entity` kind of the
polymorphic reference; `isProprietorOf` dispatches on the tag, and legacy
bare-string values normalize to `{kind:'entity', path}` on hydration.

### ⚠ The cold-box trace — how the founder actually posts

Traced against the code, because two links were broken and the design read
as sound without them.

**The founder is not an author.** `AccessRegistry.isAuthor` is *membership
of `core`, or of any parcel-owning group* — and `seedCoreGroup()` creates
`core` **empty**. `WIZARD_PLAYER_IDS` seeds `wizards`, not `core`; the only
code path that adds anyone is `Application.provisionTestCharacter`, a
dev/test path. **Nothing maps the founder credential to author status.**

1. **The verb gate.** `AuthorMixin` is composed on `ShelledCharacter` and
   `Avatar` descends from it, so *every* Avatar already carries the verb
   contribution — **affordance was never the gate**; `requiresAuthor` →
   `AccessApi.isAuthor` is, and the founder fails it on a fresh box.

   ⚠ This invalidated an earlier deferral in this cycle, which reasoned
   *"the founder holds every seat by default and is an author."* False.
   The fix is a **validator swap**, not the affordance rework that
   deferral imagined: `requiresPublisher` — *does this actor hold **any**
   publishing position?* A coarse affordance gate; the per-publisher check
   in the publish path stays authoritative. ⚠ **Not the banned
   "pick-a-publisher" helper** — that shape turns a refusal into a
   downgrade; this returns a boolean and selects nothing.

2. **The appointment, not the publish, is where the founder default
   applies.** The Compact press office's authority is
   `{kind:'committee', parcel:'/'}` → `isCommitteeMember`, which already
   carries the founder backstop. **No new `isFounder` call site.**

**The resulting chain:**

```
founder logs in            → isFounder matches FOUNDER_GOOGLE_EMAIL
appoints themselves        → isCommitteeMember passes by founder default
                             → the appointment verb fills the position
publishes                  → requiresPublisher admits (holds the position)
                             → mayPublishAs admits
                             → release written to the tree, realm ooc, public
anonymous browser reads it → front-page filter passes
```

⚠ **`isFounder` returns false until the founder has logged in once** (no
`User` row to match), and is always false if neither founder env var is
set — one boot warning, no error. Inherited from governance.md.

### Two seeded organizations

| path | realm | appointing authority | positions |
|---|---|---|---|
| the Compact | `ooc` | `{kind:'committee', parcel:'/'}` | `communications-director` |
| the Office of the Prime Minister | `world` | `{kind:'office', office:'prime-minister'}` | `communications-director`; `press-secretary` **reportsTo** it |

Both ship **unfilled**. ⚠ The Office of the Prime Minister also ships with
nothing to announce — no legislature, no bills, no policy — so its
releases are whatever is written in character. Cold start is content, not
mechanism: no NPC outlet, no seeded demo release, no synthetic floor.

### Where a release lives, and who writes it

`kind: 'release'`, path `<feedPath>/<id>`, `owner` = the publisher
organization, `data` = headline, body, kind, source, publishedAt,
expiresAt, pinned, retracted, and the optional visibility narrowing.
`realm` is **not stored** — it derives from the publisher, so there is one
source rather than a copy that can drift.

⚠ **The write must be owner-stamped as the publisher, not as the acting
player.** `DocumentApi.save` gates on self-home / covering zone /
slice-walk, which admits the *parcel owner* — not the comms director.
Making every comms director a landowner is obviously wrong, so the press
path writes through a **narrow named transport** with `mayPublishAs` as
the authoritative check, the way `PersistableApi` routes capture as the
owning principal. **That seam is an ownership bypass by construction**; it
is gated to a single calling module and never takes a caller-supplied
owner — it takes the publisher it just authorized.

### Placement is configuration; permission is visibility

An AppSettings key names which publisher organizations the anonymous
surface serves. ⚠ **`AppApi.setting()` returns a `string`** — no array
type — so it is a comma-separated list. **An unresolvable entry warns at
boot**: a typo would empty the front page with no signal, and "looking
deliberate while empty" is precisely this surface's failure mode.

**Two independent filters.** Front-page membership is *placement*;
visibility is *permission*. A publisher can be public and off the front
page; a listed publisher can still have a members-only release.
Collapsing them makes placement imply permission.

### Visibility narrows, never widens

> **A release may be more private than its publisher. It may never be more
> public.**

⚠ **Existing content becomes public when the route goes live.** Whatever
survives the migration inherits the Compact publisher and public
visibility — intended, but a one-way door on content nobody wrote for an
anonymous audience. See the deploy step.

### The public read is its own route, and serves the window

A route whose entire contract is *"public, anonymous, no credentials"* is
much harder to widen by accident than a flag on the archive. It reads no
session, sets no cookie, and **serves the warm window — no `before`
cursor, no paging**. A press room is not an archive.

## Constraints

- ⚠ **Employment records and money movement stay independent.**
  `postTransaction` is the banking chokepoint and takes no employment
  argument. **Do not couple them** — paying someone with no record must
  remain identical to paying an employee off-book, which is what makes
  paying under the table an emergent act rather than an unmodellable one.
- **`Employment`'s status vocabulary is unchanged**, and the
  quit/fired-suppresses-roster rule must survive the generalization — an
  exit is never resurrected.
- **The `EmployedMixin` participant contract moves with the counterparty**,
  keeping the relational `where` that requires the written record key to
  be the calling organization's own path.
- **New mixins are registered in `lib/mixin.ts`'s `Mixins` constants.**
- **Placement**: `OrganizationMixin` in `lib/employment/` with
  `employment.md` growing, rather than a new subsystem folder — "prefer
  fewer directories".
- **Nothing instances `/lib/`** (`pnpm lint:instanceable`).
- **The Api ↔ logic-singleton split holds** for every touched pair.
- **Actor from context**, never a parameter.
- **Office, seat and committee reads go through `CompactApi` /
  `GovernmentApi`**; registries are not reachable directly.
- **`GroupApi.isMember` takes a `playerId` string**, so committee
  resolution narrows with `PlayerApi.isAvatarStuff` first.
- **The import boundary holds**; route code lives in `backend/`.
- **Wire types live in `@saxonberg/types`**; the press-release row is a
  distinct exported type.
- ⚠ **`NewsTickerPane.tsx:242` fetches relative** with no Vite dev proxy,
  so "Load older" fails in development — **fix in passing**.
- **Do not run `prettier --write`** across untouched files.

## Acceptance criteria

**The substrate**

1. `who holds position P in organization O?` and `what does actor A hold?`
   answer identically for a Business, a non-trading organization and a
   publisher organization.
2. All five appointing-authority kinds resolve, each admitting and
   refusing correctly.
3. ⭐ **Staff follows the seat**: with an `{kind:'office'}` authority,
   reassigning the office moves who may appoint, with **no employment or
   roster record touched**.
4. `Position.reportsTo` and organization parentage are readable;
   `press-secretary` resolves as reporting to `communications-director`.
   Cycles are refused at read, not looped on.
5. A wage-0 position is valid and holdable.
6. **The appointment verb** fills a position when invoked by a holder of
   the organization's appointing authority, and is refused otherwise.
7. **No new `isFounder` call site exists** — grep-asserted in review; the
   only consumers remain `requiresFoundingAuthority` and
   `isCommitteeMember`.
8. ⚠ **The appointing authority cannot publish by virtue of being the
   authority.** A committee member who holds no publishing position is
   **refused** — the explicit negative for decision 2.

**Existing behavior survives the factoring**

9. The Terminus Registry Business, `Government.departments`,
   `Government.seats` and `holdsSeat` resolve unchanged, including the
   quit/fired-suppresses-roster rule.
10. Dave's Bar hire/shift/wage/tip behavior is unregressed.
11. ⚠ **Money movement remains independent of employment**: a transfer
    succeeds between two actors with no employment record, and nothing in
    `postTransaction` consults employment.

**Storage**

12. A published release is a `StoredDocument` with `kind: 'release'`,
    `owner` = the publisher organization, under that publisher's feed
    path.
13. ⚠ **The write transport cannot be used to stamp an arbitrary owner** —
    it is callable only from its one gating module, and takes the
    authorized publisher rather than a caller-supplied owner.
14. **The `bulletins` collection has no remaining reader or writer.** The
    in-world ticker, the archive read and the connect-time window all read
    the tree with unchanged behavior.

**Publishing**

15. **Entitlement**: a publishing-position holder may publish; a
    non-publishing position-holder, an unrelated actor, an unresolvable
    organization and a cold catalogue are all **refused**. A refusal
    **writes nothing at all**.
16. `realm` derives from the publisher and cannot be supplied.
17. A release cannot be more public than its publisher.
18. A `repost` release round-trips its `source`.

**The read path and the surface**

19. `GET` the press-room route with **no session cookie** returns the
    window, `200`, for a caller that has never authenticated.
20. It returns **only** public-visibility releases from publishers named in
    the front-page setting; a release from an unlisted publisher is absent
    from it and present in the authenticated archive. An unresolvable
    front-page entry is skipped and logged.
21. It accepts a bounded `limit` and **rejects** paging (`before` → 400).
22. The press-release row carries the publisher label and `source` and
    **does not carry `author`** — asserted against a frozen key set.
23. The start screen renders the press room for an anonymous visitor;
    sign-in and guest controls render and function with it present, empty
    and failing.
24. "Load older" in the ticker pane works in development.

**The whole chain**

25. ⭐ **The cold-box walk**: on a database with an **empty `core` group**
    and no manual group edits, a logged-in founder can appoint themselves
    to the Compact's `communications-director` position, publish, and have
    the release appear on the anonymous route. **One test that walks the
    whole chain** — the two breaks it exists to catch were each invisible
    to tests that passed in isolation.
26. The same walk for a non-founder with no committee membership, no
    office and no position: refused at the appointment step.

**Tests / docs / live**

27. Vitest, colocated, covering every AC above, and in particular: the
    authority-kind matrix (2); staff-follows-the-seat (3); the authority
    **cannot** publish (8); the entitlement matrix (15); the clamp
    **including the non-widening direction** (17); the frozen row key set
    (22); the regression net for (9), (10), (11).
28. `pnpm lint`, `pnpm lint:imports`, `pnpm lint:module-scope`,
    `pnpm lint:gates`, `pnpm lint:instanceable`, `pnpm build`, `pnpm test`
    pass.
29. [employment.md](../subsystems/employment.md) is expanded — the
    organization/business split, what moved, the appointing authority and
    its five kinds, nesting, the appointment verb, and the independence of
    employment from money movement.
30. `press.md` (renamed from `bulletin.md`) covers the press-release form,
    `PublisherMixin`, appointment-vs-exercise, the tree storage and the
    write transport, the clamp, derived `realm`, `repost`, the route, the
    front-page setting and the start-screen surface.
    [document-store.md](../subsystems/document-store.md) gains the
    `release` kind and the named transport.
31. [governance.md](../subsystems/governance.md) and
    [civics.md](../subsystems/civics.md) record that seats point at
    positions on organizations. ⚠ civics.md's stale
    `lib/civics/Government.ts` is corrected to `obj/Government.ts`.
32. [gazette-slate](../slates/builds/gazette-slate.md) has **Wave 1 struck
    and replaced**; [press-slate](../slates/builds/press-slate.md) records
    that a newspaper is an organization that trades and publishes, and
    that *"who is the editor in chief?"* is the same read as *"who is the
    comms director?"*
33. Verified **by driving it**: sign out in a real browser, read a real
    release on the start screen, and confirm the empty and server-down
    states look deliberate.

## The deploy step

⚠ Two things converge here and are handled as one act. The `bulletins`
collection retires with **no migration script**, and everything that
survives becomes **publicly readable**. So before the route is exposed:
read the old collection, decide row by row what should survive and be
public, and **re-post those as releases**. At staff-feed volume this is
minutes, and it folds the migration into the content review the visibility
change requires anyway.

## What this unlocks (not built here)

Once press and government answer the same question: a **press credential**
issued to a position-holder; a **briefing list** that is *"the comms
director of every accredited publisher"*; a **spokesperson relation**
position ↔ position; a **FOIA request** from a position to a position; and
**Corpos** gaining a chart so *"who runs Veshko?"* becomes answerable.
None is expressible while positions live only on Businesses.

## Cross-references

**Seeding slates** — [gazette-slate](../slates/builds/gazette-slate.md),
[press-slate](../slates/builds/press-slate.md),
[legal-code-slate](../slates/builds/legal-code-slate.md) (the storage sort
rule), [vocations.md](../vocations.md).

**Owning subsystem docs** —
[employment.md](../subsystems/employment.md),
[document-store.md](../subsystems/document-store.md), `press.md`.

**Load-bearing context** —
[governance.md](../subsystems/governance.md),
[civics.md](../subsystems/civics.md),
[grouping.md](../subsystems/grouping.md),
[access.md](../subsystems/access.md),
[parcel.md](../subsystems/parcel.md),
[banking.md](../subsystems/banking.md),
[persistence.md](../subsystems/persistence.md) (the write-as-owner
precedent), [corpo.md](../subsystems/corpo.md),
[client-shell.md](../subsystems/client-shell.md),
[app-settings.md](../subsystems/app-settings.md),
[mixins.md](../subsystems/mixins.md),
[call-security.md](../subsystems/call-security.md).
