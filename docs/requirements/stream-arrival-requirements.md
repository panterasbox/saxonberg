# Stream arrival — requirements

**Kind:** client
**Leads from:** kernel is a thin slice (show settings, a watch-on-entry intent, aspiration's
removal); the client leads.

A viewer watching the show on Twitch, YouTube or Kick clicks our link and **never has to stop
watching** to become a player. The front page plays the show on the carrier they came from; signing
in costs the video a second or two (the provider's page and back), and it resumes by itself on the
same stream; the video docks in a corner through character select and character creation; and they
enter the lounge in watch mode, on their own phone, the same video still playing. Along the way: the new front page (its client half), sign-in
retouched for this path, and **aspiration removed from character creation entirely** (lineage will
bring real origins later). Seeding slates: [watch-slate](../slates/client/watch-slate.md) § 3–4
(the funnel), [front-page-slate](../slates/client/front-page-slate.md) § 4, 4a, 4d, 5 (the page),
[deep-links-slate](../slates/client/deep-links-slate.md) (origin, never a command),
[modes-slate](../slates/client/modes-slate.md) § 3 (watch is the queue's second mode; the deadline is
the Twitch launch after New Year).

## What already exists

- **Watching:** `watch` (one video) and `tune` (chats) over all three carriers; one sandboxed player
  that plays Twitch, YouTube and Kick; watch mode with its viewer layout; a Watch entry on the rail
  and the phone's tabs. The video exists **only inside watch mode, after sign-in**.
- **Sign-in:** Google, Twitch and Kick, co-equal; linking a second provider to an account; YouTube
  is reached through Google (a YouTube account is a Google account). Every sign-in **leaves the page
  and returns to the bare front page** — nothing the visitor meant survives it.
- **The guest:** one button, an unsaved throwaway character in the lounge.
- **Where you came from:** a `from=stream` tag survives sign-in and reaches the server, where its one
  use is the stream ticker's *straight from the stream* line. **Nothing says which carrier or which
  stream.**
- **The front page:** today's start screen — seal, sign-in, the three chambers, the press room, the
  live count. No video, no stream state.
- **Character select:** two cards; *Enter* plays the character.
- **Character creation:** one page drawn from whatever the server asks — species, sex (some
  species), pronouns, name, **aspiration** — then *confirm*. Aspiration supplies a new character's
  **only clothes** (a themed outfit), their **starter bio** and their **chronicle prologue**, and is
  printed on the profile (*Aspires: …*); guests get a random one.
- **Arrival:** every new character gets a bound phone in a pocket and lands in the lounge in
  **explore**; a returning character lands in its last mode.
- **The show's state:** the founder's on-air phases, the three transports, the live count.

Therefore what is genuinely new here is: **the origin with a carrier**, **a video that lives outside
watch mode and survives every step of the funnel**, **a return to what the visitor meant after
sign-in, the video resuming by itself**, **entering in watch when you were watching**, **the front page's
client rebuild over the sources that exist**, and **character creation without aspiration**. The
reuse ledger the plan must account for is in
[watch-slate § Reuse ledger for the plan](../slates/client/watch-slate.md).

## Goals

- A visitor who arrives from a carrier sees the show **playing** on the front page, on that carrier,
  the moment the page loads — or, when the show is offline, its offline tile.
- Signing in costs the video only the trip to the provider and back: when the visitor returns,
  signed in, the same stream on the same carrier is already playing again, with no click.
- The video stays playing, docked in a corner, through character select and character creation.
- Entering the game while the video plays puts the character in the lounge **in watch mode**,
  watching the same stream on the same carrier on their phone, **without the video restarting**.
- The front page shows the new design with every band that has a real source, ordered by the
  visitor's origin; every band without a source is absent.
- Character creation asks for species, sex (where the species has one), pronouns and name — nothing
  else — and every new character arrives dressed in one plain everyday outfit.

## Non-goals

- **The front page's server half** — the demand digest, the books and Fund's goals, the Saxonberg
  Post as an organization, the hiring rows and appointment openings, the calendar, the public
  `/compact/executive` → **the front-page build** (front-page-slate § 6, items 2–8 and 10).
- **Watch mode itself** — the four video sizes, the watch card, the second terminal, the show's own
  chat as a subject, combined chat, the agenda state machine, the standby summary → **the watch
  build** (watch-slate § 5–7a).
- **Our chat on the stream overlay** (launch-blocking) → Rodney / the broadcast slate, not client
  work.
- **The streamer registry** (any streamer's link) — the page knows only the founder's show here →
  [streamer-registry-slate](../slates/platform/streamer-registry-slate.md).
- **The intent route** (`/go/watch/<streamer>`), the confirm card, link previews → the deep-links
  build (deep-links-slate § 1–4); this build carries the origin only, never an intent naming a
  command.
- **A quick path through character creation** — the one page without aspiration is short enough
  (owner) → nowhere, deliberately.
- **Origins, households and a richer creation** → the [lineage-slate](../slates/society/lineage-slate.md),
  which replaces the plain outfit, the empty bio and the missing prologue.
- **Linking the other two carriers** to an account (offered later, never required) → the watch
  build.
- **The lounge's screens** showing the show → open, their own design (watch-slate § 3).

## Placement

The **client** owns almost all of it: the front page, the player that survives the funnel, the
resume after sign-in, the docked video, character select, character creation's page. The **platform**
owns a thin slice: which channels are the show on each carrier (settings), the follow-up that a
character entering while watching enters in watch, sign-in's return to the page that asked for it,
and aspiration's removal from character creation, the profile and the guest. No pack, no new
content beyond the plain starter outfit. A second streamer needs the registry, not code here.

## Collisions

- **The front-page slate § 3 and § 8** (*no playable stream on the page — it removes the reason to
  sign in*) — **superseded by the owner, 2026-11-23**: the show plays on the page for a visitor who
  came from a carrier. The reason it was set aside is answered by the funnel itself: the video keeps
  playing *into* the game, which a carrier cannot do. An untagged visitor still sees the thumbnail
  tile. Record it in that slate.
- **The deep-links slate § 2** (the guest as an advertised choice) — already superseded by
  watch-slate § 4; the page's guest entry is a plain small link.
- **The watch slate § 3 step 5** (*the video never stops*, LEAN) — decided here, with one honest
  gap: the sign-in trip to the provider, after which it resumes by itself.
- **The start screen and character select** — rebuilt or retouched; their honest-state rules stay
  (co-equal providers with no origin, the live count as a number, a real zero or nothing, the press
  room never awaited by sign-in).
- **Aspiration's consumers** — the profile's *Aspires:* line, `score`'s help, the chronicle
  prologue, the guest's random outfit and bio, the starter outfit, the wiki and help text. All go
  or are replaced; the respiration condition named *aspiration* (water in the lungs) is unrelated
  and untouched.
- **The `from=stream` tag** and the ticker's *straight from the stream* line — the tag gains the
  carrier (`from=twitch|youtube|kick`); the ticker keeps its line for any carrier.
- **Watch mode's viewer layout** — the arrival lands in it as built today.
- **The lounge** — the arrival room is unchanged (the warren's host, now the grid's origin).

## Surface decisions

### The origin — a carrier, known three ways **[front-page-slate § 4a]**
A link we post carries `from=twitch`, `from=youtube` or `from=kick`; an untagged link is read from
the referring site (`twitch.tv`, `youtube.com`, `kick.com`); the visitor's last sign-in method,
remembered in their own browser, is the third. ⚠ **Only the first two mean *came from a stream*** —
they start the video; the third only orders the sign-in buttons (a preference, not an arrival).
Nobody else's session is read.

### The video on the front page **[owner, 2026-11-23]**
Plays **only for a visitor with an origin**, on that carrier, the founder's show; no origin → the
show tile as a thumbnail with its *sign in to watch inside Saxonberg* line. Offline → no video, the
offline tile (the glowing `@`, the next show). It starts **muted** (browsers refuse sound before a
click) with a plain unmute; the first click anywhere on the page may carry sound. Which channel is
the show on each carrier is a setting per carrier.

### Sign-in, and the video resuming **[owner, 2026-11-23]**
Sign-in works as it does today: the tab goes to the provider's page and comes back (a second or two
when the visitor is already signed in there and has approved us before). The video stops for that
trip and **starts again by itself** when they return, on the same stream and carrier, docked — no
click. The visitor returns to what they were doing, never to a bare front page. A separate sign-in
window that kept the page alive was considered and **rejected** (owner): a second window is worse
than losing the video for two seconds.

### The docked video **[watch-slate § 3]**
After sign-in the video moves to a corner and keeps playing through character select and character
creation, which stay outside the fiction. The viewer can close it; closed, it stays closed for the
visit, and they enter in their usual mode.

### Entering while watching **[owner, 2026-11-23]**
A character — new or returning — entered **while the video is playing** arrives in watch mode,
watching the same stream on the same carrier on their phone, the video not restarting. Not playing
(offline, closed, never started) → the usual mode (explore for a new character). The lounge's
screens are not used (watch-slate § 3).

### The front page **[front-page-slate § 4, 4a, 4d, 5; owner: real bands only]**
Rebuilt to the new design with the bands whose sources exist now: the host bar, identity, the three
chambers' sentences (their *WANTED · FUNDING NOW · NEEDS* lines are absent — no source yet), sign-in
(the three providers, ordered by origin with *You came from Twitch.* / *You came from YouTube — sign
in with the Google account you watch on.*; neutral order with no signal), the show (the video or its
tile, the founder's avatar, the show title, *Bobalu Smallberries*), Latest (the press room's
headlines), the footer. **Coming up** shows the next show from its setting; elections join it with
the front-page build. Phone order: sign-in, the show, the chambers, Latest.

### The guest **[watch-slate § 4; owner]**
Supported, never promoted: a plain small link under the sign-in buttons — *Look around as a guest* —
and the line *A guest keeps nothing, and nobody can find them.* Never in the show tile.

### Character creation without aspiration **[owner, 2026-11-23]**
The page asks for species, sex (where the species has one), pronouns and name. Aspiration is gone
from creation, the character, the profile, help and the wiki. A new character — and a guest —
arrives in **one plain everyday outfit**; the bio starts **empty** (the player writes it); there is
**no chronicle prologue** until lineage supplies origins. No quick path (owner): the page is short.

## Lens pass

1. **Pedagogy** — none directly; the funnel's job is to get a learner to the door. The watch build's
   agenda machine is where watching teaches.
2. **Creative expression** — a streamer's link is the ordinary case; a second streamer waits on the
   registry, not on code here.
3. **Immersion / participation** — the page and character creation stay outside the fiction; the
   first in-fiction moment is watching on *your own phone* in the lounge, never a bodiless spectator.
   Participation: the viewer becomes a character without a gap in what they came for.
4. **Values** — no command in a link; nobody else's session read; the origin orders the buttons by
   the visitor's choice, not ours; guests supported, not promoted; the video muted until they ask.
5. **Continuity** — the same origin and resume-after-sign-in serve the web today and a desktop client later.
6. **Economy** — the funnel is the platform's acquisition; it produces signed-in, platform-linked
   players (the owner's ask: *tied to whatever platform they're watching me on*).
7. **Governance** — none; no person is judged.

## The drive

All steps are `instant` (no game clock); assertions are `player` unless marked `staged`. This build
is client-led, so the drive is a **browser walk** with a wire step for the server slice.

### Blocking drive

1. **A tagged visitor** opens the front page with `from=twitch` while the show is live
   (`staged`: the show marked live, its channel set). The show plays, muted, on Twitch; *You came
   from Twitch.*; Twitch is first among the providers. `instant`
2. **Unmute** — the video has sound. `instant`
3. **An untagged visitor** (no `from`, no referrer) sees the show tile as a thumbnail, no video, the
   providers in the neutral order, and the guest as a plain small link. `instant`
4. **Offline** (`staged`): the tagged visitor sees the offline tile, no video. `instant`
5. **Sign in with Twitch** (`staged`: the test sign-in standing in for the provider): the visitor
   comes back signed in, and the show is already playing again — docked, on Twitch, the same
   channel — with no click. `instant`
6. **Character creation**, video docked in a corner and still advancing: species, sex where offered,
   pronouns, name — **no aspiration anywhere on the page**; confirm. `instant`
7. **The lounge** — the new character arrives **in watch mode**, the same stream on the same carrier,
   the video not restarted; their phone is in their pocket; they are dressed in the plain outfit;
   `profile` shows no aspiration; their chronicle has no prologue. `look` in the lounge in its own
   light. `instant`
8. **Close the video**, sign out, sign back in with the video closed: the returning character enters
   in its usual mode, not watch. `instant`
9. **A returning player from a stream** (`from=youtube`): the YouTube player plays; *sign in with
    the Google account you watch on*; character select keeps the video docked; *Enter* → watch mode,
    YouTube, not restarted. `instant`
10. **A guest** through the small link arrives dressed in the plain outfit, with no aspiration. `instant`
11. **Restart** the world: the character from step 7 comes back with its outfit, empty bio and no
    aspiration; entering with no video lands in its last mode. `staged`
12. **A phone-width screen**: the page orders sign-in, the show, the chambers, Latest; the docked
    video stays visible through creation. `instant`

### Soak drive

None — every step is `instant`.

## Acceptance criteria

- A visitor arriving from Twitch, YouTube or Kick sees the show playing on that carrier on the front
  page while it is live, and its offline tile when it is not.
- A visitor with no origin sees no playing video and the providers in the neutral order.
- After signing in, the visitor is back where they were and the same stream is playing again on the
  same carrier, without a click.
- The video plays in a corner through character select and character creation.
- A character entered while the video plays is in the lounge in watch mode on the same stream and
  carrier, and the video did not restart; one entered without it is in its usual mode.
- Nowhere in character creation, a character's profile, help or the wiki does *aspiration* appear;
  every new character and every guest is dressed in the plain outfit.
- The front page shows only bands with real content; none says *coming soon*.
- After a restart, characters made in this build keep their outfit and have no aspiration.

## Cross-references

- [watch-slate](../slates/client/watch-slate.md) — the funnel, guests, the reuse ledger
- [front-page-slate](../slates/client/front-page-slate.md) — the page, the origin (§ 4a)
- [deep-links-slate](../slates/client/deep-links-slate.md) — origin, never a command
- [modes-slate](../slates/client/modes-slate.md) — the queue and the design language
- [lineage-slate](../slates/society/lineage-slate.md) — where origins go next
- [client-shell.md](../subsystems/client-shell.md), [char-gen.md](../subsystems/char-gen.md),
  [streaming.md](../subsystems/streaming.md), [cockpit.md](../subsystems/cockpit.md),
  [aether-devices.md](../subsystems/aether-devices.md)
