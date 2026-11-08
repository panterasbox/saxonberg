# Script interaction slate — what happens when a script meets a prompt

> **Status: PARTIAL** — the inbound-sequencing half is fixed and shipped
> (`ConnectionApi.sequenceInbound`). The fail-closed guard shipped at
> controllers-are-io (D23, MR !527): `CommandContext.requireInteractive(what)`
> notes `command-rejected { reason: 'needs-input' }` naming the missing
> input, every prompt seam asks it (the cardinality policy,
> `promptForObject`, the confirm/compose callers — 20 files swept), and an
> NPC's refusal goes to `DiagnosticApi` →
> [scripting.md § Scripts fail CLOSED](../../subsystems/scripting.md),
> [command-routing.md § Cardinality policy](../../subsystems/command-routing.md).
> **Left:** pre-resolving an MQL disambiguation from a script (the open
> question under *2.* below — ⚠ `verb@source` + MQL's `:[n]` may already
> answer it) · the residue of `context.interactive` reads that still
> choose a branch rather than refuse (`BuyController`'s `ask: null`,
> `PackSyncController`'s unstaffed install, `ReactController`) — decided
> non-prompts, or fallbacks the sweep missed
> **Size:** a tail

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

*Shipped and documented → scripting.md § Scripts fail CLOSED: a script's
prompting command is refused `needs-input` naming the input (`wiki
create` from a script with no `--body` is refused, never an empty
article — `WikiControllerBase.resolveBody`). Cut 2026-11-07.*

## Why the inbound fix does not address it

*Two layers, both shipped: the socket lanes → connection.md § Two inbound
lanes per socket; the no-listener refusal → scripting.md § Scripts fail
CLOSED. Cut 2026-11-07.*

## The interaction with `--async` / `--sync`

SHIPPED · DOCUMENTED — `connection.md` § *Two inbound lanes per socket* carries the
finding (the detach at `_executeOne` is after accept-time; `--async` was
an accidental workaround for half the bug; re-examine any `async: true`
that cites hanging prompts).

---

## Three ways out, cheapest first

### 1. Fail closed — one guard, every controller inherits it

*Shipped as `CommandContext.requireInteractive(what)` (controllers-are-io
D23) → scripting.md § Scripts fail CLOSED; the sweep of the twenty
fallbacks landed with it. Cut 2026-11-07.*

### 2. Let the script answer up front

*The first half shipped with (1): the refusal's `detail` names the option
the script omitted (`'<verb> needs a body (--body) when run from a
script'`). Cut 2026-11-07. The open question stands:*

Open question: some prompts have no option equivalent (an MQL
disambiguation among live objects). Either those commands are simply
not scriptable, or the script language grows a way to pre-resolve the
choice (`with <selector>`), which is a real language change.

### 3. A script-side prompt queue — probably not

*Declined with (1); the why graduated to scripting.md § Scripts fail
CLOSED. Cut 2026-11-07.*

---

## The adjacent question this exposes

*Shipped: an NPC's `needs-input` is recorded to `DiagnosticApi` against
the controller (`CommandGiver.emitDispatchResponse`) → scripting.md §
Scripts fail CLOSED. Cut 2026-11-07.*

---

## Not in scope

- **The inbound lanes.** Shipped, tested, and about sockets.
- **Making `PromptApi` work without an Interactive.** A prompt is a
  question to a person; the fix is refusing to ask, not inventing a
  listener.
- **Auditing every controller's fallback.** That is the sweep (1)
  implies, and it should be one commit per subsystem with the
  behaviour change stated, not a silent global.
