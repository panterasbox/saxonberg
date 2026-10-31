# Client surface — requirements

**Kind:** client
**Leads from:** kernel — the client and the server's `look`. **First
consumer:** the specimen rows the comps were traced from — Dave's Bar,
its back-bar, a pint, the Crowsfoot gin, Dave, the belt knife, the
lounge — all shipped content, all reachable by a new player in their
first minutes.

A player today gets one layout per mode, drawn for one window size: a
360px card rail beside a terminal that runs as wide as the screen, one
breakpoint at 760px, chat with no terminal at all, and an inspection card
that shows a projection of fields rather than what `look` said. This
build lays the client out for **any window** — width classes measured in
CSS pixels so zoom is a breakpoint, a terminal with a reading cap, a card
area that is a feed at one column and a workspace at more — makes
**terminals cards** with one primary, renders the **inspection card from
what `look` says**, sorted by the interface that said it, and gives the
**phone** a chat-first shape. It also closes the client issues the
2026-10-17 UX pass filed against these surfaces, and three privacy leaks
the design's specimen trace found.

Seeding slates: [client-surface-slate.md](../slates/builds/client-surface-slate.md)
(the decisions) and the client half of
[illustration-slate.md](../slates/builds/illustration-slate.md) (§ 1a
the declared shape, § 4 one rule per shape per card size). Comps:
[`docs/design/client-surface/`](../design/client-surface/README.md).

## What already exists

Surveyed 2026-10-30 against master.

- **The card feed** ([card-surface.md](../subsystems/card-surface.md)):
  one birth path (a command opens a card), pinned vs live, one sweep
  clock, closed husks, `cockpit card pin|dismiss|auto` as commands. One
  column, 360px, newest at the bottom. No sizes, no tray, no trail.
- **Modes** ([cockpit.md](../subsystems/cockpit.md)): `play` · `chat` ·
  `watch` · `build` · `govern`, switched from a top-bar menu. `govern`
  has no layout and silently falls back to `play`. Arrangements save and
  recall as storage only. Input mode is a per-bar map that resets at
  login.
- **The frame** ([client-shell.md](../subsystems/client-shell.md)): a top
  bar with the widget shelf, a status bar (desktop only), the tab strip —
  every tab a filtered view over the one frame buffer, `All` locked,
  `Aether` the default. One 760px breakpoint. On the phone only `play` is
  laid out (cards inline, a pinned chip row); chat and watch are not.
- **Terminals**: one per mode, except watch (the game terminal and the
  stream chat). Five command bars. No line-length cap.
- **The record layer** ([record-layer.md](../subsystems/record-layer.md)):
  a per-player frame store; the client buffer is a cache of it; `recall`
  searches it. **"A terminal is a filtered view of one log" is already
  true** — the tab strip is exactly that.
- **The inspection card**: a fixed list of fields, not `look`'s words. It
  drops "Owned by", "Holding", the screen line, hints, the light band and
  notices, and in card mode the terminal suppresses the look prose — so
  those facts reach the player nowhere.
- **`look`'s output** is built from three shapes (authored prose, state
  lines appended per interface, `──` controller lists). Nothing records
  which interface said which line.
- **Illustrations**: one image key per row; the client center-crops it
  into a 6.5rem band.
