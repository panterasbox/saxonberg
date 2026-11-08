# Database performance — where the world waits on Mongo

> **Status: UNBUILT** — found 2026-11-08 by the controllers-are-io build's
> /finalize investigation (MR !527), measured on a fresh world from this
> branch and from master, same scenario, same box.
> **Left:** participation and renown keyed on the person (§ 1) · a recompute
> that scales with the living, not with history (§ 2) · the pool and
> per-operation latency to Atlas (§ 3) · the hot callers: payroll, bank,
> transcripts, consignment (§ 4) · boot time (§ 5) · the unexplained 4 GB heap
> (§ 6) · the serial shutdown capture (§ 5)
> **Size:** a build (§§ 1–2 could be one wave of it; § 5 is a tail)

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

## See also

- [crowded-rooms-slate.md](./crowded-rooms-slate.md): the crowd timing, a
  CPU-side sibling of this slate.
- [test-world-lifecycle-slate.md](./test-world-lifecycle-slate.md)
- [deployment.md](../../deployment.md), [persistence.md](../../subsystems/persistence.md),
  [renown.md](../../subsystems/renown.md), [participation.md](../../subsystems/participation.md)
