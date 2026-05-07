# Commands

The path between "the player typed `get sword` and pressed enter" and
"the world has changed and the player's client knows it." MVC: a
**YAML view** declares the verb and its argument shape, a
**CommandModel** is the bound input the controller consumes, and a
**CommandController** is the body that mutates the world.

Discovery is per-giver and contextual. Every Stuff that touches the
executor — the giver itself, things in its inventory, things in its
environment, peer CommandGivers — can contribute commands. The
contributions ride on a per-giver **recency stack** maintained by
`CommandGiverMixin`; `ContainmentApi.move` and `ShadowApi.attach` /
`detach` push and pop entries as the world changes. Dispatch walks the
stack newest-first, filters by verb, and runs a chain-of-responsibility:
each match's controller can return `pass: true` to defer to the next.

The shape lives in:

- `packages/server/src/mud/api/command.ts` — `CommandApi`,
  `CommandContext`, `CommandResult`, `CommandModel`, the YAML view
  types, parser/validator path resolvers, recency-stack orchestration.
- `packages/server/src/mud/api/command-line.ts` — `CommandLineApi`
  (pure tokenizer + pipeline split, YAML-unaware).
- `packages/server/src/mud/lib/command/CommandGiverMixin.ts` — the
  per-giver recency stack and `executeCommand` dispatch loop.
- `packages/server/src/mud/lib/command/CommandDefinition.ts` — the
  loaded YAML view, validated against `cmd/command.schema.json`.
- `packages/server/src/mud/lib/command/CommandController.ts` — the
  abstract base controllers extend.
- `packages/server/src/mud/lib/command/parsers/<name>.ts` — pluggable
  parsers (today: `msh`).
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
   │     msh wraps CommandLineApi.parsePipeline; LLM parsers can
   │     short-circuit and return { bound: { command, model } }.
   │
   ├─ if ParseResult.parsed: _runChain
   │     CommandApi.matchVerbContextual(verb, available)  → CommandDefinition[]
   │     for each match (newest first):
   │       CommandApi.assemble(parsed, command)           → ModelData | error
   │       on shape error → continue (try next match)
   │       on bind error  → stop (return summary)
   │       CommandApi.resolveAndValidate(model, ctx)      → MQL + validators
   │       _executeOne:
   │         StuffApi.clone('/obj/command/' + cmd.controller)
   │         await controller.execute(model, ctx)
   │         StuffApi.destruct(controller)
   │         on `pass: true` → continue; else return result
   │
   ├─ if ParseResult.bound: skip parse + match,
   │     run resolveAndValidate + _executeOne directly.
   │
   ▼
result: CommandResult { success, summary?, pass? }
   │
   ▼
auto-emit MudlogApi.{info|warn}('command', `${verb}: ${tail}`, { to: giver })
   tail = result.summary ?? (success ? 'ok' : 'failed')
