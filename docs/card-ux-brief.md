# Card UX brief — for design exploration

**What this is.** A self-contained brief for exploring the web client's card
and layout changes in a design tool that can't read GitLab. It gathers the
**48 issues filed in the live usability pass of 2026-10-17** (GitLab label
`origin::ux-pass-2026-10-17`) and the decisions recorded since, mostly in the
[card-sizes slate](./slates/builds/card-sizes-slate.md). Issue numbers (`#50`)
are kept so anything here can be traced back. It leaves out implementation
detail on purpose.

**Written 2026-10-20.** Where a decision is settled it says **Decided**; where
it is still open it says **Open**. Open items are the best places to explore.

---

## 1. The product in two paragraphs

Saxonberg is a multiplayer text world (a MUD) played in the browser. You type
commands (`look`, `say hi`, `buy bread`, `north`) and the world answers in
prose. It is an educational game built on real systems (chemistry, economics,
governance), and players build the world's content themselves.

The client has two main surfaces. **The terminal** is the scrolling log of
everything you typed and everything that happened. **The card rail** is a
column of cards beside it, each about one subject (a room, a person, a thing,
a query result) and born when a command produces it. The usability pass found
that the two fight each other, that cards don't behave as people expect, and
that the layout hides what it should show.

---

## 2. What's wrong today (the pass, in a designer's words)

**Cards**
- **× doesn't close a card** (#50). It only unpins it, so the card stays up to
  ten minutes. Looking at the same thing again stacks a duplicate. An expired
  card leaves a full-height husk that still looks live, and the husk can't be
  closed. Every card button also echoes noise into the terminal.
- **"+19 more" isn't clickable** (#76). Long lists end in plain text with no
  way to see the rest.
- **The new room's card lands below the fold** (#53). Walk north and the old
  room's card stays on top; nothing on screen tells you where you are.
