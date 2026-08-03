# Press room — requirements

**The launch gap, closed, and the form named.** Everything the project
publishes today is invisible to anyone who has not signed in: the live
fan needs an Avatar, the initial window rides the post-auth connection
payload, the archive route is `requireAuth`, and the pane is a tab in the
post-login cockpit. A visitor arriving from the video, the manifesto, or
the homepage sees nothing.

This build makes the state's own output **publicly readable on the start
screen**, and it names what that output is: **press releases**, issued by
an office, in a press room — modelled on the White House press office.
Not a blog, not a substack, not a newsroom.

It is a **press-release** build. The press vocation
([press-slate](../slates/builds/press-slate.md)) and the City of
Saxonberg ([saxonberg-city-slate](../slates/builds/saxonberg-city-slate.md))
keep their own slates and their own cycles.

Seeded by [gazette-slate](../slates/builds/gazette-slate.md) Wave 0 —
**and it supersedes that slate's Wave 1**. Grows
[bulletin.md](../subsystems/bulletin.md), the owning subsystem doc.

## The doctrine this cycle settled

> **The state issues press releases. It does not report.**

A press release and a publication are different objects, and conflating
them is what sent the gazette slate's Wave 1 wrong:

| | a press release | a publication |
|---|---|---|
| attribution | **the issuing office** | a byline a person answers for |
| direction | issued to a **press room** — you come get it | **it arrives** |
| voice | states, announces, confirms | asserts, argues, interprets |
| subscription | none | the whole point |

The slate's own *"the state publishes to a PLACE; a publisher pushes to
PEOPLE"* was describing a press room without naming it.

**Wave 1's herald seat is struck**, not deferred. It proposed a state
*newsroom* — an office whose job was reporting on the world — and:

1. It contradicted [civics.md § The two staffs (never
   merged)](../subsystems/civics.md). The Office apparatus is five
   code-authored **singular** seats with no per-locality axis; diegetic
   seats are employment positions on `Government.seats`. "A seat on the
   Office substrate, scoped to a locality" cannot be both, and the slate
   asserted both.
2. Saxonberg is a **municipality** — a local government, and the address a
   publisher may one day be headquartered at. Not the state's face.
3. ⭐ **The press-release form makes events-not-significance structural.**
   A release states what an office did or decided; it has no standing to
   say what it meant. *"The machine can report facts; only a person can
   say why it matters"* becomes: **an office can announce; only a
   publisher can interpret.**

**What this does NOT forbid.** A publication whose editor is a political
appointee — Saxonberg's local paper, edited by whoever the committee
appoints — is a **publisher**, not the state's organ. That is a captured
press, which is a real institution and a far better teaching object than
a clean one. It also means editorship is a **third** appointment
mechanism, distinct from both staffs: not an Office seat, not a
`Government.seats` employment position, but a **committee** appointment
(`CompactApi.committeeOf`). Out of scope here; recorded in press-slate so
the press build inherits it.

## Goals

- **A visitor who has never signed in can read the press room.** No
  account, no guest session, no WebSocket — a plain unauthenticated HTTP
  read.
- **The start screen carries the press room** as a real surface, MML
  rendered, **degrading deliberately** when it is empty or the server is
  unreachable.
- **`publisher` is first-class**, distinct from `author`, and carries the
  office identity a release is issued under.
- **Two publishers ship**: the **Compact** (out-of-fiction — the
  platform's own press office) and the **Executive** (in-fiction — the
  Office of the Prime Minister). Both are publicly readable.
- **Publishing under a mark is an entitlement**, verified against the
  acting principal: the Compact's releases require the author axis; the
  Executive's require **holding the `prime-minister` office**.
- **Visibility is declared by the publisher**, narrowable per release,
  **never widenable**.
- **`realm` is derived from the publisher**, not supplied. A Compact
  release is out-of-fiction and an Executive release is in-fiction; there
  is no third possibility and no reason to let a caller assert one.
- **Reposting is a post kind**, not an architecture: a `repost` kind plus
  a free-text `source` line, so the press room can carry something from
  elsewhere the way a press office does.
- The shipped authenticated surfaces — the live fan, the connection
  payload window, the archive route, `NewsTickerPane` — keep working
  unchanged.

## Non-goals

