# Response envelope slate (working doc)

Working slate for the **response envelope** — the structured sibling
channel to MML prose, carrying machine-readable signals about what
happened on each server→client message (command responses, witnessed
events, activity pushes, prompts). Cross-cutting substrate: several
queued items (globbable, look fallback, MQL disambiguation, the
prompt stack, activity completion) all consume it.

This slate is for *agreeing the shape* before consumers start
depending on it. Without it, each consumer either invents its own
sidechannel or contorts MML to carry meta. Both options age badly.

See also:

- [docs/subsystems/messaging.md](../subsystems/messaging.md) — MML
  and the scene composer; the *presentation* channel.
- [docs/subsystems/command-routing.md](../subsystems/command-routing.md)
  — dispatch pipeline; where the envelope is assembled.
- [docs/slates/state-sync-slate.md](./state-sync-slate.md) — the
  parallel channel for state changes (inventory, location, HP,
  property deltas). Deliberately *not* in the envelope; see
  "Scope" below.
- [docs/subsystems/glob.md](../subsystems/glob.md) — first consumer
  (shipped, v1 ships notes as a plain list returned by
  `applyQuantity`): `quantity-clamped`, `quantity-clamped-rejected`,
  `empty-result`, and `target-declined` notes.
- [docs/slates/activity-slate.md](./activity-slate.md) —
  transaction-style completion validation produces structured
  outcomes; same envelope.

---

## Principle

Every server→client message carries **two parallel channels**:

1. **Scene** (MML) — what the player sees. Prose, formatted, audience-
   aware. Presentation.
2. **Outcome** (structured) — what happened on this message, in a form
   machines can read. Status discriminator + a typed list of *notes*.
   Meta-about-the-message.

The two are siblings, not nested. A renderer reads the scene; a
rich client / script / future-LLM-agent reads the outcome. Both can
read both — but they're separable, and they evolve on independent
schedules.

```
Envelope {
  scene: Mml,                    // presentation
  outcome: {                     // machine signal
    notes: Note[],               // typed structured annotations
    status?: Status,             // dispatch-response only — see Wire protocol
  }
}
```

