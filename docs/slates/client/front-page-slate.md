# Front page slate — whose page, and what a stranger sees first

> **Status: UNBUILT — DESIGN CAPTURED 2026-11-20, HANDOFF-READY** from a design conversation with the
> owner, iterated against a prototype. Today's start screen
> ([client-shell.md § The front door](../../subsystems/client-shell.md)) is the starting point.
> **Left:** everything in § 6's build list — the public `/front` read, the founder-name and show
> settings, `acting` on the office read, the demand digest, the books (budget-slate),
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

- ⚠ **Superseded 2026-11-23 (the owner, [stream-arrival-requirements](../../requirements/stream-arrival-requirements.md)):**
  a visitor who **came from a carrier** sees the show **playing** on that carrier, and sign-in opens in
  its own window so the video never stops; the reason below is answered by the funnel itself — the
  video keeps playing *into* the game, which a carrier cannot do. An untagged visitor still sees the
  thumbnail tile.
- **No playable stream on the page.** The show is a **grid thumbnail** (a Twitch directory tile,
  not the headliner) whose action is *sign in to watch it inside Saxonberg*.
- **The three chambers are real asks, each with what it is after now** — and moderation is the
  pitch, the editor's chair the aspiration: *"who wants to be a mod for some game they've never
  played?"* — but the first seat on the game's own newspaper is a different offer.
- ⭐⭐ **Play shows demand** (the owner): *"play is different for everyone, and we don't know who you are … we do know what other players in the game are up to, which is probably not much of anything for a long while. We also know what they could be doing based on what's built and what all the different economic demands are. The game doesn't launch without demand and that's what shapes the consumer experience."* So Play's line is **what the world needs right now** — the economy's unmet demand, derived, never written — the blacksmith-shaped hole (lens 3b) shown to a stranger.
- **The books stay inside** (the owner: *"we don't need to show the books on the front page, that's all available once you're signed in"*): Fund shows only an open proposal, with its cost.
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
| | **02 Fund** — *Pay for it. Real money keeps it running and earns a say in its own chamber, and buys nothing else.* ⚠ lawyer's read on this sentence + **FUNDING NOW** (only while a proposal is open) — the first open proposal in the Compact's books (*A bigger server — more people in the world at once, and faster answers when you type*), **with dollars**: its monthly cost, running costs, last month's support, and *covered* / *not yet covered*, computed — linking to the public books | **the books** (§ 6) |
| | **03 Play** — *Live here. Show up and take part. Your say grows from what you actually do, never from what you pay.* + ⭐ **THE WORLD NEEDS** — *work and goods nobody is supplying yet*: three lines, each a kind (**Hiring** · **Buying** · **Gig**), what, and where (*Two hands for the ropewalk · Wharfside*; *Flour, by the sack · the bakery*; *Carry a crate of glass to Hearts Delight · the job board*) | the demand digest (§ 6) |
| | **Latest** — three one-line items, each labelled with its publisher | `pressRoom` |
| **right · Sign in** | the three providers (co-equal, seal red with white rims) · *Look around as a guest* · *A guest keeps nothing, and nobody can find them.* · the live count | shipped; count per § 6 |
| **right · the show** | a 16:9 grid thumbnail: live = the stream's still, **LIVE** and viewers; offline = the glowing `@` on black and the next show · the founder's avatar (red ring when live), the show title, *Bobalu Smallberries*, *Acting Prime Minister* · *Sign in to watch it inside Saxonberg.* | the show block |
| **below · Latest + Coming up** | one band: the feed's headlines (left; *All notices and news* links to the archive) and the calendar (right) — the full feed was dropped as a duplicate (§ 4d) | `pressRoom`; the calendar's sources (§ 4c) |
| **footer** | panterasbox.com · the show on Twitch · YouTube · Kick · Source (AGPL) · Discord · the public record · Privacy | static |

**Phone:** the right column (sign-in, then the show) comes first; then the chambers and Latest.
**Kept from today:** full-bleed bands, the honest live count, co-equal providers, *every claim has a
source*, the press room never awaited by sign-in.

