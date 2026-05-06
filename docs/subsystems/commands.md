# Commands

The command framework is the path between "the player typed `get
sword` and pressed enter" and "the world has changed and the player's
client knows it." It's an MVC pipeline: a **YAML view** declares the
verb and its argument shape, a **CommandModel** is the resolved data
ready for execution, and a **CommandController** is the body that
actually mutates the world.

Discovery is contextual — every Stuff that touches the executor (self,
inventory, environment, peers) can contribute commands via a
`commandProvider` static. The pipeline parses → matches → resolves
object references → validates fields → invokes the controller. The
controller fires its prose via `MessageApi.scene(...)` and returns a
purely-semantic `CommandResult`; an auto-emitted `MudlogApi` entry at
`system.log.command.{info,warn}` is what surfaces the `ok` / `failed`
tail to the client.

The shape lives in:

- `packages/server/src/mud/api/command.ts` — `CommandApi`,
  `CommandContext`, `CommandResult`, `CommandModel`, the YAML view
  types
- `packages/server/src/mud/api/command-line.ts` — `CommandLineApi`
  (pure tokenizer + option extractor)
- `packages/server/src/mud/lib/command/` — `CommandGiverMixin`,
  `CommandDefinition`, `CommandController`, `validators`,
  `ICommandProvider`
- `packages/server/src/mud/cmd/*.yaml` — command views (declarative)
- `packages/server/src/mud/obj/command/*Controller.ts` — controllers

## End-to-End Flow

```
[client] CommandBar onSend(text)
   │  websocketClient.send({ type: 'command', payload: { text } })
   ▼
[server] Backend.handleWebSocketMessage(buffer)
   │  ExecutionContextApi.runRoot(Backend, 'processUserMessage', …)
   ▼
Application.processUserMessage(socketId, message)
   │  switch(message.type) → handleCommandMessage
   ▼
Application.handleCommandMessage
   │  resolves Interactive → Avatar → Location
   │  builds CommandContext { commandGiver, interactive, location,
   │                          commandText, executionId, commandId: '' }
   ▼
avatar.executeCommand(commandText, context)            ← CommandGiverMixin
   │  proxy intercept (call-security gate) pushes a frame
   │  body tags frame as FrameKind.Command, mints commandId
   │
   ├─ CommandLineApi.parse(commandText)         → ParsedCommand
   ├─ getAvailableCommands()                    → populate CommandApi cache
   ├─ CommandApi.matchVerb(parsed.verb)         → CommandDefinition
   ├─ matchPattern(syntax|subcommand, args, …)  → raw fields
   ├─ resolveValidateExecute
   │    ├─ resolve type:object fields via MqlApi
   │    ├─ run validators (mustBeVisible, canReach, …)
   │    └─ executeController
   │         StuffApi.clone('/obj/command/' + cmd.controller)  ── HMR-aware
   │         await controller.execute(fields, context)
   │         StuffApi.destruct(controller)                    ── ephemeral
   ▼
LookController.execute(input, ctx) (etc.)
   │  fires prose: MessageApi.scene(actor).topic(…).toSelf(body).send()
   │  returns { success: true, summary?: 'examined cair-paravel' }
   ▼
[back in executeCommand]
   │  on success/failure, MudlogApi.{info|warn}('command', …, { to: giver })
   │  → frame at system.log.command.{info|warn}
   ▼
[messaging path — see messaging.md]
   Sensor.onMessage → Avatar.handleMessage → Application.sendMessageToInteractive
   → Backend.sendMessageToSocket → WebSocket.send(JSON)
   ▼
[client] websocketClient.handleMessage(data) → topic handlers
```

The MVC mapping inside that pipeline:

| MVC role | Concrete artifact | Lives in |
|---|---|---|
| **View** | YAML file declaring verb, syntax, fields, validators | `mud/cmd/*.yaml` |
| **Model** | `CommandModel` — resolved fields + options + verb | runtime only |
| **Controller** | `CommandController` subclass (extends `Idea`) with `execute(input, ctx)` | `mud/obj/command/*Controller.ts` |

Controllers are templated `Idea` Stuff. Each controller file has a
matching seed YAML at `mud/seeds/obj/command/<Name>.yaml` so
`SeederManager` writes a Template doc into `domain` at boot. Dispatch
clones a fresh instance per execution via `StuffApi.clone` (which
consults `HotReloadApi` automatically — see
[hot-reload.md](./hot-reload.md)) and destructs after `execute`
resolves. The "fresh per execution" semantic isolates state across
commands; the destruct keeps `StuffApi`'s indexes from accumulating.

## Concepts

### `CommandContext`

The read-only reference bundle passed to controllers and threaded
through the pipeline. All fields are populated up-front by
`Application.handleCommandMessage`, except `commandId`, which
`executeCommand` overwrites with a fresh nanoid before the controller
runs.

```typescript
interface CommandContext {
  commandGiver: Stuff & CommandGiver;  // typed by mixin, not concrete class
  interactive: Interactive;             // the originating connection
  location: Location;                   // resolved at dispatch time
  commandText: string;                  // raw input, untokenized
  executionId: string;                  // call-stack-tracking id
  commandId: string;                    // attribution id; see below
}
```

`commandGiver` is typed as `Stuff & CommandGiver` rather than `Avatar`
on purpose — controllers narrow with `MixinApi.isX(obj)` predicates
when they need a specific subclass surface. Today every dispatch path
plugs in an `Avatar`, but a future "disembodied executor" or NPC
issuing commands flows through the same shape.

`executionId` and `commandId` are both `nanoid()`s but serve different
roles. `executionId` is stamped at message ingress in
`Application.handleCommandMessage` and identifies the *dispatch* — it
appears in the auto-emit's payload so log consumers can correlate
multi-step diagnostics back to one keystroke. `commandId` is stamped
inside `executeCommand` and is the *attribution* id that rides on
every frame composed during the synchronous execution; see
[call-security.md § Command Attribution](./call-security.md#command-attribution).

### `CommandResult`

Purely semantic. The result is *not* the prose — controllers fire
prose via `MessageApi.scene(...)` and the `summary` only decorates the
auto-emit:

```typescript
interface CommandResult {
  success: boolean;
  summary?: Mml | string;
}
```

`success` answers "did the command achieve its goal?" `summary`, when
present, replaces the default auto-emit tail (`'ok'` for success,
`'failed'` for failure). The auto-emit's body is `${verb}: ${tail}` —
short by design (see "Auto-emit" below).

### `CommandModel`

The resolved data shape passed to controllers. Built piecewise across
parse/match/resolve/validate, then handed off:

```typescript
interface CommandModel {
  verb: string;
  fields: ModelData;                  // fieldName → resolved value
  options: Record<string, boolean>;   // -v, --verbose flags
  subcommand?: string;
  raw: string;
}
```

Controllers don't see `CommandModel` directly today — `executeCommand`
hands `fields` and `options` separately to
`controller.execute(input, context)`. But the type is exported so MQL
consumers and future tools can speak the same vocabulary.

## Stage 1 — Ingress

The client sends `{ type: 'command', payload: { text } }` via
WebSocket (`packages/client/src/App.tsx:141` and
`packages/client/src/services/websocket.ts:100`). Backend's
WebSocket-message handler plants a Root frame with `runRoot(Backend,
'processUserMessage', ...)` so the call stack has a well-defined
bottom and routes to `Application.processUserMessage`. The dispatch
table there forks on `message.type`; `'command'` lands in
`handleCommandMessage`.

`handleCommandMessage` does the boundary work that the rest of the
pipeline assumes:

1. Look up the `Interactive` for this socket; reject with `error`
   payload if there's no active character.
2. Trim the inbound text and refuse empty input silently.
3. Resolve `interactive.holder` to an `Avatar` and read its current
   environment as the `Location`.
4. Build the `CommandContext` and call `avatar.executeCommand(...)`.

The `CommandContext.commandId` field is stamped here as `''`
(placeholder) — the `CommandGiverMixin.executeCommand` body
overwrites it with a fresh nanoid once the proxy frame is in place.
This is deliberate: the attribution id is generated *inside* the
guarded call, after the proxy has pushed a frame, so the id and the
frame land in the same atomic step.

## Stage 2 — Discovery

`CommandGiverMixin.getAvailableCommands()` is the contextual
command-listing surface. It walks four sources, in order, and merges
the union (deduplicated by primary verb):

| Source | Where | Predicate |
|---|---|---|
| **self** | mixins on `this`, plus `this.constructor` itself | always |
| **inventory** | mixins on every object in `ContainmentApi.getContents(self)` | `MixinApi.isContainer(self)` |
| **environment** | mixins on every other object in `getEnvironment()`'s contents | `MixinApi.isContainable(self)` |
| **peers** | mixins on every other `CommandGiver` in the same environment | `MixinApi.isContainable(self)` |

Each contributing class or mixin declares a static `commandProvider`:

```typescript
static commandProvider = {
  self: ['look.yaml'],         // when I AM the giver
  environment: ['look.yaml'],  // when I'm in the giver's environment
  inventory: ['look.yaml'],    // when I'm in the giver's inventory
  peers: ['look.yaml'],        // when I'm a peer of the giver
};
```

`VisibleMixin` declares `look.yaml` in all four buckets — looking at
yourself, looking at items you carry, looking at room contents, and
looking at peers all reach the same controller.

`ContainerMixin` declares `inventory.yaml`, `get.yaml`, `drop.yaml`
under `self` — only an executor that *has* an inventory exposes those
commands.

`Avatar` itself (not a mixin — the concrete class) declares
`ping.yaml`, `help.yaml`, `player.yaml` under `self` — administrative
verbs unique to the player surface.

**Discovery is the dispatch gate.** `executeCommand` calls
`getAvailableCommands()` and uses the *returned set* to look up the
verb. A keycard's `unlock` verb disappears from dispatch the moment
the keycard leaves your inventory; an NPC `CommandGiver` with a
narrower mixin set never sees verbs it shouldn't. Unknown-verb errors
are now per-giver, not global.

The implementation is a linear scan over the available list — fine
for today's command counts but the next pressure point if either the
list or the dispatch frequency grows. See "Deferred improvements"
below for the two splits we'd reach for first (split `CommandApi`'s
loader vs router roles; memoize the per-giver verb map with
invalidation on inventory/environment/peers change).

## Stage 3 — Parsing

`CommandLineApi.parse(text)` is a pure tokenizer + option extractor —
no game logic, no Stuff awareness. Produces `ParsedCommand`:

```typescript
interface ParsedCommand {
  verb: string;
  args: string[];
  options: Map<string, boolean>;
}
```

What it handles:

- Tokenization respects single + double quotes:
  `say "hello world"` → `['say', 'hello world']`.
- Escapes inside quotes: `\"`, `\'`, `\\`, `\n`, `\t`, `\r`.
- Short options collapse: `-abc` → `{ a: true, b: true, c: true }`.
- Long options: `--verbose` → `{ verbose: true }`.
- Stop marker: `--` ends option parsing; everything after is positional.

What it deliberately does *not* do:

- Resolve objects (that's MQL's job, deferred to Stage 5).
- Validate field types.
- Know which verb is real.

The `verb` is whatever the first token happens to be. Empty input
yields an empty verb; `executeCommand` short-circuits with `'No
command entered'`.

## Stage 4 — Matching

`CommandApi.matchVerb(verb)` looks up the verb in
`CommandApi.#verbMap`, a `Map<string, CommandDefinition>` populated
lazily as YAML files load. Unknown verb → `executeCommand` returns
`{ success: false, summary: 'Unknown command: <verb>' }`.

`CommandDefinition` is the parsed YAML view (loaded by
`CommandDefinition.fromFile(filePath)`). It enforces a few invariants
at load time:

- At least one verb.
- `controller` field set.
- *Either* `syntax` *or* `subcommands`, never both, never neither.

A definition is one of two shapes — flat or sub-keyed:

**Flat** — one or more positional patterns, tried in order:

```yaml
verbs: [look, l]
controller: LookController
description: "Examine your surroundings or an object"
syntax:
  - pattern: ""
    description: "Look at current location"
  - pattern: "<target>"
    description: "Look at specific target"
    fields:
      target:
        type: object
        required: true
        validators: [mustBeVisible]
```

**Subcommanded** — first token after the verb selects a sub-syntax:

```yaml
verbs: [player, me]
controller: PlayerController
description: "Manage your player character settings"
subcommands:
  name:
    description: "Set your character name"
    pattern: "<name> [surname]"
    fields:
      name: { type: string, required: true }
      surname: { type: string, required: false }
  pronouns:
    description: "Set your pronouns"
    pattern: "<pronouns>"
    fields:
      pronouns: { type: string, required: true }
  show:
    description: "Show your current player settings"
    pattern: ""
```

`hasSubcommands()` discriminates. The pipeline forks:
`executeSubcommand` (look up subcommand by name, match its pattern)
vs `executeSyntax` (try each pattern in order until one matches).

### Pattern syntax

`matchPattern(pattern, args, fieldDefs)`:

- `<field>` — required positional argument.
- `[field]` — optional positional argument; uses `default` from
  `fieldDefs[field]` if absent.
- `<field...>` — "remaining" — required, consumes all remaining
  tokens joined by spaces. Useful for `say <message...>`.

Returns `null` when the pattern doesn't fit (not enough args, missing
required), which signals "try the next pattern" in flat-syntax mode or
"invalid syntax" in subcommand mode.

If no syntax matches, the result carries `summary: 'Invalid syntax.
Use: <usage>'` built from `command.getUsage()`.

## Stage 5 — Resolving

For every field with `type: object`, the raw string token from
`matchPattern` is replaced with the actual `Stuff` (or array of
`Stuff` for `multiple: true`) that the player meant. The lookup goes
through `MqlApi`:

```typescript
const obj = MqlApi.resolve(query, {
  commandGiver: context.commandGiver,
  location: context.location,
});
```

`MqlApi` walks the giver's inventory and the location's contents to
match the query against names/keywords. A `null` resolution short-
circuits the pipeline with `summary: "You don't see any '<query>'
here"` — friendly enough for the common typo / wrong-room case
without leaking the MQL grammar.

`multiple: true` resolves to an array via `MqlApi.resolveMany`. Empty
result is the same "you don't see any" failure.

Non-`object` types (`string`, `number`, `boolean`, `array`) fall
through to the validators stage as-is. Type coercion isn't done here
— validators handle "must be a number" etc.

## Stage 6 — Validation

For each field with a `validators` array, each named validator is
resolved through `getValidator(name)` (`mud/lib/command/validators.ts`)
and run as `validator(value, fieldName, context)`. Validators return
`undefined` for "valid" or a string error message — the first error
short-circuits the pipeline with that string as the result `summary`.

The built-in validators today:

| Name | Purpose |
|---|---|
| `mustBeVisible` | object must be a Stuff (placeholder; future: visibility) |
| `mustBeContainable` | object must compose `ContainableMixin` (e.g., not a Location) |
| `canReach` | object must be in giver's inventory or in the room's contents |
| `mustBeNumber` | value is a finite number |
| `notEmpty` | string/array isn't empty |

`minLength(n)` / `maxLength(n)` / `inRange(min, max)` are factory
validators (not in the registry — call sites that need them build a
specific validator). The registry (`ValidatorRegistry`) is what YAML
strings resolve against.

## Stage 7 — Controller execution

```typescript
const controllerPath = `../../obj/command/${command.controller}`;
const controllerModule = await import(controllerPath);
const ControllerClass = controllerModule[command.controller];
const controller = new ControllerClass();
const result = controller.execute(fields, context);
```

Dynamic import by string path. The YAML's `controller` field is the
class name; the file at `mud/obj/command/<name>.ts` must export a
class of that name extending `CommandController<I>`.

Controllers are **ephemeral** — a fresh instance per execution, no
state across invocations. State lives on the world (the giver, the
location, props on a Stuff).

```typescript
export class LookController extends CommandController<LookInput> {
  execute(input: LookInput, context: CommandContext): CommandResult {
    if (input.target) return this.lookAtTarget(input.target, context);
    return this.lookAtLocation(context);
  }
  // …
}
```

Controllers do three things:

1. **Narrow `commandGiver`** when they need a subclass surface.
   `GoController` narrows with `MixinApi.isMobile(mover) &&
   MixinApi.isContainable(mover)`; failure is its own `summary:
   "can't move"`.
2. **Fire prose** via `MessageApi.scene(actor).topic(...).to{Self,Peers,
   Witnesses,...}(body).send()`. See [messaging.md](./messaging.md)
   for the Scene composer.
3. **Return a `CommandResult`** describing whether the goal was met
   and (optionally) a short summary that decorates the auto-emit.

The body returns `Promise<CommandResult>` from the abstract; sync
returns are auto-wrapped. Throws inside the controller bubble out and
get caught at the `executeCommand` boundary — the catch branch turns
them into `{ success: false, summary: error.message }`.

## Stage 8 — Auto-emit

After the controller returns (or the pipeline fails earlier),
`executeCommand` emits a single MudlogApi entry summarizing the
outcome. This is what the player actually *reads* in the console for
"command done" feedback:

```typescript
const tail =
  result.summary !== undefined && result.summary !== ''
    ? result.summary
    : result.success ? 'ok' : 'failed';
const level: LogLevel = result.success ? 'info' : 'warn';
MudlogApi[level]('command', Mml.compose`${verb}: ${tail}`, {
  to: giver as Stuff & Sensor,
  payload: { verb, success, commandText, executionId },
});
```

The frame's topic is `system.log.command.info` or
`system.log.command.warn` (see [messaging.md § Topics for log
levels](./messaging.md)). The body is `${verb}: ${tail}` — short by
design. The payload carries the structured details (`verb`,
`success`, `commandText`, `executionId`) for log consumers; the body
is the human-readable face.

The recipient is the command giver, but only if it's a `Sensor`. A
disembodied future executor that isn't a Sensor is a coherent case;
the auto-emit is skipped silently rather than throwing inside the
lifecycle. (The downstream effect is still visible — the controller's
own `Scene.send()` calls already delivered any prose.)

The auto-emit is **the framework's contract for "ok/notok."** A
controller that wants different wording overrides via `summary`. A
controller that wants no extra surface (e.g., a controller whose
prose already conveys success) returns `summary: ''` only as a no-op
override of the empty-string check above — usually it's simpler to
let `'ok'` ride.

## Examples

### `look` (no args)

```
Player types: look
─ tokenize → verb='look', args=[]
─ matchVerb('look') → look.yaml CommandDefinition
─ pattern '' matches empty args → fields = {}
─ resolveValidateExecute → no object fields, no validators
─ LookController.execute({}, ctx)
   → fires Scene at world.perception.look toSelf with location body
   → returns { success: true, summary: 'examined cair-paravel' }
─ auto-emit: system.log.command.info, body 'look: examined cair-paravel'
```

### `get sword`

```
Player types: get sword
─ tokenize → verb='get', args=['sword']
─ matchVerb('get') → get.yaml
─ first pattern '<target>' matches → fields = { target: 'sword' }
─ resolve: target.type='object' → MqlApi.resolve('sword', ctx) → SwordStuff
─ validate: mustBeVisible ✓, canReach ✓, mustBeContainable ✓
─ GetController.execute({ target: SwordStuff }, ctx)
   → ContainmentApi.move(sword, giver)
   → fires Scene at world.action.get
   → returns { success: true, summary: 'sword' }
─ auto-emit: system.log.command.info, body 'get: sword'
```

### `player name Aslan` (subcommand)

```
Player types: player name Aslan
─ tokenize → verb='player', args=['name', 'Aslan']
─ matchVerb('player') → player.yaml (subcommanded)
─ executeSubcommand: args[0]='name' → subcommand 'name'
─ matchPattern('<name> [surname]', ['Aslan'], …) → fields = { name: 'Aslan', subcommand: 'name' }
─ resolve: no object fields
─ validate: required ✓
─ PlayerController.execute({ subcommand: 'name', name: 'Aslan' }, ctx)
   → switches on subcommand → mutates avatar's name
   → returns { success: true, summary: 'name set to Aslan' }
─ auto-emit: system.log.command.info, body 'player: name set to Aslan'
```

### `ping`

```
Player types: ping
─ matchVerb('ping') → ping.yaml
─ PingController.execute({}, ctx) → { success: true, summary: 'pong' }
─ auto-emit: system.log.command.info, body 'ping: pong'
```

PingController fires no Scene — the auto-emit *is* the visible output.
Diagnostic verbs lean on this; gameplay verbs typically have prose in
addition.

## Frame Attribution

Every frame composed during a command's synchronous execution carries
the originating `commandId`. The chain:

1. `Application.handleCommandMessage` sets
   `context.commandId = ''` (placeholder).
2. The proxy intercepts `avatar.executeCommand(...)` and pushes a
   `CallFrame` with `target: avatar`, `method: 'executeCommand'`.
3. `CommandGiverMixin.executeCommand` *body* runs:
   - `tagCurrentFrame(FrameKind.Command)` re-tags the proxy-pushed
     frame so stack walkers can find it without method-name matching.
   - `commandId = nanoid()`; stores on both `context.commandId` and
     the frame's metadata.
   - `updateCurrentFrameMetadata({ commandContext, causingCommandId })`
     stores the live context object too.
4. Anything composed downstream — `Scene.send()`,
   `MudlogApi.{info,warn,...}`, scheduled callbacks via
   `ScheduleApi` — reads
   `ExecutionContextApi.getCurrentCommandContext()` to find the
   command frame, pulls `commandId` and `causingCommandId` off its
   metadata, and stamps the outgoing frame.

For delayed/asynchronous aftermath (banana peel dropped now → NPC
slips next tick), `ScheduleApi` re-plants `causingCommandId` onto the
fresh Root frame, so `getCurrentCausingCommandId()` keeps surfacing
the originating command's id even when the synchronous chain is gone.
See [call-security.md § Command
Attribution](./call-security.md#command-attribution).

`getCurrentCommandGiver()` and `getCurrentCommandContext()` are the
two reader helpers most code reaches for. Both walk the stack
top-down looking for the closest `FrameKind.Command` frame.

## Adding a new command

1. **Define the YAML** in `mud/cmd/<verb>.yaml`. Pick `syntax` *or*
   `subcommands` (never both). Lowercase filename.
2. **Implement the controller** in `mud/obj/command/<Name>Controller.ts`
   extending `CommandController<I>`. The class name must match what
   the YAML's `controller` field declares. Define an input interface
   for the resolved fields.
3. **Wire discovery.** Decide which mixin or class should expose the
   verb in its `commandProvider`. A spatial command goes on a spatial
   mixin; a description command on `VisibleMixin`; a player-only
   admin verb on `Avatar`'s static `commandProvider`. Pick the
   bucket(s): `self` / `environment` / `inventory` / `peers`.
4. **Validators (optional)** — if existing validators don't cover the
   field, add one to `mud/lib/command/validators.ts` and register it
   in `ValidatorRegistry`. Validators are pure functions; they
   shouldn't mutate world state.
5. **Tests** — colocate under `__tests__/`. Vitest. Test the
   controller directly with a synthetic `CommandContext` for unit
   coverage; integration tests can drive the full pipeline through
   `avatar.executeCommand(text, ctx)`.

## Design Rationale

### Why YAML for views?

The view is declarative — verbs, syntax, field types, validators.
None of that needs runtime control flow. YAML keeps it data, which
gives:

- A non-programmer can add a verb or aliasing without TypeScript.
- The same view file can render help text (`getHelpText()`) and
  drive parsing — no duplication.
- Future migration to MongoDB-stored views (the `domain` collection,
  same as Avatar templates) is mechanical: read a string field,
  parse, cache.

The controller is imperative, so the controller stays in TypeScript.
View / Controller separation is the same justification as MVC anywhere.

### Why CommandResult is purely semantic

Earlier sketches had `CommandResult` carry the prose to render on the
client. That coupled controllers to the messaging layer's wire shape
and made multi-audience commands awkward (a `say` produces different
prose for the speaker, the room, and a remote listener). The shipped
position is:

- Prose is a Scene, fired inside the controller via `MessageApi`.
  Scenes know how to address self / peers / witnesses; one
  `Scene.send()` produces the right per-audience frames.
- `CommandResult` answers the *semantic* question: was the goal met?
  The auto-emit then stamps a single short summary frame for the
  giver only — the "ok/failed" tail.

Two separate signals, neither overloaded.

### Why discovery via `commandProvider` static, not interface

`ICommandProvider` *is* an interface — but the framework doesn't
enforce it via `instanceof`. It looks up the static `commandProvider`
field off any class or mixin via duck typing. This keeps the
declaration close to the code that contributes the command (the mixin
that *adds* the verb's behavior also declares the verb), without
forcing every mixin into a class hierarchy or a registry.

Anything with `static commandProvider = { … }` plays. Anything
without it is silently skipped.

### Why dynamic import for controllers

Controllers are referenced by *name* (a string in the YAML), not by
import. That keeps the YAML file the single source of truth for
"this verb resolves to this controller." A static `import` map
wouldn't add value — it'd duplicate the YAML's `controller` field.
Dynamic import lets the controller live anywhere under
`mud/obj/command/` and be discovered by filename.

The cost is a one-time disk read per command (cached by Node's
module loader). Hot-reloading test seams may need `vi.resetModules()`
for the dynamic-import side specifically.

### Why discovery is the dispatch gate

The discovery walk (`self` + `inventory` + `environment` + `peers`
mixins, deduplicated) is *exactly* the answer to "which verbs are
legitimate for this giver right now?" Using it for both listing and
dispatch keeps a single source of truth: the player's `help` output
and the set of dispatchable verbs cannot drift.

This does not replace controller-level gating — `GoController` still
narrows with `MixinApi.isMobile(mover)`, `GetController` still
validates reachability via `canReach`. Discovery answers the *verb*
question; controllers answer the *operands and context* question
(e.g., `go north` is dispatchable but the north exit might be locked).
The two layers stack: discovery filters out verbs the giver has no
business issuing at all; controllers handle the situation-specific
"can't right now" cases.

## Deferred improvements

Two follow-ups that are designed but not built. Both pay off when
either command throughput or per-giver-set complexity grows.

### Split `CommandApi`'s loader and router roles

`CommandApi` today combines two responsibilities:

1. **Loader/cache** — `getCommand(filename)` reads YAML, parses, caches
   `CommandDefinition` keyed by filename.
2. **Global verb router** — `matchVerb(verb)` looks up a verb in
   `#verbMap`, populated as a side-effect of `getCommand`.

Role 2 is now a vestigial surface — dispatch goes through the
per-giver list, and the only remaining caller is the test file
exercising the cache. Removing `matchVerb` (and `#verbMap`) would
shrink the API surface, eliminate the temptation to misuse it from
new callers, and cleanly separate "did we load this YAML" from "is
this verb dispatchable for this giver." Hold off until there's
another reason to touch `CommandApi`; it's a no-op cleanup today.

### Memoize the per-giver verb map; invalidate on context change

Dispatch currently rebuilds the list of available commands on every
`executeCommand` call — walking mixins, inventory, environment, and
peers every time. The cost is small at today's scale (roughly:
mixin count × (1 + inventory size + environment size + peer count))
but it's hot-path work that grows with room density.

The fix is per-giver memoization: build the verb map once, cache it,
invalidate whenever the inputs change. The invalidation signals are:

- **Self mixins** — fixed at construction; never invalidates.
- **Inventory** — `addContainable` / `removeContainable`.
- **Environment** — `setEnvironment` (giver moved) or anything in the
  current environment changing membership.
- **Peers** — same as environment.

This is the same signal set the client wants for **push-style
available-command updates** (autocomplete, hint UI). One recompute,
two consumers: the server's dispatch cache, and an outbound frame to
the client when the set changes. Don't build the invalidation hooks
twice — when push/pull is on the roadmap, do this in the same pass.

Until then, the linear scan in `runPipeline` is fine.

## Cross-References

- [call-security.md § Command
  Attribution](./call-security.md#command-attribution) —
  `FrameKind.Command`, `commandId`, `causingCommandId`,
  `getCurrentCommandGiver`, `getCurrentCommandContext`,
  `tagCurrentFrame`, `updateCurrentFrameMetadata`.
- [messaging.md](./messaging.md) — the Scene composer, MML body
  format, sensor routing, `MudlogApi` topics, the Application →
  Backend → WebSocket delivery path.
- [architecture.md](../architecture.md) — Manager vs Api layering,
  mixin organization, file structure for `cmd/` and `obj/command/`.
- [antipatterns.md](../antipatterns.md) — `ContainmentApi.move` /
  `creature.travel` patterns that command controllers prefer over
  raw containment + setEnvironment juggling.
