# Async commands — implementation plan

Build plan for the `async` command override in `packages/server`.
Authoritative input: [async-commands-requirements.md](../requirements/async-commands-requirements.md)
(revised — scripts are **sync by default**; a new **`script` verb** is
in scope). Seeding slate:
[async-commands-slate.md](../slates/tails/async-commands-slate.md).

**One line:** a per-command spec field `async: boolean` (framework
default `false`) + reserved framework flags `--async` / `--sync` that
detach a command's controller body from the **giver's own** input chain
at **accept-time** (spawned under `ExecutionContextApi.runRoot`, not
awaited). The detached run owns firing the single (late) dispatch-response
envelope; nothing fires at accept-time. Sync stays the default and is
already per-giver / never-global. A new ordinary `script` verb routes the
typed-script surface through `_executeOne`, so it (and `make`) inherit the
override with zero special-casing. Engagement is not wired (no-op).

---

## What changed from the prior revision

- **Scripts default to SYNC, not async.** The earlier "`make` gets
  `async: true`" content default is **dropped** — `make` ships with **no**
  `async:` field. Rationale: sync is already per-giver (blocks only the
  giver's own next command via the per-socket `inboundChainBySocketId` +
  event-loop interleaving + the script engine's cooperative `slice`
  yield), never global. Async is purely the `--async` opt-in override.
- **New `script` verb** (new scope — its own phase, Phase 5): an ordinary
  command (YAML + controller + seed) whose `execute()` reads the script
  body and runs it via `ScriptApi.run`, going through `_executeOne` like
  any command — so it inherits `async:` + `--async`/`--sync` for free.
  Sync by default; `script --async <body>` detaches.
- **New "sync is per-giver, not global" acceptance test** (two-giver
  ordering) alongside the single-giver async ordering test.
- The **bare typed-script line** at `CommandGiver.ts:684`
  (`parseResult.script` branch) stays **unchanged** — sync, no flag. Do
  not touch it. The `script` verb is the flaggable sibling.
- The detach mechanism itself (schema+field, reserved-flag parsing, the
  `_executeOne` detach seam, envelope-ownership move, error routing,
  ordered accept-time bookkeeping — D1/D2/D4/D5/D6) is **unchanged**.

---

## Source-anchor verification (drift corrected)

- **`Backend.ts:242`** — `inboundChainBySocketId` serializes each
  **socket's** own messages; other sockets interleave freely. Async makes
  `executeCommand` resolve early so the giver's own chain frees; sync's
  per-giver-not-global property is preserved (and now a documented
  guarantee + tested).
- **`CommandGiver.ts` lines.** `executeCommand` ~490; `_runChain` ~871;
  `_executeOne` ~1042 (clone ~1061, `await controller.execute` ~1064).
  The **envelope-assembly + framework-prose-sweep tail is at ~720–770
  inside `executeCommand`** (the "envelope ownership move" — Phase 3).
- **`_dispatchBound` (~1092)** is the scripting per-statement primitive;
  does NOT call `_executeOne`; out of scope for async.
- **Bare typed-script branch** = `executeCommand` ~670–684
  (`parseResult.script` → `await ScriptApi.runAst(...)`), inline, not via
  `_executeOne`. **Unchanged by this feature** (requirements non-goal).
- **`ScriptApi.run(text)`** (`mud/api/script.ts` ~63) = parse (via the
  `script` parser) **and** run as the acting actor; resolves at script
  completion **or** at first suspend (detach into a background coroutine).
  This is the single call the new `script` controller needs — no parser /
  `runAst` plumbing. `runAst(ast)` (~54) is the AST-in variant if a
  controller prefers to parse separately.
- **Body side-channel.** The `{text, fields}` overlay (`overlayBodyFields`)
  reaches only a payload field or a **designated body field = a
  `greedy: true` string positional**. So the `script` verb declares a
  greedy string `body` arg; it fills from the typed remainder OR a
  client-composed `fields.body`.
- **Reserved-flag collision: clean.** No YAML declares an `async`/`sync`
  option or arg. `author/pack.yaml` has a `sync` **subcommand** (bare word
  `pack sync`) — no collision with the `--async`/`--sync` long-flag
  tokens. Add a load-time guard anyway (Phase 1).
