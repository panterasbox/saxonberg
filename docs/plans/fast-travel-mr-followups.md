# Fast travel — MR !60 review follow-ups (resume doc)

Scratch/handoff doc so a fresh context can continue the MR review work without
re-deriving anything. Branch `feature/fast-travel` in the **build-2** worktree;
MR is `panterasbox/saxonberg` **!60** (`glab mr view 60`). Retire this doc at
finalize.

## State (as of this writing)

- Merged `origin/master` in; resolved conflicts; migrated off the retired
  `DescribeApi` → `Stuff.getPresentation()`. Full suite was **green (357 files,
  3949 tests)**; `tsc --noEmit` clean.
- **3 of 6 review comments done, committed, pushed** (⑧ implant carries the
  credential / no card; ② University Avenue is a generic `CartesianLocation`;
  ①/④ per-domain `paths.ts`, class `TEMPLATE_PATH` consts removed).
- **3 remaining** — specs below.

## Remaining review items

### ③ — Self-seating fixture pattern (the inverted spawner). DESIGN LOCKED.

The spawn framework (`Spawner`/`Spawned`/`Populates`) is **container-owns** (a
host creates/tracks/seeds its contents). The terminal's need is the **inverse,
object-owns**: "I get cloned and seat *myself* into a target." Build it as a
reusable two-sided pattern — nothing terminal-specific.

- **Object side — one mixin** (e.g. `HostFixtureMixin`, name open): an
  instruction field `seatIn: <path>` whose target is **either a Warren or a
  plain singleton location**. On `postRegister` it asks to be seated into the
  resolved target. The object knows nothing about "hosts."
- **Resolution — the single rule** (same `warren → host` / `location → itself`
  shape as spawn vs. `applyStartLocation`):
  - target is a **Warren** → the warren decides placement (LoungeWarren = its
    host) AND registers the fixture so it **re-seats on host migration**.
  - target is a **plain location** → move directly into it (this *subsumes*
    today's static `data.container` self-placement).
- **Base `Warren`** gains a fixture registry + re-seat-on-migration (it owns
  host lifecycle). A plain location needs zero support.
- `TpaTerminal` composes the mixin and sets `seatIn`; the lounge terminal
  points at `/domain/lounge/warren`, static terminals at a location — **same
  mixin, same field**, only the target type differs.
- **Replaces** the bespoke terminal-seating currently bolted into
  `LoungeWarren.wireHostFixtures` (which I added). **Dave's Bar stays separate**
  — it's an *exit*, not a contained fixture.
- Precedent for the object self-registering with its warren: `Lounge` declares
  `warren:` and self-registers via `LoungeMixin.applyWarren`.
- ⚠ Touches the shared, tested base `Warren` — implement carefully, run the
  full lounge suite (`src/mud/domain/lounge`) + `src/mud/lib/fasttravel`.

### ⑤+⑥ — "reachable" lookups; stop scanning room contents / inventory by hand.

The repeating pattern the reviewer flagged. Two mechanisms:

- **`register`**: it's terminal-afforded (FastTravelMixin contributes it on the
  `environment` bucket), so read **`context.commandSource`** — "the Stuff that
  afforded the executing command" (`api/command.ts`; the affordance-attribution
  feature that merged from master). That's the terminal, and it handles a
  terminal-in-inventory for free. Drop the `getContents()` scan in
  `RegisterController` and `mustBeAtFastTravelNode` (the validator can check
  `context.commandSource` is `isFastTravel`).
- **`teleport` TPA fork + the credential lookup**: `teleport` is a *general*
  verb (not terminal-afforded), so `commandSource` is the giver. Use a
  **generalized reachable-finder** instead. The reviewer said **"reachable"**
  (not just inventory) and **"generalize check-inventory-and-augs."**
  - Build a reusable helper: find the first Stuff matching a predicate among
    **installed augs (slot occupants) + inventory + location contents**
    (augs/inventory first — "on your person" — then the room). No `ReachApi`
    exists today; `lib/command/validators/canReach.ts` has the reach criteria
    to mirror. Home it on an existing Api (CLAUDE.md forbids free-floating
    helpers — `ContainmentApi` is the closest, or justify a new one).
  - `findActiveCredential` becomes `findReachable(actor, location,
    isTravelCredential)`; the TPA fork's node lookup becomes
    `findReachable(actor, location, isFastTravel)`.

### ⑦ — Cast / duck-typing audit across the WHOLE MR diff.

Reviewer: "check the whole MR for that, I was seeing it all over the place."
Sweep `git diff origin/master...HEAD` for `as unknown as`, other casts, and
duck-typing; replace with `MixinApi.isX` predicates / proper types. Known
spots: the `hasKeyword` duck-type and several `as unknown as Stuff` casts in
`lib/fasttravel/FastTravel.ts`; cast-heavy spots in the controllers.

## Codebase facts learned (so you don't re-investigate)

- **`context.commandSource: Stuff`** — affordance attribution; defaults to the
  giver, but is the affording object for a contributed verb. Available to both
  validators and controllers.
- **`DescribeApi` is retired** — use `stuff.getPresentation(): string` (no
  viewer arg).
- **Generic describable room** = `/lib/location/CartesianLocation` in a
  `/lib/location/CartesianZone` (the duncan-hall pattern). `VoidLocation` is a
  bare zone-less Container (used in the cascade test fixture).
- **Spawn framework** (`lib/stuff/Spawner.ts`/`Spawned.ts`/`Populates.ts`) =
  container-owns (the inverse of ③).
- **No prettier config in the repo** → prettier defaults to *double* quotes and
  even flags master's own code; the codebase convention is **single quotes**.
  The edit harness auto-formats touched files to double quotes — watch for it,
  and don't run `prettier --write` on shared files (it churns them; that
  happened to `mixin.ts` and had to be reverted).
- **Worktree layout**: bare repo at `/home/bobalu/play/saxonberg`; work in
  `build-2/`. Run tests from `packages/server` (`npx vitest run ...`,
  `npx tsc --noEmit`). Lounge unit tests log a benign "lounge TPA terminal not
  seated" warn when the terminal seed isn't loaded — expected.
- `mr-iterate` skill drives an MR-comment round; `finalize` does the pre-merge
  sweep (incl. writing `docs/subsystems/fast-travel.md`, still deferred).
