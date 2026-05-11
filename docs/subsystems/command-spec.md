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

### Aside: spec, parser, and the model

Today's parser is **`msh`** — the framework's tokenizer-driven shell
(see [command-parsing.md](./command-parsing.md)). The spec described
here is what `msh` binds against, but the spec isn't actually
parser-specific: it's the **model definition**. A YAML view declares
verbs, fields, types, scope, validators, focus policy — all of that
is "what the controller expects to be handed," not "how the player
expressed it."

Parsers are pluggable (`Parser` interface in `api/command.ts`). A
hypothetical NL / LLM parser could read the same YAMLs to know what
verbs and fields exist, then return a `{ bound: { command, model } }`
result that skips match/assemble entirely — the dispatcher runs only
resolve + execute. The same controllers fire either way; the spec
they consume stays one source of truth across input modalities. None
of that is built today, but with LLMs it's well within reach, and
the spec is shaped to make it cheap when someone wants it.

## YAML view — top-level shape

Every YAML declares one `CommandView`. Required keys: `verbs`,
`controller`, `description`. After that, pick exactly one of `args`
(flat verb) or `subcommands` (subcommanded verb) — having both is a
load-time error. `options` is optional at every level.

```yaml
verbs: [look, l]              # primary verb first; rest are aliases
controller: LookController    # template name; resolves to /obj/command/<Name>
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
| `struct` | a plain object (`Record<string, unknown>`) | structured-input only — text input is rejected |

For `object` / `objects` the controller reads `model.field.stuff`
(plus optional `via`, `raw`, `prep` — see
[mql.md](./mql.md#mqlresult-wrappers)). `stuff` is `null` (singular)
or `[]` (plural) when MQL produced no match — that's a normal
outcome, not a shape error. The controller decides what no-match
means in its domain (see the example controllers).

`multiple: true` is for non-MQL fields where repeated occurrences
should accumulate. Don't combine it with `type: objects` — the
plurality is the type.

### `type: struct` — structured-input-only fields

For verbs whose input includes a client-composed payload (a code-
editor buffer, a form-field bag, anything richer than tokens can
faithfully represent), declare the field `type: struct`. The bound
value is whatever plain object the structured-form ingress
delivered, opaque to the matcher.

```yaml
verbs: [compose]
controller: ComposeController
description: Compose an authoring payload
args:
  - name: doc
    type: struct
    required: true
    schema:
      type: object
      required: [title]
      properties:
        title: { type: string, minLength: 1 }
        body:  { type: string }
      additionalProperties: false
