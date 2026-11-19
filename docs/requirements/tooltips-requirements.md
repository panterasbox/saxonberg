# Tooltips — requirements

**Status:** AGREED 2026-11-18 — the owner: *"retrofit everything, take your
leans, write it up."*

**Kind:** client (with a small server part)
**Leads from:** the client. **First consumer:** the client as it stands —
every hover string, link, chip and control already on screen is retrofitted
in this build, so the model is proven on real content before the
navigation build (its biggest consumer) leans on it.

A tooltip is a **small document that previews something you could also
click through to** — a thing's card, a term's glossary page, the command a
click runs. It is never the only place a fact lives. One component carries
it across the whole app: the terminal's identity links, card chips, the
navigator, card controls, icons, the status bar, the top bar. A term inside
a tooltip opens a nested tooltip; a stack can be locked, walked back and
pinned into a card. It says **only what you know** — composed from what the
client already holds, from the glossary authors wrote (help and the wiki),
or from a perception-gated describe of a live thing. Seeding slate:
[tooltip-slate](../slates/client/tooltip-slate.md) (its reuse ledger is the
plan's starting point); the first design is on the owner's private canvas.

## What the thing is

- **What it does** — carries the informational load (the owner's Paradox
  comparison) so a player does not click through layers to learn what a
  mark, a word or a control means.
- **Where it sits** — a way of *looking*, not a part of the world: no
  epoch, no economy, nothing persisted. It previews; the card, the help
  page and the command remain the things it previews.
- **How it scales** — one at a time, but nested: a tooltip opens tooltips,
  and the stack is a breadcrumb. Many on screen at once is never the case.
- **Its material** — legible type (about 14 px body, 320–360 px wide,
  scrolling past a maximum height), icons from the one icon map, an
  illustration thumbnail where the thing has one.
- **What it touches** — the terminal, cards, the navigator, the shell's
  chrome, the help rulebook, the wiki and its reveal model, perception,
  the spoiler appetite, and the phone's touch gestures.

## What already exists

- **No tooltip component and no positioning layer.** About forty native
  browser hover strings across the client (card controls, the tab strip,
  the command bar, prompt strips, reactions, character creation, the
  navigator, every terminal link — *"Click to send: … · shift-click to
  copy"* — and every icon's label).
- **Two hand-rolled popovers** (the scrollback's frame inspection hover,
  the tab strip's delete confirmation) and **one working glossary
  precursor**: the inspection card's gutter fetches a help topic's summary
  once per session to explain an interface.
- **Hover already means something:** it previews the command a click would
  send, in the status bar (one preview surface, guarded).
- **Touch already has two gestures:** a tap opens the command sheet (names
  the command before it sends); a long press on a scrollback row opens the
  line menu or the emote sheet.
- **Clicking a thing runs a command** (`look`, `go`), and `look` is what
  opens a card. Links carry only the thing's identity.
- **Help** is served over the web, summary and body, with a spoiler flag
  and one filter point (a no-op at the floor today).
- **The wiki** has no web path, deliberately: it is read only through its
  own renderer, which applies the capability ceiling and the appetite.
- **A one-shot describe** exists on the wire — perception-gated, carrying
  name, descriptions, contents, illustration — and the client has never
  sent one.
- **The spoiler appetite** (0–3, today a wiki setting) is applied only on
  the server; the client's spoiler span is a local click-to-reveal.
- **No sibling build** is touching tooltips, popovers or the shell
  (aether-devices adds one status-bar row — see Collisions).

**Therefore what is genuinely new here is:** the tooltip as a structured
document rendered by one component; nesting with lock, breadcrumb and pin;
hover-to-inform living beside hover-to-preview and tap-to-confirm; the
client asking the server to describe a live thing; a gated wiki excerpt at
tooltip size; and the appetite reaching the client as one standard
"What is this, really?" block.

## Goals

- **Every hover string in the client is a tooltip.** No native browser
  hover text remains anywhere a player points; an icon's label stays as
  its accessible name.
- **Every identity link and chip has a tooltip** — things, people, places,
  ways, details — in the terminal, in cards and in the navigator.
- **A tooltip is a document:** a header (icon, name, what kind of thing),
  fact rows (each with where it came from and when), prose that carries
  links, an image, links, and a hint footer saying what a click does.
- **Nesting:** a term in a tooltip opens a child; a locked stack shows a
  breadcrumb; Esc closes one level; pin opens the card the tooltip
  previews.
- **Glossary terms come from what authors already write** — a help topic's
  summary, or a wiki page's opening section rendered through the wiki's own
  gate at the reader's appetite. Writing the help or the wiki *is* writing
  the tooltip.
- **A live thing's tooltip says what you perceive now** — never what you
  perceived when the line was printed, and never more than you can
  perceive.
- **Spoilers are one standard block** everywhere, first among them a
  thing's path, collapsed or open by the reader's appetite.
- **Reachable without a mouse:** keyboard focus opens a tooltip; a long
  press on a phone opens it as a bottom sheet.

## Non-goals

- **Map glyph tooltips** → the navigation build
  ([navigation-requirements](./navigation-requirements.md)) supplies that
  content on this component.
- **Breakdowns** (a number and why it is that number) → the first build
  with a number to explain — the navigation build's route cost and step
  beat. No number ships its why today, and a block with no consumer is not
  built here.
- **Tooltips composed from the client's knowledge model** → the
  knowledge-model wave of the navigation build
  ([client-knowledge-model-slate](../slates/client/client-knowledge-model-slate.md));
  this build composes from what the client holds today.
- **Action buttons in tooltips** (open, unlock, look through —
  [map-slate](../slates/client/map-slate.md)) beyond the one command a
  click runs → the navigation build, which owns the way tooltips.
- **One block per mixin a thing composes** (map-slate's boundary tooltip)
  → the navigation build.
- **Portrait recognition and disguise** on a person's image →
  [media.md](../subsystems/media.md)'s deferred recognition gate; until then
  a person's tooltip shows the image any viewer would see.
- **Drawing new icons** → [iconography-slate](../slates/client/iconography-slate.md);
  this build uses the icon map as it is.

## Placement

The client owns the component, the gestures and every retrofit. The server
part is platform (kernel) work and small: the gated wiki excerpt, the
appetite reaching the client, and the spoiler level of a path. No pack is
touched: a new help topic or wiki page gives a new term with no code, which
is the second-instance test passed.

## Collisions

- **The status-bar command preview** — hover keeps previewing the command
  in the status bar; a tooltip opens alongside it, never replacing it.
- **The phone's command sheet** — a tap still opens it.
- **The scrollback's long press** — on a link or chip it opens that
  link's tooltip; anywhere else on the row it still opens the line menu or
  the emote sheet.
- **The gutter's interface summary** and **the frame inspection hover** —
  become ordinary tooltips (the glossary source and a fact tooltip).
- **The terminal's spoiler span** — becomes the standard spoiler block.
- **Icons' labels** — stay as the accessible name; the visible hover is the
  tooltip.
- **map-slate's native-hover sketch** for room tooltips (its older
  sections) — superseded by this component.
- **aether-devices' new status-bar row** — whichever build merges second
  gives it its tooltip.

## Surface decisions

### What a tooltip contains

Blocks: **header** (icon, name, kind) · **fact rows** (each with source
and date — *seen*, *walked*, *told by*, *from help*) · **prose** (carries
identity and term links) · **image** (an illustration or portrait,
thumbnail at most about 96 px, never cropped) · **links** (a *term* opens a
nested tooltip — dotted blue; a *thing* opens its tooltip on hover and its
card on click — gold underline; a *command* shows what a click runs —
boxed) · **spoiler** (collapsed "What is this, really?") · **hint footer**.
The same format comes from the client and the server.

### Lock and nesting

A tooltip opens on hover (or focus) and **locks after about 400 ms**, or
at once on **Shift**, so the pointer can move into it. A locked tooltip
**stays where it opened**; it does not follow the pointer. Hovering a term
inside opens a child; the stack shows a breadcrumb; **Esc closes one
level**; a click outside closes them all. It is placed so it never covers
what it describes.

### Tooltips and cards — two containers, one content

The owner: *"they're different things right? we might be tempted to unify
them but I don't think we should."* **Share what they say, never how they
live.**

| | a card | a tooltip |
|---|---|---|
| born from | a command — something ran | pointing |
| lives | in the feed; pinned = its whole lifetime | while you point or hold it locked |
| changes | live while attended; every change names its cause | a snapshot taken when it opens; reopen to refresh |
| is | a record of something that happened | a preview of something you could open |

- **No card controls on a tooltip.** It is never pinned in place, docked or
  minimized: a tooltip that stays and stays live is a card nothing ran —
  the magic the navigation-server review removed.
- **One content.** A tooltip and a card about the same thing show the same
  header, the same fact rows and the same spoiler block, built from the
  same blocks: the tooltip is the card's first lines.

### Pin

Pinning a tooltip **runs the command that opens the card it previews** —
`look` for a thing, `help` for a help term, `wiki` for a wiki term — so
keeping a tooltip makes a card the legible way, with a line in the
scrollback. A tooltip never mints a card any other way. **Where no command
opens a card for it, there is no pin** — and that absence is a finding, not
a gap to paper over: the player has no legible way to ask for that thing,
and the fix is a command (the navigation build meets this first: a place
on your map you are not standing in has no `look`).

### Live things

Hovering a thing asks the server to describe it **as you perceive it
now**, at tooltip size — a snapshot taken when the tooltip opens, never
updated under you (hover again for a fresh one) — and caches the answer briefly per thing so hovering
up and down the scrollback is cheap. A thing you can no longer perceive
says so (*"You can't see that now."*) — honest, never the stale line. A
thing in a pitch-dark room tells you nothing sight would have told you.
Clicking it still runs `look`, exactly as today.

### Glossary terms

Two sources, one shape: a **help topic's summary** (fetched once, cached,
its spoiler flag respected) and a **wiki page's opening section**, rendered
through the wiki's own gate — the capability ceiling deletes, the appetite
collapses — exactly as reading the page would. There is no second, ungated
path to the wiki.

### Spoilers and the path

One spoiler block everywhere. **A thing's path is a spoiler at level 2**: a
player at the ordinary appetite (1) sees it collapsed, one click open; at
appetite 2 and above it is open; a guest (0) sees it collapsed. **One
appetite setting governs the wiki and every tooltip** — today's wiki
setting is widened (and renamed) so it no longer reads as wiki-only.
Hidden by default, one click, never prevented.

### Touch and keyboard

On a phone, a **long press on a link, chip or control opens its tooltip as
a bottom sheet**; nested terms push within the sheet with a back control.
Keyboard focus opens a tooltip; Esc closes it. Nothing exists only in a
tooltip — every one previews a card, a page or a command you can reach by
clicking.

### The terminal

Every identity link in the scrollback has a tooltip. Hovering the scrollback
is the heaviest describe load, hence the per-thing cache; a link's tooltip
describes the thing now, not as it was when printed.

### Every existing hover string

All of them are retrofitted — card controls (*Pin — {command}*), the tab
strip, the command bar, prompt strips, reactions, character creation's
options, the navigator's ways and addresses, the gutter stripes, the
stream controls, the filter drawer, icons. A control's tooltip names what
it does and the command it runs.

## Lens pass

1. **Pedagogy** — the tooltip is where a player learns the game's
   vocabulary in place; terms link to the help and wiki that teach them.
   Derivable: every fact row says where it came from.
2. **Creative expression** — the ordinary case needs no code: write a help
   topic or a wiki page and the term has a tooltip. The bespoke case is a
   client surface supplying its own facts in the same format.
3. **3a immersion** — perception-gated, never knows more than you;
   *"You can't see that now"* rather than a stale description. **3b
   participation** — the wiki is player-written, so players author the
   game's glossary.
4. **Values** — how much to reveal unasked is the appetite's call, the
   reader's own; the grain is level 1 (paths collapsed).
5. **Continuity** — epoch-free; a tooltip previews whatever the epoch's
   object answers.
6. **Economy** — none produced or consumed. The cost is server describes on
   hover; the per-thing cache prices it.
7. **Governance** — judges no person. Gap noted: none.

## The drive

Blocking drive — every step `instant`, a browser walk as a player, plus the
server checks as wire steps. Nothing persists, so no restart step; the
light step is 7.

### Blocking drive

1. *(instant · player)* Log in. Hover a card control (pin). A tooltip opens
   naming what it does and the command it runs; no native browser hover
   text appears anywhere hovered in this drive.
2. *(instant · player)* `look` in a lit room. Hover a thing's link in the
   scrollback: a tooltip with icon, name, kind, short description and its
   illustration (where it has one). The status bar still previews
   `look <thing>`. Click: its card opens, as before.
3. *(instant · player)* Hover a chip in the place card's "Here" row: the
   person's tooltip.
4. *(instant · player)* In a tooltip, hover a dotted term: a nested tooltip
   from its help topic. Press Shift (or dwell): the stack locks and shows a
   breadcrumb. Esc closes one level; Esc again closes the rest.
5. *(instant · player)* Hover a term whose source is a wiki page: its
   opening section, with a spoiler in it collapsed at appetite 1. Set the
   appetite to 3: the same term shows it open. A section above the
   reader's capability is absent, not collapsed.
6. *(instant · player)* The "What is this, really?" line on a thing is
   collapsed at appetite 1, opens on one click, and shows the path; at
   appetite 2 it is open.
7. *(instant · player)* Walk into a pitch-dark room holding a scrollback
   link to a thing there from earlier: its tooltip tells nothing sight
   would. Hover a thing that has left: *"You can't see that now."*
8. *(instant · player)* Pin a tooltip: the card it previews opens (a
   thing's inspection card; a help term's help card) and the command shows
   in the scrollback; the card's header and facts match the tooltip's. A
   control's tooltip has no pin.
9. *(instant · player)* Tab to a link with the keyboard: its tooltip opens;
   Esc closes it.
10. *(instant · player)* Phone width, touch: tap a link — the command sheet,
    as before. Long press the same link — its tooltip as a bottom sheet;
    a nested term pushes inside it with a back control. Long press empty
    row space — the line menu, as before.
11. *(instant · staged)* Wire: the describe answers only what the viewer
    perceives (a thing in the dark, a thing out of reach), and the wiki
    excerpt honours the ceiling and the appetite exactly as `wiki` does.

### Soak drive

None — nothing in this build waits on the clock.

## Acceptance criteria

- A player pointing at anything with hover text anywhere in the client sees
  a tooltip, never native browser hover text.
- Every identity link and chip in the terminal, cards and navigator has a
  tooltip whose click does what the click did before.
- A tooltip nests, locks, shows a breadcrumb, closes one level on Esc, and
  pins by running the command for the card it previews; a tooltip with no
  such command has no pin, and none can be docked or minimized.
- A tooltip never changes while open.
- A thing's tooltip and its card show the same header, facts and spoiler
  block.
- A new help topic or wiki page, with no code, gives its term a tooltip.
- A live thing's tooltip never says more than the viewer perceives now.
- A wiki-sourced tooltip shows exactly what reading the page would, at the
  same appetite and capability.
- A path is collapsed at appetite 0–1 and open at 2 and above; one appetite
  setting governs the wiki and tooltips.
- A phone player reaches every tooltip by long press without losing the tap
  → command sheet or the row's long-press menu.
- Hovering still previews the command in the status bar.

## Cross-references

- [tooltip-slate](../slates/client/tooltip-slate.md) — seeding slate and
  reuse ledger
- [navigation-requirements](./navigation-requirements.md) — the next
  consumer (map glyphs, breakdowns, action buttons)
- [map-slate](../slates/client/map-slate.md) ·
  [client-knowledge-model-slate](../slates/client/client-knowledge-model-slate.md) ·
  [iconography-slate](../slates/client/iconography-slate.md) ·
  [spoiler-slate](../slates/platform/spoiler-slate.md)
- [help.md](../subsystems/help.md) · [wiki.md](../subsystems/wiki.md) ·
  [client-shell.md](../subsystems/client-shell.md) ·
  [card-surface.md](../subsystems/card-surface.md) ·
  [message-rendering.md](../subsystems/message-rendering.md) ·
  [media.md](../subsystems/media.md) ·
  [mql-subscription.md](../subsystems/mql-subscription.md)
