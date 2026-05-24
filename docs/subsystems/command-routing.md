# Command Routing

The path between a parsed command and "the world has changed and the
player's client knows it." MVC: a **YAML view** declares the verb
and its argument shape, a **CommandModel** is the bound input the
controller consumes, and a **CommandController** is the body that
mutates the world.

Discovery is per-giver and contextual. Every Stuff that touches the
executor — the giver itself, things in its inventory, things in its
environment, peer CommandGivers — can contribute commands. The
contributions ride on a per-giver **recency stack** maintained by
`CommandGiverMixin`; `ContainmentApi.move` and `ShadowApi.attach` /
`detach` push and pop entries as the world changes. Dispatch walks the
stack newest-first, filters by verb, and resolves same-verb collisions
at the assemble stage (shape vs bind) — see "Dynamic contributions"
below for the runtime-decline pattern that replaces the retired
`pass: true` chain-of-responsibility.

For tokenization, parser pluggability, and the `msh` shell, see
[command-parsing.md](./command-parsing.md).

The shape lives in:

- `packages/server/src/mud/api/command.ts` — `CommandApi`,
  `CommandContext` (incl. the accumulator factory
  `createCommandContext`), `CommandModel`, the YAML view types,
  validator path resolver, recency-stack orchestration helpers,
  auto-escalation table.
- `packages/server/src/mud/lib/command/CommandGiver.ts` — the
  `CommandGiverMixin` (per-giver recency stack and `executeCommand`
  dispatch loop).
- `packages/server/src/mud/lib/command/Focused.ts` — the
  `FocusedMixin` (focus fragment, pronoun memory, `focus` self-bucket
  contribution, `$focus` synthetic var). Composed onto Avatars via
  `ShelledCharacter`.
- `packages/server/src/mud/lib/command/CommandDefinition.ts` — the
  loaded YAML view, validated against `cmd/command.schema.json`.
- `packages/server/src/mud/lib/command/CommandController.ts` — the
  abstract base controllers extend.
- `packages/server/src/mud/lib/command/validators/<name>.ts` —
  per-validator modules (no registry; YAML references them by path).
- `packages/server/src/mud/cmd/*.yaml` — command views (declarative).
- `packages/server/src/mud/cmd/command.schema.json` — Ajv schema the
  YAML loader validates against.
- `packages/server/src/mud/obj/command/*Controller.ts` — controllers.

## End-to-end flow

```
[client] CommandBar onSend(text)
   │  websocketClient.send({ type: 'command', payload: { text } })
   ▼
[server] Backend → Application.processUserMessage → handleCommandMessage
   │  resolves Interactive → Avatar → Location
   ▼
avatar.executeCommand(text, { interactive })          ← CommandGiverMixin
   │  proxy intercept tags FrameKind.Command, mints commandId/executionId,
   │  builds CommandContext { commandGiver, location, interactive,
   │                          commandText, executionId, commandId,
   │                          verb: '', command: <placeholder> }
   │
   ├─ resolveActorParser(actor)            ← reads `shell.parser` setting
   │     CommandApi.resolveParser('msh') → Parser
   ├─ parser.parse(text, parserCtx)        → ParseResult
   │     (msh; LLM parsers can short-circuit with { bound })
   │     see command-parsing.md
   │
   ├─ if ParseResult.parsed AND isAlias(giver):
   │     ShellApi.expandAliases(parsed, giver) → ParsedCommand
   │     (verb-position alias substitution; sets context.aliasExpansion
   │     when an alias fires) — see shell-alias.md. Skipped on the bound
   │     branch (LLM parsers chose the verb directly).
   │
   ├─ emit input echo MessageFrame at system.log.command.{info|warn}
   │     (payload kind: 'issued'; see messaging.md)
   │
   ├─ if ParseResult.parsed: _runChain
   │     CommandApi.matchVerbContextual(verb, available)  → CommandDefinition[]
   │     for each match (newest first):
   │       ctx = CommandApi.createCommandContext({ ... })  ← fresh per attempt
   │       CommandApi.assemble(parsed, command)            → ModelData | error
   │       on shape error → discard ctx; continue (try next match)
   │       on bind error  → emit command-rejected note on outer ctx; stop
   │       CommandApi.resolveModel(model, ctx)             → MQL only
   │       await CommandApi.preloadValidatorDeps(cmd, ctx, ← async preload phase
   │             resolved, subcommandHint)
   │       CommandApi.runValidators(resolved, ctx)         → sync validators
   │       _executeOne:
   │         StuffApi.clone('/obj/command/' + cmd.controller)
   │         await controller.execute(model, ctx)          ← returns void
   │         StuffApi.destruct(controller)
   │         (controller-error caught by outer try/catch → controller-error note)
   │
   │   after _runChain: dispatcher walks accumulator notes,
   │   per framework-emitted failure note fires a scene on
   │   system.command.error so a bad command surfaces WHY
   │   without client-side envelope rendering (see § Envelope
   │   vs scene split below).
   │
   ├─ if ParseResult.bound: skip parse + match,
   │     run resolveModel + preloadValidatorDeps + runValidators +
   │     _executeOne directly.
   │
   ▼
dispatcher reads accumulator on the claiming ctx
   │
   ▼
MessageApi.sendEnvelope(actor, { type: 'dispatch-response', dispatchId,
                                  outcome: { status, notes } })
```

