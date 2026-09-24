# Live drive slate — the agent as a player, and the build's exit criterion as the show

> **Status: UNBUILT** — no agent session, no bridge, nothing of this
> ships. Every piece it *composes* does:
> [hot-reload.md](../../subsystems/hot-reload.md) (`reload`),
> [shell-workspace.md](../../subsystems/shell-workspace.md) (the source
> tree + the whole I/O verb suite),
> [git-workflow.md](../../subsystems/git-workflow.md),
> [chat.md](../../subsystems/chat.md) (the channel + its prose composer),
> [prompt.md](../../subsystems/prompt.md) (`confirm`),
> [diagnostics.md](../../subsystems/diagnostics.md), and `packages/wire`
> (a programmatic client that logs in over the raw socket).
> **Left:** the sidecar that holds the agent session · the channel bridge
> (prompts in, replies out) · the agent's own character + how it logs in ·
> the approval posture for a live audience · the streaming run
> configuration (no-watch + test-auth is a combination no script ships) ·
> what the audience may say back · open questions 1–5
> **Size:** a build

**Captured 2026-09-23**, out of the streamer-registry conversation
([streamer-registry-slate](./streamer-registry-slate.md)). The founder
wants to livestream building Saxonberg **with the Saxonberg client as
the whole frame**, not a VS Code window — while still building with
Claude Code, and without giving up parallel tmux off-camera.

Related: [streaming.md](../../subsystems/streaming.md) /
[livestream.md](../../subsystems/livestream.md) (the broadcast half),
[workflow.md](../../workflow.md) (⭐ the drive — *this slate's whole
argument*), [cockpit.md](../../subsystems/cockpit.md) (the `build` mode
this lands in), [behavior.md](../../subsystems/behavior.md) (⚠ **NOT**
this — a brain is an NPC strategy module, not an agent session),
[access.md](../../subsystems/access.md) (the code-trust axis this rides
and must not widen).

## ⭐⭐ The argument, in one sentence

**The build phase already ends by driving the running game to prove the
work — the slate is to make the agent do that drive *as a logged-in
player*, so the audience watches the world change instead of watching a
terminal.**

## Why this is assembly rather than invention

The first framing of this problem was *render the agent's output in the
client* — a feed of tool calls as cards. That framing is wrong and
expensive: nobody reads a tool-call firehose, and making one legible is
open-ended design work.

⭐ **Invert it. The agent is a participant, not a feed.** If the agent is
logged in and issuing real commands — `reload`, `test:near`, walking to
the room it just changed, running the verb it just wrote — then **the
client renders all of it already**, because it is just commands on the
wire. No card kinds to invent, no summarization, no new renderer.

And the conversation half rides a **channel**
([chat.md](../../subsystems/chat.md)): you type in it, the agent answers
in it. That surface already has membership, persistence, history,
rendering, and — the piece that matters — **a composer that accepts
prose**, which the command line never could (a prompt is multi-line
text with pasted code; `msh` would try to parse it).

> **Two problems that looked hard both dissolve: the composer already
> exists because chat needed one, and there is nothing to render because
> the world is the render.**

⚠ **Not `dm` / `tell`.** Those are implant/aether and therefore
diegetic. This is interface tier — a feature that serves a real-world
audience is never gated by the fiction. A channel is the honest home.

⚠ **Not a brain, and not an NPC.** `BehavedMixin` + `lib/behavior/`
is a strategy module resolved per invocation. An agent session is a
long-lived external process holding a conversation. Borrowing the brain
vocabulary here would put a `child_process` consumer inside the mudlib
and make an operator capability look like content.

## The shape

Three processes, and the split is the security model:

| piece | where | role |
|---|---|---|
| the agent session | **a sidecar**, a separate process (the `pbox-stream` shape) | owns the Claude Code session; nothing else may |
| the bridge | the sidecar, over the wire protocol | logs in as its own character; reads the channel for prompts, posts replies, issues commands |
| the world | the game server, unchanged | renders it like any other player |

⭐ **The game server gains nothing that spawns a process.** Keeping
`child_process` out of the mudlib entirely is the point of the sidecar,
and it means *not in production* is enforced by **not running a
process** rather than by a permission check somebody has to get right.
It also means an agent crash cannot take the world down.

## ⚠⚠ The trust boundary

The agent's character needs code-trust (`reload`, source writes). That
is **not a new axis** — it is the existing `AccessApi.isWizard` grant
applied to a character, and this slate must not invent a second one.

But the consequence is sharp and must be stated where a planner sees it:

> **Anyone who can post to the channel can prompt something that is root
> on the box.**

So **the gate is channel membership** — a surface that already has
membership, which is a far better place to land than a new permission
tier. Operator-only, on a dev deployment, and the slate does not
contemplate this ever being a capability a player holds.

⚠ **Chat is visible.** A viewer logged into the world may be able to
read the channel. That is probably *good* — it is the show — but the
channel's `anonymity` and membership settings become load-bearing for
what an audience can see and say. **Whether the audience may talk *to*
the agent is open question 4, and it is a moderation question before it
is a technical one.**

