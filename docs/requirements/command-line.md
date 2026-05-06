# Command-Line Parser & MVC — Requirements

Status: requirements (pre-build). Hand to planning agent. Once
implemented, fold the still-true bits into
`docs/subsystems/commands.md` and delete this file.

## Goal

Round out the command pipeline so it cleanly supports the syntax we
want to commit to today, and clear the path for the shell, MQL, and
piping work that comes later. **Most of the work is in the matching
layer and the model/controller plumbing, not the tokenizer** — the
tokenizer needs a few targeted fixes (single-quote semantics, greedy
preservation, pipe boundary). The bulk of the design changes are in
how options/subcommands/multi-tier scopes are declared in YAML and
delivered to controllers, and in how dispatch picks among multiple
matched controllers.

## Non-goals (this pass)

These are explicitly **out of scope**. Where the parser/model needs
to leave a hook for them, the hook is called out below.

- MQL grammar work beyond what's there today. Phase-4 keyword
  scoring stays. (Future: ordinals, prepositions, possessives,
  anaphora, sets, quantities, stuff-id literals.)
- Shell features: aliases, env-var expansion, history, command
  substitution, conditionals, scripts/functions, heredocs,
  tab-complete protocol, multi-command sequencing.
- **Pipe execution** — pipes are parsed but a non-trivial pipeline
  throws "not yet implemented" at parse time.
- Per-giver dispatch-cache memoization (the deferred-improvement in
  `commands.md`). The schema-push hooks below land alongside this
  but the actual cache build-out is its own follow-up.
- Field-level coercion overhaul. Coercion stays validator-driven for
  now; we revisit when MQL lands.

---

## Pipeline shape (with this work applied)

```
text input
  → CommandLineApi.parse()           ─ pure tokenizer, YAML-unaware
      yields ParsedPipeline {
        commands: ParsedCommand[],
        raw: string,
      }
      where ParsedCommand {
        verb: string,
        rawTokens: RawToken[],       ─ classified, not yet bound to YAML
        offsets?: ...                ─ deferred (column-accurate errors)
      }
  → CommandLineApi (pipeline check)  ─ throws NYI if commands.length > 1
  → CommandApi.matchVerb()           ─ lookup verb against per-giver stack
  → CommandApi.assemble()            ─ YAML-aware: bind raw tokens to
                                       options/subcommand/fields per YAML
  → resolveValidateExecute           ─ MQL on type:object, validators
  → controller.execute(model, ctx)   ─ MVC body
  → auto-emit                        ─ unchanged

structured input { type: 'command', payload: { verb, subcommand?,
  fields, raw? } }
  → CommandApi.assembleFromStructured()  ─ skips parse, validates
                                            against same YAML
  → resolveValidateExecute (same as above)
```

Two ingress paths, one `CommandModel`, one validator/controller stack.

---

## 1 · Lexical layer (tokenizer)

### 1.1 Whitespace

- Token boundaries: ` `, `\t`, `\n`, `\r` (any run collapses).
- Empty input → empty pipeline (`commands: []`); ingress short-
  circuits with the existing "No command entered" path.

### 1.2 Quoting

- `"…"` quotes a token; whitespace and reserved characters inside
  are part of the token.
- **Single quote `'` is literal text — not a quoting character.**
  Rationale: chat-driven MUD; players use apostrophes constantly.
  UI-side emphasis is handled with Discord-like markdown, not
  shell-style single-quoting.
- Adjacent-quoted concatenation: `--name="hello "world` → one token
  `--name=hello world` (bash convention; needed so quoted segments
  can adjoin literal characters).

### 1.3 Escapes

