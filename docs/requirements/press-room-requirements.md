# Press room — requirements

**The launch gap, closed, and the substrate generalized.** Everything the
project publishes today is invisible to anyone who has not signed in: the
live fan needs an Avatar, the initial window rides the post-auth
connection payload, the archive route is `requireAuth`, and the pane is a
tab in the post-login cockpit. A visitor arriving from the video, the
manifesto, or the homepage sees nothing.

The immediate use case is small and concrete: **announcements reaching
people who land on mud.panterasbox.com.** The build is sized to that, but
the *model* is built to fit the industries design — because the same
substrate has to carry a municipal press office later, and a newspaper
after that, without being rebuilt.

The form is a **press release**, issued by an office, in a press room —
the White House press office. Not a blog, not a substack, not a newsroom.

Seeded by [gazette-slate](../slates/builds/gazette-slate.md) Wave 0 —
**and it supersedes that slate's Wave 1**. Grows
[bulletin.md](../subsystems/bulletin.md), the owning subsystem doc.

## The doctrine this cycle settled

### 1. The state issues press releases. It does not report.

A press release and a publication are different objects, and conflating
them is what sent the gazette slate's Wave 1 wrong:

| | a press release | a publication |
|---|---|---|
| attribution | **the issuing office** | a byline a person answers for |
| direction | issued to a **press room** — you come get it | **it arrives** |
| voice | states, announces, confirms | asserts, argues, interprets |
| subscription | none | the whole point |

**Wave 1's herald seat is struck**, not deferred: it proposed a state
*newsroom*, an office whose job was reporting on the world. It also
contradicted [civics.md § The two staffs (never
merged)](../subsystems/civics.md) — the Office apparatus is
code-authored **singular** seats with no per-locality axis, while diegetic
seats are employment positions; "a seat on the Office substrate, scoped to
a locality" cannot be both, and the slate asserted both.

⭐ **The press-release form makes events-not-significance structural.** A
release states what an office did; it has no standing to say what it
meant. **An office can announce; only a publisher can interpret.**

⚠ **A press room is not a newsroom.** That distinction is what lets the
Communications Director exist without reviving the herald: a press office
speaks for **itself**; a newsroom reports on **others**.

### 2. Authority checks offices. It never checks the founder.

> **The founder value's only function is being the default holder of
> every office.**

This is already how the codebase works and this build must not erode it.
`requiresGovernor` resolves `CompactApi.holdsOffice(giver,
'central-bank-governor')` with no founder check anywhere in it; founder-ness
enters only inside `OfficeRegistry.holdsOffice` as the default.

`isFounder` has exactly **two** legitimate call sites, both the pool-of-one
backstop rather than a capability check:

- `requiresFoundingAuthority` — gates `office assign`/`vacate`, defended in
  governance.md as *"the one power that sits above the office system is
  the power to constitute the government itself."*
- `CompactLogic.isCommitteeMember` — founder-default **OR**
  `GroupApi.isMember(playerId, committee.groupRef)`.

**This build adds no third.**

### 3. Authority routes through a group; the office manages the group

⭐ `isCommitteeMember` is the pattern, generalized. A publisher's authority
is not "hold the seat" — it is:

```
mayPublishAs(principal, publisher) =
     holds(publisher.managedBy)     // the office/seat holder; founder-default rides this
  || isMember(publisher.staff)      // the desk
```

**This is what makes authority non-exclusive.** An Office is singular by
design (`Office` carries no cardinality), but a press office needs staff —
so the seat-holder runs the shop and a named group is the desk. It is also
why the **Press Secretary is not a second Office**: they are a member of
the staff group, which makes "reports to the Communications Director"
mechanically real without giving the apparatus a reporting hierarchy it
does not model.

### 4. Any government can have a press office; a feed is just a feed

`managedBy` is **polymorphic over the two staffs**, and that is what makes
the abstraction real:

| | the Compact | a diegetic government |
|---|---|---|
| `managedBy` | `{kind:'office', office:'communications-director'}` | `{kind:'seat', government:…, seat:…}` |
| resolved by | `CompactApi.holdsOffice` | `GovernmentApi.holdsSeat` |

Neither substrate learns about the other — **one abstraction over the two
staffs, not a merge.**

And **a publisher does not know whether it is on the front page.** Which
publishers the pre-login surface shows is configuration. A municipal press
office is then genuinely just *a feed*: readable, local, and nowhere near
the app's front door unless someone puts it there.

## Goals

- **A visitor who has never signed in can read the press room.** No
  account, no guest session, no WebSocket.
- **The start screen carries it**, MML rendered, **degrading
  deliberately** when empty or unreachable.
- **A `communications-director` Office is minted** on the apparatus,
  founder-default like every other seat.
- **`Publisher` is authored content** — a data Idea + catalogue on the
  Corpo/Government recipe — so a new press office is a YAML row, not a
  code change.
- **Publishing authority is `holds(managedBy) OR isMember(staff)`**, with
  `managedBy` resolving through either staff substrate.
- **Which publishers appear on the pre-login surface is configuration**,
  not a property of the publisher.
- **Visibility is declared by the publisher**, narrowable per release,
  **never widenable**.
- **`realm` is derived from the publisher**, not supplied.
- **Reposting is a release kind** — `repost` plus a `source` line.
- The shipped authenticated surfaces keep working unchanged.

## Non-goals

- **No herald seat and no state newsroom.** Struck.
- **No second Office.** The Press Secretary is a staff-group member.
- **No diegetic publisher is seeded.** The `{kind:'seat'}` authority
  branch is built and unit-tested; the first municipal press office
  authors itself as content. Accepted risk: an untravelled path in
  content.
- **No group write path, and no office-owned group.** The staff group is
  an ordinary managed `Group`, named on the publisher record and
  administered through the existing group substrate. ⚠ **The staff roster
  does not automatically follow the seat on handover** — a real gap,
  recorded as a deferral, and not one this build's use case feels
  (`GroupApi` is read-only today: `membersOf` / `roleOf` / `isMember` /
  `sharedManagedGroups` / `onMembershipChange` / `parseRef` / `registry`).
- **No verb-affordance widening.** The `bulletin` verb is afforded through
  `AuthorMixin`, so a non-author office-holder cannot reach it — but that
  person **cannot currently exist**: the founder holds every seat by
  default and is an author, and governance.md records `office assign` as
  broken (*"cannot find an online player"*). Widening machinery for a
  principal the engine cannot produce is speculation; it lands when that
  is fixed.
- **No generic `requiresOffice` validator.** governance.md defers it to
  the second office-gated **verb**; this gates a **publisher** inside the
  logic. Still deferred.
- **No docket.** Twelve of its fifteen kinds need bills, conviction
  crossings and the Roll, none of which are built.
- **No annotation or fact-check layer.**
- **No Saxonberg.** Also blocked independently: `ParcelRecord.allowance`
  is an inert seam and the allowance cascade is unbuilt.
- **No press-build surface**: no subscription, no push, no byline, no
  credibility track record, no paywall, no `/feed/<publisher>/`. See the
  overlap table below — the substrate is shaped so those are additive.
- **No permalinks, `og:` tags, RSS or email.**
- **No CORS work and no panterasbox.com consumer.** The surface is the
  start screen — same-origin in production, `SERVER_URL` in dev.
- **No rename migration.** The stored row stays `Bulletin` in the
  `bulletins` collection even though the form is now a press release. A
  full rename is its own standalone migration, like the pending
  `domain`→`content` one.

## Surface decisions

### The Communications Director

One new entry on `OFFICE_APPARATUS`:

| key | displayName | branch | origin |
|---|---|---|---|
| `communications-director` | Communications Director | `executive` | `founder-established` |

