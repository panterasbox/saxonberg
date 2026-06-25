# Implementation plan — influence: producer stock & conviction voting

Phase 2 plan for
[influence-allocation-requirements.md](../requirements/influence-allocation-requirements.md).
Grounded in the shipped consumer + renown substrates (today
`lib/participation/` + `lib/renown/`, consolidated into `lib/standing/` by
this build — see Decisions; plus `ConsumerLogic` / `RenownLogic`), which
this mirrors (shares no code). Ephemeral — retired at the finalize sweep
once graduated into a subsystem doc.

## Decisions taken (settled — user + planner)

- **One directory, `lib/standing/` — consolidate `lib/participation/` +
  `lib/renown/` + the new provenance/producer/conviction value objects.**
  These are *one system* (how contribution and conduct become governance
  standing), so they share one home. Named `standing` (not `influence`)
  because the value objects already *are* `*Standing`, and renown is **not
  subordinate to influence** — it has its own non-influence readers (NPC
  reactions, disguise, social), so a neutral name is correct. What moves
  in: all of `lib/participation/` and `lib/renown/` (value objects), the
  cross-stock `InfluenceStanding`/`Band`, and the new `AuthoringEvent` /
  producer / conviction value objects. What stays put (module taxonomy):
  the `*Api` faces in `api/` and `*Logic` singletons in `obj/api/`. The
  consolidation is a mechanical refactor (move files + update imports
  across `consumer.ts`, `influence.ts`, `renown.ts`, the logic singletons,
  `StandingController`, and renown's own readers). **Sequencing: Phase 0
  (the durability re-key) is its own MR off `master` at the *current*
  paths; this consolidation is the first commit of the feature build**
  (after Phase 0 merges) — a pure move before any new files. Keeping them
  separate avoids bloating Phase 0's MR with a big file-move diff. The
  `participation.md` + `renown.md` subsystem docs likely merge into one at
  the finalize sweep (flagged, not done now).
- **All standing keys on the durable `templatePath`, banked per-Player.**
  The whole engagement cluster (renown / participation / producer) keys
  identity on the durable `templatePath` (`/obj/Avatar/<playerId>` for an
  avatar — per-Player, ≡ `playerId`; a real template path for NPC
  subjects), the belief-store precedent. Producer's routing key is the
  author's `templatePath` (resolved via the append-only authoring ledger —
  §2, not a mutable stamp).
  The **User-level rollup** (sum across a User's Players — the Sybil
  anchor) is **deferred to the franchise/voting gate**: banking stays
  per-Player, and because production doesn't dilute under a sum, playing
  multiple avatars costs a producer nothing (the user's requirement).
  **Permissions-at-User** (the trust principal is the human, not the
  avatar) is a separate future direction, out of scope here.
  [[influence-banking-level]]
- **The cluster keys on *ephemeral* `stuffId` today — that is a bug, fixed
  FIRST (Phase 0).** Renown + participation + the `standing` verb all key
  on the Avatar instance's `stuffId`, which is re-minted on re-clone
  (reboot/relog), so standing silently resets. Producer must be built on
  the durable `templatePath`, so the durability fix lands before any new
  producer code.
- **Released-content gate = path-prefix** (`/home/…` homedir, `/obj/…`
  engine earn nothing; the rest of `domain` is "released"). Zero new
  infra; matches the shipped tree. A richer **team-sandbox + explicit
  `release` action** does not exist and is **deferred with the team
  split** (new infra: a `released` flag or `/sandbox/` prefix).
- **Conviction reset is hard-reset of `realSince` on flip** (one fewer
  AppSettings key) rather than a graceful flip-decay half-life.
- **`ProducerEvent` carries a `weight` field now** (default 1),
  forward-compatible with the deferred team split so it needs no
  migration.

## Phase 0 — durability fix (prerequisite, own branch/MR off `master`)

**The bug (confirmed in source).** The whole engagement cluster keys
identity on the Avatar instance's **`stuffId`**, which is re-minted when
an Avatar is re-cloned (server reboot/deploy — and likely relog), so a
member's renown, participation, and consumer standing silently reset. The
belief store deliberately avoided this by keying on the durable
`templatePath`; this cluster did not. Concretely:

- `ReactionFiredEvent.subjectId` = `payload.speaker.stuffId`; `reactorId`
  = reactor `stuffId` (`lib/events/ReactionFiredEvent.ts`,
  `obj/ReactionRegistry.ts`).
- Renown stores `subject`/`source` from those ids (`RenownLogic`
  `appendFromReaction` / `appendFromReception`).
- Participation stores `subject` = `CommandDispatchedEvent.subjectId` =
  `giver.stuffId` (`CommandGiver.ts:742`, `ConsumerLogic.appendFromDispatch`).
- The `standing` verb reads all three by `actor.stuffId`
  (`StandingController.ts:30`).

**The fix — store the durable id, resolve scope with the live id.** The
subject id is used *two ways*: as a stored aggregation key, and as a
live-resolution handle (`resolveScope` → `GroupApi.sharedManagedGroups`,
`AddressApi`, the `(speaker,listener)` dedup). Decouple them: at capture,
**resolve scope using the live `stuffId`** (as today), but **store
`templatePath`** as the `subject`/`source`; reads (`renownOf`,
`participationOf`, the standing verb) key on `templatePath`. For an avatar
that's `/obj/Avatar/<playerId>` (per-Player, durable); for an NPC, its
template path.

**Renown and participation must change together** — the consumer
projection multiplies `renownOf(x) × participationOf(x)` on one key, so
re-keying only one half breaks the product (and a half-keyed state would
silently zero consumer standing).

**Touch points** (confirm exact call sites during implementation):
the `noteReactableAct` producer sites (Vocal / Soul / `ChannelCatalogue`)
and `ReactionRegistry` (where `subjectId`/`reactorId` are built);
`ReactionFiredEvent`; the reception path (`act.subjectId`,
`listenerId = perceiverId`); `RenownLogic` (`subject`/`source` storage vs
`resolveScope` live args); the participation fire site
(`CommandDispatchedEvent.subjectId`) + `ConsumerLogic.appendFromDispatch`;
`StandingController`.

**Data.** Existing `renown_events` / `participation_events` rows are keyed
on now-orphaned ephemeral `stuffId`s; they decay out on their own
(real-time/game-time half-lives) or can be truncated — **no migration
needed**, the standings rebuild from the re-keyed logs.

**Tests.** A cross-reboot durability test: append signal as `stuffId` X →
"re-clone" (new `stuffId` Y, same `templatePath`) → standing persists
under the `templatePath`. Plus: the consumer product aligns
(`renownOf(path) × participationOf(path)` non-zero for a participating,
regarded subject).

## 1. Producer stock (the third faucet)

Value objects in `lib/standing/`, mirroring `ParticipationEvent` /
`ParticipationStanding`:

- **`ProducerEvent extends Document`** — `collectionName =
  Collections.ProducerEvents`; fields `author` (the credited author's
  durable `templatePath` — the routing key), `actor` (the engaging
  player's `templatePath` — same space, for `A≠P` + dedup), `zonePath`,
  `bucket` (`floor(realAt/bucketMs)`), `weight` (default 1),
  `kind:'engagement'`, `at`, `realAt`. **Dedup `{author, actor, bucket}`**
  (find-or-skip): "one player spamming one author's zone can't inflate
  it"; a bucket credits an author once per actor.
- **`ProducerStanding extends Document`** — `collectionName =
  Collections.Producer`; `subject` = author `templatePath`, `scope='*'`;
  warmed `_cache`; rebuilt by `recompute()`. Copy the participation shape,
  share no code. The per-Player→User sum is a deferred franchise-gate
  read, not stored here.

Api/logic singleton, twin of `consumer.ts` / `ConsumerLogic.ts`:

- **`ProducerApi`** (`api/producer.ts`) → **`ProducerLogic`**
  (`obj/api/ProducerLogic.ts`, `/obj/api/producer`). Surface: `boot`,
  `append`, `recompute`, `producerOf(authorPath)`,
  `standingOf(authorPath)`, `eventsFor` — keyed on the author's durable
  `templatePath`. Gated `FromModule('mud/api/producer#ProducerApi')`,
  `SecurityApi.decorateApiClass`.
- **Formula is engagement-only** (no `× regard`): `scalar =
  producerOf(author)` (decayed attributed-engagement count) →
  `InfluenceStanding(author,'producer',scalar,Band.fromScalar(scalar,…))`.
  No `RenownApi` read. **Real-time** decay (two clocks; `at` parity only).
  `PRODUCER_RECOMPUTE_MS = 60_000` code constant (cadence = mechanism).
- Wire `api/influence.ts`: `if (stock==='producer') return
  ProducerApi.standingOf(subjectId);` ('patron' stays defined-zero).
- Boot (commit 3): `await ProducerStanding.warm()` + the recompute
  schedule only. The **engagement tap is NOT wired here** — it needs the
  location-carrying signal *and* `ProducerLogic` in `restrictSubscribe`,
  both of which land in the shared-signal commit (§3 / commit 6). Commit 3
  is provable via direct `ProducerApi.append`, no tap required.

## 2. Authoring ledger (provenance) — NOT a mutable stamp

Authorship is an **append-only ledger**, derived not stored — the
`renown_events` / `chronicle` "dumb store, smart consumer" pattern, *not*
a `createdByPlayerId` field (a mutable `domain` prop is not an authority;
it broke the no-mutable-prop rule and exposed a re-stamp hole). This is
the **first concrete brick of the provenance substrate**
([provenance-slate.md](../slates/builds/provenance-slate.md)); its code
lives in the consolidated **`lib/standing/`** (authorship is the producer
faucet's input — part of the one standing system — so it shares the home,
not a separate dir).

- **`AuthoringEvent extends Document`** (`lib/standing/`) —
  `collectionName = Collections.AuthoringEvents`; fields `path` (the
  authored template path), `author` (the authenticated author's durable
  `templatePath`), `kind` (`'save'`, open vocab), `at`, `realAt`. Indexed
  on `{path}` (derive authorship) and `{author}`. Append-only — one row
  per authoring act; nothing is ever overwritten.
- **`ProvenanceApi`** (`api/provenance.ts`) → **`ProvenanceLogic`**
  (`obj/api/ProvenanceLogic.ts`, `/obj/api/provenance`). Surface:
  `recordAuthoring({path, author, …})` and `authorOf(path):
  durableId | null` — the v1 derivation = the **earliest** `AuthoringEvent`
  for `path` (the original author; the contributor-set / team split is the
  deferred enrichment). Gated `FromModule('mud/api/provenance#ProvenanceApi')`,
  `SecurityApi.decorateApiClass`.
- **Append site** — `obj/api/TemplateLogic.ts` `saveTemplate` appends one
  `AuthoringEvent` per save, attributed to the **authenticated giver**
  (threaded from `WriteController` → `TemplateApi.saveTemplate`), `author
  = giver.getTemplatePath()`. The append is on the gated, access-checked
  write path only; the author is never client-supplied and never read from
  the author-controlled `data` blob.
- **No `Template` field, no `data` surface, no overwrite** — closes the
  re-stamp / first-save / audit-gap holes. Operator-trust residue (a
  developer forging ledger rows) is the *same* irreducible boundary as
  `renown_events`, answered by tamper-evidence + transparency + exit
  later — i.e. it meets the existing bar, doesn't lower it.

## 3. Shared-signal change — HIGH RISK, behavior-preserving

- **Carry location on `CommandDispatchedEvent`**: add optional
  `locationTemplatePath?` and `actorTemplatePath?` to the payload. Thread
  `location` into `_emitInputEcho` (the fire site ~`CommandGiver.ts:739`
  doesn't currently receive it; it's in the outer scope) and read
  `location.getTemplatePath()` + the giver's `getTemplatePath()` at the
  fire block. Optional fields ⇒ consumer tap unchanged. (Note: after
  Phase 0 the consumer `subjectId` is itself the giver's `templatePath`.)
- **`restrictSubscribe` snoop-gate trap** (`api/event.ts:306`): the
  owner-guard refuses a second single-consumer call, and `configureProp`
  **clobbers** the policy with only the latest call's consumers. So a
  naive `restrictSubscribe(KIND, ProducerLogic)` would **break the
  consumer tap**. Fix: a **single call lists BOTH** —
  `restrictSubscribe(KIND, ConsumerLogic, ProducerLogic)` — asserted
  idempotently (HMR-safe). Recommended: a neutral boot-time assertion (or
  both taps re-assert the full pair). **Isolate in its own commit + its
  own regression test** (both may subscribe, a third is refused; consumer
  rows byte-identical with the field present/absent).

## 4. Routing-resolver seam (Layer-1 authorship / Layer-2 faucet)

- `lib/standing/CreditRouting.ts`: `interface CreditShare { author:
  string; weight: number }` where `author` is the credited author's
  durable **`templatePath`**. `resolveCredit(locationTemplatePath):
  CreditShare[]` — `ZoneApi.resolveZoneForPath` → the zone's template path
  → `ProvenanceApi.authorOf(zoneTemplatePath)` (the author's durable
  `templatePath`, derived from the authoring ledger); **released gate**
  (return `[]` for `/home/…` or `/obj/…`); return `[{author, weight:1}]`
  or `[]`.
- `resolveCredit` is a **pure function** — built and unit-tested in this
  commit (5) against seeded zones/ledger, no live event needed. The
  `appendFromEngagement` tap that *calls* it on a fired dispatch — for
  each share with `author !== actorTemplatePath` (**A≠P**, same
  `templatePath` space), `append({author, actor, zonePath, weight})`,
  bucket-dedup in `append` — is **subscribed in commit 6** (it needs the
  signal's `locationTemplatePath`/`actorTemplatePath` + `ProducerLogic` in
  `restrictSubscribe`). v1 resolver returns one owner; the future team
  split returns a weighted vector behind the **same** seam — Layer 2
  (faucet) built once, untouched.

## 5. Conviction substrate (the spend half) — Api + tests only

- **`Position extends Document`** (`lib/standing/`): `{subject, stock,
  target, yea, nay, since, realSince}`, one row per `{subject, stock,
  target}`; `subject` is the holder's durable `templatePath` (the same key
  `standingOf(subject, stock)` reads). Split yea/nay permitted. Conviction
  **derived on read**:
  `convictionFraction = clamp01((now - realSince)/buildPeriodMs)` (linear
  ramp). **Flip resets `realSince`** (conviction restarts); **drop**
  deletes the row. No stored weight is authoritative.
- **`ConvictionApi`** (`api/conviction.ts`) → **`ConvictionLogic`**
  (`obj/api/ConvictionLogic.ts`) — needs the logic singleton (reads
  `InfluenceApi.standingOf`). Surface: `hold(subject,stock,target,{yea,
  nay},now?)`, `flip`, `drop`, `positionOf(…,now?)`,
  `tally(stock,target,now?)`. `now?` defaults `Date.now()` — the testable
  clock seam.
- **`tally`** returns a `ConvictionTally` value object (`lib/standing/`) =
  `Σ standingOf(p.subject,stock).scalar × convictionFraction(p,now) ×
  (p.yea − p.nay)` over positions on `{stock,target}` — the per-house bill
  number. **Full weight / no pool** (`hold` never consults other targets;
  no `Σ≤scalar`). **Non-fungible** (rows partition by `stock`). **No verb.**

## 6. `standing` self-view → three stocks

`obj/command/social/StandingController.ts`: all three stocks key on the
actor's durable `templatePath` (post-Phase-0) — `bandOf(actorPath,
'consumer')`, `bandOf(actorPath, 'producer')`, patron (defined-zero "not
yet earnable") — all **bands, never scalars** (D6). Returns `void`, rides
the envelope. Update `standing.yaml` help to the three-faucet model.

## 7. AppSettings (seeded from YAML, no code defaults)

`producer.bucketSeconds`, `producer.decayHalfLife`,
`conviction.buildPeriodSeconds`. **Reuse** `influence.bandThresholds`
(stock-agnostic). Test-only fallbacks via the `settingNumber(key,
fallback)` helper (as `ConsumerLogic`); real values in the seed YAML.
New `Collections` enum members (`ProducerEvents`, `Producer`,
`Positions`, `AuthoringEvents`) + their indexes in the PM boot-index block.

## 8. Test strategy (per acceptance criterion)

Mirror the collection-aware fake-Mongo harness from
`ConsumerLogic.recompute.test.ts` (`_resetForTesting` caches; seed
AppSettings; controllable real-time via explicit `realAt`/`now`).

- **Producer**: live non-zero vs zero; A≠P + own-zone-earns-nothing
  (end-to-end via a fired event); released-gate (`/home/A/…` earns
  nothing); **replay invariant** (drop standing → replay → identical);
  bucket-dedup; real-time decay.
- **Authoring ledger**: a save appends one `AuthoringEvent` attributed to
  the authenticated giver; `authorOf(path)` derives the earliest author; a
  later save by a different player does **not** change `authorOf` (append-
  only, original-author derivation) and is **not** client-spoofable
  (author never from `data`); access-gated write path only.
- **Signal**: snoop-gate widened-by-exactly-one (third class refused);
  consumer rows byte-identical.
- **Conviction** (controllable `now`): hold→build, flip→reset, drop→gone;
  full-weight/no-pool; non-fungibility; persistence round-trip (conviction
  recomputes from dwell, not stored); tally signs.
- **Standing view**: three bands, never a raw scalar.

## 9. Build order

**Phase 0 lands first, on its own branch/MR off `master`** (a standalone
bug fix to merged code — see Phase 0 below); the influence build (commits
1–8) then sits on the durable foundation. Each commit green on
test/lint/build.

0. **Durability fix** — re-key the engagement cluster `stuffId →
   templatePath` (own branch/MR). Renown + participation must move
   together (the consumer projection multiplies them on one key).
1. **Consolidate `lib/participation/` + `lib/renown/` → `lib/standing/`**
   (mechanical: move value objects + update imports across the Apis,
   logic singletons, and renown's readers). Pure refactor, green before
   any new files.
2. AppSettings keys + `Collections` enum + indexes + YAML seed.
3. Producer value objects + `ProducerApi`/`ProducerLogic` + `InfluenceApi`
   wiring + replay/dedup/decay tests (faucet provable via direct
   `append`, before touching the signal).
4. Authoring ledger (`lib/standing/AuthoringEvent` + `ProvenanceApi`/
   `ProvenanceLogic` + append in `TemplateLogic.saveTemplate` +
   WriteController threads the authenticated giver + tests).
5. Routing resolver + released gate + A≠P + tests.
6. **Shared-signal change** (the RISK commit, surgical + isolated):
   payload widening, `_emitInputEcho` threading, the `restrictSubscribe`
   two-consumer fix, **and wiring the producer engagement tap**
   (`appendFromEngagement` subscribes; `ProducerLogic` joins the
   allowlist) — this is where producer first earns from live engagement.
7. Conviction substrate (`Position`/`ConvictionTally`/Api/Logic + suite).
8. `standing` self-view + subsystem doc + the Art. IV §2 constitution
   phrasing revision (flagged for the finalize sweep, not silently
   edited).

## Risks

- **Phase 0 cross-subsystem re-key** is the heaviest risk — the subject id
  is used both as a storage key *and* as a live-resolution handle
  (`resolveScope` → `GroupApi.sharedManagedGroups` / `AddressApi`). The
  fix decouples them: **store `templatePath`, resolve scope with the live
  `stuffId`** at capture time. Touches merged renown — hence its own MR.
- **`restrictSubscribe`** is the highest risk in the feature build (commit
  6) — the owner-guard + policy-clobber means a naive call breaks the
  consumer tap; isolated with its own regression test.
- **Released-gate** has no existing marker — the `/home/`+`/obj/` prefix
  gate is the zero-new-infra v1; the richer team-sandbox + `release`
  action is deferred with the team split.
- **`lint:pm` / PersistApi**: no concern — new `Document` subclasses are
  sanctioned framework; connection guarding via `PersistApi.isConnected()`.
  `lint:gates` satisfied by `decorateApiClass` + `FromModule` on every new
  Api/Logic.
