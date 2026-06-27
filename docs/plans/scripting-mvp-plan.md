# Scripting Language (v1 Engine) — Implementation Plan

> Plan for `docs/requirements/scripting-mvp-requirements.md`. Branch
> `feature/scripting-mvp-build` (off master). Produced 2026-06-27.
> Phase 1 (requirements) is closed; this is the Plan-phase artifact —
> implementation has not started.

## Orientation: what the codebase already gives us

Verified seams (confirmed in code, not just docs):

- **`lib/script/`** exists today holding only `EvalScript.ts` (the
  contrasting `vm`-sandboxed TS surface). The interpreter is a
  **distinct** tenant of this same directory — good: it physically
  encodes the "shares the philosophy of isolation, not the runtime"
  relationship.
- **The pluggable-parser seam is real and clean.** `resolveActorParser`
  (`CommandGiver.ts:187`) reads `ShellApi.resolveSetting('shell.parser')`,
  defaulting to `'msh'`; `CommandApi.resolveParser` resolves a bare name
  to `lib/command/parsers/<name>.ts`'s default export. A `Parser` is
  `(text, ctx) → ParseResult` where `ParseResult` is exactly-one-of
  `{ parsed | bound | error }`.
- **The `{bound}` path is live** (`CommandGiver.ts:579-619`): given
  `{command: CommandDefinition, model: ModelData}` it runs `resolveModel`
  → `preloadValidatorDeps` → `runValidators` → `_executeOne`, skipping
  tokenize/match/assemble but keeping resolve+validate+execute. **This is
  the interpreter's dispatch primitive, already built.**
- **The tokenizer** (`CommandLineLogic.ts`) is two-stage: `lex()`
  (whitespace/`|` boundaries, `"..."` quoting, escapes) → `splitOnPipe()`
  → `classify()`. It already builds a `ParsedPipeline` (multi-command
  throws NYI at line 324). `format()` exists for round-trip. Emote-prefix
  `;`/`:` detection lives in `msh.ts`, not the lexer.
- **MQL owns `( ) { } $ : .`** with a recursive-descent parser; the
  public entry is `MqlApi.resolveOne/resolveMany(query, ctx)`. MQL already
  lexes `lparen/rparen/lbrace/rbrace` and infix `eq/neq/gt/lt/gte/lte`
  inside filter expressions.
- **`ShellApi.expandVariables(text, giver)`** resolves `$name`/`${name}`
  including synthetic `$focus` — the namespace script `$` must extend.
- **`ScheduleApi`** (`api/schedule.ts`) wraps callbacks in
  `ExecutionContextApi` and re-plants `causingCommandId`;
  `schedule(delayMs, fn)` / `recurring` / `cancel` return cancellable
  handles. (Currently Node-timer-backed with game-time scheduling flagged
  "layer on top" — see Risk 2.)
- **`EngagedMixin`** (`lib/activity/Engaged.ts`) carries a runtime
  `Map<EngagementSlot, Engagement>` (slots `body|hands|attention|voice`),
  an `AbortReasonRegistry` augmentation interface in `@saxonberg/types`,
  and read/`_setEngagement`/`_clearEngagement` methods. **No v1 producer
  registers engagements** — the requirements' "first consumer" claim is
  verified.
- **Crafting**: `CraftingApi.craft(CraftRequest{recipeRef, makerMode,
  brand})` → `CraftOutcome`; `lib/craft/` holds `Grade`, `Crafted`
  (`stamp`/`renderVerdict`), `Graded`, `Maker`, `Tooled`, `ToolItem`,
  `Recipe`. `Recipe extends Document` (`collectionName='recipes'`) — the
  "Document not template" precedent the script store reuses.
- **CMS**: `CmsBackend = 'content' | 'source'`
  (`packages/types/src/index.ts:1640`); `CmsLogic` dispatches per-backend
  with a save→go-live split (`source → HotReloadApi.reload`, `content →
  restoreFromTemplate`). A third backend means extending this union and
  the dispatch.
- **Chronicle**: `ChronicleApi.recordOnce(owner, key, fields)`
  (category-first singularity) + `recordDeed` — exactly the claim/deed
  primitives the ladder needs.
- **Zone/Access/Provenance**: `ZoneApi.resolveZoneForPath`,
  `AccessApi.can/canMutateZone`, `ProvenanceApi.recordAuthoring` keyed on
  `path` — the path-addressed ownership stack, ready to reuse.

## Critical-path / phase ordering (the dependency spine)

