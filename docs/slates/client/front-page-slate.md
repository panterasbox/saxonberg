# Front page slate — whose page, and what a stranger sees first

> **Status: UNBUILT — DESIGN CAPTURED 2026-11-20, HANDOFF-READY** from a design conversation with the
> owner, iterated against a prototype. Today's start screen
> ([client-shell.md § The front door](../../subsystems/client-shell.md)) is the starting point.
> **Left:** everything in § 6's build list — the public `/front` read, the founder-name and show
> settings, `acting` on the office read, the release `chamber` field and `proposal` kind,
> `/compact/executive` made public, the Saxonberg Post organization with its stakeholders authority,
> position-level appointment and appointment-mode openings, the show tile and the sign-in follow-up,
> and the client rebuild of `StartScreen`.
> **Size:** a build (client-led, with a kernel slice: two press fields, two employment fields, one
> authority kind, one public read).

Related: [positioning.md § Part 0a — the three names](../../positioning.md),
[client-shell.md § The front door](../../subsystems/client-shell.md),
[press.md](../../subsystems/press.md) (publishers, releases, `pressRoom`, `press.frontPage`),
[governance.md](../../subsystems/governance.md) (offices and the founder default),
[employment.md § The opening, the criterion, and the sign](../../subsystems/employment.md),
[livestream.md](../../subsystems/livestream.md), [streaming.md](../../subsystems/streaming.md),
[journalism-slate § the Saxonberg Post](../society/journalism-slate.md),
[directory-slate § 3b](../society/directory-slate.md) (the wire),
[deep-links-slate](./deep-links-slate.md), [docs/design/brand/README.md](../../design/brand/README.md).

**The prototype:** [docs/design/front-page/front-page.dc.html](../../design/front-page/front-page.dc.html)
(the published canvas's source; every `SAMPLE` tag marks placeholder data with the shape of a real
read). **The founder's avatar:** [docs/design/brand/bobalu/](../../design/brand/bobalu/) — the
NetHack `@` (the IBM VGA 8×16 code-page-437 glyph), plain and phosphor-glow, as SVG and PNG.

---

## 1. What this instance is **[DECIDED — the owner]**

*"mud.panterasbox.com is the platform for Pantera's Box, the game-experiencing community that I
personally founded and now runs the Compact until I say otherwise … Saxonberg and all its many knobs
and levers is that tool."* The three names are in [positioning.md § Part 0a](../../positioning.md).
The page promotes **Pantera's Box** (the financing comes through it) and **Saxonberg** (finishing it
to 1.0 is the one focus — *"I just don't want to bury the Saxonberg brand; it's as important as the
PB brand, maybe more so at this point"*). It is not www.panterasbox.com, which stays a brochure.

## 2. Who owns the front page — the Compact **[DECIDED — the owner]**

The page is **outside the fiction**, so it belongs to the institution that speaks for the community —
the Compact (today the founder as operator). **Notices come from offices and publishers, never from
"the government"** (the owner): each item is written and signed by the office or paper that
published it. The Compact chooses **which publishers the page stocks** (the shipped `press.frontPage`
setting), never what they say; dropping one is a visible act.

## 3. What the page says — honest, not a pitch **[DECIDED — the owner]**

*"You're already here, the marketing has done its job, now we need to be honest about what you're
actually signing up for, because the game asks something of you and it's actual work."* And: *"we're
trying to get people to log in — why bother if they can just watch the stream from the front page?"*

- **No playable stream on the page.** The show is a **grid thumbnail** (a Twitch directory tile,
  not the headliner) whose action is *sign in to watch it inside Saxonberg*.
- **The three chambers are real asks, each with what it is after now** — and moderation is the
  pitch, the editor's chair the aspiration: *"who wants to be a mod for some game they've never
  played?"* — but the first seat on the game's own newspaper is a different offer.
