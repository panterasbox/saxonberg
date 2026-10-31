# Broadcast-ready slate — what it takes to go live every week

> **Status: UNBUILT** — the overlay feed and its `stream away` /
> `stream back` countdown shipped (Phase 1), plus relay chat on the
> feed →
> [livestream.md](../../subsystems/livestream.md),
> [streaming.md](../../subsystems/streaming.md). Rodney's half is built
> against mock data on `build/rodney` (2026-10-31): the standby on the
> brand guide, the Live scene's sidebar and lower third, show profiles,
> the nameplate, the OBS setup doc; requirements at
> [broadcast-ready-requirements](../../requirements/broadcast-ready-requirements.md)
> **Left:** the stream's phases (offline · starting · live · standby ·
> ending) and standby *reasons* as rows · stream state that survives a
> restart and fails closed, held by each streamer rather than the
> server · a per-streamer overlay token · the on-air marker bystanders
> can see · ⭐ the canvas (revised 2026-10-22: display capture in a 16:9
> content area, the sidebar — brand, topic and agenda, chat, the camera
> in the corner — and the lower third's rotation and crawl) · the agenda ·
> the lower third's cards (revised 2026-10-31: the Saxonberg card, money, community, wiki
> article of the day, term of the moment; welcomes in the ticker; names shown freely) · three
> brands, three jobs (show profiles, the nameplate) · the build's date on the feed · new
> players on the feed · the streamer controls as a pop-out card on the unshared monitor ·
> redaction while on air · the client's foreground reported · the
> streamer's client facts on the feed ·
> the overlay's scenes, layers and scene rules · OBS scene switching ·
> the Stream Deck: Elgato's OBS plugin for the hard cuts, pblive revived
> for game commands behind a scoped control credential · multistreaming
> to YouTube and Twitch from OBS, and YouTube live detection under the
> streamer's own login
> **Size:** a build — the saxonberg MR (which now includes the overlay,
> Rodney, at `packages/rodney`) plus a small `pblive` change in its own
> repo

**Captured 2026-10-17.** The founder wants a weekly stream of a couple
of hours walking through the week's work on the platform. The hardware
is there; the software is not broadcast-ready. This slate is the
smallest thing that makes a real show possible, and nothing about it
waits on [card-sizes-slate](card-sizes-slate.md) — it consumes that
slate's broadcast contract in the shape that exists today and upgrades
for free when the card build lands.

Related: [livestream.md](../../subsystems/livestream.md) (StreamState,
the feed, the streamer axis), [streaming.md](../../subsystems/streaming.md)
(relay chat), [card-sizes-slate.md](card-sizes-slate.md) § the broadcast
contract (the table this build fills in), [streamer-registry-slate.md](streamer-registry-slate.md)
(per-streamer state — explicitly NOT this build),
[client-shell-slate.md](../tails/client-shell-slate.md) § public
read-only surface (default-deny projection), the
[broadcast-patronage track](../../tracks/broadcast-patronage-track.md)
Phase 3 (this build is it), and Rodney's `PLAN.md` §2 (`packages/rodney`, historical) (the two
frames) and §8 Phase 3 (the control plane).

---

## What exists

| piece | state |
|---|---|
| `StreamState` (`/platform/idea/StreamState`) | `mode: live\|standby`, `awayUntil`. **In memory** — a restart resets to `live` |
| `stream away <dur>` / `stream back` | the whole control plane; gated `requiresStreamer` |
| the `?broadcast=<token>` feed | pushes `stream-state`; forwards the owner's Twitch/YouTube chat as `relay-chat` |
| Rodney (`packages/rodney`, was the sibling repo `pbox-stream`) | ONE scene, Standby: the monastery, the banner, the countdown. Reads `stream-state`; **ignores `relay-chat`**; no OBS link |
| `StreamerDeck` (client) | a scaffold: every chip dimmed, none sends, the live/viewers/uptime readout is fake |
| `pblive` + `pblive-streamdeck` | 2021; drives the office light; needs AWS SSM to boot; no OBS, no game link |
| OBS ↔ anything | nothing |

⚠⚠ **The hazard that makes this not optional:** stream state is in
memory, so a deploy during a *privacy* standby restarts the server, the
overlay reconnects, hears `live`, and puts the desktop back on air. A
privacy control that fails open is worse than none.

