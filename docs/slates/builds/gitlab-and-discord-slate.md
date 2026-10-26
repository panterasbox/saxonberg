# GitLab and Discord slate — announcing what went live, and who is live

> **Status: UNBUILT** — designed at high level 2026-10-24 with the owner. What ships:
> [press](../../subsystems/press.md) — an organization publishes a *release* (a code change, an
> operator decision, downtime, an announcement), carried on the in-game news ticker and
> readable on the start screen; [streaming](../../subsystems/streaming.md) — live detection on
> Twitch (its event feed), YouTube (polling) and Kick (inbound webhooks). Designed elsewhere:
> the live changelog through press ([distribution](./distribution-and-hosting-slate.md) § 8);
> stream state per streamer ([broadcast-ready](./broadcast-ready-slate.md)); GitLab as an
> optional integration ([gitlab-and-packs](./gitlab-and-packs-slate.md) § 6). **Discord: nothing
> exists.**
> **Left:** the one pipeline (the game's release first, mirrored out) · Discord channel webhooks
> · merged against live · the deploy-time "what went live" read · what counts as big · the two
> notes the sweep writes · stream alerts from platform detection, one edited message per stream
> · streamer opt-in · secrets and per-realm adapters
> **Size:** a build

## 0. The ask **[DECIDED — the owner]**

*"We'll wanna integrate with GitLab for issue tracking and other shit, but right now my main
interest is announcing big features merging to master. We'll do this in the game's own
internal engine, but also on the Pantera's Box Discord, which has a GitLab alerts channel and a
Saxonberg chat channel. We also have a stream alerts channel for in the future when I start
streaming, and it announces when I go live. So we'll also want integration with our own
streaming state engine that announces when someone goes live on what platforms (Twitch,
YouTube, Kick)."*

The Pantera's Box Discord's channels:

| channel | carries |
|---|---|
| **#gitlab-alerts** | development activity |
| **#saxonberg** (chat) | what players should know |
| **#stream-alerts** | who is live, and where |

## 1. ⭐⭐ One pipeline — the game's record first **[LEAN]**

```
an event (a merge, a deploy, a stream going live)
  → a press release in the game           ← the record of truth
  → mirrored out to Discord channels      ← copies, by adapter
```

- **The game's release is canonical**; Discord gets copies — if Discord goes away, nothing is
  lost.
- **Discord outbound is channel webhooks** — post a message, and ⭐ edit it later. No bot until
  something must come **in** (chat bridging, roles).
- **Secrets** — the webhook URLs and GitLab's webhook token — live in the deployment's
  [SSM Parameter Store](../../deployment.md) tree like every other secret.
- **Optional per realm** — a realm without Discord or GitLab has no adapters; the press release
  still happens.

## 2. ⭐⭐⭐ Feature announcements — merged is not live **[LEAN]**

A build merges to master, but players can use it only once it is **deployed**, which is a separate
step. So two moments, two audiences:

| moment | where | for |
|---|---|---|
| **merged** | #gitlab-alerts | developers (GitLab's own Discord integration may already do this) |
| ⭐ **live** — after a deploy | the in-game ticker and #saxonberg | players: *you can use this now* |

- **Detecting "live"** — when the server boots after a deploy it compares the commit it runs with
  the last one it announced, and announces what went live between them. The server knows what it
  actually runs, so it never announces a feature that is not there.
- **What counts as big** — not every merge: every build MR is a feature; a design-only MR is not.
  The lean is **a label on the merge request** (`announce`), set at the pre-merge sweep.
- **Who writes the words** — the sweep (`/finalize`) already summarizes the build, so it writes
  **two notes** into the merge request:
  - an **in-fiction line** for the ticker — *"a brickfield opened in the Delight valley"* (the
    distribution slate's live changelog, in the fiction's own channel);
  - a **plain note** for Discord — *"Brickmaking is live: fire bricks in the Delight valley's
    clamp."*

## 3. ⭐⭐ Stream alerts **[LEAN]**

- **The trigger is the platforms**, not the game — someone is live when Twitch, YouTube or Kick
  says so, because that is what viewers can watch. The game's own phase (`stream start`) may post
  *starting soon* ahead of it.
- ⭐ **One message per stream, edited as it changes** — posted when the first platform goes live,
  edited to add the others (*live on Twitch, YouTube and Kick* is one message, not three), and
  edited again when it ends (*was live — watch the VOD*).
- **In the game** — a release on the ticker, and the broadcast-ready slate's *broadcasting* marker
  on the streamer.
- **Who is announced — streamers who opt in**; for other community streamers, the opt-in also names
  which Discord channel carries them. The [streamer registry](./streamer-registry-slate.md) is the
  natural home for the opt-in and the platforms each streamer has proven.
- ⚠ **Names on stream** — the broadcast-ready overlay shows players' names only by opt-in; an alert
  that names who is *watching* or *joining* follows the same rule.

## 4. GitLab beyond announcements **[OPEN]**

The owner's wider wish — *"issue tracking and other shit"* — is
[gitlab-and-packs](./gitlab-and-packs-slate.md)'s (issues with an in-game front door, the pack
guard, the overlay's project feed). This slate needs only GitLab's merge request facts: the
label, the two notes, the merge commit.

## 5. The lens pass

1. **Pedagogy** — none; this is the platform's own voice.
2. **Expression** — the in-fiction changelog line: the world's patch notes as prose.
3. **Immersion** — the ticker stays in the fiction; Discord carries the plain version.
   **Participation** — players watching the world change, and streamers found by the community.
4. **Values** — opt-in for streamers and for names; the game's record as the truth, not the
   third-party copy.
5. **Continuity** — the pipeline outlives any one service; adapters come and go.
6. **Economy** — the stream alert is the front door of the patronage track.
7. **Governance** — what the platform announces is a publisher's act, by the press doctrine.

## 6. Open

1. **Merged, live, or both** — and which channel each goes to.
2. **"Big"** — an `announce` label, or another marker.
3. **The two notes** — written by the sweep, or by hand.
4. **Stream alerts** — platform detection with one edited message, and the opt-in's home.
5. **Webhooks only** — until anything inbound is wanted.
6. **Who publishes** — which organization the platform's releases are published by.
