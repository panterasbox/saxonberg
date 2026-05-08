# Command Spec — Author Guide

How to add a verb. This is the prescriptive companion to
[command-routing.md](./command-routing.md) (the pipeline) and
[command-parsing.md](./command-parsing.md) (the tokenizer). Read those
when you need to know *what happens*; read this when you need to know
*how to write a new one*.

A command lives in five places:

| Artifact | Where | Sets |
|---|---|---|
| **YAML view** | `mud/cmd/<verb>.yaml` | verbs, args, options, scope, validators |
| **Controller** | `mud/obj/command/<Name>Controller.ts` | execution body |
| **Controller seed** | `mud/seeds/obj/command/<Name>.yaml` | template doc for `StuffApi.clone` |
| **Discovery** | `static commandContributions` on a class or mixin | which givers see this verb on their recency stack |
| **Validators (optional)** | `mud/lib/command/validators/<name>.ts` | per-field validators referenced by path |

The schema for the YAML lives at `mud/cmd/command.schema.json` and is
enforced at boot.

## YAML view — top-level shape

Every YAML declares one `CommandView`. Required keys: `verbs`,
`controller`, `description`. After that, pick exactly one of `args`
(flat verb) or `subcommands` (subcommanded verb) — having both is a
load-time error. `options` is optional at every level.

```yaml
verbs: [look, l]              # primary verb first; rest are aliases
controller: LookController    # class name in mud/obj/command/
description: "Examine your surroundings or an object"
args:                         # OR `subcommands:` — never both
  - name: target
    type: object
    required: false
    scope: ["$focus", "reachable"]
    updates_focus: extend
    prepositions: [at]
    default: "$focus"
    validators:
      - /lib/command/validators/mustBeVisible
options:                      # optional; verb-scoped
  long:
    short: l
    type: boolean
    description: "Verbose output"
```

A zero-arg verb (e.g. `inventory`, `ping`) has neither `args` nor
`subcommands` — that's fine.

## Positional fields (`args:`)

`args:` is an **ordered array** — index 0 is positional slot 0, index
1 is slot 1, and so on. The `name` becomes the model field key.

Three load-time invariants enforced by `CommandDefinition.validate`:

1. **Field-name uniqueness** across positionals and options at every
   reachable scope (mutually-exclusive subcommands are exempt).
2. **Greedy must be last.** A `greedy: true` arg is the final entry in
   its `args:` array.
3. **No required-after-optional.** A `required: true` arg cannot
   follow a `required: false` arg in the same array.

### `type:` — what the field holds

| Type | Bound value | Notes |
|---|---|---|
| `string` | the raw token text | no coercion |
| `number` | `Number(token)` | non-finite input fails the bind |
| `boolean` | `true` / `false` | usually used on options, not positionals |
| `object` | an `MqlOneResult` wrapper around a single Stuff | runs `MqlApi.resolveOne` |
| `objects` | an `MqlManyResult` wrapper around a Stuff list | runs `MqlApi.resolveMany` |