```

Three rules:

- **Text input cannot bind a struct field.** A struct positional
  encountering a token (or required-and-absent) yields a shape error
  pointing the player at structured input: *"field 'doc' requires
  structured input; cannot bind from text"*. Same for struct
  options on `--name=value` text input.
- **Structured input is the channel.**
  `CommandApi.assembleFromStructured({ verb, fields: { doc: {...} } })`
  drops the value straight onto `model.doc`. This is the path
  widget / editor clients use; nothing extra to wire.
- **Schema validation is opt-in.** An optional `schema:` block
  carries a JSON Schema fragment ajv runs against the structured
  value at the coercion step. Failures yield a friendly error
  pointing at the offending property (`doc.title: must be string`).
  Custom `validators:` paths still fire as usual after the schema
  pass.

Stuff references on a struct payload still ride as MQL strings
(`'#abc123'`, `'/obj/Avatar/foo'`) — raw `Stuff` object references
through any channel would bypass MQL's permission/visibility
filters and the inter-stuff "address via MQL" contract. If a
struct field's schema declares a property as `type: string`, that
string is just a value; it does NOT auto-resolve through MQL. For
fields whose values are Stuff references, declare them as
`type: object` / `type: objects` (separate fields, not nested
inside a struct).

A separate `context.payload` sidecar channel for non-field metadata
(editor cursor, draft id, binary uploads) was considered and
deferred — the structured-fields path covers every v1 use case and
the retrofit when one shows up is mechanical (add the field on
`CommandContext`, opt controllers in).

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

**The default is parsed as if the player had typed it.** After
`$variable` expansion, the substituted string runs through the field's
normal validators / MQL resolution / type coercion pipeline. The
controller never knows whether the populated field came from a typed
arg or from `default:` — uniform call surface.

If `default:` resolution fails (MQL no-match, validator veto, etc.),
the field's standard failure surface fires; the framework does NOT
silently treat a failed default as "no input." Authors who need
"fall back to slot-less behavior on no-input" write that branch in
the controller, not via `default:`.

Embodiment verbs use this pathway: `sit` declares `default: "ground"`
so `sit` (no arg) becomes `sit ground` after substitution, which
MQL resolves to the Location's floor Adornment via the Detail-keyword
pathway (see [slot.md](./slot.md) on detail-targeted slot resolution).
In a void Location with no floor, MQL no-match surfaces "you can't
sit on the ground here" — the standard failure mode, no controller
branch needed.

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

#### Why validators are mandatory on object-acting verbs

**`scope:` is a search hint, not a security gate.** The MQL grammar
lets a player address any Stuff in the world from any starting
seed: `drop online:bob:i:sword` resolves to bob's sword regardless
of `scope: "inventory"`, because the scope is only the default
search anchor for keyword resolution, not a constraint on the final
result. Permission tiers (admin / authoring / public) gate
*operators*, not result sets — even after tiering, an admin player's
query can land on a Stuff that the verb has no business acting on.

That makes validators load-bearing for any verb that mutates world
state through a `type: object` / `type: objects` field. The pattern
is:

```
scope:    where MQL looks first (hint, with fallback chain)
validator: what the controller is allowed to act on (gate)
```

A `drop` controller without `mustBeInInventory` will silently fail
to drop foreign Stuffs (catching the bug at `ContainmentApi.move`
time), but the player gets a confusing "nothing dropped" instead of
the right "you don't have that." A `get` controller without
`mustBeInLocation` is structurally similar. The validator is what
turns "MQL pretended to find this" into "and you can actually act
on it."

#### Built-in validators

Live under `mud/lib/command/validators/`:

| Validator | Checks | Use on |
|---|---|---|
| `mustBeVisible` | binding is a Stuff (visibility-system gate is a future hook) | inspection verbs (`look`) |
| `mustBeContainable` | every bound Stuff composes `ContainableMixin` | `get`, `drop`, `give` (any verb that calls `ContainmentApi.move`) |
| `mustBeInInventory` | every bound Stuff is in the giver's inventory | `drop`, `give` (the gift) |
| `mustBeInLocation` | every bound Stuff is in the giver's location's contents | `get` (excludes inventory items by design — you can't pick up what you already carry) |
| `canReach` | every bound Stuff is in inventory, location contents, attached to a location exit (door), OR the location with `via.exit` set (door-via-direction) | `open`, `close`, `go`, any verb that interacts with the immediate environment |
| `mustBeNumber` | binding is a finite number | numeric primitive fields |
| `notEmpty` | binding is non-null, non-empty (string / array) | string / multi fields where blank is a category error |

For object-acting verbs, the convention is to layer:

- **Type/shape**: `mustBeContainable` (or another mixin-shape check).
- **Reach**: `mustBeInInventory` / `mustBeInLocation` / `canReach`,
  whichever matches the verb's domain.

So `drop.yaml` declares both `mustBeContainable` (you can't drop a
non-Containable) AND `mustBeInInventory` (and you can't drop what
you don't have).

#### Writing a new validator

A validator is a default-exported `FieldValidator` function. For
object-acting fields, use `MqlApi.extractStuffs(value)` to unwrap
the binding into a flat `Stuff[]` — that handles the
`MqlOneResult` / `MqlManyResult` wrappers and the legacy bare-Stuff
form uniformly:

```ts
import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import { MqlApi } from '../../../api/mql';

const validator: FieldValidator = (value, field, context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  if (stuffs.length === 0) return undefined;  // empty MQL → controller decides
  for (const stuff of stuffs) {
    if (/* per-Stuff check fails */) {
      return `you can't <verb> <thing>`;
    }
  }
  return undefined;
};

export default validator;
```

Three rules:

1. **Empty results pass through.** When `stuffs.length === 0` (no
   MQL match), let the controller produce its own user-facing
   "you don't see X here" message. Validators that fail on empty
   pre-empt that.
2. **Per-Stuff iteration for plural fields.** A `type: objects`
   binding can contain multiple Stuffs; the validator should fail
   on the first that doesn't pass and surface a message naming
   that Stuff.
3. **Wrapper read-through.** Validators that need `via` (e.g.,
   `canReach` on the door-via-direction case) can read it off the
   `value` object directly — `value.via?.exit`, `value.via?.detailPath`.
   `extractStuffs` doesn't unwrap via.

Returning a string fails the command with that summary. Returning
`undefined` passes. The first validator to fail wins; remaining
validators don't run.

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

### Per-subcommand controllers

When subcommand domains diverge significantly, each subcommand can
declare its own `controller:` field. The framework clones THAT
controller template instead of the verb-level controller for that
subcommand; absent fields fall back to the verb-level controller as
before.

```yaml
verbs: [analyze]
description: "Analyze a physical channel in detail"
subcommands:
  light:
    description: "Analyze light at a location with source breakdown"
    controller: AnalyzeLightController     # per-subcommand
    args:
      - name: location
        type: object
        required: false
        default: "here"
        scope: ["reachable"]
        validators:
          - /lib/command/validators/mustBeContainer
  chemistry:
    description: "Analyze the chemistry of a target"
    controller: AnalyzeChemistryController # per-subcommand
    args:
      - name: target
        type: object
        required: true
        scope: ["reachable"]
        validators:
          - /lib/command/validators/mustBeTangible