## 4b. The Compact first — what it does to Make and Fund **[DECIDED — the owner, 2026-11-20]**

The Compact stands up before content ([separation-of-powers-slate § 7q](../society/separation-of-powers-slate.md)):
only capital standing is minted, the vote on anything is the early-adopter incentive, and capital
demand becomes labor demand. Two lines change:

- ⭐ **Make → *Now hiring: three offices to stand up, and the moderators they lead*** (2026-11-20,
  [separation-of-powers-slate § 7r](../society/separation-of-powers-slate.md)) — the owner: *"it's a
  lot more to explain but it also has a little bit of something for everyone and hopefully that would
  increase engagement."* Four rows, each derived:

  | row | line | source |
  |---|---|---|
  | **Sergeant at Arms** | keeps order on the floor of the Compact · open | the floor office's opening |
  | **High Constable** | keeps the peace between players · open | the Constabulary's opening |
  | **Editor in Chief** | runs the Saxonberg Post · open | the Post's opening |
  | **Moderators** | join the pool all three hire from · *start here* · *n* in the pool | **the moderator pool** |

  and one line beneath: *Three separate authorities, each with its own rules. Most moderators will serve
  more than one.* A filled seat shows its holder's name instead of *open*.
  - ⭐ **The moderator pool** is a submitted section of the Post's directory
    ([directory-slate](../society/directory-slate.md) § 3) — you join with `profile submit`, your
    profile is your application, and **each of the three offices appoints its moderators from the same
    pool** (appointment-mode openings, § 6). One pool, three authorities: a candidate applies once.
  - The earlier rows below (the jobs report's headline) become the full report behind this block.
- **Make → the monthly jobs report's headline.** The Compact's press office publishes it monthly,
  generated from the record: openings per institution with the load beside each (open cases per
  moderator, bills per clerk, cases awaiting a panel). The Make line shows the open seats ranked by
  load — **moderators first while moderation carries the most** — linking to the report. The Post's
  moderator and editor seats (§ 6) are rows in it.
- **Fund → the first election**, once capital standing exists — *"be part of the first Speaker vote"*
  (the owner). Three states from the election's record: **waiting** (*Join the Capital House and vote
  in its first election — Speaker of the Capital House. Opens at N members and X standing — now n
  members, x standing.*), **open** (*Voting now — N candidates — closes on a date*), **closed** (*Speaker
  of the Capital House: name*). An open spending proposal from the books (§ 6, 3a) sits beside it.
  Before capital standing exists (the legal gate), the election line does not render.

## 4c. Fund's goals, and a calendar **[DECIDED — the owner, 2026-11-20]**

### Fund shows plain goals and progress **[DECIDED — the owner]**

