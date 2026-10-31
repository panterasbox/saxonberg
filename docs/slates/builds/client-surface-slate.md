# Client surface slate — a terminal and cards, laid out for any window

> **Status: UNBUILT** — the card feed, mode × arrangement storage and the
> civic theme shipped → [card-surface.md](../../subsystems/card-surface.md),
> [cockpit.md](../../subsystems/cockpit.md),
> [client-shell.md](../../subsystems/client-shell.md)
> **Left:** sizes as width classes (icon · line · panel · unit · measure ·
> stage) · zoom-aware tiers and a terminal reading cap · the card area as a
> feed at one column and a workspace at more · placed vs flowing cards,
> roles that rebind, displacement before overflow · minimize to a tray,
> glance chips for what the system shrank · the mode panel as a region
> that holds cards · terminals as cards, one primary · the inspection card
> rendered from `look`'s three shapes with a source gutter · the phone,
> chat first
> **Size:** a build

**Captured 2026-10-20 → 2026-10-30**, in a design session against
`panterasbox/saxonberg@9550937c6`. The comps are in
[`docs/design/client-surface/`](../../design/client-surface/README.md).
Every frame there runs in a browser. Its inspection-card frames are built
from a static trace of real content rows; those traces sit beside them in
`specimens/`.

Related: [card-sizes-slate.md](card-sizes-slate.md) (sizes, focus,
arrangements, card bodies — this slate **revises** parts of it, marked ⟲),
[card-ux-brief.md](../../card-ux-brief.md) (the 48-issue usability pass),
[cockpit-composition.md](../../cockpit-composition.md) (the layout
grammar), [illustration-slate.md](illustration-slate.md) (images on
cards), [carded-prose-slate.md](../tails/carded-prose-slate.md) (the card
never rendering the prose it is handed).

---

## What is true today

- **One breakpoint.** `tokens.breakpoint.compact` (760px), switched in JS.
  "standard" and "wide" from the composition grammar were never built.
- **Fixed widths.** The card feed is 360px; side columns are 22–24rem. No
  resizable splitter. **The terminal has no line-length cap** (#55).
- **No card sizes.** Every card is content-sized in the 360px rail. A focal
  slot exists only in the watch layouts.
  `tokens.ratio.focal` (62/38) is declared and unused.
- **Chat mode has no terminal** (it renders `ForumView`/`ChatSurface`),
  which breaks never-blind. Watch mode renders no card feed. `govern`'s
  fallback (`ResolvedMode.fallbackFrom`) is computed and never shown.
- **The inspection card is a field projection** (`DETAIL_FIELDS`), not
  what `look` said. It loses Holding, Owned by, the display's screen line,
  hints, the light band and notices. In card mode the look prose is
  suppressed, so those facts disappear.

---

## ⭐⭐⭐ Space: width classes, measured in CSS pixels

**Zoom is a breakpoint.** At 150% zoom a 1920 screen is a 1280 screen to
CSS, and Windows laptops ship at 125–150% scaling. Every breakpoint and the
terminal cap are in rem, so window size, zoom and a future font-size
setting are one case, not three.

**The terminal's text is capped at 42rem** (about 90 characters of
Newsreader at 16px, about 80 of Plex Mono). Its column is ~44rem (704px)
with padding. The text never runs longer; the column never takes the
leftover.

**⟲ Sizes are width classes, not attention levels.** A card's size is the
width of where it sits. Its height is whatever its stack leaves, handled by
the cut order and the fixed header.

| class | ~width | where | a terminal card there | other cards there |
|---|---|---|---|---|
| icon | — | tray (status bar, right) | unread badge | you minimized it |
| line | one line | glance trail · strip row | the last line, a ticker | the system shrank it |
| panel | 240 | the mode panel | — | channels, navigator, tree, streams |
| unit | 352–450 | card-area columns | a sidecar, ~50 ch | portrait body, cut to fit |
| measure | ~704 | the terminal column | the primary, ~90 ch | landscape body ("medium") |
| stage | everything | the whole stage | stays as a strip | full |

The card-sizes slate's glance · feed · focal · full map onto line · unit ·
measure · stage. A card kind declares which widths it has a body for.

**What the numbers give** (rail 56, panel 240, terminal 704, unit ≥ 352,
gaps 12):

| CSS width | typical screen | units, panel open | panel shut |
|---|---|---|---|
| 1280 | 1080p laptop @150% | 0 | 1 |
| 1366–1440 | laptops, MacBook Air | 1 | 1 |
| 1512–1536 | MBP 14, 1080p @125% | 1 | 2 |
| 1728 | MBP 16 | 2 | 2 |
| 1920 | 1080p @100% | 2 | 3 |
| 2560 | 1440p, 4K @150% | 4 | 4 |

