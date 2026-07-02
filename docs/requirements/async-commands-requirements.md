# Async commands — requirements

An opt-in `async` override that detaches a command's controller body
from the giver's own input chain, so a player can keep issuing commands
while a long-running command of their own runs in the background.

**The default is — and stays — sync, and sync is already the right
kind of sync.** `Backend.processUserMessage` chains each socket's
messages behind that same socket's previous one (`Backend.ts:242`), so a
command that runs inline blocks *that giver's* next command until it
finishes — but **never blocks other players**: the chain is per-socket,
and Node's event loop interleaves everyone else the moment the command
`await`s (the script engine even yields cooperatively mid-compute via
its `slice` preemption). So "wait for my own command, don't stall
anyone else" is a property the system already has. This build does not
change it.

What this build adds is the **override**: `async` makes a command detach
from the giver's own chain too (spawn its body detached at accept-time,
don't await it), freeing the giver's prompt immediately. The driver is
**scripts** — you fire a long script and keep playing rather than
holding your own prompt for its duration. A new `script` verb gives the
prompt-typed script surface a home that routes through the normal
command path, so it and `make` inherit the async mechanism identically.

Seeds from [async-commands-slate](../slates/tails/async-commands-slate.md),
a tail of [command-routing.md](../subsystems/command-routing.md).

## Goals

- The sync default is preserved unchanged, and its **per-giver /
  never-global** property is documented as a guaranteed behavior: a
  giver's sync command blocks only that giver's own next command, never
  another player's input.
- A command can declare, in its YAML spec, whether it runs **async**
  (`async: true|false`, framework default `false`).
- A player can override that default per invocation with reserved
  `--async` / `--sync` flags, recognized on **any** verb.
- An async command detaches its controller body from the giver's own
  input chain at accept-time; the giver's next command runs immediately,
  with no ordering guarantee relative to the detached body.
- A new **`script` verb** runs a directly-typed script body through the
  normal command path (`_executeOne` → `ScriptApi.runAst`), so it
  inherits the `async:` field and `--async` / `--sync` flags with no
  special-casing. `script` and `make` are **sync by default**;
  `script --async <body>` / `make --async <recipe>` detach.
- A detached command's outcome (its `Scene` + notes + status) is
  delivered through the ordinary dispatch-response envelope when the
  body completes, keyed on the original `commandId` — just late.
- A detached command that throws surfaces a user-visible error, never a
  silent log.

## Non-goals

- **Making engagement commands async.** Durative activities already
  return immediately (`SchedulerApi.start` is synchronous, registering
  game-clock timers — `SchedulerLogic.ts:166`). `async` is a no-op for
  them; not wired. Engagement stays the tool for in-world durative work
  with slots / preemption / abort
  ([activity.md](../subsystems/activity.md)).
- **Cancellation of a detached command.** Scripts keep their own abort
  path (`ScriptAbortReason`, `co.whenSettled`). A generic "cancel my
  running async command" verb is out of scope; commands needing
  abort semantics use engagement.
- **A per-actor async concurrency cap.** v1 lets detached commands
  stack freely. A ceiling is a deferred knob (slate open surface).
- **Durability across restart.** A detached command dies on server
  restart / HMR, exactly like a running script coroutine today.
- **True parallelism.** Node stays single-threaded; async is about not
  *awaiting*, not multi-core execution.
- **An accept-time acknowledgement frame.** No "…running in background"
  ack; the prompt simply frees. The input echo already confirms
  receipt. A `command-accepted` note kind is deferred.
- **New client behavior beyond correct late-envelope rendering.** The
  client already renders envelopes as they arrive and does not gate
  input on the dispatch-response; the build only confirms a late
  envelope renders correctly.
- **An override on the bare typed-script line.** A multi-statement line
  typed with no verb prefix (`look; say hi`) keeps today's behavior:
  sync, handled inline at `CommandGiver.ts:684`, no `--async` handle.
  It's the quick sync shortcut; the `script` verb is the flaggable
  form. A line-level async prefix is out of scope (slate open surface).
- **Changing sync's per-giver blocking.** The build does not remove the
  per-giver queue or make sync commands non-blocking for their own
  giver; it only adds the async detach as an override. (Nor does it try
  to make a genuinely CPU-bound *synchronous* step non-global — that's a
  Node fundamental unchanged by this feature; the script engine already
  yields via `slice`.)

## Surface decisions

### D1. What "async" changes — front-detach

