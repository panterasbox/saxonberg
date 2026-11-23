# Crowded rooms

> **Status: PARTIAL** — the crowded-rooms build (MR !598, 2026-11-18) shipped `say` under 250 ms at thirty (p95 110 ms), the room's own reading never writing, exact subscription dispatch with a row memo, hidden cards pausing, an idle world at 0.17 of a core (accepted by the owner against 0.15), and the restart → [mql-subscription.md](../../subsystems/mql-subscription.md), [perception.md](../../subsystems/perception.md), [card-surface.md](../../subsystems/card-surface.md), [mould.md](../../subsystems/mould.md), [behavior.md](../../subsystems/behavior.md)
> **Left:** **a login or an arrival into a full room** — login p95 2.28 s (target 2 s), logins into a full square p95 3.45 s, 19 freeze samples over 100 ms during the arrivals, a mould's looks 2.3× alone (all accepted as recorded misses, owner 2026-11-18) · the call-security tax under everything (halved in the crowd by MR !610; idle is now the cast, not the gate) · the re-used-world `getContainerChain` defect · a clock on `tools/soak`
> **Size:** a build

## ⭐ The next ceiling — a body arriving in a full room (after crowded-rooms, 2026-11-18)

The fourth quiet-box run of `crowd-timing.wire.test.ts` (the plan's
Drive record, retired with the plan; numbers kept here) reached every step.
What passed: idle 0.173 cores · `say` p95 110 ms · in turn p95 68 ms · the
on-screen card 1.45 s · a hidden card receives nothing and is current 53 ms
after shown · thirty back after a restart p95 1.49 s, each where they quit.
What missed, **accepted by the owner as recorded misses**:

| step | measured | target |
|---|---|---|
| thirty log in (at the avenue block) | p95 2.28 s (max 5.1 s) | < 2 s |
| five log in INTO the full square | p95 3.45 s | < 2 s |
| no freeze while they arrive | 19 of 207 `/healthz` samples over 100 ms (max 850 ms); the server's own loop 14, p99 52 ms | 0 |
| a mould looked at in the crowd | p95 446 ms vs 196 ms alone | ≤ 1.5× alone |
| (reported) a hundred | login p95 3.6 s; `say` p95 163 ms; 73 of 261 over 100 ms (max 8.4 s) | — |

**All one shape: a body's first projection into a crowd.** A login (or an
arrival) costs: the body's restore, the arrival Scene rendered to every
sensor in the place (Scene render was 10.7% of the crowd at W0 and was not
cut), the newcomer's row described for every viewer's room card (the memo
cannot help — it is new to every card), every card on the place re-resolved
(31 × ~2 ms after W8, then the drain's 2× rest), and the newcomer's own first
`here` card — one unit of N rows. The mould's looks miss because they share
those frames.

**After call-security-performance (MR !610, 2026-11-18)** — its quiet-box
drive reported this ceiling before and after, not gated (its own
`call-security-performance.wire.test.ts`, same harness, thirty at
the avenue block then the square): thirty log in p95 **2 170 → 2 221 ms**
(unmoved), five into the full square p95 **2 727 → 2 399 ms**, freeze
samples over 100 ms **33/195 → 3/162**. The call-security layer is now
45% of a crowd's busy time (was 55%), so a login's cost is mostly the
shape below, not the gate. Idle 0.244 cores, of which the gate is 0.054.

**Where to start** (none profiled yet — the next build's W0): profile one
login into thirty (`WIRE_CPU_PROF`, the crowd record's uptime marks slice
it); measure Scene render per sensor with thirty sensors; measure the first
`here` projection. Candidates, unweighed: render a Scene's frame once per
distinct viewer-equivalence class; describe the newcomer once per
recognition state rather than per viewer; let the first projection of a
card ride a slice of its own.

**Also found, outside the crowded-rooms diff:** on a world re-used across
wire runs (a second `WIRE_REUSE=1` run), subscribing a fresh player's `here`
card throws in `PerceptionLogic.onBodyOf` — `getContainerChain()` returns
`undefined` for the live square the viewer stands in — so the card is not
live. A fresh world never shows it. The error envelope was invisible until
the wire harness stopped dropping unrequested subscription envelopes
(crowded-rooms, `session.ts`). Unexplained; worth one probe on master.

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
  greets **nobody**. ✅ Shipped, blocking in `crowd.wire.test.ts`.
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
- **A room's capacity in bodies** (size-and-carrying finalize, 2026-11-16; salvaged from size-slate § 6.6).
  Bodies now have an envelope and a place a cube, so *how many bodies a
  room, a lifeboat or a lift holds* is derivable from size — a physical
  ceiling beside this slate's performance one. Whether the two meet (the
  physical number as the cap, or each its own) is open.

## Reuse ledger for the plan

Written at /requirements, 2026-11-17 (the requirements and plan retired with MR !598).
Every row is one the plan must account for: reused, generalized, or
*genuinely new* with what was searched.

| concept the build needs | what already does it | reuse / generalize |
|---|---|---|
| a card re-checked when its subject changes | `MqlSubscriptionRegistry` dependency index (`(KIND, attr, value)` → subscriptions; re-derived per re-resolve) | **generalize** — its field events fire *globally* ("conservative-coarse dispatch", mql-subscription.md); narrowing to the moved body is the N² fix |
| the drain that gives replies priority | `MqlSubscriptionRegistry.drainDirty` time slices (D27) | **reuse**; the slice cannot cut *inside* one re-resolve, so the one-stall-per-card fix is in the re-resolve, not the drain |
| a card's liveness following attention | `CardRegistry` (client-surface D4: the newest holds the subscription; pinning keeps it) | **generalize** — attention today is server-side recency; "on screen" is a client fact the server lacks |
| the client telling the server what it holds | navigation-server W1's one subscription protocol (in flight, build-2) | **reuse, sequenced** — the seen/unseen signal should ride that protocol, not a new envelope |
| NPC background work | the one deliberation beat per agent (`lib/behavior/BehaviorBeat.ts`, `Behaved`), `lint:idle-cadence` | **reuse** — cut the cost per beat; content's authored cadences untouched |
| a read that writes | `lib/mould/Mould.ts` calls `reconcileSetting()` inside its contents read (lines ~581, ~599) | **fix** — the reconcile moves out of the read path |
| the crowd drive and its record | `packages/wire` `runCrowd`, `crowd.dirty` + `crowd.soak` wire files, `/healthz` loop sampling | **reuse** — add the card, mould, restart and N=100 phases and the box-load record |
| a quiet-box run | none | genuinely new as a *procedure* (stop sibling worlds, record load), not as code — searched `tools/` for a load gate |