Inside `"..."`:
- `\"` → `"`
- `\\` → `\`
- `\n` → newline, `\t` → tab, `\r` → carriage return
- Unknown escape: keep `\` + char verbatim (existing behaviour).

Outside any quoting:
- `\<space>` (or any whitespace char) → literal whitespace inside
  the token (single token, doesn't break on the escaped space).
- `\\` → `\`.
- `\"` → `"` (lets you embed a `"` in an unquoted token).
- Other `\X` → keep `\` + char verbatim.

`\'` is **not** a recognized escape — `'` is just a literal
character, escaping is unnecessary.

### 1.4 Reserved characters / pipe boundary

- `|` is a pipeline separator. Tokenizer splits at unquoted `|`
  into multiple `ParsedCommand`s. The split is at lex time;
  inside `"..."` and after a backslash-escape the `|` is literal.
- **NYI behaviour**: if the resulting pipeline has more than one
  `ParsedCommand`, `parse()` throws
  `Error('Command piping is not yet implemented')` immediately.
  No silent tolerance, no later-stage detection.
- `;`, `&&`, `||`, `(`, `)`, backtick, `$` are **not reserved**
  in this pass — they're literal characters in tokens.

### 1.5 Raw token classification

Tokens emerging from the tokenizer are classified for the matching
layer. The matcher consumes this stream; the parser does not bind to
YAML.

```
type RawToken =
  | { kind: 'word', value: string }
  | { kind: 'short-flags', flags: string }     // "-vn5" → "vn5"
  | { kind: 'long-flag',  name: string }       // "--verbose"
  | { kind: 'long-with-value', name: string, value: string }
                                                // "--name=Aslan"
  | { kind: 'stop-options' }                   // "--"
```

- `--name=value` always splits on the first `=`.
- `-X…` where the suffix isn't all `[A-Za-z]` (e.g. `-5`, `-3.14`)
  is a **word**, not flags. This avoids `add -5` parsing as flags.
  (Specifically: a token starts a flag-stack iff it matches
  `^-[A-Za-z][A-Za-z0-9]*$`. Otherwise it's a word.)
- After `stop-options` (the bare `--`), every subsequent token is
  forced to `word` regardless of its leading characters.
- The first token is always the **verb** (a `word` after stripping
  any classification — but the verb itself is never classified as
  a flag; if input begins with `-` or `--`, that's a parse error or
  treated as "unknown verb" — pin in tests).

The tokenizer attaches an optional `offsets` field for future
column-accurate error reporting; it's allowed to be omitted in the
initial implementation. **If included it must round-trip with
`format()`**.

---

## 2 · Syntactic layer

### 2.1 Grammar (BNF-ish)

```
pipeline    ::= command ('|' command)*
command     ::= verb verbOpts (subcommand subOpts)? args
verbOpts    ::= option*
subOpts     ::= option*
option      ::= shortFlags | longFlag | longWithValue | stopOptions
args        ::= word*                ─ greedy slot consumes the
                                       remainder of the original input
```

`subcommand` is the next `word` token *after* `verbOpts`, *only if*
the verb's YAML declares `subcommands`. Otherwise the next word is
the first positional arg.

### 2.2 Two-tier option scope (lexical only)

The two-tier rule is about **where in the command line an option is
allowed to appear**, not about how it lands on the model. The model
is flat — there is **one** `fields` dict for the whole execution.

- Options appearing **before** the subcommand token are
  **verb-scoped**: the verb's top-level `options:` block is the
  declaration site.
- Options appearing **after** the subcommand token are
  **subcommand-scoped**: the active subcommand's `options:` block
  is the declaration site.
- An option name not declared at the scope where it appears →
  **error**, returned as a parse failure with a helpful summary
  (`unknown option --xyz at verb-level`).
- Both layers contribute to a **single** `fields` map on the model:

  ```ts
  interface CommandModel {
    verb: string;
    subcommand?: string;
    fields: ModelData;          // unified — positional + options
    raw: string;
  }
  ```

- For verbs without subcommands, all options are verb-scoped by
  definition. Same flat `fields`.
- The lexical-scoping rule is what makes `--oneline` valid under
  `git log` but rejected under `git pull` without each subcommand
  needing to know about every option in the verb.

### 2.3 Subcommands

- A YAML defines either `syntax` or `subcommands`, never both
  (existing invariant).
- For subcommanded verbs, the subcommand name is the first **word**
  token after the verb's options. A token consumed by a verb-scoped
  option (whether as the option itself or as its value) is *not* a
  subcommand candidate.
- **No default subcommand**. If the verb requires a subcommand and
  none is provided, the controller's model handles it (e.g. shows
  help, returns failure summary) — the framework does not pick a
  default.
- Empty subcommand input is fine; the verb's controller decides
  what to do with `model.subcommand === undefined`.

### 2.4 Args (positionals)

Field arity is declared in the YAML pattern (existing syntax):

- `<field>` — required positional.
- `[field]` — optional positional; falls back to `default` from the
  field def.
- `<field...>` — **greedy**, required, consumes all remaining input
  as a single string.

#### Greedy semantics (revised)

The greedy slot is **always the last slot in a pattern**.
Implementation: when the matcher reaches a greedy slot, it reads
the remainder of the **original input** from the position
immediately after the last consumed token's end through end-of-
input, applies tokenizer escape processing **but not quote
stripping** (so quotes inside greedy text are literal), and uses the
result as the field value.

This preserves whitespace runs (`say  hello   world` keeps the
spacing) and leaves quotes-as-typed in player prose.

### 2.5 Verb token

- Verbs are case-insensitive (existing behaviour).
- Verbs cannot start with `-` or `--`.
- The verb token is matched against the per-giver command stack
  (see §6).

---

## 3 · Options — declarative model in YAML

### 3.1 YAML schema delta

Top-level (verb-scoped) options block, and per-subcommand options
blocks. Existing YAMLs that don't use options are unchanged.

```yaml
verbs: [git]
controller: GitController
description: "..."
options:                # verb-scoped
  json:
    short: j
    type: boolean
    field: json
    description: "Emit JSON output"
