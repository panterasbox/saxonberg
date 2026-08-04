# Async commands (working slate)

> **Status:** **shipped** (MR !122) →
> [command-routing.md § Async dispatch](../../subsystems/command-routing.md)
> + [command-spec.md](../../subsystems/command-spec.md). The `async:`
> spec field + reserved `--async`/`--sync` flags + the accept-time
> detach seam in `_executeOne` + the new `script` verb all landed; sync
> is the default and is per-giver/never-global. This tail is retained
> for the **deferred surface**: a line-level `--async`/`--sync` prefix so
> a *bare* typed multi-statement script (no `script` verb) can be
> detached; a per-actor async concurrency cap; and a generic
> cancel-my-running-async-command verb (engagement owns cancel today).

See also:

- [docs/subsystems/command-routing.md](../../subsystems/command-routing.md)
  — the dispatch chain, phase-effects, `CommandGiverMixin.executeCommand`.
- [docs/subsystems/command-spec.md](../../subsystems/command-spec.md)
  — the YAML shape a verb is authored in (where `async:` lands).
- [docs/subsystems/response-envelope.md](../../subsystems/response-envelope.md)
  — the dispatch-response envelope an async command fires *late*.
- [docs/subsystems/scripting.md](../../subsystems/scripting.md) — the
  driver; the coroutine engine that already detaches at its first
  suspension point.
- [docs/subsystems/activity.md](../../subsystems/activity.md) — the
  engagement framework, a **sibling** mechanism (already non-blocking);
  explicitly *not* unified with this.

---

## Principle

Some commands do enough work that awaiting them to completion holds up
everything the player types next. Async makes "don't block me on this
one" a declarative property of a command, opt-in per invocation.

The feature is small because the machinery it needs mostly exists. What
it settles is a **seam** (where a command detaches) and a **surface**
(how an author/player turns it on).

---

## The fact that frames the feature

The dispatch pipeline is *already* `async`/`await` end to end —
controllers can already return a `Promise`. So async-in-the-JS-sense
buys nothing. The thing that makes "async commands" real is one level
up: **`Backend.processUserMessage` serializes every message from a
socket behind a per-socket promise chain** (`Backend.ts:242`,
the ordered lane of `ConnectionApi.sequenceInbound`, once
`Backend.inboundChainBySocketId`). Each message awaits the previous message's
`executeCommand` before the next runs. So a slow command queues
everything typed behind it until it finishes.

**But most long things already detach.** Two existing mechanisms return
promptly and self-drive on the game clock:

- **Engagements** (`SchedulerApi.start`, `SchedulerLogic.ts:166`) start
  *synchronously*, register game-clock timers, and return. A well-behaved
  durative controller emits an `engagement-started` note and returns
  immediately; completion fires later, out of band. **Already
  non-blocking** — `async` is a no-op for them.
- **Scripts** detach at their **first suspension point**. `startAndDetach`
  (`ScriptLogic.ts:201`) awaits only `co.whenFirstYield()`, which resolves
  the instant the coroutine hits a `wait` / `every` / `when` or an engaged
  step (`Coroutine.ts:179,194`). A script that pauses frees the prompt
  right away.

**What still blocks the chain** is the narrow leftover: a controller
that runs to completion **inline with no pause** —

- a compute-heavy script with no `wait` (an `each` over 10k items grinds
  to the end before `whenFirstYield` resolves — the `slice` preemption
  effect yields to the event loop but does **not** detach the coroutine),
  or
- a command doing real Node I/O (DB aggregation, HTTP, an LLM /
  image-gen call) that `executeCommand` awaits.

---

## What async means, precisely

> **Async moves the detach point to the *front* — accept-time, right
> after parse + validate — instead of "at the first internal
> suspension."** An async command spawns its controller body detached
> under a fresh `ExecutionContextApi.runRoot` (preserving
> `causingCommandId`, the pattern `ScheduleApi` already uses), and frees
> the per-socket chain immediately, whether or not the body ever pauses.

Parse, validate, focus-update, and confirm-prompt stay **synchronous and
ordered** — errors and prompts must not reorder. Only the `dispatch`
phase (the controller's `execute()` body) detaches. The dispatch-response
envelope fires when the work truly completes, out of band, keyed on the
same `commandId`.

For the driver: a long script is the case where you'd rather not hold
*your own* prompt for the run's duration. Default stays sync (per-giver,
never global); `script --async <body>` / `make --async <recipe>` detach
so you keep playing while it runs.

---

## The seam is already reserved

The phase model already anticipated this. Two pieces are pre-wired:

- **Options already support `type: boolean`** (`api/command.ts:921`),
  parsed as `--flag` tokens and bound onto the controller model by name.
  So the flag surface is free.
- The phase model has a **`dispatch` phase** and a reserved
  **`deferred-dispatch` replace-handler** (`api/command.ts:553–671`);
  `IMPLEMENTED_REPLACE_HANDLERS` is currently empty. This was left as the
  placeholder for exactly this feature.

Implementation shape: at `CommandGiverMixin._executeOne` (`CommandGiver.ts:1042`),
when the resolved command is async, spawn the `controller.execute(...)`
call detached under `runRoot` and let the chain link resolve, instead of
`await`-ing it (line 1064). Wrap the detached run so a late throw still
routes to the same error/envelope path a settled script abort already
uses (`co.whenSettled` precedent, `ScriptLogic.ts:210`).

---

## Decisions (locked)

1. **Sync by default, opt-in.** The `async` spec field defaults to
   `false`. Nothing changes behavior silently. A command runs async only
   when its spec sets `async: true` **or** the player passes `--async`.