**Executive** because communications is an executive function, and
**founder-established** because it is ordinary law the polity may later
charter, replace or abolish — the Central Bank Governor's shape exactly.
It is founder-default like every seat, and it is checked with
`holdsOffice`, never with `isFounder`.

### `Publisher` as a data Idea

The Corpo/Government recipe: a pure-data leaf `Idea` read from
`template.data`, never cloned live, templates at `/obj/Publisher/<key>`,
with a boot-warmed `PublisherCatalogue` singleton. Every non-identity
field is a **durable string reference into an existing substrate, never a
live ref** — civics.md's rule for `Government`, and it applies verbatim.

| field | meaning |
|---|---|
| `key` | the durable join — a release stores this |
| `displayName` | what a reader sees attributed |
| `realm` | `ooc` or `world` — stamped onto its releases |
| `visibility` | `public` or `members` — the default for its releases |
| `managedBy` | the authority ref: office or seat |
| `staff` | optional `GroupRef` — the desk |

⚠ **Catalogue invalidation matches Government's**: no auto-invalidate on
template churn beyond HMR re-clone, so a CMS edit to a Publisher template
needs `dest /obj/PublisherCatalogue`. Inherited limitation, recorded not
solved.

**One publisher is seeded**: `compact` — the Compact, `ooc`, `public`,
managed by `communications-director`.

### The pre-login surface is configured, not declared

An AppSettings key names which publishers the anonymous surface serves.
⚠ **`AppApi.setting()` returns a `string`** — there is no array type — so
this is a comma-separated key list parsed by the logic, consistent with
every other setting. Seeded with `compact`.

This is the mechanism behind "a feed you can display anywhere": a
publisher is readable on its own terms, and *placement* is somebody else's
decision.

### The publisher is supplied and verified, not derived

An earlier draft derived the publisher from the acting principal. **That
does not survive plural publishers** — the founder holds every office by
default and is therefore entitled to all of them, so derivation is
ambiguous exactly where it matters.

So the publisher is a **parameter, checked against entitlement**. Same
shape governance already uses: *"the appointer is never a parameter; only
the resolved appointee playerId is"* — actor from context, target as a
parameter. **An unentitled publish is refused and writes nothing**; there
is no fallback to a publisher the caller *is* entitled to, because
silently publishing under a different mark than the one asked for is worse
than failing.

### `realm` is derived; visibility narrows, never widens

`realm` was carrying three unrelated jobs. After this build:

| concern | where it lives |
|---|---|
| authority | the publisher's `managedBy` + `staff` |
| visibility | the publisher, narrowable per release |
| framing | the publisher's `realm` — **stamped at publish, not supplied** |

It leaves `PublishRequest` and `BulletinPatch` entirely, while remaining a
stored, indexed field (existing rows, archive filters, the client chip).

> **A release may be more private than its publisher. It may never be more
> public.**

⚠ **This makes existing rows public on deploy.** Every bulletin already
stored inherits `compact` / `public`. Intended — the `ooc` realm is
already *"identical for every viewer, no per-viewer lensing"*, which is
what makes it safe — but the collection must be **reviewed before the
route goes live**. A deploy step, not a code path.

### Repost is a kind

One entry on the kind vocabulary (`changelog · decision · event · notice`
→ **`+ repost`**) plus an optional free-text `source` line, with the body
carrying what is quoted. Deliberately **not** a structured source: there
are no other publishers to point at yet. When there are, a repost is a
release whose `source` names another Publisher — the same field, given a
type.

### The public read is its own route, and serves the window

**Its own route**, not a flag on the archive: a route whose entire
contract is *"public, anonymous, no credentials"* is much harder to widen
by accident. It reads no session and sets no cookie.

**It serves the live window from the warm `BulletinBoard` cache — no
`before` cursor, no paging.** A press room is not an archive. This caps
the cost of an anonymous endpoint on an underpowered box at one in-memory
read, and keeps scrollback something you get by signing in.

