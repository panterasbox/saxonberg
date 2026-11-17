# Async commands (working slate)

> **Status: PARTIAL** — the core shipped with MR !122 and is fully
> documented at
> [command-routing.md § Async dispatch](../../subsystems/command-routing.md#async-dispatch--detaching-the-controller-body):
> the `async:` spec field, framework-universal `--async`/`--sync`, the
> accept-time detach in `_executeOne`, and the `script` verb. Sync stays
> the default and is per-giver, never global. Every design question this
> slate raised (seam, opt shape, sync-by-default, concurrency guardrail,
> deferred-output semantics, and Q1–Q4) is answered by the shipped code
> and stated in that doc section — verified against
> `packages/server/src/mud/lib/command/CommandGiver.ts` and
> `packages/server/src/mud/api/command.ts` for this pass.
> The line-level prefix shipped at controllers-are-io (D23, MR !527): a
> leading `--async` on a bare multi-statement line detaches the run the
> way `_executeOne` detaches a controller body, `--sync` strips →
> [scripting.md § Scripts fail CLOSED](../../subsystems/scripting.md).
> **Left:** a per-actor async concurrency cap · a generic
> cancel-my-running-async-command verb (engagement owns cancel today)
> **Size:** a tail

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

## Remaining design

- *The line-level `--async`/`--sync` prefix on the bare script line
  shipped (controllers-are-io D23) → scripting.md § Scripts fail CLOSED,
  `CommandGiver.ts` at the `parseResult.script` branch. Cut 2026-11-07.*
- A per-actor async concurrency cap (see *What this slate does NOT
  cover*, below).
- A generic cancel-my-running-async-command verb (see *What this slate
  does NOT cover*, below) — engagement owns cancel today.

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

## Open questions — all resolved by the shipped code

- **Q1 (detached-command error surface):** resolved. A late throw
  surfaces a user-visible `controller-error` envelope, never a silent
  log — see
  [command-routing.md § Async dispatch](../../subsystems/command-routing.md#async-dispatch--detaching-the-controller-body).
- **Q2 (`--async` on a trivially-fast command):** resolved as leaned —
  allowed, no rejection/allowlist exists; the flags are unconditional.
- **Q3 (universal flags vs. opt-in surface):** resolved as leaned (a) —
  `--async`/`--sync` are framework-universal, stripped during assemble
  ahead of per-command option binding (same doc section).
- **Q4 (interaction with `barId` input-mode prepend):** resolved as
  leaned — detach happens after prepend, alias, and parse; everything
  order-sensitive stays synchronous (same doc section).
