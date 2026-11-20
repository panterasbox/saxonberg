# Database performance — where the world waits on Mongo

> **Status: PARTIAL** — the db-performance build (MR !636, 2026-11-19)
> shipped §§ 1, 2, 4 and the shutdown half of § 5: participation and the
> producer actor keyed on the person, passes that score who changed with
> decay read at read, `saveMany`, six hot-path cuts, a batched shutdown
> save that includes connected bodies, and `/stats.db`. Record: the
> subsystem docs (participation, renown, persistence, banking,
> advancement, chattel, provenance) and § *What db-performance left*.
> **Left:** the 21 connection waits at pool 24 (§ 3 — `documents`/`beliefs`
> per-act reads, then a closer database) · the three scoring services as
> one shape · a bounded first pass after a start · renown's raw-id
> fallback · the scale envelope (§ 7). Out: cold boot and the 4 GB heap
> (→ test-world-lifecycle)
> **Size:** a tail (§ 3's remainder) + a build (§ 7)

## Why this exists

The world stalled in drives with the CPU mostly idle. Commands were not
computing; they were queued for a Mongo connection. Every 30 s dispatch
timeout in the sibling wire files (forestry `look panel`, silk `buy cocoon`,
scan-sweep `reserve`, harbors `reserve override` and `pay office`) lined up
with a saturated pool. The live deployment has the same shape (one box, Mongo
on Atlas; [deployment.md](../../deployment.md)), so a busy world queues there
too. The owner, 2026-11-08: *"if it points to any real performance issues I
wanna know that too."*

## Severity, as measured (for sequencing)

| § | what | severity | why |
|---|---|---|---|
| 1 | people keyed on lineage | ⚠⚠⚠ **correctness** | every player's renown and participation collapse into one subject in the live game today |
| 3 | latency + pool | ⚠⚠ **live performance** | the pool fills on master too, worse than on the branch (36 waiting) |
| 2 | recompute over history | ⚠⚠ grows with time | cost rises with every session ever seen; worst on a long-lived world |
| 4 | hot callers | ⚠ the load §3 queues | fix after § 3 says how much each costs |
| 5 | boot 12–13 min | ⚠ developer time | every cold boot; see the test-world slate |
| 6 | 4 GB heap | ? unknown | not reproduced since the churn fix; never root-caused |

## 1. ⚠⚠⚠ Participation and renown key a person on lineage

> ⚠ **Re-verified 2026-11-18 (db-performance plan):** still true. Every
> player body is cloned from the `PrimaryAvatar` row, so the instance
> `getTemplatePath()` is shared; `Avatar.getTemplatePath(pid)` is a STATIC
> that builds the identity string (a first requirements draft misread it
> and "corrected" this section wrongly). Renown is fixed; participation,
> the `Login` roster read, and the producer stock's ACTOR are not.

`RenownLogic.durableKey` and its copy in `ConsumerLogic` (the comment says
*"the substrate shares no code"*) both return
`StuffApi.findById(id)?.getTemplatePath() ?? id`. Every player Avatar shares
one template path (D17 stamps lineage and identity separately), so every
player becomes the subject `/platform/agent/PrimaryAvatar`, and a giver with
no stamp falls back to its raw `stuffId`, minted fresh per connection (every connection's `Login`, created with no
template, adds a subject that is never removed). This is
the antipattern CLAUDE.md names (*Keying a PERSON on `getTemplatePath()`*;
the fix is `getIdentityPath()`), the one that once cost a shared bank account.

What to decide: the fix is one line twice, but existing `participation_events`
and `renown_events` rows carry the collapsed key. Whether to rekey history or
start fresh is the question (no migrations, per the standing rule; that may
decide it). GitLab issue #126 carries the one-line fix.

## 2. ⚠⚠ The recompute scales with history, not the living

Both `ConsumerLogic` and `RenownLogic` run a recurring recompute every 60 s
(`CONSUMER_RECOMPUTE_MS`, `RENOWN_RECOMPUTE_MS`) that re-scores **every
subject they have ever seen**, each with a serial find + save. Measured: a
test DB that had held a few hundred sessions drove ~13 participation and ~5
renown operations a second from this alone. Fixing § 1 shrinks the subject
set to real people; the shape is still *cost ∝ every person who ever played*.
Open: incremental update on the event (the derive-on-read doctrine may answer
it), recompute only subjects with new events since the last pass, or batch the
writes (one `bulkWrite` per pass instead of N round trips).

## 3. ⚠⚠ Per-operation latency to Atlas saturates a 10-connection pool

`PersistenceManager` opens the driver with `maxPoolSize: 10`. During the
harbors drive, master's world, same box:

| | branch | master |
|---|---|---|
| commands/s | 15.9 | 30.0 |
| pool | up to 10 out, 6 waiting | up to 8 out, **36 waiting** |
| find latency | — | 80–160 ms average |
| `getMore` | — | ~7 s average |
| find (documents) | — | ~550 ms average |

Idle, both worlds ran ~6–7 commands/s with the pool clear. The pool saturates
on latency × rate, not on rate alone, so the remedies are different axes: a
bigger pool (cheap, bounded by Atlas's connection limit), fewer round trips
(batching, § 4), cached reads, or a closer database. Measure before choosing.

## 4. ⚠ The hot callers

Same stacks on both trees, by synchronous capture at the driver:
- `find bank_ledger` / `find bank_accounts` from `EmploymentLogic` (business →
  `BankingLogic` txId): the payroll and roster path, and `ShelfConsignController`
  via trade-shopkeeping's `consigns` brain;
- `find transcripts` from `AdvancementMixin.bandsFor` (the `DerivedStandingCache`
  folds);
- chattel stamp / `setPlace` (consignment again);
- `insert player_frames` (`RecordLogic`).

The consignment brain appears twice: an NPC consigning runs a ledger, a title
and a placement write per item.

## 5. ⚠ Boot is 12–13 minutes cold

A cold boot (dropped DB) took 12–13 min on both trees; a warm boot ~2.5 min.
The estuary's greywater shore readings take ~50 s each at boot (pre-existing:
the same in the 2026-11-07 log). A harness restart of a world that had been up
47 min took ~3.5 min to shut down gracefully, and the harness kills a
restarting world after 15 s, so an in-test restart never gets its shutdown save
(that can hide persistence bugs). Measured later the same day: the final
shutdown captures every host **serially**, and on a loaded world that was 172
hosts at 1.6–2.0 s each (`find`/`update holder_snapshots` to Atlas), about 3.5
min; only 70 snapshots landed inside a 60 s grace. Any loaded world, not only a
test, loses state on a short shutdown: batch the captures (one `bulkWrite`), or
run them concurrently, before raising any grace. GitLab issue #127 carries it. Boot cost is mostly a test-time cost; see
[test-world-lifecycle-slate.md](./test-world-lifecycle-slate.md).

## 6. ? A 4 GB heap death, twice, never root-caused

Two worlds died at the heap limit (4050 MB retained after a full GC) during
long drive runs. Found and fixed on the branch: three per-signed-out-body
retentions (the event history ring, a bystander's command stack, a spawn sweep
minting loot daily per zone: 498 identify scrolls against a target of 4) and
allocation churn from bulk keyword reads (127 → 47 MB/s idle). After those it
did not recur in one long run (RSS 1.1–1.2 GB). One run is not proof. Next
time it happens: `--heapsnapshot-near-heap-limit` is the flag; the harness's
own restart drops it.

## 7. ⚠ The scale envelope — the model used past the scale it was built for

Moved here from the size-and-carrying requirements in owner review,
2026-11-11: it is engine performance, not carrying. The owner's frame (design
session, 2026-11-07): no new model is needed — bulk and stacks are already one
object whatever the amount; *"the problem is using the model at a scale it
wasn't designed to sustain"*, and it only matters when something clones
dynamically at scale.