---

## The stream's phases

`offline · starting · live · standby · ending` — `StreamState.mode`
grows from two values to five (panterasbot had four; `offline` is the
fifth because redaction and the streamer's corner must know whether
there is a broadcast at all).

| verb | phase | the overlay shows |
|---|---|---|
| `stream start [in 10m]` | starting | Starting Soon, counting to the start |
| `stream live` | live | the client capture + layers |
| `stream away <reason> [dur]` | standby | Standby with the reason's copy; a countdown, or *back shortly* |
| `stream back` | live | — |
| `stream end` | ending | the outro card, then offline on a timer or `stream off` |
| `stream segment <title>` | (any) | the segment lower third |

- **`stream away 15m` keeps working** (a bare duration is the
  `generic` reason) — the shipped grammar stays valid.
- ⭐⭐ **Stream state belongs to the streamer, not the server.** The
  shipped `StreamState` is a server-wide singleton, so two streamers
  would share one standby screen. Here it moves onto **each streamer's
  own character** — every `stream` verb acts on the caller's own state,
  and the client facts below are read off that player's client. Several
  streamers live at once is then the ordinary case rather than a
  feature: nothing is shared to collide over. The singleton retires.
  (Keyed by `getIdentityPath()` wherever it is keyed at all — every
  player shares one template path.)

### ⭐ Reasons are rows

A standby reason is content: a label, the overlay's copy, a default
duration *or none*, whether it is a **privacy** reason, and the scene
it wants. Shipped rows: `bathroom` (5m), `food` (15m), `water` (3m),
`privacy` (no timer, privacy), `technical` (no timer), `generic`. A new
reason is a row, not a code change — *a reason the streamer thinks of
mid-show is one `clone` away*.

- ⭐ **Privacy reasons show no countdown.** A timer on a privacy
  standby tells the audience exactly how long the private thing takes,
  and running out of it puts pressure on the streamer to come back
  before they are ready. *Back shortly* is the honest copy.
- The rows warm on use (`stream away bathroom` resolves the row by
  path) — no boot-time roster to forget.

### ⚠⚠ Durable, and fail closed

- **Stream state persists with the streamer's character**, through
  the self-persistence spine that already saves them — no singleton
  capture, no new collection. A restart restores the phase, the reason
  and the timers. This costs the same as making the singleton durable,
  which is why the per-streamer shape is taken now rather than
  retrofitted.
- **The overlay holds its last scene when the feed drops.** It never
  falls back to *live* on its own; reconnecting delivers the current
  snapshot, which is now the durable one.
- **The Elgato hard cut is the floor** (below): when the server is down
  entirely, a Stream Deck button still kills the desktop capture,
  because it talks to OBS and nothing else.

---

## ⭐⭐ The canvas — revised 2026-10-22 **[DECIDED — the owner]**

The owner's setup: *"I just want to run a browser maximized running the saxonberg client in
one tab. I'll also have other tabs for other web content I wanna share, and maybe even
another window for Claude Desktop."* The show is a frame around the desktop, not a
full-screen client — so the original **streamer corner** (the camera over a reserved block
of the client) and the separate **Browsing** scene are retired.

```
┌────────────────────────────────────────┬──────────┐
│                                        │  BRAND   │  always
│                                        ├──────────┤
│        CONTENT  1520 × 855             │  TOPIC   │  always
│        (display capture, 16:9)         │ + agenda │
│                                        ├──────────┤
│                                        │   CHAT   │
├────────────────────────────────────────┤          │
│ ROTATION  1520 × 177                   ├──────────┤
│ CRAWL     1520 × 48                    │   CAM    │  the corner
└────────────────────────────────────────┴──────────┘
```

1920 × 1080: a 1520-wide 16:9 content area leaves exactly a 400-wide sidebar and a
225-tall lower third.

### ⭐ Capture the display, not a window

One display capture fills the content area: **what is on the screen is what the audience
sees** — the Saxonberg tab, another tab, Claude Desktop in front. Switching content is
switching windows, as the streamer works anyway; the state machine never chooses *what* to
show. The owner: *"you can trust I'm not gonna open my email in the same Chrome window as
the game"* — so there is no tab allowlist and no private-tab cover.

