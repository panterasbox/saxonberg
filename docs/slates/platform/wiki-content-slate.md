# Wiki content slate — writing our own wiki, and reading it without logging in

> **Status: UNBUILT** — designed at high level 2026-10-30 with the owner. What ships: the wiki — pages,
> revisions, rollback, sticky anchors, typed subjects, the live architecture panel, components that
> report live values, the reveal model and spoiler levels ([wiki.md](../../subsystems/wiki.md)); wiki
> pages as a content-pack kind (`content/wiki/<namespace>/<slug>.md`), installed through the wiki as
> `pack:<id>` with compare-and-swap, so a page a player has edited is a conflict, never overwritten
> ([content-packs.md](../../subsystems/content-packs.md)); the `wiki-starter` pack (~22 pages); guests
> reading in the client, editing requiring a character; real-world anchors
> ([real-world-anchors-slate](./real-world-anchors-slate.md)).
> **Left:** ⭐ **the in-client reader first** (§ 8 — the `wiki` mode: the wiki's docked panel
> card and the page as the full card; the `portal` namespace, help as a portal) · ⭐ **pages live in the pack, Mongo holds only what players
> write** (§ 10 — so no boot, reset or test world writes the corpus) · the corpus, 600–800 pages by
> portal (§ 9) · pages shipped by the pack that adds the thing · `wiki-starter` for cross-cutting
> concepts, the guides and the portals · `/finalize` graduating the player-facing version into the
> pack's pages · live values transcluded, never restated · spoiler levels for discovery content only
> · then the public read route (level 0), link previews, a read deep link, caching
> **Size:** a build

Settles the [wiki slate](./wiki-slate.md)'s open question 5 (anonymous read).

## 0. The ask **[DECIDED — the owner]**

*"I kinda also wanna start generating content for our own wiki, but I'm not sure how I wanna do this
or manage it. … I'd like to actually have wiki articles for most of our game concepts, and I want it
in the demo now, not wait until launch, because this stuff really helps people understand the game. I
wouldn't mind also figuring out how to render our wiki outside of a logged-in session, so we can just
hotlink to it from wherever and you don't have to auth to pull it up (but you do to edit, obviously)."*

## 1. ⭐⭐ Who owns which pages **[DECIDED — the owner]**

- **Each pack ships the pages for what it adds** — trade-glass documents glass, trade-rubber the cure.
  The page changes in the same build that changes the mechanism, by the same agent, so it never
  drifts. *Trade is mechanism, locality is expression*, applied to documentation: the thing documents
  itself.
- **`wiki-starter` keeps the cross-cutting pages** — concepts no single pack owns (death and the shade,
  the clock, money, jobs, the Compact) and the guides.
- **`/finalize` graduates the player-facing version** — as it graduates knowledge into the subsystem
  docs, it writes or updates the pack's wiki pages for what the build added.

## 2. ⭐⭐ Generating the content **[DECIDED — the owner]**

