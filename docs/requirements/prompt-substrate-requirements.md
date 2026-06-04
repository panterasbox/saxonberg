# Prompt substrate — requirements

A closed-scope build for the **server-side prompt mechanism**, the
**base-prompt rendering substrate** the player's command-line prompt
area depends on, and the **command-spec cardinality vocabulary** that
threads MQL resolution → cardinality constraint → prompt-driven
refinement into a coherent author-facing surface.

The PromptApi half is Chunk 2.5 from
`docs/plans/client-foundation-readiness.md` — the second of two big
server-only substrates after the MQL subscription work that just
merged. The base-prompt half is a small set of dispatch-response
extensions that, together with the PromptApi work, give the client
cockpit a complete prompt story to consume. The cardinality work is
the command-spec evolution that gives the PromptApi a real first
consumer (disambiguation via the dispatcher) instead of leaving it
sitting waiting for callers.

Seeded by [docs/slates/prompt-stack-slate.md](../slates/prompt-stack-slate.md).
Related: [docs/subsystems/response-envelope.md](../subsystems/response-envelope.md)
for the envelope family this lives inside;
[docs/subsystems/mql-subscription.md](../subsystems/mql-subscription.md)
for the pattern (per-Interactive substrate API, envelopes via
`MessageApi.sendEnvelope`, inbound dispatcher routing) this build
mirrors; [docs/subsystems/command-spec.md](../subsystems/command-spec.md)
and [docs/subsystems/command-routing.md](../subsystems/command-routing.md)
for the dispatcher / authoring surfaces that grow here.

## Goals

- **Server callers can `await` an interactive prompt** on an
  Interactive's holder. Tier 1 surface: `choice`, `confirm`,
  `text`, `mqlObject`, `mqlMany` (the multi-select sibling of
  `mqlObject`, promoted to Tier 1 to support the cardinality work
  below).
- **A per-Interactive prompt stack exists server-side**, mirroring
  what the client renders. Pushes append; responses pop by id;
  random-order answering supported.
- **Validators (sync OR async) keep prompts alive** on validation
  failure, emitting `prompt-validation-failed` envelopes and
  awaiting the next response.
- **Cancellation is uniform across triggers** (player gesture,
  server-side, disconnect). Awaiting promises reject with a
  typed `PromptCancelledError` carrying the reason.
- **Player can cancel all pending prompts via a `prompt cancel`
  command** that rides the normal command bus. The `prompt`
  verb is reserved as the player's surface for prompt-related
  actions; v1 ships only the `cancel` subcommand, with future
  actions (`prompt set <format>`, `prompt show`, etc.) landing
  additively against the same controller.
- **Disconnect cleans up cleanly** — `PromptApi.cancelAll` runs
  before `removeInteractive` so envelopes can ship while the
  Interactive is still addressable.
- **Inbound dispatch routes `prompt-response` and `prompt-cancel`**
  to the substrate at `Application.processUserMessage`, alongside
  the existing `command` and `mql-subscribe` / `mql-unsubscribe`
  cases.
- **Outbound envelopes ride `MessageApi.sendEnvelope`** so shadow
  filters / audit observers see the same channel they see for
  dispatch responses and subscription deltas.
- **Base-prompt rendering uses a Liquid template + MUD-style
  refresh.** A new player setting `prompt.format` (default
  `{{ focus }}`) controls what the client renders in its command-
  line prompt area; the server renders the template at dispatch-
  response composition time and ships the result on a new
  `prompt-refresh` Note inside every `DispatchResponseEnvelope`.
- **Empty commands refresh the prompt** — an Enter-only command
  short-circuits to a dispatch-response carrying only the
  `prompt-refresh` Note.
- **FocusedMixin exposes `getFocus()` into the Liquid render
  context** so the default `{{ focus }}` template resolves
  without ceremony.
- **Command-spec cardinality vocabulary** — `object` and `objects`
  field types gain optional `cardinality`, `onExcess`, and
  `onShortage` knobs that let the author declare what shape of
  result they want from MQL resolution. The dispatcher consumes
  this vocabulary, picking the appropriate resolver
  (`resolveOne` vs `resolveMany`) and routing N→K refinement
  through the PromptApi's `mqlObject` / `mqlMany` prompts when
  the author opts in.
- **Dispatcher (cardinality × got × policy) matrix lands**, mapping
  every combination of authored intent + resolution count to a
  concrete action (execute, push prompt, truncate, error).
  Backward-compatible defaults preserve every shipped command's
  current behavior.
- **New wire types in `@saxonberg/types`** cover the prompt-
  content Notes, inbound message types, refresh Note, and any
  new envelope kinds.
- **Subsystem doc at `docs/subsystems/prompt.md`** describes the
  full surface for future authors. `docs/subsystems/command-spec.md`
  and `docs/subsystems/command-routing.md` gain the cardinality
  vocabulary + dispatcher matrix.

## Non-goals

