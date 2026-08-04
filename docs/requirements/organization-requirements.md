# Organizations — requirements

**The org chart, factored out of Business — and the press room as its
first consumer.**

The build has two halves, deliberately coupled: a substrate that answers
*"who holds position P in organization O?"* uniformly across governments,
businesses and publishers; and the **press room** — press releases,
publicly readable on the start screen — which is what proves the
substrate by using it rather than by testing it.

The immediate practical need is small and concrete: **announcements
reaching people who land on mud.panterasbox.com**, none of which is
visible today (the live fan needs an Avatar, the initial window rides the
post-auth connection payload, the archive route is `requireAuth`, and the
pane is a post-login tab). The substrate is not sized to that need — it is
sized to the industries design, because the same question has to be
answerable of a newspaper and a ministry before press and government can
interact at all.

Seeded by [gazette-slate](../slates/builds/gazette-slate.md) (Wave 0;
**its Wave 1 is superseded here**) and
[press-slate](../slates/builds/press-slate.md). Grows
[employment.md](../subsystems/employment.md) and
[bulletin.md](../subsystems/bulletin.md).

## The governing decision

> **Business models participation in the economy. An organization models
> the chart. Business currently carries both, and that is the
> conflation.**

The shipped code strains at this in three places already:

- **`Government.departments` are Business templatePaths.** Terminus must
  stand up a *Business* just to have a Registry with a Magistrate seat. A
  registry does not trade; it is a Business because that is where
  positions live.
- **`Corpo` cannot answer who runs it.** A megacorp with a sector, an
  ethos and rivals, and no chart.
- **Personal staff has nowhere to live at all** — which is what surfaced
  this: a Communications Director is *not* an office. Offices head
  institutions and are prescribed by law; a comms director is the
  principal's personal staff, serves at pleasure, and is prescribed by
  nothing.

So the concept is an **organization**: an identity with **positions**,
**holders**, and an **appointing authority**, answering one question
uniformly — *who holds position P in organization O?* — and its inverse,
*what does actor A hold, anywhere?*

Everything then composes instead of duplicating:

| | organization | plus |
|---|---|---|
| a Business | ✔ | trade — account, wage settlement, venue |
| a government department | ✔ | — (that is the whole point) |
| a Corpo | ✔ (later) | a mark |
| a press office | ✔ | publishing |
| a newspaper | ✔ (later) | trade + publishing |

### The seat/staff line, now expressible

| | prescribed by law? | modeled as |
|---|---|---|
| Compact **Office** | yes | `OFFICE_APPARATUS` |
| government **seat** | yes | a `Government.seats` entry **pointing at a position** |
| **personal staff** | **no — serves at pleasure** | **a position nobody points at** |

⭐ **The difference between a seat and staff is whether a constitutional
document points at the position.** Same substrate; the pointer is the law.
Serving at pleasure is `fire` being unconditioned, which the employment
transitions already provide.

**This is why no `communications-director` Office is minted.** An earlier
draft of this cycle proposed one; it was wrong for exactly the reason
above, and the correction is what produced this substrate.

### And it dissolves the meta/diegetic wrinkle

An earlier draft asked whether the Compact's press office had to be a
*Business* — an out-of-fiction institution wearing a commercial word. It
does not. It is an organization that does not compose `BusinessMixin`.
Compensation remains available to state offices (it is a conserved
economy; everyone needs money), but it arrives by *also* being a
Business, never by definition.

## Goals

### The substrate

- **`OrganizationMixin`** carries positions, holders and an appointing
  authority. `BusinessMixin` composes it; trade stays on Business.
- **`who holds P in O?` and `what does A hold?` are single uniform reads**,
  identical whether O is a ministry, a shop or a paper.
- **The appointing authority is polymorphic**, so a Compact officer, a
  parcel committee, a government seat-holder, an operator, or an ordinary
  person can all be one:

  | kind | resolves through |
  |---|---|
  | `entity` | templatePath match — today's `proprietorPath` |
  | `office` | `CompactApi.holdsOffice` |
  | `seat` | `GovernmentApi.holdsSeat` |
  | `committee` | `CompactApi.isCommitteeMember` |
  | `author` | `AccessApi.isAuthor` |