- **Agents write from what is true** — the subsystem doc, the rows, the verbs; an agent per pack.
- ⭐ **Pages never restate a number; they transclude it.** The components already report live values
  (the composition panel shows a template's values). The legal-code slate's *values are interpolated,
  never restated*: a page that shows oak's live density cannot go wrong when the density changes.
- **Real-world anchors render on subject pages** — the *in the real world* line.
- **The owner reviews in batches**, merged through each pack's MR like any content.
- **Demo first** — the pages a demo player meets: the newcomer path, death and passage, the clinic,
  the clock, money and jobs, the trades in the demo areas. Then the long tail.
- **Help and the wiki cross-link, never duplicate** — help leans systems (verbs, collections, Apis,
  generated); the wiki leans concepts, processes and guides; each points at the other.

## 3. ⭐⭐ Spoilers — open explanation, gated discovery **[DECIDED — the owner]**

The design already assumes a wiki: farming and medicine follow the **anti-wiki rule** — knowing how a
thing works never substitutes for doing it (a condition's signs do not tell you this patient has it;
knowing a cure window does not make you hit it). So **processes are explained openly**. The reveal
model's spoiler levels are for **discovery content** — arcane research results, lore mysteries, story
arcs.

## 4. ⭐⭐⭐ Reading without logging in **[DECIDED — the owner]**

- **A live public route on the game server** — a page's own URL, rendered server-side to HTML through
  **the same render pipeline** at the anonymous floor: public readers see spoiler level 0 only. The
  live architecture panel still works — the world is right there.
- **Link-preview tags**, as the [deep-links slate](../client/deep-links-slate.md) specified for watch pages, so
  a wiki link previews in Discord; a **read** deep-link intent opens the same page inside the client.
- **Editing needs a character** — the guest floor's reasoning, unchanged: an unattributable edit cannot
  be undone by talking to anyone.
- **Caching** — a public route on one box.
- **Not a static export** — that would survive downtime, but goes stale between exports, cannot run
  the live panel, and spends CI minutes.

## 5. Two builds **[DECIDED — the owner, 2026-11-24]**

*"We'll want two builds, one for the actual content and one for everything else. The content I'll
probably wait on till the last minute to do before I start broadcasting."*

### Build 1 — the wiki reader (everything but the corpus)

1. **Pages live in the pack** (§ 10) — first, because every later step adds pages and this is what
   stops them costing every boot.
2. **The `wiki` mode** (§ 8) — the rail word, the docked panel card, the page as the full card, the
   structured listing, back and forward, the tooltip excerpt on wiki links.
3. **The `portal` namespace, the front page and the twelve portal pages** (§ 8c) — they are the mode's
   first minute, so they ship with it; a portal's membership is tags, so it fills as the content
   build adds pages. **Help as a portal** (§ 8d).
4. **The existing 116 pages tagged into portals**, so the mode is usable on day one.
5. **`/finalize`'s wiki step** (done with this slate) and a check that each page's subject still
   resolves.

### Build 2 — the corpus (§ 9), last, before the broadcast

The 600–800 pages, portal by portal — an agent per pack or portal, reviewed in batches. Waits on
build 1 only for the portals and tags; nothing else. Timed by the owner to land just before
broadcasting starts, so the pages describe the platform as it is then.

### Later — the public route

Level-0 pages over the same renderer, link-preview tags, caching, a rate limit, registered before the
client's catch-all; and **the read intent** — the deep link that opens a page in the client's wiki
mode. Not in either build.

## 6. The lens pass

*(2026-11-24 additions in § 8–10: pedagogy — the reader is the gateway while the world is thin;
expression — a page is a file, changed with no boot; economy — no boot or test pays for pages
nobody reads.)*

1. **Pedagogy** — the game's processes explained by the people who built them, with live values and
   real-world anchors.
2. **Expression** — a pack documents what it adds; players edit what they know.
3. **Immersion** — the wiki stays out of fiction. **Participation** — a public page anyone can be sent
   to; a commons anyone with a character can improve.
4. **Values** — discovery content stays discovered.
5. **Continuity** — pages transclude, so they survive tuning.
6. **Economy** — no CI minutes; the server renders what it already knows.
7. **Governance** — open editing with fast rollback, unchanged.

## 7. Open

1. **The URL shape** — beside the deep links' `/go/…`, or its own path (public-route step).
2. **The public route's cache** — how long, and invalidated by a page edit (public-route step).
3. **Read on the phone** — whether the wiki's panel card is a drawer from the left, as chat's channel
   list is (modes-slate § 6b).
4. **A changed pack page under a player's edit** (§ 10) — the note is decided; whether the edit's
   author is also told (their inbox) is not.

## 8. ⭐⭐⭐ The reader — a `wiki` mode **[DECIDED — the owner, 2026-11-24]**

The owner: *"if you wanna know what you can do here the wiki is the best place for it at this stage
of development … I mostly care about readers right now, not writers."* Content in the world is thin
and placeholder; the wiki is the faster gateway than walking around. **In-client first** (the owner),
ahead of the public route — and it serves the stream too: a guest may already read the wiki
([wiki.md § The guest floor](../../subsystems/wiki.md)), so a viewer who opens the client as a guest
lands in it with no character.

**What ships today, for a reader:** one card in the right-column feed (`WikiCard`) with a search
field (`recall --scope wiki`), one page at a time, followed link by link. No front page, no way to
browse, no outline-as-navigation for a reader (an outline row opens that section for *editing*).

### 8a. It is a mode

It passes [modes-slate § 2](../client/modes-slate.md)'s test: an information space no other mode has
(the encyclopedia — the article, where you are in it, what links where) and the place someone spends
the most time at this stage. Named **`wiki`** (the owner, after the prototype: *"it doesn't really
fit the names of the other modes"* — the verb test bends for a surface everybody already knows how
to use; the wordmark inside is **Saxopedia**, a working name). Out of fiction like `build`. ⚠ An in-world book, newspaper or release could later open on the same surface —
the name leaves the door open; **not in this build**.

The five questions:

1. **Who, doing what** — a newcomer or a stream viewer, usually a guest, finding out what this place
   is and what it does. Browsing, not looking up one fact.
2. **The information space** — the article and its outline; which portal you are in; what is related
   and what links here; the live architecture panel on a subject page.
3. **The loop** — open a page, read, follow a link, go back. Every step is a command that already
   exists — `wiki <page>`, `wiki list`, `recall --scope wiki`, `wiki links` — so all of it can be
   typed (bus primacy, unchanged).
4. **In and out** —
   - **in:** the rail's `wiki` button; any wiki term in a tooltip or in help (the excerpt's *read
     more*); and *"what can I do here?"* at the front door and in the lounge;
   - **out:** a page about a place, a trade or a verb offers the way to it (*go there*, *try `fell`*)
     — an **offer** the player clicks, never a switch (modes-slate § 5), and the click lands in
     explore.
