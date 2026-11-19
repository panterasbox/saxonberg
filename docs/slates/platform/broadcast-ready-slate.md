# Broadcast-ready slate — what it takes to go live every week

> **Status: PARTIAL** — shipped by broadcast-ready (MR !556, 2026-11):
> the stream on the streamer's body (`BroadcastMixin`, five phases,
> standby reasons and lower-third panels as rows, durable and fail
> closed), per-streamer overlay and control tokens, redaction while on
> air and the on-air marker, the controls card and its pop-out, Rodney
> on the real feed with OBS scene switching, pblive's scoped control,
> YouTube live detection under the streamer's own login →
> [livestream.md](../../subsystems/livestream.md),
> [streaming.md](../../subsystems/streaming.md), Rodney's README
> (`packages/rodney`) and `packages/rodney/docs/obs-setup.md`.
> **Left:** the deferred seams (§ below — the registry, the money and
> community cards, the wiki article of the day, `stream start <show>`,
> Kick on the show, alerts in the lower third, pop-out across
> connections, the deep-link page) · the owner's rehearsal items · the
> crawl's in-world news (press, chronicle — only welcomes ride it today)
> · the `saxonberg.gg` domain · the rotation rules the owner may tilt · ⭐ (2026-11-18, § *The page boundary*)
> the stream split to the person · *stream* for the off-page machinery and *broadcast* for the trade · the comms
> `broadcast` verb as a granted tool · redaction as the boundary control
> **Size:** a tail here — each seam's own slate carries its build

**Captured 2026-10-17.** The founder wants a weekly stream of a couple
of hours walking through the week's work on the platform. The hardware
is there; the software is not broadcast-ready. This slate is the
smallest thing that makes a real show possible, and nothing about it
waits on [card-sizes-slate](../client/card-sizes-slate.md) — it consumes that
slate's broadcast contract in the shape that exists today and upgrades
for free when the card build lands.

Related: [livestream.md](../../subsystems/livestream.md) (`BroadcastMixin`,
the feed, the streamer axis), [streaming.md](../../subsystems/streaming.md)
(relay chat), [card-sizes-slate.md](../client/card-sizes-slate.md) § the broadcast
contract (the table this build fills in), [streamer-registry-slate.md](./streamer-registry-slate.md)
(per-streamer state — explicitly NOT this build),
[client-shell-slate.md](../client/client-shell-slate.md) § public
read-only surface (default-deny projection), the
[broadcast-patronage track](../../tracks/broadcast-patronage-track.md)
Phase 3 (this build is it), and Rodney's `PLAN.md` §2 (`packages/rodney`, historical) (the two
frames) and §8 Phase 3 (the control plane).

## Left — deferred seams from the build

Clean attach points the build left, each with the slate it leaves as
(field names as the code has them):

- **The registry** ([streamer-registry-slate](./streamer-registry-slate.md))
  — `BroadcastMixin.streamChannels` and the token documents
  (`/platform/stream-tokens/<sha256>`) are the fields the registry's
  claim-by-proof will own; the `streamers` group stays the gate.
- **Giving / money and community cards** ([giving](../society/giving-slate.md),
  [budget](./budget-slate.md)) — `stream-event` is the envelope their
  arrivals ride (`kind: 'sub' | 'gift' | 'member' | 'patron'`); `money`
  stays `null` on the feed until the ledger exists; Rodney's `when` hides
  both rows.
- **The wiki article of the day** ([wiki-content-slate](./wiki-content-slate.md))
  — `wikiOfDay` stays `null` until the public route ships; Rodney reads
  it client-side when it exists.
- **A show chosen by `stream start <show>`** — `streamTopic`'s sibling
  field `show` on the mixin is one word away; today a profile is chosen
  per OBS browser source (`?show=<key>`, `packages/rodney/src/show/profiles.ts`).
- **Kick on the show** — a `streamChannels.kick` field already exists;
  turning it on is `stream channel kick <slug>`.
- **Alerts in the lower third** ([broadcast-patronage track](../../tracks/broadcast-patronage-track.md)
  Phase 4) — a fourth envelope kind, same socket. The design is
  § Alerts below.
- **Per-card pop-out across connections** — if the owner wants a popped
  card in a second standalone client, the seam is `CardApi.#interactiveFor`
  fanning out; a card-surface change.
- **The deep-link page** ([deep-links-slate](../client/deep-links-slate.md)) —
  `?from=stream` is the first tag; the slate's `/go/watch/<streamer>`
  route would set it.

No stub ships for any of these.

### Rehearsal — owner-only, still unproven

The wire drive (14/14) and the browser walk (2/2) proved what a test
world can; the rest needs the owner's hardware and accounts:

- OBS phase switching with the real feed (`?switch` on one source per
  page — Advanced access to OBS, else obs-websocket);
- the Elgato privacy cut with the server down;
- real Twitch and YouTube chat on the sidebar (the routing and the
  zero-`search.list` path are unit-proved) — and ⚠ read Twitch's current
  simulcasting terms first: whether a combined chat may appear on the
  Twitch stream is disputed (`packages/rodney/docs/obs-setup.md` § 5);