- **Fund leads with what money buys** (*"who cares about raising $1000"*): *a bigger server — more
  people at once, faster answers* — and **shows the dollars** beside it (*"the livestream shows
  dollars, I don't know why the front page wouldn't"*), all read from the books, never typed onto
  the page.
- ⛔ **No "coming soon", no "under construction".** Every band is real or absent (§ 5).

## 4. The page, top to bottom

| band | content | source (§ 6) |
|---|---|---|
| **host bar** | the Pantera's Box hex seal · *A Pantera's Box community ↗* → panterasbox.com | static |
| **identity** | the Saxonberg seal (44 px) and wordmark · *"The platform the Pantera's Box community is building together, run under a written Compact. It isn't finished — you'd be joining before 1.0."* ⚠ **Saxonberg is the platform, never "the world"** — the community is Pantera's Box; the product is Saxonberg (the owner, correcting the first draft) | static |
| **left · What you're signing up for** | **01 Make** — *Build it with us — places, things, trades, code, and the institutions that run them. Real work, opt-in, and it earns you a say.* + **WANTED: Moderators for the Saxonberg Post** — *the first seats on the paper's staff, and the road to its editor's chair* — with a two-line chart: *Moderators · open · start here* / *Editor-in-Chief · open* | derived openings |
| | **02 Fund** — *Pay for it. Real money keeps it running and earns a say in its own chamber, and buys nothing else.* ⚠ lawyer's read on this sentence + **FUNDING NOW** — the first open proposal in the Compact's books (*A bigger server — more people in the world at once, and faster answers when you type*), **with dollars**: its monthly cost, running costs, last month's support, and *covered* / *not yet covered*, computed — linking to the public books | **the books** (§ 6) |
| | **03 Play** — *Live here. Show up and take part. Your say grows from what you actually do, never from what you pay.* + **NOW** — the pinned play item (an event: court day, a founding week) | pinned `chamber: play` release |
| | **Latest** — three one-line items, each labelled with its publisher | `pressRoom` |
| **right · Sign in** | the three providers (co-equal, seal red with white rims) · *Look around as a guest* · *A guest keeps nothing, and nobody can find them.* · the live count | shipped; count per § 6 |
| **right · the show** | a 16:9 grid thumbnail: live = the stream's still, **LIVE** and viewers; offline = the glowing `@` on black and the next show · the founder's avatar (red ring when live), the show title, *Bobalu Smallberries*, *Acting Prime Minister* · *Sign in to watch it inside Saxonberg.* | the show block |
| **below · Notices and news** | the full feed, each item under its own masthead (an office's seal; the Post's nameplate on paper) | `pressRoom` |
| **footer** | panterasbox.com · the show on Twitch · YouTube · Kick · Source (AGPL) · Discord · the public record · Privacy | static |

**Phone:** the right column (sign-in, then the show) comes first; then the chambers and Latest.
**Kept from today:** full-bleed bands, the honest live count, co-equal providers, *every claim has a
source*, the press room never awaited by sign-in.

## 5. The empty rules — real or absent

| band | when its source is empty |
|---|---|
| identity, sign-in | always present |
| a chamber's **WANTED / FUNDING NOW / NOW** line | the line does not render; the chamber shows its sentence only |
| Latest, Notices and news | the band does not render |
| the show | offline tile with `show.schedule`; no schedule set → *Offline* alone; the viewer count **omitted** when unavailable, never estimated |
| the live count | a number, a real zero, or nothing (shipped) |

## 6. The server model — the handoff

### What already ships

- **Offices** (governance.md): the `prime-minister` seat, the founder its **default holder** until
  handed off (a founder default is never a stamped player id).
- **Publishers** (press.md): `/compact/press` (public, `ooc`) and `/compact/executive` — the Office of
  the Prime Minister (`world`, ⚠ `members`), each with a communications director; releases with
  `kind` and `pinned`; the anonymous `pressRoom()` read over `press.frontPage`.
- **Openings** (employment.md): `headcount − holders`, derived, never stored; `job apply`; the
  closed criteria vocabulary.
- The live count (`/auth/status` `online`), the founder's on-air state (`BroadcastMixin`'s phases),
  the three streaming transports, the `watch` verb and embed.

### The Saxonberg Post as an organization **[DECIDED — the owner]**

A publisher organization (trades and publishes), public, realm `ooc`, path to settle
(`/compact/post` or its own root).

- ⭐ **Its appointing authority is its stakeholders** — its staff and, once there are any, its equity
  holders — **with a founder default while there are none.** The owner: *"it's not the executive
  using their authority; none of this is derived from law, it's derived from … the status quo."* It
  is written on the Post's own charter, never borrowed from the Prime Minister; the founder's default
  ends by arithmetic when stakeholders exist. How stakeholders decide is the journalism slate's
  independence charter (lean: the newsroom chooses its editor).
- **Positions:** `moderator` (headcount set by the appointing authority; **filled by appointment**) ·
  `editor-in-chief` (one; filled by appointment; appoints staff and moderators once seated) ·
  section editors, reporters (later). ⭐ **Moderation is the first rung and the editor's chair the
  aspiration** (the owner): *"if we get mods that are reliable hopefully they'll figure out the editor
  in chief problem."* Filling the editor's seat is not required for the page to work.
- The moderators' grant is moderation over the Post's Subjects (the public channels — moderation-slate
  § 24).

### The build list

