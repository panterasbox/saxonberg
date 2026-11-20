# Test-world lifecycle — requirements

**Kind:** infra (test tooling)
**Leads from:** kernel and tooling. **First consumer:** the wire drives — every
owned wire run, every drive that restarts its world, and the soak lane.

Every worktree has one database, and a wire run boots a world on it, plays
through it, and stops and restarts it. Today a fresh world costs a **cold boot
of 12–13 minutes** after a dropped database, and the drives drop it all the
time because they consume the world. Restarts are hand-rolled in many places,
most of them kill the world before it can save, and the soak lane is about to
pay a cold boot per dirty file. This build makes a fresh world cost about what a
warm boot costs, gives the harness one correct way to stop and restart a world,
and measures boot by phase so the next question about it starts from a number.
Seeding slate:
[test-world-lifecycle-slate.md](../slates/tech-debt/test-world-lifecycle-slate.md)
(reuse ledger: § Reuse ledger for the plan).

## What already exists

Surveyed on master `ace3d9b0a`, 2026-11-20:

- **Owning, attaching and keeping a world** exist: an owned boot, an attach
  to a running world, and a kept world a later run can reuse. One port per
  worktree.
- **A fresh world is a dropped database and a cold boot**: about 12–13
  minutes, most of it seeding (every pack row inserted, every venue seeded and
  snapshotted, every producer stocked). A warm boot on an existing database is
  about 2.5 minutes. `testing.md`'s boot-cost table (245 s cold / 97 s warm,
  September) is stale.
- **The drives eat the world.** 112 wire files are marked dirty and say what
  they consume: about 45 eat stock they could hand themselves, about 25 deplete
  persisted ledgers or world structure, others take seats or mint history. A
  reused world fails later files for staging reasons, not code reasons.
- **Restarts are hand-rolled.** The harness has a restart and a timed stop
  that reads the world's own shutdown report; 18 drive files carry their own
  restart, and most of those kill the world two seconds after asking it to
  stop — before the shutdown save. Every restart also drops the
  near-heap-limit diagnostic.
- **The boot budget is wrong for a fresh world**: 420 s by default, against a
  12-minute cold boot; the soak lane passes none.
- **The soak lane** (in flight on its own worktree, soak-repair) now drops the
  database before every dirty file: up to 26 cold boots per pass.
- **No snapshot of a database exists anywhere**, and the Mongo command-line
  tools are not installed. A copy kept as collections inside each worktree's
  database would breach the cluster's 500-collection cap; a dump on disk costs
  none.
- **The nightly reset** classifies every collection (keep / wipe), but it is
  built for a running world — it keeps the clock and wipes saved places under
  live hosts — so it is not a test-world reset.

**Therefore what is genuinely new here is:** a seeded database saved to a file
and restored in place of the drop, a way to know when that file is stale, one
stop-and-restart path the harness owns, and boot timing by phase. Everything
else — owned and kept worlds, the timed stop, the drop's guard on the live
database — is reused.

## Goals

- ⭐ **A fresh world costs about a warm boot, not a cold one.** Starting a
  world from fresh state — the state a dropped database and a cold boot would
  give — takes no more than ~4 minutes end to end (restore plus boot), against
  12–13 today, on the worktree's hosted database.
- **The fresh state is the same fresh state.** A world started from the
  snapshot is indistinguishable, to a drive, from one cold-booted on a dropped
  database: the stock a dirty file consumed is back, the ledgers it depleted
  are full, the seats it took are vacant.
- **The snapshot is never silently stale.** It records what it was seeded
  from; when the content or the pack graph it was seeded from changes, the next
  run that wants fresh state seeds a new one (one cold boot) and says so. Code
  edits alone do not invalidate it — the boot after a restore reconciles them.
- **Every worktree restores only into its own database**, and the live
  database can never be the target — the same refusal the drop has today.
- **A world asked to stop is given the time to save.** Every stop and restart
  the harness performs waits for the world's own shutdown save (bounded) and
  reports it; none kills a world mid-save. No drive file carries its own
  restart.
- **A restarted world keeps its diagnostics** — the near-heap-limit snapshot
  is armed on every world the harness starts.