```

The MVC mapping inside that pipeline:

| MVC role | Concrete artifact | Lives in |
|---|---|---|
| **View** | YAML file declaring verbs, args, options, subcommands | `mud/cmd/*.yaml` |
| **Model** | `CommandModel` — `Record<string, FieldValue \| undefined> & { subcommand? }` | runtime only |
| **Controller** | `CommandController<T>` subclass extending `Idea` | `mud/obj/command/*Controller.ts` |

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

The read-only reference bundle threaded through the pipeline. The
giver, location, and ids are populated up-front by
`CommandGiverMixin.executeCommand`; `verb` and `command` are
overwritten once the matcher binds.

```ts
interface CommandContext {
  commandGiver: Stuff & CommandGiver;
  interactive?: Interactive;        // optional — cascaded/NPC commands omit
  location: Location;
  commandText: string;
  executionId: string;              // dispatch id (call-stack tracking)
  commandId: string;                // attribution id (frame metadata)
  verb: string;                     // populated by matcher
  command: CommandDefinition;       // populated by matcher
}
```

`commandGiver` is typed as `Stuff & CommandGiver` rather than
`Avatar`. Controllers narrow with `MixinApi.isX(obj)` predicates when
they need a subclass surface. The dispatch path is the same for an
NPC issuing commands programmatically or a future "disembodied
executor."

`executionId` and `commandId` are both `nanoid()`s but serve different
roles. `executionId` rides on the auto-emit's payload so log consumers
can correlate diagnostics back to one keystroke. `commandId` rides on
every frame composed during the synchronous span of the call; see
[call-security.md § Command Attribution](./call-security.md).

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
  execute(model: DropModel, ctx: CommandContext): CommandResult {
    for (const target of model.targets) { /* ... */ }
  }
}
```

The matcher guarantees that fields the YAML marks `required: true`
are present, and that `type: object` fields arrive as `Stuff` (or
`Stuff[]` for `multiple: true`) — MQL resolution and zero-hits failure
both happen in `resolveAndValidate` before the controller fires.

### `CommandResult`

Purely semantic. Prose lives in Scenes the controller fires; the
result decorates the auto-emit:

```ts
interface CommandResult {
  success: boolean;
  pass?: boolean;       // chain-of-responsibility: defer to next match
  summary?: Mml | string;
}
```

`success` answers "did the command achieve its goal?" `summary`, when
present, replaces the auto-emit tail (`'ok'` for success, `'failed'`
for failure). `pass: true` opts the controller out — the dispatcher
tries the next match. A passing controller must not have observable
side effects.

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

### Recency stack

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

The mutation surface (`pushCommandSource`, `popCommandSource`,
`resetCommandSources`) is `@Final @Unshadowable`. The orchestration
lives on `CommandApi.applyContainmentDelta` and
`CommandApi.applyShadowDelta`, called from `ContainmentApi.move` and
`ShadowApi.attach` / `detach` respectively. A buff or polymorph
shadow cannot corrupt the stack by intercepting these methods.

Schema delivery to the client is gated by `_commandSchemaSubscribed`,
which flips on the first `onConnectionAttached`. Pre-subscription
pushes (hydration, boot-time) don't fire spurious frames; after the
gate opens, every push/pop emits a `system.commands.{added,
removed}` frame and the gate-open itself emits a `system.commands.reset`
carrying the full deduped payload.

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
`resolveAndValidate` and controller stack downstream.

## Stage 2 — Parsing

Parsing is pluggable. The actor's `shell.parser` setting (declared on
`CommandGiverMixin`, default `'msh'`) names the parser to use;
`CommandApi.resolveParser(spec)` dynamic-imports the module from
`mud/lib/command/parsers/<name>.ts` (bare name) or `mud/<rest>.ts`
(absolute `/`-prefixed path). The setting is enum-typed; adding a new
parser is a one-line append to `enumValues`.

```ts
interface Parser {
  name: string;
  parse(text: string, ctx: ParserContext):
    ParseResult | Promise<ParseResult>;
}

interface ParseResult {
  parsed?: ParsedCommand;             // hand to match + assemble
  bound?: { command, model };         // already chose verb + bound model
  error?: string;                     // surfaces via auto-emit
}
```

The default `msh` parser wraps `CommandLineApi.parsePipeline` — pure
tokenization, single + double quotes, escape sequences, short-flag
collapse, long flags, `--` stop marker, `|` pipeline boundary
(non-trivial pipelines throw NYI today). It returns
`{ parsed: ParsedCommand }`; the dispatcher runs the full
match/assemble/resolve/execute pipeline.

NL/LLM parsers can short-circuit by returning `{ bound: { command,
model } }` — they pick the verb and produce field values themselves;
the dispatcher skips parse + match and runs only resolve + execute.
The `ParserContext.available` field hands the parser the recency-
stack-filtered command set so it can constrain its choices.

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

`shape` errors mean "this YAML's grammar didn't fit" — the chain tries
the next match. `bind` errors mean "user typed something that fits the
shape but not the spec" (unknown option, malformed value, repeated
non-multi option) — the chain stops and the user sees the error.

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

## Stage 4 — Resolution + validation

`CommandApi.resolveAndValidate` runs MQL resolution on `type: object`
fields and runs every declared validator:

```
for each type:object field present:
  if multiple:
    MqlApi.resolveMany(query, ctx) → Stuff[]
    empty → fail with "you don't see any '<query>' here"
  else:
    MqlApi.resolve(query, ctx) → Stuff | null
    null → same failure
  replace string with resolved Stuff / Stuff[]

run field validators (positional + sub-positional)
run verb-scoped option validators
run subcommand-scoped option validators (if active)
```

The first validator to return a non-undefined string fails the command
with that summary. On success, the dispatcher hands the resolved
model to `_executeOne`.

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
`mustBeContainable`, `mustBeVisible`, `canReach`, `mustBeNumber`,
`notEmpty`.

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
3. **Return `CommandResult`.**

```ts
interface DropModel extends CommandModel { targets: Stuff[] }

