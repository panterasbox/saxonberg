# Studio slate — the stream is a place, and the show is the demo

> **Status: UNBUILT** — relay chat in both directions, the overlay feed,
> the anonymous guest path, Twitch and Kick login with account linking,
> forums, reactions, the calendar, press releases, screens and the
> Compact's tallies all shipped; broadcast-ready and card-sizes are
> slated → [livestream.md](../../subsystems/livestream.md),
> [streaming.md](../../subsystems/streaming.md),
> [client-shell.md](../../subsystems/client-shell.md) § Anonymous guest
> **Left:** the studio as a location with a screen showing the stream ·
> `!join` from chat to the audience in seconds · the chat command path
> (`!ask` `!vote` `!submit` `!join`) for viewers who never sign in · the
> docket (topics proposed and voted, and the backlog as a docket) ·
> highlighted questions · polls tallied across chat and the world · the
> media queue (react content on the studio screen) · receipts (a doc on
> stage) · the debate floor (speaker queue, timed turns, a moderator
> seat) · VOD chapters from segments · the weekly recap as a press
> release · the stream on the calendar · the herald NPC · one emote
> burst from chat and `react` · raids that walk an audience into another
> studio
> **Size:** a build

**Captured 2026-10-17.** The founder asked what else a stream should do,
modelled on mid-to-large political *just chatting* streams — the docket,
react content, call-ins and debates, highlighted questions, polls —
with software and game development as the topic. The answer turned out
to be one idea: **the stream is a place in the world**, and every staple
of the format is something that place can host. Because the reason for
the stream is to demo the platform, *the more the place does, the better
the show*.

⭐⭐ **These pieces are designed to complement each other**, and the
spine they share is a ladder from watching to playing:

> watch the stream → talk in chat → `!join` → standing in the studio as
> a guest → give, and sign in to have it count → playing, while still
> watching

The giving rung is [giving-slate](giving-slate.md). The watching rung
is [broadcast-ready](broadcast-ready-slate.md). The client that lets you
play while you watch is [card-sizes](card-sizes-slate.md). This slate
is the rungs in between.

Related: the [broadcast-patronage track](../../tracks/broadcast-patronage-track.md)
(the destination), `pbox-stream`'s `PLAN.md` §2 (the two frames — the
studio is the Show frame's *The World* scene made literal) and §7
(viewer interactivity, Phase 7 inbound viewer commands — the chat
command path below is that phase), [display.md](../../subsystems/display.md),
[forums.md](../../subsystems/forums.md), [press.md](../../subsystems/press.md),
[calendar.md](../../subsystems/calendar.md),
[reactions.md](../../subsystems/reactions.md),
[governance.md](../../subsystems/governance.md),
[streamer-registry-slate.md](streamer-registry-slate.md) (several
studios need several streamers).

---

## ⭐⭐⭐ The studio is a place

The streamer's set is a **location** in Saxonberg — a room with a stage,
an audience floor and a screen. While the streamer is live, the screen
shows their stream. Viewers who come in stand in the audience; their
presence lines are part of the room the stream shows.

- *"You're not watching a stream about the platform, you're standing in
  it"* — the strongest demo the platform can give, and it costs a row.
- Everything else in this slate hangs off it: the docket on the wall,
  the debate floor on the stage, the herald at the door, the raid's
  destination.
- **A studio is a place a streamer owns** — rows and a parcel, not a
  feature. A second streamer's studio is a second set of rows
  ([trade is mechanism, locality is expression](../../design-lenses.md)).
- **The screen shows the stream through the ordinary screen rules**:
  watching it is joining it, and only the studio's driver changes it
  (card-sizes § watching is not tuning).
- The on-air marker from broadcast-ready is the room's honest notice
  that anyone standing in it is on the broadcast.

## ⭐⭐ From chat to the studio in ten seconds

`!join` in Twitch or YouTube chat answers with a link. The link opens
the client on the **anonymous guest path that already exists** and
lands the guest in the studio's audience — no sign-in, no character
creation, no tutorial between the click and the room.

- A guest persists nothing and the front door says so; that does not
  change. What changes is that a guest has a **reason to sign in**:
  giving that counts, a docket vote that sticks, a character that keeps
  its name. Twitch login is one click and already exists.
- ⚠ **The front door's honesty rule binds here.** Nothing on the join
  path may imply the guest's session carries over. The conversion is an
  offer, never an implication.
