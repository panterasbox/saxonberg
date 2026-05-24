# Prompt stack slate (working doc)

Working slate for the **interactive prompt stack** — a server- and
client-side substrate for asking the player a question mid-flow,
recording their answer, and resuming whatever needed it. Disambiguation,
confirmation, choice menus, multi-step workflows (character
creation, crafting, lesson gates) all consume the same surface.

**Status.** Wire-level envelope shape (`PromptEnvelope` in
`@saxonberg/types`) exists; everything else is design surface. Server
substrate is the v1 punch-list item "Interactive prompt stack
(Framework 11)" — not built. Client side is the cockpit slate's
Polish A section, expanded here into a real architecture.

See also:

- [docs/slates/client-cockpit-slate.md § Interactive prompt stack
  (Polish A)](./client-cockpit-slate.md) — names the rendering
  shape choice (inline-in-terminal) and refers the substrate work
  here.
- [docs/subsystems/response-envelope.md](../subsystems/response-envelope.md)
  — `PromptEnvelope` lives in the same wire family as
  `DispatchResponseEnvelope` and `ActivityUpdateEnvelope`.
- [docs/roadmap.md § v1 punch list](../roadmap.md) — Framework 11
  is the server-substrate line item.
- [docs/subsystems/mql.md](../subsystems/mql.md) — MQL multi-match
  cardinality is the load-bearing first consumer; disambiguation
  is what closes the chain from "object MQL returned N matches"
  to "user picked one".

---

## Principle

A **stack**, not a single slot. Why a stack:

- Multiple prompts can be active simultaneously (an MQL disambiguation
  fires while a multi-step character creation is mid-flight). The user
  always interacts with the top.
- Each prompt has its own lifecycle: server pushes, client accepts,
  user responds, server consumes, prompt pops.
- Some prompts can spawn more prompts (a confirm-the-choice prompt
  follows a choice prompt). Stack semantics handle this naturally.
- Multi-step flows are sequences of prompts pushed one after another
  rather than a single mega-prompt with branching state.

The base of the stack is the always-present **command prompt** — the
player's normal "ready to type" state. Everything else pushes on top.

---

## Architecture

### Stack model

```ts
type PromptEntry =
  | { kind: 'base';    content: string }
  | { kind: 'choice';  promptId: string; question: string;
                       choices: PromptChoice[] }
  | { kind: 'confirm'; promptId: string; question: string;
                       defaultAnswer: 'yes' | 'no' }
  | { kind: 'text';    promptId: string; question: string;
                       placeholder?: string; masked?: boolean }
  | { kind: 'mql-object'; promptId: string; question: string;
                          matches: MqlMatchSummary[] };

type PromptChoice = { label: string; response: string };
type MqlMatchSummary = { stuffId: string; displayName: string };
```

`base` always sits at index 0 and is never pushed/popped from the
network — it represents the player's regular command-issue state.
The client constructs it locally; the server is unaware of its
existence.

