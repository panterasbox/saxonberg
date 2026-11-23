# Stream arrival — requirements

**Kind:** feature (three stages)
**Leads from:** kernel in Stage A (the program — first consumer: Stage B of this build, the arrival
and the front page) and Stage C (an app that brings its verbs — first consumer: the broadcast app and
the booth's desk, in this build); the client leads Stage B.

⭐ **Nobody is *the* streamer** (owner, 2026-11-23; watch-slate § 1). Today the founder is the only
broadcaster, with a weekly show — but who broadcasts, how many, and on what schedule can all change.
And a carrier livestream is only a medium: *"we're specifically growing our own discovery and
everything else and just using the video player"* (owner). So the unit is the **program**, by
[broadcasting-slate § 7](../slates/trades/broadcasting-slate.md)'s definition — *delivering a program
to an audience: one source, many receivers, on a schedule*. **Stage A** builds the program (owned by a
person or an organization; its video feeds optional and proven) and retires the four environment
variables that hardwire one streamer; **Stage B** is the arrival, reading programs. The front page
*features* one program by a setting — the founder's show today, changed without code.

**Stage C** puts the broadcaster's verbs in **instruments** (owner, 2026-11-23): *"I'd prefer it if
these verb affordances came from tools we use at the studio, but … I need portable versions of these
instruments because I may need to leave the studio mid stream … probably just through an app on my
phone … but then we can have bench instruments too at the station."* So: a **broadcast app** on the
phone, and the **broadcast desk** in Hallett's front-window booth, both affording the same verbs; the
body no longer carries them.

⚠ **This is the minimum to start the founder's livestream, not broadcasting.** Broadcasting as a whole
— its economics, a full lens pass, what a broadcaster *is* across press conferences, a hunting party's
stream and broadcasts with no video at all — is its own build (owner, 2026-11-23;
[broadcasting-slate](../slates/trades/broadcasting-slate.md)).

A viewer watching a program on Twitch, YouTube or Kick clicks its link and **never has to stop
watching** to become a player. The front page plays the program's feed on the carrier they came from; signing
in costs the video a second or two (the provider's page and back), and it resumes by itself on the
same stream; the video docks in a corner through character select and character creation; and they
enter the lounge in watch mode, on their own phone, the same video still playing. Along the way: the new front page (its client half), sign-in
retouched for this path, and **aspiration removed from character creation entirely** (lineage will
bring real origins later). Seeding slates: the
[streamer-registry-slate](../slates/platform/streamer-registry-slate.md) (the record, claim-by-proof,
retiring the singleton), [broadcasting-slate](../slates/trades/broadcasting-slate.md) § 7 (the
definition), [watch-slate](../slates/client/watch-slate.md) § 1, 3–4
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
- **Streamers:** nothing about a streamer is stored. `watch` resolves a channel lazily and keeps
  nothing; the broadcaster side is hardwired to one person by four environment variables (the
  overlay's three channels and the streamer account list). The OAuth links that make claim-by-proof
  possible already ship (a Twitch login, a Kick slug); a "connect YouTube" consent that grants read
  access to the user's YouTube account ships too.

Therefore what is genuinely new here is: **the program as a record, with feeds proven at attach**, **a
featured program instead of a hardwired streamer**, **the origin with a carrier and a program**, **a video that lives outside
watch mode and survives every step of the funnel**, **a return to what the visitor meant after
sign-in, the video resuming by itself**, **entering in watch when you were watching**, **the front page's
client rebuild over the sources that exist**, and **character creation without aspiration**. The
reuse ledger the plan must account for is in
[watch-slate § Reuse ledger for the plan](../slates/client/watch-slate.md).

## Goals

- **Any player or organization can run a program**: a title, a short name (what a link names), a
  schedule, an agenda — under its owner's pen. A program may have **video feeds** on Twitch, YouTube
  or Kick; attaching one requires owning that channel (signed in or linked with it, or YouTube
  connected) — no approval, no admin. A program with no feed is still a program.
- **Nothing hardwires one streamer**: the overlay, the front page and the arrival read programs; the
  environment variables that named the founder are gone.
- The front page features **one program chosen by a setting** (the founder's show today), live or
  offline.
- A visitor who arrives from a carrier sees the program their link names (or the featured program,
  when it names none) **playing** on the front page, on that carrier, the moment the page loads — or,
  when it is off air, its offline tile.
- Signing in costs the video only the trip to the provider and back: when the visitor returns,
  signed in, the same stream on the same carrier is already playing again, with no click.
- The video stays playing, docked in a corner, through character select and character creation.
- Entering the game while the video plays puts the character in the lounge **in watch mode**,
  watching the same stream on the same carrier on their phone, **without the video restarting**.
- The front page shows the new design with every band that has a real source, ordered by the
  visitor's origin; every band without a source is absent.
- Character creation asks for species, sex (where the species has one), pronouns and name — nothing
  else — and every new character arrives dressed in one plain everyday outfit.
- The whole path — front page, sign-in, character select, character creation — reads as **one
  thing**: the same visual language as the new front page.

## Goals — Stage C (instruments)

- **An app can bring its verbs** to whoever carries the device it is installed on.
- **An app store**: phones install apps from one store at runtime, like a real phone (owner) — every
  published app, on every phone, existing phones included.
- **The broadcast app**: in the store; anyone installs it (`apps install broadcast`); with it, the
  bearer has `rodney` and `program`, wherever they are — they can leave the studio mid-stream. A guest
  may install it but cannot create a program (a guest keeps nothing, so a guest's program would hold
  its name forever).
- **The broadcast desk** in Hallett's front-window booth affords the same verbs to whoever is at it.
- **The body no longer carries `rodney` or `program`**: no app and no desk, no broadcasting verbs.
- **Hallett's booth** exists as a place — one room, reached from a Terminus street — and its window's
  on-air sign is lit while the program being run from there is live, dark otherwise.

## Non-goals

- **The front page's server half** — the demand digest, the books and Fund's goals, the Saxonberg
  Post as an organization, the hiring rows and appointment openings, the calendar, the public
  `/compact/executive` → **the front-page build** (front-page-slate § 6, items 2–8 and 10).
- **Watch mode itself** — the four video sizes, the watch card, the second terminal, the show's own
  chat as a subject, combined chat, the agenda state machine, the standby summary → **the watch
  build** (watch-slate § 5–7a).
- **Our chat on the stream overlay** (launch-blocking) → Rodney / the broadcast slate, not client
  work.
- ⭐ **Broadcasting** — its economics (outlets, sponsors, audience as standing), a full lens pass, the
  broadcaster as a role across institutions, broadcasts with no video, craft measured by agendas kept
  → **its own build** (owner, 2026-11-23), [broadcasting-slate](../slates/trades/broadcasting-slate.md).
- **The rest of the streamer registry** — a viewer listing someone else's channel so `watch shroud`
  works, persisted tunes, platform preference, the consenting public directory, the documented REST
  read for third-party overlays → the registry's portal build
  ([streamer-registry-slate](../slates/platform/streamer-registry-slate.md) wave 3), reframed by the
  program.
- **The rest of Hallett's** — the Dial as a street, the lease from the Halletts, June's piano and the
  window as a stage, the screen in the glass, the photographs, the record library, the show as a
  business with its crew, the founder's home → **Hallett's content build**
  ([halletts-slate](../slates/world/halletts-slate.md)).
- **Other apps bringing verbs** (a map app, the camera, …) — this build makes the capability and its
  first consumer; others are their own builds.
- **Other programs on the front page** — it shows only the featured program, live or offline (owner)
  → nowhere, deliberately.
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

**Stage A — the platform.** The program is kernel substrate (true of every instance; the OAuth spine
its feed proof rides is the kernel's). A second program is a second record, never code. Which program
the front page features is an operator setting (the Compact's choice, like which publisher the page
stocks).

**Stage C — instruments.** An app bringing its verbs is kernel (true of any app on any device). The
broadcast app is a platform app row beside messages and the wallet. The booth and its desk are
**content** — a Terminus locality row set (world-seed, under Terminus), a second studio being rows.

**Stage B — the client**, over a thin platform slice: the front page, the player that survives the
funnel, the resume after sign-in, the docked video, character select, character creation's page; on
the platform, entering in watch, sign-in's return, and aspiration's removal from character creation,
the profile and the guest. No pack, no new content beyond the plain starter outfit.

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
  carrier (`from=twitch|youtube|kick`); Rodney's one on-screen link stays `from=stream` and plays
  **Twitch** (owner); the ticker keeps its line for any carrier.
- **The broadcaster side** — the overlay's chat read, `rodney token`, the on-air phases (live state on
  the body today) and the `streamers` group hang off the hardwired founder; they move onto the program
  being run. ⚠ A go-live step: the founder's show is set up as a program, with its feeds attached, on
  the live server before the overlay can read it.
- **`stream` on every body** — `stream` is afforded by the body today (every Avatar); it is renamed
  **`rodney`** (below) and moves to the app and the desk. The only current broadcaster (the founder) installs the app at go-live.
- **Hallett's** — designed, unbuilt; this build makes only its front-window booth, with the slate's
  provisional names.
- **`watch` typed by hand** stays open to any channel (deep-links § 1): only a *link's* target must be
  a program with a feed.
- **Watch mode's viewer layout** — the arrival lands in it as built today.
- **The lounge** — the arrival room is unchanged (the warren's host, now the grid's origin).

## Surface decisions

### The program **[owner, 2026-11-23; broadcasting-slate § 7]**
A program is the record: a **title**, a **short name** (what a link names), its **owner** (a player,
or an organization or office — whose pen it is under), a **schedule** (the next show, with its time
zone), and its **agenda** (the segments the stream verb already runs). A program may carry **video
feeds** — a Twitch channel, a YouTube channel, a Kick channel — or none. The owner edits it. It
replaces every environment variable that named the founder.

### A feed is proven when it is attached **[owner; streamer-registry-slate]**
Attaching a feed requires owning that channel: signed in with, or linked to, the Twitch or Kick account
whose channel it is; for YouTube, the "connect YouTube" consent that already ships (owner), which tells
us the channel. No queue, no admin, no pending state. An organization's program takes feeds from a
member who proves them. Short names are first come.

### The featured program **[owner, 2026-11-23]**
The front page features **one program, chosen by a setting** — the founder's show today. Not *the
Prime Minister's livestream* (owner: *"I dont know if that will actually hold true long term"*) — just
whatever the setting names. On air → its feed (for a visitor with an origin) or its tile; off air →
**its offline tile** (the glowing `@`, its next show). Other programs never appear on the page.

### Verbs come from instruments **[owner, 2026-11-23]**
`rodney` (driving your overlay and broadcast now) and `program` (the program as a record) are afforded by the
**broadcast app** on a phone you carry and by the **broadcast desk** while you are at it — never by the
body. The app is in the store; anyone installs it (lens 2: any broadcaster gets the same). A device
that cannot work (dead, packed, powered down by an epoch covenant) keeps its verbs and says why; when
another source — the desk — can answer, it answers (owner). The desk
grants nothing the app does not: whose program you may run or edit is decided by its owner's pen, not by
where you stand. Leaving the booth mid-stream with the phone keeps the broadcast going.

### `stream` becomes `rodney` **[owner, 2026-11-23]**
*"If any of this is married with a specific implementation in rodney then I almost want the verb to just
be 'rodney' so its clear thats what you're driving. thats why we gave it a memorable name."* Every one of
`stream`'s subcommands drives Rodney and OBS — the Starting Soon countdown, putting the desktop on air,
the standby screen and its reason, the outro, the sidebar's topic and agenda, the overlay and Stream
Deck tokens — and `stream-rotation` steers Rodney's lower third. So the verb is **`rodney`**: `rodney
start · live · away · back · end · off · segment · agenda · next · token · pin · skip · unpin` — the
lower third's rotation as three flat subcommands (`rodney pin <panel>`), never three deep (owner). `stream` stops being a verb. **`program`** stays generic and
Rodney-free — the record any broadcaster has. Whether a program is on air is still read from its run,
driven today through `rodney`; a broadcaster without Rodney going on air is the broadcasting build's.

### Hallett's booth **[owner, 2026-11-23; halletts-slate § 2]**
One room — the front-window booth at Hallett's (names provisional) — reached by a way from an existing
Terminus street near the arrival plaza (the slate's lean). It holds the broadcast desk and the window's
**on-air sign**, lit while the program run from the desk is live and dark otherwise. Its light, and the
sign's, are visited at night in the drive.

### A link names a program **[deep-links-slate § 1]**
A link carries the carrier and, optionally, a program's short name: `?from=twitch&watch=<name>`. The
named program must exist and have a feed on that carrier (else the page ignores the name — a link must
never frame an arbitrary channel inside our client); a link naming none means the featured program.
Data, never a command.

### The origin — a carrier, known three ways **[front-page-slate § 4a]**
A link we post carries `from=twitch`, `from=youtube` or `from=kick`; an untagged link is read from
the referring site (`twitch.tv`, `youtube.com`, `kick.com`); the visitor's last sign-in method,
remembered in their own browser, is the third. ⚠ **Only the first two mean *came from a stream*** —
they start the video; the third only orders the sign-in buttons (a preference, not an arrival).
Nobody else's session is read.

### The video on the front page **[owner, 2026-11-23]**
Plays **only for a visitor with an origin**, on that carrier, the program the link names (else the
featured program); no origin → that program's tile as a thumbnail with its *sign in to watch inside
Saxonberg* line. Off air → no video, its offline tile (the glowing `@`, its next show). It starts
**muted** (browsers refuse sound before a click) with a plain unmute — the unmute rebuffers the player
once (owner-accepted), and after the sign-in trip it resumes muted. Which channel to play comes from
the program's feed.

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
tile, the program's owner and avatar, its title — *Bobalu Smallberries* today), Latest (the
press room's headlines), the footer. **Coming up** shows the featured program's next show from its
record; elections join it with the front-page build. Phone order: sign-in, the show, the chambers, Latest.

### One visual language, front page to lounge **[owner, 2026-11-23]**
Character select and character creation are restyled into the new front page's design language —
its type, colors, bands and layout grammar ([docs/design/front-page/](../design/front-page/front-page.dc.html),
[docs/design/brand/](../design/brand/README.md)) — so the path from the page to the lounge looks like
one thing. Their behavior is unchanged beyond what this document says (the docked video, no
aspiration).

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
2. **Creative expression** — anyone runs a program and hands out its link; a second program is a
   second record, never code (lens 2 chose the program over a singleton).
3. **Immersion / participation** — the page and character creation stay outside the fiction; the
   first in-fiction moment is watching on *your own phone* in the lounge, never a bodiless spectator.
   Participation: the viewer becomes a character without a gap in what they came for.
4. **Values** — no command in a link; nobody else's session read; the origin orders the buttons by
   the visitor's choice, not ours; guests supported, not promoted; the video muted until they ask.
5. **Continuity** — the same origin and resume-after-sign-in serve the web today and a desktop client later.
6. **Economy** — the funnel is the platform's acquisition; it produces signed-in, platform-linked
   players (the owner's ask: *tied to whatever platform they're watching me on*).
7. **Governance** — a feed's proof judges nothing (an OAuth identity matches a channel). Which program
   the front page features is the Compact's setting, changed in the open. The full lens pass belongs to
   the broadcasting build.

## The drive

All steps are `instant` (no game clock); assertions are `player` unless marked `staged`. This build
is client-led, so the drive is a **browser walk** with a wire step for the server slice.

### Blocking drive

0. **A broadcaster sets up a program** — a player creates a program (title, short name, next show),
   attaches a Twitch feed while signed in with that Twitch account, a Kick feed the same way, and a
   YouTube feed after connecting YouTube; attaching a channel they do not own is refused. A second
   program with no feed exists and plays nowhere. The featured-program setting names the first.
   After a restart the program and its feeds are intact. `staged` (test sign-ins standing in for the
   providers)
1. **A tagged visitor** opens the front page with `from=twitch` while the featured program is on air
   (`staged`: its broadcaster live). The show plays, muted, on Twitch; *You came
   from Twitch.*; Twitch is first among the providers. `instant`
2. **Unmute** — the video has sound. `instant`
3. **An untagged visitor** (no `from`, no referrer) sees the show tile as a thumbnail, no video, the
   providers in the neutral order, and the guest as a plain small link. `instant`
4. **Off air** (`staged`): the tagged visitor sees the featured program's offline tile with its next
   show, no video. `instant`
4a. **A link naming a program** (`from=kick&watch=<a second program with a Kick feed>`): it plays on
   Kick; a link naming a program with no such feed, or no program, plays the featured program
   instead. `instant`
4b. **Rodney's link** (`from=stream`): the featured program plays on Twitch. `instant`
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

### Blocking drive — Stage C (instruments)

13. **No instruments**: a fresh character types `rodney` and `program` — neither is a verb they have.
    `instant` `player`
14. **The app**: `apps install broadcast` on their phone; `program create`, `program feed`, `program
    run`, `rodney live` work; they walk out of the room with the phone and `rodney away` still works.
    `instant` `player`
15. **The desk**: a character without the app walks into Hallett's booth (by its way from the street),
    `look`s at it by day and at night (the booth's light, the sign); at the desk they have `rodney` and
    `program`; running the founder's program from the desk is refused unless they hold its pen; the
    founder at the desk goes live and **the window's sign is lit**; `rodney end` → dark. `short` (the
    night look) `staged` (the founder's program set up)
16. **Restart**: the app is still installed on the phone; the program and the booth intact; the sign
    matches the program's state. `staged`

### Soak drive

None — every step is `instant`.

## Acceptance criteria

- A character with no broadcast app and not at the desk has no `rodney` or `program`; installing the
  app gives them both, wherever they go; the desk gives them both while they are at it.
- The window's sign at Hallett's booth is lit exactly while the program run from its desk is live.
- A player can run a program and attach a feed only for a channel they own, with nobody approving it;
  a program with no feed is still a program.
- No environment variable names a streamer; the overlay reads the program being run.
- The front page features the program its setting names, and changing the setting changes the page
  without code.
- A visitor arriving from Twitch, YouTube or Kick sees the program their link names — else the
  featured program — playing on that carrier while on air, and its offline tile when not.
- A link never plays a channel that is not a program's feed.
- A visitor with no origin sees no playing video and the providers in the neutral order.
- After signing in, the visitor is back where they were and the same stream is playing again on the
  same carrier, without a click.
- The video plays in a corner through character select and character creation.
- A character entered while the video plays is in the lounge in watch mode on the same stream and
  carrier, and the video did not restart; one entered without it is in its usual mode.
- Character select and character creation look like the front page — the same type, colors and
  layout grammar.
- Nowhere in character creation, a character's profile, help or the wiki does *aspiration* appear;
  every new character and every guest is dressed in the plain outfit.
- The front page shows only bands with real content; none says *coming soon*.
- After a restart, characters made in this build keep their outfit and have no aspiration.

## Cross-references

- [broadcasting-slate](../slates/trades/broadcasting-slate.md) — what broadcasting is; its own build
- [halletts-slate](../slates/world/halletts-slate.md) — the station; this build makes its booth
- [aether-devices.md](../subsystems/aether-devices.md) § Deferred seams — *an app that brings its own verb*
- [streamer-registry-slate](../slates/platform/streamer-registry-slate.md) — the record, the proof
- [watch-slate](../slates/client/watch-slate.md) — the funnel, guests, the reuse ledger
- [front-page-slate](../slates/client/front-page-slate.md) — the page, the origin (§ 4a)
- [deep-links-slate](../slates/client/deep-links-slate.md) — origin, never a command
- [modes-slate](../slates/client/modes-slate.md) — the queue and the design language
- [lineage-slate](../slates/society/lineage-slate.md) — where origins go next
- [client-shell.md](../subsystems/client-shell.md), [char-gen.md](../subsystems/char-gen.md),
  [streaming.md](../subsystems/streaming.md), [cockpit.md](../subsystems/cockpit.md),
  [aether-devices.md](../subsystems/aether-devices.md)
