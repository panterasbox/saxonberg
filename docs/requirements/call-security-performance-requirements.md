# Call security performance — requirements

**Kind:** refactor/sweep (performance)
**Leads from:** kernel. **First consumer:** every act in the running world.
Nothing new is built for content. The world crowded-rooms drives (thirty
bodies in Terminus) is the content that exercises it, and the build ships
the win to that world directly.

Every read and every call on a world object passes through the call-security
layer, which decides whether the caller may make it. That check is the
engine's most common operation and the tax every player act and every NPC
act pays. The 2026-08-30 pass took one gated method call from 50 µs to
2.1 µs. Even so, crowded-rooms' world profile found the layer taking **about
57% of the server's busy time**, in every window: idle, a crowd of thirty,
logins. It is the floor under the empty world's 0.17 of a core (the owner
accepted that against a 0.15 target), and under every crowd number that
missed. Seeding slate:
[call-security-performance-slate.md](../slates/tech-debt/call-security-performance-slate.md).

## What already exists

- **The 2026-08-30 pass**, all still in force
  ([call-security.md § What a gated call costs](../subsystems/call-security.md#what-a-gated-call-costs)):
  - the caller proof is taken per call site, not per call;
  - the gate no longer gates its own collaborators;
  - five closures per dispatch became one;
  - the policy lookup is cached with a generation stamp;
  - the frame stack is a linked list.
- **The instruments.**
  - The gate bench measures one gated method call. It refuses a loaded
    box and sweeps call depth.
  - The world CPU profile switch on the wire harness.
  - Crowded-rooms' quiet-box crowd drive, which reports idle CPU, `say`
    p95, login p95, freeze samples and the restart. It runs with the suite
    lock held and siblings asked to hold.
- **What the profile says now** (crowded-rooms, 2026-11-17, mid-build),
  as shares of busy self time:

  | share | what |
  |---|---|
  | 14.7% | the per-read lookup that walks an object's inheritance chain to find out whether a name is a getter |
  | 12.5% | the proxy read trap around that lookup |
  | ~11% | policy resolution and the gate's checks |
  | ~9% | the call-frame push and the async-context bookkeeping under it |
  | ~4% | the per-call wrapper around a static Api call |

  Inside the layer, but measured only by the older gate-cost walk: the
  recognition walk re-asks two checks that depend only on the viewer, once
  per candidate. One path also describes the same target twice.
- **Overlapping work.**
  - The crowded-rooms slate's *next ceiling* (a body arriving in a full
    room) is a different cost: Scene render and the newcomer's first
    projection.
  - No sibling build touches this layer. build-2 (navigation-server)
    edits the mixin registry lightly; build-3 (aether-devices) is nowhere
    near it.

⭐ **The slate had it backwards.** It parked the inheritance-chain lookup as
"~55 ns of 2.1 µs, not worth touching the read trap". The bench times one
method call. The world does far more reads than calls, through objects
whose mixin-built inheritance chains are deep, so in the world that lookup
is the largest single item.

**Therefore what is genuinely new here is:** nothing that a player or an
author can see. It is a set of cuts inside one layer, chosen by a fresh
profile of the world and measured by the instruments that already exist.
The reuse ledger is in the slate (§ Reuse ledger for the plan).

## Goals

- **The empty world idles at ≤ 0.15 of a core.** That is the original
  crowded-rooms target, restored.
- **The layer's own CPU time over the same drive is at most half** of the
  baseline this build re-profiles on master before it changes anything.
  The same quiet-box drive (same acts, same windows) is run before and
  after. ⚠ The cost halves, not the share: halving a 57% share would need
  the layer about 3.3× cheaper. Half the cost lands near a 40% share, and
  the share is reported (owner ruling, 2026-11-18).
- **A gated method call costs less on the bench** than 2.1 µs, flat in call
  depth as it is now.
- **No player-facing number gets worse**: `say` p95, in-turn p95, the
  on-screen card, and the thirty back after a restart.
- **Every security property the layer holds today still holds**, observably:
  - a call from outside its allowed caller is still refused;
  - a forged frame is still refused;
  - a method or getter edited by hot reload is used by every new clone of
    that class in the running world without a restart, while existing
    instances keep the class they were built from (hot reload's contract,
    [hot-reload.md](../subsystems/hot-reload.md));
  - a pointer to a destroyed object still reads as nothing;
  - a destroyed object is still inert;
  - a test's spy still replaces the method it spies **in a test run**.
- ⭐ **A function marked as a test spy is checked like any other outside a
  test run.** Today the layer hands any function carrying the spy marker
  back unchecked, in production too, so anything that can set the marker
  on a function slips past the gate. The owner ruled (2026-11-18) that
  this build closes it, since it edits that read path anyway.

## Non-goals

- **Login or arrival into a full room** — Scene render per viewer, the
  newcomer described for every card, the newcomer's own first card. This
  build lowers those costs and reports the numbers without gating on them.
  → crowded-rooms-slate § The next ceiling, its own build.
- **The mixin and path lookups** that showed in the same profile but sit
  outside the layer (the path trie walk, the mixin test), about 6%.
  → a one-line note in this slate, for the build that owns them.
- **The libations drive's loose ends** (the slate's § 8: dilution over a
  game hour, the mojito's marker, the bitters debit, `put ice in bin`'s
  message). → [libations-slate](../slates/trades/libations-slate.md).