- **A fresh boot is never cut off by its own budget**: the harness's boot
  budget fits the boot it is about to do.
- **Boot reports its phases.** Each boot says how long each phase took
  (connect and indexes, the pack install, the boot roster, the spawn sweep, the
  world opening), in the log a developer already reads.
- **The soak lane starts each dirty world from the snapshot**, not from a
  cold boot.
- **The CI wire job** has the tools it needs and behaves as before.

## Non-goals

- **Dirty files staging their own stock** (a file that consumes a knife hands
  itself one) → [wire-suite-growth-slate](../slates/tech-debt/wire-suite-growth-slate.md),
  as a census and a ratchet over the `DIRTY_REASON` exports. The restore makes
  run order not matter; self-staging makes a REUSED world not matter, which is
  a different and larger job.
- **Selective resets** (reset only what a run dirtied) → nowhere,
  deliberately: the restore replaces the whole database, and a per-collection
  reset of a running world is what the nightly reset already is.
- **Restoring from a snapshot of the live database** (the soak lane playing
  against real data) → [live-instance-testing-slate](../slates/tech-debt/live-instance-testing-slate.md)
  § 8.
- **Making a cold boot itself faster** (seeding cost, the per-room horizon
  stand-up) → [db-performance-slate](../slates/tech-debt/db-performance-slate.md)
  § 5 and geography-slate item 9; this build measures it and stops paying it,
  it does not shrink it.
- **A schedule for the soak lane** → [crowded-rooms-slate](../slates/tech-debt/crowded-rooms-slate.md)
  § The soak lane is not a schedule.
- **A wire-tier purge of test characters** → wire-suite-growth § 8.

## Placement

Test tooling and the harness, plus the boot's own phase reporting in the
kernel. No pack, no content, no world change. The snapshot is a worktree-local
file, not a database and not a collection. A second worktree needs nothing but
its own first seeding.

## Collisions

None in the world. In the tooling:

- **soak-repair** (the soak worktree, in flight): it edits the soak lane's
  runner and the wire runner's log pipe, and drops before each dirty world.
  This build replaces that drop with a restore. Whichever merges second merges
  the other in first; this build does not wait on it.
- **The 18 drive files with their own restart** move onto the harness's one
  path — a textual change in each, owned by no other build.
- **The CI wire job** runs against its own database on its own image; the
  image gains the tools.
- **tooltips** (build-2) touches the wire harness's session only; no overlap.

## Surface decisions

### What a fresh world is made from

**Answer:** a file — the worktree's database as a seeded world leaves it, saved
once and restored before any run that wants fresh state. Restoring replaces the
database's contents; it creates no database and no collection beyond the
world's own.
**Why:** one database per worktree and the 500-collection cap rule out a copy
kept in the cluster; a file costs nothing there.

### Which tools

**Answer:** the official Mongo dump and restore tools, installed on every
machine and on the CI image (owner ruling, 2026-11-20).
**Why:** exact (types, indexes) and fast; the alternative, a dump written with
the driver the server already ships, avoids an install but owns fidelity bugs.

### When the snapshot is stale

**Answer:** when the content or pack graph it was seeded from differs from the
checkout's. Code changes alone do not stale it.
**Why:** content and packs decide what a seeded world holds; code changes are
frequent, and the boot after a restore reconciles changed rows — reseeding on
every edit would bring the cold boot back. A run that truly wants a cold boot
can still drop the database, as today.

### Who restores, and when

**Answer:** an owned wire run starts from the snapshot by default, in place of
the drop a developer types today; attaching to a running or kept world does not
restore. The soak lane restores before each dirty world.
**Why:** the default should be the state a drive expects; the drop survives
only for the run that wants a true cold boot.

### How long a stop may take

**Answer:** a stop waits for the world's own shutdown save, bounded by a grace
that fits a loaded world (the db-performance build measured ~2 s for 178 hosts;
the grace is generous against that), and reports what the save said. A world
that overruns the grace is killed and the report says so.
**Why:** a kill mid-save loses what the world held — the failure this harness
should never manufacture.

## Lens pass

1. **Pedagogy:** none — no Discipline, no player surface.
2. **Creative expression:** none directly; every drive author gets a fresh
   world for free, and writing a drive that restarts its world stops meaning
   copying a restart.