- **Phase model.** `IMPLEMENTED_REPLACE_HANDLERS` empty; `HOOKABLE_PHASES`
  = `focus-update` only. The reserved-flag path (not the phase-effect
  `deferred-dispatch` handler) is the v1 mechanism — see Phase 2.
- **`ScriptLogic.ts` at `mud/obj/api/ScriptLogic.ts`.** `startAndDetach`
  (~201) awaits `co.whenFirstYield()`; `co.whenSettled()` (~215) fires a
  `system.script.aborted` scene — the error/abort precedent (D5) that is a
  **separate path** from the dispatch-response (no double-fire).
- **Attribution precedent:** `ScheduleApi.planRun` (`api/schedule.ts` ~68)
  → `runRoot(...)` + `updateCurrentFrameMetadata({ causingCommandId })`.
  `runRoot`/`run` return `fn()`'s value; passing an `async` fn returns a
  promise dropped with `void` (ALS propagates across awaits).

---

## Ordered phases

### Phase 1 — schema + `CommandDefinition.async` (load-time)

**What.** Add top-level `async: boolean` (default `false`), validated at
boot.

**Files.**
- `mud/cmd/command.schema.json` — add top-level property `async`
  (`"type":"boolean"`, description noting the reserved-flag override +
  deferred-output caveat). (`additionalProperties:false` requires the
  key be declared.)
- `mud/api/command.ts` — `async?: boolean` on `interface CommandView`
  (beside `fallthrough?`). (Leave `CommandSchemaPayload` alone unless a
  client consumer wants the default; not required.)
- `mud/lib/command/CommandDefinition.ts` — `public readonly async: boolean;`
  initialised `this.async = view.async === true;`. Add a `validate()`
  guard: throw if any option/arg name (any scope) is `async` or `sync`
  (defense against future collision with the reserved flags).

**Tests.** `CommandDefinition.schema.test.ts`: `async: true|false` load;
`async: "yes"` fails at load (boot); no field ⇒ `def.async === false`;
option named `async` throws.

---

### Phase 2 — reserved-flag parsing + effective-async resolution

**What.** Recognise `--async` / `--sync` as reserved framework flags on
any verb, ahead of per-command option binding (the `--` stop-options
precedent), and compute effective async = flag-over-spec-default, threaded
toward `_executeOne`.

**Where.** `mud/obj/api/CommandLogic.ts` `assemble` (~470–560). In both
option-binding loops (verb-scope ~481, sub-scope ~530), when `!stopped`
and a `long-flag` token's `name` is `async`/`sync`: record a per-assemble
`reservedAsync: 'async' | 'sync' | undefined` (last wins), **skip** the
token (never reaches `bindOptionToken`, so no "unknown option" bind
error), consume no value. Only before the `stop-options` boundary (after
`--`, treat as a literal positional).

**Surface + thread.** Add `reservedAsync?: 'async' | 'sync'` to
`AssembleSuccess` (`api/command.ts` ~1116) — a pure read, re-computed
identically per match attempt (no `parsed.rawTokens` mutation). In
`_runChain` after a successful assemble:
```ts
const effectiveAsync = built.reservedAsync
  ? built.reservedAsync === 'async'
  : command.async;
await this._executeOne(command, resolved.resolved, attempt,
                       { async: effectiveAsync });
```
Bound branch (`executeCommand` ~663): no tokens ⇒
`effectiveAsync = parseResult.bound.command.async`; pass through the same
`_executeOne` opts.

**Why not the `deferred-dispatch` phase-effect handler.** D2 makes the
flags *reserved framework flags*, not per-command options with `effects:`.
The detach logic lives in `_executeOne`; the decision is threaded
directly. `IMPLEMENTED_REPLACE_HANDLERS` / `HOOKABLE_PHASES` stay
untouched; the `dispatch`/`deferred-dispatch` phase-effect remains a
documented placeholder (note the relationship in Phase 6 docs).

**Tests.** `command-reserved-async.test.ts`: `look --async foo` ⇒
`reservedAsync==='async'` and `foo` still binds positionally; `--sync` ⇒
`'sync'`; an option-less verb still accepts both; `--async` after `--` is
a literal positional.

