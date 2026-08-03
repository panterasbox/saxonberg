# Public feed — requirements

**The launch gap, closed.** Everything the project publishes today is
invisible to anyone who has not signed in: the live fan needs an Avatar,
the initial window rides the post-auth connection payload, the archive
route is `requireAuth`, and the pane is a tab in the post-login cockpit.
A visitor arriving from the video, the manifesto, or the homepage sees
nothing. This build makes the Compact's own feed **publicly readable on
the start screen**, and corrects the data model so that "who published
this" and "who may read it" are first-class rather than inferred from
the `realm` chip.

It is a **publishing** build, not a press build and not a city build.
The press vocation ([press-slate](../slates/builds/press-slate.md)) and
the City of Saxonberg
([saxonberg-city-slate](../slates/builds/saxonberg-city-slate.md)) keep
their own slates and their own cycles.

Seeded by [gazette-slate](../slates/builds/gazette-slate.md) Wave 0 —
**and it supersedes that slate's Wave 1**, per the doctrine decision
below. Grows [bulletin.md](../subsystems/bulletin.md), which is the
owning subsystem doc.

## The doctrine this cycle settled

> **There is no in-fiction state newsroom, ever. The Compact aggregates
> and republishes; it never reports.**

The gazette slate's Wave 1 assumed the opposite — a *herald* seat
publishing a state gazette scoped to a locality. That is struck. Three
reasons, and the third is the one that matters:

1. It contradicted [civics.md § The two staffs (never
   merged)](../subsystems/civics.md). The Office substrate is five
   code-authored **singular** seats with no per-locality axis; diegetic
   seats are employment positions on `Government.seats`. "A seat on the
   Office substrate, scoped to a locality" cannot be both.
2. Saxonberg is a **municipality** — a local government and the address
   a publisher may one day be headquartered at. It is not a metaphor for
   the state; the Compact remains the singular meta institution it
   already is.
3. ⭐ **It makes the events-not-significance rule structural instead of
   aspirational.** The slate wanted a state feed *incapable* of
   editorialising and had no mechanism for it. An aggregator has one by
   construction: its content is pointers and attribution, so **the state
   can cite; only a publisher can claim.**

The Compact's front page is **out-of-fiction**, so its own posts may be
as editorial as they like — that is *us* talking about the software, not
a diegetic institution reporting on the world. The rule binds in-world
publishing, and under this model an in-world state simply never
publishes.

## Goals

- **A visitor who has never signed in can read the Compact's feed.** No
  account, no guest session, no WebSocket — a plain unauthenticated HTTP
  read.
- **The start screen carries the feed** as a real surface, rendering MML
  through the existing renderer, and **degrading deliberately** when the
  feed is empty or the server is unreachable.
- **`publisher` is a first-class field on a bulletin**, distinct from
  `author`. `author` is who wrote it; `publisher` is the mark it goes out
  under.
- **Visibility is declared by the publisher**, not inferred from `realm`.
  A post may narrow its publisher's visibility; it may never widen it.
- **`realm` goes back to carrying exactly one job** — in-fiction vs
  out-of-fiction framing. It stops being consulted for authority and is
  never consulted for visibility.
- **The public projection is its own wire type**, narrower than the
  authenticated one, so widening what an anonymous reader sees is a
  deliberate edit rather than a field that leaked.
- The shipped authenticated surfaces — the live fan, the connection
  payload window, the archive route, `NewsTickerPane` — keep working
  unchanged.

## Non-goals

Each of these was considered this cycle and deliberately left out.

- **No herald seat, no government publishing seat, no office
  attribution.** Struck by the doctrine decision above, not deferred.
- **No docket.** Twelve of the fifteen kinds in
  [legal-code-slate § The docket](../slates/builds/legal-code-slate.md)
  (`tabled`/`crossed`/`vetoed`/`enacted`/…) need bills, conviction
  crossings and the Roll, none of which are built. The docket lands with
  the legislature build that gives it content.
- **No annotation or fact-check layer.** The state attaching a note to a
  republished post — and the press-freedom question that comes with it —
  is its own conversation.
- **No Saxonberg.** Its only claim on this cycle was housing the herald.
  It also has a hard blocker: `ParcelRecord.allowance` is an explicit
  inert seam and the allowance cascade
  ([stewardship-slate](../slates/builds/stewardship-slate.md)) is
  unbuilt, so the slate's "second Compact grant" step cannot be taken.
- **No player publishers, no `/feed/<publisher>/` document tree, no
  subscription, no push.** Wave 2, per press-slate. This build shapes the
  schema so that arrival needs no migration; it does not build it.
- **No permalinks, no `og:` tags, no RSS, no email.** A public read
  surface only.
- **No CORS work and no panterasbox.com consumer.** The surface is the
  start screen, which is same-origin in production and already reaches
  the server via `SERVER_URL` in dev. The marketing-site consumer stays
  available as a later, cheap addition.