- **Overlapping slates**: [card-sizes-slate.md](../slates/builds/card-sizes-slate.md)
  (this build revises its sizes, focal/full, the panel, the phone and the
  Thing card — see Surface decisions); [card-ux-brief.md](../card-ux-brief.md);
  [cockpit-composition.md](../cockpit-composition.md) (its laws hold; its
  tiers and splits are replaced);
  [carded-prose-slate.md](../slates/tails/carded-prose-slate.md)
  (superseded by `look` as segments); `client-cockpit-slate` (its "mobile
  is not a stream + button bar" is reversed for explore).

**Therefore what is genuinely new here is** the geometry (width classes
in rem, the terminal cap, the feed/workspace card area with placed and
flowing cards, roles that rebind, the displacement order, the tray and
the Recent trail, the panel as a region of cards), terminal cards over
the shipped frame store, `look` arriving with each line's shape and
source and a card that renders it, the new chrome (rail and status bar),
and the phone's chat and watch shapes. The frame store, the card birth
path, the sweep and the arrangement storage are reused, not rebuilt.

## Goals

- **The layout fits the window.** At every common CSS width from 1280 to
  2560 — window size, browser zoom and OS scaling being one case — the
  terminal reads at no more than ~90 characters, the card area shows as
  many unit columns as fit, and nothing is an empty gutter.
- **One column is a feed, more is a workspace**, from one list: cards a
  player placed keep their place across resizes; a narrow-and-back
  returns them exactly.
- **Only a command changes which cards are up.** Every open, grow,
  shrink, minimize, move, pin and close is a command that appears in the
  log, and recalling an arrangement restores it.
- **The room card follows you.** Moving updates the role in place; it
  never stacks a new card below the fold.
- **Every terminal is a card**, any filter can be the primary, every
  terminal card has its own command bar, and chat mode has a terminal.
- **The inspection card says exactly what `look` said** — nothing more,
  nothing less — with every section marked by the interface that said
  it, and the quiet interfaces one click away.
- **Nobody's pockets, exact weight, true name or true combat state
  reaches a viewer who did not perceive it**, on the card or on the wire.
- **The phone plays**: chat first, explore with a button bar, watch laid
  out, every card reachable.
- **An image is shown in the shape it was made in**, never cropped.
- **The 23 in-scope issues close with the MR** (listed under Scope).

## Non-goals

- **Forum split into board / thread / composer cards; CMS split into
  tree / file / diagnostics / git cards; the web tab; the broadcast
  contract** → [card-sizes-slate.md](../slates/builds/card-sizes-slate.md).
  Until then the forum and CMS open as the cards they are today.
- **Pop-out card windows; the streamer deck's future** →
  [broadcast-ready-slate.md](../slates/builds/broadcast-ready-slate.md).
  The deck keeps working where it is.
- **Card bodies by branch (Location, Zone, Warren, the agency ladder),
  the person marker, the Idea card and its catalogue** → card-sizes
  slate.
- **A govern layout** (offices, open motions) → card-sizes slate. This
  build only *shows* the fallback.
- **Per-mixin wording.** The card shows what each interface says today;
  improving what each one says is mixin-by-mixin work →
  [client-surface-slate.md](../slates/builds/client-surface-slate.md)
  § "What each mixin says is left to the build" — deliberately left to
  the trades that own them, except the two quieted here.
- **The illustration generator** (declared shapes at generation, the
  style row, regenerating the 19, generator directives) →
  [illustration-slate.md](../slates/builds/illustration-slate.md). This
  build only carries and honors the shape.
- **Icons for branches and interfaces** →
  [iconography-slate.md](../slates/builds/iconography-slate.md). Letters
  stand in.
- **Prose color with a settings screen (#88), the document card (#57),
  place surfaces design (#79), disambiguation locations (#98), the
  reconnect stall (#68)** → their own issues.
- **Washing keeps the verdict (#106), single-sense verbs (#107), prose
  that contradicts state (#108)** → filed for crafting, perception and
  content.
- **Player-typed MML reaching the wire (#86, SECURITY)** → its own fix,
  ahead of this build; it is not this build's surface and must not wait
  for it.

## Scope — issues this MR closes

Terminal: **#55** line measure · **#54** auto-scroll · **#49** prose
hidden behind a card · **#97** pending prompt swallows commands.
Cards: **#53** room card below the fold · **#92** no way back to the room
· **#50** close/dedupe/husks · **#76** `+N more` · **#91** card links
(with slate bug 5, affordance order) · **#51** composition on every card
· **#89** interface tooltips · **#90** another agent's worn items ·
**#74** status lines · **#69** heading case · **#71** grouped sets.
Chrome: **#84** `play` → `explore` · **#75** Aether → Chat · **#77** top
bar jargon · **#59** stale status bar. Server: **#52** arrival runs
`look` · **#103** pockets and mass · **#104** true names · **#105**
combat fog.

## Placement

Kernel and client. The geometry, cards, terminals and phone are the
client's (`packages/client`); `look`'s segments, the privacy fixes and
the arrival verb are the platform's. No pack gains code. **A second
venue needs nothing**: every rule here reads shapes, sources and widths,
never a particular room or row. The two quieted lines ("It is one
piece.", a never-used vessel's verdict) are quieted by the interface that
says them, for every row.

## Collisions

- **Dave's Bar's back-bar** prints 50+ bottles today; it is the case
  grouping exists for ("14 bottles of spirit ▸").
- **The house tablet** (hospitality and the lounge): its screen line is
  one of the facts the field card drops; it must appear.
- **Every player and every NPC**: the privacy fixes change what a
  stranger reads about them — "a woman" where it said "Mara", no pocket
  list.
- **Saved arrangements**: their storage changes from regions to placed
  cards in units. No migration — dev databases are dropped.
- **The watch layout and the broadcast overlay**: the video moves into
  the terminal column; the overlay reads client facts, so its feed must
  still have what it reads.
- **Character creation**: the species image slot moves from 3:4 to 4:5
  to match the declared tall shape.
- **The forum view and the CMS card** stay as cards in the card area
  until card-sizes splits them.
- **`client-cockpit-slate`**: "tray" here means what *you* minimized; its
  old notification tray is already absorbed.

## Surface decisions

### Width classes, in rem

Six classes, each a width, never an attention level: **icon** (the tray)
· **line** (a chip or a ticker) · **panel** (~240) · **unit** (352–450,
stretching) · **measure** (~704, the terminal column) · **stage**
(everything). Tiers: phone (< 760px) · narrow · feed (one unit) ·
workspace (2–3 units) · wide (4+). All in rem, so zoom is a breakpoint.
**The terminal's text is capped at 42rem**; its column never absorbs
leftover width. A card kind declares which widths it has a body for.
*(slate § Space)*

### Medium and full live in the terminal column

**Medium** is a landscape card across the top of the terminal column;
the terminal keeps the bottom at full reading width. **Full** takes the
stage; the primary terminal drops to a strip (3–4 lines plus its bar) at
the terminal column's position, and other open cards sit as chips beside
it. Full never hides the terminal entirely. ⟲ revises card-sizes' focal.

### The card area — feed and workspace, placed and flowing

As the slate: placed cards have a position (stored in units), flowing
cards only a time. Re-run touches (feed: to the bottom; workspace: in
place, highlighted). Age-out leaves a glance chip (feed: in the stream;
workspace: in the Recent trail). Running out of room goes landing slot →
compress → displace → spill → overflow, stopping at the first that
works; pinned, placed, role and owed cards are never displaced.

- **Displacement takes the oldest touch.** Lens 1 chose: a player can
  predict and learn a pure-time rule, and the chip says why.
- **Drag is insertion only** (user). Dropping onto an occupied spot
  inserts into that column; there is no swap gesture.

### Liveness: placed and role cards are live

(user, option b) A card a player placed, and a role card (the room I'm
in, the navigator), stays live: the world changes what it shows. A
flowing card is a snapshot with its time and a refresh. This replaces
"focal is live" (card-sizes) and "newest is live" (shipped).

### Every change to the card set is a command

Grow, shrink, minimize, restore, move, pin, unpin and close are all
`cockpit card …` commands, as pin and dismiss already are; they appear
in the log and an arrangement recall restores them. Lens 5 chose: the
same commands at every width and on the phone. A saved arrangement
records each terminal card's filter and input mode (lens 2: the
workspace a player composes is theirs to keep).

### Minimize vs glance

**Tray** (icon) = you minimized it: fixed at the right of the status bar
in every mode; the system never puts anything there. **Recent trail**
(line) = the system shrank it: atop the card area, newest first, two
lines then "+N". Things that ask something of you (offers, invitations,
DMs) wait as badges on a chip or tray icon until you act.

### The panel is a region that holds cards

Each mode's panel holds cards only, stacked as an accordion: channels in
chat, the navigator in explore, streams and screens in reach in watch.
Build opens with the panel shut until card-sizes splits the CMS. A card
lives in one place; growing it out of the panel moves it. Collapsing the
panel turns its cards into icons on the rail. ⟲ revises card-sizes'
"chrome".

### The chrome: a rail and a status bar

The top bar retires. The frame's only chrome is the **nav rail** (mode
icons, the you-corner) and the **status bar** (the tray at its right).
`play` is renamed **explore**; the Aether tab becomes **Chat**; the
shelf's jargon (#77) is replaced by plain words or moves into cards.
Settings open from the you-corner as a card, never a modal. A mode with
no layout (govern) says so: "govern isn't laid out yet — showing
explore".

### Terminals are cards; one is primary

A terminal card is a filtered view of the one frame store. The primary
cannot be closed or minimized and is the one that drops to the strip
under full; any filter can be primary. Every terminal card has its own
command bar and input mode. The tab strip retires: its views become
filters — on the primary, or opened as their own terminal card. In chat,
picking a channel retargets the primary; a channel already open as its
own card is marked open and picking it focuses that card; "open beside"
makes a new terminal card. Watch puts the video in the medium slot above
the game terminal, the stream chat as a unit terminal card. A unit-width
terminal shows room prose as written — lens 2 and 3a chose: the author's
prose is the subject, and the client does not rewrite it.

### The inspection card renders `look`

`look`'s result arrives as **segments**, each knowing its **shape**
(prose · state · list · notice) and its **source** (an interface, a
class, or a look line). The terminal renders them as text, unchanged
from today; the card renders them as sections. This retires the
carded-prose gap: no line reaches neither.

- **The gutter**: each section carries a stripe in its source's color —
  solid for an interface, dotted for a class or a look line. Hover names
  the interface, what it is, what it says and its commands; click opens
  help, the deeper look and copy. The header carries Perceptible and
  Containable (Addressable for places).
- **Quiet interfaces** collapse into one last row, "N quiet interfaces
  ▸", expanding in place; a quiet row may say how you'd find out ("feel
  it to know"). "It is one piece." and a never-used vessel's verdict are
  quieted at their source.
- **Lists are chips; identical things group** and expand in place. No
  noise rows ("Holds — yes").
- **The header never scrolls.** At unit the body cuts bottom-up and says
  so ("Cut to fit … larger ▸"); medium and full scroll. **The image
  collapses first**, before any notable section (user).
- **Depth inside the card** (a detail) opens behind the breadcrumb,
  showing its command; **depth elsewhere** (`measure`, another subject)
  opens its own card.
- **Not an oracle**: nothing you did not perceive appears.
- **Proposed lines the comps mark** become real: an agent's presence
  line (status and posture, #74), a liquid level word and seal state,
  identical-item grouping.
- ⟲ This replaces card-sizes' "each mixin knows whether it is notable"
  and its composition strip. Lens 3a chose: the card says what `look`
  said, and the specimen trace found no per-interface salience to build
  on. The gutter and the quiet row are the composition, on every card
  (#51).
- **Card links name exactly one thing** (#91): a link resolves to the
  thing it was drawn from, never the first match for a shared keyword;
  what a card offers does not depend on which other objects offer the
  same verb.

### Arrival runs `look`

Arriving in a room runs `look` (#52), so the room card has the light
band, notices and hints, and the description obeys the light.

### Privacy (#103 · #104 · #105)

A person's contents and exact mass are not sent to a viewer who is not
that person. "Owned by", "Made by" and a corpse's name render as the
viewer knows that person. A combat line goes through the fight's fog.

### Images

The image arrives with its declared shape (wide 16:9 · tall 4:5 · square
1:1). Unit: wide spans the card; tall and square sit beside the
description. Medium: wide is a block; the others the same, larger. The
client never crops or stretches. Until rows declare a shape, the branch
default applies (wide for places, tall for agents, square for things).

### The phone — chat first

Three classes: line · unit (inline, cut) · stage (a sheet, the terminal
keeping a strip). Chat is the default mode, shaped like a chat app: one
terminal filtered to the channel; swipe right for channels, left for
who's here; mode tabs at the bottom, hidden while typing. No button bar
in chat: a target chip in the bar (`say ▾`), a suggestion strip while
typing (@-names, emotes, `#channels`), a reply chip, long-press on a line
for react · reply · tell · look, each showing its command. **Explore
gets a button bar** — the commands card at line width (exits first, then
the top few things to do here, "⋯" for the rest), with the placed-card
chips above it — reversing `client-cockpit-slate` (user). Watch is laid
out (video above the game terminal, stream chat a swipe away). The tray
lives in the drawer; there is no status bar.

## Lens pass

1. **Pedagogy** — ⭐ the gutter teaches the model: every line names the
   interface that said it, and the quiet row shows what a thing is made
   of even when it says nothing. The displacement rule is learnable
   because it is pure time.
2. **Creative expression** ⭐ — a player composes their own workspace,
   places cards, saves it and gets it back; any filter can be their
   primary. Authors gain nothing new and lose nothing: their prose is
   shown as written at every width.
3. **Immersion / participation** — not an oracle: the card says only what
   you perceived, every change to it is a command you can read in the
   log, and the room card follows you instead of piling up.
4. **Values** — the privacy fixes come first: nobody's pockets, weight,
   owner, maker or corpse name leaks through a card or a socket.
5. **Continuity** — the same commands drive every width, the phone and a
   saved arrangement; nothing that works today stops working (the forum,
   the CMS and the streamer deck keep their current cards until their
   own builds).
6. **Economy** — none.
7. **Governance** — none; no person is judged. *(Gap: govern has no
   layout; recorded under Non-goals.)*

## The drive

Two halves, both blocking: a **wire drive** for what the server sends
(segments, privacy, arrival, the card commands) and a **browser walk**
for what the player sees. No step moves the game clock past an hour; all
are `instant` or `short`, so there is **no soak drive**.

### Blocking drive

**Wire** (player assertions unless marked):

1. `instant` · player — A new player arrives in Dave's Bar. The arrival
   runs `look`: the room result carries the light band, notices and the
   obvious exits, and its segments each name a shape and a source.
2. `instant` · player — `look back-bar`: the bottles on it arrive grouped
   by kind, not 50 lines; the segments include Placing's list.
3. `instant` · player — `look pint` (served): a Bulkable state segment
   ("It holds a pint of beer…"), no "It is one piece.", no verdict on an
   unused glass.
4. `instant` · player — `look tablet`: the screen line is present.
5. `instant` · staged — A second player B stands in the bar holding a
   coin purse. Player A `look B`: no contents, no exact mass on the wire;
   B's worn items are named, not "something"; the presence line gives
   B's posture.
6. `instant` · staged — A thing owned by B, and a mug made by B, on the
   bar. A (who has never been introduced) `look`s each: "Owned by" and
   "Made by" name B as A knows B, not B's true name.
7. `short` · staged — A corpse of a named NPC A never met: A `look`s it
   and reads "the body of a man", and cannot address it by the dead
   man's name.
8. `instant` · staged — A and an NPC fight; a third player watches and
   `look`s A: the combat line is fogged as the fight's narration is.
9. `instant` · player — Clicking an action on the card for the third
   stool sends a command that names that stool, not the first.
10. `instant` · player — `cockpit card` grow, shrink, minimize, restore,
    move, pin, close each echo in the log; `cockpit layout save wide`,
    then recall, returns the same cards in the same places.
11. `instant` · player — Walk out of the bar: the room card's subject
    changes in place; no second room card appears.

**Browser walk** (Dave's Bar; the player's own account; the comps beside
it):

12. `instant` — 1920×970 at 100%: terminal text stops at ~90 characters;
    two unit columns; the Recent trail and the tray are visible. Zoom to
    150%: the layout becomes the 1280 tier (panel shut, one unit) with no
    horizontal scroll.
13. `instant` — 1440×790: one unit column, a feed. Pin the room card,
    open three more cards, narrow to below one unit and widen back: the
    pinned card is where it was.
14. `instant` — Open cards until the column is full: the oldest unpinned
    flowing card shrinks to the Recent trail with "displaced by `<cmd>`".
    Minimize one: it goes to the tray, and restoring it previews its
    command in the status bar.
15. `instant` — Grow the back-bar card to medium (it sits above the
    terminal; the terminal keeps the bottom), then full (the terminal is
    a strip at the same x; other cards are chips).
16. `instant` — The pint card: hover a gutter stripe — it names
    Bulkable, says what it is and what it says; "N quiet interfaces ▸"
    expands in place. Click a detail word: it opens behind the
    breadcrumb showing its command.
17. `instant` — The back-bar card at unit: "14 bottles of spirit ▸"
    expands in place; the card cuts with "Cut to fit … larger ▸"; its
    image collapsed before any section did.
18. `instant` — Dave's card shows a tall image beside the description;
    the bar's card shows a wide image across the top. Nothing is cropped.
19. `instant` — Switch to chat: there is a terminal, filtered to the
    channel. Open another channel beside it: a second terminal card with
    its own bar. Type in each; each keeps its own input mode. A pending
    "which one?" prompt in one does not swallow a command typed in the
    other.
20. `instant` — Switch to watch on a stream: video above the game
    terminal, the stream chat a unit terminal card.
21. `instant` — Switch to govern: the client says it is showing explore,
    and why.
22. `instant` — The rail shows explore (not play), the tab views are
    filters, Chat (not Aether), no top bar; the status bar shows no stale
    command after character creation.
23. `instant` — Phone, 390×844: chat by default; swipe right for
    channels, left for who's here; long-press a line for react · reply ·
    tell · look, each showing its command. Switch to explore: a button
    bar with the exits first; a card opened by a command appears inline
    and opens as a sheet when tapped; the terminal keeps a strip.

### Soak drive

None — no step needs the clock.

## Acceptance criteria

- At 1280, 1440, 1536, 1728, 1920 and 2560 CSS pixels, the column counts
  match the slate's table, the terminal never runs past ~90 characters,
  and there is no horizontal page scroll — including at 125% and 150%
  zoom.
- A card a player placed returns to the same place after any resize.
- Every change to which cards are up, and where, appears in the log as a
  command, and recalling a saved arrangement reproduces it.
- Moving rooms never adds a second room card.
- Chat mode has a terminal; every terminal card has its own command bar
  and input mode; the primary cannot be closed.
- Every line `look` prints in the terminal appears on the inspection
  card, in a section marked with its source, and nothing appears on the
  card that the terminal did not say.
- A stranger looking at a person receives, on the wire, no pocket
  contents, no exact mass, and no name the stranger does not know; a
  combat line is fogged.
- Arrival shows the room as `look` shows it.
- A card action names exactly the thing it was drawn from.
- No image is cropped or stretched; each sits per its shape.
- On a phone, chat, explore and watch are each usable, and every card is
  reachable.
- The 23 issues under Scope are closed by the MR, each observably fixed.

## Cross-references

- [client-surface-slate.md](../slates/builds/client-surface-slate.md),
  [illustration-slate.md](../slates/builds/illustration-slate.md)
- [card-sizes-slate.md](../slates/builds/card-sizes-slate.md) (revised
  here, ⟲), [card-ux-brief.md](../card-ux-brief.md),
  [cockpit-composition.md](../cockpit-composition.md),
  [carded-prose-slate.md](../slates/tails/carded-prose-slate.md)
  (superseded by segments),
  [broadcast-ready-slate.md](../slates/builds/broadcast-ready-slate.md)
- [card-surface.md](../subsystems/card-surface.md),
  [cockpit.md](../subsystems/cockpit.md),
  [client-shell.md](../subsystems/client-shell.md),
  [record-layer.md](../subsystems/record-layer.md),
  [message-rendering.md](../subsystems/message-rendering.md),
  [media.md](../subsystems/media.md)
- Comps and specimens: [`docs/design/client-surface/`](../design/client-surface/README.md)