- **Most players get one column.** The one-column feed is the main
  experience, not the fallback.
- **The panel costs two-thirds of a unit**, so "the panel collapses first"
  is load-bearing.
- **Units stretch** (22rem up to ~28rem) to absorb the slack; the terminal
  never absorbs it as an empty gutter.
- **Below one unit** the card area is the glance strip alone; cards open
  at measure.

Tiers, in rem: phone (< 760px, its own design) · narrow (~760–1100,
terminal + glance strip) · feed (~1100–1650, one unit) · workspace
(~1650–2300, 2–3 units) · wide (2300+, 4+).

### Medium and full live in the terminal column

- **Medium** is a landscape card across the top of the terminal column
  (~704 × 440, about a 16:9 video). The terminal keeps the bottom, at full
  reading width and fewer lines. It is on top so output and input stay
  adjacent. It works identically on every screen, laptop included,
  because the card area is untouched.
- **⟲ Full** takes the stage. The primary terminal drops to a strip
  (3–4 lines plus the command bar, ~132px) at the terminal column's x and
  width, so the bar is where the hands expect it. The other open cards sit
  as chips beside the strip. The card-sizes slate's "terminal strip" is
  kept; full never hides the terminal entirely.

---

## ⭐⭐ The card area: a feed at one column, a workspace at more

**One list underneath, two kinds of card in it.** **Placed** cards have a
position (pinned, dragged, or put there by the arrangement). **Flowing**
cards have only a time.

- **One column = a feed**: placed cards stack as a stable header, flowing
  cards run below by time, newest at the bottom.
- **Two or more = a workspace**: placed cards hold their slots (stored in
  units, never pixels); flowing cards fill a landing slot.
- **Resizing never scrambles.** Narrow to one column and back and placed
  cards return to their slots. Shrinking past what an arrangement needs is
  deterministic: the rightmost column folds into the feed order.

**⟲ The verbs mean different things by layout:**

| | feed | workspace |
|---|---|---|
| re-run (touch) | moves to the bottom, focuses, refreshes | refreshes in place, highlighted; never moves |
| ages out | leaves a glance chip in the stream | frees its slot; the chip goes to the trail |
| new card | lands at the bottom | lands in the landing slot |

### Lifecycle — every change is a command execution

The rule: **the world can change what is on a card; only a command
execution changes which cards are up.** It doesn't matter whose command:
"Bob shoves you north" in your log explains the new room. Commands that
change *your situation* (moved, handed something, hit, put in a party) may
change your cards. Commands that *ask something of you* (offers,
invitations, DMs) wait as badges or chips until you act. The relevance
timer stays as the one accepted exception.

- **Pin = it stays up.** Position is separate: the system may move a
  pinned card, and drag-and-drop puts it back.
