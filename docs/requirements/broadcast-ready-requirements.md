# Broadcast-ready — requirements

**Kind:** feature (server + client + the Rodney overlay), plus a small change in the separate
`pblive` repo
**Leads from:** kernel and overlay together. **First consumer:** the founder's weekly stream —
the build's drive is a real show with OBS open.

The founder wants a weekly stream of a couple of hours walking through the week's work, sent to
YouTube and Twitch at once. The hardware is there and OBS is now set up
([packages/rodney/docs/obs-setup.md](../../packages/rodney/docs/obs-setup.md), on `build/rodney`);
the software is not broadcast-ready: the stream has two states, they live in memory, one person can
stream, the overlay has one scene, the client's streamer controls are a dead scaffold, and nothing
protects the people a broadcast shows. This build makes a real show possible, and its spine is the
pitch the slate settled — **log in and you're on the show**, because the show *is* the Saxonberg
client. Seeding slate: [broadcast-ready-slate](../slates/builds/broadcast-ready-slate.md); the
track's Phase 3 ([broadcast-patronage-track](../tracks/broadcast-patronage-track.md)).

## What already exists

- **The stream's state** — two values, *live* and *standby*, with an away-until time; **one for the
  whole server**, held in memory, so a restart puts every overlay back on *live*.
- **`stream away <duration>` / `stream back`** — the whole control plane, for players in the
  streamers group.
- **The broadcast feed** — an overlay connects with one shared token and receives the stream state
  and the founder's Twitch, YouTube and Kick chat, merged with platform glyphs.
- **`watch` / `tune`** — the viewer half; untouched here.
- **Rodney** (`packages/rodney`, in the monorepo since 2026-10-17) — one page, Standby: the
  monastery, the waving banner, the countdown. It ignores the chat on the feed and has no link to
  OBS.
- **The client's streamer deck** — a scaffold: every chip dimmed, none sends anything, its
  live/viewers/uptime readout is fake.
- **The frames the server already marks private** — tells and DMs carry the comms stamp.
- **pblive + pblive-streamdeck** — the 2021 Stream Deck backend (office light only), current as of
  this week; it needs AWS SSM to start.
- **OBS** — 32.1.2 with its websocket and Elgato's Stream Deck plugin; the four scenes per the setup
  doc.
- ⚠ **In flight beside this:** the client-surface build (build-3) rewrites the card surface and
  hands **pop-out card windows** to this build by name.

**Therefore what is genuinely new here is:** five phases with reasons as rows, held per streamer and
durable; a token per streamer; redaction and the on-air marker; the overlay's four scenes, its
sidebar and lower third, and the rules that pick them; the controls card and pop-out windows; the
agenda; the build's date and new players on the feed; YouTube live detection under the
streamer's own login; and pblive's game buttons. ⭐ **Rodney's half is already built against mock
data** on `build/rodney` (2026-10-31): the standby, the Live scene, show profiles, the nameplate.

## Goals

- **A streamer runs the whole show from the game** — starting soon, live, away for a reason, back,
  the agenda stepped, the outro — by command, from a popped-out controls card, or from the Stream
  Deck.
- **The stream's state is the streamer's own and survives a restart**; the overlay never falls back
  to *live* on its own.
- **Several people can stream at once**, each with their own overlay that nothing else moves.
- **The overlay frames the desktop** — the display in a 16:9 content area, a sidebar (brand, topic
  and agenda, the unified chat, the camera in the corner), a lower third that rotates the pitch.
- **Nobody is broadcast without being told** — the streamer's private messages never reach the air,
  and the people in a streamer's room can see that a broadcast reaches them.
- **The show's behavior is authored, not coded** — standby reasons, lower-third panels and the
  scene rules are rows or a table.

## Non-goals

- **The streamer registry** — the persisted record, claim-by-proof, the public directory →
  [streamer-registry-slate](../slates/builds/streamer-registry-slate.md). This build makes state
  and tokens per streamer; it does not make streamers a public, claimable thing.
- **Reading patronage** (subs, bits, memberships, Super Chats, Patreon) →
  [giving-slate](../slates/builds/giving-slate.md), which the owner ships before the first show;
  the **money** and **community** cards read its ledger and appear when it exists.
- **The books** the money card's budget reads → [budget-slate](../slates/builds/budget-slate.md).
- **The wiki's public route** the article-of-the-day and term cards read →
  [wiki-content-slate](../slates/builds/wiki-content-slate.md) (requirements: MR !507).
- **The `saxonberg.gg` domain** → the owner; a host change moves `CLIENT_URL` and the OAuth
  callbacks ([deployment.md](../deployment.md)).
- **A show profile chosen by `stream start <show>`** → later; this build chooses it per OBS
  browser source.