- **Tier 2 / Tier 3 prompt kinds** (`numeric`, `multiChoice`,
  `password`, `paginated`, `quiz`). The slate's tiering defers
  these per content demand. `mqlMany` was Tier 2 in the slate but
  is **promoted to Tier 1 in this build** because the cardinality
  work needs it; the other Tier 2 / Tier 3 kinds stay deferred.
- **Priority spectrum** (`toast`, `preempting`). v1 ships one
  boolean — `foreground` — instead of a multi-valued spectrum.
  Replace-vs-push semantics, modal prompts, timeouts: deferred.
- **Behavior flags** (`cancelable: false`, prompt timeouts,
  modal-blocking, multi-Interactive sync). No real use cases yet
  and shipping unused machinery commits us to design decisions
  prematurely.
- **Sync-validator unification with commands.** Command validators
  are sync-by-design because the dispatcher's validator pass is
  sync; prompt validators run in an async-friendly lifecycle and
  the use cases (DB uniqueness checks, MQL resolution checks)
  legitimately want async. The two surfaces stay separate;
  subsystem docs explain the divergence.
- **Live MQL subscription for the base prompt.** The slate's
  forward-looking design envisions `me.promptTokens` as a
  subscription. v1 uses MUD-style refresh-on-dispatch-response
  instead — the cost-vs-benefit favors MUD-style for the prompt's
  short-text use case, and live-status state (HP, MV, etc.)
  belongs in dedicated widgets with their own subscriptions, not
  in the prompt format.
- **FocusedMixin `subscribableFields`.** Not needed under MUD-
  style refresh — exposing `getFocus()` to the Liquid context is
  the only wiring this build adds. Mixin-side subscribability
  for `focus` ships independently if and when an MQL consumer
  needs it.
- **Wholesale cancel as a dedicated wire message type
  (`PromptCancelAllMessage`).** The capability rides on the
  `prompt cancel` command instead; the wire grows by zero
  inbound types.
- **Single-target cancel via the `prompt` verb.** The X button
  already covers per-prompt cancel via the `prompt-cancel` wire
  message; `prompt cancel` from the verb always cancels all.
  Single-target verb form (`prompt cancel <position>`) lands
  additively if a real use case appears.
- **Custom prompt kinds outside the Tier 1 canon.** The escape
  valve is `text` + caller-side validation. New kinds require
  slate review.
- **Per-prompt response / dismissal `MessageFrame`s from the
  substrate.** Push-side body emission is one MessageFrame
  correlated by `promptId`; response and dismissal echoes are
  client-side local-echo (already designed in the slate's
  snapshot-on-send section, not server work).
- **Token-format prompt richness beyond `{{ focus }}`.** v1 ships
  the minimal Liquid context (focus only). Future tokens
  (`{{ posture }}`, `{{ location.name }}`, `{{ time }}`) get
  added as content demands; same Liquid render, just a wider
  context.
- **"Prompt to find more" on shortage.** The cardinality
  vocabulary's `onShortage` knob ships with one value in v1
  (`error`). Re-prompting the player to widen their MQL query
  when the result set is too small is a UX problem that
  involves text editing of MQL queries; out of scope.
- **Runtime cardinality overrides via command opts.** A future
  `take 3 sword` syntax that overrides a command's declared
  cardinality at issue time is its own design conversation
  (where do opts live in the grammar; what's the precedence;
  how do non-numeric overrides look?). Deferred. v1 cardinality
  is purely author-declared.
- **Replacing `type: object` / `type: objects` with a unified
  `type: stuff`.** The cardinality vocabulary is additive — both
  type tags stay, and the cardinality knobs sit alongside as
  optional overrides. Unification (if ever) is a separate
  authoring-vocabulary cleanup pass.

## Surface decisions

### Tier 1 surface — five kinds

`PromptApi` ships five methods in v1:

```ts
choice(iact, label, choices, opts?): Promise<string>
confirm(iact, label, defaultAnswer?, opts?): Promise<boolean>
text(iact, label, opts?): Promise<string>
mqlObject(iact, label, matches: Stuff[], opts?): Promise<Stuff | null>
mqlMany(
  iact, label, matches: Stuff[],
  opts?: { min?: number; max?: number; foreground?; validate?; body? }
): Promise<Stuff[]>
```

`opts` carries `{ foreground?: boolean; validate?: Validator; body?:
string | Mml }`; `mqlMany` adds `min` / `max` for the selection
bounds. `mqlObject` is the only one that can resolve with `null` —
the others resolve with their typed result (`mqlMany` resolves with
a possibly-empty array; bounds enforcement keeps the array's length
in `[min, max]`).

`mqlMany` is the slate's Tier 2 multi-select MQL prompt promoted
into v1 because the cardinality vocabulary (below) needs it as the
N→K refinement primitive. Other Tier 2 kinds (`numeric`,
`multiChoice`, `password`) stay deferred — they're orthogonal.

### Priority — `foreground: boolean`, not a spectrum

The slate floated a multi-valued priority spectrum (`demanding` /
`passive` / `toast` / `preempting`). On review this conflates
unrelated vectors:

- Whether the new prompt seizes input (foreground vs. background)
- Visual accenting (a separate decoration concern)
- Stack-interaction constraints (preempting, modal)

The substrate ships **only** `foreground: boolean` (default `true`).
A foreground push tells the client to auto-focus; a background push
joins the stack without seizing input. Decoration and stack-
interaction flags are orthogonal vectors added when content asks.

### Behavior flags — none in v1

`cancelable: false`, prompt timeouts, modality, multi-Interactive
sync, preempting, etc. — none ship. The substrate treats every
prompt as cancelable and timeout-less. New flags get added against
specific use cases rather than speculatively.

### Validator — async permitted

Validator signature:

```ts
type PromptValidator<T> =
  (response: T) => true | string | Promise<true | string>
```

Returning `true` resolves the await. Returning a string (or a
Promise that resolves to one) keeps the prompt alive and emits a
`prompt-validation-failed` envelope carrying the message.

Why async-permitted (and divergent from command validators):
prompts already run inside an async lifecycle; the runtime caller
already wrote `await`; in-flight validation is naturally absorbed by
the prompt's "alive, awaiting next response" state. The DB-
uniqueness check ("is this name already taken?") is the canonical
v1 use case and forcing it through a sync + preload pattern would
be awkward.

The substrate handles cancel-during-validate: a prompt that's
cancelled while a validate is in flight discards the validate's
eventual result. Standard pattern with a "cancelled" flag on the
resolver record.

Both subsystem docs (the new prompt one and the existing command
one) include a "why these validators don't share an interface"
note.

### `mqlObject` is pure pass-through

The substrate does NOT retain the `matches: Stuff[]` array after
push. When a `prompt-response` arrives carrying a `stuffId`, the
substrate:

1. Calls `StuffApi.findById(stuffId)`.
2. Resolves the await with whatever that returns (Stuff or null).

No validation against the original match set. No retries / re-
prompts for stale or bogus picks. The caller's controller handles
`null` via its normal failure path; the failure message tells the
player to retry the command. Substrate is transparent; UX is
transparent.

### `mqlMany` substrate enforces selection bounds

`mqlMany` differs from `mqlObject` in that the prompt's identity
includes a count constraint (`[min, max]`). The substrate
retains `min` / `max` on the resolver record and enforces them
on response:

1. Parse the response payload as JSON-encoded array of stuffIds.
2. If parse fails OR the array is not a string-array, emit
   `prompt-validation-failed` with a typed message; prompt stays
   alive.
3. If the array length is outside `[min, max]`, emit
   `prompt-validation-failed` with a bounds-violation message;
   prompt stays alive.
4. Otherwise, map each stuffId through `StuffApi.findById`,
   filter out the nulls (destroyed Stuffs since push), and
   resolve the await with the resulting `Stuff[]`.

A destroyed-Stuff drop could push the resolved count below `min`.
This is intentionally tolerated — the substrate does NOT re-emit
a validation-failed at this stage; the caller / controller sees a
short array and decides how to react (most controllers will treat
this as a normal failure and emit the standard "try again" path).
Re-prompting for stale picks goes the same direction as
"mqlObject pass-through": substrate is transparent about state
that changed under it.

Response wire encoding for `mqlMany`: JSON-encoded array of
stuffIds in the `response` field. Comma-separated tokens would
require escaping discipline; JSON sidesteps it entirely and reads
the same on both sides.

### Command-spec cardinality vocabulary

The `object` and `objects` field types stay; they gain three
optional knobs.

**`object` (single-target):**

```yaml
fields:
  target:
    type: object
    mql: sword
    onExcess: top | prompt | error    # default: top
    # cardinality is implicitly { exactly: 1 }; not configurable
    # onShortage is implicitly: error
```

- `onExcess: top` (default) — dispatcher calls `MqlApi.resolveOne`;
  takes the highest-scored match. Current behavior; no migration.
- `onExcess: prompt` — dispatcher calls `MqlApi.resolveMany`;
  when N>1, pushes `mqlObject` and awaits the pick; when N=1,
  executes; when N=0, errors (no match).
- `onExcess: error` — dispatcher calls `MqlApi.resolveMany`;
  N>1 → fail with an "ambiguous" error; N=1 → execute; N=0 →
  fail (no match).

(`truncate` is not valid on `object`; truncating to 1 == `top`.)

**`objects` (multi-target):**

```yaml
fields:
  targets:
    type: objects
    mql: sword
    cardinality:
      min: 1         # default: 0
      max: 3         # default: Infinity (no upper bound)
      exactly: 3     # sugar; sets min == max == 3
    onExcess: take-all | prompt | truncate | error    # default depends; see below
    onShortage: error    # default and only v1 value
```

- `cardinality` defaults preserve current behavior:
  `min: 0, max: Infinity` (take whatever resolved).
- `onExcess` default depends on whether `max` is explicitly set:
  - `max` unset → `take-all` (current behavior; max is unbounded
    so nothing is in excess).
  - `max` set → `prompt` (the author declared a cap; pushing
    `mqlMany` to narrow is the user-friendly default).