- **Roles rebind; subjects don't.** "The room I'm in" and the navigator
  are roles, slots that whichever subject fills them sits in, so moving
  updates in place (#53, #92). A card about a subject keeps its subject
  and freezes as "last seen" when the subject leaves.
- **Owed cards** (a waiting prompt, a draft) always get in and are never
  displaced.

### Running out of room — in order, stopping at the first that works

1. **Landing slot** if there is space.
2. **Compress**: a column's cards share its height; unit cards cut toward
   their minimum (header + kept fields + notable sections).
3. **Displace**: the stalest card that is both unpinned and flowing
   shrinks to the glance trail, its reason on the chip ("displaced by
   `look rack`"). Never pinned, placed, role or owed cards.
4. **Spill** to another column that can make room by 2–3.
5. **Overflow** only when everything left is protected: the card area
   scrolls as one surface, never per column, and the trail says you are
   over capacity.

**Two cards for one slot:** the same subject touches, not competes. Role
slots hold one by definition. Medium and full hold one each; growing B
sends A back to the slot it came from. Dropping onto an occupied spot
inserts into that column's stack. A command that births several cards
displaces once, for the batch.

**Open:** the "stalest" rule. Pure time (oldest touch) is predictable;
weighting live or notable cards is kinder. Pick one.

### Minimize and glance are different things

- **Icon = you minimized it.** It lives in a tray at the right of the
  status bar: fixed chrome, present at every width and in every mode, and
  the restore click previews its command in the same bar. Minimizing
  doesn't change lifetime. The system never puts things in the tray.
- **Glance = the system shrank it** (aged out, displaced, a room you
  left). It lives in a "Recent" trail atop the card area, newest first,
  two lines at most, then "+N".

---

## ⭐⭐ The mode panel is a region that holds cards

**⟲ The panel is a region, not chrome** (the card-sizes slate called it
chrome). Every mode puts cards in it: channels (chat), the navigator
(explore), streams and screens in reach (watch), the file tree then git
and diagnostics (build), offices and open motions (govern). It holds
**cards only**, as a vertical stack:

- Height is shared; a stacked card can collapse to its header (its glance
  at panel width), so the stack behaves as an accordion.
- **One place per card.** Growing the navigator to medium or full moves
  it; an emptied panel collapses and hands its width to the card you grew.
- A card may dock there only if it declares a panel body (~240px).
- Collapsing the panel turns its cards into icons under the mode icons in
  the rail.
- Headers, search and filters belong to the card they act on.

So the frame's only chrome is the nav rail (with the you-corner) and the
status bar. Everything else is a region holding cards.

---

## ⭐⭐ Terminals are cards; one is primary

A terminal card is **a filtered view of the one frame store**, its subject
the filter or lens. Two terminals are two views of one log, and `recall`
still finds everything (the brief's "one terminal, filtered, never a second
stream").

- **The primary** can't be closed or minimized, and it is the one that
  drops to the strip under full. **Any filter can be primary**: the room
  in chat, everything in explore.
- Others are ordinary cards: a filter chip in the header; closable;
  minimizable to a tray icon carrying unread; at line width, a ticker.
- **Each terminal card carries its own command bar and input mode**
  (`barId`); per-bar mode becomes a card property.
- Chat mode follows: picking a channel retargets the primary (Discord's
  behavior; the highlight in the channel list = what the primary shows).
  A channel already open as its own terminal card is marked "open", and
  picking it focuses that card. "Open beside" (right-click or
  modifier-click) creates a new terminal card in the landing slot.
- The watch layouts become the same thing: the game terminal (primary)
  under the video in the terminal column, the stream chat as a unit-width
  terminal card.
- A unit-width terminal is a chat width (~50 ch). Room prose wraps badly
  there; such a terminal may want a lens that shortens prose.

---

## ⭐⭐⭐ The inspection card — what `look` says, by source

The specimen trace (`specimens/SPECIMEN-SHEET.md` in the handoff, 22 real
rows) found that an inspection result is built from **three shapes and
only three**:

1. **Authored prose** — the description, detail words wrapped by
   Detailed's augmenter.
2. **State lines**, one per augmenter, in composition order. Mostly mixins
   (Bulkable, Branded, Durable, Soilable, Wet, Vitals, Attired, Constructed);
   some are a class's own augmenter (Character's body line, Weapon's
   playstyle, CraftVessel's verdict).
3. **Controller lists**, `── <heading>: …` (On it, Owned by, the screen,
   Wearing, Holding, In it, Obvious exits, You also see, hints), plus the
   room's separately-sent light band, tint and notices.

There is no fourth shape. Nothing produces short "state words" or a
per-mixin salience; earlier comps that assumed them were wrong.

**The card renders the same three shapes**, not a parallel field model:

- **A source gutter, like the terminal's `GutterStripe`.** Each section
  gets a 3px stripe in its source's color. Hover shows the source's name,
  what the interface is, what it says, and its commands; click opens a
  popover (help, the deeper look, copy). Stripes, not rules, tell sections
  apart. Solid = a mixin; dotted = a class augmenter or a look-controller
  line. Several stripes side by side = several sources made one section
  (the description: Visible + Detailed). The header carries Perceptible
  (what you can call it) and Containable or Addressable (where it is).
- **Quiet interfaces** — composed but with nothing to say — collapse into
  one last row, "N quiet interfaces ▸", which expands in place. A quiet
  row can still say how you'd find out ("feel it to know"; Contaminable:
  "no sense reports this").
- **Quiet is the augmenter's own business**, the way Freshness says
  nothing when fresh. "It is one piece." (Assembled, on every unbilled
  thing) and the verdict on a never-used glass are the two to quiet.
- **Lists are chips; identical things group** ("14 bottles of spirit ▸",
  expanding in place). The Placing branch has no cap today and prints 50+
  bottles.
- **The header never scrolls.** Unit doesn't scroll; it cuts bottom-up
  and shows "Cut to fit … larger ▸". Medium and full scroll the body.
- **Depth in this card** — a detail (and, later, a facet) — opens behind
  the existing breadcrumb, showing its command. **Depth elsewhere** —
  `measure`, `analyze`, another subject — opens its own card.
- **Not an oracle**: nothing you did not perceive appears. No spoiler
  wrappers, no walls, no placeholders for hidden state.

**The one structural server change**: `look`'s result arrives as
**segments**, each knowing its shape (prose · state · list · notice) and
its source (a mixin, a class, or a controller line). `Mml.augment` already
walks augmenters per mixin, so it can tag what each appends. The terminal
renders the segments as text; the card renders them as sections. This
also retires the carded-prose gap (lines folded into `body` that reach
neither the transcript nor the card).

**The comps assume, and mark as proposed** (blue, italic, dashed stripe):
a liquid level word, seal state, an agent's presence line (status +
posture; neither reaches `look` today), identical-item grouping, and Idea
cards' facts in sentences.

**What each mixin says is left to the build.** The comps' strings are what
the server says today; the build decides, mixin by mixin, what each
section should say.

---

## The phone — chat first

Phones are about one unit wide, so the classes collapse to three: **line**
(chips) · **unit** (a card inline, cut) · **stage** (a card as a sheet).
The rule from the 2026-08 handoff holds: *interleave what is causally
related, switch what is independent.*

- **Chat is the main use**, so the phone is chat mode by default and
  shaped like Discord's mobile app: one terminal filtered to the channel;
  swipe right for the panel card (channels; the highlight = what the
  terminal shows); swipe left for who's here; mode tabs at the bottom,
  hidden while the keyboard is up. Govern is not a tab yet.
- **Cards appear inline** under the command that made them; tapping opens
  them at stage as a sheet, the terminal keeping a strip.
- **No button bar in chat.** Chat text is unique, so throughput help is: a
  tappable target chip in the command bar (`say ▾`); a suggestion strip
  only while typing (@-names with the person marker, emotes, `#channels`);
  a reply chip; long-press on a line for react, reply, tell and look, each
  showing its command.
- **Explore gets a button bar**: the commands card at line width (exits
  first, then the top few things to do here, "⋯" for the full card), above
  it the placed-card chips with the room first. Playing by phone works; it
  isn't expected to match a keyboard.
- The tray lives in the drawer; there is no status bar.

---

## Bugs found on the way (file these; fix the privacy ones first)

From the specimen trace, with file:line in `specimens/`:

1. ⚠⚠ A person's `contents` (their pockets) and exact mass reach every
   viewer's client; only the client hides them.
2. ⚠⚠ "Owned by <holder>", "Made by <maker>" and "the body of <name>" use
   the true, viewer-blind name.
3. ⚠ The combat line shows true state to every viewer (no fog).
4. The verdict and "Made by" survive washing a glass.
5. "What it affords" depends on command-stack order for any verb several
   objects offer.
6. Card links target ambiguous keywords (`bottle` on every spirit; six
   `stool`s).
7. Arrival runs `sense`, not `look`: no light band, notices or hints, and
   the full description even at midnight.
8. Single-sense verbs replay the visual description; most augmenters
   ignore the filter.
9. Second and later `──` lines run together with no newline.
10. Authored prose contradicts state: "ranked with bottles" on an empty
    rail; "the stock sheet never far from its screen" while it is dark.
11. Card noise rows "Holds — yes", "Placement — on"; material is sent and
    never shown.

---

## Open questions

1. The displacement "stalest" rule — pure time, or weighted?
2. Swap as a drag gesture, or insertion only?
3. A narrow terminal's lens — does a unit-width terminal shorten room
   prose, or show it as is?
4. Whether the image starts collapsed at unit size when the card is short
   on room ([illustration-slate.md](illustration-slate.md)).
5. The Idea card — oak, a species, a business have almost no player path
   today; the catalogue and its gate are in the card-sizes slate.

## Lens pass

1. **Pedagogy** — ⭐ the gutter teaches the model: every line names the
   interface that said it, and the quiet row shows what a thing is built
   from even when it is silent.
2. **Creative expression** ⭐ — decides the panel fork (a region of cards,
   not chrome) and placed cards in units: a player composes their own
   workspace and saves it.
3. **Immersion / participation** — not an oracle: the card says only what
   you perceived, and every change to it is a command you can read in the
   log.
4. **Values** — the privacy bugs come first; nobody's pockets, owner,
   maker or corpse name leaks through a card.
5. **Continuity** — terminals and cards answer the same commands at every
   width and on the phone.
6. **Economy** — none.
7. **Governance** — none; no person is judged.
