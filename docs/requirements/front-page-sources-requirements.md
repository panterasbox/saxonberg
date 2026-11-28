# Front-page sources — requirements

**Kind:** feature
**Leads from:** kernel (first consumer: the front page, in this same build — every new fact is read by
`StartScreen`'s bands before the MR opens)

The front page ([client-shell.md § The front door](../subsystems/client-shell.md)) was rebuilt to the
design's layout by stream arrival (!655) with only the bands whose sources existed; every block the
design marks `SAMPLE` is absent because nothing in the world reports it. This build gives the page's
one anonymous read the facts behind four of those blocks, the show tile's host line, and the footer:
**who runs the place** (the Prime Minister's seat, through the founder's **Compact character**), **what
has been said** (the Office of the Prime Minister's notices), **what is coming** (a calendar), and
**what the world needs** (the economy's unmet demand). It also settles, universally, *which character
an account takes part in the Compact through* — the question the Acting-PM line could not be answered
without (owner, 2026-11-28).

One MR, finished (owner: *"just build it … give me one finished product to look at"*). Fund (the
books) and Make (the hiring block) are later builds and stay absent.

Seeding slate: [front-page-slate](../slates/client/front-page-slate.md) (§ 4, 4c, 4d, 5, 6 items 2,
3, 4, 8). Reuse ledger: [front-page-slate § Reuse ledger for the plan](../slates/client/front-page-slate.md#reuse-ledger-for-the-plan).

## What already exists

- **The front page** renders the host bar, identity, the chambers' sentences, sign-in (with the live
  count and the came-from ordering), the show tile/dock, *Latest* from the press room, *Coming up*
  from the featured program's free-text next-show line, and a footer of panterasbox.com, the carriers
  and the source.
- **The anonymous reads:** `/api/front` (the show only), the press room (public releases of the
  stocked publishers; today `/compact/press` and the Terminus Gazette), `/auth/status` (the live
  count). The press **archive** exists but only for signed-in players.
- **Offices:** five Compact seats; a seat nobody has been handed is the founder's by default, and the
  founder is recognized by account credentials — so the default names **no character**, and its
  public label is the founder's Twitch handle or, on a Google-only deploy, **their email address**.
- **Standing:** labor (make) and capital (fund) are already **account-level** — the account's figure
  is the sum of its characters', so spreading work across bodies changes nothing; play standing is
  per character. The vote is decided as *one account, one vote* (separation-of-powers-slate).
- **The Office of the Prime Minister** is a publisher, but its reach is *members*, so nothing it
  writes can reach an anonymous visitor.
- **Releases** have a kind (`event` among them) and a publish time, but **no date for the event
  itself**.
- **Programs** carry a free-text next-show line — words, not a date, so nothing can sort it.
- **Demand, in three ledgers:** open **gigs** on the job boards (a world-wide record, no walking);
  **seats** at businesses (`headcount − holders`, derived; `job apply`); and houses that **buy** a
  good from players (`sell` — a line the house buys, paying more when it is short of par).
  Nothing summarizes any of them, and seats are only countable for businesses currently in memory.
- No Discord link, privacy page or "public record" destination exists anywhere.

**Therefore what is genuinely new here is:** the Compact character (one designation per account);
the office's public holder line; an event date on releases and a real schedule on programs; the
demand line over the three ledgers, world-wide; the anonymous archive; and footer destinations an
operator can set.

## Goals

- **Every account takes part in the Compact through one character**, its **Compact character**: it
  shows the account's labor and capital standing, casts the account's one vote, and is the only one of
  the account's characters that may hold a Compact office. Offices seat **characters**, never
  accounts.
- **A stranger can see who runs the place**: the show's host is named by their character, with the
  Compact seat they hold — *Acting Prime Minister* while the seat is the founder's by default — and no
  account credential is ever shown.
- **The front page speaks with one voice**: *From the Office of the Prime Minister*, its notices and
  reposts, each a date and a headline, linking to an archive a visitor can read without signing in.
- **A visitor can tell what is coming and when**: dated events and the next show, merged by date, in
  the visitor's own time zone, with at least one real date whenever a show is scheduled.
- **A visitor sees what the world needs right now** — *Hiring · Buying · Gig*, what and where — derived
  from the economy, never written, and true of the whole world rather than the rooms someone happens
  to be standing in.
- **Every footer link goes somewhere real**, and an operator adds one without a code change.
- **Every block is real or absent**, and the page never waits on any of them to offer sign-in.

## Non-goals

- **Fund — the books, the goals and their progress** → build 2 ([budget-slate](../slates/platform/budget-slate.md),
  front-page-slate § 4c / 6 item 3a).
- **Make — *Now hiring*, the three new offices, the Saxonberg Post, the moderator pool,
  stakeholders/appointment authorities** → build 3 (front-page-slate § 4b / 6 items 5–7,
  separation-of-powers-slate § 7r, directory-slate).
- **Elections on the calendar** → whichever build gives elections a record (separation-of-powers-slate
  § 7q). Until then they are absent, not *TBD*.
- **What account-level data is public** (who may see which characters an account owns) → a new slate,
  *account-visibility-slate*, opened by this build's sweep. This build reveals nothing new: the Compact
  character is public by being the account's face; the others stay unlinked to it for other players.
- **More than one designation** (a "trade character", etc.) → nowhere, deliberately: trade inside the
  fiction is play, which is per character. A second meta sphere gets its own designation when it
  exists.
- **The monthly jobs report** → separation-of-powers-slate § jobs report; the demand line is not it.
- **The live count reading the wire** (silent sessions excluded) → directory-slate § 3b.
- **A privacy policy's text** → the operator; the footer link appears when a destination is set.

## Placement

- **The Compact character** is platform (kernel): it belongs to the account/character model every
  pack shares, and the Compact's seats and votes read it. No pack owns it.
- **The office line, the anonymous reads, the archive, the footer settings** are platform — the front
  page is outside the fiction and the Compact's.
- **Release event dates and program schedules** extend the shipped press and livestream subsystems.
- **The demand line** is platform: it reads three kernel ledgers (contracts, employment, retail) that
  every trade pack's content already populates. ⭐ **A second town's businesses, boards and counters
  appear in it with zero code** — the test of the placement.
- **The client** is `packages/client`'s front page.

## Collisions

- **Every existing account** has characters and no designation → each gets its first character as
  its Compact character on the first read; nothing is migrated.
- **`office list` and the `office` verb** show the founder's credential label today → they show the
  founder's Compact character's name instead, or *the founder* when there is none.
- **Seat hand-off** (`office`'s hand-off subcommand) can seat any character today → it refuses a
  character that is not its account's Compact character, in the refusal's own words.
- **The `standing` verb, `profile` and character select** show labor and capital on every character →
  they show the account's figures on the Compact character and say on the others where they live.
- **`press.frontPage`** stocks `/compact/press` and the Terminus Gazette → it stocks
  `/compact/executive` alone, made public. The Gazette's price notices and the Compact press office's
  releases stop appearing on the front page (they remain in the game); the Office of the Prime
  Minister may repost them.
- **The featured program's free-text next-show line** → replaced by a real schedule; the words are
  derived from it.
- **Character deletion** of a Compact character → the account's next character becomes its Compact
  character; deleting one that holds a Compact seat or has a vote open is refused until it doesn't.

## Surface decisions

### The Compact character
- **One per account, always** — the account's first character by default; the player can choose
  another from character select or in the game.
- **It may not change** while it holds a Compact seat or has a vote open (no switching faces to dodge
  accountability); the refusal says which.
- **What it carries:** the account's labor and capital standing (displayed there, not on the other
  characters); the account's vote; eligibility for every Compact seat. Labor done by any character
  still counts toward the account's one figure.
- **In-fiction offices** (a town's, a guild's) are untouched: any character, by play standing, and
  they never learn which account owns whom.
- *Why one designation:* the only sphere where multiplaying creates meta is the Compact (lens 7).

### The host line on the show tile
- The tile names the **show's host** by their character and, beneath, the **Compact seat** that
  character holds; *Acting* prefixes the seat while it is held by the founder default (no hand-off
  recorded). A host holding no seat shows the name alone; a host with no character shows neither.
- The founder default resolves to **the founder account's Compact character**. ⛔ No credential —
  email, handle — is ever a public label, on the front page or in the game.
- The founder's avatar is the brand's `@` glyph, its ring red while live.

### One voice, and the archive
- The front page stocks **one publisher, the Office of the Prime Minister**, made public; heading
  *From the Office of the Prime Minister*; each item a date and a headline; a repost carries one line,
  *— from <the original publisher>*.
- *Every notice, in the archive →* opens an **anonymous archive**: the same public releases, newest
  first, paged. Members-only releases never appear in it.
- Empty → the block does not render (*"No notices yet"* is not shipped: real or absent).

### Coming up
- **Sources:** the stocked publisher's `event` releases that carry an **event date** in the future,
  and the featured program's **next show**.
- **A release may carry an event date** (a date, optionally a time); only `event` releases are shown
  here, and a release whose date has passed drops off.
- **A program's schedule is real:** a weekly slot (day, time, the host's time zone) and an optional
  *returns on* date for a break. The next show is derived from it; the offline tile's *next show* words
  are derived from the same value, so the two can never disagree.
- **Times render in the visitor's own time zone**, labelled; dates in plain words (*Sat, Jan 2 · 10
  a.m. PST*).
- Up to four items, soonest first. Empty → the block does not render.

### What the world needs (Play)
- **Three kinds, one line each when present:** **Hiring** — a seat a player could `job apply` for now;
  **Buying** — a good a house buys from players and is short of; **Gig** — an open contract on a job
  board that has not lapsed. Each line: kind, what, and where (the place's own name).
- **Ranking:** one of each kind when it exists (variety teaches more than three of one — lens 1);
  within a kind, the largest need first — most seats open, deepest shortfall, highest reward — then
  the newest. If a kind is missing, the line has fewer rows; none at all → the block does not render.
- **True of the whole world**, not only places currently loaded; derived, never typed, never
  authoritative — it can always be recomputed from the three ledgers.
- **Who posted a gig is never shown**, nor any pay: a stranger sees the hole, not the people.
- **Fresh within a game hour** of the ledgers changing.

### The footer
- panterasbox.com · the show on each carrier · the source — as today; plus **Discord**, **the public
  record** and **Privacy**, each present **only when the operator has set its destination**. Nothing
  is set by default.

## Lens pass

1. **Pedagogy** — the demand line is the first economics lesson a stranger gets: what is scarce, where.
   One of each kind shows that labor, goods and errands are all demand. The calendar teaches that the
   Compact runs on dated, public events.
2. **Creative expression** — a new town, board or shop appears in the demand line with no code; a
   publisher schedules an event by writing a release; a host sets a schedule with the program verb.
3. **a Immersion / b participation** — the page is outside the fiction, but every in-world fact on it
   is the world's own (a seat, a counter, a board) under its own name. 3b: a player can put a line on
   the front page by posting a gig or opening a shop — the polity writes the front page's Play line,
   the operator does not.
4. **Values** — showing no names or pay on demand lines (privacy of the poster over completeness); one
   designation (simplicity over expressiveness) — both decided and recorded.
5. **Continuity** — demand is demand in every epoch; the line names kinds, not trades.
6. **Economy** — produces attention for unmet demand; consumes nothing; derived from ledgers that were
   there first.
7. **Governance** — the Compact character is the criterion for who may sit and vote in the Compact;
   the appeal is the player's own choice of character (changeable outside a seat or open vote); tier:
   **B** (the code's), with *one account one vote* being the Compact's own (separation-of-powers).
   ⚠ Gap: what account-level data is public — destined for account-visibility-slate.

## The drive

### Blocking drive

Tags: pace · assertion.

1. *instant · player* — An anonymous visitor opens the front page. Sign-in, the guest row and the live
   count paint; the page is complete with the world's other reads stalled (each block paints or is
   absent on its own).
2. *instant · staged* — The founder account has two characters and has handed off no seat; the
   featured program is the founder's. The show tile reads *<first character's name> · Acting Prime
   Minister*. Nowhere on the page or in the HTML is the founder's email or handle.
3. *instant · player* — Signed in as the founder, at character select, they choose their second
   character as their Compact character. The front page now names the second character.
4. *instant · player* — In the game, `standing` on the Compact character shows labor and capital; on
   the other character it shows play standing and says the account's figures are on the Compact
   character.
5. *instant · player* — The founder hands the Prime Minister's seat to another player's
   non-Compact character: refused, saying it must be that account's Compact character. Handed to that
   player's Compact character: accepted. The front page's host line drops *Acting Prime Minister* (the
   founder no longer holds it); `office list` names the new holder.
6. *instant · player* — The new holder tries to change their Compact character: refused while they hold
   the seat. The seat reverts to the founder; the change is now accepted.
7. *instant · player* — The Office of the Prime Minister publishes a notice and an `event` release dated
   next Tuesday, and reposts a Gazette notice. The front page shows *From the Office of the Prime
   Minister* with all three (the repost with *— from the Terminus Gazette*); a members-only release is
   not shown. *Every notice, in the archive →* opens the anonymous archive listing them.
8. *instant · player* — The host sets the program's weekly slot (Saturday 10 a.m., their time zone).
   *Coming up* shows the dated event and the next Saturday's show, soonest first, in the visitor's time
   zone; the offline tile's next-show words match it.
9. *short · staged* — The clock passes the event's date: it drops off *Coming up*; the next show rolls to
   the following Saturday.
10. *instant · player* — A player posts a gig on the Wharfside board. Within a game hour the front page's
    Play block shows *Gig · <what> · <where>*, without the poster's name or the reward.
11. *instant · staged* — A business whose rooms nobody has visited since boot has an open seat; a house
    that buys a good is below par on it. The Play block shows one *Hiring* and one *Buying* line, with
    their places' names — without anyone walking there.
12. *instant · player* — A player is hired into the seat, the gig is claimed, the house is restocked:
    within a game hour each line is replaced by the next of its kind or drops; with none left the block
    is absent.
13. *instant · staged* — The operator sets the Discord and Privacy destinations: both appear in the
    footer; *the public record*, unset, does not.
14. *instant · staged* — **Restart.** After a restart: the Compact characters chosen, the seat holder,
    the releases with their event dates, the program's schedule and the footer settings read back
    unchanged; the Play block recomputes the same lines without anyone visiting the places.
15. *instant · player* — The page at phone width: sign-in, the show, the chambers with the Play block,
    then Latest and Coming up — no horizontal scroll.

### Soak drive

- *span* — Over a game week of normal play, the Play block keeps changing as gigs are posted and
  claimed and stock moves, and never shows a lapsed gig or a filled seat. (Staged twin: steps 10–12.)

## Acceptance criteria

- An anonymous visitor sees a host line naming a character and its seat, *Acting* while the founder
  default holds it, and never an email address or handle — on the front page, in `office list`, or in
  the HTML.
- Every account has exactly one Compact character; it alone shows the account's labor and capital
  standing, alone may be seated in a Compact office, and cannot change while seated or with a vote
  open.
- The front page's notices are the Office of the Prime Minister's public releases and reposts, each a
  date and a headline; the archive is readable signed out and holds no members-only release.
- *Coming up* shows dated events and the next show, soonest first, in the visitor's time zone, and
  drops what has passed.
- The Play block shows up to one Hiring, one Buying and one Gig line, each real, current within a game
  hour, world-wide, never naming a poster or a price; absent when nothing is needed.
- Discord, the public record and Privacy appear in the footer exactly when their destinations are set.
- Sign-in paints whether any of these reads answers, fails or is slow; every block is real or absent.
- Everything above survives a restart.

## Cross-references

- Seeding slate: [front-page-slate](../slates/client/front-page-slate.md)
- [client-shell.md § The front door](../subsystems/client-shell.md) ·
  [governance.md](../subsystems/governance.md) · [influence.md § Standing levels](../subsystems/influence.md) ·
  [press.md](../subsystems/press.md) · [livestream.md](../subsystems/livestream.md) ·
  [contract.md](../subsystems/contract.md) · [employment.md](../subsystems/employment.md) ·
  [retail.md](../subsystems/retail.md) · [state-model.md](../subsystems/state-model.md)
- [separation-of-powers-slate](../slates/society/separation-of-powers-slate.md) (one account, one vote) ·
  [moderation-slate](../slates/society/moderation-slate.md) (alts as an attack on the record)
