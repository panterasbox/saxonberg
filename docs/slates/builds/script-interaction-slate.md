# Script interaction slate — what happens when a script meets a prompt

**Captured 2026-08-04**, out of the wiki build's inbound-sequencing
fix. The deadlock that started it is fixed and shipped
([wiki.md](../../subsystems/wiki.md), `ConnectionApi.sequenceInbound`);
this slate is the *other* half of the same question, which that fix
does not touch and should not.

Rides [scripting.md](../../subsystems/scripting.md) (the interpreter,
the game-time `Coroutine`), [prompt.md](../../subsystems/prompt.md)
(the five prompt kinds), and
[command-routing.md](../../subsystems/command-routing.md) (the dispatch
chain and `--async`/`--sync`).

---

## The finding

A player's command can stop and ask a question. A script's command
cannot — and today it does not *fail*, it **quietly takes a different
branch**.

A script dispatches through `CommandGiver._dispatchBound`, which builds
its `CommandContext` **without an `interactive`**
(`lib/command/CommandGiver.ts`, the bound-tail `createCommandContext`).
Controllers are written to tolerate that — the shape is

```ts
if (context.interactive) {
  return await PromptApi.compose(context.interactive, label, opts);
}
return current === undefined ? '' : null;   // the no-interactive branch
```

so a script never reaches `PromptApi` at all. There is no hang, no
error, and no log. The command completes and reports success.

**The concrete case that found it:** `wiki create foo` from a script,
with no `--body`, takes `resolveBody`'s fallback and **creates an empty
article**. The script says it worked.

That is worse than hanging. A hang is visible in one run; this is a
wrong result that looks like a right one, at whatever scale the script
runs.

> ⚠ The failure is **per-controller**, which is the real problem. Every
> prompting controller wrote its own fallback, and each one is a
> separate silent decision nobody reviewed together: empty string here,
> `null` there, a default elsewhere. There is no policy — there are
> twenty accidents.

## Why the inbound fix does not address it

Worth stating so the two are not conflated later. The shipped fix is
about a **socket's** message lanes: a prompt reply must not queue behind
the command awaiting it. A script has no socket and no reply — its
dispatch never enters a lane. Different failure, different layer.

The two do share a premise, and it is the useful one:

> **An interrupt is what a prompt is.** Anything that needs to
> interrupt should go through `PromptApi` — which is exactly why "a
> caller with nobody to ask" needs an answer rather than a fallback.

## The interaction with `--async` / `--sync`

Recorded because it is non-obvious and cost an afternoon.

The async detach happens at `_executeOne`, **after** everything
accept-time. So a prompt raised in a controller *body* under
`async: true` was never in the socket's lane and always worked, while a
prompt raised at **accept time** (the `confirm-prompt` phase, MQL
disambiguation) sat inside the lane and deadlocked **regardless of
mode**.

**`--async` was therefore an accidental workaround for half the bug.**
If a verb in the tree carries `async: true` with a comment about
prompts hanging, that flag is cargo-culted around a bug that no longer
exists and should be re-examined on its own merits.

---

## Three ways out, cheapest first

### 1. Fail closed — one guard, every controller inherits it

`PromptApi` refuses when there is no `interactive`, with a named
rejection instead of a fallback. The controller stops writing
`if (context.interactive)` and just asks; the substrate decides what a
question with no listener means.

The refusal has to **name the missing input** — "`wiki create` needs
`--body` when run from a script" — or it just relocates the mystery.

Cheapest, and it converts every silent wrong result into a loud one.
It is also a **breaking change for scripts that currently "work"**,
which is the point, and needs a sweep of the existing fallbacks rather
than a flag day.

### 2. Let the script answer up front

Follows from (1): a script passes what a prompt would have asked for
(`wiki create foo --body "…"`, already supported), and the (1) refusal
tells the author exactly which option they omitted.

This makes scripts **declarative about their inputs**, which is a
property worth having for its own sake — a script whose behaviour
depends on an interactive answer is not reproducible.

Open question: some prompts have no option equivalent (an MQL
disambiguation among live objects). Either those commands are simply
not scriptable, or the script language grows a way to pre-resolve the
choice (`with <selector>`), which is a real language change.

### 3. A script-side prompt queue — probably not

The script suspends on its coroutine; the owner is asked next time they
are online; the run resumes on the answer.

The coroutine substrate already detaches and resumes across game-clock
frames, so the mechanism *exists*. But a script that pauses for a
human is no longer a script — it is a workflow, with a lifetime, an
owner who may never return, and a resume path that has to survive a
reboot. Large, and the payoff is thin next to (2).

**Recommendation: (1) + (2).** (3) only if a real content need appears.

---

## The adjacent question this exposes

NPCs dispatch through the same bound tail. An NPC brain that ran a
prompting command hits the identical branch — and unlike a script,
there is no author present to be told they omitted an option.

Whatever (1) does must be phrased so an NPC's refusal is a
**diagnostic** (the `DiagnosticApi` channel, attributed to the content
author) rather than a message to a player standing nearby. Worth
settling in the same pass; it is the same guard with a different
audience.

---

## Not in scope

- **The inbound lanes.** Shipped, tested, and about sockets.
- **Making `PromptApi` work without an Interactive.** A prompt is a
  question to a person; the fix is refusing to ask, not inventing a
  listener.
- **Auditing every controller's fallback.** That is the sweep (1)
  implies, and it should be one commit per subsystem with the
  behaviour change stated, not a silent global.
