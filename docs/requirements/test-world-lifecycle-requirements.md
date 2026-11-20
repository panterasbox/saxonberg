# Test-world lifecycle — requirements (build 1 of 2)

**Kind:** infra (test tooling) and a test-only content pack
**Leads from:** kernel and tooling. **First consumer:** the kernel and
platform wire drives, migrated in this build (30 files, 11 of them as their
kernel half); build 2 moves the pack drives and the content halves.

A wire drive should prove a SYSTEM, whatever state the world is in, and should
not care which placeholder content the world happens to hold — that content
will be replaced, and the drives must outlive it (owner, 2026-11-20). Today
they do the opposite: 120 of 127 drives stand in Terminus's rooms, bank and
shops, eat its stock and seats, and so need a dropped database and a 12–13
minute cold boot to run again. This build gives the suite **a scaffold of its
own** — a test-only fixture pack, installed only in test worlds, that nothing
consumes — and the runtime staging a drive needs to make everything it DOES
consume; moves every kernel and platform drive onto them; cleans up what a run
leaves behind; and gives the harness one correct way to stop and restart a
world. Seeding slate:
[test-world-lifecycle-slate.md](../slates/tech-debt/test-world-lifecycle-slate.md)
(reuse ledger: § Reuse ledger for the plan). Build 2 (the pack drives, the
sweeps, the locality flows) is recorded there.

## What already exists

Surveyed on master `ace3d9b0a`, 2026-11-20:

- **127 wire drives; 4 name no content.** 120 name `/world/...`: 114 lean on
  Terminus, 75 on its bank, 40 on its general store, 47 seat themselves on its
  committee. 121 put their characters in a named place; a place that does not
  exist fails the login.
- **What they really test:** 36 a kernel or platform system (they need a place
  to stand, sometimes money, a shop, an NPC); 22 a deliberate sweep across
  every pack's rows; 22 an infrastructure pack's mechanism (water, transport,
  ground, energy, residence, medicine); 40 a trade pack's mechanism; 7 a
  specific locality's own flow.
