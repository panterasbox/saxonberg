# Streamer registry slate — one record the broadcaster and the viewer both read

> **Status: PARTIAL** — the whole streaming substrate shipped: `watch` /
> `tune` over a unified `StreamApi`, the three transports (Twitch
> EventSub multiplex · YouTube read-poll · Kick inbound webhook), the
> `StreamerTarget` grammar, the sandboxed embed for all three platforms,
> `cockpit.watch` / `cockpit.tuned`, the shared-screen `watch … on
> <screen>`, the `?broadcast=` overlay feed + `RelayChatEnvelope`
> forwarding →
> [streaming.md](../../subsystems/streaming.md),
> [livestream.md](../../subsystems/livestream.md)
> **Left:** the `Streamer` record itself (nothing about a streamer is
> persisted today, on either side) · claim-by-proof over the shipped
> OAuth links · retiring the four singleton env vars into per-streamer
> fields · a per-streamer overlay token + feed scope + `StreamState` ·
> registry-first resolve so a bare handle stops being an
> `ambiguous-handle` reject · persisted tunes · the viewer's
> platform preference when a record affords several · the consenting
> public directory · the documented REST read for third-party overlays ·
> the YouTube claim proof (`GoogleProfile` stores no channel)
> **Size:** a build, and the portal half can split off as a second

**Captured 2026-09-23.** The streaming stack was built in two pushes
that never met: the **viewer** half (`watch`/`tune`) resolves a streamer
lazily and persists *nothing*, and the **broadcaster** half (the overlay
feed) is hardcoded to one person by environment variable. Both halves
say "streamer" and neither one can see the other's.

Related: [streaming.md](../../subsystems/streaming.md) (the viewer
surface + the three transports),
[livestream.md](../../subsystems/livestream.md) (the overlay feed + the
`streamers` axis), [connection.md](../../subsystems/connection.md) (the
OAuth spine the claim proof rides),
[display.md](../../subsystems/display.md) (the shared screen — a
*different* concept, and it stays different),
[press.md](../../subsystems/press.md) (`PressRoutes` — the anonymous-REST
pattern to copy),
[broadcast-patronage-track](../../tracks/broadcast-patronage-track.md)
(the go-live track this sits on).

## The argument, in one sentence

**Today the platform has two unrelated things both called "streamer" —
an ephemeral pointer at somebody's channel and an authorization flag on
one account — and every feature the vertical needs is a consequence of
merging them into one persisted record.**

## ⭐ The record, and its three states

One row. Cross-platform identities (twitch login · kick slug · youtube
channelId), a display name, a short handle, and a state:

| state | who makes it | what it affords |
|---|---|---|
| **listed** | anyone — a viewer, unprompted | a short name · cross-platform unification · persisted tunes · resolvable by anyone who types it |
| **claimed** | the streamer, **by proof** | the control plane: their own overlay token, their own `StreamState`, their own chat forwarded to their own overlay |
| **consenting** | the claimant, explicitly | appears in the public directory |

⭐⭐ **Claiming is a proof, not a request.** The OAuth links already
ship — `TwitchProfile.login`, `KickProfile.slug`. If a viewer lists
`twitch.tv/shroud` and shroud ever logs into Saxonberg with Twitch, the
record is his, decided by a string comparison. **No approval queue, no
admin, no pending state, no notification anyone has to act on.** That
one property deletes the entire workflow this feature would otherwise
need, and it is the reason to build the registry on the auth spine
rather than beside it.

⚠ **It does not work for YouTube.** `GoogleProfile` stores no channel —
the same gap that already defers character→YouTube in
[streaming.md](../../subsystems/streaming.md). A YouTube-only streamer
cannot prove a claim. Two candidate answers (a Google scope that returns
the channel at link time; the classic paste-this-code-in-your-description
check) — **pick one at requirements, and do not let it block Twitch and
Kick**, which are the two that work today.

## Why this is a collection, and the document store is not it

The store's own rule ([`documents.yaml`](../../../packages/server/src/schema/documents.yaml),
justifying the release move) is *owner-scoped content with a place, and
nobody queries it across jurisdictions.* A streamer record fails it on
both limbs, and the second one decisively:

⭐ **A streamer has three identity keys and `DocumentKinds` gives a kind
one.** `naturalKey` is a single dotted field under `data` with one
partial unique index. The central read on **both** sides of this feature
is a reverse lookup — *given this `TwitchProfile.login`, find the
record* is how claim-by-proof works at all, and *given this handle, find
the record* is how `watch shroud` resolves. Three secondary keys plus a
directory query is the shape that already made `channels` a collection
(its `memberIds` multikey index answering "channels I'm in"), not the
shape of `name-bank`.

And the path limb gains nothing: a streamer has no place in a titled
tree, and its authorization is an OAuth-proven claim rather than parcel
title.

⚠ Reset policy is **keep** — a listing is not player state, and wiping
the registry nightly would break every persisted tune and the directory
with it. Sandbox: **refuse** (a sandboxed write would rewrite who owns a
real person's channel).

## Democratizing is deleting the singleton, not widening the group

Every environment variable becomes a field on the claimed record:

| today (one owner, by env) | per-streamer |
|---|---|
| `BROADCAST_TOKEN` | a rotatable token on the record |
| `OVERLAY_TWITCH_LOGIN` / `_YOUTUBE_CHANNEL` / `_KICK_CHANNEL` | the record's own platform identities |
| `STREAMER_PLAYER_IDS` → the `streamers` managed group + `requiresStreamer` | **do you own the record you are addressing** |
| the `StreamState` singleton Idea (`mode`, `awayUntil`) | per-streamer state |
| `BroadcastFeed` pushes to every broadcast socket | the feed scoped by the token's streamer |

⭐ **The gate stops being a role and becomes ownership**, which is the
standing "a seat or no check" shape — and it means self-service
registration needs no permission tier at all. `requiresStreamer` and the
`streamers` group should **die** rather than widen, unless requirements
finds a genuine platform-operator power for them to carry; none is known
today.

⭐ **The security posture improves rather than degrades.** One global
`BROADCAST_TOKEN` is a global capability nobody can rotate without a
deploy. Per-streamer it is scoped to one overlay and its owner rotates
it from inside the game.

⚠⚠ **One invariant to hold, and it is the whole security model of the
overlay:**

> **The overlay token READS. The player's session WRITES.**

The token rides in an OBS browser-source URL because a browser source
cannot set headers — the same reason the shipped `?broadcast=` path
exists. That is acceptable for read-only data and *only* for read-only
data. The moment a token can drive the control plane, a leaked OBS URL
is remote control of somebody's stream. The control plane stays on the
authenticated session and the in-game verb, always.

## ⭐ There is no multi-tenant companion app to build

The open question in the capture was whether the `pbox-stream` overlay
app should serve several streamers in parallel. **It should not, because
it cannot need to.** An OBS browser source is single-tenant by
construction — each streamer's OBS loads the URL carrying their own
token. "Several streamers in parallel" is a property of the **server**,
and it falls out of scoping the feed by token, which this build does
anyway to stop hardcoding one person.

So the app stays a renderer, and the real question it was standing in
for is *do we publish the feed contract so a stranger can build their
own overlay* — which is a documentation act plus one REST route, not an
architecture.

## The viewer half — what listing actually buys

⚠ Be precise here, because `watch twitch.tv/shroud` **already works with
no record at all**. The registry adds exactly four things:

1. **A bare short name.** Today a handle with no platform opt is an
   `ambiguous-handle` reject by design; a registry lookup is what makes
   `watch shroud` answerable.
2. **Cross-platform unification** under one name — the user-facing point
   of the whole feature.
3. **Tunes that survive a logout.** `cockpit.tuned` is transient and
   `StreamApi.dropPlayer` drops you from every channel at logout;
   *persisted tunes* is already a named deferred non-goal in
   [streaming.md](../../subsystems/streaming.md) and this is the record
   it was waiting for.
4. **The directory** — the portal for a streamer's audience.

⭐ **The embed-choice problem is nearly free.** The `--twitch` /
`--youtube` / `--kick` opts already exist as the explicit per-command
override. All that is new is a *default* when a record affords several:
the record's own preferred platform, then a viewer setting, then the
shipped fallback. The hardcoded "Twitch-first, Kick-fallback" character
resolve becomes the last rung of that chain rather than the only rule.

## Consent — three questions, and only one of them is real

The capture worried about splitting a streamer's audience. Split it:

- **Embedding** — the platforms ship embed players *for this*, and
  embedded views count toward the streamer's own numbers. This is the
  normal case, not a gray area. ⚠ Confirm the current embed terms of all
  three before leaning on it commercially, and note Twitch's embed
  requires the host domain in its `parent` list.
- **Public directory listing** — implies affiliation, and **this is the
  one that wants consent.** The state ladder already gives it away free:
  an unclaimed record is resolvable but never advertised.
- **Chat relay** — already presence-gated, already public data, and
  posting already requires the viewer's own linked identity. Nothing
  new.

## ⚠ Live status does not scale uniformly

A directory showing *who is live* is the one genuinely expensive read.
Twitch's Helix `streams` is cheap and batches 100 ids per call; Kick is
fine. YouTube's `search.list?eventType=live` is 100 quota units **per
channel**, which is exactly why the shipped code polls **one** channel
every fifteen minutes.

⭐ **The out is already in the code**: the `live_stream?channel=<id>`
embed form tracks the channel's live status client-side. **Let the embed
answer the live question for YouTube instead of the server.** Server-side
live status for Twitch and Kick; a YouTube row in the directory shows its
embed and lets the iframe say.

## Deferred — and one of these is a trap

**The outbound platform-action family is the scope-eater and should stay
out.** Title and category changes, clip creation, polls, predictions,
channel-point redemptions: each needs its own OAuth scope, its own
reauth flow and its own rate limit, and it is the *least* differentiated
thing this platform could build — Streamlabs and StreamElements own that
ground and do it better. Outbound chat already ships for Twitch; that is
the right amount of outbound.

Also deferred: YouTube and Kick chat posting (already tracked in
[streaming.md](../../subsystems/streaming.md)); go-live notifications and
follow-groups; monetization ingest (the patronage track's Phase 4);
per-viewer directory curation.

## ⭐⭐ Sequencing — and what actually blocks a weekly stream

**Nothing here does.** The shipped single-owner path is exactly the
founder case, so the weekly dev stream can start before any of this
lands. What would make that stream *good* is a different question this
slate deliberately does not answer:

> **What does the overlay SHOW?**

Today it is a standby countdown and the owner's own chat echoed back.
For a dev stream about a MUD the interesting feed is **game state** — who
is online, the press ticker, what just got built, a live map — and that
lives in the `pbox-stream` repo plus whatever fields the feed grows.
**Do that first, for yourself.** The multi-tenancy in this slate becomes
nearly free afterwards, and doing it in that order means the feed
contract gets frozen *after* discovering which fields matter rather than
before.

Then, in order:

1. **The record + claim-by-proof.** The collection, self-service
   registration, the OAuth proof, the listed/claimed/consenting ladder.
2. **The per-streamer control plane.** Token, feed scope, `StreamState`
   per streamer, the four env vars retired, `requiresStreamer` replaced
   by ownership.
3. **The portal.** Registry-first resolve, persisted tunes, platform
   preference, the consenting directory, and the documented REST read
   for third-party overlays — `PressRoutes`-shaped: its own route,
   anonymous-by-contract, reads no session.

Waves 1–2 are the build. Wave 3 can split into a second cycle.

## The lens pass

⚠ **Three of the six do not bind, and that is the finding rather than a
gap.** Livestreaming is **interface tier** — it exists to serve a
real-world audience, so it must never be gated by in-world progression
(no competence, no seat, no aether upgrade, works in a brand-new
player's first minute). Registering is an **account** act, never a
character one. Pedagogy, immersion and technology-and-magic have no
opinion here by construction.

- **Creative expression** — the ordinary case is a viewer typing a name
  and it resolving; the bespoke case is a streamer building their own
  overlay against a published contract without asking anyone's
  permission. Both must work without code.
- **Gamification** — the choice forced is *do I claim and consent*, and
  standing is conferred by the platforms, not by us. We measure nothing
  about a streamer and should not start.
- **Economy** — the registry *produces* discovery, *consumes* platform
  API quota, and nobody pays. ⭐ Worth naming: discovery is streaming's
  hard problem and recommendation-with-the-credibility-of-a-person is the
  thing this platform can offer that an ad cannot. The demand was there
  first.

## Open questions for requirements

1. **The YouTube claim proof** — scope-at-link-time, or the
   description-code check?
2. **Does the `streamers` group survive at all?** It should die unless a
   platform-operator power turns up for it.
3. **Handle collision.** Short handles are a flat global namespace (the
   `channels` precedent). First-come? Reserved for a claimant against an
   unclaimed lister? This is the only piece with a real contention
   story.
4. **Does a claimant inherit the listing's identities**, or re-declare
   them? (Inherit, probably — the proof already matched one of them.)