The slate's stated follow-on order is **blocks → values → `( )` → scope →
execution model → coroutines**. Mapped onto deliverables:

```
P0 Module skeleton + value model + AST types        (no behavior; unblocks all)
P1 Tokenizer extension + recursive-descent parser    (depends P0 AST)
P2 Interpreter core: tree-walk + {bound} dispatch     (depends P1; the keystone)
   + scope/frames + block value + $ + ( ) island
P3 Control flow as commands: if/each/def/while         (depends P2 block keystone)
P4 Manual-build crafting verbs as engaged activities   (parallelizable w/ P2-P3;
   (Activity's first consumer)                          depends only on crafting+Engaged)
P5 Coroutine substrate: wait/every/when + await-engaged (depends P2 + P4)
   + cancellation/AbortReason
P6 Two player surfaces: prompt-as-interpreter + named   (depends P2/P3)
   scripts (def + recipe-script content)
P7 Path-addressed script store + CMS third backend      (depends P6 named scripts;
   + go-live                                             parallelizable w/ P5)
P8 Demonstration capture + format() round-trip          (depends P4 + P6 + P7)
P9 Chronicle knowledge ladder (claim/deed/can-make)     (depends P4 + P8)
P10 Demo content + subsystem doc                         (depends all)
```

**The true critical path is P0→P1→P2→P3→P6, with P4→P5 and P7 hanging
off it.** P2 (the interpreter keystone) is the highest-risk,
highest-value node; everything narrative (P8/P9) is cheap once P4/P6/P7
land.

## Phase 0 — Module skeleton, value model, AST types

**Goal.** Stand up `lib/script/` with the value model, AST node types,
and the scope/frame value-objects — pure data and value-objects, no
behavior. Establish the `api/script.ts` + `obj/api/ScriptLogic.ts`
forwarding pair as a stub. This unblocks every other phase and lets the
module-category audit happen first.

**Files to create** (all `lib/script/`, **Named value-object /
vocabulary** category):
- `lib/script/Value.ts` — the uniform value model: a `ScriptValue` union
  (`string | number | boolean | Stuff | StuffList | Block | void`) +
  truthiness helper (`isTruthy`, with **MQL-set-emptiness-as-falsiness**
  centralized here). One value notion shared by `set`/`$`/`( )`/
  block-yield — the piping-forward-compat commitment #2.
