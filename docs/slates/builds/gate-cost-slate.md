# The gate captures a stack — and that is the engine's cost ceiling

*Design slate, 2026-08-30, from the libations live drive (MR !206). Not
a bug report: every individual fix below is already merged. This is the
pattern underneath them, and the one remaining item is a design
conversation about the call-security spine rather than a defect.*

## What the drive measured

A CPU profile of the running server, taken repeatedly across a day of
fixes, always bottoms out in the same place:

```
57%  #walkExternalFrames   api/module.ts    ← the call-security stack capture
```

Every **gated call** — which is every method reached through a Stuff's
security proxy — asks *"who called me?"* by constructing an `Error` and
materialising its CallSites. That is the correct implementation of the
`FromModule` / `FromTemplate` policies, and it is the engine's dominant
per-call cost.

⭐ The consequence is a **rule of thumb the whole codebase has to
respect**: *a loop over N objects that makes a gated call per object
costs N stack captures.* Nothing warns you, and it reads like ordinary
code.

## The same shape, five times in one day

Each was found by driving, each is fixed, and each is the identical
mistake at a different site:

| where | the per-item gated call | measured |
|---|---|---|
| `GetController` | `canReach` per candidate | 96.5% of the server |
| `ResidencyLogic.isInPresentRoom` | proxied `getContainer()` per hop, for every object in the world | 5/5 debugger pauses |
| `GetController` (mine) | `isFixed` per candidate | 36% |
| `CommandLogic` delta (mine) | `ancestorsOf(m)` per moved item | 21% |
| `LoadBearing → getConditionBand` | a metabolic integration per `get` | 28% |

Three of those I wrote myself, during this MR, while fixing the others.
That is the point: **the shape is easy to write and invisible in
review.**

## What remains, and why it is not a bug

With those merged, the profile's top is the **command binder**:

```
47%  candidatesForPeers → pushDirect
22%    └─ RecognitionApi.describe
```

`pushDirect` runs per candidate and makes ~4 gated calls
(`perceives`, `describe`, `perceivedKeywords`, `pushBulkMaterials`), and
`describeCore` inside makes ~7 more. A bar room offers ~35 candidates,
so a single `get` costs roughly 250 stack captures.

⚠ **None of that is wasted work in the design's terms.** Viewer-relative
naming is a deliberate, load-bearing property — *what you can name, see
and touch can never diverge* — and `describe` is how it holds. The cost
is real and the feature is right.

## The options, none of which is mine to pick

1. **Make the gate cheaper.** `ExecutionContextApi` already tracks
   frames; if a frame carried its module id, `_assertFrameMutatorAllowed`
   could read it instead of walking the JS stack. This is a change to
   the security spine and needs its own review — the gate's tamper
   resistance is exactly its value.
2. **Cache recognition per (viewer, target) per command resolve.**
   Bounded and local, but each candidate is visited once per resolve, so
   the win is smaller than it looks.
3. **Hoist the viewer-invariant checks.** `isSensor(viewer)` /
   `isPerception(viewer)` are the same for all 35 candidates in one
   walk; they are re-asked inside `describeCore` every time.
4. **Accept it.** After the merged fixes the world is playable —
   typical HTTP is 3–85 ms, with spikes under NPC load.

## The tooling note, because it cost real time

- A **sampling profile names what was running; a `Debugger.pause` names
  what is running.** They disagreed twice, and the pause was right both
  times.
- ⚠ `Debugger.pause` against a live server is dangerous: a script that
  exits racing its own `resume` leaves the process paused, listening but
  never accepting. That looked exactly like a product hang for twenty
  minutes.

## Cross-references

[call-security.md](../../subsystems/call-security.md) (the gate) ·
[perception.md](../../subsystems/perception.md) (`canReach`) ·
[mql.md](../../subsystems/mql.md) (the scope walk) ·
[belief.md](../../subsystems/belief.md) (`describe`) ·
[residency.md](../../subsystems/residency.md) (the raw-walk rule) ·
[antipatterns.md](../../antipatterns.md).