The MVC mapping inside that pipeline:

| MVC role | Concrete artifact | Lives in |
|---|---|---|
| **View** | YAML file declaring verbs, args, options, subcommands | `mud/cmd/*.yaml` |
| **Model** | `CommandModel` — `Record<string, FieldValue \| undefined> & { subcommand? }` | runtime only |
| **Controller** | `CommandController<T>` subclass extending `Idea`; `execute()` returns `void` and emits outcome via `ctx.note(...)` | `mud/obj/command/*Controller.ts` |

Controllers are templated `Idea` Stuff. Each controller file has a
matching seed YAML at `mud/seeds/obj/command/<Name>.yaml` so
`SeederManager` writes a Template doc into `domain` at boot. Dispatch
clones a fresh instance per execution via `StuffApi.clone` (which
consults `HotReloadApi` automatically — see
[hot-reload.md](./hot-reload.md)) and destructs after `execute`
resolves. The clone-per-execution semantic isolates state across
commands; the destruct keeps `StuffApi`'s indexes from accumulating.

## Concepts

### `CommandContext`

The **request context** threaded through the pipeline: both the
read-only data bundle controllers and validators inspect AND the
accumulator they emit signals onto. One interface; the methods are
the contract.

```ts
interface CommandContext {
  // Data (populated by the dispatcher before execute()):
  commandGiver: Stuff & CommandGiver;
  interactive?: Interactive;        // optional — cascaded/NPC commands omit
  location: Location;
  commandText: string;
  executionId: string;              // dispatch id (call-stack tracking)
  commandId: string;                // attribution id (frame metadata)
  verb: string;                     // populated by matcher
  command: CommandDefinition;       // populated by matcher
  aliasExpansion?: AliasExpansionInfo;

  // Accumulator:
  note(n: Note): void;              // append a note; auto-escalates status
  setStatus(s: Status): void;       // pin status explicitly
  getNotes(): readonly Note[];      // dispatcher reads after execute()
  getStatus(): Status;              // current escalated/pinned status
}
```

Construction is via `CommandApi.createCommandContext({ ... })` — the
factory hides the accumulator state behind a private impl class so
tests and production code share one shape.

**Lifetime: per-`_executeOne` attempt.** `_runChain` mints a fresh
context for each assemble-stage match; only the claiming attempt's
context becomes the dispatch-response envelope. Shape-fall-through
attempts are discarded along with their (untouched) contexts.
Pre-match failures (unknown verb, parse error, bind error) report on
the outer ctx.

`commandGiver` is typed as `Stuff & CommandGiver` rather than
`Avatar`. Controllers narrow with `MixinApi.isX(obj)` predicates when
they need a subclass surface. The dispatch path is the same for an
NPC issuing commands programmatically or a future "disembodied
executor."

`executionId` and `commandId` are both `nanoid()`s but serve different
roles. `executionId` rides on the input echo's payload so log consumers
can correlate diagnostics back to one keystroke. `commandId` rides on
every frame composed during the synchronous span of the call AND
becomes the `dispatchId` on the response envelope; see
[call-security.md § Command Attribution](./call-security.md) and
[response-envelope.md](./response-envelope.md).

The four accumulator methods:

- `note(n: Note)` — append a typed note to the dispatch's outcome.
  Each `Note` is one of the 16 v1 kinds (see
  [response-envelope.md § Notes](./response-envelope.md)); status
  auto-escalates by the strongest-seen rank unless `setStatus` pinned
  a value.
- `setStatus(s: Status)` — pin `'ok' | 'partial' | 'declined' |
  'error'` explicitly. Subsequent notes still accumulate but won't
  override the pinned value. Rare — auto-escalation is usually right.
- `getNotes()` / `getStatus()` — accessors the dispatcher uses after
  `execute()` returns to assemble the envelope. Controllers don't
  typically read these themselves.

### `CommandModel`

The flat, controller-facing record of bound field values. The matcher
writes positional values, option values, and (when the verb is
subcommanded) the active subcommand into a single `ModelData` map:

```ts
type FieldValue = boolean | string | number | Stuff | FieldValue[];
type ModelData = Record<string, FieldValue | undefined>;

type CommandModel = ModelData & {
  subcommand?: string;
};
```

Concrete controllers narrow further by extending `CommandModel` with
their typed fields:

```ts
interface DropModel extends CommandModel {
  targets: Stuff[];
}

class DropController extends CommandController<DropModel> {
  execute(model: DropModel, ctx: CommandContext): void {
    for (const target of model.targets) { /* ... */ }
  }
}
```

The matcher guarantees that fields the YAML marks `required: true`
are present, and that `type: object` fields arrive as a
`MqlOneResult` / `MqlManyResult` wrapper (whose `.stuff` is the
bound `Stuff` or `Stuff[]`) — MQL resolution and zero-hits failure
both happen in `resolveModel` before validators run, and validators
in turn run before the controller fires.

### Pre-controller failure paths

The dispatcher emits structured notes for every failure path before
the controller's `execute()` runs. The five `command-rejected`
reasons:

