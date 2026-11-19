# Database performance — requirements

**Kind:** refactor/sweep (performance, plus one correctness fix)
**Leads from:** kernel. **First consumer:** the running world — every paid,
banked, recorded or scored act, and every shutdown.

The game talks to its database over the network (one server; the database
hosted, ~100 ms a round trip; [deployment.md](../deployment.md)). In a busy
world commands do not wait on the CPU, they wait for a database connection:
the controllers-are-io drives stalled with the CPU idle and a full pool. This
build makes the world ask the database less, ask it in batches, and save
everything it owns when it stops, and it fixes one key that splits a
player's participation in two. Seeding slate:
[db-performance-slate.md](../slates/tech-debt/db-performance-slate.md)
(reuse ledger: § Reuse ledger for the plan).

## What already exists

Surveyed on master `8b169a9a7`, 2026-11-18. The slate was written 2026-11-08
and is wrong about one thing:

- ⚠ **The participation key is mostly right.** A player's main body already
  answers to a per-player path, the same one their identity uses, so the
  slate's *"every player collapses into one subject"* is no longer true.
  What remains: when a player dies and acts as a **shade**, the shade's
  participation is filed under a different subject from the living
  player's, so standing splits across death. Renown already keys on the
  person. One login-time read and one cross-stock product still read the
  participation side by the body's lineage. Both subsystem docs still say
  the stored key is the lineage path.
- **The two scoring services** (participation and renown) each run a pass
  every 60 s that reads their whole event history, then re-scores every
  person who has ever had an event, one find and one save at a time. The
  reads players see are already derived from warmed values; it is the
  recurring pass that costs.
- **The pool** is 10 connections. A query trace (`SAXONBERG_QUERY_TRACE=1`)
  prints counts and time in the database per caller; `/stats` reports
  CPU and the event loop but nothing about the database.
- **The hot paths** each pay several uncached round trips per act: payroll
  and the venue's account (two to four finds per paid act), a person's
  competence bands (an uncached transcript read on every call), placing and
  stamping a consigned good (a find and a save each, more for a stamp), and
  the frame record (buffered off the act, then saved one row at a time).
- **The shutdown save** captures every persistent object one at a time, a
  find and a save each. On a loaded world (172 objects) that was about 3.5
  minutes; the harness kills a restarting world after 15 s and a dev
  preflight after 2 s, so a loaded world loses state on any short stop.
- **Siblings in flight.** failure-model edits banking's refusal paths;
  aether-devices edits the chattel stamp; soak-repair edits the wire
  runner's log pipe. None edits the database layer, the scoring services,
  the shutdown save or the frame record.

**Therefore what is genuinely new here is:** nothing a player sees. A
participation key that follows the person, scoring work proportional to
the people who did something, fewer and batched round trips on the hot
paths the measurement ranks, a shutdown that saves everything inside its
grace, and the database's own numbers on `/stats`.

## Goals

- ⭐ **A player's participation is one standing across all their bodies.**
  The participation a player earns living and the participation they earn
  as a shade are the same standing, read the same everywhere.
  **The existing rows are kept** — a player's main-body rows are already
  correctly keyed (owner's earlier "start fresh" ruling was premised on the
  collapse the survey disproved; shade-era rows stay where they are and
  decay).
- **Scoring costs what happened, not who ever played.** With nobody
  acting, the scoring services make no database round trips beyond a
  constant; when a player acts, only that player is re-scored. A world that
  has seen hundreds of players idles no busier than a new one.
- **No command waits for a database connection** in the thirty-player
  working drive, on the worktree's hosted database (the live shape).
- **The ranked hot paths cost fewer round trips per act** — at least half
  as many for each path this build takes, measured per act before and
  after; which paths are taken is decided by measurement, not by this list.
