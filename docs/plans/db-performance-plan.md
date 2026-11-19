# Database performance — implementation plan

Makes the world ask its database less, ask it in batches, save everything it
owns when it stops, and key participation on the person. Executes
[db-performance-requirements.md](../requirements/db-performance-requirements.md);
seeding slate
[db-performance-slate.md](../slates/tech-debt/db-performance-slate.md)
(§ Reuse ledger for the plan). **Kind:** refactor/sweep (performance, plus one
correctness fix). **Leads from:** kernel. No pack, no content row, no new verb
a player sees.

## ⚠ Requirements corrections — confirmed by the owner, 2026-11-18

Planning found three places where the requirements doc was wrong or short.
**All three are accepted and the requirements doc is corrected** (C1: the
original "start fresh" ruling stands; C2: all three scoring services; C3:
the producer actor fix is in this build, as its own commit; D3: a login
screen earns nothing). The record of what was found:

- **C1. The slate's original § 1 was right; the requirements' correction of
  it is wrong.** A player's main body does **not** have a per-player template
  path. `StuffApi.clone` stamps `templatePath` with the seed row and the
  identity separately (`api/stuff.ts:729-731`); the main body is cloned from
  `TemplatePaths.primaryAvatar` = `/platform/agent/PrimaryAvatar`
  (`EmbodyController.ts:714-722`, `lib/paths.ts:43`), and
  `Stuff.getTemplatePath()` returns that row for **every player**
  (`lib/stuff/Stuff.ts:543-557, 722-726`). The `Avatar.getTemplatePath(playerId)`
  at `lib/character/Avatar.ts:680` is a **static** that builds the identity
  string, not the instance read. So on master every player's participation
  is filed under the one subject `/platform/agent/PrimaryAvatar`, every
  shade's under `/platform/agent/ShadeAvatar`, and every reader that asks by
  identity (`standing`, the profile, the dashboard field) reads **zero**
  participation — the consumer stock is zero for everyone. Only the login
  roster reads the lineage key, and it shows every player the same shared
  band. Consequences for the agreed scope:
  - The fix is the same code the requirements ask for (D1). No rekey, no
    migration: the collapsed rows stay and decay, read by nobody.
  - The acceptance line *"their earlier standing is intact"* is vacuous:
    there is no per-player earlier participation. After the fix each
    player's participation **starts at zero and accrues** — which, for every
    identity-keyed reader, is where it already is today.
  - The login roster's band changes from the shared figure to the player's
    own (lower at first). That is the fix, and it is player-visible.
- **C2. There are three scoring services, not two.** `ProducerLogic` (the
  labor stock) runs the same 60 s whole-history pass
  (`ProducerLogic.ts:56, 219, 388`). The acceptance line *"the scoring
  services' database traffic is a constant"* cannot be met with one of three
  left as it is; the plan treats all three alike (D4–D6).
- **C3. The producer stock has the same key defect on its `actor`.** The
  dispatch payload carries `actorTemplatePath: giver.getTemplatePath()`
  (`lib/command/CommandGiver.ts:1154`), so every player is one actor: an
  author is credited once per bucket however many players engage, and the
  self-credit exclusion (`share.author === actor`, `ProducerLogic.ts:~155`)
  compares an identity to a lineage and never fires for a player. The plan
  fixes it beside participation (D2). This raises producer credit to what
  [participation.md](../subsystems/participation.md)'s sibling doc says it
  measures; it is the one place this build changes a number a stock
  produces, and it is its own commit.

A fourth observation, decided in the plan (D3) and **confirmed by the owner**:
every connection's `Login` object (no identity, no template) is credited as
a participation subject under its raw `stuffId`, one new subject per
connection, forever.

## Grounding

Verified by opening the files, on `reqs/db-performance` at `a0caa6bb5`
(master `8b169a9a7`), 2026-11-18. Paths are under
`packages/server/src/` unless they start `packages/`.

**The database layer.**
- `backend/PersistenceManager.ts` — `MongoClient` with `maxPoolSize: 10,
  minPoolSize: 2` (`:470-471`). `#inFlight` counts
  `connectionCheckOutStarted` minus `connectionCheckedIn`/`CheckOutFailed`
  (`:474-477`) — waiting **plus** in use, not either alone; `whenQuiet`
  reads it (`:510`). The driver is `mongodb` 6.21.0; its
  `ConnectionCheckedOutEvent` carries `durationMS`.
- The query trace (`:42-122`): `SAXONBERG_QUERY_TRACE=1` records
  `{n, ms}` per `op collection {keys} ← caller chain` into the module-private
  `_qstats`, dumped to the console every 30 s and on SIGUSR2. Off, it is one
  boolean test per op. It captures a stack per op when on, so a traced run's
  timings are not evidence.
- Public ops: `save` (`:622`, through `dispatchSave` `:978` → sandbox policy
  switch → `withSlot` → around-save hooks → `persistSave` `:1350`, an
  `updateOne {$set}` by `_id` or an `insertOne`), `find`, `findById`,
  `distinct`, `delete`, `deleteMany` (`:742`; skips per-id hooks, reserves
  the slot, applies the sandbox policy). **No `bulkWrite`, `insertMany` or
  upsert-by-key anywhere** in `packages/server/src` or any pack `src/`.
- Around-save hooks are registered for **one** collection: `content`
  (`mud/platform/idea/hooks/hooks.yaml` → `DomainHook`). The resident
  `content` cache is patched in `persistSave`.
- `mud/api/persist.ts` — `PersistApi`, the decorated chokepoint
  (`find`/`findById`/`distinct`/`save`/`delete`/`deleteMany`/`whenQuiet`/
  `isConnected`); `lint:pm` forbids `PersistenceManager.get()` outside
  `backend/**`, `api/hot-reload` and this facade.
- `mud/lib/persistence/Document.ts` — `save()` (`:256`) stamps `updatedAt`,
  preloads field marshallers, `toDocument()`, `PersistApi.save`. It records
  no authoring event and runs no hook of its own.
- `services/Server.ts:220-231` — `/stats` returns `connections`, `objects`,
  `uptime`, `registryReads`, `cpu`, `loop`, `walkWrites`; cumulative
  figures a reader subtracts. Nothing about the database.

**The scoring services** (`mud/platform/idea/api/`).
- `ConsumerLogic.ts` — `durableKey` = `getTemplatePath() ?? stuffId`
  (`:75-76`), used by the dispatch tap (`:151`). `appendImpl` (`:127-145`)
  does a `find({subject, bucket})` **per dispatched command**, then a save
  on a miss. `recomputeImpl` (`:202-226`): `ParticipationEvent.find({})`,
  then per subject a `find` + `save` (`upsertStanding`, `:181-196`), then
  `ParticipationStanding.warm()` (a `find({})`). Score = Σ
  `Decay.byHalfLife((realNow − ev.realAt)/1000, halfLife)` — one
  exponential, real time. `standingOfImpl` (`:246`) multiplies
  `RenownApi.renownOf(subjectId)` by `participationOfImpl(subjectId)`.
- `RenownLogic.ts` — `durableKey` = `getIdentityPath() ?? stuffId`
  (`:83-84`). `recomputeImpl` (`:514-548`): `RenownEvent.find({})`, per
  subject × scope a `find` + `save`, then `warm()`. Score (`:352-378`) is
  **not** one exponential: reactions sum linearly with two half-lives
  (esteem for positive valence, notoriety for negative), receptions sum a
  decayed weight that enters as `receptionValence × ln(1 + Σ)`; game-time
  `at`. Shipped half-lives are finite (`renown.decayHalfLives`: 7 d / 30 d,
  `packages/content/platform/content/settings/renown.yaml`). `seedToImpl`
  saves events directly and schedules a debounced fold (`:411-420`);
  `lib/commerce/DonationBank.ts:413` calls `RenownApi.recompute()` after an
  append.
- `ProducerLogic.ts` — the third: same pass (`:212-236`), same per-command
  `find` dedup on `{author, actor, bucket}`, score = Σ `weight ×` one
  real-time exponential.
- All three: `*_RECOMPUTE_MS = 60_000`, a one-pass-at-a-time guard on the
  logic singleton, and reads off a `WarmedIndex<number>` held by the
  standing Document class (`lib/standing/RenownStanding.ts`,
  `ParticipationStanding.ts`, `ProducerStanding.ts`;
  `lib/persistence/WarmedIndex.ts`). Each standing row already stores
  `value`, `recomputedAt` (game s) and `recomputedRealAt` (ms). The
  standing collections are derived caches (`schema/renown.yaml`: sandbox
  `shadow`/`skip`, `reset: wipe`); their `{subject, scope}` index is not
  unique.
- Readers and the key each passes: `StandingController.ts:38`
  (`getIdentityPath() ?? stuffId`), `ProfileLogic.ts:307` (identity),
  `lib/character/Avatar.ts:498` (identity), `ConvictionLogic.ts:183, 205`
  (`p.subject`), **`platform/idea/Login.ts:488-490`
  (`a.getTemplatePath()`)**.
- `ShadeAvatar` extends `Avatar`, so its `getIdentityPath()` is
  `/platform/agent/Avatar/<playerId>` (`lib/character/Avatar.ts:768-771`);
  its lineage is `/platform/agent/ShadeAvatar` (`ConditionLogic.ts:~990-1000`).
