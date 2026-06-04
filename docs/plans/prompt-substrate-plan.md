# Prompt substrate — implementation plan

## Plan overview

This plan ships the closed-scope build defined in
`docs/requirements/prompt-substrate-requirements.md`. The output is
three intertwined pieces:

1. **`PromptApi`** — server-side prompt substrate. Five Tier 1
   methods (`choice` / `confirm` / `text` / `mqlObject` /
   `mqlMany`). Per-Interactive resolver map. Async-permitted
   validator + retry. Cancellation choreography (player gesture /
   server-side / disconnect). Inbound dispatcher routes for
   `prompt-response` / `prompt-cancel`. Outbound envelopes via
   `MessageApi.sendEnvelope`. Custom `PromptCancelledError`.
2. **Base-prompt rendering substrate** — `prompt.format` setting
   via `EnvironmentMixin` (default `{{ focus }}>`), ProseApi-based
   Liquid render at dispatch-response composition, new
   `prompt-refresh` Note kind on every `DispatchResponseEnvelope`,
   empty-command short-circuit, `FocusedMixin.getFocus()` exposed
   in the Liquid context.
3. **Command-spec cardinality vocabulary + dispatcher matrix** —
   `object` and `objects` field types gain `cardinality` /
   `onExcess` / `onShortage` knobs. Dispatcher consumes them
   through a (cardinality × got × policy) decision matrix,
   choosing `MqlApi.resolveOne` vs `resolveMany` per cheapest
   path. Disambiguation routes through `mqlObject` / `mqlMany`
   prompts. `PromptCancelledError` propagates through the
   dispatcher cleanly. Backward-compat invariant: every shipped
   command continues to work with zero YAML edits.

The plan decomposes into **seven commits** (Waves 1–7). Each wave
is a coherent commit landing testable behavior; later waves depend
on earlier waves. The full build lands on a branch named
`prompt-substrate`. After Wave 7, a `docs:` commit ships the
subsystem doc + CLAUDE.md / architecture.md / antipatterns updates
per the requirements doc's Documentation section.

A fresh build agent should read, in order:

1. `docs/requirements/prompt-substrate-requirements.md` — closed-
   scope requirements; every "Surface decisions" section is
   final.
2. `docs/slates/prompt-stack-slate.md` — richer design context
   than the requirements doc.
