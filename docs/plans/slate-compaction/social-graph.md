# Slate compaction ledger — batch `social-graph`

Slates: `docs/slates/tails/social-graph-slate.md`,
`docs/slates/tails/connection-origin-slate.md`.
Doc I may insert into: `docs/subsystems/social-graph.md` only.

## Findings (pre-pass)

- Both slates already carry heavy self-annotation (inline `SHIPPED`
  markers, strikethroughs) from a prior pass. Verified against code
  anyway per the skill — most annotations hold, a few don't (below).
- `docs/subsystems/social-graph.md` is comprehensive and current; most
  of both slates' remaining "live design" text is actually already
  superseded by what shipped in a *different, richer* shape than
  either slate sketched (`NotifyRule` fields survived almost verbatim —
  `nameRendering`/`boostInDense` — but the bucket-keyed
  `NotificationPolicy`/`DisplayPolicy` interfaces, the priority-integer
  conflict rule, and the four system-buckets table did not).
- **Wave 4 of social-graph-slate.md is stale in a load-bearing way**:
  two of its three bullets (custom display policies per-bucket, bucket
  priority adjustment) already shipped — `notify <ref>
  --render/--boost/--color` and `--above`/`--below` reorder, both
  documented in social-graph.md's own "The `notify` verb" section.
  Only "account-level bucket federation across characters" remains.