- Gates: `lint:person-keys` (ceiling 0) matches only a `kind: 'player'`
  owner literal fed by `getTemplatePath()`; it does not see these sites.

**The shutdown save.**
- `services/Server.ts:310-336, 345-357` — SIGTERM → `stop()` →
  `AppBootstrap.shutdown()` → `closeAllConnections()` (synchronous
  `ws.close()` per socket) → `process.exit(0)`. No deadline.
- `backend/AppBootstrap.ts:283-319` — clock snapshot, `RecordApi.flush()`,
  then `PersistableApi.captureAtShutdown()`, logging a count.
- `PersistableLogic.ts:723-740` — `captureAtShutdownImpl`: a serial
  `for … await captureImpl(host)` over
  `StuffApi.findByMixin('PersistableMixin')`, filtered by
  `capturesAtShutdown()`. `captureImpl` (`:1203-1289`): resolve the owner
  key, preload marshallers, take the snapshot **synchronously**, flush
  goods owned by others to their estates, then
  `serialRecordWrite(scope+owner, find-then-save)` (`:1272-1282`, the
  per-record queue at `:1291-1305`), then recurse into dependents.
  `holder_snapshots` has a **unique** `{scope, owner}` index.
- ⚠ `lib/persistence/Persistable.ts:278-283` — `capturesAtShutdown()` is
  `false` for a host with an interactive: *"an Avatar captures at logout, on
  its own seam."* But at shutdown nothing awaits a logout: the sockets are
  closed synchronously and the process exits. **A connected player's body
  is not captured at shutdown**; it comes back from its last periodic save
  (`Avatar.startAutoSave`, `lib/character/Avatar.ts:1486`). The drive's
  step 6 stops the world with the thirty still standing, so this is in
  scope (D9).
- The wire runner kills an owned world 15 s after SIGTERM
  (`packages/wire/src/runner/boot.ts:256-261`);
  `packages/wire/src/harness/world.ts:564` `restartWorld()` waits up to
  180 s on the listener.

**The hot callers the slate named** (ranking is W0's, not this list's).
- Banking: `accountsOfImpl` (`BankingLogic.ts:201-204`, a `find({owner})`
  behind `primaryAccountIdOf`/`accountIdsOf`, `:2748-2752`);
  `entriesForImpl` (`:2419-2428`, two finds); `EmploymentLogic.ts:1214-1220`
  calls `ensureVenueAccount` then `entriesFor(account).length === 0` to
  decide whether a business has had its opening advance. Only balances are
  warmed (`AccountBalance`).
- Advancement: `lib/advancement/Advancement.ts:211-232` `bandsForImpl`
  reads `TranscriptEntry.find({owner})` on every call. The file already
  holds two `DerivedStandingCache` instances kept fresh by `refresh()` on
  append.
- Chattel: `platform/idea/ChattelRegistry.ts` — `setPlace` (`:92-102`)
  find + save; `stamp`/`transfer` (`:133-151`) = `upsert` (find + save,
  `:167-174`) + an event insert. `lib/retail/ConsignmentShelf.ts:230-281`
  `consignBy` adds `chattelOwner()`, `primaryAccountIdOf`, `stampChattel`.
- Frames: `RecordLogic.ts:271-287` — the 1 s drain saves one row per
  round trip, serially.

**The drive's tools.**
- `packages/wire/tests/call-security-performance.dirty.wire.test.ts` — the
  shape to copy: `QUIET`/`RECORD` switches, a committed baseline JSON,
  `noWorse` (10%), the `ev()` eval helper (an AsyncFunction built from a
  quoted string, because the command line splits on `;`), the precheck that
  waits for the box to settle, every-MR steps beside quiet-box steps.
- `packages/wire/src/harness/crowd.ts` (`runCrowd`, `quietBoxRefusal`,
  `foreignMeter`, `CROWD_PLACE = /world/terminus/market/square`),
  `world.ts` (`stage`, `restartWorld`, `advanceWorldClock`).
- The spawned world inherits the runner's environment (`boot.ts`
  `serverEnv`), so `SAXONBERG_QUERY_TRACE=1` reaches it; its log is
  `packages/wire/.wire/server.log`.
- `mud/api/test-harness.ts` — `@TestOnly` statics behind the `testharness`
  verb (`packages/content/platform/content/platform/cmd/system/testharness.yaml`,
  one controller per subcommand under
  `mud/platform/idea/cmd/system/TestHarness*Controller.ts`). `stage()` calls
  only `set*`/`add*`/`pond`/`invalidateCache` on a Stuff at a path: it
  cannot append standing history. **No tool stages past players.**
- Killing a player from a drive: the founder's
  `eval --parcel /world/lounge --on <name> return (this.beginDying('exsanguination', 1), 'dying')`
  (`client-surface.dirty.wire.test.ts:76-88, 211`; the scheduler performs
  the death outside the eval). The founder may `config <key> <value>`
  (`requiresPrimeMinister`; `economic-bootstrap.dirty.wire.test.ts:133`).
- Working precedents: `shelf consign` in
  `controllers-are-io.dirty.wire.test.ts:1231-1239`; `clock on`, pay and
  `bank deposit` in `economic-bootstrap.dirty.wire.test.ts` and
  `trades-and-labor.dirty.wire.test.ts`.
- The worktree's database is the hosted cluster (the URI is
  `mongodb+srv://` on a `mongodb.net` host; checked without printing it).

**Siblings in flight** (never gate on their merge):
`origin/build/failure-model` edits `BankingLogic.ts`, `api/banking.ts`,
`Charge.ts`, the pay and tip controllers; `origin/build/aether-devices`
edits `ChattelRegistry.ts` (`stamp` gains `bound`, an in-memory `boundIds`),
`ChattelLogic.ts`, `Chattel.ts`, `ChattelRecord.ts`, `Advancement.ts` (+4);
`origin/build/soak-repair` edits the wire runner's log pipe in `boot.ts`.

## ⭐⭐ New substrate

Seven items. P9–P14 for each are in § Convention conformance.

| # | item | ledger row |
|---|---|---|
| S1 | **`PersistApi.saveMany(collection, writes)`** → `PersistenceManager.saveMany`, with the call-shape type `BatchWrite` and the instance method **`Document.toBatchWrite(opts?)`** that produces one | *batched writes* — **genuinely new** (searched `bulkWrite`, `insertMany`, `saveMany`, `upsert:` in `packages/server/src` and every pack `src/`: none). One capability, one Api static. |
| S2 | **`PersistApi.dbStats()`** → `PersistenceManager.stats()`, and the `db` field on `/stats` | *the database's numbers* — generalizes the pool counter and the trace's `_qstats`; no new counter mechanism |
| S3 | **`BatchOnHookedCollectionError`** in `PersistenceManager.ts`, beside `SandboxWriteRefusedError` | part of S1 (its typed refusal) |
| S4 | **Three persistent fields on `RenownStanding`** (`esteem`, `notoriety`, `reception`) and the standings' warmed index holding a point (value + the instant it was computed) instead of a bare number | *scoring only what changed* — generalizes the existing pass and `WarmedIndex`; no new class |
| S5 | **`recompute(opts?: { full?: boolean })`** on `ConsumerApi`/`RenownApi`/`ProducerApi` | *scoring only what changed* — an option on an existing static |
| S6 | **`ShutdownCaptureReport`** (`{ captured, failed, ms }`), the return type of the existing `PersistableApi.captureAtShutdown()` | *the shutdown save* — generalizes its `number` |
| S7 | **`TestHarnessApi.stageStandingHistory(count)`** (`@TestOnly`), the `testharness standing-history` subcommand and its controller, the wire helper of the same name | *the crowd drive* — a staging tool this build owes (no tool stages past players); rides the existing `TestHarnessApi`/`testharness` verb |

Not new substrate: the drive file and its baseline JSON (*reuse* row); the
per-caller read caches of W5 (*reuse the pattern* row — `WarmedIndex` on
`AccountBalance`, a third `DerivedStandingCache` in `Advancement.ts`, plain
memo maps in logic files). No new mixin, Api class, hook, registry,
document kind, collection, module category, exported helper or `isWizard`
check.

**Is the specific one gone?** (P1's second half.) S1 does not replace
`save`: a single hooked, `_id`-addressed write is still `save`'s. The
callers that move to `saveMany` stop calling `save` for those rows (the
frame drain, the three passes, the capture write). The three passes are
edited in place; no second pass is left standing beside them.

## Plan-level decisions

**D1. Participation keys on the person.** `ConsumerLogic.durableKey`
returns `getIdentityPath() ?? stuffId`'s identity half (see D3 for the
fallback); `Login.rosterFigures` reads `a.getIdentityPath()`. Nothing else
moves: `standingOfImpl` then multiplies two identity-keyed figures.
Existing rows are kept and not rekeyed (no migrations); they are subjects
nobody reads, and decay. *Why:* the reuse-ledger row; C1.

**D2. The producer's actor keys on the person.** `CommandGiver.ts:1154`
sends the giver's identity path; the payload field is renamed
`actorTemplatePath` → `actorIdentityPath` (every reader is in the kernel:
`ProducerLogic`, the settling-ship tap in `platform/idea/Ship.ts`; grep
`packages/content` before the commit — review question B4).
`locationTemplatePath` stays: a place's lineage is the right key for credit
routing. *Why:* C3; same defect class, found by the same census.

