# Wire tests — requirements

**Kind:** infra
**Leads from:** kernel-led — tooling. **First consumers** are the five
`drive-*` Playwright specs migrated in this build, and every subsequent
build's drive script, which graduates here at `/finalize`.

Testing splits into two tiers that are currently tangled. **Render
tests** (Playwright) prove the browser draws the right thing. **Wire
tests** prove a *flow* is sound — washing dishes, delivering mail —
over the real WebSocket, with no browser and no opinion about
rendering. This build creates the wire tier, moves the flow tests into
it, and leaves the render tier smaller and more trustworthy.

## What already exists

- ⭐ **The wire tier already exists, once, in the right shape.**
  `packages/server/scripts/drive-cooking.ts` (319 lines) — *"driven over
  the REAL wire: the `test-login` seam for a session, the same WebSocket
  the client opens, and the same command strings a player types. No
  browser, no test doubles, no `StuffApi` reach-arounds."* It is a
  one-off script: run by hand, not in CI, no shared harness.
- ⚠ **The render tier is carrying the flow tests.** `e2e/tests/` is
  5,039 lines; **1,085 of them are `drive-*` specs** (farming 362,
  work-drive 211, crafting 200, metal-chain 188, wave2 124). They use
  the browser heavily and assert almost nothing about it —
  `drive-farming` has **five `expect`s in 362 lines**, zero of them
  `toContainText`/`toHaveText`. They pay the full Playwright cost to
  exercise server flows.
- **Per-config boot narrowing already works.**
  `e2e/playwright.platform.config.ts` boots `SAXONBERG_PACKS=platform`
  on its own ports with stdout captured to a log — the precedent for a
  wire file booting only the packs it needs.
- **The envelope is already structured** — `DispatchResponseEnvelope`,
  16 note kinds, auto-escalating status
  ([response-envelope.md](../subsystems/response-envelope.md)). Wire
  assertions have something better than prose to bind to.
- **The world is fully derived from content.** `reset-db.ts`: *"this
  game has never held data a boot of the same checkout did not write"*
  — so a reset costs a reboot and nothing else.

**Therefore what is genuinely new here is** a package, a harness, a
runner policy, and a CI job. The technique is proven; nothing about
the engine changes.

## Goals

- A `packages/wire` package with a **shared harness**: `test-login` →
  WebSocket → send the command string a player would type → await the
  envelope. Lifted from `drive-cooking.ts`.
- **Assertions bind to the envelope** — note kinds, reasons, status —
  not to prose.
- **One boot per run.** Files are repeatable by default; a file that
  must consume a scarce shipped singleton declares `dirtiesWorld`, and
  the runner batches those to the end and resets once.
- The five `drive-*` specs migrate out of Playwright.
- Its own command and its own CI job, outside `pnpm test`.
- A **graduation path**: a build's drive script becomes a wire file at
  `/finalize` rather than being discarded.

## Non-goals

- **Rendering assertions** — stays with Playwright in `e2e/`, which
  keeps every render test it has.
- **Replacing unit tests.** Wire tests prove flows compose; they are a
  bad instrument for arithmetic. *(Destination: nowhere — this is a
  permanent division.)*
- **Fixing the render tier's own unbaselined failures.** Out of scope;
  this build only removes 1,085 lines of flow test from it.
  *(Destination: a later client-side pass.)*
- **Parallelism.** One database per worktree means one world; files run
  serially. *(Destination: nowhere — it follows from the Mongo policy.)*