- **The canonical status block's `Left` item "Wave 4 recognition-state
  coupling — consent friending and recognition-gated bucketing" does
  not match the slate's own Wave 4 body** (which lists display
  policies / priority / federation, not recognition coupling). The
  underlying claim is corroborated by `contacts.md` ("Still deferred…
  mutual/consent friending… tracked in social-graph.md + its slate's
  Wave 4") but **contradicted by social-graph.md's own Non-goals list**
  ("Mutual / consent friending — bucketing stays unilateral + private"
  — read as a *decision against*, not a deferral). Flagged under
  Uncertain in the per-slate section below; not resolved here — it's a
  cross-doc conflict, not something grep can settle.
- Verified in code: `ContactsController.executeAdd` has no recognition
  check — "recognition-gated bucketing" (you can't bucket a stranger)
  is genuinely still unbuilt, matching the slate's claim.
- Verified in code: `RenownLogic`/`renown.ts` never reference contacts
  or `ContactsGroupProvider` — the "buckets are a private attention
  lens, never a reputation input" claim holds. Not explicitly stated in
  social-graph.md today → graduated (see below).
- Verified: no `whois`/`locate`-for-players verb exists (`locate.yaml`
  is the unrelated containment-chain verb, `perceiver.md`'s territory).
  `ConnectionApi.originOf` returns `{ country? }` only — no `ip` field,
  no wizard gate present. Confirms connection-origin-slate's `Left` is
  accurate as stated.
- `comms.md` has zero mentions of foes/friends/profanity/trust-tiered
  messaging — the social-graph-slate's "Comms slate" cross-reference
  note is genuinely still unbuilt and undocumented anywhere. Kept
  verbatim (comms.md is outside my doc list regardless).
- `persistence.md` has zero mentions of contacts/notify — the "buckets
  at scale" flagged-for-follow-on note is likewise still open. Kept.

## docs/slates/tails/social-graph-slate.md — 496 → 121  · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- second narrative status block (old "Status: Wave 3 SHIPPED…", 20 lines) — history superseded by the canonical block; one status block per pilot calibration.
- "**Storage half SHIPPED.**" paragraph (14 lines) — code: `packages/server/src/mud/lib/social/Contacts.ts`; doc: `contacts.md` (already the See-also pointer).
- `## Principle` numbered list + result paragraph (18 lines) — code: `lib/social/NotifyPolicy.ts`, `lib/social/NotifyRule.ts`; doc: `social-graph.md` §§ intro, "The rule store".
- `## Bucket shape` — code block + multi-bucket paragraph + "System-defined buckets" table (75 lines) — code: `Contacts.ts`, `ContactsGroupProvider`; doc: `social-graph.md` § "Policy subject — any GroupRef" / "The reserved baseline" (the four reserved identifiers table is the shipped realization).
- `## Bucket shape` § "User-defined buckets" (19 lines) — code: `ContactsController.ts`; doc: `contacts.md`.
- `## Notification policy` (whole section, 42 lines) — code: `lib/social/NotifyRule.ts` (`NotifyRule.onConnect/onDisconnect/onMessage`); doc: `social-graph.md` § "Notification policy — the presence fan-out" + "Non-goals" (onEnterRoom/onLeaveRoom/onActivity/onProximity explicitly dropped, not shipped).
- `## Display policy — bucket-keyed verbosity` (whole section, 57 lines) — code: `NotifyRule.nameRendering`/`boostInDense`, `SocialLogic.composeOccupants` density table; doc: `social-graph.md` §§ "Display lensing", "Density tiers + verbosity" (thresholds `<10/10-30/30-100/>100` match verbatim), "The rule store" (`social.verbosity`).
- `## Worked scenario — a busy tavern` (whole section, 53 lines) — superseded: depicts `banner` surface and `onEnterRoom` notifications, both removed/never shipped per `social-graph.md`'s own History ("An early iteration routed a banner surface into a … toast stack; that was deliberately removed") and Non-goals.
- `### Recognition slate` sub-note under "What this stresses" (6 lines) — superseded: bucket storage is `ContactsMixin`, not a recognition-record field.
- `### Messaging subsystem (api/mml.ts)` sub-note (5 lines) — superseded by the actual `composeOccupants`/`LookController` seam; doc: `social-graph.md` § "Display lensing".
- `### Settings framework` sub-note (4 lines) — **the slate's claim is factually wrong**: `social.verbosity` is declared `static settings` on `NotifyPolicyMixin` (schema-on-owner), not the `EnvironmentMixin` keyspace — doc: `social-graph.md` § "The rule store" states this explicitly.
- Open questions Q1, Q3, Q4, Q6, Q8, Q9, Q10 — each resolved and documented: doc §§ "Presence frames render inline" (Q1: movement isn't a notification event), "ruleFor, strict ordered first-match" (Q3), "Similarity grouping" (Q4), "The reserved baseline" (Q6: strangers precedes everyone-else), "The rule store" (Q8: 50-rule soft cap — reinterpreted from "buckets" to "rules", flagged below), "Policy subject" (Q9: any `GroupRef` incl. managed groups already covers institutional roles), "Presence frames render inline" (Q10: banner/queue itself was later removed — see Uncertain).
- `Build order` Wave 1 + Wave 2's shipped bullet (7 lines) — code/doc: `contacts.md`.
- `Build order` Wave 3's full body (26 lines) — code/doc: `social-graph.md` (this is our own doc's territory, described there in far more depth).
- `Build order` Wave 4's first two bullets ("Custom display policies per-bucket", "Bucket priority adjustment") — code: `NotifyController.ts` (`--render`/`--boost`/`--color`, `--above`/`--below`); doc: `social-graph.md` § "The `notify` verb".

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## Principle` callout "Buckets are a *private attention lens*, never a reputation input" (7 lines) — code: `RenownLogic.ts`/`api/renown.ts` never reference contacts or `ContactsGroupProvider` (verified by grep) — inserted at `social-graph.md` § "Non-goals (this build)" as a new bullet.

### Superseded — cut
- `See also` bullet for `recognition-slate.md` corrected in place (not cut, but its false claim "bucket data lives on recognition records" fixed to name `ContactsMixin` — the code proves the original claim false).

### Kept (UNBUILT)
- `### Comms slate` sub-note under "What this stresses" — `comms.md` has zero mentions of foes/friends/profanity/trust-tiering; genuinely unbuilt and undocumented anywhere.
- `### Persistence framework` sub-note — `persistence.md` has zero mentions of contacts/notify; genuinely unaddressed.
- Open Q5 (cross-character bucket sharing) and Q7 (bucket-membership-change events) — no code addresses either.
- `Build order` — "Recognition gating…deferred to recognition-family build" bullet (verified: `ContactsController.executeAdd` has no recognition check) and "Account-level bucket federation across characters" bullet (matches `social-graph.md` Non-goals: "per-character v1 (Wave 4)").
- `## What this slate does NOT cover` — kept whole (scope/spine).
- Framing paragraph ("The framing insight…") — kept per spine rule (states what the slate is for), despite echoing `social-graph.md`'s opening — not a "shipped decision" section, it's the slate's own orientation text.

### Uncertain — kept
- **Left-item conflict**: the (now-retired) narrative status block and `contacts.md` both describe "mutual/consent friending" as *deferred, tracked in social-graph.md's Wave 4*, but `social-graph.md`'s own Non-goals section states "Mutual / consent friending — bucketing stays unilateral + private," which reads as a decision **against** ever building it, not a deferral. I did not assert "consent friending" as a Left item (the body has no section supporting it as live work), but the cross-doc conflict is real and unresolved — a human call, not a grep call.
- **Q8's shipped shape shifted**: the original Q8 asked about a *max buckets per player* (contacts labels); the "resolved" cross-reference in the old Wave-3 paragraph pointed to the **50-rule** cap on `NotifyPolicyMixin` rules — a different axis. No cap on contacts labels exists in code (verified: no `MAX`/cap constant in `lib/social/Contacts.ts`). So contacts-label-count is still technically an open question, just not one anything in the current body raises. Flagging rather than silently dropping.
- **Q10's cited resolution is itself now stale**: the old Wave-3 paragraph resolved Q10 as "banner→queue," but `social-graph.md`'s own History records that the queue/toast surface was later removed (presence renders as a plain inline frame). The *question* (channel routing) is genuinely settled either way (there's only one channel now), so the cut stands — noting only that the specific mechanism named in the old resolution text no longer exists.

### Handoff (belongs in a doc outside my list)
- (none — the two remaining truly-unbuilt cross-slate notes, comms trust-tiering and persistence-at-scale, are UNBUILT, not shipped-undocumented, so they stay in the slate rather than moving to comms.md/persistence.md.)

### Status block
- Left: "the message-restyle live wiring (needs a sync contacts fast-path) · Wave 4 recognition-state coupling — consent friending and recognition-gated bucketing" → "message-restyle live wiring · recognition-gated bucketing (deferred to the recognition-family build) · account-level bucket federation across characters · comms trust-tiered message policy (foes drop / friends bypass filters — comms-slate territory, untouched) · bucket-scale persistence follow-on · bucket-membership-change events"
- Size: a wave → a tail (what remains is several small, scattered items riding other builds, not a cohesive wave)

## docs/slates/tails/connection-origin-slate.md — 211 → 168  · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- second narrative status block ("Status: scoped, buildable, small.", 9 lines) — history, one status block per pilot calibration.
- `## Principle` items 1 (Capture) and 2 (Derive) (6 lines) — code: `packages/server/src/services/websocket/WebSocketService.ts`, `packages/server/src/backend/Application.ts`; doc: `social-graph.md` § "Country of origin".
- `## Capture — the WS-upgrade seam` body (code snippet + explanation, 15 lines) — verified verbatim against `WebSocketService.ts` (XFF-first-hop extraction) and `Interactive.recordOrigin`; replaced with a 6-line shipped-summary + the one still-true caveat (multi-hop XFF).
- `## Derive — the geo lookup` body (14 lines) — code: `Application.ts` `geolocateCountry` (confirmed `geoip-lite` + `Intl.DisplayNames`); replaced with a shipped-summary noting the shape difference (below).
- `## Expose` — the "**Country**" bullet + Consumer item 1 (the connect-notification consumer) (9 lines) — code: `ConnectionApi.originOf` (`packages/server/src/mud/api/connection.ts`) returns `{ country? }`; doc: `social-graph.md` § "Country of origin" ("the relay reads originOf(actor).country for arrivals only").
- Open questions Q2, Q3, Q4, Q5 (front half), Q6 (14 lines) — each resolved: Q2 (country shown whenever known, no opt-in — matches `social-graph.md`), Q3 (shipped via `Intl.DisplayNames`, not the leaned static map — shape difference, noted), Q4 (`geoip-lite` confirmed in `package.json`), Q5 front half (`Interactive` is never persisted — confirmed, no Mongo write of origin anywhere), Q6 (module home resolved differently than leaned — see Uncertain/shape-shift below).
- `## Build order` steps 1, 2, 4, 5 (13 lines) — all shipped; step 5's plan to fold docs into `connection.md` did NOT happen — it landed in `social-graph.md` instead (noted in the replacement text, not silently dropped).

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- (none new from this slate — see the cross-cutting fix below, which is a correction rather than a graduation.)

### Fixed (doc statement the code proved false)
- `social-graph.md`'s Module-layout table claimed "Country of origin | `api/connection.ts` (`ConnectionApi.originOf`/`recordOrigin`, `geoip-lite`)…". Code check: `ConnectionApi` (`packages/server/src/mud/api/connection.ts`) has no `recordOrigin` method at all — `recordOrigin` is a method on `Interactive` (`packages/server/src/mud/platform/idea/Interactive.ts`), called directly from `backend/Application.ts` (bypassing the mudlib Api entirely for the write path), and the `geoip-lite` import + the pure `geolocateCountry` function live in `Application.ts`, not `api/connection.ts`. Corrected the table row in place. Same wrong claim also appeared in this slate's own "Partially shipped" callout (`ConnectionApi.recordOrigin`) — fixed there too, in-slate (not a subsystem-doc edit, so no separate ledger line needed for that one beyond this note).

### Superseded — cut
- (rolled into the Cut/Fixed entries above — most of this slate's remaining detail was "shipped, same shape," not superseded-by-different-design; the two true shape differences — geo function lives in the backend not a mudlib Api, and display-name rendering uses `Intl.DisplayNames` not an authored value-object — are called out inline in the kept "Derive"/"Open questions" text rather than filed as separate cuts, since the *fact of the shift* is itself the remaining thing worth a reader knowing.)

### Kept (UNBUILT)
- `## Principle` — "Expose, split by privilege" bullet + the PII-posture callout (still binding, still governs the undone IP-gate work).
- `## What it is — and isn't` scope table — kept whole (spine/scope, still accurate).
- `## Expose` — the IP-gate bullet, the lookup-verb bullet (verified absent in code: no `whois`/`locate`-for-players verb exists; `locate.yaml` is the unrelated containment-chain verb).
- Open Q1 (verb name + scope) — genuinely still open.
- `## What this slate does NOT cover` — kept whole (spine).

### Uncertain — kept
- None new for this slate (Q6's shape-shift and Q3's shape-shift are stated as fact, not flagged uncertain, since code directly confirms both).

### Handoff (belongs in a doc outside my list)
- (none — everything shipped from this slate is already documented in `social-graph.md`, which is in my doc list; `connection.md` was the slate's *original* intended home but the actual graduation landed in `social-graph.md` instead, so there's nothing left to hand off.)

### Status block
- Left: "the developer-gated IP read · the `whois`/`locate` lookup verb · city / region resolution · a persisted last-seen country" → "the developer-gated IP read · the `whois`/`locate` lookup verb · city / region resolution · a persisted last-seen country · multi-hop `X-Forwarded-For` trust (single-hop only today)" — the last item is a small addition surfaced from the kept Capture section, not previously in Left.
- Size: a tail → a tail (unchanged)
