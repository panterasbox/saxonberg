# Watch slate — watching a live performance, from the link to the lounge

> **Status: DESIGNING** — opened 2026-11-21 with the owner, from the
> [modes-slate](./modes-slate.md). What ships: `watch` / `tune` and the three carrier transports
> ([streaming.md](../../subsystems/streaming.md)), the viewer and streamer arrangements, the phone
> as a tuner ([aether-devices.md](../../subsystems/aether-devices.md)) and the held screen
> ([display.md](../../subsystems/display.md)), the stream phases (`away`, `back`, `segment`,
> `agenda` — [livestream.md](../../subsystems/livestream.md)), the anonymous guest, sign-in with
> Twitch and Kick.
> **Shipped by stream arrival (MR !655, 2026-11-24):** the funnel — the origin words
> (`?from=twitch|youtube|kick|stream`), the follow-up through sign-in (`via=`), the program as the
> streamer record, arriving in watch mode for the visit (`--watch`, `cockpit.sessionMode`) — and the
> video that never stops (one `StreamPlayer`, docked in each page's layout) →
> [client-shell.md](../../subsystems/client-shell.md), [connection.md](../../subsystems/connection.md)
> **Left:** the show's own chat and the
> unaffiliated-stream chat · the agenda state machine · the standby summary · our chat on the
> overlay (**before the first show**) · the regular's experience
> **Size:** a build, client-led, with a server half; the funnel first

## 0. The ask **[DECIDED — the owner]**

*"The whole thing we're designing for is someone watching on twitch, clicking the link to
mud.panterasbox.com and the first thing they wanna do is resume watching the stream in our client
instead of where they came from."*

The **funnel** comes first; the regular who turns to a show mid-session is designed second
(*"a stranger with no account becomes a signed in viewer with no character — it's one funnel"*).

## 1. Watch is generic **[DECIDED — the owner]**

*"This 'watch' mode … also needs to work for any possible livestreaming even one that's not running
rodney or even maintains any kind of relationship at all with the saxonberg platform. it's all just
watching a performance."*

- **No feature for one streamer.** Anything the founder's show gets, any streamer who registers
  gets, through the same record ([streamer-registry-slate](../platform/streamer-registry-slate.md)).
- **Rodney is the streamer's side** — a separately maintained package of overlays and OBS
  instrumentation, ready made for any streamer, that plugs into Saxonberg. Watch is the viewer's
  side and does not rebuild it.

## 2. Watch never duplicates the video **[DECIDED — the owner]**

*"watch isn't displaying anything rodney publishes at any time, that'd be showing the same
information twice. it shows up in the video feed — that's the only place it needs to be. now what
the watch mode can do is complement and augment what's on the screen at any given time the way
amazon prime tries to do for sports and movies."*

- **Complement, not copy** — context the picture doesn't carry.
- **Stand-in when the picture stops carrying it** — *"if I go on standby mode and hide all those
  overlays, the saxonberg client itself can step in and summarize what the person is missing until
  I come back."* Driven by stream **state** (the phases), never by mirroring the overlay.
- An unaffiliated stream has no state to read: watch stays thin and honest rather than inventing
  content.

## 3. The funnel **[DECIDED — the owner]**

**click → front page (your platform first) → sign in with it → the quick character path beside the
video → the lounge, watching on your phone, the video never restarting.**

1. The link (Twitch chat or panel, a YouTube description, a Discord go-live post) carries the
   origin and the intent ([deep-links-slate](./deep-links-slate.md),
   [front-page-slate § 4a](./front-page-slate.md)).
2. The front page puts the visitor's platform first.
3. **Sign in with the platform you watched on.**
4. **The quick character path.** Character creation *"can be very long but it doesn't have to be —
   there's a quick way through."* The funnel takes the quick way; the long one stays open, then or
   later.
5. **The video never stops** **[LEAN]**: the stream plays from the front page on, docked beside
   sign-in and character creation (both already outside the fiction), and carries into the game
   without restarting. No bodiless spectator mode is needed — everyone is a character, and `watch`
   needs a body.
6. **You arrive in the lounge watching on your own phone** **[DECIDED — the owner]**. *"I'm not sure
   if we want them watching the show on the lounge screen, that presumes a lot like what if
   someone's watching something else? a new player changes it for everyone? you start with a phone
   you can watch the stream on that."* The lounge screens stay *"something more communal and
   localized"* — **open**, their own design.

## 4. Guests and identity **[DECIDED — the owner]**

*"We have to accommodate guests that want to watch the stream like anyone else but I actually don't
want the client encouraging guest logins … I personally hate not knowing anything about who these
people are and specifically if they're going to watch me stream I want their account tied to
whatever platform they're watching me on, twitch, kick, or youtube. preferably they tell us all
three … but at the very least whatever identity is watching my broadcast."*

- **Guests are supported, never promoted.** A guest can watch through a plain, unadvertised path;
  nothing in the funnel offers or encourages it. This **supersedes** the deep-links slate's
  *"watch as a guest at once"* as an advertised choice. Guest creation may later move behind a
  provider sign-in (*"I'm one bad actor away"*); the funnel would not change.
- **One link is required: the platform you watch on.** Linking the other two is **offered later,
  never required** — e.g. the first time they arrive from a different platform.
- **Open (values):** who sees a viewer's linked accounts — the operator, their moderators,
  everyone? It decides what sign-in must say, and the privacy policy.

## 5. Chat — ours is the star **[DECIDED — the owner]**

*"As the broadcaster I don't really even want people chatting on any of the three carriers' own
transports … I want people using my own chat that's just here in saxonberg. Just like the
Saxonberg Post maintains the Gossip channel and forum, I'll have my own subject for the Bobalu
Smallberries stream, owned by me (or my business) and moderated by my personal mod staff."*

- **A registered streamer's chat is their own subject**, owned by them (the founder: the sole
  proprietorship, out of Hallett's — [halletts-slate](../world/halletts-slate.md)) and moderated by
  their staff.
- **Combined chat is four sources: ours plus three carrier relays, read-only.** Ours is the star
  because it carries the emote framework and plugs into reputation; the carriers' chats are shown
  so in-client viewers see the whole room.
- **The client never offers posting to a carrier.** *"I don't care where they go I'd prefer people
  not even send them."* The Twitch posting path that ships stays in code, unsurfaced.
- **The streamer's moderators** work in our chat first and need moderation controls on the three
  carriers second — moderation and broadcast tooling, not the viewer's mode.
- **An unaffiliated stream** gets a Saxonberg chat for the people watching it here, unowned,
  covered by the platform's moderators **[LEAN]**.
- **The name** **[LEAN]**: *the Bobalu Smallberries chat* — the show's, by the three-names rule;
  a community-wide chat would carry the Pantera's Box name and belong to the Compact. The owner
  floated Pantera's Box (*"that's how the discord is branded"*).
- ⭐⭐ **Our chat is on the stream overlay before the first show** — the owner: *"I don't care what
  it's a part of but it absolutely has to happen before I go live."* Twitch-only viewers must see
  the conversation that happens here. It is Rodney's / broadcast's work, and launch-blocking.

## 6. The agenda state machine **[DECIDED — the owner]**

*"The livestream is marketing for the platform but it's also largely an educational tool and that
will be its place probably more and more as more content gets built out … If my stream is taking
place in the brazing laboratory, the watch mode is telling the viewer about whatever's within their
already current attention radius and how it relates to brazing … and then the payoff is that
brazing card they saw me drive on the livestream shows up in their own crafting interface and
watching the livestream already showed them how it works."*

- **The streamer drives a state machine through the agenda.** Each segment carries metadata —
  what is demonstrated, the Discipline, the cards and objects involved. The streamer moves between
  states; every viewer's client hears it.
- **Watch reacts within what the viewer can reason about** from where their attention already is
  — not a dump of the streamer's room, and **not** *"go to where the streamer is and do what they're
  doing"*. Public exhibitions may be a marketing format; watch does not model them.
- **The payoff is recognition:** the card driven on stream is the card that opens in the viewer's
  own craft mode.
- **Don't do too much:** *"we also have a whole separate 'Learn' mode that's just for this sort of
  interaction."*
- **The standby summary** is this machine in another state.
- *"Twitch and youtube try to do [this] but haven't really been able to capture [it] at least in
  wide markets."* Any registered streamer can drive an agenda; Rodney is one driver.
- ⚠ Watch never shows a viewer what the stream redacted.

## 7. Augmenting the carriers' players **[OPEN]**

*"The same way BG3 augmented twitch streams with its game state we should be doing the same thing
to my own stream with saxonberg. rodney does most of that but its overlays aren't clickable."* But
*"the whole point is to get people into the game not make Twitch better. but still it's too
interesting a marketing and learning space to ignore the feature, it may even make twitch the
premiere way to watch my stream over the other two carriers."* Twitch Extensions (overlay or panel,
clickable, backed by the developer's server) are the known mechanism; what YouTube and Kick allow
is below. Rodney's and broadcast's, read from the same agenda state machine.

**What each carrier allows (researched 2026-11-21; re-check before building):**

- **Twitch — the only one with code inside the player.** Twitch Extensions (listed Active, no
  deprecation found): a **panel** under the video, a **video overlay** (a clickable transparent
  layer over the whole picture), a **component** (part of the video, hideable). The developer's
  server pushes live state to every viewer over Extension PubSub (a separate system from the legacy
  PubSub retired in 2025). Viewer identity is an opaque id unless the viewer agrees to share their
  Twitch id. Mobile is opt-in per extension and a separate, smaller surface (overlays likely
  web-only — inferred). Bits can be spent in an extension (voting and broadcaster experiences are
  allowed; paid entry to a pay-to-play game, wagering and loot boxes are banned). Review requires
  the channel to be **live**. ⚠ **Rules that bite us:** a link off Twitch must say it leaves Twitch,
  and **sending viewers off-platform may not be the extension's principal use** — so "come play in
  Saxonberg" can be a feature of an extension, never its purpose; no ads or sponsorship content.
  Source: dev.twitch.tv/docs/extensions (guidelines-and-policies, reference).
- **YouTube — no third-party in-player platform.** The Live Streaming API reads and posts chat,
  moderates, and **creates native polls** — so the agenda machine could open a YouTube poll and read
  the votes; the overlay stays in OBS.
- **Kick — no extension platform.** A public REST API (2025) and webhooks: chat, moderation,
  subscriptions, gifts, stream metadata. The overlay stays in OBS.

So the BG3 pattern — the agenda state machine feeding a clickable overlay with viewer votes — is a
Twitch Extension; on YouTube it degrades to native polls, on Kick to chat. This is the concrete
version of the owner's *"it may even make twitch the premiere way to watch my stream."*

## 7a. The layout — one screen, four video sizes **[LEAN — prototype]**

The owner: *"given a fixed screen size, what are the different sizes the video portion of the
screen uses and what real estate gets left to the rest of the page."* Watch's priority list:
**the video** (the subject, sized by the viewer) → **the terminal** (chat included; unfiltered while
alone) → **a second terminal** when there is room (stream chat splits out; the first keeps everything
else) → **cards** (the ordinary feed; the agenda machine's card is one more arrival). *"If anything
goes right in front of the viewer besides the video feed itself it's the chat. everything else can
fall off but chat always needs to be there."*

At 1440×900 (prototype: claude.ai artifact XY8FivnMEARSNiNxkJ5qcK, private):

| step | video | left for everything else |
|---|---|---|
| **max** | 1360×765 | the chrome only — no terminal, by the viewer's choice |
| **large** | 988×556 | one unfiltered terminal (a 360px column) · a card row under the video |
| **medium** | 704×396 | stream chat under the video · *everything else* as a second terminal · two card columns |
| **small** | a card (404×227) | **the watch card** · one unfiltered terminal · a card column |

- **The mode rail stays** **[DECIDED — the owner]**: *"I miss the left rail with all the modes, the
  dropdown doesn't pack the same punch."* It is chrome; the whole list, unbuilt modes dimmed.
- **The watch card** **[DECIDED — the owner]**: at the small step watch gets a permanent support,
  *"the same way the nav card is for explore. this is where the discovery and schedule shit can
  go."* What you are watching, who is live in Saxonberg, streams you follow elsewhere, what is
  coming up. Only at small — at the bigger steps the video has taken that space. Earlier the owner
  questioned giving discovery prime placement *"unless we're trying to directly build a twitch
  competitor"*; this is its place. Other performer-app features still to decide: go-live notices,
  polls, raids, clips, rewards.
- **Open:** who picks the step (the viewer only, or does the layout step down when a card needs
  room); the step sizes at other screen sizes; the single bar vs a bar per terminal.

## 7b. Reuse ledger for the plan — the stream arrival build (2026-11-23)

the stream-arrival build, MR !655. Every concept the
build needs, and what already does it:

| concept | already doing it | this build |
|---|---|---|
| playing a carrier's video | `StreamEmbed` (one sandboxed iframe, Twitch · YouTube · Kick) | **reuse** — the same player, mounted outside watch mode so it survives every client phase |
| what is being watched | `cockpit.watch` (`WatchTarget`), the `watch` verb | **reuse** — entering while watching writes the same state the verb writes |
| the show's on-air state | `BroadcastMixin` phases, the three transports, `/auth/status` | **reuse** — the page reads live / offline from what ships |
| the show's channel per carrier | four singleton env vars today (streamer-registry-slate) | **generalize** — settings per carrier for the founder's show; the registry replaces them later |
| where the visitor came from | `?from=stream` → sessionStorage → `Interactive.arrivedFrom` | **generalize** — the value names a carrier; referrer fallback; last method remembered |
| sign-in | Passport strategies + `*-link`; callbacks to `?auth=success` | **reuse** the strategies and today's trip to the provider; **new** — the return to what the visitor was doing (a separate sign-in window was rejected by the owner) |
| the mode a character enters in | `getCockpitMode` (explicit → legacy → `explore`) | **reuse** — entering while watching sets `watch` the ordinary way |
| a new character's clothes, bio, prologue | aspiration's `outfit` / `bioSeed` / `claimSeeds` | **replace** — one plain outfit; empty bio; no prologue |
| the guest's look | a random aspiration's outfit and bio | **replace** — the plain outfit |
| the front page | `StartScreen`, `PressRoom` | **rebuild** — the client half of front-page-slate § 4 |

## 8. Open

- The regular's experience mid-session; getting out of watch (the phone pocketed, the video in a
  corner, back in explore).
- Who's watching here — shown, and how.
- Who sees linked accounts (§ 4).
- The lounge screens (§ 3).
- The chat's name (§ 5).
- Which carrier extensions to build (§ 7).
- The lens pass.
