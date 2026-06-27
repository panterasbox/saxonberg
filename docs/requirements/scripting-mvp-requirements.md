# Scripting language (v1 engine) — requirements

Build the **scripting language** — for real, end to end. A purpose-built,
**command-native** soft-scripting language (our grammar, our semantics)
with a genuine interpreter: tokenize → parse → walk the tree → dispatch
each command over the verb bus (gated, attributed, scope-checked). The
language *conducts* the command bus; it never bypasses it. The feature
vocabulary is deliberately small — mixing a cocktail is the demo — but
the **engine is fully realized**, including the block-as-value keystone,
lexical scope, the `( )` expression island, and **scheduler-driven
coroutine suspension** (`wait` / `every` / `when`).

The player runs **actual script text**, and a script comes to exist
**three ways — all producing the same first-class artifact**: typed
inline at the prompt, authored as content, or **captured by
demonstration** (make a cocktail by hand once and the system transcribes
what you did into a real, editable script). A recipe is a real,
parameterized script invocable like any verb. The command prompt itself
becomes the interpreter (bash-shaped: a bare command is the degenerate
one-statement script). The trap the engine avoids is treating
demonstration as a *separate macro format* — here the recorded thing
**is language source**, inspectable and editable like anything you'd
type.

Seeded by [scripting-slate](../slates/builds/scripting-slate.md) (the
load-bearing decisions, the command-native grammar, the blocks keystone,
the follow-on dependency order) with the integrating exemplar
[daves-bar-slate](../slates/builds/daves-bar-slate.md) (the
recipe-as-script use case + the shift-change ritual as the coroutine
proof). Builds on the shipped [crafting](../subsystems/crafting.md)
substrate (the verbs the drink script orchestrates resolve to graded,
stamped output via the existing quality model), the command pipeline
([command-parsing](../subsystems/command-parsing.md) /
[command-routing](../subsystems/command-routing.md) — the pluggable
`Parser` seam and the `{ bound: { command, model } }` dispatch path),
[mql](../subsystems/mql.md) (the `( )` condition sublanguage), and
[time](../subsystems/time.md) / `ScheduleApi` (the coroutine substrate).

## What the player gets (the end-to-end loop)

```
# A recipe is a real script in the language, authored as content:
def martini ($brand) {
  pour gin $brand into shaker
  add vermouth
  if (shaker warm) { add ice }      # blocks + conditions are real
  stir
  strain into glass
  garnish with olive
}

> make martini with Vionne          # invoke a named script like any verb

# The prompt IS the interpreter — type the language inline:
> pour gin into shaker; stir; strain into glass

# Coroutines: a script suspends and resumes on the game clock:
def last-call {
  announce "last call!"
  wait 5m                            # SUSPENDS; resumes 5 game-min later
  each (glass on bar) { collect it }
}

# Or never write it at all — make it by hand once, keep the script:
> pour gin Vionne into shaker        # \
> add vermouth                       #  } done manually, the normal way
> stir                               #  }
> strain into glass                  # /
> garnish with olive
#   -> transcribed into `def martini ($brand) { ... }`, yours to run + edit
> make martini with Crowsfoot        # replay it, swapping the gin
```

## Goals

The deliverable is **the engine**. Each layer below is real, not stubbed.

- **Tokenizer + grammar.** Extend `CommandLineApi` to tokenize the
  command-native grammar: `$name`, `( expr )`, `{ block }`, statement
  separators (`;` / newline), nesting, and multi-line input — over the
  existing command/word/arg tokens.
- **Parser.** A recursive-descent `Parser` impl producing the script AST
  (`script → statement* ; statement → command | controlform ; command →
  word arg* ; arg → literal | $name | (expr) | {block} | objectref`).
  Plugs into the existing pluggable-parser seam.
- **Interpreter / execution model.** A tree-walking interpreter that
  executes statements by dispatching each command over the bus through
  the pre-bound `{ command, model }` path (so every command is gated,
  attributed, and scope-re-checked), managing a **lexical scope/frame**
  per script invocation.
- **The value model + the block keystone.** First-class values
  (string, number, boolean, Stuff, and the **block** — a parsed body +
  captured lexical scope, inert until a command invokes it). The block
  is *the* keystone: flow control and `def` are ordinary commands that
  take blocks; a block yields its last command's value; invoking a block
  runs it in a child scope and **may suspend**.
- **Named values / substitution.** `set name (expr)` captures, `$name`
  reads; clean explicit interpolation (not Tcl re-scanning).
- **The `( )` expression island.** MQL predicates *and* infix
  comparison/logic inside `( )`; an MQL set's emptiness reads as
  truthiness for `if` / `while`; `( )` values bind into args. (Minimal
  but real — enough for the demo's conditions and `set x (npcs in room)`
  MQL capture. Capturing a *command's* outlet — `set x (look)` — defers
  with the value channel; see *Piping is deferred — seams stay open*.)