- `lib/script/ast.ts` (lowercase — a vocabulary/type module) — the AST
  node types: `Script`, `Pipeline` (one-or-more `Command`, the
  pipe-shaped node), `Command`, and `Arg` union (`Literal | VarRef | Expr
  | Block | ObjectRef`). The `Pipeline` node is mandatory even in v1
  (forward-compat commitment #1).
- `lib/script/Block.ts` — the **block keystone** value-object: a parsed
  body (`Script` AST fragment) + a captured `Scope` reference. Inert;
  carries no execution logic itself (the interpreter invokes it). Methods
  only (proxy-receiver rule): `getBody()`, `getCapturedScope()`.
- `lib/script/Scope.ts` — the lexical `Scope`/`Frame`: a
  `Map<string,ScriptValue>` + a lexical-parent link; `get` walks parents,
  `set` writes to the nearest binding or current frame, `define` creates a
  new binding (param/`set` semantics). Inter-Stuff access via methods.
- `lib/script/AbortReason.ts` — the `AbortReason` vocabulary value-object
  (`'barge-in' | 'host-destroyed' | 'step-declined' | 'resource-limit' |
  'cancelled'`), registering the script-specific reasons into the
  existing `AbortReasonRegistry` augmentation (reuse, don't fork the
  engagement abort vocabulary).
- `api/script.ts` (**Api**) — `ScriptApi`: thin gated forwarding shell.
  Surface stubs: `run(text)`, `define(name, source)`, `cancel(handle)`,
  `invoke(name, args)`. **Acting principal derived from
  `ExecutionContextApi`, never a parameter.** Ends with
  `SecurityApi.decorateApiClass`.
- `obj/api/ScriptLogic.ts` (**Api logic singleton**) — `ScriptLogic
  extends Idea`, `@internal`, methods gated
  `FromModule('mud/api/script#ScriptApi')`, HMR-able at `/obj/api/script`.

**Module-category audit (the requirement's explicit ask).** Every
artifact maps to an existing category — interpreter/AST/value-objects →
**Named value-object** in `lib/script/`; parser impl → **Parser**
convention in `lib/command/parsers/` (`msh.ts` precedent); `ScriptApi` →
**Api**; `ScriptLogic` → **Api logic singleton**; script store → a
**`Document` subclass** (`Recipe` precedent) in `lib/script/`;
control-flow builtins → command-shaped (see P3); recipe-scripts + the
coroutine demo → **authored content** (`domain/`). **Nothing requires a
new category.** The one thing to flag-and-fold: the script
store/collection could tempt a `lib/store/` invention — fold it into
`lib/script/` as a `ScriptDocument extends Document` (the `recipes`
precedent).

**Tests.** Value truthiness (incl. empty-MQL-set falsiness); Scope
get/set/define + lexical-parent walk + shadowing; Block construction
holds body+scope; AbortReason registry augmentation compiles.

## Phase 1 — Tokenizer extension + recursive-descent parser

**Goal.** A `lib/command/parsers/script.ts` parser that tokenizes the
command-native grammar and produces the `Script` AST, honoring the
metacharacter-reconciliation constraint. Plugs into the pluggable-parser
seam.

**Files.**
- **Modify** `obj/api/CommandLineLogic.ts` + `api/command-line.ts` —
  extend the **lexeme stage** (not a flat re-tokenize) with the
  genuinely-new lexical work: **statement separators** (`;`/newline at top
  level), **standalone `{ }` blocks** (whitespace-delimited, distinct from
  MQL's `:{N unit}` glued-after-`:` quantity body — disambiguate by
  attachment, never by guessing), and **balanced-bracket slicing** for
  `( )` and `{ }`. Add lexeme kinds for `sep`, `block-open`/`block-close`,
  `paren-region`. Keep `|` producing the existing pipe marker. `format()`
  extended to round-trip blocks/`$`/`( )`/separators (load-bearing for P8).
- **Create** `lib/command/parsers/script.ts` — the recursive-descent
  `Parser`. Grammar (from the slate, verbatim):
  ```
  script   := pipeline ( sep pipeline )*
  pipeline := command ( "|" command )*          # v1 executes single-command only
  command  := word arg*
  arg      := literal | "$" name | "(" expr ")" | "{" block "}" | objectref
  ```
  - **Decision (replace vs wrap msh):** the script parser **wraps** msh.
    For a single bare command with no script metacharacters, it delegates
    to msh and returns msh's `{parsed}` unchanged (backward-compat
    guaranteed mechanically). For multi-statement / block / `$` / `( )`
    input, it parses to a `Script` AST and returns a new result variant.
  - **Extend `ParseResult`** with a `script?: { ast: Script }` arm
    (additive to `{parsed|bound|error}`). `CommandGiver.executeCommand`
    gains a fourth branch routing `script` to `ScriptApi.runAst`. Bare-
    command path stays byte-identical; all interpreter entry isolated to
    one new branch.
  - **Emote sigil**: reuse msh's `detectEmotePrefix`/`stripEmotePrefix` at
    **line-start of the first statement only** (`;smile`/`:smile`),
    preserved exactly. Top-level `;` between statements is a separator; a
    literal `;` inside a greedy free-text field must be quoted (the
    deliberate bash-rule change).
  - **`( )` delegates to MQL**: slice the balanced paren region, store as
    an `Expr` AST node holding the **raw inner text** — do *not*
    re-tokenize. Evaluation (P2) hands that text to MQL/infix.
  - **`{ }`**: a standalone block region becomes a `Block` AST node
    holding the inner **token stream re-parsed as a `Script` fragment**
    (parsed once — the anti-Tcl keystone; never a re-scanned string).
  - **`$`**: `$name` becomes a `VarRef` AST node; substitution timing is
    per-frame at eval (P2), reconciled with the legacy bind-time pre-pass.

**Tests.** Tokenizer: blocks, `$`, `( )`, separators, nesting,
multi-line, `:{N unit}`-vs-`{block}` disambiguation, emote-prefix
preservation, `|`-still-reserved. Parser AST: each production; `pipeline`
node built for single commands; round-trip `parse(format(parse(t))) ===
parse(t)` including blocks/`$`/`( )`. Backward-compat: a corpus of
existing single-command inputs parse identically through the msh-delegation
path.

## Phase 2 — Interpreter core (the keystone)

**Goal.** A tree-walking interpreter that executes a `Script` by
dispatching each command over the bus via the `{bound}` path; manages
lexical scope/frames; realizes the block-as-value keystone, `$`
substitution, and the `( )` MQL+infix island; enforces resource limits.

**Files.**
- **Create** `lib/script/Interpreter.ts` — the tree-walk engine. Core
  loop: walk `Script` → for each `Pipeline` → execute its single
  `Command` (v1) → produce a `ScriptValue`. Command execution:
  1. Resolve the verb's `CommandDefinition` from the actor's available
     commands — **re-resolved each run** (HMR/edit-to-live).
  2. Evaluate each `Arg` to a `ScriptValue` in the current `Scope` (`$` →
     scope lookup falling through to `ShellApi.expandVariables`; `( )` →
     MQL/infix island; literal → string/number; block → a `Block` value
     capturing the current scope).
  3. **Bind evaluated values into a `ModelData`** via the *general*
     bind-value-into-field mechanism (forward-compat commitment #3 — built
     generally, not replay-specific, so piping reuses it). One binding
     seam.
  4. Hand `{command, model}` to the dispatcher's `{bound}` path so the
     command is **gated, attributed, scope-re-checked** identically to
     typed input.
  5. The pipeline yields the command's value (void in v1 — the command
     value channel is deferred whole with piping).