| Reason                | Emitted at                                                       | ctx       |
|-----------------------|------------------------------------------------------------------|-----------|
| `parse-failed`        | `executeCommand` parse-error branch                              | outer     |
| `unknown-verb`        | `_runChain` empty match list                                     | outer     |
| `shape-fall-through`  | `_runChain` after every match's `assemble` returned a shape error | outer     |
| `bind-failed`         | `_runChain` on assemble's bind error                             | outer     |
| `missing-subcommand`  | `_executeOne` when a subcommand was needed but absent            | attempt   |

Plus two pre-execute kinds from the resolve / validate pipeline
(`resolveModel` for MQL, `runValidators` for sync validator checks,
with `preloadValidatorDeps` awaited in between):

- `mql-error { field, stage, detail }` — wraps MQL resolve calls; on
  throw the dispatcher emits the note and short-circuits the
  dispatch. `stage` is `'desugar' | 'lex' | 'parse' | 'resolve'`.
- `validator-failed { field?, validator, detail }` — every time a
  validator returns a string. The `validator` label is the scope
  (`'verb'` / `'field'` / `'option'` / `'payload'` / `'subcommand:X'`).

Controller exceptions are caught by the dispatcher's outer try/catch
around `_executeOne` and emitted as
`controller-error { controller, detail }`. Controllers don't need
their own try/catch for this — they're free to throw on programmatic-
contract violations.

Full note shapes and the auto-escalation table live in
[response-envelope.md](./response-envelope.md).

### `CommandContributions`

The static a class declares to add commands to the recency stack:

```ts
class Throne extends Stuff /* ... */ {
  static commandContributions: CommandContributions = {
    self: [],
    inventory: [],
    environment: ['sit.yaml'],   // grants `sit` to anyone in the room
    peers: [],
  };
}
```

Buckets:

| Bucket | When it lands on a giver's stack |
|---|---|
| `self` | Always — at host registration. |
| `inventory` | When this thing is in the giver's inventory. |
| `environment` | When this thing is in the giver's environment. |
| `peers` | When this thing is a peer `CommandGiver` in the same environment. |

Mixins, concrete Stuff classes, and shadows all use the same shape.
Each filename resolves through `CommandApi.getCommand` and is loaded
once per file; the resulting `CommandDefinition` is shared across
every host that contributes it.

## Recency stack

Per-giver, chronological. Each entry is `(source, bucket,
CommandDefinition[], seq)`. `'self'` is at index 0 and never removed;
inventory / environment / peer entries push and pop as the world
changes.

```ts
interface RecencyEntry {
  source: RecencySource;       // 'self' | Stuff
  bucket: RecencyBucket;       // 'self' | 'inventory' | 'environment' | 'peers'
  commands: CommandDefinition[];
  seq: number;                 // monotonic; debug aid + stable order tiebreaker
}
```

Idempotency is by `(source, bucket)`. A single source can land
multiple entries when its class declares contributions to several
buckets — e.g. a Visible NPC contributing both `environment` and
`peers`. Pop-by-source removes every entry sourced from that source
across all buckets in one call.

`getAvailableCommands()` walks the stack newest-first and concatenates
each entry's commands, **without dedup**. The "I just walked into the
room" override of "the throne in here" comes from the chain-of-
responsibility — both `sit` controllers run in order; either claims
or passes.

**Within a single source (most-derived first).** When a concrete
class and the mixins it composes both contribute the same verb on
the `self` bucket, `collectSelfDefs` walks the prototype chain and
pushes the concrete `commandContributions` ahead of every mixin
layer. The push order is the dispatch order, so the concrete class's
override of a mixin verb wins. This is the same composition order
`MixinApi.queryMixins` uses for predicate dispatch.

### Ownership: ContainmentApi orchestrates, mixin holds state

The mutation surface (`pushCommandSource`, `popCommandSource`,
`resetCommandSources`) is `@Final @Unshadowable`. Buffs, polymorph
effects, and hood/disguise shadows can't corrupt the stack by
intercepting these methods.

The orchestration sits in `CommandApi.applyContainmentDelta` and
`CommandApi.applyShadowDelta`, called from `ContainmentApi.move` and
`ShadowApi.attach` / `detach` after the underlying state change
succeeds. Splitting state from triggering keeps `CommandGiverMixin`'s
lifecycle hooks (`onContainableAdded` etc.) free of bookkeeping
responsibility — those hooks are subclass extension points, not
`@Final`, so a shadow could intercept them. The seal lives where it
needs to: on the surface the orchestration calls.

The on-attach delta from `ContainmentApi.move`:

- If `dest` is a `CommandGiver`, push `item.commandContributions.inventory`.
- If `dest` is a Location, walk each `CommandGiver` in
  `dest.getContents()` and push `item.commandContributions.{environment,peers}`
  on each (peers only when `item` is itself a `CommandGiver`).
- If `item` is itself a `CommandGiver` and entered a new container,
  call `item.resetCommandSources('self-moved')` to drop the prior
  env+peers slice, then push contributions from each new neighbor.

The detach delta is the symmetric pop: a single `popCommandSource(item)`
on the source-side giver and on each sibling sweeps every bucket
that source contributed to.

### Schema delivery to the client