---

### Phase 3 — detach seam in `_executeOne` + envelope-ownership move + error routing

Three coupled edits in `CommandGiver.ts` (mechanism unchanged from prior
revision).

**3a. Extract the finish tail** (~720–770: framework-failure prose sweep →
envelope-template assembly w/ `prompt-refresh` note → `sendEnvelope`) into
a module-private `emitDispatchResponse(ctx: CommandContext)` keyed on
`ctx.commandGiver` / `ctx.commandId` / `ctx.getNotes()` / `ctx.getStatus()`.
Behaviour-preserving for sync (every path's `claimingCtx` carries the same
giver + threaded `commandId`). `executeCommand`'s tail becomes:
```ts
if (!detachedContexts.has(claimingCtx)) emitDispatchResponse(claimingCtx);
```

**3b. Deferred-finish marker.** Module-private
`const detachedContexts = new WeakSet<CommandContext>();`. `_executeOne`
adds the claiming ctx when it detaches; `executeCommand` checks it before
finishing. Keeps the flag off the public `CommandContext` interface
(export-discipline / member-privacy), no cleanup (weak), no race
(single-threaded; the sync check runs before the detached run fires).

**3c. `_executeOne` detaches when async.** Signature
`_executeOne(command, model, context, opts?: { async?: boolean })`. The
`controllerName` / `missing-subcommand` resolution stays **synchronous**
(no phantom detach). Then:
```ts
if (opts?.async) {
  detachedContexts.add(context);
  const causingId = context.commandId;              // == dispatchId
  runDetachedBody(causingId, context, async () => {
    let controller: CommandController | null = null;
    try {
      controller = await StuffApi.clone<CommandController>(
        `/obj/command/${controllerName}`);
      await controller.execute(model, context);
    } catch (error) {
      context.note({ kind: 'controller-error', controller: controllerName,
        detail: error instanceof Error ? error.message : String(error) });
    } finally {
      if (controller) StuffApi.destruct(controller);
      emitDispatchResponse(context);                 // single, late envelope
    }
  });
  return;                                            // NOT awaited — chain frees
}
// sync path unchanged (clone → await execute → catch controller-error → destruct)
```
`emitDispatchResponse` in `finally` ⇒ a late throw still fires exactly one
envelope carrying the `controller-error` note (D5 — never a silent log),
reusing the `whenSettled` "surface the failure, don't crash" discipline.

**3d. `runDetachedBody` — attribution.** Module-private, mirroring
`ScheduleApi.planRun`, but tagging a command frame so downstream Scenes
stamp `commandId == dispatchId`:
```ts
function runDetachedBody(causingId: string, ctx: CommandContext,
                         fn: () => Promise<void>): void {
  void ExecutionContextApi.runRoot(CommandGiverMixinMarker, 'executeAsyncBody',
    () => {
      ExecutionContextApi.tagCurrentFrame(FrameKind.Command);
      ExecutionContextApi.updateCurrentFrameMetadata({
        commandContext: ctx, causingCommandId: causingId, forced: false });
      return fn();                                   // async; ALS propagates
    });
}
```
ALS keeps the root frame + metadata live across awaits, so
`controller.execute`'s Scenes read `getCurrentCommandContext()` and stamp
the dispatch's `commandId`. The planted `interactive` on `ctx` keeps
`PromptApi` reachable from the detached body. **Verify** `tagCurrentFrame`
is legal on the `runRoot` synthetic frame (same call `executeCommand`
already makes on its proxy frame; confirm `CommandGiver` is in the
frame-mutator allowlist — it is).

**Ordering preserved.** `applyInputMode`, `touchInput`, parse, alias,
`_emitInputEcho` (+ `CommandDispatchedEvent`) all fire in `executeCommand`
before `_runChain`; `resolveModel` (incl. `updates_focus` hook + any
cardinality/confirm prompt), `preloadValidatorDeps`, `runValidators` all
run in `_runChain` before `_executeOne`. Detach is strictly after them; a
failed validator / declined prompt returns before `_executeOne` (no
detach, no phantom envelope). No post-`_executeOne` work besides the
finish tail, which async defers.