- Merge-on-login (a guest becomes the character they sign in as, the
  client-shell slate's Q8) would make the ladder seamless. It is wanted,
  and it is that slate's.

## ⭐⭐ The chat command path — for the viewers who never join

Most viewers will never click through. Anything interactive needs a chat
form or it is built for the few: `!ask`, `!vote`, `!submit`, `!join`,
read off the relay chat the platform already ingests. A chat command
lands in the same place its in-game form does — one tally, one queue —
and is attributed to the chat handle, which later attaches to a
character when the viewer links that account.

⚠ **This is a WRITE from outside the session**, the same shape as
pblive's control token: scoped to a closed set of audience acts,
rate-limited per handle, and never able to do anything a guest
could not.

---

## The staples

### The docket

A board in the studio: topics proposed, voted, and worked through on
stream. ⭐ **For this stream the docket is the backlog** — viewers
propose and vote on what gets designed next, and the winner gets slated
on stream. That is *players are the game developers* as a show format,
and it is the political streamer's structure with software as the topic.

- Proposals and votes come from the world and from chat (`!submit`,
  `!vote`).
- The docket is a forum board with an ordering — the forum's ordered
  organizer, not a new store.
- ⚠ **A docket vote is advice, not governance.** It orders a streamer's
  rundown; it binds nothing. The Compact's tallies are reused for the
  counting, and none of its authority comes with them.

### Highlighted questions

A moderator (or the streamer) promotes a message — from Twitch, YouTube
or the world — to a **question card** on stage and on the overlay. The
card names who asked, with the platform glyph relay chat already shows.

### Polls

One poll, voted by playing in the studio *or* by `!vote` in chat, one
tally, results on the overlay. Lurkers and players in the same count.

### The media queue

Viewers `!submit` a link (or `submit` in-game); a moderator approves;
the streamer plays picks **on the studio screen**, with the audience in
the room watching together. Web pages are browser tabs and the browsing
scene ([card-sizes](card-sizes-slate.md) § the web as content); videos
play on the screen.

### Receipts

`show <doc>` puts a design doc, slate, wiki page or help topic **on
stage** as a focal card, and on the studio screen. For a development
stream, pulling up the receipts *is* the content — and every doc shown
is the public docs projection, so nothing private comes with it.

### The debate floor

Call-ins and debates are the political format's big set piece. In the
studio: a **speaker queue**, **timed turns** with a timer on the
overlay, and a **moderator seat** that recognises the next speaker,
extends a turn, or cuts one. Guests speak in-world; a guest with a
camera joins the OBS scene through whatever the streamer already uses
(VDO.Ninja, Discord) — the platform does not carry video.

⭐ For a civics platform this is a **demo of governance**, not a
gimmick: the moderator seat is an Office seat, recognition is a
procedure, and the timer is the scheduler. A debate on stream is the
same machinery a council meeting will use.

### VOD chapters

`stream segment` already timestamps the show. At `stream end`, the
segment list becomes **YouTube chapter text** (`00:00 Intro`,
`12:31 Dairy shipped`, …) ready to paste into the VOD description.
Nearly free, and it saves editing time every week.

### The weekly recap

The week's merged MRs, pulled and summarised into a **press release**
in-game — the Starting Soon rundown, the show notes and the news ticker
in one artifact, through the press subsystem that already publishes
releases.

### The stream on the calendar

The weekly stream is a **calendar event** players subscribe to; ten
minutes before, their device says so. A demo of the calendar app riding
the aether, and the go-live notification without a third-party bot.

### The herald

An NPC at the studio door who **reads alerts aloud in the world** —
follows, subs, gifts and the givers [giving-slate](giving-slate.md)
records. The alert happens in the room as well as on the overlay.

### One emote burst

In-game `react` and chat emotes combine into one burst on the overlay;
the reaction-delta seam already rides the feed.

### Raids

At the end of a stream the streamer raids another streamer — and with
several studios on one server, **the raid walks the audience into the
other studio**. The audience that was standing in one room is standing
in the next. Waits on a second streamer, and costs nothing to design
for now.

---

## Lens pass

1. **Pedagogy** ⭐ — the debate floor and the docket teach procedure by
   doing it: recognition, timed turns, agenda-setting, a tally anyone
   can audit.
2. **Creative expression** — a studio is rows a streamer authors; a
   second studio is somebody else's expression on the same mechanism.
3. **Immersion / participation** — the audience is *in* the world; the
   studio has a streamer-shaped hole that any streamer fills.
4. **Values** — bystanders are told (the on-air marker); a docket vote
   is honestly advice; the join path never implies a guest keeps
   anything.
5. **Continuity** — none special.
6. **Economy** — giving is its own slate; nothing here moves money.
7. **Governance** — the moderator seat judges speakers: the criterion
   is the floor's posted rules, the appeal is the streamer, and the
   entrenchment is tier C (the streamer's own house rules).

## Non-goals

- **Money** — [giving-slate](giving-slate.md).
- **Carrying video or voice** — guests' cameras ride the streamer's own
  tools.
- **Binding votes** — the docket is advice; the Compact is elsewhere.
- **Native Twitch polls and predictions** — the outbound platform-action
  family is the registry slate's deferral.
- **The Agent Board and World Ticker** — `pbox-stream` Phase 4.

## Open questions

1. **Which studio** — a new location for the founder's set, or the
   lounge re-dressed (it already has screens and a social purpose)?
2. **Moderators** — a studio seat (Office), the Twitch mod list mirrored,
   or both?
3. **Docket → slate** — does a winning docket topic open anything
   (a slate stub, an issue), or is the streamer writing it on stream the
   whole act?
4. **Chapters out** — printed to the streamer at `stream end`, or
   posted to the YouTube video through the API (an outbound action, so
   the registry's)?