All other kinds are server-pushed via the existing `PromptEnvelope`
shape (which already carries `promptId`); the kind-specific payload
rides in the envelope's `outcome.notes` (new Note kinds — see
[Wire shape](#wire-shape)).

### Component shape

A `Prompt` UI element placed sibling-to-input in the CommandBar row.
Reads the TOP of the stack and renders:

```
┌──────────────────────────────────────────────────────────────────┐
│ [stack badge]  [readonly prompt area]   [input]   [Send/Respond] │
└──────────────────────────────────────────────────────────────────┘
```

- **Stack badge** — shows depth when > 1. `⌃2`, `⌃3`, etc. — a quiet
  signal that there are prompts underneath. Click expands to a peek.
- **Readonly prompt area** — the top entry's question / content. Not
  editable. Selection allowed.
- **Choice affordances** for `choice` / `mql-object` / `confirm`
  prompts render as clickable chips that pre-fill the input with the
  matching `response` (same click model as the rest of the cockpit —
  hover previews, click sends).
- **Input + Send** label flips per top kind: `> [Send]` for base,
  `> [Respond]` for any other.

### Input routing

Single input field, mode-switches on top-of-stack:

- **Top is base** → input issues commands. Today's behavior.
- **Top is non-base** → input value sends as a prompt response to the
  current `promptId`, NOT as a command. The Send button reads
  "Respond". Enter key triggers Respond.

The user can't issue a new command while a prompt is up — they must
respond, cancel, or escape. v1 doesn't try to support typing-a-new-
command-during-prompt; we add escape mechanics (`cancel`,
`escape`, etc.) as content needs.

### Inline-in-terminal AND prompt component

Both:

- **Prompt component** is the interactive surface. The user types or
  clicks here.
- **Inline-in-terminal** is the historical record. When a prompt
  arrives, its question prints to the terminal scroll. When the user
  responds, the response also prints (as part of the local-echo
  family). When the prompt pops, the terminal scroll has the full
  exchange in context.

This solves "what was just asked of me five prompts ago" while
keeping the interactive surface compact. Slight question-text
duplication is fine — terminals have always done this.

### Snapshot-on-send

The CommandBar/Prompt-input wiring maintains a FIFO queue of
prompt snapshots. On send, the client pushes the current top-of-
stack snapshot onto the queue. When the matching echo arrives
(dispatch-response envelope for commands, prompt-response echo for
prompt responses), the snapshot is dequeued and paired with the
echo line in the terminal. Result: each echo line is rendered with
the prompt that was active when it was sent, not the prompt that's
active when the echo arrives.

WebSocket per-connection order preserves FIFO; no dispatch-id
matching needed.

---

## Prompt kinds

### `base` (always present)

The player's normal command prompt. Content for v1 is a hardcoded
client-side simple format (`[Bobalu Smallberries] >`). Future: server
renders a configurable `prompt.format` setting via
`EnvironmentMixin` (`%hp`, `%maxhp`, `%mv`, `%location`, `%posture`,
`%engagement`, `%focus`, `%mode`, `%time`) and pushes the rendered
string on a dedicated topic; state-sync triggers re-renders when
underlying values change.

### `choice` (v1 — load-bearing)

Pick one of N. Used for arbitrary menus, and as the substrate for
disambiguation. Choices render as numbered chips; clicking a chip
pre-fills the input with the response token; sending issues the
prompt response.

```
Which sword?
  (1) rusty sword
  (2) iron sword
[ⓘ 1] > [______]   [Respond]
```

### `confirm` (v1.x)

Yes/no with a default. Special-case of choice but worth its own kind
because it's so common ("are you sure?"). Default-answer affordance
(Enter sends the default).

### `text` (v1.x)

Free-form input. Optional `masked: true` for passwords / secrets.
Comes online when content asks (name pick in character creation, eval
input, search query).

### `mql-object` (v1 — paired with choice)

Specialised disambiguation when MQL returned multiple objects against
a single-object expectation. Carries the same shape as `choice` but
the matches list is structured (each entry has a `stuffId`, not just
a label), so the client can render with richer disambiguation cues
(short description, location, salient feature). v1 ships rendering as
labels; richer cues land when DescribeApi v2 ships (per
[recognition-slate](./recognition-slate.md)).

---

## Worked example: MQL object disambiguation

```
1. User types `take sword`
2. Server: MQL `sword` resolves to 2 matches (rusty + iron)
3. Command spec says `object` (single result expected)
4. Dispatcher: instead of executing, push a prompt via PromptApi.mqlObject(matches)
5. Server sends:
     - MessageFrame on `world.prompt` (the question prose lands in terminal)
     - PromptEnvelope with promptId + outcome.notes carrying the
       mql-object choice payload
6. Client: pushes a `{ kind: 'mql-object' }` entry on the prompt stack;
    prompt component renders the choices; terminal has the prose
7. User clicks "rusty sword"
8. Client: sends prompt response `{ promptId, response: <stuffId> }`
9. Server: PromptApi receives response, resumes the original dispatch
    with the picked object bound, fires `take` against the rusty sword
10. Server pushes a prompt-pop signal (or the PromptEnvelope's
     completion); client pops the prompt off its stack
11. Echo line in the terminal carries the snapshot of the mql-object
     prompt (the question text + the response chosen), per FIFO
12. Player is back at the base prompt
```

---

## Wire shape

### `PromptEnvelope` (exists)

```ts
interface PromptEnvelope {
  type: 'prompt';
  frameId: number;
  promptId: string;
  outcome: NoteOnlyOutcome;       // notes: Note[]
}
```

### Missing: prompt-content Note kinds

The kind-specific payload rides in `outcome.notes`. New Note kinds
needed (slate-shaped — actual surface lands when Framework 11
builds):

```ts
type ChoicePromptNote =
  { kind: 'prompt-choice'; question: string; choices: PromptChoice[] };

type ConfirmPromptNote =
  { kind: 'prompt-confirm'; question: string; defaultAnswer: 'yes' | 'no' };

type TextPromptNote =
  { kind: 'prompt-text'; question: string; placeholder?: string; masked?: boolean };

type MqlObjectPromptNote =
  { kind: 'prompt-mql-object'; question: string; matches: MqlMatchSummary[] };

type PromptDismissedNote =
  { kind: 'prompt-dismissed'; reason: 'answered' | 'cancelled' | 'replaced' };
```

A push envelope carries one of the four content notes; a pop
envelope carries a `prompt-dismissed` note. Stacked prompts are
pushed sequentially in send order.

### Response channel

Client → server prompt response:

```ts
interface PromptResponseMessage {
  type: 'prompt-response';
  payload: { promptId: string; response: string };
}
```

Rides the same outbound `Envelope`-style channel as `command`.
`response` is a string — for choice prompts it's the matching
`response` token; for text prompts it's the entered text; for
confirm it's `'yes'` / `'no'`.

---

## Server substrate (Framework 11)

`PromptApi` — owns the per-Interactive prompt stack server-side:

- `PromptApi.choice(interactive, question, choices): Promise<string>` —
  push a choice prompt, await response; returns the chosen response.
- `PromptApi.confirm(interactive, question, default?): Promise<boolean>`
- `PromptApi.text(interactive, question, opts?): Promise<string>`
- `PromptApi.mqlObject(interactive, question, matches): Promise<Stuff>`
  — convenience wrapping `choice` with stuffId resolution.

Each method:

1. Generates a `promptId`
2. Pushes onto the server-side stack for the interactive
3. Sends the corresponding PromptEnvelope + question MessageFrame
4. Awaits the matching `prompt-response` on the inbound channel
5. Pops on response, returns the result to the caller
6. Cancels and rejects if the interactive disconnects / a higher-
   priority prompt replaces it

Multi-stack semantics, replacement, and the per-Interactive
ordering primitive align with `Interactive.nextFrameId` (the same
counter that stamps MessageFrame + envelope `frameId`s).

---

## Client build (this slate's first wave)

Minimum viable client stack against the server stub:

1. `PromptStack` zustand slice — typed array; helpers
   `push(entry)`, `pop(promptId)`, `top()`, `dismiss(reason)`.
2. `Prompt` component — readonly prompt-content area + clickable
   choices + stack-depth badge.
3. CommandBar wiring — single input mode-switches on top kind;
   Send-button label flips; Enter routes to the right channel.
4. Echo snapshot pairing — FIFO queue of `PromptEntry` snapshots,
   dequeued on echo arrival to render the echo's prompt context.
5. Inline-in-terminal — prompt push fires a MessageFrame on the
   prose channel (server-side decision; client just renders).
   Response fires a local-echo MessageFrame too.
6. Debug hook — `window.__pushPrompt(entry)`,
   `window.__popPrompt(reason)` for testing without server
   substrate.

Base prompt content for v1 stays hardcoded (`[<displayName>] >`)
until server-rendered prompts land alongside state-sync.

---

## Non-goals

- **State-sync-driven base prompt format** — token-driven `%hp` /
  `%location` style format strings deferred to whenever state-sync
  lands. v1 ships a hardcoded display-name-only base prompt.
- **Typing a new command while a prompt is up** — input is bound to
  prompt response when stack is non-base. Escape hatches (`cancel`,
  global escape key) land when content asks.
- **Server-side multi-prompt UI orchestration** — the substrate
  supports a stack but v1 use cases (disambiguation, simple
  confirms) typically have one prompt at a time. Multi-step
  workflows that DO push multiple prompts (character creation,
  crafting wizards) land per content needs.
- **Prompt timeout / expiry** — prompts stay live until answered,
  cancelled, or the connection drops. Timeout semantics deferred.
- **Modal prompts** — none. Every prompt is interruptible by world
  events appearing in the terminal scroll; the prompt component
  stays interactive but doesn't block the screen.

---

## Open questions

1. **Cancel mechanics.** What's the user-facing escape from a prompt?
   A `cancel` verb? A keyboard shortcut (Esc)? Click an "X" on the
   prompt component? Probably some combination; pin at requirements.
2. **Replacement semantics.** When a higher-priority prompt arrives
   while another is mid-response, does it push on top or replace? My
   instinct: push (preserves the original to be returned-to after the
   interruption resolves). But some content might want replace.
3. **Multi-Interactive sync.** A player logged in on two devices —
   does a prompt show on both, and answering one dismiss the other?
   Same wire mechanism as multi-device echo; probably yes, but worth
   pinning.
4. **Choice rendering when N is large.** 50 disambiguation matches
   is a usability problem. Server-side: should `mqlObject` truncate +
   suggest narrowing the query? Client-side: scrollable / searchable
   list? Both probably needed eventually.
5. **Prompt history.** Is there a player-facing history of past
   prompts and their answers, or do they just scroll out of the
   terminal? Lean: terminal scroll is the history. No dedicated
   surface.
6. **Author / admin overrides.** A `mode` verb already lets admins
   force-shift the cockpit mode (per cockpit slate). Should an
   equivalent let admins push test prompts to themselves? Probably,
   gated. Lands with author tooling.

---

## Dependencies

- **PromptEnvelope** (already in `@saxonberg/types`) — wire shape
  done. Note kinds for prompt content still to define.
- **MessageApi / Scene** — used to fire the inline-in-terminal
  prose half of each prompt.
- **MQL** ([mql.md](../subsystems/mql.md)) — the
  multi-match-cardinality check is what triggers `mqlObject`
  disambiguation. Punch-list item "MQL disambiguation prompts"
  lands alongside.
- **Cockpit slate** ([client-cockpit-slate.md](./client-cockpit-slate.md))
  — the prompt component is part of the cockpit's always-on
  minimum (now upgraded from "polish" to "central element").
- **State-sync** ([state-sync-slate.md](./state-sync-slate.md)) —
  required for the server-rendered base prompt format token
  rendering. Not required for v1 of this slate.

---

## Suggested build order

1. **Client stack substrate** (this slate, first wave) — typed
   stack + Prompt component + debug hooks + echo snapshot. Lands
   against a stub. v1 client UX is "base prompt always shows; no
   real server-pushed prompts to interact with yet."
2. **Server PromptApi** (Framework 11 punch-list) — `choice`,
   `confirm`, `text`, `mqlObject` methods + per-Interactive stack.
3. **MQL disambiguation integration** — dispatcher detects
   single-object spec + multi-match result → calls
   `PromptApi.mqlObject` → resumes on response.
4. **Prompt-content Note kinds** — added to `@saxonberg/types`
   alongside Server PromptApi. Wire grows by 4-5 kinds.
5. **Client kind-specific rendering** — choice chips, confirm
   yes/no, text input, mql-object with stuffId resolution.
6. **Confirm / text-prompt content** — lands when first content
   needs them (probably character creation: name input, archetype
   confirm).
7. **State-sync-driven base prompt format** — replaces the
   hardcoded base prompt with server-rendered format string. Lands
   alongside state-sync.

Waves 1-2 are independent and can be built in parallel by
different sessions. Waves 3-5 ship as a unit. Wave 6 lands per
content. Wave 7 lands with state-sync.