### Cold start is content, not mechanism

No NPC outlet, no seeded demo release, no synthetic floor. The press room
is non-empty at launch because **real releases get written**.

## The overlap with the press build, designed now

Out of scope, but the substrate is shaped for it:

| | press office (this build) | a publication (press build) |
|---|---|---|
| identity | `Publisher` | **the same `Publisher`** |
| authority | `managedBy` + `staff` group | **the same**, with a committee appointment as a third `managedBy` kind |
| the post | a release | the same Document shape |
| the feed | a query you display anywhere | **the same query**, plus subscription |
| adds | — | push, byline, credibility, paywall, `/feed/<publisher>/` |

**Everything structural is shared; the press build adds delivery and
accountability.** A player-run paper is a `Publisher` whose `managedBy` is
a committee appointment — the third appointment mechanism, alongside
Office seats and `Government.seats` positions. It slots in without
touching this build's substrate.

## Constraints

- **`Bulletin` is a `Document`, not a Stuff.** New fields go in
  `static fieldMeta` with class defaults; missing fields on existing rows
  read as those defaults. Timestamps stay **epoch-ms numbers**.
- **`Publisher` is a Stuff.** Class in `obj/`, templates under
  `/obj/Publisher/`, catalogue at `/obj/PublisherCatalogue` — the
  `Government`/`GovernmentCatalogue` layout, which is where those actually
  live post-refactor (`obj/Government.ts`, `obj/GovernmentCatalogue.ts`).
  **Nothing instances `/lib/`** (`pnpm lint:instanceable`).
- **No new subsystem folder.** `lib/bulletin/` keeps the vocabularies;
  "prefer fewer directories" applies.
- **`BulletinApi` ↔ `BulletinLogic` stays split.** The Api is the thin
  gated forwarding shell; the logic singleton at `/obj/api/bulletin` is the
  hot-reload boundary. The route never touches a registry directly.
- **Actor from context.** Entitlement resolves its principal from
  execution context, never a parameter.
- **Office and seat reads go through their facades** — `CompactApi` and
  `GovernmentApi`. `OfficeRegistry` is not reachable from here.
- **`GroupApi.isMember` takes a `playerId` string**, so the entitlement
  path narrows with `PlayerApi.isAvatarStuff` first — the
  `isCommitteeMember` precedent.
- **The import boundary holds.** Route code lives in `backend/`; nothing
  under `src/mud/` gains an outside import.
- **Wire types live in `@saxonberg/types`**; the press-release row is a
  distinct exported type.
- **Server owns all semantics.**
- ⚠ **`NewsTickerPane.tsx:242` fetches relative** and there is no Vite dev
  proxy, so "Load older" fails in development. Pre-existing, one line —
  **fix in passing**.
- **Do not run `prettier --write`** across untouched files.

## Acceptance criteria

**Governance**

1. `communications-director` appears on the public office roster with the
   founder as default holder, and `holdsOffice` answers for it.
2. **No new `isFounder` call site exists.** Asserted by grep in review:
   the only consumers remain `requiresFoundingAuthority` and
   `isCommitteeMember`.

**Publisher + authority**

3. A seeded `compact` Publisher resolves from the catalogue with its
   realm, visibility and `managedBy`.
4. **Entitlement is enforced both ways**: the `communications-director`
   holder may publish as `compact`; a player who is neither the holder nor
   in the staff group is refused. A refusal **writes nothing at all** —
   never a fallback to another publisher.
5. A staff-group member who holds **no** office may publish — the
   non-exclusivity that motivated routing through a group.
6. The `{kind:'seat'}` authority branch resolves through
   `GovernmentApi.holdsSeat` and admits/refuses correctly. Unit-tested
   against a constructed government; no content is seeded.

**Releases**

7. `realm` is stamped from the publisher and cannot be supplied.
8. A release cannot be more public than its publisher.
9. A `repost` release round-trips its `source` through publish, the public
   row and the authenticated row.