- `onExcess: take-all` — execute with everything resolved
  regardless of `max`. `max` becomes documentary if used this way.
- `onExcess: prompt` — when N > max, push `mqlMany` with the
  bounds; execute with returned K (where min ≤ K ≤ max).
- `onExcess: truncate` — when N > max, execute with the top max
  matches. Silently drops the rest.
- `onExcess: error` — when N > max, fail with a "too many" error.
- `onShortage: error` — when N < min, fail with an "insufficient
  matches" error. This is the only v1 value; "prompt to widen
  your MQL query" is deferred per non-goals.

The vocabulary is additive: every existing command stays
compiling without edits. Existing `type: object` semantics ===
`type: object` + default `onExcess: top`. Existing
`type: objects` semantics === `type: objects` + default
`take-all` (because `max` is unset by default).

### Dispatcher decision matrix

The dispatcher applies the (cardinality × got × policy) matrix
between MQL resolution and controller execution. Cleanly tabular
so that authoring intent maps directly to runtime action:

**`object` field (cardinality implicitly 1):**

| got | `onExcess: top` | `onExcess: prompt` | `onExcess: error` |
|---|---|---|---|
| 0 | error (no match) | error (no match) | error (no match) |
| 1 | execute | execute | execute |
| >1 | execute with matches[0] | push `mqlObject`, execute with pick | error (ambiguous) |

**`objects` field with `cardinality: { min, max }`:**

| got | `take-all` | `prompt` | `truncate` | `error` |
|---|---|---|---|---|
| < min | error (insufficient) | error (insufficient) | error (insufficient) | error (insufficient) |
| in [min,max] | execute | execute | execute | execute |
| > max (max=∞) | execute with all | execute with all | execute with all | execute with all |
| > max (max<∞) | execute with all (max ignored) | push `mqlMany`, execute with K∈[min,max] | execute with top max | error (too many) |

Dispatcher chooses the cheapest resolver path:

- For `object` with `onExcess: top` → `MqlApi.resolveOne`
  (returns just the top match; no list materialization).
- Everywhere else → `MqlApi.resolveMany` (full sorted list
  needed for counting / prompting / truncating).

### `prompt cancel` propagates through disambiguation

A dispatcher-pushed `mqlObject` or `mqlMany` prompt is an `await`
inside the dispatcher's command-handling path. If the player
runs `prompt cancel` while that prompt is pending:

1. `PromptApi.cancelAll(interactive, 'cancelled')` rejects the
   resolver's promise with `PromptCancelledError { reason:
   'cancelled' }`.
2. The dispatcher's `await` throws.
3. The dispatcher catches `PromptCancelledError` and emits a
   `DispatchResponseEnvelope` with a cancelled-status note,
   ending the command-handling cleanly.

The originating command does NOT execute; the controller is never
called. From the player's perspective: their `take sword` was
abandoned, they see a "cancelled" line in the terminal, and the
command stack is empty.

The same propagation runs on disconnect (rejection is the same
shape, `reason: 'host-disconnected'`). The dispatcher's catch
treats either reason the same way: emit cancelled-status,
clean up.

Authoring guidance: controllers that push prompts wrap their
awaits in normal try/catch and handle `PromptCancelledError`
explicitly only when they need to (e.g. roll back partial state).
The default propagation is handled at the dispatcher level
without per-controller code.

### Two-slot question shape — mandatory `label`, optional `body`

Every push carries a mandatory short `label: string` (rendered in
the client's command-line prompt slot — typically the chip the
player sees while answering) plus an optional `body: string | Mml`
in `opts` (long-form prose for the terminal scroll).

Wire-side, the `label` lives on the prompt-content Note inside the
`PromptEnvelope`. The body, when present, is shipped as a separate
`MessageFrame` on the `world.prompt` topic with `payload:
{ promptId }` so the client can correlate the long-form frame
with the prompt envelope (visual highlight, click-to-focus, etc.).

The substrate handles emission atomically:

1. If `body` is set, fire `MessageApi.scene(actor).topic('world.prompt')`
   with `payload: { promptId }` and the body prose.
2. Push the `PromptEnvelope` with the prompt-content Note carrying
   the `label`.

Authors who want prose preceding the prompt that's NOT the body
explanation emit their own `MessageApi.scene(...)` calls before
calling `PromptApi`; those carry no `promptId` and land as
ordinary terminal prose.

Response and dismissal echoes are client-side local-echo via the
slate's snapshot-on-send pattern. The substrate emits nothing on
those events beyond the dismissal `PromptEnvelope`.

### Custom error — `PromptCancelledError`

Awaiting promises reject with:

```ts
class PromptCancelledError extends Error {
  readonly reason: 'cancelled' | 'host-disconnected';
}
```

Codebase precedent: `MqlPermissionError`, `SecurityError`,
`ContainmentError` all carry typed `Error` subclasses for clean
`instanceof` branching. Same pattern here. Lives alongside the
substrate (file location is a planner concern).

`reason: 'cancelled'` covers both client-initiated `prompt-cancel`
and `cancelAll` triggered by the `cancel-prompts` command.
`'host-disconnected'` is reserved for the disconnect cleanup
path. Additional reasons added when concrete content needs them.

### Outbound delivery — `MessageApi.sendEnvelope(holder, template)`

Every server-pushed envelope (`PromptEnvelope` push, `prompt-
validation-failed`, `prompt-dismissed`) is shipped via
`MessageApi.sendEnvelope(holder, template)` — the same path
`MqlSubscriptionApi` uses. The Sensor pipeline therefore sees
prompt envelopes; shadow filters and audit observers consume them
on the same channel they consume dispatch responses and
subscription deltas.

### Inbound dispatch — two new types in `Application.processUserMessage`

The inbound switch grows by two cases:

```ts
case 'prompt-response':
  PromptApi.handleResponse(interactive, payload);
  break;
