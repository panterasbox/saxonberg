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

The client stack is a **list keyed by `promptId`**, NOT a strict
LIFO. Pushes append; responses pop by id; the client can have any
entry "active" (input mode bound to it) regardless of position.
Stack ordering only matters for the default-active-when-pushed
behavior (per the priority spectrum in
[Input routing](#input-routing--two-mode-model)).

```ts
type PromptEntry =
  | { kind: 'base';    content: string }
  | { kind: 'choice';  promptId: string; question: string;
                       choices: PromptChoice[];
                       defaultChoice?: string;
                       cancelable: boolean }
  | { kind: 'confirm'; promptId: string; question: string;
                       defaultAnswer: 'yes' | 'no';
                       cancelable: boolean }
  | { kind: 'text';    promptId: string; question: string;
                       placeholder?: string;
                       cancelable: boolean }
  | { kind: 'mql-object'; promptId: string; question: string;
                          matches: MqlMatchSummary[];
                          cancelable: boolean }
  /* Tier 2 kinds appended as they land — `numeric`, `multiChoice`,
     `password`, `mqlMany`. See "The kind canon" below. */ ;

type PromptChoice = { label: string; response: string };
type MqlMatchSummary = { stuffId: string; displayName: string };
```

`base` always sits at index 0 and is never pushed/popped from the
network — it represents the player's regular command-issue state.
The client constructs it locally; the server is unaware of its
existence. `cancelable` is omitted on `base` (always available;
"cancelling" the base prompt isn't meaningful).

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

### Input routing — two-mode model

The input field has **two explicit modes** the player can move
between freely. Prompts being pending does NOT lock the input to
prompt-response — the player can always escape back to command
entry without dismissing the prompts.

- **Command mode** — input goes to the command bus. Sigil `>`,
  default color. Prompts (if any) sit on the stack with no active
  selection. Default state when the stack is empty.
- **Prompt mode** — input is bound to one specific active prompt's
  response channel. Sigil `?`, distinct background tint, the
  active prompt highlighted in the prompt pane. The Send button
  reads `Respond to: <prompt header>`. Entered through gesture or
  auto-focus.

#### Mode gestures

- Click any prompt entry in the pane → enter prompt mode for that
  prompt.
- Click the "command mode" affordance (an empty slot at the top of
  the stack, or a dedicated chip when prompts are active) → return
  to command mode.
- **Esc** in prompt mode → return to command mode, prompt stays
  alive on the stack. Esc is "back out," not "kill."
- Click the X on a prompt → kill that specific prompt (see
  [Cancellation](#cancellation--kill)).
- A keyboard cycle through pending prompts (Ctrl-` or similar) is a
  later polish, not v1.

#### Default behavior when a new prompt arrives

The server can specify per-prompt **priority** controlling whether
the new prompt seizes the input:

- `priority: 'demanding'` (default) — auto-focus the new prompt;
  client switches to prompt mode for it.
- `priority: 'passive'` — push onto the stack but do not seize
  the input. The stack badge updates; the player engages when
  they want to. Used by async commands that pushed a prompt but
  don't want to interrupt the player.
- `priority: 'toast'` — not even on the stack; a quick
  acknowledgement that scrolls. Not really a "prompt"; reserved
  shape for future notification-style frames.

Most prompts are demanding (the original caller is `await`-ing).
Async / background callers opt out with passive. Reading from the
slate forward, treat default = demanding unless content explicitly
asks for passive.

#### Random-order answering

The "stack" is really a per-Interactive **list with random-access
addressing**. Each prompt carries a unique `promptId`; responses
route by id, not by position. So a stack of [P1, P2, P3]:

- Player clicks P1 → active = P1 → answers → P1 resolves and pops →
  stack is [P2, P3].
- Player could equally have clicked P2 first; promptId addressing
  makes order irrelevant for routing.

Stack ordering only matters for the **default active prompt** when
the player hasn't picked one explicitly (the most recently pushed
demanding prompt). Once they pick, position is just visual.

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

The player's normal command prompt. **Content for v1 is the actor's
current MQL focus** (per `FocusedMixin.getFocus()`; defaults to
`'here'`). Rendered as `[<focus>] >` — e.g., `[here] >`,
`[thermometer] >`, `[the brass kettle on the table] >`.

Why focus and not the avatar's name: focus is the load-bearing live
MQL pointer. It's what `$focus` resolves to (the default chain seed
in look / examine / etc.), it changes constantly, and it's
otherwise invisible in the UI. Showing it in the prompt makes every
MQL chain legible at a glance — the player always knows what their
default seed is.

Wire shape for v1: server pushes the current focus value to the
client on a dedicated topic (`system.prompt.focus` or similar)
**(a)** at connection-established time and **(b)** whenever
`setFocus` fires — `FocusController` already emits prose
`focus set to 'X'`; one additional structured emit on the new topic
covers the client side. Client subscribes, stashes the latest,
renders. No MQL-subscription dependency yet (focus push is its
own small server topic for v1).

Future: a configurable `prompt.format` setting via `EnvironmentMixin`
(`%hp` / `%maxhp` / `%mv` / `%location` / `%posture` / `%engagement`
/ `%focus` / `%mode` / `%time`) replaces the focus-only format.
Server renders against live state and re-pushes when any underlying
value changes; an MQL subscription on `me.{ hp, mv, location,
posture, ... }` drives the re-renders. The `system.prompt.focus`
topic gets superseded by a subscription with a token-rendering
field-set.

### The kind canon (tiered)

Prompts are inherently free-form (you get a string back; the caller
interprets). Without discipline, every author rolls their own
parsing + retry + UX, and the player faces a dozen subtly-different
prompt shapes. The discipline: **a small canon of structured kinds,
each with a fixed UX pattern, augmented by a validator hook**.
Authors compose canonical kinds; new kinds require slate review.

**Tier 1 — ships with v1 substrate**

| Kind | Server signature | UX shape |
|---|---|---|
| `choice` | `choice(interactive, question, choices, opts?) → Promise<string>` | Numbered chips; click or type number; Enter on default if `defaultChoice` set |
| `confirm` | `confirm(interactive, question, default?) → Promise<boolean>` | Y/N chip pair; default visually distinct; Enter sends default |
| `text` | `text(interactive, question, opts?) → Promise<string>` | Free input; optional placeholder, max length, validator |
| `mqlObject` | `mqlObject(interactive, question, matches: Stuff[]) → Promise<Stuff>` | Same chip surface as `choice` but `matches` carries `stuffId`; richer disambiguation cues (short description, salient feature) when DescribeApi v2 ships |

**Tier 2 — ships when content asks**

| Kind | Notes |
|---|---|
| `numeric` | Number with `{ min?, max?, step?, integer? }`. Built-in coercion + range check. Slider affordance future. |
| `multiChoice` | Pick N of M with `{ min?, max? }`. Toggle-able chips; "Confirm selection" button to send. |
| `password` | Masked text input. Own kind (not a `text` flag) so the UX renders dots without per-flag branching. |
| `mqlMany` | Multi-object MQL disambiguation; multiChoice's match-payload sibling. |

**Tier 3 — needs slate work**

- `paginated` — when N is too big to enumerate (50 disambiguation matches; vast item lists). Needs server-side pagination, client-side search-within-prompt, "type to filter."
- `quiz` — edtech-shaped: choice with a correctness model. Different from `choice` because the answer is graded, not just chosen. Probably composes `choice` + a server-side grading callback.

### The validator + retry pattern

This is the load-bearing piece that eliminates author retry loops.
Every Tier 1 / Tier 2 kind takes a `validate` option:

```ts
text(interactive, "What's your name?", {
  validate: (s) =>
    s.length >= 3 && s.length <= 20
      ? true
      : 'Name must be 3-20 characters',
})
```

If `validate` returns `true`, the await resolves with the response.
If it returns a string, the engine:

1. Sends a `prompt-validation-failed` envelope to the client with
   the error message.
2. Keeps the prompt alive on the stack (does NOT pop).
3. Client renders the input with an error annotation (red border /
   inline message).
4. Waits for the next response and re-validates.

Authors never write `while (true) { ask; validate; if bad re-ask; }`.
They write:

```ts
const name = await PromptApi.text(iact, "Name?", { validate: nameRules });
```

Built-in kinds (`numeric` range/step, `choice` validity, `confirm`
yes/no parsing) ship with their natural validators baked in. The
`validate` option layers additional caller-supplied rules on top.

### Compose vs. custom

**Compose**: the expected pattern. Character creation, crafting,
conversation trees, multi-step wizards — all sequences of canonical
prompts, with each await result determining the next step:

```ts
const archetype = await PromptApi.choice(iact, "Pick archetype", presets);
const name      = await PromptApi.text(iact, "Name?", { validate: nameRules });
const accept    = await PromptApi.confirm(iact, `Create ${name} as ${archetype}?`);
if (!accept) return abort();
await applyAvatar(name, archetype);
```

Clear, sequential, each prompt is a known kind, the player sees
consistent UX through the whole flow.

**Custom**: avoid. If an author thinks they need a new kind, it
goes through slate review. Every new kind expands the player's
prompt-recognition load; we canonize sparingly so the
"oh, I know what this is and how to respond" reflex stays tight.

If a one-off flow genuinely needs custom interpretation, the escape
valve is `text` with a caller-side validator + branching logic. The
UX shape stays consistent (a text input); the variation is in what
the caller does with the response. This is preferable to inventing
a new kind.

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

### Two-channel inbound protocol

The connection layer dispatches inbound client→server messages by
`type`. The prompt substrate adds two new types alongside the
existing `command`:

```ts
interface CommandMessage {
  type: 'command';
  payload: { text: string };
}

interface PromptResponseMessage {
  type: 'prompt-response';
  payload: { promptId: string; response: string };
}

interface PromptCancelMessage {
  type: 'prompt-cancel';
  payload: { promptId: string };
}
```

- `command` routes to the existing command-bus dispatcher.
- `prompt-response` routes directly to `PromptApi` — `promptId`
  looks up the awaiting resolver, calls `resolve(response)`, the
  caller's `await` continues. **Does not go through the command
  bus.**
- `prompt-cancel` routes to `PromptApi` — looks up the resolver
  for the (cancelable) prompt, calls `reject(AbortError)`, the
  caller's `await` throws and the caller handles cleanup.

`response` semantics by kind:

- `choice` / `mql-object` — the matching `response` token (for
  mqlObject, the picked Stuff's `stuffId`).
- `confirm` — `'yes'` or `'no'`.
- `text` / `password` — the entered string.
- `numeric` — the entered text; server-side coercion validates
  and re-pushes on failure.
- `multiChoice` / `mqlMany` — comma-separated tokens (or
  JSON-encoded array; pin at requirements).

### Validation-failed envelope

When `PromptApi`'s validator rejects a response, the prompt stays
alive and a `prompt-validation-failed` envelope tells the client
to render the error:

```ts
type PromptValidationFailedNote =
  { kind: 'prompt-validation-failed';
    message: string;     // shown to the user inline
    field?: string;      // for multi-field prompts (future) }
```

Client annotates the active prompt with the error, keeps input
bound to that prompt, awaits the next response.

---

## Server substrate (Framework 11)

`PromptApi` — owns the per-Interactive prompt stack server-side.

### State

```ts
class PromptApi {
  // pending awaiters keyed by promptId
  static #resolvers = new Map<string, {
    interactive: Interactive,
    resolve: (response: string) => void,
    reject: (err: Error) => void,
    cancelable: boolean,
    priority: 'demanding' | 'passive' | 'toast',
    validate?: (response: string) => true | string,
  }>();

  // per-Interactive ordered stack (for client mirror + UX defaults)
  static #stacks = new Map<Interactive, PromptEntry[]>();
}
```

### Surface (Tier 1 — v1)

```ts
PromptApi.choice(iact, question, choices, opts?): Promise<string>
PromptApi.confirm(iact, question, defaultAnswer?): Promise<boolean>
PromptApi.text(iact, question, opts?): Promise<string>
PromptApi.mqlObject(iact, question, matches: Stuff[]): Promise<Stuff>
```

Each method's `opts` accepts `{ priority?, cancelable?, validate? }`.

### Push lifecycle

1. Generate a `promptId` (nanoid).
2. Construct the resolver record (callbacks, validator, cancelable
   flag, priority). Store in `#resolvers`.
3. Append to the interactive's stack (`#stacks`).
4. Send `PromptEnvelope` + the corresponding question
   `MessageFrame` (for inline-in-terminal history).
5. Return the `Promise<…>` so the caller can `await`.

### Response lifecycle

1. Inbound `prompt-response` lands at `Interactive.handleInbound`,
   discriminates by `type`, calls `PromptApi.handleResponse(...)`.
2. `handleResponse` looks up the resolver. If absent (stale id),
   ignore.
3. If a `validate` is set, run it. If it returns a string, send
   `prompt-validation-failed` envelope, leave the resolver in
   place, return.
4. If validation passes (or absent), delete the resolver entry,
   remove the prompt from `#stacks`, send `prompt-dismissed`
   envelope with `reason: 'answered'`, and `resolve(response)`.
5. The caller's `await` continues. Caller decides whether to
   resume the originating command, branch, abort, etc.

### Cancellation lifecycle

Two triggers:

- **Player gesture** — client sends `prompt-cancel` with the
  promptId. PromptApi looks up the resolver, checks `cancelable`
  (gated to admin override if false), deletes the entry, sends
  `prompt-dismissed` envelope (`reason: 'cancelled'`), and
  `reject(AbortError)`.
- **Server-side** — disconnect, prompt replacement, explicit
  `PromptApi.cancel(promptId)` / `cancelAll(iact, reason)`. Same
  reject path; `reason` varies (`'cancelled'`, `'replaced'`,
  `'host-disconnected'`).

The caller's `await` throws an `AbortError`. Caller is expected
to handle it — most commands wrap their prompt awaits in a
try/catch that aborts the dispatch cleanly. Authoring-time error:
unhandled AbortError propagates up to the dispatcher's standard
error handler.

### Replace-vs-push when a new prompt arrives

Default: **push** (preserve existing prompts on the stack). This
respects the player's existing context and matches the
random-order-answering semantics.

Replace is reserved for an explicit `priority: 'preempting'` (not
v1) — the new prompt cancels all lower-priority pending prompts.
Used by hard system events that demand immediate response (e.g.,
"the server is shutting down, save now?"). Defer to a content
need.

### Ordering and `Interactive.nextFrameId`

Pushes and dismissals stamp `frameId` from the existing
per-Interactive counter (same one that orders `MessageFrame` +
envelopes). Client uses `frameId` to order prompt-related frames
relative to other server output (e.g., a prompt that fires after
a `say` should render after the `say` in the scroll).

---

## Cancellation + kill

Player surfaces:

- **X button on each prompt entry** — sends `prompt-cancel`; non-
  cancelable prompts grey it out.
- **`cancel <name>` or `cancel current` verb** — sends a
  `prompt-cancel` for a targeted promptId or for the active one.
  Falls under shell vocabulary; ships when content asks (the X
  button covers the common case).
- **Esc in prompt mode** — drops to command mode, prompt stays
  alive. NOT a kill. Killing requires the explicit X.

Non-cancelable prompts are rare (`{ cancelable: false }` opt-in).
Reserved for cases where forward progress is impossible without an
answer — disconnect is the only exit. v1 examples: none. Slate-
level shape only.

Disconnect: when the interactive closes, `PromptApi.cancelAll`
rejects every pending resolver with reason `'host-disconnected'`.
Callers' awaits throw; their abort handlers run; state cleans up.

---

## Client build (this slate's first wave)

Minimum viable client stack against the server stub:

1. `PromptStack` zustand slice — typed list keyed by `promptId`;
   helpers `push(entry)`, `pop(promptId)`, `cancel(promptId)`,
   `setActive(promptId | null)`, `top()`.
2. `Prompt` component — readonly content area + clickable
   choice/confirm/text affordances per kind + per-entry X button
   (cancelable) + stack-depth badge.
3. **Input mode-switching** — input has explicit command-mode and
   prompt-mode states. Visual disambiguation per the
   [Input routing](#input-routing--two-mode-model) section
   (sigil + tint + button label + active-prompt highlight). Mode
   gestures: click prompt entry → enter prompt mode; click
   command-mode chip / Esc → return to command mode.
4. CommandBar wiring — keyboard Enter routes to the right inbound
   channel (`command` vs `prompt-response`); X-button click routes
   to `prompt-cancel`.
5. Echo snapshot pairing — FIFO queue snapshots whichever entry
   was active at send time (base or a prompt); dequeues on echo
   arrival to render the echo's prompt context.
6. Inline-in-terminal — prompt push fires a `MessageFrame` on the
   prose channel (server-side decision; client just renders).
   Response and cancel fire local-echo `MessageFrame`s too with
   the muted amber prompt-mode styling.
7. Validation error rendering — on `prompt-validation-failed`
   envelope, annotate the active prompt with the error message
   (red border + inline text), keep prompt mode active, await
   re-response.
8. Debug hooks — `window.__pushPrompt(entry)`,
   `window.__popPrompt(promptId, reason)`,
   `window.__validateFail(promptId, message)` for testing without
   server substrate.

Base prompt content for v1 is the actor's MQL focus, rendered as
`[<focus>] >`. Server side: a small emit added to
`FocusController` (and connection-establishment) on a dedicated
topic. Client side: subscriber updates the base prompt content
when frames arrive. Full subscription-driven token-format prompts
land later.

---

## Non-goals

- **Subscription-driven base prompt format** — token-driven `%hp` /
  `%location` style format strings deferred to whenever the
  MQL-subscription substrate lands. v1 ships a focus-only base
  prompt fed by a dedicated server push topic.
- **Preempting priority** — the spectrum (demanding / passive /
  toast) excludes the would-cancel-other-prompts case. Add it
  when content asks (server shutdown notifications, etc.).
- **Prompt timeout / expiry** — prompts stay live until answered,
  cancelled, or the connection drops. Timeout semantics deferred.
- **Modal prompts** — none. Every prompt is interruptible by world
  events appearing in the terminal scroll; the prompt component
  stays interactive but doesn't block the screen.
- **Custom prompt kinds outside the canon** — Tier 1-3 are the
  surface. New kinds require slate review. The escape valve is
  `text` + caller-side validator + branching logic.
- **`async`-command flag** — the `priority: 'passive'` opt-out hook
  is shaped to support eventual `--async` commands but the flag
  itself is not v1.
- **Multi-Interactive prompt sync** — a player on two devices
  sees a prompt on both, answering on one dismisses it on the
  other. Same wire mechanism as multi-device echo. v1 ships
  per-Interactive only; per-User-multi-device coordination is
  deferred.

---

## Open questions

1. **Active-prompt visual selection when stack > 1.** When the
   player clicks P1 (currently mid-stack) to make it active, does
   P1 visually move to the top of the stack, or stay in place with
   an active-highlight border? Lean stay-in-place — re-ordering
   things under the cursor is disorienting.
2. **Choice rendering when N is large.** 50 disambiguation matches
   is a usability problem. Server-side: should `mqlObject` truncate
   and suggest narrowing the query? Client-side: scrollable /
   searchable list? Both probably needed eventually — `paginated`
   is the Tier 3 kind that owns this.
3. **`multiChoice` response encoding.** Comma-separated tokens
   vs JSON array vs a structured payload. Lean comma-separated for
   the simple case, with the wire shape leaving room to grow.
4. **Confirm-vs-choice unification.** `confirm` could be a
   special-case `choice` with `[yes, no]` + a default. v1 keeps
   them separate (the dedicated UX justifies it). Worth revisiting
   if redundancy bites.
5. **Author / admin overrides.** Should admins be able to push test
   prompts to themselves for development? Probably yes, gated under
   a `mode prompt <kind>` or `eval`-shaped surface. Lands with
   author tooling, not v1.
6. **Quiz kind design.** Edtech-load-bearing but speculative until
   content arrives. Slate-shaped work for the quiz kind specifically.

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
- **MQL subscriptions** ([mql-subscription-slate.md](./mql-subscription-slate.md))
  — required for the server-rendered base prompt format token
  rendering. Not required for v1 of this slate.

---

## Suggested build order

1. **Client stack substrate** (this slate, first wave) — typed
   stack + `Prompt` component + two-mode input routing + debug
   hooks + echo snapshot. Lands against a stub. v1 client UX is
   "base prompt always shows; mode toggle works; no real
   server-pushed prompts to interact with yet."
2. **Server PromptApi** (Framework 11 punch-list) — resolver map,
   `#stacks`, Tier 1 methods (`choice`, `confirm`, `text`,
   `mqlObject`), validator + retry, cancellation surface, priority
   spectrum opt-out, two-channel inbound wiring at
   `Interactive.handleInbound`.
3. **Prompt-content Note kinds** — added to `@saxonberg/types`
   alongside Server PromptApi. Wire grows by 4-6 kinds
   (`prompt-choice`, `prompt-confirm`, `prompt-text`,
   `prompt-mql-object`, `prompt-validation-failed`,
   `prompt-dismissed`).
4. **MQL disambiguation integration** — dispatcher detects
   single-object spec + multi-match result → calls
   `PromptApi.mqlObject` → resumes on response.
5. **Client kind-specific rendering** — choice chips, confirm
   yes/no, text input with validation error rendering, mql-object
   with stuffId resolution.
6. **Confirm / text-prompt content** — lands when first content
   needs them (probably character creation: name input, archetype
   confirm).
7. **Tier 2 kinds** (`numeric`, `multiChoice`, `password`,
   `mqlMany`) — land per content. Each is a small addition to
   PromptApi + a small client renderer.
8. **State-sync-driven base prompt format** — generalizes the
   focus-only base prompt to a server-rendered token format
   (`%hp` / `%location` / etc.) re-pushed when underlying state
   changes. Lands alongside the MQL-subscription substrate.

Waves 1-2 are independent and can be built in parallel by
different sessions. Waves 3-5 ship as a unit. Wave 6 lands per
content. Wave 7 is per-kind-per-content. Wave 8 lands with state-
sync.