- the Google console: the YouTube Data API enabled and `youtube.readonly`
  on the consent screen (an unverified app is limited to its test users);
- a real process restart mid privacy standby (the drive staged it as
  logout → login);
- the Stream Deck keys via pblive (`stream token --control`);
- the `BROADCAST_TOKEN` → `stream token` changeover — the env token still
  opens the founder's feed (the first id in `STREAMER_PLAYER_IDS`); move
  the first week, then retire it.

---

*The stream's phases, reasons as rows, the durable state that fails closed
and the `stream` verb shipped → [livestream.md](../../subsystems/livestream.md)
§ The stream on the streamer's body, § The `stream` verb.*

---

## ⭐⭐ The canvas — revised 2026-10-22 **[DECIDED — the owner]**

*Shipped — the display capture, the sidebar, the lower third's rotation
over a crawl, names shown freely, the controls card's numbers: Rodney's
README § Overlays, `packages/rodney/docs/obs-setup.md` § The privacy rule
and § 2 Scenes, [streaming.md](../../subsystems/streaming.md) § The
streamer's own numbers.*

### Alerts — later, in the lower third **[DECIDED]**

Alerts interrupt the rotation for a few seconds, in the lower third, so the content area is
never covered. ⭐ **The alert that matters is the conversion: someone walked into Saxonberg
from the stream** — the moment the pitch worked. Follows, subs and raids follow Twitch event
intake.

### Cheap to iterate

- Rules the owner may tilt: **fresh beats due** (an item whose data just changed jumps the
  queue once) and **weight by segment** (build items heavier in a coding segment, world
  items in a play segment).

## ⭐⭐ The cards — revised 2026-10-31 **[DECIDED — the owner]**

A **card** is one thing the lower third shows on its turn. Each card is about **one thing**,
and a card whose source is empty never takes a turn.

| card | about | source | waits on |
|---|---|---|---|
| **What you're looking at** | ⭐ that this is a GAME, and its screen | the client's facts | the verb on the feed |
| **What can you do here?** | one true thing about a trade, per turn | the docs that say it ships | — (the verb steers it) |
| **Saxonberg** | the game | static + the game | the build date; the domain |
| **Money** | dollars in vs the month's budget | giving's ledger + the books | [giving](../society/giving-slate.md), [budget](./budget-slate.md) |
| **Community** | people joining | giving's events + new players | giving; the new-player event |
| **The Compact** | who governs it — the three chambers | static | — |
| **About** | who Bobalu Smallberries is | static | — |
| **The code** | where it is, the stack, how big | GitLab's API + the checkout | — |
| **Wiki article of the day** | the architecture, a page at a time | the wiki | the wiki's public route |
| **The ticker** (the crawl) | in-world news, world firsts, ⭐ welcomes | press, chronicle, new players | the new-player event |

*The screen guide, the facts (sixty-six, steered by the streamer's last
verb), the Compact, About and code cards, the Saxonberg card with its QR
and build age, the ticker's welcomes and the three brands shipped as rows
and Rodney panels: `packages/content/platform/content/lower-third-panels/`,
`packages/rodney/src/scenes/live/`, `src/show/profiles.ts`, `src/show/facts.ts`.*

### The Saxonberg card **[DECIDED — the owner; copy LEAN]**

- ⚠ **The domain** — the owner will register **`saxonberg.gg`** (unregistered as of
  2026-10-31; Route 53 registers `.gg`, without WHOIS privacy). A host change moves
  `CLIENT_URL` and every OAuth callback with it ([deployment.md](../../deployment.md)).

### The money card — dollars only **[DECIDED — the owner]**

**This month's income against this month's budget, back to zero every month** — the owner: *"that's
how I have to pay for things right now"*. Income is **at net**, what reached the project
([giving](../society/giving-slate.md)); the budget is **read from the books**
([budget](./budget-slate.md)), split by what drives it — **running the world** (grows with
players) and **building it** (inference today) — so *costs rise as more people log in* is visible
as it happens. Recent gifts may scroll here. ⚠ **Recurrence is not a dimension** — the owner:
*"the recurringness actually isn't really important to me"*: one flat number for the month.

⚠ Before it airs: [budget](./budget-slate.md) guardrail 4 (*contributions confer nothing*) and
[giving](../society/giving-slate.md) (patronage becomes capital standing) must be read together — this card
is where dollars and standing would sit side by side.

### The community card — people **[DECIDED — the owner]**

New subs, gift subs, new members and patrons, **as people joining, not as money**; ⭐ new
Saxonberg players in real time (character creation's commit is one server event — it goes on the
feed); and **where to find us** — Twitch, YouTube, Kick, Patreon with their glyphs and handles.
The owner prefers gift subs to flat gifts (*"subs build community, donos just support me"*); the
community card is where that shows, and alerts weigh a gift sub heaviest.

### Wiki article of the day **[LEAN]**