2. **Opt shape: spec `async:` field + `--async` / `--sync` override.**
   A top-level `async: true|false` in the command YAML sets the verb
   default; the `--async` and `--sync` flags override per invocation
   (explicit negative flag, not `--async=false`).

   ```yaml
   # command.yaml
   verbs: [script]
   # no async: field → framework default false (sync)

   # player
   script foo          # sync (blocks only your own next command)
   script --async foo  # detach; keep playing while it runs
   make --async <rec>  # same flag on the make verb
   ```

   A slow-I/O verb whose author wants it async-by-default sets
   `async: true` in its own spec; players still override with `--sync`.

3. **Scripts are sync by default; async is the override.** Sync is
   already per-giver (blocks only your own next command) and never
   global — the per-socket chain plus event-loop interleaving plus the
   engine's cooperative `slice` yield see to that — so "wait for my own
   script" is a good default, not a stall on the room. `script` / `make`
   ship **without** `async: true`; the override is `--async`. A new
   **`script` verb** routes prompt-typed scripts through `_executeOne`
   (its controller parses the body and calls `ScriptApi.runAst`), so it
   inherits the `async:` field + `--async`/`--sync` flags exactly like
   `make` — no special-casing. The bare typed-script line
   (`CommandGiver.ts:684`) stays the quick sync shortcut, no flag handle.

4. **Engagement is untouched — no unification.** Engaged actions already
   return immediately (`SchedulerApi.start` is synchronous), so `async`
   is a no-op for them and needs no special handling. The two are
   siblings ("return early, self-drive"): async lives at the dispatch
   boundary; engagement lives in-world with slots / preemption / abort.

---

## Concurrency — the hazard, and why it's already tolerated

Once a controller detaches, **two commands from the same player can be
in-flight at once** (a slow async one + a fast one typed after). That
crosses the implicit "one command at a time per actor" line a lot of
controller code leans on — the focus stack, engagement slots, actor-state
mutation.

**This concurrency model already exists and is load-bearing.** A detached
script coroutine *already* dispatches commands "as" the actor while the
player keeps typing — that interleave is live today. Async extends an
already-tolerated pattern to the front of the command; it does not invent
a new hazard for the script case.

The guardrail stays the author's: `async: true` is a claim that a
command is interleave-safe (read-mostly, or self-contained side effects).
A command that needs exclusive actor access should use the engagement
framework (slots), not `async`.

---

## Output semantics — deferred scene

An async command's `emit-scene` phase (its `Scene` + notes + status)
lands **after** the prompt is already back. So async is only for commands
where deferred, out-of-order output is acceptable — a script's own
output already arrives this way. A command whose value *is* an immediate
in-place response (`look`) should not be async. Author's call; document
it in `command-spec.md` when this lands.

---

## What this slate does NOT cover

- **Cancellation of a detached command.** Scripts already have their own
  abort path (`ScriptAbortReason`, `co.whenSettled`); a generic
  "cancel my running async command" verb is out of scope for v1. If a
  command needs cancel/abort semantics, that's the engagement framework.
- **Cross-actor / true parallelism.** Node stays single-threaded; async
  is about not *awaiting*, not about running two things on two cores.
- **A per-player async concurrency cap.** v1 lets async commands stack
  freely. A ceiling ("at most N detached commands per actor") is a
  deferred knob if abuse shows up.
- **Making engagement commands async.** No-op by construction; skipped.
- **Progress / "…working" acks.** v1 is silent at accept-time (the prompt
  simply frees). A `command-accepted` note kind is a possible later
  nicety, not v1.

---

## Open questions

### Q1. Detached-command error surface

A detached command that throws late fires its error envelope out of band,
keyed on the original `commandId`. Confirm the client renders a late
dispatch-response / error envelope sanely when the prompt has already
moved on. *Lean: reuse the script-abort notification path verbatim.*

### Q2. `--async` on a command with no meaningful async body

Passing `--async` to a trivially-fast command is harmless (it detaches,
completes almost immediately). Do we bother rejecting it, or let it be a
no-op-ish pass-through? *Lean: allow it — the flag is universal, the cost
is nil, and rejecting it means a per-command allowlist.*

### Q3. Does `async` belong to *every* command's option surface, or only
commands that declare it?

Two sub-options: (a) `--async`/`--sync` are **framework-universal** flags
recognized on any verb (like `--`), or (b) they only bind on commands
whose spec opts into the async surface. *Lean (a): universal.* It's the
whole point that a player can say "don't block me on this" for any
long-ish command, and the spec `async:` field only sets the *default*.

### Q4. Interaction with per-bar input modes / `barId`

`executeCommand` already threads `barId` for the input-mode prepend
(`command.ts:52`). A detached command shouldn't change mode-prepend
semantics, but confirm the detached `runRoot` still carries the resolved
command text (post-prepend), not the raw line. *Lean: detach happens
after prepend + parse, so this is free.*

---

## Toward requirements

Small enough that requirements and plan may fold together. The concrete
work:

- Add `async` (boolean, default false) to `command.schema.json` +
  `CommandDefinition` (`CommandDefinition.ts:63`).
- Recognize `--async` / `--sync` as framework-universal flags (Q3),
  resolving to an effective per-invocation async decision (flag over
  spec default).
- Wire the `deferred-dispatch` replace-handler on the `dispatch` phase:
  at `_executeOne`, spawn `controller.execute` detached under `runRoot`
  instead of awaiting it; route late throws to the existing error path.
- Add the `script` verb (YAML view + controller reusing
  `ScriptApi.runAst`, routed through `_executeOne`); keep it and `make`
  sync by default; confirm `script --async foo` detaches and plain
  `script foo` blocks only the giver's own chain (not other players').
- Doc the deferred-output caveat in `command-spec.md`.