- ⭐ **Staff follows the seat.** Because the appointing authority *is* the
  office, a handover moves the staff relationship with it — no roster
  migration, and the gap an earlier draft had to defer disappears.
- **Positions and organizations both nest**: `Position.reportsTo` and an
  organization's parent. "Press Secretary reports to the Communications
  Director" becomes mechanism, not documentation.
- **One holder relation.** `Employment`'s counterparty generalizes from a
  Business to an organization; wage and shifts stay optional. A volunteer
  is a wage-0 employee. This is already how `Government.seats` resolve —
  `holdsSeat` walks `Employment` records — so it keeps one thing
  consistent rather than introducing a second.

### The press room

- **`PublisherMixin`** on an organization — realm, default visibility, and
  which positions may publish. A publisher is a *face an organization
  wears*, not a separate entity.
- **A visitor who has never signed in can read the press room**: a plain
  unauthenticated HTTP read, surfaced on the start screen, MML rendered,
  **degrading deliberately** when empty or unreachable.
- **Publishing authority is `holds the appointing authority` OR `holds a
  publishing position`** — the non-exclusivity that personal staff
  requires.
- **Visibility is declared by the publisher**, narrowable per release,
  **never widenable**. **`realm` is derived from the publisher**, not
  supplied. **Reposting is a release kind** with a `source` line.
- **Which publishers the pre-login surface shows is configuration**, not a
  property of the publisher — so a municipal press office is readable,
  local, and nowhere near the app's front door.

## Non-goals

- **No new Office.** The Communications Director is a position.
- **No Corpo migration.** Corpos are the obvious next consumer of
  `OrganizationMixin`; wiring them is not this build.
- **No municipal press office seeded.** The `{kind:'seat'}` authority
  branch is built and unit-tested; the first one authors itself as
  content. Accepted risk: an untravelled path in content.
- **No consent model, and no volunteer/slave distinction.** A volunteer is
  a wage-0 employee.
- ⚠ **No coupling between employment records and money movement.** See the
  constraint below — this is a non-goal that has to be actively defended,
  not merely skipped.
- **No press-build surface**: no subscription, no push, no byline, no
  credibility track record, no paywall, no `/feed/<publisher>/`.
- **No verb-affordance widening.** The `bulletin` verb is afforded through
  `AuthorMixin`, so a non-author position-holder cannot reach it — but
  that person cannot currently exist: the founder holds every seat by
  default and is an author, and governance.md records `office assign` as
  broken (*"cannot find an online player"*). It lands when that is fixed.
- **No generic `requiresOffice` validator.** Its trigger is the second
  office-gated **verb**; this gates a publisher inside the logic.
- **No docket**, **no annotation layer**, **no Saxonberg** (also blocked:
  `ParcelRecord.allowance` is an inert seam and the allowance cascade is
  unbuilt).
- **No permalinks, `og:` tags, RSS or email. No CORS work, no
  panterasbox.com consumer.** The surface is the start screen —
  same-origin in production, `SERVER_URL` in dev.
- **No rename migration.** The stored release row stays `Bulletin` in the
  `bulletins` collection. A rename is its own standalone migration, like
  the pending `domain`→`content` one.

## Surface decisions

### `OrganizationMixin`, composed — not a standalone entity

One entity wears its hats: a press office is an organization; a shop is an
organization that also trades. This matches the codebase idiom
(`BusinessEntity extends BusinessMixin(PostRegistrationMixin(Idea))`) and
avoids a hop on every *who-holds-P* read.

**The accepted cost:** an organization and its commercial face can never be
separately owned or transferred. No current consumer wants that.

### What moves, and what stays

| stays on `BusinessMixin` | moves to `OrganizationMixin` |
|---|---|
| `banksAt`, wage settlement, tips | `positions`, `rosterSlots` |
| `operatingLocations` and the room→business index | the holder transitions: hire / end / roster / shift |
| trade and the P&L account | `proprietorPath` → the appointing authority |