3. **Immersion and participation:** none — nothing a player sees.
4. **Values:** none undecided.
5. **Continuity:** no epoch content. The snapshot is versioned by what it was
   seeded from, so it cannot outlive the world it describes.
6. **Economy:** the developer's hours and the shared box. A cold boot per run
   is hours per build and a 3 GB world standing longer than it needs to; the
   restore shortens both. The cluster's collection cap is respected.
7. **Governance:** none — no person is judged. The live database's refusal is
   the one rule, and it is inherited unchanged.

## The drive

Infra with no player surface: the drive is what a developer (or an agent) does
with the wire tooling, against the worktree's own hosted database. Every step
is `instant`, `short` or `staged`; **no soak drive**, deliberately. It ends
with a restart (step 6).

### Blocking drive

1. **A cold boot, measured** (`short`, `staged`). Drop the worktree database
   and boot a world. The log reports each boot phase with its duration; the
   phases add up to the boot. (Recorded as the baseline every later step is
   compared with.)
2. **The snapshot is made** (`short`, `staged`). With no snapshot present, a
   run that wants fresh state seeds the world once and saves it; the run says
   it did, and the snapshot records what it was seeded from.
3. **A dirtied world, made fresh** (`short`, `player` for the observations).
   Run a dirty drive that consumes the world (a felled wood, a bought lot, a
   taken seat, consumed stock). Start a new owned run: it starts from the
   snapshot, and a player finds the wood standing, the lot for sale, the seat
   vacant and the stock on the counter — exactly as after a cold boot. The
   fresh start, restore plus boot, takes no more than ~4 minutes.
4. **A stale snapshot is noticed** (`instant`, `staged`). Change a pack's
   content in the checkout; the next run that wants fresh state says the
   snapshot is stale, seeds a new one, and uses it. A code-only change does
   not.
5. **A refused target** (`instant`, `staged`). Pointed at the live database,
   the restore refuses, before it touches anything, in the same words the drop
   uses.
6. **A loaded world stops and comes back** (`short`, `player`). With players
   connected and holding things, a drive restarts the world through the
   harness: the stop waits for the shutdown save, the save is reported (count,
   time, failures), nobody is killed mid-save, the restarted world has its
   heap diagnostic armed, and every player comes back where they stood, holding
   what they held.
7. **The drives run on it** (`short`, `staged`). Two dirty drives that each
   consumed the other's preconditions on a shared world now pass in either
   order, each starting fresh; a drive that used to carry its own restart runs
   on the harness's.
8. **The soak lane** (`short`, `staged`). The soak lane runs two dirty soak
   files; each starts from the snapshot, neither pays a cold boot, and the
   lane's report says so.

### Soak drive

None. Nothing here moves with the game clock.

## Acceptance criteria

- A world started from fresh state is ready in about a warm boot's time
  (≤ ~4 minutes, restore plus boot), not 12–13 minutes.
- A world started from the snapshot holds exactly what a cold boot on a
  dropped database would: consumed stock, depleted ledgers and taken seats are
  restored.
- A stale snapshot is detected and replaced, never silently used; a
  code-only change does not stale it.
- The restore never targets the live database.
- Every stop and restart the harness performs waits for the world's shutdown
  save and reports it; no drive file carries its own restart.
- A restarted world has the heap diagnostic armed.
- A boot reports each phase's duration.
- The soak lane's dirty worlds start from the snapshot.
- The CI wire job passes as before, with the tools available.

## Cross-references

- [test-world-lifecycle-slate.md](../slates/tech-debt/test-world-lifecycle-slate.md)
  (seeding slate, reuse ledger)
- [testing.md](../testing.md) (the wire tier, attach or own, the boot cost, the
  soak lane) · [deployment.md](../deployment.md) (the Mongo environment policy)
- [db-performance-slate.md](../slates/tech-debt/db-performance-slate.md) § 5 ·
  [wire-suite-growth-slate.md](../slates/tech-debt/wire-suite-growth-slate.md) ·
  [live-instance-testing-slate.md](../slates/tech-debt/live-instance-testing-slate.md) § 8 ·
  [soak-lane-slate.md](../slates/tech-debt/soak-lane-slate.md)
