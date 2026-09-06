# Wire tests — implementation plan

Executes `docs/requirements/wire-tests-requirements.md` (kind: infra,
kernel-led tooling). Creates `packages/wire` — a shared WebSocket
harness plus a vitest-run suite of flow tests that speak the same
`test-login` seam, socket, and command strings a player does — migrates
every existing flow test into it (five one-off server scripts and eight
Playwright drive specs, not the "once + five" the requirements counted;
see Grounding), gives it its own command and CI job outside `pnpm
test`, and rewires the workflow so a build's drive is *born* a wire
file instead of graduating into one posthumously. Nothing about the
engine changes; the one temptation to change it (a client-supplied
correlation id on the `command` message) is explicitly declined (D2).

## Grounding

Facts verified 2026-09-06 by opening the files. Two requirements-doc
counts are stale and are corrected here; scope is unchanged, only the
inventory grew.

**The wire tier exists five times, not once.**
`packages/server/scripts/`: `drive-cooking.ts` (319), `drive-food-safety.ts`
(395), `drive-identity.ts` (432), `drive-logistics.ts` (405),
`drive-textiles.ts` (303) — 1,854 lines, each with its own copy of
`login()` / `class Session` / `splitFrames()` / `ok()` / `plain()`.
Each is a `packages/server/package.json` script (`drive:cooking`,
`drive:food-safety`, `drive:identity`, `drive:logistics`,
`drive:textiles`). None reads the envelope: all strip MML and grep
prose, with fixed `setTimeout` waits (1400ms default in `Session.cmd`,
3000/4000ms in `Session.open`). `drive-identity` opens **four**
concurrent sessions — the harness must support more than one.