**`Position.wageRate` stays on `Position`** — compensation attaches to the
*position*, not the person, which is what makes the roster's
`{positionKey, assignee}` shape right rather than incidental.

⭐ **Existing content keeps working untouched**: because `Business`
composes `OrganizationMixin` and templatePaths do not change,
`Government.departments`, `Government.seats` and `holdsSeat` all continue
to resolve against the Terminus Registry exactly as they do today.

### The appointing authority replaces `proprietorPath`

`proprietorPath` is a templatePath — a *specific entity* — so authority
under it can never be handed off, which is the same defect the
check-the-office doctrine exists to prevent. It becomes the `entity` kind
of a polymorphic reference; `isProprietorOf` dispatches on the tag.

The surface is small: the field on `obj/Business.ts` and
`isProprietorOfImpl` in `EmploymentLogic` are the only non-test call
sites.

### Authority checks positions. It never checks the founder.

> **The founder value's only function is being the default holder of every
> office.**

Already true and this build must not erode it. `isFounder` has exactly
**two** legitimate call sites, both pool-of-one backstops:
`requiresFoundingAuthority` (gating `office assign`/`vacate` — the power
to constitute the government itself) and `CompactLogic.isCommitteeMember`.
**This build adds no third**, and the founder gets every new power
automatically because `holdsOffice` already returns true for them.

### Publishing authority

```
mayPublishAs(principal, organization) =
     holdsAppointingAuthority(organization)   // founder-default rides holdsOffice
  || holdsPublishingPosition(organization)
```

`PublisherMixin.publishingPositions` names which position keys may
publish; empty means any position-holder. This is the non-exclusivity that
motivated the whole design — the Comms Director publishes without being
the PM, and the Press Secretary publishes without being the Comms
Director.

### Two seeded organizations

| path | realm | appointing authority | positions |
|---|---|---|---|
| the Compact | `ooc` | `{kind:'author'}` | — |
| the Office of the Prime Minister | `world` | `{kind:'office', office:'prime-minister'}` | `communications-director`; `press-secretary` **reportsTo** it |

The first is the out-of-fiction operator press office — the platform
talking about itself, and the one that carries content on day one. The
second is the in-fiction executive's, and it is what makes the staff model
real rather than described.

⚠ **The Office of the Prime Minister ships with nothing to announce** —
there is no legislature, no bills, no policy, so its releases are whatever
is written in character. Accepted: cold start is content, not mechanism.
No NPC outlet, no seeded demo release, no synthetic floor.

### Placement is configuration; permission is visibility

An AppSettings key names which publisher organizations the anonymous
surface serves. ⚠ **`AppApi.setting()` returns a `string`** — there is no
array type — so it is a comma-separated list, consistent with every other
setting.

**Two independent filters, deliberately.** Front-page membership is
*placement*; visibility is *permission*. A publisher can be public and off
the front page; a listed publisher can still have a members-only release.
Collapsing them would make placement imply permission — the same
one-field-three-jobs bug this cycle removed from `realm`.

### `realm` derived; visibility narrows, never widens

> **A release may be more private than its publisher. It may never be more
> public.**

`realm` leaves `PublishRequest`/`BulletinPatch` and is stamped from the
publisher, while remaining a stored indexed field.

⚠ **This makes existing rows public on deploy.** Every stored bulletin
inherits the Compact publisher and public visibility. Intended — the `ooc`
realm is already *"identical for every viewer, no per-viewer lensing"* —
but the collection must be **reviewed before the route goes live**. A
deploy step, not a code path.

### The public read is its own route, and serves the window

A route whose entire contract is *"public, anonymous, no credentials"* is
much harder to widen by accident than a flag on the archive. It reads no
session and sets no cookie, and it **serves the live window from the warm
cache — no `before` cursor, no paging**. A press room is not an archive;
this caps an anonymous endpoint on an underpowered box at one in-memory
read.

## Constraints