- **Restocking fixes** for whatever `dirtiesWorld` exposes. This build
  *reports* them. *(Destination: the owning trade's own slate.)*

## Placement

`packages/wire` — a sibling of `e2e/`, not a subdirectory of it: it
shares no runner, no config and no dependency with Playwright, and
burying it there is what made the flow tests look like browser tests in
the first place. No namespace root, no template rows, no kernel change.
Wire files live with the tier, not with the packs, because a flow
crosses packs by definition (the mail flow touches the post, the road
and the recipient's residence).

## Collisions

- `e2e/tests/drive-*.spec.ts` — the five migrate; their names and any
  CI references go with them.
- `packages/server/scripts/drive-cooking.ts` — becomes the first wire
  file and the harness's source material. Retire the script.
- `.gitlab-ci.yml` — a new job, following the gym benches' pattern.
- ⚠ `pnpm test` must **not** grow this suite; it needs a booted server.

## Surface decisions

### Assertions bind to the envelope, not the prose
Note kind + reason + status. Prose changes with every copy edit, and
the project already refuses to assert the same sentence twice; the
render tier checks wording once, in one place.

### One boot per run; `dirtiesWorld` is opt-in
A reset is a reboot (~2 min; the e2e webServer timeout is 120s). With a
reset per file, wall time is `N × boot` and the suite is unaffordable
at any useful size. Repeatable-by-default makes it
`boot + Σ(tests) + k`.

**A file is repeatable when it brings its own actor, its own money and
its own fixtures, and consumes only what the world regenerates.**

⭐⭐ **And `dirtiesWorld` is a content finding, not just a flag.**
`drive-cooking` needs a reset because it *"EATS the cut of meat the
cookhouse ships and ORDERS the stew its pantry stocks, and neither
comes back on its own."* A cookhouse that ships one cut of meat and
never produces another is a world that does not restock — the test
cannot run twice because the economy cannot sustain itself. Every flag
is a question for the owning trade, and most should turn out to be a
producer that should be producing.

### Files are coarse, and declare their packs
One file per **flow domain**, not per behavior — serial execution makes
many small files the failure mode. Each file declares the packs it
needs (`SAXONBERG_PACKS=`), so a mining file boots a fraction of the
37-pack world and gets a more deterministic one.

### The sandbox was considered and set aside
The holodeck's `Forkable` substrate could give each file a discardable
circle with no reset at all. Rejected: the sandbox has a deliberate
Layer-4 boundary, so behavior inside is not identical to production —
an end-to-end flow test that runs somewhere behaviorally different
defeats its own purpose. Recorded in case the numbers ever demand it.

## Lens pass

*Abbreviated — an infra build with no player-facing surface.*

1. **Pedagogy** — n/a directly. Indirectly load-bearing: the flows this
   proves are the ones that teach, and a flow that silently stopped
   working teaches nothing.
2. **Creative expression** — ⭐ the real one. A content author who adds
   a trade should be able to prove its flow works without writing a
   browser test. The harness is the affordance.
3. **Immersion** — n/a.
4. **Values** — n/a.
5. **Epochs** — the harness speaks command strings and envelopes, which
   are epoch-independent by construction.

## The drive

*An infra build's drive is "prove nothing changed, and that the new
thing runs."*

1. `pnpm test` — unchanged, and does **not** include the wire suite.
2. `pnpm -C packages/server lint:family` — 25/25.
3. The wire suite runs green from a cold start, one boot, and prints
   per-file timings.
4. Re-run it **immediately, without a reset** — every file not marked
   `dirtiesWorld` passes again. This is the invariant that makes the
   whole design work, and it is the one most likely to be quietly
   false.
5. The Playwright suite still runs, minus the five migrated specs.

## Acceptance criteria

*Observable from outside the code.*

- A named command runs the wire suite; `pnpm test` does not.
- The suite runs green twice in a row without an intervening reset,
  except for files that declare `dirtiesWorld`.
- The five migrated flows are proven over the wire, with no browser.
- A CI job runs the suite and fails the pipeline when it fails.
- ⚠ **The warm-vs-cold boot measurement is recorded** (below), and the
  runner's reset policy reflects the answer.
- `docs/testing.md` describes the two tiers and when to write which.
- `/finalize` graduates a build's drive script into the wire suite.

### The measurement, specified

Run in a **build worktree that is not busy** — build-4 was serving on
port 2010 when this was written, and the dev preflight kills same-kind
processes before claiming a port. Master cannot do it: it sets no
`MONGODB_DATABASE`, deliberately.

1. `pnpm --filter @saxonberg/server reset:db`
2. Boot; time from process start to the world being ready. → **cold**
3. Stop; boot again against the now-seeded database. → **warm**
4. Repeat both once.

**What it decides:** if seeding dominates, a Mongo snapshot/restore is
worth building as the reset path. If process start dominates, it is
not, and `dirtiesWorld` batching is the whole answer. Record the
numbers in `docs/testing.md` next to the suite's other cost figures.

## Cross-references

- [testing.md](../testing.md) — the suite cost model this extends
- [response-envelope.md](../subsystems/response-envelope.md) — what
  assertions bind to
- [content-packs.md](../subsystems/content-packs.md) — `SAXONBERG_PACKS`
- [sandbox.md](../subsystems/sandbox.md) — the road not taken
- `packages/server/scripts/drive-cooking.ts` — the working reference
- [workflow.md](../workflow.md) — the drive, and its graduation here