- **Caching recognition per viewer and target.** The slate weighed it and
  rated it low value: each candidate is visited once per resolve.
  → nowhere, deliberately.
- **Weakening any check to buy speed.** → nowhere, deliberately. A cut that
  needs a check removed is the wrong cut.

## Placement

The kernel's call-security and proxy layer, plus the recognition walk the
slate salvaged from the gate-cost investigation. No pack, no content row,
no namespace root. A second world needs nothing; the win is the same
everywhere.

## Collisions

None in the world. No place, object or NPC changes. In the code, the
nearest neighbors are:

- **Hot reload.** It installs a NEW class and leaves existing instances on
  the old one. The layer's caches must answer for the new class the moment
  it is installed, and keep answering correctly for the old one.
- **The test suite's reliance on the gate.** Some tests prove a refusal by
  calling from the wrong place; those must still be refused.
- **build-2's small edit to the mixin registry.** Nothing this build plans
  touches it.

## Surface decisions

### Which costs are in scope

**Answer:** the layer itself — the per-read lookup and read trap, policy
resolution and the gate's checks, the frame push and async context, the
static-Api wrapper, and the recognition walk's repeated checks and double
describe. The build starts by re-profiling current master. Whatever that
profile ranks highest *within this layer* is cut first, even if it is not
on the slate's list.
**Why:** the slate's list was written from a microbench, and the profile
already reordered it once.

### What "done" is measured against

**Answer:** the world, not the bench. The gate is the quiet-box crowd
drive's idle number and the layer's own CPU time in a world profile, before
and after on the same box, over the same acts and windows. The bench number is reported alongside.
**Why:** the bench is what told the slate that the largest item was small.

### Is login into a full room gated?

**Answer:** no. It is reported.
**Why:** its cost is mostly outside the layer (Scene render, first
projection), and the owner slated it as its own build. Gating this build on
it would pull that design in here (lens 1: a build teaches one thing).

## Lens pass

1. **Pedagogy:** none directly. Indirectly, every Discipline that is
   practiced in a crowd (the market, the lecture hall, the bar) is
   practiced at a speed that does not teach lag.
2. **Creative expression:** an author writes no code for any of it. The
   bespoke case keeps hot reload: an author's edited method is live at
   once, which is the observable guarantee in the drive.
3. **Immersion and participation:**
   - 3a immersion: a crowd that answers in under a tenth of a second is
     one the fiction survives.
   - 3b participation: nothing new for the polity to use.
4. **Values:** the trade is speed against tamper resistance, and it is
   decided. No check is removed; only how often a fact already proved is
   re-derived.