- ⚠ **Employment records and money movement must stay independent.**
  `postTransaction` is the banking chokepoint and takes no employment
  argument; wage settlement reads employment but nothing in the ledger
  requires it. **Do not couple them.** Paying someone with no record must
  remain identical to paying an employee off-book — that is what makes
  paying under the table an emergent act rather than an unmodellable one.
- **`Employment`'s status vocabulary is unchanged**
  (`employed | on-shift | off-shift | quit | fired`), and the
  quit/fired-suppresses-roster rule in `holdsSeat` must survive the
  generalization — an exit is never resurrected.
- **The `EmployedMixin` participant contract moves with the counterparty**:
  `FromMixin(Mixins.Business)` becomes the organization mixin, keeping the
  relational `where` that requires the written record key to be the
  calling organization's own path.
- **New mixins are registered in `lib/mixin.ts`'s `Mixins` constants** —
  the single source of truth.
- **Placement**: `OrganizationMixin` in `lib/employment/` and
  `employment.md` grows, rather than a new subsystem folder — "prefer
  fewer directories". `PublisherMixin` in `lib/bulletin/`.
- **Nothing instances `/lib/`** (`pnpm lint:instanceable`); seeded
  organizations are templates over concrete `obj/` classes.
- **`BulletinApi` ↔ `BulletinLogic` and `EmploymentApi` ↔
  `EmploymentLogic` stay split** — the Api is the thin gated shell, the
  logic singleton is the hot-reload boundary.
- **Actor from context.** Entitlement resolves its principal from
  execution context, never a parameter.
- **Office, seat and committee reads go through their facades** —
  `CompactApi`, `GovernmentApi`. Registries are not reachable directly.
- **`GroupApi.isMember` takes a `playerId` string**, so the committee
  branch narrows with `PlayerApi.isAvatarStuff` first — the
  `isCommitteeMember` precedent.
- **The import boundary holds**; route code lives in `backend/`.
- **Wire types live in `@saxonberg/types`**; the press-release row is a
  distinct exported type.
- ⚠ **`NewsTickerPane.tsx:242` fetches relative** with no Vite dev proxy,
  so "Load older" fails in development. Pre-existing, one line — **fix in
  passing**.
- **Do not run `prettier --write`** across untouched files.

## Acceptance criteria

**The substrate**

1. `who holds position P in organization O?` and `what positions does
   actor A hold?` answer identically for a Business, a non-trading
   organization, and a publisher organization.
2. All five appointing-authority kinds resolve — `entity`, `office`,
   `seat`, `committee`, `author` — each admitting and refusing correctly.
3. ⭐ **Staff follows the seat**: with an `{kind:'office'}` authority,
   reassigning the office moves who may act as the appointing authority,
   with no change to any employment or roster record.
4. `Position.reportsTo` and organization parentage are readable, and
   `press-secretary` resolves as reporting to `communications-director`.
5. A wage-0 position is a valid, holdable position.
6. **No new `isFounder` call site exists** — asserted by grep in review;
   the only consumers remain `requiresFoundingAuthority` and
   `isCommitteeMember`.

**Existing behavior survives the factoring**

7. The Terminus Registry Business, `Government.departments`,
   `Government.seats` and `holdsSeat` all resolve unchanged, including
   the quit/fired-suppresses-roster rule.
8. Dave's Bar hire/shift/wage/tip behavior is unregressed.
9. ⚠ **Money movement remains independent of employment**: a transfer
   between two actors succeeds with no employment record between them,
   and nothing in `postTransaction` consults employment.

**Publishing**

10. **Entitlement is enforced both ways**: the appointing-authority holder
    may publish; a publishing-position holder who is *not* the authority
    may publish; anyone else is refused. **A refusal writes nothing at
    all** — never a fallback to another publisher.
11. `realm` is stamped from the publisher and cannot be supplied.
12. A release cannot be more public than its publisher.
13. A `repost` release round-trips its `source`.
14. Bulletins persisted before this build load with the Compact publisher
    and public visibility, with **no migration script**.

**The read path and the surface**

15. `GET` the press-room route with **no session cookie** returns the
    window, `200`, for a caller that has never authenticated.