- **Twitch event intake** (follows, subs, raids) and **alerts**, including the conversion alert →
  the broadcast track's Phase 4.
- **The GitLab sources** — the *building* panel and the *just merged* crawl →
  [gitlab-and-packs-slate](../slates/builds/gitlab-and-packs-slate.md) § 7 and
  [gitlab-and-discord-slate](../slates/builds/gitlab-and-discord-slate.md).
- **Discord go-live announcements** → [gitlab-and-discord-slate](../slates/builds/gitlab-and-discord-slate.md).
- **Card sizes and focal facts on the feed** → [card-sizes-slate](../slates/builds/card-sizes-slate.md).
- **The Agent Board, viewer interactivity, the HUD** → Rodney's own plan, Phases 4, 6 and 7.
- **Moderation, rewards, penalties** on the deck → nowhere, deliberately: no slate builds the
  verbs, so their dead chips are deleted.
- **Kick** → a setting, later (*"I don't wanna dilute my audience"*); its chat already ships.
- **A second streamer's YouTube** at scale → the registry's YouTube proof. This build reads the
  founder's own broadcasts under their login; a second streamer's YouTube waits.
- **Themes for a second streamer's overlay** → when a second streamer runs Rodney; the Pantera's Box
  skin is the only one.

## Placement

- **Kernel:** the stream's state on each streamer's character (saved by the spine that already saves
  them), the phases and the `stream` verb's grammar, the per-streamer token, redaction's stamps, the
  on-air marker, YouTube live detection.
- **The platform pack:** the standby-reason rows and the lower-third panel rows, so a new reason or
  panel is a `clone`, not a code change.
- **The client:** the controls card, pop-out windows for any card, redaction's rendering, the on-air
  type size, the foreground report.
- **Rodney:** the four scenes, the sidebar, the lower third, the rules table, OBS scene switching,
  the mock-data preview.
- **pblive** (its own repo): config from `.env`, a `saxonberg` controller.

A second streamer needs **no code** — a token and their own Rodney browser source.

## Collisions

- **The shipped `stream away 15m`** — keeps working: a bare duration is the generic reason.
- **The single shared state** — retires; every `stream` verb acts on the caller's own state.
- **`BROADCAST_TOKEN`** — keeps working as the founder's token through the changeover, then retires.
- **The client-surface build (build-3)** — reshapes the cards the controls card and pop-outs sit on.
  Whichever merges second reconciles; this build does not wait for it.
- **The client's own relay-chat panel** — hidden on air, because the sidebar shows the chat.
- **Rooms** — the on-air marker appears on the room line of whatever room the streamer is in,
  including other players' homes.
- **OBS's own Stream Deck plugin** — owns the hard cuts; pblive owns only the game buttons. Neither
  needs the other.

## Surface decisions

### The phases and the verb **[DECIDED — the slate]**

`offline · starting · live · standby · ending`:

| command | phase | the overlay shows |
|---|---|---|
| `stream start [in 10m]` | starting | Starting Soon, counting down, with the agenda |
| `stream live` | live | the desktop, the sidebar, the lower third |
| `stream away <reason> [duration]` | standby | Away with the reason's copy; a countdown or *back shortly* |
| `stream back` | live | — |
| `stream end` | ending | the outro |
| `stream off` | offline | nothing |
| `stream segment <title>` · `stream agenda …` · `stream next` | any | the topic and agenda |
| `stream token` | — | issues (or rotates) the streamer's overlay token, shown once |

### `ending` → `offline` **[LEAN — values]**