```

A verb whose subcommands all carry per-subcommand controllers may
omit the verb-level `controller:` entirely (`analyze` is the
canonical example — there's no meaningful bare-`analyze` behavior).
The dispatcher's resolution rule:

```
controllerName =
  (model.subcommand && command.controllerForSubcommand(model.subcommand))
  || command.controller
```

Load-time validation requires either a verb-level controller OR
every subcommand declaring its own — failing both is a load error.
Existing subcommanded verbs (`settings`, `alias`, `var`, `help`,
`player`) leave the per-subcommand field unset and continue to share
their verb-level controller.

When to reach for per-subcommand controllers vs. branch on
`model.subcommand` in a single controller:

- **Per-subcommand**: subcommand domains are largely independent
  (light propagation vs chemistry analysis share nothing
  meaningful). Each subcommand gets its own file, its own
  validators, its own tests.
- **Single controller, branch on subcommand**: subcommands are
  variations on one theme (`settings list/get/set/unset` is one
  concept with four user-facing operations).

The choice is a content-shape question, not a framework question
— both patterns are first-class.

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

Option types: `boolean`, `string`, `number`, `object`, `objects`,
`struct`. `multiple: true` accumulates repeated `--opt v --opt v`
tokens into an array — orthogonal to `type: objects`, which makes
the option's MQL resolution plural-cardinality.

A second occurrence of a non-`multiple` option is a `bind` error
(`option --xyz specified more than once`). A boolean option given a
`=value` is also a bind error.

### `type: object` / `type: objects` on options — MQL-resolved

Options of `type: object` and `type: objects` ride through the same
`resolveAndValidate` pipeline as positional fields: the matcher
runs MQL on the option's text and lands an `MqlOneResult` /
`MqlManyResult` wrapper on the model. The controller reads
`model.<field>.stuff` directly — no `MqlApi.resolveOne` /
`MqlApi.resolveMany` call needed.

```yaml
options:
  mql:
    type: object
    scope: [reachable]
    description: "MQL expression alternate to <path>"
  on:
    type: objects
    scope: [reachable]
    description: "MQL expression for the target(s) to bind `this` to"
```

Same `scope:` rules as a positional field: a string or string
array, defaulting to `['$focus']` when omitted; each entry runs
through `ShellApi.expandVariables`. Options never update player
focus or pronoun memory's gender-routing slot — focus drilling is
a positional-side concept.

## `payload:` — structured-form-only fields

A third top-level block, sibling of `args:` and `options:`. Fields
declared under `payload:` are populated **exclusively** through
`CommandApi.assembleFromStructured` — the text-input path
(`msh`) doesn't surface them at all. Use for content the client
composes via a GUI / editor buffer / non-textual UI: code bodies,
JSON blobs, anything that doesn't ride well through tokenization.

```yaml
verbs: [author]
controller: AuthorController
description: "Author a thing with a body"
args:
  - name: path
    type: string
    required: true
options:
  language:
    type: string
    default: typescript
payload:
  body:
    type: string
    required: true
    description: "File body — provided by the client, not typed"
  metadata:
    type: struct
    schema:
      type: object
      properties: { author: { type: string } }