5. **Continuity:** no epoch content. The capability survives every epoch
   because it is under all of them.
6. **Economy:** the host's bill. Idle core size is the box size, and it is
   the founding offering's running cost (deployment.md's cost model).
7. **Governance:** judges no person.

## The drive

Kernel-led with no player surface, so it drives the nearest existing content
that exercises the layer: crowded-rooms' crowd in Terminus. Every step is
`instant` or `short`. There is no `span` step and therefore no soak drive,
deliberately. No new place is made, so there is no light step. The restart
is step 6.

### Blocking drive

1. **Baseline** (`short`, `staged`). Before any change, on master: the
   quiet-box crowd drive with the world CPU profile on. Record idle cores,
   `say` p95, in-turn p95, on-screen card, login p95, freeze samples,
   restart p95, and the layer's share of busy time. Also record the gate
   bench. This is the number every later step is compared against.
2. **The empty world** (`short`, `staged`). The world boots with nobody
   logged in and stands for the drive's idle window. Idle is ≤ 0.15 of a
   core.
3. **Thirty in one place** (`short`, `player`). Thirty bodies log in to
   the avenue block and move into the square. Each one `say`s, `look`s,
   and looks at a mould in the crowd. `say` p95 and in-turn p95 are no
   worse than step 1. Login p95, the five into the full square and the
   freeze samples are reported against step 1, not gated.
4. **The profile** (`short`, `staged`). Same run. The layer's own CPU
   time in the crowd window is at most half of step 1's. Its share of busy
   time is reported.
5. **A refusal is still a refusal** (`instant`, `staged`).
   - A wizard `eval` calls a gated method from outside its allowed
     caller, and is refused.
   - It forges a frame tag from a non-framework file, and is refused.
   - It calls a method on a destroyed object, and the object is inert.
   - It reads a field that pointed at a destroyed object, and the field
     reads as nothing.
   - It puts a function marked as a test spy on an object and calls it
     from outside its allowed caller. It is refused: outside a test run
     the marker buys nothing.
6. **The thirty come back** (`short`, `player`). The world restarts. The
   thirty log back in where they quit, with restart p95 no worse than
   step 1.
7. **Hot reload still lands** (`instant`, `staged`). With the crowd
   standing, an author edits a class through the in-game write verbs:
   one getter's body and one method's body. They also turn a plain
   method into a getter of the same name, which is the edit a cached
   getter-or-not answer could get wrong. Hot reload installs the class.
   A fresh clone of it shows all three edits. An instance cloned before
   the edit still behaves as it did, exactly as today.
8. **The gate bench** (`instant`, `staged`). One gated method call is
   below 2.1 µs and flat in depth. Reported.

### Soak drive

None. Nothing here moves with the game clock.

## Acceptance criteria

- On the quiet box, the empty world idles at ≤ 0.15 of a core.
- On the same box, a world profile of the crowd drive shows the
  call-security layer spending no more than half its baseline CPU time
  over the same acts.
- Thirty players in one place see `say` and in-turn latency no worse than
  before. After a restart they come back where they quit, no slower.
- A call from the wrong place, a forged frame, a destroyed object and a
  pointer to one all behave exactly as they did before.
- Outside a test run, a function marked as a test spy is refused from the
  wrong place like any other.
- An author's edit to a running class is used by every new clone in the
  standing world without a restart, including a method that became a
  getter; existing instances behave as before.
- Login into a full room is reported before and after, and handed to the
  next-ceiling build with its new number.

## Cross-references

- [call-security-performance-slate.md](../slates/tech-debt/call-security-performance-slate.md)
  (seeding slate, reuse ledger)
- [crowded-rooms-slate.md § The next ceiling](../slates/tech-debt/crowded-rooms-slate.md)
- [call-security.md](../subsystems/call-security.md) ·
  [hot-reload.md](../subsystems/hot-reload.md) ·
  [belief.md](../subsystems/belief.md) (recognition) ·
  [testing.md](../testing.md) (the wire tier, the quiet box)