case 'prompt-cancel':
  PromptApi.handleCancel(interactive, payload);
  break;
```

Bypassing the command bus is deliberate (the slate's two-channel
inbound protocol). Wholesale cancel rides the command bus
separately via `cancel-prompts`.

### Disconnect ordering

`Application.handleUserDisconnect` runs cleanup in this order:

```ts
1. Resolve Interactive from socketId.
2. MqlSubscriptionApi.cancelAllForInteractive(interactive);
3. PromptApi.cancelAll(interactive, 'host-disconnected');
4. ConnectionManager.removeInteractive(socketId);
```

Both cancel passes run while the Interactive is still live so any
final envelope delivery during cancellation can address the Interactive
sanely. Both reject pending awaits with their respective custom
errors.

### Wholesale cancel — `prompt cancel` command, not a wire type

A new command verb `prompt` ships with one subcommand in v1:
`cancel`. `prompt cancel` cancels every pending prompt on the
giver's Interactive — the controller calls
`PromptApi.cancelAll(interactive, 'cancelled')`. Wire-side this
is a normal `command` message — no dedicated inbound type.

The `prompt` verb is reserved as the player's surface for
prompt-related actions. Future subcommands (`prompt set
<format>`, `prompt show`, etc.) land additively against the same
controller; the v1 controller branches on the first arg and
rejects unknown subcommands with a validator-style error that
names the canon.

Single-target cancel via the verb (`prompt cancel <position>`)
isn't shipped — the X button covers that case via the
`prompt-cancel` wire message. `prompt cancel` always cancels all.
If a future use case demands single-target verb cancellation it
lands additively.

Per-prompt cancel (`prompt-cancel` wire message) stays direct;
that's the X-button affordance and belongs on the prompt channel.

Rationale: cancel-all is genuinely command-shaped (the player is
invoking an action), whereas per-prompt cancel is the prompt
channel's response shape (responding to a specific prompt by
killing it). Different semantics → different channels.

`PromptApi.cancelAll(interactive, reason)` is a public substrate
method: the controller calls it, the disconnect path calls it, any
future caller can.

### Base-prompt rendering — MUD-style refresh, not live subscription

The client's command-line prompt area (`[here] >`) is content the
server renders and ships. The shape:

- **Setting:** `prompt.format` via `EnvironmentMixin`. Default
  value: `{{ focus }}>` — leaves the player at e.g. `here>` or
  `the brass kettle>` after the template renders. Players change
  it via the existing `settings` / `set` command vocabulary.
- **Rendering:** server renders the Liquid template via
  `ProseApi.format(...)` at dispatch-response composition time.
  v1 context exposes one variable, `focus` (sourced from
  `FocusedMixin.getFocus()`). Future tokens added as content
  demands (`posture`, `location.name`, `time`).
- **Wire:** every `DispatchResponseEnvelope` carries a new
  `prompt-refresh { rendered: string }` Note inside its
  `outcome.notes`. The client updates its base-prompt state on
  receipt.
- **Refresh path:** an empty command line (Enter only) short-
  circuits at the dispatcher to a `DispatchResponseEnvelope`
  carrying only the `prompt-refresh` Note. MUD-style "press Enter
  for a fresh prompt."

Why MUD-style over live subscription:

- Cost scales with format complexity × source-field fire rate.
  Live subscription on a 5-token format with HP regen ticking
  every second = 5+ deltas/second/player just for the prompt.
- Live-status state (HP, MV, combat ticker, vitals) belongs in
  dedicated widgets that own their own subscriptions — already in
  Phase 3 plan. The prompt is for short stateful labels
  (focus, mode, posture-tag, time-of-day) which don't fire often.
- The legibility goal — player always sees their focus at MQL-
  chain time — is satisfied because the prompt refreshes on every
  command, which is exactly when the player needs that
  information for the next command.
- Author surface is dramatically simpler — one Liquid template +
  standard ProseApi rendering, no novel "templated subscription
  whose dependency set comes from the template body" machinery.

### `FocusedMixin` exposes `getFocus()` to the Liquid context

Single-line wiring: the dispatch-response context-builder for
`ProseApi.format` reads `getFocus()` off the giver (when present)
and binds it as `focus`. No `subscribableFields` declaration, no
event firing, no MQL subscription seam. The cheapest possible
hook into the prompt-format pipeline.

When (if) a future MQL consumer needs live `focus` subscription,
adding `subscribableFields` + a `fireFieldChange` in `setFocus` /
`clearFocus` is small and additive. Out of scope here.

## Constraints

- **Through `Application.processUserMessage` / `handleUserDisconnect`.**
  The substrate doesn't reach into the connection layer directly;
  inbound dispatch routes through the application dispatcher, and
  cleanup runs in the disconnect handler in the documented order.
- **Through `MessageApi.sendEnvelope(holder, template)` for outbound
  envelopes.** Same Sensor pipeline as dispatch-response and
  subscription delta envelopes.
- **`SecurityApi.decorateApiClass(PromptApi)`** at the end of the
  Api file, matching every other Api in the codebase
  (CLAUDE.md "New Apis end with SecurityApi.decorateApiClass").
- **No `#`-private state on instance methods of Stuff-host mixins.**
  PromptApi is a static Api (`#`-private fine on Api class-level
  state; no instance proxy receiver concerns). Standard pattern.