3. `docs/plans/mql-subscription-substrate-plan.md` — **the
   structural template**. The MQL substrate work just merged
   uses this plan shape (six waves, each commit-shaped, with
   "Files to create / edit / public surface / tests / commit
   message draft" sections). Mirror it here.
4. `docs/subsystems/mql-subscription.md` — the **pattern this
   build mirrors**. Per-Interactive substrate state. Envelopes
   via `MessageApi.sendEnvelope`. Inbound dispatcher routing.
   Disconnect ordering. Test seams (`_clearAllForTesting`).
   Synthetic-client integration test shape.
5. `docs/subsystems/response-envelope.md` — `PromptEnvelope`
   already exists. New Note kinds ride inside `outcome.notes`.
   Per-Interactive `nextFrameId` ordering.
6. `docs/subsystems/command-spec.md` and
   `docs/subsystems/command-routing.md` — current YAML +
   dispatcher. Wave 6 grows these substantially.
7. `docs/subsystems/prose.md` — `ProseApi.format` Liquid render
   used by Wave 5.
8. `docs/subsystems/shell-environment.md` — `EnvironmentMixin`
   settings keyspace; `prompt.format` registers here.
9. `CLAUDE.md` — module categories, file naming, member privacy
   rules, "Go through the Api layer" antipatterns.

## Naming decisions

| Concept | Name | Rationale |
|---|---|---|
| Branch | `prompt-substrate` | Matches the `mql-sub` convention from the prior plan; descriptive but compact. |
| New Api file | `packages/server/src/mud/api/prompt.ts` | Lowercase Api file convention. |
| New Api class | `PromptApi` | Standard `XApi` form. |
| Error class file | `packages/server/src/mud/api/prompt.ts` (inline) | The class is small and only thrown by `PromptApi` callers; inlining keeps the substrate self-contained. Pattern matches `MqlPermissionError` (which lives in `api/mql/permissions.ts` alongside its consumer). |
| Error class | `PromptCancelledError extends Error` | `Cancelled` past tense reads naturally with `catch (err) { if (err instanceof PromptCancelledError) ... }`. |
| Resolver record type | `PromptResolverRecord<T>` | Internal-only; not exported. |
| Per-Interactive index | `#byInteractive: Map<Interactive, Set<string>>` | `Set<promptId>` per Interactive; lets `cancelAll(iact, reason)` operate in O(N) without walking the global resolver map. |
| Validator type | `PromptValidator<T>` | Exported from `api/prompt.ts`. Signature: `(response: T) => true \| string \| Promise<true \| string>`. |
| Command YAML | `packages/server/src/mud/cmd/prompt.yaml` | Lowercase verb name convention. |
| Command controller | `packages/server/src/mud/obj/command/PromptController.ts` | Standard `VerbNameController` pattern. |
| Wire — Note kinds | `ChoicePromptNote`, `ConfirmPromptNote`, `TextPromptNote`, `MqlObjectPromptNote`, `MqlManyPromptNote`, `PromptValidationFailedNote`, `PromptDismissedNote`, `PromptRefreshNote` | Match the slate spellings (`prompt-choice`, `prompt-confirm`, ...) for the `kind` field; type names match the codebase's `<Subject>Note` convention. |
| Wire — inbound messages | `PromptResponseMessage`, `PromptCancelMessage` | Live next to existing `MqlSubscribeMessage` / `MqlUnsubscribeMessage` in `@saxonberg/types`. |
| Body MessageFrame topic | `'world.prompt'` | Per the requirements doc; player-facing prose; not engine instrumentation. |
| Body MessageFrame payload | `{ promptId: string }` | Carried on `MessageFrame.payload` per existing wire shape. |
| Validation-failed kind discriminator | `kind: 'prompt-validation-failed'` | Matches slate. |
| Dismissed kind discriminator | `kind: 'prompt-dismissed'` | Matches slate; v1 `reason` enum is `'answered' \| 'cancelled' \| 'host-disconnected'` (no `'replaced'` since preempting is deferred). |
| Refresh kind discriminator | `kind: 'prompt-refresh'` | Slate-shape. Payload carries the rendered string. |
| Setting key | `'prompt.format'` | Lowercase dotted-namespace per the existing `shell-environment.md` convention (matches `shell.parser`, `workspace.tree`, etc.). |
| Liquid context binder | `buildPromptContext(giver: Stuff): Record<string, unknown>` | Substrate-private helper. Returns `{ focus: giver.getFocus?.() ?? '' }`. |
| Cardinality YAML field | `cardinality: { min?, max?, exactly? }` | Per the requirements doc. |
| Dispatch policy YAML fields | `onExcess`, `onShortage` | Per the requirements doc. |
| Cardinality resolver helper | `CommandApi.resolveCardinality(spec, ctx): Promise<{ resolved: Stuff[]; outcome: 'execute' \| 'error'; details? }>` | Implementation detail; the dispatcher calls this between the existing MQL resolve step and controller dispatch. |

## Implicit decisions (planner's call)

The requirements doc names these out, leaving them to the plan:

1. **Where the inline body emit happens.** The substrate's push
   lifecycle (Wave 2) emits the body `MessageFrame` via
   `MessageApi.scene(holder).topic('world.prompt')` per the
   requirements doc. The slate's existing `scene` builder may not
   have a `.payload(x)` method today. **Decision:** check
   `api/message.ts` during Wave 2; if `payload` isn't supported on
   the scene builder, add a small `.payload({ promptId })` step
   following the existing `.topic()` / `.toSelf()` chain shape. If
   that turns into invasive plumbing, fall back to using
   `MessageApi.sendMessage(holder, frame)` directly with an
   inline-constructed `MessageFrame` carrying the payload field.
   Document the choice in the subsystem doc.

2. **Resolver record stores reject-only on cancellation.** A
   pending validate (e.g. async DB uniqueness check) that's in
   flight when cancel fires must NOT call `resolve(...)` after
   the cancel. Record carries a `cancelled: boolean` flag the
   validate-then-resolve path checks before calling `resolve`.
   Standard cancellation-safety pattern.

3. **`#stacks` map is omitted from substrate state.** The slate
   shows two structures (`#resolvers` + `#stacks`). The substrate
   doesn't actually need ordering for its own behavior — every
   operation (response, cancel, cancelAll) keys by `promptId` or
   `Interactive`. The client owns the stack-display ordering;
   server tracks `#resolvers: Map<promptId, ResolverRecord>` +
   `#byInteractive: Map<Interactive, Set<promptId>>` for
   O(N) `cancelAll`. Wire-side, push envelopes ride
   `Interactive.nextFrameId` per existing ordering primitive, so
   the client can reconstruct push order.

4. **`prompt` verb subcommand parsing.** The controller branches
   on `args.subcommand` (a `string` field). v1 valid values:
   `'cancel'`. Unknown subcommands return a controller-rejected
   note (`Scene.send + ctx.note({ kind: 'controller-rejected',
   reason: 'unknown-subcommand', detail: 'unknown prompt subcommand
   X; valid: cancel' })`). The dispatcher emits the standard
   dispatch-response envelope as usual.

5. **Validator type adapter for `confirm`.** The validator
   signature is `(response: T) => true | string | Promise<...>`.
   For `confirm`, the substrate's internal handling parses the
   wire `response: string` (`'yes'` / `'no'`) into a `boolean`
   BEFORE passing to the user-supplied validator. So a confirm
   validator sees `(response: boolean) => ...`, even though the
   wire response is a string. Substrate handles the conversion.

6. **`mqlObject` / `mqlMany` validator semantics.** The user-
   supplied `validate` runs against the **resolved Stuff(s)**, not
   the raw stuffId(s). For `mqlObject`, validate signature is
   `(response: Stuff | null) => ...`. For `mqlMany`, validate
   signature is `(response: Stuff[]) => ...`. Substrate runs
   resolution (the `findById` pass) BEFORE validate. This means a
   validator can inspect the actual Stuff before approving (e.g.
   `if (!MixinApi.isContainable(picked)) return 'that's not
   takeable'`). Bounds enforcement for `mqlMany` (the K∈[min,max]
   check) runs BEFORE validate — bounds violation is a wire-shape
   issue, not a user-validator concern.

7. **`prompt-refresh` Note attachment chokepoint.** Every
   `DispatchResponseEnvelope` carries the Note. The natural
   chokepoint is the envelope-building helper that
   `CommandGiverMixin.executeCommand` (or wherever the dispatch-
   response envelope is composed) uses. **Decision:** add a
   centralized step in the response-build path: after the
   `CommandContext` accumulator's notes are collected, prepend
   (or append — Note order doesn't carry meaning in v1) a
   `PromptRefreshNote` carrying the rendered template.
   Implementation: extract or extend the `buildDispatchResponse`
   call site to call `renderPromptRefresh(giver)` and inject the
   Note. The Wave 5 plan specifies the exact location after
   reading `CommandGiverMixin.executeCommand`.

8. **Empty-command short-circuit lives in
   `Application.handleCommandMessage`.** Before parsing /
   dispatch, if the command text trims to empty, the application
   composes a `DispatchResponseEnvelope` with only the
   `prompt-refresh` Note (no controller dispatch, no validator
   pass, no notes from any source). The dispatch envelope's
   `outcome.status` is `'ok'` and `dispatchId` is generated
   normally so the client's snapshot-on-send still pairs the echo
   to whatever the prompt area showed at send time.

9. **Cardinality vocabulary lives in the command-spec schema.**
   The existing YAML field-spec parser gets the new optional
   knobs. Cardinality validation (e.g. `min > max` rejection)
   happens at YAML load time, not at dispatch time. **Decision:**
   the validation lives in whatever schema-validation pass
   `CommandApi.preloadAll` or its equivalent runs; failures throw
   at load time so a broken command never ships.

10. **`CommandApi.resolveCardinality` is the dispatcher seam.**
    The dispatcher today calls `MqlApi.resolveOne` or `resolveMany`
    inline based on `type: object` / `type: objects`. After this
    plan, that call site routes through a new
    `CommandApi.resolveCardinality(spec, ctx)` helper that:
    - reads the cardinality + onExcess + onShortage knobs (with
      defaults applied);
    - picks the cheapest resolver (`resolveOne` when `object` +
      `onExcess: top`, `resolveMany` otherwise);
    - applies the (cardinality × got × policy) matrix;
    - when policy is `prompt`, calls `PromptApi.mqlObject` or
      `PromptApi.mqlMany` and awaits the resolution;
    - returns either `{ outcome: 'execute', resolved: Stuff[] }` or
      `{ outcome: 'error', message: string }` or throws
      `PromptCancelledError`.
    The dispatcher's existing field-binding loop awaits this and
    either continues (execute) or short-circuits to a dispatch-
    response (error) or catches PromptCancelledError and emits a
    cancelled-status response.

11. **Backward-compat sanity test.** A small test asserts that
    `CommandApi.resolveCardinality` for a YAML field declared as
    bare `type: object` (no other knobs) is observably equivalent
    to the prior `MqlApi.resolveOne` call. Same for `type: objects`
    + no knobs → `resolveMany` + take-all. Catches a regression in
    defaults before content tests start failing.

12. **`PromptApi` tests use the same Avatar+Interactive fixture
    pattern** the MQL substrate tests landed (Wave 4 of the MQL
    plan). Reuse that scaffolding rather than building parallel
    fixtures.

13. **`MqlObjectPromptNote` and `MqlManyPromptNote` carry
    `matches: { stuffId; displayName }[]`** — pre-projected at
    push time. The substrate doesn't ship Stuff references over
    the wire (Stuff isn't serializable in general). The
    projection follows the `MessageApi.refOf` pattern (stuffId +
    `DescribeApi.getDisplayName(stuff, viewer)`).

14. **Wave-5 base-prompt rendering can ship without Wave-6
    cardinality.** The waves are dependency-ordered such that
    Wave 5 (base-prompt) is independent from Wave 6 (cardinality);
    if the build agent splits across sessions, Wave 5 is a clean
    self-contained landing point.

## Wave 1 — Wire types + Note kinds + error class

**Goal.** Land the typed surface every later wave compiles against.
No behavior; pure type definitions.

**Files to create.**

- `packages/server/src/mud/api/__tests__/prompt-types.test.ts`
  (smoke test that constructs each Note kind by name to catch
  union breakage early).

**Files to edit.**

- `packages/types/src/index.ts` — add:
  - `ChoicePromptNote`, `ConfirmPromptNote`, `TextPromptNote`,
    `MqlObjectPromptNote`, `MqlManyPromptNote` (the five Tier 1
    push-content kinds).
  - `PromptValidationFailedNote` — `{ kind:
    'prompt-validation-failed'; message: string; field?: string }`.
  - `PromptDismissedNote` — `{ kind: 'prompt-dismissed'; reason:
    'answered' \| 'cancelled' \| 'host-disconnected' }`.
  - `PromptRefreshNote` — `{ kind: 'prompt-refresh'; rendered:
    string }`.
  - `PromptResponseMessage` — `{ type: 'prompt-response'; payload:
    { promptId: string; response: string } }`.
  - `PromptCancelMessage` — `{ type: 'prompt-cancel'; payload: {
    promptId: string } }`.
  - Extend the `Note` union to include all seven prompt-content
    Note kinds.
  - Document the Note's payload contract for each kind in a doc-
    comment block alongside the type.

- `packages/server/src/mud/api/prompt.ts` (NEW, types-only at this
  wave) — declare `PromptCancelledError extends Error` with
  `reason: 'cancelled' \| 'host-disconnected'`. Plus the
  `PromptValidator<T>` exported type:
  ```ts
  export type PromptValidator<T> = (response: T) =>
    | true | string | Promise<true | string>;
  ```

**Public surface introduced.**

```ts
// @saxonberg/types:
export interface ChoicePromptNote { kind: 'prompt-choice'; label: string; choices: PromptChoice[]; }
export interface ConfirmPromptNote { kind: 'prompt-confirm'; label: string; defaultAnswer: 'yes' | 'no'; }
export interface TextPromptNote { kind: 'prompt-text'; label: string; placeholder?: string; }
export interface MqlObjectPromptNote { kind: 'prompt-mql-object'; label: string; matches: { stuffId: string; displayName: string }[]; }
export interface MqlManyPromptNote { kind: 'prompt-mql-many'; label: string; matches: { stuffId: string; displayName: string }[]; min?: number; max?: number; }
export interface PromptValidationFailedNote { kind: 'prompt-validation-failed'; message: string; field?: string; }
export interface PromptDismissedNote { kind: 'prompt-dismissed'; reason: 'answered' | 'cancelled' | 'host-disconnected'; }
export interface PromptRefreshNote { kind: 'prompt-refresh'; rendered: string; }
export interface PromptResponseMessage { type: 'prompt-response'; payload: { promptId: string; response: string }; }
export interface PromptCancelMessage { type: 'prompt-cancel'; payload: { promptId: string }; }
export interface PromptChoice { label: string; response: string; }

// Note union (extends existing):
export type Note = /* existing kinds */ | ChoicePromptNote | ConfirmPromptNote | TextPromptNote
  | MqlObjectPromptNote | MqlManyPromptNote | PromptValidationFailedNote | PromptDismissedNote
  | PromptRefreshNote;

// mud/api/prompt.ts:
export class PromptCancelledError extends Error {
  constructor(public readonly reason: 'cancelled' | 'host-disconnected') {
    super(`Prompt cancelled: ${reason}`);
    this.name = 'PromptCancelledError';
  }
}
export type PromptValidator<T> = (response: T) => true | string | Promise<true | string>;
```

**Tests verifying this wave.**

- `prompt-types.test.ts` — construct each Note kind via a literal;
  assigns to the typed Note union; TS compiles. Pure sanity / catch
  union shape drift.

**Commit message draft.**

```
feat(prompt): wire types + Note kinds + error class

Ship the typed surface every later wave compiles against:

- Five Tier 1 prompt-content Note kinds (choice / confirm / text /
  mql-object / mql-many).
- prompt-validation-failed, prompt-dismissed, prompt-refresh Notes.
- Inbound message types: PromptResponseMessage, PromptCancelMessage.
- PromptCancelledError + PromptValidator<T> in api/prompt.ts.

Note union grows by eight kinds; envelope union unchanged
(PromptEnvelope already exists and carries all prompt traffic via
outcome.notes).

Behavior wires up in Wave 2 onward.
```

## Wave 2 — `PromptApi` substrate core

**Goal.** Ship `PromptApi` with all five Tier 1 methods, the
resolver lifecycle, validate + retry, cancellation, and outbound
envelope delivery via `MessageApi.sendEnvelope`. No inbound
dispatcher routing yet (Wave 3); tests call the public surface
directly.

**Files to create.**

- `packages/server/src/mud/api/__tests__/prompt.lifecycle.test.ts`
  — push → respond → resolve for each Tier 1 kind.
- `packages/server/src/mud/api/__tests__/prompt.validation.test.ts`
  — sync + async validator paths; validation-failed envelope;
  prompt stays alive; re-respond + resolve.
- `packages/server/src/mud/api/__tests__/prompt.cancellation.test.ts`
  — `cancel(promptId)`, `cancelAll(iact, reason)`, cancel-during-
  validate.
- `packages/server/src/mud/api/__tests__/prompt.bounds.test.ts`
  — mqlMany bounds enforcement (under-min, over-max, malformed
  JSON, non-string-array payload).
- `packages/server/src/mud/api/__tests__/prompt.body.test.ts`
  — body MessageFrame correlation by `promptId`; push without
  body emits envelope only.

**Files to edit.**

- `packages/server/src/mud/api/prompt.ts` — grow to the full
  `PromptApi` class. Add `SecurityApi.decorateApiClass(PromptApi)`
  at file end.

**Public surface introduced.**

```ts
export class PromptApi {
  static choice<T extends string = string>(
    interactive: Interactive,
    label: string,
    choices: { label: string; response: T }[],
    opts?: PromptOpts<T>,
  ): Promise<T>;

  static confirm(
    interactive: Interactive,
    label: string,
    defaultAnswer?: 'yes' | 'no',
    opts?: PromptOpts<boolean>,
  ): Promise<boolean>;

  static text(
    interactive: Interactive,
    label: string,
    opts?: PromptOpts<string> & { placeholder?: string },
  ): Promise<string>;

  static mqlObject(
    interactive: Interactive,
    label: string,
    matches: Stuff[],
    opts?: PromptOpts<Stuff | null>,
  ): Promise<Stuff | null>;

  static mqlMany(
    interactive: Interactive,
    label: string,
    matches: Stuff[],
    opts?: PromptOpts<Stuff[]> & { min?: number; max?: number },
  ): Promise<Stuff[]>;

  // Inbound entry points (called by Application.processUserMessage
  // in Wave 3; public so tests can call directly).
  static handleResponse(interactive: Interactive, payload:
    { promptId: string; response: string }): void;
  static handleCancel(interactive: Interactive, payload:
    { promptId: string }): void;

  // Server-side cancellation.
  static cancel(promptId: string, reason?:
    'cancelled' | 'host-disconnected'): boolean;
  static cancelAll(interactive: Interactive, reason:
    'cancelled' | 'host-disconnected'): number;

  // Test seams (under SecurityApi.assertTestOnly).
  static _getResolverCountForTesting(): number;
  static _getInteractivePromptCountForTesting(iact: Interactive): number;
  static _clearAllForTesting(): void;
}

export interface PromptOpts<T> {
  foreground?: boolean;           // default true
  validate?: PromptValidator<T>;
  body?: string | Mml;
}
```

**Internal types** (not exported):

```ts
interface PromptResolverRecord<T> {
  promptId: string;
  interactive: Interactive;
  resolve: (value: T) => void;
  reject: (err: Error) => void;
  validate?: PromptValidator<T>;
  // mqlMany-specific:
  min?: number;
  max?: number;
  // mqlObject / mqlMany-specific: kept so the response handler
  // can resolve picks against the original push set's stuffId
  // set (informational only; we trust findById for actual
  // resolution but the substrate doesn't validate membership
  // per the requirements).
  // For 'confirm', wire response is 'yes' / 'no' string; the
  // resolver's T is boolean. The handler converts.
  // Cancellation-safety flag — set true on cancel; pending
  // validates check before calling resolve.
  cancelled: boolean;
  // For kind discrimination at handleResponse time:
  kind: 'choice' | 'confirm' | 'text' | 'mqlObject' | 'mqlMany';
}
```

**Substrate state.**

```ts
static #resolvers = new Map<string, PromptResolverRecord<unknown>>();
static #byInteractive = new Map<Interactive, Set<string>>();
```

**`push` internals (shared by all five Tier 1 methods).**

Outline (planner pseudo-code; build agent writes the real code):

```ts
private static async push<T>(
  interactive: Interactive,
  contentNote: Note,             // ChoicePromptNote / ConfirmPromptNote / ...
  opts: PromptOpts<T>,
  recordExtras: Partial<PromptResolverRecord<T>>,
): Promise<T> {
  const promptId = nanoid();
  const holder = interactive.getHolder();
  if (!holder || !MixinApi.isSensor(holder)) {
    throw new Error('PromptApi.push: interactive has no Sensor holder');
  }
  return new Promise<T>((resolve, reject) => {
    const record: PromptResolverRecord<T> = {
      promptId,
      interactive,
      resolve,
      reject,
      validate: opts.validate,
      cancelled: false,
      ...recordExtras,
    } as PromptResolverRecord<T>;
    this.#resolvers.set(promptId, record as PromptResolverRecord<unknown>);
    let bucket = this.#byInteractive.get(interactive);
    if (!bucket) {
      bucket = new Set();
      this.#byInteractive.set(interactive, bucket);
    }
    bucket.add(promptId);

    // Body MessageFrame (correlated by promptId).
    if (opts.body !== undefined) {
      MessageApi.scene(holder as Stuff & Sensor)
        .topic('world.prompt')
        // .payload({ promptId })  -- see implicit decision 1
        .toSelf(typeof opts.body === 'string' ? Mml.compose`${opts.body}` : opts.body)
        .send();
      // If scene builder doesn't support .payload, fall back to a
      // direct MessageApi.sendMessage(holder, frame) with payload
      // attached.
    }

    // Push envelope.
    const template: Omit<PromptEnvelope, 'frameId'> = {
      type: 'prompt',
      promptId,
      outcome: { notes: [contentNote] },
    };
    MessageApi.sendEnvelope(holder as Stuff & Sensor, template);
  });
}
```

**`handleResponse` outline.**

```ts
static handleResponse(interactive, payload): void {
  const record = this.#resolvers.get(payload.promptId);
  if (!record) return;
  if (record.interactive !== interactive) return;  // tampered

  // Decode the wire response into the resolver's typed T.
  let typed: unknown;
  switch (record.kind) {
    case 'choice':
    case 'text':
      typed = payload.response;
      break;
    case 'confirm':
      typed = (payload.response === 'yes');
      break;
    case 'mqlObject':
      typed = StuffApi.findById(payload.response) ?? null;
      break;
    case 'mqlMany':
      try {
        const ids = JSON.parse(payload.response);
        if (!Array.isArray(ids) || ids.some(x => typeof x !== 'string')) {
          this.#emitValidationFailed(record, 'response must be a JSON array of stuffIds');
          return;
        }
        if (record.max !== undefined && ids.length > record.max) {
          this.#emitValidationFailed(record, `selected ${ids.length}, max is ${record.max}`);
          return;
        }
        if (record.min !== undefined && ids.length < record.min) {
          this.#emitValidationFailed(record, `selected ${ids.length}, min is ${record.min}`);
          return;
        }
        typed = ids.map(id => StuffApi.findById(id)).filter(s => s !== undefined);
      } catch (err) {
        this.#emitValidationFailed(record, 'response is not valid JSON');
        return;
      }
      break;
  }

  // Run validator if present.
  if (record.validate) {
    void this.#runValidateAndResolve(record, typed);
    return;
  }

  this.#dismissAndResolve(record, typed);
}

static async #runValidateAndResolve(record, typed): Promise<void> {
  let result: true | string;
  try {
    result = await record.validate(typed);
  } catch (err) {
    // Validator threw — emit validation-failed with the error
    // message; keep prompt alive.
    this.#emitValidationFailed(record, err instanceof Error ? err.message : String(err));
    return;
  }
  if (record.cancelled) return;  // cancel won the race; discard.
  if (result === true) {
    this.#dismissAndResolve(record, typed);
  } else {
    this.#emitValidationFailed(record, result);
  }
}

static #dismissAndResolve(record, typed): void {
  this.#cleanup(record);
  this.#emitDismissed(record, 'answered');
  record.resolve(typed);
}

static #emitValidationFailed(record, message): void {
  const holder = record.interactive.getHolder();
  if (!holder || !MixinApi.isSensor(holder)) return;
  MessageApi.sendEnvelope(holder as Stuff & Sensor, {
    type: 'prompt',
    promptId: record.promptId,
    outcome: { notes: [{ kind: 'prompt-validation-failed', message }] },
  });
}
```

**`handleCancel` outline.**

```ts
static handleCancel(interactive, payload): void {
  const record = this.#resolvers.get(payload.promptId);
  if (!record) return;
  if (record.interactive !== interactive) return;
  this.#cancelOne(record, 'cancelled');
}

private static #cancelOne(record, reason): void {
  record.cancelled = true;
  this.#cleanup(record);
  this.#emitDismissed(record, reason);
  record.reject(new PromptCancelledError(reason));
}

static cancel(promptId, reason = 'cancelled'): boolean {
  const record = this.#resolvers.get(promptId);
  if (!record) return false;
  this.#cancelOne(record, reason);
  return true;
}

static cancelAll(interactive, reason): number {
  const bucket = this.#byInteractive.get(interactive);
  if (!bucket) return 0;
  const count = bucket.size;
  // Snapshot ids; #cancelOne mutates the bucket.
  for (const id of [...bucket]) {
    const r = this.#resolvers.get(id);
    if (r) this.#cancelOne(r, reason);
  }
  return count;
}

private static #cleanup(record): void {
  this.#resolvers.delete(record.promptId);
  const bucket = this.#byInteractive.get(record.interactive);
  if (bucket) {
    bucket.delete(record.promptId);
    if (bucket.size === 0) this.#byInteractive.delete(record.interactive);
  }
}
```

**Tests verifying this wave.**

- **`prompt.lifecycle.test.ts`** — for each Tier 1 method: push,
  capture envelope via `vi.spyOn(avatar, 'onEnvelope')`, simulate
  client response via `PromptApi.handleResponse(interactive,
  { promptId, response: 'foo' })`, assert await resolves with the
  right typed value. Confirm dismissed envelope shipped.
- **`prompt.validation.test.ts`** — sync validator returning string
  keeps prompt alive; validation-failed envelope shipped; second
  response with valid value resolves. Async validator path: same
  shape with awaited validator. Validator throwing: caught,
  message becomes the validation-failed text.
- **`prompt.cancellation.test.ts`** — `cancel(promptId)` rejects
  await with `PromptCancelledError { reason: 'cancelled' }`,
  dismissed envelope reason `'cancelled'` shipped. `cancelAll(iact,
  'host-disconnected')` rejects every pending await with
  `'host-disconnected'`. Cancel-during-validate: async validator
  takes 50ms; cancel fires at 20ms; validator resolves at 50ms;
  no `resolve` called on already-cancelled record (uses fake
  timers).
- **`prompt.bounds.test.ts`** — `mqlMany` with `{ min: 1, max: 3 }`:
  selecting 0 → validation-failed (under-min); selecting 4 →
  validation-failed (over-max); selecting 2 → resolves with the
  Stuffs. Malformed JSON → validation-failed. Non-string-array
  payload (`'[1, 2]'`) → validation-failed.
- **`prompt.body.test.ts`** — push with `opts.body` set: the
  recorded envelopes show the body `MessageFrame` (topic
  `'world.prompt'`, payload `{ promptId }`) BEFORE the
  `PromptEnvelope`. Push without `body`: only the envelope, no
  MessageFrame.

**Commit message draft.**

```
feat(prompt): PromptApi substrate — push / response / cancel

Land the substrate: per-Interactive resolver map (#resolvers +
#byInteractive index), all five Tier 1 methods (choice / confirm
/ text / mqlObject / mqlMany), validate + retry with async-
permitted validators, cancellation lifecycle (single + all),
cancel-during-validate guard, body MessageFrame correlated by
promptId, outbound envelopes via MessageApi.sendEnvelope.

No inbound dispatcher routing yet — handleResponse / handleCancel
are public so tests can drive the substrate directly. Wave 3
wires Application.processUserMessage.

PromptCancelledError rejects awaits on cancel; reason
discriminates 'cancelled' vs 'host-disconnected' (latter wired
in Wave 3 disconnect cleanup).
```

## Wave 3 — Inbound dispatcher routes + disconnect cleanup

**Goal.** Wire `Application.processUserMessage` to route
`prompt-response` / `prompt-cancel` to `PromptApi`. Wire
`Application.handleUserDisconnect` to call `cancelAll` BEFORE
removing the Interactive.

**Files to edit.**

- `packages/server/src/backend/Application.ts` — extend the
  inbound switch (alongside the existing `mql-subscribe` /
  `mql-unsubscribe` cases that landed with the MQL substrate).
  Extend `handleUserDisconnect` to call
  `PromptApi.cancelAll(interactive, 'host-disconnected')` between
  the existing `MqlSubscriptionApi.cancelAllForInteractive` call
  and `ConnectionManager.removeInteractive`.

**Files to create.**

- `packages/server/src/backend/__tests__/Application.prompt-routes.test.ts`
  — extends the existing Application test scaffolding (the
  `mql-subscribe` test ships alongside as a structural template).

**Edit detail.**

In `Application.processUserMessage`, after the existing
`mql-unsubscribe` case, add:

```ts
case 'prompt-response':
  this.handlePromptResponse(socketId, message);
  break;

case 'prompt-cancel':
  this.handlePromptCancel(socketId, message);
  break;
```

Plus the two private handlers:

```ts
private handlePromptResponse(socketId: string, message: InboundClientMessage): void {
  const interactive = ConnectionManager.get().getInteractive(socketId);
  if (!interactive) return;
  const payload = message.payload as PromptResponseMessage['payload'] | undefined;
  if (
    !payload ||
    typeof payload.promptId !== 'string' ||
    typeof payload.response !== 'string'
  ) {
    return;
  }
  PromptApi.handleResponse(interactive, payload);
}

private handlePromptCancel(socketId: string, message: InboundClientMessage): void {
  const interactive = ConnectionManager.get().getInteractive(socketId);
  if (!interactive) return;
  const payload = message.payload as PromptCancelMessage['payload'] | undefined;
  if (!payload || typeof payload.promptId !== 'string') return;
  PromptApi.handleCancel(interactive, payload);
}
```

In `handleUserDisconnect`:

```ts
public handleUserDisconnect(socketId: string): void {
  console.info(`Application: User disconnecting - socketId=${socketId}`);

  const interactive = ConnectionManager.get().getInteractive(socketId);
  if (interactive) {
    MqlSubscriptionApi.cancelAllForInteractive(interactive);
    PromptApi.cancelAll(interactive, 'host-disconnected');
  }

  const removed = ConnectionManager.get().removeInteractive(socketId);
  /* …existing tail… */
}
```

**Tests verifying this wave.**

- `Application.prompt-routes.test.ts`:
  - `prompt-response` route reaches `PromptApi.handleResponse`
    (spy).
  - `prompt-cancel` route reaches `PromptApi.handleCancel`.
  - Malformed `prompt-response` (missing `promptId`) drops silently
    without calling PromptApi.
  - Unknown message types still emit the existing `'error'`
    envelope.
- Extension to the existing disconnect test:
  - `handleUserDisconnect` calls
    `MqlSubscriptionApi.cancelAllForInteractive` THEN
    `PromptApi.cancelAll(interactive, 'host-disconnected')` THEN
    `removeInteractive`. Verify order via spy `invocationCallOrder`
    (same pattern the MQL plan used).

**Commit message draft.**

```
feat(prompt): inbound dispatch + disconnect cleanup

Application.processUserMessage routes prompt-response and
prompt-cancel to PromptApi. The command case is unchanged;
mql-subscribe / mql-unsubscribe paths continue to route to
MqlSubscriptionApi. Malformed prompt-response payloads (missing
promptId or response) drop silently.

handleUserDisconnect cancels all per-Interactive prompts before
tearing down the Interactive itself, in this order:
MqlSubscriptionApi cancel → PromptApi cancel → removeInteractive.
The MQL substrate's invariant (cancel before remove so envelopes
can still address the Interactive) extends to prompt cleanup.
```

## Wave 4 — `prompt` command verb

**Goal.** Ship the player-facing `prompt cancel` verb. Future
subcommands land additively against the same controller; v1 only
recognizes `cancel`.

**Files to create.**

- `packages/server/src/mud/cmd/prompt.yaml`
- `packages/server/src/mud/obj/command/PromptController.ts`
- `packages/server/src/mud/obj/command/__tests__/PromptController.test.ts`

**Files to edit.**

- `packages/server/src/mud/obj/command/index.ts` (or wherever
  command controllers are registered) — register `PromptController`
  per the existing pattern.

**YAML shape (sketch — confirm against `command-spec.md`).**

```yaml
name: prompt
provider: self                # any actor with HasInteractive can
                              # run this verb; gating is done by
                              # validator
description: |
  Manage active prompts. v1 subcommands: 'cancel' (cancels every
  pending prompt on this connection).
fields:
  subcommand:
    type: string
    required: true
validators:
  - mustHaveInteractive       # ensures the giver composes
                              # HasInteractive (otherwise there's
                              # no prompt stack to manipulate)
```

The `mustHaveInteractive` validator is new in this wave — small
sync validator that calls `MixinApi.hasMixin(giver,
Mixins.HasInteractive)` and returns an error string if absent.
Lives in `packages/server/src/mud/lib/command/validators/`.

**Controller outline.**

```ts
export class PromptController extends Controller {
  async execute(args: { subcommand: string }, ctx: CommandContext): Promise<void> {
    const giver = ctx.commandGiver as Stuff & HasInteractive;
    const interactive = /* extract interactive from giver — usually
       the first / only one in getInteractives() */;
    if (!interactive) {
      MessageApi.scene(giver as Stuff & Sensor).topic('system.prompt.error')
        .toSelf(Mml.compose`No active connection.`).send();
      ctx.note({ kind: 'controller-rejected', reason: 'no-interactive', detail: 'no Interactive bound' });
      return;
    }

    switch (args.subcommand.toLowerCase()) {
      case 'cancel':
        return this.handleCancel(interactive, giver, ctx);
      default:
        MessageApi.scene(giver as Stuff & Sensor).topic('system.prompt.error')
          .toSelf(Mml.compose`unknown prompt subcommand '${args.subcommand}'; valid: cancel`).send();
        ctx.note({
          kind: 'controller-rejected',
          reason: 'unknown-subcommand',
          detail: `unknown prompt subcommand '${args.subcommand}'`,
        });
        return;
    }
  }

  private handleCancel(interactive: Interactive, giver: Stuff & Sensor, ctx: CommandContext): void {
    const count = PromptApi.cancelAll(interactive, 'cancelled');
    const msg = count === 0
      ? Mml.compose`no prompts to cancel`
      : Mml.compose`cancelled ${count} prompt${count === 1 ? '' : 's'}`;
    MessageApi.scene(giver).topic('system.prompt.cancelled').toSelf(msg).send();
  }
}
```

**Tests verifying this wave.**

- `PromptController.test.ts`:
  - `prompt cancel` with zero pending prompts → "no prompts to
    cancel" scene + dispatch-response.
  - Two pending prompts pushed via `PromptApi.choice` (etc.),
    `prompt cancel` → both reject with `PromptCancelledError {
    reason: 'cancelled' }`, scene reads "cancelled 2 prompts".
  - Unknown subcommand → controller-rejected note + scene error;
    PromptApi NOT called.
  - Giver without HasInteractive → validator rejection (mock the
    `mustHaveInteractive` validator's behavior, or use a fixture
    giver that lacks the mixin).

**Commit message draft.**

```
feat(prompt): prompt command + cancel subcommand

Ship the `prompt` verb. v1 recognizes one subcommand: `cancel`
(wholesale cancel via PromptApi.cancelAll, reason 'cancelled').
Unknown subcommands emit a controller-rejected note naming the
valid set; PromptApi is not called.

The `prompt` namespace is reserved for future prompt-related
actions (`prompt set <format>`, `prompt show`, etc.). They land
additively against the same controller.

Per-prompt cancel stays on the wire as the existing `prompt-cancel`
message type (X-button affordance); the verb form always cancels
all.
```

## Wave 5 — Base-prompt rendering substrate

**Goal.** Wire the `prompt.format` setting, the dispatch-response
composition that emits a `prompt-refresh` Note on every dispatcher
response, the empty-command short-circuit, and the FocusedMixin
context binding.

**Files to create.**

- `packages/server/src/mud/api/__tests__/prompt.format.test.ts`
  — `prompt.format` setting registered; default value matches
  spec; setting it through `EnvironmentApi.set` round-trips.
- `packages/server/src/mud/__tests__/integration/prompt-refresh.test.ts`
  — every dispatch-response carries a refresh Note; empty command
  produces refresh-only response; changing format → next response
  shows new render.
- Possibly extend
  `packages/server/src/backend/__tests__/Application.test.ts`
  for the empty-command short-circuit assertion.

**Files to edit.**

- `packages/server/src/mud/lib/shell/Environment.ts` (or wherever
  `EnvironmentMixin`'s schema-on-mixin declarations live; per
  `shell-environment.md` the mixin owns its keyspace registration).
  Register `prompt.format` with default value `{{ focus }}>` and
  description "Liquid template rendered into the base prompt area
  after every command. Tokens: `focus`."
- `packages/server/src/mud/api/command.ts` (or wherever
  dispatch-response composition lands — likely
  `CommandGiverMixin.executeCommand` in
  `lib/command/CommandGiver.ts` or a `DispatchApi.respond` helper)
  — at envelope build time, render the giver's current
  `prompt.format` via `ProseApi.format` with
  `{ focus: giver.getFocus?.() ?? '' }` context, prepend a
  `PromptRefreshNote` to `outcome.notes`.
- `packages/server/src/backend/Application.ts` —
  `handleCommandMessage` short-circuits on empty command text.
  Before parsing, if `commandText.length === 0`, compose a
  `DispatchResponseEnvelope` with only the prompt-refresh Note
  and send via `sendEnvelopeToInteractive`. Skip the controller
  dispatch entirely.

**Sketch: `buildPromptContext` helper.**

Lives in `mud/api/prompt.ts` (or a sibling file — planner
discretion). Returns `Record<string, unknown>`:

```ts
export function buildPromptContext(giver: Stuff): Record<string, unknown> {
  return {
    focus: MixinApi.isFocused(giver) ? giver.getFocus() : '',
  };
}
```

This is the v1 context shape; future tokens (`posture`,
`location`, `time`) extend this helper.

**Sketch: `renderPromptRefresh` helper.**

```ts
export function renderPromptRefresh(giver: Stuff & HasEnvironment): PromptRefreshNote {
  const template = EnvironmentApi.resolveSetting(giver, 'prompt.format') ?? '{{ focus }}>';
  const ctx = buildPromptContext(giver);
  const rendered = ProseApi.format(template, ctx).toString();
  return { kind: 'prompt-refresh', rendered };
}
```

Lives alongside `PromptApi`. Documented in the subsystem doc
under "Base-prompt rendering" so future content authors find
where to extend the Liquid context.

**Sketch: empty-command short-circuit in `Application.handleCommandMessage`.**

Near the top of the existing handler (after extracting
`commandText`):

```ts
if (commandText.length === 0) {
  // MUD-style "press Enter for a fresh prompt."
  const template: Omit<DispatchResponseEnvelope, 'frameId'> = {
    type: 'dispatch-response',
    dispatchId: nanoid(),  // or whatever id-shape the existing path uses
    outcome: {
      status: 'ok',
      notes: [renderPromptRefresh(avatar)],
    },
  };
  this.sendEnvelopeToInteractive(interactive, template);
  return;
}
```

Subtle: the empty short-circuit happens BEFORE the existing
"avatar must be in a container" guard. The refresh is just a
prompt update; it shouldn't fail because the avatar's container is
null (the player should still see their current prompt regardless
of placement state).

**Sketch: refresh Note attachment at dispatch-response composition.**

The exact insertion point is the `executeCommand` chokepoint in
`CommandGiverMixin` (or its `DispatchApi.respond` equivalent —
the build agent verifies during read-through). Wherever the
existing dispatcher composes the envelope from the `CommandContext`
accumulator's notes, prepend the refresh Note:

```ts
const notes = ctx.getNotes();
notes.unshift(renderPromptRefresh(commandGiver));  // or push; order indifferent in v1
const envelope: Omit<DispatchResponseEnvelope, 'frameId'> = {
  type: 'dispatch-response',
  dispatchId,
  outcome: { status: ctx.getStatus(), notes },
};
```

**Tests verifying this wave.**

- `prompt.format.test.ts`:
  - The setting is registered on `EnvironmentMixin`; default value
    is `{{ focus }}>`.
  - Setting via `EnvironmentApi.set(giver, 'prompt.format',
    '{{ focus }} ready>')` round-trips via
    `resolveSetting(giver, 'prompt.format')`.
- `prompt-refresh.test.ts` (integration):
  - Send a `command` message via `Application.processUserMessage`;
    capture the dispatch-response envelope; assert it carries a
    `prompt-refresh` Note with `rendered: 'here>'` (default focus
    + default template).
  - Set `prompt.format` to `'{{ focus }} ready>'`; send another
    command; refresh Note shows `'here ready>'`.
  - Send empty command (`{ type: 'command', payload: { text: '' }
    }`); only one Note in the response (the refresh), no
    controller side-effects (verify via spy on the controller
    that would have run if dispatch had proceeded).
  - Default `focus` value when giver doesn't compose
    `FocusedMixin` — refresh renders the template with empty
    string for focus.

**Commit message draft.**

```
feat(prompt): base-prompt rendering substrate

Wire the MUD-style refresh-on-dispatch-response model for the
client's base-prompt area.

- New player setting `prompt.format` via EnvironmentMixin (default
  `{{ focus }}>`). Players change with the existing `settings` /
  `set` vocabulary.
- ProseApi.format renders the template at dispatch-response
  composition. v1 Liquid context: `{ focus: giver.getFocus?.()
  ?? '' }`. Future tokens extend buildPromptContext().
- New `prompt-refresh` Note kind rides on every
  DispatchResponseEnvelope's outcome.notes.
- Empty command text in Application.handleCommandMessage
  short-circuits to a refresh-only dispatch-response (no parser,
  no controller, no side effects). MUD-style "press Enter for a
  fresh prompt."

FocusedMixin needs no other wiring — getFocus() is read directly
from the Liquid context binder, no subscribableFields seam, no
event firing. Mixin-side subscribability for `focus` is independently
shippable later if a live MQL consumer ever needs it.
```

## Wave 6 — Command-spec cardinality vocabulary + dispatcher matrix

**Goal.** The biggest wave. Add the three new optional YAML knobs
(`cardinality`, `onExcess`, `onShortage`), the dispatcher matrix
that consumes them, the resolver-path selection logic, the
disambiguation prompts triggered through `PromptApi.mqlObject` /
`mqlMany`, and the `PromptCancelledError` propagation through the
dispatcher.

**Files to create.**

- `packages/server/src/mud/api/__tests__/command.cardinality.test.ts`
  — YAML schema validation (rejects nonsensical combos), defaults
  preserved, every existing shipped command compiles unchanged.
- `packages/server/src/mud/api/__tests__/command.dispatcher-matrix.test.ts`
  — every cell of the (cardinality × got × policy) matrix.
- `packages/server/src/mud/api/__tests__/command.disambiguation.test.ts`
  — integration: `take sword` with two swords → mqlObject pushed,
  client picks one, controller executes with the pick.
- `packages/server/src/mud/api/__tests__/command.cancellation-propagation.test.ts`
  — `prompt cancel` mid-disambiguation → controller never runs,
  cancelled-status dispatch-response shipped.

**Files to edit.**

- `packages/server/src/mud/api/command.ts` — extend the
  `FieldSpec` (or equivalent) interface to carry `cardinality` /
  `onExcess` / `onShortage`. Add the cardinality vocabulary types
  alongside the existing `FieldValidator` / `CommandValidator`
  exports.
- Schema-validation pass (likely in `CommandApi.preloadAll` or a
  sibling) — reject `cardinality: { min: 5, max: 3 }`,
  `onExcess: top` on `objects`, `onExcess: truncate` on `object`,
  etc. Throw at load time so a broken command never ships.
- Dispatcher field-binding loop — the place that calls
  `MqlApi.resolveOne` / `resolveMany` today. Route the call
  through a new `CommandApi.resolveCardinality(spec, ctx)` helper.
- Add the `CommandApi.resolveCardinality` helper (or extract to
  a sibling module under `api/command/` if the file grows too
  long).
- Dispatcher catch — wherever `executeCommand` (or
  `CommandGiverMixin.executeCommand`) runs the field-binding
  loop, wrap the binding await in try/catch for
  `PromptCancelledError`. On catch, compose a cancelled-status
  `DispatchResponseEnvelope` and return cleanly; don't run the
  controller, don't propagate.

**`resolveCardinality` outline.**

```ts
type CardinalityOutcome =
  | { kind: 'execute'; resolved: Stuff[] }
  | { kind: 'error'; reason: 'no-match' | 'ambiguous' | 'insufficient' | 'too-many'; message: string };

static async resolveCardinality(
  spec: FieldSpec,
  ctx: MqlContext & { interactive?: Interactive },
): Promise<CardinalityOutcome> {
  // Apply defaults.
  const cardinality = applyCardinalityDefaults(spec);
  const onExcess = applyOnExcessDefault(spec, cardinality);
  const onShortage = spec.onShortage ?? 'error';

  // Cheapest resolver path.
  let resolved: Stuff[];
  if (spec.type === 'object' && onExcess === 'top') {
    const one = MqlApi.resolveOne(spec.mql, ctx);
    resolved = one.stuff ? [one.stuff] : [];
  } else {
    const many = MqlApi.resolveMany(spec.mql, ctx);
    resolved = many.stuff;
  }

  const got = resolved.length;

  // Shortage check.
  if (got < cardinality.min) {
    return { kind: 'error', reason: 'insufficient',
             message: `expected at least ${cardinality.min}, got ${got}` };
  }

  // Excess check (and prompt path).
  if (cardinality.max !== Infinity && got > cardinality.max) {
    switch (onExcess) {
      case 'take-all':
        return { kind: 'execute', resolved };
      case 'truncate':
        return { kind: 'execute', resolved: resolved.slice(0, cardinality.max) };
      case 'top':  // only valid on `object` per schema validator
        return { kind: 'execute', resolved: [resolved[0]] };
      case 'error':
        return { kind: 'error', reason: cardinality.max === 1 ? 'ambiguous' : 'too-many',
                 message: cardinality.max === 1 ? `ambiguous: ${got} matches` : `too many: ${got} matches, max ${cardinality.max}` };
      case 'prompt': {
        if (!ctx.interactive) {
          return { kind: 'error', reason: 'ambiguous',
                   message: `ambiguous: ${got} matches and no interactive to disambiguate` };
        }
        if (cardinality.max === 1) {
          // mqlObject (single-pick)
          const picked = await PromptApi.mqlObject(
            ctx.interactive,
            `pick ${spec.label ?? 'one'}`,  // label sourcing left to the planner; lean on spec metadata
            resolved,
          );
          return picked
            ? { kind: 'execute', resolved: [picked] }
            : { kind: 'error', reason: 'no-match', message: 'pick was stale or invalid' };
        } else {
          // mqlMany (multi-pick with bounds)
          const picks = await PromptApi.mqlMany(
            ctx.interactive,
            `pick ${spec.label ?? 'some'}`,
            resolved,
            { min: cardinality.min, max: cardinality.max },
          );
          return { kind: 'execute', resolved: picks };
        }
      }
    }
  }

  return { kind: 'execute', resolved };
}
```

The schema validator + the runtime helper are paired: the schema
guarantees no invalid (`spec.type`, `onExcess`) combinations
reach the runtime, so the switch doesn't need defensive branches
for nonsense (e.g. `onExcess: top` on `objects` is caught at load).

**`PromptCancelledError` propagation.**

Wherever the dispatcher's field-binding loop awaits
`resolveCardinality`, wrap:

```ts
let resolution: CardinalityOutcome;
try {
  resolution = await CommandApi.resolveCardinality(spec, ctx);
} catch (err) {
  if (err instanceof PromptCancelledError) {
    // Player cancelled mid-disambiguation. Emit a cancelled-
    // status dispatch-response; don't run the controller.
    return emitCancelledDispatchResponse(commandGiver, dispatchId, err.reason);
  }
  throw err;
}

if (resolution.kind === 'error') {
  return emitErrorDispatchResponse(commandGiver, dispatchId, resolution);
}

// Bind resolution.resolved into field value; continue to next field
// or controller execution.
```

The exact placement is in `CommandGiverMixin.executeCommand` (or
the dispatcher helper it calls). The build agent verifies during
read-through.

**`emitCancelledDispatchResponse` shape.**

Composes a `DispatchResponseEnvelope` with:
- `outcome.status: 'declined'` (or whatever the closest existing
  status is; the response-envelope subsystem doc names the
  vocabulary).
- `outcome.notes` — at least the standard `prompt-refresh` Note
  (Wave 5 invariant: every dispatch-response carries refresh) plus
  a cancellation note. The cancellation note shape: probably reuse
  the existing `controller-rejected` Note kind with
  `reason: 'cancelled'` and an appropriate `detail`. Planner
  defers exact shape to the build agent — the dispatch-response
  Note vocabulary already covers cancellation-shaped outcomes;
  pick whichever existing kind reads cleanest. If none fit, add
  a small `CommandCancelledNote` kind to `@saxonberg/types` and
  document in the subsystem doc.

**Tests verifying this wave.**

- `command.cardinality.test.ts`:
  - Sample YAMLs: each combo (object + onExcess: top, prompt,
    error) loads cleanly. Each combo on objects loads cleanly.
  - Nonsense combos throw at load:
    - `cardinality: { min: 5, max: 3 }` → throw
    - `onExcess: top` on `objects` → throw
    - `onExcess: truncate` on `object` → throw
    - `onExcess: take-all` on `object` → throw
  - Every existing shipped command (walk the cmd/ directory)
    re-loads cleanly without YAML edits.
- `command.dispatcher-matrix.test.ts`:
  - Drive each row of the requirements doc's matrix tables.
  - For `object × onExcess: top × got: 3` → `resolveOne` called,
    controller receives matches[0]. Spy on resolveOne/resolveMany.
  - For `object × onExcess: prompt × got: 3` → `resolveMany`
    called, `mqlObject` push captured on the synthetic client,
    client picks one, controller executes.
  - For `objects × cardinality: { max: 3 } × onExcess: prompt ×
    got: 5` → `mqlMany` pushed with `{ min: 0, max: 3 }` (or `{
    min: 1, max: 3 }` if the spec set min); client picks 2,
    controller executes with two-item array.
  - For `objects × cardinality: { min: 2 } × got: 1` → error
    "insufficient matches".
  - For `objects × cardinality: { max: 3 } × onExcess: truncate
    × got: 5` → controller executes with top-3.
- `command.disambiguation.test.ts` (integration):
  - End-to-end via Application: send a `take sword` command, two
    swords resolved, `mqlObject` push lands on synthetic client,
    client sends `prompt-response` with picked stuffId,
    controller (mocked Take) executes with that pick, dispatch-
    response ships.
- `command.cancellation-propagation.test.ts`:
  - Same setup; mid-prompt, send `command: 'prompt cancel'`. The
    `mqlObject` await rejects with `PromptCancelledError`;
    dispatcher catches; emits cancelled-status dispatch-response;
    Take controller never runs.
  - Disconnect mid-prompt: simulate `handleUserDisconnect` while
    `mqlObject` await is pending; await rejects with
    `reason: 'host-disconnected'`; dispatcher cleans up without
    writing partial state.

**Commit message draft.**

```
feat(command): cardinality vocabulary + dispatcher matrix

Add three optional YAML knobs to object/objects field declarations:
cardinality ({ min?, max?, exactly? }), onExcess (top/prompt/
error for object; take-all/prompt/truncate/error for objects),
and onShortage (error — the only v1 value).

Schema-validation pass rejects nonsensical combos at YAML load:
inverted cardinality bounds, onExcess: top on objects, onExcess:
truncate on object. Every existing shipped command re-loads
unchanged.

CommandApi.resolveCardinality is the new dispatcher seam between
MQL resolution and controller execution. It applies the
(cardinality × got × policy) matrix, picks the cheapest resolver
(resolveOne when only the top is needed; resolveMany otherwise),
and routes disambiguation through PromptApi.mqlObject (1-of-N)
or mqlMany (K-of-N, with bounds enforced substrate-side).

PromptCancelledError propagates cleanly: the dispatcher catches
it and emits a cancelled-status DispatchResponseEnvelope; the
controller never runs. Disconnect mid-disambiguation rides the
same path (reason: 'host-disconnected').

Backward compat invariant: every shipped command continues to
work with zero YAML edits — defaults preserve current behavior
(type: object → onExcess: top → resolveOne; type: objects → max
unset → onExcess: take-all → resolveMany).
```

## Wave 7 — Integration test + subsystem docs + sweep

**Goal.** End-to-end synthetic-client integration test covering
the full lifecycle. Ship the subsystem doc. Update CLAUDE.md,
docs/architecture.md, docs/antipatterns.md, docs/command-spec.md,
docs/command-routing.md.

**Files to create.**

- `packages/server/src/mud/api/__tests__/prompt.integration.test.ts`
  — exhaustive lifecycle scenarios (per acceptance criteria).
- `docs/subsystems/prompt.md`

**Files to edit.**

- `CLAUDE.md` — add a bullet to the subsystem-doc list pointing at
  `prompt.md`.
- `docs/architecture.md` — short paragraph in the Api-list /
  substrate section.
- `docs/antipatterns.md` — entry: "use PromptApi rather than
  building custom prompt-shaped flows" (companion to the
  EventApi.fire entry).
- `docs/subsystems/command-spec.md` — document the cardinality /
  onExcess / onShortage knobs with worked examples.
- `docs/subsystems/command-routing.md` — document the dispatcher
  decision matrix and the resolver-path selection logic
  (resolveOne vs resolveMany).

**Integration test outline.**

The test uses the same synthetic-client harness from the MQL
integration test (fake `IBackend` capturing `sendEnvelopeToSocket`
calls; `Avatar` + `Interactive` fixtures from `makeStuff`).

Scenarios:

1. **Single-prompt happy path.** Push `choice("Pick", ['a', 'b'])`;
   capture `PromptEnvelope`; send `prompt-response { promptId,
   response: 'a' }`; await resolves to `'a'`; `prompt-dismissed`
   envelope captured; registry empty.
2. **Validator retry.** Push `text("Name?", { validate })`; client
   responds with invalid; `prompt-validation-failed` captured,
   prompt stays alive; client responds with valid; await resolves.
3. **Async validator.** Same as 2 but validator is async; same
   wire shape.
4. **`mqlObject` with two matches.** Push `mqlObject("Which?",
   [sword1, sword2])`; client picks sword1's stuffId; await
   resolves with sword1.
5. **`mqlObject` stale pick.** Push prompt; destroy sword1 via
   `StuffApi.destruct`; client sends stuffId of destroyed sword;
   await resolves with `null`.
6. **`mqlMany` bounds.** Push `mqlMany("Pick 1-3 swords",
   [s1,s2,s3,s4], { min: 1, max: 3 })`; client responds with empty
   array → validation-failed; client responds with `[s1,s2]` →
   resolves with two-item array.
7. **`prompt cancel` command.** Push two prompts; run `prompt
   cancel` via `processUserMessage`; both awaits reject with
   `PromptCancelledError { reason: 'cancelled' }`; dispatch-
   response says "cancelled 2 prompts"; registry empty.
8. **Per-prompt `prompt-cancel` wire message.** Push prompt; send
   `prompt-cancel { promptId }`; await rejects with `reason:
   'cancelled'`; other pending prompts unaffected.
9. **Disconnect mid-prompt.** Push prompt; call
   `handleUserDisconnect`; await rejects with `reason: 'host-
   disconnected'`; cancellation runs before `removeInteractive`
   (verify spy order); registry empty.
10. **Empty command refresh.** Send `command: { text: '' }`;
    dispatch-response captured carries only a `prompt-refresh`
    Note; no controller side-effects.
11. **`prompt.format` round-trip.** Set format via setting; send
    a command; refresh Note reflects new format. Reset; refresh
    Note shows default.
12. **Disambiguation through cardinality + cancel.** A test
    controller with `object` + `onExcess: prompt` field; MQL
    resolves to 2 matches; `mqlObject` pushed; client sends
    `command: 'prompt cancel'`; cancelled-status dispatch-response
    shipped; controller never runs.
13. **Disambiguation through cardinality + happy path.** Same
    setup; client picks one; controller executes; happy-path
    dispatch-response shipped (with refresh Note).
14. **`mqlMany` through cardinality.** A test controller with
    `objects` + `cardinality: { max: 3 }` + `onExcess: prompt`;
    MQL resolves to 5; `mqlMany` pushed with `{ max: 3 }`; client
    picks 2; controller executes with two-item array.

**Subsystem doc outline (`docs/subsystems/prompt.md`).**

Covers, per the requirements doc:

- Substrate surface: `PromptApi` (five methods + error class +
  validator type), wire types, file layout.
- Two-channel inbound: `prompt-response` / `prompt-cancel` bypass
  the command bus; the `prompt` verb (`prompt cancel`) rides it.
- Push / response / cancel lifecycle.
- Validator semantics — async permitted; cancel-during-validate
  guard; why this diverges from command validators (sync-by-
  design due to dispatcher's sync pass). Cross-reference
  `command-spec.md`.
- `mqlObject` vs `mqlMany`: pass-through vs bounds-enforced;
  response wire encoding (string for object; JSON-array string
  for many).
- Body MessageFrame correlation: `payload: { promptId }` on the
  `world.prompt` frame; client correlates by id.
- Disconnect ordering (sibling to MQL subscription cleanup).
- Base-prompt rendering: `prompt.format` setting, `ProseApi.format`
  render, `prompt-refresh` Note, empty-command short-circuit.
  Cross-reference `prose.md` + `shell-environment.md`.
- The `prompt cancel` command (current sole subcommand) + the
  namespace reserved for future subcommands.
- The cardinality vocabulary on command specs and the dispatcher
  matrix — cross-reference `command-spec.md` and
  `command-routing.md` for the full authoring + dispatcher
  surface.
- What ships unfired or deferred (Tier 2/3 kinds, priority
  spectrum, behavior flags, replace-vs-push, live `me.focus`
  subscription).

**Commit message drafts (two commits in this wave — code, then
docs).**

```
test(prompt): end-to-end integration loop

Synthetic-client integration test proving the full lifecycle:
push → respond → resolve for each Tier 1 kind; validator retry
with validation-failed envelopes; mqlObject with stale picks
resolving to null; mqlMany bounds enforcement; prompt cancel
command + per-prompt prompt-cancel wire message; disconnect
mid-prompt; empty-command refresh; prompt.format round-trip;
disambiguation through cardinality + happy / cancel paths; mqlMany
through cardinality.

Reuses the synthetic-client harness from the MQL integration
test (fake IBackend, makeStuff fixtures, the spy-on-onEnvelope
capture pattern).
```

```
docs(prompt): subsystem doc + architecture pointers

New subsystem doc at docs/subsystems/prompt.md covers the
substrate surface, two-channel inbound, validator semantics
(and the divergence from command validators), mqlObject vs
mqlMany behaviors, body MessageFrame correlation, disconnect
ordering, base-prompt rendering, the prompt verb namespace, and
the cardinality vocabulary cross-references.

CLAUDE.md and docs/architecture.md gain pointers to the new
subsystem doc. docs/antipatterns.md adds a PromptApi entry
(companion to the EventApi.fire / setProp entries).

docs/subsystems/command-spec.md gains the cardinality /
onExcess / onShortage knobs with worked examples.
docs/subsystems/command-routing.md gains the dispatcher decision
matrix and the resolver-path selection logic.
```

## Acceptance-criteria traceability

| Acceptance criterion (from requirements doc) | Wave | Test file |
|---|---|---|
| `PromptApi.choice` resolves with chosen token | 2 | `prompt.lifecycle.test.ts` |
| `PromptApi.confirm` resolves with boolean | 2 | `prompt.lifecycle.test.ts` |
| `PromptApi.text` resolves with string | 2 | `prompt.lifecycle.test.ts` |
| `PromptApi.mqlObject` resolves with `Stuff | null` | 2 | `prompt.lifecycle.test.ts` |
| `PromptApi.mqlMany` resolves with `Stuff[]` | 2 | `prompt.lifecycle.test.ts` |
| `mqlMany` substrate enforces bounds → validation-failed | 2 | `prompt.bounds.test.ts` |
| `mqlMany` malformed JSON → validation-failed | 2 | `prompt.bounds.test.ts` |
| Sync + async validator paths | 2 | `prompt.validation.test.ts` |
| `foreground: false` push emits envelope flag set | 2 | `prompt.lifecycle.test.ts` |
| Body MessageFrame with `payload: { promptId }` before envelope | 2 | `prompt.body.test.ts` |
| No body → only envelope | 2 | `prompt.body.test.ts` |
| Client-initiated `prompt-cancel` rejects with `'cancelled'` | 2 / 7 | `prompt.cancellation.test.ts` / `prompt.integration.test.ts` |
| Server-side `cancel(promptId)` + `cancelAll(iact, reason)` | 2 | `prompt.cancellation.test.ts` |
| `handleUserDisconnect` cancels prompts BEFORE `removeInteractive` | 3 | `Application.prompt-routes.test.ts` |
| `cancelAll` leaves substrate state empty | 2 | `prompt.cancellation.test.ts` |
| `prompt cancel` controller — happy path + reports count | 4 / 7 | `PromptController.test.ts` / `prompt.integration.test.ts` |
| `prompt cancel` unknown subcommand → controller-rejected | 4 | `PromptController.test.ts` |
| `prompt` verb gated to HasInteractive | 4 | `PromptController.test.ts` |
| Inbound `prompt-response` / `prompt-cancel` routes | 3 | `Application.prompt-routes.test.ts` |
| Malformed `prompt-response` drops silently | 3 | `Application.prompt-routes.test.ts` |
| `object` declarations accept `onExcess` | 6 | `command.cardinality.test.ts` |
| `objects` declarations accept `cardinality` / `onExcess` / `onShortage` | 6 | `command.cardinality.test.ts` |
| Schema rejects nonsense combos | 6 | `command.cardinality.test.ts` |
| Every shipped command compiles unchanged | 6 | `command.cardinality.test.ts` |
| Dispatcher matrix cells (every row × policy) | 6 | `command.dispatcher-matrix.test.ts` |
| Resolver-path selection (resolveOne vs resolveMany) | 6 | `command.dispatcher-matrix.test.ts` |
| Disambiguation through `mqlObject` end-to-end | 6 / 7 | `command.disambiguation.test.ts` / `prompt.integration.test.ts` |
| `mqlMany` through cardinality (max: 3 + N=5) | 6 / 7 | `command.dispatcher-matrix.test.ts` / `prompt.integration.test.ts` |
| `prompt cancel` mid-disambiguation cancels command | 6 / 7 | `command.cancellation-propagation.test.ts` / `prompt.integration.test.ts` |
| Disconnect mid-disambiguation cleans up | 6 | `command.cancellation-propagation.test.ts` |
| `prompt.format` registered with default `{{ focus }}>` | 5 | `prompt.format.test.ts` |
| Every dispatch-response carries `prompt-refresh` Note | 5 / 7 | `prompt-refresh.test.ts` / `prompt.integration.test.ts` |
| Empty command → refresh-only dispatch-response | 5 / 7 | `prompt-refresh.test.ts` / `prompt.integration.test.ts` |
| Custom template renders new format on next response | 5 / 7 | `prompt-refresh.test.ts` / `prompt.integration.test.ts` |
| Giver without FocusedMixin renders with empty focus | 5 | `prompt-refresh.test.ts` |
| New Note kinds + inbound messages typed in `@saxonberg/types` | 1 | `prompt-types.test.ts` + TS build |
| Subsystem doc at `docs/subsystems/prompt.md` | 7 | n/a (doc) |
| `command-spec.md` + `command-routing.md` cardinality additions | 7 | n/a (doc) |
| CLAUDE.md / architecture.md / antipatterns pointers | 7 | n/a (doc) |

## Risks the build agent should watch for

1. **`MessageApi.scene` builder may not support a `.payload(x)`
   step.** The body MessageFrame needs `payload: { promptId }`. If
   the scene builder doesn't expose that today, the substrate has
   two options: (a) extend the builder; (b) fall back to a direct
   `MessageApi.sendMessage(holder, frame)` constructing the
   MessageFrame inline with `payload` set. Verify during Wave 2
   read-through; document the choice in the subsystem doc.

2. **Cancel-during-validate race.** An async validator that takes
   50ms while cancel fires at 20ms must NOT call `record.resolve`
   when the validator eventually resolves. The `cancelled: boolean`
   flag on the resolver record (set by `#cancelOne`) is the guard.
   The Wave 2 test that simulates this race uses fake timers to
   make the timing deterministic.

3. **Dispatcher's existing field-binding loop's exact shape.** The
   plan calls out `CommandGiverMixin.executeCommand` as the
   likely chokepoint, but the actual MQL resolve sites may live in
   `CommandApi.resolveAndValidate` or its callers. Build agent
   verifies during Wave 6 read-through and adjusts insertion
   points accordingly. The conceptual seam
   (`resolveCardinality` between MQL resolve and controller
   dispatch) is stable; the file/method location may differ.

4. **`PromptCancelledError` already thrown from inside an `await`
   chain.** When the dispatcher's `await resolveCardinality(...)`
   raises, Node's promise machinery surfaces the error naturally.
   But if any intervening layer wraps the error (e.g. a generic
   try/catch that re-throws a different error type), the
   `instanceof PromptCancelledError` check at the catch site
   fails. Trace the error path during Wave 6; if there's any
   layer that wraps errors, either bypass it or extend its
   error-type-pass-through to include `PromptCancelledError`.

5. **Empty-command short-circuit ordering.** The empty short-
   circuit lives BEFORE every other guard in
   `handleCommandMessage` (including the "avatar must be in a
   container" check). A player who's between locations (or whose
   container is null for any reason) should STILL see their
   refresh on Enter. Don't accidentally gate the refresh behind
   the container check.

6. **`prompt-refresh` Note attachment chokepoint duplication.** If
   there are multiple places that compose a
   `DispatchResponseEnvelope` (e.g. controller-driven, error-only,
   activity-update sibling envelopes), each needs the refresh
   Note attached. Walk every `type: 'dispatch-response'`
   construction site during Wave 5 and verify coverage. A
   centralized helper (`buildDispatchResponse(giver, dispatchId,
   notes, status)`) might be the cleanest refactor; the build
   agent decides whether to extract.

7. **`mqlObject` / `mqlMany` `matches` projection at push time.**
   The plan ships `{ stuffId; displayName }` records over the
   wire (not Stuff references). The projection uses
   `DescribeApi.getDisplayName(stuff, viewer)` per the MQL
   substrate's pattern. Two concerns: (a) the substrate needs the
   `viewer` — use the interactive's holder when it composes
   `Sensor`; otherwise raise an error. (b) The `matches` array
   shouldn't carry destroyed Stuffs (defensive: filter at push
   time). Document in the subsystem doc.

8. **HMR for the dispatcher matrix.** The cardinality vocabulary
   adds new code in the dispatcher path. The HMR-aware
   controller-template machinery already exists; the new matrix
   logic is pure (no instance state) so HMR should be safe. Run
   an HMR smoke test after Wave 6 to confirm no surprise.

9. **YAML schema-validation pass timing.** The plan assumes
   schema validation runs at command load (e.g. in
   `CommandApi.preloadAll`). If the existing load path tolerates
   unknown fields silently and validates at first dispatch
   instead, the bad-combo rejection might surface late. Verify
   during Wave 6; tighten if needed so a broken YAML never ships.

10. **Backward-compat sweep.** The acceptance criterion "every
    existing shipped command compiles unchanged" is the
    invariant. Wave 6's test walks the `cmd/` directory and runs
    each through the schema validator. If any existing command
    happens to use the new field names with different semantics
    (unlikely but possible), the test catches it. Add a
    regression check at the same time: snapshot the
    `resolveOne` / `resolveMany` calls a representative existing
    command made before this change and assert they still happen
    after (proves defaults preserve behavior).

11. **`PromptApi` test fixtures parallel MQL substrate's.** Wave
    2's tests need `bootRegistry()` + `makeAvatarInteractive()`
    helpers. Reuse the MQL substrate test scaffolding (they ship
    in the same directory after Wave 4 of the MQL plan); don't
    re-implement. If the helpers aren't exported, refactor them
    to a shared test-setup file (e.g.
    `packages/server/src/mud/__tests__/test-setup-interactive.ts`)
    as part of Wave 2; the MQL substrate's tests then import
    from there too.

12. **`prompt` verb argument shape.** The verb takes a single
    string arg `subcommand`. The existing command spec parser may
    require more ceremony (e.g. validators, a `type: text` spec
    rather than `type: string`). Verify during Wave 4 read-through
    against `command-spec.md`. The plan is right at the
    conceptual level; the YAML field names might need tweaking.

13. **Liquid context binder for `focus` when giver lacks
    FocusedMixin.** The Wave 5 binder uses
    `MixinApi.isFocused(giver) ? giver.getFocus() : ''`. The
    `isFocused` predicate must exist; if not, the build agent
    adds it per the standard `Mixins.Focused` pattern in
    `api/mixin.ts`. Single line.

14. **`Promise<Stuff | null>` for `mqlObject` is a breaking change
    from the slate's `Promise<Stuff>`**. No code uses
    `PromptApi.mqlObject` today (substrate is new), so no migration
    sweep — but document the shape clearly in the subsystem doc
    so future callers know to handle null.

15. **Test isolation for substrate state.** `PromptApi` carries
    static class state (`#resolvers`, `#byInteractive`). Tests
    must call `PromptApi._clearAllForTesting()` in `beforeEach`
    or state leaks across tests. Same hygiene the MQL substrate
    follows; reuse the pattern.
