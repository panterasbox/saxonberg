# Wire-suite growth — the tail

The wire tier shipped (MR for `design/wire-tests`, 2026-09-08): a
`packages/wire` harness, eleven flow files, its own command and CI job.
This is what it deliberately did NOT build, and the findings it handed
over. Everything here is a clean attach point, not a stub.

## Deferred seams

### 1. Boot groups — more than one pack set per run
`declareFile({ packs })` is validated metadata today: the harness checks
a file's declared packs against the booted world and fails fast, but a
run boots ONE pack set (the full shipped world). The group mechanism is
specified in the plan's D3; nothing multiplies it yet, because flows
cross packs by definition and every migrated file wanted the full world.

**Cost of doing it:** N groups = N × cold boot, and a cold boot measured
245–251s (`docs/testing.md § The boot cost`). Worth it only when a file
genuinely needs a NARROWER world — the platform-only boot is the
existing precedent.

### 2. ⭐ The compressed-clock group, and farming's growth arc
`farming.dirty.wire.test.ts` ports the money, the kit and the land
market. The **plant → water → set → ripe → pick** arc does not: it needs
the world clock scaled up in `world_state` BEFORE boot, which is an
operator ceremony a repeatable suite cannot assume. The clock also has a
ceiling — above ~10000× the game-time schedulers starve the event loop
and login never answers (measured: test-login 80s+ at 40000×).

A compressed-clock boot group is the honest home for it, and farming's
arc is its first customer. Until then the arc is a manual drive.

### 3. Farming's yard legs, and the one-actor problem
Planting needs ONE actor holding the seed and the sack AND standing on a
lot they own. `startLocation` is a **birth setting, not a teleport** —
an existing character ignores it — so the grower who shopped in Terminus
cannot be the titler born at the Registry. The original spec solved this
with three browser sessions and the lot's own `go`. Rebuilding that
shape deliberately would recover: the pour-the-soil trap (a fresh bed
ships with CAPACITY and no soil) and the too-early `pick` refusal.

### 4. Metal-chain's provisioning leg
`measure strike` / `char` / `smelt` are afforded BY the trade's
instruments, so an empty-handed arrival gets `unknown-verb` rather than
the teaching refusals the original spec asserted. Recovering those
checkpoints needs the buy-in walk (money, then Provisioning), which is
the funding walk `work.dirty` already does from another city.

### 5. The crafting cookhouse scene
`crafting.dirty`'s by-hand `add`/`stir`/`heat`/`plate` build and the
maker's gather reaching into the OPEN chest for the roast were dropped
when the venue collision surfaced (⭐ **one venue, one dirty file**).
They belong to `cooking.dirty`, which owns that floor and would have the
pantry to itself.

### 6. The prose-census ratchet
Every `prose()` call is counted and the run prints a per-file census (79
across 11 files on the first green run). The census is a MEASUREMENT
today; no ceiling is enforced. Freeze today's count as the ceiling once
the ports settle — the `lint:object-verbs` census-then-ratchet pattern.

⚠ Before ratcheting, check whether the residue is really render-only. A
prose read that exists because no `subscribableFields` descriptor
reaches the fact is a **card-surface** finding, and the fix belongs
there — a wire file may never add a descriptor to make itself
assertable.

### 7. A Mongo snapshot/restore reset path — measured, not obvious
Seeding is ~150s of a 250s cold boot, so a snapshot/restore WOULD attack
the right number. Nothing needs it yet: the runner never resets
mid-run, and `dirtiesWorld` batching plus a reset between full runs is
the whole answer. Revisit if the dirty set grows enough that a reset
lands inside the loop.

### 8. World litter
Every repeatable file that mints a fresh actor leaves a linkdead avatar
standing in the world; `logistics` and `work` mint one per run by
design (a fresh actor is what makes the unbanked refusal real). The e2e
suite has a purge script for its `e2e-` handles; the wire tier has
nothing equivalent. Not urgent, and it will not stay that way.

## ⭐⭐ Content findings the first run handed over

Each is a question for the trade that owns it, not a test problem. The
suite REPORTS these; fixing them was an explicit non-goal.

| finding | owner |
|---|---|
| the cookhouse ships ONE cut of meat and one stew's stock, and never produces more | trade-cooking |
| …and ONE carcass and ONE boning knife, likewise | trade-cooking |
| the tailor's shop has ONE set of shears, needle-case and book, takeable, never restocked — a second tailor cannot work | trade-tailoring |
| the campus farm's yard holds ONE spade, scythe, kit and plough — a teaching farm that outfits exactly one student | eternal-university |
| the job board never expires an unclaimed gig; they accumulate forever | contract substrate |
| `reserve issue` is a faucet with no sink — a test that needs money cannot give it back | banking |
| a written history is laid down once at birth; the seeder skips a host that already has one | identity |
| the smithy ships two ingots sharing a keyword, one of which fails a durability validator — the bareword picks the decoy | trade-smithing |
| the by-hand smithing build completes and confers no deed (`forge` stays `not-learned`) | trade-smithing |
| `measure strike` without an instrument is `unknown-verb`, not a refusal naming the instrument — two defensible designs | trade-mining |

## What this slate is NOT

Not a plan. Each item above is either a small piece of work with an
obvious home, or a question for somebody else's subsystem. The wire
tier itself is done and running.