Async moves the detach point to accept-time: after parse, validate,
focus-update, and confirm-prompt (all synchronous and ordered), the
`dispatch` phase — the controller's `execute()` body — is spawned
detached under `ExecutionContextApi.runRoot` (preserving
`causingCommandId`, the `ScheduleApi` pattern), and `_executeOne`
(`CommandGiver.ts:1042`) does **not** await it, so the giver's own chain
link resolves immediately. This is distinct from the scripting
coroutine's existing detach, which happens at the *first internal
suspension* (`whenFirstYield`, `ScriptLogic.ts:201`); async detaches at
the front regardless of whether the body ever suspends.

Sync is unchanged: `_executeOne` awaits the controller as today, and
the giver's chain holds until it completes — but only *that giver's*
chain, never the thread (per-socket queue + event-loop interleaving +
the engine's cooperative `slice` yield). Async is strictly additive.

### D2. Opt shape — spec `async:` field + reserved `--async` / `--sync`

A top-level `async: boolean` field on the command spec (default
`false`) sets the verb default. `--async` and `--sync` are **reserved
framework flags** recognized ahead of per-command option binding (the
`--` stop-options precedent, not a per-command option), so they work on
any verb without the verb declaring anything. Effective decision =
flag over spec default. The explicit negative flag is `--sync`, not
`--async=false`.

### D3. Scripts sync by default; the new `script` verb

Scripts default to **sync** — you wait for your own script to finish
before your next command runs, but other players are never blocked
(D1). Async is the opt-in override (`--async`), not the default. This
reverses an earlier lean once it was clear sync is already per-giver,
not global.

A new **`script` verb** gives the prompt-typed script surface a home
that routes through the normal command path: its controller takes the
script body (via the `{text, fields}` body side-channel / its raw
remainder), parses it to an AST, and runs it via `ScriptApi.runAst` —
going through `_executeOne`. Because it's an ordinary command, it
inherits the `async:` field and the `--async` / `--sync` flags with no
special-casing, exactly like `make`. Both `script` and `make` ship
**without** `async: true` (sync default); `script --async <body>` and
`make --async <recipe>` detach.

The framework field default stays `false`, so all verbs — scripts
included — are sync unless a spec opts in or a player passes `--async`.

The **bare typed-script line** (a multi-statement line with no `script`
prefix, handled inline at `CommandGiver.ts:684`) is unchanged: sync,
no `--async` handle. It stays the quick shortcut; the `script` verb is
the flaggable form.

### D4. Envelope ownership — one late envelope, no accept-time frame

For a sync command, `executeCommand` assembles the dispatch-response
after awaiting the controller (`CommandGiver.ts:745`). For an async
command the controller body is detached, so the **detached run** owns
assembling and firing the single dispatch-response envelope (accumulated
notes + final status) when the controller body completes — and
`executeCommand` fires **nothing** at accept-time. Exactly one
dispatch-response per command, keyed on `commandId`, delivered late.

For scripts specifically, the controller body completes at
`whenFirstYield` (the same content a sync script's envelope carries
today — "what happened up to the first pause"), just fired off-chain;
the coroutine's later output and its eventual settle/abort notification
remain separate existing paths (no double-fire of the dispatch-response).

### D5. Error surface

A detached controller body that throws is caught by the detach wrapper
and surfaced as a user-visible error / dispatch-response envelope keyed
on `commandId`, reusing the script-abort notification path
(`co.whenSettled`, `ScriptLogic.ts:210` precedent). Never a silent
`console.error`-only.

### D6. Ordered bookkeeping stays synchronous

Only the controller body and its outcome envelope defer. Everything
accept-time and order-sensitive stays synchronous and in arrival order:
parse, validate (`preloadValidatorDeps` / `runValidators`),
focus-update, confirm-prompt, per-giver recency-stack push, and the
input echo (`CommandDispatchedEvent` — the participation/producer tap).
Detach happens **only after** validation passes and any confirm-prompt
resolves; a rejected validator or a declined confirm never detaches.

## Constraints

- **Reserved-flag collision.** `--async` / `--sync` become reserved
  tokens. The build must confirm no existing command declares an
  `async` or `sync` option (grep the YAML surface); if one does, it is
  reconciled before these become framework-reserved.
- **Attribution.** The detached body must run under `runRoot` with
  `causingCommandId` propagated, so composed frames keep a well-defined
  Root and correct attribution (per the CLAUDE.md
  `ScheduleApi.recurring` / bare-timer rule — no raw detached promise
  that skips the execution-context layer).
- **Interactive still reachable from a detached body.** A detached
  command may still drive `PromptApi` against the player's Interactive
  (scripting already relies on this); async must not sever that.
- **`barId` / input-mode.** Detach occurs after mode-prepend + parse, so
  the detached run carries the resolved (post-prepend) command text;
  input-mode semantics are unchanged (`command.ts:52`).
- **Schema.** The `async` field is added to `command.schema.json` and
  `CommandDefinition` (`CommandDefinition.ts:63`); an unknown/malformed
  value fails validation at load (boot), not at first dispatch.
- **No new module category / no free-floating helpers.** The async
  wiring lands in the existing command machinery (`CommandGiverMixin`,
  `CommandApi`, the phase/`deferred-dispatch` replace-handler at
  `api/command.ts:553`). The new `script` verb is an ordinary
  command (a YAML view in `mud/cmd/` + a controller in
  `obj/command/`, the sanctioned Command categories) — not a new file
  category. Its controller reuses `ScriptApi.runAst`; it introduces no
  new script runtime.
- **Concurrency is the author's claim.** `async: true` asserts the
  command is interleave-safe (read-mostly or self-contained). The
  interleave model already exists and is load-bearing (a detached
  script coroutine already dispatches as the actor while the player
  types); async extends it to the command front, introducing no new
  hazard for the script case. Commands needing exclusive actor access
  use engagement, not `async`.
- **Deferred output caveat is documented.** An async command's
  `emit-scene` lands after the prompt is back, so async is only for
  commands where out-of-order output is acceptable — documented in
  `command-spec.md`.

## Acceptance criteria

- `command.schema.json` accepts a top-level `async: boolean`; a bad
  value fails schema validation at load. `CommandDefinition` exposes it.
- The framework default is sync: a command with no `async:` field and no
  flag blocks the input chain exactly as today.
- `--async` and `--sync` are recognized on any verb (including verbs
  that declare no options) and correctly override the spec default; the
  effective decision is flag-over-default. A test covers each of the
  four (spec default × flag) combinations.
- With a controlled slow controller, an async invocation returns the
  giver's chain link before the controller body completes, and a
  command typed immediately after runs before the async body finishes
  (observable ordering test) — while a sync invocation of the same
  command does not.
- **Sync is per-giver, not global:** with a controlled slow *sync*
  command on giver A's chain, a command on giver B's chain still
  executes before A's completes (two-giver ordering test) — demonstrating
  sync blocks only the originating giver.
- A `script` verb exists: `script <body>` parses and runs the body via
  `ScriptApi.runAst` through `_executeOne`, sync by default (blocks the
  giver's own chain until the script's controller body resolves).
  `script --async <no-wait compute script>` frees the giver's prompt
  immediately; `make --async <recipe>` likewise. `--sync` on either is a
  no-op confirming the default.
- The bare typed-script line (`CommandGiver.ts:684`, no `script` prefix)
  remains sync with no `--async` handle — unchanged behavior.
- An async command delivers exactly one dispatch-response envelope,
  keyed on its `commandId`, carrying the body's notes + final status,
  fired after the body completes; nothing is fired at accept-time.
- A detached controller body that throws surfaces a user-visible error
  envelope (keyed on `commandId`), not a silent log.
- Focus-update, recency push, and the input echo
  (`CommandDispatchedEvent`) fire at accept-time for an async command,
  in arrival order, ahead of the detached body — covered by a test.
- A declined confirm-prompt / failed validator on an async command does
  not detach (no envelope from a phantom body).
- A late dispatch-response/error envelope renders correctly on the
  client after the prompt has advanced (verified; minimal client fix
  only if a gap is found).
- `command-routing.md` / `command-spec.md` document the `async` field,
  the reserved flags, the deferred-output caveat, and the
  engagement-vs-async boundary.

## Cross-references

- Seeding slate:
  [async-commands-slate](../slates/tails/async-commands-slate.md)
- [command-routing.md](../subsystems/command-routing.md) — dispatch
  chain, phase-effects, the reserved `deferred-dispatch` handler
- [command-spec.md](../subsystems/command-spec.md) — the YAML spec the
  `async` field joins
- [response-envelope.md](../subsystems/response-envelope.md) — the
  dispatch-response envelope an async command fires late
- [scripting.md](../subsystems/scripting.md) — the driver; the coroutine
  engine's existing suspension-detach
- [activity.md](../subsystems/activity.md) — engagement, the sibling
  mechanism explicitly not unified with async