## ⭐ Why this is the demo, and not just a convenience

The thing a VS Code stream structurally cannot show:

> **Claude edits a file, drives `reload`, and the world changes while
> you are standing in it.**

That is the product — an editable live world in the LP-MUD tradition,
which [hot-reload.md](../../subsystems/hot-reload.md) opens by naming as
the expectation. Every build already ends with a drive against the
running game. **The drive is the show; it has simply been happening over
a socket with assertions and nobody watching.**

Two people in one world, one of them building it, is also the clearest
possible statement of what the platform is.

## ⚠ The run configuration is a third combination that does not exist

This will bite on air, so it is called out here rather than discovered
live. The two shipped server scripts each have half of what streaming
needs:

| script | watch | test-auth |
|---|---|---|
| `dev` | ✅ `tsx watch` — **restarts on every source edit, dropping every connection mid-stream** | ✅ `AUTH_MODE=test` |
| `start` | ❌ plain `tsx` (what streaming wants) | ❌ no bypass — the agent cannot log in |

⭐ A streaming run wants **no-watch plus the test-auth bypass**, which is
neither script. Naming the combination is W0 work; whether the agent
logs in through the test bypass at all, or through a real credential, is
**open question 2**.

⭐ And the no-watch run is the *better demo* regardless: the reload
becomes a deliberate, visible act the agent performs, rather than
something that silently happened while the screen froze.

⚠ **`pnpm test` is fifteen minutes of dead air**, and
[CLAUDE.md](../../../CLAUDE.md) already restricts it to two moments in a
cycle. On stream the loop is `test:near` plus the drive; the full suite
is a pre-MR act, off camera. A slate that forgot this would design a
show with a quarter-hour hole in it.

## Non-goals

- **Parallel agent sessions in the client.** Explicitly deferred by the
  capture — one session is enough, and tmux keeps the parallel work
  off-camera where it belongs.
- **Replacing the terminal.** This is a *streaming* configuration, not a
  daily driver. The design must not assume anyone gives up their shell,
  and any decision that only makes sense if this is full-time is out of
  scope.
- **Rendering the tool-call stream.** Deliberately dropped — see the
  argument above. If a summary view is ever wanted it is a later,
  smaller thing built on the card surface.
- **A diegetic framing** (the agent as a familiar, a golem, a daemon).
  Cute once, confusing forever, and it cuts against interface tier. The
  *world* is the diegetic part; the agent is a tool.
- **Any production deployment.** The sidecar does not run there.

## Sequencing

1. **W0 — the run configuration + the agent's login.** The no-watch /
   test-auth combination, the agent's character, and it can `reload` on
   command. Provable without a stream and without a channel.
2. **W1 — the channel bridge.** Prompts in, replies out, dialogue legible
   in the client. This is the whole conversational surface.
3. **W2 — the approval posture.** `PromptApi.confirm` for the calls that
   warrant it, and a defensible answer to *what does not stop the show*.
4. **W3 — the drive, televised.** The build's own drive script run live,
   in the client, with the world as the frame.

W0–W1 is the build; W2–W3 is polish that can only be tuned by doing it.

## The lens pass

Interface tier, so pedagogy / immersion / technology-and-magic have no
claim — same finding as
[streamer-registry-slate](./streamer-registry-slate.md), and for the
same reason.

- **Creative expression** — the ordinary case is asking for a change in
  prose and watching it land; the bespoke case is the operator keeping
  their own shell and losing nothing. ⚠ The design fails if it makes the
  terminal path worse.
- **Gamification** — nothing is measured, nothing is conferred, and
  nothing should be. An agent's work is authored by the operator;
  [provenance.md](../../subsystems/provenance.md) already derives an
  author from context, and **open question 5** is whether the agent's
  character or the operator is that author.
- **Economy** — produces a live demonstration of the platform's central
  claim; consumes operator attention and model tokens; the founder pays.
  The demand was there first: the founder wants to stream and will not
  broadcast an editor window.

## Open questions

1. **The approval posture.** Stopping every twenty seconds in front of an
   audience is bad television; approving nothing is root-with-no-friction
   (TS access IS root, so friction and daylight
   rather than prohibition). Where is the line, and is it different on
   air than off?
2. **How the agent logs in** — the `AUTH_MODE=test` bypass, or a real
   credential? The bypass refuses to boot under
   `NODE_ENV=production`, which is a property worth keeping rather than
   working around.
3. **Does the agent's character persist**, or is it minted per session?
   A persistent one accumulates a chronicle, a transcript and a standing
   nobody intended.
4. **May the audience talk to it?** Moderation question first,
   technical second. A viewer prompting an agent that is root is the
   failure mode; a viewer *watching* the conversation is the show.
5. **Who is the author** of what the agent writes —
   [provenance.md](../../subsystems/provenance.md) derives it from
   context, and the context is now an agent's character rather than a
   person.
