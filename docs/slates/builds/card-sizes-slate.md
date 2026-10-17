# Card sizes slate — every surface is a card, and a card comes in sizes

> **Status: UNBUILT** — the card feed shipped (one birth path, pinned vs
> live, the sweep, the one inspection card, named views) →
> [card-surface.md](../../subsystems/card-surface.md); the mode ×
> arrangement axes shipped as storage and vocabulary →
> [cockpit.md](../../subsystems/cockpit.md)
> **Left:** the size axis on a card (glance · feed · focal · full) and
> a body per size · focus as attention, which moves liveness off
> *newest* · an arrangement that is cards placed into regions and that
> RESTORES on recall · the forum broken into board / thread / composer
> cards · the one `cms` card broken into tree / file / diagnostics / git
> cards · video as a card about a watch target (retires `cockpit.watch`)
> and about a SCREEN (watching is not tuning) · the streamer deck as a
> streamer-only card that holds the camera region · the web as
> content: the browser's own tab, and tab-away as a fact the client
> reports · the broadcast contract: which client facts the overlay
> feed carries · ⭐ **card bodies** (2026-10-17): two base cards (subject,
> set) with the re-run-touches and glance-on-expiry rules, the branch in
> colour and icon, composition on every card, the place report and
> cues, and the Location, Zone, navigator and Warren bodies — the
> Agent, Thing, Idea and Shadow bodies still to detail
> **Size:** a build

**Captured 2026-10-17**, from a conversation about getting broadcast
ready for a weekly stream. It started at "a standby button" and arrived
here because every streaming question turned out to be a layout
question, and every layout question turned out to be a card question.