**Tests.** `mud/lib/command/__tests__/CommandGiver.async.test.ts`
(single-giver, gate-driven):
- **Observable ordering.** Slow fixture controller awaits a test-owned
  `Deferred`; run async — `await giver.executeCommand('slow --async')`
  resolves before the gate; a following `ping` runs before the gate; on
  `gate.resolve()` the body finishes and exactly one dispatch-response
  (dispatchId === slow's commandId) fires, captured via a
  `MessageApi.sendEnvelope` spy.
- **Sync control (same controller).** `slow --sync` — the
  `executeCommand` promise stays pending after a microtask flush; resolves
  only after `gate.resolve()`.
- **Exactly-one-envelope, late** / **late throw → `controller-error`
  (status error) + `system.command.error` scene** / **no-detach on
  pre-execute failure** (`detachedContexts` untouched; single synchronous
  `validator-failed`/`controller-rejected` envelope) / **ordered
  bookkeeping** (input-echo + `CommandDispatchedEvent` + focus updates
  observed before `executeCommand` resolves).

---

### Phase 4 — four-combination matrix; `make`/`script` stay sync

**What.** Prove the `(spec default × flag)` matrix. **No content ships
`async: true`** — `make.yaml` is unchanged (no `async:` field), `script`
(Phase 5) ships no `async:` field. The `spec:true` matrix cases use a
**test-only** command def (`CommandDefinition.fromYaml('... async: true')`)
bound to the slow fixture controller.

**Tests.** `CommandGiver.async.test.ts` matrix:
`spec:false + no flag → sync`, `spec:false + --async → async`,
`spec:true + no flag → async`, `spec:true + --sync → sync` — each asserted
by whether `executeCommand` resolved before or only after the gate.

**Sync-is-per-giver-not-global (two-giver ordering).** New test: giver A
runs a slow **sync** command awaiting a gate; giver B runs a fast command.
Because the two givers' `executeCommand` calls are independent awaits (the
per-socket-chain property, modelled at the giver level), B completes
before A's gate resolves:
```ts
const gate = deferred();
const pA = giverA.executeCommand('slow');    // sync; awaits gate
let aDone = false; void pA.then(() => { aDone = true; });
await giverB.executeCommand('ping');          // independent — completes
expect(bPingRan).toBe(true); expect(aDone).toBe(false);
gate.resolve(); await pA; expect(aDone).toBe(true);
```
Note in the test that Backend-level per-socket serialization lives at
`Backend.ts:242`; this exercises the underlying per-giver property.

---

### Phase 5 — the new `script` verb (ordinary command, inherits async)

**What.** A general "run this script body" verb routed through the normal
command path, so it inherits `async:` + `--async`/`--sync` with no
special-casing. Sync by default.

**Category / files** (a script-run verb is shell-tier — the
prompt-as-interpreter given a home; confirm placement against
[scripting.md](../subsystems/scripting.md) / [command-spec.md](../subsystems/command-spec.md)
conventions — `shell` is the recommendation, `system` the fallback):
- `mud/cmd/shell/script.yaml` — the view:
  ```yaml
  verbs: [script]
  controller: shell/ScriptController
  description: "Run a multi-statement script"
  help: |
    Run a script body — `script look; say hi`. Runs synchronously
    (your prompt waits) unless you pass --async, which detaches it so
    you can keep playing while it runs.
  args:
    - name: body
      type: string
      greedy: true         # slurps the remainder verbatim; also the
      required: true        # designated body-side-channel field
  ```
  No `async:` field (sync default). `--async`/`--sync` are framework-
  reserved (Phase 2) — nothing to declare.