- **A loaded world saves everything it owns when it stops,** inside a
  bounded grace (30 s for the drive's loaded world), and restarts with all
  of it.
- **The database's numbers are readable on `/stats`**: connections in use
  and waiting, round trips per second, and time spent waiting on the
  database — so the next performance question starts from a number.
- **No player-facing number gets worse**: the paid acts, `say` and
  `look` p95 in the drive no worse than the baseline (the box's 10% bound).

## Non-goals

- **Cold boot (12–13 min) and the harness's restart path** — a test-time
  cost. → [test-world-lifecycle-slate](../slates/tech-debt/test-world-lifecycle-slate.md).
  This build's shutdown fix helps it; the restart path's 15 s kill is that
  slate's.
- **The 4 GB heap death** — not reproduced since its fixes. Reported if
  seen; the near-heap-limit snapshot flag belongs with the harness.
  → test-world-lifecycle-slate.
- **The scale envelope** (budgets on minting and on objects in an open
  place) — enforcement, not speed. → stays in db-performance-slate § 7,
  its own build.
- **Wire worlds inheriting `NODE_ENV=test`** (found by
  call-security-performance). → call-security-performance-slate § 7½; the
  wire runner's.
- **A closer database or a bigger box** — a deployment decision. →
  [deployment.md](../deployment.md), only if this build's measurement says
  round-trip latency alone cannot be absorbed.
- **Changing what standing measures** (decay, weights, the renown × engagement
  product). → nowhere, deliberately: this build changes when the arithmetic
  runs, never its answer.
- **Re-deriving shade-era participation rows** into the person's standing.
  → nowhere, deliberately: no migrations; they decay.

## Placement

The kernel: the database layer, the two scoring services, the shutdown save,
the frame record, and the hot callers in banking, employment, advancement and
chattel. No pack, no content row, no namespace root. A second world needs
nothing.

## Collisions

None in the world: no place, object or NPC changes. In the code:

- **failure-model (build-4)** edits banking's refusals and two payment
  verbs. This build changes how often banking reads, not what it decides.
  Whichever merges second merges the other in first.
- **aether-devices (build-3)** adds a `bound` mark to the chattel stamp. This
  build may batch or cache the stamp's reads; the mark is carried.
- **soak-repair** edits the wire runner's log pipe; this build's drive may
  edit the runner's restart grace — a small textual overlap.

## Surface decisions

### Which hot paths are taken

**Answer:** the ones the baseline measurement ranks highest by round trips ×
rate in the working drive, cut by the slate's order only when the numbers
tie. Every path taken must at least halve its round trips per act.
**Why:** the slate's list came from synchronous captures on one drive; the
crowd-rooms and call-security builds both found the measurement reordered the
slate.

### Pool size or fewer round trips

**Answer:** fewer round trips first; the pool size changes only if the
drive still shows waiting after the cuts, and then by measurement against
the hosted database's connection limit.
**Why:** the pool fills on latency × rate; a bigger pool hides the rate and
spends a shared limit.

### The shutdown grace

**Answer:** a loaded world (the drive's thirty players plus the standing
world) saves everything in under 30 s. The grace values the harness and the
preflight use are not raised by this build.
**Why:** raising a grace hides the serial save; a world killed at any grace
should have lost nothing it could have saved in time.

### Shade-era participation

**Answer:** kept as it is; not merged into the living standing.
**Why:** no migrations; participation decays in real time, so the split
heals on its own. The fix stops new splits.

## Lens pass

1. **Pedagogy:** none directly. Standing (the measure of a person's
   engagement) becomes one continuous thing across death, which is what a
   player reads it as.
2. **Creative expression:** an author writes nothing; nothing an author
   wrote changes.
3. **Immersion and participation:** 3a — a command answered while the world
   waits on a connection is the lag a crowd notices; a player who dies does
   not lose half their standing. 3b — nothing new for the polity.
4. **Values:** none undecided — no check, measure or weight changes.
5. **Continuity:** no epoch content.
6. **Economy:** the host's bill: round trips are the database tier's
   cost, and the live box is the cost model's one box.
7. **Governance:** standing feeds influence, which judges a person's
   weight in the polity; this build makes that judgment read the right
   person after death. The criterion is unchanged.

## The drive

Kernel-led with no player surface: it drives the nearest content that pays,
banks, consigns, records and scores — a crowd working the market. Every step
is `instant`, `short` or `staged`; no `span` step, so **no soak drive**,
deliberately. No new place, so no light step. The restart is step 6.

### Blocking drive

1. **Baseline** (`short`, `staged`). On master, the quiet box, the
   worktree's hosted database: steps 2–7 with the database's numbers
   recorded per phase — round trips per second by caller, connections in
   use and waiting, the paid acts' p95, the shutdown save's duration. This
   is what every later step is compared with.
2. **A long-lived, quiet world** (`short`, `staged`). Two hundred past
   players are staged with participation and renown history; nobody is
   logged in. Over the idle window the scoring services make no round trips
   beyond a constant. One player then logs in and acts; only that player is
   re-scored.
3. **Thirty at work** (`short`, `player`). Thirty bodies log in, take a
   shift, are paid, bank the pay, consign a good to a shelf and look at their
   own standing, while an NPC consigns. No command waits for a database
   connection; the paid acts' p95, `say` and `look` are no worse than step 1;
   each hot path this build took makes at most half its baseline round
   trips per act.
4. **One standing across death** (`instant`, `staged`). A player with
   participation dies and, as a shade, acts. Their standing read through
   `standing` and their profile is one continuous participation, not two;
   the login-time band reads the same person.
5. **The operator's view** (`instant`, `staged`). `/stats` shows connections
   in use and waiting, round trips per second and time waiting on the
   database, and they move when the crowd acts.
6. **A loaded world stops and comes back** (`short`, `player`). With the
   thirty and their holdings standing, the world is stopped with a 30 s
   grace. Every persistent object is saved inside it (the shutdown reports
   how many and how long). The world restarts; the thirty log in where they
   quit, holding what they held, with the standing they had.
7. **Nothing a check decided changed** (`instant`, `staged`). A refused
   payment is still refused, a consignment's title still transfers to the
   shelf's owner, a competence band reads what it read before for the same
   transcript.

### Soak drive

None. Nothing here moves with the game clock.

## Acceptance criteria

- A player who dies and acts as a shade has one participation standing, read
  the same by every reader; their earlier standing is intact.
- With nobody acting, the scoring services' database traffic is a constant,
  whatever the number of past players.
- Thirty players working, banking and consigning on the hosted database
  never wait for a database connection, and see paid acts, `say` and
  `look` no slower than before.
- Each hot path this build takes costs at most half its earlier round trips
  per act.
- A world with thirty players and their holdings stops inside 30 s having
  saved everything, and restarts with all of it.
- `/stats` shows the database's connections, round trips and waiting.

## Cross-references

- [db-performance-slate.md](../slates/tech-debt/db-performance-slate.md)
  (seeding slate, reuse ledger)
- [participation.md](../subsystems/participation.md) ·
  [renown.md](../subsystems/renown.md) ·
  [persistence.md](../subsystems/persistence.md) ·
  [banking.md](../subsystems/banking.md) ·
  [employment.md](../subsystems/employment.md) ·
  [chattel.md](../subsystems/chattel.md) ·
  [record-layer.md](../subsystems/record-layer.md) ·
  [testing.md](../testing.md) (the quiet box)
- [test-world-lifecycle-slate.md](../slates/tech-debt/test-world-lifecycle-slate.md),
  [crowded-rooms-slate.md](../slates/tech-debt/crowded-rooms-slate.md),
  [call-security-performance-slate.md](../slates/tech-debt/call-security-performance-slate.md)