⚠⚠ **A privacy cover is the absence of the source, never a layer over it.** An overlay page
that fails to load takes its covers with it, so every privacy state switches to an OBS scene
that **does not contain** the display capture (or, for Away, the camera) — the fail-closed
rule, made structural.

### The sidebar

- **Brand — always on screen.** The **show's** brand — tonight's profile (§ Three brands,
  three jobs): the Saxonberg seal and wordmark on a Saxonberg stream.
- **Topic and agenda — always on screen.** The current topic is the current segment
  (`stream segment …`); the agenda is the ordered list set at `stream start` or by
  `stream agenda …`, the current item highlighted, finished ones ticked; one command or one
  Stream Deck button steps to the next.
- **Chat** — the combined Twitch and YouTube relay chat already on the feed; a Saxonberg
  in-game channel may interleave.
- **The camera in the bottom corner** — the owner: *"I want the camera in the corner, not in
  the middle."*

### The lower third — rotation over a crawl

Laid out for a viewer at 720p, where everything renders at two-thirds size:

```
┌─────────────────────────────────────────────────────────────┐
│ ROTATION 1520 × 177 · one panel at a time, ~20 s            │
│ title 40px · body 28px · a hairline showing time left       │
├─────────────────────────────────────────────────────────────┤
│ CRAWL 1520 × 48 · 26px text, scrolling ~120 px/s            │
└─────────────────────────────────────────────────────────────┘
```

- **The legibility floor** — the crawl's 26px is about 17px at 720p and the body's 28px
  about 19px; nothing smaller.
- ⭐ **The rotation wins any squeeze** (the owner: *"if we had to pick just one then it'd be
  the rotation"*). The crawl is a layer that hides when it has nothing to say, and the
  rotation grows back to the full 225.
- **Both are rows**, like standby reasons — text, duration, weight, source, and a **show
  only when** condition, so an empty item never takes a turn and adding one is content, not
  code.

### ⭐⭐ What the lower third is for — passive **[DECIDED — the owner]**

The owner: *"some of this stuff we can just put in the game, and if I wanna show it I'll be
showing the whole client … The overlays is stuff I want shown passively."* Anything worth
navigating to stays in the game; the overlay carries what should be true while the streamer is
doing something else. What it carries is **§ The cards** below (revised 2026-10-31 — the v1
rotation of join · goals · the world · the quote · building · links was rendered, and the owner:
*"these are all terrible"*).

### ⭐ Names are shown freely **[DECIDED — the owner, 2026-10-31; reverses the opt-in]**

The overlay names players by their **character** — in welcomes, in the ticker, wherever. The
owner: *"it's not their real name, who cares."* The opt-in this slate recorded on 2026-10-22 (a
welcome broadcasts an arrival to the internet) is retired: a character name is not an identity.

### Alerts — later, in the lower third **[DECIDED]**

Alerts interrupt the rotation for a few seconds, in the lower third, so the content area is
never covered. ⭐ **The alert that matters is the conversion: someone walked into Saxonberg
from the stream** — the moment the pitch worked. Follows, subs and raids follow Twitch event
intake.

### For the streamer only — the controls card **[DECIDED — the owner]**

The owner: *"a few of these things I might want to know about but not show at all, like
viewer count — that's worth putting in the streamer control pop-out window just for my
benefit."* On the popped-out controls card, on the unshared monitor: viewer count (Twitch and
YouTube), uptime, chat rate; who is in the game right now, by name; ⭐ the rotation's **now
and next, with skip and pin**; the alert queue once alerts exist.

### Cheap to iterate

- **Rows**, so copy, order and timing change without code.
- **A preview page** — Rodney with mock data shows the lower third cycling with no stream and
  no server, to look at, react to and change.
- **Skip and pin** on the controls card, to test it live.
- Rules the owner may tilt: **fresh beats due** (an item whose data just changed jumps the
  queue once) and **weight by segment** (build items heavier in a coding segment, world
  items in a play segment).

## ⭐⭐ The cards — revised 2026-10-31 **[DECIDED — the owner]**

A **card** is one thing the lower third shows on its turn. Each card is about **one thing**,
and a card whose source is empty never takes a turn.

