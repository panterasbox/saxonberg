# Streaming batch — slate-compaction ledger

Batch key: **streaming**. Slates: `tails/dgg-relay-slate.md` ·
`tails/youtube-relay-slate.md` · `tails/kick-relay-slate.md`. Write
list: `docs/subsystems/streaming.md` only — any graduation belonging in
`livestream.md` / `twitch-relay.md` / `display.md` / `connection.md` /
`deployment.md` goes to this ledger's Handoff sections, never into those
docs. Procedure: `.claude/skills/compact-slate/SKILL.md`. Pilot read:
`docs/plans/slate-compaction/pilot.md`.

Findings that hold across all three slates:

- **No dgg transport exists anywhere in the tree.** `grep -ril
  "dgg\|destiny"` across `packages/server/src`, `packages/client/src`,
  `packages/content` returns nothing outside the slate itself. The
  dgg-relay-slate is genuinely UNBUILT and stays mostly verbatim per
  the assignment.
- **YouTube read-only and Kick read-only both shipped exactly as
  `streaming.md` states**, and both slates' own bracket status blocks
  already have accurate `Left:` lists — confirmed by grep, not just
  trusted:
  - No `force-ssl`, no `liveChatMessages.insert`, no quota-accountant
    identifiers (`dailyQuotaUnits`/`quotaAccountant`/`coalesceWindow`),
    no `kick-reauth` implementation (only a comment noting its
    *absence*: `PassportConfig.ts:355`), no `chat:write` grant flow, no
    `kick.com/video` handling, no boot-time webhook-subscription
    reconciliation (only a comment naming it a "named deferred seam" —
    `KickRelayReader.ts:21`, which `streaming.md`'s own Deferred/non-goals
    line already carries verbatim).
  - `GoogleProfile` (`mud/lib/identity/GoogleProfile.ts`) carries
    **no OAuth token fields at all** — no `scopes`/access/refresh token/
    `hasScope`/`applyRefreshedToken`. This settles youtube-relay-slate's
    Q1 ("does GoogleProfile already store OAuth tokens?") as **no** —
    the per-player outbound auth work is exactly as large as the slate
    feared, not smaller.
  - The shipped YouTube reader auth is **env-based**
    (`YOUTUBE_READER_CLIENT_ID`/`_SECRET`/`_REFRESH_TOKEN`,
    `backend/YoutubeClient.ts:142-144`), not a `GoogleProfile`-backed
    reader account — this resolves the slate's Q3 differently than it
    assumed ("its tokens in its `GoogleProfile`" was the wrong guess).
  - `RelaySpeaker.service` and `WatchTarget.platform` are widened to
    `'twitch' | 'youtube' | 'kick'` everywhere (`@saxonberg/types`,
    `StreamRelay.ts`, the two stream controllers) — the shared-type
    touches both relay slates called out are done.
- **Both relay slates' architecture sections describe the pre-unification
  mirror plan** (a self-contained `Youtube*`/parallel surface with its
  own `YoutubeApi`/`YoutubeLogic`), which is explicitly **not** what
  shipped — `streaming.md` states outright: *"There is no
  `mud/api/youtube.ts` / `YoutubeLogic` (nor a kick sibling) — the
  surface is unified on `StreamApi`."* This is the pilot's "shipped in a
  different shape" class (SUPERSEDED by the code), not
  SHIPPED·DOCUMENTED — the actual shape is genuinely different from what
  the slate designed, so each such section is cut with a note naming
  the real shape, not silently treated as if the slate's plan shipped.

---

## docs/slates/tails/dgg-relay-slate.md — 257 → 246 lines · Status UNBUILT → UNBUILT

No dgg transport exists in the tree (verified above). Per the
assignment this slate stays mostly verbatim — the only cut is the one
section that purely restates already-shipped, already-documented
substrate with no dgg-specific design content.