subcommands:
  log:
    pattern: "[branch]"
    options:            # subcommand-scoped
      oneline:
        type: boolean
        field: oneline
      author:
        short: a
        type: string
        field: author
        multiple: true
        description: "Filter by author (repeatable)"
    fields:
      branch:
        type: string
        required: false
```

Option-def fields:

| Key | Type | Default | Meaning |
|---|---|---|---|
| `short` | `string` (single char) | none | Optional short alias `-x` |
| `type` | `boolean \| string \| number \| object` | required | Value type. `boolean` is presence-only |
| `field` | `string` | the option name | Model key the resolved value lands on |
| `multiple` | `boolean` | `false` | If true, repeated occurrences accumulate into an array |
| `default` | any | unset | Default when the option is absent |
| `description` | `string` | "" | For help text |
| `validators` | `string[]` | `[]` | Same registry as field validators |

### 3.2 Matcher behaviour for options

- **Boolean**: presence sets `true`; absence falls back to `default`
  (typically `false`) if declared, otherwise the field is absent
  from `model.fields`. Repeated boolean is **idempotent** — `-vvv`
  collapses to `v: true`.
- **Value-bearing long** with `=`: `--name=Aslan` → `name: 'Aslan'`.
- **Value-bearing long** without `=`: `--name Aslan` consumes the
  next `word` token as the value. **Hard error** if the next token
  is option-classified or missing.
- **Value-bearing short** glued: `-n5` → `n: '5'`. The matcher
  peels short-flag tokens left to right; when it hits a value-
  bearing flag, the rest of the token is the value, and any
  remaining characters are not flags.
- **Value-bearing short** with space: `-n 5` → consumes next word.
- **Mixed flag stack**: `-vn5` where `v` is boolean, `n` takes a
  value → `v: true, n: '5'`.
- **Multi-occurrence with `multiple: false`**: error
  (`option --foo specified more than once`).
- **Multi-occurrence with `multiple: true`**: each occurrence
  appends to the array.
- **Type coercion**: `string` is verbatim; `number` parses via
  `Number(v)` and rejects `NaN`; `boolean` is presence-only and
  cannot have a value (`--foo=bar` on a boolean is a hard error);
  `object` is treated as MQL string and resolved like a positional
  `type: object` field.
- **Unknown option**: hard error.
- Validators on options run alongside field validators in the
  validation stage and use the same registry.

### 3.3 Where options land on the model

There is **one** `fields` map on `CommandModel`. Positional fields
from the active pattern, verb-scoped options, and subcommand-scoped
options all land in the same flat dict, keyed by their `field` name
(option's `field` defaults to the option name; positional field
names come straight from the pattern slot).

```ts
// model.fields after `git --json log --author=alice main`
{
  json: true,        // from verb-scoped option (field defaults to 'json')
  author: ['alice'], // from sub-scoped multiple-string option
  branch: 'main',    // from positional <branch>
}
```

Load-time invariant: across the entire command (positional fields
of every syntax pattern + verb-scoped options + every subcommand's
options + that subcommand's positional fields), no two declarations
share a `field` name unless they're in mutually-exclusive syntax
patterns or subcommands. This prevents silent overwrite at runtime.

The lexical-scope rule (§2.2) still applies — `--oneline` typed
before the subcommand on a verb that doesn't declare it at the verb
level is a parse error, even if a subcommand declares it. Scoping
gates **acceptance**; the model is unified once accepted.

---

## 4 · Round-trip: `format()`

`CommandLineApi.format(parsed)` produces the canonical text form
that re-parses to an equivalent `ParsedCommand` (or `ParsedPipeline`).
Lives in `command-line.ts`; **not exported to `@saxonberg/types`** —
the client doesn't need it (input bar is already text; widgets send
structured form).

Server-side uses:
- Round-trip property tests.
- Audit/history rendering (the avatar's command history ring).
- Logging — the `commandText` field in auto-emit payloads can be
  re-derived if the original is lost.

Quoting rules (must match parser):
- Words containing whitespace, `"`, `\`, or unquoted `|` are
  emitted as `"…"` with `"` and `\` escaped.
- Apostrophes are emitted bare.
- Greedy field text: emitted **unquoted** with whitespace preserved
  (the greedy slot accepts unquoted whitespace).

---

## 5 · Wire forms

Two ingress paths into `CommandModel`:

### 5.1 Text form

The existing path. WebSocket message shape unchanged:
`{ type: 'command', payload: { text: string } }`.

### 5.2 Structured form

For widgets producing non-scalar field values or for any client that
prefers to skip parsing.

```ts
{ type: 'command', payload: {
    verb: string,
    subcommand?: string,
    fields?: Record<string, unknown>,
    raw?: string,                  // optional, audit-only — not re-parsed
}}
```

- `fields` is the same flat dict as on `CommandModel.fields`. The
  client provides values keyed by the YAML's `field` name (option
  `field` or positional pattern slot) — there is no need to mirror
  the verb-scope/subcommand-scope split here, because that split is
  purely a lexical-acceptance rule for text input. Once the client
  is producing structured input, all values are already known to be
  for this verb (and this subcommand, if any).
- The matching layer assembles the same `CommandModel` from this
  shape, applying option-type coercion and field validators
  identically.
- `type: object` fields go through MQL exactly like in the text
  path. (See §8.)
- The structured path can carry **non-scalar** field values (object
  literals, arrays) for fields that aren't `type: object` — useful
  for forms emitting structured payloads. The YAML field type
  governs validation; if the YAML says `type: number`, the
  structured path enforces that.
- Unknown fields → hard error, same as the text path. The set of
  legal field names is:
  - **Flat verb**: positional fields of the matched syntax pattern
    + verb-scoped options.
  - **Subcommanded verb**: positional fields of the active
    subcommand's pattern + verb-scoped options + that
    subcommand's options.

  Clients use the YAML schema delivered via §9 to know which ones
  to send.
- The `raw` string is an opaque audit hint; the server logs it but
  does not parse or trust it.

### 5.3 One schema, two consumers

The YAML view is the **only** schema. The client renders forms and
emits structured commands by reading the same YAML the server uses
for parsing/validating. The schema delivery mechanism is described
in §9.

---

## 6 · Recency-stack discovery

### 6.1 Per-giver command stack

Each `CommandGiver` maintains an ordered list of contributing
sources. **Newer sources are at the top.** Sources include:

- **Self** (mixins and concrete class) — added at construction;
  bottom of the stack and never removed.
- **Inventory items** — added on `addContainable`, removed on
  `removeContainable`.
- **Environment** — added on `setEnvironment`, removed on
  `setEnvironment` (transition); environment-side membership
  changes (something entering or leaving the same room as the
  giver) likewise add/remove.
- **Peers** — same lifecycle as environment-side membership.

Discovery walks the stack **top-down** (newest first), collecting
all `commandProvider` declarations.

### 6.2 Verb resolution against the stack

Multiple sources can declare the same verb. Discovery returns the
**ordered list** of matches, top-down. (Today's dedup-by-verb
behaviour is replaced.)

Within a single source — particularly **self**, where multiple
mixins/the concrete class can each declare the same verb — the
order is **most-derived first**. The concrete class's
`commandProvider` beats its mixins; a mixin further down the
composition chain beats one further up. (Implementation: walk the
prototype chain or mixin list bottom-up of derivation, push to the
front.)

### 6.3 Chain-of-responsibility dispatch (`pass`)

`CommandResult` gains a `pass` flag:

```ts
interface CommandResult {
  success: boolean;
  pass?: boolean;              // default false
  summary?: Mml | string;
}
```

Dispatch loop:

1. Discovery yields a verb-match list `[c1, c2, c3, …]` ordered by
   the recency stack (top first).
2. Run resolve/validate/execute on `c1`.
3. If the result is `pass: true`, **discard the result** (no
   auto-emit, no Scene firing — controllers that pass should not
   have fired prose) and try `c2`.
4. Repeat until a non-`pass` result. That result drives the
   auto-emit and is returned.
5. If every match returns `pass: true`, emit a "no handler claimed
   <verb>" failure path. (Distinct in wording from the
   "Unknown command: <verb>" path used when `matchVerb` finds no
   matches at all — here the verb is known, no controller just
   accepted it. Exact summary text is a build-time decision.)

Rules controllers MUST follow when returning `pass: true`:

- Do not call `MessageApi.scene(...).send()` (no observable side
  effects).
- Do not mutate world state.
- The pre-execute resolve/validate stage **does run** for the
  passing controller — that's how a controller can decide it's not
  applicable based on resolved object state. (Controllers that want
  cheaper "not me" decisions can check before any work in
  `execute()`.)

A pass-and-then-fail cascade is a real pattern: a Throne's `sit`
controller might `pass` because the avatar can't reach it; the
Avatar's intrinsic `sit` then handles the input.

### 6.4 Why `success: false` doesn't conflate

`success: false, pass: false` (the default) means "I owned this
command; it failed." That's reported via the auto-emit's `failed`
tail and stops the chain. `pass: true` means "not me, try next."
Distinct axes; controllers should never rely on `success: false` to
delegate.

---

## 7 · Controller signature

### 7.1 New signature

```ts
abstract class CommandController<I> extends Idea {
  abstract execute(
    model: CommandModel,
    context: CommandContext
  ): CommandResult | Promise<CommandResult>;
}
```

The current `(input, context)` form is replaced by `(model, context)`.
`model.fields` is the unified resolved-fields dict; controllers
destructure as needed:

```ts
execute(model: CommandModel, ctx: CommandContext) {
  const { fields, subcommand } = model;
  // …
}
```

`CommandModel` shape (§2.2):

```ts
interface CommandModel {
  verb: string;
  subcommand?: string;
  fields: ModelData;       // positional + options, unified
  raw: string;
}