Schema delivery is gated by `_commandSchemaSubscribed`, which flips
on the first `onConnectionAttached`. Pre-subscription pushes
(hydration, boot-time) don't fire spurious frames. After the gate
opens:

- Every push emits a `system.commands.added` frame per
  `CommandSchemaPayload`.
- Every pop emits a `system.commands.removed` with `{ verb }`.
- The gate-open itself emits one `system.commands.reset` carrying
  the full deduped payload (the client uses this as its baseline
  schema view).

The same hooks drive both the recency stack and the schema delivery
— one signal, two consumers.

## Stage 1 — Ingress

The client sends `{ type: 'command', payload: { text } }` via
WebSocket. `Backend` plants a Root frame via
`runRoot(Backend, 'processUserMessage', ...)`; the dispatch lands in
`Application.handleCommandMessage`, which:

1. Looks up the `Interactive` for this socket; rejects with `error`
   payload if there's no active character.
2. Trims the inbound text and refuses empty input silently.
3. Resolves `interactive.holder` to an `Avatar`, reads its current
   environment as `Location`, and calls
   `avatar.executeCommand(text, { interactive })`.

`executeCommand`'s body does the rest: the proxy gate has already
pushed a frame, the body tags it `FrameKind.Command`, mints
`commandId` and `executionId`, builds the `CommandContext`, and
plants `commandContext` + `causingCommandId` on the live frame's
metadata so downstream Scene / Mudlog calls auto-attribute.

A structured ingress path also exists: `{ type: 'command', payload:
{ verb, subcommand?, fields, raw? } }` skips the parser and goes
straight to `CommandApi.assembleFromStructured` — used for widget
input where the client has already chosen the verb. Same
resolve / preload / validate / controller stack downstream. The
`raw` string is an opaque audit hint; the server logs it but does
not parse or trust it.

## Stage 2 — Parsing

Delegated. The dispatcher resolves the actor's parser (`shell.parser`
setting, default `'msh'`), calls `parser.parse(text, parserCtx)`,
and dispatches on the `ParseResult`:

- `{ parsed }` → run match → assemble → resolve → execute.
- `{ bound }` → skip match + assemble; run resolve → execute.
- `{ error }` → fail the command with the parser's summary.

For tokenization rules, `RawToken` shape, escape handling, the
single-quote-as-literal convention, and `format()` round-trip, see
[command-parsing.md](./command-parsing.md).

## Stage 3 — Matching

`CommandApi.matchVerbContextual(verb, available)` filters the giver's
recency-stack output to the matches whose verb (case-insensitive)
matches the parsed verb. The dispatcher walks each match in order
(newest first) calling `CommandApi.assemble`:

```ts
type AssembleResult =
  | { model: CommandModel }
  | { error: 'shape'; summary }    // fall through to next match
  | { error: 'bind'; summary };    // stop the chain
```

`assemble` binds the parsed tokens to the YAML's args and options:

1. Verb-scoped options before any subcommand or positional.
2. Subcommand selection (if the YAML declares `subcommands:`).
3. Subcommand-scoped options + remaining positionals.
4. Positional binding against the active `args:` array.

**Shape vs bind is the chain-of-responsibility hinge.** The assemble
stage is now the *only* chain-of-responsibility tier — the
execute-stage `pass: true` retired with the response-envelope
landing. A `shape` error means "this YAML's grammar didn't fit"
(pattern mismatch, missing required positional, unknown subcommand,
leftover positionals) — the dispatcher falls through to the next
match. A `bind` error means "user typed something that fits the shape
but not the spec" (unknown option at scope, malformed option value,
repeated non-multi option, boolean given a value) — the chain stops
and the user sees the error (emitted as a `command-rejected
{ reason: 'bind-failed' }` note). The split is what lets a room
override a verb without breaking the original: if the user's input
doesn't fit the override's shape, the chain naturally finds the
original; if it fits the override's shape but the override has a real
binding problem, the user gets a real error rather than silently
re-binding against something else. Runtime-decline cases (the Throne
example) ride on **dynamic contributions** instead — see Stage 5.

The `args:` array is ordered: index 0 is positional slot 0, index 1
is slot 1, etc. Each arg carries its own `name`, so YAML-formatter
key sort doesn't matter. Three load-time invariants enforced by
`CommandDefinition.validate`:

1. **Field-name uniqueness** across positionals and options at every
   reachable scope — except mutually-exclusive syntax variants /
   subcommands, which can reuse names.
2. **Greedy must be last.** A `greedy: true` arg is the final entry
   in its `args:` array. Greedy consumes the remainder of the input
   verbatim — whitespace preserved, escapes processed, quotes literal.
3. **No required after optional.** A `required: true` arg cannot
   follow a `required: false` arg in the same array. Greedy is
   `required: true` by definition unless explicitly `required: false`.

When the matcher stamps a subcommand, it lands on the model under the
reserved key `subcommand` (the constant `SUBCOMMAND_FIELD` in
`api/command.ts`). YAMLs with `subcommands:` cannot declare a field
or option named `subcommand` — caught at load time.

### Two-tier option scope