```

**Field shape**: payload entries are option-shaped (the same
`OptionDefinition` taxonomy — `type` / `schema` / `scope` /
`validators` / `multiple` / `default` / `field`). Payload fields
add `required: boolean` for "the client MUST attach this key";
`assembleFromStructured` enforces it after applying defaults.

**Three rules**:

- **Text input never sees them.** A `msh author /draft` invocation
  with no structured payload binds only `path`. Body stays
  `undefined`; if `required: true`, the structured-form ingress
  fails with "missing required payload field: body" — but only
  on the structured path. The text path doesn't reject the
  invocation; it just leaves the field absent and the
  controller decides what to do.
- **Same coercion + resolution as options.** Payload fields of
  `type: object` / `type: objects` ride the same MQL pipeline as
  option-side fields; the result lands as
  `MqlOneResult` / `MqlManyResult` on the model.
- **Field-name uniqueness extends.** Payload field names can't
  collide with positional args, verb-scoped option names, or
  subcommand option names. The load-time validator catches it.

**When to use payload vs. an option of `type: struct`**:

- `type: struct` on an option: text-input rejects with
  "requires structured input"; structured-input populates with a
  single object. The field exists in the option set, the player
  just can't bind it from text.
- A `payload:` field: doesn't appear in the option set at all.
  The text user has no way to know it exists from the
  command-spec surface.

Use `payload:` when the field is conceptually never typeable
(code bodies, multi-megabyte blobs, editor-only data). Use
`type: struct` on an option when the field is option-shaped but
needs richer-than-string structure.

## Controllers

A controller is a templated `Idea` (Stuff). One file per controller
under `mud/obj/command/<Name>Controller.ts`, with a matching seed at
`mud/seeds/obj/command/<Name>.yaml` that produces a Template doc at
`/obj/command/<Name>` in the `domain` collection. The YAML view's
`controller:` field is that **template name** — the dispatcher does
`StuffApi.clone('/obj/command/' + command.controller)` for each
execution. By convention the template name matches the TS class name
(`LookController`'s seed creates `/obj/command/LookController`), but
the binding is template-driven, not class-driven. Hot-reload works
because `StuffApi.clone` consults `HotReloadApi`.

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

- **Template name matches the YAML's `controller` field.** The
  dispatcher resolves through
  `StuffApi.clone('/obj/command/' + command.controller)`. The
  template seed and the TS class conventionally share the name, but
  it's the template path that's load-bearing.
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

### Resolution outcomes — how a controller finishes

`execute` may be sync or async (return type
`CommandResult | Promise<CommandResult>`). The shape is small:

```ts
interface CommandResult {
  success: boolean;
  pass?: boolean;
  summary?: Mml | string;
}
```

But there are several distinct **resolution modes** worth knowing
about — the controller picks one each call:

#### 1. Plain success — `{ success: true, summary }`

The command did what it was supposed to. The auto-emit fires
`<verb>: <summary>` at info level for the giver. Prose has already
been delivered via `MessageApi.scene(...)`; the summary is the audit
tail, not the player-visible output.

Example: `OpenController` returns `{ success: true, summary:
'opened the chest' }` after firing the open scene.

#### 2. Player-facing failure — `{ success: false, summary }`

The command can't run for a player-input reason: target not visible,
nothing in inventory, can't reach, already open. The auto-emit fires
at warn level; `summary` is the message the player reads. No scene
needed in most cases — the auto-emit IS the feedback.

Example: `OpenController` returns
`{ success: false, summary: "you don't see any 'chest' here" }`.

#### 3. Silent success — `{ success: true, summary: '' }`

Same as #1 but suppresses the auto-emit tail. Use when the
controller's own `Scene.send()` already carries the player-visible
result and an extra "verb: ok" line would be noise. Rare —
usually it's simpler to let `'ok'` ride.

#### 4. Chain pass-through — `{ success: false, pass: true }`

Opts the controller out of dispatch. The dispatcher tries the next
recency-stack match. The Throne example: a Throne in the room
contributes `sit.yaml` under `environment`; the Throne controller
either claims (`success: true`) or passes — when it passes, the
avatar's intrinsic `sit` runs next.

A passing controller MUST NOT have observable side effects: no
`Scene.send()`, no world-state mutation. The pre-execute resolve
stage **does** still run (that's how a controller can decide it's
not applicable based on resolved object state), but past that, the
controller body has to be read-only.

#### 5. Throw — programmatic invariant failure

A throw inside `execute` bubbles to `_executeOne`'s boundary, which
catches it and converts to `{ success: false, summary: error.message
}`. Use this for cases that shouldn't happen: a `Mobile` mover that
isn't `Containable`, a `target.stuff` that fails an `instanceof`
narrow that the validator was supposed to catch, etc.

Don't throw for player-input problems — return `{ success: false,
summary: '...' }`. The split mirrors the bind/shape error split in
the matcher: throws are bugs, returned failures are normal control
flow.

#### 6. Re-dispatch — `CommandApi.forceCommand(giver, text)`

A controller can run a second command on the same giver, stamped
`forced: true` on the resulting Command frame. Used by
`MobileMixin.traverse` for the auto-look-on-arrival; future
NPC-script and admin verbs will use it too. The forced command's
result is independent — the calling controller still returns its
own `CommandResult`.

#### Picking a `summary`

`summary` is the short auto-emit tail. Defaults: `'ok'` (success),
`'failed'` (failure). One sentence, no markup, no newlines. Don't
write prose into `summary` — that's `MessageApi.scene(...)`'s job.
Examples from the shipped controllers:

| Verb | Outcome | summary |
|---|---|---|
| `look` | success | `examined the throne room` |
| `look` | no match | `you don't see any 'flower' here` |
| `go` | success | `to the dungeon` |
| `go` | no match | `can't go that way` |
| `open` | success | `opened the chest` |
| `open` | wrong type | `can't open that` |
| `drop` | success | `rose, sword` (the dropped names, joined) |
| `drop` | nothing dropped | `nothing dropped` |

The convention: success summaries describe **what changed**, failure
summaries describe **why nothing changed**.

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