The owner: *"a great way to get people into the architecture."* **Seeded by the date**, so the
stream, the in-game wiki and Discord agree on the day's page; a **second slot follows the topic**
(tonight's agenda item picks a related page), so the same page does not repeat all night. The
summary is **the page's own lead** — the public route's link-preview summary, never an LLM's —
and only **level-0** pages, the public route's rule. It reads
[wiki-content](./wiki-content-slate.md)'s public route.

---

*The client (the controls card and its pop-out, redaction, the on-air
marker, the foreground report), the feed (one token per streamer, the
allowlist), the overlay's four scenes and its rules table, OBS switching
and the Stream Deck's two paths shipped →
[livestream.md](../../subsystems/livestream.md) § Tokens and the two
doors, § The show — an allowlist, § Nobody is broadcast without being
told; [client-shell.md](../../subsystems/client-shell.md) § On air, and
popped-out cards; Rodney's README § The feed and § Scene switching;
`packages/rodney/docs/obs-setup.md` § 4.*

---

## Multistreaming — YouTube and Twitch from day one

*OBS to Twitch and YouTube on one encode (Aitum Multistream), the unified
relay chat and YouTube under the streamer's own login shipped →
`packages/rodney/docs/obs-setup.md` § 3 and § 5,
[streaming.md](../../subsystems/streaming.md) § YouTube under the
streamer's own login. Kick is `stream channel kick <slug>` (§ Left).*

- Alerts arrive per platform (giving-slate reads them); the overlay
  shows them in one style with the platform glyph.

## ⭐⭐⭐ The page boundary — what the stream assumed, reconsidered (2026-11-18) **[DECIDED in shape — the owner]**

The owner: *"This makes me rethink some of what we've slated and even already built for livestreaming, because it
assumes all livestreaming content in the game is what we're now calling off-page … there's also livestreaming that's
on-page to consider, and we have to keep those two things distinct. What we've built right now makes a lot of
assumptions we probably need to reconsider."* (*Off-page* and *on-page*:
[photography-slate](../trades/photography-slate.md) § 9; the screen side:
[display-manifestation-slate](../client/display-manifestation-slate.md) § *The page boundary*.)

**The owner's stream is not purely off-page**: his face and voice are, but most of what is on screen is **the game
rendered outward** — the on-page → off-page crossing, which is why redaction exists.

1. ⭐ **The stream belongs to the person, not the body** **[DECIDED — lens 7]** — `BroadcastMixin` sits on each
   Avatar, so channels, tokens, phase and agenda follow a *character*; but a Twitch channel is a person's, and
   switching characters mid-stream is still the same stream. **Split it**: the person's stream (channels, tokens,
   phase, agenda) is **account-level** off-page production — accountability is the person's, as conduct follows the
   account; the body answers only **which character is on screen**. A *character* broadcasting in the world is the
   on-page case, where state on the body makes sense.
2. ⭐ **"Broadcast" means three things; it should mean one** **[DECIDED — lens 2]** — the livestream's
   `BroadcastMixin`/`BroadcastFeed` (the off-page overlay), the comms `broadcast` verb (one-to-many to every online
   player), and broadcasting the trade ([broadcasting-slate](../trades/broadcasting-slate.md)). **The off-page
   machinery takes the name *stream***; *broadcast* means the in-world trade.
3. ⭐ **Reaching every online player at once is a granted tool, not a free verb** **[DECIDED — lens 7]** — the comms
   `broadcast` verb does it today; reaching everyone's attention at once is a power, so it belongs to a seat granted
   it (the Compact's gazette, an operator's announcement), not to anyone who types it.
4. ⭐ **Redaction is the boundary control for on-page → off-page** **[DECIDED — lens 7]** — its job is protecting other
   players' private content when the game is shown to a real-world audience; **every future outward path**
   (screenshots, clips, a spectator mode) passes through the same control.
5. **The agenda and segments may be generic broadcasting** — they measure a streamer's craft (broadcasting-slate § 7:
   agendas kept) and an on-page station's schedule wants the same shape.

**A build**, since these change shipped code: the account-level split, the rename, the announcement tool, and the
on-page relay source on the display side.

## Open questions

1. Q1 (the segment list) resolved: an agenda — [livestream.md](../../subsystems/livestream.md)
   § The `stream` verb (`agenda`, `next`, `segment`).
2. Q2 (`ending` → `offline`) resolved: on a timer (`stream.outroMs`,
   default 60 s), or at once by `stream off` — livestream.md § The stream
   on the streamer's body.
3. Q3 (Twitch, YouTube, or both) resolved: both — `packages/rodney/docs/obs-setup.md` § 3.
4. Q4 (private channels) resolved: posts on a player-made channel carry
   `privacy:private` — livestream.md § Nobody is broadcast without being
   told.
5. Q5 (the lower third's sources) resolved: panel rows — livestream.md
   § The pieces.
6. Q6 (pop-out windows without chrome) resolved: Document
   Picture-in-Picture, verified; not the PWA —
   [client-shell.md](../../subsystems/client-shell.md) § On air, and
   popped-out cards.