- `mud/obj/command/shell/ScriptController.ts`:
  ```ts
  interface ScriptModel extends CommandModel { body: string }
  export default class ScriptController extends CommandController<ScriptModel> {
    async execute(model: ScriptModel, context: CommandContext): Promise<void> {
      const source = (model.body ?? '').trim();
      if (!source) {
        MessageApi.scene(context.commandGiver).topic('system.shell.help')
          .toSelf(Mml.compose`Usage: script <statements>`).send();
        context.note({ kind: 'controller-rejected', reason: 'empty-script' });
        return;
      }
      await ScriptApi.run(source);   // parse + run as the acting actor
    }
  }
  ```
  `ScriptApi.run` derives the acting actor from execution context — under
  the detached run the planted command frame supplies it. It resolves at
  the script's completion **or** first suspend, so `script <no-wait
  compute>` (sync) blocks the giver's own chain until completion, and
  `script --async <no-wait compute>` frees the prompt at accept-time.
  Pre-detach interpreter notes ride the claiming ctx (via
  `startAndDetach`'s `ctx?.note`), then `emitDispatchResponse` fires the
  single envelope.
- `mud/seeds/obj/command/shell/ScriptController.yaml`:
  `class: /obj/command/shell/ScriptController` / `data: {}`.
- **Discovery.** Add `'shell/script.yaml'` to the `commandContributions`
  (`self` bucket) of whatever mixin/class already grants the shell verbs
  to players (mirror where `write`/`alias`/`var` are contributed — likely
  a shell mixin on `ShelledCharacter`/`Avatar`; confirm and co-locate).

**Body reaches the controller two ways:** the greedy `body` arg (typed
`script look; say hi`) and the `{text, fields}` side-channel
(`overlayBodyFields` fills the greedy string `body` from `fields.body` for
a client editor buffer). Both land on `model.body`.

**The bare typed-script line stays unchanged.** `parseResult.script`
(`executeCommand` ~684) keeps `await ScriptApi.runAst(...)` inline — sync,
no flag. The `script` verb is the flaggable form alongside it. Do not
touch the bare branch.

**Tests.**
- `mud/obj/command/shell/__tests__/ScriptController.test.ts` (unit):
  drive `execute` with a `{ body }` model + synthetic ctx; assert
  `ScriptApi.run` called with the body; empty body → refusal note.
- Integration in `CommandGiver.async.test.ts` (end-to-end via
  `giver.executeCommand`): `script <no-wait compute>` (sync) blocks the
  giver's chain until done; `script --async <same>` frees the prompt
  immediately and fires one late dispatch-response keyed on the `script`
  command's `commandId`; `make --async <def'd no-wait recipe>` likewise.
  Assert the coroutine's `whenSettled` abort scene
  (`system.script.aborted`) is a **separate** frame — no second
  dispatch-response (see R3).
- Body side-channel: `assembleFromStructured` / `overlayBodyFields` fills
  `model.body` from `fields.body` (extend `command-payload.test.ts` or a
  new case).

---

### Phase 6 — doc graduation (at build time)

- **`command-routing.md`** — the `async` spec field, the accept-time
  detach seam in `_executeOne` (envelope-ownership move: detached run owns
  `emitDispatchResponse`), the reserved `--async`/`--sync` flags (parsed
  like `--`), and the relationship to the `dispatch`/`deferred-dispatch`
  phase-effect placeholder (v1 uses the reserved-flag/spec decision). Note
  the new `script` verb routes through `_executeOne` and the bare
  typed-script branch is the unchanged inline sibling.
- **`command-spec.md`** — the top-level `async:` field (default false),
  the reserved per-invocation flags, the **sync-is-per-giver-not-global**
  guarantee, the **deferred-output caveat** (async `emit-scene` lands
  after the prompt frees; only for out-of-order-tolerant commands — never
  `look`), and the **engagement-vs-async boundary**.
- `response-envelope.md` already anticipates a late envelope; optionally
  point its note at this feature.

Requirements + slate + this plan retire at the pre-merge sweep.

---

## Acceptance-criterion → test map