The owner first asked for the budget totals back (*"we actually have real numbers … I'm also keen to
let the game start paying for itself ASAP"*), then, seeing a books panel with figures, line items and a
Twitch button: *"way too much … it looks like Times Square now. Just some plainly worded goals and our
progress to meeting those goals. They can't even donate until they're inside and authenticated, so
you're not selling anyone on the front page. Just get them to sign in and let the game do the rest."*

- ⭐ **Goals, in plain words, each with its progress** — read from the books (budget-slate § The first
  books):
  - **Pay for itself** — *$0 of $244 a month* (support from players against last month's cost to run),
    a thin bar beneath;
  - **Then: a bigger server** — *+$40 a month* (the first open proposal).
- **No line items, no headline figures, no support button.** Support happens inside, after sign-in;
  the front page's only job is getting people in. October's real basis: Claude $200.00, AWS $15.31,
  Descript and email estimated until their invoices.

### A calendar — *Coming up*

The owner: *"the front page also needs a calendar widget where our upcoming elections are featured,
currently both as TBD … we should probably have something on it with an actual date so people know
what the fuck it is. Maybe the next livestream."* Under the show tile, in the right column:

| date | item | source |
|---|---|---|
| **Tue, Dec 1** | *The Compact's books open* — every dollar in and out, in public | the journal's first entry (real) |
| **Sat, Jan 2** *(sample)* | *The show returns* — 10 a.m. [time zone] — Twitch, YouTube, Kick | `show.schedule` |
| **TBD** | *Election · Speaker of the Capital House* — opens at N members and X standing; now n and x | the election record (§ 7q) |
| **TBD** | *Election · Clerk of the Court* — every citizen votes, one person one vote; called by the founder | the election record (§ 7r) |

- **The calendar's source is three existing things:** dated **`event` releases** from the stocked
  publishers (the release kind already ships), the **election records** (each a trigger or dates), and
  `show.schedule`. No calendar collection — the page merges them by date; undated items (*TBD*) sort
  last with their trigger shown.
- **At least one item always has a real date** — the next show, or the next dated event — so a visitor
  can tell what a calendar is for. An election moves from *TBD* to its dates the moment its trigger is
  met.

## 4d. One news block, and the layout rebalanced **[DECIDED — 2026-11-20]**

The owner: *"it's a little out of balance between the content on the left and right … I'm also a
little confused about the two different news areas. Do we need both? And what determines what goes in
where?"*

- ⭐ **One voice: the Office of the Prime Minister** **[DECIDED — the owner]**. *"I don't want like a
  million people posting to the front page and no one's gonna know the difference between one source
  and the other if they've never stepped foot in the game. Really it's all coming from the Office of
  the Prime Minister but they can be reposting other stuff if they want."* So **`press.frontPage`
  stocks one publisher, `/compact/executive`** (made public — build list item 4), the block is headed
  *From the Office of the Prime Minister*, and items carry **only a date and a headline** — no
  per-item publisher labels.
  - **Reposts already ship** — `repost` is a `ReleaseKind`, and a release's `source` is *"a repost's
    provenance line"* (press.md). A reposted item shows one line: *— from the Speaker of the Capital
    House*. No new design.
  - **Who writes next** (the owner asked): for a long while, every item is the founder's. The next
    author is **the Speaker of the Capital House** — the first office anyone else will hold, and the
    first with a reason to address the public (the election result, the house's position on a bill, a
    call for members) — reposted by the Office of the Prime Minister. Then the **Editor in Chief**, once
    the Post publishes. Neither exists yet.
  - This supersedes § 2's *two lanes* and the stocked Saxonberg Post on the front page: the Post is
    reached inside the game, or through a repost.
- **One news block.** *Latest* (headlines) and *Notices and news* (the full items) read **the same
  feed** — `pressRoom()` over `press.frontPage`, newest first with pins on top (`press.maxPins`) — so
  the page showed it twice. **The full feed is gone; *Latest* keeps the headlines, each labelled with
  its publisher, and links to *All notices and news*** (the press room's archive). What goes in is
  decided by the publishers and their pins, never by the page.
- **The layout:** the above-the-fold band is **the chambers (left) beside sign-in and the show tile
  (right)** — about equal heights. Beneath it, one full-width band holds **Latest (left) and Coming up
  (right)**: the two *what's happening* blocks side by side. On a phone the order is sign-in, the show,
  the chambers, then Latest and Coming up.

## 4a. Where you came from **[DECIDED — the owner]**

The owner: *"we can detect if they already have a twitch/youtube/kick session right? might be good to
emphasize if we already know their preference and also change what preview shows … we want it to log
you into saxonberg using the login method you prefer based on your viewing preferences."*

- ⛔ **Another site's session cannot be read**, and the page does not try: browsers keep one site's
  cookies from another, and login-probing tricks are privacy leaks browsers keep closing. (Google's
  own sign-in prompt may offer a visitor their Google account — Google showing it, not us reading it.)
- ⭐ **The origin is known three clean ways**, in order:
  1. **a `from` parameter on every link we post** — Twitch panels, the chat relay's messages,
     YouTube descriptions, Kick (`mud.panterasbox.com/?from=twitch`); exact, and ours;
  2. **the referring site** the browser passes (`twitch.tv`, `youtube.com`, `kick.com` — the
     origin, not the page), for untagged links;
  3. **the visitor's last sign-in method**, remembered in their own browser on our domain — a
     first-party convenience.
- **When it is known:**
  - **the show tile shows that platform's thumbnail**;
  - ⭐ **clicking the tile signs in through the matching provider** — Twitch → Twitch, **YouTube →
    Google** (a YouTube account is a Google account), Kick → Kick — and the follow-up action opens the
    same stream inside the game on the carrier they were watching. The tile reads *"Sign in with
    Twitch and keep watching inside Saxonberg."*;
  - **their provider moves to the top of the sign-in panel**, with a plain note: *"You came from
    Twitch."* / *"You came from YouTube — sign in with the Google account you watch on."*
- ⚠ **A refinement of the co-equal providers rule**, written into it rather than overriding it: the
  start screen gives every provider the same treatment because favouring one *"states a partnership
  that does not exist."* Ordering by **the visitor's own origin** states their choice, not ours, so it
  keeps the rule's reason. **With no signal, the order is neutral** (Google · Twitch · Kick, as today)
  and every button keeps the same look.
- The prototype's Tweaks carry `cameFrom` (none · twitch · youtube · kick) to show each state.

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
3. ⭐ **The demand digest** — Play's line. Three sources, all derived: **open gigs** on the job board
   (contract.md's board — open contracts), **open seats at in-world businesses** (employment's
   `headcount − holders`), and **goods counters want** (retail's purchasing — what a counter buys and
   has no stock of). ⚠ *Load on use, never search*: the front page cannot walk every business, so the
   economy's own recurring ticks (the roster tick that already runs each house's openings once per
   game hour; the stocking pass) **write a small derived digest document** — rebuildable, never
   authoritative — and `/front` reads that one document. Entries carry kind (Hiring · Buying · Gig),
   what, and where; the page shows the top three. *The game doesn't launch without demand*, so at
   launch it is non-empty by construction; empty → the line does not render.
3a. ⭐⭐ **Fund reads the Compact's books** **[DECIDED — the owner: *"I actually wanna start using the
   budget shit sooner than later"*]** — the [budget-slate](../platform/budget-slate.md) architecture,
   started now: a **plain-text double-entry journal** (beancount) committed in the repo, kept locally
   with Fava, **exported to JSON by a script**, a lint holding the export current, the runtime reading
   the JSON. The chart of accounts is **by office**. **A proposal is one journal line in the spending
   office's account**, e.g.
   `2026-11-20 custom "proposal" "A bigger server" Expenses:Infrastructure:Compute 40.00 USD "More people in the world at once, and faster answers when you type."`
   The page's **FUNDING NOW** is the first open proposal, with its monthly cost. ⚠ **The books
   themselves stay inside the game** (the owner) — running costs, support and who paid are shown to
   signed-in players, not on the front page. When the
   spend starts, the actual expense appears and the proposal closes. **Control:** add, reorder or
   drop a proposal line and merge it — the books get code review. **Later** the budget committee's
   budget bill writes the proposals; the pen moves, the page does not change. Outside the fiction;
   dollars never touch the game's ledger.
   (The first books: [budget-slate § The first books](../platform/budget-slate.md).)
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
   the stocked organizations' openings, the demand digest's top entries, the open fund proposal, the show block (`live`, `title`,
   `thumbnailUrl` from Twitch's public preview image for `show.channel`, `viewers` when the
   transport's credentials allow, `nextShow`), and the press-room rows. **Sign-in never waits on
   it**; each band renders from its own slice or not at all.
9. **The sign-in follow-up** — the show tile links to sign-in carrying a follow-up action through
   OAuth (the deep-links slate); after entering, the client runs `watch` on the founder's stream.
   Offered only while live.
9a. **The origin signal** (§ 4a) — the `from` parameter, the referrer fallback and the remembered
   last method, resolved client-side; the tile's thumbnail and sign-in link follow it, and the
   sign-in panel orders by it. Tag every link the chat relay and the stream panels post.
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
4. The demand digest's ranking — which three of many entries the page shows (newest, largest, or a rotation).