10. Bulletins persisted before this build load with `publisher = compact`
    and public visibility, with **no migration script**.

**The read path**

11. `GET` the press-room route with **no session cookie** returns the
    window, `200`, for a caller that has never authenticated.
12. It returns **only** releases whose effective visibility is public, and
    **only** from publishers named in the front-page setting. A release
    from an unlisted publisher is absent from it and present in the
    authenticated archive.
13. It accepts a bounded `limit` and **rejects** paging (`before` → 400).
14. The press-release row carries `publisher`, `publisherLabel` and
    `source`, and **does not carry `author`** — asserted against a frozen
    key set, so a future field addition cannot leak silently.

**The surface**

15. The start screen renders the press room for an anonymous visitor;
    sign-in and guest controls render and function with it present, empty
    and failing.
16. Existing authenticated surfaces are unregressed: the live
    `world.bulletin.feed` fan, the connection payload's `bulletinWindow`,
    `GET /api/bulletins/archive`, `NewsTickerPane`.
17. "Load older" in `NewsTickerPane` works in development.

**Tests / docs / live**

18. Vitest, colocated, covering: the entitlement matrix including refusal
    and the staff-only case (4, 5, 6); the visibility clamp **including
    the non-widening direction** (8); realm stamping (7); the frozen row
    key set (14); legacy-row defaults (10); anonymous access and the
    front-page filter (11, 12).
19. `pnpm lint`, `pnpm lint:imports`, `pnpm lint:module-scope`,
    `pnpm lint:gates`, `pnpm lint:instanceable` and `pnpm build` pass.
20. [bulletin.md](../subsystems/bulletin.md) is expanded — the press-room
    framing, the Publisher substrate, the authority model, the clamp,
    derived `realm`, the `repost` kind, the route, the front-page setting,
    and the start-screen surface. A header note records that the stored
    row is still a `Bulletin` and why the rename is deferred.
21. [governance.md](../subsystems/governance.md) records the
    Communications Director and the press office as the Office substrate's
    **second wired authority consumer**, noting it gates a publisher, not
    a verb.
22. [gazette-slate](../slates/builds/gazette-slate.md) has **Wave 1 struck
    and replaced**, reasons carried over; Wave 0 marked shipped.
23. [press-slate](../slates/builds/press-slate.md) records the shared
    substrate and the overlap table above, so the press build starts from
    it rather than re-deriving it.
24. Verified **by driving it**: load the start screen signed out in a real
    browser and read a real release; confirm the empty and server-down
    states look deliberate.

## Cross-references

**Seeding slates** — [gazette-slate](../slates/builds/gazette-slate.md)
(Wave 0; Wave 1 superseded), [press-slate](../slates/builds/press-slate.md).

**Owning subsystem doc** — [bulletin.md](../subsystems/bulletin.md).

**Load-bearing context** —
[governance.md](../subsystems/governance.md) (the apparatus, the founder
default, `holdsOffice`, the open `office assign` bug),
[civics.md](../subsystems/civics.md) (the two staffs; the data-Idea +
catalogue recipe; `holdsSeat`),
[grouping.md](../subsystems/grouping.md) (`GroupRef`, the provider
contract, the read-only `GroupApi`),
[access.md](../subsystems/access.md) (the committee; the author axis),
[corpo.md](../subsystems/corpo.md) (the data-Idea/catalogue recipe),
[client-shell.md](../subsystems/client-shell.md),
[app-settings.md](../subsystems/app-settings.md),
[message-rendering.md](../subsystems/message-rendering.md),
[help.md](../subsystems/help.md), [call-security.md](../subsystems/call-security.md).

**Not in this cycle, referenced** —
[saxonberg-city-slate](../slates/builds/saxonberg-city-slate.md),
[legal-code-slate](../slates/builds/legal-code-slate.md),
[stewardship-slate](../slates/builds/stewardship-slate.md).
