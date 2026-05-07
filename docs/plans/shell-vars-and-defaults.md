# Shell variable interpolation + default args

Resolves the scope-vs-default-scope conflict by introducing
variable interpolation on the shell side, exposes synthetic vars
(`$scope`, `$me`, `$here`, …) with realtime resolution, and
formalizes `default:` on YAML field declarations so bare verbs
become well-defined commands at the dispatcher.

Companion change: the priority-fallback rule for scope (drill-first,
YAML-fallback) lands alongside, since `$scope` and the fallback
together are what make drill ergonomic without trapping players
inside detail stacks.

## Why this lands here

Three problems collapse into one solution:

1. **Drill vs. command-reach.** Today the YAML `scope:` *replaces*
   the player's drilled scope, so drilling silently breaks every
   inspection command's broad reach. The fallback rule fixes that.
2. **Bare-verb scope reset is fragile.** `LookController.clearScope()`
   plus the auto-look on movement is a contract that the next
   inspection-command author has to remember. Default args remove
   that requirement.
3. **The `default: $scope` shape needs interpolation.** A YAML
   author writes `default: $scope`; we need a runtime mechanism
   that expands that. Variable interpolation generalizes — players
   can also use `$X` on the CLI.

## Mixin extraction

New mixin: **`FocusedMixin`**.

Owns:

- `getScope() / setScope(s) / clearScope()` — moved from
  `CommandGiverMixin`.
- `getPronounMemory()` — moved from `CommandGiverMixin`.
- `static commandContributions.self = ['focus.yaml']` — moved
  from `CommandGiverMixin`.
- `static syntheticVars: SyntheticVarEntry[]` — declares `$scope`
  plus the `$it` / `$him` / `$her` / `$them` aliases.

Avatars compose `FocusedMixin` alongside `EnvironmentMixin`.
NPCs by default don't compose either; they're CommandGivers with
no drill state, no pronoun stash, and no `focus` verb on their
recency stack.

`CommandGiverMixin` shrinks back to "I can issue commands and walk
the recency stack." That's the right shape for both avatars and
scripted NPCs.

### Dispatcher / resolver impact

- `MqlContext.scope` becomes whatever the dispatcher decides —
  for a Focused giver, `giver.getScope()`; otherwise the YAML
  scope (or `'here'`). One conditional in `resolveAndValidate`.
- Pronoun-memory `update` calls in `resolveAndValidate` gate on
  `MixinApi.isFocused(giver)`. If absent, skip.
- Pronoun-seed reads in `mql/resolver.ts` similarly gate — empty
  matches when the giver isn't Focused.
- The dynamic-pronoun substitution in `updatePlayerScope` gates
  the same way.

## Scope priority/fallback rule (companion change)

Lands in this branch alongside vars+defaults — they're conceptually
linked.

```ts
// resolveAndValidate, per MQL field:
const playerScope = MixinApi.isFocused(giver) ? giver.getScope() : null;
const yamlScope = def.scope ?? null;
const tries: string[] =
  playerScope && yamlScope && playerScope !== yamlScope
    ? [playerScope, yamlScope]   // drill first, fallback second
    : playerScope
      ? [playerScope]
      : yamlScope
        ? [yamlScope]
        : ['here'];

let result = null;
for (const scope of tries) {
  result = MqlApi.resolve(raw, { commandGiver: giver, scope });
  if (result.stuff.length > 0) break;  // found, stop
}
```

So a drilled player typing `look chair` searches the drilled
scope first, falls back to `inventory, here` on miss. Cheap when
the first try hits (the common case).

## Variable interpolation

### Sigil and grammar

`$<name>` and `${<name>}` inside command-line text. Both forms
expand to the resolved value. The `${X}` form lets you put a name
abutting other characters: `${scope}.book` works without
ambiguity.

Names are `[A-Za-z_][A-Za-z0-9_]*` — no dots, no hyphens. (Matches
the existing setting/var naming convention in `EnvironmentMixin`.)

`$$` keeps its existing MQL-seed meaning (last-result). The
interpolator skips `$$` — leaves it intact for MQL to handle.

### When expansion runs

In the matcher (`CommandApi.assemble`), per `WordToken` value
read, before binding to a positional. Greedy slices: each token in
the slice gets expanded independently, then the slice is rebuilt.

This means:

- `look $scope` → tokenize → `["look", "$scope"]` → during bind,
  `$scope` → `"inventory, here"` → bound atomically to `target`
  as one string. MQL then parses "inventory, here" as a comma
  union. **No accidental splitting of multi-word expansions.**
- `look ${room}.book` → `${room}` → `"library"` → token becomes
  `"library.book"` → bound to target → MQL drill resolves.
- `examine the $weapon` (greedy field) → tokens
  `["the", "$weapon"]` → expand each → `["the", "rusty sword"]` →
  greedy slice rejoined as `"the rusty sword"` → MQL desugar
  strips article → resolves "rusty sword".

Defaults fire through the same expansion path: when a field's
input is empty and `def.default` is set, the matcher fills it,
then expansion runs as if the player had typed it.

### Gating

Expansion is on by default for any giver composing
`EnvironmentMixin`. Two opt-outs:

- Per-host setting: `shell.interpolate-vars: boolean` (default
  `true`). Off by setting → matcher skips expansion entirely.
- Mixin absence: NPCs without `EnvironmentMixin` never expand.
  Scripts pass literal MQL.

The setting goes on `EnvironmentMixin`'s static `settings`
schema, declared alongside `shell.parser`.

### NPCs and `$X`

NPCs by default don't compose `EnvironmentMixin` or
`FocusedMixin`. The variable interpolator never runs for them, so
any `$X` token in NPC-issued input flows through to MQL as the
literal string `"$X"`. MQL's lexer doesn't recognize `$` outside
the `$$` token, so it errors loudly at parse time and the NPC's
command fails through the standard `executeCommand` outer
try/catch. That's the right behavior — script authors see a
parse error and either fix the script or compose the mixins.

`$$` (MQL last-result) is a different mechanism — MQL syntax,
not shell interpolation. NPC scripts that use `$$` parse fine but
the resolver reads from `getPronounMemory()`, which is gated on
`isFocused(giver)`. Without Focused, the pronoun stash is
unreachable and `$$` resolves to an empty match list. No error,
just no result.

Don't add special-case behavior for NPCs. The contract is:
opt in to `FocusedMixin` + `EnvironmentMixin` if you want drill
state, pronoun memory, or var interpolation. The default NPC has
none of those, and that's correct.

### Synthetic vs stored variables

**Synthetic** — read-only, resolved on every expansion call.
Declared on the mixin that owns the underlying state via a
`static syntheticVars: SyntheticVarEntry[]` field. Same pattern
as `static settings`, `static commandContributions`, and
`static persistentFields` — composition-driven, no central
registry, no map to keep in sync as new mixins are added.

```ts
export interface SyntheticVarEntry {
  /** The name without the `$` sigil. */
  name: string;
  description: string;
  /** Read the live value from this host instance. */
  read(giver: Stuff): string;
}
```

Each mixin declares the vars whose backing state it owns:

```ts
// On FocusedMixin:
static syntheticVars: SyntheticVarEntry[] = [
  {
    name: 'scope',
    description: "The giver's current MQL scope fragment.",
    read: (giver) => (giver as Stuff & Focused).getScope(),
  },
  // $it / $him / $her / $them — pronoun-name aliases, useful
  // when interpolating inside larger fragments.
  ...
];

// On CommandGiverMixin:
static syntheticVars: SyntheticVarEntry[] = [
  { name: 'me',   description: '…', read: () => 'me' },
];

// On ContainableMixin:
static syntheticVars: SyntheticVarEntry[] = [
  { name: 'here', description: '…', read: () => 'here' },
];
```

Lookup walks the giver's mixin chain (`MixinApi.queryMixins`)
on each expansion, first-match wins:

```ts
function lookupSyntheticVar(
  giver: Stuff,
  name: string,
): SyntheticVarEntry | null {
  for (const mixin of MixinApi.queryMixins(giver.constructor as never)) {
    const vars = (mixin as { syntheticVars?: SyntheticVarEntry[] })
      .syntheticVars;
    if (!vars) continue;
    for (const entry of vars) {
      if (entry.name === name) return entry;
    }
  }
  return null;
}
```

Effect: an NPC composed without `FocusedMixin` won't find
`$scope` at all — the lookup returns null, expansion soft-warns,
"unknown variable: $scope". Adding a new synthetic var means
declaring it on the mixin that owns its source-of-truth, no
core file edit.

The full set of v1 synthetic vars (one per mixin):