Related: [card-surface.md](../../subsystems/card-surface.md) (the feed,
the birth path, liveness), [cockpit.md](../../subsystems/cockpit.md)
(mode × arrangement, the summoned-panel tier, the five layouts),
[display.md](../../subsystems/display.md) (screens and the three
manifestation arms), [streaming.md](../../subsystems/streaming.md)
(`watch`/`tune`, the embed), [livestream.md](../../subsystems/livestream.md)
(the overlay feed), [client-shell-slate.md](../tails/client-shell-slate.md)
§ public read-only surface (the default-deny projector the broadcast
contract must ride),
[display-manifestation-slate.md](../tails/display-manifestation-slate.md)
("one projection, one wire shape" — this slate is where it lands),
[streamer-registry-slate.md](streamer-registry-slate.md) (the per-streamer
feed this one's broadcast facts will key on),
[content-declaration-slate.md](content-declaration-slate.md) §3.8 (the
phone as a second aether host — the reason "apps are cards" matters).

---

## What is true today

The doctrine is already here and the code is not:

- **cockpit.md says an arrangement is *how the cards sit inside a
  mode*.** So a layout was always meant to be composed of cards. But
  only the right column is cards. The forum (`ForumView`), the video
  (`StreamEmbed`), the streamer deck (`StreamerDeck`) and the livestream
  panels are bespoke React screens, each a layout of its own.
- **The CMS is already a card — one enormous one.** `cms`, `git` and
  `studio` are catalogue rows with `source: { kind: 'client' }`,
  `noProse`, `singleton`. The whole editor, tree and diagnostics pane
  ride one card the `BuilderLayout` mounts dominant. Decomposing the
  CMS is breaking up a card, not inventing one.
- **Video is not a card.** `watch` writes the `cockpit.watch` client
  state key and only the `watch` mode's layouts read it, so `watch` in
  `play` changes nothing you can see. A shared screen writes the same
  key with a `display` marker and pushes it to everyone in the room the
  moment they walk in.
- **The arrangement stores and restores nothing.** `cockpit layout save`
  records the open cards by name; `recall` sets a key no client reads.
  cockpit.md says so plainly and names the unstated half: *who acts on a
  recall*. Its preferred answer — the client reads the arrangement and
  re-issues the card commands, so the server still births every card —
  is the one this slate takes.
- **Liveness is a proxy.** Only the newest card of a live kind holds a
  subscription, because *"liveness is expensive so we don't want it on
  anything more than where you're currently focused"* and newest was
  the crude stand-in for focused. card-surface.md calls it that.
- **Every card is one size.** The feed is a column of cards small enough
  to scroll past. Nothing is big because nothing CAN be.

---

## ⭐⭐⭐ The idea: one card, many sizes

A card is about a subject and has one identity, one lifetime, one
subscription. What it lacks is a **size** — and the same card at a
different size is not a different card, it is the same card given more
or less of your attention.

| size | where it sits | a forum thread | a video | the wallet |
|---|---|---|---|---|
| **glance** | one line — the shelf, the status bar, a phone's bar | "3 new in *Dairy*" | "● watching pbox — live" | the balance |
| **feed** | the scrolling column (today's only size) | title, last post, count | a still + title | balance + last few |
| **focal** | the stage beside the terminal | the thread, readable, replyable | the 16:9 player | — |
| **full** | the whole window; the terminal shrinks to a strip | thread + composer + the room's chat | theatre | — |

- **A card declares the sizes it supports**, and a body per size. A
  wallet has no focal size; a video has no meaningful glance beyond its
  title line; an editor has no feed size worth having (its feed size
  is "*foo.yaml*, unsaved changes"). The declaration is on the
  catalogue row beside `pinnedByDefault` and `live`, and required like
  them, so a new card cannot ship without deciding how big it gets.
- **Changing a card's size is a command** (*cockpit card focus*,
  *cockpit card full* — names open), because the arrangement must be
  able to save it and the broadcast feed must be able to read it. A
  click on a card's grow control sends that command; it is never
  client-only state — nothing is pure client.
- **Size is presentation, never permission.** A card at glance is not a
  card you may do less with — its affordances are the same, it simply
  shows fewer of them. (The mode axis's rule, applied one level down.)

### ⭐⭐ Focus is attention, and liveness follows it

There is at most **one focal card per region** (and usually one in the
frame). Focal is the honest signal the newest-card proxy was standing in
for. So:

- **The focal card is live** if its kind is live. Feed cards are
  snapshots with a refresh control, *including the newest* — unless
  nothing is focal, in which case today's rule (newest holds the
  subscription) stays the fallback. *Grain:* an arrangement could say
  otherwise.
- Demoting a focal card to the feed stamps its `takenAt` exactly as
  `demoteLive` does today — the same mechanism, a better trigger.

### Panels stay panels

The summoned-panel tier is not swept in. **The test is whether the thing
is ABOUT something.** A thread, a file, a stream, a screen
have a subject; settings and the notification preferences are chrome
with no subject, no lifetime and no reason to be pinned. The card build
already refused to rename panels to cards for exactly this reason.

---

## Arrangements become placements

An arrangement is **regions, and which cards at which size sit in each**.
The shipped layouts become *default arrangements* expressed in that
vocabulary rather than React components:

| today's layout | as an arrangement |
|---|---|
| `world` | terminal · feed column |
| `forum` | focal: the thread card · terminal (chat-filtered) · feed |
| `livestream-viewer` | focal: the video card · terminal (strip) · chat rail |
| `streamer` | focal: the streamer deck · terminal · chat rail (wide) |
| `builder` | full: file card · rail: tree card + diagnostics card · terminal strip |

- **Recall restores.** The client reads the arrangement and re-issues
  each card's `command` (the catalogue already says `command` is the
  dedup key a re-push uses); the server births them as it births every
  card. No new birth path.
- **The region list is closed and small** (stage, rail, feed, strip,
  corner — names open). Arrangements are savable; regions are not,
  because the client must know how to lay every one out on a phone.
- **On a phone, focal is full** and the feed is behind a pull-down —
  the same split the glance-line already makes for the shelf.

---

## The decompositions

### Forums

The board, the thread and the composer are three cards about three
subjects (the board, the thread, your draft). Reading is promoting a
thread to focal; writing is opening the composer at focal beside it.
The chat sidecar is the terminal, filtered — not a component.
`ForumLayout`'s "never go dark" peek is what the terminal strip already
is.

### The CMS