- **No nightly-wipe exemption.** No scheduled reset exists in this repo
  or in `.gitlab-ci.yml`; there is nothing to exempt from. Recorded as a
  risk for whenever one is automated.
- **No new authorization axis.** Publishing stays `requiresAuthor`.
- **No paging on the public route.** See the surface decision below.

## Surface decisions

### `publisher` and `author` are different fields, and both stay

`Bulletin.author` is documented today as *"the publisher's durable
`templatePath`"* — one field doing two jobs. Real publications carry
both, and press-slate is explicit that *"the masthead is a person"* and
that a byline is *"something you answer for"*. So:

- **`author`** — who wrote it. Already resolved from execution context
  via `ExecutionContextApi.getActingAuthor`; unchanged.
- **`publisher`** — the mark it goes out under. A closed vocabulary with
  its validation array, following the existing
  `BulletinRealm`/`BULLETIN_REALMS` pattern. One entry today: `compact`.

**The public projection carries the publisher and drops the author.** An
anonymous reader sees *"published by the Compact"*, not an operator's
durable identity string. The authenticated row is unchanged and keeps
both.

Publishers are an authored vocabulary now and become mintable content in
Wave 2. That conversion is a known, accepted future edit; a vocabulary of
one is honest today and a `Publisher` data Idea with one row would not be.

### Visibility is a publisher property; a post may only narrow it

Before this build, `realm` was about to be quietly loaded with three
unrelated jobs — framing, authority, and visibility. Splitting them:

| concern | where it lives after this build |
|---|---|
| framing | `realm` (`ooc` \| `world`) — and nothing else |
| authority | the publisher (today: `compact` publishes via `requiresAuthor`) |
| visibility | the publisher, narrowable per post |

The rule, and it is the invariant the security of this whole build rests
on:

> **A post may be more private than its publisher. It may never be more
> public.**

So `compact` is declared `public`; an individual post may be marked
`members` and drop out of the anonymous read; no post of any publisher
can raise itself above what its publisher declared. Widening is therefore
always a deliberate edit to an authored constant, never a per-row
accident.

⚠ **This makes existing rows public on deploy.** Every bulletin already
in the collection inherits `compact` / `public`. That is intended — the
`ooc` realm is already documented as *"identical for every viewer, no
per-viewer lensing"*, which is precisely what makes it safe to serve —
but the collection must be **reviewed before the public route goes
live**, and any row that should not be public retracted or narrowed
first. This is a deploy step, not a code path.

### The public read is its own route, and it serves the window, not the archive

Two decisions, one of them load-bearing for cost.

**Its own route**, not `realm=ooc` forced onto the existing archive: a
route whose entire contract is *"public, anonymous, no credentials"* is
much harder to widen by accident than a shared handler with a flag. It
reads no session, sets no cookie, and is registered outside
`requireAuth`.

**It serves the live window from the `BulletinBoard` warm cache — there
is no `before` cursor and no paging.** A front page is not an archive.
This caps the cost of an anonymous, unauthenticated endpoint on an
underpowered box at one in-memory read with a bounded limit, and it means
scrollback stays a thing you get by signing in. If public scrollback is
ever wanted it is a new decision, not a parameter someone passes.

### The surface is the start screen

Not the marketing site, and not a standalone SPA route. The start screen
is where someone who clicked "play" already is, it is same-origin in
production, and it needs no CORS.

**The feed must never gate the start screen's primary job.** Sign in and
Play as guest render immediately and independently; the feed fetch is
fire-and-forget and its result is additive. Three states, all of which
must look deliberate:

- **rows** — render pins-first then recency, MML through `MmlRenderer`;
- **empty** — an honest line saying nothing has been published yet;
- **unreachable or errored** — the panel is quietly absent. An anonymous
  visitor never sees an error string, a spinner that never resolves, or a
  broken panel. *An empty feed on the front door is worse than no feed.*

### Cold start is content, not mechanism

There is no NPC outlet, no seeded demo post, and no synthetic floor. The
feed is non-empty at launch because **real posts get written** — the
manifesto and the homepage, once both are published. Nothing in this
build fabricates content to make the surface look alive.

## Constraints

- **`Bulletin` is a `Document`, not a Stuff.** New fields go in
  `static fieldMeta` as persistent entries with class defaults; missing
  fields on existing rows read as those defaults. Timestamps stay
  **epoch-ms numbers, not `Date`** (the `RenownEvent` precedent).
- **No new module category.** The publisher vocabulary and its authored
  visibility are a "Named value-object / vocabulary / registry" per
  CLAUDE.md — either alongside the existing vocabularies in
  `lib/bulletin/Bulletin.ts` or a sibling module in `lib/bulletin/`. No
  free-floating helper module, and no exported helper functions.