Size covers part of it for free: once things have sizes, volume bounds what a
container holds, nesting runs out because each inner container is smaller,
and an enclosed place refuses authored content that does not fit, loudly. What
is left:

- **Objects in an open place.** A field bounds nothing (big things spill), so
  a runaway script can litter one without limit.
- **Mints per act.** A `do` loop or a generator minting without bound.
- **Resident objects.** What the world keeps loaded (see
  [eager-residency-slate.md](./eager-residency-slate.md) and residency.md).

The shape agreed for it: a small set of budgets, **measured** by benches at the
envelope's edge (the soak lane), **enforced** at the chokepoints (the one
minting path, the container side of a move, the resident set), and **loud** —
a player's act refused in words, an author's or a generator's failing with a
diagnostic naming who and what. Never a silent trim. Open: the numbers (set
from the benches), and who may raise a budget (lens 7 — tier B, whoever
ships the code).

## What db-performance left (2026-11-19)

Measured by the build's quiet-box drive (`db-performance.dirty`), thirty
players working:

- **§ 3 is not closed.** At the build's ceiling of 24 connections, 21
  check-outs still waited (1 119 at the start, 396 at 10, 196 at 16): ~5.6
  round trips a command against a ~100 ms database with thirty acting in
  one instant. The largest remaining per-act ops: `find documents` 366 /
  `save documents` 184 and `find beliefs` 154 / `save beliefs` 124 —
  callers unnamed; a `DBP_TRACE=1` run names them. After those, the
  question is deployment's (a closer database).