| card | about | source | waits on |
|---|---|---|---|
| **Saxonberg** | the game | static + the game | the build date; the domain |
| **Money** | dollars in vs the month's budget | giving's ledger + the books | [giving](./giving-slate.md), [budget](./budget-slate.md) |
| **Community** | people joining | giving's events + new players | giving; the new-player event |
| **Wiki article of the day** | the architecture, a page at a time | the wiki | the wiki's public route |
| **Term of the moment** | one word, defined | the wiki | the wiki's public route |
| **What is this?** | the basics, for someone arriving mid-stream | static | ⏸ parked until the others settle |
| **You're watching** | the channel | static | — |
| **The ticker** (the crawl) | in-world news, world firsts, ⭐ welcomes | press, chronicle, new players | the new-player event |

### The Saxonberg card **[DECIDED — the owner; copy LEAN]**

⭐ **The hook is that the viewer can use it too**, not *"log in and you're on the stream"* —
the owner: *"not everyone wants that … the truth is they're looking at me using the app, so it's
more like, hey, you can use this thing too, it's not just for streamers."* The shared world is
implied, not sold; the ticker carries it. The card:

- **restates the brand** — the rings on Old Glory Blue and the wordmark: *"there's a lot going on
  on this screen, and mud.panterasbox.com isn't an obvious locator for a game called Saxonberg"*;
- the hook, the URL, how many players are in the world now, and a QR;
- ⭐ **the build's date and age** — *"like how old is the thing they're looking at"*. ⚠ **No
  build identity exists anywhere today**: the deploy stamps its commit and date, and the feed
  carries them (it pairs with the deployed-commit diff of
  [gitlab-and-discord](./gitlab-and-discord-slate.md)).
- ⚠ **The domain** — the owner will register **`saxonberg.gg`** (unregistered as of
  2026-10-31; Route 53 registers `.gg`, without WHOIS privacy). A host change moves
  `CLIENT_URL` and every OAuth callback with it ([deployment.md](../../deployment.md)).

### The money card — dollars only **[DECIDED — the owner]**

**This month's income against this month's budget, back to zero every month** — the owner: *"that's
how I have to pay for things right now"*. Income is **at net**, what reached the project
([giving](./giving-slate.md)); the budget is **read from the books**
([budget](./budget-slate.md)), split by what drives it — **running the world** (grows with
players) and **building it** (inference today) — so *costs rise as more people log in* is visible
as it happens. Recent gifts may scroll here. ⚠ **Recurrence is not a dimension** — the owner:
*"the recurringness actually isn't really important to me"*: one flat number for the month.

⚠ Before it airs: [budget](./budget-slate.md) guardrail 4 (*contributions confer nothing*) and
[giving](./giving-slate.md) (patronage becomes capital standing) must be read together — this card
is where dollars and standing would sit side by side.

### The community card — people **[DECIDED — the owner]**

New subs, gift subs, new members and patrons, **as people joining, not as money**; ⭐ new
Saxonberg players in real time (character creation's commit is one server event — it goes on the
feed); and **where to find us** — Twitch, YouTube, Kick, Patreon with their glyphs and handles.
The owner prefers gift subs to flat gifts (*"subs build community, donos just support me"*); the
community card is where that shows, and alerts weigh a gift sub heaviest.

### The ticker welcomes **[DECIDED — the owner]**

*"Welcome, Iffy!"* in the ticker when a player arrives for the first time — by character name
(§ Names are shown freely). ⭐ **From the stream**: the Saxonberg card's QR and links carry a
stream tag ([deep-links](./deep-links-slate.md)), so a player who came from the stream is welcomed
as one — the conversion alert, in the ticker.

### Wiki article of the day, and the term **[LEAN]**