**D3. A giver with no identity is skipped, not credited under its
`stuffId`.** The participation and producer taps append only when the
giver resolves an identity path. A `Login` (pre-embodiment commands) is not
a person; its raw `stuffId` is a subject no reader can ever ask for, and one
is added per connection. *Why:* review question P3 — a read that finds
nothing is a skip; the present fallback's *"never drops a signal"* keeps a
signal nobody can read. Renown's fallback is left alone (its subjects are
resolved from acts between bodies; not measured as a problem). ⚠ Owner's
eye: this stops writing rows that are written today.

**D4. A pass re-scores the subjects that changed; the first pass after a
start is full.** Each of the three logic files keeps a module-private
`let dirty: Set<string> | null = null` (the `pendingSeedFold` precedent in
`RenownLogic.ts:411`). `null` means *everything*. Every append that writes
a row adds its subject (the author, for producer) after the write;
`seedToImpl` adds its subject. A pass:
1. takes the set and replaces it with an empty one (before its first
   await; a failed pass puts the subjects back);
2. empty set → returns, **zero round trips**;
3. `null` → today's whole-history read; otherwise one
   `find({ subject: { $in: [...] } })` (`author` for producer);
4. scores exactly as today, per subject (× scope, for renown);
5. one `PersistApi.saveMany` keyed on `{subject, scope}` (chunks of 500);
6. patches the warmed index per entry (`WarmedIndex.put`); a full pass
   builds the whole map and `replaceWith`s it. **No `warm()` after a pass.**

The set is memory only. It is lost on a restart or a hot reload of the
logic file, and `null` is what a fresh module holds, so the next pass is
full and correct by construction — no cursor to persist, no timing margin.
A full pass is also forced when the value function changes (D6).
`recompute()` runs a pass now (dirty, or full when `null`);
`recompute({ full: true })` forces a full one (S5; the tests that write
events directly use it). *Why:* the ledger row says the pass is generalized
and no scheduler is added; a persisted cursor would be a timing rule with a
safety margin, and the full pass at a start costs three round trips per
service once.

**D5. Decay is derived when a standing is read, so an idle subject needs
no pass.** Today a subject nobody touches is re-scored every 60 s only so
its decay advances. The stored figure is instead read *as of* its instant:
- participation and producer (one exponential):
  `value × Decay.byHalfLife((now − recomputedRealAt)/1000, halfLife)` —
  both fields are already on every row, so existing rows work unchanged;
- renown: the pass stores the three sums its score is built from, each
  decayed to the pass instant — `esteem` (positive reactions), `notoriety`
  (negative reactions), `reception` (the reception weight before the log).
  A read computes
  `(esteem·dₑ + notoriety·dₙ + receptionValence·ln(1 + reception·dₑ)) × qualityWeight`
  with `dₑ`, `dₙ` the two half-life weights over `now − recomputedAt`
  (game seconds). `value` is still written (the figure at the pass
  instant). A row without the three fields (written before this build)
  reads its flat `value`, as today, until the first full pass rewrites it.

In each logic file the scoring is split so there is **one definition**:
`scoreEvents` returns the sums; a module-private `combine(sums, ageS, …)`
produces the figure, called with age 0 by the pass (for `value`) and with
the read's age by `renownOfImpl`/`participationOfImpl`/`producerOfImpl`.
The warmed index holds `{ value, at, …sums }`; `_putForTesting(key, n)`
keeps its signature and stores a point with no instant (read flat).
*Why:* this is the only way an idle world makes no round trips while a
standing still decays; it is the slate's own suggestion (*"the
derive-on-read doctrine may answer it"*). ⚠ What it does to the answer:
the figure read at instant T equals what a full pass at T would store, to
floating-point rounding (decay-then-sum vs sum-then-decay) — and is
*fresher* than today's, which is up to 60 s stale. W3's test proves the
equality to 1e-9 relative and that every band agrees.

**D6. A changed value function forces a full pass.** Each pass computes a
fingerprint of what scoring reads from settings (half-lives, bucket width,
context multipliers, quality weight, reception valence, and for renown the
emote valences) and compares it with the last pass's; a difference sets
`dirty = null` first. The fingerprint is computed on every fire, idle or
not; it must cost no round trip (`AppApi.setting` is a warmed read;
⚠ verify `SoulApi.all()` is too — see Risks). *Why:* stored sums are only
valid for the function that made them.

**D7. `saveMany` is a keyed batch write at the chokepoint.**

```ts
// backend/PersistenceManager.ts — re-exported as a type by api/persist.ts
export interface BatchWrite {
  doc: Record<string, unknown>;
  /** Field names forming the row's key. Omitted: by `_id`, else an insert. */
  key?: readonly string[];
  /** With `key`: insert when no row matches (default true). */
  insert?: boolean;
}
// PersistApi
static saveMany(collection: string, writes: readonly BatchWrite[]): Promise<number>
// Document (instance)
public async toBatchWrite(opts?: { key?: readonly string[]; fields?: readonly string[]; insert?: boolean }): Promise<BatchWrite>
```

One `collection.bulkWrite(ops, { ordered: false })` per call (the caller
chunks). Per write: `key` → `updateOne(pick(doc, key), { $set: rest,
$setOnInsert: { createdAt } }, { upsert: insert !== false })`; `_id` →
`updateOne({_id}, {$set})`; neither → `insertOne`. Returns the number of
rows written or matched. `toBatchWrite` does what `Document.save` does
before its write (stamp `updatedAt`, preload marshallers, `toDocument()`)
and, given `fields`, keeps only those plus the key — a partial write.
How it coexists with what `save` does:
- **Hooks:** a collection with a registered around-save hook is refused
  with `BatchOnHookedCollectionError`, checked before anything is sent. A
  hook may rewrite or veto a document; skipping it silently is the defect.
  Only `content` is hooked, and nothing batches it. (`deleteMany` skips
  hooks; a delete has nothing to rewrite.)
- **Sandbox policy:** the switch in `dispatchSave` (`:985-1026`) is lifted
  into one private method both paths call, so it is one sentence: `refuse`
  throws, `stamp` stamps every doc **and its key filter**, `pass`+`mark`
  marks, `shadow`/`skip` writes nothing and returns 0, an unclassified
  collection throws.
- **Re-entry:** runs inside `withSlot('<collection>:save')`.
- **The content cache:** dropped whole after a batch on a cache-engaged
  collection (as `deleteMany` does) — unreachable while `content` is
  hooked, and correct if that ever changes.
- **The per-record queue** in `PersistableLogic` stays the caller's: it
  orders writes of one record; a keyed upsert makes each write atomic
  (D8).
- **Provenance:** `Document.save` records none, so there is none to keep.
  `authoring_events` rows are written by explicit `recordAuthoring` calls,
  untouched.
- **The trace and the counters** record it as one op (`saveMany`) with
  its row count.

*Why here:* `PersistApi` is the one decorated door and `lint:pm` keeps it
so; a static on `Document` would be a new `lib/` static (`lint:lib-statics`
ceiling 334) with no author caller, and an instance method needs no rise.