- **Create** `lib/script/expression.ts` — the `( )` island evaluator.
  Hands the raw inner text to MQL (`MqlApi.resolveMany`) for predicate/set
  queries, and evaluates **infix comparison/logic** (`<`, `>`, `==`,
  `and`, `or`, `not`) over MQL results / scalars. An MQL set's
  **emptiness reads as falsiness** (centralized in `Value.isTruthy`).
  Minimal operator set, real seam.
- **Modify** `obj/api/ScriptLogic.ts` — `runAst(ast)` / `invoke(...)`
  derive the acting actor from `ExecutionContextApi`, construct a root
  `Scope`, run the `Interpreter`. **Resource governance** (see requirements
  *Resource governance*): (1) the **preemption slice** — yield every K steps
  and reschedule on next tick so a no-yield loop can't freeze the
  single-threaded event loop (the same generator-yield as coroutines — this
  is *why* the interpreter is generator/explicit-stack, decided here in P2);
  (2) the **tiered total ceiling** — steps + dispatch-count + recursion
  depth, tiered by *authorship* (player-home/inline = tight, `/obj/`+
  `/domain/` = large), exceed → typed `AbortReason.resource-limit` +
  diegetic message, partial effects stand. (3) **coroutine guards** (cadence
  floor, per-actor concurrent-script cap — wired in P5). All numbers are
  `AppSettings` keys. Tests: a no-yield loop interleaves with another
  actor's commands (not frozen) + tier-specific ceilings + graceful abort.
- **Modify** `lib/command/CommandGiver.ts` — add the `parseResult.script`
  dispatch branch.

**Key design decisions.**
- **`$` substitution timing: frame-first, shell-fallback.** Script `$x`
  resolves the lexical frame first, then delegates the miss to
  `ShellApi.expandVariables` (synthetic/legacy vars) — extends the
  namespace, doesn't fork it, doesn't break the legacy bind-time pre-pass.
- **The block invokes in a child scope** whose lexical parent is the
  block's captured scope (closure). A block yields its last command's
  value (so `if` works in value position). Invoking a block **may suspend**
  (P5) — block invocation is the suspension-capable unit.
- **`set`/`$` ship with the block keystone.**

**Tests.** Dispatch-over-bus (scripted command → same envelope as typed);
scope/closure capture; the block keystone (block-as-value, last-value
yield, child-scope invocation); `( )` MQL + infix + emptiness-truthiness;
`$` substitution (frame-first, shell-fallback); resource limits → typed
abort not hang; the safety AC (scripted command targeting an unreachable
object declines at resolve exactly as typed).

## Phase 3 — Control flow as commands (if / each / def / while)

**Goal.** `if`/`else`, `each`, `def`, `while` as block-taking commands
(not grammar). At minimum `if`/`each`/`def` ship; `while` is cheap.

**Files.**
- **Create** `lib/script/builtins.ts` (lowercase — the scripting builtins
  set). Each builtin a command-shaped handler the interpreter recognizes:
  `if (cond) {block} [else {block}]`, `each (set) {block}` (binds MQL
  pronoun `it` per item), `while (cond) {block}`, `def name (params)
  {block}`, `set name (expr)`, plus the P5 temporal builtins.