- **Per-`Interactive.nextFrameId` ordering.** PromptApi's outbound
  envelopes stamp `frameId` via the existing per-Interactive
  monotonic counter so prompts order naturally relative to
  dispatch-response and subscription deltas.
- **Authoring guidance: prompts ride a different channel from
  commands.** Authors writing controllers that need user input
  reach for `PromptApi`. Authors writing prompts that need
  validation reach for the prompt's `validate` option (sync or
  async — the prompt's lifecycle absorbs it).
- **Antipattern check:** the substrate is a NEW Api, in conflict
  with `feedback_no_new_apis_default`. Justification on file
  with the slate (the substrate is genuinely substrate-shaped
  with its own state, resolver lifecycle, and wire vocabulary —
  same justification that landed `MqlSubscriptionApi`).
- **`MqlObject` returns `Promise<Stuff | null>`, not
  `Promise<Stuff>`.** The slate's `Promise<Stuff>` shape is
  superseded — substrate is pure pass-through, so null is a
  natural outcome of stale / bogus picks.

## Acceptance criteria

### Substrate behavior

- `PromptApi.choice(iact, label, choices)` returns a `Promise<string>`.
  Synthetic client sends a `prompt-response` with one of the
  declared `response` tokens; the await resolves with that token.
  Tested end-to-end against a synthetic client.
- `PromptApi.confirm(iact, label, defaultAnswer)` returns a
  `Promise<boolean>`. Tested.
- `PromptApi.text(iact, label, opts)` returns a `Promise<string>`.
  Tested.
- `PromptApi.mqlObject(iact, label, matches)` returns a
  `Promise<Stuff | null>`. Picking a valid stuffId resolves with
  the corresponding Stuff. Picking a bogus stuffId (or one for a
  destroyed Stuff) resolves with `null`. Tested.
- `PromptApi.mqlMany(iact, label, matches, { min, max })`
  returns a `Promise<Stuff[]>`. Selecting K stuffIds where
  `min ≤ K ≤ max` resolves with the resolved Stuffs (destroyed
  ones dropped silently). Tested.
- `mqlMany` substrate enforces bounds: selecting outside
  `[min, max]` keeps the prompt alive and emits
  `prompt-validation-failed`. Tested for both under-min and
  over-max cases.
- `mqlMany` response with malformed JSON or non-string-array
  payload keeps the prompt alive and emits validation-failed.
  Tested.
- Validators returning a string keep the prompt alive, emit
  `prompt-validation-failed` envelope, await the next response,
  then resolve when validation passes. Tested for both sync and
  async validators.
- `foreground: false` push emits a `PromptEnvelope` with the flag
  set; the substrate doesn't otherwise alter delivery. Tested.

### Body / correlation

- A push with `opts.body` set emits a `world.prompt` MessageFrame
  with `payload: { promptId }` immediately before the
  `PromptEnvelope`. Tested via envelope ordering on the synthetic
  client.
- A push with no `body` emits only the envelope; no MessageFrame.

### Cancellation

- Client-initiated `prompt-cancel { promptId }` rejects the
  awaiting promise with `PromptCancelledError { reason: 'cancelled' }`
  and emits a `prompt-dismissed` envelope with `reason: 'cancelled'`.
  Tested.
- Server-side `PromptApi.cancel(promptId)` / `cancelAll(iact,
  reason)` reject every affected await with the matching reason
  and emit per-prompt `prompt-dismissed` envelopes.
- `Application.handleUserDisconnect` calls
  `PromptApi.cancelAll(interactive, 'host-disconnected')` BEFORE
  `ConnectionManager.removeInteractive`. Pending awaits reject
  with `reason: 'host-disconnected'`. Tested via spy call order.
- After `cancelAll`, the substrate's per-Interactive state is
  empty (no leaked resolvers or stack entries). Tested.