- **Control flow as commands.** `if`/`else`, `each`, `while`, `def` —
  block-taking verbs, not grammar. At minimum `if`, `each`, `def` ship
  (proving the keystone); `while` is cheap to include.
- **Coroutine suspension.** `wait <dur>`, `every <dur> { block }`, and
  `when (cond) { block }` suspend the script and resume on `ScheduleApi`
  (game-clock-driven). The interpreter holds continuation state across
  scheduler frames; a suspended script is a **detached background
  coroutine** (the actor's prompt is not blocked). Includes
  **cancellation / interruption** and an `AbortReason` vocabulary.
- **Both player surfaces.** (1) The **prompt** interprets the language —
  multi-statement script text typed inline runs through the interpreter.
  (2) **Named scripts** — `def` (and authored recipe-script content) bind
  a command invocable like any verb (`make martini`).
- **Demonstration capture (the gentlest authoring source).** Performing a
  manual build transcribes the dispatched commands into a **named,
  parameterized script in the language** — the brand-bearing input lifted
  to the one `$brand` parameter — which is then a first-class script:
  replayable (`make martini`), inspectable, and editable. The recorded
  artifact is **real source serialized via the tokenizer's `format()`
  round-trip**, not an opaque trace; the player authors a script by
  *doing*, never needing to know they're scripting (the slate's
  do → get-a-script → tweak-it → write-scripts on-ramp).
- **The knowing→doing knowledge ladder (recipes).** A three-state
  per-character gate wired to the chronicle ledger: *unknown* → *known-of*
  (a `claim`, minted on reading a recipe source) → *can-make* (a `deed`,
  minted on the first faithful manual build — the same act that
  transcribes and banks the personal recipe-script). `make <recipe>` is
  gated on *can-make*: you've both earned it and have the runnable script.
  The book isn't enough; the hands have to learn it.
- **Path-addressed script storage, editable in the CMS.** Saved scripts
  (recorded, written, or authored) persist in a dedicated **path-addressed
  store** (owner/scope encoded in the path), resolve + hot-reload **by
  path**, and are browsable/editable as a **third backend in the CMS
  unified tree** with an edit-goes-live re-resolve. Ownership, mutation,
  and authorship route through the existing zone/provenance/access stack;
  the store is the first tenant of the future runtime-writable authoring
  tree.
- **Actor binding.** A script runs *as* an actor; every dispatched
  command is attributed to that actor and bounded by *its* permissions.
  `self` / the acting identity resolves to the host.
- **Resource isolation.** Safe **by grammar** (the language reaches only
  the verb/affordance surface + the scripting builtins; the residual risk
  is resource exhaustion), bounded mechanically by the two-layer **resource
  governance** model — a universal preemption slice + a tiered total
  ceiling + coroutine guards. See the surface decision *Resource
  governance*.