- `$scope` — `FocusedMixin`. Live read of `getScope()`.
- `$it` / `$him` / `$her` / `$them` — `FocusedMixin`. Each
  returns the corresponding MQL pronoun literal so authors can
  interpolate them inside fragments (`look ${it}:i`).
- `$me` — `CommandGiverMixin`. Always returns the literal `'me'`.
- `$here` — `ContainableMixin`. Always returns the literal
  `'here'`.

**Stored** — settable by the player via `var set NAME VALUE`,
read on expansion:

- `$<name>` for any name in `giver.listVars()`.

**Precedence**: synthetic wins. If a player does
`var set scope foo`, `$scope` still resolves to the giver's
actual current scope. Justification: synthetic names are
documented and stable; if a player accidentally sets a name that
clashes, surprise behavior is worse than a documented override.

`expandVariables` first calls `lookupSyntheticVar`; on miss,
falls back to `giver.listVars()[name]`.

### Empty / missing variables

- Synthetic that returns empty (e.g., `$scope` with `getScope() ===
  ''` — shouldn't happen, scope defaults to `"here"`): expansion
  yields `''`, the token becomes empty, drops out of the bind.
- Stored-var miss (no var by that name): expansion yields `''`
  with a soft warning logged via MudlogApi (the player sees
  "unknown variable: $foo" but the command still runs with an
  empty token). Justification: failing the command breaks scripts
  mid-flight; empty-substitute keeps things moving and the
  warning surfaces the typo. **Settled — soft-warn it is.**

### Quoting and expansion

Shell-quoting in msh is a token-grouping concern only — it
preserves multi-word content as one bound token. **`$X` always
expands, regardless of quoting.** No bash-style "single-quotes
suppress" semantic; one rule, no special cases.

- `look $scope` → expands.
- `say "the $scope is empty"` → expands inside the quoted
  greedy slice — the message body contains the resolved scope
  text, not the literal `$scope`.
- `look '$scope'` (shell-quoted) → expands; the bound token
  value is the resolved scope fragment, not the literal four
  characters `$scope`.

If we ever need a literal `$` (rare), we'll add a backslash
escape at the lexer level (`\$` → `$`). Not in scope for v1; no
current use case justifies it.

Layered with MQL's own `'literal name'` quoting: shell-level
expansion runs first (in the matcher); MQL parses what's left.
So `look 'a $scope of work'` → matcher expands → MQL sees
`'a here of work'` (or whatever scope resolves to) inside its
own literal — searches for that exact name string.

## Default args

### YAML schema addition

`FieldDefinition` gains `default?: string`. The string is text
the matcher fills when the player provides no input for the
field. Expansion runs over the default exactly as if the player
had typed it.

Examples:

```yaml
# look.yaml — bare `look` becomes "look at what I'm focused on."
verbs: [look, l]
controller: LookController
description: ...
args:
  - name: target
    type: object
    required: false
    scope: "inventory, here"
    updates_scope: true
    prepositions: [at]
    default: "$scope"

# focus.yaml — bare `focus` displays current scope; controller
# handles the empty-fragment case directly. No `default:`.

# go.yaml — no useful default; `go` with no direction stays an
# error. (`default:` absent.)
```

### Where the default fills in

`bindPositionals` — when a field has no positional token
available AND `def.default !== undefined`, treat the default
string as the field's bound value, then run expansion on it.

The string is the post-expansion fragment, plain text. For
`type: object` fields, it goes into `resolveAndValidate` and runs
through MQL like player-typed input.

### Multi-arg defaults

Defaults attach to fields, not commands. For a multi-positional
verb, each field independently decides whether to default. The
matcher's `bindPositionals` extends its boundary-lookahead rule
(today used for greedy fields' termination) to non-greedy fields
too:

> When binding a positional field, peek the next token. If the
> token is in a *later* field's `prepositions:` list, this field
> has no input — apply the default (or fail if required without
> default).

Concrete: `give` with `gift` (default `$scope`) and `recipient`
(`prepositions: [to]`, default `me`):

| Player types         | Resolution                                                   |
| ---                  | ---                                                          |
| `give flower bob`    | gift=flower, recipient=bob (positional fill in order)        |
| `give flower to bob` | gift=flower, "to" consumed by recipient, recipient=bob       |
| `give flower`        | gift=flower; recipient has no positional → default `me`      |
| `give to bob`        | gift sees `to` belongs to recipient → default `$scope`; recipient consumes "to", binds bob |
| `give`               | both fields fall to defaults → `$scope` and `me`             |

The matcher's lookahead is what makes "skip an earlier defaulted
field by typing a later field's preposition" work. Without
prepositions on later fields, players can't skip middle defaults
— `give flower` always reads as `gift=flower`, never as
`recipient=flower`. That matches English ordering anyway.

### Interaction with `required`

`required: true` + `default:` is allowed — the default takes
the place of the missing input, no shape error. The original
"missing required arg" message only fires when the field is
required AND has no default AND the player supplied nothing.

`required: false` + no `default:` — current behavior; field
stays absent on the model.

### Interaction with `type: object` empty resolution

The fallback-scope rule and defaults compose naturally:

- Bare `look` (player at `bookcase.book`) → default `$scope` →
  expanded to `bookcase.book` → MQL resolves it (drill scope
  first, drills succeed, returns bookcase + via.detailPath =
  ['book']) → controller renders.
- Bare `look` (player at `here`) → default `$scope` → `here` →
  resolves to location → controller renders the room.
- `look chair` (player at `bookcase.book`) → resolves chair, drill
  miss, fallback to `inventory, here`, finds chair, scope
  re-anchors to `chair`.

`LookController.clearScope()` and the bare-look-renders-room
branch both go away — the dispatcher's normal path handles every
case uniformly.

### Auto-look-on-arrival

`look.yaml` declares `default: "$scope"`. Bare `look` becomes
"look at the thing the player is currently focused on" —
drilled into `bookcase.book`, bare `look` renders the book;
drilled into `rose`, bare `look` renders the rose. That IS the
drill semantic players want.

The cost is that scope state from the prior room is stale after
movement. If scope is `widget`, the post-move auto-look fires
`look $scope` → expands to `look widget` → MQL searches the new
room for "widget" → empty → fallback to YAML scope → still
nothing. Result: the player arrives and the auto-look produces
no useful output.

Fix: **movement resets scope to `"here"` before firing the
auto-look.** One reset point. `Mobile.traverse` and `teleport`
(non-silent) both do it, gated on the mover composing
`FocusedMixin`:

```
ContainmentApi.move(...)
announceArrival(...)
if (MixinApi.isFocused(mover)) mover.clearScope();
await CommandApi.forceCommand(mover, 'look');
```

The auto-look then runs `look $scope` with scope already at
`"here"` → resolves to the location → renders the new room →
`updates_scope: true` re-anchors to `"here"` (no-op since
clearScope already set it). Player sees the new room
immediately on arrival. Drill state cleared.

`teleport` with `{silent: true}` (Login spawn) skips both
announceArrival and auto-look today; it should also skip the
clearScope for symmetry — the spawning avatar starts with the
default `"here"` already.

`LookController.clearScope()` and the bare-look-renders-room
branch both still go away. The dispatcher's normal `default:
$scope` path handles every bare look uniformly.

## Player vs dev command styles

The framework's command spec is dual-shaped: positionals + opts +
prepositions. That covers both audiences without a mode toggle:

- **Player-facing commands** lean on **prepositions** for ergonomic
  field-skipping (`give flower to bob`).
- **Dev/system commands** lean on **options** (`mkroom hall -z dungeon`)
  for the same purpose in unix-style.
- They coexist on the same YAML when both make sense — players
  use the natural form, devs use options.

A field can be expressed as both a positional (with optional
preposition) AND an option (via `OptionDefinition.field` binding
to the same target). That's already supported by the framework.
The help system can render layered help when both forms exist —
basic help shows the canonical natural form; verbose help shows
alternates. A future `synonym?: boolean` on `OptionDefinition`
would let help skip alternate forms in basic rendering.
**Out of scope for this branch — flagged so we have it.**

Lighter toggles for "strict mode" (content authoring, scripting):
the `shell.interpolate-vars: false` setting already gives one knob;
future settings could disable preposition consumption or default
filling for stricter unix-style matching. Cheaper than parallel
specs; we don't need to commit to that design now.

## Future work (not this branch)

**`look` becoming `type: objects`.** Today look is `type: object`
(singular) — MQL picks the highest-scored match. With
`default: "$scope"` and a player whose scope expanded to a
multi-result fragment (`focus inventory, here`, or `look flower`
when there are two flowers), bare look picks one arbitrarily.
The right long-term fix is migrating look to `type: objects` and
letting the controller render multiple — or hooking into the
future auto-disambiguation seam on `resolveOne` to ask "which
one?" when there's a UI.

Scope also tracks: when the player drilled via a multi-match
query like `look flower`, what does scope advance to? Today it
re-anchors to the typed fragment ("flower"); the next bare
`look` re-resolves that fragment, again returning the same
multi-result set. Probably fine — the player sees the same
ambiguity until they disambiguate. But worth thinking through
once we touch it.

**Help-system synonym annotation.** `OptionDefinition.synonym?:
boolean` (or a richer `audience: 'natural' | 'explicit' | 'both'`)
to let basic help skip alternate forms when both an option and a
positional point at the same field. Cheap addition when help
rendering is touched.

**Strict-mode toggles.** `shell.honor-defaults: boolean` and
`shell.consume-prepositions: boolean` settings for content
authors who want unix-style strictness during a session. Future
addition; current `shell.interpolate-vars` covers one slice.

Out of scope for this branch. Flagged so we don't lose them.

## Implementation phases

### Phase A — FocusedMixin extraction

- New `lib/command/Focused.ts` with the mixin and `Focused`
  interface (scope accessors + getPronounMemory).
- Move scope and pronoun memory state out of
  `CommandGiverMixin`.
- Move `focus.yaml` self-contribution onto FocusedMixin.
- `Mixins.Focused` registry constant + `MixinApi.isFocused`
  predicate.
- Avatar composes FocusedMixin alongside EnvironmentMixin.
- Update `MqlContext` provisioning to handle Focused-absent
  givers (use YAML scope or `'here'`).
- Gate dispatcher's pronoun memory `update` on
  `MixinApi.isFocused(giver)`.
- Gate resolver pronoun-seed reads similarly.
- Tests: existing `command-pronoun`, `command-empty-resolve`,
  `FocusController` need to compose Focused on their test givers.

### Phase B — Scope priority/fallback rule

- `resolveAndValidate` tries player scope first, YAML scope on
  empty.
- Verify the existing tests (especially command-pronoun's
  drill-trail tests) still pass; adjust expectations where the
  old "YAML overrides player" behavior was assumed.

### Phase C — Variable interpolation

- New `lib/shell/var-interpolation.ts` exporting
  `expandVariables(text: string, giver: Stuff): string`.
- `SyntheticVarEntry` type definition + `lookupSyntheticVar`
  helper that walks the mixin chain via `MixinApi.queryMixins`.
- Soft-warn (via `MudlogApi`) on unknown stored vars.
- `EnvironmentMixin.settings` gets `shell.interpolate-vars`.
- Each owning mixin declares its `static syntheticVars` —
  `FocusedMixin` (`$scope`, `$it`, `$him`, `$her`, `$them`),
  `CommandGiverMixin` (`$me`), `ContainableMixin` (`$here`).
- `assemble`'s `bindPositionals` calls `expandVariables` per
  bound token. Greedy slices: pre-expand each token then rejoin.
- Skip when giver lacks `EnvironmentMixin` or the setting is off.

### Phase D — Default args + matcher lookahead

- `FieldDefinition.default?: string`.
- `bindPositionals` fills `def.default` when input is empty,
  then expansion runs over the default same as player-typed.
- Matcher boundary-lookahead extends to non-greedy fields:
  when binding a positional and the next token belongs to a
  *later* field's `prepositions:` list, the current field
  defaults instead of consuming.
- Required+default interaction: default replaces "missing arg"
  shape error.
- Schema addition in `command.schema.json`.

### Phase E — YAML migrations + movement reset

- `look.yaml`: add `default: "$scope"`. Bare look means "look at
  what I'm focused on."
- Verify all existing YAMLs still work.
- Drop `LookController.clearScope()` and the bare-look-renders-
  room branch — the dispatcher handles it now via the default.
- `Mobile.traverse` and `Mobile.teleport` (non-silent path):
  call `mover.clearScope()` before the auto-look, gated on
  `MixinApi.isFocused(mover)`. The reset is a side effect of
  *moving*, not of *looking* — keeps the auto-look itself a
  normal forced bare-look.

### Phase F — Tests + docs

- New `var-interpolation.test.ts` covers synthetic, stored,
  precedence, unknown vars, gating, multi-word expansions
  (the `look $scope` non-greedy case), expansion inside shell-
  quoted tokens (always expands), `${X}` form, NPC pass-through
  to literal MQL.
- Default args tests: `bare look` resolves through `default:
  "$scope"`; multi-arg default-fill order; `give to bob`-style
  preposition-driven skip.
- Drill-fallback tests: `look chair` from drilled scope falls
  through to YAML scope.
- Update `docs/subsystems/shell-environment.md` to describe
  interpolation + the `static syntheticVars` declaration pattern.
- Update `docs/subsystems/mql.md` (Phase 9 work) to describe the
  scope priority/fallback rule and default-arg interaction.

## Settled decisions

- **Mixin name**: `FocusedMixin` (matches the `focus` verb,
  prompt rendering says "scope: <fragment>" but the user-facing
  metaphor is focus).
- **Soft-warn vs fail on unknown stored var**: soft-warn +
  empty substitution. Failing breaks scripts mid-flight.
- **Movement scope-reset placement**: direct `clearScope()` in
  `Mobile.traverse` / `teleport`, gated on `isFocused(mover)`.
- **`$$` aliasing**: leave as MQL syntax. No `$last` alias.
- **Quoting**: shell-quoting always allows expansion. One
  uniform rule.
- **NPC `$X` behavior**: treat as literal (no expansion); MQL
  parses and errors loudly. No special-case handling.
- **Default-arg location**: per-field, not command-level. The
  matcher's boundary-lookahead extension makes multi-arg work
  with prepositions naturally.
- **Player vs dev command styles**: single spec per controller;
  use prepositions for player ergonomics, options for dev
  controls. They coexist on the same YAML. No mode toggle.

## Test counts (rough)

- FocusedMixin extraction: ~10 tests across existing files
  adjust; ~5 new mixin-specific tests.
- Fallback scope: ~6 dispatcher tests.
- Variable interpolation: ~15 (synthetic, stored, precedence,
  gating, multi-word, ${X} form, NPC pass-through, soft-warn).
- Default args: ~10 (default-fills, default+required, multi-arg
  with preposition lookahead, `$scope` default expansion).

Roughly +35 tests total. Branch ends well over 1450.

## What gets pushed when

Single branch (this one), four logical commits beyond the plan
commit and the half-stubbed Phase A:

1. Phase A — `FocusedMixin` extraction + `Mixins.Focused`.
2. Phase B — Priority/fallback scope rule.
3. Phase C — Variable interpolation (`static syntheticVars`
   pattern + the `expandVariables` matcher pass + the setting
   toggle).
4. Phase D + E — Default args (with matcher-lookahead extension)
   + YAML migrations (`default: "$scope"` on look) +
   `LookController.clearScope()` removal + the movement-side
   scope reset on `Mobile.traverse`/`teleport`.

Each commit ships green tests; the chain is reviewable in order.

## Already in place (this session, uncommitted)

Stubs landed mid-discussion that are NOT yet wired. The next
session's Phase A picks up here:

- **`packages/server/src/mud/lib/command/Focused.ts`** — new
  file. `FocusedMixin` defined with scope state, pronoun memory,
  `focus.yaml` self-contribution. Includes the `Focused`
  interface. **Not yet composed onto Avatar.**
- **`packages/server/src/mud/lib/mixin.ts`** — `Mixins.Focused
  = 'FocusedMixin'` constant added.
- **`packages/server/src/mud/api/mixin.ts`** —
  `MixinApi.isFocused(obj)` predicate added; `Focused` type
  imported.

What's NOT done yet (Phase A continues from):

- Strip scope state, pronoun memory, and the `focus.yaml`
  self-contribution from `CommandGiverMixin` (currently the
  fields and the contribution still live there too — both old
  and new code paths exist).
- Compose `FocusedMixin` into Avatar's mixin chain (probably
  alongside `EnvironmentMixin` in `Avatar.ts`).
- Update `resolveAndValidate` to gate scope reads + pronoun
  memory updates on `isFocused(giver)`, falling back to YAML
  scope or `'here'` when the giver isn't Focused.
- Update the resolver's pronoun-seed reads + dynamic-pronoun
  scope substitution to gate on `isFocused`.
- Update tests where the test giver previously composed
  `CommandGiverMixin` and expected scope/pronoun-memory access
  — those givers need to compose `FocusedMixin` too.

The `command-pronoun.test.ts`, `command-empty-resolve.test.ts`,
and `FocusController.test.ts` test fixtures use ad-hoc
`TestGiver` classes that compose `CommandGiverMixin`; those
fixtures need `FocusedMixin` added to keep the tests green
during the cutover.

Once Phase A's cutover lands, the rest of the phases (B–E)
proceed in order.