**On a timer** (a minute, the outro's length), with `stream off` to end it sooner. Values chose:
redaction stays on through *ending*, and a streamer who forgets `stream off` must not be left on air
with no broadcast running.

### Reasons are rows **[DECIDED — the slate]**

Label, the overlay's copy, a default duration or none, whether it is a privacy reason, and the scene
it wants. Shipped: `bathroom` (5m), `food` (15m), `water` (3m), `privacy` (no timer), `technical`
(no timer), `generic`. ⭐ **A privacy reason shows no countdown** — a timer tells the audience how
long the private thing takes and pushes the streamer back before they are ready.

### Durable, and fail closed **[DECIDED — the slate]**

The phase, reason, timers and agenda persist with the streamer's character; a restart restores them.
The overlay holds its last scene when the feed drops and never falls back to *live* on its own. The
Elgato hard cut works with the server down.

### One token per streamer **[DECIDED — the slate]**

A token names a player; a socket opened with it receives that streamer's state, client facts and
chat, and nothing of anyone else's. What crosses is an allowlist: the phase and reason, the timers,
the topic and agenda, which layout the client is in, the foreground, ⭐ the **verb** of the
streamer's last command (the verb only — `tell`, never what was told), the relay chat, the number
of players in the world. Never another player's anything, the streamer's private frames, or card
contents.

### Redaction **[DECIDED — the slate; scope LEAN]**

While the streamer is **on air** — *starting*, *live* or *ending* — their own client renders private
frames as *[private message]* and private cards as husks showing only their titles. ⭐ **Scope:
whatever the server marks private** — tells, DMs, and private channels once the build confirms what
the server stamps on them; the rule reads the stamp, never a client guess. In *standby* and
*offline* nothing is on air, so everything renders — which is what a privacy standby is for.

### The on-air marker **[DECIDED — the slate]**

While a streamer is on air, their presence line says so (*"…, broadcasting"*) and the room line
says a broadcast reaches it. A statement, not a gate.

### The canvas and the scenes **[DECIDED — the owner, 2026-10-22]**

Per the slate and the OBS setup: a 1520 × 855 content area holding the display capture, a 400-wide
sidebar (brand, topic and agenda, chat, the camera in the corner), a 225-tall lower third. Four
scenes — **Starting · Live · Away · Ending** — and ⚠⚠ **a privacy cover is the absence of a
source**: Away contains no desktop, no camera and no microphone.

### The lower third's cards **[DECIDED — the owner, 2026-10-31]**

A card is about one thing and takes a turn only when its source has something
([slate § The cards](../slates/builds/broadcast-ready-slate.md)):

- **What you're looking at** — the screen guide: *"a multiplayer game, played in text"*, a sketch
  of the client's regions (the map, the story, the command line, the cards), the live region lit
  from the client's facts — another window, the mode, the verb just typed.
- **What can you do here?** — one true thing about a trade or system per turn, from the docs
  that say it ships; the last verb steers it (*type `smelt`, smelting comes up*).
- **Saxonberg** — the brand restated, *"what you're watching, you can play"*, the URL, players in
  the world now, a QR, ⭐ **the build's date and age**. **This build** puts the deployed commit's
  date on the feed — no build identity exists today.
- **Money** — this month's income at net against this month's budget, back to zero monthly; the
  budget split into running the world and building it. Reads giving's ledger and the books.
- **Community** — new subs, gift subs, members and patrons as people; ⭐ **new Saxonberg players
  in real time** (**this build** puts character creation's commit on the feed); where to find us
  on Twitch, YouTube, Kick and Patreon.
- **The Compact** — the three chambers in the manifesto's words: labor, capital, consumer.
- **About the streamer** and **the code** (GitLab: where it is, the stack, its size).
- **Wiki article of the day** — reads the wiki's public route.
- **The ticker** — in-world news, world firsts, and ⭐ *"Welcome, Iffy!"* for a first arrival,
  *"straight from the stream"* when the Saxonberg card's tagged link brought them.

⭐ **Names are shown freely** — character names, no opt-in (the owner: *"it's not their real
name"*). Cards are **rows, not code**.

### Three brands, three jobs **[DECIDED — the owner]**

The **show** (a profile — Saxonberg is the only one; a music stream is its own scene) owns the sidebar's brand block, the topic label,
the cards and the standby's right banner; the **studio** (Pantera's Box) is the frame and the left
banner; the **person** is the nameplate — *Bobalu Smallberries @ Pantera's Box* on the camera.

### The rules are data **[DECIDED — the slate]**

A table in Rodney maps the feed to a scene and its layers; the game names an OBS scene only as a
reason row's hint. Rodney switches OBS's scene itself as a browser source with permission to; OBS's
websocket is the fallback behind the same table.

### The controls card and pop-outs **[DECIDED — the owner; the window LEAN]**

The controls are a card — the phase, a reason picker, the timer, *Back*, the topic and agenda, and
for the streamer only: viewer counts, uptime, chat rate, who is in the game by name, the rotation's
now and next with skip and pin. ⭐ **Any card can pop out into its own window without browser
chrome** (handed here by the client-surface build); the streamer parks the controls on the unshared
monitor. **The window: an installed app (a PWA in a standalone window)** — the slate's lean; the
build verifies it, with Document Picture-in-Picture the fallback. The dead deck chips go.

### The client on air **[DECIDED — the slate]**

Type grows about 140% so the client reads at stream size; the client's own chat panel hides. The
client reports its foreground — Saxonberg in front, another tab, another app — and nothing about
what is showing.

### YouTube and Twitch from day one **[DECIDED — the owner]**

OBS sends both (one encode, Aitum Multistream). Saxonberg's relay is the unified chat on screen.
⭐ **The founder's YouTube live broadcast is found under their own YouTube login** rather than by
search, because search spends most of a day's quota for one channel; this build links the
founder's YouTube account for it, the same link the giving build needs — whichever lands first
builds it. Twitch's terms on combined chat: the owner's call, made — the chat stays.

### pblive's game buttons **[DECIDED — the slate]**

Config from `.env`; a `saxonberg` controller sending `stream …` commands. ⚠⚠ **Its credential is a
deliberate second writer**: a control token scoped to the `stream` verb for the configured
streamer — it can run `stream …` as that player and nothing else.

## Lens pass

1. **Pedagogy** — none; the platform's own marketing surface.
2. **Expression** — reasons, panels and the scene rules are authored rows and a table.
3. **Immersion / participation** — interface tier, outside the fiction; it may never gate on
   anything in-world. ⭐ Participation is the pitch: logging in puts you on the show.
4. **Values** ⭐ — decides redaction (*the people in your tells did not consent to an audience*),
   the on-air marker (*nor did the people in your room*), the timerless privacy standby, absence
   as the cover, fail closed, the ending timer, and the money card's flat monthly honesty
   (income against costs, at net).
5. **Continuity** — `stream away 15m` still means what it meant.
6. **Economy** — none in game; one encode on the founder's machine, no restreaming service.
7. **Governance** — the streamer axis, the per-streamer token, the scoped control token; no person
   is judged.

## The drive

Each step tagged by pace ([workflow.md](../workflow.md) § *No merge waits on the clock*). Run
against the real stack with OBS open.

### Blocking drive

1. `instant` · player — `stream start in 2m` with an agenda → Starting counts down and shows it;
   `stream live` → the desktop is on air in the content area; the sidebar shows brand, topic, chat
   and the camera in the corner; the lower third rotates.
2. `instant` · player — a tell arrives → it reads *[private message]* on air.
3. `instant` · player — `stream away bathroom` from the popped-out controls card on the other
   monitor → Away, 5:00 counting; the desktop, camera and mic are gone from the scene.
4. `instant` · player — `stream away privacy` from the Stream Deck (pblive) → Away, no timer; the
   tell now reads in full on the streamer's screen.
5. `short` · staged — restart the server → the overlay holds the privacy standby; after reconnect
   it still shows it.
6. `instant` · player — `stream back` → Live. Switch to another tab, then to another app → the
   feed reports `other-tab`, then `other-app`.
7. `instant` · player — `stream next` steps the agenda → the sidebar's topic and ticks follow.
8. `instant` · player — the Elgato Privacy button with the server stopped → the desktop leaves the
   stream.
9. `instant` · player — a second player in the room sees *broadcasting* on the streamer and the
   room; it clears when the stream ends.
10. `instant` · player — a second streamer issues a token and goes `stream away food` on their own
    overlay → the founder's overlay does not move.
11. `short` · player — `stream end` → Ending, then offline after the outro; redaction is off.
12. `instant` · player — chat from Twitch and from YouTube both appear in the sidebar with their
    glyphs; the founder's YouTube broadcast is found without a search call.
13. `instant` · staged — Rodney's preview page with mock data cycles the lower third with no
    stream and no server.
14. `instant` · player — a new player finishes character creation during the stream → *"Welcome,
    <name>!"* runs in the ticker within seconds; arriving by the Saxonberg card's link, *"straight
    from the stream"*.
15. `instant` · player — the Saxonberg card shows the running build's date and age, matching the
    deployed commit.
16. `instant` · player — type `smelt` with the overlay up → the screen guide says so and lights
    the command line; the next *what can you do here?* turn is about smelting; the overlay never
    sees the command's arguments.

### Soak drive

None — nothing here depends on game time.

## Acceptance criteria

- A streamer can run a whole show — start, live, away for a reason, back, the agenda, the end —
  from commands, a popped-out card or the Stream Deck.
- A server restart leaves every overlay where it was.
- Two streamers stream at once and neither's overlay moves the other's.
- On air, the streamer's private messages never appear on the broadcast, and away for privacy
  shows neither the desktop, the camera nor the microphone, nor any timer.
- Players in a broadcast room can see that it is being broadcast.
- The overlay frames the desktop with the sidebar and a rotating lower third, and its panels,
  reasons and scene rules change without code.
- Chat from both platforms appears as one stream in the sidebar.

## Cross-references

- [broadcast-ready-slate](../slates/builds/broadcast-ready-slate.md) ·
  [broadcast-patronage-track](../tracks/broadcast-patronage-track.md) ·
  [streamer-registry-slate](../slates/builds/streamer-registry-slate.md) ·
  [giving-slate](../slates/builds/giving-slate.md) ·
  [card-sizes-slate](../slates/builds/card-sizes-slate.md) ·
  [gitlab-and-discord-slate](../slates/builds/gitlab-and-discord-slate.md)
- [livestream.md](../subsystems/livestream.md) · [streaming.md](../subsystems/streaming.md) ·
  [card-ux-brief](../card-ux-brief.md)
- `packages/rodney/docs/obs-setup.md` (on `build/rodney`)