- **No herald seat and no state newsroom.** Struck by the doctrine above.
- **No new Office.** The Executive publisher rides the existing
  `prime-minister` seat. The apparatus gains nothing.
- **No verb-affordance widening.** See the surface decision below — a
  non-author office-holder cannot currently exist, so widening is
  speculative.
- **No generic `requiresOffice` validator.** governance.md defers it to
  "the second office-gated **verb**"; this build gates a **publisher**
  inside the logic, not a verb, so it is not that trigger. Still deferred.
- **No docket.** Twelve of the fifteen kinds in
  [legal-code-slate § The docket](../slates/builds/legal-code-slate.md)
  need bills, conviction crossings and the Roll, none of which are built.
- **No annotation or fact-check layer.**
- **No Saxonberg, and no local paper.** Its only claim on this cycle was
  housing the herald. It is also blocked: `ParcelRecord.allowance` is an
  explicit inert seam and the allowance cascade
  ([stewardship-slate](../slates/builds/stewardship-slate.md)) is unbuilt,
  so the slate's "second Compact grant" step cannot be taken.
- **No player publishers, no `/feed/<publisher>/`, no subscription, no
  push.** Wave 2, per press-slate. This build shapes the schema so that
  arrival needs no migration.
- **No permalinks, no `og:` tags, no RSS, no email.**
- **No CORS work and no panterasbox.com consumer.** The surface is the
  start screen — same-origin in production, and already reaching the
  server via `SERVER_URL` in dev.
- **No nightly-wipe exemption.** No scheduled reset exists in this repo
  or in `.gitlab-ci.yml`; there is nothing to exempt from.

## Surface decisions

### Two publishers, each with an authority and a realm

A publisher is an authored record: a key, a display name, the **realm it
speaks in**, its **default visibility**, and **who is entitled to issue
under it**.

| key | display | realm | visibility | entitlement |
|---|---|---|---|---|
| `compact` | the Compact | `ooc` | public | the author axis (`AccessApi.isAuthor`) |
| `executive` | the Office of the Prime Minister | `world` | public | holds the `prime-minister` office |

⚠ **The Executive press office ships with nothing to announce.** There is
no legislature, no bills and no policy, so its releases are whatever gets
written in character — exactly like the Compact's. Accepted, and it is
the same "cold start is content, not mechanism" call made below. It is
also why the entitlement, not the content, is what this build is
responsible for.

⚠ **In practice only the founder can use it today.** The founder is the
computed default holder of every office, and governance.md records an
**open bug** — `office assign` cannot find an online player, so no seat
can be handed off at all. That does not block this build; it does mean
the Executive publisher has exactly one possible user until that is
fixed.

### The publisher is supplied and verified, not derived

An earlier draft had the publisher derived from the acting principal and
never request-supplied. **That does not survive two publishers**: the
founder is both an author and the default Prime Minister, so derivation
is ambiguous exactly where it matters.

So the publisher is a **parameter, checked against the acting
principal's entitlement**. This is the same shape governance already uses
— *"the appointer is never a parameter; only the resolved appointee
playerId is"*: the actor comes from execution context, the target does
not. An unentitled publish is refused; there is no fallback to a
publisher the caller *is* entitled to, because silently publishing under
a different mark than the one asked for is worse than failing.

### `realm` is derived from the publisher

`realm` was carrying three unrelated jobs — framing, authority, and
visibility. After this build it carries **one, and does not even carry
that independently**:

| concern | where it lives |
|---|---|
| authority | the publisher's entitlement |
| visibility | the publisher, narrowable per release |
| framing | the publisher's realm — **stamped at publish, not supplied** |

A Compact release is out-of-fiction and an Executive release is
in-fiction. There is no third case, so `realm` leaves `PublishRequest`
and `BulletinPatch` entirely. It remains a stored, indexed field
(existing rows, existing archive filters, the client chip) — it simply
stops being something a caller asserts.

### Visibility narrows, never widens

> **A release may be more private than its publisher. It may never be
> more public.**

Both shipped publishers declare `public`; an individual release may be
marked `members` and drop out of the anonymous read. No release of any
publisher can raise itself above its publisher's declaration. Widening is
therefore always a deliberate edit to an authored constant.