### `prompt` command

- A YAML view + controller for `prompt` ships under the normal
  command file structure (`mud/cmd/prompt.yaml` +
  `obj/command/PromptController.ts`).
- The verb takes a single required arg `subcommand: string`.
- v1 recognized subcommands: `cancel`. The controller dispatches
  on the subcommand; unknown subcommands return a validator-style
  error that names the recognized set (e.g. "unknown prompt
  subcommand 'xyz'; valid: cancel").
- `prompt cancel` calls `PromptApi.cancelAll(giver.interactive,
  'cancelled')` and reports the count of cancelled prompts (e.g.
  "cancelled 3 prompts" / "no prompts to cancel") via the normal
  dispatch-response channel.
- Verb gated to actors that compose `HasInteractive` (the giver
  must have an Interactive to cancel prompts on).
- Tested end-to-end: push two prompts, run `prompt cancel`, both
  prompt awaits reject, dispatch-response says "cancelled 2".
- Tested: unknown subcommand → validator error; doesn't reach
  PromptApi.

### Inbound dispatch

- `Application.processUserMessage` routes `prompt-response` and
  `prompt-cancel` to `PromptApi`. The existing `command` and
  `mql-subscribe` / `mql-unsubscribe` cases continue working
  unchanged.
- Malformed `prompt-response` payload (missing `promptId` or
  `response`) drops silently.

### Command-spec cardinality vocabulary

- `object` field declarations accept optional
  `onExcess: top | prompt | error` (default `top`). Verified
  via a sample command YAML for each option.
- `objects` field declarations accept optional
  `cardinality: { min?, max?, exactly? }` and
  `onExcess: take-all | prompt | truncate | error` and
  `onShortage: error`. Defaults applied where omitted per the
  matrix.
- Schema validation rejects nonsensical combinations
  (e.g. `cardinality: { min: 5, max: 3 }`, `onExcess: top` on
  `objects`, `onExcess: truncate` on `object`).
- Every existing shipped command continues passing its tests
  without YAML edits — backward compat preserved.

### Dispatcher matrix

- **`object` × `onExcess: top` × N matches:** dispatcher calls
  `MqlApi.resolveOne`; controller receives top match (N≥1) or
  fails cleanly (N=0). Tested.
- **`object` × `onExcess: prompt` × N>1:** dispatcher calls
  `MqlApi.resolveMany`, pushes `mqlObject`, awaits, then calls
  the controller with the picked Stuff. Tested end-to-end with
  synthetic client picking from chips.
- **`object` × `onExcess: error` × N>1:** dispatcher emits an
  "ambiguous" error response, controller never called. Tested.
- **`objects` × `cardinality: { max: 3 }` × `onExcess: prompt` ×
  N=5:** dispatcher pushes `mqlMany` with the bounds, awaits
  K∈[1,3] picks, calls controller with `Stuff[]` of length K.
  Tested.
- **`objects` × `onExcess: truncate` × N>max:** controller
  receives top `max` matches. Tested.
- **`objects` × `cardinality: { min: 2 }` × N=1:** dispatcher
  emits "insufficient matches" error, controller never called.
  Tested.
- Dispatcher chooses the cheapest resolver path
  (`resolveOne` when only the top is needed; `resolveMany`
  otherwise). Verified via spy on each resolver method.

### Cancellation propagation through disambiguation

- A `take sword` command with `onExcess: prompt` triggers an
  `mqlObject` prompt. Player runs `prompt cancel` while the
  prompt is pending. Dispatcher catches the
  `PromptCancelledError`, emits a cancelled-status
  `DispatchResponseEnvelope`, and the controller is never
  invoked. Tested end-to-end.
- Same propagation on disconnect mid-prompt: the dispatcher's
  await throws with `reason: 'host-disconnected'`, and the
  command-handling cleans up without writing partial state.
  Tested.

### Base-prompt rendering

- `prompt.format` is registered as a settable via `EnvironmentMixin`'s
  schema with default value `{{ focus }}`.
- `DispatchResponseEnvelope` carries a `prompt-refresh
  { rendered: string }` Note in `outcome.notes` on every
  dispatcher response.
- The rendered string is the result of `ProseApi.format(template,
  { focus })` where `focus` is the giver's current
  `FocusedMixin.getFocus()` value. Tested with default template
  and a custom template (e.g. `{{ focus }} ready>`).
- An empty command line (Enter only) short-circuits to a
  `DispatchResponseEnvelope` carrying only the `prompt-refresh`
  Note (no controller dispatch, no other notes). Tested.
- Givers that don't compose `FocusedMixin` produce a refresh Note
  with a sensible fallback (e.g. `focus` resolves to empty
  string; the template renders accordingly). Tested.

### Wire surface

- New Note kinds in `@saxonberg/types`:
  `ChoicePromptNote`, `ConfirmPromptNote`, `TextPromptNote`,
  `MqlObjectPromptNote`, `MqlManyPromptNote`,
  `PromptValidationFailedNote`, `PromptDismissedNote`,
  `PromptRefreshNote`. The `Note` union grows by eight kinds.
- New inbound message types in `@saxonberg/types`:
  `PromptResponseMessage`, `PromptCancelMessage`. Documented in
  the same file alongside the existing `MqlSubscribeMessage`.
- No new envelope kinds — `PromptEnvelope` already exists and
  carries all push / validation-failure / dismissal payloads via
  its `outcome.notes`.
- TypeScript build + downstream consumers compile clean.

### Docs

- A subsystem doc at `docs/subsystems/prompt.md` describes:
  - The substrate's surface (`PromptApi` methods, error class,
    push / response / cancel lifecycle).
  - Wire shape (envelopes, Note kinds, inbound messages).
  - Two-channel inbound: prompt-response / prompt-cancel
    bypass the command bus; the `prompt` verb (including
    `prompt cancel`) rides the command bus.
  - The cardinality vocabulary on command specs and the
    dispatcher matrix that consumes it (cross-referenced from
    `command-spec.md` + `command-routing.md`).