5. **The first minute** — **the front page**: what Saxonberg is and how to get around it, then the
   portals as a grid, each with its icon and one line (icons first — each icon with its own tip).

### 8b. The layout — the shipped stage, nothing new **[DECIDED — the owner, 2026-11-24: "this looks good, we can work with this"]**

Prototype: https://claude.ai/artifact/1MnyeFFZzxAG8jtTNYqsSy (v2 — drawn from `Frame.tsx`, `Rail.tsx`,
`ModeStage.tsx`, `Card.tsx`, `StatusBar.tsx` and the tokens; ⚠ v1 invented its own layout and was
rejected: *"this has to fit inside the existing client"*).

The wiki mode is **the desktop frame unchanged** — top bar, the rail of mode words (`wiki` added), the
stage, the status bar — with two things in the stage:

- **The panel (22rem) holds the wiki's docked card** — the wiki's answer to explore's navigation card, only
  ever that card (modes-slate § 6a rule 8). Docked, it shows its title and body only:
  - **search** (`recall --scope wiki`, suggestions as you type, Enter for all results);
  - **back · forward** — the reader's own history of pages read, each step re-issuing the read
    command; never something the server did not say;
  - **Main page · Random page · Recently changed · Pages people want** (`wiki wanted`);
  - **On this page** — the open page's outline, which for a reader *scrolls to* a section and follows
    the scroll; the edit-a-section click stays on the page for someone who may edit;
  - **the portals**, each with its count.
- **The page is a card** at the **full** step by default — the shipped full step: the card takes the
  stage, the terminal drops to a strip at the column's x, other cards wait beside it as chips. Its
  grow/shrink control moves it to an ordinary card in the feed beside a full-height terminal
  (`client-card grow`/`shrink`) — the same steps as every mode.