class DropController extends CommandController<DropModel> {
  execute(model: DropModel, ctx: CommandContext): CommandResult {
    let dropped: Stuff[] = [];
    for (const target of model.targets) {
      if (this.dropOne(target, ctx)) dropped.push(target);
    }
    if (dropped.length === 0) return { success: false, summary: 'nothing dropped' };
    return { success: true, summary: dropped.map(d => d.getName()).join(', ') };
  }
}
```

Throws inside the controller bubble out and get caught at
`_executeOne`'s boundary — caught throws turn into
`{ success: false, summary: error.message }`.

Returning `{ success: false, pass: true }` defers to the next match.
The Throne example: a Throne in the room contributes `sit.yaml`
under `environment`. The avatar's own `sit.yaml` (from a hypothetical
`SitterMixin` on Avatar) is on `self`. Newest-first order puts the
Throne first; `ThroneSitController` claims (success). If the Throne
were destructed-but-never-popped (a bug) or refused with `pass: true`
(by design — "you can't sit on this throne, it's already taken"),
the avatar's intrinsic `sit` runs next.

## Stage 6 — Auto-emit

After the controller returns (or the pipeline fails earlier),
`executeCommand` emits one MudlogApi entry summarizing the outcome.
This is what the player reads in the console for "command done"
feedback:

```ts
const tail = result.summary ?? (result.success ? 'ok' : 'failed');
const level: LogLevel = result.success ? 'info' : 'warn';
MudlogApi[level]('command', Mml.compose`${verb}: ${tail}`, {
  to: giver as Stuff & Sensor,
  payload: { verb, success, commandText, executionId },
});
```

The frame's topic is `system.log.command.info` /
`system.log.command.warn`. The body is `${verb}: ${tail}` — short by
design. The payload carries the structured details for log consumers;
the body is the human-readable face.

The recipient is the giver, but only if it's a `Sensor`. A
disembodied executor that isn't a Sensor is a coherent case; the
auto-emit is skipped silently. The downstream effect is still visible
— the controller's own `Scene.send()` calls already delivered any
prose.

The auto-emit is the framework's contract for "ok / not-ok." A
controller wanting different wording overrides via `summary`. A
controller wanting no extra surface (e.g. one whose prose already
conveys success) returns `summary: ''` — usually it's simpler to let
`'ok'` ride.

## YAML view shape

Each file under `mud/cmd/` declares one `CommandView`. The schema
lives at `mud/cmd/command.schema.json` and is enforced by Ajv on
load.

**Flat verb (no subcommands):**

```yaml
verbs: [look, l]
controller: LookController
description: "Examine your surroundings or an object"
args:
  - name: target
    type: object
    required: false
    validators:
      - /lib/command/validators/mustBeVisible
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

### Why CommandResult is purely semantic

Earlier sketches had `CommandResult` carry the prose to render on the
client. That coupled controllers to the messaging layer's wire shape
and made multi-audience commands awkward (`say` produces different
prose for the speaker, the room, and a remote listener). The shipped
position:

- Prose is a Scene, fired inside the controller via `MessageApi`.
  Scenes know how to address self / peers / witnesses / target; one
  `Scene.send()` produces the right per-audience frames.
- `CommandResult` answers the *semantic* question: was the goal met?
  The auto-emit then stamps a single short summary frame for the
  giver only — the "ok / failed" tail.

Two separate signals, neither overloaded.

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

The chain-of-responsibility (`pass: true`) is the override mechanic:
two contributors of the same verb run in recency order; either claims
or passes.

### Why parsers are pluggable

The `msh` tokenizer-driven shell is one parser shape; future LLM- or
NL-driven parsers are another. Hard-coding parse semantics into
`executeCommand` would force every shell to fit the same mold. The
`Parser` interface decouples ingress: token-based parsers return
`{ parsed }`, intent-based parsers return `{ bound }`. The dispatcher
runs whichever post-stage applies. The `shell.parser` setting picks
per-actor.

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

## Deferred

CommandDefinitions don't yet participate in HMR — the
filename-keyed cache holds the parsed view across the process
lifetime. Editing a YAML during dev requires a server restart. Wiring
the YAML loader to `HotReloadApi.reloadHookManifest`-style invalidation
is a future task; the surface is small (one cache, one preload path,
one schema validator).

## Cross-references

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