**The render tier carries eight flow specs, not five** — 2,071 lines,
44 `expect`s total, in `e2e/tests/`: `drive-crafting` (200 lines / 3
expects), `drive-farming` (362/7), `drive-farmstead` (207/4),
`drive-metal-chain` (188/1), `drive-textiles` (536/4),
`drive-textiles-downstream` (243/**0**), `drive-wave2` (124/11),
`work-drive` (211/14). Nearly all assertions are the harness's own
`commandInput`-visibility plumbing; `drive-farming` spends ~60 lines on
browser-reconnect ceremony purely to keep typing. Nothing in
`.gitlab-ci.yml` names any spec individually — they ride
`pnpm --filter @saxonberg/e2e test` — so migration has no CI-reference
tail. All eight import from `e2e/tests/helpers`, which 30 specs share;
deleting the eight orphans nothing.

**The envelope** (`packages/types/src/index.ts:839`):
`DispatchResponseEnvelope { type: 'dispatch-response', frameId,
dispatchId, outcome: { status, notes: Note[] } }`, with **26** note
kinds in the `Note` union (line ~803). Emission
(`packages/server/src/mud/lib/command/CommandGiver.ts`,
`emitDispatchResponse`): **every** dispatch emits exactly one envelope,
always carrying a `prompt-refresh` note; **an async command's detached
body emits the same single envelope late, in its `finally`, carrying
the body's accumulated notes + final status** — so "await the next
dispatch-response" covers async commands too. The empty command line
also gets one (`packages/server/src/backend/inbound/command.ts:62`).
Envelopes leave via `Application.sendEnvelopeToInteractive` →
`Backend.sendEnvelopeToSocket` as one `JSON.stringify(envelope)` per
`ws.send` — a top-level `type` discriminator, parseable without the
drive scripts' brace-matching `splitFrames` (which exists for the
*prose* frames, where several JSON objects can share a message).

⚠ **No client-supplied correlation id.** The inbound `command` payload
is `{ text, fields?, barId? }`; `dispatchId` is server-minted
(`ctx.commandId`). Correlation is therefore **by order**: one command
in flight per session, await the next `dispatch-response`. Sound for a
serial harness with one caveat — a *forced* command on the player (a
dialogue `dispatch` effect) would emit an uncorrelated envelope to the
same socket. Mitigation in D2.

**Engagements and prompts** are separate envelope types
(`ActivityUpdateEnvelope { engagementId, outcome }`,
`PromptEnvelope { promptId, outcome }`). `EngagementStartedNote`
carries `engagementId` + optional `duration`, so a harness can await
the matching `engagement-completed` note on the activity channel.
Inbound `prompt-response` / `prompt-cancel` answer prompts.

**The structured state read exists on the wire already**: `mql-query`
(`MqlQueryMessage { queryId, query, cardinality, fields?, detailKey? }`,
types line ~1347) — a one-shot MQL read with a **client-minted**
`queryId`, answered by `MqlQueryResultEnvelope` /
`MqlQueryErrorEnvelope` (reasons `parse|resolve|permission|closed`).
Registered in `packages/server/src/backend/inbound/index.ts`
(`'mql-query': handleMqlQuery`). It reuses parse+resolve+project only —
no subscription registration — and runs **as the player** (scope-walk
from the holder, viewer-aware), so it can only see what the player
could. Projection is limited to fields declared in
`static subscribableFields` descriptors
(docs/subsystems/mql-subscription.md § Descriptor mechanism);
`displayName` is universal (declared on `Stuff`), `fields: 'detail'`
yields the inspection-card set.

**The seam**: `packages/server/src/services/auth/TestAuthRoutes.ts` —
`POST /auth/test-login` `{ handle, withCharacter, startLocation,
wizard }`, mounted only under `AUTH_MODE=test` (the server's `dev`
script sets it), optional `X-Test-Auth` header when `TEST_AUTH_TOKEN`
is set, boot-refused when `NODE_ENV=production`. A fresh socket lands
on character-select; the roster arrives on a `session.identity` frame
and the client sends `play <playerId>` (walked in
`drive-cooking.ts § Session.open`).

**Boot/reset precedents**:
- `e2e/playwright.platform.config.ts` — boots `SAXONBERG_PACKS=platform
  AUTH_MODE=test` on its own ports (2011/5174) via
  `node scripts/dev-preflight.mjs 2011 server && … tsx src/preload.js`,
  stdout teed to a log, `reuseExistingServer: !CI`, 240s timeout.
- `e2e/playwright.drive.config.ts` — deliberately has **no
  `webServer`**: its header documents that the server `dev` script's
  preflight KILLS the operator's running world when Playwright's reuse
  probe misses. The wire runner must never re-enter this trap.
- `packages/server/scripts/reset-db.ts` — drops `MONGODB_DATABASE`,
  refuses `saxonberg_demo`. A reset costs a reboot and nothing else.
- `packages/server/vitest.gym.config.ts` + `vitest.config.ts`'s
  exported `GYM_TESTS` — own command (`pnpm test:gym`), own CI job
  (`test-gym` in `.gitlab-ci.yml`, parallel to `test`), outside
  `pnpm test`; the shared-constant pattern that keeps two configs from
  drifting. Composed by spreading `sharedTest`, never `mergeConfig`.
- `.gitlab-ci.yml` `e2e` job — the booted-stack job shape: `mongo:7`
  service, `MONGODB_URI=mongodb://mongo:27017`,
  `MONGODB_DATABASE=saxonberg_e2e`, `SESSION_SECRET` throwaway,
  `.mr-only` rules behind the manual `gate`.

**The `pnpm test` trap, verified**: root `package.json` has
`"test": "pnpm --filter='!@saxonberg/e2e' -r test"`. `pnpm -r test`
runs every workspace package **that has a `test` script**. A
`packages/wire` with a `test` script would be swept straight in
(the filter names only e2e). `pnpm-workspace.yaml` globs
`packages/*`, so the new package joins the workspace with no edit.

**Skills/docs that carry the graduation path**:
`.claude/skills/build/SKILL.md` (~line 127: "Run the drive script from
the requirements doc… append the result to the plan"),
`.claude/skills/finalize/SKILL.md` (§ 2 "The drive — prove it runs"),
`docs/workflow.md` § "The exit criterion: drive it before the MR
opens", `docs/testing.md` (the cost-model doc this build extends).

**The warm-vs-cold measurement has NOT been run.** Requirements § "The
measurement, specified". Nothing below assumes its answer; W1 runs it.

## Plan-level decisions

### D1 — the assertion surface: three channels, each owning one question

The requirements' "assertions bind to the envelope, never prose" is
exactly right for **outcomes** and silent about **state**: `look`
returns `status: 'ok'` with no notes; the envelope cannot say the pot
is in the room or the dye took. Every existing drive answers state by
grepping prose, which re-tangles the tiers (prose is the render tier's
subject). Resolution:

1. **Outcomes → the envelope.** Did the act succeed; if not, which
   note kind, which `reason`. `expectOk(env)`,
   `expectNote(env, 'controller-rejected', { reason })`. Never assert
   a refusal by its prose.
2. **State → `mql-query` over the same socket.** The one-shot MQL read
   is the honest structured state read: client-correlated (`queryId`
   is client-minted — no ordering fragility), player-scoped
   (viewer-aware, so the test sees exactly what the player could —
   perception, concealment and belief stay honest), and projected over
   the same `subscribableFields` the card surface renders. "The pot is
   in the room" is `query("here.contents", fields:['displayName'])`;
   "the gauge reads turning" is a `detail`/named-field read wherever a
   descriptor exists. Cost: nothing new server-side — the message,
   handler and projection all ship today.
3. **Prose survives, narrowed and counted.** Where a fact's only
   observable is a rendered line (no subscribable field reaches it),
   the harness offers `session.prose(cmd)` — the MML-stripped body
   frames, exactly what the drive scripts read today. The line: prose
   may establish that a *fact* is visible (a noun, a number), never
   that an *outcome* occurred and never a full sentence (the project
   refuses to assert one sentence twice). Every `prose()` call is
   counted by the harness and the run reporter prints a per-file
   census — census now, ratchet later (the lint-family pattern;
   Deferred seams).

   ⭐ **A wire file may not add a `subscribableFields` descriptor to
   make itself assertable.** A state a flow needs and the projection
   cannot reach is either a card-surface gap (record it as a finding,
   like a `dirtiesWorld` flag — the descriptor serves the card first,
   the test second, and adding it is a small kernel/pack change with
   its own review) or genuinely render-only, in which case prose is
   the correct channel. Trade-off stated: this means the first ports
   will carry more `prose()` than the end state wants, visibly, in a
   census — rather than invisibly, in a pile of regexes.

### D2 — correlation by order; no engine change

The `command` message carries no client id and gets none. The harness
enforces **one command in flight per session**: drain the receive
buffer, send, await the next `dispatch-response`. The async-command
path is covered (single late envelope from the body's `finally`).
Known hole: a forced command on the player (dialogue `dispatch`)
emits an uncorrelated envelope; mitigation is the drain-before-send
plus a harness option `cmd(text, { settleMs })` for the rare scene
that provokes one. If a flow ever genuinely needs id-correlation, that
is a kernel MR proposed on its own, not smuggled in here. Waiting
primitives shipped: `cmd()` (next dispatch-response),
`awaitActivity(engagementId)` (matching `engagement-completed` /
`-cancelled` on the activity channel), `awaitPrompt()` +
`answerPrompt(promptId, response)`, `query()` (by `queryId`),
`prose()` — no fixed sleeps anywhere in the harness's happy path.

### D3 — one boot group per run; `packs:` is validated metadata, not a boot trigger

The requirements ask for both "one boot per run" and "each file
declares the packs it needs" and they conflict: a per-file pack set is
a boot per distinct set. Resolved as **boot groups**: a run boots one
pack set and executes every file whose declared `packs:` are a subset
of it. v1 ships exactly one group — the full shipped world (default
`SAXONBERG_PACKS`, i.e. unset) — because flows cross packs by
definition and every existing drive ran against the full world. A
file still declares `packs:` (an exported const the harness
registers), and the harness **fails the file fast** when a declared
pack is absent from the booted world (read off the world, not
guessed), so the declaration is checked, documented dependency —
narrowing becomes affordable later without touching any file. Cost
stated plainly: N groups = N × cold-boot (~2 min by the e2e timeout;
W1 measures it); one group = one boot, `boot + Σ(tests)`. Per-file
narrowing is recorded as a deferred seam, not built.

### D4 — runner: vitest in `packages/wire`, own config; no `test` script, structurally

Vitest, following the gym precedent: own config
(`packages/wire/vitest.config.ts`), serial (`fileParallelism: false`),
generous per-file timeouts (flows run minutes), default reporter's
per-file timings satisfying the AC, and a **custom `sequence.sequencer`**
that orders `*.dirty.wire.test.ts` files last (D6) — a thing a bespoke
tsx runner would reimplement badly and `node:test` cannot express.
Wire files import `@saxonberg/types` (envelope types) and `ws` only —
never server source, so none of the server suite's bootstrap concerns
apply.

The package's runner script is named **`wire`, and there is no `test`
script at all** — `pnpm -r test` only runs packages that have one, so
the root `"test"` filter needs no edit and no future filter regression
can sweep the suite in. Root gains `"wire": "pnpm --filter
@saxonberg/wire run wire"` (plus `wire:dirty` / `wire:clean`
variants, D6).

### D5 — who boots: attach by default, owned on request; never kill the operator's world

Two modes, both mandatory:

- **Attach (local default).** The runner probes the target
  (`WIRE_SERVER_URL`, default `http://localhost:2010`) with a cheap
  authenticated `POST /auth/test-login`; on failure it **stops with
  instructions** ("boot with `pnpm dev:server`, or run with
  `--boot`"). It never spawns and never kills — the
  `playwright.drive.config.ts` lesson, kept.
- **Owned (`WIRE_BOOT=1`; CI always).** vitest `globalSetup` spawns
  the server on **port 2012** (2010 = dev, 2011 = platform e2e) via
  `node scripts/dev-preflight.mjs 2012 server && AUTH_MODE=test
  PORT=2012 … tsx src/preload.js`, stdout teed to a log, polls
  test-login until ready (the platform config's 240s budget),
  teardown kills the child. The preflight is safe here *because the
  port is wire's own*: it only ever reaps a stale wire-owned server.
  The database is the environment's (`MONGODB_DATABASE` from the
  worktree's `packages/server/.env` locally — one DB per worktree,
  unchanged; a throwaway `saxonberg_wire` on the CI mongo service).

No client is booted in either mode — the wire tier's whole point.

### D6 — `dirtiesWorld`: a filename, a stated reason, a sorted tail, a printed list

- **Declaration** is the filename: `<flow>.wire.test.ts` is repeatable;
  `<flow>.dirty.wire.test.ts` consumes something the world does not
  regenerate. The sequencer can sort on it without importing anything,
  `ls` is the census, and a rename is a reviewable diff.
- Each dirty file states its reason as an exported
  `export const DIRTY_REASON = "eats the cookhouse's only cut of meat"`
  registered with the harness at file load.
- **The runner batches dirty files last** (custom sequencer). It does
  not reset mid-run — a reset is a reboot the runner may not own. After
  a run that executed dirty files, the reporter prints that a reset is
  owed before the next full run.
- **The report is the product**: global teardown prints the content
  findings — every dirty file with its reason — as the "questions for
  the owning trade" list the requirements are emphatic about. First
  run's list lands in the drive record and each finding is offered to
  its trade's slate (a reporting duty, per the requirements'
  non-goals; fixing none of them).
- `pnpm wire:clean` runs only the repeatable set (the free local
  loop); `pnpm wire:dirty` runs only the tail (after which you owe a
  reset); `pnpm wire` runs both, clean first.

### D7 — the migration map (thirteen sources → ten wire files, three retirements)

The five server scripts port 1:1 — they are already wire-shaped; the
port is harness adoption plus envelope/mql assertions replacing sleeps
and most prose greps:

| source | wire file | dirty? |
|---|---|---|
| `scripts/drive-cooking.ts` | `cooking.dirty.wire.test.ts` | yes — eats the shipped cut, orders the stocked stew |
| `scripts/drive-food-safety.ts` | `food-safety.dirty.wire.test.ts` | yes — same venue, stated in its header |
| `scripts/drive-identity.ts` | `identity.dirty.wire.test.ts` | yes — header: fresh world non-negotiable (belief/dossier state) |
| `scripts/drive-logistics.ts` | `logistics.wire.test.ts` | expected repeatable — mints its own actor/paper; verify at port |
| `scripts/drive-textiles.ts` | `textiles.wire.test.ts` | merged, below |

The eight Playwright specs:

| source | disposition |
|---|---|
| `drive-crafting.spec.ts` | → `crafting.wire.test.ts` |
| `drive-farmstead.spec.ts` | → `farmstead.wire.test.ts` |
| `drive-metal-chain.spec.ts` | → `metal-chain.wire.test.ts` (its restart-persistence pass only runs under owned boot — the file skips that leg with a printed notice in attach mode) |
| `work-drive.spec.ts` | → `work.wire.test.ts` |
| `drive-farming.spec.ts` | → `farming.wire.test.ts`, **partial**: the buy/plant/water/refusal legs port; the compressed-clock growth-to-harvest arc does NOT (it needs a `world_state` clock-scale set before boot — an operator ceremony no repeatable suite can assume). The arc is recorded as the first customer of a future clock boot-group (Deferred seams) and stays a manual drive until then. |
| `drive-textiles.spec.ts` | merged with `scripts/drive-textiles.ts` into one `textiles.wire.test.ts` covering field → bolt → dye → garment |
| `drive-textiles-downstream.spec.ts` | **retired** — 0 expects in 243 lines; its buy-the-cloth leg folds into the merged textiles file |
| `drive-wave2.spec.ts` | **retired as a spec**; its two live checks (`pack status` lists the shipped packs; founder seat answers) fold into `platform-smoke.wire.test.ts`, which W0 needs anyway as the harness's own first consumer |

Retired with the scripts: the five `drive:*` entries in
`packages/server/package.json`. `e2e/` keeps every non-drive spec and
all of `helpers.ts` (30 importers). A new `lint:drive-scripts` gate
(census-then-ratchet, ceiling zero) holds `packages/server/scripts/`
free of `drive-*.ts` forever after — the mechanical guard behind the
graduation path, and it joins `lint:family` automatically because the
roster is derived.

### D8 — graduation: a drive is BORN a wire file

From this build on, `/build`'s exit criterion is unchanged in meaning
and changed in medium: the build agent writes the requirements doc's
drive script **as** `packages/wire/tests/<feature>.wire.test.ts` (or
`.dirty.`) and the drive record is that file's first run output.
`/finalize`'s drive check gains one mechanical step: the wire file
exists, is in the suite, declares its packs and its dirtiness
honestly, and no `scripts/drive-*.ts` was minted (the lint gate backs
this). Edits land in `.claude/skills/build/SKILL.md` and
`.claude/skills/finalize/SKILL.md` (tracked, this build's to edit).
`docs/workflow.md` § "The exit criterion" is **swept, not raced** —
this plan's W5 records the exact replacement wording for the sweep
commit rather than editing the file.

### D9 — the measurement runs before the policy is written

W1 runs the requirements' warm-vs-cold measurement in this worktree
(build-1 — not busy; it holds no server) and records the numbers in
`docs/testing.md`. It decides: (a) whether a Mongo snapshot/restore
reset path is worth a slate (seeding dominates) or dead (process
start dominates — `dirtiesWorld` batching is the whole answer);
(b) the CI job's realistic wall-clock budget (CI always pays cold).
The runner's reset guidance text is written after the numbers exist,
not before.

## Host placement

An infra build: **no new Stuff class, no mixin, no field, no template
row, no namespace root** — nothing composes onto any host, so the
classic rework class is structurally absent. The placement questions
that remain are package-level, and each was checked against the
narrowing test (a guard that re-narrows the host set means the wrong
host):

- **The harness lives in `packages/wire/src/`**, not
  `packages/server/scripts/` (where it would tempt server imports and
  ride the server's lint surface) and not `e2e/` (the tangling the
  requirements exist to undo). Sanctioned by requirements § Placement.
- **Nothing in `packages/wire` imports `packages/server` source** —
  only `@saxonberg/types` and `ws`. The moment a wire file wants a
  server import it is reaching past the wire, which is the tell that
  it wants to be a unit test instead.
- **The kernel gains nothing** except the deletion of five scripts,
  five package.json lines, and one new lint script
  (`scripts/check-drive-scripts.ts` — a lint gate is a sanctioned
  server-package category). No new module category, no exported free
  helper, no `eslint-disable` anywhere in this build.
- **The CI job is a sibling of `test-gym`**, not a line inside `test`
  or `e2e` — same reasoning as the gym split: removing it from a
  pipeline would then be a decision someone has to make visibly.

## Convention conformance

Checked at plan time against current files, not recalled:

- **Module categories / export discipline** — apply to
  `packages/server/src/mud/**` and pack `src/`; `packages/wire` is
  outside both (like `e2e/`). The build's only server-tree touches are
  deletions plus one lint script; nothing trips
  `lint:module-scope` / `lint:imports` / the ESLint export rules.
- **`pnpm test` at two moments** — the build's own loop is
  `pnpm -C packages/wire wire` + `lint:family` + `test:near`; the full
  suite once before the MR.
- **No new Mongo collections, no migrations** — none; the CI job's
  `saxonberg_wire` database lives on a throwaway service container,
  and local runs use the worktree's own database (one DB per worktree,
  unchanged).
- **Lint family is derived** — `lint:drive-scripts` self-enrolls via
  the `package.json` scan; no roster is enumerated anywhere, including
  in the new CI job (which runs the wire suite, not lints).
- **Index files get swept, not raced** — this plan does not touch
  `CLAUDE.md`, `docs/workflow.md`, `docs/roadmap.md`,
  `docs/slates/README.md`; W5 records what the sweep should change.
- props:/cast:, Locations-not-rooms, `<root>/<branch>/`,
  verbs-on-objects — n/a (no content, no verbs, no rows). Wire files
  *exercise* verbs and must keep the drives' standing discipline:
  ordinary patrons, no wizard flag except where a source drive
  documents why, no `clone` to supply inputs
  (`drive-textiles-downstream`'s header states the rule; it carries
  into every port).

## Waves

Each independently landable, each ending at a commit.

### W0 — the package, the harness, and its first consumer

**Implements:** D1, D2, D4 (attach half of D5).
**Goal:** `packages/wire` exists; `pnpm wire` (attach mode) runs one
green file against an operator-booted world.

- `packages/wire/package.json` — name `@saxonberg/wire`, `private`,
  scripts `wire` / `wire:clean` / `wire:dirty` (vitest with config /
  filename filters), **no `test` script**; deps: `@saxonberg/types`
  (workspace), `ws`, `vitest`, `@types/ws`.
- `packages/wire/vitest.config.ts` — serial, `testTimeout` 120s
  default, the dirty-last sequencer, globalSetup (probe-or-boot; W0
  ships probe + fail-fast only), global teardown (dirty census print).
- `packages/wire/src/harness/` — `session.ts` (login → socket →
  roster → `play`; `cmd()` awaiting the next `dispatch-response`;
  `prose()`; `query()` via `mql-query`/`queryId`;
  `awaitActivity()`; `awaitPrompt()`/`answerPrompt()`; multi-session
  supported — `drive-identity` needs four), `assertions.ts`
  (`expectOk`, `expectStatus`, `expectNote`), `registry.ts` (`packs:`
  declaration + subset check against the booted world, `DIRTY_REASON`
  registration, the prose census counters). Frame parsing keeps
  `splitFrames` for prose frames (verified: several JSON objects can
  share one socket message) but reads envelopes by their top-level
  `type`.
- `packages/wire/tests/platform-smoke.wire.test.ts` — login, `play`,
  `look` returns `status: 'ok'`, an unknown verb returns the refusal
  note kind, one `mql-query` (`here`, `fields: ['displayName']`)
  round-trips, plus the two live checks absorbed from `drive-wave2`
  (`pack status` lists shipped packs — a prose read, counted; the
  founder-seat check). This file is the harness's own proof.
- Root `package.json`: add `"wire"` (and the two variants). ⚠ Stage by
  name; root package.json is shared but not on the swept-index list.

**Acceptance:** against a dev server on 2010, `pnpm wire` is green;
with no server up, it fails fast with instructions and kills nothing.
**Commit:** `build(wire W0): packages/wire — harness + platform smoke`.

### W1 — the warm-vs-cold measurement

**Implements:** D9. **Goal:** the numbers exist before any policy text.

Per requirements § "The measurement, specified", in this worktree:
`reset:db` → time cold boot to ready → stop → time warm boot → repeat
both once. Record in `docs/testing.md` beside the suite cost figures
(the full two-tier testing.md section itself is W5; this wave adds the
table). Write the one-paragraph consequence: snapshot/restore slate
or not; the CI budget number.

**Acceptance:** four timings recorded; the decision paragraph cites
them. **Commit:** `docs(wire W1): warm-vs-cold boot measurement + reset
policy`.

### W2 — owned boot + the CI job

**Implements:** D5 (owned half), the CI acceptance criterion.
**Goal:** the suite can own its world; a red wire suite is a red
pipeline.

- globalSetup grows the `WIRE_BOOT=1` path: preflight 2012, spawn
  `tsx src/preload.js` (`AUTH_MODE=test`, `PORT=2012`, env DB), tee
  log, poll test-login (240s), teardown kill. `WIRE_SERVER_URL`
  defaults to 2012 when booting, 2010 when attaching.
- `.gitlab-ci.yml`: `wire` job — `extends: [.node, .mr-only]`,
  `stage: validate` (parallel with `test`/`test-gym`, behind the same
  manual gate), `mongo:7` service, `MONGODB_URI=mongodb://mongo:27017`,
  `MONGODB_DATABASE: saxonberg_wire`, throwaway `SESSION_SECRET`,
  script `WIRE_BOOT=1 pnpm wire`, boot log as on-failure artifact.
- ⚠ The CI file is shared with everything; the job is purely additive
  and staged by name.

**Acceptance:** locally, `WIRE_BOOT=1 pnpm wire` cold-starts on 2012
with a dev world running untouched on 2010; the CI job exists and
fails the pipeline when a wire file fails (provable on this build's
own MR pipeline). **Commit:** `build(wire W2): owned boot + the wire
CI job`.

### W3 — the five scripts become five wire files

**Implements:** D6, D7 (script half), the lint gate.
**Goal:** `packages/server/scripts/drive-*.ts` is empty, forever.

Port order — logistics first (expected repeatable: proves the
clean-file path), then textiles (merge target arrives in W4 but the
script's chain ports now), then the three dirty files. Each port:
replace sleeps with envelope/activity waits, refusal greps with note
assertions, state greps with `mql-query` where a descriptor reaches,
`prose()` (counted) where none does; declare `packs:`; dirty files
carry `DIRTY_REASON` verbatim from the script headers (the reasons are
already written — cooking's and identity's headers are the content
findings). Delete the five scripts + the five `drive:*` package.json
entries. Add `scripts/check-drive-scripts.ts` + `lint:drive-scripts`
(fails on any `packages/server/scripts/drive-*.ts`; ceiling zero) —
self-enrolls in `lint:family`.

**Acceptance:** `pnpm wire` green from a cold start; **`pnpm
wire:clean` green twice in a row with no intervening reset** (the
requirements' load-bearing invariant — proven here, re-proven at the
drive); the teardown prints the three findings; `lint:family` green
including the new gate. **Commit:** `build(wire W3): the five drive
scripts are wire files; lint:drive-scripts holds zero`.

### W4 — the Playwright drive specs migrate; e2e shrinks

**Implements:** D7 (spec half).
**Goal:** `e2e/tests/` holds render tests only.

Port crafting, farmstead, metal-chain, work, farming-partial (D7's
table, including farming's documented exclusion and metal-chain's
owned-boot-only restart leg); merge the two textiles sources into
`textiles.wire.test.ts`; delete all eight specs (`git rm` by name —
never `add -A`). `e2e/playwright.drive.config.ts` is retired with
them (its reason-for-being was these specs; its header lesson now
lives in D5/the harness comments). Verify `pnpm --filter
@saxonberg/e2e test` still collects and runs its remaining specs.

**Acceptance:** the flows run over the wire with no browser; the
Playwright suite runs minus the eight; no helper orphaned.
**Commit:** `build(wire W4): flow specs out of Playwright; e2e is
render-only`.

### W5 — docs, skills, and the sweep notes

**Implements:** D8; the docs acceptance criteria.

- `docs/testing.md` — a "Two tiers: wire and render" section (when to
  write which; the three assertion channels and the prose census; the
  repeatable/dirty contract; attach vs owned; the cost row from W1).
- `.claude/skills/build/SKILL.md` — the exit criterion's medium: the
  drive is written as a wire file; the drive record is its first run.
- `.claude/skills/finalize/SKILL.md` — the graduation check (file in
  suite, packs declared, dirtiness honest, no `scripts/drive-*.ts`).
- **Sweep notes recorded in this plan, not applied**: `docs/workflow.md`
  § "The exit criterion: drive it before the MR opens" gains "the
  drive script IS a wire file in `packages/wire/tests/`; `/finalize`
  confirms it landed in the suite instead of discarding it"; the
  CLAUDE.md testing block's mention of drives, and the docs map's
  testing.md line, follow at the sweep.

**Acceptance:** a fresh reader of testing.md can decide which tier a
new test belongs to; the two skills describe the born-a-wire-file
path. **Commit:** `build(wire W5): two-tier testing docs + the
graduation path in the skills`.

### W6 — the drive, and the MR

Run the requirements' five-step drive (§ The drive): full suite once
(unchanged, wire-free) → `lint:family` 30/30 (29 today + the new gate) →
wire suite cold, one boot, per-file timings → **immediate re-run of
the clean set with no reset, green** → Playwright minus the migrated
specs. Append the drive record below, including the first dirty-census
list handed over as content findings. Push, open the MR.

## Reachability wiring

Infra's four links — each fails closed and silent, per the lint-family
drift precedent (25 gates existed, CI ran 19):

- **Command** — root `pnpm wire` / `wire:clean` / `wire:dirty` (W0).
  Without the root script the suite exists and nobody runs it.
- **CI** — the `wire` job in the validate stage (W2). A suite outside
  the pipeline is the four-gates-in-no-pipeline failure class.
- **Gate** — `lint:drive-scripts` self-enrolled in the derived
  `lint:family` (W3). Without it the graduation path regresses one
  build later.
- **Workflow** — the `/build` + `/finalize` skill edits (W5). Without
  them the next build writes `scripts/drive-<feature>.ts` from habit
  and the gate turns that into a hard stop with no signposted
  alternative — the skills are the signpost.

## Acceptance-criteria coverage

| requirements criterion | wave |
|---|---|
| A named command runs the suite; `pnpm test` does not | W0 (D4: no `test` script, structurally) |
| Green twice in a row, no reset, except `dirtiesWorld` files | W3 (proven), W6 (re-proven at the drive) |
| The five migrated flows proven over the wire, no browser | W3 (the five scripts); W4 (the specs the count missed) |
| A CI job fails the pipeline on failure | W2 |
| Warm-vs-cold recorded; reset policy reflects it | W1 |
| `docs/testing.md` describes the two tiers | W5 (cost row lands W1) |
| `/finalize` graduates a build's drive into the suite | W5 (+ W3's gate as the backstop) |

Unmapped: nothing. Beyond-scope additions (the three extra Playwright
specs, the retirements, the lint gate) are inventory corrections and
mechanical guards, not new scope.

## Test & gate strategy

- **The suite tests itself**: `platform-smoke.wire.test.ts` is the
  harness's proof, and every port is validated by running it. Unit
  tests inside `packages/wire` for the pure pieces only — the frame
  splitter, the sequencer's ordering, the census counters — run by the
  same `wire` command with a `--project`/filename filter, never by
  `pnpm test` (no `test` script exists to be found).
- **Only the drive can prove**: the twice-without-reset invariant, the
  attach-mode fail-fast, the operator-world-untouched property of
  owned boot, and CI redness (this MR's own pipeline).
- **Gates**: the whole derived family must stay green; new
  `lint:drive-scripts` enrolls automatically. `pnpm test` runs once
  before the MR and is expected untouched (deletions of scripts it
  never ran, plus one lint script it doesn't compile against).
- **Mid-build loop**: `pnpm wire` (attach, against this worktree's dev
  server) + `test:near` + `lint:family`.

## Risks & opens

- **The repeatability invariant may be false for more files than
  declared.** Logistics and several spec ports are *expected*
  repeatable; W3/W4 verify by double-running each port as it lands.
  Every failure is a new dirty flag with a reason — i.e. a content
  finding, which is the requirements' point, not a plan failure.
- **Projection gaps are unquantified.** How much state the ports can
  move off prose depends on which `subscribableFields` the trades
  declared for the card surface. The prose census makes the residue
  visible instead of guessing now. If a port finds the census
  embarrassing (mostly prose), that is a finding for the card-surface
  owner, not a reason to add descriptors from this build (D1).
- **Forced-command envelopes** could theoretically interleave (D2).
  None of the thirteen source flows provokes one mid-command today;
  if a port flakes this way, the harness's drain + `settleMs` is the
  tool, and the flake is named in the file.
- **CI wall clock is unknown until W1.** If cold boot + suite lands
  much past the gym job's ~6 min, the mitigation is splitting the CI
  job clean/dirty or trimming per-file scope — decided on the number,
  not now.
- **Farming's exclusion (D7) narrows a proven flow.** The growth arc
  was proven once by the original drive; the wire file proves less
  until a clock group exists. Flagged for the user rather than
  silently scoped down.
- **Stop-and-ask**: any need for an engine change (correlation id, a
  test-only descriptor, a new seam in TestAuthRoutes beyond what
  ships) — the requirements' "nothing about the engine changes" is a
  scope wall, and hitting it is a conversation, not a workaround.

## Deferred seams

Each leaves as a slate (or a slate line), not a plan section:

- **`docs/slates/wire-suite-growth-slate.md`** (new, small) holding:
  boot groups beyond the one (per-pack-set narrowing, with the group
  mechanism D3 specified but did not multiply); the compressed-clock
  group whose first customer is farming's growth arc; the prose-census
  ratchet (freeze today's count as the ceiling once the ports settle);
  and — only if W1 says seeding dominates — the Mongo
  snapshot/restore reset path the requirements pre-authorized
  recording.
- **The dirty-file findings** go to the owning trades' slates as
  one-liners at the sweep (cooking/food-safety → the cookhouse
  restock question; identity → whether belief state should reset),
  per the requirements' non-goal.

## Critical files

Read first, in order:

- `docs/requirements/wire-tests-requirements.md` — the scope contract
- `packages/server/scripts/drive-cooking.ts` — the harness's source
  material (login, Session, splitFrames, the roster handshake)
- `packages/server/src/mud/lib/command/CommandGiver.ts` §
  `emitDispatchResponse` — the one-envelope-per-dispatch guarantee,
  async included
- `packages/types/src/index.ts` — `DispatchResponseEnvelope`, the
  `Note` union, `MqlQueryMessage` / `MqlQueryResultEnvelope`,
  `ActivityUpdateEnvelope`, `PromptEnvelope`
- `packages/server/src/backend/inbound/command.ts` +
  `inbound/index.ts` — the inbound shapes and handler map
- `packages/server/src/services/auth/TestAuthRoutes.ts` — the seam
- `e2e/playwright.drive.config.ts` — the header comment is the
  never-kill-the-operator's-world doctrine
- `e2e/playwright.platform.config.ts` — the owned-boot spawn shape
- `packages/server/vitest.gym.config.ts` + `vitest.config.ts` — the
  own-command/own-job precedent and the shared-constant pattern
- `.gitlab-ci.yml` — `test-gym` (job shape) + `e2e` (booted-stack env)
- `packages/server/scripts/reset-db.ts` — what a reset is
- `docs/subsystems/mql-subscription.md` § Descriptor mechanism — what
  `mql-query` can and cannot project
- `docs/testing.md` — the doc W1/W5 extend

## Drive record

*(appended at build time, not at plan time — the requirements § The
drive, five steps, plus the first dirty-census findings list.)*
