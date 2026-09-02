# Client audio slate — a client-side player, and the Spotify jukebox that rides it

**Captured 2026-09-01.** Two things at once: a **client audio player**
(atmospheric sound, the near-term win) and a **shared bar jukebox** with
a zorkmid-priority queue over Spotify — where the design conversation's
real work was separating what is buildable from what Spotify's platform
will not allow.

> **Status: design conversation, captured. Not requirements.** Spotify
> platform facts verified against the web on the capture date; they are
> a moving target and **must be re-verified before any Spotify work
> starts** — one of the load-bearing constraints is a *live bug*.

**Provenance:**

> **User: "an audio player in the client. it would potentially serve
> atmospheric sounds but my immediate application would be a jukebox in
> the bar … every client connects its own spotify account and listens
> in on the jukebox broadcast when they're in the bar … and then we
> charge zorkmids to queue music like a real jukebox with spotify's
> entire library."**

**Sits on / borrows:** [display.md](../../subsystems/display.md) (the
per-viewer `cockpit.watch` push, `display.mayDrive`/`display.show`,
`refreshViewer` — the audio player is the same shape one modality over),
[streaming.md](../../subsystems/streaming.md) (`watch … on <screen>` is
the exact precedent: server writes per-perceiving-viewer client state
for everyone who can see a surface), [cockpit.md](../../subsystems/cockpit.md)
(the client embed host), [media.md](../../subsystems/media.md) (asset
provenance for self-hosted audio).

---

## Part 0 — The finding: two features, and only one of them is a Spotify problem

The request bundles a **substrate** (a client audio player) with a
**hard capability** (a synced Spotify jukebox). They separate cleanly,
and the separation is the whole design:

- ⭐ **The client audio player is real, easy, and Spotify-free.** Ship it
  for atmospheric sound. It is the near-term win and it owes nothing to
  any third party.
- ⚠ **The Spotify jukebox is mostly a platform-limits problem**, not an
  engineering one. Most of what the request pictured is not buildable on
  Spotify's terms; a **narrower, better-shaped** version is.

So this slate builds the substrate first and treats Spotify as a
**documented capability tier** sitting on top, with its constraints
written down so nobody re-discovers them the hard way.

---

## Part 1 — The client audio player (the substrate — build this)

An `<audio>` / Web Audio element in the React client, driven by
**server-authoritative per-viewer state**, exactly like the video embed.

⭐ **It is `watch … on <screen>` one modality over.** The display
subsystem already writes a `cockpit.watch` marker to every viewer who
can perceive a surface, and clears it on `refreshViewer` when they leave
the room. An audio source is the same push with an audio payload: walk
into the bar, the jukebox's current source lands in your client; walk
out, it clears. No new architecture — a second modality on a shipped
seam.

**First consumer: atmospheric sound.** Room-authored ambient loops
(rain, a crackling hearth, tavern murmur) as self-hosted files via
[media.md](../../subsystems/media.md). A room/biome declares an ambient
audio source; occupants hear it; it is per-viewer and clears on exit.
This is genuinely useful on its own and carries zero third-party risk.

**Open shape questions (Part 5).** Whether the source is a Location
field, a `DisplayMixin`-style device (a literal in-world jukebox object),
or both; how loudness/mix layers compose; the autoplay-gesture gate
(below) applies here too.

---

## Part 2 — Why the jukebox as pictured is not buildable on Spotify

The request had four pillars. **Each fails independently**, and money was
never the binding one.

| pillar | verdict |
|---|---|
| "a Spotify broadcast" / "listen in on the jukebox broadcast" | ❌ **No broadcast/group API exists.** Spotify **Jam** (up to 32, host DJs, synced timecode) is the feature — but it has **zero Web API**: no create, join, link, queue, or control. Years-old top developer request, unbuilt. In-app only. |
| "every client connects its own Spotify and listens in" | Each account plays **independently**; there is no shared stream. And a *remote* Jam (own device) needs **Premium per listener** regardless. |
| "with ads if free account" | ❌ **Free accounts cannot play on-demand at all** via the Web Playback SDK. Not "with ads" — nothing. The free tier as imagined cannot exist. |
| "charge zorkmids … spotify's entire library" | Money is **not** the wall (Part 3). Scale is: dev mode caps at **5 users**; past that, **extended quota** needs a registered business + **250k MAU** + a launched service, no approval guaranteed. |

⭐ **The irony worth keeping:** the licensing that makes a paid jukebox
legal is exactly what **TouchTunes** pays for (the same TouchTunes whose
API we mapped a few conversations back). Spotify's consumer API grants
none of it.

---

## Part 3 — The zorkmid point, conceded and bounded

The user correctly pushed back: **an internal, non-cash currency is not
"monetizing Spotify content."** A zorkmid priority queue is a game
mechanic, not a storefront, and the initial "it's monetization" framing
over-weighted it. Recorded so the concession is not re-litigated:

- ✅ **The mechanic is fine and it survives.** On self-hosted audio the
  entire zorkmid-priority-queue jukebox works and touches nobody's ToS.
- ⚠ **Money re-enters as a real ToS question only if** zorkmids ever
  become **purchasable with real money** — then gating Spotify content
  behind them *is* monetization. In a game with an economy, currencies
  drift toward purchasable; decide this deliberately.