type FieldValue =
  | boolean
  | string
  | number
  | Stuff                  // for type:object after MQL resolve
  | FieldValue[];          // for multiple:true options
type ModelData = Record<string, FieldValue>;
```

### 7.2 Migration

Existing controllers (six of them) need a small refactor: rename
`input` parameter to `model` and read `model.fields` where they
read `input` today. No behaviour change — `model.fields` is the
same dict.

Validators retain their `(value, fieldName, context)` signature
(unchanged).

---

## 8 · MQL boundary

- Field/option `type: object` continues to feed a **string** to
  `MqlApi.resolve(query, ctx)`.
- For greedy fields, the string is the raw greedy text (no quote
  stripping), passed verbatim.
- Resolution failure stays the existing "You don't see…" path.
- **No grammar work** in this pass. Stuff-id literals and other
  MQL features are explicitly future.
- The structured wire form provides the same string for
  `type: object` fields. The path for "client already has a
  Stuff-id and wants to skip MQL search" is **deferred** — when MQL
  grows a stuff-id literal (future work), structured-form widgets
  emit that literal and a single resolution path handles it.

---

## 9 · Schema delivery to client

Push-based, event-driven. **No** handshake-time bulk dump; each
command's schema arrives when it becomes available to the giver.

### 9.1 Topics

Under the existing messaging path (see `messaging.md`):

- `system.commands.added` — payload includes the full
  `CommandDefinition` JSON for the newly-available command.
- `system.commands.removed` — payload `{ verb: string }` (or the
  primary verb if there are aliases).
- `system.commands.reset` — payload is the full current set;
  emitted on Avatar attach (login complete + character selected)
  and any catastrophic invalidation.

### 9.2 When events fire

The same hooks drive schema delivery, the recency stack, and the
deferred per-giver dispatch cache:

- `addContainable` on the giver → `commands.added` for any new
  contributions; recency-stack push.
- `removeContainable` on the giver → `commands.removed`; recency
  pop.
- `setEnvironment` on the giver → `commands.removed` for old
  environment + peers, `commands.added` for new environment +
  peers; recency rebuild for the affected slice.
- Environment-side `addContainable` / `removeContainable` (when the
  giver is a containable inside the environment) → same.

### 9.3 Payload schema

```ts
type CommandSchemaPayload = {
  verbs: string[];
  controller: string;
  description: string;
  syntax?: SyntaxDef[];          // present when not subcommanded
  subcommands?: Record<string, SubcommandDef>;
  options?: Record<string, OptionDef>;
  // … shapes mirror the YAML; serialised JSON
};
```

Initial implementation may stringify the parsed YAML. Detailed
shape can match `CommandDefinition` minus runtime-only bits.

### 9.4 Caching follow-up

The deferred per-giver dispatch cache (memoize verb → match list,
invalidate on the same hooks) lands in the **same pass** as schema
delivery — both consume the same invalidation signal. If the
schema-delivery half of the work ships first, leave a TODO marker
so the cache half doesn't get re-discovered.

---

## 10 · Test plan

### 10.1 Parser unit tests (new file)

`packages/server/src/mud/api/__tests__/command-line.test.ts`
covering:

- Whitespace handling, including Unicode whitespace edge.
- Double-quote tokenization, escape sequences inside `"..."`.
- Single-quote literal behaviour (apostrophes, contractions).
- Backslash escapes inside and outside quotes.
- Adjacent-quoted concatenation.
- Short flag stacks, including all-letters vs mixed
  (`-5` is positional).
- Long flags, `--name=value`, and `--` stop-options.
- Pipe boundary tokenization.
- Pipe NYI throw.
- Verb token rules (case-insensitive, `-` rejected).
- Empty/whitespace-only input.
- `RawToken` classification correctness for every shape.

### 10.2 Round-trip property tests

Add `fast-check` as a dev dependency. Property:

- For random valid `ParsedCommand` (verb + arbitrary tokens),
  `parse(format(x))` round-trips.
- For random valid text input, `format(parse(t))` is a
  canonical-form text whose re-parse equals `parse(t)`.
- Greedy-arg whitespace preservation under round-trip.

### 10.3 Matching-layer tests

Cover:

- Lexical scope acceptance: options declared at verb level rejected
  after the subcommand and vice versa, while resolved values land in
  the unified `model.fields` regardless of where they appeared.
- `field`-name collision detection at YAML load time.
- Multi-opts (`multiple: true`) accumulation.
- `multiple: false` repeated → error.
- Boolean-with-value → error.
- Value-bearing without value → error.
- Mixed flag stack with value-bearing tail.
- Unknown option at either tier → error.
- Greedy field whitespace and quote-as-literal.
- Empty subcommand path.

### 10.4 Structured-form ingress tests

- Round-trip parity: same `verb`/options/fields produce the same
  `CommandModel` whether ingressed as text or structured.
- Object-typed fields run MQL in both paths.
- Type mismatches (string field given an object) → hard error.

### 10.5 Recency / chain-of-responsibility tests

- Three controllers for the same verb across self / inventory /
  environment; verify dispatch order is environment → inventory →
  self by recency-stack push order.
- `pass: true` cascades to next match; final unhandled returns
  "Unknown command".
- A controller returning `pass: true` does not fire Scenes (assert
  via spy on `MessageApi.scene`).
- Within-self most-derived-first ordering.

### 10.6 Schema-delivery tests

- Avatar attach emits `commands.reset` with the expected verb set.
- `addContainable` of a thing with a `commandProvider` emits
  `commands.added`.
- `removeContainable` emits `commands.removed`.
- `setEnvironment` triggers correct add/remove deltas.

### 10.7 Migration tests

- Each existing command (`look`, `get`, `drop`, `inventory`,
  `player`, `help`, `ping`, `say`, `tell`, `go`, `open`, `close`,
  `var`, `settings`) runs its existing happy-path through the new
  pipeline unchanged.

---

## 11 · YAML schema migration checklist

Existing YAML files that need touching for the new shape:

- None in this pass *strictly require* changes — none of them
  declare options today. The `options:` block is additive.
- Optional cleanup as we go: where a controller currently parses
  ad-hoc flags out of `fields`, lift them into a real `options:`
  block. This is per-controller and not blocking.

`CommandDefinition` (`mud/api/command.ts`) gets new shape:

- `options?: Record<string, OptionDef>` at the top level.
- `subcommands[name].options?: Record<string, OptionDef>`.
- `OptionDef` matches §3.1.
- Load-time invariant (matches §3.3): across the entire command —
  positional fields of every syntax pattern + verb-scoped options +
  every subcommand's options + that subcommand's positional fields
  — no two declarations share a `field` name unless they're in
  mutually-exclusive syntax patterns or subcommands.

---

## 12 · Breaking changes

These are deliberate, in-pass breakages we're absorbing:

1. **Single-quote semantics** — `'…'` no longer quotes. No callers
   relied on this; the existing tests will need an update sweep.
2. **Controller signature** — `(input, ctx)` → `(model, ctx)`. Six
   controllers to update.
3. **Discovery dedup** — replaced with ordered match list +
   chain-of-responsibility. Controllers that today rely on "I'm
   the only handler" assumption need to be reviewed (probably
   none in practice today, but worth a sweep).
4. **`CommandResult.pass`** — additive but semantically
   load-bearing.
5. **Greedy-arg whitespace preservation** — current callers join on
   single spaces; `say` and similar will start preserving the
   exact input. Behaviour-improving, not behaviour-breaking, but
   tests asserting collapsed whitespace need updating.

---

## 13 · Open questions for the build phase

These should not block planning but the planning agent should flag
them as decisions to confirm during implementation:

Truly open:

- **Controller migration ordering**: do all six controllers in one
  PR, or split (parser/matcher first, controllers second)? Either
  works; recommend single PR since the signature change is
  mechanical and avoids a transitional "both shapes work" period.
- **Schema-push wire shape** — `system.commands.{added,removed,reset}`
  is a proposal; the topic conventions in `messaging.md` get the
  final say on topic naming.

Decisions already made (listed for the planning agent's reference):

- **`CommandApi` houses the matcher.** The new `assemble()` and
  `assembleFromStructured()` methods land alongside the existing
  loader/cache/router on `CommandApi`. The deferred loader/router
  split flagged in `commands.md` stays deferred.
- **`fast-check` as a dev-dep** — pre-approved.
- **Within-source mixin ordering for verb-collision** — most-derived
  first (concrete class → mixin nearest in derivation chain → mixin
  furthest). Implementation should verify against `MixinApi`'s
  composition representation.

---

## 14 · Cross-references

- `docs/subsystems/commands.md` — the current subsystem doc; this
  requirements doc supersedes its parsing/options/dispatch sections
  pending the build, then gets folded back in.
- `docs/subsystems/messaging.md` — `MudlogApi` topics, frame
  delivery; the schema-push topics live in this scheme.
- `docs/subsystems/call-security.md` — command-frame attribution;
  unchanged by this work.
- `docs/subsystems/hot-reload.md` — controller dispatch via
  `StuffApi.clone`; unchanged by this work.