Options have lexical scope (where they appear in the input) but the
model is flat (one `fields` map for the whole command). Options
typed before the subcommand are verb-scoped — bound against the
verb's top-level `options:` block. Options typed after the
subcommand are subcommand-scoped — bound against the active
subcommand's `options:` block. An option name not declared at the
scope where it appears is a `bind` error (`unknown option --xyz at
verb-level`). Both layers contribute to the same flat `model` map,
keyed by each option's `field` (defaults to the option name). The
lexical-scope rule is what makes `--oneline` valid under `git log`
but rejected under `git pull` without each subcommand needing to
know about every verb-level option.

## Stage 4 — Resolution + validation

Resolution and validation are split across two sync `CommandApi`
entry points with an async preload phase between them. The
dispatcher's call sequence is:

```
resolved = CommandApi.resolveModel(model, ctx)              // sync, MQL only
await CommandApi.preloadValidatorDeps(cmd, ctx, resolved,   // async preloads
                                       subcommandHint)
ok       = CommandApi.runValidators(resolved.resolved, ctx) // sync validators
```

`CommandApi.resolveAndValidate` remains as a back-compat wrapper
that chains the three for tests and one-off sync callers; the
dispatcher itself does NOT use it (it needs the seam to insert
the async preload phase).

`resolveModel` walks every `type: object` / `type: objects` field:

```
for each type:object field present:
  // def.scope is normalised to string[] | undefined at construction.
  // Default ['$focus'] when YAML omits scope: entirely.
  tries = (def.scope ?? ['$focus'])
            .map(s => ShellApi.expandVariables(s, giver))
  for each scope in tries:
    if multiple:  MqlApi.resolveMany(query, { commandGiver, scope })
    else:         MqlApi.resolveOne (query, { commandGiver, scope })
    stop on first non-empty result
  bind the wrapper (MqlOne / MqlMany) onto the model
```

`runValidators` then runs everything:

```
run verb-level validators (CommandValidator[])
run field validators (positional + sub-positional)
run verb-scoped option validators
run subcommand-scoped option validators (if active)
```

First failure short-circuits with a structured `validator-failed`
note on the context.

### Validator preload phase

Validator sync bodies often need singleton-backed reads — e.g.
`requiresAnimate` calls `SpeciesApi.isAnimate` which walks the
giver's species clade ancestor chain via `findByTemplatePath`. The
clades must already be live for the sync lookup to succeed.

Rather than bootstrap every clade up front (or make every
validator async), `FieldValidator` and `CommandValidator` carry an
optional `preload?: (... args ...) => Promise<void>` hook. The
dispatcher's `preloadValidatorDeps` walks every validator attached
to the matched command (verb-level + field + verb-option + payload
+ per-subcommand) and `Promise.all`s their preloads. Each preload
calls `StuffApi.singleton(path)` to ensure its deps, idempotently.

