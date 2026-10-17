# Broadcast-ready slate — what it takes to go live every week

> **Status: UNBUILT** — the overlay feed and its `stream away` /
> `stream back` countdown shipped (Phase 1), plus relay chat on the
> feed →
> [livestream.md](../../subsystems/livestream.md),
> [streaming.md](../../subsystems/streaming.md)
> **Left:** the stream's phases (offline · starting · live · standby ·
> ending) and standby *reasons* as rows · stream state that survives a
> restart and fails closed · the segment lower third · the streamer
> controls in the client (a corner the camera covers) · redaction while
> on air · tab-away reported · the streamer's client facts on the feed ·
> the overlay's scenes, layers and scene rules · OBS scene switching ·
> the Stream Deck: Elgato's OBS plugin for the hard cuts, pblive revived
> for game commands behind a scoped control credential
> **Size:** a build — one build across three repos (`saxonberg`,
> `pbox-stream`, `pblive`), so three MRs that land together

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
Phase 3 (this build is it), and `pbox-stream`'s `PLAN.md` §2 (the two
frames) and §8 Phase 3 (the control plane).

---

## What exists

| piece | state |
|---|---|
| `StreamState` (`/platform/idea/StreamState`) | `mode: live\|standby`, `awayUntil`. **In memory** — a restart resets to `live` |
| `stream away <dur>` / `stream back` | the whole control plane; gated `requiresStreamer` |
| the `?broadcast=<token>` feed | pushes `stream-state`; forwards the owner's Twitch/YouTube chat as `relay-chat` |
| `pbox-stream` | ONE scene, Standby: the monastery, the banner, the countdown. Reads `stream-state`; **ignores `relay-chat`**; no OBS link |
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
- **The streamer is whoever started it.** `StreamState` records the
  starter's identity path (`getIdentityPath()`, never the template
  path), and every client fact below is read off *that* player's
  client. One streamer at a time is the honest scope until the registry
  build; a second `stream start` by someone else is refused, naming who
  is live.

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

- **StreamState persists** through the self-persistence spine (a
  singleton capture, no new collection). A restart restores the phase,
  the reason and the timers.
- **The overlay holds its last scene when the feed drops.** It never
  falls back to *live* on its own; reconnecting delivers the current
  snapshot, which is now the durable one.
- **The Elgato hard cut is the floor** (below): when the server is down
  entirely, a Stream Deck button still kills the desktop capture,
  because it talks to OBS and nothing else.

---

## The client

### The streamer corner

While the streamer is broadcasting (phase ≠ `offline`), their client
reserves **one fixed block, bottom-right, on every layout**, and the
streamer controls live in it: the phase, a reason picker, the timer,
*Back*, the segment field. Every control sends its `stream` command (and
previews it on hover, like every clickable). The overlay puts the camera
over that block, so **the streamer sees their controls and the viewers
see the streamer's face** — the part of the screen nobody else needed.

- The block is fixed for now because OBS must know where it is.
  [card-sizes](card-sizes-slate.md) turns it into an arrangement region
  the feed reports, at which point moving it is a saved arrangement
  rather than an OBS edit.
- `StreamerDeck`'s dead chips go: the ones whose verbs ship here are
  wired into the corner, the rest (moderation, rewards, penalties) are
  deleted rather than left dimmed, because no slate builds them.

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

### Tab-away

`visibilitychange` → the client reports *hidden* / *visible* on the bus
(streamer's client only, phase ≠ `offline`). It says *hidden*, never what
is showing instead. That is the whole of the browsing story: the web is
a browser tab, and the overlay changes scene around it
([card-sizes](card-sizes-slate.md) § the web as content).

---

## The feed — what crosses to the overlay

Every field is an allowlist entry on the default-deny projection, added
on purpose:

| field | why the overlay needs it |
|---|---|
| `phase`, `reason` (label, copy, privacy, scene), `awayUntil`, `startsAt` | the scene and its text |
| `segment` | the lower third |
| `client.mode`, `client.arrangement` | which client layout is on air → layer rules |
| `client.chatInView` | whether the streamer's visible terminal carries `speech.relay` — if not, the overlay shows chat |
| `client.hidden` | the browsing scene |
| `relay-chat` (shipped) | the chat overlay |

Not on it: anything about any player but the streamer, the streamer's
private frames, card contents. `client.focal` joins when card-sizes
ships.

---

## The overlay (`pbox-stream`)

### Scenes

Built in the existing brand system (the monastery, the banner, the
serif voice):

- **Starting Soon** — the countdown to `startsAt`, the week's segment
  list if set.
- **Live** — the client capture full screen, with layers on it: the
  camera framed over the streamer corner, the chat lower third
  (`relay-chat`, already on the wire), the segment lower third.
- **Browsing** — the window capture framed rather than full, camera and
  chat laid out by the overlay.
- **Standby** — the shipped scene, now with the reason's copy; privacy
  shows no countdown.
- **Ending** — the outro.

### ⭐ The rules are data

A small table in the overlay maps the feed to a scene and its layers:
*phase standby → Standby*; *live ∧ hidden → Browsing*; *live ∧
¬chatInView → chat layer on*; *reason.scene set → that scene*. The game
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

## The drive

The exit criterion, run against the real stack with OBS open:

1. `stream start in 2m` → Starting Soon counts down; `stream live` → the
   client is on air with the camera over the corner.
2. A tell arrives → it reads *[private message]* on air.
3. `stream away bathroom` from the corner → Standby, 5:00 counting.
4. `stream away privacy` from the Stream Deck (pblive) → Standby, no
   timer; the tell now reads in full on the streamer's screen.
5. **Restart the server** → the overlay still shows the privacy
   standby; after reconnect it still does.
6. `stream back` → live. Switch tabs → Browsing; switch back → Live.
7. Toggle the terminal's relay-chat filter off → the chat layer appears.
8. Elgato privacy button with the server stopped → the desktop leaves
   the stream.
9. `stream end` → Ending → offline; redaction is off.

## Lens pass

1. **Pedagogy** — none; this is the platform's own marketing surface.
2. **Creative expression** — reasons as rows and the rules as a table:
   the show's behaviour is authored, not coded.
3. **Immersion / participation** — interface tier, outside the fiction
   entirely; it may never gate on anything in-world.
4. **Values** ⭐ — decides redaction (*the people in your tells did not
   consent to an audience*), the timerless privacy standby, and fail
   closed over fail open.
5. **Continuity** — `stream away 15m` still means what it meant.
6. **Economy** — none.
7. **Governance** — the streamer axis and the scoped control token; no
   person is judged.

## Non-goals

- **Per-streamer state, the registry, other people's overlays** —
  [streamer-registry-slate](streamer-registry-slate.md). One streamer.
- **Card sizes, the arrangement region for the camera, focal facts** —
  [card-sizes-slate](card-sizes-slate.md).
- **Alerts** (follows, subs, bits) — the track's Phase 4 payment intake.
- **The World Ticker and the Agent Board** — `pbox-stream` Phase 4.
- **Viewer interactivity / the HUD** — `pbox-stream` Phases 6–7.
- **Moderation, rewards, penalties** on the deck — no slate builds the
  verbs.

## Open questions

1. **The segment list** — just a current segment, or a rundown set
   before the show (`stream rundown …`) that Starting Soon displays and
   `stream next` steps through?
2. **`ending` → `offline`** — on a timer, or only by `stream off`?
3. **Twitch, YouTube, or both** — `pbox-stream`'s open decision; relay
   chat already reads both, so it only affects which platform the
   overlay brands.
4. **Private channels** — confirm what the server stamps on a private
   channel's frames before trusting redaction with them.