- **Runtime staging exists, but only for what already exists.** A drive can
  hand a character a thing, set a field on an existing object, move the clock,
  pin the weather, move an existing ship, appoint someone to an existing
  business, seat a character on a committee, give them arrival cash. It cannot
  create, from nothing: a place to stand and walk in, a bank account (only
  Terminus's counter opens one), a venue with positions, an NPC in a role, a
  shop with stock.
- **No test-only content exists**, and no pack can be marked test-only; only
  command views can (`testharness`).
- **A run leaves litter**: about 400 test characters a run, minted money with
  no sink, clones and taken seats never returned. Only the browser tests purge
  their characters.
- **Restarts are hand-rolled** in 18 drives, most killing the world two
  seconds after asking it to stop — before its shutdown save — and every
  restart drops the near-heap-limit diagnostic. The boot budget (420 s) does
  not fit a fresh boot.
- **Pack drives cannot live in their packs**: the runner finds drives only in
  the wire package.

**Therefore what is genuinely new here is:** a test-only pack and the gate
that keeps it out of every other world; the scaffold in it; runtime staging
for the few things a drive consumes that cannot be handed or set today;
cleanup of what a run leaves; one restart path; and the rule — enforced —
that a drive names no placeholder content.

## Goals

- ⭐ **A drive runs in whatever state the world is in.** A migrated drive
  passes on a fresh world, on a world every other drive has already run in, and
  run twice in a row — with no database drop between.
- ⭐ **No kernel or platform drive names placeholder content.** It stands in
  the scaffold, uses engine rows and its own staged state, and is untouched
  when Terminus (or any locality) is replaced or removed. Of the 36 drives
  surveyed as kernel or platform (owner ruling, 2026-11-20, on the planner's
  per-file reading): **19 migrate whole; 11 are split** — the kernel steps
  migrate, the steps that assert one pack's own rows move unchanged to a
  content file for build 2; **6 test specific content** (agent-coordination,
  identity, consequence, economic-bootstrap, zone-instancing, aether-devices)
  and move to build 2 whole.
- **The scaffold is the suite's own, and is never consumed.** A small test
  locality of about fourteen places — rooms joined by exits, lit and unlit, a
  locked door with a free side, a window, a hearth, a forge, a trap, a
  noticeboard, a locality with its own weather, a second parcel — a bank where
  any test character can open an account, a venue with positions and a seat,
  a shopfront, and NPCs standing in roles. Every piece is a kernel kind,
  traced to the drive that stands on it. Drives use it; they do not use it
  up.
- **What a drive consumes, it makes.** Stock, money, a seat appointment, a
  ledger's level: staged at runtime by the drive itself, by tools that work
  whatever the world holds.
- **The fixture pack exists only in test worlds.** It installs in a world
  booted as a test world (the wire runner's, CI's, the soak lane's) and is
  refused, loudly, by any other — the live world can never hold it.
- **The Governor can retire money to the reserve.** The mirror of the
  recorded emergency mint: an amount withdrawn from an account back to the
  reserve, with a reason, through the same banking path as every posting,
  recorded and visible on the reserve's dashboard and audit, and the holder is
  told. A real operator act in any world (owner ruling, 2026-11-20); the
  cleanup uses it to return the money a run minted.
- **A run cleans up after itself.** The characters, clones, seats and money a
  run made are removed when it ends; what a crashed run left is removed at the
  next start. A world that has hosted a hundred runs holds no more test litter
  than a fresh one.
- **A world asked to stop is given the time to save.** Every stop and restart
  the harness performs waits for the world's shutdown save (bounded) and
  reports it; none kills a world mid-save; no drive carries its own restart; a
  restarted world keeps its heap diagnostic; a fresh boot is never cut off by
  its own budget.
- **A pack can own its drives.** The runner finds a drive that lives in a
  pack, so build 2's moves need no runner change.
- **The rule stays kept.** A drive that names placeholder content is refused
  at the gate; the existing ones are counted and the count only falls (build 2
  takes it to zero).

## Non-goals

- **The 62 infrastructure and trade pack drives** moving into their packs and
  standing up their own sites (a clay pit, a wood, a well) → **build 2**, this
  slate.
- **The 22 sweeps across every pack** becoming content-agnostic (enumerate
  what is installed, never name it) → build 2.
- **The 7 locality flows** moving to their locality's pack as they are →
  build 2.
- **A snapshot or restore of the database** → nowhere, deliberately: a world
  that drives cannot dirty needs no reset (it was this draft's first answer,
  and the wrong one).
- **Making a cold boot faster** → [db-performance-slate](../slates/tech-debt/db-performance-slate.md)
  § 5. Boot is measured here only as far as the restart path needs.
- **Restoring from a snapshot of the live database** →
  [live-instance-testing-slate](../slates/tech-debt/live-instance-testing-slate.md)
  § 8.
- **A schedule for the soak lane** → [crowded-rooms-slate](../slates/tech-debt/crowded-rooms-slate.md).

## Placement

- **The fixture pack** is a content pack of its own, owned by the test suite,
  holding a place under the world's place axis (a test locality) and the
  scaffold's rows. It depends only on the platform pack and, for the
  shopfront, the shopkeeping pack. A second scaffold (build 2's per-pack
  sites) needs no new pack mechanism.
- **The test-only gate** belongs to the pack mechanism: a pack can declare
  itself test-only, and only a test world installs it.
- **Staging, cleanup and the restart path** belong to the test tooling and the
  harness; any server side of them is test-only, as the existing test routes
  are.

## Collisions

None in the world: the fixture pack's locality is new and stands apart from
every authored place, reachable only by test characters. In the tooling:

- **soak-repair** (the soak worktree, in flight) edits the soak lane runner and
  drops the database before each dirty soak world. Unchanged by this build
  except that the soak lane's world installs the fixture pack; the drops go
  when build 2 empties the dirty list. Whichever merges second merges the other
  in first.
- **The 18 drives with their own restart** move onto the harness's one path.
- **The CI wire job** boots a test world, so it installs the fixture pack.
- **The live deploy** must never install it — the gate's whole purpose.

## Surface decisions

### Scaffold, or built at runtime

**Answer:** a test-only fixture pack for the scaffold — the places, the bank,
the venue, the shopfront, the NPCs — and runtime staging for everything a drive
consumes (owner ruling, 2026-11-20).
**Why:** authored scaffold is stable, reviewable and loads like any content;
consumables staged by the drive are what make the world's state irrelevant.

### What the scaffold holds

**Answer:** exactly what the 36 kernel and platform drives stand on, and no
more: a few rooms joined by exits (lit, and one unlit), a bank counter any test
character can open an account at, a venue with positions and a seat, a
shopfront, and NPCs in roles. Each piece is generic — it represents a kind, not
a story.
**Why:** a scaffold that grows past its consumers becomes the placeholder
content it replaces.

### What "the world's state doesn't matter" means

**Answer:** a migrated drive asserts only on what it staged or reads from the
scaffold; it never depends on another drive having run or not run, on stock
being present, or on a seat being vacant. It must pass three ways: fresh, after
the whole suite, and twice in a row.
**Why:** the owner's definition — tests stage whatever state they need,
regardless of the world's.

### Cleanup

**Answer:** each run removes what it made — its characters, its clones, its
appointments, its money — at the end, and the next run removes a crashed run's
leftovers at the start. The scaffold is never removed; the fixture pack owns
it.
**Why:** a long-lived world that accumulates litter becomes a state that
matters again.

### How long a stop may take

**Answer:** a stop waits for the world's own shutdown save, bounded by a grace
that fits a loaded world, and reports what the save said; a world that overruns
it is killed and the report says so.
**Why:** a kill mid-save loses what the world held — a failure the harness
should never manufacture.

## Lens pass

1. **Pedagogy:** none.
2. **Creative expression:** ⭐ the deciding limb — content authors can replace
   Terminus without breaking a single systems drive, and a drive author writes
   against a stable scaffold instead of hunting for a room that still has a
   knife in it.
3. **Immersion and participation:** none for players — the test locality is
   reachable only in test worlds.
4. **Values:** none undecided.
5. **Continuity:** the scaffold represents kinds, not an epoch's story; it
   survives a content reset by construction.
6. **Economy:** the developer's hours and the shared box: no drop, no cold
   boot per run, no 3 GB world standing through one. ⭐ And the money supply
   gains a sink: until now the reserve could only mint by override; retiring
   is the same act reversed, so a supply that was inflated by mistake (or by
   a test) can be corrected on the record.
7. **Governance:** ⚠ retiring money takes it from a person's account — it
   judges a person. **Criterion:** the Governor's own reason, which the act
   requires and the record keeps. **Appeal:** the act is public on the
   reserve's audit and the holder is told, so the polity can contest it
   through the Governor's office like any reserve act. **Entrenchment:**
   tier B — the code ships the act and its seat, as with the override; the
   polity cannot widen who may do it. The test-only rule stays a hard gate.

## The drive

Infra: the drive is what a developer (or an agent) does with the wire tooling,
on the worktree's own world. Every step is `instant`, `short` or `staged`; **no
soak drive**, deliberately. It carries a restart (step 6).

### Blocking drive

1. **The scaffold is there** (`instant`, `player`). A test character logs in to
   the test locality, walks its rooms by their exits, looks in the light and in
   the unlit room, opens an account at its bank, reads its venue's openings,
   and finds its NPCs at their posts.
2. **Only in a test world** (`short`, `staged`). A world booted as an ordinary
   (non-test) world refuses to install the fixture pack, says so, and holds
   none of its rows.
3. **Indifferent to state** (`short`, `staged`). Run the migrated kernel and
   platform drives on a fresh world; run them again on the same world without a
   drop; run them after the whole suite has dirtied it. All pass all three
   times.
4. **No placeholder content** (`instant`, `staged`). With Terminus's pack left
   out of the world, the migrated drives still pass.
5. **Clean after itself** (`short`, `staged`). After a full run, the world
   holds no test characters, clones, appointments or minted money the run made;
   a run killed partway leaves litter that the next run's start removes.
5a. **Retiring money** (`instant`, `player` for the holder). The Governor
   retires an amount from a character's account with a reason: the balance
   falls by it, the money supply falls by it, the reserve's audit shows the
   act and its reason, and the holder is told. Retiring more than the account
   holds is refused.
6. **A loaded world stops and comes back** (`short`, `player`). With players
   connected in the scaffold and holding things, a drive restarts the world
   through the harness: the stop waits for the save and reports it, nobody is
   killed mid-save, the heap diagnostic is armed on the new world, and every
   player comes back where they stood, holding what they held.
7. **A pack's drive is found** (`instant`, `staged`). A drive placed in a pack
   runs with the suite.
8. **The rule holds** (`instant`, `staged`). A drive that names a locality
   path is refused at the gate; the count of drives still naming one is
   reported and cannot rise.

### Soak drive

None. Nothing here moves with the game clock.

## Acceptance criteria

- The 19 migrated drives and the 11 kernel halves pass on a fresh world,
  again on the same world without a drop, and after the whole suite — and with
  Terminus's pack absent; the 6 content drives and the 11 content halves are
  recorded for build 2.
- None of them names placeholder content.
- The fixture pack installs only in a test world; any other world refuses it.
- A test character can stand, walk, bank, find work and find NPCs in the
  scaffold.
- The Governor can retire money from an account to the reserve, with a
  reason, on the record, and the holder is told.
- A run leaves no test characters, clones, appointments or minted money; a
  crashed run's leftovers are removed by the next.
- Every stop and restart waits for the shutdown save and reports it; no drive
  carries its own restart; a restarted world has its heap diagnostic.
- A drive that lives in a pack runs with the suite.
- A drive that names a locality is refused, and the number still doing so
  cannot rise.

## Cross-references

- [test-world-lifecycle-slate.md](../slates/tech-debt/test-world-lifecycle-slate.md)
  (seeding slate, reuse ledger, build 2)
- [testing.md](../testing.md) (the wire tier, attach or own, the soak lane) ·
  [content-packs.md](../subsystems/content-packs.md) (discovery, the installer)
- [wire-suite-growth-slate.md](../slates/tech-debt/wire-suite-growth-slate.md)
  (§ 8 world litter) · [db-performance-slate.md](../slates/tech-debt/db-performance-slate.md)
  § 5 · [soak-lane-slate.md](../slates/tech-debt/soak-lane-slate.md)
