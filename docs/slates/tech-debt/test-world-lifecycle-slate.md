# Test-world lifecycle — fresh state without a cold boot

> **Status: UNBUILT** — raised by the owner 2026-11-08 during the
> controllers-are-io build (MR !527): *"do we need to have a conversation later
> about rethinking these complete mongo wipes and be more selective about
> database operations needed for development? … if it's becoming a problem
> for test stability or even just wasting time we can reclaim."* Not designed;
> this records the evidence for that conversation.
> **Left:** the conversation · a seeded-snapshot restore instead of drop + cold
> boot · dirty wire files that stage their own consumables · the harness's
> restart path (shutdown save, the heap flag) · the wire runner's world reuse
> rules
> **Size:** a build (probably infra), sequenced after the conversation

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

## See also

- [db-performance-slate.md](./db-performance-slate.md)
- [testing.md](../../testing.md) (the wire tier, boot cost, the soak lane);
  `tools/soak` has no clock today, so the owner's "run them on some kind of
  schedule" for the crowd timing checks is also still owed
  ([crowded-rooms-slate.md](./crowded-rooms-slate.md)).