⚠ **This makes existing rows public on deploy.** Every bulletin already
in the collection inherits `compact` / `public`. That is intended — the
`ooc` realm is already documented as *"identical for every viewer, no
per-viewer lensing"*, which is what makes it safe to serve — but the
collection must be **reviewed before the route goes live**, and anything
that should not be public retracted or narrowed first. A deploy step, not
a code path.

### Repost is a kind, not an architecture

The press room may carry something from elsewhere. That is one entry on
the existing kind vocabulary (`changelog · decision · event · notice`
→ **`+ repost`**) and one optional free-text `source` line ("@someone on
Twitch", "the Saxonberg Chronicle"), with the body carrying whatever is
being quoted.

Deliberately **not** a structured source. There are no in-world
publishers to point at yet, so half of a typed
internal-ref-vs-external-URL source would be inert. When the press build
lands and in-world reposts have real targets, structuring it is an
additive change.

### The public read is its own route, and it serves the window

**Its own route**, not `realm=ooc` forced onto the existing archive: a
route whose entire contract is *"public, anonymous, no credentials"* is
much harder to widen by accident than a shared handler with a flag. It
reads no session and sets no cookie.

**It serves the live window from the `BulletinBoard` warm cache — no
`before` cursor, no paging.** A press room is not an archive. This caps
the cost of an anonymous endpoint on an underpowered box at one in-memory
read, and it keeps scrollback something you get by signing in.

### The verb affordance is deliberately not widened

The `bulletin` verb is afforded through
`AuthorMixin.commandContributions`, so only authors can reach it. A Prime
Minister who is not an author therefore could not issue a release.

**That person cannot currently exist**: the founder holds every seat by
default and is an author, and `office assign` is recorded broken. So the
affordance stays as it is, and widening it — universal on `Persona` with
per-publisher gating, the `office`-verb precedent — lands the day a
non-author can hold a seat. Building it now would be machinery for a
principal the engine cannot produce.

### Cold start is content, not mechanism

No NPC outlet, no seeded demo release, no synthetic floor. The press room
is non-empty at launch because **real releases get written** — the
manifesto and the homepage, once both are published. Nothing in this
build fabricates content to make the surface look alive.

## Constraints

- **`Bulletin` is a `Document`, not a Stuff.** New fields go in
  `static fieldMeta` as persistent entries with class defaults; missing
  fields on existing rows read as those defaults. Timestamps stay
  **epoch-ms numbers, not `Date`**.
- **No new module category.** The publisher registry is a "Named
  value-object / vocabulary / registry" per CLAUDE.md, in
  `lib/bulletin/`. No free-floating helper module and no exported helper
  functions.
- **`BulletinApi` ↔ `BulletinLogic` stays split.** The Api is the thin
  gated forwarding shell; the logic singleton at `/obj/api/bulletin` is
  the hot-reload boundary. The route never touches `BulletinBoard`.
- **Actor from context.** The entitlement check resolves its principal
  from execution context, never a caller-supplied parameter
  ([call-security.md](../subsystems/call-security.md)).
- **Office reads go through `CompactApi`.** `holdsOffice` is the office
  face of the single meta facade; the `OfficeRegistry` is not reachable
  from here ([governance.md](../subsystems/governance.md)).
- **The import boundary holds.** Route code lives in `backend/`; nothing
  under `src/mud/` gains an outside import (`pnpm lint:imports`).
- **Wire types live in `@saxonberg/types`**, and the press-release row is
  a distinct exported type, not a widened `BulletinRow`.
- **Server owns all semantics.** Pin cap, expiry, retraction filtering,
  window length, entitlement and visibility resolve server-side.
- ⚠ **`NewsTickerPane` fetches `/api/bulletins/archive` relative**
  (`NewsTickerPane.tsx:242`) and there is no Vite dev proxy, so "Load
  older" hits :5173 and fails in development. Pre-existing, one line,
  same subsystem — **fix in passing**.
- **Prettier config is `.prettierrc.js` as committed**; do not run
  `prettier --write` across untouched files.

## Acceptance criteria

**Behavior**

1. `GET` the press-room route with **no session cookie** returns the
   current window, `200`, for a caller that has never authenticated.
2. The route returns **only** releases whose effective visibility is
   public. One narrowed to `members` is absent from it and still present
   in the authenticated archive.
3. The route accepts a bounded `limit` and **rejects** any attempt to page
   (`before` → 400).
4. The press-release row carries `publisher` and `source` and **does not
   carry `author`**. Asserted against a frozen key set, so a future field
   addition cannot leak silently.
5. A release cannot be more public than its publisher: one claiming
   broader visibility than its publisher declares resolves to the
   publisher's value.
6. **Entitlement is enforced both ways**: an author may publish as
   `compact` and is refused `executive`; a `prime-minister` holder may
   publish as `executive`. A refusal publishes nothing at all — it never
   falls back to a publisher the caller *is* entitled to.
7. `realm` is stamped from the publisher and cannot be supplied: a
   `compact` release is `ooc` and an `executive` release is `world`,
   regardless of what any caller passes.
8. A `repost` release round-trips its `source` line through publish, the
   public row, and the authenticated row.
9. The start screen renders the press room for an anonymous visitor;
   sign-in and guest controls render and function with it present, empty,
   and failing.
10. Existing authenticated surfaces are unregressed: the live
    `world.bulletin.feed` fan, the connection payload's `bulletinWindow`,
    `GET /api/bulletins/archive`, and `NewsTickerPane`.
11. Bulletins persisted before this build load with `publisher = compact`
    and public visibility, with no migration script.
12. "Load older" in `NewsTickerPane` works in development.

**Tests**

13. Vitest, colocated in `__tests__/`, covering: the visibility clamp
    (5) **including the non-widening direction**; the entitlement matrix
    (6); realm stamping (7); the public row's exact key set (4);
    publisher defaulting on legacy rows (11); and the route's anonymous
    access plus members-only exclusion (1, 2).
14. `pnpm lint`, `pnpm lint:imports`, `pnpm lint:module-scope`,
    `pnpm lint:gates` and `pnpm build` all pass.

**Docs**

15. [bulletin.md](../subsystems/bulletin.md) is expanded — the press-room
    framing, the publisher registry and its two entries, the entitlement
    model, the visibility clamp, derived `realm`, the `repost` kind, the
    public route and why it has no paging, and the start-screen surface.
16. [gazette-slate](../slates/builds/gazette-slate.md) has **Wave 1
    struck and replaced** with the press-release doctrine, reasons
    carried over, so no superseded state-newsroom design is left in the
    backlog. Wave 0 is marked shipped; Wave 2 points at press-slate.
17. [press-slate](../slates/builds/press-slate.md) records: the state
    issues press releases and never reports; `publisher`, entitlement and
    visibility already exist when the press build starts; and **editorship
    as a committee appointment** — the third appointment mechanism.
18. [governance.md](../subsystems/governance.md) records the Executive
    publisher as the Office substrate's **second wired authority
    consumer** (after the Governor and `reserve`).

**Live**

19. Verified **by driving it**, not by the suite: load the start screen
    signed out in a real browser and read a real release; confirm the
    empty and server-down states look deliberate.

## Cross-references

**Seeding slates** — [gazette-slate](../slates/builds/gazette-slate.md)
(Wave 0; Wave 1 superseded here),
[press-slate](../slates/builds/press-slate.md) (Wave 2, untouched).

**Owning subsystem doc** — [bulletin.md](../subsystems/bulletin.md).

**Load-bearing context** —
[governance.md](../subsystems/governance.md) (the `prime-minister` seat,
`CompactApi.holdsOffice`, the founder default, and the open `office
assign` bug), [civics.md](../subsystems/civics.md) (the two-staffs
doctrine that struck the herald),
[access.md](../subsystems/access.md) (the author axis; the committee),
[client-shell.md](../subsystems/client-shell.md) (the start screen and
the anonymous-guest path),
[message-rendering.md](../subsystems/message-rendering.md),
[help.md](../subsystems/help.md) (the read-only REST data-API precedent),
[call-security.md](../subsystems/call-security.md).

**Not in this cycle, referenced** —
[saxonberg-city-slate](../slates/builds/saxonberg-city-slate.md),
[legal-code-slate](../slates/builds/legal-code-slate.md) (the docket),
[stewardship-slate](../slates/builds/stewardship-slate.md) (the allowance
cascade blocking Saxonberg).
