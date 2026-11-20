# Test-world lifecycle — fresh state without a cold boot

> **Status: UNBUILT** — raised by the owner 2026-11-08 during the
> controllers-are-io build (MR !527): *"do we need to have a conversation later
> about rethinking these complete mongo wipes and be more selective about
> database operations needed for development? … if it's becoming a problem
> for test stability or even just wasting time we can reclaim."* Not designed;
> this records the evidence for that conversation.
> **Left:** in requirements 2026-11-20 (build 1 of 2) →
> [test-world-lifecycle-requirements.md](../../requirements/test-world-lifecycle-requirements.md):
> a test-only fixture pack (the scaffold) · runtime staging for what a drive
> consumes · run cleanup · one restart path · the no-placeholder-content rule
> as a gate · the 36 kernel/platform drives migrated. **Build 2** (§ Build 2):
> the 62 pack drives into their packs, building their own sites · the 22
> sweeps made content-agnostic · the 7 locality flows moved
> **Size:** two builds

## What it costs today

- **A cold boot takes 12–13 minutes** after a dropped DB; a warm boot on an
  existing one ~2.5 minutes. Most drive and sibling runs in that build began
  with a drop, so cold boots were likely hours of waiting across the build.
  (Boot's own cost is [db-performance-slate.md](./db-performance-slate.md) § 5.)
- **We drop because the tests eat the world.** The `.dirty.` wire files
  consume what they touch: the boning knife, the fuel yard's cordwood, the
  cookhouse logs, a cow left drafted, a felled wood. A reused DB then fails
  later files for staging reasons, not code reasons; on one reused DB `buy`
  failed on a bank account floor. A drive reading red for a reason that isn't
  the code is the instability the owner asked about.
- **History accumulates.** A DB that has held a few hundred sessions makes the
  renown/participation recompute drive ~18 operations a second on its own
  (db-performance § 2), so long-lived test DBs are also slower worlds.
- One database per worktree is the rule ([deployment.md § The Mongo environment policy](../../deployment.md), the Atlas
  500-collection cap), so the answer cannot be "a DB per run".

## Directions to discuss (untried)

1. **Seed once, restore many.** Boot a fresh world once per pack graph, take a
   `mongodump` of the seeded DB (into the worktree's own DB namespace, never a
   new database), and `mongorestore` before each run: fresh state at
   near-warm cost. Open: does anything need a cold boot to be correct (the
   boot-time seeders, `holder_snapshots` restoring rooms, pack reconcile)?
2. **Dirty files stage their own stock.** A file that consumes a knife hands
   itself a knife (test-hand) instead of using the world's. Then a reused
   world stops failing for staging reasons, and files can run in any order.
   The `DIRTY_REASON` export already names what each one consumes, so the
   census exists.
3. **The harness's restart path.** It kills a restarting world after 15 s
   (a busy world needs ~3.5 min to save), and the restart drops
   `--heapsnapshot-near-heap-limit`. W11 fixed a reuse-restart that piped the
   new world through the test worker (the worker's death killed the world with
   no log line).
4. **Selective resets** instead of whole wipes: reset only the collections a
   run dirties (the `RESET_DISPOSITIONS` table already classifies them per
   collection: [record-layer.md](../../subsystems/record-layer.md)).

## The conversation, held 2026-11-20

The first answer — snapshot a seeded world and restore it before every run —
was wrong, and the owner said why: *"if you're relying on staging a whole world
just to consume a handful of things and then restaging it all again that's
just stupid … why can't tests just use that stuff to stage whatever state they
need regardless of whatever state the world's already in? … at some point all
this placeholder content is going away for the real thing and we're still
gonna need tests."* So: **a drive proves a system whatever the world's state,
and names no placeholder content.** Rulings: a **test-only fixture pack**
holds the scaffold nothing consumes; drives stage what they consume at
runtime; content-specific drives live with their pack; two builds.

## Build 2 (after build 1)

- **The 62 infrastructure and trade pack drives** move into their packs and
  stand up their own sites at runtime from their own rows (a clay pit, a wood,
  a well, a ship on a sea) in the scaffold — none of the 45 trade or 5
  infrastructure packs owns a place today, so every one borrows Terminus's.
  Open: does each pack ship test-only fixtures of its own, or build its site
  at runtime into the fixture pack's ground?
- **The 22 sweeps** (every controller, every row loads, …) enumerate what is
  installed and never name it.
- **The 7 locality flows** (farming, farmstead, crafting, cooking, textiles,
  pets, pets-offer) move to their locality's pack unchanged.
- The placeholder-content count reaches zero; the soak lane's per-dirty-world
  drops go with the last dirty file.

## Reuse ledger for the plan (2026-11-20)

Surveyed on master `ace3d9b0a`. Every row is one the plan must account for.

| concept | what already does it | reuse or new |
|---|---|---|
| owning / attaching / keeping a world | `packages/wire/src/runner/boot.ts` (`bootOwnedWorld`, `stopOwnedWorld`, `WIRE_KEEP_WORLD`, `WIRE_REUSE`, `kept-world.json`), `global-setup.ts` | **reuse** — a long-lived kept world becomes the normal case |
| a timed stop that reads the shutdown save | `harness/world.ts` `stopWorldWithin`, `lastShutdownReport` (db-performance) | **reuse** — the one restart path is built on it |
| restart | `harness/world.ts` `restartWorld` + **18 files with their own copy** (preflight + `bootOwnedWorld`, most with the 2 s preflight kill) | **generalize** — one harness path; the copies deleted |
| the kill graces | `stopOwnedWorld`'s 15 s; `dev-preflight.mjs` `PREFLIGHT_GRACE_MS` (2 s default; six files pass 60–300 s) | **generalize** |
| the heap flag | nothing: `boot.ts` strips `NODE_OPTIONS` on every owned boot | **new** (a flag kept on the spawned world) |
| the boot budget | `WIRE_BOOT_TIMEOUT` default 420 s; soak passes none; testing.md says use 900 s after `reset:db` | **generalize** |
| dropping the worktree DB | `packages/server/scripts/reset-db.ts` (refuses `saxonberg_demo`) | **kept** for a deliberate cold boot; no longer the way to a fresh run |
| a per-collection reset classification | `RESET_DISPOSITIONS` (generated), `RecordLogic.wipe` | **not reused** — built for a running world (keeps the clock, wipes snapshots under live hosts); the restore replaces the whole DB |
| a database dump / restore | nothing | **rejected** (the conversation) — a world drives cannot dirty needs no reset |
| a test-only pack | nothing: only command views can be test-only (`testOnly` + `requiresTestWorld`); discovery reads the deployment manifest's `@saxonberg/content-*` deps | **genuinely new** — a pack flag discovery honors only in a test world |
| the scaffold | nothing: no `/test/` rows in any world; `/world/saxonberg` is an empty executive-held parcel; `Archetype.materialize()` (derived test venue, unit tests only) | **new** (the fixture pack's rows); `Archetype` a candidate for the venue |
| creating what a drive consumes | `hand` (test-hand), `stage` (test-stage), `arrive`, `house appoint`, `reserve override`, `testharness` | **reuse**; new only where a gap is proven (a funded account at the scaffold bank, an NPC in a role) |
| cleanup of a run's litter | `purge-test-characters.ts` (e2e handles only); nothing for wire | **generalize** to wire handles, clones, seats, money |
| drives living in a pack | nothing: the vitest include, `global-setup`'s readdir, the `wire:dirty` glob and `tools/soak` all read `packages/wire/tests` | **generalize** the discovery |
| the no-content rule | `lint:test-content` (kernel unit tests; skips wire) | **generalize** to wire drives (census, then ratchet) |
| boot timing by phase | only global-setup's "world up in Xs"; server log has no timestamps; `/stats.db` counts ops | **new** (phase marks), reusing `/stats.db` for attribution |
| the soak lane's world per dirty file | `build/soak-repair` (in flight): `tools/soak` `worlds_of`/`run_world`, `reset:db` before each world | **unchanged** in build 1; its drops go when build 2 empties the dirty list |
| a file staging its own stock | `hand` / `stage` / `arrive` / `stageShip` (`TestAuthRoutes`), `DIRTY_REASON` | **out of scope** — census for wire-suite-growth |
| the CI wire job | `.gitlab-ci.yml` `wire:` on `node:22`, its own `saxonberg_wire` | **touch** — its test world installs the fixture pack |

## See also

- [db-performance-slate.md](./db-performance-slate.md)
- [testing.md](../../testing.md) (the wire tier, boot cost, the soak lane);
  `tools/soak` has no clock today, so the owner's "run them on some kind of
  schedule" for the crowd timing checks is also still owed
  ([crowded-rooms-slate.md](./crowded-rooms-slate.md)).