**D8. A capture is one keyed write; the shutdown sweep prepares in
parallel and writes in chunks.** `captureImpl` is split at its existing
seam into *prepare* (everything through the synchronous snapshot and the
estate flush; returns `{ scope, owner, state, place }` or nothing) and
*write*. The ordinary path's write becomes one
`saveMany([record.toBatchWrite({ key: ['scope', 'owner'] })])` inside the
same `serialRecordWrite` queue — one round trip where there were two, and
atomic against the unique index (the E11000 race the queue was added for
cannot occur; the queue still orders two captures of one record).
`captureAtShutdownImpl`: wait for the queue's in-flight writes to settle;
then, over the hosts (dependents flattened in), prepare with bounded
concurrency (6 — the pool less headroom for the estate flushes) and write
each 25 prepared records as one `saveMany`, as they complete. A kill at any
moment has saved every chunk already written. It returns
`ShutdownCaptureReport`, and `AppBootstrap.shutdown` logs
`shutdown captured <n> persistable host(s) in <ms> ms (<f> failed)` — the
line the drive reads. No deadline is added to `Server.stop()` and no grace
is raised (the requirements' surface decision). *Why both:* concurrency
alone, at the measured 1.6–2.0 s a host, does not reach 30 s for 172 hosts;
the batch removes the per-host write, and W0's trace says what the
remainder of the 1.6–2.0 s is (see Risks).

**D9. The shutdown sweep captures connected bodies too.**
`capturesAtShutdown()` loses its `isHasInteractive` exclusion. The race it
guarded (a logout capture beside the sweep's) is ordered by the per-record
queue, each writing a whole valid snapshot; and at shutdown no logout
capture is awaited by anything, so today the exclusion means *not saved*.
Guests and opted-out hosts are still skipped by `optedOutOfPersistence`.
**Conditional on W0:** it lands if the baseline's step 6 shows a connected
player coming back without something acquired since their last periodic
save (expected); if the baseline shows them whole, D9 is dropped and the
record says why.

**D10. The instrument: always-on counters at the chokepoint, callers on
demand.** `PersistenceManager.stats()` returns, all cumulative since boot
(a reader subtracts two reads, as with `cpu` and `loop`):

```ts
{ pool: { max, inUse, waiting, waited, waitMs, peakWaiting },
  roundTrips,                       // connectionCheckedOut events: one per wire command, getMores included
  ops: { n, ms },                   // PersistenceManager calls and their wall time
  byOp: { '<op> <collection>': { n, ms } },
  callers?: [{ key, n, ms }] }      // top 60 of _qstats, only when SAXONBERG_QUERY_TRACE=1
```

`inUse` = checked out − checked in; `waiting` = started − checked out −
failed; `waited` = checkouts that started with `inUse === max` (the count
of operations that queued for a connection); `waitMs` = Σ the checkout
events' `durationMS`. `byOp` is counted in the same place the trace hooks
today (`_qrec`'s call sites, made unconditional for the count; the stack
capture stays behind the flag). `/stats` gains `db: PersistApi.dbStats()`.
*Why:* per-op-per-collection counts cost two clock reads and rank the hot
paths with no distortion; the per-caller table needs a stack per op and is
taken in a separate, untimed run.

**D11. Which hot paths are cut — by rank, and each must earn its place.**
W0 records, for drive step 3, round trips per act for each *path* (a named
set of `byOp` keys divided by the number of acts of that kind) and the
traced caller table. The candidates and the cut each would get:

| path | `byOp` keys | the cut |
|---|---|---|
| H1 the taps' dedup | `find participation_events`, `find producer_events` | a module-private last-credited-bucket memo per subject (per author+actor for producer) in the logic file: the `find` runs once per subject per bucket, not once per command |
| H2 payroll and the venue's account | `find bank_accounts`, `find bank_ledger` | a second `WarmedIndex` on `AccountBalance` (owner → its accounts' ids, primary first, patched where accounts open and close) answering `accountsOf`/`primaryAccountIdOf`/`accountAt`; and in `EmploymentLogic` a memo of *this account has ledger rows* (monotonic: once true, always true) in place of `entriesFor(…).length === 0` |
| H3 competence bands | `find transcripts` | a third `DerivedStandingCache` in `Advancement.ts` holding the per-owner fold, refreshed where the other two are (after a transcript row is persisted); `bandsForImpl` awaits it on a miss |
| H4 placing and stamping a good | `find chattel`, `save chattel`, `save chattel_events` | `setPlace` → one keyed partial write (`key: ['chattelId']`, `fields: ['place','pin']`, `insert: false`); `upsert` → one keyed partial write of `owner`, `titledAt` (and whatever the stamp carries after aether-devices: the write names its fields, so `bound` is carried by adding it to the list) |
| H5 frames | `save player_frames` | the drain's rows in one `saveMany` — **unconditional**, the ledger's row and `saveMany`'s first consumer (W2) |

The rule (the D8 of call-security-performance): the candidates are taken
in W0's order of *round trips per act × acts per second*; **a cut lands
only if its path's round trips per act at least halve** in a re-run of
step 3's counting phase, and no other path or timed figure regresses;
a cut that does not is reverted to the wave's own start (never
`origin/master` — CLAUDE.md worktree rule 7) and recorded. A path W0 ranks
below 5% of step 3's total round trips is not taken. Paths W0 finds that
are not in this table are added to it in place, with a P1 line (review
question B1).

**D12. The pool stays at 10 unless the cuts leave waiting.** If step 3
still shows `pool.waited > 0` after W5, the size is raised in steps (16,
then 24) to the first value at which a re-run shows zero, and the drive
record states the figure and the cluster's connection limit it was checked
against; never above 24 in this build. *Why:* the requirements' surface
decision; a bound keeps one worktree from spending a shared limit.

**D13. Step 4 makes buckets short.** A participation row is one per
subject per 10-minute bucket, so a death inside one bucket shows nothing
either way. The step sets `participation.bucketSeconds` to 2 with the
founder's `config`, and restores it in `afterAll`.

**D14. The baseline.** `DBP_RECORD=1` writes
`packages/wire/tests/db-performance.baseline.json` from W0's code — master's
behavior plus the instrument, the staging tool and the drive, none of which
changes what master does. It holds the timed figures, the per-path round
trips per act, the idle window's scoring round trips, the shutdown report,
step 7's recorded decisions, and — from a second, traced, untimed run
(`DBP_TRACE=1`, which also sets `SAXONBERG_QUERY_TRACE=1` for the world) —
the caller table per phase. Step 4 is expected to **fail** at W0 and the
baseline records that it did (review question B2 for that checkpoint).

## ⭐⭐ Host placement

No new mixin and no new class that composes onto anything. Each new member
and field:

| item | host | what it claims about the rest of the host set |
|---|---|---|
| `saveMany`, `stats` | `PersistenceManager` / `PersistApi` | the layer every collection passes through; both are about *every* collection. No guard narrows it: the hooked-collection refusal is a typed throw for a caller error, not a host test. |
| `toBatchWrite` | `Document` (the base) | every Document can be written by key or whole; true of all of them (it is `save`'s preparation, returned). Not on the three standing classes: that would be the same method three times. |
| `esteem`, `notoriety`, `reception` | `RenownStanding` only | renown is the only stock whose score has three terms; participation and producer need no new field (their one sum is `value`). Putting the fields on a shared base would be an honest "unused" on two of three. |
| the warmed point `{ value, at, … }` | each standing class's own `WarmedIndex` | each already owns its index and its warm; `WarmedIndex<V>` is generic and unchanged. |
| the dirty set, the fingerprint, the dedup memo | module scope of each `*Logic.ts` | the logic singleton is rebuilt on hot reload and must stay stateless; module state resets on reload, which is exactly "no cursor → full pass". Not on the standing Document (it survives a reload and would hold a stale set against new code). |
| the owner → accounts index (H2) | `AccountBalance` | the class that already warms every account row and is patched by the writer. |
| the bands fold cache (H3) | `Advancement.ts`, beside its two | same ledger, same refresh points. |
| `capturesAtShutdown()` change (D9) | `PersistableMixin` | removes a narrowing guard rather than adding one: every keyed persistable host is captured at shutdown. |
| `stageStandingHistory` | `TestHarnessApi` → `TestHarnessLogic` | the one home of `@TestOnly` staging. |

The identical-value mirror (P2): no field in this build is stamped onto
several hosts with one value.

## Convention conformance

Checked this cycle against CLAUDE.md and the files named in Grounding.

- **`props:`/`cast:`, Locations, namespace axes, `<root>/<branch>/`:** not
  touched — no row, no place, no class at a new path. The one new
  controller is at
  `mud/platform/idea/cmd/system/TestHarnessStandingHistoryController.ts`,
  its view a subcommand in the existing `system/testharness.yaml`.
- **Module categories and exports:** no new category. Types exported are
  call shapes of an Api (`BatchWrite`, `ShutdownCaptureReport`) and a
  backend error class. No exported function. The logic files' new state
  and helpers are module-private, as theirs already are.
- **Module scope declares:** the new module-scope items are `let`/`const`
  declarations with pure initializers (`null`, `new Map()`).
- **Api ↔ logic split:** kept. `PersistApi` is a facade over a backend
  singleton and stays one; the scoring logic stays in the three logic
  singletons.
- **`#` vs TS privacy:** `PersistenceManager` (backend) uses `#` for the
  new counters; logic and `lib/` code uses module-private or TS-private.
  The new persistent fields on `RenownStanding` are public (the hydrator
  reflects into them).
- **Import boundary:** `Server.ts` reads the numbers through `PersistApi`,
  not `PersistenceManager`; no mudlib file imports `backend/`.
- **Verbs on objects:** no `XApi.verb(host, …)` added.
- **No new collection, no migration, no `isWizard` check.** Existing rows
  are read as they are (D1, D5).
- **American English** throughout.

**The review questions.**
- **P1** — § New substrate; every reuse-ledger row is accounted for:
  *the person's durable key* → D1 (and D2); *scoring only what changed* →
  D4–D6; *batched writes* → S1/D7; *the database's numbers* → S2/D10;
  *a read cache for hot callers* → D11 (reuse of three shipped patterns);
  *the shutdown save* → D8/D9; *the crowd drive and the quiet box* → the
  drive file; *frame records* → H5 in W2.
- **P2** — § Host placement.
- **P3 refuse, skip or throw** — a batch on a hooked collection throws a
  typed error before sending; a sandboxed batch follows the collection's
  policy exactly as a save does; a failed pass logs, restores its dirty
  subjects and is retried by the next fire; a failed shutdown chunk is
  logged per record and counted in the report's `failed`; a giver with no
  identity is skipped (D3); a keyed `insert: false` write that matches
  nothing writes nothing, which is `setPlace`'s present behavior (`if
  (!record) return`).
- **P4 no duck typing** — no pack is touched; no `?.()` on an undeclared
  name. The `Login.ts` read is a typed method call.
- **P5 the mixin decides** — no controller gains a decision. The new
  testharness controller parses a count and calls the Api.
- **P6 persistence per content** — nothing new persists by class. The
  standing rows are derived caches (`reset: wipe`). The dirty set and
  memos are deliberately not persistent, and the plan says what a restart
  does to each (a full pass; a cold memo that costs one read). No identity
  key is minted; the one key changed (D1) is the identity path, which
  survives a restart.
- **P7 load on use** — no boot entry, no search. The H2 index is filled by
  the warm `AccountBalance` already does; the H3 cache fills on first use.
- **P8 names** — `saveMany` beside `deleteMany`; `toBatchWrite` beside
  `toDocument`; `dbStats`; `stageStandingHistory`;
  `testharness standing-history` (the verb's own hyphenated subcommand
  style: `clock-advance`, `weather-pin`). No class is named.

**P9–P14, per item.**

| item | P9 predictable from def + help | P10 metadata a Document | P11 caller branches on destination | P12 synonym | P13 fits the host's header | P14 moves or decides invisibly |
|---|---|---|---|---|---|---|
| S1 `saveMany` / `BatchWrite` / `toBatchWrite` | no command; the TSDoc states the hook refusal and the three write forms | n/a — no vocabulary | no: the write form is chosen by the `BatchWrite`'s own fields inside the primitive | the plural of `save`, as `deleteMany` is of `delete`; adds keyed and partial writes `save` cannot do | `PersistApi`: *"the single chokepoint over the PersistenceManager"* — yes | no: unordered, returns its count, refuses rather than skipping hooks |
| S2 `dbStats` / `/stats.db` | no command; documented in testing.md § instruments | n/a | no | no existing read of these numbers | yes (same chokepoint) | read-only |
| S3 `BatchOnHookedCollectionError` | n/a | n/a | n/a | sibling of `SandboxWriteRefusedError`, a different refusal | yes | n/a |
| S4 renown's three fields; the warmed point | no command; `standing` prints what it printed | n/a — written by the pass, read by the logic: state, not vocabulary | no | no: they are the terms of `value`, not a second `value` | `RenownStanding`: *"one row of the materialized … aggregate"* — yes | the read derives decay; stated in D5 and in renown.md at the sweep |
| S5 `recompute({ full })` | `testharness`/operator-only surface; the option is in the signature | n/a | no | an option, not a new static | yes | default is "what changed"; `full` is explicit |
| S6 `ShutdownCaptureReport` | n/a | n/a | no | replaces a `number` | yes | n/a |
| S7 `stageStandingHistory` + subcommand | the subcommand's `description:` says what it appends and to how many subjects; `@TestOnly` message names the verb | n/a | no | no existing staging of history | `TestHarnessApi` — yes | appends through the three public `append`s; touches no standing row directly |

**Lint gates this build must satisfy** (run by name per wave; the family
runs at code-complete and `/finalize`): `lint:pm`, `lint:imports`,
`lint:module-scope`, `lint:schema` (new fields on `RenownStanding`; run
`pnpm gen:schema` only if a schema doc changes), `lint:lib-statics`
(ceiling 334 must not rise — S1 is why `toBatchWrite` is an instance
method), `lint:person-keys`, `lint:lineage-keys`, `lint:test-seams` and
`lint:test-bootstrap` (S7 and the new tests), `lint:command-views`,
`lint:view-keys`, `lint:subcommand-words`, `lint:controller-decisions`
(the new subcommand), `lint:whole-table`, `lint:thin-forwarder`,
`lint:drive-scripts`, plus ESLint's export rules.

## Waves

Every node command is prefixed `NODE_OPTIONS= VSCODE_INSPECTOR_OPTIONS=`.
`WIRE_PORT=2014` (build-1). Processes are stopped by PID only. Stage files
by name; push at every wave's commit. Branch first:
`git switch -c build/db-performance` from this branch.

### W0 — the instrument, the staging tool, the drive, the baseline ✅ (cc3178a87 + the baseline commit)

**Goal:** every later wave is compared with a number. Nothing in this wave
changes what the world does. **Decisions:** D10, D13, D14, S2, S7.

**Files**
- `backend/PersistenceManager.ts` — the counters and `stats()` (D10).
  Every collection-touching method counts (grep `getCollection(` for the
  full list: `save`, `find`, `findById`, `distinct`, `delete`,
  `deleteMany`, and any text-search or count read).
- `mud/api/persist.ts` — `dbStats()`.
- `services/Server.ts` — `db: PersistApi.dbStats()` on `/stats`, with a
  comment in the block's existing style.
- `mud/api/test-harness.ts`, `mud/platform/idea/api/TestHarnessLogic.ts`
  — `stageStandingHistory(count)`: for `count` subjects
  `/platform/agent/Avatar/dbp-past-<i>`, append through
  `ConsumerApi.append`, `RenownApi.append` and `ProducerApi.append` three
  participation buckets, three renown receptions and one producer credit
  each, with `realAt`/`at` spread over the past week; concurrency 8;
  returns `{ subjects, rows }`. Idempotent per subject (the appends
  dedup; renown rows are skipped when the subject already has three).
- `mud/platform/idea/cmd/system/TestHarnessStandingHistoryController.ts`;
  `packages/content/platform/content/platform/cmd/system/testharness.yaml`
  (the `standing-history` subcommand, args as `afflict`'s).
- `packages/wire/src/harness/world.ts` — `stageStandingHistory(founder,
  count)` (runs the verb as the founder); `stopWorldWithin(graceMs)`:
  SIGTERM the listener by PID, wait for exit, SIGKILL **that PID** at the
  grace, return `{ exitedMs, killed, report }` with `report` parsed from
  the `shutdown captured …` line of `.wire/server.log`. `restartWorld()`
  and the runner's 15 s are not changed.
- `packages/wire/tests/db-performance.dirty.wire.test.ts` (new; shape and
  header as `call-security-performance.dirty`) and, once recorded,
  `db-performance.baseline.json`.
- `docs/testing.md` § The instruments — `/stats.db`, one paragraph.

**The drive file** (the requirements' seven steps; paces in § Test & gate
strategy). `declareFile({ packs: ['platform', 'terminus'], dirtyReason })`.
Founder session opened `wizard: true, committees: ['/world/lounge']`.
- **Every MR** (counts and decisions; no timing):
  - *step 2* — `stageStandingHistory(200)`; `PersistApi.whenQuiet` is not
    reachable from a drive, so wait for two scheduled passes (130 s); read
    `/stats`; idle 180 s with nobody logged in; read again. The scoring
    round trips are the `byOp` keys over `participation`,
    `participation_events`, `renown`, `renown_events`, `producer`,
    `producer_events`. Assert (not when recording) they did not move.
    Then one player logs in and says three things across a pass; assert
    the scoring round trips are ≤ 12, that each `saveMany` key over the
    three standing collections moved by at most the number of passes in
    the window, and that the player's `standing` shows the participation.
    (That only that player's rows were written is W3's unit test 2 — an
    eval cannot reach the Apis to read rows back, and the drive does not
    need to: a pass that re-scored the 200 would show as a whole-history
    `find`, which is one of the counted keys' callers in the traced run.)
  - *step 4* — in the lounge: A and B log in; founder
    `config participation.bucketSeconds 2`; A says five lines 3 s apart
    with B listening; wait one pass; record A's `standing` (the
    participation line and the play band) and `profile`; founder stages
    A's death (`beginDying`, as in Grounding); when A's body reads as a
    shade, A says five more lines 3 s apart; wait one pass; A's
    `standing` participation is **greater** than before death (under the
    defect it is unchanged: the shade's rows go to another subject); A
    logs out and the character roster's play band equals `standing`'s.
    Restore the setting in `afterAll`.
  - *step 5* — `/stats.db` has `pool.inUse`, `pool.waiting`, `pool.waited`,
    `roundTrips`, `ops.ms`; two reads around a burst of ten commands show
    `roundTrips` and `ops.ms` rising.
  - *step 7* — three decisions, recorded at W0 and compared after: a
    payment of more than the payer holds (the refusal's note reason and
    prose); a consigned good's inspection card `Owned by` segment and who
    may `shelf reclaim` it (the consignor may, a third player may not);
    one player's competence band lines read twice, and again after the
    restart, identical for an unchanged transcript.
- **Quiet box** (`WIRE_QUIET=1 WIRE_BOOT=1`; otherwise skipped by name):
  the precheck; *step 3* — `runCrowd('dbp-30', { size: 30, during })`
  where each of the thirty takes a shift, is paid, deposits the pay,
  consigns one good and reads `standing`, while one NPC consignment runs
  (the venue and the exact commands are chosen in this wave from the
  precedents in Grounding and written into this plan's Drive record);
  around the phase two `/stats` reads give `pool.waited`, per-path round
  trips per act, and the paid acts' p95 beside `runCrowd`'s `say`/`look`
  figures; *step 6* — with the thirty still connected, record what each
  holds and where it stands, `stopWorldWithin(30_000)`, assert not killed
  and `report.failed === 0`, boot, log the thirty in, assert place,
  holdings and `standing` per player; *step 1* is this suite run with
  `DBP_RECORD=1`.
- A final `it` prints the record and, when recording, writes the JSON.

**Acceptance**
- `/stats` shows `db` on a booted world; the numbers move.
- The drive runs green on W0's code in record mode, except step 4, which
  fails and is recorded as failing; the every-MR steps' assertions that
  compare with a baseline are skipped when recording.
- Each checkpoint has been made to fail once on purpose (review question
  B2) — step 2 fails on W0's code by construction once not recording
  (the passes run); note the others in the Drive record.
- The baseline JSON is committed with the box's load beside each timed
  figure; the traced run's caller table is in it; **the hot-path ranking
  (D11) is written into this plan** under § Drive record.
- `pnpm -C packages/server exec tsc --noEmit`, `test:near`, the named
  lints.

**Quiet-box procedure** (docs/testing.md § The quiet box): take the suite
lock; ask sibling sessions to stop their worlds (never kill one); drop
this worktree's database;
`NODE_OPTIONS= VSCODE_INSPECTOR_OPTIONS= DBP_RECORD=1 WIRE_QUIET=1 WIRE_BOOT=1 WIRE_PORT=2014 WIRE_BOOT_TIMEOUT=900000 pnpm -C packages/wire wire db-performance`,
then the same with `DBP_TRACE=1` and without `WIRE_QUIET` for the caller
table.

**Commit:** `perf(db): W0 — the database's numbers on /stats, the standing-history stage, the drive and its baseline`

### W1 — one person, one key ✅ (78ba72821 · 82c93ee3e · 1b0ab820f)

> **Build note.** Three commits as planned. `Ship.ts` does not read the
> actor field (the plan's grounding was wrong there); no pack does. The
> durability test now mints bodies the way the clone pipeline stamps them
> (shared lineage, distinct identity); the producer engagement test fires
> from minted bodies, because a raw path string no longer resolves a
> person (D3).

**Goal:** participation and the producer's actor key on the person.
**Decisions:** D1, D2, D3 (three commits, in that order, so C3 and the D3
skip are each removable).

**Files:** `platform/idea/api/ConsumerLogic.ts` (`durableKey`, its
docblock, the tap); `platform/idea/Login.ts:488`;
`lib/command/CommandGiver.ts:1148-1154` and the payload type
(`CommandDispatchedEvent`); `platform/idea/api/ProducerLogic.ts`
(`appendFromEngagement`); `platform/idea/Ship.ts` (the settling tap's read
of the field); `platform/idea/api/__tests__/ConsumerLogic.durability.test.ts`
(it stamps a per-avatar *template* path — the fixture shape
`lint:person-keys`'s header warns about; rewrite it on two bodies sharing a
lineage with distinct identities, and a shade-shaped body with the first
one's identity); a producer test of the same shape (two players, one
bucket, one author → two credits; an author engaging their own content →
none); `docs/subsystems/participation.md`, `renown.md` (both say the
stored key is the lineage path — wrong today for renown, wrong after this
wave for participation).

**Acceptance:** the new unit tests; drive step 4 passes; step 7 unchanged;
`lint:person-keys`, `lint:lineage-keys`; grep `actorTemplatePath` across
`packages/` is empty.

**Commits:** `fix(participation): key the person, not the lineage — one standing across bodies` ·
`fix(producer): the engaging actor is a person` ·
`fix(participation): a giver with no identity is skipped`

### W2 — batched writes, and the frame drain ✅ (70b94d73c)

> **Build note.** `writePolicy` is the lifted switch; `batchOp` builds the
> driver's own `AnyBulkWriteOperation` (no cast). `record-test-db` gained a
> keyed `saveMany`. B2: removing the hook refusal turns its two tests red.

**Goal:** the one new capability, with its first consumer.
**Decisions:** D7, H5.

**Files:** `backend/PersistenceManager.ts` (`BatchWrite`, `saveMany`,
`BatchOnHookedCollectionError`, the shared sandbox-policy method that
`dispatchSave` now calls); `mud/api/persist.ts` (`saveMany`, the type
re-export); `mud/lib/persistence/Document.ts` (`toBatchWrite`);
`platform/idea/api/RecordLogic.ts` (`drain`: one `saveMany` of the batch;
a failed batch is logged once with its row count, as a failed row is
today); tests in `backend/__tests__/` and `lib/persistence/__tests__/`:
the three write forms; `insert: false` on a miss writes nothing; partial
`fields` leaves other fields alone; `createdAt` survives a second keyed
write; the hooked collection throws before any write; each sandbox verb
(refuse throws, stamp stamps doc and filter, shadow/skip returns 0);
re-entry throws; the trace and `byOp` record one op.
`docs/subsystems/persistence.md` — a short § on `saveMany` and when it is
the wrong tool (a hooked collection, a row whose `_id` the caller needs
back).

**Acceptance:** the tests; `byOp['save player_frames']` no longer moves in
a drive run and `saveMany player_frames` moves once per drain; `lint:pm`,
`lint:lib-statics` unchanged at 334.

**Commit:** `feat(persistence): saveMany — a keyed batch write at the chokepoint; the frame drain uses it`

### W3 — scoring costs what happened ✅ (b7ea1fca3)

> **Build note.** `StandingPoint` is homed in `InfluenceStanding.ts` (the
> standing layer's output-shape file — no new module); renown's
> `RenownPoint` extends it. The pass puts rows in the index with an
> instance method `row.remember()` (no new `lib/` static —
> `lint:lib-statics` unchanged). Renown's value function is memoized on its
> raw settings, since a read now applies it. ⚠ A test-clock lesson: the
> world clock's test provider supplies WALL ms and game time derives
> through the scale — the renown proof first ran with every age clamped to
> zero and "passed" trivially; it now moves game time through the
> provider and asserts decay actually happened. The one-pass-at-a-time
> test was passing by accident (its fake had no `saveMany`, so every pass
> threw and stayed full); it now proves an idle fire reads nothing.

**Goal:** an idle world's scoring makes no round trips; an act re-scores
one subject. **Decisions:** D4, D5, D6, S4, S5. One commit per service is
fine; participation first (the simplest), renown last.

**Files:** `platform/idea/api/ConsumerLogic.ts`, `ProducerLogic.ts`,
`RenownLogic.ts` (the dirty set, the fingerprint, `scoreEvents` returning
sums, `combine`, the pass per D4, the read per D5, `recompute(opts)`;
delete `upsertStanding`); `mud/api/consumer.ts`, `producer.ts`,
`renown.ts` (the option); `lib/standing/ParticipationStanding.ts`,
`ProducerStanding.ts`, `RenownStanding.ts` (the index's value type, the
warm mapping rows to points, `cached()`'s type, `_putForTesting`; renown's
three fields in `fieldMeta`); `lib/commerce/DonationBank.ts` (its
`recompute()` call now folds what changed — no edit expected, verify);
the three `*Logic.recompute.test.ts` files and any test reading
`cached()` as numbers.

**Tests owed (the proof the answer did not change).** For each service,
with a fixed clock and a seeded mix of events (for renown: positive and
negative reactions, receptions, tags with context multipliers, two
scopes):
1. a full pass at T0; advance to T1; read every subject → equals, to 1e-9
   relative, a **fresh full pass at T1** read at T1, and every band is
   identical;
2. append for one subject at T1; a dirty pass → only that subject's rows
   are in the `saveMany` (spy on `PersistApi.saveMany`); every subject's
   read at T2 equals a full pass at T2;
3. an empty dirty set → the pass makes no `PersistApi` call at all;
4. a changed half-life, valence or multiplier → the next pass is full;
5. a row with no sums (renown) reads its flat `value`;
6. a pass that throws puts its subjects back.

**Acceptance:** those tests; drive step 2 passes (idle scoring round trips
do not move; the acting player costs ≤ 12); step 3's `standing` reads and
step 7 unchanged; `test:near`; `lint:schema`, `lint:module-scope`.

**Commit(s):** `perf(standing): a pass re-scores who changed; decay is read, not rewritten` (per service or one)

### W4 — a world that stops has saved everything ✅ (514fc1238)

> **Build note.** D9 landed (W0: 30 of 30 connected players came back
> elsewhere, without what they were handed). The shutdown already fit 30 s
> at W0 (23.5 s, 131 hosts); W4 is about losing nothing and halving the
> capture's round trips. ⚠ Cost the plan did not price: ~190 test files
> fake the persistence manager by hand and had no `saveMany`. Rather than
> edit each fake's semantics, one test helper (`pm-fake.ts`:
> `withSaveMany`, `spySaveMany`, `spyPersistSaveMany`) builds a faithful
> keyed `saveMany` over each fake's own `find`/`save`, and a brace-matched
> mechanical wrap applied it — no test's expectations changed.

**Goal:** the loaded world's stop fits its grace and loses nothing.
**Decisions:** D8, D9, S6.

**Files:** `platform/idea/api/PersistableLogic.ts` (`captureImpl` split
into prepare and write; the keyed write; `captureAtShutdownImpl` per D8);
`mud/api/persistable.ts` (`ShutdownCaptureReport`, the return type);
`backend/AppBootstrap.ts:317-318` (the log line);
`lib/persistence/Persistable.ts:278-283` and its interface doc (D9, if
W0 says so); `lib/persistence/PersistedRecord.ts` only if
`findByScopeAndOwner` loses its last capture-side caller (materialize
still reads through it); tests: two concurrent captures of a host with no
record → one row, no E11000; the sweep over N stub hosts issues ⌈N/25⌉
`saveMany` calls and reports N; a host whose prepare throws is counted
`failed` and the rest are written; a dependent is written with its owner;
a connected body is captured (D9). `docs/subsystems/persistence.md` — the
shutdown sweep's paragraph.

**Acceptance:** drive step 6 on the quiet box: not killed at 30 s,
`failed === 0`, the report's count equals the baseline's host count (plus
the thirty, with D9), every player back in place with holdings and
standing; a capture's round trips per act halve (`find holder_snapshots`
gone from the capture path); `test:near` + the persistence suites.
⚠ If the report's `ms` is still over 30 s, the traced run names the
remaining per-host cost; cut it in this wave (it is the same spine) and
record what it was — do not raise a grace.

**Commit:** `perf(persistence): a capture is one keyed write; the shutdown sweep batches, reports, and includes the connected`

### W5 — the ranked hot paths

**Goal:** each path taken costs at most half its baseline round trips per
act. **Decision:** D11 — one commit per cut, in W0's order, each
independently revertible; skip a path W0 ranks under 5%.

**Files, per cut:** H1 `ConsumerLogic.ts`, `ProducerLogic.ts` (the memo is
set only after the row is written or found; cleared with the module) ·
H2 `lib/banking/AccountBalance.ts` (or wherever the class lives — follow
`AccountBalance.cached`), `platform/idea/api/BankingLogic.ts`
(`accountsOfImpl`, `accountAtImpl`, and every site that opens or closes an
account patches the index), `platform/idea/api/EmploymentLogic.ts:1214-1220`
· H3 `lib/advancement/Advancement.ts` · H4
`platform/idea/ChattelRegistry.ts`. Each with a unit test that the answer
is unchanged (same accounts in the same order, primary first; same bands
for the same transcript; same title and place rows) and that a write
through the owning writer is visible to the next read.

**Sibling care.** failure-model edits `BankingLogic.ts` refusal paths and
aether-devices edits `ChattelRegistry.stamp` and `Advancement.ts`. Keep
each cut's diff inside the functions named above; whichever build merges
second merges the other in first. The H4 write lists its fields, so
`bound` is one more name in the list after that merge. Do not wait for
either.

**Acceptance:** after each cut, the drive's step 3 counting phase (it can
run without `WIRE_QUIET`: counts are not timings) shows the path's round
trips per act at ≤ half the baseline's and no other path's higher; step 7
unchanged. The table in § Drive record gains a before/after row per cut,
or the line *reverted — did not halve*.

**Commits:** `perf(<area>): <path> — <before> → <after> round trips per act`

### W6 — the pool, the docs, the drive

**Goal:** the exit criterion. **Decision:** D12.

- Run the whole drive on the quiet box, not recording. If
  `pool.waited > 0` in step 3, apply D12 and re-run step 3.
- Subsystem docs: `participation.md`, `renown.md` (the pass, the read,
  the three sums — and the labor stock's doc line in `influence.md`),
  `persistence.md`, `record-layer.md` (the drain), `chattel.md`,
  `banking.md`, `advancement.md` for any cut taken, `testing.md` (the
  drive as the third quiet-box file).
- The browser walk (review question B3): this build has no player
  surface; the walk is `e2e/tests/db-performance-walk.spec.ts`, short — a
  player works a shift, is paid, reads `standing`, dies, reads `standing`
  as a shade, and the roster shows the same band.
- Append the Drive record below. Then code-complete: the MR opens ready,
  and the full suite runs once through `tools/suite`.

**Commit:** `docs(db-performance): subsystem docs, the drive record`

## Reachability wiring

No player capability is added. The five links for what is:

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| `/stats.db` | none (HTTP, as `/stats` is) | — | counters fed by the pool's events and the chokepoint's ops; the pool listeners are registered in `connect()` before `client.connect()` | present from boot | — |
| `testharness standing-history <n>` | the existing `testharness` verb | a new entry under `subcommands:` with its `controller:` path (a subcommand nothing lists is unreachable — `lint:command-views`, `lint:subcommand-words`) | appends through the three Apis | the view is a platform `command-view` document; the controller resolves by path | `requiresTestWorld` on the view; a missing or non-numeric count is refused in words by the controller (a required arg with no default fails closed and silent — give it `required: false` and refuse explicitly, as `afflict` does) |
| the dirty pass | none | the existing 60 s schedule, armed by `ParticipationStandings`/`RenownStandings`/the producer's holder `onCreate` | **every append path marks its subject** — the dispatch taps, the public `append`, `seedToImpl`'s direct saves; a path that writes an event row without marking is a standing that never moves (the fail-silent link; W3's test 2 and a grep for `new RenownEvent()`/`new ParticipationEvent()`/`new ProducerEvent()` outside the logic files) | the warm at boot, then a full first pass | — |
| read-time decay | `standing`, `profile`, the roster | unchanged | the index point must carry its instant; a point with none reads flat (so a test seam or an old row is never mis-decayed) | the standing class's `warm()` maps rows to points | — |
| the shutdown report | none | SIGTERM → `Server.stop` → `AppBootstrap.shutdown` | the log line | — | — |

## Acceptance-criteria coverage

| criterion | waves | proved by |
|---|---|---|
| a player who dies and acts as a shade has one participation standing, read the same by every reader (*"earlier standing intact"* — see C1) | W1 | unit tests; drive step 4; the walk |
| with nobody acting, the scoring services' traffic is a constant, whatever the number of past players | W3 (three services, C2) | W3 test 3; drive step 2 |
| thirty working never wait for a connection; paid acts, `say`, `look` no slower | W2–W6 (D12 if needed) | drive step 3: `pool.waited` delta 0; `noWorse` on the three p95s |
| each hot path taken costs at most half its round trips per act | W2 (frames), W4 (captures), W5 | drive step 3's per-path table against the baseline |
| a world with thirty players stops inside 30 s having saved everything, and restarts with all of it | W4 | drive step 6 |
| `/stats` shows connections, round trips and waiting | W0 | drive step 5 |

Nothing is unmapped. The goal *"no player-facing number gets worse"* is
step 3's `noWorse` and step 7's recorded decisions.

## Test & gate strategy

**Unit tests** carry the arithmetic: that a read-time-decayed standing
equals a full pass (W3), that a batch honors hooks and the sandbox (W2),
that a keyed capture cannot double-insert and the sweep reports truly
(W4), that each cache returns what the read returned (W5), that two
players are two subjects and a shade is its person (W1). Anything touching
the wired runtime imports `test-bootstrap`.

**Only the drive can prove:** that the pool does not queue against the
hosted database; the round trips per act in a working world; that a
loaded world's stop fits 30 s; that a restart reads everything back.

**Every drive step's pace.**

| step | pace | when | staged twin and its tool |
|---|---|---|---|
| 1 baseline | `short`, `staged` | quiet box, `DBP_RECORD=1`, on W0 | — (it is steps 2–7 recorded) |
| 2 a long-lived, quiet world | `short`, `staged` | every MR | 200 past players: `testharness standing-history 200` (S7, owed by this build) |
| 3 thirty at work | `short`, player | quiet box (its counting phase also runs unquiet in W5) | — |
| 4 one standing across death | `instant`, `staged` (waits one 60 s pass twice) | every MR | the death: the founder's `eval … beginDying` (exists); short buckets: `config participation.bucketSeconds` (exists) |
| 5 the operator's view | `instant`, `staged` | every MR | — |
| 6 a loaded world stops and comes back | `short`, player | quiet box | `stopWorldWithin(30_000)` (W0, in the wire harness) |
| 7 nothing a check decided changed | `instant`, `staged` | every MR | — |

All seven are the **blocking drive**. No `span` step, so **no soak
drive** — nothing here moves with the game clock (renown's decay uses
game time, and its arithmetic is W3's unit test with a fixed clock).

**Gates between waves:** `tsc --noEmit`, `pnpm test:near`, the lints named
in § Convention conformance by name. ⚠ `pnpm test` (through `tools/suite`)
runs at exactly two moments: at code-complete beside the open MR, and at
`/finalize`. Never in the background. `lint:family` likewise.

**Timing is evidence only on the quiet box**; counts (round trips,
`pool.waited` on an otherwise idle world) are honest anywhere, which is
why W5 can iterate without it.

## Risks & opens

1. **C1–C3 are scope facts the owner has not seen.** The plan proceeds on
   them; if any is declined, drop its commit (C3: W1's second; D3: W1's
   third; C2: the producer third of W3 — and then step 2's assertion
   excludes the producer keys and the acceptance line is not met for it).
2. **Zero waiting may not be reachable at pool 10.** Thirty simultaneous
   commands against 100 ms round trips queue unless each command makes
   almost none. D12 is the designed fallback; if 24 still shows waiting,
   record the figure and what remains per act — that is the measurement
   the requirements' *"a closer database"* non-goal is waiting for. Do not
   raise past 24.
3. **The shutdown's per-host cost is not only the write.** The slate
   measured 1.6–2.0 s a host, far more than a find and a save. The estate
   flush (`flushSkippedOwnedGoods`, a find + save per good owned by
   someone else), `ownerOfScope` and marshaller preloads are the suspects;
   W0's traced shutdown names them. If the flush dominates, batch it per
   owner with the same `saveMany` inside W4.
4. **`SoulApi.all()` in the renown fingerprint** must be a memory read.
   If the trace shows it reaching the database per fire, fingerprint the
   scalar settings on every fire and the valences only when the set is
   non-empty, and force a full pass from wherever an emote's valence is
   edited instead.
5. **Read-time decay is exact only for ages ≥ 0.** An event dated after
   the pass instant (a clock moved backward) is clamped by today's
   arithmetic and not by the stored sum. The world clock only moves
   forward; a restart's full pass heals any drift. Stated, not guarded.
6. **Duplicate standing rows.** The `{subject, scope}` index is not
   unique; a keyed update touches one of two duplicates and `warm()` takes
   the last. Today's find-then-save has the same exposure. If W0's world
   shows duplicates, the first full pass deletes the collection's rows
   for the subjects it rewrites before writing (`deleteMany` + `saveMany`
   — a derived cache, `reset: wipe`); do not add a unique index in this
   build (an index that fails to build is a boot failure).
7. **Tests that write events directly then `recompute()`** (five
   `new …Event()` sites in tests) will see nothing under a dirty pass;
   they move to `recompute({ full: true })`.
8. **Sibling overlap** in `BankingLogic.ts`, `ChattelRegistry.ts`,
   `Advancement.ts` and `boot.ts` (this build does not edit `boot.ts`;
   its stop helper lives in `world.ts`). Textual; resolved at whichever
   merge is second.
9. **The working venue for step 3** is chosen in W0 from shipped drives.
   If no single Terminus venue offers a shift, pay, a bank and a shelf
   within the crowd's reach, the crowd walks between two; write the
   choice into the Drive record. Stop and ask only if no shipped content
   can pay thirty players at once.
10. **`standing`'s exact lines** (how participation is printed) were not
    read at plan time; step 4 compares the same line before and after
    death, so it needs only that the figure or band is on it. If
    `standing` prints a band only and five buckets do not cross a band,
    raise the count until it does and say so in the record.
11. **A kept world and the baseline.** A `WIRE_REUSE` world carries the
    200 staged subjects from an earlier run; the stage is idempotent, and
    the timed steps require `WIRE_BOOT=1` on a dropped database.

## Deferred seams

- **The three scoring services are one shape written three times** — and
  after W3 the shape is larger (dirty set, fingerprint, sums, combine).
  Unifying them is a refactor with its own review; it leaves as a line in
  [db-performance-slate.md](../slates/tech-debt/db-performance-slate.md)
  (kept for its § 7) at the sweep, attach point: the module-private pass
  in each logic file.
- **A bounded first pass after a start** (re-score only subjects with
  events since the newest stored instant). Needs a persisted cursor with
  a margin; deferred unless W0's boot pass over the staged history is
  slow enough to matter. → the same slate line.
- **Cold boot, the restart path's 15 s kill, the near-heap-limit flag** →
  [test-world-lifecycle-slate.md](../slates/tech-debt/test-world-lifecycle-slate.md)
  (the requirements' non-goals). W4's report line is what that slate's
  restart path would read.
- **The scale envelope** → db-performance-slate § 7, unchanged.
- **Renown's raw-`stuffId` fallback** (D3 leaves it) → the same slate, one
  line, with the count W0's world shows.
- **Ids back from a batch insert.** `saveMany` returns a count; a caller
  that needs inserted `_id`s uses `save`. Attach point: the `bulkWrite`
  result's `insertedIds` in `PersistenceManager.saveMany`.

## Critical files

Read first, in this order:

1. `docs/requirements/db-performance-requirements.md` and this plan's
   § Requirements corrections.
2. `packages/server/src/backend/PersistenceManager.ts` (`:42-122` the
   trace, `:455-530` the pool, `:622-830` the ops, `:975-1075`
   `dispatchSave`/`withSlot`, `:1345-1392` `persistSave`).
3. `packages/server/src/mud/api/persist.ts`,
   `packages/server/src/mud/lib/persistence/Document.ts`,
   `lib/persistence/WarmedIndex.ts`.
4. `packages/server/src/mud/platform/idea/api/ConsumerLogic.ts`,
   `RenownLogic.ts`, `ProducerLogic.ts`; `lib/standing/*.ts`; `lib/Decay.ts`.
5. `packages/server/src/mud/lib/stuff/Stuff.ts:536-595, 716-732`,
   `mud/api/stuff.ts:598-640, 725-732`, `lib/character/Avatar.ts:755-775`,
   `platform/agent/ShadeAvatar.ts`, `lib/command/CommandGiver.ts:1140-1160`,
   `platform/idea/Login.ts:480-495`.
6. `packages/server/src/mud/platform/idea/api/PersistableLogic.ts:700-745,
   1200-1305`, `lib/persistence/Persistable.ts:105-125, 270-285`,
   `backend/AppBootstrap.ts:276-320`, `services/Server.ts:200-232, 310-360`.
7. `packages/wire/tests/call-security-performance.dirty.wire.test.ts`,
   `packages/wire/src/harness/crowd.ts`, `world.ts`,
   `packages/wire/src/runner/boot.ts`.
8. `packages/server/src/mud/api/test-harness.ts`,
   `platform/idea/api/TestHarnessLogic.ts`,
   `platform/idea/cmd/system/TestHarnessAfflictController.ts`,
   `packages/content/platform/content/platform/cmd/system/testharness.yaml`.
9. For W5: `platform/idea/api/BankingLogic.ts:195-215, 2412-2430,
   2740-2755`, `EmploymentLogic.ts:1205-1225`,
   `lib/advancement/Advancement.ts:200-235`,
   `lib/standing/DerivedStandingCache.ts`,
   `platform/idea/ChattelRegistry.ts:85-200`,
   `lib/retail/ConsignmentShelf.ts:230-285`,
   `platform/idea/api/RecordLogic.ts:240-300`.
10. `docs/testing.md` § The quiet box; `docs/review-questions.md` (B1–B4);
    `packages/server/scripts/check-lib-statics.ts` (header),
    `check-person-keys.ts` (header).

## Drive record

*(appended at build time, not at plan time)*

### W0 baseline — 2026-11-18, W0's code, `DBP_RECORD=1 DBP_WORK=1` (counts; box NOT quiet: load ~11, foreign 3.4 cores)

The box could not be quieted (two sibling worlds booting), so this run is
**counts only** — honest anywhere. The timed figures (paid / `look` / `say`
p95) wait for a quiet-box run; until one is recorded, `noWorse` has nothing
to compare against and skips. `DBP_WORK=1` was added to the drive for this:
steps 3 and 6 for their counts without the quiet precheck (build decision).

| step | W0 reading |
|---|---|
| 5 | ten `say`s → 98 round trips; since boot the pool had already queued 51 check-outs (peak 60 waiting, 119 s waiting) |
| 2a | idle 180 s, 200 past players, nobody logged in → **3 642 scoring ops** (≈ 600 `find`+`save` per service per pass: a find and a save per subject per minute) — FALLS, as designed |
| 2b | one player, three lines → 2 451 scoring ops; their participation by person **0**, `standing` "not yet shown up" — FALLS |
| 4 | A and B both 0 alive; A 0 as a shade — FALLS (B2 proof: the checkpoint fails on the defect). The roster check HOLDS only trivially (both read `dormant`) |
| 4 | three commands at the roster → 6 participation ledger ops (a login screen earns) — FALLS |
| 7b | consign ok · another player's reclaim `not-owner` · the consignor's reclaim ok |
| 3 | 330 commands, 10 559 round trips; **pool waited 1 119 (peak 856, 2 176 s waiting)** — FALLS |
| 6 | stop with the thirty connected: exited in **23.5 s**, not killed, 131 hosts captured — but **all 30 came back elsewhere and without the rag handed since their last periodic save**: the connected bodies were not captured. **D9 is confirmed; it lands in W4.** |

Two drive defects found and fixed after the run: 7a named a payee nobody
could see (now `bank withdraw 100000`, the chokepoint's refusal), and 7c
compared ambient prose (a shiver) — now the `competence` block alone. Their
decisions are recorded after W4, before W5 (W1–W4 touch neither).

**The hot-path ranking (D11), ops per command in step 3's working phase:**

| rank | path | ops / command | taken? |
|---|---|---|---|
| 1 | H5 frames (`save player_frames` 4 179) | 12.66 | W2, unconditional |
| 2 | H2 accounts and ledger | 2.25 | W5 |
| 3 | H3 competence bands | 1.49 | W5 |
| 4 | H4 chattel place and stamp | 1.36 | W5 |
| 5 | H1 taps dedup | 1.29 | W5 |
| — | captures (`find`+`save holder_snapshots`) | 0.46 | W4 (the capture write) |
| — | the three scoring passes (`find`/`save` participation, renown, producer: ≈ 2 320 ops) | 7.0 | W3 |
| new | `find authoring_events` 392, `find documents` 358 / `save documents` 179 | 1.19 / 1.63 | not in the table; their callers need the traced run — W5 looks at them (P1 line there) |

⚠ The 5% floor: the phase's total is ~32 ops a command, so 5% is 1.6 and
H3/H4/H1 would fall under it — but ~7 of those 32 are the scoring passes W3
removes. **Decided:** the floor is taken against the phase's ops less the
scoring passes (~25 a command → 1.25), so H1–H4 all qualify. (Lens 2/plan
D11's intent: rank what a player's act costs, not what the minute timer
costs.)