**Decision (builtins YAML or interpreter-intrinsic): interpreter-
intrinsic, not bus-dispatched YAML verbs.** Control flow needs
*unevaluated* block args and *lazy* condition evaluation — the standard
dispatch path eagerly resolves args. So `if`/`each`/`while`/`def`/`set`/
`wait`/`every`/`when` are recognized by the interpreter and handled with
raw AST args. Syntactically still `word arg*` ("everything is a
command"); the interpreter owns their evaluation. All *other* verbs go
over the bus. The grammar is still the boundary: the builtin set is fixed
and small; growing the language = adding affordance verbs (over the bus)
or, rarely, a new intrinsic builtin (authored, out-of-band).

**Decision (`def` params): simple named positional params** `def name
($p1 $p2) {block}`. On invocation a child scope `define`s each param from
the call's positional args. No `it`-implicit for `def`; no rest/defaults
(advanced block surface deferred). `def` registers the name as an
invocable command in the actor's session command set.

**Tests.** `if` conditional; `each` per-item with `it`; empty MQL set →
`if` false / `each` zero iterations; block yields last value usable in
`set x (...)`; `def` defines an invocable command, params bind, shadowing
works; `while` loops and respects the step limit.

## Phase 4 — Manual-build crafting verbs as engaged activities

**Goal.** Thin, honest verbs — `pour <spirit> into <vessel>`, `add`,
`stir`/`shake`, `strain into <glass>`, `garnish <glass> with <x>` — that
move real matter (conservation) and whose terminal step produces a graded,
maker's-marked drink reusing `Grade` + `CraftedMixin.stamp`. **Each is an
engaged activity** (game-time duration, claims an engagement slot,
completes via scheduler) — the first real consumer of `EngagedMixin`.

**Files.**
- **Create** `mud/cmd/crafting/{pour,add,stir,shake,strain,garnish}.yaml`
  (**Command YAML**, extending the crafting category). Reuse the field-type
  system (`object` for vessel/spirit, scope-checked at resolve).
- **Create** matching `obj/command/crafting/*Controller.ts` (**Controller**).
  Each: resolve inputs, **claim an engagement slot** (`hands`/`body`),
  schedule completion on `ScheduleApi` after the verb's duration, move
  matter via `BulkApi` (pours drain; conservation asserted), and on the
  terminal step accumulate toward a graded output.
- **Create** `lib/craft/ManualBuild.ts` (or fold into `lib/craft/`) — the
  **intermediate-vessel-as-buffer** state: the shaker/glass accumulates
  inputs across steps; the terminal step calls `CraftingApi.craft` (or the
  shared `craftImpl` seam) to mint the stamped, graded drink reusing the
  *one* quality model. No parallel grading path.
- **Modify** `lib/activity/Engaged.ts` — add a small **activity-with-
  completion** helper (`{slot, durationMs, onComplete, onAbort}` →
  schedules on `ScheduleApi`, sets the slot, clears + fires callbacks on
  completion or abort). Built **general** (not crafting-specific) so the
  script coroutine (P5) consumes the same signal `wait` does.

**Tests.** Each verb claims/releases an engagement slot; matter
conservation across a full build (bottle drains by the poured measure;
mass conserved through strain); terminal step produces a graded, stamped
drink via the existing model; instant-vs-timed verb distinction; abort
mid-step leaves partial matter standing.

## Phase 5 — Coroutine substrate (wait / every / when + await-engaged + cancellation)

**Goal.** `wait <dur>`, `every <dur> {block}`, `when (cond) {block}`
suspend the script and resume on `ScheduleApi`; **the sequential-
completion rule** — a dispatched verb that engages a timed activity
suspends the script until completion (same substrate, activity-completion
trigger); cancellation with typed `AbortReason`.

**Files.**
- **Create** `lib/script/Coroutine.ts` — the suspension/continuation state
  machine. Holds the interpreter's continuation across scheduler frames:
  AST position, scope chain, step budget. A suspended script is a
  **detached background coroutine** (prompt stays live). `suspendUntil(
  signal)`, `resume()`, `cancel(reason)`.
- **Modify** `lib/script/Interpreter.ts` — make the tree-walk
  **resumable**: command execution returns either a value or a
  *suspension request*. Temporal builtins and the **await-engaged rule**
  both produce suspension requests:
  - `wait <dur>` → suspend until a one-shot `ScheduleApi.schedule(durMs)`
    fires (the degenerate timer case).
  - `every <dur> {block}` → `ScheduleApi.recurring`; each fire runs the
    block in a child scope.
  - `when (cond) {block}` → observe until cond truthy, then run block.
  - **await-engaged**: when a dispatched verb (P4) engages a timed
    activity, suspend until the activity-completion signal, then resume
    with the next statement.
- **Modify** `lib/script/builtins.ts` — wire the temporal builtins.
- **Modify** `obj/api/ScriptLogic.ts` / `api/script.ts` — `cancel(handle,
  reason)`; a barge-in mid-step aborts the activity, which propagates to
  the script's await as the cancellation (partial matter stands, no
  rollback).

