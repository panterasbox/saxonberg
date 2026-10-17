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
> streamer-only card that holds the camera region · the article card
> (hypertext the server fetches and reads) · tab-away as a fact the
> client reports · the broadcast contract: which client facts the overlay
> feed carries
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
- **Hypertext in a card already exists.** `wiki` and `help` are
  `payload` cards rendering a page body with links. An article from the
  web is that card with a different producer.
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
is ABOUT something.** A thread, a file, a stream, a screen, an article
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

## ⭐⭐ The article card — reading the web inside the client

The case: on stream, browse to an article and read it without leaving
the client. It is not video; it is hypertext.

**An iframe cannot do it.** Most publishers send `X-Frame-Options:
DENY` or a `frame-ancestors` CSP, so an embedded page is a blank box —
and the ones that do frame are a full third-party page running in the
client (trackers, autoplay, layout that ignores the theme). A client
`fetch` of the page fails on CORS. Neither problem is fixable from our
side.

**The server reads it instead.** `read <url>` (verb name open): the
server fetches the page, extracts the article (title, byline, body,
images — the reader-mode extraction every browser ships), sanitizes it
to the hypertext the `wiki` card already renders, and pushes an
**article card**. CORS never applies, because the browser never asks a
foreign origin for anything but images. Links inside it open another
article card; *open in a tab* is always offered for the page that does
not extract.

What it must get right:

- ⚠⚠ **It is a server-side fetch of a player-supplied URL — the SSRF
  shape.** Refuse private, loopback and link-local addresses *after*
  DNS resolution and again on every redirect; cap size, time and
  redirect count; fetch `http(s)` only. This is the part to get right
  first, not last.
- **Interface tier, never in-world.** Like streams, reading the web is a
  real-world feature for a real audience; it may never be gated by
  progression. Whether it
  is offered to every player or to streamers first is an open question —
  the SSRF guard is needed either way.
- **Not a cache, not a mirror.** The extracted body lives on the card
  and nowhere else — no collection, no document, no help index. It is
  a reading of a page, the same way a `look` card is a reading of a room.
- **Performance** is one fetch and one extraction per open, on the
  server; the client renders text it already knows how to render.

**The fallback is honest:** a page that will not extract (a web app, a
paywall, a video page) says so and offers the tab. Which is why the
next section exists.

---

## ⭐⭐ Leaving the client is a fact the client can report

When the streamer switches browser tabs, the capture is no longer the
client. The browser tells the page (`visibilitychange`) and the client
reports it on the bus as a streamer-only fact: *client hidden*. The
overlay then switches to a scene built for "not the client" — the
capture windowed rather than full screen, with the chat and the camera
laid out by the overlay instead of by the client's corner region. Coming
back flips it.

That makes "I'll just switch tabs" a supported path rather than a broken
one, which matters because the article card will never read everything.

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
4. **Values** — redaction while live and the SSRF guard are both "the
   viewer did not consent to this" answers.
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
- **Claude on stream.** pbox-stream's plan has an agent board; try that
  for a few streams before building anything into the client.
- **A browser.** The article card reads articles; it does not run web
  apps.

## Open questions

1. **Size names and the verbs** — `glance · feed · focal · full`, and
   `cockpit card focus|full|…` vs a single `cockpit card size`.
2. **Who gets `read <url>`** — everyone (rate-limited) or streamers
   first.
3. **The tuning verb** — `switch tv to X`, `put X on tv`, or keep
   `watch X on tv`; run the collision ladder against `tune`.
4. **Liveness fallback** — does a feed card ever stay live when nothing
   is focal, or does unfocused mean static, full stop?
5. **The camera region** — one fixed corner for every streamer
   arrangement (simplest for OBS), or declared per arrangement.
6. **Overlay → OBS** — the browser source's own scene control (no extra
   process) or obs-websocket (sturdier, one more thing running).