`cms` breaks into a **tree** card (subject: a root path), a **file**
card per open file (subject: the path — `singleton` *per subject*, which
is the honest form of today's "a second Monaco is a second application"),
a **diagnostics** card and the existing **git** card. "The CMS" is then a
shipped `build` arrangement, and a player who wants the tree on the left
and two files side by side saves one.

⚠ The temptation to keep the CMS "its own app" was weighed. It loses on
**lens 2**: an arrangement a player can rearrange is creative expression
over their own tools, and a monolith is not. It is also where the
`noProse` rule earns its keep — every CMS card keeps it.

### Video

`watch <target>` opens a **video card** whose subject is the target —
live channel, recorded video, a clip — and it opens **at focal**. That
fixes `watch` doing nothing visible in `play`, and moves video onto the
one birth path; `cockpit.watch` retires. VODs and clips are just
targets: Twitch's `video=` and clip forms join YouTube's `videoId`.
*Live vs recorded is a property of the content* (display.md) and
changes nothing about the card.

### ⭐⭐ Screens: watching is not tuning

On a **public** screen these are two acts with two gates:

- **`watch tv`** opens a video card whose **subject is the screen**, not
  the stream. It follows whatever the screen shows: when someone else
  changes the channel, your card follows, because that is what watching
  a bar TV is. Leave the room, the card goes (`gone`, said aloud).
- **Changing what the screen shows** is the display's existing driver
  gate (held · remote · staff · reach). Today that is `watch X on tv`;
  ⚠ the natural word `tune` is taken (it means *follow a channel's
  chat*), so the verb is a collision to resolve by the ladder, not by
  first-come.
- ⭐ **Arrival stops pushing.** Today walking into a room with a lit
  screen writes your embed for you. That contradicts the screens
  doctrine — *a screen grants attention in common, never access, and
  looking at your own feed is the honest veto* — because the veto has
  to be exercised against an embed you never asked for. The room's
  description says what the screen is showing; `watch tv` joins it. It
  is also the one birth path again: no command, no card.

A **held** screen — the phone — collapses the split, because holding a
screen already passes every driver gate. That is the consistent
experience a personal device should have, and it falls out of the rule
rather than needing one.

### ⭐ Apps are cards

The aether implant's apps (comms, forums, wallet, calendar) are hosted
updates with their state on *you*. Their faces are cards. So when the
phone arrives as a second aether host ([content-declaration
§3.8](content-declaration-slate.md)), it shows the same cards, and the
client neither knows nor cares which host a card came from. A phone is a
held display whose arm is `card`; the implant is the same cards with no
display at all. **This slate does not build the phone** — it makes the
phone cost nothing on the client.

### The streamer deck

The deck becomes a **streamer-only card** (visible to the `streamers`
axis; size: corner or focal). Its chips send their commands — the dead
scaffold goes. Its corner size is the **camera region** (below).

---

## ⭐⭐⭐ Card bodies — two shapes, and what each branch needs

**Captured 2026-10-17**, in the live usability pass on the demo box
(issues `origin::ux-pass-2026-10-17`, #48–#83). Read with #49 (terminal
rules), #50 (card lifecycle), #51 (composition), #52 (the place report),
#71 (query render), #74 (status lines), #78 (sense index), #79 (place
surfaces).

### Two base cards; everything else specializes

card-surface.md already ships **one inspection card laid out by kind**,
not one card per verb. This keeps that and names the second shape:

- **The subject card — one thing.** Identity is the subject's id.
  `look`, `sense`, `listen`, `smell`, `feel` and `taste` all open the
  **same** card; the verb decides which **section** it opens on. The
  header carries the **modality strip** (the sense index, #78): each
  channel lit when it has authored content or a notable reading.
- **The set card — one result set.** Identity is the normalized query
  **plus its anchor**: `query peers` asked in Dave's Bar is *peers ·
  Dave's Bar*, and stays about Dave's Bar after you leave. ⚠ This is
  card-surface.md's costliest lesson (a relative query re-answers
  against wherever you are now — the lounge card became a bar card),
  applied to sets. Body: the grouped tree (#71) — header and count,
  groups, identical items collapsed — expanding **in place**, unlike
  the terminal. Members link to their subject cards; flags change the
  header's lens, never the card type.

The stock sheet is a set card; the wiki and help pages are subject
cards about a document. The catalogue becomes *two shapes, many rows*.

### Rules for both

1. **Born only by a command** — the one birth path is unchanged.
2. **One card per identity: re-running TOUCHES it** — brings it to the
   bottom, focuses it, refreshes it — instead of stacking another.
   ⚠ This reverses card-surface.md's *"the feed is a log"*: the
   terminal is the log; cards are your working set of subjects. Two
   identical weapons-rack cards (#50) are noise, not history.
3. **× closes now; the pin keeps; everything else ages out** (#50).
4. **An aged-out card shrinks to its glance chip** — a one-line title —
   rather than staying a full-height husk that looks live. Closing the
   chip removes it.
5. **Live only where attention is** — focal, or the newest card when
   nothing is focal; otherwise a snapshot with a time and a refresh.
6. **Lazy, never collapsed-but-fetched.** A card holds only what has
   been asked: the modality strip is the cheap index; each channel's
   section is **empty until its verb runs**, and clicking a lit channel
   *sends* that verb (clickables preview their command).
7. **Composition on every card** (#51) — the mixin list, a one-line
   chip at feed size and the full list at focal, each mixin a link to
   its help topic. It is the most direct statement of what a thing can
   do, and it is shown deliberately.

### The branch is unmistakable

Every card header, **and every link to a Stuff anywhere** — terminal,
card, chip — carries its root branch in **colour AND icon** (never
colour alone): **Agent** (a someone) · **Location** (a place) ·
**Thing** (a something) · **Idea** (a concept) · **Shadow**, which is a
layer riding a host rather than a peer of the others, so it also gets a
different frame (dashed, a veil) and shows twice — as a marker on its
host's card, and as its own card when inspected. MML already tags
identity on links; this is a rendering rule, not new data. Each branch
has its own body needs, below.

### The place report — `look`, terminal and card alike

`look` is the **place report**, not *the visual prose* (#52), and it is
the arrival verb. Sections: the **heading** (the short — always), then
**prose**, **exits**, **people**, **furnishings** (fixed), **things**
(loose, summarized per #71), **cues**. Every section but the heading has
an on/off option (`--prose/--no-prose`, `--exits`, `--cues`, …); the
arrival look reads its defaults from settings (prose typically *first
visit only*, because prose is the first thing a player turns off and
the stateful sections are what they want every time). **`--horizon`**
is a further section, off by default — the pull rule: nothing on the
horizon is ever announced.

**Cues** (#78) — every channel can hint at the others: a cue from A to B
appears when something is notable in B and its **source is perceivable
through A** (a visible rose with authored smell → `look` cues *smell ▸
the rose*; hammering to the east → `listen` cues *look ▸ east*; a smell
from a room you cannot see produces no cue from `look`; an ambient level
with no source cues nothing). One `--cues` option on all five channel
verbs; on for the arrival look. `sense` is the full index — every
channel, every reason.

### The Location card

Its sections are **the place report's sections**, so terminal and card
share one vocabulary; the card adds only what a terminal cannot (an
image, live state, in-place expansion).

- **Header** — the Location chip, the heading in heading case (#69),
  the **zone chain** as an address trail (each step links its Zone
  card), one small **coordinates** line linking the Zone card, a
  **"part of ▸ <warren>"** link when the room belongs to a warren, and
  the modality strip.
- **Body** — illustration (collapsible) · prose (two lines in the feed,
  full at focal; detail nouns linked) · **exits** as chips (direction,
  the destination's name **only if you know it** — walked or seen, per
  your map — and the door's state; click goes, secondaries `look north`
  and the look-through form, #70) · **people** (status + chips, #74) ·
  **furnishings** by surface (#79) · **things** (the #71 summary,
  expanding in place) · **conditions** (light, temperature, weather if
  under the sky, the floor — the derived half of the index, in word
  bands) · **place facts** (who holds it — *Dave's Bar · Dave's house ·
  open*; your relationship — home, lease, work; first visit vs known) ·
  composition.
- **Lifecycle** — identity is the location's id; arriving touches its
  card; live while you are in it; leaving freezes it as *"what you last
  saw"* and shrinks it to a glance chip, so recent rooms read as a trail
  of one-line chips.
- **Sizes** — glance *heading · head count · exit directions*; feed
  *header, two prose lines, exits, people, things summary*; focal
  *everything*.

### The navigator (about YOU) and the Zone card (about a zone)

*Does the Zone card follow movement or inspection?* splits into two
cards, both properly anchored:

- **The navigator — a card about you, your position.** Its subject is
  the viewer, so following you IS its anchoring (no relative query).
  It updates on every move; crossing into another zone changes what it
  shows.
- **The Zone card — a card about one zone**, opened by inspecting it. It
  does not follow you.

⛔ **The firewall shapes both.** A player's map is a CLAIM, not a view
(location-graph.md): one document per player per locality, written only
by what the player did. The world's index never reaches a client. So a
zone is drawn **as you know it** — no total room counts (*12 places on
your map*, never *12 of 40*), no rooms you have not learned, every claim
with its channel and its date.

⚠ **Zones have no geography relative to each other.** Parent and child
is taxonomy, not space; a card must never imply a child sits somewhere
inside its parent's map. Each map is one zone's grid or chart.

| | navigator (about you) | Zone card (about the zone) |
|---|---|---|
| map | a window **centred on you** | the whole **known** zone |
| position | known, in a grid; on an expanse, **your plot** — a reckoning with an uncertainty ring that grows as you sail and collapses on a fix, labelled as a reckoning; never the true position (*nothing fixes you by being seen*, expanse.md) | — |
| horizon | your last `query horizon`, with its time — a button, never pushed | — |
| compass, a `route` in progress | ✓ | — |
| zone chain, coordinates line | ✓ | ✓ |
| region facts | — | ✓ |
| places of note | — | ✓ |
| parent / children (a TREE, not a map) and **ways out** (the known cross-zone exits) | — | ✓ |

**The Zone card's sections:**

- **Header** — the Idea chip with a zone mark; the name; the kind in
  words (*a gridded district*, *an open expanse*, *a folder*); the
  chain.
- **The map** — a grid of known rooms at their coordinates with known
  exits, floors as tabs (Cartesian); or the chart — foci with a radius
  on lat/lon, and bands (a current, a fog) in the chart's or pilot's own
  words (spherical). The **channel shows in the drawing**: walked solid,
  seen lighter, told/charted marked with who said so, **stale faded with
  its date** (*rot is the feature*). A disagreement shows both claims
  with their dates. Clicking a room you are not in opens **what you
  know** — the claim — never the live room; clicking your own room
  opens its Location card.
- **Coordinates** — the system, the zone's extent, your position if you
  are inside a grid; an expanse's origin.
- **Region facts** (spatial zones only) — elevation, latitude, climate
  now, the **address and locality**, the **jurisdiction** (whose writ
  runs here, from civics), shown as inherited so a room's card can link
  here to explain *why it is cold*.
- **Places of note** — the houses, structures and institutions attached
  to rooms **on your map**.
- **Parent and children** as a tree; **ways out** as a list.
- Composition.
- **Sizes** — glance *University Avenue · 12 places known*; feed header,
  a small map, one region line; focal everything; full the map fills the
  space with toggles for floors, channels and staleness. Static by
  default (a map changes only when you learn something); live only while
  you are inside.

**Non-spatial zones** (a folder, the wiki, a clade, `/home`) have no
map: the card shows the tree of what is under them — a clade's card is
the taxonomy, a folder's a directory.

### The Warren card

A warren is an Idea that owns an elastic group of instance rooms (the
lounge and its satellites, dorm rooms, holdings), so it gets a card of
its own, linked from its rooms' headers: what kind of warren it is and
what it is for; its instances — host and satellites, occupancy each,
**which one you are in**, **which one is yours**; and whether it is
budding or merging now — which answers the otherwise baffling *"why are
there other lounges?"*

### Still to detail

The **Agent**, **Thing**, **Idea** and **Shadow** bodies; the set card's
lenses per flag; how the modes (the Discord-style sidebar, with **chat**
and **explore** as their own modes) place these cards.

---

## ⭐⭐ The web as content — the browser's tab, not a card

The case: on stream, browse to an article and read it. **The web's own
render is the point** — the page as its publisher made it — so anything
that re-renders it (a reader extraction, a sanitized body in a card) is
a different thing and was rejected on that ground.

**And the page cannot come inside the client.** Most publishers send
`X-Frame-Options: DENY` or a `frame-ancestors` CSP, so an iframe card
is a blank box; the pages that do frame are a minority you cannot
predict. Nothing on our side can override a header the publisher sends.
The only ways to put an arbitrary page inside our window are a desktop
shell with a privileged web view (Electron's `<webview>`) or a remote
browser streamed in as video — each a new product to carry for one
use, and neither on the table.

**So the web is a browser tab, and the integration is what makes that
good.** When the streamer switches tabs the browser tells the page
(`visibilitychange`), and the client reports it on the bus as a
streamer-only fact: *client hidden*. The overlay switches to a scene
built for "not the client" — the window capture framed rather than full
screen, with the chat and the camera laid out by the overlay instead of
by the client's corner region. Coming back flips it. The capture source
does not change at all: OBS keeps capturing the same browser window,
which is now showing the other tab.

⚠ What the client can say is *I am hidden*, never *what is showing
instead* — the page has no right to know the other tab, and the scene
does not need it. A second window (rather than a tab) reads the same
way, provided the client window is covered or minimized; a client left
visible beside a browser window is still "visible", and that layout is
a scene the streamer picks by hand.

---

## ⭐⭐⭐ The broadcast contract — the tricky part is integration

Five programs, and each should know as little as possible about the
others. The contract is **which facts cross which wire**:

| from → to | wire | carries |
|---|---|---|
| client → server | the authed bus (as today) | commands; `cockpit` changes; *client hidden/visible* |
| server → overlay | the `?broadcast=` feed (default-deny projection) | stream phase + reason + timer; the streamer's **mode · arrangement · focal card kind · whether the visible terminal carries stream chat · client hidden**; relay chat (shipped) |
| overlay → OBS | the browser source's own scene control, or obs-websocket | the scene to show |
| Stream Deck → pblive → server | pblive's socket; a control credential scoped to `stream` | `stream away bathroom`, `stream segment …` |
| Stream Deck → OBS | Elgato's OBS plugin | the hard privacy cut, mute — what must work when the server is down |

- **The overlay owns the rules**, as data: *arrangement `play` with no
  chat in view → chat overlay on*; *focal is video → ticker off*;
  *client hidden → the windowed scene*. The client never decides a
  scene, and OBS never learns what an arrangement is.
- ⚠ **Every field on the feed is an allowlist entry.** The
  client-shell slate settled that the public projection is default-deny;
  "the streamer's arrangement name" is a new field and gets added on
  purpose, not by forwarding cockpit state wholesale.
- ⚠ **The streamer's writes stay on the session.** The registry slate's
  invariant — *the overlay token READS, the player's session WRITES* —
  holds; pblive's scoped control credential is a second, deliberate
  writer and must be named as one, not slipped in.

### ⭐ The camera region

Running the client full screen means viewers see the client. The
streamer's controls are the part nobody else needs, so the streamer
arrangements put the deck at **corner** size in a region the arrangement
declares, and the overlay puts the camera over it. The overlay reads the
region from the feed (it is part of the arrangement), so moving it is a
saved arrangement, not an OBS edit.

### ⚠⚠ Redaction while live

A captured client broadcasts everything it shows: tells, DMs, the
account menu, an editor. While the stream phase is live, the client
renders private frames as *[private message]* and private cards as
husks with their titles only, and restores them in standby — which
nobody sees. The rule is keyed on the frame's privacy, which the server
already knows; the client does not guess.

---

## Lens pass

1. **Pedagogy** — neutral in itself; the size axis is how a study mode
   gets a focal lesson beside a terminal without a bespoke layout
   (client-cockpit-slate's content surface lands here).
2. **Creative expression** ⭐ — decides the CMS fork (decompose) and the
   region vocabulary (closed regions, open arrangements). A player's
   workspace is something they compose.
3. **Immersion / participation** — screens: watching is joining, not
   being pushed; tuning is the contested act the bar TV is for.
4. **Values** — redaction while live is a "the people in your tells did
   not consent to an audience" answer; tab-away reports *hidden*, never
   *what instead*.
5. **Continuity** — a card that answers the same commands whether it
   came from the implant or a phone is the continuity test passed on the
   client.
6. **Economy** — none.
7. **Governance** — the streamer axis decides who sees the deck; no
   person is judged.

## Non-goals

- **Building the phone**, the opt-in implant, or epoch cloakrooms
  (content-declaration §3.8). This slate only makes them free on the
  client.
- **Broadcast-ready itself** — stream phases, reasons, durable stream
  state, the overlay scenes, pblive's revival. Its own build; this slate
  defines the contract it consumes.
- **A channel guide** on screens (display.md's deferred addressing
  layer).
- **Frame-synced shared viewing.** Shared means the same channel, not
  the same frame.
- **Claude on stream.** Rodney's plan has an agent board; try that
  for a few streams before building anything into the client.
- **The web inside the client.** No iframe card (publishers forbid
  it), no reader card (the render is the point), no desktop shell or
  remote browser. The web is a tab.

## Open questions

1. **Size names and the verbs** — `glance · feed · focal · full`, and
   `cockpit card focus|full|…` vs a single `cockpit card size`.
2. **Tab-away for everyone or streamers only** — the fact is only
   reported to the feed for a streamer, but should a viewer's client
   also pause a focal video when hidden?
3. **The tuning verb** — `switch tv to X`, `put X on tv`, or keep
   `watch X on tv`; run the collision ladder against `tune`.
4. **Liveness fallback** — does a feed card ever stay live when nothing
   is focal, or does unfocused mean static, full stop?
5. **The camera region** — one fixed corner for every streamer
   arrangement (simplest for OBS), or declared per arrangement.
6. **Overlay → OBS** — the browser source's own scene control (no extra
   process) or obs-websocket (sturdier, one more thing running).