The envelope is the **universal server→client message shape** — it
covers command responses, witnessed events ("Bob arrives from the
south"), activity progress pushes, and prompt deliveries. A
websocket frame discriminator distinguishes the kinds (see
[Frame types](#frame-types)), but the internal envelope shape is
the same. Clients implement one rendering pipeline.

The slate name is "response envelope" — the whole thing. The
`outcome` slot is the new piece this slate designs.

---

## Scope: what the envelope carries, what it doesn't

The envelope carries **per-message annotations**: incidents on the
request (clamps, ambiguities, declines), continuations (prompts),
and the message's prose scene. Its lifetime is one server→client
message.

**What is NOT in the envelope: state changes.** When a player's
inventory drops by ten coins, when their location changes, when
their HP delta lands — these are not envelope notes. State changes
flow through a separate event/witness channel; the design surface
lives in [state-sync-slate](./state-sync-slate.md).

The split has two important consequences:

1. **One state-sync code path for self-actions and witnessed
   actions.** When you walk north, the same `location-changed` event
   the *other room's occupants* witness ("Bob arrived from the
   south") is the event that tells *your client* its current-room
   widget should update. No special case for "this changed because
   of my command vs. someone else's."
2. **The envelope schema stays narrow.** Note kinds describe what
   happened to *this dispatch* — they don't try to enumerate every
   bit of world state that moved as a result. Adding a new state
   delta kind doesn't churn the note union.

A worked example to make the boundary concrete:

`drop 99 coins` against an inventory of 10:

- **Envelope** carries `status: 'partial'`, note
  `{kind: 'quantity-clamped', requested: 99, applied: 10}`, scene
  "You drop 10 coins."
- **State-sync channel** carries a `containment-changed` delta (the
  coins moved from the dropper to the room) plus any
  `property-changed` deltas riding alongside (e.g. globbable stack
  quantities). Same events fire whether you dropped them or
  someone else dropped them and you witnessed.

---

## Why it's not MML

MML's job is rich text for the prose channel. The proposed semantic
tags (`<command>`, `<player>`, `<quantity>`) are about how to *render
references inside prose*. That's presentation.

Carrying machine signals as MML tags would mean:

- Renderers filter tags-not-meant-for-display out of every scene.
- MML's schema co-evolves with the machine-API schema, even though
  the audiences are different.
- Tooling that reads the prose stream sees noise; tooling that wants
  the machine signal has to parse prose.

These pressures land somewhere ugly. Separating the channels lets
each carry exactly what it should: prose tags are presentation only,
outcome notes are machine signals only.

---

## Status discriminator

**Scope: dispatch-response frames only.** The `status` field is the
coarsest read on what happened to *a player's request*. It applies
only to `dispatch-response` frames; other envelope frames
(`witness`, `activity-update`, `prompt`) carry `outcome: { notes }`
without status — see [Outcome shape across frame
types](#outcome-shape-across-frame-types) below for the rationale.

| Value | Meaning |
|---|---|
| `ok` | The action proceeded as requested. No partial fulfilment. |
| `partial` | The action proceeded, but with a meaningful deviation from what was asked (clamped quantity, ignored arg, some targets refused). Notes describe what diverged. |
| `declined` | The dispatcher or controller chose not to act for a legitimate reason (validator said no, target ineligible, no-op condition, prompt-pending continuation). Not a failure — a soft refusal. |
| `error` | The action couldn't execute. Programmatic contract violations, unrecoverable state. Rare on the command surface — most "errors" players see are `declined`. |

Distinction worth holding:

- `declined` is for "you can't do that (yet / here / to that)" —
  empty inventory, locked door, target not Wieldable. Recoverable;
  the player tries something else (or answers the prompt).
- `error` is for "something is wrong in the world" — a stuck
  promise, a security violation, a corrupted state.

Most controllers will only ever emit `ok` / `partial` / `declined`.

---

## Note kinds — v1 roster

A `Note` is a discriminated union. Each kind has its own payload
shape. Adding a new kind doesn't churn the contract for existing
consumers.

```ts
type Note =
  | QuantityClampedNote
  | QuantityClampedRejectedNote
  | EmptyResultNote
  | MatchAmbiguousNote
  | TargetDeclinedNote
  | ActivityStartedNote
  | ActivityProgressNote
  | ActivityCompletedNote
  | ActivityCancelledNote
  | ... ;
```

Initial roster (each gets its own typed payload):

### `quantity-clamped`

Lenient overflow. Emitted when the requested count exceeded the total
units available across the candidate list and was reduced to what
was actually applied. Payload:

```ts
{ kind: 'quantity-clamped', field: string, requested: number, applied: number }
```

Consumer: glob subsystem — see
[subsystems/glob.md](../subsystems/glob.md) (`drop 99 coins` against
10 available; `drop 7 fruit` against 4 available). Renderer:
friendly prose ("You only have N").

### `quantity-clamped-rejected`

Strict pre-check refusal. Emitted when the formal `:{N}` form
requested more units than the candidate list could supply. The
helper runs this check *before* any actions execute — no partial
fulfilment, no rollback. Payload:

```ts
{ kind: 'quantity-clamped-rejected', field: string, requested: number, available: number }
```

Consumer: glob subsystem (formal-path strict mode); see
[subsystems/glob.md](../subsystems/glob.md). Renderer: prose
explaining the shortfall.

### `match-ambiguous`

Emitted when a singular field resolved to multiple top-scored
candidates. Payload includes the candidate set for client-side
disambiguation. Payload:

```ts
{ kind: 'match-ambiguous', field: string, query: string, candidates: StuffRef[] }
```

Consumer: MQL disambiguation (depends on the prompt stack).
Renderer: future prompt UI; pre-prompt-stack just first-match wins.

### `empty-result`

Emitted when a field's MQL query produced no matches and the
controller treated this as legitimate (declined, not error). Payload:

```ts
{ kind: 'empty-result', field: string, query: string }
```

Consumer: look-fallback (the "you see nothing special" case carries
the *reason* — no Visible mixin, no items, etc.).

### `target-declined`

Emitted when a per-target action within a multi-target operation
failed for a structured reason — a cursed item refused to move, a
witness vetoed, a per-target validator declined. Target-scoped:
multiple of these can land on one dispatch, one per failing target.
Payload:

```ts
{ kind: 'target-declined', target: StuffRef, reason: string }
```

`reason` is an open-enumeration string — each controller declares
its reason vocabulary (`'cursed'`, `'too-heavy'`, `'not-yours'`).
Clients fall back to generic decline rendering for unknown reasons.

Consumer: globbable `applyQuantity` action callback (the action
returns `{ ok: false, reason }` and the helper accumulates one
note per declined target). Distinguishes "you only have 8 of 10"
(`quantity-clamped`) from "2 of the 10 refused to move"
(`target-declined` × 2). Both can co-emit on the same dispatch.

Cardinality: N-per-dispatch.

### `activity-started`

Emitted on the dispatch response when a durative verb kicks off an
activity. Lets the client display ETA / cancel affordances. Payload:

```ts
{ kind: 'activity-started', activity: ActivityId, etaMs: number, cancelable: boolean }
```

Consumer: activity slate. Request-scoped (rides on the command
response).

### `activity-progress`

Emitted by durative activities for progress reporting. Payload:

```ts
{ kind: 'activity-progress', activity: ActivityId, fraction: number, ... }
```

Consumer: activity slate. Lets rich clients render progress bars
without scraping prose. **Delivered on `activity-update` frames**,
not on command responses — progress is a server-push tied to the
activity ticker, not to a player command.

### `activity-completed` / `activity-cancelled`

Emitted when an activity finishes or aborts. Also server-pushed on
`activity-update` frames. Cancellation payload includes the reason
(interrupted, target-lost, validator-failed, manual). Any state
changes resulting from completion (location change, item produced)
flow through the **state-sync channel**, not as additional notes.

---

### Deferred placeholders

Kinds anticipated but not designed in v1. Listed so consumers don't
reinvent them per call-site.

- **`mql-error`** — emitted by the dispatcher when MQL resolution
  fails before the controller runs. Covers desugar errors
  (quantity + ordinal collision, malformed brackets), lex errors
  (unclosed `{`), parse errors (unknown chain operator). Likely
  field-scoped:
  ```ts
  { kind: 'mql-error', field: string, stage: 'desugar' | 'lex' | 'parse', detail: string }
  ```
  Concrete payload to be designed when the first consumer demands
  it. Today these errors surface as generic "couldn't resolve"
  decline prose.
- **`validator-failed`** — emitted by the dispatcher when a YAML
  validator declines. Concrete payload TBD.
- **`permission-denied`** — emitted by the dispatcher when a security
  policy refuses. Payload includes the policy that fired. TBD.
- **`prompt-pending`** — emitted when a dispatch defers to the
  prompt stack for a continuation (disambiguation, confirm, MQL
  pick). Couples to the future prompt-stack slate. Dispatch-scoped,
  at-most-one. Sketch:
  ```ts
  { kind: 'prompt-pending', promptId: PromptId }
  ```
  Full payload (prompt kind, choices, free-text constraints) lands
  with the prompt-stack slate.
- **`pronoun-resolved`** — emitted when MQL resolves a pronoun
  reference. Informational; the rich client could show "him →
  goblin" in a debug overlay. Field-scoped, N-per-dispatch.
  Sketch:
  ```ts
  { kind: 'pronoun-resolved', field: string, pronoun: string, resolved: StuffRef }
  ```
- **`cooldown-remaining`** — emitted when a target was refused
  because a cooldown hasn't elapsed. Target-scoped, N-per-dispatch.
  Sketch:
  ```ts
  { kind: 'cooldown-remaining', target: StuffRef, msRemaining: number }
  ```
  Will surface as a per-action ability subsystem matures.

Adding more kinds is cheap. The constraint is: each kind has a
*stable typed payload* — once `quantity-clamped` declares its shape,
that shape is frozen. See [Note schema design](#note-schema-design)
below for the rules every kind follows.

---

## Note schema design

The note channel is a strictly-typed, framework-owned contract. The
rules below govern both the v1 kinds above and any future additions.

### Strict union, no escape valve

Notes are a closed discriminated union in TypeScript. Adding a note
kind means adding a union member and a typed payload alongside.
No `data: Record<string, unknown>` escape hatch, no untyped
payloads. The reason is that notes are a wire API consumed by
clients, scripts, and (later) LLM agents — loose payloads turn into
"log lines parsed by regex" within a year.

The union lives in `@saxonberg/types` so server (producers) and
client (consumers) share one source of truth. A kind that exists in
the union exists for both ends; the wire contract is auditable in
one place.

### Three scopes

Every note kind has one of three scopes. Scope is a property of the
kind, not a field in the payload — but the kind's spec documents
which scope it has and what shared base fields the scope implies.

| Scope | Meaning | Example kinds |
|---|---|---|
| **Dispatch-scoped** | About the dispatch as a whole | `activity-started`, `prompt-pending` |
| **Field-scoped** | About an MQL field resolution | `empty-result`, `match-ambiguous`, `quantity-clamped`, `quantity-clamped-rejected`, `pronoun-resolved` |
| **Target-scoped** | About a specific Stuff target | `target-declined`, `cooldown-remaining` |

Field-scoped kinds share a `field: string` base (the form-field name
from the YAML controller view) and usually a `query: string` (the
original MQL fragment). Target-scoped kinds share a
`target: StuffRef`.

### Emitter responsibility

Orthogonal to scope: each kind is emitted by either the **dispatcher**
or the **controller** (or by infrastructure layered around them —
the MQL resolver counts as dispatcher-side here). The distinction
matters because emission timing is different — dispatcher-emitted
notes can land on dispatches that never reach a controller.

| Emitter | Kinds | When |
|---|---|---|
| **Dispatcher** | `mql-error`, `validator-failed`, `permission-denied`, `match-ambiguous`, `empty-result`* | Before the controller runs; field binding / validation / permission stage. |
| **Controller** | `quantity-clamped`, `quantity-clamped-rejected`, `target-declined`, `activity-started`, `prompt-pending` | During `execute()`. |
| **Activity ticker** | `activity-progress`, `activity-completed`, `activity-cancelled` | After dispatch, on `activity-update` frames. |

\* `empty-result` sits on the boundary — MQL reports "no matches,"
the controller decides whether that's a decline or a no-op. Treated
as controller-emitted because the controller chooses to surface it.

The split is documented per-kind in this slate's roster. When adding
a new kind, declare which side emits it; that decides where the
`ctx.note()` call lives.

### Payload conventions

- **Stuff references**: always wire-safe `StuffRef` from
  `MessageApi.refOf()`. Pre-resolved display names baked in.
- **Field references**: `field: string` matching the controller's
  YAML field name.
- **Reasons**: stable wire identifiers, not display text.
  Lowercase kebab-case (`'cursed'`, `'too-heavy'`,
  `'shrine-unconsecrated'`, `'no-fuel'`). The client maps
  identifier → prose; reasons travel locale-independent on the
  wire. See [Reason strings](#reason-strings) for the full rule;
  see [Extension model](#extension-model) for how content adds
  new reasons.
- **Detail attached to a reason** goes in typed fields on the
  note kind, not nested into the reason string. So
  `{ kind: 'target-declined', target, reason: 'too-heavy', weight: 200 }`
  rather than `{ reason: 'too-heavy:200kg' }`. If a reason needs
  structured detail no existing field supports, that's the signal
  to define a new note kind (framework-tier), not to overload the
  reason string.
- **Quantities**: a fixed `requested` / `applied` / `available`
  triple, raw numbers. Unit-bearing quantities are handled by
  globbable.
- **No embedded prose**: notes carry structured reasons, not
  rendered text. The client (or the prose layer) renders.

### Cardinality

Each kind declares its cardinality per dispatch:

- **At-most-one** kinds: `activity-started`,
  `quantity-clamped-rejected`, `prompt-pending`. Re-emitting is a
  bug.
- **N-per-dispatch** kinds: `empty-result`, `match-ambiguous`,
  `pronoun-resolved`, `target-declined`. Usually keyed by field or
  target so the client can map them.

### Reason strings

Reason fields on note payloads (`target-declined`'s `reason`,
future `validator-failed`'s reason, etc.) are **wire identifiers,
not display text**. The client maps identifiers to localized
display prose; the server's `scene` channel carries server-side
rendered prose. They serve different audiences.

```ts
// Server emits:
{ kind: 'target-declined', target: <ref>, reason: 'cursed' }

// NOT:
{ kind: 'target-declined', target: <ref>, reason: "These coins are cursed and refuse to leave your hand." }
```

**Why it matters:**

- **Localization works naturally.** `'cursed'` is locale-
  independent. A French client renders "Maudit"; an English
  client "Cursed". The wire never carries localized prose.
- **Clients can render differently than the scene.** A rich
  client showing an inventory grid might display a small ⚠ icon
  with a "Cursed" tooltip while the scene prose says "Two cursed
  coins refuse to leave your hand." Two renderings, one wire
  signal.
- **Reasons are introspectable.** Tests assert
  `reason === 'cursed'`. Analytics aggregate by reason. LLM
  agents pattern-match on reason without parsing prose. All of
  this is fragile against free-form text.
- **Append-only discipline.** Same as note kinds: renaming a
  shipped reason is a breaking change (localization tables, test
  assertions, analytics). Introduce a new identifier instead.

**Convention:**

- Lowercase kebab-case.
- Names describe the *cause*, not the user-facing message.
  `'cursed'`, not `'item-rejects-being-moved'`.
- Reason vocabulary is per-controller — see
  [Extension model](#extension-model). Document a controller's
  reasons next to its declaration.

### Forward-compat: append-only kinds

Kinds are append-only. Once a kind's payload ships, that schema is
frozen forever. If a kind needs new fields, ship a new kind name
(`quantity-clamped-v2`, or a more specific name); both can coexist
on the wire during migration. Old clients ignore the new kind; new
clients prefer it.

This replaces the earlier `outcomeVersion` proposal — per-kind
freezing is finer-grained and avoids a top-level version field.

Unknown kinds arriving at a client are dropped silently (with a
console warning in dev). The server is conservative about emitting
new kinds during gradual client rollouts, but the channel is
forward-compatible by construction.

### Extension model

**The everyday extension surface is the open-enum reason field.**
Content authors emit new failure modes and structured signals
without touching the kind union or the client. Two seams:

- **Open-enumeration payload fields** — `reason: string` fields on
  existing kinds whose vocabulary grows with content. A new verb
  declares its own reason values (`'merchant-busy'`,
  `'shrine-unconsecrated'`, `'mana-depleted'`); the client falls
  back to a generic rendering when it encounters an unknown reason.
  No client coordination required.
- **Content-specific payload values** — the `StuffRef`s pointing
  at content-defined Stuff, the field names matching
  content-defined controller views. The *shape* is framework; the
  *contents* are content.

In practice this absorbs nearly every "I need to surface something
new from this content" case. New verbs, new decline modes, new
clamp situations all fit existing kinds with new reason values.

**New note kinds are framework-tier.** The rare case where content
genuinely needs a new kind — a novel interaction shape that doesn't
fit `target-declined` / `quantity-clamped*` / `empty-result` /
`match-ambiguous` / `activity-*` / `prompt-pending` — is a
framework-tier change. Adding a kind requires:

1. A new member of the `Note` union in `@saxonberg/types`.
2. A typed payload alongside.
3. A client-side renderer (or explicit no-op handler).

This isn't restrictive; it matches the natural division of labor.
Content authors and client authors are typically different roles. A
kind emitted by content without a complementary client renderer
just puts JSON on the wire that nobody reads. The framework-tier
gate ensures any new kind ships with its consumer.

**What content cannot extend:**

- New note kinds (without coordinated framework + client work).
- New top-level fields on existing kinds.

The dividing line: the kind union is the wire contract. Content
composes with the contract; it doesn't redefine it. Same pattern
as MML tags, `Property<T>` value types, and the mixin registry —
substrate is closed, content composes within it.

### Antipatterns

1. **Embedded prose in payloads.**
   `{kind: 'declined', message: "You can't do that here."}` — wrong.
   Prose belongs in `scene`. Notes carry the *reason* (a structured
   value); the client (or the prose layer) renders. A tighter
   variant of this antipattern: reason strings that read like
   prose (`reason: "you are too weak"`) instead of stable
   identifiers (`reason: 'too-weak'`). See
   [Reason strings](#reason-strings).
2. **State-mutation signals as notes.** "Your gold is now 90."
   That's state-sync, not a note. The litmus: if a witness in
   another room would also want this information, it belongs on
   the state-sync channel.
3. **Witness-of-others as notes on the actor's response.** "While
   you were doing X, Bob walked in." That's a separate `witness`
   envelope arriving in its own frame.
4. **Per-note `severity` field.** Kind discriminator already
   implies it. Adding `severity` invites authors to fudge the kind
   taxonomy.
5. **Free-form `data: unknown`.** The escape valve that erodes
   the contract. Force authors to declare a new kind.
6. **Unbounded payloads.** If a note's payload could plausibly
   carry hundreds of entries (a snapshot, a full search result),
   it's the wrong channel — that's state-sync, or paginate as
   multiple notes.
7. **Rendering hints in payloads.**
   `{kind: 'foo', color: 'red', icon: '⚠'}` — rendering is a
   client concern. The wire describes *what happened*, not *how
   to draw it*.
8. **Mutating fields on existing kinds.** If `quantity-clamped`
   needs new info, ship a new kind name. Old payload stays frozen.
9. **Content modules declaring kinds.** Kinds are framework-tier.
   Content uses existing kinds and extends payload
   open-enumerations.

---

## Naming: `notes`

The field is named **`notes`** (not `diagnostics`).

Rationale: LSP's `diagnostics` is firmly "things to surface as
warnings or errors." Our channel includes pure info
(`activity-progress`, `pronoun-resolved`, `quantity-clamped` reporting
a successful partial fulfilment) that isn't warning-shaped. `notes`
is neutral — "structured side-notes on the message" reads
accurately for the whole spectrum, from informational through
declined.

Kinds carry severity implicitly via the kind discriminator; no
separate severity field is needed (see
[Resolved](#resolved) above).

---

## Wire protocol

Today the dispatch response sends Mml to the client. Adding `outcome`
extends the wire shape:

```json
{
  "type": "dispatch-response",
  "frameId": 1001,
  "dispatchId": "dsp_42",
  "scene": <mml…>,
  "outcome": { "status": "partial", "notes": [...] }
}
```

Clients that don't know about `outcome` ignore it (additive,
backwards-compatible). The current React client treats it as
unknown-but-harmless until it grows handlers per note kind.

### Frame types

The websocket frame `type` discriminator tells the client what kind
of message arrived; all envelope-shaped frames share the same
internal shape.

| Frame type | Scene | Outcome | Semantic id | Source |
|---|---|---|---|---|
| `dispatch-response` | optional | populated | `dispatchId` | controller (response to a command) |
| `witness` | usually populated | empty or `observed-*` notes | `eventId` (+ optional `cause: dispatchId`) | EventApi witnesses (someone else acted) |
| `activity-update` | optional | `activity-progress` / `-completed` / `-cancelled` | `activityId` | activity ticker (server-push) |
| `prompt` | optional | `prompt-pending` | `promptId` | prompt stack (server-pushed continuation) |
| `state-delta` | n/a | n/a — different shape | `frameId` + optional `cause` | state-sync channel ([slate](./state-sync-slate.md)) |

The envelope-shaped frames share one client rendering pipeline; the
`state-delta` frame is a separate channel with its own shape (see
state-sync slate). Adding a new envelope-shaped frame type is
additive — clients that don't know it can safely ignore.

### Outcome shape across frame types

Status semantics only apply to dispatch-response. On other envelope
frames the field would be either decorative (`'ok'` always) or
redundant with the note kind, so it's omitted entirely:

```ts
type Envelope =
  | { type: 'dispatch-response'; frameId; dispatchId; scene; outcome: { status: Status; notes: Note[] } }
  | { type: 'witness';           frameId; eventId;    scene; outcome: { notes: Note[] } }
  | { type: 'activity-update';   frameId; activityId;        outcome: { notes: Note[] } }
  | { type: 'prompt';            frameId; promptId;   scene; outcome: { notes: Note[] } };
```

Why per-frame-type instead of one uniform shape:

- **Witness frames** depict a fact, not a request. The witnessed
  event may carry its own success/failure semantics in scene prose
  ("Bob tried to open the door but couldn't"), but the frame's
  status would conflate "did the witness fire normally" with "did
  the thing it depicts succeed." Neither is what `'ok' | 'partial'
  | 'declined'` describes.
- **Activity-update frames** encode success/failure in the *note
  kind* (`activity-completed` vs `activity-cancelled`). A separate
  status field would duplicate that signal.
- **Prompt frames** are pending, not succeeding or failing. The
  prompt is the continuation hook; no terminal status applies.

Clients read `notes` uniformly through structural typing; code that
reads `status` is narrowed by TypeScript's discriminated union to
dispatch-response. The auto-escalation rule
(see [Server-side production](#server-side-production)) applies
only on dispatch-response — notes emitted on other frames are
informational.

What would be wrong:

- Decorative `status: 'ok'` on every non-dispatch frame. Carries no
  information; invites misuse ("can a witness be `'partial'`?").
- A second `Status` enum for non-dispatch frames. Two vocabularies
  for one concept; complexity without payoff.

### Empty outcome on the wire

`outcome` is **always present** on envelope-shaped frames. Empty
notes is `notes: []`, not an absent field. The shapes for the
no-notes paths:

```json
// Dispatch-response, no notes
{"type": "dispatch-response", "frameId": 1001, "dispatchId": "dsp_42", "scene": "...", "outcome": {"status": "ok", "notes": []}}

// Witness, no notes
{"type": "witness", "frameId": 1002, "eventId": "evt_99", "scene": "...", "outcome": {"notes": []}}
```

Why always-present:

- **Compression already handles the byte cost.** Modern WebSocket
  deployments enable `permessage-deflate`; repeated JSON keys
  compress near-zero. The ~30 bytes per-frame "savings" of
  omitting an empty wrapper is already in the protocol layer.
- **Predictable shape simplifies the client.** `frame.outcome.notes`
  always works — no optional-chaining (`outcome?.notes ?? []`)
  smeared across every note consumer. TypeScript narrowing on the
  discriminated union stays clean.
- **Forgetting the optional path is a real bug class.** A renderer
  that handles only the common case will silently miss notes on
  the frames where they *do* appear. Always-present `notes: []`
  removes that footgun.

What's optional *within* `outcome`: `status` is only on
dispatch-response (per [Outcome shape across frame
types](#outcome-shape-across-frame-types)); `notes` is always
present (empty array when no notes).

### Frame metadata: `frameId` vs semantic ids

Two orthogonal id concerns, kept separate:

- **`frameId: number`** — wire-level, monotonic per connection, resets
  on reconnect. The single ordering primitive across *all* server→
  client frames (envelope-shaped and state-sync alike). Clients use
  it for gap detection ("got frame 1003 without 1002, request resync")
  and for the "state before scene" rendering invariant. Cheap
  integer; not durable.
- **Semantic ids** (`dispatchId`, `eventId`, `activityId`,
  `promptId`) — durable string identifiers. Survive reconnects. Live
  in server logs, analytics, replay tooling. Carry meaning beyond
  the wire transport.

State-sync's `cause` field references whichever semantic id
applies — `dispatchId` for command-driven deltas, `eventId` for
autonomous fires (scheduled HP regen, NPC AI tick). The two id
families don't clash by construction (different prefixes).

**Don't conflate them.** A single `correlationId` collapsing both
roles is the wrong primitive — they have different lifetimes,
different consumers, and different reset semantics.

---

## Server-side production

The controller produces both channels. Sketch:

```ts
// In a controller
class DropController {
  async execute(model: DropModel, ctx: DispatchContext) {
    // ... do the work ...
    if (clamped) {
      ctx.note({
        kind: 'quantity-clamped',
        field: 'targets',
        requested: model.targets.quantity?.value.n ?? 0,
        applied: actualUnits,
      });
    }
    return ctx.scene(/* mml */);
  }
}
```

(Most controllers don't construct notes by hand — they let
`GlobbableApi.applyQuantity` accumulate them and forward via
`result.notes.forEach(n => ctx.note(n))`. The sketch above is just
illustrative of the `DispatchContext.note` shape.)

A `DispatchContext` (or extension to the existing one) carries:

- `note(n: Note): void` — accumulates notes
- `setStatus(s: Status): void` — overrides default `ok`
- existing scene / prose hooks

The dispatcher assembles the final envelope after the controller
returns: scene from the controller's return, outcome status (per
the auto-escalation rule below), notes from the context's
accumulator.

### Auto-escalation

Most notes carry an implicit status. `note()` updates the
dispatch's status automatically using a strongest-wins merge over
the rank `ok < partial < declined < error`. Controllers override
with `setStatus()` when they want to disagree.

**Per-kind default escalation:**

| Note kind | Escalates to | Rationale |
|---|---|---|
| `quantity-clamped` | `partial` | Some work done, less than asked |
| `quantity-clamped-rejected` | `declined` | No work done; strict pre-check refused |
| `target-declined` | `partial` *(see below)* | At least one target may have succeeded |
| `empty-result` | `declined` | Couldn't find what the user meant |
| `match-ambiguous` | *(none)* | Informational; controller decides what to do |
| `activity-started` | *(none)* | Dispatch succeeded (kicked off an activity) |
| `prompt-pending` | `declined` | Dispatch incomplete; client waits for continuation |
| `mql-error` (deferred) | `declined` | Resolution failed pre-controller |
| `validator-failed` (deferred) | `declined` | Validation refused |
| `permission-denied` (deferred) | `declined` | Security refused |

**Merge rule** for multiple notes on one dispatch: strongest-wins.
If one note implies `partial` and another implies `declined`, the
result is `declined`. Order-independent.

**Controller override**: `ctx.setStatus(s)` sets the final status
explicitly. Last write wins. After `setStatus`, further `note()`
calls do not re-escalate.

**The `target-declined` wrinkle.** A single `target-declined` might
mean "all targets refused" (→ declined) or "some refused, others
succeeded" (→ partial). Per-note auto-escalation can't decide —
only the emitting helper knows the aggregate outcome. Convention:
**batch helpers like `GlobbableApi.applyQuantity` call `setStatus`
explicitly when they have full context** (`'declined'` when
`applied === 0`, `'partial'` otherwise). Individual `target-declined`
emissions outside a batch helper rely on the `partial` default.

This pattern generalizes: any helper that emits a batch of notes
and knows the aggregate outcome should set status explicitly. Pure
per-call-site emissions rely on auto-escalation.

**Pseudocode:**

```ts
class DispatchContext {
  private _status: Status = 'ok';
  private _statusExplicit = false;

  note(n: Note): void {
    this.notes.push(n);
    if (this._statusExplicit) return;
    const implied = autoEscalation(n.kind);
    if (implied && rank(implied) > rank(this._status)) {
      this._status = implied;
    }
  }

  setStatus(s: Status): void {
    this._status = s;
    this._statusExplicit = true;
  }
}
```

**Author guidance**: most controllers emit notes and never touch
status — auto-escalation does the right thing. Reach for
`setStatus` only when the default disagrees with your intent
(e.g., a controller that deliberately treats a clamp as `ok`) or
when you have batch context that the per-note defaults can't
capture.

---

## Relationship to the event system

Saxonberg has `EventApi` — a pub/sub bus for cross-cutting subscribers
(witnesses, hot-reload, lifecycle). The outcome envelope is *not*
the event system. Differences:

| | Outcome envelope | EventApi |
|---|---|---|
| Scope | This message | Cross-cutting, multi-subscriber |
| Lifetime | One message | Bus runs forever |
| Audience | The recipient client | Any registered witness |
| Schema | Typed union of Note kinds | Per-event-class payload |

**State-sync deliberately runs on the event channel, not the envelope.**
The state-sync wire frames are sourced from `EventApi` subscribers
that filter events to the client's perception scope and forward
them as `state-delta` frames. The envelope channel is for *meta
about this message*; the event channel is for *world deltas*. Both
flow over the same websocket connection but with distinct frame
types and distinct schemas.

Some emissions show up in both — a clamp event might fire on the bus
(for analytics witnesses) *and* land in the outcome (for the
originating client). That's fine; they're different concerns sharing
incidental data.

---

## Consumer touchpoints

The known consumers across the active slate set:

- **Glob subsystem** (shipped — see
  [subsystems/glob.md](../subsystems/glob.md)) — `quantity-clamped`
  (lenient overflow), `quantity-clamped-rejected` (strict pre-check
  decline), `empty-result` (no matches), and `target-declined`
  (per-target action callback returned `ok: false` with a structured
  reason). First consumer; drove the v1 shape. v1 drop/get don't
  exercise the `target-declined` path (action always succeeds); the
  collision slate's capacity-driven declines will.
- **Look fallback** — `empty-result` for "void / non-Visible" rooms;
  potentially a `verbosity-truncated` kind when scenes are clipped.
- **MQL disambiguation** — `match-ambiguous`; ships with the prompt
  stack.
- **Activity slate** — `activity-progress`, `activity-completed`,
  `activity-cancelled`; structured completion validation lives here.
- **Recognition family** — probably none in v1; the per-viewer
  description pipeline is presentation-side.
- **Prompt stack** — `prompt-pending` kind so clients can render
  multi-step flows.

---

## Resolved

- ~~**Should `outcome` carry an `effects` summary?**~~ Out of scope
  for the envelope. State changes flow through the state-sync
  channel (see [state-sync-slate](./state-sync-slate.md)). Keeps
  note kinds narrow and unifies self-action vs. witnessed-action
  state delivery on one code path.
- ~~**Versioning**: how do clients cope when a Note kind's payload
  evolves?~~ Kinds are append-only and per-kind-frozen. New shape
  ships under a new kind name; both can coexist. See
  [Forward-compat](#forward-compat-append-only-kinds).
- ~~**Severity field?**~~ No. Kind discriminator already encodes
  severity; status discriminator carries dispatch-level severity.
  A separate `severity` field invites authors to fudge the kind
  taxonomy. Revisit if a kind genuinely grows multi-severity use
  cases (so far none has).
- ~~**Note ordering**~~. Emission order on the wire, no other
  guarantee documented. Clients should treat the list as
  semantically unordered for rendering and rely on note kind +
  payload (not position) for any consumer logic.
- ~~**Workspace text output**~~ (`cat /obj/Avatar/bob.yaml`). Mml-
  wrap as `<pre>` and ride the existing `scene` slot. No schema
  churn; workspace tools speak through the same channel as
  narrative, with literal-text adornment.
- ~~**Multi-scene messages**~~ (e.g., `scry` peeking at a remote
  room). Remote scene renders as inline prose inside the actor's
  `scene` (one Mml-shaped channel), optionally accompanied by an
  `observed-remote` note carrying the structured pointer for rich
  clients. Revisit only if a future UI wants the remote room as a
  side-by-side panel.

## Open questions

- **Compaction**: high-frequency commands could spam notes. A
  per-dispatch note cap (with a `truncated` indicator) protects
  the wire from runaway. Deferred until measured — no current
  workload exercises this.

---

## v1 scope vs. follow-on

What ships first:

1. The envelope shape (`outcome.status`, `outcome.notes`) plus
   frame metadata (`frameId`, semantic ids per frame type).
2. The `DispatchContext.note()` + `setStatus()` server-side
   surface, with the auto-escalation rule wired in.
3. Wire-protocol extension (additive; clients that don't know
   `outcome` ignore it).
4. Frame-type discriminator for the websocket layer
   (`dispatch-response`, `witness`, `activity-update`, `prompt`).
5. First consumer (globbable) emits `quantity-clamped`,
   `quantity-clamped-rejected`, `empty-result`, and
   `target-declined` (the last is wired but unexercised by
   v1 drop/get; exercised when collision slate ships).

What follows opportunistically as each consumer lands:

- `match-ambiguous` + `prompt-pending` together (with the prompt
  stack).
- Look fallback's full use of `empty-result` (the kind is in v1;
  the look-fallback verb adoption is separate).
- `activity-started`, `activity-progress`, `activity-completed` /
  `activity-cancelled` (with the activity slate).
- Renderer handlers in the rich client per note kind.
- Deferred kinds (`mql-error`, `validator-failed`,
  `permission-denied`, `pronoun-resolved`, `cooldown-remaining`)
  as their producing infrastructure lands.

---

## Cross-references

- [docs/subsystems/messaging.md](../subsystems/messaging.md) — MML
  scope; what the envelope's scene channel carries.
- [docs/subsystems/command-routing.md](../subsystems/command-routing.md)
  — dispatch pipeline; the assembly point for the envelope.
- [docs/slates/state-sync-slate.md](./state-sync-slate.md) — the
  sibling channel for world state changes; deliberately separate
  from this envelope.
- [docs/subsystems/glob.md](../subsystems/glob.md) — first concrete
  consumer (shipped).
- [docs/slates/activity-slate.md](./activity-slate.md) — completion
  validation as structured outcomes.