- `docs/subsystems/command-spec.md` gains the cardinality /
  onExcess / onShortage author-facing fields with worked
  examples.
- `docs/subsystems/command-routing.md` gains the dispatcher
  decision matrix and the resolver-path selection logic
  (`resolveOne` vs `resolveMany`).
  - Validator semantics + why they diverge from command
    validators.
  - Base-prompt rendering via `prompt.format` + the Liquid
    context + the refresh Note + the empty-command refresh path.
  - Disconnect ordering (sibling to MQL subscription cleanup).
- `CLAUDE.md` gains a pointer to the new subsystem doc in the
  subsystem-list block.
- `docs/architecture.md` mentions `PromptApi` in the Api
  examples list.
- `docs/antipatterns.md` gains (if relevant) an entry for "ride
  PromptApi rather than building custom prompt-shaped flows."

### Tests

- Unit tests for `PromptApi` covering the resolver map, stack
  state, validate-pass, validate-fail, cancellation, disconnect
  cleanup.
- Integration test exercising the full lifecycle against a
  synthetic Interactive: push a `choice` → respond → await
  resolves; push with validate → respond with invalid → see
  `prompt-validation-failed` → respond with valid → resolve;
  push two prompts → `cancel-prompts` verb → both reject.
- Base-prompt refresh test: send command → assert dispatch-
  response includes `prompt-refresh` Note with the rendered
  template; send empty command → assert refresh-only dispatch-
  response; change `prompt.format` via setting → next command's
  refresh Note carries the new format.

## Cross-references

### Seeding slates

- [docs/slates/prompt-stack-slate.md](../slates/prompt-stack-slate.md)
  — the prompt stack design + wire shape + UX model. v1
  substrate scope.

### Subsystem docs

- [docs/subsystems/response-envelope.md](../subsystems/response-envelope.md)
  — `PromptEnvelope` shape; the envelope family this substrate
  ships into.
- [docs/subsystems/mql-subscription.md](../subsystems/mql-subscription.md)
  — pattern reference (per-Interactive registry, envelopes via
  `MessageApi.sendEnvelope`, inbound dispatch routes, disconnect
  ordering, test seams). This substrate mirrors that pattern
  closely.
- [docs/subsystems/messaging.md](../subsystems/messaging.md) —
  `MessageApi.sendEnvelope` and the Sensor pipeline.
- [docs/subsystems/command-routing.md](../subsystems/command-routing.md)
  — the `cancel-prompts` verb authoring shape.
- [docs/subsystems/command-spec.md](../subsystems/command-spec.md)
  — controller / YAML pair conventions for the new verb.
- [docs/subsystems/prose.md](../subsystems/prose.md) —
  `ProseApi.format` Liquid rendering used by the base-prompt
  template.
- [docs/subsystems/shell-environment.md](../subsystems/shell-environment.md)
  — `EnvironmentMixin` settings keyspace; `prompt.format`
  registers here.

### Plans / readiness

- [docs/plans/client-foundation-readiness.md](../plans/client-foundation-readiness.md)
  Chunk 2.5 — `PromptApi` substrate. This requirements doc
  closes that chunk, plus the base-prompt rendering carve-out
  that the slate flagged as a client-side wave-1 prerequisite,
  plus the command-spec cardinality vocabulary that gives the
  PromptApi a real first consumer through the dispatcher.

### Feedback memory cross-cuts

- `feedback_no_new_apis_default` — PromptApi is a NEW Api; the
  substrate-shape justification (own state, resolver lifecycle,
  wire vocabulary) is the same one that landed
  `MqlSubscriptionApi`. Documented in the slate.
- `feedback_substrate_no_content_hooks` — `prompt.format` is
  per-entity (player setting), not a substrate-side content
  registry. Aligned.
- `feedback_named_for_proper_names` — N/A (no Named usage here),
  but the broader "every mixin docstring must say what it ISN'T
  for" rule applies to any new mixin work (none planned in this
  build).