1. **Settings:** `compact.founderName` (the founder default's public name — *Bobalu Smallberries*),
   `show.channel` (the Twitch login for the thumbnail), `show.schedule` (the next-show line, with
   its time zone).
2. **The office read gains `acting` and the holder's name**: `acting` = the holder is the founder by
   default, no hand-off recorded; the name from `compact.founderName` in that case.
3. **Releases gain an optional `chamber`** (`make · play`): a chamber's line is the **newest pinned
   release tagged for it** from a stocked publisher (Play's events; Make's colour beside the derived
   openings). **Fund does not use releases** — it reads the books (3a).
3a. ⭐⭐ **Fund reads the Compact's books** **[DECIDED — the owner: *"I actually wanna start using the
   budget shit sooner than later"*]** — the [budget-slate](../platform/budget-slate.md) architecture,
   started now: a **plain-text double-entry journal** (beancount) committed in the repo, kept locally
   with Fava, **exported to JSON by a script**, a lint holding the export current, the runtime reading
   the JSON. The chart of accounts is **by office**. **A proposal is one journal line in the spending
   office's account**, e.g.
   `2026-11-20 custom "proposal" "A bigger server" Expenses:Infrastructure:Compute 40.00 USD "More people in the world at once, and faster answers when you type."`
   The page's **FUNDING NOW** is the first open proposal; beside it, computed from the books: its
   monthly cost, **running costs** (the trailing month's actual expenses), **support last month**
   (receipts), and **covered / not yet covered** (support ≥ running costs + the proposal). When the
   spend starts, the actual expense appears and the proposal closes. **Control:** add, reorder or
   drop a proposal line and merge it — the books get code review. **Later** the budget committee's
   budget bill writes the proposals; the pen moves, the page does not change. Outside the fiction;
   dollars never touch the game's ledger.
4. **`/compact/executive` becomes `public`** — a release may narrow its publisher's reach, never
   widen it, so the Office of the Prime Minister's releases cannot reach an anonymous visitor today.
5. **A new appointing-authority kind: `stakeholders`, with a founder default** (staff holders, then
   equity holders; the founder while both are empty).
6. **Position-level appointment** — `appointedBy` on a position (the editor appoints staff and
   moderators), falling back to the organization's authority while that seat is empty.
7. **Appointment-mode openings** — a position filled by appointment still derives its opening from
   `headcount − holders`, but `job apply` to it **files a candidacy** the authority appoints from,
   instead of deciding by the closed criteria (a judgment of a person — the criterion is the
   authority's published standard, the appeal its stakeholders).
8. **The public `/front` read** — one anonymous fetch beside `/auth/status`: the office line,
   the stocked organizations' openings, the play pin, the books' fund line, the show block (`live`, `title`,
   `thumbnailUrl` from Twitch's public preview image for `show.channel`, `viewers` when the
   transport's credentials allow, `nextShow`), and the press-room rows. **Sign-in never waits on
   it**; each band renders from its own slice or not at all.
9. **The sign-in follow-up** — the show tile links to sign-in carrying a follow-up action through
   OAuth (the deep-links slate); after entering, the client runs `watch` on the founder's stream.
   Offered only while live.
10. **The live count reads the wire** (directory-slate § 3b), so silent sessions are excluded —
    follows the directory build.
11. **The client:** rebuild `StartScreen` to § 4, the `PressRoom` becoming Latest and the full feed;
    the founder's avatar from `docs/design/brand/bobalu/`.

### Compliance

- The thumbnail is the carrier's public preview image linking to sign-in; ⚠ confirm Twitch's terms
  for showing preview images off-platform (the carrier checklist in the private strategy note: use
  their assets as their terms allow).
- The Fund sentence (*real money … earns a say in its own chamber, and buys nothing else*) is
  **Art. I §2 verbatim in spirit** — *"Real money may fund the world and earn a voice in its
  governance; it may never purchase in-world currency, property, or any gameplay advantage"* — and
  the Standing Act's A-tier clause (standing never comes from real money except through the capital
  chamber). The lawyer's read is on how minted standing is **described** publicly, not on whether it
  exists.

## 7. Domains **[LEAN — the owner: "I probably should either way"]**

Register **saxonberg.gg** and **panterasbox.gg** defensively; saxonberg.gg becomes the platform's own
home in time; this instance stays at mud.panterasbox.com.

## 8. Set aside, with reasons

- **A 1.0 progress panel** and **a handover bar** — no record exists for either to read yet (the
  lever census is unwritten); a bar moved by hand reads as a donation thermometer.
- **A playable stream on the page** — it removes the reason to sign in.
- **A fundraising target** (*"raise $1000"*) — the page shows what money buys and the books' real
  figures instead.
- **A support band** — the Fund chamber's line carries it.

## 9. Open

1. The Post's path, and its realm (`ooc` lean).
2. Twitch's terms for preview images off-platform.
3. The Fund sentence's public wording after the lawyer's read.
5. The journal's first accounts and the export's shape (budget-slate's open questions).
4. What Play pins first (any event the stocked offices publish; nothing is required).