For `object` / `objects` the controller reads `model.field.stuff`
(plus optional `via`, `raw`, `prep` — see
[mql.md](./mql.md#mqlresult-wrappers)). `stuff` is `null` (singular)
or `[]` (plural) when MQL produced no match — that's a normal
outcome, not a shape error. The controller decides what no-match
means in its domain (see the example controllers).

`multiple: true` is for non-MQL fields where repeated occurrences
should accumulate. Don't combine it with `type: objects` — the
plurality is the type.

### `required:` — when the matcher demands input

Defaults to `false`. `required: true` makes "no input AND no
`default:`" a shape error. With a `default:`, the matcher uses the
default and never raises the error.

`greedy: true` implies `required: true` unless explicitly overridden.

### `greedy:` — slurp the remainder

`greedy: true` consumes everything from the field's first token to
end-of-input verbatim — whitespace runs, escapes, single-quote
literals all preserved. Common for chat verbs (`say`, `tell`) and
scope-shaped verbs (`focus`).

When a *later* field declares `prepositions:`, the greedy field
**stops at the boundary**: `give the red flower to bob` slices `gift`
at `to` because `recipient.prepositions: [to]`. See
[Multi-positional verbs](#multi-positional-verbs) below.

### `default:` — fill-in when the player typed nothing

A string the matcher uses when the player provides no input for the
field. The default flows through the same shell variable interpolation
(`ShellApi.expandVariables`) as player-typed text — so
`default: "$focus"` resolves to the giver's current focus at bind
time.

`required: true` + `default:` is allowed: the default replaces the
missing input. The "missing required arg" error only fires when the
field is required AND has no default AND the player typed nothing.

### `scope:` — where MQL searches

Only meaningful for `type: object` / `type: objects`.

Accepts `string | string[]`. The runtime always sees an array (a bare
string is normalised to a singleton). Each entry runs through
`ShellApi.expandVariables`, then the dispatcher tries them in order
— **first non-empty result wins**.

Patterns:

```yaml
scope: "inventory"           # surgical — drop, don't drill
scope: "peers"               # surgical — get, don't pick up the room
scope: "reachable"           # broad — everything in arm's reach
scope: ["$focus", "reachable"]   # drill-first-then-broad — look, examine
```

When `scope:` is omitted, the dispatcher defaults to `['$focus']` —
the drill chain IS the scope. The resolver's empty-scope fallback to
`reachable` stays as a safety net for when the focus chain stops
resolving (typically after the player walks into a different room).

Verbs that should **ignore drill entirely** declare a non-`$focus`
fragment (`scope: 'inventory'` for `drop`, `scope: 'peers'` for
`get`). Inspection-shaped verbs (`look`, `examine`, `read`) declare
the drill-first-then-broad form.

There's no implicit "player focus tries first" rule. The YAML is
authoritative — the help system can read `scope:` to tell players
which commands respect drill and which don't.

### `updates_focus:` — focus management policy

Three modes:

| Mode | Effect |
|---|---|
| `extend` | Append the input to the giver's focus with `:` (with same-anchor compaction). Drill-additive default for inspection verbs. |
| `replace` | Set focus to the input wholesale. For navigation/anchoring verbs that should reset the trail. |
| `none` (default) | Focus unchanged. Most commands (`get`, `drop`, `say`) leave focus alone. |

Pronoun substitution applies in all extending paths: when the input
is a dynamic pronoun (`it`/`him`/`her`/`them`/`$$`), the stored
fragment from pronoun memory replaces the literal pronoun string
before focus updates, so the trail tracks the actual referent rather
than the unstable pronoun.

Empty resolutions never touch focus regardless of mode.

Only meaningful when the giver is `Focused` (Avatars composing
`ShelledCharacter`). NPCs without `FocusedMixin` ignore the field.

### `prepositions:` — leading boundary markers

A list of lowercased English prepositions the matcher consumes as a
**leading** marker for the field. Typing `look at flower` consumes
`at` and binds `target = "flower"`; typing `look flower` binds
`target = "flower"` directly. The consumed preposition lands in
`ctx.prep[fieldName]` for the controller to read.

For multi-positional verbs, *later* fields' declared prepositions
also serve as **termination boundaries** for an earlier greedy field.
That's how `give the red flower to bob` knows to stop the greedy
`gift` at `to`.

Prepositions are always optional — declaring `prepositions: [to]`
means "consume `to` if it appears here," not "require `to`."

### `validators:` — per-field gates

A list of validator path specs. Path conventions:

- `/X` → `<src>/mud/X.ts` (mud-rooted absolute).
- `./X` / `../X` → relative to the YAML file's directory.

Bare names and package specifiers are rejected. The path tells you
exactly where the validator lives — there's no registry, no implicit
search paths.

Built-ins live under `mud/lib/command/validators/`:

| Validator | Checks |
|---|---|
| `mustBeVisible` | bound value is a Stuff (visibility-system gate is a future hook) |
| `mustBeContainable` | bound Stuff composes `ContainableMixin` |
| `canReach` | bound Stuff is in giver's inventory or location contents |
| `mustBeNumber` | bound value is a finite number |
| `notEmpty` | bound value is non-null, non-empty (string / array) |

A validator is a default-exported `FieldValidator` function:

```ts
import type { FieldValidator } from '../../../api/command';

const validator: FieldValidator = (value, field, context) => {
  if (/* not ok */) return `${field}: explanation here`;
  return undefined; // pass
};

export default validator;
```

Returning a string fails the command with that summary. Returning
`undefined` passes.

## Subcommands (`subcommands:`)

A subcommanded verb dispatches on a second word. Top-level `args:` is
forbidden when `subcommands:` is set; each subcommand can declare its
own `args:` and `options:`:

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

The matcher stamps `model.subcommand` with the chosen subcommand name
(constant: `SUBCOMMAND_FIELD = 'subcommand'` in
`api/command.ts`). YAMLs with `subcommands:` cannot declare a field
or option named `subcommand` — caught at load time.

Subcommanded verbs invoked without a subcommand reach the controller
with `model.subcommand === undefined`. The controller decides what
that means (`settings list`-style default, error, etc.).

## Options (`options:`)

Options are an unordered map keyed by option name. They have
**lexical scope**: tokens before the subcommand bind against the
verb's top-level `options:`; tokens after bind against the active
subcommand's `options:`. Both layers contribute to the same flat
`model` map keyed by each option's `field` (defaults to the option
name).

```yaml
options:
  long:
    short: l                   # single-char short alias
    type: boolean
    description: "Verbose output"
  format:
    type: string
    default: "plain"
    multiple: false            # default; true accumulates into an array
    field: outputFormat        # optional field-name remap
    validators:
      - /lib/command/validators/notEmpty
```

Option types: `boolean`, `string`, `number`, `object`. (No `objects`
on options — multi-cardinality is `multiple: true` instead.)

A second occurrence of a non-`multiple` option is a `bind` error
(`option --xyz specified more than once`). A boolean option given a
`=value` is also a bind error.

## Controllers

A controller is a templated `Idea` (Stuff). One file per controller
under `mud/obj/command/<Name>Controller.ts`. The `controller` field
in the YAML names the class.

### Skeleton

```ts
import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { MqlOneResult } from '../../api/mql';

interface OpenModel extends CommandModel {
  target?: MqlOneResult;
}

export class OpenController extends CommandController<OpenModel> {
  execute(model: OpenModel, context: CommandContext): CommandResult {
    const target = model.target;
    if (!target || target.stuff === null) {
      return { success: false, summary: `you don't see any '${target?.raw ?? ''}' here` };
    }
    // ...
    return { success: true, summary: 'opened it' };
  }
}
```

### Conventions

- **Class name matches the YAML's `controller` field.** The
  dispatcher resolves it through `StuffApi.clone('/obj/command/<Name>')`.
- **One TModel interface per controller.** Extend `CommandModel` and
  add only the fields the YAML produces. Match the YAML's field
  names exactly — the matcher binds by name.
- **Narrow `commandGiver` with `MixinApi.isX(...)` predicates** when
  you need a subclass surface. `GoController` narrows with
  `MixinApi.isMobile(mover) && MixinApi.isContainable(mover)`. Don't
  cast to `Avatar` unless the verb is genuinely Avatar-only.
- **Reach `model.<field>.stuff`** for `type: object` and
  `type: objects` fields — the dispatcher pre-resolves through MQL.
  `stuff` is `null` (singular) or `[]` (plural) on no match; the
  wrapper carries `raw` (player-typed text post-desugar), optional
  `via` (sub-feature attribution), and optional `prep` (consumed
  preposition).
- **Fire prose via `MessageApi.scene(actor)`.** Don't put prose in the
  `CommandResult.summary` — `summary` is the short auto-emit tail
  ("opened it", "to dungeon"). See
  [messaging.md](./messaging.md) for the Scene composer.
- **Throw on programmatic invariants**, return errors for player
  problems. A `ContainmentApi.move` failing because the bound Stuff
  isn't Containable is a programming bug; "you don't see it here" is
  player input. The `_executeOne` boundary catches throws and
  converts them to `{ success: false, summary: error.message }`.
- **`pass: true` for chain-of-responsibility opt-out** (rare). A
  passing controller MUST NOT have observable side effects: no
  `Scene.send()`, no world-state mutation. The dispatcher tries the
  next match.

### Subcommanded controllers

For subcommanded verbs (`player`, `settings`, `var`), branch on
`model.subcommand`:

```ts
execute(model: PlayerModel, context: CommandContext): CommandResult {
  switch (model.subcommand) {
    case 'name':     return this.executeName(model, context);
    case 'pronouns': return this.executePronouns(model, context);
    case 'show':     return this.executeShow(model, context);
    default:
      return { success: false, summary: 'try `player show` to see usage' };
  }
}
```

Per-subcommand methods narrow the model again (`name` requires a
non-empty `model.name` string, etc.).

### `CommandResult`

```ts
interface CommandResult {
  success: boolean;
  pass?: boolean;
  summary?: Mml | string;
}
```

- `success` answers "did the command achieve its goal?"
- `summary` decorates the auto-emit; defaults to `'ok'` (success) or
  `'failed'` (failure). Returning `summary: ''` shows nothing extra.
- `pass: true` opts out — see above.

The auto-emit is the "ok / not-ok" framework contract. Don't write
prose into `summary`; that's what `MessageApi.scene` is for.

## Discovery — wiring the verb to the recency stack

The verb has to land on a giver's recency stack to be dispatchable.
Pick the class or mixin whose presence implies the verb is
appropriate, and add a `static commandContributions` field:

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

| Bucket | When the verb lands on a giver's stack |
|---|---|
| `self` | Always — at host registration. Owner-issued verbs (`look`, `inventory`, `say`). |
| `inventory` | When this thing is in the giver's inventory. A wand grants `zap`. |
| `environment` | When this thing is in the giver's environment. A throne grants `sit`. |
| `peers` | When this thing is a peer `CommandGiver` in the same environment. A conversational NPC grants `tell`. |

Choose the smallest concept that owns the verb. A spatial verb goes
on a spatial mixin (`MobileMixin` declares `go.yaml`, `open.yaml`,
`close.yaml`); a description verb on `VisibleMixin`; an Avatar-only
admin verb on `Avatar`'s static `commandContributions`. Don't pile
verbs onto `Avatar` "because every avatar has them" — declare on the
feature mixin and ensure every avatar composes it.

`focus.yaml` is the canonical "this verb is meaningful only when the
giver has X" example: it lives on `FocusedMixin`, so an NPC scripted
without `FocusedMixin` simply doesn't see `focus` on its recency
stack.

## Controller seed file

For every controller class, drop a one-liner seed at
`mud/seeds/obj/command/<Name>.yaml` with the correct class path.
`SeederManager` writes the Template doc into `domain` at boot;
`StuffApi.clone` picks it up on dispatch.

Without the seed, `_executeOne`'s clone fails at runtime — surfaces
as a command-level failure but a confusing one, since the YAML view
loaded fine. The seed is the boring-but-essential third leg.

## Variable interpolation in YAML strings

`scope:` and `default:` strings flow through `ShellApi.expandVariables`
at bind time, so `$focus` and stored vars (`$<name>` from
`var set NAME VALUE`) expand to the giver's live state. `$$` is left
intact for MQL.

Only one synthetic var ships in v1: `$focus` on `FocusedMixin`. New
synthetic vars get added by declaring `static syntheticVars` on the
mixin that owns the underlying state — see
[shell-environment.md § Variable interpolation](./shell-environment.md#variable-interpolation).

Pronoun words (`me`, `here`, `it`, `him`, `her`, `them`) are MQL
keywords, NOT shell vars. Typing `look here` works because MQL's
pronoun seed handles it, not because of variable expansion. There is
no `$me` / `$here` / `$it` alias.

## Multi-positional verbs

Multi-positional verbs use `prepositions:` as boundary markers so the
matcher can split positionals naturally — and so each field can fall
to its `default:` independently when the player skips it. Canonical
example (`give`, hypothetical):

```yaml
verbs: [give]
controller: GiveController
args:
  - name: gift
    type: object
    scope: "inventory"
    default: "$focus"
  - name: recipient
    type: object
    scope: "peers"
    prepositions: [to]
    default: "me"