The owner: *"a great way to get people into the architecture."* **Seeded by the date**, so the
stream, the in-game wiki and Discord agree on the day's page; a **second slot follows the topic**
(tonight's agenda item picks a related page), so the same page does not repeat all night. The
summary is **the page's own lead** — the public route's link-preview summary, never an LLM's —
and only **level-0** pages, the public route's rule. The **term of the moment** is the same reader
on demand: the streamer flags a word (`stream define mixin`, or a deck button) and the card shows
its one-line definition and the public link. Both read [wiki-content](./wiki-content-slate.md)'s
public route.

### ⭐⭐ Three brands, three jobs **[DECIDED — the owner]**

The owner: *"the livestream really has three competing brands."* Each gets one job:

| brand | job | where |
|---|---|---|
| **the show** — Saxonberg, a game, music | what tonight is about | the sidebar's brand block, the topic label, the rotation's cards, the standby's right banner |
| **the studio** — Pantera's Box | who makes the show | the frame itself, the standby's left banner |
| **the person** — Bobalu Smallberries | whose channel this is | the **nameplate**: *Bobalu Smallberries @ Pantera's Box*, flush right with the studio's hex against the word BOX, on the camera |

A show is a **profile** — a row naming its mark, wordmark, topic label, cards and whether the
crawl runs; chosen per OBS browser source today (`?show=music`), carried by `stream start <show>`
later. ⭐ The owner's NetHack `@` (the IBM VGA 8×16 glyph) is the **person's avatar on the
platforms**, deliberately **not** on the overlay.

---

## The client

### ⭐ The streamer controls — a pop-out card on the unshared monitor **[DECIDED — the owner]**

The owner: *"generally I park my stream controls over on my other monitor that I don't
share."* The controls are **a card** — the phase, a reason picker, the timer, *Back*, the
topic and agenda — and ⭐ **any card can open in its own window without browser chrome**
(a requirement handed to the card redesign: [card-ux-brief](../../card-ux-brief.md)
§ 4). The streamer pops the controls out onto the monitor that is not captured. Every
control sends its `stream` command, previewed on hover like every clickable; the Stream
Deck and typing `stream …` on air remain.

- `StreamerDeck`'s dead chips go: the ones whose verbs ship here are wired into the
  controls card, the rest (moderation, rewards, penalties) are deleted rather than left
  dimmed, because no slate builds them.
- **On air the client's type grows** (about 140%) — the content area is roughly 60% of a
  2560-wide monitor, so ordinary client text is unreadable on stream — and it hides its own
  relay-chat panel, since the sidebar shows the chat.

### ⚠⚠ Redaction while on air

A full-screen client is a broadcast of everything it shows. While the
client is **on air** — phase `starting`, `live` or `ending` — the
streamer's client renders **private frames** as *[private message]*
(tells, DMs: the frames the server already stamps `speech.comms`;
private channels to be confirmed in the plan) and **private cards** as
husks showing only their titles. In `standby` and `offline` nothing is
on air — no standby scene captures the client — so they render
normally, which is what a privacy standby is *for*.

The rule keys on what the server stamped, never on a client guess, and
it applies to the streamer's own client only.

### ⭐ The on-air marker — bystanders know

Redaction protects the streamer's private frames. It does nothing for
the **other players** a broadcast shows: anyone in the room the streamer
is in appears on stream doing public things, and today has no way to
know. So while a streamer is on air, **the streamer's presence line says
so** (*"…, broadcasting"*) and the room line carries a marker that a
broadcast is reaching it. It is a statement, not a gate — a public room
stays public — but nobody is on camera without being told.

### The foreground — no extension needed

The owner: *"I don't need to get too clever with the extension."* The browser alone tells
the three states apart, and the streamer's client reports which (phase ≠ `offline`) —
never what is showing:

- **visible and focused** — Saxonberg is in front;
- **hidden** (`visibilitychange`) — another tab in that window;
- **visible but blurred** (the window lost focus) — another app (Claude Desktop).

Nothing critical depends on it now that the display is captured; the overlay's rules may
use it (*when the game is not in front, rotate a game summary*).

---

## The feed — what crosses to the overlay

### ⭐ One token per streamer

The shipped feed has one `BROADCAST_TOKEN` and pushes the same state to
every overlay. Here **an overlay token names a player**: a streamer
issues their own (a `stream token` subcommand, shown once, rotatable),
and a socket opened with it receives **that streamer's** state, client
facts and chat — nothing of anyone else's. Several streamers' overlays
connect to one server side by side.

- The owner's chat still comes from `OVERLAY_TWITCH_LOGIN` /
  `OVERLAY_YOUTUBE_CHANNEL` for the founder; for anyone else, the
  channels are a field on the streamer an operator sets, until the
  registry's claim-by-proof replaces both.
- `BROADCAST_TOKEN` keeps working as the founder's token during the
  changeover, then retires.
- ⚠ **YouTube is the real multi-streamer limit, not the server.** The
  owner's live broadcast is found with `search.list` — 100 units of the
  default 10,000-a-day quota, polled every 15 minutes: about one
  channel's worth. A second YouTube streamer exhausts it. The fix is
  reading each streamer's broadcasts under their own YouTube login
  (about 1 unit), which is the registry's YouTube proof — so that proof
  is a prerequisite for YouTube at scale, and not this build's.

### What crosses

Every field is an allowlist entry on the default-deny projection, added
on purpose:

| field | why the overlay needs it |
|---|---|
| `phase`, `reason` (label, copy, privacy, scene), `awayUntil`, `startsAt` | the scene and its text |
| `segment`, `agenda` | the topic and agenda in the sidebar |
| `client.mode`, `client.arrangement` | which client layout is on air → layer rules |
| `client.foreground` | `saxonberg` · `other-tab` · `other-app` — for the overlay's rules |
| `relay-chat` (shipped) | the chat overlay |

Not on it: anything about any player but the token's streamer, the streamer's
private frames, card contents. `client.focal` joins when card-sizes
ships.

---

## The overlay (Rodney, `packages/rodney`)

### Scenes — four, each a fixed set of sources

| scene | content area | camera | when |
|---|---|---|---|
| **Starting** | the countdown to `startsAt`, the agenda | optional | starting |
| **Live** | the display capture, with the sidebar and lower third | on | live |
| **Away** | ⛔ no display source — the standby scene with the reason's copy; privacy shows no countdown | ⛔ off | standby |
| **Ending** | the outro | on | ending |

Built in the existing brand system (the monastery, the banner, the serif voice); the
sidebar and lower third are Rodney layers on Live.

### ⭐ The rules are data

A small table in the overlay maps the feed to a scene and its layers:
*phase standby → Away*; *live → Live*; *live ∧ foreground ≠ saxonberg → rotate a game
summary*; *reason.scene set → that scene*. The game
never names an OBS scene except as a reason row's hint, and OBS never
learns what an arrangement is. Changing the show's behaviour is editing
the table.

### OBS scene switching

The overlay is already a browser source listening to the feed, so it
switches the scene itself — OBS lets a browser source control scenes
when the source is granted that permission. No new process. If that
proves brittle, obs-websocket (built into current OBS) is the fallback
behind the same rules table; the choice does not leak out of the
overlay.

---

## The Stream Deck

Two paths for two kinds of button:

- **Elgato's OBS plugin** — scene cuts, mute, start/stop. ⭐ **The
  privacy hard cut lives here**, because it must work with the game
  server down.
- **`pblive`, revived** — buttons that send *game* commands (`stream
  away bathroom`, `stream back`, `stream segment …`) and the office
  light it already drives.
  - Config from `.env`, not AWS SSM.
  - A `saxonberg` controller beside `lighting`.
  - ⚠⚠ **Its credential is a deliberate second writer.** The registry
    slate's invariant is *the overlay token READS, the player's session
    WRITES*; a Stream Deck button is a write with no browser session. So
    pblive gets a **control token scoped to the `stream` verb for the
    configured streamer** — it can run `stream …` as that player and
    nothing else. Named here so it is a decision, not a leak.

---

## Multistreaming — YouTube and Twitch from day one

The founder streams to **YouTube and Twitch** at once; Kick stays off at
first (*"I dont wanna dilute my audience"*) and costs nothing to keep
ready — its login and chat reader already ship, so turning it on is a
setting.

- **OBS sends both directly**, with the multiple-RTMP-outputs plugin
  sharing one encode. The founder's upstream is ~70 Mbps; two 1080p60
  outputs need ~12–16 Mbps, so there is room for a third and no reason
  to pay a restreaming service.
- ⚠ **Check Twitch's current simulcasting terms before the first show.**
  Twitch relaxed its exclusivity rule for Affiliates and Partners in
  2023, with conditions; read the current agreement rather than trusting
  memory.
- ⭐ **Saxonberg is the unified chat.** Relay chat already merges
  Twitch, YouTube and Kick with platform glyphs — the thing multistreamers
  usually pay a third party for, on screen as a demo of the platform.
- ⚠⚠ **YouTube live detection moves onto the streamer's own login.** The
  overlay finds the live broadcast with `search.list` (100 units of the
  10,000-a-day default quota, polled every 15 minutes — roughly one
  channel's whole day). With YouTube a primary platform that is too
  close to the edge: read the streamer's own broadcasts under their
  YouTube authorization instead (about 1 unit a call). It needs the
  YouTube channel linking [giving](giving-slate.md) also needs, so the
  two builds share it — whichever lands first builds it. Confirm the
  live-chat read's own quota cost at the same time.
- Alerts arrive per platform (giving-slate reads them); the overlay
  shows them in one style with the platform glyph.

## The drive

The exit criterion, run against the real stack with OBS open:

1. `stream start in 2m` with an agenda → Starting counts down and shows it; `stream live` →
   the display is on air in the content area, the sidebar shows brand, topic, chat and the
   camera in the corner, and the lower third rotates.
2. A tell arrives → it reads *[private message]* on air.
3. `stream away bathroom` from the popped-out controls card on the other monitor → Away,
   5:00 counting; the display and the camera are gone from the scene.
4. `stream away privacy` from the Stream Deck (pblive) → Standby, no
   timer; the tell now reads in full on the streamer's screen.
5. **Restart the server** → the overlay still shows the privacy
   standby; after reconnect it still does.
6. `stream back` → live. Switch to another tab, then to Claude Desktop → it is on air as
   it is; the feed reports `other-tab`, then `other-app`.
7. `stream segment` steps the agenda → the sidebar's topic and ticks follow.
8. Elgato privacy button with the server stopped → the desktop leaves
   the stream.
9. A second player in the room sees the on-air marker on the streamer
   and the room; it clears when the stream ends.
10. **A second streamer** issues a token and goes `stream away food` on
    their own overlay → the founder's overlay does not move.
11. `stream end` → Ending → offline; redaction is off.

## Lens pass

1. **Pedagogy** — none; this is the platform's own marketing surface.
2. **Creative expression** — reasons as rows and the rules as a table:
   the show's behaviour is authored, not coded.
3. **Immersion / participation** — interface tier, outside the fiction
   entirely; it may never gate on anything in-world.
4. **Values** ⭐ — decides redaction (*the people in your tells did not
   consent to an audience*), the on-air marker (*nor did the people in
   your room*), the timerless privacy standby, and fail closed over fail
   open.
5. **Continuity** — `stream away 15m` still means what it meant.
6. **Economy** — none.
7. **Governance** — the streamer axis and the scoped control token; no
   person is judged.

## Non-goals

- **The registry** — the persisted `Streamer` record, claim-by-proof,
  the YouTube proof, the public directory, third-party overlays over
  REST — [streamer-registry-slate](streamer-registry-slate.md). This
  build makes state and tokens per-streamer; it does not make streamers
  a public, claimable thing.
- **Card sizes and focal facts** —
  [card-sizes-slate](card-sizes-slate.md).
- **Reading patronage** (subs, bits, memberships, Super Chats, Patreon)
  and turning it into standing — [giving-slate](giving-slate.md). This
  build renders the alerts it hands over.
- **The Agent Board** — Rodney's plan, Phase 4. (The World Ticker's in-world news now rides
  the lower third's crawl.)
- **Viewer interactivity / the HUD** — Rodney's plan, Phases 6–7.
- **Moderation, rewards, penalties** on the deck — no slate builds the
  verbs.

## Open questions

1. ~~**The segment list**~~ — **an agenda**, decided 2026-10-22: set before the show,
   shown always in the sidebar, stepped by a command or a Stream Deck button.
5. ~~**The lower third's sources**~~ — **cards**, decided 2026-10-31 (§ The cards): each
   appears when its source exists.
6. **Pop-out windows without chrome** — an installed app (a PWA in a standalone window) is
   the lean; Document Picture-in-Picture is chromeless but one always-on-top window per tab;
   a plain popup keeps a minimal address bar. Verified when built.
2. **`ending` → `offline`** — on a timer, or only by `stream off`?
3. ~~**Twitch, YouTube, or both**~~ — **both**, decided 2026-10-17 (see
   § multistreaming); Kick later.
4. **Private channels** — confirm what the server stamps on a private
   channel's frames before trusting redaction with them.