- **`BulletinApi` ↔ `BulletinLogic` stays split.** The Api is the thin
  gated forwarding shell; the logic singleton at `/obj/api/bulletin` is
  the hot-reload boundary. Every new read goes through the pair; the
  route never touches `BulletinBoard` directly.
- **Actor from context.** Any new gated surface resolves its principal
  from execution context, never a caller-supplied parameter
  ([call-security.md](../subsystems/call-security.md)).
- **The import boundary holds.** Route code lives in `backend/`; nothing
  under `src/mud/` gains an outside import (`pnpm lint:imports`).
- **Wire types live in `@saxonberg/types`.** The public row is a distinct
  exported type, not a widened `BulletinRow`.
- **Server owns all semantics.** Pin cap, expiry, retraction filtering,
  window length and visibility are resolved server-side; the client
  mirrors display ordering only ([bulletin.md](../subsystems/bulletin.md)).
- ⚠ **`NewsTickerPane` fetches `/api/bulletins/archive` relative**
  (`NewsTickerPane.tsx:242`) while there is no Vite dev proxy, so "Load
  older" hits :5173 and fails in development. Pre-existing, one line, same
  file family — **fix it in passing** using `SERVER_URL` like every other
  client fetch.
- **Prettier config is `.prettierrc.js` as committed**; do not run
  `prettier --write` across untouched files.

## Acceptance criteria

**Behavior**

1. `GET` the public bulletin route with **no session cookie** returns the
   current window as public rows, `200`, for a caller that has never
   authenticated.
2. The same route returns **only** posts whose effective visibility is
   public. A post narrowed to `members` is absent from it and still
   present in the authenticated archive.
3. The route accepts a bounded `limit` and **rejects or ignores** any
   attempt to page (`before`), consistent with "window, not archive".
4. The public row carries `publisher` and **does not carry `author`**.
   Asserted directly, so a future field addition cannot leak silently.
5. A post cannot be more public than its publisher: a row claiming
   broader visibility than its publisher declares resolves to the
   publisher's value.
6. The start screen renders the feed for an anonymous visitor; sign-in
   and guest controls render and function with the feed present, empty,
   and failing.
7. Existing authenticated surfaces are unregressed: the live
   `world.bulletin.feed` fan, the `bulletinWindow` on the connection
   payload, `GET /api/bulletins/archive`, and `NewsTickerPane`.
8. Bulletins persisted before this build load with `publisher = compact`
   and public visibility, with no migration script.
9. "Load older" in `NewsTickerPane` works in development.

**Tests**

10. Vitest coverage, colocated in `__tests__/`, for: the visibility clamp
    (5), the public projection's field set (4), publisher defaulting on
    legacy rows (8), and the route's anonymous access + members-only
    exclusion (1, 2).
11. `pnpm lint`, `pnpm lint:imports`, `pnpm lint:module-scope`,
    `pnpm lint:gates` and `pnpm build` all pass.

**Docs**

12. [bulletin.md](../subsystems/bulletin.md) is expanded — the publisher
    axis, the visibility rule and its clamp, the public route and why it
    has no paging, the start-screen surface, and the corrected job of
    `realm`. It remains the owning source of truth.
13. [gazette-slate](../slates/builds/gazette-slate.md) has **Wave 1
    struck and replaced** with the aggregator doctrine, so no superseded
    state-newsroom design is left sitting in the backlog. Wave 0 is
    marked shipped; Wave 2 is left pointing at press-slate.
14. [press-slate](../slates/builds/press-slate.md) records that the state
    is an aggregator and never a publisher, and that `publisher` +
    visibility already exist when the press build starts.

**Live**

15. Verified **by driving it**, not by the suite: load the start screen
    signed out in a real browser and read a real post; confirm the empty
    and server-down states look deliberate.

## Cross-references

**Seeding slates** —
[gazette-slate](../slates/builds/gazette-slate.md) (Wave 0; Wave 1
superseded here),
[press-slate](../slates/builds/press-slate.md) (the Wave 2 vocation,
untouched).

**Owning subsystem doc** —
[bulletin.md](../subsystems/bulletin.md).

**Load-bearing context** —
[civics.md](../subsystems/civics.md) (the two-staffs doctrine that struck
the herald), [governance.md](../subsystems/governance.md) (the Office
apparatus and why it has no per-locality axis),
[client-shell.md](../subsystems/client-shell.md) (the start screen and
the anonymous-guest path),
[message-rendering.md](../subsystems/message-rendering.md) (MML through
`MmlRenderer`), [help.md](../subsystems/help.md) (the read-only REST
data-API precedent),
[app-settings.md](../subsystems/app-settings.md),
[call-security.md](../subsystems/call-security.md).

**Not in this cycle, referenced** —
[saxonberg-city-slate](../slates/builds/saxonberg-city-slate.md),
[legal-code-slate](../slates/builds/legal-code-slate.md) (the docket),
[stewardship-slate](../slates/builds/stewardship-slate.md) (the allowance
cascade blocking Saxonberg).