- **The manual-build vocabulary the demo orchestrates.** Thin, honest
  crafting verbs — `pour <spirit> into <vessel>` / `add`, `stir` /
  `shake`, `strain into <glass>`, `garnish <glass> with <x>` — that move
  real matter (bottles drain; conservation holds) and whose terminal
  step produces a graded, maker's-marked drink by **reusing** crafting's
  `Grade` + `CraftedMixin.stamp` (one quality model, not a second). These
  verbs are **engaged activities** — each carries a game-time duration,
  claims an engagement slot, and completes via the scheduler — so mixing
  *takes time* and the actor is busy while doing it. This is the **first
  real consumer of the `Activity`/`EngagedMixin` substrate**
  ([activity](../subsystems/activity.md) — "built, never used; this is its
  first consumer").
- **Sequential-completion execution (await engaged commands).** A script
  statement **fully completes — including any engaged activity it starts —
  before the next runs.** When a dispatched verb engages a timed activity,
  the interpreter **suspends the script coroutine until it completes**,
  then resumes with the next statement. This is the *same* suspension
  substrate as `wait`/`every`/`when`, triggered by an activity-completion
  signal instead of a timer (so `wait` is the degenerate timer case of the
  general "suspend until a scheduler signal" rule). Instant commands return
  immediately and the script flows on. The payoff: a scripted build **paces
  itself to the activity durations** (output trickles step-by-step, no
  instant dump), and a **barge-in mid-step** aborts the activity, which
  propagates to the script's await as the `AbortReason` cancellation —
  the script stops mid-recipe, partial matter standing (no rollback).
- **Demo content proving the engine.** A parameterized martini (and at
  least one more cocktail) recipe-script; a minimal `wait`/`every`
  coroutine script (a closing-time / shift beat); inline prompt usage.
  Each authored in the language, over general substrate (no bar-specific
  engine classes).

## Non-goals

- **The piping value channel.** The PowerShell-style value-out-of-every-
  command stream (`chest contents | where weapon | give to gus`),
  inlet/outlet YAML markings, the streaming binder. Deferred whole; `|`
  is not wired this build (scripting-slate § *The piping model*). The v1
  engine keeps its seams open for it — see *Piping is deferred — but the
  seams stay open*.
- **The director / `improv` / force.** Runtime LLM authorship, forcing an
  actor, scene direction — [llm-content-slate](../slates/builds/llm-content-slate.md).
  A script runs as its *own* host actor only.
- **Durable suspension across restart.** Coroutines are **in-memory**;
  a suspended script dies on server restart (the transient-runtime
  track). Persisting continuations across restart is deferred.
- **Knowledge gating beyond recipes, and the wider bar progression.** The
  claim/deed knowledge ladder (in scope below) applies **to bar recipes**;
  it is not generalized to all scripts — an author's own inline `def` or
  authored-content script needs no claim/deed (you wrote it). The wider
  bar progression the ladder eventually feeds (recognition ladder,
  becoming staff, the inventory clipboard) stays a bar increment
  ([daves-bar-slate](../slates/builds/daves-bar-slate.md)).
- **The full builtin catalog & process-sim depth.** Only the verbs the
  demo needs; no shake-vs-stir dilution chemistry, per-instance ABV,
  defects, or skill/advancement control over the craft (fixed control —
  crafting.md *Deferred*).
- **Authoring intelligence over the language.** LSP, completions,
  save-gate diagnostics — [authoring-intelligence-slate](../slates/builds/authoring-intelligence-slate.md).
  (Basic parse-error reporting *is* in scope; a language *service* is
  not.)
- **The runtime-writable home sandbox (TS modules + home access
  scoping).** This build stands up the path-addressed script store **and**
  its CMS third backend, but **not** the virtual-FS TS-module loader
  (home-local `.ts` compilation / loading) nor the per-player home access
  model — CMS script-editing stays dev-tier, mirroring `WriteController`.
  Those ride the future scoped-authoring sandbox build
  ([scoped-authoring-slate](../slates/builds/scoped-authoring-slate.md),
  [cms](../subsystems/cms.md)). The store is *shaped* as that sandbox's
  first tenant (path-addressed, owner-by-path), not its full realization.
- **Advanced block surface.** The fully-first-class block tail (storing
  blocks in variables, passing them as handlers, arbitrary higher-order
  use) beyond what control flow + `def` + the demo exercise; `it`-implicit
  vs. rich block-param schemes beyond simple `def ($x)` named params.

## Surface decisions

### The language is command-native; the prompt is the interpreter

Everything is a command (Tcl/expect lineage). Flow control and functions
are **not** grammar — they're commands that take `{ }` blocks. The
grammar is the command grammar already parsed plus blocks, named values,
and statement separators. The smaller the grammar, the more the language
*is* the command bus (the prime criterion). The default shell parser is
**upgraded to (or superseded by) the language parser**, backward-
compatible: a bare single command is the degenerate one-statement script,
so existing prompt behavior is unchanged while multi-statement scripts,
blocks, and substitution become typeable inline.

### Blocks are parsed, scoped values — not re-scanned strings

The keystone, and the Tcl wart we explicitly avoid. A block is a
**closure**: a parsed body + a captured **lexical** scope, inert until a
command invokes it (in a child scope whose lexical parent is the closure
env). It is a **first-class value**, unifying control-flow bodies,
`def` functions ("commands and functions are the same"), and the bodies
of `each`/`while`/`when`. Invoking a block **may suspend** (it can contain
`wait`), so blocks ride the script's coroutine. A block **yields its last
command's value** (so `if` works in value position). Block subject is the
MQL pronoun `it`, bound by the enclosing command (each-item, when-match);
`def` takes simple named params (`def martini ($brand)`).

### Infix lives only inside `( )`; conditions are MQL

The other Tcl wart avoided. `( )` is the **expression / query island**:
where **MQL** lives (`(glass on bar)`, `(gus angry)`) *and* where infix
comparison/logic reads naturally (`(hp < 0.2)`). Commands stay pure
prefix; `( )` is the small expression island inside an arg. An MQL set's
**emptiness is falsiness** for `if`/`while`. The full operator set is
minimal this build (enough for the demo); the **seam** to MQL and infix
is real and complete.

### The interpreter dispatches over the bus, pre-bound, re-resolved

Each command the interpreter runs is handed to the dispatcher as
`{ bound: { command, model } }` — skipping tokenize/match/assemble (the
interpreter already parsed) but running **resolve + validate + execute**
every time. So a scripted command is **exactly** as gated, attributed,
and scope-checked as a typed one; the language is a sequencing +
control-flow layer *over* dispatch, never a side door around it. `$`
substitution and `( )` values bind into command fields; **resolve**
re-checks scope (a script can't reach an object the actor can't).

### Piping is deferred — but the seams stay open

PowerShell-style piping (the value channel out of every command, `|`
streaming, inlet/outlet YAML markings, the cardinality binder) is **not
built this build**, but the engine is shaped so it lights up later without
a rewrite. Three commitments keep it open:

1. **`|` stays reserved; a statement is a pipeline node.** The parser
   builds a `pipeline` AST node (one-or-more commands) per statement and
   reserves `|` for it — even though v1 *executes* only single-command
   pipelines (NYI on multi-stage, as the current tokenizer already does).
   Sequencing is `;` / newline **between** pipelines; piping composes
   **within** one (slate grammar: `pipeline := command ( "|" command )*`,
   `script := pipeline ( sep pipeline )*`). The AST is already pipe-shaped
   — piping lights up multi-stage execution + the value channel, not a
   re-parse.
2. **One uniform value model; value and effect channels stay distinct.**
   A single notion of "a value" (Stuff / list / scalar) flows through
   `set` / `$` / `( )` / block-yield; a command's value-channel **outlet**
   is designed as *just another source* of that same value, separate from
   the **effect** envelope (`DispatchResponseEnvelope`). v1's value
   producers are MQL expressions, infix, literals, and `$vars`; **the
   command value channel — a dispatched command emitting an outlet value —
   is deferred *whole* with piping**, and will feed both `|` stages and
   command-in-value-position (`set x (look)`). A block whose last
   statement is a plain command yields void in v1 and the outlet value
   once piping lands — additive, not a change.
3. **One binding seam, reused.** Pre-bound replay (v1) and pipe-stage
   binding (later) are the **same** mechanism: bind a value into a named
   field, skip parse, run resolve (scope re-checks). The v1 binder is
   built **generally** (bind-value-into-field, not replay-specific) so
   piping reuses it. Compatibility rides the command-spec `type:` system +
   the resolve step (never per-pair adapters); the inlet/outlet defaults
   (primary-object inlet, direct-object outlet) are mechanical and need no
   v1 work.

This factoring puts **all** value-channel work (outlets, `|`,
command-in-value-position) in the v1-deferred piping build, leaving v1's
`( )` island to MQL + infix + literals only — the cleanest seam.

### Coroutines suspend on the game clock; in-memory; cancellable

`wait`/`every`/`when` make a script a coroutine the scheduler drives
(`ScheduleApi`, riding game-time — the existing execution-context-wrapped
timer surface, never bare Node timers). Suspension state is **in-memory**
(transient runtime; a running script does not survive restart — durable
continuations deferred). A suspended script is **detached** (background
coroutine; the host's prompt stays live). **Interruption / cancellation**
is real — a script can be aborted (a player barges in, the host is
destroyed, a step declines) with a typed `AbortReason`; partial effects
already dispatched stand (no transactional rollback — honest to the
world's state). Concurrency with `EngagedMixin` slots
([activity](../subsystems/activity.md)) follows npc-behavior's grain;
deep slot-contention semantics are minimal this build.

### Safe by grammar, not by trust; distinct from `EvalScript`

The language's "sandbox" is the **grammar itself** — it reaches only the
verb/affordance surface + the scripting builtins, so even untrusted
authors can write it (the worst a script does is call gated verbs, each
permission-checked, in a loop). This is a **distinct interpreter**, not
the `EvalScript` V8/TS sandbox ([shell-author](../subsystems/shell-author.md));
they share the *philosophy* of isolation, not the runtime. Residual risk
is resource exhaustion (loops/coroutines), bounded by step/time/depth
limits in the interpreter, and auditability (a procedure vs. a single
call), bounded by attribution-per-dispatch.

### Named scripts: inline `def` (session) + authored recipe-script (content)

Two flavors of the same thing. `def name (params) { block }` at the
prompt binds a command for the **session** (in the actor's command set).
A **recipe-script** is the same construct **authored as content** — a
named script source loaded as an invocable command, the bar's recipes
being the first. Storage of authored recipe-scripts (a `Document` vs. a
path-resolved source file, re-resolved per invocation for HMR /
edit-to-live per npc-behavior's grain) is the planner's call; the
**requirement** is that a recipe is a *real script in the language*,
parameterized, invoked by name. The existing crafting `mix`/`serve`/
`order` (atomic, menu-contributed) stay **unchanged** as the venue
serving floor.

### Demonstration is a third authoring source — and it emits real source

A script comes to exist three ways: typed inline, authored as content, or
**captured by demonstration** — the bar's marquee on-ramp. Making a
cocktail by hand once **transcribes** the commands you dispatched into an
equivalent named script. The transcription is **not** a separate macro
representation: it serializes (via the tokenizer's `format()` round-trip)
into **real language source** — `def martini ($brand) { … }` — so what
you get is inspectable and editable like any script. The single
substitutable parameter (the brand) is lifted from the brand-bearing
input during transcription; everything else is concrete. The **capture
boundary** (what delimits "the martini" — the build's intermediate vessel
as a natural buffer, an explicit start/stop bracket, or a recent-history
window) is the planner's call; the requirement is that a completed manual
build yields a named, parameterized, first-class script, and that nothing
about replay bypasses the bus (a replayed `make` is ordinary gated
dispatch, re-resolved per run).

### The three-state knowledge ladder, wired to chronicle

Per character, for bar recipes: *unknown* → *known-of* → *can-make*.

- **Reading a recipe source** (a readable recipe card / book `Thing`, or
  the Menu) mints a chronicle `claim` ("knows of the martini") and adds
  the recipe to the *known-of* set — via `recordOnce` (category-first
  singularity) so re-reading doesn't spam the ledger. Known-of lets you
  *attempt* the manual build (you know the steps to follow).
- **The first faithful manual build** (accumulated inputs satisfy the
  recipe) mints a chronicle `deed` ("learned to make a martini"),
  **transcribes and banks the personal recipe-script** (the demonstration
  capture above), and adds the recipe to the *can-make* set. The deed and
  the script are minted by the **same act** — learning *is* getting the
  script.
- **`make <recipe>` is gated on *can-make*.** An off-spec build still
  yields *a* drink (honest matter), but mints no deed and banks no script
  — you made *something*, you didn't learn *the martini*.

The gate is on the **recipe-learning loop**, not on scripts in general.
The `RecipeCatalogue` itself stays openly resolvable (public knowledge;
the menu lists drinks); the per-character *known-of / can-make* sets are
the new personal layer.

### Resource governance: preemption slice + tiered ceiling

**Normal scripts are non-blocking by construction**, and this is the
load-bearing fact to hold onto: any script with `wait`s or engaged-activity
steps (every recipe) **suspends and fully yields the event loop** at each
step — a martini-in-progress is a detached background coroutine that is
*idle* almost the entire time, interleaving with every other player exactly
like the existing scheduler. The single-threaded "freeze" risk applies
**only** to a degenerate tight loop with *zero* suspension points
(`while (true) { set x (1+1) }`). The governance below exists to neutralize
that one pathological shape; it is invisible to legitimate scripts.

Two layers, plus coroutine guards:

1. **Preemption slice (universal, non-negotiable).** The interpreter
   **yields control every K steps and reschedules its continuation on the
   next tick** — so no script, dev or player, can monopolize the
   single-threaded event loop; a no-yield loop becomes cooperative. This
   falls out nearly free from the generator/explicit-stack interpreter
   already required for coroutines (the *same* yield mechanism, triggered by
   "ran K steps this tick" instead of `wait`). Protects latency; does not by
   itself stop "runs forever cooperatively" — that's layer 2.
2. **Total ceiling (tiered by authorship).** A lifetime budget — **steps +
   dispatch-count** (steps catch tight loops; dispatch-count catches
   `each (huge-set)` fan-out; a wall-CPU backstop catches expensive-but-few)
   + a **recursion-depth cap**. On exceed → graceful
   `AbortReason.resource-limit`, diegetic message, partial effects stand.
   **Tier by who *authored* the code, not who runs it** (the author writes
   the loop): player-authored (`/home/<player>/` scripts, or anything typed
   live at a player's prompt) → **tight** budget; released platform /
   dev-authored (`/obj/`, `/domain/`) → **large** budget. Authorship-tiering
   gets the cases right that runner-tiering botches — an NPC running a
   behavior script (platform content → large) and a player invoking the
   bar's recipe (platform-authored → large) are not punished, while only a
   player's own home script gets the tight leash. Even the large tier sits
   under the preemption slice *and* a high hard ceiling, so a dev's
   *accidental* infinite loop still dies — it just never freezes anyone.

**Coroutine guards** (suspension is in scope): a **cadence floor** (`every
1ms` clamped to a sane minimum) and a **concurrent-suspended-script cap per
actor** (no spawning thousands of background coroutines).

All numbers — slice K, the two ceilings, recursion depth, cadence floor,
concurrency cap — are **`AppSettings` keys** (operator-tunable, single
source, no code edits to retune; the app-settings-sweep precedent). Only the
*values* are knobs; the tier selection is mechanical (authorship / path).

### Where scripts live: a path-addressed store, editable in the CMS

Scripts are **authored source code** — not Stuff templates (so **not** the
`domain` collection: a template's job is to hydrate a Stuff, a script
hydrates nothing — the never-cloned-template wart, the `recipes`
precedent) and **not** git-deployed platform code (player- and
world-authored scripts are created at runtime; the repo `.ts` tree stays
platform engine code). They live in a **dedicated, path-addressed script
store** — a new collection (Document-backed, the `recipes` shape), keyed
on **path + owner**, with owner/scope encoded in the path:

```
/home/<player>/scripts/<name>     personal (recorded or written)
/domain/<world>/scripts/<name>    managed world content (narnia / …)
/obj/lounge/recipes/<name>        the bar's authored recipe-scripts
```

Resolution + HMR are **by path**, re-resolved per invocation (the
brain/recipe grain — edit-to-live). Path-addressing **reuses the whole
ownership stack**: `Zone.ownerGroup`/`accessGroups` gate mutation
(`AccessApi`), [provenance](../subsystems/provenance.md) keys authorship
on `path`, and the release gate already distinguishes `/home/`
(unreleased) from `/obj/`+`/domain/` (released) — no parallel permission
or authorship model. The store is the **first tenant of the eventual
runtime-writable authoring tree** that will also hold home-local `.ts`
modules + templates (which need a virtual-FS module loader — deferred);
scripts get there first because they need **no compilation** (the
interpreter reads source text directly).

This build also **stands the store up as a third backend in the CMS
unified tree** (alongside `TemplateApi` templates + `SourceTreeApi`
source — [cms](../subsystems/cms.md)): scripts are browsable and editable
in the CMS explorer / Monaco surface (as **plain text** — no language
service, per non-goals), with a script **go-live** that re-resolves /
invalidates the path cache so an edit reaches the next invocation (the
source → `HotReloadApi.reload` analog). CMS gating stays the existing
dev-tier mirror of `WriteController`; the **per-player home access model**
(a player editing only their own `/home/`) rides the future
scoped-authoring sandbox, not this build.

### New subsystem home; no new module category

The interpreter, AST, value-objects (Block, Scope/Frame, the value
model) live in a new `lib/script/` subsystem; the parser impl in the
existing `lib/command/parsers/` home; a gated `api/script.ts` +
`obj/api/ScriptLogic.ts` forwarding pair owns the run / define / cancel
surface (acting principal derived from `ExecutionContextApi`, never a
parameter). Control-flow / temporal builtins are command-shaped
(block-typed args). The manual-build crafting verbs extend the existing
`crafting` category. Recipe-scripts + the coroutine demo are authored
content. **Everything fits existing module categories** — if something
seems not to, stop and discuss before creating it.

## Constraints

- **Conducts the bus, never bypasses it.** Every command a script runs is
  a gated, attributed, scope-re-checked dispatch; the bound `model` is
  re-resolved each run. No raw mechanism access from script code.
  (scripting-slate decision #2; [call-security](../subsystems/call-security.md).)
- **Backward-compatible prompt.** Upgrading the default parser must leave
  every existing single-command input parsing and dispatching
  identically (a bare command = a one-statement script).
- **`ScheduleApi`, never bare timers.** Coroutine suspension rides
  `ScheduleApi` (execution-context-wrapped, game-clock, cancellable
  handles) — never `setTimeout`/`setInterval`
  ([CLAUDE.md](../../CLAUDE.md) antipattern table; [time](../subsystems/time.md)).
- **Resource bounds are mandatory and event-loop-protecting.** The
  **preemption slice is non-optional** — because Node is single-threaded, a
  no-yield loop would freeze *every* player, so the interpreter must yield
  every K steps (this is *why* it's built generator/explicit-stack, not
  recursive). The tiered total ceiling + recursion cap + coroutine guards
  bound runaway/abuse. All limits are `AppSettings`-keyed; tier by
  authorship. See the *Resource governance* surface decision.
- **One quality model.** The manual-build terminal step reuses `Grade` +
  `CraftedMixin.stamp`; no parallel grading/stamping path. Conservation
  holds across the manual sequence (every pour drains; the strain
  conserves; a failed/aborted run leaves matter where it physically is).
  ([crafting](../subsystems/crafting.md), [bulk](../subsystems/bulk.md).)
- **Gated principal from context.** `ScriptApi`/`ScriptLogic` derive the
  actor from `ExecutionContextApi`, never from a passed/wire argument
  (memory: gated-api-actor-from-context).
- **Domain privacy + inter-Stuff method contract.** TS modifiers in
  `lib/`/`obj/`/`cmd/` (the proxy-receiver rule); other Stuff touches
  interpreter/scope state through methods, not fields.
- **The grammar is the boundary.** Growing the language = adding
  builtins/verbs (authored, out-of-band), never handing script code raw
  execution. No `EvalScript`-style escape from within the language.
- **Chronicle singularity.** Claim and deed use `recordOnce` so
  re-reading / re-making don't spam the identity ledger
  ([chronicle](../subsystems/chronicle.md)).
- **Metacharacter reconciliation / layered tokenizer.** Every
  metacharacter the grammar needs is **already in use** in the current
  tokenizer or MQL; the scripting layer must not flat-re-tokenize over
  them — it wraps the existing lexing and **delegates bracketed regions
  to the sub-grammar that already owns them**. Specifically:
  - **`|` is piping, not sequencing.** `CommandLineLogic.lex` already
    splits on unquoted `|` into a `ParsedPipeline` (execution NYI —
    deferred value channel). Statement sequencing is **`;` / newline**,
    never `|`; `|` stays reserved for the deferred piping build.
  - **`;` / `:` keep their line-start emote sigil.** `;smile` / `:smile`
    at the **start** of input remains the emote prefix (`emotePrefixed`);
    `;` separates only **between** statements. A literal `;` inside a
    greedy free-text field (`say "a; b"`) must be quoted — top-level `;`
    is a separator (the bash rule; a small, deliberate change from
    today's literal-`;`-in-message behavior).
  - **`( )` delegates to MQL + infix.** MQL's lexer already owns
    `lparen`/`rparen` (`api/mql/lexer.ts`). The script `( )` expression
    island slices the **balanced** paren region and hands its contents to
    the MQL/expression parser (MQL predicates *and* infix comparison/
    logic) — it does not re-tokenize them at the script level.
  - **`{ }` disambiguates by attachment.** MQL's quantity grammar already
    owns `:{N unit}` (`coin:{5}`, `water:{2 cups}` — `lbrace`/`rbrace`).
    A `{` **glued after `:`** (attached to a token) is an MQL quantity
    body; a **standalone, whitespace-delimited** `{ … }` is a script
    block. The tokenizer distinguishes the two by attachment, never by
    guessing.
  - **`$` extends the shell variable namespace, it does not fork it.**
    `ShellApi.expandVariables` already resolves `$name` / `${name}`
    (`$focus`, env/settings vars) in YAML `default:`/`scope:`. Script
    `set x` / `$x` must surface script-frame (lexical) variables into
    **that same namespace** and reconcile the timing (script `$`
    substitution is per-frame/lexical, vs. the legacy bind-time pre-pass),
    not introduce a parallel `$` sigil.

  The only genuinely new lexical work is statement separators, standalone
  `{ }` blocks, and balanced-bracket slicing; the parser must be
  **recursive/delegating** (slate: "extend the `CommandLineApi` tokenizer
  + add a recursive-descent `Parser`", "`( )` is where MQL lives").
- **Scripts are path-addressed authored source — not templates, not git
  files.** The store keys on **path + owner**; ownership, mutation, and
  authorship route through the existing `Zone.ownerGroup` / `AccessApi` /
  [provenance](../subsystems/provenance.md) stack **by path** (no parallel
  permission or authorship model). A script **go-live** (CMS edit or
  re-record) re-resolves the path — the `HotReloadApi.reload` analog —
  never a Mongo tail or a restart. Not the `domain` collection (no Stuff
  to hydrate); not the git source tree (runtime-authored content).

## Acceptance criteria

- **Inline at the prompt:** a player can type multi-statement script text
  (`pour gin into shaker; stir; strain into glass`) and it runs through
  the interpreter as gated, attributed dispatches; a bare single command
  still behaves exactly as before.
- **Named, parameterized script:** `def martini ($brand) { … }` defines
  an invocable command; `make martini with Vionne` runs it, binding the
  parameter; the pour draws from the matching reachable bottle (resolve
  scope-checks); the produced drink is graded and maker's-marked via the
  existing crafting model; bottles drain (conservation).
- **Demonstration:** making a cocktail by hand (the manual-build verbs,
  one command at a time) transcribes into a named, parameterized script
  *in the language*; the emitted source round-trips (re-parses to an
  equivalent AST); `make <name>` replays it as ordinary gated dispatch;
  the brand is lifted to the `$param`; opening and editing the emitted
  script, then re-running, reflects the edit.
- **Knowledge ladder:** reading a recipe source mints a `claim` and marks
  the recipe *known-of* (a second read does not duplicate it); the first
  faithful manual build mints a `deed`, banks the personal script, and
  marks it *can-make*; `make <recipe>` declines for a recipe not yet
  *can-make*; an off-spec build yields a drink but mints no deed and banks
  no script.
- **Blocks + conditions:** an `if (cond) { … }` / `each (set) { … }`
  inside a script invokes its block conditionally / per-item; an MQL set's
  emptiness reads as false; a block yields its last value usable in
  `set x (...)`.
- **Lexical scope:** `set` in an outer frame is visible to a nested
  block; a `def` body sees its captured environment; param shadowing
  works.
- **Coroutines:** a `wait <dur>` script suspends and resumes on the game
  clock without blocking the host's prompt; an `every <dur> { … }` fires
  its block on cadence; a running script is **cancellable** with a typed
  `AbortReason`, and already-dispatched effects stand.
- **Paced execution:** running the martini script does not dump all
  output at once — each manual-build step's engaged activity completes (on
  the game clock) before the next dispatches, so the scene trickles out
  paced by the durations; the actor is engaged for the build's duration; a
  barge-in mid-step aborts the activity and the script stops mid-recipe
  with partial matter standing.
- **Resource governance:** a no-yield tight loop **does not freeze the
  server** — it is preempted (yields every K steps) and other actors'
  commands continue interleaving; a script exceeding its tiered total
  ceiling (steps / dispatch-count / recursion depth) is stopped with a
  diegetic limit message, not a hang; a player-authored script hits the
  tight budget while an `/obj/`-authored one gets the large budget; limits
  read from `AppSettings`.
- **Non-blocking:** running the martini script (or any with engaged
  steps/`wait`s) does not block other actors — it suspends and yields the
  event loop at each step.
- **Safety:** a scripted command targeting an unreachable / unpermitted
  object **declines at resolve** exactly as a typed command would; no
  script reaches anything its host actor cannot.
- **Tests** cover: tokenizer (blocks/`$`/`( )`/separators/nesting),
  parser AST, interpreter dispatch-over-bus, scope/closure capture, the
  block keystone, `( )` MQL + infix + emptiness-truthiness, `if`/`each`/
  `def`/`while`, coroutine suspend/resume/cancel on a mock clock, step/
  time limits, the parameter binding + resolve scope-recheck, and
  manual-build matter conservation.
- **Storage + authoring:** a saved script persists in the path-addressed
  store keyed on its path; resolving and invoking it works by path;
  editing it (in the CMS tree as a third backend, or by re-recording) and
  re-invoking reflects the change without a restart; mutation is gated
  through `AccessApi` on the covering zone and authorship recorded via
  `provenance` on the path. A script edited in the CMS goes live on save.
- **A subsystem doc** exists at `docs/subsystems/scripting.md` covering
  the grammar, the tokenizer/parser, the interpreter + execution model,
  the block keystone + scope, the `( )` island, the coroutine model +
  cancellation, the two player surfaces, resource isolation, and the
  relationship to `EvalScript` and the command pipeline.

## Cross-references

- **Seeding slates:**
  [scripting-slate](../slates/builds/scripting-slate.md) (the whole
  design — grammar, blocks keystone, the `( )` island, the follow-on
  dependency order, safe-by-grammar),
  [daves-bar-slate](../slates/builds/daves-bar-slate.md) (recipe-as-script
  + the shift-change ritual as the coroutine exemplar).
- **Substrate consumed:** [command-parsing](../subsystems/command-parsing.md)
  + [command-routing](../subsystems/command-routing.md) (the pluggable
  `Parser` seam, the `{ bound: { command, model } }` path, `format()`),
  [command-spec](../subsystems/command-spec.md) (verb YAML + field
  types), [mql](../subsystems/mql.md) (the `( )` condition sublanguage),
  [time](../subsystems/time.md) / `ScheduleApi` (coroutines),
  [crafting](../subsystems/crafting.md) (the demo's verbs + quality
  model), [bulk](../subsystems/bulk.md) (the manual matter moves),
  [chronicle](../subsystems/chronicle.md) (the claim/deed ledger +
  `recordOnce`),
  [call-security](../subsystems/call-security.md) (gated dispatch),
  [activity](../subsystems/activity.md) (engagement-slot concurrency),
  [shell-author](../subsystems/shell-author.md) (the contrasting
  `EvalScript` sandbox), [cms](../subsystems/cms.md) (the unified-tree +
  the script third backend + go-live), [provenance](../subsystems/provenance.md)
  (path-keyed authorship), [access](../subsystems/access.md) +
  [zone](../subsystems/zone.md) (path-prefix ownership / mutation gating).
- **Future builds grafting on:** the piping value channel; the director /
  `improv` seam ([llm-content-slate](../slates/builds/llm-content-slate.md));
  durable suspension; authoring intelligence over the language
  ([authoring-intelligence-slate](../slates/builds/authoring-intelligence-slate.md));
  npc-behavior's `scripted-behavior` brain (a script as code-tier brain
  config); the bar's shift-change ritual content; the runtime-writable
  home sandbox — home-local `.ts` modules + templates + per-player access
  scoping over the same path-addressed store
  ([scoped-authoring-slate](../slates/builds/scoped-authoring-slate.md)).