- **The page itself** is a standard wiki page, so nobody needs teaching: breadcrumb (portal), title,
  page name, revision and editor, a lead, an infobox (a subject page's values marked *read from the
  world*), the live architecture panel, sections, portals at the foot, **Related** and **What links
  here** (`wiki links`). Red links for wanted pages; a red page lists who mentions it.
- **Hover is the client's**: the command a link sends shows in the status bar (the one preview
  surface), and a wiki link gets **the shipped tooltip** with the page's opening (the excerpt).
- **Every click echoes in the terminal**, and typing `wiki glass` or `help pay` moves the page.
- ⭐ **The finding**: the mode needs **no new stage shape** — it is the panel's card plus a default
  step. Whether the wiki is *a mode* or *an arrangement of a more abstract document layout* is left to
  the next document that wants the same shape (help, the law code, the press); the stage already
  is that layout.
- **The phone** has its own shell (`PhoneShell`) and is not designed here — § 7.

### 8c. What the server must express

⭐ *The client must not make up things the server doesn't express* (the owner, modes). So:

- **The front page and the portals are wiki pages** in a new **`portal`** namespace, authored in
  `wiki-starter`. A portal page has prose (what this area of the game is, where to start) **and** a
  membership read from **tags**, which pages already carry — a page joins a portal by its tag, never
  by being listed by hand, so the A–Z cannot go stale.
- **A listing publishes a structured twin**, as the page already does on `publication.wiki`: `wiki
  list` (and a portal's membership) sends prose to the scroll and a `wiki-listing` frame —
  handle · title · one-line summary · icon · portal — that the wiki's panel card reads. A card built by
  parsing prose is rejected.
- **The one-line summary** is the page's opening sentence (the excerpt already renders the opening
  section) — no new authored field.
- **The reader's gate is unchanged**: the listing goes through the same reveal gate as the page, so a
  page you may not see is not listed.

### 8d. ⭐ Help is a portal **[DECIDED — the owner]**

Help leans systems (verbs, collections, Apis — generated); the wiki leans concepts, processes and
guides; § 2 says they cross-link and never duplicate. **Help appears as one portal in wiki mode** —
its topics listed by help's own categories and **rendered by help**, never copied into wiki pages. One
place to browse; two sources, each still the truth for its half. A help topic opened in wiki mode
links out to the wiki pages about its concepts, and a wiki page about a verb links to its help topic.

### 8e. Writers stay thin