```

Resolution table:

| Player types | Resolution |
|---|---|
| `give flower bob` | gift=flower, recipient=bob (positional fill in order) |
| `give flower to bob` | gift=flower, "to" consumed by recipient, recipient=bob |
| `give flower` | gift=flower; recipient defaults to `me` |
| `give to bob` | gift sees `to` belongs to recipient → defaults to `$focus`; recipient consumes "to", binds bob |
| `give` | both fields default → `$focus` and `me` |

The matcher's lookahead is what makes "skip an earlier defaulted
field by typing a later field's preposition" work. Without
prepositions on later fields, players can't skip middle defaults —
`give flower` always reads as `gift=flower`, never as
`recipient=flower`. That matches English ordering anyway.

## Player vs dev command styles

The framework's command spec is dual-shaped: positionals + options +
prepositions. That covers both audiences without a mode toggle:

- **Player-facing commands** lean on **prepositions** for ergonomic
  field-skipping (`give flower to bob`).
- **Dev/system commands** lean on **options** (`mkroom hall -z dungeon`)
  for the same purpose in unix-style.

A field can be expressed as both a positional (with optional
preposition) AND an option (via `OptionDefinition.field` binding to
the same target). Both forms can coexist on the same YAML; the help
system can render layered help when both exist.

## Cache invalidation (dev)

`CommandApi.getCommand(filename)` caches the parsed YAML for the
process lifetime. When you edit a YAML in-flight:

```ts
CommandApi.invalidate('look.yaml');     // drop one entry
// next CommandApi.getCommand('look.yaml') re-reads from disk
```

Live recency-stack entries that already hold a reference to the old
`CommandDefinition` keep using it until they pop. The next
`applyContainmentDelta` / `applyShadowDelta` push picks up the
reloaded definition. For most dev workflows, "edit YAML →
`CommandApi.invalidate(...)` → move yourself in/out of the affected
container" is the round-trip.

Wiring full HMR for command YAMLs (file-watcher → invalidate →
broadcast `system.commands.reset`) is a future task.

## Testing

Tests live in `__tests__/` next to the controller (Vitest). Two
levels:

- **Unit:** drive the controller directly with a synthetic
  `CommandContext` and a hand-built model. Skips the matcher and
  MQL — fastest, narrowest.
- **Integration:** call `giver.executeCommand(text)` on a fixture
  giver. Exercises the whole pipeline (parse → match → assemble →
  resolve → validators → execute → auto-emit).

`FocusController.test.ts`, `GoController.test.ts`,
`OpenController.test.ts`, `SettingsController.test.ts`, and
`VarController.test.ts` are good integration-test references.

## Cross-references

- [command-routing.md](./command-routing.md) — the dispatch pipeline.
- [command-parsing.md](./command-parsing.md) — `msh` tokenizer and
  parser pluggability.
- [mql.md](./mql.md) — MQL internals (resolver, scope-walk,
  predicates, pronoun memory).
- [../mql-grammar.md](../mql-grammar.md) — MQL grammar reference for
  players / authors writing queries.
- [shell-environment.md](./shell-environment.md) — `$focus` /
  variable interpolation, settings/var commands.
- [messaging.md](./messaging.md) — Scene composer, MML, sensor
  routing.
- [hot-reload.md](./hot-reload.md) — `StuffApi.clone` +
  `HotReloadApi`; controllers ride this for HMR.
