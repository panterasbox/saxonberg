# Crowded rooms

> **Status: PARTIAL** — the greeting count, one light walk per Scene, and the signed-out body leaving the world shipped with controllers-are-io → [behavior.md](../../subsystems/behavior.md), [messaging.md](../../subsystems/messaging.md), [connection.md](../../subsystems/connection.md)
> **Left:** `say` p95 under 250 ms with 30 people in the room · no loop stall over 100 ms · the N² card re-resolve per move · the one stall per card · the empty world's ~60% of a core on NPC labor · a clock on `tools/soak`
> **Size:** a build

## The requirement

The owner, 2026-11-07, in review of controllers-are-io: *"the game needs to be
able to handle crowded rooms; this isn't just a test-only sort of concern."*

The timing half moved here from that build by the owner's decision: a crowded
place was a requirement of the build (its D27), the targets were not met, and
they are too big to finish in a review round. The count half stayed and blocks.

## The targets (D27, unchanged)

N = 30 bodies in one place: the crowd that pegged the core, and what a festival,
a muster or a market morning in the square looks like. With 30 connected bodies
and the square's three greeting NPCs:

- (a) a player arriving is greeted **once** by each NPC, and an NPC walking in
  greets **nobody**. ✅ Shipped, blocking in `crowd.dirty.wire.test.ts`.
- (b) `say hello` round-trips in **under 250 ms** at p95 over 20 commands. ❌ 375 ms at best.
- (c) no event-loop stall over **100 ms** across a 60 s sample while the 30 arrive
  and speak. ❌ 1092 ms at best.

## Measured (controllers-are-io W10, verbatim)

`pnpm wire crowd.dirty`, N=30: avenue-block, then walk one by one into the square.
ms, p50/p95. "never" = the run died before that phase.

| state | world up | logins | walk in | say, one person | say, each in turn | say, all at once | last heard | /healthz max · >100ms/samples · >500 | box load |
|---|---|---|---|---|---|---|---|---|---|
| BEFORE 7fd82e38c (fresh DB) | 420 s | ~33 s each; login 17 timed out at 30 s | never | never | never | never | never | never | 0.4-3.5 |
| D28+D29+D30 | 135 s | login 19 timed out at 343 s | never | never | never | never | never | never | 2-5 |
| + card prose, drain hold | 211 s | 14 logins in 330 s, stopped | never | never | never | never | never | not read | 2-8 |
| + drain slices, concealment memo | 159 s | 5266/14667 | 4951/11438 | 983/2989 | 741/1090 | 3438/3452 | 3703 | 8390 · 213/340 · 85 | 2-3 |
| + no per-verb schema frames | 178 s | 4206/23642 | 2121/4924 | 1366/2689 | 897/1447 | 3767/3776 | 4357 | 2912 · 237/324 · 51 | 4-6 |
| + drain rests 2x its slice | 255 s | 3402/6810 | 763/1072 | 175/375 | 207/682 | 2522/3766 | 4017 | 1092 · 53/153 · 4 | 2-6 |
| FINAL (HEAD; world not fresh) | 217 s | 5458/18153 | 2212/3485 | 311/659 | 235/427 | 3716/4002 | 4377 | 3212 · 147/231 · 43 | 5-9 |

Empty room, same world: `say` 22/42 ms. Full square, no walkers staged (30 logged
in there): 743/1202 before the rest.

**Caveats, all of them.** The box was shared with sibling worktrees (the load
column), and the FINAL world was not fresh, so the last two rows cannot rank the
code against each other. Each row is one run. Nothing here is an idle-box number,
and D27 says the timing is only honest on one.

**The soak file's first run** (W11, 2026-11-07, HEAD of the MR, box load 5-8, the
world not fresh and a heap snapshot taken on it earlier): logins 3660/16576, walk in
1098/1409, say one person 1405/1999, say each in turn 314/995, say all at once
3515/4854, last heard 5108; `/healthz` max 2113 · 144/220 over 100 ms · 31 over 500 ms.
It **failed on its own bound** (`sayOne` p95 1999 ≥ 1000), with no crash and the
greetings out of its scope. That is worse than W10's best row; nothing here says
whether the code or the box made it so.

## What remains, by the profile

- **N² card re-resolve per move.** A body moving through a room with N cards on it
  is N re-resolves of N rows, at ~10-15 ms a row.
- **One stall per card.** One re-resolve at N=30 is one atomic stall of a few
  hundred ms. The drain slices between cards, never inside one, so no drain tuning
  can bring (c) under 100 ms.
- **An empty world costs ~60% of a core on NPC labor.** Every number above sits on
  top of it. Nobody has measured how much of the crowd's headroom that alone spends.
- **`MouldMixin.getContents` runs `reconcileSetting()`** (a write) under a light
  walk (a read), 0.75–1.05 s in D27's profiles. Listed there for the mould slate;
  named here so it is not lost.

## The costs accepted to get this far (lens 3a)

Both are true of the shipped game, and a build here may decide they were wrong:

- **A card can lag about 40 s behind the room in a crowd.** The drain gives cards a
  third of the loop in a backlog, so a person is answered and a card catches up.
  The fiction does not break (the prose is current); the side panel is stale.
- **Concealment stands for a second** while the same things are worn: a memo, so a
  change of what you wear is read within 1 s rather than at once.

## The soak lane is not a schedule

`crowd.soak.wire.test.ts` holds the generous bounds (1 s p95, no 500 ms stall) and
prints the record. ⚠ **`tools/soak` has no clock**: it is `--once` or `--watch`, the
`--watch` pane is started by hand in the `soak` tmux window, and it runs only for a
merge that adds or changes a soak file. No cron, no timer; it was not running when
this was written. **So the owner's scheduled run of the timing checks is still
owed**, and this slate should not be read as saying they run. Giving the lane a
clock, or a named person who starts it, is part of this build.

## Questions for /requirements

- Is 30 the number, or the first number? D27 argued for it; the settlement model's
  city has squares that would hold more.
- Should a card a person cannot see re-resolve at all? Attention scopes a live card
  already (`card-surface.md`: the newest holds the subscription), and the profile
  says that scope is not narrowing this cost.
- Does a body's move need to dirty every card in the room, or only the rows that
  name it? That is the N² in one sentence.