### Cut (SHIPPED · DOCUMENTED)
- `## The inherited surface (the copyable 90%)` (21 lines, was 79–99) —
  code: `obj/StreamRelay.ts` (`channelKey`, presence edges),
  `TwitchClient`/`TwitchRelayReader` (the outbound stack),
  `platform/idea/api/StreamLogic.ts` (`dropPlayer`), `cockpit.tuned`
  (`TuneController.publishTuned`); doc: `streaming.md § The relay
  state`, `§ The transports`, `§ The tuned rail`. Replaced with a
  5-line pointer paragraph (kept the closing "Twitch-shaped minus
  EventSub multiplexing" observation since it's dgg-specific framing,
  not a restatement of shipped mechanism).

### Kept (UNBUILT) — everything else
- Both status blocks (the bracket block; the short 2026-09-01 "design
  conversation, captured" note — not duplicative, no stale history to
  cut)
- Lineage / Sits on / Provenance quote (front matter)
- `## Thesis`
- `## What is actually there (verified 2026-09-01, web)` — third-party
  (dgg's own) API research, nothing in our repo to check it against
- `## The parts that are NOT a copy` (all 4 subsections — single
  channel grammar, the credential category, per-player tokens vs bot
  account, the gate-is-a-person problem) — none of this exists in code
- `## Scope decision` · `## The product framing` · `## Out of scope
  (explicit)` · `## Open questions for requirements` (all 7) · `## What
  this slate does NOT cover`

### Uncertain
- none

### Handoff
- none (nothing here belongs outside `streaming.md`, and the one cut
  was pointed at `streaming.md` itself, which is in my write list —
  no insert needed since the target sections already exist)

### Status block
- Left: unchanged — the dgg WebSocket transport · the anonymous read
  path · the developer-key credential · the two-way write path
- Size: a tail → a tail

---

## docs/slates/tails/youtube-relay-slate.md — 226 → 171 · Status PARTIAL → PARTIAL

Second status block kept (2026-07-02 narrative) — it already correctly
flags both "locked decisions" in `## Thesis` as superseded and names the
outbound design as what's retained; this pass verifies that flag against
code and executes the cuts it predicted.

### Cut (SHIPPED · DOCUMENTED)
- `## The 10% that is NOT a copy` → **1. Transport** (82–96, 15 lines)
  and **2. Live-only binding + liveChatId resolution** (98–125, 28) —
  code: `backend/YoutubeClient.ts` (per-`liveChatId` reads, no
  multiplex), `backend/YoutubeRelayReader.ts` (`resolveChannel`
  live-only bind, stream-end auto-untune); doc: `streaming.md § The
  transports (YouTube)`, `§ YouTube boundaries this cycle`. Replaced
  with one 10-line pointer paragraph (also notes the still-deferred
  stream-start rebind, so nothing in `Left` is dropped)
- `### 5. Shared-type touch` (169–179, 11) — code: `@saxonberg/types`
  `RelaySpeaker.service`/`WatchTarget.platform` widened to
  `'twitch'|'youtube'|'kick'`, `StreamRelay.ts:46`; doc: `streaming.md §
  Identity / rendering`
- Open questions Q2 (`streamList` vs `list`-poll) and Q3 (reader account
  model) (148–154, in the original 193–208 block) — code: `streaming.md
  § The transports (YouTube)` already states the shipped choice
  (`list`-poll day one, `streamList` deferred; env-based
  `YOUTUBE_READER_CLIENT_ID`/`_SECRET`/`_REFRESH_TOKEN`, confirmed at
  `backend/YoutubeClient.ts:142-144` — **not** the `GoogleProfile`-backed
  account Q3 guessed). One-line resolution left per question, since both
  resolved differently than the slate assumed (Q3 especially — worth the
  correction, not just a checkmark)
- `## Suggested internal phasing` → **P0, P1, P2, P4, P5** (211–218,
  222–226, 22 of 46 lines) — code/doc: the read path shipped unified on
  `StreamApi`/`StreamLogic`/`StreamRelay` + the shared `tune`/`watch`
  verbs (`streaming.md § Module layout`); docs landed as `streaming.md`
  itself. **P3 (outbound) kept** — the only unbuilt phase

### Superseded — cut
- `## Thesis` → the two **locked decisions** bullets (39–49, 11 lines) —
  by the code: unified onto `StreamApi`, not a mirrored `Youtube*` stack
  (`streaming.md`: *"There is no `mud/api/youtube.ts` / `YoutubeLogic`"*)
  ; v1 shipped read-only, not full two-way. One-line note left; opening
  Thesis framing sentence (what the doc is about) kept
- `## The parallel surface (the copyable 90%)` (51–78, 28 lines) — by
  the code: the file-inventory table names files that don't exist
  (`YoutubeRelay.ts`, `YoutubeLogic.ts`, `mud/api/youtube.ts`,
  `YoutubeController.ts`, `youtube.yaml`) — the actual layout is
  `streaming.md § Module layout`. The "patterns inherited as-is" list
  (presence-gating, identity bridge, echo-suppress, etc.) is genuinely
  accurate and shipped, folded into the same pointer note rather than
  kept as a separate accurate-but-duplicate list

### Kept (UNBUILT)
- `### 3. Auth: grow GoogleProfile, do NOT mint YoutubeProfile` — no
  code (`GoogleProfile.ts` carries no OAuth token fields at all —
  verified, see Uncertain/finding below)
- `### 4. Quota budget + coalescing/drop` — no code (no
  `dailyQuotaUnits`/`quotaAccountant`/`coalesceWindow` anywhere)
- `## Out of scope (explicit)` (all four bullets — still-valid
  boundaries, none contradicted by the code)
- `## Risks / open questions` Q1 (GoogleProfile tokens) and Q4
  (coalescing UX) — Q1 answered *within this slate* (see Graduated,
  below) rather than left as "verify first"; Q4 genuinely still open
  (outbound is unbuilt)
- `## Suggested internal phasing` → **P3 — outbound**

### Graduated (verified fact, inserted in-slate rather than in a
subsystem doc — the fact belongs beside the design question it answers,
not in `streaming.md`, which already correctly says posting needs
per-player OAuth `GoogleProfile` doesn't have)
- Inserted a 7-line note under `### 3. Auth` stating `GoogleProfile.ts`
  (`mud/lib/identity/GoogleProfile.ts`) carries zero OAuth token fields
  today, and the shipped YouTube reader auth is env-based, not
  `GoogleProfile`-backed — closing the section's own "verify" bullet as
  **no**, load-bearing for how the requirements should size this work

### Uncertain — kept
- none new. (Q4/coalescing UX stays open per the rule; not uncertain,
  just unbuilt)

### Handoff
- none — nothing here belongs outside `streaming.md`, and every pointer
  above targets a section that already exists there

### Status block
- Left: unchanged — outbound `liveChatMessages.insert` · the quota
  accountant + coalescing and drop policy · per-player
  `youtube.force-ssl` OAuth · the `GoogleProfile` token extension +
  `google-reauth`. Verified against the surviving body: §3 (auth) + §4
  (quota) + P3 cover all four items; no orphaned `Left` items
- Size: a wave → a wave

---

## docs/slates/tails/kick-relay-slate.md — 196 → 135 · Status PARTIAL → PARTIAL

The second status block ("Everything below landed as designed") was the
strongest signal in this batch — it directly predicted that the entire
body except the named deferred surface would be cut, and code
verification bore it out for all of it, including all four open
questions.

### Cut (SHIPPED · DOCUMENTED)
- `## Thesis` (38–48, 11 lines) — code: `backend/KickWebhookRoutes.ts` +
  `KickWebhookVerifier.ts` + `KickRelayReader.ts` (the inbound-webhook
  transport); doc: `streaming.md § Kick (read-only, the webhook
  transport)`
- `## The inherited surface (the copyable 90%)` (50–62, 13) — code:
  `'kick'` added to `StreamerTarget`'s `Platform` union, `StreamRelay`'s
  `Service` union (`StreamRelay.ts:46`), `StreamLogic.resolveTarget`/
  `dropPlayer`, `WatchTarget`/`RelaySpeaker.service`
  (`@saxonberg/types`), `StreamEmbed`'s Kick iframe case,
  `OVERLAY_KICK_CHANNEL`; doc: `streaming.md § Module layout`, `§
  Presence-gating`, `§ The transports`
- `### 1. Inbound webhooks — the new transport shape` (66–95, 30) —
  code: as above, plus the dormant-local-dev `isConfigured()` gate; doc:
  `streaming.md § Kick`, which also carries forward the one open thread
  (`KickRelayReader.ts:21`'s named boot-time-reconciliation seam) —
  matches this slate's own `Left`
- `### 2. Account linking — KickProfile` (97–101, 119–120 partial —
  5 lines kept as a pointer parenthetical for the `tune <character>` /
  `RelaySpeaker` external-linked detail; ~18 lines cut) — code:
  `mud/lib/identity/KickProfile.ts`, `kick`/`kick-link` strategies in
  `PassportConfig.ts`; doc: `connection.md` (already covers `KickProfile`
  + the strategies + Kick as co-equal `AuthProvider` — confirmed by
  grep, **outside this batch's write list**, no insert needed) +
  `streaming.md § The target grammar`, `§ Identity / rendering` for the
  linking-lights-up behavior
- `### 3. Rate limits` → the **Reading** bullet (107–110, 4) — doc:
  `streaming.md § Kick` (*"Reading has zero rate-limit exposure"* is
  stated there too). **Posting** bullet kept (Left item)
- `## Scope decision` → **Phase 1** description + sizing paragraph
  (121–124, 130–133, 8) — doc: the status block above already states
  Phase 1 shipped. **Phase 2** bullet kept (Left item)
- `## Open questions for requirements` (all 4, 121–134, 14) — code/doc:
  Q1 signature scheme → `KickWebhookVerifier` (RSA-PKCS1v15/SHA256,
  cached public key, one retry-and-refetch); Q2 subscription lifecycle →
  create/delete per presence edge, not long-lived; Q3 live-status
  semantics → shipped Twitch-style exactly as the slate's own "Expected"
  guess; Q4 dev-tunnel stance → shipped transport-dormant. All four
  stated in `streaming.md § Kick`
- `## Suggested internal phasing (phase 1)` (all P0–P4, 16 lines) — the
  whole of phase 1 shipped; doc: `streaming.md`'s History section names
  the build sequence

### Kept (UNBUILT)
- `## Scope decision` → **Phase 2** (posting via `kick-reauth` +
  `chat:write`)
- `### 3. Rate limits` → **Posting** bullet (endpoint, scope, addressing,
  backoff expectation)
- `## Out of scope (explicit)` (all three bullets — still-valid, none
  contradicted)

### Uncertain — kept
- none

### Handoff
- → `connection.md`: no insert needed — already documents `KickProfile`,
  the `kick`/`kick-link` strategies, and Kick as a co-equal
  `AuthProvider` (verified: `docs/subsystems/connection.md` lines
  31, 44, 52, 57, 61-64). Recorded here only because the cut section
  named that doc as its target and this batch cannot write to it

### Status block
- Left: unchanged — phase-2 posting (`kick-reauth` + `chat:write`
  through the existing throttle/echo-suppress) · boot-time
  webhook-subscription reconciliation · `kick.com/video/…` URL forms.
  The latter two have no design body anywhere in the slate (they were
  always one-liners) and are independently carried in `streaming.md`'s
  own Deferred/non-goals list — nothing lost by their absence from the
  surviving body
- Size: a tail → a tail