**Key design decisions.** In-memory only (suspended script dies on
restart — durable continuations deferred). `ScheduleApi`, never bare
timers. The await-engaged rule unifies pacing (output trickles
step-by-step).

**Tests** (on a **mock clock**): `wait` suspends/resumes without blocking
the prompt; `every` fires on cadence; `when` on condition; cancellable
with typed `AbortReason`, already-dispatched effects stand; paced
execution (martini doesn't dump — each engaged step completes before the
next; barge-in aborts → script stops mid-recipe, partial matter standing).

## Phase 6 — Two player surfaces (prompt-as-interpreter + named scripts)

**Goal.** (1) The prompt interprets the language — multi-statement script
text typed inline runs through the interpreter, a bare command unchanged.
(2) Named scripts — `def` (session) + authored recipe-script content bind
a command invocable like any verb.

**Files.**
- **Modify** `lib/command/CommandGiver.ts` — flip the **default parser**
  so the prompt is the interpreter. **Decision:** make `script` the new
  default `shell.parser` (add `'script'` to `enumValues`, default to it).
  The script parser delegates bare commands straight to msh, so the
  backward-compat AC is met mechanically; multi-statement/block/`$` input
  lights up. `'msh'` stays selectable as fallback.
- **Modify** `obj/api/ScriptLogic.ts` — `define(name, source)` registers a
  session-scoped invocable command; `invoke(name, boundArgs)` runs the
  named script's block in a fresh frame.
- **Named-script-as-command binding**: a `def`'d name and a loaded
  recipe-script both surface as a `CommandDefinition`-shaped invocable so
  `make martini with Vionne` dispatches like any verb. **Decision:**
  session `def` lives in-memory on the actor's command set; authored
  recipe-scripts are **path-resolved source, re-resolved per invocation**
  (the brain/recipe HMR grain), loaded from the P7 store.

**Tests.** Inline multi-statement script runs as gated, attributed
dispatches; a bare single command behaves exactly as before (the corpus);
`def martini ($brand) {…}` defines an invocable command; `make martini
with Vionne` binds the param and runs; the pour draws from the matching
reachable bottle (resolve scope-checks); produced drink graded+stamped;
bottles drain.

## Phase 7 — Path-addressed script store + CMS third backend + go-live

**Goal.** Saved scripts persist path-addressed keyed path+owner;
resolve+hot-reload by path; browsable/editable as a **third CMS backend**
with edit-goes-live re-resolve; ownership routes through zone/access/
provenance.

**Files.**
- **Create** `lib/script/ScriptDocument.ts` — `ScriptDocument extends
  Document`, `collectionName = 'scripts'` (the `Recipe` precedent —
  Document, *not* `domain`, *not* git source). **Decision (text vs AST):**
  **store the source text** (canonical, human-editable, what Monaco shows
  as plain text), re-parsed on resolution; round-trips via `format()`; the
  interpreter reads source directly (no compilation — why scripts reach
  the runtime-writable tree first). Keyed on **`path` + `owner`** with
  owner/scope in the path (`/home/<player>/scripts/<name>`,
  `/domain/<world>/scripts/<name>`, `/obj/lounge/recipes/<name>`).
- **Modify** `obj/api/ScriptLogic.ts` — resolve-by-path with a path cache;
  `goLive(path)` invalidates the cache (the `HotReloadApi.reload` analog).
  Mutation gated through `AccessApi.canMutateZone` on
  `ZoneApi.resolveZoneForPath`; authorship via
  `ProvenanceApi.recordAuthoring` on the `path`. Reuse the whole stack —
  no parallel permission/authorship model.
- **Modify** `packages/types/src/index.ts` — extend `CmsBackend` to
  `'content' | 'source' | 'script'`.
- **Modify** `obj/api/CmsLogic.ts` — add the `'script'` backend dispatch
  arm to `listTree`/`read`/`stat`/`write`; **save→go-live** calls
  `ScriptLogic.goLive(path)` (the third per-backend go-live step). CMS
  gating stays the existing **dev-tier mirror of `WriteController`** (per-
  player home access scoping deferred).

**Tests.** A saved script persists keyed on its path; resolve+invoke by
path; editing (CMS tree or re-record) and re-invoking reflects the change
without restart; mutation gated through `AccessApi`; authorship recorded
via provenance; a CMS edit goes live on save.