- **No way back to the room** after you drill into something (#92).
- **Engine jargon on cards** (#51). Cards list internal names like
  `Exitable · CartesianCoordinates · +10 more`, inconsistently and at every
  size. (This content is wanted; the presentation is wrong. See § 4.)
- **Someone else's clothes read as "something"** (#90) in a lit room.
- **The room heading links to itself** (#69). Clicking it just refreshes.

**Terminal**
- **Room prose is hidden behind a card, then appears in place minutes later**
  (#49), reading as late output inserted into the past.
- **It auto-scrolls on every line** (#54), so you can't read back while NPCs
  talk.
- **Lines run the full width of a wide screen** (#55).
- **Login shows a command you never typed**, `> sense`, in jargon (#52).
- **NPCs flood you on arrival** (#61): five introductions, then ambient
  chatter every minute or two.
- **A stale "embody confirm — click to send"** lingers in the status bar after
  character creation (#59).

**Chrome**
- **The top bar is jargon** (#77): `PLAY dormant`, `RENOWN —`, `SKILL —`,
  `BODY fresh`, `here>`. Nothing explains it on hover.
- **Too few tooltips** anywhere (#89).
- **The "Aether" tab** should be called **Chat** (#75).

---

## 3. The target layout — Decided

**Five modes** in a sidebar: **`chat · explore · watch · build · govern`**
(`play` is renamed `explore`, #84). A mode is a view, never a gate: it decides
what the screen shows, never what you're allowed to do.

```
| ▣ rail | mode panel    | terminal (~100 ch) | card rail |
|  chat  | (per mode,    |                    |           |
| explore|  collapsible) |                    |           |
|  watch |               |                    |           |
|  build |               |                    |           |
| govern |               |                    |           |
|  ····  |               |                    |           |
|  you   |               |                    |           |
```

1. **The mode rail** (~56 px) — one icon per mode with a badge (unread and
   mentions for chat, new map knowledge for explore, live streams for watch).
2. **The mode panel** (~240 px, collapsible) — a list that navigates, like
   Discord's channel column. Picking an entry opens that subject's card. It's
   chrome, not a card.
3. **The *you* corner** at the bottom of the rail — your name and status, your
   sheet (`score`), switching character, settings. It absorbs the top bar. The
   old top-bar widgets become **chips here, chosen by the player**, each linking
   into its section of `score` (#77).

| mode | the panel lists | the main stage |
|---|---|---|
| **chat** | the room you're in (local speech), channels, DMs, relayed stream chats, with unread/mention badges | the terminal filtered to the selection; the card rail shows who's there |
| **explore** | **the navigator**: current zone, minimap, compass, known places, a route in progress. ⭐ The room you're in is always the first entry; clicking it is the way back (#92) | the terminal and the room's cards |
| **watch** | live streams, what you're tuned to, screens in reach | the video card, large |
| **build** | the content editor's file tree, version control, diagnostics | file cards, full size |
| **govern** | offices you hold, open motions, the Compact | unbuilt |

⭐ **Chat mode is Discord.** We compete with Discord directly, so stick with
what works. The **room is a channel**: local speech is just another
conversation in the panel. There is **one terminal, filtered**, never a second
stream.

**Rules:** the terminal never goes away (full in explore, filtered in chat, a
strip under big cards in build). Maximizing works the same in every mode. The
panel collapses first when space is short. **On mobile** the rail becomes a
bottom tab bar and the panel a drawer.

---

## 4. The card model — Decided

### Sizes: one card, four sizes

A card is about one subject. Size is how much of your attention it gets.

| size | where | e.g. a room | e.g. a forum thread | e.g. a video |
|---|---|---|---|---|
| **glance** | one line (a chip) | heading · head count · exit directions | "3 new in *Dairy*" | "● watching pbox — live" |
| **feed** | the scrolling card rail | header, two prose lines, exits, people, things summary | title, last post, count | a still and title |
| **focal** | the stage beside the terminal | everything | the thread, readable, replyable | the 16:9 player |
| **full** | the whole window; the terminal shrinks to a strip | everything, scrolling | thread + composer + chat | theater |

- A card **declares which sizes it supports** (a wallet has no focal size).
- **At most one focal card per region.** The focal card is the one that
  updates live; feed cards are snapshots with a time and a refresh control.
- **Size is presentation, never permission**: a smaller card shows fewer of
  its actions, but you may do the same things.
- **The header never scrolls.** Feed size **never scrolls inside the card**
  (nested scrolling is miserable); it **cuts content from the bottom up**
  instead. Focal and full scroll the body under the fixed header.
- ⭐ **A notable section always survives the cut** — a bleeding wound, a locked
  door, a lit lamp jumps the queue.

### Two base shapes

- **The subject card — one thing.** `look`, `sense`, `listen`, `smell`, `feel`
  and `taste` all open the **same** card; the command decides which section it
  opens on. The header carries a **modality strip**: each sense lit when
  there's something to notice through it.
- **The set card — one result set** (a query, a shop's stock). It's about the
  set *where you asked* ("peers · Dave's Bar"), and keeps meaning that after
  you leave. Its body is a **grouped tree**: a header with the count, then
  groups (people before things), with **identical items collapsed** ("12
  coupes"; a dirty one splits out). Groups **expand in place** (#71). Members
  link to their subject cards.

### Lifecycle

1. **Born only by a command.**
2. **One card per subject: running the command again touches it** — brings it
   to the bottom, focuses it, refreshes it — instead of stacking a duplicate.
   (The terminal is the log; the cards are your working set.)
3. **× closes now. The pin keeps. Everything else ages out** (#50).
4. **An aged-out card shrinks to its glance chip** (a one-line title), not a
   full-height husk. Closing the chip removes it. Recent rooms therefore read
   as a trail of one-line chips.
5. **Live only where your attention is** — the focal card, or the newest one
   if nothing is focal.
6. **Lazy**: a section is empty until its command runs. Clicking a lit sense
   sends that command. **Every clickable previews the command it will send.**

### Identity on every card and link

- ⭐ **The branch is unmistakable.** Every card header and **every link to
  something anywhere** (terminal, card, chip) shows what kind of thing it is in
  **color AND icon** (never color alone):
  - **Agent** — a someone;
  - **Location** — a place;
  - **Thing** — a something;
  - **Idea** — a concept (a material, a biome, a business);
  - **Shadow** — an effect riding something else (an enchantment, a curse). It
    gets a different frame too: dashed, veil-like.
- ⭐⭐ **The person marker goes everywhere.** Whether an agent is a *real player*
  is the single most important fact about it: on the card header and every link
  to a player, in chat, room lists, cards.

### Composition — the menu, not the clutter (#51, #89)

Every card shows the object's **composition**: the list of capabilities it's
built from (a door is Lockable and Openable; a mug is a Vessel). It's
**intended and important**: it's the most direct statement of what a thing can
do, and it teaches the game's model.

- **Feed size:** a one-line count chip ("13 capabilities").
- **Focal size:** the full list as chips.
- ⭐ **Each chip is clickable and opens that facet** of the object, in depth. So
  the composition strip is the card's **table of contents**: a card shows only
  what's *notable* by default, and everything else is one click away, labeled
  by its chip.
- **Every chip has a tooltip**, and ⭐ **every tooltip previews the page its
  element opens** (#89): a capability chip's tooltip is its help page's
  summary, and clicking opens the page. The same rule applies to branch icons,
  topic badges and command chips. There's one source of text, so tooltip and
  page can't drift apart.

### Notable or quiet

Each section knows whether it's **notable** (its state isn't the default: a
lock that's *locked*, food that's *going off*, a lamp that's *lit*, a tool
that's *damaged*). **Notable sections show; quiet ones don't render** and
survive only as their chip in the composition strip.

---

## 5. Card bodies by kind — Decided unless marked

### The room — `look` is the place report (#52)

`look` is the arrival command, and it's a **report with sections**, the same
in the terminal and on the card: **heading** (always) · **prose** (the
description) · **exits** · **people** · **furnishings** (fixed things) ·
**things** (loose items, summarized) · **cues** (hints from other senses: *smell
▸ the rose*). Every section but the heading can be switched on or off, and the
arrival report reads its defaults from settings. Prose would typically show
**on the first visit only**, MUD-style.

**The Location card:**
- **Header** — the Location chip; the heading in its heading case (#69); the
  **zone trail** as an address (each step a link); a small coordinates line;
  **"part of ▸ …"** when the room belongs to a larger set of rooms; the
  modality strip.
- **Body** — illustration (collapsible) · prose (two lines in the feed, full
  at focal, detail nouns linked) · **exits as chips** (direction, the
  destination's name **only if you know it**, the door's state; click to go) ·
  **people** with their status and posture chips · **furnishings** by surface
  (floor, walls, ceiling, #79) · **things** (the grouped summary, expanding in
  place) · **conditions** in words (light, temperature, weather, the floor) ·
  **place facts** (*Dave's Bar · Dave's house · open*; your relationship: home,
  lease, work; first visit or known) · composition.
- **Kept at feed size:** heading · exits · people · things summary. **Cut first
  → last:** illustration → place facts → furnishings → conditions → prose to
  two lines → composition to a count.
- **While you're in it**, it's live. **When you leave**, it freezes as "what
  you last saw" and shrinks to a glance chip.

**"You also see"** (#71): at most two items inline, otherwise counts by group,
each linking to its own set. Never "2 inline + 23 more".

### A person or creature — the Agent card

Organized by what you can perceive at each level: a **creature** (a mule), an
**extra** (*the storekeeper*), a **cast member** (*Mara*, once introduced), a
**player** (with the person marker).

- **Header** — Agent chip · what *you* call them · the person marker if a
  player.
- **Description** — authored, or player-written for players.
- **Presence** (#74) — what they're doing: a **status line** (authorable by
  players; NPCs' follows their activity), an **(engaged)** chip, a **posture
  chip** linked to its host (*sitting on a bar stool*, *riding a mule*; no chip
  for plain standing). Players also show **away** (*"staring into space"*) and
  **on air**.
- **What you can see on them** — the outermost layer per body part, what's in
  their hands, never their pockets.
- **Condition as you perceive it** — in words, deeper with medical skill.
- Composition.
- **Kept at feed size:** name · rung · person marker · presence. **Cut first →
  last:** portrait → what they wear and hold → description to one line →
  condition (unless notable) → composition to a count.
- **Not shown, because not perceivable:** standing, regard, who they answer to.

**Furniture folds into its occupants** (#74): a row of stools reads "4 empty
bar stools"; a fully occupied bench disappears from the things list because its
sitters carry it. **People never fold away.**

### An object — the Thing card

One card laid out by what the object *is*, with each capability contributing a
section when notable (a vessel: what's in it and how full; a garment: whether
it fits you; food: how fresh; a lamp: lit or dark).

1. **Header** — Thing chip; what you call it (by appearance until identified:
   *a vial of murky liquid*); a **fixed** marker for furnishings; a **quantity**
   (*12 coupes*, *two pints of ale*); modality strip; **commands ▸**.
2. Description and details.
3. **Make** — material in words; visible marks (a maker's mark, a brand).
4. **State in words** — wear, freshness, wet/dirty/clean, open/locked, lit.
5. **On it / in it / hanging from it**, collapsed like a set (*in it: 60
   glasses ▸*).
6. **Whose** — only if it's yours or visibly marked.
7. The capability sections, then composition.

**Kept at feed size:** name · quantity · fixed marker · the most notable state
words · contents summary. **Cut first → last:** make → capability sections to
the two most notable → description to one line → composition to a count.

### Other cards

- **The `commands` card** — what you can do with something, **grouped by where
  each command comes from** (the storekeeper affords `buy`, the lantern in your
  hand affords `light`, the stools afford `sit`). Commands you **can't use yet
  still appear, with the reason** (the refusal is the progression UI). Every
  subject card's header links **commands ▸**.
- **The navigator** (about *you*) — a map window centered on you, compass, your
  last horizon look, a route in progress. On open water, your position is a
  **reckoning with an uncertainty ring**, never the true position.
- **The Zone card** (about a zone) — the whole zone **as you know it**: rooms
  you've walked drawn solid, seen ones lighter, things you were told marked with
  who told you, **stale knowledge faded with its date**. Never "12 of 40 rooms";
  only "12 places on your map".
- **The Warren card** — a group of instance rooms (the lounge and its
  satellites, dorm rooms), which one you're in, which is yours; answers *"why
  are there other lounges?"*
- **The Idea card** — a material, a biome, a business: what it is, its facts,
  and ⭐ **where you've met it** (rooms in this biome you know, things made of
  oak you've seen).
- **The Shadow card** — an enchantment or curse on something, **as you know
  it**. The primary signal is a **veil badge on the host's affected capability
  chip** (the chest's *Lockable* chip wears a veil: this facet is altered).
- **The `score` card** — **your own sheet, never anyone else's.** Body, skills,
  standing, holdings and record as numbers; character traits as **words only,
  never a meter**. Every section **leads with what changed since you last
  looked**. Opens at focal or full; sections load when opened.
- **The document card** (#57) — read a document inline at feed size, with "open
  in editor" to go bigger.

---

## 6. Smaller decided details

- **Heading case** (#69) — headings render from the short name with a case
  rule: places in Title Case, things in sentence case, an author override.
- **Query output** (#71) — a neutral header with the count, never "You see…".
  Over about six items, group and collapse. The terminal prints the collapsed
  tree with each group as a link; the card expands in place.
- **Card links** (#91) — clickables must compose sensible commands (today the
  works board's link produced the nonsense `job works-board`). The fix is
  under the hood, but **every clickable previews its command**, so the preview
  is part of the design.
- **Player formatting and color** (#88) — emphasis (bold, italic, code, quote,
  links, @mentions) in anything players write. **Color: three parties, each
  deciding one thing** — the writer chooses emphasis; a channel's owner decides
  whether that channel carries color; the **reader always has the last word**
  on what they see. **Room speech is never colored.** Readers need a **GUI**
  for making important things stand out: messages from players, DMs, mentions.
- **Text to speech** (#93, now a slate) — a **▶ on prose only** (descriptions,
  signs, speech, posts), never on lists, stats or exits. Highlight the sentence
  being read; one voice at a time.

### Terminal rules (#49, #54, #55)

1. Frames show **in the order received**; nothing is ever inserted or reordered.
2. A frame hidden but revealable later leaves a **placeholder** in its slot.
3. **The terminal always says where you are.**
4. **Stay pinned to the bottom only if you're already there**; when scrolled
   up, show a **"new output ↓"** button with a count; jump down when you send a
   command.
5. **Cap the line length** at roughly 80–100 characters.

---

## 7. Principles to keep while exploring

- **In words, never numbers**, except on your own `score` and instrument
  readings. Condition, wear and freshness are word bands.
- **As you know it.** Cards show *your* knowledge: a stranger is described,
  not named; a disguise shows the disguise; an unidentified thing goes by its
  appearance.
- **Never a gauge for who you are.** Traits and faith never get a meter, a
  percentage or a streak.
- **Nothing is client-only.** Every click is a command, so layouts can be saved
  and broadcast. Size changes, mode changes and closes are all commands.
- **The terminal is the place of record**; cards are the working set.
- **Branch in color AND icon; the person marker everywhere.**
- **Mobile is a first-class layout**: tab bar plus drawer, focal becomes full,
  the feed sits behind a pull-down.

---

## 8. Open — the best places to explore

1. **Does the current room stay on the rail while you're in it** as a one-line
   chip (#92)? The navigator may make it unnecessary.
2. **What the four sizes look like for each card kind** — the cut order is
   decided; the visual treatment isn't.
3. **The branch icons and colors** themselves, and the Shadow's veil frame.
4. **The you-corner chips** — which the default set is, and how a player picks
   them.
5. **The color GUI** for readers (#88).
6. **The grow/shrink controls** on a card and how a card announces it's live
   versus a snapshot.
7. **The glance chip trail** of recent rooms and expired cards.
8. **The `commands` card's layout**, including commands you can't use yet and
   why.

---

## Appendix — every issue from the pass

**Cards, client and layout:** #50 card × doesn't close · #51 composition on
every card · #53 new room's card below the fold · #57 inline document card ·
#59 stale status-bar prompt · #69 heading case · #71 query/room render ·
#74 status lines and posture chips · #75 Aether tab → Chat · #76 "+N more" not
expandable · #77 top-bar jargon · #79 place surfaces and presentation tiers ·
#84 `play` → `explore` · #88 formatting and color · #89 tooltips and icons ·
#90 worn items read "something" · #91 card links compose bad commands · #92 no
way back to the room · #93 text to speech (closed → slate).

**Terminal:** #49 hidden prose reappears in place · #52 login shows `> sense` ·
#54 auto-scroll · #55 line length · #61 NPC greeting spam and chatter.

**Server behavior that shows up on cards and in the terminal:** #56 Arrival
Note message reads like office IT · #58 `~` and `$HOME` default to `/` · #60
"You're shivering." with no explanation · #64 an error at login · #70 looking
through an exit · #72 query lists yourself / the floor · #73 the ledger shows
an installed implant as carried · #78 `sense` as the index of the senses · #83
drop the `scan` alias · #85 topic catch-all · #86 player markup reaching the
wire (security) · #87 speech markdown not applied · #48 guest logout drops gear (critical).

**Content:** #62 NPCs retry failing commands forever · #63 businesses open
short of money · #80 template taxonomy pass · #81 Dave's Bar reduced to its
roots · #82 the lounge terminal and mana line.

**Operations:** #46 pack installer skips rows · #47 deploy reports success on a
box that can't boot · #65 Twitch/Kick
login not configured · #66 log slow commands · #67 controllers cloned per
command · #68 reconnect stuck on "Connecting…".