16. It returns **only** public-visibility releases from publishers named
    in the front-page setting. A release from an unlisted publisher is
    absent from it and present in the authenticated archive.
17. It accepts a bounded `limit` and **rejects** paging (`before` → 400).
18. The press-release row carries the publisher label and `source` and
    **does not carry `author`** — asserted against a frozen key set.
19. The start screen renders the press room for an anonymous visitor;
    sign-in and guest controls render and function with it present, empty
    and failing.
20. Existing authenticated surfaces are unregressed: the live
    `world.bulletin.feed` fan, the connection payload's `bulletinWindow`,
    `GET /api/bulletins/archive`, `NewsTickerPane`.
21. "Load older" in `NewsTickerPane` works in development.

**Tests / docs / live**

22. Vitest, colocated, covering: the authority-kind matrix (2); staff
    following the seat (3); the publishing entitlement matrix including
    refusal and the position-only case (10); the visibility clamp
    **including the non-widening direction** (12); realm stamping (11);
    the frozen row key set (18); legacy-row defaults (14); anonymous
    access and the front-page filter (15, 16); and the regression net for
    (7), (8), (9).
23. `pnpm lint`, `pnpm lint:imports`, `pnpm lint:module-scope`,
    `pnpm lint:gates`, `pnpm lint:instanceable`, `pnpm build`, `pnpm test`
    pass.
24. [employment.md](../subsystems/employment.md) is expanded — the
    organization/business split, what moved and why, the appointing
    authority and its five kinds, nesting, and the independence of
    employment from money movement.
25. [bulletin.md](../subsystems/bulletin.md) is expanded — the press-room
    framing, `PublisherMixin`, the entitlement model, the clamp, derived
    `realm`, the `repost` kind, the route, the front-page setting, the
    two independent filters, and the start-screen surface.
26. [governance.md](../subsystems/governance.md) and
    [civics.md](../subsystems/civics.md) record that seats point at
    positions on organizations; governance.md records the press office as
    the Office substrate's second wired authority consumer, gating a
    publisher rather than a verb. ⚠ civics.md's stale
    `lib/civics/Government.ts` path is corrected to `obj/Government.ts`
    while it is open.
27. [gazette-slate](../slates/builds/gazette-slate.md) has **Wave 1 struck
    and replaced**, reasons carried over; Wave 0 marked shipped.
    [press-slate](../slates/builds/press-slate.md) records the shared
    substrate: a newspaper is an organization that trades and publishes,
    and *"who is the editor in chief?"* is the same read as *"who is the
    comms director?"*
28. Verified **by driving it**: load the start screen signed out in a real
    browser and read a real release; confirm the empty and server-down
    states look deliberate.

## What this unlocks (not built here)

Recorded because it is the reason the substrate is worth its cost. Once
both sides answer the same question:

- a **press credential** is issued to a position-holder;
- a **briefing list** is *"the comms director of every accredited
  publisher"*;
- a **spokesperson relation** is position ↔ position;
- a **FOIA request** goes from a position to a position;
- **Corpos** gain a chart, so *"who runs Veshko?"* becomes answerable.

None is expressible today, because positions exist only on Businesses.

## Cross-references

**Seeding slates** — [gazette-slate](../slates/builds/gazette-slate.md),
[press-slate](../slates/builds/press-slate.md),
[vocations.md](../vocations.md).

**Owning subsystem docs** —
[employment.md](../subsystems/employment.md) (the substrate),
[bulletin.md](../subsystems/bulletin.md) (the press room).

**Load-bearing context** —
[governance.md](../subsystems/governance.md),
[civics.md](../subsystems/civics.md),
[grouping.md](../subsystems/grouping.md),
[access.md](../subsystems/access.md),
[banking.md](../subsystems/banking.md) (the `postTransaction`
chokepoint), [corpo.md](../subsystems/corpo.md) (the next consumer),
[client-shell.md](../subsystems/client-shell.md),
[app-settings.md](../subsystems/app-settings.md),
[mixins.md](../subsystems/mixins.md),
[call-security.md](../subsystems/call-security.md).