## Phase 8 — Demonstration capture (the third authoring source)

**Goal.** Performing a manual build transcribes the dispatched commands
into a named, parameterized script *in the language* — real source via
`format()` round-trip, the brand lifted to the one `$param` — replayable,
inspectable, editable.

**Files.**
- **Create** `lib/script/Transcriber.ts` — observes the actor's
  dispatched manual-build commands over the capture boundary, serializes
  them to language source via `format()`, wraps in `def <name> ($brand) {
  … }`, and banks a `ScriptDocument` at the owner's path.
- **Modify** the P4 controllers (or a `CommandDispatchedEvent` tap) to
  feed the transcriber the dispatched commands.

**Decision (capture boundary): vessel-as-buffer.** The manual build
already accumulates into an intermediate vessel (the shaker/glass) across
steps (P4's `ManualBuild` buffer). The set of commands that touched
*that vessel* from first pour to terminal `strain`/`garnish` is exactly
"the martini" — a physically-grounded, diegetic boundary needing no extra
player gesture or arbitrary time window. The terminal step closes the
capture. The **brand lift**: the single brand-bearing input becomes the
`$brand` param; everything else concrete.

**Tests.** A manual build transcribes into a named, parameterized script
in the language; emitted source round-trips (re-parses to an equivalent
AST); `make <name>` replays as ordinary gated dispatch (re-resolved per
run); brand lifted to `$brand`; opening+editing then re-running reflects
the edit.

## Phase 9 — Chronicle knowledge ladder (claim / deed / can-make)

**Goal.** A three-state per-character gate (*unknown* → *known-of* →
*can-make*) wired to chronicle; `make <recipe>` gated on *can-make*.

**Files.**
- **Modify** the recipe-source-reading path (a readable recipe card/book
  `Thing` or the Menu) — on read, `ChronicleApi.recordOnce(actor,
  recipeKey, {kind:'claim'})` and add to the *known-of* set.
- **Modify** the P8 terminal-build path — on the **first faithful manual
  build** (inputs satisfy the recipe), `ChronicleApi.recordDeed(...)`,
  **transcribe+bank the personal recipe-script** (P8), add to *can-make*.
  Deed and script minted by the **same act**.
- **Create** `lib/script/RecipeKnowledge.ts` (or fold into `ScriptLogic`)
  — the per-character *known-of*/*can-make* sets (derive-on-read from the
  chronicle ledger, the renown precedent). `make <recipe>` gated on
  *can-make*: an off-spec build yields *a* drink but mints no deed, banks
  no script.

**Key design decisions.** `recordOnce` for both claim and deed
(singularity). Gate is on the recipe-learning loop only, not scripts in
general. `RecipeCatalogue` stays openly resolvable; the per-character
sets are the new personal layer.

**Tests.** Reading a recipe source mints a claim + marks known-of (second
read doesn't duplicate); first faithful build mints a deed, banks the
personal script, marks can-make; `make` declines for a not-yet-can-make
recipe; off-spec build yields a drink but no deed/no script.

## Phase 10 — Demo content + subsystem doc

**Goal.** Authored content proving the engine over general substrate (no
bar-specific engine classes), and the subsystem doc.

**Files.**
- **Create** `domain/lounge/scripts/` (or `/obj/lounge/recipes/`) — a
  parameterized `martini ($brand)` recipe-script + at least one more
  cocktail; a minimal `wait`/`every` coroutine script (a closing-time/
  shift beat — the slate's shift-change exemplar); inline prompt usage
  examples. All authored content, no bar-specific engine classes.
- **Create** `docs/subsystems/scripting.md` — grammar, tokenizer/parser,
  interpreter + execution model, block keystone + scope, the `( )`
  island, coroutine model + cancellation, the two player surfaces,
  resource isolation, and the relationship to `EvalScript` and the
  command pipeline.

**Tests.** End-to-end: the martini recipe-script runs paced; the
coroutine demo suspends/resumes on a mock clock; inline prompt usage.

## The biggest architectural risks

1. **Resumable tree-walk across scheduler frames (P5) is the hardest
   engineering problem.** A naive recursive `walk()` cannot suspend
   mid-recursion without either CPS-transforming the interpreter or
   running it as a generator/explicit-stack state machine. **Mitigation:**
   build the interpreter as an **explicit-stack / generator-based**
   evaluator from P2 (not recursive `await`), so suspension is "stop
   advancing the stack, persist the position." Retrofitting suspension
   onto a recursive interpreter in P5 would be a rewrite. *This decision
   must be made in P2, not deferred.*
2. **`ScheduleApi` is still Node-timer-backed; the requirements demand
   game-clock suspension.** `schedule.ts` flags game-time scheduling as
   "layer on top." **Mitigation:** confirm whether WorldClock/game-time
   scheduling has landed; if not, P5 drives the mock-clock seam the tests
   use and wires game-time as a thin adapter, or scopes `wait <dur>` to
   real-time `ScheduleApi` with a game-time TODO. Flag early — it gates
   the coroutine AC.
3. **Backward-compatibility of upgrading the default parser (P6).** Making
   `script` the default `shell.parser` touches every player's prompt.
   **Mitigation:** the wrap-not-replace decision makes the bare-command
   path *literally msh*; back this with a regression corpus (P1 test)
   asserting byte-identical parse, and keep `'msh'` selectable.
4. **The `( )` island's infix layer is new parsing surface inside MQL's
   territory.** **Mitigation:** keep the operator set genuinely minimal
   (comparison + and/or/not + emptiness), route set-queries to MQL
   unchanged. Don't build a precedence parser.
5. **Metacharacter disambiguation `:{}`-vs-`{}` (P1).** Getting "glued-
   after-`:` is MQL quantity, standalone is a block" wrong silently
   corrupts either quantities or blocks. **Mitigation:** disambiguate
   strictly by attachment (preceding char), never by content-guessing;
   test both forms adjacent.

## Planner's-call decisions — with recommendations

| Decision | Recommendation |
|---|---|
| **Demonstration capture boundary** | **Vessel-as-buffer** (P8). The intermediate vessel is the diegetic, physically-grounded boundary; the terminal step closes capture; no extra player gesture. |
| **Script-store schema: text vs AST** | **Source text** (P7). Human-editable, what Monaco shows, round-trips via `format()`, no compilation. Re-parsed on resolve. |
| **`def` param mechanics** | **Simple named positional params** `def name ($p) {block}` (P3). No `it`-implicit for `def`, no rest/defaults. |
| **Script parser replaces or wraps msh** | **Wraps** (P1/P6). Bare commands delegate to msh; multi-statement/block/`$`/`( )` parse to AST via a new `ParseResult.script` arm. `script` becomes the default `shell.parser`; `msh` stays selectable. |
| **Builtins: YAML bus-verbs or interpreter-intrinsic** | **Interpreter-intrinsic** (P3) — control flow needs lazy/unevaluated args. Syntactically still commands; the interpreter owns their evaluation. |
| **`$` substitution timing** | **Frame-first, shell-fallback** (P2). Script `$x` resolves the frame first, then delegates the miss to `ShellApi.expandVariables`. |
| **Named-script storage** | **Path-resolved source, re-resolved per invocation** for authored recipe-scripts; in-memory session command set for `def` (P6). |
| **Activity-completion signal home** | **General helper in `lib/activity/Engaged.ts`** (P4), built non-crafting-specific so the script coroutine consumes the same signal `wait` does. |

## Critical files for implementation

- `packages/server/src/mud/obj/api/CommandLineLogic.ts` (tokenizer
  extension: separators, standalone blocks, balanced-bracket slicing,
  `format()` round-trip)
- `packages/server/src/mud/lib/command/CommandGiver.ts` (the `{bound}`
  path at lines 579-619 is the interpreter's dispatch primitive; new
  `parseResult.script` branch; default-parser flip)
- `packages/server/src/mud/api/command.ts` (the `Parser`/`ParseResult`
  contract to extend with the `script` arm; the general
  bind-value-into-field seam)
- `packages/server/src/mud/lib/activity/Engaged.ts` (`EngagedMixin` +
  `AbortReasonRegistry`; the activity-completion signal P5 awaits)
- `packages/server/src/mud/obj/api/CmsLogic.ts` (the per-backend dispatch
  + save→go-live split to extend with the `'script'` third backend; pair
  with `packages/types/src/index.ts:1640` `CmsBackend` union)

Supporting references: `lib/command/parsers/msh.ts` (the parser-wrap
target + emote sigil), `api/mql.ts` + `api/mql/lexer.ts`/`parser.ts` (the
`( )` delegation target), `api/schedule.ts` (coroutine substrate),
`api/crafting.ts` + `lib/craft/Recipe.ts` (verb output reuse + the
Document-not-template precedent), `api/chronicle.ts` (`recordOnce`/
`recordDeed`), `api/shell.ts` (`expandVariables` namespace).
