# Stream relays — cluster-merge ledger

Cluster: **stream relays**. Files: `tails/external-chat-relay-slate.md` ·
`tails/youtube-relay-slate.md` · `tails/kick-relay-slate.md` ·
`tails/dgg-relay-slate.md`. Procedure:
`.claude/skills/compact-slate/SKILL.md` § The cluster-merge pass. Prior
compaction pass (already done, not repeated here): `pilot.md` (external-
chat-relay) and `streaming.md` (youtube/kick/dgg) in this same directory.

**Canonical: `youtube-relay-slate.md`.** It is the file
`external-chat-relay-slate.md`'s own status block names as owning its
one remaining item (*"YouTube outbound … design is owned by
youtube-relay-slate.md"*), and the pilot's streaming.md ledger already
flagged the pairing as a merge candidate (*"nothing here is not also
there"*).

Cross-check for a shared open item **among the three per-platform
slates** (youtube/kick/dgg), per the assignment's example (a shared
outbound-post/quota design in two of them): none found. YouTube's
outbound blocker is a Google Data-API **quota** (`liveChatMessages.insert`
≈ 50 units against a 10k/day ceiling) with no login-token category
problem; Kick's outbound blocker is an **OAuth scope** (`chat:write` via
`kick-reauth`) with a free rate limit and zero quota meter; dgg's write
path is a **non-OAuth per-player bearer token** with an unmeasured rate
limit and a "the gate is a person, not a ToS" permission problem. Three
different credential/throttle shapes, not one design duplicated three
times — kick-relay-slate.md and dgg-relay-slate.md are **KEPT
untouched** (their own subject), no merge into the canonical.

---

## docs/slates/tails/external-chat-relay-slate.md — 50 → 0 lines (retired)

Whole-file retirement. The only body section left by the prior
compaction pass is `## YouTube (deferred — why)` (lines 36–50); every
other line is front matter / status block / *See also*.

### Conservation table

| secondary heading | outcome |
|---|---|
| (front matter: title, two status blocks, *See also* list) | KEPT then dropped with the file — pure bookkeeping, no design content; the *See also* pointers (`auth-providers-slate.md`, `deployment.md`) carry no open design of their own to preserve |
| `*The model below this line … shipped …*` transition note | DUPLICATE → already stated, in more detail, in `youtube-relay-slate.md`'s own status block + Thesis superseded-note |
| `## YouTube (deferred — why)` — Live-only bullet | DUPLICATE → `youtube-relay-slate.md § The 10% that is NOT a copy → 1/2. Transport … Live-only binding` (the shipped tune-time live-reject/auto-untune IS the resolved form of this constraint) |
| `## YouTube (deferred — why)` — Quota bullet | DUPLICATE → `youtube-relay-slate.md § 4. Quota budget + coalescing/drop` (the accountant/coalescing/drop design) and `§ Out of scope` (*quota-increase audit … ops task*) — same constraint, already carried as the canonical's own `Left` item, in more detail |
| `## YouTube (deferred — why)` — closing sentence (*"service field anticipates it … worker interface should not assume Twitch-only"*) | SUPERSEDED by the code — the shipped shape has no `service`-field/worker-interface design at all (`streaming.md`: unified `StreamApi`, per-platform transport module); no open item to move |

Nothing KEPT. Per rule 4, the file is deleted. No open questions to
salvage into the canonical beyond what's tabled above (both bullets are
already represented as `Left` items on the canonical, not merely
mentioned).

### Links re-pointed (outside `docs/slates/README.md` / `docs/roadmap.md`)

The retired file is linked from 8 other locations. None of them cite the
one section that actually moved (the YouTube deferral) — they all cite
the **shipped Twitch binding/relay**, which lives in
`docs/subsystems/twitch-relay.md` / `streaming.md`, not in
`youtube-relay-slate.md` (re-pointing those to the YouTube slate would
misattribute a Twitch citation). Re-pointed each to the doc it actually
describes:

- `docs/slates/builds/delivery-slate.md:55` and `:403` — "the binding
  pattern … mirrored from external reality / mirrored from Twitch" →
  `docs/subsystems/streaming.md` (the shipped general relay mechanism)
- `docs/slates/builds/cooperative-slate.md:77` — "the Twitch binding
  (inbound reader)" → `docs/subsystems/twitch-relay.md`
- `docs/slates/tails/client-shell-slate.md:36` — "Twitch chat ↔ game
  channel" → `docs/subsystems/twitch-relay.md`
- `docs/tracks/broadcast-patronage-track.md:92` (Phase 2, Wave 1) and
  `:148` (Phase 6, Wave 2) — both shipped Twitch phases → each
  re-pointed to `docs/subsystems/twitch-relay.md`
- `docs/tracks/broadcast-patronage-track.md:204` — "Streaming + Twitch"
  reading list → `docs/subsystems/twitch-relay.md`
- `docs/subsystems/twitch-relay.md:144` — "the external-chat-relay slate
  holds the generalization (live-only + quota constraints)" → this
  citation **is** the moved content → re-pointed to
  `docs/slates/tails/youtube-relay-slate.md`

Also fixed the cluster's own internal lineage lines, which named the
now-deleted file as an ancestor:

- `docs/slates/tails/youtube-relay-slate.md` — "Wave 3+ of
  external-chat-relay-slate.md" → "Wave 3+ of the retired
  external-chat-relay-slate (absorbed here)"
- `docs/slates/tails/kick-relay-slate.md` — "(and Wave N of
  external-chat-relay-slate.md)" → "(and Wave N of the retired
  external-chat-relay-slate, absorbed into youtube-relay-slate.md)"
- `docs/slates/tails/dgg-relay-slate.md` — "(Wave N of
  external-chat-relay-slate.md)" → same wording

**Not re-pointed** (left as-is, outside assignment): `docs/slates/README.md:265`
(index — the sweep owns it) and the two historical ledgers in this
directory, `pilot.md` and `streaming.md`, which describe past states of
a file rather than link forward to live content.

---

## Canonical re-stamp — docs/slates/tails/youtube-relay-slate.md

No new `Left` items — both DUPLICATE bullets were already represented
(quota accountant / live-only binding), so nothing to absorb beyond the
lineage-line correction above.

- **Status:** PARTIAL → PARTIAL (unchanged)
- **Left:** unchanged — outbound `liveChatMessages.insert` · the quota
  accountant + coalescing and drop policy · per-player
  `youtube.force-ssl` OAuth · the `GoogleProfile` token extension +
  `google-reauth`
- **Size:** a wave (unchanged)

## kick-relay-slate.md / dgg-relay-slate.md

Untouched except nothing (their lineage lines were fixed above as a
link re-point, not a cluster-merge content change). No sections moved
in or out; each remains PARTIAL / UNBUILT as before.