The verbs stay as they are (`wiki edit`, `create`, `history`, `rollback`, …) and the card keeps its
edit affordances for someone who may edit. **No new authoring surface** in this build — no editor,
no live preview (wiki.md's decision, unchanged).

## 9. ⭐⭐ The corpus — 600–800 pages, by portal **[DECIDED in size — the owner: "500 sounds on the low end but still in the ballpark"]**

Today: 116 pages — 84 short material stubs in `base-library`, 22 in `wiki-starter`, about ten across
the packs.

| portal | holds | pages |
|---|---|---|
| **Getting started** | your first hour, the command line, tooltips, modes, scripts and aliases | ~30 |
| **The world** | places and the realms, getting around, the clock, weather, the seasons | ~60 |
| **Living things** | species, the body, the vitals, medicine, death and the shade | ~80 |
| **Things** | materials (the 84 stubs filled), goods, vessels, size, condition, dirt | ~150 |
| **Trades** | one page per trade (~55) and its process pages | ~200 |
| **Money and work** | banking, jobs, businesses, credit, retail, contracts | ~40 |
| **The Compact** | offices, elections, law, moderation, the polity | ~40 |
| **Magic** | arcane science, the spellbook, what magic costs | ~40 |
| **The aether** | devices, apps, the Exchange, messages | ~20 |
| **Disciplines** | one page each (~48): what it is, where you practice it, what it opens | ~48 |
| **The platform** | packs, building the world, MQL, the wiki itself | ~40 |
| **Help** | help's own topics, rendered by help (§ 8d) | — |

- **Ownership is § 1's**: a pack ships the pages for what it adds; `wiki-starter` ships the portals,
  the front page, the cross-cutting concepts and the guides.
- **Agents write from what is true** (§ 2) — the subsystem doc, the rows, the verbs — an agent per
  pack or per portal. ⚠ The subsystem docs are engineering prose; a page is written **for a player**
  (plain words, no class or file names), and says what you can *do*.
- **Pages never restate a number** — they transclude it (§ 2).
- **Order**: the portals and the front page; then the demo-facing pages (the newcomer path, death
  and passage, the clinic, the clock, money and jobs, the trades a player can reach); then the long
  tail.
- **Review in batches**, one MR per batch, the owner reading.
- ⚠ **Public repo**: nothing internal to anyone's employer, and the private strategy stays private —
  the content pass's briefs say so.

## 10. ⭐⭐⭐ Pages live in the pack; Mongo holds only what players write **[DECIDED — the owner, 2026-11-24]**

The owner: *"we need to alter our workflows a bit so we don't waste time on populating a db with
wiki content just to run tests."*

**The cost today.** Every boot runs `PackApi.install()`, and the `wiki` kind submits **every page**
through the registry's own create/edit path — a page row and a revision row each. The `wiki`
collection's reset disposition is **wipe**, so every fresh or reset world — wire worlds, drives,
soak, CI, a fresh dev database — writes the whole corpus again. At 116 pages it is cheap; at 800 it
is the boot's largest write, paid by tests that never read a page.

**The rule: the pack's `.md` file IS the page.** Authored truth already lives in the pack (§ 1);
the database copy is a duplicate the boot pays to make. *Load on use, never boot.*

How each piece works:

1. **Reading a page.** Resolve the name; if a player has edited it, the page is the edit (the `wiki`
   row, as today); otherwise it is **the pack's file**, read from disk. A pack page with no edit has
   **no row**.
2. **The pack-page index** — the names (slugs and aliases), titles, tags, subjects and opening lines
   of every shipped page — is built **in memory the first time anything touches the wiki**, never at
   boot. A test that never reads the wiki never builds it. One name space per namespace still holds:
   a pack page and a player page may not share a name (the refusal still names the holder).
3. **The first edit** of a pack page writes the row — its revision log starts with the pack's
   version as rev 0, recording **which pack version it was based on** (the file's hash), then the
   edit as rev 1. History before that is the pack's own git history.
4. **Install does nothing for the wiki.** The `wiki` content kind stops writing; it **validates**
   (frontmatter, names unique, the subject resolves — the checks it makes today) and nothing more.
5. **A changed pack page under a player's edit** — today an install conflict (`wiki-cas`, `pack
   diff`, `pack resolve`). Now: the page keeps serving the player's edit and carries a note —
   *"the pack's version has changed since this edit"* — with a diff of the pack's two versions, and
   an editor can take the pack's version (a new revision, so history keeps both) or keep theirs. ⭐
   The conflict moves from the operator's install log to **the page, where the person who can
   settle it reads it** — and the CAS install machinery for the wiki retires.
6. **A vanished pack file** keeps a page that has an edit (community property, as today) and drops
   one that has none — a page nobody touched is the pack's to remove.
7. **Search and the whole-corpus reports** (`recall --scope wiki`, `wiki links`, `wanted`, `orphans`,
   `dangling`) read **the pack index and the edited rows together**. Search over the index is in
   memory; an edited page supersedes its pack page, never appears twice.
8. **Authoring** — edit the file and the next read shows it (the index notices a changed file), with
   no reinstall. A wiki page joins the content a pack can change without a boot.
9. **Reset** wipes only what players wrote, which is what `wipe` meant all along.

⚠ **Rejected: skip the wiki install in test worlds.** Cheaper to build, but drives would run against
a wiki that is not the real one, and every reset still rewrites the corpus.