| Criterion | Where tested |
|---|---|
| schema accepts `async: boolean`; bad value fails at load; `CommandDefinition` exposes it | `CommandDefinition.schema.test.ts` (P1) |
| framework default sync (no field, no flag → blocks as today) | `CommandGiver.async.test.ts` matrix `spec:false+no flag` |
| `--async`/`--sync` on any verb (incl. option-less); flag-over-default; 4 combos | `command-reserved-async.test.ts` + `CommandGiver.async.test.ts` matrix |
| slow controller: async frees giver chain before body completes; next command runs first; sync does not | `CommandGiver.async.test.ts` observable-ordering + sync-control |
| **sync is per-giver, not global (two-giver ordering)** | `CommandGiver.async.test.ts` two-giver test (P4) |
| `script` verb: `script <body>` runs via `ScriptApi.run` through `_executeOne`, sync by default; `script --async <no-wait>` frees prompt; `make --async` likewise; `--sync` no-op | `ScriptController.test.ts` + `CommandGiver.async.test.ts` integration (P5) |
| bare typed-script line unchanged (sync, no `--async` handle) | assert untouched; regression in existing script-parser test |
| exactly one late dispatch-response keyed on `commandId`; nothing at accept-time | `CommandGiver.async.test.ts` exactly-one-envelope |
| detached throw → user-visible error envelope | `CommandGiver.async.test.ts` late-throw |
| focus/recency/input-echo fire at accept-time, in order, ahead of body | `CommandGiver.async.test.ts` ordered-bookkeeping |
| declined confirm / failed validator does not detach | `CommandGiver.async.test.ts` no-detach-on-pre-execute-failure |
| late envelope renders on client after prompt advanced | manual/verify (R1); minimal client fix only if a gap is found |
| docs updated | Phase 6 |

Determinism for all ordering tests comes from **test-owned `Deferred`
gates** the fixture controllers await — no wall-clock / fake timers.

---

## Risks / unknowns and how the build resolves them

- **R1 — Client input-gating.** Requirements assume the client does NOT
  gate input on the dispatch-response. Grep `packages/client` for gating
  keyed on `dispatch-response` / `dispatchId`; expected none. Minimal
  client fix only if a real gate is found.
- **R2 — Two script surfaces, one flaggable.** The `script` **verb**
  (Phase 5) routes through `_executeOne` and is flaggable; the **bare
  typed-script line** (`parseResult.script`, `CommandGiver.ts:684`) stays
  inline/sync/unflaggable by design (requirements non-goal). Build must
  NOT front-detach the bare branch. A line-level async prefix is a
  deferred slate surface — note in `command-routing.md`.
- **R3 — Double-fire on `script` AND `make`.** Both controllers resolve at
  `whenFirstYield`/completion (`ScriptApi.run` / `ScriptApi.invoke` →
  `startAndDetach`), carrying pre-detach notes onto the claiming ctx; the
  detached wrapper's `finally emitDispatchResponse` fires the **one**
  dispatch-response. The coroutine's later output + `whenSettled` abort
  scene (`system.script.aborted`) are **separate existing paths** — not a
  dispatch-response. Build confirms (a) `startAndDetach`'s `ctx?.note`
  lands on the same `getCurrentCommandContext()` planted on the detached
  frame (it does, via ALS), and (b) no second dispatch-response fires for
  the same `commandId`. Applies identically to `script` and `make`.
- **R4 — `script` verb wiring gaps.** Confirm: (a) correct
  `commandContributions` home so players see `script` on their recency
  stack (mirror the shell verbs' contribution site); (b) `ScriptApi.run`'s
  acting-actor derivation resolves under the detached command frame (it
  reads execution-context — the planted `commandContext` supplies the
  giver); (c) the greedy `body` arg + `overlayBodyFields` reach the
  controller for both typed and side-channel input; (d) category
  placement (`shell` vs `system`) against scripting.md conventions.
- **R5 — runRoot attribution (unchanged).** Verify `tagCurrentFrame` +
  `updateCurrentFrameMetadata` are permitted on the `runRoot` synthetic
  root and that `getCurrentCommandContext` / `getCurrentCausingCommandId`
  resolve inside the detached body; Interactive/`PromptApi` reachability
  survives (planted `interactive`).
- **R6 — HMR / durability (unchanged).** Detached run holds a
  clone-per-execution controller; `finally` destructs even on late throw
  (no leak). Server restart / HMR kills the detached run — documented
  non-goal (parity with a script coroutine). `emitDispatchResponse` rides
  the Sensor pipeline, so a disconnected Avatar no-ops on the wire while
  server-side reactions still run.

---

## Critical Files for Implementation

- packages/server/src/mud/lib/command/CommandGiver.ts
- packages/server/src/mud/obj/api/CommandLogic.ts
- packages/server/src/mud/api/command.ts
- packages/server/src/mud/lib/command/CommandDefinition.ts
- packages/server/src/mud/obj/command/shell/ScriptController.ts (new; + shell/script.yaml + seed)