Signatures mirror the sync bodies — verb-level preloads take
`(context)`, field-level preloads take `(value, field, context)` —
so a field validator that needs per-bound-target deps can inspect
the resolved `value` (e.g. `requiresAnimateTarget` would read the
bound target's `_speciesPath`). Validators without a `preload` are
skipped. Today the only preload consumer is `requiresAnimate`; the
pattern stands ready for materials / biomes / etc. as they grow
validator coverage.

The split between MQL resolution and validator execution is what
makes this work: field-level preloads need the resolved value to
compute their deps, so MQL has to run first; validator sync bodies
need the singleton cache populated, so preloads have to run before
`runValidators`. The dispatcher interleaves the three.

### YAML scope[] is the explicit fallback chain

`FieldDefinition.scope` accepts `string | string[]` in the YAML /
spec record. `CommandDefinition.normaliseShape` coerces the bare-
string form to a singleton array, so the runtime value downstream
code sees is always `string[] | undefined` — no `Array.isArray`
checks at the call sites.

Each entry runs through `ShellApi.expandVariables` (synthetic vars
like `$focus` and stored vars expand at bind time) and is tried
in order; first non-empty result wins. The array form is the
explicit fallback chain — a verb that wants drill-first-then-broad
semantics declares `scope: ['$focus', 'reachable']` so a drilled
player searches the focus first, with the room as fallback. Verbs
that should ignore drill entirely declare a non-`$focus` fragment
(e.g. `scope: 'inventory'` for `drop`, `scope: 'peers'` for `get`).

When a YAML omits `scope:` entirely, the dispatcher defaults to
`['$focus']` — the drill chain IS the scope. The resolver's
empty-scope fallback to `reachable` stays as the safety net for
when the focus chain stops resolving (typically after the player
walks into a different room and the old chain doesn't make sense
in the new context). Inspection-shaped YAMLs continue to declare
`scope: ['$focus', 'reachable']` explicitly when they want the
drill-first-then-broad pattern; the omit-default is the same shape
with a single `$focus` entry.

There's no implicit "player focus tries first" rule. The YAML is
authoritative — the help system can read `scope` to tell players
which commands respect drill and which don't.

Pronoun memory updates and the `updates_focus` post-resolve hook
both gate on `MixinApi.isFocused(giver)`. NPCs without
`FocusedMixin` resolve through MQL but don't carry focus state or
a pronoun stash.

### Default args

`FieldDefinition.default?: string` lets a field declare fill-in
text for missing input. The matcher's boundary-lookahead extends
to non-greedy fields: when binding a positional and the next
available token belongs to a *later* field's `prepositions:`
list, the current field defaults rather than consuming. The
default runs through the same `ShellApi.expandVariables` as
player-typed text — `default: "$focus"` expands at bind time.

`required: true` + `default:` is allowed; the default replaces
the missing input. The "missing required arg" error only fires
when the field is required AND has no default AND the player
supplied nothing. See [shell-environment.md § Variable
interpolation](./shell-environment.md#variable-interpolation) for
the expansion machinery.

The substitution happens at the parse-to-bind transition, before
field validators run. After substitution the default string flows
through the field's normal validator / MQL pipeline as if the
player had typed it, so the controller sees a uniform call
surface. Embodiment verbs use this for the no-arg posture forms
(`sit` becomes `sit ground`); see [posture.md](./posture.md).

The first validator to return a non-undefined string fails the command
and emits a `validator-failed { field?, validator, detail }` note on
the outer ctx (the `validator` label is the scope — `'verb'` /
`'field'` / `'option'` / `'payload'` / `'subcommand:X'`). On success,
the dispatcher hands the resolved model to `_executeOne`.

Validators MAY also call `ctx.note(...)` with richer kinds
(`controller-rejected { reason: 'cant-afford' }`,
`controller-rejected { reason: 'on-cooldown' }`, etc.) *in addition*
to returning a string — the dispatcher's `validator-failed` rides
alongside as the framework-tier fallback. Generic framework
validators (`mustBeContainable`, `canReach`, `mustBeNumber`,
`notEmpty`, `requiresAnimate`) stay note-silent; specialized
domain validators (`canAfford`, `notOnCooldown`, etc.) opt into
the richer signal. Validators may also emit informational notes
without returning a string. See
[response-envelope.md § Pre-controller failure paths](./response-envelope.md).

Validators are file-based modules that default-export a
`FieldValidator` function. YAML references them by path:

```yaml
validators:
  - /lib/command/validators/mustBeContainable   # mud-rooted absolute
  - ./extra/myValidator                          # relative to YAML
```

`/X` resolves to `<src>/mud/X.ts`; `./` and `../` resolve relative to
the YAML file's directory. Bare names and package specifiers are
rejected — the path tells you exactly where the validator lives, no
implicit search paths, no registry. The JS module cache handles
repeat loads. Built-ins live under `mud/lib/command/validators/`:
`mustBeContainable`, `canReach`, `mustBeNumber`, `notEmpty`,
`requiresAnimate` (the canonical example of the async `preload`
hook — its preload ensures the giver's species clade and every
ancestor clade are live before the sync `isAnimate` body runs).

`mustBeVisible` was retired: the gate rejected non-`Visible`
hosts uniformly, which made `look` against the void (a
non-`Visible` Location used as the bootstrap-starting room) fail
at the validator layer. Inspection verbs now do the
Visible/non-Visible discrimination inside the controller (see
`LookController.lookAtTarget` for the polite-refusal path), where
the controller can tell "tried to look at a thing" from "tried
to look at the room I'm in" and degrade appropriately.

Validators are resolved at boot by `CommandApi.preloadAll()` —
called from `index.ts` after seeders/hooks run, before traffic
accepts. Each YAML's validator string list lands on
`FieldDefinition._resolvedValidators` as live functions; the matcher
reads only the resolved form.

## Stage 5 — Controller execution

`_executeOne` clones the controller, runs it, destructs it:

```ts
const controller = await StuffApi.clone<CommandController>(
  `/obj/command/${command.controller}`
);
try { return await controller.execute(model, ctx); }
finally { StuffApi.destruct(controller); }
```

The controller is a fresh `Idea` per execution — no state across
invocations. State lives on the world (the giver, the location, props
on a Stuff). `StuffApi.clone` consults `HotReloadApi` so editing a
controller and reloading picks up on the next dispatch.

Controllers do three things:

1. **Narrow `commandGiver`** when they need a subclass surface.
   `GoController` narrows with `MixinApi.isMobile(mover) &&
   MixinApi.isContainable(mover)`.
2. **Fire prose** via `MessageApi.scene(actor).topic(…)
   .to{Self,Peers,Witnesses,Target}(body).send()`. See
   [messaging.md](./messaging.md) for the Scene composer.
3. **Emit notes via `ctx.note(...)`** for structured outcome signal
   on the dispatch-response envelope.

`execute()` returns `void`. There is no `CommandResult`, no
`success: boolean`, no `summary` — those retired. The dispatcher
reads `ctx.getNotes()` / `ctx.getStatus()` after the call returns
and assembles the envelope. The canonical failure pattern is
**Scene.send + ctx.note** at every failure site — prose for the
player to read, note for the structured channel.

```ts
interface DropModel extends CommandModel { targets: Stuff[] }

class DropController extends CommandController<DropModel> {
  execute(model: DropModel, ctx: CommandContext): void {
    for (const target of model.targets) { this.dropOne(target, ctx); }
    // No return value. Failure prose + ctx.note(...) ride through
    // the Scene channel and the envelope channel respectively.
  }
}
```

Throws bubble out and are caught at `_executeOne`'s outer try/catch,
which emits a uniform `controller-error { controller, detail }` note.
Controllers don't need to wrap throwing primitives (e.g.
`SlotApi.occupyAll`) themselves — throwing is the right shape for
programmatic-contract violations.

### Dynamic contributions (the retired `pass: true` replacement)

The execute-stage chain-of-responsibility (`pass: true`) is gone.
Same-verb collisions now resolve at the **assemble stage** (shape vs
bind — see Stage 3) or via **dynamic contributions** on the recency
stack: contributors push/pop their YAML based on world state so that
the stack at dispatch time already reflects who's eligible.

The Throne illustrates the pattern:

- **Old (retired)**: Throne always contributed `sit.yaml` on its
  `environment` bucket. When occupied, `ThroneSitController` returned
  `pass: true`; the dispatcher walked to the avatar's intrinsic `sit`
  next.
- **New**: Throne pushes its `sit.yaml` contribution onto its
  environment-bucket recency entry *only when unoccupied*; pops the
  contribution when occupied. With the throne occupied, the recency
  stack contains only the avatar's intrinsic `sit`, which runs
  directly. State transitions push/pop the contribution via
  `CommandApi.applyContainmentDelta` / `applyShadowDelta`.

Dispatchability is decided at the discovery layer rather than
after-the-fact at the controller. Each controller is unconditionally
responsible for its match; `help` output and the verb actually
dispatched stay in lockstep.

## YAML view shape

Each file under `mud/cmd/` declares one `CommandView`. The schema
lives at `mud/cmd/command.schema.json` and is enforced by Ajv on
load — schema failures throw with the full error trail at boot, not
at first verb invocation.

**Flat verb (no subcommands):**

```yaml
verbs: [look, l]
controller: LookController
description: "Examine your surroundings or an object"
args:
  - name: target
    type: object
    required: false
options:
  long:
    short: l
    type: boolean
    description: "Verbose output"
```

**Subcommanded verb:**

```yaml
verbs: [player, me]
controller: PlayerController
description: "Manage your player character settings"
subcommands:
  name:
    description: "Set your character name"
    args:
      - name: name
        type: string
        required: true
      - name: surname
        type: string
        required: false
  pronouns:
    description: "Set your pronouns"
    args:
      - name: pronouns
        type: string
        required: true
  show:
    description: "Show your current player settings"
```

Top-level `args:` and `subcommands:` are mutually exclusive. Either
may be absent (a verb with neither — e.g. `ping` — is fine).

## Adding a new command

1. **Define the YAML** in `mud/cmd/<verb>.yaml`. Pick `args:` *or*
   `subcommands:` (never both). Lowercase filename. The schema check
   surfaces typos / missing fields at boot.
2. **Implement the controller** in
   `mud/obj/command/<Name>Controller.ts` extending
   `CommandController<TModel>`. The class name matches the YAML's
   `controller` field. Define a model interface that declares the
   typed fields the matcher will hand you.
3. **Add the seed** at `mud/seeds/obj/command/<Name>.yaml` with the
   correct class path. `SeederManager` writes the Template doc into
   `domain` at boot; `StuffApi.clone` picks it up on dispatch.
4. **Wire discovery.** Decide which class or mixin should expose the
   verb in its `commandContributions`. A spatial command goes on a
   spatial mixin; a description command on `VisibleMixin`; a
   player-only admin verb on `Avatar`'s static `commandContributions`.
   Pick the buckets: `self` / `environment` / `inventory` / `peers`.
5. **Validators (optional)** — if existing validators don't cover the
   field, add a new module under `mud/lib/command/validators/<Name>.ts`
   default-exporting a `FieldValidator` and reference it by path
   from the YAML.
6. **Tests** — colocate under `__tests__/`. Vitest. Drive controllers
   directly with a synthetic `CommandContext` for unit coverage; the
   full pipeline can be exercised via `giver.executeCommand(text)`.

## Cache invalidation (dev)

YAML CommandDefinitions don't auto-reload — `CommandApi.getCommand`
caches by filename for the process lifetime. The intentional escape
hatch for dev edits:

```ts
CommandApi.invalidate('look.yaml');     // drop one entry
CommandApi.invalidate('player.yaml');
// next CommandApi.getCommand(...) re-reads the YAML from disk
```

Live recency-stack entries that already hold a reference to the old
`CommandDefinition` keep using it until they pop. The next
`applyContainmentDelta` / `applyShadowDelta` push will pick up the
reloaded definition. For most dev workflows, "edit YAML →
invalidate → move yourself in/out of the affected container" is a
two-line console sequence. Wiring full HMR for command YAMLs (file-
watcher → invalidate → broadcast `system.commands.reset`) is a
future task.

## Frame attribution

Every frame composed during a command's synchronous execution carries
the originating `commandId`. The chain:

1. `Application.handleCommandMessage` calls
   `avatar.executeCommand(text, { interactive })`.
2. The proxy intercepts and pushes a `CallFrame` with `target:
   avatar`, `method: 'executeCommand'`.
3. `executeCommand`'s body:
   - `tagCurrentFrame(FrameKind.Command)` re-tags the frame so stack
     walkers can find it without method-name matching.
   - `commandId = nanoid()`; stored on `context.commandId`.
   - `updateCurrentFrameMetadata({ commandContext, causingCommandId })`
     stores the live context object on the frame.
4. Anything composed downstream — `Scene.send()`,
   `MudlogApi.{info,warn,...}`, scheduled callbacks via
   `ScheduleApi` — reads
   `ExecutionContextApi.getCurrentCommandContext()` to find the
   command frame, pulls `commandId` and `causingCommandId` off, and
   stamps the outgoing frame.

For delayed/asynchronous aftermath (banana peel dropped now → NPC
slips next tick), `ScheduleApi` re-plants `causingCommandId` onto the
fresh Root frame, so `getCurrentCausingCommandId()` keeps surfacing
the originating command's id even when the synchronous chain is
gone. See [call-security.md § Command
Attribution](./call-security.md).

## Design rationale

### Why YAML for views

The view is declarative — verbs, args, options, subcommands,
validators. None of it needs runtime control flow. YAML keeps it data:

- A non-programmer can add a verb or alias without TypeScript.
- The same view file drives parsing AND help text — no duplication.
- Schema enforcement via Ajv catches authoring mistakes at boot.
- Future migration to MongoDB-stored views (the `domain` collection,
  same as Avatar templates) is mechanical: read a string field,
  parse, cache.

### Why outcome flows through the ctx accumulator (and not a return value)

Earlier sketches had a `CommandResult` return value carrying
`success` / `summary` / `pass`. The shipped position separates the
two channels entirely:

- **Prose** is a Scene, fired inside the controller via `MessageApi`.
  Scenes know how to address self / peers / witnesses / target; one
  `Scene.send()` produces the right per-audience frames.
- **Structured outcome** lives on the `CommandContext` accumulator
  (`ctx.note(...)`, `ctx.getStatus()`) and is assembled by the
  dispatcher into the `dispatch-response` envelope after `execute()`
  returns.

Two separate channels, neither overloaded. `execute()` returns
`void` because there is no single right return shape — the wire
already has dedicated places for prose and for outcome. See
[response-envelope.md](./response-envelope.md) for the envelope
shape and note kinds.

### Why discovery is a per-giver recency stack

Discovery answers "which verbs are legitimate for this giver right
now?" The recency stack is a per-giver answer that updates as the
world changes — entering a room with a Throne pushes `sit`; leaving
pops it. Dispatch and listing share one source of truth, so the
player's `help` output and the set of dispatchable verbs cannot drift.

This does not replace controller-level gating — `GoController` still
narrows with `MixinApi.isMobile(mover)`, `GetController` still
validates reachability via `canReach`. Discovery answers the *verb*
question; controllers answer the *operands and context* question.
The two layers stack: discovery filters out verbs the giver has no
business issuing; controllers handle situation-specific "can't right
now" cases.

Same-verb collisions resolve at the **assemble stage** (shape vs
bind — see Stage 3) or via **dynamic contributions** that push/pop a
contribution based on world state. The execute-stage `pass: true`
chain-of-responsibility retired with the response-envelope landing;
see Stage 5 § Dynamic contributions.

### Why validators are file-based, not registered

A registry is a layer of indirection that doesn't pay off when YAML
already names the validator by path. File-based discovery means the
YAML reference IS the source location — no central import list to
keep in sync, no boot-time registration choreography, no name
collisions, no "did I register this?" debugging. The JS module cache
handles caching for free. The cost is one rule: validators must live
under `mud/` and be referenced by absolute (`/X`) or relative
(`./X` / `../X`) path; bare names and package specifiers are rejected.

### Why controllers are clone-per-execution Stuff

Two requirements drove this:

1. **HMR awareness.** Controllers should pick up edits without a
   restart. The same `StuffApi.clone` that wires HMR for game objects
   wires it here too — no separate machinery.
2. **State hygiene.** A fresh instance per execution means controllers
   can hold per-execution state (a partial result, an enumeration
   index) without worrying about leaks.

Destructing in `finally` keeps `StuffApi`'s template/instance indexes
from accumulating ephemeral entries.

## Cross-references

- [command-parsing.md](./command-parsing.md) — tokenization, parser
  pluggability, `RawToken`, `format()` round-trip, the `msh` shell.
- [response-envelope.md](./response-envelope.md) — dispatch-response
  envelope shape, note kinds, auto-escalation table, the
  `CommandContext` accumulator surface from the consumer side.
- [call-security.md § Command Attribution](./call-security.md) —
  `FrameKind.Command`, `commandId`, `causingCommandId`,
  `getCurrentCommandGiver`, `getCurrentCommandContext`,
  `tagCurrentFrame`, `updateCurrentFrameMetadata`.
- [messaging.md](./messaging.md) — Scene composer, MML body format,
  sensor routing, `MudlogApi` topics, the Application → Backend →
  WebSocket delivery path.
- [hot-reload.md](./hot-reload.md) — `StuffApi.clone` + `HotReloadApi`
  integration; controller HMR rides on this.
- [shell-environment.md](./shell-environment.md) — the `shell.parser`
  setting and how `EnvironmentMixin` + `resolveSetting` route per-
  actor settings.
- [architecture.md](../architecture.md) — Manager vs Api layering,
  mixin organization, file structure for `cmd/` and `obj/command/`.
- [antipatterns.md](../antipatterns.md) — `ContainmentApi.move` /
  `mover.traverse(exit)` patterns command controllers prefer over
  raw containment juggling.
