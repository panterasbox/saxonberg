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

Surveyed on master `8b169a9a7`, 2026-11-18 (the slate dates from
2026-11-08; its § 1 holds — a first draft of this doc "corrected" it
wrongly, and the plan's survey caught that):

- ⚠⚠ **Participation treats every player as one person.** Every player's
  body comes from one shared row, so keyed on the body's lineage, all
  players' participation is ONE subject (and all shades another). Every
  reader that asks by the person (`standing`, the profile, the dashboard)
  therefore reads none of it; only the login roster reads the shared
  figure. Renown already keys on the person. Both subsystem docs still say
  the stored key is the lineage path.
- ⚠ **The producer stock has the same defect on the ACTOR**: every player
  counts as one actor, so its rule that you cannot credit yourself never
  fires.
- ⚠ **A login screen earns participation** under a fresh random id per
  connection — a subject that is never removed and is re-scored forever.
- **The three scoring services** (participation, renown, producer) each run
  a pass every 60 s that reads their whole event history, then re-scores
  every subject that has ever had an event, one find and one save at a
  time. The reads players see are already derived from warmed values; it
  is the recurring pass that costs.
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

**Therefore what is genuinely new here is:** nothing a player sees beyond
their own standing reading as their own. Participation and producer keys
that follow the person, scoring work proportional to
the people who did something, fewer and batched round trips on the hot
paths the measurement ranks, a shutdown that saves everything inside its
grace, and the database's own numbers on `/stats`.

## Goals

- ⭐ **Each player's participation is their own, and one standing across
  all their bodies.** Two players' participation are two standings; what a
  player earns living and as a shade is one. **Participation starts fresh**
  (owner ruling, 2026-11-18): the shared subject's rows are left where they
  are and decay; each player accrues their own from here.
- **The producer stock credits per person,** and a player crediting
  themselves no longer counts (owner ruling, 2026-11-18: in this build, as
  its own removable change).
- **A login screen earns nothing** (owner ruling, 2026-11-18): only a body
  a person plays is a subject.
- **Scoring costs what happened, not who ever played.** With nobody
  acting, the three scoring services make no database round trips beyond a
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
- **Re-deriving the shared subject's participation rows** into each
  person's standing. → nowhere, deliberately: no migrations, and a shared
  row cannot be split back into people; they decay.

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

### The shared participation rows

**Answer:** participation starts fresh — the shared subject's rows stay and
decay; nobody inherits them.
**Why:** no migrations, and a row filed under "every player" cannot be
assigned to one; participation decays in real time, so nothing durable is
lost.

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
   weight in the polity; today it reads one figure for everyone. This build
   makes it read the person. The criterion is unchanged.

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
4. **Each person's own standing, across death** (`instant`, `staged`). Two
   players act; each reads their own participation through `standing` and
   their profile, and they differ. One of them dies and, as a shade, acts:
   their standing is one continuous participation, not two; the login
   roster's band reads that person, not everyone. A player using what
   they made themselves earns no producer credit for it; another player
   using it does. A login screen earns nothing.
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

- Each player's participation is their own, read the same by every reader,
  and continues unbroken when they die and act as a shade.
- Producer credit goes to the person who made the thing, never for using
  your own; a login screen earns no participation.
- With nobody acting, the three scoring services' database traffic is a constant,
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