- The "priority queue over Spotify's library as an alternative
  consumption experience" is a **soft, interpretive** policy concern, not
  a hard wall — flagged, not asserted.

**The binding constraints are platform mechanics (Part 2), not the
economy.** Strip the currency out entirely and the Spotify version still
fails.

---

## Part 4 — The embed: the one path that clears the wall (loosely)

⭐⭐ **The Spotify iframe embed is a different mechanism from the Web
API, and it sidesteps the entire OAuth/quota/5-user problem.** It is a
client-side iframe; it needs no app registration, no per-user OAuth, no
5-user cap, no 250k-MAU quota, and it is Spotify's **sanctioned**
embedding surface. The **iFrame API** exposes `createController`,
`loadUri`, `play`, `pause`, `seek`, and a `playback_update` event firing
~1×/sec with position.

So the server **can** own the queue + zorkmid economy and drive each
client's embed via `loadUri`. That part needs **zero approval**.

### The three catches, one of them live

1. **Full tracks need Premium + logged-in + desktop browser.** Anonymous
   / logged-out gets a **30-second preview** — which doubles as the "free
   tier" (previews, not ads). Mobile web is unreliable.
2. ⚠⚠ **A live (May 2026) bug: the iFrame API's `play()`/`resume()`
   forces 30-second *preview* playback**, even for logged-in Premium
   users — while the embed's **own native play button** plays the full
   track. That is the exact call a server-conducted synced room needs, so
   **programmatic full-playback is currently broken.** Re-verify before
   building; do not design around `play()` working until it does.
3. **It is N independent players.** `seek()` + `playback_update` give
   **loose** sync (~1s), never sample-locked. Tight frame-lock never had
   a clean path (Jam has no API).

### What the embed makes buildable **today**, no approval

- ✅ **The shared-queue jukebox** — game owns the queue, the zorkmid
  priority, and the now-playing display; the current track shows in every
  in-bar client's embed; Premium viewers hear full tracks, others get
  previews; people play along on their own logged-in session. ToS-clean,
  slots into the display system.
- ❌ **The locked-timecode broadcast** — not reliably, because of the
  `play()` bug **and** the herding-N-players fundamental.

⭐ **The real decision: is loose sync enough?** Everyone roughly on the
current track, playing on their own login, is most of what the request
actually wanted — the ritual, the queue, the zorkmids, the room seeing
the pick. If yes, the embed is the path. If it must be frame-locked, **no
Spotify route delivers it** and Part 6 is the only answer.

---

## Part 5 — Open questions (the substrate)

1. **Where does an audio source live?** A Location/biome field, a
   `DisplayMixin`-style in-world device (a literal jukebox object you can
   `look` at and feed zorkmids), or both. The jukebox wants to be an
   *object*; atmospheric sound wants to be a *room property*.
2. **The autoplay gesture.** Browsers block audio until a user
   interaction. A one-time "join the jukebox / enable sound" click per
   session — applies to atmospheric audio too.
3. **Mix / layering.** Can ambient loop + jukebox track coexist, and who
   sets the balance? Probably: ambient ducks under a foreground source.
4. **Loudness + honest state.** A muted/volume control is per-viewer
   client state; does the server need to know? (Probably not — keep it
   client-local, like a terminal setting.)
5. **The player as a display source.** `display.md`'s source list is
   video/card today; audio is a third source kind on the same
   `resolveFor` ladder, or a sibling. Decide before wiring.

## Open questions (the Spotify tier)

6. **Loose-sync or frame-lock?** The Part 4 decision. Forks everything
   downstream and is the user's call.
7. **Are zorkmids ever purchasable?** The Part 3 gate. If yes, the
   Spotify tier is off the table and self-hosted (Part 6) is mandatory.
8. **Re-verify every Spotify fact.** Especially the `play()` preview bug
   — it may be fixed or worse by build time.

---

## Part 6 — The alternative if frame-lock or scale is required

If the jukebox must be a **true synced broadcast**, serve **free
listeners**, or run at **public scale**, Spotify cannot do it and
**self-hosted / licensed audio** is the only path:

- You host the catalog; it is a real server-driven broadcast; it works
  for everyone; the zorkmid economy is unambiguously legal because **you
  hold the rights**.
- Cost: real music licensing (a webcasting/DMCA license, or a
  B2B music-for-business provider), and you get *your* catalog, not "all
  of Spotify." **This is the TouchTunes model.**
- The atmospheric-audio substrate (Part 1) is self-hosted already, so
  this tier reuses the same player — only the source catalog changes.

---

## What this slate does NOT cover

- **The zorkmid economy itself** — priority-queue pricing, the sink, the
  balance. That rides the existing money substrate ([banking.md](../../subsystems/banking.md));
  this slate only says the queue *consumes* it.
- **Music licensing procurement** — a business task, not a design one, and
  only relevant to Part 6.
- **The Spotify Web API playback path** (Web Playback SDK + Player API) —
  evaluated and **rejected** in conversation: Premium-only *and* it hits
  the 5-user / 250k-MAU quota wall the embed avoids. Kept out so it is not
  re-proposed as the "obvious" route; the embed is strictly better for
  this use case.
- **Non-Spotify streaming providers** (YouTube embed, etc.) — same
  broadcast/commercial limits, and the existing `watch` embed already
  covers YouTube *video*; not re-litigated here.