- **After the master merge** (aether-devices, call-security-pass) the
  final drive read 115 waits at pool 24 (21 the run before — the hosted
  database's latency varies run to run) and `find transcripts` rose to
  0.49 a command (0.003 before; 1.49 at W0). The cached competence read is
  proven by its test; the new reads are another caller (a lead, not
  verified: `Cast`'s dossier re-seed reads `transcriptEntries()` as the
  merged content loads Casts).
- **H4** (chattel title and place) halved its writes but not its path:
  the `chattel_events` audit appends are one per title change, by design
  (owner ruling: keep).
- **The three scoring services are one shape written three times** —
  larger now (dirty set, fingerprint, sums, combine). Unifying them is its
  own refactor; attach point: the module-private pass in each logic file.
- **A bounded first pass after a start** — the first pass is full by
  design (no cursor). Worth doing only if a large world's boot pass shows.
- **Renown's raw-`stuffId` fallback** for a subject with no identity was
  left (participation's was removed): not measured as a cost.

## Reuse ledger for the plan (2026-11-18)

Written at /requirements. Every row is one the plan must account for.

| concept the build needs | what already does it | reuse / generalize |
|---|---|---|
| the person's durable key | `Stuff.getIdentityPath()` (renown, employment, profile, standing, advancement's `ownerKeyOf` all use it) | **reuse** — participation's `durableKey`, `Login`'s band read, the standing product and the producer event's actor move onto it |
| scoring only what changed | the three scoring services' recurring pass (`ConsumerLogic`, `RenownLogic`, `ProducerLogic`, 60 s, whole-history `find({})`) · derive-on-read caches already serve every read | **generalize** — the pass re-scores the subjects with events since the last pass; no new scheduler |
| batched writes | nothing: no `bulkWrite` anywhere in server src; `PersistApi.save` per row | **genuinely new** as a capability of the persistence layer — searched `bulkWrite`, `insertMany`, `saveMany` in packages/server/src and every pack `src/` |
| the database's numbers | `PersistenceManager`'s pool checkout counter (`whenQuiet`) · `SAXONBERG_QUERY_TRACE` per-caller counts and time · `/stats` (connections, objects, cpu, loop) | **generalize** — `/stats` gains the pool and round-trip fields from the counters that exist |
| a read cache for hot callers | `DerivedStandingCache` (advancement's practising/digest) · `AccountBalance.cachedBalance` · the resident `content` cache | **reuse** the pattern per caller the measurement ranks; no new cache type |
| the shutdown save | `PersistableLogic.captureAtShutdownImpl` (serial over every host) · the per-record queue | **generalize** — batched or concurrent captures through the same spine |
| the crowd drive and the quiet box | `runCrowd`, `quietBoxRefusal`, `foreignMeter`, `call-security-performance.dirty` (baseline JSON, `WIRE_CPU_PROF`, restart helper) | **reuse** — a new wire file for the working crowd, same shape |
| frame records | `RecordLogic`'s 1 s drain, one save per row | **generalize** — the drain writes its batch at once |

## See also

- [crowded-rooms-slate.md](./crowded-rooms-slate.md): the crowd timing, a
  CPU-side sibling of this slate.
- [test-world-lifecycle-slate.md](./test-world-lifecycle-slate.md)
- [deployment.md](../../deployment.md), [persistence.md](../../subsystems/persistence.md),
  [renown.md](../../subsystems/renown.md), [participation.md](../../subsystems/participation.md)
